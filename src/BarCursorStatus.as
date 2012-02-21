package {
	public class BarCursorStatus {
		public var prevTone:  Tone = null;
		public var curTone:   Tone = null;
		public var nextTone:  Tone = null;
		public var note:      int  = 0;
		public var noteIndex: int  = -1;
		public var curIndex:  int  = 0;
		public var start:     int  = 0;
		public var end:       int  = 0;
		public var part:      int  = 0;
		public var tonePart:  int  = 0;
		public var nearPin:   int  = 0;
		public var nearEnd:   Boolean = false;
	}
}
