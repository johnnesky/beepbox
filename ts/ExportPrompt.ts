/*
Copyright (C) 2012 John Nesky

Permission is hereby granted, free of charge, to any person obtaining a copy of 
this software and associated documentation files (the "Software"), to deal in 
the Software without restriction, including without limitation the rights to 
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies 
of the Software, and to permit persons to whom the Software is furnished to do 
so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all 
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR 
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, 
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE 
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER 
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, 
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE 
SOFTWARE.
*/

/// <reference path="synth.ts" />
/// <reference path="editor.ts" />
/// <reference path="SongEditor.ts" />

"use strict";

interface ArrayBufferConstructor {
	transfer: any;
}

module beepbox {
	const {button, div, span, input, text} = html;
	
	// Polyfill for ArrayBuffer.transfer.
	///@TODO: Check if ArrayBuffer.transfer is widely implemented.
	if (!ArrayBuffer.transfer) {
		ArrayBuffer.transfer = function(source, length) {
			source = Object(source);
			const dest = new ArrayBuffer(length);
			if (!(source instanceof ArrayBuffer) || !(dest instanceof ArrayBuffer)) {
				throw new TypeError('Source and destination must be ArrayBuffer instances');
			}
			let nextOffset = 0;
			let leftBytes = Math.min(source.byteLength, dest.byteLength);
			const wordSizes = [8, 4, 2, 1];
			for (const wordSize of wordSizes) {
				if (leftBytes >= wordSize) {
					const done = transferWith(wordSize, source, dest, nextOffset, leftBytes);
					nextOffset = done.nextOffset;
					leftBytes = done.leftBytes;
				}
			}
			return dest;
			function transferWith(wordSize, source, dest, nextOffset, leftBytes) {
				let ViewClass = Uint8Array;
				switch (wordSize) {
					case 8:
						ViewClass = Float64Array;
						break;
					case 4:
						ViewClass = Float32Array;
						break;
					case 2:
						ViewClass = Uint16Array;
						break;
					case 1:
						ViewClass = Uint8Array;
						break;
					default:
						ViewClass = Uint8Array;
						break;
				}
				
				const view_source = new ViewClass(source, nextOffset, (leftBytes / wordSize) | 0);
				const view_dest = new ViewClass(dest, nextOffset, (leftBytes / wordSize) | 0);
				for (let i = 0; i < view_dest.length; i++) {
					view_dest[i] = view_source[i];
				}
				return {
					nextOffset : view_source.byteOffset + view_source.byteLength,
					leftBytes : leftBytes - view_dest.length * wordSize,
				}
			}
		};
	}

	export class ExportPrompt {
		private readonly _fileName: HTMLInputElement = input({type: "text", value: "BeepBox-Song", maxlength: 250, size: 15});
		private readonly _enableIntro: HTMLInputElement = input({type: "checkbox"});
		private readonly _loopDropDown: HTMLInputElement = input({style:"width: 40px; height: 16px;", type: "number", min: "1", max: "4", step: "1"});
		private readonly _enableOutro: HTMLInputElement = input({type: "checkbox"});
		private readonly _exportWavButton: HTMLButtonElement = button({style: "width:200px;", type: "button"}, [text("Export to .wav file")]);
		private readonly _exportMidiButton: HTMLButtonElement = button({style: "width:200px;", type: "button"}, [text("Export to .midi file")]);
		private readonly _exportJsonButton: HTMLButtonElement = button({style: "width:200px;", type: "button"}, [text("Export to .json file")]);
		private readonly _cancelButton: HTMLButtonElement = button({style: "width:200px;", type: "button"}, [text("Cancel")]);
		
		public readonly container: HTMLDivElement = div({style: "position: absolute;"}, [
			div({style: "display: table-cell; vertical-align: middle; width: 700px; height: 645px;"}, [
				div({style: "margin: auto; text-align: center; background: #000000; width: 200px; border-radius: 15px; border: 4px solid #444444; color: #ffffff; font-size: 12px; padding: 20px;"}, [
					div({style: "font-size: 30px"}, [text("Export Options")]),
					div({style: "height: 20px;"}),
					div({style: "vertical-align: middle; line-height: 46px;"}, [
						span({style: "float: right;"}, [
							div({style: "display: inline-block; vertical-align: middle; text-align: right; line-height: 18px;"}, [
								text("File name:"),
							]),
							div({style: "display: inline-block; width: 20px; height: 1px;"}),
							this._fileName,
						]),
						div({style: "clear: both;"}),
					]),
					div({style: "display: table; width: 200px;"}, [
						div({style: "display: table-row;"}, [
							div({style: "display: table-cell;"}, [text("Intro:")]),
							div({style: "display: table-cell;"}, [text("Loop Count:")]),
							div({style: "display: table-cell;"}, [text("Outro:")]),
						]),
						div({style: "display: table-row; height: 30px;"}, [
							div({style: "display: table-cell; vertical-align: middle;"}, [this._enableIntro]),
							div({style: "display: table-cell; vertical-align: middle;"}, [this._loopDropDown]),
							div({style: "display: table-cell; vertical-align: middle;"}, [this._enableOutro]),
						]),
					]),
					div({style: "height: 20px;"}),
					this._exportWavButton,
					div({style: "height: 20px;"}),
					this._exportMidiButton,
					div({style: "height: 20px;"}),
					this._exportJsonButton,
					div({style: "height: 20px;"}),
					this._cancelButton,
				]),
			]),
		]);
		
		constructor(private _doc: SongDocument, private _songEditor: SongEditor) {
			this._loopDropDown.value = "1";
			
			if (this._doc.song.loopStart == 0) {
				this._enableIntro.checked = false;
				this._enableIntro.disabled = true;
			} else {
				this._enableIntro.checked = true;
				this._enableIntro.disabled = false;
			}
			if (this._doc.song.loopStart + this._doc.song.loopLength == this._doc.song.bars) {
				this._enableOutro.checked = false;
				this._enableOutro.disabled = true;
			} else {
				this._enableOutro.checked = true;
				this._enableOutro.disabled = false;
			}
			
			this._fileName.addEventListener("input", ExportPrompt._validateFileName);
			this._loopDropDown.addEventListener("blur", ExportPrompt._validateNumber);
			this._exportWavButton.addEventListener("click", this._onExportToWav);
			this._exportMidiButton.addEventListener("click", this._onExportToMidi);
			this._exportJsonButton.addEventListener("click", this._onExportToJson);
			this._cancelButton.addEventListener("click", this._onClose);
		}
		
		private _onClose = (): void => { 
			this._songEditor.closePrompt(this);
			this._fileName.removeEventListener("input", ExportPrompt._validateFileName);
			this._loopDropDown.removeEventListener("blur", ExportPrompt._validateNumber);
			this._exportWavButton.removeEventListener("click", this._onExportToWav);
			this._exportMidiButton.removeEventListener("click", this._onExportToMidi);
			this._exportJsonButton.removeEventListener("click", this._onExportToJson);
			this._cancelButton.removeEventListener("click", this._onClose);
		}
		
		private static _validateFileName(event: Event): void {
			const input: HTMLInputElement = <HTMLInputElement>event.target;
			const deleteChars = /[\+\*\$\?\|\{\}\\\/<>#%!`&'"=:@]/gi;
			if (deleteChars.test(input.value)) {
				let cursorPos: number = input.selectionStart;
				input.value = input.value.replace(deleteChars, "");
				cursorPos--;
				input.setSelectionRange(cursorPos, cursorPos);
			}
		}
		
		private static _validateNumber(event: Event): void {
			const input: HTMLInputElement = <HTMLInputElement>event.target;
			input.value = Math.floor(Math.max(Number(input.min), Math.min(Number(input.max), Number(input.value)))) + "";
		}
		
		private _onExportToWav = (): void => {
			
			const synth: Synth = new Synth(this._doc.song)
			synth.enableIntro = this._enableIntro.checked;
			synth.enableOutro = this._enableOutro.checked;
			synth.loopCount = Number(this._loopDropDown.value);
			if (!synth.enableIntro) {
				for (let introIter: number = 0; introIter < this._doc.song.loopStart; introIter++) {
					synth.nextBar();
				}
			}
			const sampleFrames: number = synth.totalSamples;
			const recordedSamples: Float32Array = new Float32Array(sampleFrames);
			//const timer: number = performance.now();
			synth.synthesize(recordedSamples, sampleFrames);
			//console.log("export timer", (performance.now() - timer) / 1000.0);
			
			const srcChannelCount: number = 1;
			const wavChannelCount: number = 1;
			const sampleRate: number = 44100;
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
			data.setUint16(index, bytesPerSample, true); index += 2; // sample rate
			data.setUint16(index, bitsPerSample, true); index += 2; // sample rate
			data.setUint32(index, 0x64617461, false); index += 4;
			data.setUint32(index, sampleCount * bytesPerSample, true); index += 4;
			let stride: number;
			let repeat: number;
			if (srcChannelCount == wavChannelCount) {
				stride = 1;
				repeat = 1;
			} else {
				stride = srcChannelCount;
				repeat = wavChannelCount;
			}
			
			let val: number;
			if (bytesPerSample > 1) {
				// usually samples are signed. 
				for (let i: number = 0; i < sampleFrames; i++) {
					val = Math.floor(recordedSamples[i * stride] * ((1 << (bitsPerSample - 1)) - 1));
					for (let k: number = 0; k < repeat; k++) {
						if (bytesPerSample == 2) {
							data.setInt16(index, val, true); index += 2;
						} else if (bytesPerSample == 4) {
							data.setInt32(index, val, true); index += 4;
						} else {
							throw new Error("unsupported sample size");
						}
					}
				}
			} else {
				// 8 bit samples are a special case: they are unsigned.
				for (let i: number = 0; i < sampleFrames; i++) {
					val = Math.floor(recordedSamples[i*stride] * 127 + 128);
					for (let k: number = 0; k < repeat; k++) {
						data.setUint8(index, val > 255 ? 255 : (val < 0 ? 0 : val)); index++;
					}
				}
			}
			
			const blob = new Blob([arrayBuffer], {type: "audio/wav"});
			saveAs(blob, this._fileName.value.trim() + ".wav");
			
			this._onClose();
		}
		
		private _onExportToMidi = (): void => {
			let writeIndex: number = 0;
			let fileSize: number = 0;
			let arrayBuffer: ArrayBuffer = new ArrayBuffer(1024);
			let data: DataView = new DataView(arrayBuffer);
			
			function addBytes(numBytes: number): void {
				fileSize += numBytes;
				if (fileSize > arrayBuffer.byteLength) {
					arrayBuffer = ArrayBuffer.transfer(arrayBuffer, Math.max(arrayBuffer.byteLength * 2, fileSize));
					data = new DataView(arrayBuffer);
				}
			}
			
			function writeUint32(value): void {
				value = value >>> 0;
				addBytes(4);
				data.setUint32(writeIndex, value, false);
				writeIndex = fileSize;
			}
			function writeUint24(value): void {
				value = value >>> 0;
				addBytes(3);
				data.setUint8(writeIndex  , (value>>16)&0xff);
				data.setUint8(writeIndex+1, (value>> 8)&0xff);
				data.setUint8(writeIndex+2, (value    )&0xff);
				writeIndex = fileSize;
			}
			function writeUint16(value): void {
				value = value >>> 0;
				addBytes(2);
				data.setUint16(writeIndex, value, false);
				writeIndex = fileSize;
			}
			function writeUint8(value): void {
				value = value >>> 0;
				addBytes(1);
				data.setUint8(writeIndex, value);
				writeIndex = fileSize;
			}
			function writeFlagAnd7Bits(flag, value): void {
				value = ((value >>> 0) & 0x7f) | ((flag & 0x01) << 7);
				addBytes(1);
				data.setUint8(writeIndex, value);
				writeIndex = fileSize;
			}
			
			function writeVariableLength(value): void {
				value = value >>> 0;
				if (value > 0x0fffffff) throw new Error("writeVariableLength value too big.");
				let startWriting: boolean = false;
				for (let i: number = 0; i < 4; i++) {
					const shift: number = 21 - i * 7;
					const bits: number = (value >>> shift) & 0x7f;
					if (bits != 0 || i == 3) startWriting = true; // skip leading zero bytes, but always write the last byte even if it's zero. 
					if (startWriting) writeFlagAnd7Bits(i == 3 ? 0 : 1, bits);
				}
			}
			
			function writeAscii(string): void {
				writeVariableLength(string.length);
				for (let i = 0; i < string.length; i++) {
					const charCode: number = string.charCodeAt(i);
					if (charCode > 0x7f) throw new Error("Trying to write unicode character as ascii.");
					writeUint8(charCode); // technically charCodeAt returns 2 byte values, but this string should contain exclusively 1 byte values.
				}
			}
			
			const song: Song = this._doc.song;
			const ticksPerBeat: number = 96;
			const ticksPerPart: number = ticksPerBeat / song.parts;
			const ticksPerArpeggio: number = ticksPerPart / 4;
			const secondsPerMinute: number = 60;
			const microsecondsPerMinute: number = secondsPerMinute * 1000000;
			const beatsPerMinute: number = song.getBeatsPerMinute();
			const microsecondsPerBeat: number = Math.round(microsecondsPerMinute / beatsPerMinute);
			const secondsPerTick: number = secondsPerMinute / (ticksPerBeat * beatsPerMinute);
			const ticksPerBar: number = ticksPerBeat * song.beats;
			
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
				for (let bar: number = song.loopStart + song.loopLength; bar < song.bars; bar++) {
					unrolledBars.push(bar);
				}
			}
			
			const tracks = [
				{isMeta:  true, channel: -1, midiChannel: -1, isChorus: false, isDrums: false},
				{isMeta: false, channel:  0, midiChannel:  0, isChorus: false, isDrums: false},
				{isMeta: false, channel:  0, midiChannel:  1, isChorus:  true, isDrums: false},
				{isMeta: false, channel:  1, midiChannel:  2, isChorus: false, isDrums: false},
				{isMeta: false, channel:  1, midiChannel:  3, isChorus:  true, isDrums: false},
				{isMeta: false, channel:  2, midiChannel:  4, isChorus: false, isDrums: false},
				{isMeta: false, channel:  2, midiChannel:  5, isChorus:  true, isDrums: false},
				{isMeta: false, channel:  3, midiChannel:  6, isChorus: false, isDrums:  true},
			];
			
			writeUint32(0x4D546864); // "MThd": Header chunk type
			writeUint32(6); // length of headers is 6 bytes
			writeUint16(1); // file format is 1, meaning multiple simultaneous tracks
			writeUint16(tracks.length);
			writeUint16(ticksPerBeat); // number of "ticks" per beat, independent of tempo
			
			for (const track of tracks) {
				writeUint32(0x4D54726B); // "MTrk": Track chunk type
				
				const {isMeta, channel, midiChannel, isChorus, isDrums} = track;
				
				// We're gonna come back here once we know how many bytes this track is.
				const trackLengthIndex: number = writeIndex;
				fileSize += 4;
				writeIndex = fileSize;
				
				let prevTime: number = 0;
				let barStartTime: number = 0;
				const writeEventTime = function(time): void {
					if (time < prevTime) throw new Error("Midi event time cannot go backwards.");
					writeVariableLength(time - prevTime);
					prevTime = time;
				}
				
				if (isMeta) {
					// for first midi track, include tempo, time signature, and key signature information.
					
					writeEventTime(0);
					writeUint16(0xFF01); // text meta event. 
					writeAscii("http://www.beepbox.co/" + song.toString());
					
					writeEventTime(0);
					writeUint24(0xFF5103); // tempo meta event. data is 3 bytes.
					writeUint24(microsecondsPerBeat); // Tempo in microseconds per "quarter" note, commonly known as a "beat"
					
					writeEventTime(0);
					writeUint24(0xFF5804); // time signature meta event. data is 4 bytes.
					writeUint8(song.beats); // numerator. @TODO: turn 8/4 into 4/4? 
					writeUint8(2); // denominator exponent in 2^E. 2^2 = 4, and we will always use "quarter" notes.
					writeUint8(24); // MIDI Clocks per metronome tick (should match beats), standard is 24
					writeUint8(8); // number of 1/32 notes per 24 MIDI Clocks, standard is 8, meaning 24 clocks per "quarter" note.
					
					const isMinor: boolean = (song.scale < 10) && ((song.scale & 1) == 1);
					const key: number = 11 - song.key; // convert to scale where C=0, C#=1, counting up to B=11
					let numSharps: number = key; // For even key values in major scale, number of sharps/flats is same...
					if ((key & 1) == 1) numSharps += 6; // For odd key values (consider circle of fifths) rotate around the circle... kinda... Look conventional key signatures are just weird, okay?
					if (isMinor) numSharps += 9; // A minor A scale has zero sharps, shift it appropriately
					while (numSharps > 6) numSharps -= 12; // Range is (modulo 12) - 5. Midi supports -7 to +7, but I only have 12 options.
					
					writeEventTime(0);
					writeUint24(0xFF5902); // time signature meta event. data is 2 bytes.
					writeUint8(numSharps); // see above calculation. or don't, it doesn't actually make sense anyway. This is a really lame way to define key signature IMHO.
					writeUint8(isMinor ? 1 : 0); // 0: major, 1: minor
					
					if (this._enableIntro.checked) barStartTime += ticksPerBar * song.loopStart;
					writeEventTime(barStartTime);
					writeUint16(0xFF06); // marker meta event. 
					writeAscii("Loop Start");
					
					for (let loopIndex: number = 0; loopIndex < Number(this._loopDropDown.value); loopIndex++) {
						barStartTime += ticksPerBar * song.loopLength;
						writeEventTime(barStartTime);
						writeUint16(0xFF06); // marker meta event. 
						writeAscii(loopIndex < Number(this._loopDropDown.value) - 1 ? "Loop Repeat" : "Loop End");
					}
					
					if (this._enableOutro.checked) barStartTime += ticksPerBar * (song.bars - song.loopStart - song.loopLength);
					if (barStartTime != ticksPerBar * unrolledBars.length) throw new Error("Miscalculated number of bars.");
					
				} else {
					// For tracks 0, 1, 2, and 3, set up the instruments and write the notes:
					
					let channelName = ["blue channel", "yellow channel", "orange channel", "gray channel"][channel];
					if (isChorus) channelName += " chorus";
					writeEventTime(0);
					writeUint16(0xFF03); // track name meta event.
					writeAscii(channelName);
					
					writeEventTime(barStartTime);
					writeUint8(0xB0 | midiChannel); // control event for mono mode for given channel
					writeFlagAnd7Bits(0, 0x7E); // mono mode
					writeFlagAnd7Bits(0, 1); // enable for one channel. @TODO: Should I enable for multiple channels at once?
					
					writeEventTime(barStartTime);
					writeUint8(0xB0 | midiChannel); // control event for legato mode for given channel
					writeFlagAnd7Bits(0, 0x44); // legato mode
					writeFlagAnd7Bits(0, 0x7f); // enable.
					
					let prevInstrument: number = -1;
					let prevPitchBend: number = -1;
					let prevExpression: number = -1;
					//let prevTremelo: number = -1;
					const channelRoot: number = isDrums ? 33 : Music.keyTransposes[song.key];
					const intervalScale: number = isDrums ? Music.drumInterval : 1;
					
					for (const bar of unrolledBars) {
						const pattern: BarPattern | null = song.getPattern(channel, bar);
						
						if (pattern != null) {
							
							const nextInstrument: number = pattern.instrument;
							
							if (isChorus && song.instrumentChorus[channel][nextInstrument] == 0) {
								barStartTime += ticksPerBar;
								continue;
							}
							
							if (prevInstrument != nextInstrument) {
								prevInstrument = nextInstrument;
								
								writeEventTime(barStartTime);
								writeUint16(0xFF04); // instrument event. 
								if (isDrums) {
									let description = "noise: " + Music.drumNames[song.instrumentWaves[channel][nextInstrument]];
									description += ", volume: " + Music.volumeNames[song.instrumentVolumes[channel][nextInstrument]];
									description += ", envelope: " + Music.attackNames[song.instrumentAttacks[channel][nextInstrument]];
									writeAscii(description);
									
									// Program (instrument) change event:
									writeEventTime(barStartTime);
									writeUint8(0xC0 | midiChannel); // program change event for given channel
									writeFlagAnd7Bits(0, 0x7E); // seashore, applause
								} else {
									let description = "wave: " + Music.waveNames[song.instrumentWaves[channel][nextInstrument]];
									description += ", volume: " + Music.volumeNames[song.instrumentVolumes[channel][nextInstrument]];
									description += ", envelope: " + Music.attackNames[song.instrumentAttacks[channel][nextInstrument]];
									description += ", filter: " + Music.filterNames[song.instrumentFilters[channel][nextInstrument]];
									description += ", chorus: " + Music.chorusNames[song.instrumentChorus[channel][nextInstrument]];
									description += ", effect: " + Music.effectNames[song.instrumentEffects[channel][nextInstrument]];
									writeAscii(description);
									
									const sustainInstruments: number[] = [
										0x47, // triangle -> clarinet
										0x50, // square -> square wave
										0x46, // pulse wide -> bassoon
										0x44, // pulse narrow -> oboe
										0x51, // sawtooth -> sawtooth wave
										0x51, // double saw -> sawtooth wave
										0x51, // double pulse -> sawtooth wave
										0x51, // spiky -> sawtooth wave
										0x4A, // plateau -> recorder
									];
									
									const decayInstruments: number[] = [
										0x2E, // triangle -> harp
										0x2E, // square -> harp
										0x06, // pulse wide -> harpsichord
										0x18, // pulse narrow -> nylon guitar
										0x19, // sawtooth -> steel guitar
										0x19, // double saw -> steel guitar
										0x6A, // double pulse -> shamisen
										0x6A, // spiky -> shamisen
										0x21, // plateau -> fingered bass
									];
									
									const filterInstruments: number[] = song.instrumentFilters[channel][nextInstrument] < 3 ? sustainInstruments : decayInstruments;
									
									// Program (instrument) change event:
									writeEventTime(barStartTime);
									writeUint8(0xC0 | midiChannel); // program change event for given channel
									writeFlagAnd7Bits(0, filterInstruments[song.instrumentWaves[channel][nextInstrument]]); // instrument program
								}
								
								const instrumentVolumeChoice: number = song.instrumentVolumes[channel][nextInstrument];
								//const channelVolume: number = (instrumentVolumeChoice == 5 ? 0 : Math.pow(2, -instrumentVolumeChoice));
								const channelVolume: number = (5 - instrumentVolumeChoice) / 5;
								writeEventTime(barStartTime);
								writeUint8(0xB0 | midiChannel); // control event for channel volume for given channel
								writeFlagAnd7Bits(0, 0x07); // channel volume controller (most significant bits)
								writeFlagAnd7Bits(0, Math.round(0x7f * channelVolume)); // volume
							}
							
							const effectChoice: number = song.instrumentEffects[channel][nextInstrument];
							const effectVibrato: number = Music.effectVibratos[effectChoice];
							const effectTremelo: number = Music.effectTremelos[effectChoice];
							const effectDuration: number = 0.14;
							
							let chorusOffset: number = Music.chorusValues[song.instrumentChorus[channel][nextInstrument]];
							if (!isChorus) chorusOffset *= -1;
							chorusOffset += Music.chorusOffsets[song.instrumentChorus[channel][nextInstrument]];
							
							for (let toneIndex: number = 0; toneIndex < pattern.tones.length; toneIndex++) {
								const tone: Tone = pattern.tones[toneIndex];
								
								const toneStartTime: number = barStartTime + tone.start * ticksPerPart;
								let pinTime: number = toneStartTime;
								let pinVolume: number = tone.pins[0].volume;
								let pinInterval: number = tone.pins[0].interval;
								let pitch: number = channelRoot + tone.notes[0] * intervalScale;
								
								for (let pinIndex: number = 1; pinIndex < tone.pins.length; pinIndex++) {
									const nextPinTime: number = toneStartTime + tone.pins[pinIndex].time * ticksPerPart;
									const nextPinVolume: number = tone.pins[pinIndex].volume;
									const nextPinInterval: number = tone.pins[pinIndex].interval;
									
									const length: number = nextPinTime - pinTime;
									for (let tick: number = 0; tick < length; tick++) {
										const tickTime: number = pinTime + tick;
										const linearVolume: number = lerp(pinVolume, nextPinVolume, tick / length);
										const linearInterval: number = lerp(pinInterval, nextPinInterval, tick / length);
										
										const arpeggio = Math.floor(tick / ticksPerArpeggio) % 4;
										let nextPitch: number;
										if (tone.notes.length == 2) {
											nextPitch = tone.notes[arpeggio >> 1];
										} else if (tone.notes.length == 3) {
											nextPitch = tone.notes[arpeggio == 3 ? 1 : arpeggio];
										} else if (tone.notes.length == 4) {
											nextPitch = tone.notes[arpeggio];
										} else {
											nextPitch = tone.notes[0];
										}
										const fractionalPitch = channelRoot + nextPitch * intervalScale + linearInterval + chorusOffset;
										nextPitch = Math.round(fractionalPitch);
										let pitchOffset = fractionalPitch - nextPitch;
										
										const effectCurve: number = Math.sin(Math.PI * 2.0 * (tickTime - barStartTime) * secondsPerTick / effectDuration);
										if (effectChoice != 2 || tickTime - toneStartTime >= 3 * ticksPerPart) {
											pitchOffset += effectVibrato * effectCurve;
										}
										const pitchBend: number = Math.max(0, Math.min(0x3fff, Math.round(0x2000 + 0x1000 * pitchOffset)));
										
										//const volume: number = Math.pow(linearVolume / 3.0, 1.5);
										const volume: number = linearVolume / 3;
										const tremelo = 1.0 + effectTremelo * (effectCurve - 1.0);
										let expression: number = Math.round(0x7f * volume * tremelo);
										
										if (pitchBend != prevPitchBend) {
											writeEventTime(tickTime);
											writeUint8(0xE0 | midiChannel); // pitch bend event
											writeFlagAnd7Bits(0, pitchBend & 0x7f); // least significant bits
											writeFlagAnd7Bits(0, (pitchBend >> 7) & 0x7f); // most significant bits
											prevPitchBend = pitchBend;
										}
										
										if (expression != prevExpression) {
											writeEventTime(tickTime);
											writeUint8(0xB0 | midiChannel); // control event for expression for given channel
											writeFlagAnd7Bits(0, 0x0B); // expression controller (most significant bits)
											writeFlagAnd7Bits(0, expression); // pressure, most significant bits
											prevExpression = expression;
										}
										
										if (tickTime == toneStartTime) {
											writeEventTime(tickTime);
											writeUint8(0x90 | midiChannel); // note on event for given channel
											writeFlagAnd7Bits(0, nextPitch); // pitch
											writeFlagAnd7Bits(0, 0x40); // pressure
										} else if (nextPitch != pitch) {
											writeEventTime(tickTime);
											writeUint8(0x90 | midiChannel); // note on event for given channel
											writeFlagAnd7Bits(0, nextPitch); // new pitch
											writeFlagAnd7Bits(0, 0x40); // pressure
											
											writeEventTime(tickTime);
											writeUint8(0x80 | midiChannel); // note off event for given channel
											writeFlagAnd7Bits(0, pitch); // old pitch
											writeFlagAnd7Bits(0, 0x40); // pressure
										}
										
										pitch = nextPitch;
									}
									
									pinTime = nextPinTime;
									pinVolume = nextPinVolume;
									pinInterval = nextPinInterval;
								}
								
								writeEventTime(barStartTime + tone.end * ticksPerPart);
								writeUint8(0x80 | midiChannel); // note off event for given channel
								writeFlagAnd7Bits(0, pitch); // pitch
								writeFlagAnd7Bits(0, 0x40); // pressure
							}
						}
						
						barStartTime += ticksPerBar;
					}
				}
				
				writeEventTime(barStartTime);
				writeUint24(0xFF2F00); // end of track
				
				// Finally, write the length of the track in bytes at the front of the track.
				data.setUint32(trackLengthIndex, writeIndex - trackLengthIndex - 4, false);
			}
			
			// Truncate arrayBuffer
			arrayBuffer = ArrayBuffer.transfer(arrayBuffer, fileSize);
			
			const blob = new Blob([arrayBuffer], {type: "audio/midi"});
			saveAs(blob, this._fileName.value.trim() + ".midi");
			
			this._onClose();
		}
		
		private _onExportToJson = (): void => {
			const jsonObject: Object = this._doc.song.toJsonObject(this._enableIntro.checked, Number(this._loopDropDown.value), this._enableOutro.checked);
			const jsonString: string = JSON.stringify(jsonObject, null, '\t');
			const blob = new Blob([jsonString], {type: "application/json"});
			saveAs(blob, this._fileName.value.trim() + ".json");
			this._onClose();
		}
	}
}

/*! @source https://github.com/eligrey/FileSaver.js/blob/master/FileSaver.min.js */
var saveAs=saveAs||function(e){"use strict";if(typeof e==="undefined"||typeof navigator!=="undefined"&&/MSIE [1-9]\./.test(navigator.userAgent)){return}let t=e.document,n=function(){return e.URL||e.webkitURL||e},r=t.createElementNS("http://www.w3.org/1999/xhtml","a"),o="download"in r,i=function(e){let t=new MouseEvent("click");e.dispatchEvent(t)},a=/constructor/i.test(e.HTMLElement),f=/CriOS\/[\d]+/.test(navigator.userAgent),u=function(t){(e.setImmediate||e.setTimeout)(function(){throw t},0)},d="application/octet-stream",s=1e3*40,c=function(e){let t=function(){if(typeof e==="string"){n().revokeObjectURL(e)}else{e.remove()}};setTimeout(t,s)},l=function(e,t,n){t=[].concat(t);let r=t.length;while(r--){let o=e["on"+t[r]];if(typeof o==="function"){try{o.call(e,n||e)}catch(i){u(i)}}}},p=function(e){if(/^\s*(?:text\/\S*|application\/xml|\S*\/\S*\+xml)\s*;.*charset\s*=\s*utf-8/i.test(e.type)){return new Blob([String.fromCharCode(65279),e],{type:e.type})}return e},v=function(t,u,s){if(!s){t=p(t)}let v=this,w=t.type,m=w===d,y,h=function(){l(v,"writestart progress write writeend".split(" "))},S=function(){if((f||m&&a)&&e.FileReader){let r=new FileReader;r.onloadend=function(){let t=f?r.result:r.result.replace(/^data:[^;]*;/,"data:attachment/file;");let n=e.open(t,"_blank");if(!n)e.location.href=t;t=undefined;v.readyState=v.DONE;h()};r.readAsDataURL(t);v.readyState=v.INIT;return}if(!y){y=n().createObjectURL(t)}if(m){e.location.href=y}else{let o=e.open(y,"_blank");if(!o){e.location.href=y}}v.readyState=v.DONE;h();c(y)};v.readyState=v.INIT;if(o){y=n().createObjectURL(t);setTimeout(function(){r.href=y;r.download=u;i(r);h();c(y);v.readyState=v.DONE});return}S()},w=v.prototype,m=function(e,t,n){return new v(e,t||e.name||"download",n)};if(typeof navigator!=="undefined"&&navigator.msSaveOrOpenBlob){return function(e,t,n){t=t||e.name||"download";if(!n){e=p(e)}return navigator.msSaveOrOpenBlob(e,t)}}w.abort=function(){};w.readyState=w.INIT=0;w.WRITING=1;w.DONE=2;w.error=w.onwritestart=w.onprogress=w.onwrite=w.onabort=w.onerror=w.onwriteend=null;return m}(typeof self!=="undefined"&&self||typeof window!=="undefined"&&window||this.content);if(typeof module!=="undefined"&&module.exports){module.exports.saveAs=saveAs}else if(typeof define!=="undefined"&&define!==null&&define.amd!==null){define([],function(){return saveAs})}
