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
/// <reference path="SongDocument.ts" />
/// <reference path="html.ts" />
/// <reference path="SongEditor.ts" />

module beepbox {
	const {button, div, input, text} = html;

	export class ImportPrompt {
		private readonly _fileInput: HTMLInputElement = input({type: "file", accept: ".json,application/json"});
		private readonly _cancelButton: HTMLButtonElement = button({}, [text("Cancel")]);
		
		public readonly container: HTMLDivElement = div({className: "prompt", style: "width: 200px;"}, [
			div({style: "font-size: 2em"}, [text("Import")]),
			div(undefined, [text("BeepBox songs can be exported and re-imported as .json files. You could also use other means to make .json files for BeepBox as long as they follow the same structure.")]),
			this._fileInput,
			this._cancelButton,
		]);
		
		constructor(private _doc: SongDocument, private _songEditor: SongEditor) {
			this._fileInput.addEventListener("change", this._whenFileSelected);
			this._cancelButton.addEventListener("click", this._close);
		}
		
		private _close = (): void => { 
			this._songEditor.closePrompt(this);
			this._fileInput.removeEventListener("change", this._whenFileSelected);
			this._cancelButton.removeEventListener("click", this._close);
		}
		
		private _whenFileSelected = (): void => {
			const file: File = this._fileInput.files![0];
			if (!file) return;
			
			const reader: FileReader = new FileReader();
			reader.addEventListener("load", (event: Event): void => {
				this._doc.history.record(new ChangeSong(this._doc, reader.result));
				this._close();
			});
			reader.readAsText(file);
		}
	}
}
