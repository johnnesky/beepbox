package {
	public class BarPattern {
		
		public var doc: Document;
		public var tones: Array;
		
		public function BarPattern(doc: Document) {
			this.doc = doc;
			tones = [];
			//tones = [new Tone(12, 0, 8)];
			//tones[0].pins = [new TonePin(0, 0), new TonePin(0, 3), new TonePin(2, 4), new TonePin(2, 8)];
		}
	}
}
