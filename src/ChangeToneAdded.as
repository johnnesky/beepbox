package {
	public class ChangeToneAdded extends Change {
		private var bar: Bar;
		private var tone: Tone;
		private var index: int;
		public function ChangeToneAdded(bar: Bar, tone: Tone, index: int, deletion: Boolean = false) {
			super(deletion);
			this.bar = bar;
			this.tone = tone;
			this.index = index;
			didSomething();
			redo();
		}
		
		protected override function doForwards(): void {
			bar.tones.splice(index, 0, tone);
			bar.changed();
		}
		
		protected override function doBackwards(): void {
			bar.tones.splice(index, 1);
			bar.changed();
		}
	}
}
