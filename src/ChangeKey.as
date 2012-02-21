package {
	public class ChangeKey extends Change {
		private var document: Document;
		private var oldKey: int;
		private var newKey: int;
		public function ChangeKey(document: Document, key: int) {
			super(false);
			this.document = document;
			oldKey = document.key;
			newKey = key;
			if (oldKey != newKey) {
				didSomething();
				redo();
			}
		}
		
		protected override function doForwards(): void {
			document.key = newKey;
			document.changed();
		}
		
		protected override function doBackwards(): void {
			document.key = oldKey;
			document.changed();
		}
	}
}
