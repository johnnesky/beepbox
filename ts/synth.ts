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

interface Window {
	AudioContext: any;
	webkitAudioContext: any;
	mozAudioContext: any;
	oAudioContext: any;
	msAudioContext: any;
}

module beepbox {
	interface Dictionary<T> {
		[K: string]: T;
	}
	
	const enum CharCode {
		SPACE = 32,
		HASH = 35,
		PERCENT = 37,
		AMPERSAND = 38,
		PLUS = 43,
		DASH = 45,
		DOT = 46,
		NUM_0 = 48,
		NUM_1 = 49,
		NUM_2 = 50,
		NUM_3 = 51,
		NUM_4 = 52,
		NUM_5 = 53,
		NUM_6 = 54,
		NUM_7 = 55,
		NUM_8 = 56,
		NUM_9 = 57,
		EQUALS = 61,
		A =  65,
		B =  66,
		C =  67,
		D =  68,
		E =  69,
		F =  70,
		G =  71,
		H =  72,
		I =  73,
		J =  74,
		K =  75,
		L =  76,
		M =  77,
		N =  78,
		O =  79,
		P =  80,
		Q =  81,
		R =  82,
		S =  83,
		T =  84,
		U =  85,
		V =  86,
		W =  87,
		X =  88,
		Y =  89,
		Z =  90,
		UNDERSCORE = 95,
		a =  97,
		b =  98,
		c =  99,
		d = 100,
		e = 101,
		f = 102,
		g = 103,
		h = 104,
		i = 105,
		j = 106,
		k = 107,
		l = 108,
		m = 109,
		n = 110,
		o = 111,
		p = 112,
		q = 113,
		r = 114,
		s = 115,
		t = 116,
		u = 117,
		v = 118,
		w = 119,
		x = 120,
		y = 121,
		z = 122,
		LEFT_CURLY_BRACE = 123,
		RIGHT_CURLY_BRACE = 125,
	}
	
	class BitFieldReader {
		private _bits: number[] = [];
		private _readIndex: number = 0;
		
		constructor(base64CharCodeToInt: ReadonlyArray<number>, source: string, startIndex: number, stopIndex: number) {
			for (let i: number = startIndex; i < stopIndex; i++) {
				const value: number = base64CharCodeToInt[source.charCodeAt(i)];
				this._bits.push((value >> 5) & 0x1);
				this._bits.push((value >> 4) & 0x1);
				this._bits.push((value >> 3) & 0x1);
				this._bits.push((value >> 2) & 0x1);
				this._bits.push((value >> 1) & 0x1);
				this._bits.push( value       & 0x1);
			}
		}
		
		public read(bitCount: number): number {
			let result: number = 0;
			while (bitCount > 0) {
				result = result << 1;
				result += this._bits[this._readIndex++];
				bitCount--;
			}
			return result;
		}
		
		public readLongTail(minValue: number, minBits: number): number {
			let result: number = minValue;
			let numBits: number = minBits;
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
		
		public readPartDuration(): number {
			return this.readLongTail(1, 2);
		}
		
		public readPinCount(): number {
			return this.readLongTail(1, 0);
		}
		
		public readPitchInterval(): number {
			if (this.read(1)) {
				return -this.readLongTail(1, 3);
			} else {
				return this.readLongTail(1, 3);
			}
		}
	}
	
	class BitFieldWriter {
		private _bits: number[] = [];
		
		public write(bitCount: number, value: number): void {
			bitCount--;
			while (bitCount >= 0) {
				this._bits.push((value >>> bitCount) & 1);
				bitCount--;
			}
		}
		
		public writeLongTail(minValue: number, minBits: number, value: number): void {
			if (value < minValue) throw new Error("value out of bounds");
			value -= minValue;
			let numBits: number = minBits;
			while (value >= (1 << numBits)) {
				this._bits.push(1);
				value -= 1 << numBits;
				numBits++;
			}
			this._bits.push(0);
			while (numBits > 0) {
				numBits--;
				this._bits.push((value >>> numBits) & 1);
			}
		}
		
		public writePartDuration(value: number): void {
			this.writeLongTail(1, 2, value);
		}
		
		public writePinCount(value: number): void {
			this.writeLongTail(1, 0, value);
		}
		
		public writePitchInterval(value: number): void {
			if (value < 0) {
				this.write(1, 1); // sign
				this.writeLongTail(1, 3, -value);
			} else {
				this.write(1, 0); // sign
				this.writeLongTail(1, 3, value);
			}
		}
		
		public concat(other: BitFieldWriter): void {
			this._bits = this._bits.concat(other._bits);
		}
		
		public encodeBase64(base64IntToCharCode: ReadonlyArray<number>, buffer: number[]): number[] {
			for (let i: number = 0; i < this._bits.length; i += 6) {
				const value: number = (this._bits[i] << 5) | (this._bits[i+1] << 4) | (this._bits[i+2] << 3) | (this._bits[i+3] << 2) | (this._bits[i+4] << 1) | this._bits[i+5];
				buffer.push(base64IntToCharCode[value]);
			}
			return buffer;
		}
		
		public lengthBase64(): number {
			return Math.ceil(this._bits.length / 6);
		}
	}
	
	export class Music {
		public static readonly scaleNames: ReadonlyArray<string> = ["easy :)", "easy :(", "island :)", "island :(", "blues :)", "blues :(", "normal :)", "normal :(", "dbl harmonic :)", "dbl harmonic :(", "enigma", "expert"];
		public static readonly scaleFlags: ReadonlyArray<ReadonlyArray<boolean>> = [
			[ true, false,  true, false,  true, false, false,  true, false,  true, false, false],
			[ true, false, false,  true, false,  true, false,  true, false, false,  true, false],
			[ true, false, false, false,  true,  true, false,  true, false, false, false,  true],
			[ true,  true, false,  true, false, false, false,  true,  true, false, false, false],
			[ true, false,  true,  true,  true, false, false,  true, false,  true, false, false],
			[ true, false, false,  true, false,  true,  true,  true, false, false,  true, false],
			[ true, false,  true, false,  true,  true, false,  true, false,  true, false,  true],
			[ true, false,  true,  true, false,  true, false,  true,  true, false,  true, false],
			[ true,  true, false, false,  true,  true, false,  true,  true, false, false,  true],
			[ true, false,  true,  true, false, false,  true,  true,  true, false, false,  true],
			[ true, false,  true, false,  true, false,  true, false,  true, false,  true, false],
			[ true,  true,  true,  true,  true,  true,  true,  true,  true,  true,  true,  true],
		];
		public static readonly pianoScaleFlags: ReadonlyArray<boolean> = [ true, false,  true, false,  true,  true, false,  true, false,  true, false,  true];
		// C1 has index 24 on the MIDI scale. C8 is 108, and C9 is 120. C10 is barely in the audible range.
		public static readonly blackKeyNameParents: ReadonlyArray<number> = [-1, 1, -1, 1, -1, 1, -1, -1, 1, -1, 1, -1];
		public static readonly pitchNames: ReadonlyArray<string | null> = ["C", null, "D", null, "E", "F", null, "G", null, "A", null, "B"];
		public static readonly keyNames: ReadonlyArray<string> = ["B", "A♯", "A", "G♯", "G", "F♯", "F", "E", "D♯", "D", "C♯", "C"];
		public static readonly keyTransposes: ReadonlyArray<number> = [23, 22, 21, 20, 19, 18, 17, 16, 15, 14, 13, 12];
		public static readonly tempoNames: ReadonlyArray<string> = ["molasses", "slow", "leisurely", "moderate", "steady", "brisk", "hasty", "fast", "strenuous", "grueling", "hyper", "ludicrous"];
		public static readonly reverbRange: number = 4;
		public static readonly beatsMin: number = 3;
		public static readonly beatsMax: number = 15;
		public static readonly barsMin: number = 1;
		public static readonly barsMax: number = 128;
		public static readonly patternsMin: number = 1;
		public static readonly patternsMax: number = 64;
		public static readonly instrumentsMin: number = 1;
		public static readonly instrumentsMax: number = 10;
		public static readonly partNames: ReadonlyArray<string> = ["triples", "standard"];
		public static readonly partCounts: ReadonlyArray<number> = [3, 4];
		public static readonly waveNames: ReadonlyArray<string> = ["triangle", "square", "pulse wide", "pulse narrow", "sawtooth", "double saw", "double pulse", "spiky", "plateau"];
		public static readonly waveVolumes: ReadonlyArray<number> = [1.0, 0.5, 0.5, 0.5, 0.65, 0.5, 0.4, 0.4, 0.94];
		public static readonly drumNames: ReadonlyArray<string> = ["retro", "white"];
		public static readonly drumVolumes: ReadonlyArray<number> = [0.25, 1.0];
		public static readonly drumPitchRoots: ReadonlyArray<number> = [69, 69];
		public static readonly drumPitchFilterMult: ReadonlyArray<number> = [100.0, 8.0];
		public static readonly filterNames: ReadonlyArray<string> = ["sustain sharp", "sustain medium", "sustain soft", "decay sharp", "decay medium", "decay soft"];
		public static readonly filterBases: ReadonlyArray<number> = [2.0, 3.5, 5.0, 1.0, 2.5, 4.0];
		public static readonly filterDecays: ReadonlyArray<number> = [0.0, 0.0, 0.0, 10.0, 7.0, 4.0];
		public static readonly filterVolumes: ReadonlyArray<number> = [0.4, 0.7, 1.0, 0.5, 0.75, 1.0];
		public static readonly envelopeNames: ReadonlyArray<string> = ["seamless", "sudden", "smooth", "slide"];
		public static readonly effectNames: ReadonlyArray<string> = ["none", "vibrato light", "vibrato delayed", "vibrato heavy", "tremolo light", "tremolo heavy"];
		public static readonly effectVibratos: ReadonlyArray<number> = [0.0, 0.15, 0.3, 0.45, 0.0, 0.0];
		public static readonly effectTremolos: ReadonlyArray<number> = [0.0, 0.0, 0.0, 0.0, 0.25, 0.5];
		public static readonly chorusNames: ReadonlyArray<string> = ["unison", "shimmer", "hum", "honky tonk", "dissonant", "fifths", "octaves", "bowed", "harmonize"];
		public static readonly chorusIntervals: ReadonlyArray<number> = [0.0, 0.02, 0.05, 0.1, 0.25, 3.5, 6, 0.02, 0.05];
		public static readonly chorusOffsets: ReadonlyArray<number> = [0.0, 0.0, 0.0, 0.0, 0.0, 3.5, 6, 0.0, 0.0];
		public static readonly chorusVolumes: ReadonlyArray<number> = [0.7, 0.8, 1.0, 1.0, 0.9, 0.9, 0.8, 1.0, 1.0];
		public static readonly chorusHarmonizes: ReadonlyArray<boolean> = [false, false, false, false, false, false, false, false, true];
		public static readonly volumeNames: ReadonlyArray<string> = ["loudest", "loud", "medium", "quiet", "quietest", "mute"];
		public static readonly volumeValues: ReadonlyArray<number> = [0.0, 0.5, 1.0, 1.5, 2.0, -1.0];
		public static readonly channelVolumes: ReadonlyArray<number> = [0.27, 0.27, 0.27, 0.19];
		public static readonly drumInterval: number = 6;
		public static readonly numChannels: number = 4;
		public static readonly drumCount: number = 12;
		public static readonly pitchCount: number = 37;
		public static readonly maxPitch: number = 84;
		public static readonly waves: ReadonlyArray<Float64Array> = [
			Music._centerWave([1.0/15.0, 3.0/15.0, 5.0/15.0, 7.0/15.0, 9.0/15.0, 11.0/15.0, 13.0/15.0, 15.0/15.0, 15.0/15.0, 13.0/15.0, 11.0/15.0, 9.0/15.0, 7.0/15.0, 5.0/15.0, 3.0/15.0, 1.0/15.0, -1.0/15.0, -3.0/15.0, -5.0/15.0, -7.0/15.0, -9.0/15.0, -11.0/15.0, -13.0/15.0, -15.0/15.0, -15.0/15.0, -13.0/15.0, -11.0/15.0, -9.0/15.0, -7.0/15.0, -5.0/15.0, -3.0/15.0, -1.0/15.0]),
			Music._centerWave([1.0, -1.0]),
			Music._centerWave([1.0, -1.0, -1.0, -1.0]),
			Music._centerWave([1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0]),
			Music._centerWave([1.0/31.0, 3.0/31.0, 5.0/31.0, 7.0/31.0, 9.0/31.0, 11.0/31.0, 13.0/31.0, 15.0/31.0, 17.0/31.0, 19.0/31.0, 21.0/31.0, 23.0/31.0, 25.0/31.0, 27.0/31.0, 29.0/31.0, 31.0/31.0, -31.0/31.0, -29.0/31.0, -27.0/31.0, -25.0/31.0, -23.0/31.0, -21.0/31.0, -19.0/31.0, -17.0/31.0, -15.0/31.0, -13.0/31.0, -11.0/31.0, -9.0/31.0, -7.0/31.0, -5.0/31.0, -3.0/31.0, -1.0/31.0]),
			Music._centerWave([0.0, -0.2, -0.4, -0.6, -0.8, -1.0, 1.0, -0.8, -0.6, -0.4, -0.2, 1.0, 0.8, 0.6, 0.4, 0.2]),
			Music._centerWave([1.0, 1.0, 1.0, 1.0, 1.0, -1.0, -1.0, -1.0, 1.0, 1.0, 1.0, 1.0, -1.0, -1.0, -1.0, -1.0]),
			Music._centerWave([1.0, -1.0, 1.0, -1.0, 1.0, 0.0]),
			Music._centerWave([0.0, 0.2, 0.4, 0.5, 0.6, 0.7, 0.8, 0.85, 0.9, 0.95, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 0.95, 0.9, 0.85, 0.8, 0.7, 0.6, 0.5, 0.4, 0.2, 0.0, -0.2, -0.4, -0.5, -0.6, -0.7, -0.8, -0.85, -0.9, -0.95, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -0.95, -0.9, -0.85, -0.8, -0.7, -0.6, -0.5, -0.4, -0.2]),
		];
		
		private static _centerWave(wave: Array<number>): Float64Array {
			let sum: number = 0.0;
			for (let i: number = 0; i < wave.length; i++) sum += wave[i];
			const average: number = sum / wave.length;
			for (let i: number = 0; i < wave.length; i++) wave[i] -= average;
			return new Float64Array(wave);
		}
		
		// Drum waves have too many samples to write by hand, they're generated on-demand by getDrumWave instead.
		private static readonly _drumWaves: Array<Float32Array | null> = [null, null];
		
		public static getDrumWave(index: number): Float32Array {
			let wave: Float32Array | null = Music._drumWaves[index];
			if (wave == null) {
				wave = new Float32Array(32768);
				Music._drumWaves[index] = wave;
				
				if (index == 0) {
					// The "retro" drum uses a "Linear Feedback Shift Register" similar to the NES noise channel.
					let drumBuffer: number = 1;
					for (let i: number = 0; i < 32768; i++) {
						wave[i] = (drumBuffer & 1) * 2.0 - 1.0;
						let newBuffer: number = drumBuffer >> 1;
						if (((drumBuffer + newBuffer) & 1) == 1) {
							newBuffer += 1 << 14;
						}
						drumBuffer = newBuffer;
					}
				} else if (index == 1) {
					// White noise is just random values for each sample.
					for (let i: number = 0; i < 32768; i++) {
						wave[i] = Math.random() * 2.0 - 1.0;
					}
				/*
				} else if (index == 2) {
					// Experimental drum:
					for (let i: number = 1 << 10; i < (1 << 11); i++) {
						const amplitude: number = 2.0;
						const radians: number = Math.random() * Math.PI * 2.0;
						wave[i] = Math.cos(radians) * amplitude;
						wave[32768 - i] = Math.sin(radians) * amplitude;
					}
					for (let i: number = 1 << 11; i < (1 << 14); i++) {
						const amplitude: number = 0.25;
						const radians: number = Math.random() * Math.PI * 2.0;
						wave[i] = Math.cos(radians) * amplitude;
						wave[32768 - i] = Math.sin(radians) * amplitude;
					}
					FFT.inverseRealFourierTransform(wave);
					FFT.scaleElementsByFactor(wave, 1.0 / Math.sqrt(wave.length));
				*/
				} else {
					throw new Error("Unrecognized drum index: " + index);
				}
			}
			
			return wave;
		}
	}
	
	export interface NotePin {
		interval: number;
		time: number;
		volume: number;
	}
	
	export function makeNotePin(interval: number, time: number, volume: number): NotePin {
		return {interval: interval, time: time, volume: volume};
	}
	
	export interface Note {
		pitches: number[];
		pins: NotePin[];
		start: number;
		end: number;
	}
	
	export function makeNote(pitch: number, start: number, end: number, volume: number, fadeout: boolean = false) {
		return {
			pitches: [pitch],
			pins: [makeNotePin(0, 0, volume), makeNotePin(0, end - start, fadeout ? 0 : volume)],
			start: start,
			end: end,
		};
	}
	
	export class BarPattern {
		public notes: Note[];
		public instrument: number;
		constructor() {
			this.notes = [];
			this.instrument = 0;
		}
		
		public cloneNotes(): Note[] {
			const result: Note[] = [];
			for (const oldNote of this.notes) {
				const newNote: Note = makeNote(-1, oldNote.start, oldNote.end, 3);
				newNote.pitches = oldNote.pitches.concat();
				newNote.pins = [];
				for (const oldPin of oldNote.pins) {
					newNote.pins.push(makeNotePin(oldPin.interval, oldPin.time, oldPin.volume));
				}
				result.push(newNote);
			}
			return result;
		}
	}
	
	export class Song {
		private static readonly _oldestVersion: number = 2;
		private static readonly _latestVersion: number = 5;
		private static readonly _base64CharCodeToInt: ReadonlyArray<number> = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,62,62,0,0,1,2,3,4,5,6,7,8,9,0,0,0,0,0,0,0,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,0,0,0,0,63,0,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,0,0,0,0,0]; // 62 could be represented by either "-" or "." for historical reasons. New songs should use "-".
		private static readonly _base64IntToCharCode: ReadonlyArray<number> = [48,49,50,51,52,53,54,55,56,57,97,98,99,100,101,102,103,104,105,106,107,108,109,110,111,112,113,114,115,116,117,118,119,120,121,122,65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80,81,82,83,84,85,86,87,88,89,90,45,95];
		
		public scale: number;
		public key: number;
		public tempo: number;
		public reverb: number;
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
		public instrumentEnvelopes: number[][];
		public instrumentEffects: number[][];
		public instrumentChorus: number[][];
		public instrumentVolumes: number[][];
		
		constructor(string?: string) {
			if (string != undefined) {
				this.fromBase64String(string);
			} else {
				this.initToDefault();
			}
		}
		
		public initToDefault(): void {
			this.channelPatterns = [
				[new BarPattern(), new BarPattern(), new BarPattern(), new BarPattern(), new BarPattern(), new BarPattern(), new BarPattern(), new BarPattern()], 
				[new BarPattern(), new BarPattern(), new BarPattern(), new BarPattern(), new BarPattern(), new BarPattern(), new BarPattern(), new BarPattern()], 
				[new BarPattern(), new BarPattern(), new BarPattern(), new BarPattern(), new BarPattern(), new BarPattern(), new BarPattern(), new BarPattern()], 
				[new BarPattern(), new BarPattern(), new BarPattern(), new BarPattern(), new BarPattern(), new BarPattern(), new BarPattern(), new BarPattern()], 
			];
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
			this.instrumentEnvelopes = [[1],[1],[1],[1]];
			this.instrumentEffects = [[0],[0],[0],[0]];
			this.instrumentChorus  = [[0],[0],[0],[0]];
			this.scale = 0;
			this.key = Music.keyNames.length - 1;
			this.loopStart = 0;
			this.loopLength = 4;
			this.tempo = 7;
			this.reverb = 0;
			this.beats = 8;
			this.bars = 16;
			this.patterns = 8;
			this.parts = 4;
			this.instruments = 1;
		}
		
		public toBase64String(): string {
			let bits: BitFieldWriter;
			let buffer: number[] = [];
			
			const base64IntToCharCode: ReadonlyArray<number> = Song._base64IntToCharCode;
			
			buffer.push(base64IntToCharCode[Song._latestVersion]);
			buffer.push(CharCode.s, base64IntToCharCode[this.scale]);
			buffer.push(CharCode.k, base64IntToCharCode[this.key]);
			buffer.push(CharCode.l, base64IntToCharCode[this.loopStart >> 6], base64IntToCharCode[this.loopStart & 0x3f]);
			buffer.push(CharCode.e, base64IntToCharCode[(this.loopLength - 1) >> 6], base64IntToCharCode[(this.loopLength - 1) & 0x3f]);
			buffer.push(CharCode.t, base64IntToCharCode[this.tempo]);
			buffer.push(CharCode.m, base64IntToCharCode[this.reverb]);
			buffer.push(CharCode.a, base64IntToCharCode[this.beats - 1]);
			buffer.push(CharCode.g, base64IntToCharCode[(this.bars - 1) >> 6], base64IntToCharCode[(this.bars - 1) & 0x3f]);
			buffer.push(CharCode.j, base64IntToCharCode[this.patterns - 1]);
			buffer.push(CharCode.i, base64IntToCharCode[this.instruments - 1]);
			buffer.push(CharCode.r, base64IntToCharCode[Music.partCounts.indexOf(this.parts)]);
			
			buffer.push(CharCode.w);
			for (let channel: number = 0; channel < Music.numChannels; channel++) for (let i: number = 0; i < this.instruments; i++) {
				buffer.push(base64IntToCharCode[this.instrumentWaves[channel][i]]);
			}
			
			buffer.push(CharCode.f);
			for (let channel: number = 0; channel < Music.numChannels; channel++) for (let i: number = 0; i < this.instruments; i++) {
				buffer.push(base64IntToCharCode[this.instrumentFilters[channel][i]]);
			}
			
			buffer.push(CharCode.d);
			for (let channel: number = 0; channel < Music.numChannels; channel++) for (let i: number = 0; i < this.instruments; i++) {
				buffer.push(base64IntToCharCode[this.instrumentEnvelopes[channel][i]]);
			}
			
			buffer.push(CharCode.c);
			for (let channel: number = 0; channel < Music.numChannels; channel++) for (let i: number = 0; i < this.instruments; i++) {
				buffer.push(base64IntToCharCode[this.instrumentEffects[channel][i]]);
			}
			
			buffer.push(CharCode.h);
			for (let channel: number = 0; channel < Music.numChannels; channel++) for (let i: number = 0; i < this.instruments; i++) {
				buffer.push(base64IntToCharCode[this.instrumentChorus[channel][i]]);
			}
			
			buffer.push(CharCode.v);
			for (let channel: number = 0; channel < Music.numChannels; channel++) for (let i: number = 0; i < this.instruments; i++) {
				buffer.push(base64IntToCharCode[this.instrumentVolumes[channel][i]]);
			}
			
			buffer.push(CharCode.o);
			for (let channel: number = 0; channel < Music.numChannels; channel++) {
				buffer.push(base64IntToCharCode[this.channelOctaves[channel]]);
			}
			
			buffer.push(CharCode.b);
			bits = new BitFieldWriter();
			let neededBits: number = 0;
			while ((1 << neededBits) < this.patterns + 1) neededBits++;
			for (let channel: number = 0; channel < Music.numChannels; channel++) for (let i: number = 0; i < this.bars; i++) {
				bits.write(neededBits, this.channelBars[channel][i]);
			}
			bits.encodeBase64(base64IntToCharCode, buffer);
			
			buffer.push(CharCode.p);
			bits = new BitFieldWriter();
			let neededInstrumentBits: number = 0;
			while ((1 << neededInstrumentBits) < this.instruments) neededInstrumentBits++;
			for (let channel: number = 0; channel < Music.numChannels; channel++) {
				const octaveOffset: number = channel == 3 ? 0 : this.channelOctaves[channel] * 12;
				let lastPitch: number = (channel == 3 ? 4 : 12) + octaveOffset;
				const recentPitches: number[] = channel == 3 ? [4,6,7,2,3,8,0,10] : [12, 19, 24, 31, 36, 7, 0];
				const recentShapes: string[] = [];
				for (let i: number = 0; i < recentPitches.length; i++) {
					recentPitches[i] += octaveOffset;
				}
				for (const p of this.channelPatterns[channel]) {
					bits.write(neededInstrumentBits, p.instrument);
					
					if (p.notes.length > 0) {
						bits.write(1, 1);
						
						let curPart: number = 0;
						for (const t of p.notes) {
							if (t.start > curPart) {
								bits.write(2, 0); // rest
								bits.writePartDuration(t.start - curPart);
							}
							
							const shapeBits: BitFieldWriter = new BitFieldWriter();
							
							// 0: 1 pitch, 10: 2 pitches, 110: 3 pitches, 111: 4 pitches
							for (let i: number = 1; i < t.pitches.length; i++) shapeBits.write(1,1);
							if (t.pitches.length < 4) shapeBits.write(1,0);
							
							shapeBits.writePinCount(t.pins.length - 1);
							
							shapeBits.write(2, t.pins[0].volume); // volume
							
							let shapePart: number = 0;
							let startPitch: number = t.pitches[0];
							let currentPitch: number = startPitch;
							const pitchBends: number[] = [];
							for (let i: number = 1; i < t.pins.length; i++) {
								const pin: NotePin = t.pins[i];
								const nextPitch: number = startPitch + pin.interval;
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
							
							const shapeString: string = String.fromCharCode.apply(null, shapeBits.encodeBase64(base64IntToCharCode, []));
							const shapeIndex: number = recentShapes.indexOf(shapeString);
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
							
							const allPitches: number[] = t.pitches.concat(pitchBends);
							for (let i: number = 0; i < allPitches.length; i++) {
								const pitch: number = allPitches[i];
								const pitchIndex: number = recentPitches.indexOf(pitch);
								if (pitchIndex == -1) {
									let interval: number = 0;
									let pitchIter: number = lastPitch;
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
						
						if (curPart < this.beats * this.parts) {
							bits.write(2, 0); // rest
							bits.writePartDuration(this.beats * this.parts - curPart);
						}
					} else {
						bits.write(1, 0);
					}
				}
			}
			let stringLength: number = bits.lengthBase64();
			let digits: number[] = [];
			while (stringLength > 0) {
				digits.unshift(base64IntToCharCode[stringLength & 0x3f]);
				stringLength = stringLength >> 6;
			}
			buffer.push(base64IntToCharCode[digits.length]);
			Array.prototype.push.apply(buffer, digits); // append digits to buffer.
			bits.encodeBase64(base64IntToCharCode, buffer);
			
			return String.fromCharCode.apply(null, buffer); // HACK: This breaks for strings longer than 65535. 
		}
		
		public fromBase64String(compressed: string): void {
			if (compressed == null) {
				this.initToDefault();
				return;
			}
			let charIndex: number = 0;
			// skip whitespace.
			while (compressed.charCodeAt(charIndex) <= CharCode.SPACE) charIndex++;
			// skip hash mark.
			if (compressed.charCodeAt(charIndex) == CharCode.HASH) charIndex++;
			// if it starts with curly brace, treat it as JSON.
			if (compressed.charCodeAt(charIndex) == CharCode.LEFT_CURLY_BRACE) {
				this.fromJsonObject(JSON.parse(charIndex == 0 ? compressed : compressed.substring(charIndex)));
				return;
			}
			
			this.initToDefault();
			const version: number = Song._base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
			if (version == -1 || version > Song._latestVersion || version < Song._oldestVersion) return;
			const beforeThree: boolean = version < 3;
			const beforeFour:  boolean = version < 4;
			const beforeFive:  boolean = version < 5;
			const base64CharCodeToInt: ReadonlyArray<number> = Song._base64CharCodeToInt;
			if (beforeThree) this.instrumentEnvelopes = [[0],[0],[0],[0]];
			if (beforeThree) this.instrumentWaves   = [[1],[1],[1],[0]];
			while (charIndex < compressed.length) {
				const command: number = compressed.charCodeAt(charIndex++);
				let channel: number;
				if (command == CharCode.s) {
					this.scale = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
					if (beforeThree && this.scale == 10) this.scale = 11;
				} else if (command == CharCode.k) {
					this.key = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
				} else if (command == CharCode.l) {
					if (beforeFive) {
						this.loopStart = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
					} else {
						this.loopStart = (base64CharCodeToInt[compressed.charCodeAt(charIndex++)] << 6) + base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
					}
				} else if (command == CharCode.e) {
					if (beforeFive) {
						this.loopLength = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
					} else {
						this.loopLength = (base64CharCodeToInt[compressed.charCodeAt(charIndex++)] << 6) + base64CharCodeToInt[compressed.charCodeAt(charIndex++)] + 1;
					}
				} else if (command == CharCode.t) {
					if (beforeFour) {
						this.tempo = [1, 4, 7, 10][base64CharCodeToInt[compressed.charCodeAt(charIndex++)]];
					} else {
						this.tempo = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
					}
					this.tempo = this._clip(0, Music.tempoNames.length, this.tempo);
				} else if (command == CharCode.m) {
					this.reverb = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
					this.reverb = this._clip(0, Music.reverbRange, this.reverb);
				} else if (command == CharCode.a) {
					if (beforeThree) {
						this.beats = [6, 7, 8, 9, 10][base64CharCodeToInt[compressed.charCodeAt(charIndex++)]];
					} else {
						this.beats = base64CharCodeToInt[compressed.charCodeAt(charIndex++)] + 1;
					}
					this.beats = Math.max(Music.beatsMin, Math.min(Music.beatsMax, this.beats));
				} else if (command == CharCode.g) {
					this.bars = (base64CharCodeToInt[compressed.charCodeAt(charIndex++)] << 6) + base64CharCodeToInt[compressed.charCodeAt(charIndex++)] + 1;
					this.bars = Math.max(Music.barsMin, Math.min(Music.barsMax, this.bars));
				} else if (command == CharCode.j) {
					this.patterns = base64CharCodeToInt[compressed.charCodeAt(charIndex++)] + 1;
					this.patterns = Math.max(Music.patternsMin, Math.min(Music.patternsMax, this.patterns));
				} else if (command == CharCode.i) {
					this.instruments = base64CharCodeToInt[compressed.charCodeAt(charIndex++)] + 1;
					this.instruments = Math.max(Music.instrumentsMin, Math.min(Music.instrumentsMax, this.instruments));
				} else if (command == CharCode.r) {
					this.parts = Music.partCounts[base64CharCodeToInt[compressed.charCodeAt(charIndex++)]];
				} else if (command == CharCode.w) {
					if (beforeThree) {
						channel = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
						this.instrumentWaves[channel][0] = this._clip(0, Music.waveNames.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
					} else {
						for (channel = 0; channel < Music.numChannels; channel++) {
							for (let i: number = 0; i < this.instruments; i++) {
								this.instrumentWaves[channel][i] = this._clip(0, Music.waveNames.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
							}
						}
					}
				} else if (command == CharCode.f) {
					if (beforeThree) {
						channel = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
						this.instrumentFilters[channel][0] = [0, 2, 3, 5][this._clip(0, Music.filterNames.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)])];
					} else {
						for (channel = 0; channel < Music.numChannels; channel++) {
							for (let i: number = 0; i < this.instruments; i++) {
								this.instrumentFilters[channel][i] = this._clip(0, Music.filterNames.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
							}
						}
					}
				} else if (command == CharCode.d) {
					if (beforeThree) {
						channel = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
						this.instrumentEnvelopes[channel][0] = this._clip(0, Music.envelopeNames.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
					} else {
						for (channel = 0; channel < Music.numChannels; channel++) {
							for (let i: number = 0; i < this.instruments; i++) {
								this.instrumentEnvelopes[channel][i] = this._clip(0, Music.envelopeNames.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
							}
						}
					}
				} else if (command == CharCode.c) {
					if (beforeThree) {
						channel = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
						this.instrumentEffects[channel][0] = this._clip(0, Music.effectNames.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
						if (this.instrumentEffects[channel][0] == 1) this.instrumentEffects[channel][0] = 3;
						else if (this.instrumentEffects[channel][0] == 3) this.instrumentEffects[channel][0] = 5;
					} else {
						for (channel = 0; channel < Music.numChannels; channel++) {
							for (let i: number = 0; i < this.instruments; i++) {
								this.instrumentEffects[channel][i] = this._clip(0, Music.effectNames.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
							}
						}
					}
				} else if (command == CharCode.h) {
					if (beforeThree) {
						channel = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
						this.instrumentChorus[channel][0] = this._clip(0, Music.chorusNames.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
					} else {
						for (channel = 0; channel < Music.numChannels; channel++) {
							for (let i: number = 0; i < this.instruments; i++) {
								this.instrumentChorus[channel][i] = this._clip(0, Music.chorusNames.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
							}
						}
					}
				} else if (command == CharCode.v) {
					if (beforeThree) {
						channel = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
						this.instrumentVolumes[channel][0] = this._clip(0, Music.volumeNames.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
					} else {
						for (channel = 0; channel < Music.numChannels; channel++) {
							for (let i: number = 0; i < this.instruments; i++) {
								this.instrumentVolumes[channel][i] = this._clip(0, Music.volumeNames.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
							}
						}
					}
				} else if (command == CharCode.o) {
					if (beforeThree) {
						channel = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
						this.channelOctaves[channel] = this._clip(0, 5, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
					} else {
						for (channel = 0; channel < Music.numChannels; channel++) {
							this.channelOctaves[channel] = this._clip(0, 5, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
						}
					}
				} else if (command == CharCode.b) {
					let subStringLength: number;
					if (beforeThree) {
						channel = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
						const barCount: number = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
						subStringLength = Math.ceil(barCount * 0.5);
						const bits: BitFieldReader = new BitFieldReader(base64CharCodeToInt, compressed, charIndex, charIndex + subStringLength);
						for (let i: number = 0; i < barCount; i++) {
							this.channelBars[channel][i] = bits.read(3) + 1;
						}
					} else if (beforeFive) {
						let neededBits: number = 0;
						while ((1 << neededBits) < this.patterns) neededBits++;
						subStringLength = Math.ceil(Music.numChannels * this.bars * neededBits / 6);
						const bits: BitFieldReader = new BitFieldReader(base64CharCodeToInt, compressed, charIndex, charIndex + subStringLength);
						for (channel = 0; channel < Music.numChannels; channel++) {
							this.channelBars[channel].length = this.bars;
							for (let i: number = 0; i < this.bars; i++) {
								this.channelBars[channel][i] = bits.read(neededBits) + 1;
							}
						}
					} else {
						let neededBits2: number = 0;
						while ((1 << neededBits2) < this.patterns + 1) neededBits2++;
						subStringLength = Math.ceil(Music.numChannels * this.bars * neededBits2 / 6);
						const bits: BitFieldReader = new BitFieldReader(base64CharCodeToInt, compressed, charIndex, charIndex + subStringLength);
						for (channel = 0; channel < Music.numChannels; channel++) {
							this.channelBars[channel].length = this.bars;
							for (let i: number = 0; i < this.bars; i++) {
								this.channelBars[channel][i] = bits.read(neededBits2);
							}
						}
					}
					charIndex += subStringLength;
				} else if (command == CharCode.p) {
					let bitStringLength: number = 0;
					if (beforeThree) {
						channel = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
						
						// The old format used the next character to represent the number of patterns in the channel, which is usually eight, the default. 
						charIndex++; //let patternCount: number = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
						
						bitStringLength = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
						bitStringLength = bitStringLength << 6;
						bitStringLength += base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
					} else {
						channel = 0;
						let bitStringLengthLength: number = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
						while (bitStringLengthLength > 0) {
							bitStringLength = bitStringLength << 6;
							bitStringLength += base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
							bitStringLengthLength--;
						}
					}
					
					const bits: BitFieldReader = new BitFieldReader(base64CharCodeToInt, compressed, charIndex, charIndex + bitStringLength);
					charIndex += bitStringLength;
					
					let neededInstrumentBits: number = 0;
					while ((1 << neededInstrumentBits) < this.instruments) neededInstrumentBits++;
					while (true) {
						this.channelPatterns[channel] = [];
						
						const octaveOffset: number = channel == 3 ? 0 : this.channelOctaves[channel] * 12;
						let note: Note | null = null;
						let pin: NotePin | null = null;
						let lastPitch: number = (channel == 3 ? 4 : 12) + octaveOffset;
						const recentPitches: number[] = channel == 3 ? [4,6,7,2,3,8,0,10] : [12, 19, 24, 31, 36, 7, 0];
						const recentShapes: any[] = [];
						for (let i: number = 0; i < recentPitches.length; i++) {
							recentPitches[i] += octaveOffset;
						}
						for (let i: number = 0; i < this.patterns; i++) {
							const newPattern: BarPattern | null = new BarPattern();
							newPattern.instrument = bits.read(neededInstrumentBits);
							this.channelPatterns[channel][i] = newPattern;
							
							if (!beforeThree && bits.read(1) == 0) continue;
							
							let curPart: number = 0;
							const newNotes: Note[] = [];
							while (curPart < this.beats * this.parts) {
								
								const useOldShape: boolean = bits.read(1) == 1;
								let newNote: boolean = false;
								let shapeIndex: number = 0;
								if (useOldShape) {
									shapeIndex = bits.readLongTail(0, 0);
								} else {
									newNote = bits.read(1) == 1;
								}
								
								if (!useOldShape && !newNote) {
									const restLength: number = bits.readPartDuration();
									curPart += restLength;
								} else {
									let shape: any;
									let pinObj: any;
									let pitch: number;
									if (useOldShape) {
										shape = recentShapes[shapeIndex];
										recentShapes.splice(shapeIndex, 1);
									} else {
										shape = {};
										
										shape.pitchCount = 1;
										while (shape.pitchCount < 4 && bits.read(1) == 1) shape.pitchCount++;
										
										shape.pinCount = bits.readPinCount();
										shape.initialVolume = bits.read(2);
										
										shape.pins = [];
										shape.length = 0;
										shape.bendCount = 0;
										for (let j: number = 0; j < shape.pinCount; j++) {
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
									
									note = makeNote(0,curPart,curPart + shape.length, shape.initialVolume);
									note.pitches = [];
									note.pins.length = 1;
									const pitchBends: number[] = [];
									for (let j: number = 0; j < shape.pitchCount + shape.bendCount; j++) {
										const useOldPitch: boolean = bits.read(1) == 1;
										if (!useOldPitch) {
											const interval: number = bits.readPitchInterval();
											pitch = lastPitch;
											let intervalIter: number = interval;
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
											const pitchIndex: number = bits.read(3);
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
									
									for (const pinObj of shape.pins) {
										if (pinObj.pitchBend) pitchBends.shift();
										pin = makeNotePin(pitchBends[0] - note.pitches[0], pinObj.time, pinObj.volume);
										note.pins.push(pin);
									}
									curPart = note.end;
									newNotes.push(note);
								}
							}
							newPattern.notes = newNotes;
						} // for (let i: number = 0; i < patterns; i++) {
						
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
		
		public toJsonObject(enableIntro: boolean = true, loopCount: number = 1, enableOutro: boolean = true): Object {
			const channelArray: Object[] = [];
			for (let channel: number = 0; channel < Music.numChannels; channel++) {
				const instrumentArray: Object[] = [];
				for (let i: number = 0; i < this.instruments; i++) {
					if (channel == 3) {
						instrumentArray.push({
							volume: (5 - this.instrumentVolumes[channel][i]) * 20,
							wave: Music.drumNames[this.instrumentWaves[channel][i]],
							envelope: Music.envelopeNames[this.instrumentEnvelopes[channel][i]],
						});
					} else {
						instrumentArray.push({
							volume: (5 - this.instrumentVolumes[channel][i]) * 20,
							wave: Music.waveNames[this.instrumentWaves[channel][i]],
							envelope: Music.envelopeNames[this.instrumentEnvelopes[channel][i]],
							filter: Music.filterNames[this.instrumentFilters[channel][i]],
							chorus: Music.chorusNames[this.instrumentChorus[channel][i]],
							effect: Music.effectNames[this.instrumentEffects[channel][i]],
						});
					}
				}
				
				const patternArray: Object[] = [];
				for (const pattern of this.channelPatterns[channel]) {
					const pitchArray: Object[] = [];
					for (const note of pattern.notes) {
						const pointArray: Object[] = [];
						for (const pin of note.pins) {
							pointArray.push({
								tick: pin.time + note.start,
								pitchBend: pin.interval,
								volume: Math.round(pin.volume * 100 / 3),
							});
						}
						
						pitchArray.push({
							pitches: note.pitches,
							points: pointArray,
						});
					}
					
					patternArray.push({
						instrument: pattern.instrument + 1,
						pitches: pitchArray, 
					});
				}
				
				const sequenceArray: number[] = [];
				if (enableIntro) for (let i: number = 0; i < this.loopStart; i++) {
					sequenceArray.push(this.channelBars[channel][i]);
				}
				for (let l: number = 0; l < loopCount; l++) for (let i: number = this.loopStart; i < this.loopStart + this.loopLength; i++) {
					sequenceArray.push(this.channelBars[channel][i]);
				}
				if (enableOutro) for (let i: number = this.loopStart + this.loopLength; i < this.bars; i++) {
					sequenceArray.push(this.channelBars[channel][i]);
				}
				
				channelArray.push({
					octaveScrollBar: this.channelOctaves[channel],
					instruments: instrumentArray,
					patterns: patternArray,
					sequence: sequenceArray,
				});
			}
			
			return {
				version: Song._latestVersion,
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
				channels: channelArray,
			};
		}
		
		public fromJsonObject(jsonObject: any): void {
			this.initToDefault();
			if (!jsonObject) return;
			const version: any = jsonObject.version;
			if (version !== 5) return;
			
			this.scale = 11; // default to expert.
			if (jsonObject.scale != undefined) {
				const scale: number = Music.scaleNames.indexOf(jsonObject.scale);
				if (scale != -1) this.scale = scale;
			}
			
			if (jsonObject.key != undefined) {
				if (typeof(jsonObject.key) == "number") {
					this.key = Music.keyNames.length - 1 - (((jsonObject.key + 1200) >>> 0) % Music.keyNames.length);
				} else if (typeof(jsonObject.key) == "string") {
					const key: string = jsonObject.key;
					const letter: string = key.charAt(0).toUpperCase();
					const symbol: string = key.charAt(1).toLowerCase();
					const letterMap: Readonly<Dictionary<number>> = {"C": 11, "D": 9, "E": 7, "F": 6, "G": 4, "A": 2, "B": 0};
					const accidentalMap: Readonly<Dictionary<number>> = {"#": -1, "♯": -1, "b": 1, "♭": 1};
					let index: number | undefined = letterMap[letter];
					const offset: number | undefined = accidentalMap[symbol];
					if (index != undefined) {
						if (offset != undefined) index += offset;
						if (index < 0) index += 12;
						index = index % 12;
						this.key = index;
					}
				}
			}
			
			if (jsonObject.beatsPerMinute != undefined) {
				const bpm: number = jsonObject.beatsPerMinute | 0;
				this.tempo = Math.round(4.0 + 9.0 * Math.log(bpm / 120) / Math.LN2);
				this.tempo = this._clip(0, Music.tempoNames.length, this.tempo);
			}
			
			if (jsonObject.reverb != undefined) {
				this.reverb = this._clip(0, Music.reverbRange, jsonObject.reverb | 0);
			}
			
			if (jsonObject.beatsPerBar != undefined) {
				this.beats = Math.max(Music.beatsMin, Math.min(Music.beatsMax, jsonObject.beatsPerBar | 0));
			}
			
			if (jsonObject.ticksPerBeat != undefined) {
				this.parts = Math.max(3, Math.min(4, jsonObject.ticksPerBeat | 0));
			}
			
			let maxInstruments: number = 1;
			let maxPatterns: number = 1;
			let maxBars: number = 1;
			for (let channel: number = 0; channel < Music.numChannels; channel++) {
				if (jsonObject.channels && jsonObject.channels[channel]) {
					const channelObject: any = jsonObject.channels[channel];
					if (channelObject.instruments) maxInstruments = Math.max(maxInstruments, channelObject.instruments.length | 0);
					if (channelObject.patterns) maxPatterns = Math.max(maxPatterns, channelObject.patterns.length | 0);
					if (channelObject.sequence) maxBars = Math.max(maxBars, channelObject.sequence.length | 0);
				}
			}
			
			this.instruments = maxInstruments;
			this.patterns = maxPatterns;
			this.bars = maxBars;
			
			if (jsonObject.introBars != undefined) {
				this.loopStart = this._clip(0, this.bars, jsonObject.introBars | 0);
			}
			if (jsonObject.loopBars != undefined) {
				this.loopLength = this._clip(1, this.bars - this.loopStart + 1, jsonObject.loopBars | 0);
			}
			
			for (let channel: number = 0; channel < Music.numChannels; channel++) {
				let channelObject: any = undefined;
				if (jsonObject.channels) channelObject = jsonObject.channels[channel];
				if (channelObject == undefined) channelObject = {};
				
				if (channelObject.octaveScrollBar != undefined) {
					this.channelOctaves[channel] = this._clip(0, 5, channelObject.octaveScrollBar | 0);
				}
				
				this.instrumentVolumes[channel].length = this.instruments;
				this.instrumentWaves[channel].length = this.instruments;
				this.instrumentEnvelopes[channel].length = this.instruments;
				this.instrumentFilters[channel].length = this.instruments;
				this.instrumentChorus[channel].length = this.instruments;
				this.instrumentEffects[channel].length = this.instruments;
				this.channelPatterns[channel].length = this.patterns;
				this.channelBars[channel].length = this.bars;
				
				for (let i: number = 0; i < this.instruments; i++) {
					let instrumentObject: any = undefined;
					if (channelObject.instruments) instrumentObject = channelObject.instruments[i];
					if (instrumentObject == undefined) instrumentObject = {};
					if (instrumentObject.volume != undefined) {
						this.instrumentVolumes[channel][i] = this._clip(0, Music.volumeNames.length, Math.round(5 - (instrumentObject.volume | 0) / 20));
					} else {
						this.instrumentVolumes[channel][i] = 0;
					}
					this.instrumentEnvelopes[channel][i] = Music.envelopeNames.indexOf(instrumentObject.envelope);
					if (this.instrumentEnvelopes[channel][i] == -1) this.instrumentEnvelopes[channel][i] = 1;
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
				
				for (let i: number = 0; i < this.patterns; i++) {
					const pattern: BarPattern = new BarPattern();
					this.channelPatterns[channel][i] = pattern;
					
					let patternObject: any = undefined;
					if (channelObject.patterns) patternObject = channelObject.patterns[i];
					if (patternObject == undefined) continue;
					
					pattern.instrument = this._clip(0, this.instruments, (patternObject.instrument | 0) - 1);
					
					if (patternObject.pitches && patternObject.pitches.length > 0) {
						const maxNoteCount: number = Math.min(this.beats * this.parts, patternObject.pitches.length >>> 0);
						
						///@TODO: Consider supporting pitches specified in any timing order, sorting them and truncating as necessary. 
						let tickClock: number = 0;
						for (let j: number = 0; j < patternObject.pitches.length; j++) {
							if (j >= maxNoteCount) break;
							
							const pitchObject = patternObject.pitches[j];
							if (!pitchObject || !pitchObject.pitches || !(pitchObject.pitches.length >= 1) || !pitchObject.points || !(pitchObject.points.length >= 2)) {
								continue;
							}
							
							const note: Note = makeNote(0, 0, 0, 0);
							note.pitches = [];
							note.pins = [];
							
							for (let k: number = 0; k < pitchObject.pitches.length; k++) {
								const pitch: number = pitchObject.pitches[k] | 0;
								if (note.pitches.indexOf(pitch) != -1) continue;
								note.pitches.push(pitch);
								if (note.pitches.length >= 4) break;
							}
							if (note.pitches.length < 1) continue;
							
							let noteClock: number = tickClock;
							let startInterval: number = 0;
							for (let k: number = 0; k < pitchObject.points.length; k++) {
								const pointObject: any = pitchObject.points[k];
								if (pointObject == undefined || pointObject.tick == undefined) continue;
								const interval: number = (pointObject.pitchBend == undefined) ? 0 : (pointObject.pitchBend | 0);
								const time: number = pointObject.tick | 0;
								const volume: number = (pointObject.volume == undefined) ? 3 : Math.max(0, Math.min(3, Math.round((pointObject.volume | 0) * 3 / 100)));
								
								if (time > this.beats * this.parts) continue;
								if (note.pins.length == 0) {
									if (time < noteClock) continue;
									note.start = time;
									startInterval = interval;
								} else {
									if (time <= noteClock) continue;
								}
								noteClock = time;
								
								note.pins.push(makeNotePin(interval - startInterval, time - note.start, volume));
							}
							if (note.pins.length < 2) continue;
							
							note.end = note.pins[note.pins.length - 1].time + note.start;
							
							const maxPitch: number = channel == 3 ? Music.drumCount - 1 : Music.maxPitch;
							let lowestPitch: number = maxPitch;
							let highestPitch: number = 0;
							for (let k: number = 0; k < note.pitches.length; k++) {
								note.pitches[k] += startInterval;
								if (note.pitches[k] < 0 || note.pitches[k] > maxPitch) {
									note.pitches.splice(k, 1);
									k--;
								}
								if (note.pitches[k] < lowestPitch) lowestPitch = note.pitches[k];
								if (note.pitches[k] > highestPitch) highestPitch = note.pitches[k];
							}
							if (note.pitches.length < 1) continue;
							
							for (let k: number = 0; k < note.pins.length; k++) {
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
				
				for (let i: number = 0; i < this.bars; i++) {
					this.channelBars[channel][i] = channelObject.sequence ? Math.min(this.patterns, channelObject.sequence[i] >>> 0) : 0;
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
		
		public getPattern(channel: number, bar: number): BarPattern | null {
			const patternIndex: number = this.channelBars[channel][bar];
			if (patternIndex == 0) return null;
			return this.channelPatterns[channel][patternIndex - 1];
		}
		
		public getPatternInstrument(channel: number, bar: number): number {
			const pattern: BarPattern | null = this.getPattern(channel, bar);
			return pattern == null ? 0 : pattern.instrument;
		}
		
		public getBeatsPerMinute(): number {
			return Math.round(120.0 * Math.pow(2.0, (-4.0 + this.tempo) / 9.0));
		}
	}
	
	export class Synth {
		
		private static _ensureDrumWavesExist(song: Song | null): void {
			// Don't bother to generate the drum waves unless the song actually
			// uses them, since they may require a lot of computation.
			if (song != null) {
				for (let i: number = 0; i < song.instruments; i++) {
					Music.getDrumWave(song.instrumentWaves[3][i]);
				}
			}
		}
		
		public samplesPerSecond: number = 44100;
		private _effectDuration: number = 0.14;
		private _effectAngle: number = Math.PI * 2.0 / (this._effectDuration * this.samplesPerSecond);
		private _effectYMult: number = 2.0 * Math.cos(this._effectAngle);
		private _limitDecay: number = 1.0 / (2.0 * this.samplesPerSecond);
		
		public song: Song | null = null;
		public pianoPressed: boolean = false;
		public pianoPitch: number = 0;
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
		private _channel0PeriodA: number = 0.0;
		private _channel0PeriodB: number = 0.0;
		private _channel0Sample: number = 0.0;
		private _channel1PeriodA: number = 0.0;
		private _channel1PeriodB: number = 0.0;
		private _channel1Sample: number = 0.0;
		private _channel2PeriodA: number = 0.0;
		private _channel2PeriodB: number = 0.0;
		private _channel2Sample: number = 0.0;
		private _drumPeriod: number = 0.0;
		private _drumSample: number = 0.0;
		private _stillGoing: boolean = false;
		private _effectPeriod: number = 0.0;
		private _limit: number = 0.0;
		
		private _delayLine: Float32Array = new Float32Array(16384);
		private _delayPos: number = 0;
		private _delayFeedback0: number = 0.0;
		private _delayFeedback1: number = 0.0;
		private _delayFeedback2: number = 0.0;
		private _delayFeedback3: number = 0.0;
		
		private _audioCtx: any;
		private _scriptNode: any;
		
		public get playing(): boolean {
			return !this._paused;
		}
		
		public get playhead(): number {
			return this._playhead;
		}
		
		public set playhead(value: number) {
			if (this.song != null) {
				this._playhead = Math.max(0, Math.min(this.song.bars, value));
				let remainder: number = this._playhead;
				this._bar = Math.floor(remainder);
				remainder = this.song.beats * (remainder - this._bar);
				this._beat = Math.floor(remainder);
				remainder = this.song.parts * (remainder - this._beat);
				this._part = Math.floor(remainder);
				remainder = 4 * (remainder - this._part);
				this._arpeggio = Math.floor(remainder);
				const samplesPerArpeggio: number = this._getSamplesPerArpeggio();
				remainder = samplesPerArpeggio * (remainder - this._arpeggio);
				this._arpeggioSamples = Math.floor(samplesPerArpeggio - remainder);
				if (this._bar < this.song.loopStart) {
					this.enableIntro = true;
				}
				if (this._bar > this.song.loopStart + this.song.loopLength) {
					this.enableOutro = true;
				}
			}
		}
		
		public get totalSamples(): number {
			if (this.song == null) return 0;
			const samplesPerBar: number = this._getSamplesPerArpeggio() * 4 * this.song.parts * this.song.beats;
			let loopMinCount: number = this.loopCount;
			if (loopMinCount < 0) loopMinCount = 1;
			let bars: number = this.song.loopLength * loopMinCount;
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
			if (song != null) this.setSong(song);
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
			
			Synth._ensureDrumWavesExist(this.song);
			
			const contextClass = (window.AudioContext || window.webkitAudioContext || window.mozAudioContext || window.oAudioContext || window.msAudioContext);
			this._audioCtx = this._audioCtx || new contextClass();
			this._scriptNode = this._audioCtx.createScriptProcessor ? this._audioCtx.createScriptProcessor(2048, 0, 1) : this._audioCtx.createJavaScriptNode(2048, 0, 1); // 2048, 0 input channels, 1 output
			this._scriptNode.onaudioprocess = this._audioProcessCallback;
			this._scriptNode.channelCountMode = 'explicit';
			this._scriptNode.channelInterpretation = 'speakers';
			this._scriptNode.connect(this._audioCtx.destination);
			
			this.samplesPerSecond = this._audioCtx.sampleRate;
			this._effectAngle = Math.PI * 2.0 / (this._effectDuration * this.samplesPerSecond);
			this._effectYMult = 2.0 * Math.cos(this._effectAngle);
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
			
			this._channel0Sample = 0.0;
			this._channel1Sample = 0.0;
			this._channel2Sample = 0.0;
			this._drumSample = 0.0;
			this._delayPos = 0;
			this._delayFeedback0 = 0.0;
			this._delayFeedback1 = 0.0;
			this._delayFeedback2 = 0.0;
			this._delayFeedback3 = 0.0;
			for (let i: number = 0; i < this._delayLine.length; i++) this._delayLine[i] = 0.0;
		}
		
		public nextBar(): void {
			if (!this.song) return;
			const oldBar: number = this._bar;
			this._bar++;
			if (this.enableOutro) {
				if (this._bar >= this.song.bars) {
					this._bar = this.enableIntro ? 0 : this.song.loopStart;
				}
			} else {
				if (this._bar >= this.song.loopStart + this.song.loopLength || this._bar >= this.song.bars) {
					this._bar = this.song.loopStart;
				}
 			}
			this._playhead += this._bar - oldBar;
		}
		
		public prevBar(): void {
			if (!this.song) return;
			const oldBar: number = this._bar;
			this._bar--;
			if (this._bar < 0) {
				this._bar = this.song.loopStart + this.song.loopLength - 1;
			}
			if (this._bar >= this.song.bars) {
				this._bar = this.song.bars - 1;
			}
			if (this._bar < this.song.loopStart) {
				this.enableIntro = true;
			}
			if (!this.enableOutro && this._bar >= this.song.loopStart + this.song.loopLength) {
				this._bar = this.song.loopStart + this.song.loopLength - 1;
			}
			this._playhead += this._bar - oldBar;
		}
		
		private _audioProcessCallback = (audioProcessingEvent: any): void => {
			const outputBuffer = audioProcessingEvent.outputBuffer;
			const outputData: Float32Array = outputBuffer.getChannelData(0);
			this.synthesize(outputData, outputBuffer.length);
		}
		
		public synthesize(data: Float32Array, totalSamples: number): void {
			if (this.song == null) {
				for (let i: number = 0; i < totalSamples; i++) {
					data[i] = 0.0;
				}
				return;
			}
			
			const song: Song = this.song;
			
			let bufferIndex: number = 0;
			
			const sampleTime: number = 1.0 / this.samplesPerSecond;
			const samplesPerArpeggio: number = this._getSamplesPerArpeggio();
			const effectYMult = this._effectYMult;
			const limitDecay: number = this._limitDecay;
			const volume: number = this.volume;
			const delayLine: Float32Array = this._delayLine;
			const reverb: number = Math.pow(song.reverb / Music.reverbRange, 0.667) * 0.425;
			let ended: boolean = false;
			
			// Check the bounds of the playhead:
			if (this._arpeggioSamples == 0 || this._arpeggioSamples > samplesPerArpeggio) {
				this._arpeggioSamples = samplesPerArpeggio;
			}
			if (this._part >= song.parts) {
				this._beat++;
				this._part = 0;
				this._arpeggio = 0;
				this._arpeggioSamples = samplesPerArpeggio;
			}
			if (this._beat >= song.beats) {
				this._bar++;
				this._beat = 0;
				this._part = 0;
				this._arpeggio = 0;
				this._arpeggioSamples = samplesPerArpeggio;
				
				if (this.loopCount == -1) {
					if (this._bar < song.loopStart && !this.enableIntro) this._bar = song.loopStart;
					if (this._bar >= song.loopStart + song.loopLength && !this.enableOutro) this._bar = song.loopStart;
				}
			}
			if (this._bar >= song.bars) {
				if (this.enableOutro) {
					this._bar = 0;
					this.enableIntro = true;
					ended = true;
					this.pause();
				} else {
					this._bar = song.loopStart;
				}
 			}
			if (this._bar >= song.loopStart) {
				this.enableIntro = false;
			}
			
 			while (totalSamples > 0) {
				if (ended) {
					while (totalSamples-- > 0) {
						data[bufferIndex] = 0.0;
						bufferIndex++;
					}
					break;
				}
				
				// Initialize instruments based on current pattern.
				const instrumentChannel0: number = song.getPatternInstrument(0, this._bar);
				const instrumentChannel1: number = song.getPatternInstrument(1, this._bar);
				const instrumentChannel2: number = song.getPatternInstrument(2, this._bar);
				const instrumentDrum: number = song.getPatternInstrument(3, this._bar);
				
				const maxChannel0Volume: number = Music.channelVolumes[0] * (song.instrumentVolumes[0][instrumentChannel0] == 5 ? 0.0 : Math.pow(2, -Music.volumeValues[song.instrumentVolumes[0][instrumentChannel0]])) * Music.waveVolumes[song.instrumentWaves[0][instrumentChannel0]] * Music.filterVolumes[song.instrumentFilters[0][instrumentChannel0]] * Music.chorusVolumes[song.instrumentChorus[0][instrumentChannel0]] * 0.5;
				const maxChannel1Volume: number = Music.channelVolumes[1] * (song.instrumentVolumes[1][instrumentChannel1] == 5 ? 0.0 : Math.pow(2, -Music.volumeValues[song.instrumentVolumes[1][instrumentChannel1]])) * Music.waveVolumes[song.instrumentWaves[1][instrumentChannel1]] * Music.filterVolumes[song.instrumentFilters[1][instrumentChannel1]] * Music.chorusVolumes[song.instrumentChorus[0][instrumentChannel1]] * 0.5;
				const maxChannel2Volume: number = Music.channelVolumes[2] * (song.instrumentVolumes[2][instrumentChannel2] == 5 ? 0.0 : Math.pow(2, -Music.volumeValues[song.instrumentVolumes[2][instrumentChannel2]])) * Music.waveVolumes[song.instrumentWaves[2][instrumentChannel2]] * Music.filterVolumes[song.instrumentFilters[2][instrumentChannel2]] * Music.chorusVolumes[song.instrumentChorus[0][instrumentChannel2]] * 0.5;
				const maxDrumVolume: number = Music.channelVolumes[3] * (song.instrumentVolumes[3][instrumentDrum] == 5 ? 0.0 : Math.pow(2, -Music.volumeValues[song.instrumentVolumes[3][instrumentDrum]])) * Music.drumVolumes[song.instrumentWaves[3][instrumentDrum]];
				
				const channel0Wave: Float64Array = Music.waves[song.instrumentWaves[0][instrumentChannel0]];
				const channel1Wave: Float64Array = Music.waves[song.instrumentWaves[1][instrumentChannel1]];
				const channel2Wave: Float64Array = Music.waves[song.instrumentWaves[2][instrumentChannel2]];
				const drumWave: Float32Array = Music.getDrumWave(song.instrumentWaves[3][instrumentDrum]);
				
				const channel0WaveLength: number = channel0Wave.length;
				const channel1WaveLength: number = channel1Wave.length;
				const channel2WaveLength: number = channel2Wave.length;
				
				const drumPitchRoot: number = Music.drumPitchRoots[song.instrumentWaves[3][instrumentDrum]];
				
				const channel0FilterBase: number = Math.pow(2, -Music.filterBases[song.instrumentFilters[0][instrumentChannel0]]);
				const channel1FilterBase: number = Math.pow(2, -Music.filterBases[song.instrumentFilters[1][instrumentChannel1]]);
				const channel2FilterBase: number = Math.pow(2, -Music.filterBases[song.instrumentFilters[2][instrumentChannel2]]);
				let drumFilter: number = 1.0;
				
				const channel0TremoloScale: number = Music.effectTremolos[song.instrumentEffects[0][instrumentChannel0]];
				const channel1TremoloScale: number = Music.effectTremolos[song.instrumentEffects[1][instrumentChannel1]];
				const channel2TremoloScale: number = Music.effectTremolos[song.instrumentEffects[2][instrumentChannel2]];
				
				// Reuse initialized instruments until getting to the end of the sample period or the end of the current bar.
				while (totalSamples > 0) {
					let samples: number;
					if (this._arpeggioSamples <= totalSamples) {
						samples = this._arpeggioSamples;
					} else {
						samples = totalSamples;
					}
					totalSamples -= samples;
					this._arpeggioSamples -= samples;
				
					let channel0ChorusA: number = Math.pow(2.0, (Music.chorusOffsets[song.instrumentChorus[0][instrumentChannel0]] + Music.chorusIntervals[song.instrumentChorus[0][instrumentChannel0]]) / 12.0);
					let channel1ChorusA: number = Math.pow(2.0, (Music.chorusOffsets[song.instrumentChorus[1][instrumentChannel1]] + Music.chorusIntervals[song.instrumentChorus[1][instrumentChannel1]]) / 12.0);
					let channel2ChorusA: number = Math.pow(2.0, (Music.chorusOffsets[song.instrumentChorus[2][instrumentChannel2]] + Music.chorusIntervals[song.instrumentChorus[2][instrumentChannel2]]) / 12.0);
					let channel0ChorusB: number = Math.pow(2.0, (Music.chorusOffsets[song.instrumentChorus[0][instrumentChannel0]] - Music.chorusIntervals[song.instrumentChorus[0][instrumentChannel0]]) / 12.0);
					let channel1ChorusB: number = Math.pow(2.0, (Music.chorusOffsets[song.instrumentChorus[1][instrumentChannel1]] - Music.chorusIntervals[song.instrumentChorus[1][instrumentChannel1]]) / 12.0);
					let channel2ChorusB: number = Math.pow(2.0, (Music.chorusOffsets[song.instrumentChorus[2][instrumentChannel2]] - Music.chorusIntervals[song.instrumentChorus[2][instrumentChannel2]]) / 12.0);
					const channel0ChorusSign: number = (song.instrumentChorus[0][instrumentChannel0] == 7) ? -1.0 : 1.0;
					const channel1ChorusSign: number = (song.instrumentChorus[1][instrumentChannel1] == 7) ? -1.0 : 1.0;
					const channel2ChorusSign: number = (song.instrumentChorus[2][instrumentChannel2] == 7) ? -1.0 : 1.0;
					if (song.instrumentChorus[0][instrumentChannel0] == 0) this._channel0PeriodB = this._channel0PeriodA;
					if (song.instrumentChorus[1][instrumentChannel1] == 0) this._channel1PeriodB = this._channel1PeriodA;
					if (song.instrumentChorus[2][instrumentChannel2] == 0) this._channel2PeriodB = this._channel2PeriodA;
					
					let channel0PeriodDelta: number = 0;
					let channel0PeriodDeltaScale: number = 0;
					let channel0Volume: number = 0;
					let channel0VolumeDelta: number = 0;
					let channel0Filter: number = 0;
					let channel0FilterScale: number = 0;
					let channel0VibratoScale: number = 0;
					let channel1PeriodDelta: number = 0;
					let channel1PeriodDeltaScale: number = 0;
					let channel1Volume: number = 0;
					let channel1VolumeDelta: number = 0;
					let channel1Filter: number = 0;
					let channel1FilterScale: number = 0;
					let channel1VibratoScale: number = 0;
					let channel2PeriodDelta: number = 0;
					let channel2PeriodDeltaScale: number = 0;
					let channel2Volume: number = 0;
					let channel2VolumeDelta: number = 0;
					let channel2Filter: number = 0;
					let channel2FilterScale: number = 0;
					let channel2VibratoScale: number = 0;
					let drumPeriodDelta: number = 0;
					let drumPeriodDeltaScale: number = 0;
					let drumVolume: number = 0;
					let drumVolumeDelta: number = 0;
					let time: number = this._part + this._beat * song.parts;
					
					for (let channel: number = 0; channel < 4; channel++) {
						const pattern: BarPattern | null = song.getPattern(channel, this._bar);
						
						const envelope: number = pattern == null ? 0 : song.instrumentEnvelopes[channel][pattern.instrument];
						
						let note: Note | null = null;
						let prevNote: Note | null = null;
						let nextNote: Note | null = null;
						if (pattern != null) {
							for (let i: number = 0; i < pattern.notes.length; i++) {
								if (pattern.notes[i].end <= time) {
									prevNote = pattern.notes[i];
								} else if (pattern.notes[i].start <= time && pattern.notes[i].end > time) {
									note = pattern.notes[i];
								} else if (pattern.notes[i].start > time) {
									nextNote = pattern.notes[i];
									break;
								}
							}
						}
						if (note != null && prevNote != null && prevNote.end != note.start) prevNote = null;
						if (note != null && nextNote != null && nextNote.start != note.end) nextNote = null;
						
						const channelRoot: number = channel == 3 ? drumPitchRoot : Music.keyTransposes[song.key];
						const intervalScale: number = channel == 3 ? Music.drumInterval : 1;
						let periodDelta: number;
						let periodDeltaScale: number = 1.0;
						let noteVolume: number;
						let volumeDelta: number = 0.0;
						let filter: number = 1.0;
						let filterScale: number = 1.0;
						let vibratoScale: number;
						let harmonyMult: number = 1.0;
						let resetPeriod: boolean = false;
						if (this.pianoPressed && channel == this.pianoChannel) {
							const pianoFreq: number = this._frequencyFromPitch(channelRoot + this.pianoPitch * intervalScale);
							const instrument = pattern ? pattern.instrument : 0; 
							let pianoPitchDamping: number;
							if (channel == 3) {
								if (song.instrumentWaves[3][instrument] > 0) {
									drumFilter = Math.min(1.0, pianoFreq * sampleTime * Music.drumPitchFilterMult[song.instrumentWaves[3][pattern!.instrument]]);
									pianoPitchDamping = 24.0;
								} else {
									pianoPitchDamping = 60.0;
								}
							} else {
								pianoPitchDamping = 48.0;
							}
							periodDelta = pianoFreq * sampleTime;
							noteVolume = Math.pow(2.0, -this.pianoPitch * intervalScale / pianoPitchDamping);
							vibratoScale = Math.pow(2.0, Music.effectVibratos[song.instrumentEffects[channel][instrument]] / 12.0) - 1.0;
						} else if (note == null) {
							periodDelta = 0.0;
							periodDeltaScale = 0.0;
							noteVolume = 0.0;
							vibratoScale = 0.0;
							resetPeriod = true;
						} else {
							const chorusHarmonizes: boolean = Music.chorusHarmonizes[song.instrumentChorus[channel][pattern!.instrument]];
							let pitch: number = note.pitches[0];
							if (chorusHarmonizes) {
								let harmonyOffset: number = 0.0;
								if (note.pitches.length == 2) {
									harmonyOffset = note.pitches[1] - note.pitches[0];
								} else if (note.pitches.length == 3) {
									harmonyOffset = note.pitches[(this._arpeggio >> 1) + 1] - note.pitches[0];
								} else if (note.pitches.length == 4) {
									harmonyOffset = note.pitches[(this._arpeggio == 3 ? 1 : this._arpeggio) + 1] - note.pitches[0];
								}
								harmonyMult = Math.pow(2.0, harmonyOffset / 12.0);
							} else {
								if (note.pitches.length == 2) {
									pitch = note.pitches[this._arpeggio >> 1];
								} else if (note.pitches.length == 3) {
									pitch = note.pitches[this._arpeggio == 3 ? 1 : this._arpeggio];
								} else if (note.pitches.length == 4) {
									pitch = note.pitches[this._arpeggio];
								}
							}
							
							let endPinIndex: number;
							for (endPinIndex = 1; endPinIndex < note.pins.length - 1; endPinIndex++) {
								if (note.pins[endPinIndex].time + note.start > time) break;
							}
							const startPin: NotePin = note.pins[endPinIndex-1];
							const endPin: NotePin = note.pins[endPinIndex];
							
							const noteStart: number = note.start * 4;
							const noteEnd:   number = note.end   * 4;
							const pinStart: number  = (note.start + startPin.time) * 4;
							const pinEnd:   number  = (note.start + endPin.time  ) * 4;
							const arpeggioStart: number = time * 4 + this._arpeggio;
							const arpeggioEnd:   number = time * 4 + this._arpeggio + 1;
							const arpeggioRatioStart: number = (arpeggioStart - pinStart) / (pinEnd - pinStart);
							const arpeggioRatioEnd:   number = (arpeggioEnd   - pinStart) / (pinEnd - pinStart);
							let arpeggioVolumeStart: number = startPin.volume * (1.0 - arpeggioRatioStart) + endPin.volume * arpeggioRatioStart;
							let arpeggioVolumeEnd:   number = startPin.volume * (1.0 - arpeggioRatioEnd)   + endPin.volume * arpeggioRatioEnd;
							let arpeggioIntervalStart: number = startPin.interval * (1.0 - arpeggioRatioStart) + endPin.interval * arpeggioRatioStart;
							let arpeggioIntervalEnd:   number = startPin.interval * (1.0 - arpeggioRatioEnd)   + endPin.interval * arpeggioRatioEnd;
							let arpeggioFilterTimeStart: number = startPin.time * (1.0 - arpeggioRatioStart) + endPin.time * arpeggioRatioStart;
							let arpeggioFilterTimeEnd:   number = startPin.time * (1.0 - arpeggioRatioEnd)   + endPin.time * arpeggioRatioEnd;
							
							let inhibitRestart: boolean = false;
							if (arpeggioStart == noteStart) {
								if (envelope == 0) {
									inhibitRestart = true;
								} else if (envelope == 2) {
									arpeggioVolumeStart = 0.0;
								} else if (envelope == 3) {
									if (prevNote == null) {
										arpeggioVolumeStart = 0.0;
									} else if (prevNote.pins[prevNote.pins.length-1].volume == 0 || note.pins[0].volume == 0) {
										arpeggioVolumeStart = 0.0;
									} else {
										arpeggioIntervalStart = (prevNote.pitches[0] + prevNote.pins[prevNote.pins.length-1].interval - pitch) * 0.5;
										arpeggioFilterTimeStart = prevNote.pins[prevNote.pins.length-1].time * 0.5;
										inhibitRestart = true;
									}
								}
							}
							if (arpeggioEnd == noteEnd) {
								if (envelope == 1 || envelope == 2) {
									arpeggioVolumeEnd = 0.0;
								} else if (envelope == 3) {
									if (nextNote == null) {
										arpeggioVolumeEnd = 0.0;
									} else if (note.pins[note.pins.length-1].volume == 0 || nextNote.pins[0].volume == 0) {
										arpeggioVolumeEnd = 0.0;
									} else {
										arpeggioIntervalEnd = (nextNote.pitches[0] + note.pins[note.pins.length-1].interval - pitch) * 0.5;
										arpeggioFilterTimeEnd *= 0.5;
									}
								}
							}
							
							const startRatio: number = 1.0 - (this._arpeggioSamples + samples) / samplesPerArpeggio;
							const endRatio:   number = 1.0 - (this._arpeggioSamples)           / samplesPerArpeggio;
							const startInterval: number = arpeggioIntervalStart * (1.0 - startRatio) + arpeggioIntervalEnd * startRatio;
							const endInterval:   number = arpeggioIntervalStart * (1.0 - endRatio)   + arpeggioIntervalEnd * endRatio;
							const startFilterTime: number = arpeggioFilterTimeStart * (1.0 - startRatio) + arpeggioFilterTimeEnd * startRatio;
							const endFilterTime:   number = arpeggioFilterTimeStart * (1.0 - endRatio)   + arpeggioFilterTimeEnd * endRatio;
							const startFreq: number = this._frequencyFromPitch(channelRoot + (pitch + startInterval) * intervalScale);
							const endFreq:   number = this._frequencyFromPitch(channelRoot + (pitch + endInterval) * intervalScale);
							let pitchDamping: number;
							if (channel == 3) {
								if (song.instrumentWaves[3][pattern!.instrument] > 0) {
									drumFilter = Math.min(1.0, startFreq * sampleTime * Music.drumPitchFilterMult[song.instrumentWaves[3][pattern!.instrument]]);
									pitchDamping = 24.0;
								} else {
									pitchDamping = 60.0;
								}
							} else {
								pitchDamping = 48.0;
							}
							let startVol: number = Math.pow(2.0, -(pitch + startInterval) * intervalScale / pitchDamping);
							let endVol:   number = Math.pow(2.0, -(pitch + endInterval) * intervalScale / pitchDamping);
							startVol *= this._volumeConversion(arpeggioVolumeStart * (1.0 - startRatio) + arpeggioVolumeEnd * startRatio);
							endVol   *= this._volumeConversion(arpeggioVolumeStart * (1.0 - endRatio)   + arpeggioVolumeEnd * endRatio);
							const freqScale: number = endFreq / startFreq;
							periodDelta = startFreq * sampleTime;
							periodDeltaScale = Math.pow(freqScale, 1.0 / samples);
							noteVolume = startVol;
							volumeDelta = (endVol - startVol) / samples;
							const timeSinceStart: number = (arpeggioStart + startRatio - noteStart) * samplesPerArpeggio / this.samplesPerSecond;
							if (timeSinceStart == 0.0 && !inhibitRestart) resetPeriod = true;
							
							const filterScaleRate: number = Music.filterDecays[song.instrumentFilters[channel][pattern!.instrument]];
							filter = Math.pow(2, -filterScaleRate * startFilterTime * 4.0 * samplesPerArpeggio / this.samplesPerSecond);
							const endFilter: number = Math.pow(2, -filterScaleRate * endFilterTime * 4.0 * samplesPerArpeggio / this.samplesPerSecond);
							filterScale = Math.pow(endFilter / filter, 1.0 / samples);
							vibratoScale = (song.instrumentEffects[channel][pattern!.instrument] == 2 && time - note.start < 3) ? 0.0 : Math.pow(2.0, Music.effectVibratos[song.instrumentEffects[channel][pattern!.instrument]] / 12.0) - 1.0;
						}
						
						if (channel == 0) {
							channel0PeriodDelta = periodDelta;
							channel0PeriodDeltaScale = periodDeltaScale;
							channel0Volume = noteVolume * maxChannel0Volume;
							channel0VolumeDelta = volumeDelta * maxChannel0Volume;
							channel0Filter = filter * channel0FilterBase;
							channel0FilterScale = filterScale;
							channel0VibratoScale = vibratoScale;
							channel0ChorusB *= harmonyMult;
							if (resetPeriod) {
								this._channel0Sample = 0.0;
								this._channel0PeriodA = 0.0;
								this._channel0PeriodB = 0.0;
							}
						} else if (channel == 1) {
							channel1PeriodDelta = periodDelta;
							channel1PeriodDeltaScale = periodDeltaScale;
							channel1Volume = noteVolume * maxChannel1Volume;
							channel1VolumeDelta = volumeDelta * maxChannel1Volume;
							channel1Filter = filter * channel1FilterBase;
							channel1FilterScale = filterScale;
							channel1VibratoScale = vibratoScale;
							channel1ChorusB *= harmonyMult;
							if (resetPeriod) {
								this._channel1Sample = 0.0;
								this._channel1PeriodA = 0.0;
								this._channel1PeriodB = 0.0;
							}
						} else if (channel == 2) {
							channel2PeriodDelta = periodDelta;
							channel2PeriodDeltaScale = periodDeltaScale;
							channel2Volume = noteVolume * maxChannel2Volume;
							channel2VolumeDelta = volumeDelta * maxChannel2Volume;
							channel2Filter = filter * channel2FilterBase;
							channel2FilterScale = filterScale;
							channel2VibratoScale = vibratoScale;
							channel2ChorusB *= harmonyMult;
							if (resetPeriod) {
								this._channel2Sample = 0.0;
								this._channel2PeriodA = 0.0;
								this._channel2PeriodB = 0.0;
							}
						} else if (channel == 3) {
							drumPeriodDelta = periodDelta / 32768.0;
							drumPeriodDeltaScale = periodDeltaScale;
							drumVolume = noteVolume * maxDrumVolume;
							drumVolumeDelta = volumeDelta * maxDrumVolume;
						}
					}
					
					let effectY:     number = Math.sin(this._effectPeriod);
					let prevEffectY: number = Math.sin(this._effectPeriod - this._effectAngle);
					
					let channel0Sample: number = +this._channel0Sample;
					let channel0PeriodA: number = +this._channel0PeriodA;
					let channel0PeriodB: number = +this._channel0PeriodB;
					let channel1Sample: number = +this._channel1Sample;
					let channel1PeriodA: number = +this._channel1PeriodA;
					let channel1PeriodB: number = +this._channel1PeriodB;
					let channel2Sample: number = +this._channel2Sample;
					let channel2PeriodA: number = +this._channel2PeriodA;
					let channel2PeriodB: number = +this._channel2PeriodB;
					let drumSample: number = +this._drumSample;
					let drumPeriod: number = +this._drumPeriod;
					let delayPos: number = 0|this._delayPos;
					let delayFeedback0: number = +this._delayFeedback0;
					let delayFeedback1: number = +this._delayFeedback1;
					let delayFeedback2: number = +this._delayFeedback2;
					let delayFeedback3: number = +this._delayFeedback3;
					let limit: number = +this._limit;
					
					while (samples) {
						const channel0Vibrato: number = 1.0 + channel0VibratoScale * effectY;
						const channel1Vibrato: number = 1.0 + channel1VibratoScale * effectY;
						const channel2Vibrato: number = 1.0 + channel2VibratoScale * effectY;
						const channel0Tremolo: number = 1.0 + channel0TremoloScale * (effectY - 1.0);
						const channel1Tremolo: number = 1.0 + channel1TremoloScale * (effectY - 1.0);
						const channel2Tremolo: number = 1.0 + channel2TremoloScale * (effectY - 1.0);
						const temp: number = effectY;
						effectY = effectYMult * effectY - prevEffectY;
						prevEffectY = temp;
						
						channel0Sample += ((channel0Wave[0|(channel0PeriodA * channel0WaveLength)] + channel0Wave[0|(channel0PeriodB * channel0WaveLength)] * channel0ChorusSign) * channel0Volume * channel0Tremolo - channel0Sample) * channel0Filter;
						channel1Sample += ((channel1Wave[0|(channel1PeriodA * channel1WaveLength)] + channel1Wave[0|(channel1PeriodB * channel1WaveLength)] * channel1ChorusSign) * channel1Volume * channel1Tremolo - channel1Sample) * channel1Filter;
						channel2Sample += ((channel2Wave[0|(channel2PeriodA * channel2WaveLength)] + channel2Wave[0|(channel2PeriodB * channel2WaveLength)] * channel2ChorusSign) * channel2Volume * channel2Tremolo - channel2Sample) * channel2Filter;
						drumSample += (drumWave[0|(drumPeriod * 32768.0)] * drumVolume - drumSample) * drumFilter;
						channel0Volume += channel0VolumeDelta;
						channel1Volume += channel1VolumeDelta;
						channel2Volume += channel2VolumeDelta;
						drumVolume += drumVolumeDelta;
						channel0PeriodA += channel0PeriodDelta * channel0Vibrato * channel0ChorusA;
						channel0PeriodB += channel0PeriodDelta * channel0Vibrato * channel0ChorusB;
						channel1PeriodA += channel1PeriodDelta * channel1Vibrato * channel1ChorusA;
						channel1PeriodB += channel1PeriodDelta * channel1Vibrato * channel1ChorusB;
						channel2PeriodA += channel2PeriodDelta * channel2Vibrato * channel2ChorusA;
						channel2PeriodB += channel2PeriodDelta * channel2Vibrato * channel2ChorusB;
						drumPeriod  += drumPeriodDelta;
						channel0PeriodDelta *= channel0PeriodDeltaScale;
						channel1PeriodDelta *= channel1PeriodDeltaScale;
						channel2PeriodDelta *= channel2PeriodDeltaScale;
						drumPeriodDelta *= drumPeriodDeltaScale;
						channel0Filter *= channel0FilterScale;
						channel1Filter *= channel1FilterScale;
						channel2Filter *= channel2FilterScale;
						channel0PeriodA -= 0|channel0PeriodA;
						channel0PeriodB -= 0|channel0PeriodB;
						channel1PeriodA -= 0|channel1PeriodA;
						channel1PeriodB -= 0|channel1PeriodB;
						channel2PeriodA -= 0|channel2PeriodA;
						channel2PeriodB -= 0|channel2PeriodB;
						drumPeriod  -= 0|drumPeriod;
						
						const instrumentSample: number = channel0Sample + channel1Sample + channel2Sample;
						
						// Reverb, implemented using a feedback delay network with a Hadamard matrix and lowpass filters.
						// good ratios:    0.555235 + 0.618033 + 0.818 +   1.0 = 2.991268
						// Delay lengths:  3041     + 3385     + 4481  +  5477 = 16384 = 2^14
						// Buffer offsets: 3041    -> 6426   -> 10907 -> 16384
						const delayPos1: number = (delayPos +  3041) & 0x3FFF;
						const delayPos2: number = (delayPos +  6426) & 0x3FFF;
						const delayPos3: number = (delayPos + 10907) & 0x3FFF;
						const delaySample0: number = delayLine[delayPos ] + instrumentSample;
						const delaySample1: number = delayLine[delayPos1];
						const delaySample2: number = delayLine[delayPos2];
						const delaySample3: number = delayLine[delayPos3];
						const delayTemp0: number = -delaySample0 + delaySample1;
						const delayTemp1: number = -delaySample0 - delaySample1;
						const delayTemp2: number = -delaySample2 + delaySample3;
						const delayTemp3: number = -delaySample2 - delaySample3;
						delayFeedback0 += ((delayTemp0 + delayTemp2) * reverb - delayFeedback0) * 0.5;
						delayFeedback1 += ((delayTemp1 + delayTemp3) * reverb - delayFeedback1) * 0.5;
						delayFeedback2 += ((delayTemp0 - delayTemp2) * reverb - delayFeedback2) * 0.5;
						delayFeedback3 += ((delayTemp1 - delayTemp3) * reverb - delayFeedback3) * 0.5;
						delayLine[delayPos1] = delayFeedback0;
						delayLine[delayPos2] = delayFeedback1;
						delayLine[delayPos3] = delayFeedback2;
						delayLine[delayPos ] = delayFeedback3;
						delayPos = (delayPos + 1) & 0x3FFF;
						
						let sample: number = delaySample0 + delaySample1 + delaySample2 + delaySample3 + drumSample;
						
						const abs: number = sample < 0.0 ? -sample : sample;
						limit -= limitDecay;
						if (limit < abs) limit = abs;
						sample /= limit * 0.75 + 0.25;
						sample *= volume;
						data[bufferIndex] = sample;
						bufferIndex = bufferIndex + 1;
						samples--;
					}
					
					this._channel0Sample = channel0Sample;
					this._channel0PeriodA = channel0PeriodA;
					this._channel0PeriodB = channel0PeriodB;
					this._channel1Sample = channel1Sample;
					this._channel1PeriodA = channel1PeriodA;
					this._channel1PeriodB = channel1PeriodB;
					this._channel2Sample = channel2Sample;
					this._channel2PeriodA = channel2PeriodA;
					this._channel2PeriodB = channel2PeriodB;
					this._drumSample = drumSample;
					this._drumPeriod = drumPeriod;
					this._delayPos = delayPos;
					this._delayFeedback0 = delayFeedback0;
					this._delayFeedback1 = delayFeedback1;
					this._delayFeedback2 = delayFeedback2;
					this._delayFeedback3 = delayFeedback3;
					this._limit = limit;
					
					if (effectYMult * effectY - prevEffectY > prevEffectY) {
						this._effectPeriod = Math.asin(effectY);
					} else {
						this._effectPeriod = Math.PI - Math.asin(effectY);
					}
					
					if (this._arpeggioSamples == 0) {
						this._arpeggio++;
						this._arpeggioSamples = samplesPerArpeggio;
						if (this._arpeggio == 4) {
							this._arpeggio = 0;
							this._part++;
							if (this._part == song.parts) {
								this._part = 0;
								this._beat++;
								if (this._beat == song.beats) {
									this._beat = 0;
									this._effectPeriod = 0.0;
									this._bar++;
									if (this._bar < song.loopStart) {
										if (!this.enableIntro) this._bar = song.loopStart;
									} else {
										this.enableIntro = false;
									}
									if (this._bar >= song.loopStart + song.loopLength) {
										if (this.loopCount > 0) this.loopCount--;
										if (this.loopCount > 0 || !this.enableOutro) {
											this._bar = song.loopStart;
										}
									}
									if (this._bar >= song.bars) {
										this._bar = 0;
										this.enableIntro = true;
										ended = true;
										this.pause();
									}
									
									// The bar changed, may need to reinitialize instruments.
									break;
								}
							}
						}
					}
				}
			}
			
			this._playhead = (((this._arpeggio + 1.0 - this._arpeggioSamples / samplesPerArpeggio) / 4.0 + this._part) / song.parts + this._beat) / song.beats + this._bar;
		}
		
		private _frequencyFromPitch(pitch: number): number {
			return 440.0 * Math.pow(2.0, (pitch - 69.0) / 12.0);
		}
		
		private _volumeConversion(noteVolume: number): number {
			return Math.pow(noteVolume / 3.0, 1.5);
		}
		
		private _getSamplesPerArpeggio(): number {
			if (this.song == null) return 0;
			const beatsPerMinute: number = this.song.getBeatsPerMinute();
			const beatsPerSecond: number = beatsPerMinute / 60.0;
			const partsPerSecond: number = beatsPerSecond * this.song.parts;
			const arpeggioPerSecond: number = partsPerSecond * 4.0;
			return Math.floor(this.samplesPerSecond / arpeggioPerSecond);
		}
	}
}
