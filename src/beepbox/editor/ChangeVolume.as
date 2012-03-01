package beepbox.editor {
	import beepbox.synth.*;
	
	public class ChangeVolume extends Change {
		private var document: Document;
		private var oldVolume: int;
		private var newVolume: int;
		public function ChangeVolume(document: Document, volume: int) {
			super(false);
			this.document = document;
			oldVolume = document.song.channelVolumes[document.channel];
			newVolume = volume;
			if (oldVolume != newVolume) {
				didSomething();
				redo();
			}
		}
		
		protected override function doForwards(): void {
			document.song.channelVolumes[document.channel] = newVolume;
			document.changed();
		}
		
		protected override function doBackwards(): void {
			document.song.channelVolumes[document.channel] = oldVolume;
			document.changed();
		}
	}
}
