package {
	public class ChangeParts extends Change {
		private var document: Document;
		private var oldParts: int;
		private var newParts: int;
		private var sequence: ChangeSequence;
		public function ChangeParts(document: Document, parts: int) {
			super(false);
			this.document = document;
			oldParts = document.parts;
			newParts = parts;
			if (oldParts != newParts) {
				sequence = new ChangeSequence();
				for (var i: int = 0; i < Music.numChannels; i++) {
					for (var j: int = 0; j < document.channelPatterns[i].length; j++) {
						sequence.append(new ChangeRhythm(document.channelPatterns[i][j], oldParts, newParts));
					}
				}
				document.parts = newParts;
				document.changed();
				didSomething();
			}
		}
		
		protected override function doForwards(): void {
			if (sequence != null) sequence.redo();
			document.parts = newParts;
			document.changed();
		}
		
		protected override function doBackwards(): void {
			document.parts = oldParts;
			if (sequence != null) sequence.undo();
			document.changed();
		}
	}
}
