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
			oldSong = document.toString();
			oldPatterns = document.channelPatterns;
			if (song != null) {
				newSong = song;
				document.fromString(newSong, false);
			} else {
				document.initToDefault(false);
				newSong = document.toString();
			}
			newPatterns = document.channelPatterns;
			didSomething();
		}
		
		protected override function doForwards(): void {
			document.fromString(newSong, true);
			document.channelPatterns = newPatterns;
			document.changed();
		}
		
		protected override function doBackwards(): void {
			document.fromString(oldSong, true);
			document.channelPatterns = oldPatterns;
			document.changed();
		}
	}
}
