package {
	public class Model {
		private static const waitingForFrame: Array = [];
		private const watchers: Array = [];
		//private const parentModels: Array = [];
		private var dirty: Boolean = false;
		
		public function watch(watcher: Function): void {
			if (watchers.indexOf(watcher) == -1) {
				watchers.push(watcher);
			}
		}
		
		public function unwatch(watcher: Function): void {
			var index: int = watchers.indexOf(watcher);
			if (index != -1) {
				watchers.splice(index, 1);
			}
		}
		
		public function changed(): void {
			if (dirty == false) {
				waitingForFrame.push(this);
				dirty = true;
				/*for each (var parentModel: Model in parentModels) {
					parentModel.changed();
				}*/
			}
		}
		
		private function update(): void {
			for each (var watcher: Function in watchers) {
				watcher();
			}
			dirty = false;
		}
		
		public static function updateAll(): void {
			for each (var model: Model in waitingForFrame) {
				model.update();
			}
			waitingForFrame.length = 0;
		}
	}
}
