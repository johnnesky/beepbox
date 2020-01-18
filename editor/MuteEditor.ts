// Copyright (C) 2019 John Nesky, distributed under the MIT license.

/// <reference path="../synth/synth.ts" />
/// <reference path="ColorConfig.ts" />
/// <reference path="SongDocument.ts" />
/// <reference path="html.ts" />
/// <reference path="SongEditor.ts" />

namespace beepbox {
	export class MuteEditor {
		public readonly container: HTMLElement = HTML.div({class: "muteEditor"});
		
		private readonly _buttons: HTMLButtonElement[] = [];
		private _editorHeight: number = 128;
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
		
		public onKeyPressed(event: KeyboardEvent): void {
			switch (event.keyCode) {
				case 38: // up
					//event.preventDefault();
					break;
				default:
					break;
			}
		}
		
		public render(): void {
			if (!this._doc.enableChannelMuting) return;
			
			const channelHeight = this._doc.getChannelHeight();
			
			if (this._renderedChannelCount != this._doc.song.getChannelCount()) {
				for (let y: number = this._renderedChannelCount; y < this._doc.song.getChannelCount(); y++) {
					const muteButton: HTMLButtonElement = HTML.button({style: `height: ${channelHeight - 4}px; margin: 2px;`},
						SVG.svg({width: "100%", height: "100%", viewBox: "3 3 20 20", style: "pointer-events: none;"},
							SVG.path({d: "M 4 16 L 4 10 L 8 10 L 13 5 L 13 21 L 8 16 z M 15 11 L 16 10 A 7.2 7.2 0 0 1 16 16 L 15 15 A 5.8 5.8 0 0 0 15 12 z M 18 8 L 19 7 A 11.5 11.5 0 0 1 19 19 L 18 18 A 10.1 10.1 0 0 0 18 8 z", fill: "currentColor"}),
						),
					);
					this.container.appendChild(muteButton);
					this._buttons[y] = muteButton;
				}
				
				for (let y: number = this._doc.song.getChannelCount(); y < this._renderedChannelCount; y++) {
					this.container.removeChild(this._buttons[y]);
				}
				
				this._buttons.length = this._doc.song.getChannelCount();
			}
			
			for (let y: number = 0; y < this._doc.song.getChannelCount(); y++) {
				this._buttons[y].style.color = this._doc.song.channels[y].muted
					? ColorConfig.editorBackground
					: ColorConfig.primaryText; // ColorConfig.getChannelColor(this._doc.song, y).channelBright
			}
			
			if (this._renderedChannelHeight != channelHeight) {
				for (let y: number = 0; y < this._doc.song.getChannelCount(); y++) {
					this._buttons[y].style.height = (channelHeight - 4) + "px";
				}
			}
			
			if (this._renderedChannelHeight != channelHeight || this._renderedChannelCount != this._doc.song.getChannelCount()) {
				this._renderedChannelHeight = channelHeight;
				this._renderedChannelCount = this._doc.song.getChannelCount();
				this._editorHeight = this._doc.song.getChannelCount() * channelHeight;
				this.container.style.height = this._editorHeight + "px";
			}
		}
	}
}
