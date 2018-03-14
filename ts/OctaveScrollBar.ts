/*
Copyright (C) 2018 John Nesky

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

namespace beepbox {
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
		
		private readonly _svg = <SVGSVGElement> svgElement("svg", {style: "background-color: #000000; touch-action: pan-x; position: absolute;", width: this._editorWidth, height: "100%", viewBox: "0 0 20 481", preserveAspectRatio: "none"});
		public readonly container: HTMLDivElement = html.div({id: "octaveScrollBarContainer", style: "width: 20px; height: 100%; overflow: hidden; position: relative; flex-shrink: 0;"}, [this._svg]);
		
		private _mouseX: number = 0;
		private _mouseY: number = 0;
		private _mouseDown: boolean = false;
		private _mouseOver: boolean = false;
		private _dragging: boolean = false;
		private _dragStart: number;
		private _barBottom: number;
		private _renderedBarBottom: number = -1;
		private _change: ChangeOctave | null = null;
		
		constructor(private _doc: SongDocument) {
			this._doc.notifier.watch(this._documentChanged);
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
			
			this.container.addEventListener("mousedown", this._whenMousePressed);
			document.addEventListener("mousemove", this._whenMouseMoved);
			document.addEventListener("mouseup", this._whenCursorReleased);
			this.container.addEventListener("mouseover", this._whenMouseOver);
			this.container.addEventListener("mouseout", this._whenMouseOut);
			
			this.container.addEventListener("touchstart", this._whenTouchPressed);
			this.container.addEventListener("touchmove", this._whenTouchMoved);
			this.container.addEventListener("touchend", this._whenCursorReleased);
			this.container.addEventListener("touchcancel", this._whenCursorReleased);
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
		    this._mouseY = ((event.clientY || event.pageY) - boundingRect.top) * this._editorHeight / (boundingRect.bottom - boundingRect.top);
		    if (isNaN(this._mouseY)) this._mouseY = 0;
			if (this._doc.song.getChannelIsDrum(this._doc.channel)) return;
			this._updatePreview();
			
			if (this._mouseY >= this._barBottom - this._barHeight && this._mouseY <= this._barBottom) {
				this._dragging = true;
				this._change = null;
				this._dragStart = this._mouseY;
			}
		}
		
		private _whenTouchPressed = (event: TouchEvent): void => {
			event.preventDefault();
			this._mouseDown = true;
			const boundingRect: ClientRect = this._svg.getBoundingClientRect();
			this._mouseX = event.touches[0].clientX - boundingRect.left;
			this._mouseY = (event.touches[0].clientY - boundingRect.top) * this._editorHeight / (boundingRect.bottom - boundingRect.top);
		    if (isNaN(this._mouseY)) this._mouseY = 0;
			if (this._doc.song.getChannelIsDrum(this._doc.channel)) return;
			this._updatePreview();
			
			if (this._mouseY >= this._barBottom - this._barHeight && this._mouseY <= this._barBottom) {
				this._dragging = true;
				this._change = null;
				this._dragStart = this._mouseY;
			}
		}
		
		private _whenMouseMoved = (event: MouseEvent): void => {
			const boundingRect: ClientRect = this._svg.getBoundingClientRect();
    		this._mouseX = (event.clientX || event.pageX) - boundingRect.left;
		    this._mouseY = ((event.clientY || event.pageY) - boundingRect.top) * this._editorHeight / (boundingRect.bottom - boundingRect.top);
		    if (isNaN(this._mouseY)) this._mouseY = 0;
		    this._whenCursorMoved();
		}
		
		private _whenTouchMoved = (event: TouchEvent): void => {
			if (!this._mouseDown) return;
			event.preventDefault();
			const boundingRect: ClientRect = this._svg.getBoundingClientRect();
			this._mouseX = event.touches[0].clientX - boundingRect.left;
			this._mouseY = (event.touches[0].clientY - boundingRect.top) * this._editorHeight / (boundingRect.bottom - boundingRect.top);
		    if (isNaN(this._mouseY)) this._mouseY = 0;
		    this._whenCursorMoved();
		}
		
		private _whenCursorMoved(): void {
			if (this._doc.song.getChannelIsDrum(this._doc.channel)) return;
			if (this._dragging) {
				const currentOctave: number = this._doc.song.channels[this._doc.channel].octave;
				const continuingProspectiveChange: boolean = this._doc.lastChangeWas(this._change);
				const oldValue: number = continuingProspectiveChange ? this._change!.oldValue : currentOctave;
				
				let octave: number = currentOctave;
				while (this._mouseY - this._dragStart < -this._octaveHeight * 0.5) {
					if (octave < 4) {
						octave++;
						this._dragStart -= this._octaveHeight;
					} else {
						break;
					}
				}
				while (this._mouseY - this._dragStart > this._octaveHeight * 0.5) {
					if (octave > 0) {
						octave--;
						this._dragStart += this._octaveHeight;
					} else {
						break;
					}
				}
				
				this._change = new ChangeOctave(this._doc, oldValue, octave);
				this._doc.setProspectiveChange(this._change);
			}
			
			if (this._mouseOver) this._updatePreview();
		}
		
		private _whenCursorReleased = (event: Event): void => {
			if (!this._doc.song.getChannelIsDrum(this._doc.channel) && this._mouseDown) {
				if (this._dragging) {
					if (this._change != null) this._doc.record(this._change);
				} else {
					const canReplaceLastChange: boolean = this._doc.lastChangeWas(this._change);
					const oldValue: number = canReplaceLastChange ? this._change!.oldValue : this._doc.song.channels[this._doc.channel].octave;
					const currentOctave: number = this._doc.song.channels[this._doc.channel].octave;
				
					if (this._mouseY < this._barBottom - this._barHeight * 0.5) {
						if (currentOctave < 4) {
							this._change = new ChangeOctave(this._doc, oldValue, currentOctave + 1);
							this._doc.record(this._change, canReplaceLastChange);
						}
					} else {
						if (currentOctave > 0) {
							this._change = new ChangeOctave(this._doc, oldValue, currentOctave - 1);
							this._doc.record(this._change, canReplaceLastChange);
						}
					}
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
			
			this._upHighlight.style.visibility = showUpHighlight ? "inherit" : "hidden";
			this._downHighlight.style.visibility = showDownHighlight ? "inherit" : "hidden";
			this._handleHighlight.style.visibility = showHandleHighlight ? "inherit" : "hidden";
		}
		
		private _documentChanged = (): void => {
			this._barBottom = this._editorHeight - (this._octaveHeight * this._doc.song.channels[this._doc.channel].octave);
			this._render();
		}
		
		private _render(): void {
			this._svg.style.visibility = (this._doc.song.getChannelIsDrum(this._doc.channel)) ? "hidden" : "visible";
			if (this._renderedBarBottom != this._barBottom) {
				this._renderedBarBottom = this._barBottom;
				this._handle.setAttribute("y", "" + (this._barBottom - this._barHeight));
				this._handleHighlight.setAttribute("y", "" + (this._barBottom - this._barHeight));
			}
			this._updatePreview();
		}
	}
}
