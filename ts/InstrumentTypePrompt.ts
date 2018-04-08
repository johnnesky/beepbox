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
	const {button, div, text} = html;

	export class InstrumentTypePrompt implements Prompt {
		private readonly _cancelButton: HTMLButtonElement = button({}, [text("Close")]);
		
		public readonly container: HTMLDivElement = div({className: "prompt", style: "width: 300px;"}, [
			div({style: "font-size: 2em"}, [text("FM Synthesis")]),
			div({style: "text-align: left; margin: 0.5em 0;"}, [
				text('Popularized by the Sega Genesis and Yamaha keyboards, FM Synthesis is a mysterious but powerful technique for crafting sounds. It may seem confusing, but just play around with the options until you get a feel for it, or check out some examples in '),
				html.element("a", {target:"_blank", href: "#6n10s0kbl00e07t5m0a7g07j7i7r1o2T1d2c0A0F1B0V1Q0200Pff00E0411T1d1c0A0F0B0V1Q2800Pf700E0711T1d2c0A0F0BbV9Q0100Pf500E0b11T1d2c2AcF6B8V1Q0011PffffE0000T1d2c1AcF6B5V1Q0259PffffE0000T1d3c1AcF4B0V1Q2600Pff00E0011T1d1c0AbF0B0V1Q2580PfffaE2226T1d1c0A1F0B0V1Q520dPff4dEd41eb4zhmu0p21h5dfxd7ij7XrjfiAjPudUTtUSRsTzudTudJvdUTztTzrpPudUTtUSSYTzudTudJTdUTztTzrvPudUTtUSQ"}, [text("this demo")]),
				text('. '),
			]),
			div({style: "text-align: left; margin: 0.5em 0;"}, [text(
				'This FM instrument uses up to four waves, numbered 1, 2, 3, and 4. ' +
				'Each wave may have its own frequency, volume, and volume envelope to control its effect over time. '
			)]),
			div({style: "text-align: left; margin: 0.5em 0;"}, [text(
				'There are two kinds of waves: "carrier" waves play a tone out loud, but "modulator" waves distort other waves instead. ' +
				'Wave 1 is always a carrier and plays a tone, but other waves may distort it. ' +
				'The "Algorithm" setting determines which waves are modulators, and which other waves those modulators distort. '
			)]),
			div({style: "text-align: left; margin: 0.5em 0;"}, [text(
				'Modulators distort in one direction (like 1←2), but you can also use "Feedback" to make any wave distort in the opposite direction (1→2), or even itself (1⟲). '
			)]),
			div({style: "text-align: left; margin: 0.5em 0;"}, [text(
				'You can set the pitch of each wave independently by adding simultaneous notes, one above another. This often sounds harsh or dissonant, but can make cool sound effects! '
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
