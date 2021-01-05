// Copyright (C) 2020 John Nesky, distributed under the MIT license.

import { InstrumentType, Config } from "../synth/SynthConfig";
import { NotePin, Note, makeNotePin, Pattern, Instrument, Channel, Song, Synth } from "../synth/synth";
import { Preset, EditorConfig } from "./EditorConfig";
import { SongDocument } from "./SongDocument";
import { Prompt } from "./Prompt";
import { HTML } from "imperative-html/dist/esm/elements-strict";
import { ChangeGroup } from "./Change";
import { removeDuplicatePatterns, ChangeSong, ChangeReplacePatterns } from "./changes";
import { AnalogousDrum, analogousDrumMap, MidiChunkType, MidiFileFormat, MidiEventType, MidiControlEventMessage, MidiMetaEventMessage, MidiRegisteredParameterNumberMSB, MidiRegisteredParameterNumberLSB, midiVolumeToVolumeMult, midiExpressionToVolumeMult } from "./Midi";
import { ArrayBufferReader } from "./ArrayBufferReader";

//namespace beepbox {
const { button, p, div, h2, input } = HTML;

export class ImportPrompt implements Prompt {
	private readonly _fileInput: HTMLInputElement = input({ type: "file", accept: ".json,application/json,.mid,.midi,audio/midi,audio/x-midi" });
	private readonly _cancelButton: HTMLButtonElement = button({ class: "cancelButton" });

	public readonly container: HTMLDivElement = div({ class: "prompt noSelection", style: "width: 300px;" },
		h2("Import"),
		p({ style: "text-align: left; margin: 0.5em 0;" },
			"BeepBox songs can be exported and re-imported as .json files. You could also use other means to make .json files for BeepBox as long as they follow the same structure.",
		),
		p({ style: "text-align: left; margin: 0.5em 0;" },
			"BeepBox can also (crudely) import .mid files. There are many tools available for creating .mid files. Shorter and simpler songs are more likely to work well.",
		),
		this._fileInput,
		this._cancelButton,
	);

	constructor(private _doc: SongDocument) {
		this._fileInput.select();
		setTimeout(() => this._fileInput.focus());

		this._fileInput.addEventListener("change", this._whenFileSelected);
		this._cancelButton.addEventListener("click", this._close);
	}

	private _close = (): void => {
		this._doc.undo();
	}

	public cleanUp = (): void => {
		this._fileInput.removeEventListener("change", this._whenFileSelected);
		this._cancelButton.removeEventListener("click", this._close);
	}

	private _whenFileSelected = (): void => {
		const file: File = this._fileInput.files![0];
		if (!file) return;

		const extension: string = file.name.slice((file.name.lastIndexOf(".") - 1 >>> 0) + 2);
		if (extension == "json") {
			const reader: FileReader = new FileReader();
			reader.addEventListener("load", (event: Event): void => {
				this._doc.prompt = null;
				this._doc.goBackToStart();
				this._doc.record(new ChangeSong(this._doc, <string>reader.result), true, true);
			});
			reader.readAsText(file);
		} else if (extension == "midi" || extension == "mid") {
			const reader: FileReader = new FileReader();
			reader.addEventListener("load", (event: Event): void => {
				this._doc.prompt = null;
				this._doc.goBackToStart();
				this._parseMidiFile(<ArrayBuffer>reader.result);
			});
			reader.readAsArrayBuffer(file);
		} else {
			console.error("Unrecognized file extension.");
			this._close();
		}
	}

	private _parseMidiFile(buffer: ArrayBuffer): void {

		// First, split the file into separate buffer readers for each chunk. There should be one header chunk and one or more track chunks.
		const reader = new ArrayBufferReader(new DataView(buffer));
		let headerReader: ArrayBufferReader | null = null;
		interface Track {
			reader: ArrayBufferReader;
			nextEventMidiTick: number;
			ended: boolean;
			runningStatus: number;
		}
		const tracks: Track[] = [];
		while (reader.hasMore()) {
			const chunkType: number = reader.readUint32();
			const chunkLength: number = reader.readUint32();
			if (chunkType == MidiChunkType.header) {
				if (headerReader == null) {
					headerReader = reader.getReaderForNextBytes(chunkLength);
				} else {
					console.error("This MIDI file has more than one header chunk.");
				}
			} else if (chunkType == MidiChunkType.track) {
				const trackReader: ArrayBufferReader = reader.getReaderForNextBytes(chunkLength);
				if (trackReader.hasMore()) {
					tracks.push({
						reader: trackReader,
						nextEventMidiTick: trackReader.readMidiVariableLength(),
						ended: false,
						runningStatus: -1,
					});
				}
			} else {
				// Unknown chunk type. Skip it.
				reader.skipBytes(chunkLength);
			}
		}

		if (headerReader == null) {
			console.error("No header chunk found in this MIDI file.");
			this._close();
			return;
		}
		const fileFormat: number = headerReader.readUint16();
			/*const trackCount: number =*/ headerReader.readUint16();
		const midiTicksPerBeat: number = headerReader.readUint16();

		// Midi tracks are generally intended to be played in parallel, but in the format
		// MidiFileFormat.independentTracks, they are played in sequence. Make a list of all
		// of the track indices that should be played in parallel (one or all of the tracks).
		let currentIndependentTrackIndex: number = 0;
		const currentTrackIndices: number[] = [];
		const independentTracks: boolean = (fileFormat == MidiFileFormat.independentTracks);
		if (independentTracks) {
			currentTrackIndices.push(currentIndependentTrackIndex);
		} else {
			for (let trackIndex: number = 0; trackIndex < tracks.length; trackIndex++) {
				currentTrackIndices.push(trackIndex);
			}
		}

		interface NoteEvent {
			midiTick: number;
			pitch: number;
			velocity: number;
			program: number;
			instrumentVolume: number;
			instrumentPan: number;
			on: boolean;
		}
		interface PitchBendEvent {
			midiTick: number;
			interval: number;
		}
		interface ExpressionEvent {
			midiTick: number;
			volume: number;
		}

		// To read a MIDI file we have to simulate state changing over time.
		// Keep a record of various parameters for each channel that may
		// change over time, initialized to default values.
		// Consider making a MidiChannel class and single array of midiChannels.
		const channelRPNMSB: number[] = [0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff];
		const channelRPNLSB: number[] = [0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff];
		const pitchBendRangeMSB: number[] = [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2]; // pitch bend range defaults to 2 semitones.
		const pitchBendRangeLSB: number[] = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]; // and 0 cents.
		const currentInstrumentProgram: number[] = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
		const currentInstrumentVolumes: number[] = [100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100];
		const currentInstrumentPans: number[] = [64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64];
		const noteEvents: NoteEvent[][] = [[], [], [], [], [], [], [], [], [], [], [], [], [], [], [], []];
		const pitchBendEvents: PitchBendEvent[][] = [[], [], [], [], [], [], [], [], [], [], [], [], [], [], [], []];
		const expressionEvents: ExpressionEvent[][] = [[], [], [], [], [], [], [], [], [], [], [], [], [], [], [], []];
		let microsecondsPerBeat: number = 500000; // Tempo in microseconds per "quarter" note, commonly known as a "beat", default is equivalent to 120 beats per minute.
		let beatsPerBar: number = 8;
		let numSharps: number = 0;
		let isMinor: boolean = false;

		// Progress in time through all tracks (in parallel or in sequence) recording state changes and events until all tracks have ended.
		let currentMidiTick: number = 0;
		while (true) {
			let nextEventMidiTick: number = Number.MAX_VALUE;
			let anyTrackHasMore: boolean = false;
			for (const trackIndex of currentTrackIndices) {

				// Parse any events in this track that occur at the currentMidiTick.
				const track: Track = tracks[trackIndex];
				while (!track.ended && track.nextEventMidiTick == currentMidiTick) {

					// If the most significant bit is set in the first byte
					// of the event, it's a new event status, otherwise
					// reuse the running status and save the next byte for
					// the content of the event. I'm assuming running status
					// is separate for each track.
					const peakStatus: number = track.reader.peakUint8();
					const eventStatus: number = (peakStatus & 0x80) ? track.reader.readUint8() : track.runningStatus;
					const eventType: number = eventStatus & 0xF0;
					const eventChannel: number = eventStatus & 0x0F;
					if (eventType != MidiEventType.metaAndSysex) {
						track.runningStatus = eventStatus;
					}

					let foundTrackEndEvent: boolean = false;

					switch (eventType) {
						case MidiEventType.noteOff: {
							const pitch: number = track.reader.readMidi7Bits();
								/*const velocity: number =*/ track.reader.readMidi7Bits();
							noteEvents[eventChannel].push({ midiTick: currentMidiTick, pitch: pitch, velocity: 0.0, program: -1, instrumentVolume: -1, instrumentPan: -1, on: false });
						} break;
						case MidiEventType.noteOn: {
							const pitch: number = track.reader.readMidi7Bits();
							const velocity: number = track.reader.readMidi7Bits();
							if (velocity == 0) {
								noteEvents[eventChannel].push({ midiTick: currentMidiTick, pitch: pitch, velocity: 0.0, program: -1, instrumentVolume: -1, instrumentPan: -1, on: false });
							} else {
								const volume: number = Math.max(0, Math.min(Config.volumeRange - 1, Math.round(
									Synth.volumeMultToInstrumentVolume(midiVolumeToVolumeMult(currentInstrumentVolumes[eventChannel]))
								)));
								const pan: number = Math.max(0, Math.min(Config.panMax, Math.round(
									((currentInstrumentPans[eventChannel] - 64) / 63 + 1) * Config.panCenter
								)));
								noteEvents[eventChannel].push({
									midiTick: currentMidiTick,
									pitch: pitch,
									velocity: Math.max(0.0, Math.min(1.0, (velocity + 14) / 90.0)),
									program: currentInstrumentProgram[eventChannel],
									instrumentVolume: volume,
									instrumentPan: pan,
									on: true,
								});
							}
						} break;
						case MidiEventType.keyPressure: {
								/*const pitch: number =*/ track.reader.readMidi7Bits();
								/*const pressure: number =*/ track.reader.readMidi7Bits();
						} break;
						case MidiEventType.controlChange: {
							const message: number = track.reader.readMidi7Bits();
							const value: number = track.reader.readMidi7Bits();
							//console.log("Control change, message:", message, "value:", value);

							switch (message) {
								case MidiControlEventMessage.setParameterMSB: {
									if (channelRPNMSB[eventChannel] == MidiRegisteredParameterNumberMSB.pitchBendRange && channelRPNLSB[eventChannel] == MidiRegisteredParameterNumberLSB.pitchBendRange) {
										pitchBendRangeMSB[eventChannel] = value;
									}
								} break;
								case MidiControlEventMessage.volumeMSB: {
									currentInstrumentVolumes[eventChannel] = value;
								} break;
								case MidiControlEventMessage.panMSB: {
									currentInstrumentPans[eventChannel] = value;
								} break;
								case MidiControlEventMessage.expressionMSB: {
									expressionEvents[eventChannel].push({ midiTick: currentMidiTick, volume: Synth.volumeMultToExpression(midiExpressionToVolumeMult(value)) });
								} break;
								case MidiControlEventMessage.setParameterLSB: {
									if (channelRPNMSB[eventChannel] == MidiRegisteredParameterNumberMSB.pitchBendRange && channelRPNLSB[eventChannel] == MidiRegisteredParameterNumberLSB.pitchBendRange) {
										pitchBendRangeLSB[eventChannel] = value;
									}
								} break;
								case MidiControlEventMessage.registeredParameterNumberLSB: {
									channelRPNLSB[eventChannel] = value;
								} break;
								case MidiControlEventMessage.registeredParameterNumberMSB: {
									channelRPNMSB[eventChannel] = value;
								} break;
							}
						} break;
						case MidiEventType.programChange: {
							const program: number = track.reader.readMidi7Bits();
							currentInstrumentProgram[eventChannel] = program;
						} break;
						case MidiEventType.channelPressure: {
								/*const pressure: number =*/ track.reader.readMidi7Bits();
						} break;
						case MidiEventType.pitchBend: {
							const lsb: number = track.reader.readMidi7Bits();
							const msb: number = track.reader.readMidi7Bits();

							const pitchBend: number = (((msb << 7) | lsb) / 0x2000) - 1.0;
							const pitchBendRange: number = pitchBendRangeMSB[eventChannel] + pitchBendRangeLSB[eventChannel] * 0.01;
							const interval: number = pitchBend * pitchBendRange;

							pitchBendEvents[eventChannel].push({ midiTick: currentMidiTick, interval: interval });
						} break;
						case MidiEventType.metaAndSysex: {
							if (eventStatus == MidiEventType.meta) {
								const message: number = track.reader.readMidi7Bits();
								const length: number = track.reader.readMidiVariableLength();
								//console.log("Meta, message:", message, "length:", length);

								if (message == MidiMetaEventMessage.endOfTrack) {
									foundTrackEndEvent = true;
									track.reader.skipBytes(length);
								} else if (message == MidiMetaEventMessage.tempo) {
									microsecondsPerBeat = track.reader.readUint24();
									track.reader.skipBytes(length - 3);
								} else if (message == MidiMetaEventMessage.timeSignature) {
									const numerator: number = track.reader.readUint8();
									let denominatorExponent: number = track.reader.readUint8();
										/*const midiClocksPerMetronome: number =*/ track.reader.readUint8();
										/*const thirtySecondNotesPer24MidiClocks: number =*/ track.reader.readUint8();
									track.reader.skipBytes(length - 4);

									// A beat is a quarter note. 
									// A ratio of 4/4, or 1/1, corresponds to 4 beats per bar.
									// Apply the numerator first.
									beatsPerBar = numerator * 4;
									// Then apply the denominator, dividing by two until either
									// the denominator is satisfied or there's an odd number of
									// beats. BeepBox doesn't support fractional beats in a bar.
									while ((beatsPerBar & 1) == 0 && (denominatorExponent > 0 || beatsPerBar > Config.beatsPerBarMax) && beatsPerBar >= Config.beatsPerBarMin * 2) {
										beatsPerBar = beatsPerBar >> 1;
										denominatorExponent = denominatorExponent - 1;
									}
									beatsPerBar = Math.max(Config.beatsPerBarMin, Math.min(Config.beatsPerBarMax, beatsPerBar));
								} else if (message == MidiMetaEventMessage.keySignature) {
									numSharps = track.reader.readInt8(); // Note: can be negative for flats.
									isMinor = track.reader.readUint8() == 1; // 0: major, 1: minor
									track.reader.skipBytes(length - 2);
								} else {
									// Ignore other meta event message types.
									track.reader.skipBytes(length);
								}

							} else if (eventStatus == 0xF0 || eventStatus == 0xF7) {
								// Sysex events, just skip the data.
								const length: number = track.reader.readMidiVariableLength();
								track.reader.skipBytes(length);
							} else {
								console.error("Unrecognized event status: " + eventStatus);
								this._close();
								return;
							}
						} break;
						default: {
							console.error("Unrecognized event type: " + eventType);
							this._close();
							return;
						}
					}

					if (!foundTrackEndEvent && track.reader.hasMore()) {
						track.nextEventMidiTick = currentMidiTick + track.reader.readMidiVariableLength();
					} else {
						track.ended = true;

						// If the tracks are sequential, start the next track when this one ends.
						if (independentTracks) {
							currentIndependentTrackIndex++;
							if (currentIndependentTrackIndex < tracks.length) {
								currentTrackIndices[0] = currentIndependentTrackIndex;
								tracks[currentIndependentTrackIndex].nextEventMidiTick += currentMidiTick;
								nextEventMidiTick = Math.min(nextEventMidiTick, tracks[currentIndependentTrackIndex].nextEventMidiTick);
								anyTrackHasMore = true;
							}
						}
					}
				}

				if (!track.ended) {
					anyTrackHasMore = true;
					nextEventMidiTick = Math.min(nextEventMidiTick, track.nextEventMidiTick);
				}
			}

			if (anyTrackHasMore) {
				currentMidiTick = nextEventMidiTick;
			} else {
				break;
			}
		}

		// Now the MIDI file is fully parsed. Next, constuct BeepBox channels out of the data.
		const microsecondsPerMinute: number = 60 * 1000 * 1000;
		const beatsPerMinute: number = Math.max(Config.tempoMin, Math.min(Config.tempoMax, Math.round(microsecondsPerMinute / microsecondsPerBeat)));
		const midiTicksPerPart: number = midiTicksPerBeat / Config.partsPerBeat;
		const partsPerBar: number = Config.partsPerBeat * beatsPerBar;
		const songTotalBars: number = Math.ceil(currentMidiTick / midiTicksPerPart / partsPerBar);

		function quantizeMidiTickToPart(midiTick: number): number {
			return Math.round(midiTick / midiTicksPerPart);
		}

		let key: number = numSharps;
		if (isMinor) key += 3; // Diatonic C Major has the same sharps/flats as A Minor, and these keys are 3 semitones apart.
		if ((key & 1) == 1) key += 6; // If the number of sharps/flats is odd, rotate it halfway around the circle of fifths. The key of C# has little in common with the key of C.
		while (key < 0) key += 12; // Wrap around to a range from 0 to 11.
		key = key % 12; // Wrap around to a range from 0 to 11.

		// Convert each midi channel into a BeepBox channel.
		const pitchChannels: Channel[] = [];
		const noiseChannels: Channel[] = [];
		const modChannels: Channel[] = [];
		for (let midiChannel: number = 0; midiChannel < 16; midiChannel++) {
			if (noteEvents[midiChannel].length == 0) continue;

			const channel: Channel = new Channel();

			const channelPresetValue: number | null = EditorConfig.midiProgramToPresetValue(noteEvents[midiChannel][0].program);
			const channelPreset: Preset | null = (channelPresetValue == null) ? null : EditorConfig.valueToPreset(channelPresetValue);

			const isDrumsetChannel: boolean = (midiChannel == 9);
			const isNoiseChannel: boolean = isDrumsetChannel || (channelPreset != null && channelPreset.isNoise == true);
			const isModChannel: boolean = (channelPreset != null && channelPreset.isMod == true);
			const channelBasePitch: number = isNoiseChannel ? Config.spectrumBasePitch : Config.keys[key].basePitch;
			const intervalScale: number = isNoiseChannel ? Config.noiseInterval : 1;
			const midiIntervalScale: number = isNoiseChannel ? 0.5 : 1;
			const channelMaxPitch: number = isNoiseChannel ? Config.drumCount - 1 : Config.maxPitch;

			if (isNoiseChannel) {
				if (isDrumsetChannel) {
					noiseChannels.unshift(channel);
				} else {
					noiseChannels.push(channel);
				}
			} else if (isModChannel) {
				modChannels.push(channel);
			} else {
				pitchChannels.push(channel);
			}

			let currentVelocity: number = 1.0;
			let currentProgram: number = 0;
			let currentInstrumentVolume: number = 0;
			let currentInstrumentPan: number = Config.panCenter;

			if (isDrumsetChannel) {
				const heldPitches: number[] = [];
				let currentBar: number = -1;
				let pattern: Pattern | null = null;
				let prevEventPart: number = 0;
				let setInstrumentVolume: boolean = false;

				const presetValue: number = EditorConfig.nameToPresetValue("standard drumset")!;
				const preset: Preset = EditorConfig.valueToPreset(presetValue)!;
				const instrument: Instrument = new Instrument(false, false);
				instrument.fromJsonObject(preset.settings, false, false, false, false);
				instrument.preset = presetValue;
				channel.instruments.push(instrument);

				for (let noteEventIndex: number = 0; noteEventIndex <= noteEvents[midiChannel].length; noteEventIndex++) {
					const noMoreNotes: boolean = noteEventIndex == noteEvents[midiChannel].length;
					const noteEvent: NoteEvent | null = noMoreNotes ? null : noteEvents[midiChannel][noteEventIndex];
					const nextEventPart: number = noteEvent == null ? Number.MAX_SAFE_INTEGER : quantizeMidiTickToPart(noteEvent.midiTick);
					if (heldPitches.length > 0 && nextEventPart > prevEventPart && (noteEvent == null || noteEvent.on)) {
						const bar: number = Math.floor(prevEventPart / partsPerBar);
						const barStartPart: number = bar * partsPerBar;
						// Ensure a pattern exists for the current bar before inserting notes into it.
						if (currentBar != bar || pattern == null) {
							currentBar++;
							while (currentBar < bar) {
								channel.bars[currentBar] = 0;
								currentBar++;
							}
							pattern = new Pattern();
							channel.patterns.push(pattern);
							channel.bars[currentBar] = channel.patterns.length;
							pattern.instrument = 0;
						}

						// Use the loudest volume setting for the instrument, since 
						// many midis unfortunately use the instrument volume control to fade
						// in at the beginning and we don't want to get stuck with the initial
						// zero volume.
						if (!setInstrumentVolume || instrument.volume > currentInstrumentVolume) {
							instrument.volume = currentInstrumentVolume;
							instrument.pan = currentInstrumentPan;
							instrument.panDelay = 0;
							setInstrumentVolume = true;
						}

						const drumFreqs: number[] = [];
						let minDuration: number = channelMaxPitch;
						let maxDuration: number = 0;
						let expression: number = 1;
						for (const pitch of heldPitches) {
							const drum: AnalogousDrum | undefined = analogousDrumMap[pitch];
							if (drumFreqs.indexOf(drum.frequency) == -1) {
								drumFreqs.push(drum.frequency);
							}
							expression = Math.max(expression, Math.round(drum.volume * currentVelocity));
							minDuration = Math.min(minDuration, drum.duration);
							maxDuration = Math.max(maxDuration, drum.duration);
						}
						const duration: number = Math.min(maxDuration, Math.max(minDuration, 2));
						const noteStartPart: number = prevEventPart - barStartPart;
						const noteEndPart: number = Math.min(partsPerBar, Math.min(nextEventPart - barStartPart, noteStartPart + duration * 6));

						const note: Note = new Note(-1, noteStartPart, noteEndPart, expression, true);

						note.pitches.length = 0;
						for (let pitchIndex: number = 0; pitchIndex < Math.min(Config.maxChordSize, drumFreqs.length); pitchIndex++) {
							const heldPitch: number = drumFreqs[pitchIndex + Math.max(0, drumFreqs.length - Config.maxChordSize)];
							if (note.pitches.indexOf(heldPitch) == -1) {
								note.pitches.push(heldPitch);
							}
						}
						pattern.notes.push(note);

						heldPitches.length = 0;
					}

					// Process the next midi note event before continuing, updating the list of currently held pitches.
					if (noteEvent != null && noteEvent.on && analogousDrumMap[noteEvent.pitch] != undefined) {
						heldPitches.push(noteEvent.pitch);
						prevEventPart = nextEventPart;
						currentVelocity = noteEvent.velocity;
						currentInstrumentVolume = noteEvent.instrumentVolume;
						currentInstrumentPan = noteEvent.instrumentPan;
					}
				}
			} else {
				// If not a drumset, handle as a tonal instrument.

				// Advance the pitch bend and expression timelines to the given midiTick, 
				// changing the value of currentMidiInterval or currentMidiExpression.
				// IMPORTANT: These functions can't rewind!
				let currentMidiInterval: number = 0.0;
				let currentMidiExpression: number = 3.0;
				let pitchBendEventIndex: number = 0;
				let expressionEventIndex: number = 0;
				function updateCurrentMidiInterval(midiTick: number) {
					while (pitchBendEventIndex < pitchBendEvents[midiChannel].length && pitchBendEvents[midiChannel][pitchBendEventIndex].midiTick <= midiTick) {
						currentMidiInterval = pitchBendEvents[midiChannel][pitchBendEventIndex].interval;
						pitchBendEventIndex++;
					}
				}
				function updateCurrentMidiExpression(midiTick: number) {
					while (expressionEventIndex < expressionEvents[midiChannel].length && expressionEvents[midiChannel][expressionEventIndex].midiTick <= midiTick) {
						currentMidiExpression = expressionEvents[midiChannel][expressionEventIndex].volume;
						expressionEventIndex++;
					}
				}

				const instrumentByProgram: Instrument[] = [];
				const heldPitches: number[] = [];
				let currentBar: number = -1;
				let pattern: Pattern | null = null;
				let prevEventMidiTick: number = 0;
				let prevEventPart: number = 0;
				let pitchSum: number = 0;
				let pitchCount: number = 0;

				for (let noteEvent of noteEvents[midiChannel]) {
					const nextEventMidiTick: number = noteEvent.midiTick;
					const nextEventPart: number = quantizeMidiTickToPart(nextEventMidiTick);

					if (heldPitches.length > 0 && nextEventPart > prevEventPart) {
						// If there are any pitches held between the previous event and the next
						// event, iterate over all bars covered by this time period, ensure they
						// have a pattern instantiated, and insert notes for these pitches.
						const startBar: number = Math.floor(prevEventPart / partsPerBar);
						const endBar: number = Math.ceil(nextEventPart / partsPerBar);
						for (let bar: number = startBar; bar < endBar; bar++) {
							const barStartPart: number = bar * partsPerBar;
							const barStartMidiTick: number = bar * beatsPerBar * midiTicksPerBeat;
							const barEndMidiTick: number = (bar + 1) * beatsPerBar * midiTicksPerBeat;

							const noteStartPart: number = Math.max(0, prevEventPart - barStartPart);
							const noteEndPart: number = Math.min(partsPerBar, nextEventPart - barStartPart);
							const noteStartMidiTick: number = Math.max(barStartMidiTick, prevEventMidiTick);
							const noteEndMidiTick: number = Math.min(barEndMidiTick, nextEventMidiTick);

							if (noteStartPart < noteEndPart) {
								const presetValue: number | null = EditorConfig.midiProgramToPresetValue(currentProgram);
								const preset: Preset | null = (presetValue == null) ? null : EditorConfig.valueToPreset(presetValue);

								// Ensure a pattern exists for the current bar before inserting notes into it.
								if (currentBar != bar || pattern == null) {
									currentBar++;
									while (currentBar < bar) {
										channel.bars[currentBar] = 0;
										currentBar++;
									}
									pattern = new Pattern();
									channel.patterns.push(pattern);
									channel.bars[currentBar] = channel.patterns.length;

									// If this is the first time a note is trying to use a specific instrument
									// program in this channel, create a new BeepBox instrument for it.
									if (instrumentByProgram[currentProgram] == undefined) {
										const instrument: Instrument = new Instrument(isNoiseChannel, isModChannel);
										instrumentByProgram[currentProgram] = instrument;

										if (presetValue != null && preset != null && (preset.isNoise == true) == isNoiseChannel) {
											instrument.fromJsonObject(preset.settings, isNoiseChannel, isModChannel, false, false);
											instrument.preset = presetValue;
										} else {
											instrument.setTypeAndReset(isModChannel ? InstrumentType.mod : (isNoiseChannel ? InstrumentType.noise : InstrumentType.chip), isNoiseChannel, isModChannel);
											instrument.chord = 0; // Midi instruments use polyphonic harmony by default.
										}

										instrument.volume = currentInstrumentVolume;
										instrument.pan = currentInstrumentPan;
										instrument.panDelay = 0;

										channel.instruments.push(instrument);
									}

									pattern.instrument = channel.instruments.indexOf(instrumentByProgram[currentProgram]);
								}

								// Use the loudest volume setting for the instrument, since 
								// many midis unfortunately use the instrument volume control to fade
								// in at the beginning and we don't want to get stuck with the initial
								// zero volume.
								if (instrumentByProgram[currentProgram] != undefined) {
									instrumentByProgram[currentProgram].volume = Math.min(instrumentByProgram[currentProgram].volume, currentInstrumentVolume);
									instrumentByProgram[currentProgram].pan = Math.min(instrumentByProgram[currentProgram].pan, currentInstrumentPan);
								}

								// Create a new note, and interpret the pitch bend and expression events
								// to determine where we need to insert pins to control interval and expression.
								const note: Note = new Note(-1, noteStartPart, noteEndPart, 3, false);
								note.pins.length = 0;

								updateCurrentMidiInterval(noteStartMidiTick);
								updateCurrentMidiExpression(noteStartMidiTick);
								const shiftedHeldPitch: number = heldPitches[0] * midiIntervalScale - channelBasePitch;
								const initialBeepBoxPitch: number = Math.round((shiftedHeldPitch + currentMidiInterval) / intervalScale);
								const heldPitchOffset: number = Math.round(currentMidiInterval - channelBasePitch);
								let firstPin: NotePin = makeNotePin(0, 0, Math.round(currentVelocity * currentMidiExpression));
								note.pins.push(firstPin);

								interface PotentialPin {
									part: number;
									pitch: number;
									volume: number;
									keyPitch: boolean;
									keyVolume: boolean;
								}
								const potentialPins: PotentialPin[] = [
									{ part: 0, pitch: initialBeepBoxPitch, volume: firstPin.volume, keyPitch: false, keyVolume: false }
								];
								let prevPinIndex: number = 0;

								let prevPartPitch: number = (shiftedHeldPitch + currentMidiInterval) / intervalScale;
								let prevPartExpression: number = currentVelocity * currentMidiExpression;
								for (let part: number = noteStartPart + 1; part <= noteEndPart; part++) {
									const midiTick: number = Math.max(noteStartMidiTick, Math.min(noteEndMidiTick - 1, Math.round(midiTicksPerPart * (part + barStartPart))));
									const noteRelativePart: number = part - noteStartPart;
									const lastPart: boolean = (part == noteEndPart);

									// BeepBox can only add pins at whole number intervals and expressions. Detect places where
									// the interval or expression are at or cross whole numbers, and add these to the list of
									// potential places to insert pins.
									updateCurrentMidiInterval(midiTick);
									updateCurrentMidiExpression(midiTick);
									const partPitch: number = (currentMidiInterval + shiftedHeldPitch) / intervalScale;
									const partExpression: number = currentVelocity * currentMidiExpression;

									const nearestPitch: number = Math.round(partPitch);
									const pitchIsNearInteger: boolean = Math.abs(partPitch - nearestPitch) < 0.01;
									const pitchCrossedInteger: boolean = (Math.abs(prevPartPitch - Math.round(prevPartPitch)) < 0.01)
										? Math.abs(partPitch - prevPartPitch) >= 1.0
										: Math.floor(partPitch) != Math.floor(prevPartPitch);
									const keyPitch: boolean = pitchIsNearInteger || pitchCrossedInteger;

									const nearestExpression: number = Math.round(partExpression);
									const expressionIsNearInteger: boolean = Math.abs(partExpression - nearestExpression) < 0.01;
									const expressionCrossedInteger: boolean = (Math.abs(prevPartExpression - Math.round(prevPartExpression)))
										? Math.abs(partExpression - prevPartExpression) >= 1.0
										: Math.floor(partExpression) != Math.floor(prevPartExpression);
									const keyExpression: boolean = expressionIsNearInteger || expressionCrossedInteger;

									prevPartPitch = partPitch;
									prevPartExpression = partExpression;

									if (keyPitch || keyExpression || lastPart) {
										const currentPin: PotentialPin = { part: noteRelativePart, pitch: nearestPitch, volume: nearestExpression, keyPitch: keyPitch || lastPart, keyVolume: keyExpression || lastPart };
										const prevPin: PotentialPin = potentialPins[prevPinIndex];

										// At all key points in the list of potential pins, check to see if they
										// continue the recent slope. If not, insert a pin at the corner, where
										// the recent recorded values deviate the furthest from the slope.
										let addPin: boolean = false;
										let addPinAtIndex: number = Number.MAX_VALUE;

										if (currentPin.keyPitch) {
											const slope: number = (currentPin.pitch - prevPin.pitch) / (currentPin.part - prevPin.part);
											let furthestIntervalDistance: number = Math.abs(slope); // minimum distance to make a new pin.
											let addIntervalPin: boolean = false;
											let addIntervalPinAtIndex: number = Number.MAX_VALUE;
											for (let potentialIndex: number = prevPinIndex + 1; potentialIndex < potentialPins.length; potentialIndex++) {
												const potentialPin: PotentialPin = potentialPins[potentialIndex];
												if (potentialPin.keyPitch) {
													const interpolatedInterval: number = prevPin.pitch + slope * (potentialPin.part - prevPin.part);
													const distance: number = Math.abs(interpolatedInterval - potentialPin.pitch);
													if (furthestIntervalDistance < distance) {
														furthestIntervalDistance = distance;
														addIntervalPin = true;
														addIntervalPinAtIndex = potentialIndex;
													}
												}
											}
											if (addIntervalPin) {
												addPin = true;
												addPinAtIndex = Math.min(addPinAtIndex, addIntervalPinAtIndex);
											}
										}

										if (currentPin.keyVolume) {
											const slope: number = (currentPin.volume - prevPin.volume) / (currentPin.part - prevPin.part);
											let furthestVolumeDistance: number = Math.abs(slope); // minimum distance to make a new pin.
											let addVolumePin: boolean = false;
											let addVolumePinAtIndex: number = Number.MAX_VALUE;
											for (let potentialIndex: number = prevPinIndex + 1; potentialIndex < potentialPins.length; potentialIndex++) {
												const potentialPin: PotentialPin = potentialPins[potentialIndex];
												if (potentialPin.keyVolume) {
													const interpolatedVolume: number = prevPin.volume + slope * (potentialPin.part - prevPin.part);
													const distance: number = Math.abs(interpolatedVolume - potentialPin.volume);
													if (furthestVolumeDistance < distance) {
														furthestVolumeDistance = distance;
														addVolumePin = true;
														addVolumePinAtIndex = potentialIndex;
													}
												}
											}
											if (addVolumePin) {
												addPin = true;
												addPinAtIndex = Math.min(addPinAtIndex, addVolumePinAtIndex);
											}
										}

										if (addPin) {
											const toBePinned: PotentialPin = potentialPins[addPinAtIndex];
											note.pins.push(makeNotePin(toBePinned.pitch - initialBeepBoxPitch, toBePinned.part, toBePinned.volume));
											prevPinIndex = addPinAtIndex;
										}

										potentialPins.push(currentPin);
									}
								}

								// And always add a pin at the end of the note.
								const lastToBePinned: PotentialPin = potentialPins[potentialPins.length - 1];
								note.pins.push(makeNotePin(lastToBePinned.pitch - initialBeepBoxPitch, lastToBePinned.part, lastToBePinned.volume));

								// Use interval range to constrain min/max pitches so no pin is out of bounds.
								let maxPitch: number = channelMaxPitch;
								let minPitch: number = 0;
								for (const notePin of note.pins) {
									maxPitch = Math.min(maxPitch, channelMaxPitch - notePin.interval);
									minPitch = Math.min(minPitch, -notePin.interval);
								}

								// Build the note chord out of the current pitches, shifted into BeepBox channelBasePitch relative values.
								note.pitches.length = 0;
								for (let pitchIndex: number = 0; pitchIndex < Math.min(Config.maxChordSize, heldPitches.length); pitchIndex++) {
									let heldPitch: number = heldPitches[pitchIndex + Math.max(0, heldPitches.length - Config.maxChordSize)] * midiIntervalScale;
									if (preset != null && preset.midiSubharmonicOctaves != undefined) {
										heldPitch -= 12 * preset.midiSubharmonicOctaves;
									}
									const shiftedPitch: number = Math.max(minPitch, Math.min(maxPitch, Math.round((heldPitch + heldPitchOffset) / intervalScale)));
									if (note.pitches.indexOf(shiftedPitch) == -1) {
										note.pitches.push(shiftedPitch);
										const weight: number = note.end - note.start;
										pitchSum += shiftedPitch * weight;
										pitchCount += weight;
									}
								}
								pattern.notes.push(note);
							}
						}
					}

					// Process the next midi note event before continuing, updating the list of currently held pitches.
					if (heldPitches.indexOf(noteEvent.pitch) != -1) {
						heldPitches.splice(heldPitches.indexOf(noteEvent.pitch), 1);
					}
					if (noteEvent.on) {
						heldPitches.push(noteEvent.pitch);
						currentVelocity = noteEvent.velocity;
						currentProgram = noteEvent.program;
						currentInstrumentVolume = noteEvent.instrumentVolume;
						currentInstrumentPan = noteEvent.instrumentPan;
					}

					prevEventMidiTick = nextEventMidiTick;
					prevEventPart = nextEventPart;
				}

				const averagePitch: number = pitchSum / pitchCount;
				channel.octave = (isNoiseChannel || isModChannel) ? 0 : Math.max(0, Math.min(this._doc.scrollableOctaves, Math.round((averagePitch / 12) - 1.5)));
			}

			while (channel.bars.length < songTotalBars) {
				channel.bars.push(0);
			}
		}

		// For better or for worse, BeepBox has a more limited number of channels than Midi.
		// To compensate, try to merge non-overlapping channels.
		function compactChannels(channels: Channel[], maxLength: number): void {
			while (channels.length > maxLength) {
				let bestChannelIndexA: number = channels.length - 2;
				let bestChannelIndexB: number = channels.length - 1;
				let fewestConflicts: number = Number.MAX_VALUE;
				let fewestGaps: number = Number.MAX_VALUE;
				for (let channelIndexA: number = 0; channelIndexA < channels.length - 1; channelIndexA++) {
					for (let channelIndexB: number = channelIndexA + 1; channelIndexB < channels.length; channelIndexB++) {
						const channelA: Channel = channels[channelIndexA];
						const channelB: Channel = channels[channelIndexB];
						let conflicts: number = 0;
						let gaps: number = 0;
						for (let barIndex: number = 0; barIndex < channelA.bars.length && barIndex < channelB.bars.length; barIndex++) {
							if (channelA.bars[barIndex] != 0 && channelB.bars[barIndex] != 0) conflicts++;
							if (channelA.bars[barIndex] == 0 && channelB.bars[barIndex] == 0) gaps++;
						}
						if (conflicts <= fewestConflicts) {
							if (conflicts < fewestConflicts || gaps < fewestGaps) {
								bestChannelIndexA = channelIndexA;
								bestChannelIndexB = channelIndexB;
								fewestConflicts = conflicts;
								fewestGaps = gaps;
							}
						}
					}
				}

				// Merge channelB's patterns, instruments, and bars into channelA.
				const channelA: Channel = channels[bestChannelIndexA];
				const channelB: Channel = channels[bestChannelIndexB];
				const channelAInstrumentCount: number = channelA.instruments.length;
				const channelAPatternCount: number = channelA.patterns.length;
				for (const instrument of channelB.instruments) {
					channelA.instruments.push(instrument);
				}
				for (const pattern of channelB.patterns) {
					pattern.instrument += channelAInstrumentCount;
					channelA.patterns.push(pattern);
				}
				for (let barIndex: number = 0; barIndex < channelA.bars.length && barIndex < channelB.bars.length; barIndex++) {
					if (channelA.bars[barIndex] == 0 && channelB.bars[barIndex] != 0) {
						channelA.bars[barIndex] = channelB.bars[barIndex] + channelAPatternCount;
					}
				}

				// Remove channelB.
				channels.splice(bestChannelIndexB, 1);
			}
		}

		compactChannels(pitchChannels, Config.pitchChannelCountMax);
		compactChannels(noiseChannels, Config.noiseChannelCountMax);
		compactChannels(modChannels, Config.modChannelCountMax);

		class ChangeImportMidi extends ChangeGroup {
			constructor(doc: SongDocument) {
				super();
				const song: Song = doc.song;
				song.tempo = beatsPerMinute;
				song.beatsPerBar = beatsPerBar;
				song.key = key;
				song.scale = 11;
				song.reverb = 1;
				song.rhythm = 1;

				removeDuplicatePatterns(pitchChannels);
				removeDuplicatePatterns(noiseChannels);
				removeDuplicatePatterns(modChannels);

				this.append(new ChangeReplacePatterns(doc, pitchChannels, noiseChannels, modChannels));
				song.loopStart = 0;
				song.loopLength = song.barCount;
				this._didSomething();
				doc.notifier.changed();
			}
		}
		this._doc.goBackToStart();
		for (const channel of this._doc.song.channels) channel.muted = false;
		this._doc.prompt = null;
		this._doc.record(new ChangeImportMidi(this._doc), true, true);
	}
}
//}

