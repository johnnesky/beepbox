package {
	public class Document extends Model {
		public var synth: Synth;
		public var history: ChangeHistory;
		public var scale: int;
		public var key: int;
		public var channelPatterns: Array;
		public var channelBars: Array;
		public var channel: int;
		public var bar: int;
		public var loopStart: int;
		public var loopLength: int;
		public var tempo: int;
		
		public function Document() {
			history = new ChangeHistory();
			channelPatterns = [
				[new BarPattern(), new BarPattern(), new BarPattern(), new BarPattern(), new BarPattern(), new BarPattern(), new BarPattern(), new BarPattern()], 
				[new BarPattern(), new BarPattern(), new BarPattern(), new BarPattern()], 
				[new BarPattern(), new BarPattern(), new BarPattern(), new BarPattern()], 
			];
			channelBars = [
				[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
				[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
				[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
			];
			channel = 0;
			bar = 0;
			scale = 0;
			key = Music.keyNames.length - 1;
			loopStart = 0;
			loopLength = Music.numBars;
			tempo = 1;
			synth = new Synth(this);
		}
		
		public function getBarPattern(channel: int, bar: int): BarPattern {
			return channelPatterns[channel][channelBars[channel][bar]];
		}
		
		public function toString(): String {
			return "Hello world!";
		}
		
		public function fromString(): void {
			
		}
	}
}
