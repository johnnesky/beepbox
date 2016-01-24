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

"use strict";

interface Window {
	AudioContext: any;
	webkitAudioContext: any;
	mozAudioContext: any;
	oAudioContext: any;
	msAudioContext: any;
}

module beepbox {
	export class BitField {
		private _base64: string[];
		private _bits: boolean[] = [];
		private _readIndex: number = 0;
		
		constructor(base64: string[]) {
			this._base64 = base64;
		}
		
		public load(source: string): void {
			source.split("").forEach((char: string)=>{
				var value: number = this._base64.indexOf(char);
				this._bits.push((value & 0x20) != 0);
				this._bits.push((value & 0x10) != 0);
				this._bits.push((value & 0x08) != 0);
				this._bits.push((value & 0x04) != 0);
				this._bits.push((value & 0x02) != 0);
				this._bits.push((value & 0x01) != 0);
			});
		}
		
		public addPadding(): void {
			while ((this._bits.length % 6) != 0) {
				this._bits.push(false);
			}
		}
		
		public skipPadding(): void {
			this._readIndex += 5 - ((this._readIndex + 5) % 6);
		}
		
		public write(bitCount: number, value: number): void {
			bitCount--;
			while (bitCount >= 0) {
				this._bits.push(((value >> bitCount) & 1) == 1);
				bitCount--;
			}
		}
		
		public read(bitCount: number): number {
			var result: number = 0;
			while (bitCount > 0) {
				result = result << 1;
				result += this._bits[this._readIndex++] ? 1 : 0;
				bitCount--;
			}
			return result;
		}
		
		public writeLongTail(minValue: number, minBits: number, value: number): void {
			if (value < minValue) throw new Error("value out of bounds");
			value -= minValue;
			var numBits: number = minBits;
			while (value >= (1 << numBits)) {
				this._bits.push(true);
				value -= 1 << numBits;
				numBits++;
			}
			this._bits.push(false);
			while (numBits > 0) {
				numBits--;
				this._bits.push((value & (1 << numBits)) != 0);
			}
		}
		
		public readLongTail(minValue: number, minBits: number): number {
			var result: number = minValue;
			var numBits: number = minBits;
			while (this._bits[this._readIndex++]) {
				result += 1 << numBits;
				numBits++;
			}
			while (numBits > 0) {
				numBits--;
				if (this._bits[this._readIndex++]) {
					result += 1 << numBits;
				}
			}
			return result;
		}
		
		public writePartDuration(value: number): void {
			this.writeLongTail(1, 2, value);
		}
		
		public readPartDuration(): number {
			return this.readLongTail(1, 2);
		}
		
		public writePinCount(value: number): void {
			this.writeLongTail(1, 0, value);
		}
		
		public readPinCount(): number {
			return this.readLongTail(1, 0);
		}
		
		public writeNoteInterval(value: number): void {
			if (value < 0) {
				this.write(1, 1); // sign
				this.writeLongTail(1, 3, -value);
			} else {
				this.write(1, 0); // sign
				this.writeLongTail(1, 3, value);
			}
		}
		
		public readNoteInterval(): number {
			if (this.read(1)) {
				return -this.readLongTail(1, 3);
			} else {
				return this.readLongTail(1, 3);
			}
		}
		
		public concat(other: BitField): void {
			this._bits = this._bits.concat(other._bits);
		}
		
		public toString(): string {
			var paddedBits: boolean[] = this._bits.concat([false, false, false, false, false, false]);
			var result: string = "";
			for (var i: number = 0; i < this._bits.length; i += 6) {
				var value: number = 0;
				if (this._bits[i+0]) value += 0x20;
				if (this._bits[i+1]) value += 0x10;
				if (this._bits[i+2]) value += 0x08;
				if (this._bits[i+3]) value += 0x04;
				if (this._bits[i+4]) value += 0x02;
				if (this._bits[i+5]) value += 0x01;
				result += this._base64[value];
				
			}
			return result;
		}
		
		public traceBits(): void {
			console.log(this._bits);
		}
	}

	export class Music {
		public static scaleNames: string[] = ["easy :)", "easy :(", "island :)", "island :(", "blues :)", "blues :(", "normal :)", "normal :(", "romani :)", "romani :(", "enigma", "expert"];
		public static scaleFlags: boolean[][] = [
			[ true, false,  true, false,  true, false, false,  true, false,  true, false, false],
			[ true, false, false,  true, false,  true, false,  true, false, false,  true, false],
			[ true, false, false, false,  true,  true, false,  true, false, false, false,  true],
			[ true,  true, false,  true, false, false, false,  true,  true, false, false, false],
			[ true, false, false,  true,  true, false, false,  true, false,  true,  true, false],
			[ true, false, false,  true, false,  true,  true,  true, false, false,  true, false],
			[ true, false,  true, false,  true,  true, false,  true, false,  true, false,  true],
			[ true, false,  true,  true, false,  true, false,  true,  true, false,  true, false],
			[ true,  true, false, false,  true,  true, false,  true,  true, false,  true, false],
			[ true, false,  true,  true, false, false,  true,  true,  true, false, false,  true],
			[ true, false,  true, false,  true, false,  true, false,  true, false,  true, false],
			[ true,  true,  true,  true,  true,  true,  true,  true,  true,  true,  true,  true],
		];
		public static pianoScaleFlags: boolean[] = [ true, false,  true, false,  true,  true, false,  true, false,  true, false,  true];
		// C1 has index 24 on the MIDI scale. C8 is 108, and C9 is 120. C10 is barely in the audible range.
		public static keyNames: string[] = ["B", "A#", "A", "G#", "G", "F#", "F", "E", "D#", "D", "C#", "C"];
		public static keyTransposes: number[] = [23, 22, 21, 20, 19, 18, 17, 16, 15, 14, 13, 12];
		public static tempoNames: string[] = ["molasses", "slow", "leisurely", "moderate", "steady", "brisk", "hasty", "fast", "strenuous", "grueling", "hyper", "ludicrous"];
		public static beatsMin: number = 3;
		public static beatsMax: number = 12;
		public static barsMin: number = 1;
		public static barsMax: number = 128;
		public static patternsMin: number = 1;
		public static patternsMax: number = 32;
		public static instrumentsMin: number = 1;
		public static instrumentsMax: number = 10;
		public static partNames: string[] = ["triples", "standard"];
		public static partCounts: number[] = [3, 4];
		public static noteNames: string[] = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
		public static waveNames: string[] = ["triangle", "square", "pulse wide", "pulse narrow", "sawtooth", "double saw", "double pulse", "spiky", "plateau"];
		public static waveVolumes: number[] = [1.0, 0.5, 0.5, 0.5, 0.65, 0.5, 0.4, 0.4, 0.94];
		public static drumNames: string[] = ["retro", "white"];
		public static drumVolumes: number[] = [0.25, 1.0];
		public static filterNames: string[] = ["sustain sharp", "sustain medium", "sustain soft", "decay sharp", "decay medium", "decay soft"];
		public static filterBases: number[] = [2.0, 3.5, 5.0, 1.0, 2.5, 4.0];
		public static filterDecays: number[] = [0.0, 0.0, 0.0, 10.0, 7.0, 4.0];
		public static filterVolumes: number[] = [0.4, 0.7, 1.0, 0.5, 0.75, 1.0];
		public static attackNames: string[] = ["binary", "sudden", "smooth", "slide"];
		public static effectNames: string[] = ["none", "vibrato light", "vibrato delayed", "vibrato heavy", "tremelo light", "tremelo heavy"];
		public static effectVibratos: number[] = [0.0, 0.15, 0.3, 0.45, 0.0, 0.0];
		public static effectTremelos: number[] = [0.0, 0.0, 0.0, 0.0, 0.25, 0.5];
		public static chorusNames: string[] = ["union", "shimmer", "hum", "honky tonk", "dissonant", "fifths", "octaves"];
		public static chorusValues: number[] = [0.0, 0.02, 0.05, 0.1, 0.25, 3.5, 6];
		public static chorusOffsets: number[] = [0.0, 0.0, 0.0, 0.0, 0.0, 3.5, 6];
		public static chorusVolumes: number[] = [0.7, 0.8, 1.0, 1.0, 0.9, 0.9, 0.8];
		public static volumeNames: string[] = ["loudest", "loud", "medium", "quiet", "quietest", "mute"];
		public static volumeValues: number[] = [0.0, 0.5, 1.0, 1.5, 2.0, -1.0];
		public static channelVolumes: number[] = [0.27, 0.27, 0.27, 0.19];
		public static drumInterval: number = 6;
		public static numChannels: number = 4;
		public static drumCount: number = 11;
		public static noteCount: number = 37;
		public static maxPitch: number = 84;
	}

	export class TonePin {
		public interval: number;
		public time: number;
		public volume: number;
		
		constructor(interval: number, time: number, volume: number) {
			this.interval = interval;
			this.time = time;
			this.volume = volume;
		}
	}

	export class Tone {
		public notes: number[];
		public pins: TonePin[];
		public start: number;
		public end: number;
		
		constructor(note: number, start: number, end: number, volume: number, fadeout: boolean = false) {
			this.notes = [note];
			this.pins = [new TonePin(0, 0, volume), new TonePin(0, end - start, fadeout ? 0 : volume)];
			this.start = start;
			this.end = end;
		}
	}

	export class BarPattern {
		public tones: Tone[];
		public instrument: number;
		constructor() {
			this.tones = [];
			this.instrument = 0;
		}
		
		public cloneTones(): Tone[] {
			var result: Tone[] = [];
			this.tones.forEach((oldTone: Tone)=>{
				var newTone: Tone = new Tone(-1, oldTone.start, oldTone.end, 3);
				newTone.notes = oldTone.notes.concat();
				newTone.pins = [];
				oldTone.pins.forEach((oldPin: TonePin)=>{
					newTone.pins.push(new TonePin(oldPin.interval, oldPin.time, oldPin.volume));
				});
				result.push(newTone);
			});
			return result;
		}
	}

	export class Song {
		private static _oldestVersion: number = 2;
		private static _latestVersion: number = 5;
		private static _oldBase64: string[] = ["0","1","2","3","4","5","6","7","8","9","a","b","c","d","e","f","g","h","i","j","k","l","m","n","o","p","q","r","s","t","u","v","w","x","y","z","A","B","C","D","E","F","G","H","I","J","K","L","M","N","O","P","Q","R","S","T","U","V","W","X","Y","Z",".","_",];
		private static _newBase64: string[] = ["0","1","2","3","4","5","6","7","8","9","a","b","c","d","e","f","g","h","i","j","k","l","m","n","o","p","q","r","s","t","u","v","w","x","y","z","A","B","C","D","E","F","G","H","I","J","K","L","M","N","O","P","Q","R","S","T","U","V","W","X","Y","Z","-","_",];
		
		public scale: number;
		public key: number;
		public tempo: number;
		public beats: number;
		public bars: number;
		public patterns: number;
		public parts: number;
		public instruments: number;
		public loopStart: number;
		public loopLength: number;
		public channelPatterns: BarPattern[][];
		public channelBars: number[][];
		public channelOctaves: number[];
		public instrumentWaves: number[][];
		public instrumentFilters: number[][];
		public instrumentAttacks: number[][];
		public instrumentEffects: number[][];
		public instrumentChorus: number[][];
		public instrumentVolumes: number[][];
		
		constructor(string: string = null) {
			if (string != null) {
				this.fromString(string, false);
			} else {
				this.initToDefault(false);
			}
		}
		
		public initToDefault(skipPatterns: boolean = false): void {
			if (!skipPatterns) {
				this.channelPatterns = [
					[new BarPattern(), new BarPattern(), new BarPattern(), new BarPattern(), new BarPattern(), new BarPattern(), new BarPattern(), new BarPattern()], 
					[new BarPattern(), new BarPattern(), new BarPattern(), new BarPattern(), new BarPattern(), new BarPattern(), new BarPattern(), new BarPattern()], 
					[new BarPattern(), new BarPattern(), new BarPattern(), new BarPattern(), new BarPattern(), new BarPattern(), new BarPattern(), new BarPattern()], 
					[new BarPattern(), new BarPattern(), new BarPattern(), new BarPattern(), new BarPattern(), new BarPattern(), new BarPattern(), new BarPattern()], 
				];
			}
			this.channelBars = [
				[1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
				[1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
				[1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
				[1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
			];
			this.channelOctaves = [3,2,1,0];
			this.instrumentVolumes = [[0],[0],[0],[0]];
			this.instrumentWaves   = [[1],[1],[1],[1]];
			this.instrumentFilters = [[0],[0],[0],[0]];
			this.instrumentAttacks = [[1],[1],[1],[1]];
			this.instrumentEffects = [[0],[0],[0],[0]];
			this.instrumentChorus  = [[0],[0],[0],[0]];
			this.scale = 0;
			this.key = Music.keyNames.length - 1;
			this.loopStart = 0;
			this.loopLength = 4;
			this.tempo = 7;
			this.beats = 8;
			this.bars = 16;
			this.patterns = 8;
			this.parts = 4;
			this.instruments = 1;
		}
		
		public toString(): string {
			var channel: number;
			var i: number;
			var bits: BitField;
			var result: string = "#";
			var base64: string[] = Song._newBase64;
			
			result += base64[Song._latestVersion];
			result += "s" + base64[this.scale];
			result += "k" + base64[this.key];
			result += "l" + base64[this.loopStart >> 6] + base64[this.loopStart & 0x3f];
			result += "e" + base64[(this.loopLength - 1) >> 6] + base64[(this.loopLength - 1) & 0x3f];
			result += "t" + base64[this.tempo];
			result += "a" + base64[this.beats - 1];
			result += "g" + base64[(this.bars - 1) >> 6] + base64[(this.bars - 1) & 0x3f];
			result += "j" + base64[this.patterns - 1];
			result += "i" + base64[this.instruments - 1];
			result += "r" + base64[Music.partCounts.indexOf(this.parts)];
			
			result += "w";
			for (channel = 0; channel < Music.numChannels; channel++) for (i = 0; i < this.instruments; i++) {
				result += base64[this.instrumentWaves[channel][i]];
			}
			
			result += "f";
			for (channel = 0; channel < Music.numChannels; channel++) for (i = 0; i < this.instruments; i++) {
				result += base64[this.instrumentFilters[channel][i]];
			}
			
			result += "d";
			for (channel = 0; channel < Music.numChannels; channel++) for (i = 0; i < this.instruments; i++) {
				result += base64[this.instrumentAttacks[channel][i]];
			}
			
			result += "c";
			for (channel = 0; channel < Music.numChannels; channel++) for (i = 0; i < this.instruments; i++) {
				result += base64[this.instrumentEffects[channel][i]];
			}
			
			result += "h";
			for (channel = 0; channel < Music.numChannels; channel++) for (i = 0; i < this.instruments; i++) {
				result += base64[this.instrumentChorus[channel][i]];
			}
			
			result += "v";
			for (channel = 0; channel < Music.numChannels; channel++) for (i = 0; i < this.instruments; i++) {
				result += base64[this.instrumentVolumes[channel][i]];
			}
			
			result += "o";
			for (channel = 0; channel < Music.numChannels; channel++) {
				result += base64[this.channelOctaves[channel]];
			}
			
			result += "b";
			bits = new BitField(base64);
			var neededBits: number = 0;
			while ((1 << neededBits) < this.patterns + 1) neededBits++;
			for (channel = 0; channel < Music.numChannels; channel++) for (i = 0; i < this.bars; i++) {
				bits.write(neededBits, this.channelBars[channel][i]);
			}
			result += bits.toString();
			
			result += "p";
			bits = new BitField(base64);
			var neededInstrumentBits: number = 0;
			while ((1 << neededInstrumentBits) < this.instruments) neededInstrumentBits++;
			for (channel = 0; channel < Music.numChannels; channel++) {
				var octaveOffset: number = channel == 3 ? 0 : this.channelOctaves[channel] * 12;
				var lastNote: number = (channel == 3 ? 4 : 12) + octaveOffset;
				var recentNotes: number[] = channel == 3 ? [4,6,7,2,3,8,0,10] : [12, 19, 24, 31, 36, 7, 0];
				var recentShapes: string[] = [];
				for (i = 0; i < recentNotes.length; i++) {
					recentNotes[i] += octaveOffset;
				}
				this.channelPatterns[channel].forEach((p: BarPattern)=>{
					bits.write(neededInstrumentBits, p.instrument);
					
					if (p.tones.length > 0) {
						bits.write(1, 1);
						
						var curPart: number = 0;
						p.tones.forEach(function(t: Tone): void {
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
							
							var shapePart: number = 0;
							var startNote: number = t.notes[0];
							var currentNote: number = startNote;
							var pitchBends: number[] = [];
							for (i = 1; i < t.pins.length; i++) {
								var pin: TonePin = t.pins[i];
								var nextNote: number = startNote + pin.interval;
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
							
							var shapeString: string = shapeBits.toString();
							var shapeIndex: number = recentShapes.indexOf(shapeString);
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
							
							var allNotes: number[] = t.notes.concat(pitchBends);
							for (i = 0; i < allNotes.length; i++) {
								var note: number = allNotes[i];
								var noteIndex: number = recentNotes.indexOf(note);
								if (noteIndex == -1) {
									var interval: number = 0;
									var noteIter: number = lastNote;
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
						}, this);
						
						if (curPart < this.beats * this.parts) {
							bits.write(2, 0); // rest
							bits.writePartDuration(this.beats * this.parts - curPart);
						}
					} else {
						bits.write(1, 0);
					}
				});
			}
			var bitString: string = bits.toString();
			var stringLength: number = bitString.length;
			var digits: string = "";
			while (stringLength > 0) {
				digits = base64[stringLength & 0x3f] + digits;
				stringLength = stringLength >> 6;
			}
			result += base64[digits.length];
			result += digits;
			result += bitString;
			
			return result;
		}
		
		public fromString(compressed: string, skipPatterns: boolean = false): void {
			this.initToDefault(skipPatterns);
			if (compressed == null || compressed.length == 0) return;
			if (compressed.charAt(0) == "#") compressed = compressed.substring(1);
			var charIndex: number = 0;
			var version: number = Song._newBase64.indexOf(compressed.charAt(charIndex++));
			if (version == -1 || version > Song._latestVersion || version < Song._oldestVersion) return;
			var beforeThree: boolean = version < 3;
			var beforeFour:  boolean = version < 4;
			var beforeFive:  boolean = version < 5;
			var base64: string[] = beforeThree ? Song._oldBase64 : Song._newBase64;
			if (beforeThree) this.instrumentAttacks = [[0],[0],[0],[0]];
			if (beforeThree) this.instrumentWaves   = [[1],[1],[1],[0]];
			while (charIndex < compressed.length) {
				var command: string = compressed.charAt(charIndex++);
				var bits: BitField;
				var channel: number;
				var i: number;
				var j: number;
				if (command == "s") {
					this.scale = base64.indexOf(compressed.charAt(charIndex++));
					if (beforeThree && this.scale == 10) this.scale = 11;
				} else if (command == "k") {
					this.key = base64.indexOf(compressed.charAt(charIndex++));
				} else if (command == "l") {
					if (beforeFive) {
						this.loopStart = base64.indexOf(compressed.charAt(charIndex++));
					} else {
						this.loopStart = (base64.indexOf(compressed.charAt(charIndex++)) << 6) + base64.indexOf(compressed.charAt(charIndex++));
					}
				} else if (command == "e") {
					if (beforeFive) {
						this.loopLength = base64.indexOf(compressed.charAt(charIndex++));
					} else {
						this.loopLength = (base64.indexOf(compressed.charAt(charIndex++)) << 6) + base64.indexOf(compressed.charAt(charIndex++)) + 1;
					}
				} else if (command == "t") {
					if (beforeFour) {
						this.tempo = [1, 4, 7, 10][base64.indexOf(compressed.charAt(charIndex++))];
					} else {
						this.tempo = base64.indexOf(compressed.charAt(charIndex++));
					}
					this.tempo = Math.max(0, Math.min(Music.tempoNames.length, this.tempo));
				} else if (command == "a") {
					if (beforeThree) {
						this.beats = [6, 7, 8, 9, 10][base64.indexOf(compressed.charAt(charIndex++))];
					} else {
						this.beats = base64.indexOf(compressed.charAt(charIndex++)) + 1;
					}
					this.beats = Math.max(Music.beatsMin, Math.min(Music.beatsMax, this.beats));
				} else if (command == "g") {
					this.bars = (base64.indexOf(compressed.charAt(charIndex++)) << 6) + base64.indexOf(compressed.charAt(charIndex++)) + 1;
					this.bars = Math.max(Music.barsMin, Math.min(Music.barsMax, this.bars));
				} else if (command == "j") {
					this.patterns = base64.indexOf(compressed.charAt(charIndex++)) + 1;
					this.patterns = Math.max(Music.patternsMin, Math.min(Music.patternsMax, this.patterns));
				} else if (command == "i") {
					this.instruments = base64.indexOf(compressed.charAt(charIndex++)) + 1;
					this.instruments = Math.max(Music.instrumentsMin, Math.min(Music.instrumentsMax, this.instruments));
				} else if (command == "r") {
					this.parts = Music.partCounts[base64.indexOf(compressed.charAt(charIndex++))];
				} else if (command == "w") {
					if (beforeThree) {
						channel = base64.indexOf(compressed.charAt(charIndex++));
						this.instrumentWaves[channel][0] = this._clip(0, Music.waveNames.length, base64.indexOf(compressed.charAt(charIndex++)));
					} else {
						for (channel = 0; channel < Music.numChannels; channel++) for (i = 0; i < this.instruments; i++) {
							this.instrumentWaves[channel][i] = this._clip(0, Music.waveNames.length, base64.indexOf(compressed.charAt(charIndex++)));
						}
					}
				} else if (command == "f") {
					if (beforeThree) {
						channel = base64.indexOf(compressed.charAt(charIndex++));
						this.instrumentFilters[channel][0] = [0, 2, 3, 5][this._clip(0, Music.filterNames.length, base64.indexOf(compressed.charAt(charIndex++)))];
					} else {
						for (channel = 0; channel < Music.numChannels; channel++) for (i = 0; i < this.instruments; i++) {
							this.instrumentFilters[channel][i] = this._clip(0, Music.filterNames.length, base64.indexOf(compressed.charAt(charIndex++)));
						}
					}
				} else if (command == "d") {
					if (beforeThree) {
						channel = base64.indexOf(compressed.charAt(charIndex++));
						this.instrumentAttacks[channel][0] = this._clip(0, Music.attackNames.length, base64.indexOf(compressed.charAt(charIndex++)));
					} else {
						for (channel = 0; channel < Music.numChannels; channel++) for (i = 0; i < this.instruments; i++) {
							this.instrumentAttacks[channel][i] = this._clip(0, Music.attackNames.length, base64.indexOf(compressed.charAt(charIndex++)));
						}
					}
				} else if (command == "c") {
					if (beforeThree) {
						channel = base64.indexOf(compressed.charAt(charIndex++));
						this.instrumentEffects[channel][0] = this._clip(0, Music.effectNames.length, base64.indexOf(compressed.charAt(charIndex++)));
						if (this.instrumentEffects[channel][0] == 1) this.instrumentEffects[channel][0] = 3;
						else if (this.instrumentEffects[channel][0] == 3) this.instrumentEffects[channel][0] = 5;
					} else {
						for (channel = 0; channel < Music.numChannels; channel++) for (i = 0; i < this.instruments; i++) {
							this.instrumentEffects[channel][i] = this._clip(0, Music.effectNames.length, base64.indexOf(compressed.charAt(charIndex++)));
						}
					}
				} else if (command == "h") {
					if (beforeThree) {
						channel = base64.indexOf(compressed.charAt(charIndex++));
						this.instrumentChorus[channel][0] = this._clip(0, Music.chorusNames.length, base64.indexOf(compressed.charAt(charIndex++)));
					} else {
						for (channel = 0; channel < Music.numChannels; channel++) for (i = 0; i < this.instruments; i++) {
							this.instrumentChorus[channel][i] = this._clip(0, Music.chorusNames.length, base64.indexOf(compressed.charAt(charIndex++)));
						}
					}
				} else if (command == "v") {
					if (beforeThree) {
						channel = base64.indexOf(compressed.charAt(charIndex++));
						this.instrumentVolumes[channel][0] = this._clip(0, Music.volumeNames.length, base64.indexOf(compressed.charAt(charIndex++)));
					} else {
						for (channel = 0; channel < Music.numChannels; channel++) for (i = 0; i < this.instruments; i++) {
							this.instrumentVolumes[channel][i] = this._clip(0, Music.volumeNames.length, base64.indexOf(compressed.charAt(charIndex++)));
						}
					}
				} else if (command == "o") {
					if (beforeThree) {
						channel = base64.indexOf(compressed.charAt(charIndex++));
						this.channelOctaves[channel] = this._clip(0, 5, base64.indexOf(compressed.charAt(charIndex++)));
					} else {
						for (channel = 0; channel < Music.numChannels; channel++) {
							this.channelOctaves[channel] = this._clip(0, 5, base64.indexOf(compressed.charAt(charIndex++)));
						}
					}
				} else if (command == "b") {
					var subStringLength: number;
					if (beforeThree) {
						channel = base64.indexOf(compressed.charAt(charIndex++));
						var barCount: number = base64.indexOf(compressed.charAt(charIndex++));
						subStringLength = Math.ceil(barCount * 0.5);
						bits = new BitField(base64);
						bits.load(compressed.substr(charIndex, subStringLength));
						for (i = 0; i < barCount; i++) {
							this.channelBars[channel][i] = bits.read(3) + 1;
						}
					} else if (beforeFive) {
						var neededBits: number = 0;
						while ((1 << neededBits) < this.patterns) neededBits++;
						bits = new BitField(base64);
						subStringLength = Math.ceil(Music.numChannels * this.bars * neededBits / 6);
						bits.load(compressed.substr(charIndex, subStringLength));
						for (channel = 0; channel < Music.numChannels; channel++) for (i = 0; i < this.bars; i++) {
							this.channelBars[channel][i] = bits.read(neededBits) + 1;
						}
					} else {
						var neededBits2: number = 0;
						while ((1 << neededBits2) < this.patterns + 1) neededBits2++;
						bits = new BitField(base64);
						subStringLength = Math.ceil(Music.numChannels * this.bars * neededBits2 / 6);
						bits.load(compressed.substr(charIndex, subStringLength));
						for (channel = 0; channel < Music.numChannels; channel++) for (i = 0; i < this.bars; i++) {
							this.channelBars[channel][i] = bits.read(neededBits2);
						}
					}
					charIndex += subStringLength;
				} else if (command == "p") {
					var bitStringLength: number = 0;
					if (beforeThree) {
						channel = base64.indexOf(compressed.charAt(charIndex++));
						var patternCount: number = base64.indexOf(compressed.charAt(charIndex++));
						
						bitStringLength = base64.indexOf(compressed.charAt(charIndex++));
						bitStringLength = bitStringLength << 6;
						bitStringLength += base64.indexOf(compressed.charAt(charIndex++));
					} else {
						channel = 0;
						var bitStringLengthLength: number = base64.indexOf(compressed.charAt(charIndex++));
						while (bitStringLengthLength > 0) {
							bitStringLength = bitStringLength << 6;
							bitStringLength += base64.indexOf(compressed.charAt(charIndex++));
							bitStringLengthLength--;
						}
					}
					
					bits = new BitField(base64);
					bits.load(compressed.substr(charIndex, bitStringLength));
					charIndex += bitStringLength;
					
					if (!skipPatterns) {
						var neededInstrumentBits: number = 0;
						while ((1 << neededInstrumentBits) < this.instruments) neededInstrumentBits++;
						while (true) {
							this.channelPatterns[channel] = [];
							
							var octaveOffset: number = channel == 3 ? 0 : this.channelOctaves[channel] * 12;
							var tone: Tone = null;
							var pin: TonePin = null;
							var lastNote: number = (channel == 3 ? 4 : 12) + octaveOffset;
							var recentNotes: number[] = channel == 3 ? [4,6,7,2,3,8,0,10] : [12, 19, 24, 31, 36, 7, 0];
							var recentShapes: any[] = [];
							for (i = 0; i < recentNotes.length; i++) {
								recentNotes[i] += octaveOffset;
							}
							for (i = 0; i < this.patterns; i++) {
								var newPattern: BarPattern = new BarPattern();
								newPattern.instrument = bits.read(neededInstrumentBits);
								this.channelPatterns[channel][i] = newPattern;
								
								if (!beforeThree && bits.read(1) == 0) continue;
								
								var curPart: number = 0;
								var newTones: Tone[] = [];
								while (curPart < this.beats * this.parts) {
									
									var useOldShape: boolean = bits.read(1) == 1;
									var newTone: boolean = false;
									var shapeIndex: number = 0;
									if (useOldShape) {
										shapeIndex = bits.readLongTail(0, 0);
									} else {
										newTone = bits.read(1) == 1;
									}
									
									if (!useOldShape && !newTone) {
										var restLength: number = bits.readPartDuration();
										curPart += restLength;
									} else {
										var shape: any;
										var pinObj: any;
										var note: number;
										if (useOldShape) {
											shape = recentShapes[shapeIndex];
											recentShapes.splice(shapeIndex, 1);
										} else {
											shape = {};
											
											shape.noteCount = 1;
											while (shape.noteCount < 4 && bits.read(1) == 1) shape.noteCount++;
											
											shape.pinCount = bits.readPinCount();
											shape.initialVolume = bits.read(2);
											
											shape.pins = [];
											shape.length = 0;
											shape.bendCount = 0;
											for (j = 0; j < shape.pinCount; j++) {
												pinObj = {};
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
										var pitchBends: number[] = [];
										for (j = 0; j < shape.noteCount + shape.bendCount; j++) {
											var useOldNote: boolean = bits.read(1) == 1;
											if (!useOldNote) {
												var interval: number = bits.readNoteInterval();
												note = lastNote;
												var intervalIter: number = interval;
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
												var noteIndex: number = bits.read(3);
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
										
										shape.pins.forEach((pinObj)=>{
											if (pinObj.pitchBend) pitchBends.shift();
											pin = new TonePin(pitchBends[0] - tone.notes[0], pinObj.time, pinObj.volume);
											tone.pins.push(pin);
										});
										curPart = tone.end;
										newTones.push(tone);
									}
								}
								newPattern.tones = newTones;
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
		}
		
		private _clip(min: number, max: number, val: number): number {
			max = max - 1;
			if (val <= max) {
				if (val >= min) return val;
				else return min;
			} else {
				return max;
			}
		}
		
		public getPattern(channel: number, bar: number): BarPattern {
			var patternIndex: number = this.channelBars[channel][bar];
			if (patternIndex == 0) return null;
			return this.channelPatterns[channel][patternIndex - 1];
		}
		
		public getPatternInstrument(channel: number, bar: number): number {
			var pattern: BarPattern = this.getPattern(channel, bar);
			return pattern == null ? 0 : pattern.instrument;
		}
	}

	export class Synth {
		public samplesPerSecond: number = 44100;
		private _effectDuration: number = 0.14;
		private _effectAngle: number = Math.PI * 2.0 / (this._effectDuration * this.samplesPerSecond);
		private _effectYMult: number = 2.0 * Math.cos( this._effectAngle );
		private _limitDecay: number = 1.0 / (2.0 * this.samplesPerSecond);
		
		private _waves: Float64Array[] = [
			new Float64Array([1.0/15.0, 3.0/15.0, 5.0/15.0, 7.0/15.0, 9.0/15.0, 11.0/15.0, 13.0/15.0, 15.0/15.0, 15.0/15.0, 13.0/15.0, 11.0/15.0, 9.0/15.0, 7.0/15.0, 5.0/15.0, 3.0/15.0, 1.0/15.0, -1.0/15.0, -3.0/15.0, -5.0/15.0, -7.0/15.0, -9.0/15.0, -11.0/15.0, -13.0/15.0, -15.0/15.0, -15.0/15.0, -13.0/15.0, -11.0/15.0, -9.0/15.0, -7.0/15.0, -5.0/15.0, -3.0/15.0, -1.0/15.0]),
			new Float64Array([1.0, -1.0]),
			new Float64Array([1.0, -1.0, -1.0, -1.0]),
			new Float64Array([1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0]),
			new Float64Array([1.0/31.0, 3.0/31.0, 5.0/31.0, 7.0/31.0, 9.0/31.0, 11.0/31.0, 13.0/31.0, 15.0/31.0, 17.0/31.0, 19.0/31.0, 21.0/31.0, 23.0/31.0, 25.0/31.0, 27.0/31.0, 29.0/31.0, 31.0/31.0, -31.0/31.0, -29.0/31.0, -27.0/31.0, -25.0/31.0, -23.0/31.0, -21.0/31.0, -19.0/31.0, -17.0/31.0, -15.0/31.0, -13.0/31.0, -11.0/31.0, -9.0/31.0, -7.0/31.0, -5.0/31.0, -3.0/31.0, -1.0/31.0]),
			new Float64Array([0.0, -0.2, -0.4, -0.6, -0.8, -1.0, 1.0, -0.8, -0.6, -0.4, -0.2, 1.0, 0.8, 0.6, 0.4, 0.2, ]),
			new Float64Array([1.0, 1.0, 1.0, 1.0, 1.0, -1.0, -1.0, -1.0, 1.0, 1.0, 1.0, 1.0, -1.0, -1.0, -1.0, -1.0]),
			new Float64Array([1.0, -1.0, 1.0, -1.0, 1.0, 0.0]),
			new Float64Array([0.0, 0.2, 0.4, 0.5, 0.6, 0.7, 0.8, 0.85, 0.9, 0.95, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 0.95, 0.9, 0.85, 0.8, 0.7, 0.6, 0.5, 0.4, 0.2, 0.0, -0.2, -0.4, -0.5, -0.6, -0.7, -0.8, -0.85, -0.9, -0.95, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -0.95, -0.9, -0.85, -0.8, -0.7, -0.6, -0.5, -0.4, -0.2, ]),
		];
		private _drumWaves: Float64Array[] = [ new Float64Array(32767), new Float64Array(32767) ];
		
		public song: Song = null;
		public stutterPressed: boolean = false;
		public pianoPressed: boolean = false;
		public pianoNote: number = 0;
		public pianoChannel: number = 0;
		public enableIntro: boolean = true;
		public enableOutro: boolean = false;
		public loopCount: number = -1;
		public volume: number = 1.0;
		
		private _playhead: number = 0.0;
		private _bar: number = 0;
		private _beat: number = 0;
		private _part: number = 0;
		private _arpeggio: number = 0;
		private _arpeggioSamples: number = 0;
		private _paused: boolean = true;
		private _leadPeriodA: number = 0.0;
		private _leadPeriodB: number = 0.0;
		private _leadSample: number = 0.0;
		private _harmonyPeriodA: number = 0.0;
		private _harmonyPeriodB: number = 0.0;
		private _harmonySample: number = 0.0;
		private _bassPeriodA: number = 0.0;
		private _bassPeriodB: number = 0.0;
		private _bassSample: number = 0.0;
		private _drumPeriod: number = 0.0;
		private _drumSample: number = 0.0;
		private _drumSignal: number = 1.0;
		private _stillGoing: boolean = false;
		//private sound: Sound = new Sound();
		//private soundChannel: SoundChannel = null;
		//private timer: Timer = new Timer(200, 0);
		private _effectPeriod: number = 0.0;
		private _limit: number = 0.0;
		/*
		private _reverbDelay1: number[] = [];
		private _reverbDelayIndex1: number = 0;
		private _reverbDelay2: number[] = [];
		private _reverbDelayIndex2: number = 0;
		private _reverbDelay3: number[] = [];
		private _reverbDelayIndex3: number = 0;
		*/
		private _audioCtx: any;
		private _scriptNode: any;
		
		public get playing(): boolean {
			return !this._paused;
		}
		
		public get playhead(): number {
			return this._playhead;
		}
		
		public get totalSamples(): number {
			if (this.song == null) return 0;
			var samplesPerBar: number = this._getSamplesPerArpeggio() * 4 * this.song.parts * this.song.beats;
			var loopMinCount: number = this.loopCount;
			if (loopMinCount < 0) loopMinCount = 1;
			var bars: number = this.song.loopLength * loopMinCount;
			if (this.enableIntro) bars += this.song.loopStart;
			if (this.enableOutro) bars += this.song.bars - (this.song.loopStart + this.song.loopLength);
			return bars * samplesPerBar;
		}
		
		public get totalSeconds(): number {
			return this.totalSamples / this.samplesPerSecond;
		}
		
		public get totalBars(): number {
			if (this.song == null) return 0.0;
			return this.song.bars;
		}
		
		constructor(song: any = null) {
			var i: number;
			var wave: number[];
			
			this._waves.forEach((wave: Float64Array)=>{
				//wave.fixed = true;
				var sum: number = 0.0;
				for (i = 0; i < wave.length; i++) sum += wave[i];
				var average: number = sum / wave.length;
				for (i = 0; i < wave.length; i++) wave[i] -= average;
			});
			
			this._drumWaves.forEach((wave: Float64Array, index: number)=>{
				if (index == 0) {
					var drumBuffer: number = 1;
					for (i = 0; i < 32767; i++) {
						wave[i] = (drumBuffer & 1) * 2.0 - 1.0;
						var newBuffer: number = drumBuffer >> 1;
						if (((drumBuffer + newBuffer) & 1) == 1) {
							newBuffer += 1 << 14;
						}
						drumBuffer = newBuffer;
					}
				} else if (index == 1) {
					for (i = 0; i < 32767; i++) {
						wave[i] = Math.random() * 2.0 - 1.0;
					}
				}
				//wave.fixed = true;
			});
			
			if (song != null) {
				this.setSong(song);
			}
			/*
			reverbDelay1.length = 1024;
			reverbDelay1.fixed = true;
			for (i = 0; i < reverbDelay1.length; i++) reverbDelay1[i] = 0.0;
			reverbDelay2.length = 1024;
			reverbDelay2.fixed = true;
			for (i = 0; i < reverbDelay2.length; i++) reverbDelay2[i] = 0.0;
			reverbDelay3.length = 1024;
			reverbDelay3.fixed = true;
			for (i = 0; i < reverbDelay3.length; i++) reverbDelay3[i] = 0.0;
			*/
		}
		
		public setSong(song: any): void {
			if (typeof(song) == "string") {
				this.song = new Song(song);
			} else if (song instanceof Song) {
				this.song = song;
			}
		}
		
		public play(): void {
			if (!this._paused) return;
			this._paused = false;
		    var contextClass = (window.AudioContext || window.webkitAudioContext || window.mozAudioContext || window.oAudioContext || window.msAudioContext)
			this._audioCtx = this._audioCtx || new contextClass();
			this._scriptNode = this._audioCtx.createScriptProcessor ? this._audioCtx.createScriptProcessor(2048, 0, 1) : this._audioCtx.createJavaScriptNode(2048, 0, 1); // 2048, 0 input channels, 1 output
			this._scriptNode.onaudioprocess = this._onSampleData.bind(this);
			this._scriptNode.channelCountMode = 'explicit';
			this._scriptNode.channelInterpretation = 'speakers';
			this._scriptNode.connect(this._audioCtx.destination);
			
			this.samplesPerSecond = this._audioCtx.sampleRate;
			this._effectAngle = Math.PI * 2.0 / (this._effectDuration * this.samplesPerSecond);
			this._effectYMult = 2.0 * Math.cos( this._effectAngle );
			this._limitDecay = 1.0 / (2.0 * this.samplesPerSecond);
		}
		
		public pause(): void {
			if (this._paused) return;
			this._paused = true;
			this._scriptNode.disconnect(this._audioCtx.destination);
			if (this._audioCtx.close) {
				this._audioCtx.close(); // firefox is missing this function?
				this._audioCtx = null;
			}
			this._scriptNode = null;
		}
		
		public snapToStart(): void {
			this._bar = 0;
			this.enableIntro = true;
			this.snapToBar();
		}
		
		public snapToBar(): void {
			this._playhead = this._bar;
			this._beat = 0;
			this._part = 0;
			this._arpeggio = 0;
			this._arpeggioSamples = 0;
			this._effectPeriod = 0.0;
		}
		
		public nextBar(): void {
			var oldBar: number = this._bar;
			this._bar++;
			if (this._bar >= this.song.bars) {
				this._bar = this.song.loopStart;
			}
			if (this._bar >= this.song.loopStart + this.song.loopLength || this._bar >= this.song.bars) {
				this._bar = this.song.loopStart;
			}
			this._playhead += this._bar - oldBar;
		}
		
		public prevBar(): void {
			var oldBar: number = this._bar;
			this._bar--;
			if (this._bar < 0) {
				this._bar = this.song.bars - 1;
			}
			if (this._bar < this.song.loopStart) {
				this.enableIntro = true;
			}
			if (this._bar >= this.song.loopStart + this.song.loopLength || this._bar >= this.song.bars) {
				this._bar = this.song.loopStart + this.song.loopLength - 1;
			}
			this._playhead += this._bar - oldBar;
		}
		
		private _onSampleData(audioProcessingEvent: any): void {
			var outputBuffer = audioProcessingEvent.outputBuffer;
			var outputData: Float32Array = outputBuffer.getChannelData(0);
			this.synthesize(outputData, outputBuffer.length);
			/*
			if (this.paused) {
				return;
			} else {
				this.synthesize(event.data, 4096);
			}
			this.stillGoing = true;
			*/
		}
		/*
		private _checkSound(event: TimerEvent): void {
			if (!this.stillGoing) {
				if (soundChannel != null) {
					soundChannel.stop();
				}
				soundChannel = sound.play();
			} else {
				this.stillGoing = false;
			}
		}
		*/
		public synthesize(data: Float32Array, totalSamples: number): void {
			var bufferIndex: number = 0;
			
			var stutterFunction: ()=>void;
			if (this.stutterPressed) {
				var barOld: number = this._bar;
				var beatOld: number = this._beat;
				var partOld: number = this._part;
				var arpeggioOld: number = this._arpeggio;
				var arpeggioSamplesOld: number = this._arpeggioSamples;
				var leadPeriodAOld: number = this._leadPeriodA;
				var leadPeriodBOld: number = this._leadPeriodB;
				var leadSampleOld: number = this._leadSample;
				var harmonyPeriodAOld: number = this._harmonyPeriodA;
				var harmonyPeriodBOld: number = this._harmonyPeriodB;
				var harmonySampleOld: number = this._harmonySample;
				var bassPeriodAOld: number = this._bassPeriodA;
				var bassPeriodBOld: number = this._bassPeriodB;
				var bassSampleOld: number = this._bassSample;
				var drumPeriodOld: number = this._drumPeriod;
				var drumSampleOld: number = this._drumSample;
				var drumSignalOld: number = this._drumSignal;
				var effectPeriodOld: number = this._effectPeriod;
				var limitOld: number = this._limit;
				stutterFunction = ()=>{
					this._bar = barOld;
					this._beat = beatOld;
					this._part = partOld;
					this._arpeggio = arpeggioOld;
					this._arpeggioSamples = arpeggioSamplesOld;
					this._leadPeriodA = leadPeriodAOld;
					this._leadPeriodB = leadPeriodBOld;
					this._leadSample = leadSampleOld;
					this._harmonyPeriodA = harmonyPeriodAOld;
					this._harmonyPeriodB = harmonyPeriodBOld;
					this._harmonySample = harmonySampleOld;
					this._bassPeriodA = bassPeriodAOld;
					this._bassPeriodB = bassPeriodBOld;
					this._bassSample = bassSampleOld;
					this._drumPeriod = drumPeriodOld;
					this._drumSample = drumSampleOld;
					this._drumSignal = drumSignalOld;
					this._effectPeriod = effectPeriodOld;
					this._limit = limitOld;
				}
			}
			
			
			var i: number;
			
			var sampleTime: number = 1.0 / this.samplesPerSecond;
			var samplesPerArpeggio: number = this._getSamplesPerArpeggio();
			
			if (this.song == null) {
				for (i = 0; i < totalSamples; i++) {
					data[i] = 0.0;
				}
				return;
			}
			
			// Check the bounds of the playhead:
			if (this._arpeggioSamples == 0 || this._arpeggioSamples > samplesPerArpeggio) {
				this._arpeggioSamples = samplesPerArpeggio;
			}
			if (this._part >= this.song.parts) {
				this._beat++;
				this._part = 0;
				this._arpeggio = 0;
				this._arpeggioSamples = samplesPerArpeggio;
			}
			if (this._beat >= this.song.beats) {
				this._bar++;
				this._beat = 0;
				this._part = 0;
				this._arpeggio = 0;
				this._arpeggioSamples = samplesPerArpeggio;
				
				if (this.loopCount == -1) {
					if (this._bar < this.song.loopStart && !this.enableIntro) this._bar = this.song.loopStart;
					if (this._bar >= this.song.loopStart + this.song.loopLength && !this.enableOutro) this._bar = this.song.loopStart;
				}
			}
			if (this._bar >= this.song.bars) {
				this._bar = this.song.loopStart;
				this.enableOutro = false;
			}
			if (this._bar >= this.song.loopStart) {
				this.enableIntro = false;
			}
			
			var maxLeadVolume:    number;
			var maxHarmonyVolume: number;
			var maxBassVolume:    number;
			var maxDrumVolume:    number;
			
			var leadWave:    Float64Array;
			var harmonyWave: Float64Array;
			var bassWave:    Float64Array;
			var drumWave:    Float64Array;
			
			var leadWaveLength:    number;
			var harmonyWaveLength: number;
			var bassWaveLength:    number;
			
			var leadFilterBase:    number;
			var harmonyFilterBase: number;
			var bassFilterBase:    number;
			var drumFilter: number;
			
			var leadTremeloScale:    number;
			var harmonyTremeloScale: number;
			var bassTremeloScale:    number;
			
			var leadChorusA:    number;
			var harmonyChorusA: number;
			var bassChorusA:    number;
			var leadChorusB:    number;
			var harmonyChorusB: number;
			var bassChorusB:    number;
			
			var updateInstruments: ()=>void = ()=>{
				var instrumentLead: number    = this.song.getPatternInstrument(0, this._bar);
				var instrumentHarmony: number = this.song.getPatternInstrument(1, this._bar);
				var instrumentBass: number    = this.song.getPatternInstrument(2, this._bar);
				var instrumentDrum: number    = this.song.getPatternInstrument(3, this._bar);
				
				maxLeadVolume    = Music.channelVolumes[0] * (this.song.instrumentVolumes[0][instrumentLead] == 5 ? 0.0 :    Math.pow(2, -Music.volumeValues[this.song.instrumentVolumes[0][instrumentLead]]))    * Music.waveVolumes[this.song.instrumentWaves[0][instrumentLead]]    * Music.filterVolumes[this.song.instrumentFilters[0][instrumentLead]]    * Music.chorusVolumes[this.song.instrumentChorus[0][instrumentLead]]    * 0.5;
				maxHarmonyVolume = Music.channelVolumes[1] * (this.song.instrumentVolumes[1][instrumentHarmony] == 5 ? 0.0 : Math.pow(2, -Music.volumeValues[this.song.instrumentVolumes[1][instrumentHarmony]])) * Music.waveVolumes[this.song.instrumentWaves[1][instrumentHarmony]] * Music.filterVolumes[this.song.instrumentFilters[1][instrumentHarmony]] * Music.chorusVolumes[this.song.instrumentChorus[0][instrumentHarmony]] * 0.5;
				maxBassVolume    = Music.channelVolumes[2] * (this.song.instrumentVolumes[2][instrumentBass] == 5 ? 0.0 :    Math.pow(2, -Music.volumeValues[this.song.instrumentVolumes[2][instrumentBass]]))    * Music.waveVolumes[this.song.instrumentWaves[2][instrumentBass]]    * Music.filterVolumes[this.song.instrumentFilters[2][instrumentBass]]    * Music.chorusVolumes[this.song.instrumentChorus[0][instrumentBass]]    * 0.5;
				maxDrumVolume    = Music.channelVolumes[3] * (this.song.instrumentVolumes[3][instrumentDrum] == 5 ? 0.0 :    Math.pow(2, -Music.volumeValues[this.song.instrumentVolumes[3][instrumentDrum]]))    * Music.drumVolumes[this.song.instrumentWaves[3][instrumentDrum]];
				
				leadWave    = this._waves[this.song.instrumentWaves[0][instrumentLead]];
				harmonyWave = this._waves[this.song.instrumentWaves[1][instrumentHarmony]];
				bassWave    = this._waves[this.song.instrumentWaves[2][instrumentBass]];
				drumWave    = this._drumWaves[this.song.instrumentWaves[3][instrumentDrum]];
				
				leadWaveLength    = leadWave.length;
				harmonyWaveLength = harmonyWave.length;
				bassWaveLength    = bassWave.length;
				
				leadFilterBase    = Math.pow(2, -Music.filterBases[this.song.instrumentFilters[0][instrumentLead]]);
				harmonyFilterBase = Math.pow(2, -Music.filterBases[this.song.instrumentFilters[1][instrumentHarmony]]);
				bassFilterBase    = Math.pow(2, -Music.filterBases[this.song.instrumentFilters[2][instrumentBass]]);
				drumFilter = 1.0;
				
				leadTremeloScale    = Music.effectTremelos[this.song.instrumentEffects[0][instrumentLead]];
				harmonyTremeloScale = Music.effectTremelos[this.song.instrumentEffects[1][instrumentHarmony]];
				bassTremeloScale    = Music.effectTremelos[this.song.instrumentEffects[2][instrumentBass]];
				
				leadChorusA    = Math.pow( 2.0, (Music.chorusOffsets[this.song.instrumentChorus[0][instrumentLead]] + Music.chorusValues[this.song.instrumentChorus[0][instrumentLead]]) / 12.0 );
				harmonyChorusA = Math.pow( 2.0, (Music.chorusOffsets[this.song.instrumentChorus[1][instrumentHarmony]] + Music.chorusValues[this.song.instrumentChorus[1][instrumentHarmony]]) / 12.0 );
				bassChorusA    = Math.pow( 2.0, (Music.chorusOffsets[this.song.instrumentChorus[2][instrumentBass]] + Music.chorusValues[this.song.instrumentChorus[2][instrumentBass]]) / 12.0 );
				leadChorusB    = Math.pow( 2.0, (Music.chorusOffsets[this.song.instrumentChorus[0][instrumentLead]] - Music.chorusValues[this.song.instrumentChorus[0][instrumentLead]]) / 12.0 );
				harmonyChorusB = Math.pow( 2.0, (Music.chorusOffsets[this.song.instrumentChorus[1][instrumentHarmony]] - Music.chorusValues[this.song.instrumentChorus[1][instrumentHarmony]]) / 12.0 );
				bassChorusB    = Math.pow( 2.0, (Music.chorusOffsets[this.song.instrumentChorus[2][instrumentBass]] - Music.chorusValues[this.song.instrumentChorus[2][instrumentBass]]) / 12.0 );
				if (this.song.instrumentChorus[0][instrumentLead] == 0) this._leadPeriodB = this._leadPeriodA;
				if (this.song.instrumentChorus[1][instrumentHarmony] == 0) this._harmonyPeriodB = this._harmonyPeriodA;
				if (this.song.instrumentChorus[2][instrumentBass] == 0) this._bassPeriodB = this._bassPeriodA;
			}
			
			updateInstruments();
			
			while (totalSamples > 0) {
				var samples: number;
				if (this._arpeggioSamples <= totalSamples) {
					samples = this._arpeggioSamples;
				} else {
					samples = totalSamples;
				}
				totalSamples -= samples;
				this._arpeggioSamples -= samples;
				
				var leadPeriodDelta: number;
				var leadPeriodDeltaScale: number;
				var leadVolume: number;
				var leadVolumeDelta: number;
				var leadFilter: number;
				var leadFilterScale: number;
				var leadVibratoScale: number;
				var harmonyPeriodDelta: number;
				var harmonyPeriodDeltaScale: number;
				var harmonyVolume: number;
				var harmonyVolumeDelta: number;
				var harmonyFilter: number;
				var harmonyFilterScale: number;
				var harmonyVibratoScale: number;
				var bassPeriodDelta: number;
				var bassPeriodDeltaScale: number;
				var bassVolume: number;
				var bassVolumeDelta: number;
				var bassFilter: number;
				var bassFilterScale: number;
				var bassVibratoScale: number;
				var drumPeriodDelta: number;
				var drumPeriodDeltaScale: number;
				var drumVolume: number;
				var drumVolumeDelta: number;
				var time: number = this._part + this._beat * this.song.parts;
				
				for (var channel: number = 0; channel < 4; channel++) {
					var pattern: BarPattern = this.song.getPattern(channel, this._bar);
					
					var attack: number = pattern == null ? 0 : this.song.instrumentAttacks[channel][pattern.instrument];
					
					var tone: Tone = null;
					var prevTone: Tone = null;
					var nextTone: Tone = null;
					if (pattern != null) {
						for (i = 0; i < pattern.tones.length; i++) {
							if (pattern.tones[i].end <= time) {
								prevTone = pattern.tones[i];
							} else if (pattern.tones[i].start <= time && pattern.tones[i].end > time) {
								tone = pattern.tones[i];
							} else if (pattern.tones[i].start > time) {
								nextTone = pattern.tones[i];
								break;
							}
						}
					}
					if (tone != null && prevTone != null && prevTone.end != tone.start) prevTone = null;
					if (tone != null && nextTone != null && nextTone.start != tone.end) nextTone = null;
					
					var channelRoot: number = channel == 3 ? 69 : Music.keyTransposes[this.song.key];
					var intervalScale: number = channel == 3 ? Music.drumInterval : 1;
					var periodDelta: number;
					var periodDeltaScale: number;
					var toneVolume: number;
					var volumeDelta: number;
					var filter: number;
					var filterScale: number;
					var vibratoScale: number;
					var resetPeriod: boolean = false;
					if (this.pianoPressed && channel == this.pianoChannel) {
						var pianoFreq: number = this._frequencyFromPitch(channelRoot + this.pianoNote * intervalScale);
						var pianoPitchDamping: number;
						if (channel == 3) {
							if (this.song.instrumentWaves[3][pattern.instrument] > 0) {
								drumFilter = Math.min(1.0, pianoFreq * sampleTime * 8.0);
								pianoPitchDamping = 24.0;
							} else {
								pianoPitchDamping = 60.0;
							}
						} else {
							pianoPitchDamping = 48.0;
						}
						periodDelta = pianoFreq * sampleTime;
						periodDeltaScale = 1.0;
						toneVolume = Math.pow(2.0, -this.pianoNote * intervalScale / pianoPitchDamping);
						volumeDelta = 0.0;
						filter = 1.0;
						filterScale = 1.0;
						vibratoScale = Math.pow(2.0, Music.effectVibratos[this.song.instrumentEffects[channel][pattern.instrument]] / 12.0 ) - 1.0;
					} else if (tone == null) {
						periodDelta = 0.0;
						periodDeltaScale = 0.0;
						toneVolume = 0.0;
						volumeDelta = 0.0;
						filter = 1.0;
						filterScale = 1.0;
						vibratoScale = 0.0;
						resetPeriod = true;
					} else {
						var pitch: number;
						if (tone.notes.length == 2) {
							pitch = tone.notes[this._arpeggio >> 1];
						} else if (tone.notes.length == 3) {
							pitch = tone.notes[this._arpeggio == 3 ? 1 : this._arpeggio];
						} else if (tone.notes.length == 4) {
							pitch = tone.notes[this._arpeggio];
						} else {
							pitch = tone.notes[0];
						}
						
						var startPin: TonePin = null;
						var endPin: TonePin = null;
						tone.pins.every(function(pin: TonePin): boolean {
							if (pin.time + tone.start <= time) {
								startPin = pin;
							} else {
								endPin = pin;
								return false;
							}
							return true;
						}, this);
						
						var toneStart: number = tone.start * 4;
						var toneEnd:   number = tone.end   * 4;
						var pinStart: number  = (tone.start + startPin.time) * 4;
						var pinEnd:   number  = (tone.start + endPin.time  ) * 4;
						var arpeggioStart: number = time * 4 + this._arpeggio;
						var arpeggioEnd:   number = time * 4 + this._arpeggio + 1;
						var arpeggioRatioStart: number = (arpeggioStart - pinStart) / (pinEnd - pinStart);
						var arpeggioRatioEnd:   number = (arpeggioEnd   - pinStart) / (pinEnd - pinStart);
						var arpeggioVolumeStart: number = startPin.volume * (1.0 - arpeggioRatioStart) + endPin.volume * arpeggioRatioStart;
						var arpeggioVolumeEnd:   number = startPin.volume * (1.0 - arpeggioRatioEnd)   + endPin.volume * arpeggioRatioEnd;
						var arpeggioIntervalStart: number = startPin.interval * (1.0 - arpeggioRatioStart) + endPin.interval * arpeggioRatioStart;
						var arpeggioIntervalEnd:   number = startPin.interval * (1.0 - arpeggioRatioEnd)   + endPin.interval * arpeggioRatioEnd;
						var arpeggioFilterTimeStart: number = startPin.time * (1.0 - arpeggioRatioStart) + endPin.time * arpeggioRatioStart;
						var arpeggioFilterTimeEnd:   number = startPin.time * (1.0 - arpeggioRatioEnd)   + endPin.time * arpeggioRatioEnd;
						
						var inhibitRestart: boolean = false;
						if (arpeggioStart == toneStart) {
							if (attack == 0) {
								inhibitRestart = true;
							} else if (attack == 2) {
								arpeggioVolumeStart = 0.0;
							} else if (attack == 3) {
								if (prevTone == null || prevTone.notes.length > 1 || tone.notes.length > 1) {
									arpeggioVolumeStart = 0.0;
								} else if (prevTone.pins[prevTone.pins.length-1].volume == 0 || tone.pins[0].volume == 0) {
									arpeggioVolumeStart = 0.0;
								//} else if (prevTone.notes[0] + prevTone.pins[prevTone.pins.length-1].interval == pitch) {
								//	arpeggioVolumeStart = 0.0;
								} else {
									arpeggioIntervalStart = (prevTone.notes[0] + prevTone.pins[prevTone.pins.length-1].interval - pitch) * 0.5;
									arpeggioFilterTimeStart = prevTone.pins[prevTone.pins.length-1].time * 0.5;
									inhibitRestart = true;
								}
							}
						}
						if (arpeggioEnd == toneEnd) {
							if (attack == 1 || attack == 2) {
								arpeggioVolumeEnd = 0.0;
							} else if (attack == 3) {
								if (nextTone == null || nextTone.notes.length > 1 || tone.notes.length > 1) {
									arpeggioVolumeEnd = 0.0;
								} else if (tone.pins[tone.pins.length-1].volume == 0 || nextTone.pins[0].volume == 0) {
									arpeggioVolumeStart = 0.0;
								//} else if (nextTone.notes[0] == pitch + tone.pins[tone.pins.length-1].interval) {
									//arpeggioVolumeEnd = 0.0;
								} else {
									arpeggioIntervalEnd = (nextTone.notes[0] + tone.pins[tone.pins.length-1].interval - pitch) * 0.5;
									arpeggioFilterTimeEnd *= 0.5;
								}
							}
						}
						
						var startRatio: number = 1.0 - (this._arpeggioSamples + samples) / samplesPerArpeggio;
						var endRatio:   number = 1.0 - (this._arpeggioSamples)           / samplesPerArpeggio;
						var startInterval: number = arpeggioIntervalStart * (1.0 - startRatio) + arpeggioIntervalEnd * startRatio;
						var endInterval:   number = arpeggioIntervalStart * (1.0 - endRatio)   + arpeggioIntervalEnd * endRatio;
						var startFilterTime: number = arpeggioFilterTimeStart * (1.0 - startRatio) + arpeggioFilterTimeEnd * startRatio;
						var endFilterTime:   number = arpeggioFilterTimeStart * (1.0 - endRatio)   + arpeggioFilterTimeEnd * endRatio;
						var startFreq: number = this._frequencyFromPitch(channelRoot + (pitch + startInterval) * intervalScale);
						var endFreq:   number = this._frequencyFromPitch(channelRoot + (pitch + endInterval) * intervalScale);
						var pitchDamping: number;
						if (channel == 3) {
							if (this.song.instrumentWaves[3][pattern.instrument] > 0) {
								drumFilter = Math.min(1.0, startFreq * sampleTime * 8.0);
								//console.log(drumFilter);
								pitchDamping = 24.0;
							} else {
								pitchDamping = 60.0;
							}
						} else {
							pitchDamping = 48.0;
						}
						var startVol: number = Math.pow(2.0, -(pitch + startInterval) * intervalScale / pitchDamping);
						var endVol:   number = Math.pow(2.0, -(pitch + endInterval) * intervalScale / pitchDamping);
						startVol *= this._volumeConversion(arpeggioVolumeStart * (1.0 - startRatio) + arpeggioVolumeEnd * startRatio);
						endVol   *= this._volumeConversion(arpeggioVolumeStart * (1.0 - endRatio)   + arpeggioVolumeEnd * endRatio);
						var freqScale: number = endFreq / startFreq;
						periodDelta = startFreq * sampleTime;
						periodDeltaScale = Math.pow(freqScale, 1.0 / samples);
						toneVolume = startVol;
						volumeDelta = (endVol - startVol) / samples;
						var timeSinceStart: number = (arpeggioStart + startRatio - toneStart) * samplesPerArpeggio / this.samplesPerSecond;
						if (timeSinceStart == 0.0 && !inhibitRestart) resetPeriod = true;
						
						var filterScaleRate: number = Music.filterDecays[this.song.instrumentFilters[channel][pattern.instrument]];
						filter = Math.pow(2, -filterScaleRate * startFilterTime * 4.0 * samplesPerArpeggio / this.samplesPerSecond);
						var endFilter: number = Math.pow(2, -filterScaleRate * endFilterTime * 4.0 * samplesPerArpeggio / this.samplesPerSecond);
						filterScale = Math.pow(endFilter / filter, 1.0 / samples);
						vibratoScale = (this.song.instrumentEffects[channel][pattern.instrument] == 2 && time - tone.start < 3) ? 0.0 : Math.pow( 2.0, Music.effectVibratos[this.song.instrumentEffects[channel][pattern.instrument]] / 12.0 ) - 1.0;
					}
					
					if (channel == 0) {
						leadPeriodDelta = periodDelta;
						leadPeriodDeltaScale = periodDeltaScale;
						leadVolume = toneVolume * maxLeadVolume;
						leadVolumeDelta = volumeDelta * maxLeadVolume;
						leadFilter = filter * leadFilterBase;
						leadFilterScale = filterScale;
						leadVibratoScale = vibratoScale;
						if (resetPeriod) {
							this._leadSample = 0.0;
							this._leadPeriodA = 0.0;
							this._leadPeriodB = 0.0;
						}
					} else if (channel == 1) {
						harmonyPeriodDelta = periodDelta;
						harmonyPeriodDeltaScale = periodDeltaScale;
						harmonyVolume = toneVolume * maxHarmonyVolume;
						harmonyVolumeDelta = volumeDelta * maxHarmonyVolume;
						harmonyFilter = filter * harmonyFilterBase;
						harmonyFilterScale = filterScale;
						harmonyVibratoScale = vibratoScale;
						if (resetPeriod) {
							this._harmonySample = 0.0;
							this._harmonyPeriodA = 0.0;
							this._harmonyPeriodB = 0.0;
						}
					} else if (channel == 2) {
						bassPeriodDelta = periodDelta;
						bassPeriodDeltaScale = periodDeltaScale;
						bassVolume = toneVolume * maxBassVolume;
						bassVolumeDelta = volumeDelta * maxBassVolume;
						bassFilter = filter * bassFilterBase;
						bassFilterScale = filterScale;
						bassVibratoScale = vibratoScale;
						if (resetPeriod) {
							this._bassSample = 0.0;
							this._bassPeriodA = 0.0;
							this._bassPeriodB = 0.0;
						}
					} else if (channel == 3) {
						drumPeriodDelta = periodDelta / 32767.0;
						drumPeriodDeltaScale = periodDeltaScale;
						drumVolume = toneVolume * maxDrumVolume;
						drumVolumeDelta = volumeDelta * maxDrumVolume;
					}
				}
				
				var effectY:     number = Math.sin(this._effectPeriod);
				var prevEffectY: number = Math.sin(this._effectPeriod - this._effectAngle);
				
				while (samples > 0) {
					var sample: number = 0.0;
					var leadVibrato:    number = 1.0 + leadVibratoScale    * effectY;
					var harmonyVibrato: number = 1.0 + harmonyVibratoScale * effectY;
					var bassVibrato:    number = 1.0 + bassVibratoScale    * effectY;
					var leadTremelo:    number = 1.0 + leadTremeloScale    * (effectY - 1.0);
					var harmonyTremelo: number = 1.0 + harmonyTremeloScale * (effectY - 1.0);
					var bassTremelo:    number = 1.0 + bassTremeloScale    * (effectY - 1.0);
					var temp: number = effectY;
					effectY = this._effectYMult * effectY - prevEffectY;
					prevEffectY = temp;
					
					this._leadSample += ((leadWave[Math.floor(this._leadPeriodA * leadWaveLength)] + leadWave[Math.floor(this._leadPeriodB * leadWaveLength)]) * leadVolume * leadTremelo - this._leadSample) * leadFilter;
					leadVolume += leadVolumeDelta;
					this._leadPeriodA += leadPeriodDelta * leadVibrato * leadChorusA;
					this._leadPeriodB += leadPeriodDelta * leadVibrato * leadChorusB;
					leadPeriodDelta *= leadPeriodDeltaScale;
					this._leadPeriodA -= Math.floor(this._leadPeriodA);
					this._leadPeriodB -= Math.floor(this._leadPeriodB);
					leadFilter *= leadFilterScale;
					sample += this._leadSample;
					
					this._harmonySample += ((harmonyWave[Math.floor(this._harmonyPeriodA * harmonyWaveLength)] + harmonyWave[Math.floor(this._harmonyPeriodB * harmonyWaveLength)]) * harmonyVolume * harmonyTremelo - this._harmonySample) * harmonyFilter;
					harmonyVolume += harmonyVolumeDelta;
					this._harmonyPeriodA += harmonyPeriodDelta * harmonyVibrato * harmonyChorusA;
					this._harmonyPeriodB += harmonyPeriodDelta * harmonyVibrato * harmonyChorusB;
					harmonyPeriodDelta *= harmonyPeriodDeltaScale;
					this._harmonyPeriodA -= Math.floor(this._harmonyPeriodA);
					this._harmonyPeriodB -= Math.floor(this._harmonyPeriodB);
					harmonyFilter *= harmonyFilterScale;
					sample += this._harmonySample;
					
					this._bassSample += ((bassWave[Math.floor(this._bassPeriodA * bassWaveLength)] + bassWave[Math.floor(this._bassPeriodB * bassWaveLength)]) * bassVolume * bassTremelo - this._bassSample) * bassFilter;
					bassVolume += bassVolumeDelta;
					this._bassPeriodA += bassPeriodDelta * bassVibrato * bassChorusA;
					this._bassPeriodB += bassPeriodDelta * bassVibrato * bassChorusB;
					bassPeriodDelta *= bassPeriodDeltaScale;
					this._bassPeriodA -= Math.floor(this._bassPeriodA);
					this._bassPeriodB -= Math.floor(this._bassPeriodB);
					bassFilter *= bassFilterScale;
					sample += this._bassSample;
					
					this._drumSample += (drumWave[Math.floor(this._drumPeriod * 32767.0)] * drumVolume - this._drumSample) * drumFilter;
					drumVolume += drumVolumeDelta;
					this._drumPeriod += drumPeriodDelta;
					drumPeriodDelta *= drumPeriodDeltaScale;
					this._drumPeriod -= Math.floor(this._drumPeriod);
					
					sample += this._drumSample;
					
					/*
					var g: number = 0.9;
					var reverbSample: number;
					
					reverbSample = reverbDelay1[reverbDelayIndex1];
					sample += reverbSample * g;
					reverbDelay1[reverbDelayIndex1] = sample;
					//reverbDelayIndex1 = (reverbDelayIndex1 + 1) & 0x3ff;
					reverbDelayIndex1 = (reverbDelayIndex1 + 1) % 1021;
					sample *= -g;
					sample += reverbSample;
					
					reverbSample = reverbDelay2[reverbDelayIndex2];
					sample += reverbSample * g;
					reverbDelay2[reverbDelayIndex2] = sample;
					//reverbDelayIndex2 = (reverbDelayIndex2 + 1) & 0x3ff;
					reverbDelayIndex2 = (reverbDelayIndex2 + 1) % 317;
					sample *= -g;
					sample += reverbSample;
					
					reverbSample = reverbDelay3[reverbDelayIndex3];
					sample += reverbSample * g;
					reverbDelay3[reverbDelayIndex3] = sample;
					//reverbDelayIndex3 = (reverbDelayIndex3 + 1) & 0x3ff;
					reverbDelayIndex3 = (reverbDelayIndex3 + 1) % 89;
					sample *= -g;
					sample += reverbSample;
					*/
					
					var abs: number = sample < 0.0 ? -sample : sample;
					this._limit -= this._limitDecay;
					if (this._limit < abs) this._limit = abs;
					sample /= this._limit * 0.75 + 0.25;
					sample *= this.volume;
					
					//data.writeFloat(sample);
					//data.writeFloat(sample);
					
					data[bufferIndex] = sample;
					bufferIndex = bufferIndex + 1;
					
					samples--;
				}
				
				if ( this._effectYMult * effectY - prevEffectY > prevEffectY ) {
					this._effectPeriod = Math.asin( effectY );
				} else {
					this._effectPeriod = Math.PI - Math.asin( effectY );
				}
				
				if (this._arpeggioSamples == 0) {
					this._arpeggio++;
					this._arpeggioSamples = samplesPerArpeggio;
					if (this._arpeggio == 4) {
						this._arpeggio = 0;
						this._part++;
						if (this._part == this.song.parts) {
							this._part = 0;
							this._beat++;
							if (this._beat == this.song.beats) {
								this._beat = 0;
								this._effectPeriod = 0.0;
								this._bar++;
								if (this._bar < this.song.loopStart) {
									if (!this.enableIntro) this._bar = this.song.loopStart;
								} else {
									this.enableIntro = false;
								}
								if (this._bar >= this.song.loopStart + this.song.loopLength) {
									if (this.loopCount > 0) this.loopCount--;
									if (this.loopCount != 0) {
										this._bar = this.song.loopStart;
									}
								}
								if (this._bar >= this.song.bars) {
									this._bar = this.song.loopStart;
									this.enableOutro = false;
								}
								updateInstruments();
							}
						}
					}
				}
			}
			
			if (this.stutterPressed) stutterFunction();
			this._playhead = (((this._arpeggio + 1.0 - this._arpeggioSamples / samplesPerArpeggio) / 4.0 + this._part) / this.song.parts + this._beat) / this.song.beats + this._bar;
		}
		
		private _frequencyFromPitch(pitch: number): number {
			return 440.0 * Math.pow(2.0, (pitch - 69.0) / 12.0);
		}
		
		private _volumeConversion(toneVolume: number): number {
			return Math.pow(toneVolume / 3.0, 1.5);
		}
		
		private _getSamplesPerArpeggio(): number {
			if (this.song == null) return 0;
			var beatsPerMinute: number = 120.0 * Math.pow(2.0, (-4.0 + this.song.tempo) / 9.0);
			var beatsPerSecond: number = beatsPerMinute / 60.0;
			var partsPerSecond: number = beatsPerSecond * this.song.parts;
			var arpeggioPerSecond: number = partsPerSecond * 4.0;
			return Math.floor(this.samplesPerSecond / arpeggioPerSecond);
		}
	}
}
