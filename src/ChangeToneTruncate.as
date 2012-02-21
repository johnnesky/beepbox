package {
	public class ChangeToneTruncate extends ChangeSequence {
		public function ChangeToneTruncate(bar: BarPattern, start: int, end: int, skipTone: Tone = null) {
			var i: int = 0;
			while (i < bar.tones.length) {
				var tone: Tone = bar.tones[i];
				if (tone == skipTone && skipTone != null) {
					i++;
				} else if (tone.end <= start) {
					i++;
				} else if (tone.start >= end) {
					break;
				} else if (tone.start < start) {
					append(new ChangeToneLength(bar, tone, tone.start, start));
					i++;
				} else if (tone.end > end) {
					append(new ChangeToneLength(bar, tone, end, tone.end));
					i++;
				} else {
					append(new ChangeToneAdded(bar, tone, i, true));
				}
			}
		}
	}
}
