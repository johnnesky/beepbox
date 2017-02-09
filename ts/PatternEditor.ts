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
		
		const container: HTMLElement = <HTMLElement>document.getElementById("patternEditorContainer");
		
		const svgNS: string = "http://www.w3.org/2000/svg";
		const svg: SVGSVGElement = <SVGSVGElement><any> document.getElementById("patternEditorSvg");
		const svgPlayhead: SVGRectElement = <SVGRectElement><any> document.getElementById("patternEditorPlayhead");
		let svgNoteContainer: SVGSVGElement = <SVGSVGElement><any> document.getElementById("patternEditorNoteContainer");
		const svgPreview: SVGPathElement = <SVGPathElement><any> document.getElementById("patternEditorPreview");
		const svgNoteBackground: SVGPatternElement = <SVGPatternElement><any> document.getElementById("patternEditorNoteBackground");
		const svgDrumBackground: SVGPatternElement = <SVGPatternElement><any> document.getElementById("patternEditorDrumBackground");
		const svgBackground: SVGRectElement = <SVGRectElement><any> document.getElementById("patternEditorBackground");
		
		let editorWidth: number;
		let editorHeight: number = 481;
		let partWidth: number;
		let noteHeight: number;
		let noteCount: number;
		let mouseX: number;
		let mouseY: number;
		let mouseDown: boolean = false;
		let mouseOver: boolean = false;
		let mouseDragging: boolean = false;
		let mouseHorizontal: boolean = false;
		const defaultPinChannels: TonePin[][] = [
			[new TonePin(0, 0, 3), new TonePin(0, 2, 3)],
			[new TonePin(0, 0, 3), new TonePin(0, 2, 3)],
			[new TonePin(0, 0, 3), new TonePin(0, 2, 3)],
			[new TonePin(0, 0, 3), new TonePin(0, 2, 0)],
		];
		let copiedPinChannels: TonePin[][] = defaultPinChannels.concat();
		let copiedPins: TonePin[];
		let mouseXStart: number = 0;
		let mouseYStart: number = 0;
		let mouseXPrev: number = 0;
		let mouseYPrev: number = 0;
		//let precise: boolean = false;
		//let precisionX: number = 0;
		let dragChange: Change = null;
		let cursor: PatternCursor = new PatternCursor();
		let pattern: BarPattern;
		let playheadX: number = 0.0;
		let octaveOffset: number = 0;
		
		const defaultNoteHeight: number = 13;
		const defaultDrumHeight: number = 40;
		
		const backgroundNoteRows: SVGRectElement[] = [];
		for (let i: number = 0; i < 12; i++) {
			const y: number = (12 - i) % 12;
			const rectangle: SVGRectElement = <SVGRectElement> document.createElementNS(svgNS, "rect");
			rectangle.setAttribute("x", "1");
			rectangle.setAttribute("y", "" + (y * defaultNoteHeight + 1));
			rectangle.setAttribute("height", "" + (defaultNoteHeight - 2));
			svgNoteBackground.appendChild(rectangle);
			backgroundNoteRows[i] = rectangle;
		}
		
		const backgroundDrumRow: SVGRectElement = <SVGRectElement> document.createElementNS(svgNS, "rect");
		backgroundDrumRow.setAttribute("x", "1");
		backgroundDrumRow.setAttribute("y", "1");
		backgroundDrumRow.setAttribute("height", "" + (defaultDrumHeight - 2));
		backgroundDrumRow.setAttribute("fill", "#444444");
		svgDrumBackground.appendChild(backgroundDrumRow);
		
		function updateCursorStatus(): void {
			if (pattern == null) return;
			
			cursor = new PatternCursor();
			
			if (mouseX < 0 || mouseX > editorWidth || mouseY < 0 || mouseY > editorHeight) return;
			
			cursor.part = Math.floor(Math.max(0, Math.min(doc.song.beats * doc.song.parts - 1, mouseX / partWidth)));
			
			for (const tone of pattern.tones) {
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
			
			let mousePitch: number = findMousePitch(mouseY);
			
			if (cursor.curTone != null) {
				cursor.start = cursor.curTone.start;
				cursor.end   = cursor.curTone.end;
				cursor.pins  = cursor.curTone.pins;
				
				let interval: number;
				let error: number;
				let prevPin: TonePin;
				let nextPin: TonePin = cursor.curTone.pins[0];
				for (let j: number = 1; j < cursor.curTone.pins.length; j++) {
					prevPin = nextPin;
					nextPin = cursor.curTone.pins[j];
					const leftSide:    number = partWidth * (cursor.curTone.start + prevPin.time);
					const rightSide:   number = partWidth * (cursor.curTone.start + nextPin.time);
					if (mouseX > rightSide) continue;
					if (mouseX < leftSide) throw new Error();
					const intervalRatio: number = (mouseX - leftSide) / (rightSide - leftSide);
					const arc: number = Math.sqrt(1.0 / Math.sqrt(4.0) - Math.pow(intervalRatio - 0.5, 2.0)) - 0.5;
					const bendHeight: number = Math.abs(nextPin.interval - prevPin.interval);
					interval = prevPin.interval * (1.0 - intervalRatio) + nextPin.interval * intervalRatio;
					error = arc * bendHeight + 1.0;
					break;
				}
				
				let minInterval: number = Number.MAX_VALUE;
				let maxInterval: number = -Number.MAX_VALUE;
				let bestDistance: number = Number.MAX_VALUE;
				for (const pin of cursor.curTone.pins) {
					if (minInterval > pin.interval) minInterval = pin.interval;
					if (maxInterval < pin.interval) maxInterval = pin.interval;
					const pinDistance: number = Math.abs(cursor.curTone.start + pin.time - mouseX / partWidth);
					if (bestDistance > pinDistance) {
						bestDistance = pinDistance;
						cursor.nearPinIndex = cursor.curTone.pins.indexOf(pin);
					}
				}
				
				mousePitch -= interval;
				cursor.note = snapToNote(mousePitch, -minInterval, (doc.channel == 3 ? Music.drumCount - 1 : Music.maxPitch) - maxInterval);
				
				let nearest: number = error;
				for (let i: number = 0; i < cursor.curTone.notes.length; i++) {
					const distance: number = Math.abs(cursor.curTone.notes[i] - mousePitch + 0.5);
					if (distance > nearest) continue;
					nearest = distance;
					cursor.note = cursor.curTone.notes[i];
				}
				
				for (let i: number = 0; i < cursor.curTone.notes.length; i++) {
					if (cursor.curTone.notes[i] == cursor.note) {
						cursor.noteIndex = i;
						break;
					}
				}
			} else {
				cursor.note = snapToNote(mousePitch, 0, Music.maxPitch);
				const defaultLength: number = copiedPins[copiedPins.length-1].time;
				const quadBeats: number = Math.floor(cursor.part / doc.song.parts);
				const modLength: number = defaultLength % doc.song.parts;
				const modMouse: number = cursor.part % doc.song.parts;
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
				let forceStart: number = 0;
				let forceEnd: number = doc.song.beats * doc.song.parts;
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
					for (const oldPin of copiedPins) {
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
		
		function findMousePitch(pixelY: number): number {
			return Math.max(0, Math.min(noteCount-1, noteCount - (pixelY / noteHeight))) + octaveOffset;
		}
		
		function snapToNote(guess: number, min: number, max: number): number {
			if (guess < min) guess = min;
			if (guess > max) guess = max;
			const scale: boolean[] = Music.scaleFlags[doc.song.scale];
			if (scale[Math.floor(guess) % 12] || doc.channel == 3) {
				return Math.floor(guess);
			} else {
				let topNote: number = Math.floor(guess) + 1;
				let bottomNote: number = Math.floor(guess) - 1;
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
				let topRange: number = topNote;
				let bottomRange: number = bottomNote + 1;
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
			for (const oldPin of tone.pins) {
				copiedPins.push(new TonePin(0, oldPin.time, oldPin.volume));
			}
			for (let i: number = 1; i < copiedPins.length - 1; ) {
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
				svgPlayhead.setAttribute("visibility", "hidden");
			} else {
				svgPlayhead.setAttribute("visibility", "visible");
				const modPlayhead: number = doc.synth.playhead - Math.floor(doc.synth.playhead);
				if (Math.abs(modPlayhead - playheadX) > 0.1) {
					playheadX = modPlayhead;
				} else {
					playheadX += (modPlayhead - playheadX) * 0.2;
				}
				svgPlayhead.setAttribute("x", "" + prettyNumber(playheadX * editorWidth - 2));
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
			const boundingRect: ClientRect = svg.getBoundingClientRect();
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
			const boundingRect: ClientRect = svg.getBoundingClientRect();
    		mouseX = (event.clientX || event.pageX) - boundingRect.left;
		    mouseY = (event.clientY || event.pageY) - boundingRect.top;
		    onCursorMoved();
		}
		
		function onTouchMoved(event: TouchEvent): void {
			if (!mouseDown) return;
			event.preventDefault();
			const boundingRect: ClientRect = svg.getBoundingClientRect();
			mouseX = event.touches[0].clientX - boundingRect.left;
			mouseY = event.touches[0].clientY - boundingRect.top;
		    onCursorMoved();
		}
		
		function onCursorMoved(): void {
			let start: number;
			let end: number;
			if (pattern == null) return;
			if (mouseDown && cursor.valid) {
				if (!mouseDragging) {
					const dx: number = mouseX - mouseXStart;
					const dy: number = mouseY - mouseYStart;
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
					
					const currentPart: number = Math.floor(mouseX / partWidth);
					const sequence: ChangeSequence = new ChangeSequence();
					
					if (cursor.curTone == null) {
						let backwards: boolean;
						let directLength: number;
						if (currentPart < cursor.start) {
							backwards = true;
							directLength = cursor.start - currentPart;
						} else {
							backwards = false;
							directLength = currentPart - cursor.start + 1;
						}
						
						let defaultLength: number = 1;
						//for (const blessedLength of [1, 2, 3, 4, 6, 8, 12, 16, 24, 32, 36]) {
						for (let i: number = 0; i <= doc.song.beats * doc.song.parts; i++) {
							if (i >= 5 &&
							    i % doc.song.parts != 0 &&
							    i != doc.song.parts * 3.0 / 2.0 &&
							    i != doc.song.parts * 4.0 / 3.0 &&
							    i != doc.song.parts * 5.0 / 3.0)
							{
								continue;
							}
							const blessedLength: number = i;
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
						let i: number;
						for (i = 0; i < pattern.tones.length; i++) {
							if (pattern.tones[i].start >= end) break;
						}
						const theTone: Tone = new Tone(cursor.note, start, end, 3, doc.channel == 3);
						sequence.append(new ChangeToneAdded(doc, pattern, theTone, i));
						copyPins(theTone);
					} else if (mouseHorizontal) {
						const shift: number = Math.round((mouseX - mouseXStart) / partWidth);
						
						const shiftedPin: TonePin = cursor.curTone.pins[cursor.nearPinIndex];
						let shiftedTime: number = cursor.curTone.start + shiftedPin.time + shift;
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
						const bendPart: number = Math.round(Math.max(cursor.curTone.start, Math.min(cursor.curTone.end, mouseX / partWidth))) - cursor.curTone.start;
						
						let prevPin: TonePin;
						let nextPin: TonePin = cursor.curTone.pins[0];
						let bendVolume: number;
						let bendInterval: number;
						for (let i: number = 1; i < cursor.curTone.pins.length; i++) {
							prevPin = nextPin;
							nextPin = cursor.curTone.pins[i];
							if (bendPart > nextPin.time) continue;
							if (bendPart < prevPin.time) throw new Error();
							const volumeRatio: number = (bendPart - prevPin.time) / (nextPin.time - prevPin.time);
							bendVolume = Math.round(prevPin.volume * (1.0 - volumeRatio) + nextPin.volume * volumeRatio + ((mouseYStart - mouseY) / 25.0));
							if (bendVolume < 0) bendVolume = 0;
							if (bendVolume > 3) bendVolume = 3;
							bendInterval = snapToNote(prevPin.interval * (1.0 - volumeRatio) + nextPin.interval * volumeRatio + cursor.curTone.notes[0], 0, Music.maxPitch) - cursor.curTone.notes[0];
							break;
						}
						
						sequence.append(new ChangeVolumeBend(doc, pattern, cursor.curTone, bendPart, bendVolume, bendInterval));
						copyPins(cursor.curTone);
					} else {
						let bendStart: number;
						let bendEnd: number;
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
						
						let minNote: number = Number.MAX_VALUE;
						let maxNote: number = -Number.MAX_VALUE;
						for (const note of cursor.curTone.notes) {
							if (minNote > note) minNote = note;
							if (maxNote < note) maxNote = note;
						}
						minNote -= cursor.curTone.notes[0];
						maxNote -= cursor.curTone.notes[0];
						const bendTo: number = snapToNote(findMousePitch(mouseY), -minNote, Music.maxPitch - maxNote);
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
					const tone: Tone = new Tone(cursor.note, cursor.start, cursor.end, 3, doc.channel == 3);
					tone.pins = [];
					for (const oldPin of cursor.pins) {
						tone.pins.push(new TonePin(0, oldPin.time, oldPin.volume));
					}
					doc.history.record(new ChangeToneAdded(doc, pattern, tone, cursor.curIndex));
				} else {
					if (cursor.noteIndex == -1) {
						const sequence: ChangeSequence = new ChangeSequence();
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
				svgPreview.setAttribute("visibility", "hidden");
			} else {
				svgPreview.setAttribute("visibility", "visible");
				drawNote(svgPreview, cursor.note, cursor.start, cursor.pins, noteHeight / 2 + 1, true, octaveOffset);
			}
		}
		
		function makeEmptyReplacementElement(node: Node): Node {
			const clone: Node = node.cloneNode(false);
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
			
			svg.setAttribute("width", "" + editorWidth);
			svgBackground.setAttribute("width", "" + editorWidth);
			svgNoteBackground.setAttribute("width", "" + (editorWidth / doc.song.beats));
			svgDrumBackground.setAttribute("width", "" + (editorWidth / doc.song.beats));
			
			if (!mouseDown) updateCursorStatus();
			
			svgNoteContainer = <SVGSVGElement> makeEmptyReplacementElement(svgNoteContainer);
			
			updatePreview();
			
			if (pattern == null) {
				svg.setAttribute("visibility", "hidden");
				return;
			}
			svg.setAttribute("visibility", "visible");
			
			for (let j: number = 0; j < 12; j++) {
				let color: string = "#444444";
				if (j == 0) color = "#886644";
				if (j == 7 && doc.showFifth) color = "#446688";
				const rectangle: SVGRectElement = backgroundNoteRows[j];
				rectangle.setAttribute("width", "" + (partWidth * doc.song.parts - 2));
				rectangle.setAttribute("fill", color);
				rectangle.setAttribute("visibility", Music.scaleFlags[doc.song.scale][j] ? "visible" : "hidden");
			}
			
			backgroundDrumRow.setAttribute("width", "" + (partWidth * doc.song.parts - 2));
			
			if (doc.channel == 3) {
				svgBackground.setAttribute("fill", "url(#patternEditorDrumBackground)");
				svgBackground.setAttribute("height", "" + (defaultDrumHeight * Music.drumCount));
				svg.setAttribute("height", "" + (defaultDrumHeight * Music.drumCount));
			} else {
				svgBackground.setAttribute("fill", "url(#patternEditorNoteBackground)");
				svgBackground.setAttribute("height", "" + editorHeight);
				svg.setAttribute("height", "" + editorHeight);
			}
			
			if (doc.channel != 3 && doc.showChannels) {
				for (let channel: number = 2; channel >= 0; channel--) {
					if (channel == doc.channel) continue;
					const pattern2: BarPattern | null = doc.song.getPattern(channel, doc.bar);
					if (pattern2 == null) continue;
					for (const tone of pattern2.tones) {
						for (const note of tone.notes) {
							const notePath: SVGPathElement = <SVGPathElement> document.createElementNS(svgNS, "path");
							notePath.setAttribute("fill", SongEditor.noteColorsDim[channel]);
							notePath.setAttribute("pointer-events", "none");
							drawNote(notePath, note, tone.start, tone.pins, noteHeight / 2 - 4, false, doc.song.channelOctaves[channel] * 12);
							svgNoteContainer.appendChild(notePath);
						}
					}
				}
			}
			
			for (const tone of pattern.tones) {
				for (const note of tone.notes) {
					let notePath: SVGPathElement = <SVGPathElement> document.createElementNS(svgNS, "path");
					notePath.setAttribute("fill", SongEditor.noteColorsDim[doc.channel]);
					notePath.setAttribute("pointer-events", "none");
					drawNote(notePath, note, tone.start, tone.pins, noteHeight / 2 + 1, false, octaveOffset);
					svgNoteContainer.appendChild(notePath);
					notePath = <SVGPathElement> document.createElementNS(svgNS, "path");
					notePath.setAttribute("fill", SongEditor.noteColorsBright[doc.channel]);
					notePath.setAttribute("pointer-events", "none");
					drawNote(notePath, note, tone.start, tone.pins, noteHeight / 2 + 1, true, octaveOffset);
					svgNoteContainer.appendChild(notePath);
				}
			}
		}
		
		function drawNote(svgElement: SVGPathElement, note: number, start: number, pins: TonePin[], radius: number, showVolume: boolean, offset: number): void {
			let nextPin: TonePin = pins[0];
			let pathString: string = "M " + prettyNumber(partWidth * (start + nextPin.time) + 1) + " " + prettyNumber(noteToPixelHeight(note - offset) + radius * (showVolume ? nextPin.volume / 3.0 : 1.0)) + " ";
			for (let i: number = 1; i < pins.length; i++) {
				let prevPin: TonePin = nextPin;
				nextPin = pins[i];
				let prevSide: number = partWidth * (start + prevPin.time) + (i == 1 ? 1 : 0);
				let nextSide: number = partWidth * (start + nextPin.time) - (i == pins.length - 1 ? 1 : 0);
				let prevHeight: number = noteToPixelHeight(note + prevPin.interval - offset);
				let nextHeight: number = noteToPixelHeight(note + nextPin.interval - offset);
				let prevVolume: number = showVolume ? prevPin.volume / 3.0 : 1.0;
				let nextVolume: number = showVolume ? nextPin.volume / 3.0 : 1.0;
				pathString += "L " + prettyNumber(prevSide) + " " + prettyNumber(prevHeight - radius * prevVolume) + " ";
				if (prevPin.interval > nextPin.interval) pathString += "L " + prettyNumber(prevSide + 1) + " " + prettyNumber(prevHeight - radius * prevVolume) + " ";
				if (prevPin.interval < nextPin.interval) pathString += "L " + prettyNumber(nextSide - 1) + " " + prettyNumber(nextHeight - radius * nextVolume) + " ";
				pathString += "L " + prettyNumber(nextSide) + " " + prettyNumber(nextHeight - radius * nextVolume) + " ";
			}
			for (let i: number = pins.length - 2; i >= 0; i--) {
				let prevPin: TonePin = nextPin;
				nextPin = pins[i];
				let prevSide: number = partWidth * (start + prevPin.time) - (i == pins.length - 2 ? 1 : 0);
				let nextSide: number = partWidth * (start + nextPin.time) + (i == 0 ? 1 : 0);
				let prevHeight: number = noteToPixelHeight(note + prevPin.interval - offset);
				let nextHeight: number = noteToPixelHeight(note + nextPin.interval - offset);
				let prevVolume: number = showVolume ? prevPin.volume / 3.0 : 1.0;
				let nextVolume: number = showVolume ? nextPin.volume / 3.0 : 1.0;
				pathString += "L " + prettyNumber(prevSide) + " " + prettyNumber(prevHeight + radius * prevVolume) + " ";
				if (prevPin.interval < nextPin.interval) pathString += "L " + prettyNumber(prevSide - 1) + " " + prettyNumber(prevHeight + radius * prevVolume) + " ";
				if (prevPin.interval > nextPin.interval) pathString += "L " + prettyNumber(nextSide + 1) + " " + prettyNumber(nextHeight + radius * nextVolume) + " ";
				pathString += "L " + prettyNumber(nextSide) + " " + prettyNumber(nextHeight + radius * nextVolume) + " ";
			}
			pathString += "z";
			
			svgElement.setAttribute("d", pathString);
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
