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

package beepbox.synth {
	public class BarPattern {
		public var tones: Array;
		public var instrument: int;
		public function BarPattern() {
			tones = [];
			instrument = 0;
			//tones = [new Tone(12, 0, 8)];
			//tones[0].pins = [new TonePin(0, 0), new TonePin(0, 3), new TonePin(2, 4), new TonePin(2, 8)];
		}
		
		public function cloneTones(): Array {
			var result: Array = [];
			for each (var oldTone: Tone in tones) {
				var newTone: Tone = new Tone(-1, oldTone.start, oldTone.end, 3);
				newTone.pitches = oldTone.pitches.concat();
				newTone.pins = [];
				for each (var oldPin: TonePin in oldTone.pins) {
					newTone.pins.push(new TonePin(oldPin.interval, oldPin.time, oldPin.volume));
				}
				result.push(newTone);
			}
			return result;
		}
	}
}
