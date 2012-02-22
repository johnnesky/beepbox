package beepbox.editor {
	import beepbox.synth.*;
	
	public class ChangeKey extends Change {
		private var document: Document;
		private var oldKey: int;
		private var newKey: int;
		public function ChangeKey(document: Document, key: int) {
			super(false);
			this.document = document;
			oldKey = document.song.key;
			newKey = key;
			if (oldKey != newKey) {
				didSomething();
				redo();
			}
		}
		
		protected override function doForwards(): void {
			document.song.key = newKey;
			document.changed();
		}
		
		protected override function doBackwards(): void {
			document.song.key = oldKey;
			document.changed();
		}
	}
}
