package {
	import flash.display.*;
	import flash.events.*;
	import flash.filters.*;
	import flash.geom.*;
	import flash.media.*;
	import flash.text.*;
	import flash.utils.*;
	import flash.ui.*;
	
	public class Bar {
		public static const numBeats: int = 32;
		public static const numPitches: int = 16;
		public static const pitches: Array = [42,44,46,49,51,54,56,58,61,63,66,68,70,73,75,78,];
		
		public var notes: Array;
		
		public function Bar() {
			notes = [];
			for (var j: int = 0; j < numBeats; j++) {
				notes[j] = [];
				for (var i: int = 0; i < numPitches; i++) {
					notes[j][i] = Math.random() > 0.95;
				}
			}
		}
	}
}
