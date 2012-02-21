package {
	public class Tone {
		public var notes: Array;
		public var pins: Array;
		public var start: int;
		public var end: int;
		
		public function Tone(note: int, start: int, end: int) {
			notes = [note];
			pins = [new TonePin(0, 0), new TonePin(0, end - start)];
			this.start = start;
			this.end = end;
		}
	}
}
