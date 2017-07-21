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

package beepbox.synth {
	public class Music {
		public static const scaleNames: Array = ["easy :)", "easy :(", "island :)", "island :(", "blues :)", "blues :(", "normal :)", "normal :(", "dbl harmonic :)", "dbl harmonic :(", "enigma", "expert"];
		public static const scaleFlags: Array = [
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
		public static const pianoScaleFlags: Array = [ true, false,  true, false,  true,  true, false,  true, false,  true, false,  true];
		// C1 has index 24 on the MIDI scale. C8 is 108, and C9 is 120. C10 is barely in the audible range.
		public static const keyNames: Array = ["B", "A#", "A", "G#", "G", "F#", "F", "E", "D#", "D", "C#", "C"];
		public static const keyTransposes: Array = [23, 22, 21, 20, 19, 18, 17, 16, 15, 14, 13, 12];
		public static const tempoNames: Array = ["molasses", "slow", "leisurely", "moderate", "steady", "brisk", "hasty", "fast", "strenuous", "grueling", "hyper", "ludicrous"];
		public static const reverbRange: int = 4;
		public static const beatsMin: int = 3;
		public static const beatsMax: int = 15;
		public static const barsMin: int = 1;
		public static const barsMax: int = 128;
		public static const patternsMin: int = 1;
		public static const patternsMax: int = 64;
		public static const instrumentsMin: int = 1;
		public static const instrumentsMax: int = 10;
		public static const partNames: Array = ["triples", "standard"];
		public static const partCounts: Array = [3, 4];
		public static const pitchNames: Array = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
		public static const waveNames: Array = ["triangle", "square", "pulse wide", "pulse narrow", "sawtooth", "double saw", "double pulse", "spiky", "plateau"];
		public static const waveVolumes: Array = [1.0, 0.5, 0.5, 0.5, 0.65, 0.5, 0.4, 0.4, 0.94];
		public static const drumNames: Array = ["retro", "white"];
		public static const drumVolumes: Array = [0.25, 1.0];
		public static const filterNames: Array = ["sustain sharp", "sustain medium", "sustain soft", "decay sharp", "decay medium", "decay soft"];
		public static const filterBases: Array = [2.0, 3.5, 5.0, 1.0, 2.5, 4.0];
		public static const filterDecays: Array = [0.0, 0.0, 0.0, 10.0, 7.0, 4.0];
		public static const filterVolumes: Array = [0.4, 0.7, 1.0, 0.5, 0.75, 1.0];
		public static const attackNames: Array = ["binary", "sudden", "smooth", "slide"];
		public static const effectNames: Array = ["none", "vibrato light", "vibrato delayed", "vibrato heavy", "tremelo light", "tremelo heavy"];
		public static const effectVibratos: Array = [0.0, 0.15, 0.3, 0.45, 0.0, 0.0];
		public static const effectTremelos: Array = [0.0, 0.0, 0.0, 0.0, 0.25, 0.5];
		public static const chorusNames: Array = ["union", "shimmer", "hum", "honky tonk", "dissonant", "fifths", "octaves", "bowed"];
		public static const chorusValues: Array = [0.0, 0.02, 0.05, 0.1, 0.25, 3.5, 6, 0.02];
		public static const chorusOffsets: Array = [0.0, 0.0, 0.0, 0.0, 0.0, 3.5, 6, 0.0];
		public static const chorusVolumes: Array = [0.7, 0.8, 1.0, 1.0, 0.9, 0.9, 0.8, 1.0];
		public static const volumeNames: Array = ["loudest", "loud", "medium", "quiet", "quietest", "mute"];
		public static const volumeValues: Array = [0.0, 0.5, 1.0, 1.5, 2.0, -1.0];
		public static const channelVolumes: Array = [0.27, 0.27, 0.27, 0.19];
		public static const drumInterval: int = 6;
		public static const numChannels: int = 4;
		public static const drumCount: int = 12;
		public static const pitchCount: int = 37;
		public static const maxPitch: int = 84;
	}
}
