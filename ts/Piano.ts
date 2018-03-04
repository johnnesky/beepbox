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

namespace beepbox {
	let loadedCount: number = 0;
	let finishedLoadingImages: boolean = false;
	function onLoaded(): void {
		loadedCount++;
		finishedLoadingImages = true;
	}
	
	const BlackKey: HTMLImageElement = document.createElement("img");
	BlackKey.onload = onLoaded;
	BlackKey.src = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAANCAIAAABHKvtLAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyJpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuMC1jMDYwIDYxLjEzNDc3NywgMjAxMC8wMi8xMi0xNzozMjowMCAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENTNSBNYWNpbnRvc2giIHhtcE1NOkluc3RhbmNlSUQ9InhtcC5paWQ6NEU3RTM2RTg0NzBEMTFFMTgyMjBBREEyQTVGRDY5MjIiIHhtcE1NOkRvY3VtZW50SUQ9InhtcC5kaWQ6NEU3RTM2RTk0NzBEMTFFMTgyMjBBREEyQTVGRDY5MjIiPiA8eG1wTU06RGVyaXZlZEZyb20gc3RSZWY6aW5zdGFuY2VJRD0ieG1wLmlpZDozMzYxN0U3RDQ3MEQxMUUxODIyMEFEQTJBNUZENjkyMiIgc3RSZWY6ZG9jdW1lbnRJRD0ieG1wLmRpZDozMzYxN0U3RTQ3MEQxMUUxODIyMEFEQTJBNUZENjkyMiIvPiA8L3JkZjpEZXNjcmlwdGlvbj4gPC9yZGY6UkRGPiA8L3g6eG1wbWV0YT4gPD94cGFja2V0IGVuZD0iciI/PomGIaQAAABgSURBVHjaYpSWlmZhYWFmZgaSTExMQAYTGGAyIICRkRFIMhANWISFhdlggAUHANrBysoKNBfuCGKMvnjx4r59+xhp5wOg6UCSBM+SB0YtGLVgCFgAzDeMeOSGgAUAAQYAGgwJrOg8pdQAAAAASUVORK5CYII=";
	const BlackKeyDisabled: HTMLImageElement = document.createElement("img");
	BlackKeyDisabled.onload = onLoaded;
	BlackKeyDisabled.src = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAANCAIAAABHKvtLAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyJpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuMC1jMDYwIDYxLjEzNDc3NywgMjAxMC8wMi8xMi0xNzozMjowMCAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENTNSBNYWNpbnRvc2giIHhtcE1NOkluc3RhbmNlSUQ9InhtcC5paWQ6NEU3RTM2RUM0NzBEMTFFMTgyMjBBREEyQTVGRDY5MjIiIHhtcE1NOkRvY3VtZW50SUQ9InhtcC5kaWQ6NEU3RTM2RUQ0NzBEMTFFMTgyMjBBREEyQTVGRDY5MjIiPiA8eG1wTU06RGVyaXZlZEZyb20gc3RSZWY6aW5zdGFuY2VJRD0ieG1wLmlpZDo0RTdFMzZFQTQ3MEQxMUUxODIyMEFEQTJBNUZENjkyMiIgc3RSZWY6ZG9jdW1lbnRJRD0ieG1wLmRpZDo0RTdFMzZFQjQ3MEQxMUUxODIyMEFEQTJBNUZENjkyMiIvPiA8L3JkZjpEZXNjcmlwdGlvbj4gPC9yZGY6UkRGPiA8L3g6eG1wbWV0YT4gPD94cGFja2V0IGVuZD0iciI/PhURscAAAAB1SURBVHja7NPBCoAgDAZgnaMX8Oj7P2KKldXPhiR4CwwCv4PInPvxoA0hMLNzDisRYUPCCiMucVallJzzJnaBih5pp2mw936puKEZ2qQ3MeUQmLiKGGNKCZ1IQr2fDnb0C8gMNgNmwA8Cnt/0Tv91vw64BRgALUuP70jrlrwAAAAASUVORK5CYII=";
	const WhiteKey: HTMLImageElement = document.createElement("img");
	WhiteKey.onload = onLoaded;
	WhiteKey.src = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAANCAIAAABHKvtLAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyJpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuMC1jMDYwIDYxLjEzNDc3NywgMjAxMC8wMi8xMi0xNzozMjowMCAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENTNSBNYWNpbnRvc2giIHhtcE1NOkluc3RhbmNlSUQ9InhtcC5paWQ6MzM2MTdFNzc0NzBEMTFFMTgyMjBBREEyQTVGRDY5MjIiIHhtcE1NOkRvY3VtZW50SUQ9InhtcC5kaWQ6MzM2MTdFNzg0NzBEMTFFMTgyMjBBREEyQTVGRDY5MjIiPiA8eG1wTU06RGVyaXZlZEZyb20gc3RSZWY6aW5zdGFuY2VJRD0ieG1wLmlpZDozMzYxN0U3NTQ3MEQxMUUxODIyMEFEQTJBNUZENjkyMiIgc3RSZWY6ZG9jdW1lbnRJRD0ieG1wLmRpZDozMzYxN0U3NjQ3MEQxMUUxODIyMEFEQTJBNUZENjkyMiIvPiA8L3JkZjpEZXNjcmlwdGlvbj4gPC9yZGY6UkRGPiA8L3g6eG1wbWV0YT4gPD94cGFja2V0IGVuZD0iciI/PgBmMXoAAACTSURBVHja7JQ7CgMhGIT3920M2Hko7+RJPYWViE0myi5sEXAhKQL7FcP8PmawkWKMjx2llNb60MNIKY0xnPPphRDbMsJ7/xw458wAodZa6PRQ5GIF0RjlYCU655xSEqWU3ntrrdb63RcgHcq2H3MX3AV/UEAhBL7DBkTEzmAFuzSY44UC/BDHtU+8z539esFLgAEAkZ4XCDjZXPEAAAAASUVORK5CYII=";
	const WhiteKeyDisabled: HTMLImageElement = document.createElement("img");
	WhiteKeyDisabled.onload = onLoaded;
	WhiteKeyDisabled.src = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAANCAIAAABHKvtLAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyJpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuMC1jMDYwIDYxLjEzNDc3NywgMjAxMC8wMi8xMi0xNzozMjowMCAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENTNSBNYWNpbnRvc2giIHhtcE1NOkluc3RhbmNlSUQ9InhtcC5paWQ6MzM2MTdFN0I0NzBEMTFFMTgyMjBBREEyQTVGRDY5MjIiIHhtcE1NOkRvY3VtZW50SUQ9InhtcC5kaWQ6MzM2MTdFN0M0NzBEMTFFMTgyMjBBREEyQTVGRDY5MjIiPiA8eG1wTU06RGVyaXZlZEZyb20gc3RSZWY6aW5zdGFuY2VJRD0ieG1wLmlpZDozMzYxN0U3OTQ3MEQxMUUxODIyMEFEQTJBNUZENjkyMiIgc3RSZWY6ZG9jdW1lbnRJRD0ieG1wLmRpZDozMzYxN0U3QTQ3MEQxMUUxODIyMEFEQTJBNUZENjkyMiIvPiA8L3JkZjpEZXNjcmlwdGlvbj4gPC9yZGY6UkRGPiA8L3g6eG1wbWV0YT4gPD94cGFja2V0IGVuZD0iciI/PlZjoH4AAADHSURBVHja7JTNDoMgEIRBGq21iTcfyvd/DeNvJBYBp7uFEE+99NDE70AMMDPLYZRt2z4CeZ4XRcFrRkgphRD7vnvvX8RGdF03DEPf99M0LcuitcamMcZa6wkRuNV1/SSqqroTcC/LEu5KKQ6AEhq21oRzDl5bAME8DUjd3wHjOELPyu9fgNnneV7XNQ6OyNPsTCZ+zBVwBfxBgGyaRgViuWIt+ZIPuAAaZwh00BKxaKeuSfwhUsfI55g+WOMT2DEl3jm94BBgAAtY6T6d3wTNAAAAAElFTkSuQmCC";
	const Drum: HTMLImageElement = document.createElement("img");
	Drum.onload = onLoaded;
	Drum.src = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAArCAIAAACW3x1gAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAA2ZpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuMC1jMDYwIDYxLjEzNDc3NywgMjAxMC8wMi8xMi0xNzozMjowMCAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wTU09Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9tbS8iIHhtbG5zOnN0UmVmPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvc1R5cGUvUmVzb3VyY2VSZWYjIiB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iIHhtcE1NOk9yaWdpbmFsRG9jdW1lbnRJRD0ieG1wLmRpZDowMTgwMTE3NDA3MjA2ODExOUJCOEEzOUJCMkI3MTdFNCIgeG1wTU06RG9jdW1lbnRJRD0ieG1wLmRpZDo5NzVEOTA1QzQ5MjMxMUUxOTM3RDhDNEI4QkIxQkFCNSIgeG1wTU06SW5zdGFuY2VJRD0ieG1wLmlpZDo5NzVEOTA1QjQ5MjMxMUUxOTM3RDhDNEI4QkIxQkFCNSIgeG1wOkNyZWF0b3JUb29sPSJBZG9iZSBQaG90b3Nob3AgQ1M1IE1hY2ludG9zaCI+IDx4bXBNTTpEZXJpdmVkRnJvbSBzdFJlZjppbnN0YW5jZUlEPSJ4bXAuaWlkOjAxODAxMTc0MDcyMDY4MTE5QkI4QTM5QkIyQjcxN0U0IiBzdFJlZjpkb2N1bWVudElEPSJ4bXAuZGlkOjAxODAxMTc0MDcyMDY4MTE5QkI4QTM5QkIyQjcxN0U0Ii8+IDwvcmRmOkRlc2NyaXB0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";
	
	export class Piano {
		private readonly _canvas: HTMLCanvasElement = html.canvas({width: "32", height: "481", style: "width: 100%; height: 100%;"});
		private readonly _preview: HTMLCanvasElement = html.canvas({width: "32", height: "40"});
		public readonly container: HTMLDivElement = html.div({style: "width: 32px; height: 100%; overflow:hidden; position: relative; flex-shrink: 0; touch-action: none;"}, [
			this._canvas,
			this._preview,
		]);
		private readonly _graphics: CanvasRenderingContext2D = this._canvas.getContext("2d")!;
		private readonly _previewGraphics: CanvasRenderingContext2D = this._preview.getContext("2d")!;
		private readonly _editorWidth: number = 32;
		private readonly _editorHeight: number = 481;
		
		private _pitchHeight: number;
		private _pitchCount: number;
		private _mouseX: number = 0;
		private _mouseY: number = 0;
		private _mouseDown: boolean = false;
		private _mouseOver: boolean = false;
		private _cursorPitch: number;
		private _renderedScale: number = -1;
		private _renderedDrums: boolean = false;
		private _renderedKey: number = -1;
		
		constructor(private _doc: SongDocument) {
			this._doc.notifier.watch(this._documentChanged);
			this._documentChanged();
			
			this.container.addEventListener("mousedown", this._whenMousePressed);
			document.addEventListener("mousemove", this._whenMouseMoved);
			document.addEventListener("mouseup", this._whenMouseReleased);
			this.container.addEventListener("mouseover", this._whenMouseOver);
			this.container.addEventListener("mouseout", this._whenMouseOut);
			
			this.container.addEventListener("touchstart", this._whenTouchPressed);
			this.container.addEventListener("touchmove", this._whenTouchMoved);
			this.container.addEventListener("touchend", this._whenTouchReleased);
			this.container.addEventListener("touchcancel", this._whenTouchReleased);
		}
		
		private _updateCursorPitch(): void {
			const scale: ReadonlyArray<boolean> = Config.scaleFlags[this._doc.song.scale];
			const mousePitch: number = Math.max(0, Math.min(this._pitchCount-1, this._pitchCount - (this._mouseY / this._pitchHeight)));
			if (scale[Math.floor(mousePitch) % 12] || this._doc.song.getChannelIsDrum(this._doc.channel)) {
				this._cursorPitch = Math.floor(mousePitch);
			} else {
				let topPitch: number = Math.floor(mousePitch) + 1;
				let bottomPitch: number = Math.floor(mousePitch) - 1;
				while (!scale[topPitch % 12]) {
					topPitch++;
				}
				while (!scale[(bottomPitch) % 12]) {
					bottomPitch--;
				}
				let topRange: number = topPitch;
				let bottomRange: number = bottomPitch + 1;
				if (topPitch % 12 == 0 || topPitch % 12 == 7) {
					topRange -= 0.5;
				}
				if (bottomPitch % 12 == 0 || bottomPitch % 12 == 7) {
					bottomRange += 0.5;
				}
				this._cursorPitch = mousePitch - bottomRange > topRange - mousePitch ? topPitch : bottomPitch;
			}
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
			const boundingRect: ClientRect = this._canvas.getBoundingClientRect();
    		this._mouseX = (event.clientX || event.pageX) - boundingRect.left;
		    this._mouseY = ((event.clientY || event.pageY) - boundingRect.top) * this._editorHeight / (boundingRect.bottom - boundingRect.top);
		    if (isNaN(this._mouseY)) this._mouseY = 0;
			this._doc.synth.pianoPressed = true;
			this._updatePreview();
		}
		
		private _whenMouseMoved = (event: MouseEvent): void => {
			const boundingRect: ClientRect = this._canvas.getBoundingClientRect();
    		this._mouseX = (event.clientX || event.pageX) - boundingRect.left;
		    this._mouseY = ((event.clientY || event.pageY) - boundingRect.top) * this._editorHeight / (boundingRect.bottom - boundingRect.top);
		    if (isNaN(this._mouseY)) this._mouseY = 0;
			this._updateCursorPitch();
			this._doc.synth.pianoPitch[0] = this._cursorPitch + this._doc.song.channels[this._doc.channel].octave * 12;
			this._updatePreview();
		}
		
		private _whenMouseReleased = (event: MouseEvent): void => {
			this._mouseDown = false;
			this._doc.synth.pianoPressed = false;
			this._updatePreview();
		}
		
		private _whenTouchPressed = (event: TouchEvent): void => {
			event.preventDefault();
			this._mouseDown = true;
			const boundingRect: ClientRect = this._canvas.getBoundingClientRect();
			this._mouseX = event.touches[0].clientX - boundingRect.left;
			this._mouseY = (event.touches[0].clientY - boundingRect.top) * this._editorHeight / (boundingRect.bottom - boundingRect.top);
		    if (isNaN(this._mouseY)) this._mouseY = 0;
			this._updateCursorPitch();
			this._doc.synth.pianoPressed = true;
			this._doc.synth.pianoPitch[0] = this._cursorPitch + this._doc.song.channels[this._doc.channel].octave * 12;
		}
		
		private _whenTouchMoved = (event: TouchEvent): void => {
			event.preventDefault();
			const boundingRect: ClientRect = this._canvas.getBoundingClientRect();
			this._mouseX = event.touches[0].clientX - boundingRect.left;
			this._mouseY = (event.touches[0].clientY - boundingRect.top) * this._editorHeight / (boundingRect.bottom - boundingRect.top);
		    if (isNaN(this._mouseY)) this._mouseY = 0;
			this._updateCursorPitch();
			this._doc.synth.pianoPitch[0] = this._cursorPitch + this._doc.song.channels[this._doc.channel].octave * 12;
		}
		
		private _whenTouchReleased = (event: TouchEvent): void => {
			event.preventDefault();
			this._doc.synth.pianoPressed = false;
		}
		
		private _updatePreview(): void {
			this._preview.style.visibility = (!this._mouseOver || this._mouseDown) ? "hidden" : "visible";
			if (!this._mouseOver || this._mouseDown) return;
			this._previewGraphics.clearRect(0, 0, 32, 40);
			this._preview.style.left = "0px";
			this._preview.style.top = this._pitchHeight * (this._pitchCount - this._cursorPitch - 1) + "px";
			this._previewGraphics.lineWidth = 2;
			this._previewGraphics.strokeStyle = "#ffffff";
			this._previewGraphics.strokeRect(1, 1, this._editorWidth - 2, this._pitchHeight - 2);
		}
		
		private _documentChanged = (): void => {
			const isDrum: boolean = this._doc.song.getChannelIsDrum(this._doc.channel);
			this._pitchHeight = isDrum ? 40 : 13;
			this._pitchCount = isDrum ? Config.drumCount : Config.pitchCount;
			this._updateCursorPitch();
			this._doc.synth.pianoPitch[0] = this._cursorPitch + this._doc.song.channels[this._doc.channel].octave * 12;
			this._doc.synth.pianoChannel = this._doc.channel;
			this._render();
		}
		
		private _render = (): void => {
			if (!finishedLoadingImages) {
				window.requestAnimationFrame(this._render);
				return;
			}
			
			if (!this._doc.showLetters) return;
			
			const isDrum = this._doc.song.getChannelIsDrum(this._doc.channel);
			if (this._renderedScale == this._doc.song.scale && this._renderedKey == this._doc.song.key && this._renderedDrums == isDrum) return;
			this._renderedScale = this._doc.song.scale;
			this._renderedKey = this._doc.song.key;
			this._renderedDrums = isDrum;
			
			this._graphics.clearRect(0, 0, this._editorWidth, this._editorHeight);
			
			let key: HTMLImageElement;
			for (let j: number = 0; j < this._pitchCount; j++) {
				const pitchNameIndex: number = (j + Config.keyTransposes[this._doc.song.key]) % 12;
				if (isDrum) {
					key = Drum;
					const scale: number = 1.0 - ( j / this._pitchCount ) * 0.35;
					const offset: number = (1.0 - scale) * 0.5;
					const x: number = key.width * offset;
					const y: number = key.height * offset + this._pitchHeight * (this._pitchCount - j - 1);
					const w: number = key.width * scale;
					const h: number = key.height * scale;
				    this._graphics.drawImage(key, x, y, w, h);
				    
					const brightness: number = 1.0 + ((j - this._pitchCount / 2.0) / this._pitchCount) * 0.5;
					const imageData: ImageData = this._graphics.getImageData(x, y, w, h);
					const data: Uint8ClampedArray = imageData.data;
					for(let i = 0; i < data.length; i += 4) {
						data[i + 0] *= brightness;
						data[i + 1] *= brightness;
						data[i + 2] *= brightness;
					}
					this._graphics.putImageData(imageData, x, y);
				} else if (!Config.scaleFlags[this._doc.song.scale][j%12]) {
					key = Config.pianoScaleFlags[pitchNameIndex] ? WhiteKeyDisabled : BlackKeyDisabled;
				    this._graphics.drawImage(key, 0, this._pitchHeight * (this._pitchCount - j - 1));
				} else {
					let text: string | null = Config.pitchNames[pitchNameIndex];
					
					if (text == null) {
						const shiftDir: number = Config.blackKeyNameParents[j%12];
						text = Config.pitchNames[(pitchNameIndex + 12 + shiftDir) % 12]!;
						if (shiftDir == 1) {
							text += "♭";
						} else if (shiftDir == -1) {
							text += "♯";
						}
					}
					
					const textColor: string = Config.pianoScaleFlags[pitchNameIndex] ? "#000000" : "#ffffff";
					key = Config.pianoScaleFlags[pitchNameIndex] ? WhiteKey : BlackKey;
				    this._graphics.drawImage(key, 0, this._pitchHeight * (this._pitchCount - j - 1));
					this._graphics.font = "bold 11px sans-serif";
				    this._graphics.fillStyle = textColor;
				    this._graphics.fillText(text, 15, this._pitchHeight * (this._pitchCount - j) - 3);
				}
			}
			this._updatePreview();
		}
	}
}
