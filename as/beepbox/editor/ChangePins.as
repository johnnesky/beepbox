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
	
	public class ChangePins extends Change {
		protected var document: Document;
		protected var note: Note;
		protected var oldStart: int;
		protected var newStart: int;
		protected var oldEnd: int;
		protected var newEnd: int;
		protected var oldPins: Array;
		protected var newPins: Array;
		protected var oldPitches: Array;
		protected var newPitches: Array;
		public function ChangePins(document: Document, note: Note, changePins: Function) {
			super(false);
			this.document = document;
			this.note = note;
			oldStart = note.start;
			oldEnd   = note.end;
			newStart = note.start;
			newEnd   = note.end;
			oldPins = note.pins;
			newPins = [];
			oldPitches = note.pitches;
			newPitches = [];
			
			changePins();
			
			var i: int;
			for (i = 0; i < newPins.length - 1; ) {
				if (newPins[i].time >= newPins[i+1].time) {
					newPins.splice(i, 1);
				} else {
					i++;
				}
			}
			
			for (i = 1; i < newPins.length - 1; ) {
				if (newPins[i-1].interval == newPins[i].interval && 
				    newPins[i].interval == newPins[i+1].interval && 
				    newPins[i-1].volume == newPins[i].volume && 
				    newPins[i].volume == newPins[i+1].volume)
				{
					newPins.splice(i, 1);
				} else {
					i++;
				}
			}
			
			var firstInterval: int = newPins[0].interval;
			var firstTime: int = newPins[0].time;
			for (i = 0; i < oldPitches.length; i++) {
				newPitches[i] = oldPitches[i] + firstInterval;
			}
			for (i = 0; i < newPins.length; i++) {
				newPins[i].interval -= firstInterval;
				newPins[i].time -= firstTime;
			}
			newStart = oldStart + firstTime;
			newEnd   = newStart + newPins[newPins.length-1].time;
			
			doForwards();
			didSomething();
		}
		
		protected override function doForwards(): void {
			note.pins = newPins;
			note.pitches = newPitches;
			note.start = newStart;
			note.end = newEnd;
			document.changed();
		}
		
		protected override function doBackwards(): void {
			note.pins = oldPins;
			note.pitches = oldPitches;
			note.start = oldStart;
			note.end = oldEnd;
			document.changed();
		}
	}
}
