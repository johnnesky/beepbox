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
	
	public class ChangeVolumeBend extends Change {
		private var document: Document;
		private var bar: BarPattern;
		private var note: Note;
		private var oldPins: Array;
		private var newPins: Array;
		public function ChangeVolumeBend(document: Document, bar: BarPattern, note: Note, bendPart: int, bendVolume: int, bendInterval: int) {
			super(false);
			this.document = document;
			this.bar = bar;
			this.note = note;
			oldPins = note.pins;
			newPins = [];
			
			var inserted: Boolean = false;
			var i: int;
			
			for each (var pin: NotePin in note.pins) {
				if (pin.time < bendPart) {
					newPins.push(pin);
				} else if (pin.time == bendPart) {
					newPins.push(new NotePin(bendInterval, bendPart, bendVolume));
					inserted = true;
				} else {
					if (!inserted) {
						newPins.push(new NotePin(bendInterval, bendPart, bendVolume));
						inserted = true;
					}
					newPins.push(pin);
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
			
			doForwards();
			didSomething();
		}
		
		protected override function doForwards(): void {
			note.pins = newPins;
			document.changed();
		}
		
		protected override function doBackwards(): void {
			note.pins = oldPins;
			document.changed();
		}
	}
}
