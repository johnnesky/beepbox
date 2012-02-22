package beepbox.editor {
	import beepbox.synth.*;
	
	public class ChangeFilterDecay extends Change {
		private var document: Document;
		private var oldFilterDecay: int;
		private var newFilterDecay: int;
		public function ChangeFilterDecay(document: Document, filterDecay: int) {
			super(false);
			this.document = document;
			oldFilterDecay = document.song.channelFilterDecays[document.channel];
			newFilterDecay = filterDecay;
			if (oldFilterDecay != newFilterDecay) {
				didSomething();
				redo();
			}
		}
		
		protected override function doForwards(): void {
			document.song.channelFilterDecays[document.channel] = newFilterDecay;
			document.changed();
		}
		
		protected override function doBackwards(): void {
			document.song.channelFilterDecays[document.channel] = oldFilterDecay;
			document.changed();
		}
	}
}
