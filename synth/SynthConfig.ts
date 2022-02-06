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
    customChipWave,
    mod,
    length,
}

export const enum DropdownID {
    Vibrato = 0,
    Pan = 1,
    Chord = 2,
    Transition = 3,
    FM = 4,

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
    readonly roundUpThresholds: number[] | null;
}

export interface ChipWave extends BeepBoxOption {
    readonly expression: number;
    samples: Float64Array;
}

export interface OperatorWave extends BeepBoxOption {
    samples: Float64Array;
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
    readonly type: number;
    readonly delayTicks: number;
}

export interface VibratoType extends BeepBoxOption {
    readonly periodsSeconds: number[];
    readonly period: number;
}

export interface Unison extends BeepBoxOption {
    readonly voices: number;
    readonly spread: number;
    readonly offset: number;
    readonly expression: number;
    readonly sign: number;
}

export interface Modulator extends BeepBoxOption {
    readonly name: string; // name that shows up in song editor UI
    readonly pianoName: string; // short name that shows up in mod piano UI
    readonly maxRawVol: number; // raw
    readonly newNoteVol: number; // raw
    readonly forSong: boolean; // true - setting is song scope
    convertRealFactor: number; // offset that needs to be applied to get a "real" number display of value, for UI purposes
    readonly associatedEffect: EffectType; // effect that should be enabled for this modulator to work properly. If unused, set to EffectType.length.

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
    // Params for post-processing compressor
    public static thresholdVal: number = -10;
    public static kneeVal: number = 40;
    public static ratioVal: number = 12;
    public static attackVal: number = 0;
    public static releaseVal: number = 0.25;

    public static readonly scales: DictionaryArray<Scale> = toNameMap([

        //   C     Db      D     Eb      E      F     F#      G     Ab      A     Bb      B      C
        { name: "Free", realName: "chromatic", flags: [true, true, true, true, true, true, true, true, true, true, true, true] }, // Free
        { name: "Major", realName: "ionian", flags: [true, false, true, false, true, true, false, true, false, true, false, true] }, // Major
        { name: "Minor", realName: "aeolian", flags: [true, false, true, true, false, true, false, true, true, false, true, false] }, // Minor
        { name: "Mixolydian", realName: "mixolydian", flags: [true, false, true, false, true, true, false, true, false, true, true, false] }, // Mixolydian
        { name: "Lydian", realName: "lydian", flags: [true, false, true, false, true, false, true, true, false, true, false, true] }, // Lydian
        { name: "Dorian", realName: "dorian", flags: [true, false, true, true, false, true, false, true, false, true, true, false] }, // Dorian
        { name: "Phrygian", realName: "phrygian", flags: [true, true, false, true, false, true, false, true, true, false, true, false] }, // Phrygian
        { name: "Locrian", realName: "locrian", flags: [true, true, false, true, false, true, true, false, true, false, true, false] }, // Locrian
        { name: "Lydian Dominant", realName: "lydian dominant", flags: [true, false, true, false, true, false, true, true, false, true, true, false] }, // Lydian Dominant
        { name: "Phrygian Dominant", realName: "phrygian dominant", flags: [true, true, false, false, true, true, false, true, true, false, true, false] }, // Phrygian Dominant
        { name: "Harmonic Major", realName: "harmonic major", flags: [true, false, true, false, true, true, false, true, true, false, false, true] }, // Harmonic Major
        { name: "Harmonic Minor", realName: "harmonic minor", flags: [true, false, true, true, false, true, false, true, true, false, false, true] }, // Harmonic Minor
        { name: "Melodic Minor", realName: "melodic minor", flags: [true, false, true, true, false, true, false, true, false, true, false, true] }, // Melodic Minor
        { name: "Blues", realName: "blues", flags: [true, false, false, true, false, true, true, true, false, false, true, false] }, // Blues
        { name: "Altered", realName: "altered", flags: [true, true, false, true, true, false, true, false, true, false, true, false] }, // Altered
        { name: "Major Pentatonic", realName: "major pentatonic", flags: [true, false, true, false, true, false, false, true, false, true, false, false] }, // Major Pentatonic
        { name: "Minor Pentatonic", realName: "minor pentatonic", flags: [true, false, false, true, false, true, false, true, false, false, true, false] }, // Minor Pentatonic
        { name: "Whole Tone", realName: "whole tone", flags: [true, false, true, false, true, false, true, false, true, false, true, false] }, // Whole Tone
        { name: "Octatonic", realName: "octatonic", flags: [true, false, true, true, false, true, true, false, true, true, false, true] }, // Octatonic
        { name: "Hexatonic", realName: "hexatonic", flags: [true, false, false, true, true, false, false, true, true, false, false, true] }, // Hexatonic


    ]);
    public static readonly keys: DictionaryArray<Key> = toNameMap([
        { name: "C", isWhiteKey: true, basePitch: 12 }, // C0 has index 12 on the MIDI scale. C7 is 96, and C9 is 120. C10 is barely in the audible range.
        { name: "C♯", isWhiteKey: false, basePitch: 13 },
        { name: "D", isWhiteKey: true, basePitch: 14 },
        { name: "D♯", isWhiteKey: false, basePitch: 15 },
        { name: "E", isWhiteKey: true, basePitch: 16 },
        { name: "F", isWhiteKey: true, basePitch: 17 },
        { name: "F♯", isWhiteKey: false, basePitch: 18 },
        { name: "G", isWhiteKey: true, basePitch: 19 },
        { name: "G♯", isWhiteKey: false, basePitch: 20 },
        { name: "A", isWhiteKey: true, basePitch: 21 },
        { name: "A♯", isWhiteKey: false, basePitch: 22 },
        { name: "B", isWhiteKey: true, basePitch: 23 },
    ]);
    public static readonly blackKeyNameParents: ReadonlyArray<number> = [-1, 1, -1, 1, -1, 1, -1, -1, 1, -1, 1, -1];
    public static readonly tempoMin: number = 30;
    public static readonly tempoMax: number = 320;
    public static readonly echoDelayRange: number = 24;
    public static readonly echoDelayStepTicks: number = 4;
    public static readonly echoSustainRange: number = 8;
    public static readonly echoShelfHz: number = 4000.0; // The cutoff freq of the shelf filter that is used to decay echoes.
    public static readonly echoShelfGain: number = Math.pow(2.0, -0.5);
    public static readonly reverbShelfHz: number = 8000.0; // The cutoff freq of the shelf filter that is used to decay reverb.
    public static readonly reverbShelfGain: number = Math.pow(2.0, -1.5);
    public static readonly reverbRange: number = 32;
    public static readonly reverbDelayBufferSize: number = 16384; // TODO: Compute a buffer size based on sample rate.
    public static readonly reverbDelayBufferMask: number = Config.reverbDelayBufferSize - 1; // TODO: Compute a buffer size based on sample rate.
    public static readonly beatsPerBarMin: number = 3;
    public static readonly beatsPerBarMax: number = 16;
    public static readonly barCountMin: number = 1;
    public static readonly barCountMax: number = 256;
    public static readonly instrumentCountMin: number = 1;
    public static readonly layeredInstrumentCountMax: number = 4;
    public static readonly patternInstrumentCountMax: number = 10;
    public static readonly partsPerBeat: number = 24;
    public static readonly ticksPerPart: number = 2;
    public static readonly ticksPerArpeggio: number = 3;
    public static readonly arpeggioPatterns: ReadonlyArray<ReadonlyArray<number>> = [[0], [0, 1], [0, 1, 2, 1], [0, 1, 2, 3], [0, 1, 2, 3, 4], [0, 1, 2, 3, 4, 5], [0, 1, 2, 3, 4, 5, 6], [0, 1, 2, 3, 4, 5, 6, 7]];
    public static readonly rhythms: DictionaryArray<Rhythm> = toNameMap([
        { name: "÷3 (triplets)", stepsPerBeat: 3, /*ticksPerArpeggio: 4, arpeggioPatterns: [[0], [0, 0, 1, 1], [0, 1, 2, 1], [0, 1, 2, 3]]*/ roundUpThresholds: [/*0*/ 5, /*8*/ 12, /*16*/ 18 /*24*/] },
        { name: "÷4 (standard)", stepsPerBeat: 4, /*ticksPerArpeggio: 3, arpeggioPatterns: [[0], [0, 0, 1, 1], [0, 1, 2, 1], [0, 1, 2, 3]]*/ roundUpThresholds: [/*0*/ 3, /*6*/ 9, /*12*/ 17, /*18*/ 21 /*24*/] },
        { name: "÷6", stepsPerBeat: 6, /*ticksPerArpeggio: 4, arpeggioPatterns: [[0], [0, 1], [0, 1, 2, 1], [0, 1, 2, 3]]*/ roundUpThresholds: null },
        { name: "÷8", stepsPerBeat: 8, /*ticksPerArpeggio: 3, arpeggioPatterns: [[0], [0, 1], [0, 1, 2, 1], [0, 1, 2, 3]]*/ roundUpThresholds: null },
        { name: "freehand", stepsPerBeat: 24, /*ticksPerArpeggio: 3, arpeggioPatterns: [[0], [0, 1], [0, 1, 2, 1], [0, 1, 2, 3]]*/ roundUpThresholds: null },
    ]);

    public static readonly instrumentTypeNames: ReadonlyArray<string> = ["chip", "FM", "noise", "spectrum", "drumset", "harmonics", "PWM", "Picked String", "custom chip", "mod"];
    public static readonly instrumentTypeHasSpecialInterval: ReadonlyArray<boolean> = [true, true, false, false, false, true, false, false, false];
    public static readonly chipBaseExpression: number = 0.03375; // Doubled by unison feature, but affected by expression adjustments per unison setting and wave shape.
    public static readonly fmBaseExpression: number = 0.03;
    public static readonly noiseBaseExpression: number = 0.19;
    public static readonly spectrumBaseExpression: number = 0.3; // Spectrum can be in pitch or noise channels, the expression is doubled for noise.
    public static readonly drumsetBaseExpression: number = 0.45; // Drums tend to be loud but brief!
    public static readonly harmonicsBaseExpression: number = 0.025;
    public static readonly pwmBaseExpression: number = 0.04725; // It's actually closer to half of this, the synthesized pulse amplitude range is only .5 to -.5, but also note that the fundamental sine partial amplitude of a square wave is 4/π times the measured square wave amplitude.
    public static readonly pickedStringBaseExpression: number = 0.025; // Same as harmonics.
    public static readonly distortionBaseVolume: number = 0.011; // Distortion is not affected by pitchDamping, which otherwise approximately halves expression for notes around the middle of the range.
    public static readonly bitcrusherBaseVolume: number = 0.010; // Also not affected by pitchDamping, used when bit crushing is maxed out (aka "1-bit" output).

    public static readonly rawChipWaves: DictionaryArray<ChipWave> = toNameMap([
        { name: "rounded", expression: 0.94, samples: centerWave([0.0, 0.2, 0.4, 0.5, 0.6, 0.7, 0.8, 0.85, 0.9, 0.95, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 0.95, 0.9, 0.85, 0.8, 0.7, 0.6, 0.5, 0.4, 0.2, 0.0, -0.2, -0.4, -0.5, -0.6, -0.7, -0.8, -0.85, -0.9, -0.95, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -0.95, -0.9, -0.85, -0.8, -0.7, -0.6, -0.5, -0.4, -0.2]) },
        { name: "triangle", expression: 1.0, samples: centerWave([1.0 / 15.0, 3.0 / 15.0, 5.0 / 15.0, 7.0 / 15.0, 9.0 / 15.0, 11.0 / 15.0, 13.0 / 15.0, 15.0 / 15.0, 15.0 / 15.0, 13.0 / 15.0, 11.0 / 15.0, 9.0 / 15.0, 7.0 / 15.0, 5.0 / 15.0, 3.0 / 15.0, 1.0 / 15.0, -1.0 / 15.0, -3.0 / 15.0, -5.0 / 15.0, -7.0 / 15.0, -9.0 / 15.0, -11.0 / 15.0, -13.0 / 15.0, -15.0 / 15.0, -15.0 / 15.0, -13.0 / 15.0, -11.0 / 15.0, -9.0 / 15.0, -7.0 / 15.0, -5.0 / 15.0, -3.0 / 15.0, -1.0 / 15.0]) },
        { name: "square", expression: 0.5, samples: centerWave([1.0, -1.0]) },
        { name: "1/4 pulse", expression: 0.5, samples: centerWave([1.0, -1.0, -1.0, -1.0]) },
        { name: "1/8 pulse", expression: 0.5, samples: centerWave([1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0]) },
        { name: "sawtooth", expression: 0.65, samples: centerWave([1.0 / 31.0, 3.0 / 31.0, 5.0 / 31.0, 7.0 / 31.0, 9.0 / 31.0, 11.0 / 31.0, 13.0 / 31.0, 15.0 / 31.0, 17.0 / 31.0, 19.0 / 31.0, 21.0 / 31.0, 23.0 / 31.0, 25.0 / 31.0, 27.0 / 31.0, 29.0 / 31.0, 31.0 / 31.0, -31.0 / 31.0, -29.0 / 31.0, -27.0 / 31.0, -25.0 / 31.0, -23.0 / 31.0, -21.0 / 31.0, -19.0 / 31.0, -17.0 / 31.0, -15.0 / 31.0, -13.0 / 31.0, -11.0 / 31.0, -9.0 / 31.0, -7.0 / 31.0, -5.0 / 31.0, -3.0 / 31.0, -1.0 / 31.0]) },
        { name: "double saw", expression: 0.5, samples: centerWave([0.0, -0.2, -0.4, -0.6, -0.8, -1.0, 1.0, -0.8, -0.6, -0.4, -0.2, 1.0, 0.8, 0.6, 0.4, 0.2]) },
        { name: "double pulse", expression: 0.4, samples: centerWave([1.0, 1.0, 1.0, 1.0, 1.0, -1.0, -1.0, -1.0, 1.0, 1.0, 1.0, 1.0, -1.0, -1.0, -1.0, -1.0]) },
        { name: "spiky", expression: 0.4, samples: centerWave([1.0, -1.0, 1.0, -1.0, 1.0, 0.0]) },
        { name: "sine", expression: 0.88, samples: centerAndNormalizeWave([8.0, 9.0, 11.0, 12.0, 13.0, 14.0, 15.0, 15.0, 15.0, 15.0, 14.0, 14.0, 13.0, 11.0, 10.0, 9.0, 7.0, 6.0, 4.0, 3.0, 2.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 1.0, 2.0, 4.0, 5.0, 6.0]) },
        { name: "flute", expression: 0.8, samples: centerAndNormalizeWave([3.0, 4.0, 6.0, 8.0, 10.0, 11.0, 13.0, 14.0, 15.0, 15.0, 14.0, 13.0, 11.0, 8.0, 5.0, 3.0]) },
        { name: "harp", expression: 0.8, samples: centerAndNormalizeWave([0.0, 3.0, 3.0, 3.0, 4.0, 5.0, 5.0, 6.0, 7.0, 8.0, 9.0, 11.0, 11.0, 13.0, 13.0, 15.0, 15.0, 14.0, 12.0, 11.0, 10.0, 9.0, 8.0, 7.0, 7.0, 5.0, 4.0, 3.0, 2.0, 1.0, 0.0, 0.0]) },
        { name: "sharp clarinet", expression: 0.38, samples: centerAndNormalizeWave([0.0, 0.0, 0.0, 1.0, 1.0, 8.0, 8.0, 9.0, 9.0, 9.0, 8.0, 8.0, 8.0, 8.0, 8.0, 9.0, 9.0, 7.0, 9.0, 9.0, 10.0, 4.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0]) },
        { name: "soft clarinet", expression: 0.45, samples: centerAndNormalizeWave([0.0, 1.0, 5.0, 8.0, 9.0, 9.0, 9.0, 9.0, 9.0, 9.0, 9.0, 11.0, 11.0, 12.0, 13.0, 12.0, 10.0, 9.0, 7.0, 6.0, 4.0, 3.0, 3.0, 3.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0]) },
        { name: "alto sax", expression: 0.3, samples: centerAndNormalizeWave([5.0, 5.0, 6.0, 4.0, 3.0, 6.0, 8.0, 7.0, 2.0, 1.0, 5.0, 6.0, 5.0, 4.0, 5.0, 7.0, 9.0, 11.0, 13.0, 14.0, 14.0, 14.0, 14.0, 13.0, 10.0, 8.0, 7.0, 7.0, 4.0, 3.0, 4.0, 2.0]) },
        { name: "bassoon", expression: 0.35, samples: centerAndNormalizeWave([9.0, 9.0, 7.0, 6.0, 5.0, 4.0, 4.0, 4.0, 4.0, 5.0, 7.0, 8.0, 9.0, 10.0, 11.0, 13.0, 13.0, 11.0, 10.0, 9.0, 7.0, 6.0, 4.0, 2.0, 1.0, 1.0, 1.0, 2.0, 2.0, 5.0, 11.0, 14.0]) },
        { name: "trumpet", expression: 0.22, samples: centerAndNormalizeWave([10.0, 11.0, 8.0, 6.0, 5.0, 5.0, 5.0, 6.0, 7.0, 7.0, 7.0, 7.0, 6.0, 6.0, 7.0, 7.0, 7.0, 7.0, 7.0, 6.0, 6.0, 6.0, 6.0, 6.0, 6.0, 6.0, 6.0, 7.0, 8.0, 9.0, 11.0, 14.0]) },
        { name: "electric guitar", expression: 0.2, samples: centerAndNormalizeWave([11.0, 12.0, 12.0, 10.0, 6.0, 6.0, 8.0, 0.0, 2.0, 4.0, 8.0, 10.0, 9.0, 10.0, 1.0, 7.0, 11.0, 3.0, 6.0, 6.0, 8.0, 13.0, 14.0, 2.0, 0.0, 12.0, 8.0, 4.0, 13.0, 11.0, 10.0, 13.0]) },
        { name: "organ", expression: 0.2, samples: centerAndNormalizeWave([11.0, 10.0, 12.0, 11.0, 14.0, 7.0, 5.0, 5.0, 12.0, 10.0, 10.0, 9.0, 12.0, 6.0, 4.0, 5.0, 13.0, 12.0, 12.0, 10.0, 12.0, 5.0, 2.0, 2.0, 8.0, 6.0, 6.0, 5.0, 8.0, 3.0, 2.0, 1.0]) },
        { name: "pan flute", expression: 0.35, samples: centerAndNormalizeWave([1.0, 4.0, 7.0, 6.0, 7.0, 9.0, 7.0, 7.0, 11.0, 12.0, 13.0, 15.0, 13.0, 11.0, 11.0, 12.0, 13.0, 10.0, 7.0, 5.0, 3.0, 6.0, 10.0, 7.0, 3.0, 3.0, 1.0, 0.0, 1.0, 0.0, 1.0, 0.0]) },
        { name: "glitch", expression: 0.5, samples: centerWave([1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, -1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, -1.0, -1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, -1.0, -1.0, -1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, -1.0, -1.0, -1.0, -1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, -1.0, -1.0, -1.0, -1.0, -1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, -1.0, -1.0, -1.0, -1.0, -1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, -1.0, -1.0, -1.0, -1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, -1.0, -1.0, -1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, -1.0, -1.0]) },
    ]);
    public static readonly chipWaves: DictionaryArray<ChipWave> = rawChipToIntegrated(Config.rawChipWaves);
    // Noise waves have too many samples to write by hand, they're generated on-demand by getDrumWave instead.
    public static readonly chipNoises: DictionaryArray<ChipNoise> = toNameMap([
        { name: "retro", expression: 0.25, basePitch: 69, pitchFilterMult: 1024.0, isSoft: false, samples: null },
        { name: "white", expression: 1.0, basePitch: 69, pitchFilterMult: 8.0, isSoft: true, samples: null },
        // The "clang" and "buzz" noises are based on similar noises in the modded beepbox! :D
        { name: "clang", expression: 0.4, basePitch: 69, pitchFilterMult: 1024.0, isSoft: false, samples: null },
        { name: "buzz", expression: 0.3, basePitch: 69, pitchFilterMult: 1024.0, isSoft: false, samples: null },
        { name: "hollow", expression: 1.5, basePitch: 96, pitchFilterMult: 1.0, isSoft: true, samples: null },
        { name: "shine", expression: 1.0, basePitch: 69, pitchFilterMult: 1024.0, isSoft: false, samples: null },
        { name: "deep", expression: 1.5, basePitch: 120, pitchFilterMult: 1024.0, isSoft: true, samples: null },
        { name: "cutter", expression: 0.005, basePitch: 96, pitchFilterMult: 1024.0, isSoft: false, samples: null },
        { name: "metallic", expression: 1.0, basePitch: 96, pitchFilterMult: 1024.0, isSoft: false, samples: null },
    ]);

    public static readonly filterFreqStep: number = 1.0 / 4.0;
    public static readonly filterFreqRange: number = 34;
    public static readonly filterFreqReferenceSetting: number = 28;
    public static readonly filterFreqReferenceHz: number = 8000.0;
    public static readonly filterFreqMaxHz: number = Config.filterFreqReferenceHz * Math.pow(2.0, Config.filterFreqStep * (Config.filterFreqRange - 1 - Config.filterFreqReferenceSetting)); // ~19khz
    public static readonly filterFreqMinHz: number = 8.0;
    public static readonly filterGainRange: number = 15;
    public static readonly filterGainCenter: number = 7;
    public static readonly filterGainStep: number = 1.0 / 2.0;
    public static readonly filterMaxPoints: number = 8;
    public static readonly filterTypeNames: ReadonlyArray<string> = ["low-pass", "high-pass", "peak"]; // See FilterType enum above.
    public static readonly filterMorphCount: number = 10; // Number of filter shapes allowed for modulating between. Counts the 0/default position.

    public static readonly filterSimpleCutRange: number = 11;
    public static readonly filterSimplePeakRange: number = 8;

    public static readonly fadeInRange: number = 10;
    public static readonly fadeOutTicks: ReadonlyArray<number> = [-24, -12, -6, -3, -1, 6, 12, 24, 48, 72, 96];
    public static readonly fadeOutNeutral: number = 4;
    public static readonly drumsetFadeOutTicks: number = 48;
    public static readonly transitions: DictionaryArray<Transition> = toNameMap([
        { name: "normal", isSeamless: false, continues: false, slides: false, slideTicks: 3, includeAdjacentPatterns: false },
        { name: "interrupt", isSeamless: true, continues: false, slides: false, slideTicks: 3, includeAdjacentPatterns: true },
        { name: "continue", isSeamless: true, continues: true, slides: false, slideTicks: 3, includeAdjacentPatterns: true },
        { name: "slide", isSeamless: true, continues: false, slides: true, slideTicks: 3, includeAdjacentPatterns: true },
        { name: "slide in pattern", isSeamless: true, continues: false, slides: true, slideTicks: 3, includeAdjacentPatterns: false },
    ]);
    public static readonly vibratos: DictionaryArray<Vibrato> = toNameMap([
        { name: "none", amplitude: 0.0, type: 0, delayTicks: 0 },
        { name: "light", amplitude: 0.15, type: 0, delayTicks: 0 },
        { name: "delayed", amplitude: 0.3, type: 0, delayTicks: 37 }, // It will fade in over the previous two ticks.
        { name: "heavy", amplitude: 0.45, type: 0, delayTicks: 0 },
        { name: "shaky", amplitude: 0.1, type: 1, delayTicks: 0 },
    ]);
    public static readonly vibratoTypes: DictionaryArray<VibratoType> = toNameMap([
        { name: "normal", periodsSeconds: [0.14], period: 0.14 },
        { name: "shaky", periodsSeconds: [0.11, 1.618 * 0.11, 3 * 0.11], period: 266.97 }, // LCM of all periods
    ]);
    // This array is more or less a linear step by 0.1 but there's a bit of range added at the start to hit specific ratios, and the end starts to grow faster.
    //                                                             0       1      2    3     4      5    6    7      8     9   10   11 12   13   14   15   16   17   18   19   20   21 22   23   24   25   26   27   28   29   30   31 32   33   34   35   36   37   38    39  40   41 42    43   44   45   46 47   48 49 50
    public static readonly arpSpeedScale: ReadonlyArray<number> = [0, 0.0625, 0.125, 0.2, 0.25, 1 / 3, 0.4, 0.5, 2 / 3, 0.75, 0.8, 0.9, 1, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 2, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 3, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 4, 4.15, 4.3, 4.5, 4.8, 5, 5.5, 6, 8];

    public static readonly unisons: DictionaryArray<Unison> = toNameMap([
        { name: "none", voices: 1, spread: 0.0, offset: 0.0, expression: 1.4, sign: 1.0 },
        { name: "shimmer", voices: 2, spread: 0.018, offset: 0.0, expression: 0.8, sign: 1.0 },
        { name: "hum", voices: 2, spread: 0.045, offset: 0.0, expression: 1.0, sign: 1.0 },
        { name: "honky tonk", voices: 2, spread: 0.09, offset: 0.0, expression: 1.0, sign: 1.0 },
        { name: "dissonant", voices: 2, spread: 0.25, offset: 0.0, expression: 0.9, sign: 1.0 },
        { name: "fifth", voices: 2, spread: 3.5, offset: 3.5, expression: 0.9, sign: 1.0 },
        { name: "octave", voices: 2, spread: 6.0, offset: 6.0, expression: 0.8, sign: 1.0 },
        { name: "bowed", voices: 2, spread: 0.02, offset: 0.0, expression: 1.0, sign: -1.0 },
        { name: "piano", voices: 2, spread: 0.01, offset: 0.0, expression: 1.0, sign: 0.7 },
        { name: "warbled", voices: 2, spread: 0.25, offset: 0.05, expression: 0.9, sign: -0.8 },
    ]);
    public static readonly effectNames: ReadonlyArray<string> = ["reverb", "chorus", "panning", "distortion", "bitcrusher", "note filter", "echo", "pitch shift", "detune", "vibrato", "transition type", "chord type"];
    public static readonly effectOrder: ReadonlyArray<EffectType> = [EffectType.transition, EffectType.chord, EffectType.pitchShift, EffectType.detune, EffectType.vibrato, EffectType.noteFilter, EffectType.distortion, EffectType.bitcrusher, EffectType.panning, EffectType.chorus, EffectType.echo, EffectType.reverb];
    public static readonly noteSizeMax: number = 6;
    public static readonly volumeRange: number = 50;
    // Beepbox's old volume scale used factor -0.5 and was [0~7] had roughly value 6 = 0.125 power. This new value is chosen to have -21 be the same,
    // given that the new scale is [-25~25]. This is such that conversion between the scales is roughly equivalent by satisfying (0.5*6 = 0.1428*21)	
    public static readonly volumeLogScale: number = 0.1428;
    public static readonly panCenter: number = 50;
    public static readonly panMax: number = Config.panCenter * 2;
    public static readonly panDelaySecondsMax: number = 0.001;
    public static readonly chorusRange: number = 8;
    public static readonly chorusPeriodSeconds: number = 2.0;
    public static readonly chorusDelayRange: number = 0.0034;
    public static readonly chorusDelayOffsets: ReadonlyArray<ReadonlyArray<number>> = [[1.51, 2.10, 3.35], [1.47, 2.15, 3.25]];
    public static readonly chorusPhaseOffsets: ReadonlyArray<ReadonlyArray<number>> = [[0.0, 2.1, 4.2], [3.2, 5.3, 1.0]];
    public static readonly chorusMaxDelay: number = Config.chorusDelayRange * (1.0 + Config.chorusDelayOffsets[0].concat(Config.chorusDelayOffsets[1]).reduce((x, y) => Math.max(x, y)));
    public static readonly chords: DictionaryArray<Chord> = toNameMap([
        { name: "simultaneous", customInterval: false, arpeggiates: false, strumParts: 0, singleTone: false },
        { name: "strum", customInterval: false, arpeggiates: false, strumParts: 1, singleTone: false },
        { name: "arpeggio", customInterval: false, arpeggiates: true, strumParts: 0, singleTone: true },
        { name: "custom interval", customInterval: true, arpeggiates: false, strumParts: 0, singleTone: true },
    ]);
    public static readonly maxChordSize: number = 9;
    public static readonly operatorCount: number = 4;
    public static readonly algorithms: DictionaryArray<Algorithm> = toNameMap([
        { name: "1←(2 3 4)", carrierCount: 1, associatedCarrier: [1, 1, 1, 1], modulatedBy: [[2, 3, 4], [], [], []] },
        { name: "1←(2 3←4)", carrierCount: 1, associatedCarrier: [1, 1, 1, 1], modulatedBy: [[2, 3], [], [4], []] },
        { name: "1←2←(3 4)", carrierCount: 1, associatedCarrier: [1, 1, 1, 1], modulatedBy: [[2], [3, 4], [], []] },
        { name: "1←(2 3)←4", carrierCount: 1, associatedCarrier: [1, 1, 1, 1], modulatedBy: [[2, 3], [4], [4], []] },
        { name: "1←2←3←4", carrierCount: 1, associatedCarrier: [1, 1, 1, 1], modulatedBy: [[2], [3], [4], []] },
        { name: "1←3 2←4", carrierCount: 2, associatedCarrier: [1, 2, 1, 2], modulatedBy: [[3], [4], [], []] },
        { name: "1 2←(3 4)", carrierCount: 2, associatedCarrier: [1, 2, 2, 2], modulatedBy: [[], [3, 4], [], []] },
        { name: "1 2←3←4", carrierCount: 2, associatedCarrier: [1, 2, 2, 2], modulatedBy: [[], [3], [4], []] },
        { name: "(1 2)←3←4", carrierCount: 2, associatedCarrier: [1, 2, 2, 2], modulatedBy: [[3], [3], [4], []] },
        { name: "(1 2)←(3 4)", carrierCount: 2, associatedCarrier: [1, 2, 2, 2], modulatedBy: [[3, 4], [3, 4], [], []] },
        { name: "1 2 3←4", carrierCount: 3, associatedCarrier: [1, 2, 3, 3], modulatedBy: [[], [], [4], []] },
        { name: "(1 2 3)←4", carrierCount: 3, associatedCarrier: [1, 2, 3, 3], modulatedBy: [[4], [4], [4], []] },
        { name: "1 2 3 4", carrierCount: 4, associatedCarrier: [1, 2, 3, 4], modulatedBy: [[], [], [], []] },
    ]);
    public static readonly operatorCarrierInterval: ReadonlyArray<number> = [0.0, 0.04, -0.073, 0.091];
    public static readonly operatorAmplitudeMax: number = 15;
    public static readonly operatorFrequencies: DictionaryArray<OperatorFrequency> = toNameMap([
        { name: "1×", mult: 1.0, hzOffset: 0.0, amplitudeSign: 1.0 },
        { name: "~1×", mult: 1.0, hzOffset: 1.5, amplitudeSign: -1.0 },
        { name: "2×", mult: 2.0, hzOffset: 0.0, amplitudeSign: 1.0 },
        { name: "~2×", mult: 2.0, hzOffset: -1.3, amplitudeSign: -1.0 },
        { name: "3×", mult: 3.0, hzOffset: 0.0, amplitudeSign: 1.0 },
        { name: "4×", mult: 4.0, hzOffset: 0.0, amplitudeSign: 1.0 },
        { name: "5×", mult: 5.0, hzOffset: 0.0, amplitudeSign: 1.0 },
        { name: "6×", mult: 6.0, hzOffset: 0.0, amplitudeSign: 1.0 },
        { name: "7×", mult: 7.0, hzOffset: 0.0, amplitudeSign: 1.0 },
        { name: "8×", mult: 8.0, hzOffset: 0.0, amplitudeSign: 1.0 },
        { name: "9×", mult: 9.0, hzOffset: 0.0, amplitudeSign: 1.0 },
        { name: "11×", mult: 11.0, hzOffset: 0.0, amplitudeSign: 1.0 },
        { name: "13×", mult: 13.0, hzOffset: 0.0, amplitudeSign: 1.0 },
        { name: "16×", mult: 16.0, hzOffset: 0.0, amplitudeSign: 1.0 },
        { name: "20×", mult: 20.0, hzOffset: 0.0, amplitudeSign: 1.0 },
    ]);
    public static readonly envelopes: DictionaryArray<Envelope> = toNameMap([
        { name: "none", type: EnvelopeType.none, speed: 0.0 },
        { name: "note size", type: EnvelopeType.noteSize, speed: 0.0 },
        { name: "punch", type: EnvelopeType.punch, speed: 0.0 },
        { name: "flare 1", type: EnvelopeType.flare, speed: 32.0 },
        { name: "flare 2", type: EnvelopeType.flare, speed: 8.0 },
        { name: "flare 3", type: EnvelopeType.flare, speed: 2.0 },
        { name: "twang 1", type: EnvelopeType.twang, speed: 32.0 },
        { name: "twang 2", type: EnvelopeType.twang, speed: 8.0 },
        { name: "twang 3", type: EnvelopeType.twang, speed: 2.0 },
        { name: "swell 1", type: EnvelopeType.swell, speed: 32.0 },
        { name: "swell 2", type: EnvelopeType.swell, speed: 8.0 },
        { name: "swell 3", type: EnvelopeType.swell, speed: 2.0 },
        { name: "tremolo1", type: EnvelopeType.tremolo, speed: 4.0 },
        { name: "tremolo2", type: EnvelopeType.tremolo, speed: 2.0 },
        { name: "tremolo3", type: EnvelopeType.tremolo, speed: 1.0 },
        { name: "tremolo4", type: EnvelopeType.tremolo2, speed: 4.0 },
        { name: "tremolo5", type: EnvelopeType.tremolo2, speed: 2.0 },
        { name: "tremolo6", type: EnvelopeType.tremolo2, speed: 1.0 },
        { name: "decay 1", type: EnvelopeType.decay, speed: 10.0 },
        { name: "decay 2", type: EnvelopeType.decay, speed: 7.0 },
        { name: "decay 3", type: EnvelopeType.decay, speed: 4.0 },
    ]);
    public static readonly feedbacks: DictionaryArray<Feedback> = toNameMap([
        { name: "1⟲", indices: [[1], [], [], []] },
        { name: "2⟲", indices: [[], [2], [], []] },
        { name: "3⟲", indices: [[], [], [3], []] },
        { name: "4⟲", indices: [[], [], [], [4]] },
        { name: "1⟲ 2⟲", indices: [[1], [2], [], []] },
        { name: "3⟲ 4⟲", indices: [[], [], [3], [4]] },
        { name: "1⟲ 2⟲ 3⟲", indices: [[1], [2], [3], []] },
        { name: "2⟲ 3⟲ 4⟲", indices: [[], [2], [3], [4]] },
        { name: "1⟲ 2⟲ 3⟲ 4⟲", indices: [[1], [2], [3], [4]] },
        { name: "1→2", indices: [[], [1], [], []] },
        { name: "1→3", indices: [[], [], [1], []] },
        { name: "1→4", indices: [[], [], [], [1]] },
        { name: "2→3", indices: [[], [], [2], []] },
        { name: "2→4", indices: [[], [], [], [2]] },
        { name: "3→4", indices: [[], [], [], [3]] },
        { name: "1→3 2→4", indices: [[], [], [1], [2]] },
        { name: "1→4 2→3", indices: [[], [], [2], [1]] },
        { name: "1→2→3→4", indices: [[], [1], [2], [3]] },
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
    public static readonly pulseWidthRange: number = 50;
    public static readonly pulseWidthStepPower: number = 0.5;
    public static readonly pitchChannelCountMin: number = 1;
    public static readonly pitchChannelCountMax: number = 40;
    public static readonly noiseChannelCountMin: number = 0;
    public static readonly noiseChannelCountMax: number = 16;
    public static readonly modChannelCountMin: number = 0;
    public static readonly modChannelCountMax: number = 12;
    public static readonly noiseInterval: number = 6;
    public static readonly pitchesPerOctave: number = 12; // TODO: Use this for converting pitch to frequency.
    public static readonly drumCount: number = 12;
    public static readonly pitchOctaves: number = 8;
    public static readonly modCount: number = 6;
    public static readonly maxPitch: number = Config.pitchOctaves * Config.pitchesPerOctave;
    public static readonly maximumTonesPerChannel: number = Config.maxChordSize * 2;
    public static readonly justIntonationSemitones: number[] = [1.0 / 2.0, 8.0 / 15.0, 9.0 / 16.0, 3.0 / 5.0, 5.0 / 8.0, 2.0 / 3.0, 32.0 / 45.0, 3.0 / 4.0, 4.0 / 5.0, 5.0 / 6.0, 8.0 / 9.0, 15.0 / 16.0, 1.0, 16.0 / 15.0, 9.0 / 8.0, 6.0 / 5.0, 5.0 / 4.0, 4.0 / 3.0, 45.0 / 32.0, 3.0 / 2.0, 8.0 / 5.0, 5.0 / 3.0, 16.0 / 9.0, 15.0 / 8.0, 2.0].map(x => Math.log2(x) * Config.pitchesPerOctave);
    public static readonly pitchShiftRange: number = Config.justIntonationSemitones.length;
    public static readonly pitchShiftCenter: number = Config.pitchShiftRange >> 1;
    public static readonly detuneCenter: number = 200;
    public static readonly detuneMax: number = 400;
    public static readonly detuneMin: number = 0;
    public static readonly songDetuneMin: number = 0;
    public static readonly songDetuneMax: number = 500;
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
        { name: "none", computeIndex: null, displayName: "none",             /*perNote: false,*/ interleave: false, isFilter: false, /*range: 0,                              */    maxCount: 1, effect: null, compatibleInstruments: null },
        { name: "noteVolume", computeIndex: NoteAutomationIndex.noteVolume, displayName: "note volume",      /*perNote:  true,*/ interleave: false, isFilter: false, /*range: Config.volumeRange,             */    maxCount: 1, effect: null, compatibleInstruments: null },
        { name: "pulseWidth", computeIndex: NoteAutomationIndex.pulseWidth, displayName: "pulse width",      /*perNote:  true,*/ interleave: false, isFilter: false, /*range: Config.pulseWidthRange,         */    maxCount: 1, effect: null, compatibleInstruments: [InstrumentType.pwm] },
        { name: "stringSustain", computeIndex: NoteAutomationIndex.stringSustain, displayName: "sustain",          /*perNote:  true,*/ interleave: false, isFilter: false, /*range: Config.stringSustainRange,      */    maxCount: 1, effect: null, compatibleInstruments: [InstrumentType.pickedString] },
        { name: "unison", computeIndex: NoteAutomationIndex.unison, displayName: "unison",           /*perNote:  true,*/ interleave: false, isFilter: false, /*range: Config.defaultAutomationRange,  */    maxCount: 1, effect: null, compatibleInstruments: [InstrumentType.chip, InstrumentType.harmonics, InstrumentType.pickedString] },
        { name: "operatorFrequency", computeIndex: NoteAutomationIndex.operatorFrequency0, displayName: "fm# freq",         /*perNote:  true,*/ interleave: true, isFilter: false, /*range: Config.defaultAutomationRange,  */    maxCount: Config.operatorCount, effect: null, compatibleInstruments: [InstrumentType.fm] },
        { name: "operatorAmplitude", computeIndex: NoteAutomationIndex.operatorAmplitude0, displayName: "fm# volume",       /*perNote:  true,*/ interleave: false, isFilter: false, /*range: Config.operatorAmplitudeMax + 1,*/    maxCount: Config.operatorCount, effect: null, compatibleInstruments: [InstrumentType.fm] },
        { name: "feedbackAmplitude", computeIndex: NoteAutomationIndex.feedbackAmplitude, displayName: "fm feedback",      /*perNote:  true,*/ interleave: false, isFilter: false, /*range: Config.operatorAmplitudeMax + 1,*/    maxCount: 1, effect: null, compatibleInstruments: [InstrumentType.fm] },
        { name: "pitchShift", computeIndex: NoteAutomationIndex.pitchShift, displayName: "pitch shift",      /*perNote:  true,*/ interleave: false, isFilter: false, /*range: Config.pitchShiftRange,         */    maxCount: 1, effect: EffectType.pitchShift, compatibleInstruments: null },
        { name: "detune", computeIndex: NoteAutomationIndex.detune, displayName: "detune",           /*perNote:  true,*/ interleave: false, isFilter: false, /*range: Config.detuneMax + 1,           */    maxCount: 1, effect: EffectType.detune, compatibleInstruments: null },
        { name: "vibratoDepth", computeIndex: NoteAutomationIndex.vibratoDepth, displayName: "vibrato range",    /*perNote:  true,*/ interleave: false, isFilter: false, /*range: Config.defaultAutomationRange,  */    maxCount: 1, effect: EffectType.vibrato, compatibleInstruments: null },
        { name: "noteFilterAllFreqs", computeIndex: NoteAutomationIndex.noteFilterAllFreqs, displayName: "n. filter freqs",  /*perNote:  true,*/ interleave: false, isFilter: true, /*range: null,                           */    maxCount: 1, effect: EffectType.noteFilter, compatibleInstruments: null },
        { name: "noteFilterFreq", computeIndex: NoteAutomationIndex.noteFilterFreq0, displayName: "n. filter # freq", /*perNote:  true,*/ interleave: false/*true*/, isFilter: true, /*range: Config.filterFreqRange,     */        maxCount: Config.filterMaxPoints, effect: EffectType.noteFilter, compatibleInstruments: null },
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
    public static readonly operatorWaves: DictionaryArray<OperatorWave> = toNameMap([
        { name: "sine", samples: Config.sineWave },
        { name: "triangle", samples: generateTriWave() },
        { name: "sawtooth", samples: generateSawWave() },
        { name: "pulse width", samples: generateSquareWave() },
        { name: "ramp", samples: generateSawWave(true) },
        { name: "trapezoid", samples: generateTrapezoidWave(2) },
    ]);
    public static readonly pwmOperatorWaves: DictionaryArray<OperatorWave> = toNameMap([
        { name: "1%", samples: generateSquareWave(0.01) },
        { name: "5%", samples: generateSquareWave(0.05) },
        { name: "12.5%", samples: generateSquareWave(0.125) },
        { name: "25%", samples: generateSquareWave(0.25) },
        { name: "33%", samples: generateSquareWave(1 / 3) },
        { name: "50%", samples: generateSquareWave(0.5) },
        { name: "66%", samples: generateSquareWave(2 / 3) },
        { name: "75%", samples: generateSquareWave(0.75) },
        { name: "87.5%", samples: generateSquareWave(0.875) },
        { name: "95%", samples: generateSquareWave(0.95) },
        { name: "99%", samples: generateSquareWave(0.99) },
    ]);


    // Height of the small editor column for inserting/deleting rows, in pixels.
    public static readonly barEditorHeight: number = 10;

    // Careful about changing index ordering for this. Index is stored in URL/JSON etc.
    public static readonly modulators: DictionaryArray<Modulator> = toNameMap([
        { name: "none", pianoName: "None", maxRawVol: 6, newNoteVol: 6, forSong: true, convertRealFactor: 0, associatedEffect: EffectType.length },
        { name: "song volume", pianoName: "Volume", maxRawVol: 100, newNoteVol: 100, forSong: true, convertRealFactor: 0, associatedEffect: EffectType.length },
        { name: "tempo", pianoName: "Tempo", maxRawVol: Config.tempoMax - Config.tempoMin, newNoteVol: Math.ceil((Config.tempoMax - Config.tempoMin) / 2), forSong: true, convertRealFactor: Config.tempoMin, associatedEffect: EffectType.length },
        { name: "song reverb", pianoName: "Reverb", maxRawVol: Config.reverbRange * 2, newNoteVol: Config.reverbRange, forSong: true, convertRealFactor: -Config.reverbRange, associatedEffect: EffectType.length },
        { name: "next bar", pianoName: "Next Bar", maxRawVol: 1, newNoteVol: 1, forSong: true, convertRealFactor: 0, associatedEffect: EffectType.length },
        { name: "volume", pianoName: "Volume", maxRawVol: Config.volumeRange, newNoteVol: Math.ceil(Config.volumeRange / 2), forSong: false, convertRealFactor: Math.ceil(-Config.volumeRange / 2.0), associatedEffect: EffectType.length },
        { name: "pan", pianoName: "Pan", maxRawVol: Config.panMax, newNoteVol: Math.ceil(Config.panMax / 2), forSong: false, convertRealFactor: 0, associatedEffect: EffectType.panning },
        { name: "reverb", pianoName: "Reverb", maxRawVol: Config.reverbRange, newNoteVol: 0, forSong: false, convertRealFactor: 0, associatedEffect: EffectType.reverb },
        { name: "distortion", pianoName: "Distortion", maxRawVol: Config.distortionRange, newNoteVol: 0, forSong: false, convertRealFactor: 0, associatedEffect: EffectType.distortion },
        { name: "fm slider 1", pianoName: "FM 1", maxRawVol: 15, newNoteVol: 15, forSong: false, convertRealFactor: 0, associatedEffect: EffectType.length },
        { name: "fm slider 2", pianoName: "FM 2", maxRawVol: 15, newNoteVol: 15, forSong: false, convertRealFactor: 0, associatedEffect: EffectType.length },
        { name: "fm slider 3", pianoName: "FM 3", maxRawVol: 15, newNoteVol: 15, forSong: false, convertRealFactor: 0, associatedEffect: EffectType.length },
        { name: "fm slider 4", pianoName: "FM 4", maxRawVol: 15, newNoteVol: 15, forSong: false, convertRealFactor: 0, associatedEffect: EffectType.length },
        { name: "fm feedback", pianoName: "FM Feedback", maxRawVol: 15, newNoteVol: 15, forSong: false, convertRealFactor: 0, associatedEffect: EffectType.length },
        { name: "pulse width", pianoName: "Pulse Width", maxRawVol: Config.pulseWidthRange, newNoteVol: Config.pulseWidthRange, forSong: false, convertRealFactor: 0, associatedEffect: EffectType.length },
        { name: "detune", pianoName: "Detune", maxRawVol: Config.detuneMax - Config.detuneMin, newNoteVol: Config.detuneCenter, forSong: false, convertRealFactor: -Config.detuneCenter, associatedEffect: EffectType.detune },
        { name: "vibrato depth", pianoName: "Vibrato Depth", maxRawVol: 50, newNoteVol: 0, forSong: false, convertRealFactor: 0, associatedEffect: EffectType.vibrato },
        { name: "song detune", pianoName: "Detune", maxRawVol: Config.songDetuneMax - Config.songDetuneMin, newNoteVol: Math.ceil((Config.songDetuneMax - Config.songDetuneMin) / 2), forSong: true, convertRealFactor: -250, associatedEffect: EffectType.length },
        { name: "vibrato speed", pianoName: "Vibrato Speed", maxRawVol: 30, newNoteVol: 0, forSong: false, convertRealFactor: 0, associatedEffect: EffectType.vibrato },
        { name: "vibrato delay", pianoName: "Vibrato Delay", maxRawVol: 50, newNoteVol: 0, forSong: false, convertRealFactor: 0, associatedEffect: EffectType.vibrato },
        { name: "arp speed", pianoName: "Arp Speed", maxRawVol: 50, newNoteVol: 10, forSong: false, convertRealFactor: 0, associatedEffect: EffectType.chord },
        { name: "pan delay", pianoName: "Pan Delay", maxRawVol: 20, newNoteVol: 10, forSong: false, convertRealFactor: 0, associatedEffect: EffectType.panning },
        { name: "reset arp", pianoName: "Reset Arp", maxRawVol: 1, newNoteVol: 1, forSong: false, convertRealFactor: 0, associatedEffect: EffectType.chord },
        { name: "eq filter", pianoName: "EQFlt", maxRawVol: 10, newNoteVol: 0, forSong: false, convertRealFactor: 0, associatedEffect: EffectType.length },
        { name: "note filter", pianoName: "N.Flt", maxRawVol: 10, newNoteVol: 0, forSong: false, convertRealFactor: 0, associatedEffect: EffectType.noteFilter },
        { name: "bit crush", pianoName: "Bitcrush", maxRawVol: Config.bitcrusherQuantizationRange, newNoteVol: Math.round(Config.bitcrusherQuantizationRange / 2), forSong: false, convertRealFactor: 0, associatedEffect: EffectType.bitcrusher },
        { name: "freq crush", pianoName: "Freq Crush", maxRawVol: Config.bitcrusherFreqRange, newNoteVol: Math.round(Config.bitcrusherFreqRange / 2), forSong: false, convertRealFactor: 0, associatedEffect: EffectType.bitcrusher },
        { name: "echo", pianoName: "Echo", maxRawVol: Config.echoSustainRange, newNoteVol: 0, forSong: false, convertRealFactor: 0, associatedEffect: EffectType.echo },
        { name: "echo delay", pianoName: "Echo Delay", maxRawVol: Config.echoDelayRange, newNoteVol: 0, forSong: false, convertRealFactor: 0, associatedEffect: EffectType.length }, // Disabled via associatedEffect and manually in list build in SongEditor, enable and set back to echo after fixing bugginess!
        { name: "chorus", pianoName: "Chorus", maxRawVol: Config.chorusRange, newNoteVol: 0, forSong: false, convertRealFactor: 0, associatedEffect: EffectType.chorus },
        { name: "eq filt cut", pianoName: "EQFlt Cut", maxRawVol: Config.filterSimpleCutRange - 1, newNoteVol: Config.filterSimpleCutRange - 1, forSong: false, convertRealFactor: 0, associatedEffect: EffectType.length },
        { name: "eq filt peak", pianoName: "EQFlt Peak", maxRawVol: Config.filterSimplePeakRange - 1, newNoteVol: 0, forSong: false, convertRealFactor: 0, associatedEffect: EffectType.length },
        { name: "note filt cut", pianoName: "N.Flt Cut", maxRawVol: Config.filterSimpleCutRange - 1, newNoteVol: Config.filterSimpleCutRange - 1, forSong: false, convertRealFactor: 0, associatedEffect: EffectType.noteFilter },
        { name: "note filt peak", pianoName: "N.Flt Peak", maxRawVol: Config.filterSimplePeakRange - 1, newNoteVol: 0, forSong: false, convertRealFactor: 0, associatedEffect: EffectType.noteFilter },
        { name: "pitch shift", pianoName: "Pitch Shift", maxRawVol: Config.pitchShiftRange - 1, newNoteVol: Config.pitchShiftCenter, forSong: false, convertRealFactor: -Config.pitchShiftCenter, associatedEffect: EffectType.pitchShift },
        { name: "sustain", pianoName: "Sustain", maxRawVol: Config.stringSustainRange - 1, newNoteVol: 0, forSong: false, convertRealFactor: 0, associatedEffect: EffectType.length },
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
function centerAndNormalizeWave(wave: Array<number>): Float64Array {
    let magn: number = 0.0;

    centerWave(wave);

    // Going to length-1 because an extra 0 sample is added on the end as part of centerWave, which shouldn't impact magnitude calculation.
    for (let i: number = 0; i < wave.length - 1; i++) {
        magn += Math.abs(wave[i]);
    }
    const magnAvg: number = magn / (wave.length - 1);

    for (let i: number = 0; i < wave.length - 1; i++) {
        wave[i] = wave[i] / magnAvg;
    }

    return new Float64Array(wave);

}
export function performIntegral(wave: { length: number, [index: number]: number }): Float64Array {
    // Perform the integral on the wave. The synth function will perform the derivative to get the original wave back but with antialiasing.
    let cumulative: number = 0.0;
    let newWave: Float64Array = new Float64Array(wave.length);
    for (let i: number = 0; i < wave.length; i++) {
        newWave[i] = cumulative;
        cumulative += wave[i];
    }

    return newWave;
}
export function performIntegralOld(wave: { length: number, [index: number]: number }): void {
	// Old ver used in harmonics/picked string instruments, manipulates wave in place.
	let cumulative: number = 0.0;
	for (let i: number = 0; i < wave.length; i++) {
		const temp = wave[i];
		wave[i] = cumulative;
		cumulative += temp;
	}
}

export function getPulseWidthRatio(pulseWidth: number): number {
    // BeepBox formula for reference
    //return Math.pow(0.5, (Config.pulseWidthRange - 1 - pulseWidth) * Config.pulseWidthStepPower) * 0.5;

    return pulseWidth / (Config.pulseWidthRange * 2);
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
        } else if (index == 5) {
            // "Shine" drums from modbox!
            var drumBuffer = 1;
            for (var i = 0; i < Config.chipNoiseLength; i++) {
                wave[i] = (drumBuffer & 1) * 2.0 - 1.0;
                var newBuffer = drumBuffer >> 1;
                if (((drumBuffer + newBuffer) & 1) == 1) {
                    newBuffer += 10 << 2;
                }
                drumBuffer = newBuffer;
            }
        } else if (index == 6) {
            // "Deep" drums from modbox!
            drawNoiseSpectrum(wave, Config.chipNoiseLength, 1, 10, 1, 1, 0);
            drawNoiseSpectrum(wave, Config.chipNoiseLength, 20, 14, -2, -2, 0);
            inverseRealFourierTransform!(wave, Config.chipNoiseLength);
            scaleElementsByFactor!(wave, 1.0 / Math.sqrt(Config.chipNoiseLength));
        } else if (index == 7) {
            // "Cutter" drums from modbox!
            var drumBuffer = 1;
            for (var i = 0; i < Config.chipNoiseLength; i++) {
                wave[i] = (drumBuffer & 1) * 4.0 * (Math.random() * 14 + 1);
                var newBuffer = drumBuffer >> 1;
                if (((drumBuffer + newBuffer) & 1) == 1) {
                    newBuffer += 15 << 2;
                }
                drumBuffer = newBuffer;
            }
        } else if (index == 8) {
            // "Metallic" drums from modbox!
            var drumBuffer = 1;
            for (var i = 0; i < 32768; i++) {
                wave[i] = (drumBuffer & 1) / 2.0 + 0.5;
                var newBuffer = drumBuffer >> 1;
                if (((drumBuffer + newBuffer) & 1) == 1) {
                    newBuffer -= 10 << 2;
                }
                drumBuffer = newBuffer;
            }
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

function generateTriWave(): Float64Array {
    const wave: Float64Array = new Float64Array(Config.sineWaveLength + 1);
    for (let i: number = 0; i < Config.sineWaveLength + 1; i++) {
        wave[i] = Math.asin(Math.sin(i * Math.PI * 2.0 / Config.sineWaveLength)) / (Math.PI / 2);
    }
    return wave;
}

function generateTrapezoidWave(drive: number = 2): Float64Array {
    const wave: Float64Array = new Float64Array(Config.sineWaveLength + 1);
    for (let i: number = 0; i < Config.sineWaveLength + 1; i++) {
        wave[i] = Math.max(-1.0, Math.min(1.0, Math.asin(Math.sin(i * Math.PI * 2.0 / Config.sineWaveLength)) * drive));
    }
    return wave;
}

function generateSquareWave(phaseWidth: number = 0): Float64Array {
    const wave: Float64Array = new Float64Array(Config.sineWaveLength + 1);
    const centerPoint: number = Config.sineWaveLength / 4;
    for (let i: number = 0; i < Config.sineWaveLength + 1; i++) {
        wave[i] = +((Math.abs(i - centerPoint) < phaseWidth * Config.sineWaveLength / 2)
            || ((Math.abs(i - Config.sineWaveLength - centerPoint) < phaseWidth * Config.sineWaveLength / 2))) * 2 - 1;
    }
    return wave;
}

function generateSawWave(inverse: boolean = false): Float64Array {
    const wave: Float64Array = new Float64Array(Config.sineWaveLength + 1);
    for (let i: number = 0; i < Config.sineWaveLength + 1; i++) {
        wave[i] = ((i + (Config.sineWaveLength / 4.0)) * 2.0 / Config.sineWaveLength) % 2 - 1;
        wave[i] = inverse ? -wave[i] : wave[i];
    }
    return wave;
}

export function getArpeggioPitchIndex(pitchCount: number, useFastTwoNoteArp: boolean, arpeggio: number): number {
    let arpeggioPattern: ReadonlyArray<number> = Config.arpeggioPatterns[pitchCount - 1];
    if (arpeggioPattern != null) {
        if (pitchCount == 2 && useFastTwoNoteArp == false) {
            arpeggioPattern = [0, 0, 1, 1];
        }
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
        dictionary[value.name] = <T>value;
    }
    const result: DictionaryArray<T> = <DictionaryArray<T>><any>array;
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
export function rawChipToIntegrated(raw: DictionaryArray<ChipWave>): DictionaryArray<ChipWave> {
    const newArray: Array<ChipWave> = new Array<ChipWave>(raw.length);
    const dictionary: Dictionary<ChipWave> = {};
    for (let i: number = 0; i < newArray.length; i++) {
        newArray[i] = Object.assign([], raw[i]);
        const value: any = newArray[i];
        value.index = i;
        dictionary[value.name] = <ChipWave>value;
    }
    for (let key in dictionary) {
        dictionary[key].samples = performIntegral(dictionary[key].samples);
    }
    const result: DictionaryArray<ChipWave> = <DictionaryArray<ChipWave>><any>newArray;
    result.dictionary = dictionary;
    return result;
}
//}
