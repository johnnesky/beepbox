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
	interface Dictionary<T> {
		[K: string]: T;
	}
	
	const enum EnvelopeType {
		custom,
		steady,
		punch,
		feather,
		pluck,
		tremolo,
	}
	
	export const enum InstrumentType {
		chip = 0,
		fm = 1,
		noise = 2,
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
		public static readonly partNames: ReadonlyArray<string> = ["÷3 (triplets)", "÷4 (standard)", "÷6", "÷8"];
		public static readonly partCounts: ReadonlyArray<number> = [3, 4, 6, 8];
		public static readonly waveNames: ReadonlyArray<string> = ["triangle", "square", "pulse wide", "pulse narrow", "sawtooth", "double saw", "double pulse", "spiky", "plateau"];
		public static readonly waveVolumes: ReadonlyArray<number> = [1.0,         0.5,       0.5,          0.5,          0.65,          0.5,          0.4,         0.4,      0.94];
		// the "clang" and "buzz" drums are inspired by similar drums in the modded beepbox! :D
		public static readonly drumNames: ReadonlyArray<string> = ["retro", "white", "clang", "buzz", "hollow"];
		public static readonly drumVolumes: ReadonlyArray<number> = [0.25, 1.0, 0.4, 0.3, 1.5];
		public static readonly drumBasePitches: ReadonlyArray<number> = [69, 69, 69, 69, 96];
		public static readonly drumPitchFilterMult: ReadonlyArray<number> = [100.0, 8.0, 100.0, 100.0, 1.0];
		public static readonly drumWaveIsSoft: ReadonlyArray<boolean> = [false, true, false, false, true];
		public static readonly filterNames: ReadonlyArray<string> = ["sustain sharp", "sustain medium", "sustain soft", "decay sharp", "decay medium", "decay soft"];
		public static readonly filterBases: ReadonlyArray<number> = [2.0, 3.5, 5.0, 1.0, 2.5, 4.0];
		public static readonly filterDecays: ReadonlyArray<number> = [0.0, 0.0, 0.0, 10.0, 7.0, 4.0];
		public static readonly filterVolumes: ReadonlyArray<number> = [0.4, 0.7, 1.0, 0.5, 0.75, 1.0];
		public static readonly transitionNames: ReadonlyArray<string> = ["seamless", "sudden", "smooth", "slide"];
		public static readonly effectNames: ReadonlyArray<string> = ["none", "vibrato light", "vibrato delayed", "vibrato heavy", "tremolo light", "tremolo heavy"];
		public static readonly effectVibratos: ReadonlyArray<number> = [0.0, 0.15, 0.3, 0.45, 0.0, 0.0];
		public static readonly effectTremolos: ReadonlyArray<number> = [0.0, 0.0, 0.0, 0.0, 0.25, 0.5];
		public static readonly effectVibratoDelays: ReadonlyArray<number> = [0, 0, 3, 0, 0, 0];
		public static readonly chorusNames: ReadonlyArray<string> = ["union", "shimmer", "hum", "honky tonk", "dissonant", "fifths", "octaves", "bowed", "custom harmony"];
		public static readonly chorusIntervals: ReadonlyArray<number> = [0.0, 0.02, 0.05, 0.1, 0.25, 3.5, 6, 0.02, 0.05];
		public static readonly chorusOffsets: ReadonlyArray<number> = [0.0, 0.0, 0.0, 0.0, 0.0, 3.5, 6, 0.0, 0.0];
		public static readonly chorusVolumes: ReadonlyArray<number> = [0.7, 0.8, 1.0, 1.0, 0.9, 0.9, 0.8, 1.0, 1.0];
		public static readonly chorusHarmonizes: ReadonlyArray<boolean> = [false, false, false, false, false, false, false, false, true];
		public static readonly volumeNames: ReadonlyArray<string> = ["loudest", "loud", "medium", "quiet", "quietest", "mute"];
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
		public static readonly operatorCarrierChorus: ReadonlyArray<number> = [0.0, 0.04, -0.073, 0.091];
		public static readonly operatorAmplitudeMax: number = 15;
		public static readonly operatorFrequencyNames: ReadonlyArray<string> = ["×1", "×1.ε", "×2", "×2.ε", "×3", "×4", "×5", "×6", "×7", "×8", "×9", "×11", "×13", "×15"];
		public static readonly midiFrequencyNames: ReadonlyArray<string> = ["x1", "x1.e", "x2", "x2.e", "x3", "x4", "x5", "x6", "x7", "x8", "x9", "x11", "x13", "x15"];
		public static readonly operatorFrequencies: ReadonlyArray<number> =    [ 1.0,   1.0,   2.0,   2.0,  3.0,  4.0,  5.0,  6.0,  7.0,  8.0,  9.0,  11.0,  13.0,  15.0];
		public static readonly operatorHzOffsets: ReadonlyArray<number> =      [ 0.0,   1.5,   0.0,  -1.3,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0,   0.0,   0.0,   0.0];
		public static readonly operatorAmplitudeSigns: ReadonlyArray<number> = [ 1.0,  -1.0,   1.0,  -1.0,  1.0,  1.0,  1.0,  1.0,  1.0,  1.0,  1.0,   1.0,   1.0,   1.0];
		public static readonly operatorEnvelopeNames: ReadonlyArray<string> = ["custom", "steady", "punch", "feather", "pluck1", "pluck2", "pluck3", "swell1", "swell2", "swell3", "tremolo1", "tremolo2", "tremolo3"];
		public static readonly operatorEnvelopeType: ReadonlyArray<EnvelopeType> = [EnvelopeType.custom, EnvelopeType.steady, EnvelopeType.punch, EnvelopeType.feather, EnvelopeType.pluck, EnvelopeType.pluck, EnvelopeType.pluck, EnvelopeType.pluck, EnvelopeType.pluck, EnvelopeType.pluck, EnvelopeType.tremolo, EnvelopeType.tremolo, EnvelopeType.tremolo];
		public static readonly operatorEnvelopeSpeed: ReadonlyArray<number> = [0.0, 0.0, 0.0, 4.0, 32.0, 8.0, 2.0, 32.0, 8.0, 2.0, 4.0, 2.0, 1.0];
		public static readonly operatorEnvelopeInverted: ReadonlyArray<boolean> = [false, false, false, false, false, false, false, true, true, true, false, false, false];
		public static readonly operatorFeedbackNames: ReadonlyArray<string> = [
			"1⟲",
			"2⟲",
			"3⟲",
			"4⟲",
			"1⟲ 2⟲",
			"1⟲ 2⟲ 3⟲",
			"1⟲ 2⟲ 3⟲ 4⟲",
			"2⟲ 3⟲ 4⟲",
			"3⟲ 4⟲",
			"1→2",
			"1→3",
			"1→4",
			"2→3",
			"2→4",
			"3→4",
			"1→3 2→4",
			"1→4 2→3",
			"1→2→3→4",
			"1⟲ 2→3",
			"1⟲ 2→4",
			"1⟲ 2⟲ 3→4",
		];
		public static readonly midiFeedbackNames: ReadonlyArray<string> = ["1", "2", "3", "4", "1 2", "1 2 3", "1 2 3 4", "2 3 4", "3 4", "1>2", "1>3", "1>4", "2>3", "2>4", "3>4", "1>3 2>4", "1>4 2>3", "1>2>3>4", "1 2>3", "1 2>4", "1 2 3>4"];
		public static readonly operatorFeedbackIndices: ReadonlyArray<ReadonlyArray<ReadonlyArray<number>>> = [
			[[1], [], [], []],
			[[], [2], [], []],
			[[], [], [3], []],
			[[], [], [], [4]],
			[[1], [2], [], []],
			[[1], [2], [3], []],
			[[1], [2], [3], [4]],
			[[], [2], [3], [4]],
			[[], [], [3], [4]],
			[[], [1], [], []],
			[[], [], [1], []],
			[[], [], [], [1]],
			[[], [], [2], []],
			[[], [], [], [2]],
			[[], [], [], [3]],
			[[], [], [1], [2]],
			[[], [], [2], [1]],
			[[], [1], [2], [3]],
			[[1], [], [2], []],
			[[1], [], [], [2]],
			[[1], [2], [], [3]],
		];
		public static readonly pitchChannelTypeNames: ReadonlyArray<string> = ["chip (simple)", "FM (expert)"];
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
			Config._centerWave([1.0/15.0, 3.0/15.0, 5.0/15.0, 7.0/15.0, 9.0/15.0, 11.0/15.0, 13.0/15.0, 15.0/15.0, 15.0/15.0, 13.0/15.0, 11.0/15.0, 9.0/15.0, 7.0/15.0, 5.0/15.0, 3.0/15.0, 1.0/15.0, -1.0/15.0, -3.0/15.0, -5.0/15.0, -7.0/15.0, -9.0/15.0, -11.0/15.0, -13.0/15.0, -15.0/15.0, -15.0/15.0, -13.0/15.0, -11.0/15.0, -9.0/15.0, -7.0/15.0, -5.0/15.0, -3.0/15.0, -1.0/15.0]),
			Config._centerWave([1.0, -1.0]),
			Config._centerWave([1.0, -1.0, -1.0, -1.0]),
			Config._centerWave([1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0]),
			Config._centerWave([1.0/31.0, 3.0/31.0, 5.0/31.0, 7.0/31.0, 9.0/31.0, 11.0/31.0, 13.0/31.0, 15.0/31.0, 17.0/31.0, 19.0/31.0, 21.0/31.0, 23.0/31.0, 25.0/31.0, 27.0/31.0, 29.0/31.0, 31.0/31.0, -31.0/31.0, -29.0/31.0, -27.0/31.0, -25.0/31.0, -23.0/31.0, -21.0/31.0, -19.0/31.0, -17.0/31.0, -15.0/31.0, -13.0/31.0, -11.0/31.0, -9.0/31.0, -7.0/31.0, -5.0/31.0, -3.0/31.0, -1.0/31.0]),
			Config._centerWave([0.0, -0.2, -0.4, -0.6, -0.8, -1.0, 1.0, -0.8, -0.6, -0.4, -0.2, 1.0, 0.8, 0.6, 0.4, 0.2]),
			Config._centerWave([1.0, 1.0, 1.0, 1.0, 1.0, -1.0, -1.0, -1.0, 1.0, 1.0, 1.0, 1.0, -1.0, -1.0, -1.0, -1.0]),
			Config._centerWave([1.0, -1.0, 1.0, -1.0, 1.0, 0.0]),
			Config._centerWave([0.0, 0.2, 0.4, 0.5, 0.6, 0.7, 0.8, 0.85, 0.9, 0.95, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 0.95, 0.9, 0.85, 0.8, 0.7, 0.6, 0.5, 0.4, 0.2, 0.0, -0.2, -0.4, -0.5, -0.6, -0.7, -0.8, -0.85, -0.9, -0.95, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -0.95, -0.9, -0.85, -0.8, -0.7, -0.6, -0.5, -0.4, -0.2]),
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
		
		// Drum waves have too many samples to write by hand, they're generated on-demand by getDrumWave instead.
		private static readonly _drumWaves: Array<Float32Array | null> = [null, null, null, null, null];
		
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
					// "Hollow" drums, designed in frequency space and then converted via FFT:
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
					inverseRealFourierTransform(wave);
					scaleElementsByFactor(wave, 1.0 / Math.sqrt(wave.length));
				} else {
					throw new Error("Unrecognized drum index: " + index);
				}
			}
			
			return wave;
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
		effect = CharCode.c,
		transition = CharCode.d,
		loopEnd = CharCode.e,
		filter = CharCode.f,
		barCount = CharCode.g,
		chorus = CharCode.h,
		instrumentCount = CharCode.i,
		patternCount = CharCode.j,
		key = CharCode.k,
		loopStart = CharCode.l,
		reverb = CharCode.m,
		channelCount = CharCode.n,
		channelOctave = CharCode.o,
		patterns = CharCode.p,
		
		rhythm = CharCode.r,
		scale = CharCode.s,
		tempo = CharCode.t,
		
		volume = CharCode.v,
		wave = CharCode.w,
		
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
		public amplitude: number = 0;
		public envelope: number = 0;
		public frequency: number = 0;
		
		constructor(index: number) {
			this.reset(index);
		}
		
		public reset(index: number): void {
			this.frequency = 0;
			this.amplitude = (index <= 1) ? Config.operatorAmplitudeMax : 0;
			this.envelope = (index == 0) ? 0 : 1;
		}
	}
	
	export class Instrument {
		public type: InstrumentType = 0;
		public wave: number = 1;
		public filter: number = 0;
		public transition: number = 1;
		public effect: number = 0;
		public chorus: number = 0;
		public volume: number = 0;
		public algorithm: number = 0;
		public feedbackType: number = 0;
		public feedbackAmplitude: number = 0;
		public feedbackEnvelope: number = 0;
		public readonly operators: Operator[] = [];
		
		constructor() {
			for (let i = 0; i < Config.operatorCount; i++) {
				this.operators.push(new Operator(i));
			}
		}
		
		public reset(): void {
			this.type = 0;
			this.wave = 1;
			this.filter = 0;
			this.transition = 1;
			this.effect = 0;
			this.chorus = 0;
			this.volume = 0;
			this.algorithm = 0;
			this.feedbackType = 0;
			this.feedbackAmplitude = 0;
			this.feedbackEnvelope = 1;
			for (let i: number = 0; i < this.operators.length; i++) {
				this.operators[i].reset(i);
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
		private static readonly _latestVersion: number = 6;
		private static readonly _base64CharCodeToInt: ReadonlyArray<number> = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,62,62,0,0,1,2,3,4,5,6,7,8,9,0,0,0,0,0,0,0,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,0,0,0,0,63,0,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,0,0,0,0,0]; // 62 could be represented by either "-" or "." for historical reasons. New songs should use "-".
		private static readonly _base64IntToCharCode: ReadonlyArray<number> = [48,49,50,51,52,53,54,55,56,57,97,98,99,100,101,102,103,104,105,106,107,108,109,110,111,112,113,114,115,116,117,118,119,120,121,122,65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80,81,82,83,84,85,86,87,88,89,90,45,95];
		
		public scale: number;
		public key: number;
		public tempo: number;
		public reverb: number;
		public beatsPerBar: number;
		public barCount: number;
		public patternsPerChannel: number;
		public partsPerBeat: number;
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
				this.initToDefault();
			}
		}
		
		public getChannelCount(): number {
			return this.pitchChannelCount + this.drumChannelCount;
		}
		
		public getChannelIsDrum(channel: number): boolean {
			return (channel >= this.pitchChannelCount);
		}
		
		public getChannelColorDim(channel: number): string {
			return channel < this.pitchChannelCount ? Config.pitchChannelColorsDim[channel] : Config.drumChannelColorsDim[channel - this.pitchChannelCount];
		}
		public getChannelColorBright(channel: number): string {
			return channel < this.pitchChannelCount ? Config.pitchChannelColorsBright[channel] : Config.drumChannelColorsBright[channel - this.pitchChannelCount];
		}
		public getNoteColorDim(channel: number): string {
			return channel < this.pitchChannelCount ? Config.pitchNoteColorsDim[channel] : Config.drumNoteColorsDim[channel - this.pitchChannelCount];
		}
		public getNoteColorBright(channel: number): string {
			return channel < this.pitchChannelCount ? Config.pitchNoteColorsBright[channel] : Config.drumNoteColorsBright[channel - this.pitchChannelCount];
		}
		
		public initToDefault(): void {
			this.scale = 0;
			this.key = Config.keyNames.length - 1;
			this.loopStart = 0;
			this.loopLength = 4;
			this.tempo = 7;
			this.reverb = 0;
			this.beatsPerBar = 8;
			this.barCount = 16;
			this.patternsPerChannel = 8;
			this.partsPerBeat = 4;
			this.instrumentsPerChannel = 1;
			this.pitchChannelCount = 3;
			this.drumChannelCount = 1;
			
			// TODO: It's kinda wasteful to discard channels, patterns, and instruments just because they're
			// not included in the default settings. Maybe leave them there once the've been created, but
			// just don't use them until a song is loaded that needs them.
			for (let channelIndex = 0; channelIndex < this.getChannelCount(); channelIndex++) {
				if (this.channels.length <= channelIndex) {
					this.channels[channelIndex] = new Channel(/*channelIndex >= this.pitchChannelCount*/);
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
					} else {
						channel.instruments[instrument].reset();
					}
				}
				channel.instruments.length = this.instrumentsPerChannel;
				
				for (let bar = 0; bar < this.barCount; bar++) {
					channel.bars[bar] = 1;
				}
				channel.bars.length = this.barCount;
			}
			this.channels.length = this.getChannelCount();
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
			buffer.push(SongTagCode.rhythm, base64IntToCharCode[Config.partCounts.indexOf(this.partsPerBeat)]);
			
			buffer.push(SongTagCode.channelOctave);
			for (let channel: number = 0; channel < this.getChannelCount(); channel++) {
				buffer.push(base64IntToCharCode[this.channels[channel].octave]);
			}
			
			for (let channel: number = 0; channel < this.getChannelCount(); channel++) {
				for (let i: number = 0; i < this.instrumentsPerChannel; i++) {
					const instrument: Instrument = this.channels[channel].instruments[i];
					
					if (channel < this.pitchChannelCount) {
						buffer.push(SongTagCode.startInstrument, base64IntToCharCode[instrument.type]);
						if (instrument.type == InstrumentType.chip) {
							// chip
							buffer.push(SongTagCode.wave, base64IntToCharCode[instrument.wave]);
							buffer.push(SongTagCode.filter, base64IntToCharCode[instrument.filter]);
							buffer.push(SongTagCode.transition, base64IntToCharCode[instrument.transition]);
							buffer.push(SongTagCode.effect, base64IntToCharCode[instrument.effect]);
							buffer.push(SongTagCode.chorus,base64IntToCharCode[instrument.chorus]);
							buffer.push(SongTagCode.volume, base64IntToCharCode[instrument.volume]);
						} else if (instrument.type == InstrumentType.fm) {
							// FM
							buffer.push(SongTagCode.transition, base64IntToCharCode[instrument.transition]);
							buffer.push(SongTagCode.effect, base64IntToCharCode[instrument.effect]);
							
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
						} else {
							throw new Error("Unknown instrument type.");
						}
					} else {
						// drum
						buffer.push(SongTagCode.startInstrument, base64IntToCharCode[InstrumentType.noise]);
						buffer.push(SongTagCode.wave, base64IntToCharCode[instrument.wave]);
						buffer.push(SongTagCode.transition, base64IntToCharCode[instrument.transition]);
						buffer.push(SongTagCode.volume, base64IntToCharCode[instrument.volume]);
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
				for (const p of this.channels[channel].patterns) {
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
						
						if (curPart < this.beatsPerBar * this.partsPerBeat) {
							bits.write(2, 0); // rest
							bits.writePartDuration(this.beatsPerBar * this.partsPerBeat - curPart);
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
			const beforeSix:   boolean = version < 6;
			const base64CharCodeToInt: ReadonlyArray<number> = Song._base64CharCodeToInt;
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
					this.pitchChannelCount = Song._clip(Config.pitchChannelCountMin, Config.pitchChannelCountMax + 1, this.pitchChannelCount);
					this.drumChannelCount = Song._clip(Config.drumChannelCountMin, Config.drumChannelCountMax + 1, this.drumChannelCount);
					for (let channelIndex = this.channels.length; channelIndex < this.getChannelCount(); channelIndex++) {
						this.channels[channelIndex] = new Channel(/*channelIndex >= this.pitchChannelCount*/);
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
					this.tempo = Song._clip(0, Config.tempoSteps, this.tempo);
				} else if (command == SongTagCode.reverb) {
					this.reverb = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
					this.reverb = Song._clip(0, Config.reverbRange, this.reverb);
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
						for (let instrument = this.channels[channel].instruments.length; instrument < this.instrumentsPerChannel; instrument++) {
							this.channels[channel].instruments[instrument] = new Instrument();
						}
						this.channels[channel].instruments.length = this.instrumentsPerChannel;
					}
				} else if (command == SongTagCode.rhythm) {
					this.partsPerBeat = Config.partCounts[base64CharCodeToInt[compressed.charCodeAt(charIndex++)]];
				} else if (command == SongTagCode.channelOctave) {
					if (beforeThree) {
						channel = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
						this.channels[channel].octave = Song._clip(0, 5, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
					} else {
						for (channel = 0; channel < this.getChannelCount(); channel++) {
							this.channels[channel].octave = Song._clip(0, 5, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
						}
					}
				} else if (command == SongTagCode.startInstrument) {
					instrumentIndexIterator++;
					if (instrumentIndexIterator >= this.instrumentsPerChannel) {
						instrumentChannelIterator++;
						instrumentIndexIterator = 0;
					}
					this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].type = Song._clip(0, 2, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
				} else if (command == SongTagCode.wave) {
					if (beforeThree) {
						channel = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
						this.channels[channel].instruments[0].wave = Song._clip(0, Config.waveNames.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
					} else if (beforeSix) {
						for (channel = 0; channel < this.getChannelCount(); channel++) {
							const isDrums = (channel >= this.pitchChannelCount);
							for (let i: number = 0; i < this.instrumentsPerChannel; i++) {
								this.channels[channel].instruments[i].wave = Song._clip(0, isDrums ? Config.drumNames.length : Config.waveNames.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
							}
						}
					} else {
						const isDrums = (instrumentChannelIterator >= this.pitchChannelCount);
						this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].wave = Song._clip(0, isDrums ? Config.drumNames.length : Config.waveNames.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
					}
				} else if (command == SongTagCode.filter) {
					if (beforeThree) {
						channel = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
						this.channels[channel].instruments[0].filter = [0, 2, 3, 5][Song._clip(0, Config.filterNames.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)])];
					} else if (beforeSix) {
						for (channel = 0; channel < this.getChannelCount(); channel++) {
							for (let i: number = 0; i < this.instrumentsPerChannel; i++) {
								this.channels[channel].instruments[i].filter = Song._clip(0, Config.filterNames.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
							}
						}
					} else {
						this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].filter = Song._clip(0, Config.filterNames.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
					}
				} else if (command == SongTagCode.transition) {
					if (beforeThree) {
						channel = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
						this.channels[channel].instruments[0].transition = Song._clip(0, Config.transitionNames.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
					} else if (beforeSix) {
						for (channel = 0; channel < this.getChannelCount(); channel++) {
							for (let i: number = 0; i < this.instrumentsPerChannel; i++) {
								this.channels[channel].instruments[i].transition = Song._clip(0, Config.transitionNames.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
							}
						}
					} else {
						this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].transition = Song._clip(0, Config.transitionNames.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
					}
				} else if (command == SongTagCode.effect) {
					if (beforeThree) {
						channel = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
						let effect: number = Song._clip(0, Config.effectNames.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
						if (effect == 1) effect = 3;
						else if (effect == 3) effect = 5;
						this.channels[channel].instruments[0].effect = effect;
					} else if (beforeSix) {
						for (channel = 0; channel < this.getChannelCount(); channel++) {
							for (let i: number = 0; i < this.instrumentsPerChannel; i++) {
								this.channels[channel].instruments[i].effect = Song._clip(0, Config.effectNames.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
							}
						}
					} else {
						this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].effect = Song._clip(0, Config.effectNames.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
					}
				} else if (command == SongTagCode.chorus) {
					if (beforeThree) {
						channel = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
						this.channels[channel].instruments[0].chorus = Song._clip(0, Config.chorusNames.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
					} else if (beforeSix) {
						for (channel = 0; channel < this.getChannelCount(); channel++) {
							for (let i: number = 0; i < this.instrumentsPerChannel; i++) {
								this.channels[channel].instruments[i].chorus = Song._clip(0, Config.chorusNames.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
							}
						}
					} else {
						this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].chorus = Song._clip(0, Config.chorusNames.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
					}
				} else if (command == SongTagCode.volume) {
					if (beforeThree) {
						channel = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
						this.channels[channel].instruments[0].volume = Song._clip(0, Config.volumeNames.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
					} else if (beforeSix) {
						for (channel = 0; channel < this.getChannelCount(); channel++) {
							for (let i: number = 0; i < this.instrumentsPerChannel; i++) {
								this.channels[channel].instruments[i].volume = Song._clip(0, Config.volumeNames.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
							}
						}
					} else {
						this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].volume = Song._clip(0, Config.volumeNames.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
					}
				} else if (command == SongTagCode.algorithm) {
					this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].algorithm = Song._clip(0, Config.operatorAlgorithmNames.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
				} else if (command == SongTagCode.feedbackType) {
					this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].feedbackType = Song._clip(0, Config.operatorFeedbackNames.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
				} else if (command == SongTagCode.feedbackAmplitude) {
					this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].feedbackAmplitude = Song._clip(0, Config.operatorAmplitudeMax + 1, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
				} else if (command == SongTagCode.feedbackEnvelope) {
					this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].feedbackEnvelope = Song._clip(0, Config.operatorEnvelopeNames.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
				} else if (command == SongTagCode.operatorFrequencies) {
					for (let o: number = 0; o < Config.operatorCount; o++) {
						this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].operators[o].frequency = Song._clip(0, Config.operatorFrequencyNames.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
					}
				} else if (command == SongTagCode.operatorAmplitudes) {
					for (let o: number = 0; o < Config.operatorCount; o++) {
						this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].operators[o].amplitude = Song._clip(0, Config.operatorAmplitudeMax + 1, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
					}
				} else if (command == SongTagCode.operatorEnvelopes) {
					for (let o: number = 0; o < Config.operatorCount; o++) {
						this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].operators[o].envelope = Song._clip(0, Config.operatorEnvelopeNames.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
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
							newPattern.instrument = bits.read(neededInstrumentBits);
							
							if (!beforeThree && bits.read(1) == 0) continue;
							
							let curPart: number = 0;
							const newNotes: Note[] = newPattern.notes;
							while (curPart < this.beatsPerBar * this.partsPerBeat) {
								
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
					const instrument: Instrument = this.channels[channel].instruments[i];
					if (isDrum) {
						instrumentArray.push({
							type: Config.instrumentTypeNames[InstrumentType.noise],
							volume: (5 - instrument.volume) * 20,
							wave: Config.drumNames[instrument.wave],
							transition: Config.transitionNames[instrument.transition],
						});
					} else {
						if (instrument.type == InstrumentType.chip) {
							instrumentArray.push({
								type: Config.instrumentTypeNames[instrument.type],
								volume: (5 - instrument.volume) * 20,
								wave: Config.waveNames[instrument.wave],
								transition: Config.transitionNames[instrument.transition],
								filter: Config.filterNames[instrument.filter],
								chorus: Config.chorusNames[instrument.chorus],
								effect: Config.effectNames[instrument.effect],
							});
						} else if (instrument.type == InstrumentType.fm) {
							const operatorArray: Object[] = [];
							for (const operator of instrument.operators) {
								operatorArray.push({
									frequency: Config.operatorFrequencyNames[operator.frequency],
									amplitude: operator.amplitude,
									envelope: Config.operatorEnvelopeNames[operator.envelope],
								});
							}
							instrumentArray.push({
								type: Config.instrumentTypeNames[instrument.type],
								transition: Config.transitionNames[instrument.transition],
								effect: Config.effectNames[instrument.effect],
								algorithm: Config.operatorAlgorithmNames[instrument.algorithm],
								feedbackType: Config.operatorFeedbackNames[instrument.feedbackType],
								feedbackAmplitude: instrument.feedbackAmplitude,
								feedbackEnvelope: Config.operatorEnvelopeNames[instrument.feedbackEnvelope],
								operators: operatorArray,
							});
						} else {
							throw new Error("Unrecognized instrument type");
						}
					}
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
				ticksPerBeat: this.partsPerBeat,
				beatsPerMinute: this.getBeatsPerMinute(), // represents tempo
				reverb: this.reverb,
				//outroBars: this.barCount - this.loopStart - this.loopLength; // derive this from bar arrays?
				//patternCount: this.patternsPerChannel, // derive this from pattern arrays?
				//instrumentsPerChannel: this.instrumentsPerChannel, //derive this from instrument arrays?
				channels: channelArray,
			};
		}
		
		public fromJsonObject(jsonObject: any): void {
			this.initToDefault();
			if (!jsonObject) return;
			const version: any = jsonObject.version;
			if (version > Song._format) return;
			
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
				this.tempo = Song._clip(0, Config.tempoSteps, this.tempo);
			}
			
			if (jsonObject.reverb != undefined) {
				this.reverb = Song._clip(0, Config.reverbRange, jsonObject.reverb | 0);
			}
			
			if (jsonObject.beatsPerBar != undefined) {
				this.beatsPerBar = Math.max(Config.beatsPerBarMin, Math.min(Config.beatsPerBarMax, jsonObject.beatsPerBar | 0));
			}
			
			if (jsonObject.ticksPerBeat != undefined) {
				this.partsPerBeat = jsonObject.ticksPerBeat | 0;
				if (Config.partCounts.indexOf(this.partsPerBeat) == -1) {
					this.partsPerBeat = Config.partCounts[Config.partCounts.length - 1];
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
				this.loopStart = Song._clip(0, this.barCount, jsonObject.introBars | 0);
			}
			if (jsonObject.loopBars != undefined) {
				this.loopLength = Song._clip(1, this.barCount - this.loopStart + 1, jsonObject.loopBars | 0);
			}
			
			let pitchChannelCount = 0;
			let drumChannelCount = 0;
			if (jsonObject.channels) {
				for (let channel: number = 0; channel < jsonObject.channels.length; channel++) {
					let channelObject: any = jsonObject.channels[channel];
					
					if (this.channels.length <= channel) this.channels[channel] = new Channel();
					
					if (channelObject.octaveScrollBar != undefined) {
						this.channels[channel].octave = Song._clip(0, 5, channelObject.octaveScrollBar | 0);
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
						let instrumentObject: any = undefined;
						if (channelObject.instruments) instrumentObject = channelObject.instruments[i];
						if (instrumentObject == undefined) instrumentObject = {};
						
						const oldTransitionNames: Dictionary<number> = {"binary": 0};
						const transitionObject = instrumentObject.transition || instrumentObject.envelope; // the transition property used to be called envelope, so try that too.
						instrument.transition = oldTransitionNames[transitionObject] != undefined ? oldTransitionNames[transitionObject] : Config.transitionNames.indexOf(transitionObject);
						if (instrument.transition == -1) instrument.transition = 1;
						
						if (isDrum) {
							if (instrumentObject.volume != undefined) {
								instrument.volume = Song._clip(0, Config.volumeNames.length, Math.round(5 - (instrumentObject.volume | 0) / 20));
							} else {
								instrument.volume = 0;
							}
							instrument.wave = Config.drumNames.indexOf(instrumentObject.wave);
							if (instrument.wave == -1) instrument.wave = 1;
						} else {
							instrument.type = Config.instrumentTypeNames.indexOf(instrumentObject.type);
							if (instrument.type == -1) instrument.type = InstrumentType.chip;
							
							if (instrument.type == InstrumentType.chip) {
								if (instrumentObject.volume != undefined) {
									instrument.volume = Song._clip(0, Config.volumeNames.length, Math.round(5 - (instrumentObject.volume | 0) / 20));
								} else {
									instrument.volume = 0;
								}
								instrument.wave = Config.waveNames.indexOf(instrumentObject.wave);
								if (instrument.wave == -1) instrument.wave = 1;
								instrument.filter = Config.filterNames.indexOf(instrumentObject.filter);
								if (instrument.filter == -1) instrument.filter = 0;
								instrument.chorus = Config.chorusNames.indexOf(instrumentObject.chorus);
								if (instrument.chorus == -1) instrument.chorus = 0;
								instrument.effect = Config.effectNames.indexOf(instrumentObject.effect);
								if (instrument.effect == -1) instrument.effect = 0;
							} else if (instrument.type == InstrumentType.fm) {
								instrument.effect = Config.effectNames.indexOf(instrumentObject.effect);
								if (instrument.effect == -1) instrument.effect = 0;
								
								instrument.algorithm = Config.operatorAlgorithmNames.indexOf(instrumentObject.algorithm);
								if (instrument.algorithm == -1) instrument.algorithm = 0;
								instrument.feedbackType = Config.operatorFeedbackNames.indexOf(instrumentObject.feedbackType);
								if (instrument.feedbackType == -1) instrument.feedbackType = 0;
								if (instrumentObject.feedbackAmplitude != undefined) {
									instrument.feedbackAmplitude = Song._clip(0, Config.operatorAmplitudeMax + 1, instrumentObject.feedbackAmplitude | 0);
								} else {
									instrument.feedbackAmplitude = 0;
								}
								instrument.feedbackEnvelope = Config.operatorEnvelopeNames.indexOf(instrumentObject.feedbackEnvelope);
								if (instrument.feedbackEnvelope == -1) instrument.feedbackEnvelope = 0;
								
								for (let j: number = 0; j < Config.operatorCount; j++) {
									const operator: Operator = instrument.operators[j];
									let operatorObject: any = undefined;
									if (instrumentObject.operators) operatorObject = instrumentObject.operators[j];
									if (operatorObject == undefined) operatorObject = {};
									
									operator.frequency = Config.operatorFrequencyNames.indexOf(operatorObject.frequency);
									if (operator.frequency == -1) operator.frequency = 0;
									if (operatorObject.amplitude != undefined) {
										operator.amplitude = Song._clip(0, Config.operatorAmplitudeMax + 1, operatorObject.amplitude | 0);
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
				
					for (let i: number = 0; i < this.patternsPerChannel; i++) {
						const pattern: Pattern = this.channels[channel].patterns[i];
					
						let patternObject: any = undefined;
						if (channelObject.patterns) patternObject = channelObject.patterns[i];
						if (patternObject == undefined) continue;
					
						pattern.instrument = Song._clip(0, this.instrumentsPerChannel, (patternObject.instrument | 0) - 1);
					
						if (patternObject.notes && patternObject.notes.length > 0) {
							const maxNoteCount: number = Math.min(this.beatsPerBar * this.partsPerBeat, patternObject.notes.length >>> 0);
						
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
									const time: number = pointObject.tick | 0;
									const volume: number = (pointObject.volume == undefined) ? 3 : Math.max(0, Math.min(3, Math.round((pointObject.volume | 0) * 3 / 100)));
								
									if (time > this.beatsPerBar * this.partsPerBeat) continue;
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
		
		private readonly _fingerprint: Array<string | number> = [];
		public getChannelFingerprint(bar: number): string {
			const channelCount: number = this.getChannelCount();
			let charCount: number = 0;
			for (let channel: number = 0; channel < channelCount; channel++) {
				if (channel < this.pitchChannelCount) {
					const instrumentIndex: number = this.getPatternInstrument(channel, bar);
					const instrument: Instrument = this.channels[channel].instruments[instrumentIndex];
					if (instrument.type == InstrumentType.chip) {
						this._fingerprint[charCount++] = "c";
					} else if (instrument.type == InstrumentType.fm) {
						this._fingerprint[charCount++] = "f"
						this._fingerprint[charCount++] = instrument.algorithm;
						this._fingerprint[charCount++] = instrument.feedbackType;
					} else {
						throw new Error("Unknown instrument type.");
					}
				} else {
					this._fingerprint[charCount++] = "d";
				}
			}
			this._fingerprint.length = charCount;
			return this._fingerprint.join("");
		}
	}
	
	class SynthChannel {
		public sample: number = 0.0;
		public readonly phases: number[] = [];
		public readonly phaseDeltas: number[] = [];
		public readonly volumeStarts: number[] = [];
		public readonly volumeDeltas: number[] = [];
		public phaseDeltaScale: number = 0.0;
		public filter: number = 0.0;
		public filterScale: number = 0.0;
		public vibratoScale: number = 0.0;
		public harmonyMult: number = 0.0;
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
				}
				for (let i: number = 0; i < song.barCount; i++) {
					Synth.getGeneratedSynthesizer(song, i);
				}
			}
		}
		
		private static operatorAmplitudeCurve(amplitude: number): number {
			return (Math.pow(16.0, amplitude / 15.0) - 1.0) / 15.0;
		}
		
		private static readonly negativePhaseGuard: number = 1000;
		
		public samplesPerSecond: number = 44100;
		private effectDuration: number = 0.14;
		private effectAngle: number = Math.PI * 2.0 / (this.effectDuration * this.samplesPerSecond);
		private effectYMult: number = 2.0 * Math.cos(this.effectAngle);
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
		private arpeggio: number = 0;
		private arpeggioSampleCountdown: number = 0;
		private paused: boolean = true;
		
		private readonly channels: SynthChannel[] = [];
		private stillGoing: boolean = false;
		private effectPhase: number = 0.0;
		private limit: number = 0.0;
		
		private delayLine: Float32Array = new Float32Array(16384);
		private delayPos: number = 0;
		private delayFeedback0: number = 0.0;
		private delayFeedback1: number = 0.0;
		private delayFeedback2: number = 0.0;
		private delayFeedback3: number = 0.0;
		
		private audioCtx: any;
		private scriptNode: any;
		
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
				remainder = this.song.partsPerBeat * (remainder - this.beat);
				this.part = Math.floor(remainder);
				remainder = 4 * (remainder - this.part);
				this.arpeggio = Math.floor(remainder);
				const samplesPerArpeggio: number = this.getSamplesPerArpeggio();
				remainder = samplesPerArpeggio * (remainder - this.arpeggio);
				this.arpeggioSampleCountdown = Math.floor(samplesPerArpeggio - remainder);
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
			const samplesPerBar: number = this.getSamplesPerArpeggio() * 4 * this.song.partsPerBeat * this.song.beatsPerBar;
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
			this.effectAngle = Math.PI * 2.0 / (this.effectDuration * this.samplesPerSecond);
			this.effectYMult = 2.0 * Math.cos(this.effectAngle);
			this.limitDecay = 1.0 / (2.0 * this.samplesPerSecond);
		}
		
		public pause(): void {
			if (this.paused) return;
			this.paused = true;
			this.scriptNode.disconnect(this.audioCtx.destination);
			if (this.audioCtx.close) {
				this.audioCtx.close(); // firefox is missing this function?
				this.audioCtx = null;
			}
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
			this.arpeggio = 0;
			this.arpeggioSampleCountdown = 0;
			this.effectPhase = 0.0;
			
			for (const channel of this.channels) channel.reset();
			
			this.delayPos = 0;
			this.delayFeedback0 = 0.0;
			this.delayFeedback1 = 0.0;
			this.delayFeedback2 = 0.0;
			this.delayFeedback3 = 0.0;
			for (let i: number = 0; i < this.delayLine.length; i++) this.delayLine[i] = 0.0;
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
			this.synthesize(outputData, outputBuffer.length);
		}
		
		public synthesize(data: Float32Array, bufferLength: number): void {
			if (this.song == null) {
				for (let i: number = 0; i < bufferLength; i++) {
					data[i] = 0.0;
				}
				return;
			}
			
			const channelCount: number = this.song.getChannelCount();
			for (let i: number = this.channels.length; i < channelCount; i++) {
				this.channels[i] = new SynthChannel();
			}
			this.channels.length = channelCount;
			
			const samplesPerArpeggio: number = this.getSamplesPerArpeggio();
			let bufferIndex: number = 0;
			let ended: boolean = false;
			
			// Check the bounds of the playhead:
			if (this.arpeggioSampleCountdown == 0 || this.arpeggioSampleCountdown > samplesPerArpeggio) {
				this.arpeggioSampleCountdown = samplesPerArpeggio;
			}
			if (this.part >= this.song.partsPerBeat) {
				this.beat++;
				this.part = 0;
				this.arpeggio = 0;
				this.arpeggioSampleCountdown = samplesPerArpeggio;
			}
			if (this.beat >= this.song.beatsPerBar) {
				this.bar++;
				this.beat = 0;
				this.part = 0;
				this.arpeggio = 0;
				this.arpeggioSampleCountdown = samplesPerArpeggio;
				
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
			
 			while (true) {
				if (ended) {
					while (bufferIndex < bufferLength) {
						data[bufferIndex] = 0.0;
						bufferIndex++;
					}
					break;
				}
				
				const generatedSynthesizer: Function = Synth.getGeneratedSynthesizer(this.song, this.bar);
				bufferIndex = generatedSynthesizer(this, this.song, data, bufferLength, bufferIndex, samplesPerArpeggio);
				
				const finishedBuffer: boolean = (bufferIndex == -1);
				if (finishedBuffer) {
					break;
				} else {
					// bar changed, reset for next bar:
					this.beat = 0;
					this.effectPhase = 0.0;
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
				}
			}
			
			this.playheadInternal = (((this.arpeggio + 1.0 - this.arpeggioSampleCountdown / samplesPerArpeggio) / 4.0 + this.part) / this.song.partsPerBeat + this.beat) / this.song.beatsPerBar + this.bar;
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
				case EnvelopeType.punch: 
					return Math.max(1.0, 2.0 - time * 10.0);
				case EnvelopeType.feather:
					return Math.min(1.0 / (1.0 + time * Config.operatorEnvelopeSpeed[envelope]), time * 10.0);
				default: throw new Error("Unrecognized operator envelope type.");
			}
		}
		
		private static computeChannelInstrument(synth: Synth, song: Song, channel: number, time: number, sampleTime: number, samplesPerArpeggio: number, samples: number): void {
			const isDrum: boolean = song.getChannelIsDrum(channel);
			const synthChannel: SynthChannel = synth.channels[channel];
			const pattern: Pattern | null = song.getPattern(channel, synth.bar);
			const instrument: Instrument = song.channels[channel].instruments[pattern == null ? 0 : pattern.instrument];
			const pianoMode = (synth.pianoPressed && channel == synth.pianoChannel);
			const basePitch: number = isDrum ? Config.drumBasePitches[instrument.wave] : Config.keyTransposes[song.key];
			const intervalScale: number = isDrum ? Config.drumInterval : 1;
			const pitchDamping: number = isDrum ? (Config.drumWaveIsSoft[instrument.wave] ? 24.0 : 60.0) : 48.0;
			const secondsPerPart: number = 4.0 * samplesPerArpeggio / synth.samplesPerSecond;
			const beatsPerPart: number = 1.0 / song.partsPerBeat;
			
			synthChannel.phaseDeltaScale = 0.0;
			synthChannel.filter = 1.0;
			synthChannel.filterScale = 1.0;
			synthChannel.vibratoScale = 0.0;
			synthChannel.harmonyMult = 1.0;
			
			let partsSinceStart: number = 0.0;
			let arpeggio: number = synth.arpeggio;
			let arpeggioSampleCountdown: number = synth.arpeggioSampleCountdown;
			
			let pitches: number[] | null = null;
			let resetPhases: boolean = true;
			
			let intervalStart: number = 0.0;
			let intervalEnd: number = 0.0;
			let transitionVolumeStart: number = 1.0;
			let transitionVolumeEnd: number = 1.0;
			let envelopeVolumeStart: number = 0.0;
			let envelopeVolumeEnd: number = 0.0;
			// TODO: probably part time can be calculated independently of any notes?
			let partTimeStart: number = 0.0;
			let partTimeEnd:   number = 0.0;
			let decayTimeStart: number = 0.0;
			let decayTimeEnd:   number = 0.0;
			
			for (let i: number = 0; i < Config.operatorCount; i++) {
				synthChannel.phaseDeltas[i] = 0.0;
				synthChannel.volumeStarts[i] = 0.0;
				synthChannel.volumeDeltas[i] = 0.0;
			}
			
			if (pianoMode) {
				pitches = synth.pianoPitch;
				transitionVolumeStart = transitionVolumeEnd = 1;
				envelopeVolumeStart = envelopeVolumeEnd = 1;
				resetPhases = false;
				// TODO: track time since live piano note started for transition, envelope, decays, delayed vibrato, etc.
			} else if (pattern != null) {
				let note: Note | null = null;
				let prevNote: Note | null = null;
				let nextNote: Note | null = null;
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
				if (note != null && prevNote != null && prevNote.end != note.start) prevNote = null;
				if (note != null && nextNote != null && nextNote.start != note.end) nextNote = null;
				
				if (note != null) {
					pitches = note.pitches;
					partsSinceStart = time - note.start;
					
					let endPinIndex: number;
					for (endPinIndex = 1; endPinIndex < note.pins.length - 1; endPinIndex++) {
						if (note.pins[endPinIndex].time + note.start > time) break;
					}
					const startPin: NotePin = note.pins[endPinIndex-1];
					const endPin: NotePin = note.pins[endPinIndex];
					const noteStart: number = note.start * 4;
					const noteEnd:   number = note.end   * 4;
					const pinStart: number  = (note.start + startPin.time) * 4;
					const pinEnd:   number  = (note.start +   endPin.time) * 4;
					
					const tickTimeStart: number = time * 4 + arpeggio;
					const tickTimeEnd:   number = time * 4 + arpeggio + 1;
					const pinRatioStart: number = (tickTimeStart - pinStart) / (pinEnd - pinStart);
					const pinRatioEnd:   number = (tickTimeEnd   - pinStart) / (pinEnd - pinStart);
					let envelopeVolumeTickStart: number = startPin.volume + (endPin.volume - startPin.volume) * pinRatioStart;
					let envelopeVolumeTickEnd:   number = startPin.volume + (endPin.volume - startPin.volume) * pinRatioEnd;
					let transitionVolumeTickStart: number = 1.0;
					let transitionVolumeTickEnd:   number = 1.0;
					let intervalTickStart: number = startPin.interval + (endPin.interval - startPin.interval) * pinRatioStart;
					let intervalTickEnd:   number = startPin.interval + (endPin.interval - startPin.interval) * pinRatioEnd;
					let partTimeTickStart: number = startPin.time + (endPin.time - startPin.time) * pinRatioStart;
					let partTimeTickEnd:   number = startPin.time + (endPin.time - startPin.time) * pinRatioEnd;
					let decayTimeTickStart: number = partTimeTickStart;
					let decayTimeTickEnd:   number = partTimeTickEnd;
					
					const startRatio: number = 1.0 - (arpeggioSampleCountdown + samples) / samplesPerArpeggio;
					const endRatio:   number = 1.0 - (arpeggioSampleCountdown)           / samplesPerArpeggio;
					resetPhases = (tickTimeStart + startRatio - noteStart == 0.0);
					
					const transition: number = instrument.transition;
					if (tickTimeStart == noteStart) {
						if (transition == 0) {
							resetPhases = false;
						} else if (transition == 2) {
							transitionVolumeTickStart = 0.0;
						} else if (transition == 3) {
							if (prevNote == null) {
								transitionVolumeTickStart = 0.0;
							} else if (prevNote.pins[prevNote.pins.length-1].volume == 0 || note.pins[0].volume == 0) {
								transitionVolumeTickStart = 0.0;
							} else {
								intervalTickStart = (prevNote.pitches[0] + prevNote.pins[prevNote.pins.length-1].interval - note.pitches[0]) * 0.5;
								decayTimeTickStart = prevNote.pins[prevNote.pins.length-1].time * 0.5;
								resetPhases = false;
							}
						}
					}
					if (tickTimeEnd == noteEnd) {
						if (transition == 1 || transition == 2) {
							transitionVolumeTickEnd = 0.0;
						} else if (transition == 3) {
							if (nextNote == null) {
								transitionVolumeTickEnd = 0.0;
							} else if (note.pins[note.pins.length-1].volume == 0 || nextNote.pins[0].volume == 0) {
								transitionVolumeTickEnd = 0.0;
							} else {
								intervalTickEnd = (nextNote.pitches[0] - note.pitches[0] + note.pins[note.pins.length-1].interval) * 0.5;
								decayTimeTickEnd *= 0.5;
							}
						}
					}
					
					intervalStart = intervalTickStart + (intervalTickEnd - intervalTickStart) * startRatio;
					intervalEnd   = intervalTickStart + (intervalTickEnd - intervalTickStart) * endRatio;
					envelopeVolumeStart = synth.volumeConversion(envelopeVolumeTickStart + (envelopeVolumeTickEnd - envelopeVolumeTickStart) * startRatio);
					envelopeVolumeEnd   = synth.volumeConversion(envelopeVolumeTickStart + (envelopeVolumeTickEnd - envelopeVolumeTickStart) * endRatio);
					transitionVolumeStart = transitionVolumeTickStart + (transitionVolumeTickEnd - transitionVolumeTickStart) * startRatio;
					transitionVolumeEnd   = transitionVolumeTickStart + (transitionVolumeTickEnd - transitionVolumeTickStart) * endRatio;
					partTimeStart = note.start + partTimeTickStart + (partTimeTickEnd - partTimeTickStart) * startRatio;
					partTimeEnd   = note.start + partTimeTickStart + (partTimeTickEnd - partTimeTickStart) * endRatio;
					decayTimeStart = decayTimeTickStart + (decayTimeTickEnd - decayTimeTickStart) * startRatio;
					decayTimeEnd   = decayTimeTickStart + (decayTimeTickEnd - decayTimeTickStart) * endRatio;
				}
			}
			
			if (pitches != null) {
				if (!isDrum && instrument.type == InstrumentType.fm) {
					// phase modulation!
					
					let sineVolumeBoost: number = 1.0;
					let totalCarrierVolume: number = 0.0;
					
					const carrierCount: number = Config.operatorCarrierCounts[instrument.algorithm];
					for (let i: number = 0; i < Config.operatorCount; i++) {
						const associatedCarrierIndex: number = Config.operatorAssociatedCarrier[instrument.algorithm][i] - 1;
						const pitch: number = pitches[(i < pitches.length) ? i : ((associatedCarrierIndex < pitches.length) ? associatedCarrierIndex : 0)];
						const freqMult = Config.operatorFrequencies[instrument.operators[i].frequency];
						const chorusInterval = Config.operatorCarrierChorus[associatedCarrierIndex];
						const startPitch: number = (pitch + intervalStart) * intervalScale + chorusInterval;
						const startFreq: number = freqMult * (synth.frequencyFromPitch(basePitch + startPitch)) + Config.operatorHzOffsets[instrument.operators[i].frequency];
						
						synthChannel.phaseDeltas[i] = startFreq * sampleTime * Config.sineWaveLength;
						if (resetPhases) synthChannel.reset();
						
						const amplitudeCurve: number = Synth.operatorAmplitudeCurve(instrument.operators[i].amplitude);
						const amplitudeMult: number = amplitudeCurve * Config.operatorAmplitudeSigns[instrument.operators[i].frequency];
						let volumeStart: number = amplitudeMult;
						let volumeEnd: number = amplitudeMult;
						if (i < carrierCount) {
							// carrier
							const volumeMult: number = 0.03;
							const endPitch: number = (pitch + intervalEnd) * intervalScale;
							const pitchVolumeStart: number = Math.pow(2.0, -startPitch / pitchDamping);
							const pitchVolumeEnd: number   = Math.pow(2.0,   -endPitch / pitchDamping);
							volumeStart *= pitchVolumeStart * volumeMult * transitionVolumeStart;
							volumeEnd *= pitchVolumeEnd * volumeMult * transitionVolumeEnd;
							
							totalCarrierVolume += amplitudeCurve;
						} else {
							// modulator
							volumeStart *= Config.sineWaveLength * 1.5;
							volumeEnd *= Config.sineWaveLength * 1.5;
							
							sineVolumeBoost *= 1.0 - Math.min(1.0, instrument.operators[i].amplitude / 15);
						}
						const envelope: number = instrument.operators[i].envelope;
						
						volumeStart *= Synth.computeOperatorEnvelope(envelope, secondsPerPart * decayTimeStart, beatsPerPart * partTimeStart, envelopeVolumeStart);
						volumeEnd *= Synth.computeOperatorEnvelope(envelope, secondsPerPart * decayTimeEnd, beatsPerPart * partTimeEnd, envelopeVolumeEnd);
						
						synthChannel.volumeStarts[i] = volumeStart;
						synthChannel.volumeDeltas[i] = (volumeEnd - volumeStart) / samples;
					}
					
					const feedbackAmplitude: number = Config.sineWaveLength * 0.3 * instrument.feedbackAmplitude / 15.0;
					let feedbackStart: number = feedbackAmplitude * Synth.computeOperatorEnvelope(instrument.feedbackEnvelope, secondsPerPart * decayTimeStart, beatsPerPart * partTimeStart, envelopeVolumeStart);
					let feedbackEnd: number = feedbackAmplitude * Synth.computeOperatorEnvelope(instrument.feedbackEnvelope, secondsPerPart * decayTimeEnd, beatsPerPart * partTimeEnd, envelopeVolumeEnd);
					synthChannel.feedbackMult = feedbackStart;
					synthChannel.feedbackDelta = (feedbackEnd - synthChannel.feedbackMult) / samples;
					
					sineVolumeBoost *= 1.0 - instrument.feedbackAmplitude / 15.0;
					
					sineVolumeBoost *= 1.0 - Math.min(1.0, Math.max(0.0, totalCarrierVolume - 1) / 2.0);
					for (let i: number = 0; i < carrierCount; i++) {
						synthChannel.volumeStarts[i] *= 1.0 + sineVolumeBoost * 3.0;
						synthChannel.volumeDeltas[i] *= 1.0 + sineVolumeBoost * 3.0;
					}
				} else {
					let pitch: number = pitches[0];
					if (Config.chorusHarmonizes[instrument.chorus]) {
						let harmonyOffset: number = 0.0;
						if (pitches.length == 2) {
							harmonyOffset = pitches[1] - pitches[0];
						} else if (pitches.length == 3) {
							harmonyOffset = pitches[(arpeggio >> 1) + 1] - pitches[0];
						} else if (pitches.length == 4) {
							harmonyOffset = pitches[(arpeggio == 3 ? 1 : arpeggio) + 1] - pitches[0];
						}
						synthChannel.harmonyMult = Math.pow(2.0, harmonyOffset / 12.0);
					} else {
						if (pitches.length == 2) {
							pitch = pitches[arpeggio >> 1];
						} else if (pitches.length == 3) {
							pitch = pitches[arpeggio == 3 ? 1 : arpeggio];
						} else if (pitches.length == 4) {
							pitch = pitches[arpeggio];
						}
					}
					
					const startPitch: number = (pitch + intervalStart) * intervalScale;
					const endPitch: number = (pitch + intervalEnd) * intervalScale;
					const startFreq: number = synth.frequencyFromPitch(basePitch + startPitch);
					const pitchVolumeStart: number = Math.pow(2.0, -startPitch / pitchDamping);
					const pitchVolumeEnd: number   = Math.pow(2.0,   -endPitch / pitchDamping);
					if (isDrum && Config.drumWaveIsSoft[instrument.wave]) {
						synthChannel.filter = Math.min(1.0, startFreq * sampleTime * Config.drumPitchFilterMult[instrument.wave]);
					}
					let settingsVolumeMult: number;
					if (!isDrum) {
						const filterScaleRate: number = Config.filterDecays[instrument.filter];
						synthChannel.filter = Math.pow(2, -filterScaleRate * secondsPerPart * decayTimeStart);
						const endFilter: number = Math.pow(2, -filterScaleRate * secondsPerPart * decayTimeEnd);
						synthChannel.filterScale = Math.pow(endFilter / synthChannel.filter, 1.0 / samples);
						settingsVolumeMult = 0.27 * 0.5 * Config.waveVolumes[instrument.wave] * Config.filterVolumes[instrument.filter] * Config.chorusVolumes[instrument.chorus];
					} else {
						settingsVolumeMult = 0.19 * Config.drumVolumes[instrument.wave];
					}
					if (resetPhases && !isDrum) {
						synthChannel.reset();
					}
					
					synthChannel.phaseDeltas[0] = startFreq * sampleTime;
					
					const instrumentVolumeMult: number = (instrument.volume == 5) ? 0.0 : Math.pow(2, -Config.volumeValues[instrument.volume]);
					synthChannel.volumeStarts[0] = transitionVolumeStart * envelopeVolumeStart * pitchVolumeStart * settingsVolumeMult * instrumentVolumeMult;
					const volumeEnd: number = transitionVolumeEnd * envelopeVolumeEnd * pitchVolumeEnd * settingsVolumeMult * instrumentVolumeMult;
					synthChannel.volumeDeltas[0] = (volumeEnd - synthChannel.volumeStarts[0]) / samples;
				}
				
				synthChannel.phaseDeltaScale = Math.pow(2.0, ((intervalEnd - intervalStart) * intervalScale / 12.0) / samples);
				synthChannel.vibratoScale = (partsSinceStart < Config.effectVibratoDelays[instrument.effect]) ? 0.0 : Math.pow(2.0, Config.effectVibratos[instrument.effect] / 12.0) - 1.0;
			} else {
				synthChannel.reset();
				for (let i: number = 0; i < Config.operatorCount; i++) {
					synthChannel.phaseDeltas[0] = 0.0;
					synthChannel.volumeStarts[0] = 0.0;
					synthChannel.volumeDeltas[0] = 0.0;
				}
			}
		}
		
		private static readonly generatedSynthesizers: Dictionary<Function> = {};
		
		private static getGeneratedSynthesizer(song: Song, bar: number): Function {
			const fingerprint: string = song.getChannelFingerprint(bar);
			if (Synth.generatedSynthesizers[fingerprint] == undefined) {
				const synthSource: string[] = [];
				const instruments: Instrument[] = [];
				for (let channel = 0; channel < song.pitchChannelCount; channel++) {
					instruments[channel] = song.channels[channel].instruments[song.getPatternInstrument(channel, bar)];
				}
				
				for (const line of Synth.synthSourceTemplate) {
					if (line.indexOf("#") != -1) {
						if (line.indexOf("// PITCH") != -1) {
							for (let channel = 0; channel < song.pitchChannelCount; channel++) {
								synthSource.push(line.replace(/#/g, channel + ""));
							}
						} else if (line.indexOf("// CHIP") != -1) {
							for (let channel = 0; channel < song.pitchChannelCount; channel++) {
								if (instruments[channel].type == InstrumentType.chip) {
									synthSource.push(line.replace(/#/g, channel + ""));
								}
							}
						} else if (line.indexOf("// FM") != -1) {
							for (let channel = 0; channel < song.pitchChannelCount; channel++) {
								if (instruments[channel].type == InstrumentType.fm) {
									if (line.indexOf("$") != -1) {
										for (let j = 0; j < Config.operatorCount; j++) {
											synthSource.push(line.replace(/#/g, channel + "").replace(/\$/g, j + ""));
										}
									} else {
										synthSource.push(line.replace(/#/g, channel + ""));
									}
								}
							}
						} else if (line.indexOf("// CARRIER OUTPUTS") != -1) {
							for (let channel = 0; channel < song.pitchChannelCount; channel++) {
								if (instruments[channel].type == InstrumentType.fm) {
									const outputs: string[] = [];
									for (let j = 0; j < Config.operatorCarrierCounts[instruments[channel].algorithm]; j++) {
										outputs.push("channel" + channel + "Operator" + j + "Scaled");
									}
									synthSource.push(line.replace(/#/g, channel + "").replace("/*channel" + channel + "Operator$Scaled*/", outputs.join(" + ")));
								}
							}
						} else if (line.indexOf("// DRUM") != -1) {
							for (let channel = song.pitchChannelCount; channel < song.pitchChannelCount + song.drumChannelCount; channel++) {
								synthSource.push(line.replace(/#/g, channel + ""));
							}
						} else if (line.indexOf("// ALL") != -1) {
							for (let channel = 0; channel < song.pitchChannelCount + song.drumChannelCount; channel++) {
								synthSource.push(line.replace(/#/g, channel + ""));
							}
						} else {
							throw new Error("Missing channel type annotation for line: " + line);
						}
					} else if (line.indexOf("// INSERT OPERATOR COMPUTATION HERE") != -1) {
						for (let j = Config.operatorCount - 1; j >= 0; j--) {
							for (const operatorLine of Synth.operatorSourceTemplate) {
								for (let channel = 0; channel < song.pitchChannelCount; channel++) {
									if (instruments[channel].type == InstrumentType.fm) {
										
										if (operatorLine.indexOf("/* + channel#Operator@Scaled*/") != -1) {
											let modulators = "";
											for (const modulatorNumber of Config.operatorModulatedBy[instruments[channel].algorithm][j]) {
												modulators += " + channel" + channel + "Operator" + (modulatorNumber - 1) + "Scaled";
											}
											
											const feedbackIndices: ReadonlyArray<number> = Config.operatorFeedbackIndices[instruments[channel].feedbackType][j];
											if (feedbackIndices.length > 0) {
												modulators += " + channel" + channel + "FeedbackMult * (";
												const feedbacks: string[] = [];
												for (const modulatorNumber of feedbackIndices) {
													feedbacks.push("channel" + channel + "Operator" + (modulatorNumber - 1) + "Output");
												}
												modulators += feedbacks.join(" + ") + ")";
											}
											synthSource.push(operatorLine.replace(/#/g, channel + "").replace(/\$/g, j + "").replace("/* + channel" + channel + "Operator@Scaled*/", modulators));
										} else {
											synthSource.push(operatorLine.replace(/#/g, channel + "").replace(/\$/g, j + ""));
										}
									}
								}
							}
						}
					} else {
						synthSource.push(line);
					}
				}
				
				//console.log(synthSource.join("\n"));
				
				Synth.generatedSynthesizers[fingerprint] = new Function("synth", "song", "data", "bufferLength", "bufferIndex", "samplesPerArpeggio", synthSource.join("\n"));
			}
			return Synth.generatedSynthesizers[fingerprint];
		}
		
		private static synthSourceTemplate: string[] = (`
			var sampleTime = 1.0 / synth.samplesPerSecond;
			var effectYMult = +synth.effectYMult;
			var limitDecay = +synth.limitDecay;
			var volume = +synth.volume;
			var delayLine = synth.delayLine;
			var reverb = Math.pow(song.reverb / beepbox.Config.reverbRange, 0.667) * 0.425;
			var sineWave = beepbox.Config.sineWave;
			
			// Initialize instruments based on current pattern.
			var instrumentChannel# = song.getPatternInstrument(#, synth.bar); // ALL
			var instrument# = song.channels[#].instruments[instrumentChannel#]; // ALL
			var channel#Wave = beepbox.Config.waves[instrument#.wave]; // CHIP
			var channel#Wave = beepbox.Config.getDrumWave(instrument#.wave); // DRUM
			var channel#WaveLength = channel#Wave.length; // CHIP
			var channel#FilterBase = Math.pow(2, -beepbox.Config.filterBases[instrument#.filter]); // CHIP
			var channel#TremoloScale = beepbox.Config.effectTremolos[instrument#.effect]; // PITCH
			
			while (bufferIndex < bufferLength) {
				
				var samples;
				var samplesLeftInBuffer = bufferLength - bufferIndex;
				if (synth.arpeggioSampleCountdown <= samplesLeftInBuffer) {
					samples = synth.arpeggioSampleCountdown;
				} else {
					samples = samplesLeftInBuffer;
				}
				synth.arpeggioSampleCountdown -= samples;
				
				var time = synth.part + synth.beat * song.partsPerBeat;
				
				var channel#ChorusA = Math.pow(2.0, (beepbox.Config.chorusOffsets[instrument#.chorus] + beepbox.Config.chorusIntervals[instrument#.chorus]) / 12.0); // CHIP
				var channel#ChorusB = Math.pow(2.0, (beepbox.Config.chorusOffsets[instrument#.chorus] - beepbox.Config.chorusIntervals[instrument#.chorus]) / 12.0); // CHIP
				var channel#ChorusSign = (instrument#.chorus == 7) ? -1.0 : 1.0; // CHIP
				if (instrument#.chorus == 0) synth.channels[#].phases[1] = synth.channels[#].phases[0]; // CHIP
				
				beepbox.Synth.computeChannelInstrument(synth, song, #, time, sampleTime, samplesPerArpeggio, samples); // ALL
				var synthChannel# = synth.channels[#]; // ALL
				
				var channel#PhaseDelta = synthChannel#.phaseDeltas[0]; // CHIP
				var channel#PhaseDelta = synthChannel#.phaseDeltas[0] / 32768.0; // DRUM
				var channel#PhaseDeltaScale = synthChannel#.phaseDeltaScale; // ALL
				var channel#Volume = synthChannel#.volumeStarts[0]; // CHIP
				var channel#Volume = synthChannel#.volumeStarts[0]; // DRUM
				var channel#VolumeDelta = synthChannel#.volumeDeltas[0]; // CHIP
				var channel#VolumeDelta = synthChannel#.volumeDeltas[0]; // DRUM
				var channel#Filter = synthChannel#.filter * channel#FilterBase; // CHIP
				var channel#Filter = synthChannel#.filter; // DRUM
				var channel#FilterScale = synthChannel#.filterScale; // CHIP
				var channel#VibratoScale = synthChannel#.vibratoScale; // PITCH
				
				// TODO: get rid of this, use multiple deltas instead:
				channel#ChorusB *= synthChannel#.harmonyMult; // CHIP
				
				var effectY     = Math.sin(synth.effectPhase);
				var prevEffectY = Math.sin(synth.effectPhase - synth.effectAngle);
				
				var channel#PhaseA = synth.channels[#].phases[0] % 1; // CHIP
				var channel#PhaseB = synth.channels[#].phases[1] % 1; // CHIP
				var channel#Phase  = synth.channels[#].phases[0] % 1; // DRUM
				
				var channel#Operator$Phase       = ((synth.channels[#].phases[$] % 1) + ` + Synth.negativePhaseGuard + `) * ` + Config.sineWaveLength + `; // FM
				var channel#Operator$PhaseDelta  = synthChannel#.phaseDeltas[$]; // FM
				var channel#Operator$OutputMult  = synthChannel#.volumeStarts[$]; // FM
				var channel#Operator$OutputDelta = synthChannel#.volumeDeltas[$]; // FM
				var channel#Operator$Output      = synthChannel#.feedbackOutputs[$]; // FM
				var channel#FeedbackMult         = synthChannel#.feedbackMult; // FM
				var channel#FeedbackDelta        = synthChannel#.feedbackDelta; // FM
				
				var channel#Sample = +synth.channels[#].sample; // ALL
				
				var delayPos = 0|synth.delayPos;
				var delayFeedback0 = +synth.delayFeedback0;
				var delayFeedback1 = +synth.delayFeedback1;
				var delayFeedback2 = +synth.delayFeedback2;
				var delayFeedback3 = +synth.delayFeedback3;
				var limit = +synth.limit;
				
				while (samples) {
					var channel#Vibrato = 1.0 + channel#VibratoScale * effectY; // PITCH
					var channel#Tremolo = 1.0 + channel#TremoloScale * (effectY - 1.0); // PITCH
					var temp = effectY;
					effectY = effectYMult * effectY - prevEffectY;
					prevEffectY = temp;
					
					channel#Sample += ((channel#Wave[0|(channel#PhaseA * channel#WaveLength)] + channel#Wave[0|(channel#PhaseB * channel#WaveLength)] * channel#ChorusSign) * channel#Volume * channel#Tremolo - channel#Sample) * channel#Filter; // CHIP
					channel#Sample += (channel#Wave[0|(channel#Phase * 32768.0)] * channel#Volume - channel#Sample) * channel#Filter; // DRUM
					channel#Volume += channel#VolumeDelta; // CHIP
					channel#Volume += channel#VolumeDelta; // DRUM
					channel#PhaseA += channel#PhaseDelta * channel#Vibrato * channel#ChorusA; // CHIP
					channel#PhaseB += channel#PhaseDelta * channel#Vibrato * channel#ChorusB; // CHIP
					channel#Phase += channel#PhaseDelta; // DRUM
					channel#Filter *= channel#FilterScale; // CHIP
					channel#PhaseA -= 0|channel#PhaseA; // CHIP
					channel#PhaseB -= 0|channel#PhaseB; // CHIP
					channel#Phase -= 0|channel#Phase; // DRUM
					channel#PhaseDelta *= channel#PhaseDeltaScale; // CHIP
					channel#PhaseDelta *= channel#PhaseDeltaScale; // DRUM
					
					// INSERT OPERATOR COMPUTATION HERE
					channel#Sample = channel#Tremolo * (/*channel#Operator$Scaled*/); // CARRIER OUTPUTS
					channel#FeedbackMult += channel#FeedbackDelta; // FM
					channel#Operator$OutputMult += channel#Operator$OutputDelta; // FM
					channel#Operator$Phase += channel#Operator$PhaseDelta * channel#Vibrato; // FM
					channel#Operator$PhaseDelta *= channel#PhaseDeltaScale; // FM
					
					// Reverb, implemented using a feedback delay network with a Hadamard matrix and lowpass filters.
					// good ratios:    0.555235 + 0.618033 + 0.818 +   1.0 = 2.991268
					// Delay lengths:  3041     + 3385     + 4481  +  5477 = 16384 = 2^14
					// Buffer offsets: 3041    -> 6426   -> 10907 -> 16384
					var delayPos1 = (delayPos +  3041) & 0x3FFF;
					var delayPos2 = (delayPos +  6426) & 0x3FFF;
					var delayPos3 = (delayPos + 10907) & 0x3FFF;
					var delaySample0 = (delayLine[delayPos]
						+ channel#Sample // PITCH
					);
					var delaySample1 = delayLine[delayPos1];
					var delaySample2 = delayLine[delayPos2];
					var delaySample3 = delayLine[delayPos3];
					var delayTemp0 = -delaySample0 + delaySample1;
					var delayTemp1 = -delaySample0 - delaySample1;
					var delayTemp2 = -delaySample2 + delaySample3;
					var delayTemp3 = -delaySample2 - delaySample3;
					delayFeedback0 += ((delayTemp0 + delayTemp2) * reverb - delayFeedback0) * 0.5;
					delayFeedback1 += ((delayTemp1 + delayTemp3) * reverb - delayFeedback1) * 0.5;
					delayFeedback2 += ((delayTemp0 - delayTemp2) * reverb - delayFeedback2) * 0.5;
					delayFeedback3 += ((delayTemp1 - delayTemp3) * reverb - delayFeedback3) * 0.5;
					delayLine[delayPos1] = delayFeedback0;
					delayLine[delayPos2] = delayFeedback1;
					delayLine[delayPos3] = delayFeedback2;
					delayLine[delayPos ] = delayFeedback3;
					delayPos = (delayPos + 1) & 0x3FFF;
					
					var sample = delaySample0 + delaySample1 + delaySample2 + delaySample3
						+ channel#Sample // DRUM
					;
					
					var abs = sample < 0.0 ? -sample : sample;
					limit -= limitDecay;
					if (limit < abs) limit = abs;
					sample /= limit * 0.75 + 0.25;
					sample *= volume;
					data[bufferIndex] = sample;
					bufferIndex++;
					samples--;
				}
				
				synthChannel#.phases[0] = channel#PhaseA; // CHIP
				synthChannel#.phases[1] = channel#PhaseB; // CHIP
				synthChannel#.phases[0] = channel#Phase; // DRUM
				synthChannel#.phases[$] = channel#Operator$Phase / ` + Config.sineWaveLength + `; // FM
				synthChannel#.feedbackOutputs[$] = channel#Operator$Output; // FM
				synthChannel#.sample = channel#Sample; // ALL
				
				synth.delayPos = delayPos;
				synth.delayFeedback0 = delayFeedback0;
				synth.delayFeedback1 = delayFeedback1;
				synth.delayFeedback2 = delayFeedback2;
				synth.delayFeedback3 = delayFeedback3;
				synth.limit = limit;
				
				if (effectYMult * effectY - prevEffectY > prevEffectY) {
					synth.effectPhase = Math.asin(effectY);
				} else {
					synth.effectPhase = Math.PI - Math.asin(effectY);
				}
				
				if (synth.arpeggioSampleCountdown == 0) {
					synth.arpeggio++;
					synth.arpeggioSampleCountdown = samplesPerArpeggio;
					if (synth.arpeggio == 4) {
						synth.arpeggio = 0;
						synth.part++;
						if (synth.part == song.partsPerBeat) {
							synth.part = 0;
							synth.beat++;
							if (synth.beat == song.beatsPerBar) {
								// The bar ended, may need to regenerate synthesizer.
								return bufferIndex;
							}
						}
					}
				}
			}
			
			// Indicate that the buffer is finished generating.
			return -1;
		`).split("\n");
		
		private static operatorSourceTemplate: string[] = (`
						var channel#Operator$PhaseMix = channel#Operator$Phase/* + channel#Operator@Scaled*/;
						var channel#Operator$PhaseInt = channel#Operator$PhaseMix|0;
						var channel#Operator$Index    = channel#Operator$PhaseInt & ` + Config.sineWaveMask + `;
						var channel#Operator$Sample   = sineWave[channel#Operator$Index];
						channel#Operator$Output       = channel#Operator$Sample + (sineWave[channel#Operator$Index + 1] - channel#Operator$Sample) * (channel#Operator$PhaseMix - channel#Operator$PhaseInt);
						var channel#Operator$Scaled   = channel#Operator$OutputMult * channel#Operator$Output;
		`).split("\n");
		
		private frequencyFromPitch(pitch: number): number {
			return 440.0 * Math.pow(2.0, (pitch - 69.0) / 12.0);
		}
		
		private volumeConversion(noteVolume: number): number {
			return Math.pow(noteVolume / 3.0, 1.5);
		}
		
		private getSamplesPerArpeggio(): number {
			if (this.song == null) return 0;
			const beatsPerMinute: number = this.song.getBeatsPerMinute();
			const beatsPerSecond: number = beatsPerMinute / 60.0;
			const partsPerSecond: number = beatsPerSecond * this.song.partsPerBeat;
			const arpeggioPerSecond: number = partsPerSecond * 4.0;
			return Math.floor(this.samplesPerSecond / arpeggioPerSecond);
		}
	}
}
