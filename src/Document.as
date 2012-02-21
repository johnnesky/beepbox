package {
	public class Document {
		public var history: ChangeHistory;
		public var bar: Bar;
		
		public function Document() {
			history = new ChangeHistory();
			bar = new Bar();
		}
	}
}
