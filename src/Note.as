package {
	public class Note {
		public var pins: Array;
		
		public function Note(pitch: int, length: int) {
			pins = [new NotePin(pitch, 0), new NotePin(pitch, length)];
		}
	}
}
