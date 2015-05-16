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
	
	public class ChangeChannelBar extends Change {
		private var document: Document;
		private var oldChannel: int;
		private var newChannel: int;
		private var oldBar: int;
		private var newBar: int;
		public function ChangeChannelBar(document: Document, channel: int, bar: int) {
			super(false);
			this.document = document;
			oldChannel = document.channel;
			newChannel = channel;
			oldBar = document.bar;
			newBar = bar;
			doForwards();
			if (oldChannel != newChannel || oldBar != newBar) {
				didSomething();
			}
		}
		
		protected override function doForwards(): void {
			document.channel = newChannel;
			document.bar = newBar;
			document.barScrollPos = Math.min(document.bar, Math.max(document.bar - 15, document.barScrollPos));
			document.changed();
		}
		
		protected override function doBackwards(): void {
			document.channel = oldChannel;
			document.bar = oldBar;
			document.barScrollPos = Math.min(document.bar, Math.max(document.bar - 15, document.barScrollPos));
			document.changed();
		}
	}
}
