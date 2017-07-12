/*
Copyright (C) 2012 John Nesky

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
/// <reference path="changes.ts" />
/// <reference path="SongEditor.ts" />

module beepbox {
	const {button, div, span, input, br, text} = html;
	
	export class SongDurationPrompt {
		private readonly _beatsStepper: HTMLInputElement = input({style: "width: 3em; margin-left: 1em;", type: "number", min: "1", max: "128", step: "1"});
		private readonly _barsStepper: HTMLInputElement = input({style: "width: 3em; margin-left: 1em;", type: "number", min: "1", max: "128", step: "1"});
		private readonly _patternsStepper: HTMLInputElement = input({style: "width: 3em; margin-left: 1em;", type: "number", min: "1", max: "32", step: "1"});
		private readonly _instrumentsStepper: HTMLInputElement = input({style: "width: 3em; margin-left: 1em;", type: "number", min: "1", max: "10", step: "1"});
		private readonly _okayButton: HTMLButtonElement = button({style: "width:45%;"}, [text("Okay")]);
		private readonly _cancelButton: HTMLButtonElement = button({style: "width:45%;"}, [text("Cancel")]);
		
		public readonly container: HTMLDivElement = div({className: "prompt", style: "width: 250px;"}, [
			div({style: "font-size: 2em"}, [text("Custom Song Size")]),
			div({style: "display: flex; flex-direction: row; align-items: center; height: 2em; justify-content: flex-end;"}, [
				div({style: "text-align: right;"}, [
					text("Beats per bar:"),
					br(),
					span({style: "font-size: smaller; color: #888888;"}, [text("(Multiples of 3 or 4 are recommended)")]),
				]),
				this._beatsStepper,
			]),
			div({style: "display: flex; flex-direction: row; align-items: center; height: 2em; justify-content: flex-end;"}, [
				div({style: "display: inline-block; text-align: right;"}, [
					text("Bars per song:"),
					br(),
					span({style: "font-size: smaller; color: #888888;"}, [text("(Multiples of 2 or 4 are recommended)")]),
				]),
				this._barsStepper,
			]),
			div({style: "display: flex; flex-direction: row; align-items: center; height: 2em; justify-content: flex-end;"}, [
				text("Patterns per channel:"),
				this._patternsStepper,
			]),
			div({style: "display: flex; flex-direction: row; align-items: center; height: 2em; justify-content: flex-end;"}, [
				text("Instruments per channel:"),
				this._instrumentsStepper,
			]),
			div({style: "display: flex; flex-direction: row; justify-content: space-between;"}, [
				this._okayButton,
				this._cancelButton,
			]),
		]);
		
		constructor(private _doc: SongDocument, private _songEditor: SongEditor) {
			this._beatsStepper.value = this._doc.song.beats + "";
			this._beatsStepper.min = Music.beatsMin + "";
			this._beatsStepper.max = Music.beatsMax + "";
			
			this._barsStepper.value = this._doc.song.bars + "";
			this._barsStepper.min = Music.barsMin + "";
			this._barsStepper.max = Music.barsMax + "";
			
			this._patternsStepper.value = this._doc.song.patterns + "";
			this._patternsStepper.min = Music.patternsMin + "";
			this._patternsStepper.max = Music.patternsMax + "";
			
			this._instrumentsStepper.value = this._doc.song.instruments + "";
			this._instrumentsStepper.min = Music.instrumentsMin + "";
			this._instrumentsStepper.max = Music.instrumentsMax + "";
			
			this._okayButton.addEventListener("click", this._saveChanges);
			this._cancelButton.addEventListener("click", this._onClose);
			this._beatsStepper.addEventListener("keypress", SongDurationPrompt._validateKey);
			this._barsStepper.addEventListener("keypress", SongDurationPrompt._validateKey);
			this._patternsStepper.addEventListener("keypress", SongDurationPrompt._validateKey);
			this._instrumentsStepper.addEventListener("keypress", SongDurationPrompt._validateKey);
			this._beatsStepper.addEventListener("blur", SongDurationPrompt._validateNumber);
			this._barsStepper.addEventListener("blur", SongDurationPrompt._validateNumber);
			this._patternsStepper.addEventListener("blur", SongDurationPrompt._validateNumber);
			this._instrumentsStepper.addEventListener("blur", SongDurationPrompt._validateNumber);
		}
		
		private _onClose = (): void => { 
			this._songEditor.closePrompt(this);
			this._okayButton.removeEventListener("click", this._saveChanges);
			this._cancelButton.removeEventListener("click", this._onClose);
			this._beatsStepper.removeEventListener("keypress", SongDurationPrompt._validateKey);
			this._barsStepper.removeEventListener("keypress", SongDurationPrompt._validateKey);
			this._patternsStepper.removeEventListener("keypress", SongDurationPrompt._validateKey);
			this._instrumentsStepper.removeEventListener("keypress", SongDurationPrompt._validateKey);
			this._beatsStepper.removeEventListener("blur", SongDurationPrompt._validateNumber);
			this._barsStepper.removeEventListener("blur", SongDurationPrompt._validateNumber);
			this._patternsStepper.removeEventListener("blur", SongDurationPrompt._validateNumber);
			this._instrumentsStepper.removeEventListener("blur", SongDurationPrompt._validateNumber);
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
			group.append(new ChangeBeats(this._doc, SongDurationPrompt._validate(this._beatsStepper)));
			group.append(new ChangeBars(this._doc, SongDurationPrompt._validate(this._barsStepper)));
			group.append(new ChangePatterns(this._doc, SongDurationPrompt._validate(this._patternsStepper)));
			group.append(new ChangeInstruments(this._doc, SongDurationPrompt._validate(this._instrumentsStepper)));
			this._doc.history.record(group);
			this._onClose();
		}
	}
}
