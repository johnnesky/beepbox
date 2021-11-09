/*!
Copyright (C) 2021 John Nesky

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

export interface Dictionary<T> {
	[K: string]: T;
}

export interface DictionaryArray<T> extends ReadonlyArray<T> {
	dictionary: Dictionary<T>;
}

export const enum FilterType {
	lowPass,
	highPass,
	peak,
	length,
}

export const enum EnvelopeType {
	noteSize,
	none,
	punch,
	flare,
	twang,
	swell,
	tremolo,
	tremolo2,
	decay,
}

export const enum InstrumentType {
	chip,
	fm,
	noise,
	spectrum,
	drumset,
	harmonics,
	pwm,
	pickedString,
	length,
}

export const enum EffectType {
	reverb,
	chorus,
	panning,
	distortion,
	bitcrusher,
	noteFilter,
	echo,
	pitchShift,
	detune,
	vibrato,
	transition,
	chord,
	// If you add more, you'll also have to extend the bitfield used in Base64 which currently uses two six-bit characters.
	length,
}

export const enum NoteAutomationIndex {
	noteVolume,
	noteFilterAllFreqs,
	pulseWidth,
	stringSustain,
	unison,
	operatorFrequency0, operatorFrequency1, operatorFrequency2, operatorFrequency3,
	operatorAmplitude0, operatorAmplitude1, operatorAmplitude2, operatorAmplitude3,
	feedbackAmplitude,
	pitchShift,
	detune,
	vibratoDepth,
	noteFilterFreq0, noteFilterFreq1, noteFilterFreq2, noteFilterFreq3, noteFilterFreq4, noteFilterFreq5, noteFilterFreq6, noteFilterFreq7,
	noteFilterGain0, noteFilterGain1, noteFilterGain2, noteFilterGain3, noteFilterGain4, noteFilterGain5, noteFilterGain6, noteFilterGain7,
	length,
}

/*
export const enum InstrumentAutomationIndex {
	mixVolume,
	eqFilterAllFreqs,
	eqFilterFreq0, eqFilterFreq1, eqFilterFreq2, eqFilterFreq3, eqFilterFreq4, eqFilterFreq5, eqFilterFreq6, eqFilterFreq7,
	eqFilterGain0, eqFilterGain1, eqFilterGain2, eqFilterGain3, eqFilterGain4, eqFilterGain5, eqFilterGain6, eqFilterGain7,
	distortion,
	bitcrusherQuantization,
	bitcrusherFrequency,
	panning,
	chorus,
	echoSustain,
	//echoDelay, // Wait until tick settings can be computed once for multiple run lengths.
	reverb,
	length,
}
*/

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
	readonly continues: boolean;
	readonly slides: boolean;
	readonly slideTicks: number;
	readonly includeAdjacentPatterns: boolean;
}

export interface Vibrato extends BeepBoxOption {
	readonly amplitude: number;
	readonly periodsSeconds: ReadonlyArray<number>;
	readonly delayTicks: number;
}

export interface Unison extends BeepBoxOption {
	readonly voices: number;
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

export interface Feedback extends BeepBoxOption {
	readonly indices: ReadonlyArray<ReadonlyArray<number>>;
}

export interface Envelope extends BeepBoxOption {
	readonly type: EnvelopeType;
	readonly speed: number;
}

export interface AutomationTarget extends BeepBoxOption {
	readonly computeIndex: NoteAutomationIndex /*| InstrumentAutomationIndex*/ | null;
	readonly displayName: string;
	//readonly perNote: boolean; // Whether to compute envelopes on a per-note basis.
	readonly interleave: boolean; // Whether to interleave this target with the next one in the menu.
	readonly isFilter: boolean; // Filters have a variable maxCount in practice.
	//readonly range: number | null; // set if automation is allowed.
	readonly maxCount: number;
	readonly effect: EffectType | null;
	readonly compatibleInstruments: InstrumentType[] | null;
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
	public static readonly echoDelayRange: number = 24;
	public static readonly echoDelayStepTicks: number = 4;
	public static readonly echoSustainRange: number = 8;
	public static readonly echoShelfHz: number = 4000.0; // The cutoff freq of the shelf filter that is used to decay echoes.
	public static readonly echoShelfGain: number = Math.pow(2.0, -0.5);
	public static readonly reverbShelfHz: number = 8000.0; // The cutoff freq of the shelf filter that is used to decay reverb.
	public static readonly reverbShelfGain: number = Math.pow(2.0, -1.5);
	public static readonly reverbRange: number = 4;
	public static readonly reverbDelayBufferSize: number = 16384; // TODO: Compute a buffer size based on sample rate.
	public static readonly reverbDelayBufferMask: number = Config.reverbDelayBufferSize - 1; // TODO: Compute a buffer size based on sample rate.
	public static readonly beatsPerBarMin: number = 3;
	public static readonly beatsPerBarMax: number = 16;
	public static readonly barCountMin: number = 1;
	public static readonly barCountMax: number = 128;
	public static readonly instrumentCountMin: number = 1;
	public static readonly layeredInstrumentCountMax: number = 4;
	public static readonly patternInstrumentCountMax: number = 10;
	public static readonly partsPerBeat: number = 24;
	public static readonly ticksPerPart: number = 2;
	public static readonly rhythms: DictionaryArray<Rhythm> = toNameMap([
		{name: "÷3 (triplets)", stepsPerBeat: 3, ticksPerArpeggio: 4, arpeggioPatterns: [[0], [0, 0, 1, 1], [0, 1, 2, 1]], roundUpThresholds: [/*0*/ 5, /*8*/ 12, /*16*/ 18 /*24*/]},
		{name: "÷4 (standard)", stepsPerBeat: 4, ticksPerArpeggio: 3, arpeggioPatterns: [[0], [0, 0, 1, 1], [0, 1, 2, 1]], roundUpThresholds: [/*0*/ 3, /*6*/ 9, /*12*/ 17, /*18*/ 21 /*24*/]},
		{name: "÷6",            stepsPerBeat: 6, ticksPerArpeggio: 4, arpeggioPatterns: [[0], [0, 1],       [0, 1, 2, 1]], roundUpThresholds: null},
		{name: "÷8",            stepsPerBeat: 8, ticksPerArpeggio: 3, arpeggioPatterns: [[0], [0, 1],       [0, 1, 2, 1]], roundUpThresholds: null},
		{name: "freehand",      stepsPerBeat:24, ticksPerArpeggio: 3, arpeggioPatterns: [[0], [0, 1],       [0, 1, 2, 1]], roundUpThresholds: null},
	]);
	
	public static readonly instrumentTypeNames: ReadonlyArray<string> = ["chip", "FM", "noise", "spectrum", "drumset", "harmonics", "PWM", "Picked String"]; // See InstrumentType enum above.
	public static readonly instrumentTypeHasSpecialInterval: ReadonlyArray<boolean> = [true, true, false, false, false, true, false, false];
	public static readonly chipBaseExpression:      number = 0.03375; // Doubled by unison feature, but affected by expression adjustments per unison setting and wave shape.
	public static readonly fmBaseExpression:        number = 0.03;
	public static readonly noiseBaseExpression:     number = 0.19;
	public static readonly spectrumBaseExpression:  number = 0.3; // Spectrum can be in pitch or noise channels, the expression is doubled for noise.
	public static readonly drumsetBaseExpression:   number = 0.45; // Drums tend to be loud but brief!
	public static readonly harmonicsBaseExpression: number = 0.025;
	public static readonly pwmBaseExpression:       number = 0.04725; // It's actually closer to half of this, the synthesized pulse amplitude range is only .5 to -.5, but also note that the fundamental sine partial amplitude of a square wave is 4/π times the measured square wave amplitude.
	public static readonly pickedStringBaseExpression: number = 0.025; // Same as harmonics.
	public static readonly distortionBaseVolume:    number = 0.011; // Distortion is not affected by pitchDamping, which otherwise approximately halves expression for notes around the middle of the range.
	public static readonly bitcrusherBaseVolume:    number = 0.010; // Also not affected by pitchDamping, used when bit crushing is maxed out (aka "1-bit" output).
	
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
	
	public static readonly filterFreqStep: number = 1.0/4.0;
	public static readonly filterFreqRange: number = 34;
	public static readonly filterFreqReferenceSetting: number = 28;
	public static readonly filterFreqReferenceHz: number = 8000.0;
	public static readonly filterFreqMaxHz: number = Config.filterFreqReferenceHz * Math.pow(2.0, Config.filterFreqStep * (Config.filterFreqRange - 1 - Config.filterFreqReferenceSetting)); // ~19khz
	public static readonly filterFreqMinHz: number = 8.0;
	public static readonly filterGainRange: number = 15;
	public static readonly filterGainCenter: number = 7;
	public static readonly filterGainStep: number = 1.0/2.0;
	public static readonly filterMaxPoints: number = 8;
	public static readonly filterTypeNames: ReadonlyArray<string> = ["low-pass", "high-pass", "peak"]; // See FilterType enum above.
	
	public static readonly fadeInRange: number = 10;
	public static readonly fadeOutTicks: ReadonlyArray<number> = [-24, -12, -6, -3, -1, 6, 12, 24, 48, 72, 96];
	public static readonly fadeOutNeutral: number = 4;
	public static readonly drumsetFadeOutTicks: number = 48;
	public static readonly transitions: DictionaryArray<Transition> = toNameMap([
		{name: "normal",        isSeamless: false, continues: false, slides: false, slideTicks: 3, includeAdjacentPatterns: false},
		{name: "interrupt",     isSeamless: true,  continues: false, slides: false, slideTicks: 3, includeAdjacentPatterns: true},
		{name: "continue",      isSeamless: true,  continues: true,  slides: false, slideTicks: 3, includeAdjacentPatterns: true},
		{name: "slide",         isSeamless: true,  continues: false, slides: true,  slideTicks: 3, includeAdjacentPatterns: true},
		{name: "slide in pattern", isSeamless: true,  continues: false, slides: true,  slideTicks: 3, includeAdjacentPatterns: false},
	]);
	public static readonly vibratos: DictionaryArray<Vibrato> = toNameMap([
		{name: "none",    amplitude: 0.0,  periodsSeconds: [0.14], delayTicks: 0},
		{name: "light",   amplitude: 0.15, periodsSeconds: [0.14], delayTicks: 0},
		{name: "delayed", amplitude: 0.3,  periodsSeconds: [0.14], delayTicks: 37}, // It will fade in over the previous two ticks.
		{name: "heavy",   amplitude: 0.45, periodsSeconds: [0.14], delayTicks: 0},
		{name: "shaky",   amplitude: 0.1,  periodsSeconds: [0.11, 1.618*0.11, 3*0.11], delayTicks: 0},
	]);
	public static readonly unisons: DictionaryArray<Unison> = toNameMap([
		{name: "none",       voices: 1, spread: 0.0,  offset: 0.0, expression: 1.4, sign: 1.0},
		{name: "shimmer",    voices: 2, spread: 0.018,offset: 0.0, expression: 0.8, sign: 1.0},
		{name: "hum",        voices: 2, spread: 0.045,offset: 0.0, expression: 1.0, sign: 1.0},
		{name: "honky tonk", voices: 2, spread: 0.09, offset: 0.0, expression: 1.0, sign: 1.0},
		{name: "dissonant",  voices: 2, spread: 0.25, offset: 0.0, expression: 0.9, sign: 1.0},
		{name: "fifth",      voices: 2, spread: 3.5,  offset: 3.5, expression: 0.9, sign: 1.0},
		{name: "octave",     voices: 2, spread: 6.0,  offset: 6.0, expression: 0.8, sign: 1.0},
		{name: "bowed",      voices: 2, spread: 0.02, offset: 0.0, expression: 1.0, sign:-1.0},
		{name: "piano",      voices: 2, spread: 0.01, offset: 0.0, expression: 1.0, sign: 0.7},
	]);
	public static readonly effectNames: ReadonlyArray<string> = ["reverb", "chorus", "panning", "distortion", "bitcrusher", "note filter", "echo", "pitch shift", "detune", "vibrato", "transition type", "chord type"];
	public static readonly effectOrder: ReadonlyArray<EffectType> = [EffectType.transition, EffectType.chord, EffectType.pitchShift, EffectType.detune, EffectType.vibrato, EffectType.noteFilter, EffectType.distortion, EffectType.bitcrusher, EffectType.panning, EffectType.chorus, EffectType.echo, EffectType.reverb];
	public static readonly noteSizeMax: number = 3;
	public static readonly volumeRange: number = 8;
	public static readonly volumeLogScale: number = -0.5;
	public static readonly panCenter: number = 4;
	public static readonly panMax: number = Config.panCenter * 2;
	public static readonly panDelaySecondsMax: number = 0.0005;
	public static readonly chorusRange: number = 4;
	public static readonly chorusPeriodSeconds: number = 2.0;
	public static readonly chorusDelayRange: number = 0.0034;
	public static readonly chorusDelayOffsets: ReadonlyArray<ReadonlyArray<number>> = [[1.51, 2.10, 3.35], [1.47, 2.15, 3.25]];
	public static readonly chorusPhaseOffsets: ReadonlyArray<ReadonlyArray<number>> = [[0.0, 2.1, 4.2], [3.2, 5.3, 1.0]];
	public static readonly chorusMaxDelay: number = Config.chorusDelayRange * (1.0 + Config.chorusDelayOffsets[0].concat(Config.chorusDelayOffsets[1]).reduce((x,y)=>Math.max(x,y)));
	public static readonly chords: DictionaryArray<Chord> = toNameMap([
		{name: "simultaneous",    customInterval: false, arpeggiates: false, strumParts: 0, singleTone: false},
		{name: "strum",           customInterval: false, arpeggiates: false, strumParts: 1, singleTone: false},
		{name: "arpeggio",        customInterval: false, arpeggiates:  true, strumParts: 0, singleTone:  true},
		{name: "custom interval", customInterval:  true, arpeggiates: false, strumParts: 0, singleTone:  true},
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
		{name: "none",     type: EnvelopeType.none,     speed:  0.0},
		{name: "note size",type: EnvelopeType.noteSize, speed:  0.0},
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
	public static readonly harmonicsRenderedForPickedString: number = 1 << 8; // 256
	public static readonly harmonicsControlPointBits: number = 3;
	public static readonly harmonicsMax: number = (1 << Config.harmonicsControlPointBits) - 1;
	public static readonly harmonicsWavelength: number = 1 << 11; // 2048
	public static readonly pulseWidthRange: number = 8;
	public static readonly pulseWidthStepPower: number = 0.5;
	public static readonly pitchChannelCountMin: number = 1;
	public static readonly pitchChannelCountMax: number = 10;
	public static readonly noiseChannelCountMin: number = 0;
	public static readonly noiseChannelCountMax: number = 5;
	public static readonly noiseInterval: number = 6;
	public static readonly pitchesPerOctave: number = 12; // TODO: Use this for converting pitch to frequency.
	public static readonly drumCount: number = 12;
	public static readonly pitchOctaves: number = 7;
	public static readonly maxPitch: number = Config.pitchOctaves * Config.pitchesPerOctave;
	public static readonly maximumTonesPerChannel: number = Config.maxChordSize * 2;
	public static readonly justIntonationSemitones: number[] = [1.0/2.0, 8.0/15.0, 9.0/16.0, 3.0/5.0, 5.0/8.0, 2.0/3.0, 32.0/45.0, 3.0/4.0, 4.0/5.0, 5.0/6.0, 8.0/9.0, 15.0/16.0, 1.0, 16.0/15.0, 9.0/8.0, 6.0/5.0, 5.0/4.0, 4.0/3.0, 45.0/32.0, 3.0/2.0, 8.0/5.0, 5.0/3.0, 16.0/9.0, 15.0/8.0, 2.0].map(x=>Math.log2(x) * Config.pitchesPerOctave);
	public static readonly pitchShiftRange: number = Config.justIntonationSemitones.length;
	public static readonly pitchShiftCenter: number = Config.pitchShiftRange >> 1;
	public static readonly detuneCenter: number = 9;
	public static readonly detuneMax: number = Config.detuneCenter * 2;
	public static readonly sineWaveLength: number = 1 << 8; // 256
	public static readonly sineWaveMask: number = Config.sineWaveLength - 1;
	public static readonly sineWave: Float64Array = generateSineWave();
	
	// Picked strings have an all-pass filter with a corner frequency based on the tone fundamental frequency, in order to add a slight inharmonicity. (Which is important for distortion.)
	public static readonly pickedStringDispersionCenterFreq: number = 6000.0; // The tone fundamental freq is pulled toward this freq for computing the all-pass corner freq.
	public static readonly pickedStringDispersionFreqScale: number = 0.3; // The tone fundamental freq freq moves this much toward the center freq for computing the all-pass corner freq.
	public static readonly pickedStringDispersionFreqMult: number = 4.0; // The all-pass corner freq is based on this times the adjusted tone fundamental freq.
	public static readonly pickedStringShelfHz: number = 4000.0; // The cutoff freq of the shelf filter that is used to decay the high frequency energy in the picked string.
	
	public static readonly distortionRange: number = 8;
	public static readonly stringSustainRange: number = 15;
	public static readonly stringDecayRate: number = 0.12;
	public static readonly bitcrusherFreqRange: number = 14;
	public static readonly bitcrusherOctaveStep: number = 0.5;
	public static readonly bitcrusherQuantizationRange: number = 8;
	
	public static readonly maxEnvelopeCount: number = 12;
	public static readonly defaultAutomationRange: number = 13;
	public static readonly instrumentAutomationTargets: DictionaryArray<AutomationTarget> = toNameMap([
		{name: "none",                   computeIndex:                           null,                   displayName: "none",             /*perNote: false,*/ interleave: false, isFilter: false, /*range: 0,                              */    maxCount: 1,    effect: null,                    compatibleInstruments: null},
		{name: "noteVolume",             computeIndex:       NoteAutomationIndex.noteVolume,             displayName: "note volume",      /*perNote:  true,*/ interleave: false, isFilter: false, /*range: Config.volumeRange,             */    maxCount: 1,    effect: null,                    compatibleInstruments: null},
		{name: "pulseWidth",             computeIndex:       NoteAutomationIndex.pulseWidth,             displayName: "pulse width",      /*perNote:  true,*/ interleave: false, isFilter: false, /*range: Config.pulseWidthRange,         */    maxCount: 1,    effect: null,                    compatibleInstruments: [InstrumentType.pwm]},
		{name: "stringSustain",          computeIndex:       NoteAutomationIndex.stringSustain,          displayName: "sustain",          /*perNote:  true,*/ interleave: false, isFilter: false, /*range: Config.stringSustainRange,      */    maxCount: 1,    effect: null,                    compatibleInstruments: [InstrumentType.pickedString]},
		{name: "unison",                 computeIndex:       NoteAutomationIndex.unison,                 displayName: "unison",           /*perNote:  true,*/ interleave: false, isFilter: false, /*range: Config.defaultAutomationRange,  */    maxCount: 1,    effect: null,                    compatibleInstruments: [InstrumentType.chip, InstrumentType.harmonics, InstrumentType.pickedString]},
		{name: "operatorFrequency",      computeIndex:       NoteAutomationIndex.operatorFrequency0,     displayName: "fm# freq",         /*perNote:  true,*/ interleave:  true, isFilter: false, /*range: Config.defaultAutomationRange,  */    maxCount: Config.operatorCount, effect: null,    compatibleInstruments: [InstrumentType.fm]},
		{name: "operatorAmplitude",      computeIndex:       NoteAutomationIndex.operatorAmplitude0,     displayName: "fm# volume",       /*perNote:  true,*/ interleave: false, isFilter: false, /*range: Config.operatorAmplitudeMax + 1,*/    maxCount: Config.operatorCount, effect: null,    compatibleInstruments: [InstrumentType.fm]},
		{name: "feedbackAmplitude",      computeIndex:       NoteAutomationIndex.feedbackAmplitude,      displayName: "fm feedback",      /*perNote:  true,*/ interleave: false, isFilter: false, /*range: Config.operatorAmplitudeMax + 1,*/    maxCount: 1,    effect: null,                    compatibleInstruments: [InstrumentType.fm]},
		{name: "pitchShift",             computeIndex:       NoteAutomationIndex.pitchShift,             displayName: "pitch shift",      /*perNote:  true,*/ interleave: false, isFilter: false, /*range: Config.pitchShiftRange,         */    maxCount: 1,    effect: EffectType.pitchShift,   compatibleInstruments: null},
		{name: "detune",                 computeIndex:       NoteAutomationIndex.detune,                 displayName: "detune",           /*perNote:  true,*/ interleave: false, isFilter: false, /*range: Config.detuneMax + 1,           */    maxCount: 1,    effect: EffectType.detune,       compatibleInstruments: null},
		{name: "vibratoDepth",           computeIndex:       NoteAutomationIndex.vibratoDepth,           displayName: "vibrato range",    /*perNote:  true,*/ interleave: false, isFilter: false, /*range: Config.defaultAutomationRange,  */    maxCount: 1,    effect: EffectType.vibrato,      compatibleInstruments: null},
		{name: "noteFilterAllFreqs",     computeIndex:       NoteAutomationIndex.noteFilterAllFreqs,     displayName: "n. filter freqs",  /*perNote:  true,*/ interleave: false, isFilter:  true, /*range: null,                           */    maxCount: 1,    effect: EffectType.noteFilter,   compatibleInstruments: null},
		{name: "noteFilterFreq",         computeIndex:       NoteAutomationIndex.noteFilterFreq0,        displayName: "n. filter # freq", /*perNote:  true,*/ interleave: false/*true*/, isFilter:  true, /*range: Config.filterFreqRange,     */        maxCount: Config.filterMaxPoints, effect: EffectType.noteFilter, compatibleInstruments: null},
		// Controlling filter gain is less obvious and intuitive than controlling filter freq, so to avoid confusion I've disabled it for now...
		//{name: "noteFilterGain",         computeIndex:       NoteAutomationIndex.noteFilterGain0,        displayName: "n. filter # vol",  /*perNote:  true,*/ interleave: false, isFilter:  true, range: Config.filterGainRange,             maxCount: Config.filterMaxPoints, effect: EffectType.noteFilter, compatibleInstruments: null},
		/*
		{name: "distortion",             computeIndex: InstrumentAutomationIndex.distortion,             displayName: "distortion",       perNote: false, interleave: false, isFilter: false, range: Config.distortionRange,             maxCount: 1,    effect: EffectType.distortion,   compatibleInstruments: null},
		{name: "bitcrusherQuantization", computeIndex: InstrumentAutomationIndex.bitcrusherQuantization, displayName: "bit crush",        perNote: false, interleave: false, isFilter: false, range: Config.bitcrusherQuantizationRange, maxCount: 1,    effect: EffectType.bitcrusher,   compatibleInstruments: null},
		{name: "bitcrusherFrequency",    computeIndex: InstrumentAutomationIndex.bitcrusherFrequency,    displayName: "freq crush",       perNote: false, interleave: false, isFilter: false, range: Config.bitcrusherFreqRange,         maxCount: 1,    effect: EffectType.bitcrusher,   compatibleInstruments: null},
		{name: "eqFilterAllFreqs",       computeIndex: InstrumentAutomationIndex.eqFilterAllFreqs,       displayName: "eq filter freqs",  perNote: false, interleave: false, isFilter:  true, range: null,                               maxCount: 1,    effect: null,                    compatibleInstruments: null},
		{name: "eqFilterFreq",           computeIndex: InstrumentAutomationIndex.eqFilterFreq0,          displayName: "eq filter # freq", perNote: false, interleave:  true, isFilter:  true, range: Config.filterFreqRange,             maxCount: Config.filterMaxPoints, effect: null,  compatibleInstruments: null},
		{name: "eqFilterGain",           computeIndex: InstrumentAutomationIndex.eqFilterGain0,          displayName: "eq filter # vol",  perNote: false, interleave: false, isFilter:  true, range: Config.filterGainRange,             maxCount: Config.filterMaxPoints, effect: null,  compatibleInstruments: null},
		{name: "panning",                computeIndex: InstrumentAutomationIndex.panning,                displayName: "panning",          perNote: false, interleave: false, isFilter: false, range: Config.panMax + 1,                  maxCount: 1,    effect: EffectType.panning,      compatibleInstruments: null},
		{name: "chorus",                 computeIndex: InstrumentAutomationIndex.chorus,                 displayName: "chorus",           perNote: false, interleave: false, isFilter: false, range: Config.chorusRange,                 maxCount: 1,    effect: EffectType.chorus,       compatibleInstruments: null},
		{name: "echoSustain",            computeIndex: InstrumentAutomationIndex.echoSustain,            displayName: "echo",             perNote: false, interleave: false, isFilter: false, range: Config.echoSustainRange,            maxCount: 1,    effect: EffectType.echo,         compatibleInstruments: null},
		{name: "echoDelay",              computeIndex: InstrumentAutomationIndex.echoDelay,              displayName: "echo delay",       perNote: false, interleave: false, isFilter: false, range: Config.echoDelayRange,              maxCount: 1,    effect: EffectType.echo,         compatibleInstruments: null}, // wait until after we're computing a tick's settings for multiple run lengths.
		{name: "reverb",                 computeIndex: InstrumentAutomationIndex.reverb,                 displayName: "reverb",           perNote: false, interleave: false, isFilter: false, range: Config.reverbRange,                 maxCount: 1,    effect: EffectType.reverb,       compatibleInstruments: null},
		{name: "mixVolume",              computeIndex: InstrumentAutomationIndex.mixVolume,              displayName: "mix volume",       perNote: false, interleave: false, isFilter: false, range: Config.volumeRange,                 maxCount: 1,    effect: null,                    compatibleInstruments: null},
		{name: "envelope#",              computeIndex: null,                                             displayName: "envelope",         perNote: false, interleave: false, isFilter: false, range: Config.defaultAutomationRange,      maxCount: Config.maxEnvelopeCount, effect: null, compatibleInstruments: null}, // maxCount special case for envelopes to be allowed to target earlier ones.
		*/
	]);
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

export function effectsIncludeTransition(effects: number): boolean {
	return (effects & (1 << EffectType.transition)) != 0;
}
export function effectsIncludeChord(effects: number): boolean {
	return (effects & (1 << EffectType.chord)) != 0;
}
export function effectsIncludePitchShift(effects: number): boolean {
	return (effects & (1 << EffectType.pitchShift)) != 0;
}
export function effectsIncludeDetune(effects: number): boolean {
	return (effects & (1 << EffectType.detune)) != 0;
}
export function effectsIncludeVibrato(effects: number): boolean {
	return (effects & (1 << EffectType.vibrato)) != 0;
}
export function effectsIncludeNoteFilter(effects: number): boolean {
	return (effects & (1 << EffectType.noteFilter)) != 0;
}
export function effectsIncludeDistortion(effects: number): boolean {
	return (effects & (1 << EffectType.distortion)) != 0;
}
export function effectsIncludeBitcrusher(effects: number): boolean {
	return (effects & (1 << EffectType.bitcrusher)) != 0;
}
export function effectsIncludePanning(effects: number): boolean {
	return (effects & (1 << EffectType.panning)) != 0;
}
export function effectsIncludeChorus(effects: number): boolean {
	return (effects & (1 << EffectType.chorus)) != 0;
}
export function effectsIncludeEcho(effects: number): boolean {
	return (effects & (1 << EffectType.echo)) != 0;
}
export function effectsIncludeReverb(effects: number): boolean {
	return (effects & (1 << EffectType.reverb)) != 0;
}
