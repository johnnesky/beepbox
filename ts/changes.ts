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
	
	export class ChangeInstrumentType extends Change {
		constructor(doc: SongDocument, newValue: number) {
			super();
			const oldValue: number = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()].type;
			if (oldValue != newValue) {
				doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()].type = newValue
				doc.notifier.changed();
				this._didSomething();
			}
		}
	}
	
	export class ChangeTransition extends Change {
		constructor(doc: SongDocument, newValue: number) {
			super();
			const oldValue: number = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()].transition;
			if (oldValue != newValue) {
				this._didSomething();
				doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()].transition = newValue;
				doc.notifier.changed();
			}
		}
	}
	
	export class ChangeDelay extends Change {
		constructor(doc: SongDocument, newValue: number) {
			super();
			const oldValue: number = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()].delay;
			if (oldValue != newValue) {
				this._didSomething();
				doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()].delay = newValue;
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
		constructor(doc: SongDocument, newValue: number) {
			super();
			if (doc.song.barCount != newValue) {
				for (let channel: number = 0; channel < doc.song.getChannelCount(); channel++) {
					for (let bar: number = doc.song.barCount; bar < newValue; bar++) {
						doc.song.channels[channel].bars[bar] = 1;
					}
					doc.song.channels[channel].bars.length = newValue;
				}
				
				let newBar: number = doc.bar;
				let newBarScrollPos: number = doc.barScrollPos;
				let newLoopStart: number = doc.song.loopStart;
				let newLoopLength: number = doc.song.loopLength;
				if (doc.song.barCount > newValue) {
					newBar = Math.min(newBar, newValue - 1);
					newBarScrollPos = Math.max(0, Math.min(newValue - doc.trackVisibleBars, newBarScrollPos));
					newLoopLength = Math.min(newValue, newLoopLength);
					newLoopStart = Math.min(newValue - newLoopLength, newLoopStart);
				}
				doc.bar = newBar;
				doc.barScrollPos = newBarScrollPos;
				doc.song.loopStart = newLoopStart;
				doc.song.loopLength = newLoopLength;
				doc.song.barCount = newValue;
				doc.notifier.changed();
				
				this._didSomething();
			}
		}
	}
	
	export class ChangeChannelCount extends Change {
		constructor(doc: SongDocument, newPitchChannelCount: number, newDrumChannelCount: number) {
			super();
			if (doc.song.pitchChannelCount != newPitchChannelCount || doc.song.drumChannelCount != newDrumChannelCount) {
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
							const instrument: Instrument = new Instrument();
							instrument.setTypeAndReset(InstrumentType.chip);
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

				for (let i: number = 0; i < newDrumChannelCount; i++) {
					const channel = i + newPitchChannelCount;
					const oldChannel = i + doc.song.pitchChannelCount;
					if (i < doc.song.drumChannelCount) {
						newChannels[channel] = doc.song.channels[oldChannel]
					} else {
						newChannels[channel] = new Channel();
						newChannels[channel].octave = 0;
						for (let j: number = 0; j < doc.song.instrumentsPerChannel; j++) {
							const instrument: Instrument = new Instrument();
							instrument.setTypeAndReset(InstrumentType.noise);
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
				doc.song.drumChannelCount = newDrumChannelCount;
				for (let channel: number = 0; channel < doc.song.getChannelCount(); channel++) {
					doc.song.channels[channel] = newChannels[channel];
				}
				doc.song.channels.length = doc.song.getChannelCount();
				
				doc.channel = Math.min(doc.channel, newPitchChannelCount + newDrumChannelCount - 1);
				doc.notifier.changed();
				
				this._didSomething();
			}
		}
	}
	
	export class ChangeBeatsPerBar extends Change {
		constructor(doc: SongDocument, newValue: number) {
			super();
			if (doc.song.beatsPerBar != newValue) {
				if (doc.song.beatsPerBar > newValue) {
					const sequence: ChangeSequence = new ChangeSequence();
					for (let i: number = 0; i < doc.song.getChannelCount(); i++) {
						for (let j: number = 0; j < doc.song.channels[i].patterns.length; j++) {
							sequence.append(new ChangeNoteTruncate(doc, doc.song.channels[i].patterns[j], newValue * Config.partsPerBeat, doc.song.beatsPerBar * Config.partsPerBeat));
						}
					}
				}
				doc.song.beatsPerBar = newValue;
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
			const oldValue: number = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()].interval;
			if (oldValue != newValue) {
				this._didSomething();
				doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()].interval = newValue;
				doc.notifier.changed();
			}
		}
	}
	
	export class ChangeChord extends Change {
		constructor(doc: SongDocument, newValue: number) {
			super();
			const oldValue: number = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()].chord;
			if (oldValue != newValue) {
				this._didSomething();
				doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()].chord = newValue;
				doc.notifier.changed();
			}
		}
	}
	
	export class ChangeVibrato extends Change {
		constructor(doc: SongDocument, newValue: number) {
			super();
			const oldValue: number = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()].vibrato;
			if (oldValue != newValue) {
				doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()].vibrato = newValue;
				doc.notifier.changed();
				this._didSomething();
			}
		}
	}
	
	export class ChangeFilterCutoff extends Change {
		constructor(doc: SongDocument, oldValue: number, newValue: number) {
			super();
			doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()].filterCutoff = newValue;
			doc.notifier.changed();
			if (oldValue != newValue) this._didSomething();
		}
	}
	
	export class ChangeFilterResonance extends Change {
		constructor(doc: SongDocument, oldValue: number, newValue: number) {
			super();
			doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()].filterResonance = newValue;
			doc.notifier.changed();
			if (oldValue != newValue) this._didSomething();
		}
	}
	
	export class ChangeFilterEnvelope extends Change {
		constructor(doc: SongDocument, newValue: number) {
			super();
			const oldValue: number = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()].filterEnvelope;
			if (oldValue != newValue) {
				doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()].filterEnvelope = newValue;
				doc.notifier.changed();
				this._didSomething();
			}
		}
	}
	
	export class ChangeAlgorithm extends Change {
		constructor(doc: SongDocument, newValue: number) {
			super();
			const oldValue: number = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()].algorithm;
			if (oldValue != newValue) {
				doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()].algorithm = newValue;
				doc.notifier.changed();
				this._didSomething();
			}
		}
	}
	
	export class ChangeFeedbackType extends Change {
		constructor(doc: SongDocument, newValue: number) {
			super();
			const oldValue: number = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()].feedbackType;
			if (oldValue != newValue) {
				doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()].feedbackType = newValue;
				doc.notifier.changed();
				this._didSomething();
			}
		}
	}
	
	export class ChangeFeedbackEnvelope extends Change {
		constructor(doc: SongDocument, newValue: number) {
			super();
			const oldValue: number = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()].feedbackEnvelope;
			if (oldValue != newValue) {
				doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()].feedbackEnvelope = newValue;
				doc.notifier.changed();
				this._didSomething();
			}
		}
	}
	
	export class ChangeOperatorEnvelope extends Change {
		constructor(doc: SongDocument, operatorIndex: number, newValue: number) {
			super();
			const oldValue: number = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()].operators[operatorIndex].envelope;
			if (oldValue != newValue) {
				doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()].operators[operatorIndex].envelope = newValue;
				doc.notifier.changed();
				this._didSomething();
			}
		}
	}
	
	export class ChangeOperatorFrequency extends Change {
		constructor(doc: SongDocument, operatorIndex: number, newValue: number) {
			super();
			const oldValue: number = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()].operators[operatorIndex].frequency;
			if (oldValue != newValue) {
				doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()].operators[operatorIndex].frequency = newValue;
				doc.notifier.changed();
				this._didSomething();
			}
		}
	}
	
	export class ChangeOperatorAmplitude extends Change {
		constructor(doc: SongDocument, operatorIndex: number, oldValue: number, newValue: number) {
			super();
			doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()].operators[operatorIndex].amplitude = newValue;
			doc.notifier.changed();
			if (oldValue != newValue) this._didSomething();
		}
	}
	
	export class ChangeFeedbackAmplitude extends Change {
		constructor(doc: SongDocument, oldValue: number, newValue: number) {
			super();
			doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()].feedbackAmplitude = newValue;
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
					for (let j: number = doc.song.instrumentsPerChannel; j < newInstrumentsPerChannel; j++) {
						const newInstrument: Instrument = new Instrument();
						newInstrument.copy(sampleInstrument);
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
		constructor(doc: SongDocument, pattern: Pattern, notes: Note[], oldBeatsPerBar: number, oldRhythmStepsPerBeat: number, oldScale: number) {
			super();
			pattern.notes = notes;
			
			if (doc.forceRhythmChanges) {
				this.append(new ChangeRhythmStepsPerBeat(doc, pattern, oldRhythmStepsPerBeat, Config.rhythms[doc.song.rhythm].stepsPerBeat));
			}
			
			if (doc.forceScaleChanges && !doc.song.getChannelIsDrum(doc.channel)) {
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
			instrument.fromJsonObject(instrumentCopy, instrumentCopy.isDrum);
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
		constructor(doc: SongDocument, bar: Pattern, oldRhythmStepsPerBeat: number, newRhythmStepsPerBeat: number) {
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
			while (i < bar.notes.length) {
				const note: Note = bar.notes[i];
				if (changeRhythm(note.start) >= changeRhythm(note.end)) {
					this.append(new ChangeNoteAdded(doc, bar, note, i, true));
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
			removeExtraSparseChannels(noiseChannels, Config.drumChannelCountMax);
			
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
			song.drumChannelCount = noiseChannels.length;
			
			song.barCount = Math.min(Config.barCountMax, song.barCount);
			song.patternsPerChannel = Math.min(Config.patternsPerChannelMax, song.patternsPerChannel);
			song.instrumentsPerChannel = Math.min(Config.instrumentsPerChannelMax, song.instrumentsPerChannel);
			for (const channel of song.channels) {
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
					const instrument: Instrument = new Instrument(); 
					instrument.setTypeAndReset(InstrumentType.chip);
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
		constructor(doc: SongDocument, note: Note, upward: boolean) {
			super(false);
			this._doc = doc;
			this._note = note;
			this._oldPins = note.pins;
			this._newPins = [];
			this._oldPitches = note.pitches;
			this._newPitches = [];
			
			const maxPitch: number = (doc.song.getChannelIsDrum(doc.channel) ? Config.drumCount - 1 : Config.maxPitch);
			
			for (let i: number = 0; i < this._oldPitches.length; i++) {
				let pitch: number = this._oldPitches[i];
				if (upward) {
					for (let j: number = pitch + 1; j <= maxPitch; j++) {
						if (doc.song.getChannelIsDrum(doc.channel) || Config.scales[doc.song.scale].flags[j%12]) {
							pitch = j;
							break;
						}
					}
				} else {
					for (let j: number = pitch - 1; j >= 0; j--) {
						if (doc.song.getChannelIsDrum(doc.channel) || Config.scales[doc.song.scale].flags[j%12]) {
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
						if (doc.song.getChannelIsDrum(doc.channel) || Config.scales[doc.song.scale].flags[i%12]) {
							interval = i;
							break;
						}
					}
				} else {
					for (let i: number = interval - 1; i >= min; i--) {
						if (doc.song.getChannelIsDrum(doc.channel) || Config.scales[doc.song.scale].flags[i%12]) {
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
		constructor(doc: SongDocument, pattern: Pattern, upward: boolean) {
			super();
			for (let i: number = 0; i < pattern.notes.length; i++) {
				this.append(new ChangeTransposeNote(doc, pattern.notes[i], upward));
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
	
	export class ChangeWave extends Change {
		constructor(doc: SongDocument, newValue: number) {
			super();
			if (doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()].wave != newValue) {
				doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()].wave = newValue;
				doc.notifier.changed();
				this._didSomething();
			}
		}
	}
}
