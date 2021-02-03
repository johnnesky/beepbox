// Copyright (C) 2020 John Nesky, distributed under the MIT license.

import { Dictionary, Config } from "../synth/SynthConfig";
import { Note, Pattern } from "../synth/synth";
import { SongDocument } from "./SongDocument";
import { ChangeGroup } from "./Change";
import { ChangeModChannel, ChangeModInstrument, ChangeModSetting, ChangeTrackSelection, ChangeChannelBar, ChangeDuplicateSelectedReusedPatterns, ChangeNoteAdded, ChangeNoteTruncate, ChangePatternNumbers, ChangePatternSelection, ChangeInsertBars, ChangeDeleteBars, ChangeEnsurePatternExists, ChangeNoteLength, ChangePaste, ChangePatternInstrument, ChangePatternsPerChannel, ChangePatternRhythm, ChangePatternScale, ChangeTranspose, comparePatternNotes, unionOfUsedNotes, generateScaleMap } from "./changes";

interface PatternCopy {
	instrument: number;
	notes: any[];
}

interface ChannelCopy {
	isNoise: boolean;
	isMod: boolean;
	patterns: Dictionary<PatternCopy>;
	bars: number[];
}

interface SelectionCopy {
	partDuration: number;
	channels: ChannelCopy[];
}

export class Selection {
	public boxSelectionX0: number = 0;
	public boxSelectionY0: number = 0;
	public boxSelectionX1: number = 0;
	public boxSelectionY1: number = 0;
	public digits: string = "";
	public instrumentDigits: string = "";
	public patternSelectionStart: number = 0;
	public patternSelectionEnd: number = 0;
	public patternSelectionActive: boolean = false;

	private _changeTranspose: ChangeGroup | null = null;
	private _changeTrack: ChangeGroup | null = null;

	constructor(private _doc: SongDocument) { }

	public toJSON(): { x0: number, x1: number, y0: number, y1: number, start: number, end: number } {
		return {
			"x0": this.boxSelectionX0,
			"x1": this.boxSelectionX1,
			"y0": this.boxSelectionY0,
			"y1": this.boxSelectionY1,
			"start": this.patternSelectionStart,
			"end": this.patternSelectionEnd,
		};
	}

	public fromJSON(json: { x0: number, x1: number, y0: number, y1: number, start: number, end: number }): void {
		if (json == null) return;
		this.boxSelectionX0 = +json["x0"];
		this.boxSelectionX1 = +json["x1"];
		this.boxSelectionY0 = +json["y0"];
		this.boxSelectionY1 = +json["y1"];
		this.patternSelectionStart = +json["start"];
		this.patternSelectionEnd = +json["end"];
		this.digits = "";
		this.instrumentDigits = "";
		this.patternSelectionActive = this.patternSelectionStart < this.patternSelectionEnd;
	}

	public selectionUpdated(): void {
		this._doc.notifier.changed();
		this.digits = "";
		this.instrumentDigits = "";
	}

	public get boxSelectionBar(): number {
		return Math.min(this.boxSelectionX0, this.boxSelectionX1);
	}
	public get boxSelectionChannel(): number {
		return Math.min(this.boxSelectionY0, this.boxSelectionY1);
	}
	public get boxSelectionWidth(): number {
		return Math.abs(this.boxSelectionX0 - this.boxSelectionX1) + 1;
	}
	public get boxSelectionHeight(): number {
		return Math.abs(this.boxSelectionY0 - this.boxSelectionY1) + 1;
	}
	public scrollToSelection(): void {
		this._doc.barScrollPos = Math.min(this._doc.barScrollPos, this.boxSelectionX1);
		this._doc.barScrollPos = Math.max(this._doc.barScrollPos, this.boxSelectionX1 - (this._doc.trackVisibleBars - 1));
	}

	public setChannelBar(channel: number, bar: number): void {
		const canReplaceLastChange: boolean = true;//this._doc.lastChangeWas(this._changeTrack);
		this._changeTrack = new ChangeGroup();
		this._changeTrack.append(new ChangeChannelBar(this._doc, channel, bar));
		this._doc.record(this._changeTrack, canReplaceLastChange);
		this.selectionUpdated();
	}

	public setPattern(pattern: number): void {
		this._doc.record(new ChangePatternNumbers(this._doc, pattern, this.boxSelectionBar, this.boxSelectionChannel, this.boxSelectionWidth, this.boxSelectionHeight));
	}

	public nextDigit(digit: string, forInstrument: boolean): void {
		if (forInstrument) {
			this.instrumentDigits += digit;
			var parsed = parseInt(this.instrumentDigits);
			var pattern: Pattern | null = this._doc.getCurrentPattern();
			if (parsed != 0 && parsed <= this._doc.song.instrumentsPerChannel && pattern != null) {
				this.setInstrument(parsed - 1);
				return;
			}
			this.instrumentDigits = digit;
			parsed = parseInt(this.instrumentDigits);
			if (parsed != 0 && parsed <= this._doc.song.instrumentsPerChannel && pattern != null) {
				this.setInstrument(parsed - 1);
				return;
			}
			this.instrumentDigits = "";
		}
		else {
			this.digits += digit;
			let parsed: number = parseInt(this.digits);
			if (parsed <= this._doc.song.patternsPerChannel) {

				this.setPattern(parsed);

				return;
			}

			this.digits = digit;
			parsed = parseInt(this.digits);
			if (parsed <= this._doc.song.patternsPerChannel) {

				this.setPattern(parsed);

				return;
			}

			this.digits = "";
		}
	}

	public setModChannel(mod: number, index: number): void {
		this._doc.record(new ChangeModChannel(this._doc, mod, index));
	}

	public setModInstrument(mod: number, instrument: number): void {
		this._doc.record(new ChangeModInstrument(this._doc, mod, instrument));
	}

	public setModSetting(mod: number, text: string): void {
		this._doc.record(new ChangeModSetting(this._doc, mod, text));
	}

	public insertBars(): void {
		this._doc.record(new ChangeInsertBars(this._doc, this.boxSelectionBar + this.boxSelectionWidth, this.boxSelectionWidth));
		const width: number = this.boxSelectionWidth;
		this.boxSelectionX0 += width;
		this.boxSelectionX1 += width;
		//this._songEditor._barScrollBar.animatePlayhead();
	}

	public deleteBars(): void {
		const group: ChangeGroup = new ChangeGroup();
		if (this._doc.selection.patternSelectionActive) {

			if (this.boxSelectionWidth > 1 || this.boxSelectionHeight > 1) {
				group.append(new ChangeDuplicateSelectedReusedPatterns(this._doc, this.boxSelectionBar, this.boxSelectionWidth, this.boxSelectionChannel, this.boxSelectionHeight));
			}

			for (const channel of this._eachSelectedChannel()) {
				for (const pattern of this._eachSelectedPattern(channel)) {
					group.append(new ChangeNoteTruncate(this._doc, pattern, this._doc.selection.patternSelectionStart, this._doc.selection.patternSelectionEnd));
				}
			}
			group.append(new ChangePatternSelection(this._doc, 0, 0));
		} else {
			group.append(new ChangeDeleteBars(this._doc, this.boxSelectionBar, this.boxSelectionWidth));
			const width: number = this.boxSelectionWidth;
			this.boxSelectionX0 = Math.max(0, this.boxSelectionX0 - width);
			this.boxSelectionX1 = Math.max(0, this.boxSelectionX1 - width);
		}
		this._doc.record(group);
		//this._songEditor._barScrollBar.animatePlayhead();
	}

	private * _eachSelectedChannel(): IterableIterator<number> {
		for (let channel: number = this.boxSelectionChannel; channel < this.boxSelectionChannel + this.boxSelectionHeight; channel++) {
			yield channel;
		}
	}

	private * _eachSelectedBar(): IterableIterator<number> {
		for (let bar: number = this.boxSelectionBar; bar < this.boxSelectionBar + this.boxSelectionWidth; bar++) {
			yield bar;
		}
	}

	private * _eachSelectedPattern(channel: number): IterableIterator<Pattern> {
		const handledPatterns: Dictionary<boolean> = {};
		for (const bar of this._eachSelectedBar()) {
			const currentPatternIndex: number = this._doc.song.channels[channel].bars[bar];
			if (currentPatternIndex == 0) continue;
			if (handledPatterns[String(currentPatternIndex)]) continue;
			handledPatterns[String(currentPatternIndex)] = true;
			const pattern: Pattern | null = this._doc.song.getPattern(channel, bar);
			if (pattern == null) throw new Error();
			yield pattern;
		}
	}

	private _patternIndexIsUnused(channel: number, patternIndex: number): boolean {
		for (let i: number = 0; i < this._doc.song.barCount; i++) {
			if (this._doc.song.channels[channel].bars[i] == patternIndex) {
				return false;
			}
		}
		return true;
	}

	public copy(): void {
		const channels: ChannelCopy[] = [];

		for (const channel of this._eachSelectedChannel()) {
			const patterns: Dictionary<PatternCopy> = {};
			const bars: number[] = [];

			for (const bar of this._eachSelectedBar()) {
				const patternNumber: number = this._doc.song.channels[channel].bars[bar];
				bars.push(patternNumber);
				if (patterns[String(patternNumber)] == undefined) {
					const pattern: Pattern | null = this._doc.song.getPattern(channel, bar);
					let instrument: number = 0;
					let notes: Note[] = [];
					if (pattern != null) {
						instrument = pattern.instrument;

						if (this.patternSelectionActive) {
							for (const note of pattern.cloneNotes()) {
								if (note.end <= this.patternSelectionStart) continue;
								if (note.start >= this.patternSelectionEnd) continue;
								if (note.start < this.patternSelectionStart || note.end > this.patternSelectionEnd) {
									new ChangeNoteLength(null, note, Math.max(note.start, this.patternSelectionStart), Math.min(this.patternSelectionEnd, note.end));
								}
								note.start -= this.patternSelectionStart;
								note.end -= this.patternSelectionStart;
								notes.push(note);
							}
						} else {
							notes = pattern.notes;
						}
					}
					patterns[String(patternNumber)] = { "instrument": instrument, "notes": notes };
				}
			}

			const channelCopy: ChannelCopy = {
				"isNoise": this._doc.song.getChannelIsNoise(channel),
				"isMod": this._doc.song.getChannelIsMod(channel),
				"patterns": patterns,
				"bars": bars,
			};
			channels.push(channelCopy);
		}

		const selectionCopy: SelectionCopy = {
			"partDuration": this.patternSelectionActive ? this.patternSelectionEnd - this.patternSelectionStart : this._doc.song.beatsPerBar * Config.partsPerBeat,
			"channels": channels,
		};
		window.localStorage.setItem("selectionCopy", JSON.stringify(selectionCopy));
	}

	// I'm sorry this function is so complicated!
	// Basically I'm trying to avoid accidentally modifying patterns that are used
	// elsewhere in the song (unless we're just pasting a single pattern) but I'm
	// also trying to reuse patterns where it makes sense to do so, especially 
	// in the same channel it was copied from.
	public pasteNotes(): void {
		const selectionCopy: SelectionCopy | null = JSON.parse(String(window.localStorage.getItem("selectionCopy")));
		if (selectionCopy == null) return;
		const channelCopies: ChannelCopy[] = selectionCopy["channels"] || [];
		const copiedPartDuration: number = selectionCopy["partDuration"] >>> 0;

		const group: ChangeGroup = new ChangeGroup();
		const fillSelection: boolean = (this.boxSelectionWidth > 1 || this.boxSelectionHeight > 1);

		const pasteHeight: number = fillSelection ? this.boxSelectionHeight : Math.min(channelCopies.length, this._doc.song.getChannelCount() - this.boxSelectionChannel);
		for (let pasteChannel: number = 0; pasteChannel < pasteHeight; pasteChannel++) {
			const channelCopy: ChannelCopy = channelCopies[pasteChannel % channelCopies.length];
			const channel: number = this.boxSelectionChannel + pasteChannel;

			const isNoise: boolean = !!channelCopy["isNoise"];
			const isMod: boolean = !!channelCopy["isMod"];
			const patternCopies: Dictionary<PatternCopy> = channelCopy["patterns"] || {};
			const copiedBars: number[] = channelCopy["bars"] || [];
			if (copiedBars.length == 0) continue;
			if (isNoise != this._doc.song.getChannelIsNoise(channel)) continue;
			if (isMod != this._doc.song.getChannelIsMod(channel)) continue;

			const pasteWidth: number = fillSelection ? this.boxSelectionWidth : Math.min(copiedBars.length, this._doc.song.barCount - this.boxSelectionBar);
			if (!fillSelection && copiedBars.length == 1 && channelCopies.length == 1) {
				// Special case: if there's just one pattern being copied, try to insert it
				// into whatever pattern is already selected.
				const copiedPatternIndex: number = copiedBars[0] >>> 0;
				const bar: number = this.boxSelectionBar;
				const currentPatternIndex: number = this._doc.song.channels[channel].bars[bar];
				if (copiedPatternIndex == 0 && currentPatternIndex == 0) continue;

				const patternCopy: PatternCopy = patternCopies[String(copiedPatternIndex)];

				const instrumentCopy: number = Math.min(patternCopy["instrument"] >>> 0, this._doc.song.instrumentsPerChannel - 1);

				if (currentPatternIndex == 0) {
					const existingPattern: Pattern | undefined = this._doc.song.channels[channel].patterns[copiedPatternIndex - 1];
					if (existingPattern != undefined &&
						!this.patternSelectionActive &&
						((comparePatternNotes(patternCopy["notes"], existingPattern.notes) && instrumentCopy == existingPattern.instrument) ||
							this._patternIndexIsUnused(channel, copiedPatternIndex))) {
						group.append(new ChangePatternNumbers(this._doc, copiedPatternIndex, bar, channel, 1, 1));
					} else {
						group.append(new ChangeEnsurePatternExists(this._doc, channel, bar));
					}
				}

				const pattern: Pattern | null = this._doc.song.getPattern(channel, bar);
				if (pattern == null) throw new Error();
				group.append(new ChangePaste(this._doc, pattern, patternCopy["notes"], this.patternSelectionActive ? this.patternSelectionStart : 0, this.patternSelectionActive ? this.patternSelectionEnd : Config.partsPerBeat * this._doc.song.beatsPerBar, copiedPartDuration));
				group.append(new ChangePatternInstrument(this._doc, instrumentCopy, pattern));
			} else if (this.patternSelectionActive) {
				const reusablePatterns: Dictionary<number> = {};
				const usedPatterns: Dictionary<boolean> = {};

				group.append(new ChangeDuplicateSelectedReusedPatterns(this._doc, this.boxSelectionBar, pasteWidth, this.boxSelectionChannel, pasteHeight));

				for (let pasteBar: number = 0; pasteBar < pasteWidth; pasteBar++) {
					const bar: number = this.boxSelectionBar + pasteBar;
					const copiedPatternIndex: number = copiedBars[pasteBar % copiedBars.length] >>> 0;
					const currentPatternIndex: number = this._doc.song.channels[channel].bars[bar];
					const reusedIndex: string = [copiedPatternIndex, currentPatternIndex].join(",");
					if (copiedPatternIndex == 0 && currentPatternIndex == 0) continue;
					if (reusablePatterns[reusedIndex] != undefined) {
						group.append(new ChangePatternNumbers(this._doc, reusablePatterns[reusedIndex], bar, channel, 1, 1));
						continue;
					}

					if (currentPatternIndex == 0) {
						group.append(new ChangeEnsurePatternExists(this._doc, channel, bar));
						const patternCopy: PatternCopy = patternCopies[String(copiedPatternIndex)];
						const instrumentCopy: number = Math.min(patternCopy["instrument"] >>> 0, this._doc.song.instrumentsPerChannel - 1);
						const pattern: Pattern = this._doc.song.getPattern(channel, bar)!;
						group.append(new ChangePatternInstrument(this._doc, instrumentCopy, pattern));
					} else {
						const pattern: Pattern | null = this._doc.song.getPattern(channel, bar);
						if (pattern == null) throw new Error();

						if (!usedPatterns[String(currentPatternIndex)]) {
							usedPatterns[String(currentPatternIndex)] = true;
						} else {
							// If this pattern is used here and elsewhere, it's not safe to modify it directly, so
							// make a duplicate of it and modify that instead.
							group.append(new ChangePatternNumbers(this._doc, 0, bar, channel, 1, 1));
							group.append(new ChangeEnsurePatternExists(this._doc, channel, bar));
							const newPattern: Pattern | null = this._doc.song.getPattern(channel, bar);
							if (newPattern == null) throw new Error();
							group.append(new ChangePatternInstrument(this._doc, pattern.instrument, newPattern));
							for (const note of pattern.cloneNotes()) {
								group.append(new ChangeNoteAdded(this._doc, newPattern, note, newPattern.notes.length, false));
							}
						}
					}

					const pattern: Pattern | null = this._doc.song.getPattern(channel, bar);
					if (pattern == null) throw new Error();
					if (copiedPatternIndex == 0) {
						group.append(new ChangeNoteTruncate(this._doc, pattern, this.patternSelectionStart, this.patternSelectionEnd));
					} else {
						const patternCopy: PatternCopy = patternCopies[String(copiedPatternIndex)];
						group.append(new ChangePaste(this._doc, pattern, patternCopy["notes"], this.patternSelectionStart, this.patternSelectionEnd, copiedPartDuration));
					}

					reusablePatterns[reusedIndex] = this._doc.song.channels[channel].bars[bar];
				}
			} else {
				for (let pasteBar: number = 0; pasteBar < pasteWidth; pasteBar++) {
					const bar: number = this.boxSelectionBar + pasteBar;
					const removedPattern: number = this._doc.song.channels[channel].bars[bar];
					if (removedPattern != 0) {
						group.append(new ChangePatternNumbers(this._doc, 0, bar, channel, 1, 1));
						if (this._patternIndexIsUnused(channel, removedPattern)) {
							// When a pattern becomes unused when replaced by rectangular selection pasting,
							// remove all the notes from the pattern so that it may be reused.
							this._doc.song.channels[channel].patterns[removedPattern - 1].notes.length = 0;
						}
					}
				}

				const reusablePatterns: Dictionary<number> = {};
				for (let pasteBar: number = 0; pasteBar < pasteWidth; pasteBar++) {
					const bar: number = this.boxSelectionBar + pasteBar;
					const copiedPatternIndex: number = copiedBars[pasteBar % copiedBars.length] >>> 0;
					const reusedIndex: string = String(copiedPatternIndex);
					if (copiedPatternIndex == 0) continue;
					if (reusablePatterns[reusedIndex] != undefined) {
						group.append(new ChangePatternNumbers(this._doc, reusablePatterns[reusedIndex], bar, channel, 1, 1));
						continue;
					}
					const patternCopy: PatternCopy = patternCopies[String(copiedPatternIndex)];
					const instrumentCopy: number = Math.min(patternCopy["instrument"] >>> 0, this._doc.song.instrumentsPerChannel - 1);
					const existingPattern: Pattern | undefined = this._doc.song.channels[channel].patterns[copiedPatternIndex - 1];

					if (existingPattern != undefined &&
						copiedPartDuration == Config.partsPerBeat * this._doc.song.beatsPerBar &&
						comparePatternNotes(patternCopy["notes"], existingPattern.notes) &&
						instrumentCopy == existingPattern.instrument) {
						group.append(new ChangePatternNumbers(this._doc, copiedPatternIndex, bar, channel, 1, 1));
					} else {
						if (existingPattern != undefined && this._patternIndexIsUnused(channel, copiedPatternIndex)) {
							group.append(new ChangePatternNumbers(this._doc, copiedPatternIndex, bar, channel, 1, 1));
						} else {
							group.append(new ChangeEnsurePatternExists(this._doc, channel, bar));
						}
						const pattern: Pattern | null = this._doc.song.getPattern(channel, bar);
						if (pattern == null) throw new Error();
						group.append(new ChangePaste(this._doc, pattern, patternCopy["notes"], this.patternSelectionActive ? this.patternSelectionStart : 0, this.patternSelectionActive ? this.patternSelectionEnd : Config.partsPerBeat * this._doc.song.beatsPerBar, copiedPartDuration));
						group.append(new ChangePatternInstrument(this._doc, instrumentCopy, pattern));
					}

					reusablePatterns[reusedIndex] = this._doc.song.channels[channel].bars[bar];

				}
			}
		}

		this._doc.record(group);
	}

	public pasteNumbers(): void {
		const selectionCopy: SelectionCopy | null = JSON.parse(String(window.localStorage.getItem("selectionCopy")));
		if (selectionCopy == null) return;
		const channelCopies: ChannelCopy[] = selectionCopy["channels"] || [];

		const group: ChangeGroup = new ChangeGroup();
		const fillSelection: boolean = (this.boxSelectionWidth > 1 || this.boxSelectionHeight > 1);

		const pasteHeight: number = fillSelection ? this.boxSelectionHeight : Math.min(channelCopies.length, this._doc.song.getChannelCount() - this.boxSelectionChannel);
		for (let pasteChannel: number = 0; pasteChannel < pasteHeight; pasteChannel++) {
			const channelCopy: ChannelCopy = channelCopies[pasteChannel % channelCopies.length];
			const channel: number = this.boxSelectionChannel + pasteChannel;

			const copiedBars: number[] = channelCopy["bars"] || [];
			if (copiedBars.length == 0) continue;

			const pasteWidth: number = fillSelection ? this.boxSelectionWidth : Math.min(copiedBars.length, this._doc.song.barCount - this.boxSelectionBar);
			for (let pasteBar: number = 0; pasteBar < pasteWidth; pasteBar++) {
				const copiedPatternIndex: number = copiedBars[pasteBar % copiedBars.length] >>> 0;
				const bar: number = this.boxSelectionBar + pasteBar;

				if (copiedPatternIndex > this._doc.song.patternsPerChannel) {
					group.append(new ChangePatternsPerChannel(this._doc, copiedPatternIndex));
				}

				group.append(new ChangePatternNumbers(this._doc, copiedPatternIndex, bar, channel, 1, 1));
			}
		}

		this._doc.record(group);
	}

	public selectAll(): void {
		new ChangePatternSelection(this._doc, 0, 0);
		if (this.boxSelectionBar == 0 &&
			this.boxSelectionChannel == 0 &&
			this.boxSelectionWidth == this._doc.song.barCount &&
			this.boxSelectionHeight == this._doc.song.getChannelCount()) {
			this.setTrackSelection(this._doc.bar, this._doc.bar, this._doc.channel, this._doc.channel);
		} else {
			this.setTrackSelection(0, this._doc.song.barCount - 1, 0, this._doc.song.getChannelCount() - 1);
		}
		this.selectionUpdated();
	}

	public selectChannel(): void {
		new ChangePatternSelection(this._doc, 0, 0);
		if (this.boxSelectionBar == 0 && this.boxSelectionWidth == this._doc.song.barCount) {
			this.setTrackSelection(this._doc.bar, this._doc.bar, this.boxSelectionY0, this.boxSelectionY1);
		} else {
			this.setTrackSelection(0, this._doc.song.barCount - 1, this.boxSelectionY0, this.boxSelectionY1);
		}
		this.selectionUpdated();
	}

	public duplicatePatterns(): void {
		this._doc.record(new ChangeDuplicateSelectedReusedPatterns(this._doc, this.boxSelectionBar, this.boxSelectionWidth, this.boxSelectionChannel, this.boxSelectionHeight));
	}

	public muteChannels(allChannels: boolean): void {
		if (allChannels) {
			let anyMuted: boolean = false;
			for (let channel: number = 0; channel < this._doc.song.channels.length; channel++) {
				if (this._doc.song.channels[channel].muted) {
					anyMuted = true;
					break;
				}
			}
			for (let channel: number = 0; channel < this._doc.song.channels.length; channel++) {
				this._doc.song.channels[channel].muted = !anyMuted;
			}
		} else {
			let anyUnmuted: boolean = false;
			for (const channel of this._eachSelectedChannel()) {
				if (!this._doc.song.channels[channel].muted) {
					anyUnmuted = true;
					break;
				}
			}
			for (const channel of this._eachSelectedChannel()) {
				this._doc.song.channels[channel].muted = anyUnmuted;
			}
		}

		this._doc.notifier.changed();
	}

	public soloChannels(): void {
		let alreadySoloed: boolean = true;

		for (let channel: number = 0; channel < this._doc.song.pitchChannelCount + this._doc.song.noiseChannelCount; channel++) {
			const shouldBeMuted: boolean = channel < this.boxSelectionChannel || channel >= this.boxSelectionChannel + this.boxSelectionHeight;
			if (this._doc.song.channels[channel].muted != shouldBeMuted) {
				alreadySoloed = false;
				break;
			}
		}

		if (alreadySoloed) {
			for (let channel: number = 0; channel < this._doc.song.pitchChannelCount + this._doc.song.noiseChannelCount; channel++) {
				this._doc.song.channels[channel].muted = false;
			}
		} else {
			for (let channel: number = 0; channel < this._doc.song.pitchChannelCount + this._doc.song.noiseChannelCount; channel++) {
				this._doc.song.channels[channel].muted = channel < this.boxSelectionChannel || channel >= this.boxSelectionChannel + this.boxSelectionHeight;
			}
		}

		this._doc.notifier.changed();
	}

	public forceRhythm(): void {
		const group: ChangeGroup = new ChangeGroup();

		if (this.boxSelectionWidth > 1 || this.boxSelectionHeight > 1) {
			group.append(new ChangeDuplicateSelectedReusedPatterns(this._doc, this.boxSelectionBar, this.boxSelectionWidth, this.boxSelectionChannel, this.boxSelectionHeight));
		}

		for (const channel of this._eachSelectedChannel()) {
			for (const pattern of this._eachSelectedPattern(channel)) {
				group.append(new ChangePatternRhythm(this._doc, pattern));
			}
		}

		this._doc.record(group);
	}

	public forceScale(): void {
		const group: ChangeGroup = new ChangeGroup();

		if (this.boxSelectionWidth > 1 || this.boxSelectionHeight > 1) {
			group.append(new ChangeDuplicateSelectedReusedPatterns(this._doc, this.boxSelectionBar, this.boxSelectionWidth, this.boxSelectionChannel, this.boxSelectionHeight));
		}

		const scaleFlags: boolean[] = [true, false, false, false, false, false, false, false, false, false, false, false];
		for (const channel of this._eachSelectedChannel()) {
			if (this._doc.song.getChannelIsNoise(channel) || this._doc.song.getChannelIsMod(channel)) continue;
			for (const pattern of this._eachSelectedPattern(channel)) {
				unionOfUsedNotes(pattern, scaleFlags);
			}
		}

		const scaleMap: number[] = generateScaleMap(scaleFlags, this._doc.song.scale);

		for (const channel of this._eachSelectedChannel()) {
			if (this._doc.song.getChannelIsNoise(channel) || this._doc.song.getChannelIsMod(channel)) continue;
			for (const pattern of this._eachSelectedPattern(channel)) {
				group.append(new ChangePatternScale(this._doc, pattern, scaleMap));
			}
		}

		this._doc.record(group);
	}

	public setTrackSelection(newX0: number, newX1: number, newY0: number, newY1: number): void {
		const canReplaceLastChange: boolean = true;//this._doc.lastChangeWas(this._changeTrack);
		this._changeTrack = new ChangeGroup();
		this._changeTrack.append(new ChangeTrackSelection(this._doc, newX0, newX1, newY0, newY1));
		this._doc.record(this._changeTrack, canReplaceLastChange);
	}

	public transpose(upward: boolean, octave: boolean): void {
		const canReplaceLastChange: boolean = this._doc.lastChangeWas(this._changeTranspose);
		this._changeTranspose = new ChangeGroup();

		if (this.boxSelectionWidth > 1 || this.boxSelectionHeight > 1) {
			this._changeTranspose.append(new ChangeDuplicateSelectedReusedPatterns(this._doc, this.boxSelectionBar, this.boxSelectionWidth, this.boxSelectionChannel, this.boxSelectionHeight));
		}

		for (const channel of this._eachSelectedChannel()) {
			for (const pattern of this._eachSelectedPattern(channel)) {
				this._changeTranspose.append(new ChangeTranspose(this._doc, channel, pattern, upward, false, octave));
			}
		}

		this._doc.record(this._changeTranspose, canReplaceLastChange);
	}

	public setInstrument(instrument: number): void {
		const group: ChangeGroup = new ChangeGroup();

		if (this.boxSelectionWidth > 1 || this.boxSelectionHeight > 1) {
			group.append(new ChangeDuplicateSelectedReusedPatterns(this._doc, this.boxSelectionBar, this.boxSelectionWidth, this.boxSelectionChannel, this.boxSelectionHeight));
		}

		for (const channel of this._eachSelectedChannel()) {
			for (const pattern of this._eachSelectedPattern(channel)) {
				group.append(new ChangePatternInstrument(this._doc, instrument, pattern));
			}
		}

		this._doc.record(group);
	}

	public resetBoxSelection(): void {
		this.boxSelectionX0 = this.boxSelectionX1 = this._doc.bar;
		this.boxSelectionY0 = this.boxSelectionY1 = this._doc.channel;
	}
}
