package {
	public class ChangeFragment extends Change {
		private var document: Document;
		private var oldFragment: String;
		private var newFragment: String;
		public function ChangeFragment(document: Document, fragment: String) {
			super(false);
			this.document = document;
			oldFragment = document.toString();
			newFragment = fragment;
			if (oldFragment != newFragment) {
				didSomething();
				redo();
			}
		}
		
		protected override function doForwards(): void {
			document.fromString(newFragment);
			document.changed();
		}
		
		protected override function doBackwards(): void {
			document.fromString(oldFragment);
			document.changed();
		}
	}
}
