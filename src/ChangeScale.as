package {
	public class ChangeScale extends Change {
		private var document: Document;
		private var oldScale: int;
		private var newScale: int;
		public function ChangeScale(document: Document, scale: int) {
			super(false);
			this.document = document;
			oldScale = document.scale;
			newScale = scale;
			if (oldScale != newScale) {
				didSomething();
				redo();
			}
		}
		
		protected override function doForwards(): void {
			document.scale = newScale;
			document.changed();
		}
		
		protected override function doBackwards(): void {
			document.scale = oldScale;
			document.changed();
		}
	}
}
