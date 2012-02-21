package {
	public class ChangeTempo extends Change {
		private var document: Document;
		private var oldTempo: int;
		private var newTempo: int;
		public function ChangeTempo(document: Document, tempo: int) {
			super(false);
			this.document = document;
			oldTempo = document.tempo;
			newTempo = tempo;
			if (oldTempo != newTempo) {
				didSomething();
				redo();
			}
		}
		
		protected override function doForwards(): void {
			document.tempo = newTempo;
			document.changed();
		}
		
		protected override function doBackwards(): void {
			document.tempo = oldTempo;
			document.changed();
		}
	}
}
