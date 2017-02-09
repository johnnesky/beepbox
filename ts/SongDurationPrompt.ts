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
	export interface SongDurationPrompt {
	}

	export function SongDurationPrompt(doc: SongDocument, songEditor: SongEditor): void {
		const container: HTMLElement = <HTMLElement>document.getElementById("songSizePrompt");
		const beatsStepper: HTMLInputElement = <HTMLInputElement>document.getElementById("beatsStepper");
		const barsStepper: HTMLInputElement = <HTMLInputElement>document.getElementById("barsStepper");
		const patternsStepper: HTMLInputElement = <HTMLInputElement>document.getElementById("patternsStepper");
		const instrumentsStepper: HTMLInputElement = <HTMLInputElement>document.getElementById("instrumentsStepper");
		const songDurationOkayButton: HTMLButtonElement = <HTMLButtonElement>document.getElementById("songDurationOkayButton");
		const songDurationCancelButton: HTMLButtonElement = <HTMLButtonElement>document.getElementById("songDurationCancelButton");
		
		
		function onClose(): void { 
			container.style.display = "none";
			songEditor.closePrompt();
			songDurationOkayButton.removeEventListener("click", saveChanges);
			songDurationCancelButton.removeEventListener("click", onClose);
			beatsStepper.removeEventListener("keypress", validateKey);
			barsStepper.removeEventListener("keypress", validateKey);
			patternsStepper.removeEventListener("keypress", validateKey);
			instrumentsStepper.removeEventListener("keypress", validateKey);
			beatsStepper.removeEventListener("blur", validateNumber);
			barsStepper.removeEventListener("blur", validateNumber);
			patternsStepper.removeEventListener("blur", validateNumber);
			instrumentsStepper.removeEventListener("blur", validateNumber);
		}
		
		function validateKey(event: KeyboardEvent): boolean {
			const charCode = (event.which) ? event.which : event.keyCode;
			if (charCode != 46 && charCode > 31 && (charCode < 48 || charCode > 57)) {
				event.preventDefault();
				return true;
			}
			return false;
		}
		
		function validateNumber(event: Event): void {
			const input: HTMLInputElement = <HTMLInputElement>event.target;
			input.value = Math.floor(Math.max(Number(input.min), Math.min(Number(input.max), Number(input.value)))) + "";
		}
		
		function validate(input: HTMLInputElement): number {
			return Math.floor(Number(input.value));
		}
		
		function saveChanges(): void {
			const sequence: ChangeSequence = new ChangeSequence();
			sequence.append(new ChangeBeats(doc, validate(beatsStepper)));
			sequence.append(new ChangeBars(doc, validate(barsStepper)));
			sequence.append(new ChangePatterns(doc, validate(patternsStepper)));
			sequence.append(new ChangeInstruments(doc, validate(instrumentsStepper)));
			doc.history.record(sequence);
			onClose();
		}
		
		beatsStepper.value = doc.song.beats + "";
		beatsStepper.min = Music.beatsMin + "";
		beatsStepper.max = Music.beatsMax + "";
		
		barsStepper.value = doc.song.bars + "";
		barsStepper.min = Music.barsMin + "";
		barsStepper.max = Music.barsMax + "";
		
		patternsStepper.value = doc.song.patterns + "";
		patternsStepper.min = Music.patternsMin + "";
		patternsStepper.max = Music.patternsMax + "";
		
		instrumentsStepper.value = doc.song.instruments + "";
		instrumentsStepper.min = Music.instrumentsMin + "";
		instrumentsStepper.max = Music.instrumentsMax + "";
		
		songDurationOkayButton.addEventListener("click", saveChanges);
		songDurationCancelButton.addEventListener("click", onClose);
		beatsStepper.addEventListener("keypress", validateKey);
		barsStepper.addEventListener("keypress", validateKey);
		patternsStepper.addEventListener("keypress", validateKey);
		instrumentsStepper.addEventListener("keypress", validateKey);
		beatsStepper.addEventListener("blur", validateNumber);
		barsStepper.addEventListener("blur", validateNumber);
		patternsStepper.addEventListener("blur", validateNumber);
		instrumentsStepper.addEventListener("blur", validateNumber);
		
		container.style.display = "block";
	}
}
