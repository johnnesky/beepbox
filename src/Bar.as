package {
	public class Bar extends Model {
		public static const numBeats: int = 32;
		public static const numPitches: int = 16;
		public static const pitches: Array = [42,44,46,49,51,54,56,58,61,63,66,68,70,73,75,78,];
		
		public var tones: Array;
		
		public function Bar() {
			tones = [new Tone(6, 4, 10)];

			tones[0].notes[0].pins = [new NotePin(6, 0), new NotePin(6, 2), new NotePin(7, 4), new NotePin(7, 6)];
		}
	}
}
