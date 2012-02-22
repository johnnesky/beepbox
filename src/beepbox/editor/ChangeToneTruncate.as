package beepbox.editor {
	import beepbox.synth.*;
	
	public class ChangeToneTruncate extends ChangeSequence {
		public function ChangeToneTruncate(document: Document, bar: BarPattern, start: int, end: int, skipTone: Tone = null) {
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
					append(new ChangeToneLength(document, bar, tone, tone.start, start));
					i++;
				} else if (tone.end > end) {
					append(new ChangeToneLength(document, bar, tone, end, tone.end));
					i++;
				} else {
					append(new ChangeToneAdded(document, bar, tone, i, true));
				}
			}
		}
	}
}
