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
	
	public class Model {
		private static const waitingForFrame: Array = [];
		private const watchers: Array = [];
		//private const parentModels: Array = [];
		private var dirty: Boolean = false;
		
		public function watch(watcher: Function): void {
			if (watchers.indexOf(watcher) == -1) {
				watchers.push(watcher);
			}
		}
		
		public function unwatch(watcher: Function): void {
			var index: int = watchers.indexOf(watcher);
			if (index != -1) {
				watchers.splice(index, 1);
			}
		}
		
		public function changed(): void {
			if (dirty == false) {
				dirty = true;
				waitingForFrame.push(this);
				/*for each (var parentModel: Model in parentModels) {
					parentModel.changed();
				}*/
			}
		}
		
		private function update(): void {
			dirty = false;
			for each (var watcher: Function in watchers.concat()) {
				watcher();
			}
		}
		
		public static function updateAll(): void {
			for each (var model: Model in waitingForFrame.concat()) {
				model.update();
			}
			waitingForFrame.length = 0;
		}
	}
}
