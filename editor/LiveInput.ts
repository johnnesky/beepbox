// Copyright (c) 2012-2022 John Nesky and contributing authors, distributed under the MIT license, see accompanying the LICENSE.md file.

import {SongDocument} from "./SongDocument";

export class LiveInput {
	private _pitchesAreTemporary: boolean = false;
	
	constructor(private _doc: SongDocument) {
		this._doc.notifier.watch(this._documentChanged);
		this._documentChanged();
	}
	
	public setTemporaryPitches(pitches: number[], duration: number): void {
		for (let i: number = 0; i < pitches.length; i++) {
			this._doc.synth.liveInputPitches[i] = pitches[i];
		}
		this._doc.synth.liveInputPitches.length = pitches.length;
		this._doc.synth.liveInputDuration = duration;
		this._doc.synth.liveInputStarted = true;
		this._pitchesAreTemporary = true;
	}
	
	public addPitch(pitch: number): void {
		if (this._pitchesAreTemporary) {
			this._doc.synth.liveInputPitches.length = 0;
			this._pitchesAreTemporary = false;
		}
		if (this._doc.synth.liveInputPitches.indexOf(pitch) == -1) {
			this._doc.synth.liveInputPitches.push(pitch);
			this._doc.synth.liveInputDuration = Number.MAX_SAFE_INTEGER;
			this._doc.synth.liveInputStarted = true;
		}
	}
	
	public removePitch(pitch: number): void {
		for (let i: number = 0; i < this._doc.synth.liveInputPitches.length; i++) {
			if (this._doc.synth.liveInputPitches[i] == pitch) {
				this._doc.synth.liveInputPitches.splice(i, 1);
				i--;
			}
		}
	}
	
	public clear(): void {
		this._doc.synth.liveInputPitches.length = 0;
	}
	
	private _documentChanged = (): void => {
		this._doc.synth.liveInputChannel = this._doc.channel;
		this._doc.synth.liveInputInstruments = this._doc.recentPatternInstruments[this._doc.channel];
	}
}
