// Copyright (C) 2020 John Nesky, distributed under the MIT license.

/// <reference path="../synth/synth.ts" />
/// <reference path="SongRecovery.ts" />
/// <reference path="EditorConfig.ts" />
/// <reference path="ChangeNotifier.ts" />

namespace beepbox {
	interface HistoryState {
		canUndo: boolean;
		sequenceNumber: number;
		bar: number;
		channel: number;
		recoveryUid: string;
		prompt: string | null;
	}
	
	export const enum StateChangeType {
		replace = 0,
		push,
		jump,
		length,
	}
	
	export class SongDocument {
		public song: Song;
		public synth: Synth;
		public notifier: ChangeNotifier = new ChangeNotifier();
		public channel: number = 0;
		public bar: number = 0;
		public autoPlay: boolean;
		public autoFollow: boolean;
		public enableNotePreview: boolean;
		public showFifth: boolean;
		public showLetters: boolean;
		public showChannels: boolean;
		public showScrollBar: boolean;
		public alwaysShowSettings: boolean;
		public enableChannelMuting: boolean;
		public colorTheme: string;
		public fullScreen: boolean;
		public displayBrowserUrl: boolean;
		public volume: number = 75;
		public trackVisibleBars: number = 16;
		public barScrollPos: number = 0;
		public prompt: string | null = null;
		
		private static readonly _maximumUndoHistory: number = 100;
		private _recovery: SongRecovery = new SongRecovery();
		private _recoveryUid: string;
		private _recentChange: Change | null = null;
		private _sequenceNumber: number = 0;
		private _stateChangeType: StateChangeType = StateChangeType.replace;
		private _recordedNewSong: boolean = false;
		private _barFromCurrentState: number = 0;
		private _channelFromCurrentState: number = 0;
		private _waitingToUpdateState: boolean = false;
		
		constructor() {
			this.autoPlay = window.localStorage.getItem("autoPlay") == "true";
			this.autoFollow = window.localStorage.getItem("autoFollow") == "true";
			this.enableNotePreview = window.localStorage.getItem("enableNotePreview") != "false";
			this.showFifth = window.localStorage.getItem("showFifth") == "true";
			this.showLetters = window.localStorage.getItem("showLetters") == "true";
			this.showChannels = window.localStorage.getItem("showChannels") == "true";
			this.showScrollBar = window.localStorage.getItem("showScrollBar") == "true";
			this.alwaysShowSettings = window.localStorage.getItem("alwaysShowSettings") == "true";
			this.enableChannelMuting = window.localStorage.getItem("enableChannelMuting") == "true";
			this.displayBrowserUrl = window.localStorage.getItem("displayBrowserUrl") != "false";
			this.fullScreen = window.localStorage.getItem("fullScreen") == "true";
			this.colorTheme = window.localStorage.getItem("colorTheme") || "dark classic";
			
			ColorConfig.setTheme(this.colorTheme);
			Layout.setFullScreen(this.fullScreen);
			
			if (window.localStorage.getItem("volume") != null) {
				this.volume = Math.min(<any>window.localStorage.getItem("volume") >>> 0, 75);
			}
			
			if (window.sessionStorage.getItem("currentUndoIndex") == null) {
				window.sessionStorage.setItem("currentUndoIndex", "0");
				window.sessionStorage.setItem("oldestUndoIndex", "0");
				window.sessionStorage.setItem("newestUndoIndex", "0");
			}
			
			let songString: string = window.location.hash;
			if (songString == "") {
				songString = this._getHash();
			}
			this.song = new Song(songString);
			if (songString == "" || songString == undefined) setDefaultInstruments(this.song);
			songString = this.song.toBase64String();
			this.synth = new Synth(this.song);
			this.synth.volume = this._calcVolume();
			
			let state: HistoryState | null = this._getHistoryState();
			if (state == null) {
				// When the page is first loaded, indicate that undo is NOT possible.
				state = {canUndo: false, sequenceNumber: 0, bar: 0, channel: 0, recoveryUid: generateUid(), prompt: null};
			}
			if (state.recoveryUid == undefined) state.recoveryUid = generateUid();
			this._replaceState(state, songString);
			window.addEventListener("hashchange", this._whenHistoryStateChanged);
			window.addEventListener("popstate", this._whenHistoryStateChanged);
			
			this.bar = state.bar;
			this.channel = state.channel;
			this._barFromCurrentState = state.bar;
			this._channelFromCurrentState = state.channel;
			this._recoveryUid = state.recoveryUid;
			this.barScrollPos = Math.max(0, this.bar - (this.trackVisibleBars - 6));
			this.prompt = state.prompt;
			
			// For all input events, catch them when they are about to finish bubbling,
			// presumably after all handlers are done updating the model, then update the
			// view before the screen renders. mouseenter and mouseleave do not bubble,
			// but they are immediately followed by mousemove which does. 
			for (const eventName of ["input", "change", "click", "keyup", "keydown", "mousedown", "mousemove", "mouseup", "touchstart", "touchmove", "touchend", "touchcancel"]) {
				window.addEventListener(eventName, this._cleanDocument);
			}
		}
		
		public toggleDisplayBrowserUrl() {
			const state: HistoryState = this._getHistoryState()!;
			this.displayBrowserUrl = !this.displayBrowserUrl;
			this._replaceState(state, this.song.toBase64String());
		}
		
		private _getHistoryState(): HistoryState | null {
			if (this.displayBrowserUrl) {
				return window.history.state;
			} else {
				const json: any = JSON.parse(window.sessionStorage.getItem(window.sessionStorage.getItem("currentUndoIndex")!)!);
				return json == null ? null : json.state;
			}
		}
		
		private _getHash(): string {
			if (this.displayBrowserUrl) {
				return window.location.hash;
			} else {
				const json: any = JSON.parse(window.sessionStorage.getItem(window.sessionStorage.getItem("currentUndoIndex")!)!);
				return json == null ? "" : json.hash;
			}
		}
		
		private _replaceState(state: HistoryState, hash: string): void {
			if (this.displayBrowserUrl) {
				window.history.replaceState(state, "", "#" + hash);
			} else {
				window.sessionStorage.setItem(window.sessionStorage.getItem("currentUndoIndex") || "0", JSON.stringify({state, hash}));
				window.history.replaceState(null, "", location.pathname);
			}
		}
		
		private _pushState(state: HistoryState, hash: string): void {
			if (this.displayBrowserUrl) {
				window.history.pushState(state, "", "#" + hash);
			} else {
				let currentIndex: number = Number(window.sessionStorage.getItem("currentUndoIndex"));
				let oldestIndex: number = Number(window.sessionStorage.getItem("oldestUndoIndex"));
				currentIndex = (currentIndex + 1) % SongDocument._maximumUndoHistory;
				window.sessionStorage.setItem("currentUndoIndex", String(currentIndex));
				window.sessionStorage.setItem("newestUndoIndex", String(currentIndex));
				if (currentIndex == oldestIndex) {
					oldestIndex = (oldestIndex + 1) % SongDocument._maximumUndoHistory;
					window.sessionStorage.setItem("oldestUndoIndex", String(oldestIndex));
				}
				window.sessionStorage.setItem(String(currentIndex), JSON.stringify({state, hash}));
				window.history.replaceState(null, "", location.pathname);
			}
		}
		
		private _forward(): void {
			if (this.displayBrowserUrl) {
				window.history.forward();
			} else {
				let currentIndex: number = Number(window.sessionStorage.getItem("currentUndoIndex"));
				let newestIndex: number = Number(window.sessionStorage.getItem("newestUndoIndex"));
				if (currentIndex != newestIndex) {
					currentIndex = (currentIndex + 1) % SongDocument._maximumUndoHistory;
					window.sessionStorage.setItem("currentUndoIndex", String(currentIndex));
					setTimeout(this._whenHistoryStateChanged);
				}
			}
		}
		
		private _back(): void {
			if (this.displayBrowserUrl) {
				window.history.back();
			} else {
				let currentIndex: number = Number(window.sessionStorage.getItem("currentUndoIndex"));
				let oldestIndex: number = Number(window.sessionStorage.getItem("oldestUndoIndex"));
				if (currentIndex != oldestIndex) {
					currentIndex = (currentIndex + SongDocument._maximumUndoHistory - 1) % SongDocument._maximumUndoHistory;
					window.sessionStorage.setItem("currentUndoIndex", String(currentIndex));
					setTimeout(this._whenHistoryStateChanged);
				}
			}
		}
		
		private _whenHistoryStateChanged = (): void => {
			if (window.history.state == null && window.location.hash != "") {
				// The user changed the hash directly.
				this._sequenceNumber++;
				this._resetSongRecoveryUid();
				const state: HistoryState = {canUndo: true, sequenceNumber: this._sequenceNumber, bar: this.bar, channel: this.channel, recoveryUid: this._recoveryUid, prompt: null};
				new ChangeSong(this, window.location.hash);
				this.prompt = state.prompt;
				if (this.displayBrowserUrl) {
					this._replaceState(state, this.song.toBase64String());
				} else {
					this._pushState(state, this.song.toBase64String());
				}
				this.forgetLastChange();
				this.notifier.notifyWatchers();
				return;
			}
			
			const state: HistoryState | null = this._getHistoryState();
			if (state == null) throw new Error("History state is null.");
			
			// Abort if we've already handled the current state. 
			if (state.sequenceNumber == this._sequenceNumber) return;
			
			if (state.sequenceNumber == this._sequenceNumber - 1) {
				// undo:
				this.bar = this._barFromCurrentState;
				this.channel = this._channelFromCurrentState;
			} else if (state.sequenceNumber != this._sequenceNumber) {
				// redo, or jump multiple steps in history:
				this.bar = state.bar;
				this.channel = state.channel;
			}
			this._sequenceNumber = state.sequenceNumber;
			this.prompt = state.prompt;
			new ChangeSong(this, this._getHash());
			
			this._barFromCurrentState = state.bar;
			this._channelFromCurrentState = state.channel;
			this._recoveryUid = state.recoveryUid;
			
			//this.barScrollPos = Math.min(this.bar, Math.max(this.bar - (this.trackVisibleBars - 1), this.barScrollPos));
			
			this.forgetLastChange();
			this.notifier.notifyWatchers();
		}
		
		private _cleanDocument = (): void => {
			this.notifier.notifyWatchers();
		}
		
		private _updateHistoryState = (): void => {
			this._waitingToUpdateState = false;
			const hash: string = this.song.toBase64String();
			if (this._stateChangeType == StateChangeType.push) {
				this._sequenceNumber++;
			} else if (this._stateChangeType >= StateChangeType.jump) {
				this._sequenceNumber += 2;
			}
			if (this._recordedNewSong) {
				this._resetSongRecoveryUid();
			} else {
				this._recovery.saveVersion(this._recoveryUid, hash);
			}
			let state: HistoryState = {canUndo: true, sequenceNumber: this._sequenceNumber, bar: this.bar, channel: this.channel, recoveryUid: this._recoveryUid, prompt: this.prompt};
			if (this._stateChangeType == StateChangeType.replace) {
				this._replaceState(state, hash);
			} else {
				this._pushState(state, hash);
			}
			this._barFromCurrentState = state.bar;
			this._channelFromCurrentState = state.channel;
			this._stateChangeType = StateChangeType.replace;
			this._recordedNewSong = false;
		}
		
		public record(change: Change, stateChangeType: StateChangeType = StateChangeType.push, newSong: boolean = false): void {
			if (change.isNoop()) {
				this._recentChange = null;
				if (stateChangeType == StateChangeType.replace) {
					this._back();
				}
			} else {
				change.commit();
				this._recentChange = change;
				if (this._stateChangeType < stateChangeType) this._stateChangeType = stateChangeType;
				this._recordedNewSong = this._recordedNewSong || newSong;
				if (!this._waitingToUpdateState) {
					// Defer updating the url/history until all sequenced changes have
					// committed and the interface has rendered the latest changes to
					// improve perceived responsiveness.
					window.requestAnimationFrame(this._updateHistoryState);
					this._waitingToUpdateState = true;
				}
			}
		}
		
		private _resetSongRecoveryUid(): void {
			this._recoveryUid = generateUid();
		}
		
		public openPrompt(prompt: string): void {
			this.prompt = prompt;
			const hash: string = this.song.toBase64String();
			this._sequenceNumber++;
			const state = {canUndo: true, sequenceNumber: this._sequenceNumber, bar: this.bar, channel: this.channel, recoveryUid: this._recoveryUid, prompt: this.prompt};
			this._pushState(state, hash);
		}
		
		public undo(): void {
			const state: HistoryState = this._getHistoryState()!;
			if (state.canUndo) this._back();
		}
		
		public redo(): void {
			this._forward();
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
		
		public goBackToStart(): void {
			this.channel = 0;
			this.bar = 0;
			this.barScrollPos = 0;
			this.notifier.changed();
			this.synth.snapToStart();
			this.notifier.changed();
		}
		
		public savePreferences(): void {
			window.localStorage.setItem("autoPlay", this.autoPlay ? "true" : "false");
			window.localStorage.setItem("autoFollow", this.autoFollow ? "true" : "false");
			window.localStorage.setItem("enableNotePreview", this.enableNotePreview ? "true" : "false");
			window.localStorage.setItem("showFifth", this.showFifth ? "true" : "false");
			window.localStorage.setItem("showLetters", this.showLetters ? "true" : "false");
			window.localStorage.setItem("showChannels", this.showChannels ? "true" : "false");
			window.localStorage.setItem("showScrollBar", this.showScrollBar ? "true" : "false");
			window.localStorage.setItem("alwaysShowSettings", this.alwaysShowSettings ? "true" : "false");
			window.localStorage.setItem("enableChannelMuting", this.enableChannelMuting ? "true" : "false");
			window.localStorage.setItem("displayBrowserUrl", this.displayBrowserUrl ? "true" : "false");
			window.localStorage.setItem("fullScreen", this.fullScreen ? "true" : "false");
			window.localStorage.setItem("colorTheme", this.colorTheme);
			window.localStorage.setItem("volume", String(this.volume));
		}
		
		public setVolume(val: number): void {
			this.volume = val;
			this.savePreferences();
			this.synth.volume = this._calcVolume();
		}
		
		private _calcVolume(): number {
			return Math.min(1.0, Math.pow(this.volume / 50.0, 0.5)) * Math.pow(2.0, (this.volume - 75.0) / 25.0);
		}
		
		public getCurrentPattern(barOffset: number = 0): Pattern | null {
			return this.song.getPattern(this.channel, this.bar + barOffset);
		}
		
		public getCurrentInstrument(barOffset: number = 0): number {
			const pattern: Pattern | null = this.getCurrentPattern(barOffset);
			return pattern == null ? 0 : pattern.instrument;
		}
		
		public getMobileLayout(): boolean {
			return window.innerWidth <= 700;
		}
		
		public getBarWidth(): number {
			return (!this.getMobileLayout() && this.enableChannelMuting && !this.getFullScreen()) ? 30 : 32;
		}
		
		public getChannelHeight(): number {
			const squashed: boolean = this.getMobileLayout() || this.song.getChannelCount() > 4 || (this.song.barCount > this.trackVisibleBars && this.song.getChannelCount() > 3);
			return squashed ? 27 : 32;
		}
		
		public getFullScreen(): boolean {
			return !this.getMobileLayout() && this.fullScreen;
		}
	}
}
