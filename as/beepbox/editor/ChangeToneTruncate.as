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
	
	public class ChangeToneTruncate extends ChangeSequence {
		public function ChangeToneTruncate(document: Document, bar: BarPattern, start: int, end: int, skipTone: Tone = null) {
			var i: int = 0;
			while (i < bar.tones.length) {
				var tone: Tone = bar.tones[i];
				if (tone == skipTone && skipTone != null) {
					i++;
				} else if (tone.end <= start) {
					i++;
				} else if (tone.start >= end) {
					break;
				} else if (tone.start < start) {
					append(new ChangeToneLength(document, tone, tone.start, start));
					i++;
				} else if (tone.end > end) {
					append(new ChangeToneLength(document, tone, end, tone.end));
					i++;
				} else {
					append(new ChangeToneAdded(document, bar, tone, i, true));
				}
			}
		}
	}
}
