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
	
	public class ChangePaste extends Change {
		private var document: Document;
		public var oldNotes: Array;
		public var newNotes: Array;
		public function ChangePaste(document: Document, notes: Array) {
			super(false);
			this.document = document;
			
			var pattern: BarPattern = document.getCurrentPattern();
			oldNotes = pattern.notes;
			pattern.notes = notes;
			pattern.notes = pattern.cloneNotes();
			newNotes = pattern.notes;
			document.changed();
			didSomething();
		}
		
		protected override function doForwards(): void {
			var pattern: BarPattern = document.getCurrentPattern();
			pattern.notes = newNotes;
			document.changed();
		}
		
		protected override function doBackwards(): void {
			var pattern: BarPattern = document.getCurrentPattern();
			pattern.notes = oldNotes;
			document.changed();
		}
	}
}
