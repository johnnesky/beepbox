// Copyright (C) 2020 John Nesky, distributed under the MIT license.

/// <reference path="../synth/synth.ts" />
/// <reference path="EditorConfig.ts" />
/// <reference path="ChangeNotifier.ts" />

namespace beepbox {
	interface HistoryState {
		canUndo: boolean;
		sequenceNumber: number;
		bar: number;
		channel: number;
		prompt: string | null;
	}

	type StateChangeType = "replace" | "push" | "jump";

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
		public alwaysFineNoteVol: boolean = false;
		public fullScreen: string;
		public enableChannelMuting: boolean;
		public colorTheme: string;
		public alwaysShowSettings: boolean = true;
		public volume: number = 75;
		public trackVisibleBars: number = 16;
		public barScrollPos: number = 0;
		public prompt: string | null = null;
		public windowOctaves: number = 3 + (+(window.localStorage.getItem("extraOctaves") || "0" ));
		public scrollableOctaves: number = Config.pitchOctaves - this.windowOctaves;
		public windowPitchCount: number = this.windowOctaves * Config.pitchesPerOctave + 1;

		private _recentChange: Change | null = null;
		private _sequenceNumber: number = 0;
		private _stateChangeType: StateChangeType = "replace";
		private _barFromCurrentState: number = 0;
		private _channelFromCurrentState: number = 0;
		public _waitingToUpdateState: boolean = false;

		constructor(string?: string) {
			this.song = new Song(string);
			if (string == "" || string == undefined) setDefaultInstruments(this.song);
			this.synth = new Synth(this.song);
			
			this.autoPlay = localStorage.getItem("autoPlay") == "true";
			this.autoFollow = localStorage.getItem("autoFollow") == "true";
			this.enableNotePreview = localStorage.getItem("enableNotePreview") != "false";
			this.showFifth = localStorage.getItem("showFifth") == "true";
			this.showLetters = localStorage.getItem("showLetters") == "true";
			this.showChannels = localStorage.getItem("showChannels") == "true";
			this.showScrollBar = localStorage.getItem("showScrollBar") == "true";
			this.alwaysFineNoteVol = localStorage.getItem("alwaysFineNoteVol") == "true";
			this.enableChannelMuting = localStorage.getItem("enableChannelMuting") == "true";
			this.fullScreen = localStorage.getItem("fullScreen") || "normal";
			this.colorTheme = localStorage.getItem("colorTheme") || "jummbox classic";
			
			ColorConfig.setTheme(this.colorTheme);
			Layout.setFullScreen(this.fullScreen);
			
			if (localStorage.getItem("volume") != null) this.volume = Math.min(<any>localStorage.getItem("volume") >>> 0, 75);
			
			this.synth.volume = this._calcVolume();

			let state: HistoryState | null = window.history.state;
			if (state == null) {
				// When the page is first loaded, indicate that undo is NOT possible.
				state = { canUndo: false, sequenceNumber: 0, bar: 0, channel: 0, prompt: null };
				window.history.replaceState(state, "", "#" + this.song.toBase64String());
			}
			window.addEventListener("hashchange", this._whenHistoryStateChanged);
			window.addEventListener("popstate", this._whenHistoryStateChanged);

			this.bar = state.bar;
			this.channel = state.channel;
			this._barFromCurrentState = state.bar;
			this._channelFromCurrentState = state.channel;
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

		private _whenHistoryStateChanged = (): void => {
			let state: HistoryState | null = window.history.state;

			// We're listening for both hashchanged and popstate, which often fire together.
			// Abort if we've already handled the current state. 
			if (state && state.sequenceNumber == this._sequenceNumber) return;

			if (state == null) {
				// The user changed the hash directly.
				this._sequenceNumber++;
				state = { canUndo: true, sequenceNumber: this._sequenceNumber, bar: this.bar, channel: this.channel, prompt: this.prompt };
				new ChangeSong(this, location.hash);
				window.history.replaceState(state, "", "#" + this.song.toBase64String());
			} else {
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
				new ChangeSong(this, location.hash);
			}

			this._barFromCurrentState = state.bar;
			this._channelFromCurrentState = state.channel;

			//this.barScrollPos = Math.min(this.bar, Math.max(this.bar - (this.trackVisibleBars - 1), this.barScrollPos));

			this.forgetLastChange();
			this.notifier.notifyWatchers();
		}

		private _cleanDocument = (): void => {
			this.notifier.notifyWatchers();
		}

		private _updateHistoryState = (): void => {
			this._waitingToUpdateState = false;
			const hash: string = "#" + this.song.toBase64String();
			if (this._stateChangeType == "push") {
				this._sequenceNumber++;
			} else if (this._stateChangeType == "jump") {
				this._sequenceNumber += 2;
			}
			let state: HistoryState = { canUndo: true, sequenceNumber: this._sequenceNumber, bar: this.bar, channel: this.channel, prompt: this.prompt };
			if (this._stateChangeType == "push" || this._stateChangeType == "jump") {
				window.history.pushState(state, "", hash);
			} else {
				window.history.replaceState(state, "", hash);
			}
			this._barFromCurrentState = state.bar;
			this._channelFromCurrentState = state.channel;
			this._stateChangeType = "replace";
		}

		public record(change: Change, stateChangeType: StateChangeType = "push"): void {
			if (change.isNoop()) {
				this._recentChange = null;
				if (stateChangeType == "replace") {
					window.history.back();
				}
			} else {
				change.commit();
				this._recentChange = change;
				if (stateChangeType == "push" && this._stateChangeType == "replace") {
					this._stateChangeType = stateChangeType;
				} else if (stateChangeType == "jump") {
					this._stateChangeType = stateChangeType;
				}
				if (!this._waitingToUpdateState) {
					window.requestAnimationFrame(this._updateHistoryState);
					this._waitingToUpdateState = true;
				}
			}
		}

		public openPrompt(prompt: string): void {
			this.prompt = prompt;
			const hash: string = "#" + this.song.toBase64String();
			this._sequenceNumber++;
			const state = { canUndo: true, sequenceNumber: this._sequenceNumber, bar: this.bar, channel: this.channel, prompt: this.prompt };
			window.history.pushState(state, "", hash);
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

		public goBackToStart(): void {
			this.channel = 0;
			this.bar = 0;
			this.barScrollPos = 0;
			this.notifier.changed();
			this.synth.snapToStart();
			this.notifier.changed();
		}

		public savePreferences(): void {
			localStorage.setItem("autoPlay", this.autoPlay ? "true" : "false");
			localStorage.setItem("autoFollow", this.autoFollow ? "true" : "false");
			localStorage.setItem("enableNotePreview", this.enableNotePreview ? "true" : "false");
			localStorage.setItem("showFifth", this.showFifth ? "true" : "false");
			localStorage.setItem("showLetters", this.showLetters ? "true" : "false");
			localStorage.setItem("showChannels", this.showChannels ? "true" : "false");
			localStorage.setItem("showScrollBar", this.showScrollBar ? "true" : "false");
			localStorage.setItem("alwaysFineNoteVol", this.alwaysFineNoteVol ? "true" : "false");
			localStorage.setItem("enableChannelMuting", this.enableChannelMuting ? "true" : "false");
			localStorage.setItem("fullScreen", this.fullScreen);
			localStorage.setItem("colorTheme", this.colorTheme);
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
		
		public getCurrentPattern(barOffset: number = 0): Pattern | null {
			return this.song.getPattern(this.channel, this.bar + barOffset);
		}
		
		public getCurrentInstrument(barOffset: number = 0): number {
			const pattern: Pattern | null = this.getCurrentPattern(barOffset);
			return pattern == null ? 0 : pattern.instrument;
		}
		
		public getMobileLayout(): boolean {
			return (this.fullScreen == "widefullscreen" ) ? window.innerWidth <= 1000 : window.innerWidth <= 700;
		}
		
		public getBarWidth(): number {
			return (!this.getMobileLayout() && this.enableChannelMuting && !this.getFullScreen()) ? 30 : 32;
		}
		
		public getChannelHeight(): number {
			const squashed: boolean = this.getMobileLayout() || this.song.getChannelCount() > 4 || (this.song.barCount > this.trackVisibleBars && this.song.getChannelCount() > 3);
			// TODO: Jummbox widescreen should allow more channels before squashing or megasquashing
			const megaSquashed: boolean = !this.getMobileLayout() && (((this.fullScreen != "widefullscreen") && this.song.getChannelCount() > 11) || this.song.getChannelCount() > 22 );
			return megaSquashed ? 23 : ( squashed ? 27 : 32 );
		}
		
		public getFullScreen(): boolean {
			return !this.getMobileLayout() && (this.fullScreen != "normal");
		}
	}
}
