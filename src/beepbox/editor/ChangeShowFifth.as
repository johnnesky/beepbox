package beepbox.editor {
	import beepbox.synth.*;
	
	public class ChangeShowFifth extends Change {
		private var document: Document;
		public function ChangeShowFifth(document: Document) {
			super(false);
			this.document = document;
			didSomething();
			redo();
		}
		
		protected override function doForwards(): void {
			document.showFifth = !document.showFifth;
			document.changed();
		}
		
		protected override function doBackwards(): void {
			document.showFifth = !document.showFifth;
			document.changed();
		}
	}
}
