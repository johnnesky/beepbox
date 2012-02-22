package beepbox.editor {
	import beepbox.synth.*;
	
	public class Document extends Model {
		private static const latestVersion: int = 2;
		
		public var synth: Synth;
		public var history: ChangeHistory;
		public var channel: int;
		public var bar: int;
		public var showFifth: Boolean;
		public var showLetters: Boolean;
		public var showChannels: Boolean;
		public var song: Song;
		
		public function Document() {
			channel = 0;
			bar = 0;
			showFifth = false;
			showLetters = false;
			showChannels = false;
			history = new ChangeHistory();
			song = new Song();
			synth = new Synth(song);
			synth.play();
		}
	}
}
