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
/// <reference path="ChangeNotifier.ts" />

module beepbox {
	interface HistoryState {
		canUndo: boolean;
		sequenceNumber: number;
		bar: number;
		channel: number;
	}
	
	export class SongDocument {
		private static _latestVersion: number = 2;
		
		public song: Song;
		public synth: Synth;
		public history: SongDocument = this; // TODO: Delete this line.
		public notifier: ChangeNotifier = new ChangeNotifier();
		public channel: number = 0;
		public bar: number = 0;
		public showFifth: boolean;
		public showLetters: boolean;
		public showChannels: boolean;
		public showScrollBar: boolean;
		public volume: number = 75;
		public barScrollPos: number = 0;
		
		private _recentChange: Change | null = null;
		private _sequenceNumber: number = 0;
		private _barFromCurrentState: number = 0;
		private _channelFromCurrentState: number = 0;
		private _shouldPushState: boolean = false;
		private _waitingToUpdateState: boolean = false;
		
		constructor(string?: string) {
			this.song = new Song(string);
			this.synth = new Synth(this.song);
			
			this.showFifth = localStorage.getItem("showFifth") == "true";
			this.showLetters = localStorage.getItem("showLetters") == "true";
			this.showChannels = localStorage.getItem("showChannels") == "true";
			this.showScrollBar = localStorage.getItem("showScrollBar") == "true";
			if (localStorage.getItem("volume") != null) this.volume = Number(localStorage.getItem("volume"));
			
			this.synth.volume = this._calcVolume();
			
			let state: HistoryState | null = window.history.state;
			if (state == null) {
				// When the page is first loaded, indicate that undo is NOT possible.
				state = {canUndo: false, sequenceNumber: 0, bar: 0, channel: 0};
				window.history.replaceState(state, "", "#" + this.song.toBase64String());
			}
			window.addEventListener("hashchange", this._whenHashChanged);
			
			this.bar = state.bar;
			this.channel = state.channel;
			this._barFromCurrentState = state.bar;
			this._channelFromCurrentState = state.channel;
			this.barScrollPos = Math.max(0, this.bar - 15);
			
			// For all input events, catch them when they are about to finish bubbling,
			// presumably after all handlers are done updating the model and update the
			// view before the screen renders. mouseenter and mouseleave do not bubble,
			// but they are immediately followed by mousemove which does. 
			for (const eventName of ["input", "change", "click", "keyup", "keydown", "mousedown", "mousemove", "mouseup", "touchstart", "touchmove", "touchend", "touchcancel"]) {
				window.addEventListener(eventName, this._cleanDocument);
			}
		}
		
		private _whenHashChanged = (): void => {
			let state: HistoryState | null = window.history.state;
			if (state == null) {
				// The user changed the hash directly.
				this._sequenceNumber++;
				state = {canUndo: true, sequenceNumber: this._sequenceNumber, bar: this.bar, channel: this.channel};
				new ChangeSong(this, location.hash);
				window.history.replaceState(state, "", "#" + this.song.toBase64String());
			} else {
				if (state.sequenceNumber == this._sequenceNumber - 1) {
					// undo:
					this.bar = this._barFromCurrentState;
					this.channel = this._channelFromCurrentState;
				} else {
					// redo, or jump multiple steps in history:
					this.bar = state.bar;
					this.channel = state.channel;
				}
				this._sequenceNumber = state.sequenceNumber;
				new ChangeSong(this, location.hash);
			}
			
			this._barFromCurrentState = state.bar;
			this._channelFromCurrentState = state.channel;
			
			//this.barScrollPos = Math.min(this.bar, Math.max(this.bar - 15, this.barScrollPos));
			
			this.forgetLastChange();
			this.notifier.notifyWatchers();
		}
		
		private _cleanDocument = (): void => {
			this.notifier.notifyWatchers();
		}
		
		private _updateHistoryState = (): void => {
			this._waitingToUpdateState = false;
			const hash: string = "#" + this.song.toBase64String();
			let state: HistoryState;
			if (this._shouldPushState) {
				this._sequenceNumber++;
				state = {canUndo: true, sequenceNumber: this._sequenceNumber, bar: this.bar, channel: this.channel};
				window.history.pushState(state, "", hash);
			} else {
				state = {canUndo: true, sequenceNumber: this._sequenceNumber, bar: this.bar, channel: this.channel};
				window.history.replaceState(state, "", hash);
			}
			this._barFromCurrentState = state.bar;
			this._channelFromCurrentState = state.channel;
			this._shouldPushState = false;
		}
		
		public record(change: Change, continuingChange: boolean = false): void {
			if (change.isNoop()) {
				this._recentChange = null;
				if (continuingChange) {
					window.history.back();
				}
			} else {
				this._recentChange = change;
				this._shouldPushState = this._shouldPushState || !continuingChange;
				if (!this._waitingToUpdateState) {
					window.requestAnimationFrame(this._updateHistoryState);
					this._waitingToUpdateState = true;
				}
			}
		}
		
		public undo(): void {
			const state: HistoryState = window.history.state;
			if (state.canUndo) window.history.back();
		}
		
		public redo(): void {
			window.history.forward();
		}
		
		public setProspectiveChange(change: Change | null): void {
			this._recentChange = change;
		}
		
		public forgetLastChange(): void {
			this._recentChange = null;
		}
		
		public lastChangeWas(change: Change | null): boolean {
			return change != null && change == this._recentChange;
		}
		
		public savePreferences(): void {
			localStorage.setItem("showFifth", this.showFifth ? "true" : "false");
			localStorage.setItem("showLetters", this.showLetters ? "true" : "false");
			localStorage.setItem("showChannels", this.showChannels ? "true" : "false");
			localStorage.setItem("showScrollBar", this.showScrollBar ? "true" : "false");
			localStorage.setItem("volume", String(this.volume));
		}
		
		public setVolume(val: number): void {
			this.volume = val;
			this.savePreferences();
			this.synth.volume = this._calcVolume();
		}
		
		private _calcVolume(): number {
			return Math.min(1.0, Math.pow(this.volume / 50.0, 0.5)) * Math.pow(2.0, (this.volume - 75.0) / 25.0);
		}
		
		public getCurrentPattern(): BarPattern | null {
			return this.song.getPattern(this.channel, this.bar);
		}
		
		public getCurrentInstrument(): number {
			const pattern: BarPattern | null = this.getCurrentPattern();
			return pattern == null ? 0 : pattern.instrument;
		}
	}
}
