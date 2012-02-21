package {
	public class Music {
		// C1 has index 24 on the MIDI scale. C8 is 108, and C9 is 120. C10 is barely in the audible range.
		public static const bassC: int    = 24;
		public static const harmonyC: int = 36;
		public static const leadC: int    = 48;
		public static const lowC: int = leadC;
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
		public static const keyNames: Array = ["C", "B", "A#", "A", "G#", "G", "F#", "F", "E", "D#", "D", "C#", "C"];
		public static const keyTransposes: Array = [12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0];
	}
}
