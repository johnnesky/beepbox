package beepbox.editor {
	
	public class Change {
		private var reversed: Boolean;
		private var noop: Boolean;
		private var doneForwards: Boolean;
		public function Change(reversed: Boolean) {
			this.reversed = reversed;
			doneForwards = !reversed;
			noop = true;
		}
		
		protected final function didSomething(): void {
			noop = false;
		}
		
		public final function isNoop(): Boolean {
			return noop;
		}
		
		public final function undo(): void {
			if (reversed) {
				doForwards();
				doneForwards = true;
			} else {
				doBackwards();
				doneForwards = false;
			}
		}
		
		public final function redo(): void {
			if (reversed) {
				doBackwards();
				doneForwards = false;
			} else {
				doForwards();
				doneForwards = true;
			}
		}
		
		// isDoneForwards() returns whether or not the Change was most recently 
		// performed forwards or backwards. If the change created something, do not 
		// delete it in the change destructor unless the Change was performed 
		// backwards: 
		protected final function isDoneForwards(): Boolean {
			return doneForwards;
		}
		
		protected function doForwards(): void {
			throw new Error("Change.doForwards(): Override me.");
		}
		
		protected function doBackwards(): void {
			throw new Error("Change.doBackwards(): Override me.");
		}
	}
}
