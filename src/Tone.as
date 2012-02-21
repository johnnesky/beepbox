package {
	public class Tone {
		public var notes: Array;
		public var start: int;
		public var end: int;
		
		public function Tone(pitch: int, start: int, end: int) {
			notes = [new Note(pitch, end - start)];
			this.start = start;
			this.end = end;
		}
	}
}
