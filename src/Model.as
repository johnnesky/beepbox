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
				dirty = true;
				waitingForFrame.push(this);
				/*for each (var parentModel: Model in parentModels) {
					parentModel.changed();
				}*/
			}
		}
		
		private function update(): void {
			dirty = false;
			for each (var watcher: Function in watchers.concat()) {
				watcher();
			}
		}
		
		public static function updateAll(): void {
			for each (var model: Model in waitingForFrame.concat()) {
				model.update();
			}
			waitingForFrame.length = 0;
		}
	}
}
