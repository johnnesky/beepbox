// Copyright (c) 2012-2022 John Nesky and contributing authors, distributed under the MIT license, see accompanying the LICENSE.md file.

import {Config} from "../synth/SynthConfig";
import {Note, Pattern} from "../synth/synth";
import {SongDocument} from "./SongDocument";
import {ChangeGroup} from "./Change";
import {ChangeChannelBar, ChangePinTime, ChangeEnsurePatternExists, ChangeNoteAdded, ChangeInsertBars, ChangeDeleteBars} from "./changes";

export class SongPerformance {
	private _channelIsDrum: boolean = false;
	private _channelOctave: number = -1;
	private _songKey: number = -1;
	private _pitchesAreTemporary: boolean = false;
	
	private _songLengthWhenRecordingStarted: number = -1;
	private _playheadPart: number = -1;
	private _playheadPattern: Pattern | null = null;
	private _pitchesChanged: boolean = false;
	private _lastNote: Note | null = null;
	private _recordingChange: ChangeGroup | null = null;
	
	constructor(private _doc: SongDocument) {
		this._doc.notifier.watch(this._documentChanged);
		this._documentChanged();
		window.requestAnimationFrame(this._onAnimationFrame);
	}
	
	public play(): void {
		this._doc.synth.play();
		this._doc.synth.maintainLiveInput();
	}
	
	public pause(): void {
		this.clearAllPitches();
		if (this._recordingChange != null) {
			if (this._doc.song.barCount > this._songLengthWhenRecordingStarted && !this._lastBarHasPatterns()) {
				// If an extra empty bar was added in case it was needed for recording, but it didn't end up getting used, delete it now.
				new ChangeDeleteBars(this._doc, this._doc.song.barCount - 1, 1);
				new ChangeChannelBar(this._doc, this._doc.channel, this._doc.song.barCount - 1);
			}
			if (!this._recordingChange.isNoop()) {
				this._doc.record(this._recordingChange);
				this._recordingChange = null;
			}
			this._lastNote = null;
		}
		this._doc.synth.pause();
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
		}
		if (this._pitchesAreTemporary) {
			this.clearAllPitches();
			this._pitchesAreTemporary = false;
		}
		this._doc.synth.startRecording();
		this._doc.synth.maintainLiveInput();
		this._songLengthWhenRecordingStarted = this._doc.song.barCount;
		this._playheadPart = this._getCurrentPlayheadPart();
		this._playheadPattern = null;
		this._pitchesChanged = true;
		this._lastNote = null;
		this._recordingChange = new ChangeGroup();
		this._doc.setProspectiveChange(this._recordingChange);
	}
	
	public abortRecording(): void {
		this._recordingChange = null;
		this.pause();
	}
	
	private _getCurrentPlayheadPart(): number {
		const currentPart: number = this._doc.synth.playhead * this._doc.song.beatsPerBar * Config.partsPerBeat;
		if (this._doc.prefs.snapRecordedNotesToRhythm) {
			const minDivision: number = Config.partsPerBeat / Config.rhythms[this._doc.song.rhythm].stepsPerBeat;
			return Math.round(currentPart / minDivision) * minDivision;
		}
		return Math.round(currentPart);
	}
	
	private _lastBarHasPatterns(): boolean {
		for (let channelIndex: number = 0; channelIndex < this._doc.song.getChannelCount(); channelIndex++) {
			if (this._doc.song.channels[channelIndex].bars[this._doc.song.barCount - 1] != 0) return true;
		}
		return false;
	}
	
	private _onAnimationFrame = (): void => {
		window.requestAnimationFrame(this._onAnimationFrame);
		if (this._doc.synth.recording) {
			const dirty = this._updateRecordedNotes();
			if (dirty) {
				// The full interface is usually only rerendered in response to user input events, not animation events, but in this case go ahead and rerender everything.
				this._doc.notifier.notifyWatchers();
			}
		}
	}
	
	// Returns true if the full interface needs to be rerendered.
	private _updateRecordedNotes(): boolean {
		if (this._recordingChange == null) return false;
		if (!this._doc.lastChangeWas(this._recordingChange)) {
			this.abortRecording();
			return false;
		}
		
		const partsPerBar: number = this._doc.song.beatsPerBar * Config.partsPerBeat;
		const oldPart: number = this._playheadPart % partsPerBar;
		const oldBar: number = Math.floor(this._playheadPart / partsPerBar);
		const oldPlayheadPart: number = this._playheadPart;
		this._playheadPart = this._getCurrentPlayheadPart();
		const newPart: number = this._playheadPart % partsPerBar;
		const newBar: number = Math.floor(this._playheadPart / partsPerBar);
		if (oldPart == newPart && oldBar == newBar) return false;
		if (this._playheadPart < oldPlayheadPart) {
			this._lastNote = null;
			this._playheadPattern = null;
			return false;
		}
		
		let dirty = false;
		for (let bar: number = oldBar; bar <= newBar; bar++) {
			if (bar != oldBar) this._playheadPattern = null;
			const startPart: number = (bar == oldBar) ? oldPart : 0;
			const endPart: number = (bar == newBar) ? newPart : partsPerBar;
			if (startPart == endPart) break;
			if (this._lastNote != null && !this._pitchesChanged && startPart > 0 && this._doc.synth.liveInputPitches.length > 0) {
				this._recordingChange.append(new ChangePinTime(this._doc, this._lastNote, 1, endPart, this._lastNote.continuesLastPattern));
				// Instead of updating the entire interface when extending the last note, just update the current pattern as a special case to avoid doing too much work every frame since performance is important while recording.
				this._doc.currentPatternIsDirty = true;
			} else {
				if (this._lastNote != null) {
					// End the last note.
					this._lastNote = null;
				}
				if (this._doc.synth.liveInputPitches.length > 0) {
					if (this._playheadPattern == null) {
						this._doc.selection.erasePatternInBar(this._recordingChange, this._doc.synth.liveInputChannel, bar);
						this._recordingChange.append(new ChangeEnsurePatternExists(this._doc, this._doc.synth.liveInputChannel, bar));
						this._playheadPattern = this._doc.song.getPattern(this._doc.synth.liveInputChannel, bar);
					}
					if (this._playheadPattern == null) throw new Error();
					this._lastNote = new Note(this._doc.synth.liveInputPitches[0], startPart, endPart, Config.noteSizeMax, this._doc.song.getChannelIsNoise(this._doc.synth.liveInputChannel));
					this._lastNote.continuesLastPattern = (startPart == 0 && !this._pitchesChanged);
					for (let i: number = 0; i < this._doc.synth.liveInputPitches.length; i++) {
						this._lastNote.pitches[i] = this._doc.synth.liveInputPitches[i];
					}
					this._recordingChange.append(new ChangeNoteAdded(this._doc, this._playheadPattern, this._lastNote, this._playheadPattern.notes.length));
					dirty = true;
				}
				this._pitchesChanged = false;
			}
			
			if (bar == this._doc.song.barCount - 1) {
				if (this._lastBarHasPatterns()) {
					new ChangeInsertBars(this._doc, this._doc.song.barCount, 1);
					this._doc.bar--; // To counteract it increasing in ChangeInsertBars.
					dirty = true;
				}
			}
		}
		return dirty;
	}
	
	public setTemporaryPitches(pitches: number[], duration: number): void {
		this._updateRecordedNotes();
		for (let i: number = 0; i < pitches.length; i++) {
			this._doc.synth.liveInputPitches[i] = pitches[i];
		}
		this._doc.synth.liveInputPitches.length = Math.min(pitches.length, Config.maxChordSize);
		this._doc.synth.liveInputDuration = duration;
		this._doc.synth.liveInputStarted = true;
		this._pitchesAreTemporary = true;
		this._pitchesChanged = true;
	}
	
	public addPerformedPitch(pitch: number): void {
		this._doc.synth.maintainLiveInput();
		this._updateRecordedNotes();
		if (this._pitchesAreTemporary) {
			this.clearAllPitches();
			this._pitchesAreTemporary = false;
		}
		if (this._doc.prefs.ignorePerformedNotesNotInScale && !Config.scales[this._doc.song.scale].flags[pitch % Config.pitchesPerOctave]) {
			return;
		}
		if (this._doc.synth.liveInputPitches.indexOf(pitch) == -1) {
			this._doc.synth.liveInputPitches.push(pitch);
			this._pitchesChanged = true;
			while (this._doc.synth.liveInputPitches.length > Config.maxChordSize) {
				this._doc.synth.liveInputPitches.shift();
			}
			this._doc.synth.liveInputDuration = Number.MAX_SAFE_INTEGER;
		}
	}
	
	public removePerformedPitch(pitch: number): void {
		this._updateRecordedNotes();
		for (let i: number = 0; i < this._doc.synth.liveInputPitches.length; i++) {
			if (this._doc.synth.liveInputPitches[i] == pitch) {
				this._doc.synth.liveInputPitches.splice(i, 1);
				this._pitchesChanged = true;
				i--;
			}
		}
	}
	
	public clearAllPitches(): void {
		this._updateRecordedNotes();
		this._doc.synth.liveInputPitches.length = 0;
		this._pitchesChanged = true;
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
