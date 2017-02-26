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
	export class BarScrollBar {
		private readonly _canvas: HTMLCanvasElement = html.canvas({width: "512", height: "20"});
		private readonly _preview: HTMLCanvasElement = html.canvas({width: "512", height: "20"});
		public readonly container: HTMLElement = html.div({style: "width: 512px; height: 20px; position: relative;"}, [
			this._canvas,
			this._preview,
		]);
		private readonly _graphics: CanvasRenderingContext2D = this._canvas.getContext("2d");
		private readonly _previewGraphics: CanvasRenderingContext2D = this._preview.getContext("2d");
		private readonly _editorWidth: number = 512;
		
		private _mouseX: number;
		private _mouseY: number;
		private _editorHeight: number = 20;
		private _mouseDown: boolean = false;
		private _mouseOver: boolean = false;
		private _dragging: boolean = false;
		private _dragStart: number;
		private _barWidth: number;
		
		constructor(private _doc: SongDocument) {
			this._doc.watch(this._documentChanged);
			this._documentChanged();
			
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
			this._updatePreview();
			if (this._mouseX >= this._doc.barScrollPos * this._barWidth && this._mouseX <= (this._doc.barScrollPos + 16) * this._barWidth) {
				this._dragging = true;
				this._dragStart = this._mouseX;
			}
		}
		
		private _onTouchPressed = (event: TouchEvent): void => {
			event.preventDefault();
			this._mouseDown = true;
			const boundingRect: ClientRect = this._canvas.getBoundingClientRect();
			this._mouseX = event.touches[0].clientX - boundingRect.left;
			this._mouseY = event.touches[0].clientY - boundingRect.top;
			this._updatePreview();
			if (this._mouseX >= this._doc.barScrollPos * this._barWidth && this._mouseX <= (this._doc.barScrollPos + 16) * this._barWidth) {
				this._dragging = true;
				this._dragStart = this._mouseX;
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
			if (this._dragging) {
				while (this._mouseX - this._dragStart < -this._barWidth * 0.5) {
					if (this._doc.barScrollPos > 0) {
						this._doc.barScrollPos--;
						this._dragStart -= this._barWidth;
						this._doc.changed();
					} else {
						break;
					}
				}
				while (this._mouseX - this._dragStart > this._barWidth * 0.5) {
					if (this._doc.barScrollPos < this._doc.song.bars - 16) {
						this._doc.barScrollPos++;
						this._dragStart += this._barWidth;
						this._doc.changed();
					} else {
						break;
					}
				}
			}
			this._updatePreview();
		}
		
		private _onCursorReleased = (event: Event): void => {
			if (!this._dragging && this._mouseDown) {
				if (this._mouseX < (this._doc.barScrollPos + 8) * this._barWidth) {
					if (this._doc.barScrollPos > 0) this._doc.barScrollPos--;
					this._doc.changed();
				} else {
					if (this._doc.barScrollPos < this._doc.song.bars - 16) this._doc.barScrollPos++;
					this._doc.changed();
				}
			}
			this._mouseDown = false;
			this._dragging = false;
			this._updatePreview();
		}
		
		private _updatePreview(): void {
			this._previewGraphics.clearRect(0, 0, this._editorWidth, this._editorHeight);
			if (!this._mouseOver || this._mouseDown) return;
			
			const center: number = this._editorHeight * 0.5;
			const base: number = 20;
			const tip: number = 9;
			const arrowHeight: number = 6;
			if (this._mouseX < this._doc.barScrollPos * this._barWidth) {
				this._previewGraphics.fillStyle = "#ffffff";
				this._previewGraphics.beginPath();
				this._previewGraphics.moveTo(tip, center);
				this._previewGraphics.lineTo(base, center + arrowHeight);
				this._previewGraphics.lineTo(base, center - arrowHeight);
				this._previewGraphics.lineTo(tip, center);
				this._previewGraphics.fill();
			} else if (this._mouseX > (this._doc.barScrollPos + 16) * this._barWidth) {
				this._previewGraphics.fillStyle = "#ffffff";
				this._previewGraphics.beginPath();
				this._previewGraphics.moveTo(this._editorWidth - tip, center);
				this._previewGraphics.lineTo(this._editorWidth - base, center + arrowHeight);
				this._previewGraphics.lineTo(this._editorWidth - base, center - arrowHeight);
				this._previewGraphics.lineTo(this._editorWidth - tip, center);
				this._previewGraphics.fill();
			} else {
				this._previewGraphics.lineWidth = 2;
				this._previewGraphics.strokeStyle = "#ffffff";
				this._previewGraphics.strokeRect(this._doc.barScrollPos * this._barWidth, 1, 16 * this._barWidth, this._editorHeight - 2);
			}
		}
		
		private _documentChanged = (): void => {
			this._barWidth = (this._editorWidth-1) / Math.max(16, this._doc.song.bars);
			this._render();
		}
		
		private _render(): void {
			this._graphics.clearRect(0, 0, this._editorWidth, this._editorHeight);
			
			this._graphics.fillStyle = "#444444";
			this._graphics.fillRect(this._barWidth * this._doc.barScrollPos, 2, this._barWidth * 16, this._editorHeight - 4);
			
			for (let i: number = 0; i <= this._doc.song.bars; i++) {
				const lineWidth: number = (i % 16 == 0) ? 2 : 0;
				const lineHeight: number = (i % 16 == 0) ? 0 : ((i % 4 == 0) ? this._editorHeight / 8 : this._editorHeight / 3);
				this._graphics.beginPath();
				this._graphics.strokeStyle = "#444444";
				this._graphics.lineWidth = lineWidth;
				this._graphics.moveTo(i * this._barWidth, lineHeight);
				this._graphics.lineTo(i * this._barWidth, this._editorHeight - lineHeight);
				this._graphics.stroke();
			}
			
			this._updatePreview();
		}
	}
}
