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
	export interface OctaveScrollBar {
	}

	export function OctaveScrollBar(doc: SongDocument): void {
		var preview: HTMLCanvasElement = <HTMLCanvasElement>document.getElementById("octaveScrollBarPreview");
		var previewGraphics: CanvasRenderingContext2D = preview.getContext("2d");
		var mouseX: number;
		var mouseY: number;
		var container: HTMLElement = <HTMLElement>document.getElementById("octaveScrollBarContainer");
		var canvas: HTMLCanvasElement = <HTMLCanvasElement>document.getElementById("octaveScrollBar");
		var graphics: CanvasRenderingContext2D = canvas.getContext("2d");
		var editorWidth: number = 20;
		var editorHeight: number = 481;
		var mouseDown: boolean = false;
		var mouseOver: boolean = false;
		
		var rootHeight: number = 4.0;
		var octaveCount: number = 7;
		var octaveHeight: number;
		var barHeight: number;
		var dragging: boolean = false;
		var dragStart: number;
		var currentOctave: number;
		var barBottom: number;
		
		function onMouseOver(event: MouseEvent): void {
			mouseOver = true;
		}
		
		function onMouseOut(event: MouseEvent): void {
			mouseOver = false;
		}
		
		function onMousePressed(event: MouseEvent): void {
			event.preventDefault();
			mouseDown = true;
			if (doc.channel == 3) return;
			updatePreview();
			
			if (mouseY >= barBottom - barHeight && mouseY <= barBottom) {
				dragging = true;
				dragStart = mouseY;
			}
		}
		
		function onTouchPressed(event: TouchEvent): void {
			event.preventDefault();
			mouseDown = true;
			var boundingRect: ClientRect = canvas.getBoundingClientRect();
			mouseX = event.touches[0].clientX - boundingRect.left;
			mouseY = event.touches[0].clientY - boundingRect.top;
			if (doc.channel == 3) return;
			updatePreview();
			
			if (mouseY >= barBottom - barHeight && mouseY <= barBottom) {
				dragging = true;
				dragStart = mouseY;
			}
		}
		
		function onMouseMoved(event: MouseEvent): void {
			var boundingRect: ClientRect = canvas.getBoundingClientRect();
    		mouseX = (event.clientX || event.pageX) - boundingRect.left;
		    mouseY = (event.clientY || event.pageY) - boundingRect.top;
		    onCursorMoved();
		}
		
		function onTouchMoved(event: TouchEvent): void {
			if (!mouseDown) return;
			event.preventDefault();
			var boundingRect: ClientRect = canvas.getBoundingClientRect();
			mouseX = event.touches[0].clientX - boundingRect.left;
			mouseY = event.touches[0].clientY - boundingRect.top;
		    onCursorMoved();
		}
		
		function onCursorMoved(): void {
			if (doc.channel == 3) return;
			if (dragging) {
				while (mouseY - dragStart < -octaveHeight * 0.5) {
					if (currentOctave < 4) {
						doc.history.record(new ChangeOctave(doc, currentOctave + 1));
						dragStart -= octaveHeight;
					} else {
						break;
					}
				}
				while (mouseY - dragStart > octaveHeight * 0.5) {
					if (currentOctave > 0) {
						doc.history.record(new ChangeOctave(doc, currentOctave - 1));
						dragStart += octaveHeight;
					} else {
						break;
					}
				}
			}
			
			updatePreview();
		}
		
		function onCursorReleased(event: Event): void {
			if (doc.channel != 3 && !dragging && mouseDown) {
				if (mouseY < barBottom - barHeight * 0.5) {
					if (currentOctave < 4) doc.history.record(new ChangeOctave(doc, currentOctave + 1));
				} else {
					if (currentOctave > 0) doc.history.record(new ChangeOctave(doc, currentOctave - 1));
				}
			}
			mouseDown = false;
			dragging = false;
			updatePreview();
		}
		
		function updatePreview(): void {
			previewGraphics.clearRect(0, 0, editorWidth, editorHeight);
			if (doc.channel == 3) return;
			if (!mouseOver || mouseDown) return;
			
			var center: number = editorWidth * 0.5;
			var base: number = 20;
			var tip: number = 9;
			var arrowWidth: number = 6;
			if (mouseY < barBottom - barHeight) {
				previewGraphics.fillStyle = "#ffffff";
				previewGraphics.beginPath();
				previewGraphics.moveTo(center, tip);
				previewGraphics.lineTo(center + arrowWidth, base);
				previewGraphics.lineTo(center - arrowWidth, base);
				previewGraphics.lineTo(center, tip);
				previewGraphics.fill();
			} else if (mouseY > barBottom) {
				previewGraphics.fillStyle = "#ffffff";
				previewGraphics.beginPath();
				previewGraphics.moveTo(center, editorHeight - tip);
				previewGraphics.lineTo(center + arrowWidth, editorHeight - base);
				previewGraphics.lineTo(center - arrowWidth, editorHeight - base);
				previewGraphics.lineTo(center, editorHeight - tip);
				previewGraphics.fill();
			} else {
				previewGraphics.lineWidth = 2;
				previewGraphics.strokeStyle = "#ffffff";
				previewGraphics.strokeRect(1, barBottom, editorWidth - 2, -barHeight);
			}
		}
		
		function documentChanged(): void {
			currentOctave = doc.song.channelOctaves[doc.channel];
			barBottom = editorHeight - (octaveHeight * currentOctave);
			render();
		}
		
		function render(): void {
			//if (preview == null) return;
			//if (stage == null) return;
			
			graphics.clearRect(0, 0, editorWidth, editorHeight);
			
			if (doc.channel != 3) {
				graphics.fillStyle = "#444444";
				graphics.fillRect(2, barBottom, editorWidth - 4, -barHeight);
				
				for (var i: number = 0; i <= octaveCount; i++) {
					graphics.fillStyle = "#886644";
					graphics.fillRect(0, i * octaveHeight, editorWidth, rootHeight);
				}
			}
			
			updatePreview();
		}
		
		//preview = new Sprite();
		//container.addChild(preview);
		doc.watch(documentChanged);
		documentChanged();
		
		octaveHeight = (editorHeight - rootHeight) / octaveCount;
		barHeight = (octaveHeight * 3 + rootHeight);
		
		container.addEventListener("mousedown", onMousePressed);
		document.addEventListener("mousemove", onMouseMoved);
		document.addEventListener("mouseup", onCursorReleased);
		container.addEventListener("mouseover", onMouseOver);
		container.addEventListener("mouseout", onMouseOut);
		
		container.addEventListener("touchstart", onTouchPressed);
		document.addEventListener("touchmove", onTouchMoved);
		document.addEventListener("touchend", onCursorReleased);
		document.addEventListener("touchcancel", onCursorReleased);
	}
}
