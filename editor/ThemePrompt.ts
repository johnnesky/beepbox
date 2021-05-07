// Copyright (C) 2020 John Nesky, distributed under the MIT license.

import { HTML } from "imperative-html/dist/esm/elements-strict";
import { Prompt } from "./Prompt";
import { SongDocument } from "./SongDocument";
import { ColorConfig } from "./ColorConfig";

//namespace beepbox {
const { button, div, h2, select, option } = HTML;

export class ThemePrompt implements Prompt {
	private readonly _themeSelect: HTMLSelectElement = select({ style: "width: 100%;" },
		option({ value: "dark classic" }, "BeepBox Dark"),
		option({ value: "light classic" }, "BeepBox Light"),
		option({ value: "dark competition" }, "BeepBox Competition Dark"),
		option({ value: "jummbox classic" }, "JummBox Dark"),
		// option({ value: "jummbox light" }, "JummBox Light"), // It's not ready to see the world yet...
		option({ value: "forest" }, "Forest"),
		option({ value: "canyon" }, "Canyon"),
		option({ value: "midnight"}, "Midnight"),
	);
	private readonly _cancelButton: HTMLButtonElement = button({ class: "cancelButton" });
	private readonly _okayButton: HTMLButtonElement = button({ class: "okayButton", style: "width:45%;" }, "Okay");

	public readonly container: HTMLDivElement = div({ class: "prompt noSelection", style: "width: 220px;" },
		h2("Set Theme"),
		div({ style: "display: flex; flex-direction: row; align-items: center; height: 2em; justify-content: flex-end;" },
			div({ class: "selectContainer", style: "width: 100%;" }, this._themeSelect),
		),
		div({ style: "display: flex; flex-direction: row-reverse; justify-content: space-between;" },
			this._okayButton,
		),
		this._cancelButton,
	);

	constructor(private _doc: SongDocument) {

		const lastTheme: string | null = window.localStorage.getItem("colorTheme");
		if (lastTheme != null) {
			this._themeSelect.value = lastTheme;
		}
		this._okayButton.addEventListener("click", this._saveChanges);
		this._cancelButton.addEventListener("click", this._close);
		this.container.addEventListener("keydown", this._whenKeyPressed);
	}

	private _close = (): void => {
		this._doc.undo();
	}

	public cleanUp = (): void => {
		this._okayButton.removeEventListener("click", this._saveChanges);
		this._cancelButton.removeEventListener("click", this._close);
		this.container.removeEventListener("keydown", this._whenKeyPressed);
	}

	private _whenKeyPressed = (event: KeyboardEvent): void => {
		if ((<Element>event.target).tagName != "BUTTON" && event.keyCode == 13) { // Enter key
			this._saveChanges();
		}
	}

	private _saveChanges = (): void => {
		window.localStorage.setItem("colorTheme", this._themeSelect.value);
		this._doc.prompt = null;
		this._doc.colorTheme = this._themeSelect.value;
		ColorConfig.setTheme(this._themeSelect.value);
		this._doc.undo();
	}
}
//}
