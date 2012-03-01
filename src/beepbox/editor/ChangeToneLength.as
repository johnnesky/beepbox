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
	
	public class ChangeToneLength extends Change {
		private var document: Document;
		private var bar: BarPattern;
		private var tone: Tone;
		private var oldStart: int;
		private var newStart: int;
		private var oldEnd: int;
		private var newEnd: int;
		private var oldPins: Array;
		private var newPins: Array;
		public function ChangeToneLength(document: Document, bar: BarPattern, tone: Tone, newStart: int, newEnd: int) {
			super(false);
			this.document = document;
			this.bar = bar;
			this.tone = tone;
			oldStart = tone.start;
			oldEnd = tone.end;
			this.newStart = newStart;
			this.newEnd = newEnd;
			oldPins = tone.pins;
			newPins = [];
			
			for each (var oldPin: TonePin in tone.pins) {
				newPins.push(new TonePin(oldPin.interval, oldPin.time + oldStart - newStart, oldPin.volume));
			}
			
			if (oldStart > newStart) {
				newPins[0].time = 0;
			}
			if (oldEnd < newEnd) {
				newPins[newPins.length - 1].time = newEnd - newStart;
			}
			if (oldStart < newStart) {
				while (newPins[1].time <= 0) {
					newPins.shift();
				}
				newPins[0].time = 0;
			}
			if (oldEnd > newEnd) {
				while (newPins[newPins.length-2].time >= newEnd - newStart) {
					newPins.pop();
				}
				newPins[newPins.length-1].time = newEnd - newStart;
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
