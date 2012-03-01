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
	
	public class ChangeHistory extends Model {
		private var changes: Array;
		private var recentChange: Change;
		private var index: int;
		
		public function ChangeHistory() {
			changes = [];
			index = 0;
			recentChange = null;
			changed();
		}
		
		public function canUndo(): Boolean {
			return index > 0;
		}
		
		public function canRedo(): Boolean {
			return index < changes.length;
		}
		
		public function record(change: Change): void {
			if (change.isNoop()) return;
			changes[index] = change;
			index++;
			changes.length = index;
			recentChange = change;
			changed();
		}
		
		public function undo(): void {
			if (index <= 0) return;
			index--;
			var change: Change = changes[index];
			change.undo();
			recentChange = null;
			changed();
		}
		
		public function redo(): void {
			if (index >= changes.length) return;
			var change: Change = changes[index];
			change.redo();
			index++;
			changed();
		}
		
		public function getRecentChange(): Change {
			return recentChange;
		}
	}
}