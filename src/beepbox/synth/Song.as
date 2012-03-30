/*
Copyright (C) 2012 John Nesky

Permission is hereby granted, free of charge, to any person obtaining a copy of 
this software and associated documentation files (the "Software"), to deal in 
the Software without restriction, including without limitation the rights to 
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies 
of the Software, and to permit persons to whom the Software is furnished to do 
so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all 
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR 
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, 
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE 
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER 
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, 
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE 
SOFTWARE.
*/

package beepbox.synth {
	public class Song {
		private static const oldestVersion: int = 2;
		private static const latestVersion: int = 3;
		
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
		public var channelAttacks: Array;
		public var channelEffects: Array;
		public var channelChorus: Array;
		public var channelVolumes: Array;
		public var channelOctaves: Array;
		
		private static const oldBase64: Array = ["0","1","2","3","4","5","6","7","8","9","a","b","c","d","e","f","g","h","i","j","k","l","m","n","o","p","q","r","s","t","u","v","w","x","y","z","A","B","C","D","E","F","G","H","I","J","K","L","M","N","O","P","Q","R","S","T","U","V","W","X","Y","Z",".","_",];
		private static const newBase64: Array = ["0","1","2","3","4","5","6","7","8","9","a","b","c","d","e","f","g","h","i","j","k","l","m","n","o","p","q","r","s","t","u","v","w","x","y","z","A","B","C","D","E","F","G","H","I","J","K","L","M","N","O","P","Q","R","S","T","U","V","W","X","Y","Z","-","_",];
		
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
			channelAttacks = [0,0,0];
			channelEffects = [0,0,0];
			channelChorus  = [0,0,0];
			channelVolumes = [0,0,0];
			channelOctaves = [3,2,1];
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
			var base64: Array = newBase64;
			
			result += base64[latestVersion];
			result += "s" + base64[scale];
			result += "k" + base64[key];
			result += "l" + base64[loopStart];
			result += "e" + base64[loopLength];
			result += "t" + base64[tempo];
			result += "a" + base64[Music.beatCounts.indexOf(beats)];
			result += "r" + base64[Music.partCounts.indexOf(parts)];
			
			for each (channel in [0, 1, 2]) {
				result += "w" + base64[channel] + base64[channelWaves[channel]];
			}
			
			for each (channel in [0, 1, 2]) {
				result += "f" + base64[channel] + base64[channelFilters[channel]];
			}
			
			for each (channel in [0, 1, 2]) {
				result += "d" + base64[channel] + base64[channelAttacks[channel]];
			}
			
			for each (channel in [0, 1, 2]) {
				result += "c" + base64[channel] + base64[channelEffects[channel]];
			}
			
			for each (channel in [0, 1, 2]) {
				result += "h" + base64[channel] + base64[channelChorus[channel]];
			}
			
			for each (channel in [0, 1, 2]) {
				result += "v" + base64[channel] + base64[channelVolumes[channel]];
			}
			
			for each (channel in [0, 1, 2]) {
				result += "o" + base64[channel] + base64[channelOctaves[channel]];
			}
			
			for each (channel in [0, 1, 2, 3]) {
				result += "b" + base64[channel] + base64[channelBars[channel].length];
				bits = new BitField(base64);
				for each (var b: int in channelBars[channel]) {
					bits.write(3, b);
				}
				result += bits.toString();
			}
			
			for each (channel in [0, 1, 2, 3]) {
				result += "p" + base64[channel] + base64[channelPatterns[channel].length];
				bits = new BitField(base64);
				var octaveOffset: int = channel == 3 ? 0 : channelOctaves[channel] * 12;
				var lastNote: int = (channel == 3 ? 4 : 12) + octaveOffset;
				var recentNotes: Array = channel == 3 ? [4,6,7,2,3,8,0,10] : [12, 19, 24, 31, 36, 7, 0];
				var recentShapes: Array = [];
				for (i = 0; i < recentNotes.length; i++) {
					recentNotes[i] += octaveOffset;
				}
				for each (var p: BarPattern in channelPatterns[channel]) {
					var curPart: int = 0;
					for each (var t: Tone in p.tones) {
						if (t.start > curPart) {
							bits.write(2, 0); // rest
							bits.writePartDuration(t.start - curPart);
						}
						
						var shapeBits: BitField = new BitField(base64);
						
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
				result += base64[(bitString.length >> 6) & 63];
				result += base64[bitString.length & 63];
				result += bitString;
			}
			
			return result;
		}
		
		public function fromString(compressed: String, skipPatterns: Boolean = false): void {
			initToDefault(skipPatterns);
			if (compressed == null || compressed.length == 0) return;
			if (compressed.charAt(0) == "#") compressed = compressed.substring(1);
			var charIndex: int = 0;
			var version: int = newBase64.indexOf(compressed.charAt(charIndex++));
			if (version == -1 || version > latestVersion || version < oldestVersion) return;
			var beforeThree: Boolean = version < 3;
			var base64: Array = beforeThree ? oldBase64 : newBase64;
			while (charIndex < compressed.length) {
				var command: String = compressed.charAt(charIndex++);
				var bits: BitField;
				var channel: int;
				var i: int;
				var j: int;
				if (command == "s") {
					scale = base64.indexOf(compressed.charAt(charIndex++));
					if (beforeThree && scale == 10) scale = 11;
				} else if (command == "k") {
					key = base64.indexOf(compressed.charAt(charIndex++));
				} else if (command == "l") {
					loopStart = base64.indexOf(compressed.charAt(charIndex++));
				} else if (command == "e") {
					loopLength = base64.indexOf(compressed.charAt(charIndex++));
				} else if (command == "t") {
					tempo = base64.indexOf(compressed.charAt(charIndex++));
				} else if (command == "a") {
					beats = Music.beatCounts[base64.indexOf(compressed.charAt(charIndex++))];
				} else if (command == "r") {
					parts = Music.partCounts[base64.indexOf(compressed.charAt(charIndex++))];
				} else if (command == "w") {
					channel = base64.indexOf(compressed.charAt(charIndex++));
					channelWaves[channel] = base64.indexOf(compressed.charAt(charIndex++));
					if (channelWaves[channel] >= Music.waveNames.length) channelWaves[channel] = Music.waveNames.length - 1;
				} else if (command == "f") {
					channel = base64.indexOf(compressed.charAt(charIndex++));
					channelFilters[channel] = base64.indexOf(compressed.charAt(charIndex++));
					if (channelFilters[channel] >= Music.filterNames.length) channelFilters[channel] = Music.filterNames.length - 1;
				} else if (command == "d") {
					channel = base64.indexOf(compressed.charAt(charIndex++));
					channelAttacks[channel] = base64.indexOf(compressed.charAt(charIndex++));
					if (channelAttacks[channel] >= Music.attackNames.length) channelAttacks[channel] = Music.attackNames.length - 1;
				} else if (command == "c") {
					channel = base64.indexOf(compressed.charAt(charIndex++));
					channelEffects[channel] = base64.indexOf(compressed.charAt(charIndex++));
					if (channelEffects[channel] >= Music.effectNames.length) channelEffects[channel] = Music.effectNames.length - 1;
					if (beforeThree && channelEffects[channel] == 1) channelEffects[channel] = 3;
					else if (beforeThree && channelEffects[channel] == 3) channelEffects[channel] = 5;
				} else if (command == "h") {
					channel = base64.indexOf(compressed.charAt(charIndex++));
					channelChorus[channel] = base64.indexOf(compressed.charAt(charIndex++));
					if (channelChorus[channel] >= Music.chorusNames.length) channelChorus[channel] = Music.chorusNames.length - 1;
				} else if (command == "v") {
					channel = base64.indexOf(compressed.charAt(charIndex++));
					channelVolumes[channel] = base64.indexOf(compressed.charAt(charIndex++));
					if (channelVolumes[channel] >= Music.volumeNames.length) channelVolumes[channel] = Music.volumeNames.length - 1;
				} else if (command == "o") {
					channel = base64.indexOf(compressed.charAt(charIndex++));
					channelOctaves[channel] = base64.indexOf(compressed.charAt(charIndex++));
					if (channelOctaves[channel] > 4) channelOctaves[channel] = 4;
				} else if (command == "b") {
					channel = base64.indexOf(compressed.charAt(charIndex++));
					var barCount: int = base64.indexOf(compressed.charAt(charIndex++));
					var subStringLength: int = Math.ceil(barCount * 0.5);
					bits = new BitField(base64);
					bits.load(compressed.substr(charIndex, subStringLength));
					charIndex += subStringLength;
					for (i = 0; i < barCount; i++) {
						channelBars[channel][i] = bits.read(3);
					}
				} else if (command == "p") {
					channel = base64.indexOf(compressed.charAt(charIndex++));
					var patternCount: int = base64.indexOf(compressed.charAt(charIndex++));
					
					var bitStringLength: int = base64.indexOf(compressed.charAt(charIndex++));
					bitStringLength = bitStringLength << 6;
					bitStringLength += base64.indexOf(compressed.charAt(charIndex++));
					bits = new BitField(base64);
					bits.load(compressed.substr(charIndex, bitStringLength));
					charIndex += bitStringLength;
					
					if (!skipPatterns) {
						var octaveOffset: int = channel == 3 ? 0 : channelOctaves[channel] * 12;
						var tone: Tone;
						var pin: TonePin;
						var lastNote: int = (channel == 3 ? 4 : 12) + octaveOffset;
						var recentNotes: Array = channel == 3 ? [4,6,7,2,3,8,0,10] : [12, 19, 24, 31, 36, 7, 0];
						var recentShapes: Array = [];
						for (i = 0; i < recentNotes.length; i++) {
							recentNotes[i] += octaveOffset;
						}
						for (i = 0; i < patternCount; i++) {
							var curPart: int = 0;
							var newTones: Array = [];
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
									var restLength: int = bits.readPartDuration();
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
		
		public function getBarPattern(channel: int, bar: int): BarPattern {
			return channelPatterns[channel][channelBars[channel][bar]];
		}
	}
}
