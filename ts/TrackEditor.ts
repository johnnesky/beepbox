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

module beepbox {
	class Box {
		private readonly _text: Text = html.text("1");
		private readonly _label = <SVGTextElement> svgElement("text", {x: 16, y: 23, "font-family": "sans-serif", "font-size": 20, "text-anchor": "middle", "font-weight": "bold", fill: "red"}, [this._text]);
		private readonly _rect = <SVGRectElement> svgElement("rect", {width: 30, height: 30, x: 1, y: 1});
		public readonly container = <SVGSVGElement> svgElement("svg", undefined, [this._rect, this._label]);
		private _renderedIndex: number = 1;
		private _renderedDim: boolean = false;
		private _renderedSelected: boolean = false;
		constructor(channel: number, x: number, y: number) {
			this.container.setAttribute("x", "" + (x * 32));
			this.container.setAttribute("y", "" + (y * 32));
			this._rect.setAttribute("fill", "#444444");
			this._label.setAttribute("fill", SongEditor.channelColorsDim[y]);
		}
		
		public setSquashed(squashed: boolean, y: number): void {
			if (squashed) {
				this.container.setAttribute("y", "" + (y * 27));
				this._rect.setAttribute("height", "" + 25);
				this._label.setAttribute("y", "" + 21);
			} else {
				this.container.setAttribute("y", "" + (y * 32));
				this._rect.setAttribute("height", "" + 30);
				this._label.setAttribute("y", "" + 23);
			}
		}
		
		public setIndex(index: number, dim: boolean, selected: boolean, y: number): void {
			if (this._renderedIndex != index) {
				if (!this._renderedSelected && ((index == 0) != (this._renderedIndex == 0))) {
					this._rect.setAttribute("fill", (index == 0) ? "#000000" : "#444444");
				}
			
				this._renderedIndex = index;
				this._text.data = ""+index;
			}
			
			if (this._renderedDim != dim) {
				this._renderedDim = dim;
				if (selected) {
					this._label.setAttribute("fill", "#000000");
				} else {
					this._label.setAttribute("fill", dim ? SongEditor.channelColorsDim[y] : SongEditor.channelColorsBright[y]);
				}
			}
			
			if (this._renderedSelected != selected) {
				this._renderedSelected = selected;
				if (selected) {
					this._rect.setAttribute("fill", SongEditor.channelColorsBright[y]);
					this._label.setAttribute("fill", "#000000");
				} else {
					this._rect.setAttribute("fill", (this._renderedIndex == 0) ? "#000000" : "#444444");
					this._label.setAttribute("fill", dim ? SongEditor.channelColorsDim[y] : SongEditor.channelColorsBright[y]);
				}
			}
		}
	}
	
	export class TrackEditor {
		private readonly _editorWidth: number = 512;
		private readonly _barWidth: number = 32;
		private readonly _svg = <SVGSVGElement> svgElement("svg", {style: "background-color: #000000; position: absolute;", width: this._editorWidth, height: 128});
		public readonly container: HTMLElement = html.div({style: "width: 512px; height: 128px; position: relative; overflow:hidden;"}, [this._svg]);
		
		private readonly _playhead = <SVGRectElement> svgElement("rect", {fill: "white", x: 0, y: 0, width: 4, height: 128});
		private readonly _boxHighlight = <SVGRectElement> svgElement("rect", {fill: "none", stroke: "white", "stroke-width": 2, "pointer-events": "none", x: 1, y: 1, width: 30, height: 30});
		private readonly _upHighlight = <SVGPathElement> svgElement("path", {fill: "black", stroke: "black", "stroke-width": 1, "pointer-events": "none"});
		private readonly _downHighlight = <SVGPathElement> svgElement("path", {fill: "black", stroke: "black", "stroke-width": 1, "pointer-events": "none"});
		
		private readonly _grid: Box[][] = [[], [], [], []];
		private _mouseX: number = 0;
		private _mouseY: number = 0;
		private _pattern: BarPattern;
		private _mouseOver: boolean = false;
		private _digits: string = "";
		private _editorHeight: number = 128;
		private _channelHeight: number = 32;
		private _renderedSquashed: boolean = false;
		private _renderedPlayhead: number = -1;
		
		constructor(private _doc: SongDocument, private _songEditor: SongEditor) {
			this._pattern = this._doc.getCurrentPattern();
			
			for (let y: number = 0; y < Music.numChannels; y++) {
				for (let x: number = 0; x < 16; x++) {
					const box: Box = new Box(y, x, y);
					this._svg.appendChild(box.container);
					this._grid[y][x] = box;
				}
			}
			
			this._svg.appendChild(this._boxHighlight);
			this._svg.appendChild(this._upHighlight);
			this._svg.appendChild(this._downHighlight);
			this._svg.appendChild(this._playhead);
			
			this._render();
			this._doc.watch(this._documentChanged);
			
			window.requestAnimationFrame(this._onEnterFrame);
			this.container.addEventListener("mousedown", this._onMousePressed);
			document.addEventListener("mousemove", this._onMouseMoved);
			document.addEventListener("mouseup", this._onMouseReleased);
			this.container.addEventListener("mouseover", this._onMouseOver);
			this.container.addEventListener("mouseout", this._onMouseOut);
		}
		
		private _onEnterFrame = (timestamp: number): void => {
			const playhead = (this._barWidth * (this._doc.synth.playhead - this._doc.barScrollPos) - 2);
			if (this._renderedPlayhead != playhead) {
				this._renderedPlayhead = playhead;
				this._playhead.setAttribute("x", "" + playhead);
			}
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
		
		public onKeyPressed(event: KeyboardEvent): void {
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
		
		private _onMouseOver = (event: MouseEvent): void => {
			if (this._mouseOver) return;
			this._mouseOver = true;
		}
		
		private _onMouseOut = (event: MouseEvent): void => {
			if (!this._mouseOver) return;
			this._mouseOver = false;
		}
		
		private _onMousePressed = (event: MouseEvent): void => {
			event.preventDefault();
			const boundingRect: ClientRect = this._svg.getBoundingClientRect();
    		this._mouseX = (event.clientX || event.pageX) - boundingRect.left;
		    this._mouseY = (event.clientY || event.pageY) - boundingRect.top;
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
			const boundingRect: ClientRect = this._svg.getBoundingClientRect();
    		this._mouseX = (event.clientX || event.pageX) - boundingRect.left;
		    this._mouseY = (event.clientY || event.pageY) - boundingRect.top;
			this._updatePreview();
		}
		
		private _onMouseReleased = (event: MouseEvent): void => {
		}
		
		private _updatePreview(): void {
			const channel: number = Math.floor(Math.min(Music.numChannels-1, Math.max(0, this._mouseY / this._channelHeight)));
			const bar: number = Math.floor(Math.min(this._doc.song.bars-1, Math.max(0, this._mouseX / this._barWidth + this._doc.barScrollPos)));
			const selected: boolean = (bar == this._doc.bar && channel == this._doc.channel);
			
			if (this._mouseOver && !selected) {
				this._boxHighlight.setAttribute("x", "" + (1 + this._barWidth * (bar - this._doc.barScrollPos)));
				this._boxHighlight.setAttribute("y", "" + (1 + (this._channelHeight * channel)));
				this._boxHighlight.setAttribute("height", "" + (this._channelHeight - 2));
				this._boxHighlight.style.visibility = "visible";
			} else {
				this._boxHighlight.style.visibility = "hidden";
			}
			
			if (this._mouseOver && selected) {
				const up: boolean = (this._mouseY % this._channelHeight) < this._channelHeight / 2;
				const center: number = this._barWidth * (bar - this._doc.barScrollPos + 0.8);
				const middle: number = this._channelHeight * (channel + 0.5);
				const base: number = this._channelHeight * 0.1;
				const tip: number = this._channelHeight * 0.4;
				const width: number = this._channelHeight * 0.175;
				
				this._upHighlight.setAttribute("fill", up ? "#fff" : "#000");
				this._downHighlight.setAttribute("fill", !up ? "#fff" : "#000");
				
				this._upHighlight.setAttribute("d", `M ${center} ${middle - tip} L ${center + width} ${middle - base} L ${center - width} ${middle - base} z`);
				this._downHighlight.setAttribute("d", `M ${center} ${middle + tip} L ${center + width} ${middle + base} L ${center - width} ${middle + base} z`);
				
				this._upHighlight.style.visibility = "visible";
				this._downHighlight.style.visibility = "visible";
			} else {
				this._upHighlight.style.visibility = "hidden";
				this._downHighlight.style.visibility = "hidden";
			}
		}
		
		private _documentChanged = (): void => {
			this._pattern = this._doc.getCurrentPattern();
			const editorHeight = this._doc.song.bars > 16 ? 108 : 128;
			if (this._editorHeight != editorHeight) {
				this._editorHeight = this._doc.song.bars > 16 ? 108 : 128;
				this._svg.setAttribute("height", ""+this._editorHeight);
				this.container.style.height = ""+this._editorHeight;
				this._channelHeight = this._editorHeight / Music.numChannels;
			}
			this._render();
		}
		
		private _render(): void {
			const squashed: boolean = (this._doc.song.bars > 16);
			if (this._renderedSquashed != squashed) {
				this._renderedSquashed = squashed;
				for (let y: number = 0; y < Music.numChannels; y++) {
					for (let x: number = 0; x < 16; x++) {
						this._grid[y][x].setSquashed(squashed, y);
					}
				}
			}
			
			const renderCount: number = Math.min(16, this._doc.song.bars);
			for (let j: number = 0; j < Music.numChannels; j++) {
				const channelColor: string = SongEditor.channelColorsBright[j];
				const channelDim: string   = SongEditor.channelColorsDim[j];
				for (let i: number = 0; i < 16; i++) {
					const pattern: BarPattern = this._doc.song.getPattern(j, i + this._doc.barScrollPos);
					const selected: boolean = (i + this._doc.barScrollPos == this._doc.bar && j == this._doc.channel);
					const dim: boolean = (pattern == null || pattern.tones.length == 0);
					
					const box: Box = this._grid[j][i];
					if (i < this._doc.song.bars) {
						box.setIndex(this._doc.song.channelBars[j][i + this._doc.barScrollPos], dim, selected, j);
						box.container.style.visibility = "visible";
					} else {
						box.container.style.visibility = "hidden";
					}
				}
			}
			
			this._updatePreview();
		}
	}
}
