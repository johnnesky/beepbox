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
	
	export class Config {
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
		public static readonly blackKeyNameParents: ReadonlyArray<number> = [-1, 1, -1, 1, -1, 1, -1, -1, 1, -1, 1, -1];
		public static readonly pitchNames: ReadonlyArray<string | null> = ["C", null, "D", null, "E", "F", null, "G", null, "A", null, "B"];
		public static readonly keyNames: ReadonlyArray<string> = ["B", "A♯", "A", "G♯", "G", "F♯", "F", "E", "D♯", "D", "C♯", "C"];
		// C1 has index 24 on the MIDI scale. C8 is 108, and C9 is 120. C10 is barely in the audible range.
		public static readonly keyTransposes: ReadonlyArray<number> = [23, 22, 21, 20, 19, 18, 17, 16, 15, 14, 13, 12];
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
		public static readonly rhythmNames: ReadonlyArray<string> = ["÷3 (triplets)", "÷4 (standard)", "÷6", "÷8"];
		public static readonly rhythmStepsPerBeat: ReadonlyArray<number> = [3, 4, 6, 8];
		public static readonly ticksPerArpeggio: ReadonlyArray<number> = [4, 3, 4, 3];
		public static readonly arpeggioPatterns: ReadonlyArray<ReadonlyArray<ReadonlyArray<number>>> = [
			[[0], [0, 0, 1, 1], [0, 1, 2, 1], [0, 1, 2, 3]],
			[[0], [0, 0, 1, 1], [0, 1, 2, 1], [0, 1, 2, 3]],
			[[0], [0, 1],       [0, 1, 2, 1], [0, 1, 2, 3]],
			[[0], [0, 1],       [0, 1, 2, 1], [0, 1, 2, 3]],
		];
		public static readonly partsPerBeat: number = 24;
		public static readonly ticksPerPart: number = 2;
		public static readonly waveNames: ReadonlyArray<string> = ["rounded", "triangle", "square", "⅓ pulse", "¼ pulse", "⅙ pulse", "⅛ pulse", "sawtooth", "double saw", "double pulse", "spiky"];
		public static readonly waveVolumes: ReadonlyArray<number> = [ 0.94,       1.0,       0.5,       0.5,       0.5,       0.5,       0.5,       0.65,         0.5,          0.4,         0.4];
		// the "clang" and "buzz" drums are inspired by similar drums in the modded beepbox! :D
		public static readonly drumNames: ReadonlyArray<string> = ["retro", "white", "clang", "buzz", "hollow", /*"tom-tom", "cymbal", "bass"*/];
		public static readonly drumVolumes: ReadonlyArray<number> = [0.25, 1.0, 0.4, 0.3, 1.5, /*1.5, 1.5, 1.5*/];
		public static readonly drumBasePitches: ReadonlyArray<number> = [69, 69, 69, 69, 96, /*96, 90, 126*/];
		public static readonly drumPitchFilterMult: ReadonlyArray<number> = [100.0, 8.0, 100.0, 100.0, 1.0, /*1.0, 1.0, 1.0*/];
		public static readonly drumWaveIsSoft: ReadonlyArray<boolean> = [false, true, false, false, true, /*true, true, true*/];
		// Noise waves have too many samples to write by hand, they're generated on-demand by getDrumWave instead.
		private static readonly _drumWaves: Array<Float32Array | null> = [null, null, null, null, null, /*null, null, null*/];
		public static readonly filterCutoffMaxHz: number = 8000; // This is carefully calculated to correspond to no change when filtering at 48000 samples per second.
		public static readonly filterCutoffMinHz: number = 10;
		public static readonly filterMax: number = 0.95;
		public static readonly filterMaxResonance: number = 0.95;
		public static readonly filterCutoffRange: number = 11;
		public static readonly filterResonanceRange: number = 8;
		public static readonly transitionNames: ReadonlyArray<string> = ["seamless", "sudden", "smooth", "slide", "crossfade", "fadeout", "pad"];
		public static readonly transitionAttackTicks: ReadonlyArray<number> = [0, 0, 3, 3, 6, 0, 6];
		public static readonly transitionReleaseTicks: ReadonlyArray<number> = [1, 3, 3, 3, 6, 48, 96];
		public static readonly transitionIsSeamless: ReadonlyArray<boolean> = [true, false, false, true, false, false, false];
		public static readonly transitionSlides: ReadonlyArray<boolean> = [false, false, false, true, false, false, false];
		public static readonly transitionReleases: ReadonlyArray<boolean> = [false, false, false, false, true, true, true];
		public static readonly transitionSlideTicks: ReadonlyArray<number> = [3, 3, 3, 3, 3, 3, 3];
		public static readonly vibratoNames: ReadonlyArray<string> = ["none", "light", "delayed", "heavy", "shaky"];
		public static readonly vibratoAmplitudes: ReadonlyArray<number> = [0.0, 0.15, 0.3, 0.45, 0.11 /*, 0.0, 0.0*/];
		public static readonly effectTremolos: ReadonlyArray<number> = [0.0, 0.0, 0.0, 0.0, 0.0 /*, 0.25, 0.5*/];
		public static readonly vibratoPeriods: ReadonlyArray<ReadonlyArray<number>> = [[0.14], [0.14], [0.14], [0.14], [0.1, 0.1618, 0.3] /*, [0.14], [0.14]*/];
		public static readonly vibratoDelays: ReadonlyArray<number> = [0, 0, 18, 0, 0 /*, 0, 0*/];
		public static readonly intervalNames: ReadonlyArray<string> = ["union", "shimmer", "hum", "honky tonk", "dissonant", "fifths", "octaves", "bowed", "custom harmony"];
		public static readonly intervalSpreads: ReadonlyArray<number> = [0.0, 0.02, 0.05, 0.1, 0.25, 3.5, 6, 0.02, 0.05];
		public static readonly intervalOffsets: ReadonlyArray<number> = [0.0, 0.0, 0.0, 0.0, 0.0, 3.5, 6, 0.0, 0.0];
		public static readonly intervalVolumes: ReadonlyArray<number> = [0.7, 0.8, 1.0, 1.0, 0.9, 0.9, 0.8, 1.0, 1.0];
		public static readonly intervalSigns: ReadonlyArray<number> = [1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, -1.0, 1.0];
		public static readonly intervalHarmonizes: ReadonlyArray<boolean> = [false, false, false, false, false, false, false, false, true];
		public static readonly delayNames: ReadonlyArray<string> = ["none", "reverb", "chorus", "chorus & reverb"];
		public static readonly volumeRange: number = 6;
		public static readonly volumeValues: ReadonlyArray<number> = [0.0, 0.5, 1.0, 1.5, 2.0, -1.0];
		public static readonly operatorCount: number = 4;
		public static readonly operatorAlgorithmNames: ReadonlyArray<string> = [
			"1←(2 3 4)",
			"1←(2 3←4)",
			"1←2←(3 4)",
			"1←(2 3)←4",
			"1←2←3←4",
			"1←3 2←4",
			"1 2←(3 4)",
			"1 2←3←4",
			"(1 2)←3←4",
			"(1 2)←(3 4)",
			"1 2 3←4",
			"(1 2 3)←4",
			"1 2 3 4",
		];
		public static readonly midiAlgorithmNames: ReadonlyArray<string> = ["1<(2 3 4)", "1<(2 3<4)", "1<2<(3 4)", "1<(2 3)<4", "1<2<3<4", "1<3 2<4", "1 2<(3 4)", "1 2<3<4", "(1 2)<3<4", "(1 2)<(3 4)", "1 2 3<4", "(1 2 3)<4", "1 2 3 4"];
		public static readonly operatorModulatedBy: ReadonlyArray<ReadonlyArray<ReadonlyArray<number>>> = [
			[[2, 3, 4], [],     [],  []],
			[[2, 3],    [],     [4], []],
			[[2],       [3, 4], [],  []],
			[[2, 3],    [4],    [4], []],
			[[2],       [3],    [4], []],
			[[3],       [4],    [],  []],
			[[],        [3, 4], [],  []],
			[[],        [3],    [4], []],
			[[3],       [3],    [4], []],
			[[3, 4],    [3, 4], [],  []],
			[[],        [],     [4], []],
			[[4],       [4],    [4], []],
			[[],        [],     [],  []],
		];
		public static readonly operatorAssociatedCarrier: ReadonlyArray<ReadonlyArray<number>> = [
			[1, 1, 1, 1],
			[1, 1, 1, 1],
			[1, 1, 1, 1],
			[1, 1, 1, 1],
			[1, 1, 1, 1],
			[1, 2, 1, 2],
			[1, 2, 2, 2],
			[1, 2, 2, 2],
			[1, 2, 2, 2],
			[1, 2, 2, 2],
			[1, 2, 3, 3],
			[1, 2, 3, 3],
			[1, 2, 3, 4],
		];
		public static readonly operatorCarrierCounts: ReadonlyArray<number> = [1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 3, 3, 4];
		public static readonly operatorCarrierInterval: ReadonlyArray<number> = [0.0, 0.04, -0.073, 0.091];
		public static readonly operatorAmplitudeMax: number = 15;
		public static readonly operatorFrequencyNames: ReadonlyArray<string> = ["1×", "~1×", "2×", "~2×", "3×", "4×", "5×", "6×", "7×", "8×", "9×", "11×", "13×", "16×", "20×"];
		public static readonly midiFrequencyNames: ReadonlyArray<string> = ["1x", "~1x", "2x", "~2x", "3x", "4x", "5x", "6x", "7x", "8x", "9x", "11x", "13x", "16x", "20x"];
		public static readonly operatorFrequencies: ReadonlyArray<number> =    [ 1.0,   1.0,   2.0,   2.0,  3.0,  4.0,  5.0,  6.0,  7.0,  8.0,  9.0, 11.0, 13.0, 16.0, 20.0];
		public static readonly operatorHzOffsets: ReadonlyArray<number> =      [ 0.0,   1.5,   0.0,  -1.3,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0];
		public static readonly operatorAmplitudeSigns: ReadonlyArray<number> = [ 1.0,  -1.0,   1.0,  -1.0,  1.0,  1.0,  1.0,  1.0,  1.0,  1.0,  1.0,  1.0,  1.0,  1.0,  1.0];
		public static readonly operatorEnvelopeNames: ReadonlyArray<string> = ["custom", "steady", "punch", "flare 1", "flare 2", "flare 3", "pluck 1", "pluck 2", "pluck 3", "swell 1", "swell 2", "swell 3", "tremolo1", "tremolo2", "tremolo3", "tremolo4", "tremolo5", "tremolo6", "decay 1", "decay 2", "decay 3"];
		public static readonly operatorEnvelopeType: ReadonlyArray<EnvelopeType> = [EnvelopeType.custom, EnvelopeType.steady, EnvelopeType.punch, EnvelopeType.flare, EnvelopeType.flare, EnvelopeType.flare, EnvelopeType.pluck, EnvelopeType.pluck, EnvelopeType.pluck, EnvelopeType.pluck, EnvelopeType.pluck, EnvelopeType.pluck, EnvelopeType.tremolo, EnvelopeType.tremolo, EnvelopeType.tremolo, EnvelopeType.tremolo2, EnvelopeType.tremolo2, EnvelopeType.tremolo2, EnvelopeType.decay, EnvelopeType.decay, EnvelopeType.decay];
		public static readonly operatorEnvelopeSpeed: ReadonlyArray<number> = [0.0, 0.0, 0.0, 32.0, 8.0, 2.0, 32.0, 8.0, 2.0, 32.0, 8.0, 2.0, 4.0, 2.0, 1.0, 4.0, 2.0, 1.0, 10.0, 7.0, 4.0];
		public static readonly operatorEnvelopeInverted: ReadonlyArray<boolean> = [false, false, false, false, false, false, false, false, false, true, true, true, false, false, false, false, false, false, false, false, false];
		public static readonly operatorFeedbackNames: ReadonlyArray<string> = [
			"1⟲",
			"2⟲",
			"3⟲",
			"4⟲",
			"1⟲ 2⟲",
			"3⟲ 4⟲",
			"1⟲ 2⟲ 3⟲",
			"2⟲ 3⟲ 4⟲",
			"1⟲ 2⟲ 3⟲ 4⟲",
			"1→2",
			"1→3",
			"1→4",
			"2→3",
			"2→4",
			"3→4",
			"1→3 2→4",
			"1→4 2→3",
			"1→2→3→4",
		];
		public static readonly midiFeedbackNames: ReadonlyArray<string> = [
			"1",
			"2",
			"3",
			"4",
			"1 2",
			"3 4",
			"1 2 3",
			"2 3 4",
			"1 2 3 4",
			"1>2",
			"1>3",
			"1>4",
			"2>3",
			"2>4",
			"3>4",
			"1>3 2>4",
			"1>4 2>3",
			"1>2>3>4",
		];
		public static readonly operatorFeedbackIndices: ReadonlyArray<ReadonlyArray<ReadonlyArray<number>>> = [
			[[1], [], [], []],
			[[], [2], [], []],
			[[], [], [3], []],
			[[], [], [], [4]],
			[[1], [2], [], []],
			[[], [], [3], [4]],
			[[1], [2], [3], []],
			[[], [2], [3], [4]],
			[[1], [2], [3], [4]],
			[[], [1], [], []],
			[[], [], [1], []],
			[[], [], [], [1]],
			[[], [], [2], []],
			[[], [], [], [2]],
			[[], [], [], [3]],
			[[], [], [1], [2]],
			[[], [], [2], [1]],
			[[], [1], [2], [3]],
		];
		public static readonly pitchChannelTypeNames: ReadonlyArray<string> = ["chip", "FM (expert)"];
		public static readonly instrumentTypeNames: ReadonlyArray<string> = ["chip", "FM", "noise"];
		public static readonly pitchChannelColorsDim: ReadonlyArray<string>    = ["#0099a1", "#a1a100", "#c75000", "#00a100", "#d020d0", "#7777b0"];
		public static readonly pitchChannelColorsBright: ReadonlyArray<string> = ["#25f3ff", "#ffff25", "#ff9752", "#50ff50", "#ff90ff", "#a0a0ff"];
		public static readonly pitchNoteColorsDim: ReadonlyArray<string>       = ["#00bdc7", "#c7c700", "#ff771c", "#00c700", "#e040e0", "#8888d0"];
		public static readonly pitchNoteColorsBright: ReadonlyArray<string>    = ["#92f9ff", "#ffff92", "#ffcdab", "#a0ffa0", "#ffc0ff", "#d0d0ff"];
		public static readonly drumChannelColorsDim: ReadonlyArray<string>    = ["#6f6f6f", "#996633"];
		public static readonly drumChannelColorsBright: ReadonlyArray<string> = ["#aaaaaa", "#ddaa77"];
		public static readonly drumNoteColorsDim: ReadonlyArray<string>       = ["#aaaaaa", "#cc9966"];
		public static readonly drumNoteColorsBright: ReadonlyArray<string>    = ["#eeeeee", "#f0d0bb"];
		public static readonly midiPitchChannelNames: ReadonlyArray<string> = ["cyan channel", "yellow channel", "orange channel", "green channel", "purple channel", "blue channel"];
		public static readonly midiDrumChannelNames: ReadonlyArray<string> = ["gray channel", "brown channel"];
		public static readonly midiSustainInstruments: number[] = [
			0x47, // triangle -> clarinet
			0x50, // square -> square wave
			0x46, // pulse wide -> bassoon
			0x44, // pulse narrow -> oboe
			0x51, // sawtooth -> sawtooth wave
			0x51, // double saw -> sawtooth wave
			0x51, // double pulse -> sawtooth wave
			0x51, // spiky -> sawtooth wave
			0x4A, // plateau -> recorder
		];
		public static readonly midiDecayInstruments: number[] = [
			0x2E, // triangle -> harp
			0x2E, // square -> harp
			0x06, // pulse wide -> harpsichord
			0x18, // pulse narrow -> nylon guitar
			0x19, // sawtooth -> steel guitar
			0x19, // double saw -> steel guitar
			0x6A, // double pulse -> shamisen
			0x6A, // spiky -> shamisen
			0x21, // plateau -> fingered bass
		];
		public static readonly drumInterval: number = 6;
		public static readonly drumCount: number = 12;
		public static readonly pitchCount: number = 37;
		public static readonly maxPitch: number = 84;
		public static readonly pitchChannelCountMin: number = 1;
		public static readonly pitchChannelCountMax: number = 6;
		public static readonly drumChannelCountMin: number = 0;
		public static readonly drumChannelCountMax: number = 2;
		public static readonly waves: ReadonlyArray<Float64Array> = [
			Config._centerWave([0.0, 0.2, 0.4, 0.5, 0.6, 0.7, 0.8, 0.85, 0.9, 0.95, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 0.95, 0.9, 0.85, 0.8, 0.7, 0.6, 0.5, 0.4, 0.2, 0.0, -0.2, -0.4, -0.5, -0.6, -0.7, -0.8, -0.85, -0.9, -0.95, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -0.95, -0.9, -0.85, -0.8, -0.7, -0.6, -0.5, -0.4, -0.2]),
			Config._centerWave([1.0/15.0, 3.0/15.0, 5.0/15.0, 7.0/15.0, 9.0/15.0, 11.0/15.0, 13.0/15.0, 15.0/15.0, 15.0/15.0, 13.0/15.0, 11.0/15.0, 9.0/15.0, 7.0/15.0, 5.0/15.0, 3.0/15.0, 1.0/15.0, -1.0/15.0, -3.0/15.0, -5.0/15.0, -7.0/15.0, -9.0/15.0, -11.0/15.0, -13.0/15.0, -15.0/15.0, -15.0/15.0, -13.0/15.0, -11.0/15.0, -9.0/15.0, -7.0/15.0, -5.0/15.0, -3.0/15.0, -1.0/15.0]),
			Config._centerWave([1.0, -1.0]),
			Config._centerWave([1.0, -1.0, -1.0]),
			Config._centerWave([1.0, -1.0, -1.0, -1.0]),
			Config._centerWave([1.0, -1.0, -1.0, -1.0, -1.0, -1.0]),
			Config._centerWave([1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0]),
			Config._centerWave([1.0/31.0, 3.0/31.0, 5.0/31.0, 7.0/31.0, 9.0/31.0, 11.0/31.0, 13.0/31.0, 15.0/31.0, 17.0/31.0, 19.0/31.0, 21.0/31.0, 23.0/31.0, 25.0/31.0, 27.0/31.0, 29.0/31.0, 31.0/31.0, -31.0/31.0, -29.0/31.0, -27.0/31.0, -25.0/31.0, -23.0/31.0, -21.0/31.0, -19.0/31.0, -17.0/31.0, -15.0/31.0, -13.0/31.0, -11.0/31.0, -9.0/31.0, -7.0/31.0, -5.0/31.0, -3.0/31.0, -1.0/31.0]),
			Config._centerWave([0.0, -0.2, -0.4, -0.6, -0.8, -1.0, 1.0, -0.8, -0.6, -0.4, -0.2, 1.0, 0.8, 0.6, 0.4, 0.2]),
			Config._centerWave([1.0, 1.0, 1.0, 1.0, 1.0, -1.0, -1.0, -1.0, 1.0, 1.0, 1.0, 1.0, -1.0, -1.0, -1.0, -1.0]),
			Config._centerWave([1.0, -1.0, 1.0, -1.0, 1.0, 0.0]),
		];
		public static readonly sineWaveLength: number = 1 << 8; // 256
		public static readonly sineWaveMask: number = Config.sineWaveLength - 1;
		public static readonly sineWave: Float64Array = Config.generateSineWave();
		
		private static _centerWave(wave: Array<number>): Float64Array {
			let sum: number = 0.0;
			for (let i: number = 0; i < wave.length; i++) sum += wave[i];
			const average: number = sum / wave.length;
			for (let i: number = 0; i < wave.length; i++) wave[i] -= average;
			return new Float64Array(wave);
		}
		
		public static getDrumWave(index: number): Float32Array {
			let wave: Float32Array | null = Config._drumWaves[index];
			if (wave == null) {
				wave = new Float32Array(32768);
				Config._drumWaves[index] = wave;
				
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
		delay = CharCode.q,
		rhythm = CharCode.r,
		scale = CharCode.s,
		tempo = CharCode.t,
		
		volume = CharCode.v,
		wave = CharCode.w,
		
		filterResonance = CharCode.y,
		filterEnvelope = CharCode.z,
		algorithm = CharCode.A,
		feedbackAmplitude = CharCode.B,
		
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
		public wave: number = 1;
		public filterCutoff: number = 6;
		public filterResonance: number = 0;
		public filterEnvelope: number = 1;
		public transition: number = 1;
		public vibrato: number = 0;
		public interval: number = 0;
		public delay: number = 0;
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
			switch (type) {
				case InstrumentType.chip:
					this.wave = 1;
					this.filterCutoff = 6;
					this.filterResonance = 0;
					this.filterEnvelope = 1;
					this.transition = 1;
					this.vibrato = 0;
					this.interval = 0;
					this.volume = 0;
					this.delay = 1;
					break;
				case InstrumentType.fm:
					this.transition = 1;
					this.vibrato = 0;
					this.delay = 1;
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
					this.delay = 0;
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
			this.wave = other.wave;
			this.filterCutoff = other.filterCutoff;
			this.filterResonance = other.filterResonance;
			this.filterEnvelope = other.filterEnvelope;
			this.transition = other.transition;
			this.vibrato = other.vibrato;
			this.interval = other.interval;
			this.delay = other.delay;
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
				transition: Config.transitionNames[this.transition],
				delay: Config.delayNames[this.delay],
				filterCutoffHz: Math.round(Config.filterCutoffMaxHz * Math.pow(2.0, (this.filterCutoff - (Config.filterCutoffRange - 1)) * 0.5)),
				filterResonance: Math.round(100 * this.filterResonance / (Config.filterResonanceRange - 1)),
				filterEnvelope: Config.operatorEnvelopeNames[this.filterEnvelope],
			};
			if (this.type == InstrumentType.noise) {
				instrumentObject.volume = (5 - this.volume) * 20;
				instrumentObject.wave = Config.drumNames[this.wave];
			} else if (this.type == InstrumentType.chip) {
				instrumentObject.volume = (5 - this.volume) * 20;
				instrumentObject.wave = Config.waveNames[this.wave];
				instrumentObject.interval = Config.intervalNames[this.interval];
				instrumentObject.vibrato = Config.vibratoNames[this.vibrato];
			} else if (this.type == InstrumentType.fm) {
				const operatorArray: Object[] = [];
				for (const operator of this.operators) {
					operatorArray.push({
						frequency: Config.operatorFrequencyNames[operator.frequency],
						amplitude: operator.amplitude,
						envelope: Config.operatorEnvelopeNames[operator.envelope],
					});
				}
				instrumentObject.vibrato = Config.vibratoNames[this.vibrato];
				instrumentObject.algorithm = Config.operatorAlgorithmNames[this.algorithm];
				instrumentObject.feedbackType = Config.operatorFeedbackNames[this.feedbackType];
				instrumentObject.feedbackAmplitude = this.feedbackAmplitude;
				instrumentObject.feedbackEnvelope = Config.operatorEnvelopeNames[this.feedbackEnvelope];
				instrumentObject.operators = operatorArray;
			} else {
				throw new Error("Unrecognized instrument type");
			}
			return instrumentObject;
		}
		
		public fromJsonObject(instrumentObject: any, isDrum: boolean): void {
			if (instrumentObject == undefined) instrumentObject = {};
			
			this.type = Config.instrumentTypeNames.indexOf(instrumentObject.type);
			if (this.type == -1) this.type = isDrum ? InstrumentType.noise : InstrumentType.chip;
			
			const oldTransitionNames: Dictionary<number> = {"binary": 0};
			const transitionObject = instrumentObject.transition || instrumentObject.envelope; // the transition property used to be called envelope, so try that too.
			this.transition = oldTransitionNames[transitionObject] != undefined ? oldTransitionNames[transitionObject] : Config.transitionNames.indexOf(transitionObject);
			if (this.transition == -1) this.transition = 1;
			
			this.delay = Config.delayNames.indexOf(instrumentObject.delay);
			if (this.delay == -1) this.delay = isDrum ? 0 : 1;
			
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
			this.filterEnvelope = Config.operatorEnvelopeNames.indexOf(instrumentObject.filterEnvelope);
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
				if (instrumentObject.volume != undefined) {
					this.volume = clamp(0, Config.volumeRange, Math.round(5 - (instrumentObject.volume | 0) / 20));
				} else {
					this.volume = 0;
				}
				this.wave = Config.drumNames.indexOf(instrumentObject.wave);
				if (this.wave == -1) this.wave = 1;
			} else if (this.type == InstrumentType.chip) {
				if (instrumentObject.volume != undefined) {
					this.volume = clamp(0, Config.volumeRange, Math.round(5 - (instrumentObject.volume | 0) / 20));
				} else {
					this.volume = 0;
				}
				
				const legacyWaveNames: Dictionary<number> = {"triangle": 1, "square": 2, "pulse wide": 4, "pulse narrow": 6, "sawtooth": 7, "double saw": 8, "double pulse": 9, "spiky": 10, "plateau": 0};
				this.wave = legacyWaveNames[instrumentObject.wave] != undefined ? legacyWaveNames[instrumentObject.wave] : Config.waveNames.indexOf(instrumentObject.wave);
				if (this.wave == -1) this.wave = 1;

				if (instrumentObject.interval != undefined) {
					this.interval = Config.intervalNames.indexOf(instrumentObject.interval);
					if (this.interval == -1) this.interval = 0;
				} else if (instrumentObject.chorus != undefined) {
					this.interval = Config.intervalNames.indexOf(instrumentObject.chorus);
					if (this.interval == -1) this.interval = 0;
				}
				
				if (instrumentObject.vibrato != undefined) {
					this.vibrato = Config.vibratoNames.indexOf(instrumentObject.vibrato);
					if (this.vibrato == -1) this.vibrato = 0;
				} else if (instrumentObject.effect != undefined) {
					this.vibrato = legacyEffectNames.indexOf(instrumentObject.effect);
					if (this.vibrato == -1) this.vibrato = 0;
				}
			} else if (this.type == InstrumentType.fm) {
				if (instrumentObject.vibrato != undefined) {
					this.vibrato = Config.vibratoNames.indexOf(instrumentObject.vibrato);
					if (this.vibrato == -1) this.vibrato = 0;
				} else if (instrumentObject.effect != undefined) {
					this.vibrato = legacyEffectNames.indexOf(instrumentObject.effect);
					if (this.vibrato == -1) this.vibrato = 0;
				}
				
				this.algorithm = Config.operatorAlgorithmNames.indexOf(instrumentObject.algorithm);
				if (this.algorithm == -1) this.algorithm = 0;
				this.feedbackType = Config.operatorFeedbackNames.indexOf(instrumentObject.feedbackType);
				if (this.feedbackType == -1) this.feedbackType = 0;
				if (instrumentObject.feedbackAmplitude != undefined) {
					this.feedbackAmplitude = clamp(0, Config.operatorAmplitudeMax + 1, instrumentObject.feedbackAmplitude | 0);
				} else {
					this.feedbackAmplitude = 0;
				}
				this.feedbackEnvelope = Config.operatorEnvelopeNames.indexOf(instrumentObject.feedbackEnvelope);
				if (this.feedbackEnvelope == -1) this.feedbackEnvelope = 0;
				
				for (let j: number = 0; j < Config.operatorCount; j++) {
					const operator: Operator = this.operators[j];
					let operatorObject: any = undefined;
					if (instrumentObject.operators) operatorObject = instrumentObject.operators[j];
					if (operatorObject == undefined) operatorObject = {};
					
					operator.frequency = Config.operatorFrequencyNames.indexOf(operatorObject.frequency);
					if (operator.frequency == -1) operator.frequency = 0;
					if (operatorObject.amplitude != undefined) {
						operator.amplitude = clamp(0, Config.operatorAmplitudeMax + 1, operatorObject.amplitude | 0);
					} else {
						operator.amplitude = 0;
					}
					operator.envelope = Config.operatorEnvelopeNames.indexOf(operatorObject.envelope);
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
				? Config.pitchChannelColorsDim[channel % Config.pitchChannelColorsDim.length]
				: Config.drumChannelColorsDim[(channel - this.pitchChannelCount) % Config.drumChannelColorsDim.length];
		}
		public getChannelColorBright(channel: number): string {
			return channel < this.pitchChannelCount
				? Config.pitchChannelColorsBright[channel % Config.pitchChannelColorsBright.length]
				: Config.drumChannelColorsBright[(channel - this.pitchChannelCount) % Config.drumChannelColorsBright.length];
		}
		public getNoteColorDim(channel: number): string {
			return channel < this.pitchChannelCount
				? Config.pitchNoteColorsDim[channel % Config.pitchNoteColorsDim.length]
				: Config.drumNoteColorsDim[(channel - this.pitchChannelCount) % Config.drumNoteColorsDim.length];
		}
		public getNoteColorBright(channel: number): string {
			return channel < this.pitchChannelCount
				? Config.pitchNoteColorsBright[channel % Config.pitchNoteColorsBright.length]
				: Config.drumNoteColorsBright[(channel - this.pitchChannelCount) % Config.drumNoteColorsBright.length];
		}
		
		public initToDefault(andResetChannels: boolean = true): void {
			this.scale = 0;
			this.key = Config.keyNames.length - 1;
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
					buffer.push(SongTagCode.transition, base64IntToCharCode[instrument.transition]);
					buffer.push(SongTagCode.filterCutoff, base64IntToCharCode[instrument.filterCutoff]);
					buffer.push(SongTagCode.filterResonance, base64IntToCharCode[instrument.filterResonance]);
					buffer.push(SongTagCode.filterEnvelope, base64IntToCharCode[instrument.filterEnvelope]);
					buffer.push(SongTagCode.delay, base64IntToCharCode[instrument.delay]);
					if (instrument.type == InstrumentType.chip) {
						// chip
						buffer.push(SongTagCode.volume, base64IntToCharCode[instrument.volume]);
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
						buffer.push(SongTagCode.volume, base64IntToCharCode[instrument.volume]);
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
					this.key = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
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
				} else if (command == SongTagCode.wave) {
					if (beforeThree) {
						const legacyWaves: number[] = [1, 2, 4, 6, 7, 8, 9, 10, 0];
						channel = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
						this.channels[channel].instruments[0].wave = clamp(0, Config.waveNames.length, legacyWaves[base64CharCodeToInt[compressed.charCodeAt(charIndex++)]] | 0);
					} else if (beforeSix) {
						const legacyWaves: number[] = [1, 2, 4, 6, 7, 8, 9, 10, 0];
						for (channel = 0; channel < this.getChannelCount(); channel++) {
							for (let i: number = 0; i < this.instrumentsPerChannel; i++) {
								if (channel >= this.pitchChannelCount) {
									this.channels[channel].instruments[i].wave = clamp(0, Config.drumNames.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
								} else {
									this.channels[channel].instruments[i].wave = clamp(0, Config.waveNames.length, legacyWaves[base64CharCodeToInt[compressed.charCodeAt(charIndex++)]] | 0);
								}
							}
						}
					} else if (beforeSeven) {
						const legacyWaves: number[] = [1, 2, 4, 6, 7, 8, 9, 10, 0];
						if (instrumentChannelIterator >= this.pitchChannelCount) {
							this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].wave = clamp(0, Config.drumNames.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
						} else {
							this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].wave = clamp(0, Config.waveNames.length, legacyWaves[base64CharCodeToInt[compressed.charCodeAt(charIndex++)]] | 0);
						}
					} else {
						if (instrumentChannelIterator >= this.pitchChannelCount) {
							this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].wave = clamp(0, Config.drumNames.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
						} else {
							this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].wave = clamp(0, Config.waveNames.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
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
					this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].filterEnvelope = clamp(0, Config.operatorEnvelopeNames.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
				} else if (command == SongTagCode.transition) {
					if (beforeThree) {
						channel = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
						this.channels[channel].instruments[0].transition = clamp(0, Config.transitionNames.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
					} else if (beforeSix) {
						for (channel = 0; channel < this.getChannelCount(); channel++) {
							for (let i: number = 0; i < this.instrumentsPerChannel; i++) {
								this.channels[channel].instruments[i].transition = clamp(0, Config.transitionNames.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
							}
						}
					} else {
						this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].transition = clamp(0, Config.transitionNames.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
					}
				} else if (command == SongTagCode.vibrato) {
					if (beforeThree) {
						const legacyEffects: number[] = [0, 3, 2, 0];
						const legacyEnvelopes: number[] = [1, 1, 1, 13];
						channel = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
						const effect: number = clamp(0, legacyEffects.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
						this.channels[channel].instruments[0].vibrato = legacyEffects[effect];
						this.channels[channel].instruments[0].filterEnvelope = legacyEnvelopes[effect];
					} else if (beforeSix) {
						const legacyEffects: number[] = [0, 1, 2, 3, 0, 0];
						const legacyEnvelopes: number[] = [1, 1, 1, 1, 16, 13];
						for (channel = 0; channel < this.getChannelCount(); channel++) {
							for (let i: number = 0; i < this.instrumentsPerChannel; i++) {
								const effect: number = clamp(0, legacyEffects.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
								this.channels[channel].instruments[i].vibrato = legacyEffects[effect];
								this.channels[channel].instruments[i].filterEnvelope = legacyEnvelopes[effect];
							}
						}
					} else if (beforeSeven) {
						const legacyEffects: number[] = [0, 1, 2, 3, 0, 0];
						const legacyEnvelopes: number[] = [1, 1, 1, 1, 16, 13];
						const effect: number = clamp(0, legacyEffects.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
						this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].vibrato = legacyEffects[effect];
						this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].filterEnvelope = legacyEnvelopes[effect];
					} else {
						const vibrato: number = clamp(0, Config.vibratoNames.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
						this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].vibrato = vibrato;
					}
				} else if (command == SongTagCode.interval) {
					if (beforeThree) {
						channel = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
						this.channels[channel].instruments[0].interval = clamp(0, Config.intervalNames.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
					} else if (beforeSix) {
						for (channel = 0; channel < this.getChannelCount(); channel++) {
							for (let i: number = 0; i < this.instrumentsPerChannel; i++) {
								this.channels[channel].instruments[i].interval = clamp(0, Config.intervalNames.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
							}
						}
					} else {
						this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].interval = clamp(0, Config.intervalNames.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
					}
				} else if (command == SongTagCode.delay) {
					this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].delay = clamp(0, Config.delayNames.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
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
					this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].algorithm = clamp(0, Config.operatorAlgorithmNames.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
				} else if (command == SongTagCode.feedbackType) {
					this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].feedbackType = clamp(0, Config.operatorFeedbackNames.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
				} else if (command == SongTagCode.feedbackAmplitude) {
					this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].feedbackAmplitude = clamp(0, Config.operatorAmplitudeMax + 1, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
				} else if (command == SongTagCode.feedbackEnvelope) {
					this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].feedbackEnvelope = clamp(0, Config.operatorEnvelopeNames.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
				} else if (command == SongTagCode.operatorFrequencies) {
					for (let o: number = 0; o < Config.operatorCount; o++) {
						this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].operators[o].frequency = clamp(0, Config.operatorFrequencyNames.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
					}
				} else if (command == SongTagCode.operatorAmplitudes) {
					for (let o: number = 0; o < Config.operatorCount; o++) {
						this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].operators[o].amplitude = clamp(0, Config.operatorAmplitudeMax + 1, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
					}
				} else if (command == SongTagCode.operatorEnvelopes) {
					for (let o: number = 0; o < Config.operatorCount; o++) {
						this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].operators[o].envelope = clamp(0, Config.operatorEnvelopeNames.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
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
										? bits.readLegacyPartDuration() * Config.partsPerBeat / Config.rhythmStepsPerBeat[this.rhythm]
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
												? bits.readLegacyPartDuration() * Config.partsPerBeat / Config.rhythmStepsPerBeat[this.rhythm]
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
				scale: Config.scaleNames[this.scale],
				key: Config.keyNames[this.key],
				introBars: this.loopStart,
				loopBars: this.loopLength,
				beatsPerBar: this.beatsPerBar,
				rhythm: Config.rhythmStepsPerBeat[this.rhythm],
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
				const scale: number = oldScaleNames[jsonObject.scale] != undefined ? oldScaleNames[jsonObject.scale] : Config.scaleNames.indexOf(jsonObject.scale);
				if (scale != -1) this.scale = scale;
			}
			
			if (jsonObject.key != undefined) {
				if (typeof(jsonObject.key) == "number") {
					this.key = Config.keyNames.length - 1 - (((jsonObject.key + 1200) >>> 0) % Config.keyNames.length);
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
				this.rhythm = Config.rhythmStepsPerBeat.indexOf(importedPartsPerBeat);
				if (this.rhythm == -1) {
					this.rhythm = 1;
				}
			}
			if (jsonObject.rhythm != undefined) {
				this.rhythm = Config.rhythmStepsPerBeat.indexOf(jsonObject.rhythm);
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
		public pitches: number[];
		public note: Note | null = null;
		public prevNote: Note | null = null;
		public nextNote: Note | null = null;
		public active: boolean = false;
		public noteLengthTicks: number = 0;
		public ticksSinceReleased: number = 0;
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
		public pianoPressed: boolean = false;
		public pianoPitch: number[] = [0];
		public pianoChannel: number = 0;
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
		
		private tonePoolLength: number = 0;
		private readonly tonePool: Tone[] = [];
		private readonly activeTones: Array<Tone | null> = [];
		private releasedTonesLength: number[] = [];
		private readonly releasedTones: Tone[][] = [];
		
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
			
			for (let i = 0; i < this.activeTones.length; i++) {
				const tone: Tone | null = this.activeTones[i];
				if (tone != null) this.freeTone(tone);
				this.activeTones[i] = null;
				
				for (let j = 0; j < this.releasedTonesLength[i]; j++) {
					const tone: Tone = this.releasedTones[i][j];
					this.freeTone(tone);
				}
				
				this.releasedTonesLength[i] = 0;
			}
			
			this.reverbDelayPos = 0;
			this.reverbFeedback0 = 0.0;
			this.reverbFeedback1 = 0.0;
			this.reverbFeedback2 = 0.0;
			this.reverbFeedback3 = 0.0;
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
				this.activeTones[i] = null;
				this.releasedTones[i] = [];
				this.releasedTonesLength[i] = 0;
			}
			this.activeTones.length = channelCount;
			this.releasedTones.length = channelCount;
			this.releasedTonesLength.length = channelCount;
			
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
			
			// Zero out buffers with a partially unrolled loop before instruments accumulate sample values:
			for (let i: number = 0; i < bufferLength;) {
				data[i++] = 0.0; data[i++] = 0.0; data[i++] = 0.0; data[i++] = 0.0;
			}
			if (this.samplesForChorus == null || this.samplesForChorus.length < bufferLength) {
				this.samplesForChorus = new Float32Array(bufferLength);
			}
			const samplesForChorus: Float32Array = this.samplesForChorus;
			for (let i: number = 0; i < bufferLength;) {
				samplesForChorus[i++] = 0.0; samplesForChorus[i++] = 0.0; samplesForChorus[i++] = 0.0; samplesForChorus[i++] = 0.0;
			}
			if (this.samplesForChorusReverb == null || this.samplesForChorusReverb.length < bufferLength) {
				this.samplesForChorusReverb = new Float32Array(bufferLength);
			}
			const samplesForChorusReverb: Float32Array = this.samplesForChorusReverb;
			for (let i: number = 0; i < bufferLength;) {
				samplesForChorusReverb[i++] = 0.0; samplesForChorusReverb[i++] = 0.0; samplesForChorusReverb[i++] = 0.0; samplesForChorusReverb[i++] = 0.0;
			}
			if (this.samplesForReverb == null || this.samplesForReverb.length < bufferLength) {
				this.samplesForReverb = new Float32Array(bufferLength);
			}
			const samplesForReverb: Float32Array = this.samplesForReverb;
			for (let i: number = 0; i < bufferLength;) {
				samplesForReverb[i++] = 0.0; samplesForReverb[i++] = 0.0; samplesForReverb[i++] = 0.0; samplesForReverb[i++] = 0.0;
			}
			
			const synthBufferByDelay: Float32Array[] = [data, samplesForReverb, samplesForChorus, samplesForChorusReverb];
			while (bufferIndex < bufferLength && !ended) {
				
				while (bufferIndex < bufferLength) {
			
					const samplesLeftInBuffer: number = bufferLength - bufferIndex;
					const runLength: number = (this.tickSampleCountdown <= samplesLeftInBuffer)
						? this.tickSampleCountdown
						: samplesLeftInBuffer;
					for (let channel: number = 0; channel < this.song.getChannelCount(); channel++) {
						const tone: Tone | null = this.getCurrentActiveTone(this.song, channel);
						if (tone != null) {
							Synth.computeTone(this, this.song, channel, samplesPerTick, runLength, tone, false);
							const synthBuffer: Float32Array = synthBufferByDelay[tone.instrument.delay];
							const synthesizer: Function = Synth.getInstrumentSynthFunction(tone.instrument);
							synthesizer(this, synthBuffer, bufferIndex, runLength, tone, tone.instrument);
						}
						for (let i: number = 0; i < this.releasedTonesLength[channel]; i++) {
							const tone: Tone = this.releasedTones[channel][i];
							if (tone.ticksSinceReleased >= Config.transitionReleaseTicks[tone.instrument.transition]) {
								this.freeReleasedTone(channel, i);
								i--;
								continue;
							}
							Synth.computeTone(this, this.song, channel, samplesPerTick, runLength, tone, true);
							const synthBuffer: Float32Array = synthBufferByDelay[tone.instrument.delay];
							const synthesizer: Function = Synth.getInstrumentSynthFunction(tone.instrument);
							synthesizer(this, synthBuffer, bufferIndex, runLength, tone, tone.instrument);
						}
					}
					bufferIndex += runLength;
					
					this.tickSampleCountdown -= runLength;
					if (this.tickSampleCountdown <= 0) {
						
						// Track how long tones have been released, and free them if they've expired.
						for (let channel: number = 0; channel < this.song.getChannelCount(); channel++) {
							for (let i: number = 0; i < this.releasedTonesLength[channel]; i++) {
								const tone: Tone = this.releasedTones[channel][i];
								tone.ticksSinceReleased++;
							}
						}
						
						this.tick++;
						this.tickSampleCountdown = samplesPerTick;
						if (this.tick == Config.ticksPerPart) {
							this.tick = 0;
							this.part++;
							
							// Check if any active tones should be released.
							for (let channel: number = 0; channel < this.song.getChannelCount(); channel++) {
								const tone: Tone | null = this.activeTones[channel];
								if (tone != null && Config.transitionReleases[tone.instrument.transition] && tone.note != null && tone.note.end == this.part + this.beat * Config.partsPerBeat) {
									this.releaseTone(channel, tone);
									this.activeTones[channel] = null;
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
			
			// Post processing:
			const volume: number = +this.volume;
			const chorusDelayLine: Float32Array = this.chorusDelayLine;
			const reverbDelayLine: Float32Array = this.reverbDelayLine;
			const chorusDuration: number = 2.0;
			const chorusAngle: number = Math.PI * 2.0 / (chorusDuration * this.samplesPerSecond);
			const chorusYMult: number = 2.0 * Math.cos(chorusAngle);
			const chorusRange: number = 150 * this.samplesPerSecond / 44100;
			const chorusOffset0: number = 0x400 - 1.51 * chorusRange;
			const chorusOffset1: number = 0x400 - 2.10 * chorusRange;
			const chorusOffset2: number = 0x400 - 3.35 * chorusRange;
			let chorusDelayPos: number = 0|this.chorusDelayPos;
			let reverbDelayPos: number = 0|this.reverbDelayPos;
			let chorusY0: number = Math.sin(this.chorusPhase + 0);
			let chorusY1: number = Math.sin(this.chorusPhase + 2.1);
			let chorusY2: number = Math.sin(this.chorusPhase + 4.2);
			let chorusPrevY0: number = Math.sin(this.chorusPhase + 0 - chorusAngle);
			let chorusPrevY1: number = Math.sin(this.chorusPhase + 2.1 - chorusAngle);
			let chorusPrevY2: number = Math.sin(this.chorusPhase + 4.2 - chorusAngle);
			let reverbFeedback0: number = +this.reverbFeedback0;
			let reverbFeedback1: number = +this.reverbFeedback1;
			let reverbFeedback2: number = +this.reverbFeedback2;
			let reverbFeedback3: number = +this.reverbFeedback3;
			const reverb: number = Math.pow(this.song.reverb / Config.reverbRange, 0.667) * 0.425;
			const limitDecay: number = +this.limitDecay;
			let limit: number = +this.limit;
			for (let i: number = 0; i < bufferLength; i++) {
				const sampleForChorus: number = samplesForChorus[i];
				const sampleForChorusReverb: number = samplesForChorusReverb[i];
				const sampleForReverb: number = samplesForReverb[i];
				const combinedChorus: number = sampleForChorus + sampleForChorusReverb;
				
				const chorusSample = 0.5 * (
					combinedChorus
					- chorusDelayLine[(chorusDelayPos + chorusOffset0 - chorusY0 * chorusRange) & 0x3FF]
					+ chorusDelayLine[(chorusDelayPos + chorusOffset1 - chorusY1 * chorusRange) & 0x3FF]
					- chorusDelayLine[(chorusDelayPos + chorusOffset2 - chorusY2 * chorusRange) & 0x3FF]);
				chorusDelayLine[chorusDelayPos] = combinedChorus;
				chorusDelayPos = (chorusDelayPos + 1) & 0x3FF;
				const chorusY0Temp: number = chorusY0;
				const chorusY1Temp: number = chorusY1;
				const chorusY2Temp: number = chorusY2;
				chorusY0 = chorusYMult * chorusY0 - chorusPrevY0;
				chorusY1 = chorusYMult * chorusY1 - chorusPrevY1;
				chorusY2 = chorusYMult * chorusY2 - chorusPrevY2;
				chorusPrevY0 = chorusY0Temp;
				chorusPrevY1 = chorusY1Temp;
				chorusPrevY2 = chorusY2Temp;
				
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
			
			this.chorusPhase += chorusAngle * bufferLength;
			this.chorusDelayPos = chorusDelayPos;
			this.reverbDelayPos = reverbDelayPos;
			this.reverbFeedback0 = reverbFeedback0;
			this.reverbFeedback1 = reverbFeedback1;
			this.reverbFeedback2 = reverbFeedback2;
			this.reverbFeedback3 = reverbFeedback3;
			this.limit = limit;
			
			this.playheadInternal = (((this.tick + 1.0 - this.tickSampleCountdown / samplesPerTick) / 2.0 + this.part) / Config.partsPerBeat + this.beat) / this.song.beatsPerBar + this.bar;
			
			const synthDuration: number = performance.now() - synthStartTime;
			
			// Performance measurements:
			samplesAccumulated += bufferLength;
			samplePerformance += synthDuration;
			/*
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
			this.tonePool[this.tonePoolLength] = tone;
			this.tonePoolLength++;
		}
		
		private newTone(): Tone {
			if (this.tonePoolLength > 0) {
				this.tonePoolLength--;
				const tone: Tone = this.tonePool[this.tonePoolLength];
				tone.reset();
				tone.active = false;
				return tone;
			}
			return new Tone();
		}
		
		private releaseTone(channel: number, tone: Tone): void {
			this.releasedTones[channel][this.releasedTonesLength[channel]] = tone;
			this.releasedTonesLength[channel]++;
		}
		
		private freeReleasedTone(channel: number, toneIndex: number): void {
			this.freeTone(this.releasedTones[channel][toneIndex]);
			this.releasedTonesLength[channel]--;
			for (let i = toneIndex; i < this.releasedTonesLength[channel]; i++) {
				this.releasedTones[channel][i] = this.releasedTones[channel][i + 1];
			}
		}
		
		private getCurrentActiveTone(song: Song, channel: number): Tone | null {
			const instrument: Instrument = song.channels[channel].instruments[song.getPatternInstrument(channel, this.bar)];
			const pattern: Pattern | null = song.getPattern(channel, this.bar);
			let pitches: number[] | null = null;
			let note: Note | null = null;
			let prevNote: Note | null = null;
			let nextNote: Note | null = null;
			
			if (this.pianoPressed && channel == this.pianoChannel) {
				pitches = this.pianoPitch;
				note = prevNote = nextNote = null;
				// TODO: track time since live piano note started for transition, envelope, decays, delayed vibrato, etc.
			} else if (pattern != null) {
				const time: number = this.part + this.beat * Config.partsPerBeat;
				
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
				
				if (note != null) {
					if (prevNote != null && prevNote.end != note.start) prevNote = null;
					if (nextNote != null && nextNote.start != note.end) nextNote = null;
					pitches = note.pitches;
				}
			}
			
			let tone: Tone | null = this.activeTones[channel];
			if (pitches != null) {
				if (tone == null) {
					tone = this.newTone();
				/*
				// Check piano mode and release if pitch changed??
				} else if (note != tone.note && Config.transitionReleases[tone.instrument.transition] && !Config.transitionIsSeamless[tone.instrument.transition]) {
					this.releaseTone(channel, tone);
					tone = this.newTone();
				*/
				}
				
				tone.pitches = pitches;
				tone.instrument = instrument;
				tone.note = note;
				tone.prevNote = prevNote;
				tone.nextNote = nextNote;
			} else {
				if (tone != null) {
					// Do we need this check here? Only for piano keys I guess?
					if (Config.transitionReleases[tone.instrument.transition]) {
						this.releaseTone(channel, tone);
					} else {
						this.freeTone(tone);
					}
				}
				tone = null;
			}
			
			this.activeTones[channel] = tone;
			return tone;
		}
		
		private static computeOperatorEnvelope(envelope: number, time: number, beats: number, customVolume: number): number {
			switch(Config.operatorEnvelopeType[envelope]) {
				case EnvelopeType.custom: return customVolume;
				case EnvelopeType.steady: return 1.0;
				case EnvelopeType.pluck:
					let curve: number = 1.0 / (1.0 + time * Config.operatorEnvelopeSpeed[envelope]);
					if (Config.operatorEnvelopeInverted[envelope]) {
						return 1.0 - curve;
					} else {
						return curve;
					}
				case EnvelopeType.tremolo: 
					return 0.5 - Math.cos(beats * 2.0 * Math.PI * Config.operatorEnvelopeSpeed[envelope]) * 0.5;
				case EnvelopeType.tremolo2: 
					return 0.75 - Math.cos(beats * 2.0 * Math.PI * Config.operatorEnvelopeSpeed[envelope]) * 0.25;
				case EnvelopeType.punch: 
					return Math.max(1.0, 2.0 - time * 10.0);
				case EnvelopeType.flare:
					const speed: number = Config.operatorEnvelopeSpeed[envelope];
					const attack: number = 0.25 / Math.sqrt(speed);
					return time < attack ? time / attack : 1.0 / (1.0 + (time - attack) * speed);
				case EnvelopeType.decay:
					return Math.pow(2, -Config.operatorEnvelopeSpeed[envelope] * time);
				default: throw new Error("Unrecognized operator envelope type.");
			}
		}
		
		private static computeTone(synth: Synth, song: Song, channel: number, samplesPerTick: number, runLength: number, tone: Tone, released: boolean): void {
			const instrument: Instrument = tone.instrument;
			const isDrum: boolean = song.getChannelIsDrum(channel);
			const basePitch: number = isDrum ? Config.drumBasePitches[instrument.wave] : Config.keyTransposes[song.key];
			const intervalScale: number = isDrum ? Config.drumInterval : 1;
			const pitchDamping: number = isDrum ? (Config.drumWaveIsSoft[instrument.wave] ? 24.0 : 60.0) : 48.0;
			const secondsPerPart: number = Config.ticksPerPart * samplesPerTick / synth.samplesPerSecond;
			const beatsPerPart: number = 1.0 / Config.partsPerBeat;
			const toneWasActive: boolean = tone.active;
			const tickSampleCountdown: number = synth.tickSampleCountdown;
			const startRatio: number = 1.0 - (tickSampleCountdown            ) / samplesPerTick;
			const endRatio:   number = 1.0 - (tickSampleCountdown - runLength) / samplesPerTick;
			
			const ticksIntoBar: number = (synth.beat * Config.partsPerBeat + synth.part) * Config.ticksPerPart + synth.tick;
			const partTimeTickStart: number = (ticksIntoBar    ) / Config.ticksPerPart;
			const partTimeTickEnd:   number = (ticksIntoBar + 1) / Config.ticksPerPart;
			const partTimeStart = partTimeTickStart + (partTimeTickEnd - partTimeTickStart) * startRatio;
			const partTimeEnd   = partTimeTickStart + (partTimeTickEnd - partTimeTickStart) * endRatio;
			
			tone.phaseDeltaScale = 0.0;
			tone.filter = 1.0;
			tone.filterScale = 1.0;
			tone.vibratoScale = 0.0;
			tone.harmonyMult = 1.0;
			tone.harmonyVolumeMult = 1.0;
			tone.active = false;
			
			let partsSinceStart: number = 0.0;
			
			const pitches: number[] = tone.pitches;
			let resetPhases: boolean = true;
			
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
				transitionVolumeStart = synth.volumeConversion((1.0 - startTicksSinceReleased / Config.transitionReleaseTicks[tone.instrument.transition]) * 3.0);
				transitionVolumeEnd   = synth.volumeConversion((1.0 - endTicksSinceReleased / Config.transitionReleaseTicks[tone.instrument.transition]) * 3.0);
				decayTimeStart = startTick / Config.ticksPerPart;
				decayTimeEnd   = endTick / Config.ticksPerPart;
			} else if (tone.note == null) {
				transitionVolumeStart = transitionVolumeEnd = 1;
				customVolumeStart = customVolumeEnd = 1;
				tone.lastInterval = 0;
				tone.lastVolume = 3;
				tone.ticksSinceReleased = 0;
				tone.noteLengthTicks = 0; // TODO: track piano key held duration for released tones.
				resetPhases = false;
				// TODO: track time since live piano note started for transition, envelope, decays, delayed vibrato, etc.
			} else {
				const note: Note = tone.note;
				const prevNote: Note | null = tone.prevNote;
				const nextNote: Note | null = tone.nextNote;
				
				const time: number = synth.part + synth.beat * Config.partsPerBeat;
				
				partsSinceStart = time - note.start;
				
				let endPinIndex: number;
				for (endPinIndex = 1; endPinIndex < note.pins.length - 1; endPinIndex++) {
					if (note.pins[endPinIndex].time + note.start > time) break;
				}
				const startPin: NotePin = note.pins[endPinIndex-1];
				const endPin: NotePin = note.pins[endPinIndex];
				const noteStartTick: number = note.start * Config.ticksPerPart;
				const noteEndTick:   number = note.end   * Config.ticksPerPart;
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
				const pinRatioStart: number = (tickTimeStart - pinStart) / (pinEnd - pinStart);
				const pinRatioEnd:   number = (tickTimeEnd   - pinStart) / (pinEnd - pinStart);
				let customVolumeTickStart: number = startPin.volume + (endPin.volume - startPin.volume) * pinRatioStart;
				let customVolumeTickEnd:   number = startPin.volume + (endPin.volume - startPin.volume) * pinRatioEnd;
				let transitionVolumeTickStart: number = 1.0;
				let transitionVolumeTickEnd:   number = 1.0;
				let intervalTickStart: number = startPin.interval + (endPin.interval - startPin.interval) * pinRatioStart;
				let intervalTickEnd:   number = startPin.interval + (endPin.interval - startPin.interval) * pinRatioEnd;
				let decayTimeTickStart: number = partTimeTickStart - note.start;
				let decayTimeTickEnd:   number = partTimeTickEnd - note.start;
				
				resetPhases = (tickTimeStart + startRatio - noteStartTick == 0.0) || !toneWasActive;
				
				// if seamless, don't reset phases at start. (it's probably not necessary to constantly reset phases if there are no notes? Just do it once when note starts? But make sure that reset phases doesn't also reset stuff that this function did to set up the tone. Remember when the first run length was lost!
				// if slide, average the interval, decayTime, and custom volume at the endpoints and interpolate between over slide duration.
				// note that currently seamless and slide make different assumptions about whether a note at the end of a bar will connect with the next bar!
				const transition: number = instrument.transition;
				const maximumTransitionTicks: number = noteLengthTicks * 0.5;
				if (Config.transitionIsSeamless[transition] && !Config.transitionSlides[transition] && note.start == 0) {
					// Special case for seamless, no-slide transition: assume the previous bar ends with another seamless note, don't reset tone history.
					resetPhases = !toneWasActive;
				} else if (Config.transitionIsSeamless[transition] && prevNote != null) {
					resetPhases = !toneWasActive;
					if (Config.transitionSlides[transition]) {
						const slideTicks: number = Math.min(maximumTransitionTicks, Config.transitionSlideTicks[transition]);
						const slideRatioStartTick: number = Math.max(0.0, 1.0 - noteTicksPassedTickStart / slideTicks);
						const slideRatioEndTick:   number = Math.max(0.0, 1.0 - noteTicksPassedTickEnd / slideTicks);
						const intervalDiff: number = ((prevNote.pitches[0] + prevNote.pins[prevNote.pins.length-1].interval) - note.pitches[0]) * 0.5;
						const volumeDiff: number = (prevNote.pins[prevNote.pins.length-1].volume - note.pins[0].volume) * 0.5;
						const decayTimeDiff: number = (prevNote.end - prevNote.start) * 0.5;
						intervalTickStart += slideRatioStartTick * intervalDiff;
						intervalTickEnd += slideRatioEndTick * intervalDiff;
						customVolumeTickStart += slideRatioStartTick * volumeDiff;
						customVolumeTickEnd += slideRatioEndTick * volumeDiff;
						decayTimeTickStart += slideRatioStartTick * decayTimeDiff;
						decayTimeTickEnd += slideRatioEndTick * decayTimeDiff;
					}
				} else {
					const attackTicks: number = Math.min(maximumTransitionTicks, Config.transitionAttackTicks[transition]);
					if (attackTicks > 0.0) {
						transitionVolumeTickStart *= Math.min(1.0, noteTicksPassedTickStart / attackTicks);
						transitionVolumeTickEnd   *= Math.min(1.0, noteTicksPassedTickEnd / attackTicks);
					}
				}
				if (Config.transitionIsSeamless[transition] && !Config.transitionSlides[transition] && note.end == Config.partsPerBeat * song.beatsPerBar) {
					// Special case for seamless, no-slide transition: assume the next bar starts with another seamless note, don't fade out.
				} else if (Config.transitionIsSeamless[transition] && nextNote != null) {
					if (Config.transitionSlides[transition]) {
						const slideTicks: number = Math.min(maximumTransitionTicks, Config.transitionSlideTicks[transition]);
						const slideRatioStartTick: number = Math.max(0.0, 1.0 - (noteLengthTicks - noteTicksPassedTickStart) / slideTicks);
						const slideRatioEndTick:   number = Math.max(0.0, 1.0 - (noteLengthTicks - noteTicksPassedTickEnd) / slideTicks);
						const intervalDiff: number = (nextNote.pitches[0] - (note.pitches[0] + note.pins[note.pins.length-1].interval)) * 0.5;
						const volumeDiff: number = (nextNote.pins[0].volume - note.pins[note.pins.length-1].volume) * 0.5;
						const decayTimeDiff: number = -(note.end - note.start) * 0.5;
						intervalTickStart += slideRatioStartTick * intervalDiff;
						intervalTickEnd += slideRatioEndTick * intervalDiff;
						customVolumeTickStart += slideRatioStartTick * volumeDiff;
						customVolumeTickEnd += slideRatioEndTick * volumeDiff;
						decayTimeTickStart += slideRatioStartTick * decayTimeDiff;
						decayTimeTickEnd += slideRatioEndTick * decayTimeDiff;
					}
				} else if (!Config.transitionReleases[transition]) {
					const releaseTicks: number = Math.min(maximumTransitionTicks, Config.transitionReleaseTicks[transition]);
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
			
			if (pitches != null) {
				const sampleTime: number = 1.0 / synth.samplesPerSecond;
				tone.active = true;
				
				if (instrument.type == InstrumentType.chip || instrument.type == InstrumentType.fm) {
					let lfoEffectStart: number = 0.0;
					let lfoEffectEnd:   number = 0.0;
					for (const vibratoPeriod of Config.vibratoPeriods[instrument.vibrato]) {
						lfoEffectStart += Math.sin(Math.PI * 2.0 * secondsPerPart * partTimeStart / vibratoPeriod);
						lfoEffectEnd += Math.sin(Math.PI * 2.0 * secondsPerPart * partTimeEnd   / vibratoPeriod);
					}
					const vibratoScale: number = (partsSinceStart < Config.vibratoDelays[instrument.vibrato]) ? 0.0 : Config.vibratoAmplitudes[instrument.vibrato];
					const tremoloScale: number = Config.effectTremolos[instrument.vibrato];
					const vibratoStart: number = vibratoScale * lfoEffectStart;
					const vibratoEnd:   number = vibratoScale * lfoEffectEnd;
					const tremoloStart: number = 1.0 + tremoloScale * (lfoEffectStart - 1.0);
					const tremoloEnd:   number = 1.0 + tremoloScale * (lfoEffectEnd - 1.0);
					
					intervalStart += vibratoStart;
					intervalEnd   += vibratoEnd;
					transitionVolumeStart *= tremoloStart;
					transitionVolumeEnd   *= tremoloEnd;
				}
				
				const filterVolume: number = Synth.setUpResonantFilter(synth, instrument, tone, runLength, secondsPerPart, beatsPerPart, decayTimeStart, decayTimeEnd, partTimeStart, partTimeEnd, customVolumeStart, customVolumeEnd);
				
				if (resetPhases) {
					tone.reset();
				}
				
				if (instrument.type == InstrumentType.fm) {
					// phase modulation!
					
					let sineVolumeBoost: number = 1.0;
					let totalCarrierVolume: number = 0.0;
					
					const carrierCount: number = Config.operatorCarrierCounts[instrument.algorithm];
					for (let i: number = 0; i < Config.operatorCount; i++) {
						const associatedCarrierIndex: number = Config.operatorAssociatedCarrier[instrument.algorithm][i] - 1;
						const pitch: number = pitches[(i < pitches.length) ? i : ((associatedCarrierIndex < pitches.length) ? associatedCarrierIndex : 0)];
						const freqMult = Config.operatorFrequencies[instrument.operators[i].frequency];
						const interval = Config.operatorCarrierInterval[associatedCarrierIndex];
						const startPitch: number = (pitch + intervalStart) * intervalScale + interval;
						const startFreq: number = freqMult * (synth.frequencyFromPitch(basePitch + startPitch)) + Config.operatorHzOffsets[instrument.operators[i].frequency];
						
						tone.phaseDeltas[i] = startFreq * sampleTime * Config.sineWaveLength;
						
						const amplitudeCurve: number = Synth.operatorAmplitudeCurve(instrument.operators[i].amplitude);
						const amplitudeMult: number = amplitudeCurve * Config.operatorAmplitudeSigns[instrument.operators[i].frequency];
						let volumeStart: number = amplitudeMult;
						let volumeEnd: number = amplitudeMult;
						if (i < carrierCount) {
							// carrier
							const endPitch: number = (pitch + intervalEnd) * intervalScale;
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
					
					const volumeMult: number = 0.15;
					tone.volumeStart = filterVolume * volumeMult * transitionVolumeStart;
					tone.volumeDelta = filterVolume * volumeMult * (transitionVolumeEnd - transitionVolumeStart) / runLength;
					
					sineVolumeBoost *= 1.0 - instrument.feedbackAmplitude / 15.0;
					sineVolumeBoost *= 1.0 - Math.min(1.0, Math.max(0.0, totalCarrierVolume - 1) / 2.0);
					tone.volumeStart *= 1.0 + sineVolumeBoost * 3.0;
					tone.volumeDelta *= 1.0 + sineVolumeBoost * 3.0;
				} else {
					let pitch: number = pitches[0];
					
					if (pitches.length > 1) {
						const arpeggio: number = Math.floor((synth.tick + synth.part * Config.ticksPerPart) / Config.ticksPerArpeggio[song.rhythm]);
						if (Config.intervalHarmonizes[instrument.interval]) {
							const arpeggioPattern: ReadonlyArray<number> = Config.arpeggioPatterns[song.rhythm][pitches.length - 2];
							const harmonyOffset: number = pitches[1 + arpeggioPattern[arpeggio % arpeggioPattern.length]] - pitches[0];
							tone.harmonyMult = Math.pow(2.0, harmonyOffset / 12.0);
							tone.harmonyVolumeMult = Math.pow(2.0, -harmonyOffset / pitchDamping)
						} else {
							const arpeggioPattern: ReadonlyArray<number> = Config.arpeggioPatterns[song.rhythm][pitches.length - 1];
							pitch = pitches[arpeggioPattern[arpeggio % arpeggioPattern.length]];
						}
					}
					
					const startPitch: number = (pitch + intervalStart) * intervalScale;
					const endPitch: number = (pitch + intervalEnd) * intervalScale;
					const startFreq: number = synth.frequencyFromPitch(basePitch + startPitch);
					const pitchVolumeStart: number = Math.pow(2.0, -startPitch / pitchDamping);
					const pitchVolumeEnd: number   = Math.pow(2.0,   -endPitch / pitchDamping);
					let settingsVolumeMult: number;
					if (!isDrum) {
						settingsVolumeMult = 0.27 * 0.5 * Config.waveVolumes[instrument.wave] * filterVolume * Config.intervalVolumes[instrument.interval];
					} else {
						settingsVolumeMult = 0.19 * Config.drumVolumes[instrument.wave] * 5.0 * filterVolume;
					}
					
					tone.phaseDeltas[0] = startFreq * sampleTime;
					
					const instrumentVolumeMult: number = (instrument.volume == 5) ? 0.0 : Math.pow(2, -Config.volumeValues[instrument.volume]);
					tone.volumeStart = transitionVolumeStart * pitchVolumeStart * settingsVolumeMult * instrumentVolumeMult;
					let volumeEnd: number = transitionVolumeEnd * pitchVolumeEnd * settingsVolumeMult * instrumentVolumeMult;
					
					if (Config.operatorEnvelopeType[instrument.filterEnvelope] != EnvelopeType.custom) {
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
			
			let filterVolume: number = -0.1 * (instrument.filterCutoff - (Config.filterCutoffRange - 1));
			const envelopeType: EnvelopeType = Config.operatorEnvelopeType[instrument.filterEnvelope];
			if (envelopeType == EnvelopeType.decay) filterVolume = (filterVolume + 1) * 0.5;
			return Math.max(0.2, filterVolume);
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
								for (let j: number = 0; j < Config.operatorCarrierCounts[instrument.algorithm]; j++) {
									outputs.push("operator" + j + "Scaled");
								}
								synthSource.push(line.replace("/*operator#Scaled*/", outputs.join(" + ")));
							}
						} else if (line.indexOf("// INSERT OPERATOR COMPUTATION HERE") != -1) {
							for (let j: number = Config.operatorCount - 1; j >= 0; j--) {
								for (const operatorLine of Synth.operatorSourceTemplate) {
									if (operatorLine.indexOf("/* + operator@Scaled*/") != -1) {
										let modulators = "";
										for (const modulatorNumber of Config.operatorModulatedBy[instrument.algorithm][j]) {
											modulators += " + operator" + (modulatorNumber - 1) + "Scaled";
										}
									
										const feedbackIndices: ReadonlyArray<number> = Config.operatorFeedbackIndices[instrument.feedbackType][j];
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
			const wave: Float64Array = Config.waves[instrument.wave];
			const waveLength: number = +wave.length;
			
			const intervalA: number = +Math.pow(2.0, (Config.intervalOffsets[instrument.interval] + Config.intervalSpreads[instrument.interval]) / 12.0);
			const intervalB: number =  Math.pow(2.0, (Config.intervalOffsets[instrument.interval] - Config.intervalSpreads[instrument.interval]) / 12.0) * tone.harmonyMult;
			const intervalSign: number = tone.harmonyVolumeMult * Config.intervalSigns[instrument.interval];
			if (instrument.interval == 0) tone.phases[1] = tone.phases[0];
			const deltaRatio: number = intervalB / intervalA;
			let phaseDelta: number = tone.phaseDeltas[0] * intervalA * waveLength;
			const phaseDeltaScale: number = +tone.phaseDeltaScale;
			let volume: number = +tone.volumeStart;
			const volumeDelta: number = +tone.volumeDelta;
			let phaseA: number = (tone.phases[0] % 1) * waveLength;
			let phaseB: number = (tone.phases[1] % 1) * waveLength;
			let sample: number = +tone.sample;
			
			let filter1: number = +tone.filter;
			let filter2: number = (instrument.filterResonance == 0) ? 1.0 : filter1;
			const filterScale1: number = +tone.filterScale;
			const filterScale2: number = (instrument.filterResonance == 0) ? 1.0 : filterScale1;
			const filterResonance = Config.filterMaxResonance * Math.pow(Math.max(0, instrument.filterResonance - 1) / (Config.filterResonanceRange - 2), 0.5);
			let filterSample0: number = +tone.filterSample0;
			let filterSample1: number = +tone.filterSample1;
			
			const stopIndex: number = bufferIndex + runLength;
			while (bufferIndex < stopIndex) {
				const waveA: number = wave[(0|phaseA) % waveLength];
				const waveB: number = wave[(0|phaseB) % waveLength] * intervalSign;
				const combinedWave: number = (waveA + waveB);
				
				const feedback: number = filterResonance + filterResonance / (1.0 - filter1);
				filterSample0 += filter1 * (combinedWave - filterSample0 + feedback * (filterSample0 - filterSample1));
				filterSample1 += filter2 * (filterSample0 - filterSample1);
				sample = filterSample1 * volume;
				
				volume += volumeDelta;
				phaseA += phaseDelta;
				phaseB += phaseDelta * deltaRatio;
				filter1 *= filterScale1;
				filter2 *= filterScale2;
				phaseDelta *= phaseDeltaScale;
				
				data[bufferIndex] += sample;
				bufferIndex++;
			}
			
			tone.phases[0] = phaseA / waveLength;
			tone.phases[1] = phaseB / waveLength;
			tone.sample = sample;
			
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
			var sample = +tone.sample;
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
				var fmOutput = (/*operator#Scaled*/); // CARRIER OUTPUTS
				
				var feedback = filterResonance + filterResonance / (1.0 - filter1);
				filterSample0 += filter1 * (fmOutput - filterSample0 + feedback * (filterSample0 - filterSample1));
				filterSample1 += filter2 * (filterSample0 - filterSample1);
				sample = filterSample1 * volume;
				
				volume += volumeDelta;
				feedbackMult += feedbackDelta;
				operator#OutputMult += operator#OutputDelta;
				operator#Phase += operator#PhaseDelta;
				operator#PhaseDelta *= phaseDeltaScale;
				filter1 *= filterScale1;
				filter2 *= filterScale2;
				
				data[bufferIndex] += sample;
				bufferIndex++;
			}
			
			tone.phases[#] = operator#Phase / ` + Config.sineWaveLength + `;
			tone.feedbackOutputs[#] = operator#Output;
			tone.sample = sample;
			
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
			
			const pitchRelativefilter: number = Config.drumWaveIsSoft[instrument.wave]
				? Math.min(1.0, tone.phaseDeltas[0] * Config.drumPitchFilterMult[instrument.wave])
				: 1.0;
			
			const stopIndex: number = bufferIndex + runLength;
			while (bufferIndex < stopIndex) {
				const waveSample: number = wave[phase & 0x7fff];
				
				const feedback: number = filterResonance + filterResonance / (1.0 - filter1);
				filterSample0 += filter1 * (waveSample - filterSample0 + feedback * (filterSample0 - filterSample1));
				filterSample1 += filter2 * (filterSample0 - filterSample1);
				
				sample += (filterSample1 - sample) * pitchRelativefilter;
				
				phase += phaseDelta;
				filter1 *= filterScale1;
				filter2 *= filterScale2;
				phaseDelta *= phaseDeltaScale;
				data[bufferIndex] += sample * volume;
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
