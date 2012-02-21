package {
	public class ChangeBarPattern extends Change {
		private var document: Document;
		private var oldPattern: int;
		private var newPattern: int;
		public function ChangeBarPattern(document: Document, pattern: int) {
			super(false);
			this.document = document;
			oldPattern = document.channelBars[document.channel][document.bar];
			newPattern = pattern;
			if (oldPattern != newPattern && pattern < document.channelPatterns[document.channel].length) {
				didSomething();
				redo();
			}
		}
		
		protected override function doForwards(): void {
			document.channelBars[document.channel][document.bar] = newPattern;
			document.changed();
		}
		
		protected override function doBackwards(): void {
			document.channelBars[document.channel][document.bar] = oldPattern;
			document.changed();
		}
	}
}
