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

module beepbox {
	function prettyNumber(value: number): string {
		return value.toFixed(2).replace(/\.?0*$/, "");
	}
	
	function makeEmptyReplacementElement(node: Node): Node {
		const clone: Node = node.cloneNode(false);
		node.parentNode.replaceChild(clone, node);
		return clone;
	}
	
	export class PatternEditor {
		private readonly _svgNoteBackground: SVGPatternElement = <SVGPatternElement> svgElement("pattern", {id: "patternEditorNoteBackground", x: "0", y: "0", width: "64", height: "156", patternUnits: "userSpaceOnUse"});
		private readonly _svgDrumBackground: SVGPatternElement = <SVGPatternElement> svgElement("pattern", {id: "patternEditorDrumBackground", x: "0", y: "0", width: "64", height: "40", patternUnits: "userSpaceOnUse"});
		private readonly _svgBackground: SVGRectElement = <SVGRectElement> svgElement("rect", {x: "0", y: "0", width: "512", height: "481", "pointer-events": "none", fill: "url(#patternEditorNoteBackground)"});
		private _svgNoteContainer: SVGSVGElement = <SVGSVGElement> svgElement("svg");
		private readonly _svgPlayhead: SVGRectElement = <SVGRectElement> svgElement("rect", {id: "", x: "0", y: "0", width: "4", height: "481", fill: "white", "pointer-events": "none"});
		private readonly _svgPreview: SVGPathElement = <SVGPathElement> svgElement("path", {fill: "none", stroke: "white", "stroke-width": "2", "pointer-events": "none"});
		private readonly _svg: SVGSVGElement = <SVGSVGElement> svgElement("svg", {style: "background-color: #000000; touch-action: none; position: absolute;", width: "512", height: "481"}, [
			svgElement("defs", undefined, [
				this._svgNoteBackground,
				this._svgDrumBackground,
			]),
			this._svgBackground,
			this._svgNoteContainer,
			this._svgPreview,
			this._svgPlayhead,
		]);
		public readonly container: HTMLDivElement = html.div({style: "height: 481px; overflow:hidden; position: relative;"}, [this._svg]);
		
		private readonly _defaultNoteHeight: number = 13;
		private readonly _defaultDrumHeight: number = 40;
		private readonly _backgroundNoteRows: SVGRectElement[] = [];
		private readonly _backgroundDrumRow: SVGRectElement = <SVGRectElement> svgElement("rect");
		private readonly _defaultPinChannels: TonePin[][] = [
			[new TonePin(0, 0, 3), new TonePin(0, 2, 3)],
			[new TonePin(0, 0, 3), new TonePin(0, 2, 3)],
			[new TonePin(0, 0, 3), new TonePin(0, 2, 3)],
			[new TonePin(0, 0, 3), new TonePin(0, 2, 0)],
		];
		
		private _editorWidth: number;
		private _editorHeight: number = 481;
		private _partWidth: number;
		private _noteHeight: number;
		private _noteCount: number;
		private _mouseX: number = 0;
		private _mouseY: number = 0;
		private _mouseDown: boolean = false;
		private _mouseOver: boolean = false;
		private _mouseDragging: boolean = false;
		private _mouseHorizontal: boolean = false;
		private _copiedPinChannels: TonePin[][] = this._defaultPinChannels.concat();
		private _copiedPins: TonePin[];
		private _mouseXStart: number = 0;
		private _mouseYStart: number = 0;
		private _mouseXPrev: number = 0;
		private _mouseYPrev: number = 0;
		//private _precise: boolean = false;
		//private _precisionX: number = 0;
		private _dragChange: Change = null;
		private _cursor: PatternCursor = new PatternCursor();
		private _pattern: BarPattern;
		private _playheadX: number = 0.0;
		private _octaveOffset: number = 0;
		private _renderedWidth: number = -1;
		private _renderedBeatWidth: number = -1;
		private _renderedFifths: boolean = false;
		private _renderedDrums: boolean = false;
		
		constructor(private _doc: SongDocument) {
			for (let i: number = 0; i < 12; i++) {
				const y: number = (12 - i) % 12;
				const rectangle: SVGRectElement = <SVGRectElement> svgElement("rect");
				rectangle.setAttribute("x", "1");
				rectangle.setAttribute("y", "" + (y * this._defaultNoteHeight + 1));
				rectangle.setAttribute("height", "" + (this._defaultNoteHeight - 2));
				rectangle.setAttribute("fill", (i == 0) ? "#886644" : "#444444");
				this._svgNoteBackground.appendChild(rectangle);
				this._backgroundNoteRows[i] = rectangle;
			}

			this._backgroundDrumRow.setAttribute("x", "1");
			this._backgroundDrumRow.setAttribute("y", "1");
			this._backgroundDrumRow.setAttribute("height", "" + (this._defaultDrumHeight - 2));
			this._backgroundDrumRow.setAttribute("fill", "#444444");
			this._svgDrumBackground.appendChild(this._backgroundDrumRow);
			
			this._doc.watch(this._documentChanged);
			this._documentChanged();
			this._updateCursorStatus();
			this._updatePreview();
			window.requestAnimationFrame(this._onEnterFrame);
			this._svg.addEventListener("mousedown", this._onMousePressed);
			document.addEventListener("mousemove", this._onMouseMoved);
			document.addEventListener("mouseup", this._onCursorReleased);
			this._svg.addEventListener("mouseover", this._onMouseOver);
			this._svg.addEventListener("mouseout", this._onMouseOut);
			
			this._svg.addEventListener("touchstart", this._onTouchPressed);
			document.addEventListener("touchmove", this._onTouchMoved);
			document.addEventListener("touchend", this._onCursorReleased);
			document.addEventListener("touchcancel", this._onCursorReleased);
		}
		
		private _updateCursorStatus(): void {
			if (this._pattern == null) return;
			
			this._cursor = new PatternCursor();
			
			if (this._mouseX < 0 || this._mouseX > this._editorWidth || this._mouseY < 0 || this._mouseY > this._editorHeight) return;
			
			this._cursor.part = Math.floor(Math.max(0, Math.min(this._doc.song.beats * this._doc.song.parts - 1, this._mouseX / this._partWidth)));
			
			for (const tone of this._pattern.tones) {
				if (tone.end <= this._cursor.part) {
					this._cursor.prevTone = tone;
					this._cursor.curIndex++;
				} else if (tone.start <= this._cursor.part && tone.end > this._cursor.part) {
					this._cursor.curTone = tone;
				} else if (tone.start > this._cursor.part) {
					this._cursor.nextTone = tone;
					break;
				}
			}
			
			let mousePitch: number = this._findMousePitch(this._mouseY);
			
			if (this._cursor.curTone != null) {
				this._cursor.start = this._cursor.curTone.start;
				this._cursor.end   = this._cursor.curTone.end;
				this._cursor.pins  = this._cursor.curTone.pins;
				
				let interval: number;
				let error: number;
				let prevPin: TonePin;
				let nextPin: TonePin = this._cursor.curTone.pins[0];
				for (let j: number = 1; j < this._cursor.curTone.pins.length; j++) {
					prevPin = nextPin;
					nextPin = this._cursor.curTone.pins[j];
					const leftSide:    number = this._partWidth * (this._cursor.curTone.start + prevPin.time);
					const rightSide:   number = this._partWidth * (this._cursor.curTone.start + nextPin.time);
					if (this._mouseX > rightSide) continue;
					if (this._mouseX < leftSide) throw new Error();
					const intervalRatio: number = (this._mouseX - leftSide) / (rightSide - leftSide);
					const arc: number = Math.sqrt(1.0 / Math.sqrt(4.0) - Math.pow(intervalRatio - 0.5, 2.0)) - 0.5;
					const bendHeight: number = Math.abs(nextPin.interval - prevPin.interval);
					interval = prevPin.interval * (1.0 - intervalRatio) + nextPin.interval * intervalRatio;
					error = arc * bendHeight + 1.0;
					break;
				}
				
				let minInterval: number = Number.MAX_VALUE;
				let maxInterval: number = -Number.MAX_VALUE;
				let bestDistance: number = Number.MAX_VALUE;
				for (const pin of this._cursor.curTone.pins) {
					if (minInterval > pin.interval) minInterval = pin.interval;
					if (maxInterval < pin.interval) maxInterval = pin.interval;
					const pinDistance: number = Math.abs(this._cursor.curTone.start + pin.time - this._mouseX / this._partWidth);
					if (bestDistance > pinDistance) {
						bestDistance = pinDistance;
						this._cursor.nearPinIndex = this._cursor.curTone.pins.indexOf(pin);
					}
				}
				
				mousePitch -= interval;
				this._cursor.note = this._snapToNote(mousePitch, -minInterval, (this._doc.channel == 3 ? Music.drumCount - 1 : Music.maxPitch) - maxInterval);
				
				let nearest: number = error;
				for (let i: number = 0; i < this._cursor.curTone.notes.length; i++) {
					const distance: number = Math.abs(this._cursor.curTone.notes[i] - mousePitch + 0.5);
					if (distance > nearest) continue;
					nearest = distance;
					this._cursor.note = this._cursor.curTone.notes[i];
				}
				
				for (let i: number = 0; i < this._cursor.curTone.notes.length; i++) {
					if (this._cursor.curTone.notes[i] == this._cursor.note) {
						this._cursor.noteIndex = i;
						break;
					}
				}
			} else {
				this._cursor.note = this._snapToNote(mousePitch, 0, Music.maxPitch);
				const defaultLength: number = this._copiedPins[this._copiedPins.length-1].time;
				const quadBeats: number = Math.floor(this._cursor.part / this._doc.song.parts);
				const modLength: number = defaultLength % this._doc.song.parts;
				const modMouse: number = this._cursor.part % this._doc.song.parts;
				if (defaultLength == 1) {
					this._cursor.start = this._cursor.part;
				} else if (modLength == 0) {
					this._cursor.start = quadBeats * this._doc.song.parts;
					if (this._doc.song.parts >> 1 == this._doc.song.parts / 2 && modMouse > this._doc.song.parts / 2 && defaultLength == this._doc.song.parts) {
						this._cursor.start += this._doc.song.parts / 2;
					}
				} else {
					this._cursor.start = quadBeats * this._doc.song.parts;
					if (modLength == this._doc.song.parts / 2) {
						if (modMouse >= this._doc.song.parts / 2) {
							this._cursor.start += this._doc.song.parts - modLength;
						}
					} else {
						if (modMouse > this._doc.song.parts / 2) {
							this._cursor.start += this._doc.song.parts - modLength;
						}
					}
				}
				this._cursor.end = this._cursor.start + defaultLength;
				let forceStart: number = 0;
				let forceEnd: number = this._doc.song.beats * this._doc.song.parts;
				if (this._cursor.prevTone != null) {
					forceStart = this._cursor.prevTone.end;
				}
				if (this._cursor.nextTone != null) {
					forceEnd   = this._cursor.nextTone.start;
				}
				if (this._cursor.start < forceStart) {
					this._cursor.start = forceStart;
					this._cursor.end = this._cursor.start + defaultLength;
					if (this._cursor.end > forceEnd) {
						this._cursor.end = forceEnd;
					}
				} else if (this._cursor.end > forceEnd) {
					this._cursor.end = forceEnd;
					this._cursor.start = this._cursor.end - defaultLength;
					if (this._cursor.start < forceStart) {
						this._cursor.start = forceStart;
					}
				}
				
				if (this._cursor.end - this._cursor.start == defaultLength) {
					this._cursor.pins = this._copiedPins;
				} else {
					this._cursor.pins = [];
					for (const oldPin of this._copiedPins) {
						if (oldPin.time <= this._cursor.end - this._cursor.start) {
							this._cursor.pins.push(new TonePin(0, oldPin.time, oldPin.volume));
							if (oldPin.time == this._cursor.end - this._cursor.start) break;
						} else {
							this._cursor.pins.push(new TonePin(0, this._cursor.end - this._cursor.start, oldPin.volume));
							break;
						}
					}
				}
			}
			
			this._cursor.valid = true;
		}
		
		private _findMousePitch(pixelY: number): number {
			return Math.max(0, Math.min(this._noteCount - 1, this._noteCount - (pixelY / this._noteHeight))) + this._octaveOffset;
		}
		
		private _snapToNote(guess: number, min: number, max: number): number {
			if (guess < min) guess = min;
			if (guess > max) guess = max;
			const scale: boolean[] = Music.scaleFlags[this._doc.song.scale];
			if (scale[Math.floor(guess) % 12] || this._doc.channel == 3) {
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
		
		private _copyPins(tone: Tone): void {
			this._copiedPins = [];
			for (const oldPin of tone.pins) {
				this._copiedPins.push(new TonePin(0, oldPin.time, oldPin.volume));
			}
			for (let i: number = 1; i < this._copiedPins.length - 1; ) {
				if (this._copiedPins[i-1].volume == this._copiedPins[i].volume && 
				    this._copiedPins[i].volume == this._copiedPins[i+1].volume)
				{
					this._copiedPins.splice(i, 1);
				} else {
					i++;
				}
			}
			this._copiedPinChannels[this._doc.channel] = this._copiedPins;
		}
		
		public resetCopiedPins = (): void => {
			this._copiedPinChannels = this._defaultPinChannels.concat();
		}
		
		private _onEnterFrame = (timestamp: number): void => {
			if (!this._doc.synth.playing || this._pattern == null || this._doc.song.getPattern(this._doc.channel, Math.floor(this._doc.synth.playhead)) != this._pattern) {
				this._svgPlayhead.setAttribute("visibility", "hidden");
			} else {
				this._svgPlayhead.setAttribute("visibility", "visible");
				const modPlayhead: number = this._doc.synth.playhead - Math.floor(this._doc.synth.playhead);
				if (Math.abs(modPlayhead - this._playheadX) > 0.1) {
					this._playheadX = modPlayhead;
				} else {
					this._playheadX += (modPlayhead - this._playheadX) * 0.2;
				}
				this._svgPlayhead.setAttribute("x", "" + prettyNumber(this._playheadX * this._editorWidth - 2));
			}
			window.requestAnimationFrame(this._onEnterFrame);
		}
		
		private _onMouseOver = (event: MouseEvent): void => {
			if (this._mouseOver) return;
			this._mouseOver = true;
		}
		
		private _onMouseOut = (event: MouseEvent): void => {
			if (!this._mouseOver) return;
			this._mouseOver = false;
		}
		
		private _onMousePressed = (event: MouseEvent): void => {
			event.preventDefault();
			if (this._pattern == null) return;
			const boundingRect: ClientRect = this._svg.getBoundingClientRect();
    		this._mouseX = (event.clientX || event.pageX) - boundingRect.left;
		    this._mouseY = (event.clientY || event.pageY) - boundingRect.top;
			this._mouseDown = true;
			this._mouseXStart = this._mouseX;
			this._mouseYStart = this._mouseY;
			this._mouseXPrev = this._mouseX;
			this._mouseYPrev = this._mouseY;
			this._updateCursorStatus();
			this._updatePreview();
		}
		
		private _onTouchPressed = (event: TouchEvent): void => {
			event.preventDefault();
			if (this._pattern == null) return;
			this._mouseDown = true;
			const boundingRect: ClientRect = this._svg.getBoundingClientRect();
			this._mouseX = event.touches[0].clientX - boundingRect.left;
			this._mouseY = event.touches[0].clientY - boundingRect.top;
			this._mouseXStart = this._mouseX;
			this._mouseYStart = this._mouseY;
			this._mouseXPrev = this._mouseX;
			this._mouseYPrev = this._mouseY;
			this._updateCursorStatus();
			this._updatePreview();
		}
		
		private _onMouseMoved = (event: MouseEvent): void => {
			const boundingRect: ClientRect = this._svg.getBoundingClientRect();
    		this._mouseX = (event.clientX || event.pageX) - boundingRect.left;
		    this._mouseY = (event.clientY || event.pageY) - boundingRect.top;
		    this._onCursorMoved();
		}
		
		private _onTouchMoved = (event: TouchEvent): void => {
			if (!this._mouseDown) return;
			event.preventDefault();
			const boundingRect: ClientRect = this._svg.getBoundingClientRect();
			this._mouseX = event.touches[0].clientX - boundingRect.left;
			this._mouseY = event.touches[0].clientY - boundingRect.top;
		    this._onCursorMoved();
		}
		
		private _onCursorMoved(): void {
			let start: number;
			let end: number;
			if (this._pattern == null) return;
			if (this._mouseDown && this._cursor.valid) {
				if (!this._mouseDragging) {
					const dx: number = this._mouseX - this._mouseXStart;
					const dy: number = this._mouseY - this._mouseYStart;
					if (Math.sqrt(dx * dx + dy * dy) > 5) {
						this._mouseDragging = true;
						this._mouseHorizontal = Math.abs(dx) >= Math.abs(dy);
					}
				}
				
				if (this._mouseDragging) {
					if (this._dragChange != null) {
						this._dragChange.undo();
						this._dragChange = null;
					}
					
					const currentPart: number = Math.floor(this._mouseX / this._partWidth);
					const sequence: ChangeSequence = new ChangeSequence();
					
					if (this._cursor.curTone == null) {
						let backwards: boolean;
						let directLength: number;
						if (currentPart < this._cursor.start) {
							backwards = true;
							directLength = this._cursor.start - currentPart;
						} else {
							backwards = false;
							directLength = currentPart - this._cursor.start + 1;
						}
						
						let defaultLength: number = 1;
						//for (const blessedLength of [1, 2, 3, 4, 6, 8, 12, 16, 24, 32, 36]) {
						for (let i: number = 0; i <= this._doc.song.beats * this._doc.song.parts; i++) {
							if (i >= 5 &&
							    i % this._doc.song.parts != 0 &&
							    i != this._doc.song.parts * 3.0 / 2.0 &&
							    i != this._doc.song.parts * 4.0 / 3.0 &&
							    i != this._doc.song.parts * 5.0 / 3.0)
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
							end = this._cursor.start;
							start = end - defaultLength;
						} else {
							start = this._cursor.start;
							end = start + defaultLength;
						}
						if (start < 0) start = 0;
						if (end > this._doc.song.beats * this._doc.song.parts) end = this._doc.song.beats * this._doc.song.parts;
						
						sequence.append(new ChangeToneTruncate(this._doc, this._pattern, start, end));
						let i: number;
						for (i = 0; i < this._pattern.tones.length; i++) {
							if (this._pattern.tones[i].start >= end) break;
						}
						const theTone: Tone = new Tone(this._cursor.note, start, end, 3, this._doc.channel == 3);
						sequence.append(new ChangeToneAdded(this._doc, this._pattern, theTone, i));
						this._copyPins(theTone);
					} else if (this._mouseHorizontal) {
						const shift: number = Math.round((this._mouseX - this._mouseXStart) / this._partWidth);
						
						const shiftedPin: TonePin = this._cursor.curTone.pins[this._cursor.nearPinIndex];
						let shiftedTime: number = this._cursor.curTone.start + shiftedPin.time + shift;
						if (shiftedTime < 0) shiftedTime = 0;
						if (shiftedTime > this._doc.song.beats * this._doc.song.parts) shiftedTime = this._doc.song.beats * this._doc.song.parts;
						
						if (shiftedTime <= this._cursor.curTone.start && this._cursor.nearPinIndex == this._cursor.curTone.pins.length - 1 ||
						    shiftedTime >= this._cursor.curTone.end   && this._cursor.nearPinIndex == 0)
						{
							sequence.append(new ChangeToneAdded(this._doc, this._pattern, this._cursor.curTone, this._cursor.curIndex, true));
						} else {
							start = Math.min(this._cursor.curTone.start, shiftedTime);
							end   = Math.max(this._cursor.curTone.end,   shiftedTime);
							sequence.append(new ChangeToneTruncate(this._doc, this._pattern, start, end, this._cursor.curTone));
							sequence.append(new ChangePinTime(this._doc, this._cursor.curTone, this._cursor.nearPinIndex, shiftedTime));
							this._copyPins(this._cursor.curTone);
						}
					} else if (this._cursor.noteIndex == -1) {
						const bendPart: number = Math.round(Math.max(this._cursor.curTone.start, Math.min(this._cursor.curTone.end, this._mouseX / this._partWidth))) - this._cursor.curTone.start;
						
						let prevPin: TonePin;
						let nextPin: TonePin = this._cursor.curTone.pins[0];
						let bendVolume: number;
						let bendInterval: number;
						for (let i: number = 1; i < this._cursor.curTone.pins.length; i++) {
							prevPin = nextPin;
							nextPin = this._cursor.curTone.pins[i];
							if (bendPart > nextPin.time) continue;
							if (bendPart < prevPin.time) throw new Error();
							const volumeRatio: number = (bendPart - prevPin.time) / (nextPin.time - prevPin.time);
							bendVolume = Math.round(prevPin.volume * (1.0 - volumeRatio) + nextPin.volume * volumeRatio + ((this._mouseYStart - this._mouseY) / 25.0));
							if (bendVolume < 0) bendVolume = 0;
							if (bendVolume > 3) bendVolume = 3;
							bendInterval = this._snapToNote(prevPin.interval * (1.0 - volumeRatio) + nextPin.interval * volumeRatio + this._cursor.curTone.notes[0], 0, Music.maxPitch) - this._cursor.curTone.notes[0];
							break;
						}
						
						sequence.append(new ChangeVolumeBend(this._doc, this._pattern, this._cursor.curTone, bendPart, bendVolume, bendInterval));
						this._copyPins(this._cursor.curTone);
					} else {
						let bendStart: number;
						let bendEnd: number;
						if (this._mouseX >= this._mouseXStart) {
							bendStart = this._cursor.part;
							bendEnd   = currentPart + 1;
						} else {
							bendStart = this._cursor.part + 1;
							bendEnd   = currentPart;
						}
						if (bendEnd < 0) bendEnd = 0;
						if (bendEnd > this._doc.song.beats * this._doc.song.parts) bendEnd = this._doc.song.beats * this._doc.song.parts;
						if (bendEnd > this._cursor.curTone.end) {
							sequence.append(new ChangeToneTruncate(this._doc, this._pattern, this._cursor.curTone.start, bendEnd, this._cursor.curTone));
						}
						if (bendEnd < this._cursor.curTone.start) {
							sequence.append(new ChangeToneTruncate(this._doc, this._pattern, bendEnd, this._cursor.curTone.end, this._cursor.curTone));
						}
						
						let minNote: number = Number.MAX_VALUE;
						let maxNote: number = -Number.MAX_VALUE;
						for (const note of this._cursor.curTone.notes) {
							if (minNote > note) minNote = note;
							if (maxNote < note) maxNote = note;
						}
						minNote -= this._cursor.curTone.notes[0];
						maxNote -= this._cursor.curTone.notes[0];
						const bendTo: number = this._snapToNote(this._findMousePitch(this._mouseY), -minNote, Music.maxPitch - maxNote);
						sequence.append(new ChangePitchBend(this._doc, this._cursor.curTone, bendStart, bendEnd, bendTo, this._cursor.noteIndex));
						this._copyPins(this._cursor.curTone);
					}
					this._dragChange = sequence;
				}
				this._mouseXPrev = this._mouseX;
				this._mouseYPrev = this._mouseY;
			} else {
				this._updateCursorStatus();
				this._updatePreview();
			}
		}
		
		private _onCursorReleased = (event: Event): void => {
			if (!this._cursor.valid) return;
			if (this._pattern == null) return;
			if (this._mouseDragging) {
				if (this._dragChange != null) {
					this._doc.history.record(this._dragChange);
					this._dragChange = null;
				}
			} else if (this._mouseDown) {
				if (this._cursor.curTone == null) {
					const tone: Tone = new Tone(this._cursor.note, this._cursor.start, this._cursor.end, 3, this._doc.channel == 3);
					tone.pins = [];
					for (const oldPin of this._cursor.pins) {
						tone.pins.push(new TonePin(0, oldPin.time, oldPin.volume));
					}
					this._doc.history.record(new ChangeToneAdded(this._doc, this._pattern, tone, this._cursor.curIndex));
				} else {
					if (this._cursor.noteIndex == -1) {
						const sequence: ChangeSequence = new ChangeSequence();
						if (this._cursor.curTone.notes.length == 4) {
							sequence.append(new ChangeNoteAdded(this._doc, this._pattern, this._cursor.curTone, this._cursor.curTone.notes[0], 0, true));
						}
						sequence.append(new ChangeNoteAdded(this._doc, this._pattern, this._cursor.curTone, this._cursor.note, this._cursor.curTone.notes.length));
						this._doc.history.record(sequence);
						this._copyPins(this._cursor.curTone);
					} else {
						if (this._cursor.curTone.notes.length == 1) {
							this._doc.history.record(new ChangeToneAdded(this._doc, this._pattern, this._cursor.curTone, this._cursor.curIndex, true));
						} else {
							this._doc.history.record(new ChangeNoteAdded(this._doc, this._pattern, this._cursor.curTone, this._cursor.note, this._cursor.curTone.notes.indexOf(this._cursor.note), true));
						}
					}
				}
			}
			
			this._mouseDown = false;
			this._mouseDragging = false;
			this._updateCursorStatus();
			this._updatePreview();
		}
		
		private _updatePreview(): void {
			if (!this._mouseOver || this._mouseDown || !this._cursor.valid || this._pattern == null) {
				this._svgPreview.setAttribute("visibility", "hidden");
			} else {
				this._svgPreview.setAttribute("visibility", "visible");
				this._drawNote(this._svgPreview, this._cursor.note, this._cursor.start, this._cursor.pins, this._noteHeight / 2 + 1, true, this._octaveOffset);
			}
		}
		
		private _documentChanged = (): void => {
			this._editorWidth = this._doc.showLetters ? (this._doc.showScrollBar ? 460 : 480) : (this._doc.showScrollBar ? 492 : 512);
			this._pattern = this._doc.getCurrentPattern();
			this._partWidth = this._editorWidth / (this._doc.song.beats * this._doc.song.parts);
			this._noteHeight = this._doc.channel == 3 ? this._defaultDrumHeight : this._defaultNoteHeight;
			this._noteCount = this._doc.channel == 3 ? Music.drumCount : Music.noteCount;
			this._octaveOffset = this._doc.song.channelOctaves[this._doc.channel] * 12;
			this._copiedPins = this._copiedPinChannels[this._doc.channel];
			
			if (this._renderedWidth != this._editorWidth) {
				this._renderedWidth = this._editorWidth;
				this._svg.setAttribute("width", "" + this._editorWidth);
				this._svgBackground.setAttribute("width", "" + this._editorWidth);
			}
			
			const beatWidth = this._editorWidth / this._doc.song.beats;
			if (this._renderedBeatWidth != beatWidth) {
				this._renderedBeatWidth = beatWidth;
				this._svgNoteBackground.setAttribute("width", "" + beatWidth);
				this._svgDrumBackground.setAttribute("width", "" + beatWidth);
				this._backgroundDrumRow.setAttribute("width", "" + (beatWidth - 2));
				for (let j: number = 0; j < 12; j++) {
					this._backgroundNoteRows[j].setAttribute("width", "" + (beatWidth - 2));
				}
			}
			
			if (!this._mouseDown) this._updateCursorStatus();
			
			this._svgNoteContainer = <SVGSVGElement> makeEmptyReplacementElement(this._svgNoteContainer);
			
			this._updatePreview();
			
			if (this._pattern == null) {
				this._svg.style.visibility = "hidden";
				return;
			}
			this._svg.style.visibility = "visible";
			
			if (this._renderedFifths != this._doc.showFifth) {
				this._renderedFifths = this._doc.showFifth;
				this._backgroundNoteRows[7].setAttribute("fill", this._doc.showFifth ? "#446688" : "#444444");
			}
			
			for (let j: number = 0; j < 12; j++) {
				this._backgroundNoteRows[j].style.visibility = Music.scaleFlags[this._doc.song.scale][j] ? "visible" : "hidden";
			}
			
			if (this._doc.channel == 3) {
				if (!this._renderedDrums) {
					this._renderedDrums = true;
					this._svgBackground.setAttribute("fill", "url(#patternEditorDrumBackground)");
					this._svgBackground.setAttribute("height", "" + (this._defaultDrumHeight * Music.drumCount));
					this._svg.setAttribute("height", "" + (this._defaultDrumHeight * Music.drumCount));
				}
			} else {
				if (this._renderedDrums) {
					this._renderedDrums = false;
					this._svgBackground.setAttribute("fill", "url(#patternEditorNoteBackground)");
					this._svgBackground.setAttribute("height", "" + this._editorHeight);
					this._svg.setAttribute("height", "" + this._editorHeight);
				}
			}
			
			if (this._doc.channel != 3 && this._doc.showChannels) {
				for (let channel: number = 2; channel >= 0; channel--) {
					if (channel == this._doc.channel) continue;
					const pattern2: BarPattern | null = this._doc.song.getPattern(channel, this._doc.bar);
					if (pattern2 == null) continue;
					for (const tone of pattern2.tones) {
						for (const note of tone.notes) {
							const notePath: SVGPathElement = <SVGPathElement> svgElement("path");
							notePath.setAttribute("fill", SongEditor.noteColorsDim[channel]);
							notePath.setAttribute("pointer-events", "none");
							this._drawNote(notePath, note, tone.start, tone.pins, this._noteHeight / 2 - 4, false, this._doc.song.channelOctaves[channel] * 12);
							this._svgNoteContainer.appendChild(notePath);
						}
					}
				}
			}
			
			for (const tone of this._pattern.tones) {
				for (const note of tone.notes) {
					let notePath: SVGPathElement = <SVGPathElement> svgElement("path");
					notePath.setAttribute("fill", SongEditor.noteColorsDim[this._doc.channel]);
					notePath.setAttribute("pointer-events", "none");
					this._drawNote(notePath, note, tone.start, tone.pins, this._noteHeight / 2 + 1, false, this._octaveOffset);
					this._svgNoteContainer.appendChild(notePath);
					notePath = <SVGPathElement> svgElement("path");
					notePath.setAttribute("fill", SongEditor.noteColorsBright[this._doc.channel]);
					notePath.setAttribute("pointer-events", "none");
					this._drawNote(notePath, note, tone.start, tone.pins, this._noteHeight / 2 + 1, true, this._octaveOffset);
					this._svgNoteContainer.appendChild(notePath);
				}
			}
		}
		
		private _drawNote(svgElement: SVGPathElement, note: number, start: number, pins: TonePin[], radius: number, showVolume: boolean, offset: number): void {
			let nextPin: TonePin = pins[0];
			let pathString: string = "M " + prettyNumber(this._partWidth * (start + nextPin.time) + 1) + " " + prettyNumber(this._noteToPixelHeight(note - offset) + radius * (showVolume ? nextPin.volume / 3.0 : 1.0)) + " ";
			for (let i: number = 1; i < pins.length; i++) {
				let prevPin: TonePin = nextPin;
				nextPin = pins[i];
				let prevSide: number = this._partWidth * (start + prevPin.time) + (i == 1 ? 1 : 0);
				let nextSide: number = this._partWidth * (start + nextPin.time) - (i == pins.length - 1 ? 1 : 0);
				let prevHeight: number = this._noteToPixelHeight(note + prevPin.interval - offset);
				let nextHeight: number = this._noteToPixelHeight(note + nextPin.interval - offset);
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
				let prevSide: number = this._partWidth * (start + prevPin.time) - (i == pins.length - 2 ? 1 : 0);
				let nextSide: number = this._partWidth * (start + nextPin.time) + (i == 0 ? 1 : 0);
				let prevHeight: number = this._noteToPixelHeight(note + prevPin.interval - offset);
				let nextHeight: number = this._noteToPixelHeight(note + nextPin.interval - offset);
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
		
		private _noteToPixelHeight(note: number): number {
			return this._noteHeight * (this._noteCount - (note) - 0.5);
		}
	}
}
