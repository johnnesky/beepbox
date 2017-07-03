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
	
	public class ChangePinTime extends ChangePins {
		public function ChangePinTime(document: Document, note: Note, pinIndex: int, shiftedTime: int) {
			var changePins: Function = function(): void {
				shiftedTime -= oldStart;
				var originalTime: int = oldPins[pinIndex].time;
				var skipStart: int = Math.min(originalTime, shiftedTime);
				var skipEnd: int = Math.max(originalTime, shiftedTime);
				var setPin: Boolean = false;
				for (var i: int = 0; i < oldPins.length; i++) {
					var oldPin: NotePin = note.pins[i];
					var time: int = oldPin.time;
					if (time < skipStart) {
						newPins.push(new NotePin(oldPin.interval, time, oldPin.volume));
					} else if (time > skipEnd) {
						if (!setPin) {
							newPins.push(new NotePin(oldPins[pinIndex].interval, shiftedTime, oldPins[pinIndex].volume));
							setPin = true;
						}
						newPins.push(new NotePin(oldPin.interval, time, oldPin.volume));
					}
				}
				if (!setPin) {
					newPins.push(new NotePin(oldPins[pinIndex].interval, shiftedTime, oldPins[pinIndex].volume));
				}
			}
			
			super(document, note, changePins);
		}
	}
}
