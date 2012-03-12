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
		// C1 has index 24 on the MIDI scale. C8 is 108, and C9 is 120. C10 is barely in the audible range.
		public static const scaleNames: Array = ["easy :)", "easy :(", "island :)", "island :(", "blues :)", "blues :(", "normal :)", "normal :(", "gypsy :)", "gypsy :(", "mystic", "expert"];
		public static const scaleFlags: Array = [
			[ true, false,  true, false,  true, false, false,  true, false,  true, false, false],
			[ true, false, false,  true, false,  true, false,  true, false, false,  true, false],
			[ true, false, false, false,  true,  true, false,  true, false, false, false,  true],
			[ true,  true, false,  true, false, false, false,  true,  true, false, false, false],
			[ true, false, false,  true,  true, false, false,  true, false,  true,  true, false],
			[ true, false, false,  true, false,  true,  true,  true, false, false,  true, false],
			[ true, false,  true, false,  true,  true, false,  true, false,  true, false,  true],
			[ true, false,  true,  true, false,  true, false,  true,  true, false,  true, false],
			[ true,  true, false, false,  true,  true, false,  true,  true, false,  true, false],
			[ true, false,  true,  true, false, false,  true,  true,  true, false, false,  true],
			[ true, false,  true, false,  true, false,  true, false,  true, false,  true, false],
			[ true,  true,  true,  true,  true,  true,  true,  true,  true,  true,  true,  true],
		];
		public static const pianoScaleFlags: Array = [ true, false,  true, false,  true,  true, false,  true, false,  true, false,  true];
		public static const keyNames: Array = ["B", "A#", "A", "G#", "G", "F#", "F", "E", "D#", "D", "C#", "C"];
		public static const keyTransposes: Array = [11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0];
		public static const channelNames: Array = ["lead", "harmony", "bass", "drums"];
		public static const channelRoots: Array = [48, 36, 24, 69];
		public static const tempoNames: Array = ["slow", "steady", "fast", "hyper"];
		public static const beatNames: Array = ["6 beats", "7 beats", "8 beats", "9 beats", "10 beats"];
		public static const beatCounts: Array = [6, 7, 8, 9, 10];
		public static const partNames: Array = ["3 parts", "4 parts"];
		public static const partCounts: Array = [3, 4];
		public static const noteNames: Array = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
		public static const waveNames: Array = ["triangle", "square", "pulse wide", "pulse narrow", "sawtooth", "double saw", "double pulse", "spiky", "plateau"];
		public static const waveVolumes: Array = [1.0, 0.5, 0.5, 0.5, 0.65, 0.5, 0.4, 0.4, 0.94];
		public static const filterNames: Array = ["flat sharp", "flat soft", "decay sharp", "decay soft"];
		public static const filterBases: Array = [2.0, 5.0, 1.0, 4.0];
		public static const filterDecays: Array = [0.0, 0.0, 10.0, 4.0];
		public static const filterVolumes: Array = [0.4, 1.0, 0.5, 1.0];
		public static const effectNames: Array = ["none", "vibrato light", "vibrato delayed", "vibrato heavy", "tremelo light", "tremelo heavy"];
		public static const effectVibratos: Array = [0.0, 0.15, 0.3, 0.45, 0.0, 0.0];
		public static const effectTremelos: Array = [0.0, 0.0, 0.0, 0.0, 0.25, 0.5];
		public static const chorusNames: Array = ["union", "shimmer", "choir", "honky tonk", "dissonant"];
		public static const chorusValues: Array = [0.0, 0.02, 0.05, 0.1, 0.25];
		public static const volumeNames: Array = ["loudest", "loud", "medium", "quiet", "quietest", "mute"];
		public static const volumeValues: Array = [0.0, 0.5, 1.0, 1.5, 2.0, -1.0];
		public static const channelVolumes: Array = [0.259, 0.294, 0.329, 0.118];
		public static const drumInterval: int = 6;
		public static const numChannels: int = 4;
		public static const numBars: int = 16;
		public static const drumCount: int = 11;
		public static const noteCount: int = 37;
	}
}
