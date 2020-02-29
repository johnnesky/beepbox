// Copyright (C) 2020 John Nesky, distributed under the MIT license.

/// <reference path="../synth/synth.ts" />
/// <reference path="ColorConfig.ts" />
/// <reference path="SongDocument.ts" />
/// <reference path="html.ts" />
/// <reference path="SongEditor.ts" />

namespace beepbox {
	export class MuteEditor {
		public readonly container: HTMLElement = HTML.div({ class: "muteEditor", style: "margin-top: " + Config.barEditorHeight + "px;" });

		private readonly _buttons: HTMLDivElement[] = [];
		private readonly _channelCounts: HTMLDivElement[] = [];
		private _editorHeight: number = 128;
		private _renderedChannelCount: number = 0;
		private _renderedPitchChannels: number = 0;
		private _renderedNoiseChannels: number = 0;
		private _renderedModChannels: number = 0;
		private _renderedChannelHeight: number = -1;

		constructor(private _doc: SongDocument) {
			this.container.addEventListener("click", this._onClick);
		}

		private _onClick = (event: MouseEvent): void => {

			const index = this._buttons.indexOf(<HTMLDivElement>event.target);
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

					const channelCountText: HTMLDivElement = HTML.div({ class: "noSelection muteButtonText", style: "display: table-cell; vertical-align: middle; text-align: center; -webkit-user-select: none; -webkit-touch-callout: none; -moz-user-select: none; -ms-user-select: none; user-select: none; pointer-events: none; width: 12px; height: 20px; transform: translate(0px, 1px);" });
					const muteButton: HTMLDivElement = HTML.div({ class: "mute-button", style: `display: block; pointer-events: none; width: 16px; height: 20px; transform: translate(2px, 1px);` });

					const muteContainer: HTMLDivElement = HTML.div({ style: "align-items: center; height: 20px; margin: 0px; display: table; flex-direction: row; justify-content: space-between;" }, [
						muteButton,
						channelCountText,
					]);
					this.container.appendChild(muteContainer);
					this._buttons[y] = muteContainer;
					this._channelCounts[y] = channelCountText;
				}

				for (let y: number = this._doc.song.getChannelCount(); y < this._renderedChannelCount; y++) {
					this.container.removeChild(this._buttons[y]);
				}

				this._buttons.length = this._doc.song.getChannelCount();
			}

			for (let y: number = 0; y < this._doc.song.getChannelCount(); y++) {
				if (this._doc.song.channels[y].muted) {
					this._buttons[y].children[0].classList.add("muted");

					if (y < this._doc.song.pitchChannelCount)
						this._channelCounts[y].style.color = ColorConfig.trackEditorBgPitchDim;
					else if (y < this._doc.song.pitchChannelCount + this._doc.song.noiseChannelCount)
						this._channelCounts[y].style.color = ColorConfig.trackEditorBgNoiseDim;
					else
						this._channelCounts[y].style.color = ColorConfig.trackEditorBgModDim;

				} else {
					this._buttons[y].children[0].classList.remove("muted");

					if (y < this._doc.song.pitchChannelCount)
						this._channelCounts[y].style.color = ColorConfig.trackEditorBgPitch;
					else if (y < this._doc.song.pitchChannelCount + this._doc.song.noiseChannelCount)
						this._channelCounts[y].style.color = ColorConfig.trackEditorBgNoise;
					else
						this._channelCounts[y].style.color = ColorConfig.trackEditorBgMod;
				}
			}

			if (this._renderedChannelHeight != channelHeight || this._renderedChannelCount != this._doc.song.getChannelCount()) {
				for (let y: number = 0; y < this._doc.song.getChannelCount(); y++) {
					this._buttons[y].style.marginTop = ((channelHeight - 20) / 2) + "px";
					this._buttons[y].style.marginBottom = ((channelHeight - 20) / 2) + "px";
				}
			}

			if (this._renderedModChannels != this._doc.song.modChannelCount || this._renderedChannelCount != this._doc.song.getChannelCount()) {
				for (let y: number = 0; y < this._doc.song.getChannelCount(); y++) {
					if (y < this._doc.song.pitchChannelCount + this._doc.song.noiseChannelCount) {
						this._buttons[y].children[0].classList.remove("modMute");
					}
					else {
						this._buttons[y].children[0].classList.add("modMute");
					}
				}
			}

			if (this._renderedModChannels != this._doc.song.modChannelCount || this._renderedPitchChannels != this._doc.song.pitchChannelCount || this._renderedNoiseChannels != this._doc.song.noiseChannelCount) {
				for (let y: number = 0; y < this._doc.song.getChannelCount(); y++) {
					if (y < this._doc.song.pitchChannelCount) {
						let val: number = (y + 1);
						this._channelCounts[y].textContent = val + "";
						this._channelCounts[y].style.fontSize = (val >= 10) ? "xx-small" : "inherit";
					}
					else if (y < this._doc.song.pitchChannelCount + this._doc.song.noiseChannelCount) {
						let val: number = (y - this._doc.song.pitchChannelCount + 1);
						this._channelCounts[y].textContent = val + "";
						this._channelCounts[y].style.fontSize = (val >= 10) ? "xx-small" : "inherit";
					}
					else {
						let val: number = (y - this._doc.song.pitchChannelCount - this._doc.song.noiseChannelCount + 1);
						this._channelCounts[y].textContent = val + "";
						this._channelCounts[y].style.fontSize = (val >= 10) ? "xx-small" : "inherit";
					}
				}
				this._renderedPitchChannels = this._doc.song.pitchChannelCount;
				this._renderedNoiseChannels = this._doc.song.noiseChannelCount;
				this._renderedModChannels = this._doc.song.modChannelCount;
			}

			if (this._renderedChannelHeight != channelHeight || this._renderedChannelCount != this._doc.song.getChannelCount()) {
				this._renderedChannelHeight = channelHeight;
				this._renderedChannelCount = this._doc.song.getChannelCount();
				this._editorHeight = Config.barEditorHeight + this._doc.song.getChannelCount() * channelHeight;
				this.container.style.height = this._editorHeight + "px";
			}
		}
	}
}
