package {
	public class ChangeChannelBar extends Change {
		private var document: Document;
		private var oldChannel: int;
		private var newChannel: int;
		private var oldBar: int;
		private var newBar: int;
		public function ChangeChannelBar(document: Document, channel: int, bar: int) {
			super(false);
			this.document = document;
			oldChannel = document.channel;
			newChannel = channel;
			oldBar = document.bar;
			newBar = bar;
			if (oldChannel != newChannel || oldBar != newBar) {
				didSomething();
				redo();
			}
		}
		
		protected override function doForwards(): void {
			document.channel = newChannel;
			document.bar = newBar;
			document.changed();
		}
		
		protected override function doBackwards(): void {
			document.channel = oldChannel;
			document.bar = oldBar;
			document.changed();
		}
	}
}
