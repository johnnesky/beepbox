/*
Copyright (C) 2019 John Nesky

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
/// <reference path="EditorConfig.ts" />
/// <reference path="Change.ts" />
/// <reference path="SongDocument.ts" />

namespace beepbox {
	function generateScaleMap(oldScaleValue: number, newScaleValue: number): number[] {
		const oldScaleFlags: ReadonlyArray<boolean> = Config.scales[oldScaleValue].flags;
		const newScaleFlags: ReadonlyArray<boolean> = Config.scales[newScaleValue].flags;
		const oldScale: number[] = [];
		const newScale: number[] = [];
		for (let i: number = 0; i <  12; i++) {
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
		for (let i: number = 0; i <  12; i++) {
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
					// Insert an interpolated pin at the start of the new note.
					const ratio: number = (newNoteLength - prevPinTime) / (newPinTime - prevPinTime);
					newNote.pins.push(makeNotePin(Math.round(prevPin.interval + ratio * (pin.interval - prevPin.interval)), newNoteLength, Math.round(prevPin.volume + ratio * (pin.volume - prevPin.volume))));
				}
			}
		}
	}
	
	export class ChangeMoveAndOverflowNotes extends ChangeGroup {
		constructor(doc: SongDocument, newBeatsPerBar: number, partsToMove: number) {
			super();
			
			const pitchChannels: Channel[] = [];
			const noiseChannels: Channel[] = [];
		
			for (let channelIndex: number = 0; channelIndex < doc.song.getChannelCount(); channelIndex++) {
				const oldChannel: Channel = doc.song.channels[channelIndex];
				const newChannel: Channel = new Channel();
				if (channelIndex < doc.song.pitchChannelCount) {
					pitchChannels.push(newChannel);
				} else {
					noiseChannels.push(newChannel);
				}
			
				newChannel.octave = oldChannel.octave;
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
									if (currentBar != bar || pattern == null) {
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
									
									projectNoteIntoBar(oldNote, absoluteNoteStart - barStartPart - noteStartPart, noteStartPart, noteEndPart, pattern.notes);
								}
							}
						}
					}
				}
			}
		
			removeDuplicatePatterns(pitchChannels);
			removeDuplicatePatterns(noiseChannels);
			this.append(new ChangeReplacePatterns(doc, pitchChannels, noiseChannels));
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
		constructor(protected _doc: SongDocument, protected _note: Note) {
			super(false);
			this._oldStart = this._note.start;
			this._oldEnd   = this._note.end;
			this._newStart = this._note.start;
			this._newEnd   = this._note.end;
			this._oldPins = this._note.pins;
			this._newPins = [];
			this._oldPitches = this._note.pitches;
			this._newPitches = [];
		}
		
		protected _finishSetup(): void {
			for (let i: number = 0; i < this._newPins.length - 1; ) {
				if (this._newPins[i].time >= this._newPins[i+1].time) {
					this._newPins.splice(i, 1);
				} else {
					i++;
				}
			}
			
			for (let i: number = 1; i < this._newPins.length - 1; ) {
				if (this._newPins[i-1].interval == this._newPins[i].interval && 
				    this._newPins[i].interval == this._newPins[i+1].interval && 
				    this._newPins[i-1].volume == this._newPins[i].volume && 
				    this._newPins[i].volume == this._newPins[i+1].volume)
				{
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
			this._newEnd   = this._newStart + this._newPins[this._newPins.length-1].time;
			
			this._doForwards();
			this._didSomething();
		}
		
		protected _doForwards(): void {
			this._note.pins = this._newPins;
			this._note.pitches = this._newPitches;
			this._note.start = this._newStart;
			this._note.end = this._newEnd;
			this._doc.notifier.changed();
		}
		
		protected _doBackwards(): void {
			this._note.pins = this._oldPins;
			this._note.pitches = this._oldPitches;
			this._note.start = this._oldStart;
			this._note.end = this._oldEnd;
			this._doc.notifier.changed();
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
						instrument.fromJsonObject(preset.settings, doc.song.getChannelIsNoise(doc.channel));
						instrument.volume = tempVolume;
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
				return entries[(Math.random() * entries.length)|0].item;
			}
			function selectCurvedDistribution(min: number, max: number, peak: number, width: number): number {
				const entries: Array<ItemWeight<number>> = [];
				for (let i: number = min; i <= max; i++) {
					entries.push({item: i, weight: 1.0 / (Math.pow((i - peak) / width, 2.0) + 1.0)});
				}
				return selectWeightedRandom(entries);
			}
			
			const isNoise: boolean = doc.song.getChannelIsNoise(doc.channel);
			const instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
			
			if (isNoise) {
				const type: InstrumentType = selectWeightedRandom([
					{item: InstrumentType.noise,    weight: 1},
					{item: InstrumentType.spectrum, weight: 3},
				]);
				instrument.preset = instrument.type = type;
				instrument.filterCutoff = selectCurvedDistribution(0, Config.filterCutoffRange - 1, Config.filterCutoffRange - 2, 3);
				instrument.filterResonance = selectCurvedDistribution(0, Config.filterResonanceRange - 1, 1, 2);
				instrument.filterEnvelope = Config.envelopes.dictionary[selectWeightedRandom([
					{item: "steady"  , weight: 2},
					{item: "punch"   , weight: 4},
					{item: "flare 1" , weight: 2},
					{item: "flare 2" , weight: 2},
					{item: "flare 3" , weight: 2},
					{item: "twang 1" , weight: 8},
					{item: "twang 2" , weight: 8},
					{item: "twang 3" , weight: 8},
					{item: "swell 1" , weight: 2},
					{item: "swell 2" , weight: 2},
					{item: "swell 3" , weight: 2},
					{item: "tremolo1", weight: 1},
					{item: "tremolo2", weight: 1},
					{item: "tremolo3", weight: 1},
					{item: "tremolo4", weight: 1},
					{item: "tremolo5", weight: 1},
					{item: "tremolo6", weight: 1},
					{item: "decay 1" , weight: 4},
					{item: "decay 2" , weight: 4},
					{item: "decay 3" , weight: 4},
				])].index;
				instrument.transition = Config.transitions.dictionary[selectWeightedRandom([
					{item: "seamless"   , weight: 1},
					{item: "hard"       , weight: 4},
					{item: "soft"       , weight: 2},
					{item: "slide"      , weight: 1},
					{item: "cross fade" , weight: 2},
					{item: "hard fade"  , weight: 8},
					{item: "medium fade", weight: 2},
					{item: "soft fade"  , weight: 1},
				])].index;
				instrument.effects = Config.effectsNames.indexOf(selectWeightedRandom([
					{item: "none"  , weight: 1},
					{item: "reverb", weight: 3},
				]));
				instrument.chord = Config.chords.dictionary[selectWeightedRandom([
					{item: "harmony" , weight: 4},
					{item: "strum"   , weight: 2},
					{item: "arpeggio", weight: 1},
				])].index;
				function normalize(harmonics: number[]): void {
					let max: number = 0;
					for (const value of harmonics) {
						if (value > max) max = value;
					}
					for (let i = 0; i < harmonics.length; i++) {
						harmonics[i] = Config.harmonicsMax * harmonics[i] / max;
					}
				}
				switch (type) {
					case InstrumentType.noise: {
						instrument.chipNoise = (Math.random() * Config.chipNoises.length)|0;
					} break;
					case InstrumentType.spectrum: {
						const spectrumGenerators: Function[] = [
							(): number[] => {
								const spectrum: number[] = [];
								for (let i = 0; i < Config.spectrumControlPoints; i++) {
									spectrum[i] = (Math.random() < 0.5) ? Math.random() : 0.0;
								}
								return spectrum;
							},
							(): number[] => {
								let current: number = 1.0;
								const spectrum: number[] = [current];
								for (let i = 1; i < Config.spectrumControlPoints; i++) {
									current *= Math.pow(2, Math.random() - 0.51);
									spectrum[i] = current;
								}
								return spectrum;
							},
							(): number[] => {
								let current: number = 1.0;
								const spectrum: number[] = [current];
								for (let i = 1; i < Config.spectrumControlPoints; i++) {
									current *= Math.pow(2, Math.random() - 0.51);
									spectrum[i] = current * Math.random();
								}
								return spectrum;
							},
						];
						const generator = spectrumGenerators[(Math.random() * spectrumGenerators.length)|0];
						const spectrum: number[] = generator();
						normalize(spectrum);
						for (let i = 0; i < Config.spectrumControlPoints; i++) {
							instrument.spectrumWave.spectrum[i] = Math.round(spectrum[i]);
						}
						instrument.spectrumWave.markCustomWaveDirty();
					} break;
					default: throw new Error("Unhandled noise instrument type in random generator.");
				}
			} else {
				const type: InstrumentType = selectWeightedRandom([
					{item: InstrumentType.chip,      weight: 2},
					{item: InstrumentType.pwm,       weight: 2},
					{item: InstrumentType.harmonics, weight: 3},
					{item: InstrumentType.spectrum,  weight: 1},
					{item: InstrumentType.fm,        weight: 2},
				]);
				instrument.preset = instrument.type = type;
				instrument.filterCutoff = selectCurvedDistribution(0, Config.filterCutoffRange - 1, 6, 1.5);
				instrument.filterResonance = selectCurvedDistribution(0, Config.filterResonanceRange - 1, 1, 2);
				instrument.filterEnvelope = Config.envelopes.dictionary[selectWeightedRandom([
					{item: "steady"  , weight: 10},
					{item: "punch"   , weight: 6},
					{item: "flare 1" , weight: 2},
					{item: "flare 2" , weight: 4},
					{item: "flare 3" , weight: 2},
					{item: "twang 1" , weight: 4},
					{item: "twang 2" , weight: 4},
					{item: "twang 3" , weight: 4},
					{item: "swell 1" , weight: 4},
					{item: "swell 2" , weight: 4},
					{item: "swell 3" , weight: 2},
					{item: "tremolo1", weight: 1},
					{item: "tremolo2", weight: 1},
					{item: "tremolo3", weight: 1},
					{item: "tremolo4", weight: 1},
					{item: "tremolo5", weight: 1},
					{item: "tremolo6", weight: 1},
					{item: "decay 1" , weight: 2},
					{item: "decay 2" , weight: 2},
					{item: "decay 3" , weight: 2},
				])].index;
				instrument.transition = Config.transitions.dictionary[selectWeightedRandom([
					{item: "seamless"   , weight: 1},
					{item: "hard"       , weight: 4},
					{item: "soft"       , weight: 4},
					{item: "slide"      , weight: 2},
					{item: "cross fade" , weight: 4},
					{item: "hard fade"  , weight: 4},
					{item: "medium fade", weight: 2},
					{item: "soft fade"  , weight: 2},
				])].index;
				instrument.effects = Config.effectsNames.indexOf(selectWeightedRandom([
					{item: "none"           , weight: 1},
					{item: "reverb"         , weight: 10},
					{item: "chorus"         , weight: 2},
					{item: "chorus & reverb", weight: 2},
				]));
				instrument.chord = Config.chords.dictionary[selectWeightedRandom([
					{item: "harmony" , weight: 7},
					{item: "strum"   , weight: 2},
					{item: "arpeggio", weight: 1},
				])].index;
				if (type != InstrumentType.spectrum) {
					instrument.vibrato = Config.vibratos.dictionary[selectWeightedRandom([
						{item: "none"   , weight: 6},
						{item: "light"  , weight: 2},
						{item: "delayed", weight: 2},
						{item: "heavy"  , weight: 1},
						{item: "shaky"  , weight: 2},
					])].index;
				}
				if (type == InstrumentType.chip || type == InstrumentType.harmonics) {
					instrument.interval = Config.intervals.dictionary[selectWeightedRandom([
						{item: "union"     , weight: 10},
						{item: "shimmer"   , weight: 5},
						{item: "hum"       , weight: 4},
						{item: "honky tonk", weight: 3},
						{item: "dissonant" , weight: 1},
						{item: "fifth"     , weight: 1},
						{item: "octave"    , weight: 2},
						{item: "bowed"     , weight: 2},
					])].index;
				}
				function normalize(harmonics: number[]): void {
					let max: number = 0;
					for (const value of harmonics) {
						if (value > max) max = value;
					}
					for (let i = 0; i < harmonics.length; i++) {
						harmonics[i] = Config.harmonicsMax * harmonics[i] / max;
					}
				}
				switch (type) {
					case InstrumentType.chip: {
						instrument.chipWave = (Math.random() * Config.chipWaves.length)|0;
					} break;
					case InstrumentType.pwm: {
						instrument.pulseEnvelope = Config.envelopes.dictionary[selectWeightedRandom([
							{item: "steady"  , weight: 10},
							{item: "punch"   , weight: 6},
							{item: "flare 1" , weight: 2},
							{item: "flare 2" , weight: 4},
							{item: "flare 3" , weight: 2},
							{item: "twang 1" , weight: 4},
							{item: "twang 2" , weight: 4},
							{item: "twang 3" , weight: 4},
							{item: "swell 1" , weight: 4},
							{item: "swell 2" , weight: 4},
							{item: "swell 3" , weight: 4},
							{item: "tremolo1", weight: 1},
							{item: "tremolo2", weight: 1},
							{item: "tremolo3", weight: 1},
							{item: "tremolo4", weight: 2},
							{item: "tremolo5", weight: 2},
							{item: "tremolo6", weight: 2},
							{item: "decay 1" , weight: 2},
							{item: "decay 2" , weight: 2},
							{item: "decay 3" , weight: 2},
						])].index;
						instrument.pulseWidth = (Math.random() * Config.pulseWidthRange)|0;
					} break;
					case InstrumentType.harmonics: {
						const harmonicGenerators: Function[] = [
							(): number[] => {
								const harmonics: number[] = [];
								for (let i = 0; i < Config.harmonicsControlPoints; i++) {
									harmonics[i] = (Math.random() < 0.4) ? Math.random() : 0.0;
								}
								harmonics[(Math.random() * 8)|0] = Math.pow(Math.random(), 0.25);
								return harmonics;
							},
							(): number[] => {
								let current: number = 1.0;
								const harmonics: number[] = [current];
								for (let i = 1; i < Config.harmonicsControlPoints; i++) {
									current *= Math.pow(2, Math.random() - 0.51);
									harmonics[i] = current;
								}
								return harmonics;
							},
							(): number[] => {
								let current: number = 1.0;
								const harmonics: number[] = [current];
								for (let i = 1; i < Config.harmonicsControlPoints; i++) {
									current *= Math.pow(2, Math.random() - 0.51);
									harmonics[i] = current * Math.random();
								}
								return harmonics;
							},
						];
						const generator = harmonicGenerators[(Math.random() * harmonicGenerators.length)|0];
						const harmonics: number[] = generator();
						normalize(harmonics);
						for (let i = 0; i < Config.harmonicsControlPoints; i++) {
							instrument.harmonicsWave.harmonics[i] = Math.round(harmonics[i]);
						}
						instrument.harmonicsWave.markCustomWaveDirty();
					} break;
					case InstrumentType.spectrum: {
						const spectrum: number[] = [];
						for (let i = 0; i < Config.spectrumControlPoints; i++) {
							const isHarmonic: boolean = i==0 || i==7 || i==11 || i==14 || i==16 || i==18 || i==21;
							if (isHarmonic) {
								spectrum[i] = Math.pow(Math.random(), 0.25);
							} else {
								spectrum[i] = Math.pow(Math.random(), 3) * 0.5;
							}
						}
						normalize(spectrum);
						for (let i = 0; i < Config.spectrumControlPoints; i++) {
							instrument.spectrumWave.spectrum[i] = Math.round(spectrum[i]);
						}
						instrument.spectrumWave.markCustomWaveDirty();
					} break;
					case InstrumentType.fm: {
						instrument.algorithm = (Math.random() * Config.algorithms.length)|0;
						instrument.feedbackType = (Math.random() * Config.feedbacks.length)|0;
						const algorithm: Algorithm = Config.algorithms[instrument.algorithm];
						for (let i: number = 0; i < algorithm.carrierCount; i++) {
							instrument.operators[i].frequency = selectCurvedDistribution(0, Config.operatorFrequencies.length - 1, 0, 3);
							instrument.operators[i].amplitude = selectCurvedDistribution(0, Config.operatorAmplitudeMax, Config.operatorAmplitudeMax - 1, 2);
							instrument.operators[i].envelope = Config.envelopes.dictionary["custom"].index;
						}
						for (let i: number = algorithm.carrierCount; i < Config.operatorCount; i++) {
							instrument.operators[i].frequency = selectCurvedDistribution(3, Config.operatorFrequencies.length - 1, 0, 3);
							instrument.operators[i].amplitude = (Math.pow(Math.random(), 2) * Config.operatorAmplitudeMax)|0;
							instrument.operators[i].envelope = Config.envelopes.dictionary[selectWeightedRandom([
								{item: "steady"  , weight: 6},
								{item: "punch"   , weight: 2},
								{item: "flare 1" , weight: 2},
								{item: "flare 2" , weight: 2},
								{item: "flare 3" , weight: 2},
								{item: "twang 1" , weight: 2},
								{item: "twang 2" , weight: 2},
								{item: "twang 3" , weight: 2},
								{item: "swell 1" , weight: 2},
								{item: "swell 2" , weight: 2},
								{item: "swell 3" , weight: 2},
								{item: "tremolo1", weight: 1},
								{item: "tremolo2", weight: 1},
								{item: "tremolo3", weight: 1},
								{item: "tremolo4", weight: 1},
								{item: "tremolo5", weight: 1},
								{item: "tremolo6", weight: 1},
								{item: "decay 1" , weight: 1},
								{item: "decay 2" , weight: 1},
								{item: "decay 3" , weight: 1},
							])].index;
						}
						instrument.feedbackAmplitude = (Math.pow(Math.random(), 3) * Config.operatorAmplitudeMax)|0;
						instrument.feedbackEnvelope = Config.envelopes.dictionary[selectWeightedRandom([
							{item: "steady"  , weight: 4},
							{item: "punch"   , weight: 2},
							{item: "flare 1" , weight: 2},
							{item: "flare 2" , weight: 2},
							{item: "flare 3" , weight: 2},
							{item: "twang 1" , weight: 2},
							{item: "twang 2" , weight: 2},
							{item: "twang 3" , weight: 2},
							{item: "swell 1" , weight: 2},
							{item: "swell 2" , weight: 2},
							{item: "swell 3" , weight: 2},
							{item: "tremolo1", weight: 1},
							{item: "tremolo2", weight: 1},
							{item: "tremolo3", weight: 1},
							{item: "tremolo4", weight: 1},
							{item: "tremolo5", weight: 1},
							{item: "tremolo6", weight: 1},
							{item: "decay 1" , weight: 1},
							{item: "decay 2" , weight: 1},
							{item: "decay 3" , weight: 1},
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
	
	export class ChangePattern extends Change {
		constructor(doc: SongDocument, public oldValue: number, newValue: number) {
			super();
			if (newValue > doc.song.patternsPerChannel) throw new Error("invalid pattern");
			doc.song.channels[doc.channel].bars[doc.bar] = newValue;
			doc.notifier.changed();
			if (oldValue != newValue) this._didSomething();
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
	
	export class ChangeChannelCount extends Change {
		constructor(doc: SongDocument, newPitchChannelCount: number, newNoiseChannelCount: number) {
			super();
			if (doc.song.pitchChannelCount != newPitchChannelCount || doc.song.noiseChannelCount != newNoiseChannelCount) {
				const newChannels: Channel[] = [];
				
				for (let i: number = 0; i < newPitchChannelCount; i++) {
					const channel = i;
					const oldChannel = i;
					if (i < doc.song.pitchChannelCount) {
						newChannels[channel] = doc.song.channels[oldChannel]
					} else {
						newChannels[channel] = new Channel();
						newChannels[channel].octave = 2;
						for (let j: number = 0; j < doc.song.instrumentsPerChannel; j++) {
							const instrument: Instrument = new Instrument(false);
							instrument.setTypeAndReset(InstrumentType.chip, false);
							newChannels[channel].instruments[j] = instrument;
						}
						for (let j: number = 0; j < doc.song.patternsPerChannel; j++) {
							newChannels[channel].patterns[j] = new Pattern();
						}
						for (let j: number = 0; j < doc.song.barCount; j++) {
							newChannels[channel].bars[j] = 1;
						}
					}
				}

				for (let i: number = 0; i < newNoiseChannelCount; i++) {
					const channel = i + newPitchChannelCount;
					const oldChannel = i + doc.song.pitchChannelCount;
					if (i < doc.song.noiseChannelCount) {
						newChannels[channel] = doc.song.channels[oldChannel]
					} else {
						newChannels[channel] = new Channel();
						newChannels[channel].octave = 0;
						for (let j: number = 0; j < doc.song.instrumentsPerChannel; j++) {
							const instrument: Instrument = new Instrument(true);
							instrument.setTypeAndReset(InstrumentType.noise, true);
							newChannels[channel].instruments[j] = instrument;
						}
						for (let j: number = 0; j < doc.song.patternsPerChannel; j++) {
							newChannels[channel].patterns[j] = new Pattern();
						}
						for (let j: number = 0; j < doc.song.barCount; j++) {
							newChannels[channel].bars[j] = 1;
						}
					}
				}
				
				doc.song.pitchChannelCount = newPitchChannelCount;
				doc.song.noiseChannelCount = newNoiseChannelCount;
				for (let channel: number = 0; channel < doc.song.getChannelCount(); channel++) {
					doc.song.channels[channel] = newChannels[channel];
				}
				doc.song.channels.length = doc.song.getChannelCount();
				
				doc.channel = Math.min(doc.channel, newPitchChannelCount + newNoiseChannelCount - 1);
				doc.notifier.changed();
				
				this._didSomething();
			}
		}
	}
	
	export class ChangeChannelBar extends Change {
		constructor(doc: SongDocument, newChannel: number, newBar: number) {
			super();
			const oldChannel: number = doc.channel;
			const oldBar: number = doc.bar;
			doc.channel = newChannel;
			doc.bar = newBar;
			doc.barScrollPos = Math.min(doc.bar, Math.max(doc.bar - (doc.trackVisibleBars - 1), doc.barScrollPos));
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
				instrument.preset = instrument.type;
				doc.notifier.changed();
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
			doc.notifier.changed();
			if (oldValue != newValue) this._didSomething();
		}
	}
	
	export class ChangeFilterResonance extends ChangeInstrumentSlider {
		constructor(doc: SongDocument, oldValue: number, newValue: number) {
			super(doc);
			this._instrument.filterResonance = newValue;
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
			doc.notifier.changed();
			if (oldValue != newValue) this._didSomething();
		}
	}
	
	export class ChangeFeedbackAmplitude extends ChangeInstrumentSlider {
		constructor(doc: SongDocument, oldValue: number, newValue: number) {
			super(doc);
			this._instrument.feedbackAmplitude = newValue;
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
						const newInstrument: Instrument = new Instrument(doc.song.getChannelIsNoise(channel));
						if (sampleInstrument.type == InstrumentType.drumset) {
							// Drumsets are kinda expensive in terms of url length, so don't just copy them willy-nilly.
							newInstrument.setTypeAndReset(InstrumentType.spectrum, true);
						} else {
							newInstrument.fromJsonObject(sampleInstrumentJson, doc.song.getChannelIsNoise(channel));
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
				if (doc.forceRhythmChanges) {
					for (let i: number = 0; i < doc.song.getChannelCount(); i++) {
						for (let j: number = 0; j < doc.song.channels[i].patterns.length; j++) {
							this.append(new ChangeRhythmStepsPerBeat(doc, doc.song.channels[i].patterns[j], Config.rhythms[doc.song.rhythm].stepsPerBeat, Config.rhythms[newValue].stepsPerBeat));
						}
					}
				}
				doc.song.rhythm = newValue;
				doc.notifier.changed();
				this._didSomething();
			}
		}
	}
	
	export class ChangePaste extends ChangeGroup {
		constructor(doc: SongDocument, pattern: Pattern, notes: any[], oldBeatsPerBar: number, oldRhythmStepsPerBeat: number, oldScale: number) {
			super();
			
			pattern.notes.length = 0;
			for (const noteObject of notes) {
				const note: Note = new Note(noteObject["pitches"][0], noteObject["start"], noteObject["end"], noteObject["pins"][0]["volume"], false);
				note.pitches.length = 0;
				for (const pitch of noteObject["pitches"]) {
					note.pitches.push(pitch);
				}
				note.pins.length = 0;
				for (const pin of noteObject["pins"]) {
					note.pins.push(makeNotePin(pin.interval, pin.time, pin.volume));
				}
				pattern.notes.push(note);
			}
			
			if (doc.forceRhythmChanges) {
				this.append(new ChangeRhythmStepsPerBeat(doc, pattern, oldRhythmStepsPerBeat, Config.rhythms[doc.song.rhythm].stepsPerBeat));
			}
			
			if (doc.forceScaleChanges && !doc.song.getChannelIsNoise(doc.channel)) {
				const scaleMap: number[] = generateScaleMap(oldScale, doc.song.scale);
				this.append(new ChangePatternScale(doc, pattern, scaleMap));
			}
			
			if (doc.song.beatsPerBar < oldBeatsPerBar) {
				this.append(new ChangeNoteTruncate(doc, pattern, doc.song.beatsPerBar * Config.partsPerBeat, oldBeatsPerBar * Config.partsPerBeat));
			}
			
			doc.notifier.changed();
			this._didSomething();
		}
	}
	
	export class ChangePasteInstrument extends ChangeGroup {
		constructor(doc: SongDocument, instrument: Instrument, instrumentCopy: any) {
			super();
			instrument.fromJsonObject(instrumentCopy, instrumentCopy["isDrum"]);
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
	
	export class ChangePinTime extends ChangePins {
		constructor(doc: SongDocument, note: Note, pinIndex: number, shiftedTime: number) {
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
		constructor(doc: SongDocument, note: Note, bendStart: number, bendEnd: number, bendTo: number, pitchIndex: number) {
			super(doc, note);
			
			bendStart -= this._oldStart;
			bendEnd   -= this._oldStart;
			bendTo    -= note.pitches[pitchIndex];
			
			let setStart: boolean = false;
			let setEnd: boolean   = false;
			let prevInterval: number = 0;
			let prevVolume: number = 3;
			let persist: boolean = true;
			let i: number;
			let direction: number;
			let stop: number;
			let push: (item: NotePin)=>void;
			if (bendEnd > bendStart) {
				i = 0;
				direction = 1;
				stop = note.pins.length;
				push = (item: NotePin)=>{ this._newPins.push(item); };
			} else {
				i = note.pins.length - 1;
				direction = -1;
				stop = -1;
				push = (item: NotePin)=>{ this._newPins.unshift(item); };
			}
			for (; i != stop; i += direction) {
				const oldPin: NotePin = note.pins[i];
				const time: number = oldPin.time;
				for (;;) {
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
	
	class ChangeRhythmStepsPerBeat extends ChangeSequence {
		constructor(doc: SongDocument, pattern: Pattern, oldRhythmStepsPerBeat: number, newRhythmStepsPerBeat: number) {
			super();
			const minDivision: number = Config.partsPerBeat / newRhythmStepsPerBeat;
			const changeRhythm: (oldTime:number)=>number = function(oldTime: number): number {
				if (oldRhythmStepsPerBeat > newRhythmStepsPerBeat) {
					return Math.ceil(oldTime / minDivision) * minDivision;
				} else if (oldRhythmStepsPerBeat < newRhythmStepsPerBeat) {
					return Math.floor(oldTime / minDivision) * minDivision;
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
		constructor(doc: SongDocument, note: Note, changeRhythm: (oldTime:number)=>number) {
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
									sequence.append(new ChangeNoteTruncate(doc, doc.song.channels[i].patterns[j], newValue * Config.partsPerBeat, doc.song.beatsPerBar * Config.partsPerBeat));
								}
							}
						}
					} break;
					case "stretch": {
						const changeRhythm = function(oldTime: number): number {
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
				
				if (doc.forceScaleChanges) {
					const scaleMap: number[] = generateScaleMap(doc.song.scale, newValue);
					for (let i: number = 0; i < doc.song.pitchChannelCount; i++) {
						for (let j: number = 0; j < doc.song.channels[i].patterns.length; j++) {
							this.append(new ChangePatternScale(doc, doc.song.channels[i].patterns[j], scaleMap));
						}
					}
				}
				
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
			const keyWeights: number[] = [0,0,0,0,0,0,0,0,0,0,0,0];
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
				const keyWeight: number = keyWeights[key] + 0.6 * keyWeights[(key + 7) % 12] + 0.2 * keyWeights[(key + 4) % 12] + 0.2 * keyWeights[(key + 3) % 12];
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
							this.append(new ChangeTranspose(doc, pattern, diff > 0, true));
						}
					}
				}
				
				song.key = bestKey;
				doc.notifier.changed();
				this._didSomething();
			}
		}
	}
	
	export class ChangeSong extends ChangeGroup {
		constructor(doc: SongDocument, newHash: string) {
			super();
			doc.song.fromBase64String(newHash);
			this.append(new ChangeValidateDoc(doc));
			doc.notifier.changed();
			this._didSomething();
		}
	}
	
	export class ChangeValidateDoc extends Change {
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
		constructor(doc: SongDocument, pitchChannels: Channel[], noiseChannels: Channel[]) {
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
			
			// Set minimum counts.
			song.barCount = 1;
			song.instrumentsPerChannel = 1;
			song.patternsPerChannel = 8;
			const combinedChannels: Channel[] = pitchChannels.concat(noiseChannels);
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
			
			song.barCount = Math.min(Config.barCountMax, song.barCount);
			song.patternsPerChannel = Math.min(Config.patternsPerChannelMax, song.patternsPerChannel);
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
					const instrument: Instrument = new Instrument(doc.song.getChannelIsNoise(channelIndex)); 
					if (song.getChannelIsNoise(channelIndex)) {
						instrument.setTypeAndReset(InstrumentType.noise, true);
					} else {
						instrument.setTypeAndReset(InstrumentType.chip, false);
					}
					channel.instruments.push(instrument);
				}
				channel.bars.length = song.barCount;
				channel.patterns.length = song.patternsPerChannel;
				channel.instruments.length = song.instrumentsPerChannel;
			}
			
			song.loopStart = Math.max(0, Math.min(song.barCount - 1, song.loopStart));
			song.loopLength = Math.min(song.barCount - song.loopStart, song.loopLength);
			
			this.append(new ChangeValidateDoc(doc));
			doc.notifier.changed();
			this._didSomething();
		}
	}
	
	export function removeDuplicatePatterns(channels: Channel[]) {
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
					
					let foundConflictingNote: boolean = false;
					for (let noteIndex: number = 0; noteIndex < oldPattern.notes.length; noteIndex++) {
						const oldNote: Note = oldPattern.notes[noteIndex];
						const newNote: Note = newPattern.notes[noteIndex];
						if (newNote.start != oldNote.start || newNote.end != oldNote.end || newNote.pitches.length != oldNote.pitches.length || newNote.pins.length != oldNote.pins.length) {
							foundConflictingNote = true;
							break;
						}
						
						for (let pitchIndex: number = 0; pitchIndex < oldNote.pitches.length; pitchIndex++) {
							if (newNote.pitches[pitchIndex] != oldNote.pitches[pitchIndex]) {
								foundConflictingNote = true;
								break;
							}
						}
						if (foundConflictingNote) break;
						
						for (let pinIndex: number = 0; pinIndex < oldNote.pins.length; pinIndex++) {
							if (newNote.pins[pinIndex].interval != oldNote.pins[pinIndex].interval || newNote.pins[pinIndex].time != oldNote.pins[pinIndex].time || newNote.pins[pinIndex].volume != oldNote.pins[pinIndex].volume) {
								foundConflictingNote = true;
								break;
							}
						}
						if (foundConflictingNote) break;
					}
					
					if (!foundConflictingNote) {
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
			doc.song.tempo = newValue;
			doc.notifier.changed();
			if (oldValue != newValue) this._didSomething();
		}
	}
	
	export class ChangeReverb extends Change {
		constructor(doc: SongDocument, oldValue: number, newValue: number) {
			super();
			doc.song.reverb = newValue;
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
		constructor(doc: SongDocument, note: Note, truncStart: number, truncEnd: number) {
			super(doc, note);
			
			truncStart -= this._oldStart;
			truncEnd   -= this._oldStart;
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
		constructor(doc: SongDocument, pattern: Pattern, start: number, end: number, skipNote?: Note) {
			super();
			let i: number = 0;
			while (i < pattern.notes.length) {
				const note: Note = pattern.notes[i];
				if (note == skipNote && skipNote != undefined) {
					i++;
				} else if (note.end <= start) {
					i++;
				} else if (note.start >= end) {
					break;
				} else if (note.start < start) {
					this.append(new ChangeNoteLength(doc, note, note.start, start));
					i++;
				} else if (note.end > end) {
					this.append(new ChangeNoteLength(doc, note, end, note.end));
					i++;
				} else {
					this.append(new ChangeNoteAdded(doc, pattern, note, i, true));
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
		constructor(doc: SongDocument, note: Note, upward: boolean, ignoreScale: boolean = false) {
			super(false);
			this._doc = doc;
			this._note = note;
			this._oldPins = note.pins;
			this._newPins = [];
			this._oldPitches = note.pitches;
			this._newPitches = [];
			
			const maxPitch: number = (doc.song.getChannelIsNoise(doc.channel) ? Config.drumCount - 1 : Config.maxPitch);
			
			for (let i: number = 0; i < this._oldPitches.length; i++) {
				let pitch: number = this._oldPitches[i];
				if (upward) {
					for (let j: number = pitch + 1; j <= maxPitch; j++) {
						if (doc.song.getChannelIsNoise(doc.channel) || ignoreScale || Config.scales[doc.song.scale].flags[j%12]) {
							pitch = j;
							break;
						}
					}
				} else {
					for (let j: number = pitch - 1; j >= 0; j--) {
						if (doc.song.getChannelIsNoise(doc.channel) || ignoreScale || Config.scales[doc.song.scale].flags[j%12]) {
							pitch = j;
							break;
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
				if (upward) {
					for (let i: number = interval + 1; i <= max; i++) {
						if (doc.song.getChannelIsNoise(doc.channel) || ignoreScale || Config.scales[doc.song.scale].flags[i%12]) {
							interval = i;
							break;
						}
					}
				} else {
					for (let i: number = interval - 1; i >= min; i--) {
						if (doc.song.getChannelIsNoise(doc.channel) || ignoreScale || Config.scales[doc.song.scale].flags[i%12]) {
							interval = i;
							break;
						}
					}
				}
				interval -= this._newPitches[0];
				this._newPins.push(makeNotePin(interval, oldPin.time, oldPin.volume));
			}
			
			if (this._newPins[0].interval != 0) throw new Error("wrong pin start interval");
			
			for (let i: number = 1; i < this._newPins.length - 1; ) {
				if (this._newPins[i-1].interval == this._newPins[i].interval && 
				    this._newPins[i].interval == this._newPins[i+1].interval && 
				    this._newPins[i-1].volume == this._newPins[i].volume && 
				    this._newPins[i].volume == this._newPins[i+1].volume)
				{
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
		constructor(doc: SongDocument, pattern: Pattern, upward: boolean, ignoreScale: boolean = false) {
			super();
			for (let i: number = 0; i < pattern.notes.length; i++) {
				this.append(new ChangeTransposeNote(doc, pattern.notes[i], upward, ignoreScale));
			}
		}
	}
	
	export class ChangePatternScale extends Change {
		constructor(doc: SongDocument, pattern: Pattern, scaleMap: number[]) {
			super();
			const maxPitch: number = Config.maxPitch;
			for (const note of pattern.notes) {
				
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
			
				for (let i: number = 1; i < newPins.length - 1; ) {
					if (newPins[i-1].interval == newPins[i].interval && 
						newPins[i].interval == newPins[i+1].interval && 
						newPins[i-1].volume == newPins[i].volume && 
						newPins[i].volume == newPins[i+1].volume)
					{
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
			doc.notifier.changed();
			if (oldValue != newValue) this._didSomething();
		}
	}
	
	export class ChangeVolumeBend extends UndoableChange {
		private _doc: SongDocument;
		private _note: Note;
		private _oldPins: NotePin[];
		private _newPins: NotePin[];
		constructor(doc: SongDocument, note: Note, bendPart: number, bendVolume: number, bendInterval: number) {
			super(false);
			this._doc = doc;
			this._note = note;
			this._oldPins = note.pins;
			this._newPins = [];
			
			let inserted: boolean = false;
			
			for (const pin of note.pins) {
				if (pin.time < bendPart) {
					this._newPins.push(pin);
				} else if (pin.time == bendPart) {
					this._newPins.push(makeNotePin(bendInterval, bendPart, bendVolume));
					inserted = true;
				} else {
					if (!inserted) {
						this._newPins.push(makeNotePin(bendInterval, bendPart, bendVolume));
						inserted = true;
					}
					this._newPins.push(pin);
				}
			}
			
			for (let i: number = 1; i < this._newPins.length - 1; ) {
				if (this._newPins[i-1].interval == this._newPins[i].interval && 
				    this._newPins[i].interval == this._newPins[i+1].interval && 
				    this._newPins[i-1].volume == this._newPins[i].volume && 
				    this._newPins[i].volume == this._newPins[i+1].volume)
				{
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
}
