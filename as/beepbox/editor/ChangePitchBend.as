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
	
	public class ChangePitchBend extends ChangePins {
		public function ChangePitchBend(document: Document, note: Note, bendStart: int, bendEnd: int, bendTo: int, pitchIndex: int) {
			var changePins: Function = function(): void {
				bendStart -= oldStart;
				bendEnd   -= oldStart;
				bendTo    -= note.pitches[pitchIndex];
				
				var setStart: Boolean = false;
				var setEnd: Boolean   = false;
				var prevInterval: int = 0;
				var prevVolume: int = 3;
				var persist: Boolean = true;
				var i: int;
				var direction: int;
				var stop: int;
				var push: Function;
				if (bendEnd > bendStart) {
					i = 0;
					direction = 1;
					stop = note.pins.length;
					push = newPins.push;
				} else {
					i = note.pins.length - 1;
					direction = -1;
					stop = -1;
					push = newPins.unshift;
				}
				for (; i != stop; i += direction) {
					var oldPin: NotePin = note.pins[i];
					var time: int = oldPin.time;
					for (;;) {
						if (!setStart) {
							if (time * direction <= bendStart * direction) {
								prevInterval = oldPin.interval;
								prevVolume = oldPin.volume;
							}
							if (time * direction < bendStart * direction) {
								push(new NotePin(oldPin.interval, time, oldPin.volume));
								break;
							} else {
								push(new NotePin(prevInterval, bendStart, prevVolume));
								setStart = true;
							}
						} else if (!setEnd) {
							if (time * direction <= bendEnd * direction) {
								prevInterval = oldPin.interval;
								prevVolume = oldPin.volume;
							}
							if (time * direction < bendEnd * direction) {
								break;
							} else {
								push(new NotePin(bendTo, bendEnd, prevVolume));
								setEnd = true;
							}
						} else {
							if (time * direction == bendEnd * direction) {
								break;
							} else {
								if (oldPin.interval != prevInterval) persist = false;
								push(new NotePin(persist ? bendTo : oldPin.interval, time, oldPin.volume));
								break;
							}
						}
					}
				}
				if (!setEnd) {
					push(new NotePin(bendTo, bendEnd, prevVolume));
				}
			}
			
			super(document, note, changePins);
		}
	}
}
