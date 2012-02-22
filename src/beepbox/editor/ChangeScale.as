package beepbox.editor {
	import beepbox.synth.*;
	
	public class ChangeScale extends Change {
		private var document: Document;
		private var oldScale: int;
		private var newScale: int;
		public function ChangeScale(document: Document, scale: int) {
			super(false);
			this.document = document;
			oldScale = document.song.scale;
			newScale = scale;
			if (oldScale != newScale) {
				didSomething();
				redo();
			}
		}
		
		protected override function doForwards(): void {
			document.song.scale = newScale;
			document.changed();
		}
		
		protected override function doBackwards(): void {
			document.song.scale = oldScale;
			document.changed();
		}
	}
}
