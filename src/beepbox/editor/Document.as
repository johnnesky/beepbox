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
		public var song: Song;
		
		private var localSO: SharedObject;
		
		public function Document() {
			channel = 0;
			bar = 0;
			showFifth = false;
			showLetters = false;
			showChannels = false;
			history = new ChangeHistory();
			song = new Song();
			synth = new Synth(song);
			synth.play();
			
			try {
				localSO = SharedObject.getLocal("preferences");
			} catch(e: Error) {}
			
			if (localSO != null) {
				showFifth = localSO.data.showFifth;
				showLetters = localSO.data.showLetters;
				showChannels = localSO.data.showChannels;
			}
		}
		
		public function savePreferences(): void {
			if (localSO != null) {
				localSO.data.showFifth = showFifth;
				localSO.data.showLetters = showLetters;
				localSO.data.showChannels = showChannels;
				localSO.flush();
			}
		}
	}
}
