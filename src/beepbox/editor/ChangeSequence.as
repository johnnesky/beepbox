package beepbox.editor {
	import beepbox.synth.*;
	
	public class ChangeSequence extends Change {
		private var changes: Array;
		public function ChangeSequence(changes: Array = null) {
			super(false);
			if (changes == null) {
				this.changes = [];
			} else {
				this.changes = changes.concat();
			}
		}
		
		public final function append(change: Change): void {
			if (change.isNoop()) return;
			changes[changes.length] = change;
			didSomething();
		}
		
		/*
		// WARNING: prepend is almost always a bad idea. Know what you're doing.
		protected final function prepend(change: Change): void {
			if (change.didNothing) return;
			changes.splice(0,0,change);
			didSomething();
		}
		*/
		
		protected override final function doForwards(): void {
			for (var i: int = 0; i < changes.length; i++) {
				changes[i].redo();
			}
		}
		
		protected override final function doBackwards(): void {
			for (var i: int = changes.length-1; i >= 0 ; i--) {
				changes[i].undo();
			}
		}
	}
}
