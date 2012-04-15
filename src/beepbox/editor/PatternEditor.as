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
		public var noteHeight: Number;
		public var noteCount: int;
		
		[Bindable]
		public var doc: Document;
		
		private var preview: Sprite;
		private var playhead: Sprite;
		private var mouseDown: Boolean = false;
		private var mouseOver: Boolean = false;
		private var mouseDragging: Boolean = false;
		private var mouseHorizontal: Boolean = false;
		private var defaultPinChannels: Array = [
			[new TonePin(0, 0, 3), new TonePin(0, 4, 3)],
			[new TonePin(0, 0, 3), new TonePin(0, 4, 3)],
			[new TonePin(0, 0, 3), new TonePin(0, 4, 3)],
			[new TonePin(0, 0, 3), new TonePin(0, 2, 0)],
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
			
			cursor = new PatternCursor();
			
			if (mouseOver == false || mouseX < 0 || mouseX > editorWidth || mouseY < 0 || mouseY > editorHeight) return;
			
			cursor.part = int(Math.max(0, Math.min(doc.song.beats * doc.song.parts - 1, mouseX / partWidth)));
			
			for each (var tone: Tone in pattern.tones) {
				if (tone.end <= cursor.part) {
					cursor.prevTone = tone;
					cursor.curIndex++;
				} else if (tone.start <= cursor.part && tone.end > cursor.part) {
					cursor.curTone = tone;
				} else if (tone.start > cursor.part) {
					cursor.nextTone = tone;
					break;
				}
			}
			
			var mousePitch: Number = findMousePitch(mouseY);
			
			if (cursor.curTone != null) {
				cursor.start = cursor.curTone.start;
				cursor.end   = cursor.curTone.end;
				cursor.pins  = cursor.curTone.pins;
				
				var interval: Number;
				var error: Number;
				var prevPin: TonePin;
				var nextPin: TonePin = cursor.curTone.pins[0];
				for (j = 1; j < cursor.curTone.pins.length; j++) {
					prevPin = nextPin;
					nextPin = cursor.curTone.pins[j];
					var leftSide:    Number = partWidth * (cursor.curTone.start + prevPin.time);
					var rightSide:   Number = partWidth * (cursor.curTone.start + nextPin.time);
					if (mouseX > rightSide) continue;
					if (mouseX < leftSide) throw new Error();
					var intervalRatio: Number = (mouseX - leftSide) / (rightSide - leftSide);
					var arc: Number = Math.sqrt(1.0 / Math.sqrt(4.0) - Math.pow(intervalRatio - 0.5, 2.0)) - 0.5;
					var bendHeight: Number = Math.abs(nextPin.interval - prevPin.interval);
					interval = prevPin.interval * (1.0 - intervalRatio) + nextPin.interval * intervalRatio;
					error = arc * bendHeight + 0.5;
					break;
				}
				
				var minInterval: int = int.MAX_VALUE;
				var maxInterval: int = int.MIN_VALUE;
				for each (nextPin in cursor.curTone.pins) {
					if (minInterval > nextPin.interval) minInterval = nextPin.interval;
					if (maxInterval < nextPin.interval) maxInterval = nextPin.interval;
				}
				
				mousePitch -= interval;
				cursor.note = snapToNote(mousePitch, -minInterval, Music.maxPitch - maxInterval);
				
				var nearest: Number = Number.MAX_VALUE;
				for (i = 0; i < cursor.curTone.notes.length; i++) {
					var distance: Number = Math.abs(cursor.curTone.notes[i] - mousePitch);
					if (distance > error || distance > nearest) continue;
					nearest = distance;
					cursor.noteIndex = i;
					cursor.note = cursor.curTone.notes[i];
				}
				
				for (i = 0; i < cursor.curTone.notes.length; i++) {
					if (cursor.curTone.notes[i] != cursor.note) continue;
					cursor.noteIndex = i;
					break;
				}
				
				cursor.nearEnd = (mouseX / partWidth - cursor.start) / (cursor.end - cursor.start) > 0.5;
			} else {
				cursor.note = snapToNote(mousePitch, 0, Music.maxPitch);
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
				if (cursor.prevTone != null) {
					forceStart = cursor.prevTone.end;
				}
				if (cursor.nextTone != null) {
					forceEnd   = cursor.nextTone.start;
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
					for each (var oldPin: TonePin in copiedPins) {
						if (oldPin.time <= cursor.end - cursor.start) {
							cursor.pins.push(new TonePin(0, oldPin.time, oldPin.volume));
							if (oldPin.time == cursor.end - cursor.start) break;
						} else {
							cursor.pins.push(new TonePin(0, cursor.end - cursor.start, oldPin.volume));
							break;
						}
					}
				}
			}
			
			cursor.valid = true;
		}
		
		private function findMousePitch(pixelY: Number): Number {
			return Math.max(0, Math.min(noteCount-1, noteCount - (pixelY / noteHeight))) + octaveOffset;
		}
		
		private function snapToNote(guess: Number, min: int, max: int): int {
			if (guess < min) guess = min;
			if (guess > max) guess = max;
			var scale: Array = Music.scaleFlags[doc.song.scale];
			if (scale[int(guess) % 12] || doc.channel == 3) {
				return int(guess);
			} else {
				var topNote: int = int(guess) + 1;
				var bottomNote: int = int(guess) - 1;
				while (scale[topNote % 12] == false) {
					topNote++;
				}
				while (scale[(bottomNote) % 12] == false) {
					bottomNote--;
				}
				if (topNote > max) {
					if (bottomNote < min) {
						return min;
					} else {
						return bottomNote;
					}
				} else if (bottomNote < min) {
					return topNote;
				}
				var topRange: Number = topNote;
				var bottomRange: Number = bottomNote + 1;
				if (topNote % 12 == 0 || topNote % 12 == 7) {
					topRange -= 0.5;
				}
				if (bottomNote % 12 == 0 || bottomNote % 12 == 7) {
					bottomRange += 0.5;
				}
				return guess - bottomRange > topRange - guess ? topNote : bottomNote;
			}
		}
		
		private function copyPins(tone: Tone): void {
			copiedPins = [];
			for each (var oldPin: TonePin in tone.pins) {
				copiedPins.push(new TonePin(0, oldPin.time, oldPin.volume));
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
			if (doc.song.getBarPattern(doc.channel, int(doc.synth.playhead)) != pattern) return;
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
					
					if (cursor.curTone == null) {
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
							// See if I can find a better match by snapping to an existing tone...
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
						
						sequence.append(new ChangeToneTruncate(doc, pattern, start, end));
						i = 0;
						while (i < pattern.tones.length) {
							var tone: Tone = pattern.tones[i];
							if (tone.start >= end) {
								break;
							}
							i++;
						}
						var theTone: Tone = new Tone(cursor.note, start, end, 3, doc.channel == 3);
						sequence.append(new ChangeToneAdded(doc, pattern, theTone, i));
						copyPins(theTone);
					} else if (mouseHorizontal) {
						var shift: int = Math.round((mouseX - mouseXStart) / partWidth);
						start = cursor.curTone.start + (cursor.nearEnd ? 0 : shift);
						end = cursor.curTone.end + (cursor.nearEnd ? shift : 0);
						if (start < 0) start = 0;
						if (end > doc.song.beats * doc.song.parts) end = doc.song.beats * doc.song.parts;
						
						if (start >= end) {
							sequence.append(new ChangeToneAdded(doc, pattern, cursor.curTone, cursor.curIndex, true));
						} else {
							sequence.append(new ChangeToneTruncate(doc, pattern, start, end, cursor.curTone));
							sequence.append(new ChangeToneLength(doc, pattern, cursor.curTone, start, end));
							copyPins(cursor.curTone);
						}
					} else if (cursor.noteIndex == -1) {
						var bendPart: int = Math.round(Math.max(cursor.curTone.start, Math.min(cursor.curTone.end, mouseX / partWidth))) - cursor.curTone.start;
						
						var prevPin: TonePin;
						var nextPin: TonePin = cursor.curTone.pins[0];
						var bendVolume: int;
						var bendInterval: int;
						for (i = 1; i < cursor.curTone.pins.length; i++) {
							prevPin = nextPin;
							nextPin = cursor.curTone.pins[i];
							if (bendPart > nextPin.time) continue;
							if (bendPart < prevPin.time) throw new Error();
							var volumeRatio: Number = (bendPart - prevPin.time) / (nextPin.time - prevPin.time);
							bendVolume = prevPin.volume * (1.0 - volumeRatio) + nextPin.volume * volumeRatio + ((mouseYStart - mouseY) / 25.0);
							if (bendVolume < 0) bendVolume = 0;
							if (bendVolume > 3) bendVolume = 3;
							bendInterval = snapToNote(prevPin.interval * (1.0 - volumeRatio) + nextPin.interval * volumeRatio + cursor.curTone.notes[0], 0, Music.maxPitch) - cursor.curTone.notes[0];
							break;
						}
						
						sequence.append(new ChangeVolumeBend(doc, pattern, cursor.curTone, bendPart, bendVolume, bendInterval));
						copyPins(cursor.curTone);
					} else {
						var bendStart: int;
						var bendEnd: int;
						if (mouseX > mouseXStart) {
							bendStart = cursor.part;
							bendEnd   = currentPart + 1;
						} else {
							bendStart = cursor.part + 1;
							bendEnd   = currentPart;
						}
						if (bendEnd < 0) bendEnd = 0;
						if (bendEnd > doc.song.beats * doc.song.parts) bendEnd = doc.song.beats * doc.song.parts;
						if (bendEnd > cursor.curTone.end) {
							sequence.append(new ChangeToneTruncate(doc, pattern, cursor.curTone.start, bendEnd, cursor.curTone));
						}
						if (bendEnd < cursor.curTone.start) {
							sequence.append(new ChangeToneTruncate(doc, pattern, bendEnd, cursor.curTone.end, cursor.curTone));
						}
						
						var minNote: int = int.MAX_VALUE;
						var maxNote: int = int.MIN_VALUE;
						for each (var note: int in cursor.curTone.notes) {
							if (minNote > note) minNote = note;
							if (maxNote < note) maxNote = note;
						}
						minNote -= cursor.curTone.notes[0];
						maxNote -= cursor.curTone.notes[0];
						var bendTo: int = snapToNote(findMousePitch(mouseY), -minNote, Music.maxPitch - maxNote);
						sequence.append(new ChangePitchBend(doc, pattern, cursor.curTone, bendStart, bendEnd, bendTo, cursor.noteIndex));
						copyPins(cursor.curTone);
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
			if (mouseDragging) {
				if (dragChange != null) {
					doc.history.record(dragChange);
					dragChange = null;
				}
			} else if (mouseDown) {
				if (cursor.curTone == null) {
					var tone: Tone = new Tone(cursor.note, cursor.start, cursor.end, 3, doc.channel == 3);
					tone.pins = [];
					for each (var oldPin: TonePin in cursor.pins) {
						tone.pins.push(new TonePin(0, oldPin.time, oldPin.volume));
					}
					doc.history.record(new ChangeToneAdded(doc, pattern, tone, cursor.curIndex));
				} else {
					if (cursor.noteIndex == -1) {
						var sequence: ChangeSequence = new ChangeSequence();
						if (cursor.curTone.notes.length == 4) {
							sequence.append(new ChangeNoteAdded(doc, pattern, cursor.curTone, cursor.curTone.notes[0], 0, true));
						}
						sequence.append(new ChangeNoteAdded(doc, pattern, cursor.curTone, cursor.note, cursor.curTone.notes.length));
						doc.history.record(sequence);
						copyPins(cursor.curTone);
					} else {
						if (cursor.curTone.notes.length == 1) {
							doc.history.record(new ChangeToneAdded(doc, pattern, cursor.curTone, cursor.curIndex, true));
						} else {
							doc.history.record(new ChangeNoteAdded(doc, pattern, cursor.curTone, cursor.note, cursor.curTone.notes.indexOf(cursor.note), true));
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
			if (!mouseOver || mouseDown || !cursor.valid) return;
			
			preview.graphics.lineStyle(2, 0xffffff);
			drawNote(preview.graphics, cursor.note, cursor.start, cursor.pins, noteHeight / 2 + 1, true, octaveOffset);
			preview.graphics.lineStyle();
		}
		
		private function documentChanged(): void {
			editorWidth = doc.showLetters ? (doc.showScrollBar ? 460 : 480) : (doc.showScrollBar ? 492 : 512);
			pattern = doc.song.getBarPattern(doc.channel, doc.bar);
			partWidth = editorWidth / (doc.song.beats * doc.song.parts);
			noteHeight = doc.channel == 3 ? 43 : 13;
			noteCount = doc.channel == 3 ? Music.drumCount : Music.noteCount;
			octaveOffset = doc.song.channelOctaves[doc.channel] * 12;
			scrollRect = new Rectangle(0, 0, editorWidth, editorHeight);
			copiedPins = copiedPinChannels[doc.channel];
			if (!mouseDown) updateCursorStatus();
			render();
		}
		
		private function render(): void {
			graphics.clear();
			graphics.beginFill(0);
			graphics.drawRect(0, 0, partWidth * doc.song.beats * doc.song.parts, noteHeight * noteCount);
			graphics.endFill();
			
			for (var j: int = 0; j < noteCount; j++) {
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
					graphics.drawRect(partWidth * k * doc.song.parts + 1, noteHeight * (noteCount - j - 1) + 1, partWidth * doc.song.parts - 2, noteHeight - 2);
				}
				graphics.endFill();
			}
			
			var tone: Tone;
			var note: int;
			if (doc.channel != 3 && doc.showChannels) {
				for (var channel: int = 2; channel >= 0; channel--) {
					if (channel == doc.channel) continue;
					for each (tone in doc.song.getBarPattern(channel, doc.bar).tones) {
						for each (note in tone.notes) {
							graphics.beginFill([0x66dd66, 0xcccc66, 0xdd8866, 0xaaaaaa][channel]);
							drawNote(graphics, note, tone.start, tone.pins, noteHeight / 2 - 4, false, doc.song.channelOctaves[channel] * 12);
							graphics.endFill();
						}
					}
				}
			}
			for each (tone in pattern.tones) {
				for each (note in tone.notes) {
					graphics.beginFill([0x66dd66, 0xcccc66, 0xdd8866, 0xaaaaaa][doc.channel]);
					drawNote(graphics, note, tone.start, tone.pins, noteHeight / 2 + 1, false, octaveOffset);
					graphics.endFill();
					graphics.beginFill([0xccffcc, 0xffffcc, 0xffddcc, 0xeeeeee][doc.channel]);
					drawNote(graphics, note, tone.start, tone.pins, noteHeight / 2 + 1, true, octaveOffset);
					graphics.endFill();
				}
			}
			
			updatePreview();
		}
		
		private function drawNote(graphics: Graphics, note: int, start: int, pins: Array, radius: int, showVolume: Boolean, offset: Number): void {
			var i: int;
			var prevPin: TonePin;
			var nextPin: TonePin;
			var prevSide:   Number;
			var nextSide:   Number;
			var prevHeight: Number;
			var nextHeight: Number;
			var prevVolume: Number;
			var nextVolume: Number;
			nextPin = pins[0];
			graphics.moveTo(partWidth * (start + nextPin.time) + 1, noteToPixelHeight(note - offset) + radius * (showVolume ? nextPin.volume / 3.0 : 1.0));
			for (i = 1; i < pins.length; i++) {
				prevPin = nextPin;
				nextPin = pins[i];
				prevSide   = partWidth * (start + prevPin.time) + (i == 1 ? 1 : 0);
				nextSide   = partWidth * (start + nextPin.time) - (i == pins.length - 1 ? 1 : 0);
				prevHeight = noteToPixelHeight(note + prevPin.interval - offset);
				nextHeight = noteToPixelHeight(note + nextPin.interval - offset);
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
				prevHeight = noteToPixelHeight(note + prevPin.interval - offset);
				nextHeight = noteToPixelHeight(note + nextPin.interval - offset);
				prevVolume = showVolume ? prevPin.volume / 3.0 : 1.0;
				nextVolume = showVolume ? nextPin.volume / 3.0 : 1.0;
				graphics.lineTo(prevSide, prevHeight + radius * prevVolume);
				if (prevPin.interval < nextPin.interval) graphics.lineTo(prevSide - 1, prevHeight + radius * prevVolume);
				if (prevPin.interval > nextPin.interval) graphics.lineTo(nextSide + 1, nextHeight + radius * nextVolume);
				graphics.lineTo(nextSide, nextHeight + radius * nextVolume);
			}
		}
		
		private function noteToPixelHeight(note: int): Number {
			return noteHeight * (noteCount - (note) - 0.5);
		}
	}
}