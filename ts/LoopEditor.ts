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

interface Cursor {
	startBar?: number;
	mode?: number;
}

interface Endpoints {
	start?: number;
	length?: number;
}

module beepbox {
	export interface LoopEditor {
	}

	export function LoopEditor(doc: SongDocument): void {
		var barWidth: number = 32;
		var mouseX: number;
		var mouseY: number;
		var container: HTMLElement = <HTMLElement>document.getElementById("loopEditorContainer");
		var canvas: HTMLCanvasElement = <HTMLCanvasElement>document.getElementById("loopEditor");
		var graphics: CanvasRenderingContext2D = canvas.getContext("2d");
		var preview: HTMLCanvasElement = <HTMLCanvasElement>document.getElementById("loopEditorPreview");
		var previewGraphics: CanvasRenderingContext2D = preview.getContext("2d");
		var editorWidth: number = 512;
		var editorHeight: number = 20;
		
		var startMode:   number = 0;
		var endMode:     number = 1;
		var bothMode:    number = 2;
		
		var change: ChangeLoop;
		
		var cursor: Cursor = {};
		var mouseDown: boolean = false;
		var mouseOver: boolean = false;
		
		function updateCursorStatus(): void {
			var bar: number = mouseX / barWidth + doc.barScrollPos;
			cursor.startBar = bar;
			
			if (bar > doc.song.loopStart - 0.25 && bar < doc.song.loopStart + doc.song.loopLength + 0.25) {
				if (bar - doc.song.loopStart < doc.song.loopLength * 0.5) {
					cursor.mode = startMode;
				} else {
					cursor.mode = endMode;
				}
			} else {
				cursor.mode = bothMode;
			}
		}
		
		function findEndPoints(middle: number): Endpoints {
			var start: number = Math.round(middle - doc.song.loopLength / 2);
			var end: number = start + doc.song.loopLength;
			if (start < 0) {
				end -= start;
				start = 0;
			}
			if (end > doc.song.bars) {
				start -= end - doc.song.bars;
				end = doc.song.bars;
			}
			return {start: start, length: end - start};
		}
		
		function onKeyPressed(event: KeyboardEvent): void {
			//if (event.ctrlKey)
			/*
			switch (event.keyCode) {
				case 38: // up
					setChannelBar((doc.channel + 2) % 3, doc.bar);
					break;
			}
			*/
		}
		
		function onKeyReleased(event: KeyboardEvent): void {
		}
		
		function onMouseOver(event: MouseEvent): void {
			mouseOver = true;
		}
		
		function onMouseOut(event: MouseEvent): void {
			mouseOver = false;
		}
		
		function onMousePressed(event: MouseEvent): void {
			event.preventDefault();
			mouseDown = true;
			updateCursorStatus();
			updatePreview();
			onMouseMoved(event);
		}
		
		function onMouseMoved(event: MouseEvent): void {
			var boundingRect: ClientRect = canvas.getBoundingClientRect();
    		mouseX = (event.clientX || event.pageX) - boundingRect.left;
		    mouseY = (event.clientY || event.pageY) - boundingRect.top;
			if (mouseDown) {
				if (change != null) change.undo();
				change = null;
				
				var bar: number = mouseX / barWidth + doc.barScrollPos;
				var start: number;
				var end: number;
				var temp: number;
				if (cursor.mode == startMode) {
					start = doc.song.loopStart + Math.round(bar - cursor.startBar);
					end = doc.song.loopStart + doc.song.loopLength;
					if (start == end) {
						start = end - 1;
					} else if (start > end) {
						temp = start;
						start = end;
						end = temp;
					}
					if (start < 0) start = 0;
					if (end >= doc.song.bars) end = doc.song.bars;
					change = new ChangeLoop(doc, start, end - start);
				} else if (cursor.mode == endMode) {
					start = doc.song.loopStart;
					end = doc.song.loopStart + doc.song.loopLength + Math.round(bar - cursor.startBar);
					if (end == start) {
						end = start + 1;
					} else if (end < start) {
						temp = start;
						start = end;
						end = temp;
					}
					if (start < 0) start = 0;
					if (end >= doc.song.bars) end = doc.song.bars;
					change = new ChangeLoop(doc, start, end - start);
				} else if (cursor.mode == bothMode) {
					var endPoints: Endpoints = findEndPoints(bar);
					change = new ChangeLoop(doc, endPoints.start, endPoints.length);
				}
			} else {
				updateCursorStatus();
				updatePreview();
			}
		}
		
		function onMouseReleased(event: MouseEvent): void {
			if (mouseDown) {
				if (change != null) {
					//if (doc.history.getRecentChange() is ChangeLoop) doc.history.undo();
					doc.history.record(change);
					change = null;
				}
			}
			
			mouseDown = false;
			updateCursorStatus();
			render();
		}
		
		function updatePreview(): void {
			previewGraphics.clearRect(0, 0, editorWidth, editorHeight);
			if (!mouseOver || mouseDown) return;
			
			var radius: number = editorHeight / 2;
			if (cursor.mode == startMode) {
				previewGraphics.fillStyle = "#ffffff";
				previewGraphics.beginPath();
				previewGraphics.arc((doc.song.loopStart - doc.barScrollPos) * barWidth + radius, radius, radius - 4, 0, 2 * Math.PI);
				previewGraphics.fill();
			} else if (cursor.mode == endMode) {
				previewGraphics.fillStyle = "#ffffff";
				previewGraphics.beginPath();
				previewGraphics.arc((doc.song.loopStart + doc.song.loopLength - doc.barScrollPos) * barWidth - radius, radius, radius - 4, 0, 2 * Math.PI);
				previewGraphics.fill();
			} else if (cursor.mode == bothMode) {
				var endPoints: Endpoints = findEndPoints(cursor.startBar);
				previewGraphics.fillStyle = "#ffffff";
				previewGraphics.beginPath();
				previewGraphics.arc((endPoints.start - doc.barScrollPos) * barWidth + radius, radius, radius - 4, 0, 2 * Math.PI);
				previewGraphics.fill();
				previewGraphics.fillStyle = "#ffffff";
				previewGraphics.fillRect((endPoints.start - doc.barScrollPos) * barWidth + radius, 4, endPoints.length * barWidth - editorHeight, editorHeight - 8);
				previewGraphics.fillStyle = "#ffffff";
				previewGraphics.beginPath();
				previewGraphics.arc((endPoints.start + endPoints.length - doc.barScrollPos) * barWidth - radius, radius, radius - 4, 0, 2 * Math.PI);
				previewGraphics.fill();
			}
		}
		
		function documentChanged(): void {
			render();
		}
		
		function render(): void {
			graphics.clearRect(0, 0, editorWidth, editorHeight);
			
			var radius: number = editorHeight / 2;
			graphics.fillStyle = "#7744ff";
			graphics.beginPath();
			graphics.arc((doc.song.loopStart - doc.barScrollPos) * barWidth + radius, radius, radius, 0, 2 * Math.PI);
			graphics.fill();
			graphics.fillRect((doc.song.loopStart - doc.barScrollPos) * barWidth + radius, 0, doc.song.loopLength * barWidth - editorHeight, editorHeight);
			graphics.beginPath();
			graphics.arc((doc.song.loopStart + doc.song.loopLength - doc.barScrollPos) * barWidth - radius, radius, radius, 0, 2 * Math.PI);
			graphics.fill();
			graphics.fillStyle = "#000000";
			graphics.beginPath();
			graphics.arc((doc.song.loopStart - doc.barScrollPos) * barWidth + radius, radius, radius - 4, 0, 2 * Math.PI);
			graphics.fill();
			graphics.fillRect((doc.song.loopStart - doc.barScrollPos) * barWidth + radius, 4, doc.song.loopLength * barWidth - editorHeight, editorHeight - 8);
			graphics.beginPath();
			graphics.arc((doc.song.loopStart + doc.song.loopLength - doc.barScrollPos) * barWidth - radius, radius, radius - 4, 0, 2 * Math.PI);
			graphics.fill();
			
			updatePreview();
		}
		
		updateCursorStatus();
		render();
		doc.watch(documentChanged);
		
		container.addEventListener("mousedown", onMousePressed);
		document.addEventListener("mousemove", onMouseMoved);
		document.addEventListener("mouseup", onMouseReleased);
		container.addEventListener("mouseover", onMouseOver);
		container.addEventListener("mouseout", onMouseOut);
		document.addEventListener("keydown", onKeyPressed);
		document.addEventListener("keyup", onKeyReleased);
	}
}
