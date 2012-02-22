package beepbox.editor {
	import beepbox.synth.*;
	
	public class ChangeNoteAdded extends Change {
		private var document: Document;
		private var pattern: BarPattern;
		private var tone: Tone;
		private var note: int;
		private var index: int;
		public function ChangeNoteAdded(document: Document, pattern: BarPattern, tone: Tone, note: int, index: int, deletion: Boolean = false) {
			super(deletion);
			this.document = document;
			this.pattern = pattern;
			this.tone = tone;
			this.note = note;
			this.index = index;
			didSomething();
			redo();
		}
		
		protected override function doForwards(): void {
			tone.notes.splice(index, 0, note);
			document.changed();
		}
		
		protected override function doBackwards(): void {
			tone.notes.splice(index, 1);
			document.changed();
		}
	}
}
