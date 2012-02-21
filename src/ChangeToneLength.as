package {
	public class ChangeToneLength extends Change {
		private var bar: BarPattern;
		private var tone: Tone;
		private var oldStart: int;
		private var newStart: int;
		private var oldEnd: int;
		private var newEnd: int;
		private var oldPins: Array;
		private var newPins: Array;
		public function ChangeToneLength(bar: BarPattern, tone: Tone, newStart: int, newEnd: int) {
			super(false);
			this.bar = bar;
			this.tone = tone;
			oldStart = tone.start;
			oldEnd = tone.end;
			this.newStart = newStart;
			this.newEnd = newEnd;
			oldPins = tone.pins;
			newPins = [];
			
			for each (var oldPin: TonePin in tone.pins) {
				newPins.push(new TonePin(oldPin.interval, oldPin.time + oldStart - newStart, oldPin.volume));
			}
			
			if (oldStart > newStart) {
				newPins[0].time = 0;
			}
			if (oldEnd < newEnd) {
				newPins[newPins.length - 1].time = newEnd - newStart;
			}
			if (oldStart < newStart) {
				while (newPins[1].time <= 0) {
					newPins.shift();
				}
				newPins[0].time = 0;
			}
			if (oldEnd > newEnd) {
				while (newPins[newPins.length-2].time >= newEnd - newStart) {
					newPins.pop();
				}
				newPins[newPins.length-1].time = newEnd - newStart;
			}
			
			doForwards();
			didSomething();
			redo();
		}
		
		protected override function doForwards(): void {
			tone.pins = newPins;
			tone.start = newStart;
			tone.end = newEnd;
			bar.doc.changed();
		}
		
		protected override function doBackwards(): void {
			tone.pins = oldPins;
			tone.start = oldStart;
			tone.end = oldEnd;
			bar.doc.changed();
		}
	}
}
