// Copyright (C) 2021 John Nesky, distributed under the MIT license.

import { Dictionary, DictionaryArray, FilterType, EnvelopeType, InstrumentType, EffectType, NoteAutomationIndex, Transition, Unison, Chord, Vibrato, Envelope, AutomationTarget, Config, getDrumWave, drawNoiseSpectrum, getArpeggioPitchIndex, performIntegralOld, getPulseWidthRatio, effectsIncludeTransition, effectsIncludeChord, effectsIncludePitchShift, effectsIncludeDetune, effectsIncludeVibrato, effectsIncludeNoteFilter, effectsIncludeDistortion, effectsIncludeBitcrusher, effectsIncludePanning, effectsIncludeChorus, effectsIncludeEcho, effectsIncludeReverb } from "./SynthConfig";
import { EditorConfig } from "../editor/EditorConfig";
import { scaleElementsByFactor, inverseRealFourierTransform } from "./FFT";
import { Deque } from "./Deque";
import { FilterCoefficients, FrequencyResponse, DynamicBiquadFilter } from "./filtering";

declare global {
    interface Window {
        AudioContext: any;
        webkitAudioContext: any;
    }
}

const epsilon: number = (1.0e-24); // For detecting and avoiding float denormals, which have poor performance.

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
    beatCount = CharCode.a, // added in song url version 2
    bars = CharCode.b, // added in 2
    vibrato = CharCode.c, // added in 2, DEPRECATED
    fadeInOut = CharCode.d, // added in 3 for transition, switched to fadeInOut in 9
    loopEnd = CharCode.e, // added in 2
    eqFilter = CharCode.f, // added in 3
    barCount = CharCode.g, // added in 3
    unison = CharCode.h, // added in 2
    instrumentCount = CharCode.i, // added in 3
    patternCount = CharCode.j, // added in 3
    key = CharCode.k, // added in 2
    loopStart = CharCode.l, // added in 2
    reverb = CharCode.m, // added in 5, DEPRECATED
    channelCount = CharCode.n, // added in 6
    channelOctave = CharCode.o, // added in 3
    patterns = CharCode.p, // added in 2
    effects = CharCode.q, // added in 7
    rhythm = CharCode.r, // added in 2
    scale = CharCode.s, // added in 2
    tempo = CharCode.t, // added in 2
    preset = CharCode.u, // added in 7
    volume = CharCode.v, // added in 2
    wave = CharCode.w, // added in 2

    filterResonance = CharCode.y, // added in 7, DEPRECATED
    drumsetEnvelopes = CharCode.z, // added in 7 for filter envelopes, still used for drumset envelopes
    algorithm = CharCode.A, // added in 6
    feedbackAmplitude = CharCode.B, // added in 6
    chord = CharCode.C, // added in 7, DEPRECATED
    detune = CharCode.D, // [JB], added in 3(?), DEPRECATED
    envelopes = CharCode.E, // added in 6 for FM operator envelopes, repurposed in 9 for general envelopes.
    feedbackType = CharCode.F, // added in 6
    arpeggioSpeed = CharCode.G, // [JB], added in 3, DEPRECATED
    harmonics = CharCode.H, // added in 7
    stringSustain = CharCode.I, // added in 9

    pan = CharCode.L, // added between 8 and 9, DEPRECATED
    customChipWave = CharCode.M, // [JB], added in 1(?)
    songTitle = CharCode.N, // [JB], added in 1(?)
    limiterSettings = CharCode.O, // [JB], added in 3(?)

    operatorAmplitudes = CharCode.P, // added in 6
    operatorFrequencies = CharCode.Q, // added in 6
    operatorWaves = CharCode.R, // [JB], added in 4
    spectrum = CharCode.S, // added in 7
    startInstrument = CharCode.T, // added in 6
    channelNames = CharCode.U, // [JB], added in 4(?)
    feedbackEnvelope = CharCode.V, // added in 6, DEPRECATED
    pulseWidth = CharCode.W, // added in 7
    aliases = CharCode.X, // [JB], added in 4, DEPRECATED

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
            const value: number = (this._bits[i] << 5) | (this._bits[i + 1] << 4) | (this._bits[i + 2] << 3) | (this._bits[i + 3] << 2) | (this._bits[i + 4] << 1) | this._bits[i + 5];
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
    size: number;
}

export function makeNotePin(interval: number, time: number, size: number): NotePin {
    return { interval: interval, time: time, size: size };
}

export function clamp(min: number, max: number, val: number): number {
    max = max - 1;
    if (val <= max) {
        if (val >= min) return val;
        else return min;
    } else {
        return max;
    }
}

function validateRange(min: number, max: number, val: number): number {
    if (min <= val && val <= max) return val;
    throw new Error(`Value ${val} not in range [${min}, ${max}]`);
}

export class Note {
    public pitches: number[];
    public pins: NotePin[];
    public start: number;
    public end: number;
    public continuesLastPattern: boolean;

    public constructor(pitch: number, start: number, end: number, size: number, fadeout: boolean = false) {
        this.pitches = [pitch];
        this.pins = [makeNotePin(0, 0, size), makeNotePin(0, end - start, fadeout ? 0 : size)];
        this.start = start;
        this.end = end;
        this.continuesLastPattern = false;
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
            let loudestSize: number = 0;
            for (let pinIndex: number = 0; pinIndex < this.pins.length; pinIndex++) {
                const pin: NotePin = this.pins[pinIndex];
                if (loudestSize < pin.size) {
                    loudestSize = pin.size;
                    mainInterval = pin.interval;
                }
            }
        }
        return mainInterval;
    }

    public clone(): Note {
        const newNote: Note = new Note(-1, this.start, this.end, 3);
        newNote.pitches = this.pitches.concat();
        newNote.pins = [];
        for (const pin of this.pins) {
            newNote.pins.push(makeNotePin(pin.interval, pin.time, pin.size));
        }
        newNote.continuesLastPattern = this.continuesLastPattern;
        return newNote;
    }

    public getEndPinIndex(part: number): number {
        let endPinIndex: number;
        for (endPinIndex = 1; endPinIndex < this.pins.length - 1; endPinIndex++) {
            if (this.pins[endPinIndex].time + this.start > part) break;
        }
        return endPinIndex;
    }
}

export class Pattern {
    public notes: Note[] = [];
    public readonly instruments: number[] = [0];

    public cloneNotes(): Note[] {
        const result: Note[] = [];
        for (const note of this.notes) {
            result.push(note.clone());
        }
        return result;
    }

    public reset(): void {
        this.notes.length = 0;
        this.instruments[0] = 0;
        this.instruments.length = 1;
    }
}

export class Operator {
    public frequency: number = 0;
    public amplitude: number = 0;
    public waveform: number = 0;
    public pulseWidth: number = 0.5;

    constructor(index: number) {
        this.reset(index);
    }

    public reset(index: number): void {
        this.frequency = 0;
        this.amplitude = (index <= 1) ? Config.operatorAmplitudeMax : 0;
        this.waveform = 0;
        this.pulseWidth = 5;
    }

    public copy(other: Operator): void {
        this.frequency = other.frequency;
        this.amplitude = other.amplitude;
        this.waveform = other.waveform;
        this.pulseWidth = other.pulseWidth;
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
        if (this._waveIsReady) return this._wave!;

        const waveLength: number = Config.spectrumNoiseLength;

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
        const pitchTweak: number[] = [0, 1 / 7, Math.log2(5 / 4), 3 / 7, Math.log2(3 / 2), 5 / 7, 6 / 7];
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

            combinedAmplitude += 0.02 * drawNoiseSpectrum(wave, waveLength, octave1, octave2, value1 / Config.spectrumMax, value2 / Config.spectrumMax, -0.5);
        }
        if (this.spectrum[Config.spectrumControlPoints - 1] > 0) {
            combinedAmplitude += 0.02 * drawNoiseSpectrum(wave, waveLength, highestOctave + (controlPointToOctave(Config.spectrumControlPoints) - highestOctave) * falloffRatio, highestOctave, this.spectrum[Config.spectrumControlPoints - 1] / Config.spectrumMax, 0, -0.5);
        }

        inverseRealFourierTransform(wave, waveLength);
        scaleElementsByFactor(wave, 5.0 / (Math.sqrt(waveLength) * Math.pow(combinedAmplitude, 0.75)));

        // Duplicate the first sample at the end for easier wrap-around interpolation.
        wave[waveLength] = wave[0];

        this._waveIsReady = true;
        return wave;
    }
}

export class HarmonicsWave {
    public harmonics: number[] = [];
    private _wave: Float32Array | null = null;
    private _waveIsReady: boolean = false;
    private _generatedForType: InstrumentType;

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

    public getCustomWave(instrumentType: InstrumentType): Float32Array {
        if (this._generatedForType != instrumentType) {
            this._generatedForType = instrumentType;
            this._waveIsReady = false;
        }
        const harmonicsRendered: number = (instrumentType == InstrumentType.pickedString) ? Config.harmonicsRenderedForPickedString : Config.harmonicsRendered;

        if (this._waveIsReady) return this._wave!;

        const waveLength: number = Config.harmonicsWavelength;
        const retroWave: Float32Array = getDrumWave(0, null, null);

        if (this._wave == null || this._wave.length != waveLength + 1) {
            this._wave = new Float32Array(waveLength + 1);
        }
        const wave: Float32Array = this._wave;

        for (let i: number = 0; i < waveLength; i++) {
            wave[i] = 0;
        }

        const overallSlope: number = -0.25;
        let combinedControlPointAmplitude: number = 1;

        for (let harmonicIndex: number = 0; harmonicIndex < harmonicsRendered; harmonicIndex++) {
            const harmonicFreq: number = harmonicIndex + 1;
            let controlValue: number = harmonicIndex < Config.harmonicsControlPoints ? this.harmonics[harmonicIndex] : this.harmonics[Config.harmonicsControlPoints - 1];
            if (harmonicIndex >= Config.harmonicsControlPoints) {
                controlValue *= 1 - (harmonicIndex - Config.harmonicsControlPoints) / (harmonicsRendered - Config.harmonicsControlPoints);
            }
            const normalizedValue: number = controlValue / Config.harmonicsMax;
            let amplitude: number = Math.pow(2, controlValue - Config.harmonicsMax + 1) * Math.sqrt(normalizedValue);
            if (harmonicIndex < Config.harmonicsControlPoints) {
                combinedControlPointAmplitude += amplitude;
            }
            amplitude *= Math.pow(harmonicFreq, overallSlope);

            // Multiply all the sine wave amplitudes by 1 or -1 based on the LFSR
            // retro wave (effectively random) to avoid egregiously tall spikes.
            amplitude *= retroWave[harmonicIndex + 589];

            wave[waveLength - harmonicFreq] = amplitude;
        }

        inverseRealFourierTransform(wave, waveLength);

        // Limit the maximum wave amplitude.
        const mult: number = 1 / Math.pow(combinedControlPointAmplitude, 0.7);

        // Perform the integral on the wave. The chipSynth will perform the derivative to get the original wave back but with antialiasing.
        for (let i: number = 0; i < wave.length; i++) wave[i] *= mult;

        performIntegralOld(wave);

        // The first sample should be zero, and we'll duplicate it at the end for easier interpolation.
        wave[waveLength] = wave[0];

        this._waveIsReady = true;
        return wave;
    }
}

export class FilterControlPoint {
    public freq: number = 0;
    public gain: number = Config.filterGainCenter;
    public type: FilterType = FilterType.peak;

    public set(freqSetting: number, gainSetting: number): void {
        this.freq = freqSetting;
        this.gain = gainSetting;
    }

    public getHz(): number {
        return FilterControlPoint.getHzFromSettingValue(this.freq);
    }

    public static getHzFromSettingValue(value: number): number {
        return Config.filterFreqReferenceHz * Math.pow(2.0, (value - Config.filterFreqReferenceSetting) * Config.filterFreqStep);
    }
    public static getSettingValueFromHz(hz: number): number {
        return Math.log2(hz / Config.filterFreqReferenceHz) / Config.filterFreqStep + Config.filterFreqReferenceSetting;
    }
    public static getRoundedSettingValueFromHz(hz: number): number {
        return Math.max(0, Math.min(Config.filterFreqRange - 1, Math.round(FilterControlPoint.getSettingValueFromHz(hz))));
    }

    public getLinearGain(peakMult: number = 1.0): number {
        const power: number = (this.gain - Config.filterGainCenter) * Config.filterGainStep;
        const neutral: number = (this.type == FilterType.peak) ? 0.0 : -0.5;
        const interpolatedPower: number = neutral + (power - neutral) * peakMult;
        return Math.pow(2.0, interpolatedPower);
    }
    public static getRoundedSettingValueFromLinearGain(linearGain: number): number {
        return Math.max(0, Math.min(Config.filterGainRange - 1, Math.round(Math.log2(linearGain) / Config.filterGainStep + Config.filterGainCenter)));
    }

    public toCoefficients(filter: FilterCoefficients, sampleRate: number, freqMult: number = 1.0, peakMult: number = 1.0): void {
        const cornerRadiansPerSample: number = 2.0 * Math.PI * Math.max(Config.filterFreqMinHz, Math.min(Config.filterFreqMaxHz, freqMult * this.getHz())) / sampleRate;
        const linearGain: number = this.getLinearGain(peakMult);
        switch (this.type) {
            case FilterType.lowPass:
                filter.lowPass2ndOrderButterworth(cornerRadiansPerSample, linearGain);
                break;
            case FilterType.highPass:
                filter.highPass2ndOrderButterworth(cornerRadiansPerSample, linearGain);
                break;
            case FilterType.peak:
                filter.peak2ndOrder(cornerRadiansPerSample, linearGain, 1.0);
                break;
            default:
                throw new Error();
        }
    }

    public getVolumeCompensationMult(): number {
        const octave: number = (this.freq - Config.filterFreqReferenceSetting) * Config.filterFreqStep;
        const gainPow: number = (this.gain - Config.filterGainCenter) * Config.filterGainStep;
        switch (this.type) {
            case FilterType.lowPass:
                const freqRelativeTo8khz: number = Math.pow(2.0, octave) * Config.filterFreqReferenceHz / 8000.0;
                // Reverse the frequency warping from importing legacy simplified filters to imitate how the legacy filter cutoff setting affected volume.
                const warpedFreq: number = (Math.sqrt(1.0 + 4.0 * freqRelativeTo8khz) - 1.0) / 2.0;
                const warpedOctave: number = Math.log2(warpedFreq);
                return Math.pow(0.5, 0.2 * Math.max(0.0, gainPow + 1.0) + Math.min(0.0, Math.max(-3.0, 0.595 * warpedOctave + 0.35 * Math.min(0.0, gainPow + 1.0))));
            case FilterType.highPass:
                return Math.pow(0.5, 0.125 * Math.max(0.0, gainPow + 1.0) + Math.min(0.0, 0.3 * (-octave - Math.log2(Config.filterFreqReferenceHz / 125.0)) + 0.2 * Math.min(0.0, gainPow + 1.0)));
            case FilterType.peak:
                const distanceFromCenter: number = octave + Math.log2(Config.filterFreqReferenceHz / 2000.0);
                const freqLoudness: number = Math.pow(1.0 / (1.0 + Math.pow(distanceFromCenter / 3.0, 2.0)), 2.0);
                return Math.pow(0.5, 0.125 * Math.max(0.0, gainPow) + 0.1 * freqLoudness * Math.min(0.0, gainPow));
            default:
                throw new Error();
        }
    }
}

export class FilterSettings {
    public readonly controlPoints: FilterControlPoint[] = [];
    public controlPointCount: number = 0;

    constructor() {
        this.reset();
    }

    reset(): void {
        this.controlPointCount = 0;
    }

    addPoint(type: FilterType, freqSetting: number, gainSetting: number): void {
        let controlPoint: FilterControlPoint;
        if (this.controlPoints.length <= this.controlPointCount) {
            controlPoint = new FilterControlPoint();
            this.controlPoints[this.controlPointCount] = controlPoint;
        } else {
            controlPoint = this.controlPoints[this.controlPointCount];
        }
        this.controlPointCount++;
        controlPoint.type = type;
        controlPoint.set(freqSetting, gainSetting);
    }

    public toJsonObject(): Object {
        const filterArray: any[] = [];
        for (let i: number = 0; i < this.controlPointCount; i++) {
            const point: FilterControlPoint = this.controlPoints[i];
            filterArray.push({
                "type": Config.filterTypeNames[point.type],
                "cutoffHz": Math.round(point.getHz() * 100) / 100,
                "linearGain": Math.round(point.getLinearGain() * 10000) / 10000,
            });
        }
        return filterArray;
    }

    public fromJsonObject(filterObject: any): void {
        this.controlPoints.length = 0;
        if (filterObject) {
            for (const pointObject of filterObject) {
                const point: FilterControlPoint = new FilterControlPoint();
                point.type = Config.filterTypeNames.indexOf(pointObject["type"]);
                if (<any>point.type == -1) point.type = FilterType.peak;
                if (pointObject["cutoffHz"] != undefined) {
                    point.freq = FilterControlPoint.getRoundedSettingValueFromHz(pointObject["cutoffHz"]);
                } else {
                    point.freq = 0;
                }
                if (pointObject["linearGain"] != undefined) {
                    point.gain = FilterControlPoint.getRoundedSettingValueFromLinearGain(pointObject["linearGain"]);
                } else {
                    point.gain = Config.filterGainCenter;
                }
                this.controlPoints.push(point);
            }
        }
        this.controlPointCount = this.controlPoints.length;
    }

    // Returns true if all filter control points match in number and type (but not freq/gain)
    public static filtersCanMorph(filterA: FilterSettings, filterB: FilterSettings): boolean {
        if (filterA.controlPointCount != filterB.controlPointCount)
            return false;
        for (let i: number = 0; i < filterA.controlPointCount; i++) {
            if (filterA.controlPoints[i].type != filterB.controlPoints[i].type)
                return false;
        }
        return true;
    }

    // Interpolate two FilterSettings, where pos=0 is filterA and pos=1 is filterB
    public static lerpFilters(filterA: FilterSettings, filterB: FilterSettings, pos: number): FilterSettings {

        let lerpedFilter: FilterSettings = new FilterSettings();

        // One setting or another is null, return the other.
        if (filterA == null) {
            return filterA;
        }
        if (filterB == null) {
            return filterB;
        }

        pos = Math.max(0, Math.min(1, pos));

        // Filter control points match in number and type
        if (this.filtersCanMorph(filterA, filterB)) {
            for (let i: number = 0; i < filterA.controlPointCount; i++) {
                lerpedFilter.controlPoints[i] = new FilterControlPoint();
                lerpedFilter.controlPoints[i].type = filterA.controlPoints[i].type;
                lerpedFilter.controlPoints[i].freq = filterA.controlPoints[i].freq + (filterB.controlPoints[i].freq - filterA.controlPoints[i].freq) * pos;
                lerpedFilter.controlPoints[i].gain = filterA.controlPoints[i].gain + (filterB.controlPoints[i].gain - filterA.controlPoints[i].gain) * pos;
            }

            lerpedFilter.controlPointCount = filterA.controlPointCount;

            return lerpedFilter;
        }
        else {
            // Not allowing morph of unmatching filters for now. It's a hornet's nest of problems, and I had it implemented and mostly working and it didn't sound very interesting since the shape becomes "mushy" in between
            return (pos >= 1) ? filterB : filterA;
        }
        /* 
        // Filter control points do not match. Take all filterA points and move them to neutral at pos=1 (gain 7 for normal points, slide to edge and gain 7 for lo/hipass),
        // and do the opposite for filterB points. Return a filter with points for both.
        else {
            let lerpedFilter: FilterSettings = new FilterSettings();
            // Filter A's morph points
            for (let i: number = 0; i < filterA.controlPointCount; i++) {
                lerpedFilter.controlPoints[i] = new FilterControlPoint();
                lerpedFilter.controlPoints[i].type = filterA.controlPoints[i].type;
                lerpedFilter.controlPoints[i].gain = filterA.controlPoints[i].gain + (Config.filterGainCenter - filterA.controlPoints[i].gain) * pos;

                if (filterA.controlPoints[i].type == FilterType.peak) {
                    lerpedFilter.controlPoints[i].freq = filterA.controlPoints[i].freq;
                }
                else if (filterA.controlPoints[i].type == FilterType.highPass) {
                    lerpedFilter.controlPoints[i].freq = filterA.controlPoints[i].freq * (1 - pos);
                }
                else {
                    lerpedFilter.controlPoints[i].freq = filterA.controlPoints[i].freq + ((Config.filterFreqRange - 1) - filterA.controlPoints[i].freq) * pos;
                }
            }
            // Filter B's morph points
            for (let i: number = 0, j: number = filterA.controlPointCount; i < filterB.controlPointCount; i++, j++) {
                lerpedFilter.controlPoints[j] = new FilterControlPoint();
                lerpedFilter.controlPoints[j].type = filterB.controlPoints[i].type;
                lerpedFilter.controlPoints[j].gain = filterB.controlPoints[i].gain + (Config.filterGainCenter - filterB.controlPoints[i].gain) * (1 - pos);

                if (filterB.controlPoints[i].type == FilterType.peak) {
                    lerpedFilter.controlPoints[j].freq = filterB.controlPoints[i].freq;
                }
                else if (filterB.controlPoints[i].type == FilterType.highPass) {
                    lerpedFilter.controlPoints[j].freq = filterB.controlPoints[i].freq * pos;
                }
                else {
                    lerpedFilter.controlPoints[j].freq = filterB.controlPoints[i].freq + ((Config.filterFreqRange - 1) - filterB.controlPoints[i].freq) * (1 - pos);
                }
            }

            lerpedFilter.controlPointCount = filterA.controlPointCount + filterB.controlPointCount;

            return lerpedFilter;
        }
        */
    }

    public convertLegacySettings(legacyCutoffSetting: number, legacyResonanceSetting: number, legacyEnv: Envelope): void {
        this.reset();

        const legacyFilterCutoffMaxHz: number = 8000; // This was carefully calculated to correspond to no change in response when filtering at 48000 samples per second... when using the legacy simplified low-pass filter.
        const legacyFilterMax: number = 0.95;
        const legacyFilterMaxRadians: number = Math.asin(legacyFilterMax / 2.0) * 2.0;
        const legacyFilterMaxResonance: number = 0.95;
        const legacyFilterCutoffRange: number = 11;
        const legacyFilterResonanceRange: number = 8;

        const resonant: boolean = (legacyResonanceSetting > 1);
        const firstOrder: boolean = (legacyResonanceSetting == 0);
        const cutoffAtMax: boolean = (legacyCutoffSetting == legacyFilterCutoffRange - 1);
        const envDecays: boolean = (legacyEnv.type == EnvelopeType.flare || legacyEnv.type == EnvelopeType.twang || legacyEnv.type == EnvelopeType.decay || legacyEnv.type == EnvelopeType.noteSize);

        const standardSampleRate: number = 48000;
        const legacyHz: number = legacyFilterCutoffMaxHz * Math.pow(2.0, (legacyCutoffSetting - (legacyFilterCutoffRange - 1)) * 0.5);
        const legacyRadians: number = Math.min(legacyFilterMaxRadians, 2 * Math.PI * legacyHz / standardSampleRate);

        if (legacyEnv.type == EnvelopeType.none && !resonant && cutoffAtMax) {
            // The response is flat and there's no envelopes, so don't even bother adding any control points.
        } else if (firstOrder) {
            // In general, a 1st order lowpass can be approximated by a 2nd order lowpass
            // with a cutoff ~4 octaves higher (*16) and a gain of 1/16.
            // However, BeepBox's original lowpass filters behaved oddly as they
            // approach the nyquist frequency, so I've devised this curved conversion
            // to guess at a perceptually appropriate new cutoff frequency and gain.
            const extraOctaves: number = 3.5;
            const targetRadians: number = legacyRadians * Math.pow(2.0, extraOctaves);
            const curvedRadians: number = targetRadians / (1.0 + targetRadians / Math.PI);
            const curvedHz: number = standardSampleRate * curvedRadians / (2.0 * Math.PI)
            const freqSetting: number = FilterControlPoint.getRoundedSettingValueFromHz(curvedHz);
            const finalHz: number = FilterControlPoint.getHzFromSettingValue(freqSetting);
            const finalRadians: number = 2.0 * Math.PI * finalHz / standardSampleRate;

            const legacyFilter: FilterCoefficients = new FilterCoefficients();
            legacyFilter.lowPass1stOrderSimplified(legacyRadians);
            const response: FrequencyResponse = new FrequencyResponse();
            response.analyze(legacyFilter, finalRadians);
            const legacyFilterGainAtNewRadians: number = response.magnitude();

            let logGain: number = Math.log2(legacyFilterGainAtNewRadians);
            // Bias slightly toward 2^(-extraOctaves):
            logGain = -extraOctaves + (logGain + extraOctaves) * 0.82;
            // Decaying envelopes move the cutoff frequency back into an area where the best approximation of the first order slope requires a lower gain setting.
            if (envDecays) logGain = Math.min(logGain, -1.0);
            const convertedGain: number = Math.pow(2.0, logGain);
            const gainSetting: number = FilterControlPoint.getRoundedSettingValueFromLinearGain(convertedGain);

            this.addPoint(FilterType.lowPass, freqSetting, gainSetting);
        } else {
            const intendedGain: number = 0.5 / (1.0 - legacyFilterMaxResonance * Math.sqrt(Math.max(0.0, legacyResonanceSetting - 1.0) / (legacyFilterResonanceRange - 2.0)));
            const invertedGain: number = 0.5 / intendedGain;
            const maxRadians: number = 2.0 * Math.PI * legacyFilterCutoffMaxHz / standardSampleRate;
            const freqRatio: number = legacyRadians / maxRadians;
            const targetRadians: number = legacyRadians * (freqRatio * Math.pow(invertedGain, 0.9) + 1.0);
            const curvedRadians: number = legacyRadians + (targetRadians - legacyRadians) * invertedGain;
            let curvedHz: number;
            if (envDecays) {
                curvedHz = standardSampleRate * Math.min(curvedRadians, legacyRadians * Math.pow(2, 0.25)) / (2.0 * Math.PI);
            } else {
                curvedHz = standardSampleRate * curvedRadians / (2.0 * Math.PI);
            }
            const freqSetting: number = FilterControlPoint.getRoundedSettingValueFromHz(curvedHz);

            let legacyFilterGain: number;
            if (envDecays) {
                legacyFilterGain = intendedGain;
            } else {
                const legacyFilter: FilterCoefficients = new FilterCoefficients();
                legacyFilter.lowPass2ndOrderSimplified(legacyRadians, intendedGain);
                const response: FrequencyResponse = new FrequencyResponse();
                response.analyze(legacyFilter, curvedRadians);
                legacyFilterGain = response.magnitude();
            }
            if (!resonant) legacyFilterGain = Math.min(legacyFilterGain, Math.sqrt(0.5));
            const gainSetting: number = FilterControlPoint.getRoundedSettingValueFromLinearGain(legacyFilterGain);

            this.addPoint(FilterType.lowPass, freqSetting, gainSetting);
        }

        // Added for JummBox - making a 0 point filter does not truncate control points!
        this.controlPoints.length = this.controlPointCount;
    }

    // Similar to above, but purpose-fit for quick conversions in synth calls.
    public convertLegacySettingsForSynth(legacyCutoffSetting: number, legacyResonanceSetting: number, allowFirstOrder: boolean = false): void {
        this.reset();

        const legacyFilterCutoffMaxHz: number = 8000; // This was carefully calculated to correspond to no change in response when filtering at 48000 samples per second... when using the legacy simplified low-pass filter.
        const legacyFilterMax: number = 0.95;
        const legacyFilterMaxRadians: number = Math.asin(legacyFilterMax / 2.0) * 2.0;
        const legacyFilterMaxResonance: number = 0.95;
        const legacyFilterCutoffRange: number = 11;
        const legacyFilterResonanceRange: number = 8;

        const firstOrder: boolean = (legacyResonanceSetting == 0 && allowFirstOrder);
        const standardSampleRate: number = 48000;
        const legacyHz: number = legacyFilterCutoffMaxHz * Math.pow(2.0, (legacyCutoffSetting - (legacyFilterCutoffRange - 1)) * 0.5);
        const legacyRadians: number = Math.min(legacyFilterMaxRadians, 2 * Math.PI * legacyHz / standardSampleRate);

        if (firstOrder) {
            // In general, a 1st order lowpass can be approximated by a 2nd order lowpass
            // with a cutoff ~4 octaves higher (*16) and a gain of 1/16.
            // However, BeepBox's original lowpass filters behaved oddly as they
            // approach the nyquist frequency, so I've devised this curved conversion
            // to guess at a perceptually appropriate new cutoff frequency and gain.
            const extraOctaves: number = 3.5;
            const targetRadians: number = legacyRadians * Math.pow(2.0, extraOctaves);
            const curvedRadians: number = targetRadians / (1.0 + targetRadians / Math.PI);
            const curvedHz: number = standardSampleRate * curvedRadians / (2.0 * Math.PI)
            const freqSetting: number = FilterControlPoint.getRoundedSettingValueFromHz(curvedHz);
            const finalHz: number = FilterControlPoint.getHzFromSettingValue(freqSetting);
            const finalRadians: number = 2.0 * Math.PI * finalHz / standardSampleRate;

            const legacyFilter: FilterCoefficients = new FilterCoefficients();
            legacyFilter.lowPass1stOrderSimplified(legacyRadians);
            const response: FrequencyResponse = new FrequencyResponse();
            response.analyze(legacyFilter, finalRadians);
            const legacyFilterGainAtNewRadians: number = response.magnitude();

            let logGain: number = Math.log2(legacyFilterGainAtNewRadians);
            // Bias slightly toward 2^(-extraOctaves):
            logGain = -extraOctaves + (logGain + extraOctaves) * 0.82;
            const convertedGain: number = Math.pow(2.0, logGain);
            const gainSetting: number = FilterControlPoint.getRoundedSettingValueFromLinearGain(convertedGain);

            this.addPoint(FilterType.lowPass, freqSetting, gainSetting);
        } else {
            const intendedGain: number = 0.5 / (1.0 - legacyFilterMaxResonance * Math.sqrt(Math.max(0.0, legacyResonanceSetting - 1.0) / (legacyFilterResonanceRange - 2.0)));
            const invertedGain: number = 0.5 / intendedGain;
            const maxRadians: number = 2.0 * Math.PI * legacyFilterCutoffMaxHz / standardSampleRate;
            const freqRatio: number = legacyRadians / maxRadians;
            const targetRadians: number = legacyRadians * (freqRatio * Math.pow(invertedGain, 0.9) + 1.0);
            const curvedRadians: number = legacyRadians + (targetRadians - legacyRadians) * invertedGain;
            let curvedHz: number;

            curvedHz = standardSampleRate * curvedRadians / (2.0 * Math.PI);
            const freqSetting: number = FilterControlPoint.getSettingValueFromHz(curvedHz);

            let legacyFilterGain: number;

            const legacyFilter: FilterCoefficients = new FilterCoefficients();
            legacyFilter.lowPass2ndOrderSimplified(legacyRadians, intendedGain);
            const response: FrequencyResponse = new FrequencyResponse();
            response.analyze(legacyFilter, curvedRadians);
            legacyFilterGain = response.magnitude();
            const gainSetting: number = FilterControlPoint.getRoundedSettingValueFromLinearGain(legacyFilterGain);

            this.addPoint(FilterType.lowPass, freqSetting, gainSetting);
        }

    }
}

export class EnvelopeSettings {
    public target: number = 0;
    public index: number = 0;
    public envelope: number = 0;

    constructor() {
        this.reset();
    }

    reset(): void {
        this.target = 0;
        this.index = 0;
        this.envelope = 0;
    }

    public toJsonObject(): Object {
        const envelopeObject: any = {
            "target": Config.instrumentAutomationTargets[this.target].name,
            "envelope": Config.envelopes[this.envelope].name,
        };
        if (Config.instrumentAutomationTargets[this.target].maxCount > 1) {
            envelopeObject["index"] = this.index;
        }
        return envelopeObject;
    }

    public fromJsonObject(envelopeObject: any): void {
        this.reset();

        let target: AutomationTarget = Config.instrumentAutomationTargets.dictionary[envelopeObject["target"]];
        if (target == null) target = Config.instrumentAutomationTargets.dictionary["noteVolume"];
        this.target = target.index;

        let envelope: Envelope = Config.envelopes.dictionary[envelopeObject["envelope"]];
        if (envelope == null) envelope = Config.envelopes.dictionary["none"];
        this.envelope = envelope.index;

        if (envelopeObject["index"] != undefined) {
            this.index = clamp(0, Config.instrumentAutomationTargets[this.target].maxCount, envelopeObject["index"] | 0);
        } else {
            this.index = 0;
        }
    }
}

// Settings that were available to old versions of BeepBox but are no longer available in the
// current version that need to be reinterpreted as a group to determine the best way to
// represent them in the current version.
interface LegacySettings {
    filterCutoff?: number;
    filterResonance?: number;
    filterEnvelope?: Envelope;
    pulseEnvelope?: Envelope;
    operatorEnvelopes?: Envelope[];
    feedbackEnvelope?: Envelope;
}

export class Instrument {
    public type: InstrumentType = InstrumentType.chip;
    public preset: number = 0;
    public chipWave: number = 2;
    public chipNoise: number = 1;
    public eqFilter: FilterSettings = new FilterSettings();
    public eqFilterType: boolean = false;
    public eqFilterSimpleCut: number = Config.filterSimpleCutRange - 1;
    public eqFilterSimplePeak: number = 0;
    public noteFilter: FilterSettings = new FilterSettings();
    public noteFilterType: boolean = false;
    public noteFilterSimpleCut: number = Config.filterSimpleCutRange - 1;
    public noteFilterSimplePeak: number = 0;
    public eqSubFilters: (FilterSettings | null)[] = [];
    public noteSubFilters: (FilterSettings | null)[] = [];
    public tmpEqFilterStart: FilterSettings | null;
    public tmpEqFilterEnd: FilterSettings | null;
    public tmpNoteFilterStart: FilterSettings | null;
    public tmpNoteFilterEnd: FilterSettings | null;
    public envelopes: EnvelopeSettings[] = [];
    public fadeIn: number = 0;
    public fadeOut: number = Config.fadeOutNeutral;
    public envelopeCount: number = 0;
    public transition: number = Config.transitions.dictionary["normal"].index;
    public pitchShift: number = 0;
    public detune: number = 0;
    public vibrato: number = 0;
    public interval: number = 0;
    public vibratoDepth: number = 0;
    public vibratoSpeed: number = 10;
    public vibratoDelay: number = 0;
    public vibratoType: number = 0;
    public unison: number = 0;
    public effects: number = 0;
    public chord: number = 1;
    public volume: number = 0;
    public pan: number = Config.panCenter;
    public panDelay: number = 10;
    public arpeggioSpeed: number = 12;
    public fastTwoNoteArp: boolean = false;
    public legacyTieOver: boolean = false;
    public clicklessTransition: boolean = false;
    public aliases: boolean = false;
    public pulseWidth: number = Config.pulseWidthRange;
    public stringSustain: number = 10;
    public distortion: number = 0;
    public bitcrusherFreq: number = 0;
    public bitcrusherQuantization: number = 0;
    public chorus: number = 0;
    public reverb: number = 0;
    public echoSustain: number = 0;
    public echoDelay: number = 0;
    public algorithm: number = 0;
    public feedbackType: number = 0;
    public feedbackAmplitude: number = 0;
    public LFOtime: number = 0;
    public nextLFOtime: number = 0;
    public arpTime: number = 0;
    public customChipWave: Float64Array = new Float64Array(64);
    public customChipWaveIntegral: Float64Array = new Float64Array(65); // One extra element for wrap-around in chipSynth.
    public readonly operators: Operator[] = [];
    public readonly spectrumWave: SpectrumWave;
    public readonly harmonicsWave: HarmonicsWave = new HarmonicsWave();
    public readonly drumsetEnvelopes: number[] = [];
    public readonly drumsetSpectrumWaves: SpectrumWave[] = [];
    public modChannels: number[] = [];
    public modInstruments: number[] = [];
    public modulators: number[] = [];
    public modFilterTypes: number[] = [];
    public invalidModulators: boolean[] = [];
    constructor(isNoiseChannel: boolean, isModChannel: boolean) {

        if (isModChannel) {
            for (let mod: number = 0; mod < Config.modCount; mod++) {
                this.modChannels.push(0);
                this.modInstruments.push(0);
                this.modulators.push(Config.modulators.dictionary["none"].index);
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
        this.effects = 0;
        this.chorus = Config.chorusRange - 1;
        this.reverb = 0;
        this.echoSustain = Math.floor((Config.echoSustainRange - 1) * 0.5);
        this.echoDelay = Math.floor((Config.echoDelayRange - 1) * 0.5);
        this.eqFilter.reset();
        this.eqFilterType = false;
        this.eqFilterSimpleCut = Config.filterSimpleCutRange - 1;
        this.eqFilterSimplePeak = 0;
        for (let i: number = 0; i < Config.filterMorphCount; i++) {
            this.eqSubFilters[i] = null;
            this.noteSubFilters[i] = null;
        }
        this.noteFilter.reset();
        this.noteFilterType = false;
        this.noteFilterSimpleCut = Config.filterSimpleCutRange - 1;
        this.noteFilterSimplePeak = 0;
        this.distortion = Math.floor((Config.distortionRange - 1) * 0.75);
        this.bitcrusherFreq = Math.floor((Config.bitcrusherFreqRange - 1) * 0.5)
        this.bitcrusherQuantization = Math.floor((Config.bitcrusherQuantizationRange - 1) * 0.5);
        this.pan = Config.panCenter;
        this.panDelay = 10;
        this.pitchShift = Config.pitchShiftCenter;
        this.detune = Config.detuneCenter;
        this.vibrato = 0;
        this.unison = 0;
        this.stringSustain = 10;
        this.clicklessTransition = false;
        this.arpeggioSpeed = 12;
        this.legacyTieOver = false;
        this.aliases = false;
        this.fadeIn = 0;
        this.fadeOut = Config.fadeOutNeutral;
        this.transition = Config.transitions.dictionary["normal"].index;
        this.envelopeCount = 0;
        switch (type) {
            case InstrumentType.chip:
                this.chipWave = 2;
                // TODO: enable the chord effect?
                this.chord = Config.chords.dictionary["arpeggio"].index;
                break;
            case InstrumentType.customChipWave:
                this.chipWave = 2;
                this.chord = Config.chords.dictionary["arpeggio"].index;
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
                this.chord = Config.chords.dictionary["custom interval"].index;
                this.algorithm = 0;
                this.feedbackType = 0;
                this.feedbackAmplitude = 0;
                for (let i: number = 0; i < this.operators.length; i++) {
                    this.operators[i].reset(i);
                }
                break;
            case InstrumentType.noise:
                this.chipNoise = 1;
                this.chord = Config.chords.dictionary["arpeggio"].index;
                break;
            case InstrumentType.spectrum:
                this.chord = Config.chords.dictionary["simultaneous"].index;
                this.spectrumWave.reset(isNoiseChannel);
                break;
            case InstrumentType.drumset:
                this.chord = Config.chords.dictionary["simultaneous"].index;
                for (let i: number = 0; i < Config.drumCount; i++) {
                    this.drumsetEnvelopes[i] = Config.envelopes.dictionary["twang 2"].index;
                    if (this.drumsetSpectrumWaves[i] == undefined) {
                        this.drumsetSpectrumWaves[i] = new SpectrumWave(true);
                    }
                    this.drumsetSpectrumWaves[i].reset(isNoiseChannel);
                }
                break;
            case InstrumentType.harmonics:
                this.chord = Config.chords.dictionary["simultaneous"].index;
                this.harmonicsWave.reset();
                break;
            case InstrumentType.pwm:
                this.chord = Config.chords.dictionary["arpeggio"].index;
                this.pulseWidth = Config.pulseWidthRange;
                break;
            case InstrumentType.pickedString:
                this.chord = Config.chords.dictionary["strum"].index;
                this.harmonicsWave.reset();
                break;
            case InstrumentType.mod:
                this.transition = 0;
                this.vibrato = 0;
                this.interval = 0;
                this.effects = 0;
                this.chord = 0;
                this.modChannels = [];
                this.modInstruments = [];
                this.modulators = [];
                for (let mod: number = 0; mod < Config.modCount; mod++) {
                    this.modChannels.push(-2);
                    this.modInstruments.push(0);
                    this.modulators.push(Config.modulators.dictionary["none"].index);
                    this.invalidModulators[mod] = false;
                    this.modFilterTypes[mod] = 0;
                }
                break;
            default:
                throw new Error("Unrecognized instrument type: " + type);
        }
        // Chip/noise instruments had arpeggio and FM had custom interval but neither
        // explicitly saved the chorus setting beforeSeven so enable it here. The effects
        // will otherwise get overridden when reading SongTagCode.startInstrument.
        if (this.chord != Config.chords.dictionary["simultaneous"].index) {
            // Enable chord if it was used.
            this.effects = (this.effects | (1 << EffectType.chord));
        }
    }

    // (only) difference for JummBox: Returns whether or not the note filter was chosen for filter conversion.
    public convertLegacySettings(legacySettings: LegacySettings, forceSimpleFilter: boolean): void {
        let legacyCutoffSetting: number | undefined = legacySettings.filterCutoff;
        let legacyResonanceSetting: number | undefined = legacySettings.filterResonance;
        let legacyFilterEnv: Envelope | undefined = legacySettings.filterEnvelope;
        let legacyPulseEnv: Envelope | undefined = legacySettings.pulseEnvelope;
        let legacyOperatorEnvelopes: Envelope[] | undefined = legacySettings.operatorEnvelopes;
        let legacyFeedbackEnv: Envelope | undefined = legacySettings.feedbackEnvelope;

        // legacy defaults:
        if (legacyCutoffSetting == undefined) legacyCutoffSetting = (this.type == InstrumentType.chip) ? 6 : 10;
        if (legacyResonanceSetting == undefined) legacyResonanceSetting = 0;
        if (legacyFilterEnv == undefined) legacyFilterEnv = Config.envelopes.dictionary["none"];
        if (legacyPulseEnv == undefined) legacyPulseEnv = Config.envelopes.dictionary[(this.type == InstrumentType.pwm) ? "twang 2" : "none"];
        if (legacyOperatorEnvelopes == undefined) legacyOperatorEnvelopes = [Config.envelopes.dictionary[(this.type == InstrumentType.fm) ? "note size" : "none"], Config.envelopes.dictionary["none"], Config.envelopes.dictionary["none"], Config.envelopes.dictionary["none"]];
        if (legacyFeedbackEnv == undefined) legacyFeedbackEnv = Config.envelopes.dictionary["none"];

        const carrierCount: number = Config.algorithms[this.algorithm].carrierCount;
        let noCarriersControlledByNoteSize: boolean = true;
        let allCarriersControlledByNoteSize: boolean = true;
        let noteSizeControlsSomethingElse: boolean = (legacyFilterEnv.type == EnvelopeType.noteSize) || (legacyPulseEnv.type == EnvelopeType.noteSize);
        if (this.type == InstrumentType.fm) {
            noteSizeControlsSomethingElse = noteSizeControlsSomethingElse || (legacyFeedbackEnv.type == EnvelopeType.noteSize);
            for (let i: number = 0; i < legacyOperatorEnvelopes.length; i++) {
                if (i < carrierCount) {
                    if (legacyOperatorEnvelopes[i].type != EnvelopeType.noteSize) {
                        allCarriersControlledByNoteSize = false;
                    } else {
                        noCarriersControlledByNoteSize = false;
                    }
                } else {
                    noteSizeControlsSomethingElse = noteSizeControlsSomethingElse || (legacyOperatorEnvelopes[i].type == EnvelopeType.noteSize);
                }
            }
        }

        this.envelopeCount = 0;

        if (this.type == InstrumentType.fm) {
            if (allCarriersControlledByNoteSize && noteSizeControlsSomethingElse) {
                this.addEnvelope(Config.instrumentAutomationTargets.dictionary["noteVolume"].index, 0, Config.envelopes.dictionary["note size"].index);
            } else if (noCarriersControlledByNoteSize && !noteSizeControlsSomethingElse) {
                this.addEnvelope(Config.instrumentAutomationTargets.dictionary["none"].index, 0, Config.envelopes.dictionary["note size"].index);
            }
        }

        if (legacyFilterEnv.type == EnvelopeType.none) {
            this.noteFilter.reset();
            this.noteFilterType = false;
            this.eqFilter.convertLegacySettings(legacyCutoffSetting, legacyResonanceSetting, legacyFilterEnv);
            this.effects &= ~(1 << EffectType.noteFilter);
            if (forceSimpleFilter || this.eqFilterType) {
                this.eqFilterType = true;
                this.eqFilterSimpleCut = legacyCutoffSetting;
                this.eqFilterSimplePeak = legacyResonanceSetting;
            }
        } else {
            this.eqFilter.reset();

            this.eqFilterType = false;
            this.noteFilterType = false;
            this.noteFilter.convertLegacySettings(legacyCutoffSetting, legacyResonanceSetting, legacyFilterEnv);
            this.effects |= 1 << EffectType.noteFilter;
            this.addEnvelope(Config.instrumentAutomationTargets.dictionary["noteFilterAllFreqs"].index, 0, legacyFilterEnv.index);
            if (forceSimpleFilter || this.noteFilterType) {
                this.noteFilterType = true;
                this.noteFilterSimpleCut = legacyCutoffSetting;
                this.noteFilterSimplePeak = legacyResonanceSetting;
            }
        }

        if (legacyPulseEnv.type != EnvelopeType.none) {
            this.addEnvelope(Config.instrumentAutomationTargets.dictionary["pulseWidth"].index, 0, legacyPulseEnv.index);
        }

        for (let i: number = 0; i < legacyOperatorEnvelopes.length; i++) {
            if (i < carrierCount && allCarriersControlledByNoteSize) continue;
            if (legacyOperatorEnvelopes[i].type != EnvelopeType.none) {
                this.addEnvelope(Config.instrumentAutomationTargets.dictionary["operatorAmplitude"].index, i, legacyOperatorEnvelopes[i].index);
            }
        }

        if (legacyFeedbackEnv.type != EnvelopeType.none) {
            this.addEnvelope(Config.instrumentAutomationTargets.dictionary["feedbackAmplitude"].index, 0, legacyFeedbackEnv.index);
        }
    }

    public toJsonObject(): Object {
        const instrumentObject: any = {
            "type": Config.instrumentTypeNames[this.type],
            "volume": this.volume,
            "eqFilter": this.eqFilter.toJsonObject(),
            "eqFilterType": this.eqFilterType,
            "eqSimpleCut": this.eqFilterSimpleCut,
            "eqSimplePeak": this.eqFilterSimplePeak
        };

        if (this.preset != this.type) {
            instrumentObject["preset"] = this.preset;
        }

        for (let i: number = 0; i < Config.filterMorphCount; i++) {
            if (this.eqSubFilters[i] != null)
                instrumentObject["eqSubFilters" + i] = this.eqSubFilters[i]!.toJsonObject();
        }

        const effects: string[] = [];
        for (const effect of Config.effectOrder) {
            if (this.effects & (1 << effect)) {
                effects.push(Config.effectNames[effect]);
            }
        }
        instrumentObject["effects"] = effects;


        if (effectsIncludeTransition(this.effects)) {
            instrumentObject["transition"] = Config.transitions[this.transition].name;
            instrumentObject["clicklessTransition"] = this.clicklessTransition;
        }
        if (effectsIncludeChord(this.effects)) {
            instrumentObject["chord"] = this.getChord().name;
            instrumentObject["fastTwoNoteArp"] = this.fastTwoNoteArp;
            instrumentObject["arpeggioSpeed"] = this.arpeggioSpeed;
        }
        if (effectsIncludePitchShift(this.effects)) {
            instrumentObject["pitchShiftSemitones"] = this.pitchShift;
        }
        if (effectsIncludeDetune(this.effects)) {
            instrumentObject["detuneCents"] = Synth.detuneToCents(this.detune);
        }
        if (effectsIncludeVibrato(this.effects)) {
            if (this.vibrato == -1) {
                this.vibrato = 5;
            }
            if (this.vibrato != 5) {
                instrumentObject["vibrato"] = Config.vibratos[this.vibrato].name;
            } else {
                instrumentObject["vibrato"] = "custom";
            }
            instrumentObject["vibratoDepth"] = this.vibratoDepth;
            instrumentObject["vibratoDelay"] = this.vibratoDelay;
            instrumentObject["vibratoSpeed"] = this.vibratoSpeed;
            instrumentObject["vibratoType"] = this.vibratoType;
        }
        if (effectsIncludeNoteFilter(this.effects)) {
            instrumentObject["noteFilterType"] = this.noteFilterType;
            instrumentObject["noteSimpleCut"] = this.noteFilterSimpleCut;
            instrumentObject["noteSimplePeak"] = this.noteFilterSimplePeak;
            instrumentObject["noteFilter"] = this.noteFilter.toJsonObject();

            for (let i: number = 0; i < Config.filterMorphCount; i++) {
                if (this.noteSubFilters[i] != null)
                    instrumentObject["noteSubFilters" + i] = this.noteSubFilters[i]!.toJsonObject();
            }
        }
        if (effectsIncludeDistortion(this.effects)) {
            instrumentObject["distortion"] = Math.round(100 * this.distortion / (Config.distortionRange - 1));
            instrumentObject["aliases"] = this.aliases;
        }
        if (effectsIncludeBitcrusher(this.effects)) {
            instrumentObject["bitcrusherOctave"] = (Config.bitcrusherFreqRange - 1 - this.bitcrusherFreq) * Config.bitcrusherOctaveStep;
            instrumentObject["bitcrusherQuantization"] = Math.round(100 * this.bitcrusherQuantization / (Config.bitcrusherQuantizationRange - 1));
        }
        if (effectsIncludePanning(this.effects)) {
            instrumentObject["pan"] = Math.round(100 * (this.pan - Config.panCenter) / Config.panCenter);
            instrumentObject["panDelay"] = this.panDelay;
        }
        if (effectsIncludeChorus(this.effects)) {
            instrumentObject["chorus"] = Math.round(100 * this.chorus / (Config.chorusRange - 1));
        }
        if (effectsIncludeEcho(this.effects)) {
            instrumentObject["echoSustain"] = Math.round(100 * this.echoSustain / (Config.echoSustainRange - 1));
            instrumentObject["echoDelayBeats"] = Math.round(1000 * (this.echoDelay + 1) * Config.echoDelayStepTicks / (Config.ticksPerPart * Config.partsPerBeat)) / 1000;
        }
        if (effectsIncludeReverb(this.effects)) {
            instrumentObject["reverb"] = Math.round(100 * this.reverb / (Config.reverbRange - 1));
        }

        if (this.type != InstrumentType.drumset) {
            instrumentObject["fadeInSeconds"] = Math.round(10000 * Synth.fadeInSettingToSeconds(this.fadeIn)) / 10000;
            instrumentObject["fadeOutTicks"] = Synth.fadeOutSettingToTicks(this.fadeOut);
        }

        if (this.type == InstrumentType.harmonics || this.type == InstrumentType.pickedString) {
            instrumentObject["harmonics"] = [];
            for (let i: number = 0; i < Config.harmonicsControlPoints; i++) {
                instrumentObject["harmonics"][i] = Math.round(100 * this.harmonicsWave.harmonics[i] / Config.harmonicsMax);
            }
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
            instrumentObject["unison"] = Config.unisons[this.unison].name;
        } else if (this.type == InstrumentType.pwm) {
            instrumentObject["pulseWidth"] = this.pulseWidth;
        } else if (this.type == InstrumentType.pickedString) {
            instrumentObject["unison"] = Config.unisons[this.unison].name;
            instrumentObject["stringSustain"] = Math.round(100 * this.stringSustain / (Config.stringSustainRange - 1));
        } else if (this.type == InstrumentType.harmonics) {
            instrumentObject["unison"] = Config.unisons[this.unison].name;
        } else if (this.type == InstrumentType.fm) {
            const operatorArray: Object[] = [];
            for (const operator of this.operators) {
                operatorArray.push({
                    "frequency": Config.operatorFrequencies[operator.frequency].name,
                    "amplitude": operator.amplitude,
                    "waveform": Config.operatorWaves[operator.waveform].name,
                    "pulseWidth": operator.pulseWidth,
                });
            }
            instrumentObject["algorithm"] = Config.algorithms[this.algorithm].name;
            instrumentObject["feedbackType"] = Config.feedbacks[this.feedbackType].name;
            instrumentObject["feedbackAmplitude"] = this.feedbackAmplitude;
            instrumentObject["operators"] = operatorArray;
        } else if (this.type == InstrumentType.customChipWave) {
            instrumentObject["wave"] = Config.chipWaves[this.chipWave].name;
            instrumentObject["unison"] = Config.unisons[this.unison].name;
            instrumentObject["customChipWave"] = new Float64Array(64);
            instrumentObject["customChipWaveIntegral"] = new Float64Array(65);
            for (let i: number = 0; i < this.customChipWave.length; i++) {
                instrumentObject["customChipWave"][i] = this.customChipWave[i];
                // Meh, waste of space and can be inaccurate. It will be recalc'ed when instrument loads.
                //instrumentObject["customChipWaveIntegral"][i] = this.customChipWaveIntegral[i];
            }
        } else if (this.type == InstrumentType.mod) {
            instrumentObject["modChannels"] = [];
            instrumentObject["modInstruments"] = [];
            instrumentObject["modSettings"] = [];
            instrumentObject["modStatuses"] = [];
            for (let mod: number = 0; mod < Config.modCount; mod++) {
                instrumentObject["modChannels"][mod] = this.modChannels[mod];
                instrumentObject["modInstruments"][mod] = this.modInstruments[mod];
                instrumentObject["modSettings"][mod] = this.modulators[mod];
            }
        } else {
            throw new Error("Unrecognized instrument type");
        }

        const envelopes: any[] = [];
        for (let i = 0; i < this.envelopeCount; i++) {
            envelopes.push(this.envelopes[i].toJsonObject());
        }
        instrumentObject["envelopes"] = envelopes;

        return instrumentObject;
    }


    public fromJsonObject(instrumentObject: any, isNoiseChannel: boolean, isModChannel: boolean, useSlowerRhythm: boolean, useFastTwoNoteArp: boolean, legacyGlobalReverb: number = 0): void {
        if (instrumentObject == undefined) instrumentObject = {};

        let type: InstrumentType = Config.instrumentTypeNames.indexOf(instrumentObject["type"]);
        if (<any>type == -1) type = isModChannel ? InstrumentType.mod : (isNoiseChannel ? InstrumentType.noise : InstrumentType.chip);
        this.setTypeAndReset(type, isNoiseChannel, isModChannel);

        if (instrumentObject["preset"] != undefined) {
            this.preset = instrumentObject["preset"] >>> 0;
        }

        if (instrumentObject["volume"] != undefined) {
            this.volume = clamp(-Config.volumeRange / 2, (Config.volumeRange / 2) + 1, instrumentObject["volume"] | 0);
        } else {
            this.volume = 0;
        }

        if (Array.isArray(instrumentObject["effects"])) {
            let effects: number = 0;
            for (let i: number = 0; i < instrumentObject["effects"].length; i++) {
                effects = effects | (1 << Config.effectNames.indexOf(instrumentObject["effects"][i]));
            }
            this.effects = (effects & ((1 << EffectType.length) - 1));
        } else {
            // The index of these names is reinterpreted as a bitfield, which relies on reverb and chorus being the first effects!
            const legacyEffectsNames: string[] = ["none", "reverb", "chorus", "chorus & reverb"];
            this.effects = legacyEffectsNames.indexOf(instrumentObject["effects"]);
            if (this.effects == -1) this.effects = (this.type == InstrumentType.noise) ? 0 : 1;
        }

        this.transition = Config.transitions.dictionary["normal"].index; // default value.
        const transitionProperty: any = instrumentObject["transition"] || instrumentObject["envelope"]; // the transition property used to be called envelope, so check that too.
        if (transitionProperty != undefined) {
            let transition: Transition | undefined = Config.transitions.dictionary[transitionProperty];
            if (instrumentObject["fadeInSeconds"] == undefined || instrumentObject["fadeOutTicks"] == undefined) {
                const legacySettings = (<any>{
                    "binary": { transition: "interrupt", fadeInSeconds: 0.0, fadeOutTicks: -1 },
                    "seamless": { transition: "interrupt", fadeInSeconds: 0.0, fadeOutTicks: -1 },
                    "sudden": { transition: "normal", fadeInSeconds: 0.0, fadeOutTicks: -3 },
                    "hard": { transition: "normal", fadeInSeconds: 0.0, fadeOutTicks: -3 },
                    "smooth": { transition: "normal", fadeInSeconds: 0.025, fadeOutTicks: -3 },
                    "soft": { transition: "normal", fadeInSeconds: 0.025, fadeOutTicks: -3 },
                    // Note that the old slide transition has the same name as a new slide transition that is different.
                    // Only apply legacy settings if the instrument JSON was created before, based on the presence
                    // of the fade in/out fields.
                    "slide": { transition: "slide in pattern", fadeInSeconds: 0.025, fadeOutTicks: -3 },
                    "cross fade": { transition: "normal", fadeInSeconds: 0.04, fadeOutTicks: 6 },
                    "hard fade": { transition: "normal", fadeInSeconds: 0.0, fadeOutTicks: 48 },
                    "medium fade": { transition: "normal", fadeInSeconds: 0.0125, fadeOutTicks: 72 },
                    "soft fade": { transition: "normal", fadeInSeconds: 0.06, fadeOutTicks: 96 },
                })[transitionProperty];
                if (legacySettings != undefined) {
                    transition = Config.transitions.dictionary[legacySettings.transition];
                    // These may be overridden below.
                    this.fadeIn = Synth.secondsToFadeInSetting(legacySettings.fadeInSeconds);
                    this.fadeOut = Synth.ticksToFadeOutSetting(legacySettings.fadeOutTicks);
                }
            }
            if (transition != undefined) this.transition = transition.index;

            if (this.transition != Config.transitions.dictionary["normal"].index) {
                // Enable transition if it was used.
                this.effects = (this.effects | (1 << EffectType.transition));
            }
        }

        // Overrides legacy settings in transition above.
        if (instrumentObject["fadeInSeconds"] != undefined) {
            this.fadeIn = Synth.secondsToFadeInSetting(+instrumentObject["fadeInSeconds"]);
        }
        if (instrumentObject["fadeOutTicks"] != undefined) {
            this.fadeOut = Synth.ticksToFadeOutSetting(+instrumentObject["fadeOutTicks"]);
        }

        {
            // Note that the chord setting may be overridden by instrumentObject["chorus"] below.
            const chordProperty: any = instrumentObject["chord"];
            const legacyChordNames: Dictionary<string> = { "harmony": "simultaneous" };
            const chord: Chord | undefined = Config.chords.dictionary[legacyChordNames[chordProperty]] || Config.chords.dictionary[chordProperty];
            if (chord != undefined) {
                this.chord = chord.index;
            } else {
                // Different instruments have different default chord types based on historical behaviour.
                if (this.type == InstrumentType.noise) {
                    this.chord = Config.chords.dictionary["arpeggio"].index;
                } else if (this.type == InstrumentType.pickedString) {
                    this.chord = Config.chords.dictionary["strum"].index;
                } else if (this.type == InstrumentType.chip) {
                    this.chord = Config.chords.dictionary["arpeggio"].index;
                } else if (this.type == InstrumentType.fm) {
                    this.chord = Config.chords.dictionary["custom interval"].index;
                } else {
                    this.chord = Config.chords.dictionary["simultaneous"].index;
                }
            }
        }

        this.unison = Config.unisons.dictionary["none"].index; // default value.
        const unisonProperty: any = instrumentObject["unison"] || instrumentObject["interval"] || instrumentObject["chorus"]; // The unison property has gone by various names in the past.
        if (unisonProperty != undefined) {
            const legacyChorusNames: Dictionary<string> = { "union": "none", "fifths": "fifth", "octaves": "octave" };
            const unison: Unison | undefined = Config.unisons.dictionary[legacyChorusNames[unisonProperty]] || Config.unisons.dictionary[unisonProperty];
            if (unison != undefined) this.unison = unison.index;
        }
        if (instrumentObject["chorus"] == "custom harmony") {
            // The original chorus setting had an option that now maps to two different settings. Override those if necessary.
            this.unison = Config.unisons.dictionary["hum"].index;
            this.chord = Config.chords.dictionary["custom interval"].index;
        }
        if (this.chord != Config.chords.dictionary["simultaneous"].index && !Array.isArray(instrumentObject["effects"])) {
            // Enable chord if it was used.
            this.effects = (this.effects | (1 << EffectType.chord));
        }

        if (instrumentObject["pitchShiftSemitones"] != undefined) {
            this.pitchShift = clamp(0, Config.pitchShiftRange, Math.round(+instrumentObject["pitchShiftSemitones"]));
        }
        if (instrumentObject["detuneCents"] != undefined) {
            this.detune = clamp(Config.detuneMin, Config.detuneMax + 1, Math.round(Synth.centsToDetune(+instrumentObject["detuneCents"])));
        }

        this.vibrato = Config.vibratos.dictionary["none"].index; // default value.
        const vibratoProperty: any = instrumentObject["vibrato"] || instrumentObject["effect"]; // The vibrato property was previously called "effect", not to be confused with the current "effects".
        if (vibratoProperty != undefined) {

            const legacyVibratoNames: Dictionary<string> = { "vibrato light": "light", "vibrato delayed": "delayed", "vibrato heavy": "heavy" };
            const vibrato: Vibrato | undefined = Config.vibratos.dictionary[legacyVibratoNames[unisonProperty]] || Config.vibratos.dictionary[vibratoProperty];
            if (vibrato != undefined)
                this.vibrato = vibrato.index;
            else if (vibratoProperty == "custom")
                this.vibrato = Config.vibratos.length; // custom

            if (this.vibrato == Config.vibratos.length) {
                this.vibratoDepth = instrumentObject["vibratoDepth"];
                this.vibratoSpeed = instrumentObject["vibratoSpeed"];
                this.vibratoDelay = instrumentObject["vibratoDelay"];
                this.vibratoType = instrumentObject["vibratoType"];
            }
            else { // Set defaults for the vibrato profile
                this.vibratoDepth = Config.vibratos[this.vibrato].amplitude;
                this.vibratoDelay = Config.vibratos[this.vibrato].delayTicks / 2;
                this.vibratoSpeed = 10; // default;
                this.vibratoType = Config.vibratos[this.vibrato].type;
            }

            // Old songs may have a vibrato effect without explicitly enabling it.
            if (vibrato != Config.vibratos.dictionary["none"]) {
                this.effects = (this.effects | (1 << EffectType.vibrato));
            }
        }

        if (instrumentObject["pan"] != undefined) {
            this.pan = clamp(0, Config.panMax + 1, Math.round(Config.panCenter + (instrumentObject["pan"] | 0) * Config.panCenter / 100));

            // Old songs may have a panning effect without explicitly enabling it.
            if (this.pan != Config.panCenter) {
                this.effects = (this.effects | (1 << EffectType.panning));
            }
        } else {
            this.pan = Config.panCenter;
        }

        if (instrumentObject["panDelay"] != undefined) {
            this.panDelay = (instrumentObject["panDelay"] | 0);
        } else {
            this.panDelay = 10;
        }

        if (instrumentObject["detune"] != undefined) {
            this.detune = clamp(Config.detuneMin, Config.detuneMax + 1, (instrumentObject["detune"] | 0));
        }
        else if (instrumentObject["detuneCents"] == undefined) {
            this.detune = Config.detuneCenter;
        }

        if (instrumentObject["distortion"] != undefined) {
            this.distortion = clamp(0, Config.distortionRange, Math.round((Config.distortionRange - 1) * (instrumentObject["distortion"] | 0) / 100));
        }

        if (instrumentObject["bitcrusherOctave"] != undefined) {
            this.bitcrusherFreq = Config.bitcrusherFreqRange - 1 - (+instrumentObject["bitcrusherOctave"]) / Config.bitcrusherOctaveStep;
        }
        if (instrumentObject["bitcrusherQuantization"] != undefined) {
            this.bitcrusherQuantization = clamp(0, Config.bitcrusherQuantizationRange, Math.round((Config.bitcrusherQuantizationRange - 1) * (instrumentObject["bitcrusherQuantization"] | 0) / 100));
        }

        if (instrumentObject["echoSustain"] != undefined) {
            this.echoSustain = clamp(0, Config.echoSustainRange, Math.round((Config.echoSustainRange - 1) * (instrumentObject["echoSustain"] | 0) / 100));
        }
        if (instrumentObject["echoDelayBeats"] != undefined) {
            this.echoDelay = clamp(0, Config.echoDelayRange, Math.round((+instrumentObject["echoDelayBeats"]) * (Config.ticksPerPart * Config.partsPerBeat) / Config.echoDelayStepTicks - 1.0));
        }

        if (!isNaN(instrumentObject["chorus"])) {
            this.chorus = clamp(0, Config.chorusRange, Math.round((Config.chorusRange - 1) * (instrumentObject["chorus"] | 0) / 100));
        }

        if (instrumentObject["reverb"] != undefined) {
            this.reverb = clamp(0, Config.reverbRange, Math.round((Config.reverbRange - 1) * (instrumentObject["reverb"] | 0) / 100));
        } else {
            this.reverb = legacyGlobalReverb;
        }

        if (instrumentObject["pulseWidth"] != undefined) {
            this.pulseWidth = clamp(1, Config.pulseWidthRange + 1, Math.round(instrumentObject["pulseWidth"]));
        } else {
            this.pulseWidth = Config.pulseWidthRange;
        }

        if (instrumentObject["harmonics"] != undefined) {
            for (let i: number = 0; i < Config.harmonicsControlPoints; i++) {
                this.harmonicsWave.harmonics[i] = Math.max(0, Math.min(Config.harmonicsMax, Math.round(Config.harmonicsMax * (+instrumentObject["harmonics"][i]) / 100)));
            }
        } else {
            this.harmonicsWave.reset();
        }

        if (instrumentObject["spectrum"] != undefined) {
            for (let i: number = 0; i < Config.spectrumControlPoints; i++) {
                this.spectrumWave.spectrum[i] = Math.max(0, Math.min(Config.spectrumMax, Math.round(Config.spectrumMax * (+instrumentObject["spectrum"][i]) / 100)));
            }
        } else {
            this.spectrumWave.reset(isNoiseChannel);
        }

        if (instrumentObject["stringSustain"] != undefined) {
            this.stringSustain = clamp(0, Config.stringSustainRange, Math.round((Config.stringSustainRange - 1) * (instrumentObject["stringSustain"] | 0) / 100));
        } else {
            this.stringSustain = 10;
        }

        if (this.type == InstrumentType.noise) {
            this.chipNoise = Config.chipNoises.findIndex(wave => wave.name == instrumentObject["wave"]);
            if (this.chipNoise == -1) this.chipNoise = 1;
        }

        const legacyEnvelopeNames: Dictionary<string> = { "custom": "note size", "steady": "none", "pluck 1": "twang 1", "pluck 2": "twang 2", "pluck 3": "twang 3" };
        const getEnvelope = (name: any): Envelope | undefined => (legacyEnvelopeNames[name] != undefined) ? Config.envelopes.dictionary[legacyEnvelopeNames[name]] : Config.envelopes.dictionary[name];

        if (this.type == InstrumentType.drumset) {
            if (instrumentObject["drums"] != undefined) {
                for (let j: number = 0; j < Config.drumCount; j++) {
                    const drum: any = instrumentObject["drums"][j];
                    if (drum == undefined) continue;

                    this.drumsetEnvelopes[j] = Config.envelopes.dictionary["twang 2"].index; // default value.
                    if (drum["filterEnvelope"] != undefined) {
                        const envelope: Envelope | undefined = getEnvelope(drum["filterEnvelope"]);
                        if (envelope != undefined) this.drumsetEnvelopes[j] = envelope.index;
                    }
                    if (drum["spectrum"] != undefined) {
                        for (let i: number = 0; i < Config.spectrumControlPoints; i++) {
                            this.drumsetSpectrumWaves[j].spectrum[i] = Math.max(0, Math.min(Config.spectrumMax, Math.round(Config.spectrumMax * (+drum["spectrum"][i]) / 100)));
                        }
                    }
                }
            }
        }

        if (this.type == InstrumentType.chip) {
            const legacyWaveNames: Dictionary<number> = { "triangle": 1, "square": 2, "pulse wide": 3, "pulse narrow": 4, "sawtooth": 5, "double saw": 6, "double pulse": 7, "spiky": 8, "plateau": 0 };
            this.chipWave = legacyWaveNames[instrumentObject["wave"]] != undefined ? legacyWaveNames[instrumentObject["wave"]] : Config.chipWaves.findIndex(wave => wave.name == instrumentObject["wave"]);
            if (this.chipWave == -1) this.chipWave = 1;
        }

        if (this.type == InstrumentType.fm) {
            this.algorithm = Config.algorithms.findIndex(algorithm => algorithm.name == instrumentObject["algorithm"]);
            if (this.algorithm == -1) this.algorithm = 0;
            this.feedbackType = Config.feedbacks.findIndex(feedback => feedback.name == instrumentObject["feedbackType"]);
            if (this.feedbackType == -1) this.feedbackType = 0;
            if (instrumentObject["feedbackAmplitude"] != undefined) {
                this.feedbackAmplitude = clamp(0, Config.operatorAmplitudeMax + 1, instrumentObject["feedbackAmplitude"] | 0);
            } else {
                this.feedbackAmplitude = 0;
            }

            for (let j: number = 0; j < Config.operatorCount; j++) {
                const operator: Operator = this.operators[j];
                let operatorObject: any = undefined;
                if (instrumentObject["operators"] != undefined) operatorObject = instrumentObject["operators"][j];
                if (operatorObject == undefined) operatorObject = {};

                operator.frequency = Config.operatorFrequencies.findIndex(freq => freq.name == operatorObject["frequency"]);
                if (operator.frequency == -1) operator.frequency = 0;
                if (operatorObject["amplitude"] != undefined) {
                    operator.amplitude = clamp(0, Config.operatorAmplitudeMax + 1, operatorObject["amplitude"] | 0);
                } else {
                    operator.amplitude = 0;
                }
                if (operatorObject["waveform"] != undefined) {
                    operator.waveform = Config.operatorWaves.findIndex(wave => wave.name == operatorObject["waveform"]);
                    if (operator.waveform == -1) {
                        // GoldBox compatibility
                        if (operatorObject["waveform"] == "square") {
                            operator.waveform = Config.operatorWaves.dictionary["pulse width"].index;
                            operator.pulseWidth = 5;
                        } else {
                            operator.waveform = 0;
                        }

                    }
                } else {
                    operator.waveform = 0;
                }
                if (operatorObject["pulseWidth"] != undefined) {
                    operator.pulseWidth = operatorObject["pulseWidth"] | 0;
                } else {
                    operator.pulseWidth = 5;
                }
            }
        }
        else if (this.type == InstrumentType.customChipWave) {
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
                    this.modulators[mod] = instrumentObject["modSettings"][mod];
                }
            }
        }

        if (this.type != InstrumentType.mod) {
            // Arpeggio speed
            if (this.chord == Config.chords.dictionary["arpeggio"].index && instrumentObject["arpeggioSpeed"] != undefined) {
                this.arpeggioSpeed = instrumentObject["arpeggioSpeed"];
            }
            else {
                this.arpeggioSpeed = (useSlowerRhythm) ? 9 : 12; // Decide whether to import arps as x3/4 speed
            }

            if (instrumentObject["fastTwoNoteArp"] != undefined) {
                this.fastTwoNoteArp = instrumentObject["fastTwoNoteArp"];
            }
            else {
                this.fastTwoNoteArp = useFastTwoNoteArp;
            }

            if (instrumentObject["clicklessTransition"] != undefined) {
                this.clicklessTransition = instrumentObject["clicklessTransition"];
            }
            else {
                this.clicklessTransition = false;
            }

            if (instrumentObject["aliases"] != undefined) {
                this.aliases = instrumentObject["aliases"];
            }
            else {
                this.aliases = false;
            }

            if (instrumentObject["noteFilterType"] != undefined) {
                this.noteFilterType = instrumentObject["noteFilterType"];
            }
            if (instrumentObject["noteSimpleCut"] != undefined) {
                this.noteFilterSimpleCut = instrumentObject["noteSimpleCut"];
            }
            if (instrumentObject["noteSimplePeak"] != undefined) {
                this.noteFilterSimplePeak = instrumentObject["noteSimplePeak"];
            }
            if (instrumentObject["noteFilter"] != undefined) {
                this.noteFilter.fromJsonObject(instrumentObject["noteFilter"]);
            } else {
                this.noteFilter.reset();
            }
            for (let i: number = 0; i < Config.filterMorphCount; i++) {
                if (Array.isArray(instrumentObject["noteSubFilters" + i])) {
                    this.noteSubFilters[i] = new FilterSettings();
                    this.noteSubFilters[i]!.fromJsonObject(instrumentObject["noteSubFilters" + i]);
                }
            }
            if (instrumentObject["eqFilterType"] != undefined) {
                this.eqFilterType = instrumentObject["eqFilterType"];
            }
            if (instrumentObject["eqSimpleCut"] != undefined) {
                this.eqFilterSimpleCut = instrumentObject["eqSimpleCut"];
            }
            if (instrumentObject["eqSimplePeak"] != undefined) {
                this.eqFilterSimplePeak = instrumentObject["eqSimplePeak"];
            }
            if (Array.isArray(instrumentObject["eqFilter"])) {
                this.eqFilter.fromJsonObject(instrumentObject["eqFilter"]);
            } else {
                this.eqFilter.reset();

                const legacySettings: LegacySettings = {};

                // Try converting from legacy filter settings.
                const filterCutoffMaxHz: number = 8000;
                const filterCutoffRange: number = 11;
                const filterResonanceRange: number = 8;
                if (instrumentObject["filterCutoffHz"] != undefined) {
                    legacySettings.filterCutoff = clamp(0, filterCutoffRange, Math.round((filterCutoffRange - 1) + 2.0 * Math.log((instrumentObject["filterCutoffHz"] | 0) / filterCutoffMaxHz) / Math.LN2));
                } else {
                    legacySettings.filterCutoff = (this.type == InstrumentType.chip) ? 6 : 10;
                }
                if (instrumentObject["filterResonance"] != undefined) {
                    legacySettings.filterResonance = clamp(0, filterResonanceRange, Math.round((filterResonanceRange - 1) * (instrumentObject["filterResonance"] | 0) / 100));
                } else {
                    legacySettings.filterResonance = 0;
                }

                legacySettings.filterEnvelope = getEnvelope(instrumentObject["filterEnvelope"]);
                legacySettings.pulseEnvelope = getEnvelope(instrumentObject["pulseEnvelope"]);
                legacySettings.feedbackEnvelope = getEnvelope(instrumentObject["feedbackEnvelope"]);
                if (Array.isArray(instrumentObject["operators"])) {
                    legacySettings.operatorEnvelopes = [];
                    for (let j: number = 0; j < Config.operatorCount; j++) {
                        let envelope: Envelope | undefined;
                        if (instrumentObject["operators"][j] != undefined) {
                            envelope = getEnvelope(instrumentObject["operators"][j]["envelope"]);
                        }
                        legacySettings.operatorEnvelopes[j] = (envelope != undefined) ? envelope : Config.envelopes.dictionary["none"];
                    }
                }

                // Try converting from even older legacy filter settings.
                if (instrumentObject["filter"] != undefined) {
                    const legacyToCutoff: number[] = [10, 6, 3, 0, 8, 5, 2];
                    const legacyToEnvelope: string[] = ["none", "none", "none", "none", "decay 1", "decay 2", "decay 3"];
                    const filterNames: string[] = ["none", "bright", "medium", "soft", "decay bright", "decay medium", "decay soft"];
                    const oldFilterNames: Dictionary<number> = { "sustain sharp": 1, "sustain medium": 2, "sustain soft": 3, "decay sharp": 4 };
                    let legacyFilter: number = oldFilterNames[instrumentObject["filter"]] != undefined ? oldFilterNames[instrumentObject["filter"]] : filterNames.indexOf(instrumentObject["filter"]);
                    if (legacyFilter == -1) legacyFilter = 0;
                    legacySettings.filterCutoff = legacyToCutoff[legacyFilter];
                    legacySettings.filterEnvelope = getEnvelope(legacyToEnvelope[legacyFilter]);
                    legacySettings.filterResonance = 0;
                }

                this.convertLegacySettings(legacySettings, true);
            }

            for (let i: number = 0; i < Config.filterMorphCount; i++) {
                if (Array.isArray(instrumentObject["eqSubFilters" + i])) {
                    this.eqSubFilters[i] = new FilterSettings();
                    this.eqSubFilters[i]!.fromJsonObject(instrumentObject["eqSubFilters" + i]);
                }
            }

            if (Array.isArray(instrumentObject["envelopes"])) {
                const envelopeArray: any[] = instrumentObject["envelopes"];
                for (let i = 0; i < envelopeArray.length; i++) {
                    if (this.envelopeCount >= Config.maxEnvelopeCount) break;
                    const tempEnvelope: EnvelopeSettings = new EnvelopeSettings();
                    tempEnvelope.fromJsonObject(envelopeArray[i]);
                    this.addEnvelope(tempEnvelope.target, tempEnvelope.index, tempEnvelope.envelope);
                }
            }
        }
    }

    public static frequencyFromPitch(pitch: number): number {
        return 440.0 * Math.pow(2.0, (pitch - 69.0) / 12.0);
    }

    public static drumsetIndexReferenceDelta(index: number): number {
        return Instrument.frequencyFromPitch(Config.spectrumBasePitch + index * 6) / 44100;
    }

    private static _drumsetIndexToSpectrumOctave(index: number) {
        return 15 + Math.log2(Instrument.drumsetIndexReferenceDelta(index));
    }

    public addEnvelope(target: number, index: number, envelope: number): void {
        if (!this.supportsEnvelopeTarget(target, index)) throw new Error();
        if (this.envelopeCount >= Config.maxEnvelopeCount) throw new Error();
        while (this.envelopes.length <= this.envelopeCount) this.envelopes[this.envelopes.length] = new EnvelopeSettings();
        const envelopeSettings: EnvelopeSettings = this.envelopes[this.envelopeCount];
        envelopeSettings.target = target;
        envelopeSettings.index = index;
        envelopeSettings.envelope = envelope;
        this.envelopeCount++;
    }

    public supportsEnvelopeTarget(target: number, index: number): boolean {
        const automationTarget: AutomationTarget = Config.instrumentAutomationTargets[target];
        if (index >= automationTarget.maxCount) {
            return false;
        }
        if (automationTarget.compatibleInstruments != null && automationTarget.compatibleInstruments.indexOf(this.type) == -1) {
            return false;
        }
        if (automationTarget.effect != null && (this.effects & (1 << automationTarget.effect)) == 0) {
            return false;
        }
        if (automationTarget.isFilter) {
            //if (automationTarget.perNote) {
            if (index >= this.noteFilter.controlPointCount && !this.noteFilterType) return false;
            //} else {
            //	if (index >= this.eqFilter.controlPointCount)   return false;
            //}
        }
        return true;
    }

    public clearInvalidEnvelopeTargets(): void {
        for (let envelopeIndex: number = 0; envelopeIndex < this.envelopeCount; envelopeIndex++) {
            const target: number = this.envelopes[envelopeIndex].target;
            const index: number = this.envelopes[envelopeIndex].index;
            if (!this.supportsEnvelopeTarget(target, index)) {
                this.envelopes[envelopeIndex].target = Config.instrumentAutomationTargets.dictionary["none"].index;
                this.envelopes[envelopeIndex].index = 0;
            }
        }
    }

    public warmUp(samplesPerSecond: number): void {
        this.LFOtime = 0;
        this.nextLFOtime = 0;
        this.arpTime = 0;
        this.tmpEqFilterStart = this.eqFilter;
        this.tmpEqFilterEnd = null;
        this.tmpNoteFilterStart = this.noteFilter;
        this.tmpNoteFilterEnd = null;
        if (this.type == InstrumentType.noise) {
            getDrumWave(this.chipNoise, inverseRealFourierTransform, scaleElementsByFactor);
        } else if (this.type == InstrumentType.harmonics) {
            this.harmonicsWave.getCustomWave(this.type);
        } else if (this.type == InstrumentType.pickedString) {
            this.harmonicsWave.getCustomWave(this.type);
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
            return getDrumWave(this.chipNoise, inverseRealFourierTransform, scaleElementsByFactor);
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
            throw new Error("Unhandled instrument type in getDrumsetWave");
        }
    }

    public getTransition(): Transition {
        return effectsIncludeTransition(this.effects) ? Config.transitions[this.transition] :
            (this.type == InstrumentType.mod ? Config.transitions.dictionary["interrupt"] : Config.transitions.dictionary["normal"]);
    }

    public getFadeInSeconds(): number {
        return (this.type == InstrumentType.drumset) ? 0.0 : Synth.fadeInSettingToSeconds(this.fadeIn);
    }

    public getFadeOutTicks(): number {
        return (this.type == InstrumentType.drumset) ? Config.drumsetFadeOutTicks : Synth.fadeOutSettingToTicks(this.fadeOut)
    }

    public getChord(): Chord {
        return effectsIncludeChord(this.effects) ? Config.chords[this.chord] : Config.chords.dictionary["simultaneous"];
    }

    public getDrumsetEnvelope(pitch: number): Envelope {
        if (this.type != InstrumentType.drumset) throw new Error("Can't getDrumsetEnvelope() for non-drumset.");
        return Config.envelopes[this.drumsetEnvelopes[pitch]];
    }
}

export class Channel {
    public octave: number = 0;
    public readonly instruments: Instrument[] = [];
    public readonly patterns: Pattern[] = [];
    public readonly bars: number[] = [];
    public muted: boolean = false;
    public name: string = "";
}

export class Song {
    private static readonly _format: string = "BeepBox";
    private static readonly _oldestBeepboxVersion: number = 2;
    private static readonly _latestBeepboxVersion: number = 9;
    private static readonly _oldestJummBoxVersion: number = 1;
    private static readonly _latestJummBoxVersion: number = 5;
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
    public layeredInstruments: boolean;
    public patternInstruments: boolean;
    public loopStart: number;
    public loopLength: number;
    public pitchChannelCount: number;
    public noiseChannelCount: number;
    public modChannelCount: number;
    public readonly channels: Channel[] = [];
    public limitDecay: number = 4.0;
    public limitRise: number = 4000.0;
    public compressionThreshold: number = 1.0;
    public limitThreshold: number = 1.0;
    public compressionRatio: number = 1.0;
    public limitRatio: number = 1.0;
    public masterGain: number = 1.0;
    public inVolumeCap: number = 0.0;
    public outVolumeCap: number = 0.0;

    constructor(string?: string) {
        if (string != undefined) {
            this.fromBase64String(string);
        } else {
            this.initToDefault(true);
        }
    }

    // Returns the ideal new note volume when dragging (max volume for a normal note, a "neutral" value for mod notes based on how they work)
    public getNewNoteVolume = (isMod: boolean, modChannel?: number, modInstrument?: number, modCount?: number): number => {
        if (!isMod || modChannel == undefined || modInstrument == undefined || modCount == undefined)
            return 6;
        else {
            // Sigh, the way pitches count up and the visual ordering in the UI are flipped.
            modCount = Config.modCount - modCount - 1;

            let vol: number | undefined = Config.modulators[this.channels[modChannel].instruments[modInstrument].modulators[modCount]].newNoteVol;

            // For tempo, actually use user defined tempo
            let tempoIndex: number = Config.modulators.dictionary["tempo"].index;
            if (this.channels[modChannel].instruments[modInstrument].modulators[modCount] == tempoIndex) {
                vol = this.tempo - Config.modulators[tempoIndex].convertRealFactor;
            }

            if (vol != undefined)
                return vol;
            else
                return 6;
        }
    }


    public getVolumeCap = (isMod: boolean, modChannel?: number, modInstrument?: number, modCount?: number): number => {
        if (!isMod || modChannel == undefined || modInstrument == undefined || modCount == undefined)
            return 6;
        else {
            // Sigh, the way pitches count up and the visual ordering in the UI are flipped.
            modCount = Config.modCount - modCount - 1;

            let instrument: Instrument = this.channels[modChannel].instruments[modInstrument];
            let modulator = Config.modulators[instrument.modulators[modCount]];
            let cap: number | undefined = modulator.maxRawVol;

            if (cap != undefined) {
                // For filters, cap is dependent on which filter setting is targeted
                if (modulator.name == "eq filter" || modulator.name == "note filter") {
                    // type 0: number of filter morphs
                    // type 1/odd: number of filter x positions
                    // type 2/even: number of filter y positions
                    cap = Config.filterMorphCount - 1;
                    if (instrument.modFilterTypes[modCount] > 0 && instrument.modFilterTypes[modCount] % 2) {
                        cap = Config.filterFreqRange;
                    } else if (instrument.modFilterTypes[modCount] > 0) {
                        cap = Config.filterGainRange;
                    }
                }
                return cap;
            }
            else
                return 6;
        }
    }

    public getVolumeCapForSetting = (isMod: boolean, modSetting: number, filterType?: number): number => {
        if (!isMod)
            return Config.noteSizeMax;
        else {
            let cap: number | undefined = Config.modulators[modSetting].maxRawVol;
            if (cap != undefined) {

                // For filters, cap is dependent on which filter setting is targeted
                if (filterType != undefined && (Config.modulators[modSetting].name == "eq filter" || Config.modulators[modSetting].name == "note filter")) {
                    // type 0: number of filter morphs
                    // type 1/odd: number of filter x positions
                    // type 2/even: number of filter y positions
                    cap = Config.filterMorphCount - 1;
                    if (filterType > 0 && filterType % 2) {
                        cap = Config.filterFreqRange;
                    } else if (filterType > 0) {
                        cap = Config.filterGainRange;
                    }
                }

                return cap;
            }
            else
                return Config.noteSizeMax;
        }
    }

    public getChannelCount(): number {
        return this.pitchChannelCount + this.noiseChannelCount + this.modChannelCount;
    }

    public getMaxInstrumentsPerChannel(): number {
        return Math.max(
            this.layeredInstruments ? Config.layeredInstrumentCountMax : Config.instrumentCountMin,
            this.patternInstruments ? Config.patternInstrumentCountMax : Config.instrumentCountMin);
    }

    public getMaxInstrumentsPerPattern(channelIndex: number): number {
        return this.getMaxInstrumentsPerPatternForChannel(this.channels[channelIndex]);
    }

    public getMaxInstrumentsPerPatternForChannel(channel: Channel): number {
        return this.layeredInstruments
            ? Math.min(Config.layeredInstrumentCountMax, channel.instruments.length)
            : 1;
    }

    public getChannelIsNoise(channelIndex: number): boolean {
        return (channelIndex >= this.pitchChannelCount && channelIndex < this.pitchChannelCount + this.noiseChannelCount);
    }

    public getChannelIsMod(channelIndex: number): boolean {
        return (channelIndex >= this.pitchChannelCount + this.noiseChannelCount);
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
        this.layeredInstruments = false;
        this.patternInstruments = false;

        this.title = "Unnamed";
        document.title = EditorConfig.versionDisplayName;

        if (andResetChannels) {
            this.pitchChannelCount = 3;
            this.noiseChannelCount = 1;
            this.modChannelCount = 0;
            for (let channelIndex: number = 0; channelIndex < this.getChannelCount(); channelIndex++) {
                const isNoiseChannel: boolean = channelIndex >= this.pitchChannelCount && channelIndex < this.pitchChannelCount + this.noiseChannelCount;
                const isModChannel: boolean = channelIndex >= this.pitchChannelCount + this.noiseChannelCount;
                if (this.channels.length <= channelIndex) {
                    this.channels[channelIndex] = new Channel();
                }
                const channel: Channel = this.channels[channelIndex];
                channel.octave = Math.max(3 - channelIndex, 0); // [3, 2, 1, 0]; Descending octaves with drums at zero in last channel.

                for (let pattern: number = 0; pattern < this.patternsPerChannel; pattern++) {
                    if (channel.patterns.length <= pattern) {
                        channel.patterns[pattern] = new Pattern();
                    } else {
                        channel.patterns[pattern].reset();
                    }
                }
                channel.patterns.length = this.patternsPerChannel;

                for (let instrument: number = 0; instrument < Config.instrumentCountMin; instrument++) {
                    if (channel.instruments.length <= instrument) {
                        channel.instruments[instrument] = new Instrument(isNoiseChannel, isModChannel);
                    }
                    channel.instruments[instrument].setTypeAndReset(isModChannel ? InstrumentType.mod : (isNoiseChannel ? InstrumentType.noise : InstrumentType.chip), isNoiseChannel, isModChannel);
                }
                channel.instruments.length = Config.instrumentCountMin;

                for (let bar: number = 0; bar < this.barCount; bar++) {
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

        // Length of the song name string
        buffer.push(SongTagCode.songTitle);
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
        buffer.push(SongTagCode.beatCount, base64IntToCharCode[this.beatsPerBar - 1]);
        buffer.push(SongTagCode.barCount, base64IntToCharCode[(this.barCount - 1) >> 6], base64IntToCharCode[(this.barCount - 1) & 0x3f]);
        buffer.push(SongTagCode.patternCount, base64IntToCharCode[(this.patternsPerChannel - 1) >> 6], base64IntToCharCode[(this.patternsPerChannel - 1) & 0x3f]);
        buffer.push(SongTagCode.rhythm, base64IntToCharCode[this.rhythm]);

        // Push limiter settings, but only if they aren't the default!
        buffer.push(SongTagCode.limiterSettings);
        if (this.compressionRatio != 1.0 || this.limitRatio != 1.0 || this.limitRise != 4000.0 || this.limitDecay != 4.0 || this.limitThreshold != 1.0 || this.compressionThreshold != 1.0 || this.masterGain != 1.0) {
            buffer.push(base64IntToCharCode[Math.round(this.compressionRatio < 1 ? this.compressionRatio * 10 : 10 + (this.compressionRatio - 1) * 60)]); // 0 ~ 1.15 uneven, mapped to 0 ~ 20
            buffer.push(base64IntToCharCode[Math.round(this.limitRatio < 1 ? this.limitRatio * 10 : 9 + this.limitRatio)]); // 0 ~ 10 uneven, mapped to 0 ~ 20
            buffer.push(base64IntToCharCode[this.limitDecay]); // directly 1 ~ 30
            buffer.push(base64IntToCharCode[Math.round((this.limitRise - 2000.0) / 250.0)]); // 2000 ~ 10000 by 250, mapped to 0 ~ 32
            buffer.push(base64IntToCharCode[Math.round(this.compressionThreshold * 20)]); // 0 ~ 1.1 by 0.05, mapped to 0 ~ 22
            buffer.push(base64IntToCharCode[Math.round(this.limitThreshold * 20)]); // 0 ~ 2 by 0.05, mapped to 0 ~ 40
            buffer.push(base64IntToCharCode[Math.round(this.masterGain * 50) >> 6], base64IntToCharCode[Math.round(this.masterGain * 50) & 0x3f]); // 0 ~ 5 by 0.02, mapped to 0 ~ 250
        }
        else {
            buffer.push(base64IntToCharCode[0x3f]); // Not using limiter
        }

        buffer.push(SongTagCode.channelNames);
        for (let channel: number = 0; channel < this.getChannelCount(); channel++) {
            // Length of the channel name string
            var encodedChannelName: string = encodeURIComponent(this.channels[channel].name);
            buffer.push(base64IntToCharCode[encodedChannelName.length >> 6], base64IntToCharCode[encodedChannelName.length & 0x3f]);

            // Actual encoded string follows
            for (let i: number = 0; i < encodedChannelName.length; i++) {
                buffer.push(encodedChannelName.charCodeAt(i));
            }
        }

        buffer.push(SongTagCode.instrumentCount, base64IntToCharCode[(<any>this.layeredInstruments << 1) | <any>this.patternInstruments]);
        if (this.layeredInstruments || this.patternInstruments) {
            for (let channelIndex: number = 0; channelIndex < this.getChannelCount(); channelIndex++) {
                buffer.push(base64IntToCharCode[this.channels[channelIndex].instruments.length - Config.instrumentCountMin]);
            }
        }

        buffer.push(SongTagCode.channelOctave);
        for (let channelIndex: number = 0; channelIndex < this.pitchChannelCount; channelIndex++) {
            buffer.push(base64IntToCharCode[this.channels[channelIndex].octave]);
        }

        for (let channelIndex: number = 0; channelIndex < this.getChannelCount(); channelIndex++) {
            for (let i: number = 0; i < this.channels[channelIndex].instruments.length; i++) {
                const instrument: Instrument = this.channels[channelIndex].instruments[i];
                buffer.push(SongTagCode.startInstrument, base64IntToCharCode[instrument.type]);
                buffer.push(SongTagCode.volume, base64IntToCharCode[(instrument.volume + Config.volumeRange / 2) >> 6], base64IntToCharCode[(instrument.volume + Config.volumeRange / 2) & 0x3f]);
                buffer.push(SongTagCode.preset, base64IntToCharCode[instrument.preset >> 6], base64IntToCharCode[instrument.preset & 63]);

                buffer.push(SongTagCode.eqFilter);
                buffer.push(base64IntToCharCode[+instrument.eqFilterType]);
                if (instrument.eqFilterType) {
                    buffer.push(base64IntToCharCode[instrument.eqFilterSimpleCut]);
                    buffer.push(base64IntToCharCode[instrument.eqFilterSimplePeak]);
                }
                else {
                    buffer.push(base64IntToCharCode[instrument.eqFilter.controlPointCount]);
                    for (let j: number = 0; j < instrument.eqFilter.controlPointCount; j++) {
                        const point: FilterControlPoint = instrument.eqFilter.controlPoints[j];
                        buffer.push(base64IntToCharCode[point.type], base64IntToCharCode[point.freq], base64IntToCharCode[point.gain]);
                    }

                    // Push subfilters as well. Skip Index 0, is a copy of the base filter.
                    let usingSubFilterBitfield: number = 0;
                    for (let j: number = 0; j < Config.filterMorphCount - 1; j++) {
                        usingSubFilterBitfield |= (+(instrument.eqSubFilters[j + 1] != null) << j);
                    }
                    // Put subfilter usage into 2 chars (12 bits)
                    buffer.push(base64IntToCharCode[usingSubFilterBitfield >> 6], base64IntToCharCode[usingSubFilterBitfield & 63]);
                    // Put subfilter info in for all used subfilters
                    for (let j: number = 0; j < Config.filterMorphCount - 1; j++) {
                        if (usingSubFilterBitfield & (1 << j)) {
                            buffer.push(base64IntToCharCode[instrument.eqSubFilters[j + 1]!.controlPointCount]);
                            for (let k: number = 0; k < instrument.eqSubFilters[j + 1]!.controlPointCount; k++) {
                                const point: FilterControlPoint = instrument.eqSubFilters[j + 1]!.controlPoints[k];
                                buffer.push(base64IntToCharCode[point.type], base64IntToCharCode[point.freq], base64IntToCharCode[point.gain]);
                            }
                        }
                    }
                }

                // The list of enabled effects is represented as a 12-bit bitfield using two six-bit characters.
                buffer.push(SongTagCode.effects, base64IntToCharCode[instrument.effects >> 6], base64IntToCharCode[instrument.effects & 63]);
                if (effectsIncludeNoteFilter(instrument.effects)) {
                    buffer.push(base64IntToCharCode[+instrument.noteFilterType]);
                    if (instrument.noteFilterType) {
                        buffer.push(base64IntToCharCode[instrument.noteFilterSimpleCut]);
                        buffer.push(base64IntToCharCode[instrument.noteFilterSimplePeak]);
                    }
                    else {
                        buffer.push(base64IntToCharCode[instrument.noteFilter.controlPointCount]);
                        for (let j: number = 0; j < instrument.noteFilter.controlPointCount; j++) {
                            const point: FilterControlPoint = instrument.noteFilter.controlPoints[j];
                            buffer.push(base64IntToCharCode[point.type], base64IntToCharCode[point.freq], base64IntToCharCode[point.gain]);
                        }

                        // Push subfilters as well. Skip Index 0, is a copy of the base filter.
                        let usingSubFilterBitfield: number = 0;
                        for (let j: number = 0; j < Config.filterMorphCount - 1; j++) {
                            usingSubFilterBitfield |= (+(instrument.noteSubFilters[j + 1] != null) << j);
                        }
                        // Put subfilter usage into 2 chars (12 bits)
                        buffer.push(base64IntToCharCode[usingSubFilterBitfield >> 6], base64IntToCharCode[usingSubFilterBitfield & 63]);
                        // Put subfilter info in for all used subfilters
                        for (let j: number = 0; j < Config.filterMorphCount - 1; j++) {
                            if (usingSubFilterBitfield & (1 << j)) {
                                buffer.push(base64IntToCharCode[instrument.noteSubFilters[j + 1]!.controlPointCount]);
                                for (let k: number = 0; k < instrument.noteSubFilters[j + 1]!.controlPointCount; k++) {
                                    const point: FilterControlPoint = instrument.noteSubFilters[j + 1]!.controlPoints[k];
                                    buffer.push(base64IntToCharCode[point.type], base64IntToCharCode[point.freq], base64IntToCharCode[point.gain]);
                                }
                            }
                        }
                    }
                }
                if (effectsIncludeTransition(instrument.effects)) {
                    buffer.push(base64IntToCharCode[instrument.transition]);
                }
                if (effectsIncludeChord(instrument.effects)) {
                    buffer.push(base64IntToCharCode[instrument.chord]);
                    // Custom arpeggio speed... only if the instrument arpeggiates.
                    if (instrument.chord == Config.chords.dictionary["arpeggio"].index) {
                        buffer.push(base64IntToCharCode[instrument.arpeggioSpeed]);
                        buffer.push(base64IntToCharCode[+instrument.fastTwoNoteArp]); // Two note arp setting piggybacks on this
                    }
                }
                if (effectsIncludePitchShift(instrument.effects)) {
                    buffer.push(base64IntToCharCode[instrument.pitchShift]);
                }
                if (effectsIncludeDetune(instrument.effects)) {
                    buffer.push(base64IntToCharCode[(instrument.detune - Config.detuneMin) >> 6], base64IntToCharCode[(instrument.detune - Config.detuneMin) & 0x3F]);
                }
                if (effectsIncludeVibrato(instrument.effects)) {
                    buffer.push(base64IntToCharCode[instrument.vibrato]);
                    // Custom vibrato settings
                    if (instrument.vibrato == Config.vibratos.length) {
                        buffer.push(base64IntToCharCode[Math.round(instrument.vibratoDepth * 25)]);
                        buffer.push(base64IntToCharCode[instrument.vibratoSpeed]);
                        buffer.push(base64IntToCharCode[instrument.vibratoDelay]);
                        buffer.push(base64IntToCharCode[instrument.vibratoType]);
                    }
                }
                if (effectsIncludeDistortion(instrument.effects)) {
                    buffer.push(base64IntToCharCode[instrument.distortion]);
                    // Aliasing is tied into distortion for now
                    buffer.push(base64IntToCharCode[+instrument.aliases]);
                }
                if (effectsIncludeBitcrusher(instrument.effects)) {
                    buffer.push(base64IntToCharCode[instrument.bitcrusherFreq], base64IntToCharCode[instrument.bitcrusherQuantization]);
                }
                if (effectsIncludePanning(instrument.effects)) {
                    buffer.push(base64IntToCharCode[instrument.pan >> 6], base64IntToCharCode[instrument.pan & 0x3f]);
                    buffer.push(base64IntToCharCode[instrument.panDelay]);
                }
                if (effectsIncludeChorus(instrument.effects)) {
                    buffer.push(base64IntToCharCode[instrument.chorus]);
                }
                if (effectsIncludeEcho(instrument.effects)) {
                    buffer.push(base64IntToCharCode[instrument.echoSustain], base64IntToCharCode[instrument.echoDelay]);
                }
                if (effectsIncludeReverb(instrument.effects)) {
                    buffer.push(base64IntToCharCode[instrument.reverb]);
                }

                if (instrument.type != InstrumentType.drumset) {
                    buffer.push(SongTagCode.fadeInOut, base64IntToCharCode[instrument.fadeIn], base64IntToCharCode[instrument.fadeOut]);
                    // Transition info follows transition song tag
                    buffer.push(base64IntToCharCode[+instrument.clicklessTransition]);
                }

                if (instrument.type == InstrumentType.harmonics || instrument.type == InstrumentType.pickedString) {
                    buffer.push(SongTagCode.harmonics);
                    const harmonicsBits: BitFieldWriter = new BitFieldWriter();
                    for (let i: number = 0; i < Config.harmonicsControlPoints; i++) {
                        harmonicsBits.write(Config.harmonicsControlPointBits, instrument.harmonicsWave.harmonics[i]);
                    }
                    harmonicsBits.encodeBase64(buffer);
                }

                if (instrument.type == InstrumentType.chip) {
                    buffer.push(SongTagCode.wave, base64IntToCharCode[instrument.chipWave]);
                    buffer.push(SongTagCode.unison, base64IntToCharCode[instrument.unison]);
                } else if (instrument.type == InstrumentType.fm) {
                    buffer.push(SongTagCode.algorithm, base64IntToCharCode[instrument.algorithm]);
                    buffer.push(SongTagCode.feedbackType, base64IntToCharCode[instrument.feedbackType]);
                    buffer.push(SongTagCode.feedbackAmplitude, base64IntToCharCode[instrument.feedbackAmplitude]);

                    buffer.push(SongTagCode.operatorFrequencies);
                    for (let o: number = 0; o < Config.operatorCount; o++) {
                        buffer.push(base64IntToCharCode[instrument.operators[o].frequency]);
                    }
                    buffer.push(SongTagCode.operatorAmplitudes);
                    for (let o: number = 0; o < Config.operatorCount; o++) {
                        buffer.push(base64IntToCharCode[instrument.operators[o].amplitude]);
                    }

                    buffer.push(SongTagCode.operatorWaves);
                    for (let o: number = 0; o < Config.operatorCount; o++) {
                        buffer.push(base64IntToCharCode[instrument.operators[o].waveform]);
                        // Push pulse width if that type is used
                        if (instrument.operators[o].waveform == 3) {
                            buffer.push(base64IntToCharCode[instrument.operators[o].pulseWidth]);
                        }
                    }
                } else if (instrument.type == InstrumentType.customChipWave) {
                    buffer.push(SongTagCode.wave, base64IntToCharCode[instrument.chipWave]);
                    buffer.push(SongTagCode.unison, base64IntToCharCode[instrument.unison]);
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
                    buffer.push(SongTagCode.drumsetEnvelopes);
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
                    buffer.push(SongTagCode.unison, base64IntToCharCode[instrument.unison]);
                } else if (instrument.type == InstrumentType.pwm) {
                    buffer.push(SongTagCode.pulseWidth, base64IntToCharCode[instrument.pulseWidth]);
                } else if (instrument.type == InstrumentType.pickedString) {
                    buffer.push(SongTagCode.unison, base64IntToCharCode[instrument.unison]);
                    buffer.push(SongTagCode.stringSustain, base64IntToCharCode[instrument.stringSustain]);
                } else if (instrument.type == InstrumentType.mod) {
                    // Handled down below. Could be moved, but meh.
                } else {
                    throw new Error("Unknown instrument type.");
                }

                buffer.push(SongTagCode.envelopes, base64IntToCharCode[instrument.envelopeCount]);
                for (let envelopeIndex: number = 0; envelopeIndex < instrument.envelopeCount; envelopeIndex++) {
                    buffer.push(base64IntToCharCode[instrument.envelopes[envelopeIndex].target]);
                    if (Config.instrumentAutomationTargets[instrument.envelopes[envelopeIndex].target].maxCount > 1) {
                        buffer.push(base64IntToCharCode[instrument.envelopes[envelopeIndex].index]);
                    }
                    buffer.push(base64IntToCharCode[instrument.envelopes[envelopeIndex].envelope]);
                }
            }
        }

        buffer.push(SongTagCode.bars);
        bits = new BitFieldWriter();
        let neededBits: number = 0;
        while ((1 << neededBits) < this.patternsPerChannel + 1) neededBits++;
        for (let channelIndex: number = 0; channelIndex < this.getChannelCount(); channelIndex++) for (let i: number = 0; i < this.barCount; i++) {
            bits.write(neededBits, this.channels[channelIndex].bars[i]);
        }
        bits.encodeBase64(buffer);

        buffer.push(SongTagCode.patterns);
        bits = new BitFieldWriter();
        const shapeBits: BitFieldWriter = new BitFieldWriter();
        const bitsPerNoteSize: number = Song.getNeededBits(Config.noteSizeMax);
        for (let channelIndex: number = 0; channelIndex < this.getChannelCount(); channelIndex++) {
            const channel: Channel = this.channels[channelIndex];
            const maxInstrumentsPerPattern: number = this.getMaxInstrumentsPerPattern(channelIndex);
            const isNoiseChannel: boolean = this.getChannelIsNoise(channelIndex);
            const isModChannel: boolean = this.getChannelIsMod(channelIndex);
            const neededInstrumentCountBits: number = Song.getNeededBits(maxInstrumentsPerPattern - Config.instrumentCountMin);
            const neededInstrumentIndexBits: number = Song.getNeededBits(channel.instruments.length - 1);

            // Some info about modulator settings immediately follows in mod channels.
            if (isModChannel) {
                const neededModInstrumentIndexBits: number = Song.getNeededBits(this.getMaxInstrumentsPerChannel() + 2);
                for (let instrumentIndex: number = 0; instrumentIndex < channel.instruments.length; instrumentIndex++) {

                    let instrument: Instrument = this.channels[channelIndex].instruments[instrumentIndex];

                    for (let mod: number = 0; mod < Config.modCount; mod++) {
                        const modChannel: number = instrument.modChannels[mod];
                        const modInstrument: number = instrument.modInstruments[mod];
                        const modSetting: number = instrument.modulators[mod];
                        const modFilter: number = instrument.modFilterTypes[mod];

                        // Still using legacy "mod status" format, but doing it manually as it's only used in the URL now.
                        // 0 - For pitch/noise
                        // 1 - (used to be For noise, not needed)
                        // 2 - For song
                        // 3 - None

                        let status: number = Config.modulators[modSetting].forSong ? 2 : 0;
                        if (modSetting == Config.modulators.dictionary["none"].index)
                            status = 3;

                        bits.write(2, status);

                        // Channel/Instrument is only used if the status isn't "song" or "none".
                        if (status == 0 || status == 1) {
                            bits.write(8, modChannel);
                            bits.write(neededModInstrumentIndexBits, modInstrument);
                        }

                        // Only used if setting isn't "none".
                        if (status != 3) {
                            bits.write(6, modSetting);
                        }

                        // Write mod filter info, only if this is a filter mod
                        if (Config.modulators[instrument.modulators[mod]].name == "eq filter" || Config.modulators[instrument.modulators[mod]].name == "note filter") {
                            bits.write(6, modFilter);
                        }
                    }
                }
            }
            const octaveOffset: number = (isNoiseChannel || isModChannel) ? 0 : channel.octave * Config.pitchesPerOctave;
            let lastPitch: number = (isNoiseChannel ? 4 : octaveOffset);
            const recentPitches: number[] = isModChannel ? [0, 1, 2, 3, 4, 5] : (isNoiseChannel ? [4, 6, 7, 2, 3, 8, 0, 10] : [0, 7, 12, 19, 24, -5, -12]);
            const recentShapes: string[] = [];
            for (let i: number = 0; i < recentPitches.length; i++) {
                recentPitches[i] += octaveOffset;
            }
            for (const pattern of channel.patterns) {
                if (this.patternInstruments) {
                    const instrumentCount: number = validateRange(Config.instrumentCountMin, maxInstrumentsPerPattern, pattern.instruments.length);
                    bits.write(neededInstrumentCountBits, instrumentCount - Config.instrumentCountMin);
                    for (let i: number = 0; i < instrumentCount; i++) {
                        bits.write(neededInstrumentIndexBits, pattern.instruments[i]);
                    }
                }

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
                            bits.write(2, 0); // rest
                            if (isModChannel) bits.write(1, 0); // positive offset, only needed for mod channels
                            bits.writePartDuration(note.start - curPart);
                        }

                        shapeBits.clear();

                        // Old format was:
                        // 0: 1 pitch, 10: 2 pitches, 110: 3 pitches, 111: 4 pitches
                        // New format is:
                        //      0: 1 pitch
                        // 1[XXX]: 3 bits of binary signifying 2+ pitches
                        if (note.pitches.length == 1) {
                            shapeBits.write(1, 0);
                        } else {
                            shapeBits.write(1, 1);
                            shapeBits.write(3, note.pitches.length - 2);
                        }

                        shapeBits.writePinCount(note.pins.length - 1);

                        if (!isModChannel) {
                            shapeBits.write(bitsPerNoteSize, note.pins[0].size); // volume
                        }
                        else {
                            shapeBits.write(9, note.pins[0].size); // Modulator value. 9 bits for now = 512 max mod value?
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
                                shapeBits.write(bitsPerNoteSize, pin.size);
                            } else {
                                shapeBits.write(9, pin.size);
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
                                bits.write(4, pitchIndex);
                                recentPitches.splice(pitchIndex, 1);
                            }
                            recentPitches.unshift(pitch);
                            if (recentPitches.length > 16) recentPitches.pop();

                            if (i == note.pitches.length - 1) {
                                lastPitch = note.pitches[0];
                            } else {
                                lastPitch = pitch;
                            }
                        }

                        if (note.start == 0) {
                            bits.write(1, note.continuesLastPattern ? 1 : 0);
                        }

                        curPart = note.end;
                    }

                    if (curPart < this.beatsPerBar * Config.partsPerBeat + (+isModChannel)) {
                        bits.write(2, 0); // rest
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

    private static _envelopeFromLegacyIndex(legacyIndex: number): Envelope {
        // I swapped the order of "custom"/"steady", now "none"/"note size".
        if (legacyIndex == 0) legacyIndex = 1; else if (legacyIndex == 1) legacyIndex = 0;
        return Config.envelopes[clamp(0, Config.envelopes.length, legacyIndex)];
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
        let fromBeepBox: boolean;
        let fromJummBox: boolean;

        // Detect variant here. If version doesn't match known variant, assume it is a vanilla string which does not report variant.
        if (variantTest == 0x6A) { //"j"
            fromBeepBox = false;
            fromJummBox = true;
            charIndex++;
        } else {
            fromBeepBox = true;
            fromJummBox = false;
        }

        const version: number = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
        if (fromBeepBox && (version == -1 || version > Song._latestBeepboxVersion || version < Song._oldestBeepboxVersion)) return;
        if (fromJummBox && (version == -1 || version > Song._latestJummBoxVersion || version < Song._oldestJummBoxVersion)) return;
        const beforeTwo: boolean = version < 2;
        const beforeThree: boolean = version < 3;
        const beforeFour: boolean = version < 4;
        const beforeFive: boolean = version < 5;
        const beforeSix: boolean = version < 6;
        const beforeSeven: boolean = version < 7;
        const beforeEight: boolean = version < 8;
        const beforeNine: boolean = version < 9;
        this.initToDefault((fromBeepBox && beforeNine) || (fromJummBox && beforeFive));
        const forceSimpleFilter: boolean = (fromBeepBox && beforeNine || fromJummBox && beforeFive);

        if (beforeThree && fromBeepBox) {
            // Originally, the only instrument transition was "instant" and the only drum wave was "retro".
            for (const channel of this.channels) {
                channel.instruments[0].transition = Config.transitions.dictionary["interrupt"].index;
                channel.instruments[0].effects |= 1 << EffectType.transition;
            }
            this.channels[3].instruments[0].chipNoise = 0;
        }

        let legacySettingsCache: LegacySettings[][] | null = null;
        if ((fromBeepBox && beforeNine) || (fromJummBox && beforeFive)) {
            // Unfortunately, old versions of BeepBox had a variety of different ways of saving
            // filter-and-envelope-related parameters in the URL, and none of them directly
            // correspond to the new way of saving these parameters. We can approximate the old
            // settings by collecting all the old settings for an instrument and passing them to
            // convertLegacySettings(), so I use this data structure to collect the settings
            // for each instrument if necessary.
            legacySettingsCache = [];
            for (let i: number = legacySettingsCache.length; i < this.getChannelCount(); i++) {
                legacySettingsCache[i] = [];
                for (let j: number = 0; j < Config.instrumentCountMin; j++) legacySettingsCache[i][j] = {};
            }
        }

        let legacyGlobalReverb: number = 0; // beforeNine reverb was song-global, record that reverb here and adapt it to instruments as needed.

        let instrumentChannelIterator: number = 0;
        let instrumentIndexIterator: number = -1;
        let command: number;
        let useSlowerArpSpeed: boolean = false;
        let useFastTwoNoteArp: boolean = false;
        while (charIndex < compressed.length) switch (command = compressed.charCodeAt(charIndex++)) {
            case SongTagCode.songTitle: {
                // Length of song name string
                var songNameLength = (base64CharCodeToInt[compressed.charCodeAt(charIndex++)] << 6) + base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                this.title = decodeURIComponent(compressed.substring(charIndex, charIndex + songNameLength));
                document.title = this.title + " - " + EditorConfig.versionDisplayName;

                charIndex += songNameLength;
            } break;
            case SongTagCode.channelCount: {
                this.pitchChannelCount = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                this.noiseChannelCount = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                if (fromBeepBox || beforeTwo) {
                    // No mod channel support before jummbox v2
                    this.modChannelCount = 0;
                } else {
                    this.modChannelCount = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                }
                this.pitchChannelCount = validateRange(Config.pitchChannelCountMin, Config.pitchChannelCountMax, this.pitchChannelCount);
                this.noiseChannelCount = validateRange(Config.noiseChannelCountMin, Config.noiseChannelCountMax, this.noiseChannelCount);
                this.modChannelCount = validateRange(Config.modChannelCountMin, Config.modChannelCountMax, this.modChannelCount);

                for (let channelIndex = this.channels.length; channelIndex < this.getChannelCount(); channelIndex++) {
                    this.channels[channelIndex] = new Channel();
                }
                this.channels.length = this.getChannelCount();
                if ((fromBeepBox && beforeNine) || (fromJummBox && beforeFive)) {
                    for (let i: number = legacySettingsCache!.length; i < this.getChannelCount(); i++) {
                        legacySettingsCache![i] = [];
                        for (let j: number = 0; j < Config.instrumentCountMin; j++) legacySettingsCache![i][j] = {};
                    }
                }
            } break;
            case SongTagCode.scale: {
                this.scale = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                // All the scales were jumbled around by Jummbox. Just convert to free.
                if (fromBeepBox) this.scale = 0;
            } break;
            case SongTagCode.key: {
                if (beforeSeven && fromBeepBox) {
                    this.key = clamp(0, Config.keys.length, 11 - base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                } else {
                    this.key = clamp(0, Config.keys.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                }
            } break;
            case SongTagCode.loopStart: {
                if (beforeFive && fromBeepBox) {
                    this.loopStart = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                } else {
                    this.loopStart = (base64CharCodeToInt[compressed.charCodeAt(charIndex++)] << 6) + base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                }
            } break;
            case SongTagCode.loopEnd: {
                if (beforeFive && fromBeepBox) {
                    this.loopLength = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                } else {
                    this.loopLength = (base64CharCodeToInt[compressed.charCodeAt(charIndex++)] << 6) + base64CharCodeToInt[compressed.charCodeAt(charIndex++)] + 1;
                }
            } break;
            case SongTagCode.tempo: {
                if (beforeFour && fromBeepBox) {
                    this.tempo = [95, 120, 151, 190][base64CharCodeToInt[compressed.charCodeAt(charIndex++)]];
                } else if (beforeSeven && fromBeepBox) {
                    this.tempo = [88, 95, 103, 111, 120, 130, 140, 151, 163, 176, 190, 206, 222, 240, 259][base64CharCodeToInt[compressed.charCodeAt(charIndex++)]];
                } else {
                    this.tempo = (base64CharCodeToInt[compressed.charCodeAt(charIndex++)] << 6) | (base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                }
                this.tempo = clamp(Config.tempoMin, Config.tempoMax + 1, this.tempo);
            } break;
            case SongTagCode.reverb: {
                if (beforeNine && fromBeepBox) {
                    legacyGlobalReverb = base64CharCodeToInt[compressed.charCodeAt(charIndex++)] * 12;
                    legacyGlobalReverb = clamp(0, Config.reverbRange, legacyGlobalReverb);
                } else if (beforeFive && fromJummBox) {
                    legacyGlobalReverb = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                    legacyGlobalReverb = clamp(0, Config.reverbRange, legacyGlobalReverb);
                } else {
                    // Do nothing, BeepBox v9+ do not support song-wide reverb - JummBox still does via modulator.
                }
            } break;
            case SongTagCode.beatCount: {
                if (beforeThree && fromBeepBox) {
                    this.beatsPerBar = [6, 7, 8, 9, 10][base64CharCodeToInt[compressed.charCodeAt(charIndex++)]];
                } else {
                    this.beatsPerBar = base64CharCodeToInt[compressed.charCodeAt(charIndex++)] + 1;
                }
                this.beatsPerBar = Math.max(Config.beatsPerBarMin, Math.min(Config.beatsPerBarMax, this.beatsPerBar));
            } break;
            case SongTagCode.barCount: {
                const barCount: number = (base64CharCodeToInt[compressed.charCodeAt(charIndex++)] << 6) + base64CharCodeToInt[compressed.charCodeAt(charIndex++)] + 1;
                this.barCount = validateRange(Config.barCountMin, Config.barCountMax, barCount);
                for (let channelIndex: number = 0; channelIndex < this.getChannelCount(); channelIndex++) {
                    for (let bar = this.channels[channelIndex].bars.length; bar < this.barCount; bar++) {
                        this.channels[channelIndex].bars[bar] = (bar < 4) ? 1 : 0;
                    }
                    this.channels[channelIndex].bars.length = this.barCount;
                }
            } break;
            case SongTagCode.patternCount: {
                let patternsPerChannel: number;
                if (beforeEight && fromBeepBox) {
                    patternsPerChannel = base64CharCodeToInt[compressed.charCodeAt(charIndex++)] + 1;
                } else {
                    patternsPerChannel = (base64CharCodeToInt[compressed.charCodeAt(charIndex++)] << 6) + base64CharCodeToInt[compressed.charCodeAt(charIndex++)] + 1;
                }
                this.patternsPerChannel = validateRange(1, Config.barCountMax, patternsPerChannel);
                const channelCount: number = this.getChannelCount();
                for (let channelIndex: number = 0; channelIndex < channelCount; channelIndex++) {
                    const patterns: Pattern[] = this.channels[channelIndex].patterns;
                    for (let pattern = patterns.length; pattern < this.patternsPerChannel; pattern++) {
                        patterns[pattern] = new Pattern();
                    }
                    patterns.length = this.patternsPerChannel;
                }
            } break;
            case SongTagCode.instrumentCount: {
                if ((beforeNine && fromBeepBox) || (beforeFive && fromJummBox)) {
                    const instrumentsPerChannel: number = validateRange(Config.instrumentCountMin, Config.patternInstrumentCountMax, base64CharCodeToInt[compressed.charCodeAt(charIndex++)] + Config.instrumentCountMin);
                    this.layeredInstruments = false;
                    this.patternInstruments = (instrumentsPerChannel > 1);

                    for (let channelIndex: number = 0; channelIndex < this.getChannelCount(); channelIndex++) {
                        const isNoiseChannel: boolean = channelIndex >= this.pitchChannelCount && channelIndex < this.pitchChannelCount + this.noiseChannelCount;
                        const isModChannel: boolean = channelIndex >= this.pitchChannelCount + this.noiseChannelCount;

                        for (let instrumentIndex: number = this.channels[channelIndex].instruments.length; instrumentIndex < instrumentsPerChannel; instrumentIndex++) {
                            this.channels[channelIndex].instruments[instrumentIndex] = new Instrument(isNoiseChannel, isModChannel);
                        }
                        this.channels[channelIndex].instruments.length = instrumentsPerChannel;
                        if (beforeSix && fromBeepBox) {
                            for (let instrumentIndex: number = 0; instrumentIndex < instrumentsPerChannel; instrumentIndex++) {
                                this.channels[channelIndex].instruments[instrumentIndex].setTypeAndReset(isNoiseChannel ? InstrumentType.noise : InstrumentType.chip, isNoiseChannel, isModChannel);
                            }
                        }

                        for (let j: number = legacySettingsCache![channelIndex].length; j < instrumentsPerChannel; j++) {
                            legacySettingsCache![channelIndex][j] = {};
                        }
                    }
                } else {
                    const instrumentsFlagBits: number = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                    this.layeredInstruments = (instrumentsFlagBits & (1 << 1)) != 0;
                    this.patternInstruments = (instrumentsFlagBits & (1 << 0)) != 0;
                    for (let channelIndex: number = 0; channelIndex < this.getChannelCount(); channelIndex++) {
                        let instrumentCount: number = 1;
                        if (this.layeredInstruments || this.patternInstruments) {
                            instrumentCount = validateRange(Config.instrumentCountMin, this.getMaxInstrumentsPerChannel(), base64CharCodeToInt[compressed.charCodeAt(charIndex++)] + Config.instrumentCountMin);
                        }
                        const channel: Channel = this.channels[channelIndex];
                        const isNoiseChannel: boolean = this.getChannelIsNoise(channelIndex);
                        const isModChannel: boolean = this.getChannelIsMod(channelIndex);
                        for (let i: number = channel.instruments.length; i < instrumentCount; i++) {
                            channel.instruments[i] = new Instrument(isNoiseChannel, isModChannel);
                        }
                        channel.instruments.length = instrumentCount;
                    }
                }
            } break;
            case SongTagCode.rhythm: {
                this.rhythm = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                // Port all arpeggio speeds over to match what they were, before arpeggio speed was decoupled from rhythm.
                if (fromJummBox && beforeThree || fromBeepBox) {
                    // These are all the rhythms that had 4 ticks/arpeggio instead of 3.
                    if (this.rhythm == Config.rhythms.dictionary["÷3 (triplets)"].index || this.rhythm == Config.rhythms.dictionary["÷6"].index) {
                        useSlowerArpSpeed = true;
                    }
                    // Use faster two note arp on these rhythms
                    if (this.rhythm >= Config.rhythms.dictionary["÷6"].index) {
                        useFastTwoNoteArp = true;
                    }
                }
            } break;
            case SongTagCode.channelOctave: {
                if (beforeThree && fromBeepBox) {
                    const channelIndex: number = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                    this.channels[channelIndex].octave = clamp(0, Config.pitchOctaves, base64CharCodeToInt[compressed.charCodeAt(charIndex++)] + 1);
                    if (channelIndex >= this.pitchChannelCount) this.channels[channelIndex].octave = 0;
                } else if ((beforeNine && fromBeepBox) || (beforeFive && fromJummBox)) {
                    for (let channelIndex: number = 0; channelIndex < this.getChannelCount(); channelIndex++) {
                        this.channels[channelIndex].octave = clamp(0, Config.pitchOctaves, base64CharCodeToInt[compressed.charCodeAt(charIndex++)] + 1);
                        if (channelIndex >= this.pitchChannelCount) this.channels[channelIndex].octave = 0;
                    }
                } else {
                    for (let channelIndex: number = 0; channelIndex < this.pitchChannelCount; channelIndex++) {
                        this.channels[channelIndex].octave = clamp(0, Config.pitchOctaves, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                    }
                }
            } break;
            case SongTagCode.startInstrument: {
                instrumentIndexIterator++;
                if (instrumentIndexIterator >= this.channels[instrumentChannelIterator].instruments.length) {
                    instrumentChannelIterator++;
                    instrumentIndexIterator = 0;
                }
                validateRange(0, this.channels.length - 1, instrumentChannelIterator);
                const instrument: Instrument = this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator];
                // JB before v5 had custom chip in the place where pickedString is now, and mod one sooner as well. New index is +1 for both.
                let instrumentType: number = validateRange(0, InstrumentType.length - 1, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                if (fromJummBox && beforeFive) {
                    if (instrumentType == InstrumentType.pickedString) {
                        instrumentType = InstrumentType.customChipWave;
                    }
                    else if (instrumentType == InstrumentType.customChipWave) {
                        instrumentType = InstrumentType.mod;
                    }
                }
                instrument.setTypeAndReset(instrumentType, instrumentChannelIterator >= this.pitchChannelCount && instrumentChannelIterator < this.pitchChannelCount + this.noiseChannelCount, instrumentChannelIterator >= this.pitchChannelCount + this.noiseChannelCount);

                // Anti-aliasing was added in BeepBox 3.0 (v6->v7) and JummBox 1.3 (v1->v2 roughly but some leakage possible)
                if (((beforeSeven && fromBeepBox) || (beforeTwo && fromJummBox)) && (instrumentType == InstrumentType.chip || instrumentType == InstrumentType.customChipWave || instrumentType == InstrumentType.pwm)) {
                    instrument.aliases = true;
                }
                if (useSlowerArpSpeed) {
                    instrument.arpeggioSpeed = 9; // x3/4 speed. This used to be tied to rhythm, but now it is decoupled to each instrument's arp speed slider. This flag gets set when importing older songs to keep things consistent.
                }
                if (useFastTwoNoteArp) {
                    instrument.fastTwoNoteArp = true;
                }

                if (beforeSeven && fromBeepBox) {
                    instrument.effects = 0;
                    // Chip/noise instruments had arpeggio and FM had custom interval but neither
                    // explicitly saved the chorus setting beforeSeven so enable it here.
                    if (instrument.chord != Config.chords.dictionary["simultaneous"].index) {
                        // Enable chord if it was used.
                        instrument.effects |= 1 << EffectType.chord;
                    }
                }
            } break;
            case SongTagCode.preset: {
                const presetValue: number = (base64CharCodeToInt[compressed.charCodeAt(charIndex++)] << 6) | (base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].preset = presetValue;
                // Picked string was inserted before custom chip in JB v5, so bump up preset index.
                if (fromJummBox && beforeFive) {
                    if (this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].preset == InstrumentType.pickedString) {
                        this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].preset = InstrumentType.customChipWave;
                    }
                }
            } break;
            case SongTagCode.wave: {
                if (beforeThree && fromBeepBox) {
                    const legacyWaves: number[] = [1, 2, 3, 4, 5, 6, 7, 8, 0];
                    const channelIndex: number = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                    const instrument: Instrument = this.channels[channelIndex].instruments[0];
                    instrument.chipWave = clamp(0, Config.chipWaves.length, legacyWaves[base64CharCodeToInt[compressed.charCodeAt(charIndex++)]] | 0);

                    // Version 2 didn't save any settings for settings for filters, or envelopes,
                    // just waves, so initialize them here I guess.
                    instrument.convertLegacySettings(legacySettingsCache![channelIndex][0], forceSimpleFilter);

                } else if (beforeSix && fromBeepBox) {
                    const legacyWaves: number[] = [1, 2, 3, 4, 5, 6, 7, 8, 0];
                    for (let channelIndex: number = 0; channelIndex < this.getChannelCount(); channelIndex++) {
                        for (const instrument of this.channels[channelIndex].instruments) {
                            if (channelIndex >= this.pitchChannelCount) {
                                instrument.chipNoise = clamp(0, Config.chipNoises.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                            } else {
                                instrument.chipWave = clamp(0, Config.chipWaves.length, legacyWaves[base64CharCodeToInt[compressed.charCodeAt(charIndex++)]] | 0);
                            }
                        }
                    }
                } else if (beforeSeven && fromBeepBox) {
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
            } break;
            case SongTagCode.eqFilter: {
                if ((beforeNine && fromBeepBox) || (beforeFive && fromJummBox)) {
                    if (beforeSeven && fromBeepBox) {
                        const legacyToCutoff: number[] = [10, 6, 3, 0, 8, 5, 2];
                        const legacyToEnvelope: string[] = ["none", "none", "none", "none", "decay 1", "decay 2", "decay 3"];

                        if (beforeThree && fromBeepBox) {
                            const channelIndex: number = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                            const instrument: Instrument = this.channels[channelIndex].instruments[0];
                            const legacySettings: LegacySettings = legacySettingsCache![channelIndex][0];
                            const legacyFilter: number = [1, 3, 4, 5][clamp(0, legacyToCutoff.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)])];
                            legacySettings.filterCutoff = legacyToCutoff[legacyFilter];
                            legacySettings.filterResonance = 0;
                            legacySettings.filterEnvelope = Config.envelopes.dictionary[legacyToEnvelope[legacyFilter]];
                            instrument.convertLegacySettings(legacySettings, forceSimpleFilter);
                        } else if (beforeSix && fromBeepBox) {
                            for (let channelIndex: number = 0; channelIndex < this.getChannelCount(); channelIndex++) {
                                for (let i: number = 0; i < this.channels[channelIndex].instruments.length; i++) {
                                    const instrument: Instrument = this.channels[channelIndex].instruments[i];
                                    const legacySettings: LegacySettings = legacySettingsCache![channelIndex][i];
                                    const legacyFilter: number = clamp(0, legacyToCutoff.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)] + 1);
                                    if (channelIndex < this.pitchChannelCount) {
                                        legacySettings.filterCutoff = legacyToCutoff[legacyFilter];
                                        legacySettings.filterResonance = 0;
                                        legacySettings.filterEnvelope = Config.envelopes.dictionary[legacyToEnvelope[legacyFilter]];
                                    } else {
                                        legacySettings.filterCutoff = 10;
                                        legacySettings.filterResonance = 0;
                                        legacySettings.filterEnvelope = Config.envelopes.dictionary["none"];
                                    }
                                    instrument.convertLegacySettings(legacySettings, forceSimpleFilter);
                                }
                            }
                        } else {
                            const legacyFilter: number = clamp(0, legacyToCutoff.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                            const instrument: Instrument = this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator];
                            const legacySettings: LegacySettings = legacySettingsCache![instrumentChannelIterator][instrumentIndexIterator];
                            legacySettings.filterCutoff = legacyToCutoff[legacyFilter];
                            legacySettings.filterResonance = 0;
                            instrument.convertLegacySettings(legacySettings, forceSimpleFilter);
                        }
                    } else {
                        const filterCutoffRange: number = 11;
                        const instrument: Instrument = this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator];
                        const legacySettings: LegacySettings = legacySettingsCache![instrumentChannelIterator][instrumentIndexIterator];
                        legacySettings.filterCutoff = clamp(0, filterCutoffRange, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                        instrument.convertLegacySettings(legacySettings, forceSimpleFilter);
                    }
                } else {
                    const instrument: Instrument = this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator];
                    let typeCheck: number = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];

                    if (fromBeepBox || typeCheck == 0) {
                        instrument.eqFilterType = false;
                        if (fromJummBox)
                            typeCheck = base64CharCodeToInt[compressed.charCodeAt(charIndex++)]; // Skip to next to get control point count
                        const originalControlPointCount: number = typeCheck;
                        instrument.eqFilter.controlPointCount = clamp(0, Config.filterMaxPoints + 1, originalControlPointCount);
                        for (let i: number = instrument.eqFilter.controlPoints.length; i < instrument.eqFilter.controlPointCount; i++) {
                            instrument.eqFilter.controlPoints[i] = new FilterControlPoint();
                        }
                        for (let i: number = 0; i < instrument.eqFilter.controlPointCount; i++) {
                            const point: FilterControlPoint = instrument.eqFilter.controlPoints[i];
                            point.type = clamp(0, FilterType.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                            point.freq = clamp(0, Config.filterFreqRange, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                            point.gain = clamp(0, Config.filterGainRange, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                        }
                        for (let i: number = instrument.eqFilter.controlPointCount; i < originalControlPointCount; i++) {
                            charIndex += 3;
                        }

                        // Get subfilters as well. Skip Index 0, is a copy of the base filter.
                        instrument.eqSubFilters[0] = instrument.eqFilter;
                        if (fromJummBox && !beforeFive) {
                            let usingSubFilterBitfield: number = (base64CharCodeToInt[compressed.charCodeAt(charIndex++)] << 6) | (base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                            for (let j: number = 0; j < Config.filterMorphCount - 1; j++) {
                                if (usingSubFilterBitfield & (1 << j)) {
                                    // Number of control points
                                    const originalSubfilterControlPointCount: number = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                                    if (instrument.eqSubFilters[j + 1] == null)
                                        instrument.eqSubFilters[j + 1] = new FilterSettings();
                                    instrument.eqSubFilters[j + 1]!.controlPointCount = clamp(0, Config.filterMaxPoints + 1, originalSubfilterControlPointCount);
                                    for (let i: number = instrument.eqSubFilters[j + 1]!.controlPoints.length; i < instrument.eqSubFilters[j + 1]!.controlPointCount; i++) {
                                        instrument.eqSubFilters[j + 1]!.controlPoints[i] = new FilterControlPoint();
                                    }
                                    for (let i: number = 0; i < instrument.eqSubFilters[j + 1]!.controlPointCount; i++) {
                                        const point: FilterControlPoint = instrument.eqSubFilters[j + 1]!.controlPoints[i];
                                        point.type = clamp(0, FilterType.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                                        point.freq = clamp(0, Config.filterFreqRange, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                                        point.gain = clamp(0, Config.filterGainRange, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                                    }
                                    for (let i: number = instrument.eqSubFilters[j + 1]!.controlPointCount; i < originalSubfilterControlPointCount; i++) {
                                        charIndex += 3;
                                    }
                                }
                            }
                        }
                    }
                    else {
                        instrument.eqFilterType = true;
                        instrument.eqFilterSimpleCut = clamp(0, Config.filterSimpleCutRange, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                        instrument.eqFilterSimplePeak = clamp(0, Config.filterSimplePeakRange, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                    }
                }
            } break;
            case SongTagCode.filterResonance: {
                if ((beforeNine && fromBeepBox) || (beforeFive && fromJummBox)) {
                    const filterResonanceRange: number = 8;
                    const instrument: Instrument = this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator];
                    const legacySettings: LegacySettings = legacySettingsCache![instrumentChannelIterator][instrumentIndexIterator];
                    legacySettings.filterResonance = clamp(0, filterResonanceRange, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                    instrument.convertLegacySettings(legacySettings, forceSimpleFilter);

                } else {
                    // Do nothing? This song tag code is deprecated for now.
                }
            } break;
            case SongTagCode.drumsetEnvelopes: {
                const instrument: Instrument = this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator];
                if ((beforeNine && fromBeepBox) || (beforeFive && fromJummBox)) {
                    if (instrument.type == InstrumentType.drumset) {
                        for (let i: number = 0; i < Config.drumCount; i++) {
                            instrument.drumsetEnvelopes[i] = Song._envelopeFromLegacyIndex(base64CharCodeToInt[compressed.charCodeAt(charIndex++)]).index;
                        }
                    } else {
                        // This used to be used for general filter envelopes.
                        // The presence of an envelope affects how convertLegacySettings
                        // decides the closest possible approximation, so update it.
                        const legacySettings: LegacySettings = legacySettingsCache![instrumentChannelIterator][instrumentIndexIterator];
                        legacySettings.filterEnvelope = Song._envelopeFromLegacyIndex(base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                        instrument.convertLegacySettings(legacySettings, forceSimpleFilter);
                    }
                } else {
                    // This tag is now only used for drumset filter envelopes.
                    for (let i: number = 0; i < Config.drumCount; i++) {
                        instrument.drumsetEnvelopes[i] = clamp(0, Config.envelopes.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                    }
                }
            } break;
            case SongTagCode.pulseWidth: {
                const instrument: Instrument = this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator];
                instrument.pulseWidth = clamp(0, Config.pulseWidthRange + (+(fromJummBox)), base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                if (fromBeepBox) {
                    // BeepBox formula
                    instrument.pulseWidth = Math.round(Math.pow(0.5, (7 - instrument.pulseWidth) * Config.pulseWidthStepPower) * Config.pulseWidthRange);

                }

                if ((beforeNine && fromBeepBox) || (beforeFive && fromJummBox)) {
                    const legacySettings: LegacySettings = legacySettingsCache![instrumentChannelIterator][instrumentIndexIterator];
                    legacySettings.pulseEnvelope = Song._envelopeFromLegacyIndex(base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                    instrument.convertLegacySettings(legacySettings, forceSimpleFilter);
                }
            } break;
            case SongTagCode.stringSustain: {
                const instrument: Instrument = this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator];
                instrument.stringSustain = clamp(0, Config.stringSustainRange, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
            } break;
            case SongTagCode.fadeInOut: {
                if ((beforeNine && fromBeepBox) || (beforeFive && fromJummBox)) {
                    // this tag was used for a combination of transition and fade in/out.
                    const legacySettings = [
                        { transition: "interrupt", fadeInSeconds: 0.0, fadeOutTicks: -1 },
                        { transition: "normal", fadeInSeconds: 0.0, fadeOutTicks: -3 },
                        { transition: "normal", fadeInSeconds: 0.025, fadeOutTicks: -3 },
                        { transition: "slide in pattern", fadeInSeconds: 0.025, fadeOutTicks: -3 },
                        { transition: "normal", fadeInSeconds: 0.04, fadeOutTicks: 6 },
                        { transition: "normal", fadeInSeconds: 0.0, fadeOutTicks: 48 },
                        { transition: "normal", fadeInSeconds: 0.0125, fadeOutTicks: 72 },
                        { transition: "normal", fadeInSeconds: 0.06, fadeOutTicks: 96 },
                    ];
                    if (beforeThree && fromBeepBox) {
                        const channelIndex: number = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                        const settings = legacySettings[clamp(0, legacySettings.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)])];
                        const instrument: Instrument = this.channels[channelIndex].instruments[0];
                        instrument.fadeIn = Synth.secondsToFadeInSetting(settings.fadeInSeconds);
                        instrument.fadeOut = Synth.ticksToFadeOutSetting(settings.fadeOutTicks);
                        instrument.transition = Config.transitions.dictionary[settings.transition].index;
                        if (instrument.transition != Config.transitions.dictionary["normal"].index) {
                            // Enable transition if it was used.
                            instrument.effects |= 1 << EffectType.transition;
                        }
                    } else if (beforeSix && fromBeepBox) {
                        for (let channelIndex: number = 0; channelIndex < this.getChannelCount(); channelIndex++) {
                            for (const instrument of this.channels[channelIndex].instruments) {
                                const settings = legacySettings[clamp(0, legacySettings.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)])];
                                instrument.fadeIn = Synth.secondsToFadeInSetting(settings.fadeInSeconds);
                                instrument.fadeOut = Synth.ticksToFadeOutSetting(settings.fadeOutTicks);
                                instrument.transition = Config.transitions.dictionary[settings.transition].index;
                                if (instrument.transition != Config.transitions.dictionary["normal"].index) {
                                    // Enable transition if it was used.
                                    instrument.effects |= 1 << EffectType.transition;
                                }
                            }
                        }
                    } else if (beforeFour || fromBeepBox) {
                        const settings = legacySettings[clamp(0, legacySettings.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)])];
                        const instrument: Instrument = this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator];
                        instrument.fadeIn = Synth.secondsToFadeInSetting(settings.fadeInSeconds);
                        instrument.fadeOut = Synth.ticksToFadeOutSetting(settings.fadeOutTicks);
                        instrument.transition = Config.transitions.dictionary[settings.transition].index;
                        if (instrument.transition != Config.transitions.dictionary["normal"].index) {
                            // Enable transition if it was used.
                            instrument.effects |= 1 << EffectType.transition;
                        }
                    } else {
                        const settings = legacySettings[clamp(0, legacySettings.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)])];
                        const instrument: Instrument = this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator];
                        instrument.fadeIn = Synth.secondsToFadeInSetting(settings.fadeInSeconds);
                        instrument.fadeOut = Synth.ticksToFadeOutSetting(settings.fadeOutTicks);
                        instrument.transition = Config.transitions.dictionary[settings.transition].index;

                        // Read tie-note 
                        if (base64CharCodeToInt[compressed.charCodeAt(charIndex++)] > 0) {
                            // Set legacy tie over flag, which is only used to port notes in patterns using this instrument as tying.
                            instrument.legacyTieOver = true;

                        }
                        instrument.clicklessTransition = base64CharCodeToInt[compressed.charCodeAt(charIndex++)] ? true : false;

                        if (instrument.transition != Config.transitions.dictionary["normal"].index || instrument.clicklessTransition) {
                            // Enable transition if it was used.
                            instrument.effects |= 1 << EffectType.transition;
                        }
                    }
                } else {
                    const instrument: Instrument = this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator];
                    instrument.fadeIn = clamp(0, Config.fadeInRange, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                    instrument.fadeOut = clamp(0, Config.fadeOutTicks.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                    if (fromJummBox)
                        instrument.clicklessTransition = base64CharCodeToInt[compressed.charCodeAt(charIndex++)] ? true : false;
                }
            } break;
            case SongTagCode.vibrato: {
                if ((beforeNine && fromBeepBox) || (beforeFive && fromJummBox)) {
                    if (beforeSeven && fromBeepBox) {
                        if (beforeThree && fromBeepBox) {
                            const legacyEffects: number[] = [0, 3, 2, 0];
                            const legacyEnvelopes: string[] = ["none", "none", "none", "tremolo2"];
                            const channelIndex: number = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                            const effect: number = clamp(0, legacyEffects.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                            const instrument: Instrument = this.channels[channelIndex].instruments[0];
                            const legacySettings: LegacySettings = legacySettingsCache![channelIndex][0];
                            instrument.vibrato = legacyEffects[effect];
                            if (legacySettings.filterEnvelope == undefined || legacySettings.filterEnvelope.type == EnvelopeType.none) {
                                // Imitate the legacy tremolo with a filter envelope.
                                legacySettings.filterEnvelope = Config.envelopes.dictionary[legacyEnvelopes[effect]];
                                instrument.convertLegacySettings(legacySettings, forceSimpleFilter);
                            }
                            if (instrument.vibrato != Config.vibratos.dictionary["none"].index) {
                                // Enable vibrato if it was used.
                                instrument.effects |= 1 << EffectType.vibrato;
                            }
                        } else if (beforeSix && fromBeepBox) {
                            const legacyEffects: number[] = [0, 1, 2, 3, 0, 0];
                            const legacyEnvelopes: string[] = ["none", "none", "none", "none", "tremolo5", "tremolo2"];
                            for (let channelIndex: number = 0; channelIndex < this.getChannelCount(); channelIndex++) {
                                for (let i: number = 0; i < this.channels[channelIndex].instruments.length; i++) {
                                    const effect: number = clamp(0, legacyEffects.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                                    const instrument: Instrument = this.channels[channelIndex].instruments[i];
                                    const legacySettings: LegacySettings = legacySettingsCache![channelIndex][i];
                                    instrument.vibrato = legacyEffects[effect];
                                    if (legacySettings.filterEnvelope == undefined || legacySettings.filterEnvelope.type == EnvelopeType.none) {
                                        // Imitate the legacy tremolo with a filter envelope.
                                        legacySettings.filterEnvelope = Config.envelopes.dictionary[legacyEnvelopes[effect]];
                                        instrument.convertLegacySettings(legacySettings, forceSimpleFilter);
                                    }
                                    if (instrument.vibrato != Config.vibratos.dictionary["none"].index) {
                                        // Enable vibrato if it was used.
                                        instrument.effects |= 1 << EffectType.vibrato;
                                    }
                                    if ((legacyGlobalReverb != 0 || (fromJummBox && beforeFive)) && !this.getChannelIsNoise(channelIndex)) {
                                        // Enable reverb if it was used globaly before. (Global reverb was added before the effects option so I need to pick somewhere else to initialize instrument reverb, and I picked the vibrato command.)
                                        instrument.effects |= 1 << EffectType.reverb;
                                        instrument.reverb = legacyGlobalReverb;
                                    }
                                }
                            }
                        } else {
                            const legacyEffects: number[] = [0, 1, 2, 3, 0, 0];
                            const legacyEnvelopes: string[] = ["none", "none", "none", "none", "tremolo5", "tremolo2"];
                            const effect: number = clamp(0, legacyEffects.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                            const instrument: Instrument = this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator];
                            const legacySettings: LegacySettings = legacySettingsCache![instrumentChannelIterator][instrumentIndexIterator];
                            instrument.vibrato = legacyEffects[effect];
                            if (legacySettings.filterEnvelope == undefined || legacySettings.filterEnvelope.type == EnvelopeType.none) {
                                // Imitate the legacy tremolo with a filter envelope.
                                legacySettings.filterEnvelope = Config.envelopes.dictionary[legacyEnvelopes[effect]];
                                instrument.convertLegacySettings(legacySettings, forceSimpleFilter);
                            }
                            if (instrument.vibrato != Config.vibratos.dictionary["none"].index) {
                                // Enable vibrato if it was used.
                                instrument.effects |= 1 << EffectType.vibrato;
                            }
                            if (legacyGlobalReverb != 0 || (fromJummBox && beforeFive)) {
                                // Enable reverb if it was used globaly before. (Global reverb was added before the effects option so I need to pick somewhere else to initialize instrument reverb, and I picked the vibrato command.)
                                instrument.effects |= 1 << EffectType.reverb;
                                instrument.reverb = legacyGlobalReverb;
                            }
                        }
                    } else {
                        const instrument: Instrument = this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator];
                        const vibrato: number = clamp(0, Config.vibratos.length + 1, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                        instrument.vibrato = vibrato;
                        if (instrument.vibrato != Config.vibratos.dictionary["none"].index) {
                            // Enable vibrato if it was used.
                            instrument.effects |= 1 << EffectType.vibrato;
                        }
                        // Custom vibrato
                        if (vibrato == Config.vibratos.length) {
                            instrument.vibratoDepth = clamp(0, Config.modulators.dictionary["vibrato depth"].maxRawVol + 1, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]) / 25;
                            instrument.vibratoSpeed = clamp(0, Config.modulators.dictionary["vibrato speed"].maxRawVol + 1, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                            instrument.vibratoDelay = clamp(0, Config.modulators.dictionary["vibrato delay"].maxRawVol + 1, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                            instrument.vibratoType = clamp(0, Config.vibratoTypes.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                            instrument.effects |= 1 << EffectType.vibrato;
                        }
                        // Enforce standard vibrato settings
                        else {
                            instrument.vibratoDepth = Config.vibratos[instrument.vibrato].amplitude;
                            instrument.vibratoSpeed = 10; // Normal speed
                            instrument.vibratoDelay = Config.vibratos[instrument.vibrato].delayTicks / 2;
                            instrument.vibratoType = Config.vibratos[instrument.vibrato].type;
                        }
                    }
                } else {
                    // Do nothing? This song tag code is deprecated for now.
                }
            } break;
            case SongTagCode.arpeggioSpeed: {
                // Deprecated, but supported for legacy purposes
                if (fromJummBox && beforeFive) {
                    const instrument: Instrument = this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator];
                    instrument.arpeggioSpeed = clamp(0, Config.modulators.dictionary["arp speed"].maxRawVol + 1, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                    instrument.fastTwoNoteArp = base64CharCodeToInt[compressed.charCodeAt(charIndex++)] ? true : false; // Two note arp setting piggybacks on this
                }
                else {
                    // Do nothing, deprecated for now
                }
            } break;
            case SongTagCode.unison: {
                if (beforeThree && fromBeepBox) {
                    const channelIndex: number = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                    this.channels[channelIndex].instruments[0].unison = clamp(0, Config.unisons.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                } else if (beforeSix && fromBeepBox) {
                    for (let channelIndex: number = 0; channelIndex < this.getChannelCount(); channelIndex++) {
                        for (const instrument of this.channels[channelIndex].instruments) {
                            const originalValue: number = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                            let unison: number = clamp(0, Config.unisons.length, originalValue);
                            if (originalValue == 8) {
                                // original "custom harmony" now maps to "hum" and "custom interval".
                                unison = 2;
                                instrument.chord = 3;
                            }
                            instrument.unison = unison;
                        }
                    }
                } else if (beforeSeven && fromBeepBox) {
                    const originalValue: number = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                    let unison: number = clamp(0, Config.unisons.length, originalValue);
                    if (originalValue == 8) {
                        // original "custom harmony" now maps to "hum" and "custom interval".
                        unison = 2;
                        this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].chord = 3;
                    }
                    this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].unison = unison;
                } else {
                    this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].unison = clamp(0, Config.unisons.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                }
            } break;
            case SongTagCode.chord: {
                if ((beforeNine && fromBeepBox) || (beforeFive && fromJummBox)) {
                    const instrument: Instrument = this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator];
                    instrument.chord = clamp(0, Config.chords.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                    if (instrument.chord != Config.chords.dictionary["simultaneous"].index) {
                        // Enable chord if it was used.
                        instrument.effects |= 1 << EffectType.chord;
                    }
                } else {
                    // Do nothing? This song tag code is deprecated for now.
                }
            } break;
            case SongTagCode.effects: {
                const instrument: Instrument = this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator];
                if ((beforeNine && fromBeepBox) || (beforeFive && fromJummBox)) {
                    instrument.effects = (base64CharCodeToInt[compressed.charCodeAt(charIndex++)] & ((1 << EffectType.length) - 1));
                    if (legacyGlobalReverb == 0 && !(fromJummBox && beforeFive)) {
                        // Disable reverb if legacy song reverb was zero.
                        instrument.effects &= ~(1 << EffectType.reverb);
                    } else if (effectsIncludeReverb(instrument.effects)) {
                        instrument.reverb = legacyGlobalReverb;
                    }
                    if (instrument.pan != Config.panCenter) {
                        // Enable panning if panning slider isn't centered.
                        instrument.effects |= 1 << EffectType.panning;
                    }
                    if (instrument.vibrato != Config.vibratos.dictionary["none"].index) {
                        // Enable vibrato if it was used.
                        instrument.effects |= 1 << EffectType.vibrato;
                    }
                    if (instrument.detune != Config.detuneCenter) {
                        // Enable detune if it was used.
                        instrument.effects |= 1 << EffectType.detune;
                    }
                    instrument.effects &= ~(1 << EffectType.distortion);

                    // convertLegacySettings may need to force-enable note filter, call
                    // it again here to make sure that this override takes precedence.
                    const legacySettings: LegacySettings = legacySettingsCache![instrumentChannelIterator][instrumentIndexIterator];
                    instrument.convertLegacySettings(legacySettings, forceSimpleFilter);
                } else {
                    // BeepBox currently uses two base64 characters at 6 bits each for a bitfield representing all the enabled effects.
                    if (EffectType.length > 12) throw new Error();
                    instrument.effects = (base64CharCodeToInt[compressed.charCodeAt(charIndex++)] << 6) | (base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);

                    if (effectsIncludeNoteFilter(instrument.effects)) {
                        let typeCheck: number = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                        if (fromBeepBox || typeCheck == 0) {
                            instrument.noteFilterType = false;
                            if (fromJummBox)
                                typeCheck = base64CharCodeToInt[compressed.charCodeAt(charIndex++)]; // Skip to next index in jummbox to get actual count
                            instrument.noteFilter.controlPointCount = clamp(0, Config.filterMaxPoints + 1, typeCheck);
                            for (let i: number = instrument.noteFilter.controlPoints.length; i < instrument.noteFilter.controlPointCount; i++) {
                                instrument.noteFilter.controlPoints[i] = new FilterControlPoint();
                            }
                            for (let i: number = 0; i < instrument.noteFilter.controlPointCount; i++) {
                                const point: FilterControlPoint = instrument.noteFilter.controlPoints[i];
                                point.type = clamp(0, FilterType.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                                point.freq = clamp(0, Config.filterFreqRange, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                                point.gain = clamp(0, Config.filterGainRange, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                            }
                            for (let i: number = instrument.noteFilter.controlPointCount; i < typeCheck; i++) {
                                charIndex += 3;
                            }

                            // Get subfilters as well. Skip Index 0, is a copy of the base filter.
                            instrument.noteSubFilters[0] = instrument.noteFilter;
                            if (fromJummBox && !beforeFive) {
                                let usingSubFilterBitfield: number = (base64CharCodeToInt[compressed.charCodeAt(charIndex++)] << 6) | (base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                                for (let j: number = 0; j < Config.filterMorphCount - 1; j++) {
                                    if (usingSubFilterBitfield & (1 << j)) {
                                        // Number of control points
                                        const originalSubfilterControlPointCount: number = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                                        if (instrument.noteSubFilters[j + 1] == null)
                                            instrument.noteSubFilters[j + 1] = new FilterSettings();
                                        instrument.noteSubFilters[j + 1]!.controlPointCount = clamp(0, Config.filterMaxPoints + 1, originalSubfilterControlPointCount);
                                        for (let i: number = instrument.noteSubFilters[j + 1]!.controlPoints.length; i < instrument.noteSubFilters[j + 1]!.controlPointCount; i++) {
                                            instrument.noteSubFilters[j + 1]!.controlPoints[i] = new FilterControlPoint();
                                        }
                                        for (let i: number = 0; i < instrument.noteSubFilters[j + 1]!.controlPointCount; i++) {
                                            const point: FilterControlPoint = instrument.noteSubFilters[j + 1]!.controlPoints[i];
                                            point.type = clamp(0, FilterType.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                                            point.freq = clamp(0, Config.filterFreqRange, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                                            point.gain = clamp(0, Config.filterGainRange, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                                        }
                                        for (let i: number = instrument.noteSubFilters[j + 1]!.controlPointCount; i < originalSubfilterControlPointCount; i++) {
                                            charIndex += 3;
                                        }
                                    }
                                }
                            }
                        } else {
                            instrument.noteFilterType = true;
                            instrument.noteFilter.reset();
                            instrument.noteFilterSimpleCut = clamp(0, Config.filterSimpleCutRange, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                            instrument.noteFilterSimplePeak = clamp(0, Config.filterSimplePeakRange, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);

                        }
                    }
                    if (effectsIncludeTransition(instrument.effects)) {
                        instrument.transition = clamp(0, Config.transitions.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                    }
                    if (effectsIncludeChord(instrument.effects)) {
                        instrument.chord = clamp(0, Config.chords.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                        // Custom arpeggio speed... only in JB, and only if the instrument arpeggiates.
                        if (instrument.chord == Config.chords.dictionary["arpeggio"].index && fromJummBox) {
                            instrument.arpeggioSpeed = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                            instrument.fastTwoNoteArp = (base64CharCodeToInt[compressed.charCodeAt(charIndex++)]) ? true : false;
                        }
                    }
                    if (effectsIncludePitchShift(instrument.effects)) {
                        instrument.pitchShift = clamp(0, Config.pitchShiftRange, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                    }
                    if (effectsIncludeDetune(instrument.effects)) {
                        if (fromBeepBox) {
                            // Convert from BeepBox's formula
                            instrument.detune = clamp(Config.detuneMin, Config.detuneMax + 1, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                            instrument.detune = Math.round((instrument.detune - 9) * (Math.abs(instrument.detune - 9) + 1) / 2 + Config.detuneCenter);
                        } else {
                            instrument.detune = clamp(Config.detuneMin, Config.detuneMax + 1, (base64CharCodeToInt[compressed.charCodeAt(charIndex++)] << 6) + base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                        }
                    }
                    if (effectsIncludeVibrato(instrument.effects)) {
                        instrument.vibrato = clamp(0, Config.vibratos.length + 1, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);

                        // Custom vibrato
                        if (instrument.vibrato == Config.vibratos.length && fromJummBox) {
                            instrument.vibratoDepth = clamp(0, Config.modulators.dictionary["vibrato depth"].maxRawVol + 1, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]) / 25;
                            instrument.vibratoSpeed = clamp(0, Config.modulators.dictionary["vibrato speed"].maxRawVol + 1, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                            instrument.vibratoDelay = clamp(0, Config.modulators.dictionary["vibrato delay"].maxRawVol + 1, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                            instrument.vibratoType = clamp(0, Config.vibratoTypes.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                        }
                        // Enforce standard vibrato settings
                        else {
                            instrument.vibratoDepth = Config.vibratos[instrument.vibrato].amplitude;
                            instrument.vibratoSpeed = 10; // Normal speed
                            instrument.vibratoDelay = Config.vibratos[instrument.vibrato].delayTicks / 2;
                            instrument.vibratoType = Config.vibratos[instrument.vibrato].type;
                        }
                    }
                    if (effectsIncludeDistortion(instrument.effects)) {
                        instrument.distortion = clamp(0, Config.distortionRange, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                        if (fromJummBox && !beforeFive)
                            instrument.aliases = base64CharCodeToInt[compressed.charCodeAt(charIndex++)] ? true : false;
                    }
                    if (effectsIncludeBitcrusher(instrument.effects)) {
                        instrument.bitcrusherFreq = clamp(0, Config.bitcrusherFreqRange, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                        instrument.bitcrusherQuantization = clamp(0, Config.bitcrusherQuantizationRange, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                    }
                    if (effectsIncludePanning(instrument.effects)) {
                        if (fromBeepBox) {
                            // Beepbox has a panMax of 8 (9 total positions), Jummbox has a panMax of 100 (101 total positions)
                            instrument.pan = clamp(0, Config.panMax + 1, Math.round(base64CharCodeToInt[compressed.charCodeAt(charIndex++)] * ((Config.panMax) / 8.0)));
                        }
                        else {
                            instrument.pan = clamp(0, Config.panMax + 1, (base64CharCodeToInt[compressed.charCodeAt(charIndex++)] << 6) + base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                        }

                        // Now, pan delay follows on new versions of jummbox.
                        if (fromJummBox && !beforeTwo)
                            instrument.panDelay = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                    }
                    if (effectsIncludeChorus(instrument.effects)) {
                        if (fromBeepBox) {
                            // BeepBox has 4 chorus values vs. JB's 8
                            instrument.chorus = clamp(0, (Config.chorusRange / 2) + 1, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]) * 2;
                        }
                        else {
                            instrument.chorus = clamp(0, Config.chorusRange, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                        }
                    }
                    if (effectsIncludeEcho(instrument.effects)) {
                        instrument.echoSustain = clamp(0, Config.echoSustainRange, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                        instrument.echoDelay = clamp(0, Config.echoDelayRange, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                    }
                    if (effectsIncludeReverb(instrument.effects)) {
                        if (fromBeepBox) {
                            instrument.reverb = clamp(0, Config.reverbRange, Math.round(base64CharCodeToInt[compressed.charCodeAt(charIndex++)] * Config.reverbRange / 3.0));
                        } else {
                            instrument.reverb = clamp(0, Config.reverbRange, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                        }
                    }
                }
                // Clamp the range.
                instrument.effects &= (1 << EffectType.length) - 1;
            } break;
            case SongTagCode.volume: {
                if (beforeThree && fromBeepBox) {
                    const channelIndex: number = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                    const instrument: Instrument = this.channels[channelIndex].instruments[0];
                    instrument.volume = Math.round(clamp(-Config.volumeRange / 2, 1, -base64CharCodeToInt[compressed.charCodeAt(charIndex++)] * 5.0));
                } else if (beforeSix && fromBeepBox) {
                    for (let channelIndex: number = 0; channelIndex < this.getChannelCount(); channelIndex++) {
                        for (const instrument of this.channels[channelIndex].instruments) {
                            instrument.volume = Math.round(clamp(-Config.volumeRange / 2, 1, -base64CharCodeToInt[compressed.charCodeAt(charIndex++)] * 5.0));
                        }
                    }
                } else if (beforeSeven && fromBeepBox) {
                    const instrument: Instrument = this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator];
                    instrument.volume = Math.round(clamp(-Config.volumeRange / 2, 1, -base64CharCodeToInt[compressed.charCodeAt(charIndex++)] * 5.0));
                } else if (fromBeepBox) {
                    // Beepbox v9's volume range is 0-7 (0 is max, 7 is mute)
                    const instrument: Instrument = this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator];
                    instrument.volume = Math.round(clamp(-Config.volumeRange / 2, 1, -base64CharCodeToInt[compressed.charCodeAt(charIndex++)] * 25.0 / 7.0));
                } else {
                    const instrument: Instrument = this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator];
                    // Volume is stored in two bytes in jummbox just in case range ever exceeds one byte, e.g. through later waffling on the subject.
                    instrument.volume = Math.round(clamp(-Config.volumeRange / 2, Config.volumeRange / 2 + 1, ((base64CharCodeToInt[compressed.charCodeAt(charIndex++)] << 6) | (base64CharCodeToInt[compressed.charCodeAt(charIndex++)])) - Config.volumeRange / 2));
                }
            } break;
            case SongTagCode.pan: {
                if (beforeNine && fromBeepBox) {
                    // Beepbox has a panMax of 8 (9 total positions), Jummbox has a panMax of 100 (101 total positions)
                    const instrument: Instrument = this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator];
                    instrument.pan = clamp(0, Config.panMax + 1, base64CharCodeToInt[compressed.charCodeAt(charIndex++)] * ((Config.panMax) / 8.0));
                } else if (beforeFive && fromJummBox) {
                    const instrument: Instrument = this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator];
                    instrument.pan = clamp(0, Config.panMax + 1, (base64CharCodeToInt[compressed.charCodeAt(charIndex++)] << 6) + base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                    // Pan delay follows on v3 + v4
                    if (fromJummBox && !beforeThree) {
                        instrument.panDelay = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                    }
                } else {
                    // Do nothing? This song tag code is deprecated for now.
                }
            } break;
            case SongTagCode.detune: {
                const instrument: Instrument = this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator];

                if (fromJummBox && beforeFive) {
                    // Before jummbox v5, detune was -50 to 50. Now it is 0 to 400
                    instrument.detune = clamp(Config.detuneMin, Config.detuneMax + 1, ((base64CharCodeToInt[compressed.charCodeAt(charIndex++)] << 6) + base64CharCodeToInt[compressed.charCodeAt(charIndex++)]) * 4);
                    instrument.effects |= 1 << EffectType.detune;
                } else {
                    // Now in v5, tag code is deprecated and handled thru detune effects.
                }
            } break;
            case SongTagCode.customChipWave: {
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

            } break;
            case SongTagCode.limiterSettings: {
                let nextValue: number = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];

                // Check if limiter settings are used... if not, restore to default
                if (nextValue == 0x3f) {
                    this.restoreLimiterDefaults();
                }
                else {
                    // Limiter is used, grab values
                    this.compressionRatio = (nextValue < 10 ? nextValue / 10 : (1 + (nextValue - 10) / 60));
                    nextValue = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                    this.limitRatio = (nextValue < 10 ? nextValue / 10 : (nextValue - 9));
                    this.limitDecay = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                    this.limitRise = (base64CharCodeToInt[compressed.charCodeAt(charIndex++)] * 250.0) + 2000.0;
                    this.compressionThreshold = base64CharCodeToInt[compressed.charCodeAt(charIndex++)] / 20.0;
                    this.limitThreshold = base64CharCodeToInt[compressed.charCodeAt(charIndex++)] / 20.0;
                    this.masterGain = ((base64CharCodeToInt[compressed.charCodeAt(charIndex++)] << 6) + base64CharCodeToInt[compressed.charCodeAt(charIndex++)]) / 50.0;
                }
            } break;
            case SongTagCode.channelNames: {
                for (let channel: number = 0; channel < this.getChannelCount(); channel++) {
                    // Length of channel name string. Due to some crazy Unicode characters this needs to be 2 bytes...
                    var channelNameLength;
                    if (beforeFour)
                        channelNameLength = base64CharCodeToInt[compressed.charCodeAt(charIndex++)]
                    else
                        channelNameLength = ((base64CharCodeToInt[compressed.charCodeAt(charIndex++)] << 6) + base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                    this.channels[channel].name = decodeURIComponent(compressed.substring(charIndex, charIndex + channelNameLength));

                    charIndex += channelNameLength;
                }
            } break;
            case SongTagCode.algorithm: {
                const instrument: Instrument = this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator];
                instrument.algorithm = clamp(0, Config.algorithms.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                if ((beforeNine && fromBeepBox) || (beforeFive && fromJummBox)) {
                    // The algorithm determines the carrier count, which affects how legacy settings are imported.
                    const legacySettings: LegacySettings = legacySettingsCache![instrumentChannelIterator][instrumentIndexIterator];
                    instrument.convertLegacySettings(legacySettings, forceSimpleFilter);
                }
            } break;
            case SongTagCode.feedbackType: {
                this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].feedbackType = clamp(0, Config.feedbacks.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
            } break;
            case SongTagCode.feedbackAmplitude: {
                this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].feedbackAmplitude = clamp(0, Config.operatorAmplitudeMax + 1, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
            } break;
            case SongTagCode.feedbackEnvelope: {
                if ((beforeNine && fromBeepBox) || (beforeFive && fromJummBox)) {
                    const instrument: Instrument = this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator];
                    const legacySettings: LegacySettings = legacySettingsCache![instrumentChannelIterator][instrumentIndexIterator];
                    legacySettings.feedbackEnvelope = Song._envelopeFromLegacyIndex(base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                    instrument.convertLegacySettings(legacySettings, forceSimpleFilter);
                } else {
                    // Do nothing? This song tag code is deprecated for now.
                }
            } break;
            case SongTagCode.operatorFrequencies: {
                for (let o: number = 0; o < Config.operatorCount; o++) {
                    this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].operators[o].frequency = clamp(0, Config.operatorFrequencies.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                }
            } break;
            case SongTagCode.operatorAmplitudes: {
                for (let o: number = 0; o < Config.operatorCount; o++) {
                    this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].operators[o].amplitude = clamp(0, Config.operatorAmplitudeMax + 1, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                }
            } break;
            case SongTagCode.envelopes: {
                const instrument: Instrument = this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator];
                if ((beforeNine && fromBeepBox) || (beforeFive && fromJummBox)) {
                    const legacySettings: LegacySettings = legacySettingsCache![instrumentChannelIterator][instrumentIndexIterator];
                    legacySettings.operatorEnvelopes = [];
                    for (let o: number = 0; o < Config.operatorCount; o++) {
                        legacySettings.operatorEnvelopes[o] = Song._envelopeFromLegacyIndex(base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                    }
                    instrument.convertLegacySettings(legacySettings, forceSimpleFilter);
                } else {
                    const envelopeCount: number = clamp(0, Config.maxEnvelopeCount + 1, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                    for (let i: number = 0; i < envelopeCount; i++) {
                        const target: number = clamp(0, Config.instrumentAutomationTargets.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                        let index: number = 0;
                        const maxCount: number = Config.instrumentAutomationTargets[target].maxCount;
                        if (maxCount > 1) {
                            index = clamp(0, maxCount, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                        }
                        const envelope: number = clamp(0, Config.envelopes.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                        instrument.addEnvelope(target, index, envelope);
                    }
                }
            } break;
            case SongTagCode.operatorWaves: {
                const instrument: Instrument = this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator];
                for (let o: number = 0; o < Config.operatorCount; o++) {
                    instrument.operators[o].waveform = clamp(0, Config.operatorWaves.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                    // Pulse width follows, if it is a pulse width operator wave
                    if (instrument.operators[o].waveform == 3) {
                        instrument.operators[o].pulseWidth = clamp(0, Config.pwmOperatorWaves.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                    }
                }
            } break;
            case SongTagCode.spectrum: {
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
            } break;
            case SongTagCode.harmonics: {
                const instrument: Instrument = this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator];
                const byteCount: number = Math.ceil(Config.harmonicsControlPoints * Config.harmonicsControlPointBits / 6)
                const bits: BitFieldReader = new BitFieldReader(compressed, charIndex, charIndex + byteCount);
                for (let i: number = 0; i < Config.harmonicsControlPoints; i++) {
                    instrument.harmonicsWave.harmonics[i] = bits.read(Config.harmonicsControlPointBits);
                }
                instrument.harmonicsWave.markCustomWaveDirty();
                charIndex += byteCount;
            } break;
            case SongTagCode.aliases: {
                if (fromJummBox && beforeFive) {
                    const instrument: Instrument = this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator];
                    instrument.aliases = (base64CharCodeToInt[compressed.charCodeAt(charIndex++)]) ? true : false;
                    if (instrument.aliases) {
                        instrument.distortion = 0;
                        instrument.effects |= 1 << EffectType.distortion;
                    }
                } else {
                    // Do nothing, deprecated
                }
            }
                break;
            case SongTagCode.bars: {
                let subStringLength: number;
                if (beforeThree && fromBeepBox) {
                    const channelIndex: number = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                    const barCount: number = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                    subStringLength = Math.ceil(barCount * 0.5);
                    const bits: BitFieldReader = new BitFieldReader(compressed, charIndex, charIndex + subStringLength);
                    for (let i: number = 0; i < barCount; i++) {
                        this.channels[channelIndex].bars[i] = bits.read(3) + 1;
                    }
                } else if (beforeFive && fromBeepBox) {
                    let neededBits: number = 0;
                    while ((1 << neededBits) < this.patternsPerChannel) neededBits++;
                    subStringLength = Math.ceil(this.getChannelCount() * this.barCount * neededBits / 6);
                    const bits: BitFieldReader = new BitFieldReader(compressed, charIndex, charIndex + subStringLength);
                    for (let channelIndex: number = 0; channelIndex < this.getChannelCount(); channelIndex++) {
                        for (let i: number = 0; i < this.barCount; i++) {
                            this.channels[channelIndex].bars[i] = bits.read(neededBits) + 1;
                        }
                    }
                } else {
                    let neededBits: number = 0;
                    while ((1 << neededBits) < this.patternsPerChannel + 1) neededBits++;
                    subStringLength = Math.ceil(this.getChannelCount() * this.barCount * neededBits / 6);
                    const bits: BitFieldReader = new BitFieldReader(compressed, charIndex, charIndex + subStringLength);
                    for (let channelIndex: number = 0; channelIndex < this.getChannelCount(); channelIndex++) {
                        for (let i: number = 0; i < this.barCount; i++) {
                            this.channels[channelIndex].bars[i] = bits.read(neededBits);
                        }
                    }
                }
                charIndex += subStringLength;
            } break;
            case SongTagCode.patterns: {
                let bitStringLength: number = 0;
                let channelIndex: number;
                let largerChords: boolean = !((beforeFour && fromJummBox) || fromBeepBox);
                let recentPitchBitLength: number = (largerChords ? 4 : 3);
                let recentPitchLength: number = (largerChords ? 16 : 8);
                if (beforeThree && fromBeepBox) {
                    channelIndex = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];

                    // The old format used the next character to represent the number of patterns in the channel, which is usually eight, the default. 
                    charIndex++; //let patternCount: number = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];

                    bitStringLength = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                    bitStringLength = bitStringLength << 6;
                    bitStringLength += base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                } else {
                    channelIndex = 0;
                    let bitStringLengthLength: number = validateRange(1, 4, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                    while (bitStringLengthLength > 0) {
                        bitStringLength = bitStringLength << 6;
                        bitStringLength += base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                        bitStringLengthLength--;
                    }
                }

                const bits: BitFieldReader = new BitFieldReader(compressed, charIndex, charIndex + bitStringLength);
                charIndex += bitStringLength;

                const bitsPerNoteSize: number = Song.getNeededBits(Config.noteSizeMax);
                let songReverbChannel: number = -1;
                let songReverbInstrument: number = -1;
                let songReverbIndex: number = -1;

                while (true) {
                    const channel: Channel = this.channels[channelIndex];
                    const isNoiseChannel: boolean = this.getChannelIsNoise(channelIndex);
                    const isModChannel: boolean = this.getChannelIsMod(channelIndex);

                    const maxInstrumentsPerPattern: number = this.getMaxInstrumentsPerPattern(channelIndex);
                    const neededInstrumentCountBits: number = Song.getNeededBits(maxInstrumentsPerPattern - Config.instrumentCountMin);
                    
                    const neededInstrumentIndexBits: number = Song.getNeededBits(channel.instruments.length - 1);

                    // Some info about modulator settings immediately follows in mod channels.
                    if (isModChannel) {

                        // 2 more indices for 'all' and 'active'
                        const neededModInstrumentIndexBits: number = (beforeFive) ? neededInstrumentIndexBits : Song.getNeededBits(this.getMaxInstrumentsPerChannel() + 2);

                        for (let instrumentIndex: number = 0; instrumentIndex < channel.instruments.length; instrumentIndex++) {

                            let instrument: Instrument = channel.instruments[instrumentIndex];

                            for (let mod: number = 0; mod < Config.modCount; mod++) {
                                // Still using legacy "mod status" format, but doing it manually as it's only used in the URL now.
                                // 0 - For pitch/noise
                                // 1 - (used to be For noise, not needed)
                                // 2 - For song
                                // 3 - None
                                let status: number = bits.read(2);

                                switch (status) {
                                    case 0: // Pitch
                                        instrument.modChannels[mod] = clamp(0, this.pitchChannelCount + this.noiseChannelCount + 1, bits.read(8));
                                        instrument.modInstruments[mod] = clamp(0, this.channels[instrument.modChannels[mod]].instruments.length + 2, bits.read(neededModInstrumentIndexBits));
                                        break;
                                    case 1: // Noise
                                        // Getting a status of 1 means this is legacy mod info. Need to add pitch channel count, as it used to just store noise channel index and not overall channel index
                                        instrument.modChannels[mod] = this.pitchChannelCount + clamp(0, this.noiseChannelCount + 1, bits.read(8));
                                        instrument.modInstruments[mod] = clamp(0, this.channels[instrument.modChannels[mod]].instruments.length + 2, bits.read(neededInstrumentIndexBits));
                                        break;
                                    case 2: // For song
                                        instrument.modChannels[mod] = -1;
                                        break;
                                    case 3: // None
                                        instrument.modChannels[mod] = -2;
                                        break;
                                }

                                // Mod setting is only used if the status isn't "none".
                                if (status != 3) {
                                    instrument.modulators[mod] = bits.read(6);
                                }

                                if (!beforeFive && (Config.modulators[instrument.modulators[mod]].name == "eq filter" || Config.modulators[instrument.modulators[mod]].name == "note filter")) {
                                    instrument.modFilterTypes[mod] = bits.read(6);
                                }

                                if (beforeFive && instrument.modChannels[mod] >= 0) {
                                    let forNoteFilter: boolean = effectsIncludeNoteFilter(this.channels[instrument.modChannels[mod]].instruments[instrument.modInstruments[mod]].effects);

                                    // For legacy filter cut/peak, need to denote since scaling must be applied
                                    if (instrument.modulators[mod] == 7) {
                                        // Legacy filter cut index
                                        // Check if there is no filter dot on prospective filter. If so, add a low pass at max possible freq.

                                        if (forNoteFilter) {
                                            instrument.modulators[mod] = Config.modulators.dictionary["note filt cut"].index;
                                        }
                                        else {
                                            instrument.modulators[mod] = Config.modulators.dictionary["eq filt cut"].index;
                                        }

                                        instrument.modFilterTypes[mod] = 1; // Dot 1 X

                                    }
                                    else if (instrument.modulators[mod] == 8) {
                                        // Legacy filter peak index
                                        if (forNoteFilter) {
                                            instrument.modulators[mod] = Config.modulators.dictionary["note filt peak"].index;
                                        }
                                        else {
                                            instrument.modulators[mod] = Config.modulators.dictionary["eq filt peak"].index;
                                        }

                                        instrument.modFilterTypes[mod] = 2; // Dot 1 Y
                                    }
                                }
                                else if (beforeFive) {
                                    // Check for song reverb mod, which must be handled differently now that it is a multiplier
                                    if (instrument.modulators[mod] == Config.modulators.dictionary["song reverb"].index) {
                                        songReverbChannel = channelIndex;
                                        songReverbInstrument = instrumentIndex;
                                        songReverbIndex = mod;
                                    }
                                }

                                // Based on setting, enable some effects for the modulated instrument. This isn't always set, say if the instrument's pan was right in the center.
                                // Only used on import of old songs, because sometimes an invalid effect can be set in a mod in the new version that is actually unused. In that case,
                                // keeping the mod invalid is better since it preserves the state.
                                if (beforeFive && Config.modulators[instrument.modulators[mod]].associatedEffect != EffectType.length) {
                                    this.channels[instrument.modChannels[mod]].instruments[instrument.modInstruments[mod]].effects |= 1 << Config.modulators[instrument.modulators[mod]].associatedEffect;
                                }
                            }
                        }
                    }

                    // Scalar applied to detune mods since its granularity was upped. Could be repurposed later if any other granularity changes occur.
                    const detuneScaleNotes: number[][] = [];
                    for (let j: number = 0; j < channel.instruments.length; j++) {
                        detuneScaleNotes[j] = [];
                        for (let i: number = 0; i < Config.modCount; i++) {
                            detuneScaleNotes[j][Config.modCount - 1 - i] = 1 + 3 * +(beforeFive && fromJummBox && isModChannel && (channel.instruments[j].modulators[i] == Config.modulators.dictionary["detune"].index));
                        }
                    }
                    const octaveOffset: number = (isNoiseChannel || isModChannel) ? 0 : channel.octave * 12;
                    let lastPitch: number = ((isNoiseChannel || isModChannel) ? 4 : octaveOffset);
                    const recentPitches: number[] = isModChannel ? [0, 1, 2, 3, 4, 5] : (isNoiseChannel ? [4, 6, 7, 2, 3, 8, 0, 10] : [0, 7, 12, 19, 24, -5, -12]);
                    const recentShapes: any[] = [];
                    for (let i: number = 0; i < recentPitches.length; i++) {
                        recentPitches[i] += octaveOffset;
                    }
                    for (let i: number = 0; i < this.patternsPerChannel; i++) {
                        const newPattern: Pattern = channel.patterns[i];

                        if ((beforeNine && fromBeepBox) || (beforeFive && fromJummBox)) {
                            newPattern.instruments[0] = validateRange(0, channel.instruments.length - 1, bits.read(neededInstrumentIndexBits));
                            newPattern.instruments.length = 1;
                        } else {
                            if (this.patternInstruments) {
                                const instrumentCount: number = validateRange(Config.instrumentCountMin, maxInstrumentsPerPattern, bits.read(neededInstrumentCountBits) + Config.instrumentCountMin);
                                for (let j: number = 0; j < instrumentCount; j++) {
                                    newPattern.instruments[j] = validateRange(0, channel.instruments.length - 1 + +(isModChannel) * 2, bits.read(neededInstrumentIndexBits));
                                }
                                newPattern.instruments.length = instrumentCount;
                            } else {
                                newPattern.instruments[0] = 0;
                                newPattern.instruments.length = Config.instrumentCountMin;
                            }
                        }

                        if (!(fromBeepBox && beforeThree) && bits.read(1) == 0) {
                            newPattern.notes.length = 0;
                            continue;
                        }

                        let curPart: number = 0;
                        const newNotes: Note[] = newPattern.notes;
                        let noteCount: number = 0;
                        // Due to arbitrary note positioning, mod channels don't end the count until curPart actually exceeds the max
                        while (curPart < this.beatsPerBar * Config.partsPerBeat + (+isModChannel)) {

                            const useOldShape: boolean = bits.read(1) == 1;
                            let newNote: boolean = false;
                            let shapeIndex: number = 0;
                            if (useOldShape) {
                                shapeIndex = validateRange(0, recentShapes.length - 1, bits.readLongTail(0, 0));
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
                                    const restLength: number = (beforeSeven && fromBeepBox)
                                        ? bits.readLegacyPartDuration() * Config.partsPerBeat / Config.rhythms[this.rhythm].stepsPerBeat
                                        : bits.readPartDuration();
                                    curPart += restLength;

                                }
                            } else {
                                let shape: any;
                                if (useOldShape) {
                                    shape = recentShapes[shapeIndex];
                                    recentShapes.splice(shapeIndex, 1);
                                } else {
                                    shape = {};

                                    if (!largerChords) {
                                        // Old format: X 1's followed by a 0 => X+1 pitches, up to 4
                                        shape.pitchCount = 1;
                                        while (shape.pitchCount < 4 && bits.read(1) == 1) shape.pitchCount++;
                                    }
                                    else {
                                        // New format is:
                                        //      0: 1 pitch
                                        // 1[XXX]: 3 bits of binary signifying 2+ pitches
                                        if (bits.read(1) == 1) {
                                            shape.pitchCount = bits.read(3) + 2;
                                        }
                                        else {
                                            shape.pitchCount = 1;
                                        }
                                    }

                                    shape.pinCount = bits.readPinCount();
                                    if (fromBeepBox) {
                                        shape.initialSize = bits.read(2) * 2;
                                    } else if (!isModChannel) {
                                        shape.initialSize = bits.read(bitsPerNoteSize);
                                    } else {
                                        shape.initialSize = bits.read(9);
                                    }

                                    shape.pins = [];
                                    shape.length = 0;
                                    shape.bendCount = 0;
                                    for (let j: number = 0; j < shape.pinCount; j++) {
                                        let pinObj: any = {};
                                        pinObj.pitchBend = bits.read(1) == 1;
                                        if (pinObj.pitchBend) shape.bendCount++;
                                        shape.length += (beforeSeven && fromBeepBox)
                                            ? bits.readLegacyPartDuration() * Config.partsPerBeat / Config.rhythms[this.rhythm].stepsPerBeat
                                            : bits.readPartDuration();
                                        pinObj.time = shape.length;
                                        if (fromBeepBox) {
                                            pinObj.size = bits.read(2) * 2;
                                        } else if (!isModChannel) {
                                            pinObj.size = bits.read(bitsPerNoteSize);
                                        }
                                        else {
                                            pinObj.size = bits.read(9);
                                        }
                                        shape.pins.push(pinObj);
                                    }
                                }
                                recentShapes.unshift(shape);
                                if (recentShapes.length > 10) recentShapes.pop(); // TODO: Use Deque?

                                let note: Note;
                                if (newNotes.length <= noteCount) {
                                    note = new Note(0, curPart, curPart + shape.length, shape.initialSize);
                                    newNotes[noteCount++] = note;
                                } else {
                                    note = newNotes[noteCount++];
                                    note.start = curPart;
                                    note.end = curPart + shape.length;
                                    note.pins[0].size = shape.initialSize;
                                }

                                let pitch: number;
                                let pitchCount: number = 0;
                                const pitchBends: number[] = []; // TODO: allocate this array only once! keep separate length and iterator index. Use Deque?
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
                                        const pitchIndex: number = validateRange(0, recentPitches.length - 1, bits.read(recentPitchBitLength));
                                        pitch = recentPitches[pitchIndex];
                                        recentPitches.splice(pitchIndex, 1);
                                    }

                                    recentPitches.unshift(pitch);
                                    if (recentPitches.length > recentPitchLength) recentPitches.pop();

                                    if (j < shape.pitchCount) {
                                        note.pitches[pitchCount++] = pitch;
                                    } else {
                                        pitchBends.push(pitch);
                                    }

                                    if (j == shape.pitchCount - 1) {
                                        lastPitch = note.pitches[0];
                                    } else {
                                        lastPitch = pitch;
                                    }
                                }
                                note.pitches.length = pitchCount;
                                pitchBends.unshift(note.pitches[0]); // TODO: Use Deque?
                                if (isModChannel) {
                                    note.pins[0].size *= detuneScaleNotes[newPattern.instruments[0]][note.pitches[0]];
                                }
                                let pinCount: number = 1;
                                for (const pinObj of shape.pins) {
                                    if (pinObj.pitchBend) pitchBends.shift();

                                    const interval: number = pitchBends[0] - note.pitches[0];
                                    if (note.pins.length <= pinCount) {
                                        if (isModChannel) {
                                            note.pins[pinCount++] = makeNotePin(interval, pinObj.time, pinObj.size * detuneScaleNotes[newPattern.instruments[0]][note.pitches[0]]);
                                        } else {
                                            note.pins[pinCount++] = makeNotePin(interval, pinObj.time, pinObj.size);
                                        }
                                    } else {
                                        const pin: NotePin = note.pins[pinCount++];
                                        pin.interval = interval;
                                        pin.time = pinObj.time;
                                        if (isModChannel) {
                                            pin.size = pinObj.size * detuneScaleNotes[newPattern.instruments[0]][note.pitches[0]];
                                        } else {
                                            pin.size = pinObj.size;
                                        }
                                    }
                                }
                                note.pins.length = pinCount;

                                if (note.start == 0) {
                                    if (!((beforeNine && fromBeepBox) || (beforeFive && fromJummBox))) {
                                        note.continuesLastPattern = (bits.read(1) == 1);
                                    } else {
                                        if (beforeFour || fromBeepBox) {
                                            note.continuesLastPattern = false;
                                        } else {
                                            note.continuesLastPattern = channel.instruments[newPattern.instruments[0]].legacyTieOver;
                                        }
                                    }
                                }

                                curPart = validateRange(0, this.beatsPerBar * Config.partsPerBeat, note.end);
                            }
                        }
                        newNotes.length = noteCount;
                    }

                    if (beforeThree && fromBeepBox) {
                        break;
                    } else {
                        channelIndex++;
                        if (channelIndex >= this.getChannelCount()) break;
                    }
                } // while (true)

                // Correction for old JB songs that had song reverb mods. Change all instruments using reverb to max reverb
                if (fromJummBox && beforeFive && songReverbIndex >= 0) {
                    for (let channelIndex: number = 0; channelIndex < this.channels.length; channelIndex++) {
                        for (let instrumentIndex: number = 0; instrumentIndex < this.channels[channelIndex].instruments.length; instrumentIndex++) {
                            const instrument: Instrument = this.channels[channelIndex].instruments[instrumentIndex];
                            if (effectsIncludeReverb(instrument.effects)) {
                                instrument.reverb = Config.reverbRange - 1;
                            }
                            // Set song reverb via mod to the old setting at song start.
                            if (songReverbChannel == channelIndex && songReverbInstrument == instrumentIndex) {
                                const patternIndex: number = this.channels[channelIndex].bars[0];
                                if (patternIndex > 0) {
                                    // Doesn't work if 1st pattern isn't using the right ins for song reverb...
                                    // Add note to start of pattern
                                    const pattern: Pattern = this.channels[channelIndex].patterns[patternIndex-1];
                                    let lowestPart: number = 6;
                                    for (const note of pattern.notes) {
                                        if (note.pitches[0] == Config.modCount - 1 - songReverbIndex) {
                                            lowestPart = Math.min(lowestPart, note.start);
                                        }
                                    }

                                    if (lowestPart > 0) {
                                        pattern.notes.push(new Note(Config.modCount - 1 - songReverbIndex, 0, lowestPart, legacyGlobalReverb));
                                    }
                                }
                                else {
                                    // Add pattern
                                    if (this.channels[channelIndex].patterns.length < Config.barCountMax) {
                                        const pattern: Pattern = new Pattern();
                                        this.channels[channelIndex].patterns.push(pattern);
                                        this.channels[channelIndex].bars[0] = this.channels[channelIndex].patterns.length;
                                        if (this.channels[channelIndex].patterns.length > this.patternsPerChannel) {
                                            for (let chn: number = 0; chn < this.channels.length; chn++) {
                                                if (this.channels[chn].patterns.length <= this.patternsPerChannel) {
                                                    this.channels[chn].patterns.push(new Pattern());
                                                }
                                            }
                                            this.patternsPerChannel++;
                                        }
                                        pattern.instruments.length = 1;
                                        pattern.instruments[0] = songReverbInstrument;
                                        pattern.notes.length = 0;
                                        pattern.notes.push(new Note(Config.modCount - 1 - songReverbIndex, 0, 6, legacyGlobalReverb));
                                    }
                                }
                            }
                        }
                    }
                }
            } break;
            default: {
                throw new Error("Unrecognized song tag code " + String.fromCharCode(command) + " at index " + (charIndex - 1));
            } break;
        }
    }

    public toJsonObject(enableIntro: boolean = true, loopCount: number = 1, enableOutro: boolean = true): Object {
        const channelArray: Object[] = [];
        for (let channelIndex: number = 0; channelIndex < this.getChannelCount(); channelIndex++) {
            const channel: Channel = this.channels[channelIndex];
            const instrumentArray: Object[] = [];
            const isNoiseChannel: boolean = this.getChannelIsNoise(channelIndex);
            const isModChannel: boolean = this.getChannelIsMod(channelIndex);
            for (const instrument of channel.instruments) {
                instrumentArray.push(instrument.toJsonObject());
            }

            const patternArray: Object[] = [];
            for (const pattern of channel.patterns) {
                const noteArray: Object[] = [];
                for (const note of pattern.notes) {
                    // Only one ins per pattern is enforced in mod channels.
                    let instrument: Instrument = channel.instruments[pattern.instruments[0]];
                    let mod: number = Config.modCount - note.pitches[0] - 1;
                    let volumeCap: number = this.getVolumeCapForSetting(isModChannel, instrument.modulators[mod], instrument.modFilterTypes[mod]);
                    const pointArray: Object[] = [];
                    for (const pin of note.pins) {
                        let useVol: number = isModChannel ? Math.round(pin.size) : Math.round(pin.size * 100 / volumeCap);
                        pointArray.push({
                            "tick": (pin.time + note.start) * Config.rhythms[this.rhythm].stepsPerBeat / Config.partsPerBeat,
                            "pitchBend": pin.interval,
                            "volume": useVol,
                            "forMod": isModChannel,
                        });
                    }

                    const noteObject: any = {
                        "pitches": note.pitches,
                        "points": pointArray,
                    };
                    if (note.start == 0) {
                        noteObject["continuesLastPattern"] = note.continuesLastPattern;
                    }
                    noteArray.push(noteObject);
                }

                const patternObject: any = { "notes": noteArray };
                if (this.patternInstruments) {
                    patternObject["instruments"] = pattern.instruments.map(i => i + 1);
                }

                patternArray.push(patternObject);
            }

            const sequenceArray: number[] = [];
            if (enableIntro) for (let i: number = 0; i < this.loopStart; i++) {
                sequenceArray.push(channel.bars[i]);
            }
            for (let l: number = 0; l < loopCount; l++) for (let i: number = this.loopStart; i < this.loopStart + this.loopLength; i++) {
                sequenceArray.push(channel.bars[i]);
            }
            if (enableOutro) for (let i: number = this.loopStart + this.loopLength; i < this.barCount; i++) {
                sequenceArray.push(channel.bars[i]);
            }

            const channelObject: any = {
                "type": isModChannel ? "mod" : (isNoiseChannel ? "drum" : "pitch"),
                "name": channel.name,
                "instruments": instrumentArray,
                "patterns": patternArray,
                "sequence": sequenceArray,
            };
            if (!isNoiseChannel) {
                // For compatibility with old versions the octave is offset by one.
                channelObject["octaveScrollBar"] = channel.octave - 1;
            }
            channelArray.push(channelObject);
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
            "masterGain": this.masterGain,
            "compressionThreshold": this.compressionThreshold,
            "limitThreshold": this.limitThreshold,
            "limitDecay": this.limitDecay,
            "limitRise": this.limitRise,
            "limitRatio": this.limitRatio,
            "compressionRatio": this.compressionRatio,
            //"outroBars": this.barCount - this.loopStart - this.loopLength; // derive this from bar arrays?
            //"patternCount": this.patternsPerChannel, // derive this from pattern arrays?
            "layeredInstruments": this.layeredInstruments,
            "patternInstruments": this.patternInstruments,
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
            const oldScaleNames: Dictionary<string> = {
                "romani :)": "dbl harmonic :)",
                "romani :(": "dbl harmonic :(",
                "enigma": "strange",
            };
            const scaleName: string = (oldScaleNames[jsonObject["scale"]] != undefined) ? oldScaleNames[jsonObject["scale"]] : jsonObject["scale"];
            const scale: number = Config.scales.findIndex(scale => scale.name == scaleName);
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

        let legacyGlobalReverb: number = 0; // In older songs, reverb was song-global, record that here and pass it to Instrument.fromJsonObject() for context.
        if (jsonObject["reverb"] != undefined) {
            legacyGlobalReverb = clamp(0, 32, jsonObject["reverb"] | 0);
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

        // Read limiter settings. Ranges and defaults are based on slider settings

        if (jsonObject["masterGain"] != undefined) {
            this.masterGain = Math.max(0.0, Math.min(5.0, jsonObject["masterGain"] || 0));
        } else {
            this.masterGain = 1.0;
        }

        if (jsonObject["limitThreshold"] != undefined) {
            this.limitThreshold = Math.max(0.0, Math.min(2.0, jsonObject["limitThreshold"] || 0));
        }
        else {
            this.limitThreshold = 1.0;
        }

        if (jsonObject["compressionThreshold"] != undefined) {
            this.compressionThreshold = Math.max(0.0, Math.min(1.1, jsonObject["compressionThreshold"] || 0));
        }
        else {
            this.compressionThreshold = 1.0;
        }

        if (jsonObject["limitRise"] != undefined) {
            this.limitRise = Math.max(2000.0, Math.min(10000.0, jsonObject["limitRise"] || 0));
        }
        else {
            this.limitRise = 4000.0;
        }

        if (jsonObject["limitDecay"] != undefined) {
            this.limitDecay = Math.max(1.0, Math.min(30.0, jsonObject["limitDecay"] || 0));
        }
        else {
            this.limitDecay = 4.0;
        }

        if (jsonObject["limitRatio"] != undefined) {
            this.limitRatio = Math.max(0.0, Math.min(11.0, jsonObject["limitRatio"] || 0));
        }
        else {
            this.limitRatio = 1.0;
        }

        if (jsonObject["compressionRatio"] != undefined) {
            this.compressionRatio = Math.max(0.0, Math.min(1.168, jsonObject["compressionRatio"] || 0));
        }
        else {
            this.compressionRatio = 1.0;
        }

        let maxInstruments: number = 1;
        let maxPatterns: number = 1;
        let maxBars: number = 1;
        if (jsonObject["channels"] != undefined) {
            for (const channelObject of jsonObject["channels"]) {
                if (channelObject["instruments"]) maxInstruments = Math.max(maxInstruments, channelObject["instruments"].length | 0);
                if (channelObject["patterns"]) maxPatterns = Math.max(maxPatterns, channelObject["patterns"].length | 0);
                if (channelObject["sequence"]) maxBars = Math.max(maxBars, channelObject["sequence"].length | 0);
            }
        }

        if (jsonObject["layeredInstruments"] != undefined) {
            this.layeredInstruments = !!jsonObject["layeredInstruments"];
        } else {
            this.layeredInstruments = false;
        }
        if (jsonObject["patternInstruments"] != undefined) {
            this.patternInstruments = !!jsonObject["patternInstruments"];
        } else {
            this.patternInstruments = (maxInstruments > 1);
        }
        this.patternsPerChannel = Math.min(maxPatterns, Config.barCountMax);
        this.barCount = Math.min(maxBars, Config.barCountMax);

        if (jsonObject["introBars"] != undefined) {
            this.loopStart = clamp(0, this.barCount, jsonObject["introBars"] | 0);
        }
        if (jsonObject["loopBars"] != undefined) {
            this.loopLength = clamp(1, this.barCount - this.loopStart + 1, jsonObject["loopBars"] | 0);
        }

        const newPitchChannels: Channel[] = [];
        const newNoiseChannels: Channel[] = [];
        const newModChannels: Channel[] = [];
        if (jsonObject["channels"] != undefined) {
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
                    channel.octave = clamp(0, Config.pitchOctaves, (channelObject["octaveScrollBar"] | 0) + 1);
                    if (isNoiseChannel) channel.octave = 0;
                }

                if (channelObject["name"] != undefined) {
                    channel.name = channelObject["name"];
                }
                else {
                    channel.name = "";
                }

                if (Array.isArray(channelObject["instruments"])) {
                    const instrumentObjects: any[] = channelObject["instruments"];
                    for (let i: number = 0; i < instrumentObjects.length; i++) {
                        if (i >= this.getMaxInstrumentsPerChannel()) break;
                        const instrument: Instrument = new Instrument(isNoiseChannel, isModChannel);
                        channel.instruments[i] = instrument;
                        instrument.fromJsonObject(instrumentObjects[i], isNoiseChannel, isModChannel, false, false, legacyGlobalReverb);
                    }

                }

                for (let i: number = 0; i < this.patternsPerChannel; i++) {
                    const pattern: Pattern = new Pattern();
                    channel.patterns[i] = pattern;

                    let patternObject: any = undefined;
                    if (channelObject["patterns"]) patternObject = channelObject["patterns"][i];
                    if (patternObject == undefined) continue;

                    if (this.patternInstruments) {
                        if (Array.isArray(patternObject["instruments"])) {
                            const instruments: any[] = patternObject["instruments"];
                            const instrumentCount: number = clamp(Config.instrumentCountMin, this.getMaxInstrumentsPerPatternForChannel(channel) + 1, instruments.length);
                            for (let j: number = 0; j < instrumentCount; j++) {
                                pattern.instruments[j] = clamp(0, channel.instruments.length, (instruments[j] | 0) - 1);
                            }
                            pattern.instruments.length = instrumentCount;
                        } else {
                            pattern.instruments[0] = clamp(0, channel.instruments.length, (patternObject["instrument"] | 0) - 1);
                            pattern.instruments.length = 1;
                        }
                    }

                    if (patternObject["notes"] && patternObject["notes"].length > 0) {
                        const maxNoteCount: number = Math.min(this.beatsPerBar * Config.partsPerBeat * (isModChannel ? Config.modCount : 1), patternObject["notes"].length >>> 0);

                        ///@TODO: Consider supporting notes specified in any timing order, sorting them and truncating as necessary. 
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

                                let instrument: Instrument = channel.instruments[pattern.instruments[0]];
                                let mod: number = Config.modCount - note.pitches[0] - 1;

                                // Only one instrument per pattern allowed in mod channels.
                                let volumeCap: number = this.getVolumeCapForSetting(isModChannel, instrument.modulators[mod], instrument.modFilterTypes[mod]);

                                // The strange volume formula used for notes is not needed for mods. Some rounding errors were possible.
                                // A "forMod" signifier was added to new JSON export to detect when the higher precision export was used in a file.
                                let size: number;
                                if (pointObject["volume"] == undefined) {
                                    size = volumeCap;
                                } else if (pointObject["forMod"] == undefined) {
                                    size = Math.max(0, Math.min(volumeCap, Math.round((pointObject["volume"] | 0) * volumeCap / 100)));
                                }
                                else {
                                    size = ((pointObject["forMod"] | 0) > 0) ? Math.round(pointObject["volume"] | 0) : Math.max(0, Math.min(volumeCap, Math.round((pointObject["volume"] | 0) * volumeCap / 100)));
                                }

                                if (time > this.beatsPerBar * Config.partsPerBeat) continue;
                                if (note.pins.length == 0) {
                                    //if (time < noteClock) continue;
                                    note.start = time;
                                    startInterval = interval;
                                } else {
                                    //if (time <= noteClock) continue;
                                }
                                //noteClock = time;

                                note.pins.push(makeNotePin(interval - startInterval, time - note.start, size));
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
                                        pin.size == note.pins[k - 1].size &&
                                        pin.size == note.pins[k - 2].size) {
                                        note.pins.splice(k - 1, 1);
                                        k--;
                                    }
                                }
                            }

                            if (note.start == 0) {
                                note.continuesLastPattern = (noteObject["continuesLastPattern"] === true);
                            } else {
                                note.continuesLastPattern = false;
                            }

                            pattern.notes.push(note);
                            //tickClock = note.end;
                        }
                    }
                }
                channel.patterns.length = this.patternsPerChannel;

                for (let i: number = 0; i < this.barCount; i++) {
                    channel.bars[i] = (channelObject["sequence"] != undefined) ? Math.min(this.patternsPerChannel, channelObject["sequence"][i] >>> 0) : 0;
                }
                channel.bars.length = this.barCount;
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

    public getPattern(channelIndex: number, bar: number): Pattern | null {
        if (bar < 0 || bar >= this.barCount) return null;
        const patternIndex: number = this.channels[channelIndex].bars[bar];
        if (patternIndex == 0) return null;
        return this.channels[channelIndex].patterns[patternIndex - 1];
    }

    public getBeatsPerMinute(): number {
        return this.tempo;
    }

    public static getNeededBits(maxValue: number): number {
        return 32 - Math.clz32(Math.ceil(maxValue + 1) - 1);
    }

    public restoreLimiterDefaults(): void {
        this.compressionRatio = 1.0;
        this.limitRatio = 1.0;
        this.limitRise = 4000.0;
        this.limitDecay = 4.0;
        this.limitThreshold = 1.0;
        this.compressionThreshold = 1.0;
        this.masterGain = 1.0;
    }
}

class PickedString {
    public delayLine: Float32Array | null = null;
    public delayIndex: number;
    public allPassSample: number;
    public allPassPrevInput: number;
    public shelfSample: number;
    public shelfPrevInput: number;
    public fractionalDelaySample: number;
    public prevDelayLength: number;
    public delayResetOffset: number;

    constructor() {
        this.reset();
    }

    public reset(): void {
        this.delayIndex = -1;
        this.allPassSample = 0.0;
        this.allPassPrevInput = 0.0;
        this.shelfSample = 0.0;
        this.shelfPrevInput = 0.0;
        this.fractionalDelaySample = 0.0;
        this.prevDelayLength = -1.0;
        this.delayResetOffset = 0;
    }
}

class EnvelopeComputer {
    public noteSecondsStart: number = 0.0;
    public noteSecondsEnd: number = 0.0;
    public noteTicksStart: number = 0.0;
    public noteTicksEnd: number = 0.0;
    public noteSizeStart: number = Config.noteSizeMax;
    public noteSizeEnd: number = Config.noteSizeMax;
    public prevNoteSize: number = Config.noteSizeMax;
    public nextNoteSize: number = Config.noteSizeMax;
    private _noteSizeFinal: number = Config.noteSizeMax;
    public prevNoteSecondsStart: number = 0.0;
    public prevNoteSecondsEnd: number = 0.0;
    public prevNoteTicksStart: number = 0.0;
    public prevNoteTicksEnd: number = 0.0;
    private _prevNoteSizeFinal: number = Config.noteSizeMax;

    public prevSlideStart: boolean = false;
    public prevSlideEnd: boolean = false;
    public nextSlideStart: boolean = false;
    public nextSlideEnd: boolean = false;
    public prevSlideRatioStart: number = 0.0;
    public prevSlideRatioEnd: number = 0.0;
    public nextSlideRatioStart: number = 0.0;
    public nextSlideRatioEnd: number = 0.0;

    public readonly envelopeStarts: number[] = [];
    public readonly envelopeEnds: number[] = [];
    public lowpassCutoffDecayVolumeCompensation: number = 1.0;

    constructor(/*private _perNote: boolean*/) {
        //const length: number = this._perNote ? NoteAutomationIndex.length : InstrumentAutomationIndex.length;
        const length: number = NoteAutomationIndex.length;
        for (let i: number = 0; i < length; i++) {
            this.envelopeStarts[i] = 1.0;
            this.envelopeEnds[i] = 1.0;
        }

        this.reset();
    }

    public reset(): void {
        this.noteSecondsEnd = 0.0;
        this.noteTicksEnd = 0.0;
        this._noteSizeFinal = Config.noteSizeMax;
        this.prevNoteSecondsEnd = 0.0;
        this.prevNoteTicksEnd = 0.0;
        this._prevNoteSizeFinal = Config.noteSizeMax;
    }

    public computeEnvelopes(instrument: Instrument, currentPart: number, tickTimeStart: number, tickTimeEnd: number, secondsPassing: number, tone: Tone | null): void {
        const transition: Transition = instrument.getTransition();
        if (tone != null && tone.atNoteStart && !transition.continues && !tone.forceContinueAtStart) {
            this.prevNoteSecondsEnd = this.noteSecondsEnd;
            this.prevNoteTicksEnd = this.noteTicksEnd;
            this._prevNoteSizeFinal = this._noteSizeFinal;
            this.noteSecondsEnd = 0.0;
            this.noteTicksEnd = 0.0;
        }
        if (tone != null) {
            if (tone.note != null) {
                this._noteSizeFinal = tone.note.pins[tone.note.pins.length - 1].size;
            } else {
                this._noteSizeFinal = Config.noteSizeMax;
            }
        }

        const ticksPassing: number = tickTimeEnd - tickTimeStart;
        const noteSecondsStart: number = this.noteSecondsEnd;
        const noteSecondsEnd: number = noteSecondsStart + secondsPassing;
        const noteTicksStart: number = this.noteTicksEnd;
        const noteTicksEnd: number = noteTicksStart + ticksPassing;
        const prevNoteSecondsStart: number = this.prevNoteSecondsEnd;
        const prevNoteSecondsEnd: number = prevNoteSecondsStart + secondsPassing;
        const prevNoteTicksStart: number = this.prevNoteTicksEnd;
        const prevNoteTicksEnd: number = prevNoteTicksStart + ticksPassing;

        const beatsPerTick: number = 1.0 / (Config.ticksPerPart * Config.partsPerBeat);
        const beatTimeStart: number = beatsPerTick * tickTimeStart;
        const beatTimeEnd: number = beatsPerTick * tickTimeEnd;

        let noteSizeStart: number = this._noteSizeFinal;
        let noteSizeEnd: number = this._noteSizeFinal;
        let prevNoteSize: number = this._prevNoteSizeFinal;
        let nextNoteSize: number = 0;
        let prevSlideStart: boolean = false;
        let prevSlideEnd: boolean = false;
        let nextSlideStart: boolean = false;
        let nextSlideEnd: boolean = false;
        let prevSlideRatioStart: number = 0.0;
        let prevSlideRatioEnd: number = 0.0;
        let nextSlideRatioStart: number = 0.0;
        let nextSlideRatioEnd: number = 0.0;
        if (tone != null && tone.note != null && !tone.passedEndOfNote) {
            const endPinIndex: number = tone.note.getEndPinIndex(currentPart);
            const startPin: NotePin = tone.note.pins[endPinIndex - 1];
            const endPin: NotePin = tone.note.pins[endPinIndex];
            const startPinTick: number = (tone.note.start + startPin.time) * Config.ticksPerPart;
            const endPinTick: number = (tone.note.start + endPin.time) * Config.ticksPerPart;
            const ratioStart: number = (tickTimeStart - startPinTick) / (endPinTick - startPinTick);
            const ratioEnd: number = (tickTimeEnd - startPinTick) / (endPinTick - startPinTick);
            noteSizeStart = startPin.size + (endPin.size - startPin.size) * ratioStart;
            noteSizeEnd = startPin.size + (endPin.size - startPin.size) * ratioEnd;

            if (transition.slides) {
                const noteStartTick: number = tone.noteStartPart * Config.ticksPerPart;
                const noteEndTick: number = tone.noteEndPart * Config.ticksPerPart;
                const noteLengthTicks: number = noteEndTick - noteStartTick;
                const maximumSlideTicks: number = noteLengthTicks * 0.5;
                const slideTicks: number = Math.min(maximumSlideTicks, transition.slideTicks);
                if (tone.prevNote != null && !tone.forceContinueAtStart) {
                    if (tickTimeStart - noteStartTick < slideTicks) {
                        prevSlideStart = true;
                        prevSlideRatioStart = 0.5 * (1.0 - (tickTimeStart - noteStartTick) / slideTicks);
                    }
                    if (tickTimeEnd - noteStartTick < slideTicks) {
                        prevSlideEnd = true;
                        prevSlideRatioEnd = 0.5 * (1.0 - (tickTimeEnd - noteStartTick) / slideTicks);
                    }
                }
                if (tone.nextNote != null && !tone.forceContinueAtEnd) {
                    nextNoteSize = tone.nextNote.pins[0].size
                    if (noteEndTick - tickTimeStart < slideTicks) {
                        nextSlideStart = true;
                        nextSlideRatioStart = 0.5 * (1.0 - (noteEndTick - tickTimeStart) / slideTicks);
                    }
                    if (noteEndTick - tickTimeEnd < slideTicks) {
                        nextSlideEnd = true;
                        nextSlideRatioEnd = 0.5 * (1.0 - (noteEndTick - tickTimeEnd) / slideTicks);
                    }
                }
            }
        }

        let lowpassCutoffDecayVolumeCompensation: number = 1.0;
        let usedNoteSize: boolean = false;
        for (let envelopeIndex: number = 0; envelopeIndex <= instrument.envelopeCount; envelopeIndex++) {
            let automationTarget: AutomationTarget;
            let targetIndex: number;
            let envelope: Envelope;
            if (envelopeIndex == instrument.envelopeCount) {
                if (usedNoteSize /*|| !this._perNote*/) break;
                // Special case: if no other envelopes used note size, default to applying it to note volume.
                automationTarget = Config.instrumentAutomationTargets.dictionary["noteVolume"];
                targetIndex = 0;
                envelope = Config.envelopes.dictionary["note size"];
            } else {
                let envelopeSettings: EnvelopeSettings = instrument.envelopes[envelopeIndex];
                automationTarget = Config.instrumentAutomationTargets[envelopeSettings.target];
                targetIndex = envelopeSettings.index;
                envelope = Config.envelopes[envelopeSettings.envelope];
                if (envelope.type == EnvelopeType.noteSize) usedNoteSize = true;
            }
            if (/*automationTarget.perNote == this._perNote &&*/ automationTarget.computeIndex != null) {
                const computeIndex: number = automationTarget.computeIndex + targetIndex;
                let envelopeStart: number = EnvelopeComputer.computeEnvelope(envelope, noteSecondsStart, beatTimeStart, noteSizeStart);
                let envelopeEnd: number = EnvelopeComputer.computeEnvelope(envelope, noteSecondsEnd, beatTimeEnd, noteSizeEnd);

                if (prevSlideStart) {
                    const other: number = EnvelopeComputer.computeEnvelope(envelope, prevNoteSecondsStart, beatTimeStart, prevNoteSize);
                    envelopeStart += (other - envelopeStart) * prevSlideRatioStart;
                }
                if (prevSlideEnd) {
                    const other: number = EnvelopeComputer.computeEnvelope(envelope, prevNoteSecondsEnd, beatTimeEnd, prevNoteSize);
                    envelopeEnd += (other - envelopeEnd) * prevSlideRatioEnd;
                }
                if (nextSlideStart) {
                    const other: number = EnvelopeComputer.computeEnvelope(envelope, 0.0, beatTimeStart, nextNoteSize);
                    envelopeStart += (other - envelopeStart) * nextSlideRatioStart;
                }
                if (nextSlideEnd) {
                    const other: number = EnvelopeComputer.computeEnvelope(envelope, 0.0, beatTimeEnd, nextNoteSize);
                    envelopeEnd += (other - envelopeEnd) * nextSlideRatioEnd;
                }

                this.envelopeStarts[computeIndex] *= envelopeStart;
                this.envelopeEnds[computeIndex] *= envelopeEnd;

                if (automationTarget.isFilter) {
                    const filterSettings: FilterSettings = /*this._perNote ?*/ (instrument.tmpNoteFilterStart != null) ? instrument.tmpNoteFilterStart : instrument.noteFilter /*: instrument.eqFilter*/;
                    if (filterSettings.controlPointCount > targetIndex && filterSettings.controlPoints[targetIndex].type == FilterType.lowPass) {
                        lowpassCutoffDecayVolumeCompensation = Math.max(lowpassCutoffDecayVolumeCompensation, EnvelopeComputer.getLowpassCutoffDecayVolumeCompensation(envelope));
                    }
                }
            }
        }

        this.noteSecondsStart = noteSecondsStart;
        this.noteSecondsEnd = noteSecondsEnd;
        this.noteTicksStart = noteTicksStart;
        this.noteTicksEnd = noteTicksEnd;
        this.prevNoteSecondsStart = prevNoteSecondsStart;
        this.prevNoteSecondsEnd = prevNoteSecondsEnd;
        this.prevNoteTicksStart = prevNoteTicksStart;
        this.prevNoteTicksEnd = prevNoteTicksEnd;
        this.prevNoteSize = prevNoteSize;
        this.nextNoteSize = nextNoteSize;
        this.noteSizeStart = noteSizeStart;
        this.noteSizeEnd = noteSizeEnd;
        this.prevSlideStart = prevSlideStart;
        this.prevSlideEnd = prevSlideEnd;
        this.nextSlideStart = nextSlideStart;
        this.nextSlideEnd = nextSlideEnd;
        this.prevSlideRatioStart = prevSlideRatioStart;
        this.prevSlideRatioEnd = prevSlideRatioEnd;
        this.nextSlideRatioStart = nextSlideRatioStart;
        this.nextSlideRatioEnd = nextSlideRatioEnd;
        this.lowpassCutoffDecayVolumeCompensation = lowpassCutoffDecayVolumeCompensation;
    }

    public clearEnvelopes(instrument: Instrument): void {
        for (let envelopeIndex: number = 0; envelopeIndex < instrument.envelopeCount; envelopeIndex++) {
            const envelopeSettings: EnvelopeSettings = instrument.envelopes[envelopeIndex];
            const automationTarget: AutomationTarget = Config.instrumentAutomationTargets[envelopeSettings.target];
            if (/*automationTarget.perNote == this._perNote &&*/ automationTarget.computeIndex != null) {
                const computeIndex: number = automationTarget.computeIndex + envelopeSettings.index;
                this.envelopeStarts[computeIndex] = 1.0;
                this.envelopeEnds[computeIndex] = 1.0;
            }
        }
        //if (this._perNote) {
        // As a special case, note volume may be altered even if there was no envelope for it.
        this.envelopeStarts[NoteAutomationIndex.noteVolume] = 1.0;
        this.envelopeEnds[NoteAutomationIndex.noteVolume] = 1.0;
        //}
    }

    public static computeEnvelope(envelope: Envelope, time: number, beats: number, noteSize: number): number {
        switch (envelope.type) {
            case EnvelopeType.noteSize: return Synth.noteSizeToVolumeMult(noteSize);
            case EnvelopeType.none: return 1.0;
            case EnvelopeType.twang: return 1.0 / (1.0 + time * envelope.speed);
            case EnvelopeType.swell: return 1.0 - 1.0 / (1.0 + time * envelope.speed);
            case EnvelopeType.tremolo: return 0.5 - Math.cos(beats * 2.0 * Math.PI * envelope.speed) * 0.5;
            case EnvelopeType.tremolo2: return 0.75 - Math.cos(beats * 2.0 * Math.PI * envelope.speed) * 0.25;
            case EnvelopeType.punch: return Math.max(1.0, 2.0 - time * 10.0);
            case EnvelopeType.flare: const attack: number = 0.25 / Math.sqrt(envelope.speed); return time < attack ? time / attack : 1.0 / (1.0 + (time - attack) * envelope.speed);
            case EnvelopeType.decay: return Math.pow(2, -envelope.speed * time);
            default: throw new Error("Unrecognized operator envelope type.");
        }

    }

    public static getLowpassCutoffDecayVolumeCompensation(envelope: Envelope): number {
        // This is a little hokey in the details, but I designed it a while ago and keep it 
        // around for compatibility. This decides how much to increase the volume (or
        // expression) to compensate for a decaying lowpass cutoff to maintain perceived
        // volume overall.
        if (envelope.type == EnvelopeType.decay) return 1.25 + 0.025 * envelope.speed;
        if (envelope.type == EnvelopeType.twang) return 1.0 + 0.02 * envelope.speed;
        return 1.0;
    }
}

class Tone {
    public instrumentIndex: number;
    public readonly pitches: number[] = Array(Config.maxChordSize).fill(0);
    public pitchCount: number = 0;
    public chordSize: number = 0;
    public drumsetPitch: number | null = null;
    public note: Note | null = null;
    public prevNote: Note | null = null;
    public nextNote: Note | null = null;
    public prevNotePitchIndex: number = 0;
    public nextNotePitchIndex: number = 0;
    public freshlyAllocated: boolean = true;
    public atNoteStart: boolean = false;
    public isOnLastTick: boolean = false; // Whether the tone is finished fading out and ready to be freed.
    public passedEndOfNote: boolean = false;
    public forceContinueAtStart: boolean = false;
    public forceContinueAtEnd: boolean = false;
    public noteStartPart: number = 0;
    public noteEndPart: number = 0;
    public ticksSinceReleased: number = 0;
    public liveInputSamplesHeld: number = 0;
    public lastInterval: number = 0;
    public sample: number = 0.0;
    public stringSustainStart: number = 0;
    public stringSustainEnd: number = 0;
    public readonly phases: number[] = [];
    public readonly phaseDeltas: number[] = [];
    public readonly expressionStarts: number[] = [];
    public readonly expressionDeltas: number[] = [];
    public readonly phaseDeltaScales: number[] = [];
    public prevVibrato: number | null = null;
    public pulseWidth: number = 0.0;
    public pulseWidthDelta: number = 0.0;
    public readonly pickedStrings: PickedString[] = [];

    public readonly noteFilters: DynamicBiquadFilter[] = [];
    public noteFilterCount: number = 0;
    public initialNoteFilterInput1: number = 0.0;
    public initialNoteFilterInput2: number = 0.0;

    public specialIntervalMult: number = 0.0;
    public specialIntervalExpressionMult: number = 1.0;
    public readonly feedbackOutputs: number[] = [];
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

    public readonly envelopeComputer: EnvelopeComputer = new EnvelopeComputer(/*true*/);

    constructor() {
        this.reset();
    }

    public reset(): void {
        this.sample = 0.0;
        const maxWaves: number = Math.max(Config.maxChordSize, Config.operatorCount);
        for (let i: number = 0; i < maxWaves; i++) {
            this.phases[i] = 0.0;
            this.feedbackOutputs[i] = 0.0;
        }
        for (let i: number = 0; i < this.noteFilterCount; i++) {
            this.noteFilters[i].resetOutput();
        }
        this.noteFilterCount = 0;
        this.initialNoteFilterInput1 = 0.0;
        this.initialNoteFilterInput2 = 0.0;
        this.liveInputSamplesHeld = 0;
        for (const pickedString of this.pickedStrings) {
            pickedString.reset();
        }
        this.envelopeComputer.reset();
        this.prevVibrato = null;
        this.drumsetPitch = null;
    }
}

class InstrumentState {
    public instrument: Instrument;

    public awake: boolean = false; // Whether the instrument's effects-processing loop should continue.
    public computed: boolean = false; // Whether the effects-processing parameters are up-to-date for the current synth run.
    public tonesAddedInThisTick: boolean = false; // Whether any instrument tones are currently active.
    public flushingDelayLines: boolean = false; // If no tones were active recently, enter a mode where the delay lines are filled with zeros to reset them for later use.
    public deactivateAfterThisTick: boolean = false; // Whether the instrument is ready to be deactivated because the delay lines, if any, are fully zeroed.
    public attentuationProgress: number = 0.0; // How long since an active tone introduced an input signal to the delay lines, normalized from 0 to 1 based on how long to wait until the delay lines signal will have audibly dissapated.
    public flushedSamples: number = 0; // How many delay line samples have been flushed to zero.
    public readonly activeTones: Deque<Tone> = new Deque<Tone>();
    public readonly activeModTones: Deque<Tone> = new Deque<Tone>();
    public readonly releasedTones: Deque<Tone> = new Deque<Tone>(); // Tones that are in the process of fading out after the corresponding notes ended.
    public readonly liveInputTones: Deque<Tone> = new Deque<Tone>(); // Tones that are initiated by a source external to the loaded song data.

    public eqFilterVolumeStart: number = 1.0;
    public eqFilterVolumeDelta: number = 0.0;
    public mixVolumeStart: number = 1.0;
    public mixVolumeDelta: number = 0.0;
    public delayInputMultStart: number = 0.0;
    public delayInputMultDelta: number = 0.0;

    public distortionStart: number = 0.0;
    public distortionEnd: number = 0.0;
    public distortionFractionalInput1: number = 0.0;
    public distortionFractionalInput2: number = 0.0;
    public distortionFractionalInput3: number = 0.0;
    public distortionPrevInput: number = 0.0;
    public distortionNextOutput: number = 0.0;

    public bitcrusherPrevInput: number = 0.0;
    public bitcrusherCurrentOutput: number = 0.0;
    public bitcrusherPhase: number = 1.0;
    public bitcrusherPhaseDelta: number = 0.0;
    public bitcrusherPhaseDeltaScale: number = 1.0;
    public bitcrusherScale: number = 1.0;
    public bitcrusherScaleScale: number = 1.0;
    public bitcrusherFoldLevel: number = 1.0;
    public bitcrusherFoldLevelScale: number = 1.0;

    public readonly eqFilters: DynamicBiquadFilter[] = [];
    public eqFilterCount: number = 0;
    public initialEqFilterInput1: number = 0.0;
    public initialEqFilterInput2: number = 0.0;

    public panningDelayLine: Float32Array | null = null;
    public panningDelayPos: number = 0;
    public panningVolumeStartL: number = 0.0;
    public panningVolumeStartR: number = 0.0;
    public panningVolumeDeltaL: number = 0.0;
    public panningVolumeDeltaR: number = 0.0;
    public panningOffsetStartL: number = 0.0;
    public panningOffsetStartR: number = 0.0;
    public panningOffsetDeltaL: number = 0.0;
    public panningOffsetDeltaR: number = 0.0;

    public chorusDelayLineL: Float32Array | null = null;
    public chorusDelayLineR: Float32Array | null = null;
    public chorusDelayLineDirty: boolean = false;
    public chorusDelayPos: number = 0;
    public chorusPhase: number = 0;
    public chorusStart: number = 0;
    public chorusEnd: number = 0;

    public echoDelayLineL: Float32Array | null = null;
    public echoDelayLineR: Float32Array | null = null;
    public echoDelayLineDirty: boolean = false;
    public echoDelayPos: number = 0;
    public echoDelayOffsetStart: number = 0;
    public echoDelayOffsetEnd: number = 0;
    public echoDelayOffsetLastTick: number = 0;
    public echoDelayOffsetRatio: number = 0.0;
    public echoDelayOffsetRatioDelta: number = 0.0;
    public echoDelayOffsetLastTickIsComputed: boolean = false;
    public echoMultStart: number = 0.0;
    public echoMultDelta: number = 0.0;
    public echoShelfA1: number = 0.0;
    public echoShelfB0: number = 0.0;
    public echoShelfB1: number = 0.0;
    public echoShelfSampleL: number = 0.0;
    public echoShelfSampleR: number = 0.0;
    public echoShelfPrevInputL: number = 0.0;
    public echoShelfPrevInputR: number = 0.0;

    public reverbDelayLine: Float32Array | null = null;
    public reverbDelayLineDirty: boolean = false;
    public reverbDelayPos: number = 0;
    public reverbMultStart: number = 0.0;
    public reverbMultDelta: number = 0.0;
    public reverbShelfA1: number = 0.0;
    public reverbShelfB0: number = 0.0;
    public reverbShelfB1: number = 0.0;
    public reverbShelfSample0: number = 0.0;
    public reverbShelfSample1: number = 0.0;
    public reverbShelfSample2: number = 0.0;
    public reverbShelfSample3: number = 0.0;
    public reverbShelfPrevInput0: number = 0.0;
    public reverbShelfPrevInput1: number = 0.0;
    public reverbShelfPrevInput2: number = 0.0;
    public reverbShelfPrevInput3: number = 0.0;

    //public readonly envelopeComputer: EnvelopeComputer = new EnvelopeComputer(false);

    public allocateNecessaryBuffers(synth: Synth, instrument: Instrument, samplesPerTick: number): void {
        if (effectsIncludePanning(instrument.effects)) {
            if (this.panningDelayLine == null || this.panningDelayLine.length < synth.panningDelayBufferSize) {
                this.panningDelayLine = new Float32Array(synth.panningDelayBufferSize);
            }
        }
        if (effectsIncludeChorus(instrument.effects)) {
            if (this.chorusDelayLineL == null || this.chorusDelayLineL.length < synth.chorusDelayBufferSize) {
                this.chorusDelayLineL = new Float32Array(synth.chorusDelayBufferSize);
            }
            if (this.chorusDelayLineR == null || this.chorusDelayLineR.length < synth.chorusDelayBufferSize) {
                this.chorusDelayLineR = new Float32Array(synth.chorusDelayBufferSize);
            }
        }
        if (effectsIncludeEcho(instrument.effects)) {
            // account for tempo and delay automation changing delay length during a tick?
            const safeEchoDelaySteps: number = Math.max(Config.echoDelayRange >> 1, (instrument.echoDelay + 1)); // The delay may be very short now, but if it increases later make sure we have enough sample history.
            const baseEchoDelayBufferSize: number = Synth.fittingPowerOfTwo(safeEchoDelaySteps * Config.echoDelayStepTicks * samplesPerTick);
            const safeEchoDelayBufferSize: number = baseEchoDelayBufferSize * 2; // If the tempo or delay changes and we suddenly need a longer delay, make sure that we have enough sample history to accomodate the longer delay.

            if (this.echoDelayLineL == null || this.echoDelayLineR == null) {
                this.echoDelayLineL = new Float32Array(safeEchoDelayBufferSize);
                this.echoDelayLineR = new Float32Array(safeEchoDelayBufferSize);
            } else if (this.echoDelayLineL.length < safeEchoDelayBufferSize || this.echoDelayLineR.length < safeEchoDelayBufferSize) {
                // The echo delay length may change whlie the song is playing if tempo changes,
                // so buffers may need to be reallocated, but we don't want to lose any echoes
                // so we need to copy the contents of the old buffer to the new one.
                const newDelayLineL: Float32Array = new Float32Array(safeEchoDelayBufferSize);
                const newDelayLineR: Float32Array = new Float32Array(safeEchoDelayBufferSize);
                const oldMask: number = this.echoDelayLineL.length - 1;

                for (let i = 0; i < this.echoDelayLineL.length; i++) {
                    newDelayLineL[i] = this.echoDelayLineL[(this.echoDelayPos + i) & oldMask];
                    newDelayLineR[i] = this.echoDelayLineL[(this.echoDelayPos + i) & oldMask];
                }

                this.echoDelayPos = this.echoDelayLineL.length;
                this.echoDelayLineL = newDelayLineL;
                this.echoDelayLineR = newDelayLineR;
            }
        }
        if (effectsIncludeReverb(instrument.effects)) {
            // TODO: Make reverb delay line sample rate agnostic. Maybe just double buffer size for 96KHz? Adjust attenuation and shelf cutoff appropriately?
            if (this.reverbDelayLine == null) {
                this.reverbDelayLine = new Float32Array(Config.reverbDelayBufferSize);
            }
        }
    }

    public deactivate(): void {
        this.bitcrusherPrevInput = 0.0;
        this.bitcrusherCurrentOutput = 0.0;
        this.bitcrusherPhase = 1.0;
        for (let i: number = 0; i < this.eqFilterCount; i++) {
            this.eqFilters[i].resetOutput();
        }
        this.eqFilterCount = 0;
        this.initialEqFilterInput1 = 0.0;
        this.initialEqFilterInput2 = 0.0;
        this.distortionFractionalInput1 = 0.0;
        this.distortionFractionalInput2 = 0.0;
        this.distortionFractionalInput3 = 0.0;
        this.distortionPrevInput = 0.0;
        this.distortionNextOutput = 0.0;
        this.panningDelayPos = 0;
        if (this.panningDelayLine != null) for (let i: number = 0; i < this.panningDelayLine.length; i++) this.panningDelayLine[i] = 0.0;
        this.echoDelayOffsetLastTickIsComputed = false;
        this.echoShelfSampleL = 0.0;
        this.echoShelfSampleR = 0.0;
        this.echoShelfPrevInputL = 0.0;
        this.echoShelfPrevInputR = 0.0;
        this.reverbShelfSample0 = 0.0;
        this.reverbShelfSample1 = 0.0;
        this.reverbShelfSample2 = 0.0;
        this.reverbShelfSample3 = 0.0;
        this.reverbShelfPrevInput0 = 0.0;
        this.reverbShelfPrevInput1 = 0.0;
        this.reverbShelfPrevInput2 = 0.0;
        this.reverbShelfPrevInput3 = 0.0;

        this.awake = false;
        this.flushingDelayLines = false;
        this.deactivateAfterThisTick = false;
        this.attentuationProgress = 0.0;
        this.flushedSamples = 0;
    }

    public resetAllEffects(): void {
        this.deactivate();

        if (this.chorusDelayLineDirty) {
            for (let i: number = 0; i < this.chorusDelayLineL!.length; i++) this.chorusDelayLineL![i] = 0.0;
            for (let i: number = 0; i < this.chorusDelayLineR!.length; i++) this.chorusDelayLineR![i] = 0.0;
        }
        if (this.echoDelayLineDirty) {
            for (let i: number = 0; i < this.echoDelayLineL!.length; i++) this.echoDelayLineL![i] = 0.0;
            for (let i: number = 0; i < this.echoDelayLineR!.length; i++) this.echoDelayLineR![i] = 0.0;
        }
        if (this.reverbDelayLineDirty) {
            for (let i: number = 0; i < this.reverbDelayLine!.length; i++) this.reverbDelayLine![i] = 0.0;
        }

        this.chorusPhase = 0.0;
    }

    public compute(synth: Synth, instrument: Instrument, samplesPerTick: number, runLength: number, tone: Tone | null, channelIndex: number, instrumentIndex: number): void {
        this.computed = true;

        this.allocateNecessaryBuffers(synth, instrument, samplesPerTick);

        const samplesPerSecond: number = synth.samplesPerSecond;
        const tickSampleCountdown: number = synth.tickSampleCountdown;
        const tickRemainingStart: number = (tickSampleCountdown) / samplesPerTick;
        const tickRemainingEnd: number = (tickSampleCountdown - runLength) / samplesPerTick;

        //const ticksIntoBar: number = synth.getTicksIntoBar();
        //const tickTimeStart: number = ticksIntoBar + (1.0 - tickRemainingStart);
        //const tickTimeEnd:   number = ticksIntoBar + (1.0 - tickRemainingEnd);
        //const secondsPerTick: number = samplesPerTick / synth.samplesPerSecond;
        //const currentPart: number = synth.getCurrentPart();
        //this.envelopeComputer.computeEnvelopes(instrument, currentPart, tickTimeStart, tickTimeEnd, secondsPerTick * (tickTimeEnd - tickTimeStart), tone);
        //const envelopeStarts: number[] = this.envelopeComputer.envelopeStarts;
        //const envelopeEnds: number[] = this.envelopeComputer.envelopeEnds;

        const usesDistortion: boolean = effectsIncludeDistortion(instrument.effects);
        const usesBitcrusher: boolean = effectsIncludeBitcrusher(instrument.effects);
        const usesPanning: boolean = effectsIncludePanning(instrument.effects);
        const usesChorus: boolean = effectsIncludeChorus(instrument.effects);
        const usesEcho: boolean = effectsIncludeEcho(instrument.effects);
        const usesReverb: boolean = effectsIncludeReverb(instrument.effects);

        if (usesDistortion) {
            let useDistortionStart: number = instrument.distortion;
            let useDistortionEnd: number = instrument.distortion;

            // Check for distortion mods
            if (synth.isModActive(Config.modulators.dictionary["distortion"].index, channelIndex, instrumentIndex)) {
                useDistortionStart = synth.getModValue(Config.modulators.dictionary["distortion"].index, channelIndex, instrumentIndex, false);
                useDistortionEnd = synth.getModValue(Config.modulators.dictionary["distortion"].index, channelIndex, instrumentIndex, true);
            }

            this.distortionStart = Math.min(1.0, /*envelopeStarts[InstrumentAutomationIndex.distortion] **/ useDistortionStart / (Config.distortionRange - 1));
            this.distortionEnd = Math.min(1.0, /*envelopeEnds[  InstrumentAutomationIndex.distortion] **/ useDistortionEnd / (Config.distortionRange - 1));
        }

        if (usesBitcrusher) {
            let freqSettingStart: number = instrument.bitcrusherFreq /** Math.sqrt(envelopeStarts[InstrumentAutomationIndex.bitcrusherFrequency])*/;
            let freqSettingEnd: number = instrument.bitcrusherFreq /** Math.sqrt(envelopeEnds[  InstrumentAutomationIndex.bitcrusherFrequency])*/;

            // Check for freq crush mods
            if (synth.isModActive(Config.modulators.dictionary["freq crush"].index, channelIndex, instrumentIndex)) {
                freqSettingStart = synth.getModValue(Config.modulators.dictionary["freq crush"].index, channelIndex, instrumentIndex, false);
                freqSettingEnd = synth.getModValue(Config.modulators.dictionary["freq crush"].index, channelIndex, instrumentIndex, true);
            }

            let quantizationSettingStart: number = instrument.bitcrusherQuantization /** Math.sqrt(envelopeStarts[InstrumentAutomationIndex.bitcrusherQuantization])*/;
            let quantizationSettingEnd: number = instrument.bitcrusherQuantization /** Math.sqrt(envelopeEnds[  InstrumentAutomationIndex.bitcrusherQuantization])*/;

            // Check for bitcrush mods
            if (synth.isModActive(Config.modulators.dictionary["bit crush"].index, channelIndex, instrumentIndex)) {
                quantizationSettingStart = synth.getModValue(Config.modulators.dictionary["bit crush"].index, channelIndex, instrumentIndex, false);
                quantizationSettingEnd = synth.getModValue(Config.modulators.dictionary["bit crush"].index, channelIndex, instrumentIndex, true);
            }

            const basePitch: number = Config.keys[synth.song!.key].basePitch; // TODO: What if there's a key change mid-song?
            const freqStart: number = Instrument.frequencyFromPitch(basePitch + 60) * Math.pow(2.0, (Config.bitcrusherFreqRange - 1 - freqSettingStart) * Config.bitcrusherOctaveStep);
            const freqEnd: number = Instrument.frequencyFromPitch(basePitch + 60) * Math.pow(2.0, (Config.bitcrusherFreqRange - 1 - freqSettingEnd) * Config.bitcrusherOctaveStep);
            const phaseDeltaStart: number = Math.min(1.0, freqStart / samplesPerSecond);
            const phaseDeltaEnd: number = Math.min(1.0, freqEnd / samplesPerSecond);
            this.bitcrusherPhaseDelta = phaseDeltaStart;
            this.bitcrusherPhaseDeltaScale = Math.pow(phaseDeltaEnd / phaseDeltaStart, 1.0 / runLength);

            const scaleStart: number = 2.0 * Config.bitcrusherBaseVolume * Math.pow(2.0, 1.0 - Math.pow(2.0, (Config.bitcrusherQuantizationRange - 1 - quantizationSettingStart) * 0.5));
            const scaleEnd: number = 2.0 * Config.bitcrusherBaseVolume * Math.pow(2.0, 1.0 - Math.pow(2.0, (Config.bitcrusherQuantizationRange - 1 - quantizationSettingEnd) * 0.5));
            this.bitcrusherScale = scaleStart;
            this.bitcrusherScaleScale = Math.pow(scaleEnd / scaleStart, 1.0 / runLength);

            const foldLevelStart: number = 2.0 * Config.bitcrusherBaseVolume * Math.pow(1.5, Config.bitcrusherQuantizationRange - 1 - quantizationSettingStart);
            const foldLevelEnd: number = 2.0 * Config.bitcrusherBaseVolume * Math.pow(1.5, Config.bitcrusherQuantizationRange - 1 - quantizationSettingEnd);
            this.bitcrusherFoldLevel = foldLevelStart;
            this.bitcrusherFoldLevelScale = Math.pow(foldLevelEnd / foldLevelStart, 1.0 / runLength);
        }

        let eqFilterVolume: number = 1.0; //this.envelopeComputer.lowpassCutoffDecayVolumeCompensation;
        if (instrument.eqFilterType) {
            // Simple EQ filter (old style). For analysis, using random filters from normal style since they are N/A in this context.
            const eqFilterSettingsStart: FilterSettings = instrument.eqFilter;
            if (instrument.eqSubFilters[1] == null)
                instrument.eqSubFilters[1] = new FilterSettings();
            const eqFilterSettingsEnd: FilterSettings = instrument.eqSubFilters[1];

            // Change location based on slider values
            let startSimpleFreq: number = instrument.eqFilterSimpleCut;
            let startSimpleGain: number = instrument.eqFilterSimplePeak;
            let endSimpleFreq: number = instrument.eqFilterSimpleCut;
            let endSimpleGain: number = instrument.eqFilterSimplePeak;

            let filterChanges: boolean = false;

            if (synth.isModActive(Config.modulators.dictionary["eq filt cut"].index, channelIndex, instrumentIndex)) {
                startSimpleFreq = synth.getModValue(Config.modulators.dictionary["eq filt cut"].index, channelIndex, instrumentIndex, false);
                endSimpleFreq = synth.getModValue(Config.modulators.dictionary["eq filt cut"].index, channelIndex, instrumentIndex, true);
                filterChanges = true;
            }
            if (synth.isModActive(Config.modulators.dictionary["eq filt peak"].index, channelIndex, instrumentIndex)) {
                startSimpleGain = synth.getModValue(Config.modulators.dictionary["eq filt peak"].index, channelIndex, instrumentIndex, false);
                endSimpleGain = synth.getModValue(Config.modulators.dictionary["eq filt peak"].index, channelIndex, instrumentIndex, true);
                filterChanges = true;
            }

            let startPoint: FilterControlPoint;

            if (filterChanges) {
                eqFilterSettingsStart.convertLegacySettingsForSynth(startSimpleFreq, startSimpleGain);
                eqFilterSettingsEnd.convertLegacySettingsForSynth(endSimpleFreq, endSimpleGain);

                startPoint = eqFilterSettingsStart.controlPoints[0];
                let endPoint: FilterControlPoint = eqFilterSettingsEnd.controlPoints[0];

                startPoint.toCoefficients(Synth.tempFilterStartCoefficients, samplesPerSecond, 1.0, 1.0);
                endPoint.toCoefficients(Synth.tempFilterEndCoefficients, samplesPerSecond, 1.0, 1.0);
            } else {
                eqFilterSettingsStart.convertLegacySettingsForSynth(startSimpleFreq, startSimpleGain, true);

                startPoint = eqFilterSettingsStart.controlPoints[0];

                startPoint.toCoefficients(Synth.tempFilterStartCoefficients, samplesPerSecond, 1.0, 1.0);
            }

            if (this.eqFilters.length < 1) this.eqFilters[0] = new DynamicBiquadFilter();
            this.eqFilters[0].loadCoefficientsWithGradient(Synth.tempFilterStartCoefficients, Synth.tempFilterStartCoefficients, 1.0 / runLength, startPoint.type == FilterType.lowPass);
            eqFilterVolume *= startPoint.getVolumeCompensationMult();

            this.eqFilterCount = 1;
            eqFilterVolume = Math.min(3.0, eqFilterVolume);
        }
        else {
            const eqFilterSettings: FilterSettings = (instrument.tmpEqFilterStart != null) ? instrument.tmpEqFilterStart : instrument.eqFilter;
            //const eqAllFreqsEnvelopeStart: number = envelopeStarts[InstrumentAutomationIndex.eqFilterAllFreqs];
            //const eqAllFreqsEnvelopeEnd:   number = envelopeEnds[  InstrumentAutomationIndex.eqFilterAllFreqs];
            for (let i: number = 0; i < eqFilterSettings.controlPointCount; i++) {
                //const eqFreqEnvelopeStart: number = envelopeStarts[InstrumentAutomationIndex.eqFilterFreq0 + i];
                //const eqFreqEnvelopeEnd:   number = envelopeEnds[  InstrumentAutomationIndex.eqFilterFreq0 + i];
                //const eqPeakEnvelopeStart: number = envelopeStarts[InstrumentAutomationIndex.eqFilterGain0 + i];
                //const eqPeakEnvelopeEnd:   number = envelopeEnds[  InstrumentAutomationIndex.eqFilterGain0 + i];
                let startPoint: FilterControlPoint = eqFilterSettings.controlPoints[i];
                let endPoint: FilterControlPoint = (instrument.tmpEqFilterEnd != null && instrument.tmpEqFilterEnd.controlPoints[i] != null) ? instrument.tmpEqFilterEnd.controlPoints[i] : eqFilterSettings.controlPoints[i];

                startPoint.toCoefficients(Synth.tempFilterStartCoefficients, samplesPerSecond, /*eqAllFreqsEnvelopeStart * eqFreqEnvelopeStart*/ 1.0, /*eqPeakEnvelopeStart*/ 1.0);
                endPoint.toCoefficients(Synth.tempFilterEndCoefficients, samplesPerSecond, /*eqAllFreqsEnvelopeEnd   * eqFreqEnvelopeEnd*/   1.0, /*eqPeakEnvelopeEnd*/   1.0);
                if (this.eqFilters.length <= i) this.eqFilters[i] = new DynamicBiquadFilter();
                this.eqFilters[i].loadCoefficientsWithGradient(Synth.tempFilterStartCoefficients, Synth.tempFilterEndCoefficients, 1.0 / runLength, startPoint.type == FilterType.lowPass);
                eqFilterVolume *= startPoint.getVolumeCompensationMult();

            }
            this.eqFilterCount = eqFilterSettings.controlPointCount;
            eqFilterVolume = Math.min(3.0, eqFilterVolume);
        }

        const mainInstrumentVolume: number = Synth.instrumentVolumeToVolumeMult(instrument.volume);
        this.mixVolumeStart = mainInstrumentVolume /** envelopeStarts[InstrumentAutomationIndex.mixVolume]*/;
        const mixVolumeEnd = mainInstrumentVolume /** envelopeEnds[  InstrumentAutomationIndex.mixVolume]*/;
        this.mixVolumeDelta = (mixVolumeEnd - this.mixVolumeStart) / runLength;

        let eqFilterVolumeStart: number = eqFilterVolume;
        let eqFilterVolumeEnd: number = eqFilterVolume;
        let delayInputMultStart: number = 1.0;
        let delayInputMultEnd: number = 1.0;

        if (usesPanning) {
            //const panEnvelopeStart: number = envelopeStarts[InstrumentAutomationIndex.panning] * 2.0 - 1.0;
            //const panEnvelopeEnd:   number = envelopeEnds[  InstrumentAutomationIndex.panning] * 2.0 - 1.0;

            let usePanStart: number = instrument.pan;
            let usePanEnd: number = instrument.pan;
            // Check for pan mods
            if (synth.isModActive(Config.modulators.dictionary["pan"].index, channelIndex, instrumentIndex)) {
                usePanStart = synth.getModValue(Config.modulators.dictionary["pan"].index, channelIndex, instrumentIndex, false);
                usePanEnd = synth.getModValue(Config.modulators.dictionary["pan"].index, channelIndex, instrumentIndex, true);
            }

            let panStart: number = Math.max(-1.0, Math.min(1.0, (usePanStart - Config.panCenter) / Config.panCenter /** panEnvelopeStart*/));
            let panEnd: number = Math.max(-1.0, Math.min(1.0, (usePanEnd - Config.panCenter) / Config.panCenter /** panEnvelopeEnd  */));

            const volumeStartL: number = Math.cos((1 + panStart) * Math.PI * 0.25) * 1.414;
            const volumeStartR: number = Math.cos((1 - panStart) * Math.PI * 0.25) * 1.414;
            const volumeEndL: number = Math.cos((1 + panEnd) * Math.PI * 0.25) * 1.414;
            const volumeEndR: number = Math.cos((1 - panEnd) * Math.PI * 0.25) * 1.414;
            const maxDelaySamples: number = samplesPerSecond * Config.panDelaySecondsMax;

            let usePanDelayStart: number = instrument.panDelay;
            let usePanDelayEnd: number = instrument.panDelay;
            // Check for pan delay mods
            if (synth.isModActive(Config.modulators.dictionary["pan delay"].index, channelIndex, instrumentIndex)) {
                usePanDelayStart = synth.getModValue(Config.modulators.dictionary["pan delay"].index, channelIndex, instrumentIndex, false);
                usePanDelayEnd = synth.getModValue(Config.modulators.dictionary["pan delay"].index, channelIndex, instrumentIndex, true);
            }

            const delayStart: number = panStart * usePanDelayStart * maxDelaySamples / 10;
            const delayEnd: number = panEnd * usePanDelayEnd * maxDelaySamples / 10;
            const delayStartL: number = Math.max(0.0, delayStart);
            const delayStartR: number = Math.max(0.0, -delayStart);
            const delayEndL: number = Math.max(0.0, delayEnd);
            const delayEndR: number = Math.max(0.0, -delayEnd);

            this.panningVolumeStartL = volumeStartL;
            this.panningVolumeStartR = volumeStartR;
            this.panningVolumeDeltaL = (volumeEndL - volumeStartL) / runLength;
            this.panningVolumeDeltaR = (volumeEndR - volumeStartR) / runLength;
            this.panningOffsetStartL = delayStartL;
            this.panningOffsetStartR = delayStartR;
            this.panningOffsetDeltaL = (delayEndL - delayStartL) / runLength;
            this.panningOffsetDeltaR = (delayEndR - delayStartR) / runLength;
        }

        if (usesChorus) {
            //const chorusEnvelopeStart: number = envelopeStarts[InstrumentAutomationIndex.chorus];
            //const chorusEnvelopeEnd:   number = envelopeEnds[  InstrumentAutomationIndex.chorus];
            let useChorusStart: number = instrument.chorus;
            let useChorusEnd: number = instrument.chorus;
            // Check for chorus mods
            if (synth.isModActive(Config.modulators.dictionary["chorus"].index, channelIndex, instrumentIndex)) {
                useChorusStart = synth.getModValue(Config.modulators.dictionary["chorus"].index, channelIndex, instrumentIndex, false);
                useChorusEnd = synth.getModValue(Config.modulators.dictionary["chorus"].index, channelIndex, instrumentIndex, true);
            }

            const chorusStart: number = Math.min(1.0, /*chorusEnvelopeStart **/ useChorusStart / (Config.chorusRange - 1));
            const chorusEnd: number = Math.min(1.0, /*chorusEnvelopeEnd   **/ useChorusEnd / (Config.chorusRange - 1));
            this.chorusStart = chorusStart * 0.6 + (Math.pow(chorusStart, 6.0)) * 0.4;
            this.chorusEnd = chorusEnd * 0.6 + (Math.pow(chorusEnd, 6.0)) * 0.4;
        }

        let maxEchoMult = 0.0;
        if (usesEcho) {
            //const echoSustainEnvelopeStart: number = envelopeStarts[InstrumentAutomationIndex.echoSustain];
            //const echoSustainEnvelopeEnd:   number = envelopeEnds[  InstrumentAutomationIndex.echoSustain];
            let useEchoSustainStart: number = instrument.echoSustain;
            let useEchoSustainEnd: number = instrument.echoSustain;
            // Check for echo mods
            if (synth.isModActive(Config.modulators.dictionary["echo"].index, channelIndex, instrumentIndex)) {
                useEchoSustainStart = synth.getModValue(Config.modulators.dictionary["echo"].index, channelIndex, instrumentIndex, false);
                useEchoSustainEnd = synth.getModValue(Config.modulators.dictionary["echo"].index, channelIndex, instrumentIndex, true);
            }
            const echoMultStart: number = Math.min(1.0, Math.pow(/*echoSustainEnvelopeStart **/ useEchoSustainStart / Config.echoSustainRange, 1.1)) * 0.9;
            const echoMultEnd: number = Math.min(1.0, Math.pow(/*echoSustainEnvelopeEnd   **/ useEchoSustainEnd / Config.echoSustainRange, 1.1)) * 0.9;
            this.echoMultStart = echoMultStart;
            this.echoMultDelta = (echoMultEnd - echoMultStart) / runLength;
            maxEchoMult = Math.max(echoMultStart, echoMultEnd);

            // TODO: After computing a tick's settings once for multiple run lengths (which is
            // good for audio worklet threads), compute the echo delay envelopes at tick (or
            // part) boundaries to interpolate between two delay taps.
            //const echoDelayEnvelopeStart:   number = envelopeStarts[InstrumentAutomationIndex.echoDelay];
            //const echoDelayEnvelopeEnd:     number = envelopeEnds[  InstrumentAutomationIndex.echoDelay];
            let useEchoDelayStart: number = instrument.echoDelay;
            let useEchoDelayEnd: number = instrument.echoDelay;
            let ignoreTicks: boolean = false;
            // Check for pan delay mods
            if (synth.isModActive(Config.modulators.dictionary["echo delay"].index, channelIndex, instrumentIndex)) {
                useEchoDelayStart = synth.getModValue(Config.modulators.dictionary["echo delay"].index, channelIndex, instrumentIndex, false);
                useEchoDelayEnd = synth.getModValue(Config.modulators.dictionary["echo delay"].index, channelIndex, instrumentIndex, true);
                ignoreTicks = true;
            }

            const tmpEchoDelayOffsetStart: number = Math.round((useEchoDelayStart + 1) * Config.echoDelayStepTicks * samplesPerTick);
            const tmpEchoDelayOffsetEnd: number = Math.round((useEchoDelayEnd + 1) * Config.echoDelayStepTicks * samplesPerTick);
            if (this.echoDelayOffsetLastTickIsComputed && !ignoreTicks) {
                this.echoDelayOffsetStart = this.echoDelayOffsetLastTick;
            } else {
                this.echoDelayOffsetStart = tmpEchoDelayOffsetStart;
            }
            if (synth.isAtEndOfTick && !ignoreTicks) {
                this.echoDelayOffsetLastTick = tmpEchoDelayOffsetEnd;
                this.echoDelayOffsetLastTickIsComputed = true;
            }
            this.echoDelayOffsetEnd = tmpEchoDelayOffsetEnd;

            this.echoDelayOffsetRatio = 1.0 - tickRemainingStart;
            this.echoDelayOffsetRatioDelta = (tickRemainingStart - tickRemainingEnd) / runLength;

            const shelfRadians: number = 2.0 * Math.PI * Config.echoShelfHz / synth.samplesPerSecond;
            Synth.tempFilterStartCoefficients.highShelf1stOrder(shelfRadians, Config.echoShelfGain);
            this.echoShelfA1 = Synth.tempFilterStartCoefficients.a[1];
            this.echoShelfB0 = Synth.tempFilterStartCoefficients.b[0];
            this.echoShelfB1 = Synth.tempFilterStartCoefficients.b[1];
        }

        let maxReverbMult = 0.0;
        if (usesReverb) {
            //const reverbEnvelopeStart: number = envelopeStarts[InstrumentAutomationIndex.reverb];
            //const reverbEnvelopeEnd:   number = envelopeEnds[  InstrumentAutomationIndex.reverb];

            let useReverbStart: number = instrument.reverb;
            let useReverbEnd: number = instrument.reverb;

            // Check for mod reverb, instrument level
            if (synth.isModActive(Config.modulators.dictionary["reverb"].index, channelIndex, instrumentIndex)) {
                useReverbStart = synth.getModValue(Config.modulators.dictionary["reverb"].index, channelIndex, instrumentIndex, false);
                useReverbEnd = synth.getModValue(Config.modulators.dictionary["reverb"].index, channelIndex, instrumentIndex, true);
            }
            // Check for mod reverb, song scalar
            if (synth.isModActive(Config.modulators.dictionary["song reverb"].index, channelIndex, instrumentIndex)) {
                useReverbStart *= (synth.getModValue(Config.modulators.dictionary["song reverb"].index, undefined, undefined, false) - Config.modulators.dictionary["song reverb"].convertRealFactor) / Config.reverbRange;
                useReverbEnd *= (synth.getModValue(Config.modulators.dictionary["song reverb"].index, undefined, undefined, true) - Config.modulators.dictionary["song reverb"].convertRealFactor) / Config.reverbRange;
            }

            const reverbStart: number = Math.min(1.0, Math.pow(/*reverbEnvelopeStart **/ useReverbStart / Config.reverbRange, 0.667)) * 0.425;
            const reverbEnd: number = Math.min(1.0, Math.pow(/*reverbEnvelopeEnd   **/ useReverbEnd / Config.reverbRange, 0.667)) * 0.425;

            this.reverbMultStart = reverbStart;
            this.reverbMultDelta = (reverbEnd - reverbStart) / runLength;
            maxReverbMult = Math.max(reverbStart, reverbEnd);

            const shelfRadians: number = 2.0 * Math.PI * Config.reverbShelfHz / synth.samplesPerSecond;
            Synth.tempFilterStartCoefficients.highShelf1stOrder(shelfRadians, Config.reverbShelfGain);
            this.reverbShelfA1 = Synth.tempFilterStartCoefficients.a[1];
            this.reverbShelfB0 = Synth.tempFilterStartCoefficients.b[0];
            this.reverbShelfB1 = Synth.tempFilterStartCoefficients.b[1];
        }

        if (this.tonesAddedInThisTick) {
            this.attentuationProgress = 0.0;
            this.flushedSamples = 0;
            this.flushingDelayLines = false;
        } else if (!this.flushingDelayLines) {
            // If this instrument isn't playing tones anymore, the volume can fade out by the
            // end of the first tick. It's possible for filters and the panning delay line to
            // continue past the end of the tone but they should have mostly dissipated by the
            // end of the tick anyway.
            if (this.attentuationProgress == 0.0) {
                eqFilterVolumeStart *= tickRemainingStart;
                eqFilterVolumeEnd *= tickRemainingEnd;
            } else {
                eqFilterVolumeStart = 0.0;
                eqFilterVolumeEnd = 0.0;
            }

            const attenuationThreshold: number = 1.0 / 256.0; // when the delay line signal has attenuated this much, it should be inaudible and should be flushed to zero.
            const halfLifeMult: number = -Math.log2(attenuationThreshold);
            let delayDuration: number = 0.0;

            if (usesChorus) {
                delayDuration += Config.chorusMaxDelay;
            }

            if (usesEcho) {
                const averageDelaySeconds: number = (this.echoDelayOffsetStart + this.echoDelayOffsetEnd) * 0.5 / samplesPerSecond;
                const attenuationPerSecond: number = Math.pow(maxEchoMult, 1.0 / averageDelaySeconds);
                const halfLife: number = -1.0 / Math.log2(attenuationPerSecond);
                const echoDuration: number = halfLife * halfLifeMult;
                delayDuration += echoDuration;
            }

            if (usesReverb) {
                const averageMult: number = maxReverbMult * 2.0;
                const averageDelaySeconds: number = (Config.reverbDelayBufferSize / 4.0) / samplesPerSecond;
                const attenuationPerSecond: number = Math.pow(averageMult, 1.0 / averageDelaySeconds);
                const halfLife: number = -1.0 / Math.log2(attenuationPerSecond);
                const reverbDuration: number = halfLife * halfLifeMult;
                delayDuration += reverbDuration;
            }

            const secondsInTick: number = samplesPerTick / samplesPerSecond;
            const progressInTick: number = secondsInTick / delayDuration;
            const progressAtEndOfTick: number = this.attentuationProgress + progressInTick;
            if (progressAtEndOfTick >= 1.0) {
                delayInputMultStart *= tickRemainingStart;
                delayInputMultEnd *= tickRemainingEnd;
            }
            if (synth.isAtEndOfTick) {
                this.attentuationProgress = progressAtEndOfTick;
                if (this.attentuationProgress >= 1.0) {
                    this.flushingDelayLines = true;
                }
            }
        } else {
            // Flushing delay lines to zero since the signal has mostly dissipated.
            eqFilterVolumeStart = 0.0;
            eqFilterVolumeEnd = 0.0;
            delayInputMultStart = 0.0;
            delayInputMultEnd = 0.0;

            let totalDelaySamples: number = 0;
            if (usesChorus) totalDelaySamples += synth.chorusDelayBufferSize;
            if (usesEcho) totalDelaySamples += this.echoDelayLineL!.length;
            if (usesReverb) totalDelaySamples += Config.reverbDelayBufferSize;

            this.flushedSamples += runLength;
            if (this.flushedSamples >= totalDelaySamples) {
                this.deactivateAfterThisTick = true;
            }
        }

        this.eqFilterVolumeStart = eqFilterVolumeStart;
        this.eqFilterVolumeDelta = (eqFilterVolumeEnd - eqFilterVolumeStart) / runLength;
        this.delayInputMultStart = delayInputMultStart;
        this.delayInputMultDelta = (delayInputMultEnd - delayInputMultStart) / runLength;
    }
}

class ChannelState {
    public readonly instruments: InstrumentState[] = [];
    public muted: boolean = false;
    public singleSeamlessInstrument: number | null = null; // Seamless tones from a pattern with a single instrument can be transferred to a different single seamless instrument in the next pattern.
}

export class Synth {

    private syncSongState(): void {
        const channelCount: number = this.song!.getChannelCount();
        for (let i: number = this.channels.length; i < channelCount; i++) {
            this.channels[i] = new ChannelState();
        }
        this.channels.length = channelCount;
        for (let i: number = 0; i < channelCount; i++) {
            const channel: Channel = this.song!.channels[i];
            const channelState: ChannelState = this.channels[i];
            for (let j: number = channelState.instruments.length; j < channel.instruments.length; j++) {
                channelState.instruments[j] = new InstrumentState();
            }
            channelState.instruments.length = channel.instruments.length;

            if (channelState.muted != channel.muted) {
                channelState.muted = channel.muted;
                if (channelState.muted) {
                    for (const instrumentState of channelState.instruments) {
                        instrumentState.resetAllEffects();
                    }
                }
            }
        }
    }

    public warmUpSynthesizer(song: Song | null): void {
        // Don't bother to generate the drum waves unless the song actually
        // uses them, since they may require a lot of computation.
        if (song != null) {
            this.syncSongState();
            const samplesPerTick: number = this.getSamplesPerTick();
            for (let channelIndex: number = 0; channelIndex < song.getChannelCount(); channelIndex++) {
                for (let instrumentIndex: number = 0; instrumentIndex < song.channels[channelIndex].instruments.length; instrumentIndex++) {
                    const instrument: Instrument = song.channels[channelIndex].instruments[instrumentIndex];
                    const instrumentState: InstrumentState = this.channels[channelIndex].instruments[instrumentIndex];
                    Synth.getInstrumentSynthFunction(instrument);
                    instrument.warmUp(this.samplesPerSecond);
                    instrumentState.allocateNecessaryBuffers(this, instrument, samplesPerTick);
                }

            }
        }
    }

    public computeLatestModValues(): void {

        if (this.song != null && this.song.modChannelCount > 0) {

            // Clear all mod values, and set up temp variables for the time a mod would be set at.
            let latestModTimes: (number | null)[] = [];
            let latestModInsTimes: (number | null)[][][] = [];
            this.modValues = [];
            this.nextModValues = [];
            this.modInsValues = [];
            this.nextModInsValues = [];
            for (let channel: number = 0; channel < this.song.pitchChannelCount + this.song.noiseChannelCount; channel++) {
                latestModInsTimes[channel] = [];
                this.modInsValues[channel] = [];
                this.nextModInsValues[channel] = [];

                for (let instrument: number = 0; instrument < this.song.channels[channel].instruments.length; instrument++) {
                    this.modInsValues[channel][instrument] = [];
                    this.nextModInsValues[channel][instrument] = [];
                    latestModInsTimes[channel][instrument] = [];
                }
            }

            // Find out where we're at in the fraction of the current bar.
            let currentPart: number = this.beat * Config.partsPerBeat + this.part;

            // For mod channels, calculate last set value for each mod
            for (let channelIndex: number = this.song.pitchChannelCount + this.song.noiseChannelCount; channelIndex < this.song.getChannelCount(); channelIndex++) {
                if (!(this.song.channels[channelIndex].muted)) {

                    let pattern: Pattern | null;

                    for (let currentBar: number = this.bar; currentBar >= 0; currentBar--) {
                        pattern = this.song.getPattern(channelIndex, currentBar);

                        if (pattern != null) {
                            let instrumentIdx: number = pattern.instruments[0];
                            let instrument: Instrument = this.song.channels[channelIndex].instruments[instrumentIdx];
                            let latestPinParts: number[] = [];
                            let latestPinValues: number[] = [];

                            let partsInBar: number = (currentBar == this.bar)
                                ? currentPart
                                : this.findPartsInBar(currentBar);

                            for (const note of pattern.notes) {
                                if (note.start < partsInBar && (latestPinParts[Config.modCount - 1 - note.pitches[0]] == null || note.end > latestPinParts[Config.modCount - 1 - note.pitches[0]])) {
                                    if (note.end <= partsInBar) {
                                        latestPinParts[Config.modCount - 1 - note.pitches[0]] = note.end;
                                        latestPinValues[Config.modCount - 1 - note.pitches[0]] = note.pins[note.pins.length - 1].size;
                                    }
                                    else {
                                        latestPinParts[Config.modCount - 1 - note.pitches[0]] = partsInBar;
                                        // Find the pin where bar change happens, and compute where pin volume would be at that time
                                        for (let pinIdx = 0; pinIdx < note.pins.length; pinIdx++) {
                                            if (note.pins[pinIdx].time + note.start > partsInBar) {
                                                const transitionLength: number = note.pins[pinIdx].time - note.pins[pinIdx - 1].time;
                                                const toNextBarLength: number = partsInBar - note.start - note.pins[pinIdx - 1].time;
                                                const deltaVolume: number = note.pins[pinIdx].size - note.pins[pinIdx - 1].size;

                                                latestPinValues[Config.modCount - 1 - note.pitches[0]] = Math.round(note.pins[pinIdx - 1].size + deltaVolume * toNextBarLength / transitionLength);
                                                pinIdx = note.pins.length;
                                            }
                                        }
                                    }
                                }
                            }

                            // Set modulator value, if it wasn't set in another pattern already scanned
                            for (let mod: number = 0; mod < Config.modCount; mod++) {
                                if (latestPinParts[mod] != null) {
                                    if (Config.modulators[instrument.modulators[mod]].forSong) {
                                        if (latestModTimes[instrument.modulators[mod]] == null || currentBar * Config.partsPerBeat * this.song.beatsPerBar + latestPinParts[mod] > (latestModTimes[instrument.modulators[mod]] as number)) {
                                            this.setModValue(latestPinValues[mod], latestPinValues[mod], mod, instrument.modChannels[mod], instrument.modInstruments[mod], instrument.modulators[mod]);
                                            latestModTimes[instrument.modulators[mod]] = currentBar * Config.partsPerBeat * this.song.beatsPerBar + latestPinParts[mod];
                                        }
                                    }
                                    else {
                                        // Generate list of used instruments
                                        let usedInstruments: number[] = [];
                                        // All
                                        if (instrument.modInstruments[mod] == this.channels[instrument.modChannels[mod]].instruments.length) {
                                            for (let i: number = 0; i < this.channels[instrument.modChannels[mod]].instruments.length; i++) {
                                                usedInstruments.push(i);
                                            }
                                        }
                                        // Active
                                        else if (instrument.modInstruments[mod] > this.channels[instrument.modChannels[mod]].instruments.length) {
                                            const tgtPattern: Pattern | null = this.song.getPattern(instrument.modChannels[mod], currentBar);
                                            if (tgtPattern != null)
                                                usedInstruments = tgtPattern.instruments;
                                        } else {
                                            usedInstruments.push(instrument.modInstruments[mod]);
                                        }
                                        for (let instrumentIndex: number = 0; instrumentIndex < usedInstruments.length; instrumentIndex++) {
                                            // Iterate through all used instruments by this modulator
                                            // Special indices for mod filter targets, since they control multiple things.
                                            const eqFilterParam: boolean = instrument.modulators[mod] == Config.modulators.dictionary["eq filter"].index;
                                            const noteFilterParam: boolean = instrument.modulators[mod] == Config.modulators.dictionary["note filter"].index
                                            let modulatorAdjust: number = instrument.modulators[mod];
                                            if (eqFilterParam) {
                                                modulatorAdjust = Config.modulators.length + instrument.modFilterTypes[mod];
                                            } else if (noteFilterParam) {
                                                // Skip all possible indices for eq filter
                                                modulatorAdjust = Config.modulators.length + 1 + (2 * Config.filterMaxPoints) + instrument.modFilterTypes[mod];
                                            }

                                            if (latestModInsTimes[instrument.modChannels[mod]][usedInstruments[instrumentIndex]][modulatorAdjust] == null || currentBar * Config.partsPerBeat * this.song.beatsPerBar + latestPinParts[mod] > latestModInsTimes[instrument.modChannels[mod]][instrumentIndex][modulatorAdjust]!) {

                                                if (eqFilterParam) {
                                                    let tgtInstrument: Instrument = this.song.channels[instrument.modChannels[mod]].instruments[usedInstruments[instrumentIndex]];
                                                    if (instrument.modFilterTypes[mod] == 0) {
                                                        tgtInstrument.tmpEqFilterStart = tgtInstrument.eqSubFilters[latestPinValues[mod]];
                                                    } else {
                                                        for (let i: number = 0; i < Config.filterMorphCount; i++) {
                                                            if (tgtInstrument.tmpEqFilterStart == tgtInstrument.eqSubFilters[i]) {
                                                                tgtInstrument.tmpEqFilterStart = new FilterSettings();
                                                                tgtInstrument.tmpEqFilterStart.fromJsonObject(tgtInstrument.eqSubFilters[i]!.toJsonObject());
                                                                i = Config.filterMorphCount;
                                                            }
                                                        }
                                                        if (Math.floor((instrument.modFilterTypes[mod] - 1) / 2) < tgtInstrument.tmpEqFilterStart!.controlPointCount) {
                                                            if (instrument.modFilterTypes[mod] % 2)
                                                                tgtInstrument.tmpEqFilterStart!.controlPoints[Math.floor((instrument.modFilterTypes[mod] - 1) / 2)].freq = latestPinValues[mod];
                                                            else
                                                                tgtInstrument.tmpEqFilterStart!.controlPoints[Math.floor((instrument.modFilterTypes[mod] - 1) / 2)].gain = latestPinValues[mod];
                                                        }
                                                    }
                                                    tgtInstrument.tmpEqFilterEnd = tgtInstrument.tmpEqFilterStart;
                                                } else if (noteFilterParam) {
                                                    let tgtInstrument: Instrument = this.song.channels[instrument.modChannels[mod]].instruments[usedInstruments[instrumentIndex]];
                                                    if (instrument.modFilterTypes[mod] == 0) {
                                                        tgtInstrument.tmpNoteFilterStart = tgtInstrument.noteSubFilters[latestPinValues[mod]];
                                                    } else {
                                                        for (let i: number = 0; i < Config.filterMorphCount; i++) {
                                                            if (tgtInstrument.tmpNoteFilterStart == tgtInstrument.noteSubFilters[i]) {
                                                                tgtInstrument.tmpNoteFilterStart = new FilterSettings();
                                                                tgtInstrument.tmpNoteFilterStart.fromJsonObject(tgtInstrument.noteSubFilters[i]!.toJsonObject());
                                                                i = Config.filterMorphCount;
                                                            }
                                                        }
                                                        if (Math.floor((instrument.modFilterTypes[mod] - 1) / 2) < tgtInstrument.tmpNoteFilterStart!.controlPointCount) {
                                                            if (instrument.modFilterTypes[mod] % 2)
                                                                tgtInstrument.tmpNoteFilterStart!.controlPoints[Math.floor((instrument.modFilterTypes[mod] - 1) / 2)].freq = latestPinValues[mod];
                                                            else
                                                                tgtInstrument.tmpNoteFilterStart!.controlPoints[Math.floor((instrument.modFilterTypes[mod] - 1) / 2)].gain = latestPinValues[mod];
                                                        }
                                                    }
                                                    tgtInstrument.tmpNoteFilterEnd = tgtInstrument.tmpNoteFilterStart;
                                                }
                                                else this.setModValue(latestPinValues[mod], latestPinValues[mod], mod, instrument.modChannels[mod], usedInstruments[instrumentIndex], modulatorAdjust);

                                                latestModInsTimes[instrument.modChannels[mod]][instrumentIndex][modulatorAdjust] = currentBar * Config.partsPerBeat * this.song.beatsPerBar + latestPinParts[mod];
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
    }

    // Detects if a modulator is set, but not valid for the current effects/instrument type/filter type
    // Note, setting 'none' or the intermediary steps when clicking to add a mod, like an unset channel/unset instrument, counts as valid.
    // TODO: This kind of check is mirrored in SongEditor.ts' whenUpdated. Creates a lot of redundancy for adding new mods. Can be moved into new properties for mods, to avoid this later.
    public determineInvalidModulators(instrument: Instrument): void {
        if (this.song == null)
            return;
        for (let mod: number = 0; mod < Config.modCount; mod++) {
            instrument.invalidModulators[mod] = true;
            // For song modulator, valid if any setting used
            if (instrument.modChannels[mod] == -1) {
                if (instrument.modulators[mod] != 0)
                    instrument.invalidModulators[mod] = false;
                continue;
            }
            const channel: Channel | null = this.song.channels[instrument.modChannels[mod]];
            if (channel == null) continue;
            let tgtInstrumentList: Instrument[] = [];
            if (instrument.modInstruments[mod] >= channel.instruments.length) { // All or active
                tgtInstrumentList = channel.instruments;
            } else {
                tgtInstrumentList = [channel.instruments[instrument.modInstruments[mod]]];
            }
            for (let i: number = 0; i < tgtInstrumentList.length; i++) {
                const tgtInstrument: Instrument | null = tgtInstrumentList[i];
                if (tgtInstrument == null) continue;
                const str: string = Config.modulators[instrument.modulators[mod]].name;
                // Check effects
                if (!((Config.modulators[instrument.modulators[mod]].associatedEffect != EffectType.length && !(tgtInstrument.effects & (1 << Config.modulators[instrument.modulators[mod]].associatedEffect)))
                    // Instrument type specific
                    || (tgtInstrument.type != InstrumentType.fm && (str == "fm slider 1" || str == "fm slider 2" || str == "fm slider 3" || str == "fm slider 4" || str == "fm feedback"))
                    || (tgtInstrument.type != InstrumentType.pwm && (str == "pulse width"))
                    // Arp check
                    || (!tgtInstrument.getChord().arpeggiates && (str == "arpeggio speed" || str == "reset arpeggio"))
                    // EQ Filter check
                    || (tgtInstrument.eqFilterType && str == "eq filter")
                    || (!tgtInstrument.eqFilterType && (str == "eq filt cut" || str == "eq filt peak"))
                    || (str == "eq filter" && Math.floor((instrument.modFilterTypes[mod] + 1)/2) > tgtInstrument.eqFilter.controlPointCount)
                    // Note Filter check
                    || (tgtInstrument.noteFilterType && str == "note filter")
                    || (!tgtInstrument.noteFilterType && (str == "note filt cut" || str == "note filt peak"))
                    || (str == "note filter" && Math.floor((instrument.modFilterTypes[mod] + 1) / 2) > tgtInstrument.noteFilter.controlPointCount))) {

                    instrument.invalidModulators[mod] = false;
                    i = tgtInstrumentList.length;
                }
            }

        }
    }

    private static operatorAmplitudeCurve(amplitude: number): number {
        return (Math.pow(16.0, amplitude / 15.0) - 1.0) / 15.0;
    }

    public samplesPerSecond: number = 44100;
    public panningDelayBufferSize: number;
    public panningDelayBufferMask: number;
    public chorusDelayBufferSize: number;
    public chorusDelayBufferMask: number;
    // TODO: reverb

    public song: Song | null = null;
    public liveInputDuration: number = 0;
    public liveInputStarted: boolean = false;
    public liveInputPitches: number[] = [];
    public liveInputChannel: number = 0;
    public liveInputInstruments: number[] = [];
    public loopRepeatCount: number = -1;
    public volume: number = 1.0;
    public renderingSong: boolean = false;

    private wantToSkip: boolean = false;
    private playheadInternal: number = 0.0;
    private bar: number = 0;
    private prevBar: number | null = null;
    private nextBar: number | null = null;
    private beat: number = 0;
    private part: number = 0;
    private tick: number = 0;
    public isAtStartOfTick: boolean = true;
    public isAtEndOfTick: boolean = true;
    public tickSampleCountdown: number = 0;
    private modValues: (number | null)[] = [];
    private modInsValues: (number | null)[][][] = [];
    private nextModValues: (number | null)[] = [];
    private nextModInsValues: (number | null)[][][] = [];
    private isPlayingSong: boolean = false;
    private liveInputEndTime: number = 0.0;
    private browserAutomaticallyClearsAudioBuffer: boolean = true; // Assume true until proven otherwise. Older Chrome does not clear the buffer so it needs to be cleared manually.

    public static readonly tempFilterStartCoefficients: FilterCoefficients = new FilterCoefficients();
    public static readonly tempFilterEndCoefficients: FilterCoefficients = new FilterCoefficients();
    private tempDrumSetControlPoint: FilterControlPoint = new FilterControlPoint();
    public tempFrequencyResponse: FrequencyResponse = new FrequencyResponse();

    private static readonly fmSynthFunctionCache: Dictionary<Function> = {};
    private static readonly effectsFunctionCache: Function[] = Array(1 << 7).fill(undefined); // keep in sync with the number of post-process effects.
    private static readonly pickedStringFunctionCache: Function[] = Array(3).fill(undefined); // keep in sync with the number of unison voices.

    private readonly channels: ChannelState[] = [];
    private readonly tonePool: Deque<Tone> = new Deque<Tone>();
    private readonly tempMatchedPitchTones: Array<Tone | null> = Array(Config.maxChordSize).fill(null);
    //private readonly activeModTones: Array<Array<Deque<Tone>>> = [];
    //private readonly releasedModTones: Array<Array<Deque<Tone>>> = [];

    //private highpassInput: number = 0.0;
    //private highpassOutput: number = 0.0;
    private limit: number = 0.0;

    private tempMonoInstrumentSampleBuffer: Float32Array | null = null;

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
            this.tickSampleCountdown = samplesPerTick - remainder;
            this.prevBar = null;
        }
    }

    public getSamplesPerBar(): number {
        if (this.song == null) throw new Error();
        return this.getSamplesPerTick() * Config.ticksPerPart * Config.partsPerBeat * this.song.beatsPerBar;
    }

    public getTicksIntoBar(): number {
        return (this.beat * Config.partsPerBeat + this.part) * Config.ticksPerPart + this.tick;
    }
    public getCurrentPart(): number {
        return (this.beat * Config.partsPerBeat + this.part);
    }

    private findPartsInBar(bar: number): number {
        if (this.song == null) return 0;
        let partsInBar: number = Config.partsPerBeat * this.song.beatsPerBar;
        for (let channel: number = this.song.pitchChannelCount + this.song.noiseChannelCount; channel < this.song.getChannelCount(); channel++) {
            let pattern: Pattern | null = this.song.getPattern(channel, bar);
            if (pattern != null) {
                let instrument: Instrument = this.song.channels[channel].instruments[pattern.instruments[0]];
                for (let mod: number = 0; mod < Config.modCount; mod++) {
                    if (instrument.modulators[mod] == Config.modulators.dictionary["next bar"].index) {
                        for (const note of pattern.notes) {
                            if (note.pitches[0] == (Config.modCount - 1 - mod)) {
                                // Find the earliest next bar note.
                                if (partsInBar > note.start)
                                    partsInBar = note.start;
                            }
                        }
                    }
                }
            }
        }
        return partsInBar;
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
        let prevTempo: number = this.song.tempo;

        // Determine if any tempo or next bar mods happen anywhere in the window
        for (let channel: number = this.song.pitchChannelCount + this.song.noiseChannelCount; channel < this.song.getChannelCount(); channel++) {
            for (let bar: number = startBar; bar < endBar; bar++) {
                let pattern: Pattern | null = this.song.getPattern(channel, bar);
                if (pattern != null) {
                    let instrument: Instrument = this.song.channels[channel].instruments[pattern.instruments[0]];
                    for (let mod: number = 0; mod < Config.modCount; mod++) {
                        if (instrument.modulators[mod] == Config.modulators.dictionary["tempo"].index) {
                            hasTempoMods = true;
                        }
                        if (instrument.modulators[mod] == Config.modulators.dictionary["next bar"].index) {
                            hasNextBarMods = true;
                        }
                    }
                }
            }
        }

        // If intro is not zero length, determine what the "entry" tempo is going into the start part, by looking at mods that came before...
        if (startBar > 0) {
            let latestTempoPin: number | null = null;
            let latestTempoValue: number = 0;

            for (let bar: number = startBar - 1; bar >= 0; bar--) {
                for (let channel: number = this.song.pitchChannelCount + this.song.noiseChannelCount; channel < this.song.getChannelCount(); channel++) {
                    let pattern = this.song.getPattern(channel, bar);

                    if (pattern != null) {
                        let instrumentIdx: number = pattern.instruments[0];
                        let instrument: Instrument = this.song.channels[channel].instruments[instrumentIdx];

                        let partsInBar: number = this.findPartsInBar(bar);

                        for (const note of pattern.notes) {
                            if (instrument.modulators[Config.modCount - 1 - note.pitches[0]] == Config.modulators.dictionary["tempo"].index) {
                                if (note.start < partsInBar && (latestTempoPin == null || note.end > latestTempoPin)) {
                                    if (note.end <= partsInBar) {
                                        latestTempoPin = note.end;
                                        latestTempoValue = note.pins[note.pins.length - 1].size;
                                    }
                                    else {
                                        latestTempoPin = partsInBar;
                                        // Find the pin where bar change happens, and compute where pin volume would be at that time
                                        for (let pinIdx = 0; pinIdx < note.pins.length; pinIdx++) {
                                            if (note.pins[pinIdx].time + note.start > partsInBar) {
                                                const transitionLength: number = note.pins[pinIdx].time - note.pins[pinIdx - 1].time;
                                                const toNextBarLength: number = partsInBar - note.start - note.pins[pinIdx - 1].time;
                                                const deltaVolume: number = note.pins[pinIdx].size - note.pins[pinIdx - 1].size;

                                                latestTempoValue = Math.round(note.pins[pinIdx - 1].size + deltaVolume * toNextBarLength / transitionLength);
                                                pinIdx = note.pins.length;
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                // Done once you process a pattern where tempo mods happened, since the search happens backward
                if (latestTempoPin != null) {
                    prevTempo = latestTempoValue + Config.modulators.dictionary["tempo"].convertRealFactor;
                    bar = -1;
                }
            }
        }

        if (hasTempoMods || hasNextBarMods) {
            // Run from start bar to end bar and observe looping, computing average tempo across each bar
            let bar: number = startBar;
            let ended: boolean = false;
            let totalSamples: number = 0;

            while (!ended) {
                // Compute the subsection of the pattern that will play
                let partsInBar: number = Config.partsPerBeat * this.song.beatsPerBar;
                let currentPart: number = 0;

                if (hasNextBarMods) {
                    partsInBar = this.findPartsInBar(bar);
                }

                // Compute average tempo in this tick window, or use last tempo if nothing happened
                if (hasTempoMods) {
                    let foundMod: boolean = false;
                    for (let channel: number = this.song.pitchChannelCount + this.song.noiseChannelCount; channel < this.song.getChannelCount(); channel++) {
                        if (foundMod == false) {
                            let pattern: Pattern | null = this.song.getPattern(channel, bar);
                            if (pattern != null) {
                                let instrument: Instrument = this.song.channels[channel].instruments[pattern.instruments[0]];
                                for (let mod: number = 0; mod < Config.modCount; mod++) {
                                    if (foundMod == false && instrument.modulators[mod] == Config.modulators.dictionary["tempo"].index
                                        && pattern.notes.find(n => n.pitches[0] == (Config.modCount - 1 - mod))) {
                                        // Only the first tempo mod instrument for this bar will be checked (well, the first with a note in this bar).
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
                                                            const prevPinTempo: number = note.pins[pinIdx - 1].size + Config.modulators.dictionary["tempo"].convertRealFactor;
                                                            let currPinTempo: number = note.pins[pinIdx].size + Config.modulators.dictionary["tempo"].convertRealFactor;
                                                            if (note.pins[pinIdx].time + note.start > partsInBar) {
                                                                // Compute an intermediary tempo since bar changed over mid-pin. Maybe I'm deep in "what if" territory now!
                                                                currPinTempo = note.pins[pinIdx - 1].size + (note.pins[pinIdx].size - note.pins[pinIdx - 1].size) * (partsInBar - (note.start + note.pins[pinIdx - 1].time)) / (note.pins[pinIdx].time - note.pins[pinIdx - 1].time) + Config.modulators.dictionary["tempo"].convertRealFactor;
                                                            }
                                                            let bpmScalar: number = Config.partsPerBeat * Config.ticksPerPart / 60;

                                                            if (currPinTempo != prevPinTempo) {

                                                                // Definite integral of SamplesPerTick w/r/t beats to find total samples from start point to end point for a variable tempo
                                                                // The starting formula is
                                                                // SamplesPerTick = SamplesPerSec / ((PartsPerBeat * TicksPerPart) / SecPerMin) * BeatsPerMin )
                                                                //
                                                                // This is an expression of samples per tick "instantaneously", and it can be multiplied by a number of ticks to get a sample count.
                                                                // But this isn't the full story. BeatsPerMin, e.g. tempo, changes throughout the interval so it has to be expressed in terms of ticks, "t"
                                                                // ( Also from now on PartsPerBeat, TicksPerPart, and SecPerMin are combined into one scalar, called "BPMScalar" )
                                                                // Substituting BPM for a step variable that moves with respect to the current tick, we get
                                                                // SamplesPerTick = SamplesPerSec / (BPMScalar * ( (EndTempo - StartTempo / TickLength) * t + StartTempo ) )
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
        this.computeDelayBufferSizes();
        if (song != null) this.setSong(song);
    }

    public setSong(song: Song | string): void {
        if (typeof (song) == "string") {
            this.song = new Song(song);
        } else if (song instanceof Song) {
            this.song = song;
        }
        this.prevBar = null;
    }

    private computeDelayBufferSizes(): void {
        this.panningDelayBufferSize = Synth.fittingPowerOfTwo(this.samplesPerSecond * Config.panDelaySecondsMax);
        this.panningDelayBufferMask = this.panningDelayBufferSize - 1;
        this.chorusDelayBufferSize = Synth.fittingPowerOfTwo(this.samplesPerSecond * Config.chorusMaxDelay);
        this.chorusDelayBufferMask = this.chorusDelayBufferSize - 1;
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

            this.computeDelayBufferSizes();
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
        this.activateAudio();
        this.warmUpSynthesizer(this.song);
        this.computeLatestModValues();
    }

    public pause(): void {
        if (!this.isPlayingSong) return;
        this.isPlayingSong = false;
        this.modValues = [];
        this.nextModValues = [];
        if (this.song != null) {
            this.song.inVolumeCap = 0.0;
            this.song.outVolumeCap = 0.0;
            for (let channelIndex: number = 0; channelIndex < this.song.pitchChannelCount + this.song.noiseChannelCount; channelIndex++) {
                this.modInsValues[channelIndex] = [];
                this.nextModInsValues[channelIndex] = [];
            }
        }
    }

    public resetEffects(): void {
        this.limit = 0.0;
        this.freeAllTones();
        if (this.song != null) {
            for (const channelState of this.channels) {
                for (const instrumentState of channelState.instruments) {
                    instrumentState.resetAllEffects();
                }
            }
        }
    }

    public setModValue(volumeStart: number, volumeEnd: number, mod: number, channelIndex: number, instrumentIndex: number, setting: number): number {
        let val: number = volumeStart + Config.modulators[setting].convertRealFactor;
        let nextVal: number = volumeEnd + Config.modulators[setting].convertRealFactor;
        if (Config.modulators[setting].forSong) {
            if (this.modValues[setting] == null || this.modValues[setting] != val || this.nextModValues[setting] != nextVal) {
                this.modValues[setting] = val;
                this.nextModValues[setting] = nextVal;
            }
        } else {
            if (this.modInsValues[channelIndex][instrumentIndex][setting] == null
                || this.modInsValues[channelIndex][instrumentIndex][setting] != val
                || this.nextModInsValues[channelIndex][instrumentIndex][setting] != nextVal) {
                this.modInsValues[channelIndex][instrumentIndex][setting] = val;
                this.nextModInsValues[channelIndex][instrumentIndex][setting] = nextVal;
            }
        }

        return val;
    }

    public getModValue(setting: number, channel?: number | null, instrument?: number | null, nextVal?: boolean): number {
        const forSong: boolean = Config.modulators[setting].forSong;
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
        for (let setting: number = 0; setting < Config.modulators.length; setting++) {
            if ((this.modValues != undefined && this.modValues[setting] != null)
                || (this.modInsValues != undefined && this.modInsValues[channel] != undefined && this.modInsValues[channel][instrument] != undefined && this.modInsValues[channel][instrument][setting] != null)) {
                return true;
            }
        }
        return false;
    }

    public unsetMod(setting: number, channel?: number, instrument?: number) {
        if (this.isModActive(setting) || (channel != undefined && instrument != undefined && this.isModActive(setting, channel, instrument))) {
            this.modValues[setting] = null;
            this.nextModValues[setting] = null;
            if (channel != undefined && instrument != undefined) {
                this.modInsValues[channel][instrument][setting] = null;
                this.nextModInsValues[channel][instrument][setting] = null;
            }
        }
    }

    public isFilterModActive(forNoteFilter: boolean, channelIdx: number, instrumentIdx: number) {
        const instrument: Instrument = this.song!.channels[channelIdx].instruments[instrumentIdx];

        if (forNoteFilter) {
            if (instrument.noteFilterType)
                return false;
            if (instrument.tmpNoteFilterEnd != null)
                return true;
        }
        else {
            if (instrument.eqFilterType)
                return false;
            if (instrument.tmpEqFilterEnd != null)
                return true;
        }
        return false
    }

    public isModActive(setting: number, channel?: number, instrument?: number): boolean {
        const forSong: boolean = Config.modulators[setting].forSong;
        if (forSong) {
            return (this.modValues != undefined && this.modValues[setting] != null);
        } else if (channel != undefined && instrument != undefined && this.modInsValues != undefined && this.modInsValues[channel] != null && this.modInsValues[channel][instrument] != null) {
            return (this.modInsValues[channel][instrument][setting] != null);
        }
        return false;
    }

    public snapToStart(): void {
        this.bar = 0;
        this.resetEffects();
        this.snapToBar();
    }

    public goToBar(bar: number): void {
        this.bar = bar;
        this.resetEffects();
        this.playheadInternal = this.bar;
    }

    public snapToBar(): void {
        this.playheadInternal = this.bar;
        this.beat = 0;
        this.part = 0;
        this.tick = 0;
        this.tickSampleCountdown = 0;
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

    public goToNextBar(): void {
        if (!this.song) return;
        this.prevBar = this.bar;
        const oldBar: number = this.bar;
        this.bar++;
        if (this.bar >= this.song.barCount) {
            this.bar = 0;
        }
        this.playheadInternal += this.bar - oldBar;

        if (this.playing)
            this.computeLatestModValues();
    }

    public goToPrevBar(): void {
        if (!this.song) return;
        this.prevBar = null;
        const oldBar: number = this.bar;
        this.bar--;
        if (this.bar < 0 || this.bar >= this.song.barCount) {
            this.bar = this.song.barCount - 1;
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

    private audioProcessCallback = (audioProcessingEvent: any): void => {
        const outputBuffer = audioProcessingEvent.outputBuffer;
        const outputDataL: Float32Array = outputBuffer.getChannelData(0);
        const outputDataR: Float32Array = outputBuffer.getChannelData(1);

        if (this.browserAutomaticallyClearsAudioBuffer && (outputDataL[0] != 0.0 || outputDataR[0] != 0.0 || outputDataL[outputBuffer.length - 1] != 0.0 || outputDataR[outputBuffer.length - 1] != 0.0)) {
            // If the buffer is ever initially nonzero, then this must be an older browser that doesn't automatically clear the audio buffer.
            this.browserAutomaticallyClearsAudioBuffer = false;
        }
        if (!this.browserAutomaticallyClearsAudioBuffer) {
            // If this browser does not clear the buffer automatically, do so manually before continuing.
            const length: number = outputBuffer.length;
            for (let i: number = 0; i < length; i++) {
                outputDataL[i] = 0.0;
                outputDataR[i] = 0.0;
            }
        }

        const isPlayingLiveTones = performance.now() < this.liveInputEndTime;
        if (!isPlayingLiveTones && !this.isPlayingSong) {
            this.deactivateAudio();
        } else {
            this.synthesize(outputDataL, outputDataR, outputBuffer.length, this.isPlayingSong);
        }
    }

    public synthesize(outputDataL: Float32Array, outputDataR: Float32Array, outputBufferLength: number, playSong: boolean = true): void {
        if (this.song == null) {
            for (let i: number = 0; i < outputBufferLength; i++) {
                outputDataL[i] = 0.0;
                outputDataR[i] = 0.0;
            }
            this.deactivateAudio();
            return;
        }

        const song: Song = this.song;
        this.song.inVolumeCap = 0.0 // Reset volume cap for this run
        this.song.outVolumeCap = 0.0;

        let samplesPerTick: number = this.getSamplesPerTick();
        let ended: boolean = false;

        // Check the bounds of the playhead:
        while (this.tickSampleCountdown <= 0) this.tickSampleCountdown += samplesPerTick;
        if (this.tickSampleCountdown > samplesPerTick) this.tickSampleCountdown = samplesPerTick;
        if (playSong) {
            if (this.beat >= song.beatsPerBar) {
                this.bar++;
                this.beat = 0;
                this.part = 0;
                this.tick = 0;
                this.tickSampleCountdown = samplesPerTick;

                if (this.loopRepeatCount != 0 && this.bar == song.loopStart + song.loopLength) {
                    this.bar = song.loopStart;
                    if (this.loopRepeatCount > 0) this.loopRepeatCount--;
                }
            }
            if (this.bar >= song.barCount) {
                this.bar = 0;
                if (this.loopRepeatCount != -1) {
                    ended = true;
                    this.pause();
                }
            }
        }

        //const synthStartTime: number = performance.now();

        this.syncSongState();

        if (this.tempMonoInstrumentSampleBuffer == null || this.tempMonoInstrumentSampleBuffer.length < outputBufferLength) {
            this.tempMonoInstrumentSampleBuffer = new Float32Array(outputBufferLength);
        }

        // Post processing parameters:
        const volume: number = +this.volume;
        const limitDecay: number = 1.0 - Math.pow(0.5, 4.0 / this.samplesPerSecond);
        const limitRise: number = 1.0 - Math.pow(0.5, 4000.0 / this.samplesPerSecond);
        let limit: number = +this.limit;

        let bufferIndex: number = 0;
        while (bufferIndex < outputBufferLength && !ended) {

            this.nextBar = this.bar + 1;
            if (this.loopRepeatCount != 0 && this.nextBar == song.loopStart + song.loopLength) {
                this.nextBar = song.loopStart;
            }
            if (this.nextBar >= song.barCount) this.nextBar = null;

            const samplesLeftInBuffer: number = outputBufferLength - bufferIndex;
            const samplesLeftInTick: number = Math.ceil(this.tickSampleCountdown);
            const runLength: number = Math.min(samplesLeftInTick, samplesLeftInBuffer);
            this.isAtEndOfTick = (runLength >= this.tickSampleCountdown);

            // Handle mod synth
            if (this.isPlayingSong || this.renderingSong) {
                for (let channelIndex: number = song.pitchChannelCount + song.noiseChannelCount; channelIndex < song.getChannelCount(); channelIndex++) {
                    const channel: Channel = song.channels[channelIndex];
                    const channelState: ChannelState = this.channels[channelIndex];

                    this.determineCurrentActiveTones(song, channelIndex, playSong);

                    for (let instrumentIndex: number = 0; instrumentIndex < channel.instruments.length; instrumentIndex++) {
                        const instrumentState: InstrumentState = channelState.instruments[instrumentIndex];

                        for (let i: number = 0; i < instrumentState.activeModTones.count(); i++) {
                            const tone: Tone = instrumentState.activeModTones.get(i);
                            this.playModTone(song, channelIndex, samplesPerTick, bufferIndex, runLength, tone, false, false);
                        }
                    }
                }
            }

            // Handle next bar mods if they were set
            if (this.wantToSkip) {
                this.wantToSkip = false;
                this.skipBar();
            }

            for (let channelIndex: number = 0; channelIndex < song.pitchChannelCount + song.noiseChannelCount; channelIndex++) {
                const channel: Channel = song.channels[channelIndex];
                const channelState: ChannelState = this.channels[channelIndex];

                this.determineCurrentActiveTones(song, channelIndex, playSong);
                this.determineLiveInputTones(song, channelIndex);

                for (let instrumentIndex: number = 0; instrumentIndex < channel.instruments.length; instrumentIndex++) {
                    const instrument: Instrument = channel.instruments[instrumentIndex];
                    const instrumentState: InstrumentState = channelState.instruments[instrumentIndex];
                    let tonesPlayedInThisInstrument: number = 0;

                    for (let i: number = 0; i < instrumentState.activeTones.count(); i++) {
                        const tone: Tone = instrumentState.activeTones.get(i);
                        this.playTone(song, channelIndex, samplesPerTick, bufferIndex, runLength, tone, false, false);
                        tonesPlayedInThisInstrument++;
                    }

                    for (let i: number = 0; i < instrumentState.liveInputTones.count(); i++) {
                        const tone: Tone = instrumentState.liveInputTones.get(i);
                        this.playTone(song, channelIndex, samplesPerTick, bufferIndex, runLength, tone, false, false);
                        tonesPlayedInThisInstrument++;
                    }

                    for (let i: number = 0; i < instrumentState.releasedTones.count(); i++) {
                        const tone: Tone = instrumentState.releasedTones.get(i);
                        if (tone.ticksSinceReleased >= Math.abs(instrument.getFadeOutTicks())) {
                            this.freeReleasedTone(instrumentState, i);
                            i--;
                            continue;
                        }
                        const shouldFadeOutFast: boolean = (tonesPlayedInThisInstrument >= Config.maximumTonesPerChannel);
                        this.playTone(song, channelIndex, samplesPerTick, bufferIndex, runLength, tone, true, shouldFadeOutFast);
                        tonesPlayedInThisInstrument++;
                    }

                    if (instrumentState.awake) {
                        if (!instrumentState.computed) {
                            instrumentState.compute(this, instrument, samplesPerTick, runLength, null, channelIndex, instrumentIndex);
                        }

                        Synth.effectsSynth(this, outputDataL, outputDataR, bufferIndex, runLength, instrument, instrumentState);

                        instrumentState.computed = false;
                        //instrumentState.envelopeComputer.clearEnvelopes(instrument);
                    }

                    // Update LFO time for instruments (used to be deterministic based on bar position but now vibrato/arp speed messes that up!)

                    const tickSampleCountdown: number = this.tickSampleCountdown;
                    const startRatio: number = 1.0 - (tickSampleCountdown) / samplesPerTick;
                    const endRatio: number = 1.0 - (tickSampleCountdown - runLength) / samplesPerTick;
                    const ticksIntoBar: number = (this.beat * Config.partsPerBeat + this.part) * Config.ticksPerPart + this.tick;
                    const partTimeTickStart: number = (ticksIntoBar) / Config.ticksPerPart;
                    const partTimeTickEnd: number = (ticksIntoBar + 1) / Config.ticksPerPart;
                    const partTimeStart: number = partTimeTickStart + (partTimeTickEnd - partTimeTickStart) * startRatio;
                    const partTimeEnd: number = partTimeTickStart + (partTimeTickEnd - partTimeTickStart) * endRatio;
                    let useVibratoSpeed: number = instrument.vibratoSpeed;

                    instrument.LFOtime = instrument.nextLFOtime;

                    if (this.isModActive(Config.modulators.dictionary["vibrato speed"].index, channelIndex, instrumentIndex)) {
                        useVibratoSpeed = this.getModValue(Config.modulators.dictionary["vibrato speed"].index, channelIndex, instrumentIndex);
                    }

                    if (useVibratoSpeed == 0) {
                        instrument.LFOtime = 0;
                        instrument.nextLFOtime = 0;
                    }
                    else {
                        instrument.nextLFOtime += useVibratoSpeed * 0.1 * (partTimeEnd - partTimeStart);
                    }
                }
            }



            // Post processing:
            const runEnd: number = bufferIndex + runLength;
            for (let i: number = bufferIndex; i < runEnd; i++) {
                // A compressor/limiter.
                const sampleL = outputDataL[i] * song.masterGain * song.masterGain;
                const sampleR = outputDataR[i] * song.masterGain * song.masterGain;
                const absL: number = sampleL < 0.0 ? -sampleL : sampleL;
                const absR: number = sampleR < 0.0 ? -sampleR : sampleR;
                const abs: number = absL > absR ? absL : absR;
                this.song.inVolumeCap = (this.song.inVolumeCap > abs ? this.song.inVolumeCap : abs); // Analytics, spit out raw input volume
                // Determines which formula to use. 0 when volume is between [0, compressionThreshold], 1 when between (compressionThreshold, limitThreshold], 2 above
                const limitRange: number = (+(abs > song.compressionThreshold)) + (+(abs > song.limitThreshold));
                // Determine the target amplification based on the range of the curve
                const limitTarget: number =
                    (+(limitRange == 0)) * (((abs + 1 - song.compressionThreshold) * 0.8 + 0.25) * song.compressionRatio + 1.05 * (1 - song.compressionRatio))
                    + (+(limitRange == 1)) * (1.05)
                    + (+(limitRange == 2)) * (1.05 * ((abs + 1 - song.limitThreshold) * song.limitRatio + (1 - song.limitThreshold)));
                // Move the limit towards the target
                limit += ((limitTarget - limit) * (limit < limitTarget ? limitRise : limitDecay));
                const limitedVolume = volume / (limit >= 1 ? limit * 1.05 : limit * 0.8 + 0.25);
                outputDataL[i] = sampleL * limitedVolume;
                outputDataR[i] = sampleR * limitedVolume;

                this.song.outVolumeCap = (this.song.outVolumeCap > abs * limitedVolume ? this.song.outVolumeCap : abs * limitedVolume); // Analytics, spit out limited output volume
            }

            bufferIndex += runLength;

            this.isAtStartOfTick = false;
            this.tickSampleCountdown -= runLength;
            if (this.tickSampleCountdown <= 0) {
                this.isAtStartOfTick = true;

                // Track how long tones have been released, and free them if there are too many.
                // Also reset awake InstrumentStates that didn't have any Tones during this tick.
                for (const channelState of this.channels) {
                    for (const instrumentState of channelState.instruments) {
                        for (let i: number = 0; i < instrumentState.releasedTones.count(); i++) {
                            const tone: Tone = instrumentState.releasedTones.get(i);
                            if (tone.isOnLastTick) {
                                this.freeReleasedTone(instrumentState, i);
                                i--;
                            } else {
                                tone.ticksSinceReleased++;
                            }
                        }
                        if (instrumentState.deactivateAfterThisTick) {
                            instrumentState.deactivate();
                        }
                        instrumentState.tonesAddedInThisTick = false;
                    }
                }

                // Update arpeggio time, which is used to calculate arpeggio position
                for (let channel: number = 0; channel < this.song.pitchChannelCount + this.song.noiseChannelCount; channel++) {
                    for (let instrumentIdx: number = 0; instrumentIdx < this.song.channels[channel].instruments.length; instrumentIdx++) {
                        let instrument: Instrument = this.song.channels[channel].instruments[instrumentIdx];
                        let useArpeggioSpeed: number = instrument.arpeggioSpeed;
                        if (this.isModActive(Config.modulators.dictionary["arp speed"].index, channel, instrumentIdx)) {
                            useArpeggioSpeed = this.getModValue(Config.modulators.dictionary["arp speed"].index, channel, instrumentIdx, false);
                            if (Number.isInteger(useArpeggioSpeed)) {
                                instrument.arpTime += Config.arpSpeedScale[useArpeggioSpeed];
                            } else {
                                // Linear interpolate arpeggio values
                                instrument.arpTime += (1 - (useArpeggioSpeed % 1)) * Config.arpSpeedScale[Math.floor(useArpeggioSpeed)] + (useArpeggioSpeed % 1) * Config.arpSpeedScale[Math.ceil(useArpeggioSpeed)];
                            }
                        }
                        else {
                            instrument.arpTime += Config.arpSpeedScale[useArpeggioSpeed];
                        }
                    }
                }

                // Update next-used filters after each run
                for (let channel: number = 0; channel < this.song.pitchChannelCount + this.song.noiseChannelCount; channel++) {
                    for (let instrumentIdx: number = 0; instrumentIdx < this.song.channels[channel].instruments.length; instrumentIdx++) {
                        let instrument: Instrument = this.song.channels[channel].instruments[instrumentIdx];
                        if (instrument.tmpEqFilterEnd != null) {
                            instrument.tmpEqFilterStart = instrument.tmpEqFilterEnd;
                        } else {
                            instrument.tmpEqFilterStart = instrument.eqFilter;
                        }
                        if (instrument.tmpNoteFilterEnd != null) {
                            instrument.tmpNoteFilterStart = instrument.tmpNoteFilterEnd;
                        } else {
                            instrument.tmpNoteFilterStart = instrument.noteFilter;
                        }
                    }
                }

                this.tick++;
                this.tickSampleCountdown += samplesPerTick;
                if (this.tick == Config.ticksPerPart) {
                    this.tick = 0;
                    this.part++;
                    this.liveInputDuration--;

                    if (this.part == Config.partsPerBeat) {
                        this.part = 0;

                        if (playSong) {
                            this.beat++;
                            if (this.beat == song.beatsPerBar) {
                                // bar changed, reset for next bar:
                                this.beat = 0;
                                this.prevBar = this.bar;
                                this.bar++;
                                if (this.loopRepeatCount != 0 && this.bar == song.loopStart + song.loopLength) {
                                    this.bar = song.loopStart;
                                    if (this.loopRepeatCount > 0) this.loopRepeatCount--;
                                }
                                if (this.bar >= song.barCount) {
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
            for (let setting: number = 0; setting < Config.modulators.length; setting++) {
                if (this.nextModValues != null && this.nextModValues[setting] != null)
                    this.modValues[setting] = this.nextModValues[setting];
            }

            // Set samples per tick if song tempo mods changed it
            if (this.isModActive(Config.modulators.dictionary["tempo"].index)) {
                samplesPerTick = this.getSamplesPerTick();
                this.tickSampleCountdown = Math.min(this.tickSampleCountdown, samplesPerTick);
            }

            // Bound LFO times to be within their period (to keep values from getting large)
            // I figured this modulo math probably doesn't have to happen every LFO tick.
            for (let channel: number = 0; channel < this.song.pitchChannelCount; channel++) {
                for (let instrument of this.song.channels[channel].instruments) {
                    instrument.nextLFOtime = (instrument.nextLFOtime % (Config.vibratoTypes[instrument.vibratoType].period / (Config.ticksPerPart * samplesPerTick / this.samplesPerSecond)));
                    instrument.arpTime = (instrument.arpTime % (2520 * Config.ticksPerArpeggio)); // 2520 = LCM of 4, 5, 6, 7, 8, 9 (arp sizes)
                }
            }

            for (let setting: number = 0; setting < Config.modulators.length; setting++) {
                for (let channel: number = 0; channel < this.song.pitchChannelCount + this.song.noiseChannelCount; channel++) {
                    for (let instrument: number = 0; instrument < this.song.getMaxInstrumentsPerChannel(); instrument++) {
                        if (this.nextModInsValues != null && this.nextModInsValues[channel] != null && this.nextModInsValues[channel][instrument] != null && this.nextModInsValues[channel][instrument][setting] != null) {
                            this.modInsValues[channel][instrument][setting] = this.nextModInsValues[channel][instrument][setting];
                        }
                    }
                }
            }
        }

        // Optimization: Avoid persistent reverb values in the float denormal range.
        if (!Number.isFinite(limit) || Math.abs(limit) < epsilon) limit = 0.0;

        //this.highpassInput = highpassInput;
        //this.highpassOutput = highpassOutput;
        this.limit = limit;

        if (playSong) {
            this.playheadInternal = (((this.tick + 1.0 - this.tickSampleCountdown / samplesPerTick) / 2.0 + this.part) / Config.partsPerBeat + this.beat) / song.beatsPerBar + this.bar;
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
            tone.freshlyAllocated = true;
            return tone;
        }
        return new Tone();
    }

    private releaseTone(instrumentState: InstrumentState, tone: Tone): void {
        instrumentState.releasedTones.pushFront(tone);
        tone.atNoteStart = false;
        tone.passedEndOfNote = true;
    }

    private freeReleasedTone(instrumentState: InstrumentState, toneIndex: number): void {
        this.freeTone(instrumentState.releasedTones.get(toneIndex));
        instrumentState.releasedTones.remove(toneIndex);
    }

    public freeAllTones(): void {
        for (const channelState of this.channels) {
            for (const instrumentState of channelState.instruments) {
                while (instrumentState.activeTones.count() > 0) this.freeTone(instrumentState.activeTones.popBack());
                while (instrumentState.activeModTones.count() > 0) this.freeTone(instrumentState.activeModTones.popBack());
                while (instrumentState.releasedTones.count() > 0) this.freeTone(instrumentState.releasedTones.popBack());
                while (instrumentState.liveInputTones.count() > 0) this.freeTone(instrumentState.liveInputTones.popBack());
            }
        }
    }

    private determineLiveInputTones(song: Song, channelIndex: number): void {
        const channel: Channel = song.channels[channelIndex];
        const channelState: ChannelState = this.channels[channelIndex];
        const pitches: number[] = this.liveInputPitches;

        for (let instrumentIndex: number = 0; instrumentIndex < channel.instruments.length; instrumentIndex++) {
            const instrumentState: InstrumentState = channelState.instruments[instrumentIndex];
            const toneList: Deque<Tone> = instrumentState.liveInputTones;
            let toneCount: number = 0;
            if (this.liveInputDuration > 0 && channelIndex == this.liveInputChannel && pitches.length > 0 && this.liveInputInstruments.indexOf(instrumentIndex) != -1) {
                const instrument: Instrument = channel.instruments[instrumentIndex];

                if (instrument.getChord().singleTone) {
                    let tone: Tone;
                    if (toneList.count() <= toneCount) {
                        tone = this.newTone();
                        toneList.pushBack(tone);
                    } else if (!instrument.getTransition().isSeamless && this.liveInputStarted) {
                        this.releaseTone(instrumentState, toneList.get(toneCount));
                        tone = this.newTone();
                        toneList.set(toneCount, tone);
                    } else {
                        tone = toneList.get(toneCount);
                    }
                    toneCount++;

                    for (let i: number = 0; i < pitches.length; i++) {
                        tone.pitches[i] = pitches[i];
                    }
                    tone.pitchCount = pitches.length;
                    tone.chordSize = 1;
                    tone.instrumentIndex = instrumentIndex;
                    tone.note = tone.prevNote = tone.nextNote = null;
                    tone.atNoteStart = this.liveInputStarted;
                    tone.forceContinueAtStart = false;
                    tone.forceContinueAtEnd = false;
                } else {
                    //const transition: Transition = instrument.getTransition();
                    for (let i: number = 0; i < pitches.length; i++) {
                        //const strumOffsetParts: number = i * instrument.getChord().strumParts;

                        let tone: Tone;
                        if (toneList.count() <= toneCount) {
                            tone = this.newTone();
                            toneList.pushBack(tone);
                        } else if (!instrument.getTransition().isSeamless && this.liveInputStarted) {
                            this.releaseTone(instrumentState, toneList.get(toneCount));
                            tone = this.newTone();
                            toneList.set(toneCount, tone);
                        } else {
                            tone = toneList.get(toneCount);
                        }
                        toneCount++;

                        tone.pitches[0] = pitches[i];
                        tone.pitchCount = 1;
                        tone.chordSize = pitches.length;
                        tone.instrumentIndex = instrumentIndex;
                        tone.note = tone.prevNote = tone.nextNote = null;
                        tone.atNoteStart = this.liveInputStarted;
                        tone.forceContinueAtStart = false;
                        tone.forceContinueAtEnd = false;
                    }
                }
            }

            while (toneList.count() > toneCount) {
                this.releaseTone(instrumentState, toneList.popBack());
            }
        }

        this.liveInputStarted = false;
    }

    // Returns the chord type of the instrument in the adjacent pattern if it is compatible for a
    // seamless transition across patterns, otherwise returns null.
    private adjacentPatternHasCompatibleInstrumentTransition(song: Song, channel: Channel, pattern: Pattern, otherPattern: Pattern, instrumentIndex: number, transition: Transition, chord: Chord, note: Note, otherNote: Note, forceContinue: boolean): Chord | null {
        if (song.patternInstruments && otherPattern.instruments.indexOf(instrumentIndex) == -1) {
            // The adjacent pattern does not contain the same instrument as the current pattern.

            if (pattern.instruments.length > 1 || otherPattern.instruments.length > 1) {
                // The current or adjacent pattern contains more than one instrument, don't bother
                // trying to connect them.
                return null;
            }
            // Otherwise, the two patterns each contain one instrument, but not the same instrument.
            // Try to connect them.
            const otherInstrument: Instrument = channel.instruments[otherPattern.instruments[0]];

            if (forceContinue) {
                // Even non-seamless instruments can be connected across patterns if forced.
                return otherInstrument.getChord();
            }

            // Otherwise, check that both instruments are seamless across patterns.
            const otherTransition: Transition = otherInstrument.getTransition();
            if (transition.includeAdjacentPatterns && otherTransition.includeAdjacentPatterns && otherTransition.slides == transition.slides) {
                return otherInstrument.getChord();
            } else {
                return null;
            }
        } else {
            // If both patterns contain the same instrument, check that it is seamless across patterns.
            return (forceContinue || transition.includeAdjacentPatterns) ? chord : null;
        }
    }

    public static adjacentNotesHaveMatchingPitches(firstNote: Note, secondNote: Note): boolean {
        if (firstNote.pitches.length != secondNote.pitches.length) return false;
        const firstNoteInterval: number = firstNote.pins[firstNote.pins.length - 1].interval;
        for (const pitch of firstNote.pitches) {
            if (secondNote.pitches.indexOf(pitch + firstNoteInterval) == -1) return false;
        }
        return true;
    }

    private determineCurrentActiveTones(song: Song, channelIndex: number, playSong: boolean): void {
        const channel: Channel = song.channels[channelIndex];
        const channelState: ChannelState = this.channels[channelIndex];
        const pattern: Pattern | null = song.getPattern(channelIndex, this.bar);
        const currentPart: number = this.getCurrentPart();
        const currentTick: number = this.tick + Config.ticksPerPart * currentPart;

        if (playSong && song.getChannelIsMod(channelIndex)) {

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

            if (pattern != null && !channel.muted) {
                for (let i: number = 0; i < pattern.notes.length; i++) {
                    if (pattern.notes[i].end <= currentPart) {
                        // Actually need to check which note starts closer to the start of this note.
                        if (prevNotes[pattern.notes[i].pitches[0]] == null || pattern.notes[i].end > (prevNotes[pattern.notes[i].pitches[0]] as Note).start) {
                            prevNotes[pattern.notes[i].pitches[0]] = pattern.notes[i];
                        }
                    }
                    else if (pattern.notes[i].start <= currentPart && pattern.notes[i].end > currentPart) {
                        notes[pattern.notes[i].pitches[0]] = pattern.notes[i];
                    }
                    else if (pattern.notes[i].start > currentPart) {
                        // Actually need to check which note starts closer to the end of this note.
                        if (nextNotes[pattern.notes[i].pitches[0]] == null || pattern.notes[i].start < (nextNotes[pattern.notes[i].pitches[0]] as Note).start) {
                            nextNotes[pattern.notes[i].pitches[0]] = pattern.notes[i];
                        }
                    }
                }
            }

            let modToneCount: number = 0;
            const instrumentState: InstrumentState = channelState.instruments[0];
            const toneList: Deque<Tone> = instrumentState.activeModTones;
            for (let mod: number = 0; mod < Config.modCount; mod++) {
                if (notes[mod] != null) {
                    if (prevNotes[mod] != null && (prevNotes[mod] as Note).end != (notes[mod] as Note).start) prevNotes[mod] = null;
                    if (nextNotes[mod] != null && (nextNotes[mod] as Note).start != (notes[mod] as Note).end) nextNotes[mod] = null;

                }

                const newInstrumentIndex: number = (song.patternInstruments && (pattern != null)) ? pattern!.instruments[0] : 0;
                if (channelState.singleSeamlessInstrument != null && channelState.singleSeamlessInstrument != newInstrumentIndex && channelState.singleSeamlessInstrument < channelState.instruments.length) {
                    const sourceInstrumentState: InstrumentState = channelState.instruments[channelState.singleSeamlessInstrument];
                    const destInstrumentState: InstrumentState = channelState.instruments[newInstrumentIndex];
                    while (sourceInstrumentState.activeModTones.count() > 0) {
                        destInstrumentState.activeModTones.pushFront(sourceInstrumentState.activeModTones.popBack());
                    }
                }
                channelState.singleSeamlessInstrument = newInstrumentIndex;

                if (notes[mod] != null) {
                    let prevNoteForThisInstrument: Note | null = prevNotes[mod];
                    let nextNoteForThisInstrument: Note | null = nextNotes[mod];

                    let forceContinueAtStart: boolean = false;
                    let forceContinueAtEnd: boolean = false;
                    const atNoteStart: boolean = (Config.ticksPerPart * notes[mod]!.start == currentTick) && this.isAtStartOfTick;
                    let tone: Tone;
                    if (toneList.count() <= modToneCount) {
                        tone = this.newTone();
                        toneList.pushBack(tone);
                    } else if (atNoteStart && (prevNoteForThisInstrument == null)) {
                        const oldTone: Tone = toneList.get(modToneCount);
                        if (oldTone.isOnLastTick) {
                            this.freeTone(oldTone);
                        } else {
                            this.releaseTone(instrumentState, oldTone);
                        }
                        tone = this.newTone();
                        toneList.set(modToneCount, tone);
                    } else {
                        tone = toneList.get(modToneCount);
                    }
                    modToneCount++;

                    for (let i: number = 0; i < notes[mod]!.pitches.length; i++) {
                        tone.pitches[i] = notes[mod]!.pitches[i];
                    }
                    tone.pitchCount = notes[mod]!.pitches.length;
                    tone.chordSize = 1;
                    tone.instrumentIndex = newInstrumentIndex;
                    tone.note = notes[mod];
                    tone.noteStartPart = notes[mod]!.start;
                    tone.noteEndPart = notes[mod]!.end;
                    tone.prevNote = prevNoteForThisInstrument;
                    tone.nextNote = nextNoteForThisInstrument;
                    tone.prevNotePitchIndex = 0;
                    tone.nextNotePitchIndex = 0;
                    tone.atNoteStart = atNoteStart;
                    tone.passedEndOfNote = false;
                    tone.forceContinueAtStart = forceContinueAtStart;
                    tone.forceContinueAtEnd = forceContinueAtEnd;
                }
            }
            // Automatically free or release seamless tones if there's no new note to take over.
            while (toneList.count() > modToneCount) {
                const tone: Tone = toneList.popBack();
                const channel: Channel = song.channels[channelIndex];
                if (tone.instrumentIndex < channel.instruments.length && !tone.isOnLastTick) {
                    const instrumentState: InstrumentState = this.channels[channelIndex].instruments[tone.instrumentIndex];
                    this.releaseTone(instrumentState, tone);
                } else {
                    this.freeTone(tone);
                }
            }

        }
        else if (!song.getChannelIsMod(channelIndex)) {

            let note: Note | null = null;
            let prevNote: Note | null = null;
            let nextNote: Note | null = null;

            if (playSong && pattern != null && !channel.muted) {
                for (let i: number = 0; i < pattern.notes.length; i++) {
                    if (pattern.notes[i].end <= currentPart) {
                        prevNote = pattern.notes[i];
                    } else if (pattern.notes[i].start <= currentPart && pattern.notes[i].end > currentPart) {
                        note = pattern.notes[i];
                    } else if (pattern.notes[i].start > currentPart) {
                        nextNote = pattern.notes[i];
                        break;
                    }
                }

                if (note != null) {
                    if (prevNote != null && prevNote.end != note.start) prevNote = null;
                    if (nextNote != null && nextNote.start != note.end) nextNote = null;
                }
            }

            // Seamless tones from a pattern with a single instrument can be transferred to a different single seamless instrument in the next pattern.
            if (pattern != null && (!song.layeredInstruments || channel.instruments.length == 1 || (song.patternInstruments && pattern.instruments.length == 1))) {
                const newInstrumentIndex: number = song.patternInstruments ? pattern.instruments[0] : 0;
                if (channelState.singleSeamlessInstrument != null && channelState.singleSeamlessInstrument != newInstrumentIndex && channelState.singleSeamlessInstrument < channelState.instruments.length) {
                    const sourceInstrumentState: InstrumentState = channelState.instruments[channelState.singleSeamlessInstrument];
                    const destInstrumentState: InstrumentState = channelState.instruments[newInstrumentIndex];
                    while (sourceInstrumentState.activeTones.count() > 0) {
                        destInstrumentState.activeTones.pushFront(sourceInstrumentState.activeTones.popBack());
                    }
                }
                channelState.singleSeamlessInstrument = newInstrumentIndex;
            } else {
                channelState.singleSeamlessInstrument = null;
            }

            for (let instrumentIndex: number = 0; instrumentIndex < channel.instruments.length; instrumentIndex++) {
                const instrumentState: InstrumentState = channelState.instruments[instrumentIndex];
                const toneList: Deque<Tone> = instrumentState.activeTones;
                let toneCount: number = 0;
                if ((note != null) && (!song.patternInstruments || (pattern!.instruments.indexOf(instrumentIndex) != -1))) {
                    const instrument: Instrument = channel.instruments[instrumentIndex];
                    let prevNoteForThisInstrument: Note | null = prevNote;
                    let nextNoteForThisInstrument: Note | null = nextNote;

                    const partsPerBar: Number = Config.partsPerBeat * song.beatsPerBar;
                    const transition: Transition = instrument.getTransition();
                    const chord: Chord = instrument.getChord();
                    let forceContinueAtStart: boolean = false;
                    let forceContinueAtEnd: boolean = false;
                    let tonesInPrevNote: number = 0;
                    let tonesInNextNote: number = 0;
                    if (note.start == 0) {
                        // If the beginning of the note coincides with the beginning of the pattern,
                        let prevPattern: Pattern | null = (this.prevBar == null) ? null : song.getPattern(channelIndex, this.prevBar);
                        if (prevPattern != null) {
                            const lastNote: Note | null = (prevPattern.notes.length <= 0) ? null : prevPattern.notes[prevPattern.notes.length - 1];
                            if (lastNote != null && lastNote.end == partsPerBar) {
                                const patternForcesContinueAtStart: boolean = note.continuesLastPattern && Synth.adjacentNotesHaveMatchingPitches(lastNote, note);
                                const chordOfCompatibleInstrument: Chord | null = this.adjacentPatternHasCompatibleInstrumentTransition(song, channel, pattern!, prevPattern, instrumentIndex, transition, chord, note, lastNote, patternForcesContinueAtStart);
                                if (chordOfCompatibleInstrument != null) {
                                    prevNoteForThisInstrument = lastNote;
                                    tonesInPrevNote = chordOfCompatibleInstrument.singleTone ? 1 : prevNoteForThisInstrument.pitches.length
                                    forceContinueAtStart = patternForcesContinueAtStart;
                                }
                            }
                        }
                    } else if (prevNoteForThisInstrument != null) {
                        tonesInPrevNote = chord.singleTone ? 1 : prevNoteForThisInstrument.pitches.length
                    }
                    if (note.end == partsPerBar) {
                        // If the end of the note coincides with the end of the pattern, look for an
                        // adjacent note at the beginning of the next pattern.
                        let nextPattern: Pattern | null = (this.nextBar == null) ? null : song.getPattern(channelIndex, this.nextBar);
                        if (nextPattern != null) {
                            const firstNote: Note | null = (nextPattern.notes.length <= 0) ? null : nextPattern.notes[0];
                            if (firstNote != null && firstNote.start == 0) {
                                const nextPatternForcesContinueAtStart: boolean = firstNote.continuesLastPattern && Synth.adjacentNotesHaveMatchingPitches(note, firstNote);
                                const chordOfCompatibleInstrument: Chord | null = this.adjacentPatternHasCompatibleInstrumentTransition(song, channel, pattern!, nextPattern, instrumentIndex, transition, chord, note, firstNote, nextPatternForcesContinueAtStart);
                                if (chordOfCompatibleInstrument != null) {
                                    nextNoteForThisInstrument = firstNote;
                                    tonesInNextNote = chordOfCompatibleInstrument.singleTone ? 1 : nextNoteForThisInstrument.pitches.length
                                    forceContinueAtEnd = nextPatternForcesContinueAtStart;
                                }
                            }
                        }
                    } else if (nextNoteForThisInstrument != null) {
                        tonesInNextNote = chord.singleTone ? 1 : nextNoteForThisInstrument.pitches.length
                    }

                    if (chord.singleTone) {
                        const atNoteStart: boolean = (Config.ticksPerPart * note.start == currentTick) && this.isAtStartOfTick;
                        let tone: Tone;
                        if (toneList.count() <= toneCount) {
                            tone = this.newTone();
                            toneList.pushBack(tone);
                        } else if (atNoteStart && ((!(transition.isSeamless || instrument.clicklessTransition) && !forceContinueAtStart) || prevNoteForThisInstrument == null)) {
                            const oldTone: Tone = toneList.get(toneCount);
                            if (oldTone.isOnLastTick) {
                                this.freeTone(oldTone);
                            } else {
                                this.releaseTone(instrumentState, oldTone);
                            }
                            tone = this.newTone();
                            toneList.set(toneCount, tone);
                        } else {
                            tone = toneList.get(toneCount);
                        }
                        toneCount++;

                        for (let i: number = 0; i < note.pitches.length; i++) {
                            tone.pitches[i] = note.pitches[i];
                        }
                        tone.pitchCount = note.pitches.length;
                        tone.chordSize = 1;
                        tone.instrumentIndex = instrumentIndex;
                        tone.note = note;
                        tone.noteStartPart = note.start;
                        tone.noteEndPart = note.end;
                        tone.prevNote = prevNoteForThisInstrument;
                        tone.nextNote = nextNoteForThisInstrument;
                        tone.prevNotePitchIndex = 0;
                        tone.nextNotePitchIndex = 0;
                        tone.atNoteStart = atNoteStart;
                        tone.passedEndOfNote = false;
                        tone.forceContinueAtStart = forceContinueAtStart;
                        tone.forceContinueAtEnd = forceContinueAtEnd;
                    } else {
                        const transition: Transition = instrument.getTransition();

                        if (((transition.isSeamless && !transition.slides && chord.strumParts == 0) || forceContinueAtStart) && (Config.ticksPerPart * note.start == currentTick) && this.isAtStartOfTick && prevNoteForThisInstrument != null) {
                            // The tones are about to seamlessly transition to a new note. The pitches
                            // from the old note may or may not match any of the pitches in the new
                            // note, and not necessarily in order, but if any do match, they'll sound
                            // better if those tones continue to have the same pitch. Attempt to find
                            // the right spot for each old tone in the new chord if possible.

                            for (let i: number = 0; i < toneList.count(); i++) {
                                const tone: Tone = toneList.get(i);
                                const pitch: number = tone.pitches[0] + tone.lastInterval;
                                for (let j: number = 0; j < note.pitches.length; j++) {
                                    if (note.pitches[j] == pitch) {
                                        this.tempMatchedPitchTones[j] = tone;
                                        toneList.remove(i);
                                        i--;
                                        break;
                                    }
                                }
                            }

                            // Any tones that didn't get matched should just fill in the gaps.
                            while (toneList.count() > 0) {
                                const tone: Tone = toneList.popFront();
                                for (let j: number = 0; j < this.tempMatchedPitchTones.length; j++) {
                                    if (this.tempMatchedPitchTones[j] == null) {
                                        this.tempMatchedPitchTones[j] = tone;
                                        break;
                                    }
                                }
                            }
                        }

                        let strumOffsetParts: number = 0;
                        for (let i: number = 0; i < note.pitches.length; i++) {

                            let prevNoteForThisTone: Note | null = (tonesInPrevNote > i) ? prevNoteForThisInstrument : null;
                            let noteForThisTone: Note = note;
                            let nextNoteForThisTone: Note | null = (tonesInNextNote > i) ? nextNoteForThisInstrument : null;
                            let noteStartPart: number = noteForThisTone.start + strumOffsetParts;
                            let passedEndOfNote: boolean = false;

                            // Strumming may mean that a note's actual start time may be after the
                            // note's displayed start time. If the note start hasn't been reached yet,
                            // carry over the previous tone if available and seamless, otherwise skip
                            // the new tone until it is ready to start.
                            if (noteStartPart > currentPart) {
                                if (toneList.count() > i && (transition.isSeamless || forceContinueAtStart) && prevNoteForThisTone != null) {
                                    // Continue the previous note's chord until the current one takes over.
                                    nextNoteForThisTone = noteForThisTone;
                                    noteForThisTone = prevNoteForThisTone;
                                    prevNoteForThisTone = null;
                                    noteStartPart = noteForThisTone.start + strumOffsetParts;
                                    passedEndOfNote = true;
                                } else {
                                    // This and the rest of the tones in the chord shouldn't start yet.
                                    break;
                                }
                            }

                            let noteEndPart: number = noteForThisTone.end;
                            if ((transition.isSeamless || forceContinueAtStart) && nextNoteForThisTone != null) {
                                noteEndPart = Math.min(Config.partsPerBeat * this.song!.beatsPerBar, noteEndPart + strumOffsetParts);
                            }
                            if ((!transition.continues && !forceContinueAtStart) || prevNoteForThisTone == null) {
                                strumOffsetParts += chord.strumParts;
                            }

                            const atNoteStart: boolean = (Config.ticksPerPart * noteStartPart == currentTick) && this.isAtStartOfTick;
                            let tone: Tone;
                            if (this.tempMatchedPitchTones[toneCount] != null) {
                                tone = this.tempMatchedPitchTones[toneCount]!;
                                this.tempMatchedPitchTones[toneCount] = null;
                                toneList.pushBack(tone);
                            } else if (toneList.count() <= toneCount) {
                                tone = this.newTone();
                                toneList.pushBack(tone);
                            } else if (atNoteStart && ((!transition.isSeamless && !forceContinueAtStart) || prevNoteForThisTone == null)) {
                                const oldTone: Tone = toneList.get(toneCount);
                                if (oldTone.isOnLastTick) {
                                    this.freeTone(oldTone);
                                } else {
                                    this.releaseTone(instrumentState, oldTone);
                                }
                                tone = this.newTone();
                                toneList.set(toneCount, tone);
                            } else {
                                tone = toneList.get(toneCount);
                            }
                            toneCount++;

                            tone.pitches[0] = noteForThisTone.pitches[i];
                            tone.pitchCount = 1;
                            tone.chordSize = noteForThisTone.pitches.length;
                            tone.instrumentIndex = instrumentIndex;
                            tone.note = noteForThisTone;
                            tone.noteStartPart = noteStartPart;
                            tone.noteEndPart = noteEndPart;
                            tone.prevNote = prevNoteForThisTone;
                            tone.nextNote = nextNoteForThisTone;
                            tone.prevNotePitchIndex = i;
                            tone.nextNotePitchIndex = i;
                            tone.atNoteStart = atNoteStart;
                            tone.passedEndOfNote = passedEndOfNote;
                            tone.forceContinueAtStart = forceContinueAtStart && prevNoteForThisTone != null;
                            tone.forceContinueAtEnd = forceContinueAtEnd && nextNoteForThisTone != null;
                        }
                    }
                }
                // Automatically free or release seamless tones if there's no new note to take over.
                while (toneList.count() > toneCount) {
                    const tone: Tone = toneList.popBack();
                    const channel: Channel = song.channels[channelIndex];
                    if (tone.instrumentIndex < channel.instruments.length && !tone.isOnLastTick) {
                        const instrumentState: InstrumentState = this.channels[channelIndex].instruments[tone.instrumentIndex];
                        this.releaseTone(instrumentState, tone);
                    } else {
                        this.freeTone(tone);
                    }
                }

                for (let i: number = toneCount; i < this.tempMatchedPitchTones.length; i++) {
                    const oldTone: Tone | null = this.tempMatchedPitchTones[i];
                    if (oldTone != null) {
                        if (oldTone.isOnLastTick) {
                            this.freeTone(oldTone);
                        } else {
                            this.releaseTone(instrumentState, oldTone);
                        }
                        this.tempMatchedPitchTones[i] = null;
                    }
                }
            }
        }
    }

    private playTone(song: Song, channelIndex: number, samplesPerTick: number, bufferIndex: number, runLength: number, tone: Tone, released: boolean, shouldFadeOutFast: boolean): void {
        const channel: Channel = song.channels[channelIndex];
        const channelState: ChannelState = this.channels[channelIndex];
        const instrument: Instrument = channel.instruments[tone.instrumentIndex];
        const instrumentState: InstrumentState = channelState.instruments[tone.instrumentIndex];

        instrumentState.awake = true;
        instrumentState.tonesAddedInThisTick = true;
        if (!instrumentState.computed) {
            instrumentState.compute(this, instrument, samplesPerTick, runLength, tone, channelIndex, tone.instrumentIndex);
        }

        Synth.computeTone(this, song, channelIndex, samplesPerTick, runLength, tone, released, shouldFadeOutFast);
        const synthesizer: Function = Synth.getInstrumentSynthFunction(instrument);
        synthesizer(this, bufferIndex, runLength, tone, instrument);
        tone.envelopeComputer.clearEnvelopes(instrument);
    }

    // Computes mod note position at the start and end of the window and "plays" the mod tone, setting appropriate mod data.
    private playModTone(song: Song, channelIndex: number, samplesPerTick: number, bufferIndex: number, runLength: number, tone: Tone, released: boolean, shouldFadeOutFast: boolean): void {
        const channel: Channel = song.channels[channelIndex];
        const instrument: Instrument = channel.instruments[tone.instrumentIndex];

        if (tone.note != null) {
            const ticksIntoBar: number = this.getTicksIntoBar();
            const partTimeTickStart: number = (ticksIntoBar) / Config.ticksPerPart;
            const partTimeTickEnd: number = (ticksIntoBar + 1) / Config.ticksPerPart;
            const tickSampleCountdown: number = this.tickSampleCountdown;
            const startRatio: number = 1.0 - (tickSampleCountdown) / samplesPerTick;
            const endRatio: number = 1.0 - (tickSampleCountdown - runLength) / samplesPerTick;
            const partTimeStart: number = partTimeTickStart + (partTimeTickEnd - partTimeTickStart) * startRatio;
            const partTimeEnd: number = partTimeTickStart + (partTimeTickEnd - partTimeTickStart) * endRatio;
            const tickTimeStart: number = Config.ticksPerPart * partTimeStart;
            const tickTimeEnd: number = Config.ticksPerPart * partTimeEnd;
            const endPinIndex: number = tone.note.getEndPinIndex(this.getCurrentPart());
            const startPin: NotePin = tone.note.pins[endPinIndex - 1];
            const endPin: NotePin = tone.note.pins[endPinIndex];
            const startPinTick: number = (tone.note.start + startPin.time) * Config.ticksPerPart;
            const endPinTick: number = (tone.note.start + endPin.time) * Config.ticksPerPart;
            const ratioStart: number = (tickTimeStart - startPinTick) / (endPinTick - startPinTick);
            const ratioEnd: number = (tickTimeEnd - startPinTick) / (endPinTick - startPinTick);
            tone.expressionStarts[0] = startPin.size + (endPin.size - startPin.size) * ratioStart;
            tone.expressionDeltas[0] = (startPin.size + (endPin.size - startPin.size) * ratioEnd) - tone.expressionStarts[0];

            Synth.modSynth(this, bufferIndex, runLength, tone, instrument);
        }
    }

    private static computeChordExpression(chordSize: number): number {
        return 1.0 / ((chordSize - 1) * 0.25 + 1.0);
    }

    private static computeTone(synth: Synth, song: Song, channelIndex: number, samplesPerTick: number, runLength: number, tone: Tone, released: boolean, shouldFadeOutFast: boolean): void {
        const channel: Channel = song.channels[channelIndex];
        const instrument: Instrument = channel.instruments[tone.instrumentIndex];
        const transition: Transition = instrument.getTransition();
        const chord: Chord = instrument.getChord();
        const chordExpression: number = chord.singleTone ? 1.0 : Synth.computeChordExpression(tone.chordSize);
        const isNoiseChannel: boolean = song.getChannelIsNoise(channelIndex);
        const intervalScale: number = isNoiseChannel ? Config.noiseInterval : 1;
        const secondsPerPart: number = Config.ticksPerPart * samplesPerTick / synth.samplesPerSecond;
        const sampleTime: number = 1.0 / synth.samplesPerSecond;
        const beatsPerPart: number = 1.0 / Config.partsPerBeat;
        const tickSampleCountdown: number = synth.tickSampleCountdown;
        const startRatio: number = 1.0 - (tickSampleCountdown) / samplesPerTick;
        const endRatio: number = 1.0 - (tickSampleCountdown - runLength) / samplesPerTick;
        const ticksIntoBar: number = synth.getTicksIntoBar();
        const partTimeTickStart: number = (ticksIntoBar) / Config.ticksPerPart;
        const partTimeTickEnd: number = (ticksIntoBar + 1) / Config.ticksPerPart;
        const partTimeStart: number = partTimeTickStart + (partTimeTickEnd - partTimeTickStart) * startRatio;
        const partTimeEnd: number = partTimeTickStart + (partTimeTickEnd - partTimeTickStart) * endRatio;
        const currentPart: number = synth.getCurrentPart();

        tone.specialIntervalMult = 1.0;
        tone.specialIntervalExpressionMult = 1.0;

        //if (synth.isModActive(ModSetting.mstPan, channelIndex, tone.instrumentIndex)) {
        //    startPan = synth.getModValue(ModSetting.mstPan, false, channel, instrumentIdx, false);
        //    endPan = synth.getModValue(ModSetting.mstPan, false, channel, instrumentIdx, true);
        //}

        let toneIsOnLastTick: boolean = shouldFadeOutFast;
        let intervalStart: number = 0.0;
        let intervalEnd: number = 0.0;
        let transitionExpressionStart: number = 1.0;
        let transitionExpressionEnd: number = 1.0;
        let chordExpressionStart: number = chordExpression;
        let chordExpressionEnd: number = chordExpression;

        let expressionReferencePitch: number = 16; // A low "E" as a MIDI pitch.
        let basePitch: number = Config.keys[song.key].basePitch;
        let baseExpression: number = 1.0;
        let pitchDamping: number = 48;
        if (instrument.type == InstrumentType.spectrum) {
            baseExpression = Config.spectrumBaseExpression;
            if (isNoiseChannel) {
                basePitch = Config.spectrumBasePitch;
                baseExpression *= 2.0; // Note: spectrum is louder for drum channels than pitch channels!
            }
            expressionReferencePitch = Config.spectrumBasePitch;
            pitchDamping = 28;
        } else if (instrument.type == InstrumentType.drumset) {
            basePitch = Config.spectrumBasePitch;
            baseExpression = Config.drumsetBaseExpression;
            expressionReferencePitch = basePitch;
        } else if (instrument.type == InstrumentType.noise) {
            basePitch = Config.chipNoises[instrument.chipNoise].basePitch;
            baseExpression = Config.noiseBaseExpression;
            expressionReferencePitch = basePitch;
            pitchDamping = Config.chipNoises[instrument.chipNoise].isSoft ? 24.0 : 60.0;
        } else if (instrument.type == InstrumentType.fm) {
            baseExpression = Config.fmBaseExpression;
        } else if (instrument.type == InstrumentType.chip || instrument.type == InstrumentType.customChipWave) {
            baseExpression = Config.chipBaseExpression;
        } else if (instrument.type == InstrumentType.harmonics) {
            baseExpression = Config.harmonicsBaseExpression;
        } else if (instrument.type == InstrumentType.pwm) {
            baseExpression = Config.pwmBaseExpression;
        } else if (instrument.type == InstrumentType.pickedString) {
            baseExpression = Config.pickedStringBaseExpression;
        } else if (instrument.type == InstrumentType.mod) {
            baseExpression = 1.0;
            expressionReferencePitch = 0;
            pitchDamping = 1.0;
            basePitch = 0;
        } else {
            throw new Error("Unknown instrument type in computeTone.");
        }

        if ((tone.atNoteStart && !transition.isSeamless && !tone.forceContinueAtStart) || tone.freshlyAllocated) {
            tone.reset();
        }
        tone.freshlyAllocated = false;

        const maxWaves: number = Math.max(Config.maxChordSize, Config.operatorCount);
        for (let i: number = 0; i < maxWaves; i++) {
            tone.phaseDeltas[i] = 0.0;
            tone.expressionStarts[i] = 0.0;
            tone.expressionDeltas[i] = 0.0;
            tone.phaseDeltaScales[i] = 0.0;
        }

        if (released) {
            const startTicksSinceReleased: number = tone.ticksSinceReleased + startRatio;
            const endTicksSinceReleased: number = tone.ticksSinceReleased + endRatio;
            intervalStart = intervalEnd = tone.lastInterval;
            const fadeOutTicks: number = Math.abs(instrument.getFadeOutTicks());
            transitionExpressionStart = Synth.noteSizeToVolumeMult((1.0 - startTicksSinceReleased / fadeOutTicks) * Config.noteSizeMax);
            transitionExpressionEnd = Synth.noteSizeToVolumeMult((1.0 - endTicksSinceReleased / fadeOutTicks) * Config.noteSizeMax);

            if (shouldFadeOutFast) {
                transitionExpressionStart *= 1.0 - startRatio;
                transitionExpressionEnd *= 1.0 - endRatio;
            }

            if (tone.ticksSinceReleased + 1 >= fadeOutTicks) toneIsOnLastTick = true;
        } else if (tone.note == null) {
            transitionExpressionStart = transitionExpressionEnd = 1;
            tone.lastInterval = 0;
            tone.ticksSinceReleased = 0;
            tone.liveInputSamplesHeld += runLength;
        } else {
            const note: Note = tone.note;
            const nextNote: Note | null = tone.nextNote;

            const noteStartPart: number = tone.noteStartPart;
            const noteEndPart: number = tone.noteEndPart;


            const endPinIndex: number = note.getEndPinIndex(currentPart);
            const startPin: NotePin = note.pins[endPinIndex - 1];
            const endPin: NotePin = note.pins[endPinIndex];
            const noteStartTick: number = noteStartPart * Config.ticksPerPart;
            const noteEndTick: number = noteEndPart * Config.ticksPerPart;
            const pinStart: number = (note.start + startPin.time) * Config.ticksPerPart;
            const pinEnd: number = (note.start + endPin.time) * Config.ticksPerPart;

            tone.ticksSinceReleased = 0;

            const tickTimeStart: number = currentPart * Config.ticksPerPart + synth.tick;
            const tickTimeEnd: number = currentPart * Config.ticksPerPart + synth.tick + 1;
            const noteTicksPassedTickStart: number = tickTimeStart - noteStartTick;
            const noteTicksPassedTickEnd: number = tickTimeEnd - noteStartTick;
            const pinRatioStart: number = Math.min(1.0, (tickTimeStart - pinStart) / (pinEnd - pinStart));
            const pinRatioEnd: number = Math.min(1.0, (tickTimeEnd - pinStart) / (pinEnd - pinStart));
            let transitionExpressionTickStart: number = 1.0;
            let transitionExpressionTickEnd: number = 1.0;
            let intervalTickStart: number = startPin.interval + (endPin.interval - startPin.interval) * pinRatioStart;
            let intervalTickEnd: number = startPin.interval + (endPin.interval - startPin.interval) * pinRatioEnd;
            tone.lastInterval = intervalTickEnd;

            if ((!transition.isSeamless && !tone.forceContinueAtEnd) || nextNote == null) {
                const fadeOutTicks: number = -instrument.getFadeOutTicks();
                if (fadeOutTicks > 0.0) {
                    // If the tone should fade out before the end of the note, do so here.
                    const noteLengthTicks: number = noteEndTick - noteStartTick;
                    transitionExpressionTickStart *= Math.min(1.0, (noteLengthTicks - noteTicksPassedTickStart) / fadeOutTicks);
                    transitionExpressionTickEnd *= Math.min(1.0, (noteLengthTicks - noteTicksPassedTickEnd) / fadeOutTicks);
                    if (tickTimeEnd >= noteStartTick + noteLengthTicks) toneIsOnLastTick = true;
                }
            }

            intervalStart = intervalTickStart + (intervalTickEnd - intervalTickStart) * startRatio;
            intervalEnd = intervalTickStart + (intervalTickEnd - intervalTickStart) * endRatio;
            transitionExpressionStart = transitionExpressionTickStart + (transitionExpressionTickEnd - transitionExpressionTickStart) * startRatio;
            transitionExpressionEnd = transitionExpressionTickStart + (transitionExpressionTickEnd - transitionExpressionTickStart) * endRatio;
        }

        tone.isOnLastTick = toneIsOnLastTick;

        let tmpNoteFilter: FilterSettings = instrument.noteFilter;
        let startPoint: FilterControlPoint;
        let endPoint: FilterControlPoint;
        let filterChanges: boolean = false;

        if (instrument.noteFilterType) {
            // Simple EQ filter (old style). For analysis, using random filters from normal style since they are N/A in this context.
            const noteFilterSettingsStart: FilterSettings = instrument.noteFilter;
            if (instrument.noteSubFilters[1] == null)
                instrument.noteSubFilters[1] = new FilterSettings();
            const noteFilterSettingsEnd: FilterSettings = instrument.noteSubFilters[1];

            // Change location based on slider values
            let startSimpleFreq: number = instrument.noteFilterSimpleCut;
            let startSimpleGain: number = instrument.noteFilterSimplePeak;
            let endSimpleFreq: number = instrument.noteFilterSimpleCut;
            let endSimpleGain: number = instrument.noteFilterSimplePeak;

            if (synth.isModActive(Config.modulators.dictionary["note filt cut"].index, channelIndex, tone.instrumentIndex)) {
                startSimpleFreq = synth.getModValue(Config.modulators.dictionary["note filt cut"].index, channelIndex, tone.instrumentIndex, false);
                endSimpleFreq = synth.getModValue(Config.modulators.dictionary["note filt cut"].index, channelIndex, tone.instrumentIndex, true);
                filterChanges = true;
            }
            if (synth.isModActive(Config.modulators.dictionary["note filt peak"].index, channelIndex, tone.instrumentIndex)) {
                startSimpleGain = synth.getModValue(Config.modulators.dictionary["note filt peak"].index, channelIndex, tone.instrumentIndex, false);
                endSimpleGain = synth.getModValue(Config.modulators.dictionary["note filt peak"].index, channelIndex, tone.instrumentIndex, true);
                filterChanges = true;
            }

            if (filterChanges) {
                noteFilterSettingsStart.convertLegacySettingsForSynth(startSimpleFreq, startSimpleGain);
                noteFilterSettingsEnd.convertLegacySettingsForSynth(endSimpleFreq, endSimpleGain);

                startPoint = noteFilterSettingsStart.controlPoints[0];
                endPoint = noteFilterSettingsEnd.controlPoints[0];

            } else {
                noteFilterSettingsStart.convertLegacySettingsForSynth(startSimpleFreq, startSimpleGain, true);

                startPoint = noteFilterSettingsStart.controlPoints[0];
            }

            // Temporarily override so that envelope computer uses appropriate computed note filter
            instrument.noteFilter = noteFilterSettingsStart;
            instrument.tmpNoteFilterStart = noteFilterSettingsStart;
        }

        // Compute envelopes *after* resetting the tone, otherwise the envelope computer gets reset too!
        const envelopeComputer: EnvelopeComputer = tone.envelopeComputer;
        envelopeComputer.computeEnvelopes(instrument, currentPart, Config.ticksPerPart * partTimeStart, Config.ticksPerPart * partTimeEnd, secondsPerPart * (partTimeEnd - partTimeStart), tone);
        const envelopeStarts: number[] = tone.envelopeComputer.envelopeStarts;
        const envelopeEnds: number[] = tone.envelopeComputer.envelopeEnds;
        instrument.noteFilter = tmpNoteFilter;

        if (tone.note != null && transition.slides) {
            // Slide interval and chordExpression at the start and/or end of the note if necessary.
            const prevNote: Note | null = tone.prevNote;
            const nextNote: Note | null = tone.nextNote;
            if (prevNote != null) {
                const intervalDiff: number = prevNote.pitches[tone.prevNotePitchIndex] + prevNote.pins[prevNote.pins.length - 1].interval - tone.pitches[0];
                if (envelopeComputer.prevSlideStart) intervalStart += intervalDiff * envelopeComputer.prevSlideRatioStart;
                if (envelopeComputer.prevSlideEnd) intervalEnd += intervalDiff * envelopeComputer.prevSlideRatioEnd;
                if (!chord.singleTone) {
                    const chordSizeDiff: number = prevNote.pitches.length - tone.chordSize;
                    if (envelopeComputer.prevSlideStart) chordExpressionStart = Synth.computeChordExpression(tone.chordSize + chordSizeDiff * envelopeComputer.prevSlideRatioStart);
                    if (envelopeComputer.prevSlideEnd) chordExpressionEnd = Synth.computeChordExpression(tone.chordSize + chordSizeDiff * envelopeComputer.prevSlideRatioEnd);
                }
            }
            if (nextNote != null) {
                const intervalDiff: number = nextNote.pitches[tone.nextNotePitchIndex] - (tone.pitches[0] + tone.note.pins[tone.note.pins.length - 1].interval);
                if (envelopeComputer.nextSlideStart) intervalStart += intervalDiff * envelopeComputer.nextSlideRatioStart;
                if (envelopeComputer.nextSlideEnd) intervalEnd += intervalDiff * envelopeComputer.nextSlideRatioEnd;
                if (!chord.singleTone) {
                    const chordSizeDiff: number = nextNote.pitches.length - tone.chordSize;
                    if (envelopeComputer.nextSlideStart) chordExpressionStart = Synth.computeChordExpression(tone.chordSize + chordSizeDiff * envelopeComputer.nextSlideRatioStart);
                    if (envelopeComputer.nextSlideEnd) chordExpressionEnd = Synth.computeChordExpression(tone.chordSize + chordSizeDiff * envelopeComputer.nextSlideRatioEnd);
                }
            }
        }

        if (effectsIncludePitchShift(instrument.effects)) {
            let pitchShift: number = Config.justIntonationSemitones[instrument.pitchShift] / intervalScale;
            let pitchShiftScalarStart: number = 1.0;
            let pitchShiftScalarEnd: number = 1.0;
            if (synth.isModActive(Config.modulators.dictionary["pitch shift"].index, channelIndex, tone.instrumentIndex)) {
                pitchShift = Config.justIntonationSemitones[Config.justIntonationSemitones.length - 1];
                pitchShiftScalarStart = (synth.getModValue(Config.modulators.dictionary["pitch shift"].index, channelIndex, tone.instrumentIndex, false)) / (Config.pitchShiftCenter);
                pitchShiftScalarEnd = (synth.getModValue(Config.modulators.dictionary["pitch shift"].index, channelIndex, tone.instrumentIndex, true)) / (Config.pitchShiftCenter);
            }
            const envelopeStart: number = envelopeStarts[NoteAutomationIndex.pitchShift];
            const envelopeEnd: number = envelopeEnds[NoteAutomationIndex.pitchShift];
            intervalStart += pitchShift * envelopeStart * pitchShiftScalarStart;
            intervalEnd += pitchShift * envelopeEnd * pitchShiftScalarEnd;
        }
        if (effectsIncludeDetune(instrument.effects) || synth.isModActive(Config.modulators.dictionary["song detune"].index, channelIndex, tone.instrumentIndex)) {
            const envelopeStart: number = envelopeStarts[NoteAutomationIndex.detune];
            const envelopeEnd: number = envelopeEnds[NoteAutomationIndex.detune];
            let modDetuneStart: number = instrument.detune;
            let modDetuneEnd: number = instrument.detune;
            if (synth.isModActive(Config.modulators.dictionary["detune"].index, channelIndex, tone.instrumentIndex)) {
                modDetuneStart = synth.getModValue(Config.modulators.dictionary["detune"].index, channelIndex, tone.instrumentIndex, false) + Config.detuneCenter;
                modDetuneEnd = synth.getModValue(Config.modulators.dictionary["detune"].index, channelIndex, tone.instrumentIndex, true) + Config.detuneCenter;
            }
            if (synth.isModActive(Config.modulators.dictionary["song detune"].index, channelIndex, tone.instrumentIndex)) {
                modDetuneStart += 4*synth.getModValue(Config.modulators.dictionary["song detune"].index, channelIndex, tone.instrumentIndex, false);
                modDetuneEnd += 4*synth.getModValue(Config.modulators.dictionary["song detune"].index, channelIndex, tone.instrumentIndex, true);
            }
            intervalStart += Synth.detuneToCents((modDetuneStart) * envelopeStart) * Config.pitchesPerOctave / (12.0 * 100.0);
            intervalEnd += Synth.detuneToCents((modDetuneEnd) * envelopeEnd) * Config.pitchesPerOctave / (12.0 * 100.0);
        }

        if (effectsIncludeVibrato(instrument.effects)) {
            let delayTicks: number;
            let vibratoAmplitudeStart: number;
            let vibratoAmplitudeEnd: number;
            // Custom vibrato
            if (instrument.vibrato == Config.vibratos.length) {
                delayTicks = instrument.vibratoDelay * 2; // Delay was changed from parts to ticks in BB v9
                // Special case: if vibrato delay is max, NEVER vibrato.
                if (instrument.vibratoDelay == Config.modulators.dictionary["vibrato delay"].maxRawVol)
                    delayTicks = Number.POSITIVE_INFINITY;
                vibratoAmplitudeStart = instrument.vibratoDepth;
                vibratoAmplitudeEnd = vibratoAmplitudeStart;
            } else {
                delayTicks = Config.vibratos[instrument.vibrato].delayTicks;
                vibratoAmplitudeStart = Config.vibratos[instrument.vibrato].amplitude;
                vibratoAmplitudeEnd = vibratoAmplitudeStart;
            }

            if (synth.isModActive(Config.modulators.dictionary["vibrato delay"].index, channelIndex, tone.instrumentIndex)) {
                delayTicks = synth.getModValue(Config.modulators.dictionary["vibrato delay"].index, channelIndex, tone.instrumentIndex, false) * 2; // Delay was changed from parts to ticks in BB v9
                if (delayTicks == Config.modulators.dictionary["vibrato delay"].maxRawVol * 2)
                    delayTicks = Number.POSITIVE_INFINITY;

            }

            if (synth.isModActive(Config.modulators.dictionary["vibrato depth"].index, channelIndex, tone.instrumentIndex)) {
                vibratoAmplitudeStart = synth.getModValue(Config.modulators.dictionary["vibrato depth"].index, channelIndex, tone.instrumentIndex, false) / 25;
                vibratoAmplitudeEnd = synth.getModValue(Config.modulators.dictionary["vibrato depth"].index, channelIndex, tone.instrumentIndex, true) / 25;
            }


            // To maintain pitch continuity, (mostly for picked string which retriggers impulse
            // otherwise) remember the vibrato at the end of this run and reuse it at the start
            // of the next run if available.
            let vibratoStart: number;
            if (tone.prevVibrato != null) {
                vibratoStart = tone.prevVibrato;
            } else {
                let lfoStart: number = Synth.getLFOAmplitude(instrument, secondsPerPart * instrument.LFOtime);
                const vibratoDepthEnvelopeStart: number = envelopeStarts[NoteAutomationIndex.vibratoDepth];
                vibratoStart = vibratoAmplitudeStart * lfoStart * vibratoDepthEnvelopeStart;
                if (delayTicks > 0.0) {
                    const ticksUntilVibratoStart: number = delayTicks - envelopeComputer.noteTicksStart;
                    vibratoStart *= Math.max(0.0, Math.min(1.0, 1.0 - ticksUntilVibratoStart / 2.0));
                }
            }

            let lfoEnd: number = Synth.getLFOAmplitude(instrument, secondsPerPart * instrument.nextLFOtime);
            const vibratoDepthEnvelopeEnd: number = envelopeEnds[NoteAutomationIndex.vibratoDepth];
            if (instrument.type != InstrumentType.mod) {
                let vibratoEnd: number = vibratoAmplitudeEnd * lfoEnd * vibratoDepthEnvelopeEnd;
                if (delayTicks > 0.0) {
                    const ticksUntilVibratoEnd: number = delayTicks - envelopeComputer.noteTicksEnd;
                    vibratoEnd *= Math.max(0.0, Math.min(1.0, 1.0 - ticksUntilVibratoEnd / 2.0));
                }

                tone.prevVibrato = vibratoEnd;

                intervalStart += vibratoStart;
                intervalEnd += vibratoEnd;
            }
        }

        if ((!transition.isSeamless && !tone.forceContinueAtStart) || tone.prevNote == null) {
            // Fade in the beginning of the note.
            const fadeInSeconds: number = instrument.getFadeInSeconds();
            if (fadeInSeconds > 0.0) {
                transitionExpressionStart *= Math.min(1.0, envelopeComputer.noteSecondsStart / fadeInSeconds);
                transitionExpressionEnd *= Math.min(1.0, envelopeComputer.noteSecondsEnd / fadeInSeconds);
            }
        }


        if (instrument.type == InstrumentType.drumset && tone.drumsetPitch == null) {
            // It's possible that the note will change while the user is editing it,
            // but the tone's pitches don't get updated because the tone has already
            // ended and is fading out. To avoid an array index out of bounds error, clamp the pitch.
            tone.drumsetPitch = tone.pitches[0];
            if (tone.note != null) tone.drumsetPitch += tone.note.pickMainInterval();
            tone.drumsetPitch = Math.max(0, Math.min(Config.drumCount - 1, tone.drumsetPitch));
        }

        let noteFilterExpression: number = envelopeComputer.lowpassCutoffDecayVolumeCompensation;
        if (!effectsIncludeNoteFilter(instrument.effects)) {
            tone.noteFilterCount = 0;
        } else {

            const noteAllFreqsEnvelopeStart: number = envelopeStarts[NoteAutomationIndex.noteFilterAllFreqs];
            const noteAllFreqsEnvelopeEnd: number = envelopeEnds[NoteAutomationIndex.noteFilterAllFreqs];

            // Simple note filter
            if (instrument.noteFilterType) {
                const noteFreqEnvelopeStart: number = envelopeStarts[NoteAutomationIndex.noteFilterFreq0];
                const noteFreqEnvelopeEnd: number = envelopeEnds[NoteAutomationIndex.noteFilterFreq0];
                const notePeakEnvelopeStart: number = envelopeStarts[NoteAutomationIndex.noteFilterGain0];
                const notePeakEnvelopeEnd: number = envelopeEnds[NoteAutomationIndex.noteFilterGain0];

                startPoint!.toCoefficients(Synth.tempFilterStartCoefficients, synth.samplesPerSecond, noteAllFreqsEnvelopeStart * noteFreqEnvelopeStart, notePeakEnvelopeStart);

                if (filterChanges) {
                    endPoint!.toCoefficients(Synth.tempFilterEndCoefficients, synth.samplesPerSecond, noteAllFreqsEnvelopeEnd * noteFreqEnvelopeEnd, notePeakEnvelopeEnd);
                }

                if (tone.noteFilters.length < 1) tone.noteFilters[0] = new DynamicBiquadFilter();
                tone.noteFilters[0].loadCoefficientsWithGradient(Synth.tempFilterStartCoefficients, Synth.tempFilterStartCoefficients, 1.0 / runLength, startPoint!.type == FilterType.lowPass);
                noteFilterExpression *= startPoint!.getVolumeCompensationMult();

                tone.noteFilterCount = 1;
            }
            else {
                const noteFilterSettings: FilterSettings = (instrument.tmpNoteFilterStart != null) ? instrument.tmpNoteFilterStart : instrument.noteFilter;

                for (let i: number = 0; i < noteFilterSettings.controlPointCount; i++) {
                    const noteFreqEnvelopeStart: number = envelopeStarts[NoteAutomationIndex.noteFilterFreq0 + i];
                    const noteFreqEnvelopeEnd: number = envelopeEnds[NoteAutomationIndex.noteFilterFreq0 + i];
                    const notePeakEnvelopeStart: number = envelopeStarts[NoteAutomationIndex.noteFilterGain0 + i];
                    const notePeakEnvelopeEnd: number = envelopeEnds[NoteAutomationIndex.noteFilterGain0 + i];
                    const startPoint: FilterControlPoint = noteFilterSettings.controlPoints[i];
                    const endPoint: FilterControlPoint = (instrument.tmpNoteFilterEnd != null && instrument.tmpNoteFilterEnd.controlPoints[i] != null) ? instrument.tmpNoteFilterEnd.controlPoints[i] : noteFilterSettings.controlPoints[i];

                    startPoint.toCoefficients(Synth.tempFilterStartCoefficients, synth.samplesPerSecond, noteAllFreqsEnvelopeStart * noteFreqEnvelopeStart, notePeakEnvelopeStart);
                    endPoint.toCoefficients(Synth.tempFilterEndCoefficients, synth.samplesPerSecond, noteAllFreqsEnvelopeEnd * noteFreqEnvelopeEnd, notePeakEnvelopeEnd);
                    if (tone.noteFilters.length <= i) tone.noteFilters[i] = new DynamicBiquadFilter();
                    tone.noteFilters[i].loadCoefficientsWithGradient(Synth.tempFilterStartCoefficients, Synth.tempFilterEndCoefficients, 1.0 / runLength, startPoint.type == FilterType.lowPass);
                    noteFilterExpression *= startPoint.getVolumeCompensationMult();
                }
                tone.noteFilterCount = noteFilterSettings.controlPointCount;
            }
        }

        if (instrument.type == InstrumentType.drumset) {
            const drumsetFilterEnvelope: Envelope = instrument.getDrumsetEnvelope(tone.drumsetPitch!);
            // If the drumset lowpass cutoff decays, compensate by increasing expression.
            noteFilterExpression *= EnvelopeComputer.getLowpassCutoffDecayVolumeCompensation(drumsetFilterEnvelope)

            // Drumset filters use the same envelope timing as the rest of the envelopes, but do not include support for slide transitions.
            let drumsetFilterEnvelopeStart: number = EnvelopeComputer.computeEnvelope(drumsetFilterEnvelope, envelopeComputer.noteSecondsStart, beatsPerPart * partTimeStart, envelopeComputer.noteSizeStart);
            let drumsetFilterEnvelopeEnd: number = EnvelopeComputer.computeEnvelope(drumsetFilterEnvelope, envelopeComputer.noteSecondsEnd, beatsPerPart * partTimeEnd, envelopeComputer.noteSizeEnd);

            // Apply slide interpolation to drumset envelope.
            if (envelopeComputer.prevSlideStart) {
                const other: number = EnvelopeComputer.computeEnvelope(drumsetFilterEnvelope, envelopeComputer.prevNoteSecondsStart, beatsPerPart * partTimeStart, envelopeComputer.prevNoteSize);
                drumsetFilterEnvelopeStart += (other - drumsetFilterEnvelopeStart) * envelopeComputer.prevSlideRatioStart;
            }
            if (envelopeComputer.prevSlideEnd) {
                const other: number = EnvelopeComputer.computeEnvelope(drumsetFilterEnvelope, envelopeComputer.prevNoteSecondsEnd, beatsPerPart * partTimeEnd, envelopeComputer.prevNoteSize);
                drumsetFilterEnvelopeEnd += (other - drumsetFilterEnvelopeEnd) * envelopeComputer.prevSlideRatioEnd;
            }
            if (envelopeComputer.nextSlideStart) {
                const other: number = EnvelopeComputer.computeEnvelope(drumsetFilterEnvelope, 0.0, beatsPerPart * partTimeStart, envelopeComputer.nextNoteSize);
                drumsetFilterEnvelopeStart += (other - drumsetFilterEnvelopeStart) * envelopeComputer.nextSlideRatioStart;
            }
            if (envelopeComputer.nextSlideEnd) {
                const other: number = EnvelopeComputer.computeEnvelope(drumsetFilterEnvelope, 0.0, beatsPerPart * partTimeEnd, envelopeComputer.nextNoteSize);
                drumsetFilterEnvelopeEnd += (other - drumsetFilterEnvelopeEnd) * envelopeComputer.nextSlideRatioEnd;
            }

            const point: FilterControlPoint = synth.tempDrumSetControlPoint;
            point.type = FilterType.lowPass;
            point.gain = FilterControlPoint.getRoundedSettingValueFromLinearGain(0.5);
            point.freq = FilterControlPoint.getRoundedSettingValueFromHz(8000.0);
            // Drumset envelopes are warped to better imitate the legacy simplified 2nd order lowpass at ~48000Hz that I used to use.
            point.toCoefficients(Synth.tempFilterStartCoefficients, synth.samplesPerSecond, drumsetFilterEnvelopeStart * (1.0 + drumsetFilterEnvelopeStart), 1.0);
            point.toCoefficients(Synth.tempFilterEndCoefficients, synth.samplesPerSecond, drumsetFilterEnvelopeEnd * (1.0 + drumsetFilterEnvelopeEnd), 1.0);
            if (tone.noteFilters.length == tone.noteFilterCount) tone.noteFilters[tone.noteFilterCount] = new DynamicBiquadFilter();
            tone.noteFilters[tone.noteFilterCount].loadCoefficientsWithGradient(Synth.tempFilterStartCoefficients, Synth.tempFilterEndCoefficients, 1.0 / runLength, true);
            tone.noteFilterCount++;
        }

        noteFilterExpression = Math.min(3.0, noteFilterExpression);

        if (instrument.type == InstrumentType.fm) {
            // phase modulation!

            let sineExpressionBoost: number = 1.0;
            let totalCarrierExpression: number = 0.0;

            let arpeggioInterval: number = 0;
            const arpeggiates: boolean = chord.arpeggiates;
            if (tone.pitchCount > 1 && arpeggiates) {
                const arpeggio: number = Math.floor(instrument.arpTime / Config.ticksPerArpeggio);
                arpeggioInterval = tone.pitches[getArpeggioPitchIndex(tone.pitchCount, instrument.fastTwoNoteArp, arpeggio)] - tone.pitches[0];
            }


            const carrierCount: number = Config.algorithms[instrument.algorithm].carrierCount;
            for (let i: number = 0; i < Config.operatorCount; i++) {

                const associatedCarrierIndex: number = Config.algorithms[instrument.algorithm].associatedCarrier[i] - 1;
                const pitch: number = tone.pitches[arpeggiates ? 0 : ((i < tone.pitchCount) ? i : ((associatedCarrierIndex < tone.pitchCount) ? associatedCarrierIndex : 0))];
                const freqMult = Config.operatorFrequencies[instrument.operators[i].frequency].mult;
                const interval = Config.operatorCarrierInterval[associatedCarrierIndex] + arpeggioInterval;
                const pitchStart: number = basePitch + (pitch + intervalStart) * intervalScale + interval;
                const pitchEnd: number = basePitch + (pitch + intervalEnd) * intervalScale + interval;
                const baseFreqStart: number = Instrument.frequencyFromPitch(pitchStart);
                const baseFreqEnd: number = Instrument.frequencyFromPitch(pitchEnd);
                const hzOffset: number = Config.operatorFrequencies[instrument.operators[i].frequency].hzOffset;
                const targetFreqStart: number = freqMult * baseFreqStart + hzOffset;
                const targetFreqEnd: number = freqMult * baseFreqEnd + hzOffset;

                const freqEnvelopeStart: number = envelopeStarts[NoteAutomationIndex.operatorFrequency0 + i];
                const freqEnvelopeEnd: number = envelopeEnds[NoteAutomationIndex.operatorFrequency0 + i];
                let freqStart: number;
                let freqEnd: number;
                if (freqEnvelopeStart != 1.0 || freqEnvelopeEnd != 1.0) {
                    freqStart = Math.pow(2.0, Math.log2(targetFreqStart / baseFreqStart) * freqEnvelopeStart) * baseFreqStart;
                    freqEnd = Math.pow(2.0, Math.log2(targetFreqEnd / baseFreqEnd) * freqEnvelopeEnd) * baseFreqEnd;
                } else {
                    freqStart = targetFreqStart;
                    freqEnd = targetFreqEnd;
                }
                tone.phaseDeltas[i] = freqStart * sampleTime * Config.sineWaveLength;
                tone.phaseDeltaScales[i] = Math.pow(freqEnd / freqStart, 1.0 / runLength);

                const amplitudeCurve: number = Synth.operatorAmplitudeCurve(instrument.operators[i].amplitude);
                const amplitudeMult: number = amplitudeCurve * Config.operatorFrequencies[instrument.operators[i].frequency].amplitudeSign;
                let expressionStart: number = amplitudeMult;
                let expressionEnd: number = amplitudeMult;


                if (i < carrierCount) {
                    // carrier
                    const pitchExpressionStart: number = Math.pow(2.0, -(pitchStart - expressionReferencePitch) / pitchDamping);
                    const pitchExpressionEnd: number = Math.pow(2.0, -(pitchEnd - expressionReferencePitch) / pitchDamping);
                    expressionStart *= baseExpression * pitchExpressionStart * transitionExpressionStart * noteFilterExpression * chordExpressionStart;
                    expressionEnd *= baseExpression * pitchExpressionEnd * transitionExpressionEnd * noteFilterExpression * chordExpressionEnd;
                    expressionStart *= envelopeStarts[NoteAutomationIndex.noteVolume];
                    expressionEnd *= envelopeEnds[NoteAutomationIndex.noteVolume];

                    totalCarrierExpression += amplitudeCurve;
                } else {
                    // modulator
                    expressionStart *= Config.sineWaveLength * 1.5;
                    expressionEnd *= Config.sineWaveLength * 1.5;

                    sineExpressionBoost *= 1.0 - Math.min(1.0, instrument.operators[i].amplitude / 15);
                }

                expressionStart *= envelopeStarts[NoteAutomationIndex.operatorAmplitude0 + i];
                expressionEnd *= envelopeEnds[NoteAutomationIndex.operatorAmplitude0 + i];

                // Check for mod-related volume delta
                // @jummbus - BUG/TODO: This amplification is also applied to modulator FM operators which distorts the sound. Need a setting to toggle this on or off.
                // Just wrap it in "i < carrierCount" for the fixed ver, include the song vol one as well

                if (synth.isModActive(Config.modulators.dictionary["volume"].index, channelIndex, tone.instrumentIndex)) {
                    // Linear falloff below 0, normal volume formula above 0. Seems to work best for scaling since the normal volume mult formula has a big gap from -25 to -24.
                    const startVal: number = synth.getModValue(Config.modulators.dictionary["volume"].index, channelIndex, tone.instrumentIndex, false);
                    const endVal: number = synth.getModValue(Config.modulators.dictionary["volume"].index, channelIndex, tone.instrumentIndex, true);
                    expressionStart *= ((startVal <= 0) ? ((startVal + Config.volumeRange / 2) / (Config.volumeRange / 2)) : this.instrumentVolumeToVolumeMult(startVal));
                    expressionEnd *= ((endVal <= 0) ? ((endVal + Config.volumeRange / 2) / (Config.volumeRange / 2)) : this.instrumentVolumeToVolumeMult(endVal));
                }

                // Check for SONG mod-related volume delta
                if (synth.isModActive(Config.modulators.dictionary["song volume"].index)) {
                    expressionStart *= (synth.getModValue(Config.modulators.dictionary["song volume"].index, undefined, undefined, false)) / 100.0;
                    expressionEnd *= (synth.getModValue(Config.modulators.dictionary["song volume"].index, undefined, undefined, true)) / 100.0;
                }

                tone.expressionStarts[i] = expressionStart;
                tone.expressionDeltas[i] = (expressionEnd - expressionStart) / runLength;
            }

            sineExpressionBoost *= (Math.pow(2.0, (2.0 - 1.4 * instrument.feedbackAmplitude / 15.0)) - 1.0) / 3.0;
            sineExpressionBoost *= 1.0 - Math.min(1.0, Math.max(0.0, totalCarrierExpression - 1) / 2.0);
            sineExpressionBoost = 1.0 + sineExpressionBoost * 3.0;
            for (let i: number = 0; i < carrierCount; i++) {
                tone.expressionStarts[i] *= sineExpressionBoost;
                tone.expressionDeltas[i] *= sineExpressionBoost;
            }
            const feedbackAmplitude: number = Config.sineWaveLength * 0.3 * instrument.feedbackAmplitude / 15.0;
            let feedbackStart: number = feedbackAmplitude * envelopeStarts[NoteAutomationIndex.feedbackAmplitude];
            let feedbackEnd: number = feedbackAmplitude * envelopeEnds[NoteAutomationIndex.feedbackAmplitude];
            tone.feedbackMult = feedbackStart;
            tone.feedbackDelta = (feedbackEnd - tone.feedbackMult) / runLength;


        } else {
            const basePhaseDeltaScale: number = Math.pow(2.0, ((intervalEnd - intervalStart) * intervalScale / 12.0) / runLength);


            let pitch: number = tone.pitches[0];
            if (tone.pitchCount > 1 && (chord.arpeggiates || chord.customInterval)) {
                const arpeggio: number = Math.floor(instrument.arpTime / Config.ticksPerArpeggio);
                if (chord.customInterval) {
                    const intervalOffset: number = tone.pitches[1 + getArpeggioPitchIndex(tone.pitchCount - 1, instrument.fastTwoNoteArp, arpeggio)] - tone.pitches[0];
                    tone.specialIntervalMult = Math.pow(2.0, intervalOffset / 12.0);
                    tone.specialIntervalExpressionMult = Math.pow(2.0, -intervalOffset / pitchDamping);
                } else {
                    pitch = tone.pitches[getArpeggioPitchIndex(tone.pitchCount, instrument.fastTwoNoteArp, arpeggio)];
                }
            }

            const startPitch: number = basePitch + (pitch + intervalStart) * intervalScale;
            const endPitch: number = basePitch + (pitch + intervalEnd) * intervalScale;
            let pitchExpressionStart: number = Math.pow(2.0, -(startPitch - expressionReferencePitch) / pitchDamping);
            let pitchExpressionEnd: number = Math.pow(2.0, -(endPitch - expressionReferencePitch) / pitchDamping);
            let settingsExpressionMult: number = baseExpression * noteFilterExpression;

            if (instrument.type == InstrumentType.noise) {
                settingsExpressionMult *= Config.chipNoises[instrument.chipNoise].expression;
            }
            if (instrument.type == InstrumentType.chip) {
                settingsExpressionMult *= Config.chipWaves[instrument.chipWave].expression;
            }
            if (instrument.type == InstrumentType.pwm) {
                const basePulseWidth: number = getPulseWidthRatio(instrument.pulseWidth);

                // Check for PWM mods to this instrument
                let pulseWidthModStart: number = basePulseWidth;
                let pulseWidthModEnd: number = basePulseWidth;
                if (synth.isModActive(Config.modulators.dictionary["pulse width"].index, channelIndex, tone.instrumentIndex)) {
                    pulseWidthModStart = (synth.getModValue(Config.modulators.dictionary["pulse width"].index, channelIndex, tone.instrumentIndex, false)) / (Config.pulseWidthRange * 2);
                    pulseWidthModEnd = (synth.getModValue(Config.modulators.dictionary["pulse width"].index, channelIndex, tone.instrumentIndex, true)) / (Config.pulseWidthRange * 2);
                }

                const pulseWidthStart: number = pulseWidthModStart * envelopeStarts[NoteAutomationIndex.pulseWidth];
                const pulseWidthEnd: number = pulseWidthModEnd * envelopeEnds[NoteAutomationIndex.pulseWidth];
                tone.pulseWidth = pulseWidthStart;
                tone.pulseWidthDelta = (pulseWidthEnd - pulseWidthStart) / runLength;
            }
            if (instrument.type == InstrumentType.pickedString) {
                // Check for sustain mods
                let useSustainStart: number = instrument.stringSustain;
                let useSustainEnd: number = instrument.stringSustain;
                if (synth.isModActive(Config.modulators.dictionary["sustain"].index, channelIndex, tone.instrumentIndex)) {
                    useSustainStart = synth.getModValue(Config.modulators.dictionary["sustain"].index, channelIndex, tone.instrumentIndex, false);
                    useSustainEnd = synth.getModValue(Config.modulators.dictionary["sustain"].index, channelIndex, tone.instrumentIndex, false);
                }

                tone.stringSustainStart = useSustainStart;
                tone.stringSustainEnd = useSustainEnd;

                // Increase expression to compensate for string decay.
                settingsExpressionMult *= Math.pow(2.0, 0.7 * (1.0 - useSustainStart / (Config.stringSustainRange - 1)));

                const unison: Unison = Config.unisons[instrument.unison];
                for (let i: number = tone.pickedStrings.length; i < unison.voices; i++) {
                    tone.pickedStrings[i] = new PickedString();
                }

                if (tone.atNoteStart && !transition.continues && !tone.forceContinueAtStart) {
                    for (const pickedString of tone.pickedStrings) {
                        // Force the picked string to retrigger the attack impulse at the start of the note.
                        pickedString.delayIndex = -1;
                    }
                }
            }

            const startFreq: number = Instrument.frequencyFromPitch(startPitch);
            if (instrument.type == InstrumentType.chip || instrument.type == InstrumentType.customChipWave || instrument.type == InstrumentType.harmonics || instrument.type == InstrumentType.pickedString) {
                // These instruments have two waves at different frequencies for the unison feature.
                const unison: Unison = Config.unisons[instrument.unison];
                const voiceCountExpression: number = (instrument.type == InstrumentType.pickedString) ? 1 : unison.voices / 2.0;
                settingsExpressionMult *= unison.expression * voiceCountExpression;
                const unisonEnvelopeStart = envelopeStarts[NoteAutomationIndex.unison];
                const unisonEnvelopeEnd = envelopeEnds[NoteAutomationIndex.unison];
                const unisonAStart: number = Math.pow(2.0, (unison.offset + unison.spread) * unisonEnvelopeStart / 12.0);
                const unisonAEnd: number = Math.pow(2.0, (unison.offset + unison.spread) * unisonEnvelopeEnd / 12.0);
                const unisonBStart: number = Math.pow(2.0, (unison.offset - unison.spread) * unisonEnvelopeStart / 12.0) * tone.specialIntervalMult;
                const unisonBEnd: number = Math.pow(2.0, (unison.offset - unison.spread) * unisonEnvelopeEnd / 12.0) * tone.specialIntervalMult;
                tone.phaseDeltas[0] = startFreq * sampleTime * unisonAStart;
                tone.phaseDeltas[1] = startFreq * sampleTime * unisonBStart;
                tone.phaseDeltaScales[0] = basePhaseDeltaScale * Math.pow(unisonAEnd / unisonAStart, 1.0 / runLength);
                tone.phaseDeltaScales[1] = basePhaseDeltaScale * Math.pow(unisonBEnd / unisonBStart, 1.0 / runLength);
            } else {
                tone.phaseDeltas[0] = startFreq * sampleTime;
                tone.phaseDeltaScales[0] = basePhaseDeltaScale;
            }

            let expressionStart: number = settingsExpressionMult * transitionExpressionStart * chordExpressionStart * pitchExpressionStart * envelopeStarts[NoteAutomationIndex.noteVolume];
            let expressionEnd: number = settingsExpressionMult * transitionExpressionEnd * chordExpressionEnd * pitchExpressionEnd * envelopeEnds[NoteAutomationIndex.noteVolume];

            // Check for mod-related volume delta
            if (synth.isModActive(Config.modulators.dictionary["volume"].index, channelIndex, tone.instrumentIndex)) {
                // Linear falloff below 0, normal volume formula above 0. Seems to work best for scaling since the normal volume mult formula has a big gap from -25 to -24.
                const startVal: number = synth.getModValue(Config.modulators.dictionary["volume"].index, channelIndex, tone.instrumentIndex, false);
                const endVal: number = synth.getModValue(Config.modulators.dictionary["volume"].index, channelIndex, tone.instrumentIndex, true)
                expressionStart *= ((startVal <= 0) ? ((startVal + Config.volumeRange / 2) / (Config.volumeRange / 2)) : this.instrumentVolumeToVolumeMult(startVal));
                expressionEnd *= ((endVal <= 0) ? ((endVal + Config.volumeRange / 2) / (Config.volumeRange / 2)) : this.instrumentVolumeToVolumeMult(endVal));
            }
            // Check for SONG mod-related volume delta
            if (synth.isModActive(Config.modulators.dictionary["song volume"].index)) {
                expressionStart *= (synth.getModValue(Config.modulators.dictionary["song volume"].index, undefined, undefined, false)) / 100.0;
                expressionEnd *= (synth.getModValue(Config.modulators.dictionary["song volume"].index, undefined, undefined, true)) / 100.0;
            }

            tone.expressionStarts[0] = expressionStart;
            tone.expressionDeltas[0] = (expressionEnd - expressionStart) / runLength;
        }
    }

    public static getLFOAmplitude(instrument: Instrument, secondsIntoBar: number): number {
        let effect: number = 0.0;
        for (const vibratoPeriodSeconds of Config.vibratoTypes[instrument.vibratoType].periodsSeconds) {
            effect += Math.sin(Math.PI * 2.0 * secondsIntoBar / vibratoPeriodSeconds);
        }
        return effect;
    }


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
                        for (let j: number = 0; j < Config.operatorCount; j++) {
                            synthSource.push(line.replace(/\#/g, j + ""));
                        }
                    } else {
                        synthSource.push(line);
                    }
                }

                //console.log(synthSource.join("\n"));

                Synth.fmSynthFunctionCache[fingerprint] = new Function("synth", "bufferIndex", "runLength", "tone", "instrument", synthSource.join("\n"));
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
        } else if (instrument.type == InstrumentType.pickedString) {
            return Synth.pickedStringSynth;
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

    private static chipSynth(synth: Synth, bufferIndex: number, runLength: number, tone: Tone, instrument: Instrument): void {
        const aliases: boolean = (effectsIncludeDistortion(instrument.effects) && instrument.aliases);
        const isCustomWave: boolean = (instrument.type == InstrumentType.customChipWave);
        const data: Float32Array = synth.tempMonoInstrumentSampleBuffer!;
        var wave: Float64Array;
        var volumeScale = 1.0;

        if (!isCustomWave) {
            if (aliases) {
                wave = Config.rawChipWaves[instrument.chipWave].samples;
            }
            else {
                wave = Config.chipWaves[instrument.chipWave].samples;
            }
        }
        else {
            if (aliases) {
                wave = instrument.customChipWave;
                volumeScale = 0.05;
            }
            else {
                wave = instrument.customChipWaveIntegral;
                volumeScale = 0.05;
            }
        }

        const waveLength: number = wave.length - 1; // The first sample is duplicated at the end, don't double-count it.

        const unisonSign: number = tone.specialIntervalExpressionMult * Config.unisons[instrument.unison].sign;
        if (instrument.unison == 0 && !instrument.getChord().customInterval) tone.phases[1] = tone.phases[0];
        let phaseDeltaA: number = tone.phaseDeltas[0] * waveLength;
        let phaseDeltaB: number = tone.phaseDeltas[1] * waveLength;
        const phaseDeltaScaleA: number = +tone.phaseDeltaScales[0];
        const phaseDeltaScaleB: number = +tone.phaseDeltaScales[1];
        let expression: number = +tone.expressionStarts[0];
        const expressionDelta: number = +tone.expressionDeltas[0];
        let phaseA: number = (tone.phases[0] % 1) * waveLength;
        let phaseB: number = (tone.phases[1] % 1) * waveLength;

        const filters: DynamicBiquadFilter[] = tone.noteFilters;
        const filterCount: number = tone.noteFilterCount | 0;
        let initialFilterInput1: number = +tone.initialNoteFilterInput1;
        let initialFilterInput2: number = +tone.initialNoteFilterInput2;
        const applyFilters: Function = Synth.applyFilters;
        let prevWaveIntegralA: number = 0;
        let prevWaveIntegralB: number = 0;

        if (!aliases) {
            const phaseAInt: number = phaseA | 0;
            const phaseBInt: number = phaseB | 0;
            const indexA: number = phaseAInt % waveLength;
            const indexB: number = phaseBInt % waveLength;
            const phaseRatioA: number = phaseA - phaseAInt;
            const phaseRatioB: number = phaseB - phaseBInt;
            prevWaveIntegralA = +wave[indexA];
            prevWaveIntegralB = +wave[indexB];
            prevWaveIntegralA += (wave[indexA + 1] - prevWaveIntegralA) * phaseRatioA;
            prevWaveIntegralB += (wave[indexB + 1] - prevWaveIntegralB) * phaseRatioB;
        }

        const stopIndex: number = bufferIndex + runLength;
        for (let sampleIndex: number = bufferIndex; sampleIndex < stopIndex; sampleIndex++) {

            phaseA += phaseDeltaA;
            phaseB += phaseDeltaB;

            let waveA: number;
            let waveB: number;
            let inputSample: number;

            if (aliases) {
                waveA = wave[(0 | phaseA) % waveLength];
                waveB = wave[(0 | phaseB) % waveLength];
                inputSample = waveA + waveB;
            } else {
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
                waveA = (nextWaveIntegralA - prevWaveIntegralA) / phaseDeltaA;
                waveB = (nextWaveIntegralB - prevWaveIntegralB) / phaseDeltaB;
                prevWaveIntegralA = nextWaveIntegralA;
                prevWaveIntegralB = nextWaveIntegralB;
                inputSample = waveA + waveB * unisonSign;
            }

            const sample: number = applyFilters(inputSample, initialFilterInput1, initialFilterInput2, filterCount, filters);
            initialFilterInput2 = initialFilterInput1;
            initialFilterInput1 = inputSample;

            phaseDeltaA *= phaseDeltaScaleA;
            phaseDeltaB *= phaseDeltaScaleB;

            const output: number = sample * expression * volumeScale;
            expression += expressionDelta;

            data[sampleIndex] += output;
        }

        tone.phases[0] = phaseA / waveLength;
        tone.phases[1] = phaseB / waveLength;

        synth.sanitizeFilters(filters);
        tone.initialNoteFilterInput1 = initialFilterInput1;
        tone.initialNoteFilterInput2 = initialFilterInput2;
    }

    private static harmonicsSynth(synth: Synth, bufferIndex: number, runLength: number, tone: Tone, instrument: Instrument): void {
        const data: Float32Array = synth.tempMonoInstrumentSampleBuffer!;
        const wave: Float32Array = instrument.harmonicsWave.getCustomWave(instrument.type);
        const waveLength: number = wave.length - 1; // The first sample is duplicated at the end, don't double-count it.

        const unisonSign: number = tone.specialIntervalExpressionMult * Config.unisons[instrument.unison].sign;
        if (instrument.unison == 0 && !instrument.getChord().customInterval) tone.phases[1] = tone.phases[0];
        let phaseDeltaA: number = tone.phaseDeltas[0] * waveLength;
        let phaseDeltaB: number = tone.phaseDeltas[1] * waveLength;
        const phaseDeltaScaleA: number = +tone.phaseDeltaScales[0];
        const phaseDeltaScaleB: number = +tone.phaseDeltaScales[1];
        let expression: number = +tone.expressionStarts[0];
        const expressionDelta: number = +tone.expressionDeltas[0];
        let phaseA: number = (tone.phases[0] % 1) * waveLength;
        let phaseB: number = (tone.phases[1] % 1) * waveLength;

        const filters: DynamicBiquadFilter[] = tone.noteFilters;
        const filterCount: number = tone.noteFilterCount | 0;
        let initialFilterInput1: number = +tone.initialNoteFilterInput1;
        let initialFilterInput2: number = +tone.initialNoteFilterInput2;
        const applyFilters: Function = Synth.applyFilters;

        const phaseAInt: number = phaseA | 0;
        const phaseBInt: number = phaseB | 0;
        const indexA: number = phaseAInt % waveLength;
        const indexB: number = phaseBInt % waveLength;
        const phaseRatioA: number = phaseA - phaseAInt;
        const phaseRatioB: number = phaseB - phaseBInt;
        let prevWaveIntegralA: number = +wave[indexA];
        let prevWaveIntegralB: number = +wave[indexB];
        prevWaveIntegralA += (wave[indexA + 1] - prevWaveIntegralA) * phaseRatioA;
        prevWaveIntegralB += (wave[indexB + 1] - prevWaveIntegralB) * phaseRatioB;

        const stopIndex: number = bufferIndex + runLength;
        for (let sampleIndex: number = bufferIndex; sampleIndex < stopIndex; sampleIndex++) {

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
            const waveA: number = (nextWaveIntegralA - prevWaveIntegralA) / phaseDeltaA;
            const waveB: number = (nextWaveIntegralB - prevWaveIntegralB) / phaseDeltaB;
            prevWaveIntegralA = nextWaveIntegralA;
            prevWaveIntegralB = nextWaveIntegralB;

            const inputSample: number = waveA + waveB * unisonSign;
            const sample: number = applyFilters(inputSample, initialFilterInput1, initialFilterInput2, filterCount, filters);
            initialFilterInput2 = initialFilterInput1;
            initialFilterInput1 = inputSample;

            phaseDeltaA *= phaseDeltaScaleA;
            phaseDeltaB *= phaseDeltaScaleB;

            const output: number = sample * expression;
            expression += expressionDelta;

            data[sampleIndex] += output;
        }

        tone.phases[0] = phaseA / waveLength;
        tone.phases[1] = phaseB / waveLength;

        synth.sanitizeFilters(filters);
        tone.initialNoteFilterInput1 = initialFilterInput1;
        tone.initialNoteFilterInput2 = initialFilterInput2;
    }

    private static pickedStringSynth(synth: Synth, bufferIndex: number, runLength: number, tone: Tone, instrument: Instrument): void {
        // This algorithm is similar to the Karpluss-Strong algorithm in principle, but with an
        // all-pass filter for dispersion and with more control over the impulse.
        // The source code is processed as a string before being compiled, in order to
        // handle the unison feature. If unison is disabled or set to none, then only one
        // string voice is required, otherwise two string voices are required. We only want
        // to compute the minimum possible number of string voices, so omit the code for
        // processing extra ones if possible. Any line containing a "#" is duplicated for
        // each required voice, replacing the "#" with the voice index.

        const voiceCount: number = Config.unisons[instrument.unison].voices;
        let pickedStringFunction: Function = Synth.pickedStringFunctionCache[voiceCount];
        if (pickedStringFunction == undefined) {
            let pickedStringSource: string = "";

            pickedStringSource += `
				
				const Config = beepbox.Config;
				const Synth = beepbox.Synth;
				const NoteAutomationStringSustainIndex = ${NoteAutomationIndex.stringSustain};
				const voiceCount = ${voiceCount};
				const data = synth.tempMonoInstrumentSampleBuffer;
				
				const sustainEnvelopeStart = tone.envelopeComputer.envelopeStarts[NoteAutomationStringSustainIndex];
				const sustainEnvelopeEnd   = tone.envelopeComputer.envelopeEnds[  NoteAutomationStringSustainIndex];
				const stringDecayStart = 1.0 - Math.min(1.0, sustainEnvelopeStart * tone.stringSustainStart / (Config.stringSustainRange - 1));
				const stringDecayEnd   = 1.0 - Math.min(1.0, sustainEnvelopeEnd   * tone.stringSustainEnd / (Config.stringSustainRange - 1));
				
				let pickedString# = tone.pickedStrings[#];
				
				const prevDelayLength# = +pickedString#.prevDelayLength;
				let allPassSample# = +pickedString#.allPassSample;
				let allPassPrevInput# = +pickedString#.allPassPrevInput;
				let shelfSample# = +pickedString#.shelfSample;
				let shelfPrevInput# = +pickedString#.shelfPrevInput;
				let fractionalDelaySample# = +pickedString#.fractionalDelaySample;
				
				let expression = +tone.expressionStarts[0];
				const expressionDelta = +tone.expressionDeltas[0];
				
				const phaseDeltaStart# = +tone.phaseDeltas[#];
				const phaseDeltaScale# = +tone.phaseDeltaScales[#];
				const phaseDeltaEnd# = phaseDeltaStart# * Math.pow(phaseDeltaScale#, runLength);
				
				const radiansPerSampleStart# = Math.PI * 2.0 * phaseDeltaStart#;
				const radiansPerSampleEnd#   = Math.PI * 2.0 * phaseDeltaEnd#;
				
				const centerHarmonicStart# = radiansPerSampleStart# * 2.0;
				const centerHarmonicEnd#   = radiansPerSampleEnd# * 2.0;
				
				const allPassCenter = 2.0 * Math.PI * Config.pickedStringDispersionCenterFreq / synth.samplesPerSecond;
				const allPassRadiansStart# = Math.min(Math.PI, radiansPerSampleStart# * Config.pickedStringDispersionFreqMult * Math.pow(allPassCenter / radiansPerSampleStart#, Config.pickedStringDispersionFreqScale));
				const allPassRadiansEnd# = Math.min(Math.PI, radiansPerSampleEnd# * Config.pickedStringDispersionFreqMult * Math.pow(allPassCenter / radiansPerSampleEnd#, Config.pickedStringDispersionFreqScale));
				
				const shelfRadians = 2.0 * Math.PI * Config.pickedStringShelfHz / synth.samplesPerSecond;
				const decayCurveStart = (Math.pow(100.0, stringDecayStart) - 1.0) / 99.0;
				const decayCurveEnd   = (Math.pow(100.0, stringDecayEnd  ) - 1.0) / 99.0;
				const decayRateStart# = Math.pow(0.5, decayCurveStart * shelfRadians / radiansPerSampleStart#);
				const decayRateEnd#   = Math.pow(0.5, decayCurveEnd   * shelfRadians / radiansPerSampleEnd#);
				const shelfGainStart# = Math.pow(decayRateStart#, Config.stringDecayRate);
				const shelfGainEnd#   = Math.pow(decayRateEnd#,   Config.stringDecayRate);
				const expressionDecayStart# = Math.pow(decayRateStart#, 0.002);
				const expressionDecayEnd#   = Math.pow(decayRateEnd#,   0.002);`

            for (let voice: number = 0; voice < voiceCount; voice++) {
                pickedStringSource += `
				
				Synth.tempFilterStartCoefficients.allPass1stOrderInvertPhaseAbove(allPassRadiansStart#);
				synth.tempFrequencyResponse.analyze(Synth.tempFilterStartCoefficients, centerHarmonicStart#);
				let allPassG# = +Synth.tempFilterStartCoefficients.b[0]; /* same as a[1] */
				const allPassPhaseDelayStart# = -synth.tempFrequencyResponse.angle() / centerHarmonicStart#;
				
				Synth.tempFilterEndCoefficients.allPass1stOrderInvertPhaseAbove(allPassRadiansEnd#);
				synth.tempFrequencyResponse.analyze(Synth.tempFilterEndCoefficients, centerHarmonicEnd#);
				const allPassGEnd# = +Synth.tempFilterEndCoefficients.b[0]; /* same as a[1] */
				const allPassPhaseDelayEnd# = -synth.tempFrequencyResponse.angle() / centerHarmonicEnd#;
				
				Synth.tempFilterStartCoefficients.highShelf1stOrder(shelfRadians, shelfGainStart#);
				synth.tempFrequencyResponse.analyze(Synth.tempFilterStartCoefficients, centerHarmonicStart#)
				let shelfA1# = +Synth.tempFilterStartCoefficients.a[1]
				let shelfB0# = Synth.tempFilterStartCoefficients.b[0] * expressionDecayStart#
				let shelfB1# = Synth.tempFilterStartCoefficients.b[1] * expressionDecayStart#
				const shelfPhaseDelayStart# = -synth.tempFrequencyResponse.angle() / centerHarmonicStart#;
				
				Synth.tempFilterEndCoefficients.highShelf1stOrder(shelfRadians, shelfGainEnd#)
				synth.tempFrequencyResponse.analyze(Synth.tempFilterEndCoefficients, centerHarmonicEnd#)
				const shelfA1End# = +Synth.tempFilterEndCoefficients.a[1]
				const shelfB0End# = Synth.tempFilterEndCoefficients.b[0] * expressionDecayEnd#
				const shelfB1End# = Synth.tempFilterEndCoefficients.b[1] * expressionDecayEnd#
				const shelfPhaseDelayEnd# = -synth.tempFrequencyResponse.angle() / centerHarmonicEnd#;`.replace(/\#/g, String(voice));
            }

            pickedStringSource += `
				
				const periodLengthStart# = 1.0 / phaseDeltaStart#;
				const periodLengthEnd# = 1.0 / phaseDeltaEnd#;
				const minBufferLength# = Math.ceil(Math.max(periodLengthStart#, periodLengthEnd#) * 2);
				let delayLength# = periodLengthStart# - allPassPhaseDelayStart# - shelfPhaseDelayStart#;
				const delayLengthEnd# = periodLengthEnd# - allPassPhaseDelayEnd# - shelfPhaseDelayEnd#;
				
				const delayLengthDelta# = (delayLengthEnd# - delayLength#) / runLength;
				const allPassGDelta# = (allPassGEnd# - allPassG#) / runLength;
				const shelfA1Delta# = (shelfA1End# - shelfA1#) / runLength;
				const shelfB0Delta# = (shelfB0End# - shelfB0#) / runLength;
				const shelfB1Delta# = (shelfB1End# - shelfB1#) / runLength;
				
				const filters = tone.noteFilters;
				const filterCount = tone.noteFilterCount|0;
				let initialFilterInput1 = +tone.initialNoteFilterInput1;
				let initialFilterInput2 = +tone.initialNoteFilterInput2;
				const applyFilters = Synth.applyFilters;
				
				const pitchChanged# = Math.abs(Math.log2(delayLength# / prevDelayLength#)) > 0.01;
				let delayIndex# = pickedString#.delayIndex|0;`

            for (let voice: number = 0; voice < voiceCount; voice++) {
                pickedStringSource += `
					
				const reinitializeImpulse# = (delayIndex# == -1 || pitchChanged#);
				if (pickedString#.delayLine == null || pickedString#.delayLine.length <= minBufferLength#) {
					// The delay line buffer will get reused for other tones so might as well
					// start off with a buffer size that is big enough for most notes.
					const likelyMaximumLength = Math.ceil(2 * synth.samplesPerSecond / beepbox.Instrument.frequencyFromPitch(12));
					const newDelayLine = new Float32Array(Synth.fittingPowerOfTwo(Math.max(likelyMaximumLength, minBufferLength#)));
					if (!reinitializeImpulse# && pickedString#.delayLine != null) {
						// If the tone has already started but the buffer needs to be reallocated,
						// transfer the old data to the new buffer.
						const oldDelayBufferMask = (pickedString#.delayLine.length - 1) >> 0;
						const startCopyingFromIndex = delayIndex# + pickedString#.delayResetOffset;
						delayIndex# = pickedString#.delayLine.length - pickedString#.delayResetOffset;
						for (let i = 0; i < pickedString#.delayLine.length; i++) {
							newDelayLine[i] = pickedString#.delayLine[(startCopyingFromIndex + i) & oldDelayBufferMask];
						}
					}
					pickedString#.delayLine = newDelayLine;
				}
				const delayLine# = pickedString#.delayLine;
				const delayBufferMask# = (delayLine#.length - 1) >> 0;

				if (reinitializeImpulse#) {
					// -1 delay index means the tone was reset.
					// Also, if the pitch changed suddenly (e.g. from seamless or arpeggio) then reset the wave.
					
					delayIndex# = 0;
					allPassSample# = 0.0;
					allPassPrevInput# = 0.0;
					shelfSample# = 0.0;
					shelfPrevInput# = 0.0;
					fractionalDelaySample# = 0.0;
					
					// Clear away a region of the delay buffer for the new impulse.
					const startImpulseFrom = -delayLength#;
					const startZerosFrom = Math.floor(startImpulseFrom - periodLengthStart# / 2);
					const stopZerosAt = Math.ceil(startZerosFrom + periodLengthStart# * 2);
					pickedString#.delayResetOffset = stopZerosAt; // And continue clearing the area in front of the delay line.
					for (let i = startZerosFrom; i <= stopZerosAt; i++) {
						delayLine#[i & delayBufferMask#] = 0.0;
					}
					
					const impulseWave = instrument.harmonicsWave.getCustomWave(instrument.type);
					const impulseWaveLength = impulseWave.length - 1; // The first sample is duplicated at the end, don't double-count it.
					const impulsePhaseDelta = impulseWaveLength / periodLengthStart#;
					
					const fadeDuration = Math.min(periodLengthStart# * 0.2, synth.samplesPerSecond * 0.003);
					const startImpulseFromSample = Math.ceil(startImpulseFrom);
					const stopImpulseAt = startImpulseFrom + periodLengthStart# + fadeDuration;
					const stopImpulseAtSample = stopImpulseAt;
					let impulsePhase = (startImpulseFromSample - startImpulseFrom) * impulsePhaseDelta;
					let prevWaveIntegral = 0.0;
					for (let i = startImpulseFromSample; i <= stopImpulseAtSample; i++) {
						const impulsePhaseInt = impulsePhase|0;
						const index = impulsePhaseInt % impulseWaveLength;
						let nextWaveIntegral = impulseWave[index];
						const phaseRatio = impulsePhase - impulsePhaseInt;
						nextWaveIntegral += (impulseWave[index+1] - nextWaveIntegral) * phaseRatio;
						const sample = (nextWaveIntegral - prevWaveIntegral) / impulsePhaseDelta;
						const fadeIn = Math.min(1.0, (i - startImpulseFrom) / fadeDuration);
						const fadeOut = Math.min(1.0, (stopImpulseAt - i) / fadeDuration);
						const combinedFade = fadeIn * fadeOut;
						const curvedFade = combinedFade * combinedFade * (3.0 - 2.0 * combinedFade); // A cubic sigmoid from 0 to 1.
						delayLine#[i & delayBufferMask#] += sample * curvedFade;
						prevWaveIntegral = nextWaveIntegral;
						impulsePhase += impulsePhaseDelta;
					}
				}
				delayIndex# = (delayIndex# & delayBufferMask#) + delayLine#.length;`.replace(/\#/g, String(voice));
            }

            pickedStringSource += `

				const unisonSign = tone.specialIntervalExpressionMult * Config.unisons[instrument.unison].sign;
				const delayResetOffset# = pickedString#.delayResetOffset|0;
            //const floorStereoDelay: number = absStereoDelay | 0;
				const stopIndex = bufferIndex + runLength;
				for (let sampleIndex = bufferIndex; sampleIndex < stopIndex; sampleIndex++) {
					const targetSampleTime# = delayIndex# - delayLength#;
					const lowerIndex# = (targetSampleTime# + 0.125) | 0; // Offset to improve stability of all-pass filter.
					const upperIndex# = lowerIndex# + 1;
					const fractionalDelay# = upperIndex# - targetSampleTime#;
					const fractionalDelayG# = (1.0 - fractionalDelay#) / (1.0 + fractionalDelay#); // Inlined version of FilterCoefficients.prototype.allPass1stOrderFractionalDelay
					const prevInput# = delayLine#[lowerIndex# & delayBufferMask#];
					const input# = delayLine#[upperIndex# & delayBufferMask#];
					fractionalDelaySample# = fractionalDelayG# * input# + prevInput# - fractionalDelayG# * fractionalDelaySample#;
					
					allPassSample# = fractionalDelaySample# * allPassG# + allPassPrevInput# - allPassG# * allPassSample#;
					allPassPrevInput# = fractionalDelaySample#;
					
					shelfSample# = shelfB0# * allPassSample# + shelfB1# * shelfPrevInput# - shelfA1# * shelfSample#;
					shelfPrevInput# = allPassSample#;
					
					delayLine#[delayIndex# & delayBufferMask#] += shelfSample#;
					delayLine#[(delayIndex# + delayResetOffset#) & delayBufferMask#] = 0.0;
					delayIndex#++;
					
					const inputSample = (`

            const sampleList: string[] = [];
            for (let voice: number = 0; voice < voiceCount; voice++) {
                sampleList.push("fractionalDelaySample" + voice + (voice == 1 ? " * unisonSign" : ""));
            }

            pickedStringSource += sampleList.join(" + ");

            pickedStringSource += `) * expression;
					const sample = applyFilters(inputSample, initialFilterInput1, initialFilterInput2, filterCount, filters);
					initialFilterInput2 = initialFilterInput1;
					initialFilterInput1 = inputSample;
					data[sampleIndex] += sample;
					
					expression += expressionDelta;
					delayLength# += delayLengthDelta#;
					allPassG# += allPassGDelta#;
					shelfA1# += shelfA1Delta#;
					shelfB0# += shelfB0Delta#;
					shelfB1# += shelfB1Delta#;
				}
				
				// Avoid persistent denormal or NaN values in the delay buffers and filter history.
				const epsilon = (1.0e-24);
				if (!Number.isFinite(allPassSample#) || Math.abs(allPassSample#) < epsilon) allPassSample# = 0.0;
				if (!Number.isFinite(allPassPrevInput#) || Math.abs(allPassPrevInput#) < epsilon) allPassPrevInput# = 0.0;
				if (!Number.isFinite(shelfSample#) || Math.abs(shelfSample#) < epsilon) shelfSample# = 0.0;
				if (!Number.isFinite(shelfPrevInput#) || Math.abs(shelfPrevInput#) < epsilon) shelfPrevInput# = 0.0;
				if (!Number.isFinite(fractionalDelaySample#) || Math.abs(fractionalDelaySample#) < epsilon) fractionalDelaySample# = 0.0;
				pickedString#.allPassSample = allPassSample#;
				pickedString#.allPassPrevInput = allPassPrevInput#;
				pickedString#.shelfSample = shelfSample#;
				pickedString#.shelfPrevInput = shelfPrevInput#;
				pickedString#.fractionalDelaySample = fractionalDelaySample#;
				pickedString#.delayIndex = delayIndex#;
				pickedString#.prevDelayLength = delayLength#;
				
				synth.sanitizeFilters(filters);
				tone.initialNoteFilterInput1 = initialFilterInput1;
				tone.initialNoteFilterInput2 = initialFilterInput2;`

            // Duplicate lines containing "#" for each voice and replace the "#" with the voice index.
            pickedStringSource = pickedStringSource.replace(/^.*\#.*$/mg, line => {
                const lines = [];
                for (let voice: number = 0; voice < voiceCount; voice++) {
                    lines.push(line.replace(/\#/g, String(voice)));
                }
                return lines.join("\n");
            });

            //console.log(pickedStringSource);
            pickedStringFunction = new Function("synth", "bufferIndex", "runLength", "tone", "instrument", pickedStringSource);
            Synth.pickedStringFunctionCache[voiceCount] = pickedStringFunction;
        }

        pickedStringFunction(synth, bufferIndex, runLength, tone, instrument);
    }

    private static effectsSynth(synth: Synth, outputDataL: Float32Array, outputDataR: Float32Array, bufferIndex: number, runLength: number, instrument: Instrument, instrumentState: InstrumentState): void {
        // TODO: If automation is involved, don't assume sliders will stay at zero.
        // @jummbus - ^ Correct, removed the non-zero checks as modulation can change them.

        const usesDistortion: boolean = effectsIncludeDistortion(instrument.effects);
        const usesBitcrusher: boolean = effectsIncludeBitcrusher(instrument.effects);
        const usesEqFilter: boolean = instrumentState.eqFilterCount > 0;
        const usesPanning: boolean = effectsIncludePanning(instrument.effects);
        const usesChorus: boolean = effectsIncludeChorus(instrument.effects);
        const usesEcho: boolean = effectsIncludeEcho(instrument.effects);
        const usesReverb: boolean = effectsIncludeReverb(instrument.effects);
        let signature: number = 0; if (usesDistortion) signature = signature | 1;
        signature = signature << 1; if (usesBitcrusher) signature = signature | 1;
        signature = signature << 1; if (usesEqFilter) signature = signature | 1;
        signature = signature << 1; if (usesPanning) signature = signature | 1;
        signature = signature << 1; if (usesChorus) signature = signature | 1;
        signature = signature << 1; if (usesEcho) signature = signature | 1;
        signature = signature << 1; if (usesReverb) signature = signature | 1;

        let effectsFunction: Function = Synth.effectsFunctionCache[signature];
        if (effectsFunction == undefined) {
            let effectsSource: string = "";

            const usesDelays: boolean = usesChorus || usesReverb || usesEcho;

            effectsSource += `
				const tempMonoInstrumentSampleBuffer = synth.tempMonoInstrumentSampleBuffer;
				
				let mixVolume = +instrumentState.mixVolumeStart;
				const mixVolumeDelta = +instrumentState.mixVolumeDelta;`

            if (usesDelays) {
                effectsSource += `
				
				let delayInputMult = +instrumentState.delayInputMultStart;
				const delayInputMultDelta = +instrumentState.delayInputMultDelta;`
            }

            if (usesDistortion) {
                // Distortion can sometimes create noticeable aliasing.
                // It seems the established industry best practice for distortion antialiasing
                // is to upsample the inputs ("zero stuffing" followed by a brick wall lowpass
                // at the original nyquist frequency), perform the distortion, then downsample
                // (the lowpass again followed by dropping in-between samples). This is
                // "mathematically correct" in that it preserves only the intended frequencies,
                // but it has several unfortunate tradeoffs depending on the choice of filter,
                // introducing latency and/or time smearing, since no true brick wall filter
                // exists. For the time being, I've opted to instead generate in-between input
                // samples using fractional delay all-pass filters, and after distorting them,
                // I "downsample" these with a simple weighted sum.

                effectsSource += `
				
				const distortionBaseVolume = +beepbox.Config.distortionBaseVolume;
				const distortionStart = +Math.pow(1.0 - 0.895 * (Math.pow(20.0, instrumentState.distortionStart) - 1.0) / 19.0, 2.0)
				const distortionEnd   = +Math.pow(1.0 - 0.895 * (Math.pow(20.0, instrumentState.distortionEnd  ) - 1.0) / 19.0, 2.0)
				let distortion = distortionStart;
				const distortionDelta = (distortionEnd - distortionStart) / runLength;
				const distortionDriveStart = (1.0 + 2.0 * instrumentState.distortionStart) / distortionBaseVolume;
				const distortionDriveEnd   = (1.0 + 2.0 * instrumentState.distortionEnd)   / distortionBaseVolume;
				let distortionDrive = distortionDriveStart;
				const distortionDriveDelta = (distortionDriveEnd - distortionDriveStart) / runLength;
				const distortionFractionalResolution = 4.0;
				const distortionOversampleCompensation = distortionBaseVolume / distortionFractionalResolution;
				const distortionFractionalDelay1 = 1.0 / distortionFractionalResolution;
				const distortionFractionalDelay2 = 2.0 / distortionFractionalResolution;
				const distortionFractionalDelay3 = 3.0 / distortionFractionalResolution;
				const distortionFractionalDelayG1 = (1.0 - distortionFractionalDelay1) / (1.0 + distortionFractionalDelay1); // Inlined version of FilterCoefficients.prototype.allPass1stOrderFractionalDelay
				const distortionFractionalDelayG2 = (1.0 - distortionFractionalDelay2) / (1.0 + distortionFractionalDelay2); // Inlined version of FilterCoefficients.prototype.allPass1stOrderFractionalDelay
				const distortionFractionalDelayG3 = (1.0 - distortionFractionalDelay3) / (1.0 + distortionFractionalDelay3); // Inlined version of FilterCoefficients.prototype.allPass1stOrderFractionalDelay
				const distortionNextOutputWeight1 = Math.cos(Math.PI * distortionFractionalDelay1) * 0.5 + 0.5;
				const distortionNextOutputWeight2 = Math.cos(Math.PI * distortionFractionalDelay2) * 0.5 + 0.5;
				const distortionNextOutputWeight3 = Math.cos(Math.PI * distortionFractionalDelay3) * 0.5 + 0.5;
				const distortionPrevOutputWeight1 = 1.0 - distortionNextOutputWeight1;
				const distortionPrevOutputWeight2 = 1.0 - distortionNextOutputWeight2;
				const distortionPrevOutputWeight3 = 1.0 - distortionNextOutputWeight3;
				
				let distortionFractionalInput1 = +instrumentState.distortionFractionalInput1;
				let distortionFractionalInput2 = +instrumentState.distortionFractionalInput2;
				let distortionFractionalInput3 = +instrumentState.distortionFractionalInput3;
				let distortionPrevInput = +instrumentState.distortionPrevInput;
				let distortionNextOutput = +instrumentState.distortionNextOutput;`
            }

            if (usesBitcrusher) {
                effectsSource += `
				
				let bitcrusherPrevInput = +instrumentState.bitcrusherPrevInput;
				let bitcrusherCurrentOutput = +instrumentState.bitcrusherCurrentOutput;
				let bitcrusherPhase = +instrumentState.bitcrusherPhase;
				let bitcrusherPhaseDelta = +instrumentState.bitcrusherPhaseDelta;
				const bitcrusherPhaseDeltaScale = +instrumentState.bitcrusherPhaseDeltaScale;
				let bitcrusherScale = +instrumentState.bitcrusherScale;
				const bitcrusherScaleScale = +instrumentState.bitcrusherScaleScale;
				let bitcrusherFoldLevel = +instrumentState.bitcrusherFoldLevel;
				const bitcrusherFoldLevelScale = +instrumentState.bitcrusherFoldLevelScale;`
            }

            if (usesEqFilter) {
                effectsSource += `
				
				let filters = instrumentState.eqFilters;
				const filterCount = instrumentState.eqFilterCount|0;
				let initialFilterInput1 = +instrumentState.initialEqFilterInput1;
				let initialFilterInput2 = +instrumentState.initialEqFilterInput2;
				const applyFilters = beepbox.Synth.applyFilters;`
            }

            // The eq filter volume is also used to fade out the instrument state, so always include it.
            effectsSource += `
				
				let eqFilterVolume = +instrumentState.eqFilterVolumeStart;
				const eqFilterVolumeDelta = +instrumentState.eqFilterVolumeDelta;`

            if (usesPanning) {
                effectsSource += `
				
				const panningMask = synth.panningDelayBufferMask >>> 0;
				const panningDelayLine = instrumentState.panningDelayLine;
				let panningDelayPos = instrumentState.panningDelayPos & panningMask;
				let   panningVolumeL      = +instrumentState.panningVolumeStartL;
				let   panningVolumeR      = +instrumentState.panningVolumeStartR;
				const panningVolumeDeltaL = +instrumentState.panningVolumeDeltaL;
				const panningVolumeDeltaR = +instrumentState.panningVolumeDeltaR;
				let   panningOffsetL      = panningDelayPos - instrumentState.panningOffsetStartL + synth.panningDelayBufferSize;
				let   panningOffsetR      = panningDelayPos - instrumentState.panningOffsetStartR + synth.panningDelayBufferSize;
				const panningOffsetDeltaL = 1.0 - instrumentState.panningOffsetDeltaL;
				const panningOffsetDeltaR = 1.0 - instrumentState.panningOffsetDeltaR;`
            }

            if (usesChorus) {
                effectsSource += `
				
				const chorusMask = synth.chorusDelayBufferMask >>> 0;
				const chorusDelayLineL = instrumentState.chorusDelayLineL;
				const chorusDelayLineR = instrumentState.chorusDelayLineR;
				instrumentState.chorusDelayLineDirty = true;
				let chorusDelayPos = instrumentState.chorusDelayPos & chorusMask;
				
				const chorusStart = +instrumentState.chorusStart;
				const chorusEnd   = +instrumentState.chorusEnd;
				let chorusVoiceMult = chorusStart;
				const chorusVoiceMultDelta = (chorusEnd - chorusStart) / runLength;
				let chorusCombinedMult = 1.0 / Math.sqrt(3.0 * chorusStart * chorusStart + 1.0);
				const chorusCombinedMultEnd = 1.0 / Math.sqrt(3.0 * chorusEnd * chorusEnd + 1.0);
				const chorusCombinedMultDelta = (chorusCombinedMultEnd - chorusCombinedMult) / runLength;
				
				const chorusDuration = +beepbox.Config.chorusPeriodSeconds;
				const chorusAngle = Math.PI * 2.0 / (chorusDuration * synth.samplesPerSecond);
				const chorusRange = synth.samplesPerSecond * beepbox.Config.chorusDelayRange;
				const chorusOffset0 = synth.chorusDelayBufferSize - beepbox.Config.chorusDelayOffsets[0][0] * chorusRange;
				const chorusOffset1 = synth.chorusDelayBufferSize - beepbox.Config.chorusDelayOffsets[0][1] * chorusRange;
				const chorusOffset2 = synth.chorusDelayBufferSize - beepbox.Config.chorusDelayOffsets[0][2] * chorusRange;
				const chorusOffset3 = synth.chorusDelayBufferSize - beepbox.Config.chorusDelayOffsets[1][0] * chorusRange;
				const chorusOffset4 = synth.chorusDelayBufferSize - beepbox.Config.chorusDelayOffsets[1][1] * chorusRange;
				const chorusOffset5 = synth.chorusDelayBufferSize - beepbox.Config.chorusDelayOffsets[1][2] * chorusRange;
				let chorusPhase = instrumentState.chorusPhase % (Math.PI * 2.0);
				let chorusTap0Index = chorusDelayPos + chorusOffset0 - chorusRange * Math.sin(chorusPhase + beepbox.Config.chorusPhaseOffsets[0][0]);
				let chorusTap1Index = chorusDelayPos + chorusOffset1 - chorusRange * Math.sin(chorusPhase + beepbox.Config.chorusPhaseOffsets[0][1]);
				let chorusTap2Index = chorusDelayPos + chorusOffset2 - chorusRange * Math.sin(chorusPhase + beepbox.Config.chorusPhaseOffsets[0][2]);
				let chorusTap3Index = chorusDelayPos + chorusOffset3 - chorusRange * Math.sin(chorusPhase + beepbox.Config.chorusPhaseOffsets[1][0]);
				let chorusTap4Index = chorusDelayPos + chorusOffset4 - chorusRange * Math.sin(chorusPhase + beepbox.Config.chorusPhaseOffsets[1][1]);
				let chorusTap5Index = chorusDelayPos + chorusOffset5 - chorusRange * Math.sin(chorusPhase + beepbox.Config.chorusPhaseOffsets[1][2]);
				chorusPhase += chorusAngle * runLength;
				const chorusTap0End = chorusDelayPos + chorusOffset0 - chorusRange * Math.sin(chorusPhase + beepbox.Config.chorusPhaseOffsets[0][0]) + runLength;
				const chorusTap1End = chorusDelayPos + chorusOffset1 - chorusRange * Math.sin(chorusPhase + beepbox.Config.chorusPhaseOffsets[0][1]) + runLength;
				const chorusTap2End = chorusDelayPos + chorusOffset2 - chorusRange * Math.sin(chorusPhase + beepbox.Config.chorusPhaseOffsets[0][2]) + runLength;
				const chorusTap3End = chorusDelayPos + chorusOffset3 - chorusRange * Math.sin(chorusPhase + beepbox.Config.chorusPhaseOffsets[1][0]) + runLength;
				const chorusTap4End = chorusDelayPos + chorusOffset4 - chorusRange * Math.sin(chorusPhase + beepbox.Config.chorusPhaseOffsets[1][1]) + runLength;
				const chorusTap5End = chorusDelayPos + chorusOffset5 - chorusRange * Math.sin(chorusPhase + beepbox.Config.chorusPhaseOffsets[1][2]) + runLength;
				const chorusTap0Delta = (chorusTap0End - chorusTap0Index) / runLength;
				const chorusTap1Delta = (chorusTap1End - chorusTap1Index) / runLength;
				const chorusTap2Delta = (chorusTap2End - chorusTap2Index) / runLength;
				const chorusTap3Delta = (chorusTap3End - chorusTap3Index) / runLength;
				const chorusTap4Delta = (chorusTap4End - chorusTap4Index) / runLength;
				const chorusTap5Delta = (chorusTap5End - chorusTap5Index) / runLength;`
            }

            if (usesEcho) {
                effectsSource += `
				
				let echoMult = +instrumentState.echoMultStart;
				const echoMultDelta = +instrumentState.echoMultDelta;
				
				const echoDelayLineL = instrumentState.echoDelayLineL;
				const echoDelayLineR = instrumentState.echoDelayLineR;
				const echoMask = (echoDelayLineL.length - 1) >>> 0;
				instrumentState.echoDelayLineDirty = true;
				
				let echoDelayPos = instrumentState.echoDelayPos & echoMask;
				const echoDelayOffsetStart = (echoDelayLineL.length - instrumentState.echoDelayOffsetStart) & echoMask;
				const echoDelayOffsetEnd   = (echoDelayLineL.length - instrumentState.echoDelayOffsetEnd) & echoMask;
				let echoDelayOffsetRatio = +instrumentState.echoDelayOffsetRatio;
				const echoDelayOffsetRatioDelta = +instrumentState.echoDelayOffsetRatioDelta;
				
				const echoShelfA1 = +instrumentState.echoShelfA1;
				const echoShelfB0 = +instrumentState.echoShelfB0;
				const echoShelfB1 = +instrumentState.echoShelfB1;
				let echoShelfSampleL = +instrumentState.echoShelfSampleL;
				let echoShelfSampleR = +instrumentState.echoShelfSampleR;
				let echoShelfPrevInputL = +instrumentState.echoShelfPrevInputL;
				let echoShelfPrevInputR = +instrumentState.echoShelfPrevInputR;`
            }

            if (usesReverb) {
                effectsSource += `
				
				const reverbMask = beepbox.Config.reverbDelayBufferMask >>> 0; //TODO: Dynamic reverb buffer size.
				const reverbDelayLine = instrumentState.reverbDelayLine;
				instrumentState.reverbDelayLineDirty = true;
				let reverbDelayPos = instrumentState.reverbDelayPos & reverbMask;
				
				let reverb = +instrumentState.reverbMultStart;
				const reverbDelta = +instrumentState.reverbMultDelta;
				
				const reverbShelfA1 = +instrumentState.reverbShelfA1;
				const reverbShelfB0 = +instrumentState.reverbShelfB0;
				const reverbShelfB1 = +instrumentState.reverbShelfB1;
				let reverbShelfSample0 = +instrumentState.reverbShelfSample0;
				let reverbShelfSample1 = +instrumentState.reverbShelfSample1;
				let reverbShelfSample2 = +instrumentState.reverbShelfSample2;
				let reverbShelfSample3 = +instrumentState.reverbShelfSample3;
				let reverbShelfPrevInput0 = +instrumentState.reverbShelfPrevInput0;
				let reverbShelfPrevInput1 = +instrumentState.reverbShelfPrevInput1;
				let reverbShelfPrevInput2 = +instrumentState.reverbShelfPrevInput2;
				let reverbShelfPrevInput3 = +instrumentState.reverbShelfPrevInput3;`
            }

            effectsSource += `
				
				const stopIndex = bufferIndex + runLength;
				for (let sampleIndex = bufferIndex; sampleIndex < stopIndex; sampleIndex++) {
					let sample = tempMonoInstrumentSampleBuffer[sampleIndex];
					tempMonoInstrumentSampleBuffer[sampleIndex] = 0.0;`

            if (usesDistortion) {
                effectsSource += `
					
					const distortionReverse = 1.0 - distortion;
					const distortionNextInput = sample * distortionDrive;
					sample = distortionNextOutput;
					distortionNextOutput = distortionNextInput / (distortionReverse * Math.abs(distortionNextInput) + distortion);
					distortionFractionalInput1 = distortionFractionalDelayG1 * distortionNextInput + distortionPrevInput - distortionFractionalDelayG1 * distortionFractionalInput1;
					distortionFractionalInput2 = distortionFractionalDelayG2 * distortionNextInput + distortionPrevInput - distortionFractionalDelayG2 * distortionFractionalInput2;
					distortionFractionalInput3 = distortionFractionalDelayG3 * distortionNextInput + distortionPrevInput - distortionFractionalDelayG3 * distortionFractionalInput3;
					const distortionOutput1 = distortionFractionalInput1 / (distortionReverse * Math.abs(distortionFractionalInput1) + distortion);
					const distortionOutput2 = distortionFractionalInput2 / (distortionReverse * Math.abs(distortionFractionalInput2) + distortion);
					const distortionOutput3 = distortionFractionalInput3 / (distortionReverse * Math.abs(distortionFractionalInput3) + distortion);
					distortionNextOutput += distortionOutput1 * distortionNextOutputWeight1 + distortionOutput2 * distortionNextOutputWeight2 + distortionOutput3 * distortionNextOutputWeight3;
					sample += distortionOutput1 * distortionPrevOutputWeight1 + distortionOutput2 * distortionPrevOutputWeight2 + distortionOutput3 * distortionPrevOutputWeight3;
					sample *= distortionOversampleCompensation;
					distortionPrevInput = distortionNextInput;
					distortion += distortionDelta;
					distortionDrive += distortionDriveDelta;`
            }

            if (usesBitcrusher) {
                effectsSource += `
					
					bitcrusherPhase += bitcrusherPhaseDelta;
					if (bitcrusherPhase < 1.0) {
						bitcrusherPrevInput = sample;
						sample = bitcrusherCurrentOutput;
					} else {
						bitcrusherPhase = bitcrusherPhase % 1.0;
						const ratio = bitcrusherPhase / bitcrusherPhaseDelta;
						
						const lerpedInput = sample + (bitcrusherPrevInput - sample) * ratio;
						bitcrusherPrevInput = sample;
						
						const bitcrusherWrapLevel = bitcrusherFoldLevel * 4.0;
						const wrappedSample = (((lerpedInput + bitcrusherFoldLevel) % bitcrusherWrapLevel) + bitcrusherWrapLevel) % bitcrusherWrapLevel;
						const foldedSample = bitcrusherFoldLevel - Math.abs(bitcrusherFoldLevel * 2.0 - wrappedSample);
						const scaledSample = foldedSample / bitcrusherScale;
						const oldValue = bitcrusherCurrentOutput;
						const newValue = (((scaledSample > 0 ? scaledSample + 1 : scaledSample)|0)-.5) * bitcrusherScale;
						
						sample = oldValue + (newValue - oldValue) * ratio;
						bitcrusherCurrentOutput = newValue;
					}
					bitcrusherPhaseDelta *= bitcrusherPhaseDeltaScale;
					bitcrusherScale *= bitcrusherScaleScale;
					bitcrusherFoldLevel *= bitcrusherFoldLevelScale;`
            }

            if (usesEqFilter) {
                effectsSource += `
					
					const inputSample = sample;
					sample = applyFilters(inputSample, initialFilterInput1, initialFilterInput2, filterCount, filters);
					initialFilterInput2 = initialFilterInput1;
					initialFilterInput1 = inputSample;`
            }

            // The eq filter volume is also used to fade out the instrument state, so always include it.
            effectsSource += `
					
					sample *= eqFilterVolume;
					eqFilterVolume += eqFilterVolumeDelta;`

            if (usesPanning) {
                effectsSource += `
					
					panningDelayLine[panningDelayPos] = sample;
					const panningRatioL  = panningOffsetL % 1;
					const panningRatioR  = panningOffsetR % 1;
					const panningTapLA   = panningDelayLine[(panningOffsetL) & panningMask];
					const panningTapLB   = panningDelayLine[(panningOffsetL + 1) & panningMask];
					const panningTapRA   = panningDelayLine[(panningOffsetR) & panningMask];
					const panningTapRB   = panningDelayLine[(panningOffsetR + 1) & panningMask];
					const panningTapL    = panningTapLA + (panningTapLB - panningTapLA) * panningRatioL;
					const panningTapR    = panningTapRA + (panningTapRB - panningTapRA) * panningRatioR;
					let sampleL = panningTapL * panningVolumeL;
					let sampleR = panningTapR * panningVolumeR;
					panningDelayPos = (panningDelayPos + 1) & panningMask;
					panningVolumeL += panningVolumeDeltaL;
					panningVolumeR += panningVolumeDeltaR;
					panningOffsetL += panningOffsetDeltaL;
					panningOffsetR += panningOffsetDeltaR;`
            } else {
                effectsSource += `
					
					let sampleL = sample;
					let sampleR = sample;`
            }

            if (usesChorus) {
                effectsSource += `
					
					const chorusTap0Ratio = chorusTap0Index % 1;
					const chorusTap1Ratio = chorusTap1Index % 1;
					const chorusTap2Ratio = chorusTap2Index % 1;
					const chorusTap3Ratio = chorusTap3Index % 1;
					const chorusTap4Ratio = chorusTap4Index % 1;
					const chorusTap5Ratio = chorusTap5Index % 1;
					const chorusTap0A = chorusDelayLineL[(chorusTap0Index) & chorusMask];
					const chorusTap0B = chorusDelayLineL[(chorusTap0Index + 1) & chorusMask];
					const chorusTap1A = chorusDelayLineL[(chorusTap1Index) & chorusMask];
					const chorusTap1B = chorusDelayLineL[(chorusTap1Index + 1) & chorusMask];
					const chorusTap2A = chorusDelayLineL[(chorusTap2Index) & chorusMask];
					const chorusTap2B = chorusDelayLineL[(chorusTap2Index + 1) & chorusMask];
					const chorusTap3A = chorusDelayLineR[(chorusTap3Index) & chorusMask];
					const chorusTap3B = chorusDelayLineR[(chorusTap3Index + 1) & chorusMask];
					const chorusTap4A = chorusDelayLineR[(chorusTap4Index) & chorusMask];
					const chorusTap4B = chorusDelayLineR[(chorusTap4Index + 1) & chorusMask];
					const chorusTap5A = chorusDelayLineR[(chorusTap5Index) & chorusMask];
					const chorusTap5B = chorusDelayLineR[(chorusTap5Index + 1) & chorusMask];
					const chorusTap0 = chorusTap0A + (chorusTap0B - chorusTap0A) * chorusTap0Ratio;
					const chorusTap1 = chorusTap1A + (chorusTap1B - chorusTap1A) * chorusTap1Ratio;
					const chorusTap2 = chorusTap2A + (chorusTap2B - chorusTap2A) * chorusTap2Ratio;
					const chorusTap3 = chorusTap3A + (chorusTap3B - chorusTap3A) * chorusTap3Ratio;
					const chorusTap4 = chorusTap4A + (chorusTap4B - chorusTap4A) * chorusTap4Ratio;
					const chorusTap5 = chorusTap5A + (chorusTap5B - chorusTap5A) * chorusTap5Ratio;
					chorusDelayLineL[chorusDelayPos] = sampleL * delayInputMult;
					chorusDelayLineR[chorusDelayPos] = sampleR * delayInputMult;
					sampleL = chorusCombinedMult * (sampleL + chorusVoiceMult * (chorusTap1 - chorusTap0 - chorusTap2));
					sampleR = chorusCombinedMult * (sampleR + chorusVoiceMult * (chorusTap4 - chorusTap3 - chorusTap5));
					chorusDelayPos = (chorusDelayPos + 1) & chorusMask;
					chorusTap0Index += chorusTap0Delta;
					chorusTap1Index += chorusTap1Delta;
					chorusTap2Index += chorusTap2Delta;
					chorusTap3Index += chorusTap3Delta;
					chorusTap4Index += chorusTap4Delta;
					chorusTap5Index += chorusTap5Delta;
					chorusVoiceMult += chorusVoiceMultDelta;
					chorusCombinedMult += chorusCombinedMultDelta;`
            }

            if (usesEcho) {
                effectsSource += `
					
					const echoTapStartIndex = (echoDelayPos + echoDelayOffsetStart) & echoMask;
					const echoTapEndIndex   = (echoDelayPos + echoDelayOffsetEnd  ) & echoMask;
					const echoTapStartL = echoDelayLineL[echoTapStartIndex];
					const echoTapEndL   = echoDelayLineL[echoTapEndIndex];
					const echoTapStartR = echoDelayLineR[echoTapStartIndex];
					const echoTapEndR   = echoDelayLineR[echoTapEndIndex];
					const echoTapL = (echoTapStartL + (echoTapEndL - echoTapStartL) * echoDelayOffsetRatio) * echoMult;
					const echoTapR = (echoTapStartR + (echoTapEndR - echoTapStartR) * echoDelayOffsetRatio) * echoMult;
					
					echoShelfSampleL = echoShelfB0 * echoTapL + echoShelfB1 * echoShelfPrevInputL - echoShelfA1 * echoShelfSampleL;
					echoShelfSampleR = echoShelfB0 * echoTapR + echoShelfB1 * echoShelfPrevInputR - echoShelfA1 * echoShelfSampleR;
					echoShelfPrevInputL = echoTapL;
					echoShelfPrevInputR = echoTapR;
					sampleL += echoShelfSampleL;
					sampleR += echoShelfSampleR;
					
					echoDelayLineL[echoDelayPos] = sampleL * delayInputMult;
					echoDelayLineR[echoDelayPos] = sampleR * delayInputMult;
					echoDelayPos = (echoDelayPos + 1) & echoMask;
					echoDelayOffsetRatio += echoDelayOffsetRatioDelta;
					echoMult += echoMultDelta;`
            }

            if (usesReverb) {
                effectsSource += `
					
					// Reverb, implemented using a feedback delay network with a Hadamard matrix and lowpass filters.
					// good ratios:    0.555235 + 0.618033 + 0.818 +   1.0 = 2.991268
					// Delay lengths:  3041     + 3385     + 4481  +  5477 = 16384 = 2^14
					// Buffer offsets: 3041    -> 6426   -> 10907 -> 16384
					const reverbDelayPos1 = (reverbDelayPos +  3041) & reverbMask;
					const reverbDelayPos2 = (reverbDelayPos +  6426) & reverbMask;
					const reverbDelayPos3 = (reverbDelayPos + 10907) & reverbMask;
					const reverbSample0 = (reverbDelayLine[reverbDelayPos]);
					const reverbSample1 = reverbDelayLine[reverbDelayPos1];
					const reverbSample2 = reverbDelayLine[reverbDelayPos2];
					const reverbSample3 = reverbDelayLine[reverbDelayPos3];
					const reverbTemp0 = -(reverbSample0 + sampleL) + reverbSample1;
					const reverbTemp1 = -(reverbSample0 + sampleR) - reverbSample1;
					const reverbTemp2 = -reverbSample2 + reverbSample3;
					const reverbTemp3 = -reverbSample2 - reverbSample3;
					const reverbShelfInput0 = (reverbTemp0 + reverbTemp2) * reverb;
					const reverbShelfInput1 = (reverbTemp1 + reverbTemp3) * reverb;
					const reverbShelfInput2 = (reverbTemp0 - reverbTemp2) * reverb;
					const reverbShelfInput3 = (reverbTemp1 - reverbTemp3) * reverb;
					reverbShelfSample0 = reverbShelfB0 * reverbShelfInput0 + reverbShelfB1 * reverbShelfPrevInput0 - reverbShelfA1 * reverbShelfSample0;
					reverbShelfSample1 = reverbShelfB0 * reverbShelfInput1 + reverbShelfB1 * reverbShelfPrevInput1 - reverbShelfA1 * reverbShelfSample1;
					reverbShelfSample2 = reverbShelfB0 * reverbShelfInput2 + reverbShelfB1 * reverbShelfPrevInput2 - reverbShelfA1 * reverbShelfSample2;
					reverbShelfSample3 = reverbShelfB0 * reverbShelfInput3 + reverbShelfB1 * reverbShelfPrevInput3 - reverbShelfA1 * reverbShelfSample3;
					reverbShelfPrevInput0 = reverbShelfInput0;
					reverbShelfPrevInput1 = reverbShelfInput1;
					reverbShelfPrevInput2 = reverbShelfInput2;
					reverbShelfPrevInput3 = reverbShelfInput3;
					reverbDelayLine[reverbDelayPos1] = reverbShelfSample0 * delayInputMult;
					reverbDelayLine[reverbDelayPos2] = reverbShelfSample1 * delayInputMult;
					reverbDelayLine[reverbDelayPos3] = reverbShelfSample2 * delayInputMult;
					reverbDelayLine[reverbDelayPos ] = reverbShelfSample3 * delayInputMult;
					reverbDelayPos = (reverbDelayPos + 1) & reverbMask;
					sampleL += reverbSample1 + reverbSample2 + reverbSample3;
					sampleR += reverbSample0 + reverbSample2 - reverbSample3;
					reverb += reverbDelta;`
            }

            effectsSource += `
					
					outputDataL[sampleIndex] += sampleL * mixVolume;
					outputDataR[sampleIndex] += sampleR * mixVolume;
					mixVolume += mixVolumeDelta;`

            if (usesDelays) {
                effectsSource += `
					
					delayInputMult += delayInputMultDelta;`
            }

            effectsSource += `
				}
				
				// Avoid persistent denormal or NaN values in the delay buffers and filter history.
				const epsilon = (1.0e-24);`

            if (usesDistortion) {
                effectsSource += `
				
				if (!Number.isFinite(distortionFractionalInput1) || Math.abs(distortionFractionalInput1) < epsilon) distortionFractionalInput1 = 0.0;
				if (!Number.isFinite(distortionFractionalInput2) || Math.abs(distortionFractionalInput2) < epsilon) distortionFractionalInput2 = 0.0;
				if (!Number.isFinite(distortionFractionalInput3) || Math.abs(distortionFractionalInput3) < epsilon) distortionFractionalInput3 = 0.0;
				if (!Number.isFinite(distortionPrevInput) || Math.abs(distortionPrevInput) < epsilon) distortionPrevInput = 0.0;
				if (!Number.isFinite(distortionNextOutput) || Math.abs(distortionNextOutput) < epsilon) distortionNextOutput = 0.0;
				
				instrumentState.distortionFractionalInput1 = distortionFractionalInput1;
				instrumentState.distortionFractionalInput2 = distortionFractionalInput2;
				instrumentState.distortionFractionalInput3 = distortionFractionalInput3;
				instrumentState.distortionPrevInput = distortionPrevInput;
				instrumentState.distortionNextOutput = distortionNextOutput;`
            }

            if (usesBitcrusher) {
                effectsSource += `
					
				if (Math.abs(bitcrusherPrevInput) < epsilon) bitcrusherPrevInput = 0.0;
				if (Math.abs(bitcrusherCurrentOutput) < epsilon) bitcrusherCurrentOutput = 0.0;
				instrumentState.bitcrusherPrevInput = bitcrusherPrevInput;
				instrumentState.bitcrusherCurrentOutput = bitcrusherCurrentOutput;
				instrumentState.bitcrusherPhase = bitcrusherPhase;`
            }

            if (usesEqFilter) {
                effectsSource += `
					
				synth.sanitizeFilters(filters);
				// The filter input here is downstream from another filter so we
				// better make sure it's safe too.
				if (!(initialFilterInput1 < 100) || !(initialFilterInput2 < 100)) {
					initialFilterInput1 = 0.0;
					initialFilterInput2 = 0.0;
				}
				if (Math.abs(initialFilterInput1) < epsilon) initialFilterInput1 = 0.0;
				if (Math.abs(initialFilterInput2) < epsilon) initialFilterInput2 = 0.0;
				instrumentState.initialEqFilterInput1 = initialFilterInput1;
				instrumentState.initialEqFilterInput2 = initialFilterInput2;`
            }

            if (usesPanning) {
                effectsSource += `
				
				beepbox.Synth.sanitizeDelayLine(panningDelayLine, panningDelayPos, panningMask);
				instrumentState.panningDelayPos = panningDelayPos;`
            }

            if (usesChorus) {
                effectsSource += `
				
				beepbox.Synth.sanitizeDelayLine(chorusDelayLineL, chorusDelayPos, chorusMask);
				beepbox.Synth.sanitizeDelayLine(chorusDelayLineR, chorusDelayPos, chorusMask);
				instrumentState.chorusPhase = chorusPhase;
				instrumentState.chorusDelayPos = chorusDelayPos;`
            }

            if (usesEcho) {
                effectsSource += `
				
				beepbox.Synth.sanitizeDelayLine(echoDelayLineL, echoDelayPos, echoMask);
				beepbox.Synth.sanitizeDelayLine(echoDelayLineR, echoDelayPos, echoMask);
				instrumentState.echoDelayPos = echoDelayPos;
				
				if (!Number.isFinite(echoShelfSampleL) || Math.abs(echoShelfSampleL) < epsilon) echoShelfSampleL = 0.0;
				if (!Number.isFinite(echoShelfSampleR) || Math.abs(echoShelfSampleR) < epsilon) echoShelfSampleR = 0.0;
				if (!Number.isFinite(echoShelfPrevInputL) || Math.abs(echoShelfPrevInputL) < epsilon) echoShelfPrevInputL = 0.0;
				if (!Number.isFinite(echoShelfPrevInputR) || Math.abs(echoShelfPrevInputR) < epsilon) echoShelfPrevInputR = 0.0;
				instrumentState.echoShelfSampleL = echoShelfSampleL;
				instrumentState.echoShelfSampleR = echoShelfSampleR;
				instrumentState.echoShelfPrevInputL = echoShelfPrevInputL;
				instrumentState.echoShelfPrevInputR = echoShelfPrevInputR;`
            }

            if (usesReverb) {
                effectsSource += `
				
				beepbox.Synth.sanitizeDelayLine(reverbDelayLine, reverbDelayPos        , reverbMask);
				beepbox.Synth.sanitizeDelayLine(reverbDelayLine, reverbDelayPos +  3041, reverbMask);
				beepbox.Synth.sanitizeDelayLine(reverbDelayLine, reverbDelayPos +  6426, reverbMask);
				beepbox.Synth.sanitizeDelayLine(reverbDelayLine, reverbDelayPos + 10907, reverbMask);
				instrumentState.reverbDelayPos  = reverbDelayPos;
				
				if (!Number.isFinite(reverbShelfSample0) || Math.abs(reverbShelfSample0) < epsilon) reverbShelfSample0 = 0.0;
				if (!Number.isFinite(reverbShelfSample1) || Math.abs(reverbShelfSample1) < epsilon) reverbShelfSample1 = 0.0;
				if (!Number.isFinite(reverbShelfSample2) || Math.abs(reverbShelfSample2) < epsilon) reverbShelfSample2 = 0.0;
				if (!Number.isFinite(reverbShelfSample3) || Math.abs(reverbShelfSample3) < epsilon) reverbShelfSample3 = 0.0;
				if (!Number.isFinite(reverbShelfPrevInput0) || Math.abs(reverbShelfPrevInput0) < epsilon) reverbShelfPrevInput0 = 0.0;
				if (!Number.isFinite(reverbShelfPrevInput1) || Math.abs(reverbShelfPrevInput1) < epsilon) reverbShelfPrevInput1 = 0.0;
				if (!Number.isFinite(reverbShelfPrevInput2) || Math.abs(reverbShelfPrevInput2) < epsilon) reverbShelfPrevInput2 = 0.0;
				if (!Number.isFinite(reverbShelfPrevInput3) || Math.abs(reverbShelfPrevInput3) < epsilon) reverbShelfPrevInput3 = 0.0;
				instrumentState.reverbShelfSample0 = reverbShelfSample0;
				instrumentState.reverbShelfSample1 = reverbShelfSample1;
				instrumentState.reverbShelfSample2 = reverbShelfSample2;
				instrumentState.reverbShelfSample3 = reverbShelfSample3;
				instrumentState.reverbShelfPrevInput0 = reverbShelfPrevInput0;
				instrumentState.reverbShelfPrevInput1 = reverbShelfPrevInput1;
				instrumentState.reverbShelfPrevInput2 = reverbShelfPrevInput2;
				instrumentState.reverbShelfPrevInput3 = reverbShelfPrevInput3;`
            }

            //console.log(effectsSource);
            effectsFunction = new Function("synth", "outputDataL", "outputDataR", "bufferIndex", "runLength", "instrument", "instrumentState", effectsSource);
            Synth.effectsFunctionCache[signature] = effectsFunction;
        }

        effectsFunction(synth, outputDataL, outputDataR, bufferIndex, runLength, instrument, instrumentState);
    }

    private static pulseWidthSynth(synth: Synth, bufferIndex: number, runLength: number, tone: Tone, instrument: Instrument): void {
        const data: Float32Array = synth.tempMonoInstrumentSampleBuffer!;

        let phaseDelta: number = tone.phaseDeltas[0];
        const phaseDeltaScale: number = +tone.phaseDeltaScales[0];
        let expression: number = +tone.expressionStarts[0];
        const expressionDelta: number = +tone.expressionDeltas[0];
        let phase: number = (tone.phases[0] % 1);

        let pulseWidth: number = tone.pulseWidth;
        const pulseWidthDelta: number = tone.pulseWidthDelta;

        const filters: DynamicBiquadFilter[] = tone.noteFilters;
        const filterCount: number = tone.noteFilterCount | 0;
        let initialFilterInput1: number = +tone.initialNoteFilterInput1;
        let initialFilterInput2: number = +tone.initialNoteFilterInput2;
        const applyFilters: Function = Synth.applyFilters;

        const stopIndex: number = bufferIndex + runLength;
        for (let sampleIndex: number = bufferIndex; sampleIndex < stopIndex; sampleIndex++) {

            const sawPhaseA: number = phase % 1;
            const sawPhaseB: number = (phase + pulseWidth) % 1;

            let pulseWave: number = sawPhaseB - sawPhaseA;

            // This is a PolyBLEP, which smooths out discontinuities at any frequency to reduce aliasing. 
            if (!instrument.aliases) {
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
            }

            const inputSample: number = pulseWave;
            const sample: number = applyFilters(inputSample, initialFilterInput1, initialFilterInput2, filterCount, filters);
            initialFilterInput2 = initialFilterInput1;
            initialFilterInput1 = inputSample;

            phase += phaseDelta;
            phaseDelta *= phaseDeltaScale;
            pulseWidth += pulseWidthDelta;

            const output: number = sample * expression;
            expression += expressionDelta;

            data[sampleIndex] += output;
        }

        tone.phases[0] = phase;

        synth.sanitizeFilters(filters);
        tone.initialNoteFilterInput1 = initialFilterInput1;
        tone.initialNoteFilterInput2 = initialFilterInput2;
    }

    private static fmSourceTemplate: string[] = (`
		const data = synth.tempMonoInstrumentSampleBuffer;
			const sineWave = beepbox.Config.sineWave;
			
			// I'm adding 1000 to the phase to ensure that it's never negative even when modulated by other waves because negative numbers don't work with the modulus operator very well.
			let operator#Phase       = +((tone.phases[#] % 1) + 1000) * beepbox.Config.sineWaveLength;
			let operator#PhaseDelta  = +tone.phaseDeltas[#];
		let operator#PhaseDeltaScale = +tone.phaseDeltaScales[#];
		let operator#OutputMult  = +tone.expressionStarts[#];
		const operator#OutputDelta = +tone.expressionDeltas[#];
			let operator#Output      = +tone.feedbackOutputs[#];
			let feedbackMult         = +tone.feedbackMult;
			const feedbackDelta        = +tone.feedbackDelta;
		
		const filters = tone.noteFilters;
		const filterCount = tone.noteFilterCount|0;
		let initialFilterInput1 = +tone.initialNoteFilterInput1;
		let initialFilterInput2 = +tone.initialNoteFilterInput2;
		const applyFilters = beepbox.Synth.applyFilters;
		
		const stopIndex = bufferIndex + runLength;
		for (let sampleIndex = bufferIndex; sampleIndex < stopIndex; sampleIndex++) {
				// INSERT OPERATOR COMPUTATION HERE
				const fmOutput = (/*operator#Scaled*/); // CARRIER OUTPUTS
				
			const inputSample = fmOutput;
			const sample = applyFilters(inputSample, initialFilterInput1, initialFilterInput2, filterCount, filters);
			initialFilterInput2 = initialFilterInput1;
			initialFilterInput1 = inputSample;
				
				feedbackMult += feedbackDelta;
				operator#OutputMult += operator#OutputDelta;
				operator#Phase += operator#PhaseDelta;
			operator#PhaseDelta *= operator#PhaseDeltaScale;
			
				
//const absStereoDelay: number = Math.abs(stereoDelay);
//const fracStereoDelay: number = absStereoDelay % 1;
//const floorStereoDelay: number = absStereoDelay | 0;

//delays = stereoDelay < 0 ? [0, 0, floorStereoDelay * 2, fracStereoDelay] : [floorStereoDelay * 2, fracStereoDelay, 0, 0];

// Optimized ver: can remove the above three declarations, but muddier conceptually. Still has that conditional, too...
			data[sampleIndex] += sample;
			}
			
			tone.phases[#] = operator#Phase / ` + Config.sineWaveLength + `;
			tone.feedbackOutputs[#] = operator#Output;
			
		synth.sanitizeFilters(filters);
		tone.initialNoteFilterInput1 = initialFilterInput1;
		tone.initialNoteFilterInput2 = initialFilterInput2;
		`).split("\n");

    private static operatorSourceTemplate: string[] = (`
const operator#Wave     = beepbox.Synth.getOperatorWave(instrument.operators[#].waveform, instrument.operators[#].pulseWidth).samples;
				const operator#PhaseMix = operator#Phase/* + operator@Scaled*/;
				const operator#PhaseInt = operator#PhaseMix|0;
				const operator#Index    = operator#PhaseInt & ` + Config.sineWaveMask + `;
const operator#Sample   = operator#Wave[operator#Index];
operator#Output       = operator#Sample + (operator#Wave[operator#Index + 1] - operator#Sample) * (operator#PhaseMix - operator#PhaseInt);
				const operator#Scaled   = operator#OutputMult * operator#Output;
		`).split("\n");

    private static noiseSynth(synth: Synth, bufferIndex: number, runLength: number, tone: Tone, instrument: Instrument): void {
        const data: Float32Array = synth.tempMonoInstrumentSampleBuffer!;
        let wave: Float32Array = instrument.getDrumWave();
        let phaseDelta: number = +tone.phaseDeltas[0];
        const phaseDeltaScale: number = +tone.phaseDeltaScales[0];
        let expression: number = +tone.expressionStarts[0];
        const expressionDelta: number = +tone.expressionDeltas[0];
        let phase: number = (tone.phases[0] % 1) * Config.chipNoiseLength;
        if (tone.phases[0] == 0) {
            // Zero phase means the tone was reset, just give noise a random start phase instead.
            phase = Math.random() * Config.chipNoiseLength;
        }
        const phaseMask: number = Config.chipNoiseLength - 1;
        let noiseSample: number = +tone.sample;

        const filters: DynamicBiquadFilter[] = tone.noteFilters;
        const filterCount: number = tone.noteFilterCount | 0;
        let initialFilterInput1: number = +tone.initialNoteFilterInput1;
        let initialFilterInput2: number = +tone.initialNoteFilterInput2;
        const applyFilters: Function = Synth.applyFilters;

        // This is for a "legacy" style simplified 1st order lowpass filter with
        // a cutoff frequency that is relative to the tone's fundamental frequency.
        const pitchRelativefilter: number = Math.min(1.0, tone.phaseDeltas[0] * Config.chipNoises[instrument.chipNoise].pitchFilterMult);

        const stopIndex: number = bufferIndex + runLength;
        for (let sampleIndex: number = bufferIndex; sampleIndex < stopIndex; sampleIndex++) {
            const waveSample: number = wave[phase & phaseMask];

            noiseSample += (waveSample - noiseSample) * pitchRelativefilter;

            const inputSample: number = noiseSample;
            const sample: number = applyFilters(inputSample, initialFilterInput1, initialFilterInput2, filterCount, filters);
            initialFilterInput2 = initialFilterInput1;
            initialFilterInput1 = inputSample;

            phase += phaseDelta;
            phaseDelta *= phaseDeltaScale;

            const output: number = sample * expression;
            expression += expressionDelta;

            data[sampleIndex] += output;
        }

        tone.phases[0] = phase / Config.chipNoiseLength;
        tone.sample = noiseSample;

        synth.sanitizeFilters(filters);
        tone.initialNoteFilterInput1 = initialFilterInput1;
        tone.initialNoteFilterInput2 = initialFilterInput2;
    }

    private static spectrumSynth(synth: Synth, bufferIndex: number, runLength: number, tone: Tone, instrument: Instrument): void {
        const data: Float32Array = synth.tempMonoInstrumentSampleBuffer!;
        let wave: Float32Array = instrument.getDrumWave();
        let phaseDelta: number = tone.phaseDeltas[0] * (1 << 7);
        const phaseDeltaScale: number = +tone.phaseDeltaScales[0];
        let expression: number = +tone.expressionStarts[0];
        const expressionDelta: number = +tone.expressionDeltas[0];
        let noiseSample: number = +tone.sample;

        const filters: DynamicBiquadFilter[] = tone.noteFilters;
        const filterCount: number = tone.noteFilterCount | 0;
        let initialFilterInput1: number = +tone.initialNoteFilterInput1;
        let initialFilterInput2: number = +tone.initialNoteFilterInput2;
        const applyFilters: Function = Synth.applyFilters;

        let phase: number = (tone.phases[0] % 1) * Config.spectrumNoiseLength;
        // Zero phase means the tone was reset, just give noise a random start phase instead.
        if (tone.phases[0] == 0) phase = Synth.findRandomZeroCrossing(wave, Config.spectrumNoiseLength) + phaseDelta;
        const phaseMask: number = Config.spectrumNoiseLength - 1;

        // This is for a "legacy" style simplified 1st order lowpass filter with
        // a cutoff frequency that is relative to the tone's fundamental frequency.
        const pitchRelativefilter: number = Math.min(1.0, phaseDelta);

        const stopIndex: number = bufferIndex + runLength;
        for (let sampleIndex: number = bufferIndex; sampleIndex < stopIndex; sampleIndex++) {
            const phaseInt: number = phase | 0;
            const index: number = phaseInt & phaseMask;
            let waveSample: number = wave[index];
            const phaseRatio: number = phase - phaseInt;
            waveSample += (wave[index + 1] - waveSample) * phaseRatio;

            noiseSample += (waveSample - noiseSample) * pitchRelativefilter;


            const inputSample: number = noiseSample;
            const sample: number = applyFilters(inputSample, initialFilterInput1, initialFilterInput2, filterCount, filters);
            initialFilterInput2 = initialFilterInput1;
            initialFilterInput1 = inputSample;

            phase += phaseDelta;
            phaseDelta *= phaseDeltaScale;

            const output: number = sample * expression;
            expression += expressionDelta;

            data[sampleIndex] += output;
        }

        tone.phases[0] = phase / Config.spectrumNoiseLength;
        tone.sample = noiseSample;

        synth.sanitizeFilters(filters);
        tone.initialNoteFilterInput1 = initialFilterInput1;
        tone.initialNoteFilterInput2 = initialFilterInput2;
    }

    private static drumsetSynth(synth: Synth, bufferIndex: number, runLength: number, tone: Tone, instrument: Instrument): void {
        const data: Float32Array = synth.tempMonoInstrumentSampleBuffer!;
        let wave: Float32Array = instrument.getDrumsetWave(tone.drumsetPitch!);
        let phaseDelta: number = tone.phaseDeltas[0] / Instrument.drumsetIndexReferenceDelta(tone.drumsetPitch!);
        const phaseDeltaScale: number = +tone.phaseDeltaScales[0];
        let expression: number = +tone.expressionStarts[0];
        const expressionDelta: number = +tone.expressionDeltas[0];

        const filters: DynamicBiquadFilter[] = tone.noteFilters;
        const filterCount: number = tone.noteFilterCount | 0;
        let initialFilterInput1: number = +tone.initialNoteFilterInput1;
        let initialFilterInput2: number = +tone.initialNoteFilterInput2;
        const applyFilters: Function = Synth.applyFilters;

        let phase: number = (tone.phases[0] % 1) * Config.spectrumNoiseLength;
        // Zero phase means the tone was reset, just give noise a random start phase instead.
        if (tone.phases[0] == 0) phase = Synth.findRandomZeroCrossing(wave, Config.spectrumNoiseLength) + phaseDelta;
        const phaseMask: number = Config.spectrumNoiseLength - 1;

        const stopIndex: number = bufferIndex + runLength;
        for (let sampleIndex: number = bufferIndex; sampleIndex < stopIndex; sampleIndex++) {
            const phaseInt: number = phase | 0;
            const index: number = phaseInt & phaseMask;
            let noiseSample: number = wave[index];
            const phaseRatio: number = phase - phaseInt;
            noiseSample += (wave[index + 1] - noiseSample) * phaseRatio;

            const inputSample: number = noiseSample;
            const sample: number = applyFilters(inputSample, initialFilterInput1, initialFilterInput2, filterCount, filters);
            initialFilterInput2 = initialFilterInput1;
            initialFilterInput1 = inputSample;

            phase += phaseDelta;
            phaseDelta *= phaseDeltaScale;

            const output: number = sample * expression;
            expression += expressionDelta;

            data[sampleIndex] += output;
        }

        tone.phases[0] = phase / Config.spectrumNoiseLength;

        synth.sanitizeFilters(filters);
        tone.initialNoteFilterInput1 = initialFilterInput1;
        tone.initialNoteFilterInput2 = initialFilterInput2;
    }

    private static modSynth(synth: Synth, stereoBufferIndex: number, runLength: number, tone: Tone, instrument: Instrument): void {
        // Note: present modulator value is tone.expressionStarts[0].

        if (!synth.song) return;

        let mod: number = Config.modCount - 1 - tone.pitches[0];

        // Flagged as invalid because unused by current settings, skip
        if (instrument.invalidModulators[mod]) return;

        let setting: number = instrument.modulators[mod];

        // Generate list of used instruments
        let usedInstruments: number[] = [];
        if (Config.modulators[instrument.modulators[mod]].forSong) {
            // Instrument doesn't matter for song, just push a random index to run the modsynth once
            usedInstruments.push(0);
        } else {
            // All
            if (instrument.modInstruments[mod] == synth.song.channels[instrument.modChannels[mod]].instruments.length) {
                for (let i: number = 0; i < synth.song.channels[instrument.modChannels[mod]].instruments.length; i++) {
                    usedInstruments.push(i);
                }
            }
            // Active
            else if (instrument.modInstruments[mod] > synth.song.channels[instrument.modChannels[mod]].instruments.length) {
                if (synth.song.getPattern(instrument.modChannels[mod], synth.bar) != null)
                    usedInstruments = synth.song.getPattern(instrument.modChannels[mod], synth.bar)!.instruments;
            } else {
                usedInstruments.push(instrument.modInstruments[mod]);
            }
        }

        for (let instrumentIndex: number = 0; instrumentIndex < usedInstruments.length; instrumentIndex++) {

            synth.setModValue(tone.expressionStarts[0], tone.expressionStarts[0] + tone.expressionDeltas[0], mod, instrument.modChannels[mod], usedInstruments[instrumentIndex], setting);

            // Reset arps, but only at the start of the note
            if (setting == Config.modulators.dictionary["reset arp"].index && synth.tick == 0 && tone.noteStartPart == synth.beat * Config.partsPerBeat + synth.part) {
                synth.song.channels[instrument.modChannels[mod]].instruments[usedInstruments[instrumentIndex]].arpTime = 0;
            }
            // Denote next bar skip
            else if (setting == Config.modulators.dictionary["next bar"].index) {
                synth.wantToSkip = true;
            }
            // Extra info for eq filter target needs to be set as well
            else if (setting == Config.modulators.dictionary["eq filter"].index && !instrument.eqFilterType) {
                let dotTarget = instrument.modFilterTypes[mod];
                const tgtInstrument = synth.song.channels[instrument.modChannels[mod]].instruments[usedInstruments[instrumentIndex]];

                if (dotTarget == 0) { // Morph. Figure out the target filter's X/Y coords for this point. If no point exists with this index, or point types don't match, do lerp-out for this point and lerp-in of a new point

                    let pinIdx: number = 0;
                    const currentPart: number = synth.getTicksIntoBar() / Config.ticksPerPart;
                    while (tone.note!.start + tone.note!.pins[pinIdx].time <= currentPart) pinIdx++;
                    // 0 to 1 based on distance to next morph
                    //let lerpStartRatio: number = (currentPart - tone.note!.pins[pinIdx - 1].time) / (tone.note!.pins[pinIdx].time - tone.note!.pins[pinIdx - 1].time);
                    let lerpEndRatio: number = ((currentPart + (runLength / (synth.getSamplesPerTick() * Config.ticksPerPart)) * Config.ticksPerPart) - tone.note!.pins[pinIdx - 1].time) / (tone.note!.pins[pinIdx].time - tone.note!.pins[pinIdx - 1].time);

                    // Compute the new settings to go to.
                    if (tgtInstrument.eqSubFilters[tone.note!.pins[pinIdx - 1].size] != null || tgtInstrument.eqSubFilters[tone.note!.pins[pinIdx].size] != null) {
                        tgtInstrument.tmpEqFilterEnd = FilterSettings.lerpFilters(tgtInstrument.eqSubFilters[tone.note!.pins[pinIdx - 1].size]!, tgtInstrument.eqSubFilters[tone.note!.pins[pinIdx].size]!, lerpEndRatio);
                    } else {
                        // No mutation will occur to the filter object so we can safely return it without copying
                        tgtInstrument.tmpEqFilterEnd = tgtInstrument.eqFilter;
                    }

                } // Target (1 is dot 1 X, 2 is dot 1 Y, etc.)
                else {
                    // Since we are directly manipulating the filter, make sure it is a new one and not an actual one of the instrument's filters
                    for (let i: number = 0; i < Config.filterMorphCount; i++) {
                        if (tgtInstrument.tmpEqFilterEnd == tgtInstrument.eqSubFilters[i] && tgtInstrument.tmpEqFilterEnd != null) {
                            tgtInstrument.tmpEqFilterEnd = new FilterSettings();
                            tgtInstrument.tmpEqFilterEnd.fromJsonObject(tgtInstrument.eqSubFilters[i]!.toJsonObject());
                        }
                    }
                    if (tgtInstrument.tmpEqFilterEnd == null) {
                        tgtInstrument.tmpEqFilterEnd = new FilterSettings();
                        tgtInstrument.tmpEqFilterEnd.fromJsonObject(tgtInstrument.eqFilter.toJsonObject());
                    }

                    if (tgtInstrument.tmpEqFilterEnd.controlPointCount > Math.floor((dotTarget - 1) / 2)) {
                        if (dotTarget % 2) { // X
                            tgtInstrument.tmpEqFilterEnd.controlPoints[Math.floor((dotTarget - 1) / 2)].freq = tone.expressionStarts[0] + tone.expressionDeltas[0];
                        } else { // Y
                            tgtInstrument.tmpEqFilterEnd.controlPoints[Math.floor((dotTarget - 1) / 2)].gain = tone.expressionStarts[0] + tone.expressionDeltas[0];
                        }
                    }
                }
            }
            // Extra info for note filter target needs to be set as well
            else if (setting == Config.modulators.dictionary["note filter"].index && !instrument.noteFilterType) {
                let dotTarget = instrument.modFilterTypes[mod];
                const tgtInstrument = synth.song.channels[instrument.modChannels[mod]].instruments[usedInstruments[instrumentIndex]];

                if (dotTarget == 0) { // Morph. Figure out the target filter's X/Y coords for this point. If no point exists with this index, or point types don't match, do lerp-out for this point and lerp-in of a new point

                    let pinIdx: number = 0;
                    const currentPart: number = synth.getTicksIntoBar() / Config.ticksPerPart;
                    while (tone.note!.start + tone.note!.pins[pinIdx].time <= currentPart) pinIdx++;
                    // 0 to 1 based on distance to next morph
                    //let lerpStartRatio: number = (currentPart - tone.note!.pins[pinIdx - 1].time) / (tone.note!.pins[pinIdx].time - tone.note!.pins[pinIdx - 1].time);
                    let lerpEndRatio: number = ((currentPart + (runLength / (synth.getSamplesPerTick() * Config.ticksPerPart)) * Config.ticksPerPart) - tone.note!.pins[pinIdx - 1].time) / (tone.note!.pins[pinIdx].time - tone.note!.pins[pinIdx - 1].time);

                    // Compute the new settings to go to.
                    if (tgtInstrument.noteSubFilters[tone.note!.pins[pinIdx - 1].size] != null || tgtInstrument.noteSubFilters[tone.note!.pins[pinIdx].size] != null) {
                        tgtInstrument.tmpNoteFilterEnd = FilterSettings.lerpFilters(tgtInstrument.noteSubFilters[tone.note!.pins[pinIdx - 1].size]!, tgtInstrument.noteSubFilters[tone.note!.pins[pinIdx].size]!, lerpEndRatio);
                    } else {
                        // No mutation will occur to the filter object so we can safely return it without copying
                        tgtInstrument.tmpNoteFilterEnd = tgtInstrument.noteFilter;
                    }

                } // Target (1 is dot 1 X, 2 is dot 1 Y, etc.)
                else {
                    // Since we are directly manipulating the filter, make sure it is a new one and not an actual one of the instrument's filters

                    for (let i: number = 0; i < Config.filterMorphCount; i++) {
                        if (tgtInstrument.tmpNoteFilterEnd == tgtInstrument.noteSubFilters[i] && tgtInstrument.tmpNoteFilterEnd != null) {
                            tgtInstrument.tmpNoteFilterEnd = new FilterSettings();
                            tgtInstrument.tmpNoteFilterEnd.fromJsonObject(tgtInstrument.noteSubFilters[i]!.toJsonObject());
                        }
                    }
                    if (tgtInstrument.tmpNoteFilterEnd == null) {
                        tgtInstrument.tmpNoteFilterEnd = new FilterSettings();
                        tgtInstrument.tmpNoteFilterEnd.fromJsonObject(tgtInstrument.noteFilter.toJsonObject());
                    }

                    if (tgtInstrument.tmpNoteFilterEnd.controlPointCount > Math.floor((dotTarget - 1) / 2)) {
                        if (dotTarget % 2) { // X
                            tgtInstrument.tmpNoteFilterEnd.controlPoints[Math.floor((dotTarget - 1) / 2)].freq = tone.expressionStarts[0] + tone.expressionDeltas[0];
                        } else { // Y
                            tgtInstrument.tmpNoteFilterEnd.controlPoints[Math.floor((dotTarget - 1) / 2)].gain = tone.expressionStarts[0] + tone.expressionDeltas[0];
                        }
                    }
                }
            }

        }
    }

    private static findRandomZeroCrossing(wave: Float32Array, waveLength: number): number {
        let phase: number = Math.random() * waveLength;
        const phaseMask: number = waveLength - 1;

        // Spectrum and drumset waves sounds best when they start at a zero crossing,
        // otherwise they pop. Try to find a zero crossing.
        let indexPrev: number = phase & phaseMask;
        let wavePrev: number = wave[indexPrev];
        const stride: number = 16;
        for (let attemptsRemaining: number = 128; attemptsRemaining > 0; attemptsRemaining--) {
            const indexNext: number = (indexPrev + stride) & phaseMask;
            const waveNext: number = wave[indexNext];
            if (wavePrev * waveNext <= 0.0) {
                // Found a zero crossing! Now let's narrow it down to two adjacent sample indices.
                for (let i: number = 0; i < stride; i++) {
                    const innerIndexNext: number = (indexPrev + 1) & phaseMask;
                    const innerWaveNext: number = wave[innerIndexNext];
                    if (wavePrev * innerWaveNext <= 0.0) {
                        // Found the zero crossing again! Now let's find the exact intersection.
                        const slope: number = innerWaveNext - wavePrev;
                        phase = indexPrev;
                        if (Math.abs(slope) > 0.00000001) {
                            phase += -wavePrev / slope;
                        }
                        phase = Math.max(0, phase) % waveLength;
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
    public static noteSizeToVolumeMult(size: number): number {
        return Math.pow(Math.max(0.0, size) / Config.noteSizeMax, 1.5);
    }
    public static volumeMultToNoteSize(volumeMult: number): number {
        return Math.pow(Math.max(0.0, volumeMult), 1 / 1.5) * Config.noteSizeMax;
    }

    public static fadeInSettingToSeconds(setting: number): number {
        return 0.0125 * (0.95 * setting + 0.05 * setting * setting);
    }
    public static secondsToFadeInSetting(seconds: number): number {
        return clamp(0, Config.fadeInRange, Math.round((-0.95 + Math.sqrt(0.9025 + 0.2 * seconds / 0.0125)) / 0.1));
    }
    public static fadeOutSettingToTicks(setting: number): number {
        return Config.fadeOutTicks[setting];
    }
    public static ticksToFadeOutSetting(ticks: number): number {
        let lower: number = Config.fadeOutTicks[0];
        if (ticks <= lower) return 0;
        for (let i: number = 1; i < Config.fadeOutTicks.length; i++) {
            let upper: number = Config.fadeOutTicks[i];
            if (ticks <= upper) return (ticks < (lower + upper) / 2) ? i - 1 : i;
            lower = upper;
        }
        return Config.fadeOutTicks.length - 1;
    }

    public static detuneToCents(detune: number): number {
        // BeepBox formula, for reference:
        // return detune * (Math.abs(detune) + 1) / 2;
        return detune - Config.detuneCenter;
    }
    public static centsToDetune(cents: number): number {
        // BeepBox formula, for reference:
        // return Math.sign(cents) * (Math.sqrt(1 + 8 * Math.abs(cents)) - 1) / 2.0;
        return cents + Config.detuneCenter;
    }

    public static getOperatorWave(waveform: number, pulseWidth: number) {
        if (waveform != 3) {
            return Config.operatorWaves[waveform];
        }
        else {
            return Config.pwmOperatorWaves[pulseWidth];
        }
    }

    private getSamplesPerTick(): number {
        if (this.song == null) return 0;
        let beatsPerMinute: number = this.song.getBeatsPerMinute();
        if (this.isModActive(Config.modulators.dictionary["tempo"].index)) {
            beatsPerMinute = this.getModValue(Config.modulators.dictionary["tempo"].index);
        }
        return this.getSamplesPerTickSpecificBPM(beatsPerMinute);
    }

    private getSamplesPerTickSpecificBPM(beatsPerMinute: number): number {
        const beatsPerSecond: number = beatsPerMinute / 60.0;
        const partsPerSecond: number = Config.partsPerBeat * beatsPerSecond;
        const tickPerSecond: number = Config.ticksPerPart * partsPerSecond;
        return this.samplesPerSecond / tickPerSecond;
    }

    public static fittingPowerOfTwo(x: number): number {
        return 1 << (32 - Math.clz32(Math.ceil(x) - 1));
    }

    private sanitizeFilters(filters: DynamicBiquadFilter[]): void {
        let reset: boolean = false;
        for (const filter of filters) {
            const output1: number = Math.abs(filter.output1);
            const output2: number = Math.abs(filter.output2);
            // If either is a large value, Infinity, or NaN, then just reset all filter history.
            if (!(output1 < 100) || !(output2 < 100)) {
                reset = true;
                break;
            }
            if (output1 < epsilon) filter.output1 = 0.0;
            if (output2 < epsilon) filter.output2 = 0.0;
        }
        if (reset) {
            for (const filter of filters) {
                filter.output1 = 0.0;
                filter.output2 = 0.0;
            }
        }
    }

    public static sanitizeDelayLine(delayLine: Float32Array, lastIndex: number, mask: number): void {
        while (true) {
            lastIndex--;
            const index: number = lastIndex & mask;
            const sample: number = Math.abs(delayLine[index]);
            if (Number.isFinite(sample) && (sample == 0.0 || sample >= epsilon)) break;
            delayLine[index] = 0.0;
        }
    }

    public static applyFilters(sample: number, input1: number, input2: number, filterCount: number, filters: DynamicBiquadFilter[]): number {
        for (let i: number = 0; i < filterCount; i++) {
            const filter: DynamicBiquadFilter = filters[i];
            const output1: number = filter.output1;
            const output2: number = filter.output2;
            const a1: number = filter.a1;
            const a2: number = filter.a2;
            const b0: number = filter.b0;
            const b1: number = filter.b1;
            const b2: number = filter.b2;
            sample = b0 * sample + b1 * input1 + b2 * input2 - a1 * output1 - a2 * output2;
            filter.a1 = a1 + filter.a1Delta;
            filter.a2 = a2 + filter.a2Delta;
            if (filter.useMultiplicativeInputCoefficients) {
                filter.b0 = b0 * filter.b0Delta;
                filter.b1 = b1 * filter.b1Delta;
                filter.b2 = b2 * filter.b2Delta;
            } else {
                filter.b0 = b0 + filter.b0Delta;
                filter.b1 = b1 + filter.b1Delta;
                filter.b2 = b2 + filter.b2Delta;
            }
            filter.output2 = output1;
            filter.output1 = sample;
            // Updating the input values is waste if the next filter doesn't exist...
            input2 = output2;
            input1 = output1;
        }
        return sample;
    }
}

// When compiling synth.ts as a standalone module named "beepbox", expose these classes as members to JavaScript:
export { Dictionary, DictionaryArray, FilterType, EnvelopeType, InstrumentType, Transition, Chord, Envelope, Config };
