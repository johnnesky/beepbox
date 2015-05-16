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
	import flash.net.SharedObject;
	
	import beepbox.synth.*;
	
	public class Document extends Model {
		private static const latestVersion: int = 2;
		
		public var synth: Synth;
		public var history: ChangeHistory;
		public var channel: int;
		public var bar: int;
		public var showFifth: Boolean;
		public var showLetters: Boolean;
		public var showChannels: Boolean;
		public var showScrollBar: Boolean;
		public var volume: int;
		public var song: Song;
		public var barScrollPos: int;
		
		private var localSO: SharedObject;
		
		public function Document() {
			channel = 0;
			bar = 0;
			showFifth = false;
			showLetters = false;
			showChannels = false;
			showScrollBar = false;
			volume = 75;
			history = new ChangeHistory();
			song = new Song();
			synth = new Synth(song);
			
			try {
				localSO = SharedObject.getLocal("preferences");
			} catch(e: Error) {}
			
			if (localSO != null) {
				if (localSO.data.showFifth != undefined) showFifth = localSO.data.showFifth;
				if (localSO.data.showLetters != undefined) showLetters = localSO.data.showLetters;
				if (localSO.data.showChannels != undefined) showChannels = localSO.data.showChannels;
				if (localSO.data.showScrollBar != undefined) showScrollBar = localSO.data.showScrollBar;
				if (localSO.data.volume != undefined) volume = localSO.data.volume;
			}
			
			synth.volume = calcVolume();
		}
		
		public function savePreferences(): void {
			if (localSO != null) {
				localSO.data.showFifth = showFifth;
				localSO.data.showLetters = showLetters;
				localSO.data.showChannels = showChannels;
				localSO.data.showScrollBar = showScrollBar;
				localSO.data.volume = volume;
				localSO.flush();
			}
		}
		
		private function calcVolume(): Number {
			return Math.min(1.0, Math.pow(volume / 50.0, 0.5)) * Math.pow(2.0, (volume - 75.0) / 25.0);
		}
		
		public function setVolume(val: int): void {
			volume = val;
			savePreferences();
			synth.volume = calcVolume();
		}
		
		public function getCurrentPattern(): BarPattern {
			return song.getPattern(channel, bar);
		}
		
		public function getCurrentInstrument(): int {
			var pattern: BarPattern = getCurrentPattern();
			return pattern == null ? 0 : pattern.instrument;
		}
	}
}
