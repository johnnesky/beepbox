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

"use strict";

module beepbox {
	export class OctaveScrollBar {
		private readonly _canvas: HTMLCanvasElement = html.canvas({width: "20", height: "481"});
		private readonly _preview: HTMLCanvasElement = html.canvas({width: "20", height: "481"});
		public readonly container: HTMLDivElement = html.div({id: "octaveScrollBarContainer", style: "width: 20px; height: 481px; display: table-cell; overflow:hidden; position: relative;"}, [
			this._canvas,
			this._preview,
		]);
		private readonly _previewGraphics: CanvasRenderingContext2D = this._preview.getContext("2d");
		private readonly _graphics: CanvasRenderingContext2D = this._canvas.getContext("2d");
		private readonly _editorWidth: number = 20;
		private readonly _editorHeight: number = 481;
		private readonly _rootHeight: number = 4.0;
		private readonly _octaveCount: number = 7;
		
		private _mouseX: number;
		private _mouseY: number;
		private _mouseDown: boolean = false;
		private _mouseOver: boolean = false;
		private _octaveHeight: number;
		private _barHeight: number;
		private _dragging: boolean = false;
		private _dragStart: number;
		private _currentOctave: number;
		private _barBottom: number;
		
		constructor(private _doc: SongDocument) {
			this._doc.watch(this._documentChanged);
			this._documentChanged();
			
			this._octaveHeight = (this._editorHeight - this._rootHeight) / this._octaveCount;
			this._barHeight = (this._octaveHeight * 3 + this._rootHeight);
			
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
			this._mouseOver = true;
		}
		
		private _onMouseOut = (event: MouseEvent): void => {
			this._mouseOver = false;
		}
		
		private _onMousePressed = (event: MouseEvent): void => {
			event.preventDefault();
			this._mouseDown = true;
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
			const boundingRect: ClientRect = this._canvas.getBoundingClientRect();
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
			const boundingRect: ClientRect = this._canvas.getBoundingClientRect();
    		this._mouseX = (event.clientX || event.pageX) - boundingRect.left;
		    this._mouseY = (event.clientY || event.pageY) - boundingRect.top;
		    this._onCursorMoved();
		}
		
		private _onTouchMoved = (event: TouchEvent): void => {
			if (!this._mouseDown) return;
			event.preventDefault();
			const boundingRect: ClientRect = this._canvas.getBoundingClientRect();
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
			
			this._updatePreview();
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
			this._previewGraphics.clearRect(0, 0, this._editorWidth, this._editorHeight);
			if (this._doc.channel == 3) return;
			if (!this._mouseOver || this._mouseDown) return;
			
			const center: number = this._editorWidth * 0.5;
			const base: number = 20;
			const tip: number = 9;
			const arrowWidth: number = 6;
			if (this._mouseY < this._barBottom - this._barHeight) {
				this._previewGraphics.fillStyle = "#ffffff";
				this._previewGraphics.beginPath();
				this._previewGraphics.moveTo(center, tip);
				this._previewGraphics.lineTo(center + arrowWidth, base);
				this._previewGraphics.lineTo(center - arrowWidth, base);
				this._previewGraphics.lineTo(center, tip);
				this._previewGraphics.fill();
			} else if (this._mouseY > this._barBottom) {
				this._previewGraphics.fillStyle = "#ffffff";
				this._previewGraphics.beginPath();
				this._previewGraphics.moveTo(center, this._editorHeight - tip);
				this._previewGraphics.lineTo(center + arrowWidth, this._editorHeight - base);
				this._previewGraphics.lineTo(center - arrowWidth, this._editorHeight - base);
				this._previewGraphics.lineTo(center, this._editorHeight - tip);
				this._previewGraphics.fill();
			} else {
				this._previewGraphics.lineWidth = 2;
				this._previewGraphics.strokeStyle = "#ffffff";
				this._previewGraphics.strokeRect(1, this._barBottom, this._editorWidth - 2, -this._barHeight);
			}
		}
		
		private _documentChanged = (): void => {
			this._currentOctave = this._doc.song.channelOctaves[this._doc.channel];
			this._barBottom = this._editorHeight - (this._octaveHeight * this._currentOctave);
			this._render();
		}
		
		private _render(): void {
			this._graphics.clearRect(0, 0, this._editorWidth, this._editorHeight);
			
			if (this._doc.channel != 3) {
				this._graphics.fillStyle = "#444444";
				this._graphics.fillRect(2, this._barBottom, this._editorWidth - 4, -this._barHeight);
				
				for (let i: number = 0; i <= this._octaveCount; i++) {
					this._graphics.fillStyle = "#886644";
					this._graphics.fillRect(0, i * this._octaveHeight, this._editorWidth, this._rootHeight);
				}
			}
			
			this._updatePreview();
		}
	}
}
