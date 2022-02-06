// Copyright (C) 2021 John Nesky, distributed under the MIT license.

import { InstrumentType, /*EnvelopeType,*/ Config, getArpeggioPitchIndex } from "../synth/SynthConfig";
import { Instrument, Pattern, Note, Song, Synth } from "../synth/synth";
import { ColorConfig } from "./ColorConfig";
import { Preset, EditorConfig } from "./EditorConfig";
import { SongDocument } from "./SongDocument";
import { Prompt } from "./Prompt";
import { HTML } from "imperative-html/dist/esm/elements-strict";
import { ArrayBufferWriter } from "./ArrayBufferWriter";
import { MidiChunkType, MidiFileFormat, MidiControlEventMessage, MidiEventType, MidiMetaEventMessage, MidiRegisteredParameterNumberMSB, MidiRegisteredParameterNumberLSB, volumeMultToMidiVolume, volumeMultToMidiExpression, defaultMidiPitchBend, defaultMidiExpression } from "./Midi";

const { button, div, h2, input, select, option } = HTML;

function lerp(low: number, high: number, t: number): number {
    return low + t * (high - low);
}

function save(blob: Blob, name: string): void {
    if ((<any>navigator).msSaveOrOpenBlob) {
        (<any>navigator).msSaveOrOpenBlob(blob, name);
        return;
    }

    const anchor: HTMLAnchorElement = document.createElement("a");
    if (anchor.download != undefined) {
        const url: string = URL.createObjectURL(blob);
        setTimeout(function () { URL.revokeObjectURL(url); }, 60000);
        anchor.href = url;
        anchor.download = name;
        // Chrome bug regression: We need to delay dispatching the click
        // event. Seems to be related to going back in the browser history.
        // https://bugs.chromium.org/p/chromium/issues/detail?id=825100
        setTimeout(function () { anchor.dispatchEvent(new MouseEvent("click")); }, 0);
    } else {
        const url: string = URL.createObjectURL(blob);
        setTimeout(function () { URL.revokeObjectURL(url); }, 60000);
        if (!window.open(url, "_blank")) window.location.href = url;
    }
}

export class ExportPrompt implements Prompt {
    private synth: Synth;
    private thenExportTo: string;
    private recordedSamplesL: Float32Array;
    private recordedSamplesR: Float32Array;
    private sampleFrames: number;
    private totalChunks: number;
    private currentChunk: number;
    private outputStarted: boolean = false;
    private readonly _fileName: HTMLInputElement = input({ type: "text", style: "width: 10em;", value: "BeepBox-Song", maxlength: 250, "autofocus": "autofocus" });
    private readonly _computedSamplesLabel: HTMLDivElement = div({ style: "width: 10em;" }, new Text("0:00"));
    private readonly _enableIntro: HTMLInputElement = input({ type: "checkbox" });
    private readonly _loopDropDown: HTMLInputElement = input({ style: "width: 2em;", type: "number", min: "1", max: "4", step: "1" });
    private readonly _enableOutro: HTMLInputElement = input({ type: "checkbox" });
    private readonly _formatSelect: HTMLSelectElement = select({ style: "width: 100%;" },
        option({ value: "wav" }, "Export to .wav file."),
        option({ value: "mp3" }, "Export to .mp3 file."),
        option({ value: "midi" }, "Export to .mid file."),
        option({ value: "json" }, "Export to .json file."),
        option({ value: "html" }, "Export to .html file."),
    );
    private readonly _cancelButton: HTMLButtonElement = button({ class: "cancelButton" });
    private readonly _exportButton: HTMLButtonElement = button({ class: "exportButton", style: "width:45%;" }, "Export");
    private readonly _outputProgressBar: HTMLDivElement = div({ style: `width: 0%; background: ${ColorConfig.loopAccent}; height: 100%; position: absolute; z-index: 2;` });
    private readonly _outputProgressLabel: HTMLDivElement = div({ style: `position: relative; top: -1px; z-index: 3;` }, "0%");
    private readonly _outputProgressContainer: HTMLDivElement = div({ style: `height: 12px; background: ${ColorConfig.uiWidgetBackground}; display: block; position: relative; z-index: 1;` },
        this._outputProgressBar,
        this._outputProgressLabel,
    );
    private static readonly midiChipInstruments: number[] = [
        0x4A, // rounded -> recorder
        0x47, // triangle -> clarinet
        0x50, // square -> square wave
        0x46, // ¹/₄ pulse -> bassoon
        0x44, // ¹/₈ pulse -> oboe
        0x51, // sawtooth -> sawtooth wave
        0x51, // double saw -> sawtooth wave
        0x51, // double pulse -> sawtooth wave
        0x51, // spiky -> sawtooth wave
    ];

    public readonly container: HTMLDivElement = div({ class: "prompt noSelection", style: "width: 200px;" },
        h2("Export Options"),
        div({ style: "display: flex; flex-direction: row; align-items: center; justify-content: space-between;" },
            "File name:",
            this._fileName,
        ),
        div({ style: "display: flex; flex-direction: row; align-items: center; justify-content: space-between;" },
            "Length:",
            this._computedSamplesLabel,
        ),
        div({ style: "display: table; width: 100%;" },
            div({ style: "display: table-row;" },
                div({ style: "display: table-cell;" }, "Intro:"),
                div({ style: "display: table-cell;" }, "Loop Count:"),
                div({ style: "display: table-cell;" }, "Outro:"),
            ),
            div({ style: "display: table-row;" },
                div({ style: "display: table-cell; vertical-align: middle;" }, this._enableIntro),
                div({ style: "display: table-cell; vertical-align: middle;" }, this._loopDropDown),
                div({ style: "display: table-cell; vertical-align: middle;" }, this._enableOutro),
            ),
        ),
        div({ class: "selectContainer", style: "width: 100%;" }, this._formatSelect),
        div({ style: "text-align: left;" }, "Exporting can be slow. Reloading the page or clicking the X will cancel it. Please be patient."),
        this._outputProgressContainer,
        div({ style: "display: flex; flex-direction: row-reverse; justify-content: space-between;" },
            this._exportButton,
        ),
        this._cancelButton,
    );

    constructor(private _doc: SongDocument) {
        this._loopDropDown.value = "1";

        if (this._doc.song.loopStart == 0) {
            this._enableIntro.checked = false;
            this._enableIntro.disabled = true;
        } else {
            this._enableIntro.checked = true;
            this._enableIntro.disabled = false;
        }
        if (this._doc.song.loopStart + this._doc.song.loopLength == this._doc.song.barCount) {
            this._enableOutro.checked = false;
            this._enableOutro.disabled = true;
        } else {
            this._enableOutro.checked = true;
            this._enableOutro.disabled = false;
        }

        const lastExportFormat: string | null = window.localStorage.getItem("exportFormat");
        if (lastExportFormat != null) {
            this._formatSelect.value = lastExportFormat;
        }

        this._fileName.select();
        setTimeout(() => this._fileName.focus());

        this._fileName.addEventListener("input", ExportPrompt._validateFileName);
        this._loopDropDown.addEventListener("blur", ExportPrompt._validateNumber);
        this._exportButton.addEventListener("click", this._export);
        this._cancelButton.addEventListener("click", this._close);
        this._enableOutro.addEventListener("click", () => { (this._computedSamplesLabel.firstChild as Text).textContent = this.samplesToTime(this._doc.synth.getTotalSamples(this._enableIntro.checked, this._enableOutro.checked, +this._loopDropDown.value - 1)); });
        this._enableIntro.addEventListener("click", () => { (this._computedSamplesLabel.firstChild as Text).textContent = this.samplesToTime(this._doc.synth.getTotalSamples(this._enableIntro.checked, this._enableOutro.checked, +this._loopDropDown.value - 1)); });
        this._loopDropDown.addEventListener("change", () => { (this._computedSamplesLabel.firstChild as Text).textContent = this.samplesToTime(this._doc.synth.getTotalSamples(this._enableIntro.checked, this._enableOutro.checked, +this._loopDropDown.value - 1)); });
        this.container.addEventListener("keydown", this._whenKeyPressed);

        this._fileName.value = _doc.song.title;
        ExportPrompt._validateFileName(null, this._fileName);

        (this._computedSamplesLabel.firstChild as Text).textContent = this.samplesToTime(this._doc.synth.getTotalSamples(this._enableIntro.checked, this._enableOutro.checked, +this._loopDropDown.value - 1));
    }

    // Could probably be moved to doc or synth. Fine here for now until needed by something else.
    private samplesToTime(samples: number): string {
        const rawSeconds: number = Math.round(samples / this._doc.synth.samplesPerSecond);
        const seconds: number = rawSeconds % 60;
        const minutes: number = Math.floor(rawSeconds / 60);
        return minutes + ":" + (seconds < 10 ? "0" : "") + seconds;
    }

    private _close = (): void => {
        if (this.synth != null)
            this.synth.renderingSong = false;
        this.outputStarted = false;
        this._doc.undo();
    }

    public changeFileName(newValue: string) {
        this._fileName.value = newValue;
    }

    public cleanUp = (): void => {
        this._fileName.removeEventListener("input", ExportPrompt._validateFileName);
        this._loopDropDown.removeEventListener("blur", ExportPrompt._validateNumber);
        this._exportButton.removeEventListener("click", this._export);
        this._cancelButton.removeEventListener("click", this._close);
        this.container.removeEventListener("keydown", this._whenKeyPressed);
    }

    private _whenKeyPressed = (event: KeyboardEvent): void => {
        if ((<Element>event.target).tagName != "BUTTON" && event.keyCode == 13) { // Enter key
            this._export();
        }
    }

    private static _validateFileName(event: Event | null, use?: HTMLInputElement): void {

        let input: HTMLInputElement;
        if (event != null) {
            input = <HTMLInputElement>event.target;
        } else if (use != undefined) {
            input = use;
        }
        else {
            return;
        }
        const deleteChars = /[\+\*\$\?\|\{\}\\\/<>#%!`&'"=:@]/gi;
        if (deleteChars.test(input.value)) {
            let cursorPos: number = <number>input.selectionStart;
            input.value = input.value.replace(deleteChars, "");
            cursorPos--;
            input.setSelectionRange(cursorPos, cursorPos);
        }
    }

    private static _validateNumber(event: Event): void {
        const input: HTMLInputElement = <HTMLInputElement>event.target;
        input.value = Math.floor(Math.max(Number(input.min), Math.min(Number(input.max), Number(input.value)))) + "";
    }

    private _export = (): void => {
        if (this.outputStarted == true)
            return;
        window.localStorage.setItem("exportFormat", this._formatSelect.value);
        switch (this._formatSelect.value) {
            case "wav":
                this.outputStarted = true;
                this._exportTo("wav");
                break;
            case "mp3":
                this.outputStarted = true;
                this._exportTo("mp3");
                break;
            case "midi":
                this.outputStarted = true;
                this._exportToMidi();
                break;
            case "json":
                this.outputStarted = true;
                this._exportToJson();
                break;
            case "html":
                this._exportToHtml();
                break;
            default:
                throw new Error("Unhandled file export type.");
        }
    }

    private _synthesize(): void {
        //const timer: number = performance.now();

        // If output was stopped e.g. user clicked the close button, abort.
        if (this.outputStarted == false) {
            return;
        }

        // Update progress bar UI once per 5 sec of exported data
        const samplesPerChunk: number = this.synth.samplesPerSecond * 5; //e.g. 44100 * 5
        const currentFrame: number = this.currentChunk * samplesPerChunk;

        const samplesInChunk: number = Math.min(samplesPerChunk, this.sampleFrames - currentFrame);
        const tempSamplesL = new Float32Array(samplesInChunk);
        const tempSamplesR = new Float32Array(samplesInChunk);

        this.synth.renderingSong = true;
        this.synth.synthesize(tempSamplesL, tempSamplesR, samplesInChunk);

        // Concatenate chunk data into final array
        this.recordedSamplesL.set(tempSamplesL, currentFrame);
        this.recordedSamplesR.set(tempSamplesR, currentFrame);

        // Update UI
        this._outputProgressBar.style.setProperty("width", Math.round((this.currentChunk + 1) / this.totalChunks * 100.0) + "%");
        this._outputProgressLabel.innerText = Math.round((this.currentChunk + 1) / this.totalChunks * 100.0) + "%";

        // Next call, synthesize the next chunk.
        this.currentChunk++;

        if (this.currentChunk >= this.totalChunks) {
            // Done, call final function
            this.synth.renderingSong = false;
            this._outputProgressLabel.innerText = "Encoding...";
            if (this.thenExportTo == "wav") {
                this._exportToWavFinish();
            }
            else if (this.thenExportTo == "mp3") {
                this._exportToMp3Finish();
            }
            else {
                throw new Error("Unrecognized file export type chosen!");
            }
        }
        else {
            // Continue batch export
            setTimeout(() => { this._synthesize(); });
        }

        //console.log("export timer", (performance.now() - timer) / 1000.0);
    }

    private _exportTo(type: string): void {
        // Batch the export operation
        this.thenExportTo = type;
        this.currentChunk = 0;
        this.synth = new Synth(this._doc.song);
        if (type == "wav") {
            this.synth.samplesPerSecond = 48000; // Use professional video editing standard sample rate for .wav file export.
        }
        else if (type == "mp3") {
            this.synth.samplesPerSecond = 44100; // Use consumer CD standard sample rate for .mp3 export.
        }
        else {
            throw new Error("Unrecognized file export type chosen!");
        }

        this._outputProgressBar.style.setProperty("width", "0%");
        this._outputProgressLabel.innerText = "0%";

        this.synth.loopRepeatCount = Number(this._loopDropDown.value) - 1;
        if (!this._enableIntro.checked) {
            for (let introIter: number = 0; introIter < this._doc.song.loopStart; introIter++) {
                this.synth.goToNextBar();
            }
        }

        this.synth.warmUpSynthesizer(this._doc.song);
        this.synth.computeLatestModValues();

        this.sampleFrames = this.synth.getTotalSamples(this._enableIntro.checked, this._enableOutro.checked, this.synth.loopRepeatCount);
        // Compute how many UI updates will need to run to determine how many 
        this.totalChunks = Math.ceil(this.sampleFrames / (this.synth.samplesPerSecond * 5));
        this.recordedSamplesL = new Float32Array(this.sampleFrames);
        this.recordedSamplesR = new Float32Array(this.sampleFrames);

        // Batch the actual export
        setTimeout(() => { this._synthesize(); });
    }

    private _exportToWavFinish(): void {
        const sampleFrames: number = this.recordedSamplesL.length;
        const sampleRate: number = this.synth.samplesPerSecond;

        const wavChannelCount: number = 2;
        const bytesPerSample: number = 2;
        const bitsPerSample: number = 8 * bytesPerSample;
        const sampleCount: number = wavChannelCount * sampleFrames;

        const totalFileSize: number = 44 + sampleCount * bytesPerSample;

        let index: number = 0;
        const arrayBuffer: ArrayBuffer = new ArrayBuffer(totalFileSize);
        const data: DataView = new DataView(arrayBuffer);
        data.setUint32(index, 0x52494646, false); index += 4;
        data.setUint32(index, 36 + sampleCount * bytesPerSample, true); index += 4; // size of remaining file
        data.setUint32(index, 0x57415645, false); index += 4;
        data.setUint32(index, 0x666D7420, false); index += 4;
        data.setUint32(index, 0x00000010, true); index += 4; // size of following header
        data.setUint16(index, 0x0001, true); index += 2; // not compressed
        data.setUint16(index, wavChannelCount, true); index += 2; // channel count
        data.setUint32(index, sampleRate, true); index += 4; // sample rate
        data.setUint32(index, sampleRate * bytesPerSample * wavChannelCount, true); index += 4; // bytes per second
        data.setUint16(index, bytesPerSample * wavChannelCount, true); index += 2; // block align
        data.setUint16(index, bitsPerSample, true); index += 2; // bits per sample
        data.setUint32(index, 0x64617461, false); index += 4;
        data.setUint32(index, sampleCount * bytesPerSample, true); index += 4;

        if (bytesPerSample > 1) {
            // usually samples are signed. 
            const range: number = (1 << (bitsPerSample - 1)) - 1;
            for (let i: number = 0; i < sampleFrames; i++) {
                let valL: number = Math.floor(Math.max(-1, Math.min(1, this.recordedSamplesL[i])) * range);
                let valR: number = Math.floor(Math.max(-1, Math.min(1, this.recordedSamplesR[i])) * range);
                if (bytesPerSample == 2) {
                    data.setInt16(index, valL, true); index += 2;
                    data.setInt16(index, valR, true); index += 2;
                } else if (bytesPerSample == 4) {
                    data.setInt32(index, valL, true); index += 4;
                    data.setInt32(index, valR, true); index += 4;
                } else {
                    throw new Error("unsupported sample size");
                }
            }
        } else {
            // 8 bit samples are a special case: they are unsigned.
            for (let i: number = 0; i < sampleFrames; i++) {
                let valL: number = Math.floor(Math.max(-1, Math.min(1, this.recordedSamplesL[i])) * 127 + 128);
                let valR: number = Math.floor(Math.max(-1, Math.min(1, this.recordedSamplesR[i])) * 127 + 128);
                data.setUint8(index, valL > 255 ? 255 : (valL < 0 ? 0 : valL)); index++;
                data.setUint8(index, valR > 255 ? 255 : (valR < 0 ? 0 : valR)); index++;
            }
        }

        const blob: Blob = new Blob([arrayBuffer], { type: "audio/wav" });
        save(blob, this._fileName.value.trim() + ".wav");

        this._close();
    }

    private _exportToMp3Finish(): void {
        const whenEncoderIsAvailable = (): void => {

            const lamejs: any = (<any>window)["lamejs"];
            const channelCount: number = 2;
            const kbps: number = 192;
            const sampleBlockSize: number = 1152;
            const mp3encoder: any = new lamejs.Mp3Encoder(channelCount, this.synth.samplesPerSecond, kbps);
            const mp3Data: any[] = [];

            const left: Int16Array = new Int16Array(this.recordedSamplesL.length);
            const right: Int16Array = new Int16Array(this.recordedSamplesR.length);
            const range: number = (1 << 15) - 1;
            for (let i: number = 0; i < this.recordedSamplesL.length; i++) {
                left[i] = Math.floor(Math.max(-1, Math.min(1, this.recordedSamplesL[i])) * range);
                right[i] = Math.floor(Math.max(-1, Math.min(1, this.recordedSamplesR[i])) * range);
            }

            for (let i: number = 0; i < left.length; i += sampleBlockSize) {
                const leftChunk: Int16Array = left.subarray(i, i + sampleBlockSize);
                const rightChunk: Int16Array = right.subarray(i, i + sampleBlockSize);
                const mp3buf: any = mp3encoder.encodeBuffer(leftChunk, rightChunk);
                if (mp3buf.length > 0) mp3Data.push(mp3buf);
            }

            const mp3buf: any = mp3encoder.flush();
            if (mp3buf.length > 0) mp3Data.push(mp3buf);

            const blob: Blob = new Blob(mp3Data, { type: "audio/mp3" });
            save(blob, this._fileName.value.trim() + ".mp3");
            this._close();
        }

        if ("lamejs" in window) {
            whenEncoderIsAvailable();
        } else {
            var script = document.createElement("script");
            script.src = "https://cdn.jsdelivr.net/npm/lamejs@1.2.0/lame.min.js";
            script.onload = whenEncoderIsAvailable;
            document.head.appendChild(script);
        }
    }

    private _exportToMidi(): void {
        const song: Song = this._doc.song;
        const midiTicksPerBeepBoxTick: number = 2;
        const midiTicksPerBeat: number = midiTicksPerBeepBoxTick * Config.ticksPerPart * Config.partsPerBeat;
        const midiTicksPerPart: number = midiTicksPerBeepBoxTick * Config.ticksPerPart;
        const secondsPerMinute: number = 60;
        const microsecondsPerMinute: number = secondsPerMinute * 1000000;
        const beatsPerMinute: number = song.getBeatsPerMinute();
        const microsecondsPerBeat: number = Math.round(microsecondsPerMinute / beatsPerMinute);
        //const secondsPerMidiTick: number = secondsPerMinute / (midiTicksPerBeat * beatsPerMinute);
        const midiTicksPerBar: number = midiTicksPerBeat * song.beatsPerBar;
        const pitchBendRange: number = 24;
        const defaultNoteVelocity: number = 90;

        const unrolledBars: number[] = [];
        if (this._enableIntro.checked) {
            for (let bar: number = 0; bar < song.loopStart; bar++) {
                unrolledBars.push(bar);
            }
        }
        for (let loopIndex: number = 0; loopIndex < Number(this._loopDropDown.value); loopIndex++) {
            for (let bar: number = song.loopStart; bar < song.loopStart + song.loopLength; bar++) {
                unrolledBars.push(bar);
            }
        }
        if (this._enableOutro.checked) {
            for (let bar: number = song.loopStart + song.loopLength; bar < song.barCount; bar++) {
                unrolledBars.push(bar);
            }
        }

        const tracks = [{ isMeta: true, channel: -1, midiChannel: -1, isNoise: false, isDrumset: false }];
        let midiChannelCounter: number = 0;
        let foundADrumset: boolean = false;
        for (let channel: number = 0; channel < this._doc.song.pitchChannelCount + this._doc.song.noiseChannelCount; channel++) {
            if (!foundADrumset && this._doc.song.channels[channel].instruments[0].type == InstrumentType.drumset) {
                tracks.push({ isMeta: false, channel: channel, midiChannel: 9, isNoise: true, isDrumset: true });
                foundADrumset = true; // There can only be one drumset channel, and it's always channel 9 (seen as 10 in most UIs). :/
            } else {
                if (midiChannelCounter >= 16) continue; // The MIDI standard only supports 16 channels.
                tracks.push({ isMeta: false, channel: channel, midiChannel: midiChannelCounter++, isNoise: this._doc.song.getChannelIsNoise(channel), isDrumset: false });
                if (midiChannelCounter == 9) midiChannelCounter++; // skip midi drum channel.
            }
        }

        const writer: ArrayBufferWriter = new ArrayBufferWriter(1024);
        writer.writeUint32(MidiChunkType.header);
        writer.writeUint32(6); // length of headers is 6 bytes
        writer.writeUint16(MidiFileFormat.simultaneousTracks);
        writer.writeUint16(tracks.length);
        writer.writeUint16(midiTicksPerBeat); // number of "ticks" per beat, independent of tempo

        for (const track of tracks) {
            writer.writeUint32(MidiChunkType.track);

            const { isMeta, channel, midiChannel, isNoise, isDrumset } = track;

            // We're gonna come back here and overwrite this placeholder once we know how many bytes this track is.
            const trackStartIndex: number = writer.getWriteIndex();
            writer.writeUint32(0); // placeholder for track size

            let prevTime: number = 0;
            let barStartTime: number = 0;
            const writeEventTime = function (time: number): void {
                if (time < prevTime) throw new Error("Midi event time cannot go backwards.");
                writer.writeMidiVariableLength(time - prevTime);
                prevTime = time;
            }

            const writeControlEvent = function (message: MidiControlEventMessage, value: number): void {
                if (!(value >= 0 && value <= 0x7F)) throw new Error("Midi control event value out of range: " + value);
                writer.writeUint8(MidiEventType.controlChange | midiChannel);
                writer.writeMidi7Bits(message);
                writer.writeMidi7Bits(value | 0);
            }

            if (isMeta) {
                // for first midi track, include tempo, time signature, and key signature information.

                writeEventTime(0);
                writer.writeUint8(MidiEventType.meta);
                writer.writeMidi7Bits(MidiMetaEventMessage.text);
                writer.writeMidiAscii("Composed with jummbus.bitbucket.io");

                writeEventTime(0);
                writer.writeUint8(MidiEventType.meta);
                writer.writeMidi7Bits(MidiMetaEventMessage.tempo);
                writer.writeMidiVariableLength(3); // Tempo message length is 3 bytes.
                writer.writeUint24(microsecondsPerBeat); // Tempo in microseconds per "quarter" note, commonly known as a "beat"

                writeEventTime(0);
                writer.writeUint8(MidiEventType.meta);
                writer.writeMidi7Bits(MidiMetaEventMessage.timeSignature);
                writer.writeMidiVariableLength(4); // Time signature message length is 4 bytes.
                writer.writeUint8(song.beatsPerBar); // numerator.
                writer.writeUint8(2); // denominator exponent in 2^E. 2^2 = 4, and we will always use "quarter" notes.
                writer.writeUint8(24); // MIDI Clocks per metronome tick (should match beats), standard is 24
                writer.writeUint8(8); // number of 1/32 notes per 24 MIDI Clocks, standard is 8, meaning 24 clocks per "quarter" note.

                const isMinor: boolean = Config.scales[song.scale].flags[3] && !Config.scales[song.scale].flags[4];
                const key: number = song.key; // C=0, C#=1, counting up to B=11
                let numSharps: number = key; // For even key values in major scale, number of sharps/flats is same...
                if ((key & 1) == 1) numSharps += 6; // For odd key values (consider circle of fifths) rotate around the circle... kinda... Look conventional key signatures are just weird, okay?
                if (isMinor) numSharps += 9; // A minor A scale has zero sharps, shift it appropriately
                while (numSharps > 6) numSharps -= 12; // Range is (modulo 12) - 5. Midi supports -7 to +7, but I only have 12 options.

                writeEventTime(0);
                writer.writeUint8(MidiEventType.meta);
                writer.writeMidi7Bits(MidiMetaEventMessage.keySignature);
                writer.writeMidiVariableLength(2); // Key signature message length is 2 bytes.
                writer.writeInt8(numSharps); // See above calculation. Assumes scale is diatonic. :/
                writer.writeUint8(isMinor ? 1 : 0); // 0: major, 1: minor

                if (this._enableIntro.checked) barStartTime += midiTicksPerBar * song.loopStart;
                writeEventTime(barStartTime);
                writer.writeUint8(MidiEventType.meta);
                writer.writeMidi7Bits(MidiMetaEventMessage.marker);
                writer.writeMidiAscii("Loop Start");

                for (let loopIndex: number = 0; loopIndex < parseInt(this._loopDropDown.value); loopIndex++) {
                    barStartTime += midiTicksPerBar * song.loopLength;
                    writeEventTime(barStartTime);
                    writer.writeUint8(MidiEventType.meta);
                    writer.writeMidi7Bits(MidiMetaEventMessage.marker);
                    writer.writeMidiAscii(loopIndex < Number(this._loopDropDown.value) - 1 ? "Loop Repeat" : "Loop End");
                }

                if (this._enableOutro.checked) barStartTime += midiTicksPerBar * (song.barCount - song.loopStart - song.loopLength);
                if (barStartTime != midiTicksPerBar * unrolledBars.length) throw new Error("Miscalculated number of bars.");

            } else {
                // For remaining tracks, set up the instruments and write the notes:

                let channelName: string = isNoise
                    ? "noise channel " + channel
                    : "pitch channel " + channel;
                writeEventTime(0);
                writer.writeUint8(MidiEventType.meta);
                writer.writeMidi7Bits(MidiMetaEventMessage.trackName);
                writer.writeMidiAscii(channelName);

                // This sets up pitch bend range. First we choose the pitch bend RPN (which has MSB and LSB components), then we set the value for that RPN (which also has MSB and LSB components) and finally reset the current RPN to null, which is considered best practice.
                writeEventTime(0); writeControlEvent(MidiControlEventMessage.registeredParameterNumberMSB, MidiRegisteredParameterNumberMSB.pitchBendRange);
                writeEventTime(0); writeControlEvent(MidiControlEventMessage.registeredParameterNumberLSB, MidiRegisteredParameterNumberLSB.pitchBendRange);
                writeEventTime(0); writeControlEvent(MidiControlEventMessage.setParameterMSB, pitchBendRange); // pitch bend semitone range
                writeEventTime(0); writeControlEvent(MidiControlEventMessage.setParameterLSB, 0); // pitch bend cent range
                writeEventTime(0); writeControlEvent(MidiControlEventMessage.registeredParameterNumberMSB, MidiRegisteredParameterNumberMSB.reset);
                writeEventTime(0); writeControlEvent(MidiControlEventMessage.registeredParameterNumberLSB, MidiRegisteredParameterNumberLSB.reset);

                let prevInstrumentIndex: number = -1;
                function writeInstrumentSettings(instrumentIndex: number): void {
                    const instrument: Instrument = song.channels[channel].instruments[instrumentIndex];
                    const preset: Preset | null = EditorConfig.valueToPreset(instrument.preset);

                    if (prevInstrumentIndex != instrumentIndex) {
                        prevInstrumentIndex = instrumentIndex;
                        writeEventTime(barStartTime);
                        writer.writeUint8(MidiEventType.meta);
                        writer.writeMidi7Bits(MidiMetaEventMessage.instrumentName);
                        writer.writeMidiAscii("Instrument " + (instrumentIndex + 1));

                        if (!isDrumset) {
                            let instrumentProgram: number = 81; // default to sawtooth wave. 

                            if (preset != null && preset.midiProgram != undefined) {
                                instrumentProgram = preset.midiProgram;
                            } else if (instrument.type == InstrumentType.drumset) {
                                // The first BeepBox drumset channel is handled as a Midi drumset channel and doesn't need a program, but any subsequent drumsets will just be set to taiko.
                                instrumentProgram = 116; // taiko
                            } else {
                                if (instrument.type == InstrumentType.noise || instrument.type == InstrumentType.spectrum) {
                                    if (isNoise) {
                                        instrumentProgram = 116; // taiko
                                    } else {
                                        instrumentProgram = 75; // pan flute
                                    }
                                } else if (instrument.type == InstrumentType.chip) {
                                    if (ExportPrompt.midiChipInstruments.length > instrument.chipWave) {
                                        instrumentProgram = ExportPrompt.midiChipInstruments[instrument.chipWave];
                                    }
                                } else if (instrument.type == InstrumentType.pwm || instrument.type == InstrumentType.fm || instrument.type == InstrumentType.harmonics) {
                                    instrumentProgram = 81; // sawtooth
                                } else if (instrument.type == InstrumentType.pickedString) {
                                    instrumentProgram = 0x19; // steel guitar
                                } else if (instrument.type == InstrumentType.customChipWave) {
                                    instrumentProgram = 81; // sawtooth
                                } else {
                                    throw new Error("Unrecognized instrument type.");
                                }
                            }

                            // Program (instrument) change event:
                            writeEventTime(barStartTime);
                            writer.writeUint8(MidiEventType.programChange | midiChannel);
                            writer.writeMidi7Bits(instrumentProgram);
                        }

                        // Instrument volume:
                        writeEventTime(barStartTime);
                        let instrumentVolume: number = volumeMultToMidiVolume(Synth.instrumentVolumeToVolumeMult(instrument.volume));
                        writeControlEvent(MidiControlEventMessage.volumeMSB, Math.min(0x7f, Math.round(instrumentVolume)));

                        // Instrument pan:
                        writeEventTime(barStartTime);
                        let instrumentPan: number = (instrument.pan / Config.panCenter - 1) * 0x3f + 0x40;
                        writeControlEvent(MidiControlEventMessage.panMSB, Math.min(0x7f, Math.round(instrumentPan)));
                    }
                }
                if (song.getPattern(channel, 0) == null) {
                    // Go ahead and apply the instrument settings at the beginning of the channel
                    // even if a bar doesn't kick in until later.
                    writeInstrumentSettings(0);
                }

                let prevPitchBend: number = defaultMidiPitchBend;
                let prevExpression: number = defaultMidiExpression;
                let shouldResetExpressionAndPitchBend: boolean = false;
                //let prevTremolo: number = -1;
                const channelRoot: number = isNoise ? Config.spectrumBasePitch : Config.keys[song.key].basePitch;
                const intervalScale: number = isNoise ? Config.noiseInterval : 1;

                for (const bar of unrolledBars) {
                    const pattern: Pattern | null = song.getPattern(channel, bar);

                    if (pattern != null) {

                        const instrumentIndex: number = pattern.instruments[0]; // Don't bother trying to export multiple instruments per pattern to midi, just pick the first one.
                        const instrument: Instrument = song.channels[channel].instruments[instrumentIndex];
                        const preset: Preset | null = EditorConfig.valueToPreset(instrument.preset);
                        writeInstrumentSettings(instrumentIndex);

                        let usesArpeggio: boolean = instrument.getChord().arpeggiates;
                        let polyphony: number = usesArpeggio ? 1 : Config.maxChordSize;
                        if (instrument.getChord().customInterval) {
                            if (instrument.type == InstrumentType.chip || instrument.type == InstrumentType.harmonics) {
                                polyphony = 2;
                                usesArpeggio = true;
                            } else if (instrument.type == InstrumentType.fm) {
                                polyphony = Config.operatorCount;
                            } else {
                                console.error("Unrecognized instrument type for harmonizing arpeggio: " + instrument.type);
                            }
                        }

                        for (let noteIndex: number = 0; noteIndex < pattern.notes.length; noteIndex++) {
                            const note: Note = pattern.notes[noteIndex];

                            const noteStartTime: number = barStartTime + note.start * midiTicksPerPart;
                            let pinTime: number = noteStartTime;
                            let pinSize: number = note.pins[0].size;
                            let pinInterval: number = note.pins[0].interval;
                            const prevPitches: number[] = [-1, -1, -1, -1];
                            const nextPitches: number[] = [-1, -1, -1, -1];
                            const toneCount: number = Math.min(polyphony, note.pitches.length);
                            const velocity: number = isDrumset ? Math.max(1, Math.round(defaultNoteVelocity * note.pins[0].size / Config.noteSizeMax)) : defaultNoteVelocity;

                            // The maximum midi pitch bend range is +/- 24 semitones from the base pitch. 
                            // To make the most of this, choose a base pitch that is within 24 semitones from as much of the note as possible.
                            // This may involve offsetting this base pitch from BeepBox's note pitch.
                            let mainInterval: number = note.pickMainInterval();
                            let pitchOffset: number = mainInterval * intervalScale;
                            if (!isDrumset) {
                                let maxPitchOffset: number = pitchBendRange;
                                let minPitchOffset: number = -pitchBendRange;
                                for (let pinIndex: number = 1; pinIndex < note.pins.length; pinIndex++) {
                                    const interval = note.pins[pinIndex].interval * intervalScale;
                                    maxPitchOffset = Math.min(maxPitchOffset, interval + pitchBendRange);
                                    minPitchOffset = Math.max(minPitchOffset, interval - pitchBendRange);
                                }
                                /*
                                // I'd like to be able to use pitch bend to implement arpeggio, but the "custom inverval" setting in chip instruments combines arpeggio in one tone with another flat tone, and midi can't selectively apply arpeggio to one out of two simultaneous tones. Also it would be hard to reimport. :/
                                if (usesArpeggio && note.pitches.length > polyphony) {
                                    let lowestArpeggioOffset: number = 0;
                                    let highestArpeggioOffset: number = 0;
                                    const basePitch: number = note.pitches[toneCount - 1];
                                    for (let pitchIndex: number = toneCount; pitchIndex < note.pitches.length; pitchIndex++) {
                                        lowestArpeggioOffset = Math.min(note.pitches[pitchIndex] - basePitch);
                                        highestArpeggioOffset = Math.max(note.pitches[pitchIndex] - basePitch);
                                    }
                                    maxPitchOffset -= lowestArpeggioOffset;
                                    minPitchOffset += lowestArpeggioOffset;
                                }
                                */
                                pitchOffset = Math.min(maxPitchOffset, Math.max(minPitchOffset, pitchOffset));
                            }

                            for (let pinIndex: number = 1; pinIndex < note.pins.length; pinIndex++) {
                                const nextPinTime: number = noteStartTime + note.pins[pinIndex].time * midiTicksPerPart;
                                const nextPinSize: number = note.pins[pinIndex].size;
                                const nextPinInterval: number = note.pins[pinIndex].interval;

                                const length: number = nextPinTime - pinTime;
                                for (let midiTick: number = 0; midiTick < length; midiTick++) {
                                    const midiTickTime: number = pinTime + midiTick;
                                    const linearSize: number = lerp(pinSize, nextPinSize, midiTick / length);
                                    const linearInterval: number = lerp(pinInterval, nextPinInterval, midiTick / length);

                                    const interval: number = linearInterval * intervalScale - pitchOffset;

                                    const pitchBend: number = Math.max(0, Math.min(0x3fff, Math.round(0x2000 * (1.0 + interval / pitchBendRange))));

                                    const expression: number = Math.min(0x7f, Math.round(volumeMultToMidiExpression(Synth.noteSizeToVolumeMult(linearSize))));

                                    if (pitchBend != prevPitchBend) {
                                        writeEventTime(midiTickTime);
                                        writer.writeUint8(MidiEventType.pitchBend | midiChannel);
                                        writer.writeMidi7Bits(pitchBend & 0x7f); // least significant bits
                                        writer.writeMidi7Bits((pitchBend >> 7) & 0x7f); // most significant bits
                                        prevPitchBend = pitchBend;
                                    }

                                    if (expression != prevExpression && !isDrumset) {
                                        writeEventTime(midiTickTime);
                                        writeControlEvent(MidiControlEventMessage.expressionMSB, expression);
                                        prevExpression = expression;
                                    }

                                    const noteStarting: boolean = midiTickTime == noteStartTime;
                                    for (let toneIndex: number = 0; toneIndex < toneCount; toneIndex++) {
                                        let nextPitch: number = note.pitches[toneIndex];
                                        if (isDrumset) {
                                            nextPitch += mainInterval;
                                            const drumsetMap: number[] = [
                                                36, // Bass Drum 1
                                                41, // Low Floor Tom
                                                45, // Low Tom
                                                48, // Hi-Mid Tom
                                                40, // Electric Snare
                                                39, // Hand Clap
                                                59, // Ride Cymbal 2
                                                49, // Crash Cymbal 1
                                                46, // Open Hi-Hat
                                                55, // Splash Cymbal
                                                69, // Cabasa
                                                54, // Tambourine
                                            ];
                                            if (nextPitch < 0 || nextPitch >= drumsetMap.length) throw new Error("Could not find corresponding drumset pitch. " + nextPitch);
                                            nextPitch = drumsetMap[nextPitch];
                                        } else {
                                            if (usesArpeggio && note.pitches.length > toneIndex + 1 && toneIndex == toneCount - 1) {
                                                const midiTicksSinceBeat = (midiTickTime - barStartTime) % midiTicksPerBeat;
                                                const midiTicksPerArpeggio = Config.ticksPerArpeggio * midiTicksPerPart / Config.ticksPerPart;
                                                const arpeggio: number = Math.floor(midiTicksSinceBeat / midiTicksPerArpeggio);
                                                nextPitch = note.pitches[toneIndex + getArpeggioPitchIndex(note.pitches.length - toneIndex, instrument.fastTwoNoteArp, arpeggio)];
                                            }
                                            nextPitch = channelRoot + nextPitch * intervalScale + pitchOffset;
                                            if (preset != null && preset.midiSubharmonicOctaves != undefined) {
                                                nextPitch += 12 * preset.midiSubharmonicOctaves;
                                            } else if (isNoise) {
                                                nextPitch += 12 * (+EditorConfig.presetCategories.dictionary["Drum Presets"].presets.dictionary["taiko drum"].midiSubharmonicOctaves!);
                                            }

                                            if (isNoise) nextPitch *= 2;
                                        }
                                        nextPitch = Math.max(0, Math.min(127, nextPitch));
                                        nextPitches[toneIndex] = nextPitch;

                                        if (!noteStarting && prevPitches[toneIndex] != nextPitches[toneIndex]) {
                                            writeEventTime(midiTickTime);
                                            writer.writeUint8(MidiEventType.noteOff | midiChannel);
                                            writer.writeMidi7Bits(prevPitches[toneIndex]); // old pitch
                                            writer.writeMidi7Bits(velocity); // velocity
                                        }
                                    }

                                    for (let toneIndex: number = 0; toneIndex < toneCount; toneIndex++) {
                                        if (noteStarting || prevPitches[toneIndex] != nextPitches[toneIndex]) {
                                            writeEventTime(midiTickTime);
                                            writer.writeUint8(MidiEventType.noteOn | midiChannel);
                                            writer.writeMidi7Bits(nextPitches[toneIndex]); // new pitch
                                            writer.writeMidi7Bits(velocity); // velocity
                                            prevPitches[toneIndex] = nextPitches[toneIndex];
                                        }
                                    }
                                }

                                pinTime = nextPinTime;
                                pinSize = nextPinSize;
                                pinInterval = nextPinInterval;
                            }

							const noteEndTime: number = barStartTime + note.end * midiTicksPerPart;
							
							// End all tones.
							for (let toneIndex: number = 0; toneIndex < toneCount; toneIndex++) {
								// TODO: If the note at the start of the next pattern has
								// continuesLastPattern and has the same chord, it ought to extend
								// this previous note.
								writeEventTime(noteEndTime);
								writer.writeUint8(MidiEventType.noteOff | midiChannel);
								writer.writeMidi7Bits(prevPitches[toneIndex]); // pitch
								writer.writeMidi7Bits(velocity); // velocity
							}
							
							shouldResetExpressionAndPitchBend = true;
						}
					} else {
						if (shouldResetExpressionAndPitchBend) {
							shouldResetExpressionAndPitchBend = false;
							
							if (prevExpression != defaultMidiExpression) {
								prevExpression = defaultMidiExpression;
								// Reset expression
								writeEventTime(barStartTime);
								writeControlEvent(MidiControlEventMessage.expressionMSB, prevExpression);
							}
						
							if (prevPitchBend != defaultMidiPitchBend) {
								// Reset pitch bend
								prevPitchBend = defaultMidiPitchBend;
								writeEventTime(barStartTime);
								writer.writeUint8(MidiEventType.pitchBend | midiChannel);
								writer.writeMidi7Bits(prevPitchBend & 0x7f); // least significant bits
								writer.writeMidi7Bits((prevPitchBend >> 7) & 0x7f); // most significant bits
							}
						}
					}
					
					barStartTime += midiTicksPerBar;
				}
			}
			
			writeEventTime(barStartTime);
			writer.writeUint8(MidiEventType.meta);
			writer.writeMidi7Bits(MidiMetaEventMessage.endOfTrack);
			writer.writeMidiVariableLength(0x00);
			
			// Finally, write the length of the track in bytes at the front of the track.
			writer.rewriteUint32(trackStartIndex, writer.getWriteIndex() - trackStartIndex - 4);
		}
		
		const blob: Blob = new Blob([writer.toCompactArrayBuffer()], {type: "audio/midi"});
		save(blob, this._fileName.value.trim() + ".mid");
		
		this._close();
	}
	
	private _exportToJson(): void {
		const jsonObject: Object = this._doc.song.toJsonObject(this._enableIntro.checked, Number(this._loopDropDown.value), this._enableOutro.checked);
		const jsonString: string = JSON.stringify(jsonObject, null, '\t');
		const blob: Blob = new Blob([jsonString], {type: "application/json"});
		save(blob, this._fileName.value.trim() + ".json");
		this._close();
    }

    private _exportToHtml(): void {
        const fileContents = `\
<!DOCTYPE html><meta charset="utf-8">

You should be redirected to the song at:<br /><br />

<a id="destination" href="${new URL("#" + this._doc.song.toBase64String(), location.href).href}"></a>

<style>
	:root {
		color: white;
		background: black;
		font-family:
		sans-serif;
	}
	a {
		color: #98f;
	}
	a[href]::before {
		content: attr(href);
	}
</style>

<script>
	location.assign(document.querySelector("a#destination").href);
</script>
`;
        const blob: Blob = new Blob([fileContents], { type: "text/html" });
        save(blob, this._fileName.value.trim() + ".html");
        this._close();
    }
}
