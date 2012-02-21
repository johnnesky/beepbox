package {
	public class Document extends Model {
		public var synth: Synth;
		public var history: ChangeHistory;
		public var scale: int;
		public var key: int;
		public var channelPatterns: Array;
		public var channelBars: Array;
		public var channelWaves: Array;
		public var channel: int;
		public var bar: int;
		public var loopStart: int;
		public var loopLength: int;
		public var tempo: int;
		public var beats: int;
		public var parts: int;
		
		private static const sixtyfour: Array = ["0","1","2","3","4","5","6","7","8","9","a","b","c","d","e","f","g","h","i","j","k","l","m","n","o","p","q","r","s","t","u","v","w","x","y","z","A","B","C","D","E","F","G","H","I","J","K","L","M","N","O","P","Q","R","S","T","U","V","W","X","Y","Z","_","~",];
		
		public function Document() {
			history = new ChangeHistory();
			synth = new Synth(this);
			initToDefault();
		}
		
		private function initToDefault(): void {
			channelPatterns = [
				[new BarPattern(this), new BarPattern(this), new BarPattern(this), new BarPattern(this), new BarPattern(this), new BarPattern(this), new BarPattern(this), new BarPattern(this)], 
				[new BarPattern(this), new BarPattern(this), new BarPattern(this), new BarPattern(this)], 
				[new BarPattern(this), new BarPattern(this), new BarPattern(this), new BarPattern(this)], 
			];
			channelBars = [
				[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
				[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
				[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
			];
			channelWaves = [1,1,1];
			channel = 0;
			bar = 0;
			scale = 0;
			key = Music.keyNames.length - 1;
			loopStart = 0;
			loopLength = Music.numBars;
			tempo = 1;
			beats = 8;
			parts = 4;
		}
		
		public function getBarPattern(channel: int, bar: int): BarPattern {
			return channelPatterns[channel][channelBars[channel][bar]];
		}
		
		public function toString(): String {
			var c: int;
			var result: String = "0=";
			
			result += "s" + sixtyfour[scale];
			result += "k" + sixtyfour[key];
			result += "y" + sixtyfour[channel];
			result += "x" + sixtyfour[bar];
			result += "l" + sixtyfour[loopStart];
			result += "e" + sixtyfour[loopLength];
			result += "t" + sixtyfour[tempo];
			result += "a" + sixtyfour[Music.beatCounts.indexOf(beats)];
			result += "r" + sixtyfour[Music.partCounts.indexOf(parts)];
			
			result += "w";
			for each (c in [0, 1, 2]) {
				result += sixtyfour[channelWaves[c]];
			}
			
			for each (c in [0, 1, 2]) {
				result += "b" + sixtyfour[c] + sixtyfour[channelBars[c].length];
				for each (var b: int in channelBars[c]) {
					result += sixtyfour[b];
				}
			}
			
			for each (c in [0, 1, 2]) {
				result += "p" + sixtyfour[c] + sixtyfour[channelPatterns[c].length];
				for each (var p: BarPattern in channelPatterns[c]) {
					
					var last: int = 0;
					for each (var t: Tone in p.tones) {
						if (t.start > last) {
							result += sixtyfour[0] + sixtyfour[t.start - last];
						}
						result += sixtyfour[t.notes.length];
						for each (var n: int in t.notes) {
							result += sixtyfour[n];
						}
						result += sixtyfour[t.pins.length-1];
						for (var i: int = 1; i < t.pins.length; i++) {
							var pin: TonePin = t.pins[i];
							result += sixtyfour[pin.interval < 0 ? pin.interval + Music.numNotes : pin.interval];
							result += sixtyfour[pin.time];
						}
						last = t.end;
					}
					if (last < beats * parts) {
						result += sixtyfour[0] + sixtyfour[beats * parts - last];
					}
				}
			}
			
			return result;
		}
		
		public function fromString(compressed: String): void {
			if (compressed.charAt(0) == "0" && compressed.charAt(1) == "=") {
				initToDefault();
				var charIndex: int = 1;
				while (charIndex < compressed.length) {
					var command: String = compressed.charAt(charIndex);
					var channel: int;
					var i: int;
					charIndex++;
					if (command == "s") {
						scale = sixtyfour.indexOf(compressed.charAt(charIndex));
						charIndex++;
					} else if (command == "k") {
						key = sixtyfour.indexOf(compressed.charAt(charIndex));
						charIndex++;
					} else if (command == "y") {
						channel = sixtyfour.indexOf(compressed.charAt(charIndex));
						charIndex++;
					} else if (command == "x") {
						bar = sixtyfour.indexOf(compressed.charAt(charIndex));
						charIndex++;
					} else if (command == "l") {
						loopStart = sixtyfour.indexOf(compressed.charAt(charIndex));
						charIndex++;
					} else if (command == "e") {
						loopLength = sixtyfour.indexOf(compressed.charAt(charIndex));
						charIndex++;
					} else if (command == "t") {
						tempo = sixtyfour.indexOf(compressed.charAt(charIndex));
						charIndex++;
					} else if (command == "a") {
						beats = Music.beatCounts[sixtyfour.indexOf(compressed.charAt(charIndex))];
						charIndex++;
					} else if (command == "r") {
						parts = Music.partCounts[sixtyfour.indexOf(compressed.charAt(charIndex))];
						charIndex++;
					} else if (command == "w") {
						for (i = 0; i < 3; i++) {
							channelWaves[i] = sixtyfour.indexOf(compressed.charAt(charIndex));
							charIndex++;
							if (channelWaves[i] >= Music.waveNames.length) channelWaves[i] = Music.waveNames.length - 1;
						}
					} else if (command == "b") {
						channel = sixtyfour.indexOf(compressed.charAt(charIndex));
						charIndex++;
						var barCount: int = sixtyfour.indexOf(compressed.charAt(charIndex));
						charIndex++;
						for (i = 0; i < barCount; i++) {
							channelBars[channel][i] = sixtyfour.indexOf(compressed.charAt(charIndex));
							charIndex++;
						}
					} else if (command == "p") {
						channel = sixtyfour.indexOf(compressed.charAt(charIndex));
						charIndex++;
						var patternCount: int = sixtyfour.indexOf(compressed.charAt(charIndex));
						charIndex++;
						for (i = 0; i < patternCount; i++) {
							var last: int = 0;
							var newTones: Array = [];
							while (last < beats * parts) {
								var noteCount: int = sixtyfour.indexOf(compressed.charAt(charIndex));
								charIndex++;
								if (noteCount == 0) {
									var restLength: int = sixtyfour.indexOf(compressed.charAt(charIndex));
									charIndex++;
									last += restLength;
								} else {
									var tone: Tone = new Tone(0,last,last);
									tone.notes = [];
									tone.pins.length = 1;
									while (noteCount > 0) {
										tone.notes.push(sixtyfour.indexOf(compressed.charAt(charIndex)));
										charIndex++;
										noteCount--;
									}
									var pinCount: int = sixtyfour.indexOf(compressed.charAt(charIndex));
									charIndex++;
									while (pinCount > 0) {
										var pin: TonePin = new TonePin(
											sixtyfour.indexOf(compressed.charAt(charIndex)),
											sixtyfour.indexOf(compressed.charAt(charIndex + 1))
										)
										charIndex += 2;
										if (pin.interval + tone.notes[0] >= Music.numNotes) {
											pin.interval -= Music.numNotes;
										}
										tone.pins.push(pin);
										tone.end = tone.start + pin.time;
										pinCount--;
									}
									last = tone.end;
									newTones.push(tone);
								}
							}
							channelPatterns[channel][i].tones = newTones;
						}
					}
				}
			}
		}
	}
}
