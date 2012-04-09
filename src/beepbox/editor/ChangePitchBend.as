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
	
	public class ChangePitchBend extends Change {
		private var document: Document;
		private var bar: BarPattern;
		private var tone: Tone;
		private var oldStart: int;
		private var newStart: int;
		private var oldEnd: int;
		private var newEnd: int;
		private var oldPins: Array;
		private var newPins: Array;
		public function ChangePitchBend(document: Document, bar: BarPattern, tone: Tone, bendStart: int, bendEnd: int, bendTo: int) {
			super(false);
			this.document = document;
			this.bar = bar;
			this.tone = tone;
			oldStart = tone.start;
			oldEnd   = tone.end;
			newStart = Math.min(tone.start, bendEnd);
			newEnd   = Math.max(tone.end,   bendEnd);
			oldPins = tone.pins;
			newPins = [];
			
			bendStart -= newStart;
			bendEnd   -= newStart;
			bendTo    -= tone.notes[0];
			
			//trace(oldPins.length, newPins.length, bendStart, bendEnd, bendTo);
			
			var offset: int = oldStart - newStart;
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
				stop = tone.pins.length;
				push = newPins.push;
			} else {
				i = tone.pins.length - 1;
				direction = -1;
				stop = -1;
				push = newPins.unshift;
			}
			for (; i != stop; i += direction) {
				var oldPin: TonePin = tone.pins[i];
				for (;;) {
					if (!setStart) {
						if ((oldPin.time + offset) * direction <= bendStart * direction) {
							prevInterval = oldPin.interval;
							prevVolume = oldPin.volume;
						}
						if ((oldPin.time + offset) * direction < bendStart * direction) {
							push(new TonePin(oldPin.interval, oldPin.time + offset, oldPin.volume));
							break;
						} else {
							push(new TonePin(prevInterval, bendStart, prevVolume));
							setStart = true;
						}
					} else if (!setEnd) {
						if ((oldPin.time + offset) * direction <= bendEnd * direction) {
							prevInterval = oldPin.interval;
							prevVolume = oldPin.volume;
						}
						if ((oldPin.time + offset) * direction < bendEnd * direction) {
							break;
						} else {
							push(new TonePin(bendTo, bendEnd, prevVolume));
							setEnd = true;
						}
					} else {
						if ((oldPin.time + offset) * direction == bendEnd * direction) {
							break;
						} else {
							if (oldPin.interval != prevInterval) persist = false;
							push(new TonePin(persist ? bendTo : oldPin.interval, oldPin.time + offset, oldPin.volume));
							break;
						}
					}
				}
			}
			if (!setEnd) {
				push(new TonePin(bendTo, bendEnd, prevVolume));
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
			tone.pins = newPins;
			tone.start = newStart;
			tone.end = newEnd;
			document.changed();
		}
		
		protected override function doBackwards(): void {
			tone.pins = oldPins;
			tone.start = oldStart;
			tone.end = oldEnd;
			document.changed();
		}
	}
}
