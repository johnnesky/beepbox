// Copyright (c) 2012-2022 John Nesky and contributing authors, distributed under the MIT license, see accompanying the LICENSE.md file.

import {SongDocument} from "./SongDocument";
import {HTML} from "imperative-html/dist/esm/elements-strict";
import {ColorConfig} from "./ColorConfig";

export class MuteEditor {
	private _cornerFiller: HTMLDivElement = HTML.div({style: `background: ${ColorConfig.editorBackground}; position: sticky; bottom: 0; left: 0; width: 32px; height: 30px;`});
	
	public readonly container: HTMLElement = HTML.div({class: "muteEditor"},
	);
	
	private readonly _buttons: HTMLButtonElement[] = [];
	private _renderedChannelCount: number = 0;
	private _renderedChannelHeight: number = -1;
	
	constructor(private _doc: SongDocument) {
		this.container.addEventListener("click", this._onClick);
	}
	
	private _onClick = (event: MouseEvent): void => {
		const index = this._buttons.indexOf(<HTMLButtonElement> event.target);
		if (index == -1) return;
		this._doc.song.channels[index].muted = !this._doc.song.channels[index].muted;
		this._doc.notifier.changed();
	}
	
	public render(): void {
		if (!this._doc.enableChannelMuting) return;
		
		const channelHeight = this._doc.getChannelHeight();
		
		if (this._renderedChannelCount != this._doc.song.getChannelCount()) {
			for (let y: number = this._renderedChannelCount; y < this._doc.song.getChannelCount(); y++) {
				const muteButton: HTMLButtonElement = HTML.button({class: "mute-button", title: "Mute (M), Mute All (⇧M), Solo (S), Exclude (⇧S)", style: `height: ${channelHeight - 4}px; margin: 2px;`});
				this.container.appendChild(muteButton);
				this._buttons[y] = muteButton;
			}
			
			for (let y: number = this._doc.song.getChannelCount(); y < this._renderedChannelCount; y++) {
				this.container.removeChild(this._buttons[y]);
			}
			
			this._buttons.length = this._doc.song.getChannelCount();
			
			this.container.appendChild(this._cornerFiller);
		}
		
		for (let y: number = 0; y < this._doc.song.getChannelCount(); y++) {
			if (this._doc.song.channels[y].muted) {
				this._buttons[y].classList.add("muted");
			} else {
				this._buttons[y].classList.remove("muted");
			}
		}
		
		if (this._renderedChannelHeight != channelHeight) {
			for (let y: number = 0; y < this._doc.song.getChannelCount(); y++) {
				this._buttons[y].style.height = (channelHeight - 4) + "px";
			}
		}
		
		if (this._renderedChannelHeight != channelHeight || this._renderedChannelCount != this._doc.song.getChannelCount()) {
			this._renderedChannelHeight = channelHeight;
			this._renderedChannelCount = this._doc.song.getChannelCount();
		}
	}
}
