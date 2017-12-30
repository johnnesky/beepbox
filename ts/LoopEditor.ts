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
/// <reference path="SongDocument.ts" />
/// <reference path="html.ts" />
/// <reference path="changes.ts" />

interface Cursor {
	startBar: number;
	mode: number;
}

interface Endpoints {
	start: number;
	length: number;
}

module beepbox {
	export class LoopEditor {
		private readonly _barWidth: number = 32;
		private readonly _editorWidth: number = 512;
		private readonly _editorHeight: number = 20;
		private readonly _startMode:   number = 0;
		private readonly _endMode:     number = 1;
		private readonly _bothMode:    number = 2;
		
		private readonly _loop = <SVGPathElement> svgElement("path", {fill: "none", stroke: "#7744ff", "stroke-width": 4});
		private readonly _highlight = <SVGPathElement> svgElement("path", {fill: "white", "pointer-events": "none"});
		
		private readonly _svg = <SVGSVGElement> svgElement("svg", {style: "background-color: #000000; touch-action: pan-y; position: absolute;", width: this._editorWidth, height: this._editorHeight}, [
			this._loop,
			this._highlight,
		]);
		
		private readonly _canvas: HTMLCanvasElement = html.canvas({width: "512", height: "20"});
		private readonly _preview: HTMLCanvasElement = html.canvas({width: "512", height: "20"});
		public readonly container: HTMLElement = html.div({style: "width: 512px; height: 20px; position: relative;"}, [this._svg]);
		
		private _change: ChangeLoop | null = null;
		private _cursor: Cursor = {startBar: -1, mode: -1};
		private _mouseX: number = 0;
		private _mouseY: number = 0;
		private _mouseDown: boolean = false;
		private _mouseOver: boolean = false;
		private _renderedLoopStart: number = -1;
		private _renderedLoopStop: number = -1;
		
		constructor(private _doc: SongDocument) {
			this._updateCursorStatus();
			this._render();
			this._doc.notifier.watch(this._documentChanged);
			
			this.container.addEventListener("mousedown", this._whenMousePressed);
			document.addEventListener("mousemove", this._whenMouseMoved);
			document.addEventListener("mouseup", this._whenCursorReleased);
			this.container.addEventListener("mouseover", this._whenMouseOver);
			this.container.addEventListener("mouseout", this._whenMouseOut);
			
			this.container.addEventListener("touchstart", this._whenTouchPressed);
			document.addEventListener("touchmove", this._whenTouchMoved);
			document.addEventListener("touchend", this._whenCursorReleased);
			document.addEventListener("touchcancel", this._whenCursorReleased);
		}
		
		private _updateCursorStatus(): void {
			const bar: number = this._mouseX / this._barWidth + this._doc.barScrollPos;
			this._cursor.startBar = bar;
			
			if (bar > this._doc.song.loopStart - 0.25 && bar < this._doc.song.loopStart + this._doc.song.loopLength + 0.25) {
				if (bar - this._doc.song.loopStart < this._doc.song.loopLength * 0.5) {
					this._cursor.mode = this._startMode;
				} else {
					this._cursor.mode = this._endMode;
				}
			} else {
				this._cursor.mode = this._bothMode;
			}
		}
		
		private _findEndPoints(middle: number): Endpoints {
			let start: number = Math.round(middle - this._doc.song.loopLength / 2);
			let end: number = start + this._doc.song.loopLength;
			if (start < 0) {
				end -= start;
				start = 0;
			}
			if (end > this._doc.song.bars) {
				start -= end - this._doc.song.bars;
				end = this._doc.song.bars;
			}
			return {start: start, length: end - start};
		}
		
		private _whenMouseOver = (event: MouseEvent): void => {
			if (this._mouseOver) return;
			this._mouseOver = true;
			this._updatePreview();
		}
		
		private _whenMouseOut = (event: MouseEvent): void => {
			if (!this._mouseOver) return;
			this._mouseOver = false;
			this._updatePreview();
		}
		
		private _whenMousePressed = (event: MouseEvent): void => {
			event.preventDefault();
			this._mouseDown = true;
			const boundingRect: ClientRect = this._svg.getBoundingClientRect();
    		this._mouseX = (event.clientX || event.pageX) - boundingRect.left;
		    this._mouseY = (event.clientY || event.pageY) - boundingRect.top;
			this._updateCursorStatus();
			this._updatePreview();
			this._whenMouseMoved(event);
		}
		
		private _whenTouchPressed = (event: TouchEvent): void => {
			event.preventDefault();
			this._mouseDown = true;
			const boundingRect: ClientRect = this._svg.getBoundingClientRect();
			this._mouseX = event.touches[0].clientX - boundingRect.left;
			this._mouseY = event.touches[0].clientY - boundingRect.top;
			this._updateCursorStatus();
			this._updatePreview();
			this._whenTouchMoved(event);
		}
		
		private _whenMouseMoved = (event: MouseEvent): void => {
			const boundingRect: ClientRect = this._svg.getBoundingClientRect();
    		this._mouseX = (event.clientX || event.pageX) - boundingRect.left;
		    this._mouseY = (event.clientY || event.pageY) - boundingRect.top;
		    this._whenCursorMoved();
		}
		
		private _whenTouchMoved = (event: TouchEvent): void => {
			if (!this._mouseDown) return;
			event.preventDefault();
			const boundingRect: ClientRect = this._svg.getBoundingClientRect();
			this._mouseX = event.touches[0].clientX - boundingRect.left;
			this._mouseY = event.touches[0].clientY - boundingRect.top;
		    this._whenCursorMoved();
		}
		
		private _whenCursorMoved(): void {
			if (this._mouseDown) {
				let oldStart: number = this._doc.song.loopStart;
				let oldEnd: number = this._doc.song.loopStart + this._doc.song.loopLength;
				if (this._change != null && this._doc.history.lastChangeWas(this._change)) {
					oldStart = this._change.oldStart;
					oldEnd = oldStart + this._change.oldLength;
				}
				
				const bar: number = this._mouseX / this._barWidth + this._doc.barScrollPos;
				let start: number;
				let end: number;
				let temp: number;
				if (this._cursor.mode == this._startMode) {
					start = oldStart + Math.round(bar - this._cursor.startBar);
					end = oldEnd;
					if (start == end) {
						start = end - 1;
					} else if (start > end) {
						temp = start;
						start = end;
						end = temp;
					}
					if (start < 0) start = 0;
					if (end >= this._doc.song.bars) end = this._doc.song.bars;
					this._change = new ChangeLoop(this._doc, oldStart, oldEnd - oldStart, start, end - start);
				} else if (this._cursor.mode == this._endMode) {
					start = oldStart;
					end = oldEnd + Math.round(bar - this._cursor.startBar);
					if (end == start) {
						end = start + 1;
					} else if (end < start) {
						temp = start;
						start = end;
						end = temp;
					}
					if (start < 0) start = 0;
					if (end >= this._doc.song.bars) end = this._doc.song.bars;
					this._change = new ChangeLoop(this._doc, oldStart, oldEnd - oldStart, start, end - start);
				} else if (this._cursor.mode == this._bothMode) {
					const endPoints: Endpoints = this._findEndPoints(bar);
					this._change = new ChangeLoop(this._doc, oldStart, oldEnd - oldStart, endPoints.start, endPoints.length);
				}
				this._doc.history.setProspectiveChange(this._change);
			} else {
				this._updateCursorStatus();
				this._updatePreview();
			}
		}
		
		private _whenCursorReleased = (event: Event): void => {
			if (this._change != null) this._doc.history.record(this._change);
			this._change = null;
			this._mouseDown = false;
			this._updateCursorStatus();
			this._render();
		}
		
		private _updatePreview(): void {
			const showHighlight: boolean = this._mouseOver && !this._mouseDown;
			this._highlight.style.visibility = showHighlight ? "visible" : "hidden";
			
			if (showHighlight) {
				const radius: number = this._editorHeight / 2;
				
				let highlightStart: number = (this._doc.song.loopStart - this._doc.barScrollPos) * this._barWidth;
				let highlightStop: number = (this._doc.song.loopStart + this._doc.song.loopLength - this._doc.barScrollPos) * this._barWidth;
				if (this._cursor.mode == this._startMode) {
					highlightStop = (this._doc.song.loopStart - this._doc.barScrollPos) * this._barWidth + radius * 2;
				} else if (this._cursor.mode == this._endMode) {
					highlightStart = (this._doc.song.loopStart + this._doc.song.loopLength - this._doc.barScrollPos) * this._barWidth - radius * 2;
				} else {
					const endPoints: Endpoints = this._findEndPoints(this._cursor.startBar);
					highlightStart = (endPoints.start - this._doc.barScrollPos) * this._barWidth;
					highlightStop = (endPoints.start + endPoints.length - this._doc.barScrollPos) * this._barWidth;
				}
				
				this._highlight.setAttribute("d",
					`M ${highlightStart + radius} ${4} ` +
					`L ${highlightStop - radius} ${4} ` +
					`A ${radius - 4} ${radius - 4} ${0} ${0} ${1} ${highlightStop - radius} ${this._editorHeight - 4} ` +
					`L ${highlightStart + radius} ${this._editorHeight - 4} ` +
					`A ${radius - 4} ${radius - 4} ${0} ${0} ${1} ${highlightStart + radius} ${4} ` +
					`z`
				);
			}
		}
		
		private _documentChanged = (): void => {
			this._render();
		}
		
		private _render(): void {
			const radius: number = this._editorHeight / 2;
			const loopStart: number = (this._doc.song.loopStart - this._doc.barScrollPos) * this._barWidth;
			const loopStop: number = (this._doc.song.loopStart + this._doc.song.loopLength - this._doc.barScrollPos) * this._barWidth;
			
			if (this._renderedLoopStart != loopStart || this._renderedLoopStop != loopStop) {
				this._renderedLoopStart = loopStart;
				this._renderedLoopStop = loopStop;
				this._loop.setAttribute("d",
					`M ${loopStart + radius} ${2} ` +
					`L ${loopStop - radius} ${2} ` +
					`A ${radius - 2} ${radius - 2} ${0} ${0} ${1} ${loopStop - radius} ${this._editorHeight - 2} ` +
					`L ${loopStart + radius} ${this._editorHeight - 2} ` +
					`A ${radius - 2} ${radius - 2} ${0} ${0} ${1} ${loopStart + radius} ${2} ` +
					`z`
				);
			}
			
			this._updatePreview();
		}
	}
}
