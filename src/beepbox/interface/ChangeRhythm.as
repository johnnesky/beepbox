package {
	public class ChangeRhythm extends ChangeSequence {
		public function ChangeRhythm(document: Document, bar: BarPattern, oldParts: int, newParts: int) {
			var difference: int = Math.abs(newParts - oldParts);
			var i: int = 0;
			while (i < bar.tones.length) {
				var tone: Tone = bar.tones[i];
				var buffer: int = 0;
				for (var j: int = tone.start; j < tone.end; j++) {
					if (j % oldParts >= oldParts - difference) buffer++;
				}
				var beat: int = tone.start / oldParts;
				var part: int = tone.start % oldParts;
				if (part >= newParts) {
					part = 0;
					beat++;
				}
				var start: int = beat * newParts + part;
				if (newParts < oldParts) {
					if (buffer == tone.end - tone.start) {
						append(new ChangeToneAdded(document, bar, tone, i, true));
					} else {
						append(new ChangeToneLength(document, bar, tone, start, start + tone.end - tone.start - buffer));
						i++;
					}
				} else {
					append(new ChangeToneLength(document, bar, tone, start, start + tone.end - tone.start + buffer));
					i++;
				}
			}
		}
	}
}
