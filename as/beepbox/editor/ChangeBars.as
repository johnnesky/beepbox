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
	
	public class ChangeBars extends Change {
		private var document: Document;
		private var oldBars: int;
		private var newBars: int;
		private var oldChannelBars: Array;
		private var newChannelBars: Array;
		private var oldBar: int;
		private var newBar: int;
		private var oldBarScrollPos: int;
		private var newBarScrollPos: int;
		private var oldLoopStart: int;
		private var newLoopStart: int;
		private var oldLoopLength: int;
		private var newLoopLength: int;
		private var sequence: ChangeSequence;
		public function ChangeBars(document: Document, bars: int) {
			super(false);
			this.document = document;
			oldBars = document.song.bars;
			newBars = bars;
			if (oldBars != newBars) {
				oldChannelBars = document.song.channelBars;
				newChannelBars = [];
				for (var i: int = 0; i < Music.numChannels; i++) {
					var channel: Array = [];
					for (var j: int = 0; j < newBars; j++) {
						channel.push(j < oldBars ? oldChannelBars[i][j] : 1);
					}
					newChannelBars.push(channel);
				}
				
				oldBar = document.bar;
				oldBarScrollPos = document.barScrollPos;
				oldLoopStart = document.song.loopStart;
				oldLoopLength = document.song.loopLength;
				newBar = document.bar;
				newBarScrollPos = document.barScrollPos;
				newLoopStart = document.song.loopStart;
				newLoopLength = document.song.loopLength;
				if (oldBars > newBars) {
					newBar = Math.min(newBar, newBars-1);
					newBarScrollPos = Math.max(0, Math.min(newBars - 16, newBarScrollPos));
					newLoopLength = Math.min(newBars, newLoopLength);
					newLoopStart = Math.min(newBars - newLoopLength, newLoopStart);
				}
				doForwards();
				didSomething();
			}
		}
		
		protected override function doForwards(): void {
			document.bar = newBar;
			document.barScrollPos = newBarScrollPos;
			document.song.loopStart = newLoopStart;
			document.song.loopLength = newLoopLength;
			document.song.bars = newBars;
			document.song.channelBars = newChannelBars;
			document.changed();
		}
		
		protected override function doBackwards(): void {
			document.bar = oldBar;
			document.barScrollPos = oldBarScrollPos;
			document.song.loopStart = oldLoopStart;
			document.song.loopLength = oldLoopLength;
			document.song.bars = oldBars;
			document.song.channelBars = oldChannelBars;
			document.changed();
		}
	}
}
