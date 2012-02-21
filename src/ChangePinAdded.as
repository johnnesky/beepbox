package {
	public class ChangePinAdded extends Change {
		private var pattern: BarPattern;
		private var tone: Tone;
		private var pin: TonePin;
		private var index: int;
		public function ChangePinAdded(pattern: BarPattern, tone: Tone, pin: TonePin, index: int, deletion: Boolean = false) {
			super(deletion);
			this.pattern = pattern;
			this.tone = tone;
			this.pin = pin;
			this.index = index;
			didSomething();
			redo();
		}
		
		protected override function doForwards(): void {
			tone.pins.splice(index, 0, pin);
			pattern.doc.changed();
		}
		
		protected override function doBackwards(): void {
			tone.pins.splice(index, 1);
			pattern.doc.changed();
		}
	}
}
