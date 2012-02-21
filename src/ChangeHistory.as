package {
	public class ChangeHistory {
		private var changes: Array;
		private var recentChange: Change;
		private var index: int;
		
		public function ChangeHistory() {
			changes = [];
			index = 0;
			recentChange = null;
		}
		
		public function record(change: Change): void {
			if (change.isNoop()) return;
			changes[index] = change;
			index++;
			changes.length = index;
			recentChange = change;
		}
		
		public function undo(): void {
			if (index <= 0) return;
			index--;
			var change: Change = changes[index];
			change.undo();
			recentChange = null;
		}
		
		public function redo(): void {
			if (index >= changes.length) return;
			var change: Change = changes[index];
			change.redo();
			index++;
		}
		
		public function getRecentChange(): Change {
			return recentChange;
		}
	}
}