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
/// <reference path="ArrayBufferWriter.ts" />

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
		} else {
			const url: string = URL.createObjectURL(blob);
			setTimeout(function() { URL.revokeObjectURL(url); }, 60000);
			if (!window.open(url, "_blank")) window.location.href = url;
		}
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
			const song: Song = this._doc.song;
			const midiTicksPerBeepBoxTick: number = 2;
			const midiTicksPerBeat: number = midiTicksPerBeepBoxTick * Config.ticksPerPart * Config.partsPerBeat;
			const midiTicksPerPart: number = midiTicksPerBeepBoxTick * Config.ticksPerPart;
			const secondsPerMinute: number = 60;
			const microsecondsPerMinute: number = secondsPerMinute * 1000000;
			const beatsPerMinute: number = song.getBeatsPerMinute();
			const microsecondsPerBeat: number = Math.round(microsecondsPerMinute / beatsPerMinute);
			const secondsPerMidiTick: number = secondsPerMinute / (midiTicksPerBeat * beatsPerMinute);
			const midiTicksPerBar: number = midiTicksPerBeat * song.beatsPerBar;
			
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
			
			const tracks = [{isMeta:  true, channel: -1, midiChannel: -1, isInterval: false, isDrums: false}];
			let midiChannelCounter = 0;
			for (let channel: number = 0; channel < this._doc.song.getChannelCount(); channel++) {
				tracks.push({isMeta: false, channel: channel, midiChannel: midiChannelCounter++, isInterval: false, isDrums: this._doc.song.getChannelIsDrum(channel)});
				if (midiChannelCounter == 9) midiChannelCounter++; // skip midi drum channel.
			}
			
			const writer: ArrayBufferWriter = new ArrayBufferWriter(1024);
			writer.writeUint32(0x4D546864); // "MThd": Header chunk type
			writer.writeUint32(6); // length of headers is 6 bytes
			writer.writeUint16(1); // file format is 1, meaning multiple simultaneous tracks
			writer.writeUint16(tracks.length);
			writer.writeUint16(midiTicksPerBeat); // number of "ticks" per beat, independent of tempo
			
			for (const track of tracks) {
				writer.writeUint32(0x4D54726B); // "MTrk": Track chunk type
				
				const {isMeta, channel, midiChannel, isDrums} = track;
				
				// We're gonna come back here once we know how many bytes this track is.
				const trackStartIndex: number = writer.getWriteIndex();
				writer.writeUint32(0); // placeholder for track size
				
				let prevTime: number = 0;
				let barStartTime: number = 0;
				const writeEventTime = function(time: number): void {
					if (time < prevTime) throw new Error("Midi event time cannot go backwards.");
					writer.writeMidiVariableLength(time - prevTime);
					prevTime = time;
				}
				
				if (isMeta) {
					// for first midi track, include tempo, time signature, and key signature information.
					
					writeEventTime(0);
					writer.writeUint16(0xFF01); // text meta event. 
					writer.writeMidiAscii("Composed with beepbox.co");
					
					writeEventTime(0);
					writer.writeUint24(0xFF5103); // tempo meta event. data is 3 bytes.
					writer.writeUint24(microsecondsPerBeat); // Tempo in microseconds per "quarter" note, commonly known as a "beat"
					
					writeEventTime(0);
					writer.writeUint24(0xFF5804); // time signature meta event. data is 4 bytes.
					writer.writeUint8(song.beatsPerBar); // numerator.
					writer.writeUint8(2); // denominator exponent in 2^E. 2^2 = 4, and we will always use "quarter" notes.
					writer.writeUint8(24); // MIDI Clocks per metronome tick (should match beats), standard is 24
					writer.writeUint8(8); // number of 1/32 notes per 24 MIDI Clocks, standard is 8, meaning 24 clocks per "quarter" note.
					
					const isMinor: boolean = Config.scaleFlags[song.scale][3] && !Config.scaleFlags[song.scale][4];
					const key: number = 11 - song.key; // convert to scale where C=0, C#=1, counting up to B=11
					let numSharps: number = key; // For even key values in major scale, number of sharps/flats is same...
					if ((key & 1) == 1) numSharps += 6; // For odd key values (consider circle of fifths) rotate around the circle... kinda... Look conventional key signatures are just weird, okay?
					if (isMinor) numSharps += 9; // A minor A scale has zero sharps, shift it appropriately
					while (numSharps > 6) numSharps -= 12; // Range is (modulo 12) - 5. Midi supports -7 to +7, but I only have 12 options.
					
					writeEventTime(0);
					writer.writeUint24(0xFF5902); // Time signature meta event. Data is 2 bytes.
					writer.writeUint8(numSharps); // See above calculation. Assumes scale is diatonic. :/
					writer.writeUint8(isMinor ? 1 : 0); // 0: major, 1: minor
					
					if (this._enableIntro.checked) barStartTime += midiTicksPerBar * song.loopStart;
					writeEventTime(barStartTime);
					writer.writeUint16(0xFF06); // marker meta event. 
					writer.writeMidiAscii("Loop Start");
					
					for (let loopIndex: number = 0; loopIndex < parseInt(this._loopDropDown.value); loopIndex++) {
						barStartTime += midiTicksPerBar * song.loopLength;
						writeEventTime(barStartTime);
						writer.writeUint16(0xFF06); // marker meta event. 
						writer.writeMidiAscii(loopIndex < Number(this._loopDropDown.value) - 1 ? "Loop Repeat" : "Loop End");
					}
					
					if (this._enableOutro.checked) barStartTime += midiTicksPerBar * (song.barCount - song.loopStart - song.loopLength);
					if (barStartTime != midiTicksPerBar * unrolledBars.length) throw new Error("Miscalculated number of bars.");
					
				} else {
					// For remaining tracks, set up the instruments and write the notes:
					
					let channelName: string = song.getChannelIsDrum(channel)
						? Config.midiDrumChannelNames[(channel - song.pitchChannelCount) % Config.midiDrumChannelNames.length]
						: Config.midiPitchChannelNames[channel % Config.midiPitchChannelNames.length];
					writeEventTime(0);
					writer.writeUint16(0xFF03); // track name meta event.
					writer.writeMidiAscii(channelName);
					
					let prevInstrumentIndex: number = -1;
					let prevPitchBend: number = -1;
					let prevExpression: number = -1;
					//let prevTremolo: number = -1;
					const channelRoot: number = isDrums ? 33 : Config.keyTransposes[song.key];
					const intervalScale: number = isDrums ? Config.drumInterval : 1;
					
					for (const bar of unrolledBars) {
						const pattern: Pattern | null = song.getPattern(channel, bar);
						
						if (pattern != null) {
							
							const instrumentIndex: number = pattern.instrument;
							
							const instrument: Instrument = song.channels[channel].instruments[instrumentIndex];
							
							if (prevInstrumentIndex != instrumentIndex) {
								prevInstrumentIndex = instrumentIndex;
								
								writeEventTime(barStartTime);
								writer.writeUint16(0xFF04); // instrument event.
								writer.writeMidiAscii("Instrument " + (instrumentIndex + 1));
								
								let instrumentProgram: number = 0x51; // default to sawtooth wave. 
								if (instrument.type == InstrumentType.noise) {
									instrumentProgram = 0x7E; // seashore, applause
								} else if (instrument.type == InstrumentType.chip) {
									const envelopeType: EnvelopeType = Config.operatorEnvelopeType[instrument.filterEnvelope];
									const filterInstruments: number[] = (envelopeType == EnvelopeType.decay || envelopeType == EnvelopeType.pluck)
										? Config.midiDecayInstruments
										: Config.midiSustainInstruments;
									instrumentProgram = filterInstruments[instrument.wave];
								} else if (instrument.type == InstrumentType.fm) {
									// No convenient way to pick an appropriate midi instrument, so just use sawtooth as a default. :/
								} else {
									throw new Error("Unrecognized instrument type.");
								}
								
								// Program (instrument) change event:
								writeEventTime(barStartTime);
								writer.writeUint8(0xC0 | midiChannel); // program change event for given channel
								writer.writeMidiFlagAnd7Bits(0, instrumentProgram);
								
								let channelVolume: number = (5 - instrument.volume) / 5;
								if (instrument.type == InstrumentType.fm) channelVolume = 1.0;
								
								writeEventTime(barStartTime);
								writer.writeUint8(0xB0 | midiChannel); // control event for channel volume for given channel
								writer.writeMidiFlagAnd7Bits(0, 0x07); // channel volume controller (most significant bits)
								writer.writeMidiFlagAnd7Bits(0, Math.round(0x7f * channelVolume)); // volume
							}
							
							const effectVibrato: number = Config.vibratoAmplitudes[instrument.vibrato];
							
							let chordHarmonizes: boolean = false;
							let usesArpeggio: boolean = true;
							let polyphony: number = 1;
							if (!isDrums) {
								chordHarmonizes = Config.chordHarmonizes[instrument.chord];
								usesArpeggio = Config.chordArpeggiates[instrument.chord];
								if (usesArpeggio) {
									if (chordHarmonizes) {
										if (instrument.type == InstrumentType.chip) {
											polyphony = 2;
										} else if (instrument.type == InstrumentType.fm) {
											polyphony = 4;
										} else {
											throw new Error("Unrecognized instrument type.");
										}
									}
								} else {
									polyphony = 4;
								}
							}
							
							for (let noteIndex: number = 0; noteIndex < pattern.notes.length; noteIndex++) {
								const note: Note = pattern.notes[noteIndex];
								
								const noteStartTime: number = barStartTime + note.start * midiTicksPerPart;
								let pinTime: number = noteStartTime;
								let pinVolume: number = note.pins[0].volume;
								let pinInterval: number = note.pins[0].interval;
								const prevPitches: number[] = [-1, -1, -1, -1];
								const nextPitches: number[] = [-1, -1, -1, -1];
								const toneCount: number = Math.min(polyphony, note.pitches.length);
								
								for (let pinIndex: number = 1; pinIndex < note.pins.length; pinIndex++) {
									const nextPinTime: number = noteStartTime + note.pins[pinIndex].time * midiTicksPerPart;
									const nextPinVolume: number = note.pins[pinIndex].volume;
									const nextPinInterval: number = note.pins[pinIndex].interval;
									
									const length: number = nextPinTime - pinTime;
									for (let midiTick: number = 0; midiTick < length; midiTick++) {
										const midiTickTime: number = pinTime + midiTick;
										const linearVolume: number = lerp(pinVolume, nextPinVolume, midiTick / length);
										const linearInterval: number = lerp(pinInterval, nextPinInterval, midiTick / length);
										
										const interval: number = linearInterval * intervalScale;
										const wholeInterval: number = Math.round(interval);
										const fractionalInterval: number = interval - wholeInterval;
										
										let pitchOffset: number = fractionalInterval;
										
										const effectCurve: number = Synth.getLFOAmplitude(instrument, (midiTickTime - barStartTime) * secondsPerMidiTick);
										if (midiTickTime - noteStartTime >= midiTicksPerPart * Config.vibratoDelays[instrument.vibrato]) {
											pitchOffset += effectVibrato * effectCurve;
										}
										const pitchBend: number = Math.max(0, Math.min(0x3fff, Math.round(0x2000 + 0x1000 * pitchOffset)));
										
										const volume: number = linearVolume / 3;
										let expression: number = Math.round(0x7f * volume);
										
										if (pitchBend != prevPitchBend) {
											writeEventTime(midiTickTime);
											writer.writeUint8(0xE0 | midiChannel); // pitch bend event
											writer.writeMidiFlagAnd7Bits(0, pitchBend & 0x7f); // least significant bits
											writer.writeMidiFlagAnd7Bits(0, (pitchBend >> 7) & 0x7f); // most significant bits
											prevPitchBend = pitchBend;
										}
										
										if (expression != prevExpression) {
											writeEventTime(midiTickTime);
											writer.writeUint8(0xB0 | midiChannel); // control event for expression for given channel
											writer.writeMidiFlagAnd7Bits(0, 0x0B); // expression controller (most significant bits)
											writer.writeMidiFlagAnd7Bits(0, expression); // pressure, most significant bits
											prevExpression = expression;
										}
										
										const noteStarting: boolean = midiTickTime == noteStartTime;
										for (let toneIndex: number = 0; toneIndex < toneCount; toneIndex++) {
											let nextPitch: number = note.pitches[toneIndex];
											if (usesArpeggio && note.pitches.length > toneIndex + 1 && toneIndex == toneCount - 1) {
												const midiTicksSinceBeat = (midiTickTime - barStartTime) % midiTicksPerBeat;
												const midiTicksPerArpeggio = Config.ticksPerArpeggio[song.rhythm] * midiTicksPerPart / Config.ticksPerPart;
												const arpeggio: number = Math.floor(midiTicksSinceBeat / midiTicksPerArpeggio);
												const arpeggioPattern: ReadonlyArray<number> = Config.arpeggioPatterns[song.rhythm][note.pitches.length - 1 - toneIndex];
												nextPitch = note.pitches[toneIndex + arpeggioPattern[arpeggio % arpeggioPattern.length]];
											}
											nextPitch = channelRoot + nextPitch * intervalScale + wholeInterval;
											nextPitches[toneIndex] = nextPitch;
											
											if (!noteStarting && prevPitches[toneIndex] != nextPitches[toneIndex]) {
												writeEventTime(midiTickTime);
												writer.writeUint8(0x80 | midiChannel); // note off event for given channel
												writer.writeMidiFlagAnd7Bits(0, prevPitches[toneIndex]); // old pitch
												writer.writeMidiFlagAnd7Bits(0, 0x60); // pressure
											}
										}

										for (let toneIndex: number = 0; toneIndex < toneCount; toneIndex++) {
											if (noteStarting || prevPitches[toneIndex] != nextPitches[toneIndex]) {
												writeEventTime(midiTickTime);
												writer.writeUint8(0x90 | midiChannel); // note on event for given channel
												writer.writeMidiFlagAnd7Bits(0, nextPitches[toneIndex]); // new pitch
												writer.writeMidiFlagAnd7Bits(0, 0x60); // pressure
												prevPitches[toneIndex] = nextPitches[toneIndex];
											}
										}
									}
									
									pinTime = nextPinTime;
									pinVolume = nextPinVolume;
									pinInterval = nextPinInterval;
								}

								const noteEndTime: number = barStartTime + note.end * midiTicksPerPart;
								
								// End all tones.
								for (let toneIndex: number = 0; toneIndex < toneCount; toneIndex++) {
									writeEventTime(noteEndTime);
									writer.writeUint8(0x80 | midiChannel); // note off event for given channel
									writer.writeMidiFlagAnd7Bits(0, prevPitches[toneIndex]); // pitch
									writer.writeMidiFlagAnd7Bits(0, 0x40); // pressure
								}
							}
						} else {
							// Reset pitch bend
							writeEventTime(barStartTime);
							writer.writeUint8(0xE0 | midiChannel); // pitch bend event
							writer.writeMidiFlagAnd7Bits(0, 0x2000 & 0x7f); // least significant bits
							writer.writeMidiFlagAnd7Bits(0, (0x2000 >> 7) & 0x7f); // most significant bits
							
							// Reset expression
							writeEventTime(barStartTime);
							writer.writeUint8(0xB0 | midiChannel); // control event for expression for given channel
							writer.writeMidiFlagAnd7Bits(0, 0x0B); // expression controller (most significant bits)
							writer.writeMidiFlagAnd7Bits(0, 0x7f); // pressure, most significant bits
						}
						
						barStartTime += midiTicksPerBar;
					}
				}
				
				writeEventTime(barStartTime);
				writer.writeUint24(0xFF2F00); // end of track
				
				// Finally, write the length of the track in bytes at the front of the track.
				writer.rewriteUint32(trackStartIndex, writer.getWriteIndex() - trackStartIndex - 4);
			}
			
			const blob = new Blob([writer.toCompactArrayBuffer()], {type: "audio/midi"});
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
