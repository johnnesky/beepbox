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

package beepbox.editor {
	import flash.display.*;
	import flash.events.*;
	import flash.geom.*;
	import flash.media.*;
	import flash.text.*;
	import flash.ui.*;
	import flash.utils.*;
	
	import beepbox.synth.*;
	
	public class PatternEditor extends Sprite {
		public var editorWidth: Number;
		public const editorHeight: Number = 481;
		public var partWidth: Number;
		public var pitchHeight: Number;
		public var pitchCount: int;
		
		[Bindable]
		public var doc: Document;
		
		private var preview: Sprite;
		private var playhead: Sprite;
		private var mouseDown: Boolean = false;
		private var mouseOver: Boolean = false;
		private var mouseDragging: Boolean = false;
		private var mouseHorizontal: Boolean = false;
		private var defaultPinChannels: Array = [
			[new NotePin(0, 0, 3), new NotePin(0, 2, 3)],
			[new NotePin(0, 0, 3), new NotePin(0, 2, 3)],
			[new NotePin(0, 0, 3), new NotePin(0, 2, 3)],
			[new NotePin(0, 0, 3), new NotePin(0, 2, 0)],
		];
		private var copiedPinChannels: Array = defaultPinChannels.concat();
		private var copiedPins: Array;
		private var mouseXStart: Number = 0;
		private var mouseYStart: Number = 0;
		private var mouseXPrev: Number = 0;
		private var mouseYPrev: Number = 0;
		//private var precise: Boolean = false;
		//private var precisionX: Number = 0;
		private var dragChange: Change = null;
		private var cursor: PatternCursor = new PatternCursor();
		private var pattern: BarPattern;
		private var playheadX: Number = 0.0;
		private var octaveOffset: int = 0;
		
		public function PatternEditor(doc: Document): void {
			this.doc = doc;
			preview = new Sprite();
			addChild(preview);
			playhead = new Sprite();
			addChild(playhead);
			doc.watch(documentChanged);
			documentChanged();
			updateCursorStatus();
			updatePreview();
			addEventListener(Event.ADDED_TO_STAGE, onAddedToStage);
		}
		
		private function onAddedToStage(event: Event): void {
			addEventListener(Event.ENTER_FRAME, onEnterFrame);
			addEventListener(MouseEvent.MOUSE_DOWN, onMousePressed);
			stage.addEventListener(MouseEvent.MOUSE_MOVE, onMouseMoved);
			stage.addEventListener(MouseEvent.MOUSE_UP, onMouseReleased);
			addEventListener(MouseEvent.ROLL_OVER, onMouseOver);
			addEventListener(MouseEvent.ROLL_OUT, onMouseOut);
		}
		
		private function updateCursorStatus(): void {
			var i: int;
			var j: int;
			
			if (pattern == null) return;
			
			cursor = new PatternCursor();
			
			if (mouseOver == false || mouseX < 0 || mouseX > editorWidth || mouseY < 0 || mouseY > editorHeight) return;
			
			cursor.part = int(Math.max(0, Math.min(doc.song.beats * doc.song.parts - 1, mouseX / partWidth)));
			
			for each (var note: Note in pattern.notes) {
				if (note.end <= cursor.part) {
					cursor.prevNote = note;
					cursor.curIndex++;
				} else if (note.start <= cursor.part && note.end > cursor.part) {
					cursor.curNote = note;
				} else if (note.start > cursor.part) {
					cursor.nextNote = note;
					break;
				}
			}
			
			var mousePitch: Number = findMousePitch(mouseY);
			
			if (cursor.curNote != null) {
				cursor.start = cursor.curNote.start;
				cursor.end   = cursor.curNote.end;
				cursor.pins  = cursor.curNote.pins;
				
				var interval: Number;
				var error: Number;
				var prevPin: NotePin;
				var nextPin: NotePin = cursor.curNote.pins[0];
				for (j = 1; j < cursor.curNote.pins.length; j++) {
					prevPin = nextPin;
					nextPin = cursor.curNote.pins[j];
					var leftSide:    Number = partWidth * (cursor.curNote.start + prevPin.time);
					var rightSide:   Number = partWidth * (cursor.curNote.start + nextPin.time);
					if (mouseX > rightSide) continue;
					if (mouseX < leftSide) throw new Error();
					var intervalRatio: Number = (mouseX - leftSide) / (rightSide - leftSide);
					var arc: Number = Math.sqrt(1.0 / Math.sqrt(4.0) - Math.pow(intervalRatio - 0.5, 2.0)) - 0.5;
					var bendHeight: Number = Math.abs(nextPin.interval - prevPin.interval);
					interval = prevPin.interval * (1.0 - intervalRatio) + nextPin.interval * intervalRatio;
					error = arc * bendHeight + 1.0;
					break;
				}
				
				var minInterval: int = int.MAX_VALUE;
				var maxInterval: int = int.MIN_VALUE;
				var bestDistance: Number = Number.MAX_VALUE;
				for each (nextPin in cursor.curNote.pins) {
					if (minInterval > nextPin.interval) minInterval = nextPin.interval;
					if (maxInterval < nextPin.interval) maxInterval = nextPin.interval;
					var pinDistance: Number = Math.abs(cursor.curNote.start + nextPin.time - mouseX / partWidth);
					if (bestDistance > pinDistance) {
						bestDistance = pinDistance;
						cursor.nearPinIndex = cursor.curNote.pins.indexOf(nextPin);
					}
				}
				
				mousePitch -= interval;
				cursor.pitch = snapToPitch(mousePitch, -minInterval, (doc.channel == 3 ? Music.drumCount - 1 : Music.maxPitch) - maxInterval);
				
				var nearest: Number = error;
				for (i = 0; i < cursor.curNote.pitches.length; i++) {
					var distance: Number = Math.abs(cursor.curNote.pitches[i] - mousePitch + 0.5);
					if (distance > nearest) continue;
					nearest = distance;
					cursor.pitch = cursor.curNote.pitches[i];
				}
				
				for (i = 0; i < cursor.curNote.pitches.length; i++) {
					if (cursor.curNote.pitches[i] == cursor.pitch) {
						cursor.pitchIndex = i;
						break;
					}
				}
			} else {
				cursor.pitch = snapToPitch(mousePitch, 0, Music.maxPitch);
				var defaultLength: int = copiedPins[copiedPins.length-1].time;
				var quadBeats: int = cursor.part / doc.song.parts;
				var modLength: int = defaultLength % doc.song.parts;
				var modMouse: int = cursor.part % doc.song.parts;
				if (defaultLength == 1) {
					cursor.start = cursor.part;
				} else if (modLength == 0) {
					cursor.start = quadBeats * doc.song.parts;
					if (doc.song.parts >> 1 == doc.song.parts / 2 && modMouse > doc.song.parts / 2 && defaultLength == doc.song.parts) {
						cursor.start += doc.song.parts / 2;
					}
				} else {
					cursor.start = quadBeats * doc.song.parts;
					if (modLength == doc.song.parts / 2) {
						if (modMouse >= doc.song.parts / 2) {
							cursor.start += doc.song.parts - modLength;
						}
					} else {
						if (modMouse > doc.song.parts / 2) {
							cursor.start += doc.song.parts - modLength;
						}
					}
				}
				cursor.end = cursor.start + defaultLength;
				var forceStart: int = 0;
				var forceEnd: int = doc.song.beats * doc.song.parts;
				if (cursor.prevNote != null) {
					forceStart = cursor.prevNote.end;
				}
				if (cursor.nextNote != null) {
					forceEnd   = cursor.nextNote.start;
				}
				if (cursor.start < forceStart) {
					cursor.start = forceStart;
					cursor.end = cursor.start + defaultLength;
					if (cursor.end > forceEnd) {
						cursor.end = forceEnd;
					}
				} else if (cursor.end > forceEnd) {
					cursor.end = forceEnd;
					cursor.start = cursor.end - defaultLength;
					if (cursor.start < forceStart) {
						cursor.start = forceStart;
					}
				}
				
				if (cursor.end - cursor.start == defaultLength) {
					cursor.pins = copiedPins;
				} else {
					cursor.pins = [];
					for each (var oldPin: NotePin in copiedPins) {
						if (oldPin.time <= cursor.end - cursor.start) {
							cursor.pins.push(new NotePin(0, oldPin.time, oldPin.volume));
							if (oldPin.time == cursor.end - cursor.start) break;
						} else {
							cursor.pins.push(new NotePin(0, cursor.end - cursor.start, oldPin.volume));
							break;
						}
					}
				}
			}
			
			cursor.valid = true;
		}
		
		private function findMousePitch(pixelY: Number): Number {
			return Math.max(0, Math.min(pitchCount-1, pitchCount - (pixelY / pitchHeight))) + octaveOffset;
		}
		
		private function snapToPitch(guess: Number, min: int, max: int): int {
			if (guess < min) guess = min;
			if (guess > max) guess = max;
			var scale: Array = Music.scaleFlags[doc.song.scale];
			if (scale[int(guess) % 12] || doc.channel == 3) {
				return int(guess);
			} else {
				var topPitch: int = int(guess) + 1;
				var bottomPitch: int = int(guess) - 1;
				while (scale[topPitch % 12] == false) {
					topPitch++;
				}
				while (scale[(bottomPitch) % 12] == false) {
					bottomPitch--;
				}
				if (topPitch > max) {
					if (bottomPitch < min) {
						return min;
					} else {
						return bottomPitch;
					}
				} else if (bottomPitch < min) {
					return topPitch;
				}
				var topRange: Number = topPitch;
				var bottomRange: Number = bottomPitch + 1;
				if (topPitch % 12 == 0 || topPitch % 12 == 7) {
					topRange -= 0.5;
				}
				if (bottomPitch % 12 == 0 || bottomPitch % 12 == 7) {
					bottomRange += 0.5;
				}
				return guess - bottomRange > topRange - guess ? topPitch : bottomPitch;
			}
		}
		
		private function copyPins(note: Note): void {
			copiedPins = [];
			for each (var oldPin: NotePin in note.pins) {
				copiedPins.push(new NotePin(0, oldPin.time, oldPin.volume));
			}
			for (var i: int = 1; i < copiedPins.length - 1; ) {
				if (copiedPins[i-1].volume == copiedPins[i].volume && 
				    copiedPins[i].volume == copiedPins[i+1].volume)
				{
					copiedPins.splice(i, 1);
				} else {
					i++;
				}
			}
			copiedPinChannels[doc.channel] = copiedPins;
		}
		
		public function resetCopiedPins(): void {
			copiedPinChannels = defaultPinChannels.concat();
		}
		
		private function onEnterFrame(event: Event): void {
			playhead.graphics.clear();
			if (!doc.synth.playing) return;
			if (pattern == null) return;
			if (doc.song.getPattern(doc.channel, int(doc.synth.playhead)) != pattern) return;
			var modPlayhead: Number = doc.synth.playhead - int(doc.synth.playhead);
			if (Math.abs(modPlayhead - playheadX) > 0.1) {
				playheadX = modPlayhead;
			} else {
				playheadX += (modPlayhead - playheadX) * 0.2;
			}
			playhead.graphics.lineStyle(4, 0xffffff);
			playhead.graphics.moveTo(playheadX * editorWidth, 0);
			playhead.graphics.lineTo(playheadX * editorWidth, editorHeight);
			playhead.graphics.lineStyle();
		}
		
		private function onMouseOver(event: Event): void {
			mouseOver = true;
		}
		
		private function onMouseOut(event: Event): void {
			mouseOver = false;
		}
		
		private function onMousePressed(event: Event): void {
			if (pattern == null) return;
			mouseDown = true;
			mouseXStart = mouseX;
			mouseYStart = mouseY;
			mouseXPrev = mouseX;
			mouseYPrev = mouseY;
			updateCursorStatus();
			updatePreview();
		}
		
		private function onMouseMoved(event: Event): void {
			var start: int;
			var end: int;
			var i: int = 0;
			if (pattern == null) return;
			if (mouseDown && cursor.valid) {
				if (!mouseDragging) {
					var dx: Number = mouseX - mouseXStart;
					var dy: Number = mouseY - mouseYStart;
					if (Math.sqrt(dx * dx + dy * dy) > 5) {
						mouseDragging = true;
						mouseHorizontal = Math.abs(dx) >= Math.abs(dy);
					}
				}
				
				if (mouseDragging) {
					if (dragChange != null) {
						dragChange.undo();
						dragChange = null;
					}
					
					var currentPart: int = mouseX / partWidth;
					var sequence: ChangeSequence = new ChangeSequence();
					
					if (cursor.curNote == null) {
						var backwards: Boolean;
						var directLength: int;
						if (currentPart < cursor.start) {
							backwards = true;
							directLength = cursor.start - currentPart;
						} else {
							backwards = false;
							directLength = currentPart - cursor.start + 1;
						}
						
						var defaultLength: int = 1;
						//for each (var blessedLength: int in [1, 2, 3, 4, 6, 8, 12, 16, 24, 32, 36, ]) {
						for (i = 0; i <= doc.song.beats * doc.song.parts; i++) {
							if (i >= 5 &&
							    i % doc.song.parts != 0 &&
							    i != doc.song.parts * 3.0 / 2.0 &&
							    i != doc.song.parts * 4.0 / 3.0 &&
							    i != doc.song.parts * 5.0 / 3.0)
							{
								continue;
							}
							var blessedLength: int = i;
							if (blessedLength == directLength) {
								defaultLength = blessedLength;
								break;
							}
							if (blessedLength < directLength) {
								defaultLength = blessedLength;
							}
							
							if (blessedLength > directLength) {
								if (defaultLength < directLength - 1) {
									defaultLength = blessedLength;
								}
								break;
							}
						}
						
						if (defaultLength < directLength) {
							// See if I can find a better match by snapping to an existing note...
							// E.G. in another channel
						}
						
						if (backwards) {
							end = cursor.start;
							start = end - defaultLength;
						} else {
							start = cursor.start;
							end = start + defaultLength;
						}
						if (start < 0) start = 0;
						if (end > doc.song.beats * doc.song.parts) end = doc.song.beats * doc.song.parts;
						
						sequence.append(new ChangeNoteTruncate(doc, pattern, start, end));
						i = 0;
						while (i < pattern.notes.length) {
							var note: Note = pattern.notes[i];
							if (note.start >= end) {
								break;
							}
							i++;
						}
						var theNote: Note = new Note(cursor.pitch, start, end, 3, doc.channel == 3);
						sequence.append(new ChangeNoteAdded(doc, pattern, theNote, i));
						copyPins(theNote);
					} else if (mouseHorizontal) {
						var shift: int = Math.round((mouseX - mouseXStart) / partWidth);
						
						var shiftedPin: NotePin = cursor.curNote.pins[cursor.nearPinIndex];
						var shiftedTime: int = cursor.curNote.start + shiftedPin.time + shift;
						if (shiftedTime < 0) shiftedTime = 0;
						if (shiftedTime > doc.song.beats * doc.song.parts) shiftedTime = doc.song.beats * doc.song.parts;
						
						if (shiftedTime <= cursor.curNote.start && cursor.nearPinIndex == cursor.curNote.pins.length - 1 ||
						    shiftedTime >= cursor.curNote.end   && cursor.nearPinIndex == 0)
						{
							sequence.append(new ChangeNoteAdded(doc, pattern, cursor.curNote, cursor.curIndex, true));
						} else {
							start = Math.min(cursor.curNote.start, shiftedTime);
							end   = Math.max(cursor.curNote.end,   shiftedTime);
							sequence.append(new ChangeNoteTruncate(doc, pattern, start, end, cursor.curNote));
							sequence.append(new ChangePinTime(doc, cursor.curNote, cursor.nearPinIndex, shiftedTime));
							copyPins(cursor.curNote);
						}
					} else if (cursor.pitchIndex == -1) {
						var bendPart: int = Math.round(Math.max(cursor.curNote.start, Math.min(cursor.curNote.end, mouseX / partWidth))) - cursor.curNote.start;
						
						var prevPin: NotePin;
						var nextPin: NotePin = cursor.curNote.pins[0];
						var bendVolume: int;
						var bendInterval: int;
						for (i = 1; i < cursor.curNote.pins.length; i++) {
							prevPin = nextPin;
							nextPin = cursor.curNote.pins[i];
							if (bendPart > nextPin.time) continue;
							if (bendPart < prevPin.time) throw new Error();
							var volumeRatio: Number = (bendPart - prevPin.time) / (nextPin.time - prevPin.time);
							bendVolume = prevPin.volume * (1.0 - volumeRatio) + nextPin.volume * volumeRatio + ((mouseYStart - mouseY) / 25.0);
							if (bendVolume < 0) bendVolume = 0;
							if (bendVolume > 3) bendVolume = 3;
							bendInterval = snapToPitch(prevPin.interval * (1.0 - volumeRatio) + nextPin.interval * volumeRatio + cursor.curNote.pitches[0], 0, Music.maxPitch) - cursor.curNote.pitches[0];
							break;
						}
						
						sequence.append(new ChangeVolumeBend(doc, pattern, cursor.curNote, bendPart, bendVolume, bendInterval));
						copyPins(cursor.curNote);
					} else {
						var bendStart: int;
						var bendEnd: int;
						if (mouseX >= mouseXStart) {
							bendStart = cursor.part;
							bendEnd   = currentPart + 1;
						} else {
							bendStart = cursor.part + 1;
							bendEnd   = currentPart;
						}
						if (bendEnd < 0) bendEnd = 0;
						if (bendEnd > doc.song.beats * doc.song.parts) bendEnd = doc.song.beats * doc.song.parts;
						if (bendEnd > cursor.curNote.end) {
							sequence.append(new ChangeNoteTruncate(doc, pattern, cursor.curNote.start, bendEnd, cursor.curNote));
						}
						if (bendEnd < cursor.curNote.start) {
							sequence.append(new ChangeNoteTruncate(doc, pattern, bendEnd, cursor.curNote.end, cursor.curNote));
						}
						
						var minPitch: int = int.MAX_VALUE;
						var maxPitch: int = int.MIN_VALUE;
						for each (var pitch: int in cursor.curNote.pitches) {
							if (minPitch > pitch) minPitch = pitch;
							if (maxPitch < pitch) maxPitch = pitch;
						}
						minPitch -= cursor.curNote.pitches[0];
						maxPitch -= cursor.curNote.pitches[0];
						var bendTo: int = snapToPitch(findMousePitch(mouseY), -minPitch, Music.maxPitch - maxPitch);
						sequence.append(new ChangePitchBend(doc, cursor.curNote, bendStart, bendEnd, bendTo, cursor.pitchIndex));
						copyPins(cursor.curNote);
					}
					dragChange = sequence;
				}
				mouseXPrev = mouseX;
				mouseYPrev = mouseY;
			} else {
				updateCursorStatus();
				updatePreview();
			}
		}
		
		private function onMouseReleased(event: Event): void {
			if (!cursor.valid) return;
			if (pattern == null) return;
			if (mouseDragging) {
				if (dragChange != null) {
					doc.history.record(dragChange);
					dragChange = null;
				}
			} else if (mouseDown) {
				if (cursor.curNote == null) {
					var note: Note = new Note(cursor.pitch, cursor.start, cursor.end, 3, doc.channel == 3);
					note.pins = [];
					for each (var oldPin: NotePin in cursor.pins) {
						note.pins.push(new NotePin(0, oldPin.time, oldPin.volume));
					}
					doc.history.record(new ChangeNoteAdded(doc, pattern, note, cursor.curIndex));
				} else {
					if (cursor.pitchIndex == -1) {
						var sequence: ChangeSequence = new ChangeSequence();
						if (cursor.curNote.pitches.length == 4) {
							sequence.append(new ChangePitchAdded(doc, pattern, cursor.curNote, cursor.curNote.pitches[0], 0, true));
						}
						sequence.append(new ChangePitchAdded(doc, pattern, cursor.curNote, cursor.pitch, cursor.curNote.pitches.length));
						doc.history.record(sequence);
						copyPins(cursor.curNote);
					} else {
						if (cursor.curNote.pitches.length == 1) {
							doc.history.record(new ChangeNoteAdded(doc, pattern, cursor.curNote, cursor.curIndex, true));
						} else {
							doc.history.record(new ChangePitchAdded(doc, pattern, cursor.curNote, cursor.pitch, cursor.curNote.pitches.indexOf(cursor.pitch), true));
						}
					}
				}
			}
			
			mouseDown = false;
			mouseDragging = false;
			updateCursorStatus();
			render();
		}
		
		private function updatePreview(): void {
			preview.graphics.clear();
			if (!mouseOver || mouseDown || !cursor.valid || pattern == null) return;
			
			preview.graphics.lineStyle(2, 0xffffff);
			drawNote(preview.graphics, cursor.pitch, cursor.start, cursor.pins, pitchHeight / 2 + 1, true, octaveOffset);
			preview.graphics.lineStyle();
		}
		
		private function documentChanged(): void {
			editorWidth = doc.showLetters ? (doc.showScrollBar ? 460 : 480) : (doc.showScrollBar ? 492 : 512);
			pattern = doc.getCurrentPattern();
			partWidth = editorWidth / (doc.song.beats * doc.song.parts);
			pitchHeight = doc.channel == 3 ? 40 : 13;
			pitchCount = doc.channel == 3 ? Music.drumCount : Music.pitchCount;
			octaveOffset = doc.song.channelOctaves[doc.channel] * 12;
			scrollRect = new Rectangle(0, 0, editorWidth, editorHeight);
			copiedPins = copiedPinChannels[doc.channel];
			if (!mouseDown) updateCursorStatus();
			render();
		}
		
		private function render(): void {
			graphics.clear();
			graphics.beginFill(0);
			graphics.drawRect(0, 0, partWidth * doc.song.beats * doc.song.parts, pitchHeight * pitchCount);
			graphics.endFill();
			
			updatePreview();
			
			if (pattern == null) return;
			
			for (var j: int = 0; j < pitchCount; j++) {
				if (doc.channel != 3 && Music.scaleFlags[doc.song.scale][j%12] == false) {
					continue;
				}
				var color: int = 0x444444;
				if (doc.channel != 3) {
					if (j%12 == 0) color = 0x886644;
					if (j%12 == 7 && doc.showFifth) color = 0x446688;
				}
				graphics.beginFill(color);
				for (var k: int = 0; k < doc.song.beats; k++) {
					graphics.drawRect(partWidth * k * doc.song.parts + 1, pitchHeight * (pitchCount - j - 1) + 1, partWidth * doc.song.parts - 2, pitchHeight - 2);
				}
				graphics.endFill();
			}
			
			var note: Note;
			var pitch: int;
			if (doc.channel != 3 && doc.showChannels) {
				for (var channel: int = 2; channel >= 0; channel--) {
					if (channel == doc.channel) continue;
					var pattern2: BarPattern = doc.song.getPattern(channel, doc.bar);
					if (pattern2 == null) continue;
					for each (note in pattern2.notes) {
						for each (pitch in note.pitches) {
							graphics.beginFill(SongEditor.noteColorsDim[channel]);
							drawNote(graphics, pitch, note.start, note.pins, pitchHeight / 2 - 4, false, doc.song.channelOctaves[channel] * 12);
							graphics.endFill();
						}
					}
				}
			}
			for each (note in pattern.notes) {
				for each (pitch in note.pitches) {
					graphics.beginFill(SongEditor.noteColorsDim[doc.channel]);
					drawNote(graphics, pitch, note.start, note.pins, pitchHeight / 2 + 1, false, octaveOffset);
					graphics.endFill();
					graphics.beginFill(SongEditor.noteColorsBright[doc.channel]);
					drawNote(graphics, pitch, note.start, note.pins, pitchHeight / 2 + 1, true, octaveOffset);
					graphics.endFill();
				}
			}
		}
		
		private function drawNote(graphics: Graphics, pitch: int, start: int, pins: Array, radius: int, showVolume: Boolean, offset: Number): void {
			var i: int;
			var prevPin: NotePin;
			var nextPin: NotePin;
			var prevSide:   Number;
			var nextSide:   Number;
			var prevHeight: Number;
			var nextHeight: Number;
			var prevVolume: Number;
			var nextVolume: Number;
			nextPin = pins[0];
			graphics.moveTo(partWidth * (start + nextPin.time) + 1, pitchToPixelHeight(pitch - offset) + radius * (showVolume ? nextPin.volume / 3.0 : 1.0));
			for (i = 1; i < pins.length; i++) {
				prevPin = nextPin;
				nextPin = pins[i];
				prevSide   = partWidth * (start + prevPin.time) + (i == 1 ? 1 : 0);
				nextSide   = partWidth * (start + nextPin.time) - (i == pins.length - 1 ? 1 : 0);
				prevHeight = pitchToPixelHeight(pitch + prevPin.interval - offset);
				nextHeight = pitchToPixelHeight(pitch + nextPin.interval - offset);
				prevVolume = showVolume ? prevPin.volume / 3.0 : 1.0;
				nextVolume = showVolume ? nextPin.volume / 3.0 : 1.0;
				graphics.lineTo(prevSide, prevHeight - radius * prevVolume);
				if (prevPin.interval > nextPin.interval) graphics.lineTo(prevSide + 1, prevHeight - radius * prevVolume);
				if (prevPin.interval < nextPin.interval) graphics.lineTo(nextSide - 1, nextHeight - radius * nextVolume);
				graphics.lineTo(nextSide, nextHeight - radius * nextVolume);
			}
			for (i = pins.length - 2; i >= 0; i--) {
				prevPin = nextPin;
				nextPin = pins[i];
				prevSide   = partWidth * (start + prevPin.time) - (i == pins.length - 2 ? 1 : 0);
				nextSide   = partWidth * (start + nextPin.time) + (i == 0 ? 1 : 0);
				prevHeight = pitchToPixelHeight(pitch + prevPin.interval - offset);
				nextHeight = pitchToPixelHeight(pitch + nextPin.interval - offset);
				prevVolume = showVolume ? prevPin.volume / 3.0 : 1.0;
				nextVolume = showVolume ? nextPin.volume / 3.0 : 1.0;
				graphics.lineTo(prevSide, prevHeight + radius * prevVolume);
				if (prevPin.interval < nextPin.interval) graphics.lineTo(prevSide - 1, prevHeight + radius * prevVolume);
				if (prevPin.interval > nextPin.interval) graphics.lineTo(nextSide + 1, nextHeight + radius * nextVolume);
				graphics.lineTo(nextSide, nextHeight + radius * nextVolume);
			}
		}
		
		private function pitchToPixelHeight(pitch: int): Number {
			return pitchHeight * (pitchCount - (pitch) - 0.5);
		}
	}
}