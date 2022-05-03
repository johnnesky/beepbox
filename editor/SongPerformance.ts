// Copyright (c) 2012-2022 John Nesky and contributing authors, distributed under the MIT license, see accompanying the LICENSE.md file.

import {Config} from "../synth/SynthConfig";
import {SongDocument} from "./SongDocument";
import {ChangeChannelBar} from "./changes";

export class SongPerformance {
	private _channelIsDrum: boolean = false;
	private _channelOctave: number = -1;
	private _songKey: number = -1;
	private _pitchesAreTemporary: boolean = false;
	
	constructor(private _doc: SongDocument) {
		this._doc.notifier.watch(this._documentChanged);
	}
	
	public play(): void {
		this._doc.synth.play();
		this._doc.synth.maintainLiveInput();
	}
	
	public pause(): void {
		this._doc.synth.pause();
		this.clearAllPitches();
		this._doc.synth.resetEffects();
		if (this._doc.prefs.autoFollow) {
			this._doc.synth.goToBar(this._doc.bar);
		}
		this._doc.synth.snapToBar();
	}
	
	public record(): void {
		this._doc.synth.snapToBar();
		const playheadBar: number = Math.floor(this._doc.synth.playhead);
		if (playheadBar != this._doc.bar) {
			new ChangeChannelBar(this._doc, this._doc.channel, playheadBar);
			this._doc.notifier.notifyWatchers();
		}
		this._doc.synth.startRecording();
		this._doc.synth.maintainLiveInput();
	}
	
	public setTemporaryPitches(pitches: number[], duration: number): void {
		for (let i: number = 0; i < pitches.length; i++) {
			this._doc.synth.liveInputPitches[i] = pitches[i];
		}
		this._doc.synth.liveInputPitches.length = Math.min(pitches.length, Config.maxChordSize);
		this._doc.synth.liveInputDuration = duration;
		this._doc.synth.liveInputStarted = true;
		this._pitchesAreTemporary = true;
	}
	
	public addPerformedPitch(pitch: number): void {
		this._doc.synth.maintainLiveInput();
		if (this._pitchesAreTemporary) {
			this.clearAllPitches();
			this._pitchesAreTemporary = false;
		}
		if (this._doc.prefs.ignorePerformedNotesNotInScale && !Config.scales[this._doc.song.scale].flags[pitch % Config.pitchesPerOctave]) {
			return;
		}
		if (this._doc.synth.liveInputPitches.indexOf(pitch) == -1) {
			this._doc.synth.liveInputPitches.push(pitch);
			while (this._doc.synth.liveInputPitches.length > Config.maxChordSize) {
				this._doc.synth.liveInputPitches.shift();
			}
			this._doc.synth.liveInputDuration = Number.MAX_SAFE_INTEGER;
		}
	}
	
	public removePerformedPitch(pitch: number): void {
		for (let i: number = 0; i < this._doc.synth.liveInputPitches.length; i++) {
			if (this._doc.synth.liveInputPitches[i] == pitch) {
				this._doc.synth.liveInputPitches.splice(i, 1);
				i--;
			}
		}
	}
	
	public clearAllPitches(): void {
		this._doc.synth.liveInputPitches.length = 0;
	}
	
	private _documentChanged = (): void => {
		const isDrum: boolean = this._doc.song.getChannelIsNoise(this._doc.channel);
		const octave: number = this._doc.song.channels[this._doc.channel].octave;
		if (this._doc.synth.liveInputChannel != this._doc.channel || this._channelIsDrum != isDrum || this._channelOctave != octave || this._songKey != this._doc.song.key) {
			this._doc.synth.liveInputChannel = this._doc.channel;
			this._channelIsDrum = isDrum;
			this._channelOctave = octave;
			this._songKey = this._doc.song.key;
			this.clearAllPitches();
		}
		this._doc.synth.liveInputInstruments = this._doc.recentPatternInstruments[this._doc.channel];
	}
}
