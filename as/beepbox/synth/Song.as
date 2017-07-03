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
	import mx.utils.StringUtil;
	
	public class Song {
		private static const oldestVersion: int = 2;
		private static const latestVersion: int = 5;
		private static const base64CharToInt: Object = {0:0,1:1,2:2,3:3,4:4,5:5,6:6,7:7,8:8,9:9,a:10,b:11,c:12,d:13,e:14,f:15,g:16,h:17,i:18,j:19,k:20,l:21,m:22,n:23,o:24,p:25,q:26,r:27,s:28,t:29,u:30,v:31,w:32,x:33,y:34,z:35,A:36,B:37,C:38,D:39,E:40,F:41,G:42,H:43,I:44,J:45,K:46,L:47,M:48,N:49,O:50,P:51,Q:52,R:53,S:54,T:55,U:56,V:57,W:58,X:59,Y:60,Z:61,"-":62,".":62,_:63}; // 62 could be represented by either "-" or "." for historical reasons. New songs should use "-".
		private static const base64IntToChar: Array = ["0","1","2","3","4","5","6","7","8","9","a","b","c","d","e","f","g","h","i","j","k","l","m","n","o","p","q","r","s","t","u","v","w","x","y","z","A","B","C","D","E","F","G","H","I","J","K","L","M","N","O","P","Q","R","S","T","U","V","W","X","Y","Z","-","_"];
		
		public var scale: int;
		public var key: int;
		public var tempo: int;
		public var reverb: int;
		public var beats: int;
		public var bars: int;
		public var patterns: int;
		public var parts: int;
		public var instruments: int;
		public var loopStart: int;
		public var loopLength: int;
		public var channelPatterns: Array;
		public var channelBars: Array;
		public var channelOctaves: Array;
		public var instrumentWaves: Array;
		public var instrumentFilters: Array;
		public var instrumentAttacks: Array;
		public var instrumentEffects: Array;
		public var instrumentChorus: Array;
		public var instrumentVolumes: Array;
		
		public function Song(string: String = null) {
			if (string != null) {
				fromString(string);
			} else {
				initToDefault();
			}
		}
		
		public function initToDefault(): void {
			channelPatterns = [
				[new BarPattern(), new BarPattern(), new BarPattern(), new BarPattern(), new BarPattern(), new BarPattern(), new BarPattern(), new BarPattern()], 
				[new BarPattern(), new BarPattern(), new BarPattern(), new BarPattern(), new BarPattern(), new BarPattern(), new BarPattern(), new BarPattern()], 
				[new BarPattern(), new BarPattern(), new BarPattern(), new BarPattern(), new BarPattern(), new BarPattern(), new BarPattern(), new BarPattern()], 
				[new BarPattern(), new BarPattern(), new BarPattern(), new BarPattern(), new BarPattern(), new BarPattern(), new BarPattern(), new BarPattern()], 
			];
			channelBars = [
				[1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
				[1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
				[1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
				[1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
			];
			channelOctaves = [3,2,1,0];
			instrumentVolumes = [[0],[0],[0],[0]];
			instrumentWaves   = [[1],[1],[1],[1]];
			instrumentFilters = [[0],[0],[0],[0]];
			instrumentAttacks = [[1],[1],[1],[1]];
			instrumentEffects = [[0],[0],[0],[0]];
			instrumentChorus  = [[0],[0],[0],[0]];
			scale = 0;
			key = Music.keyNames.length - 1;
			loopStart = 0;
			loopLength = 4;
			tempo = 7;
			reverb = 0;
			beats = 8;
			bars = 16;
			patterns = 8;
			parts = 4;
			instruments = 1;
		}
		
		public function toString(): String {
			var channel: int;
			var i: int;
			var bits: BitFieldWriter;
			var result: String = "";
			var base64IntToChar: Array = Song.base64IntToChar;
			
			result += base64IntToChar[latestVersion];
			result += "s" + base64IntToChar[scale];
			result += "k" + base64IntToChar[key];
			result += "l" + base64IntToChar[loopStart >> 6] + base64IntToChar[loopStart & 0x3f];
			result += "e" + base64IntToChar[(loopLength - 1) >> 6] + base64IntToChar[(loopLength - 1) & 0x3f];
			result += "t" + base64IntToChar[tempo];
			result += "m" + base64IntToChar[reverb];
			result += "a" + base64IntToChar[beats - 1];
			result += "g" + base64IntToChar[(bars - 1) >> 6] + base64IntToChar[(bars - 1) & 0x3f];
			result += "j" + base64IntToChar[patterns - 1];
			result += "i" + base64IntToChar[instruments - 1];
			result += "r" + base64IntToChar[Music.partCounts.indexOf(parts)];
			
			result += "w";
			for (channel = 0; channel < Music.numChannels; channel++) for (i = 0; i < instruments; i++) {
				result += base64IntToChar[instrumentWaves[channel][i]];
			}
			
			result += "f";
			for (channel = 0; channel < Music.numChannels; channel++) for (i = 0; i < instruments; i++) {
				result += base64IntToChar[instrumentFilters[channel][i]];
			}
			
			result += "d";
			for (channel = 0; channel < Music.numChannels; channel++) for (i = 0; i < instruments; i++) {
				result += base64IntToChar[instrumentAttacks[channel][i]];
			}
			
			result += "c";
			for (channel = 0; channel < Music.numChannels; channel++) for (i = 0; i < instruments; i++) {
				result += base64IntToChar[instrumentEffects[channel][i]];
			}
			
			result += "h";
			for (channel = 0; channel < Music.numChannels; channel++) for (i = 0; i < instruments; i++) {
				result += base64IntToChar[instrumentChorus[channel][i]];
			}
			
			result += "v";
			for (channel = 0; channel < Music.numChannels; channel++) for (i = 0; i < instruments; i++) {
				result += base64IntToChar[instrumentVolumes[channel][i]];
			}
			
			result += "o";
			for (channel = 0; channel < Music.numChannels; channel++) {
				result += base64IntToChar[channelOctaves[channel]];
			}
			
			result += "b";
			bits = new BitFieldWriter();
			var neededBits: int = 0;
			while ((1 << neededBits) < patterns + 1) neededBits++;
			for (channel = 0; channel < Music.numChannels; channel++) for (i = 0; i < bars; i++) {
				bits.write(neededBits, channelBars[channel][i]);
			}
			result += bits.encodeBase64(base64IntToChar);
			
			result += "p";
			bits = new BitFieldWriter();
			var neededInstrumentBits: int = 0;
			while ((1 << neededInstrumentBits) < instruments) neededInstrumentBits++;
			for (channel = 0; channel < Music.numChannels; channel++) {
				var octaveOffset: int = channel == 3 ? 0 : channelOctaves[channel] * 12;
				var lastPitch: int = (channel == 3 ? 4 : 12) + octaveOffset;
				var recentPitches: Array = channel == 3 ? [4,6,7,2,3,8,0,10] : [12, 19, 24, 31, 36, 7, 0];
				var recentShapes: Array = [];
				for (i = 0; i < recentPitches.length; i++) {
					recentPitches[i] += octaveOffset;
				}
				for each (var p: BarPattern in channelPatterns[channel]) {
					bits.write(neededInstrumentBits, p.instrument);
					
					if (p.notes.length > 0) {
						bits.write(1, 1);
						
						var curPart: int = 0;
						for each (var t: Note in p.notes) {
							if (t.start > curPart) {
								bits.write(2, 0); // rest
								bits.writePartDuration(t.start - curPart);
							}
							
							var shapeBits: BitFieldWriter = new BitFieldWriter();
							
							// 0: 1 pitch, 10: 2 pitches, 110: 3 pitches, 111: 4 pitches
							for (i = 1; i < t.pitches.length; i++) shapeBits.write(1,1);
							if (t.pitches.length < 4) shapeBits.write(1,0);
							
							shapeBits.writePinCount(t.pins.length - 1);
							
							shapeBits.write(2, t.pins[0].volume); // volume
							
							var shapePart: int = 0;
							var startPitch: int = t.pitches[0];
							var currentPitch: int = startPitch;
							var pitchBends: Array = [];
							for (i = 1; i < t.pins.length; i++) {
								var pin: NotePin = t.pins[i];
								var nextPitch: int = startPitch + pin.interval;
								if (currentPitch != nextPitch) {
									shapeBits.write(1, 1);
									pitchBends.push(nextPitch);
									currentPitch = nextPitch;
								} else {
									shapeBits.write(1, 0);
								}
								shapeBits.writePartDuration(pin.time - shapePart);
								shapePart = pin.time;
								shapeBits.write(2, pin.volume);
							}
							
							var shapeString: String = shapeBits.encodeBase64(base64IntToChar);
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
							
							var allPitches: Array = t.pitches.concat(pitchBends);
							for (i = 0; i < allPitches.length; i++) {
								var pitch: int = allPitches[i];
								var pitchIndex: int = recentPitches.indexOf(pitch);
								if (pitchIndex == -1) {
									var interval: int = 0;
									var pitchIter: int = lastPitch;
									if (pitchIter < pitch) {
										while (pitchIter != pitch) {
											pitchIter++;
											if (recentPitches.indexOf(pitchIter) == -1) interval++;
										}
									} else {
										while (pitchIter != pitch) {
											pitchIter--;
											if (recentPitches.indexOf(pitchIter) == -1) interval--;
										}
									}
									bits.write(1, 0);
									bits.writePitchInterval(interval);
								} else {
									bits.write(1, 1);
									bits.write(3, pitchIndex);
									recentPitches.splice(pitchIndex, 1);
								}
								recentPitches.unshift(pitch);
								if (recentPitches.length > 8) recentPitches.pop();
								
								if (i == t.pitches.length - 1) {
									lastPitch = t.pitches[0];
								} else {
									lastPitch = pitch;
								}
							}
							curPart = t.end;
						}
						
						if (curPart < beats * parts) {
							bits.write(2, 0); // rest
							bits.writePartDuration(beats * parts - curPart);
						}
					} else {
						bits.write(1, 0);
					}
				}
			}
			var bitString: String = bits.encodeBase64(base64IntToChar);
			var stringLength: int = bitString.length;
			var digits: String = "";
			while (stringLength > 0) {
				digits = base64IntToChar[stringLength & 0x3f] + digits;
				stringLength = stringLength >> 6;
			}
			result += base64IntToChar[digits.length];
			result += digits;
			result += bitString;
			
			return result;
		}
		
		public function fromString(compressed: String): void {
			compressed = StringUtil.trim(compressed);
			if (compressed.charAt(0) == "#") compressed = compressed.substring(1);
			if (compressed == null || compressed.length == 0) {
				initToDefault();
				return;
			}
			if (compressed.charAt(0) == "{") {
				fromJsonObject(JSON.parse(compressed));
				return;
			}
			initToDefault();
			var charIndex: int = 0;
			var version: int = Song.base64CharToInt[compressed.charAt(charIndex++)];
			if (version == -1 || version > latestVersion || version < oldestVersion) return;
			var beforeThree: Boolean = version < 3;
			var beforeFour:  Boolean = version < 4;
			var beforeFive:  Boolean = version < 5;
			var base64CharToInt: Object = Song.base64CharToInt; // beforeThree ? oldBase64 : newBase64;
			if (beforeThree) instrumentAttacks = [[0],[0],[0],[0]];
			if (beforeThree) instrumentWaves   = [[1],[1],[1],[0]];
			while (charIndex < compressed.length) {
				var command: String = compressed.charAt(charIndex++);
				var bits: BitFieldReader;
				var channel: int;
				var i: int;
				var j: int;
				if (command == "s") {
					scale = base64CharToInt[compressed.charAt(charIndex++)];
					if (beforeThree && scale == 10) scale = 11;
				} else if (command == "k") {
					key = base64CharToInt[compressed.charAt(charIndex++)];
				} else if (command == "l") {
					if (beforeFive) {
						loopStart = base64CharToInt[compressed.charAt(charIndex++)];
					} else {
						loopStart = (base64CharToInt[compressed.charAt(charIndex++)] << 6) + base64CharToInt[compressed.charAt(charIndex++)];
					}
				} else if (command == "e") {
					if (beforeFive) {
						loopLength = base64CharToInt[compressed.charAt(charIndex++)];
					} else {
						loopLength = (base64CharToInt[compressed.charAt(charIndex++)] << 6) + base64CharToInt[compressed.charAt(charIndex++)] + 1;
					}
				} else if (command == "t") {
					if (beforeFour) {
						tempo = [1, 4, 7, 10][base64CharToInt[compressed.charAt(charIndex++)]];
					} else {
						tempo = base64CharToInt[compressed.charAt(charIndex++)];
					}
					tempo = clip(0, Music.tempoNames.length, tempo);
				} else if (command == "m") {
					reverb = base64CharToInt[compressed.charAt(charIndex++)];
					reverb = clip(0, Music.reverbRange, reverb);
				} else if (command == "a") {
					if (beforeThree) {
						beats = [6, 7, 8, 9, 10][base64CharToInt[compressed.charAt(charIndex++)]];
					} else {
						beats = base64CharToInt[compressed.charAt(charIndex++)] + 1;
					}
					beats = Math.max(Music.beatsMin, Math.min(Music.beatsMax, beats));
				} else if (command == "g") {
					bars = (base64CharToInt[compressed.charAt(charIndex++)] << 6) + base64CharToInt[compressed.charAt(charIndex++)] + 1;
					bars = Math.max(Music.barsMin, Math.min(Music.barsMax, bars));
				} else if (command == "j") {
					patterns = base64CharToInt[compressed.charAt(charIndex++)] + 1;
					patterns = Math.max(Music.patternsMin, Math.min(Music.patternsMax, patterns));
				} else if (command == "i") {
					instruments = base64CharToInt[compressed.charAt(charIndex++)] + 1;
					instruments = Math.max(Music.instrumentsMin, Math.min(Music.instrumentsMax, instruments));
				} else if (command == "r") {
					parts = Music.partCounts[base64CharToInt[compressed.charAt(charIndex++)]];
				} else if (command == "w") {
					if (beforeThree) {
						channel = base64CharToInt[compressed.charAt(charIndex++)];
						instrumentWaves[channel][0] = clip(0, Music.waveNames.length, base64CharToInt[compressed.charAt(charIndex++)]);
					} else {
						for (channel = 0; channel < Music.numChannels; channel++) {
							for (i = 0; i < instruments; i++) {
								instrumentWaves[channel][i] = clip(0, Music.waveNames.length, base64CharToInt[compressed.charAt(charIndex++)]);
							}
						}
					}
				} else if (command == "f") {
					if (beforeThree) {
						channel = base64CharToInt[compressed.charAt(charIndex++)];
						instrumentFilters[channel][0] = [0, 2, 3, 5][clip(0, Music.filterNames.length, base64CharToInt[compressed.charAt(charIndex++)])];
					} else {
						for (channel = 0; channel < Music.numChannels; channel++) {
							for (i = 0; i < instruments; i++) {
								instrumentFilters[channel][i] = clip(0, Music.filterNames.length, base64CharToInt[compressed.charAt(charIndex++)]);
							}
						}
					}
				} else if (command == "d") {
					if (beforeThree) {
						channel = base64CharToInt[compressed.charAt(charIndex++)];
						instrumentAttacks[channel][0] = clip(0, Music.attackNames.length, base64CharToInt[compressed.charAt(charIndex++)]);
					} else {
						for (channel = 0; channel < Music.numChannels; channel++) {
							for (i = 0; i < instruments; i++) {
								instrumentAttacks[channel][i] = clip(0, Music.attackNames.length, base64CharToInt[compressed.charAt(charIndex++)]);
							}
						}
					}
				} else if (command == "c") {
					if (beforeThree) {
						channel = base64CharToInt[compressed.charAt(charIndex++)];
						instrumentEffects[channel][0] = clip(0, Music.effectNames.length, base64CharToInt[compressed.charAt(charIndex++)]);
						if (instrumentEffects[channel][0] == 1) instrumentEffects[channel][0] = 3;
						else if (instrumentEffects[channel][0] == 3) instrumentEffects[channel][0] = 5;
					} else {
						for (channel = 0; channel < Music.numChannels; channel++) {
							for (i = 0; i < instruments; i++) {
								instrumentEffects[channel][i] = clip(0, Music.effectNames.length, base64CharToInt[compressed.charAt(charIndex++)]);
							}
						}
					}
				} else if (command == "h") {
					if (beforeThree) {
						channel = base64CharToInt[compressed.charAt(charIndex++)];
						instrumentChorus[channel][0] = clip(0, Music.chorusNames.length, base64CharToInt[compressed.charAt(charIndex++)]);
					} else {
						for (channel = 0; channel < Music.numChannels; channel++) {
							for (i = 0; i < instruments; i++) {
								instrumentChorus[channel][i] = clip(0, Music.chorusNames.length, base64CharToInt[compressed.charAt(charIndex++)]);
							}
						}
					}
				} else if (command == "v") {
					if (beforeThree) {
						channel = base64CharToInt[compressed.charAt(charIndex++)];
						instrumentVolumes[channel][0] = clip(0, Music.volumeNames.length, base64CharToInt[compressed.charAt(charIndex++)]);
					} else {
						for (channel = 0; channel < Music.numChannels; channel++) {
							for (i = 0; i < instruments; i++) {
								instrumentVolumes[channel][i] = clip(0, Music.volumeNames.length, base64CharToInt[compressed.charAt(charIndex++)]);
							}
						}
					}
				} else if (command == "o") {
					if (beforeThree) {
						channel = base64CharToInt[compressed.charAt(charIndex++)];
						channelOctaves[channel] = clip(0, 5, base64CharToInt[compressed.charAt(charIndex++)]);
					} else {
						for (channel = 0; channel < Music.numChannels; channel++) {
							channelOctaves[channel] = clip(0, 5, base64CharToInt[compressed.charAt(charIndex++)]);
						}
					}
				} else if (command == "b") {
					var subStringLength: int;
					if (beforeThree) {
						channel = base64CharToInt[compressed.charAt(charIndex++)];
						var barCount: int = base64CharToInt[compressed.charAt(charIndex++)];
						subStringLength = Math.ceil(barCount * 0.5);
						bits = new BitFieldReader(base64CharToInt, compressed.substr(charIndex, subStringLength));
						for (i = 0; i < barCount; i++) {
							channelBars[channel][i] = bits.read(3) + 1;
						}
					} else if (beforeFive) {
						var neededBits: int = 0;
						while ((1 << neededBits) < patterns) neededBits++;
						subStringLength = Math.ceil(Music.numChannels * bars * neededBits / 6.0);
						bits = new BitFieldReader(base64CharToInt, compressed.substr(charIndex, subStringLength));
						for (channel = 0; channel < Music.numChannels; channel++) {
							channelBars[channel].length = bars;
							for (i = 0; i < bars; i++) {
								channelBars[channel][i] = bits.read(neededBits) + 1;
							}
						}
					} else {
						var neededBits2: int = 0;
						while ((1 << neededBits2) < patterns + 1) neededBits2++;
						subStringLength = Math.ceil(Music.numChannels * bars * neededBits2 / 6.0);
						bits = new BitFieldReader(base64CharToInt, compressed.substr(charIndex, subStringLength));
						for (channel = 0; channel < Music.numChannels; channel++) {
							channelBars[channel].length = bars;
							for (i = 0; i < bars; i++) {
								channelBars[channel][i] = bits.read(neededBits2);
							}
						}
					}
					charIndex += subStringLength;
				} else if (command == "p") {
					var bitStringLength: int = 0;
					if (beforeThree) {
						channel = base64CharToInt[compressed.charAt(charIndex++)];
						var patternCount: int = base64CharToInt[compressed.charAt(charIndex++)];
						
						bitStringLength = base64CharToInt[compressed.charAt(charIndex++)];
						bitStringLength = bitStringLength << 6;
						bitStringLength += base64CharToInt[compressed.charAt(charIndex++)];
					} else {
						channel = 0;
						var bitStringLengthLength: int = base64CharToInt[compressed.charAt(charIndex++)];
						while (bitStringLengthLength > 0) {
							bitStringLength = bitStringLength << 6;
							bitStringLength += base64CharToInt[compressed.charAt(charIndex++)];
							bitStringLengthLength--;
						}
					}
					
					bits = new BitFieldReader(base64CharToInt, compressed.substr(charIndex, bitStringLength));
					charIndex += bitStringLength;
					
					var neededInstrumentBits: int = 0;
					while ((1 << neededInstrumentBits) < instruments) neededInstrumentBits++;
					while (true) {
						channelPatterns[channel] = [];
						
						var octaveOffset: int = channel == 3 ? 0 : channelOctaves[channel] * 12;
						var note: Note = null;
						var pin: NotePin = null;
						var lastPitch: int = (channel == 3 ? 4 : 12) + octaveOffset;
						var recentPitches: Array = channel == 3 ? [4,6,7,2,3,8,0,10] : [12, 19, 24, 31, 36, 7, 0];
						var recentShapes: Array = [];
						for (i = 0; i < recentPitches.length; i++) {
							recentPitches[i] += octaveOffset;
						}
						for (i = 0; i < patterns; i++) {
							var newPattern: BarPattern = new BarPattern();
							newPattern.instrument = bits.read(neededInstrumentBits);
							channelPatterns[channel][i] = newPattern;
							
							if (!beforeThree && bits.read(1) == 0) continue;
							
							var curPart: int = 0;
							var newNotes: Array = [];
							while (curPart < beats * parts) {
								
								var useOldShape: Boolean = bits.read(1) == 1;
								var newNote: Boolean = false;
								var shapeIndex: int = 0;
								if (useOldShape) {
									shapeIndex = bits.readLongTail(0, 0);
								} else {
									newNote = bits.read(1) == 1;
								}
								
								if (!useOldShape && !newNote) {
									var restLength: int = bits.readPartDuration();
									curPart += restLength;
								} else {
									var shape: Object;
									var pinObj: Object;
									var pitch: int;
									if (useOldShape) {
										shape = recentShapes[shapeIndex];
										recentShapes.splice(shapeIndex, 1);
									} else {
										shape = new Object();
										
										shape.pitchCount = 1;
										while (shape.pitchCount < 4 && bits.read(1) == 1) shape.pitchCount++;
										
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
									
									note = new Note(0,curPart,curPart + shape.length, shape.initialVolume);
									note.pitches = [];
									note.pins.length = 1;
									var pitchBends: Array = [];
									for (j = 0; j < shape.pitchCount + shape.bendCount; j++) {
										var useOldPitch: Boolean = bits.read(1) == 1;
										if (!useOldPitch) {
											var interval: int = bits.readPitchInterval();
											pitch = lastPitch;
											var intervalIter: int = interval;
											while (intervalIter > 0) {
												pitch++;
												while (recentPitches.indexOf(pitch) != -1) pitch++;
												intervalIter--;
											}
											while (intervalIter < 0) {
												pitch--;
												while (recentPitches.indexOf(pitch) != -1) pitch--;
												intervalIter++;
											}
										} else {
											var pitchIndex: int = bits.read(3);
											pitch = recentPitches[pitchIndex];
											recentPitches.splice(pitchIndex, 1);
										}
										
										recentPitches.unshift(pitch);
										if (recentPitches.length > 8) recentPitches.pop();
										
										if (j < shape.pitchCount) {
											note.pitches.push(pitch);
										} else {
											pitchBends.push(pitch);
										}
										
										if (j == shape.pitchCount - 1) {
											lastPitch = note.pitches[0];
										} else {
											lastPitch = pitch;
										}
									}
									
									pitchBends.unshift(note.pitches[0]);
									
									for each (pinObj in shape.pins) {
										if (pinObj.pitchBend) pitchBends.shift();
										pin = new NotePin(pitchBends[0] - note.pitches[0], pinObj.time, pinObj.volume);
										note.pins.push(pin);
									}
									curPart = note.end;
									newNotes.push(note);
								}
							}
							newPattern.notes = newNotes;
						} // for (i = 0; i < patterns; i++) {
						
						if (beforeThree) {
							break;
						} else {
							channel++;
							if (channel >= Music.numChannels) break;
						}
					} // while (true)
				}
			}
		}
		
		public function toJsonObject(enableIntro: Boolean = true, loopCount: int = 1, enableOutro: Boolean = true): Object {
			const channelArray: Array = [];
			var i: int;
			for (var channel: int = 0; channel < Music.numChannels; channel++) {
				const instrumentArray: Array = [];
				for (i = 0; i < this.instruments; i++) {
					if (channel == 3) {
						instrumentArray.push({
							volume: (5 - this.instrumentVolumes[channel][i]) * 20,
							wave: Music.drumNames[this.instrumentWaves[channel][i]],
							envelope: Music.attackNames[this.instrumentAttacks[channel][i]]
						});
					} else {
						instrumentArray.push({
							volume: (5 - this.instrumentVolumes[channel][i]) * 20,
							wave: Music.waveNames[this.instrumentWaves[channel][i]],
							envelope: Music.attackNames[this.instrumentAttacks[channel][i]],
							filter: Music.filterNames[this.instrumentFilters[channel][i]],
							chorus: Music.chorusNames[this.instrumentChorus[channel][i]],
							effect: Music.effectNames[this.instrumentEffects[channel][i]]
						});
					}
				}
				
				const patternArray: Array = [];
				for each (var pattern: BarPattern in this.channelPatterns[channel]) {
					const pitchArray: Array = [];
					for each (var note: Note in pattern.notes) {
						const pointArray: Array = [];
						for each (var pin: NotePin in note.pins) {
							pointArray.push({
								tick: pin.time + note.start,
								pitchBend: pin.interval,
								volume: Math.round(pin.volume * 100.0 / 3.0)
							});
						}
						
						pitchArray.push({
							pitches: note.pitches,
							points: pointArray
						});
					}
					
					patternArray.push({
						instrument: pattern.instrument + 1,
						pitches: pitchArray
					});
				}
				
				const sequenceArray: Array = [];
				if (enableIntro) for (i = 0; i < this.loopStart; i++) {
					sequenceArray.push(this.channelBars[channel][i]);
				}
				for (var l: int = 0; l < loopCount; l++) for (i = this.loopStart; i < this.loopStart + this.loopLength; i++) {
					sequenceArray.push(this.channelBars[channel][i]);
				}
				if (enableOutro) for (i = this.loopStart + this.loopLength; i < this.bars; i++) {
					sequenceArray.push(this.channelBars[channel][i]);
				}
				
				channelArray.push({
					octaveScrollBar: this.channelOctaves[channel],
					instruments: instrumentArray,
					patterns: patternArray,
					sequence: sequenceArray
				});
			}
			
			return {
				version: latestVersion,
				scale: Music.scaleNames[this.scale],
				key: Music.keyNames[this.key],
				introBars: this.loopStart,
				loopBars: this.loopLength,
				beatsPerBar: this.beats,
				ticksPerBeat: this.parts,
				beatsPerMinute: this.getBeatsPerMinute(), // represents tempo
				reverb: this.reverb,
				//outroBars: this.bars - this.loopStart - this.loopLength; // derive this from bar arrays?
				//patternCount: this.patterns, // derive this from pattern arrays?
				//instrumentsPerChannel: this.instruments, //derive this from instrument arrays?
				channels: channelArray
			};
		}
		
		public function fromJsonObject(jsonObject: Object): void {
			var i: int;
			var k: int;
			var channel: int;
			var channelObject: *;
			
			initToDefault();
			if (!jsonObject) return;
			const version: int = int(jsonObject.version);
			if (version != 5) return;
			
			this.scale = 11; // default to expert.
			if (jsonObject.scale != undefined) {
				const scale: int = Music.scaleNames.indexOf(jsonObject.scale);
				if (scale != -1) this.scale = scale;
			}
			
			if (jsonObject.key != undefined) {
				if (typeof(jsonObject.key) == "number") {
					this.key = Music.keyNames.length - 1 - (uint(jsonObject.key + 1200) % Music.keyNames.length);
				} else if (typeof(jsonObject.key) == "string") {
					const key: String = jsonObject.key;
					const letter: String = key.charAt(0).toUpperCase();
					const symbol: String = key.charAt(1).toLowerCase();
					var index: * = {"C": 11, "D": 9, "E": 7, "F": 6, "G": 4, "A": 2, "B": 0}[letter];
					const offset: * = {"#": -1, "♯": -1, "b": 1, "♭": 1}[symbol];
					if (index != undefined) {
						if (offset != undefined) index += offset;
						if (index < 0) index += 12;
						index = index % 12;
						this.key = index;
					}
				}
			}
			
			if (jsonObject.beatsPerMinute != undefined) {
				const bpm: Number = int(jsonObject.beatsPerMinute);
				this.tempo = Math.round(4.0 + 9.0 * Math.log(bpm / 120.0) / Math.LN2);
				this.tempo = clip(0, Music.tempoNames.length, this.tempo);
			}
			
			if (jsonObject.reverb != undefined) {
				this.reverb = clip(0, Music.reverbRange, int(jsonObject.reverb));
			}
			
			if (jsonObject.beatsPerBar != undefined) {
				this.beats = Math.max(Music.beatsMin, Math.min(Music.beatsMax, int(jsonObject.beatsPerBar)));
			}
			
			if (jsonObject.ticksPerBeat != undefined) {
				this.parts = Math.max(3, Math.min(4, int(jsonObject.ticksPerBeat)));
			}
			
			var maxInstruments: int = 1;
			var maxPatterns: int = 1;
			var maxBars: int = 1;
			for (channel = 0; channel < Music.numChannels; channel++) {
				if (jsonObject.channels && jsonObject.channels[channel]) {
					channelObject = jsonObject.channels[channel];
					if (channelObject.instruments) maxInstruments = Math.max(maxInstruments, int(channelObject.instruments.length));
					if (channelObject.patterns) maxPatterns = Math.max(maxPatterns, int(channelObject.patterns.length));
					if (channelObject.sequence) maxBars = Math.max(maxBars, int(channelObject.sequence.length));
				}
			}
			
			this.instruments = maxInstruments;
			this.patterns = maxPatterns;
			this.bars = maxBars;
			
			if (jsonObject.introBars != undefined) {
				this.loopStart = clip(0, this.bars, int(jsonObject.introBars));
			}
			if (jsonObject.loopBars != undefined) {
				this.loopLength = clip(1, this.bars - this.loopStart + 1, int(jsonObject.loopBars));
			}
			
			for (channel = 0; channel < Music.numChannels; channel++) {
				channelObject = undefined;
				if (jsonObject.channels) channelObject = jsonObject.channels[channel];
				if (channelObject == undefined) channelObject = {};
				
				if (channelObject.octaveScrollBar != undefined) {
					this.channelOctaves[channel] = clip(0, 5, int(channelObject.octaveScrollBar));
				}
				
				this.instrumentVolumes[channel].length = this.instruments;
				this.instrumentWaves[channel].length = this.instruments;
				this.instrumentAttacks[channel].length = this.instruments;
				this.instrumentFilters[channel].length = this.instruments;
				this.instrumentChorus[channel].length = this.instruments;
				this.instrumentEffects[channel].length = this.instruments;
				this.channelPatterns[channel].length = this.patterns;
				this.channelBars[channel].length = this.bars;
				
				for (i = 0; i < this.instruments; i++) {
					var instrumentObject: * = undefined;
					if (channelObject.instruments) instrumentObject = channelObject.instruments[i];
					if (instrumentObject == undefined) instrumentObject = {};
					if (instrumentObject.volume != undefined) {
						this.instrumentVolumes[channel][i] = clip(0, Music.volumeNames.length, Math.round(5.0 - int(instrumentObject.volume) / 20.0));
					} else {
						this.instrumentVolumes[channel][i] = 0;
					}
					this.instrumentAttacks[channel][i] = Music.attackNames.indexOf(instrumentObject.envelope);
					if (this.instrumentAttacks[channel][i] == -1) this.instrumentAttacks[channel][i] = 1;
					if (channel == 3) {
						this.instrumentWaves[channel][i] = Music.drumNames.indexOf(instrumentObject.wave);
						if (this.instrumentWaves[channel][i] == -1) this.instrumentWaves[channel][i] = 0;
						this.instrumentFilters[channel][i] = 0;
						this.instrumentChorus[channel][i] = 0;
						this.instrumentEffects[channel][i] = 0;
					} else {
						this.instrumentWaves[channel][i] = Music.waveNames.indexOf(instrumentObject.wave);
						if (this.instrumentWaves[channel][i] == -1) this.instrumentWaves[channel][i] = 1;
						this.instrumentFilters[channel][i] = Music.filterNames.indexOf(instrumentObject.filter);
						if (this.instrumentFilters[channel][i] == -1) this.instrumentFilters[channel][i] = 0;
						this.instrumentChorus[channel][i] = Music.chorusNames.indexOf(instrumentObject.chorus);
						if (this.instrumentChorus[channel][i] == -1) this.instrumentChorus[channel][i] = 0;
						this.instrumentEffects[channel][i] = Music.effectNames.indexOf(instrumentObject.effect);
						if (this.instrumentEffects[channel][i] == -1) this.instrumentEffects[channel][i] = 0;
					}
				}
				
				for (i = 0; i < this.patterns; i++) {
					const pattern: BarPattern = new BarPattern();
					this.channelPatterns[channel][i] = pattern;
					
					var patternObject: * = undefined;
					if (channelObject.patterns) patternObject = channelObject.patterns[i];
					if (patternObject == undefined) continue;
					
					pattern.instrument = clip(0, this.instruments, int(patternObject.instrument) - 1);
					
					if (patternObject.pitches && patternObject.pitches.length > 0) {
						const maxNoteCount: int = Math.min(this.beats * this.parts, uint(patternObject.pitches.length));
						
						///@TODO: Consider supporting pitches specified in any timing order, sorting them and truncating as necessary. 
						var tickClock: int = 0;
						for (var j: int = 0; j < patternObject.pitches.length; j++) {
							if (j >= maxNoteCount) break;
							
							const pitchObject: * = patternObject.pitches[j];
							if (!pitchObject || !pitchObject.pitches || !(pitchObject.pitches.length >= 1) || !pitchObject.points || !(pitchObject.points.length >= 2)) {
								continue;
							}
							
							const note: Note = new Note(0, 0, 0, 0);
							note.pitches = [];
							note.pins = [];
							
							for (k = 0; k < pitchObject.pitches.length; k++) {
								const pitch: int = int(pitchObject.pitches[k]);
								if (note.pitches.indexOf(pitch) != -1) continue;
								note.pitches.push(pitch);
								if (note.pitches.length >= 4) break;
							}
							if (note.pitches.length < 1) continue;
							
							var noteClock: int = tickClock;
							var startInterval: int = 0;
							for (k = 0; k < pitchObject.points.length; k++) {
								const pointObject: * = pitchObject.points[k];
								if (pointObject == undefined || pointObject.tick == undefined) continue;
								const interval: int = (pointObject.pitchBend == undefined) ? 0 : int(pointObject.pitchBend);
								const time: int = int(pointObject.tick);
								const volume: int = (pointObject.volume == undefined) ? 3 : Math.max(0, Math.min(3, Math.round(int(pointObject.volume) * 3.0 / 100.0)));
								
								if (time > this.beats * this.parts) continue;
								if (note.pins.length == 0) {
									if (time < noteClock) continue;
									note.start = time;
									startInterval = interval;
								} else {
									if (time <= noteClock) continue;
								}
								noteClock = time;
								
								note.pins.push(new NotePin(interval - startInterval, time - note.start, volume));
							}
							if (note.pins.length < 2) continue;
							
							note.end = note.pins[note.pins.length - 1].time + note.start;
							
							const maxPitch: int = channel == 3 ? Music.drumCount - 1 : Music.maxPitch;
							var lowestPitch: int = maxPitch;
							var highestPitch: int = 0;
							for (k = 0; k < note.pitches.length; k++) {
								note.pitches[k] += startInterval;
								if (note.pitches[k] < 0 || note.pitches[k] > maxPitch) {
									note.pitches.splice(k, 1);
									k--;
								}
								if (note.pitches[k] < lowestPitch) lowestPitch = note.pitches[k];
								if (note.pitches[k] > highestPitch) highestPitch = note.pitches[k];
							}
							if (note.pitches.length < 1) continue;
							
							for (k = 0; k < note.pins.length; k++) {
								const pin: NotePin = note.pins[k];
								if (pin.interval + lowestPitch < 0) pin.interval = -lowestPitch;
								if (pin.interval + highestPitch > maxPitch) pin.interval = maxPitch - highestPitch;
								if (k >= 2) {
									if (pin.interval == note.pins[k-1].interval && 
									    pin.interval == note.pins[k-2].interval && 
									    pin.volume == note.pins[k-1].volume && 
									    pin.volume == note.pins[k-2].volume)
									{
										note.pins.splice(k-1, 1);
										k--;
									}    
								}
							}
							
							pattern.notes.push(note);
							tickClock = note.end;
						}
					}
				}
				
				for (i = 0; i < this.bars; i++) {
					this.channelBars[channel][i] = channelObject.sequence ? Math.min(this.patterns, uint(channelObject.sequence[i])) : 0;
				}
			}
		}
		
		private function clip(min: int, max: int, val: int): int {
			if (val < max) {
				if (val >= min) return val;
				else return min;
			} else {
				return max - 1;
			}
		}
		
		public function getPattern(channel: int, bar: int): BarPattern {
			var patternIndex: int = channelBars[channel][bar];
			if (patternIndex == 0) return null;
			return channelPatterns[channel][patternIndex - 1];
		}
		
		public function getPatternInstrument(channel: int, bar: int): int {
			var pattern: BarPattern = getPattern(channel, bar);
			return pattern == null ? 0 : pattern.instrument;
		}
		
		public function getBeatsPerMinute(): int {
			return Math.round(120.0 * Math.pow(2.0, (-4.0 + this.tempo) / 9.0));
		}
	}
}
	
class BitFieldReader {
	private var bits: Array = [];
	private var readIndex: int = 0;
	
	public function BitFieldReader(base64CharToInt: Object, source: String) {
		for each (var char: String in source.split("")) {
			var value: int = base64CharToInt[char];
			bits.push((value & 0x20) != 0);
			bits.push((value & 0x10) != 0);
			bits.push((value & 0x08) != 0);
			bits.push((value & 0x04) != 0);
			bits.push((value & 0x02) != 0);
			bits.push((value & 0x01) != 0);
		}
	}
	
	public function read(bitCount: int): int {
		var result: int = 0;
		while (bitCount > 0) {
			result = result << 1;
			result += bits[readIndex++] ? 1 : 0;
			bitCount--;
		}
		return result;
	}
	
	public function readLongTail(minValue: int, minBits: int): int {
		var result: int = minValue;
		var numBits: int = minBits;
		while (bits[readIndex++]) {
			result += 1 << numBits;
			numBits++;
		}
		while (numBits > 0) {
			numBits--;
			if (bits[readIndex++]) {
				result += 1 << numBits;
			}
		}
		return result;
	}
	
	public function readPartDuration(): int {
		return readLongTail(1, 2);
	}
	
	public function readPinCount(): int {
		return readLongTail(1, 0);
	}
	
	public function readPitchInterval(): int {
		if (read(1)) {
			return -readLongTail(1, 3);
		} else {
			return readLongTail(1, 3);
		}
	}
}

class BitFieldWriter {
	private var bits: Array = [];
	
	public function write(bitCount: int, value: int): void {
		bitCount--;
		while (bitCount >= 0) {
			bits.push(((value >> bitCount) & 1) == 1);
			bitCount--;
		}
	}
	
	public function writeLongTail(minValue: int, minBits: int, value: int): void {
		if (value < minValue) throw new Error();
		value -= minValue;
		var numBits: int = minBits;
		while (value >= (1 << numBits)) {
			bits.push(true);
			value -= 1 << numBits;
			numBits++;
		}
		bits.push(false);
		while (numBits > 0) {
			numBits--;
			bits.push((value & (1 << numBits)) != 0);
		}
	}
	
	public function writePartDuration(value: int): void {
		writeLongTail(1, 2, value);
	}
	
	public function writePinCount(value: int): void {
		writeLongTail(1, 0, value);
	}
	
	public function writePitchInterval(value: int): void {
		if (value < 0) {
			write(1, 1); // sign
			writeLongTail(1, 3, -value);
		} else {
			write(1, 0); // sign
			writeLongTail(1, 3, value);
		}
	}
	
	public function concat(other: BitFieldWriter): void {
		bits = bits.concat(other.bits);
	}
	
	public function encodeBase64(base64: Array): String {
		var result: String = "";
		for (var i: int = 0; i < bits.length; i += 6) {
			var value: int = 0;
			if (bits[i+0]) value += 0x20;
			if (bits[i+1]) value += 0x10;
			if (bits[i+2]) value += 0x08;
			if (bits[i+3]) value += 0x04;
			if (bits[i+4]) value += 0x02;
			if (bits[i+5]) value += 0x01;
			result += base64[value];
			
		}
		return result;
	}
}
