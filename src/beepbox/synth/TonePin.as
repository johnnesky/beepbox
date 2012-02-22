package beepbox.synth {
	public class TonePin {
		public var interval: int;
		public var time: int;
		public var volume: int;
		
		public function TonePin(interval: int, time: int, volume: int) {
			this.interval = interval;
			this.time = time;
			this.volume = volume;
		}
	}
}
