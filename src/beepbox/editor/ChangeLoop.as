package beepbox.editor {
	import beepbox.synth.*;
	
	public class ChangeLoop extends Change {
		private var document: Document;
		private var oldStart: int;
		private var newStart: int;
		private var oldLength: int;
		private var newLength: int;
		public function ChangeLoop(document: Document, start: int, length: int) {
			super(false);
			this.document = document;
			oldStart = document.song.loopStart;
			newStart = start;
			oldLength = document.song.loopLength;
			newLength = length;
			if (oldStart != newStart || oldLength != newLength) {
				didSomething();
				redo();
			}
		}
		
		protected override function doForwards(): void {
			document.song.loopStart = newStart;
			document.song.loopLength = newLength;
			document.changed();
		}
		
		protected override function doBackwards(): void {
			document.song.loopStart = oldStart;
			document.song.loopLength = oldLength;
			document.changed();
		}
	}
}
