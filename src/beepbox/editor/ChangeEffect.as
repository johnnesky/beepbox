package beepbox.editor {
	import beepbox.synth.*;
	
	public class ChangeEffect extends Change {
		private var document: Document;
		private var oldEffect: int;
		private var newEffect: int;
		public function ChangeEffect(document: Document, effect: int) {
			super(false);
			this.document = document;
			oldEffect = document.song.channelEffects[document.channel];
			newEffect = effect;
			if (oldEffect != newEffect) {
				didSomething();
				redo();
			}
		}
		
		protected override function doForwards(): void {
			document.song.channelEffects[document.channel] = newEffect;
			document.changed();
		}
		
		protected override function doBackwards(): void {
			document.song.channelEffects[document.channel] = oldEffect;
			document.changed();
		}
	}
}
