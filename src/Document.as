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
		public var showFifth: Boolean;
		public var showLetters: Boolean;
		public var showChannels: Boolean;
		
		private static const sixtyfour: Array = ["0","1","2","3","4","5","6","7","8","9","a","b","c","d","e","f","g","h","i","j","k","l","m","n","o","p","q","r","s","t","u","v","w","x","y","z","A","B","C","D","E","F","G","H","I","J","K","L","M","N","O","P","Q","R","S","T","U","V","W","X","Y","Z","-","_",];
		
		public function Document() {
			channel = 0;
			bar = 0;
			showFifth = false;
			showLetters = false;
			showChannels = false;
			history = new ChangeHistory();
			synth = new Synth(this);
			initToDefault(false);
			synth.play();
		}
		
		public function initToDefault(skipPatterns: Boolean): void {
			if (!skipPatterns) {
				channelPatterns = [
					[new BarPattern(this), new BarPattern(this), new BarPattern(this), new BarPattern(this), new BarPattern(this), new BarPattern(this), new BarPattern(this), new BarPattern(this)], 
					[new BarPattern(this), new BarPattern(this), new BarPattern(this), new BarPattern(this), new BarPattern(this), new BarPattern(this), new BarPattern(this), new BarPattern(this)], 
					[new BarPattern(this), new BarPattern(this), new BarPattern(this), new BarPattern(this), new BarPattern(this), new BarPattern(this), new BarPattern(this), new BarPattern(this)], 
					[new BarPattern(this), new BarPattern(this), new BarPattern(this), new BarPattern(this), new BarPattern(this), new BarPattern(this), new BarPattern(this), new BarPattern(this)], 
				];
			}
			channelBars = [
				[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
				[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
				[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
				[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
			];
			channelWaves = [1,1,1];
			scale = 0;
			key = Music.keyNames.length - 1;
			loopStart = 0;
			loopLength = Music.numBars;
			tempo = 1;
			beats = 8;
			parts = 4;
			changed();
		}
		
		public function getBarPattern(channel: int, bar: int): BarPattern {
			return channelPatterns[channel][channelBars[channel][bar]];
		}
		
		public function toString(): String {
			var c: int;
			var result: String = "1=";
			
			result += "s" + sixtyfour[scale];
			result += "k" + sixtyfour[key];
			result += "l" + sixtyfour[loopStart];
			result += "e" + sixtyfour[loopLength];
			result += "t" + sixtyfour[tempo];
			result += "a" + sixtyfour[Music.beatCounts.indexOf(beats)];
			result += "r" + sixtyfour[Music.partCounts.indexOf(parts)];
			
			result += "w";
			for each (c in [0, 1, 2]) {
				result += sixtyfour[channelWaves[c]];
			}
			
			for each (c in [0, 1, 2, 3]) {
				result += "b" + sixtyfour[c] + sixtyfour[channelBars[c].length];
				for each (var b: int in channelBars[c]) {
					result += sixtyfour[b];
				}
			}
			
			for each (c in [0, 1, 2, 3]) {
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
						result += sixtyfour[t.pins[0].volume];
						for (var i: int = 1; i < t.pins.length; i++) {
							var pin: TonePin = t.pins[i];
							result += sixtyfour[pin.interval < 0 ? pin.interval + (c == 3 ? Music.drumCount : Music.noteCount) : pin.interval];
							result += sixtyfour[pin.time];
							result += sixtyfour[pin.volume];
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
		
		public function fromString(compressed: String, skipPatterns: Boolean): void {
			var knownVersions: Array = ["0=", "1="];
			var version: String = compressed.substr(0, 2);
			if (knownVersions.indexOf(version) != -1) {
				initToDefault(skipPatterns);
				var charIndex: int = 2;
				while (charIndex < compressed.length) {
					var command: String = compressed.charAt(charIndex++);
					var channel: int;
					var i: int;
					if (command == "s") {
						scale = sixtyfour.indexOf(compressed.charAt(charIndex++));
					} else if (command == "k") {
						key = sixtyfour.indexOf(compressed.charAt(charIndex++));
					} else if (command == "l") {
						loopStart = sixtyfour.indexOf(compressed.charAt(charIndex++));
					} else if (command == "e") {
						loopLength = sixtyfour.indexOf(compressed.charAt(charIndex++));
					} else if (command == "t") {
						tempo = sixtyfour.indexOf(compressed.charAt(charIndex++));
					} else if (command == "a") {
						beats = Music.beatCounts[sixtyfour.indexOf(compressed.charAt(charIndex++))];
					} else if (command == "r") {
						parts = Music.partCounts[sixtyfour.indexOf(compressed.charAt(charIndex++))];
					} else if (command == "w") {
						for (i = 0; i < 3; i++) {
							channelWaves[i] = sixtyfour.indexOf(compressed.charAt(charIndex++));
							if (channelWaves[i] >= Music.waveNames.length) channelWaves[i] = Music.waveNames.length - 1;
						}
					} else if (command == "b") {
						channel = sixtyfour.indexOf(compressed.charAt(charIndex++));
						var barCount: int = sixtyfour.indexOf(compressed.charAt(charIndex++));
						for (i = 0; i < barCount; i++) {
							channelBars[channel][i] = sixtyfour.indexOf(compressed.charAt(charIndex++));
						}
					} else if (command == "p") {
						channel = sixtyfour.indexOf(compressed.charAt(charIndex++));
						var patternCount: int = sixtyfour.indexOf(compressed.charAt(charIndex++));
						for (i = 0; i < patternCount; i++) {
							var last: int = 0;
							var newTones: Array = [];
							while (last < beats * parts) {
								var toneNoteCount: int = sixtyfour.indexOf(compressed.charAt(charIndex++));
								if (toneNoteCount == 0) {
									var restLength: int = sixtyfour.indexOf(compressed.charAt(charIndex++));
									last += restLength;
								} else {
									var tone: Tone = new Tone(0,last,last,3);
									tone.notes = [];
									tone.pins.length = 1;
									while (toneNoteCount > 0) {
										tone.notes.push(sixtyfour.indexOf(compressed.charAt(charIndex++)));
										toneNoteCount--;
									}
									var pinCount: int = sixtyfour.indexOf(compressed.charAt(charIndex++));
									if (version != "0=") {
										tone.pins[0].volume = sixtyfour.indexOf(compressed.charAt(charIndex++));
									}
									while (pinCount > 0) {
										var pin: TonePin = new TonePin(
											sixtyfour.indexOf(compressed.charAt(charIndex++)),
											sixtyfour.indexOf(compressed.charAt(charIndex++)),
											version != "0=" ? sixtyfour.indexOf(compressed.charAt(charIndex++)) : 3
										);
										var noteCount: int = (channel == 3 ? Music.drumCount : Music.noteCount);
										if (pin.interval + tone.notes[0] >= noteCount) {
											pin.interval -= noteCount;
										}
										tone.pins.push(pin);
										tone.end = tone.start + pin.time;
										pinCount--;
									}
									last = tone.end;
									newTones.push(tone);
								}
							}
							if (!skipPatterns) {
								channelPatterns[channel][i].tones = newTones;
							}
						}
					}
				}
			}
		}
	}
}
