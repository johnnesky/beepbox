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
	
	public class ChangeNoteTruncate extends ChangeSequence {
		public function ChangeNoteTruncate(document: Document, bar: BarPattern, start: int, end: int, skipNote: Note = null) {
			var i: int = 0;
			while (i < bar.notes.length) {
				var note: Note = bar.notes[i];
				if (note == skipNote && skipNote != null) {
					i++;
				} else if (note.end <= start) {
					i++;
				} else if (note.start >= end) {
					break;
				} else if (note.start < start) {
					append(new ChangeNoteLength(document, note, note.start, start));
					i++;
				} else if (note.end > end) {
					append(new ChangeNoteLength(document, note, end, note.end));
					i++;
				} else {
					append(new ChangeNoteAdded(document, bar, note, i, true));
				}
			}
		}
	}
}
