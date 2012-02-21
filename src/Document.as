package {
	public class Document extends Model {
		public var history: ChangeHistory;
		public var scale: int;
		public var key: int;
		public var bar: Bar;
		
		public function Document() {
			history = new ChangeHistory();
			bar = new Bar();
			scale = 0;
			key = 12;
		}
	}
}
