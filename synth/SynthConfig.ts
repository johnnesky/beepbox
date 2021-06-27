/*!
Copyright (C) 2020 John Nesky

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

//namespace beepbox {
	export interface Dictionary<T> {
		[K: string]: T;
	}
	
	export interface DictionaryArray<T> extends ReadonlyArray<T> {
		dictionary: Dictionary<T>;
	}
	
	export const enum FilterType {
		lowPass = 0,
		highPass = 1,
		peak = 2,
		length,
	}
	
	export const enum EnvelopeType {
		custom,
		steady,
		punch,
		flare,
		twang,
		swell,
		tremolo,
		tremolo2,
		decay,
	}
	
	export const enum InstrumentType {
		chip = 0,
		fm = 1,
		noise = 2,
		spectrum = 3,
		drumset = 4,
		harmonics = 5,
		pwm = 6,
		guitar = 7,
		length,
	}
	
	export const enum EffectType {
		reverb = 0,
		chorus = 1,
		panning = 2,
		distortion = 3,
		length,
	}
	
	export interface BeepBoxOption {
		readonly index: number;
		readonly name: string;
	}
	
	export interface Scale extends BeepBoxOption {
		readonly flags: ReadonlyArray<boolean>;
		readonly realName: string;
	}
	
	export interface Key extends BeepBoxOption {
		readonly isWhiteKey: boolean;
		readonly basePitch: number;
	}

	export interface Rhythm extends BeepBoxOption {
		readonly stepsPerBeat: number;
		readonly ticksPerArpeggio: number;
		readonly arpeggioPatterns: ReadonlyArray<ReadonlyArray<number>>;
		readonly roundUpThresholds: number[] | null;
	}

	export interface ChipWave extends BeepBoxOption {
		readonly expression: number;
		readonly samples: Float64Array;
	}

	export interface ChipNoise extends BeepBoxOption {
		readonly expression: number;
		readonly basePitch: number;
		readonly pitchFilterMult: number;
		readonly isSoft: boolean;
		samples: Float32Array | null;
	}

	export interface Transition extends BeepBoxOption {
		readonly isSeamless: boolean;
		readonly attackSeconds: number;
		readonly releases: boolean;
		readonly releaseTicks: number;
		readonly slides: boolean;
		readonly slideTicks: number;
	}

	export interface Vibrato extends BeepBoxOption {
		readonly amplitude: number;
		readonly periodsSeconds: ReadonlyArray<number>;
		readonly delayTicks: number;
	}

	export interface Interval extends BeepBoxOption {
		readonly spread: number;
		readonly offset: number;
		readonly expression: number;
		readonly sign: number;
	}

	export interface Chord extends BeepBoxOption {
		readonly customInterval: boolean;
		readonly arpeggiates: boolean;
		readonly strumParts: number;
		readonly singleTone: boolean;
	}

	export interface Algorithm extends BeepBoxOption {
		readonly carrierCount: number;
		readonly associatedCarrier: ReadonlyArray<number>;
		readonly modulatedBy: ReadonlyArray<ReadonlyArray<number>>;
	}

	export interface OperatorFrequency extends BeepBoxOption {
		readonly mult: number;
		readonly hzOffset: number;
		readonly amplitudeSign: number;
	}

	export interface Envelope extends BeepBoxOption {
		readonly type: EnvelopeType;
		readonly speed: number;
	}

	export interface Feedback extends BeepBoxOption {
		readonly indices: ReadonlyArray<ReadonlyArray<number>>;
	}

	export class Config {
		public static readonly scales: DictionaryArray<Scale> = toNameMap([
			{name: "easy :)",         realName: "pentatonic major",      flags: [true, false,  true, false,  true, false, false,  true, false,  true, false, false]},
			{name: "easy :(",         realName: "pentatonic minor",      flags: [true, false, false,  true, false,  true, false,  true, false, false,  true, false]},
			{name: "island :)",       realName: "ryukyu",                flags: [true, false, false, false,  true,  true, false,  true, false, false, false,  true]},
			{name: "island :(",       realName: "pelog selisir",         flags: [true,  true, false,  true, false, false, false,  true,  true, false, false, false]},
			{name: "blues :)",        realName: "blues major",           flags: [true, false,  true,  true,  true, false, false,  true, false,  true, false, false]},
			{name: "blues :(",        realName: "blues",                 flags: [true, false, false,  true, false,  true,  true,  true, false, false,  true, false]},
			{name: "normal :)",       realName: "ionian",                flags: [true, false,  true, false,  true,  true, false,  true, false,  true, false,  true]},
			{name: "normal :(",       realName: "aeolian",               flags: [true, false,  true,  true, false,  true, false,  true,  true, false,  true, false]},
			{name: "dbl harmonic :)", realName: "double harmonic major", flags: [true,  true, false, false,  true,  true, false,  true,  true, false, false,  true]},
			{name: "dbl harmonic :(", realName: "double harmonic minor", flags: [true, false,  true,  true, false, false,  true,  true,  true, false, false,  true]},
			{name: "strange",         realName: "whole tone",            flags: [true, false,  true, false,  true, false,  true, false,  true, false,  true, false]},
			{name: "expert",          realName: "chromatic",             flags: [true,  true,  true,  true,  true,  true,  true,  true,  true,  true,  true,  true]},
		]);
		public static readonly keys: DictionaryArray<Key> = toNameMap([
			{name: "C",  isWhiteKey:  true, basePitch: 12}, // C0 has index 12 on the MIDI scale. C7 is 96, and C9 is 120. C10 is barely in the audible range.
			{name: "C♯", isWhiteKey: false, basePitch: 13},
			{name: "D",  isWhiteKey:  true, basePitch: 14},
			{name: "D♯", isWhiteKey: false, basePitch: 15},
			{name: "E",  isWhiteKey:  true, basePitch: 16},
			{name: "F",  isWhiteKey:  true, basePitch: 17},
			{name: "F♯", isWhiteKey: false, basePitch: 18},
			{name: "G",  isWhiteKey:  true, basePitch: 19},
			{name: "G♯", isWhiteKey: false, basePitch: 20},
			{name: "A",  isWhiteKey:  true, basePitch: 21},
			{name: "A♯", isWhiteKey: false, basePitch: 22},
			{name: "B",  isWhiteKey:  true, basePitch: 23},
		]);
		public static readonly blackKeyNameParents: ReadonlyArray<number> = [-1, 1, -1, 1, -1, 1, -1, -1, 1, -1, 1, -1];
		public static readonly tempoMin: number = 30;
		public static readonly tempoMax: number = 300;
		public static readonly reverbRange: number = 4;
		public static readonly reverbDelayBufferSize: number = 16384; // TODO: Compute a buffer size based on sample rate.
		public static readonly reverbDelayBufferMask: number = Config.reverbDelayBufferSize - 1; // TODO: Compute a buffer size based on sample rate.
		public static readonly beatsPerBarMin: number = 3;
		public static readonly beatsPerBarMax: number = 16;
		public static readonly barCountMin: number = 1;
		public static readonly barCountMax: number = 128;
		public static readonly instrumentsPerChannelMin: number = 1;
		public static readonly instrumentsPerChannelMax: number = 10;
		public static readonly partsPerBeat: number = 24;
		public static readonly ticksPerPart: number = 2;
		public static readonly rhythms: DictionaryArray<Rhythm> = toNameMap([
			{name: "÷3 (triplets)", stepsPerBeat: 3, ticksPerArpeggio: 4, arpeggioPatterns: [[0], [0, 0, 1, 1], [0, 1, 2, 1]], roundUpThresholds: [/*0*/ 5, /*8*/ 12, /*16*/ 18 /*24*/]},
			{name: "÷4 (standard)", stepsPerBeat: 4, ticksPerArpeggio: 3, arpeggioPatterns: [[0], [0, 0, 1, 1], [0, 1, 2, 1]], roundUpThresholds: [/*0*/ 3, /*6*/ 9, /*12*/ 17, /*18*/ 21 /*24*/]},
			{name: "÷6",            stepsPerBeat: 6, ticksPerArpeggio: 4, arpeggioPatterns: [[0], [0, 1],       [0, 1, 2, 1]], roundUpThresholds: null},
			{name: "÷8",            stepsPerBeat: 8, ticksPerArpeggio: 3, arpeggioPatterns: [[0], [0, 1],       [0, 1, 2, 1]], roundUpThresholds: null},
			{name: "freehand",      stepsPerBeat:24, ticksPerArpeggio: 3, arpeggioPatterns: [[0], [0, 1],       [0, 1, 2, 1]], roundUpThresholds: null},
		]);
		
		public static readonly instrumentTypeNames: ReadonlyArray<string> = ["chip", "FM", "noise", "spectrum", "drumset", "harmonics", "PWM", "Electric Guitar"]; // See InstrumentType enum above.
		public static readonly instrumentTypeHasSpecialInterval: ReadonlyArray<boolean> = [true, true, false, false, false, true, false, false];
		public static readonly chipBaseExpression:      number = 0.03375; // Doubled by interval feature, but affected by expression adjustments per interval setting and wave shape.
		public static readonly fmBaseExpression:        number = 0.03;
		public static readonly noiseBaseExpression:     number = 0.19;
		public static readonly spectrumBaseExpression:  number = 0.3; // Spectrum can be in pitch or noise channels, the expression is doubled for noise.
		public static readonly drumsetBaseExpression:   number = 0.45; // Drums tend to be loud but brief!
		public static readonly harmonicsBaseExpression: number = 0.025;
		public static readonly pwmBaseExpression:       number = 0.04725; // It's actually closer to half of this, the synthesized pulse amplitude range is only .5 to -.5, but also note that the fundamental sine partial amplitude of a square wave is 4/π times the measured square wave amplitude.
		public static readonly guitarBaseExpression:    number = 0.03;
		public static readonly distortionBaseVolume:    number = 0.0125; // Distortion is not affected by pitchDamping, which otherwise approximately halves expression for notes around the middle of the range.
		
		public static readonly chipWaves: DictionaryArray<ChipWave> = toNameMap([
			{name: "rounded",      expression: 0.94, samples: centerWave([0.0, 0.2, 0.4, 0.5, 0.6, 0.7, 0.8, 0.85, 0.9, 0.95, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 0.95, 0.9, 0.85, 0.8, 0.7, 0.6, 0.5, 0.4, 0.2, 0.0, -0.2, -0.4, -0.5, -0.6, -0.7, -0.8, -0.85, -0.9, -0.95, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -0.95, -0.9, -0.85, -0.8, -0.7, -0.6, -0.5, -0.4, -0.2])},
			{name: "triangle",     expression: 1.0,  samples: centerWave([1.0/15.0, 3.0/15.0, 5.0/15.0, 7.0/15.0, 9.0/15.0, 11.0/15.0, 13.0/15.0, 15.0/15.0, 15.0/15.0, 13.0/15.0, 11.0/15.0, 9.0/15.0, 7.0/15.0, 5.0/15.0, 3.0/15.0, 1.0/15.0, -1.0/15.0, -3.0/15.0, -5.0/15.0, -7.0/15.0, -9.0/15.0, -11.0/15.0, -13.0/15.0, -15.0/15.0, -15.0/15.0, -13.0/15.0, -11.0/15.0, -9.0/15.0, -7.0/15.0, -5.0/15.0, -3.0/15.0, -1.0/15.0])},
			{name: "square",       expression: 0.5,  samples: centerWave([1.0, -1.0])},
			{name: "1/4 pulse",    expression: 0.5,  samples: centerWave([1.0, -1.0, -1.0, -1.0])},
			{name: "1/8 pulse",    expression: 0.5,  samples: centerWave([1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0])},
			{name: "sawtooth",     expression: 0.65, samples: centerWave([1.0/31.0, 3.0/31.0, 5.0/31.0, 7.0/31.0, 9.0/31.0, 11.0/31.0, 13.0/31.0, 15.0/31.0, 17.0/31.0, 19.0/31.0, 21.0/31.0, 23.0/31.0, 25.0/31.0, 27.0/31.0, 29.0/31.0, 31.0/31.0, -31.0/31.0, -29.0/31.0, -27.0/31.0, -25.0/31.0, -23.0/31.0, -21.0/31.0, -19.0/31.0, -17.0/31.0, -15.0/31.0, -13.0/31.0, -11.0/31.0, -9.0/31.0, -7.0/31.0, -5.0/31.0, -3.0/31.0, -1.0/31.0])},
			{name: "double saw",   expression: 0.5,  samples: centerWave([0.0, -0.2, -0.4, -0.6, -0.8, -1.0, 1.0, -0.8, -0.6, -0.4, -0.2, 1.0, 0.8, 0.6, 0.4, 0.2])},
			{name: "double pulse", expression: 0.4,  samples: centerWave([1.0, 1.0, 1.0, 1.0, 1.0, -1.0, -1.0, -1.0, 1.0, 1.0, 1.0, 1.0, -1.0, -1.0, -1.0, -1.0])},
			{name: "spiky",        expression: 0.4,  samples: centerWave([1.0, -1.0, 1.0, -1.0, 1.0, 0.0])},
		]);
		// Noise waves have too many samples to write by hand, they're generated on-demand by getDrumWave instead.
		public static readonly chipNoises: DictionaryArray<ChipNoise> = toNameMap([
			{name: "retro",   expression: 0.25, basePitch: 69,  pitchFilterMult: 1024.0, isSoft: false, samples: null},
			{name: "white",   expression: 1.0,  basePitch: 69,  pitchFilterMult:    8.0, isSoft: true,  samples: null},
			// The "clang" and "buzz" noises are based on similar noises in the modded beepbox! :D
			{name: "clang",   expression: 0.4,  basePitch: 69,  pitchFilterMult: 1024.0, isSoft: false, samples: null},
			{name: "buzz",    expression: 0.3,  basePitch: 69,  pitchFilterMult: 1024.0, isSoft: false, samples: null},
			{name: "hollow",  expression: 1.5,  basePitch: 96,  pitchFilterMult:    1.0, isSoft: true,  samples: null},
		]);
		
		public static readonly filterFreqMaxHz: number = 16000.0;
		public static readonly filterFreqMinHz: number = 1.0;
		public static readonly filterFreqRange: number = 33;
		public static readonly filterFreqStep: number = 1.0/4.0;
		public static readonly filterGainRange: number = 15;
		public static readonly filterGainCenter: number = 7;
		public static readonly filterGainStep: number = 1.0/2.0;
		public static readonly filterMaxPoints: number = 8;
		public static readonly filterTypeNames: ReadonlyArray<string> = ["low-pass", "high-pass", "peak"]; // See FilterType enum above.
		
		public static readonly transitions: DictionaryArray<Transition> = toNameMap([
			{name: "seamless",    isSeamless: true,  attackSeconds: 0.0,    releases: false, releaseTicks: 1,  slides: false, slideTicks: 3},
			{name: "hard",        isSeamless: false, attackSeconds: 0.0,    releases: false, releaseTicks: 3,  slides: false, slideTicks: 3},
			{name: "soft",        isSeamless: false, attackSeconds: 0.025,  releases: false, releaseTicks: 3,  slides: false, slideTicks: 3},
			{name: "slide",       isSeamless: true,  attackSeconds: 0.025,  releases: false, releaseTicks: 3,  slides: true,  slideTicks: 3},
			{name: "cross fade",  isSeamless: false, attackSeconds: 0.04,   releases: true,  releaseTicks: 6,  slides: false, slideTicks: 3},
			{name: "hard fade",   isSeamless: false, attackSeconds: 0.0,    releases: true,  releaseTicks: 48, slides: false, slideTicks: 3},
			{name: "medium fade", isSeamless: false, attackSeconds: 0.0125, releases: true,  releaseTicks: 72, slides: false, slideTicks: 3},
			{name: "soft fade",   isSeamless: false, attackSeconds: 0.06,   releases: true,  releaseTicks: 96, slides: false, slideTicks: 6},
			{name: "hard overlap",isSeamless: false, attackSeconds: 0.0,    releases: true,  releaseTicks: 12, slides: false, slideTicks: 3},
		]);
		public static readonly vibratos: DictionaryArray<Vibrato> = toNameMap([
			{name: "none",    amplitude: 0.0,  periodsSeconds: [0.14], delayTicks: 0},
			{name: "light",   amplitude: 0.15, periodsSeconds: [0.14], delayTicks: 0},
			{name: "delayed", amplitude: 0.3,  periodsSeconds: [0.14], delayTicks: 37}, // It will fade in over the previous two ticks.
			{name: "heavy",   amplitude: 0.45, periodsSeconds: [0.14], delayTicks: 0},
			{name: "shaky",   amplitude: 0.1,  periodsSeconds: [0.11, 1.618*0.11, 3*0.11], delayTicks: 0},
		]);
		public static readonly intervals: DictionaryArray<Interval> = toNameMap([
			{name: "union",      spread: 0.0,  offset: 0.0, expression: 0.7, sign: 1.0},
			{name: "shimmer",    spread: 0.018,offset: 0.0, expression: 0.8, sign: 1.0},
			{name: "hum",        spread: 0.045,offset: 0.0, expression: 1.0, sign: 1.0},
			{name: "honky tonk", spread: 0.09, offset: 0.0, expression: 1.0, sign: 1.0},
			{name: "dissonant",  spread: 0.25, offset: 0.0, expression: 0.9, sign: 1.0},
			{name: "fifth",      spread: 3.5,  offset: 3.5, expression: 0.9, sign: 1.0},
			{name: "octave",     spread: 6.0,  offset: 6.0, expression: 0.8, sign: 1.0},
			{name: "bowed",      spread: 0.02, offset: 0.0, expression: 1.0, sign:-1.0},
			{name: "piano",      spread: 0.01, offset: 0.0, expression: 1.0, sign: 0.7},
		]);
		public static readonly effectsNames: ReadonlyArray<string> = ["reverb", "chorus", "panning", "distortion"];
		public static readonly effectOrder: ReadonlyArray<EffectType> = [EffectType.distortion, EffectType.panning, EffectType.chorus, EffectType.reverb];
		public static readonly volumeRange: number = 8;
		public static readonly volumeLogScale: number = -0.5;
		public static readonly panCenter: number = 4;
		public static readonly panMax: number = Config.panCenter * 2;
		public static readonly panDelaySecondsMax: number = 0.00065;
		public static readonly chorusPeriodSeconds: number = 2.0;
		public static readonly chorusDelayRange: number = 0.0034;
		public static readonly chorusDelayOffsets: ReadonlyArray<ReadonlyArray<number>> = [[1.51, 2.10, 3.35], [1.47, 2.15, 3.25]];
		public static readonly chorusPhaseOffsets: ReadonlyArray<ReadonlyArray<number>> = [[0.0, 2.1, 4.2], [3.2, 5.3, 1.0]];
		public static readonly chorusMaxDelay: number = Config.chorusDelayRange * (1.0 + Config.chorusDelayOffsets[0].concat(Config.chorusDelayOffsets[1]).reduce((x,y)=>Math.max(x,y)));
		public static readonly chords: DictionaryArray<Chord> = toNameMap([
			{name: "harmony",         customInterval: false, arpeggiates: false, strumParts: 0, singleTone: false},
			{name: "strum",           customInterval: false, arpeggiates: false, strumParts: 1, singleTone: false},
			{name: "arpeggio",        customInterval: false, arpeggiates:  true, strumParts: 0, singleTone:  true},
			{name: "custom interval", customInterval:  true, arpeggiates:  true, strumParts: 0, singleTone:  true},
		]);
		public static readonly maxChordSize: number = 4;
		public static readonly operatorCount: number = 4;
		public static readonly algorithms: DictionaryArray<Algorithm> = toNameMap([
			{name: "1←(2 3 4)",   carrierCount: 1, associatedCarrier: [1, 1, 1, 1], modulatedBy: [[2, 3, 4], [],     [],  []]},
			{name: "1←(2 3←4)",   carrierCount: 1, associatedCarrier: [1, 1, 1, 1], modulatedBy: [[2, 3],    [],     [4], []]},
			{name: "1←2←(3 4)",   carrierCount: 1, associatedCarrier: [1, 1, 1, 1], modulatedBy: [[2],       [3, 4], [],  []]},
			{name: "1←(2 3)←4",   carrierCount: 1, associatedCarrier: [1, 1, 1, 1], modulatedBy: [[2, 3],    [4],    [4], []]},
			{name: "1←2←3←4",     carrierCount: 1, associatedCarrier: [1, 1, 1, 1], modulatedBy: [[2],       [3],    [4], []]},
			{name: "1←3 2←4",     carrierCount: 2, associatedCarrier: [1, 2, 1, 2], modulatedBy: [[3],       [4],    [],  []]},
			{name: "1 2←(3 4)",   carrierCount: 2, associatedCarrier: [1, 2, 2, 2], modulatedBy: [[],        [3, 4], [],  []]},
			{name: "1 2←3←4",     carrierCount: 2, associatedCarrier: [1, 2, 2, 2], modulatedBy: [[],        [3],    [4], []]},
			{name: "(1 2)←3←4",   carrierCount: 2, associatedCarrier: [1, 2, 2, 2], modulatedBy: [[3],       [3],    [4], []]},
			{name: "(1 2)←(3 4)", carrierCount: 2, associatedCarrier: [1, 2, 2, 2], modulatedBy: [[3, 4],    [3, 4], [],  []]},
			{name: "1 2 3←4",     carrierCount: 3, associatedCarrier: [1, 2, 3, 3], modulatedBy: [[],        [],     [4], []]},
			{name: "(1 2 3)←4",   carrierCount: 3, associatedCarrier: [1, 2, 3, 3], modulatedBy: [[4],       [4],    [4], []]},
			{name: "1 2 3 4",     carrierCount: 4, associatedCarrier: [1, 2, 3, 4], modulatedBy: [[],        [],     [],  []]},
		]);
		public static readonly operatorCarrierInterval: ReadonlyArray<number> = [0.0, 0.04, -0.073, 0.091];
		public static readonly operatorAmplitudeMax: number = 15;
		public static readonly operatorFrequencies: DictionaryArray<OperatorFrequency> = toNameMap([
			{name:  "1×", mult:  1.0, hzOffset: 0.0, amplitudeSign: 1.0},
			{name: "~1×", mult:  1.0, hzOffset: 1.5, amplitudeSign:-1.0},
			{name:  "2×", mult:  2.0, hzOffset: 0.0, amplitudeSign: 1.0},
			{name: "~2×", mult:  2.0, hzOffset:-1.3, amplitudeSign:-1.0},
			{name:  "3×", mult:  3.0, hzOffset: 0.0, amplitudeSign: 1.0},
			{name:  "4×", mult:  4.0, hzOffset: 0.0, amplitudeSign: 1.0},
			{name:  "5×", mult:  5.0, hzOffset: 0.0, amplitudeSign: 1.0},
			{name:  "6×", mult:  6.0, hzOffset: 0.0, amplitudeSign: 1.0},
			{name:  "7×", mult:  7.0, hzOffset: 0.0, amplitudeSign: 1.0},
			{name:  "8×", mult:  8.0, hzOffset: 0.0, amplitudeSign: 1.0},
			{name:  "9×", mult:  9.0, hzOffset: 0.0, amplitudeSign: 1.0},
			{name: "11×", mult: 11.0, hzOffset: 0.0, amplitudeSign: 1.0},
			{name: "13×", mult: 13.0, hzOffset: 0.0, amplitudeSign: 1.0},
			{name: "16×", mult: 16.0, hzOffset: 0.0, amplitudeSign: 1.0},
			{name: "20×", mult: 20.0, hzOffset: 0.0, amplitudeSign: 1.0},
		]);
		public static readonly envelopes: DictionaryArray<Envelope> = toNameMap([
			{name: "custom",   type: EnvelopeType.custom,   speed:  0.0},
			{name: "steady",   type: EnvelopeType.steady,   speed:  0.0},
			{name: "punch",    type: EnvelopeType.punch,    speed:  0.0},
			{name: "flare 1",  type: EnvelopeType.flare,    speed: 32.0},
			{name: "flare 2",  type: EnvelopeType.flare,    speed:  8.0},
			{name: "flare 3",  type: EnvelopeType.flare,    speed:  2.0},
			{name: "twang 1",  type: EnvelopeType.twang,    speed: 32.0},
			{name: "twang 2",  type: EnvelopeType.twang,    speed:  8.0},
			{name: "twang 3",  type: EnvelopeType.twang,    speed:  2.0},
			{name: "swell 1",  type: EnvelopeType.swell,    speed: 32.0},
			{name: "swell 2",  type: EnvelopeType.swell,    speed:  8.0},
			{name: "swell 3",  type: EnvelopeType.swell,    speed:  2.0},
			{name: "tremolo1", type: EnvelopeType.tremolo,  speed:  4.0},
			{name: "tremolo2", type: EnvelopeType.tremolo,  speed:  2.0},
			{name: "tremolo3", type: EnvelopeType.tremolo,  speed:  1.0},
			{name: "tremolo4", type: EnvelopeType.tremolo2, speed:  4.0},
			{name: "tremolo5", type: EnvelopeType.tremolo2, speed:  2.0},
			{name: "tremolo6", type: EnvelopeType.tremolo2, speed:  1.0},
			{name: "decay 1",  type: EnvelopeType.decay,    speed: 10.0},
			{name: "decay 2",  type: EnvelopeType.decay,    speed:  7.0},
			{name: "decay 3",  type: EnvelopeType.decay,    speed:  4.0},
		]);
		public static readonly feedbacks: DictionaryArray<Feedback> = toNameMap([
			{name: "1⟲",          indices: [[1],  [],  [],  []]},
			{name: "2⟲",          indices: [ [], [2],  [],  []]},
			{name: "3⟲",          indices: [ [],  [], [3],  []]},
			{name: "4⟲",          indices: [ [],  [],  [], [4]]},
			{name: "1⟲ 2⟲",       indices: [[1], [2],  [],  []]},
			{name: "3⟲ 4⟲",       indices: [ [],  [], [3], [4]]},
			{name: "1⟲ 2⟲ 3⟲",    indices: [[1], [2], [3],  []]},
			{name: "2⟲ 3⟲ 4⟲",    indices: [ [], [2], [3], [4]]},
			{name: "1⟲ 2⟲ 3⟲ 4⟲", indices: [[1], [2], [3], [4]]},
			{name: "1→2",         indices: [ [], [1],  [],  []]},
			{name: "1→3",         indices: [ [],  [], [1],  []]},
			{name: "1→4",         indices: [ [],  [],  [], [1]]},
			{name: "2→3",         indices: [ [],  [], [2],  []]},
			{name: "2→4",         indices: [ [],  [],  [], [2]]},
			{name: "3→4",         indices: [ [],  [],  [], [3]]},
			{name: "1→3 2→4",     indices: [ [],  [], [1], [2]]},
			{name: "1→4 2→3",     indices: [ [],  [], [2], [1]]},
			{name: "1→2→3→4",     indices: [ [], [1], [2], [3]]},
		]);
		public static readonly chipNoiseLength: number = 1 << 15; // 32768
		public static readonly spectrumNoiseLength: number = 1 << 15; // 32768
		public static readonly spectrumBasePitch: number = 24;
		public static readonly spectrumControlPoints: number = 30;
		public static readonly spectrumControlPointsPerOctave: number = 7;
		public static readonly spectrumControlPointBits: number = 3;
		public static readonly spectrumMax: number = (1 << Config.spectrumControlPointBits) - 1;
		public static readonly harmonicsControlPoints: number = 28;
		public static readonly harmonicsRendered: number = 64;
		public static readonly harmonicsControlPointBits: number = 3;
		public static readonly harmonicsMax: number = (1 << Config.harmonicsControlPointBits) - 1;
		public static readonly harmonicsWavelength: number = 1 << 11; // 2048
		public static readonly pulseWidthRange: number = 8;
		public static readonly pulseWidthStepPower: number = 0.5;
		public static readonly pitchChannelCountMin: number = 1;
		public static readonly pitchChannelCountMax: number = 6;
		public static readonly noiseChannelCountMin: number = 0;
		public static readonly noiseChannelCountMax: number = 3;
		public static readonly noiseInterval: number = 6;
		public static readonly pitchesPerOctave: number = 12; // TODO: Use this for converting pitch to frequency.
		public static readonly drumCount: number = 12;
		public static readonly pitchOctaves: number = 7;
		public static readonly windowOctaves: number = 3;
		public static readonly scrollableOctaves: number = Config.pitchOctaves - Config.windowOctaves;
		public static readonly windowPitchCount: number = Config.windowOctaves * Config.pitchesPerOctave + 1;
		public static readonly maxPitch: number = Config.pitchOctaves * Config.pitchesPerOctave;
		public static readonly maximumTonesPerChannel: number = Config.maxChordSize * 2;
		public static readonly sineWaveLength: number = 1 << 8; // 256
		public static readonly sineWaveMask: number = Config.sineWaveLength - 1;
		public static readonly sineWave: Float64Array = generateSineWave();
		
		// Guitars have an all-pass filter with a corner frequency based on the tone fundamental frequency, in order to add a slight inharmonicity. (Which is important for distortion.)
		public static readonly guitarDispersionCenterFreq: number = 6000.0; // The tone fundamental freq is pulled toward this freq for computing the all-pass corner freq.
		public static readonly guitarDispersionFreqScale: number = 0.3; // The tone fundamental freq freq moves this much toward the center freq for computing the all-pass corner freq.
		public static readonly guitarDispersionFreqMult: number = 4.0; // The all-pass corner freq is based on this times the adjusted tone fundamental freq.
		public static readonly guitarShelfHz: number = 4000.0; // The cutoff freq of the shelf filter that is used to decay the high frequency energy in the guitar string.
		public static readonly guitarPulseWidthRandomness: number = 0.1;
		
		public static readonly distortionRange: number = 8;
		public static readonly sustainRange: number = 8;
	}
	
	function centerWave(wave: Array<number>): Float64Array {
		let sum: number = 0.0;
		for (let i: number = 0; i < wave.length; i++) sum += wave[i];
		const average: number = sum / wave.length;
		for (let i: number = 0; i < wave.length; i++) wave[i] -= average;
		performIntegral(wave);
		// The first sample should be zero, and we'll duplicate it at the end for easier interpolation.
		wave.push(0);
		return new Float64Array(wave);
	}
	
	export function performIntegral(wave: {length: number, [index: number]: number}): void {
		// Perform the integral on the wave. The synth function will perform the derivative to get the original wave back but with antialiasing.
		let cumulative: number = 0.0;
		for (let i: number = 0; i < wave.length; i++) {
			const temp = wave[i];
			wave[i] = cumulative;
			cumulative += temp;
		}
	}
	
	export function getPulseWidthRatio(pulseWidth: number): number {
		return Math.pow(0.5, (Config.pulseWidthRange - 1 - pulseWidth) * Config.pulseWidthStepPower) * 0.5;
	}
	
	// The function arguments will be defined in FFT.ts, but I want
	// SynthConfig.ts to be at the top of the compiled JS so I won't directly
	// depend on FFT here. synth.ts will take care of importing FFT.ts.
	//function inverseRealFourierTransform(array: {length: number, [index: number]: number}, fullArrayLength: number): void;
	//function scaleElementsByFactor(array: {length: number, [index: number]: number}, factor: number): void;
	export function getDrumWave(index: number, inverseRealFourierTransform: Function | null, scaleElementsByFactor: Function | null): Float32Array {
		let wave: Float32Array | null = Config.chipNoises[index].samples;
		if (wave == null) {
			wave = new Float32Array(Config.chipNoiseLength + 1);
			Config.chipNoises[index].samples = wave;
			
			if (index == 0) {
				// The "retro" drum uses a "Linear Feedback Shift Register" similar to the NES noise channel.
				let drumBuffer: number = 1;
				for (let i: number = 0; i < Config.chipNoiseLength; i++) {
					wave[i] = (drumBuffer & 1) * 2.0 - 1.0;
					let newBuffer: number = drumBuffer >> 1;
					if (((drumBuffer + newBuffer) & 1) == 1) {
						newBuffer += 1 << 14;
					}
					drumBuffer = newBuffer;
				}
			} else if (index == 1) {
				// White noise is just random values for each sample.
				for (let i: number = 0; i < Config.chipNoiseLength; i++) {
					wave[i] = Math.random() * 2.0 - 1.0;
				}
			} else if (index == 2) {
				// The "clang" noise wave is based on a similar noise wave in the modded beepbox made by DAzombieRE.
				let drumBuffer: number = 1;
				for (let i: number = 0; i < Config.chipNoiseLength; i++) {
					wave[i] = (drumBuffer & 1) * 2.0 - 1.0;
					let newBuffer: number = drumBuffer >> 1;
					if (((drumBuffer + newBuffer) & 1) == 1) {
						newBuffer += 2 << 14;
					}
					drumBuffer = newBuffer;
				}
			} else if (index == 3) {
				// The "buzz" noise wave is based on a similar noise wave in the modded beepbox made by DAzombieRE.
				let drumBuffer: number = 1;
				for (let i: number = 0; i < Config.chipNoiseLength; i++) {
					wave[i] = (drumBuffer & 1) * 2.0 - 1.0;
					let newBuffer: number = drumBuffer >> 1;
					if (((drumBuffer + newBuffer) & 1) == 1) {
						newBuffer += 10 << 2;
					}
					drumBuffer = newBuffer;
				}
			} else if (index == 4) {
				// "hollow" drums, designed in frequency space and then converted via FFT:
				drawNoiseSpectrum(wave, Config.chipNoiseLength, 10, 11, 1, 1, 0);
				drawNoiseSpectrum(wave, Config.chipNoiseLength, 11, 14, .6578, .6578, 0);
				inverseRealFourierTransform!(wave, Config.chipNoiseLength);
				scaleElementsByFactor!(wave, 1.0 / Math.sqrt(Config.chipNoiseLength));
			} else {
				throw new Error("Unrecognized drum index: " + index);
			}
			
			wave[Config.chipNoiseLength] = wave[0];
		}
		
		return wave;
	}
	
	export function drawNoiseSpectrum(wave: Float32Array, waveLength: number, lowOctave: number, highOctave: number, lowPower: number, highPower: number, overallSlope: number): number {
		const referenceOctave: number = 11;
		const referenceIndex: number = 1 << referenceOctave;
		const lowIndex: number = Math.pow(2, lowOctave) | 0;
		const highIndex: number = Math.min(waveLength >> 1, Math.pow(2, highOctave) | 0);
		const retroWave: Float32Array = getDrumWave(0, null, null);
		let combinedAmplitude: number = 0.0;
		for (let i: number = lowIndex; i < highIndex; i++) {
			
			let lerped: number = lowPower + (highPower - lowPower) * (Math.log2(i) - lowOctave) / (highOctave - lowOctave);
			let amplitude: number = Math.pow(2, (lerped - 1) * 7 + 1) * lerped;
			
			amplitude *= Math.pow(i / referenceIndex, overallSlope);
			
			combinedAmplitude += amplitude;
			
			// Add two different sources of psuedo-randomness to the noise
			// (individually they aren't random enough) but in a deterministic
			// way so that live spectrum editing doesn't result in audible pops.
			// Multiply all the sine wave amplitudes by 1 or -1 based on the
			// LFSR retro wave (effectively random), and also rotate the phase
			// of each sine wave based on the golden angle to disrupt the symmetry.
			amplitude *= retroWave[i];
			const radians: number = 0.61803398875 * i * i * Math.PI * 2.0;
			
			wave[i] = Math.cos(radians) * amplitude;
			wave[waveLength - i] = Math.sin(radians) * amplitude;
		}
		
		return combinedAmplitude;
	}
	
	function generateSineWave(): Float64Array {
		const wave: Float64Array = new Float64Array(Config.sineWaveLength + 1);
		for (let i: number = 0; i < Config.sineWaveLength + 1; i++) {
			wave[i] = Math.sin(i * Math.PI * 2.0 / Config.sineWaveLength);
		}
		return wave;
	}
	
	export function getArpeggioPitchIndex(pitchCount: number, rhythm: number, arpeggio: number): number {
		const arpeggioPattern: ReadonlyArray<number> = Config.rhythms[rhythm].arpeggioPatterns[pitchCount - 1];
		if (arpeggioPattern != null) {
			return arpeggioPattern[arpeggio % arpeggioPattern.length];
		} else {
			return arpeggio % pitchCount;
		}
	}
	
	// Pardon the messy type casting. This allows accessing array members by numerical index or string name.
	export function toNameMap<T extends BeepBoxOption>(array: Array<Pick<T, Exclude<keyof T, "index">>>): DictionaryArray<T> {
		const dictionary: Dictionary<T> = {};
		for (let i: number = 0; i < array.length; i++) {
			const value: any = array[i];
			value.index = i;
			dictionary[value.name] = <T> value;
		}
		const result: DictionaryArray<T> = <DictionaryArray<T>> <any> array;
		result.dictionary = dictionary;
		return result;
	}
	
	export function effectsIncludeDistortion(effects: number): boolean {
		return (effects & (1 << EffectType.distortion)) != 0;
	}
	
	export function effectsIncludePanning(effects: number): boolean {
		return (effects & (1 << EffectType.panning)) != 0;
	}
	
	export function effectsIncludeChorus(effects: number): boolean {
		return (effects & (1 << EffectType.chorus)) != 0;
	}
	
	export function effectsIncludeReverb(effects: number): boolean {
		return (effects & (1 << EffectType.reverb)) != 0;
	}
//}
