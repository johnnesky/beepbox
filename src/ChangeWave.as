package {
	public class ChangeWave extends Change {
		private var document: Document;
		private var oldWave: int;
		private var newWave: int;
		public function ChangeWave(document: Document, wave: int) {
			super(false);
			this.document = document;
			oldWave = document.channelWaves[document.channel];
			newWave = wave;
			if (oldWave != newWave) {
				didSomething();
				redo();
			}
		}
		
		protected override function doForwards(): void {
			document.channelWaves[document.channel] = newWave;
			document.changed();
		}
		
		protected override function doBackwards(): void {
			document.channelWaves[document.channel] = oldWave;
			document.changed();
		}
	}
}
