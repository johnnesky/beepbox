// Copyright (C) 2020 John Nesky, distributed under the MIT license.

import { Algorithm, Dictionary, InstrumentType, Config } from "../synth/SynthConfig";
import { NotePin, Note, makeNotePin, Pattern, SpectrumWave, HarmonicsWave, Instrument, Channel, Song, ModStatus, ModSetting } from "../synth/synth";
import { Preset, PresetCategory, EditorConfig } from "./EditorConfig";
import { Change, ChangeGroup, ChangeSequence, UndoableChange } from "./Change";
import { SongDocument } from "./SongDocument";
import { ColorConfig } from "./ColorConfig";

//namespace beepbox {
export function unionOfUsedNotes(pattern: Pattern, flags: boolean[]): void {
	for (const note of pattern.notes) {
		for (const pitch of note.pitches) {
			for (const pin of note.pins) {
				const key: number = (pitch + pin.interval) % 12;
				if (!flags[key]) {
					flags[key] = true;
				}
			}
		}
	}
}

export function generateScaleMap(oldScaleFlags: ReadonlyArray<boolean>, newScaleValue: number): number[] {
	const newScaleFlags: ReadonlyArray<boolean> = Config.scales[newScaleValue].flags;
	const oldScale: number[] = [];
	const newScale: number[] = [];
	for (let i: number = 0; i < 12; i++) {
		if (oldScaleFlags[i]) oldScale.push(i);
		if (newScaleFlags[i]) newScale.push(i);
	}
	const largerToSmaller: boolean = oldScale.length > newScale.length;
	const smallerScale: number[] = largerToSmaller ? newScale : oldScale;
	const largerScale: number[] = largerToSmaller ? oldScale : newScale;

	const roles: string[] = ["root", "second", "second", "third", "third", "fourth", "tritone", "fifth", "sixth", "sixth", "seventh", "seventh", "root"];
	let bestScore: number = Number.MAX_SAFE_INTEGER;
	let bestIndexMap: number[] = [];
	const stack: number[][] = [[0]]; // Root always maps to root.

	while (stack.length > 0) {
		const indexMap: number[] = stack.pop()!;

		if (indexMap.length == smallerScale.length) {
			// Score this mapping.
			let score: number = 0;
			for (let i: number = 0; i < indexMap.length; i++) {
				score += Math.abs(smallerScale[i] - largerScale[indexMap[i]]);
				if (roles[smallerScale[i]] != roles[largerScale[indexMap[i]]]) {
					// Penalize changing roles.
					score += 0.75;
				}
			}
			if (bestScore > score) {
				bestScore = score;
				bestIndexMap = indexMap;
			}
		} else {
			// Recursively choose next indices for mapping.
			const lowIndex: number = indexMap[indexMap.length - 1] + 1;
			const highIndex: number = largerScale.length - smallerScale.length + indexMap.length;
			for (let i: number = lowIndex; i <= highIndex; i++) {
				stack.push(indexMap.concat(i));
			}
		}
	}

	const sparsePitchMap: number[][] = [];
	for (let i: number = 0; i < bestIndexMap.length; i++) {
		const smallerScalePitch = smallerScale[i];
		const largerScalePitch = largerScale[bestIndexMap[i]];
		sparsePitchMap[i] = largerToSmaller
			? [largerScalePitch, smallerScalePitch]
			: [smallerScalePitch, largerScalePitch];
	}

	// To make it easier to wrap around.
	sparsePitchMap.push([12, 12]);
	newScale.push(12);

	let sparseIndex: number = 0;
	const fullPitchMap: number[] = [];
	for (let i: number = 0; i < 12; i++) {
		const oldLow: number = sparsePitchMap[sparseIndex][0];
		const newLow: number = sparsePitchMap[sparseIndex][1];
		const oldHigh: number = sparsePitchMap[sparseIndex + 1][0];
		const newHigh: number = sparsePitchMap[sparseIndex + 1][1];
		if (i == oldHigh - 1) sparseIndex++;

		const transformedPitch: number = (i - oldLow) * (newHigh - newLow) / (oldHigh - oldLow) + newLow;

		let nearestPitch: number = 0;
		let nearestPitchDistance: number = Number.MAX_SAFE_INTEGER;
		for (const newPitch of newScale) {
			let distance: number = Math.abs(newPitch - transformedPitch);
			if (roles[newPitch] != roles[i]) {
				// Again, penalize changing roles.
				distance += 0.1;
			}
			if (nearestPitchDistance > distance) {
				nearestPitchDistance = distance;
				nearestPitch = newPitch;
			}
		}

		fullPitchMap[i] = nearestPitch;
	}

	return fullPitchMap;
}

function projectNoteIntoBar(oldNote: Note, timeOffset: number, noteStartPart: number, noteEndPart: number, newNotes: Note[]): void {
	// Create a new note, and interpret the pitch bend and expression events
	// to determine where we need to insert pins to control interval and volume.
	const newNote: Note = new Note(-1, noteStartPart, noteEndPart, 3, false);
	newNotes.push(newNote);
	newNote.pins.length = 0;
	newNote.pitches.length = 0;
	const newNoteLength: number = noteEndPart - noteStartPart;

	for (const pitch of oldNote.pitches) {
		newNote.pitches.push(pitch);
	}

	for (let pinIndex: number = 0; pinIndex < oldNote.pins.length; pinIndex++) {
		const pin: NotePin = oldNote.pins[pinIndex];
		const newPinTime: number = pin.time + timeOffset;
		if (newPinTime < 0) {
			if (pinIndex + 1 >= oldNote.pins.length) throw new Error("Error converting pins in note overflow.");
			const nextPin: NotePin = oldNote.pins[pinIndex + 1];
			const nextPinTime: number = nextPin.time + timeOffset;
			if (nextPinTime > 0) {
				// Insert an interpolated pin at the start of the new note.
				const ratio: number = (-newPinTime) / (nextPinTime - newPinTime);
				newNote.pins.push(makeNotePin(Math.round(pin.interval + ratio * (nextPin.interval - pin.interval)), 0, Math.round(pin.volume + ratio * (nextPin.volume - pin.volume))));

			}
		} else if (newPinTime <= newNoteLength) {
			newNote.pins.push(makeNotePin(pin.interval, newPinTime, pin.volume));
		} else {
			if (pinIndex < 1) throw new Error("Error converting pins in note overflow.");
			const prevPin: NotePin = oldNote.pins[pinIndex - 1];
			const prevPinTime: number = prevPin.time + timeOffset;
			if (prevPinTime < newNoteLength) {
				// Insert an interpolated pin at the end of the new note.
				const ratio: number = (newNoteLength - prevPinTime) / (newPinTime - prevPinTime);
				newNote.pins.push(makeNotePin(Math.round(prevPin.interval + ratio * (pin.interval - prevPin.interval)), newNoteLength, Math.round(prevPin.volume + ratio * (pin.volume - prevPin.volume))));
			}
		}
	}

	// Fix from Jummbus: Ensure the first pin's interval is zero, adjust pitches and pins to compensate.
	const offsetInterval: number = newNote.pins[0].interval;
	for (let pitchIdx: number = 0; pitchIdx < newNote.pitches.length; pitchIdx++) {
		newNote.pitches[pitchIdx] += offsetInterval;
	}
	for (let pinIdx: number = 0; pinIdx < newNote.pins.length; pinIdx++) {
		newNote.pins[pinIdx].interval -= offsetInterval;
	}
}

export class ChangeMoveAndOverflowNotes extends ChangeGroup {
	constructor(doc: SongDocument, newBeatsPerBar: number, partsToMove: number) {
		super();

		const pitchChannels: Channel[] = [];
		const noiseChannels: Channel[] = [];
		const modChannels: Channel[] = []

		for (let channelIndex: number = 0; channelIndex < doc.song.getChannelCount(); channelIndex++) {
			const oldChannel: Channel = doc.song.channels[channelIndex];
			const newChannel: Channel = new Channel();

			if (channelIndex < doc.song.pitchChannelCount) {
				pitchChannels.push(newChannel);
			} else if (channelIndex < doc.song.pitchChannelCount + doc.song.noiseChannelCount) {
				noiseChannels.push(newChannel);
			}
			else {
				modChannels.push(newChannel);
			}

			newChannel.muted = oldChannel.muted;
			newChannel.octave = oldChannel.octave;
			newChannel.name = oldChannel.name;
	
			for (const instrument of oldChannel.instruments) {
				newChannel.instruments.push(instrument);
			}

			const oldPartsPerBar: number = Config.partsPerBeat * doc.song.beatsPerBar;
			const newPartsPerBar: number = Config.partsPerBeat * newBeatsPerBar;
			let currentBar: number = -1;
			let pattern: Pattern | null = null;

			for (let oldBar: number = 0; oldBar < doc.song.barCount; oldBar++) {
				const oldPattern: Pattern | null = doc.song.getPattern(channelIndex, oldBar);
				if (oldPattern != null) {
					const oldBarStart: number = oldBar * oldPartsPerBar;
					for (const oldNote of oldPattern.notes) {

						const absoluteNoteStart: number = oldNote.start + oldBarStart + partsToMove;
						const absoluteNoteEnd: number = oldNote.end + oldBarStart + partsToMove;

						const startBar: number = Math.floor(absoluteNoteStart / newPartsPerBar);
						const endBar: number = Math.ceil(absoluteNoteEnd / newPartsPerBar);
						for (let bar: number = startBar; bar < endBar; bar++) {
							const barStartPart: number = bar * newPartsPerBar;
							const noteStartPart: number = Math.max(0, absoluteNoteStart - barStartPart);
							const noteEndPart: number = Math.min(newPartsPerBar, absoluteNoteEnd - barStartPart);

							if (noteStartPart < noteEndPart) {

								// Ensure a pattern exists for the current bar before inserting notes into it.
								if (currentBar < bar || pattern == null) {
									currentBar++;
									while (currentBar < bar) {
										newChannel.bars[currentBar] = 0;
										currentBar++;
									}
									pattern = new Pattern();
									newChannel.patterns.push(pattern);
									newChannel.bars[currentBar] = newChannel.patterns.length;
									pattern.instrument = oldPattern.instrument;
								}

								// This is a consideration to allow arbitrary note sequencing, e.g. for mod channels (so the pattern being used can jump around)
								pattern = newChannel.patterns[newChannel.bars[bar] - 1];

								projectNoteIntoBar(oldNote, absoluteNoteStart - barStartPart - noteStartPart, noteStartPart, noteEndPart, pattern.notes);
							}
						}
					}
				}
			}
		}

		removeDuplicatePatterns(pitchChannels);
		removeDuplicatePatterns(noiseChannels);
		removeDuplicatePatterns(modChannels);
		this.append(new ChangeReplacePatterns(doc, pitchChannels, noiseChannels, modChannels));
	}
}

export class ChangePins extends UndoableChange {
	protected _oldStart: number;
	protected _newStart: number;
	protected _oldEnd: number;
	protected _newEnd: number;
	protected _oldPins: NotePin[];
	protected _newPins: NotePin[];
	protected _oldPitches: number[];
	protected _newPitches: number[];
	constructor(protected _doc: SongDocument | null, protected _note: Note) {
		super(false);
		this._oldStart = this._note.start;
		this._oldEnd = this._note.end;
		this._newStart = this._note.start;
		this._newEnd = this._note.end;
		this._oldPins = this._note.pins;
		this._newPins = [];
		this._oldPitches = this._note.pitches;
		this._newPitches = [];
	}

	protected _finishSetup(): void {
		for (let i: number = 0; i < this._newPins.length - 1;) {
			if (this._newPins[i].time >= this._newPins[i + 1].time) {
				this._newPins.splice(i, 1);
			} else {
				i++;
			}
		}

		for (let i: number = 1; i < this._newPins.length - 1;) {
			if (this._newPins[i - 1].interval == this._newPins[i].interval &&
				this._newPins[i].interval == this._newPins[i + 1].interval &&
				this._newPins[i - 1].volume == this._newPins[i].volume &&
				this._newPins[i].volume == this._newPins[i + 1].volume) {
				this._newPins.splice(i, 1);
			} else {
				i++;
			}
		}

		const firstInterval: number = this._newPins[0].interval;
		const firstTime: number = this._newPins[0].time;
		for (let i: number = 0; i < this._oldPitches.length; i++) {
			this._newPitches[i] = this._oldPitches[i] + firstInterval;
		}
		for (let i: number = 0; i < this._newPins.length; i++) {
			this._newPins[i].interval -= firstInterval;
			this._newPins[i].time -= firstTime;
		}
		this._newStart = this._oldStart + firstTime;
		this._newEnd = this._newStart + this._newPins[this._newPins.length - 1].time;

		this._doForwards();
		this._didSomething();
	}

	protected _doForwards(): void {
		this._note.pins = this._newPins;
		this._note.pitches = this._newPitches;
		this._note.start = this._newStart;
		this._note.end = this._newEnd;
		if (this._doc != null) this._doc.notifier.changed();
	}

	protected _doBackwards(): void {
		this._note.pins = this._oldPins;
		this._note.pitches = this._oldPitches;
		this._note.start = this._oldStart;
		this._note.end = this._oldEnd;
		if (this._doc != null) this._doc.notifier.changed();
	}
}

export class ChangeCustomizeInstrument extends Change {
	constructor(doc: SongDocument) {
		super();
		const instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
		if (instrument.preset != instrument.type) {
			instrument.preset = instrument.type;
			doc.notifier.changed();
			this._didSomething();
		}
	}
}

export class ChangeCustomWave extends Change {
	constructor(doc: SongDocument, newArray: Float64Array) {
		super();
		const oldArray: Float64Array = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()].customChipWave;
		var comparisonResult: boolean = true;
		for (let i: number = 0; i < oldArray.length; i++) {
			if (oldArray[i] != newArray[i]) {
				comparisonResult = false;
				i = oldArray.length;
			}
		}
		if (comparisonResult == false) {
			let instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
			for (let i: number = 0; i < newArray.length; i++) {
				instrument.customChipWave[i] = newArray[i];
			}

			let sum: number = 0.0;
			for (let i: number = 0; i < instrument.customChipWave.length; i++) {
				sum += instrument.customChipWave[i];
			}
			const average: number = sum / instrument.customChipWave.length;

			// Perform the integral on the wave. The chipSynth will perform the derivative to get the original wave back but with antialiasing.
			let cumulative: number = 0;
			let wavePrev: number = 0;
			for (let i: number = 0; i < instrument.customChipWave.length; i++) {
				cumulative += wavePrev;
				wavePrev = instrument.customChipWave[i] - average;
				instrument.customChipWaveIntegral[i] = cumulative;
			}

			instrument.customChipWaveIntegral[64] = 0.0;
			instrument.preset = instrument.type;
			doc.notifier.changed();
			this._didSomething();
		}
	}
}

export class ChangePreset extends Change {
	constructor(doc: SongDocument, newValue: number) {
		super();
		const instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
		const oldValue: number = instrument.preset;
		if (oldValue != newValue) {
			const preset: Preset | null = EditorConfig.valueToPreset(newValue);
			if (preset != null) {
				if (preset.customType != undefined) {
					instrument.type = preset.customType;
					if (!Config.instrumentTypeHasSpecialInterval[instrument.type] && Config.chords[instrument.chord].isCustomInterval) {
						instrument.chord = 0;
					}
				} else if (preset.settings != undefined) {
					const tempVolume: number = instrument.volume;
					const tempPan: number = instrument.pan;
					const tempPanDelay: number = instrument.panDelay;
					instrument.fromJsonObject(preset.settings, doc.song.getChannelIsNoise(doc.channel), doc.song.getChannelIsMod(doc.channel), doc.song.rhythm == 0 || doc.song.rhythm == 2, doc.song.rhythm >= 2);
					instrument.volume = tempVolume;
					instrument.pan = tempPan;
					instrument.panDelay = tempPanDelay;
				}
			}
			instrument.preset = newValue;
			doc.notifier.changed();
			this._didSomething();
		}
	}
}

export class ChangeRandomGeneratedInstrument extends Change {
	constructor(doc: SongDocument) {
		super();

		interface ItemWeight<T> {
			readonly item: T;
			readonly weight: number;
		}
		function selectWeightedRandom<T>(entries: ReadonlyArray<ItemWeight<T>>): T {
			let total: number = 0;
			for (const entry of entries) {
				total += entry.weight;
			}
			let random: number = Math.random() * total;
			for (const entry of entries) {
				random -= entry.weight;
				if (random <= 0.0) return entry.item;
			}
			return entries[(Math.random() * entries.length) | 0].item;
		}
		function selectCurvedDistribution(min: number, max: number, peak: number, width: number): number {
			const entries: Array<ItemWeight<number>> = [];
			for (let i: number = min; i <= max; i++) {
				entries.push({ item: i, weight: 1.0 / (Math.pow((i - peak) / width, 2.0) + 1.0) });
			}
			return selectWeightedRandom(entries);
		}

		const isNoise: boolean = doc.song.getChannelIsNoise(doc.channel);
		const instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];

		if (isNoise) {
			const type: InstrumentType = selectWeightedRandom([
				{ item: InstrumentType.noise, weight: 1 },
				{ item: InstrumentType.spectrum, weight: 3 },
			]);
			instrument.preset = instrument.type = type;
			instrument.filterCutoff = selectCurvedDistribution(4, Config.filterCutoffRange - 1, Config.filterCutoffRange - 2, 2);
			instrument.filterResonance = selectCurvedDistribution(0, Config.filterResonanceRange - 1, 1, 2);
			instrument.filterEnvelope = Config.envelopes.dictionary[selectWeightedRandom([
				{ item: "steady", weight: 2 },
				{ item: "punch", weight: 4 },
				{ item: "flare 1", weight: 2 },
				{ item: "flare 2", weight: 2 },
				{ item: "flare 3", weight: 2 },
				{ item: "twang 1", weight: 8 },
				{ item: "twang 2", weight: 8 },
				{ item: "twang 3", weight: 8 },
				{ item: "swell 1", weight: 2 },
				{ item: "swell 2", weight: 2 },
				{ item: "swell 3", weight: 1 },
				{ item: "tremolo1", weight: 1 },
				{ item: "tremolo2", weight: 1 },
				{ item: "tremolo3", weight: 1 },
				{ item: "tremolo4", weight: 1 },
				{ item: "tremolo5", weight: 1 },
				{ item: "tremolo6", weight: 1 },
				{ item: "decay 1", weight: 4 },
				{ item: "decay 2", weight: 4 },
				{ item: "decay 3", weight: 4 },
			])].index;
			instrument.transition = Config.transitions.dictionary[selectWeightedRandom([
				{ item: "seamless", weight: 1 },
				{ item: "hard", weight: 4 },
				{ item: "soft", weight: 2 },
				{ item: "slide", weight: 1 },
				{ item: "cross fade", weight: 2 },
				{ item: "hard fade", weight: 8 },
				{ item: "medium fade", weight: 2 },
				{ item: "soft fade", weight: 1 },
			])].index;
			instrument.effects = Config.effectsNames.indexOf(selectWeightedRandom([
				{ item: "none", weight: 1 },
				{ item: "reverb", weight: 3 },
			]));
			instrument.chord = Config.chords.dictionary[selectWeightedRandom([
				{ item: "harmony", weight: 4 },
				{ item: "strum", weight: 2 },
				{ item: "arpeggio", weight: 1 },
			])].index;
			function normalize(harmonics: number[]): void {
				let max: number = 0;
				for (const value of harmonics) {
					if (value > max) max = value;
				}
				for (let i: number = 0; i < harmonics.length; i++) {
					harmonics[i] = Config.harmonicsMax * harmonics[i] / max;
				}
			}
			switch (type) {
				case InstrumentType.noise: {
					instrument.chipNoise = (Math.random() * Config.chipNoises.length) | 0;
				} break;
				case InstrumentType.spectrum: {
					const spectrumGenerators: Function[] = [
						(): number[] => {
							const spectrum: number[] = [];
							for (let i: number = 0; i < Config.spectrumControlPoints; i++) {
								spectrum[i] = (Math.random() < 0.5) ? Math.random() : 0.0;
							}
							return spectrum;
						},
						(): number[] => {
							let current: number = 1.0;
							const spectrum: number[] = [current];
							for (let i = 1; i < Config.spectrumControlPoints; i++) {
								current *= Math.pow(2, Math.random() - 0.52);
								spectrum[i] = current;
							}
							return spectrum;
						},
						(): number[] => {
							let current: number = 1.0;
							const spectrum: number[] = [current];
							for (let i = 1; i < Config.spectrumControlPoints; i++) {
								current *= Math.pow(2, Math.random() - 0.52);
								spectrum[i] = current * Math.random();
							}
							return spectrum;
						},
					];
					const generator = spectrumGenerators[(Math.random() * spectrumGenerators.length) | 0];
					const spectrum: number[] = generator();
					normalize(spectrum);
					for (let i: number = 0; i < Config.spectrumControlPoints; i++) {
						instrument.spectrumWave.spectrum[i] = Math.round(spectrum[i]);
					}
					instrument.spectrumWave.markCustomWaveDirty();
				} break;
				default: throw new Error("Unhandled noise instrument type in random generator.");
			}
		} else {
			const type: InstrumentType = selectWeightedRandom([
				{ item: InstrumentType.chip, weight: 4 },
				{ item: InstrumentType.pwm, weight: 4 },
				{ item: InstrumentType.harmonics, weight: 6 },
				{ item: InstrumentType.spectrum, weight: 1 },
				{ item: InstrumentType.fm, weight: 4 },
			]);
			instrument.preset = instrument.type = type;
			instrument.filterCutoff = selectCurvedDistribution(2, Config.filterCutoffRange - 1, 7, 1.5);
			instrument.filterResonance = selectCurvedDistribution(0, Config.filterResonanceRange - 1, 1, 2);
			instrument.filterEnvelope = Config.envelopes.dictionary[selectWeightedRandom([
				{ item: "steady", weight: 10 },
				{ item: "punch", weight: 6 },
				{ item: "flare 1", weight: 2 },
				{ item: "flare 2", weight: 4 },
				{ item: "flare 3", weight: 2 },
				{ item: "twang 1", weight: 2 },
				{ item: "twang 2", weight: 4 },
				{ item: "twang 3", weight: 4 },
				{ item: "swell 1", weight: 4 },
				{ item: "swell 2", weight: 2 },
				{ item: "swell 3", weight: 1 },
				{ item: "tremolo1", weight: 1 },
				{ item: "tremolo2", weight: 1 },
				{ item: "tremolo3", weight: 1 },
				{ item: "tremolo4", weight: 1 },
				{ item: "tremolo5", weight: 1 },
				{ item: "tremolo6", weight: 1 },
				{ item: "decay 1", weight: 1 },
				{ item: "decay 2", weight: 2 },
				{ item: "decay 3", weight: 2 },
			])].index;
			instrument.transition = Config.transitions.dictionary[selectWeightedRandom([
				{ item: "seamless", weight: 1 },
				{ item: "hard", weight: 4 },
				{ item: "soft", weight: 4 },
				{ item: "slide", weight: 2 },
				{ item: "cross fade", weight: 4 },
				{ item: "hard fade", weight: 4 },
				{ item: "medium fade", weight: 2 },
				{ item: "soft fade", weight: 2 },
			])].index;
			instrument.effects = Config.effectsNames.indexOf(selectWeightedRandom([
				{ item: "none", weight: 1 },
				{ item: "reverb", weight: 10 },
				{ item: "chorus", weight: 2 },
				{ item: "chorus & reverb", weight: 2 },
			]));
			instrument.chord = Config.chords.dictionary[selectWeightedRandom([
				{ item: "harmony", weight: 7 },
				{ item: "strum", weight: 2 },
				{ item: "arpeggio", weight: 1 },
			])].index;
			if (type != InstrumentType.spectrum) {
				instrument.vibrato = Config.vibratos.dictionary[selectWeightedRandom([
					{ item: "none", weight: 6 },
					{ item: "light", weight: 2 },
					{ item: "delayed", weight: 2 },
					{ item: "heavy", weight: 1 },
					{ item: "shaky", weight: 2 },
				])].index;
			}
			if (type == InstrumentType.chip || type == InstrumentType.harmonics) {
				instrument.interval = Config.intervals.dictionary[selectWeightedRandom([
					{ item: "union", weight: 10 },
					{ item: "shimmer", weight: 5 },
					{ item: "hum", weight: 4 },
					{ item: "honky tonk", weight: 3 },
					{ item: "dissonant", weight: 1 },
					{ item: "fifth", weight: 1 },
					{ item: "octave", weight: 2 },
					{ item: "bowed", weight: 2 },
					{ item: "piano", weight: 5 },
				])].index;
			}
			function normalize(harmonics: number[]): void {
				let max: number = 0;
				for (const value of harmonics) {
					if (value > max) max = value;
				}
				for (let i: number = 0; i < harmonics.length; i++) {
					harmonics[i] = Config.harmonicsMax * harmonics[i] / max;
				}
			}
			switch (type) {
				case InstrumentType.chip: {
					instrument.chipWave = (Math.random() * Config.chipWaves.length) | 0;
				} break;
				case InstrumentType.pwm: {
					instrument.pulseEnvelope = Config.envelopes.dictionary[selectWeightedRandom([
						{ item: "steady", weight: 10 },
						{ item: "punch", weight: 6 },
						{ item: "flare 1", weight: 2 },
						{ item: "flare 2", weight: 4 },
						{ item: "flare 3", weight: 2 },
						{ item: "twang 1", weight: 4 },
						{ item: "twang 2", weight: 4 },
						{ item: "twang 3", weight: 4 },
						{ item: "swell 1", weight: 4 },
						{ item: "swell 2", weight: 4 },
						{ item: "swell 3", weight: 4 },
						{ item: "tremolo1", weight: 1 },
						{ item: "tremolo2", weight: 1 },
						{ item: "tremolo3", weight: 1 },
						{ item: "tremolo4", weight: 2 },
						{ item: "tremolo5", weight: 2 },
						{ item: "tremolo6", weight: 2 },
						{ item: "decay 1", weight: 2 },
						{ item: "decay 2", weight: 2 },
						{ item: "decay 3", weight: 2 },
					])].index;
					instrument.pulseWidth = selectCurvedDistribution(0, Config.pulseWidthRange - 1, Config.pulseWidthRange - 1, 2);
				} break;
				case InstrumentType.harmonics: {
					const harmonicGenerators: Function[] = [
						(): number[] => {
							const harmonics: number[] = [];
							for (let i: number = 0; i < Config.harmonicsControlPoints; i++) {
								harmonics[i] = (Math.random() < 0.4) ? Math.random() : 0.0;
							}
							harmonics[(Math.random() * 8) | 0] = Math.pow(Math.random(), 0.25);
							return harmonics;
						},
						(): number[] => {
							let current: number = 1.0;
							const harmonics: number[] = [current];
							for (let i = 1; i < Config.harmonicsControlPoints; i++) {
								current *= Math.pow(2, Math.random() - 0.55);
								harmonics[i] = current;
							}
							return harmonics;
						},
						(): number[] => {
							let current: number = 1.0;
							const harmonics: number[] = [current];
							for (let i = 1; i < Config.harmonicsControlPoints; i++) {
								current *= Math.pow(2, Math.random() - 0.55);
								harmonics[i] = current * Math.random();
							}
							return harmonics;
						},
					];
					const generator = harmonicGenerators[(Math.random() * harmonicGenerators.length) | 0];
					const harmonics: number[] = generator();
					normalize(harmonics);
					for (let i: number = 0; i < Config.harmonicsControlPoints; i++) {
						instrument.harmonicsWave.harmonics[i] = Math.round(harmonics[i]);
					}
					instrument.harmonicsWave.markCustomWaveDirty();
				} break;
				case InstrumentType.spectrum: {
					const spectrum: number[] = [];
					for (let i: number = 0; i < Config.spectrumControlPoints; i++) {
						const isHarmonic: boolean = i == 0 || i == 7 || i == 11 || i == 14 || i == 16 || i == 18 || i == 21;
						if (isHarmonic) {
							spectrum[i] = Math.pow(Math.random(), 0.25);
						} else {
							spectrum[i] = Math.pow(Math.random(), 3) * 0.5;
						}
					}
					normalize(spectrum);
					for (let i: number = 0; i < Config.spectrumControlPoints; i++) {
						instrument.spectrumWave.spectrum[i] = Math.round(spectrum[i]);
					}
					instrument.spectrumWave.markCustomWaveDirty();
				} break;
				case InstrumentType.fm: {
					instrument.algorithm = (Math.random() * Config.algorithms.length) | 0;
					instrument.feedbackType = (Math.random() * Config.feedbacks.length) | 0;
					const algorithm: Algorithm = Config.algorithms[instrument.algorithm];
					for (let i: number = 0; i < algorithm.carrierCount; i++) {
						instrument.operators[i].frequency = selectCurvedDistribution(0, Config.operatorFrequencies.length - 1, 0, 3);
						instrument.operators[i].amplitude = selectCurvedDistribution(0, Config.operatorAmplitudeMax, Config.operatorAmplitudeMax - 1, 2);
						instrument.operators[i].envelope = Config.envelopes.dictionary["custom"].index;
					}
					for (let i: number = algorithm.carrierCount; i < Config.operatorCount; i++) {
						instrument.operators[i].frequency = selectCurvedDistribution(3, Config.operatorFrequencies.length - 1, 0, 3);
						instrument.operators[i].amplitude = (Math.pow(Math.random(), 2) * Config.operatorAmplitudeMax) | 0;
						instrument.operators[i].envelope = Config.envelopes.dictionary[selectWeightedRandom([
							{ item: "steady", weight: 6 },
							{ item: "punch", weight: 2 },
							{ item: "flare 1", weight: 2 },
							{ item: "flare 2", weight: 2 },
							{ item: "flare 3", weight: 2 },
							{ item: "twang 1", weight: 2 },
							{ item: "twang 2", weight: 2 },
							{ item: "twang 3", weight: 2 },
							{ item: "swell 1", weight: 2 },
							{ item: "swell 2", weight: 2 },
							{ item: "swell 3", weight: 2 },
							{ item: "tremolo1", weight: 1 },
							{ item: "tremolo2", weight: 1 },
							{ item: "tremolo3", weight: 1 },
							{ item: "tremolo4", weight: 1 },
							{ item: "tremolo5", weight: 1 },
							{ item: "tremolo6", weight: 1 },
							{ item: "decay 1", weight: 1 },
							{ item: "decay 2", weight: 1 },
							{ item: "decay 3", weight: 1 },
						])].index;
					}
					instrument.feedbackAmplitude = (Math.pow(Math.random(), 3) * Config.operatorAmplitudeMax) | 0;
					instrument.feedbackEnvelope = Config.envelopes.dictionary[selectWeightedRandom([
						{ item: "steady", weight: 4 },
						{ item: "punch", weight: 2 },
						{ item: "flare 1", weight: 2 },
						{ item: "flare 2", weight: 2 },
						{ item: "flare 3", weight: 2 },
						{ item: "twang 1", weight: 2 },
						{ item: "twang 2", weight: 2 },
						{ item: "twang 3", weight: 2 },
						{ item: "swell 1", weight: 2 },
						{ item: "swell 2", weight: 2 },
						{ item: "swell 3", weight: 2 },
						{ item: "tremolo1", weight: 1 },
						{ item: "tremolo2", weight: 1 },
						{ item: "tremolo3", weight: 1 },
						{ item: "tremolo4", weight: 1 },
						{ item: "tremolo5", weight: 1 },
						{ item: "tremolo6", weight: 1 },
						{ item: "decay 1", weight: 1 },
						{ item: "decay 2", weight: 1 },
						{ item: "decay 3", weight: 1 },
					])].index;
				} break;
				default: throw new Error("Unhandled pitched instrument type in random generator.");
			}
		}

		doc.notifier.changed();
		this._didSomething();
	}
}

export class ChangeTransition extends Change {
	constructor(doc: SongDocument, newValue: number) {
		super();
		const instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
		const oldValue: number = instrument.transition;
		if (oldValue != newValue) {
			this._didSomething();
			instrument.transition = newValue;
			instrument.preset = instrument.type;
			doc.notifier.changed();
		}
	}
}

export class ChangeEffects extends Change {
	constructor(doc: SongDocument, newValue: number) {
		super();
		const instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
		const oldValue: number = instrument.effects;
		if (oldValue != newValue) {
			this._didSomething();
			instrument.effects = newValue;
			instrument.preset = instrument.type;
			doc.notifier.changed();
		}
	}
}

export class ChangePatternNumbers extends Change {
	constructor(doc: SongDocument, value: number, startBar: number, startChannel: number, width: number, height: number) {
		super();
		if (value > doc.song.patternsPerChannel) throw new Error("invalid pattern");

		for (let bar: number = startBar; bar < startBar + width; bar++) {
			for (let channel: number = startChannel; channel < startChannel + height; channel++) {
				if (doc.song.channels[channel].bars[bar] != value) {
					doc.song.channels[channel].bars[bar] = value;
					this._didSomething();
				}
			}
		}

		doc.notifier.changed();
	}
}

export class ChangeBarCount extends Change {
	constructor(doc: SongDocument, newValue: number, atBeginning: boolean) {
		super();
		if (doc.song.barCount != newValue) {
			for (const channel of doc.song.channels) {
				if (atBeginning) {
					while (channel.bars.length < newValue) {
						channel.bars.unshift(0);
					}
					if (doc.song.barCount > newValue) {
						channel.bars.splice(0, doc.song.barCount - newValue);
					}
				} else {
					while (channel.bars.length < newValue) {
						channel.bars.push(0);
					}
					channel.bars.length = newValue;
				}
			}

			if (atBeginning) {
				const diff: number = newValue - doc.song.barCount;
				doc.bar = Math.max(0, doc.bar + diff);
				if (diff < 0 || doc.barScrollPos > 0) {
					doc.barScrollPos = Math.max(0, doc.barScrollPos + diff);
				}
				doc.song.loopStart = Math.max(0, doc.song.loopStart + diff);
			}
			doc.bar = Math.min(doc.bar, newValue - 1);
			doc.barScrollPos = Math.max(0, Math.min(newValue - doc.trackVisibleBars, doc.barScrollPos));
			doc.song.loopLength = Math.min(newValue, doc.song.loopLength);
			doc.song.loopStart = Math.min(newValue - doc.song.loopLength, doc.song.loopStart);
			doc.song.barCount = newValue;
			doc.notifier.changed();

			this._didSomething();
		}
	}
}

export class ChangeInsertBars extends Change {
	constructor(doc: SongDocument, start: number, count: number) {
		super();

		const newLength: number = Math.min(Config.barCountMax, doc.song.barCount + count);
		count = newLength - doc.song.barCount;
		if (count == 0) return;

		for (const channel of doc.song.channels) {
			while (channel.bars.length < newLength) {
				channel.bars.splice(start, 0, 0);
			}
		}
		doc.song.barCount = newLength;

		doc.bar += count;
		doc.barScrollPos = Math.min(newLength - doc.trackVisibleBars, doc.barScrollPos + count);
		if (doc.song.loopStart >= start) {
			doc.song.loopStart += count;
		} else if (doc.song.loopStart + doc.song.loopLength >= start) {
			doc.song.loopLength += count;
		}

		doc.notifier.changed();
		this._didSomething();
	}
}

export class ChangeDeleteBars extends Change {
	constructor(doc: SongDocument, start: number, count: number) {
		super();

		for (const channel of doc.song.channels) {
			channel.bars.splice(start, count);
			if (channel.bars.length == 0) channel.bars.push(0);
		}
		doc.song.barCount = Math.max(1, doc.song.barCount - count);

		doc.bar = Math.max(0, doc.bar - count);

		doc.barScrollPos = Math.max(0, doc.barScrollPos - count);
		if (doc.song.loopStart >= start) {
			doc.song.loopStart = Math.max(0, doc.song.loopStart - count);
		} else if (doc.song.loopStart + doc.song.loopLength > start) {
			doc.song.loopLength -= count;
		}
		doc.song.loopLength = Math.max(1, Math.min(doc.song.barCount - doc.song.loopStart, doc.song.loopLength));

		doc.notifier.changed();
		this._didSomething();
	}
}

export class ChangeLimiterSettings extends Change {
	constructor(doc: SongDocument, limitRatio: number, compressionRatio: number, limitThreshold: number, compressionThreshold: number, limitRise: number, limitDecay: number, masterGain: number) {
		super();

		// This check causes issues with the state change handler because it gets superceded by whenupdated when the limiter prompt closes for some reason, causing the state to revert. I think it's because the notifier change needs to happen right as the prompt closes.
		//if (limitRatio != doc.song.limitRatio || compressionRatio != doc.song.compressionRatio || limitThreshold != doc.song.limitThreshold || compressionThreshold != doc.song.compressionThreshold || limitRise != doc.song.limitRise || limitDecay != doc.song.limitDecay) {

		doc.song.limitRatio = limitRatio;
		doc.song.compressionRatio = compressionRatio;
		doc.song.limitThreshold = limitThreshold;
		doc.song.compressionThreshold = compressionThreshold;
		doc.song.limitRise = limitRise;
		doc.song.limitDecay = limitDecay;
		doc.song.masterGain = masterGain;

		doc.notifier.changed();
		this._didSomething();
		//}
	}
}

export class ChangeChannelOrder extends Change {
	constructor(doc: SongDocument, firstChannelIdx: number, secondChannelIdx: number) {
		super();
		// Change the order of two channels by swapping.
		let toSwap = doc.song.channels[firstChannelIdx];
		doc.song.channels[firstChannelIdx] = doc.song.channels[secondChannelIdx];
		doc.song.channels[secondChannelIdx] = toSwap;

		// Update mods for each channel
		for (let channel: number = doc.song.pitchChannelCount + doc.song.noiseChannelCount; channel < doc.song.getChannelCount(); channel++) {
			for (let instrumentIdx: number = 0; instrumentIdx < doc.song.instrumentsPerChannel; instrumentIdx++) {
				let instrument: Instrument = doc.song.channels[channel].instruments[instrumentIdx];
				for (let i: number = 0; i < Config.modCount; i++) {
					let channelOffset: number = (instrument.modStatuses[i] == ModStatus.msForNoise ? doc.song.pitchChannelCount : 0);
					if (instrument.modChannels[i] + channelOffset == firstChannelIdx) {
						instrument.modChannels[i] = secondChannelIdx - channelOffset;
					}
					else if (instrument.modChannels[i] + channelOffset == secondChannelIdx) {
						instrument.modChannels[i] = firstChannelIdx - channelOffset;
					}
				}
			}
		}

		doc.notifier.changed();
		this._didSomething();

	}
}

export class ChangeChannelCount extends Change {
	constructor(doc: SongDocument, newPitchChannelCount: number, newNoiseChannelCount: number, newModChannelCount: number) {
		super();
		if (doc.song.pitchChannelCount != newPitchChannelCount || doc.song.noiseChannelCount != newNoiseChannelCount || doc.song.modChannelCount != newModChannelCount) {
			const newChannels: Channel[] = [];

			function changeGroup(newCount: number, oldCount: number, newStart: number, oldStart: number, octave: number, isNoise: boolean, isMod: boolean): void {
				for (let i: number = 0; i < newCount; i++) {
					const channel = i + newStart;
					const oldChannel = i + oldStart;
					if (i < oldCount) {
						newChannels[channel] = doc.song.channels[oldChannel];
					} else {
						newChannels[channel] = new Channel();
						newChannels[channel].octave = octave;
						for (let j: number = 0; j < doc.song.instrumentsPerChannel; j++) {
							const instrument: Instrument = new Instrument(isNoise, isMod);
							const presetValue: number = pickRandomPresetValue(isNoise);
							const preset: Preset = EditorConfig.valueToPreset(presetValue)!;
							instrument.fromJsonObject(preset.settings, isNoise, isMod, doc.song.rhythm == 0 || doc.song.rhythm == 2, doc.song.rhythm >= 2);
							instrument.preset = presetValue;
							newChannels[channel].instruments[j] = instrument;
						}
						for (let j: number = 0; j < doc.song.patternsPerChannel; j++) {
							newChannels[channel].patterns[j] = new Pattern();
						}
						for (let j: number = 0; j < doc.song.barCount; j++) {
							newChannels[channel].bars[j] = 0;
						}
					}
				}
			}

			changeGroup(newPitchChannelCount, doc.song.pitchChannelCount, 0, 0, 2, false, false);
			changeGroup(newNoiseChannelCount, doc.song.noiseChannelCount, newPitchChannelCount, doc.song.pitchChannelCount, 0, true, false);
			changeGroup(newModChannelCount, doc.song.modChannelCount, newNoiseChannelCount + newPitchChannelCount, doc.song.pitchChannelCount + doc.song.noiseChannelCount, 0, false, true);

			doc.song.pitchChannelCount = newPitchChannelCount;
			doc.song.noiseChannelCount = newNoiseChannelCount;
			doc.song.modChannelCount = newModChannelCount;

			for (let channel: number = 0; channel < doc.song.getChannelCount(); channel++) {
				doc.song.channels[channel] = newChannels[channel];
			}
			doc.song.channels.length = doc.song.getChannelCount();

			doc.channel = Math.min(doc.channel, newPitchChannelCount + newNoiseChannelCount + newModChannelCount - 1);

			// Determine if any mod instruments now refer to an invalid channel. Unset them if so
			for (let channel: number = doc.song.pitchChannelCount + doc.song.noiseChannelCount; channel < doc.song.getChannelCount(); channel++) {
				for (let instrumentIdx: number = 0; instrumentIdx < doc.song.instrumentsPerChannel; instrumentIdx++) {
					for (let mod: number = 0; mod < Config.modCount; mod++) {

						let instrument: Instrument = doc.song.channels[channel].instruments[instrumentIdx];
						let modStatus: number = instrument.modStatuses[mod];
						let modChannel: number = instrument.modChannels[mod] + ((modStatus == ModStatus.msForNoise) ? doc.song.pitchChannelCount : 0);

						// Boundary checking
						if (modChannel >= doc.song.pitchChannelCount && (modStatus == ModStatus.msForPitch)) {
							modStatus = ModStatus.msNone;
							instrument.modStatuses[mod] = ModStatus.msNone;
							instrument.modSettings[mod] = ModSetting.mstNone;
						}
						if (modChannel >= doc.song.pitchChannelCount + doc.song.noiseChannelCount && (modStatus == ModStatus.msForNoise)) {
							instrument.modStatuses[mod] = ModStatus.msNone;
							instrument.modSettings[mod] = ModSetting.mstNone;
						}

					}
				}
			}

			doc.notifier.changed();

			ColorConfig.resetColors();

			this._didSomething();
		}
	}
}

export class ChangeChannelBar extends Change {
	constructor(doc: SongDocument, newChannel: number, newBar: number, silently: boolean = false) {
		super();
		const oldChannel: number = doc.channel;
		const oldBar: number = doc.bar;
		doc.channel = newChannel;
		doc.bar = newBar;
		if (!silently) {
			doc.barScrollPos = Math.min(doc.bar, Math.max(doc.bar - (doc.trackVisibleBars - 1), doc.barScrollPos));
		}
		doc.notifier.changed();
		if (oldChannel != newChannel || oldBar != newBar) {
			this._didSomething();
		}
	}
}

export class ChangeInterval extends Change {
	constructor(doc: SongDocument, newValue: number) {
		super();
		const instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
		const oldValue: number = instrument.interval;
		if (oldValue != newValue) {
			this._didSomething();
			instrument.interval = newValue;
			instrument.preset = instrument.type;
			doc.notifier.changed();
		}
	}
}

export class ChangeChord extends Change {
	constructor(doc: SongDocument, newValue: number) {
		super();
		const instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
		const oldValue: number = instrument.chord;
		if (oldValue != newValue) {
			this._didSomething();
			instrument.chord = newValue;
			instrument.preset = instrument.type;
			doc.notifier.changed();
		}
	}
}

export class ChangeVibrato extends Change {
	constructor(doc: SongDocument, newValue: number) {
		super();
		const instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
		const oldValue: number = instrument.vibrato;
		if (oldValue != newValue) {
			instrument.vibrato = newValue;
			instrument.vibratoDepth = Config.vibratos[instrument.vibrato].amplitude;
			instrument.vibratoDelay = Config.vibratos[instrument.vibrato].delayParts;
			instrument.vibratoSpeed = 10; // default
			instrument.vibratoType = Config.vibratos[instrument.vibrato].type;
			instrument.preset = instrument.type;
			doc.notifier.changed();
			this._didSomething();
		}
	}
}

export class ChangeVibratoDepth extends Change {
	constructor(doc: SongDocument, oldValue: number, newValue: number) {
		super();
		const instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
		let prevVibrato: number = instrument.vibrato;
		doc.synth.unsetMod(ModSetting.mstVibratoDepth, doc.channel, doc.getCurrentInstrument());

		doc.notifier.changed();
		if (oldValue != newValue || prevVibrato != Config.vibratos.length) {
			instrument.vibratoDepth = newValue / 25;
			instrument.vibrato = Config.vibratos.length; // Custom
			doc.notifier.changed();
			this._didSomething();
		}
	}
}

export class ChangeVibratoSpeed extends Change {
	constructor(doc: SongDocument, oldValue: number, newValue: number) {
		super();
		const instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
		let prevVibrato: number = instrument.vibrato;
		doc.synth.unsetMod(ModSetting.mstVibratoSpeed, doc.channel, doc.getCurrentInstrument());

		doc.notifier.changed();
		if (oldValue != newValue || prevVibrato != Config.vibratos.length) {
			instrument.vibratoSpeed = newValue;
			instrument.vibrato = Config.vibratos.length; // Custom
			doc.notifier.changed();
			this._didSomething();
		}
	}
}

export class ChangeVibratoDelay extends Change {
	constructor(doc: SongDocument, oldValue: number, newValue: number) {
		super();
		const instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
		let prevVibrato: number = instrument.vibrato;
		doc.synth.unsetMod(ModSetting.mstVibratoDelay, doc.channel, doc.getCurrentInstrument());

		doc.notifier.changed();
		if (oldValue != newValue || prevVibrato != Config.vibratos.length) {
			instrument.vibratoDelay = newValue;
			instrument.vibrato = Config.vibratos.length; // Custom
			doc.notifier.changed();
			this._didSomething();
		}
	}
}

export class ChangeVibratoType extends Change {
	constructor(doc: SongDocument, newValue: number) {
		super();
		const instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
		const oldValue: number = instrument.vibratoType;
		let prevVibrato: number = instrument.vibrato;

		doc.notifier.changed();
		if (oldValue != newValue || prevVibrato != Config.vibratos.length) {
			instrument.vibratoType = newValue;
			instrument.vibrato = Config.vibratos.length; // Custom
			doc.notifier.changed();
			this._didSomething();
		}
	}
}

export class ChangeArpeggioSpeed extends Change {
	constructor(doc: SongDocument, oldValue: number, newValue: number) {
		super();
		const instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
		instrument.arpeggioSpeed = newValue;
		doc.synth.unsetMod(ModSetting.mstArpeggioSpeed, doc.channel, doc.getCurrentInstrument());

		doc.notifier.changed();
		if (oldValue != newValue) this._didSomething();
	}
}

export class ChangeFastTwoNoteArp extends Change {
	constructor(doc: SongDocument, newValue: boolean) {
		super();
		const instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
		const oldValue = instrument.fastTwoNoteArp;

		doc.notifier.changed();
		if (oldValue != newValue) {
			instrument.fastTwoNoteArp = newValue;
			this._didSomething();
		}
	}
}

export class ChangeTieNoteTransition extends Change {
	constructor(doc: SongDocument, newValue: boolean) {
		super();
		const instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
		const oldValue = instrument.tieNoteTransition;

		doc.notifier.changed();
		if (oldValue != newValue) {
			instrument.tieNoteTransition = newValue;
			this._didSomething();
		}
	}
}

export class ChangeClicklessTransition extends Change {
	constructor(doc: SongDocument, newValue: boolean) {
		super();
		const instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
		const oldValue = instrument.clicklessTransition;

		doc.notifier.changed();
		if (oldValue != newValue) {
			instrument.clicklessTransition = newValue;
			this._didSomething();
		}
	}
}

export class ChangeSpectrum extends Change {
	constructor(doc: SongDocument, instrument: Instrument, spectrumWave: SpectrumWave) {
		super();
		spectrumWave.markCustomWaveDirty();
		instrument.preset = instrument.type;
		doc.notifier.changed();
		this._didSomething();
	}
}

export class ChangeHarmonics extends Change {
	constructor(doc: SongDocument, instrument: Instrument, harmonicsWave: HarmonicsWave) {
		super();
		harmonicsWave.markCustomWaveDirty();
		instrument.preset = instrument.type;
		doc.notifier.changed();
		this._didSomething();
	}
}

export class ChangeDrumsetEnvelope extends Change {
	constructor(doc: SongDocument, drumIndex: number, newValue: number) {
		super();
		const instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
		const oldValue: number = instrument.drumsetEnvelopes[drumIndex];
		if (oldValue != newValue) {
			instrument.drumsetEnvelopes[drumIndex] = newValue;
			instrument.preset = instrument.type;
			doc.notifier.changed();
			this._didSomething();
		}
	}
}

class ChangeInstrumentSlider extends Change {
	protected _instrument: Instrument;
	constructor(private _doc: SongDocument) {
		super();
		this._instrument = this._doc.song.channels[this._doc.channel].instruments[this._doc.getCurrentInstrument()];
	}

	public commit(): void {
		if (!this.isNoop()) {
			this._instrument.preset = this._instrument.type;
			this._doc.notifier.changed();
		}
	}
}

export class ChangePulseWidth extends ChangeInstrumentSlider {
	constructor(doc: SongDocument, oldValue: number, newValue: number) {
		super(doc);
		this._instrument.pulseWidth = newValue;
		doc.synth.unsetMod(ModSetting.mstPulseWidth, doc.channel, doc.getCurrentInstrument());
		doc.notifier.changed();
		if (oldValue != newValue) this._didSomething();
	}
}

export class ChangePulseEnvelope extends Change {
	constructor(doc: SongDocument, newValue: number) {
		super();
		const instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
		const oldValue: number = instrument.pulseEnvelope;
		if (oldValue != newValue) {
			instrument.pulseEnvelope = newValue;
			instrument.preset = instrument.type;
			doc.notifier.changed();
			this._didSomething();
		}
	}
}

export class ChangeFilterCutoff extends ChangeInstrumentSlider {
	constructor(doc: SongDocument, oldValue: number, newValue: number) {
		super(doc);
		this._instrument.filterCutoff = newValue;
		doc.synth.unsetMod(ModSetting.mstFilterCut, doc.channel, doc.getCurrentInstrument());
		doc.notifier.changed();
		if (oldValue != newValue) this._didSomething();
	}
}

export class ChangeFilterResonance extends ChangeInstrumentSlider {
	constructor(doc: SongDocument, oldValue: number, newValue: number) {
		super(doc);
		this._instrument.filterResonance = newValue;
		doc.synth.unsetMod(ModSetting.mstFilterPeak, doc.channel, doc.getCurrentInstrument());
		doc.notifier.changed();
		if (oldValue != newValue) this._didSomething();
	}
}

export class ChangeFilterEnvelope extends Change {
	constructor(doc: SongDocument, newValue: number) {
		super();
		const instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
		const oldValue: number = instrument.filterEnvelope;
		if (oldValue != newValue) {
			instrument.filterEnvelope = newValue;
			instrument.preset = instrument.type;
			doc.notifier.changed();
			this._didSomething();
		}
	}
}

export class ChangeAlgorithm extends Change {
	constructor(doc: SongDocument, newValue: number) {
		super();
		const instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
		const oldValue: number = instrument.algorithm;
		if (oldValue != newValue) {
			instrument.algorithm = newValue;
			instrument.preset = instrument.type;
			doc.notifier.changed();
			this._didSomething();
		}
	}
}

export class ChangeFeedbackType extends Change {
	constructor(doc: SongDocument, newValue: number) {
		super();
		const instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
		const oldValue: number = instrument.feedbackType;
		if (oldValue != newValue) {
			instrument.feedbackType = newValue;
			instrument.preset = instrument.type;
			doc.notifier.changed();
			this._didSomething();
		}
	}
}

export class ChangeFeedbackEnvelope extends Change {
	constructor(doc: SongDocument, newValue: number) {
		super();
		const instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
		const oldValue: number = instrument.feedbackEnvelope;
		if (oldValue != newValue) {
			instrument.feedbackEnvelope = newValue;
			instrument.preset = instrument.type;
			doc.notifier.changed();
			this._didSomething();
		}
	}
}

export class ChangeOperatorEnvelope extends Change {
	constructor(doc: SongDocument, operatorIndex: number, newValue: number) {
		super();
		const instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
		const oldValue: number = instrument.operators[operatorIndex].envelope;
		if (oldValue != newValue) {
			instrument.operators[operatorIndex].envelope = newValue;
			instrument.preset = instrument.type;
			doc.notifier.changed();
			this._didSomething();
		}
	}
}

export class ChangeOperatorFrequency extends Change {
	constructor(doc: SongDocument, operatorIndex: number, newValue: number) {
		super();
		const instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
		const oldValue: number = instrument.operators[operatorIndex].frequency;
		if (oldValue != newValue) {
			instrument.operators[operatorIndex].frequency = newValue;
			instrument.preset = instrument.type;
			doc.notifier.changed();
			this._didSomething();
		}
	}
}

export class ChangeOperatorAmplitude extends ChangeInstrumentSlider {
	constructor(doc: SongDocument, operatorIndex: number, oldValue: number, newValue: number) {
		super(doc);
		this._instrument.operators[operatorIndex].amplitude = newValue;
		// Not used currently as mod is implemented as multiplicative
		//doc.synth.unsetMod(ModSetting.mstFMSlider1 + operatorIndex, doc.channel, doc.getCurrentInstrument());
		doc.notifier.changed();
		if (oldValue != newValue) this._didSomething();
	}
}

export class ChangeFeedbackAmplitude extends ChangeInstrumentSlider {
	constructor(doc: SongDocument, oldValue: number, newValue: number) {
		super(doc);
		this._instrument.feedbackAmplitude = newValue;
		// Not used currently as mod is implemented as multiplicative
		//doc.synth.unsetMod(ModSetting.mstFMFeedback, doc.channel, doc.getCurrentInstrument());
		doc.notifier.changed();
		if (oldValue != newValue) this._didSomething();
	}
}

export class ChangeInstrumentsPerChannel extends Change {
	constructor(doc: SongDocument, newInstrumentsPerChannel: number) {
		super();
		if (doc.song.instrumentsPerChannel != newInstrumentsPerChannel) {
			for (let channel: number = 0; channel < doc.song.getChannelCount(); channel++) {
				const sampleInstrument: Instrument = doc.song.channels[channel].instruments[doc.song.instrumentsPerChannel - 1];
				const sampleInstrumentJson: any = sampleInstrument.toJsonObject();
				for (let j: number = doc.song.instrumentsPerChannel; j < newInstrumentsPerChannel; j++) {
					const newInstrument: Instrument = new Instrument(doc.song.getChannelIsNoise(channel), doc.song.getChannelIsMod(channel));
					if (sampleInstrument.type == InstrumentType.mod) {
						// Doesn't really make sense to have two mod instruments with the same settings. Better to zero them out.
						newInstrument.setTypeAndReset(InstrumentType.mod, false, true);
					} else if (sampleInstrument.type == InstrumentType.drumset) {
						// Drumsets are kinda expensive in terms of url length, so don't just copy them willy-nilly.
						newInstrument.setTypeAndReset(InstrumentType.spectrum, true, false);
					} else {
						newInstrument.fromJsonObject(sampleInstrumentJson, doc.song.getChannelIsNoise(channel), doc.song.getChannelIsMod(channel), doc.song.rhythm == 0 || doc.song.rhythm == 2, doc.song.rhythm >= 2);
					}
					doc.song.channels[channel].instruments[j] = newInstrument;
				}
				doc.song.channels[channel].instruments.length = newInstrumentsPerChannel;
				for (let j: number = 0; j < doc.song.patternsPerChannel; j++) {
					if (doc.song.channels[channel].patterns[j].instrument >= newInstrumentsPerChannel) {
						doc.song.channels[channel].patterns[j].instrument = 0;
					}
				}
			}

			doc.song.instrumentsPerChannel = newInstrumentsPerChannel;

			// Determine if any mod instruments now refer to an invalid instrument number. Unset them if so
			for (let channel: number = doc.song.pitchChannelCount + doc.song.noiseChannelCount; channel < doc.song.getChannelCount(); channel++) {
				for (let instrumentIdx: number = 0; instrumentIdx < doc.song.instrumentsPerChannel; instrumentIdx++) {
					for (let mod: number = 0; mod < Config.modCount; mod++) {

						let instrument: Instrument = doc.song.channels[channel].instruments[instrumentIdx];
						let modInstrument: number = instrument.modInstruments[mod];

						// Boundary checking
						if (modInstrument >= doc.song.instrumentsPerChannel) {
							instrument.modInstruments[mod] = 0;
							instrument.modSettings[mod] = 0;
						}

					}
				}
			}

			doc.notifier.changed();
			this._didSomething();
		}
	}
}

export class ChangeKey extends Change {
	constructor(doc: SongDocument, newValue: number) {
		super();
		if (doc.song.key != newValue) {
			doc.song.key = newValue;
			doc.notifier.changed();
			this._didSomething();
		}
	}
}

export class ChangeLoop extends Change {
	constructor(private _doc: SongDocument, public oldStart: number, public oldLength: number, public newStart: number, public newLength: number) {
		super();
		this._doc.song.loopStart = this.newStart;
		this._doc.song.loopLength = this.newLength;
		this._doc.notifier.changed();
		if (this.oldStart != this.newStart || this.oldLength != this.newLength) {
			this._didSomething();
		}
	}
}

export class ChangePitchAdded extends UndoableChange {
	private _doc: SongDocument;
	private _note: Note;
	private _pitch: number;
	private _index: number;
	constructor(doc: SongDocument, note: Note, pitch: number, index: number, deletion: boolean = false) {
		super(deletion);
		this._doc = doc;
		this._note = note;
		this._pitch = pitch;
		this._index = index;
		this._didSomething();
		this.redo();
	}

	protected _doForwards(): void {
		this._note.pitches.splice(this._index, 0, this._pitch);
		this._doc.notifier.changed();
	}

	protected _doBackwards(): void {
		this._note.pitches.splice(this._index, 1);
		this._doc.notifier.changed();
	}
}

export class ChangeOctave extends Change {
	constructor(doc: SongDocument, public oldValue: number, newValue: number) {
		super();
		doc.song.channels[doc.channel].octave = newValue;
		doc.notifier.changed();
		if (oldValue != newValue) this._didSomething();
	}
}

export class ChangeRhythm extends ChangeGroup {
	constructor(doc: SongDocument, newValue: number) {
		super();

		if (doc.song.rhythm != newValue) {
			doc.song.rhythm = newValue;
			doc.notifier.changed();
			this._didSomething();
		}
	}
}

export class ChangePaste extends ChangeGroup {
	constructor(doc: SongDocument, pattern: Pattern, notes: any[], selectionStart: number, selectionEnd: number, oldPartDuration: number) {
		super();

		// Erase the current contents of the selection:
		this.append(new ChangeNoteTruncate(doc, pattern, selectionStart, selectionEnd, null, true));

		// Mods don't follow this sequence, so skipping for now.
		let noteInsertionIndex: number = 0;
		if (!doc.song.getChannelIsMod(doc.channel)) {
			for (let i: number = 0; i < pattern.notes.length; i++) {
				if (pattern.notes[i].start < selectionStart) {
					if (pattern.notes[i].end > selectionStart) throw new Error();

					noteInsertionIndex = i + 1;
				} else if (pattern.notes[i].start < selectionEnd) {
					throw new Error();
				}
			}
		}
		else {
			noteInsertionIndex = pattern.notes.length;
		}

		while (selectionStart < selectionEnd) {
			for (const noteObject of notes) {
				const noteStart: number = noteObject["start"] + selectionStart;
				const noteEnd: number = noteObject["end"] + selectionStart;
				if (noteStart >= selectionEnd) break;
				const note: Note = new Note(noteObject["pitches"][0], noteStart, noteEnd, noteObject["pins"][0]["volume"], false);
				note.pitches.length = 0;
				for (const pitch of noteObject["pitches"]) {
					note.pitches.push(pitch);
				}
				note.pins.length = 0;
				for (const pin of noteObject["pins"]) {
					note.pins.push(makeNotePin(pin.interval, pin.time, pin.volume));
				}
				pattern.notes.splice(noteInsertionIndex++, 0, note);
				if (note.end > selectionEnd) {
					this.append(new ChangeNoteLength(doc, note, note.start, selectionEnd));
				}
			}

			selectionStart += oldPartDuration;
		}

		doc.notifier.changed();
		this._didSomething();
	}
}

export class ChangePasteInstrument extends ChangeGroup {
	constructor(doc: SongDocument, instrument: Instrument, instrumentCopy: any) {
		super();
		instrument.fromJsonObject(instrumentCopy, instrumentCopy["isDrum"], instrumentCopy["isMod"], false, false);
		doc.notifier.changed();
		this._didSomething();
	}
}

export class ChangePatternInstrument extends Change {
	constructor(doc: SongDocument, newValue: number, pattern: Pattern) {
		super();
		if (pattern.instrument != newValue) {
			pattern.instrument = newValue;
			doc.notifier.changed();
			this._didSomething();
		}
	}
}

export class ChangeModChannel extends Change {
	constructor(doc: SongDocument, mod: number, index: number) {
		super();
		// Figure out if this is a pitch or noise mod, or "song" or "none"
		let stat: ModStatus = ModStatus.msNone;
		let channel: number = 0;
		let instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];

		if (index == 1) { // song
			stat = ModStatus.msForSong;
		}
		else if (index == 0) { // none
			stat = ModStatus.msNone;
		}
		else if (index < 2 + doc.song.pitchChannelCount) {
			stat = ModStatus.msForPitch;
			channel = index - 2;
		}
		else {
			stat = ModStatus.msForNoise;
			channel = index - doc.song.pitchChannelCount - 2;
		}

		if (instrument.modStatuses[mod] != stat || instrument.modChannels[mod] != channel) {

			instrument.modStatuses[mod] = stat;
			instrument.modChannels[mod] = channel;

			doc.notifier.changed();
			this._didSomething();
		}
	}
}

export class ChangeModInstrument extends Change {
	constructor(doc: SongDocument, mod: number, tgtInstrument: number) {
		super();

		let instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];

		if (instrument.modInstruments[mod] != tgtInstrument) {
			instrument.modInstruments[mod] = tgtInstrument;

			doc.notifier.changed();
			this._didSomething();
		}
	}
}

export class ChangeModSetting extends Change {
	constructor(doc: SongDocument, mod: number, text: string) {
		super();

		let setting: ModSetting = ModSetting.mstNone;
		let instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];

		switch (text) {
			case "song volume":
				setting = ModSetting.mstSongVolume;
				break;
			case "tempo":
				setting = ModSetting.mstTempo;
				break;
			case "reverb":
				setting = ModSetting.mstReverb;
				break;
			case "next bar":
				setting = ModSetting.mstNextBar;
				break;
			case "volume":
				setting = ModSetting.mstInsVolume;
				break;
			case "pan":
				setting = ModSetting.mstPan;
				break;
			case "filter cut":
				setting = ModSetting.mstFilterCut;
				break;
			case "filter peak":
				setting = ModSetting.mstFilterPeak;
				break;
			case "fm slider 1":
				setting = ModSetting.mstFMSlider1;
				break;
			case "fm slider 2":
				setting = ModSetting.mstFMSlider2;
				break;
			case "fm slider 3":
				setting = ModSetting.mstFMSlider3;
				break;
			case "fm slider 4":
				setting = ModSetting.mstFMSlider4;
				break;
			case "fm feedback":
				setting = ModSetting.mstFMFeedback;
				break;
			case "pulse width":
				setting = ModSetting.mstPulseWidth;
				break;
			case "detune":
				setting = ModSetting.mstDetune;
				break;
			case "vibrato depth":
				setting = ModSetting.mstVibratoDepth;
				break;
			case "vibrato speed":
				setting = ModSetting.mstVibratoSpeed;
				break;
			case "vibrato delay":
				setting = ModSetting.mstVibratoDelay;
				break;
			case "pan delay":
				setting = ModSetting.mstPanDelay;
				break;
			case "arpeggio speed":
				setting = ModSetting.mstArpeggioSpeed;
				break;
			case "reset arpeggio":
				setting = ModSetting.mstResetArpeggio;
				break;
			case "song detune":
				setting = ModSetting.mstSongDetune;
				break;
			case "none":
			default:
				break;
		}

		if (instrument.modSettings[mod] != setting) {

			instrument.modSettings[mod] = setting;

			// Go through each pattern where this instrument is set, and clean up any notes that are out of bounds
			let cap: number = doc.song.mstMaxVols.get(setting)!;

			for (let i: number = 0; i < doc.song.patternsPerChannel; i++) {
				const pattern: Pattern = doc.song.channels[doc.channel].patterns[i];
				if (pattern.instrument == doc.getCurrentInstrument()) {
					for (let j: number = 0; j < pattern.notes.length; j++) {
						const note: Note = pattern.notes[j];
						if (note.pitches[0] == Config.modCount - mod - 1) {
							for (let k: number = 0; k < note.pins.length; k++) {
								const pin: NotePin = note.pins[k];
								if (pin.volume > cap)
									pin.volume = cap;
							}
						}
					}
				}
			}

			doc.notifier.changed();
			this._didSomething();
		}
	}
}

export class ChangePatternsPerChannel extends Change {
	constructor(doc: SongDocument, newValue: number) {
		super();
		if (doc.song.patternsPerChannel != newValue) {
			for (let i: number = 0; i < doc.song.getChannelCount(); i++) {
				const channelBars: number[] = doc.song.channels[i].bars;
				const channelPatterns: Pattern[] = doc.song.channels[i].patterns;
				for (let j: number = 0; j < channelBars.length; j++) {
					if (channelBars[j] > newValue) channelBars[j] = 0;
				}
				for (let j: number = channelPatterns.length; j < newValue; j++) {
					channelPatterns[j] = new Pattern();
				}
				channelPatterns.length = newValue;
			}
			doc.song.patternsPerChannel = newValue;
			doc.notifier.changed();
			this._didSomething();
		}
	}
}

export class ChangeEnsurePatternExists extends UndoableChange {
	private _doc: SongDocument;
	private _bar: number;
	private _channel: number;
	private _patternIndex: number;
	private _patternOldNotes: Note[] | null = null;
	private _oldPatternCount: number;
	private _newPatternCount: number;

	constructor(doc: SongDocument, channel: number, bar: number) {
		super(false);
		const song: Song = doc.song;
		if (song.channels[channel].bars[bar] != 0) return;

		this._doc = doc;
		this._bar = bar;
		this._channel = channel;
		this._oldPatternCount = song.patternsPerChannel;
		this._newPatternCount = song.patternsPerChannel;

		let firstEmptyUnusedIndex: number | null = null;
		let firstUnusedIndex: number | null = null;
		for (let patternIndex: number = 1; patternIndex <= song.patternsPerChannel; patternIndex++) {
			let used = false;
			for (let barIndex: number = 0; barIndex < song.barCount; barIndex++) {
				if (song.channels[channel].bars[barIndex] == patternIndex) {
					used = true;
					break;
				}
			}
			if (used) continue;
			if (firstUnusedIndex == null) {
				firstUnusedIndex = patternIndex;
			}
			const pattern: Pattern = song.channels[channel].patterns[patternIndex - 1];
			if (pattern.notes.length == 0) {
				firstEmptyUnusedIndex = patternIndex;
				break;
			}
		}

		if (firstEmptyUnusedIndex != null) {
			this._patternIndex = firstEmptyUnusedIndex;
		} else if (song.patternsPerChannel < song.barCount) {
			this._newPatternCount = song.patternsPerChannel + 1;
			this._patternIndex = song.patternsPerChannel + 1;
		} else if (firstUnusedIndex != null) {
			this._patternIndex = firstUnusedIndex;
			this._patternOldNotes = song.channels[channel].patterns[firstUnusedIndex - 1].notes;
		} else {
			throw new Error();
		}

		this._didSomething();
		this._doForwards();
	}

	protected _doForwards(): void {
		const song: Song = this._doc.song;
		for (let j: number = song.patternsPerChannel; j < this._newPatternCount; j++) {
			for (let i: number = 0; i < song.getChannelCount(); i++) {
				song.channels[i].patterns[j] = new Pattern();
			}
		}
		song.patternsPerChannel = this._newPatternCount;
		const pattern: Pattern = song.channels[this._channel].patterns[this._patternIndex - 1];
		pattern.notes = [];
		song.channels[this._channel].bars[this._bar] = this._patternIndex;
		this._doc.notifier.changed();
	}

	protected _doBackwards(): void {
		const song: Song = this._doc.song;
		const pattern: Pattern = song.channels[this._channel].patterns[this._patternIndex - 1];
		if (this._patternOldNotes != null) pattern.notes = this._patternOldNotes;
		song.channels[this._channel].bars[this._bar] = 0;
		for (let i: number = 0; i < song.getChannelCount(); i++) {
			song.channels[i].patterns.length = this._oldPatternCount;
		}
		song.patternsPerChannel = this._oldPatternCount;
		this._doc.notifier.changed();
	}
}

export class ChangePinTime extends ChangePins {
	constructor(doc: SongDocument | null, note: Note, pinIndex: number, shiftedTime: number) {
		super(doc, note);

		shiftedTime -= this._oldStart;
		const originalTime: number = this._oldPins[pinIndex].time;
		const skipStart: number = Math.min(originalTime, shiftedTime);
		const skipEnd: number = Math.max(originalTime, shiftedTime);
		let setPin: boolean = false;
		for (let i: number = 0; i < this._oldPins.length; i++) {
			const oldPin: NotePin = note.pins[i];
			const time: number = oldPin.time;
			if (time < skipStart) {
				this._newPins.push(makeNotePin(oldPin.interval, time, oldPin.volume));
			} else if (time > skipEnd) {
				if (!setPin) {
					this._newPins.push(makeNotePin(this._oldPins[pinIndex].interval, shiftedTime, this._oldPins[pinIndex].volume));
					setPin = true;
				}
				this._newPins.push(makeNotePin(oldPin.interval, time, oldPin.volume));
			}
		}
		if (!setPin) {
			this._newPins.push(makeNotePin(this._oldPins[pinIndex].interval, shiftedTime, this._oldPins[pinIndex].volume));
		}

		this._finishSetup();
	}
}

export class ChangePitchBend extends ChangePins {
	constructor(doc: SongDocument | null, note: Note, bendStart: number, bendEnd: number, bendTo: number, pitchIndex: number) {
		super(doc, note);

		bendStart -= this._oldStart;
		bendEnd -= this._oldStart;
		bendTo -= note.pitches[pitchIndex];

		let setStart: boolean = false;
		let setEnd: boolean = false;
		let prevInterval: number = 0;
		let prevVolume: number = 3;
		let persist: boolean = true;
		let i: number;
		let direction: number;
		let stop: number;
		let push: (item: NotePin) => void;
		if (bendEnd > bendStart) {
			i = 0;
			direction = 1;
			stop = note.pins.length;
			push = (item: NotePin) => { this._newPins.push(item); };
		} else {
			i = note.pins.length - 1;
			direction = -1;
			stop = -1;
			push = (item: NotePin) => { this._newPins.unshift(item); };
		}
		for (; i != stop; i += direction) {
			const oldPin: NotePin = note.pins[i];
			const time: number = oldPin.time;
			for (; ;) {
				if (!setStart) {
					if (time * direction <= bendStart * direction) {
						prevInterval = oldPin.interval;
						prevVolume = oldPin.volume;
					}
					if (time * direction < bendStart * direction) {
						push(makeNotePin(oldPin.interval, time, oldPin.volume));
						break;
					} else {
						push(makeNotePin(prevInterval, bendStart, prevVolume));
						setStart = true;
					}
				} else if (!setEnd) {
					if (time * direction <= bendEnd * direction) {
						prevInterval = oldPin.interval;
						prevVolume = oldPin.volume;
					}
					if (time * direction < bendEnd * direction) {
						break;
					} else {
						push(makeNotePin(bendTo, bendEnd, prevVolume));
						setEnd = true;
					}
				} else {
					if (time * direction == bendEnd * direction) {
						break;
					} else {
						if (oldPin.interval != prevInterval) persist = false;
						push(makeNotePin(persist ? bendTo : oldPin.interval, time, oldPin.volume));
						break;
					}
				}
			}
		}
		if (!setEnd) {
			push(makeNotePin(bendTo, bendEnd, prevVolume));
		}

		this._finishSetup();
	}
}

export class ChangePatternRhythm extends ChangeSequence {
	constructor(doc: SongDocument, pattern: Pattern) {
		super();
		const minDivision: number = Config.partsPerBeat / Config.rhythms[doc.song.rhythm].stepsPerBeat;

		const changeRhythm: (oldTime: number) => number = function (oldTime: number): number {
			let thresholds: number[] | null = Config.rhythms[doc.song.rhythm].roundUpThresholds;
			if (thresholds != null) {
				const beatStart: number = Math.floor(oldTime / Config.partsPerBeat) * Config.partsPerBeat;
				const remainder: number = oldTime - beatStart;
				let newTime: number = beatStart;
				for (const threshold of thresholds) {
					if (remainder >= threshold) {
						newTime += minDivision;
					} else {
						break;
					}
				}
				return newTime;
			} else {
				return Math.round(oldTime / minDivision) * minDivision;
			}
		};

		let i: number = 0;
		while (i < pattern.notes.length) {
			const note: Note = pattern.notes[i];
			if (changeRhythm(note.start) >= changeRhythm(note.end)) {
				this.append(new ChangeNoteAdded(doc, pattern, note, i, true));
			} else {
				this.append(new ChangeRhythmNote(doc, note, changeRhythm));
				i++;
			}
		}
	}
}

class ChangeRhythmNote extends ChangePins {
	constructor(doc: SongDocument | null, note: Note, changeRhythm: (oldTime: number) => number) {
		super(doc, note);

		for (const oldPin of this._oldPins) {
			this._newPins.push(makeNotePin(oldPin.interval, changeRhythm(oldPin.time + this._oldStart) - this._oldStart, oldPin.volume));
		}

		this._finishSetup();
	}
}

export class ChangeMoveNotesSideways extends ChangeGroup {
	constructor(doc: SongDocument, beatsToMove: number, strategy: string) {
		super();
		let partsToMove: number = Math.round((beatsToMove % doc.song.beatsPerBar) * Config.partsPerBeat);
		if (partsToMove < 0) partsToMove += doc.song.beatsPerBar * Config.partsPerBeat;
		if (partsToMove == 0.0) return;

		switch (strategy) {
			case "wrapAround": {
				const partsPerBar: number = Config.partsPerBeat * doc.song.beatsPerBar;
				for (const channel of doc.song.channels) {
					for (const pattern of channel.patterns) {
						const newNotes: Note[] = [];

						for (let bar: number = 1; bar >= 0; bar--) {
							const barStartPart: number = bar * partsPerBar;

							for (const oldNote of pattern.notes) {
								const absoluteNoteStart: number = oldNote.start + partsToMove;
								const absoluteNoteEnd: number = oldNote.end + partsToMove;
								const noteStartPart: number = Math.max(0, absoluteNoteStart - barStartPart);
								const noteEndPart: number = Math.min(partsPerBar, absoluteNoteEnd - barStartPart);

								if (noteStartPart < noteEndPart) {
									projectNoteIntoBar(oldNote, absoluteNoteStart - barStartPart - noteStartPart, noteStartPart, noteEndPart, newNotes);
								}
							}
						}

						pattern.notes = newNotes;
					}
				}
			} break;
			case "overflow": {
				let originalBarCount: number = doc.song.barCount;
				let originalLoopStart: number = doc.song.loopStart;
				let originalLoopLength: number = doc.song.loopLength;

				this.append(new ChangeMoveAndOverflowNotes(doc, doc.song.beatsPerBar, partsToMove));

				if (beatsToMove < 0) {
					let firstBarIsEmpty: boolean = true;
					for (const channel of doc.song.channels) {
						if (channel.bars[0] != 0) firstBarIsEmpty = false;
					}
					if (firstBarIsEmpty) {
						for (const channel of doc.song.channels) {
							channel.bars.shift();
						}
						doc.song.barCount--;
					} else {
						originalBarCount++;
						originalLoopStart++;
						doc.bar++;
					}
				}
				while (doc.song.barCount < originalBarCount) {
					for (const channel of doc.song.channels) {
						channel.bars.push(0);
					}
					doc.song.barCount++;
				}
				doc.song.loopStart = originalLoopStart;
				doc.song.loopLength = originalLoopLength;
			} break;
			default: throw new Error("Unrecognized beats-per-bar conversion strategy.");
		}

		doc.notifier.changed();
		this._didSomething();
	}
}

export class ChangeBeatsPerBar extends ChangeGroup {
	constructor(doc: SongDocument, newValue: number, strategy: string) {
		super();
		if (doc.song.beatsPerBar != newValue) {
			switch (strategy) {
				case "splice": {
					if (doc.song.beatsPerBar > newValue) {
						const sequence: ChangeSequence = new ChangeSequence();
						for (let i: number = 0; i < doc.song.getChannelCount(); i++) {
							for (let j: number = 0; j < doc.song.channels[i].patterns.length; j++) {
								sequence.append(new ChangeNoteTruncate(doc, doc.song.channels[i].patterns[j], newValue * Config.partsPerBeat, doc.song.beatsPerBar * Config.partsPerBeat, null, true));
							}
						}
					}
				} break;
				case "stretch": {
					const changeRhythm = function (oldTime: number): number {
						return Math.round(oldTime * newValue / doc.song.beatsPerBar);
					};
					for (let channelIndex: number = 0; channelIndex < doc.song.getChannelCount(); channelIndex++) {
						for (let patternIndex: number = 0; patternIndex < doc.song.channels[channelIndex].patterns.length; patternIndex++) {
							const pattern: Pattern = doc.song.channels[channelIndex].patterns[patternIndex];
							let noteIndex: number = 0;
							while (noteIndex < pattern.notes.length) {
								const note: Note = pattern.notes[noteIndex];
								if (changeRhythm(note.start) >= changeRhythm(note.end)) {
									this.append(new ChangeNoteAdded(doc, pattern, note, noteIndex, true));
								} else {
									this.append(new ChangeRhythmNote(doc, note, changeRhythm));
									noteIndex++;
								}
							}
						}
					}
					this.append(new ChangeTempo(doc, doc.song.tempo, doc.song.tempo * newValue / doc.song.beatsPerBar));
				} break;
				case "overflow": {
					this.append(new ChangeMoveAndOverflowNotes(doc, newValue, 0));
					doc.song.loopStart = 0;
					doc.song.loopLength = doc.song.barCount;
				} break;
				default: throw new Error("Unrecognized beats-per-bar conversion strategy.");
			}

			doc.song.beatsPerBar = newValue;
			doc.notifier.changed();
			this._didSomething();
		}
	}
}

export class ChangeScale extends ChangeGroup {
	constructor(doc: SongDocument, newValue: number) {
		super();
		if (doc.song.scale != newValue) {
			doc.song.scale = newValue;
			doc.notifier.changed();
			this._didSomething();
		}
	}
}

export class ChangeDetectKey extends ChangeGroup {
	constructor(doc: SongDocument) {
		super();
		const song: Song = doc.song;
		const basePitch: number = Config.keys[song.key].basePitch;
		const keyWeights: number[] = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
		for (let channelIndex: number = 0; channelIndex < song.pitchChannelCount; channelIndex++) {
			for (let barIndex: number = 0; barIndex < song.barCount; barIndex++) {
				const pattern: Pattern | null = song.getPattern(channelIndex, barIndex);
				if (pattern != null) {
					for (const note of pattern.notes) {
						const prevPin: NotePin = note.pins[0];
						for (let pinIndex: number = 1; pinIndex < note.pins.length; pinIndex++) {
							const nextPin: NotePin = note.pins[pinIndex];
							if (prevPin.interval == nextPin.interval) {
								let weight: number = nextPin.time - prevPin.time;
								weight += Math.max(0, Math.min(Config.partsPerBeat, nextPin.time + note.start) - (prevPin.time + note.start));
								weight *= nextPin.volume + prevPin.volume;
								for (const pitch of note.pitches) {
									const key = (basePitch + prevPin.interval + pitch) % 12;
									keyWeights[key] += weight;
								}
							}
						}
					}
				}
			}
		}

		let bestKey: number = 0;
		let bestKeyWeight: number = 0;
		for (let key: number = 0; key < 12; key++) {
			// Look for the root of the most prominent major or minor chord.
			const keyWeight: number = keyWeights[key] * (3 * keyWeights[(key + 7) % 12] + keyWeights[(key + 4) % 12] + keyWeights[(key + 3) % 12]);
			if (bestKeyWeight < keyWeight) {
				bestKeyWeight = keyWeight;
				bestKey = key;
			}
		}

		if (bestKey != song.key) {
			const diff: number = song.key - bestKey;
			const absoluteDiff: number = Math.abs(diff);

			for (let channelIndex: number = 0; channelIndex < song.pitchChannelCount; channelIndex++) {
				for (const pattern of song.channels[channelIndex].patterns) {
					for (let i: number = 0; i < absoluteDiff; i++) {
						this.append(new ChangeTranspose(doc, channelIndex, pattern, diff > 0, true));
					}
				}
			}

			song.key = bestKey;
			doc.notifier.changed();
			this._didSomething();
		}
	}
}

export function pickRandomPresetValue(isNoise: boolean): number {
	const eligiblePresetValues: number[] = [];
	for (let categoryIndex: number = 0; categoryIndex < EditorConfig.presetCategories.length; categoryIndex++) {
		const category: PresetCategory = EditorConfig.presetCategories[categoryIndex];
		if (category.name == "Novelty Presets") continue;
		for (let presetIndex: number = 0; presetIndex < category.presets.length; presetIndex++) {
			const preset: Preset = category.presets[presetIndex];
			if (preset.settings != undefined && (preset.isNoise == true) == isNoise) {
				eligiblePresetValues.push((categoryIndex << 6) + presetIndex);
			}
		}
	}
	return eligiblePresetValues[(Math.random() * eligiblePresetValues.length) | 0];
}

export function setDefaultInstruments(song: Song): void {
	for (let channelIndex: number = 0; channelIndex < song.channels.length; channelIndex++) {
		for (const instrument of song.channels[channelIndex].instruments) {
			const isNoise: boolean = song.getChannelIsNoise(channelIndex);
			const isMod: boolean = song.getChannelIsMod(channelIndex);
			const presetValue: number = (channelIndex == song.pitchChannelCount) ? EditorConfig.nameToPresetValue(Math.random() > 0.5 ? "chip noise" : "standard drumset")! : pickRandomPresetValue(isNoise);
			const preset: Preset = EditorConfig.valueToPreset(presetValue)!;
			instrument.fromJsonObject(preset.settings, isNoise, isMod, song.rhythm == 0 || song.rhythm == 2, song.rhythm >= 2);
			instrument.preset = presetValue;
		}
	}
}

export class ChangeSong extends ChangeGroup {
	constructor(doc: SongDocument, newHash: string) {
		super();
		let pitchChannelCount = doc.song.pitchChannelCount;
		let noiseChannelCount = doc.song.noiseChannelCount;
		let modChannelCount = doc.song.modChannelCount;
		doc.song.fromBase64String(newHash);
		if (pitchChannelCount != doc.song.pitchChannelCount || noiseChannelCount != doc.song.noiseChannelCount || modChannelCount != doc.song.modChannelCount) {
			ColorConfig.resetColors();
		}
		if (newHash == "") {
			this.append(new ChangePatternSelection(doc, 0, 0));
			doc.selection.resetBoxSelection();
			setDefaultInstruments(doc.song);
		} else {
			this.append(new ChangeValidateTrackSelection(doc));
		}
		doc.notifier.changed();
		this._didSomething();
	}
}

export class ChangeValidateTrackSelection extends Change {
	constructor(doc: SongDocument) {
		super();
		const channel: number = Math.min(doc.channel, doc.song.getChannelCount() - 1);
		const bar: number = Math.max(0, Math.min(doc.song.barCount - 1, doc.bar));
		const barScrollPos: number = Math.min(doc.bar, Math.max(doc.bar - (doc.trackVisibleBars - 1), Math.max(0, Math.min(doc.song.barCount - doc.trackVisibleBars, doc.barScrollPos))));
		if (doc.channel != channel || doc.bar != bar || doc.barScrollPos != barScrollPos) {
			doc.channel = channel;
			doc.bar = bar;
			doc.barScrollPos = barScrollPos;
			doc.notifier.changed();
			this._didSomething();
		}
	}
}

export class ChangeReplacePatterns extends ChangeGroup {
	constructor(doc: SongDocument, pitchChannels: Channel[], noiseChannels: Channel[], modChannels: Channel[]) {
		super();

		const song: Song = doc.song;

		function removeExtraSparseChannels(channels: Channel[], maxLength: number): void {
			while (channels.length > maxLength) {
				let sparsestIndex: number = channels.length - 1;
				let mostZeroes: number = 0;
				for (let channelIndex: number = 0; channelIndex < channels.length - 1; channelIndex++) {
					let zeroes: number = 0;
					for (const bar of channels[channelIndex].bars) {
						if (bar == 0) zeroes++;
					}
					if (zeroes >= mostZeroes) {
						sparsestIndex = channelIndex;
						mostZeroes = zeroes;
					}
				}
				channels.splice(sparsestIndex, 1);
			}
		}

		removeExtraSparseChannels(pitchChannels, Config.pitchChannelCountMax);
		removeExtraSparseChannels(noiseChannels, Config.noiseChannelCountMax);
		removeExtraSparseChannels(modChannels, Config.modChannelCountMax);

		while (pitchChannels.length < Config.pitchChannelCountMin) pitchChannels.push(new Channel());
		while (noiseChannels.length < Config.noiseChannelCountMin) noiseChannels.push(new Channel());
		while (modChannels.length < Config.modChannelCountMin) modChannels.push(new Channel());

		// Set minimum counts.
		song.barCount = 1;
		song.instrumentsPerChannel = 1;
		song.patternsPerChannel = 8;
		const combinedChannels: Channel[] = pitchChannels.concat(noiseChannels.concat(modChannels));
		for (let channelIndex: number = 0; channelIndex < combinedChannels.length; channelIndex++) {
			const channel: Channel = combinedChannels[channelIndex];
			song.barCount = Math.max(song.barCount, channel.bars.length);
			song.patternsPerChannel = Math.max(song.patternsPerChannel, channel.patterns.length);
			song.instrumentsPerChannel = Math.max(song.instrumentsPerChannel, channel.instruments.length);
			song.channels[channelIndex] = channel;
		}
		song.channels.length = combinedChannels.length;
		song.pitchChannelCount = pitchChannels.length;
		song.noiseChannelCount = noiseChannels.length;
		song.modChannelCount = modChannels.length;

		song.barCount = Math.min(Config.barCountMax, song.barCount);
		song.patternsPerChannel = Math.min(Config.barCountMax, song.patternsPerChannel);
		song.instrumentsPerChannel = Math.min(Config.instrumentsPerChannelMax, song.instrumentsPerChannel);
		for (let channelIndex: number = 0; channelIndex < song.channels.length; channelIndex++) {
			const channel: Channel = song.channels[channelIndex];
			for (let barIndex: number = 0; barIndex < channel.bars.length; barIndex++) {
				if (channel.bars[barIndex] > song.patternsPerChannel || channel.bars[barIndex] < 0) {
					channel.bars[barIndex] = 0;
				}
			}
			for (const pattern of channel.patterns) {
				if (pattern.instrument >= song.instrumentsPerChannel || pattern.instrument < 0) {
					pattern.instrument = 0;
				}
			}
			while (channel.bars.length < song.barCount) {
				channel.bars.push(0);
			}
			while (channel.patterns.length < song.patternsPerChannel) {
				channel.patterns.push(new Pattern());
			}
			while (channel.instruments.length < song.instrumentsPerChannel) {
				const instrument: Instrument = new Instrument(doc.song.getChannelIsNoise(channelIndex), doc.song.getChannelIsMod(channelIndex));
				if (song.getChannelIsNoise(channelIndex)) {
					instrument.setTypeAndReset(InstrumentType.noise, true, false);
				} else if (song.getChannelIsMod(channelIndex)) {
					instrument.setTypeAndReset(InstrumentType.mod, false, true);
				} else {
					instrument.setTypeAndReset(InstrumentType.chip, false, false);
				}
				channel.instruments.push(instrument);
			}

			channel.instruments.length = song.instrumentsPerChannel;
			channel.bars.length = song.barCount;
			channel.patterns.length = song.patternsPerChannel;
		}

		song.loopStart = Math.max(0, Math.min(song.barCount - 1, song.loopStart));
		song.loopLength = Math.min(song.barCount - song.loopStart, song.loopLength);

		this.append(new ChangeValidateTrackSelection(doc));
		doc.notifier.changed();
		this._didSomething();

		ColorConfig.resetColors();
	}
}

export function comparePatternNotes(a: Note[], b: Note[]): boolean {
	if (a.length != b.length) return false;

	for (let noteIndex: number = 0; noteIndex < a.length; noteIndex++) {
		const oldNote: Note = a[noteIndex];
		const newNote: Note = b[noteIndex];
		if (newNote.start != oldNote.start || newNote.end != oldNote.end || newNote.pitches.length != oldNote.pitches.length || newNote.pins.length != oldNote.pins.length) {
			return false;
		}

		for (let pitchIndex: number = 0; pitchIndex < oldNote.pitches.length; pitchIndex++) {
			if (newNote.pitches[pitchIndex] != oldNote.pitches[pitchIndex]) {
				return false;
			}
		}

		for (let pinIndex: number = 0; pinIndex < oldNote.pins.length; pinIndex++) {
			if (newNote.pins[pinIndex].interval != oldNote.pins[pinIndex].interval || newNote.pins[pinIndex].time != oldNote.pins[pinIndex].time || newNote.pins[pinIndex].volume != oldNote.pins[pinIndex].volume) {
				return false;
			}
		}
	}

	return true;
}

export function removeDuplicatePatterns(channels: Channel[]): void {
	for (const channel of channels) {
		const newPatterns: Pattern[] = [];
		for (let bar: number = 0; bar < channel.bars.length; bar++) {
			if (channel.bars[bar] == 0) continue;

			const oldPattern: Pattern = channel.patterns[channel.bars[bar] - 1];

			let foundMatchingPattern: boolean = false;
			for (let newPatternIndex: number = 0; newPatternIndex < newPatterns.length; newPatternIndex++) {
				const newPattern: Pattern = newPatterns[newPatternIndex];
				if (newPattern.instrument != oldPattern.instrument || newPattern.notes.length != oldPattern.notes.length) {
					continue;
				}

				if (comparePatternNotes(oldPattern.notes, newPattern.notes)) {
					foundMatchingPattern = true;
					channel.bars[bar] = newPatternIndex + 1;
					break;
				}
			}

			if (!foundMatchingPattern) {
				newPatterns.push(oldPattern);
				channel.bars[bar] = newPatterns.length;
			}
		}

		for (let patternIndex: number = 0; patternIndex < newPatterns.length; patternIndex++) {
			channel.patterns[patternIndex] = newPatterns[patternIndex];
		}
		channel.patterns.length = newPatterns.length;
	}
}

export class ChangeTempo extends Change {
	constructor(doc: SongDocument, oldValue: number, newValue: number) {
		super();
		doc.song.tempo = Math.max(Config.tempoMin, Math.min(Config.tempoMax, Math.round(newValue)));
		doc.synth.unsetMod(ModSetting.mstTempo);
		doc.notifier.changed();
		if (oldValue != newValue) this._didSomething();
	}
}

export class ChangeReverb extends Change {
	constructor(doc: SongDocument, oldValue: number, newValue: number) {
		super();
		doc.song.reverb = newValue;
		doc.synth.unsetMod(ModSetting.mstReverb);
		doc.notifier.changed();
		if (oldValue != newValue) this._didSomething();
	}
}

export class ChangeNoteAdded extends UndoableChange {
	private _doc: SongDocument;
	private _pattern: Pattern;
	private _note: Note;
	private _index: number;
	constructor(doc: SongDocument, pattern: Pattern, note: Note, index: number, deletion: boolean = false) {
		super(deletion);
		this._doc = doc;
		this._pattern = pattern;
		this._note = note;
		this._index = index;
		this._didSomething();
		this.redo();
	}

	protected _doForwards(): void {
		this._pattern.notes.splice(this._index, 0, this._note);
		this._doc.notifier.changed();
	}

	protected _doBackwards(): void {
		this._pattern.notes.splice(this._index, 1);
		this._doc.notifier.changed();
	}
}

export class ChangeNoteLength extends ChangePins {
	constructor(doc: SongDocument | null, note: Note, truncStart: number, truncEnd: number) {
		super(doc, note);

		truncStart -= this._oldStart;
		truncEnd -= this._oldStart;
		let setStart: boolean = false;
		let prevVolume: number = this._oldPins[0].volume;
		let prevInterval: number = this._oldPins[0].interval;
		let pushLastPin: boolean = true;
		let i: number;
		for (i = 0; i < this._oldPins.length; i++) {
			const oldPin: NotePin = this._oldPins[i];
			if (oldPin.time < truncStart) {
				prevVolume = oldPin.volume;
				prevInterval = oldPin.interval;
			} else if (oldPin.time <= truncEnd) {
				if (oldPin.time > truncStart && !setStart) {
					this._newPins.push(makeNotePin(prevInterval, truncStart, prevVolume));
				}
				this._newPins.push(makeNotePin(oldPin.interval, oldPin.time, oldPin.volume));
				setStart = true;
				if (oldPin.time == truncEnd) {
					pushLastPin = false;
					break;
				}
			} else {
				break;
			}

		}

		if (pushLastPin) this._newPins.push(makeNotePin(this._oldPins[i].interval, truncEnd, this._oldPins[i].volume));

		this._finishSetup();
	}
}

export class ChangeNoteTruncate extends ChangeSequence {
	constructor(doc: SongDocument, pattern: Pattern, start: number, end: number, skipNote: Note|null = null, force: boolean = false) {
		super();
		let i: number = 0;
		while (i < pattern.notes.length) {
			const note: Note = pattern.notes[i];
			if (note == skipNote && skipNote != null) {
				i++;
			} else if (note.end <= start) {
				i++;
			} else if (note.start >= end) {
				// Allow out-of-order notes for mods so that all get checked.
				if (!doc.song.getChannelIsMod(doc.channel)) {
					break;
				} else {
					i++;
				}
			} else if (note.start < start && note.end > end) {
				if (!doc.song.getChannelIsMod(doc.channel) || force || (skipNote != null && note.pitches[0] == skipNote.pitches[0])) {
					const copy: Note = note.clone();
					this.append(new ChangeNoteLength(doc, note, note.start, start));
					i++;
					this.append(new ChangeNoteAdded(doc, pattern, copy, i, false));
					this.append(new ChangeNoteLength(doc, copy, end, copy.end));
				}
				i++;
			} else if (note.start < start) {
				if (!doc.song.getChannelIsMod(doc.channel) || force || (skipNote != null && note.pitches[0] == skipNote.pitches[0]))
					this.append(new ChangeNoteLength(doc, note, note.start, start));
				i++;
			} else if (note.end > end) {
				if (!doc.song.getChannelIsMod(doc.channel) || force || (skipNote != null && note.pitches[0] == skipNote.pitches[0]))
					this.append(new ChangeNoteLength(doc, note, end, note.end));
				i++;
			} else {
				if (!doc.song.getChannelIsMod(doc.channel) || force || (skipNote != null && note.pitches[0] == skipNote.pitches[0]))
					this.append(new ChangeNoteAdded(doc, pattern, note, i, true));
				else
					i++;
			}
		}
	}
}

class ChangeSplitNotesAtSelection extends ChangeSequence {
	constructor(doc: SongDocument, pattern: Pattern) {
		super();
		let i: number = 0;
		while (i < pattern.notes.length) {
			const note: Note = pattern.notes[i];
			if (note.start < doc.selection.patternSelectionStart && doc.selection.patternSelectionStart < note.end) {
				const copy: Note = note.clone();
				this.append(new ChangeNoteLength(doc, note, note.start, doc.selection.patternSelectionStart));
				i++;
				this.append(new ChangeNoteAdded(doc, pattern, copy, i, false));
				this.append(new ChangeNoteLength(doc, copy, doc.selection.patternSelectionStart, copy.end));
				// i++; // The second note might be split again at the end of the selection. Check it again.
			} else if (note.start < doc.selection.patternSelectionEnd && doc.selection.patternSelectionEnd < note.end) {
				const copy: Note = note.clone();
				this.append(new ChangeNoteLength(doc, note, note.start, doc.selection.patternSelectionEnd));
				i++;
				this.append(new ChangeNoteAdded(doc, pattern, copy, i, false));
				this.append(new ChangeNoteLength(doc, copy, doc.selection.patternSelectionEnd, copy.end));
				i++;
			} else {
				i++;
			}
		}
	}
}

class ChangeTransposeNote extends UndoableChange {
	protected _doc: SongDocument;
	protected _note: Note;
	protected _oldStart: number;
	protected _newStart: number;
	protected _oldEnd: number;
	protected _newEnd: number;
	protected _oldPins: NotePin[];
	protected _newPins: NotePin[];
	protected _oldPitches: number[];
	protected _newPitches: number[];
	constructor(doc: SongDocument, channel: number, note: Note, upward: boolean, ignoreScale: boolean = false, octave: boolean = false) {
		super(false);
		this._doc = doc;
		this._note = note;
		this._oldPins = note.pins;
		this._newPins = [];
		this._oldPitches = note.pitches;
		this._newPitches = [];

		// I'm disabling pitch transposing for noise channels to avoid
		// accidentally messing up noise channels when pitch shifting all
		// channels at once.
		const isNoise: boolean = doc.song.getChannelIsNoise(channel);
		if (isNoise != doc.song.getChannelIsNoise(doc.channel)) return;

		// Can't transpose mods
		if (doc.song.getChannelIsMod(doc.channel)) return;

		const maxPitch: number = (isNoise ? Config.drumCount - 1 : Config.maxPitch);

		for (let i: number = 0; i < this._oldPitches.length; i++) {
			let pitch: number = this._oldPitches[i];
			if (octave && !isNoise) {
				if (upward) {
					pitch = Math.min(maxPitch, pitch + 12);
				} else {
					pitch = Math.max(0, pitch - 12);
				}
			} else {
				if (upward) {
					for (let j: number = pitch + 1; j <= maxPitch; j++) {
						if (isNoise || ignoreScale || Config.scales[doc.song.scale].flags[j % 12]) {
							pitch = j;
							break;
						}
					}
				} else {
					for (let j: number = pitch - 1; j >= 0; j--) {
						if (isNoise || ignoreScale || Config.scales[doc.song.scale].flags[j % 12]) {
							pitch = j;
							break;
						}
					}
				}
			}

			let foundMatch: boolean = false;
			for (let j: number = 0; j < this._newPitches.length; j++) {
				if (this._newPitches[j] == pitch) {
					foundMatch = true;
					break;
				}
			}
			if (!foundMatch) this._newPitches.push(pitch);
		}

		let min: number = 0;
		let max: number = maxPitch;

		for (let i: number = 1; i < this._newPitches.length; i++) {
			const diff: number = this._newPitches[0] - this._newPitches[i];
			if (min < diff) min = diff;
			if (max > diff + maxPitch) max = diff + maxPitch;
		}

		for (const oldPin of this._oldPins) {
			let interval: number = oldPin.interval + this._oldPitches[0];

			if (interval < min) interval = min;
			if (interval > max) interval = max;
			if (octave && !isNoise) {
				if (upward) {
					interval = Math.min(max, interval + 12);
				} else {
					interval = Math.max(min, interval - 12);
				}
			} else {
				if (upward) {
					for (let i: number = interval + 1; i <= max; i++) {
						if (isNoise || ignoreScale || Config.scales[doc.song.scale].flags[i % 12]) {
							interval = i;
							break;
						}
					}
				} else {
					for (let i: number = interval - 1; i >= min; i--) {
						if (isNoise || ignoreScale || Config.scales[doc.song.scale].flags[i % 12]) {
							interval = i;
							break;
						}
					}
				}
			}
			interval -= this._newPitches[0];
			this._newPins.push(makeNotePin(interval, oldPin.time, oldPin.volume));
		}

		if (this._newPins[0].interval != 0) throw new Error("wrong pin start interval");

		for (let i: number = 1; i < this._newPins.length - 1;) {
			if (this._newPins[i - 1].interval == this._newPins[i].interval &&
				this._newPins[i].interval == this._newPins[i + 1].interval &&
				this._newPins[i - 1].volume == this._newPins[i].volume &&
				this._newPins[i].volume == this._newPins[i + 1].volume) {
				this._newPins.splice(i, 1);
			} else {
				i++;
			}
		}

		this._doForwards();
		this._didSomething();
	}

	protected _doForwards(): void {
		this._note.pins = this._newPins;
		this._note.pitches = this._newPitches;
		this._doc.notifier.changed();
	}

	protected _doBackwards(): void {
		this._note.pins = this._oldPins;
		this._note.pitches = this._oldPitches;
		this._doc.notifier.changed();
	}
}

export class ChangeTranspose extends ChangeSequence {
	constructor(doc: SongDocument, channel: number, pattern: Pattern, upward: boolean, ignoreScale: boolean = false, octave: boolean = false) {
		super();
		if (doc.selection.patternSelectionActive) {
			this.append(new ChangeSplitNotesAtSelection(doc, pattern));
		}
		for (const note of pattern.notes) {
			if (doc.selection.patternSelectionActive && (note.end <= doc.selection.patternSelectionStart || note.start >= doc.selection.patternSelectionEnd)) {
				continue;
			}
			this.append(new ChangeTransposeNote(doc, channel, note, upward, ignoreScale, octave));
		}
	}
}

export class ChangeTrackSelection extends Change {
	constructor(doc: SongDocument, newX0: number, newX1: number, newY0: number, newY1: number) {
		super();
		doc.selection.boxSelectionX0 = newX0;
		doc.selection.boxSelectionX1 = newX1;
		doc.selection.boxSelectionY0 = newY0;
		doc.selection.boxSelectionY1 = newY1;
		doc.notifier.changed();
		this._didSomething();
	}
}

export class ChangePatternSelection extends UndoableChange {
	private _doc: SongDocument;
	private _oldStart: number;
	private _oldEnd: number;
	private _oldActive: boolean;
	private _newStart: number;
	private _newEnd: number;
	private _newActive: boolean;

	constructor(doc: SongDocument, newStart: number, newEnd: number) {
		super(false);
		this._doc = doc;
		this._oldStart = doc.selection.patternSelectionStart;
		this._oldEnd = doc.selection.patternSelectionEnd;
		this._oldActive = doc.selection.patternSelectionActive;
		this._newStart = newStart;
		this._newEnd = newEnd;
		this._newActive = newStart < newEnd;
		this._doForwards();
		this._didSomething();
	}

	protected _doForwards(): void {
		this._doc.selection.patternSelectionStart = this._newStart;
		this._doc.selection.patternSelectionEnd = this._newEnd;
		this._doc.selection.patternSelectionActive = this._newActive;
		this._doc.notifier.changed();
	}

	protected _doBackwards(): void {
		this._doc.selection.patternSelectionStart = this._oldStart;
		this._doc.selection.patternSelectionEnd = this._oldEnd;
		this._doc.selection.patternSelectionActive = this._oldActive;
		this._doc.notifier.changed();
	}
}

export class ChangeDragSelectedNotes extends ChangeSequence {
	constructor(doc: SongDocument, channel: number, pattern: Pattern, parts: number, transpose: number) {
		super();

		if (parts == 0 && transpose == 0) return;

		if (doc.selection.patternSelectionActive) {
			this.append(new ChangeSplitNotesAtSelection(doc, pattern));
		}
		
		const oldStart: number = doc.selection.patternSelectionStart;
		const oldEnd: number = doc.selection.patternSelectionEnd;
		const newStart: number = Math.max(0, Math.min(doc.song.beatsPerBar * Config.partsPerBeat, oldStart + parts));
		const newEnd: number = Math.max(0, Math.min(doc.song.beatsPerBar * Config.partsPerBeat, oldEnd + parts));
		if (newStart == newEnd) {
			// Just erase the current contents of the selection:
			this.append(new ChangeNoteTruncate(doc, pattern, oldStart, oldEnd, null, true));
		} else if (parts < 0) {
			// Clear space for the dragged notes:
			this.append(new ChangeNoteTruncate(doc, pattern, newStart, Math.min(oldStart, newEnd), null, true));
			if (oldStart < -parts) {
				// If the dragged notes hit against the edge, truncate them too before dragging:
				this.append(new ChangeNoteTruncate(doc, pattern, oldStart, -parts, null, true));
			}
		} else {
			// Clear space for the dragged notes:
			this.append(new ChangeNoteTruncate(doc, pattern, Math.max(oldEnd, newStart), newEnd, null, true));
			if (oldEnd > doc.song.beatsPerBar * Config.partsPerBeat - parts) {
				// If the dragged notes hit against the edge, truncate them too before dragging:
				this.append(new ChangeNoteTruncate(doc, pattern, doc.song.beatsPerBar * Config.partsPerBeat - parts, oldEnd, null, true));
			}
		}

		this.append(new ChangePatternSelection(doc, newStart, newEnd));
		const draggedNotes = [];
		let noteInsertionIndex: number = 0;
		let i: number = 0;
		while (i < pattern.notes.length) {
			const note: Note = pattern.notes[i];
			if (note.end <= oldStart || note.start >= oldEnd) {
				i++;
				if (note.end <= newStart) noteInsertionIndex = i;
			} else {
				draggedNotes.push(note.clone());
				this.append(new ChangeNoteAdded(doc, pattern, note, i, true));
			}
		}

		for (const note of draggedNotes) {
			note.start += parts;
			note.end += parts;

			for (let i: number = 0; i < Math.abs(transpose); i++) {
				this.append(new ChangeTransposeNote(doc, channel, note, transpose > 0));
			}

			this.append(new ChangeNoteAdded(doc, pattern, note, noteInsertionIndex++, false));
		}
	}
}

export class ChangeDuplicateSelectedReusedPatterns extends ChangeGroup {
	constructor(doc: SongDocument, barStart: number, barWidth: number, channelStart: number, channelHeight: number) {
		super();
		for (let channel: number = channelStart; channel < channelStart + channelHeight; channel++) {
			const reusablePatterns: Dictionary<number> = {};

			for (let bar: number = barStart; bar < barStart + barWidth; bar++) {
				const currentPatternIndex: number = doc.song.channels[channel].bars[bar];
				if (currentPatternIndex == 0) continue;

				if (reusablePatterns[String(currentPatternIndex)] == undefined) {
					let isUsedElsewhere = false;
					for (let bar2: number = 0; bar2 < doc.song.barCount; bar2++) {
						if (bar2 < barStart || bar2 >= barStart + barWidth) {
							if (doc.song.channels[channel].bars[bar2] == currentPatternIndex) {
								isUsedElsewhere = true;
								break;
							}
						}
					}
					if (isUsedElsewhere) {
						// Need to duplicate the pattern.
						const copiedPattern: Pattern = doc.song.getPattern(channel, bar)!;
						this.append(new ChangePatternNumbers(doc, 0, bar, channel, 1, 1));
						this.append(new ChangeEnsurePatternExists(doc, channel, bar));
						const newPattern: Pattern | null = doc.song.getPattern(channel, bar);
						if (newPattern == null) throw new Error();
						this.append(new ChangePaste(doc, newPattern, copiedPattern.notes, 0, Config.partsPerBeat * doc.song.beatsPerBar, Config.partsPerBeat * doc.song.beatsPerBar));
						this.append(new ChangePatternInstrument(doc, copiedPattern.instrument, newPattern));
						reusablePatterns[String(currentPatternIndex)] = doc.song.channels[channel].bars[bar];
					} else {
						reusablePatterns[String(currentPatternIndex)] = currentPatternIndex;
					}
				}

				this.append(new ChangePatternNumbers(doc, reusablePatterns[String(currentPatternIndex)], bar, channel, 1, 1));
			}
		}
	}
}

export class ChangePatternScale extends Change {
	constructor(doc: SongDocument, pattern: Pattern, scaleMap: number[]) {
		super();
		if (doc.selection.patternSelectionActive) {
			new ChangeSplitNotesAtSelection(doc, pattern);
		}
		const maxPitch: number = Config.maxPitch;
		for (const note of pattern.notes) {
			if (doc.selection.patternSelectionActive && (note.end <= doc.selection.patternSelectionStart || note.start >= doc.selection.patternSelectionEnd)) {
				continue;
			}
			const newPitches: number[] = [];
			const newPins: NotePin[] = [];
			for (let i: number = 0; i < note.pitches.length; i++) {
				const pitch: number = note.pitches[i];
				const transformedPitch: number = scaleMap[pitch % 12] + (pitch - (pitch % 12));
				if (newPitches.indexOf(transformedPitch) == -1) {
					newPitches.push(transformedPitch);
				}
			}

			let min: number = 0;
			let max: number = maxPitch;

			for (let i: number = 1; i < newPitches.length; i++) {
				const diff: number = newPitches[0] - newPitches[i];
				if (min < diff) min = diff;
				if (max > diff + maxPitch) max = diff + maxPitch;
			}

			for (const oldPin of note.pins) {
				let interval: number = oldPin.interval + note.pitches[0];
				if (interval < min) interval = min;
				if (interval > max) interval = max;
				const transformedInterval: number = scaleMap[interval % 12] + (interval - (interval % 12));
				newPins.push(makeNotePin(transformedInterval - newPitches[0], oldPin.time, oldPin.volume));
			}

			if (newPins[0].interval != 0) throw new Error("wrong pin start interval");

			for (let i: number = 1; i < newPins.length - 1;) {
				if (newPins[i - 1].interval == newPins[i].interval &&
					newPins[i].interval == newPins[i + 1].interval &&
					newPins[i - 1].volume == newPins[i].volume &&
					newPins[i].volume == newPins[i + 1].volume) {
					newPins.splice(i, 1);
				} else {
					i++;
				}
			}

			note.pitches = newPitches;
			note.pins = newPins;
		}
		this._didSomething();
		doc.notifier.changed();
	}
}

export class ChangeVolume extends Change {
	constructor(doc: SongDocument, oldValue: number, newValue: number) {
		super();
		doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()].volume = newValue;
		// Not used currently as mod is implemented as multiplicative.
		//doc.synth.unsetMod(ModSetting.mstInsVolume, doc.channel, doc.getCurrentInstrument());
		doc.notifier.changed();
		if (oldValue != newValue) this._didSomething();
	}
}

export class ChangeSongTitle extends Change {
	constructor(doc: SongDocument, oldValue: string, newValue: string) {
		super();
		if (newValue.length > 30) {
			newValue = newValue.substring(0, 30);
		}

		doc.song.title = newValue;
		document.title = newValue + " - " + EditorConfig.versionDisplayName;
		doc.notifier.changed();
		if (oldValue != newValue) this._didSomething();
	}
}

export class ChangeChannelName extends Change {
	constructor(doc: SongDocument, oldValue: string, newValue: string) {
		super();
		if (newValue.length > 15) {
			newValue = newValue.substring(0, 15);
		}

		doc.song.channels[doc.muteEditorChannel].name = newValue;
		doc.recalcChannelNames = true;

		doc.notifier.changed();
		if (oldValue != newValue) this._didSomething();
	}
}

export class ChangePan extends Change {
	constructor(doc: SongDocument, oldValue: number, newValue: number) {
		super();
		doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()].pan = newValue;
		doc.synth.unsetMod(ModSetting.mstPan, doc.channel, doc.getCurrentInstrument());
		doc.notifier.changed();
		if (oldValue != newValue) this._didSomething();
	}
}

export class ChangePanDelay extends Change {
	constructor(doc: SongDocument, oldValue: number, newValue: number) {
		super();
		doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()].panDelay = newValue;
		doc.notifier.changed();
		if (oldValue != newValue) this._didSomething();
	}
}

export class ChangeDetune extends Change {
	constructor(doc: SongDocument, oldValue: number, newValue: number) {
		super();
		doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()].detune = newValue;
		doc.synth.unsetMod(ModSetting.mstDetune, doc.channel, doc.getCurrentInstrument());
		doc.notifier.changed();
		if (oldValue != newValue) this._didSomething();
	}
}

export class ChangeVolumeBend extends UndoableChange {
	private _doc: SongDocument;
	private _note: Note;
	private _oldPins: NotePin[];
	private _newPins: NotePin[];
	constructor(doc: SongDocument, note: Note, bendPart: number, bendVolume: number, bendInterval: number, uniformVolume: boolean) {
		super(false);
		this._doc = doc;
		this._note = note;
		this._oldPins = note.pins;
		this._newPins = [];

		let inserted: boolean = false;

		for (const pin of note.pins) {
			if (pin.time < bendPart) {
				if (uniformVolume) {
					this._newPins.push(makeNotePin(pin.interval, pin.time, bendVolume));
				} else {
					this._newPins.push(pin);
				}
			} else if (pin.time == bendPart) {
				this._newPins.push(makeNotePin(bendInterval, bendPart, bendVolume));
				inserted = true;
			} else {
				if (!inserted) {
					this._newPins.push(makeNotePin(bendInterval, bendPart, bendVolume));
					inserted = true;
				}
				if (uniformVolume) {
					this._newPins.push(makeNotePin(pin.interval, pin.time, bendVolume));
				} else {
					this._newPins.push(pin);
				}
			}
		}

		for (let i: number = 1; i < this._newPins.length - 1;) {
			if (this._newPins[i - 1].interval == this._newPins[i].interval &&
				this._newPins[i].interval == this._newPins[i + 1].interval &&
				this._newPins[i - 1].volume == this._newPins[i].volume &&
				this._newPins[i].volume == this._newPins[i + 1].volume) {
				this._newPins.splice(i, 1);
			} else {
				i++;
			}
		}

		this._doForwards();
		this._didSomething();
	}

	protected _doForwards(): void {
		this._note.pins = this._newPins;
		this._doc.notifier.changed();
	}

	protected _doBackwards(): void {
		this._note.pins = this._oldPins;
		this._doc.notifier.changed();
	}
}

export class ChangeChipWave extends Change {
	constructor(doc: SongDocument, newValue: number) {
		super();
		const instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
		if (instrument.chipWave != newValue) {
			instrument.chipWave = newValue;
			instrument.preset = instrument.type;
			doc.notifier.changed();
			this._didSomething();
		}
	}
}

export class ChangeNoiseWave extends Change {
	constructor(doc: SongDocument, newValue: number) {
		super();
		const instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
		if (instrument.chipNoise != newValue) {
			instrument.chipNoise = newValue;
			instrument.preset = instrument.type;
			doc.notifier.changed();
			this._didSomething();
		}
	}
}
//}
