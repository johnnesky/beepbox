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

"use strict";

module beepbox {
	export function lerp(low: number, high: number, t: number): number {
		return low + t * (high - low);
	}
	
	export namespace html {
		export function element(type: string, attributes?: Record<string, string | number>, children?: Node[]): HTMLElement {
			const elem: HTMLElement = document.createElement(type);
			if (attributes) for (const key of Object.keys(attributes)) {
				if (key == "style") elem.setAttribute(key, <string>attributes[key]); else (<any>elem)[key] = attributes[key];
			}
			if (children) for (const child of children) elem.appendChild(child);
			return elem;
		}
		export function button(attributes?: Record<string, string | number>, children?: Node[]): HTMLButtonElement {
			return <HTMLButtonElement> element("button", attributes, children);
		}
		export function div(attributes?: Record<string, string | number>, children?: Node[]): HTMLDivElement {
			return <HTMLDivElement> element("div", attributes, children);
		}
		export function span(attributes?: Record<string, string | number>, children?: Node[]): HTMLSpanElement {
			return <HTMLSpanElement> element("span", attributes, children);
		}
		export function select(attributes?: Record<string, string | number>, children?: Node[]): HTMLSelectElement {
			return <HTMLSelectElement> element("select", attributes, children);
		}
		export function canvas(attributes?: Record<string, string | number>): HTMLCanvasElement {
			return <HTMLCanvasElement> element("canvas", attributes);
		}
		export function input(attributes?: Record<string, string | number>): HTMLInputElement {
			return <HTMLInputElement> element("input", attributes);
		}
		export function br(): HTMLBRElement {
			return <HTMLBRElement> element("br");
		}
		export function text(content: string): Text {
			return document.createTextNode(content);
		}
	}
	
	const svgNS: string = "http://www.w3.org/2000/svg";
	export function svgElement(type: string, attributes?: Record<string, string | number>, children?: Node[]): SVGElement {
		const elem: SVGElement = <SVGElement> document.createElementNS(svgNS, type);
		if (attributes) for (const key of Object.keys(attributes)) elem.setAttribute(key, <string>attributes[key]);
		if (children) for (const child of children) elem.appendChild(child);
		return elem;
	}
	
	export class Model {
		private static _waitingForFrame: Model[] = [];
		private _watchers: (()=>void)[] = [];
		//private _parentModels: Model[] = [];
		private _dirty: boolean = false;
		
		public watch(watcher: ()=>void): void {
			if (this._watchers.indexOf(watcher) == -1) {
				this._watchers.push(watcher);
			}
		}
		
		public unwatch(watcher: ()=>void): void {
			const index: number = this._watchers.indexOf(watcher);
			if (index != -1) {
				this._watchers.splice(index, 1);
			}
		}
		
		public changed(): void {
			if (this._dirty == false) {
				this._dirty = true;
				Model._waitingForFrame.push(this);
				/*for (const parentModel of this._parentModels) {
					this._parentModel.changed();
				}*/
			}
		}
		
		private _update(): void {
			this._dirty = false;
			for (const watcher of this._watchers.concat()) {
				watcher();
			}
		}
		
		public static updateAll(): void {
			for (const model of this._waitingForFrame.concat()) {
				model._update();
			}
			this._waitingForFrame.length = 0;
		}
	}
	
	export class Change {
		private _reversed: boolean;
		private _noop: boolean;
		private _doneForwards: boolean;
		constructor(reversed: boolean) {
			this._reversed = reversed;
			this._doneForwards = !reversed;
			this._noop = true;
		}
		
		protected _didSomething(): void {
			this._noop = false;
		}
		
		public isNoop(): boolean {
			return this._noop;
		}
		
		public undo(): void {
			if (this._reversed) {
				this._doForwards();
				this._doneForwards = true;
			} else {
				this._doBackwards();
				this._doneForwards = false;
			}
		}
		
		public redo(): void {
			if (this._reversed) {
				this._doBackwards();
				this._doneForwards = false;
			} else {
				this._doForwards();
				this._doneForwards = true;
			}
		}
		
		// isDoneForwards() returns whether or not the Change was most recently 
		// performed forwards or backwards. If the change created something, do not 
		// delete it in the change destructor unless the Change was performed 
		// backwards: 
		protected _isDoneForwards(): boolean {
			return this._doneForwards;
		}
		
		protected _doForwards(): void {
			throw new Error("Change.doForwards(): Override me.");
		}
		
		protected _doBackwards(): void {
			throw new Error("Change.doBackwards(): Override me.");
		}
	}
	
	export class ChangeHistory extends Model {
		private _changes: Change[];
		private _recentChange: Change;
		private _index: number;
		
		constructor() {
			super();
			this._changes = [];
			this._index = 0;
			this._recentChange = null;
			this.changed();
		}
		
		public canUndo(): boolean {
			return this._index > 0;
		}
		
		public canRedo(): boolean {
			return this._index < this._changes.length;
		}
		
		public record(change: Change): void {
			if (change.isNoop()) return;
			this._changes[this._index] = change;
			this._index++;
			this._changes.length = this._index;
			this._recentChange = change;
			this.changed();
		}
		
		public undo(): void {
			if (this._index <= 0) return;
			this._index--;
			const change: Change = this._changes[this._index];
			change.undo();
			this._recentChange = null;
			this.changed();
		}
		
		public redo(): void {
			if (this._index >= this._changes.length) return;
			const change: Change = this._changes[this._index];
			change.redo();
			this._index++;
			this.changed();
		}
		
		public getRecentChange(): Change {
			return this._recentChange;
		}
	}
	
	export class SongDocument extends Model {
		private static _latestVersion: number = 2;
		
		public synth: Synth;
		public history: ChangeHistory;
		public channel: number;
		public bar: number;
		public showFifth: boolean;
		public showLetters: boolean;
		public showChannels: boolean;
		public showScrollBar: boolean;
		public volume: number;
		public song: Song;
		public barScrollPos: number;
		
		constructor() {
			super();
			this.channel = 0;
			this.bar = 0;
			this.barScrollPos = 0;
			this.volume = 75;
			this.history = new ChangeHistory();
			this.song = new Song();
			this.synth = new Synth(this.song);
			
			this.showFifth = this._getCookie("showFifth") == "true";
			this.showLetters = this._getCookie("showLetters") == "true";
			this.showChannels = this._getCookie("showChannels") == "true";
			this.showScrollBar = this._getCookie("showScrollBar") == "true";
			if (this._getCookie("volume") != "") this.volume = Number(this._getCookie("volume"));
			
			this.synth.volume = this._calcVolume();
		}
		
		public savePreferences(): void {
			this._setCookie("showFifth", this.showFifth ? "true" : "false");
			this._setCookie("showLetters", this.showLetters ? "true" : "false");
			this._setCookie("showChannels", this.showChannels ? "true" : "false");
			this._setCookie("showScrollBar", this.showScrollBar ? "true" : "false");
			this._setCookie("volume", String(this.volume));
		}
		
		private _calcVolume(): number {
			return Math.min(1.0, Math.pow(this.volume / 50.0, 0.5)) * Math.pow(2.0, (this.volume - 75.0) / 25.0);
		}
		
		public setVolume(val: number): void {
			this.volume = val;
			this.savePreferences();
			this.synth.volume = this._calcVolume();
		}
		
		public getCurrentPattern(): BarPattern {
			return this.song.getPattern(this.channel, this.bar);
		}
		
		public getCurrentInstrument(): number {
			const pattern: BarPattern = this.getCurrentPattern();
			return pattern == null ? 0 : pattern.instrument;
		}
		
		private _setCookie(name: string, value: string): void {
			localStorage.setItem(name, value);
		}
		
		private _getCookie(cname: string): string {
			const item: string = localStorage.getItem(cname);
			if (item != null) {
				return item;
			}
			
			// Legacy: check for cookie:
			const name: string = cname + "=";
			const ca: string[] = document.cookie.split(';');
			for (let i = 0; i < ca.length; i++) {
				let c: string = ca[i];
				while (c.charAt(0)==' ') c = c.substring(1);
				if (c.indexOf(name) == 0) {
					// Found cookie, convert it to localStorage and delete original.
					const value: string = c.substring(name.length, c.length);
					
					this._setCookie(cname, value);
					
					// Delete old cookie by providing old expiration:
					document.cookie = cname + '=; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
					
					return value;
				}
			}
			return "";
		}
	}
	
	export class ChangeSequence extends Change {
		private _changes: Change[];
		constructor(changes: Change[] = null) {
			super(false);
			if (changes == null) {
				this._changes = [];
			} else {
				this._changes = changes.concat();
			}
		}
		
		public append(change: Change): void {
			if (change.isNoop()) return;
			this._changes[this._changes.length] = change;
			this._didSomething();
		}
		
		/*
		// WARNING: prepend is almost always a bad idea. Know what you're doing.
		protected _prepend(change: Change): void {
			if (change.didNothing) return;
			this._changes.splice(0,0,change);
			this._didSomething();
		}
		*/
		
		protected _doForwards(): void {
			for (let i: number = 0; i < this._changes.length; i++) {
				this._changes[i].redo();
			}
		}
		
		protected _doBackwards(): void {
			for (let i: number = this._changes.length-1; i >= 0 ; i--) {
				this._changes[i].undo();
			}
		}
	}
	
	export class ChangePins extends Change {
		protected _oldStart: number;
		protected _newStart: number;
		protected _oldEnd: number;
		protected _newEnd: number;
		protected _oldPins: TonePin[];
		protected _newPins: TonePin[];
		protected _oldNotes: number[];
		protected _newNotes: number[];
		constructor(protected _document: SongDocument, protected _tone: Tone) {
			super(false);
			this._oldStart = this._tone.start;
			this._oldEnd   = this._tone.end;
			this._newStart = this._tone.start;
			this._newEnd   = this._tone.end;
			this._oldPins = this._tone.pins;
			this._newPins = [];
			this._oldNotes = this._tone.notes;
			this._newNotes = [];
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
			for (let i: number = 0; i < this._oldNotes.length; i++) {
				this._newNotes[i] = this._oldNotes[i] + firstInterval;
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
			this._tone.pins = this._newPins;
			this._tone.notes = this._newNotes;
			this._tone.start = this._newStart;
			this._tone.end = this._newEnd;
			this._document.changed();
		}
		
		protected _doBackwards(): void {
			this._tone.pins = this._oldPins;
			this._tone.notes = this._oldNotes;
			this._tone.start = this._oldStart;
			this._tone.end = this._oldEnd;
			this._document.changed();
		}
	}
	
	export class ChangeAttack extends Change {
		private _document: SongDocument;
		private _oldAttack: number;
		private _newAttack: number;
		constructor(document: SongDocument, attack: number) {
			super(false);
			this._document = document;
			this._oldAttack = document.song.instrumentAttacks[document.channel][document.getCurrentInstrument()];
			this._newAttack = attack;
			if (this._oldAttack != this._newAttack) {
				this._didSomething();
				this.redo();
			}
		}
		
		protected _doForwards(): void {
			this._document.song.instrumentAttacks[this._document.channel][this._document.getCurrentInstrument()] = this._newAttack;
			this._document.changed();
		}
		
		protected _doBackwards(): void {
			this._document.song.instrumentAttacks[this._document.channel][this._document.getCurrentInstrument()] = this._oldAttack;
			this._document.changed();
		}
	}
	
	export class ChangeBarPattern extends Change {
		private _document: SongDocument;
		private _oldPattern: number;
		private _newPattern: number;
		constructor(document: SongDocument, pattern: number) {
			super(false);
			this._document = document;
			this._oldPattern = document.song.channelBars[document.channel][document.bar];
			this._newPattern = pattern;
			if (this._oldPattern != this._newPattern && pattern <= document.song.channelPatterns[document.channel].length) {
				this._didSomething();
				this.redo();
			}
		}
		
		protected _doForwards(): void {
			this._document.song.channelBars[this._document.channel][this._document.bar] = this._newPattern;
			this._document.changed();
		}
		
		protected _doBackwards(): void {
			this._document.song.channelBars[this._document.channel][this._document.bar] = this._oldPattern;
			this._document.changed();
		}
	}
	
	export class ChangeBars extends Change {
		private _document: SongDocument;
		private _oldBars: number;
		private _newBars: number;
		private _oldChannelBars: number[][];
		private _newChannelBars: number[][];
		private _oldBar: number;
		private _newBar: number;
		private _oldBarScrollPos: number;
		private _newBarScrollPos: number;
		private _oldLoopStart: number;
		private _newLoopStart: number;
		private _oldLoopLength: number;
		private _newLoopLength: number;
		private _sequence: ChangeSequence;
		constructor(document: SongDocument, bars: number) {
			super(false);
			this._document = document;
			this._oldBars = document.song.bars;
			this._newBars = bars;
			if (this._oldBars != this._newBars) {
				this._oldChannelBars = document.song.channelBars;
				this._newChannelBars = [];
				for (let i: number = 0; i < Music.numChannels; i++) {
					const channel: number[] = [];
					for (let j: number = 0; j < this._newBars; j++) {
						channel.push(j < this._oldBars ? this._oldChannelBars[i][j] : 1);
					}
					this._newChannelBars.push(channel);
				}
				
				this._oldBar = document.bar;
				this._oldBarScrollPos = document.barScrollPos;
				this._oldLoopStart = document.song.loopStart;
				this._oldLoopLength = document.song.loopLength;
				this._newBar = document.bar;
				this._newBarScrollPos = document.barScrollPos;
				this._newLoopStart = document.song.loopStart;
				this._newLoopLength = document.song.loopLength;
				if (this._oldBars > this._newBars) {
					this._newBar = Math.min(this._newBar, this._newBars-1);
					this._newBarScrollPos = Math.max(0, Math.min(this._newBars - 16, this._newBarScrollPos));
					this._newLoopLength = Math.min(this._newBars, this._newLoopLength);
					this._newLoopStart = Math.min(this._newBars - this._newLoopLength, this._newLoopStart);
				}
				this._doForwards();
				this._didSomething();
			}
		}
		
		protected _doForwards(): void {
			this._document.bar = this._newBar;
			this._document.barScrollPos = this._newBarScrollPos;
			this._document.song.loopStart = this._newLoopStart;
			this._document.song.loopLength = this._newLoopLength;
			this._document.song.bars = this._newBars;
			this._document.song.channelBars = this._newChannelBars;
			this._document.changed();
		}
		
		protected _doBackwards(): void {
			this._document.bar = this._oldBar;
			this._document.barScrollPos = this._oldBarScrollPos;
			this._document.song.loopStart = this._oldLoopStart;
			this._document.song.loopLength = this._oldLoopLength;
			this._document.song.bars = this._oldBars;
			this._document.song.channelBars = this._oldChannelBars;
			this._document.changed();
		}
	}
	
	export class ChangeBeats extends Change {
		private _document: SongDocument;
		private _oldBeats: number;
		private _newBeats: number;
		private _sequence: ChangeSequence;
		constructor(document: SongDocument, beats: number) {
			super(false);
			this._document = document;
			this._oldBeats = document.song.beats;
			this._newBeats = beats;
			if (this._oldBeats != this._newBeats) {
				if (this._oldBeats > this._newBeats) {
					this._sequence = new ChangeSequence();
					for (let i: number = 0; i < Music.numChannels; i++) {
						for (let j: number = 0; j < document.song.channelPatterns[i].length; j++) {
							this._sequence.append(new ChangeToneTruncate(document, document.song.channelPatterns[i][j], this._newBeats * document.song.parts, this._oldBeats * document.song.parts));
						}
					}
				}
				this._document.song.beats = this._newBeats;
				this._document.changed();
				this._didSomething();
			}
		}
		
		protected _doForwards(): void {
			if (this._sequence != null) this._sequence.redo();
			this._document.song.beats = this._newBeats;
			this._document.changed();
		}
		
		protected _doBackwards(): void {
			this._document.song.beats = this._oldBeats;
			if (this._sequence != null) this._sequence.undo();
			this._document.changed();
		}
	}
	
	export class ChangeChannelBar extends Change {
		private _document: SongDocument;
		private _oldChannel: number;
		private _newChannel: number;
		private _oldBar: number;
		private _newBar: number;
		constructor(document: SongDocument, channel: number, bar: number) {
			super(false);
			this._document = document;
			this._oldChannel = document.channel;
			this._newChannel = channel;
			this._oldBar = document.bar;
			this._newBar = bar;
			this._doForwards();
			if (this._oldChannel != this._newChannel || this._oldBar != this._newBar) {
				this._didSomething();
			}
		}
		
		protected _doForwards(): void {
			this._document.channel = this._newChannel;
			this._document.bar = this._newBar;
			this._document.barScrollPos = Math.min(this._document.bar, Math.max(this._document.bar - 15, this._document.barScrollPos));
			this._document.changed();
		}
		
		protected _doBackwards(): void {
			this._document.channel = this._oldChannel;
			this._document.bar = this._oldBar;
			this._document.barScrollPos = Math.min(this._document.bar, Math.max(this._document.bar - 15, this._document.barScrollPos));
			this._document.changed();
		}
	}
	
	export class ChangeChorus extends Change {
		private _document: SongDocument;
		private _oldChorus: number;
		private _newChorus: number;
		constructor(document: SongDocument, chorus: number) {
			super(false);
			this._document = document;
			this._oldChorus = document.song.instrumentChorus[document.channel][document.getCurrentInstrument()];
			this._newChorus = chorus;
			if (this._oldChorus != this._newChorus) {
				this._didSomething();
				this.redo();
			}
		}
		
		protected _doForwards(): void {
			this._document.song.instrumentChorus[this._document.channel][this._document.getCurrentInstrument()] = this._newChorus;
			this._document.changed();
		}
		
		protected _doBackwards(): void {
			this._document.song.instrumentChorus[this._document.channel][this._document.getCurrentInstrument()] = this._oldChorus;
			this._document.changed();
		}
	}
	
	export class ChangeEffect extends Change {
		private _document: SongDocument;
		private _oldEffect: number;
		private _newEffect: number;
		constructor(document: SongDocument, effect: number) {
			super(false);
			this._document = document;
			this._oldEffect = document.song.instrumentEffects[document.channel][document.getCurrentInstrument()];
			this._newEffect = effect;
			if (this._oldEffect != this._newEffect) {
				this._didSomething();
				this.redo();
			}
		}
		
		protected _doForwards(): void {
			this._document.song.instrumentEffects[this._document.channel][this._document.getCurrentInstrument()] = this._newEffect;
			this._document.changed();
		}
		
		protected _doBackwards(): void {
			this._document.song.instrumentEffects[this._document.channel][this._document.getCurrentInstrument()] = this._oldEffect;
			this._document.changed();
		}
	}
	
	export class ChangeFilter extends Change {
		private _document: SongDocument;
		private _oldFilter: number;
		private _newFilter: number;
		constructor(document: SongDocument, filter: number) {
			super(false);
			this._document = document;
			this._oldFilter = document.song.instrumentFilters[document.channel][document.getCurrentInstrument()];
			this._newFilter = filter;
			if (this._oldFilter != this._newFilter) {
				this._didSomething();
				this.redo();
			}
		}
		
		protected _doForwards(): void {
			this._document.song.instrumentFilters[this._document.channel][this._document.getCurrentInstrument()] = this._newFilter;
			this._document.changed();
		}
		
		protected _doBackwards(): void {
			this._document.song.instrumentFilters[this._document.channel][this._document.getCurrentInstrument()] = this._oldFilter;
			this._document.changed();
		}
	}
	
	export class ChangeInstruments extends Change {
		private _document: SongDocument;
		private _oldInstruments: number;
		private _newInstruments: number;
		private _oldInstrumentWaves: number[][];
		private _oldInstrumentFilters: number[][];
		private _oldInstrumentAttacks: number[][];
		private _oldInstrumentEffects: number[][];
		private _oldInstrumentChorus: number[][];
		private _oldInstrumentVolumes: number[][];
		private _newInstrumentWaves: number[][];
		private _newInstrumentFilters: number[][];
		private _newInstrumentAttacks: number[][];
		private _newInstrumentEffects: number[][];
		private _newInstrumentChorus: number[][];
		private _newInstrumentVolumes: number[][];
		private _oldInstrumentIndices: number[][];
		private _newInstrumentIndices: number[][];
		constructor(document: SongDocument, instruments: number) {
			super(false);
			this._document = document;
			this._oldInstruments = document.song.instruments;
			this._newInstruments = instruments;
			if (this._oldInstruments != this._newInstruments) {
				// todo: adjust size of instrument arrays, make sure no references to invalid instruments
				this._oldInstrumentWaves   = document.song.instrumentWaves;
				this._oldInstrumentFilters = document.song.instrumentFilters;
				this._oldInstrumentAttacks = document.song.instrumentAttacks;
				this._oldInstrumentEffects = document.song.instrumentEffects;
				this._oldInstrumentChorus  = document.song.instrumentChorus;
				this._oldInstrumentVolumes = document.song.instrumentVolumes;
				this._newInstrumentWaves   = [];
				this._newInstrumentFilters = [];
				this._newInstrumentAttacks = [];
				this._newInstrumentEffects = [];
				this._newInstrumentChorus  = [];
				this._newInstrumentVolumes = [];
				const oldArrays: number[][][] = [this._oldInstrumentWaves, this._oldInstrumentFilters, this._oldInstrumentAttacks, this._oldInstrumentEffects, this._oldInstrumentChorus, this._oldInstrumentVolumes];
				const newArrays: number[][][] = [this._newInstrumentWaves, this._newInstrumentFilters, this._newInstrumentAttacks, this._newInstrumentEffects, this._newInstrumentChorus, this._newInstrumentVolumes];
				for (let k: number = 0; k < newArrays.length; k++) {
					const oldArray: number[][] = oldArrays[k];
					const newArray: number[][] = newArrays[k];
					for (let i: number = 0; i < Music.numChannels; i++) {
						const channel: number[] = [];
						for (let j: number = 0; j < this._newInstruments; j++) {
							if (j < this._oldInstruments) {
								channel.push(oldArray[i][j]);
							} else {
								if (k == 0) { // square wave or white noise
									channel.push(1);
								} else if (k == 2) { // sudden attack
									channel.push(1);
								} else {
									channel.push(0);
								}
							}
						}
						newArray.push(channel);
					}
				}
				
				this._oldInstrumentIndices = [];
				this._newInstrumentIndices = [];
				for (let i: number = 0; i < Music.numChannels; i++) {
					const oldIndices: number[] = [];
					const newIndices: number[] = [];
					for (let j: number = 0; j < document.song.patterns; j++) {
						const oldIndex: number = document.song.channelPatterns[i][j].instrument;
						oldIndices.push(oldIndex);
						newIndices.push(oldIndex < this._newInstruments ? oldIndex : 0);
					}
					this._oldInstrumentIndices.push(oldIndices);
					this._newInstrumentIndices.push(newIndices);
				}
				this._doForwards();
				this._didSomething();
			}
		}
		
		protected _doForwards(): void {
			this._document.song.instruments = this._newInstruments;
			this._document.song.instrumentWaves   = this._newInstrumentWaves;
			this._document.song.instrumentFilters = this._newInstrumentFilters;
			this._document.song.instrumentAttacks = this._newInstrumentAttacks;
			this._document.song.instrumentEffects = this._newInstrumentEffects;
			this._document.song.instrumentChorus  = this._newInstrumentChorus;
			this._document.song.instrumentVolumes = this._newInstrumentVolumes;
			this._copyIndices(this._newInstrumentIndices);
			this._document.changed();
		}
		
		protected _doBackwards(): void {
			this._document.song.instruments = this._oldInstruments;
			this._document.song.instrumentWaves   = this._oldInstrumentWaves;
			this._document.song.instrumentFilters = this._oldInstrumentFilters;
			this._document.song.instrumentAttacks = this._oldInstrumentAttacks;
			this._document.song.instrumentEffects = this._oldInstrumentEffects;
			this._document.song.instrumentChorus  = this._oldInstrumentChorus;
			this._document.song.instrumentVolumes = this._oldInstrumentVolumes;
			this._copyIndices(this._oldInstrumentIndices);
			this._document.changed();
		}
		
		private _copyIndices(indices: number[][]): void {
			for (let i: number = 0; i < Music.numChannels; i++) {
				for (let j: number = 0; j < this._document.song.patterns; j++) {
					this._document.song.channelPatterns[i][j].instrument = indices[i][j];
				}
			}
		}
	}
	
	export class ChangeKey extends Change {
		private _document: SongDocument;
		private _oldKey: number;
		private _newKey: number;
		constructor(document: SongDocument, key: number) {
			super(false);
			this._document = document;
			this._oldKey = document.song.key;
			this._newKey = key;
			if (this._oldKey != this._newKey) {
				this._didSomething();
				this.redo();
			}
		}
		
		protected _doForwards(): void {
			this._document.song.key = this._newKey;
			this._document.changed();
		}
		
		protected _doBackwards(): void {
			this._document.song.key = this._oldKey;
			this._document.changed();
		}
	}
	
	export class ChangeLoop extends Change {
		private _document: SongDocument;
		private _oldStart: number;
		private _newStart: number;
		private _oldLength: number;
		private _newLength: number;
		constructor(document: SongDocument, start: number, length: number) {
			super(false);
			this._document = document;
			this._oldStart = document.song.loopStart;
			this._newStart = start;
			this._oldLength = document.song.loopLength;
			this._newLength = length;
			if (this._oldStart != this._newStart || this._oldLength != this._newLength) {
				this._didSomething();
				this.redo();
			}
		}
		
		protected _doForwards(): void {
			this._document.song.loopStart = this._newStart;
			this._document.song.loopLength = this._newLength;
			this._document.changed();
		}
		
		protected _doBackwards(): void {
			this._document.song.loopStart = this._oldStart;
			this._document.song.loopLength = this._oldLength;
			this._document.changed();
		}
	}
	
	export class ChangeNoteAdded extends Change {
		private _document: SongDocument;
		private _pattern: BarPattern;
		private _tone: Tone;
		private _note: number;
		private _index: number;
		constructor(document: SongDocument, pattern: BarPattern, tone: Tone, note: number, index: number, deletion: boolean = false) {
			super(deletion);
			this._document = document;
			this._pattern = pattern;
			this._tone = tone;
			this._note = note;
			this._index = index;
			this._didSomething();
			this.redo();
		}
		
		protected _doForwards(): void {
			this._tone.notes.splice(this._index, 0, this._note);
			this._document.changed();
		}
		
		protected _doBackwards(): void {
			this._tone.notes.splice(this._index, 1);
			this._document.changed();
		}
	}
	
	export class ChangeOctave extends Change {
		private _document: SongDocument;
		private _oldOctave: number;
		private _newOctave: number;
		constructor(document: SongDocument, octave: number) {
			super(false);
			this._document = document;
			this._oldOctave = document.song.channelOctaves[document.channel];
			this._newOctave = octave;
			if (this._oldOctave != this._newOctave) {
				this._didSomething();
				this.redo();
			}
		}
		
		protected _doForwards(): void {
			this._document.song.channelOctaves[this._document.channel] = this._newOctave;
			this._document.changed();
		}
		
		protected _doBackwards(): void {
			this._document.song.channelOctaves[this._document.channel] = this._oldOctave;
			this._document.changed();
		}
	}
	
	export class ChangeParts extends Change {
		private _document: SongDocument;
		private _oldParts: number;
		private _newParts: number;
		private _sequence: ChangeSequence;
		constructor(document: SongDocument, parts: number) {
			super(false);
			this._document = document;
			this._oldParts = document.song.parts;
			this._newParts = parts;
			if (this._oldParts != this._newParts) {
				this._sequence = new ChangeSequence();
				for (let i: number = 0; i < Music.numChannels; i++) {
					for (let j: number = 0; j < document.song.channelPatterns[i].length; j++) {
						this._sequence.append(new ChangeRhythm(document, document.song.channelPatterns[i][j], this._oldParts, this._newParts));
					}
				}
				document.song.parts = this._newParts;
				document.changed();
				this._didSomething();
			}
		}
		
		protected _doForwards(): void {
			if (this._sequence != null) this._sequence.redo();
			this._document.song.parts = this._newParts;
			this._document.changed();
		}
		
		protected _doBackwards(): void {
			this._document.song.parts = this._oldParts;
			if (this._sequence != null) this._sequence.undo();
			this._document.changed();
		}
	}
	
	export class ChangePaste extends Change {
		private _document: SongDocument;
		public oldTones: Tone[];
		public newTones: Tone[];
		constructor(document: SongDocument, tones: Tone[]) {
			super(false);
			this._document = document;
			
			const pattern: BarPattern = document.getCurrentPattern();
			this.oldTones = pattern.tones;
			pattern.tones = tones;
			pattern.tones = pattern.cloneTones();
			this.newTones = pattern.tones;
			document.changed();
			this._didSomething();
		}
		
		protected _doForwards(): void {
			const pattern: BarPattern = this._document.getCurrentPattern();
			pattern.tones = this.newTones;
			this._document.changed();
		}
		
		protected _doBackwards(): void {
			const pattern: BarPattern = this._document.getCurrentPattern();
			pattern.tones = this.oldTones;
			this._document.changed();
		}
	}
	
	export class ChangePatternInstrument extends Change {
		private _document: SongDocument;
		private _oldInstrument: number;
		private _newInstrument: number;
		constructor(document: SongDocument, instrument: number) {
			super(false);
			this._document = document;
			this._oldInstrument = document.getCurrentPattern().instrument;
			this._newInstrument = instrument;
			
			if (this._oldInstrument != this._newInstrument) {
				this._doForwards();
				this._didSomething();
			}
		}
		
		protected _doForwards(): void {
			this._document.getCurrentPattern().instrument = this._newInstrument;
			this._document.changed();
		}
		
		protected _doBackwards(): void {
			this._document.getCurrentPattern().instrument = this._oldInstrument;
			this._document.changed();
		}
	}
	
	export class ChangePatterns extends Change {
		private _document: SongDocument;
		private _oldPatterns: number;
		private _newPatterns: number;
		private _oldChannelBars: number[][];
		private _newChannelBars: number[][];
		private _oldChannelPatterns: BarPattern[][];
		private _newChannelPatterns: BarPattern[][];
		private _sequence: ChangeSequence;
		constructor(document: SongDocument, patterns: number) {
			super(false);
			this._document = document;
			this._oldPatterns = document.song.patterns;
			this._newPatterns = patterns;
			if (this._oldPatterns != this._newPatterns) {
				this._oldChannelBars = document.song.channelBars;
				this._newChannelBars = [];
				this._oldChannelPatterns = document.song.channelPatterns;
				this._newChannelPatterns = [];
				
				for (let i: number = 0; i < Music.numChannels; i++) {
					const channelBars: number[] = [];
					for (let j: number = 0; j < document.song.channelBars[i].length; j++) {
						let bar: number = document.song.channelBars[i][j];
						if (bar > this._newPatterns) bar = 1;
						channelBars.push(bar);
					}
					this._newChannelBars.push(channelBars);
					
					const channelPatterns: BarPattern[] = [];
					for (let j: number = 0; j < this._newPatterns; j++) {
						if (j < document.song.channelPatterns[i].length) {
							channelPatterns.push(document.song.channelPatterns[i][j]);
						} else {
							channelPatterns.push(new BarPattern());
						}
					}
					this._newChannelPatterns.push(channelPatterns);
				}
				
				this._doForwards();
				this._didSomething();
			}
		}
		
		protected _doForwards(): void {
			if (this._sequence != null) this._sequence.redo();
			this._document.song.patterns = this._newPatterns;
			this._document.song.channelBars = this._newChannelBars;
			this._document.song.channelPatterns = this._newChannelPatterns;
			this._document.changed();
		}
		
		protected _doBackwards(): void {
			this._document.song.patterns = this._oldPatterns;
			this._document.song.channelBars = this._oldChannelBars;
			this._document.song.channelPatterns = this._oldChannelPatterns;
			if (this._sequence != null) this._sequence.undo();
			this._document.changed();
		}
	}
	
	export class ChangePinTime extends ChangePins {
		constructor(document: SongDocument, tone: Tone, pinIndex: number, shiftedTime: number) {
			super(document, tone);
			
			shiftedTime -= this._oldStart;
			const originalTime: number = this._oldPins[pinIndex].time;
			const skipStart: number = Math.min(originalTime, shiftedTime);
			const skipEnd: number = Math.max(originalTime, shiftedTime);
			let setPin: boolean = false;
			for (let i: number = 0; i < this._oldPins.length; i++) {
				const oldPin: TonePin = tone.pins[i];
				const time: number = oldPin.time;
				if (time < skipStart) {
					this._newPins.push(new TonePin(oldPin.interval, time, oldPin.volume));
				} else if (time > skipEnd) {
					if (!setPin) {
						this._newPins.push(new TonePin(this._oldPins[pinIndex].interval, shiftedTime, this._oldPins[pinIndex].volume));
						setPin = true;
					}
					this._newPins.push(new TonePin(oldPin.interval, time, oldPin.volume));
				}
			}
			if (!setPin) {
				this._newPins.push(new TonePin(this._oldPins[pinIndex].interval, shiftedTime, this._oldPins[pinIndex].volume));
			}
			
			this._finishSetup();
		}
	}
	
	export class ChangePitchBend extends ChangePins {
		constructor(document: SongDocument, tone: Tone, bendStart: number, bendEnd: number, bendTo: number, noteIndex: number) {
			super(document, tone);
			
			bendStart -= this._oldStart;
			bendEnd   -= this._oldStart;
			bendTo    -= tone.notes[noteIndex];
			
			let setStart: boolean = false;
			let setEnd: boolean   = false;
			let prevInterval: number = 0;
			let prevVolume: number = 3;
			let persist: boolean = true;
			let i: number;
			let direction: number;
			let stop: number;
			let push: (item: TonePin)=>void;
			if (bendEnd > bendStart) {
				i = 0;
				direction = 1;
				stop = tone.pins.length;
				push = (item: TonePin)=>{ this._newPins.push(item); };
			} else {
				i = tone.pins.length - 1;
				direction = -1;
				stop = -1;
				push = (item: TonePin)=>{ this._newPins.unshift(item); };
			}
			for (; i != stop; i += direction) {
				const oldPin: TonePin = tone.pins[i];
				const time: number = oldPin.time;
				for (;;) {
					if (!setStart) {
						if (time * direction <= bendStart * direction) {
							prevInterval = oldPin.interval;
							prevVolume = oldPin.volume;
						}
						if (time * direction < bendStart * direction) {
							push(new TonePin(oldPin.interval, time, oldPin.volume));
							break;
						} else {
							push(new TonePin(prevInterval, bendStart, prevVolume));
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
							push(new TonePin(bendTo, bendEnd, prevVolume));
							setEnd = true;
						}
					} else {
						if (time * direction == bendEnd * direction) {
							break;
						} else {
							if (oldPin.interval != prevInterval) persist = false;
							push(new TonePin(persist ? bendTo : oldPin.interval, time, oldPin.volume));
							break;
						}
					}
				}
			}
			if (!setEnd) {
				push(new TonePin(bendTo, bendEnd, prevVolume));
			}
			
			this._finishSetup();
		}
	}
	
	export class ChangeRhythm extends ChangeSequence {
		constructor(document: SongDocument, bar: BarPattern, oldParts: number, newParts: number) {
			super();
			let changeRhythm: (oldTime:number)=>number;
			if (oldParts == 4 && newParts == 3) changeRhythm = (oldTime: number)=>{
				return Math.ceil(oldTime * 3.0 / 4.0);
			}
			if (oldParts == 3 && newParts == 4) changeRhythm = (oldTime: number)=>{
				return Math.floor(oldTime * 4.0 / 3.0);
			}
			let i: number = 0;
			while (i < bar.tones.length) {
				const tone: Tone = bar.tones[i];
				if (changeRhythm(tone.start) >= changeRhythm(tone.end)) {
					this.append(new ChangeToneAdded(document, bar, tone, i, true));
				} else {
					this.append(new ChangeRhythmTone(document, tone, changeRhythm));
					i++;
				}
			}
		}
	}
	
	export class ChangeRhythmTone extends ChangePins {
		constructor(document: SongDocument, tone: Tone, changeRhythm: (oldTime:number)=>number) {
			super(document, tone);
			
			for (const oldPin of this._oldPins) {
				this._newPins.push(new TonePin(oldPin.interval, changeRhythm(oldPin.time + this._oldStart) - this._oldStart, oldPin.volume));
			}
			
			this._finishSetup();
		}
	}
	
	export class ChangeScale extends Change {
		private _document: SongDocument;
		private _oldScale: number;
		private _newScale: number;
		constructor(document: SongDocument, scale: number) {
			super(false);
			this._document = document;
			this._oldScale = document.song.scale;
			this._newScale = scale;
			if (this._oldScale != this._newScale) {
				this._didSomething();
				this.redo();
			}
		}
		
		protected _doForwards(): void {
			this._document.song.scale = this._newScale;
			this._document.changed();
		}
		
		protected _doBackwards(): void {
			this._document.song.scale = this._oldScale;
			this._document.changed();
		}
	}
	
	export class ChangeSong extends Change {
		private _document: SongDocument;
		private _oldSong: string;
		private _newSong: string;
		private _oldPatterns: BarPattern[][];
		private _newPatterns: BarPattern[][];
		private _oldBar: number;
		private _newBar: number;
		constructor(document: SongDocument, song: string) {
			super(false);
			this._document = document;
			this._oldSong = document.song.toString();
			this._oldPatterns = document.song.channelPatterns;
			this._oldBar = document.bar;
			if (song != null) {
				this._newSong = song;
				document.song.fromString(this._newSong, false);
			} else {
				document.song.initToDefault(false);
				this._newSong = document.song.toString();
			}
			this._newPatterns = document.song.channelPatterns;
			this._newBar = Math.max(0, Math.min(document.song.bars - 1, this._oldBar));
			document.bar = this._newBar;
			document.barScrollPos = Math.max(0, Math.min(document.song.bars - 16, document.barScrollPos));
			document.barScrollPos = Math.min(document.bar, Math.max(document.bar - 15, document.barScrollPos));
			document.changed();
			this._didSomething();
		}
		
		protected _doForwards(): void {
			this._document.song.fromString(this._newSong, true);
			this._document.song.channelPatterns = this._newPatterns;
			this._document.bar = this._newBar;
			this._document.barScrollPos = Math.max(0, Math.min(this._document.song.bars - 16, this._document.barScrollPos));
			this._document.barScrollPos = Math.min(this._document.bar, Math.max(this._document.bar - 15, this._document.barScrollPos));
			this._document.changed();
		}
		
		protected _doBackwards(): void {
			this._document.song.fromString(this._oldSong, true);
			this._document.song.channelPatterns = this._oldPatterns;
			this._document.bar = this._oldBar;
			this._document.barScrollPos = Math.max(0, Math.min(this._document.song.bars - 16, this._document.barScrollPos));
			this._document.barScrollPos = Math.min(this._document.bar, Math.max(this._document.bar - 15, this._document.barScrollPos));
			this._document.changed();
		}
	}
	
	export class ChangeTempo extends Change {
		private _document: SongDocument;
		private _oldTempo: number;
		private _newTempo: number;
		constructor(document: SongDocument, tempo: number) {
			super(false);
			this._document = document;
			this._oldTempo = document.song.tempo;
			this._newTempo = tempo;
			if (this._oldTempo != this._newTempo) {
				this._didSomething();
				this.redo();
			}
		}
		
		protected _doForwards(): void {
			this._document.song.tempo = this._newTempo;
			this._document.changed();
		}
		
		protected _doBackwards(): void {
			this._document.song.tempo = this._oldTempo;
			this._document.changed();
		}
	}
	
	export class ChangeToneAdded extends Change {
		private _document: SongDocument;
		private _bar: BarPattern;
		private _tone: Tone;
		private _index: number;
		constructor(document: SongDocument, bar: BarPattern, tone: Tone, index: number, deletion: boolean = false) {
			super(deletion);
			this._document = document;
			this._bar = bar;
			this._tone = tone;
			this._index = index;
			this._didSomething();
			this.redo();
		}
		
		protected _doForwards(): void {
			this._bar.tones.splice(this._index, 0, this._tone);
			this._document.changed();
		}
		
		protected _doBackwards(): void {
			this._bar.tones.splice(this._index, 1);
			this._document.changed();
		}
	}
	
	export class ChangeToneLength extends ChangePins {
		constructor(document: SongDocument, tone: Tone, truncStart: number, truncEnd: number) {
			super(document, tone);
			
			truncStart -= this._oldStart;
			truncEnd   -= this._oldStart;
			let setStart: boolean = false;
			let prevVolume: number = this._oldPins[0].volume;
			let prevInterval: number = this._oldPins[0].interval;
			let pushLastPin: boolean = true;
			let i: number;
			for (i = 0; i < this._oldPins.length; i++) {
				const oldPin: TonePin = this._oldPins[i];
				if (oldPin.time < truncStart) {
					prevVolume = oldPin.volume;
					prevInterval = oldPin.interval;
				} else if (oldPin.time <= truncEnd) {
					if (oldPin.time > truncStart && !setStart) {
						this._newPins.push(new TonePin(prevInterval, truncStart, prevVolume));
					}
					this._newPins.push(new TonePin(oldPin.interval, oldPin.time, oldPin.volume));
					setStart = true;
					if (oldPin.time == truncEnd) {
						pushLastPin = false;
						break;
					}
				} else {
					break;
				} 
				
			}
			
			if (pushLastPin) this._newPins.push(new TonePin(this._oldPins[i].interval, truncEnd, this._oldPins[i].volume));
			
			this._finishSetup();
		}
	}
	
	export class ChangeToneTruncate extends ChangeSequence {
		constructor(document: SongDocument, bar: BarPattern, start: number, end: number, skipTone: Tone = null) {
			super();
			let i: number = 0;
			while (i < bar.tones.length) {
				const tone: Tone = bar.tones[i];
				if (tone == skipTone && skipTone != null) {
					i++;
				} else if (tone.end <= start) {
					i++;
				} else if (tone.start >= end) {
					break;
				} else if (tone.start < start) {
					this.append(new ChangeToneLength(document, tone, tone.start, start));
					i++;
				} else if (tone.end > end) {
					this.append(new ChangeToneLength(document, tone, end, tone.end));
					i++;
				} else {
					this.append(new ChangeToneAdded(document, bar, tone, i, true));
				}
			}
		}
	}
	
	export class ChangeTransposeTone extends Change {
		protected _document: SongDocument;
		protected _tone: Tone;
		protected _oldStart: number;
		protected _newStart: number;
		protected _oldEnd: number;
		protected _newEnd: number;
		protected _oldPins: TonePin[];
		protected _newPins: TonePin[];
		protected _oldNotes: number[];
		protected _newNotes: number[];
		constructor(doc: SongDocument, tone: Tone, upward: boolean) {
			super(false);
			this._document = doc;
			this._tone = tone;
			this._oldPins = tone.pins;
			this._newPins = [];
			this._oldNotes = tone.notes;
			this._newNotes = [];
			
			const maxPitch: number = (doc.channel == 3 ? Music.drumCount - 1 : Music.maxPitch);
			
			for (let i: number = 0; i < this._oldNotes.length; i++) {
				let note: number = this._oldNotes[i];
				if (upward) {
					for (let j: number = note + 1; j <= maxPitch; j++) {
						if (doc.channel == 3 || Music.scaleFlags[doc.song.scale][j%12] == true) {
							note = j;
							break;
						}
					}
				} else {
					for (let j: number = note - 1; j >= 0; j--) {
						if (doc.channel == 3 || Music.scaleFlags[doc.song.scale][j%12] == true) {
							note = j;
							break;
						}
					}
				}
				
				let foundMatch: boolean = false;
				for (let j: number = 0; j < this._newNotes.length; j++) {
					if (this._newNotes[j] == note) {
						foundMatch = true;
						break;
					}
				}
				if (!foundMatch) this._newNotes.push(note);
			}
			
			let min: number = 0;
			let max: number = maxPitch;
			
			for (let i: number = 1; i < this._newNotes.length; i++) {
				const diff: number = this._newNotes[0] - this._newNotes[i];
				if (min < diff) min = diff;
				if (max > diff + maxPitch) max = diff + maxPitch;
			}
			
			for (const oldPin of this._oldPins) {
				let interval: number = oldPin.interval + this._oldNotes[0];
				
				if (interval < min) interval = min;
				if (interval > max) interval = max;
				if (upward) {
					for (let i: number = interval + 1; i <= max; i++) {
						if (doc.channel == 3 || Music.scaleFlags[doc.song.scale][i%12] == true) {
							interval = i;
							break;
						}
					}
				} else {
					for (let i: number = interval - 1; i >= min; i--) {
						if (doc.channel == 3 || Music.scaleFlags[doc.song.scale][i%12] == true) {
							interval = i;
							break;
						}
					}
				}
				interval -= this._newNotes[0];
				this._newPins.push(new TonePin(interval, oldPin.time, oldPin.volume));
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
			this._tone.pins = this._newPins;
			this._tone.notes = this._newNotes;
			this._document.changed();
		}
		
		protected _doBackwards(): void {
			this._tone.pins = this._oldPins;
			this._tone.notes = this._oldNotes;
			this._document.changed();
		}
	}
	
	export class ChangeTranspose extends ChangeSequence {
		constructor(document: SongDocument, bar: BarPattern, upward: boolean) {
			super();
			for (let i: number = 0; i < bar.tones.length; i++) {
				this.append(new ChangeTransposeTone(document, bar.tones[i], upward));
			}
		}
	}
	
	export class ChangeVolume extends Change {
		private _document: SongDocument;
		private _oldVolume: number;
		private _newVolume: number;
		constructor(document: SongDocument, volume: number) {
			super(false);
			this._document = document;
			this._oldVolume = document.song.instrumentVolumes[document.channel][document.getCurrentInstrument()];
			this._newVolume = volume;
			if (this._oldVolume != this._newVolume) {
				this._didSomething();
				this.redo();
			}
		}
		
		protected _doForwards(): void {
			this._document.song.instrumentVolumes[this._document.channel][this._document.getCurrentInstrument()] = this._newVolume;
			this._document.changed();
		}
		
		protected _doBackwards(): void {
			this._document.song.instrumentVolumes[this._document.channel][this._document.getCurrentInstrument()] = this._oldVolume;
			this._document.changed();
		}
	}
	
	export class ChangeVolumeBend extends Change {
		private _document: SongDocument;
		private _bar: BarPattern;
		private _tone: Tone;
		private _oldPins: TonePin[];
		private _newPins: TonePin[];
		constructor(document: SongDocument, bar: BarPattern, tone: Tone, bendPart: number, bendVolume: number, bendInterval: number) {
			super(false);
			this._document = document;
			this._bar = bar;
			this._tone = tone;
			this._oldPins = tone.pins;
			this._newPins = [];
			
			let inserted: boolean = false;
			
			for (const pin of tone.pins) {
				if (pin.time < bendPart) {
					this._newPins.push(pin);
				} else if (pin.time == bendPart) {
					this._newPins.push(new TonePin(bendInterval, bendPart, bendVolume));
					inserted = true;
				} else {
					if (!inserted) {
						this._newPins.push(new TonePin(bendInterval, bendPart, bendVolume));
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
			this._tone.pins = this._newPins;
			this._document.changed();
		}
		
		protected _doBackwards(): void {
			this._tone.pins = this._oldPins;
			this._document.changed();
		}
	}
	
	export class ChangeWave extends Change {
		private _document: SongDocument;
		private _oldWave: number;
		private _newWave: number;
		constructor(document: SongDocument, wave: number) {
			super(false);
			this._document = document;
			this._oldWave = document.song.instrumentWaves[document.channel][document.getCurrentInstrument()];
			this._newWave = wave;
			if (this._oldWave != this._newWave) {
				this._didSomething();
				this.redo();
			}
		}
		
		protected _doForwards(): void {
			this._document.song.instrumentWaves[this._document.channel][this._document.getCurrentInstrument()] = this._newWave;
			this._document.changed();
		}
		
		protected _doBackwards(): void {
			this._document.song.instrumentWaves[this._document.channel][this._document.getCurrentInstrument()] = this._oldWave;
			this._document.changed();
		}
	}
	
	export class PatternCursor {
		public valid:        boolean = false;
		public prevTone:     Tone = null;
		public curTone:      Tone = null;
		public nextTone:     Tone = null;
		public note:         number = 0;
		public noteIndex:    number = -1;
		public curIndex:     number = 0;
		public start:        number = 0;
		public end:          number = 0;
		public part:         number = 0;
		public tonePart:     number = 0;
		public nearPinIndex: number = 0;
		public pins:         TonePin[] = null;
	}
}
