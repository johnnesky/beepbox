package {
	public class Bar extends Model {
		public static const numBeats: int = 32;
		public static const numNotes: int = 37;
		
		public var tones: Array;
		
		public function Bar() {
			//tones = [];
			tones = [new Tone(12, 0, 8)];
			tones[0].pins = [new TonePin(0, 0), new TonePin(0, 3), new TonePin(2, 4), new TonePin(2, 8)];
		}
	}
}
