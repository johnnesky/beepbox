// Copyright (C) 2020 John Nesky, distributed under the MIT license.

import {Dictionary, Config} from "../synth/SynthConfig";
import {Note, Pattern} from "../synth/synth";
import {SongDocument, StateChangeType} from "./SongDocument";
import {ChangeGroup} from "./Change";
import {ChangeChannelBar, ChangePatternNumbers, ChangeInsertBars, ChangeDeleteBars, ChangeEnsurePatternExists, ChangePaste, ChangePatternInstrument, ChangePatternsPerChannel, ChangePatternRhythm, ChangePatternScale, ChangeTranspose, comparePatternNotes, unionOfUsedNotes, generateScaleMap} from "./changes";

interface PatternCopy {
	instrument: number;
	notes: any[];
}

interface ChannelCopy {
	isNoise: boolean;
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
	public patternSelectionStart: number = 0;
	public patternSelectionEnd: number = 0;
	public patternSelectionActive: boolean = false;
	
	private _changeTranspose: ChangeGroup | null = null;
	
	constructor(private _doc: SongDocument) {}
	
	public selectionUpdated(): void {
		this._doc.notifier.changed();
		this.digits = "";
		this._doc.forgetLastChange();
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
		new ChangeChannelBar(this._doc, channel, bar);
		this.selectionUpdated();
	}
	
	public setPattern(pattern: number): void {
		this._doc.record(new ChangePatternNumbers(this._doc, pattern, this.boxSelectionBar, this.boxSelectionChannel, this.boxSelectionWidth, this.boxSelectionHeight));
	}
	
	public nextDigit(digit: string): void {
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
	
	public insertBars(): void {
		this._doc.record(new ChangeInsertBars(this._doc, this.boxSelectionBar + this.boxSelectionWidth, this.boxSelectionWidth), StateChangeType.jump);
		const width: number = this.boxSelectionWidth;
		this.boxSelectionX0 += width;
		this.boxSelectionX1 += width;
	}
	
	public deleteBars(): void {
		this._doc.record(new ChangeDeleteBars(this._doc, this.boxSelectionBar, this.boxSelectionWidth), StateChangeType.jump);
		const width: number = this.boxSelectionWidth;
		this.boxSelectionX0 = Math.max(0, this.boxSelectionX0 - width);
		this.boxSelectionX1 = Math.max(0, this.boxSelectionX1 - width);
	}
	
	private *_eachSelectedChannel(): IterableIterator<number> {
		for (let channel: number = this.boxSelectionChannel; channel < this.boxSelectionChannel + this.boxSelectionHeight; channel++) {
			yield channel;
		}
	}
	
	private *_eachSelectedBar(): IterableIterator<number> {
		for (let bar: number = this.boxSelectionBar; bar < this.boxSelectionBar + this.boxSelectionWidth; bar++) {
			yield bar;
		}
	}
	
	private *_eachUnselectedBar(): IterableIterator<number> {
		for (let bar: number = 0; bar < this._doc.song.barCount; bar++) {
			if (bar < this.boxSelectionBar || bar >= this.boxSelectionBar + this.boxSelectionWidth) {
				yield bar;
			}
		}
	}
	
	private *_eachSelectedPattern(channel: number): IterableIterator<Pattern> {
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
						notes = pattern.notes;
					}
					patterns[String(patternNumber)] = {"instrument": instrument, "notes": notes};
				}
			}
			
			const channelCopy: ChannelCopy = {
				"isNoise": this._doc.song.getChannelIsNoise(channel),
				"patterns": patterns,
				"bars": bars,
			};
			channels.push(channelCopy);
		}
		
		const selectionCopy: SelectionCopy = {
			"partDuration": this._doc.song.beatsPerBar * Config.partsPerBeat,
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
			const patternCopies: Dictionary<PatternCopy> = channelCopy["patterns"] || {};
			const copiedBars: number[] = channelCopy["bars"] || [];
			if (copiedBars.length == 0) continue;
			if (isNoise != this._doc.song.getChannelIsNoise(channel)) continue;
			
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
						((comparePatternNotes(patternCopy["notes"], existingPattern.notes) && instrumentCopy == existingPattern.instrument) ||
						this._patternIndexIsUnused(channel, copiedPatternIndex)))
					{
						group.append(new ChangePatternNumbers(this._doc, copiedPatternIndex, bar, channel, 1, 1));
					} else {
						group.append(new ChangeEnsurePatternExists(this._doc, channel, bar));
					}
				}
				
				const pattern: Pattern | null = this._doc.song.getPattern(channel, bar);
				if (pattern == null) throw new Error();
				group.append(new ChangePaste(this._doc, pattern, patternCopy["notes"], 0, Config.partsPerBeat * this._doc.song.beatsPerBar, copiedPartDuration));
				group.append(new ChangePatternInstrument(this._doc, instrumentCopy, pattern));
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
					const copiedPatternIndex: number = copiedBars[pasteBar % copiedBars.length] >>> 0;
					if (copiedPatternIndex == 0) continue;
					
					const bar: number = this.boxSelectionBar + pasteBar;
					if (reusablePatterns[String(copiedPatternIndex)] != undefined) {
						group.append(new ChangePatternNumbers(this._doc, reusablePatterns[String(copiedPatternIndex)], bar, channel, 1, 1));
					} else {
						const patternCopy: PatternCopy = patternCopies[String(copiedPatternIndex)];
						const instrumentCopy: number = Math.min(patternCopy["instrument"] >>> 0, this._doc.song.instrumentsPerChannel - 1);
						const existingPattern: Pattern | undefined = this._doc.song.channels[channel].patterns[copiedPatternIndex - 1];
						
						if (existingPattern != undefined &&
							copiedPartDuration == Config.partsPerBeat * Config.partsPerBeat * this._doc.song.beatsPerBar &&
							comparePatternNotes(patternCopy["notes"], existingPattern.notes) &&
							instrumentCopy == existingPattern.instrument)
						{
							group.append(new ChangePatternNumbers(this._doc, copiedPatternIndex, bar, channel, 1, 1));
						} else {
							if (existingPattern != undefined && this._patternIndexIsUnused(channel, copiedPatternIndex)) {
								group.append(new ChangePatternNumbers(this._doc, copiedPatternIndex, bar, channel, 1, 1));
							} else {
								group.append(new ChangeEnsurePatternExists(this._doc, channel, bar));
							}
							const pattern: Pattern | null = this._doc.song.getPattern(channel, bar);
							if (pattern == null) throw new Error();
							group.append(new ChangePaste(this._doc, pattern, patternCopy["notes"], 0, Config.partsPerBeat * this._doc.song.beatsPerBar, copiedPartDuration));
							group.append(new ChangePatternInstrument(this._doc, instrumentCopy, pattern));
						}
						
						reusablePatterns[String(copiedPatternIndex)] = this._doc.song.channels[channel].bars[bar];
					}
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
		if (
			this.boxSelectionBar == 0 &&
			this.boxSelectionChannel == 0 &&
			this.boxSelectionWidth == this._doc.song.barCount &&
			this.boxSelectionHeight == this._doc.song.getChannelCount()
		) {
			this.resetBoxSelection();
		} else {
			this.boxSelectionX0 = 0;
			this.boxSelectionY0 = 0;
			this.boxSelectionX1 = this._doc.song.barCount - 1;
			this.boxSelectionY1 = this._doc.song.getChannelCount() - 1;
		}
		this.selectionUpdated();
	}
	
	public selectChannel(): void {
		if (
			this.boxSelectionBar == 0 &&
			this.boxSelectionWidth == this._doc.song.barCount
		) {
			this.boxSelectionX0 = this.boxSelectionX1 = this._doc.bar;
		} else {
			this.boxSelectionX0 = 0;
			this.boxSelectionX1 = this._doc.song.barCount - 1;
		}
		this.selectionUpdated();
	}
	
	public duplicatePatterns(): void {
		const group: ChangeGroup = new ChangeGroup();
		
		for (const channel of this._eachSelectedChannel()) {
			const reusablePatterns: Dictionary<number> = {};
			
			for (const bar of this._eachSelectedBar()) {
				const currentPatternIndex: number = this._doc.song.channels[channel].bars[bar];
				if (currentPatternIndex == 0) continue;
				
				if (reusablePatterns[String(currentPatternIndex)] == undefined) {
					let isUsedElsewhere = false;
					for (const bar2 of this._eachUnselectedBar()) {
						if (this._doc.song.channels[channel].bars[bar2] == currentPatternIndex) {
							isUsedElsewhere = true;
							break;
						}
					}
					if (isUsedElsewhere) {
						// Need to duplicate the pattern.
						const copiedPattern: Pattern = this._doc.song.getPattern(channel, bar)!;
						group.append(new ChangePatternNumbers(this._doc, 0, bar, channel, 1, 1));
						group.append(new ChangeEnsurePatternExists(this._doc, channel, bar));
						const newPattern: Pattern | null = this._doc.song.getPattern(channel, bar);
						if (newPattern == null) throw new Error();
						group.append(new ChangePaste(this._doc, newPattern, copiedPattern.notes, 0, Config.partsPerBeat * this._doc.song.beatsPerBar, Config.partsPerBeat * this._doc.song.beatsPerBar));
						group.append(new ChangePatternInstrument(this._doc, copiedPattern.instrument, newPattern));
						reusablePatterns[String(currentPatternIndex)] = this._doc.song.channels[channel].bars[bar];
					} else {
						reusablePatterns[String(currentPatternIndex)] = currentPatternIndex;
					}
				}
				
				group.append(new ChangePatternNumbers(this._doc, reusablePatterns[String(currentPatternIndex)], bar, channel, 1, 1));
			}
		}
		
		this._doc.record(group);
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
		
		for (let channel: number = 0; channel < this._doc.song.channels.length; channel++) {
			const shouldBeMuted: boolean = channel < this.boxSelectionChannel || channel >= this.boxSelectionChannel + this.boxSelectionHeight;
			if (this._doc.song.channels[channel].muted != shouldBeMuted) {
				alreadySoloed = false;
				break;
			}
		}
		
		if (alreadySoloed) {
			for (let channel: number = 0; channel < this._doc.song.channels.length; channel++) {
				this._doc.song.channels[channel].muted = false;
			}
		} else {
			for (let channel: number = 0; channel < this._doc.song.channels.length; channel++) {
				this._doc.song.channels[channel].muted = channel < this.boxSelectionChannel || channel >= this.boxSelectionChannel + this.boxSelectionHeight;
			}
		}
		
		this._doc.notifier.changed();
	}
	
	public forceRhythm(): void {
		const group: ChangeGroup = new ChangeGroup();
		
		for (const channel of this._eachSelectedChannel()) {
			for (const pattern of this._eachSelectedPattern(channel)) {
				group.append(new ChangePatternRhythm(this._doc, pattern));
			}
		}
		
		this._doc.record(group);
	}
	
	public forceScale(): void {
		const group: ChangeGroup = new ChangeGroup();
		
		const scaleFlags: boolean[] = [true, false, false, false, false, false, false, false, false, false, false, false];
		for (const channel of this._eachSelectedChannel()) {
			if (this._doc.song.getChannelIsNoise(channel)) continue;
			for (const pattern of this._eachSelectedPattern(channel)) {
				unionOfUsedNotes(pattern, scaleFlags);
			}
		}
			
		const scaleMap: number[] = generateScaleMap(scaleFlags, this._doc.song.scale);
			
		for (const channel of this._eachSelectedChannel()) {
			if (this._doc.song.getChannelIsNoise(channel)) continue;
			for (const pattern of this._eachSelectedPattern(channel)) {
				group.append(new ChangePatternScale(this._doc, pattern, scaleMap));
			}
		}
		
		this._doc.record(group);
	}
	
	public transpose(upward: boolean, octave: boolean): void {
		const canReplaceLastChange: boolean = this._doc.lastChangeWas(this._changeTranspose);
		const group: ChangeGroup = new ChangeGroup();
		this._changeTranspose = group;
		
		for (const channel of this._eachSelectedChannel()) {
			for (const pattern of this._eachSelectedPattern(channel)) {
				group.append(new ChangeTranspose(this._doc, channel, pattern, upward, false, octave));
			}
		}
		
		this._doc.record(group, canReplaceLastChange ? StateChangeType.replace : StateChangeType.push);
	}
	
	public setInstrument(instrument: number): void {
		const group: ChangeGroup = new ChangeGroup();
		
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
