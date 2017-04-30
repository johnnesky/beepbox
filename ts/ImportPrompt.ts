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
/// <reference path="editor.ts" />
/// <reference path="SongEditor.ts" />

"use strict";

module beepbox {
	const {button, div, input, text} = html;

	export class ImportPrompt {
		private readonly _fileInput: HTMLInputElement = input({style: "width:200px;", type: "file", accept: ".json,application/json"});
		private readonly _cancelButton: HTMLButtonElement = button({style: "width:200px;", type: "button"}, [text("Cancel")]);
		
		public readonly container: HTMLDivElement = div({style: "position: absolute; width: 100%; height: 100%; left: 0; display: flex; justify-content: center; align-items: center;"}, [
			div({style: "margin: auto; text-align: center; background: #000000; width: 200px; border-radius: 15px; border: 4px solid #444444; color: #ffffff; font-size: 12px; padding: 20px;"}, [
				div({style: "font-size: 30px"}, [text("Import")]),
				div({style: "height: 30px;"}),
				div(undefined, [text("BeepBox songs can be exported and re-imported as .json files. You could also use other means to make .json files for BeepBox as long as they follow the same structure.")]),
				div({style: "height: 20px;"}),
				this._fileInput,
				div({style: "height: 20px;"}),
				this._cancelButton,
			]),
		]);
		
		constructor(private _doc: SongDocument, private _songEditor: SongEditor) {
			this._fileInput.addEventListener("change", this._onFileSelected);
			this._cancelButton.addEventListener("click", this._onClose);
		}
		
		private _onClose = (): void => { 
			this._songEditor.closePrompt(this);
			this._fileInput.removeEventListener("change", this._onFileSelected);
			this._cancelButton.removeEventListener("click", this._onClose);
		}
		
		private _onFileSelected = (): void => {
			const file: File = this._fileInput.files[0];
			if (!file) return;
			
			const reader: FileReader = new FileReader();
			reader.addEventListener("load", (event: Event): void => {
				this._doc.history.record(new ChangeSong(this._doc, new Song(reader.result)));
				this._onClose();
			});
			reader.readAsText(file);
		}
	}
}
