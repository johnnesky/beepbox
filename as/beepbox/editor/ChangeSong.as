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
	
	public class ChangeSong extends Change {
		private var document: Document;
		private var oldSong: String;
		private var newSong: String;
		private var oldPatterns: Array;
		private var newPatterns: Array;
		private var oldBar: int;
		private var newBar: int;
		public function ChangeSong(document: Document, song: String) {
			super(false);
			this.document = document;
			oldSong = document.song.toString();
			oldPatterns = document.song.channelPatterns;
			oldBar = document.bar;
			if (song != null) {
				newSong = song;
				document.song.fromString(newSong, false);
			} else {
				document.song.initToDefault(false);
				newSong = document.song.toString();
			}
			newPatterns = document.song.channelPatterns;
			newBar = Math.max(0, Math.min(document.song.bars - 1, oldBar));
			document.bar = newBar;
			document.barScrollPos = Math.max(0, Math.min(document.song.bars - 16, document.barScrollPos));
			document.barScrollPos = Math.min(document.bar, Math.max(document.bar - 15, document.barScrollPos));
			document.changed();
			didSomething();
		}
		
		protected override function doForwards(): void {
			document.song.fromString(newSong, true);
			document.song.channelPatterns = newPatterns;
			document.bar = newBar;
			document.barScrollPos = Math.max(0, Math.min(document.song.bars - 16, document.barScrollPos));
			document.barScrollPos = Math.min(document.bar, Math.max(document.bar - 15, document.barScrollPos));
			document.changed();
		}
		
		protected override function doBackwards(): void {
			document.song.fromString(oldSong, true);
			document.song.channelPatterns = oldPatterns;
			document.bar = oldBar;
			document.barScrollPos = Math.max(0, Math.min(document.song.bars - 16, document.barScrollPos));
			document.barScrollPos = Math.min(document.bar, Math.max(document.bar - 15, document.barScrollPos));
			document.changed();
		}
	}
}
