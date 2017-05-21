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

module beepbox {
	export class OctaveScrollBar {
		private readonly _editorWidth: number = 20;
		private readonly _editorHeight: number = 481;
		private readonly _notchHeight: number = 4.0;
		private readonly _octaveCount: number = 7;
		private readonly _octaveHeight: number = (this._editorHeight - this._notchHeight) / this._octaveCount;
		private readonly _barHeight: number = (this._octaveHeight * 3 + this._notchHeight);
		
		private readonly _handle = <SVGRectElement> svgElement("rect", {fill: "#444444", x: 2, y: 0, width: this._editorWidth - 4, height: this._barHeight});
		private readonly _handleHighlight = <SVGRectElement> svgElement("rect", {fill: "none", stroke: "white", "stroke-width": 2, "pointer-events": "none", x: 1, y: 0, width: this._editorWidth - 2, height: this._barHeight});
		private readonly _upHighlight = <SVGPathElement> svgElement("path", {fill: "white", "pointer-events": "none"});
		private readonly _downHighlight = <SVGPathElement> svgElement("path", {fill: "white", "pointer-events": "none"});
		
		private readonly _svg = <SVGSVGElement> svgElement("svg", {style: "background-color: #000000; touch-action: pan-x; position: absolute;", width: this._editorWidth, height: this._editorHeight});
		public readonly container: HTMLDivElement = html.div({id: "octaveScrollBarContainer", style: "width: 20px; height: 481px; overflow: hidden; position: relative;"}, [this._svg]);
		
		private _mouseX: number = 0;
		private _mouseY: number = 0;
		private _mouseDown: boolean = false;
		private _mouseOver: boolean = false;
		private _dragging: boolean = false;
		private _dragStart: number;
		private _currentOctave: number;
		private _barBottom: number;
		private _renderedBarBottom: number = -1;
		
		constructor(private _doc: SongDocument) {
			this._doc.watch(this._documentChanged);
			this._documentChanged();
			
			this._svg.appendChild(this._handle);
			
			// notches:
			for (let i: number = 0; i <= this._octaveCount; i++) {
				this._svg.appendChild(svgElement("rect", {fill: "#886644", x: 0, y: i * this._octaveHeight, width: this._editorWidth, height: this._notchHeight}));
			}
			
			this._svg.appendChild(this._handleHighlight);
			this._svg.appendChild(this._upHighlight);
			this._svg.appendChild(this._downHighlight);
			
			const center: number = this._editorWidth * 0.5;
			const base: number = 20;
			const tip: number = 9;
			const arrowWidth: number = 6;
			this._upHighlight.setAttribute("d", `M ${center} ${tip} L ${center + arrowWidth} ${base} L ${center - arrowWidth} ${base} z`);
			this._downHighlight.setAttribute("d", `M ${center} ${this._editorHeight - tip} L ${center + arrowWidth} ${this._editorHeight - base} L ${center - arrowWidth} ${this._editorHeight - base} z`);
			
			this.container.addEventListener("mousedown", this._onMousePressed);
			document.addEventListener("mousemove", this._onMouseMoved);
			document.addEventListener("mouseup", this._onCursorReleased);
			this.container.addEventListener("mouseover", this._onMouseOver);
			this.container.addEventListener("mouseout", this._onMouseOut);
			
			this.container.addEventListener("touchstart", this._onTouchPressed);
			document.addEventListener("touchmove", this._onTouchMoved);
			document.addEventListener("touchend", this._onCursorReleased);
			document.addEventListener("touchcancel", this._onCursorReleased);
		}
		
		private _onMouseOver = (event: MouseEvent): void => {
			if (this._mouseOver) return;
			this._mouseOver = true;
			this._updatePreview();
		}
		
		private _onMouseOut = (event: MouseEvent): void => {
			if (!this._mouseOver) return;
			this._mouseOver = false;
			this._updatePreview();
		}
		
		private _onMousePressed = (event: MouseEvent): void => {
			event.preventDefault();
			this._mouseDown = true;
			const boundingRect: ClientRect = this._svg.getBoundingClientRect();
    		this._mouseX = (event.clientX || event.pageX) - boundingRect.left;
		    this._mouseY = (event.clientY || event.pageY) - boundingRect.top;
			if (this._doc.channel == 3) return;
			this._updatePreview();
			
			if (this._mouseY >= this._barBottom - this._barHeight && this._mouseY <= this._barBottom) {
				this._dragging = true;
				this._dragStart = this._mouseY;
			}
		}
		
		private _onTouchPressed = (event: TouchEvent): void => {
			event.preventDefault();
			this._mouseDown = true;
			const boundingRect: ClientRect = this._svg.getBoundingClientRect();
			this._mouseX = event.touches[0].clientX - boundingRect.left;
			this._mouseY = event.touches[0].clientY - boundingRect.top;
			if (this._doc.channel == 3) return;
			this._updatePreview();
			
			if (this._mouseY >= this._barBottom - this._barHeight && this._mouseY <= this._barBottom) {
				this._dragging = true;
				this._dragStart = this._mouseY;
			}
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
			if (this._doc.channel == 3) return;
			if (this._dragging) {
				while (this._mouseY - this._dragStart < -this._octaveHeight * 0.5) {
					if (this._currentOctave < 4) {
						this._doc.history.record(new ChangeOctave(this._doc, this._currentOctave + 1));
						this._dragStart -= this._octaveHeight;
					} else {
						break;
					}
				}
				while (this._mouseY - this._dragStart > this._octaveHeight * 0.5) {
					if (this._currentOctave > 0) {
						this._doc.history.record(new ChangeOctave(this._doc, this._currentOctave - 1));
						this._dragStart += this._octaveHeight;
					} else {
						break;
					}
				}
			}
			
			if (this._mouseOver) this._updatePreview();
		}
		
		private _onCursorReleased = (event: Event): void => {
			if (this._doc.channel != 3 && !this._dragging && this._mouseDown) {
				if (this._mouseY < this._barBottom - this._barHeight * 0.5) {
					if (this._currentOctave < 4) this._doc.history.record(new ChangeOctave(this._doc, this._currentOctave + 1));
				} else {
					if (this._currentOctave > 0) this._doc.history.record(new ChangeOctave(this._doc, this._currentOctave - 1));
				}
			}
			this._mouseDown = false;
			this._dragging = false;
			this._updatePreview();
		}
		
		private _updatePreview(): void {
			const showHighlight: boolean = this._mouseOver && !this._mouseDown;
			let showUpHighlight: boolean = false;
			let showDownHighlight: boolean = false;
			let showHandleHighlight: boolean = false;
			
			if (showHighlight) {
				if (this._mouseY < this._barBottom - this._barHeight) {
					showUpHighlight = true;
				} else if (this._mouseY > this._barBottom) {
					showDownHighlight = true;
				} else {
					showHandleHighlight = true;
				}
			}
			
			this._upHighlight.style.visibility = showUpHighlight ? "visible" : "hidden";
			this._downHighlight.style.visibility = showDownHighlight ? "visible" : "hidden";
			this._handleHighlight.style.visibility = showHandleHighlight ? "visible" : "hidden";
		}
		
		private _documentChanged = (): void => {
			this._currentOctave = this._doc.song.channelOctaves[this._doc.channel];
			this._barBottom = this._editorHeight - (this._octaveHeight * this._currentOctave);
			this._render();
		}
		
		private _render(): void {
			this._svg.style.visibility = (this._doc.channel == 3) ? "hidden" : "visible";
			if (this._renderedBarBottom != this._barBottom) {
				this._renderedBarBottom = this._barBottom;
				this._handle.setAttribute("y", "" + (this._barBottom - this._barHeight));
				this._handleHighlight.setAttribute("y", "" + (this._barBottom - this._barHeight));
			}
			this._updatePreview();
		}
	}
}
