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

package beepbox.editor {
	import beepbox.synth.*;
	
	public class ChangeRhythm extends ChangeSequence {
		public function ChangeRhythm(document: Document, bar: BarPattern, oldParts: int, newParts: int) {
			var changeRhythm: Function;
			if (oldParts == 4 && newParts == 3) changeRhythm = function(oldTime: int): int {
				return Math.ceil(oldTime * 3.0 / 4.0);
			}
			if (oldParts == 3 && newParts == 4) changeRhythm = function(oldTime: int): int {
				return Math.floor(oldTime * 4.0 / 3.0);
			}
			var i: int = 0;
			while (i < bar.notes.length) {
				var note: Note = bar.notes[i];
				if (changeRhythm(note.start) >= changeRhythm(note.end)) {
					append(new ChangeNoteAdded(document, bar, note, i, true));
				} else {
					append(new ChangeRhythmNote(document, note, changeRhythm));
					i++;
				}
			}
		}
	}
}
