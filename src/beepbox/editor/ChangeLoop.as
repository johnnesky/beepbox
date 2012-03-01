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
	
	public class ChangeLoop extends Change {
		private var document: Document;
		private var oldStart: int;
		private var newStart: int;
		private var oldLength: int;
		private var newLength: int;
		public function ChangeLoop(document: Document, start: int, length: int) {
			super(false);
			this.document = document;
			oldStart = document.song.loopStart;
			newStart = start;
			oldLength = document.song.loopLength;
			newLength = length;
			if (oldStart != newStart || oldLength != newLength) {
				didSomething();
				redo();
			}
		}
		
		protected override function doForwards(): void {
			document.song.loopStart = newStart;
			document.song.loopLength = newLength;
			document.changed();
		}
		
		protected override function doBackwards(): void {
			document.song.loopStart = oldStart;
			document.song.loopLength = oldLength;
			document.changed();
		}
	}
}
