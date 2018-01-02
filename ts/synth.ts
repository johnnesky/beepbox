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

/// <reference path="FFT.ts" />

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
		public static readonly tempoNames: ReadonlyArray<string> = ["molasses", "slow", "leisurely", "moderate", "steady", "brisk", "hasty", "fast", "strenuous", "grueling", "hyper", "ludicrous"];
		public static readonly reverbRange: number = 4;
		public static readonly beatsPerBarMin: number = 3;
		public static readonly beatsPerBarMax: number = 15;
		public static readonly barCountMin: number = 1;
		public static readonly barCountMax: number = 128;
		public static readonly patternsPerChannelMin: number = 1;
		public static readonly patternsPerChannelMax: number = 64;
		public static readonly instrumentsPerChannelMin: number = 1;
		public static readonly instrumentsPerChannelMax: number = 10;
		public static readonly partNames: ReadonlyArray<string> = ["÷3 (triples)", "÷4 (standard)", "÷6", "÷8"];
		public static readonly partCounts: ReadonlyArray<number> = [3, 4, 6, 8];
		public static readonly waveNames: ReadonlyArray<string> = ["triangle", "square", "pulse wide", "pulse narrow", "sawtooth", "double saw", "double pulse", "spiky", "plateau", "glitch", "10% pulse", "sunsoft bass", "loud pulse", "sax", "guitar", "sine", "atari bass", "atari pulse", "1% pulse", "curved sawtooth", "viola", "brass", "acoustic bass"];
		public static readonly waveVolumes: ReadonlyArray<number> = [1.0,         0.5,       0.5,          0.5,          0.65,          0.5,          0.4,         0.4,      0.94,      0.5,       0.5,          1.0,           0.6,       0.2,     0.25,   1.0,       1.0,           1.0,         1.0,            1.0,          1.0,     1.0,         1.0];
		// the "clang" and "buzz" drums are inspired by similar drums in the modded beepbox! :D
		public static readonly drumNames: ReadonlyArray<string> = ["retro", "white", "clang", "buzz", "hollow"];
		public static readonly drumVolumes: ReadonlyArray<number> = [0.25, 1.0, 0.4, 0.3, 1.5];
		public static readonly drumPitchRoots: ReadonlyArray<number> = [69, 69, 69, 69, 96];
		public static readonly drumPitchFilterMult: ReadonlyArray<number> = [100.0, 8.0, 100.0, 100.0, 1.0];
		public static readonly drumWaveIsSoft: ReadonlyArray<boolean> = [false, true, false, false, true];
		public static readonly filterNames: ReadonlyArray<string> = ["sustain sharp", "sustain medium", "sustain soft", "decay sharp", "decay medium", "decay soft"];
		public static readonly filterBases: ReadonlyArray<number> = [2.0, 3.5, 5.0, 1.0, 2.5, 4.0];
		public static readonly filterDecays: ReadonlyArray<number> = [0.0, 0.0, 0.0, 10.0, 7.0, 4.0];
		public static readonly filterVolumes: ReadonlyArray<number> = [0.4, 0.7, 1.0, 0.5, 0.75, 1.0];
		public static readonly envelopeNames: ReadonlyArray<string> = ["seamless", "sudden", "smooth", "slide"];
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
		public static readonly channelVolumes: ReadonlyArray<number> = [0.27, 0.27, 0.27, 0.19];
		public static readonly pitchChannelColorsDim: ReadonlyArray<string>    = ["#0099a1", "#a1a100", "#c75000", "#00a100", "#d020d0", "#7777b0"];
		public static readonly pitchChannelColorsBright: ReadonlyArray<string> = ["#25f3ff", "#ffff25", "#ff9752", "#50ff50", "#ff90ff", "#a0a0ff"];
		public static readonly pitchNoteColorsDim: ReadonlyArray<string>       = ["#00bdc7", "#c7c700", "#ff771c", "#00c700", "#e040e0", "#8888d0"];
		public static readonly pitchNoteColorsBright: ReadonlyArray<string>    = ["#92f9ff", "#ffff92", "#ffcdab", "#a0ffa0", "#ffc0ff", "#d0d0ff"];
		public static readonly drumChannelColorsDim: ReadonlyArray<string>    = ["#6f6f6f", "#996633"];
		public static readonly drumChannelColorsBright: ReadonlyArray<string> = ["#aaaaaa", "#ddaa77"];
		public static readonly drumNoteColorsDim: ReadonlyArray<string>       = ["#aaaaaa", "#cc9966"];
		public static readonly drumNoteColorsBright: ReadonlyArray<string>    = ["#eeeeee", "#f0d0bb"];
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
            
			Config._centerWave([1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, -1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, -1.0, -1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, -1.0, -1.0, -1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, -1.0, -1.0, -1.0, -1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, -1.0, -1.0, -1.0, -1.0, -1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, -1.0, -1.0, -1.0, -1.0, -1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, -1.0, -1.0, -1.0, -1.0,1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, -1.0, -1.0, -1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, -1.0, -1.0]),
			Config._centerWave([1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0]),
			Config._centerWave([0.0, 0.1875, 0.3125, 0.5625, 0.5, 0.75, 0.875, 1.0, 1.0, 0.6875, 0.5, 0.625, 0.625, 0.5, 0.375, 0.5625, 0.4375, 0.5625, 0.4375, 0.4375, 0.3125, 0.1875, 0.1875, 0.375, 0.5625, 0.5625, 0.5625, 0.5625, 0.5625, 0.4375, 0.25, 0.0]),
			Config._centerWave([1.0, 0.7, 0.1, 0.1, 0, 0, 0, 0, 0, 0.1, 0.2, 0.15, 0.25, 0.125, 0.215, 0.345, 4.0]),
			Config._centerWave([1.0/15.0, 3.0/15.0, 5.0/15.0, 9.0, 0.06]),
			Config._centerWave([-0.5, 3.5, 3.0, -0.5, -0.25, -1.0]),
			Config._centerWave([0.0, 0.05, 0.125, 0.2, 0.25, 0.3, 0.425, 0.475, 0.525, 0.625, 0.675, 0.725, 0.775, 0.8, 0.825, 0.875, 0.9, 0.925, 0.95, 0.975, 0.98, 0.99, 0.995, 1, 0.995, 0.99, 0.98, 0.975, 0.95, 0.925, 0.9, 0.875, 0.825, 0.8, 0.775, 0.725, 0.675, 0.625, 0.525, 0.475, 0.425, 0.3, 0.25, 0.2, 0.125, 0.05, 0.0, -0.05, -0.125, -0.2, -0.25, -0.3, -0.425, -0.475, -0.525, -0.625, -0.675, -0.725, -0.775, -0.8, -0.825, -0.875, -0.9, -0.925, -0.95, -0.975, -0.98, -0.99, -0.995, -1, -0.995, -0.99, -0.98, -0.975, -0.95, -0.925, -0.9, -0.875, -0.825, -0.8, -0.775, -0.725, -0.675, -0.625, -0.525, -0.475, -0.425, -0.3, -0.25, -0.2, -0.125, -0.05]),
			Config._centerWave([1.0, 1.0, 1.0, 1.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0]),
			Config._centerWave([0.0, 0.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0]),
			Config._centerWave([1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0]),
		    Config._centerWave([1.0, 1.0/2.0, 1.0/3.0, 1.0/4.0]),
			Config._centerWave([-0.9, -1.0, -0.85, -0.775, -0.7, -0.6, -0.5, -0.4, -0.325, -0.225, -0.2, -0.125, -0.1, -0.11, -0.125, -0.15, -0.175, -0.18, -0.2, -0.21, -0.22, -0.21, -0.2, -0.175, -0.15, -0.1, -0.5, 0.75, 0.11, 0.175, 0.2, 0.25, 0.26, 0.275, 0.26, 0.25, 0.225, 0.2, 0.19, 0.18, 0.19, 0.2, 0.21, 0.22, 0.23, 0.24, 0.25, 0.26, 0.275, 0.28, 0.29, 0.3, 0.29, 0.28, 0.27, 0.26, 0.25, 0.225, 0.2, 0.175, 0.15, 0.1, 0.075, 0.0, -0.01, -0.025, 0.025, 0.075, 0.2, 0.3, 0.475, 0.6, 0.75, 0.85, 0.85, 1.0, 0.99, 0.95, 0.8, 0.675, 0.475, 0.275, 0.01, -0.15, -0.3, -0.475, -0.5, -0.6, -0.71, -0.81, -0.9, -1.0, -0.9]),
			Config._centerWave([-1.0, -0.95, -0.975, -0.9, -0.85, -0.8, -0.775, -0.65, -0.6, -0.5, -0.475, -0.35, -0.275, -0.2, -0.125, -0.05, 0.0, 0.075, 0.125, 0.15, 0.20, 0.21, 0.225, 0.25, 0.225, 0.21, 0.20, 0.19, 0.175, 0.125, 0.10, 0.075, 0.06, 0.05, 0.04, 0.025, 0.04, 0.05, 0.10, 0.15, 0.225, 0.325, 0.425, 0.575, 0.70, 0.85, 0.95, 1.0, 0.9, 0.675, 0.375, 0.2, 0.275, 0.4, 0.5, 0.55, 0.6, 0.625, 0.65, 0.65, 0.65, 0.65, 0.64, 0.6, 0.55, 0.5, 0.4, 0.325, 0.25, 0.15, 0.05, -0.05, -0.15, -0.275, -0.35, -0.45, -0.55, -0.65, -0.7, -0.78, -0.825, -0.9, -0.925, -0.95, -0.975]),
			Config._centerWave([1.0, 0.0, 0.1, -0.1, -0.2, -0.4, -0.3, -1.0]),
		];
		
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
					FFT.inverseRealFourierTransform(wave);
					FFT.scaleElementsByFactor(wave, 1.0 / Math.sqrt(wave.length));
				} else {
					throw new Error("Unrecognized drum index: " + index);
				}
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
	
	export function filledArray<T>(count: number, value: T): T[] {
		const array: T[] = [];
		for (let i: number = 0; i < count; i++) array[i] = value;
		return array;
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
		public beatsPerBar: number;
		public barCount: number;
		public patternsPerChannel: number;
		public partsPerBeat: number;
		public instrumentsPerChannel: number;
		public loopStart: number;
		public loopLength: number;
		public pitchChannelCount: number;
		public drumChannelCount: number;
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
		}
		
		public toBase64String(): string {
			let bits: BitFieldWriter;
			let buffer: number[] = [];
			
			const base64IntToCharCode: ReadonlyArray<number> = Song._base64IntToCharCode;
			
			buffer.push(base64IntToCharCode[Song._latestVersion]);
			buffer.push(CharCode.n, base64IntToCharCode[this.pitchChannelCount], base64IntToCharCode[this.drumChannelCount]);
			buffer.push(CharCode.s, base64IntToCharCode[this.scale]);
			buffer.push(CharCode.k, base64IntToCharCode[this.key]);
			buffer.push(CharCode.l, base64IntToCharCode[this.loopStart >> 6], base64IntToCharCode[this.loopStart & 0x3f]);
			buffer.push(CharCode.e, base64IntToCharCode[(this.loopLength - 1) >> 6], base64IntToCharCode[(this.loopLength - 1) & 0x3f]);
			buffer.push(CharCode.t, base64IntToCharCode[this.tempo]);
			buffer.push(CharCode.m, base64IntToCharCode[this.reverb]);
			buffer.push(CharCode.a, base64IntToCharCode[this.beatsPerBar - 1]);
			buffer.push(CharCode.g, base64IntToCharCode[(this.barCount - 1) >> 6], base64IntToCharCode[(this.barCount - 1) & 0x3f]);
			buffer.push(CharCode.j, base64IntToCharCode[this.patternsPerChannel - 1]);
			buffer.push(CharCode.i, base64IntToCharCode[this.instrumentsPerChannel - 1]);
			buffer.push(CharCode.r, base64IntToCharCode[Config.partCounts.indexOf(this.partsPerBeat)]);
			
			buffer.push(CharCode.w);
			for (let channel: number = 0; channel < this.getChannelCount(); channel++) for (let i: number = 0; i < this.instrumentsPerChannel; i++) {
				buffer.push(base64IntToCharCode[this.instrumentWaves[channel][i]]);
			}
			
			buffer.push(CharCode.f);
			for (let channel: number = 0; channel < this.getChannelCount(); channel++) for (let i: number = 0; i < this.instrumentsPerChannel; i++) {
				buffer.push(base64IntToCharCode[this.instrumentFilters[channel][i]]);
			}
			
			buffer.push(CharCode.d);
			for (let channel: number = 0; channel < this.getChannelCount(); channel++) for (let i: number = 0; i < this.instrumentsPerChannel; i++) {
				buffer.push(base64IntToCharCode[this.instrumentEnvelopes[channel][i]]);
			}
			
			buffer.push(CharCode.c);
			for (let channel: number = 0; channel < this.getChannelCount(); channel++) for (let i: number = 0; i < this.instrumentsPerChannel; i++) {
				buffer.push(base64IntToCharCode[this.instrumentEffects[channel][i]]);
			}
			
			buffer.push(CharCode.h);
			for (let channel: number = 0; channel < this.getChannelCount(); channel++) for (let i: number = 0; i < this.instrumentsPerChannel; i++) {
				buffer.push(base64IntToCharCode[this.instrumentChorus[channel][i]]);
			}
			
			buffer.push(CharCode.v);
			for (let channel: number = 0; channel < this.getChannelCount(); channel++) for (let i: number = 0; i < this.instrumentsPerChannel; i++) {
				buffer.push(base64IntToCharCode[this.instrumentVolumes[channel][i]]);
			}
			
			buffer.push(CharCode.o);
			for (let channel: number = 0; channel < this.getChannelCount(); channel++) {
				buffer.push(base64IntToCharCode[this.channelOctaves[channel]]);
			}
			
			buffer.push(CharCode.b);
			bits = new BitFieldWriter();
			let neededBits: number = 0;
			while ((1 << neededBits) < this.patternsPerChannel + 1) neededBits++;
			for (let channel: number = 0; channel < this.getChannelCount(); channel++) for (let i: number = 0; i < this.barCount; i++) {
				bits.write(neededBits, this.channelBars[channel][i]);
			}
			bits.encodeBase64(base64IntToCharCode, buffer);
			
			buffer.push(CharCode.p);
			bits = new BitFieldWriter();
			let neededInstrumentBits: number = 0;
			while ((1 << neededInstrumentBits) < this.instrumentsPerChannel) neededInstrumentBits++;
			for (let channel: number = 0; channel < this.getChannelCount(); channel++) {
				const isDrum: boolean = this.getChannelIsDrum(channel);
				const octaveOffset: number = isDrum ? 0 : this.channelOctaves[channel] * 12;
				let lastPitch: number = (isDrum ? 4 : 12) + octaveOffset;
				const recentPitches: number[] = isDrum ? [4,6,7,2,3,8,0,10] : [12, 19, 24, 31, 36, 7, 0];
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
				if (command == CharCode.n) {
					this.pitchChannelCount = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
					this.drumChannelCount  = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
					this.pitchChannelCount = this._clip(Config.pitchChannelCountMin, Config.pitchChannelCountMax + 1, this.pitchChannelCount);
					this.drumChannelCount = this._clip(Config.drumChannelCountMin, Config.drumChannelCountMax + 1, this.drumChannelCount);
					const channelCount: number = this.pitchChannelCount + this.drumChannelCount;
					for (let channel: number = 0; channel < channelCount; channel++) {
						this.channelPatterns[channel] = [];
						this.channelBars[channel] = [];
						this.instrumentWaves[channel] = [];
						this.instrumentFilters[channel] = [];
						this.instrumentEnvelopes[channel] = [];
						this.instrumentEffects[channel] = [];
						this.instrumentChorus[channel] = [];
						this.instrumentVolumes[channel] = [];
					}
					this.channelPatterns.length = channelCount;
					this.channelBars.length = channelCount;
					this.channelOctaves.length = channelCount;
					this.instrumentWaves.length = channelCount;
					this.instrumentFilters.length = channelCount;
					this.instrumentEnvelopes.length = channelCount;
					this.instrumentEffects.length = channelCount;
					this.instrumentChorus.length = channelCount;
					this.instrumentVolumes.length = channelCount;
				} else if (command == CharCode.s) {
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
					this.tempo = this._clip(0, Config.tempoNames.length, this.tempo);
				} else if (command == CharCode.m) {
					this.reverb = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
					this.reverb = this._clip(0, Config.reverbRange, this.reverb);
				} else if (command == CharCode.a) {
					if (beforeThree) {
						this.beatsPerBar = [6, 7, 8, 9, 10][base64CharCodeToInt[compressed.charCodeAt(charIndex++)]];
					} else {
						this.beatsPerBar = base64CharCodeToInt[compressed.charCodeAt(charIndex++)] + 1;
					}
					this.beatsPerBar = Math.max(Config.beatsPerBarMin, Math.min(Config.beatsPerBarMax, this.beatsPerBar));
				} else if (command == CharCode.g) {
					this.barCount = (base64CharCodeToInt[compressed.charCodeAt(charIndex++)] << 6) + base64CharCodeToInt[compressed.charCodeAt(charIndex++)] + 1;
					this.barCount = Math.max(Config.barCountMin, Math.min(Config.barCountMax, this.barCount));
				} else if (command == CharCode.j) {
					this.patternsPerChannel = base64CharCodeToInt[compressed.charCodeAt(charIndex++)] + 1;
					this.patternsPerChannel = Math.max(Config.patternsPerChannelMin, Math.min(Config.patternsPerChannelMax, this.patternsPerChannel));
				} else if (command == CharCode.i) {
					this.instrumentsPerChannel = base64CharCodeToInt[compressed.charCodeAt(charIndex++)] + 1;
					this.instrumentsPerChannel = Math.max(Config.instrumentsPerChannelMin, Math.min(Config.instrumentsPerChannelMax, this.instrumentsPerChannel));
				} else if (command == CharCode.r) {
					this.partsPerBeat = Config.partCounts[base64CharCodeToInt[compressed.charCodeAt(charIndex++)]];
				} else if (command == CharCode.w) {
					if (beforeThree) {
						channel = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
						this.instrumentWaves[channel][0] = this._clip(0, Config.waveNames.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
					} else {
						for (channel = 0; channel < this.getChannelCount(); channel++) {
							for (let i: number = 0; i < this.instrumentsPerChannel; i++) {
								this.instrumentWaves[channel][i] = this._clip(0, i < this.pitchChannelCount ? Config.waveNames.length : Config.drumNames.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
							}
						}
					}
				} else if (command == CharCode.f) {
					if (beforeThree) {
						channel = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
						this.instrumentFilters[channel][0] = [0, 2, 3, 5][this._clip(0, Config.filterNames.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)])];
					} else {
						for (channel = 0; channel < this.getChannelCount(); channel++) {
							for (let i: number = 0; i < this.instrumentsPerChannel; i++) {
								this.instrumentFilters[channel][i] = this._clip(0, Config.filterNames.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
							}
						}
					}
				} else if (command == CharCode.d) {
					if (beforeThree) {
						channel = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
						this.instrumentEnvelopes[channel][0] = this._clip(0, Config.envelopeNames.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
					} else {
						for (channel = 0; channel < this.getChannelCount(); channel++) {
							for (let i: number = 0; i < this.instrumentsPerChannel; i++) {
								this.instrumentEnvelopes[channel][i] = this._clip(0, Config.envelopeNames.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
							}
						}
					}
				} else if (command == CharCode.c) {
					if (beforeThree) {
						channel = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
						this.instrumentEffects[channel][0] = this._clip(0, Config.effectNames.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
						if (this.instrumentEffects[channel][0] == 1) this.instrumentEffects[channel][0] = 3;
						else if (this.instrumentEffects[channel][0] == 3) this.instrumentEffects[channel][0] = 5;
					} else {
						for (channel = 0; channel < this.getChannelCount(); channel++) {
							for (let i: number = 0; i < this.instrumentsPerChannel; i++) {
								this.instrumentEffects[channel][i] = this._clip(0, Config.effectNames.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
							}
						}
					}
				} else if (command == CharCode.h) {
					if (beforeThree) {
						channel = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
						this.instrumentChorus[channel][0] = this._clip(0, Config.chorusNames.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
					} else {
						for (channel = 0; channel < this.getChannelCount(); channel++) {
							for (let i: number = 0; i < this.instrumentsPerChannel; i++) {
								this.instrumentChorus[channel][i] = this._clip(0, Config.chorusNames.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
							}
						}
					}
				} else if (command == CharCode.v) {
					if (beforeThree) {
						channel = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
						this.instrumentVolumes[channel][0] = this._clip(0, Config.volumeNames.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
					} else {
						for (channel = 0; channel < this.getChannelCount(); channel++) {
							for (let i: number = 0; i < this.instrumentsPerChannel; i++) {
								this.instrumentVolumes[channel][i] = this._clip(0, Config.volumeNames.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
							}
						}
					}
				} else if (command == CharCode.o) {
					if (beforeThree) {
						channel = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
						this.channelOctaves[channel] = this._clip(0, 5, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
					} else {
						for (channel = 0; channel < this.getChannelCount(); channel++) {
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
						while ((1 << neededBits) < this.patternsPerChannel) neededBits++;
						subStringLength = Math.ceil(this.getChannelCount() * this.barCount * neededBits / 6);
						const bits: BitFieldReader = new BitFieldReader(base64CharCodeToInt, compressed, charIndex, charIndex + subStringLength);
						for (channel = 0; channel < this.getChannelCount(); channel++) {
							this.channelBars[channel].length = this.barCount;
							for (let i: number = 0; i < this.barCount; i++) {
								this.channelBars[channel][i] = bits.read(neededBits) + 1;
							}
						}
					} else {
						let neededBits2: number = 0;
						while ((1 << neededBits2) < this.patternsPerChannel + 1) neededBits2++;
						subStringLength = Math.ceil(this.getChannelCount() * this.barCount * neededBits2 / 6);
						const bits: BitFieldReader = new BitFieldReader(base64CharCodeToInt, compressed, charIndex, charIndex + subStringLength);
						for (channel = 0; channel < this.getChannelCount(); channel++) {
							this.channelBars[channel].length = this.barCount;
							for (let i: number = 0; i < this.barCount; i++) {
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
					while ((1 << neededInstrumentBits) < this.instrumentsPerChannel) neededInstrumentBits++;
					while (true) {
						this.channelPatterns[channel] = [];
						
						const isDrum: boolean = this.getChannelIsDrum(channel);
						
						const octaveOffset: number = isDrum ? 0 : this.channelOctaves[channel] * 12;
						let note: Note | null = null;
						let pin: NotePin | null = null;
						let lastPitch: number = (isDrum ? 4 : 12) + octaveOffset;
						const recentPitches: number[] = isDrum ? [4,6,7,2,3,8,0,10] : [12, 19, 24, 31, 36, 7, 0];
						const recentShapes: any[] = [];
						for (let i: number = 0; i < recentPitches.length; i++) {
							recentPitches[i] += octaveOffset;
						}
						for (let i: number = 0; i < this.patternsPerChannel; i++) {
							const newPattern: BarPattern | null = new BarPattern();
							newPattern.instrument = bits.read(neededInstrumentBits);
							this.channelPatterns[channel][i] = newPattern;
							
							if (!beforeThree && bits.read(1) == 0) continue;
							
							let curPart: number = 0;
							const newNotes: Note[] = [];
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
							newPattern.notes = newNotes;
						} // for (let i: number = 0; i < patternsPerChannel; i++) {
						
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
					if (isDrum) {
						instrumentArray.push({
							volume: (5 - this.instrumentVolumes[channel][i]) * 20,
							wave: Config.drumNames[this.instrumentWaves[channel][i]],
							envelope: Config.envelopeNames[this.instrumentEnvelopes[channel][i]],
						});
					} else {
						instrumentArray.push({
							volume: (5 - this.instrumentVolumes[channel][i]) * 20,
							wave: Config.waveNames[this.instrumentWaves[channel][i]],
							envelope: Config.envelopeNames[this.instrumentEnvelopes[channel][i]],
							filter: Config.filterNames[this.instrumentFilters[channel][i]],
							chorus: Config.chorusNames[this.instrumentChorus[channel][i]],
							effect: Config.effectNames[this.instrumentEffects[channel][i]],
						});
					}
				}
				
				const patternArray: Object[] = [];
				for (const pattern of this.channelPatterns[channel]) {
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
					sequenceArray.push(this.channelBars[channel][i]);
				}
				for (let l: number = 0; l < loopCount; l++) for (let i: number = this.loopStart; i < this.loopStart + this.loopLength; i++) {
					sequenceArray.push(this.channelBars[channel][i]);
				}
				if (enableOutro) for (let i: number = this.loopStart + this.loopLength; i < this.barCount; i++) {
					sequenceArray.push(this.channelBars[channel][i]);
				}
				
				channelArray.push({
					octaveScrollBar: this.channelOctaves[channel],
					instruments: instrumentArray,
					patterns: patternArray,
					sequence: sequenceArray,
					type: isDrum ? "drum" : "pitch",
				});
			}
			
			return {
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
			if (version !== 5) return;
			
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
				this.tempo = this._clip(0, Config.tempoNames.length, this.tempo);
			}
			
			if (jsonObject.reverb != undefined) {
				this.reverb = this._clip(0, Config.reverbRange, jsonObject.reverb | 0);
			}
			
			if (jsonObject.beatsPerBar != undefined) {
				this.beatsPerBar = Math.max(Config.beatsPerBarMin, Math.min(Config.beatsPerBarMax, jsonObject.beatsPerBar | 0));
			}
			
			if (jsonObject.ticksPerBeat != undefined) {
				this.partsPerBeat = Math.max(3, Math.min(4, jsonObject.ticksPerBeat | 0));
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
				this.loopStart = this._clip(0, this.barCount, jsonObject.introBars | 0);
			}
			if (jsonObject.loopBars != undefined) {
				this.loopLength = this._clip(1, this.barCount - this.loopStart + 1, jsonObject.loopBars | 0);
			}
			
			let pitchChannelCount = 0;
			let drumChannelCount = 0;
			if (jsonObject.channels) {
				this.instrumentVolumes.length = jsonObject.channels.length;
				this.instrumentWaves.length = jsonObject.channels.length;
				this.instrumentEnvelopes.length = jsonObject.channels.length;
				this.instrumentFilters.length = jsonObject.channels.length;
				this.instrumentChorus.length = jsonObject.channels.length;
				this.instrumentEffects.length = jsonObject.channels.length;
				this.channelPatterns.length = jsonObject.channels.length;
				this.channelOctaves.length = jsonObject.channels.length;
				this.channelBars.length = jsonObject.channels.length;
				for (let channel: number = 0; channel < jsonObject.channels.length; channel++) {
					let channelObject: any = jsonObject.channels[channel];
					
					if (channelObject.octaveScrollBar != undefined) {
						this.channelOctaves[channel] = this._clip(0, 5, channelObject.octaveScrollBar | 0);
					}
					
					this.instrumentVolumes[channel] = [];
					this.instrumentWaves[channel] = [];
					this.instrumentEnvelopes[channel] = [];
					this.instrumentFilters[channel] = [];
					this.instrumentChorus[channel] = [];
					this.instrumentEffects[channel] = [];
					this.channelPatterns[channel] = [];
					this.channelBars[channel] = [];
					this.instrumentVolumes[channel].length = this.instrumentsPerChannel;
					this.instrumentWaves[channel].length = this.instrumentsPerChannel;
					this.instrumentEnvelopes[channel].length = this.instrumentsPerChannel;
					this.instrumentFilters[channel].length = this.instrumentsPerChannel;
					this.instrumentChorus[channel].length = this.instrumentsPerChannel;
					this.instrumentEffects[channel].length = this.instrumentsPerChannel;
					this.channelPatterns[channel].length = this.patternsPerChannel;
					this.channelBars[channel].length = this.barCount;
					
					let isDrum: boolean = false;
					if (channelObject.type) {
						isDrum = (channelObject.type == "drum");
					} else {
						// for older files, assume drums are channel 3.
						isDrum = (channel >= 3);
					}
					if (isDrum) drumChannelCount++; else pitchChannelCount++;
					
					for (let i: number = 0; i < this.instrumentsPerChannel; i++) {
						let instrumentObject: any = undefined;
						if (channelObject.instruments) instrumentObject = channelObject.instruments[i];
						if (instrumentObject == undefined) instrumentObject = {};
						if (instrumentObject.volume != undefined) {
							this.instrumentVolumes[channel][i] = this._clip(0, Config.volumeNames.length, Math.round(5 - (instrumentObject.volume | 0) / 20));
						} else {
							this.instrumentVolumes[channel][i] = 0;
						}
						const oldEnvelopeNames: Dictionary<number> = {"binary": 0};
						this.instrumentEnvelopes[channel][i] = oldEnvelopeNames[instrumentObject.envelope] != undefined ? oldEnvelopeNames[instrumentObject.envelope] : Config.envelopeNames.indexOf(instrumentObject.envelope);
						if (this.instrumentEnvelopes[channel][i] == -1) this.instrumentEnvelopes[channel][i] = 1;
						if (isDrum) {
							this.instrumentWaves[channel][i] = Config.drumNames.indexOf(instrumentObject.wave);
							if (this.instrumentWaves[channel][i] == -1) this.instrumentWaves[channel][i] = 1;
							this.instrumentFilters[channel][i] = 0;
							this.instrumentChorus[channel][i] = 0;
							this.instrumentEffects[channel][i] = 0;
						} else {
							this.instrumentWaves[channel][i] = Config.waveNames.indexOf(instrumentObject.wave);
							if (this.instrumentWaves[channel][i] == -1) this.instrumentWaves[channel][i] = 1;
							this.instrumentFilters[channel][i] = Config.filterNames.indexOf(instrumentObject.filter);
							if (this.instrumentFilters[channel][i] == -1) this.instrumentFilters[channel][i] = 0;
							this.instrumentChorus[channel][i] = Config.chorusNames.indexOf(instrumentObject.chorus);
							if (this.instrumentChorus[channel][i] == -1) this.instrumentChorus[channel][i] = 0;
							this.instrumentEffects[channel][i] = Config.effectNames.indexOf(instrumentObject.effect);
							if (this.instrumentEffects[channel][i] == -1) this.instrumentEffects[channel][i] = 0;
						}
					}
				
					for (let i: number = 0; i < this.patternsPerChannel; i++) {
						const pattern: BarPattern = new BarPattern();
						this.channelPatterns[channel][i] = pattern;
					
						let patternObject: any = undefined;
						if (channelObject.patterns) patternObject = channelObject.patterns[i];
						if (patternObject == undefined) continue;
					
						pattern.instrument = this._clip(0, this.instrumentsPerChannel, (patternObject.instrument | 0) - 1);
					
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
						this.channelBars[channel][i] = channelObject.sequence ? Math.min(this.patternsPerChannel, channelObject.sequence[i] >>> 0) : 0;
					}
				}
			}
			
			this.pitchChannelCount = pitchChannelCount;
			this.drumChannelCount = drumChannelCount;
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
		
		private static ensureGeneratedSynthesizerAndDrumWavesExist(song: Song | null): void {
			// Don't bother to generate the drum waves unless the song actually
			// uses them, since they may require a lot of computation.
			if (song != null) {
				for (let i: number = 0; i < song.instrumentsPerChannel; i++) {
					for (let j: number = song.pitchChannelCount; j < song.pitchChannelCount + song.drumChannelCount; j++) {
						Config.getDrumWave(song.instrumentWaves[j][i]);
					}
				}
				Synth.getGeneratedSynthesizer(song.pitchChannelCount, song.drumChannelCount);
			}
		}
		
		public samplesPerSecond: number = 44100;
		private effectDuration: number = 0.14;
		private effectAngle: number = Math.PI * 2.0 / (this.effectDuration * this.samplesPerSecond);
		private effectYMult: number = 2.0 * Math.cos(this.effectAngle);
		private limitDecay: number = 1.0 / (2.0 * this.samplesPerSecond);
		
		public song: Song | null = null;
		public pianoPressed: boolean = false;
		public pianoPitch: number = 0;
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
		private channelPlayheadA: number[] = [0.0, 0.0, 0.0, 0.0];
		private channelPlayheadB: number[] = [0.0, 0.0, 0.0, 0.0];
		private channelSample: number[] = [0.0, 0.0, 0.0, 0.0];
		private drumPlayhead: number = 0.0;
		private drumSample: number = 0.0;
		private stillGoing: boolean = false;
		private effectPlayhead: number = 0.0;
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
			
			Synth.ensureGeneratedSynthesizerAndDrumWavesExist(this.song);
			
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
		
		public snapToBar(): void {
			this.playheadInternal = this.bar;
			this.beat = 0;
			this.part = 0;
			this.arpeggio = 0;
			this.arpeggioSampleCountdown = 0;
			this.effectPlayhead = 0.0;
			
			this.channelSample[0] = 0.0;
			this.channelSample[1] = 0.0;
			this.channelSample[2] = 0.0;
			this.drumSample = 0.0;
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
		
		public synthesize(data: Float32Array, totalSamples: number): void {
			if (this.song == null) {
				for (let i: number = 0; i < totalSamples; i++) {
					data[i] = 0.0;
				}
				return;
			}
			
			var generatedSynthesizer = Synth.getGeneratedSynthesizer(this.song.pitchChannelCount, this.song.drumChannelCount);
			generatedSynthesizer(this, this.song, data, totalSamples);
		}
		
		private static computeChannelInstrument(synth: Synth, song: Song, channel: number, time: number, sampleTime: number, samplesPerArpeggio: number, samples: number, isDrum: boolean) {
			const pattern: BarPattern | null = song.getPattern(channel, synth.bar);
			
			const envelope: number = pattern == null ? 0 : song.instrumentEnvelopes[channel][pattern.instrument];
			
			const channelRoot: number = isDrum ? Config.drumPitchRoots[song.instrumentWaves[channel][pattern == null ? 0 : pattern.instrument]] : Config.keyTransposes[song.key];
			const intervalScale: number = isDrum ? Config.drumInterval : 1;
			
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
			
			let periodDelta: number;
			let periodDeltaScale: number = 1.0;
			let noteVolume: number;
			let volumeDelta: number = 0.0;
			let filter: number = 1.0;
			let filterScale: number = 1.0;
			let vibratoScale: number;
			let harmonyMult: number = 1.0;
			let resetPlayheads: boolean = false;
			
			if (synth.pianoPressed && channel == synth.pianoChannel) {
				const pianoFreq: number = synth.frequencyFromPitch(channelRoot + synth.pianoPitch * intervalScale);
				const instrument = pattern ? pattern.instrument : 0; 
				let pianoPitchDamping: number;
				if (isDrum) {
					if (Config.drumWaveIsSoft[song.instrumentWaves[channel][instrument]]) {
						filter = Math.min(1.0, pianoFreq * sampleTime * Config.drumPitchFilterMult[song.instrumentWaves[channel][pattern!.instrument]]);
						pianoPitchDamping = 24.0;
					} else {
						pianoPitchDamping = 60.0;
					}
				} else {
					pianoPitchDamping = 48.0;
				}
				periodDelta = pianoFreq * sampleTime;
				noteVolume = Math.pow(2.0, -synth.pianoPitch * intervalScale / pianoPitchDamping);
				vibratoScale = Math.pow(2.0, Config.effectVibratos[song.instrumentEffects[channel][instrument]] / 12.0) - 1.0;
			} else if (note == null) {
				periodDelta = 0.0;
				periodDeltaScale = 0.0;
				noteVolume = 0.0;
				vibratoScale = 0.0;
				resetPlayheads = true;
			} else {
				const chorusHarmonizes: boolean = Config.chorusHarmonizes[song.instrumentChorus[channel][pattern!.instrument]];
				let pitch: number = note.pitches[0];
				if (chorusHarmonizes) {
					let harmonyOffset: number = 0.0;
					if (note.pitches.length == 2) {
						harmonyOffset = note.pitches[1] - note.pitches[0];
					} else if (note.pitches.length == 3) {
						harmonyOffset = note.pitches[(synth.arpeggio >> 1) + 1] - note.pitches[0];
					} else if (note.pitches.length == 4) {
						harmonyOffset = note.pitches[(synth.arpeggio == 3 ? 1 : synth.arpeggio) + 1] - note.pitches[0];
					}
					harmonyMult = Math.pow(2.0, harmonyOffset / 12.0);
				} else {
					if (note.pitches.length == 2) {
						pitch = note.pitches[synth.arpeggio >> 1];
					} else if (note.pitches.length == 3) {
						pitch = note.pitches[synth.arpeggio == 3 ? 1 : synth.arpeggio];
					} else if (note.pitches.length == 4) {
						pitch = note.pitches[synth.arpeggio];
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
				const arpeggioStart: number = time * 4 + synth.arpeggio;
				const arpeggioEnd:   number = time * 4 + synth.arpeggio + 1;
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
				
				const startRatio: number = 1.0 - (synth.arpeggioSampleCountdown + samples) / samplesPerArpeggio;
				const endRatio:   number = 1.0 - (synth.arpeggioSampleCountdown)           / samplesPerArpeggio;
				const startInterval: number = arpeggioIntervalStart * (1.0 - startRatio) + arpeggioIntervalEnd * startRatio;
				const endInterval:   number = arpeggioIntervalStart * (1.0 - endRatio)   + arpeggioIntervalEnd * endRatio;
				const startFilterTime: number = arpeggioFilterTimeStart * (1.0 - startRatio) + arpeggioFilterTimeEnd * startRatio;
				const endFilterTime:   number = arpeggioFilterTimeStart * (1.0 - endRatio)   + arpeggioFilterTimeEnd * endRatio;
				const startFreq: number = synth.frequencyFromPitch(channelRoot + (pitch + startInterval) * intervalScale);
				const endFreq:   number = synth.frequencyFromPitch(channelRoot + (pitch + endInterval) * intervalScale);
				let pitchDamping: number;
				if (isDrum) {
					if (Config.drumWaveIsSoft[song.instrumentWaves[channel][pattern!.instrument]]) {
						filter = Math.min(1.0, startFreq * sampleTime * Config.drumPitchFilterMult[song.instrumentWaves[channel][pattern!.instrument]]);
						pitchDamping = 24.0;
					} else {
						pitchDamping = 60.0;
					}
				} else {
					pitchDamping = 48.0;
				}
				let startVol: number = Math.pow(2.0, -(pitch + startInterval) * intervalScale / pitchDamping);
				let endVol:   number = Math.pow(2.0, -(pitch + endInterval) * intervalScale / pitchDamping);
				startVol *= synth.volumeConversion(arpeggioVolumeStart * (1.0 - startRatio) + arpeggioVolumeEnd * startRatio);
				endVol   *= synth.volumeConversion(arpeggioVolumeStart * (1.0 - endRatio)   + arpeggioVolumeEnd * endRatio);
				const freqScale: number = endFreq / startFreq;
				periodDelta = startFreq * sampleTime;
				periodDeltaScale = Math.pow(freqScale, 1.0 / samples);
				noteVolume = startVol;
				volumeDelta = (endVol - startVol) / samples;
				const timeSinceStart: number = (arpeggioStart + startRatio - noteStart) * samplesPerArpeggio / synth.samplesPerSecond;
				if (timeSinceStart == 0.0 && !inhibitRestart) resetPlayheads = true;
				
				if (!isDrum) {
					const filterScaleRate: number = Config.filterDecays[song.instrumentFilters[channel][pattern!.instrument]];
					filter = Math.pow(2, -filterScaleRate * startFilterTime * 4.0 * samplesPerArpeggio / synth.samplesPerSecond);
					const endFilter: number = Math.pow(2, -filterScaleRate * endFilterTime * 4.0 * samplesPerArpeggio / synth.samplesPerSecond);
					filterScale = Math.pow(endFilter / filter, 1.0 / samples);
				}
				
				const vibratoDelay = Config.effectVibratoDelays[song.instrumentEffects[channel][pattern!.instrument]];
				vibratoScale = (time - note.start < vibratoDelay) ? 0.0 : Math.pow(2.0, Config.effectVibratos[song.instrumentEffects[channel][pattern!.instrument]] / 12.0) - 1.0;
			}
			
			return {
				periodDelta: periodDelta,
				periodDeltaScale: periodDeltaScale,
				noteVolume: noteVolume,
				volumeDelta: volumeDelta,
				filter: filter,
				filterScale: filterScale,
				vibratoScale: vibratoScale,
				harmonyMult: harmonyMult,
				resetPlayheads: resetPlayheads,
			};
		}
		
		private static generatedSynthesizers: Array<Array<Function>> = [];
		
		private static getGeneratedSynthesizer(pitchChannelCount: number, drumChannelCount: number): Function {
			if (Synth.generatedSynthesizers[pitchChannelCount] == undefined) {
				Synth.generatedSynthesizers[pitchChannelCount] = [];
			}
			if (Synth.generatedSynthesizers[pitchChannelCount][drumChannelCount] == undefined) {
				const synthSource = [];
				
				for (const line of Synth.synthSourceTemplate) {
					
					if (line.indexOf("#") != -1) {
						if (line.indexOf("// PITCH") != -1) {
							for (let i = 0; i < pitchChannelCount; i++) {
								synthSource.push(line.replace(/#/g, i + ""));
							}
						} else if (line.indexOf("// DRUM") != -1) {
							for (let i = pitchChannelCount; i < pitchChannelCount + drumChannelCount; i++) {
								synthSource.push(line.replace(/#/g, i + ""));
							}
						} else if (line.indexOf("// ALL") != -1) {
							for (let i = 0; i < pitchChannelCount + drumChannelCount; i++) {
								synthSource.push(line.replace(/#/g, i + ""));
							}
						} else {
							throw new Error("Missing channel type annotation for line: " + line);
						}
					} else {
						synthSource.push(line);
					}
				}
				
				Synth.generatedSynthesizers[pitchChannelCount][drumChannelCount] = new Function("synth", "song", "data", "totalSamples", synthSource.join("\n"));
			}
			return Synth.generatedSynthesizers[pitchChannelCount][drumChannelCount];
		}
		
		private static synthSourceTemplate: string[] = `
			
			var bufferIndex = 0;
			
			var sampleTime = 1.0 / synth.samplesPerSecond;
			var samplesPerArpeggio = synth.getSamplesPerArpeggio();
			var effectYMult = synth.effectYMult;
			var limitDecay = synth.limitDecay;
			var volume = synth.volume;
			var delayLine = synth.delayLine;
			var reverb = Math.pow(song.reverb / beepbox.Config.reverbRange, 0.667) * 0.425;
			var ended = false;
			
			// Check the bounds of the playhead:
			if (synth.arpeggioSampleCountdown == 0 || synth.arpeggioSampleCountdown > samplesPerArpeggio) {
				synth.arpeggioSampleCountdown = samplesPerArpeggio;
			}
			if (synth.part >= song.partsPerBeat) {
				synth.beat++;
				synth.part = 0;
				synth.arpeggio = 0;
				synth.arpeggioSampleCountdown = samplesPerArpeggio;
			}
			if (synth.beat >= song.beatsPerBar) {
				synth.bar++;
				synth.beat = 0;
				synth.part = 0;
				synth.arpeggio = 0;
				synth.arpeggioSampleCountdown = samplesPerArpeggio;
				
				if (synth.loopCount == -1) {
					if (synth.bar < song.loopStart && !synth.enableIntro) synth.bar = song.loopStart;
					if (synth.bar >= song.loopStart + song.loopLength && !synth.enableOutro) synth.bar = song.loopStart;
				}
			}
			if (synth.bar >= song.barCount) {
				if (synth.enableOutro) {
					synth.bar = 0;
					synth.enableIntro = true;
					ended = true;
					synth.pause();
				} else {
					synth.bar = song.loopStart;
				}
 			}
			if (synth.bar >= song.loopStart) {
				synth.enableIntro = false;
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
				var instrumentChannel# = song.getPatternInstrument(#, synth.bar); // ALL
				var maxChannel#Volume = beepbox.Config.channelVolumes[#] * (song.instrumentVolumes[#][instrumentChannel#] == 5 ? 0.0 : Math.pow(2, -beepbox.Config.volumeValues[song.instrumentVolumes[#][instrumentChannel#]])) * beepbox.Config.waveVolumes[song.instrumentWaves[#][instrumentChannel#]] * beepbox.Config.filterVolumes[song.instrumentFilters[#][instrumentChannel#]] * beepbox.Config.chorusVolumes[song.instrumentChorus[#][instrumentChannel#]] * 0.5; // PITCH
				var maxChannel#Volume = beepbox.Config.channelVolumes[#] * (song.instrumentVolumes[#][instrumentChannel#] == 5 ? 0.0 : Math.pow(2, -beepbox.Config.volumeValues[song.instrumentVolumes[#][instrumentChannel#]])) * beepbox.Config.drumVolumes[song.instrumentWaves[#][instrumentChannel#]]; // DRUM
				var channel#Wave = beepbox.Config.waves[song.instrumentWaves[#][instrumentChannel#]]; // PITCH
				var channel#Wave = beepbox.Config.getDrumWave(song.instrumentWaves[#][instrumentChannel#]); // DRUM
				var channel#WaveLength = channel#Wave.length; // PITCH
				var channel#FilterBase = Math.pow(2, -beepbox.Config.filterBases[song.instrumentFilters[#][instrumentChannel#]]); // PITCH
				var channel#TremoloScale = beepbox.Config.effectTremolos[song.instrumentEffects[#][instrumentChannel#]]; // PITCH
				
				// Reuse initialized instruments until getting to the end of the sample period or the end of the current bar.
				while (totalSamples > 0) {
					var samples;
					if (synth.arpeggioSampleCountdown <= totalSamples) {
						samples = synth.arpeggioSampleCountdown;
					} else {
						samples = totalSamples;
					}
					totalSamples -= samples;
					synth.arpeggioSampleCountdown -= samples;
					
					var time = synth.part + synth.beat * song.partsPerBeat;
				
					var channel#ChorusA = Math.pow(2.0, (beepbox.Config.chorusOffsets[song.instrumentChorus[#][instrumentChannel#]] + beepbox.Config.chorusIntervals[song.instrumentChorus[#][instrumentChannel#]]) / 12.0); // PITCH
					var channel#ChorusB = Math.pow(2.0, (beepbox.Config.chorusOffsets[song.instrumentChorus[#][instrumentChannel#]] - beepbox.Config.chorusIntervals[song.instrumentChorus[#][instrumentChannel#]]) / 12.0); // PITCH
					var channel#ChorusSign = (song.instrumentChorus[#][instrumentChannel#] == 7) ? -1.0 : 1.0; // PITCH
					if (song.instrumentChorus[#][instrumentChannel#] == 0) synth.channelPlayheadB[#] = synth.channelPlayheadA[#]; // PITCH
					
					var channel#PlayheadDelta = 0; // ALL
					var channel#PlayheadDeltaScale = 0; // ALL
					var channel#Volume = 0; // ALL
					var channel#VolumeDelta = 0; // ALL
					var channel#Filter = 0; // ALL
					var channel#FilterScale = 0; // PITCH
					var channel#VibratoScale = 0; // PITCH
					
					var instrument# = beepbox.Synth.computeChannelInstrument(synth, song, #, time, sampleTime, samplesPerArpeggio, samples, false); // PITCH
					var instrument# = beepbox.Synth.computeChannelInstrument(synth, song, #, time, sampleTime, samplesPerArpeggio, samples, true); // DRUM
					
					channel#PlayheadDelta = instrument#.periodDelta; // PITCH
					channel#PlayheadDelta = instrument#.periodDelta / 32768.0; // DRUM
					channel#PlayheadDeltaScale = instrument#.periodDeltaScale; // ALL
					channel#Volume = instrument#.noteVolume * maxChannel#Volume; // ALL
					channel#VolumeDelta = instrument#.volumeDelta * maxChannel#Volume; // ALL
					channel#Filter = instrument#.filter * channel#FilterBase; // PITCH
					channel#Filter = instrument#.filter; // DRUM
					channel#FilterScale = instrument#.filterScale; // PITCH
					channel#VibratoScale = instrument#.vibratoScale; // PITCH
					channel#ChorusB *= instrument#.harmonyMult; // PITCH
					if (instrument#.resetPlayheads) { synth.channelSample[#] = 0.0; synth.channelPlayheadA[#] = 0.0; synth.channelPlayheadB[#] = 0.0; } // PITCH
					
					var effectY     = Math.sin(synth.effectPlayhead);
					var prevEffectY = Math.sin(synth.effectPlayhead - synth.effectAngle);
					
					var channel#PlayheadA = +synth.channelPlayheadA[#]; // PITCH
					var channel#PlayheadB = +synth.channelPlayheadB[#]; // PITCH
					var channel#Playhead  = +synth.channelPlayheadA[#]; // DRUM
					
					var channel#Sample = +synth.channelSample[#]; // ALL
					
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
						
						channel#Sample += ((channel#Wave[0|(channel#PlayheadA * channel#WaveLength)] + channel#Wave[0|(channel#PlayheadB * channel#WaveLength)] * channel#ChorusSign) * channel#Volume * channel#Tremolo - channel#Sample) * channel#Filter; // PITCH
						channel#Sample += (channel#Wave[0|(channel#Playhead * 32768.0)] * channel#Volume - channel#Sample) * channel#Filter; // DRUM
						channel#Volume += channel#VolumeDelta; // ALL
						channel#PlayheadA += channel#PlayheadDelta * channel#Vibrato * channel#ChorusA; // PITCH
						channel#PlayheadB += channel#PlayheadDelta * channel#Vibrato * channel#ChorusB; // PITCH
						channel#Playhead += channel#PlayheadDelta; // DRUM
						channel#PlayheadDelta *= channel#PlayheadDeltaScale; // ALL
						channel#Filter *= channel#FilterScale; // PITCH
						channel#PlayheadA -= 0|channel#PlayheadA; // PITCH
						channel#PlayheadB -= 0|channel#PlayheadB; // PITCH
						channel#Playhead -= 0|channel#Playhead; // DRUM
						
						// Reverb, implemented using a feedback delay network with a Hadamard matrix and lowpass filters.
						// good ratios:    0.555235 + 0.618033 + 0.818 +   1.0 = 2.991268
						// Delay lengths:  3041     + 3385     + 4481  +  5477 = 16384 = 2^14
						// Buffer offsets: 3041    -> 6426   -> 10907 -> 16384
						var delayPos1 = (delayPos +  3041) & 0x3FFF;
						var delayPos2 = (delayPos +  6426) & 0x3FFF;
						var delayPos3 = (delayPos + 10907) & 0x3FFF;
						var delaySample0 = delayLine[delayPos ]
							+ channel#Sample // PITCH
						;
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
						bufferIndex = bufferIndex + 1;
						samples--;
					}
					
					synth.channelPlayheadA[#] = channel#PlayheadA; // PITCH
					synth.channelPlayheadB[#] = channel#PlayheadB; // PITCH
					synth.channelPlayheadA[#] = channel#Playhead; // DRUM
					synth.channelSample[#] = channel#Sample; // ALL
					
					synth.delayPos = delayPos;
					synth.delayFeedback0 = delayFeedback0;
					synth.delayFeedback1 = delayFeedback1;
					synth.delayFeedback2 = delayFeedback2;
					synth.delayFeedback3 = delayFeedback3;
					synth.limit = limit;
					
					if (effectYMult * effectY - prevEffectY > prevEffectY) {
						synth.effectPlayhead = Math.asin(effectY);
					} else {
						synth.effectPlayhead = Math.PI - Math.asin(effectY);
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
									synth.beat = 0;
									synth.effectPlayhead = 0.0;
									synth.bar++;
									if (synth.bar < song.loopStart) {
										if (!synth.enableIntro) synth.bar = song.loopStart;
									} else {
										synth.enableIntro = false;
									}
									if (synth.bar >= song.loopStart + song.loopLength) {
										if (synth.loopCount > 0) synth.loopCount--;
										if (synth.loopCount > 0 || !synth.enableOutro) {
											synth.bar = song.loopStart;
										}
									}
									if (synth.bar >= song.barCount) {
										synth.bar = 0;
										synth.enableIntro = true;
										ended = true;
										synth.pause();
									}
									
									// The bar changed, may need to reinitialize instruments.
									break;
								}
							}
						}
					}
				}
			}
			
			synth.playheadInternal = (((synth.arpeggio + 1.0 - synth.arpeggioSampleCountdown / samplesPerArpeggio) / 4.0 + synth.part) / song.partsPerBeat + synth.beat) / song.beatsPerBar + synth.bar;
		`.split("\n");
		
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
