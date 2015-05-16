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
	export interface BarScrollBar {
	}

	export function BarScrollBar(doc: SongDocument): void {
		var preview: HTMLCanvasElement = <HTMLCanvasElement>document.getElementById("barScrollBarPreview");
		var previewGraphics: CanvasRenderingContext2D = preview.getContext("2d");
		var mouseX: number;
		var mouseY: number;
		var container: HTMLElement = <HTMLElement>document.getElementById("barScrollBarContainer");
		var canvas: HTMLCanvasElement = <HTMLCanvasElement>document.getElementById("barScrollBar");
		var graphics: CanvasRenderingContext2D = canvas.getContext("2d");
		var editorWidth: number = 512;
		var editorHeight: number = 20;
		var mouseDown: boolean = false;
		var mouseOver: boolean = false;
		var dragging: boolean = false;
		var dragStart: number;
		
		var barWidth: number;
		
		function onMouseOver(event: MouseEvent): void {
			mouseOver = true;
		}
		
		function onMouseOut(event: MouseEvent): void {
			mouseOver = false;
		}
		
		function onMousePressed(event: MouseEvent): void {
			mouseDown = true;
			updatePreview();
			if (mouseX >= doc.barScrollPos * barWidth && mouseX <= (doc.barScrollPos + 16) * barWidth) {
				dragging = true;
				dragStart = mouseX;
			}
		}
		
		function onMouseMoved(event: MouseEvent): void {
			var boundingRect: ClientRect = canvas.getBoundingClientRect();
    		mouseX = (event.clientX || event.pageX) - boundingRect.left;
		    mouseY = (event.clientY || event.pageY) - boundingRect.top;
			if (dragging) {
				while (mouseX - dragStart < -barWidth * 0.5) {
					if (doc.barScrollPos > 0) {
						doc.barScrollPos--;
						dragStart -= barWidth;
						doc.changed();
					} else {
						break;
					}
				}
				while (mouseX - dragStart > barWidth * 0.5) {
					if (doc.barScrollPos < doc.song.bars - 16) {
						doc.barScrollPos++;
						dragStart += barWidth;
						doc.changed();
					} else {
						break;
					}
				}
			}
			updatePreview();
		}
		
		function onMouseReleased(event: MouseEvent): void {
			if (!dragging && mouseDown) {
				if (mouseX < (doc.barScrollPos + 8) * barWidth) {
					if (doc.barScrollPos > 0) doc.barScrollPos--;
					doc.changed();
				} else {
					if (doc.barScrollPos < doc.song.bars - 16) doc.barScrollPos++;
					doc.changed();
				}
			}
			mouseDown = false;
			dragging = false;
			updatePreview();
		}
		
		function updatePreview(): void {
			previewGraphics.clearRect(0, 0, editorWidth, editorHeight);
			if (!mouseOver || mouseDown) return;
			
			var center: number = editorHeight * 0.5;
			var base: number = 20;
			var tip: number = 9;
			var arrowHeight: number = 6;
			if (mouseX < doc.barScrollPos * barWidth) {
				previewGraphics.fillStyle = "#ffffff";
				previewGraphics.beginPath();
				previewGraphics.moveTo(tip, center);
				previewGraphics.lineTo(base, center + arrowHeight);
				previewGraphics.lineTo(base, center - arrowHeight);
				previewGraphics.lineTo(tip, center);
				previewGraphics.fill();
			} else if (mouseX > (doc.barScrollPos + 16) * barWidth) {
				previewGraphics.fillStyle = "#ffffff";
				previewGraphics.beginPath();
				previewGraphics.moveTo(editorWidth - tip, center);
				previewGraphics.lineTo(editorWidth - base, center + arrowHeight);
				previewGraphics.lineTo(editorWidth - base, center - arrowHeight);
				previewGraphics.lineTo(editorWidth - tip, center);
				previewGraphics.fill();
			} else {
				previewGraphics.lineWidth = 2;
				previewGraphics.strokeStyle = "#ffffff";
				previewGraphics.strokeRect(doc.barScrollPos * barWidth, 1, 16 * barWidth, editorHeight - 2);
			}
		}
		
		function documentChanged(): void {
			barWidth = (editorWidth-1) / Math.max(16, doc.song.bars);
			render();
		}
		
		function render(): void {
			graphics.clearRect(0, 0, editorWidth, editorHeight);
			
			graphics.fillStyle = "#444444";
			graphics.fillRect(barWidth * doc.barScrollPos, 2, barWidth * 16, editorHeight - 4);
			
			for (var i: number = 0; i <= doc.song.bars; i++) {
				var lineWidth: number = (i % 16 == 0) ? 2 : 0;
				var lineHeight: number = (i % 16 == 0) ? 0 : ((i % 4 == 0) ? editorHeight / 8 : editorHeight / 3);
				graphics.beginPath();
				graphics.strokeStyle = "#444444";
				graphics.lineWidth = lineWidth;
				graphics.moveTo(i * barWidth, lineHeight);
				graphics.lineTo(i * barWidth, editorHeight - lineHeight);
				graphics.stroke();
			}
			
			updatePreview();
		}
		
		doc.watch(documentChanged);
		documentChanged();
		
		container.addEventListener("mousedown", onMousePressed);
		document.addEventListener("mousemove", onMouseMoved);
		document.addEventListener("mouseup", onMouseReleased);
		container.addEventListener("mouseover", onMouseOver);
		container.addEventListener("mouseout", onMouseOut);
	}
}
