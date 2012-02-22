package beepbox.editor {
	import beepbox.synth.*;
	
	public class ChangeShowChannels extends Change {
		private var document: Document;
		public function ChangeShowChannels(document: Document) {
			super(false);
			this.document = document;
			didSomething();
			redo();
		}
		
		protected override function doForwards(): void {
			document.showChannels = !document.showChannels;
			document.changed();
		}
		
		protected override function doBackwards(): void {
			document.showChannels = !document.showChannels;
			document.changed();
		}
	}
}
