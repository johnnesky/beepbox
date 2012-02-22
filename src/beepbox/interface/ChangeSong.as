package {
	public class ChangeSong extends Change {
		private var document: Document;
		private var oldSong: String;
		private var newSong: String;
		public var oldPatterns: Array;
		public var newPatterns: Array;
		public function ChangeSong(document: Document, song: String) {
			super(false);
			this.document = document;
			oldSong = document.song.toString();
			oldPatterns = document.song.channelPatterns;
			if (song != null) {
				newSong = song;
				document.song.fromString(newSong, false);
			} else {
				document.song.initToDefault(false);
				newSong = document.song.toString();
			}
			newPatterns = document.song.channelPatterns;
			document.changed();
			didSomething();
		}
		
		protected override function doForwards(): void {
			document.song.fromString(newSong, true);
			document.song.channelPatterns = newPatterns;
			document.changed();
		}
		
		protected override function doBackwards(): void {
			document.song.fromString(oldSong, true);
			document.song.channelPatterns = oldPatterns;
			document.changed();
		}
	}
}
