package beepbox.synth {
	public class Song {
		private static const latestVersion: int = 2;
		
		public var scale: int;
		public var key: int;
		public var tempo: int;
		public var beats: int;
		public var parts: int;
		public var loopStart: int;
		public var loopLength: int;
		public var channelPatterns: Array;
		public var channelBars: Array;
		public var channelWaves: Array;
		public var channelFilters: Array;
		public var channelEffects: Array;
		public var channelChorus: Array;
		
		private static const sixtyfour: Array = ["0","1","2","3","4","5","6","7","8","9","a","b","c","d","e","f","g","h","i","j","k","l","m","n","o","p","q","r","s","t","u","v","w","x","y","z","A","B","C","D","E","F","G","H","I","J","K","L","M","N","O","P","Q","R","S","T","U","V","W","X","Y","Z",".","_",];
		
		public function Song(string: String = null) {
			if (string != null) {
				fromString(string, false);
			} else {
				initToDefault(false);
			}
		}
		
		public function initToDefault(skipPatterns: Boolean = false): void {
			if (!skipPatterns) {
				channelPatterns = [
					[new BarPattern(), new BarPattern(), new BarPattern(), new BarPattern(), new BarPattern(), new BarPattern(), new BarPattern(), new BarPattern()], 
					[new BarPattern(), new BarPattern(), new BarPattern(), new BarPattern(), new BarPattern(), new BarPattern(), new BarPattern(), new BarPattern()], 
					[new BarPattern(), new BarPattern(), new BarPattern(), new BarPattern(), new BarPattern(), new BarPattern(), new BarPattern(), new BarPattern()], 
					[new BarPattern(), new BarPattern(), new BarPattern(), new BarPattern(), new BarPattern(), new BarPattern(), new BarPattern(), new BarPattern()], 
				];
			}
			channelBars = [
				[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
				[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
				[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
				[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
			];
			channelWaves = [1,1,1];
			channelFilters = [0,0,0];
			channelEffects = [0,0,0];
			channelChorus  = [0,0,0];
			scale = 0;
			key = Music.keyNames.length - 1;
			loopStart = 0;
			loopLength = Music.numBars;
			tempo = 1;
			beats = 8;
			parts = 4;
		}
		
		public function toString(): String {
			var channel: int;
			var i: int;
			var bits: BitField;
			var result: String = "#";
			
			result += sixtyfour[latestVersion];
			result += "s" + sixtyfour[scale];
			result += "k" + sixtyfour[key];
			result += "l" + sixtyfour[loopStart];
			result += "e" + sixtyfour[loopLength];
			result += "t" + sixtyfour[tempo];
			result += "a" + sixtyfour[Music.beatCounts.indexOf(beats)];
			result += "r" + sixtyfour[Music.partCounts.indexOf(parts)];
			
			for each (channel in [0, 1, 2]) {
				result += "w" + sixtyfour[channel] + sixtyfour[channelWaves[channel]];
			}
			
			for each (channel in [0, 1, 2]) {
				result += "f" + sixtyfour[channel] + sixtyfour[channelFilters[channel]];
			}
			
			for each (channel in [0, 1, 2]) {
				result += "c" + sixtyfour[channel] + sixtyfour[channelEffects[channel]];
			}
			
			for each (channel in [0, 1, 2]) {
				result += "h" + sixtyfour[channel] + sixtyfour[channelChorus[channel]];
			}
			
			for each (channel in [0, 1, 2, 3]) {
				result += "b" + sixtyfour[channel] + sixtyfour[channelBars[channel].length];
				bits = new BitField();
				for each (var b: int in channelBars[channel]) {
					bits.write(3, b);
				}
				result += bits.toString();
			}
			
			for each (channel in [0, 1, 2, 3]) {
				result += "p" + sixtyfour[channel] + sixtyfour[channelPatterns[channel].length];
				bits = new BitField();
				var lastNote: int = channel == 3 ? 4 : 12;
				var recentNotes: Array = channel == 3 ? [4,6,7,2,3,8,0,10] : [12, 19, 24, 31, 36, 7, 0];
				var recentShapes: Array = [];
				for each (var p: BarPattern in channelPatterns[channel]) {
					var curPart: int = 0;
					for each (var t: Tone in p.tones) {
						if (t.start > curPart) {
							bits.write(2, 0); // rest
							bits.writePartDuration(t.start - curPart);
						}
						
						var shapeBits: BitField = new BitField();
						
						// 0: 1 note, 10: 2 notes, 110: 3 notes, 111: 4 notes
						for (i = 1; i < t.notes.length; i++) shapeBits.write(1,1);
						if (t.notes.length < 4) shapeBits.write(1,0);
						
						shapeBits.writePinCount(t.pins.length - 1);
						
						shapeBits.write(2, t.pins[0].volume); // volume
						
						var shapePart: int = 0;
						var startNote: int = t.notes[0];
						var currentNote: int = startNote;
						var pitchBends: Array = [];
						for (i = 1; i < t.pins.length; i++) {
							var pin: TonePin = t.pins[i];
							var nextNote: int = startNote + pin.interval;
							if (currentNote != nextNote) {
								shapeBits.write(1, 1);
								pitchBends.push(nextNote);
								currentNote = nextNote;
							} else {
								shapeBits.write(1, 0);
							}
							shapeBits.writePartDuration(pin.time - shapePart);
							shapePart = pin.time;
							shapeBits.write(2, pin.volume);
						}
						
						var shapeString: String = shapeBits.toString();
						var shapeIndex: int = recentShapes.indexOf(shapeString);
						if (shapeIndex == -1) {
							bits.write(2, 1); // new shape
							bits.concat(shapeBits);
						} else {
							bits.write(1, 1); // old shape
							bits.writeLongTail(0, 0, shapeIndex);
							recentShapes.splice(shapeIndex, 1);
						}
						recentShapes.unshift(shapeString);
						if (recentShapes.length > 10) recentShapes.pop();
						
						var allNotes: Array = t.notes.concat(pitchBends);
						for (i = 0; i < allNotes.length; i++) {
							var note: int = allNotes[i];
							var noteIndex: int = recentNotes.indexOf(note);
							if (noteIndex == -1) {
								var interval: int = 0;
								var noteIter: int = lastNote;
								if (noteIter < note) {
									while (noteIter != note) {
										noteIter++;
										if (recentNotes.indexOf(noteIter) == -1) interval++;
									}
								} else {
									while (noteIter != note) {
										noteIter--;
										if (recentNotes.indexOf(noteIter) == -1) interval--;
									}
								}
								bits.write(1, 0);
								bits.writeNoteInterval(interval);
							} else {
								bits.write(1, 1);
								bits.write(3, noteIndex);
								recentNotes.splice(noteIndex, 1);
							}
							recentNotes.unshift(note);
							if (recentNotes.length > 8) recentNotes.pop();
							
							if (i == t.notes.length - 1) {
								lastNote = t.notes[0];
							} else {
								lastNote = note;
							}
						}
						curPart = t.end;
					}
					
					if (curPart < beats * parts) {
						bits.write(2, 0); // rest
						bits.writePartDuration(beats * parts - curPart);
					}
				}
				
				var bitString: String = bits.toString();
				result += sixtyfour[(bitString.length >> 6) & 63];
				result += sixtyfour[bitString.length & 63];
				result += bitString;
			}
			
			return result;
		}
		
		public function fromString(compressed: String, skipPatterns: Boolean = false): void {
			initToDefault(skipPatterns);
			if (compressed == null || compressed.length == 0) return;
			if (compressed.charAt(0) == "#") compressed = compressed.substring(1);
			var charIndex: int = 0;
			var version: int = sixtyfour.indexOf(compressed.charAt(charIndex++));
			if (version == -1 || version > latestVersion) return;
			var hasEquals: Boolean = version < 2;
			if (hasEquals && compressed.charAt(charIndex++) != "=") return;
			var hasVolume: Boolean = version > 0;
			var combinedWaveInfo: Boolean = version < 2;
			var sixBitsPerBar: Boolean = version < 2;
			var oldPatternFormat: Boolean = version < 2;
			while (charIndex < compressed.length) {
				var command: String = compressed.charAt(charIndex++);
				var bits: BitField;
				var channel: int;
				var i: int;
				var j: int;
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
					if (combinedWaveInfo) {
						for (i = 0; i < 3; i++) {
							channelWaves[i] = sixtyfour.indexOf(compressed.charAt(charIndex++));
							if (channelWaves[i] >= Music.waveNames.length) channelWaves[i] = Music.waveNames.length - 1;
						}
					} else {
						channel = sixtyfour.indexOf(compressed.charAt(charIndex++));
						channelWaves[channel] = sixtyfour.indexOf(compressed.charAt(charIndex++));
						if (channelWaves[channel] >= Music.waveNames.length) channelWaves[channel] = Music.waveNames.length - 1;
					}
				} else if (command == "f") {
					channel = sixtyfour.indexOf(compressed.charAt(charIndex++));
					channelFilters[channel] = sixtyfour.indexOf(compressed.charAt(charIndex++));
					if (channelFilters[channel] >= Music.filterNames.length) channelFilters[channel] = Music.filterNames.length - 1;
				} else if (command == "c") {
					channel = sixtyfour.indexOf(compressed.charAt(charIndex++));
					channelEffects[channel] = sixtyfour.indexOf(compressed.charAt(charIndex++));
					if (channelEffects[channel] >= Music.effectNames.length) channelEffects[channel] = Music.effectNames.length - 1;
				} else if (command == "h") {
					channel = sixtyfour.indexOf(compressed.charAt(charIndex++));
					channelChorus[channel] = sixtyfour.indexOf(compressed.charAt(charIndex++));
					if (channelChorus[channel] >= Music.chorusNames.length) channelChorus[channel] = Music.chorusNames.length - 1;
				} else if (command == "b") {
					channel = sixtyfour.indexOf(compressed.charAt(charIndex++));
					var barCount: int = sixtyfour.indexOf(compressed.charAt(charIndex++));
					if (sixBitsPerBar) {
						for (i = 0; i < barCount; i++) {
							channelBars[channel][i] = sixtyfour.indexOf(compressed.charAt(charIndex++));
						}
					} else {
						var subStringLength: int = Math.ceil(barCount * 0.5);
						bits = new BitField();
						bits.load(compressed.substr(charIndex, subStringLength));
						charIndex += subStringLength;
						for (i = 0; i < barCount; i++) {
							channelBars[channel][i] = bits.read(3);
						}
					}
				} else if (command == "p") {
					channel = sixtyfour.indexOf(compressed.charAt(charIndex++));
					var patternCount: int = sixtyfour.indexOf(compressed.charAt(charIndex++));
					var curPart: int;
					var newTones: Array;
					var restLength: int;
					var toneNoteCount: int;
					var pinCount: int;
					var tone: Tone;
					var pin: TonePin;
					if (oldPatternFormat) {
						for (i = 0; i < patternCount; i++) {
							curPart = 0;
							newTones = [];
							while (curPart < beats * parts) {
								toneNoteCount = sixtyfour.indexOf(compressed.charAt(charIndex++));
								if (toneNoteCount == 0) {
									restLength = sixtyfour.indexOf(compressed.charAt(charIndex++));
									curPart += restLength;
								} else {
									tone = new Tone(0,curPart,curPart,3);
									tone.notes = [];
									tone.pins.length = 1;
									while (toneNoteCount > 0) {
										tone.notes.push(sixtyfour.indexOf(compressed.charAt(charIndex++)));
										toneNoteCount--;
									}
									pinCount = sixtyfour.indexOf(compressed.charAt(charIndex++));
									if (hasVolume) {
										tone.pins[0].volume = sixtyfour.indexOf(compressed.charAt(charIndex++));
									}
									while (pinCount > 0) {
										pin = new TonePin(
											sixtyfour.indexOf(compressed.charAt(charIndex++)),
											sixtyfour.indexOf(compressed.charAt(charIndex++)),
											hasVolume ? sixtyfour.indexOf(compressed.charAt(charIndex++)) : 3
										);
										var noteCount: int = (channel == 3 ? Music.drumCount : Music.noteCount);
										if (pin.interval + tone.notes[0] >= noteCount) {
											pin.interval -= noteCount;
										}
										tone.pins.push(pin);
										tone.end = tone.start + pin.time;
										pinCount--;
									}
									curPart = tone.end;
									newTones.push(tone);
								}
							}
							if (!skipPatterns) {
								channelPatterns[channel][i].tones = newTones;
							}
						}
					} else {
						var lastNote: int = channel == 3 ? 4 : 12;
						var recentNotes: Array = channel == 3 ? [4,6,7,2,3,8,0,10] : [12, 19, 24, 31, 36, 7, 0];
						var recentShapes: Array = [];
						
						var bitStringLength: int = sixtyfour.indexOf(compressed.charAt(charIndex++));
						bitStringLength = bitStringLength << 6;
						bitStringLength += sixtyfour.indexOf(compressed.charAt(charIndex++));
						bits = new BitField();
						bits.load(compressed.substr(charIndex, bitStringLength));
						charIndex += bitStringLength;
						
						if (!skipPatterns) {
							for (i = 0; i < patternCount; i++) {
								curPart = 0;
								newTones = [];
								while (curPart < beats * parts) {
									var useOldShape: Boolean = bits.read(1) == 1;
									var newTone: Boolean = false;
									var shapeIndex: int = 0;
									if (useOldShape == 1) {
										shapeIndex = bits.readLongTail(0, 0);
									} else {
										newTone = bits.read(1) == 1;
									}
									
									if (!useOldShape && !newTone) {
										restLength = bits.readPartDuration();
										curPart += restLength;
									} else {
										var shape: Object;
										var pinObj: Object;
										var note: int;
										if (useOldShape) {
											shape = recentShapes[shapeIndex];
											recentShapes.splice(shapeIndex, 1);
										} else {
											shape = new Object();
											
											shape.noteCount = 1;
											while (shape.noteCount < 4 && bits.read(1) == 1) shape.noteCount++;
											
											shape.pinCount = bits.readPinCount();
											shape.initialVolume = bits.read(2);
											
											shape.pins = [];
											shape.length = 0;
											shape.bendCount = 0;
											for (j = 0; j < shape.pinCount; j++) {
												pinObj = new Object();
												pinObj.pitchBend = bits.read(1) == 1;
												if (pinObj.pitchBend) shape.bendCount++;
												shape.length += bits.readPartDuration();
												pinObj.time = shape.length;
												pinObj.volume = bits.read(2);
												shape.pins.push(pinObj);
											}
										}
										recentShapes.unshift(shape);
										if (recentShapes.length > 10) recentShapes.pop();
										
										tone = new Tone(0,curPart,curPart + shape.length, shape.initialVolume);
										tone.notes = [];
										tone.pins.length = 1;
										var pitchBends: Array = [];
										for (j = 0; j < shape.noteCount + shape.bendCount; j++) {
											var useOldNote: Boolean = bits.read(1) == 1;
											if (!useOldNote) {
												var interval: int = bits.readNoteInterval();
												note = lastNote;
												var intervalIter: int = interval;
												while (intervalIter > 0) {
													note++;
													while (recentNotes.indexOf(note) != -1) note++;
													intervalIter--;
												}
												while (intervalIter < 0) {
													note--;
													while (recentNotes.indexOf(note) != -1) note--;
													intervalIter++;
												}
											} else {
												var noteIndex: int = bits.read(3);
												note = recentNotes[noteIndex];
												recentNotes.splice(noteIndex, 1);
											}
											
											recentNotes.unshift(note);
											if (recentNotes.length > 8) recentNotes.pop();
											
											if (j < shape.noteCount) {
												tone.notes.push(note);
											} else {
												pitchBends.push(note);
											}
											
											if (j == shape.noteCount - 1) {
												lastNote = tone.notes[0];
											} else {
												lastNote = note;
											}
										}
										
										pitchBends.unshift(tone.notes[0]);
										
										for each (pinObj in shape.pins) {
											if (pinObj.pitchBend) pitchBends.shift();
											pin = new TonePin(pitchBends[0] - tone.notes[0], pinObj.time, pinObj.volume);
											tone.pins.push(pin);
										}
										curPart = tone.end;
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
		
		public function getBarPattern(channel: int, bar: int): BarPattern {
			return channelPatterns[channel][channelBars[channel][bar]];
		}
	}
}
