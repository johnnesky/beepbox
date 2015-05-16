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
	
	public class ChangeAttack extends Change {
		private var document: Document;
		private var oldAttack: int;
		private var newAttack: int;
		public function ChangeAttack(document: Document, attack: int) {
			super(false);
			this.document = document;
			oldAttack = document.song.instrumentAttacks[document.channel][document.getCurrentInstrument()];
			newAttack = attack;
			if (oldAttack != newAttack) {
				didSomething();
				redo();
			}
		}
		
		protected override function doForwards(): void {
			document.song.instrumentAttacks[document.channel][document.getCurrentInstrument()] = newAttack;
			document.changed();
		}
		
		protected override function doBackwards(): void {
			document.song.instrumentAttacks[document.channel][document.getCurrentInstrument()] = oldAttack;
			document.changed();
		}
	}
}
