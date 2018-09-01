/*
Copyright (C) 2018 John Nesky

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
/// <reference path="SongEditor.ts" />
/// <reference path="Prompt.ts" />
/// <reference path="html.ts" />
/// <reference path="changes.ts" />

namespace beepbox {
	const {button, p, div, text} = html;

	export class IntervalPrompt implements Prompt {
		private readonly _cancelButton: HTMLButtonElement = button({}, [text("Close")]);
		
		public readonly container: HTMLDivElement = div({className: "prompt", style: "width: 250px;"}, [
			div({style: "font-size: 2em"}, [text("Custom Harmony")]),
			p({style: "text-align: left; margin: 0.5em 0;"}, [text(
				'BeepBox "chip" instruments play two waves at once, each with their own pitch. ' +
				'The "Interval" setting usually determines how far apart these pitches are, but in "custom harmony" mode, you can control these pitches individually by making two simultaneous notes, one above the other. ' +
				'This replaces the "arpeggio/trill" effect, and gives you greater control over your harmony. '
			)]),
			this._cancelButton,
		]);
		
		constructor(private _doc: SongDocument, private _songEditor: SongEditor) {
			this._cancelButton.addEventListener("click", this._close);
		}
		
		private _close = (): void => { 
			this._doc.undo();
		}
		
		public cleanUp = (): void => { 
			this._cancelButton.removeEventListener("click", this._close);
		}
	}
}
