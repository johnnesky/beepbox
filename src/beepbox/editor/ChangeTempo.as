package {
	public class ChangeTempo extends Change {
		private var document: Document;
		private var oldTempo: int;
		private var newTempo: int;
		public function ChangeTempo(document: Document, tempo: int) {
			super(false);
			this.document = document;
			oldTempo = document.song.tempo;
			newTempo = tempo;
			if (oldTempo != newTempo) {
				didSomething();
				redo();
			}
		}
		
		protected override function doForwards(): void {
			document.song.tempo = newTempo;
			document.changed();
		}
		
		protected override function doBackwards(): void {
			document.song.tempo = oldTempo;
			document.changed();
		}
	}
}
