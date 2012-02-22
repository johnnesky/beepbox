package {
	public class ChangeHistory extends Model {
		private var changes: Array;
		private var recentChange: Change;
		private var index: int;
		
		public function ChangeHistory() {
			changes = [];
			index = 0;
			recentChange = null;
			changed();
		}
		
		public function canUndo(): Boolean {
			return index > 0;
		}
		
		public function canRedo(): Boolean {
			return index < changes.length;
		}
		
		public function record(change: Change): void {
			if (change.isNoop()) return;
			changes[index] = change;
			index++;
			changes.length = index;
			recentChange = change;
			changed();
		}
		
		public function undo(): void {
			if (index <= 0) return;
			index--;
			var change: Change = changes[index];
			change.undo();
			recentChange = null;
			changed();
		}
		
		public function redo(): void {
			if (index >= changes.length) return;
			var change: Change = changes[index];
			change.redo();
			index++;
			changed();
		}
		
		public function getRecentChange(): Change {
			return recentChange;
		}
	}
}