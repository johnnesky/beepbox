package {
	public class ChangeNoteAdded extends Change {
		private var bar: Bar;
		private var tone: Tone;
		private var note: Note;
		private var index: int;
		public function ChangeNoteAdded(bar: Bar, tone: Tone, note: Note, index: int, deletion: Boolean = false) {
			super(deletion);
			this.bar = bar;
			this.tone = tone;
			this.note = note;
			this.index = index;
			didSomething();
			redo();
		}
		
		protected override function doForwards(): void {
			tone.notes.splice(index, 0, note);
			bar.changed();
		}
		
		protected override function doBackwards(): void {
			tone.notes.splice(index, 1);
			bar.changed();
		}
	}
}
