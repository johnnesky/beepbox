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
	
	public class ChangePatterns extends Change {
		private var document: Document;
		private var oldPatterns: int;
		private var newPatterns: int;
		private var oldChannelBars: Array;
		private var newChannelBars: Array;
		private var oldChannelPatterns: Array;
		private var newChannelPatterns: Array;
		private var sequence: ChangeSequence;
		public function ChangePatterns(document: Document, patterns: int) {
			super(false);
			this.document = document;
			oldPatterns = document.song.patterns;
			newPatterns = patterns;
			if (oldPatterns != newPatterns) {
				oldChannelBars = document.song.channelBars;
				newChannelBars = [];
				oldChannelPatterns = document.song.channelPatterns;
				newChannelPatterns = [];
				
				for (var i: int = 0; i < Music.numChannels; i++) {
					var j: int;
					var channel: Array = [];
					for (j = 0; j < document.song.channelBars[i].length; j++) {
						var bar: int = document.song.channelBars[i][j];
						if (bar > newPatterns) bar = 1;
						channel.push(bar);
					}
					newChannelBars.push(channel);
					
					channel = [];
					for (j = 0; j < newPatterns; j++) {
						if (j < document.song.channelPatterns[i].length) {
							channel.push(document.song.channelPatterns[i][j]);
						} else {
							channel.push(new BarPattern());
						}
					}
					newChannelPatterns.push(channel);
				}
				
				doForwards();
				didSomething();
			}
		}
		
		protected override function doForwards(): void {
			if (sequence != null) sequence.redo();
			document.song.patterns = newPatterns;
			document.song.channelBars = newChannelBars;
			document.song.channelPatterns = newChannelPatterns;
			document.changed();
		}
		
		protected override function doBackwards(): void {
			document.song.patterns = oldPatterns;
			document.song.channelBars = oldChannelBars;
			document.song.channelPatterns = oldChannelPatterns;
			if (sequence != null) sequence.undo();
			document.changed();
		}
	}
}
