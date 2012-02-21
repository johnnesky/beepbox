package {
	public class ChangeBeats extends Change {
		private var document: Document;
		private var oldBeats: int;
		private var newBeats: int;
		private var sequence: ChangeSequence;
		public function ChangeBeats(document: Document, beats: int) {
			super(false);
			this.document = document;
			oldBeats = document.beats;
			newBeats = beats;
			if (oldBeats != newBeats) {
				if (oldBeats > newBeats) {
					sequence = new ChangeSequence();
					for (var i: int = 0; i < Music.numChannels; i++) {
						for (var j: int = 0; j < document.channelPatterns[i].length; j++) {
							sequence.append(new ChangeToneTruncate(document.channelPatterns[i][j], newBeats * document.parts, oldBeats * document.parts));
						}
					}
				}
				document.beats = newBeats;
				document.changed();
				didSomething();
			}
		}
		
		protected override function doForwards(): void {
			if (sequence != null) sequence.redo();
			document.beats = newBeats;
			document.changed();
		}
		
		protected override function doBackwards(): void {
			document.beats = oldBeats;
			if (sequence != null) sequence.undo();
			document.changed();
		}
	}
}
