import {SongDocument} from "./SongDocument";

export class LiveInput {
	constructor(private _doc: SongDocument) {
		this._doc.notifier.watch(this._documentChanged);
		this._documentChanged();
	}
	private _playingPitches: {pitch: number, context: string}[] = [];
	public addNote(pitch: number, context: string) {
		this._playingPitches = [...this._playingPitches, {pitch, context}];
		this._updateSound();
	}
	public removeNote(pitch: number, context: string) {
		this._playingPitches = this._playingPitches
			.filter(p => p.pitch !== pitch || p.context !== context);
		this._updateSound();
	}
	public clear(context: string) {
		this._playingPitches = this._playingPitches.filter(p => p.context !== context);
		this._updateSound();
	}
	private _updateSound() {
		if(this._playingPitches.length == 0) {
			this._doc.synth.liveInputDuration = 0;
		} else {
			this._doc.synth.liveInputDuration = Number.MAX_SAFE_INTEGER;
			this._doc.synth.liveInputPitches = this._playingPitches.map(p => p.pitch);
			this._doc.synth.liveInputStarted = true;
		}
	}
	private _documentChanged = (): void => {
		this._doc.synth.liveInputChannel = this._doc.channel;
		this._doc.synth.liveInputInstruments = this._doc.recentPatternInstruments[this._doc.channel];
	}
}