// Copyright (C) 2021 John Nesky, distributed under the MIT license.

import { Config } from "../synth/SynthConfig";
import { HTML } from "imperative-html/dist/esm/elements-strict";
import { SongDocument } from "./SongDocument";
import { Prompt } from "./Prompt";
import { ChangeMoveNotesSideways } from "./changes";
import { ColorConfig } from "./ColorConfig";

	const {button, div, span, h2, input, br, select, option} = HTML;

export class MoveNotesSidewaysPrompt implements Prompt {
		private readonly _beatsStepper: HTMLInputElement = input({style: "width: 3em; margin-left: 1em;", type: "number", step: "0.01", value: "0"});
		private readonly _conversionStrategySelect: HTMLSelectElement = select({style: "width: 100%;"},
			option({value: "overflow"}, "Overflow notes across bars."),
			option({value: "wrapAround"}, "Wrap notes around within bars."),
	);
		private readonly _cancelButton: HTMLButtonElement = button({class: "cancelButton"});
		private readonly _okayButton: HTMLButtonElement = button({class: "okayButton", style: "width:45%;"}, "Okay");
		
		public readonly container: HTMLDivElement = div({class: "prompt noSelection", style: "width: 250px;"},
		h2("Move Notes Sideways"),
			div({style: "display: flex; flex-direction: row; align-items: center; height: 2em; justify-content: flex-end;"},
				div({style: "text-align: right;"},
				"Beats to move:",
				br(),
					span({style: `font-size: smaller; color: ${ColorConfig.secondaryText};`}, "(Negative is left, positive is right)"),
			),
			this._beatsStepper,
		),
			div({style: "display: flex; flex-direction: row; align-items: center; height: 2em; justify-content: flex-end;"},
				div({class: "selectContainer", style: "width: 100%;"}, this._conversionStrategySelect),
		),
			div({style: "display: flex; flex-direction: row-reverse; justify-content: space-between;"},
			this._okayButton,
		),
		this._cancelButton,
	);
		
	constructor(private _doc: SongDocument) {
		this._beatsStepper.min = (-this._doc.song.beatsPerBar) + "";
		this._beatsStepper.max = this._doc.song.beatsPerBar + "";
			
		const lastStrategy: string | null = window.localStorage.getItem("moveNotesSidewaysStrategy");
		if (lastStrategy != null) {
			this._conversionStrategySelect.value = lastStrategy;
		}
			
		this._beatsStepper.select();
		setTimeout(() => this._beatsStepper.focus(), 100); // Add 100ms because the key macro (W) gets captured by the stepper...
			
		this._okayButton.addEventListener("click", this._saveChanges);
		this._cancelButton.addEventListener("click", this._close);
		this._beatsStepper.addEventListener("blur", MoveNotesSidewaysPrompt._validateNumber);
		this.container.addEventListener("keydown", this._whenKeyPressed);
	}
		
		private _close = (): void => { 
		this._doc.undo();
	}
		
		public cleanUp = (): void => { 
		this._okayButton.removeEventListener("click", this._saveChanges);
		this._cancelButton.removeEventListener("click", this._close);
		this._beatsStepper.removeEventListener("blur", MoveNotesSidewaysPrompt._validateNumber);
		this.container.removeEventListener("keydown", this._whenKeyPressed);
	}
		
	private _whenKeyPressed = (event: KeyboardEvent): void => {
			if ((<Element> event.target).tagName != "BUTTON" && event.keyCode == 13) { // Enter key
			this._saveChanges();
		}
	}
		
	private static _validateNumber(event: Event): void {
		const input: HTMLInputElement = <HTMLInputElement>event.target;
		let value: number = +input.value;
		value = Math.round(value * Config.partsPerBeat) / Config.partsPerBeat;
		value = Math.round(value * 100) / 100;
		input.value = Math.max(+input.min, Math.min(+input.max, value)) + "";
	}
		
	private _saveChanges = (): void => {
		window.localStorage.setItem("moveNotesSidewaysStrategy", this._conversionStrategySelect.value);
		this._doc.prompt = null;
		this._doc.record(new ChangeMoveNotesSideways(this._doc, +this._beatsStepper.value, this._conversionStrategySelect.value), true);
	}
}
