package {
	public class ChangeBeats extends Change {
		private var document: Document;
		private var oldBeats: int;
		private var newBeats: int;
		private var sequence: ChangeSequence;
		public function ChangeBeats(document: Document, beats: int) {
			super(false);
			this.document = document;
			oldBeats = document.song.beats;
			newBeats = beats;
			if (oldBeats != newBeats) {
				if (oldBeats > newBeats) {
					sequence = new ChangeSequence();
					for (var i: int = 0; i < Music.numChannels; i++) {
						for (var j: int = 0; j < document.song.channelPatterns[i].length; j++) {
							sequence.append(new ChangeToneTruncate(document, document.song.channelPatterns[i][j], newBeats * document.song.parts, oldBeats * document.song.parts));
						}
					}
				}
				document.song.beats = newBeats;
				document.changed();
				didSomething();
			}
		}
		
		protected override function doForwards(): void {
			if (sequence != null) sequence.redo();
			document.song.beats = newBeats;
			document.changed();
		}
		
		protected override function doBackwards(): void {
			document.song.beats = oldBeats;
			if (sequence != null) sequence.undo();
			document.changed();
		}
	}
}
