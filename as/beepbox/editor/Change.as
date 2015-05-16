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
	
	public class Change {
		private var reversed: Boolean;
		private var noop: Boolean;
		private var doneForwards: Boolean;
		public function Change(reversed: Boolean) {
			this.reversed = reversed;
			doneForwards = !reversed;
			noop = true;
		}
		
		protected final function didSomething(): void {
			noop = false;
		}
		
		public final function isNoop(): Boolean {
			return noop;
		}
		
		public final function undo(): void {
			if (reversed) {
				doForwards();
				doneForwards = true;
			} else {
				doBackwards();
				doneForwards = false;
			}
		}
		
		public final function redo(): void {
			if (reversed) {
				doBackwards();
				doneForwards = false;
			} else {
				doForwards();
				doneForwards = true;
			}
		}
		
		// isDoneForwards() returns whether or not the Change was most recently 
		// performed forwards or backwards. If the change created something, do not 
		// delete it in the change destructor unless the Change was performed 
		// backwards: 
		protected final function isDoneForwards(): Boolean {
			return doneForwards;
		}
		
		protected function doForwards(): void {
			throw new Error("Change.doForwards(): Override me.");
		}
		
		protected function doBackwards(): void {
			throw new Error("Change.doBackwards(): Override me.");
		}
	}
}
