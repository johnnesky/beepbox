package beepbox.editor {
	import beepbox.synth.*;
	
	public class ChangeFilter extends Change {
		private var document: Document;
		private var oldFilter: int;
		private var newFilter: int;
		public function ChangeFilter(document: Document, filter: int) {
			super(false);
			this.document = document;
			oldFilter = document.song.channelFilters[document.channel];
			newFilter = filter;
			if (oldFilter != newFilter) {
				didSomething();
				redo();
			}
		}
		
		protected override function doForwards(): void {
			document.song.channelFilters[document.channel] = newFilter;
			document.changed();
		}
		
		protected override function doBackwards(): void {
			document.song.channelFilters[document.channel] = oldFilter;
			document.changed();
		}
	}
}
