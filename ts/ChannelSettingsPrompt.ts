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
	const {button, div, span, input, br} = HTML;
	
	export class ChannelSettingsPrompt implements Prompt {
		private readonly _patternsStepper: HTMLInputElement = input({style: "width: 3em; margin-left: 1em;", type: "number", step: "1"});
		private readonly _instrumentsStepper: HTMLInputElement = input({style: "width: 3em; margin-left: 1em;", type: "number", step: "1"});
		private readonly _pitchChannelStepper: HTMLInputElement = input({style: "width: 3em; margin-left: 1em;", type: "number", step: "1"});
		private readonly _drumChannelStepper: HTMLInputElement = input({style: "width: 3em; margin-left: 1em;", type: "number", step: "1"});
		private readonly _cancelButton: HTMLButtonElement = button({className: "cancelButton", style: "width:45%;"}, "Cancel");
		private readonly _okayButton: HTMLButtonElement = button({className: "okayButton", style: "width:45%;"}, "Okay");
		
		public readonly container: HTMLDivElement = div({className: "prompt", style: "width: 250px;"},
			div({style: "font-size: 2em"}, "Channel Settings"),
			div({style: "display: flex; flex-direction: row; align-items: center; height: 2em; justify-content: flex-end;"},
				"Pitch channels:",
				this._pitchChannelStepper,
			),
			div({style: "display: flex; flex-direction: row; align-items: center; height: 2em; justify-content: flex-end;"},
				"Drum channels:",
				this._drumChannelStepper,
			),
			div({style: "display: flex; flex-direction: row; align-items: center; height: 2em; justify-content: flex-end;"},
				"Patterns per channel:",
				this._patternsStepper,
			),
			div({style: "display: flex; flex-direction: row; align-items: center; height: 2em; justify-content: flex-end;"},
				"Instruments per channel:",
				this._instrumentsStepper,
			),
			div({style: "display: flex; flex-direction: row; justify-content: space-between;"},
				this._cancelButton,
				this._okayButton,
			),
		);
		
		constructor(private _doc: SongDocument, private _songEditor: SongEditor) {
			this._patternsStepper.value = this._doc.song.patternsPerChannel + "";
			this._patternsStepper.min = Config.patternsPerChannelMin + "";
			this._patternsStepper.max = Config.patternsPerChannelMax + "";
			
			this._instrumentsStepper.value = this._doc.song.instrumentsPerChannel + "";
			this._instrumentsStepper.min = Config.instrumentsPerChannelMin + "";
			this._instrumentsStepper.max = Config.instrumentsPerChannelMax + "";
			
			this._pitchChannelStepper.value = this._doc.song.pitchChannelCount + "";
			this._pitchChannelStepper.min = Config.pitchChannelCountMin + "";
			this._pitchChannelStepper.max = Config.pitchChannelCountMax + "";
			
			this._drumChannelStepper.value = this._doc.song.noiseChannelCount + "";
			this._drumChannelStepper.min = Config.noiseChannelCountMin + "";
			this._drumChannelStepper.max = Config.noiseChannelCountMax + "";
			
			this._pitchChannelStepper.select();
			setTimeout(()=>this._pitchChannelStepper.focus());
			
			this._okayButton.addEventListener("click", this._saveChanges);
			this._cancelButton.addEventListener("click", this._close);
			this._patternsStepper.addEventListener("keypress", ChannelSettingsPrompt._validateKey);
			this._instrumentsStepper.addEventListener("keypress", ChannelSettingsPrompt._validateKey);
			this._pitchChannelStepper.addEventListener("keypress", ChannelSettingsPrompt._validateKey);
			this._drumChannelStepper.addEventListener("keypress", ChannelSettingsPrompt._validateKey);
			this._patternsStepper.addEventListener("blur", ChannelSettingsPrompt._validateNumber);
			this._instrumentsStepper.addEventListener("blur", ChannelSettingsPrompt._validateNumber);
			this._pitchChannelStepper.addEventListener("blur", ChannelSettingsPrompt._validateNumber);
			this._drumChannelStepper.addEventListener("blur", ChannelSettingsPrompt._validateNumber);
			this.container.addEventListener("keydown", this._whenKeyPressed);
		}
		
		private _close = (): void => { 
			this._doc.undo();
		}
		
		public cleanUp = (): void => { 
			this._okayButton.removeEventListener("click", this._saveChanges);
			this._cancelButton.removeEventListener("click", this._close);
			this._patternsStepper.removeEventListener("keypress", ChannelSettingsPrompt._validateKey);
			this._instrumentsStepper.removeEventListener("keypress", ChannelSettingsPrompt._validateKey);
			this._pitchChannelStepper.removeEventListener("keypress", ChannelSettingsPrompt._validateKey);
			this._drumChannelStepper.removeEventListener("keypress", ChannelSettingsPrompt._validateKey);
			this._patternsStepper.removeEventListener("blur", ChannelSettingsPrompt._validateNumber);
			this._instrumentsStepper.removeEventListener("blur", ChannelSettingsPrompt._validateNumber);
			this._pitchChannelStepper.removeEventListener("blur", ChannelSettingsPrompt._validateNumber);
			this._drumChannelStepper.removeEventListener("blur", ChannelSettingsPrompt._validateNumber);
			this.container.removeEventListener("keydown", this._whenKeyPressed);
		}
		
		private _whenKeyPressed = (event: KeyboardEvent): void => {
			if ((<Element> event.target).tagName != "BUTTON" && event.keyCode == 13) { // Enter key
				this._saveChanges();
			}
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
			group.append(new ChangePatternsPerChannel(this._doc, ChannelSettingsPrompt._validate(this._patternsStepper)));
			group.append(new ChangeInstrumentsPerChannel(this._doc, ChannelSettingsPrompt._validate(this._instrumentsStepper)));
			group.append(new ChangeChannelCount(this._doc, ChannelSettingsPrompt._validate(this._pitchChannelStepper), ChannelSettingsPrompt._validate(this._drumChannelStepper)));
			this._doc.prompt = null;
			this._doc.record(group, true);
		}
	}
}
