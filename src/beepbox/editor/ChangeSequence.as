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
	
	public class ChangeSequence extends Change {
		private var changes: Array;
		public function ChangeSequence(changes: Array = null) {
			super(false);
			if (changes == null) {
				this.changes = [];
			} else {
				this.changes = changes.concat();
			}
		}
		
		public final function append(change: Change): void {
			if (change.isNoop()) return;
			changes[changes.length] = change;
			didSomething();
		}
		
		/*
		// WARNING: prepend is almost always a bad idea. Know what you're doing.
		protected final function prepend(change: Change): void {
			if (change.didNothing) return;
			changes.splice(0,0,change);
			didSomething();
		}
		*/
		
		protected override final function doForwards(): void {
			for (var i: int = 0; i < changes.length; i++) {
				changes[i].redo();
			}
		}
		
		protected override final function doBackwards(): void {
			for (var i: int = changes.length-1; i >= 0 ; i--) {
				changes[i].undo();
			}
		}
	}
}
