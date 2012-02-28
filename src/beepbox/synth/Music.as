package beepbox.synth {
	public class Music {
		// C1 has index 24 on the MIDI scale. C8 is 108, and C9 is 120. C10 is barely in the audible range.
		public static const scaleNames: Array = ["easy :)", "easy :(", "island :)", "island :(", "blues :)", "blues :(", "normal :)", "normal :(", "gypsy :)", "gypsy :(", "expert"];
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
		public static const waveNames: Array = ["triangle", "square", "pulse wide", "pulse narrow", "sawtooth"/*, "checkmark", "two pulses", "spiky", "plateau"*/];
		public static const waveVolumes: Array = [1.0, 0.5, 0.5, 0.5, 0.65, 0.5, 0.4, 0.4, 1.0];
		public static const filterNames: Array = ["1: full", "2: soft", "3: softer", "4: muffled", "5: muffled", "6: muffled"];
		public static const filterValues: Array = [1.0, 2.0, 3.0, 4.0, 5.0, 6.0];
		public static const filterDecayNames: Array = ["1: flat", "2: slowest", "3: slower", "4: slow", "5: fast", "6: faster", "7: fastest"];
		public static const filterDecayValues: Array = [0.0, 2.0, 4.0, 6.0, 8.0, 10.0, 12.0];
		public static const envelopeNames: Array = ["alarm", "pluck", "strike", "echo", "blow", "ease"];
		public static const effectNames: Array = ["none", "vibrato 1", "vibrato 2", "vibrato 3", "vibrato 4", "tremelo 1", "tremelo 2", "tremelo 3", "tremelo 4"];
		public static const channelVolumes: Array = [0.22, 0.25, 0.28, 0.25];
		public static const drumInterval: int = 6;
		public static const numChannels: int = 4;
		public static const numBars: int = 16;
		public static const drumCount: int = 11;
		public static const noteCount: int = 37;
	}
}
