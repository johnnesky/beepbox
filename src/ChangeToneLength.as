package {
	public class ChangeToneLength extends Change {
		private var bar: Bar;
		private var tone: Tone;
		private var oldStart: int;
		private var newStart: int;
		private var oldEnd: int;
		private var newEnd: int;
		private var oldNotes: Array;
		private var newNotes: Array;
		public function ChangeToneLength(bar: Bar, tone: Tone, newStart: int, newEnd: int) {
			super(false);
			this.bar = bar;
			this.tone = tone;
			oldStart = tone.start;
			oldEnd = tone.end;
			this.newStart = newStart;
			this.newEnd = newEnd;
			oldNotes = tone.notes;
			newNotes = [];
			
			//var i: int;
			for each (var oldNote: Note in oldNotes) {
				var newNote: Note = new Note(0,0);
				newNote.pins = [];
				//var newPin: NotePin;
				
				for each (var oldPin: NotePin in oldNote.pins) {
					newNote.pins.push(new NotePin(oldPin.pitch, oldPin.time + oldStart - newStart));
				}
				
				if (oldStart > newStart) {
					newNote.pins[0].time = 0;
				} else if (oldStart < newStart) {
					while (newNote.pins[1].time <= 0) {
						newNote.pins.shift();
					}
					newNote.pins[0].time = 0;
				}
				
				if (oldEnd < newEnd) {
					newNote.pins[newNote.pins.length - 1].time = 0;
				} else if (oldEnd > newEnd) {
					while (newNote.pins[newNote.pins.length-2].time >= newEnd - newStart) {
						newNote.pins.pop();
					}
					newNote.pins[newNote.pins.length-1].time = newEnd - newStart;
				}
				
				newNotes.push(newNote);
			}
			
			doForwards();
			didSomething();
			redo();
		}
		
		protected override function doForwards(): void {
			tone.notes = newNotes;
			tone.start = newStart;
			tone.end = newEnd;
			bar.changed();
		}
		
		protected override function doBackwards(): void {
			tone.notes = oldNotes;
			tone.start = oldStart;
			tone.end = oldEnd;
			bar.changed();
		}
	}
}
