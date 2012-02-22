package beepbox.editor {
	import beepbox.synth.*;
	
	public class ChangeShowLetters extends Change {
		private var document: Document;
		public function ChangeShowLetters(document: Document) {
			super(false);
			this.document = document;
			didSomething();
			redo();
		}
		
		protected override function doForwards(): void {
			document.showLetters = !document.showLetters;
			document.changed();
		}
		
		protected override function doBackwards(): void {
			document.showLetters = !document.showLetters;
			document.changed();
		}
	}
}
