// Copyright (C) 2020 John Nesky, distributed under the MIT license.

import { SongDocument } from "./SongDocument";
import { HTML } from "imperative-html/dist/esm/elements-strict";
import { ColorConfig } from "./ColorConfig";
import { InputBox } from "./HTMLWrapper";
import { ChangeChannelOrder, ChangeChannelName, ChangeChannelCount, ChangeRemoveChannel } from "./changes";
import { Config } from "../synth/SynthConfig";
import { SongEditor } from "./SongEditor";

//namespace beepbox {
export class MuteEditor {
	
	private _cornerFiller: HTMLDivElement = HTML.div({style: `background: ${ColorConfig.editorBackground}; position: sticky; bottom: 0; left: 0; width: 32px; height: 30px;`});
	
	private readonly _buttons: HTMLDivElement[] = [];
	private readonly _channelCounts: HTMLDivElement[] = [];
	private readonly _channelNameDisplay: HTMLDivElement = HTML.div({ style: `background-color: ${ColorConfig.uiWidgetFocus}; white-space:nowrap; display: none; transform:translate(20px); width: auto; pointer-events: none; position: absolute; border-radius: 0.2em; z-index: 2;`, "color": ColorConfig.primaryText }, "");
	public readonly _channelNameInput: InputBox = new InputBox(HTML.input({ style: `color: ${ColorConfig.primaryText}; background-color: ${ColorConfig.uiWidgetFocus}; margin-top: -2px; display: none; width: 6em; position: absolute; border-radius: 0.2em; z-index: 2;`, "color": ColorConfig.primaryText }, ""), this._doc, (oldValue: string, newValue: string) => new ChangeChannelName(this._doc, oldValue, newValue));

	private readonly _channelDropDown: HTMLSelectElement = HTML.select({ style: "width: 0px; left: 19px; height: 19px; position:absolute; opacity:0" },

		HTML.option({ value: "rename" }, "Rename..."),
		HTML.option({ value: "chnUp" }, "Move Channel Up"),
		HTML.option({ value: "chnDown" }, "Move Channel Down"),
		HTML.option({ value: "chnMute" }, "Mute Channel"),
		HTML.option({ value: "chnSolo" }, "Solo Channel"),
		HTML.option({ value: "chnInsert" }, "Insert Channel Below"),
		HTML.option({ value: "chnDelete" }, "Delete This Channel"),
	);

	public readonly container: HTMLElement = HTML.div({ class: "muteEditor", style: "position: sticky; padding-top: " + Config.barEditorHeight + "px;" }, this._channelNameDisplay, this._channelNameInput.input, this._channelDropDown);

	private _editorHeight: number = 128;
	private _renderedChannelCount: number = 0;
	private _renderedPitchChannels: number = 0;
	private _renderedNoiseChannels: number = 0;
	private _renderedModChannels: number = 0;
	private _renderedChannelHeight: number = -1;
	private _channelDropDownChannel: number = 0;
	private _channelDropDownOpen: boolean = false;
	private _channelDropDownLastState: boolean = false;

	constructor(private _doc: SongDocument, private _editor: SongEditor) {
		this.container.addEventListener("click", this._onClick);
		this.container.addEventListener("mousemove", this._onMouseMove);
		this.container.addEventListener("mouseleave", this._onMouseLeave);

		this._channelDropDown.selectedIndex = -1;
		this._channelDropDown.addEventListener("change", this._channelDropDownHandler);
		this._channelDropDown.addEventListener("mousedown", this._channelDropDownGetOpenedPosition);
		this._channelDropDown.addEventListener("blur", this._channelDropDownBlur);
		this._channelDropDown.addEventListener("click", this._channelDropDownClick);

		this._channelNameInput.input.addEventListener("change", this._channelNameInputHide);
		this._channelNameInput.input.addEventListener("blur", this._channelNameInputHide);
		this._channelNameInput.input.addEventListener("mousedown", this._channelNameInputClicked);
		this._channelNameInput.input.addEventListener("input", this._channelNameInputWhenInput);
	}

	private _channelNameInputWhenInput = (): void => {
		let newValue = this._channelNameInput.input.value;
		if (newValue.length > 15) {
			this._channelNameInput.input.value = newValue.substring(0, 15);
		}
	}

	private _channelNameInputClicked = (event: MouseEvent): void => {
		event.stopPropagation();
	}

	private _channelNameInputHide = (): void => {
		this._channelNameInput.input.style.setProperty("display", "none");
		this._channelNameDisplay.style.setProperty("display", "none");
	}

	private _channelDropDownClick = (event: MouseEvent): void => {
		this._channelDropDownOpen = !this._channelDropDownLastState;
		this._channelDropDownGetOpenedPosition(event);
		//console.log("click " + this._channelDropDownOpen);
	}

	private _channelDropDownBlur = (): void => {
		this._channelDropDownOpen = false;
		this._channelNameDisplay.style.setProperty("display", "none");
		//console.log("blur " + this._channelDropDownOpen);
	}

	private _channelDropDownGetOpenedPosition = (event: MouseEvent): void => {

		this._channelDropDownLastState = this._channelDropDownOpen;

		this._channelDropDownChannel = Math.floor(Math.min(this._renderedChannelCount, Math.max(0, parseInt(this._channelDropDown.style.getPropertyValue("top")) / this._renderedChannelHeight)));
		this._doc.muteEditorChannel = this._channelDropDownChannel;

		this._channelNameDisplay.style.setProperty("display", "");

		// Check if channel is at limit, in which case another can't be inserted
		if ((this._channelDropDownChannel < this._doc.song.pitchChannelCount && this._doc.song.pitchChannelCount == Config.pitchChannelCountMax)
			|| (this._channelDropDownChannel >= this._doc.song.pitchChannelCount && this._channelDropDownChannel < this._doc.song.pitchChannelCount + this._doc.song.noiseChannelCount && this._doc.song.noiseChannelCount == Config.noiseChannelCountMax)
			|| (this._channelDropDownChannel >= this._doc.song.pitchChannelCount + this._doc.song.noiseChannelCount && this._doc.song.modChannelCount == Config.modChannelCountMax)) {
			this._channelDropDown.options[5].disabled = true;
		}
		else {
			this._channelDropDown.options[5].disabled = false;
		}

		// Also check if a channel is eligible to move up or down based on the song's channel settings.
		if (this._channelDropDownChannel == 0 || this._channelDropDownChannel == this._doc.song.pitchChannelCount || this._channelDropDownChannel == this._doc.song.pitchChannelCount + this._doc.song.noiseChannelCount) {
			this._channelDropDown.options[1].disabled = true;
		}
		else {
			this._channelDropDown.options[1].disabled = false;
		}
		if (this._channelDropDownChannel == this._doc.song.pitchChannelCount - 1 || this._channelDropDownChannel == this._doc.song.pitchChannelCount + this._doc.song.noiseChannelCount - 1 || this._channelDropDownChannel == this._doc.song.getChannelCount() - 1) {
			this._channelDropDown.options[2].disabled = true;
		}
		else {
			this._channelDropDown.options[2].disabled = false;
		}

		// Also, can't delete the last pitch channel.
		if (this._doc.song.pitchChannelCount == 1 && this._channelDropDownChannel == 0) {
			this._channelDropDown.options[6].disabled = true;
		}
		else {
			this._channelDropDown.options[6].disabled = false;
		}
	}

	private _channelDropDownHandler = (event: Event): void => {
		this._channelNameDisplay.style.setProperty("display", "none");
		this._channelDropDown.style.setProperty("display", "none");
		this._channelDropDownOpen = false;
		event.stopPropagation();
		//console.log("handler " + this._channelDropDownOpen);

		switch (this._channelDropDown.value) {
			case "rename":
				this._channelNameInput.input.style.setProperty("display", "");
				this._channelNameInput.input.style.setProperty("transform", this._channelNameDisplay.style.getPropertyValue("transform"));
				if (this._channelNameDisplay.textContent != null) {
					this._channelNameInput.input.value = this._channelNameDisplay.textContent;
				}
				else {
					this._channelNameInput.input.value = "";
				}
				this._channelNameInput.input.select();
				break;
			case "chnUp":
				this._doc.record(new ChangeChannelOrder(this._doc, this._channelDropDownChannel, this._channelDropDownChannel, -1));
				break;
			case "chnDown":
				this._doc.record(new ChangeChannelOrder(this._doc, this._channelDropDownChannel, this._channelDropDownChannel, 1));
				break;
			case "chnMute":
				this._doc.song.channels[this._channelDropDownChannel].muted = !this._doc.song.channels[this._channelDropDownChannel].muted;
				this.render();
				break;
			case "chnSolo": {
				// Check for any channel not matching solo pattern
				let shouldSolo: boolean = false;
				for (let channel: number = 0; channel < this._doc.song.pitchChannelCount + this._doc.song.noiseChannelCount; channel++) {
					if (this._doc.song.channels[channel].muted == (channel == this._channelDropDownChannel)) {
						shouldSolo = true;
						channel = this._doc.song.pitchChannelCount + this._doc.song.noiseChannelCount;
					}
				}
				if (shouldSolo) {
					for (let channel: number = 0; channel < this._doc.song.pitchChannelCount + this._doc.song.noiseChannelCount; channel++) {
						this._doc.song.channels[channel].muted = (channel != this._channelDropDownChannel);
					}
				}
				else {
					for (let channel: number = 0; channel < this._doc.song.pitchChannelCount + this._doc.song.noiseChannelCount; channel++) {
						this._doc.song.channels[channel].muted = false;
					}
				}
				this.render();
				break;
			}
			case "chnInsert": {
				// Add a channel at the end, then swap it in.
				let newPitchChannelCount: number = this._doc.song.pitchChannelCount;
				let newNoiseChannelCount: number = this._doc.song.noiseChannelCount;
				let newModChannelCount: number = this._doc.song.modChannelCount;
				let swapIndex: number;

				if (this._channelDropDownChannel < this._doc.song.pitchChannelCount) {
					newPitchChannelCount++;
					swapIndex = newPitchChannelCount;
				}
				else if (this._channelDropDownChannel < this._doc.song.pitchChannelCount + this._doc.song.noiseChannelCount) {
					newNoiseChannelCount++;
					swapIndex = newPitchChannelCount + newNoiseChannelCount;
				}
				else {
					newModChannelCount++;
					swapIndex = newPitchChannelCount + newNoiseChannelCount + newModChannelCount;
				}

				this._doc.record(new ChangeChannelCount(this._doc, newPitchChannelCount, newNoiseChannelCount, newModChannelCount));

				for (let channel: number = swapIndex - 1; channel > this._channelDropDownChannel + 1; channel--) {
					this._doc.record(new ChangeChannelOrder(this._doc, channel, channel, -1), true);
				}
				break;
			}
			case "chnDelete": {
				this._doc.record(new ChangeRemoveChannel(this._doc, this._channelDropDownChannel, this._channelDropDownChannel));

				break;
			}
		}
		if (this._channelDropDown.value != "rename")
			this._editor.refocusStage();

		this._channelDropDown.selectedIndex = -1;
	}

	private _onClick = (event: MouseEvent): void => {

		const index = this._buttons.indexOf(<HTMLDivElement>event.target);
		if (index == -1) return;
		let xPos: number = event.clientX - this._buttons[0].getBoundingClientRect().left;
		if (xPos < 21.0) {
			this._doc.song.channels[index].muted = !this._doc.song.channels[index].muted;
		}
		this._doc.notifier.changed();
	}

	private _onMouseMove = (event: MouseEvent): void => {
		const index = this._buttons.indexOf(<HTMLDivElement>event.target);
		if (index == -1) {
			if (!this._channelDropDownOpen && event.target != this._channelNameDisplay && event.target != this._channelDropDown) {
				this._channelNameDisplay.style.setProperty("display", "none");
				this._channelDropDown.style.setProperty("display", "none");
				this._channelDropDown.style.setProperty("width", "0px");
			}
			return;
		}
		let xPos: number = event.clientX - this._buttons[0].getBoundingClientRect().left;
		if (xPos >= 21.0) {
			if (!this._channelDropDownOpen) {
				// Mouse over chn. number
				this._channelDropDown.style.setProperty("display", "");
				var height = this._doc.getChannelHeight();
				this._channelNameDisplay.style.setProperty("transform", "translate(20px, " + (height / 4 + height * index) + "px)");

				if (this._doc.song.channels[index].name != "") {
					this._channelNameDisplay.textContent = this._doc.song.channels[index].name;
					this._channelNameDisplay.style.setProperty("display", "");
				}
				else {
					if (index < this._doc.song.pitchChannelCount) {
						this._channelNameDisplay.textContent = "Pitch " + (index + 1);
					} else if (index < this._doc.song.pitchChannelCount + this._doc.song.noiseChannelCount) {
						this._channelNameDisplay.textContent = "Noise " + (index - this._doc.song.pitchChannelCount + 1);
					}
					else {
						this._channelNameDisplay.textContent = "Mod " + (index - this._doc.song.pitchChannelCount - this._doc.song.noiseChannelCount + 1);
					}
					// The name set will only show up when this becomes visible, e.g. when the dropdown is opened.
					this._channelNameDisplay.style.setProperty("display", "none");
				}

				this._channelDropDown.style.top = (Config.barEditorHeight + 2 + index * this._renderedChannelHeight) + "px";
				this._channelDropDown.style.setProperty("width", "15px");
			}
		}
		else {
			if (!this._channelDropDownOpen) {
				this._channelNameDisplay.style.setProperty("display", "none");
				this._channelDropDown.style.setProperty("display", "none");
				this._channelDropDown.style.setProperty("width", "0px");
			}
		}
	}

	private _onMouseLeave = (event: MouseEvent): void => {
		if (!this._channelDropDownOpen) {
			this._channelNameDisplay.style.setProperty("display", "none");
			this._channelDropDown.style.setProperty("width", "0px");
		}
	}

	public onKeyUp(event: KeyboardEvent): void {
		switch (event.keyCode) {
			case 27: // esc
				this._channelDropDownOpen = false;
				//console.log("close");
				this._channelNameDisplay.style.setProperty("display", "none");
				break;
			case 13: // enter
				this._channelDropDownOpen = false;
				//console.log("close");
				this._channelNameDisplay.style.setProperty("display", "none");
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
				const muteButton: HTMLDivElement = HTML.div({ class: "mute-button", title: "Mute (M), Mute All (⇧M), Solo (S), Exclude (⇧S)", style: `display: block; pointer-events: none; width: 16px; height: 20px; transform: translate(2px, 1px);` });

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

			this.container.appendChild(this._cornerFiller);
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
			this._channelNameDisplay.style.setProperty("display", "none");
			this.container.style.height = (this._editorHeight + 16) + "px";

			if (this._renderedChannelHeight < 27) {
				this._channelNameDisplay.style.setProperty("margin-top", "-2px");
				this._channelDropDown.style.setProperty("margin-top", "-4px");
				this._channelNameInput.input.style.setProperty("margin-top", "-4px");

			}
			else if (this._renderedChannelHeight < 30) {
				this._channelNameDisplay.style.setProperty("margin-top", "-1px");
				this._channelDropDown.style.setProperty("margin-top", "-3px");
				this._channelNameInput.input.style.setProperty("margin-top", "-3px");
			}
			else {
				this._channelNameDisplay.style.setProperty("margin-top", "0px");
				this._channelDropDown.style.setProperty("margin-top", "0px");
				this._channelNameInput.input.style.setProperty("margin-top", "-2px");
			}
		}
	}
}
//}
