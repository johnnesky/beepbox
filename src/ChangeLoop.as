package {
	public class ChangeLoop extends Change {
		private var document: Document;
		private var oldStart: int;
		private var newStart: int;
		private var oldLength: int;
		private var newLength: int;
		public function ChangeLoop(document: Document, start: int, length: int) {
			super(false);
			this.document = document;
			oldStart = document.loopStart;
			newStart = start;
			oldLength = document.loopLength;
			newLength = length;
			if (oldStart != newStart || oldLength != newLength) {
				didSomething();
				redo();
			}
		}
		
		protected override function doForwards(): void {
			document.loopStart = newStart;
			document.loopLength = newLength;
			document.changed();
		}
		
		protected override function doBackwards(): void {
			document.loopStart = oldStart;
			document.loopLength = oldLength;
			document.changed();
		}
	}
}
