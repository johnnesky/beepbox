/*
Copyright (C) 2019 John Nesky

Permission is hereby granted, free of charge, to any person obtaining a copy of 
this software and associated documentation files (the "Software"), to deal in 
the Software without restriction, including without limitation the rights to 
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies 
of the Software, and to permit persons to whom the Software is furnished to do 
so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all 
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR 
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, 
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE 
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER 
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, 
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE 
SOFTWARE.
*/

/// <reference path="synth.ts" />
/// <reference path="html.ts" />
/// <reference path="SongDocument.ts" />
/// <reference path="Prompt.ts" />
/// <reference path="changes.ts" />

namespace beepbox {
	const {button, div, span, input, br, text, select, option} = html;
	
	export class SongDurationPrompt implements Prompt {
		private readonly _barsStepper: HTMLInputElement = input({style: "width: 3em; margin-left: 1em;", type: "number", step: "1"});
		private readonly _positionSelect: HTMLSelectElement = select({style: "width: 100%;"}, [
			option("end",       "Apply change at end of song."),
			option("beginning", "Apply change at beginning of song."),
		]);
		private readonly _okayButton: HTMLButtonElement = button({style: "width:45%;"}, [text("Okay")]);
		private readonly _cancelButton: HTMLButtonElement = button({style: "width:45%;"}, [text("Cancel")]);
		
		public readonly container: HTMLDivElement = div({className: "prompt", style: "width: 250px;"}, [
			div({style: "font-size: 2em"}, [text("Song Length")]),
			div({style: "display: flex; flex-direction: row; align-items: center; height: 2em; justify-content: flex-end;"}, [
				div({style: "display: inline-block; text-align: right;"}, [
					text("Bars per song:"),
					br(),
					span({style: "font-size: smaller; color: #888888;"}, [text("(Multiples of 4 are recommended)")]),
				]),
				this._barsStepper,
			]),
			div({style: "display: flex; flex-direction: row; align-items: center; height: 2em; justify-content: flex-end;"}, [
				div({className: "selectContainer", style: "width: 100%;"}, [this._positionSelect]),
			]),
			div({style: "display: flex; flex-direction: row; justify-content: space-between;"}, [
				this._okayButton,
				this._cancelButton,
			]),
		]);
		
		constructor(private _doc: SongDocument, private _songEditor: SongEditor) {
			this._barsStepper.value = this._doc.song.barCount + "";
			this._barsStepper.min = Config.barCountMin + "";
			this._barsStepper.max = Config.barCountMax + "";
			
			this._okayButton.addEventListener("click", this._saveChanges);
			this._cancelButton.addEventListener("click", this._close);
			this._barsStepper.addEventListener("keypress", SongDurationPrompt._validateKey);
			this._barsStepper.addEventListener("blur", SongDurationPrompt._validateNumber);
		}
		
		private _close = (): void => { 
			this._doc.undo();
		}
		
		public cleanUp = (): void => {
			this._okayButton.removeEventListener("click", this._saveChanges);
			this._cancelButton.removeEventListener("click", this._close);
			this._barsStepper.removeEventListener("keypress", SongDurationPrompt._validateKey);
			this._barsStepper.removeEventListener("blur", SongDurationPrompt._validateNumber);
		}
		
		private static _validateKey(event: KeyboardEvent): boolean {
			const charCode = (event.which) ? event.which : event.keyCode;
			if (charCode != 46 && charCode > 31 && (charCode < 48 || charCode > 57)) {
				event.preventDefault();
				return true;
			}
			return false;
		}
		
		private static _validateNumber(event: Event): void {
			const input: HTMLInputElement = <HTMLInputElement>event.target;
			input.value = Math.floor(Math.max(Number(input.min), Math.min(Number(input.max), Number(input.value)))) + "";
		}
		
		private static _validate(input: HTMLInputElement): number {
			return Math.floor(Number(input.value));
		}
		
		private _saveChanges = (): void => {
			const group: ChangeGroup = new ChangeGroup();
			group.append(new ChangeBarCount(this._doc, SongDurationPrompt._validate(this._barsStepper), this._positionSelect.value == "beginning"));
			this._doc.prompt = null;
			this._doc.record(group, true);
		}
	}
}
