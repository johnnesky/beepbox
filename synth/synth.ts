// Copyright (C) 2020 John Nesky, distributed under the MIT license.

/// <reference path="SynthConfig.ts" />
/// <reference path="FFT.ts" />
/// <reference path="Deque.ts" />

interface Window {
	AudioContext: any;
	webkitAudioContext: any;
}

namespace beepbox {
	// For performance debugging:
	//let samplesAccumulated: number = 0;
	//let samplePerformance: number = 0;

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
		A = 65,
		B = 66,
		C = 67,
		D = 68,
		E = 69,
		F = 70,
		G = 71,
		H = 72,
		I = 73,
		J = 74,
		K = 75,
		L = 76,
		M = 77,
		N = 78,
		O = 79,
		P = 80,
		Q = 81,
		R = 82,
		S = 83,
		T = 84,
		U = 85,
		V = 86,
		W = 87,
		X = 88,
		Y = 89,
		Z = 90,
		UNDERSCORE = 95,
		a = 97,
		b = 98,
		c = 99,
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

	const enum SongTagCode {
		beatCount = CharCode.a,
		bars = CharCode.b,
		vibrato = CharCode.c,
		transition = CharCode.d,
		loopEnd = CharCode.e,
		filterCutoff = CharCode.f,
		barCount = CharCode.g,
		interval = CharCode.h,
		instrumentCount = CharCode.i,
		patternCount = CharCode.j,
		key = CharCode.k,
		loopStart = CharCode.l,
		reverb = CharCode.m,
		channelCount = CharCode.n,
		channelOctave = CharCode.o,
		patterns = CharCode.p,
		effects = CharCode.q,
		rhythm = CharCode.r,
		scale = CharCode.s,
		tempo = CharCode.t,
		preset = CharCode.u,
		volume = CharCode.v,
		wave = CharCode.w,

		filterResonance = CharCode.y,
		filterEnvelope = CharCode.z,
		algorithm = CharCode.A,
		feedbackAmplitude = CharCode.B,
		chord = CharCode.C,
		detune = CharCode.D,

		operatorEnvelopes = CharCode.E,
		feedbackType = CharCode.F,

		harmonics = CharCode.H,

		squareDuty = CharCode.K,
		panning = CharCode.L,
		customChipWave = CharCode.M,
		songTitle = CharCode.N,

		operatorAmplitudes = CharCode.P,
		operatorFrequencies = CharCode.Q,

		spectrum = CharCode.S,
		startInstrument = CharCode.T,

		feedbackEnvelope = CharCode.V,
		pulseWidth = CharCode.W,
	}

	const base64IntToCharCode: ReadonlyArray<number> = [48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 97, 98, 99, 100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118, 119, 120, 121, 122, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 45, 95];
	const base64CharCodeToInt: ReadonlyArray<number> = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 62, 62, 0, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0, 0, 0, 0, 0, 0, 0, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 0, 0, 0, 0, 63, 0, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 0, 0, 0, 0, 0]; // 62 could be represented by either "-" or "." for historical reasons. New songs should use "-".

	class BitFieldReader {
		private _bits: number[] = [];
		private _readIndex: number = 0;

		constructor(source: string, startIndex: number, stopIndex: number) {
			for (let i: number = startIndex; i < stopIndex; i++) {
				const value: number = base64CharCodeToInt[source.charCodeAt(i)];
				this._bits.push((value >> 5) & 0x1);
				this._bits.push((value >> 4) & 0x1);
				this._bits.push((value >> 3) & 0x1);
				this._bits.push((value >> 2) & 0x1);
				this._bits.push((value >> 1) & 0x1);
				this._bits.push(value & 0x1);
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
			return this.readLongTail(1, 3);
		}

		public readLegacyPartDuration(): number {
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
		private _index: number = 0;
		private _bits: number[] = [];
		
		public clear() {
			this._index = 0;
		}
		
		public write(bitCount: number, value: number): void {
			bitCount--;
			while (bitCount >= 0) {
				this._bits[this._index++] = (value >>> bitCount) & 1;
				bitCount--;
			}
		}

		public writeLongTail(minValue: number, minBits: number, value: number): void {
			if (value < minValue) throw new Error("value out of bounds");
			value -= minValue;
			let numBits: number = minBits;
			while (value >= (1 << numBits)) {
				this._bits[this._index++] = 1;
				value -= 1 << numBits;
				numBits++;
			}
			this._bits[this._index++] = 0;
			while (numBits > 0) {
				numBits--;
				this._bits[this._index++] = (value >>> numBits) & 1;
			}
		}

		public writePartDuration(value: number): void {
			this.writeLongTail(1, 3, value);
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
			for (let i: number = 0; i < other._index; i++) {
				this._bits[this._index++] = other._bits[i];
			}
		}

		public encodeBase64(buffer: number[]): number[] {

			for (let i: number = 0; i < this._index; i += 6) {
				const value: number = (this._bits[i] << 5) | (this._bits[i+1] << 4) | (this._bits[i+2] << 3) | (this._bits[i+3] << 2) | (this._bits[i+4] << 1) | this._bits[i+5];
				buffer.push(base64IntToCharCode[value]);
			}
			return buffer;
		}

		public lengthBase64(): number {
			return Math.ceil(this._index / 6);
		}
	}

	export interface NotePin {
		interval: number;
		time: number;
		volume: number;
	}

	export function makeNotePin(interval: number, time: number, volume: number): NotePin {
		return { interval: interval, time: time, volume: volume };
	}

	function clamp(min: number, max: number, val: number): number {
		max = max - 1;
		if (val <= max) {
			if (val >= min) return val;
			else return min;
		} else {
			return max;
		}
	}

	export class Note {
		public pitches: number[];
		public pins: NotePin[];
		public start: number;
		public end: number;

		public constructor(pitch: number, start: number, end: number, volume: number, fadeout: boolean = false) {
			this.pitches = [pitch];
			this.pins = [makeNotePin(0, 0, volume), makeNotePin(0, end - start, fadeout ? 0 : volume)];
			this.start = start;
			this.end = end;
		}

		public pickMainInterval(): number {
			let longestFlatIntervalDuration: number = 0;
			let mainInterval: number = 0;
			for (let pinIndex: number = 1; pinIndex < this.pins.length; pinIndex++) {
				const pinA: NotePin = this.pins[pinIndex - 1];
				const pinB: NotePin = this.pins[pinIndex];
				if (pinA.interval == pinB.interval) {
					const duration: number = pinB.time - pinA.time;
					if (longestFlatIntervalDuration < duration) {
						longestFlatIntervalDuration = duration;
						mainInterval = pinA.interval;
					}
				}
			}
			if (longestFlatIntervalDuration == 0) {
				let loudestVolume: number = 0;
				for (let pinIndex: number = 0; pinIndex < this.pins.length; pinIndex++) {
					const pin: NotePin = this.pins[pinIndex];
					if (loudestVolume < pin.volume) {
						loudestVolume = pin.volume;
						mainInterval = pin.interval;
					}
				}
			}
			return mainInterval;
		}
	}

	export class Pattern {
		public notes: Note[] = [];
		public instrument: number = 0;

		public cloneNotes(): Note[] {
			const result: Note[] = [];
			for (const oldNote of this.notes) {
				const newNote: Note = new Note(-1, oldNote.start, oldNote.end, 6);
				newNote.pitches = oldNote.pitches.concat();
				newNote.pins = [];
				for (const oldPin of oldNote.pins) {
					newNote.pins.push(makeNotePin(oldPin.interval, oldPin.time, oldPin.volume));
				}
				result.push(newNote);
			}
			return result;
		}

		public reset(): void {
			this.notes.length = 0;
			this.instrument = 0;
		}
	}

	export class Operator {
		public frequency: number = 0;
		public amplitude: number = 0;
		public envelope: number = 0;

		constructor(index: number) {
			this.reset(index);
		}

		public reset(index: number): void {
			this.frequency = 0;
			this.amplitude = (index <= 1) ? Config.operatorAmplitudeMax : 0;
			this.envelope = (index == 0) ? 0 : 1;
		}

		public copy(other: Operator): void {
			this.frequency = other.frequency;
			this.amplitude = other.amplitude;
			this.envelope = other.envelope;
		}
	}

	export class SpectrumWave {
		public spectrum: number[] = [];
		private _wave: Float32Array | null = null;
		private _waveIsReady: boolean = false;

		constructor(isNoiseChannel: boolean) {
			this.reset(isNoiseChannel);
		}

		public reset(isNoiseChannel: boolean): void {
			for (let i: number = 0; i < Config.spectrumControlPoints; i++) {
				if (isNoiseChannel) {
					this.spectrum[i] = Math.round(Config.spectrumMax * (1 / Math.sqrt(1 + i / 3)));
				} else {
					const isHarmonic: boolean = i == 0 || i == 7 || i == 11 || i == 14 || i == 16 || i == 18 || i == 21 || i == 23 || i >= 25;
					this.spectrum[i] = isHarmonic ? Math.max(0, Math.round(Config.spectrumMax * (1 - i / 30))) : 0;
				}
			}
			this._waveIsReady = false;
		}

		public markCustomWaveDirty(): void {
			this._waveIsReady = false;
		}

		public getCustomWave(lowestOctave: number): Float32Array {
			if (!this._waveIsReady || this._wave == null) {
				let waveLength: number = Config.chipNoiseLength;

				if (this._wave == null || this._wave.length != waveLength + 1) {
					this._wave = new Float32Array(waveLength + 1);
				}
				const wave: Float32Array = this._wave;

				for (let i: number = 0; i < waveLength; i++) {
					wave[i] = 0;
				}

				const highestOctave: number = 14;
				const falloffRatio: number = 0.25;
				// Nudge the 2/7 and 4/7 control points so that they form harmonic intervals.
				const pitchTweak: number[] = [0, 1 / 7, Math.log(5 / 4) / Math.LN2, 3 / 7, Math.log(3 / 2) / Math.LN2, 5 / 7, 6 / 7];
				function controlPointToOctave(point: number): number {
					return lowestOctave + Math.floor(point / Config.spectrumControlPointsPerOctave) + pitchTweak[(point + Config.spectrumControlPointsPerOctave) % Config.spectrumControlPointsPerOctave];
				}

				let combinedAmplitude: number = 1;
				for (let i: number = 0; i < Config.spectrumControlPoints + 1; i++) {
					const value1: number = (i <= 0) ? 0 : this.spectrum[i - 1];
					const value2: number = (i >= Config.spectrumControlPoints) ? this.spectrum[Config.spectrumControlPoints - 1] : this.spectrum[i];
					const octave1: number = controlPointToOctave(i - 1);
					let octave2: number = controlPointToOctave(i);
					if (i >= Config.spectrumControlPoints) octave2 = highestOctave + (octave2 - highestOctave) * falloffRatio;
					if (value1 == 0 && value2 == 0) continue;

					combinedAmplitude += 0.02 * drawNoiseSpectrum(wave, octave1, octave2, value1 / Config.spectrumMax, value2 / Config.spectrumMax, -0.5);
				}
				if (this.spectrum[Config.spectrumControlPoints - 1] > 0) {
					combinedAmplitude += 0.02 * drawNoiseSpectrum(wave, highestOctave + (controlPointToOctave(Config.spectrumControlPoints) - highestOctave) * falloffRatio, highestOctave, this.spectrum[Config.spectrumControlPoints - 1] / Config.spectrumMax, 0, -0.5);
				}

				inverseRealFourierTransform(wave, waveLength);
				scaleElementsByFactor(wave, 5.0 / (Math.sqrt(waveLength) * Math.pow(combinedAmplitude, 0.75)));

				// Duplicate the first sample at the end for easier wrap-around interpolation.
				wave[waveLength] = wave[0];

				this._waveIsReady = true;
			}
			return this._wave;
		}
	}

	export class HarmonicsWave {
		public harmonics: number[] = [];
		private _wave: Float32Array | null = null;
		private _waveIsReady: boolean = false;

		constructor() {
			this.reset();
		}

		public reset(): void {
			for (let i: number = 0; i < Config.harmonicsControlPoints; i++) {
				this.harmonics[i] = 0;
			}
			this.harmonics[0] = Config.harmonicsMax;
			this.harmonics[3] = Config.harmonicsMax;
			this.harmonics[6] = Config.harmonicsMax;
			this._waveIsReady = false;
		}

		public markCustomWaveDirty(): void {
			this._waveIsReady = false;
		}

		public getCustomWave(): Float32Array {
			if (!this._waveIsReady || this._wave == null) {
				let waveLength: number = Config.harmonicsWavelength;
				const retroWave: Float32Array = getDrumWave(0);

				if (this._wave == null || this._wave.length != waveLength + 1) {
					this._wave = new Float32Array(waveLength + 1);
				}
				const wave: Float32Array = this._wave;

				for (let i: number = 0; i < waveLength; i++) {
					wave[i] = 0;
				}

				const overallSlope: number = -0.25;
				let combinedControlPointAmplitude: number = 1;

				for (let harmonicIndex: number = 0; harmonicIndex < Config.harmonicsRendered; harmonicIndex++) {
					const harmonicFreq: number = harmonicIndex + 1;
					let controlValue: number = harmonicIndex < Config.harmonicsControlPoints ? this.harmonics[harmonicIndex] : this.harmonics[Config.harmonicsControlPoints - 1];
					if (harmonicIndex >= Config.harmonicsControlPoints) {
						controlValue *= 1 - (harmonicIndex - Config.harmonicsControlPoints) / (Config.harmonicsRendered - Config.harmonicsControlPoints);
					}
					const normalizedValue: number = controlValue / Config.harmonicsMax;
					let amplitude: number = Math.pow(2, controlValue - Config.harmonicsMax + 1) * Math.sqrt(normalizedValue);
					if (harmonicIndex < Config.harmonicsControlPoints) {
						combinedControlPointAmplitude += amplitude;
					}
					amplitude *= Math.pow(harmonicFreq, overallSlope);

					// Multiple all the sine wave amplitudes by 1 or -1 based on the LFSR
					// retro wave (effectively random) to avoid egregiously tall spikes.
					amplitude *= retroWave[harmonicIndex + 589];

					wave[waveLength - harmonicFreq] = amplitude;
				}

				inverseRealFourierTransform(wave, waveLength);

				// Limit the maximum wave amplitude.
				const mult: number = 1 / Math.pow(combinedControlPointAmplitude, 0.7);

				// Perform the integral on the wave. The chipSynth will perform the derivative to get the original wave back but with antialiasing.
				let cumulative: number = 0;
				let wavePrev: number = 0;
				for (let i: number = 0; i < wave.length; i++) {
					cumulative += wavePrev;
					wavePrev = wave[i] * mult;
					wave[i] = cumulative;
				}
				// The first sample should be zero, and we'll duplicate it at the end for easier interpolation.
				wave[waveLength] = wave[0];

				this._waveIsReady = true;
			}
			return this._wave;
		}
	}

	export class Instrument {
		public type: InstrumentType = InstrumentType.chip;
		public preset: number = 0;
		public chipWave: number = 2;
		public chipNoise: number = 1;
		public filterCutoff: number = 12;
		public filterResonance: number = 0;
		public filterEnvelope: number = 1;
		public transition: number = 1;
		public vibrato: number = 0;
		public interval: number = 0;
		public effects: number = 0;
		public chord: number = 1;
		public volume: number = 0;
		public pan: number = Config.panCenter;
		public detune: number = 0;
		public pulseWidth: number = Config.pulseWidthRange;
		public pulseEnvelope: number = 1;
		public algorithm: number = 0;
		public feedbackType: number = 0;
		public feedbackAmplitude: number = 0;
		public feedbackEnvelope: number = 1;
		public customChipWave: Float64Array = new Float64Array(64);
		public customChipWaveIntegral: Float64Array = new Float64Array(65); // One extra element for wrap-around in chipSynth.
		public readonly operators: Operator[] = [];
		public readonly spectrumWave: SpectrumWave;
		public readonly harmonicsWave: HarmonicsWave = new HarmonicsWave();
		public readonly drumsetEnvelopes: number[] = [];
		public readonly drumsetSpectrumWaves: SpectrumWave[] = [];
		public modChannels: number[] = [];
		public modStatuses: ModStatus[] = [];
		public modInstruments: number[] = [];
		public modSettings: ModSetting[] = [];

		constructor(isNoiseChannel: boolean, isModChannel: boolean) {

			if (isModChannel) {
				for (let mod: number = 0; mod < Config.modCount; mod++) {
					this.modChannels.push(0);
					this.modStatuses.push(ModStatus.msNone);
					this.modInstruments.push(0);
					this.modSettings.push(ModSetting.mstNone);
				}
			}

			this.spectrumWave = new SpectrumWave(isNoiseChannel);
			for (let i: number = 0; i < Config.operatorCount; i++) {
				this.operators[i] = new Operator(i);
			}
			for (let i: number = 0; i < Config.drumCount; i++) {
				this.drumsetEnvelopes[i] = Config.envelopes.dictionary["twang 2"].index;
				this.drumsetSpectrumWaves[i] = new SpectrumWave(true);
			}

			for (let i = 0; i < 64; i++) {
				this.customChipWave[i] = 24 - Math.floor(i * (48 / 64));
			}

			let sum: number = 0.0;
			for (let i: number = 0; i < this.customChipWave.length; i++) {
				sum += this.customChipWave[i];
			}
			const average: number = sum / this.customChipWave.length;

			// Perform the integral on the wave. The chipSynth will perform the derivative to get the original wave back but with antialiasing.
			let cumulative: number = 0;
			let wavePrev: number = 0;
			for (let i: number = 0; i < this.customChipWave.length; i++) {
				cumulative += wavePrev;
				wavePrev = this.customChipWave[i] - average;
				this.customChipWaveIntegral[i] = cumulative;
			}

			// 65th, last sample is for anti-aliasing
			this.customChipWaveIntegral[64] = 0.0;

		}

		public setTypeAndReset(type: InstrumentType, isNoiseChannel: boolean, isModChannel: boolean): void {
			// Mod channels are forced to one type.
			if (isModChannel) type = InstrumentType.mod;
			this.type = type;
			this.preset = type;
			this.volume = 0;
			this.pan = Config.panCenter;
			this.detune = 0;
			switch (type) {
				case InstrumentType.chip:
					this.chipWave = 2;
					this.filterCutoff = 6;
					this.filterResonance = 0;
					this.filterEnvelope = Config.envelopes.dictionary["steady"].index;
					this.transition = 1;
					this.vibrato = 0;
					this.interval = 0;
					this.effects = 1;
					this.chord = 2;
					break;
				case InstrumentType.customChipWave:
					this.chipWave = 2;
					this.filterCutoff = 6;
					this.filterResonance = 0;
					this.filterEnvelope = Config.envelopes.dictionary["steady"].index;
					this.transition = 1;
					this.vibrato = 0;
					this.interval = 0;
					this.effects = 1;
					this.chord = 2;
					for (let i: number = 0; i < 64; i++) {
						this.customChipWave[i] = 24 - (Math.floor(i * (48 / 64)));
					}

					let sum: number = 0.0;
					for (let i: number = 0; i < this.customChipWave.length; i++) {
						sum += this.customChipWave[i];
					}
					const average: number = sum / this.customChipWave.length;

					// Perform the integral on the wave. The chipSynth will perform the derivative to get the original wave back but with antialiasing.
					let cumulative: number = 0;
					let wavePrev: number = 0;
					for (let i: number = 0; i < this.customChipWave.length; i++) {
						cumulative += wavePrev;
						wavePrev = this.customChipWave[i] - average;
						this.customChipWaveIntegral[i] = cumulative;
					}

					this.customChipWaveIntegral[64] = 0.0;
					break;
				case InstrumentType.fm:
					this.transition = 1;
					this.vibrato = 0;
					this.effects = 1;
					this.chord = 3;
					this.filterCutoff = 10;
					this.filterResonance = 0;
					this.filterEnvelope = 1;
					this.algorithm = 0;
					this.feedbackType = 0;
					this.feedbackAmplitude = 0;
					this.feedbackEnvelope = Config.envelopes.dictionary["steady"].index;
					for (let i: number = 0; i < this.operators.length; i++) {
						this.operators[i].reset(i);
					}
					break;
				case InstrumentType.noise:
					this.chipNoise = 1;
					this.transition = 1;
					this.effects = 0;
					this.chord = 2;
					this.filterCutoff = 10;
					this.filterResonance = 0;
					this.filterEnvelope = Config.envelopes.dictionary["steady"].index;
					break;
				case InstrumentType.spectrum:
					this.transition = 1;
					this.effects = 1;
					this.chord = 0;
					this.filterCutoff = 10;
					this.filterResonance = 0;
					this.filterEnvelope = Config.envelopes.dictionary["steady"].index;
					this.spectrumWave.reset(isNoiseChannel);
					break;
				case InstrumentType.drumset:
					this.effects = 0;
					for (let i: number = 0; i < Config.drumCount; i++) {
						this.drumsetEnvelopes[i] = Config.envelopes.dictionary["twang 2"].index;
						if (this.drumsetSpectrumWaves[i] == undefined) {
							this.drumsetSpectrumWaves[i] = new SpectrumWave(true);
						}
						this.drumsetSpectrumWaves[i].reset(isNoiseChannel);
					}
					break;
				case InstrumentType.harmonics:
					this.filterCutoff = 10;
					this.filterResonance = 0;
					this.filterEnvelope = Config.envelopes.dictionary["steady"].index;
					this.transition = 1;
					this.vibrato = 0;
					this.interval = 0;
					this.effects = 1;
					this.chord = 0;
					this.harmonicsWave.reset();
					break;
				case InstrumentType.pwm:
					this.filterCutoff = 10;
					this.filterResonance = 0;
					this.filterEnvelope = Config.envelopes.dictionary["steady"].index;
					this.transition = 1;
					this.vibrato = 0;
					this.interval = 0;
					this.effects = 1;
					this.chord = 2;
					this.pulseWidth = Config.pulseWidthRange;
					this.pulseEnvelope = Config.envelopes.dictionary["twang 2"].index;
					break;
				case InstrumentType.mod:
					this.transition = 0;
					this.vibrato = 0;
					this.interval = 0;
					this.effects = 0;
					this.chord = 0;
					this.modChannels = [];
					this.modStatuses = [];
					this.modInstruments = [];
					this.modSettings = [];
					for (let mod: number = 0; mod < Config.modCount; mod++) {
						this.modChannels.push(0);
						this.modStatuses.push(ModStatus.msNone);
						this.modInstruments.push(0);
						this.modSettings.push(ModSetting.mstNone);
					}
					break;
				default:
					throw new Error("Unrecognized instrument type: " + type);
			}
		}

		public toJsonObject(): Object {
			const instrumentObject: any = {
				"type": Config.instrumentTypeNames[this.type],
				"volume": this.volume,
				"pan": (this.pan - Config.panCenter) * 100 / Config.panCenter,
				"detune": this.detune,
				"effects": Config.effectsNames[this.effects],
			};

			if (this.preset != this.type) {
				instrumentObject["preset"] = this.preset;
			}

			if (this.type != InstrumentType.drumset) {
				instrumentObject["transition"] = Config.transitions[this.transition].name;
				instrumentObject["chord"] = this.getChord().name;
				instrumentObject["filterCutoffHz"] = Math.round(Config.filterCutoffMaxHz * Math.pow(2.0, this.getFilterCutoffOctaves()));
				instrumentObject["filterResonance"] = Math.round(100 * this.filterResonance / (Config.filterResonanceRange - 1));
				instrumentObject["filterEnvelope"] = this.getFilterEnvelope().name;
			}

			if (this.type == InstrumentType.noise) {
				instrumentObject["wave"] = Config.chipNoises[this.chipNoise].name;
			} else if (this.type == InstrumentType.spectrum) {
				instrumentObject["spectrum"] = [];
				for (let i: number = 0; i < Config.spectrumControlPoints; i++) {
					instrumentObject["spectrum"][i] = Math.round(100 * this.spectrumWave.spectrum[i] / Config.spectrumMax);
				}
			} else if (this.type == InstrumentType.drumset) {
				instrumentObject["drums"] = [];
				for (let j: number = 0; j < Config.drumCount; j++) {
					const spectrum: number[] = [];
					for (let i: number = 0; i < Config.spectrumControlPoints; i++) {
						spectrum[i] = Math.round(100 * this.drumsetSpectrumWaves[j].spectrum[i] / Config.spectrumMax);
					}
					instrumentObject["drums"][j] = {
						"filterEnvelope": this.getDrumsetEnvelope(j).name,
						"spectrum": spectrum,
					};
				}
			} else if (this.type == InstrumentType.chip) {
				instrumentObject["wave"] = Config.chipWaves[this.chipWave].name;
				instrumentObject["interval"] = Config.intervals[this.interval].name;
				instrumentObject["vibrato"] = Config.vibratos[this.vibrato].name;
			} else if (this.type == InstrumentType.customChipWave) {
				instrumentObject["wave"] = Config.chipWaves[this.chipWave].name;
				instrumentObject["interval"] = Config.intervals[this.interval].name;
				instrumentObject["vibrato"] = Config.vibratos[this.vibrato].name;
				instrumentObject["customChipWave"] = new Float64Array(64);
				instrumentObject["customChipWaveIntegral"] = new Float64Array(65);
				for (let i: number = 0; i < this.customChipWave.length; i++) {
					instrumentObject["customChipWave"][i] = this.customChipWave[i];
					// Meh, waste of space and can be inaccurate. It will be recalc'ed when instrument loads.
					//instrumentObject["customChipWaveIntegral"][i] = this.customChipWaveIntegral[i];
				}

				instrumentObject["customChipWaveIntegral"][64] = 0;
			} else if (this.type == InstrumentType.pwm) {
				instrumentObject["pulseWidth"] = this.pulseWidth;
				instrumentObject["pulseEnvelope"] = Config.envelopes[this.pulseEnvelope].name;
				instrumentObject["vibrato"] = Config.vibratos[this.vibrato].name;
			} else if (this.type == InstrumentType.harmonics) {
				instrumentObject["interval"] = Config.intervals[this.interval].name;
				instrumentObject["vibrato"] = Config.vibratos[this.vibrato].name;
				instrumentObject["harmonics"] = [];
				for (let i: number = 0; i < Config.harmonicsControlPoints; i++) {
					instrumentObject["harmonics"][i] = Math.round(100 * this.harmonicsWave.harmonics[i] / Config.harmonicsMax);
				}
			} else if (this.type == InstrumentType.fm) {
				const operatorArray: Object[] = [];
				for (const operator of this.operators) {
					operatorArray.push({
						"frequency": Config.operatorFrequencies[operator.frequency].name,
						"amplitude": operator.amplitude,
						"envelope": Config.envelopes[operator.envelope].name,
					});
				}
				instrumentObject["vibrato"] = Config.vibratos[this.vibrato].name;
				instrumentObject["algorithm"] = Config.algorithms[this.algorithm].name;
				instrumentObject["feedbackType"] = Config.feedbacks[this.feedbackType].name;
				instrumentObject["feedbackAmplitude"] = this.feedbackAmplitude;
				instrumentObject["feedbackEnvelope"] = Config.envelopes[this.feedbackEnvelope].name;
				instrumentObject["operators"] = operatorArray;
			} else if (this.type == InstrumentType.mod) {
				instrumentObject["modChannels"] = [];
				instrumentObject["modInstruments"] = [];
				instrumentObject["modSettings"] = [];
				instrumentObject["modStatuses"] = [];
				for (let mod: number = 0; mod < Config.modCount; mod++) {
					instrumentObject["modChannels"][mod] = this.modChannels[mod];
					instrumentObject["modInstruments"][mod] = this.modInstruments[mod];
					instrumentObject["modSettings"][mod] = this.modSettings[mod];
					instrumentObject["modStatuses"][mod] = this.modStatuses[mod];
				}
			} else {
				throw new Error("Unrecognized instrument type");
			}
			return instrumentObject;
		}

		public fromJsonObject(instrumentObject: any, isNoiseChannel: boolean, isModChannel: boolean): void {
			if (instrumentObject == undefined) instrumentObject = {};

			let type: InstrumentType = Config.instrumentTypeNames.indexOf(instrumentObject["type"]);
			if (type == -1) type = isModChannel ? InstrumentType.mod : (isNoiseChannel ? InstrumentType.noise : InstrumentType.chip);
			this.setTypeAndReset(type, isNoiseChannel, isModChannel);

			if (instrumentObject["preset"] != undefined) {
				this.preset = instrumentObject["preset"] >>> 0;
			}

			if (instrumentObject["volume"] != undefined) {
				this.volume = clamp(-Config.volumeRange / 2, Config.volumeRange / 2, instrumentObject["volume"] | 0);
			} else {
				this.volume = 0;
			}

			if (instrumentObject["pan"] != undefined) {
				this.pan = clamp(0, Config.panMax + 1, Math.round(Config.panCenter + (instrumentObject["pan"] | 0) * Config.panCenter / 100));
			} else {
				this.pan = Config.panCenter;
			}

			if (instrumentObject["detune"] != undefined) {
				this.detune = clamp(Config.detuneMin, Config.detuneMax + 1, (instrumentObject["detune"] | 0));
			}
			else {
				this.detune = 0;
			}

			const oldTransitionNames: Dictionary<number> = { "binary": 0, "sudden": 1, "smooth": 2 };
			const transitionObject = instrumentObject["transition"] || instrumentObject["envelope"]; // the transition property used to be called envelope, so try that too.
			this.transition = oldTransitionNames[transitionObject] != undefined ? oldTransitionNames[transitionObject] : Config.transitions.findIndex(transition => transition.name == transitionObject);
			if (this.transition == -1) this.transition = 1;

			this.effects = Config.effectsNames.indexOf(instrumentObject["effects"]);
			if (this.effects == -1) this.effects = (this.type == InstrumentType.noise) ? 0 : 1;

			if (instrumentObject["filterCutoffHz"] != undefined) {
				this.filterCutoff = clamp(0, Config.filterCutoffRange, Math.round((Config.filterCutoffRange - 1) + 2.0 * Math.log((instrumentObject["filterCutoffHz"] | 0) / Config.filterCutoffMaxHz) / Math.LN2));
			} else {
				this.filterCutoff = (this.type == InstrumentType.chip) ? 6 : 10;
			}
			if (instrumentObject["filterResonance"] != undefined) {
				this.filterResonance = clamp(0, Config.filterResonanceRange, Math.round((Config.filterResonanceRange - 1) * (instrumentObject["filterResonance"] | 0) / 100));
			} else {
				this.filterResonance = 0;
			}
			this.filterEnvelope = Config.envelopes.findIndex(envelope => envelope.name == instrumentObject["filterEnvelope"]);
			if (this.filterEnvelope == -1) this.filterEnvelope = Config.envelopes.dictionary["steady"].index;

			if (instrumentObject["filter"] != undefined) {
				const legacyToCutoff: number[] = [20, 12, 6, 0, 16, 10, 4];
				const legacyToEnvelope: number[] = [1, 1, 1, 1, 18, 19, 20];
				const filterNames: string[] = ["none", "bright", "medium", "soft", "decay bright", "decay medium", "decay soft"];
				const oldFilterNames: Dictionary<number> = { "sustain sharp": 1, "sustain medium": 2, "sustain soft": 3, "decay sharp": 4 };
				let legacyFilter: number = oldFilterNames[instrumentObject["filter"]] != undefined ? oldFilterNames[instrumentObject["filter"]] : filterNames.indexOf(instrumentObject["filter"]);
				if (legacyFilter == -1) legacyFilter = 0;
				this.filterCutoff = legacyToCutoff[legacyFilter];
				this.filterEnvelope = legacyToEnvelope[legacyFilter];
				this.filterResonance = 0;
			}

			const legacyEffectNames: ReadonlyArray<string> = ["none", "vibrato light", "vibrato delayed", "vibrato heavy"];
			if (this.type == InstrumentType.noise) {
				this.chipNoise = Config.chipNoises.findIndex(wave => wave.name == instrumentObject["wave"]);
				if (this.chipNoise == -1) this.chipNoise = 1;

				this.chord = Config.chords.findIndex(chord => chord.name == instrumentObject["chord"]);
				if (this.chord == -1) this.chord = 2;

			} else if (this.type == InstrumentType.spectrum) {
				if (instrumentObject["spectrum"] != undefined) {
					for (let i: number = 0; i < Config.spectrumControlPoints; i++) {
						this.spectrumWave.spectrum[i] = Math.max(0, Math.min(Config.spectrumMax, Math.round(Config.spectrumMax * (+instrumentObject["spectrum"][i]) / 100)));
					}
				}

				this.chord = Config.chords.findIndex(chord => chord.name == instrumentObject["chord"]);
				if (this.chord == -1) this.chord = 0;

			} else if (this.type == InstrumentType.drumset) {
				if (instrumentObject["drums"] != undefined) {
					for (let j: number = 0; j < Config.drumCount; j++) {
						const drum: any = instrumentObject["drums"][j];
						if (drum == undefined) continue;

						if (drum["filterEnvelope"] != undefined) {
							this.drumsetEnvelopes[j] = Config.envelopes.findIndex(envelope => envelope.name == drum["filterEnvelope"]);
							if (this.drumsetEnvelopes[j] == -1) this.drumsetEnvelopes[j] = Config.envelopes.dictionary["twang 2"].index;
						}
						if (drum["spectrum"] != undefined) {
							for (let i: number = 0; i < Config.spectrumControlPoints; i++) {
								this.drumsetSpectrumWaves[j].spectrum[i] = Math.max(0, Math.min(Config.spectrumMax, Math.round(Config.spectrumMax * (+drum["spectrum"][i]) / 100)));
							}
						}
					}
				}
			} else if (this.type == InstrumentType.harmonics) {
				if (instrumentObject["harmonics"] != undefined) {
					for (let i: number = 0; i < Config.harmonicsControlPoints; i++) {
						this.harmonicsWave.harmonics[i] = Math.max(0, Math.min(Config.harmonicsMax, Math.round(Config.harmonicsMax * (+instrumentObject["harmonics"][i]) / 100)));
					}
				}

				if (instrumentObject["interval"] != undefined) {
					this.interval = Config.intervals.findIndex(interval => interval.name == instrumentObject["interval"]);
					if (this.interval == -1) this.interval = 0;
				}

				if (instrumentObject["vibrato"] != undefined) {
					this.vibrato = Config.vibratos.findIndex(vibrato => vibrato.name == instrumentObject["vibrato"]);
					if (this.vibrato == -1) this.vibrato = 0;
				}

				this.chord = Config.chords.findIndex(chord => chord.name == instrumentObject["chord"]);
				if (this.chord == -1) this.chord = 0;
			} else if (this.type == InstrumentType.pwm) {
				if (instrumentObject["pulseWidth"] != undefined) {
					this.pulseWidth = clamp(0, Config.pulseWidthRange + 1, instrumentObject["pulseWidth"]);
				} else {
					this.pulseWidth = Config.pulseWidthRange;
				}

				if (instrumentObject["pulseEnvelope"] != undefined) {
					this.pulseEnvelope = Config.envelopes.findIndex(envelope => envelope.name == instrumentObject["pulseEnvelope"]);
					if (this.pulseEnvelope == -1) this.pulseEnvelope = Config.envelopes.dictionary["steady"].index;
				}

				if (instrumentObject["vibrato"] != undefined) {
					this.vibrato = Config.vibratos.findIndex(vibrato => vibrato.name == instrumentObject["vibrato"]);
					if (this.vibrato == -1) this.vibrato = 0;
				}

				this.chord = Config.chords.findIndex(chord => chord.name == instrumentObject["chord"]);
				if (this.chord == -1) this.chord = 0;
			} else if (this.type == InstrumentType.chip) {
				const legacyWaveNames: Dictionary<number> = { "triangle": 1, "square": 2, "pulse wide": 3, "pulse narrow": 4, "sawtooth": 5, "double saw": 6, "double pulse": 7, "spiky": 8, "plateau": 0 };
				this.chipWave = legacyWaveNames[instrumentObject["wave"]] != undefined ? legacyWaveNames[instrumentObject["wave"]] : Config.chipWaves.findIndex(wave => wave.name == instrumentObject["wave"]);
				if (this.chipWave == -1) this.chipWave = 1;

				if (instrumentObject["interval"] != undefined) {
					this.interval = Config.intervals.findIndex(interval => interval.name == instrumentObject["interval"]);
					if (this.interval == -1) this.interval = 0;
				} else if (instrumentObject["chorus"] != undefined) {
					const legacyChorusNames: Dictionary<number> = { "fifths": 5, "octaves": 6 };
					this.interval = legacyChorusNames[instrumentObject["chorus"]] != undefined ? legacyChorusNames[instrumentObject["chorus"]] : Config.intervals.findIndex(interval => interval.name == instrumentObject["chorus"]);
					if (this.interval == -1) this.interval = 0;
				}

				if (instrumentObject["vibrato"] != undefined) {
					this.vibrato = Config.vibratos.findIndex(vibrato => vibrato.name == instrumentObject["vibrato"]);
					if (this.vibrato == -1) this.vibrato = 0;
				} else if (instrumentObject["effect"] != undefined) {
					this.vibrato = legacyEffectNames.indexOf(instrumentObject["effect"]);
					if (this.vibrato == -1) this.vibrato = 0;
				}

				this.chord = Config.chords.findIndex(chord => chord.name == instrumentObject["chord"]);
				if (this.chord == -1) this.chord = 2;

				// The original chorus setting had an option that now maps to two different settings. Override those if necessary.
				if (instrumentObject["chorus"] == "custom harmony") {
					this.interval = 2;
					this.chord = 3;
				}
			} else if (this.type == InstrumentType.fm) {
				if (instrumentObject["vibrato"] != undefined) {
					this.vibrato = Config.vibratos.findIndex(vibrato => vibrato.name == instrumentObject["vibrato"]);
					if (this.vibrato == -1) this.vibrato = 0;
				} else if (instrumentObject["effect"] != undefined) {
					this.vibrato = legacyEffectNames.indexOf(instrumentObject["effect"]);
					if (this.vibrato == -1) this.vibrato = 0;
				}

				this.chord = Config.chords.findIndex(chord => chord.name == instrumentObject["chord"]);
				if (this.chord == -1) this.chord = 3;

				this.algorithm = Config.algorithms.findIndex(algorithm => algorithm.name == instrumentObject["algorithm"]);
				if (this.algorithm == -1) this.algorithm = 0;
				this.feedbackType = Config.feedbacks.findIndex(feedback => feedback.name == instrumentObject["feedbackType"]);
				if (this.feedbackType == -1) this.feedbackType = 0;
				if (instrumentObject["feedbackAmplitude"] != undefined) {
					this.feedbackAmplitude = clamp(0, Config.operatorAmplitudeMax + 1, instrumentObject["feedbackAmplitude"] | 0);
				} else {
					this.feedbackAmplitude = 0;
				}

				const legacyEnvelopeNames: Dictionary<number> = { "pluck 1": 6, "pluck 2": 7, "pluck 3": 8 };
				this.feedbackEnvelope = legacyEnvelopeNames[instrumentObject["feedbackEnvelope"]] != undefined ? legacyEnvelopeNames[instrumentObject["feedbackEnvelope"]] : Config.envelopes.findIndex(envelope => envelope.name == instrumentObject["feedbackEnvelope"]);
				if (this.feedbackEnvelope == -1) this.feedbackEnvelope = 0;

				for (let j: number = 0; j < Config.operatorCount; j++) {
					const operator: Operator = this.operators[j];
					let operatorObject: any = undefined;
					if (instrumentObject["operators"]) operatorObject = instrumentObject["operators"][j];
					if (operatorObject == undefined) operatorObject = {};

					operator.frequency = Config.operatorFrequencies.findIndex(freq => freq.name == operatorObject["frequency"]);
					if (operator.frequency == -1) operator.frequency = 0;
					if (operatorObject["amplitude"] != undefined) {
						operator.amplitude = clamp(0, Config.operatorAmplitudeMax + 1, operatorObject["amplitude"] | 0);
					} else {
						operator.amplitude = 0;
					}
					operator.envelope = legacyEnvelopeNames[operatorObject["envelope"]] != undefined ? legacyEnvelopeNames[operatorObject["envelope"]] : Config.envelopes.findIndex(envelope => envelope.name == operatorObject["envelope"]);
					if (operator.envelope == -1) operator.envelope = 0;
				}
			} else if (this.type == InstrumentType.customChipWave) {
				if (instrumentObject["interval"] != undefined) {
					this.interval = Config.intervals.findIndex(interval => interval.name == instrumentObject["interval"]);
					if (this.interval == -1) this.interval = 0;
				} else if (instrumentObject["chorus"] != undefined) {
					const legacyChorusNames: Dictionary<number> = { "fifths": 5, "octaves": 6 };
					this.interval = legacyChorusNames[instrumentObject["chorus"]] != undefined ? legacyChorusNames[instrumentObject["chorus"]] : Config.intervals.findIndex(interval => interval.name == instrumentObject["chorus"]);
					if (this.interval == -1) this.interval = 0;
				}

				if (instrumentObject["vibrato"] != undefined) {
					this.vibrato = Config.vibratos.findIndex(vibrato => vibrato.name == instrumentObject["vibrato"]);
					if (this.vibrato == -1) this.vibrato = 0;
				} else if (instrumentObject["effect"] != undefined) {
					this.vibrato = legacyEffectNames.indexOf(instrumentObject["effect"]);
					if (this.vibrato == -1) this.vibrato = 0;
				}

				this.chord = Config.chords.findIndex(chord => chord.name == instrumentObject["chord"]);
				if (this.chord == -1) this.chord = 2;

				// The original chorus setting had an option that now maps to two different settings. Override those if necessary.
				if (instrumentObject["chorus"] == "custom harmony") {
					this.interval = 2;
					this.chord = 3;
				}

				if (instrumentObject["customChipWave"]) {

					for (let i: number = 0; i < 64; i++) {
						this.customChipWave[i] = instrumentObject["customChipWave"][i];
					}


					let sum: number = 0.0;
					for (let i: number = 0; i < this.customChipWave.length; i++) {
						sum += this.customChipWave[i];
					}
					const average: number = sum / this.customChipWave.length;

					// Perform the integral on the wave. The chipSynth will perform the derivative to get the original wave back but with antialiasing.
					let cumulative: number = 0;
					let wavePrev: number = 0;
					for (let i: number = 0; i < this.customChipWave.length; i++) {
						cumulative += wavePrev;
						wavePrev = this.customChipWave[i] - average;
						this.customChipWaveIntegral[i] = cumulative;
					}

					// 65th, last sample is for anti-aliasing
					this.customChipWaveIntegral[64] = 0.0;
				}

			} else if (this.type == InstrumentType.mod) {
				if (instrumentObject["modChannels"] != undefined) {
					for (let mod: number = 0; mod < Config.modCount; mod++) {
						this.modChannels[mod] = instrumentObject["modChannels"][mod];
						this.modInstruments[mod] = instrumentObject["modInstruments"][mod];
						this.modSettings[mod] = instrumentObject["modSettings"][mod];
						this.modStatuses[mod] = instrumentObject["modStatuses"][mod];
					}
				}
			} else {
				throw new Error("Unrecognized instrument type.");
			}
		}

		public static frequencyFromPitch(pitch: number): number {
			return 440.0 * Math.pow(2.0, (pitch - 69.0) / 12.0);
		}

		public static drumsetIndexReferenceDelta(index: number): number {
			return Instrument.frequencyFromPitch(Config.spectrumBasePitch + index * 6) / 44100;
		}

		private static _drumsetIndexToSpectrumOctave(index: number) {
			return 15 + Math.log(Instrument.drumsetIndexReferenceDelta(index)) / Math.LN2;
		}

		public warmUp(): void {
			if (this.type == InstrumentType.noise) {
				getDrumWave(this.chipNoise);
			} else if (this.type == InstrumentType.harmonics) {
				this.harmonicsWave.getCustomWave();
			} else if (this.type == InstrumentType.spectrum) {
				this.spectrumWave.getCustomWave(8);
			} else if (this.type == InstrumentType.drumset) {
				for (let i: number = 0; i < Config.drumCount; i++) {
					this.drumsetSpectrumWaves[i].getCustomWave(Instrument._drumsetIndexToSpectrumOctave(i));
				}
			}
		}

		public getDrumWave(): Float32Array {
			if (this.type == InstrumentType.noise) {
				return getDrumWave(this.chipNoise);
			} else if (this.type == InstrumentType.spectrum) {
				return this.spectrumWave.getCustomWave(8);
			} else {
				throw new Error("Unhandled instrument type in getDrumWave");
			}
		}

		public getDrumsetWave(pitch: number): Float32Array {
			if (this.type == InstrumentType.drumset) {
				return this.drumsetSpectrumWaves[pitch].getCustomWave(Instrument._drumsetIndexToSpectrumOctave(pitch));
			} else {
				throw new Error("Unhandled instrument type in getDrumWave");
			}
		}

		public getTransition(): Transition {
			return this.type == InstrumentType.drumset ? Config.transitions.dictionary["hard fade"] : Config.transitions[this.transition];
		}
		public getChord(): Chord {
			return this.type == InstrumentType.drumset ? Config.chords.dictionary["harmony"] : Config.chords[this.chord];
		}
		public getFilterCutoffOctaves(): number {
			return this.type == InstrumentType.drumset ? 0 : (this.filterCutoff - (Config.filterCutoffRange - 1)) * 0.5;
		}
		public getFilterIsFirstOrder(): boolean {
			return this.type == InstrumentType.drumset ? false : this.filterResonance == 0;
		}
		public getFilterResonance(): number {
			return this.type == InstrumentType.drumset ? 1 : this.filterResonance;
		}
		public getFilterEnvelope(): Envelope {
			if (this.type == InstrumentType.drumset) throw new Error("Can't getFilterEnvelope() for drumset.");
			return Config.envelopes[this.filterEnvelope];
		}
		public getDrumsetEnvelope(pitch: number): Envelope {
			if (this.type != InstrumentType.drumset) throw new Error("Can't getDrumsetEnvelope() for non-drumset.");
			return Config.envelopes[this.drumsetEnvelopes[pitch]];
		}
	}

	export enum ModStatus {
		msForPitch = 0,
		msForNoise = 1,
		msForSong = 2,
		msNone = 3,
	}

	export enum ModSetting {
		mstNone = 0,
		mstSongVolume = 1,
		mstTempo = 2,
		mstReverb = 3,
		mstNextBar = 4,
		mstInsVolume = 5,
		mstPan = 6,
		mstFilterCut = 7,
		mstFilterPeak = 8,
		mstFMSlider1 = 9,
		mstFMSlider2 = 10,
		mstFMSlider3 = 11,
		mstFMSlider4 = 12,
		mstFMFeedback = 13,
		mstPulseWidth = 14,
		mstDetune = 15,
		mstMaxValue = 16,
	}

	export class Channel {
		public octave: number = 0;
		public readonly instruments: Instrument[] = [];
		public readonly patterns: Pattern[] = [];
		public readonly bars: number[] = [];
		public muted: boolean = false;
	}

	export class Song {
		private static readonly _format: string = "BeepBox";
		private static readonly _oldestBeepboxVersion: number = 2;
		private static readonly _latestBeepboxVersion: number = 8;
		private static readonly _oldestJummBoxVersion: number = 1;
		private static readonly _latestJummBoxVersion: number = 2;
		// One-character variant detection at the start of URL to distinguish variants such as JummBox.
		private static readonly _variant = 0x6A; //"j" ~ jummbox

		public title: string;
		public scale: number;
		public key: number;
		public tempo: number;
		public reverb: number;
		public beatsPerBar: number;
		public barCount: number;
		public patternsPerChannel: number;
		public rhythm: number;
		public instrumentsPerChannel: number;
		public loopStart: number;
		public loopLength: number;
		public pitchChannelCount: number;
		public noiseChannelCount: number;
		public modChannelCount: number;
		public readonly channels: Channel[] = [];

		public mstMaxVols: Map<ModSetting, number> = new Map<ModSetting, number>([
			[ModSetting.mstNone, 6],
			[ModSetting.mstSongVolume, 100],
			[ModSetting.mstTempo, Config.tempoMax - Config.tempoMin],
			[ModSetting.mstReverb, Config.reverbRange - 1],
			[ModSetting.mstNextBar, 1],
			[ModSetting.mstInsVolume, Config.volumeRange],
			[ModSetting.mstPan, Config.panMax],
			[ModSetting.mstFilterCut, Config.filterCutoffRange - 1],
			[ModSetting.mstFilterPeak, Config.filterResonanceRange - 1],
			[ModSetting.mstFMSlider1, 15],
			[ModSetting.mstFMSlider2, 15],
			[ModSetting.mstFMSlider3, 15],
			[ModSetting.mstFMSlider4, 15],
			[ModSetting.mstFMFeedback, 15],
			[ModSetting.mstPulseWidth, Config.pulseWidthRange],
			[ModSetting.mstDetune, Config.detuneMax - Config.detuneMin],
		]
		);

		constructor(string?: string) {
			if (string != undefined) {
				this.fromBase64String(string);
			} else {
				this.initToDefault(true);
			}
		}

		public modValueToReal(value: number, setting: ModSetting): number {
			switch (setting) {
				case ModSetting.mstTempo:
					value += Config.tempoMin;
					break;
				case ModSetting.mstInsVolume:
					value -= Config.volumeRange / 2.0;
					break;
				case ModSetting.mstDetune:
					value += Config.detuneMin;
					break;
				case ModSetting.mstFilterCut:
				case ModSetting.mstFilterPeak:
				case ModSetting.mstSongVolume:
				case ModSetting.mstPan:
				case ModSetting.mstReverb:
				case ModSetting.mstNextBar:
				case ModSetting.mstFMSlider1:
				case ModSetting.mstFMSlider2:
				case ModSetting.mstFMSlider3:
				case ModSetting.mstFMSlider4:
				case ModSetting.mstFMFeedback:
				case ModSetting.mstPulseWidth:
				case ModSetting.mstNone:
				default:
					break;
			}
			return value;
		}

		public isSettingForSong(setting: ModSetting): boolean {
			switch (setting) {
				case ModSetting.mstTempo:
				case ModSetting.mstReverb:
				case ModSetting.mstSongVolume:
				case ModSetting.mstNextBar:
					return true;
				default:
					return false;
			}
		}

		public realToModValue(value: number, setting: ModSetting): number {
			switch (setting) {
				case ModSetting.mstTempo:
					value -= Config.tempoMin;
					break;
				case ModSetting.mstInsVolume:
					value += Config.volumeRange / 2.0;
					break;
				case ModSetting.mstDetune:
					value -= Config.detuneMin;
					break;
				case ModSetting.mstFilterCut:
				case ModSetting.mstFilterPeak:
				case ModSetting.mstSongVolume:
				case ModSetting.mstPan:
				case ModSetting.mstReverb:
				case ModSetting.mstNextBar:
				case ModSetting.mstFMSlider1:
				case ModSetting.mstFMSlider2:
				case ModSetting.mstFMSlider3:
				case ModSetting.mstFMSlider4:
				case ModSetting.mstFMFeedback:
				case ModSetting.mstPulseWidth:
				case ModSetting.mstNone:
				default:
					break;
			}
			return value;
		}


		public getVolumeCap = (isMod: boolean, modChannel?: number, modInstrument?: number, modCount?: number): number => {
			if (!isMod || modChannel == undefined || modInstrument == undefined || modCount == undefined)
				return 6;
			else {
				// Sigh, the way pitches count up and the visual ordering in the UI are flipped.
				modCount = Config.modCount - modCount - 1;

				let cap: number | undefined = this.mstMaxVols.get(this.channels[modChannel].instruments[modInstrument].modSettings[modCount]);
				if (cap != undefined)
					return cap;
				else
					return 6;
			}
		}

		public getVolumeCapForSetting = (isMod: boolean, modSetting: ModSetting): number => {
			if (!isMod)
				return 6;
			else {
				let cap: number | undefined = this.mstMaxVols.get(modSetting);
				if (cap != undefined)
					return cap;
				else
					return 6;
			}
		}

		public getChannelCount(): number {
			return this.pitchChannelCount + this.noiseChannelCount + this.modChannelCount;
		}

		public getChannelIsNoise(channel: number): boolean {
			return (channel >= this.pitchChannelCount && channel < this.pitchChannelCount + this.noiseChannelCount);
		}

		public getChannelIsMod(channel: number): boolean {
			return (channel >= this.pitchChannelCount + this.noiseChannelCount);
		}

		public initToDefault(andResetChannels: boolean = true): void {
			this.scale = 0;
			this.key = 0;
			this.loopStart = 0;
			this.loopLength = 4;
			this.tempo = 150;
			this.reverb = 0;
			this.beatsPerBar = 8;
			this.barCount = 16;
			this.patternsPerChannel = 8;
			this.rhythm = 1;
			this.instrumentsPerChannel = 1;

			this.title = "Unnamed";
			document.title = Config.versionDisplayName;

			if (andResetChannels) {
				this.pitchChannelCount = 3;
				this.noiseChannelCount = 1;
				this.modChannelCount = 0;
				for (let channelIndex = 0; channelIndex < this.getChannelCount(); channelIndex++) {
					if (this.channels.length <= channelIndex) {
						this.channels[channelIndex] = new Channel();
					}
					const channel: Channel = this.channels[channelIndex];
					channel.octave = Math.max(3 - channelIndex, 0); // [3, 2, 1, 0, 0, ...]; Descending octaves with drums at zero in last channel and onward.

					for (let pattern = 0; pattern < this.patternsPerChannel; pattern++) {
						if (channel.patterns.length <= pattern) {
							channel.patterns[pattern] = new Pattern();
						} else {
							channel.patterns[pattern].reset();
						}
					}
					channel.patterns.length = this.patternsPerChannel;

					const isNoiseChannel: boolean = channelIndex >= this.pitchChannelCount && channelIndex < this.pitchChannelCount + this.noiseChannelCount;
					const isModChannel: boolean = channelIndex >= this.pitchChannelCount + this.noiseChannelCount;
					for (let instrument = 0; instrument < this.instrumentsPerChannel; instrument++) {
						if (channel.instruments.length <= instrument) {
							channel.instruments[instrument] = new Instrument(isNoiseChannel, isModChannel);
						}
						channel.instruments[instrument].setTypeAndReset(isModChannel ? InstrumentType.mod : (isNoiseChannel ? InstrumentType.noise : InstrumentType.chip), isNoiseChannel, isModChannel);
					}
					channel.instruments.length = this.instrumentsPerChannel;

					for (let bar = 0; bar < this.barCount; bar++) {
						channel.bars[bar] = bar < 4 ? 1 : 0;
					}
					channel.bars.length = this.barCount;
				}
				this.channels.length = this.getChannelCount();
			}
		}

		public toBase64String(): string {
			let bits: BitFieldWriter;
			let buffer: number[] = [];

			buffer.push(Song._variant);
			buffer.push(base64IntToCharCode[Song._latestJummBoxVersion]);

			buffer.push(SongTagCode.songTitle);

			// Length of the song name string
			var encodedSongTitle: string = encodeURIComponent(this.title);
			buffer.push(base64IntToCharCode[encodedSongTitle.length >> 6], base64IntToCharCode[encodedSongTitle.length & 0x3f]);

			// Actual encoded string follows
			for (let i: number = 0; i < encodedSongTitle.length; i++) {
				buffer.push(encodedSongTitle.charCodeAt(i));
			}

			buffer.push(SongTagCode.channelCount, base64IntToCharCode[this.pitchChannelCount], base64IntToCharCode[this.noiseChannelCount], base64IntToCharCode[this.modChannelCount]);
			buffer.push(SongTagCode.scale, base64IntToCharCode[this.scale]);
			buffer.push(SongTagCode.key, base64IntToCharCode[this.key]);
			buffer.push(SongTagCode.loopStart, base64IntToCharCode[this.loopStart >> 6], base64IntToCharCode[this.loopStart & 0x3f]);
			buffer.push(SongTagCode.loopEnd, base64IntToCharCode[(this.loopLength - 1) >> 6], base64IntToCharCode[(this.loopLength - 1) & 0x3f]);
			buffer.push(SongTagCode.tempo, base64IntToCharCode[this.tempo >> 6], base64IntToCharCode[this.tempo & 0x3F]);
			buffer.push(SongTagCode.reverb, base64IntToCharCode[this.reverb]);
			buffer.push(SongTagCode.beatCount, base64IntToCharCode[this.beatsPerBar - 1]);
			buffer.push(SongTagCode.barCount, base64IntToCharCode[(this.barCount - 1) >> 6], base64IntToCharCode[(this.barCount - 1) & 0x3f]);
			buffer.push(SongTagCode.patternCount, base64IntToCharCode[(this.patternsPerChannel - 1) >> 6], base64IntToCharCode[(this.patternsPerChannel - 1) & 0x3f]);
			buffer.push(SongTagCode.instrumentCount, base64IntToCharCode[this.instrumentsPerChannel - 1]);
			buffer.push(SongTagCode.rhythm, base64IntToCharCode[this.rhythm]);

			buffer.push(SongTagCode.channelOctave);
			for (let channel: number = 0; channel < this.getChannelCount(); channel++) {
				buffer.push(base64IntToCharCode[this.channels[channel].octave]);
			}

			for (let channel: number = 0; channel < this.getChannelCount(); channel++) {
				for (let i: number = 0; i < this.instrumentsPerChannel; i++) {
					const instrument: Instrument = this.channels[channel].instruments[i];
					buffer.push(SongTagCode.startInstrument, base64IntToCharCode[instrument.type]);
					buffer.push(SongTagCode.volume, base64IntToCharCode[(instrument.volume + Config.volumeRange / 2) >> 6], base64IntToCharCode[(instrument.volume + Config.volumeRange / 2) & 0x3f]);
					buffer.push(SongTagCode.panning, base64IntToCharCode[instrument.pan >> 6], base64IntToCharCode[instrument.pan & 0x3f]);
					buffer.push(SongTagCode.detune, base64IntToCharCode[(instrument.detune - Config.detuneMin) >> 6], base64IntToCharCode[(instrument.detune - Config.detuneMin) & 0x3f]);
					buffer.push(SongTagCode.preset, base64IntToCharCode[instrument.preset >> 6], base64IntToCharCode[instrument.preset & 63]);
					buffer.push(SongTagCode.effects, base64IntToCharCode[instrument.effects]);


					if (instrument.type != InstrumentType.drumset) {
						buffer.push(SongTagCode.transition, base64IntToCharCode[instrument.transition]);
						buffer.push(SongTagCode.filterCutoff, base64IntToCharCode[instrument.filterCutoff]);
						buffer.push(SongTagCode.filterResonance, base64IntToCharCode[instrument.filterResonance]);
						buffer.push(SongTagCode.filterEnvelope, base64IntToCharCode[instrument.filterEnvelope]);
						buffer.push(SongTagCode.chord, base64IntToCharCode[instrument.chord]);
					}

					if (instrument.type == InstrumentType.chip) {
						buffer.push(SongTagCode.wave, base64IntToCharCode[instrument.chipWave]);
						buffer.push(SongTagCode.vibrato, base64IntToCharCode[instrument.vibrato]);
						buffer.push(SongTagCode.interval, base64IntToCharCode[instrument.interval]);
					} else if (instrument.type == InstrumentType.fm) {
						buffer.push(SongTagCode.vibrato, base64IntToCharCode[instrument.vibrato]);
						buffer.push(SongTagCode.algorithm, base64IntToCharCode[instrument.algorithm]);
						buffer.push(SongTagCode.feedbackType, base64IntToCharCode[instrument.feedbackType]);
						buffer.push(SongTagCode.feedbackAmplitude, base64IntToCharCode[instrument.feedbackAmplitude]);
						buffer.push(SongTagCode.feedbackEnvelope, base64IntToCharCode[instrument.feedbackEnvelope]);

						buffer.push(SongTagCode.operatorFrequencies);
						for (let o: number = 0; o < Config.operatorCount; o++) {
							buffer.push(base64IntToCharCode[instrument.operators[o].frequency]);
						}
						buffer.push(SongTagCode.operatorAmplitudes);
						for (let o: number = 0; o < Config.operatorCount; o++) {
							buffer.push(base64IntToCharCode[instrument.operators[o].amplitude]);
						}
						buffer.push(SongTagCode.operatorEnvelopes);
						for (let o: number = 0; o < Config.operatorCount; o++) {
							buffer.push(base64IntToCharCode[instrument.operators[o].envelope]);
						}
					} else if (instrument.type == InstrumentType.customChipWave) {
						buffer.push(SongTagCode.wave, base64IntToCharCode[instrument.chipWave]);
						buffer.push(SongTagCode.vibrato, base64IntToCharCode[instrument.vibrato]);
						buffer.push(SongTagCode.interval, base64IntToCharCode[instrument.interval]);

						buffer.push(SongTagCode.customChipWave);
						// Push custom wave values
						for (let j: number = 0; j < 64; j++) {
							buffer.push(base64IntToCharCode[(instrument.customChipWave[j] + 24) as number]);
						}
					} else if (instrument.type == InstrumentType.noise) {
						buffer.push(SongTagCode.wave, base64IntToCharCode[instrument.chipNoise]);
					} else if (instrument.type == InstrumentType.spectrum) {
						buffer.push(SongTagCode.spectrum);
						const spectrumBits: BitFieldWriter = new BitFieldWriter();
						for (let i: number = 0; i < Config.spectrumControlPoints; i++) {
							spectrumBits.write(Config.spectrumControlPointBits, instrument.spectrumWave.spectrum[i]);
						}
						spectrumBits.encodeBase64(buffer);
					} else if (instrument.type == InstrumentType.drumset) {
						buffer.push(SongTagCode.filterEnvelope);
						for (let j: number = 0; j < Config.drumCount; j++) {
							buffer.push(base64IntToCharCode[instrument.drumsetEnvelopes[j]]);
						}

						buffer.push(SongTagCode.spectrum);
						const spectrumBits: BitFieldWriter = new BitFieldWriter();
						for (let j: number = 0; j < Config.drumCount; j++) {
							for (let i: number = 0; i < Config.spectrumControlPoints; i++) {
								spectrumBits.write(Config.spectrumControlPointBits, instrument.drumsetSpectrumWaves[j].spectrum[i]);
							}
						}
						spectrumBits.encodeBase64(buffer);
					} else if (instrument.type == InstrumentType.harmonics) {
						buffer.push(SongTagCode.vibrato, base64IntToCharCode[instrument.vibrato]);
						buffer.push(SongTagCode.interval, base64IntToCharCode[instrument.interval]);

						buffer.push(SongTagCode.harmonics);
						const harmonicsBits: BitFieldWriter = new BitFieldWriter();
						for (let i: number = 0; i < Config.harmonicsControlPoints; i++) {
							harmonicsBits.write(Config.harmonicsControlPointBits, instrument.harmonicsWave.harmonics[i]);
						}
						harmonicsBits.encodeBase64(buffer);
					} else if (instrument.type == InstrumentType.pwm) {
						buffer.push(SongTagCode.vibrato, base64IntToCharCode[instrument.vibrato]);
						buffer.push(SongTagCode.pulseWidth, base64IntToCharCode[instrument.pulseWidth], base64IntToCharCode[instrument.pulseEnvelope]);
					} else if (instrument.type == InstrumentType.mod) {
						// Handled down below. Could be moved, but meh.
					}
					else {
						throw new Error("Unknown instrument type.");
					}
				}
			}

			buffer.push(SongTagCode.bars);
			bits = new BitFieldWriter();
			let neededBits: number = 0;
			while ((1 << neededBits) < this.patternsPerChannel + 1) neededBits++;
			for (let channel: number = 0; channel < this.getChannelCount(); channel++) for (let i: number = 0; i < this.barCount; i++) {
				bits.write(neededBits, this.channels[channel].bars[i]);
			}
			bits.encodeBase64(buffer);

			buffer.push(SongTagCode.patterns);
			bits = new BitFieldWriter();
			const shapeBits: BitFieldWriter = new BitFieldWriter();
			let neededInstrumentBits: number = 0;
			while ((1 << neededInstrumentBits) < this.instrumentsPerChannel) neededInstrumentBits++;
			for (let channel: number = 0; channel < this.getChannelCount(); channel++) {

				const isNoiseChannel: boolean = this.getChannelIsNoise(channel);
				const isModChannel: boolean = this.getChannelIsMod(channel);

				// Some info about modulator settings immediately follows in mod channels.
				if (isModChannel) {
					for (let instrumentIndex: number = 0; instrumentIndex < this.instrumentsPerChannel; instrumentIndex++) {

						let instrument: Instrument = this.channels[channel].instruments[instrumentIndex];

						for (let mod: number = 0; mod < Config.modCount; mod++) {
							const modStatus: ModStatus = instrument.modStatuses[mod];
							const modChannel: number = instrument.modChannels[mod];
							const modInstrument: number = instrument.modInstruments[mod];
							const modSetting: number = instrument.modSettings[mod];

							bits.write(2, modStatus);

							// Channel/Instrument is only used if the status isn't "song" or "none".
							if (modStatus == ModStatus.msForPitch || modStatus == ModStatus.msForNoise) {
								bits.write(8, modChannel);
								bits.write(neededInstrumentBits, modInstrument);
							}

							// Mod setting is only used if the status isn't "none".
							if (modStatus != ModStatus.msNone) {
								bits.write(6, modSetting);
							}
						}
					}
				}

				const octaveOffset: number = (isNoiseChannel || isModChannel) ? 0 : this.channels[channel].octave * 12;
				let lastPitch: number = ((isNoiseChannel || isModChannel) ? 4 : 12) + octaveOffset;
				const recentPitches: number[] = isModChannel ? [0, 1, 2, 3, 4, 5] : (isNoiseChannel ? [4, 6, 7, 2, 3, 8, 0, 10] : [12, 19, 24, 31, 36, 7, 0]);
				const recentShapes: any[] = [];

				for (let i: number = 0; i < recentPitches.length; i++) {
					recentPitches[i] += octaveOffset;
				}
				for (const pattern of this.channels[channel].patterns) {
					bits.write(neededInstrumentBits, pattern.instrument);

					if (pattern.notes.length > 0) {
						bits.write(1, 1);

						let curPart: number = 0;
						for (const note of pattern.notes) {

							// For mod channels, a negative offset may be necessary.
							if (note.start < curPart && isModChannel) {
								bits.write(2, 0); // rest, then...
								bits.write(1, 1); // negative offset
								bits.writePartDuration(curPart - note.start);
							}

							if (note.start > curPart) {
								bits.write(2, 0); // rest, then...
								if (isModChannel) bits.write(1, 0); // positive offset, only needed for mod channels
								bits.writePartDuration(note.start - curPart);
							}
							
							shapeBits.clear();
							
							// 0: 1 pitch, 10: 2 pitches, 110: 3 pitches, 111: 4 pitches
							for (let i: number = 1; i < note.pitches.length; i++) shapeBits.write(1,1);
							if (note.pitches.length < Config.maxChordSize) shapeBits.write(1,0);
							
							shapeBits.writePinCount(note.pins.length - 1);

							if (!isModChannel) {
								shapeBits.write(3, note.pins[0].volume); // volume
							}
							else {
								shapeBits.write(9, note.pins[0].volume); // Modulator value. 9 bits for now = 512 max mod value?
							}

							let shapePart: number = 0;
							let startPitch: number = note.pitches[0];
							let currentPitch: number = startPitch;
							const pitchBends: number[] = [];
							for (let i: number = 1; i < note.pins.length; i++) {
								const pin: NotePin = note.pins[i];
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

								if (!isModChannel) {
									shapeBits.write(3, pin.volume); // volume
								}
								else {
									shapeBits.write(9, pin.volume); // Modulator value. 9 bits for now = 512 max mod value?
								}
							}

							const shapeString: string = String.fromCharCode.apply(null, shapeBits.encodeBase64([]));
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

							const allPitches: number[] = note.pitches.concat(pitchBends);
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

								if (i == note.pitches.length - 1) {
									lastPitch = note.pitches[0];
								} else {
									lastPitch = pitch;
								}
							}
							curPart = note.end;
						}

						if (curPart < this.beatsPerBar * Config.partsPerBeat + (+isModChannel)) {
							bits.write(2, 0); // rest, then...
							if (isModChannel) bits.write(1, 0); // positive offset
							bits.writePartDuration(this.beatsPerBar * Config.partsPerBeat + (+isModChannel) - curPart);
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
			bits.encodeBase64(buffer);

			const maxApplyArgs: number = 64000;
			if (buffer.length < maxApplyArgs) {
				// Note: Function.apply may break for long argument lists. 
				return String.fromCharCode.apply(null, buffer);
			} else {
				let result: string = "";
				for (let i: number = 0; i < buffer.length; i += maxApplyArgs) {
					result += String.fromCharCode.apply(null, buffer.slice(i, i + maxApplyArgs));
				}
				return result;
			}
		}

		public fromBase64String(compressed: string): void {
			if (compressed == null || compressed == "") {
				this.initToDefault(true);
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

			const variantTest: number = compressed.charCodeAt(charIndex);
			var variant: string = "";

			// Detect variant here. If version doesn't match known variant, assume it is a vanilla string which does not report variant.
			if (variantTest == 0x6A) { //"j"
				variant = "jummbox";
				charIndex++;
			}
			else {
				variant = "beepbox";
			}

			const version: number = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];

			if (variant == "beepbox" && (version == -1 || version > Song._latestBeepboxVersion || version < Song._oldestBeepboxVersion)) return;
			if (variant == "jummbox" && (version == -1 || version > Song._latestJummBoxVersion || version < Song._oldestJummBoxVersion)) return;

			const beforeTwo: boolean = version < 2;
			const beforeThree: boolean = version < 3;
			const beforeFour: boolean = version < 4;
			const beforeFive: boolean = version < 5;
			const beforeSix: boolean = version < 6;
			const beforeSeven: boolean = version < 7;
			const beforeEight: boolean = version < 8;
			this.initToDefault(variant == "beepbox" && beforeSix);

			if (beforeThree && variant == "beepbox") {
				// Originally, the only instrument transition was "seamless" and the only drum wave was "retro".
				for (const channel of this.channels) channel.instruments[0].transition = 0;
				this.channels[3].instruments[0].chipNoise = 0;
			}

			let instrumentChannelIterator: number = 0;
			let instrumentIndexIterator: number = -1;
			let toSetOctaves: number[] = [];

			while (charIndex < compressed.length) {
				const command: number = compressed.charCodeAt(charIndex++);
				let channel: number;
				if (command == SongTagCode.songTitle) {
					// Length of song name string
					var songNameLength = (base64CharCodeToInt[compressed.charCodeAt(charIndex++)] << 6) + base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
					this.title = decodeURIComponent(compressed.substring(charIndex, charIndex + songNameLength));
					document.title = this.title + " - " + Config.versionDisplayName;

					charIndex += songNameLength;
				} else if (command == SongTagCode.channelCount) {
					this.pitchChannelCount = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
					this.noiseChannelCount = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
					if (variant == "beepbox" || beforeTwo) {
						// No mod channel support before jummbox v2
						this.modChannelCount = 0;
					}
					else {
						this.modChannelCount = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
					}
					this.pitchChannelCount = clamp(Config.pitchChannelCountMin, Config.pitchChannelCountMax + 1, this.pitchChannelCount);
					this.noiseChannelCount = clamp(Config.noiseChannelCountMin, Config.noiseChannelCountMax + 1, this.noiseChannelCount);
					this.modChannelCount = clamp(Config.modChannelCountMin, Config.modChannelCountMax + 1, this.modChannelCount);
					for (let channelIndex = this.channels.length; channelIndex < this.getChannelCount(); channelIndex++) {
						this.channels[channelIndex] = new Channel();
					}
					this.channels.length = this.getChannelCount();
					ColorConfig.resetColors();
				} else if (command == SongTagCode.scale) {
					this.scale = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
					// All the scales were jumbled around by Jummbox. Just convert to free.
					if (variant == "beepbox") this.scale = 0;
				} else if (command == SongTagCode.key) {
					if (beforeSeven && variant == "beepbox") {
						this.key = clamp(0, Config.keys.length, 11 - base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
					} else {
						this.key = clamp(0, Config.keys.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
					}
				} else if (command == SongTagCode.loopStart) {
					if (beforeFive && variant == "beepbox") {
						this.loopStart = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
					} else {
						this.loopStart = (base64CharCodeToInt[compressed.charCodeAt(charIndex++)] << 6) + base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
					}
				} else if (command == SongTagCode.loopEnd) {
					if (beforeFive && variant == "beepbox") {
						this.loopLength = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
					} else {
						this.loopLength = (base64CharCodeToInt[compressed.charCodeAt(charIndex++)] << 6) + base64CharCodeToInt[compressed.charCodeAt(charIndex++)] + 1;
					}
				} else if (command == SongTagCode.tempo) {
					if (beforeFour && variant == "beepbox") {
						this.tempo = [95, 120, 151, 190][base64CharCodeToInt[compressed.charCodeAt(charIndex++)]];
					} else if (beforeSeven && variant == "beepbox") {
						this.tempo = [88, 95, 103, 111, 120, 130, 140, 151, 163, 176, 190, 206, 222, 240, 259][base64CharCodeToInt[compressed.charCodeAt(charIndex++)]];
					} else {
						this.tempo = (base64CharCodeToInt[compressed.charCodeAt(charIndex++)] << 6) | (base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
					}
					this.tempo = clamp(Config.tempoMin, Config.tempoMax + 1, this.tempo);
				} else if (command == SongTagCode.reverb) {
					if (variant == "beepbox") {
						this.reverb = base64CharCodeToInt[compressed.charCodeAt(charIndex++)] * 8;
						this.reverb = clamp(0, Config.reverbRange, this.reverb);
					}
					else {
						this.reverb = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
						this.reverb = clamp(0, Config.reverbRange, this.reverb);
					}
				} else if (command == SongTagCode.beatCount) {
					if (beforeThree && variant == "beepbox") {
						this.beatsPerBar = [6, 7, 8, 9, 10][base64CharCodeToInt[compressed.charCodeAt(charIndex++)]];
					} else {
						this.beatsPerBar = base64CharCodeToInt[compressed.charCodeAt(charIndex++)] + 1;
					}
					this.beatsPerBar = Math.max(Config.beatsPerBarMin, Math.min(Config.beatsPerBarMax, this.beatsPerBar));
				} else if (command == SongTagCode.barCount) {
					this.barCount = (base64CharCodeToInt[compressed.charCodeAt(charIndex++)] << 6) + base64CharCodeToInt[compressed.charCodeAt(charIndex++)] + 1;
					this.barCount = Math.max(Config.barCountMin, Math.min(Config.barCountMax, this.barCount));
					for (let channel = 0; channel < this.getChannelCount(); channel++) {
						for (let bar = this.channels[channel].bars.length; bar < this.barCount; bar++) {
							this.channels[channel].bars[bar] = (bar < 4) ? 1 : 0;
						}
						this.channels[channel].bars.length = this.barCount;
					}
				} else if (command == SongTagCode.patternCount) {
					if (variant == "beepbox" && beforeEight) {
						this.patternsPerChannel = base64CharCodeToInt[compressed.charCodeAt(charIndex++)] + 1;
					} else {
						this.patternsPerChannel = (base64CharCodeToInt[compressed.charCodeAt(charIndex++)] << 6) + base64CharCodeToInt[compressed.charCodeAt(charIndex++)] + 1;
					}
					this.patternsPerChannel = Math.max(1, Math.min(Config.barCountMax, this.patternsPerChannel));
					for (let channel = 0; channel < this.getChannelCount(); channel++) {
						for (let pattern = this.channels[channel].patterns.length; pattern < this.patternsPerChannel; pattern++) {
							this.channels[channel].patterns[pattern] = new Pattern();
						}
						this.channels[channel].patterns.length = this.patternsPerChannel;
					}
				} else if (command == SongTagCode.instrumentCount) {
					this.instrumentsPerChannel = base64CharCodeToInt[compressed.charCodeAt(charIndex++)] + 1;
					this.instrumentsPerChannel = Math.max(Config.instrumentsPerChannelMin, Math.min(Config.instrumentsPerChannelMax, this.instrumentsPerChannel));
					for (let channel = 0; channel < this.getChannelCount(); channel++) {
						const isNoiseChannel: boolean = channel >= this.pitchChannelCount && channel < this.pitchChannelCount + this.noiseChannelCount;
						const isModChannel: boolean = channel >= this.pitchChannelCount + this.noiseChannelCount;
						for (let instrumentIndex = this.channels[channel].instruments.length; instrumentIndex < this.instrumentsPerChannel; instrumentIndex++) {
							this.channels[channel].instruments[instrumentIndex] = new Instrument(isNoiseChannel, isModChannel);
						}
						this.channels[channel].instruments.length = this.instrumentsPerChannel;
						if (beforeSix && variant == "beepbox") {
							for (let instrumentIndex = 0; instrumentIndex < this.instrumentsPerChannel; instrumentIndex++) {
								this.channels[channel].instruments[instrumentIndex].setTypeAndReset(isNoiseChannel ? InstrumentType.noise : InstrumentType.chip, isNoiseChannel, isModChannel);
							}
						}
					}
				} else if (command == SongTagCode.rhythm) {
					this.rhythm = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
				} else if (command == SongTagCode.channelOctave) {
					if (beforeThree && variant == "beepbox") {
						channel = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
						// Set octave properly after note values are calculated, for now clamp it to the max possible window
						this.channels[channel].octave = clamp(0, Config.maxScrollableOctaves + 1, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
						toSetOctaves[channel] = clamp(0, Config.maxScrollableOctaves - (+(window.localStorage.getItem("extraOctaves") || "0")) + 1, this.channels[channel].octave);
					} else {
						for (channel = 0; channel < this.getChannelCount(); channel++) {
							// Set octave properly after note values are calculated, for now clamp it to the max possible window
							this.channels[channel].octave = clamp(0, Config.maxScrollableOctaves + 1, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
							toSetOctaves[channel] = clamp(0, Config.maxScrollableOctaves - (+(window.localStorage.getItem("extraOctaves") || "0")) + 1, this.channels[channel].octave);
						}
					}
				} else if (command == SongTagCode.startInstrument) {
					instrumentIndexIterator++;
					if (instrumentIndexIterator >= this.instrumentsPerChannel) {
						instrumentChannelIterator++;
						instrumentIndexIterator = 0;
					}
					const instrument: Instrument = this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator];
					const instrumentType: number = clamp(0, InstrumentType.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
					instrument.setTypeAndReset(instrumentType, instrumentChannelIterator >= this.pitchChannelCount && instrumentChannelIterator < this.pitchChannelCount + this.noiseChannelCount, instrumentChannelIterator >= this.pitchChannelCount + this.noiseChannelCount);
				} else if (command == SongTagCode.preset) {
					const presetValue: number = (base64CharCodeToInt[compressed.charCodeAt(charIndex++)] << 6) | (base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
					this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].preset = presetValue;
				} else if (command == SongTagCode.wave) {
					if (beforeThree && variant == "beepbox") {
						const legacyWaves: number[] = [1, 2, 3, 4, 5, 6, 7, 8, 0];
						channel = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
						this.channels[channel].instruments[0].chipWave = clamp(0, Config.chipWaves.length, legacyWaves[base64CharCodeToInt[compressed.charCodeAt(charIndex++)]] | 0);
					} else if (beforeSix && variant == "beepbox") {
						const legacyWaves: number[] = [1, 2, 3, 4, 5, 6, 7, 8, 0];
						for (channel = 0; channel < this.getChannelCount(); channel++) {
							for (let i: number = 0; i < this.instrumentsPerChannel; i++) {
								if (channel >= this.pitchChannelCount) {
									this.channels[channel].instruments[i].chipNoise = clamp(0, Config.chipNoises.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
								} else {
									this.channels[channel].instruments[i].chipWave = clamp(0, Config.chipWaves.length, legacyWaves[base64CharCodeToInt[compressed.charCodeAt(charIndex++)]] | 0);
								}
							}
						}
					} else if (beforeSeven && variant == "beepbox") {
						const legacyWaves: number[] = [1, 2, 3, 4, 5, 6, 7, 8, 0];
						if (instrumentChannelIterator >= this.pitchChannelCount) {
							this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].chipNoise = clamp(0, Config.chipNoises.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
						} else {
							this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].chipWave = clamp(0, Config.chipWaves.length, legacyWaves[base64CharCodeToInt[compressed.charCodeAt(charIndex++)]] | 0);
						}
					} else {
						if (instrumentChannelIterator >= this.pitchChannelCount) {
							this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].chipNoise = clamp(0, Config.chipNoises.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
						} else {
							this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].chipWave = clamp(0, Config.chipWaves.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
						}
					}
				} else if (command == SongTagCode.filterCutoff) {
					if (beforeSeven && variant == "beepbox") {
						const legacyToCutoff: number[] = [10, 6, 3, 0, 8, 5, 2];
						const legacyToEnvelope: number[] = [1, 1, 1, 1, 18, 19, 20];
						const filterNames: string[] = ["none", "bright", "medium", "soft", "decay bright", "decay medium", "decay soft"];

						if (beforeThree && variant == "beepbox") {
							channel = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
							const instrument: Instrument = this.channels[channel].instruments[0];
							const legacyFilter: number = [1, 3, 4, 5][clamp(0, filterNames.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)])];
							instrument.filterCutoff = legacyToCutoff[legacyFilter];
							instrument.filterEnvelope = legacyToEnvelope[legacyFilter];
							instrument.filterResonance = 0;
						} else if (beforeSix && variant == "beepbox") {
							for (channel = 0; channel < this.getChannelCount(); channel++) {
								for (let i: number = 0; i < this.instrumentsPerChannel; i++) {
									const instrument: Instrument = this.channels[channel].instruments[i];
									if (channel < this.pitchChannelCount) {
										const legacyFilter: number = clamp(0, filterNames.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)] + 1);
										instrument.filterCutoff = legacyToCutoff[legacyFilter];
										instrument.filterEnvelope = legacyToEnvelope[legacyFilter];
										instrument.filterResonance = 0;
									} else {
										instrument.filterCutoff = 10;
										instrument.filterEnvelope = 1;
										instrument.filterResonance = 0;
									}
								}
							}
						} else {
							const legacyFilter: number = clamp(0, filterNames.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
							const instrument: Instrument = this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator];
							instrument.filterCutoff = legacyToCutoff[legacyFilter];
							instrument.filterEnvelope = legacyToEnvelope[legacyFilter];
							instrument.filterResonance = 0;
						}
					} else {
						const instrument: Instrument = this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator];
						instrument.filterCutoff = clamp(0, Config.filterCutoffRange, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
					}
				} else if (command == SongTagCode.filterResonance) {
					this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].filterResonance = clamp(0, Config.filterResonanceRange, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
				} else if (command == SongTagCode.filterEnvelope) {
					const instrument: Instrument = this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator];
					if (instrument.type == InstrumentType.drumset) {
						for (let i: number = 0; i < Config.drumCount; i++) {
							instrument.drumsetEnvelopes[i] = clamp(0, Config.envelopes.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
						}
					} else {
						instrument.filterEnvelope = clamp(0, Config.envelopes.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
					}
				} else if (command == SongTagCode.pulseWidth) {
					if (variant == "beepbox") {
						// Convert back from beepbox's weird pulse width storage formula, rounding. The "7" in there is the old
						// piece of the formula "beepbox.Config.pulseWidthRange - 1".
						const instrument: Instrument = this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator];
						instrument.pulseWidth = Math.round(clamp(0, Config.pulseWidthRange + 1, Math.pow(0.5, (7 - base64CharCodeToInt[compressed.charCodeAt(charIndex++)]) * 0.5) * 50));
						instrument.pulseEnvelope = clamp(0, Config.envelopes.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
					}
					else {
						const instrument: Instrument = this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator];
						instrument.pulseWidth = clamp(0, Config.pulseWidthRange + 1, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
						instrument.pulseEnvelope = clamp(0, Config.envelopes.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
					}
				} else if (command == SongTagCode.transition) {
					if (beforeThree && variant == "beepbox") {
						channel = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
						this.channels[channel].instruments[0].transition = clamp(0, Config.transitions.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
					} else if (beforeSix && variant == "beepbox") {
						for (channel = 0; channel < this.getChannelCount(); channel++) {
							for (let i: number = 0; i < this.instrumentsPerChannel; i++) {
								this.channels[channel].instruments[i].transition = clamp(0, Config.transitions.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
							}
						}
					} else {
						this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].transition = clamp(0, Config.transitions.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
					}
				} else if (command == SongTagCode.vibrato) {
					if (beforeThree && variant == "beepbox") {
						const legacyEffects: number[] = [0, 3, 2, 0];
						const legacyEnvelopes: number[] = [1, 1, 1, 13];
						channel = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
						const effect: number = clamp(0, legacyEffects.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
						const instrument: Instrument = this.channels[channel].instruments[0];
						instrument.vibrato = legacyEffects[effect];
						instrument.filterEnvelope = (instrument.filterEnvelope == 1)
							? legacyEnvelopes[effect]
							: instrument.filterEnvelope;
					} else if (beforeSix && variant == "beepbox") {
						const legacyEffects: number[] = [0, 1, 2, 3, 0, 0];
						const legacyEnvelopes: number[] = [1, 1, 1, 1, 16, 13];
						for (channel = 0; channel < this.getChannelCount(); channel++) {
							for (let i: number = 0; i < this.instrumentsPerChannel; i++) {
								const effect: number = clamp(0, legacyEffects.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
								const instrument: Instrument = this.channels[channel].instruments[i];
								instrument.vibrato = legacyEffects[effect];
								instrument.filterEnvelope = (instrument.filterEnvelope == 1)
									? legacyEnvelopes[effect]
									: instrument.filterEnvelope;
							}
						}
					} else if (beforeSeven && variant == "beepbox") {
						const legacyEffects: number[] = [0, 1, 2, 3, 0, 0];
						const legacyEnvelopes: number[] = [1, 1, 1, 1, 16, 13];
						const effect: number = clamp(0, legacyEffects.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
						const instrument: Instrument = this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator];
						instrument.vibrato = legacyEffects[effect];
						instrument.filterEnvelope = (instrument.filterEnvelope == 1)
							? legacyEnvelopes[effect]
							: instrument.filterEnvelope;
					} else {
						const vibrato: number = clamp(0, Config.vibratos.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
						this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].vibrato = vibrato;
					}
				} else if (command == SongTagCode.interval) {
					if (beforeThree && variant == "beepbox") {
						channel = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
						this.channels[channel].instruments[0].interval = clamp(0, Config.intervals.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
					} else if (beforeSix && variant == "beepbox") {
						for (channel = 0; channel < this.getChannelCount(); channel++) {
							for (let i: number = 0; i < this.instrumentsPerChannel; i++) {
								const originalValue: number = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
								let interval: number = clamp(0, Config.intervals.length, originalValue);
								if (originalValue == 8) {
									// original "custom harmony" now maps to "hum" and "custom interval".
									interval = 2;
									this.channels[channel].instruments[i].chord = 3;
								}
								this.channels[channel].instruments[i].interval = interval;
							}
						}
					} else if (beforeSeven && variant == "beepbox") {
						const originalValue: number = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
						let interval: number = clamp(0, Config.intervals.length, originalValue);
						if (originalValue == 8) {
							// original "custom harmony" now maps to "hum" and "custom interval".
							interval = 2;
							this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].chord = 3;
						}
						this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].interval = interval;
					} else {
						this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].interval = clamp(0, Config.intervals.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
					}
				} else if (command == SongTagCode.chord) {
					this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].chord = clamp(0, Config.chords.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
				} else if (command == SongTagCode.effects) {
					this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].effects = clamp(0, Config.effectsNames.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
				} else if (command == SongTagCode.volume) {
					if (beforeThree && variant == "beepbox") {
						channel = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
						const instrument: Instrument = this.channels[channel].instruments[0];
						instrument.volume = Math.round(clamp(-Config.volumeRange, 1, -base64CharCodeToInt[compressed.charCodeAt(charIndex++)] * 5.0));
					} else if (beforeSix && variant == "beepbox") {
						for (channel = 0; channel < this.getChannelCount(); channel++) {
							for (let i: number = 0; i < this.instrumentsPerChannel; i++) {
								const instrument: Instrument = this.channels[channel].instruments[i];
								instrument.volume = Math.round(clamp(-Config.volumeRange, 1, -base64CharCodeToInt[compressed.charCodeAt(charIndex++)] * 5.0));
							}
						}
					} else if (beforeSeven && variant == "beepbox") {
						const instrument: Instrument = this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator];
						instrument.volume = Math.round(clamp(-Config.volumeRange, 1, -base64CharCodeToInt[compressed.charCodeAt(charIndex++)] * 5.0));
					} else if (variant == "beepbox") {
						const instrument: Instrument = this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator];
						// Beepbox v7's volume range is 0-7 (0 is max, 7 is mute)
						instrument.volume = Math.round(clamp(-Config.volumeRange / 2, 1, -base64CharCodeToInt[compressed.charCodeAt(charIndex++)] * 25.0 / 7.0));
					}
					else {
						const instrument: Instrument = this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator];
						// Volume is stored in two bytes in jummbox just in case range ever exceeds one byte, e.g. through later waffling on the subject.
						instrument.volume = Math.round(clamp(-Config.volumeRange / 2, Config.volumeRange / 2 + 1, ((base64CharCodeToInt[compressed.charCodeAt(charIndex++)] << 6) | (base64CharCodeToInt[compressed.charCodeAt(charIndex++)])) - Config.volumeRange / 2));
					}
				} else if (command == SongTagCode.panning) {
					const instrument: Instrument = this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator];

					if (variant == "beepbox") {
						// Beepbox has a panMax of 8 (9 total positions), Jummbox has a panMax of 100 (101 total positions)
						instrument.pan = clamp(0, Config.panMax + 1, Math.round(base64CharCodeToInt[compressed.charCodeAt(charIndex++)] * ((Config.panMax) / 8.0)));
					}
					else {
						instrument.pan = clamp(0, Config.panMax + 1, (base64CharCodeToInt[compressed.charCodeAt(charIndex++)] << 6) + base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
					}
				}
				else if (command == SongTagCode.detune) {
					const instrument: Instrument = this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator];

					instrument.detune = clamp(Config.detuneMin, Config.detuneMax + 1, ((base64CharCodeToInt[compressed.charCodeAt(charIndex++)] << 6) + base64CharCodeToInt[compressed.charCodeAt(charIndex++)]) + Config.detuneMin);
				}
				else if (command == SongTagCode.customChipWave) {
					let instrument: Instrument = this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator];
					// Pop custom wave values
					for (let j: number = 0; j < 64; j++) {
						instrument.customChipWave[j]
							= clamp(-24, 25, base64CharCodeToInt[compressed.charCodeAt(charIndex++)] - 24);
					}

					let sum: number = 0.0;
					for (let i: number = 0; i < instrument.customChipWave.length; i++) {
						sum += instrument.customChipWave[i];
					}
					const average: number = sum / instrument.customChipWave.length;

					// Perform the integral on the wave. The chipSynth will perform the derivative to get the original wave back but with antialiasing.
					let cumulative: number = 0;
					let wavePrev: number = 0;
					for (let i: number = 0; i < instrument.customChipWave.length; i++) {
						cumulative += wavePrev;
						wavePrev = instrument.customChipWave[i] - average;
						instrument.customChipWaveIntegral[i] = cumulative;
					}

					// 65th, last sample is for anti-aliasing
					instrument.customChipWaveIntegral[64] = 0.0;

				} else if (command == SongTagCode.algorithm) {
					this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].algorithm = clamp(0, Config.algorithms.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
				} else if (command == SongTagCode.feedbackType) {
					this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].feedbackType = clamp(0, Config.feedbacks.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
				} else if (command == SongTagCode.feedbackAmplitude) {
					this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].feedbackAmplitude = clamp(0, Config.operatorAmplitudeMax + 1, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
				} else if (command == SongTagCode.feedbackEnvelope) {
					this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].feedbackEnvelope = clamp(0, Config.envelopes.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
				} else if (command == SongTagCode.operatorFrequencies) {
					for (let o: number = 0; o < Config.operatorCount; o++) {
						this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].operators[o].frequency = clamp(0, Config.operatorFrequencies.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
					}
				} else if (command == SongTagCode.operatorAmplitudes) {
					for (let o: number = 0; o < Config.operatorCount; o++) {
						this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].operators[o].amplitude = clamp(0, Config.operatorAmplitudeMax + 1, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
					}
				} else if (command == SongTagCode.operatorEnvelopes) {
					for (let o: number = 0; o < Config.operatorCount; o++) {
						this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].operators[o].envelope = clamp(0, Config.envelopes.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
					}
				} else if (command == SongTagCode.spectrum) {
					const instrument: Instrument = this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator];
					if (instrument.type == InstrumentType.spectrum) {
						const byteCount: number = Math.ceil(Config.spectrumControlPoints * Config.spectrumControlPointBits / 6)
						const bits: BitFieldReader = new BitFieldReader(compressed, charIndex, charIndex + byteCount);
						for (let i: number = 0; i < Config.spectrumControlPoints; i++) {
							instrument.spectrumWave.spectrum[i] = bits.read(Config.spectrumControlPointBits);
						}
						instrument.spectrumWave.markCustomWaveDirty();
						charIndex += byteCount;
					} else if (instrument.type == InstrumentType.drumset) {
						const byteCount: number = Math.ceil(Config.drumCount * Config.spectrumControlPoints * Config.spectrumControlPointBits / 6)
						const bits: BitFieldReader = new BitFieldReader(compressed, charIndex, charIndex + byteCount);
						for (let j: number = 0; j < Config.drumCount; j++) {
							for (let i: number = 0; i < Config.spectrumControlPoints; i++) {
								instrument.drumsetSpectrumWaves[j].spectrum[i] = bits.read(Config.spectrumControlPointBits);
							}
							instrument.drumsetSpectrumWaves[j].markCustomWaveDirty();
						}
						charIndex += byteCount;
					} else {
						throw new Error("Unhandled instrument type for spectrum song tag code.");
					}
				} else if (command == SongTagCode.harmonics) {
					const instrument: Instrument = this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator];
					const byteCount: number = Math.ceil(Config.harmonicsControlPoints * Config.harmonicsControlPointBits / 6)
					const bits: BitFieldReader = new BitFieldReader(compressed, charIndex, charIndex + byteCount);
					for (let i: number = 0; i < Config.harmonicsControlPoints; i++) {
						instrument.harmonicsWave.harmonics[i] = bits.read(Config.harmonicsControlPointBits);
					}
					instrument.harmonicsWave.markCustomWaveDirty();
					charIndex += byteCount;
				} else if (command == SongTagCode.bars) {
					let subStringLength: number;
					if (beforeThree && variant == "beepbox") {
						channel = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
						const barCount: number = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
						subStringLength = Math.ceil(barCount * 0.5);
						const bits: BitFieldReader = new BitFieldReader(compressed, charIndex, charIndex + subStringLength);
						for (let i: number = 0; i < barCount; i++) {
							this.channels[channel].bars[i] = bits.read(3) + 1;
						}
					} else if (beforeFive && variant == "beepbox") {
						let neededBits: number = 0;
						while ((1 << neededBits) < this.patternsPerChannel) neededBits++;
						subStringLength = Math.ceil(this.getChannelCount() * this.barCount * neededBits / 6);
						const bits: BitFieldReader = new BitFieldReader(compressed, charIndex, charIndex + subStringLength);
						for (channel = 0; channel < this.getChannelCount(); channel++) {
							for (let i: number = 0; i < this.barCount; i++) {
								this.channels[channel].bars[i] = bits.read(neededBits) + 1;
							}
						}
					} else {
						let neededBits: number = 0;
						while ((1 << neededBits) < this.patternsPerChannel + 1) neededBits++;
						subStringLength = Math.ceil(this.getChannelCount() * this.barCount * neededBits / 6);
						const bits: BitFieldReader = new BitFieldReader(compressed, charIndex, charIndex + subStringLength);
						for (channel = 0; channel < this.getChannelCount(); channel++) {
							for (let i: number = 0; i < this.barCount; i++) {
								this.channels[channel].bars[i] = bits.read(neededBits);
							}
						}
					}
					charIndex += subStringLength;
				} else if (command == SongTagCode.patterns) {
					let bitStringLength: number = 0;
					if (beforeThree && variant == "beepbox") {
						channel = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];

						// The old format used the next character to represent the number of patterns in the channel, which is usually eight, the default. 
						charIndex++; //let patternCount: number = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];

						bitStringLength = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
						bitStringLength = bitStringLength << 6;
						bitStringLength += base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
					} else {
						channel = 0;
						let bitStringLengthLength: number = Math.min(4, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
						while (bitStringLengthLength > 0) {
							bitStringLength = bitStringLength << 6;
							bitStringLength += base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
							bitStringLengthLength--;
						}
					}

					const bits: BitFieldReader = new BitFieldReader(compressed, charIndex, charIndex + bitStringLength);
					charIndex += bitStringLength;

					let neededInstrumentBits: number = 0;
					while ((1 << neededInstrumentBits) < this.instrumentsPerChannel) neededInstrumentBits++;
					while (true) {
						const isNoiseChannel: boolean = this.getChannelIsNoise(channel);
						const isModChannel: boolean = this.getChannelIsMod(channel);

						// Some info about modulator settings immediately follows in mod channels.
						if (isModChannel) {
							for (let instrumentIndex: number = 0; instrumentIndex < this.instrumentsPerChannel; instrumentIndex++) {

								let instrument: Instrument = this.channels[channel].instruments[instrumentIndex];

								for (let mod: number = 0; mod < Config.modCount; mod++) {
									instrument.modStatuses[mod] = bits.read(2);

									// Channel/Instrument is only used if the status isn't "song" or "none".
									if (instrument.modStatuses[mod] == ModStatus.msForPitch || instrument.modStatuses[mod] == ModStatus.msForNoise) {

										// Clamp to pitch/noise max
										if (instrument.modStatuses[mod] == ModStatus.msForPitch) {
											instrument.modChannels[mod] = clamp(0, this.pitchChannelCount + 1, bits.read(8));
										}
										else {
											instrument.modChannels[mod] = clamp(0, this.noiseChannelCount + 1, bits.read(8));
										}

										instrument.modInstruments[mod] = clamp(0, this.instrumentsPerChannel + 1, bits.read(neededInstrumentBits));
									}

									// Mod setting is only used if the status isn't "none".
									if (instrument.modStatuses[mod] != ModStatus.msNone) {
										instrument.modSettings[mod] = bits.read(6);
									}
								}
							}
						}

						const octaveOffset: number = (isNoiseChannel || isModChannel) ? 0 : this.channels[channel].octave * 12;
						let note: Note | null = null;
						let pin: NotePin | null = null;
						let lastPitch: number = ((isNoiseChannel || isModChannel) ? 4 : 12) + octaveOffset;
						const recentPitches: number[] = isModChannel ? [0, 1, 2, 3, 4, 5] : (isNoiseChannel ? [4, 6, 7, 2, 3, 8, 0, 10] : [12, 19, 24, 31, 36, 7, 0]);
						const recentShapes: any[] = [];
						for (let i: number = 0; i < recentPitches.length; i++) {
							recentPitches[i] += octaveOffset;
						}
						for (let i: number = 0; i < this.patternsPerChannel; i++) {
							const newPattern: Pattern = this.channels[channel].patterns[i];
							newPattern.reset();
							newPattern.instrument = bits.read(neededInstrumentBits);

							if (!(variant == "beepbox" && beforeThree) && bits.read(1) == 0) continue;

							let curPart: number = 0;
							const newNotes: Note[] = newPattern.notes;
							// Due to arbitrary note positioning, mod channels don't end the count until curPart actually exceeds the max
							while (curPart < this.beatsPerBar * Config.partsPerBeat + (+isModChannel)) {

								const useOldShape: boolean = bits.read(1) == 1;
								let newNote: boolean = false;
								let shapeIndex: number = 0;
								if (useOldShape) {
									shapeIndex = bits.readLongTail(0, 0);
								} else {
									newNote = bits.read(1) == 1;
								}

								if (!useOldShape && !newNote) {
									// For mod channels, check if you need to move backward too (notes can appear in any order and offset from each other).
									if (isModChannel) {
										const isBackwards: boolean = bits.read(1) == 1;
										const restLength: number = bits.readPartDuration();
										if (isBackwards) {
											curPart -= restLength;
										}
										else {
											curPart += restLength;
										}
									} else {
										const restLength: number = (beforeSeven && variant == "beepbox")
											? bits.readLegacyPartDuration() * Config.partsPerBeat / Config.rhythms[this.rhythm].stepsPerBeat
											: bits.readPartDuration();
										curPart += restLength;

									}
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
										while (shape.pitchCount < Config.maxChordSize && bits.read(1) == 1) shape.pitchCount++;
										shape.pinCount = bits.readPinCount();

										if (variant == "beepbox") {
											shape.initialVolume = bits.read(2) * 2;
										} else if (!isModChannel) {
											shape.initialVolume = bits.read(3);
										} else {
											shape.initialVolume = bits.read(9);
										}

										shape.pins = [];
										shape.length = 0;
										shape.bendCount = 0;
										for (let j: number = 0; j < shape.pinCount; j++) {
											pinObj = {};
											pinObj.pitchBend = bits.read(1) == 1;
											if (pinObj.pitchBend) shape.bendCount++;
											shape.length += (beforeSeven && variant == "beepbox")
												? bits.readLegacyPartDuration() * Config.partsPerBeat / Config.rhythms[this.rhythm].stepsPerBeat
												: bits.readPartDuration();
											pinObj.time = shape.length;

											if (variant == "beepbox") {
												pinObj.volume = bits.read(2) * 2;
											} else if (!isModChannel) {
												pinObj.volume = bits.read(3);
											}
											else {
												pinObj.volume = bits.read(9);
											}
											shape.pins.push(pinObj);
										}
									}
									recentShapes.unshift(shape);
									if (recentShapes.length > 10) recentShapes.pop();

									note = new Note(0, curPart, curPart + shape.length, shape.initialVolume);
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
						}

						if (beforeThree && variant == "beepbox") {
							break;
						} else {
							channel++;
							if (channel >= this.getChannelCount()) break;
						}
					} // while (true)
				}
			}

			for (let channel: number = 0; channel < this.getChannelCount(); channel++) {
				if (toSetOctaves[channel] != null) {
					this.channels[channel].octave = toSetOctaves[channel];
				}
			}
		}

		public toJsonObject(enableIntro: boolean = true, loopCount: number = 1, enableOutro: boolean = true): Object {
			const channelArray: Object[] = [];
			for (let channel: number = 0; channel < this.getChannelCount(); channel++) {
				const instrumentArray: Object[] = [];
				const isNoiseChannel: boolean = this.getChannelIsNoise(channel);
				const isModChannel: boolean = this.getChannelIsMod(channel);
				for (let i: number = 0; i < this.instrumentsPerChannel; i++) {
					instrumentArray.push(this.channels[channel].instruments[i].toJsonObject());
				}

				const patternArray: Object[] = [];
				for (const pattern of this.channels[channel].patterns) {
					const noteArray: Object[] = [];
					for (const note of pattern.notes) {
						let volumeCap: number = this.getVolumeCapForSetting(isModChannel, this.channels[channel].instruments[pattern.instrument].modSettings[Config.modCount - note.pitches[0] - 1]);
						const pointArray: Object[] = [];
						for (const pin of note.pins) {
							pointArray.push({
								"tick": (pin.time + note.start) * Config.rhythms[this.rhythm].stepsPerBeat / Config.partsPerBeat,
								"pitchBend": pin.interval,
								"volume": Math.round(pin.volume * 100 / volumeCap),
							});
						}

						noteArray.push({
							"pitches": note.pitches,
							"points": pointArray,
						});
					}

					patternArray.push({
						"instrument": pattern.instrument + 1,
						"notes": noteArray,
					});
				}

				const sequenceArray: number[] = [];
				if (enableIntro) for (let i: number = 0; i < this.loopStart; i++) {
					sequenceArray.push(this.channels[channel].bars[i]);
				}
				for (let l: number = 0; l < loopCount; l++) for (let i: number = this.loopStart; i < this.loopStart + this.loopLength; i++) {
					sequenceArray.push(this.channels[channel].bars[i]);
				}
				if (enableOutro) for (let i: number = this.loopStart + this.loopLength; i < this.barCount; i++) {
					sequenceArray.push(this.channels[channel].bars[i]);
				}

				channelArray.push({
					"type": isModChannel ? "mod" : (isNoiseChannel ? "drum" : "pitch"),
					"octaveScrollBar": this.channels[channel].octave,
					"instruments": instrumentArray,
					"patterns": patternArray,
					"sequence": sequenceArray,
				});
			}

			return {
				"name": this.title,
				"format": Song._format,
				"version": Song._latestJummBoxVersion,
				"scale": Config.scales[this.scale].name,
				"key": Config.keys[this.key].name,
				"introBars": this.loopStart,
				"loopBars": this.loopLength,
				"beatsPerBar": this.beatsPerBar,
				"ticksPerBeat": Config.rhythms[this.rhythm].stepsPerBeat,
				"beatsPerMinute": this.tempo,
				"reverb": this.reverb,
				//"outroBars": this.barCount - this.loopStart - this.loopLength; // derive this from bar arrays?
				//"patternCount": this.patternsPerChannel, // derive this from pattern arrays?
				//"instrumentsPerChannel": this.instrumentsPerChannel, //derive this from instrument arrays?
				"channels": channelArray,
			};
		}

		public fromJsonObject(jsonObject: any): void {
			this.initToDefault(true);
			if (!jsonObject) return;

			//const version: number = jsonObject["version"] | 0;
			//if (version > Song._latestVersion) return; // Go ahead and try to parse something from the future I guess? JSON is pretty easy-going!

			if (jsonObject["name"] != undefined) {
				this.title = jsonObject["name"];
			}

			this.scale = 0; // default to free.
			if (jsonObject["scale"] != undefined) {
				const oldScaleNames: Dictionary<number> = { "romani :)": 8, "romani :(": 9 };
				const scale: number = oldScaleNames[jsonObject["scale"]] != undefined ? oldScaleNames[jsonObject["scale"]] : Config.scales.findIndex(scale => scale.name == jsonObject["scale"]);
				if (scale != -1) this.scale = scale;
			}

			if (jsonObject["key"] != undefined) {
				if (typeof (jsonObject["key"]) == "number") {
					this.key = ((jsonObject["key"] + 1200) >>> 0) % Config.keys.length;
				} else if (typeof (jsonObject["key"]) == "string") {
					const key: string = jsonObject["key"];
					const letter: string = key.charAt(0).toUpperCase();
					const symbol: string = key.charAt(1).toLowerCase();
					const letterMap: Readonly<Dictionary<number>> = { "C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11 };
					const accidentalMap: Readonly<Dictionary<number>> = { "#": 1, "♯": 1, "b": -1, "♭": -1 };
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

			if (jsonObject["beatsPerMinute"] != undefined) {
				this.tempo = clamp(Config.tempoMin, Config.tempoMax + 1, jsonObject["beatsPerMinute"] | 0);
			}

			if (jsonObject["reverb"] != undefined) {
				this.reverb = clamp(0, Config.reverbRange, jsonObject["reverb"] | 0);
			}

			if (jsonObject["beatsPerBar"] != undefined) {
				this.beatsPerBar = Math.max(Config.beatsPerBarMin, Math.min(Config.beatsPerBarMax, jsonObject["beatsPerBar"] | 0));
			}

			let importedPartsPerBeat: number = 4;
			if (jsonObject["ticksPerBeat"] != undefined) {
				importedPartsPerBeat = (jsonObject["ticksPerBeat"] | 0) || 4;
				this.rhythm = Config.rhythms.findIndex(rhythm => rhythm.stepsPerBeat == importedPartsPerBeat);
				if (this.rhythm == -1) {
					this.rhythm = 1;
				}
			}

			let maxInstruments: number = 1;
			let maxPatterns: number = 1;
			let maxBars: number = 1;
			if (jsonObject["channels"]) {
				for (const channelObject of jsonObject["channels"]) {
					if (channelObject["instruments"]) maxInstruments = Math.max(maxInstruments, channelObject["instruments"].length | 0);
					if (channelObject["patterns"]) maxPatterns = Math.max(maxPatterns, channelObject["patterns"].length | 0);
					if (channelObject["sequence"]) maxBars = Math.max(maxBars, channelObject["sequence"].length | 0);
				}
			}

			this.instrumentsPerChannel = maxInstruments;
			this.patternsPerChannel = maxPatterns;
			this.barCount = maxBars;

			if (jsonObject["introBars"] != undefined) {
				this.loopStart = clamp(0, this.barCount, jsonObject["introBars"] | 0);
			}
			if (jsonObject["loopBars"] != undefined) {
				this.loopLength = clamp(1, this.barCount - this.loopStart + 1, jsonObject["loopBars"] | 0);
			}

			const newPitchChannels: Channel[] = [];
			const newNoiseChannels: Channel[] = [];
			const newModChannels: Channel[] = [];
			if (jsonObject["channels"]) {
				for (let channelIndex: number = 0; channelIndex < jsonObject["channels"].length; channelIndex++) {
					let channelObject: any = jsonObject["channels"][channelIndex];

					const channel: Channel = new Channel();

					let isNoiseChannel: boolean = false;
					let isModChannel: boolean = false;
					if (channelObject["type"] != undefined) {
						isNoiseChannel = (channelObject["type"] == "drum");
						isModChannel = (channelObject["type"] == "mod");
					} else {
						// for older files, assume drums are channel 3.
						isNoiseChannel = (channelIndex >= 3);
					}
					if (isNoiseChannel) {
						newNoiseChannels.push(channel);
					} else if (isModChannel) {
						newModChannels.push(channel);
					}
					else {
						newPitchChannels.push(channel);
					}

					if (channelObject["octaveScrollBar"] != undefined) {
						channel.octave = clamp(0, Config.maxScrollableOctaves - (+(window.localStorage.getItem("extraOctaves") || "0")) + 1, channelObject["octaveScrollBar"] | 0);
					}

					for (let i: number = channel.instruments.length; i < this.instrumentsPerChannel; i++) {
						channel.instruments[i] = new Instrument(isNoiseChannel, isModChannel);
					}
					channel.instruments.length = this.instrumentsPerChannel;

					for (let i: number = channel.patterns.length; i < this.patternsPerChannel; i++) {
						channel.patterns[i] = new Pattern();
					}
					channel.patterns.length = this.patternsPerChannel;

					for (let i: number = 0; i < this.barCount; i++) {
						channel.bars[i] = 1;
					}
					channel.bars.length = this.barCount;

					for (let i: number = 0; i < this.instrumentsPerChannel; i++) {
						const instrument: Instrument = channel.instruments[i];
						instrument.fromJsonObject(channelObject["instruments"][i], isNoiseChannel, isModChannel);
					}

					for (let i: number = 0; i < this.patternsPerChannel; i++) {
						const pattern: Pattern = channel.patterns[i];

						let patternObject: any = undefined;
						if (channelObject["patterns"]) patternObject = channelObject["patterns"][i];
						if (patternObject == undefined) continue;

						pattern.instrument = clamp(0, this.instrumentsPerChannel, (patternObject["instrument"] | 0) - 1);

						if (patternObject["notes"] && patternObject["notes"].length > 0) {
							const maxNoteCount: number = Math.min(this.beatsPerBar * Config.partsPerBeat, patternObject["notes"].length >>> 0);

							//let tickClock: number = 0;
							for (let j: number = 0; j < patternObject["notes"].length; j++) {
								if (j >= maxNoteCount) break;

								const noteObject = patternObject["notes"][j];
								if (!noteObject || !noteObject["pitches"] || !(noteObject["pitches"].length >= 1) || !noteObject["points"] || !(noteObject["points"].length >= 2)) {
									continue;
								}

								const note: Note = new Note(0, 0, 0, 0);
								note.pitches = [];
								note.pins = [];

								for (let k: number = 0; k < noteObject["pitches"].length; k++) {
									const pitch: number = noteObject["pitches"][k] | 0;
									if (note.pitches.indexOf(pitch) != -1) continue;
									note.pitches.push(pitch);
									if (note.pitches.length >= Config.maxChordSize) break;
								}
								if (note.pitches.length < 1) continue;

								//let noteClock: number = tickClock;
								let startInterval: number = 0;
								for (let k: number = 0; k < noteObject["points"].length; k++) {
									const pointObject: any = noteObject["points"][k];
									if (pointObject == undefined || pointObject["tick"] == undefined) continue;
									const interval: number = (pointObject["pitchBend"] == undefined) ? 0 : (pointObject["pitchBend"] | 0);

									const time: number = Math.round((+pointObject["tick"]) * Config.partsPerBeat / importedPartsPerBeat);

									let volumeCap: number = this.getVolumeCapForSetting(isModChannel, channel.instruments[pattern.instrument].modSettings[Config.modCount - note.pitches[0] - 1]);

									const volume: number = (pointObject["volume"] == undefined) ? volumeCap : Math.max(0, Math.min(volumeCap, Math.round((pointObject["volume"] | 0) * volumeCap / 100)));

									if (time > this.beatsPerBar * Config.partsPerBeat) continue;
									if (note.pins.length == 0) {
										//if (time < noteClock) continue;
										note.start = time;
										startInterval = interval;
									} else {
										//if (time <= noteClock) continue;
									}
									//noteClock = time;

									note.pins.push(makeNotePin(interval - startInterval, time - note.start, volume));
								}
								if (note.pins.length < 2) continue;

								note.end = note.pins[note.pins.length - 1].time + note.start;

								const maxPitch: number = isNoiseChannel ? Config.drumCount - 1 : Config.maxPitch;
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
										if (pin.interval == note.pins[k - 1].interval &&
											pin.interval == note.pins[k - 2].interval &&
											pin.volume == note.pins[k - 1].volume &&
											pin.volume == note.pins[k - 2].volume) {
											note.pins.splice(k - 1, 1);
											k--;
										}
									}
								}

								pattern.notes.push(note);
								//tickClock = note.end;
							}
						}
					}

					for (let i: number = 0; i < this.barCount; i++) {
						channel.bars[i] = channelObject["sequence"] ? Math.min(this.patternsPerChannel, channelObject["sequence"][i] >>> 0) : 0;
					}
				}
			}

			if (newPitchChannels.length > Config.pitchChannelCountMax) newPitchChannels.length = Config.pitchChannelCountMax;
			if (newNoiseChannels.length > Config.noiseChannelCountMax) newNoiseChannels.length = Config.noiseChannelCountMax;
			if (newModChannels.length > Config.modChannelCountMax) newModChannels.length = Config.modChannelCountMax;
			this.pitchChannelCount = newPitchChannels.length;
			this.noiseChannelCount = newNoiseChannels.length;
			this.modChannelCount = newModChannels.length;
			this.channels.length = 0;
			Array.prototype.push.apply(this.channels, newPitchChannels);
			Array.prototype.push.apply(this.channels, newNoiseChannels);
			Array.prototype.push.apply(this.channels, newModChannels);
		}

		public getPattern(channel: number, bar: number): Pattern | null {
			if (bar < 0 || bar >= this.barCount) return null;
			const patternIndex: number = this.channels[channel].bars[bar];
			if (patternIndex == 0) return null;
			return this.channels[channel].patterns[patternIndex - 1];
		}

		public getPatternInstrument(channel: number, bar: number): number {
			const pattern: Pattern | null = this.getPattern(channel, bar);
			return pattern == null ? 0 : pattern.instrument;
		}

		public getBeatsPerMinute(): number {
			return this.tempo;
		}

	}

	class Tone {
		public instrument: Instrument;
		public readonly pitches: number[] = [0, 0, 0, 0];
		public pitchCount: number = 0;
		public chordSize: number = 0;
		public drumsetPitch: number = 0;
		public note: Note | null = null;
		public prevNote: Note | null = null;
		public nextNote: Note | null = null;
		public prevNotePitchIndex: number = 0;
		public nextNotePitchIndex: number = 0;
		public active: boolean = false;
		public noteStart: number = 0;
		public noteEnd: number = 0;
		public noteLengthTicks: number = 0;
		public ticksSinceReleased: number = 0;
		public liveInputSamplesHeld: number = 0;
		public lastInterval: number = 0;
		public lastVolume: number = 0;
		public stereoVolume1: number = 0.0;
		public stereoVolume2: number = 0.0;
		public stereoOffset: number = 0.0;
		public stereoDelay: number = 0.0;
		public sample: number = 0.0;
		public readonly phases: number[] = [];
		public readonly phaseDeltas: number[] = [];
		public readonly volumeStarts: number[] = [];
		public readonly volumeDeltas: number[] = [];
		public volumeStart: number = 0.0;
		public volumeDelta: number = 0.0;
		public phaseDeltaScale: number = 0.0;
		public pulseWidth: number = 0.0;
		public pulseWidthDelta: number = 0.0;
		public filter: number = 0.0;
		public filterScale: number = 0.0;
		public filterSample0: number = 0.0;
		public filterSample1: number = 0.0;
		public vibratoScale: number = 0.0;
		public intervalMult: number = 0.0;
		public intervalVolumeMult: number = 1.0;
		public feedbackOutputs: number[] = [];
		public feedbackMult: number = 0.0;
		public feedbackDelta: number = 0.0;
		public stereoVolumeLStart: number = 0.0;
		public stereoVolumeRStart: number = 0.0;
		public stereoVolumeLDelta: number = 0.0;
		public stereoVolumeRDelta: number = 0.0;
		public stereoDelayStart: number = 0.0;
		public stereoDelayEnd: number = 0.0;
		public stereoDelayDelta: number = 0.0;
		public customVolumeStart: number = 0.0;
		public customVolumeEnd: number = 0.0;
		public filterResonanceStart: number = 0.0;
		public filterResonanceDelta: number = 0.0;
		public isFirstOrder: boolean = false;

		constructor() {
			this.reset();
		}

		public reset(): void {
			for (let i: number = 0; i < Config.operatorCount; i++) {
				this.phases[i] = 0.0;
				this.feedbackOutputs[i] = 0.0;
			}
			this.sample = 0.0;
			this.filterSample0 = 0.0;
			this.filterSample1 = 0.0;
			this.liveInputSamplesHeld = 0.0;
		}

	}

	export class Synth {
		//debugVal: number = 0;

		private warmUpSynthesizer(song: Song | null): void {
			// Don't bother to generate the drum waves unless the song actually
			// uses them, since they may require a lot of computation.
			if (song != null) {
				for (let channel: number = 0; channel < song.getChannelCount(); channel++) {
					for (let instrument: number = 0; instrument < song.instrumentsPerChannel; instrument++) {
						Synth.getInstrumentSynthFunction(song.channels[channel].instruments[instrument]);
						song.channels[channel].instruments[instrument].warmUp();
					}

				}
			}
		}

		public computeLatestModValues(): void {

			if (this.song != null && this.song.modChannelCount > 0) {

				// Clear all mod values
				this.modValues = [];
				this.nextModValues = [];
				this.modInsValues = [];
				this.nextModInsValues = [];
				for (let channel: number = 0; channel < this.song.pitchChannelCount + this.song.noiseChannelCount; channel++) {
					this.modInsValues[channel] = [];
					this.nextModInsValues[channel] = [];
					for (let instrument: number = 0; instrument < this.song.instrumentsPerChannel; instrument++) {
						this.modInsValues[channel][instrument] = [];
						this.nextModInsValues[channel][instrument] = [];
					}
				}

				// Find out where we're at in the fraction of the current bar.
				let currentTick: number = this.beat * Config.partsPerBeat * Config.ticksPerPart
					+ this.part * Config.ticksPerPart
					+ this.tick;

				// For mod channels, calculate last set value for each mod
				for (let channel: number = this.song.pitchChannelCount + this.song.noiseChannelCount; channel < this.song.getChannelCount(); channel++) {
					if (!(this.song.channels[channel].muted)) {

						let pattern: Pattern | null;

						for (let currentBar: number = this.bar; currentBar >= 0; currentBar--) {
							pattern = this.song.getPattern(channel, currentBar);
							
							if (pattern != null) {
								let instrumentIdx: number = this.song.getPatternInstrument(channel, currentBar);
								let instrument: Instrument = this.song.channels[channel].instruments[instrumentIdx];
								let latestPinTicks: number[] = [];
								let latestPinValues: number[] = [];

								let ticksInBar: number = (currentBar == this.bar)
									? currentTick
									: this.findTicksInBar(currentBar);

								for (const note of pattern.notes) {
									if (note.start < ticksInBar && (latestPinTicks[Config.modCount - 1 - note.pitches[0]] == null || note.end > latestPinTicks[Config.modCount - 1 - note.pitches[0]])) {
										if (note.end <= ticksInBar) {
											latestPinTicks[Config.modCount - 1 - note.pitches[0]] = note.end;
											latestPinValues[Config.modCount - 1 - note.pitches[0]] = note.pins[note.pins.length - 1].volume;
										}
										else {
											latestPinTicks[Config.modCount - 1 - note.pitches[0]] = ticksInBar;
											// Find the pin where bar change happens, and compute where pin volume would be at that time
											for (let pinIdx = 0; pinIdx < note.pins.length; pinIdx++ ) {
												if (note.pins[pinIdx].time + note.start > ticksInBar) {
													const transitionLength: number = note.pins[pinIdx].time - note.pins[pinIdx - 1].time;
													const toNextBarLength: number = ticksInBar - note.pins[pinIdx - 1].time;
													const deltaVolume: number = note.pins[pinIdx].volume - note.pins[pinIdx - 1].volume;

													latestPinValues[Config.modCount - 1 - note.pitches[0]] = Math.round( note.pins[pinIdx - 1].volume + deltaVolume * toNextBarLength / transitionLength );
												}
											}
										}
									}
								}

								// Set modulator value, if it wasn't set in another pattern already scanned
								for (let mod: number = 0; mod < Config.modCount; mod++) {
									if (latestPinTicks[mod] != null) {
										if (!this.isModActive(instrument.modSettings[mod], (instrument.modStatuses[mod] == ModStatus.msForSong), instrument.modChannels[mod] + ((instrument.modStatuses[mod] == ModStatus.msForNoise) ? this.song!.pitchChannelCount : 0), instrument.modInstruments[mod]))
											this.setModValue(latestPinValues[mod], latestPinValues[mod], mod, instrument, instrument.modSettings[mod]);
									}
								}
							}
						}
					}
				}
			}
		}

		private static operatorAmplitudeCurve(amplitude: number): number {
			return (Math.pow(16.0, amplitude / 15.0) - 1.0) / 15.0;
		}

		public samplesPerSecond: number = 44100;

		public song: Song | null = null;
		public liveInputDuration: number = 0;
		public liveInputStarted: boolean = false;
		public liveInputPitches: number[] = [];
		public liveInputChannel: number = 0;
		public loopRepeatCount: number = -1;
		public volume: number = 1.0;

		private playheadInternal: number = 0.0;
		private bar: number = 0;
		private beat: number = 0;
		private part: number = 0;
		private tick: number = 0;
		private tickSampleCountdown: number = 0;
		private modValues: (number | null)[];
		private modInsValues: (number | null)[][][];
		private nextModValues: (number | null)[];
		private nextModInsValues: (number | null)[][][];
		private isPlayingSong: boolean = false;
		private liveInputEndTime: number = 0.0;
		private readonly tonePool: Deque<Tone> = new Deque<Tone>();
		private readonly activeTones: Array<Deque<Tone>> = [];
		private readonly activeModTones: Array<Array<Deque<Tone>>> = [];
		//private readonly releasedModTones: Array<Array<Deque<Tone>>> = [];
		private readonly releasedTones: Array<Deque<Tone>> = [];
		private readonly liveInputTones: Deque<Tone> = new Deque<Tone>();

		//private highpassInput: number = 0.0;
		//private highpassOutput: number = 0.0;
		private limit: number = 0.0;

		private stereoBufferIndex: number = 0;
		private samplesForNone: Float32Array | null = null;
		private samplesForReverb: Float32Array | null = null;
		private samplesForChorus: Float32Array | null = null;
		private samplesForChorusReverb: Float32Array | null = null;

		private chorusDelayLine: Float32Array = new Float32Array(2048);
		private chorusDelayPos: number = 0;
		private chorusPhase: number = 0;

		private reverbDelayLine: Float32Array = new Float32Array(16384);
		private reverbDelayPos: number = 0;
		private reverbFeedback0: number = 0.0;
		private reverbFeedback1: number = 0.0;
		private reverbFeedback2: number = 0.0;
		private reverbFeedback3: number = 0.0;

		private audioCtx: any | null = null;
		private scriptNode: any | null = null;

		public get playing(): boolean {
			return this.isPlayingSong;
		}

		public get playhead(): number {
			return this.playheadInternal;
		}

		public set playhead(value: number) {
			if (this.song != null) {
				this.playheadInternal = Math.max(0, Math.min(this.song.barCount, value));
				let remainder: number = this.playheadInternal;
				this.bar = Math.floor(remainder);
				remainder = this.song.beatsPerBar * (remainder - this.bar);
				this.beat = Math.floor(remainder);
				remainder = Config.partsPerBeat * (remainder - this.beat);
				this.part = Math.floor(remainder);
				remainder = Config.ticksPerPart * (remainder - this.part);
				this.tick = Math.floor(remainder);
				const samplesPerTick: number = this.getSamplesPerTick();
				remainder = samplesPerTick * (remainder - this.tick);
				this.tickSampleCountdown = Math.floor(samplesPerTick - remainder);
			}
		}

		public getSamplesPerBar(): number {
			if (this.song == null) throw new Error();
			return this.getSamplesPerTick() * Config.ticksPerPart * Config.partsPerBeat * this.song.beatsPerBar;
		}

		// Calculate the total number of ticks that will be played in the current bar before any next bar mods trigger.
		private findTicksInBar(bar: number): number {
			if (this.song == null) return 0;
			let ticksInBar: number = Config.ticksPerPart * Config.partsPerBeat * this.song.beatsPerBar;
			for (let channel: number = this.song.pitchChannelCount + this.song.noiseChannelCount; channel < this.song.getChannelCount(); channel++) {
				let pattern: Pattern | null = this.song.getPattern(channel, bar);
				if (pattern != null) {
					let instrument: Instrument = this.song.channels[channel].instruments[pattern.instrument];
					for (let mod: number = 0; mod < Config.modCount; mod++) {
						if (instrument.modSettings[mod] == ModSetting.mstNextBar && instrument.modStatuses[mod] == ModStatus.msForSong) {
							for (const note of pattern.notes) {
								if (note.pitches[0] == (Config.modCount - 1 - mod)) {
									// Find the earliest next bar note.
									if (ticksInBar > note.start)
										ticksInBar = note.start;
								}
							}
						}
					}
				}
			}
			return ticksInBar;
		}

		// Returns the total samples in the song
		public getTotalSamples(enableIntro: boolean, enableOutro: boolean, loop: number): number {
			if (this.song == null)
				return -1;

			// Compute the window to be checked (start bar to end bar)
			let startBar: number = enableIntro ? 0 : this.song.loopStart;
			let endBar: number = enableOutro ? this.song.barCount : (this.song.loopStart + this.song.loopLength);
			let hasTempoMods: boolean = false;
			let hasNextBarMods: boolean = false;

			// Determine if any tempo or next bar mods happen anywhere in the window
			for (let channel: number = this.song.pitchChannelCount + this.song.noiseChannelCount; channel < this.song.getChannelCount(); channel++) {
				for (let bar: number = startBar; bar < endBar; bar++) {
					let pattern: Pattern | null = this.song.getPattern(channel, bar);
					if (pattern != null) {
						let instrument: Instrument = this.song.channels[channel].instruments[pattern.instrument];
						for (let mod: number = 0; mod < Config.modCount; mod++) {
							if (instrument.modSettings[mod] == ModSetting.mstTempo && instrument.modStatuses[mod] == ModStatus.msForSong) {
								hasTempoMods = true;
							}
							if (instrument.modSettings[mod] == ModSetting.mstNextBar && instrument.modStatuses[mod] == ModStatus.msForSong) {
								hasNextBarMods = true;
							}
						}
					}
				}
			}

			if (hasTempoMods || hasNextBarMods) {
				// Run from start bar to end bar and observe looping, computing average tempo across each bar
				let bar: number = startBar;
				let ended: boolean = false;
				let prevTempo: number = this.song.tempo;
				let totalSamples: number = 0;

				while (!ended) {
					// Compute the subsection of the pattern that will play
					let partsInBar: number = Config.partsPerBeat * this.song.beatsPerBar;
					let currentPart: number = 0;

					if (hasNextBarMods) {
						partsInBar = this.findTicksInBar(bar) / Config.ticksPerPart;
					}

					// Compute average tempo in this tick window, or use last tempo if nothing happened
					if (hasTempoMods) {
						let foundMod: boolean = false;
						for (let channel: number = this.song.pitchChannelCount + this.song.noiseChannelCount; channel < this.song.getChannelCount(); channel++) {
							if (foundMod == false) {
								let pattern: Pattern | null = this.song.getPattern(channel, bar);
								if (pattern != null) {
									let instrument: Instrument = this.song.channels[channel].instruments[pattern.instrument];
									for (let mod: number = 0; mod < Config.modCount; mod++) {
										if (foundMod == false && instrument.modSettings[mod] == ModSetting.mstTempo && instrument.modStatuses[mod] == ModStatus.msForSong) {
											// Only the first tempo mod instrument for this bar will be checked.
											foundMod = true;
											// Need to re-sort the notes by start time to make the next part much less painful.
											pattern.notes.sort(function (a, b) { return (a.start == b.start) ? a.pitches[0] - b.pitches[0] : a.start - b.start; });
											for (const note of pattern.notes) {
												if (note.pitches[0] == (Config.modCount - 1 - mod)) {
													// Compute samples up to this note
													totalSamples += (Math.min(partsInBar - currentPart, note.start - currentPart)) * Config.ticksPerPart * this.getSamplesPerTickSpecificBPM(prevTempo);

													if (note.start < partsInBar) {
														for (let pinIdx: number = 1; pinIdx < note.pins.length; pinIdx++) {
															// Compute samples up to this pin
															if (note.pins[pinIdx - 1].time + note.start <= partsInBar) {
																const tickLength: number = Config.ticksPerPart * Math.min(partsInBar - (note.start + note.pins[pinIdx - 1].time), note.pins[pinIdx].time - note.pins[pinIdx - 1].time);
																const prevPinTempo: number = this.song.modValueToReal(note.pins[pinIdx - 1].volume, ModSetting.mstTempo);
																let currPinTempo: number = this.song.modValueToReal(note.pins[pinIdx].volume, ModSetting.mstTempo);
																if (note.pins[pinIdx].time + note.start > partsInBar) {
																	// Compute an intermediary tempo since bar changed over mid-pin. Maybe I'm deep in "what if" territory now!
																	currPinTempo = this.song.modValueToReal(note.pins[pinIdx - 1].volume + (note.pins[pinIdx].volume - note.pins[pinIdx - 1].volume) * (partsInBar - (note.start + note.pins[pinIdx - 1].time)) / (note.pins[pinIdx].time - note.pins[pinIdx - 1].time), ModSetting.mstTempo);
																}
																let bpmScalar: number = Config.partsPerBeat * Config.ticksPerPart / 60;

																if (currPinTempo != prevPinTempo) {

																	// Definite integral of SamplesPerTick w/r/t beats to find total samples from start point to end point for a variable tempo
																	// The starting formula is
																	//	 SamplesPerTick = SamplesPerSec / ((PartsPerBeat * TicksPerPart) / SecPerMin) * BeatsPerMin )
																	//
																	// This is an expression of samples per tick "instantaneously", and it can be multiplied by a number of ticks to get a sample count.
																	// But this isn't the full story. BeatsPerMin, e.g. tempo, changes throughout the interval so it has to be expressed in terms of ticks, "t"
																	// ( Also from now on PartsPerBeat, TicksPerPart, and SecPerMin are compbined into one scalar, called "BPMScalar" )
																	// Substituting BPM for a step variable that moves with respect to the current tick, we get
																	//	 SamplesPerTick = SamplesPerSec / (BPMScalar * ( (EndTempo - StartTempo / TickLength) * t + StartTempo ) )
																	//
																	// When this equation is integrated from 0 to TickLength with respect to t, we get the following expression:
																	//   Samples = - SamplesPerSec * TickLength * ( log( BPMScalar * EndTempo * TickLength ) - log( BPMScalar * StartTempo * TickLength ) ) / BPMScalar * ( StartTempo - EndTempo )

																	totalSamples += - this.samplesPerSecond * tickLength * (Math.log(bpmScalar * currPinTempo * tickLength) - Math.log(bpmScalar * prevPinTempo * tickLength)) / (bpmScalar * (prevPinTempo - currPinTempo));

																}
																else {

																	// No tempo change between the two pins.
																	totalSamples += tickLength * this.getSamplesPerTickSpecificBPM(currPinTempo);

																}
																prevTempo = currPinTempo;
															}
															currentPart = Math.min(note.start + note.pins[pinIdx].time, partsInBar);
														}
													}
												}
											}
										}
									}
								}
							}
						}
					}

					// Compute samples for the rest of the bar
					totalSamples += (partsInBar - currentPart) * Config.ticksPerPart * this.getSamplesPerTickSpecificBPM(prevTempo);

					bar++;
					if (loop != 0 && bar == this.song.loopStart + this.song.loopLength) {
						bar = this.song.loopStart;
						if (loop > 0) loop--;
					}
					if (bar >= endBar) {
						ended = true;
					}
				}

				return Math.ceil(totalSamples);
			}
			else {
				// No tempo or next bar mods... phew! Just calculate normally.
				return this.getSamplesPerBar() * this.getTotalBars(enableIntro, enableOutro, loop);
			}
		}

		public getTotalBars(enableIntro: boolean, enableOutro: boolean, useLoopCount: number = this.loopRepeatCount): number {
			if (this.song == null) throw new Error();
			let bars: number = this.song.loopLength * (useLoopCount + 1);
			if (enableIntro) bars += this.song.loopStart;
			if (enableOutro) bars += this.song.barCount - (this.song.loopStart + this.song.loopLength);
			return bars;
		}

		constructor(song: Song | string | null = null) {
			if (song != null) this.setSong(song);
		}

		public setSong(song: Song | string): void {
			if (typeof (song) == "string") {
				this.song = new Song(song);
			} else if (song instanceof Song) {
				this.song = song;
			}
		}

		public setModValue(volumeStart: number, volumeEnd: number, mod: number, instrument: Instrument, setting: ModSetting): number {
			let val: number;
			let nextVal: number;
			switch (setting) {
				case ModSetting.mstSongVolume:
				case ModSetting.mstReverb:
				case ModSetting.mstTempo:
					val = (this.song as Song).modValueToReal(volumeStart, setting);
					nextVal = (this.song as Song).modValueToReal(volumeEnd, setting);
					if (this.modValues[setting] == null || this.modValues[setting] != val || this.nextModValues[setting] != nextVal) {
						this.modValues[setting] = val;
						this.nextModValues[setting] = nextVal;
					}
					break;
				case ModSetting.mstInsVolume:
				case ModSetting.mstPan:
				case ModSetting.mstPulseWidth:
				case ModSetting.mstFilterCut:
				case ModSetting.mstFilterPeak:
				case ModSetting.mstFMSlider1:
				case ModSetting.mstFMSlider2:
				case ModSetting.mstFMSlider3:
				case ModSetting.mstFMSlider4:
				case ModSetting.mstFMFeedback:
				case ModSetting.mstDetune:
					val = this.song!.modValueToReal(volumeStart, setting);
					nextVal = this.song!.modValueToReal(volumeEnd, setting);
					let channelAdjust: number = instrument.modChannels[mod] + ((instrument.modStatuses[mod] == ModStatus.msForNoise) ? this.song!.pitchChannelCount : 0);

					if (this.modInsValues[channelAdjust][instrument.modInstruments[mod]][setting] == null
						|| this.modInsValues[channelAdjust][instrument.modInstruments[mod]][setting] != val
						|| this.nextModInsValues[channelAdjust][instrument.modInstruments[mod]][setting] != nextVal) {
						this.modInsValues[channelAdjust][instrument.modInstruments[mod]][setting] = val;
						this.nextModInsValues[channelAdjust][instrument.modInstruments[mod]][setting] = nextVal;
					}
					break;
				case ModSetting.mstNextBar:
					val = (this.song as Song).modValueToReal(volumeStart, setting);
					break;
				case ModSetting.mstNone:
				default:
					val = -1;
					break;
			}

			return val;
		}

		public getModValue(setting: ModSetting, forSong: boolean, channel?: number, instrument?: number, nextVal?: boolean): number {
			if (forSong) {
				if (this.modValues[setting] != null && this.nextModValues[setting] != null) {
					return nextVal ? this.nextModValues[setting]! : this.modValues[setting]!;
				}
			} else if (channel != undefined && instrument != undefined) {
				if (this.modInsValues[channel][instrument][setting] != null && this.nextModInsValues[channel][instrument][setting] != null) {
					return nextVal ? this.nextModInsValues[channel][instrument][setting]! : this.modInsValues[channel][instrument][setting]!;
				}
			}
			return -1;
		}

		// Checks if any mod is active for the given channel/instrument OR if any mod is active for the song scope. Could split the logic if needed later.
		public isAnyModActive(channel: number, instrument: number): boolean {
			for (let setting: number = 0; setting < ModSetting.mstMaxValue; setting++) {
				if ((this.modValues != undefined && this.modValues[setting] != null)
					|| (this.modInsValues != undefined && this.modInsValues[channel] != undefined && this.modInsValues[channel][instrument] != undefined && this.modInsValues[channel][instrument][setting] != null)) {
					return true;
				}
			}
			return false;
		}

		public unsetMod(setting: ModSetting, channel?: number, instrument?: number) {
			if (this.isModActive(setting, true) || (channel != undefined && instrument != undefined && this.isModActive(setting, false, channel, instrument))) {
				this.modValues[setting] = null;
				this.nextModValues[setting] = null;
				if (channel != undefined && instrument != undefined) {
					this.modInsValues[channel][instrument][setting] = null;
					this.nextModInsValues[channel][instrument][setting] = null;
				}
			}
		}

		public isModActive(setting: ModSetting, forSong: boolean, channel?: number, instrument?: number): boolean {
			if (forSong) {
				return (this.modValues != undefined && this.modValues[setting] != null);
			} else if (channel != undefined && instrument != undefined && this.modInsValues != undefined && this.modInsValues[channel] != null && this.modInsValues[channel][instrument] != null && this.modInsValues[channel][instrument][setting] != null) {
				return (this.modInsValues[channel][instrument][setting] != null);
			}
			return false;
		}
		
		private activateAudio(): void {
			if (this.audioCtx == null || this.scriptNode == null) {
				this.audioCtx = this.audioCtx || new (window.AudioContext || window.webkitAudioContext)();
				this.samplesPerSecond = this.audioCtx.sampleRate;
				this.scriptNode = this.audioCtx.createScriptProcessor ? this.audioCtx.createScriptProcessor(2048, 0, 2) : this.audioCtx.createJavaScriptNode(2048, 0, 2); // 2048, 0 input channels, 2 output channels
				this.scriptNode.onaudioprocess = this.audioProcessCallback;
				this.scriptNode.channelCountMode = 'explicit';
				this.scriptNode.channelInterpretation = 'speakers';
				this.scriptNode.connect(this.audioCtx.destination);
			}
			this.audioCtx.resume();
		}
		
		private deactivateAudio(): void {
			if (this.audioCtx != null && this.scriptNode != null) {
				this.scriptNode.disconnect(this.audioCtx.destination);
				this.scriptNode = null;
				if (this.audioCtx.close) this.audioCtx.close(); // firefox is missing this function?
				this.audioCtx = null;
			}
		}
		
		public maintainLiveInput(): void {
			this.activateAudio();
			this.liveInputEndTime = performance.now() + 10000.0;
		}
		
		public play(): void {
			if (this.isPlayingSong) return;
			this.isPlayingSong = true;
			this.warmUpSynthesizer(this.song);
			this.computeLatestModValues();
			this.activateAudio();
		}
		
		public pause(): void {
			if (!this.isPlayingSong) return;
			this.isPlayingSong = false;
			this.modValues = [];
			this.modInsValues = [];
			this.nextModValues = [];
			this.nextModInsValues = [];
		}

		public snapToStart(): void {
			this.bar = 0;
			this.snapToBar();
		}
		
		public goToBar(bar: number): void {
			this.bar = bar;
			this.playheadInternal = this.bar;
		}
		
		public snapToBar(): void {
			this.playheadInternal = this.bar;
			this.beat = 0;
			this.part = 0;
			this.tick = 0;
			this.tickSampleCountdown = 0;
		}
		
		public resetEffects(): void {
			this.reverbDelayPos = 0;
			this.reverbFeedback0 = 0.0;
			this.reverbFeedback1 = 0.0;
			this.reverbFeedback2 = 0.0;
			this.reverbFeedback3 = 0.0;
			//this.highpassInput = 0.0;
			//this.highpassOutput = 0.0;
			this.freeAllTones();
			for (let i: number = 0; i < this.reverbDelayLine.length; i++) this.reverbDelayLine[i] = 0.0;
			for (let i: number = 0; i < this.chorusDelayLine.length; i++) this.chorusDelayLine[i] = 0.0;
			if (this.samplesForNone != null) for (let i: number = 0; i < this.samplesForNone.length; i++) this.samplesForNone[i] = 0.0;
			if (this.samplesForReverb != null) for (let i: number = 0; i < this.samplesForReverb.length; i++) this.samplesForReverb[i] = 0.0;
			if (this.samplesForChorus != null) for (let i: number = 0; i < this.samplesForChorus.length; i++) this.samplesForChorus[i] = 0.0;
			if (this.samplesForChorusReverb != null) for (let i: number = 0; i < this.samplesForChorusReverb.length; i++) this.samplesForChorusReverb[i] = 0.0;
		}

		public jumpIntoLoop(): void {
			if (!this.song) return;
			if (this.bar < this.song.loopStart || this.bar >= this.song.loopStart + this.song.loopLength) {
				const oldBar: number = this.bar;
				this.bar = this.song.loopStart;
				this.playheadInternal += this.bar - oldBar;

				if (this.playing)
					this.computeLatestModValues();
			}
		}

		public nextBar(): void {
			if (!this.song) return;
			const oldBar: number = this.bar;
			this.bar++;
			if (this.bar >= this.song.barCount) {
				this.bar = 0;
			}
			this.playheadInternal += this.bar - oldBar;
			
			if (this.playing)
				this.computeLatestModValues();
		}

		public skipBar(): void {
			if (!this.song) return;
			const samplesPerTick: number = this.getSamplesPerTick();
			this.bar++;
			this.beat = 0;
			this.part = 0;
			this.tick = 0;
			this.tickSampleCountdown = samplesPerTick;

			if (this.loopRepeatCount != 0 && this.bar == this.song.loopStart + this.song.loopLength) {
				this.bar = this.song.loopStart;
				if (this.loopRepeatCount > 0) this.loopRepeatCount--;
			}

		}

		public firstBar(): void {
			if (!this.song) return;
			this.bar = 0;
			this.playheadInternal = 0;
			this.beat = 0;
			this.part = 0;

			if (this.playing)
			this.computeLatestModValues();
		}

		public jumpToEditingBar(bar: number): void {
			if (!this.song) return;

			this.bar = bar;

			this.playheadInternal = bar;
			this.beat = 0;
			this.part = 0;

			if (this.playing)
				this.computeLatestModValues();
		}

		public prevBar(): void {
			if (!this.song) return;
			const oldBar: number = this.bar;
			this.bar--;
			if (this.bar < 0 || this.bar >= this.song.barCount) {
				this.bar = this.song.barCount - 1;
			}
			this.playheadInternal += this.bar - oldBar;

			if (this.playing)
			this.computeLatestModValues();
		}

		private audioProcessCallback = (audioProcessingEvent: any): void => {
			const outputBuffer = audioProcessingEvent.outputBuffer;
			const outputDataL: Float32Array = outputBuffer.getChannelData(0);
			const outputDataR: Float32Array = outputBuffer.getChannelData(1);
			this.synthesize(outputDataL, outputDataR, outputBuffer.length);
		}

		public synthesize(outputDataL: Float32Array, outputDataR: Float32Array, outputBufferLength: number): void {
			const isPlayingLiveTones = performance.now() < this.liveInputEndTime;
			
			if ((!isPlayingLiveTones && !this.isPlayingSong) || this.song == null) {
				for (let i: number = 0; i < outputBufferLength; i++) {
					outputDataL[i] = 0.0;
					outputDataR[i] = 0.0;
				}
				this.deactivateAudio();
				return;
			}

			const channelCount: number = this.song.pitchChannelCount + this.song.noiseChannelCount;

			for (let i: number = this.activeTones.length; i < channelCount; i++) {
				this.activeTones[i] = new Deque<Tone>();
				this.releasedTones[i] = new Deque<Tone>();
			}
			this.activeTones.length = channelCount;
			this.releasedTones.length = channelCount;

			for (let i: number = this.activeModTones.length; i < this.song.modChannelCount; i++) {
				this.activeModTones[i] = [];
				//this.releasedModTones[i] = [];
				for (let mod: number = 0; mod < Config.modCount; mod++) {
					this.activeModTones[i][mod] = new Deque<Tone>();
					//this.releasedModTones[i][mod] = new Deque<Tone>();
				}
				this.activeModTones[i].length = Config.modCount;
				//this.releasedModTones[i].length = Config.modCount;
			}
			this.activeModTones.length = this.song.modChannelCount;
			//this.releasedModTones.length = this.song.modChannelCount;

			let samplesPerTick: number = this.getSamplesPerTick();
			let bufferIndex: number = 0;
			let ended: boolean = false;

			// Check the bounds of the playhead:
			if (this.tickSampleCountdown == 0 || this.tickSampleCountdown > samplesPerTick) {
				this.tickSampleCountdown = samplesPerTick;
			}
			if (this.isPlayingSong) {
				if (this.beat >= this.song.beatsPerBar) {
					this.bar++;
					this.beat = 0;
					this.part = 0;
					this.tick = 0;
					this.tickSampleCountdown = samplesPerTick;
				
					if (this.loopRepeatCount != 0 && this.bar == this.song.loopStart + this.song.loopLength) {
						this.bar = this.song.loopStart;
						if (this.loopRepeatCount > 0) this.loopRepeatCount--;
					}
				}
				if (this.bar >= this.song.barCount) {
					this.bar = 0;
					if (this.loopRepeatCount != -1) {
						ended = true;
						this.pause();
					}
				}
			}

			//const synthStartTime: number = performance.now();

			const stereoBufferLength: number = outputBufferLength * 4;
			if (this.samplesForNone == null || this.samplesForNone.length != stereoBufferLength ||
				this.samplesForReverb == null || this.samplesForReverb.length != stereoBufferLength ||
				this.samplesForChorus == null || this.samplesForChorus.length != stereoBufferLength ||
				this.samplesForChorusReverb == null || this.samplesForChorusReverb.length != stereoBufferLength)
			{
				this.samplesForNone = new Float32Array(stereoBufferLength);
				this.samplesForReverb = new Float32Array(stereoBufferLength);
				this.samplesForChorus = new Float32Array(stereoBufferLength);
				this.samplesForChorusReverb = new Float32Array(stereoBufferLength);
				this.stereoBufferIndex = 0;
			}
			let stereoBufferIndex: number = this.stereoBufferIndex;
			const samplesForNone: Float32Array = this.samplesForNone;
			const samplesForReverb: Float32Array = this.samplesForReverb;
			const samplesForChorus: Float32Array = this.samplesForChorus;
			const samplesForChorusReverb: Float32Array = this.samplesForChorusReverb;

			// Post processing parameters:
			const volume: number = +this.volume;
			const chorusDelayLine: Float32Array = this.chorusDelayLine;
			const reverbDelayLine: Float32Array = this.reverbDelayLine;
			const chorusDuration: number = 2.0;
			const chorusAngle: number = Math.PI * 2.0 / (chorusDuration * this.samplesPerSecond);
			const chorusRange: number = 150 * this.samplesPerSecond / 44100;
			const chorusOffset0: number = 0x800 - 1.51 * chorusRange;
			const chorusOffset1: number = 0x800 - 2.10 * chorusRange;
			const chorusOffset2: number = 0x800 - 3.35 * chorusRange;
			const chorusOffset3: number = 0x800 - 1.47 * chorusRange;
			const chorusOffset4: number = 0x800 - 2.15 * chorusRange;
			const chorusOffset5: number = 0x800 - 3.25 * chorusRange;
			let chorusPhase: number = this.chorusPhase % (Math.PI * 2.0);
			let chorusDelayPos: number = this.chorusDelayPos & 0x7FF;
			let reverbDelayPos: number = this.reverbDelayPos & 0x3FFF;
			let reverbFeedback0: number = +this.reverbFeedback0;
			let reverbFeedback1: number = +this.reverbFeedback1;
			let reverbFeedback2: number = +this.reverbFeedback2;
			let reverbFeedback3: number = +this.reverbFeedback3;
			let useReverb: number = this.song.reverb;
			if (this.isModActive(ModSetting.mstReverb, true)) {
				useReverb = this.getModValue(ModSetting.mstReverb, true);
			}
			const reverb: number = Math.pow(useReverb / Config.reverbRange, 0.667) * 0.425;
			//const highpassFilter: number = Math.pow(0.5, 400 / this.samplesPerSecond);
			const limitDecay: number = 1.0 - Math.pow(0.5, 4.0 / this.samplesPerSecond);
			const limitRise: number = 1.0 - Math.pow(0.5, 4000.0 / this.samplesPerSecond);
			//let highpassInput: number = +this.highpassInput;
			//let highpassOutput: number = +this.highpassOutput;
			let limit: number = +this.limit;

			while (bufferIndex < outputBufferLength && !ended) {

				const samplesLeftInBuffer: number = outputBufferLength - bufferIndex;
				const runLength: number = (this.tickSampleCountdown <= samplesLeftInBuffer)
					? this.tickSampleCountdown
					: samplesLeftInBuffer;

				for (let modChannel: number = 0, channel: number = this.song.pitchChannelCount + this.song.noiseChannelCount; modChannel < this.song.modChannelCount; modChannel++ , channel++) {
					// Also determines mod tones.
					this.determineCurrentActiveTones(this.song, channel);

					for (let mod: number = 0; mod < Config.modCount; mod++) {
						for (let i: number = 0; i < this.activeModTones[modChannel][mod].count(); i++) {
							const tone: Tone = this.activeModTones[modChannel][mod].get(i);

							if (this.song.channels[channel].muted == false)
								this.playTone(this.song, stereoBufferIndex, stereoBufferLength, channel, samplesPerTick, runLength, tone, false, false);
						}
					}
					// Could do released mod tones here too, but that functionality is unused currently.
					/* for (let i: number = 0; i < this.releasedModtones[channel].count(); i++) { ... */
				}

				for (let channel: number = 0; channel < this.song.pitchChannelCount + this.song.noiseChannelCount; channel++) {

					if (channel == this.liveInputChannel) {
						this.determineLiveInputTones(this.song);

						for (let i: number = 0; i < this.liveInputTones.count(); i++) {
							const tone: Tone = this.liveInputTones.get(i);
							// Hmm. Will allow active input from a muted channel for now.
							//if (this.song.channels[channel].muted == false)
							this.playTone(this.song, stereoBufferIndex, stereoBufferLength, channel, samplesPerTick, runLength, tone, false, false);
						}
					}

					if (this.song.channels[channel].muted == false) {
						this.determineCurrentActiveTones(this.song, channel);
						for (let i: number = 0; i < this.activeTones[channel].count(); i++) {
							const tone: Tone = this.activeTones[channel].get(i);
							this.playTone(this.song, stereoBufferIndex, stereoBufferLength, channel, samplesPerTick, runLength, tone, false, false);
						}
						for (let i: number = 0; i < this.releasedTones[channel].count(); i++) {
							const tone: Tone = this.releasedTones[channel].get(i);
							if (tone.ticksSinceReleased >= tone.instrument.getTransition().releaseTicks) {
								this.freeReleasedTone(channel, i);
								i--;
								continue;
							}

							const shouldFadeOutFast: boolean = (i + this.activeTones[channel].count() >= Config.maximumTonesPerChannel);

							this.playTone(this.song, stereoBufferIndex, stereoBufferLength, channel, samplesPerTick, runLength, tone, true, shouldFadeOutFast);
						}
					}
				}

				// Post processing:
				let chorusTap0Index: number = chorusDelayPos + chorusOffset0 - chorusRange * Math.sin(chorusPhase + 0);
				let chorusTap1Index: number = chorusDelayPos + chorusOffset1 - chorusRange * Math.sin(chorusPhase + 2.1);
				let chorusTap2Index: number = chorusDelayPos + chorusOffset2 - chorusRange * Math.sin(chorusPhase + 4.2);
				let chorusTap3Index: number = chorusDelayPos + 0x400 + chorusOffset3 - chorusRange * Math.sin(chorusPhase + 3.2);
				let chorusTap4Index: number = chorusDelayPos + 0x400 + chorusOffset4 - chorusRange * Math.sin(chorusPhase + 5.3);
				let chorusTap5Index: number = chorusDelayPos + 0x400 + chorusOffset5 - chorusRange * Math.sin(chorusPhase + 1.0);
				chorusPhase += chorusAngle * runLength;
				const chorusTap0End: number = chorusDelayPos + runLength + chorusOffset0 - chorusRange * Math.sin(chorusPhase + 0);
				const chorusTap1End: number = chorusDelayPos + runLength + chorusOffset1 - chorusRange * Math.sin(chorusPhase + 2.1);
				const chorusTap2End: number = chorusDelayPos + runLength + chorusOffset2 - chorusRange * Math.sin(chorusPhase + 4.2);
				const chorusTap3End: number = chorusDelayPos + runLength + 0x400 + chorusOffset3 - chorusRange * Math.sin(chorusPhase + 3.2);
				const chorusTap4End: number = chorusDelayPos + runLength + 0x400 + chorusOffset4 - chorusRange * Math.sin(chorusPhase + 5.3);
				const chorusTap5End: number = chorusDelayPos + runLength + 0x400 + chorusOffset5 - chorusRange * Math.sin(chorusPhase + 1.0);
				const chorusTap0Delta: number = (chorusTap0End - chorusTap0Index) / runLength;
				const chorusTap1Delta: number = (chorusTap1End - chorusTap1Index) / runLength;
				const chorusTap2Delta: number = (chorusTap2End - chorusTap2Index) / runLength;
				const chorusTap3Delta: number = (chorusTap3End - chorusTap3Index) / runLength;
				const chorusTap4Delta: number = (chorusTap4End - chorusTap4Index) / runLength;
				const chorusTap5Delta: number = (chorusTap5End - chorusTap5Index) / runLength;
				const runEnd: number = bufferIndex + runLength;
				for (let i: number = bufferIndex; i < runEnd; i++) {
					const bufferIndexL: number = stereoBufferIndex;
					const bufferIndexR: number = stereoBufferIndex + 1;
					const sampleForNoneL: number = samplesForNone[bufferIndexL]; samplesForNone[bufferIndexL] = 0.0;
					const sampleForNoneR: number = samplesForNone[bufferIndexR]; samplesForNone[bufferIndexR] = 0.0;
					const sampleForReverbL: number = samplesForReverb[bufferIndexL]; samplesForReverb[bufferIndexL] = 0.0;
					const sampleForReverbR: number = samplesForReverb[bufferIndexR]; samplesForReverb[bufferIndexR] = 0.0;
					const sampleForChorusL: number = samplesForChorus[bufferIndexL]; samplesForChorus[bufferIndexL] = 0.0;
					const sampleForChorusR: number = samplesForChorus[bufferIndexR]; samplesForChorus[bufferIndexR] = 0.0;
					const sampleForChorusReverbL: number = samplesForChorusReverb[bufferIndexL]; samplesForChorusReverb[bufferIndexL] = 0.0;
					const sampleForChorusReverbR: number = samplesForChorusReverb[bufferIndexR]; samplesForChorusReverb[bufferIndexR] = 0.0;
					stereoBufferIndex += 2;

					const combinedChorusL: number = sampleForChorusL + sampleForChorusReverbL;
					const combinedChorusR: number = sampleForChorusR + sampleForChorusReverbR;

					const chorusTap0Ratio: number = chorusTap0Index % 1;
					const chorusTap1Ratio: number = chorusTap1Index % 1;
					const chorusTap2Ratio: number = chorusTap2Index % 1;
					const chorusTap3Ratio: number = chorusTap3Index % 1;
					const chorusTap4Ratio: number = chorusTap4Index % 1;
					const chorusTap5Ratio: number = chorusTap5Index % 1;
					const chorusTap0A: number = chorusDelayLine[(chorusTap0Index) & 0x7FF];
					const chorusTap0B: number = chorusDelayLine[(chorusTap0Index + 1) & 0x7FF];
					const chorusTap1A: number = chorusDelayLine[(chorusTap1Index) & 0x7FF];
					const chorusTap1B: number = chorusDelayLine[(chorusTap1Index + 1) & 0x7FF];
					const chorusTap2A: number = chorusDelayLine[(chorusTap2Index) & 0x7FF];
					const chorusTap2B: number = chorusDelayLine[(chorusTap2Index + 1) & 0x7FF];
					const chorusTap3A: number = chorusDelayLine[(chorusTap3Index) & 0x7FF];
					const chorusTap3B: number = chorusDelayLine[(chorusTap3Index + 1) & 0x7FF];
					const chorusTap4A: number = chorusDelayLine[(chorusTap4Index) & 0x7FF];
					const chorusTap4B: number = chorusDelayLine[(chorusTap4Index + 1) & 0x7FF];
					const chorusTap5A: number = chorusDelayLine[(chorusTap5Index) & 0x7FF];
					const chorusTap5B: number = chorusDelayLine[(chorusTap5Index + 1) & 0x7FF];
					const chorusTap0: number = chorusTap0A + (chorusTap0B - chorusTap0A) * chorusTap0Ratio;
					const chorusTap1: number = chorusTap1A + (chorusTap1B - chorusTap1A) * chorusTap1Ratio;
					const chorusTap2: number = chorusTap2A + (chorusTap2B - chorusTap2A) * chorusTap2Ratio;
					const chorusTap3: number = chorusTap3A + (chorusTap3B - chorusTap3A) * chorusTap3Ratio;
					const chorusTap4: number = chorusTap4A + (chorusTap4B - chorusTap4A) * chorusTap4Ratio;
					const chorusTap5: number = chorusTap5A + (chorusTap5B - chorusTap5A) * chorusTap5Ratio;
					const chorusSampleL = 0.5 * (combinedChorusL - chorusTap0 + chorusTap1 - chorusTap2);
					const chorusSampleR = 0.5 * (combinedChorusR - chorusTap3 + chorusTap4 - chorusTap5);
					chorusDelayLine[chorusDelayPos] = combinedChorusL;
					chorusDelayLine[(chorusDelayPos + 0x400) & 0x7FF] = combinedChorusR;
					chorusDelayPos = (chorusDelayPos + 1) & 0x7FF;
					chorusTap0Index += chorusTap0Delta;
					chorusTap1Index += chorusTap1Delta;
					chorusTap2Index += chorusTap2Delta;
					chorusTap3Index += chorusTap3Delta;
					chorusTap4Index += chorusTap4Delta;
					chorusTap5Index += chorusTap5Delta;

					// Reverb, implemented using a feedback delay network with a Hadamard matrix and lowpass filters.
					// good ratios:    0.555235 + 0.618033 + 0.818 +   1.0 = 2.991268
					// Delay lengths:  3041     + 3385     + 4481  +  5477 = 16384 = 2^14
					// Buffer offsets: 3041    -> 6426   -> 10907 -> 16384
					const reverbDelayPos1: number = (reverbDelayPos + 3041) & 0x3FFF;
					const reverbDelayPos2: number = (reverbDelayPos + 6426) & 0x3FFF;
					const reverbDelayPos3: number = (reverbDelayPos + 10907) & 0x3FFF;
					const reverbSample0: number = (reverbDelayLine[reverbDelayPos]);
					const reverbSample1: number = reverbDelayLine[reverbDelayPos1];
					const reverbSample2: number = reverbDelayLine[reverbDelayPos2];
					const reverbSample3: number = reverbDelayLine[reverbDelayPos3];
					const reverbTemp0: number = -(reverbSample0 + sampleForChorusReverbL + sampleForReverbL) + reverbSample1;
					const reverbTemp1: number = -(reverbSample0 + sampleForChorusReverbR + sampleForReverbR) - reverbSample1;
					const reverbTemp2: number = -reverbSample2 + reverbSample3;
					const reverbTemp3: number = -reverbSample2 - reverbSample3;
					reverbFeedback0 += ((reverbTemp0 + reverbTemp2) * reverb - reverbFeedback0) * 0.5;
					reverbFeedback1 += ((reverbTemp1 + reverbTemp3) * reverb - reverbFeedback1) * 0.5;
					reverbFeedback2 += ((reverbTemp0 - reverbTemp2) * reverb - reverbFeedback2) * 0.5;
					reverbFeedback3 += ((reverbTemp1 - reverbTemp3) * reverb - reverbFeedback3) * 0.5;
					reverbDelayLine[reverbDelayPos1] = reverbFeedback0;
					reverbDelayLine[reverbDelayPos2] = reverbFeedback1;
					reverbDelayLine[reverbDelayPos3] = reverbFeedback2;
					reverbDelayLine[reverbDelayPos] = reverbFeedback3;
					reverbDelayPos = (reverbDelayPos + 1) & 0x3FFF;

					const sampleL = sampleForNoneL + chorusSampleL + sampleForReverbL + reverbSample1 + reverbSample2 + reverbSample3;
					const sampleR = sampleForNoneR + chorusSampleR + sampleForReverbR + reverbSample0 + reverbSample2 - reverbSample3;

					/*
					highpassOutput = highpassOutput * highpassFilter + sample - highpassInput;
					highpassInput = sample;
					// use highpassOutput instead of sample below?
					*/

					// A compressor/limiter.
					const absL: number = sampleL < 0.0 ? -sampleL : sampleL;
					const absR: number = sampleR < 0.0 ? -sampleR : sampleR;
					const abs: number = absL > absR ? absL : absR;
					limit += (abs - limit) * (limit < abs ? limitRise : limitDecay);
					const limitedVolume = volume / (limit >= 1 ? limit * 1.05 : limit * 0.8 + 0.25);
					outputDataL[i] = sampleL * limitedVolume;
					outputDataR[i] = sampleR * limitedVolume;
				}

				bufferIndex += runLength;

				this.tickSampleCountdown -= runLength;
				if (this.tickSampleCountdown <= 0) {

					// Track how long tones have been released, and free them if there are too many.
					for (let channel: number = 0; channel < this.song.pitchChannelCount + this.song.noiseChannelCount; channel++) {
						for (let i: number = 0; i < this.releasedTones[channel].count(); i++) {
							const tone: Tone = this.releasedTones[channel].get(i);
							tone.ticksSinceReleased++;

							const shouldFadeOutFast: boolean = (i + this.activeTones[channel].count() >= Config.maximumTonesPerChannel);
							if (shouldFadeOutFast) {
								this.freeReleasedTone(channel, i);
								i--;
							}
						}
					}

					this.tick++;
					this.tickSampleCountdown = samplesPerTick;
					if (this.tick == Config.ticksPerPart) {
						this.tick = 0;
						this.part++;
						this.liveInputDuration--;
						// Check if any active tones should be released.
						for (let channel: number = 0; channel < this.song.pitchChannelCount + this.song.noiseChannelCount; channel++) {
							for (let i: number = 0; i < this.activeTones[channel].count(); i++) {
								const tone: Tone = this.activeTones[channel].get(i);
								const transition: Transition = tone.instrument.getTransition();
								if (!transition.isSeamless && tone.note != null && tone.note.end == this.part + this.beat * Config.partsPerBeat) {
									if (transition.releases) {
										this.releaseTone(channel, tone);
									} else {
										this.freeTone(tone);
									}
									this.activeTones[channel].remove(i);
									i--;
								}
							}
						}

						for (let channel: number = 0; channel < this.song.modChannelCount; channel++) {
							for (let mod: number = 0; mod < Config.modCount; mod++) {
								for (let i: number = 0; i < this.activeModTones[channel][mod].count(); i++) {
									const tone: Tone = this.activeModTones[channel][mod].get(i);
									const transition: Transition = tone.instrument.getTransition();
									if (!transition.isSeamless && tone.note != null && tone.note.end == this.part + this.beat * Config.partsPerBeat) {
										this.freeTone(tone);
										this.activeModTones[channel][mod].remove(i);
										i--;
									}
								}
							}
						}

						if (this.part == Config.partsPerBeat) {
							this.part = 0;
							
							if (this.isPlayingSong) {
								this.beat++;
								if (this.beat == this.song.beatsPerBar) {
									// bar changed, reset for next bar:
									this.beat = 0;
									this.bar++;
									if (this.loopRepeatCount != 0 && this.bar == this.song.loopStart + this.song.loopLength) {
										this.bar = this.song.loopStart;
										if (this.loopRepeatCount > 0) this.loopRepeatCount--;
									}
									if (this.bar >= this.song.barCount) {
										this.bar = 0;
										if (this.loopRepeatCount != -1) {
											ended = true;
											this.resetEffects();
											this.pause();
										}
									}
								}
							}
						}
					}
				}

				// Update mod values so that next values copy to current values
				for (let setting: number = 0; setting < ModSetting.mstMaxValue; setting++) {
					if (this.nextModValues != null && this.nextModValues[setting] != null)
						this.modValues[setting] = this.nextModValues[setting];
				}

				// Set samples per tick if song tempo mods changed it
				if (this.isModActive(ModSetting.mstTempo, true)) {
					samplesPerTick = this.getSamplesPerTick();
				}

				for (let setting: number = 0; setting < ModSetting.mstMaxValue; setting++) {
					for (let channel: number = 0; channel < channelCount; channel++) {
						for (let instrument: number = 0; instrument < this.song.instrumentsPerChannel; instrument++) {
							if (this.nextModInsValues != null && this.nextModInsValues[channel] != null && this.nextModInsValues[channel][instrument] != null && this.nextModInsValues[channel][instrument][setting] != null) {
								this.modInsValues[channel][instrument][setting] = this.nextModInsValues[channel][instrument][setting];
							}
						}
					}
				}
			}

			// Optimization: Avoid persistent reverb values in the float denormal range.
			const epsilon: number = (1.0e-24);
			if (-epsilon < reverbFeedback0 && reverbFeedback0 < epsilon) reverbFeedback0 = 0.0;
			if (-epsilon < reverbFeedback1 && reverbFeedback1 < epsilon) reverbFeedback1 = 0.0;
			if (-epsilon < reverbFeedback2 && reverbFeedback2 < epsilon) reverbFeedback2 = 0.0;
			if (-epsilon < reverbFeedback3 && reverbFeedback3 < epsilon) reverbFeedback3 = 0.0;
			//if (-epsilon < highpassInput && highpassInput < epsilon) highpassInput = 0.0;
			//if (-epsilon < highpassOutput && highpassOutput < epsilon) highpassOutput = 0.0;
			if (-epsilon < limit && limit < epsilon) limit = 0.0;

			this.stereoBufferIndex = (this.stereoBufferIndex + outputBufferLength * 2) % stereoBufferLength;
			this.chorusPhase = chorusPhase;
			this.chorusDelayPos = chorusDelayPos;
			this.reverbDelayPos = reverbDelayPos;
			this.reverbFeedback0 = reverbFeedback0;
			this.reverbFeedback1 = reverbFeedback1;
			this.reverbFeedback2 = reverbFeedback2;
			this.reverbFeedback3 = reverbFeedback3;
			//this.highpassInput = highpassInput;
			//this.highpassOutput = highpassOutput;
			this.limit = limit;
			
			if (this.isPlayingSong) {
				this.playheadInternal = (((this.tick + 1.0 - this.tickSampleCountdown / samplesPerTick) / 2.0 + this.part) / Config.partsPerBeat + this.beat) / this.song.beatsPerBar + this.bar;
			}
			
			/*
			const synthDuration: number = performance.now() - synthStartTime;
			// Performance measurements:
			samplesAccumulated += outputBufferLength;
			samplePerformance += synthDuration;
			
			if (samplesAccumulated >= 44100 * 4) {
				const secondsGenerated = samplesAccumulated / 44100;
				const secondsRequired = samplePerformance / 1000;
				const ratio = secondsRequired / secondsGenerated;
				console.log(ratio);
				samplePerformance = 0;
				samplesAccumulated = 0;
			}
			*/
		}

		private freeTone(tone: Tone): void {
			this.tonePool.pushBack(tone);
		}

		private newTone(): Tone {
			if (this.tonePool.count() > 0) {
				const tone: Tone = this.tonePool.popBack();
				tone.reset();
				tone.active = false;
				return tone;
			}
			return new Tone();
		}

		private releaseTone(channel: number, tone: Tone): void {
			if (this.song == null || !this.song.getChannelIsMod(channel)) {
				this.releasedTones[channel].pushFront(tone);
			}
			else {
				/*
				for (let mod = 0; mod < Config.modCount; mod++) {
					this.releasedModTones[channel - (this.song.pitchChannelCount + this.song.noiseChannelCount)][mod].pushFront(tone);
				}
				*/
			}
		}

		private freeReleasedTone(channel: number, toneIndex: number): void {
			if (this.song == null || !this.song.getChannelIsMod(channel)) {
				this.freeTone(this.releasedTones[channel].get(toneIndex));
				this.releasedTones[channel].remove(toneIndex);
			} else {
				/*
				for (let mod = 0; mod < Config.modCount; mod++) {
					this.freeTone(this.releasedModTones[channel - (this.song.pitchChannelCount + this.song.noiseChannelCount)][mod].get(toneIndex));
					this.releasedModTones[channel][mod].remove(toneIndex);
				}
				*/
			}
		}
		
		public freeAllTones(): void {
			while (this.liveInputTones.count() > 0) {
				this.freeTone(this.liveInputTones.popBack());
			}
			for (let i: number = 0; i < this.activeTones.length; i++) {
				while (this.activeTones[i].count() > 0) {
					this.freeTone(this.activeTones[i].popBack());
				}
			}
			for (let i: number = 0; i < this.releasedTones.length; i++) {
				while (this.releasedTones[i].count() > 0) {
					this.freeTone(this.releasedTones[i].popBack());
				}
			}
			for (let i = 0; i < this.activeModTones.length; i++) {
				for (let mod = 0; mod < this.activeModTones[i].length; mod++) {
					while (this.activeModTones[i][mod].count() > 0) {
						this.freeTone(this.activeModTones[i][mod].popBack());
					}
				}
			}
			/*
			for (let i = 0; i < this.releasedModTones.length; i++) {
				for (let mod = 0; mod < this.releasedModTones[i].length; mod++) {
					while (this.releasedModTones[i][mod].count() > 0) {
						this.freeTone(this.releasedModTones[i][mod].popBack());
					}
				}
			}
			*/
		}
		
		private determineLiveInputTones(song: Song): void {
			const toneList: Deque<Tone> = this.liveInputTones;
			const pitches: number[] = this.liveInputPitches;
			let toneCount: number = 0;
			if (this.liveInputDuration > 0) {
				const instrument: Instrument = song.channels[this.liveInputChannel].instruments[song.getPatternInstrument(this.liveInputChannel, this.bar)];
				
				if (instrument.getChord().arpeggiates) {
					let tone: Tone;
					if (toneList.count() == 0) {
						tone = this.newTone();
						toneList.pushBack(tone);
					} else if (!instrument.getTransition().isSeamless && this.liveInputStarted) {
						this.releaseTone(this.liveInputChannel, toneList.popFront());
						tone = this.newTone();
						toneList.pushBack(tone);
					} else {
						tone = toneList.get(0);
					}
					toneCount = 1;
				
					for (let i: number = 0; i < pitches.length; i++) {
						tone.pitches[i] = pitches[i];
					}
					tone.pitchCount = pitches.length;
					tone.chordSize = 1;
					tone.instrument = instrument;
					tone.note = tone.prevNote = tone.nextNote = null;
				} else {
					//const transition: Transition = instrument.getTransition();
					for (let i: number = 0; i < pitches.length; i++) {
						//const strumOffsetParts: number = i * instrument.getChord().strumParts;

						let tone: Tone;
						if (toneList.count() <= i) {
							tone = this.newTone();
							toneList.pushBack(tone);
						} else if (!instrument.getTransition().isSeamless && this.liveInputStarted) {
							this.releaseTone(this.liveInputChannel, toneList.get(i));
							tone = this.newTone();
							toneList.set(i, tone);
						} else {
							tone = toneList.get(i);
						}
						toneCount++;

						tone.pitches[0] = pitches[i];
						tone.pitchCount = 1;
						tone.chordSize = pitches.length;
						tone.instrument = instrument;
						tone.note = tone.prevNote = tone.nextNote = null;
					}
				}
			}
			
			while (toneList.count() > toneCount) {
				this.releaseTone(this.liveInputChannel, toneList.popBack());
			}
			
			this.liveInputStarted = false;
		}

		private determineCurrentActiveTones(song: Song, channel: number): void {
			const instrument: Instrument = song.channels[channel].instruments[song.getPatternInstrument(channel, this.bar)];
			const pattern: Pattern | null = song.getPattern(channel, this.bar);
			const time: number = this.part + this.beat * Config.partsPerBeat;

			if (this.song != null && song.getChannelIsMod(channel) && this.isPlayingSong) {
				// Offset channel (first mod channel is 0 index in mod tone array)
				let modChannelIdx = channel - (song.pitchChannelCount + song.noiseChannelCount);

				// For mod channels, notes aren't strictly arranged chronologically. Also, each pitch value could play or not play at a given time. So... a bit more computation involved!
				// The same transition logic should apply though, even though it isn't really used by mod channels.
				let notes: (Note | null)[] = [];
				let prevNotes: (Note | null)[] = [];
				let nextNotes: (Note | null)[] = [];
				let fillCount: number = Config.modCount;
				while (fillCount--) {
					notes.push(null);
					prevNotes.push(null);
					nextNotes.push(null);
				}

				if (pattern != null) {
					for (let i: number = 0; i < pattern.notes.length; i++) {
						if (pattern.notes[i].end <= time) {
							// Actually need to check which note starts closer to the start of this note.
							if (prevNotes[pattern.notes[i].pitches[0]] == null || pattern.notes[i].end > (prevNotes[pattern.notes[i].pitches[0]] as Note).start) {
								prevNotes[pattern.notes[i].pitches[0]] = pattern.notes[i];
							}
						}
						else if (pattern.notes[i].start <= time && pattern.notes[i].end > time) {
							notes[pattern.notes[i].pitches[0]] = pattern.notes[i];
						}
						else if (pattern.notes[i].start > time) {
							// Actually need to check which note starts closer to the end of this note.
							if (nextNotes[pattern.notes[i].pitches[0]] == null || pattern.notes[i].start < (nextNotes[pattern.notes[i].pitches[0]] as Note).start) {
								nextNotes[pattern.notes[i].pitches[0]] = pattern.notes[i];
							}
						}
					}
				}

				for (let mod: number = 0; mod < Config.modCount; mod++) {
					const toneList: Deque<Tone> = this.activeModTones[modChannelIdx][mod];
					if (notes[mod] != null) {
						if (prevNotes[mod] != null && (prevNotes[mod] as Note).end != (notes[mod] as Note).start) prevNotes[mod] = null;
						if (nextNotes[mod] != null && (nextNotes[mod] as Note).start != (notes[mod] as Note).end) nextNotes[mod] = null;
						this.syncTones(channel, toneList, instrument, (notes[mod] as Note).pitches, (notes[mod] as Note), (prevNotes[mod] as Note), (nextNotes[mod] as Note), time);
					} else {
						while (toneList.count() > 0) {
							// Automatically free or release seamless tones if there's no new note to take over.
							if (toneList.peakBack().instrument.getTransition().releases) {
								this.releaseTone(channel, toneList.popBack());
							} else {
								this.freeTone(toneList.popBack());
							}
						}
					}
				}
			}
			else if (!song.getChannelIsMod(channel)) {

				let note: Note | null = null;
				let prevNote: Note | null = null;
				let nextNote: Note | null = null;

				if (this.isPlayingSong && pattern != null && !song.channels[channel].muted) {
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

				const toneList: Deque<Tone> = this.activeTones[channel];
				if (note != null) {
					if (prevNote != null && prevNote.end != note.start) prevNote = null;
					if (nextNote != null && nextNote.start != note.end) nextNote = null;
					this.syncTones(channel, toneList, instrument, note.pitches, note, prevNote, nextNote, time);
				} else {
					while (toneList.count() > 0) {
						// Automatically free or release seamless tones if there's no new note to take over.
						if (toneList.peakBack().instrument.getTransition().releases) {
							this.releaseTone(channel, toneList.popBack());
						} else {
							this.freeTone(toneList.popBack());
						}
					}
				}
			}
		}
		
		private syncTones(channel: number, toneList: Deque<Tone>, instrument: Instrument, pitches: number[], note: Note, prevNote: Note | null, nextNote: Note | null, currentPart: number): void {
			let toneCount: number = 0;
			if (instrument.getChord().arpeggiates) {
				let tone: Tone;
				if (toneList.count() == 0) {
					tone = this.newTone();
					toneList.pushBack(tone);
				} else {
					tone = toneList.get(0);
				}
				toneCount = 1;

				for (let i: number = 0; i < pitches.length; i++) {
					tone.pitches[i] = pitches[i];
				}
				tone.pitchCount = pitches.length;
				tone.chordSize = 1;
				tone.instrument = instrument;
				tone.note = note;
				tone.noteStart = note.start;
				tone.noteEnd = note.end;
				tone.prevNote = prevNote;
				tone.nextNote = nextNote;
				tone.prevNotePitchIndex = 0;
				tone.nextNotePitchIndex = 0;
			} else {
				const transition: Transition = instrument.getTransition();
				for (let i: number = 0; i < pitches.length; i++) {

					const strumOffsetParts: number = i * instrument.getChord().strumParts;
					let prevNoteForThisTone: Note | null = (prevNote && prevNote.pitches.length > i) ? prevNote : null;
					let noteForThisTone: Note = note;
					let nextNoteForThisTone: Note | null = (nextNote && nextNote.pitches.length > i) ? nextNote : null;
					let noteStart: number = noteForThisTone.start + strumOffsetParts;

					if (noteStart > currentPart) {
						if (toneList.count() > i && transition.isSeamless && prevNoteForThisTone != null) {
							nextNoteForThisTone = noteForThisTone;
							noteForThisTone = prevNoteForThisTone;
							prevNoteForThisTone = null;
							noteStart = noteForThisTone.start + strumOffsetParts;
						} else {
							break;
						}
					}

					let noteEnd: number = noteForThisTone.end;
					if (transition.isSeamless && nextNoteForThisTone != null) {
						noteEnd = Math.min(Config.partsPerBeat * this.song!.beatsPerBar, noteEnd + strumOffsetParts);
					}

					let tone: Tone;
					if (toneList.count() <= i) {
						tone = this.newTone();
						toneList.pushBack(tone);
					} else {
						tone = toneList.get(i);
					}
					toneCount++;

					tone.pitches[0] = noteForThisTone.pitches[i];
					tone.pitchCount = 1;
					tone.chordSize = noteForThisTone.pitches.length;
					tone.instrument = instrument;
					tone.note = noteForThisTone;
					tone.noteStart = noteStart;
					tone.noteEnd = noteEnd;
					tone.prevNote = prevNoteForThisTone;
					tone.nextNote = nextNoteForThisTone;
					tone.prevNotePitchIndex = i;
					tone.nextNotePitchIndex = i;
				}
			}
			while (toneList.count() > toneCount) {
				// Automatically free or release seamless tones if there's no new note to take over.
				if (toneList.peakBack().instrument.getTransition().releases) {
					this.releaseTone(channel, toneList.popBack());
				} else {
					this.freeTone(toneList.popBack());
				}
			}
		}
		
		private playTone(song: Song, stereoBufferIndex: number, stereoBufferLength: number, channel: number, samplesPerTick: number, runLength: number, tone: Tone, released: boolean, shouldFadeOutFast: boolean): void {
			Synth.computeTone(this, song, channel, samplesPerTick, runLength, tone, released, shouldFadeOutFast);
			let synthBuffer: Float32Array;
			switch (tone.instrument.effects) {
				case 0: synthBuffer = this.samplesForNone!; break;
				case 1: synthBuffer = this.samplesForReverb!; break;
				case 2: synthBuffer = this.samplesForChorus!; break;
				case 3: synthBuffer = this.samplesForChorusReverb!; break;
				default: throw new Error();
			}
			const synthesizer: Function = Synth.getInstrumentSynthFunction(tone.instrument);
			synthesizer(this, synthBuffer, stereoBufferIndex, stereoBufferLength, runLength * 2, tone, tone.instrument);
		}

		private static computeEnvelope(envelope: Envelope, time: number, beats: number, customVolume: number): number {
			switch (envelope.type) {
				case EnvelopeType.custom: return customVolume;
				case EnvelopeType.steady: return 1.0;
				case EnvelopeType.twang:
					return 1.0 / (1.0 + time * envelope.speed);
				case EnvelopeType.swell:
					return 1.0 - 1.0 / (1.0 + time * envelope.speed);
				case EnvelopeType.tremolo:
					return 0.5 - Math.cos(beats * 2.0 * Math.PI * envelope.speed) * 0.5;
				case EnvelopeType.tremolo2:
					return 0.75 - Math.cos(beats * 2.0 * Math.PI * envelope.speed) * 0.25;
				case EnvelopeType.punch:
					return Math.max(1.0, 2.0 - time * 10.0);
				case EnvelopeType.flare:
					const speed: number = envelope.speed;
					const attack: number = 0.25 / Math.sqrt(speed);
					return time < attack ? time / attack : 1.0 / (1.0 + (time - attack) * speed);
				case EnvelopeType.decay:
					return Math.pow(2, -envelope.speed * time);
				default: throw new Error("Unrecognized operator envelope type.");
			}
		}

		private static computeChordVolume(chordSize: number): number {
			return 1.0 / ((chordSize - 1) * 0.25 + 1.0);
		}

		private static computeTone(synth: Synth, song: Song, channel: number, samplesPerTick: number, runLength: number, tone: Tone, released: boolean, shouldFadeOutFast: boolean): void {
			const instrument: Instrument = tone.instrument;
			const transition: Transition = instrument.getTransition();
			const chord: Chord = instrument.getChord();
			const chordVolume: number = chord.arpeggiates ? 1 : Synth.computeChordVolume(tone.chordSize);
			const isNoiseChannel: boolean = song.getChannelIsNoise(channel);
			const intervalScale: number = isNoiseChannel ? Config.noiseInterval : 1;
			const secondsPerPart: number = Config.ticksPerPart * samplesPerTick / synth.samplesPerSecond;
			const beatsPerPart: number = 1.0 / Config.partsPerBeat;
			const toneWasActive: boolean = tone.active;
			const tickSampleCountdown: number = synth.tickSampleCountdown;
			const startRatio: number = 1.0 - (tickSampleCountdown) / samplesPerTick;
			const endRatio: number = 1.0 - (tickSampleCountdown - runLength) / samplesPerTick;
			const ticksIntoBar: number = (synth.beat * Config.partsPerBeat + synth.part) * Config.ticksPerPart + synth.tick;
			const partTimeTickStart: number = (ticksIntoBar) / Config.ticksPerPart;
			const partTimeTickEnd: number = (ticksIntoBar + 1) / Config.ticksPerPart;
			const partTimeStart: number = partTimeTickStart + (partTimeTickEnd - partTimeTickStart) * startRatio;
			const partTimeEnd: number = partTimeTickStart + (partTimeTickEnd - partTimeTickStart) * endRatio;
			const instrumentIdx: number = (synth.song as Song).channels[channel].instruments.findIndex(i => i == instrument);

			tone.phaseDeltaScale = 0.0;
			tone.filter = 1.0;
			tone.filterScale = 1.0;
			tone.vibratoScale = 0.0;
			tone.intervalMult = 1.0;
			tone.intervalVolumeMult = 1.0;
			tone.active = false;

			let startPan: number = instrument.pan;
			let endPan: number = instrument.pan;
			if (synth.isModActive(ModSetting.mstPan, false, channel, instrumentIdx)) {
				startPan = synth.getModValue(ModSetting.mstPan, false, channel, instrumentIdx, false);
				endPan = synth.getModValue(ModSetting.mstPan, false, channel, instrumentIdx, true);
			}

			const useStartPan: number = (startPan - Config.panCenter) / Config.panCenter;
			const useEndPan: number = (endPan - Config.panCenter) / Config.panCenter;
			const maxDelay: number = 0.0013 * synth.samplesPerSecond;
			tone.stereoDelayStart = -useStartPan * maxDelay;
			const delayEnd: number = -useEndPan * maxDelay;
			tone.stereoDelayDelta = (delayEnd - tone.stereoDelayStart) / runLength;
			tone.stereoVolumeLStart = Math.cos((1 + useStartPan) * Math.PI * 0.25) * 1.414;
			tone.stereoVolumeRStart = Math.cos((1 - useStartPan) * Math.PI * 0.25) * 1.414;
			const stereoVolumeLEnd: number = Math.cos((1 + useEndPan) * Math.PI * 0.25) * 1.414;
			const stereoVolumeREnd: number = Math.cos((1 - useEndPan) * Math.PI * 0.25) * 1.414;
			tone.stereoVolumeLDelta = (stereoVolumeLEnd - tone.stereoVolumeLStart) / runLength;
			tone.stereoVolumeRDelta = (stereoVolumeREnd - tone.stereoVolumeRStart) / runLength;

			let resetPhases: boolean = true;
			let partsSinceStart: number = 0.0;
			let intervalStart: number = 0.0;
			let intervalEnd: number = 0.0;
			let transitionVolumeStart: number = 1.0;
			let transitionVolumeEnd: number = 1.0;
			let chordVolumeStart: number = chordVolume;
			let chordVolumeEnd: number = chordVolume;
			let customVolumeStart: number = 0.0;
			let customVolumeEnd: number = 0.0;
			let decayTimeStart: number = 0.0;
			let decayTimeEnd: number = 0.0;

			let volumeReferencePitch: number;
			let basePitch: number;
			let baseVolume: number;
			let pitchDamping: number;
			if (instrument.type == InstrumentType.spectrum) {
				if (isNoiseChannel) {
					basePitch = Config.spectrumBasePitch;
					baseVolume = 0.6; // Note: spectrum is louder for drum channels than pitch channels!
				} else {
					basePitch = Config.keys[song.key].basePitch;
					baseVolume = 0.3;
				}
				volumeReferencePitch = Config.spectrumBasePitch;
				pitchDamping = 28;
			} else if (instrument.type == InstrumentType.drumset) {
				basePitch = Config.spectrumBasePitch;
				baseVolume = 0.45;
				volumeReferencePitch = basePitch;
				pitchDamping = 48;
			} else if (instrument.type == InstrumentType.noise) {
				basePitch = Config.chipNoises[instrument.chipNoise].basePitch;
				baseVolume = 0.19;
				volumeReferencePitch = basePitch;
				pitchDamping = Config.chipNoises[instrument.chipNoise].isSoft ? 24.0 : 60.0;
			} else if (instrument.type == InstrumentType.fm) {
				basePitch = Config.keys[song.key].basePitch;
				baseVolume = 0.03;
				volumeReferencePitch = 16;
				pitchDamping = 48;
			} else if (instrument.type == InstrumentType.chip || instrument.type == InstrumentType.customChipWave) {
				basePitch = Config.keys[song.key].basePitch;
				baseVolume = 0.03375; // looks low compared to drums, but it's doubled for chorus and drums tend to be loud anyway.
				volumeReferencePitch = 16;
				pitchDamping = 48;
			} else if (instrument.type == InstrumentType.harmonics) {
				basePitch = Config.keys[song.key].basePitch;
				baseVolume = 0.025;
				volumeReferencePitch = 16;
				pitchDamping = 48;
			} else if (instrument.type == InstrumentType.pwm) {
				basePitch = Config.keys[song.key].basePitch;
				baseVolume = 0.04725;
				volumeReferencePitch = 16;
				pitchDamping = 48;
			} else if (instrument.type == InstrumentType.mod) {
				baseVolume = 1.0;
				volumeReferencePitch = 0;
				pitchDamping = 1.0;
				basePitch = 0;
			} else {
				throw new Error("Unknown instrument type in computeTone.");
			}

			for (let i: number = 0; i < Config.operatorCount; i++) {
				tone.phaseDeltas[i] = 0.0;
				tone.volumeStarts[i] = 0.0;
				tone.volumeDeltas[i] = 0.0;
			}

			if (released) {
				const ticksSoFar: number = tone.noteLengthTicks + tone.ticksSinceReleased;
				const startTicksSinceReleased: number = tone.ticksSinceReleased + startRatio;
				const endTicksSinceReleased: number = tone.ticksSinceReleased + endRatio;
				const startTick: number = tone.noteLengthTicks + startTicksSinceReleased;
				const endTick: number = tone.noteLengthTicks + endTicksSinceReleased;
				const toneTransition: Transition = tone.instrument.getTransition();
				resetPhases = false;
				partsSinceStart = Math.floor(ticksSoFar / Config.ticksPerPart);
				intervalStart = intervalEnd = tone.lastInterval;
				customVolumeStart = customVolumeEnd = Synth.expressionToVolumeMult(tone.lastVolume);
				transitionVolumeStart = Synth.expressionToVolumeMult((1.0 - startTicksSinceReleased / toneTransition.releaseTicks) * 6.0);
				transitionVolumeEnd = Synth.expressionToVolumeMult((1.0 - endTicksSinceReleased / toneTransition.releaseTicks) * 6.0);
				decayTimeStart = startTick / Config.ticksPerPart;
				decayTimeEnd = endTick / Config.ticksPerPart;

				if (shouldFadeOutFast) {
					transitionVolumeStart *= 1.0 - startRatio;
					transitionVolumeEnd *= 1.0 - endRatio;
				}
			} else if (tone.note == null) {
				transitionVolumeStart = transitionVolumeEnd = 1;
				customVolumeStart = customVolumeEnd = 1;
				tone.lastInterval = 0;
				tone.lastVolume = 3;
				tone.ticksSinceReleased = 0;
				resetPhases = false;

				const heldTicksStart: number = tone.liveInputSamplesHeld / samplesPerTick;
				tone.liveInputSamplesHeld += runLength;
				const heldTicksEnd: number = tone.liveInputSamplesHeld / samplesPerTick;
				tone.noteLengthTicks = heldTicksEnd;
				const heldPartsStart: number = heldTicksStart / Config.ticksPerPart;
				const heldPartsEnd: number = heldTicksEnd / Config.ticksPerPart;
				partsSinceStart = Math.floor(heldPartsStart);
				decayTimeStart = heldPartsStart;
				decayTimeEnd = heldPartsEnd;
			} else {
				const note: Note = tone.note;
				const prevNote: Note | null = tone.prevNote;
				const nextNote: Note | null = tone.nextNote;

				const time: number = synth.part + synth.beat * Config.partsPerBeat;
				const partsPerBar: number = Config.partsPerBeat * song.beatsPerBar;
				const noteStart: number = tone.noteStart;
				const noteEnd: number = tone.noteEnd;

				partsSinceStart = time - noteStart;

				let endPinIndex: number;
				for (endPinIndex = 1; endPinIndex < note.pins.length - 1; endPinIndex++) {
					if (note.pins[endPinIndex].time + note.start > time) break;
				}
				const startPin: NotePin = note.pins[endPinIndex - 1];
				const endPin: NotePin = note.pins[endPinIndex];
				const noteStartTick: number = noteStart * Config.ticksPerPart;
				const noteEndTick: number = noteEnd * Config.ticksPerPart;
				const noteLengthTicks: number = noteEndTick - noteStartTick;
				const pinStart: number = (note.start + startPin.time) * Config.ticksPerPart;
				const pinEnd: number = (note.start + endPin.time) * Config.ticksPerPart;

				tone.lastInterval = note.pins[note.pins.length - 1].interval;
				tone.lastVolume = note.pins[note.pins.length - 1].volume;
				tone.ticksSinceReleased = 0;
				tone.noteLengthTicks = noteLengthTicks;

				const tickTimeStart: number = time * Config.ticksPerPart + synth.tick;
				const tickTimeEnd: number = time * Config.ticksPerPart + synth.tick + 1;
				const noteTicksPassedTickStart: number = tickTimeStart - noteStartTick;
				const noteTicksPassedTickEnd: number = tickTimeEnd - noteStartTick;
				const pinRatioStart: number = Math.min(1.0, (tickTimeStart - pinStart) / (pinEnd - pinStart));
				const pinRatioEnd: number = Math.min(1.0, (tickTimeEnd - pinStart) / (pinEnd - pinStart));
				let customVolumeTickStart: number = startPin.volume + (endPin.volume - startPin.volume) * pinRatioStart;
				let customVolumeTickEnd: number = startPin.volume + (endPin.volume - startPin.volume) * pinRatioEnd;
				let transitionVolumeTickStart: number = 1.0;
				let transitionVolumeTickEnd: number = 1.0;
				let chordVolumeTickStart: number = chordVolume;
				let chordVolumeTickEnd: number = chordVolume;
				let intervalTickStart: number = startPin.interval + (endPin.interval - startPin.interval) * pinRatioStart;
				let intervalTickEnd: number = startPin.interval + (endPin.interval - startPin.interval) * pinRatioEnd;
				let decayTimeTickStart: number = partTimeTickStart - noteStart;
				let decayTimeTickEnd: number = partTimeTickEnd - noteStart;

				resetPhases = (tickTimeStart + startRatio - noteStartTick == 0.0) || !toneWasActive;

				// if seamless, don't reset phases at start. (it's probably not necessary to constantly reset phases if there are no notes? Just do it once when note starts? But make sure that reset phases doesn't also reset stuff that this function did to set up the tone. Remember when the first run length was lost!
				// if slide, average the interval, decayTime, and custom volume at the endpoints and interpolate between over slide duration.
				// note that currently seamless and slide make different assumptions about whether a note at the end of a bar will connect with the next bar!
				const maximumSlideTicks: number = noteLengthTicks * 0.5;
				if (transition.isSeamless && !transition.slides && note.start == 0) {
					// Special case for seamless, no-slide transition: assume the previous bar ends with another seamless note, don't reset tone history.
					resetPhases = !toneWasActive;
				} else if (transition.isSeamless && prevNote != null) {
					resetPhases = !toneWasActive;
					if (transition.slides) {
						const slideTicks: number = Math.min(maximumSlideTicks, transition.slideTicks);
						const slideRatioStartTick: number = Math.max(0.0, 1.0 - noteTicksPassedTickStart / slideTicks);
						const slideRatioEndTick: number = Math.max(0.0, 1.0 - noteTicksPassedTickEnd / slideTicks);
						const intervalDiff: number = ((prevNote.pitches[tone.prevNotePitchIndex] + prevNote.pins[prevNote.pins.length - 1].interval) - tone.pitches[0]) * 0.5;
						const volumeDiff: number = (prevNote.pins[prevNote.pins.length - 1].volume - note.pins[0].volume) * 0.5;
						const decayTimeDiff: number = (prevNote.end - prevNote.start) * 0.5;
						intervalTickStart += slideRatioStartTick * intervalDiff;
						intervalTickEnd += slideRatioEndTick * intervalDiff;
						customVolumeTickStart += slideRatioStartTick * volumeDiff;
						customVolumeTickEnd += slideRatioEndTick * volumeDiff;
						decayTimeTickStart += slideRatioStartTick * decayTimeDiff;
						decayTimeTickEnd += slideRatioEndTick * decayTimeDiff;

						if (!chord.arpeggiates) {
							const chordSizeDiff: number = (prevNote.pitches.length - tone.chordSize) * 0.5;
							chordVolumeTickStart = Synth.computeChordVolume(tone.chordSize + slideRatioStartTick * chordSizeDiff);
							chordVolumeTickEnd = Synth.computeChordVolume(tone.chordSize + slideRatioEndTick * chordSizeDiff);
						}
					}
				}
				if (transition.isSeamless && !transition.slides && note.end == partsPerBar) {
					// Special case for seamless, no-slide transition: assume the next bar starts with another seamless note, don't fade out.
				} else if (transition.isSeamless && nextNote != null) {
					if (transition.slides) {
						const slideTicks: number = Math.min(maximumSlideTicks, transition.slideTicks);
						const slideRatioStartTick: number = Math.max(0.0, 1.0 - (noteLengthTicks - noteTicksPassedTickStart) / slideTicks);
						const slideRatioEndTick: number = Math.max(0.0, 1.0 - (noteLengthTicks - noteTicksPassedTickEnd) / slideTicks);
						const intervalDiff: number = (nextNote.pitches[tone.nextNotePitchIndex] - (tone.pitches[0] + note.pins[note.pins.length - 1].interval)) * 0.5;
						const volumeDiff: number = (nextNote.pins[0].volume - note.pins[note.pins.length - 1].volume) * 0.5;
						const decayTimeDiff: number = -(noteEnd - noteStart) * 0.5;
						intervalTickStart += slideRatioStartTick * intervalDiff;
						intervalTickEnd += slideRatioEndTick * intervalDiff;
						customVolumeTickStart += slideRatioStartTick * volumeDiff;
						customVolumeTickEnd += slideRatioEndTick * volumeDiff;
						decayTimeTickStart += slideRatioStartTick * decayTimeDiff;
						decayTimeTickEnd += slideRatioEndTick * decayTimeDiff;

						if (!chord.arpeggiates) {
							const chordSizeDiff: number = (nextNote.pitches.length - tone.chordSize) * 0.5;
							chordVolumeTickStart = Synth.computeChordVolume(tone.chordSize + slideRatioStartTick * chordSizeDiff);
							chordVolumeTickEnd = Synth.computeChordVolume(tone.chordSize + slideRatioEndTick * chordSizeDiff);
						}
					}
				} else if (!transition.releases) {
					const releaseTicks: number = transition.releaseTicks;
					if (releaseTicks > 0.0) {
						transitionVolumeTickStart *= Math.min(1.0, (noteLengthTicks - noteTicksPassedTickStart) / releaseTicks);
						transitionVolumeTickEnd *= Math.min(1.0, (noteLengthTicks - noteTicksPassedTickEnd) / releaseTicks);
					}
				}

				intervalStart = intervalTickStart + (intervalTickEnd - intervalTickStart) * startRatio;
				intervalEnd = intervalTickStart + (intervalTickEnd - intervalTickStart) * endRatio;
				if (instrument.type != InstrumentType.mod) {
					customVolumeStart = Synth.expressionToVolumeMult(customVolumeTickStart + (customVolumeTickEnd - customVolumeTickStart) * startRatio);
					customVolumeEnd = Synth.expressionToVolumeMult(customVolumeTickStart + (customVolumeTickEnd - customVolumeTickStart) * endRatio);
				} else {
					customVolumeStart = customVolumeTickStart + (customVolumeTickEnd - customVolumeTickStart) * startRatio;
					customVolumeEnd = customVolumeTickStart + (customVolumeTickEnd - customVolumeTickStart) * endRatio;
					tone.customVolumeStart = customVolumeStart;
					tone.customVolumeEnd = customVolumeEnd;

				}
				transitionVolumeStart = transitionVolumeTickStart + (transitionVolumeTickEnd - transitionVolumeTickStart) * startRatio;
				transitionVolumeEnd = transitionVolumeTickStart + (transitionVolumeTickEnd - transitionVolumeTickStart) * endRatio;
				chordVolumeStart = chordVolumeTickStart + (chordVolumeTickEnd - chordVolumeTickStart) * startRatio;
				chordVolumeEnd = chordVolumeTickStart + (chordVolumeTickEnd - chordVolumeTickStart) * endRatio;
				decayTimeStart = decayTimeTickStart + (decayTimeTickEnd - decayTimeTickStart) * startRatio;
				decayTimeEnd = decayTimeTickStart + (decayTimeTickEnd - decayTimeTickStart) * endRatio;
			}

			const sampleTime: number = 1.0 / synth.samplesPerSecond;
			tone.active = true;

			if (instrument.type == InstrumentType.chip || instrument.type == InstrumentType.fm || instrument.type == InstrumentType.harmonics || instrument.type == InstrumentType.pwm || instrument.type == InstrumentType.customChipWave) {
				const lfoEffectStart: number = Synth.getLFOAmplitude(instrument, secondsPerPart * partTimeStart);
				const lfoEffectEnd: number = Synth.getLFOAmplitude(instrument, secondsPerPart * partTimeEnd);
				const vibratoScale: number = (partsSinceStart < Config.vibratos[instrument.vibrato].delayParts) ? 0.0 : Config.vibratos[instrument.vibrato].amplitude;
				const vibratoStart: number = vibratoScale * lfoEffectStart;
				const vibratoEnd: number = vibratoScale * lfoEffectEnd;
				intervalStart += vibratoStart;
				intervalEnd += vibratoEnd;
			}

			if (!transition.isSeamless || (!(!transition.slides && tone.note != null && tone.note.start == 0) && !(tone.prevNote != null))) {
				const attackSeconds: number = transition.attackSeconds;
				if (attackSeconds > 0.0) {
					transitionVolumeStart *= Math.min(1.0, secondsPerPart * decayTimeStart / attackSeconds);
					transitionVolumeEnd *= Math.min(1.0, secondsPerPart * decayTimeEnd / attackSeconds);
				}
			}

			const instrumentVolumeMult: number = Synth.instrumentVolumeToVolumeMult(instrument.volume);

			if (instrument.type == InstrumentType.drumset) {
				// It's possible that the note will change while the user is editing it,
				// but the tone's pitches don't get updated because the tone has already
				// ended and is fading out. To avoid an array index out of bounds error, clamp the pitch.
				tone.drumsetPitch = tone.pitches[0];
				if (tone.note != null) tone.drumsetPitch += tone.note.pickMainInterval();
				tone.drumsetPitch = Math.max(0, Math.min(Config.drumCount - 1, tone.drumsetPitch));
			}

			let filterCutModStart: number = instrument.filterCutoff;
			let filterCutModEnd: number = instrument.filterCutoff;
			if (synth.isModActive(ModSetting.mstFilterCut, false, channel, instrumentIdx)) {
				filterCutModStart = song.modValueToReal(synth.getModValue(ModSetting.mstFilterCut, false, channel, instrumentIdx, false), ModSetting.mstFilterCut);
				filterCutModEnd = song.modValueToReal(synth.getModValue(ModSetting.mstFilterCut, false, channel, instrumentIdx, true), ModSetting.mstFilterCut);
			}

			let cutoffOctavesModStart: number;
			let cutoffOctavesModEnd: number;
			if (instrument.type == InstrumentType.drumset) {
				cutoffOctavesModStart = 0;
				cutoffOctavesModEnd = 0;
			}
			else {
				cutoffOctavesModStart = (filterCutModStart - (Config.filterCutoffRange - 1)) * 0.5;
				cutoffOctavesModEnd = (filterCutModEnd - (Config.filterCutoffRange - 1)) * 0.5;
			}

			const filterEnvelope: Envelope = (instrument.type == InstrumentType.drumset) ? instrument.getDrumsetEnvelope(tone.drumsetPitch) : instrument.getFilterEnvelope();
			const filterCutoffHzStart: number = Config.filterCutoffMaxHz * Math.pow(2.0, cutoffOctavesModStart);
			const filterCutoffHzEnd: number = Config.filterCutoffMaxHz * Math.pow(2.0, cutoffOctavesModEnd);
			const filterBaseStart: number = 2.0 * Math.sin(Math.PI * filterCutoffHzStart / synth.samplesPerSecond);
			const filterBaseEnd: number = 2.0 * Math.sin(Math.PI * filterCutoffHzEnd / synth.samplesPerSecond);
			const filterMin: number = 2.0 * Math.sin(Math.PI * Config.filterCutoffMinHz / synth.samplesPerSecond);
			tone.filter = filterBaseStart * Synth.computeEnvelope(filterEnvelope, secondsPerPart * decayTimeStart, beatsPerPart * partTimeStart, customVolumeStart);
			let endFilter: number = filterBaseEnd * Synth.computeEnvelope(filterEnvelope, secondsPerPart * decayTimeEnd, beatsPerPart * partTimeEnd, customVolumeEnd);
			tone.filter = Math.min(Config.filterMax, Math.max(filterMin, tone.filter));
			endFilter = Math.min(Config.filterMax, Math.max(filterMin, endFilter));
			tone.filterScale = Math.pow(endFilter / tone.filter, 1.0 / runLength);

			let filterVolumeStart: number = Math.pow(0.5, cutoffOctavesModStart * 0.35);
			let filterVolumeEnd: number = Math.pow(0.5, cutoffOctavesModEnd * 0.35);

			tone.filterResonanceStart = instrument.getFilterResonance();
			tone.filterResonanceDelta = 0.0;

			let useFilterResonanceStart: number = instrument.filterResonance;
			let useFilterResonanceEnd: number = instrument.filterResonance;

			tone.isFirstOrder = (instrument.type == InstrumentType.drumset) ? false : (useFilterResonanceStart == 0);

			if (synth.isModActive(ModSetting.mstFilterPeak, false, channel, instrumentIdx)) {
				// This flag is used to avoid the special casing when filter resonance == 0 without mods. So, it will sound a bit different,
				// but the effect and ability to smoothly modulate will be preserved.
				tone.isFirstOrder = false;

				useFilterResonanceStart = song.modValueToReal(synth.getModValue(ModSetting.mstFilterPeak, false, channel, instrumentIdx, false), ModSetting.mstFilterPeak);
				useFilterResonanceEnd = song.modValueToReal(synth.getModValue(ModSetting.mstFilterPeak, false, channel, instrumentIdx, true), ModSetting.mstFilterPeak);

				// Also set cut in the tone.
				tone.filterResonanceStart = Config.filterMaxResonance * Math.pow(Math.max(0, useFilterResonanceStart - 1) / (Config.filterResonanceRange - 2), 0.5);
				const filterResonanceEnd: number = Config.filterMaxResonance * Math.pow(Math.max(0, useFilterResonanceEnd - 1) / (Config.filterResonanceRange - 2), 0.5);

				// Just a linear delta. Could get messy since it's not an amazing approximation of sqrt?
				tone.filterResonanceDelta = (filterResonanceEnd - tone.filterResonanceStart) / runLength;
			}
			else {
				// Still need to compute this, mods or no. This calc is delegated to the tone level instead of the synth level, a notable difference from beepbox.
				// No functional difference though.
				tone.filterResonanceStart = Config.filterMaxResonance * Math.pow(Math.max(0, useFilterResonanceStart - 1) / (Config.filterResonanceRange - 2), 0.5);
			}

			if (tone.isFirstOrder == false) {
				filterVolumeStart = Math.pow(filterVolumeStart, 1.7) * Math.pow(0.5, 0.125 * (useFilterResonanceStart - 1));
				filterVolumeEnd = Math.pow(filterVolumeEnd, 1.7) * Math.pow(0.5, 0.125 * (useFilterResonanceEnd - 1));
			}
			if (filterEnvelope.type == EnvelopeType.decay) {
				filterVolumeStart *= (1.25 + .025 * filterEnvelope.speed);
				filterVolumeEnd *= (1.25 + .025 * filterEnvelope.speed);
			} else if (filterEnvelope.type == EnvelopeType.twang) {
				filterVolumeStart *= (1 + .02 * filterEnvelope.speed);
				filterVolumeEnd *= (1 + .02 * filterEnvelope.speed);
			}

			if (resetPhases) {
				tone.reset();
			}

			if (instrument.type == InstrumentType.fm) {
				// phase modulation!

				let sineVolumeBoostStart: number = 1.0;
				let sineVolumeBoostEnd: number = 1.0;
				let totalCarrierVolumeStart: number = 0.0;
				let totalCarrierVolumeEnd: number = 0.0;

				let arpeggioInterval: number = 0;
				if (tone.pitchCount > 1 && !chord.harmonizes) {
					const arpeggio: number = Math.floor((synth.tick + synth.part * Config.ticksPerPart) / Config.rhythms[song.rhythm].ticksPerArpeggio);
					arpeggioInterval = tone.pitches[getArpeggioPitchIndex(tone.pitchCount, song.rhythm, arpeggio)] - tone.pitches[0];
				}

				const carrierCount: number = Config.algorithms[instrument.algorithm].carrierCount;
				for (let i: number = 0; i < Config.operatorCount; i++) {

					let detuneStart: number = instrument.detune / 25;
					let detuneEnd: number = instrument.detune / 25;
					if (synth.isModActive(ModSetting.mstDetune, false, channel, instrumentIdx)) {
						detuneStart = synth.getModValue(ModSetting.mstDetune, false, channel, instrumentIdx, false) / 25;
						detuneEnd = synth.getModValue(ModSetting.mstDetune, false, channel, instrumentIdx, true) / 25;
					}

					const associatedCarrierIndex: number = Config.algorithms[instrument.algorithm].associatedCarrier[i] - 1;
					const pitch: number = tone.pitches[!chord.harmonizes ? 0 : ((i < tone.pitchCount) ? i : ((associatedCarrierIndex < tone.pitchCount) ? associatedCarrierIndex : 0))];
					const freqMult = Config.operatorFrequencies[instrument.operators[i].frequency].mult;
					const interval = Config.operatorCarrierInterval[associatedCarrierIndex] + arpeggioInterval;
					const startPitch: number = basePitch + (pitch + intervalStart + detuneStart) * intervalScale + interval;
					const startFreq: number = freqMult * (Instrument.frequencyFromPitch(startPitch)) + Config.operatorFrequencies[instrument.operators[i].frequency].hzOffset;

					tone.phaseDeltas[i] = startFreq * sampleTime * Config.sineWaveLength;

					let amplitudeStart: number = instrument.operators[i].amplitude;
					let amplitudeEnd: number = instrument.operators[i].amplitude;
					if (synth.isModActive(ModSetting.mstFMSlider1 + i, false, channel, instrumentIdx)) {
						amplitudeStart *= synth.getModValue(ModSetting.mstFMSlider1 + i, false, channel, instrumentIdx, false) / 15.0;
						amplitudeEnd *= synth.getModValue(ModSetting.mstFMSlider1 + i, false, channel, instrumentIdx, true) / 15.0;
					}

					const amplitudeCurveStart: number = Synth.operatorAmplitudeCurve(amplitudeStart);
					const amplitudeCurveEnd: number = Synth.operatorAmplitudeCurve(amplitudeEnd);
					const amplitudeMultStart: number = amplitudeCurveStart * Config.operatorFrequencies[instrument.operators[i].frequency].amplitudeSign;
					const amplitudeMultEnd: number = amplitudeCurveEnd * Config.operatorFrequencies[instrument.operators[i].frequency].amplitudeSign;
					let volumeStart: number = amplitudeMultStart;
					let volumeEnd: number = amplitudeMultEnd;

					// Check for mod-related volume delta
					if (synth.isModActive(ModSetting.mstInsVolume, false, channel, instrumentIdx)) {
						// Linear falloff below 0, normal volume formula above 0. Seems to work best for scaling since the normal volume mult formula has a big gap from -25 to -24.
						const startVal: number = synth.getModValue(ModSetting.mstInsVolume, false, channel, instrumentIdx, false);
						const endVal: number = synth.getModValue(ModSetting.mstInsVolume, false, channel, instrumentIdx, true)
						volumeStart *= ((startVal <= 0) ? ((startVal + Config.volumeRange / 2) / (Config.volumeRange / 2)) : this.instrumentVolumeToVolumeMult(startVal));
						volumeEnd *= ((endVal <= 0) ? ((endVal + Config.volumeRange / 2) / (Config.volumeRange / 2)) : this.instrumentVolumeToVolumeMult(endVal));
					}

					// Check for SONG mod-related volume delta
					if (synth.isModActive(ModSetting.mstSongVolume, true)) {
						volumeStart *= (synth.getModValue(ModSetting.mstSongVolume, true, undefined, undefined, false)) / 100.0;
						volumeEnd *= (synth.getModValue(ModSetting.mstSongVolume, true, undefined, undefined, true)) / 100.0;
					}

					if (i < carrierCount) {
						// carrier
						const endPitch: number = basePitch + (pitch + intervalEnd + detuneEnd) * intervalScale + interval;
						const pitchVolumeStart: number = Math.pow(2.0, -(startPitch - volumeReferencePitch) / pitchDamping);
						const pitchVolumeEnd: number = Math.pow(2.0, -(endPitch - volumeReferencePitch) / pitchDamping);
						volumeStart *= pitchVolumeStart;
						volumeEnd *= pitchVolumeEnd;

						totalCarrierVolumeStart += amplitudeCurveStart;
						totalCarrierVolumeEnd += amplitudeCurveEnd;
					} else {
						// modulator
						volumeStart *= Config.sineWaveLength * 1.5;
						volumeEnd *= Config.sineWaveLength * 1.5;

						sineVolumeBoostStart *= 1.0 - Math.min(1.0, amplitudeStart / 15);
						sineVolumeBoostEnd *= 1.0 - Math.min(1.0, amplitudeEnd / 15);
					}
					const operatorEnvelope: Envelope = Config.envelopes[instrument.operators[i].envelope];

					volumeStart *= Synth.computeEnvelope(operatorEnvelope, secondsPerPart * decayTimeStart, beatsPerPart * partTimeStart, customVolumeStart);
					volumeEnd *= Synth.computeEnvelope(operatorEnvelope, secondsPerPart * decayTimeEnd, beatsPerPart * partTimeEnd, customVolumeEnd);

					tone.volumeStarts[i] = volumeStart;
					tone.volumeDeltas[i] = (volumeEnd - volumeStart) / runLength;
				}

				let useFeedbackAmplitudeStart: number = instrument.feedbackAmplitude;
				let useFeedbackAmplitudeEnd: number = instrument.feedbackAmplitude;
				if (synth.isModActive(ModSetting.mstFMFeedback, false, channel, instrumentIdx)) {
					useFeedbackAmplitudeStart *= synth.getModValue(ModSetting.mstFMFeedback, false, channel, instrumentIdx, false) / 15.0;
					useFeedbackAmplitudeEnd *= synth.getModValue(ModSetting.mstFMFeedback, false, channel, instrumentIdx, true) / 15.0;
				}

				const feedbackAmplitudeStart: number = Config.sineWaveLength * 0.3 * useFeedbackAmplitudeStart / 15.0;
				const feedbackAmplitudeEnd: number = Config.sineWaveLength * 0.3 * useFeedbackAmplitudeEnd / 15.0;
				const feedbackEnvelope: Envelope = Config.envelopes[instrument.feedbackEnvelope];
				let feedbackStart: number = feedbackAmplitudeStart * Synth.computeEnvelope(feedbackEnvelope, secondsPerPart * decayTimeStart, beatsPerPart * partTimeStart, customVolumeStart);
				let feedbackEnd: number = feedbackAmplitudeEnd * Synth.computeEnvelope(feedbackEnvelope, secondsPerPart * decayTimeEnd, beatsPerPart * partTimeEnd, customVolumeEnd);
				tone.feedbackMult = feedbackStart;
				tone.feedbackDelta = (feedbackEnd - tone.feedbackMult) / runLength;

				const volumeMult: number = baseVolume * instrumentVolumeMult;
				tone.volumeStart = filterVolumeStart * volumeMult * transitionVolumeStart * chordVolumeStart;
				const volumeEnd: number = filterVolumeEnd * volumeMult * transitionVolumeEnd * chordVolumeEnd;
				tone.volumeDelta = (volumeEnd - tone.volumeStart) / runLength;

				sineVolumeBoostStart *= (Math.pow(2.0, (2.0 - 1.4 * feedbackAmplitudeStart / 15.0)) - 1.0) / 3.0;
				sineVolumeBoostEnd *= (Math.pow(2.0, (2.0 - 1.4 * feedbackAmplitudeEnd / 15.0)) - 1.0) / 3.0;
				sineVolumeBoostStart *= 1.0 - Math.min(1.0, Math.max(0.0, totalCarrierVolumeStart - 1) / 2.0);
				sineVolumeBoostEnd *= 1.0 - Math.min(1.0, Math.max(0.0, totalCarrierVolumeEnd - 1) / 2.0);
				tone.volumeStart *= 1.0 + sineVolumeBoostStart * 3.0;
				tone.volumeDelta *= 1.0 + (sineVolumeBoostStart + sineVolumeBoostEnd) * 1.5; // Volume boosts are averaged such that delta brings you to next target start boost.
			} else if (instrument.type == InstrumentType.mod) {
				// Modulator value is used for data, so don't actually compute audio nonsense for it.
				tone.volumeStart = transitionVolumeStart;
				let volumeEnd: number = transitionVolumeEnd;

				tone.volumeStart *= customVolumeStart;
				volumeEnd *= customVolumeEnd;

				tone.volumeDelta = (volumeEnd - tone.volumeStart) / runLength;

			} else {
				let detuneStart: number = instrument.detune / 25;
				let detuneEnd: number = instrument.detune / 25;
				if (synth.isModActive(ModSetting.mstDetune, false, channel, instrumentIdx)) {
					detuneStart = synth.getModValue(ModSetting.mstDetune, false, channel, instrumentIdx, false) / 25;
					detuneEnd = synth.getModValue(ModSetting.mstDetune, false, channel, instrumentIdx, true) / 25;
				}

				let pitch: number = tone.pitches[0];

				if (tone.pitchCount > 1) {
					const arpeggio: number = Math.floor((synth.tick + synth.part * Config.ticksPerPart) / Config.rhythms[song.rhythm].ticksPerArpeggio);
					if (chord.harmonizes) {
						const intervalOffset: number = tone.pitches[1 + getArpeggioPitchIndex(tone.pitchCount - 1, song.rhythm, arpeggio)] - tone.pitches[0];
						tone.intervalMult = Math.pow(2.0, intervalOffset / 12.0);
						tone.intervalVolumeMult = Math.pow(2.0, -intervalOffset / pitchDamping);
					} else {
						pitch = tone.pitches[getArpeggioPitchIndex(tone.pitchCount, song.rhythm, arpeggio)];
					}
				}

				const startPitch: number = basePitch + (pitch + intervalStart + detuneStart) * intervalScale;
				const endPitch: number = basePitch + (pitch + intervalEnd + detuneEnd) * intervalScale;
				const startFreq: number = Instrument.frequencyFromPitch(startPitch);
				const pitchVolumeStart: number = Math.pow(2.0, -(startPitch - volumeReferencePitch) / pitchDamping);
				const pitchVolumeEnd: number = Math.pow(2.0, -(endPitch - volumeReferencePitch) / pitchDamping);
				let settingsVolumeMultStart: number = baseVolume * filterVolumeStart;
				let settingsVolumeMultEnd: number = baseVolume * filterVolumeEnd;
				if (instrument.type == InstrumentType.noise) {
					settingsVolumeMultStart *= Config.chipNoises[instrument.chipNoise].volume;
					settingsVolumeMultEnd *= Config.chipNoises[instrument.chipNoise].volume;
				}
				if (instrument.type == InstrumentType.chip || instrument.type == InstrumentType.customChipWave) {
					settingsVolumeMultStart *= Config.chipWaves[instrument.chipWave].volume;
					settingsVolumeMultEnd *= Config.chipWaves[instrument.chipWave].volume;
				}
				if (instrument.type == InstrumentType.chip || instrument.type == InstrumentType.harmonics || instrument.type == InstrumentType.customChipWave) {
					settingsVolumeMultStart *= Config.intervals[instrument.interval].volume;
					settingsVolumeMultEnd *= Config.intervals[instrument.interval].volume;
				}
				if (instrument.type == InstrumentType.pwm) {

					// Check for PWM mods to this instrument
					let pulseWidthModStart: number = instrument.pulseWidth / (Config.pulseWidthRange * 2);
					let pulseWidthModEnd: number = instrument.pulseWidth / (Config.pulseWidthRange * 2);
					if (synth.isModActive(ModSetting.mstPulseWidth, false, channel, instrumentIdx)) {
						pulseWidthModStart = (synth.getModValue(ModSetting.mstPulseWidth, false, channel, instrumentIdx, false)) / (Config.pulseWidthRange * 2);
						pulseWidthModEnd = (synth.getModValue(ModSetting.mstPulseWidth, false, channel, instrumentIdx, true)) / (Config.pulseWidthRange * 2);
					}

					const pulseEnvelope: Envelope = Config.envelopes[instrument.pulseEnvelope];
					const pulseWidthStart: number = pulseWidthModStart * Synth.computeEnvelope(pulseEnvelope, secondsPerPart * decayTimeStart, beatsPerPart * partTimeStart, customVolumeStart);
					const pulseWidthEnd: number = pulseWidthModEnd * Synth.computeEnvelope(pulseEnvelope, secondsPerPart * decayTimeEnd, beatsPerPart * partTimeEnd, customVolumeEnd);

					tone.pulseWidth = pulseWidthStart;
					tone.pulseWidthDelta = (pulseWidthEnd - pulseWidthStart) / runLength;
				}

				tone.phaseDeltas[0] = startFreq * sampleTime;

				tone.volumeStart = transitionVolumeStart * chordVolumeStart * pitchVolumeStart * settingsVolumeMultStart * instrumentVolumeMult;
				let volumeEnd: number = transitionVolumeEnd * chordVolumeEnd * pitchVolumeEnd * settingsVolumeMultEnd * instrumentVolumeMult;

				if (filterEnvelope.type != EnvelopeType.custom && (instrument.type != InstrumentType.pwm || Config.envelopes[instrument.pulseEnvelope].type != EnvelopeType.custom)) {
					tone.volumeStart *= customVolumeStart;
					volumeEnd *= customVolumeEnd;
				}

				// Check for mod-related volume delta
				if (synth.isModActive(ModSetting.mstInsVolume, false, channel, instrumentIdx)) {
					// Linear falloff below 0, normal volume formula above 0. Seems to work best for scaling since the normal volume mult formula has a big gap from -25 to -24.
					const startVal: number = synth.getModValue(ModSetting.mstInsVolume, false, channel, instrumentIdx, false);
					const endVal: number = synth.getModValue(ModSetting.mstInsVolume, false, channel, instrumentIdx, true)
					tone.volumeStart *= ((startVal <= 0) ? ((startVal + Config.volumeRange / 2) / (Config.volumeRange / 2)) : this.instrumentVolumeToVolumeMult(startVal));
					volumeEnd *= ((endVal <= 0) ? ((endVal + Config.volumeRange / 2) / (Config.volumeRange / 2)) : this.instrumentVolumeToVolumeMult(endVal));
				}
				// Check for SONG mod-related volume delta
				if (synth.isModActive(ModSetting.mstSongVolume, true)) {
					tone.volumeStart *= (synth.getModValue(ModSetting.mstSongVolume, true, undefined, undefined, false)) / 100.0;
					volumeEnd *= (synth.getModValue(ModSetting.mstSongVolume, true, undefined, undefined, true)) / 100.0;
				}

				tone.volumeDelta = (volumeEnd - tone.volumeStart) / runLength;
			}

			tone.phaseDeltaScale = Math.pow(2.0, ((intervalEnd - intervalStart) * intervalScale / 12.0) / runLength);
		}

		public static getLFOAmplitude(instrument: Instrument, secondsIntoBar: number): number {
			let effect: number = 0.0;
			for (const vibratoPeriodSeconds of Config.vibratos[instrument.vibrato].periodsSeconds) {
				effect += Math.sin(Math.PI * 2.0 * secondsIntoBar / vibratoPeriodSeconds);
			}
			return effect;
		}

		private static readonly fmSynthFunctionCache: Dictionary<Function> = {};

		private static getInstrumentSynthFunction(instrument: Instrument): Function {
			if (instrument.type == InstrumentType.fm) {
				const fingerprint: string = instrument.algorithm + "_" + instrument.feedbackType;
				if (Synth.fmSynthFunctionCache[fingerprint] == undefined) {
					const synthSource: string[] = [];

					for (const line of Synth.fmSourceTemplate) {
						if (line.indexOf("// CARRIER OUTPUTS") != -1) {
							const outputs: string[] = [];
							for (let j: number = 0; j < Config.algorithms[instrument.algorithm].carrierCount; j++) {
								outputs.push("operator" + j + "Scaled");
							}
							synthSource.push(line.replace("/*operator#Scaled*/", outputs.join(" + ")));
						} else if (line.indexOf("// INSERT OPERATOR COMPUTATION HERE") != -1) {
							for (let j: number = Config.operatorCount - 1; j >= 0; j--) {
								for (const operatorLine of Synth.operatorSourceTemplate) {
									if (operatorLine.indexOf("/* + operator@Scaled*/") != -1) {
										let modulators = "";
										for (const modulatorNumber of Config.algorithms[instrument.algorithm].modulatedBy[j]) {
											modulators += " + operator" + (modulatorNumber - 1) + "Scaled";
										}

										const feedbackIndices: ReadonlyArray<number> = Config.feedbacks[instrument.feedbackType].indices[j];
										if (feedbackIndices.length > 0) {
											modulators += " + feedbackMult * (";
											const feedbacks: string[] = [];
											for (const modulatorNumber of feedbackIndices) {
												feedbacks.push("operator" + (modulatorNumber - 1) + "Output");
											}
											modulators += feedbacks.join(" + ") + ")";
										}
										synthSource.push(operatorLine.replace(/\#/g, j + "").replace("/* + operator@Scaled*/", modulators));
									} else {
										synthSource.push(operatorLine.replace(/\#/g, j + ""));
									}
								}
							}
						} else if (line.indexOf("#") != -1) {
							for (let j = 0; j < Config.operatorCount; j++) {
								synthSource.push(line.replace(/\#/g, j + ""));
							}
						} else {
							synthSource.push(line);
						}
					}

					//console.log(synthSource.join("\n"));

					Synth.fmSynthFunctionCache[fingerprint] = new Function("synth", "data", "stereoBufferIndex", "stereoBufferLength", "runLength", "tone", "instrument", synthSource.join("\n"));
				}
				return Synth.fmSynthFunctionCache[fingerprint];
			} else if (instrument.type == InstrumentType.chip) {
				return Synth.chipSynth;
			} else if (instrument.type == InstrumentType.customChipWave) {
				return Synth.chipSynth;
			} else if (instrument.type == InstrumentType.harmonics) {
				return Synth.harmonicsSynth;
			} else if (instrument.type == InstrumentType.pwm) {
				return Synth.pulseWidthSynth;
			} else if (instrument.type == InstrumentType.noise) {
				return Synth.noiseSynth;
			} else if (instrument.type == InstrumentType.spectrum) {
				return Synth.spectrumSynth;
			} else if (instrument.type == InstrumentType.drumset) {
				return Synth.drumsetSynth;
			} else if (instrument.type == InstrumentType.mod) {
				return Synth.modSynth;
			} else {
				throw new Error("Unrecognized instrument type: " + instrument.type);
			}
		}

		private static chipSynth(synth: Synth, data: Float32Array, stereoBufferIndex: number, stereoBufferLength: number, runLength: number, tone: Tone, instrument: Instrument): void {
			var wave: Float64Array;
			var volumeScale: number;

			const isCustomWave: boolean = (instrument.type == InstrumentType.customChipWave);

			if (!isCustomWave) {
				wave = Config.chipWaves[instrument.chipWave].samples;
				volumeScale = 1.0;
			}
			else {
				wave = instrument.customChipWaveIntegral;
				// Integrals for custom chip wave can get rather big. This "zero point" can be config'ed later.
				volumeScale = 0.1;
			}

			const waveLength: number = +wave.length - 1; // The first sample is duplicated at the end, don't double-count it.

			const intervalA: number = +Math.pow(2.0, (Config.intervals[instrument.interval].offset + Config.intervals[instrument.interval].spread) / 12.0);
			const intervalB: number = Math.pow(2.0, (Config.intervals[instrument.interval].offset - Config.intervals[instrument.interval].spread) / 12.0) * tone.intervalMult;
			const intervalSign: number = tone.intervalVolumeMult * Config.intervals[instrument.interval].sign;
			if (instrument.interval == 0 && !instrument.getChord().customInterval) tone.phases[1] = tone.phases[0];
			const deltaRatio: number = intervalB / intervalA;
			let phaseDeltaA: number = tone.phaseDeltas[0] * intervalA * waveLength;
			let phaseDeltaB: number = phaseDeltaA * deltaRatio;
			const phaseDeltaScale: number = +tone.phaseDeltaScale;
			let volume: number = +tone.volumeStart;
			const volumeDelta: number = +tone.volumeDelta;
			let phaseA: number = (tone.phases[0] % 1) * waveLength;
			let phaseB: number = (tone.phases[1] % 1) * waveLength;

			const isFirstOrder: boolean = tone.isFirstOrder;
			let filter1: number = +tone.filter;
			let filter2: number = isFirstOrder ? 1.0 : filter1;
			const filterScale1: number = +tone.filterScale;
			const filterScale2: number = isFirstOrder ? 1.0 : filterScale1;
			let filterResonance: number = tone.filterResonanceStart;
			let filterResonanceDelta: number = tone.filterResonanceDelta;
			let filterSample0: number = +tone.filterSample0;
			let filterSample1: number = +tone.filterSample1;

			const phaseAInt: number = phaseA | 0;
			const phaseBInt: number = phaseB | 0;
			const indexA: number = phaseAInt % waveLength;
			const indexB: number = phaseBInt % waveLength;
			const phaseRatioA: number = phaseA - phaseAInt;
			const phaseRatioB: number = phaseB - phaseBInt;
			let prevWaveIntegralA: number = wave[indexA];
			let prevWaveIntegralB: number = wave[indexB];
			prevWaveIntegralA += (wave[indexA + 1] - prevWaveIntegralA) * phaseRatioA;
			prevWaveIntegralB += (wave[indexB + 1] - prevWaveIntegralB) * phaseRatioB;

			const stopIndex: number = stereoBufferIndex + runLength;
			stereoBufferIndex += tone.stereoOffset;

			let stereoVolumeL: number = tone.stereoVolumeLStart;
			let stereoVolumeLDelta: number = tone.stereoVolumeLDelta;
			let stereoVolumeR: number = tone.stereoVolumeRStart;
			let stereoVolumeRDelta: number = tone.stereoVolumeRDelta;
			let stereoDelay: number = tone.stereoDelayStart;
			let stereoDelayDelta: number = tone.stereoDelayDelta;
			let delays: number[];

			//console.log("S: " + stereoBufferIndex + " P: " + stopIndex);

			while (stereoBufferIndex < stopIndex) {

				phaseA += phaseDeltaA;
				phaseB += phaseDeltaB;

				const phaseAInt: number = phaseA | 0;
				const phaseBInt: number = phaseB | 0;
				const indexA: number = phaseAInt % waveLength;
				const indexB: number = phaseBInt % waveLength;
				let nextWaveIntegralA: number = wave[indexA];
				let nextWaveIntegralB: number = wave[indexB];
				const phaseRatioA: number = phaseA - phaseAInt;
				const phaseRatioB: number = phaseB - phaseBInt;
				nextWaveIntegralA += (wave[indexA + 1] - nextWaveIntegralA) * phaseRatioA;
				nextWaveIntegralB += (wave[indexB + 1] - nextWaveIntegralB) * phaseRatioB;
				let waveA: number = (nextWaveIntegralA - prevWaveIntegralA) / phaseDeltaA;
				let waveB: number = (nextWaveIntegralB - prevWaveIntegralB) / phaseDeltaB;
				prevWaveIntegralA = nextWaveIntegralA;
				prevWaveIntegralB = nextWaveIntegralB;

				const combinedWave: number = (waveA + waveB * intervalSign);

				const feedback: number = filterResonance + filterResonance / (1.0 - filter1);
				filterSample0 += filter1 * (combinedWave - filterSample0 + feedback * (filterSample0 - filterSample1));
				filterSample1 += filter2 * (filterSample0 - filterSample1);

				filter1 *= filterScale1;
				filter2 *= filterScale2;
				phaseDeltaA *= phaseDeltaScale;
				phaseDeltaB *= phaseDeltaScale;
				filterResonance += filterResonanceDelta;

				const output: number = filterSample1 * volume * volumeScale;
				volume += volumeDelta;

				//const absStereoDelay: number = Math.abs(stereoDelay);
				//const fracStereoDelay: number = absStereoDelay % 1;
				//const floorStereoDelay: number = absStereoDelay | 0;

				//delays = stereoDelay < 0 ? [0, 0, floorStereoDelay * 2, fracStereoDelay] : [floorStereoDelay * 2, fracStereoDelay, 0, 0];

				// Optimized ver: can remove the above three declarations, but muddier conceptually. Still has that conditional, too...
				delays = stereoDelay < 0 ? [0, 0, ((-stereoDelay) | 0) * 2, (-stereoDelay) % 1] : [(stereoDelay | 0) * 2, stereoDelay % 1, 0, 0];

				data[(stereoBufferIndex + delays[0]) % stereoBufferLength] += output * stereoVolumeL * (1 - delays[1]);
				data[(stereoBufferIndex + delays[0] + 2) % stereoBufferLength] += output * stereoVolumeL * delays[1];
				data[(stereoBufferIndex + delays[2] + 1) % stereoBufferLength] += output * stereoVolumeR * (1 - delays[3]);
				data[(stereoBufferIndex + delays[2] + 3) % stereoBufferLength] += output * stereoVolumeR * delays[3];

				stereoVolumeL += stereoVolumeLDelta;
				stereoVolumeR += stereoVolumeRDelta;
				stereoDelay += stereoDelayDelta;

				stereoBufferIndex += 2;
			}

			//debugString += "," + data.subarray(stereoBufferIndex - runLength, stereoBufferIndex).toString();
			//console.log(stereoBufferIndex);

			tone.phases[0] = phaseA / waveLength;
			tone.phases[1] = phaseB / waveLength;

			const epsilon: number = (1.0e-24);
			if (-epsilon < filterSample0 && filterSample0 < epsilon) filterSample0 = 0.0;
			if (-epsilon < filterSample1 && filterSample1 < epsilon) filterSample1 = 0.0;
			tone.filterSample0 = filterSample0;
			tone.filterSample1 = filterSample1;

		}


		private static harmonicsSynth(synth: Synth, data: Float32Array, stereoBufferIndex: number, stereoBufferLength: number, runLength: number, tone: Tone, instrument: Instrument): void {
			const wave: Float32Array = instrument.harmonicsWave.getCustomWave();
			const waveLength: number = +wave.length - 1; // The first sample is duplicated at the end, don't double-count it.

			const intervalA: number = +Math.pow(2.0, (Config.intervals[instrument.interval].offset + Config.intervals[instrument.interval].spread) / 12.0);
			const intervalB: number = Math.pow(2.0, (Config.intervals[instrument.interval].offset - Config.intervals[instrument.interval].spread) / 12.0) * tone.intervalMult;
			const intervalSign: number = tone.intervalVolumeMult * Config.intervals[instrument.interval].sign;
			if (instrument.interval == 0 && !instrument.getChord().customInterval) tone.phases[1] = tone.phases[0];
			const deltaRatio: number = intervalB / intervalA;
			let phaseDeltaA: number = tone.phaseDeltas[0] * intervalA * waveLength;
			let phaseDeltaB: number = phaseDeltaA * deltaRatio;
			const phaseDeltaScale: number = +tone.phaseDeltaScale;
			let volume: number = +tone.volumeStart;
			const volumeDelta: number = +tone.volumeDelta;
			let phaseA: number = (tone.phases[0] % 1) * waveLength;
			let phaseB: number = (tone.phases[1] % 1) * waveLength;

			const isFirstOrder: boolean = tone.isFirstOrder;
			let filter1: number = +tone.filter;
			let filter2: number = isFirstOrder ? 1.0 : filter1;
			const filterScale1: number = +tone.filterScale;
			const filterScale2: number = isFirstOrder ? 1.0 : filterScale1;
			let filterResonance: number = tone.filterResonanceStart;
			let filterResonanceDelta: number = tone.filterResonanceDelta;
			let filterSample0: number = +tone.filterSample0;
			let filterSample1: number = +tone.filterSample1;

			const phaseAInt: number = phaseA | 0;
			const phaseBInt: number = phaseB | 0;
			const indexA: number = phaseAInt % waveLength;
			const indexB: number = phaseBInt % waveLength;
			const phaseRatioA: number = phaseA - phaseAInt;
			const phaseRatioB: number = phaseB - phaseBInt;
			let prevWaveIntegralA: number = wave[indexA];
			let prevWaveIntegralB: number = wave[indexB];
			prevWaveIntegralA += (wave[indexA + 1] - prevWaveIntegralA) * phaseRatioA;
			prevWaveIntegralB += (wave[indexB + 1] - prevWaveIntegralB) * phaseRatioB;

			const stopIndex: number = stereoBufferIndex + runLength;
			stereoBufferIndex += tone.stereoOffset;

			let stereoVolumeL: number = tone.stereoVolumeLStart;
			let stereoVolumeLDelta: number = tone.stereoVolumeLDelta;
			let stereoVolumeR: number = tone.stereoVolumeRStart;
			let stereoVolumeRDelta: number = tone.stereoVolumeRDelta;
			let stereoDelay: number = tone.stereoDelayStart;
			let stereoDelayDelta: number = tone.stereoDelayDelta;
			let delays: number[];
			while (stereoBufferIndex < stopIndex) {

				phaseA += phaseDeltaA;
				phaseB += phaseDeltaB;

				const phaseAInt: number = phaseA | 0;
				const phaseBInt: number = phaseB | 0;
				const indexA: number = phaseAInt % waveLength;
				const indexB: number = phaseBInt % waveLength;
				let nextWaveIntegralA: number = wave[indexA];
				let nextWaveIntegralB: number = wave[indexB];
				const phaseRatioA: number = phaseA - phaseAInt;
				const phaseRatioB: number = phaseB - phaseBInt;
				nextWaveIntegralA += (wave[indexA + 1] - nextWaveIntegralA) * phaseRatioA;
				nextWaveIntegralB += (wave[indexB + 1] - nextWaveIntegralB) * phaseRatioB;
				let waveA: number = (nextWaveIntegralA - prevWaveIntegralA) / phaseDeltaA;
				let waveB: number = (nextWaveIntegralB - prevWaveIntegralB) / phaseDeltaB;

				prevWaveIntegralA = nextWaveIntegralA;
				prevWaveIntegralB = nextWaveIntegralB;

				const combinedWave: number = (waveA + waveB * intervalSign);

				const feedback: number = filterResonance + filterResonance / (1.0 - filter1);
				filterSample0 += filter1 * (combinedWave - filterSample0 + feedback * (filterSample0 - filterSample1));
				filterSample1 += filter2 * (filterSample0 - filterSample1);

				filter1 *= filterScale1;
				filter2 *= filterScale2;
				phaseDeltaA *= phaseDeltaScale;
				phaseDeltaB *= phaseDeltaScale;
				filterResonance += filterResonanceDelta;

				const output: number = filterSample1 * volume;
				volume += volumeDelta;

				//const absStereoDelay: number = Math.abs(stereoDelay);
				//const fracStereoDelay: number = absStereoDelay % 1;
				//const floorStereoDelay: number = absStereoDelay | 0;

				//delays = stereoDelay < 0 ? [0, 0, floorStereoDelay * 2, fracStereoDelay] : [floorStereoDelay * 2, fracStereoDelay, 0, 0];

				// Optimized ver: can remove the above three declarations, but muddier conceptually. Still has that conditional, too...
				delays = stereoDelay < 0 ? [0, 0, ((-stereoDelay) | 0) * 2, (-stereoDelay) % 1] : [(stereoDelay | 0) * 2, stereoDelay % 1, 0, 0];

				data[(stereoBufferIndex + delays[0]) % stereoBufferLength] += output * stereoVolumeL * (1 - delays[1]);
				data[(stereoBufferIndex + delays[0] + 2) % stereoBufferLength] += output * stereoVolumeL * delays[1];
				data[(stereoBufferIndex + delays[2] + 1) % stereoBufferLength] += output * stereoVolumeR * (1 - delays[3]);
				data[(stereoBufferIndex + delays[2] + 3) % stereoBufferLength] += output * stereoVolumeR * delays[3];

				stereoVolumeL += stereoVolumeLDelta;
				stereoVolumeR += stereoVolumeRDelta;
				stereoDelay += stereoDelayDelta;

				stereoBufferIndex += 2;
			}

			tone.phases[0] = phaseA / waveLength;
			tone.phases[1] = phaseB / waveLength;

			const epsilon: number = (1.0e-24);
			if (-epsilon < filterSample0 && filterSample0 < epsilon) filterSample0 = 0.0;
			if (-epsilon < filterSample1 && filterSample1 < epsilon) filterSample1 = 0.0;
			tone.filterSample0 = filterSample0;
			tone.filterSample1 = filterSample1;
		}

		private static pulseWidthSynth(synth: Synth, data: Float32Array, stereoBufferIndex: number, stereoBufferLength: number, runLength: number, tone: Tone, instrument: Instrument): void {
			let phaseDelta: number = tone.phaseDeltas[0];
			const phaseDeltaScale: number = +tone.phaseDeltaScale;
			let volume: number = +tone.volumeStart;
			const volumeDelta: number = +tone.volumeDelta;
			let phase: number = (tone.phases[0] % 1);

			let pulseWidth: number = tone.pulseWidth;
			const pulseWidthDelta: number = tone.pulseWidthDelta;

			const isFirstOrder: boolean = tone.isFirstOrder;
			let filter1: number = +tone.filter;
			let filter2: number = isFirstOrder ? 1.0 : filter1;
			const filterScale1: number = +tone.filterScale;
			const filterScale2: number = isFirstOrder ? 1.0 : filterScale1;
			let filterResonance: number = tone.filterResonanceStart;
			let filterResonanceDelta: number = tone.filterResonanceDelta;
			let filterSample0: number = +tone.filterSample0;
			let filterSample1: number = +tone.filterSample1;

			const stopIndex: number = stereoBufferIndex + runLength;
			stereoBufferIndex += tone.stereoOffset;

			let stereoVolumeL: number = tone.stereoVolumeLStart;
			let stereoVolumeLDelta: number = tone.stereoVolumeLDelta;
			let stereoVolumeR: number = tone.stereoVolumeRStart;
			let stereoVolumeRDelta: number = tone.stereoVolumeRDelta;
			let stereoDelay: number = tone.stereoDelayStart;
			let stereoDelayDelta: number = tone.stereoDelayDelta;
			let delays: number[];

			while (stereoBufferIndex < stopIndex) {

				const sawPhaseA: number = phase % 1;
				const sawPhaseB: number = (phase + pulseWidth) % 1;

				let pulseWave: number = sawPhaseB - sawPhaseA;

				// This a PolyBLEP, which smooths out discontinuities at any frequency to reduce aliasing. 
				if (sawPhaseA < phaseDelta) {
					var t = sawPhaseA / phaseDelta;
					pulseWave += (t + t - t * t - 1) * 0.5;
				} else if (sawPhaseA > 1.0 - phaseDelta) {
					var t = (sawPhaseA - 1.0) / phaseDelta;
					pulseWave += (t + t + t * t + 1) * 0.5;
				}
				if (sawPhaseB < phaseDelta) {
					var t = sawPhaseB / phaseDelta;
					pulseWave -= (t + t - t * t - 1) * 0.5;
				} else if (sawPhaseB > 1.0 - phaseDelta) {
					var t = (sawPhaseB - 1.0) / phaseDelta;
					pulseWave -= (t + t + t * t + 1) * 0.5;
				}

				const feedback: number = filterResonance + filterResonance / (1.0 - filter1);
				filterSample0 += filter1 * (pulseWave - filterSample0 + feedback * (filterSample0 - filterSample1));
				filterSample1 += filter2 * (filterSample0 - filterSample1);

				filter1 *= filterScale1;
				filter2 *= filterScale2;

				phase += phaseDelta;
				phaseDelta *= phaseDeltaScale;
				pulseWidth += pulseWidthDelta;
				filterResonance += filterResonanceDelta;

				const output: number = filterSample1 * volume;
				volume += volumeDelta;

				//const absStereoDelay: number = Math.abs(stereoDelay);
				//const fracStereoDelay: number = absStereoDelay % 1;
				//const floorStereoDelay: number = absStereoDelay | 0;

				//delays = stereoDelay < 0 ? [0, 0, floorStereoDelay * 2, fracStereoDelay] : [floorStereoDelay * 2, fracStereoDelay, 0, 0];

				// Optimized ver: can remove the above three declarations, but muddier conceptually. Still has that conditional, too...
				delays = stereoDelay < 0 ? [0, 0, ((-stereoDelay) | 0) * 2, (-stereoDelay) % 1] : [(stereoDelay | 0) * 2, stereoDelay % 1, 0, 0];

				data[(stereoBufferIndex + delays[0]) % stereoBufferLength] += output * stereoVolumeL * (1 - delays[1]);
				data[(stereoBufferIndex + delays[0] + 2) % stereoBufferLength] += output * stereoVolumeL * delays[1];
				data[(stereoBufferIndex + delays[2] + 1) % stereoBufferLength] += output * stereoVolumeR * (1 - delays[3]);
				data[(stereoBufferIndex + delays[2] + 3) % stereoBufferLength] += output * stereoVolumeR * delays[3];

				stereoVolumeL += stereoVolumeLDelta;
				stereoVolumeR += stereoVolumeRDelta;
				stereoDelay += stereoDelayDelta;

				stereoBufferIndex += 2;
			}

			tone.phases[0] = phase;

			const epsilon: number = (1.0e-24);
			if (- epsilon < filterSample0 && filterSample0 < epsilon) filterSample0 = 0.0;
			if (-epsilon < filterSample1 && filterSample1 < epsilon) filterSample1 = 0.0;
			tone.filterSample0 = filterSample0;
			tone.filterSample1 = filterSample1;
		}

		private static fmSourceTemplate: string[] = (`
			const sineWave = beepbox.Config.sineWave;
			
			let phaseDeltaScale = +tone.phaseDeltaScale;
			// I'm adding 1000 to the phase to ensure that it's never negative even when modulated by other waves because negative numbers don't work with the modulus operator very well.
			let operator#Phase       = +((tone.phases[#] % 1) + 1000) * beepbox.Config.sineWaveLength;
			let operator#PhaseDelta  = +tone.phaseDeltas[#];
			let operator#OutputMult  = +tone.volumeStarts[#];
			const operator#OutputDelta = +tone.volumeDeltas[#];
			let operator#Output      = +tone.feedbackOutputs[#];
			let feedbackMult         = +tone.feedbackMult;
			const feedbackDelta        = +tone.feedbackDelta;
			let volume = +tone.volumeStart;
			const volumeDelta = +tone.volumeDelta;
			
			const isFirstOrder = tone.isFirstOrder;
			let filter1 = +tone.filter;
			let filter2 = isFirstOrder ? 1.0 : filter1;
			const filterScale1 = +tone.filterScale;
			const filterScale2 = isFirstOrder ? 1.0 : filterScale1;
			let filterResonance = tone.filterResonanceStart;
			let filterResonanceDelta = tone.filterResonanceDelta;
			let filterSample0 = +tone.filterSample0;
			let filterSample1 = +tone.filterSample1;
			
			const stopIndex = stereoBufferIndex + runLength;
			stereoBufferIndex += tone.stereoOffset;
			let stereoVolumeL = tone.stereoVolumeLStart;
			let stereoVolumeLDelta = tone.stereoVolumeLDelta;
			let stereoVolumeR = tone.stereoVolumeRStart;
			let stereoVolumeRDelta = tone.stereoVolumeRDelta;
			let stereoDelay = tone.stereoDelayStart;
			let stereoDelayDelta = tone.stereoDelayDelta;
			let delays = [];
			while (stereoBufferIndex < stopIndex) {
				// INSERT OPERATOR COMPUTATION HERE
				const fmOutput = (/*operator#Scaled*/); // CARRIER OUTPUTS
				
				const feedback = filterResonance + filterResonance / (1.0 - filter1);
				filterSample0 += filter1 * (fmOutput - filterSample0 + feedback * (filterSample0 - filterSample1));
				filterSample1 += filter2 * (filterSample0 - filterSample1);
				
				feedbackMult += feedbackDelta;
				operator#OutputMult += operator#OutputDelta;
				operator#Phase += operator#PhaseDelta;
				operator#PhaseDelta *= phaseDeltaScale;
				filter1 *= filterScale1;
				filter2 *= filterScale2;
				filterResonance += filterResonanceDelta;
				
				const output = filterSample1 * volume;
				volume += volumeDelta;

				//const absStereoDelay: number = Math.abs(stereoDelay);
				//const fracStereoDelay: number = absStereoDelay % 1;
				//const floorStereoDelay: number = absStereoDelay | 0;

				//delays = stereoDelay < 0 ? [0, 0, floorStereoDelay * 2, fracStereoDelay] : [floorStereoDelay * 2, fracStereoDelay, 0, 0];

				// Optimized ver: can remove the above three declarations, but muddier conceptually. Still has that conditional, too...
				delays = stereoDelay < 0 ? [0, 0, ((-stereoDelay) | 0) * 2, (-stereoDelay) % 1] : [(stereoDelay | 0) * 2, stereoDelay % 1, 0, 0];

				data[(stereoBufferIndex + delays[0]) % stereoBufferLength] += output * stereoVolumeL * (1 - delays[1]);
				data[(stereoBufferIndex + delays[0] + 2) % stereoBufferLength] += output * stereoVolumeL * delays[1];
				data[(stereoBufferIndex + delays[2] + 1) % stereoBufferLength] += output * stereoVolumeR * (1 - delays[3]);
				data[(stereoBufferIndex + delays[2] + 3) % stereoBufferLength] += output * stereoVolumeR * delays[3];

				stereoVolumeL += stereoVolumeLDelta;
				stereoVolumeR += stereoVolumeRDelta;
				stereoDelay += stereoDelayDelta;

				stereoBufferIndex += 2;
			}
			
			tone.phases[#] = operator#Phase / ` + Config.sineWaveLength + `;
			tone.feedbackOutputs[#] = operator#Output;
			
			const epsilon = (1.0e-24);
			if (-epsilon < filterSample0 && filterSample0 < epsilon) filterSample0 = 0.0;
			if (-epsilon < filterSample1 && filterSample1 < epsilon) filterSample1 = 0.0;
			tone.filterSample0 = filterSample0;
			tone.filterSample1 = filterSample1;
		`).split("\n");

		private static operatorSourceTemplate: string[] = (`
				const operator#PhaseMix = operator#Phase/* + operator@Scaled*/;
				const operator#PhaseInt = operator#PhaseMix|0;
				const operator#Index    = operator#PhaseInt & ` + Config.sineWaveMask + `;
				const operator#Sample   = sineWave[operator#Index];
				operator#Output       = operator#Sample + (sineWave[operator#Index + 1] - operator#Sample) * (operator#PhaseMix - operator#PhaseInt);
				const operator#Scaled   = operator#OutputMult * operator#Output;
		`).split("\n");

		private static noiseSynth(synth: Synth, data: Float32Array, stereoBufferIndex: number, stereoBufferLength: number, runLength: number, tone: Tone, instrument: Instrument): void {
			let wave: Float32Array = instrument.getDrumWave();
			let phaseDelta: number = +tone.phaseDeltas[0];
			const phaseDeltaScale: number = +tone.phaseDeltaScale;
			let volume: number = +tone.volumeStart;
			const volumeDelta: number = +tone.volumeDelta;
			let phase: number = (tone.phases[0] % 1) * Config.chipNoiseLength;
			if (tone.phases[0] == 0) {
				// Zero phase means the tone was reset, just give noise a random start phase instead.
				phase = Math.random() * Config.chipNoiseLength;
			}
			let sample: number = +tone.sample;

			const isFirstOrder: boolean = tone.isFirstOrder;
			let filter1: number = +tone.filter;
			let filter2: number = isFirstOrder ? 1.0 : filter1;
			const filterScale1: number = +tone.filterScale;
			const filterScale2: number = isFirstOrder ? 1.0 : filterScale1;
			let filterResonance: number = tone.filterResonanceStart;
			let filterResonanceDelta: number = tone.filterResonanceDelta;
			let filterSample0: number = +tone.filterSample0;
			let filterSample1: number = +tone.filterSample1;

			const pitchRelativefilter: number = Math.min(1.0, tone.phaseDeltas[0] * Config.chipNoises[instrument.chipNoise].pitchFilterMult);

			const stopIndex: number = stereoBufferIndex + runLength;
			stereoBufferIndex += tone.stereoOffset;
			let stereoVolumeL: number = tone.stereoVolumeLStart;
			let stereoVolumeLDelta: number = tone.stereoVolumeLDelta;
			let stereoVolumeR: number = tone.stereoVolumeRStart;
			let stereoVolumeRDelta: number = tone.stereoVolumeRDelta;
			let stereoDelay: number = tone.stereoDelayStart;
			let stereoDelayDelta: number = tone.stereoDelayDelta;
			let delays: number[];
			while (stereoBufferIndex < stopIndex) {
				const waveSample: number = wave[phase & 0x7fff];

				sample += (waveSample - sample) * pitchRelativefilter;

				const feedback: number = filterResonance + filterResonance / (1.0 - filter1);
				filterSample0 += filter1 * (sample - filterSample0 + feedback * (filterSample0 - filterSample1));
				filterSample1 += filter2 * (filterSample0 - filterSample1);

				phase += phaseDelta;
				filter1 *= filterScale1;
				filter2 *= filterScale2;
				phaseDelta *= phaseDeltaScale;
				filterResonance += filterResonanceDelta;

				const output: number = filterSample1 * volume;
				volume += volumeDelta;

				//const absStereoDelay: number = Math.abs(stereoDelay);
				//const fracStereoDelay: number = absStereoDelay % 1;
				//const floorStereoDelay: number = absStereoDelay | 0;

				//delays = stereoDelay < 0 ? [0, 0, floorStereoDelay * 2, fracStereoDelay] : [floorStereoDelay * 2, fracStereoDelay, 0, 0];

				// Optimized ver: can remove the above three declarations, but muddier conceptually. Still has that conditional, too...
				delays = stereoDelay < 0 ? [0, 0, ((-stereoDelay) | 0) * 2, (-stereoDelay) % 1] : [(stereoDelay | 0) * 2, stereoDelay % 1, 0, 0];

				data[(stereoBufferIndex + delays[0]) % stereoBufferLength] += output * stereoVolumeL * (1 - delays[1]);
				data[(stereoBufferIndex + delays[0] + 2) % stereoBufferLength] += output * stereoVolumeL * delays[1];
				data[(stereoBufferIndex + delays[2] + 1) % stereoBufferLength] += output * stereoVolumeR * (1 - delays[3]);
				data[(stereoBufferIndex + delays[2] + 3) % stereoBufferLength] += output * stereoVolumeR * delays[3];

				stereoVolumeL += stereoVolumeLDelta;
				stereoVolumeR += stereoVolumeRDelta;
				stereoDelay += stereoDelayDelta;

				stereoBufferIndex += 2;
			}

			tone.phases[0] = phase / Config.chipNoiseLength;
			tone.sample = sample;

			const epsilon: number = (1.0e-24);
			if (-epsilon < filterSample0 && filterSample0 < epsilon) filterSample0 = 0.0;
			if (-epsilon < filterSample1 && filterSample1 < epsilon) filterSample1 = 0.0;
			tone.filterSample0 = filterSample0;
			tone.filterSample1 = filterSample1;
		}

		private static spectrumSynth(synth: Synth, data: Float32Array, stereoBufferIndex: number, stereoBufferLength: number, runLength: number, tone: Tone, instrument: Instrument): void {
			let wave: Float32Array = instrument.getDrumWave();
			let phaseDelta: number = tone.phaseDeltas[0] * (1 << 7);
			const phaseDeltaScale: number = +tone.phaseDeltaScale;
			let volume: number = +tone.volumeStart;
			const volumeDelta: number = +tone.volumeDelta;
			let sample: number = +tone.sample;

			const isFirstOrder: boolean = tone.isFirstOrder;
			let filter1: number = +tone.filter;
			let filter2: number = isFirstOrder ? 1.0 : filter1;
			const filterScale1: number = +tone.filterScale;
			const filterScale2: number = isFirstOrder ? 1.0 : filterScale1;
			let filterResonance: number = tone.filterResonanceStart;
			let filterResonanceDelta: number = tone.filterResonanceDelta;
			let filterSample0: number = +tone.filterSample0;
			let filterSample1: number = +tone.filterSample1;

			let phase: number = (tone.phases[0] % 1) * Config.chipNoiseLength;
			// Zero phase means the tone was reset, just give noise a random start phase instead.
			if (tone.phases[0] == 0) phase = Synth.findRandomZeroCrossing(wave) + phaseDelta;

			const pitchRelativefilter: number = Math.min(1.0, phaseDelta);

			const stopIndex: number = stereoBufferIndex + runLength;
			stereoBufferIndex += tone.stereoOffset;

			let stereoVolumeL: number = tone.stereoVolumeLStart;
			let stereoVolumeLDelta: number = tone.stereoVolumeLDelta;
			let stereoVolumeR: number = tone.stereoVolumeRStart;
			let stereoVolumeRDelta: number = tone.stereoVolumeRDelta;
			let stereoDelay: number = tone.stereoDelayStart;
			let stereoDelayDelta: number = tone.stereoDelayDelta;
			let delays: number[];

			while (stereoBufferIndex < stopIndex) {
				const phaseInt: number = phase | 0;
				const index: number = phaseInt & 0x7fff;
				let waveSample: number = wave[index];
				const phaseRatio: number = phase - phaseInt;
				waveSample += (wave[index + 1] - waveSample) * phaseRatio;

				sample += (waveSample - sample) * pitchRelativefilter;

				const feedback: number = filterResonance + filterResonance / (1.0 - filter1);
				filterSample0 += filter1 * (sample - filterSample0 + feedback * (filterSample0 - filterSample1));
				filterSample1 += filter2 * (filterSample0 - filterSample1);

				phase += phaseDelta;
				filter1 *= filterScale1;
				filter2 *= filterScale2;
				phaseDelta *= phaseDeltaScale;
				filterResonance += filterResonanceDelta;

				const output: number = filterSample1 * volume;
				volume += volumeDelta;

				//const absStereoDelay: number = Math.abs(stereoDelay);
				//const fracStereoDelay: number = absStereoDelay % 1;
				//const floorStereoDelay: number = absStereoDelay | 0;

				//delays = stereoDelay < 0 ? [0, 0, floorStereoDelay * 2, fracStereoDelay] : [floorStereoDelay * 2, fracStereoDelay, 0, 0];

				// Optimized ver: can remove the above three declarations, but muddier conceptually. Still has that conditional, too...
				delays = stereoDelay < 0 ? [0, 0, ((-stereoDelay) | 0) * 2, (-stereoDelay) % 1] : [(stereoDelay | 0) * 2, stereoDelay % 1, 0, 0];

				data[(stereoBufferIndex + delays[0]) % stereoBufferLength] += output * stereoVolumeL * (1 - delays[1]);
				data[(stereoBufferIndex + delays[0] + 2) % stereoBufferLength] += output * stereoVolumeL * delays[1];
				data[(stereoBufferIndex + delays[2] + 1) % stereoBufferLength] += output * stereoVolumeR * (1 - delays[3]);
				data[(stereoBufferIndex + delays[2] + 3) % stereoBufferLength] += output * stereoVolumeR * delays[3];

				stereoVolumeL += stereoVolumeLDelta;
				stereoVolumeR += stereoVolumeRDelta;
				stereoDelay += stereoDelayDelta;

				stereoBufferIndex += 2;
			}

			tone.phases[0] = phase / Config.chipNoiseLength;
			tone.sample = sample;

			const epsilon: number = (1.0e-24);
			if (- epsilon < filterSample0 && filterSample0 < epsilon) filterSample0 = 0.0;
			if (-epsilon < filterSample1 && filterSample1 < epsilon) filterSample1 = 0.0;
			tone.filterSample0 = filterSample0;
			tone.filterSample1 = filterSample1;
		}

		private static drumsetSynth(synth: Synth, data: Float32Array, stereoBufferIndex: number, stereoBufferLength: number, runLength: number, tone: Tone, instrument: Instrument): void {
			let wave: Float32Array = instrument.getDrumsetWave(tone.drumsetPitch);
			let phaseDelta: number = tone.phaseDeltas[0] / Instrument.drumsetIndexReferenceDelta(tone.drumsetPitch);;
			const phaseDeltaScale: number = +tone.phaseDeltaScale;
			let volume: number = +tone.volumeStart;
			const volumeDelta: number = +tone.volumeDelta;
			let sample: number = +tone.sample;

			const isFirstOrder: boolean = tone.isFirstOrder;
			let filter1: number = +tone.filter;
			let filter2: number = isFirstOrder ? 1.0 : filter1;
			const filterScale1: number = +tone.filterScale;
			const filterScale2: number = isFirstOrder ? 1.0 : filterScale1;
			let filterResonance: number = tone.filterResonanceStart;
			let filterResonanceDelta: number = tone.filterResonanceDelta;
			let filterSample0: number = +tone.filterSample0;
			let filterSample1: number = +tone.filterSample1;

			let phase: number = (tone.phases[0] % 1) * Config.chipNoiseLength;
			// Zero phase means the tone was reset, just give noise a random start phase instead.
			if (tone.phases[0] == 0) phase = Synth.findRandomZeroCrossing(wave) + phaseDelta;

			const stopIndex: number = stereoBufferIndex + runLength;
			stereoBufferIndex += tone.stereoOffset;
			let stereoVolumeL: number = tone.stereoVolumeLStart;
			let stereoVolumeLDelta: number = tone.stereoVolumeLDelta;
			let stereoVolumeR: number = tone.stereoVolumeRStart;
			let stereoVolumeRDelta: number = tone.stereoVolumeRDelta;
			let stereoDelay: number = tone.stereoDelayStart;
			let stereoDelayDelta: number = tone.stereoDelayDelta;
			let delays: number[];
			while (stereoBufferIndex < stopIndex) {
				const phaseInt: number = phase | 0;
				const index: number = phaseInt & 0x7fff;
				sample = wave[index];
				const phaseRatio: number = phase - phaseInt;
				sample += (wave[index + 1] - sample) * phaseRatio;

				const feedback: number = filterResonance + filterResonance / (1.0 - filter1);
				filterSample0 += filter1 * (sample - filterSample0 + feedback * (filterSample0 - filterSample1));
				filterSample1 += filter2 * (filterSample0 - filterSample1);

				phase += phaseDelta;
				filter1 *= filterScale1;
				filter2 *= filterScale2;
				phaseDelta *= phaseDeltaScale;
				filterResonance += filterResonanceDelta;

				const output: number = filterSample1 * volume;
				volume += volumeDelta;

				//const absStereoDelay: number = Math.abs(stereoDelay);
				//const fracStereoDelay: number = absStereoDelay % 1;
				//const floorStereoDelay: number = absStereoDelay | 0;

				//delays = stereoDelay < 0 ? [0, 0, floorStereoDelay * 2, fracStereoDelay] : [floorStereoDelay * 2, fracStereoDelay, 0, 0];

				// Optimized ver: can remove the above three declarations, but muddier conceptually. Still has that conditional, too...
				delays = stereoDelay < 0 ? [0, 0, ((-stereoDelay) | 0) * 2, (-stereoDelay) % 1] : [(stereoDelay | 0) * 2, stereoDelay % 1, 0, 0];

				data[(stereoBufferIndex + delays[0]) % stereoBufferLength] += output * stereoVolumeL * (1 - delays[1]);
				data[(stereoBufferIndex + delays[0] + 2) % stereoBufferLength] += output * stereoVolumeL * delays[1];
				data[(stereoBufferIndex + delays[2] + 1) % stereoBufferLength] += output * stereoVolumeR * (1 - delays[3]);
				data[(stereoBufferIndex + delays[2] + 3) % stereoBufferLength] += output * stereoVolumeR * delays[3];

				stereoVolumeL += stereoVolumeLDelta;
				stereoVolumeR += stereoVolumeRDelta;
				stereoDelay += stereoDelayDelta;

				stereoBufferIndex += 2;
			}
			tone.phases[0] = phase / Config.chipNoiseLength;
			tone.sample = sample;

			const epsilon: number = (1.0e-24);
			if (- epsilon < filterSample0 && filterSample0 < epsilon) filterSample0 = 0.0;
			if (-epsilon < filterSample1 && filterSample1 < epsilon) filterSample1 = 0.0;
			tone.filterSample0 = filterSample0;
			tone.filterSample1 = filterSample1;
		}

		private static modSynth(synth: Synth, data: Float32Array, stereoBufferIndex: number, stereoBufferLength: number, runLength: number, tone: Tone, instrument: Instrument): void {
			// Note: present modulator value is tone.volumeStart.

			if (!synth.song) return;

			let mod: number = Config.modCount - 1 - tone.pitches[0];
			let setting: ModSetting = instrument.modSettings[mod];

			synth.setModValue(tone.customVolumeStart, tone.customVolumeEnd, mod, instrument, setting);

			// Check for mod value at 1.0 is a bit obtuse. How about just any value?
			if (setting == ModSetting.mstNextBar) {
				synth.skipBar();
			}
		}

		private static findRandomZeroCrossing(wave: Float32Array): number {
			let phase: number = Math.random() * Config.chipNoiseLength;

			// Spectrum and drumset waves sounds best when they start at a zero crossing,
			// otherwise they pop. Try to find a zero crossing.
			let indexPrev: number = phase & 0x7fff;
			let wavePrev: number = wave[indexPrev];
			const stride: number = 16;
			for (let attemptsRemaining: number = 128; attemptsRemaining > 0; attemptsRemaining--) {
				const indexNext: number = (indexPrev + stride) & 0x7fff;
				const waveNext: number = wave[indexNext];
				if (wavePrev * waveNext <= 0.0) {
					// Found a zero crossing! Now let's narrow it down to two adjacent sample indices.
					for (let i: number = 0; i < 16; i++) {
						const innerIndexNext: number = (indexPrev + 1) & 0x7fff;
						const innerWaveNext: number = wave[innerIndexNext];
						if (wavePrev * innerWaveNext <= 0.0) {
							// Found the zero crossing again! Now let's find the exact intersection.
							const slope: number = innerWaveNext - wavePrev;
							phase = indexPrev;
							if (Math.abs(slope) > 0.00000001) {
								phase += -wavePrev / slope;
							}
							phase = Math.max(0, phase) % Config.chipNoiseLength;
							break;
						} else {
							indexPrev = innerIndexNext;
							wavePrev = innerWaveNext;
						}
					}
					break;
				} else {
					indexPrev = indexNext;
					wavePrev = waveNext;
				}
			}

			return phase;
		}

		public static instrumentVolumeToVolumeMult(instrumentVolume: number): number {
			return (instrumentVolume == -Config.volumeRange / 2.0) ? 0.0 : Math.pow(2, Config.volumeLogScale * instrumentVolume);
		}
		public static volumeMultToInstrumentVolume(volumeMult: number): number {
			return (volumeMult <= 0.0) ? -Config.volumeRange / 2 : Math.min(Config.volumeRange, (Math.log(volumeMult) / Math.LN2) / Config.volumeLogScale);
		}
		public static expressionToVolumeMult(expression: number): number {
			return Math.pow(Math.max(0.0, expression) / 6.0, 1.5);
		}
		public static volumeMultToExpression(volumeMult: number): number {
			return Math.pow(Math.max(0.0, volumeMult), 1 / 1.5) * 6.0;
		}

		private getSamplesPerTick(): number {
			if (this.song == null) return 0;
			let beatsPerMinute: number = this.song.getBeatsPerMinute();
			if (this.isModActive(ModSetting.mstTempo, true)) {
				beatsPerMinute = this.getModValue(ModSetting.mstTempo, true);
			}
			return this.getSamplesPerTickSpecificBPM(beatsPerMinute);
		}

		private getSamplesPerTickSpecificBPM(beatsPerMinute: number): number {
			const beatsPerSecond: number = beatsPerMinute / 60.0;
			const partsPerSecond: number = beatsPerSecond * Config.partsPerBeat;
			const tickPerSecond: number = partsPerSecond * Config.ticksPerPart;
			return Math.floor(this.samplesPerSecond / tickPerSecond);
		}
	}
}
