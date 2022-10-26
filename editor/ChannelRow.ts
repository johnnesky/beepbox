// Copyright (C) 2021 John Nesky, distributed under the MIT license.

import {Pattern} from "../synth/synth";
import {ColorConfig, ChannelColors} from "./ColorConfig";
import {SongDocument} from "./SongDocument";
import {HTML} from "imperative-html/dist/esm/elements-strict";

export class Box {
	private readonly _text: Text = document.createTextNode("");
	private readonly _label: HTMLElement = HTML.div({class: "channelBoxLabel"}, this._text);
	public readonly container: HTMLElement = HTML.div({class: "channelBox", style: `margin: 1px; height: ${ChannelRow.patternHeight - 2}px;`}, this._label);
	private _renderedIndex: number = -1;
	constructor(channel: number, color: string) {
		this.container.style.background = ColorConfig.uiWidgetBackground;
		this._label.style.color = color;
	}
	
	public setWidth(width: number): void {
		this.container.style.width = (width - 2) + "px"; // there's a 1 pixel margin on either side.
	}
	
	public setIndex(index: number, selected: boolean, color: string): void {
		if (this._renderedIndex != index) {
			this._renderedIndex = index;
			this._text.data = String(index);
		}
		this._label.style.color = selected ? ColorConfig.invertedText : color;
		this.container.style.background = selected ? color : (index == 0) ? "none" : ColorConfig.uiWidgetBackground;
	}
}

export class ChannelRow {
	public static patternHeight: number = 28;
	
	private _renderedBarWidth: number = -1;
	private _boxes: Box[] = [];
	
	public readonly container: HTMLElement = HTML.div({class: "channelRow"});
	
	constructor(private readonly _doc: SongDocument, public readonly index: number) {}
	
	public render(): void {
		const barWidth: number = this._doc.getBarWidth();
		if (this._boxes.length != this._doc.song.barCount) {
			for (let x: number = this._boxes.length; x < this._doc.song.barCount; x++) {
				const box: Box = new Box(this.index, ColorConfig.getChannelColor(this._doc.song, this.index).secondaryChannel);
				box.setWidth(barWidth);
				this.container.appendChild(box.container);
				this._boxes[x] = box;
			}
			for (let x: number = this._doc.song.barCount; x < this._boxes.length; x++) {
				this.container.removeChild(this._boxes[x].container);
			}
			this._boxes.length = this._doc.song.barCount;
		}
		
		if (this._renderedBarWidth != barWidth) {
			this._renderedBarWidth = barWidth;
			for (let x: number = 0; x < this._boxes.length; x++) {
				this._boxes[x].setWidth(barWidth);
			}
		}
		
		for (let i: number = 0; i < this._boxes.length; i++) {
			const pattern: Pattern | null = this._doc.song.getPattern(this.index, i);
			const selected: boolean = (i == this._doc.bar && this.index == this._doc.channel);
			const dim: boolean = (pattern == null || pattern.notes.length == 0);
			
			const box: Box = this._boxes[i];
			if (i < this._doc.song.barCount) {
				const colors: ChannelColors = ColorConfig.getChannelColor(this._doc.song, this.index);
				box.setIndex(this._doc.song.channels[this.index].bars[i], selected, dim && !selected ? colors.secondaryChannel : colors.primaryChannel);
				box.container.style.visibility = "visible";
			} else {
				box.container.style.visibility = "hidden";
			}
		}
	}
}
