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
	
	public class ChangeTransposeNote extends Change {
		protected var doc: Document;
		protected var note: Note;
		protected var oldStart: int;
		protected var newStart: int;
		protected var oldEnd: int;
		protected var newEnd: int;
		protected var oldPins: Array;
		protected var newPins: Array;
		protected var oldPitches: Array;
		protected var newPitches: Array;
		public function ChangeTransposeNote(doc: Document, note: Note, upward: Boolean) {
			super(false);
			this.doc = doc;
			this.note = note;
			oldPins = note.pins;
			newPins = [];
			oldPitches = note.pitches;
			newPitches = [];
			
			var i: int;
			var j: int;
			
			for (i = 0; i < oldPitches.length; i++) {
				var pitch: int = oldPitches[i];
				if (upward) {
					for (j = pitch + 1; j <= Music.maxPitch; j++) {
						if (doc.channel == 3 || Music.scaleFlags[doc.song.scale][j%12] == true) {
							pitch = j;
							break;
						}
					}
				} else {
					for (j = pitch - 1; j >= 0; j--) {
						if (doc.channel == 3 || Music.scaleFlags[doc.song.scale][j%12] == true) {
							pitch = j;
							break;
						}
					}
				}
				
				var foundMatch: Boolean = false;
				for (j = 0; j < newPitches.length; j++) {
					if (newPitches[j] == pitch) {
						foundMatch = true;
						break;
					}
				}
				if (!foundMatch) newPitches.push(pitch);
			}
			
			var min: int = 0;
			var max: int = Music.maxPitch;
			
			for (i = 1; i < newPitches.length; i++) {
				var diff: int = newPitches[0] - newPitches[i];
				if (min < diff) min = diff;
				if (max > diff + Music.maxPitch) max = diff + Music.maxPitch;
			}
			
			for each (var oldPin: NotePin in oldPins) {
				var interval: int = oldPin.interval + oldPitches[0];
				
				if (interval < min) interval = min;
				if (interval > max) interval = max;
				if (upward) {
					for (i = interval + 1; i <= max; i++) {
						if (doc.channel == 3 || Music.scaleFlags[doc.song.scale][i%12] == true) {
							interval = i;
							break;
						}
					}
				} else {
					for (i = interval - 1; i >= min; i--) {
						if (doc.channel == 3 || Music.scaleFlags[doc.song.scale][i%12] == true) {
							interval = i;
							break;
						}
					}
				}
				interval -= newPitches[0];
				newPins.push(new NotePin(interval, oldPin.time, oldPin.volume));
			}
			
			if (newPins[0].interval != 0) throw new Error("wrong pin start interval");
			
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
			note.pitches = newPitches;
			doc.changed();
		}
		
		protected override function doBackwards(): void {
			note.pins = oldPins;
			note.pitches = oldPitches;
			doc.changed();
		}
	}
}
