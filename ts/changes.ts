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
	
	export class ChangeEnvelope extends Change {
		constructor(doc: SongDocument, newValue: number) {
			super();
			const oldValue: number = doc.song.instrumentEnvelopes[doc.channel][doc.getCurrentInstrument()];
			if (oldValue != newValue) {
				this._didSomething();
				doc.song.instrumentEnvelopes[doc.channel][doc.getCurrentInstrument()] = newValue;
				doc.notifier.changed();
			}
		}
	}
	
	export class ChangeBarPattern extends Change {
		constructor(doc: SongDocument, public oldValue: number, newValue: number) {
			super();
			if (newValue > doc.song.channelPatterns[doc.channel].length) throw new Error("invalid pattern");
			doc.song.channelBars[doc.channel][doc.bar] = newValue;
			doc.notifier.changed();
			if (oldValue != newValue) this._didSomething();
		}
	}
	
	export class ChangeBarCount extends Change {
		constructor(doc: SongDocument, newValue: number) {
			super();
			if (doc.song.barCount != newValue) {
				const newChannelBars: number[][] = [];
				for (let i: number = 0; i < doc.song.getChannelCount(); i++) {
					const channel: number[] = [];
					for (let j: number = 0; j < newValue; j++) {
						channel.push(j < doc.song.barCount ? doc.song.channelBars[i][j] : 1);
					}
					newChannelBars.push(channel);
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
				doc.song.channelBars = newChannelBars;
				doc.notifier.changed();
				
				this._didSomething();
			}
		}
	}
	
	export class ChangeChannelCount extends Change {
		constructor(doc: SongDocument, newPitchChannelCount: number, newDrumChannelCount: number) {
			super();
			if (doc.song.pitchChannelCount != newPitchChannelCount || doc.song.drumChannelCount != newDrumChannelCount) {
				const channelPatterns: BarPattern[][] = [];
				const channelBars: number[][] = [];
				const channelOctaves: number[] = [];
				const instrumentWaves: number[][] = [];
				const instrumentFilters: number[][] = [];
				const instrumentEnvelopes: number[][] = [];
				const instrumentEffects: number[][] = [];
				const instrumentChorus: number[][] = [];
				const instrumentVolumes: number[][] = [];
				
				for (let i: number = 0; i < newPitchChannelCount; i++) {
					const channel = i;
					const oldChannel = i;
					if (i < doc.song.pitchChannelCount) {
						channelPatterns[channel] = doc.song.channelPatterns[oldChannel];
						channelBars[channel] = doc.song.channelBars[oldChannel];
						channelOctaves[channel] = doc.song.channelOctaves[oldChannel];
						instrumentWaves[channel] = doc.song.instrumentWaves[oldChannel];
						instrumentFilters[channel] = doc.song.instrumentFilters[oldChannel];
						instrumentEnvelopes[channel] = doc.song.instrumentEnvelopes[oldChannel];
						instrumentEffects[channel] = doc.song.instrumentEffects[oldChannel];
						instrumentChorus[channel] = doc.song.instrumentChorus[oldChannel];
						instrumentVolumes[channel] = doc.song.instrumentVolumes[oldChannel];
					} else {
						channelPatterns[channel] = [];
						for (let j = 0; j < doc.song.patternsPerChannel; j++) channelPatterns[channel][j] = new BarPattern();
						channelBars[channel] = filledArray(doc.song.barCount, 1);
						channelOctaves[channel] = 2;
						instrumentWaves[channel] = filledArray(doc.song.instrumentsPerChannel, 1);
						instrumentFilters[channel] = filledArray(doc.song.instrumentsPerChannel, 0);
						instrumentEnvelopes[channel] = filledArray(doc.song.instrumentsPerChannel, 1);
						instrumentEffects[channel] = filledArray(doc.song.instrumentsPerChannel, 0);
						instrumentChorus[channel] = filledArray(doc.song.instrumentsPerChannel, 0);
						instrumentVolumes[channel] = filledArray(doc.song.instrumentsPerChannel, 0);
					}
				}

				for (let i: number = 0; i < newDrumChannelCount; i++) {
					const channel = i + newPitchChannelCount;
					const oldChannel = i + doc.song.pitchChannelCount;
					if (i < doc.song.drumChannelCount) {
						channelPatterns[channel] = doc.song.channelPatterns[oldChannel];
						channelBars[channel] = doc.song.channelBars[oldChannel];
						channelOctaves[channel] = doc.song.channelOctaves[oldChannel];
						instrumentWaves[channel] = doc.song.instrumentWaves[oldChannel];
						instrumentFilters[channel] = doc.song.instrumentFilters[oldChannel];
						instrumentEnvelopes[channel] = doc.song.instrumentEnvelopes[oldChannel];
						instrumentEffects[channel] = doc.song.instrumentEffects[oldChannel];
						instrumentChorus[channel] = doc.song.instrumentChorus[oldChannel];
						instrumentVolumes[channel] = doc.song.instrumentVolumes[oldChannel];
					} else {
						channelPatterns[channel] = [];
						for (let j = 0; j < doc.song.patternsPerChannel; j++) channelPatterns[channel][j] = new BarPattern();
						channelBars[channel] = filledArray(doc.song.barCount, 1);
						channelOctaves[channel] = 0;
						instrumentWaves[channel] = filledArray(doc.song.instrumentsPerChannel, 1);
						instrumentFilters[channel] = filledArray(doc.song.instrumentsPerChannel, 0);
						instrumentEnvelopes[channel] = filledArray(doc.song.instrumentsPerChannel, 1);
						instrumentEffects[channel] = filledArray(doc.song.instrumentsPerChannel, 0);
						instrumentChorus[channel] = filledArray(doc.song.instrumentsPerChannel, 0);
						instrumentVolumes[channel] = filledArray(doc.song.instrumentsPerChannel, 0);
					}
				}
				
				doc.song.pitchChannelCount = newPitchChannelCount;
				doc.song.drumChannelCount = newDrumChannelCount;
				doc.song.channelPatterns = channelPatterns;
				doc.song.channelBars = channelBars;
				doc.song.channelOctaves = channelOctaves;
				doc.song.instrumentWaves = instrumentWaves;
				doc.song.instrumentFilters = instrumentFilters;
				doc.song.instrumentEnvelopes = instrumentEnvelopes;
				doc.song.instrumentEffects = instrumentEffects;
				doc.song.instrumentChorus = instrumentChorus;
				doc.song.instrumentVolumes = instrumentVolumes;
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
						for (let j: number = 0; j < doc.song.channelPatterns[i].length; j++) {
							sequence.append(new ChangeNoteTruncate(doc, doc.song.channelPatterns[i][j], newValue * doc.song.partsPerBeat, doc.song.beatsPerBar * doc.song.partsPerBeat));
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
	
	export class ChangeChorus extends Change {
		constructor(doc: SongDocument, newValue: number) {
			super();
			const oldValue: number = doc.song.instrumentChorus[doc.channel][doc.getCurrentInstrument()];
			if (oldValue != newValue) {
				this._didSomething();
				doc.song.instrumentChorus[doc.channel][doc.getCurrentInstrument()] = newValue;
				doc.notifier.changed();
			}
		}
	}
	
	export class ChangeEffect extends Change {
		constructor(doc: SongDocument, newValue: number) {
			super();
			const oldValue: number = doc.song.instrumentEffects[doc.channel][doc.getCurrentInstrument()];
			if (oldValue != newValue) {
				doc.song.instrumentEffects[doc.channel][doc.getCurrentInstrument()] = newValue;
				doc.notifier.changed();
				this._didSomething();
			}
		}
	}
	
	export class ChangeFilter extends Change {
		constructor(doc: SongDocument, newValue: number) {
			super();
			const oldValue: number = doc.song.instrumentFilters[doc.channel][doc.getCurrentInstrument()];
			if (oldValue != newValue) {
				doc.song.instrumentFilters[doc.channel][doc.getCurrentInstrument()] = newValue;
				doc.notifier.changed();
				this._didSomething();
			}
		}
	}
	
	export class ChangeInstrumentsPerChannel extends Change {
		constructor(doc: SongDocument, instrumentsPerChannel: number) {
			super();
			const oldInstrumentsPerChannel: number = doc.song.instrumentsPerChannel;
			const newInstrumentsPerChannel: number = instrumentsPerChannel;
			if (doc.song.instrumentsPerChannel != newInstrumentsPerChannel) {
				// todo: adjust size of instrument arrays, make sure no references to invalid instruments
				const oldInstrumentWaves: number[][]   = doc.song.instrumentWaves;
				const oldInstrumentFilters: number[][] = doc.song.instrumentFilters;
				const oldInstrumentEnvelopes: number[][] = doc.song.instrumentEnvelopes;
				const oldInstrumentEffects: number[][] = doc.song.instrumentEffects;
				const oldInstrumentChorus: number[][]  = doc.song.instrumentChorus;
				const oldInstrumentVolumes: number[][] = doc.song.instrumentVolumes;
				const newInstrumentWaves: number[][]   = [];
				const newInstrumentFilters: number[][] = [];
				const newInstrumentEnvelopes: number[][] = [];
				const newInstrumentEffects: number[][] = [];
				const newInstrumentChorus: number[][]  = [];
				const newInstrumentVolumes: number[][] = [];
				const oldArrays: number[][][] = [oldInstrumentWaves, oldInstrumentFilters, oldInstrumentEnvelopes, oldInstrumentEffects, oldInstrumentChorus, oldInstrumentVolumes];
				const newArrays: number[][][] = [newInstrumentWaves, newInstrumentFilters, newInstrumentEnvelopes, newInstrumentEffects, newInstrumentChorus, newInstrumentVolumes];
				for (let k: number = 0; k < newArrays.length; k++) {
					const oldArray: number[][] = oldArrays[k];
					const newArray: number[][] = newArrays[k];
					for (let i: number = 0; i < doc.song.getChannelCount(); i++) {
						const channel: number[] = [];
						for (let j: number = 0; j < newInstrumentsPerChannel; j++) {
							if (j < oldInstrumentsPerChannel) {
								channel.push(oldArray[i][j]);
							} else {
								if (k == 0) { // square wave or white noise
									channel.push(1);
								} else if (k == 2) { // sudden envelope
									channel.push(1);
								} else {
									channel.push(0);
								}
							}
						}
						newArray.push(channel);
					}
				}
				
				const newInstrumentIndices: number[][] = [];
				for (let i: number = 0; i < doc.song.getChannelCount(); i++) {
					const oldIndices: number[] = [];
					const newIndices: number[] = [];
					for (let j: number = 0; j < doc.song.patternsPerChannel; j++) {
						const oldIndex: number = doc.song.channelPatterns[i][j].instrument;
						oldIndices.push(oldIndex);
						newIndices.push(oldIndex < newInstrumentsPerChannel ? oldIndex : 0);
					}
					newInstrumentIndices.push(newIndices);
				}
				doc.song.instrumentsPerChannel = newInstrumentsPerChannel;
				doc.song.instrumentWaves   = newInstrumentWaves;
				doc.song.instrumentFilters = newInstrumentFilters;
				doc.song.instrumentEnvelopes = newInstrumentEnvelopes;
				doc.song.instrumentEffects = newInstrumentEffects;
				doc.song.instrumentChorus  = newInstrumentChorus;
				doc.song.instrumentVolumes = newInstrumentVolumes;
				for (let i: number = 0; i < doc.song.getChannelCount(); i++) {
					for (let j: number = 0; j < doc.song.patternsPerChannel; j++) {
						doc.song.channelPatterns[i][j].instrument = newInstrumentIndices[i][j];
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
		private _pattern: BarPattern;
		private _note: Note;
		private _pitch: number;
		private _index: number;
		constructor(doc: SongDocument, pattern: BarPattern, note: Note, pitch: number, index: number, deletion: boolean = false) {
			super(deletion);
			this._doc = doc;
			this._pattern = pattern;
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
			doc.song.channelOctaves[doc.channel] = newValue;
			doc.notifier.changed();
			if (oldValue != newValue) this._didSomething();
		}
	}
	
	export class ChangePartsPerBeat extends ChangeGroup {
		constructor(doc: SongDocument, newValue: number) {
			super();
			if (doc.song.partsPerBeat != newValue) {
				for (let i: number = 0; i < doc.song.getChannelCount(); i++) {
					for (let j: number = 0; j < doc.song.channelPatterns[i].length; j++) {
						this.append(new ChangeRhythm(doc, doc.song.channelPatterns[i][j], doc.song.partsPerBeat, newValue));
					}
				}
				doc.song.partsPerBeat = newValue;
				doc.notifier.changed();
				this._didSomething();
			}
		}
	}
	
	export class ChangePaste extends ChangeGroup {
		constructor(doc: SongDocument, pattern: BarPattern, notes: Note[], newBeatsPerBar: number, newPartsPerBeat: number) {
			super();
			pattern.notes = notes;
			
			if (doc.song.partsPerBeat != newPartsPerBeat) {
				this.append(new ChangeRhythm(doc, pattern, newPartsPerBeat, doc.song.partsPerBeat));
			}
			
			if (doc.song.beatsPerBar != newBeatsPerBar) {
				this.append(new ChangeNoteTruncate(doc, pattern, doc.song.beatsPerBar * doc.song.partsPerBeat, newBeatsPerBar * doc.song.partsPerBeat));
			}
			
			doc.notifier.changed();
			this._didSomething();
		}
	}
	
	export class ChangePatternInstrument extends Change {
		constructor(doc: SongDocument, newValue: number, pattern: BarPattern) {
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
					const channelBars: number[] = doc.song.channelBars[i];
					const channelPatterns: BarPattern[] = doc.song.channelPatterns[i];
					for (let j: number = 0; j < channelBars.length; j++) {
						if (channelBars[j] > newValue) channelBars[j] = 0;
					}
					for (let j: number = channelPatterns.length; j < newValue; j++) {
						channelPatterns[j] = new BarPattern();
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
	
	export class ChangeRhythm extends ChangeSequence {
		constructor(doc: SongDocument, bar: BarPattern, oldPartsPerBeat: number, newPartsPerBeat: number) {
			super();
			let changeRhythm: (oldTime:number)=>number;
			
			if (oldPartsPerBeat > newPartsPerBeat) {
				changeRhythm = (oldTime: number)=> Math.ceil(oldTime * newPartsPerBeat / oldPartsPerBeat);
			} else if (oldPartsPerBeat < newPartsPerBeat) {
				changeRhythm = (oldTime: number)=> Math.floor(oldTime * newPartsPerBeat / oldPartsPerBeat);
			} else {
				throw new Error("ChangeRhythm couldn't handle rhythm change from " + oldPartsPerBeat + " to " + newPartsPerBeat + ".");
			}
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
	
	export class ChangeRhythmNote extends ChangePins {
		constructor(doc: SongDocument, note: Note, changeRhythm: (oldTime:number)=>number) {
			super(doc, note);
			
			for (const oldPin of this._oldPins) {
				this._newPins.push(makeNotePin(oldPin.interval, changeRhythm(oldPin.time + this._oldStart) - this._oldStart, oldPin.volume));
			}
			
			this._finishSetup();
		}
	}
	
	export class ChangeScale extends Change {
		constructor(doc: SongDocument, newValue: number) {
			super();
			if (doc.song.scale != newValue) {
				doc.song.scale = newValue;
				doc.notifier.changed();
				this._didSomething();
			}
		}
	}
	
	export class ChangeSong extends Change {
		constructor(doc: SongDocument, newHash: string) {
			super();
			doc.song.fromBase64String(newHash);
			doc.channel = Math.min(doc.channel, doc.song.getChannelCount() - 1);
			doc.bar = Math.max(0, Math.min(doc.song.barCount - 1, doc.bar));
			doc.barScrollPos = Math.max(0, Math.min(doc.song.barCount - doc.trackVisibleBars, doc.barScrollPos));
			doc.barScrollPos = Math.min(doc.bar, Math.max(doc.bar - (doc.trackVisibleBars - 1), doc.barScrollPos));
			doc.notifier.changed();
			this._didSomething();
		}
	}
	
	export class ChangeTempo extends Change {
		constructor(doc: SongDocument, public oldValue: number, newValue: number) {
			super();
			doc.song.tempo = newValue;
			doc.notifier.changed();
			if (oldValue != newValue) this._didSomething();
		}
	}
	
	export class ChangeReverb extends Change {
		constructor(doc: SongDocument, public oldValue: number, newValue: number) {
			super();
			doc.song.reverb = newValue;
			doc.notifier.changed();
			if (oldValue != newValue) this._didSomething();
		}
	}
	
	export class ChangeNoteAdded extends UndoableChange {
		private _doc: SongDocument;
		private _bar: BarPattern;
		private _note: Note;
		private _index: number;
		constructor(doc: SongDocument, bar: BarPattern, note: Note, index: number, deletion: boolean = false) {
			super(deletion);
			this._doc = doc;
			this._bar = bar;
			this._note = note;
			this._index = index;
			this._didSomething();
			this.redo();
		}
		
		protected _doForwards(): void {
			this._bar.notes.splice(this._index, 0, this._note);
			this._doc.notifier.changed();
		}
		
		protected _doBackwards(): void {
			this._bar.notes.splice(this._index, 1);
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
		constructor(doc: SongDocument, bar: BarPattern, start: number, end: number, skipNote?: Note) {
			super();
			let i: number = 0;
			while (i < bar.notes.length) {
				const note: Note = bar.notes[i];
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
					this.append(new ChangeNoteAdded(doc, bar, note, i, true));
				}
			}
		}
	}
	
	export class ChangeTransposeNote extends UndoableChange {
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
						if (doc.song.getChannelIsDrum(doc.channel) || Config.scaleFlags[doc.song.scale][j%12]) {
							pitch = j;
							break;
						}
					}
				} else {
					for (let j: number = pitch - 1; j >= 0; j--) {
						if (doc.song.getChannelIsDrum(doc.channel) || Config.scaleFlags[doc.song.scale][j%12]) {
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
						if (doc.song.getChannelIsDrum(doc.channel) || Config.scaleFlags[doc.song.scale][i%12]) {
							interval = i;
							break;
						}
					}
				} else {
					for (let i: number = interval - 1; i >= min; i--) {
						if (doc.song.getChannelIsDrum(doc.channel) || Config.scaleFlags[doc.song.scale][i%12]) {
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
		constructor(doc: SongDocument, bar: BarPattern, upward: boolean) {
			super();
			for (let i: number = 0; i < bar.notes.length; i++) {
				this.append(new ChangeTransposeNote(doc, bar.notes[i], upward));
			}
		}
	}
	
	export class ChangeVolume extends Change {
		constructor(doc: SongDocument, public oldValue: number, newValue: number) {
			super();
			doc.song.instrumentVolumes[doc.channel][doc.getCurrentInstrument()] = newValue;
			doc.notifier.changed();
			if (oldValue != newValue) this._didSomething();
		}
	}
	
	export class ChangeVolumeBend extends UndoableChange {
		private _doc: SongDocument;
		private _bar: BarPattern;
		private _note: Note;
		private _oldPins: NotePin[];
		private _newPins: NotePin[];
		constructor(doc: SongDocument, bar: BarPattern, note: Note, bendPart: number, bendVolume: number, bendInterval: number) {
			super(false);
			this._doc = doc;
			this._bar = bar;
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
			if (doc.song.instrumentWaves[doc.channel][doc.getCurrentInstrument()] != newValue) {
				doc.song.instrumentWaves[doc.channel][doc.getCurrentInstrument()] = newValue;
				doc.notifier.changed();
				this._didSomething();
			}
		}
	}
	
	function filledArray<T>(count: number, value: T): T[] {
		const array: T[] = [];
		for (let i: number = 0; i < count; i++) array[i] = value;
		return array;
	}
}
