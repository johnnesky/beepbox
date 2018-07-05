/*
Copyright (C) 2018 John Nesky

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
/// <reference path="SongDocument.ts" />
/// <reference path="Prompt.ts" />
/// <reference path="html.ts" />

interface ArrayBufferConstructor {
	transfer: any;
}

namespace beepbox {
	const {button, div, input, text} = html;
	
	function lerp(low: number, high: number, t: number): number {
		return low + t * (high - low);
	}
	
	function save(blob: Blob, name: string): void {
		if (navigator.msSaveOrOpenBlob) {
			navigator.msSaveOrOpenBlob(blob, name);
			return;
		}
	
		const anchor: HTMLAnchorElement = document.createElement("a");
		if (anchor.download != undefined) {
			const url: string = URL.createObjectURL(blob);
			setTimeout(function() { URL.revokeObjectURL(url); }, 60000);
			anchor.href = url;
			anchor.download = name;
			// Chrome bug regression: We need to delay dispatching the click
			// event. Seems to be related to going back in the browser history.
			// https://bugs.chromium.org/p/chromium/issues/detail?id=825100
			setTimeout(function() { anchor.dispatchEvent(new MouseEvent("click")); }, 0);
		} else if (navigator.vendor.indexOf("Apple") > -1) {
			// Safari 10.1 doesn't need this hack, delete it later.
			var reader = new FileReader();
			reader.onloadend = function() {
				console.log(reader.result);
				var url = reader.result.replace(/^data:[^;]*;/, 'data:attachment/file;');
				if (!window.open(url, "_blank")) window.location.href = url;
			};
			reader.readAsDataURL(blob);
		} else {
			const url: string = URL.createObjectURL(blob);
			setTimeout(function() { URL.revokeObjectURL(url); }, 60000);
			if (!window.open(url, "_blank")) window.location.href = url;
		}
	}
	
	// Polyfill for ArrayBuffer.transfer.
	///@TODO: Check if ArrayBuffer.transfer is widely implemented.
	if (!ArrayBuffer.transfer) {
		ArrayBuffer.transfer = function(source: ArrayBuffer, length: number) {
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
			function transferWith(wordSize: number, source: ArrayBuffer, dest: ArrayBuffer, nextOffset: number, leftBytes: number) {
				let ViewClass: any = Uint8Array;
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

	export class ExportPrompt implements Prompt {
		private readonly _fileName: HTMLInputElement = input({type: "text", style: "width: 10em;", value: "BeepBox-Song", maxlength: 250});
		private readonly _enableIntro: HTMLInputElement = input({type: "checkbox"});
		private readonly _loopDropDown: HTMLInputElement = input({style:"width: 2em;", type: "number", min: "1", max: "4", step: "1"});
		private readonly _enableOutro: HTMLInputElement = input({type: "checkbox"});
		private readonly _exportWavButton: HTMLButtonElement = button({}, [text("Export to .wav file")]);
		private readonly _exportMidiButton: HTMLButtonElement = button({}, [text("Export to .midi file")]);
		private readonly _exportJsonButton: HTMLButtonElement = button({}, [text("Export to .json file")]);
		private readonly _cancelButton: HTMLButtonElement = button({}, [text("Cancel")]);
		
		public readonly container: HTMLDivElement = div({className: "prompt", style: "width: 200px;"}, [
			div({style: "font-size: 2em"}, [text("Export Options")]),
			div({style: "display: flex; flex-direction: row; align-items: center; justify-content: space-between;"}, [
				text("File name:"),
				this._fileName,
			]),
			div({style: "display: table; width: 100%;"}, [
				div({style: "display: table-row;"}, [
					div({style: "display: table-cell;"}, [text("Intro:")]),
					div({style: "display: table-cell;"}, [text("Loop Count:")]),
					div({style: "display: table-cell;"}, [text("Outro:")]),
				]),
				div({style: "display: table-row;"}, [
					div({style: "display: table-cell; vertical-align: middle;"}, [this._enableIntro]),
					div({style: "display: table-cell; vertical-align: middle;"}, [this._loopDropDown]),
					div({style: "display: table-cell; vertical-align: middle;"}, [this._enableOutro]),
				]),
			]),
			this._exportWavButton,
			this._exportMidiButton,
			this._exportJsonButton,
			this._cancelButton,
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
			if (this._doc.song.loopStart + this._doc.song.loopLength == this._doc.song.barCount) {
				this._enableOutro.checked = false;
				this._enableOutro.disabled = true;
			} else {
				this._enableOutro.checked = true;
				this._enableOutro.disabled = false;
			}
			
			this._fileName.addEventListener("input", ExportPrompt._validateFileName);
			this._loopDropDown.addEventListener("blur", ExportPrompt._validateNumber);
			this._exportWavButton.addEventListener("click", this._whenExportToWav);
			this._exportMidiButton.addEventListener("click", this._whenExportToMidi);
			this._exportJsonButton.addEventListener("click", this._whenExportToJson);
			this._cancelButton.addEventListener("click", this._close);
		}
		
		private _close = (): void => { 
			this._doc.undo();
		}
		
		public cleanUp = (): void => { 
			this._fileName.removeEventListener("input", ExportPrompt._validateFileName);
			this._loopDropDown.removeEventListener("blur", ExportPrompt._validateNumber);
			this._exportWavButton.removeEventListener("click", this._whenExportToWav);
			this._exportMidiButton.removeEventListener("click", this._whenExportToMidi);
			this._exportJsonButton.removeEventListener("click", this._whenExportToJson);
			this._cancelButton.removeEventListener("click", this._close);
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
		
		private _whenExportToWav = (): void => {
			
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
					val = Math.floor(Math.max(-1, Math.min(1, recordedSamples[i * stride])) * ((1 << (bitsPerSample - 1)) - 1));
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
					val = Math.floor(Math.max(-1, Math.min(1, recordedSamples[i * stride])) * 127 + 128);
					for (let k: number = 0; k < repeat; k++) {
						data.setUint8(index, val > 255 ? 255 : (val < 0 ? 0 : val)); index++;
					}
				}
			}
			
			const blob = new Blob([arrayBuffer], {type: "audio/wav"});
			save(blob, this._fileName.value.trim() + ".wav");
			
			this._close();
		}
		
		private _whenExportToMidi = (): void => {
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
			
			function writeUint32(value: number): void {
				value = value >>> 0;
				addBytes(4);
				data.setUint32(writeIndex, value, false);
				writeIndex = fileSize;
			}
			function writeUint24(value: number): void {
				value = value >>> 0;
				addBytes(3);
				data.setUint8(writeIndex  , (value>>16)&0xff);
				data.setUint8(writeIndex+1, (value>> 8)&0xff);
				data.setUint8(writeIndex+2, (value    )&0xff);
				writeIndex = fileSize;
			}
			function writeUint16(value: number): void {
				value = value >>> 0;
				addBytes(2);
				data.setUint16(writeIndex, value, false);
				writeIndex = fileSize;
			}
			function writeUint8(value: number): void {
				value = value >>> 0;
				addBytes(1);
				data.setUint8(writeIndex, value);
				writeIndex = fileSize;
			}
			function writeFlagAnd7Bits(flag: number, value: number): void {
				value = ((value >>> 0) & 0x7f) | ((flag & 0x01) << 7);
				addBytes(1);
				data.setUint8(writeIndex, value);
				writeIndex = fileSize;
			}
			
			function writeVariableLength(value: number): void {
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
			
			function writeAscii(string: string): void {
				writeVariableLength(string.length);
				for (let i: number = 0; i < string.length; i++) {
					const charCode: number = string.charCodeAt(i);
					if (charCode > 0x7f) throw new Error("Trying to write unicode character as ascii.");
					writeUint8(charCode); // technically charCodeAt returns 2 byte values, but this string should contain exclusively 1 byte values.
				}
			}
			
			const song: Song = this._doc.song;
			const ticksPerBeat: number = 96;
			const ticksPerPart: number = ticksPerBeat / Config.partsPerBeat;
			const secondsPerMinute: number = 60;
			const microsecondsPerMinute: number = secondsPerMinute * 1000000;
			const beatsPerMinute: number = song.getBeatsPerMinute();
			const microsecondsPerBeat: number = Math.round(microsecondsPerMinute / beatsPerMinute);
			const secondsPerTick: number = secondsPerMinute / (ticksPerBeat * beatsPerMinute);
			const ticksPerBar: number = ticksPerBeat * song.beatsPerBar;
			
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
			
			const tracks = [{isMeta:  true, channel: -1, midiChannel: -1, isChorus: false, isDrums: false}];
			let midiChannelCounter = 0;
			for (let channel: number = 0; channel < this._doc.song.getChannelCount(); channel++) {
				if (this._doc.song.getChannelIsDrum(channel)) {
					tracks.push({isMeta: false, channel: channel, midiChannel: midiChannelCounter++, isChorus: false, isDrums: true});
					if (midiChannelCounter == 9) midiChannelCounter++; // skip midi drum channel.
				} else {
					tracks.push({isMeta: false, channel: channel, midiChannel: midiChannelCounter++, isChorus: false, isDrums: false});
					if (midiChannelCounter == 9) midiChannelCounter++; // skip midi drum channel.
					tracks.push({isMeta: false, channel: channel, midiChannel: midiChannelCounter++, isChorus:  true, isDrums: false});
					if (midiChannelCounter == 9) midiChannelCounter++; // skip midi drum channel.
				}
			}
			
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
				fileSize += 4; // placeholder for track size
				writeIndex = fileSize;
				
				let prevTime: number = 0;
				let barStartTime: number = 0;
				const writeEventTime = function(time: number): void {
					if (time < prevTime) throw new Error("Midi event time cannot go backwards.");
					writeVariableLength(time - prevTime);
					prevTime = time;
				}
				
				if (isMeta) {
					// for first midi track, include tempo, time signature, and key signature information.
					
					writeEventTime(0);
					writeUint16(0xFF01); // text meta event. 
					writeAscii("http://www.beepbox.co/#" + song.toBase64String());
					
					writeEventTime(0);
					writeUint24(0xFF5103); // tempo meta event. data is 3 bytes.
					writeUint24(microsecondsPerBeat); // Tempo in microseconds per "quarter" note, commonly known as a "beat"
					
					writeEventTime(0);
					writeUint24(0xFF5804); // time signature meta event. data is 4 bytes.
					writeUint8(song.beatsPerBar); // numerator. @TODO: turn 8/4 into 4/4? 
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
					
					if (this._enableOutro.checked) barStartTime += ticksPerBar * (song.barCount - song.loopStart - song.loopLength);
					if (barStartTime != ticksPerBar * unrolledBars.length) throw new Error("Miscalculated number of bars.");
					
				} else {
					// For remaining tracks, set up the instruments and write the notes:
					
					let channelName: string = song.getChannelIsDrum(channel) ? Config.midiDrumChannelNames[channel - song.pitchChannelCount] : Config.midiPitchChannelNames[channel];
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
					//let prevTremolo: number = -1;
					const channelRoot: number = isDrums ? 33 : Config.keyTransposes[song.key];
					const intervalScale: number = isDrums ? Config.drumInterval : 1;
					
					for (const bar of unrolledBars) {
						const pattern: Pattern | null = song.getPattern(channel, bar);
						
						if (pattern != null) {
							
							const nextInstrument: number = pattern.instrument;
							
							const instrument: Instrument = song.channels[channel].instruments[nextInstrument];
							
							if (isChorus && (isDrums || instrument.type == InstrumentType.fm || instrument.chorus == 0)) {
								barStartTime += ticksPerBar;
								continue;
							}
							
							if (prevInstrument != nextInstrument) {
								prevInstrument = nextInstrument;
								
								let description: string = ""; 
								let instrumentProgram: number = 0x51; // default to sawtooth wave. 
								
								description += "type: " + Config.instrumentTypeNames[instrument.type];
								description += ", transition: " + Config.transitionNames[instrument.transition];
								description += ", delay: " + Config.delayNames[instrument.delay];
								description += ", filterCutoff: " + Math.round(Config.filterCutoffMaxHz * Math.pow(2.0, (instrument.filterCutoff - (Config.filterCutoffRange - 1)) * 0.5));
								description += ", filterResonance: " + Math.round(100 * instrument.filterResonance / (Config.filterResonanceRange - 1));
								description += ", filterEnvelope: " + Config.operatorEnvelopeNames[instrument.filterEnvelope];
								
								if (instrument.type == InstrumentType.noise) {
									description += ", noise: " + Config.drumNames[instrument.wave];
									description += ", volume: " + ((5 - instrument.volume) * 20);
									
									instrumentProgram = 0x7E; // seashore, applause
								} else if (instrument.type == InstrumentType.chip) {
									description += ", wave: " + Config.waveNames[instrument.wave];
									description += ", volume: " + ((5 - instrument.volume) * 20);
									description += ", chorus: " + Config.chorusNames[instrument.chorus];
									description += ", effect: " + Config.effectNames[instrument.effect];
									
									const envelopeType: EnvelopeType = Config.operatorEnvelopeType[instrument.filterEnvelope];
									const filterInstruments: number[] = (envelopeType == EnvelopeType.decay || envelopeType == EnvelopeType.pluck)
										? Config.midiDecayInstruments
										: Config.midiSustainInstruments;
									instrumentProgram = filterInstruments[instrument.wave];
								} else if (instrument.type == InstrumentType.fm) {
									description += ", effect: " + Config.effectNames[instrument.effect];
									description += ", algorithm: " + Config.midiAlgorithmNames[instrument.algorithm];
									description += ", feedbackType: " + Config.midiFeedbackNames[instrument.feedbackType];
									description += ", feedbackAmplitude: " + instrument.feedbackAmplitude;
									description += ", feedbackEnvelope: " + Config.operatorEnvelopeNames[instrument.feedbackEnvelope];
									
									for (let i: number = 0; i < Config.operatorCount; i++) {
										const operator: Operator = instrument.operators[i];
										description += ", operator" + (i + 1) + ": {";
										description += "frequency: " + Config.midiFrequencyNames[operator.frequency];
										description += ", amplitude: " + operator.amplitude;
										description += ", envelope: " + Config.operatorEnvelopeNames[operator.envelope];
										description += "}";
									}
									
									// No convenient way to pick an appropriate midi instrument, so just use sawtooth as a default. :/
								} else {
									throw new Error("Unrecognized instrument type.");
								}
								
								writeEventTime(barStartTime);
								writeUint16(0xFF04); // instrument event.
								writeAscii(description);
								
								// Program (instrument) change event:
								writeEventTime(barStartTime);
								writeUint8(0xC0 | midiChannel); // program change event for given channel
								writeFlagAnd7Bits(0, instrumentProgram);
								
								let channelVolume: number = (5 - instrument.volume) / 5;
								if (!isDrums && instrument.type == InstrumentType.fm) channelVolume = 1.0;
								
								writeEventTime(barStartTime);
								writeUint8(0xB0 | midiChannel); // control event for channel volume for given channel
								writeFlagAnd7Bits(0, 0x07); // channel volume controller (most significant bits)
								writeFlagAnd7Bits(0, Math.round(0x7f * channelVolume)); // volume
							}
							
							const effectChoice: number = instrument.effect;
							const effectVibrato: number = Config.effectVibratos[effectChoice];
							const effectTremolo: number = Config.effectTremolos[effectChoice];
							const effectDuration: number = 0.14;
							
							let chorusOffset: number = 0.0;
							let chorusHarmonizes: boolean = false;
							let usesArpeggio: boolean = true;
							//let polyphony: number = 1;
							if (!isDrums) {
								if (instrument.type == InstrumentType.chip) {
									chorusOffset = Config.chorusIntervals[instrument.chorus];
									if (!isChorus) chorusOffset *= -1;
									chorusOffset += Config.chorusOffsets[instrument.chorus];
									
									chorusHarmonizes = Config.chorusHarmonizes[instrument.chorus];
								} else if (instrument.type == InstrumentType.fm) {
									usesArpeggio = false;
									//polyphony = Config.operatorCarrierCounts[instrument.algorithm];
								} else {
									throw new Error("Unrecognized instrument type.");
								}
							}
							
							for (let noteIndex: number = 0; noteIndex < pattern.notes.length; noteIndex++) {
								const note: Note = pattern.notes[noteIndex];
								
								const noteStartTime: number = barStartTime + note.start * ticksPerPart;
								let pinTime: number = noteStartTime;
								let pinVolume: number = note.pins[0].volume;
								let pinInterval: number = note.pins[0].interval;
								let prevPitch: number = channelRoot + note.pitches[0] * intervalScale;
								
								for (let pinIndex: number = 1; pinIndex < note.pins.length; pinIndex++) {
									const nextPinTime: number = noteStartTime + note.pins[pinIndex].time * ticksPerPart;
									const nextPinVolume: number = note.pins[pinIndex].volume;
									const nextPinInterval: number = note.pins[pinIndex].interval;
									
									const length: number = nextPinTime - pinTime;
									for (let tick: number = 0; tick < length; tick++) {
										const tickTime: number = pinTime + tick;
										const linearVolume: number = lerp(pinVolume, nextPinVolume, tick / length);
										const linearInterval: number = lerp(pinInterval, nextPinInterval, tick / length);
										
										let nextPitch: number = note.pitches[0];
										if (usesArpeggio && note.pitches.length > 1) {
											const arpeggio: number = Math.floor(tick / (Config.ticksPerArpeggio[song.rhythm] * ticksPerPart / Config.ticksPerPart));
											if (chorusHarmonizes) {
												if (isChorus) {
													const arpeggioPattern: ReadonlyArray<number> = Config.arpeggioPatterns[song.rhythm][note.pitches.length - 2];
													nextPitch = note.pitches[1 + arpeggioPattern[arpeggio % arpeggioPattern.length]];
												}
											} else {
												const arpeggioPattern: ReadonlyArray<number> = Config.arpeggioPatterns[song.rhythm][note.pitches.length - 1];
												nextPitch = note.pitches[arpeggioPattern[arpeggio % arpeggioPattern.length]];
											}
										}
										
										const interval: number = linearInterval * intervalScale + chorusOffset;
										const wholeInterval: number = Math.round(interval);
										const fractionalInterval: number = interval - wholeInterval;
										
										let pitchOffset: number = fractionalInterval;
										const effectCurve: number = Math.sin(Math.PI * 2.0 * (tickTime - barStartTime) * secondsPerTick / effectDuration);
										if (effectChoice != 2 || tickTime - noteStartTime >= 3 * ticksPerPart) {
											pitchOffset += effectVibrato * effectCurve;
										}
										const pitchBend: number = Math.max(0, Math.min(0x3fff, Math.round(0x2000 + 0x1000 * pitchOffset)));
										
										//const volume: number = Math.pow(linearVolume / 3.0, 1.5);
										const volume: number = linearVolume / 3;
										const tremolo: number = 1.0 + effectTremolo * (effectCurve - 1.0);
										let expression: number = Math.round(0x7f * volume * tremolo);
										
										if (pitchBend != prevPitchBend) {
											writeEventTime(tickTime);
											writeUint8(0xE0 | midiChannel); // pitch bend event
											writeFlagAnd7Bits(0, pitchBend & 0x7f); // least significant bits
											writeFlagAnd7Bits(0, (pitchBend >> 7) & 0x7f); // most significant bits
										}
										
										if (expression != prevExpression) {
											writeEventTime(tickTime);
											writeUint8(0xB0 | midiChannel); // control event for expression for given channel
											writeFlagAnd7Bits(0, 0x0B); // expression controller (most significant bits)
											writeFlagAnd7Bits(0, expression); // pressure, most significant bits
										}
										
										nextPitch = channelRoot + nextPitch * intervalScale + wholeInterval;
										if (tickTime == noteStartTime) {
											writeEventTime(tickTime);
											writeUint8(0x90 | midiChannel); // note on event for given channel
											writeFlagAnd7Bits(0, nextPitch); // pitch
											writeFlagAnd7Bits(0, 0x40); // pressure
										} else if (nextPitch != prevPitch) {
											writeEventTime(tickTime);
											writeUint8(0x90 | midiChannel); // note on event for given channel
											writeFlagAnd7Bits(0, nextPitch); // new pitch
											writeFlagAnd7Bits(0, 0x40); // pressure
											
											writeEventTime(tickTime);
											writeUint8(0x80 | midiChannel); // note off event for given channel
											writeFlagAnd7Bits(0, prevPitch); // old pitch
											writeFlagAnd7Bits(0, 0x40); // pressure
										}
										
										prevPitchBend = pitchBend;
										prevExpression = expression;
										prevPitch = nextPitch;
									}
									
									pinTime = nextPinTime;
									pinVolume = nextPinVolume;
									pinInterval = nextPinInterval;
								}
								
								writeEventTime(barStartTime + note.end * ticksPerPart);
								writeUint8(0x80 | midiChannel); // note off event for given channel
								writeFlagAnd7Bits(0, prevPitch); // pitch
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
			save(blob, this._fileName.value.trim() + ".midi");
			
			this._close();
		}
		
		private _whenExportToJson = (): void => {
			const jsonObject: Object = this._doc.song.toJsonObject(this._enableIntro.checked, Number(this._loopDropDown.value), this._enableOutro.checked);
			const jsonString: string = JSON.stringify(jsonObject, null, '\t');
			const blob = new Blob([jsonString], {type: "application/json"});
			save(blob, this._fileName.value.trim() + ".json");
			this._close();
		}
	}
}
