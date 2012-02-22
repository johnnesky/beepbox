package {
	public class Tone {
		public var notes: Array;
		public var pins: Array;
		public var start: int;
		public var end: int;
		
		public function Tone(note: int, start: int, end: int, volume: int, fadeout: Boolean = false) {
			notes = [note];
			pins = [new TonePin(0, 0, volume), new TonePin(0, end - start, fadeout ? 0 : volume)];
			this.start = start;
			this.end = end;
		}
	}
}
