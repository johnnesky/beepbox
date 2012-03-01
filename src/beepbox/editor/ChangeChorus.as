package beepbox.editor {
	import beepbox.synth.*;
	
	public class ChangeChorus extends Change {
		private var document: Document;
		private var oldChorus: int;
		private var newChorus: int;
		public function ChangeChorus(document: Document, chorus: int) {
			super(false);
			this.document = document;
			oldChorus = document.song.channelChorus[document.channel];
			newChorus = chorus;
			if (oldChorus != newChorus) {
				didSomething();
				redo();
			}
		}
		
		protected override function doForwards(): void {
			document.song.channelChorus[document.channel] = newChorus;
			document.changed();
		}
		
		protected override function doBackwards(): void {
			document.song.channelChorus[document.channel] = oldChorus;
			document.changed();
		}
	}
}
