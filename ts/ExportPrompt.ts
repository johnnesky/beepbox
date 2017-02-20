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
	const {button, div, input, text} = html;
	
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
	export interface ExportPrompt {
	}

	export function ExportPrompt(doc: SongDocument, songEditor: SongEditor): void {
		const enableIntro: HTMLInputElement = input({type: "checkbox"});
		const loopDropDown: HTMLInputElement = input({style:"width: 40px; height: 16px;", type: "number", min: "1", max: "4", step: "1"});
		const enableOutro: HTMLInputElement = input({type: "checkbox"});
		const exportWavButton: HTMLButtonElement = button({style: "width:200px;", type: "button"}, [text("Export to .wav")]);
		const exportMidiButton: HTMLButtonElement = button({style: "width:200px;", type: "button"}, [text("Export to .midi")]);
		const exportCancelButton: HTMLButtonElement = button({style: "width:200px;", type: "button"}, [text("Cancel")]);
		
		const container: HTMLDivElement = div({style: "position: absolute;"}, [
			div({style: "display: table-cell; vertical-align: middle; width: 700px; height: 645px;"}, [
				div({style: "margin: auto; text-align: center; background: #000000; width: 200px; border-radius: 15px; border: 4px solid #444444; color: #ffffff; font-size: 12px; padding: 20px;"}, [
					div({style: "font-size: 30px"}, [text("Export Options")]),
					div({style: "height: 30px;"}),
					div({style: "display: table; width: 200px;"}, [
						div({style: "display: table-row;"}, [
							div({style: "display: table-cell;"}, [text("Intro:")]),
							div({style: "display: table-cell;"}, [text("Loop Count:")]),
							div({style: "display: table-cell;"}, [text("Outro:")]),
						]),
						div({style: "display: table-row; height: 30px;"}, [
							div({style: "display: table-cell; vertical-align: middle;"}, [enableIntro]),
							div({style: "display: table-cell; vertical-align: middle;"}, [loopDropDown]),
							div({style: "display: table-cell; vertical-align: middle;"}, [enableOutro]),
						]),
					]),
					div({style: "height: 20px;"}),
					exportWavButton,
					div({style: "height: 20px;"}),
					exportMidiButton,
					div({style: "height: 20px;"}),
					exportCancelButton,
				]),
			]),
		]);
		
		beepboxEditorContainer.children[0].appendChild(container);
		
		function onClose(): void { 
			beepboxEditorContainer.children[0].removeChild(container);
			songEditor.closePrompt();
			loopDropDown.removeEventListener("keypress", validateKey);
			loopDropDown.removeEventListener("blur", validateNumber);
			exportWavButton.removeEventListener("click", onExportToWav);
			exportMidiButton.removeEventListener("click", onExportToMidi);
			exportCancelButton.removeEventListener("click", onClose);
		}
		
		function validateKey(event: KeyboardEvent): boolean {
			const charCode = (event.which) ? event.which : event.keyCode;
			if (charCode != 46 && charCode > 31 && (charCode < 48 || charCode > 57)) {
				event.preventDefault();
				return true;
			}
			return false;
		}
		
		function validateNumber(event: Event): void {
			const input: HTMLInputElement = <HTMLInputElement>event.target;
			input.value = Math.floor(Math.max(Number(input.min), Math.min(Number(input.max), Number(input.value)))) + "";
		}
		
		function onExportToWav(): void {
			
			const synth: Synth = new Synth(doc.song)
			synth.enableIntro = enableIntro.checked;
			synth.enableOutro = enableOutro.checked;
			synth.loopCount = Number(loopDropDown.value);
			if (!synth.enableIntro) {
				for (let introIter: number = 0; introIter < doc.song.loopStart; introIter++) {
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
			saveAs(blob, "song.wav");
			
			onClose();
		}
		
		function onExportToMidi(): void {
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
			
			/*
			function writeUnicode(string): void {
				if (TextEncoder) {
					const stringBytes: Uint8Array = new TextEncoder().encode(string);
					writeVariableLength(stringBytes.length);
					for (let i = 0; i < stringBytes.length; i++) {
						writeUint8(stringBytes[i]);
					}
				} else {
					writeVariableLength(2 + 2 * string.length);
					writeUint16(0xFEFF); // unicode 16 byte order mark to indicate endianness. (it'll be big endian.)
					for (let i = 0; i < string.length; i++) {
						writeUint16(string.charCodeAt(i));
					}
				}
			}
			*/
			
			const ticksPerBeat: number = 96;
			const ticksPerPart: number = ticksPerBeat / doc.song.parts;
			const ticksPerArpeggio: number = ticksPerPart / 4;
			const secondsPerMinute: number = 60;
			const microsecondsPerMinute: number = secondsPerMinute * 1000000;
			const beatsPerMinute: number = doc.song.getBeatsPerMinute();
			const microsecondsPerBeat: number = Math.round(microsecondsPerMinute / beatsPerMinute);
			const secondsPerTick: number = secondsPerMinute / (ticksPerBeat * beatsPerMinute);
			const ticksPerBar: number = ticksPerBeat * doc.song.beats;
			
			const unrolledBars: number[] = [];
			if (enableIntro.checked) {
				for (let bar: number = 0; bar < doc.song.loopStart; bar++) {
					unrolledBars.push(bar);
				}
			}
			for (let loopIndex: number = 0; loopIndex < Number(loopDropDown.value); loopIndex++) {
				for (let bar: number = doc.song.loopStart; bar < doc.song.loopStart + doc.song.loopLength; bar++) {
					unrolledBars.push(bar);
				}
			}
			if (enableOutro.checked) {
				for (let bar: number = doc.song.loopStart + doc.song.loopLength; bar < doc.song.bars; bar++) {
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
					writeAscii("http://www.beepbox.co/" + doc.song.toString());
					
					writeEventTime(0);
					writeUint24(0xFF5103); // tempo meta event. data is 3 bytes.
					writeUint24(microsecondsPerBeat); // Tempo in microseconds per "quarter" note, commonly known as a "beat"
					
					writeEventTime(0);
					writeUint24(0xFF5804); // time signature meta event. data is 4 bytes.
					writeUint8(doc.song.beats); // numerator. @TODO: turn 8/4 into 4/4? 
					writeUint8(2); // denominator exponent in 2^E. 2^2 = 4, and we will always use "quarter" notes.
					writeUint8(24); // MIDI Clocks per metronome tick (should match beats), standard is 24
					writeUint8(8); // number of 1/32 notes per 24 MIDI Clocks, standard is 8, meaning 24 clocks per "quarter" note.
					
					const isMinor: boolean = (doc.song.scale < 10) && ((doc.song.scale & 1) == 1);
					const key: number = 11 - doc.song.key; // convert to scale where C=0, C#=1, counting up to B=11
					let numSharps: number = key; // For even key values in major scale, number of sharps/flats is same...
					if ((key & 1) == 1) numSharps += 6; // For odd key values (consider circle of fifths) rotate around the circle... kinda... Look conventional key signatures are just weird, okay?
					if (isMinor) numSharps += 9; // A minor A scale has zero sharps, shift it appropriately
					while (numSharps > 6) numSharps -= 12; // Range is (modulo 12) - 5. Midi supports -7 to +7, but I only have 12 options.
					
					writeEventTime(0);
					writeUint24(0xFF5902); // time signature meta event. data is 2 bytes.
					writeUint8(numSharps); // see above calculation. or don't, it doesn't actually make sense anyway. This is a really lame way to define key signature IMHO.
					writeUint8(isMinor ? 1 : 0); // 0: major, 1: minor
					
					if (enableIntro.checked) barStartTime += ticksPerBar * doc.song.loopStart;
					writeEventTime(barStartTime);
					writeUint16(0xFF06); // marker meta event. 
					writeAscii("Loop Start");
					
					for (let loopIndex: number = 0; loopIndex < Number(loopDropDown.value); loopIndex++) {
						barStartTime += ticksPerBar * doc.song.loopLength;
						writeEventTime(barStartTime);
						writeUint16(0xFF06); // marker meta event. 
						writeAscii(loopIndex < Number(loopDropDown.value) - 1 ? "Loop Repeat" : "Loop End");
					}
					
					if (enableOutro.checked) barStartTime += ticksPerBar * (doc.song.bars - doc.song.loopStart - doc.song.loopLength);
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
					const channelRoot: number = isDrums ? 33 : Music.keyTransposes[doc.song.key];
					const intervalScale: number = isDrums ? Music.drumInterval : 1; ///@TODO: What is an appropriate set of "pitches" for drums?
					
					for (const bar of unrolledBars) {
						const pattern: BarPattern | null = doc.song.getPattern(channel, bar);
						
						if (pattern != null) {
							
							const nextInstrument: number = pattern.instrument;
							
							if (isChorus && doc.song.instrumentChorus[channel][nextInstrument] == 0) {
								barStartTime += ticksPerBar;
								continue;
							}
							
							if (prevInstrument != nextInstrument) {
								prevInstrument = nextInstrument;
								
								writeEventTime(barStartTime);
								writeUint16(0xFF04); // instrument event. 
								if (isDrums) {
									let description = "noise: " + Music.drumNames[doc.song.instrumentWaves[channel][nextInstrument]];
									description += ", volume: " + Music.volumeNames[doc.song.instrumentVolumes[channel][nextInstrument]];
									description += ", envelope: " + Music.attackNames[doc.song.instrumentAttacks[channel][nextInstrument]];
									writeAscii(description);
									
									// Program (instrument) change event:
									writeEventTime(barStartTime);
									writeUint8(0xC0 | midiChannel); // program change event for given channel
									writeFlagAnd7Bits(0, 0x7E); // seashore, applause
								} else {
									let description = "wave: " + Music.waveNames[doc.song.instrumentWaves[channel][nextInstrument]];
									description += ", volume: " + Music.volumeNames[doc.song.instrumentVolumes[channel][nextInstrument]];
									description += ", envelope: " + Music.attackNames[doc.song.instrumentAttacks[channel][nextInstrument]];
									description += ", filter: " + Music.filterNames[doc.song.instrumentFilters[channel][nextInstrument]];
									description += ", chorus: " + Music.chorusNames[doc.song.instrumentChorus[channel][nextInstrument]];
									description += ", effect: " + Music.effectNames[doc.song.instrumentEffects[channel][nextInstrument]];
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
									
									const filterInstruments: number[] = doc.song.instrumentFilters[channel][nextInstrument] < 3 ? sustainInstruments : decayInstruments;
									
									// Program (instrument) change event:
									writeEventTime(barStartTime);
									writeUint8(0xC0 | midiChannel); // program change event for given channel
									writeFlagAnd7Bits(0, filterInstruments[doc.song.instrumentWaves[channel][nextInstrument]]); // instrument program
								}
								
								const instrumentVolumeChoice: number = doc.song.instrumentVolumes[channel][nextInstrument];
								//const channelVolume: number = (instrumentVolumeChoice == 5 ? 0 : Math.pow(2, -instrumentVolumeChoice));
								const channelVolume: number = (5 - instrumentVolumeChoice) / 5;
								writeEventTime(barStartTime);
								writeUint8(0xB0 | midiChannel); // control event for channel volume for given channel
								writeFlagAnd7Bits(0, 0x07); // channel volume controller (most significant bits)
								writeFlagAnd7Bits(0, Math.round(0x7f * channelVolume)); // volume
							}
							
							const effectChoice: number = doc.song.instrumentEffects[channel][nextInstrument];
							const effectVibrato: number = Music.effectVibratos[effectChoice];
							const effectTremelo: number = Music.effectTremelos[effectChoice];
							const effectDuration: number = 0.14;
							
							let chorusOffset: number = Music.chorusValues[doc.song.instrumentChorus[channel][nextInstrument]];
							if (!isChorus) chorusOffset *= -1;
							chorusOffset += Music.chorusOffsets[doc.song.instrumentChorus[channel][nextInstrument]];
							
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
			saveAs(blob, "song.midi");
			
			onClose();
		}
		
		loopDropDown.value = "1";
		
		if (doc.song.loopStart == 0) {
			enableIntro.checked = false;
			enableIntro.disabled = true;
		} else {
			enableIntro.checked = true;
			enableIntro.disabled = false;
		}
		if (doc.song.loopStart + doc.song.loopLength == doc.song.bars) {
			enableOutro.checked = false;
			enableOutro.disabled = true;
		} else {
			enableOutro.checked = true;
			enableOutro.disabled = false;
		}
		
		loopDropDown.addEventListener("keypress", validateKey);
		loopDropDown.addEventListener("blur", validateNumber);
		exportWavButton.addEventListener("click", onExportToWav);
		exportMidiButton.addEventListener("click", onExportToMidi);
		exportCancelButton.addEventListener("click", onClose);
		
		container.style.display = "block";
	}
}

/*! @source https://github.com/eligrey/FileSaver.js/blob/master/FileSaver.min.js */
var saveAs=saveAs||function(e){"use strict";if(typeof e==="undefined"||typeof navigator!=="undefined"&&/MSIE [1-9]\./.test(navigator.userAgent)){return}let t=e.document,n=function(){return e.URL||e.webkitURL||e},r=t.createElementNS("http://www.w3.org/1999/xhtml","a"),o="download"in r,i=function(e){let t=new MouseEvent("click");e.dispatchEvent(t)},a=/constructor/i.test(e.HTMLElement),f=/CriOS\/[\d]+/.test(navigator.userAgent),u=function(t){(e.setImmediate||e.setTimeout)(function(){throw t},0)},d="application/octet-stream",s=1e3*40,c=function(e){let t=function(){if(typeof e==="string"){n().revokeObjectURL(e)}else{e.remove()}};setTimeout(t,s)},l=function(e,t,n){t=[].concat(t);let r=t.length;while(r--){let o=e["on"+t[r]];if(typeof o==="function"){try{o.call(e,n||e)}catch(i){u(i)}}}},p=function(e){if(/^\s*(?:text\/\S*|application\/xml|\S*\/\S*\+xml)\s*;.*charset\s*=\s*utf-8/i.test(e.type)){return new Blob([String.fromCharCode(65279),e],{type:e.type})}return e},v=function(t,u,s){if(!s){t=p(t)}let v=this,w=t.type,m=w===d,y,h=function(){l(v,"writestart progress write writeend".split(" "))},S=function(){if((f||m&&a)&&e.FileReader){let r=new FileReader;r.onloadend=function(){let t=f?r.result:r.result.replace(/^data:[^;]*;/,"data:attachment/file;");let n=e.open(t,"_blank");if(!n)e.location.href=t;t=undefined;v.readyState=v.DONE;h()};r.readAsDataURL(t);v.readyState=v.INIT;return}if(!y){y=n().createObjectURL(t)}if(m){e.location.href=y}else{let o=e.open(y,"_blank");if(!o){e.location.href=y}}v.readyState=v.DONE;h();c(y)};v.readyState=v.INIT;if(o){y=n().createObjectURL(t);setTimeout(function(){r.href=y;r.download=u;i(r);h();c(y);v.readyState=v.DONE});return}S()},w=v.prototype,m=function(e,t,n){return new v(e,t||e.name||"download",n)};if(typeof navigator!=="undefined"&&navigator.msSaveOrOpenBlob){return function(e,t,n){t=t||e.name||"download";if(!n){e=p(e)}return navigator.msSaveOrOpenBlob(e,t)}}w.abort=function(){};w.readyState=w.INIT=0;w.WRITING=1;w.DONE=2;w.error=w.onwritestart=w.onprogress=w.onwrite=w.onabort=w.onerror=w.onwriteend=null;return m}(typeof self!=="undefined"&&self||typeof window!=="undefined"&&window||this.content);if(typeof module!=="undefined"&&module.exports){module.exports.saveAs=saveAs}else if(typeof define!=="undefined"&&define!==null&&define.amd!==null){define([],function(){return saveAs})}
