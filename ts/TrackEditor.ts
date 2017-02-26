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

"use strict";

module beepbox {
	export class TrackEditor {
		private readonly _barWidth: number = 32;
		private readonly _mainLayer: HTMLSelectElement = <HTMLSelectElement>document.getElementById("mainLayer");
		private readonly _container: HTMLElement = <HTMLElement>document.getElementById("trackEditorContainer");
		private readonly _canvas: HTMLCanvasElement = <HTMLCanvasElement>document.getElementById("trackEditor");
		private readonly _graphics: CanvasRenderingContext2D = this._canvas.getContext("2d");
		private readonly _playhead: HTMLElement = document.getElementById("trackPlayhead");
		private readonly _preview: HTMLCanvasElement = <HTMLCanvasElement>document.getElementById("trackEditorPreview");
		private readonly _previewGraphics: CanvasRenderingContext2D = this._preview.getContext("2d");
		private readonly _editorWidth: number = 512;
		
		private _mouseX: number;
		private _mouseY: number;
		private _pattern: BarPattern;
		private _mouseOver: boolean = false;
		private _digits: string = "";
		private _editorHeight: number = 128;
		private _channelHeight: number = 32;
		
		constructor(private _doc: SongDocument, private _songEditor: SongEditor) {
			this._pattern = this._doc.getCurrentPattern();
			/*
			this._graphics.mozImageSmoothingEnabled = false;
			this._graphics.webkitImageSmoothingEnabled = false;
			this._graphics.msImageSmoothingEnabled = false;
			this._graphics.imageSmoothingEnabled = false;
			*/
			
			this._render();
			this._doc.watch(this._documentChanged);
			
			window.requestAnimationFrame(this._onEnterFrame);
			this._container.addEventListener("mousedown", this._onMousePressed);
			document.addEventListener("mousemove", this._onMouseMoved);
			document.addEventListener("mouseup", this._onMouseReleased);
			this._container.addEventListener("mouseover", this._onMouseOver);
			this._container.addEventListener("mouseout", this._onMouseOut);
			this._mainLayer.addEventListener("keydown", this._onKeyPressed);
			this._mainLayer.addEventListener("keyup", this._onKeyReleased);
		}
		
		private _onEnterFrame = (timestamp: number): void => {
			this._playhead.style.left = (this._barWidth * (this._doc.synth.playhead - this._doc.barScrollPos) - 2) + "px";
			window.requestAnimationFrame(this._onEnterFrame);
		}
		
		private _setChannelBar(channel: number, bar: number): void {
			const oldBarScrollPos: number = this._doc.barScrollPos;
			if (this._doc.history.getRecentChange() instanceof ChangeChannelBar) this._doc.history.undo();
			this._doc.barScrollPos = oldBarScrollPos;
			this._doc.history.record(new ChangeChannelBar(this._doc, channel, bar));
			this._digits = "";
		}
		
		private _setBarPattern(pattern: number): void {
			if (this._doc.history.getRecentChange() instanceof ChangeBarPattern) this._doc.history.undo();
			this._doc.history.record(new ChangeBarPattern(this._doc, pattern));
		}
		
		private _onKeyPressed = (event: KeyboardEvent): void => {
			if (this._songEditor.promptVisible) return;
			//if (event.ctrlKey)
			switch (event.keyCode) {
				case 38: // up
					this._setChannelBar((this._doc.channel + 3) % Music.numChannels, this._doc.bar);
					event.preventDefault();
					break;
				case 40: // down
					this._setChannelBar((this._doc.channel + 1) % Music.numChannels, this._doc.bar);
					event.preventDefault();
					break;
				case 37: // left
					this._setChannelBar(this._doc.channel, (this._doc.bar + this._doc.song.bars - 1) % this._doc.song.bars);
					event.preventDefault();
					break;
				case 39: // right
					this._setChannelBar(this._doc.channel, (this._doc.bar + 1) % this._doc.song.bars);
					event.preventDefault();
					break;
				case 48: // 0
					this._nextDigit("0");
					event.preventDefault();
					break;
				case 49: // 1
					this._nextDigit("1");
					event.preventDefault();
					break;
				case 50: // 2
					this._nextDigit("2");
					event.preventDefault();
					break;
				case 51: // 3
					this._nextDigit("3");
					event.preventDefault();
					break;
				case 52: // 4
					this._nextDigit("4");
					event.preventDefault();
					break;
				case 53: // 5
					this._nextDigit("5");
					event.preventDefault();
					break;
				case 54: // 6
					this._nextDigit("6");
					event.preventDefault();
					break;
				case 55: // 7
					this._nextDigit("7");
					event.preventDefault();
					break;
				case 56: // 8
					this._nextDigit("8");
					event.preventDefault();
					break;
				case 57: // 9
					this._nextDigit("9");
					event.preventDefault();
					break;
				default:
					this._digits = "";
					break;
			}
		}
		
		private _nextDigit(digit: string): void {
			this._digits += digit;
			let parsed: number = parseInt(this._digits);
			if (parsed <= this._doc.song.patterns) {
				this._setBarPattern(parsed);
				return;
			}
				
			this._digits = digit;
			parsed = parseInt(this._digits);
			if (parsed <= this._doc.song.patterns) {
				this._setBarPattern(parsed);
				return;
			}
			
			this._digits = "";
		}
		
		private _onKeyReleased = (event: KeyboardEvent): void => {
		}
		
		private _onMouseOver = (event: MouseEvent): void => {
			this._mouseOver = true;
		}
		
		private _onMouseOut = (event: MouseEvent): void => {
			this._mouseOver = false;
		}
		
		private _onMousePressed = (event: MouseEvent): void => {
			event.preventDefault();
			const channel: number = Math.floor(Math.min(Music.numChannels-1, Math.max(0, this._mouseY / this._channelHeight)));
			const bar: number = Math.floor(Math.min(this._doc.song.bars-1, Math.max(0, this._mouseX / this._barWidth + this._doc.barScrollPos)));
			if (this._doc.channel == channel && this._doc.bar == bar) {
				const up: boolean = (this._mouseY % this._channelHeight) < this._channelHeight / 2;
				const patternCount: number = this._doc.song.channelPatterns[channel].length;
				this._setBarPattern((this._doc.song.channelBars[channel][bar] + (up ? 1 : patternCount)) % (patternCount + 1));
			} else {
				this._setChannelBar(channel, bar);
			}
		}
		
		private _onMouseMoved = (event: MouseEvent): void => {
			const boundingRect: ClientRect = this._canvas.getBoundingClientRect();
    		this._mouseX = (event.clientX || event.pageX) - boundingRect.left;
		    this._mouseY = (event.clientY || event.pageY) - boundingRect.top;
			this._updatePreview();
		}
		
		private _onMouseReleased = (event: MouseEvent): void => {
		}
		
		private _updatePreview(): void {
			this._previewGraphics.clearRect(0, 0, 34, 34);
			if (!this._mouseOver) return;
			
			const channel: number = Math.floor(Math.min(Music.numChannels-1, Math.max(0, this._mouseY / this._channelHeight)));
			const bar: number = Math.floor(Math.min(this._doc.song.bars-1, Math.max(0, this._mouseX / this._barWidth + this._doc.barScrollPos)));
			
			this._preview.style.left = this._barWidth * (bar - this._doc.barScrollPos) + "px";
			this._preview.style.top = this._channelHeight * channel + "px";
			
			const selected: boolean = (bar == this._doc.bar && channel == this._doc.channel);
			if (selected) {
				const up: boolean = (this._mouseY % this._channelHeight) < this._channelHeight / 2;
				const center: number = this._barWidth * 0.8;
				const middle: number = this._channelHeight * 0.5;
				const base: number = this._channelHeight * 0.1;
				const tip: number = this._channelHeight * 0.4;
				const width: number = this._channelHeight * 0.175;
				
				this._previewGraphics.lineWidth = 1;
				this._previewGraphics.strokeStyle = "#000000";
				this._previewGraphics.fillStyle = up ? "#ffffff" : "#000000";
				this._previewGraphics.beginPath();
				this._previewGraphics.moveTo(center, middle - tip);
				this._previewGraphics.lineTo(center + width, middle - base);
				this._previewGraphics.lineTo(center - width, middle - base);
				this._previewGraphics.lineTo(center, middle - tip);
				this._previewGraphics.fill();
				this._previewGraphics.stroke();
				this._previewGraphics.fillStyle = !up ? "#ffffff" : "#000000";
				this._previewGraphics.beginPath();
				this._previewGraphics.moveTo(center, middle + tip);
				this._previewGraphics.lineTo(center + width, middle + base);
				this._previewGraphics.lineTo(center - width, middle + base);
				this._previewGraphics.lineTo(center, middle + tip);
				this._previewGraphics.fill();
				this._previewGraphics.stroke();
			} else {
				this._previewGraphics.lineWidth = 2;
				this._previewGraphics.strokeStyle = "#ffffff";
				this._previewGraphics.strokeRect(1, 1, this._barWidth - 2, this._channelHeight - 2);
			}
		}
		
		private _documentChanged = (): void => {
			this._pattern = this._doc.getCurrentPattern();
			this._editorHeight = this._doc.song.bars > 16 ? 108 : 128;
			this._canvas.height = this._editorHeight;
			this._canvas.style.width = String(this._editorHeight);
			this._channelHeight = this._editorHeight / Music.numChannels;
			this._render();
		}
		
		private _render(): void {
			this._graphics.clearRect(0, 0, this._editorWidth, this._editorHeight);
			
			const renderCount: number = Math.min(16, this._doc.song.bars);
			for (let j: number = 0; j < Music.numChannels; j++) {
				const channelColor: string = SongEditor.channelColorsBright[j];
				const channelDim: string   = SongEditor.channelColorsDim[j];
				for (let i: number = 0; i < renderCount; i++) {
					const pattern: BarPattern = this._doc.song.getPattern(j, i + this._doc.barScrollPos);
					const selected: boolean = (i + this._doc.barScrollPos == this._doc.bar && j == this._doc.channel);
					if (selected || pattern != null) {
						this._graphics.fillStyle = (selected ? channelColor : "#444444");
						this._graphics.fillRect(this._barWidth * i + 1, this._channelHeight * j + 1, this._barWidth - 2, this._channelHeight - 2);
					}
					
					const text = String(this._doc.song.channelBars[j][i + this._doc.barScrollPos]);
					this._graphics.font = "bold 20px sans-serif";
					this._graphics.textAlign = 'center';
					this._graphics.textBaseline = 'middle';
				    this._graphics.fillStyle = selected ? "#000000" : (pattern == null || pattern.tones.length == 0 ? channelDim : channelColor);
				    this._graphics.fillText(text, this._barWidth * (i + 0.5), this._channelHeight * (j + 0.5) + 1.0);
				}
			}
			
			this._updatePreview();
		}
	}
}
