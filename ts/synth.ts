/*
Copyright (C) 2018 John Nesky

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

/// <reference path="FFT.ts" />
/// <reference path="Deque.ts" />

interface Window {
	AudioContext: any;
	webkitAudioContext: any;
	mozAudioContext: any;
	oAudioContext: any;
	msAudioContext: any;
}

namespace beepbox {
	// For performance debugging:
	let samplesAccumulated: number = 0;
	let samplePerformance: number = 0;
	
	interface Dictionary<T> {
		[K: string]: T;
	}
	
	export const enum EnvelopeType {
		custom,
		steady,
		punch,
		flare,
		pluck,
		tremolo,
		tremolo2,
		decay,
	}
	
	export const enum InstrumentType {
		chip = 0,
		fm = 1,
		noise = 2,
		length,
	}

	export interface Scale {
		readonly name: string;
		readonly flags: ReadonlyArray<boolean>;
	}
	
	export interface Key {
		readonly name: string;
		readonly isWhiteKey: boolean;
		readonly basePitch: number;
	}

	export interface Rhythm {
		readonly name: string;
		readonly stepsPerBeat: number;
		readonly ticksPerArpeggio: number;
		readonly arpeggioPatterns: ReadonlyArray<ReadonlyArray<number>>;
	}

	export interface Preset {
		readonly name: string;
		readonly isNoise: boolean;
		readonly midiProgram?: number;
		readonly customType?: InstrumentType;
		//readonly generator?: (i: Instrument)=>void;
		readonly settings?: any;
	}

	export interface ChipWave {
		readonly name: string;
		readonly volume: number;
		readonly samples: Float64Array;
	}

	export interface NoiseWave {
		readonly name: string;
		readonly volume: number;
		readonly basePitch: number;
		readonly pitchFilterMult: number;
		readonly isSoft: boolean;
		samples: Float32Array | null;
	}

	export interface Transition {
		readonly name: string;
		readonly isSeamless: boolean;
		readonly attackSeconds: number;
		readonly releases: boolean;
		readonly releaseTicks: number;
		readonly slides: boolean;
		readonly slideTicks: number;
	}

	export interface Vibrato {
		readonly name: string;
		readonly amplitude: number;
		readonly periodsSeconds: ReadonlyArray<number>;
		readonly delayParts: number;
	}

	export interface Interval {
		readonly name: string;
		readonly spread: number;
		readonly offset: number;
		readonly volume: number;
		readonly sign: number;
	}

	export interface Chord {
		readonly name: string;
		readonly harmonizes: boolean;
		readonly arpeggiates: boolean;
		readonly allowedForNoise: boolean;
		readonly strumParts: number;
	}

	export interface Algorithm {
		readonly name: string;
		readonly carrierCount: number;
		readonly associatedCarrier: ReadonlyArray<number>;
		readonly modulatedBy: ReadonlyArray<ReadonlyArray<number>>;
	}

	export interface OperatorFrequency {
		readonly name: string;
		readonly mult: number;
		readonly hzOffset: number;
		readonly amplitudeSign: number;
	}

	export interface Envelope {
		readonly name: string;
		readonly type: EnvelopeType;
		readonly speed: number;
		readonly inverted: boolean;
	}

	export interface Feedback {
		readonly name: string;
		readonly indices: ReadonlyArray<ReadonlyArray<number>>;
	}

	export interface ChannelColors {
		readonly name: string;
		readonly channelDim: string;
		readonly channelBright: string;
		readonly noteDim: string;
		readonly noteBright: string;
	}
	
	export class Config {
		public static readonly scales: ReadonlyArray<Scale> = [
			{name: "easy :)",         flags: [ true, false,  true, false,  true, false, false,  true, false,  true, false, false]},
			{name: "easy :(",         flags: [ true, false, false,  true, false,  true, false,  true, false, false,  true, false]},
			{name: "island :)",       flags: [ true, false, false, false,  true,  true, false,  true, false, false, false,  true]},
			{name: "island :(",       flags: [ true,  true, false,  true, false, false, false,  true,  true, false, false, false]},
			{name: "blues :)",        flags: [ true, false,  true,  true,  true, false, false,  true, false,  true, false, false]},
			{name: "blues :(",        flags: [ true, false, false,  true, false,  true,  true,  true, false, false,  true, false]},
			{name: "normal :)",       flags: [ true, false,  true, false,  true,  true, false,  true, false,  true, false,  true]},
			{name: "normal :(",       flags: [ true, false,  true,  true, false,  true, false,  true,  true, false,  true, false]},
			{name: "dbl harmonic :)", flags: [ true,  true, false, false,  true,  true, false,  true,  true, false, false,  true]},
			{name: "dbl harmonic :(", flags: [ true, false,  true,  true, false, false,  true,  true,  true, false, false,  true]},
			{name: "enigma",          flags: [ true, false,  true, false,  true, false,  true, false,  true, false,  true, false]},
			{name: "expert",          flags: [ true,  true,  true,  true,  true,  true,  true,  true,  true,  true,  true,  true]},
		];
		public static readonly keys: ReadonlyArray<Key> = [
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
		];
		public static readonly blackKeyNameParents: ReadonlyArray<number> = [-1, 1, -1, 1, -1, 1, -1, -1, 1, -1, 1, -1];
		public static readonly tempoSteps: number = 15;
		public static readonly reverbRange: number = 4;
		public static readonly beatsPerBarMin: number = 3;
		public static readonly beatsPerBarMax: number = 16;
		public static readonly barCountMin: number = 1;
		public static readonly barCountMax: number = 128;
		public static readonly patternsPerChannelMin: number = 1;
		public static readonly patternsPerChannelMax: number = 64;
		public static readonly instrumentsPerChannelMin: number = 1;
		public static readonly instrumentsPerChannelMax: number = 10;
		public static readonly partsPerBeat: number = 24;
		public static readonly ticksPerPart: number = 2;
		public static readonly rhythms: ReadonlyArray<Rhythm> = [
			{name: "÷3 (triplets)", stepsPerBeat: 3, ticksPerArpeggio: 4, arpeggioPatterns: [[0], [0, 0, 1, 1], [0, 1, 2, 1], [0, 1, 2, 3]]},
			{name: "÷4 (standard)", stepsPerBeat: 4, ticksPerArpeggio: 3, arpeggioPatterns: [[0], [0, 0, 1, 1], [0, 1, 2, 1], [0, 1, 2, 3]]},
			{name: "÷6",            stepsPerBeat: 6, ticksPerArpeggio: 4, arpeggioPatterns: [[0], [0, 1],       [0, 1, 2, 1], [0, 1, 2, 3]]},
			{name: "÷8",            stepsPerBeat: 8, ticksPerArpeggio: 3, arpeggioPatterns: [[0], [0, 1],       [0, 1, 2, 1], [0, 1, 2, 3]]},
		];
		
		public static readonly customTypePresets: ReadonlyArray<Preset> = [
			{name: "custom chip",  isNoise: false, customType: InstrumentType.chip},
			{name: "custom FM",    isNoise: false, customType: InstrumentType.fm},
			{name: "custom noise", isNoise:  true, customType: InstrumentType.noise},
		];
		public static readonly beepboxPresetStart: number = 1024;
		public static readonly beepboxPresets: ReadonlyArray<Preset> = [
			{name: "square chiptune",  midiProgram:  80, isNoise: false, settings: {"type":"chip","transition":"seamless","effects":"none","chord":"arpeggio","filterCutoffHz":8000,"filterResonance":0,"filterEnvelope":"steady","volume":100,"wave":"square","interval":"union","vibrato":"none"}},
			{name: "triangle chiptune",midiProgram:  71, isNoise: false, settings: {"type":"chip","transition":"seamless","effects":"none","chord":"arpeggio","filterCutoffHz":2000,"filterResonance":0,"filterEnvelope":"steady","volume":100,"wave":"triangle","interval":"union","vibrato":"none"}},
			{name: "buzz saw",         midiProgram:  81, isNoise: false, settings: {"type":"FM","volume":100,"transition":"soft","effects":"reverb","chord":"custom interval","filterCutoffHz":2000,"filterResonance":0,"filterEnvelope":"steady","vibrato":"none","algorithm":"1←2←3←4","feedbackType":"1⟲","feedbackAmplitude":0,"feedbackEnvelope":"steady","operators":[{"frequency":"5×","amplitude":9,"envelope":"custom"},{"frequency":"1×","amplitude":10,"envelope":"steady"},{"frequency":"~1×","amplitude":6,"envelope":"steady"},{"frequency":"11×","amplitude":12,"envelope":"steady"}]}},
			{name: "tiny robot",       midiProgram:  81, isNoise: false, settings: {"type":"FM","volume":100,"transition":"slide","effects":"reverb","chord":"harmony","filterCutoffHz":8000,"filterResonance":0,"filterEnvelope":"steady","vibrato":"delayed","algorithm":"1←(2 3 4)","feedbackType":"1⟲","feedbackAmplitude":2,"feedbackEnvelope":"pluck 3","operators":[{"frequency":"2×","amplitude":15,"envelope":"custom"},{"frequency":"1×","amplitude":7,"envelope":"punch"},{"frequency":"~1×","amplitude":7,"envelope":"steady"},{"frequency":"1×","amplitude":0,"envelope":"steady"}]}},
		];
		public static readonly midiPresetStart: number = 2048;
		public static readonly midiPresets: ReadonlyArray<Preset> = [
			{name: "grand piano",      midiProgram:   0, isNoise: false, settings: {"type":"chip","transition":"medium fade","effects":"reverb","chord":"harmony","filterCutoffHz":1414,"filterResonance":29,"filterEnvelope":"pluck 3","volume":100,"wave":"1/6 pulse","interval":"shimmer","vibrato":"none"}},
			{name: "bright piano",     midiProgram:   1, isNoise: false, settings: {"type":"chip","transition":"medium fade","effects":"reverb","chord":"harmony","filterCutoffHz":2000,"filterResonance":29,"filterEnvelope":"pluck 3","volume":100,"wave":"1/8 pulse","interval":"shimmer","vibrato":"none"}},
			{name: "electric grand",   midiProgram:   2, isNoise: false, settings: {"type":"chip","transition":"fast fade","effects":"reverb","chord":"harmony","filterCutoffHz":2828,"filterResonance":14,"filterEnvelope":"pluck 3","volume":80,"wave":"1/6 pulse","interval":"shimmer","vibrato":"none"}},
			{name: "honky-tonk piano", midiProgram:   3, isNoise: false, settings: {"type":"chip","transition":"medium fade","effects":"reverb","chord":"harmony","filterCutoffHz":2000,"filterResonance":29,"filterEnvelope":"pluck 3","volume":80,"wave":"1/6 pulse","interval":"honky tonk","vibrato":"none"}},
			{name: "electric piano 1", midiProgram:   4, isNoise: false, settings: {"type":"FM","volume":100,"transition":"fast fade","effects":"reverb","chord":"harmony","filterCutoffHz":1414,"filterResonance":14,"filterEnvelope":"pluck 3","vibrato":"none","algorithm":"1←(2 3 4)","feedbackType":"1⟲","feedbackAmplitude":0,"feedbackEnvelope":"steady","operators":[{"frequency":"1×","amplitude":15,"envelope":"custom"},{"frequency":"2×","amplitude":2,"envelope":"pluck 2"},{"frequency":"~1×","amplitude":3,"envelope":"steady"},{"frequency":"1×","amplitude":0,"envelope":"steady"}]}},
			{name: "electric piano 2", midiProgram:   5, isNoise: false, settings: {"type":"FM","volume":100,"transition":"hard","effects":"reverb","chord":"harmony","filterCutoffHz":1414,"filterResonance":14,"filterEnvelope":"pluck 3","vibrato":"none","algorithm":"1←(2 3 4)","feedbackType":"1⟲","feedbackAmplitude":0,"feedbackEnvelope":"steady","operators":[{"frequency":"1×","amplitude":11,"envelope":"custom"},{"frequency":"20×","amplitude":5,"envelope":"pluck 2"},{"frequency":"~1×","amplitude":5,"envelope":"steady"},{"frequency":"1×","amplitude":0,"envelope":"steady"}]}},
			{name: "harpsichord",      midiProgram:   6, isNoise: false, settings: {"type":"FM","volume":80,"transition":"fast fade","effects":"reverb","chord":"harmony","filterCutoffHz":8000,"filterResonance":43,"filterEnvelope":"pluck 3","vibrato":"none","algorithm":"1←(2 3 4)","feedbackType":"3⟲","feedbackAmplitude":6,"feedbackEnvelope":"steady","operators":[{"frequency":"2×","amplitude":15,"envelope":"custom"},{"frequency":"1×","amplitude":7,"envelope":"steady"},{"frequency":"5×","amplitude":5,"envelope":"pluck 3"},{"frequency":"1×","amplitude":0,"envelope":"steady"}]}},
			{name: "clavinet",         midiProgram:   7, isNoise: false, settings: {"type":"FM","volume":80,"transition":"hard","effects":"reverb","chord":"harmony","filterCutoffHz":4000,"filterResonance":14,"filterEnvelope":"pluck 3","vibrato":"none","algorithm":"1←(2 3 4)","feedbackType":"1⟲","feedbackAmplitude":0,"feedbackEnvelope":"steady","operators":[{"frequency":"4×","amplitude":14,"envelope":"custom"},{"frequency":"~1×","amplitude":7,"envelope":"steady"},{"frequency":"7×","amplitude":3,"envelope":"steady"},{"frequency":"11×","amplitude":6,"envelope":"pluck 2"}]}},
			{name: "celesta",          midiProgram:   8, isNoise: false, settings: {"type":"FM","volume":100,"transition":"fast fade","effects":"reverb","chord":"strum","filterCutoffHz":5657,"filterResonance":14,"filterEnvelope":"pluck 2","vibrato":"none","algorithm":"(1 2)←(3 4)","feedbackType":"1⟲ 2⟲","feedbackAmplitude":0,"feedbackEnvelope":"steady","operators":[{"frequency":"1×","amplitude":11,"envelope":"custom"},{"frequency":"8×","amplitude":4,"envelope":"custom"},{"frequency":"20×","amplitude":3,"envelope":"pluck 1"},{"frequency":"1×","amplitude":0,"envelope":"steady"}]}},
			{name: "glockenspiel",     midiProgram:   9, isNoise: false, settings: {"type":"FM","volume":100,"transition":"fast fade","effects":"reverb","chord":"strum","filterCutoffHz":5657,"filterResonance":14,"filterEnvelope":"pluck 2","vibrato":"none","algorithm":"(1 2 3)←4","feedbackType":"1⟲ 2⟲ 3⟲","feedbackAmplitude":0,"feedbackEnvelope":"steady","operators":[{"frequency":"1×","amplitude":9,"envelope":"custom"},{"frequency":"5×","amplitude":7,"envelope":"custom"},{"frequency":"16×","amplitude":5,"envelope":"custom"},{"frequency":"20×","amplitude":1,"envelope":"pluck 1"}]}},
			{name: "music box",        midiProgram:  10, isNoise: false, settings: {"type":"FM","volume":100,"transition":"fast fade","effects":"reverb","chord":"strum","filterCutoffHz":4000,"filterResonance":14,"filterEnvelope":"pluck 2","vibrato":"none","algorithm":"1 2 3 4","feedbackType":"1⟲ 2⟲ 3⟲ 4⟲","feedbackAmplitude":0,"feedbackEnvelope":"steady","operators":[{"frequency":"1×","amplitude":7,"envelope":"custom"},{"frequency":"4×","amplitude":7,"envelope":"custom"},{"frequency":"8×","amplitude":6,"envelope":"custom"},{"frequency":"16×","amplitude":3,"envelope":"custom"}]}},
			{name: "vibraphone",       midiProgram:  11, isNoise: false, settings: {"type":"FM","volume":100,"transition":"fast fade","effects":"reverb","chord":"harmony","filterCutoffHz":2828,"filterResonance":14,"filterEnvelope":"pluck 2","vibrato":"none","algorithm":"1 2 3 4","feedbackType":"1⟲ 2⟲ 3⟲ 4⟲","feedbackAmplitude":0,"feedbackEnvelope":"steady","operators":[{"frequency":"1×","amplitude":9,"envelope":"custom"},{"frequency":"~1×","amplitude":9,"envelope":"custom"},{"frequency":"3×","amplitude":4,"envelope":"custom"},{"frequency":"4×","amplitude":7,"envelope":"custom"}]}},
			{name: "marimba",          midiProgram:  12, isNoise: false, settings: {"type":"FM","volume":100,"transition":"fast fade","effects":"reverb","chord":"strum","filterCutoffHz":4000,"filterResonance":14,"filterEnvelope":"pluck 1","vibrato":"none","algorithm":"(1 2)←(3 4)","feedbackType":"1⟲ 2⟲","feedbackAmplitude":0,"feedbackEnvelope":"steady","operators":[{"frequency":"1×","amplitude":15,"envelope":"custom"},{"frequency":"6×","amplitude":5,"envelope":"custom"},{"frequency":"20×","amplitude":3,"envelope":"pluck 1"},{"frequency":"1×","amplitude":0,"envelope":"steady"}]}},
			{name: "xylophone",        midiProgram:  13, isNoise: false, settings: {"type":"FM","volume":100,"transition":"hard","effects":"reverb","chord":"strum","filterCutoffHz":2000,"filterResonance":14,"filterEnvelope":"pluck 1","vibrato":"none","algorithm":"(1 2 3)←4","feedbackType":"1⟲ 2⟲","feedbackAmplitude":3,"feedbackEnvelope":"pluck 1","operators":[{"frequency":"1×","amplitude":9,"envelope":"custom"},{"frequency":"6×","amplitude":9,"envelope":"custom"},{"frequency":"11×","amplitude":9,"envelope":"custom"},{"frequency":"20×","amplitude":6,"envelope":"pluck 1"}]}},
			{name: "tubular bells",    midiProgram:  14, isNoise: false, settings: {"type":"FM","volume":100,"transition":"fast fade","effects":"reverb","chord":"strum","filterCutoffHz":2000,"filterResonance":29,"filterEnvelope":"pluck 3","vibrato":"none","algorithm":"1←(2 3 4)","feedbackType":"1⟲","feedbackAmplitude":0,"feedbackEnvelope":"pluck 1","operators":[{"frequency":"~2×","amplitude":8,"envelope":"custom"},{"frequency":"7×","amplitude":6,"envelope":"pluck 2"},{"frequency":"20×","amplitude":1,"envelope":"pluck 1"},{"frequency":"1×","amplitude":0,"envelope":"steady"}]}},
			{name: "dulcimer",         midiProgram:  15, isNoise: false, settings: {"type":"chip","volume":100,"transition":"fast fade","effects":"reverb","chord":"strum","filterCutoffHz":5657,"filterResonance":14,"filterEnvelope":"pluck 2","wave":"double saw","interval":"shimmer","vibrato":"none"}},
			{name: "drawbar organ",    midiProgram:  16, isNoise: false, settings: {"type":"FM","volume":100,"transition":"hard","effects":"reverb","chord":"harmony","filterCutoffHz":2828,"filterResonance":14,"filterEnvelope":"steady","vibrato":"none","algorithm":"1 2 3 4","feedbackType":"1⟲ 2⟲ 3⟲ 4⟲","feedbackAmplitude":0,"feedbackEnvelope":"steady","operators":[{"frequency":"1×","amplitude":6,"envelope":"custom"},{"frequency":"2×","amplitude":5,"envelope":"custom"},{"frequency":"4×","amplitude":4,"envelope":"custom"},{"frequency":"8×","amplitude":3,"envelope":"custom"}]}},
			{name: "percussive organ", midiProgram:  17, isNoise: false, settings: {"type":"FM","volume":100,"transition":"hard","effects":"reverb","chord":"harmony","filterCutoffHz":2828,"filterResonance":14,"filterEnvelope":"steady","vibrato":"none","algorithm":"1 2 3 4","feedbackType":"1⟲ 2⟲ 3⟲ 4⟲","feedbackAmplitude":6,"feedbackEnvelope":"pluck 1","operators":[{"frequency":"1×","amplitude":6,"envelope":"custom"},{"frequency":"2×","amplitude":6,"envelope":"custom"},{"frequency":"3×","amplitude":6,"envelope":"custom"},{"frequency":"4×","amplitude":6,"envelope":"custom"}]}},
			{name: "rock organ",       midiProgram:  18, isNoise: false, settings: {"type":"FM","volume":100,"transition":"hard","effects":"chorus & reverb","chord":"harmony","filterCutoffHz":8000,"filterResonance":0,"filterEnvelope":"steady","vibrato":"delayed","algorithm":"1 2 3←4","feedbackType":"1⟲ 2⟲ 3⟲","feedbackAmplitude":5,"feedbackEnvelope":"flare 1","operators":[{"frequency":"~1×","amplitude":9,"envelope":"custom"},{"frequency":"2×","amplitude":9,"envelope":"custom"},{"frequency":"4×","amplitude":9,"envelope":"custom"},{"frequency":"~1×","amplitude":3,"envelope":"custom"}]}},
			{name: "church organ",     midiProgram:  19, isNoise: false, settings: {"type":"FM","volume":100,"transition":"cross-fade","effects":"reverb","chord":"harmony","filterCutoffHz":8000,"filterResonance":0,"filterEnvelope":"steady","vibrato":"none","algorithm":"1 2 3 4","feedbackType":"1⟲ 2⟲ 3⟲ 4⟲","feedbackAmplitude":4,"feedbackEnvelope":"steady","operators":[{"frequency":"~1×","amplitude":7,"envelope":"custom"},{"frequency":"~2×","amplitude":6,"envelope":"custom"},{"frequency":"4×","amplitude":5,"envelope":"custom"},{"frequency":"8×","amplitude":4,"envelope":"custom"}]}},
			{name: "reed organ",       midiProgram:  20, isNoise: false, settings: {"type":"chip","volume":60,"transition":"soft","effects":"reverb","chord":"harmony","filterCutoffHz":2000,"filterResonance":43,"filterEnvelope":"steady","wave":"double saw","interval":"hum","vibrato":"none"}},
			{name: "accordion",        midiProgram:  21, isNoise: false, settings: {"type":"chip","volume":60,"transition":"soft","effects":"reverb","chord":"harmony","filterCutoffHz":2828,"filterResonance":14,"filterEnvelope":"steady","wave":"double pulse","interval":"honky tonk","vibrato":"none"}},
			{name: "harmonica",        midiProgram:  22, isNoise: false, settings: {"type":"FM","volume":100,"transition":"soft","effects":"reverb","chord":"harmony","filterCutoffHz":1414,"filterResonance":43,"filterEnvelope":"tremolo5","vibrato":"none","algorithm":"1←(2 3)←4","feedbackType":"1⟲","feedbackAmplitude":0,"feedbackEnvelope":"steady","operators":[{"frequency":"1×","amplitude":11,"envelope":"custom"},{"frequency":"1×","amplitude":11,"envelope":"steady"},{"frequency":"8×","amplitude":6,"envelope":"steady"},{"frequency":"16×","amplitude":3,"envelope":"steady"}]}},
			{name: "bandoneon",        midiProgram:  23, isNoise: false, settings: {"type":"chip","volume":60,"transition":"soft","effects":"reverb","chord":"harmony","filterCutoffHz":1414,"filterResonance":0,"filterEnvelope":"swell 1","wave":"1/12 pulse","interval":"hum","vibrato":"none"}},
			{name: "nylon guitar",     midiProgram:  24, isNoise: false, settings: {"type":"FM","volume":100,"transition":"fast fade","effects":"reverb","chord":"strum","filterCutoffHz":5657,"filterResonance":14,"filterEnvelope":"pluck 2","vibrato":"none","algorithm":"1←(2 3 4)","feedbackType":"3⟲","feedbackAmplitude":5,"feedbackEnvelope":"pluck 2","operators":[{"frequency":"3×","amplitude":13,"envelope":"custom"},{"frequency":"1×","amplitude":8,"envelope":"steady"},{"frequency":"6×","amplitude":4,"envelope":"steady"},{"frequency":"16×","amplitude":1,"envelope":"pluck 1"}]}},
			{name: "steel guitar",     midiProgram:  25, isNoise: false, settings: {"type":"FM","volume":100,"transition":"fast fade","effects":"reverb","chord":"strum","filterCutoffHz":8000,"filterResonance":29,"filterEnvelope":"pluck 3","vibrato":"none","algorithm":"1←(2 3 4)","feedbackType":"4⟲","feedbackAmplitude":6,"feedbackEnvelope":"pluck 1","operators":[{"frequency":"3×","amplitude":13,"envelope":"custom"},{"frequency":"1×","amplitude":7,"envelope":"steady"},{"frequency":"4×","amplitude":4,"envelope":"pluck 3"},{"frequency":"16×","amplitude":1,"envelope":"pluck 2"}]}},
			{name: "jazz guitar",      midiProgram:  26, isNoise: false, settings: {"type":"FM","volume":100,"transition":"hard","effects":"reverb","chord":"strum","filterCutoffHz":2000,"filterResonance":14,"filterEnvelope":"pluck 3","vibrato":"none","algorithm":"1←(2 3 4)","feedbackType":"1⟲","feedbackAmplitude":0,"feedbackEnvelope":"steady","operators":[{"frequency":"2×","amplitude":13,"envelope":"custom"},{"frequency":"1×","amplitude":8,"envelope":"steady"},{"frequency":"3×","amplitude":5,"envelope":"pluck 3"},{"frequency":"9×","amplitude":2,"envelope":"pluck 1"}]}},
			{name: "clean guitar",     midiProgram:  27, isNoise: false, settings: {"type":"chip","transition":"fast fade","effects":"reverb","chord":"strum","filterCutoffHz":8000,"filterResonance":14,"filterEnvelope":"pluck 2","volume":100,"wave":"1/16 pulse","interval":"union","vibrato":"none"}},
			{name: "muted guitar",     midiProgram:  28, isNoise: false, settings: {"type":"FM","volume":100,"transition":"hard","effects":"reverb","chord":"strum","filterCutoffHz":5657,"filterResonance":14,"filterEnvelope":"pluck 1","vibrato":"none","algorithm":"1←(2 3 4)","feedbackType":"1⟲","feedbackAmplitude":0,"feedbackEnvelope":"steady","operators":[{"frequency":"3×","amplitude":13,"envelope":"custom"},{"frequency":"1×","amplitude":6,"envelope":"steady"},{"frequency":"6×","amplitude":5,"envelope":"pluck 1"},{"frequency":"16×","amplitude":1,"envelope":"pluck 1"}]}},
			{name: "overdrive guitar", midiProgram:  29, isNoise: false, settings: {"type":"FM","volume":100,"transition":"hard","effects":"reverb","chord":"harmony","filterCutoffHz":4000,"filterResonance":14,"filterEnvelope":"steady","vibrato":"none","algorithm":"1←(2 3 4)","feedbackType":"1→2","feedbackAmplitude":3,"feedbackEnvelope":"steady","operators":[{"frequency":"~1×","amplitude":9,"envelope":"custom"},{"frequency":"1×","amplitude":11,"envelope":"steady"},{"frequency":"1×","amplitude":8,"envelope":"pluck 2"},{"frequency":"1×","amplitude":0,"envelope":"steady"}]}},
			{name: "distortion guitar",midiProgram:  30, isNoise: false, settings: {"type":"FM","volume":100,"transition":"hard","effects":"reverb","chord":"harmony","filterCutoffHz":5657,"filterResonance":29,"filterEnvelope":"steady","vibrato":"none","algorithm":"1←(2 3 4)","feedbackType":"1→2","feedbackAmplitude":4,"feedbackEnvelope":"steady","operators":[{"frequency":"~1×","amplitude":9,"envelope":"custom"},{"frequency":"1×","amplitude":11,"envelope":"steady"},{"frequency":"1×","amplitude":8,"envelope":"steady"},{"frequency":"1×","amplitude":0,"envelope":"steady"}]}},
			{name: "guitar harmonics", midiProgram:  31, isNoise: false, settings: {"type":"FM","volume":100,"transition":"hard","effects":"reverb","chord":"harmony","filterCutoffHz":8000,"filterResonance":14,"filterEnvelope":"pluck 3","vibrato":"none","algorithm":"(1 2)←(3 4)","feedbackType":"1→2→3→4","feedbackAmplitude":9,"feedbackEnvelope":"tremolo4","operators":[{"frequency":"4×","amplitude":11,"envelope":"custom"},{"frequency":"13×","amplitude":3,"envelope":"custom"},{"frequency":"~1×","amplitude":5,"envelope":"flare 1"},{"frequency":"20×","amplitude":2,"envelope":"swell 3"}]}},
			{name: "acoustic bass",    midiProgram:  32, isNoise: false, settings: {"type":"FM","volume":100,"transition":"fast fade","effects":"reverb","chord":"strum","filterCutoffHz":2000,"filterResonance":14,"filterEnvelope":"pluck 3","vibrato":"none","algorithm":"1←(2 3 4)","feedbackType":"3⟲","feedbackAmplitude":2,"feedbackEnvelope":"steady","operators":[{"frequency":"1×","amplitude":13,"envelope":"custom"},{"frequency":"~1×","amplitude":3,"envelope":"steady"},{"frequency":"3×","amplitude":5,"envelope":"pluck 3"},{"frequency":"9×","amplitude":1,"envelope":"pluck 1"}]}},
			{name: "finger bass",      midiProgram:  33, isNoise: false, settings: {"type":"FM","volume":100,"transition":"fast fade","effects":"reverb","chord":"strum","filterCutoffHz":2000,"filterResonance":14,"filterEnvelope":"pluck 3","vibrato":"none","algorithm":"1←(2 3 4)","feedbackType":"2⟲ 3⟲ 4⟲","feedbackAmplitude":5,"feedbackEnvelope":"pluck 2","operators":[{"frequency":"1×","amplitude":15,"envelope":"custom"},{"frequency":"~1×","amplitude":2,"envelope":"steady"},{"frequency":"3×","amplitude":4,"envelope":"pluck 2"},{"frequency":"9×","amplitude":1,"envelope":"pluck 1"}]}},
			{name: "pick bass",        midiProgram:  34, isNoise: false, settings: {"type":"FM","volume":100,"transition":"fast fade","effects":"reverb","chord":"strum","filterCutoffHz":2000,"filterResonance":14,"filterEnvelope":"pluck 2","vibrato":"none","algorithm":"1←(2 3 4)","feedbackType":"1⟲","feedbackAmplitude":0,"feedbackEnvelope":"steady","operators":[{"frequency":"2×","amplitude":15,"envelope":"custom"},{"frequency":"1×","amplitude":6,"envelope":"steady"},{"frequency":"7×","amplitude":3,"envelope":"pluck 3"},{"frequency":"13×","amplitude":1,"envelope":"pluck 1"}]}},
			{name: "fretless bass",    midiProgram:  35, isNoise: false, settings: {"type":"FM","volume":100,"transition":"medium fade","effects":"reverb","chord":"strum","filterCutoffHz":2828,"filterResonance":14,"filterEnvelope":"pluck 3","vibrato":"delayed","algorithm":"1←(2 3 4)","feedbackType":"2⟲","feedbackAmplitude":5,"feedbackEnvelope":"pluck 3","operators":[{"frequency":"2×","amplitude":15,"envelope":"custom"},{"frequency":"1×","amplitude":7,"envelope":"steady"},{"frequency":"6×","amplitude":1,"envelope":"pluck 2"},{"frequency":"1×","amplitude":0,"envelope":"steady"}]}},
			{name: "slap bass 1",      midiProgram:  36, isNoise: false, settings: {"type":"FM","volume":100,"transition":"fast fade","effects":"reverb","chord":"strum","filterCutoffHz":4000,"filterResonance":14,"filterEnvelope":"pluck 2","vibrato":"none","algorithm":"1←(2 3 4)","feedbackType":"4⟲","feedbackAmplitude":3,"feedbackEnvelope":"pluck 1","operators":[{"frequency":"3×","amplitude":13,"envelope":"custom"},{"frequency":"1×","amplitude":6,"envelope":"steady"},{"frequency":"8×","amplitude":4,"envelope":"steady"},{"frequency":"20×","amplitude":4,"envelope":"pluck 3"}]}},
			{name: "slap bass 2",      midiProgram:  37, isNoise: false, settings: {"type":"FM","volume":100,"transition":"fast fade","effects":"reverb","chord":"strum","filterCutoffHz":4000,"filterResonance":14,"filterEnvelope":"pluck 2","vibrato":"none","algorithm":"1←(2 3 4)","feedbackType":"3⟲","feedbackAmplitude":3,"feedbackEnvelope":"pluck 1","operators":[{"frequency":"4×","amplitude":13,"envelope":"custom"},{"frequency":"1×","amplitude":7,"envelope":"steady"},{"frequency":"7×","amplitude":6,"envelope":"steady"},{"frequency":"16×","amplitude":3,"envelope":"pluck 3"}]}},
			{name: "synth bass 1",     midiProgram:  38, isNoise: false, settings: {"type":"FM","volume":100,"transition":"fast fade","effects":"reverb","chord":"strum","filterCutoffHz":4000,"filterResonance":14,"filterEnvelope":"steady","vibrato":"none","algorithm":"1←(2 3 4)","feedbackType":"2⟲","feedbackAmplitude":7,"feedbackEnvelope":"steady","operators":[{"frequency":"1×","amplitude":14,"envelope":"custom"},{"frequency":"1×","amplitude":13,"envelope":"pluck 2"},{"frequency":"1×","amplitude":0,"envelope":"steady"},{"frequency":"1×","amplitude":0,"envelope":"steady"}]}},
			{name: "synth bass 2",     midiProgram:  39, isNoise: false, settings: {"type":"FM","volume":100,"transition":"fast fade","effects":"reverb","chord":"strum","filterCutoffHz":5657,"filterResonance":14,"filterEnvelope":"steady","vibrato":"none","algorithm":"1←(2 3 4)","feedbackType":"2⟲","feedbackAmplitude":7,"feedbackEnvelope":"steady","operators":[{"frequency":"3×","amplitude":12,"envelope":"custom"},{"frequency":"1×","amplitude":13,"envelope":"pluck 3"},{"frequency":"1×","amplitude":0,"envelope":"steady"},{"frequency":"1×","amplitude":0,"envelope":"steady"}]}},
			{name: "violin",           midiProgram:  40, isNoise: false, settings: {"type":"FM","volume":100,"transition":"cross-fade","effects":"reverb","chord":"harmony","filterCutoffHz":2000,"filterResonance":43,"filterEnvelope":"steady","vibrato":"delayed","algorithm":"1 2←(3 4)","feedbackType":"1⟲","feedbackAmplitude":10,"feedbackEnvelope":"swell 2","operators":[{"frequency":"1×","amplitude":8,"envelope":"custom"},{"frequency":"1×","amplitude":10,"envelope":"custom"},{"frequency":"1×","amplitude":14,"envelope":"steady"},{"frequency":"5×","amplitude":6,"envelope":"swell 1"}]}},
			{name: "viola",            midiProgram:  41, isNoise: false, settings: {"type":"FM","volume":100,"transition":"cross-fade","effects":"reverb","chord":"harmony","filterCutoffHz":1414,"filterResonance":43,"filterEnvelope":"steady","vibrato":"delayed","algorithm":"1 2←(3 4)","feedbackType":"1⟲","feedbackAmplitude":10,"feedbackEnvelope":"swell 2","operators":[{"frequency":"1×","amplitude":10,"envelope":"custom"},{"frequency":"1×","amplitude":10,"envelope":"custom"},{"frequency":"1×","amplitude":14,"envelope":"steady"},{"frequency":"6×","amplitude":8,"envelope":"swell 1"}]}},
			{name: "cello",            midiProgram:  42, isNoise: false, settings: {"type":"FM","volume":100,"transition":"cross-fade","effects":"reverb","chord":"harmony","filterCutoffHz":1414,"filterResonance":29,"filterEnvelope":"steady","vibrato":"delayed","algorithm":"1 2←(3 4)","feedbackType":"1⟲","feedbackAmplitude":9,"feedbackEnvelope":"swell 2","operators":[{"frequency":"1×","amplitude":10,"envelope":"custom"},{"frequency":"2×","amplitude":10,"envelope":"custom"},{"frequency":"1×","amplitude":13,"envelope":"steady"},{"frequency":"5×","amplitude":6,"envelope":"swell 1"}]}},
			{name: "contrabass",       midiProgram:  43, isNoise: false, settings: {"type":"FM","volume":100,"transition":"cross-fade","effects":"reverb","chord":"harmony","filterCutoffHz":2000,"filterResonance":29,"filterEnvelope":"steady","vibrato":"delayed","algorithm":"1 2←(3 4)","feedbackType":"1⟲","feedbackAmplitude":9,"feedbackEnvelope":"swell 2","operators":[{"frequency":"1×","amplitude":10,"envelope":"custom"},{"frequency":"2×","amplitude":10,"envelope":"custom"},{"frequency":"1×","amplitude":8,"envelope":"steady"},{"frequency":"6×","amplitude":8,"envelope":"swell 1"}]}},
			{name: "tremolo strings",  midiProgram:  44, isNoise: false, settings: {"type":"FM","volume":100,"transition":"slow fade","effects":"chorus & reverb","chord":"harmony","filterCutoffHz":1000,"filterResonance":0,"filterEnvelope":"tremolo4","vibrato":"none","algorithm":"(1 2)←(3 4)","feedbackType":"4⟲","feedbackAmplitude":3,"feedbackEnvelope":"steady","operators":[{"frequency":"5×","amplitude":7,"envelope":"custom"},{"frequency":"6×","amplitude":5,"envelope":"custom"},{"frequency":"~2×","amplitude":7,"envelope":"steady"},{"frequency":"7×","amplitude":5,"envelope":"steady"}]}},
			{name: "pizzicato strings",midiProgram:  45, isNoise: false, settings: {"type":"FM","volume":100,"transition":"medium fade","effects":"reverb","chord":"harmony","filterCutoffHz":2828,"filterResonance":14,"filterEnvelope":"pluck 1","vibrato":"none","algorithm":"(1 2 3)←4","feedbackType":"1⟲ 2⟲ 3⟲ 4⟲","feedbackAmplitude":9,"feedbackEnvelope":"pluck 1","operators":[{"frequency":"~1×","amplitude":11,"envelope":"custom"},{"frequency":"3×","amplitude":10,"envelope":"custom"},{"frequency":"6×","amplitude":9,"envelope":"custom"},{"frequency":"~1×","amplitude":10,"envelope":"pluck 3"}]}},
			{name: "harp",             midiProgram:  46, isNoise: false, settings: {"type":"FM","volume":100,"transition":"fast fade","effects":"reverb","chord":"strum","filterCutoffHz":2828,"filterResonance":0,"filterEnvelope":"pluck 1","vibrato":"none","algorithm":"1←3 2←4","feedbackType":"3⟲","feedbackAmplitude":5,"feedbackEnvelope":"pluck 3","operators":[{"frequency":"1×","amplitude":12,"envelope":"custom"},{"frequency":"4×","amplitude":4,"envelope":"custom"},{"frequency":"~2×","amplitude":3,"envelope":"steady"},{"frequency":"1×","amplitude":6,"envelope":"steady"}]}},
			{name: "timpani",          midiProgram:  47, isNoise: false, settings: {"type":"FM","volume":100,"transition":"fast fade","effects":"reverb","chord":"harmony","filterCutoffHz":1414,"filterResonance":14,"filterEnvelope":"pluck 2","vibrato":"none","algorithm":"1 2←3←4","feedbackType":"1→2→3→4","feedbackAmplitude":12,"feedbackEnvelope":"steady","operators":[{"frequency":"1×","amplitude":15,"envelope":"pluck 1"},{"frequency":"1×","amplitude":15,"envelope":"custom"},{"frequency":"~1×","amplitude":13,"envelope":"steady"},{"frequency":"~2×","amplitude":7,"envelope":"steady"}]}},
			{name: "strings 1",        midiProgram:  48, isNoise: false, settings: {"type":"FM","volume":100,"transition":"cross-fade","effects":"chorus & reverb","chord":"harmony","filterCutoffHz":2828,"filterResonance":29,"filterEnvelope":"steady","vibrato":"none","algorithm":"(1 2)←(3 4)","feedbackType":"4⟲","feedbackAmplitude":5,"feedbackEnvelope":"pluck 3","operators":[{"frequency":"4×","amplitude":6,"envelope":"custom"},{"frequency":"3×","amplitude":7,"envelope":"custom"},{"frequency":"~2×","amplitude":7,"envelope":"steady"},{"frequency":"7×","amplitude":5,"envelope":"swell 1"}]}},
			{name: "strings 2",        midiProgram:  49, isNoise: false, settings: {"type":"FM","volume":100,"transition":"slow fade","effects":"chorus & reverb","chord":"harmony","filterCutoffHz":2000,"filterResonance":14,"filterEnvelope":"steady","vibrato":"none","algorithm":"(1 2)←(3 4)","feedbackType":"4⟲","feedbackAmplitude":4,"feedbackEnvelope":"flare 3","operators":[{"frequency":"4×","amplitude":6,"envelope":"custom"},{"frequency":"3×","amplitude":7,"envelope":"custom"},{"frequency":"~2×","amplitude":7,"envelope":"steady"},{"frequency":"7×","amplitude":5,"envelope":"swell 1"}]}},
			{name: "synth strings 1",  midiProgram:  50, isNoise: false, settings: {"type":"chip","volume":60,"transition":"slow fade","effects":"chorus & reverb","chord":"harmony","filterCutoffHz":1414,"filterResonance":43,"filterEnvelope":"steady","wave":"sawtooth","interval":"hum","vibrato":"delayed"}},
			{name: "synth strings 2",  midiProgram:  51, isNoise: false, settings: {"type":"FM","volume":100,"transition":"slow fade","effects":"chorus & reverb","chord":"harmony","filterCutoffHz":1000,"filterResonance":43,"filterEnvelope":"steady","vibrato":"none","algorithm":"(1 2)←(3 4)","feedbackType":"3⟲ 4⟲","feedbackAmplitude":2,"feedbackEnvelope":"flare 3","operators":[{"frequency":"1×","amplitude":7,"envelope":"custom"},{"frequency":"4×","amplitude":6,"envelope":"custom"},{"frequency":"1×","amplitude":11,"envelope":"steady"},{"frequency":"6×","amplitude":5,"envelope":"steady"}]}},
			{name: "choir ahh",        midiProgram:  52, isNoise: false, settings: {"type":"FM","volume":100,"transition":"slow fade","effects":"chorus & reverb","chord":"harmony","filterCutoffHz":2000,"filterResonance":71,"filterEnvelope":"steady","vibrato":"shaky","algorithm":"(1 2 3)←4","feedbackType":"1→3","feedbackAmplitude":2,"feedbackEnvelope":"steady","operators":[{"frequency":"2×","amplitude":8,"envelope":"custom"},{"frequency":"3×","amplitude":6,"envelope":"custom"},{"frequency":"11×","amplitude":2,"envelope":"custom"},{"frequency":"1×","amplitude":4,"envelope":"steady"}]}},
			{name: "voice ooh",        midiProgram:  53, isNoise: false, settings: {"type":"FM","volume":100,"transition":"soft","effects":"reverb","chord":"harmony","filterCutoffHz":707,"filterResonance":71,"filterEnvelope":"steady","vibrato":"delayed","algorithm":"1←(2 3 4)","feedbackType":"1⟲","feedbackAmplitude":0,"feedbackEnvelope":"steady","operators":[{"frequency":"1×","amplitude":11,"envelope":"custom"},{"frequency":"2×","amplitude":3,"envelope":"steady"},{"frequency":"1×","amplitude":1,"envelope":"steady"},{"frequency":"1×","amplitude":0,"envelope":"steady"}]}},
			{name: "synth voice",      midiProgram:  54, isNoise: false, settings: {"type":"FM","volume":100,"transition":"medium fade","effects":"chorus & reverb","chord":"harmony","filterCutoffHz":2000,"filterResonance":43,"filterEnvelope":"steady","vibrato":"none","algorithm":"(1 2 3)←4","feedbackType":"3⟲","feedbackAmplitude":4,"feedbackEnvelope":"steady","operators":[{"frequency":"2×","amplitude":9,"envelope":"custom"},{"frequency":"3×","amplitude":3,"envelope":"custom"},{"frequency":"9×","amplitude":3,"envelope":"custom"},{"frequency":"1×","amplitude":6,"envelope":"steady"}]}},
			{name: "orchestra hit",    midiProgram:  55, isNoise: false, settings: {"type":"FM","volume":100,"transition":"fast fade","effects":"chorus & reverb","chord":"harmony","filterCutoffHz":8000,"filterResonance":0,"filterEnvelope":"decay 1","vibrato":"delayed","algorithm":"1 2 3 4","feedbackType":"1⟲ 2⟲ 3⟲ 4⟲","feedbackAmplitude":14,"feedbackEnvelope":"steady","operators":[{"frequency":"1×","amplitude":10,"envelope":"custom"},{"frequency":"2×","amplitude":10,"envelope":"custom"},{"frequency":"3×","amplitude":10,"envelope":"custom"},{"frequency":"4×","amplitude":10,"envelope":"custom"}]}},
			{name: "trumpet",          midiProgram:  56, isNoise: false, settings: {"type":"FM","volume":100,"transition":"soft","effects":"reverb","chord":"harmony","filterCutoffHz":2828,"filterResonance":43,"filterEnvelope":"steady","vibrato":"none","algorithm":"1←(2 3 4)","feedbackType":"1⟲","feedbackAmplitude":7,"feedbackEnvelope":"swell 1","operators":[{"frequency":"1×","amplitude":11,"envelope":"custom"},{"frequency":"1×","amplitude":8,"envelope":"steady"},{"frequency":"~1×","amplitude":8,"envelope":"flare 1"},{"frequency":"1×","amplitude":0,"envelope":"steady"}]}},
			{name: "trombone",         midiProgram:  57, isNoise: false, settings: {"type":"FM","volume":100,"transition":"soft","effects":"reverb","chord":"harmony","filterCutoffHz":2000,"filterResonance":43,"filterEnvelope":"steady","vibrato":"none","algorithm":"1←(2 3 4)","feedbackType":"2⟲","feedbackAmplitude":7,"feedbackEnvelope":"swell 1","operators":[{"frequency":"1×","amplitude":11,"envelope":"custom"},{"frequency":"1×","amplitude":8,"envelope":"steady"},{"frequency":"~1×","amplitude":6,"envelope":"pluck 1"},{"frequency":"1×","amplitude":0,"envelope":"steady"}]}},
			{name: "tuba",             midiProgram:  58, isNoise: false, settings: {"type":"FM","volume":100,"transition":"soft","effects":"reverb","chord":"harmony","filterCutoffHz":2000,"filterResonance":43,"filterEnvelope":"steady","vibrato":"none","algorithm":"1←(2 3 4)","feedbackType":"2⟲","feedbackAmplitude":8,"feedbackEnvelope":"swell 1","operators":[{"frequency":"1×","amplitude":12,"envelope":"custom"},{"frequency":"1×","amplitude":5,"envelope":"steady"},{"frequency":"1×","amplitude":7,"envelope":"flare 2"},{"frequency":"1×","amplitude":0,"envelope":"steady"}]}},
			{name: "muted trumpet",    midiProgram:  59, isNoise: false, settings: {"type":"FM","volume":100,"transition":"soft","effects":"reverb","chord":"harmony","filterCutoffHz":4000,"filterResonance":14,"filterEnvelope":"swell 2","vibrato":"none","algorithm":"(1 2 3)←4","feedbackType":"1⟲ 2⟲ 3⟲","feedbackAmplitude":3,"feedbackEnvelope":"swell 1","operators":[{"frequency":"1×","amplitude":6,"envelope":"custom"},{"frequency":"9×","amplitude":5,"envelope":"custom"},{"frequency":"13×","amplitude":4,"envelope":"custom"},{"frequency":"1×","amplitude":5,"envelope":"swell 2"}]}},
			{name: "french horn",      midiProgram:  60, isNoise: false, settings: {"type":"FM","volume":100,"transition":"soft","effects":"reverb","chord":"harmony","filterCutoffHz":1414,"filterResonance":29,"filterEnvelope":"steady","vibrato":"none","algorithm":"1←3 2←4","feedbackType":"1⟲ 2⟲","feedbackAmplitude":7,"feedbackEnvelope":"swell 2","operators":[{"frequency":"1×","amplitude":11,"envelope":"custom"},{"frequency":"1×","amplitude":9,"envelope":"custom"},{"frequency":"1×","amplitude":9,"envelope":"swell 2"},{"frequency":"~1×","amplitude":6,"envelope":"pluck 3"}]}},
			{name: "brass section",    midiProgram:  61, isNoise: false, settings: {"type":"FM","volume":100,"transition":"cross-fade","effects":"reverb","chord":"harmony","filterCutoffHz":1414,"filterResonance":0,"filterEnvelope":"steady","vibrato":"none","algorithm":"1 2 3 4","feedbackType":"1⟲ 2⟲ 3⟲ 4⟲","feedbackAmplitude":10,"feedbackEnvelope":"swell 1","operators":[{"frequency":"1×","amplitude":10,"envelope":"custom"},{"frequency":"1×","amplitude":9,"envelope":"custom"},{"frequency":"1×","amplitude":8,"envelope":"custom"},{"frequency":"2×","amplitude":8,"envelope":"custom"}]}},
			{name: "synth brass 1",    midiProgram:  62, isNoise: false, settings: {"type":"FM","volume":100,"transition":"soft","effects":"reverb","chord":"harmony","filterCutoffHz":2828,"filterResonance":29,"filterEnvelope":"steady","vibrato":"none","algorithm":"1←3 2←4","feedbackType":"1⟲ 2⟲","feedbackAmplitude":10,"feedbackEnvelope":"swell 2","operators":[{"frequency":"1×","amplitude":13,"envelope":"custom"},{"frequency":"~1×","amplitude":13,"envelope":"custom"},{"frequency":"1×","amplitude":10,"envelope":"flare 2"},{"frequency":"1×","amplitude":10,"envelope":"flare 2"}]}},
			{name: "synth brass 2",    midiProgram:  63, isNoise: false, settings: {"type":"FM","volume":100,"transition":"soft","effects":"reverb","chord":"harmony","filterCutoffHz":2000,"filterResonance":43,"filterEnvelope":"steady","vibrato":"none","algorithm":"1←3 2←4","feedbackType":"1⟲ 2⟲","feedbackAmplitude":8,"feedbackEnvelope":"swell 2","operators":[{"frequency":"1×","amplitude":12,"envelope":"custom"},{"frequency":"~1×","amplitude":10,"envelope":"custom"},{"frequency":"1×","amplitude":8,"envelope":"flare 2"},{"frequency":"1×","amplitude":0,"envelope":"steady"}]}},
			{name: "soprano sax",      midiProgram:  64, isNoise: false, settings: {"type":"FM","volume":100,"transition":"soft","effects":"reverb","chord":"harmony","filterCutoffHz":2000,"filterResonance":14,"filterEnvelope":"steady","vibrato":"none","algorithm":"1 2←3←4","feedbackType":"3⟲","feedbackAmplitude":5,"feedbackEnvelope":"swell 1","operators":[{"frequency":"6×","amplitude":7,"envelope":"custom"},{"frequency":"2×","amplitude":11,"envelope":"custom"},{"frequency":"1×","amplitude":7,"envelope":"steady"},{"frequency":"6×","amplitude":2,"envelope":"steady"}]}},
			{name: "alto sax",         midiProgram:  65, isNoise: false, settings: {"type":"FM","volume":100,"transition":"soft","effects":"reverb","chord":"harmony","filterCutoffHz":1000,"filterResonance":0,"filterEnvelope":"punch","vibrato":"none","algorithm":"1←(2 3 4)","feedbackType":"2⟲","feedbackAmplitude":5,"feedbackEnvelope":"swell 1","operators":[{"frequency":"1×","amplitude":11,"envelope":"custom"},{"frequency":"1×","amplitude":11,"envelope":"steady"},{"frequency":"4×","amplitude":6,"envelope":"steady"},{"frequency":"8×","amplitude":3,"envelope":"steady"}]}},
			{name: "tenor sax",        midiProgram:  66, isNoise: false, settings: {"type":"FM","volume":100,"transition":"soft","effects":"reverb","chord":"harmony","filterCutoffHz":2828,"filterResonance":14,"filterEnvelope":"swell 1","vibrato":"none","algorithm":"1←(2 3 4)","feedbackType":"1⟲","feedbackAmplitude":4,"feedbackEnvelope":"punch","operators":[{"frequency":"1×","amplitude":12,"envelope":"custom"},{"frequency":"1×","amplitude":4,"envelope":"tremolo5"},{"frequency":"4×","amplitude":5,"envelope":"steady"},{"frequency":"1×","amplitude":0,"envelope":"steady"}]}},
			{name: "baritone sax",     midiProgram:  67, isNoise: false, settings: {"type":"FM","volume":100,"transition":"soft","effects":"reverb","chord":"harmony","filterCutoffHz":1414,"filterResonance":14,"filterEnvelope":"swell 1","vibrato":"none","algorithm":"1←(2 3←4)","feedbackType":"4⟲","feedbackAmplitude":4,"feedbackEnvelope":"swell 1","operators":[{"frequency":"2×","amplitude":15,"envelope":"custom"},{"frequency":"1×","amplitude":2,"envelope":"steady"},{"frequency":"3×","amplitude":6,"envelope":"steady"},{"frequency":"1×","amplitude":15,"envelope":"steady"}]}},
			{name: "oboe",             midiProgram:  68, isNoise: false, settings: {"type":"FM","volume":100,"transition":"cross-fade","effects":"reverb","chord":"harmony","filterCutoffHz":2828,"filterResonance":14,"filterEnvelope":"swell 1","vibrato":"delayed","algorithm":"1←(2 3 4)","feedbackType":"1⟲","feedbackAmplitude":3,"feedbackEnvelope":"swell 3","operators":[{"frequency":"2×","amplitude":11,"envelope":"custom"},{"frequency":"1×","amplitude":10,"envelope":"steady"},{"frequency":"11×","amplitude":2,"envelope":"steady"},{"frequency":"1×","amplitude":0,"envelope":"steady"}]}},
			{name: "english horn",     midiProgram:  69, isNoise: false, settings: {"type":"FM","volume":100,"transition":"soft","effects":"reverb","chord":"harmony","filterCutoffHz":1414,"filterResonance":29,"filterEnvelope":"steady","vibrato":"none","algorithm":"1←(2 3 4)","feedbackType":"1⟲","feedbackAmplitude":1,"feedbackEnvelope":"steady","operators":[{"frequency":"2×","amplitude":11,"envelope":"custom"},{"frequency":"1×","amplitude":8,"envelope":"steady"},{"frequency":"8×","amplitude":3,"envelope":"steady"},{"frequency":"1×","amplitude":0,"envelope":"steady"}]}},
			{name: "bassoon",          midiProgram:  70, isNoise: false, settings: {"type":"FM","volume":100,"transition":"soft","effects":"reverb","chord":"harmony","filterCutoffHz":1000,"filterResonance":29,"filterEnvelope":"steady","vibrato":"none","algorithm":"1←(2 3 4)","feedbackType":"1⟲","feedbackAmplitude":2,"feedbackEnvelope":"steady","operators":[{"frequency":"2×","amplitude":10,"envelope":"custom"},{"frequency":"1×","amplitude":9,"envelope":"steady"},{"frequency":"7×","amplitude":3,"envelope":"steady"},{"frequency":"1×","amplitude":0,"envelope":"steady"}]}},
			{name: "clarinet",         midiProgram:  71, isNoise: false, settings: {"type":"FM","volume":100,"transition":"soft","effects":"reverb","chord":"harmony","filterCutoffHz":1414,"filterResonance":14,"filterEnvelope":"swell 1","vibrato":"none","algorithm":"1←(2 3 4)","feedbackType":"1⟲","feedbackAmplitude":2,"feedbackEnvelope":"punch","operators":[{"frequency":"1×","amplitude":12,"envelope":"custom"},{"frequency":"4×","amplitude":6,"envelope":"steady"},{"frequency":"9×","amplitude":2,"envelope":"steady"},{"frequency":"1×","amplitude":0,"envelope":"steady"}]}},
			{name: "piccolo",          midiProgram:  72, isNoise: false, settings: {"type":"FM","volume":100,"transition":"soft","effects":"reverb","chord":"harmony","filterCutoffHz":4000,"filterResonance":14,"filterEnvelope":"punch","vibrato":"none","algorithm":"1←3 2←4","feedbackType":"4⟲","feedbackAmplitude":4,"feedbackEnvelope":"punch","operators":[{"frequency":"1×","amplitude":15,"envelope":"custom"},{"frequency":"1×","amplitude":12,"envelope":"custom"},{"frequency":"2×","amplitude":4,"envelope":"steady"},{"frequency":"~1×","amplitude":5,"envelope":"steady"}]}},
			{name: "flute",            midiProgram:  73, isNoise: false, settings: {"type":"FM","volume":100,"transition":"soft","effects":"reverb","chord":"harmony","filterCutoffHz":5657,"filterResonance":14,"filterEnvelope":"steady","vibrato":"none","algorithm":"1←3 2←4","feedbackType":"2⟲","feedbackAmplitude":4,"feedbackEnvelope":"steady","operators":[{"frequency":"1×","amplitude":15,"envelope":"custom"},{"frequency":"1×","amplitude":9,"envelope":"custom"},{"frequency":"2×","amplitude":3,"envelope":"steady"},{"frequency":"1×","amplitude":6,"envelope":"steady"}]}},
			{name: "recorder",         midiProgram:  74, isNoise: false, settings: {"type":"FM","volume":100,"transition":"soft","effects":"reverb","chord":"harmony","filterCutoffHz":2828,"filterResonance":14,"filterEnvelope":"punch","vibrato":"none","algorithm":"1←(2 3 4)","feedbackType":"3⟲","feedbackAmplitude":6,"feedbackEnvelope":"steady","operators":[{"frequency":"1×","amplitude":15,"envelope":"custom"},{"frequency":"2×","amplitude":2,"envelope":"steady"},{"frequency":"1×","amplitude":1,"envelope":"steady"},{"frequency":"1×","amplitude":0,"envelope":"steady"}]}},
			{name: "pan flute",        midiProgram:  75, isNoise: false, settings: {"type":"FM","volume":100,"transition":"cross-fade","effects":"chorus & reverb","chord":"strum","filterCutoffHz":1000,"filterResonance":14,"filterEnvelope":"steady","vibrato":"none","algorithm":"1←(2 3←4)","feedbackType":"3→4","feedbackAmplitude":15,"feedbackEnvelope":"punch","operators":[{"frequency":"1×","amplitude":12,"envelope":"custom"},{"frequency":"2×","amplitude":2,"envelope":"steady"},{"frequency":"~1×","amplitude":5,"envelope":"pluck 2"},{"frequency":"20×","amplitude":15,"envelope":"punch"}]}},
			{name: "blown bottle",     midiProgram:  76, isNoise: false, settings: {"type":"FM","volume":100,"transition":"cross-fade","effects":"chorus & reverb","chord":"strum","filterCutoffHz":1000,"filterResonance":14,"filterEnvelope":"steady","vibrato":"none","algorithm":"1←(2 3←4)","feedbackType":"3→4","feedbackAmplitude":15,"feedbackEnvelope":"punch","operators":[{"frequency":"1×","amplitude":12,"envelope":"custom"},{"frequency":"2×","amplitude":3,"envelope":"steady"},{"frequency":"~1×","amplitude":7,"envelope":"flare 1"},{"frequency":"20×","amplitude":15,"envelope":"punch"}]}},
			{name: "shakuhachi",       midiProgram:  77, isNoise: false, settings: {"type":"FM","volume":100,"transition":"soft","effects":"reverb","chord":"harmony","filterCutoffHz":1414,"filterResonance":14,"filterEnvelope":"steady","vibrato":"none","algorithm":"1←(2 3 4)","feedbackType":"4⟲","feedbackAmplitude":15,"feedbackEnvelope":"pluck 3","operators":[{"frequency":"1×","amplitude":11,"envelope":"custom"},{"frequency":"1×","amplitude":6,"envelope":"steady"},{"frequency":"6×","amplitude":2,"envelope":"tremolo5"},{"frequency":"20×","amplitude":4,"envelope":"flare 1"}]}},
			{name: "whistle",          midiProgram:  78, isNoise: false, settings: {"type":"FM","volume":100,"transition":"cross-fade","effects":"reverb","chord":"strum","filterCutoffHz":354,"filterResonance":14,"filterEnvelope":"steady","vibrato":"delayed","algorithm":"1←2←3←4","feedbackType":"2→3","feedbackAmplitude":15,"feedbackEnvelope":"steady","operators":[{"frequency":"1×","amplitude":15,"envelope":"custom"},{"frequency":"~1×","amplitude":2,"envelope":"flare 1"},{"frequency":"20×","amplitude":15,"envelope":"steady"},{"frequency":"1×","amplitude":0,"envelope":"steady"}]}},
			{name: "ocarina",          midiProgram:  79, isNoise: false, settings: {"type":"FM","volume":100,"transition":"cross-fade","effects":"reverb","chord":"strum","filterCutoffHz":500,"filterResonance":57,"filterEnvelope":"steady","vibrato":"none","algorithm":"1←2←3←4","feedbackType":"3→4","feedbackAmplitude":15,"feedbackEnvelope":"steady","operators":[{"frequency":"1×","amplitude":15,"envelope":"custom"},{"frequency":"1×","amplitude":2,"envelope":"steady"},{"frequency":"~1×","amplitude":3,"envelope":"punch"},{"frequency":"20×","amplitude":15,"envelope":"steady"}]}},
			{name: "square lead",      midiProgram:  80, isNoise: false, settings: {"type":"chip","transition":"hard","effects":"reverb","chord":"harmony","filterCutoffHz":2828,"filterResonance":14,"filterEnvelope":"steady","volume":80,"wave":"square","interval":"hum","vibrato":"none"}},
			{name: "sawtooth lead",    midiProgram:  81, isNoise: false, settings: {"type":"chip","transition":"hard","effects":"reverb","chord":"harmony","filterCutoffHz":2828,"filterResonance":14,"filterEnvelope":"steady","volume":80,"wave":"sawtooth","interval":"shimmer","vibrato":"none"}},
			{name: "synth calliope",   midiProgram:  82, isNoise: false, settings: {"type":"FM","volume":100,"transition":"cross-fade","effects":"chorus & reverb","chord":"strum","filterCutoffHz":1000,"filterResonance":14,"filterEnvelope":"steady","vibrato":"none","algorithm":"1←(2 3←4)","feedbackType":"3→4","feedbackAmplitude":15,"feedbackEnvelope":"steady","operators":[{"frequency":"1×","amplitude":12,"envelope":"custom"},{"frequency":"1×","amplitude":6,"envelope":"steady"},{"frequency":"~1×","amplitude":3,"envelope":"pluck 3"},{"frequency":"1×","amplitude":15,"envelope":"swell 1"}]}},
			{name: "chiffer lead",     midiProgram:  83, isNoise: false, settings: {"type":"FM","volume":100,"transition":"hard","effects":"chorus & reverb","chord":"strum","filterCutoffHz":1000,"filterResonance":14,"filterEnvelope":"punch","vibrato":"none","algorithm":"1←(2 3←4)","feedbackType":"3→4","feedbackAmplitude":15,"feedbackEnvelope":"punch","operators":[{"frequency":"1×","amplitude":12,"envelope":"custom"},{"frequency":"1×","amplitude":9,"envelope":"punch"},{"frequency":"~1×","amplitude":2,"envelope":"pluck 3"},{"frequency":"1×","amplitude":15,"envelope":"punch"}]}},
			{name: "charang lead",     midiProgram:  84, isNoise: false, settings: {"type":"FM","volume":100,"transition":"hard","effects":"reverb","chord":"harmony","filterCutoffHz":8000,"filterResonance":0,"filterEnvelope":"pluck 3","vibrato":"none","algorithm":"1←(2 3 4)","feedbackType":"1→2","feedbackAmplitude":3,"feedbackEnvelope":"steady","operators":[{"frequency":"~1×","amplitude":10,"envelope":"custom"},{"frequency":"1×","amplitude":10,"envelope":"steady"},{"frequency":"1×","amplitude":10,"envelope":"punch"},{"frequency":"1×","amplitude":10,"envelope":"pluck 3"}]}},
			{name: "synth vox lead",   midiProgram:  85, isNoise: false, settings: {"type":"FM","volume":100,"transition":"soft","effects":"chorus & reverb","chord":"harmony","filterCutoffHz":2000,"filterResonance":43,"filterEnvelope":"steady","vibrato":"light","algorithm":"(1 2 3)←4","feedbackType":"1⟲ 2⟲ 3⟲","feedbackAmplitude":0,"feedbackEnvelope":"steady","operators":[{"frequency":"2×","amplitude":10,"envelope":"custom"},{"frequency":"8×","amplitude":5,"envelope":"custom"},{"frequency":"11×","amplitude":4,"envelope":"custom"},{"frequency":"~1×","amplitude":3,"envelope":"steady"}]}},
			{name: "fifth saw lead",   midiProgram:  86, isNoise: false, settings: {"type":"chip","transition":"medium fade","effects":"chorus & reverb","chord":"harmony","filterCutoffHz":4000,"filterResonance":57,"filterEnvelope":"swell 1","volume":80,"wave":"sawtooth","interval":"fifth","vibrato":"none"}},
			{name: "bass & lead",      midiProgram:  87, isNoise: false, settings: {"type":"chip","transition":"hard","effects":"reverb","chord":"harmony","filterCutoffHz":2828,"filterResonance":86,"filterEnvelope":"pluck 3","volume":80,"wave":"sawtooth","interval":"shimmer","vibrato":"none"}},
			{name: "new age pad",      midiProgram:  88, isNoise: false, settings: {"type":"FM","volume":100,"transition":"fast fade","effects":"chorus & reverb","chord":"harmony","filterCutoffHz":5657,"filterResonance":14,"filterEnvelope":"pluck 3","vibrato":"none","algorithm":"(1 2)←(3 4)","feedbackType":"1⟲ 2⟲","feedbackAmplitude":0,"feedbackEnvelope":"steady","operators":[{"frequency":"1×","amplitude":8,"envelope":"custom"},{"frequency":"5×","amplitude":5,"envelope":"custom"},{"frequency":"20×","amplitude":5,"envelope":"pluck 1"},{"frequency":"~1×","amplitude":7,"envelope":"steady"}]}},
			{name: "warm pad",         midiProgram:  89, isNoise: false, settings: {"type":"FM","volume":100,"transition":"slow fade","effects":"chorus & reverb","chord":"harmony","filterCutoffHz":1414,"filterResonance":0,"filterEnvelope":"swell 3","vibrato":"none","algorithm":"(1 2 3)←4","feedbackType":"1⟲ 2⟲ 3⟲","feedbackAmplitude":0,"feedbackEnvelope":"steady","operators":[{"frequency":"1×","amplitude":8,"envelope":"custom"},{"frequency":"4×","amplitude":3,"envelope":"custom"},{"frequency":"9×","amplitude":2,"envelope":"custom"},{"frequency":"~1×","amplitude":6,"envelope":"steady"}]}},
			{name: "polysynth pad",    midiProgram:  90, isNoise: false, settings: {"type":"FM","volume":100,"transition":"fast fade","effects":"chorus & reverb","chord":"harmony","filterCutoffHz":4000,"filterResonance":86,"filterEnvelope":"pluck 3","vibrato":"delayed","algorithm":"(1 2)←(3 4)","feedbackType":"1⟲ 2⟲ 3⟲","feedbackAmplitude":9,"feedbackEnvelope":"steady","operators":[{"frequency":"1×","amplitude":9,"envelope":"custom"},{"frequency":"5×","amplitude":4,"envelope":"custom"},{"frequency":"7×","amplitude":5,"envelope":"tremolo1"},{"frequency":"~1×","amplitude":6,"envelope":"punch"}]}},
			{name: "space voice pad",  midiProgram:  91, isNoise: false, settings: {"type":"FM","volume":100,"transition":"medium fade","effects":"chorus & reverb","chord":"harmony","filterCutoffHz":8000,"filterResonance":0,"filterEnvelope":"steady","vibrato":"delayed","algorithm":"(1 2 3)←4","feedbackType":"1⟲ 2⟲ 3⟲ 4⟲","feedbackAmplitude":5,"feedbackEnvelope":"swell 3","operators":[{"frequency":"1×","amplitude":10,"envelope":"custom"},{"frequency":"2×","amplitude":8,"envelope":"custom"},{"frequency":"3×","amplitude":6,"envelope":"custom"},{"frequency":"16×","amplitude":2,"envelope":"pluck 3"}]}},
			{name: "bowed glass pad",  midiProgram:  92, isNoise: false, settings: {"type":"FM","volume":100,"transition":"slow fade","effects":"reverb","chord":"harmony","filterCutoffHz":4000,"filterResonance":14,"filterEnvelope":"pluck 3","vibrato":"none","algorithm":"(1 2)←(3 4)","feedbackType":"3⟲","feedbackAmplitude":0,"feedbackEnvelope":"flare 2","operators":[{"frequency":"1×","amplitude":7,"envelope":"custom"},{"frequency":"2×","amplitude":7,"envelope":"custom"},{"frequency":"~1×","amplitude":2,"envelope":"steady"},{"frequency":"7×","amplitude":3,"envelope":"flare 3"}]}},
			{name: "metallic pad",     midiProgram:  93, isNoise: false, settings: {"type":"FM","volume":100,"transition":"slow fade","effects":"reverb","chord":"harmony","filterCutoffHz":5657,"filterResonance":43,"filterEnvelope":"pluck 3","vibrato":"none","algorithm":"(1 2)←(3 4)","feedbackType":"1⟲ 2⟲","feedbackAmplitude":8,"feedbackEnvelope":"pluck 2","operators":[{"frequency":"1×","amplitude":7,"envelope":"custom"},{"frequency":"3×","amplitude":7,"envelope":"custom"},{"frequency":"~1×","amplitude":8,"envelope":"steady"},{"frequency":"9×","amplitude":2,"envelope":"flare 3"}]}},
			{name: "halo pad",         midiProgram:  94, isNoise: false, settings: {"type":"FM","volume":100,"transition":"cross-fade","effects":"chorus & reverb","chord":"harmony","filterCutoffHz":5657,"filterResonance":14,"filterEnvelope":"pluck 3","vibrato":"none","algorithm":"(1 2 3)←4","feedbackType":"4⟲","feedbackAmplitude":5,"feedbackEnvelope":"pluck 2","operators":[{"frequency":"2×","amplitude":13,"envelope":"custom"},{"frequency":"4×","amplitude":8,"envelope":"custom"},{"frequency":"16×","amplitude":4,"envelope":"custom"},{"frequency":"~1×","amplitude":6,"envelope":"pluck 3"}]}},
			{name: "sweep pad",        midiProgram:  95, isNoise: false, settings: {"type":"FM","volume":100,"transition":"slow fade","effects":"reverb","chord":"harmony","filterCutoffHz":5657,"filterResonance":100,"filterEnvelope":"pluck 3","vibrato":"none","algorithm":"(1 2)←(3 4)","feedbackType":"1⟲ 2⟲","feedbackAmplitude":7,"feedbackEnvelope":"flare 3","operators":[{"frequency":"1×","amplitude":7,"envelope":"custom"},{"frequency":"3×","amplitude":7,"envelope":"custom"},{"frequency":"~1×","amplitude":7,"envelope":"steady"},{"frequency":"9×","amplitude":7,"envelope":"swell 3"}]}},
			{name: "rain drop",        midiProgram:  96, isNoise: false, settings: {"type":"FM","volume":100,"transition":"fast fade","effects":"reverb","chord":"strum","filterCutoffHz":4000,"filterResonance":14,"filterEnvelope":"pluck 1","vibrato":"none","algorithm":"(1 2)←(3 4)","feedbackType":"1⟲ 2⟲","feedbackAmplitude":0,"feedbackEnvelope":"steady","operators":[{"frequency":"1×","amplitude":15,"envelope":"custom"},{"frequency":"6×","amplitude":5,"envelope":"custom"},{"frequency":"20×","amplitude":3,"envelope":"pluck 1"},{"frequency":"1×","amplitude":6,"envelope":"tremolo1"}]}},
			{name: "soundtrack",       midiProgram:  97, isNoise: false, settings: {"type":"chip","transition":"slow fade","effects":"chorus & reverb","chord":"harmony","filterCutoffHz":2000,"filterResonance":43,"filterEnvelope":"flare 3","volume":100,"wave":"sawtooth","interval":"fifth","vibrato":"none"}},
			{name: "crystal",          midiProgram:  98, isNoise: false, settings: {"type":"FM","volume":100,"transition":"fast fade","effects":"reverb","chord":"harmony","filterCutoffHz":2828,"filterResonance":14,"filterEnvelope":"pluck 2","vibrato":"none","algorithm":"1 2 3 4","feedbackType":"1⟲","feedbackAmplitude":0,"feedbackEnvelope":"pluck 1","operators":[{"frequency":"1×","amplitude":8,"envelope":"custom"},{"frequency":"3×","amplitude":6,"envelope":"custom"},{"frequency":"6×","amplitude":3,"envelope":"custom"},{"frequency":"13×","amplitude":3,"envelope":"custom"}]}},
			{name: "atmosphere",       midiProgram:  99, isNoise: false, settings: {"type":"FM","volume":100,"transition":"fast fade","effects":"reverb","chord":"harmony","filterCutoffHz":2828,"filterResonance":14,"filterEnvelope":"pluck 3","vibrato":"none","algorithm":"(1 2)←(3 4)","feedbackType":"1⟲ 2⟲ 3⟲","feedbackAmplitude":4,"feedbackEnvelope":"steady","operators":[{"frequency":"~1×","amplitude":7,"envelope":"custom"},{"frequency":"3×","amplitude":5,"envelope":"custom"},{"frequency":"8×","amplitude":6,"envelope":"pluck 2"},{"frequency":"~1×","amplitude":8,"envelope":"steady"}]}},
			{name: "brightness",       midiProgram: 100, isNoise: false, settings: {"type":"FM","volume":100,"transition":"fast fade","effects":"chorus & reverb","chord":"harmony","filterCutoffHz":2828,"filterResonance":0,"filterEnvelope":"pluck 3","vibrato":"none","algorithm":"1←(2 3 4)","feedbackType":"1⟲ 2⟲","feedbackAmplitude":4,"feedbackEnvelope":"steady","operators":[{"frequency":"2×","amplitude":8,"envelope":"custom"},{"frequency":"13×","amplitude":6,"envelope":"swell 3"},{"frequency":"16×","amplitude":4,"envelope":"pluck 3"},{"frequency":"~1×","amplitude":4,"envelope":"steady"}]}},
			{name: "goblins",          midiProgram: 101, isNoise: false, settings: {"type":"FM","volume":100,"transition":"slow fade","effects":"chorus & reverb","chord":"harmony","filterCutoffHz":1414,"filterResonance":14,"filterEnvelope":"swell 3","vibrato":"none","algorithm":"1←2←3←4","feedbackType":"1⟲","feedbackAmplitude":0,"feedbackEnvelope":"steady","operators":[{"frequency":"1×","amplitude":15,"envelope":"custom"},{"frequency":"4×","amplitude":3,"envelope":"swell 3"},{"frequency":"1×","amplitude":10,"envelope":"tremolo1"},{"frequency":"1×","amplitude":0,"envelope":"steady"}]}},
			{name: "echo drop",        midiProgram: 102, isNoise: false, settings: {"type":"FM","volume":100,"transition":"hard","effects":"chorus & reverb","chord":"harmony","filterCutoffHz":2000,"filterResonance":14,"filterEnvelope":"punch","vibrato":"none","algorithm":"(1 2 3)←4","feedbackType":"3⟲","feedbackAmplitude":6,"feedbackEnvelope":"swell 3","operators":[{"frequency":"1×","amplitude":10,"envelope":"custom"},{"frequency":"3×","amplitude":7,"envelope":"custom"},{"frequency":"13×","amplitude":5,"envelope":"custom"},{"frequency":"~1×","amplitude":7,"envelope":"swell 2"}]}},
			{name: "sci-fi",           midiProgram: 103, isNoise: false, settings: {"type":"FM","volume":100,"transition":"medium fade","effects":"chorus & reverb","chord":"harmony","filterCutoffHz":4000,"filterResonance":29,"filterEnvelope":"pluck 3","vibrato":"none","algorithm":"(1 2)←3←4","feedbackType":"1→2→3→4","feedbackAmplitude":5,"feedbackEnvelope":"pluck 3","operators":[{"frequency":"~1×","amplitude":10,"envelope":"custom"},{"frequency":"2×","amplitude":8,"envelope":"custom"},{"frequency":"5×","amplitude":4,"envelope":"tremolo4"},{"frequency":"11×","amplitude":6,"envelope":"tremolo6"}]}},
			{name: "sitar",            midiProgram: 104, isNoise: false, settings: {"type":"FM","volume":100,"transition":"fast fade","effects":"reverb","chord":"harmony","filterCutoffHz":5657,"filterResonance":86,"filterEnvelope":"pluck 2","vibrato":"none","algorithm":"1←(2 3 4)","feedbackType":"1⟲","feedbackAmplitude":0,"feedbackEnvelope":"steady","operators":[{"frequency":"1×","amplitude":15,"envelope":"custom"},{"frequency":"1×","amplitude":15,"envelope":"pluck 3"},{"frequency":"16×","amplitude":8,"envelope":"swell 3"},{"frequency":"1×","amplitude":0,"envelope":"steady"}]}},
			{name: "banjo",            midiProgram: 105, isNoise: false, settings: {"type":"FM","volume":100,"transition":"fast fade","effects":"reverb","chord":"harmony","filterCutoffHz":2828,"filterResonance":14,"filterEnvelope":"pluck 2","vibrato":"none","algorithm":"1←(2 3 4)","feedbackType":"2⟲","feedbackAmplitude":4,"feedbackEnvelope":"steady","operators":[{"frequency":"4×","amplitude":15,"envelope":"custom"},{"frequency":"1×","amplitude":10,"envelope":"steady"},{"frequency":"9×","amplitude":4,"envelope":"steady"},{"frequency":"1×","amplitude":0,"envelope":"steady"}]}},
			{name: "shamisen",         midiProgram: 106, isNoise: false, settings: {"type":"FM","volume":100,"transition":"fast fade","effects":"reverb","chord":"harmony","filterCutoffHz":4000,"filterResonance":29,"filterEnvelope":"pluck 1","vibrato":"none","algorithm":"1←(2 3 4)","feedbackType":"1⟲","feedbackAmplitude":0,"feedbackEnvelope":"steady","operators":[{"frequency":"4×","amplitude":15,"envelope":"custom"},{"frequency":"1×","amplitude":8,"envelope":"pluck 2"},{"frequency":"11×","amplitude":7,"envelope":"pluck 2"},{"frequency":"1×","amplitude":0,"envelope":"steady"}]}},
			{name: "koto",             midiProgram: 107, isNoise: false, settings: {"type":"FM","volume":100,"transition":"fast fade","effects":"reverb","chord":"harmony","filterCutoffHz":4000,"filterResonance":29,"filterEnvelope":"pluck 2","vibrato":"none","algorithm":"(1 2)←(3 4)","feedbackType":"1⟲","feedbackAmplitude":0,"feedbackEnvelope":"steady","operators":[{"frequency":"2×","amplitude":8,"envelope":"custom"},{"frequency":"3×","amplitude":11,"envelope":"custom"},{"frequency":"3×","amplitude":7,"envelope":"pluck 2"},{"frequency":"11×","amplitude":6,"envelope":"pluck 2"}]}},
			{name: "kalimba",          midiProgram: 108, isNoise: false, settings: {"type":"FM","volume":100,"transition":"fast fade","effects":"reverb","chord":"strum","filterCutoffHz":2828,"filterResonance":14,"filterEnvelope":"decay 1","vibrato":"none","algorithm":"1←(2 3 4)","feedbackType":"1⟲","feedbackAmplitude":0,"feedbackEnvelope":"steady","operators":[{"frequency":"1×","amplitude":15,"envelope":"custom"},{"frequency":"5×","amplitude":3,"envelope":"pluck 2"},{"frequency":"20×","amplitude":3,"envelope":"pluck 1"},{"frequency":"1×","amplitude":0,"envelope":"steady"}]}},
			{name: "bagpipe",          midiProgram: 109, isNoise: false, settings: {"type":"FM","volume":100,"transition":"cross-fade","effects":"reverb","chord":"harmony","filterCutoffHz":8000,"filterResonance":0,"filterEnvelope":"steady","vibrato":"none","algorithm":"1 2←(3 4)","feedbackType":"3⟲","feedbackAmplitude":6,"feedbackEnvelope":"steady","operators":[{"frequency":"5×","amplitude":15,"envelope":"custom"},{"frequency":"5×","amplitude":15,"envelope":"custom"},{"frequency":"1×","amplitude":9,"envelope":"steady"},{"frequency":"5×","amplitude":0,"envelope":"steady"}]}},
			{name: "fiddle",           midiProgram: 110, isNoise: false, settings: {"type":"FM","volume":100,"transition":"soft","effects":"reverb","chord":"harmony","filterCutoffHz":2828,"filterResonance":29,"filterEnvelope":"steady","vibrato":"delayed","algorithm":"(1 2 3)←4","feedbackType":"1⟲ 2⟲ 3⟲ 4⟲","feedbackAmplitude":5,"feedbackEnvelope":"steady","operators":[{"frequency":"~1×","amplitude":7,"envelope":"custom"},{"frequency":"6×","amplitude":7,"envelope":"custom"},{"frequency":"11×","amplitude":4,"envelope":"custom"},{"frequency":"~1×","amplitude":5,"envelope":"steady"}]}},
			{name: "shehnai",          midiProgram: 111, isNoise: false, settings: {"type":"FM","volume":100,"transition":"slide","effects":"reverb","chord":"harmony","filterCutoffHz":2828,"filterResonance":14,"filterEnvelope":"steady","vibrato":"delayed","algorithm":"1 2←(3 4)","feedbackType":"3⟲","feedbackAmplitude":2,"feedbackEnvelope":"swell 2","operators":[{"frequency":"4×","amplitude":15,"envelope":"custom"},{"frequency":"5×","amplitude":12,"envelope":"custom"},{"frequency":"1×","amplitude":11,"envelope":"steady"},{"frequency":"9×","amplitude":2,"envelope":"swell 2"}]}},
			{name: "tinkle bell",      midiProgram: 112, isNoise: false, settings: {"type":"FM","volume":100,"transition":"hard","effects":"reverb","chord":"strum","filterCutoffHz":2828,"filterResonance":14,"filterEnvelope":"pluck 2","vibrato":"none","algorithm":"1 2 3 4","feedbackType":"1→2→3→4","feedbackAmplitude":5,"feedbackEnvelope":"pluck 1","operators":[{"frequency":"2×","amplitude":5,"envelope":"custom"},{"frequency":"5×","amplitude":5,"envelope":"custom"},{"frequency":"7×","amplitude":5,"envelope":"custom"},{"frequency":"20×","amplitude":5,"envelope":"custom"}]}},
			{name: "agogo",            midiProgram: 113, isNoise: false, settings: {"type":"FM","volume":100,"transition":"hard","effects":"reverb","chord":"strum","filterCutoffHz":4000,"filterResonance":14,"filterEnvelope":"pluck 1","vibrato":"none","algorithm":"1 2 3 4","feedbackType":"1→4","feedbackAmplitude":7,"feedbackEnvelope":"steady","operators":[{"frequency":"2×","amplitude":7,"envelope":"custom"},{"frequency":"5×","amplitude":5,"envelope":"custom"},{"frequency":"8×","amplitude":6,"envelope":"custom"},{"frequency":"13×","amplitude":7,"envelope":"custom"}]}},
			{name: "steel pan",        midiProgram: 114, isNoise: false, settings: {"type":"FM","volume":100,"transition":"fast fade","effects":"reverb","chord":"custom interval","filterCutoffHz":8000,"filterResonance":0,"filterEnvelope":"custom","vibrato":"none","algorithm":"1 2 3←4","feedbackType":"1⟲","feedbackAmplitude":5,"feedbackEnvelope":"pluck 1","operators":[{"frequency":"1×","amplitude":12,"envelope":"pluck 2"},{"frequency":"~2×","amplitude":15,"envelope":"pluck 2"},{"frequency":"4×","amplitude":11,"envelope":"flare 1"},{"frequency":"~1×","amplitude":3,"envelope":"flare 2"}]}},
//			{name: "woodblock",        midiProgram: 115, isNoise:  true, settings: },
//			{name: "taiko drum",       midiProgram: 116, isNoise:  true, settings: },
//			{name: "melodic drum",     midiProgram: 117, isNoise:  true, settings: },
//			{name: "synth drum",       midiProgram: 118, isNoise:  true, settings: },
//			{name: "reverse cymbal",   midiProgram: 119, isNoise:  true, settings: },
//			{name: "guitar fret noise",midiProgram: 120, isNoise:  true, settings: },
			{name: "breath noise",     midiProgram: 121, isNoise: false, settings: {"type":"FM","volume":100,"transition":"cross-fade","effects":"chorus & reverb","chord":"strum","filterCutoffHz":2000,"filterResonance":14,"filterEnvelope":"pluck 1","vibrato":"none","algorithm":"1←(2 3←4)","feedbackType":"3→4","feedbackAmplitude":15,"feedbackEnvelope":"punch","operators":[{"frequency":"1×","amplitude":15,"envelope":"custom"},{"frequency":"2×","amplitude":4,"envelope":"steady"},{"frequency":"~1×","amplitude":5,"envelope":"flare 1"},{"frequency":"20×","amplitude":15,"envelope":"punch"}]}},
//			{name: "seashore",         midiProgram: 122, isNoise:  true, settings: },
//			{name: "bird tweet",       midiProgram: 123, isNoise:  true, settings: },
			{name: "telephone ring",   midiProgram: 124, isNoise: false, settings: {"type":"FM","volume":100,"transition":"hard","effects":"reverb","chord":"arpeggio","filterCutoffHz":4000,"filterResonance":71,"filterEnvelope":"tremolo4","vibrato":"none","algorithm":"1←(2 3 4)","feedbackType":"1⟲ 2⟲","feedbackAmplitude":5,"feedbackEnvelope":"steady","operators":[{"frequency":"2×","amplitude":15,"envelope":"custom"},{"frequency":"1×","amplitude":9,"envelope":"tremolo1"},{"frequency":"4×","amplitude":13,"envelope":"steady"},{"frequency":"1×","amplitude":0,"envelope":"steady"}]}},
//			{name: "helicopter",       midiProgram: 125, isNoise:  true, settings: },
//			{name: "applause",         midiProgram: 126, isNoise:  true, settings: },
//			{name: "gunshot",          midiProgram: 127, isNoise:  true, settings: },
		];
		public static readonly chipWaves: ReadonlyArray<ChipWave> = [
			{name: "rounded",      volume: 0.94, samples: Config._centerWave([0.0, 0.2, 0.4, 0.5, 0.6, 0.7, 0.8, 0.85, 0.9, 0.95, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 0.95, 0.9, 0.85, 0.8, 0.7, 0.6, 0.5, 0.4, 0.2, 0.0, -0.2, -0.4, -0.5, -0.6, -0.7, -0.8, -0.85, -0.9, -0.95, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -0.95, -0.9, -0.85, -0.8, -0.7, -0.6, -0.5, -0.4, -0.2])},
			{name: "triangle",     volume: 1.0,  samples: Config._centerWave([1.0/15.0, 3.0/15.0, 5.0/15.0, 7.0/15.0, 9.0/15.0, 11.0/15.0, 13.0/15.0, 15.0/15.0, 15.0/15.0, 13.0/15.0, 11.0/15.0, 9.0/15.0, 7.0/15.0, 5.0/15.0, 3.0/15.0, 1.0/15.0, -1.0/15.0, -3.0/15.0, -5.0/15.0, -7.0/15.0, -9.0/15.0, -11.0/15.0, -13.0/15.0, -15.0/15.0, -15.0/15.0, -13.0/15.0, -11.0/15.0, -9.0/15.0, -7.0/15.0, -5.0/15.0, -3.0/15.0, -1.0/15.0])},
			{name: "square",       volume: 0.5,  samples: Config._centerWave([1.0, -1.0])},
			{name: "1/3 pulse",    volume: 0.5,  samples: Config._centerWave([1.0, -1.0, -1.0])},
			{name: "1/4 pulse",    volume: 0.5,  samples: Config._centerWave([1.0, -1.0, -1.0, -1.0])},
			{name: "1/6 pulse",    volume: 0.5,  samples: Config._centerWave([1.0, -1.0, -1.0, -1.0, -1.0, -1.0])},
			{name: "1/8 pulse",    volume: 0.5,  samples: Config._centerWave([1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0])},
			{name: "1/12 pulse",   volume: 0.5,  samples: Config._centerWave([1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0])},
			{name: "1/16 pulse",   volume: 0.5,  samples: Config._centerWave([1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0])},
			{name: "sawtooth",     volume: 0.65, samples: Config._centerWave([1.0/31.0, 3.0/31.0, 5.0/31.0, 7.0/31.0, 9.0/31.0, 11.0/31.0, 13.0/31.0, 15.0/31.0, 17.0/31.0, 19.0/31.0, 21.0/31.0, 23.0/31.0, 25.0/31.0, 27.0/31.0, 29.0/31.0, 31.0/31.0, -31.0/31.0, -29.0/31.0, -27.0/31.0, -25.0/31.0, -23.0/31.0, -21.0/31.0, -19.0/31.0, -17.0/31.0, -15.0/31.0, -13.0/31.0, -11.0/31.0, -9.0/31.0, -7.0/31.0, -5.0/31.0, -3.0/31.0, -1.0/31.0])},
			{name: "double saw",   volume: 0.5,  samples: Config._centerWave([0.0, -0.2, -0.4, -0.6, -0.8, -1.0, 1.0, -0.8, -0.6, -0.4, -0.2, 1.0, 0.8, 0.6, 0.4, 0.2])},
			{name: "double pulse", volume: 0.4,  samples: Config._centerWave([1.0, 1.0, 1.0, 1.0, 1.0, -1.0, -1.0, -1.0, 1.0, 1.0, 1.0, 1.0, -1.0, -1.0, -1.0, -1.0])},
			{name: "spiky",        volume: 0.4,  samples: Config._centerWave([1.0, -1.0, 1.0, -1.0, 1.0, 0.0])},
		];
		// Noise waves have too many samples to write by hand, they're generated on-demand by getDrumWave instead.
		public static readonly noiseWaves: ReadonlyArray<NoiseWave> = [
			{name: "retro",   volume: 0.25, basePitch: 69,  pitchFilterMult: 100.0, isSoft: false, samples: null},
			{name: "white",   volume: 1.0,  basePitch: 69,  pitchFilterMult:   8.0, isSoft: true,  samples: null},
			// The "clang" and "buzz" drums are inspired by similar drums in the modded beepbox! :D
			{name: "clang",   volume: 0.4,  basePitch: 69,  pitchFilterMult: 100.0, isSoft: false, samples: null},
			{name: "buzz",    volume: 0.3,  basePitch: 69,  pitchFilterMult: 100.0, isSoft: false, samples: null},
			{name: "hollow",  volume: 1.5,  basePitch: 96,  pitchFilterMult:   1.0, isSoft: true,  samples: null},
			//{name: "tom-tom", volume: 1.5,  basePitch: 96,  pitchFilterMult:   1.0, isSoft: true,  samples: null},
			//{name: "cymbal",  volume: 1.5,  basePitch: 90,  pitchFilterMult:   1.0, isSoft: true,  samples: null},
			//{name: "bass",    volume: 1.5,  basePitch: 126, pitchFilterMult:   1.0, isSoft: true,  samples: null},
		];
		public static readonly filterCutoffMaxHz: number = 8000; // This is carefully calculated to correspond to no change when filtering at 48000 samples per second.
		public static readonly filterCutoffMinHz: number = 10;
		public static readonly filterMax: number = 0.95;
		public static readonly filterMaxResonance: number = 0.95;
		public static readonly filterCutoffRange: number = 11;
		public static readonly filterResonanceRange: number = 8;
		public static readonly transitions: ReadonlyArray<Transition> = [
			{name: "seamless",    isSeamless: true,  attackSeconds: 0.0,    releases: false, releaseTicks: 1,  slides: false, slideTicks: 3},
			{name: "hard",        isSeamless: false, attackSeconds: 0.0,    releases: false, releaseTicks: 3,  slides: false, slideTicks: 3},
			{name: "soft",        isSeamless: false, attackSeconds: 0.025,  releases: false, releaseTicks: 3,  slides: false, slideTicks: 3},
			{name: "slide",       isSeamless: true,  attackSeconds: 0.025,  releases: false, releaseTicks: 3,  slides: true,  slideTicks: 3},
			{name: "cross-fade",  isSeamless: false, attackSeconds: 0.04,   releases: true,  releaseTicks: 6,  slides: false, slideTicks: 3},
			{name: "fast fade",   isSeamless: false, attackSeconds: 0.0,    releases: true,  releaseTicks: 48, slides: false, slideTicks: 3},
			{name: "medium fade", isSeamless: false, attackSeconds: 0.0125, releases: true,  releaseTicks: 72, slides: false, slideTicks: 3},
			{name: "slow fade",   isSeamless: false, attackSeconds: 0.06,   releases: true,  releaseTicks: 96, slides: false, slideTicks: 6},
		];
		public static readonly vibratos: ReadonlyArray<Vibrato> = [
			{name: "none",    amplitude: 0.0,  periodsSeconds: [0.14], delayParts: 0},
			{name: "light",   amplitude: 0.15, periodsSeconds: [0.14], delayParts: 0},
			{name: "delayed", amplitude: 0.3,  periodsSeconds: [0.14], delayParts: 18},
			{name: "heavy",   amplitude: 0.45, periodsSeconds: [0.14], delayParts: 0},
			{name: "shaky",   amplitude: 0.11, periodsSeconds: [0.1, 0.1618, 0.3], delayParts: 0},
		];
		public static readonly intervals: ReadonlyArray<Interval> = [
			{name: "union",      spread: 0.0,  offset: 0.0, volume: 0.7, sign: 1.0},
			{name: "shimmer",    spread: 0.02, offset: 0.0, volume: 0.8, sign: 1.0},
			{name: "hum",        spread: 0.05, offset: 0.0, volume: 1.0, sign: 1.0},
			{name: "honky tonk", spread: 0.1,  offset: 0.0, volume: 1.0, sign: 1.0},
			{name: "dissonant",  spread: 0.25, offset: 0.0, volume: 0.9, sign: 1.0},
			{name: "fifth",      spread: 3.5,  offset: 3.5, volume: 0.9, sign: 1.0},
			{name: "octave",     spread: 6.0,  offset: 6.0, volume: 0.8, sign: 1.0},
			{name: "bowed",      spread: 0.02, offset: 0.0, volume: 1.0, sign:-1.0},
		];
		public static readonly effectsNames: ReadonlyArray<string> = ["none", "reverb", "chorus", "chorus & reverb"];
		public static readonly volumeRange: number = 6;
		public static readonly volumeValues: ReadonlyArray<number> = [0.0, 0.5, 1.0, 1.5, 2.0, -1.0];
		public static readonly chords: ReadonlyArray<Chord> = [
			{name: "harmony",         harmonizes:  true, arpeggiates: false, allowedForNoise:  true, strumParts: 0},
			{name: "strum",           harmonizes:  true, arpeggiates: false, allowedForNoise:  true, strumParts: 1},
			{name: "arpeggio",        harmonizes: false, arpeggiates:  true, allowedForNoise:  true, strumParts: 0},
			{name: "custom interval", harmonizes:  true, arpeggiates:  true, allowedForNoise: false, strumParts: 0},
		];
		public static readonly operatorCount: number = 4;
		public static readonly algorithms: ReadonlyArray<Algorithm> = [
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
		];
		public static readonly operatorCarrierInterval: ReadonlyArray<number> = [0.0, 0.04, -0.073, 0.091];
		public static readonly operatorAmplitudeMax: number = 15;
		public static readonly operatorFrequencies: ReadonlyArray<OperatorFrequency> = [
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
		];
		public static readonly envelopes: ReadonlyArray<Envelope> = [
			{name: "custom",   type: EnvelopeType.custom,   speed:  0.0, inverted: false},
			{name: "steady",   type: EnvelopeType.steady,   speed:  0.0, inverted: false},
			{name: "punch",    type: EnvelopeType.punch,    speed:  0.0, inverted: false},
			{name: "flare 1",  type: EnvelopeType.flare,    speed: 32.0, inverted: false},
			{name: "flare 2",  type: EnvelopeType.flare,    speed:  8.0, inverted: false},
			{name: "flare 3",  type: EnvelopeType.flare,    speed:  2.0, inverted: false},
			{name: "pluck 1",  type: EnvelopeType.pluck,    speed: 32.0, inverted: false},
			{name: "pluck 2",  type: EnvelopeType.pluck,    speed:  8.0, inverted: false},
			{name: "pluck 3",  type: EnvelopeType.pluck,    speed:  2.0, inverted: false},
			{name: "swell 1",  type: EnvelopeType.pluck,    speed: 32.0, inverted:  true},
			{name: "swell 2",  type: EnvelopeType.pluck,    speed:  8.0, inverted:  true},
			{name: "swell 3",  type: EnvelopeType.pluck,    speed:  2.0, inverted:  true},
			{name: "tremolo1", type: EnvelopeType.tremolo,  speed:  4.0, inverted: false},
			{name: "tremolo2", type: EnvelopeType.tremolo,  speed:  2.0, inverted: false},
			{name: "tremolo3", type: EnvelopeType.tremolo,  speed:  1.0, inverted: false},
			{name: "tremolo4", type: EnvelopeType.tremolo2, speed:  4.0, inverted: false},
			{name: "tremolo5", type: EnvelopeType.tremolo2, speed:  2.0, inverted: false},
			{name: "tremolo6", type: EnvelopeType.tremolo2, speed:  1.0, inverted: false},
			{name: "decay 1",  type: EnvelopeType.decay,    speed: 10.0, inverted: false},
			{name: "decay 2",  type: EnvelopeType.decay,    speed:  7.0, inverted: false},
			{name: "decay 3",  type: EnvelopeType.decay,    speed:  4.0, inverted: false},
		];
		public static readonly feedbacks: ReadonlyArray<Feedback> = [
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
		];
		public static readonly instrumentTypeNames: ReadonlyArray<string> = ["chip", "FM", "noise"];
		public static readonly pitchColors: ReadonlyArray<ChannelColors> = [
			{name: "cyan",   channelDim: "#0099a1", channelBright: "#25f3ff", noteDim: "#00bdc7", noteBright: "#92f9ff"},
			{name: "yellow", channelDim: "#a1a100", channelBright: "#ffff25", noteDim: "#c7c700", noteBright: "#ffff92"},
			{name: "orange", channelDim: "#c75000", channelBright: "#ff9752", noteDim: "#ff771c", noteBright: "#ffcdab"},
			{name: "green",  channelDim: "#00a100", channelBright: "#50ff50", noteDim: "#00c700", noteBright: "#a0ffa0"},
			{name: "purple", channelDim: "#d020d0", channelBright: "#ff90ff", noteDim: "#e040e0", noteBright: "#ffc0ff"},
			{name: "blue",   channelDim: "#7777b0", channelBright: "#a0a0ff", noteDim: "#8888d0", noteBright: "#d0d0ff"},
		];
		public static readonly noiseColors: ReadonlyArray<ChannelColors> = [
			{name: "gray",   channelDim: "#6f6f6f", channelBright: "#aaaaaa", noteDim: "#aaaaaa", noteBright: "#eeeeee"},
			{name: "brown",  channelDim: "#996633", channelBright: "#ddaa77", noteDim: "#cc9966", noteBright: "#f0d0bb"},
		];
		public static readonly pitchChannelCountMin: number = 1;
		public static readonly pitchChannelCountMax: number = 6;
		public static readonly drumChannelCountMin: number = 0;
		public static readonly drumChannelCountMax: number = 2;
		public static readonly drumInterval: number = 6;
		public static readonly drumCount: number = 12;
		public static readonly windowPitchCount: number = 37;
		public static readonly maxPitch: number = 84;
		public static readonly maximumTonesPerChannel: number = 8;
		public static readonly sineWaveLength: number = 1 << 8; // 256
		public static readonly sineWaveMask: number = Config.sineWaveLength - 1;
		public static readonly sineWave: Float64Array = Config.generateSineWave();
		
		private static _centerWave(wave: Array<number>): Float64Array {
			let sum: number = 0.0;
			for (let i: number = 0; i < wave.length; i++) {
				sum += wave[i];
			}
			const average: number = sum / wave.length;
			const integral: number[] = [0];
			for (let i: number = 0; i < wave.length; i++) {
				integral.push(integral[i] + wave[i] - average);
			}
			return new Float64Array(integral);
		}
		
		public static getDrumWave(index: number): Float32Array {
			let wave: Float32Array | null = Config.noiseWaves[index].samples;
			if (wave == null) {
				wave = new Float32Array(32768);
				Config.noiseWaves[index].samples = wave;
				
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
				} else if (index == 2) {
					// The "clang" drums are inspired by similar drums in the modded beepbox! :D
                    let drumBuffer: number = 1;
					for (let i: number = 0; i < 32768; i++) {
                        wave[i] = (drumBuffer & 1) * 2.0 - 1.0;
						let newBuffer: number = drumBuffer >> 1;
                        if (((drumBuffer + newBuffer) & 1) == 1) {
                            newBuffer += 2 << 14;
                        }
                        drumBuffer = newBuffer;
                    }
                } else if (index == 3) {
					// The "buzz" drums are inspired by similar drums in the modded beepbox! :D
                    let drumBuffer: number = 1;
					for (let i: number = 0; i < 32768; i++) {
                        wave[i] = (drumBuffer & 1) * 2.0 - 1.0;
						let newBuffer: number = drumBuffer >> 1;
                        if (((drumBuffer + newBuffer) & 1) == 1) {
                            newBuffer += 10 << 2;
                        }
                        drumBuffer = newBuffer;
                    }
				} else if (index == 4) {
					// "hollow" drums, designed in frequency space and then converted via FFT:
					Config.drawNoiseSpectrum(wave, 10, 11, 1, 1, 0);
					Config.drawNoiseSpectrum(wave, 11, 14, -2, -2, 0);
					inverseRealFourierTransform(wave);
					scaleElementsByFactor(wave, 1.0 / Math.sqrt(wave.length));
				/*
				} else if (index == 5) {
					// "tom-tom" drums, designed in frequency space and then converted via FFT:
					Config.drawNoiseSpectrum(wave, 10, 14, 0, -4, 0);
					inverseRealFourierTransform(wave);
					scaleElementsByFactor(wave, 1.0 / Math.sqrt(wave.length));
				} else if (index == 6) {
					// "cymbal" drums, designed in frequency space and then converted via FFT:
					Config.drawNoiseSpectrum(wave, 9, 9.4, -1, -1, -0.5);
					Config.drawNoiseSpectrum(wave, 9.7, 10, -1, -1, -0.5);
					Config.drawNoiseSpectrum(wave, 10.3, 10.6, -1, -1, -0.5);
					Config.drawNoiseSpectrum(wave, 10.9, 11.1, -1, -1, -0.5);
					Config.drawNoiseSpectrum(wave, 11.3, 11.4, 0, 0, -0.5);
					Config.drawNoiseSpectrum(wave, 11.5, 11.7, 1.5, 1.5, -0.5);
					Config.drawNoiseSpectrum(wave, 11.7, 12, -1, -1, -0.5);
					Config.drawNoiseSpectrum(wave, 12, 12.1, 2, 2, -0.5);
					Config.drawNoiseSpectrum(wave, 12.1, 12.6, 0, 2, -0.5);
					Config.drawNoiseSpectrum(wave, 12.6, 13, 0, 0, -0.5);
					Config.drawNoiseSpectrum(wave, 13, 14, 1, -3, -0.5);
					inverseRealFourierTransform(wave);
					scaleElementsByFactor(wave, 1.0 / Math.sqrt(wave.length));
				} else if (index == 7) {
					// "bass" drums, designed in frequency space and then converted via FFT:
					Config.drawNoiseSpectrum(wave, 7, 8, -2, 4, 0);
					Config.drawNoiseSpectrum(wave, 8, 9, 4, -2, 0);
					Config.drawNoiseSpectrum(wave, 9, 14, -2, -6, 0);
					inverseRealFourierTransform(wave);
					scaleElementsByFactor(wave, 1.0 / Math.sqrt(wave.length));
				*/
				} else {
					throw new Error("Unrecognized drum index: " + index);
				}
			}
			
			return wave;
		}
		
		private static drawNoiseSpectrum(wave: Float32Array, lowOctave: number, highOctave: number, lowPower: number, highPower: number, overalSlope: number): void {
			const referenceOctave: number = 11;
			const referenceIndex: number = 1 << referenceOctave;
			const lowIndex: number = Math.pow(2, lowOctave) | 0;
			const highIndex: number = Math.pow(2, highOctave) | 0;
			const log2: number = Math.log(2);
			for (let i: number = lowIndex; i < highIndex; i++) {
				let amplitude: number = Math.pow(2, lowPower + (highPower - lowPower) * (Math.log(i) / log2 - lowOctave) / (highOctave - lowOctave));
				amplitude *= Math.pow(i / referenceIndex, overalSlope);
				const radians: number = Math.random() * Math.PI * 2.0;
				wave[i] = Math.cos(radians) * amplitude;
				wave[32768 - i] = Math.sin(radians) * amplitude;
			}
		}
		
		private static generateSineWave(): Float64Array {
			const wave: Float64Array = new Float64Array(Config.sineWaveLength + 1);
			for (let i: number = 0; i < Config.sineWaveLength + 1; i++) {
				wave[i] = Math.sin(i * Math.PI * 2.0 / Config.sineWaveLength);
			}
			return wave;
		}
		
		public static midiProgramToPreset(program: number): Preset | null {
			const index: number = Config.midiPresets.findIndex(preset=>preset.midiProgram == program);
			return (index == -1) ? null : Config.midiPresets[index];
		}
		
		public static midiPresetToValue(preset: Preset): number {
			return preset.midiProgram + Config.midiPresetStart;
		}
		
		public static valueToPreset(presetValue: number): Preset | null {
			if (presetValue >= Config.midiPresetStart) {
				const index: number = Config.midiPresets.findIndex(preset=>preset.midiProgram == presetValue - Config.midiPresetStart);
				return (index == -1) ? null : Config.midiPresets[index];
			} else if (presetValue >= Config.beepboxPresetStart) {
				return Config.beepboxPresets[presetValue - Config.beepboxPresetStart];
			} else {
				return Config.customTypePresets[presetValue];
			}
		}
		
		public static nameToPresetValue(presetName: string): number | null {
			let index: number = Config.midiPresets.findIndex(preset=>preset.name == presetName);
			if (index != -1) return Config.midiPresets[index].midiProgram + Config.midiPresetStart;
			index = Config.beepboxPresets.findIndex(preset=>preset.name == presetName);
			if (index != -1) return index + Config.beepboxPresetStart;
			index = Config.customTypePresets.findIndex(preset=>preset.name == presetName);
			if (index != -1) return index;
			return null;
		}
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
		
		operatorEnvelopes = CharCode.E,
		feedbackType = CharCode.F,
		
		operatorAmplitudes = CharCode.P,
		operatorFrequencies = CharCode.Q,
		
		startInstrument = CharCode.T,
		
		feedbackEnvelope = CharCode.V,
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
	
	export interface NotePin {
		interval: number;
		time: number;
		volume: number;
	}
	
	export function makeNotePin(interval: number, time: number, volume: number): NotePin {
		return {interval: interval, time: time, volume: volume};
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
	
	export class Pattern {
		public notes: Note[] = [];
		public instrument: number = 0;
		
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
	
	export class Instrument {
		public type: InstrumentType = InstrumentType.chip;
		public preset: number = 0;
		public wave: number = 2;
		public filterCutoff: number = 6;
		public filterResonance: number = 0;
		public filterEnvelope: number = 1;
		public transition: number = 1;
		public vibrato: number = 0;
		public interval: number = 0;
		public effects: number = 0;
		public chord: number = 1;
		public volume: number = 0;
		public algorithm: number = 0;
		public feedbackType: number = 0;
		public feedbackAmplitude: number = 0;
		public feedbackEnvelope: number = 1;
		public readonly operators: Operator[] = [];
		
		constructor() {
			for (let i = 0; i < Config.operatorCount; i++) {
				this.operators.push(new Operator(i));
			}
		}
		
		public setTypeAndReset(type: InstrumentType): void {
			this.type = type;
			this.preset = type;
			switch (type) {
				case InstrumentType.chip:
					this.wave = 2;
					this.filterCutoff = 6;
					this.filterResonance = 0;
					this.filterEnvelope = 1;
					this.transition = 1;
					this.vibrato = 0;
					this.interval = 0;
					this.volume = 0;
					this.effects = 1;
					this.chord = 2;
					break;
				case InstrumentType.fm:
					this.volume = 0;
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
					this.feedbackEnvelope = 1;
					for (let i: number = 0; i < this.operators.length; i++) {
						this.operators[i].reset(i);
					}
					break;
				case InstrumentType.noise:
					this.wave = 1;
					this.transition = 1;
					this.volume = 0;
					this.effects = 0;
					this.chord = 2;
					this.filterCutoff = 10;
					this.filterResonance = 0;
					this.filterEnvelope = 1;
					break;
				default:
					throw new Error("Unrecognized instrument type: " + type);
			}
		}
		
		public copy(other: Instrument): void {
			this.type = other.type;
			this.preset = other.preset;
			this.wave = other.wave;
			this.filterCutoff = other.filterCutoff;
			this.filterResonance = other.filterResonance;
			this.filterEnvelope = other.filterEnvelope;
			this.transition = other.transition;
			this.vibrato = other.vibrato;
			this.interval = other.interval;
			this.effects = other.effects;
			this.chord = other.chord;
			this.volume = other.volume;
			this.algorithm = other.algorithm;
			this.feedbackType = other.feedbackType;
			this.feedbackAmplitude = other.feedbackAmplitude;
			this.feedbackEnvelope = other.feedbackEnvelope;
			for (let i: number = 0; i < this.operators.length; i++) {
				this.operators[i].copy(other.operators[i]);
			}
		}
		
		public toJsonObject(): Object {
			const instrumentObject: any = {
				type: Config.instrumentTypeNames[this.type],
				volume: (5 - this.volume) * 20,
				transition: Config.transitions[this.transition].name,
				effects: Config.effectsNames[this.effects],
				chord: Config.chords[this.chord].name,
				filterCutoffHz: Math.round(Config.filterCutoffMaxHz * Math.pow(2.0, (this.filterCutoff - (Config.filterCutoffRange - 1)) * 0.5)),
				filterResonance: Math.round(100 * this.filterResonance / (Config.filterResonanceRange - 1)),
				filterEnvelope: Config.envelopes[this.filterEnvelope].name,
			};
			if (this.preset != this.type) {
				instrumentObject.preset = Config.valueToPreset(this.preset)!.name;
			}
			if (this.type == InstrumentType.noise) {
				instrumentObject.wave = Config.noiseWaves[this.wave].name;
			} else if (this.type == InstrumentType.chip) {
				instrumentObject.wave = Config.chipWaves[this.wave].name;
				instrumentObject.interval = Config.intervals[this.interval].name;
				instrumentObject.vibrato = Config.vibratos[this.vibrato].name;
			} else if (this.type == InstrumentType.fm) {
				const operatorArray: Object[] = [];
				for (const operator of this.operators) {
					operatorArray.push({
						frequency: Config.operatorFrequencies[operator.frequency].name,
						amplitude: operator.amplitude,
						envelope: Config.envelopes[operator.envelope].name,
					});
				}
				instrumentObject.vibrato = Config.vibratos[this.vibrato].name;
				instrumentObject.algorithm = Config.algorithms[this.algorithm].name;
				instrumentObject.feedbackType = Config.feedbacks[this.feedbackType].name;
				instrumentObject.feedbackAmplitude = this.feedbackAmplitude;
				instrumentObject.feedbackEnvelope = Config.envelopes[this.feedbackEnvelope].name;
				instrumentObject.operators = operatorArray;
			} else {
				throw new Error("Unrecognized instrument type");
			}
			return instrumentObject;
		}
		
		public fromJsonObject(instrumentObject: any, isDrum: boolean): void {
			if (instrumentObject == undefined) instrumentObject = {};
			
			let type: InstrumentType = Config.instrumentTypeNames.indexOf(instrumentObject.type);
			if (type == -1) type = isDrum ? InstrumentType.noise : InstrumentType.chip;
			this.setTypeAndReset(type);
			
			if (instrumentObject.preset != undefined) {
				const presetValue: number | null = Config.nameToPresetValue(instrumentObject.preset);
				if (presetValue != null) this.preset = presetValue;
			}
			
			if (instrumentObject.volume != undefined) {
				this.volume = clamp(0, Config.volumeRange, Math.round(5 - (instrumentObject.volume | 0) / 20));
			} else {
				this.volume = 0;
			}
			
			const oldTransitionNames: Dictionary<number> = {"binary": 0, "sudden": 1, "smooth": 2};
			const transitionObject = instrumentObject.transition || instrumentObject.envelope; // the transition property used to be called envelope, so try that too.
			this.transition = oldTransitionNames[transitionObject] != undefined ? oldTransitionNames[transitionObject] : Config.transitions.findIndex(transition=>transition.name==transitionObject);
			if (this.transition == -1) this.transition = 1;
			
			this.effects = Config.effectsNames.indexOf(instrumentObject.effects);
			if (this.effects == -1) this.effects = (this.type == InstrumentType.noise) ? 0 : 1;
			
			if (instrumentObject.filterCutoffHz != undefined) {
				this.filterCutoff = clamp(0, Config.filterCutoffRange, Math.round((Config.filterCutoffRange - 1) + 2.0 * Math.log((instrumentObject.filterCutoffHz | 0) / Config.filterCutoffMaxHz) / Math.log(2)));
			} else {
				this.filterCutoff = (this.type == InstrumentType.chip) ? 6 : 10;
			}
			if (instrumentObject.filterResonance != undefined) {
				this.filterResonance = clamp(0, Config.filterResonanceRange, Math.round((Config.filterResonanceRange - 1) * (instrumentObject.filterResonance | 0) / 100));
			} else {
				this.filterResonance = 0;
			}
			this.filterEnvelope = Config.envelopes.findIndex(envelope=>envelope.name == instrumentObject.filterEnvelope);
			if (this.filterEnvelope == -1) this.filterEnvelope = 1;
			
			if (instrumentObject.filter != undefined) {
				const legacyToCutoff: number[] = [10, 6, 3, 0, 8, 5, 2];
				const legacyToEnvelope: number[] = [1, 1, 1, 1, 18, 19, 20];
				const filterNames: string[] = ["none", "bright", "medium", "soft", "decay bright", "decay medium", "decay soft"];
				const oldFilterNames: Dictionary<number> = {"sustain sharp": 1, "sustain medium": 2, "sustain soft": 3, "decay sharp": 4};
				let legacyFilter: number = oldFilterNames[instrumentObject.filter] != undefined ? oldFilterNames[instrumentObject.filter] : filterNames.indexOf(instrumentObject.filter);
				if (legacyFilter == -1) legacyFilter = 0;
				this.filterCutoff = legacyToCutoff[legacyFilter];
				this.filterEnvelope = legacyToEnvelope[legacyFilter];
				this.filterResonance = 0;
			}
			
			const legacyEffectNames: ReadonlyArray<string> = ["none", "vibrato light", "vibrato delayed", "vibrato heavy"];
			if (this.type == InstrumentType.noise) {
				this.wave = Config.noiseWaves.findIndex(wave=>wave.name==instrumentObject.wave);
				if (this.wave == -1) this.wave = 1;

				this.chord = Config.chords.findIndex(chord=>chord.name==instrumentObject.chord);
				if (this.chord == -1) this.chord = 1;

			} else if (this.type == InstrumentType.chip) {
				const legacyWaveNames: Dictionary<number> = {"triangle": 1, "square": 2, "pulse wide": 4, "pulse narrow": 6, "sawtooth": 9, "double saw": 10, "double pulse": 11, "spiky": 12, "plateau": 0};
				this.wave = legacyWaveNames[instrumentObject.wave] != undefined ? legacyWaveNames[instrumentObject.wave] : Config.chipWaves.findIndex(wave=>wave.name==instrumentObject.wave);
				if (this.wave == -1) this.wave = 1;

				if (instrumentObject.interval != undefined) {
					this.interval = Config.intervals.findIndex(interval=>interval.name==instrumentObject.interval);
					if (this.interval == -1) this.interval = 0;
				} else if (instrumentObject.chorus != undefined) {
					const legacyChorusNames: Dictionary<number> = {"fifths": 5, "octaves": 6};
					this.interval = legacyChorusNames[instrumentObject.chorus] != undefined ? legacyChorusNames[instrumentObject.chorus] : Config.intervals.findIndex(interval=>interval.name==instrumentObject.chorus);
					if (this.interval == -1) this.interval = 0;
				}
				
				if (instrumentObject.vibrato != undefined) {
					this.vibrato = Config.vibratos.findIndex(vibrato=>vibrato.name==instrumentObject.vibrato);
					if (this.vibrato == -1) this.vibrato = 0;
				} else if (instrumentObject.effect != undefined) {
					this.vibrato = legacyEffectNames.indexOf(instrumentObject.effect);
					if (this.vibrato == -1) this.vibrato = 0;
				}
				
				this.chord = Config.chords.findIndex(chord=>chord.name==instrumentObject.chord);
				if (this.chord == -1) this.chord = 1;

				// The original chorus setting had an option that now maps to two different settings. Override those if necessary.
				if (instrumentObject.chorus == "custom harmony") {
					this.interval = 2;
					this.chord = 3;
				}
			} else if (this.type == InstrumentType.fm) {
				if (instrumentObject.vibrato != undefined) {
					this.vibrato = Config.vibratos.findIndex(vibrato=>vibrato.name==instrumentObject.vibrato);
					if (this.vibrato == -1) this.vibrato = 0;
				} else if (instrumentObject.effect != undefined) {
					this.vibrato = legacyEffectNames.indexOf(instrumentObject.effect);
					if (this.vibrato == -1) this.vibrato = 0;
				}
				
				this.chord = Config.chords.findIndex(chord=>chord.name==instrumentObject.chord);
				if (this.chord == -1) this.chord = 3;

				this.algorithm = Config.algorithms.findIndex(algorithm=>algorithm.name==instrumentObject.algorithm);
				if (this.algorithm == -1) this.algorithm = 0;
				this.feedbackType = Config.feedbacks.findIndex(feedback=>feedback.name==instrumentObject.feedbackType);
				if (this.feedbackType == -1) this.feedbackType = 0;
				if (instrumentObject.feedbackAmplitude != undefined) {
					this.feedbackAmplitude = clamp(0, Config.operatorAmplitudeMax + 1, instrumentObject.feedbackAmplitude | 0);
				} else {
					this.feedbackAmplitude = 0;
				}
				this.feedbackEnvelope = Config.envelopes.findIndex(envelope=>envelope.name==instrumentObject.feedbackEnvelope);
				if (this.feedbackEnvelope == -1) this.feedbackEnvelope = 0;
				
				for (let j: number = 0; j < Config.operatorCount; j++) {
					const operator: Operator = this.operators[j];
					let operatorObject: any = undefined;
					if (instrumentObject.operators) operatorObject = instrumentObject.operators[j];
					if (operatorObject == undefined) operatorObject = {};
					
					operator.frequency = Config.operatorFrequencies.findIndex(freq=>freq.name==operatorObject.frequency);
					if (operator.frequency == -1) operator.frequency = 0;
					if (operatorObject.amplitude != undefined) {
						operator.amplitude = clamp(0, Config.operatorAmplitudeMax + 1, operatorObject.amplitude | 0);
					} else {
						operator.amplitude = 0;
					}
					operator.envelope = Config.envelopes.findIndex(envelope=>envelope.name==operatorObject.envelope);
					if (operator.envelope == -1) operator.envelope = 0;
				}
			} else {
				throw new Error("Unrecognized instrument type.");
			}
		}
	}
	
	export class Channel {
		public octave: number = 0;
		public readonly instruments: Instrument[] = [];
		public readonly patterns: Pattern[] = [];
		public readonly bars: number[] = [];
	}
	
	export class Song {
		private static readonly _format: string = "BeepBox";
		private static readonly _oldestVersion: number = 2;
		private static readonly _latestVersion: number = 7;
		private static readonly _base64IntToCharCode: ReadonlyArray<number> = [48,49,50,51,52,53,54,55,56,57,97,98,99,100,101,102,103,104,105,106,107,108,109,110,111,112,113,114,115,116,117,118,119,120,121,122,65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80,81,82,83,84,85,86,87,88,89,90,45,95];
		private static readonly _base64CharCodeToInt: ReadonlyArray<number> = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,62,62,0,0,1,2,3,4,5,6,7,8,9,0,0,0,0,0,0,0,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,0,0,0,0,63,0,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,0,0,0,0,0]; // 62 could be represented by either "-" or "." for historical reasons. New songs should use "-".
		
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
		public drumChannelCount: number;
		public readonly channels: Channel[] = [];
		
		constructor(string?: string) {
			if (string != undefined) {
				this.fromBase64String(string);
			} else {
				this.initToDefault(true);
			}
		}
		
		public getChannelCount(): number {
			return this.pitchChannelCount + this.drumChannelCount;
		}
		
		public getChannelIsDrum(channel: number): boolean {
			return (channel >= this.pitchChannelCount);
		}
		
		public getChannelColorDim(channel: number): string {
			return channel < this.pitchChannelCount
				? Config.pitchColors[channel % Config.pitchColors.length].channelDim
				: Config.noiseColors[(channel - this.pitchChannelCount) % Config.noiseColors.length].channelDim;
		}
		public getChannelColorBright(channel: number): string {
			return channel < this.pitchChannelCount
				? Config.pitchColors[channel % Config.pitchColors.length].channelBright
				: Config.noiseColors[(channel - this.pitchChannelCount) % Config.noiseColors.length].channelBright;
		}
		public getNoteColorDim(channel: number): string {
			return channel < this.pitchChannelCount
				? Config.pitchColors[channel % Config.pitchColors.length].noteDim
				: Config.noiseColors[(channel - this.pitchChannelCount) % Config.noiseColors.length].noteDim;
		}
		public getNoteColorBright(channel: number): string {
			return channel < this.pitchChannelCount
				? Config.pitchColors[channel % Config.pitchColors.length].noteBright
				: Config.noiseColors[(channel - this.pitchChannelCount) % Config.noiseColors.length].noteBright;
		}
		
		public initToDefault(andResetChannels: boolean = true): void {
			this.scale = 0;
			this.key = 0;
			this.loopStart = 0;
			this.loopLength = 4;
			this.tempo = 7;
			this.reverb = 0;
			this.beatsPerBar = 8;
			this.barCount = 16;
			this.patternsPerChannel = 8;
			this.rhythm = 1;
			this.instrumentsPerChannel = 1;
			
			if (andResetChannels) {
				this.pitchChannelCount = 3;
				this.drumChannelCount = 1;
				for (let channelIndex = 0; channelIndex < this.getChannelCount(); channelIndex++) {
					if (this.channels.length <= channelIndex) {
						this.channels[channelIndex] = new Channel();
					}
					const channel: Channel = this.channels[channelIndex];
					channel.octave = 3 - channelIndex; // [3, 2, 1, 0]; Descending octaves with drums at zero in last channel.
				
					for (let pattern = 0; pattern < this.patternsPerChannel; pattern++) {
						if (channel.patterns.length <= pattern) {
							channel.patterns[pattern] = new Pattern();
						} else {
							channel.patterns[pattern].reset();
						}
					}
					channel.patterns.length = this.patternsPerChannel;
				
					for (let instrument = 0; instrument < this.instrumentsPerChannel; instrument++) {
						if (channel.instruments.length <= instrument) {
							channel.instruments[instrument] = new Instrument();
						}
						channel.instruments[instrument].setTypeAndReset(channelIndex < this.pitchChannelCount ? InstrumentType.chip : InstrumentType.noise);
					}
					channel.instruments.length = this.instrumentsPerChannel;
				
					for (let bar = 0; bar < this.barCount; bar++) {
						channel.bars[bar] = 1;
					}
					channel.bars.length = this.barCount;
				}
				this.channels.length = this.getChannelCount();
			}
		}
		
		public toBase64String(): string {
			let bits: BitFieldWriter;
			let buffer: number[] = [];
			
			const base64IntToCharCode: ReadonlyArray<number> = Song._base64IntToCharCode;
			
			buffer.push(base64IntToCharCode[Song._latestVersion]);
			buffer.push(SongTagCode.channelCount, base64IntToCharCode[this.pitchChannelCount], base64IntToCharCode[this.drumChannelCount]);
			buffer.push(SongTagCode.scale, base64IntToCharCode[this.scale]);
			buffer.push(SongTagCode.key, base64IntToCharCode[this.key]);
			buffer.push(SongTagCode.loopStart, base64IntToCharCode[this.loopStart >> 6], base64IntToCharCode[this.loopStart & 0x3f]);
			buffer.push(SongTagCode.loopEnd, base64IntToCharCode[(this.loopLength - 1) >> 6], base64IntToCharCode[(this.loopLength - 1) & 0x3f]);
			buffer.push(SongTagCode.tempo, base64IntToCharCode[this.tempo]);
			buffer.push(SongTagCode.reverb, base64IntToCharCode[this.reverb]);
			buffer.push(SongTagCode.beatCount, base64IntToCharCode[this.beatsPerBar - 1]);
			buffer.push(SongTagCode.barCount, base64IntToCharCode[(this.barCount - 1) >> 6], base64IntToCharCode[(this.barCount - 1) & 0x3f]);
			buffer.push(SongTagCode.patternCount, base64IntToCharCode[this.patternsPerChannel - 1]);
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
					buffer.push(SongTagCode.preset, base64IntToCharCode[instrument.preset >> 6], base64IntToCharCode[instrument.preset & 63]);
					buffer.push(SongTagCode.volume, base64IntToCharCode[instrument.volume]);
					buffer.push(SongTagCode.transition, base64IntToCharCode[instrument.transition]);
					buffer.push(SongTagCode.filterCutoff, base64IntToCharCode[instrument.filterCutoff]);
					buffer.push(SongTagCode.filterResonance, base64IntToCharCode[instrument.filterResonance]);
					buffer.push(SongTagCode.filterEnvelope, base64IntToCharCode[instrument.filterEnvelope]);
					buffer.push(SongTagCode.effects, base64IntToCharCode[instrument.effects]);
					buffer.push(SongTagCode.chord, base64IntToCharCode[instrument.chord]);
					if (instrument.type == InstrumentType.chip) {
						// chip
						buffer.push(SongTagCode.wave, base64IntToCharCode[instrument.wave]);
						buffer.push(SongTagCode.vibrato, base64IntToCharCode[instrument.vibrato]);
						buffer.push(SongTagCode.interval, base64IntToCharCode[instrument.interval]);
					} else if (instrument.type == InstrumentType.fm) {
						// FM
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
					} else if (instrument.type == InstrumentType.noise) {
						// noise
						buffer.push(SongTagCode.wave, base64IntToCharCode[instrument.wave]);
					} else {
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
			bits.encodeBase64(base64IntToCharCode, buffer);
			
			buffer.push(SongTagCode.patterns);
			bits = new BitFieldWriter();
			let neededInstrumentBits: number = 0;
			while ((1 << neededInstrumentBits) < this.instrumentsPerChannel) neededInstrumentBits++;
			for (let channel: number = 0; channel < this.getChannelCount(); channel++) {
				const isDrum: boolean = this.getChannelIsDrum(channel);
				const octaveOffset: number = isDrum ? 0 : this.channels[channel].octave * 12;
				let lastPitch: number = (isDrum ? 4 : 12) + octaveOffset;
				const recentPitches: number[] = isDrum ? [4,6,7,2,3,8,0,10] : [12, 19, 24, 31, 36, 7, 0];
				const recentShapes: string[] = [];
				for (let i: number = 0; i < recentPitches.length; i++) {
					recentPitches[i] += octaveOffset;
				}
				for (const pattern of this.channels[channel].patterns) {
					bits.write(neededInstrumentBits, pattern.instrument);
					
					if (pattern.notes.length > 0) {
						bits.write(1, 1);
						
						let curPart: number = 0;
						for (const note of pattern.notes) {
							if (note.start > curPart) {
								bits.write(2, 0); // rest
								bits.writePartDuration(note.start - curPart);
							}
							
							const shapeBits: BitFieldWriter = new BitFieldWriter();
							
							// 0: 1 pitch, 10: 2 pitches, 110: 3 pitches, 111: 4 pitches
							for (let i: number = 1; i < note.pitches.length; i++) shapeBits.write(1,1);
							if (note.pitches.length < 4) shapeBits.write(1,0);
							
							shapeBits.writePinCount(note.pins.length - 1);
							
							shapeBits.write(2, note.pins[0].volume); // volume
							
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
						
						if (curPart < this.beatsPerBar * Config.partsPerBeat) {
							bits.write(2, 0); // rest
							bits.writePartDuration(this.beatsPerBar * Config.partsPerBeat - curPart);
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
			
			// HACK: This breaks for strings longer than 65535. 
			if (buffer.length >= 65535) throw new Error("Song hash code too long.");
			return String.fromCharCode.apply(null, buffer);
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
			
			const version: number = Song._base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
			if (version == -1 || version > Song._latestVersion || version < Song._oldestVersion) return;
			const beforeThree: boolean = version < 3;
			const beforeFour:  boolean = version < 4;
			const beforeFive:  boolean = version < 5;
			const beforeSix:   boolean = version < 6;
			const beforeSeven: boolean = version < 7;
			const base64CharCodeToInt: ReadonlyArray<number> = Song._base64CharCodeToInt;
			this.initToDefault(beforeSix);
			
			if (beforeThree) {
				// Originally, the only instrument transition was "seamless" and the only drum wave was "retro".
				for (const channel of this.channels) channel.instruments[0].transition = 0;
				this.channels[3].instruments[0].wave = 0;
			}
			
			let instrumentChannelIterator: number = 0;
			let instrumentIndexIterator: number = -1;
			
			while (charIndex < compressed.length) {
				const command: number = compressed.charCodeAt(charIndex++);
				let channel: number;
				if (command == SongTagCode.channelCount) {
					this.pitchChannelCount = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
					this.drumChannelCount  = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
					this.pitchChannelCount = clamp(Config.pitchChannelCountMin, Config.pitchChannelCountMax + 1, this.pitchChannelCount);
					this.drumChannelCount = clamp(Config.drumChannelCountMin, Config.drumChannelCountMax + 1, this.drumChannelCount);
					for (let channelIndex = this.channels.length; channelIndex < this.getChannelCount(); channelIndex++) {
						this.channels[channelIndex] = new Channel();
					}
					this.channels.length = this.getChannelCount();
				} else if (command == SongTagCode.scale) {
					this.scale = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
					if (beforeThree && this.scale == 10) this.scale = 11;
				} else if (command == SongTagCode.key) {
					if (beforeSeven) {
						this.key = clamp(0, Config.keys.length, 11 - base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
					} else {
						this.key = clamp(0, Config.keys.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
					}
				} else if (command == SongTagCode.loopStart) {
					if (beforeFive) {
						this.loopStart = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
					} else {
						this.loopStart = (base64CharCodeToInt[compressed.charCodeAt(charIndex++)] << 6) + base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
					}
				} else if (command == SongTagCode.loopEnd) {
					if (beforeFive) {
						this.loopLength = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
					} else {
						this.loopLength = (base64CharCodeToInt[compressed.charCodeAt(charIndex++)] << 6) + base64CharCodeToInt[compressed.charCodeAt(charIndex++)] + 1;
					}
				} else if (command == SongTagCode.tempo) {
					if (beforeFour) {
						this.tempo = [1, 4, 7, 10][base64CharCodeToInt[compressed.charCodeAt(charIndex++)]];
					} else {
						this.tempo = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
					}
					this.tempo = clamp(0, Config.tempoSteps, this.tempo);
				} else if (command == SongTagCode.reverb) {
					this.reverb = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
					this.reverb = clamp(0, Config.reverbRange, this.reverb);
				} else if (command == SongTagCode.beatCount) {
					if (beforeThree) {
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
							this.channels[channel].bars[bar] = 1;
						}
						this.channels[channel].bars.length = this.barCount;
					}
				} else if (command == SongTagCode.patternCount) {
					this.patternsPerChannel = base64CharCodeToInt[compressed.charCodeAt(charIndex++)] + 1;
					this.patternsPerChannel = Math.max(Config.patternsPerChannelMin, Math.min(Config.patternsPerChannelMax, this.patternsPerChannel));
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
						for (let instrumentIndex = this.channels[channel].instruments.length; instrumentIndex < this.instrumentsPerChannel; instrumentIndex++) {
							this.channels[channel].instruments[instrumentIndex] = new Instrument();
						}
						this.channels[channel].instruments.length = this.instrumentsPerChannel;
						if (beforeSix) {
							for (let instrumentIndex = 0; instrumentIndex < this.instrumentsPerChannel; instrumentIndex++) {
								this.channels[channel].instruments[instrumentIndex].setTypeAndReset(channel < this.pitchChannelCount ? InstrumentType.chip : InstrumentType.noise);
							}
						}
					}
				} else if (command == SongTagCode.rhythm) {
					this.rhythm = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
				} else if (command == SongTagCode.channelOctave) {
					if (beforeThree) {
						channel = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
						this.channels[channel].octave = clamp(0, 5, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
					} else {
						for (channel = 0; channel < this.getChannelCount(); channel++) {
							this.channels[channel].octave = clamp(0, 5, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
						}
					}
				} else if (command == SongTagCode.startInstrument) {
					instrumentIndexIterator++;
					if (instrumentIndexIterator >= this.instrumentsPerChannel) {
						instrumentChannelIterator++;
						instrumentIndexIterator = 0;
					}
					const instrument: Instrument = this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator];
					instrument.setTypeAndReset(clamp(0, InstrumentType.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]));
				} else if (command == SongTagCode.preset) {
					const presetValue: number = (base64CharCodeToInt[compressed.charCodeAt(charIndex++)] << 6) | (base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
					if (Config.valueToPreset(presetValue) != null) {
						this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].preset = presetValue;
					}
				} else if (command == SongTagCode.wave) {
					if (beforeThree) {
						const legacyWaves: number[] = [1, 2, 4, 6, 9, 10, 11, 12, 0];
						channel = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
						this.channels[channel].instruments[0].wave = clamp(0, Config.chipWaves.length, legacyWaves[base64CharCodeToInt[compressed.charCodeAt(charIndex++)]] | 0);
					} else if (beforeSix) {
						const legacyWaves: number[] = [1, 2, 4, 6, 9, 10, 11, 12, 0];
						for (channel = 0; channel < this.getChannelCount(); channel++) {
							for (let i: number = 0; i < this.instrumentsPerChannel; i++) {
								if (channel >= this.pitchChannelCount) {
									this.channels[channel].instruments[i].wave = clamp(0, Config.noiseWaves.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
								} else {
									this.channels[channel].instruments[i].wave = clamp(0, Config.chipWaves.length, legacyWaves[base64CharCodeToInt[compressed.charCodeAt(charIndex++)]] | 0);
								}
							}
						}
					} else if (beforeSeven) {
						const legacyWaves: number[] = [1, 2, 4, 6, 9, 10, 11, 12, 0];
						if (instrumentChannelIterator >= this.pitchChannelCount) {
							this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].wave = clamp(0, Config.noiseWaves.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
						} else {
							this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].wave = clamp(0, Config.chipWaves.length, legacyWaves[base64CharCodeToInt[compressed.charCodeAt(charIndex++)]] | 0);
						}
					} else {
						if (instrumentChannelIterator >= this.pitchChannelCount) {
							this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].wave = clamp(0, Config.noiseWaves.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
						} else {
							this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].wave = clamp(0, Config.chipWaves.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
						}
					}
				} else if (command == SongTagCode.filterCutoff) {
					if (beforeSeven) {
						const legacyToCutoff: number[] = [10, 6, 3, 0, 8, 5, 2];
						const legacyToEnvelope: number[] = [1, 1, 1, 1, 18, 19, 20];
						const filterNames: string[] = ["none", "bright", "medium", "soft", "decay bright", "decay medium", "decay soft"];
					
						if (beforeThree) {
							channel = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
							const instrument: Instrument = this.channels[channel].instruments[0];
							const legacyFilter: number = [1, 3, 4, 5][clamp(0, filterNames.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)])];
							instrument.filterCutoff = legacyToCutoff[legacyFilter];
							instrument.filterEnvelope = legacyToEnvelope[legacyFilter];
							instrument.filterResonance = 0;
						} else if (beforeSix) {
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
					this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].filterEnvelope = clamp(0, Config.envelopes.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
				} else if (command == SongTagCode.transition) {
					if (beforeThree) {
						channel = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
						this.channels[channel].instruments[0].transition = clamp(0, Config.transitions.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
					} else if (beforeSix) {
						for (channel = 0; channel < this.getChannelCount(); channel++) {
							for (let i: number = 0; i < this.instrumentsPerChannel; i++) {
								this.channels[channel].instruments[i].transition = clamp(0, Config.transitions.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
							}
						}
					} else {
						this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].transition = clamp(0, Config.transitions.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
					}
				} else if (command == SongTagCode.vibrato) {
					if (beforeThree) {
						const legacyEffects: number[] = [0, 3, 2, 0];
						const legacyEnvelopes: number[] = [1, 1, 1, 13];
						channel = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
						const effect: number = clamp(0, legacyEffects.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
						const instrument: Instrument = this.channels[channel].instruments[0];
						instrument.vibrato = legacyEffects[effect];
						instrument.filterEnvelope = (instrument.filterEnvelope == 1)
							? legacyEnvelopes[effect]
							: instrument.filterEnvelope;
					} else if (beforeSix) {
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
					} else if (beforeSeven) {
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
					if (beforeThree) {
						channel = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
						this.channels[channel].instruments[0].interval = clamp(0, Config.intervals.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
					} else if (beforeSix) {
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
					} else if (beforeSeven) {
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
					if (beforeThree) {
						channel = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
						this.channels[channel].instruments[0].volume = clamp(0, Config.volumeRange, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
					} else if (beforeSix) {
						for (channel = 0; channel < this.getChannelCount(); channel++) {
							for (let i: number = 0; i < this.instrumentsPerChannel; i++) {
								this.channels[channel].instruments[i].volume = clamp(0, Config.volumeRange, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
							}
						}
					} else {
						this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].volume = clamp(0, Config.volumeRange, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
					}
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
				} else if (command == SongTagCode.bars) {
					let subStringLength: number;
					if (beforeThree) {
						channel = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
						const barCount: number = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
						subStringLength = Math.ceil(barCount * 0.5);
						const bits: BitFieldReader = new BitFieldReader(base64CharCodeToInt, compressed, charIndex, charIndex + subStringLength);
						for (let i: number = 0; i < barCount; i++) {
							this.channels[channel].bars[i] = bits.read(3) + 1;
						}
					} else if (beforeFive) {
						let neededBits: number = 0;
						while ((1 << neededBits) < this.patternsPerChannel) neededBits++;
						subStringLength = Math.ceil(this.getChannelCount() * this.barCount * neededBits / 6);
						const bits: BitFieldReader = new BitFieldReader(base64CharCodeToInt, compressed, charIndex, charIndex + subStringLength);
						for (channel = 0; channel < this.getChannelCount(); channel++) {
							for (let i: number = 0; i < this.barCount; i++) {
								this.channels[channel].bars[i] = bits.read(neededBits) + 1;
							}
						}
					} else {
						let neededBits: number = 0;
						while ((1 << neededBits) < this.patternsPerChannel + 1) neededBits++;
						subStringLength = Math.ceil(this.getChannelCount() * this.barCount * neededBits / 6);
						const bits: BitFieldReader = new BitFieldReader(base64CharCodeToInt, compressed, charIndex, charIndex + subStringLength);
						for (channel = 0; channel < this.getChannelCount(); channel++) {
							for (let i: number = 0; i < this.barCount; i++) {
								this.channels[channel].bars[i] = bits.read(neededBits);
							}
						}
					}
					charIndex += subStringLength;
				} else if (command == SongTagCode.patterns) {
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
					while ((1 << neededInstrumentBits) < this.instrumentsPerChannel) neededInstrumentBits++;
					while (true) {
						const isDrum: boolean = this.getChannelIsDrum(channel);
						
						const octaveOffset: number = isDrum ? 0 : this.channels[channel].octave * 12;
						let note: Note | null = null;
						let pin: NotePin | null = null;
						let lastPitch: number = (isDrum ? 4 : 12) + octaveOffset;
						const recentPitches: number[] = isDrum ? [4,6,7,2,3,8,0,10] : [12, 19, 24, 31, 36, 7, 0];
						const recentShapes: any[] = [];
						for (let i: number = 0; i < recentPitches.length; i++) {
							recentPitches[i] += octaveOffset;
						}
						for (let i: number = 0; i < this.patternsPerChannel; i++) {
							const newPattern: Pattern = this.channels[channel].patterns[i];
							newPattern.reset();
							newPattern.instrument = bits.read(neededInstrumentBits);
							
							if (!beforeThree && bits.read(1) == 0) continue;
							
							let curPart: number = 0;
							const newNotes: Note[] = newPattern.notes;
							while (curPart < this.beatsPerBar * Config.partsPerBeat) {
								
								const useOldShape: boolean = bits.read(1) == 1;
								let newNote: boolean = false;
								let shapeIndex: number = 0;
								if (useOldShape) {
									shapeIndex = bits.readLongTail(0, 0);
								} else {
									newNote = bits.read(1) == 1;
								}
								
								if (!useOldShape && !newNote) {
									const restLength: number = beforeSeven
										? bits.readLegacyPartDuration() * Config.partsPerBeat / Config.rhythms[this.rhythm].stepsPerBeat
										: bits.readPartDuration();
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
											shape.length += beforeSeven
												? bits.readLegacyPartDuration() * Config.partsPerBeat / Config.rhythms[this.rhythm].stepsPerBeat
												: bits.readPartDuration();
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
						}
						
						if (beforeThree) {
							break;
						} else {
							channel++;
							if (channel >= this.getChannelCount()) break;
						}
					} // while (true)
				}
			}
		}
		
		public toJsonObject(enableIntro: boolean = true, loopCount: number = 1, enableOutro: boolean = true): Object {
			const channelArray: Object[] = [];
			for (let channel: number = 0; channel < this.getChannelCount(); channel++) {
				const instrumentArray: Object[] = [];
				const isDrum: boolean = this.getChannelIsDrum(channel);
				for (let i: number = 0; i < this.instrumentsPerChannel; i++) {
					instrumentArray.push(this.channels[channel].instruments[i].toJsonObject());
				}
				
				const patternArray: Object[] = [];
				for (const pattern of this.channels[channel].patterns) {
					const noteArray: Object[] = [];
					for (const note of pattern.notes) {
						const pointArray: Object[] = [];
						for (const pin of note.pins) {
							pointArray.push({
								tick: pin.time + note.start,
								pitchBend: pin.interval,
								volume: Math.round(pin.volume * 100 / 3),
							});
						}
						
						noteArray.push({
							pitches: note.pitches,
							points: pointArray,
						});
					}
					
					patternArray.push({
						instrument: pattern.instrument + 1,
						notes: noteArray, 
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
					type: isDrum ? "drum" : "pitch",
					octaveScrollBar: this.channels[channel].octave,
					instruments: instrumentArray,
					patterns: patternArray,
					sequence: sequenceArray,
				});
			}
			
			return {
				format: Song._format,
				version: Song._latestVersion,
				scale: Config.scales[this.scale].name,
				key: Config.keys[this.key].name,
				introBars: this.loopStart,
				loopBars: this.loopLength,
				beatsPerBar: this.beatsPerBar,
				rhythm: Config.rhythms[this.rhythm].stepsPerBeat,
				ticksPerBeat: Config.partsPerBeat,
				beatsPerMinute: this.getBeatsPerMinute(), // represents tempo
				reverb: this.reverb,
				//outroBars: this.barCount - this.loopStart - this.loopLength; // derive this from bar arrays?
				//patternCount: this.patternsPerChannel, // derive this from pattern arrays?
				//instrumentsPerChannel: this.instrumentsPerChannel, //derive this from instrument arrays?
				channels: channelArray,
			};
		}
		
		public fromJsonObject(jsonObject: any): void {
			this.initToDefault(true);
			if (!jsonObject) return;
			const version: number = jsonObject.version | 0;
			if (version > Song._latestVersion) return;
			
			this.scale = 11; // default to expert.
			if (jsonObject.scale != undefined) {
				const oldScaleNames: Dictionary<number> = {"romani :)": 8, "romani :(": 9};
				const scale: number = oldScaleNames[jsonObject.scale] != undefined ? oldScaleNames[jsonObject.scale] : Config.scales.findIndex(scale=>scale.name==jsonObject.scale);
				if (scale != -1) this.scale = scale;
			}
			
			if (jsonObject.key != undefined) {
				if (typeof(jsonObject.key) == "number") {
					this.key = ((jsonObject.key + 1200) >>> 0) % Config.keys.length;
				} else if (typeof(jsonObject.key) == "string") {
					const key: string = jsonObject.key;
					const letter: string = key.charAt(0).toUpperCase();
					const symbol: string = key.charAt(1).toLowerCase();
					const letterMap: Readonly<Dictionary<number>> = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11};
					const accidentalMap: Readonly<Dictionary<number>> = {"#": 1, "♯": 1, "b": -1, "♭": -1};
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
				this.tempo = clamp(0, Config.tempoSteps, this.tempo);
			}
			
			if (jsonObject.reverb != undefined) {
				this.reverb = clamp(0, Config.reverbRange, jsonObject.reverb | 0);
			}
			
			if (jsonObject.beatsPerBar != undefined) {
				this.beatsPerBar = Math.max(Config.beatsPerBarMin, Math.min(Config.beatsPerBarMax, jsonObject.beatsPerBar | 0));
			}
			
			let importedPartsPerBeat: number = Config.partsPerBeat;
			if (jsonObject.ticksPerBeat != undefined) {
				importedPartsPerBeat = (jsonObject.ticksPerBeat | 0) || Config.partsPerBeat;
				this.rhythm = Config.rhythms.findIndex(rhythm=>rhythm.stepsPerBeat==importedPartsPerBeat);
				if (this.rhythm == -1) {
					this.rhythm = 1;
				}
			}
			if (jsonObject.rhythm != undefined) {
				this.rhythm = Config.rhythms.findIndex(rhythm=>rhythm.stepsPerBeat==jsonObject.rhythm);
				if (this.rhythm == -1) {
					this.rhythm = 1;
				}
			}
			
			let maxInstruments: number = 1;
			let maxPatterns: number = 1;
			let maxBars: number = 1;
			if (jsonObject.channels) {
				for (const channelObject of jsonObject.channels) {
					if (channelObject.instruments) maxInstruments = Math.max(maxInstruments, channelObject.instruments.length | 0);
					if (channelObject.patterns) maxPatterns = Math.max(maxPatterns, channelObject.patterns.length | 0);
					if (channelObject.sequence) maxBars = Math.max(maxBars, channelObject.sequence.length | 0);
				}
			}
			
			this.instrumentsPerChannel = maxInstruments;
			this.patternsPerChannel = maxPatterns;
			this.barCount = maxBars;
			
			if (jsonObject.introBars != undefined) {
				this.loopStart = clamp(0, this.barCount, jsonObject.introBars | 0);
			}
			if (jsonObject.loopBars != undefined) {
				this.loopLength = clamp(1, this.barCount - this.loopStart + 1, jsonObject.loopBars | 0);
			}
			
			let pitchChannelCount = 0;
			let drumChannelCount = 0;
			if (jsonObject.channels) {
				for (let channel: number = 0; channel < jsonObject.channels.length; channel++) {
					let channelObject: any = jsonObject.channels[channel];
					
					if (this.channels.length <= channel) this.channels[channel] = new Channel();
					
					if (channelObject.octaveScrollBar != undefined) {
						this.channels[channel].octave = clamp(0, 5, channelObject.octaveScrollBar | 0);
					}
					
					for (let i: number = this.channels[channel].instruments.length; i < this.instrumentsPerChannel; i++) {
						this.channels[channel].instruments[i] = new Instrument();
					}
					this.channels[channel].instruments.length = this.instrumentsPerChannel;
					
					for (let i: number = this.channels[channel].patterns.length; i < this.patternsPerChannel; i++) {
						this.channels[channel].patterns[i] = new Pattern();
					}
					this.channels[channel].patterns.length = this.patternsPerChannel;
					
					for (let i: number = 0; i < this.barCount; i++) {
						this.channels[channel].bars[i] = 1;
					}
					this.channels[channel].bars.length = this.barCount;
					
					let isDrum: boolean = false;
					if (channelObject.type) {
						isDrum = (channelObject.type == "drum");
					} else {
						// for older files, assume drums are channel 3.
						isDrum = (channel >= 3);
					}
					if (isDrum) drumChannelCount++; else pitchChannelCount++;
					
					for (let i: number = 0; i < this.instrumentsPerChannel; i++) {
						const instrument: Instrument = this.channels[channel].instruments[i];
						instrument.fromJsonObject(channelObject.instruments[i], isDrum);
					}
					
					for (let i: number = 0; i < this.patternsPerChannel; i++) {
						const pattern: Pattern = this.channels[channel].patterns[i];
					
						let patternObject: any = undefined;
						if (channelObject.patterns) patternObject = channelObject.patterns[i];
						if (patternObject == undefined) continue;
					
						pattern.instrument = clamp(0, this.instrumentsPerChannel, (patternObject.instrument | 0) - 1);
					
						if (patternObject.notes && patternObject.notes.length > 0) {
							const maxNoteCount: number = Math.min(this.beatsPerBar * Config.partsPerBeat, patternObject.notes.length >>> 0);
						
							///@TODO: Consider supporting notes specified in any timing order, sorting them and truncating as necessary. 
							let tickClock: number = 0;
							for (let j: number = 0; j < patternObject.notes.length; j++) {
								if (j >= maxNoteCount) break;
							
								const noteObject = patternObject.notes[j];
								if (!noteObject || !noteObject.pitches || !(noteObject.pitches.length >= 1) || !noteObject.points || !(noteObject.points.length >= 2)) {
									continue;
								}
							
								const note: Note = makeNote(0, 0, 0, 0);
								note.pitches = [];
								note.pins = [];
							
								for (let k: number = 0; k < noteObject.pitches.length; k++) {
									const pitch: number = noteObject.pitches[k] | 0;
									if (note.pitches.indexOf(pitch) != -1) continue;
									note.pitches.push(pitch);
									if (note.pitches.length >= 4) break;
								}
								if (note.pitches.length < 1) continue;
							
								let noteClock: number = tickClock;
								let startInterval: number = 0;
								for (let k: number = 0; k < noteObject.points.length; k++) {
									const pointObject: any = noteObject.points[k];
									if (pointObject == undefined || pointObject.tick == undefined) continue;
									const interval: number = (pointObject.pitchBend == undefined) ? 0 : (pointObject.pitchBend | 0);
									
									const time: number = Math.round((pointObject.tick | 0) * Config.partsPerBeat / importedPartsPerBeat);
									
									const volume: number = (pointObject.volume == undefined) ? 3 : Math.max(0, Math.min(3, Math.round((pointObject.volume | 0) * 3 / 100)));
								
									if (time > this.beatsPerBar * Config.partsPerBeat) continue;
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
							
								const maxPitch: number = isDrum ? Config.drumCount - 1 : Config.maxPitch;
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
				
					for (let i: number = 0; i < this.barCount; i++) {
						this.channels[channel].bars[i] = channelObject.sequence ? Math.min(this.patternsPerChannel, channelObject.sequence[i] >>> 0) : 0;
					}
				}
			}
			
			this.pitchChannelCount = pitchChannelCount;
			this.drumChannelCount = drumChannelCount;
			this.channels.length = this.getChannelCount();
		}
		
		private static _clip(min: number, max: number, val: number): number {
			max = max - 1;
			if (val <= max) {
				if (val >= min) return val;
				else return min;
			} else {
				return max;
			}
		}
		
		public getPattern(channel: number, bar: number): Pattern | null {
			const patternIndex: number = this.channels[channel].bars[bar];
			if (patternIndex == 0) return null;
			return this.channels[channel].patterns[patternIndex - 1];
		}
		
		public getPatternInstrument(channel: number, bar: number): number {
			const pattern: Pattern | null = this.getPattern(channel, bar);
			return pattern == null ? 0 : pattern.instrument;
		}
		
		public getBeatsPerMinute(): number {
			return Math.round(120.0 * Math.pow(2.0, (-4.0 + this.tempo) / 9.0));
		}
	}
	
	class Tone {
		public instrument: Instrument;
		public readonly pitches: number[] = [0, 0, 0, 0];
		public pitchCount: number = 0;
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
		public sample: number = 0.0;
		public readonly phases: number[] = [];
		public readonly phaseDeltas: number[] = [];
		public readonly volumeStarts: number[] = [];
		public readonly volumeDeltas: number[] = [];
		public volumeStart: number = 0.0;
		public volumeDelta: number = 0.0;
		public phaseDeltaScale: number = 0.0;
		public filter: number = 0.0;
		public filterScale: number = 0.0;
		public filterSample0: number = 0.0;
		public filterSample1: number = 0.0;
		public vibratoScale: number = 0.0;
		public harmonyMult: number = 0.0;
		public harmonyVolumeMult: number = 1.0;
		public feedbackOutputs: number[] = [];
		public feedbackMult: number = 0.0;
		public feedbackDelta: number = 0.0;
		
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
		
		private static warmUpSynthesizer(song: Song | null): void {
			// Don't bother to generate the drum waves unless the song actually
			// uses them, since they may require a lot of computation.
			if (song != null) {
				for (let i: number = 0; i < song.instrumentsPerChannel; i++) {
					for (let j: number = song.pitchChannelCount; j < song.pitchChannelCount + song.drumChannelCount; j++) {
						Config.getDrumWave(song.channels[j].instruments[i].wave);
					}
					for (let j: number = 0; j < song.getChannelCount(); j++) {
						Synth.getInstrumentSynthFunction(song.channels[j].instruments[i]);
					}
				}
			}
		}
		
		private static operatorAmplitudeCurve(amplitude: number): number {
			return (Math.pow(16.0, amplitude / 15.0) - 1.0) / 15.0;
		}
		
		private static readonly negativePhaseGuard: number = 1000;
		
		public samplesPerSecond: number = 44100;
		private limitDecay: number = 1.0 / (2.0 * this.samplesPerSecond);
		
		public song: Song | null = null;
		public liveInputPressed: boolean = false;
		public liveInputPitches: number[] = [0];
		public liveInputChannel: number = 0;
		public enableIntro: boolean = true;
		public enableOutro: boolean = false;
		public loopCount: number = -1;
		public volume: number = 1.0;
		
		private playheadInternal: number = 0.0;
		private bar: number = 0;
		private beat: number = 0;
		private part: number = 0;
		private tick: number = 0;
		private tickSampleCountdown: number = 0;
		private paused: boolean = true;
		
		private readonly tonePool: Deque<Tone> = new Deque<Tone>();
		private readonly activeTones: Array<Deque<Tone>> = [];
		private readonly releasedTones: Array<Deque<Tone>> = [];
		private readonly liveInputTones: Deque<Tone> = new Deque<Tone>();
		
		private limit: number = 0.0;
		
		private samplesForChorus: Float32Array | null = null;
		private samplesForChorusReverb: Float32Array | null = null;
		private samplesForReverb: Float32Array | null = null;
		
		private chorusDelayLine: Float32Array = new Float32Array(1024);
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
			return !this.paused;
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
				if (this.bar < this.song.loopStart) {
					this.enableIntro = true;
				}
				if (this.bar > this.song.loopStart + this.song.loopLength) {
					this.enableOutro = true;
				}
			}
		}
		
		public get totalSamples(): number {
			if (this.song == null) return 0;
			const samplesPerBar: number = this.getSamplesPerTick() * Config.ticksPerPart * Config.partsPerBeat * this.song.beatsPerBar;
			let loopMinCount: number = this.loopCount;
			if (loopMinCount < 0) loopMinCount = 1;
			let bars: number = this.song.loopLength * loopMinCount;
			if (this.enableIntro) bars += this.song.loopStart;
			if (this.enableOutro) bars += this.song.barCount - (this.song.loopStart + this.song.loopLength);
			return bars * samplesPerBar;
		}
		
		public get totalSeconds(): number {
			return this.totalSamples / this.samplesPerSecond;
		}
		
		public get totalBars(): number {
			if (this.song == null) return 0.0;
			return this.song.barCount;
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
			if (!this.paused) return;
			this.paused = false;
			
			Synth.warmUpSynthesizer(this.song);
			
			const contextClass = (window.AudioContext || window.webkitAudioContext || window.mozAudioContext || window.oAudioContext || window.msAudioContext);
			this.audioCtx = this.audioCtx || new contextClass();
			this.scriptNode = this.audioCtx.createScriptProcessor ? this.audioCtx.createScriptProcessor(2048, 0, 1) : this.audioCtx.createJavaScriptNode(2048, 0, 1); // 2048, 0 input channels, 1 output
			this.scriptNode.onaudioprocess = this.audioProcessCallback;
			this.scriptNode.channelCountMode = 'explicit';
			this.scriptNode.channelInterpretation = 'speakers';
			this.scriptNode.connect(this.audioCtx.destination);
			
			this.samplesPerSecond = this.audioCtx.sampleRate;
			this.limitDecay = 1.0 / (2.0 * this.samplesPerSecond);
		}
		
		public pause(): void {
			if (this.paused) return;
			this.paused = true;
			this.scriptNode.disconnect(this.audioCtx.destination);
			if (this.audioCtx.close) {
				this.audioCtx.close(); // firefox is missing this function?
			}
			this.audioCtx = null;
			this.scriptNode = null;
		}
		
		public snapToStart(): void {
			this.bar = 0;
			this.enableIntro = true;
			this.snapToBar();
		}
		
		public snapToBar(bar?: number): void {
			if (bar !== undefined) this.bar = bar;
			this.playheadInternal = this.bar;
			this.beat = 0;
			this.part = 0;
			this.tick = 0;
			this.tickSampleCountdown = 0;
			this.reverbDelayPos = 0;
			this.reverbFeedback0 = 0.0;
			this.reverbFeedback1 = 0.0;
			this.reverbFeedback2 = 0.0;
			this.reverbFeedback3 = 0.0;
			this.freeAllTones();
			for (let i: number = 0; i < this.reverbDelayLine.length; i++) this.reverbDelayLine[i] = 0.0;
			for (let i: number = 0; i < this.chorusDelayLine.length; i++) this.chorusDelayLine[i] = 0.0;
		}
		
		public nextBar(): void {
			if (!this.song) return;
			const oldBar: number = this.bar;
			this.bar++;
			if (this.enableOutro) {
				if (this.bar >= this.song.barCount) {
					this.bar = this.enableIntro ? 0 : this.song.loopStart;
				}
			} else {
				if (this.bar >= this.song.loopStart + this.song.loopLength || this.bar >= this.song.barCount) {
					this.bar = this.song.loopStart;
				}
 			}
			this.playheadInternal += this.bar - oldBar;
		}
		
		public prevBar(): void {
			if (!this.song) return;
			const oldBar: number = this.bar;
			this.bar--;
			if (this.bar < 0) {
				this.bar = this.song.loopStart + this.song.loopLength - 1;
			}
			if (this.bar >= this.song.barCount) {
				this.bar = this.song.barCount - 1;
			}
			if (this.bar < this.song.loopStart) {
				this.enableIntro = true;
			}
			if (!this.enableOutro && this.bar >= this.song.loopStart + this.song.loopLength) {
				this.bar = this.song.loopStart + this.song.loopLength - 1;
			}
			this.playheadInternal += this.bar - oldBar;
		}
		
		private audioProcessCallback = (audioProcessingEvent: any): void => {
			const outputBuffer = audioProcessingEvent.outputBuffer;
			const outputData: Float32Array = outputBuffer.getChannelData(0);
			if (this.paused) {
				for (let i: number = 0; i < outputBuffer.length; i++) outputData[i] = 0.0;
			} else {
				this.synthesize(outputData, outputBuffer.length);
			}
		}
		
		public synthesize(data: Float32Array, bufferLength: number): void {
			if (this.song == null) {
				for (let i: number = 0; i < bufferLength; i++) data[i] = 0.0;
				return;
			}
			
			const channelCount: number = this.song.getChannelCount();
			for (let i: number = this.activeTones.length; i < channelCount; i++) {
				this.activeTones[i] = new Deque<Tone>();
				this.releasedTones[i] = new Deque<Tone>();
			}
			this.activeTones.length = channelCount;
			this.releasedTones.length = channelCount;
			
			const samplesPerTick: number = this.getSamplesPerTick();
			let bufferIndex: number = 0;
			let ended: boolean = false;
			
			// Check the bounds of the playhead:
			if (this.tickSampleCountdown == 0 || this.tickSampleCountdown > samplesPerTick) {
				this.tickSampleCountdown = samplesPerTick;
			}
			if (this.beat >= this.song.beatsPerBar) {
				this.bar++;
				this.beat = 0;
				this.part = 0;
				this.tick = 0;
				this.tickSampleCountdown = samplesPerTick;
				
				if (this.loopCount == -1) {
					if (this.bar < this.song.loopStart && !this.enableIntro) this.bar = this.song.loopStart;
					if (this.bar >= this.song.loopStart + this.song.loopLength && !this.enableOutro) this.bar = this.song.loopStart;
				}
			}
			if (this.bar >= this.song.barCount) {
				if (this.enableOutro) {
					this.bar = 0;
					this.enableIntro = true;
					ended = true;
					this.pause();
				} else {
					this.bar = this.song.loopStart;
				}
 			}
			if (this.bar >= this.song.loopStart) {
				this.enableIntro = false;
			}
			
			const synthStartTime: number = performance.now();
			
			if (this.samplesForChorus == null || this.samplesForChorus.length < bufferLength) {
				this.samplesForChorus = new Float32Array(bufferLength);
			}
			if (this.samplesForChorusReverb == null || this.samplesForChorusReverb.length < bufferLength) {
				this.samplesForChorusReverb = new Float32Array(bufferLength);
			}
			if (this.samplesForReverb == null || this.samplesForReverb.length < bufferLength) {
				this.samplesForReverb = new Float32Array(bufferLength);
			}
			const samplesForChorus: Float32Array = this.samplesForChorus;
			const samplesForChorusReverb: Float32Array = this.samplesForChorusReverb;
			const samplesForReverb: Float32Array = this.samplesForReverb;

			// Fill output data with zeroes using a partially unrolled loop before instruments accumulate sample values, since it's not guaranteed to be initialized to zeroes.
			for (let i: number = 0; i < bufferLength;) {
				data[i++] = 0.0; data[i++] = 0.0; data[i++] = 0.0; data[i++] = 0.0;
				data[i++] = 0.0; data[i++] = 0.0; data[i++] = 0.0; data[i++] = 0.0;
			}
			
			// Post processing parameters:
			const volume: number = +this.volume;
			const chorusDelayLine: Float32Array = this.chorusDelayLine;
			const reverbDelayLine: Float32Array = this.reverbDelayLine;
			const chorusDuration: number = 2.0;
			const chorusAngle: number = Math.PI * 2.0 / (chorusDuration * this.samplesPerSecond);
			const chorusRange: number = 150 * this.samplesPerSecond / 44100;
			const chorusOffset0: number = 0x400 - 1.51 * chorusRange;
			const chorusOffset1: number = 0x400 - 2.10 * chorusRange;
			const chorusOffset2: number = 0x400 - 3.35 * chorusRange;
			let chorusPhase: number = this.chorusPhase % (Math.PI * 2.0);
			let chorusDelayPos: number = this.chorusDelayPos & 0x3FF;
			let reverbDelayPos: number = this.reverbDelayPos & 0x3FFF;
			let reverbFeedback0: number = +this.reverbFeedback0;
			let reverbFeedback1: number = +this.reverbFeedback1;
			let reverbFeedback2: number = +this.reverbFeedback2;
			let reverbFeedback3: number = +this.reverbFeedback3;
			const reverb: number = Math.pow(this.song.reverb / Config.reverbRange, 0.667) * 0.425;
			const limitDecay: number = +this.limitDecay;
			let limit: number = +this.limit;
			
			const synthBufferByEffects: Float32Array[] = [data, samplesForReverb, samplesForChorus, samplesForChorusReverb];
			while (bufferIndex < bufferLength && !ended) {
				
				while (bufferIndex < bufferLength) {
			
					const samplesLeftInBuffer: number = bufferLength - bufferIndex;
					const runLength: number = (this.tickSampleCountdown <= samplesLeftInBuffer)
						? this.tickSampleCountdown
						: samplesLeftInBuffer;
					for (let channel: number = 0; channel < this.song.getChannelCount(); channel++) {

						if (channel == this.liveInputChannel) {
							this.determineLiveInputTones(this.song);

							for (let i: number = 0; i < this.liveInputTones.count(); i++) {
								const tone: Tone = this.liveInputTones.get(i);
								this.playTone(this.song, bufferIndex, synthBufferByEffects, channel, samplesPerTick, runLength, tone, false, false);
							}
						}

						this.determineCurrentActiveTones(this.song, channel);
						for (let i: number = 0; i < this.activeTones[channel].count(); i++) {
							const tone: Tone = this.activeTones[channel].get(i);
							this.playTone(this.song, bufferIndex, synthBufferByEffects, channel, samplesPerTick, runLength, tone, false, false);
						}
						for (let i: number = 0; i < this.releasedTones[channel].count(); i++) {
							const tone: Tone = this.releasedTones[channel].get(i);
							if (tone.ticksSinceReleased >= Config.transitions[tone.instrument.transition].releaseTicks) {
								this.freeReleasedTone(channel, i);
								i--;
								continue;
							}

							const shouldFadeOutFast: boolean = (i + this.activeTones[channel].count() >= Config.maximumTonesPerChannel);

							this.playTone(this.song, bufferIndex, synthBufferByEffects, channel, samplesPerTick, runLength, tone, true, shouldFadeOutFast);
						}
					}

					// Post processing:
					const chorusYMult: number = 2.0 * Math.cos(chorusAngle);
					let chorusTap0Index: number = chorusDelayPos + chorusOffset0 - chorusRange * Math.sin(chorusPhase + 0);
					let chorusTap1Index: number = chorusDelayPos + chorusOffset1 - chorusRange * Math.sin(chorusPhase + 2.1);
					let chorusTap2Index: number = chorusDelayPos + chorusOffset2 - chorusRange * Math.sin(chorusPhase + 4.2);
					chorusPhase += chorusAngle * runLength;
					const chorusTap0End: number = chorusDelayPos + runLength + chorusOffset0 - chorusRange * Math.sin(chorusPhase + 0);
					const chorusTap1End: number = chorusDelayPos + runLength + chorusOffset1 - chorusRange * Math.sin(chorusPhase + 2.1);
					const chorusTap2End: number = chorusDelayPos + runLength + chorusOffset2 - chorusRange * Math.sin(chorusPhase + 4.2);
					const chorusTap0Delta: number = (chorusTap0End - chorusTap0Index) / runLength;
					const chorusTap1Delta: number = (chorusTap1End - chorusTap1Index) / runLength;
					const chorusTap2Delta: number = (chorusTap2End - chorusTap2Index) / runLength;
					const runEnd: number = bufferIndex + runLength;
					for (let i: number = bufferIndex; i < runEnd; i++) {
						const sampleForChorus: number = samplesForChorus[i];
						samplesForChorus[i] = 0.0;
						const sampleForChorusReverb: number = samplesForChorusReverb[i];
						samplesForChorusReverb[i] = 0.0;
						const sampleForReverb: number = samplesForReverb[i];
						samplesForReverb[i] = 0.0;
						const combinedChorus: number = sampleForChorus + sampleForChorusReverb;
						
						const chorusTap0Ratio: number = chorusTap0Index % 1;
						const chorusTap1Ratio: number = chorusTap1Index % 1;
						const chorusTap2Ratio: number = chorusTap2Index % 1;
						const chorusTap0A: number = chorusDelayLine[(chorusTap0Index) & 0x3FF];
						const chorusTap0B: number = chorusDelayLine[(chorusTap0Index + 1) & 0x3FF];
						const chorusTap1A: number = chorusDelayLine[(chorusTap1Index) & 0x3FF];
						const chorusTap1B: number = chorusDelayLine[(chorusTap1Index + 1) & 0x3FF];
						const chorusTap2A: number = chorusDelayLine[(chorusTap2Index) & 0x3FF];
						const chorusTap2B: number = chorusDelayLine[(chorusTap2Index + 1) & 0x3FF];
						const chorusTap0: number = chorusTap0A + (chorusTap0B - chorusTap0A) * chorusTap0Ratio;
						const chorusTap1: number = chorusTap1A + (chorusTap1B - chorusTap1A) * chorusTap1Ratio;
						const chorusTap2: number = chorusTap2A + (chorusTap2B - chorusTap2A) * chorusTap2Ratio;
						const chorusSample = 0.5 * (combinedChorus - chorusTap0 + chorusTap1 - chorusTap2);
						chorusDelayLine[chorusDelayPos] = combinedChorus;
						chorusDelayPos = (chorusDelayPos + 1) & 0x3FF;
						chorusTap0Index += chorusTap0Delta;
						chorusTap1Index += chorusTap1Delta;
						chorusTap2Index += chorusTap2Delta;
						
						// Reverb, implemented using a feedback delay network with a Hadamard matrix and lowpass filters.
						// good ratios:    0.555235 + 0.618033 + 0.818 +   1.0 = 2.991268
						// Delay lengths:  3041     + 3385     + 4481  +  5477 = 16384 = 2^14
						// Buffer offsets: 3041    -> 6426   -> 10907 -> 16384
						const reverbDelayPos1: number = (reverbDelayPos +  3041) & 0x3FFF;
						const reverbDelayPos2: number = (reverbDelayPos +  6426) & 0x3FFF;
						const reverbDelayPos3: number = (reverbDelayPos + 10907) & 0x3FFF;
						const reverbSample0: number = (reverbDelayLine[reverbDelayPos] + sampleForReverb);
						const reverbSample1: number = reverbDelayLine[reverbDelayPos1];
						const reverbSample2: number = reverbDelayLine[reverbDelayPos2];
						const reverbSample3: number = reverbDelayLine[reverbDelayPos3];
						const reverbSample0Chorus: number = reverbSample0 + sampleForChorusReverb;
						const reverbTemp0: number = -reverbSample0Chorus + reverbSample1;
						const reverbTemp1: number = -reverbSample0Chorus - reverbSample1;
						const reverbTemp2: number = -reverbSample2 + reverbSample3;
						const reverbTemp3: number = -reverbSample2 - reverbSample3;
						reverbFeedback0 += ((reverbTemp0 + reverbTemp2) * reverb - reverbFeedback0) * 0.5;
						reverbFeedback1 += ((reverbTemp1 + reverbTemp3) * reverb - reverbFeedback1) * 0.5;
						reverbFeedback2 += ((reverbTemp0 - reverbTemp2) * reverb - reverbFeedback2) * 0.5;
						reverbFeedback3 += ((reverbTemp1 - reverbTemp3) * reverb - reverbFeedback3) * 0.5;
						reverbDelayLine[reverbDelayPos1] = reverbFeedback0;
						reverbDelayLine[reverbDelayPos2] = reverbFeedback1;
						reverbDelayLine[reverbDelayPos3] = reverbFeedback2;
						reverbDelayLine[reverbDelayPos ] = reverbFeedback3;
						reverbDelayPos = (reverbDelayPos + 1) & 0x3FFF;
						
						const sample = data[i] + chorusSample + reverbSample0 + reverbSample1 + reverbSample2 + reverbSample3;
						
						const abs: number = sample < 0.0 ? -sample : sample;
						if (limit < abs) limit = abs;
						data[i] = (sample / (limit * 0.75 + 0.25)) * volume;
						limit -= limitDecay;
					}

					bufferIndex += runLength;
					
					this.tickSampleCountdown -= runLength;
					if (this.tickSampleCountdown <= 0) {
						
						// Track how long tones have been released, and free them if there are too many.
						for (let channel: number = 0; channel < this.song.getChannelCount(); channel++) {
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
							
							// Check if any active tones should be released.
							for (let channel: number = 0; channel < this.song.getChannelCount(); channel++) {
								for (let i: number = 0; i < this.activeTones[channel].count(); i++) {
									const tone: Tone = this.activeTones[channel].get(i);
									if (!Config.transitions[tone.instrument.transition].isSeamless && tone.note != null && tone.note.end == this.part + this.beat * Config.partsPerBeat) {
										if (Config.transitions[tone.instrument.transition].releases) {
											this.releaseTone(channel, tone);
										} else {
											this.freeTone(tone);
										}
										this.activeTones[channel].remove(i);
										i--;
									}
								}
							}
							
							if (this.part == Config.partsPerBeat) {
								this.part = 0;
								this.beat++;
								if (this.beat == this.song.beatsPerBar) {
									// bar changed, reset for next bar:
									this.beat = 0;
									this.bar++;
									if (this.bar < this.song.loopStart) {
										if (!this.enableIntro) this.bar = this.song.loopStart;
									} else {
										this.enableIntro = false;
									}
									if (this.bar >= this.song.loopStart + this.song.loopLength) {
										if (this.loopCount > 0) this.loopCount--;
										if (this.loopCount > 0 || !this.enableOutro) {
											this.bar = this.song.loopStart;
										}
									}
									if (this.bar >= this.song.barCount) {
										this.bar = 0;
										this.enableIntro = true;
										ended = true;
										this.pause();
									}
									
									// When bar ends, may need to generate new synthesizer:
									break;
								}
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

			this.chorusPhase = chorusPhase;
			this.chorusDelayPos = chorusDelayPos;
			this.reverbDelayPos = reverbDelayPos;
			this.reverbFeedback0 = reverbFeedback0;
			this.reverbFeedback1 = reverbFeedback1;
			this.reverbFeedback2 = reverbFeedback2;
			this.reverbFeedback3 = reverbFeedback3;
			this.limit = limit;
			
			this.playheadInternal = (((this.tick + 1.0 - this.tickSampleCountdown / samplesPerTick) / 2.0 + this.part) / Config.partsPerBeat + this.beat) / this.song.beatsPerBar + this.bar;
			
			const synthDuration: number = performance.now() - synthStartTime;
			/*
			// Performance measurements:
			samplesAccumulated += bufferLength;
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
			this.releasedTones[channel].pushFront(tone);
		}
		
		private freeReleasedTone(channel: number, toneIndex: number): void {
			this.freeTone(this.releasedTones[channel].get(toneIndex));
			this.releasedTones[channel].remove(toneIndex);
		}

		public freeAllTones(): void {
			while (this.liveInputTones.count() > 0) {
				this.freeTone(this.liveInputTones.popBack());
			}
			for (let i = 0; i < this.activeTones.length; i++) {
				while (this.activeTones[i].count() > 0) {
					this.freeTone(this.activeTones[i].popBack());
				}
			}
			for (let i = 0; i < this.releasedTones.length; i++) {
				while (this.releasedTones[i].count() > 0) {
					this.freeTone(this.releasedTones[i].popBack());
				}
			}
		}

		private determineLiveInputTones(song: Song): void {
			if (this.liveInputPressed) {
				const instrument: Instrument = song.channels[this.liveInputChannel].instruments[song.getPatternInstrument(this.liveInputChannel, this.bar)];
				
				let tone: Tone;
				if (this.liveInputTones.count() == 0) {
					tone = this.newTone();
					this.liveInputTones.pushBack(tone);
				} else if (!Config.transitions[instrument.transition].isSeamless && this.liveInputTones.peakFront().pitches[0] != this.liveInputPitches[0]) {
					// pitches[0] changed, start a new tone.
					this.releaseTone(this.liveInputChannel, this.liveInputTones.popFront());
					tone = this.newTone();
					this.liveInputTones.pushBack(tone);
				} else {
					tone = this.liveInputTones.get(0);
				}
				
				for (let i: number = 0; i < this.liveInputPitches.length; i++) {
					tone.pitches[i] = this.liveInputPitches[i];
				}
				tone.pitchCount = this.liveInputPitches.length;
				tone.instrument = instrument;
				tone.note = tone.prevNote = tone.nextNote = null;
			} else {
				while (this.liveInputTones.count() > 0) {
					this.releaseTone(this.liveInputChannel, this.liveInputTones.popBack());
				}
			}
		}
		
		private determineCurrentActiveTones(song: Song, channel: number): void {
			const instrument: Instrument = song.channels[channel].instruments[song.getPatternInstrument(channel, this.bar)];
			const pattern: Pattern | null = song.getPattern(channel, this.bar);
			const time: number = this.part + this.beat * Config.partsPerBeat;
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

			const toneList: Deque<Tone> = this.activeTones[channel];
			if (note != null) {
				if (prevNote != null && prevNote.end != note.start) prevNote = null;
				if (nextNote != null && nextNote.start != note.end) nextNote = null;
				this.syncTones(channel, toneList, instrument, note.pitches, note, prevNote, nextNote, time);
			} else {
				while (toneList.count() > 0) {
					// Automatically free or release seamless tones if there's no new note to take over.
					if (Config.transitions[toneList.peakBack().instrument.transition].releases) {
						this.releaseTone(channel, toneList.popBack());
					} else {
						this.freeTone(toneList.popBack());
					}
				}
			}
		}

		private syncTones(channel: number, toneList: Deque<Tone>, instrument: Instrument, pitches: number[], note: Note, prevNote: Note | null, nextNote: Note | null, currentPart: number): void {
			let toneCount: number = 0;
			if (Config.chords[instrument.chord].arpeggiates) {
				let tone: Tone;
				if (toneList.count() == 0) {
					tone = this.newTone();
					toneList.pushBack(tone);
				} else {
					tone = toneList.get(0);
				}
				toneCount = 1;

				for (let i = 0; i < pitches.length; i++) {
					tone.pitches[i] = pitches[i];
				}
				tone.pitchCount = pitches.length;
				tone.instrument = instrument;
				tone.note = note;
				tone.noteStart = note.start;
				tone.noteEnd = note.end;
				tone.prevNote = prevNote;
				tone.nextNote = nextNote;
				tone.prevNotePitchIndex = 0;
				tone.nextNotePitchIndex = 0;
			} else {
				for (let i: number = 0; i < pitches.length; i++) {

					const strumOffsetParts: number = i * Config.chords[instrument.chord].strumParts;
					let prevNoteForThisTone: Note | null = (prevNote && prevNote.pitches.length > i) ? prevNote : null;
					let noteForThisTone: Note = note;
					let nextNoteForThisTone: Note | null = (nextNote && nextNote.pitches.length > i) ? nextNote : null;
					let noteStart: number = noteForThisTone.start + strumOffsetParts;

					if (noteStart > currentPart) {
						if (toneList.count() > i && Config.transitions[instrument.transition].isSeamless && prevNoteForThisTone != null) {
							nextNoteForThisTone = noteForThisTone;
							noteForThisTone = prevNoteForThisTone;
							prevNoteForThisTone = null;
							noteStart = noteForThisTone.start + strumOffsetParts;
						} else {
							break;
						}
					}

					let noteEnd: number = noteForThisTone.end;
					if (Config.transitions[instrument.transition].isSeamless && nextNoteForThisTone != null) {
						noteEnd = Math.min(Config.partsPerBeat * this.song!.beatsPerBar, noteEnd + strumOffsetParts);
					}

					let tone: Tone;
					if (toneList.count() > i) {
						tone = toneList.get(i);
					} else {
						tone = this.newTone();
						toneList.pushBack(tone);
					}
					toneCount++;

					tone.pitches[0] = noteForThisTone.pitches[i];
					tone.pitchCount = 1;
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
				if (Config.transitions[toneList.peakBack().instrument.transition].releases) {
					this.releaseTone(channel, toneList.popBack());
				} else {
					this.freeTone(toneList.popBack());
				}
			}
		}

		private playTone(song: Song, bufferIndex: number, synthBufferByEffects: Float32Array[], channel: number, samplesPerTick: number, runLength: number, tone: Tone, released: boolean, shouldFadeOutFast: boolean): void {
			Synth.computeTone(this, song, channel, samplesPerTick, runLength, tone, released, shouldFadeOutFast);
			const synthBuffer: Float32Array = synthBufferByEffects[tone.instrument.effects];
			const synthesizer: Function = Synth.getInstrumentSynthFunction(tone.instrument);
			synthesizer(this, synthBuffer, bufferIndex, runLength, tone, tone.instrument);
		}
		
		private static computeOperatorEnvelope(envelope: number, time: number, beats: number, customVolume: number): number {
			switch(Config.envelopes[envelope].type) {
				case EnvelopeType.custom: return customVolume;
				case EnvelopeType.steady: return 1.0;
				case EnvelopeType.pluck:
					let curve: number = 1.0 / (1.0 + time * Config.envelopes[envelope].speed);
					if (Config.envelopes[envelope].inverted) {
						return 1.0 - curve;
					} else {
						return curve;
					}
				case EnvelopeType.tremolo: 
					return 0.5 - Math.cos(beats * 2.0 * Math.PI * Config.envelopes[envelope].speed) * 0.5;
				case EnvelopeType.tremolo2: 
					return 0.75 - Math.cos(beats * 2.0 * Math.PI * Config.envelopes[envelope].speed) * 0.25;
				case EnvelopeType.punch: 
					return Math.max(1.0, 2.0 - time * 10.0);
				case EnvelopeType.flare:
					const speed: number = Config.envelopes[envelope].speed;
					const attack: number = 0.25 / Math.sqrt(speed);
					return time < attack ? time / attack : 1.0 / (1.0 + (time - attack) * speed);
				case EnvelopeType.decay:
					return Math.pow(2, -Config.envelopes[envelope].speed * time);
				default: throw new Error("Unrecognized operator envelope type.");
			}
		}
		
		private static computeTone(synth: Synth, song: Song, channel: number, samplesPerTick: number, runLength: number, tone: Tone, released: boolean, shouldFadeOutFast: boolean): void {
			const instrument: Instrument = tone.instrument;
			const transition: number = instrument.transition;
			const isDrum: boolean = song.getChannelIsDrum(channel);
			const basePitch: number = isDrum ? Config.noiseWaves[instrument.wave].basePitch : Config.keys[song.key].basePitch;
			const intervalScale: number = isDrum ? Config.drumInterval : 1;
			const pitchDamping: number = isDrum ? (Config.noiseWaves[instrument.wave].isSoft ? 24.0 : 60.0) : 48.0;
			const secondsPerPart: number = Config.ticksPerPart * samplesPerTick / synth.samplesPerSecond;
			const beatsPerPart: number = 1.0 / Config.partsPerBeat;
			const toneWasActive: boolean = tone.active;
			const tickSampleCountdown: number = synth.tickSampleCountdown;
			const startRatio: number = 1.0 - (tickSampleCountdown            ) / samplesPerTick;
			const endRatio:   number = 1.0 - (tickSampleCountdown - runLength) / samplesPerTick;
			const ticksIntoBar: number = (synth.beat * Config.partsPerBeat + synth.part) * Config.ticksPerPart + synth.tick;
			const partTimeTickStart: number = (ticksIntoBar    ) / Config.ticksPerPart;
			const partTimeTickEnd:   number = (ticksIntoBar + 1) / Config.ticksPerPart;
			const partTimeStart: number = partTimeTickStart + (partTimeTickEnd - partTimeTickStart) * startRatio;
			const partTimeEnd: number   = partTimeTickStart + (partTimeTickEnd - partTimeTickStart) * endRatio;
			
			tone.phaseDeltaScale = 0.0;
			tone.filter = 1.0;
			tone.filterScale = 1.0;
			tone.vibratoScale = 0.0;
			tone.harmonyMult = 1.0;
			tone.harmonyVolumeMult = 1.0;
			tone.active = false;
			
			let resetPhases: boolean = true;
			let partsSinceStart: number = 0.0;
			let intervalStart: number = 0.0;
			let intervalEnd: number = 0.0;
			let transitionVolumeStart: number = 1.0;
			let transitionVolumeEnd: number = 1.0;
			let customVolumeStart: number = 0.0;
			let customVolumeEnd: number = 0.0;
			let decayTimeStart: number = 0.0;
			let decayTimeEnd:   number = 0.0;
			
			for (let i: number = 0; i < Config.operatorCount; i++) {
				tone.phaseDeltas[i] = 0.0;
				tone.volumeStarts[i] = 0.0;
				tone.volumeDeltas[i] = 0.0;
			}

			if (released) {
				const ticksSoFar: number = tone.noteLengthTicks + tone.ticksSinceReleased;
				const startTicksSinceReleased: number = tone.ticksSinceReleased + startRatio;
				const endTicksSinceReleased:   number = tone.ticksSinceReleased + endRatio;
				const startTick: number = tone.noteLengthTicks + startTicksSinceReleased;
				const endTick:   number = tone.noteLengthTicks + endTicksSinceReleased;
				resetPhases = false;
				partsSinceStart = Math.floor(ticksSoFar / Config.ticksPerPart);
				intervalStart = tone.lastInterval;
				intervalEnd   = tone.lastInterval;
				customVolumeStart = synth.volumeConversion(tone.lastVolume);
				customVolumeEnd   = synth.volumeConversion(tone.lastVolume);
				transitionVolumeStart = synth.volumeConversion((1.0 - startTicksSinceReleased / Config.transitions[tone.instrument.transition].releaseTicks) * 3.0);
				transitionVolumeEnd   = synth.volumeConversion((1.0 - endTicksSinceReleased / Config.transitions[tone.instrument.transition].releaseTicks) * 3.0);
				decayTimeStart = startTick / Config.ticksPerPart;
				decayTimeEnd   = endTick / Config.ticksPerPart;

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
				decayTimeEnd   = heldPartsEnd;
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
				const startPin: NotePin = note.pins[endPinIndex-1];
				const endPin: NotePin = note.pins[endPinIndex];
				const noteStartTick: number = noteStart * Config.ticksPerPart;
				const noteEndTick:   number = noteEnd   * Config.ticksPerPart;
				const noteLengthTicks: number = noteEndTick - noteStartTick;
				const pinStart: number  = (note.start + startPin.time) * Config.ticksPerPart;
				const pinEnd:   number  = (note.start +   endPin.time) * Config.ticksPerPart;
				
				tone.lastInterval = note.pins[note.pins.length - 1].interval;
				tone.lastVolume = note.pins[note.pins.length - 1].volume;
				tone.ticksSinceReleased = 0;
				tone.noteLengthTicks = noteLengthTicks;
				
				const tickTimeStart: number = time * Config.ticksPerPart + synth.tick;
				const tickTimeEnd:   number = time * Config.ticksPerPart + synth.tick + 1;
				const noteTicksPassedTickStart: number = tickTimeStart - noteStartTick;
				const noteTicksPassedTickEnd: number = tickTimeEnd - noteStartTick;
				const pinRatioStart: number = Math.min(1.0, (tickTimeStart - pinStart) / (pinEnd - pinStart));
				const pinRatioEnd:   number = Math.min(1.0, (tickTimeEnd   - pinStart) / (pinEnd - pinStart));
				let customVolumeTickStart: number = startPin.volume + (endPin.volume - startPin.volume) * pinRatioStart;
				let customVolumeTickEnd:   number = startPin.volume + (endPin.volume - startPin.volume) * pinRatioEnd;
				let transitionVolumeTickStart: number = 1.0;
				let transitionVolumeTickEnd:   number = 1.0;
				let intervalTickStart: number = startPin.interval + (endPin.interval - startPin.interval) * pinRatioStart;
				let intervalTickEnd:   number = startPin.interval + (endPin.interval - startPin.interval) * pinRatioEnd;
				let decayTimeTickStart: number = partTimeTickStart - noteStart;
				let decayTimeTickEnd:   number = partTimeTickEnd - noteStart;
				
				resetPhases = (tickTimeStart + startRatio - noteStartTick == 0.0) || !toneWasActive;
				
				// if seamless, don't reset phases at start. (it's probably not necessary to constantly reset phases if there are no notes? Just do it once when note starts? But make sure that reset phases doesn't also reset stuff that this function did to set up the tone. Remember when the first run length was lost!
				// if slide, average the interval, decayTime, and custom volume at the endpoints and interpolate between over slide duration.
				// note that currently seamless and slide make different assumptions about whether a note at the end of a bar will connect with the next bar!
				const maximumSlideTicks: number = noteLengthTicks * 0.5;
				if (Config.transitions[transition].isSeamless && !Config.transitions[transition].slides && note.start == 0) {
					// Special case for seamless, no-slide transition: assume the previous bar ends with another seamless note, don't reset tone history.
					resetPhases = !toneWasActive;
				} else if (Config.transitions[transition].isSeamless && prevNote != null) {
					resetPhases = !toneWasActive;
					if (Config.transitions[transition].slides) {
						const slideTicks: number = Math.min(maximumSlideTicks, Config.transitions[transition].slideTicks);
						const slideRatioStartTick: number = Math.max(0.0, 1.0 - noteTicksPassedTickStart / slideTicks);
						const slideRatioEndTick:   number = Math.max(0.0, 1.0 - noteTicksPassedTickEnd / slideTicks);
						const intervalDiff: number = ((prevNote.pitches[tone.prevNotePitchIndex] + prevNote.pins[prevNote.pins.length-1].interval) - tone.pitches[0]) * 0.5;
						const volumeDiff: number = (prevNote.pins[prevNote.pins.length-1].volume - note.pins[0].volume) * 0.5;
						const decayTimeDiff: number = (prevNote.end - prevNote.start) * 0.5;
						intervalTickStart += slideRatioStartTick * intervalDiff;
						intervalTickEnd += slideRatioEndTick * intervalDiff;
						customVolumeTickStart += slideRatioStartTick * volumeDiff;
						customVolumeTickEnd += slideRatioEndTick * volumeDiff;
						decayTimeTickStart += slideRatioStartTick * decayTimeDiff;
						decayTimeTickEnd += slideRatioEndTick * decayTimeDiff;
					}
				}
				if (Config.transitions[transition].isSeamless && !Config.transitions[transition].slides && note.end == partsPerBar) {
					// Special case for seamless, no-slide transition: assume the next bar starts with another seamless note, don't fade out.
				} else if (Config.transitions[transition].isSeamless && nextNote != null) {
					if (Config.transitions[transition].slides) {
						const slideTicks: number = Math.min(maximumSlideTicks, Config.transitions[transition].slideTicks);
						const slideRatioStartTick: number = Math.max(0.0, 1.0 - (noteLengthTicks - noteTicksPassedTickStart) / slideTicks);
						const slideRatioEndTick:   number = Math.max(0.0, 1.0 - (noteLengthTicks - noteTicksPassedTickEnd) / slideTicks);
						const intervalDiff: number = (nextNote.pitches[tone.nextNotePitchIndex] - (tone.pitches[0] + note.pins[note.pins.length-1].interval)) * 0.5;
						const volumeDiff: number = (nextNote.pins[0].volume - note.pins[note.pins.length-1].volume) * 0.5;
						const decayTimeDiff: number = -(noteEnd - noteStart) * 0.5;
						intervalTickStart += slideRatioStartTick * intervalDiff;
						intervalTickEnd += slideRatioEndTick * intervalDiff;
						customVolumeTickStart += slideRatioStartTick * volumeDiff;
						customVolumeTickEnd += slideRatioEndTick * volumeDiff;
						decayTimeTickStart += slideRatioStartTick * decayTimeDiff;
						decayTimeTickEnd += slideRatioEndTick * decayTimeDiff;
					}
				} else if (!Config.transitions[transition].releases) {
					const releaseTicks: number = Config.transitions[transition].releaseTicks;
					if (releaseTicks > 0.0) {
						transitionVolumeTickStart *= Math.min(1.0, (noteLengthTicks - noteTicksPassedTickStart) / releaseTicks);
						transitionVolumeTickEnd   *= Math.min(1.0, (noteLengthTicks - noteTicksPassedTickEnd) / releaseTicks);
					}
				}
				
				intervalStart = intervalTickStart + (intervalTickEnd - intervalTickStart) * startRatio;
				intervalEnd   = intervalTickStart + (intervalTickEnd - intervalTickStart) * endRatio;
				customVolumeStart = synth.volumeConversion(customVolumeTickStart + (customVolumeTickEnd - customVolumeTickStart) * startRatio);
				customVolumeEnd   = synth.volumeConversion(customVolumeTickStart + (customVolumeTickEnd - customVolumeTickStart) * endRatio);
				transitionVolumeStart = transitionVolumeTickStart + (transitionVolumeTickEnd - transitionVolumeTickStart) * startRatio;
				transitionVolumeEnd   = transitionVolumeTickStart + (transitionVolumeTickEnd - transitionVolumeTickStart) * endRatio;
				decayTimeStart = decayTimeTickStart + (decayTimeTickEnd - decayTimeTickStart) * startRatio;
				decayTimeEnd   = decayTimeTickStart + (decayTimeTickEnd - decayTimeTickStart) * endRatio;
			}
			
			const sampleTime: number = 1.0 / synth.samplesPerSecond;
			tone.active = true;
			
			if (instrument.type == InstrumentType.chip || instrument.type == InstrumentType.fm) {
				const lfoEffectStart: number = Synth.getLFOAmplitude(instrument, secondsPerPart * partTimeStart);
				const lfoEffectEnd:   number = Synth.getLFOAmplitude(instrument, secondsPerPart * partTimeEnd);
				const vibratoScale: number = (partsSinceStart < Config.vibratos[instrument.vibrato].delayParts) ? 0.0 : Config.vibratos[instrument.vibrato].amplitude;
				const vibratoStart: number = vibratoScale * lfoEffectStart;
				const vibratoEnd:   number = vibratoScale * lfoEffectEnd;
				intervalStart += vibratoStart;
				intervalEnd   += vibratoEnd;
			}
			
			if (!Config.transitions[transition].isSeamless || (!(!Config.transitions[transition].slides && tone.note != null && tone.note.start == 0) && !(tone.prevNote != null))) {
				const attackSeconds: number = Config.transitions[transition].attackSeconds;
				if (attackSeconds > 0.0) {
					transitionVolumeStart *= Math.min(1.0, secondsPerPart * decayTimeStart / attackSeconds);
					transitionVolumeEnd   *= Math.min(1.0, secondsPerPart * decayTimeEnd / attackSeconds);
				}
			}

			const instrumentVolumeMult: number = (instrument.volume == 5) ? 0.0 : Math.pow(2, -Config.volumeValues[instrument.volume]);
			const filterVolume: number = Synth.setUpResonantFilter(synth, instrument, tone, runLength, secondsPerPart, beatsPerPart, decayTimeStart, decayTimeEnd, partTimeStart, partTimeEnd, customVolumeStart, customVolumeEnd);
			
			if (resetPhases) {
				tone.reset();
			}
			
			if (instrument.type == InstrumentType.fm) {
				// phase modulation!
				
				let sineVolumeBoost: number = 1.0;
				let totalCarrierVolume: number = 0.0;

				let arpeggioInterval: number = 0;
				if (tone.pitchCount > 1 && !Config.chords[instrument.chord].harmonizes) {
					const arpeggio: number = Math.floor((synth.tick + synth.part * Config.ticksPerPart) / Config.rhythms[song.rhythm].ticksPerArpeggio);
					const arpeggioPattern: ReadonlyArray<number> = Config.rhythms[song.rhythm].arpeggioPatterns[tone.pitchCount - 1];
					arpeggioInterval = tone.pitches[arpeggioPattern[arpeggio % arpeggioPattern.length]] - tone.pitches[0];
				}
				
				const carrierCount: number = Config.algorithms[instrument.algorithm].carrierCount;
				for (let i: number = 0; i < Config.operatorCount; i++) {
					const associatedCarrierIndex: number = Config.algorithms[instrument.algorithm].associatedCarrier[i] - 1;
					const pitch: number = tone.pitches[!Config.chords[instrument.chord].harmonizes ? 0 : ((i < tone.pitchCount) ? i : ((associatedCarrierIndex < tone.pitchCount) ? associatedCarrierIndex : 0))];
					const freqMult = Config.operatorFrequencies[instrument.operators[i].frequency].mult;
					const interval = Config.operatorCarrierInterval[associatedCarrierIndex] + arpeggioInterval;
					const startPitch: number = (pitch + intervalStart) * intervalScale + interval;
					const startFreq: number = freqMult * (synth.frequencyFromPitch(basePitch + startPitch)) + Config.operatorFrequencies[instrument.operators[i].frequency].hzOffset;
					
					tone.phaseDeltas[i] = startFreq * sampleTime * Config.sineWaveLength;
					
					const amplitudeCurve: number = Synth.operatorAmplitudeCurve(instrument.operators[i].amplitude);
					const amplitudeMult: number = amplitudeCurve * Config.operatorFrequencies[instrument.operators[i].frequency].amplitudeSign;
					let volumeStart: number = amplitudeMult;
					let volumeEnd: number = amplitudeMult;
					if (i < carrierCount) {
						// carrier
						const endPitch: number = (pitch + intervalEnd) * intervalScale + interval;
						const pitchVolumeStart: number = Math.pow(2.0, -startPitch / pitchDamping);
						const pitchVolumeEnd: number   = Math.pow(2.0,   -endPitch / pitchDamping);
						volumeStart *= pitchVolumeStart;
						volumeEnd *= pitchVolumeEnd;
						
						totalCarrierVolume += amplitudeCurve;
					} else {
						// modulator
						volumeStart *= Config.sineWaveLength * 1.5;
						volumeEnd *= Config.sineWaveLength * 1.5;
						
						sineVolumeBoost *= 1.0 - Math.min(1.0, instrument.operators[i].amplitude / 15);
					}
					const envelope: number = instrument.operators[i].envelope;
					
					volumeStart *= Synth.computeOperatorEnvelope(envelope, secondsPerPart * decayTimeStart, beatsPerPart * partTimeStart, customVolumeStart);
					volumeEnd *= Synth.computeOperatorEnvelope(envelope, secondsPerPart * decayTimeEnd, beatsPerPart * partTimeEnd, customVolumeEnd);
					
					tone.volumeStarts[i] = volumeStart;
					tone.volumeDeltas[i] = (volumeEnd - volumeStart) / runLength;
				}
				
				const feedbackAmplitude: number = Config.sineWaveLength * 0.3 * instrument.feedbackAmplitude / 15.0;
				let feedbackStart: number = feedbackAmplitude * Synth.computeOperatorEnvelope(instrument.feedbackEnvelope, secondsPerPart * decayTimeStart, beatsPerPart * partTimeStart, customVolumeStart);
				let feedbackEnd: number = feedbackAmplitude * Synth.computeOperatorEnvelope(instrument.feedbackEnvelope, secondsPerPart * decayTimeEnd, beatsPerPart * partTimeEnd, customVolumeEnd);
				tone.feedbackMult = feedbackStart;
				tone.feedbackDelta = (feedbackEnd - tone.feedbackMult) / runLength;
				
				const volumeMult: number = 0.15 * Config.chipWaves[instrument.wave].volume * instrumentVolumeMult;
				tone.volumeStart = filterVolume * volumeMult * transitionVolumeStart;
				tone.volumeDelta = filterVolume * volumeMult * (transitionVolumeEnd - transitionVolumeStart) / runLength;
				
				sineVolumeBoost *= 1.0 - instrument.feedbackAmplitude / 15.0;
				sineVolumeBoost *= 1.0 - Math.min(1.0, Math.max(0.0, totalCarrierVolume - 1) / 2.0);
				tone.volumeStart *= 1.0 + sineVolumeBoost * 3.0;
				tone.volumeDelta *= 1.0 + sineVolumeBoost * 3.0;
			} else {
				let pitch: number = tone.pitches[0];

				if (tone.pitchCount > 1) {
					const arpeggio: number = Math.floor((synth.tick + synth.part * Config.ticksPerPart) / Config.rhythms[song.rhythm].ticksPerArpeggio);
					if (Config.chords[instrument.chord].harmonizes) {
						const arpeggioPattern: ReadonlyArray<number> = Config.rhythms[song.rhythm].arpeggioPatterns[tone.pitchCount - 2];
						const harmonyOffset: number = tone.pitches[1 + arpeggioPattern[arpeggio % arpeggioPattern.length]] - tone.pitches[0];
						tone.harmonyMult = Math.pow(2.0, harmonyOffset / 12.0);
						tone.harmonyVolumeMult = Math.pow(2.0, -harmonyOffset / pitchDamping)
					} else {
						const arpeggioPattern: ReadonlyArray<number> = Config.rhythms[song.rhythm].arpeggioPatterns[tone.pitchCount - 1];
						pitch = tone.pitches[arpeggioPattern[arpeggio % arpeggioPattern.length]];
					}
				}
				
				const startPitch: number = (pitch + intervalStart) * intervalScale;
				const endPitch: number = (pitch + intervalEnd) * intervalScale;
				const startFreq: number = synth.frequencyFromPitch(basePitch + startPitch);
				const pitchVolumeStart: number = Math.pow(2.0, -startPitch / pitchDamping);
				const pitchVolumeEnd: number   = Math.pow(2.0,   -endPitch / pitchDamping);
				let settingsVolumeMult: number;
				if (!isDrum) {
					settingsVolumeMult = 0.27 * 0.5 * Config.chipWaves[instrument.wave].volume * filterVolume * Config.intervals[instrument.interval].volume;
				} else {
					settingsVolumeMult = 0.19 * 5.0 * Config.noiseWaves[instrument.wave].volume * filterVolume;
				}
				
				tone.phaseDeltas[0] = startFreq * sampleTime;
				
				tone.volumeStart = transitionVolumeStart * pitchVolumeStart * settingsVolumeMult * instrumentVolumeMult;
				let volumeEnd: number = transitionVolumeEnd * pitchVolumeEnd * settingsVolumeMult * instrumentVolumeMult;
				
				if (Config.envelopes[instrument.filterEnvelope].type != EnvelopeType.custom) {
					tone.volumeStart *= customVolumeStart;
					volumeEnd *= customVolumeEnd;
				}
				
				tone.volumeDelta = (volumeEnd - tone.volumeStart) / runLength;
			}
			
			if (instrument.filterResonance > 0) {
				const resonanceVolume: number = 1.5 - 0.1 * (instrument.filterResonance - 1);
				tone.volumeStart *= resonanceVolume;
				tone.volumeDelta *= resonanceVolume;
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
		
		private static setUpResonantFilter(synth: Synth, instrument: Instrument, tone: Tone, runLength: number, secondsPerPart: number, beatsPerPart: number, decayTimeStart: number, decayTimeEnd: number, partTimeStart: number, partTimeEnd: number, customVolumeStart: number, customVolumeEnd: number): number {
			const filterCutoffHz: number = Config.filterCutoffMaxHz * Math.pow(2.0, (instrument.filterCutoff - (Config.filterCutoffRange - 1)) * 0.5);
			const filterBase: number = 2.0 * Math.sin(Math.PI * filterCutoffHz / synth.samplesPerSecond);
			const filterMin: number = 2.0 * Math.sin(Math.PI * Config.filterCutoffMinHz / synth.samplesPerSecond);
			tone.filter = filterBase * Synth.computeOperatorEnvelope(instrument.filterEnvelope, secondsPerPart * decayTimeStart, beatsPerPart * partTimeStart, customVolumeStart);
			let endFilter: number = filterBase * Synth.computeOperatorEnvelope(instrument.filterEnvelope, secondsPerPart * decayTimeEnd, beatsPerPart * partTimeEnd, customVolumeEnd);
			tone.filter = Math.min(Config.filterMax, Math.max(filterMin, tone.filter));
			endFilter = Math.min(Config.filterMax, Math.max(filterMin, endFilter));
			tone.filterScale = Math.pow(endFilter / tone.filter, 1.0 / runLength);
			
			let filterVolume: number = Math.max(0.2, -0.1 * (instrument.filterCutoff - (Config.filterCutoffRange - 1)));
			const envelopeType: EnvelopeType = Config.envelopes[instrument.filterEnvelope].type;
			if (envelopeType == EnvelopeType.decay) filterVolume += 0.2;
			return filterVolume;
		}
		
		private static readonly fmSynthFunctionCache: Dictionary<Function> = {};
		
		private static getInstrumentSynthFunction(instrument: Instrument): Function {
			if (instrument.type == InstrumentType.fm) {
				const fingerprint: string = instrument.algorithm + "_" + instrument.feedbackType;
				if (Synth.fmSynthFunctionCache[fingerprint] == undefined) {
					const synthSource: string[] = [];
					
					for (const line of Synth.fmSourceTemplate) {
						if (line.indexOf("// CARRIER OUTPUTS") != -1) {
							if (instrument.type == InstrumentType.fm) {
								const outputs: string[] = [];
								for (let j: number = 0; j < Config.algorithms[instrument.algorithm].carrierCount; j++) {
									outputs.push("operator" + j + "Scaled");
								}
								synthSource.push(line.replace("/*operator#Scaled*/", outputs.join(" + ")));
							}
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
					
					Synth.fmSynthFunctionCache[fingerprint] = new Function("synth", "data", "bufferIndex", "runLength", "tone", "instrument", synthSource.join("\n"));
				}
				return Synth.fmSynthFunctionCache[fingerprint];
			} else if (instrument.type == InstrumentType.chip) {
				return Synth.chipSynth;
			} else if (instrument.type == InstrumentType.noise) {
				return Synth.noiseSynth; 
			} else {
				throw new Error("Unrecognized instrument type: " + instrument.type);
			}
		}
		
		private static chipSynth(synth: Synth, data: Float32Array, bufferIndex: number, runLength: number, tone: Tone, instrument: Instrument) {
			const wave: Float64Array = Config.chipWaves[instrument.wave].samples;
			const waveLength: number = +wave.length - 1; // The first sample is duplicated at the end, don't double-count it.
			
			const intervalA: number = +Math.pow(2.0, (Config.intervals[instrument.interval].offset + Config.intervals[instrument.interval].spread) / 12.0);
			const intervalB: number =  Math.pow(2.0, (Config.intervals[instrument.interval].offset - Config.intervals[instrument.interval].spread) / 12.0) * tone.harmonyMult;
			const intervalSign: number = tone.harmonyVolumeMult * Config.intervals[instrument.interval].sign;
			if (instrument.interval == 0 && !Config.chords[instrument.chord].harmonizes) tone.phases[1] = tone.phases[0];
			const deltaRatio: number = intervalB / intervalA;
			let phaseDeltaA: number = tone.phaseDeltas[0] * intervalA * waveLength;
			let phaseDeltaB: number = phaseDeltaA * deltaRatio;
			const phaseDeltaScale: number = +tone.phaseDeltaScale;
			let volume: number = +tone.volumeStart;
			const volumeDelta: number = +tone.volumeDelta;
			let phaseA: number = (tone.phases[0] % 1) * waveLength;
			let phaseB: number = (tone.phases[1] % 1) * waveLength;

			let filter1: number = +tone.filter;
			let filter2: number = (instrument.filterResonance == 0) ? 1.0 : filter1;
			const filterScale1: number = +tone.filterScale;
			const filterScale2: number = (instrument.filterResonance == 0) ? 1.0 : filterScale1;
			const filterResonance = Config.filterMaxResonance * Math.pow(Math.max(0, instrument.filterResonance - 1) / (Config.filterResonanceRange - 2), 0.5);
			let filterSample0: number = +tone.filterSample0;
			let filterSample1: number = +tone.filterSample1;

			const phaseAInt: number = phaseA|0;
			const phaseBInt: number = phaseB|0;
			const indexA: number = phaseAInt % waveLength;
			const indexB: number = phaseBInt % waveLength;
			const phaseRatioA: number = phaseA - phaseAInt;
			const phaseRatioB: number = phaseB - phaseBInt;
			let prevWaveIntegralA: number = wave[indexA];
			let prevWaveIntegralB: number = wave[indexB];
			prevWaveIntegralA += (wave[indexA+1] - prevWaveIntegralA) * phaseRatioA;
			prevWaveIntegralB += (wave[indexB+1] - prevWaveIntegralB) * phaseRatioB;
			
			const stopIndex: number = bufferIndex + runLength;
			while (bufferIndex < stopIndex) {

				phaseA += phaseDeltaA;
				phaseB += phaseDeltaB;

				const phaseAInt: number = phaseA|0;
				const phaseBInt: number = phaseB|0;
				const indexA: number = phaseAInt % waveLength;
				const indexB: number = phaseBInt % waveLength;
				let nextWaveIntegralA: number = wave[indexA];
				let nextWaveIntegralB: number = wave[indexB];
				const phaseRatioA: number = phaseA - phaseAInt;
				const phaseRatioB: number = phaseB - phaseBInt;
				nextWaveIntegralA += (wave[indexA+1] - nextWaveIntegralA) * phaseRatioA;
				nextWaveIntegralB += (wave[indexB+1] - nextWaveIntegralB) * phaseRatioB;
				let waveA: number = (nextWaveIntegralA - prevWaveIntegralA) / phaseDeltaA;
				let waveB: number = (nextWaveIntegralB - prevWaveIntegralB) / phaseDeltaB;
				prevWaveIntegralA = nextWaveIntegralA;
				prevWaveIntegralB = nextWaveIntegralB;

				const combinedWave: number = (waveA + waveB * intervalSign) * volume;
				
				const feedback: number = filterResonance + filterResonance / (1.0 - filter1);
				filterSample0 += filter1 * (combinedWave - filterSample0 + feedback * (filterSample0 - filterSample1));
				filterSample1 += filter2 * (filterSample0 - filterSample1);
				
				volume += volumeDelta;
				filter1 *= filterScale1;
				filter2 *= filterScale2;
				phaseDeltaA *= phaseDeltaScale;
				phaseDeltaB *= phaseDeltaScale;
				
				data[bufferIndex] += filterSample1;
				bufferIndex++;
			}
			
			tone.phases[0] = phaseA / waveLength;
			tone.phases[1] = phaseB / waveLength;
			
			const epsilon: number = (1.0e-24);
			if (-epsilon < filterSample0 && filterSample0 < epsilon) filterSample0 = 0.0;
			if (-epsilon < filterSample1 && filterSample1 < epsilon) filterSample1 = 0.0;
			tone.filterSample0 = filterSample0;
			tone.filterSample1 = filterSample1;
		}
		
		private static fmSourceTemplate: string[] = (`
			var sineWave = beepbox.Config.sineWave;
			
			var phaseDeltaScale = +tone.phaseDeltaScale;
			var operator#Phase       = +((tone.phases[#] % 1) + beepbox.Synth.negativePhaseGuard) * beepbox.Config.sineWaveLength;
			var operator#PhaseDelta  = +tone.phaseDeltas[#];
			var operator#OutputMult  = +tone.volumeStarts[#];
			var operator#OutputDelta = +tone.volumeDeltas[#];
			var operator#Output      = +tone.feedbackOutputs[#];
			var feedbackMult         = +tone.feedbackMult;
			var feedbackDelta        = +tone.feedbackDelta;
			var volume = +tone.volumeStart;
			var volumeDelta = +tone.volumeDelta;
			
			var filter1 = +tone.filter;
			var filter2 = (instrument.filterResonance == 0) ? 1.0 : filter1;
			var filterScale1 = +tone.filterScale;
			var filterScale2 = (instrument.filterResonance == 0) ? 1.0 : filterScale1;
			var filterResonance = beepbox.Config.filterMaxResonance * Math.pow(Math.max(0, instrument.filterResonance - 1) / (beepbox.Config.filterResonanceRange - 2), 0.5);
			var filterSample0 = +tone.filterSample0;
			var filterSample1 = +tone.filterSample1;
			
			var stopIndex = bufferIndex + runLength;
			while (bufferIndex < stopIndex) {
				// INSERT OPERATOR COMPUTATION HERE
				var fmOutput = (/*operator#Scaled*/) * volume; // CARRIER OUTPUTS
				
				var feedback = filterResonance + filterResonance / (1.0 - filter1);
				filterSample0 += filter1 * (fmOutput - filterSample0 + feedback * (filterSample0 - filterSample1));
				filterSample1 += filter2 * (filterSample0 - filterSample1);
				
				volume += volumeDelta;
				feedbackMult += feedbackDelta;
				operator#OutputMult += operator#OutputDelta;
				operator#Phase += operator#PhaseDelta;
				operator#PhaseDelta *= phaseDeltaScale;
				filter1 *= filterScale1;
				filter2 *= filterScale2;
				
				data[bufferIndex] += filterSample1;
				bufferIndex++;
			}
			
			tone.phases[#] = operator#Phase / ` + Config.sineWaveLength + `;
			tone.feedbackOutputs[#] = operator#Output;
			
			var epsilon = (1.0e-24);
			if (-epsilon < filterSample0 && filterSample0 < epsilon) filterSample0 = 0.0;
			if (-epsilon < filterSample1 && filterSample1 < epsilon) filterSample1 = 0.0;
			tone.filterSample0 = filterSample0;
			tone.filterSample1 = filterSample1;
		`).split("\n");
		
		private static operatorSourceTemplate: string[] = (`
				var operator#PhaseMix = operator#Phase/* + operator@Scaled*/;
				var operator#PhaseInt = operator#PhaseMix|0;
				var operator#Index    = operator#PhaseInt & ` + Config.sineWaveMask + `;
				var operator#Sample   = sineWave[operator#Index];
				operator#Output       = operator#Sample + (sineWave[operator#Index + 1] - operator#Sample) * (operator#PhaseMix - operator#PhaseInt);
				var operator#Scaled   = operator#OutputMult * operator#Output;
		`).split("\n");
		
		private static noiseSynth(synth: Synth, data: Float32Array, bufferIndex: number, runLength: number, tone: Tone, instrument: Instrument) {
			const wave: Float32Array = Config.getDrumWave(instrument.wave);
			let phaseDelta: number = +tone.phaseDeltas[0];
			const phaseDeltaScale: number = +tone.phaseDeltaScale;
			let volume: number = +tone.volumeStart;
			const volumeDelta: number = +tone.volumeDelta;
			let phase: number = (tone.phases[0] % 1) * 32768.0;
			if (tone.phases[0] == 0) {
				// Zero phase means the tone was reset, just give noise a random start phase instead:
				phase = Math.random() * 32768.0;
			}
			let sample: number = +tone.sample;
			
			let filter1: number = +tone.filter;
			let filter2: number = (instrument.filterResonance == 0) ? 1.0 : filter1;
			const filterScale1: number = +tone.filterScale;
			const filterScale2: number = (instrument.filterResonance == 0) ? 1.0 : filterScale1;
			const filterResonance = Config.filterMaxResonance * Math.pow(Math.max(0, instrument.filterResonance - 1) / (Config.filterResonanceRange - 2), 0.5);
			let filterSample0: number = +tone.filterSample0;
			let filterSample1: number = +tone.filterSample1;
			
			const pitchRelativefilter: number = Config.noiseWaves[instrument.wave].isSoft
				? Math.min(1.0, tone.phaseDeltas[0] * Config.noiseWaves[instrument.wave].pitchFilterMult)
				: 1.0;
			
			const stopIndex: number = bufferIndex + runLength;
			while (bufferIndex < stopIndex) {
				const waveSample: number = wave[phase & 0x7fff] * volume;
				
				sample += (filterSample1 - sample) * pitchRelativefilter;
				
				const feedback: number = filterResonance + filterResonance / (1.0 - filter1);
				filterSample0 += filter1 * (waveSample - filterSample0 + feedback * (filterSample0 - filterSample1));
				filterSample1 += filter2 * (filterSample0 - filterSample1);
				
				phase += phaseDelta;
				filter1 *= filterScale1;
				filter2 *= filterScale2;
				phaseDelta *= phaseDeltaScale;
				data[bufferIndex] += filterSample1;
				volume += volumeDelta;
				bufferIndex++;
			}
			
			tone.phases[0] = phase / 32768.0;
			tone.sample = sample;
			
			const epsilon: number = (1.0e-24);
			if (-epsilon < filterSample0 && filterSample0 < epsilon) filterSample0 = 0.0;
			if (-epsilon < filterSample1 && filterSample1 < epsilon) filterSample1 = 0.0;
			tone.filterSample0 = filterSample0;
			tone.filterSample1 = filterSample1;
		}
		
		private frequencyFromPitch(pitch: number): number {
			return 440.0 * Math.pow(2.0, (pitch - 69.0) / 12.0);
		}
		
		private volumeConversion(noteVolume: number): number {
			return Math.pow(Math.max(0.0, noteVolume) / 3.0, 1.5);
		}
		
		private getSamplesPerTick(): number {
			if (this.song == null) return 0;
			const beatsPerMinute: number = this.song.getBeatsPerMinute();
			const beatsPerSecond: number = beatsPerMinute / 60.0;
			const partsPerSecond: number = beatsPerSecond * Config.partsPerBeat;
			const tickPerSecond: number = partsPerSecond * Config.ticksPerPart;
			return Math.floor(this.samplesPerSecond / tickPerSecond);
		}
	}
}
