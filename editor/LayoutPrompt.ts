// Copyright (C) 2020 John Nesky, distributed under the MIT license.

import { HTML } from "imperative-html/dist/esm/elements-strict";
import { Layout } from "./Layout";
import { Prompt } from "./Prompt";
import { SongDocument } from "./SongDocument";
import { Config } from "../synth/SynthConfig";

//namespace beepbox {
const { button, div, h2, input, select, option } = HTML;

export class LayoutPrompt implements Prompt {
	private readonly _octaveStepper: HTMLInputElement = input({ style: "width: 3em; margin-left: 1em;", type: "number", step: "1", value: "0" });
	private readonly _layoutSelect: HTMLSelectElement = select({ style: "width: 100%;" },
		option({ value: "normal" }, "Normal Layout"),
		option({ value: "fullscreen" }, "Full-screen Layout"),
		option({ value: "widefullscreen" }, "Wide Full-screen Layout"),
	);
	private readonly _cancelButton: HTMLButtonElement = button({ class: "cancelButton" });
	private readonly _okayButton: HTMLButtonElement = button({ class: "okayButton", style: "width:45%;" }, "Okay");

	public readonly container: HTMLDivElement = div({ class: "prompt noSelection", style: "width: 250px;" },
		h2("Set Layout"),
		div({ style: "display: flex; flex-direction: row; align-items: center; height: 2em; justify-content: flex-end;" },
			div({ style: "text-align: right;" },
				"Extra View Octaves:",
			),
			this._octaveStepper,
		),
		div({ style: "display: flex; flex-direction: row; align-items: center; height: 2em; justify-content: flex-end;" },
			div({ class: "selectContainer", style: "width: 100%;" }, this._layoutSelect),
		),
		div({ style: "display: flex; flex-direction: row-reverse; justify-content: space-between;" },
			this._okayButton,
		),
		this._cancelButton,
	);

	constructor(private _doc: SongDocument) {
		this._octaveStepper.min = "0";
		this._octaveStepper.max = "2";
		const lastOctaves: string | null = window.localStorage.getItem("extraOctaves");
		if (lastOctaves != null) {
			this._octaveStepper.value = lastOctaves;
		}

		const lastLayout: string | null = window.localStorage.getItem("fullScreen");
		if (lastLayout != null) {
			this._layoutSelect.value = lastLayout;
		}

		this._octaveStepper.select();
		setTimeout(() => this._octaveStepper.focus());

		this._okayButton.addEventListener("click", this._saveChanges);
		this._cancelButton.addEventListener("click", this._close);
		this._octaveStepper.addEventListener("blur", LayoutPrompt._validateNumber);
		this.container.addEventListener("keydown", this._whenKeyPressed);
	}

	private _close = (): void => {
		this._doc.undo();
	}

	public cleanUp = (): void => {
		this._okayButton.removeEventListener("click", this._saveChanges);
		this._cancelButton.removeEventListener("click", this._close);
		this._octaveStepper.removeEventListener("blur", LayoutPrompt._validateNumber);
		this.container.removeEventListener("keydown", this._whenKeyPressed);
	}

	private _whenKeyPressed = (event: KeyboardEvent): void => {
		if ((<Element>event.target).tagName != "BUTTON" && event.keyCode == 13) { // Enter key
			this._saveChanges();
		}
	}

	private static _validateNumber(event: Event): void {
		const input: HTMLInputElement = <HTMLInputElement>event.target;
		let value: number = +input.value;
		input.value = Math.max(+input.min, Math.min(+input.max, value)) + "";
	}

	private _saveChanges = (): void => {
		window.localStorage.setItem("fullScreen", this._layoutSelect.value);
		window.localStorage.setItem("extraOctaves", this._octaveStepper.value);
		this._doc.prompt = null;
		this._doc.fullScreen = this._layoutSelect.value;
		Layout.setFullScreen(this._doc.fullScreen);
		this._doc.windowOctaves = 3 + (+(window.localStorage.getItem("extraOctaves") || "0"));
		this._doc.scrollableOctaves = Config.pitchOctaves - this._doc.windowOctaves;
		this._doc.windowPitchCount = this._doc.windowOctaves * Config.pitchesPerOctave + 1;
		this._doc.undo();
	}
}
//}
