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
	
	public class ChangeNoteLength extends ChangePins {
		public function ChangeNoteLength(document: Document, note: Note, truncStart: int, truncEnd: int) {
			var changePins: Function = function(): void {
				truncStart -= oldStart;
				truncEnd   -= oldStart;
				var setStart: Boolean = false;
				var prevVolume: int = oldPins[0].volume;
				var prevInterval: int = oldPins[0].interval;
				var i: int;
				for (i = 0; i < oldPins.length; i++) {
					var oldPin: NotePin = oldPins[i];
					if (oldPin.time < truncStart) {
						prevVolume = oldPin.volume;
						prevInterval = oldPin.interval;
					} else if (oldPin.time <= truncEnd) {
						if (oldPin.time > truncStart && !setStart) {
							newPins.push(new NotePin(prevInterval, truncStart, prevVolume));
						}
						newPins.push(new NotePin(oldPin.interval, oldPin.time, oldPin.volume));
						setStart = true;
						if (oldPin.time == truncEnd) {
							return;
						}
					} else {
						break;
					} 
					
				}
				
				newPins.push(new NotePin(oldPins[i].interval, truncEnd, oldPins[i].volume));
			}
			
			super(document, note, changePins);
		}
	}
}
