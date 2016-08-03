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

/// <reference path="synth.ts" />
/// <reference path="editor.ts" />
/// <reference path="SongEditor.ts" />

"use strict";

module beepbox {
	export interface PatternEditor {
		resetCopiedPins: ()=>void;
	}
	
	export function PatternEditor(doc: SongDocument): void {
		function prettyNumber(value: number): string {
			return value.toFixed(2).replace(/\.?0*$/, "");
		}
		
		var container: HTMLElement = <HTMLElement>document.getElementById("patternEditorContainer");
		
		var svgNS: string = "http://www.w3.org/2000/svg";
		var svg: SVGSVGElement = <SVGSVGElement><any> document.getElementById("patternEditorSvg");
		var svgPlayhead: SVGRectElement = <SVGRectElement><any> document.getElementById("patternEditorPlayhead");
		var svgNoteContainer: SVGSVGElement = <SVGSVGElement><any> document.getElementById("patternEditorNoteContainer");
		var svgPreview: SVGPathElement = <SVGPathElement><any> document.getElementById("patternEditorPreview");
		var svgNoteBackground: SVGPatternElement = <SVGPatternElement><any> document.getElementById("patternEditorNoteBackground");
		var svgDrumBackground: SVGPatternElement = <SVGPatternElement><any> document.getElementById("patternEditorDrumBackground");
		var svgBackground: SVGRectElement = <SVGRectElement><any> document.getElementById("patternEditorBackground");
		
		var editorWidth: number;
		var editorHeight: number = 481;
		var partWidth: number;
		var noteHeight: number;
		var noteCount: number;
		var mouseX: number;
		var mouseY: number;
		var mouseDown: boolean = false;
		var mouseOver: boolean = false;
		var mouseDragging: boolean = false;
		var mouseHorizontal: boolean = false;
		var defaultPinChannels: TonePin[][] = [
			[new TonePin(0, 0, 3), new TonePin(0, 2, 3)],
			[new TonePin(0, 0, 3), new TonePin(0, 2, 3)],
			[new TonePin(0, 0, 3), new TonePin(0, 2, 3)],
			[new TonePin(0, 0, 3), new TonePin(0, 2, 0)],
		];
		var copiedPinChannels: TonePin[][] = defaultPinChannels.concat();
		var copiedPins: TonePin[];
		var mouseXStart: number = 0;
		var mouseYStart: number = 0;
		var mouseXPrev: number = 0;
		var mouseYPrev: number = 0;
		//var precise: boolean = false;
		//var precisionX: number = 0;
		var dragChange: Change = null;
		var cursor: PatternCursor = new PatternCursor();
		var pattern: BarPattern;
		var playheadX: number = 0.0;
		var octaveOffset: number = 0;
		
		var defaultNoteHeight: number = 13;
		var defaultDrumHeight: number = 40;
		
		let backgroundNoteRows: SVGRectElement[] = [];
		for (let i: number = 0; i < 12; i++) {
			let y: number = (12 - i) % 12;
			let rectangle: SVGRectElement = <SVGRectElement> document.createElementNS(svgNS, "rect");
			rectangle.setAttributeNS(null, "x", "1");
			rectangle.setAttributeNS(null, "y", "" + (y * defaultNoteHeight + 1));
			rectangle.setAttributeNS(null, "height", "" + (defaultNoteHeight - 2));
			svgNoteBackground.appendChild(rectangle);
			backgroundNoteRows[i] = rectangle;
		}
		
		let backgroundDrumRow: SVGRectElement = <SVGRectElement> document.createElementNS(svgNS, "rect");
		backgroundDrumRow.setAttributeNS(null, "x", "1");
		backgroundDrumRow.setAttributeNS(null, "y", "1");
		backgroundDrumRow.setAttributeNS(null, "height", "" + (defaultDrumHeight - 2));
		backgroundDrumRow.setAttributeNS(null, "fill", "#444444");
		svgDrumBackground.appendChild(backgroundDrumRow);
		
		function updateCursorStatus(): void {
			var i: number;
			var j: number;
			
			if (pattern == null) return;
			
			cursor = new PatternCursor();
			
			if (mouseX < 0 || mouseX > editorWidth || mouseY < 0 || mouseY > editorHeight) return;
			
			cursor.part = Math.floor(Math.max(0, Math.min(doc.song.beats * doc.song.parts - 1, mouseX / partWidth)));
			
			pattern.tones.every((tone: Tone)=>{
				if (tone.end <= cursor.part) {
					cursor.prevTone = tone;
					cursor.curIndex++;
				} else if (tone.start <= cursor.part && tone.end > cursor.part) {
					cursor.curTone = tone;
				} else if (tone.start > cursor.part) {
					cursor.nextTone = tone;
					return false;
				}
				return true;
			});
			
			var mousePitch: number = findMousePitch(mouseY);
			
			if (cursor.curTone != null) {
				cursor.start = cursor.curTone.start;
				cursor.end   = cursor.curTone.end;
				cursor.pins  = cursor.curTone.pins;
				
				var interval: number;
				var error: number;
				var prevPin: TonePin;
				var nextPin: TonePin = cursor.curTone.pins[0];
				for (j = 1; j < cursor.curTone.pins.length; j++) {
					prevPin = nextPin;
					nextPin = cursor.curTone.pins[j];
					var leftSide:    number = partWidth * (cursor.curTone.start + prevPin.time);
					var rightSide:   number = partWidth * (cursor.curTone.start + nextPin.time);
					if (mouseX > rightSide) continue;
					if (mouseX < leftSide) throw new Error();
					var intervalRatio: number = (mouseX - leftSide) / (rightSide - leftSide);
					var arc: number = Math.sqrt(1.0 / Math.sqrt(4.0) - Math.pow(intervalRatio - 0.5, 2.0)) - 0.5;
					var bendHeight: number = Math.abs(nextPin.interval - prevPin.interval);
					interval = prevPin.interval * (1.0 - intervalRatio) + nextPin.interval * intervalRatio;
					error = arc * bendHeight + 1.0;
					break;
				}
				
				var minInterval: number = Number.MAX_VALUE;
				var maxInterval: number = -Number.MAX_VALUE;
				var bestDistance: number = Number.MAX_VALUE;
				cursor.curTone.pins.forEach((pin: TonePin)=>{
					if (minInterval > pin.interval) minInterval = pin.interval;
					if (maxInterval < pin.interval) maxInterval = pin.interval;
					var pinDistance: number = Math.abs(cursor.curTone.start + pin.time - mouseX / partWidth);
					if (bestDistance > pinDistance) {
						bestDistance = pinDistance;
						cursor.nearPinIndex = cursor.curTone.pins.indexOf(pin);
					}
				});
				
				mousePitch -= interval;
				cursor.note = snapToNote(mousePitch, -minInterval, (doc.channel == 3 ? Music.drumCount - 1 : Music.maxPitch) - maxInterval);
				
				var nearest: number = error;
				for (i = 0; i < cursor.curTone.notes.length; i++) {
					var distance: number = Math.abs(cursor.curTone.notes[i] - mousePitch + 0.5);
					if (distance > nearest) continue;
					nearest = distance;
					cursor.note = cursor.curTone.notes[i];
				}
				
				for (i = 0; i < cursor.curTone.notes.length; i++) {
					if (cursor.curTone.notes[i] == cursor.note) {
						cursor.noteIndex = i;
						break;
					}
				}
			} else {
				cursor.note = snapToNote(mousePitch, 0, Music.maxPitch);
				var defaultLength: number = copiedPins[copiedPins.length-1].time;
				var quadBeats: number = Math.floor(cursor.part / doc.song.parts);
				var modLength: number = defaultLength % doc.song.parts;
				var modMouse: number = cursor.part % doc.song.parts;
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
				var forceStart: number = 0;
				var forceEnd: number = doc.song.beats * doc.song.parts;
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
					copiedPins.every((oldPin: TonePin)=>{
						if (oldPin.time <= cursor.end - cursor.start) {
							cursor.pins.push(new TonePin(0, oldPin.time, oldPin.volume));
							if (oldPin.time == cursor.end - cursor.start) return false;
						} else {
							cursor.pins.push(new TonePin(0, cursor.end - cursor.start, oldPin.volume));
							return false;
						}
						return true;
					});
				}
			}
			
			cursor.valid = true;
		}
		
		function findMousePitch(pixelY: number): number {
			return Math.max(0, Math.min(noteCount-1, noteCount - (pixelY / noteHeight))) + octaveOffset;
		}
		
		function snapToNote(guess: number, min: number, max: number): number {
			if (guess < min) guess = min;
			if (guess > max) guess = max;
			var scale: boolean[] = Music.scaleFlags[doc.song.scale];
			if (scale[Math.floor(guess) % 12] || doc.channel == 3) {
				return Math.floor(guess);
			} else {
				var topNote: number = Math.floor(guess) + 1;
				var bottomNote: number = Math.floor(guess) - 1;
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
				var topRange: number = topNote;
				var bottomRange: number = bottomNote + 1;
				if (topNote % 12 == 0 || topNote % 12 == 7) {
					topRange -= 0.5;
				}
				if (bottomNote % 12 == 0 || bottomNote % 12 == 7) {
					bottomRange += 0.5;
				}
				return guess - bottomRange > topRange - guess ? topNote : bottomNote;
			}
		}
		
		function copyPins(tone: Tone): void {
			copiedPins = [];
			tone.pins.forEach((oldPin: TonePin)=>{
				copiedPins.push(new TonePin(0, oldPin.time, oldPin.volume));
			});
			for (var i: number = 1; i < copiedPins.length - 1; ) {
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
		
		this.resetCopiedPins = (()=>{
			copiedPinChannels = defaultPinChannels.concat();
		});
		
		function onEnterFrame(timestamp: number): void {
			if (!doc.synth.playing || pattern == null || doc.song.getPattern(doc.channel, Math.floor(doc.synth.playhead)) != pattern) {
				svgPlayhead.setAttributeNS(null, "visibility", "hidden");
			} else {
				svgPlayhead.setAttributeNS(null, "visibility", "visible");
				var modPlayhead: number = doc.synth.playhead - Math.floor(doc.synth.playhead);
				if (Math.abs(modPlayhead - playheadX) > 0.1) {
					playheadX = modPlayhead;
				} else {
					playheadX += (modPlayhead - playheadX) * 0.2;
				}
				svgPlayhead.setAttributeNS(null, "x", "" + prettyNumber(playheadX * editorWidth - 2));
			}
			window.requestAnimationFrame(onEnterFrame);
		}
		
		function onMouseOver(event: MouseEvent): void {
			mouseOver = true;
		}
		
		function onMouseOut(event: MouseEvent): void {
			mouseOver = false;
		}
		
		function onMousePressed(event: MouseEvent): void {
			event.preventDefault();
			if (pattern == null) return;
			mouseDown = true;
			mouseXStart = mouseX;
			mouseYStart = mouseY;
			mouseXPrev = mouseX;
			mouseYPrev = mouseY;
			updateCursorStatus();
			updatePreview();
		}
		
		function onTouchPressed(event: TouchEvent): void {
			event.preventDefault();
			if (pattern == null) return;
			mouseDown = true;
			var boundingRect: ClientRect = svg.getBoundingClientRect();
			mouseX = event.touches[0].clientX - boundingRect.left;
			mouseY = event.touches[0].clientY - boundingRect.top;
			mouseXStart = mouseX;
			mouseYStart = mouseY;
			mouseXPrev = mouseX;
			mouseYPrev = mouseY;
			updateCursorStatus();
			updatePreview();
		}
		
		function onMouseMoved(event: MouseEvent): void {
			var boundingRect: ClientRect = svg.getBoundingClientRect();
    		mouseX = (event.clientX || event.pageX) - boundingRect.left;
		    mouseY = (event.clientY || event.pageY) - boundingRect.top;
		    onCursorMoved();
		}
		
		function onTouchMoved(event: TouchEvent): void {
			if (!mouseDown) return;
			event.preventDefault();
			var boundingRect: ClientRect = svg.getBoundingClientRect();
			mouseX = event.touches[0].clientX - boundingRect.left;
			mouseY = event.touches[0].clientY - boundingRect.top;
		    onCursorMoved();
		}
		
		function onCursorMoved(): void {
			var start: number;
			var end: number;
			var i: number = 0;
			if (pattern == null) return;
			if (mouseDown && cursor.valid) {
				if (!mouseDragging) {
					var dx: number = mouseX - mouseXStart;
					var dy: number = mouseY - mouseYStart;
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
					
					var currentPart: number = Math.floor(mouseX / partWidth);
					var sequence: ChangeSequence = new ChangeSequence();
					
					if (cursor.curTone == null) {
						var backwards: boolean;
						var directLength: number;
						if (currentPart < cursor.start) {
							backwards = true;
							directLength = cursor.start - currentPart;
						} else {
							backwards = false;
							directLength = currentPart - cursor.start + 1;
						}
						
						var defaultLength: number = 1;
						//[1, 2, 3, 4, 6, 8, 12, 16, 24, 32, 36, ].forEach((blessedLength: number)=>{
						for (i = 0; i <= doc.song.beats * doc.song.parts; i++) {
							if (i >= 5 &&
							    i % doc.song.parts != 0 &&
							    i != doc.song.parts * 3.0 / 2.0 &&
							    i != doc.song.parts * 4.0 / 3.0 &&
							    i != doc.song.parts * 5.0 / 3.0)
							{
								continue;
							}
							var blessedLength: number = i;
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
						var shift: number = Math.round((mouseX - mouseXStart) / partWidth);
						
						var shiftedPin: TonePin = cursor.curTone.pins[cursor.nearPinIndex];
						var shiftedTime: number = cursor.curTone.start + shiftedPin.time + shift;
						if (shiftedTime < 0) shiftedTime = 0;
						if (shiftedTime > doc.song.beats * doc.song.parts) shiftedTime = doc.song.beats * doc.song.parts;
						
						if (shiftedTime <= cursor.curTone.start && cursor.nearPinIndex == cursor.curTone.pins.length - 1 ||
						    shiftedTime >= cursor.curTone.end   && cursor.nearPinIndex == 0)
						{
							sequence.append(new ChangeToneAdded(doc, pattern, cursor.curTone, cursor.curIndex, true));
						} else {
							start = Math.min(cursor.curTone.start, shiftedTime);
							end   = Math.max(cursor.curTone.end,   shiftedTime);
							sequence.append(new ChangeToneTruncate(doc, pattern, start, end, cursor.curTone));
							sequence.append(new ChangePinTime(doc, cursor.curTone, cursor.nearPinIndex, shiftedTime));
							copyPins(cursor.curTone);
						}
					} else if (cursor.noteIndex == -1) {
						var bendPart: number = Math.round(Math.max(cursor.curTone.start, Math.min(cursor.curTone.end, mouseX / partWidth))) - cursor.curTone.start;
						
						var prevPin: TonePin;
						var nextPin: TonePin = cursor.curTone.pins[0];
						var bendVolume: number;
						var bendInterval: number;
						for (i = 1; i < cursor.curTone.pins.length; i++) {
							prevPin = nextPin;
							nextPin = cursor.curTone.pins[i];
							if (bendPart > nextPin.time) continue;
							if (bendPart < prevPin.time) throw new Error();
							var volumeRatio: number = (bendPart - prevPin.time) / (nextPin.time - prevPin.time);
							bendVolume = Math.round(prevPin.volume * (1.0 - volumeRatio) + nextPin.volume * volumeRatio + ((mouseYStart - mouseY) / 25.0));
							if (bendVolume < 0) bendVolume = 0;
							if (bendVolume > 3) bendVolume = 3;
							bendInterval = snapToNote(prevPin.interval * (1.0 - volumeRatio) + nextPin.interval * volumeRatio + cursor.curTone.notes[0], 0, Music.maxPitch) - cursor.curTone.notes[0];
							break;
						}
						
						sequence.append(new ChangeVolumeBend(doc, pattern, cursor.curTone, bendPart, bendVolume, bendInterval));
						copyPins(cursor.curTone);
					} else {
						var bendStart: number;
						var bendEnd: number;
						if (mouseX >= mouseXStart) {
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
						
						var minNote: number = Number.MAX_VALUE;
						var maxNote: number = -Number.MAX_VALUE;
						cursor.curTone.notes.forEach((note: number)=>{
							if (minNote > note) minNote = note;
							if (maxNote < note) maxNote = note;
						});
						minNote -= cursor.curTone.notes[0];
						maxNote -= cursor.curTone.notes[0];
						var bendTo: number = snapToNote(findMousePitch(mouseY), -minNote, Music.maxPitch - maxNote);
						sequence.append(new ChangePitchBend(doc, cursor.curTone, bendStart, bendEnd, bendTo, cursor.noteIndex));
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
		
		function onCursorReleased(event: Event): void {
			if (!cursor.valid) return;
			if (pattern == null) return;
			if (mouseDragging) {
				if (dragChange != null) {
					doc.history.record(dragChange);
					dragChange = null;
				}
			} else if (mouseDown) {
				if (cursor.curTone == null) {
					var tone: Tone = new Tone(cursor.note, cursor.start, cursor.end, 3, doc.channel == 3);
					tone.pins = [];
					cursor.pins.forEach((oldPin: TonePin)=>{
						tone.pins.push(new TonePin(0, oldPin.time, oldPin.volume));
					});
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
			updatePreview();
		}
		
		function updatePreview(): void {
			if (!mouseOver || mouseDown || !cursor.valid || pattern == null) {
				svgPreview.setAttributeNS(null, "visibility", "hidden");
			} else {
				svgPreview.setAttributeNS(null, "visibility", "visible");
				drawNote(svgPreview, cursor.note, cursor.start, cursor.pins, noteHeight / 2 + 1, true, octaveOffset);
			}
		}
		
		function makeEmptyReplacementElement(node: Node): Node {
			let clone: Node = node.cloneNode(false);
			node.parentNode.replaceChild(clone, node);
			return clone;
		}

		function documentChanged(): void {
			editorWidth = doc.showLetters ? (doc.showScrollBar ? 460 : 480) : (doc.showScrollBar ? 492 : 512);
			pattern = doc.getCurrentPattern();
			partWidth = editorWidth / (doc.song.beats * doc.song.parts);
			noteHeight = doc.channel == 3 ? defaultDrumHeight : defaultNoteHeight;
			noteCount = doc.channel == 3 ? Music.drumCount : Music.noteCount;
			octaveOffset = doc.song.channelOctaves[doc.channel] * 12;
			copiedPins = copiedPinChannels[doc.channel];
			
			svg.setAttributeNS(null, "width", "" + editorWidth);
			svgBackground.setAttributeNS(null, "width", "" + editorWidth);
			svgNoteBackground.setAttributeNS(null, "width", "" + (editorWidth / doc.song.beats));
			svgDrumBackground.setAttributeNS(null, "width", "" + (editorWidth / doc.song.beats));
			
			if (!mouseDown) updateCursorStatus();
			
			svgNoteContainer = <SVGSVGElement> makeEmptyReplacementElement(svgNoteContainer);
			
			updatePreview();
			
			if (pattern == null) {
				svg.setAttributeNS(null, "visibility", "hidden");
				return;
			}
			svg.setAttributeNS(null, "visibility", "visible");
			
			for (var j: number = 0; j < 12; j++) {
				var color: string = "#444444";
				if (j == 0) color = "#886644";
				if (j == 7 && doc.showFifth) color = "#446688";
				let rectangle: SVGRectElement = backgroundNoteRows[j];
				rectangle.setAttributeNS(null, "width", "" + (partWidth * doc.song.parts - 2));
				rectangle.setAttributeNS(null, "fill", color);
				rectangle.setAttributeNS(null, "visibility", Music.scaleFlags[doc.song.scale][j] ? "visible" : "hidden");
			}
			
			backgroundDrumRow.setAttributeNS(null, "width", "" + (partWidth * doc.song.parts - 2));
			
			if (doc.channel == 3) {
				svgBackground.setAttributeNS(null, "fill", "url(#patternEditorDrumBackground)");
				svgBackground.setAttributeNS(null, "height", "" + (defaultDrumHeight * Music.drumCount));
				svg.setAttributeNS(null, "height", "" + (defaultDrumHeight * Music.drumCount));
			} else {
				svgBackground.setAttributeNS(null, "fill", "url(#patternEditorNoteBackground)");
				svgBackground.setAttributeNS(null, "height", "" + editorHeight);
				svg.setAttributeNS(null, "height", "" + editorHeight);
			}
			
			if (doc.channel != 3 && doc.showChannels) {
				for (var channel: number = 2; channel >= 0; channel--) {
					if (channel == doc.channel) continue;
					var pattern2: BarPattern = doc.song.getPattern(channel, doc.bar);
					if (pattern2 == null) continue;
					pattern2.tones.forEach((tone: Tone)=>{
						tone.notes.forEach((note: number)=>{
							let notePath: SVGPathElement = <SVGPathElement> document.createElementNS(svgNS, "path");
							notePath.setAttributeNS(null, "fill", SongEditor.noteColorsDim[channel]);
							notePath.setAttributeNS(null, "pointer-events", "none");
							drawNote(notePath, note, tone.start, tone.pins, noteHeight / 2 - 4, false, doc.song.channelOctaves[channel] * 12);
							svgNoteContainer.appendChild(notePath);
						});
					});
				}
			}
			
			pattern.tones.forEach((tone: Tone)=>{
				tone.notes.forEach((note: number)=>{
					let notePath: SVGPathElement = <SVGPathElement> document.createElementNS(svgNS, "path");
					notePath.setAttributeNS(null, "fill", SongEditor.noteColorsDim[doc.channel]);
					notePath.setAttributeNS(null, "pointer-events", "none");
					drawNote(notePath, note, tone.start, tone.pins, noteHeight / 2 + 1, false, octaveOffset);
					svgNoteContainer.appendChild(notePath);
					notePath = <SVGPathElement> document.createElementNS(svgNS, "path");
					notePath.setAttributeNS(null, "fill", SongEditor.noteColorsBright[doc.channel]);
					notePath.setAttributeNS(null, "pointer-events", "none");
					drawNote(notePath, note, tone.start, tone.pins, noteHeight / 2 + 1, true, octaveOffset);
					svgNoteContainer.appendChild(notePath);
				});
			});
		}
		
		function drawNote(svgElement: SVGPathElement, note: number, start: number, pins: TonePin[], radius: number, showVolume: boolean, offset: number): void {
			var i: number;
			var prevPin: TonePin;
			var nextPin: TonePin;
			var prevSide:   number;
			var nextSide:   number;
			var prevHeight: number;
			var nextHeight: number;
			var prevVolume: number;
			var nextVolume: number;
			nextPin = pins[0];
			var pathString: string = "M " + prettyNumber(partWidth * (start + nextPin.time) + 1) + " " + prettyNumber(noteToPixelHeight(note - offset) + radius * (showVolume ? nextPin.volume / 3.0 : 1.0)) + " ";
			for (i = 1; i < pins.length; i++) {
				prevPin = nextPin;
				nextPin = pins[i];
				prevSide   = partWidth * (start + prevPin.time) + (i == 1 ? 1 : 0);
				nextSide   = partWidth * (start + nextPin.time) - (i == pins.length - 1 ? 1 : 0);
				prevHeight = noteToPixelHeight(note + prevPin.interval - offset);
				nextHeight = noteToPixelHeight(note + nextPin.interval - offset);
				prevVolume = showVolume ? prevPin.volume / 3.0 : 1.0;
				nextVolume = showVolume ? nextPin.volume / 3.0 : 1.0;
				pathString += "L " + prettyNumber(prevSide) + " " + prettyNumber(prevHeight - radius * prevVolume) + " ";
				if (prevPin.interval > nextPin.interval) pathString += "L " + prettyNumber(prevSide + 1) + " " + prettyNumber(prevHeight - radius * prevVolume) + " ";
				if (prevPin.interval < nextPin.interval) pathString += "L " + prettyNumber(nextSide - 1) + " " + prettyNumber(nextHeight - radius * nextVolume) + " ";
				pathString += "L " + prettyNumber(nextSide) + " " + prettyNumber(nextHeight - radius * nextVolume) + " ";
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
				pathString += "L " + prettyNumber(prevSide) + " " + prettyNumber(prevHeight + radius * prevVolume) + " ";
				if (prevPin.interval < nextPin.interval) pathString += "L " + prettyNumber(prevSide - 1) + " " + prettyNumber(prevHeight + radius * prevVolume) + " ";
				if (prevPin.interval > nextPin.interval) pathString += "L " + prettyNumber(nextSide + 1) + " " + prettyNumber(nextHeight + radius * nextVolume) + " ";
				pathString += "L " + prettyNumber(nextSide) + " " + prettyNumber(nextHeight + radius * nextVolume) + " ";
			}
			pathString += "z";
			
			svgElement.setAttributeNS(null, "d", pathString);
		}
		
		function noteToPixelHeight(note: number): number {
			return noteHeight * (noteCount - (note) - 0.5);
		}
		
		doc.watch(documentChanged);
		documentChanged();
		updateCursorStatus();
		updatePreview();
		window.requestAnimationFrame(onEnterFrame);
		svg.addEventListener("mousedown", onMousePressed);
		document.addEventListener("mousemove", onMouseMoved);
		document.addEventListener("mouseup", onCursorReleased);
		svg.addEventListener("mouseover", onMouseOver);
		svg.addEventListener("mouseout", onMouseOut);
		
		svg.addEventListener("touchstart", onTouchPressed);
		document.addEventListener("touchmove", onTouchMoved);
		document.addEventListener("touchend", onCursorReleased);
		document.addEventListener("touchcancel", onCursorReleased);
	}
}
