// Copyright (C) 2020 John Nesky, distributed under the MIT license.

import {Pattern} from "../synth/synth";
import {ColorConfig, ChannelColors} from "./ColorConfig";
import {isMobile} from "./EditorConfig";
import {SongDocument} from "./SongDocument";
import {HTML, SVG} from "imperative-html/dist/esm/elements-strict";

//namespace beepbox {
	class Box {
		private readonly _text: Text = document.createTextNode("1");
		private readonly _label: SVGTextElement = SVG.text({"font-family": "sans-serif", "font-size": 20, "text-anchor": "middle", "font-weight": "bold", fill: "red"}, this._text);
		private readonly _rect: SVGRectElement = SVG.rect({x: 1, y: 1});
		public readonly container: SVGSVGElement = SVG.svg(this._rect, this._label);
		private _renderedIndex: number = 1;
		private _renderedDim: boolean = true;
		private _renderedSelected: boolean = false;
		private _renderedColor: string = "";
		constructor(channel: number, private readonly _x: number, private readonly _y: number, color: string) {
			this._rect.setAttribute("fill", ColorConfig.uiWidgetBackground);
			this._label.setAttribute("fill", color);
		}
		
		public setSize(width: number, height: number): void {
			this.container.setAttribute("x", "" + (this._x * width));
			this.container.setAttribute("y", "" + (this._y * height));
			this._rect.setAttribute("width", "" + (width - 2));
			this._rect.setAttribute("height", "" + (height - 2));
			this._label.setAttribute("x", "" + (width / 2));
			this._label.setAttribute("y", "" + Math.round(height / 2 + 7));
		}
		
		public setIndex(index: number, dim: boolean, selected: boolean, color: string): void {
			if (this._renderedIndex != index) {
				if (!this._renderedSelected && ((index == 0) != (this._renderedIndex == 0))) {
					this._rect.setAttribute("fill", (index == 0) ? "none" : ColorConfig.uiWidgetBackground);
				}
			
				this._renderedIndex = index;
				this._text.data = ""+index;
			}
			
			if (this._renderedDim != dim || this._renderedColor != color) {
				this._renderedDim = dim;
				if (selected) {
					this._label.setAttribute("fill", ColorConfig.invertedText);
				} else {
					this._label.setAttribute("fill", color);
				}
			}
			
			if (this._renderedSelected != selected || this._renderedColor != color) {
				this._renderedSelected = selected;
				if (selected) {
					this._rect.setAttribute("fill", color);
					this._label.setAttribute("fill", ColorConfig.invertedText);
				} else {
					this._rect.setAttribute("fill", (this._renderedIndex == 0) ? ColorConfig.editorBackground : ColorConfig.uiWidgetBackground);
					this._label.setAttribute("fill", color);
				}
			}
			
			this._renderedColor = color;
		}
	}
	
	export class TrackEditor {
		private readonly _boxContainer: SVGGElement = SVG.g();
		private readonly _playhead: SVGRectElement = SVG.rect({fill: ColorConfig.playhead, x: 0, y: 0, width: 4, height: 128});
		private readonly _boxHighlight: SVGRectElement = SVG.rect({fill: "none", stroke: ColorConfig.hoverPreview, "stroke-width": 2, "pointer-events": "none", x: 1, y: 1, width: 30, height: 30});
		private readonly _upHighlight: SVGPathElement = SVG.path({fill: ColorConfig.invertedText, stroke: ColorConfig.invertedText, "stroke-width": 1, "pointer-events": "none"});
		private readonly _downHighlight: SVGPathElement = SVG.path({fill: ColorConfig.invertedText, stroke: ColorConfig.invertedText, "stroke-width": 1, "pointer-events": "none"});
		private readonly _selectionRect: SVGRectElement = SVG.rect({fill: ColorConfig.boxSelectionFill, stroke: ColorConfig.hoverPreview, "stroke-width": 2, "stroke-dasharray": "5, 3", "pointer-events": "none", visibility: "hidden", x: 1, y: 1, width: 62, height: 62});
		private readonly _svg: SVGSVGElement = SVG.svg({style: `background-color: ${ColorConfig.editorBackground}; position: absolute;`, height: 128},
			this._boxContainer,
			this._selectionRect,
			this._boxHighlight,
			this._upHighlight,
			this._downHighlight,
			this._playhead,
		);
		private readonly _select: HTMLSelectElement = HTML.select({class: "trackSelectBox", style: "background: none; border: none; appearance: none; border-radius: initial; box-shadow: none; color: transparent; position: absolute; touch-action: none;"});
		public readonly container: HTMLElement = HTML.div({class: "noSelection", style: "height: 128px; position: relative; overflow:hidden;"}, this._svg, this._select);
		
		private readonly _grid: Box[][] = [];
		private _mouseX: number = 0;
		private _mouseY: number = 0;
		private _mouseStartBar: number = 0;
		private _mouseStartChannel: number = 0;
		private _mouseBar: number = 0;
		private _mouseChannel: number = 0;
		private _mouseOver: boolean = false;
		private _mousePressed: boolean = false;
		private _mouseDragging = false;
		private _barWidth: number = 32;
		private _channelHeight: number = 32;
		private _renderedChannelCount: number = 0;
		private _renderedBarCount: number = 0;
		private _renderedPatternCount: number = 0;
		private _renderedPlayhead: number = -1;
		private _renderedBarWidth: number = -1;
		private _renderedChannelHeight: number = -1;
		private _touchMode: boolean = isMobile;
		
		constructor(private _doc: SongDocument) {
			window.requestAnimationFrame(this._animatePlayhead);
			this._svg.addEventListener("mousedown", this._whenMousePressed);
			document.addEventListener("mousemove", this._whenMouseMoved);
			document.addEventListener("mouseup", this._whenMouseReleased);
			this._svg.addEventListener("mouseover", this._whenMouseOver);
			this._svg.addEventListener("mouseout", this._whenMouseOut);
			
			this._select.addEventListener("change", this._whenSelectChanged);
			this._select.addEventListener("touchstart", this._whenSelectPressed);
			this._select.addEventListener("touchmove", this._whenSelectMoved);
			this._select.addEventListener("touchend", this._whenSelectReleased);
			this._select.addEventListener("touchcancel", this._whenSelectReleased);
			
			let determinedCursorType: boolean = false;
			document.addEventListener("mousedown", () => {
				if (!determinedCursorType) {
					this._touchMode = false;
					this._updatePreview();
				}
				determinedCursorType = true;
			}, true);
			document.addEventListener("touchstart", () => {
				if (!determinedCursorType) {
					this._touchMode = true;
					this._updatePreview();
				}
				determinedCursorType = true;
			}, true);
		}
		
		private _whenSelectChanged = (): void => {
			this._doc.selection.setPattern(this._select.selectedIndex);
		}
		
		private _animatePlayhead = (timestamp: number): void => {
			const playhead = (this._barWidth * this._doc.synth.playhead - 2);
			if (this._renderedPlayhead != playhead) {
				this._renderedPlayhead = playhead;
				this._playhead.setAttribute("x", "" + playhead);
			}
			window.requestAnimationFrame(this._animatePlayhead);
		}
		
		public onKeyPressed(event: KeyboardEvent): void {
			switch (event.keyCode) {
				case 38: // up
					if (event.shiftKey) {
						this._doc.selection.boxSelectionY1 = Math.max(0, this._doc.selection.boxSelectionY1 - 1);
						this._doc.selection.selectionUpdated();
					} else {
						this._doc.selection.setChannelBar((this._doc.channel - 1 + this._doc.song.getChannelCount()) % this._doc.song.getChannelCount(), this._doc.bar);
						this._doc.selection.resetBoxSelection();
					}
					event.preventDefault();
					break;
				case 40: // down
					if (event.shiftKey) {
						this._doc.selection.boxSelectionY1 = Math.min(this._doc.song.getChannelCount() - 1, this._doc.selection.boxSelectionY1 + 1);
						this._doc.selection.selectionUpdated();
					} else {
						this._doc.selection.setChannelBar((this._doc.channel + 1) % this._doc.song.getChannelCount(), this._doc.bar);
						this._doc.selection.resetBoxSelection();
					}
					event.preventDefault();
					break;
				case 37: // left
					if (event.shiftKey) {
						this._doc.selection.boxSelectionX1 = Math.max(0, this._doc.selection.boxSelectionX1 - 1);
						this._doc.selection.scrollToSelection();
						this._doc.selection.selectionUpdated();
					} else {
						this._doc.selection.setChannelBar(this._doc.channel, (this._doc.bar + this._doc.song.barCount - 1) % this._doc.song.barCount);
						this._doc.selection.resetBoxSelection();
					}
					event.preventDefault();
					break;
				case 39: // right
					if (event.shiftKey) {
						this._doc.selection.boxSelectionX1 = Math.min(this._doc.song.barCount - 1, this._doc.selection.boxSelectionX1 + 1);
						this._doc.selection.scrollToSelection();
						this._doc.selection.selectionUpdated();
					} else {
						this._doc.selection.setChannelBar(this._doc.channel, (this._doc.bar + 1) % this._doc.song.barCount);
						this._doc.selection.resetBoxSelection();
					}
					event.preventDefault();
					break;
				case 48: // 0
					this._doc.selection.nextDigit("0");
					event.preventDefault();
					break;
				case 49: // 1
					this._doc.selection.nextDigit("1");
					event.preventDefault();
					break;
				case 50: // 2
					this._doc.selection.nextDigit("2");
					event.preventDefault();
					break;
				case 51: // 3
					this._doc.selection.nextDigit("3");
					event.preventDefault();
					break;
				case 52: // 4
					this._doc.selection.nextDigit("4");
					event.preventDefault();
					break;
				case 53: // 5
					this._doc.selection.nextDigit("5");
					event.preventDefault();
					break;
				case 54: // 6
					this._doc.selection.nextDigit("6");
					event.preventDefault();
					break;
				case 55: // 7
					this._doc.selection.nextDigit("7");
					event.preventDefault();
					break;
				case 56: // 8
					this._doc.selection.nextDigit("8");
					event.preventDefault();
					break;
				case 57: // 9
					this._doc.selection.nextDigit("9");
					event.preventDefault();
					break;
				default:
					this._doc.selection.digits = "";
					break;
			}
		}
		
		private _dragBoxSelection(): void {
			this._doc.selection.boxSelectionX1 = this._mouseBar;
			this._doc.selection.boxSelectionY1 = this._mouseChannel;
			this._doc.selection.selectionUpdated();
		}
		
		private _updateSelectPos(event: TouchEvent): void {
			const boundingRect: ClientRect = this._svg.getBoundingClientRect();
    		this._mouseX = event.touches[0].clientX - boundingRect.left;
		    this._mouseY = event.touches[0].clientY - boundingRect.top;
		    if (isNaN(this._mouseX)) this._mouseX = 0;
		    if (isNaN(this._mouseY)) this._mouseY = 0;
			this._mouseBar = Math.floor(Math.min(this._doc.song.barCount - 1, Math.max(0, this._mouseX / this._barWidth)));
			this._mouseChannel = Math.floor(Math.min(this._doc.song.getChannelCount() - 1, Math.max(0, this._mouseY / this._channelHeight)));
		}
		
		private _whenSelectPressed = (event: TouchEvent): void => {
			this._mousePressed = true;
			this._mouseDragging = true;
			this._updateSelectPos(event);
			this._mouseStartBar = this._mouseBar;
			this._mouseStartChannel = this._mouseChannel;
		}
		
		private _whenSelectMoved = (event: TouchEvent): void => {
			this._updateSelectPos(event);
			if (this._mouseStartBar != this._mouseBar || this._mouseStartChannel != this._mouseChannel) {
				// if the touch has started dragging, cancel opening the select menu.
				event.preventDefault();
			}
			if (this._mousePressed) this._dragBoxSelection();
			this._updatePreview();
		}
		
		private _whenSelectReleased = (event: TouchEvent): void => {
			this._mousePressed = false;
			this._mouseDragging = false;
			this._updatePreview();
		}
		
		private _whenMouseOver = (event: MouseEvent): void => {
			if (this._mouseOver) return;
			this._mouseOver = true;
		}
		
		private _whenMouseOut = (event: MouseEvent): void => {
			if (!this._mouseOver) return;
			this._mouseOver = false;
		}
		
		private _updateMousePos(event: MouseEvent): void {
			const boundingRect: ClientRect = this._svg.getBoundingClientRect();
    		this._mouseX = (event.clientX || event.pageX) - boundingRect.left;
		    this._mouseY = (event.clientY || event.pageY) - boundingRect.top;
			this._mouseBar = Math.floor(Math.min(this._doc.song.barCount - 1, Math.max(0, this._mouseX / this._barWidth)));
			this._mouseChannel = Math.floor(Math.min(this._doc.song.getChannelCount() - 1, Math.max(0, this._mouseY / this._channelHeight)));
		}
		
		private _whenMousePressed = (event: MouseEvent): void => {
			event.preventDefault();
			this._mousePressed = true;
			this._updateMousePos(event);
			this._mouseStartBar = this._mouseBar;
			this._mouseStartChannel = this._mouseChannel;
			if (event.shiftKey) {
				this._mouseDragging = true;
				this._doc.selection.boxSelectionX1 = this._mouseBar;
				this._doc.selection.boxSelectionY1 = this._mouseChannel;
				this._doc.selection.selectionUpdated();
			} else {
				this._mouseDragging = false;
				if (this._doc.channel != this._mouseChannel || this._doc.bar != this._mouseBar) {
					this._doc.selection.setChannelBar(this._mouseChannel, this._mouseBar);
					this._mouseDragging = true;
				}
				this._doc.selection.resetBoxSelection();
			}
		}
		
		private _whenMouseMoved = (event: MouseEvent): void => {
			this._updateMousePos(event);
			if (this._mousePressed) {
				if (this._mouseStartBar != this._mouseBar || this._mouseStartChannel != this._mouseChannel) {
					this._mouseDragging = true;
				}
				this._dragBoxSelection();
			}
			this._updatePreview();
		}
		
		private _whenMouseReleased = (event: MouseEvent): void => {
			if (this._mousePressed && !this._mouseDragging) {
				if (this._doc.channel == this._mouseChannel && this._doc.bar == this._mouseBar) {
					const up: boolean = (this._mouseY % this._channelHeight) < this._channelHeight / 2;
					const patternCount: number = this._doc.song.patternsPerChannel;
					this._doc.selection.setPattern((this._doc.song.channels[this._mouseChannel].bars[this._mouseBar] + (up ? 1 : patternCount)) % (patternCount + 1));
				}
			}
			this._mousePressed = false;
			this._mouseDragging = false;
			this._updatePreview();
		}
		
		private _updatePreview(): void {
			let channel: number = this._mouseChannel;
			let bar: number = this._mouseBar;
			
			if (this._touchMode) {
				bar = this._doc.bar;
				channel = this._doc.channel;
			}
			
			const selected: boolean = (bar == this._doc.bar && channel == this._doc.channel);
			
			if (this._mouseOver && !this._mousePressed && !selected) {
				this._boxHighlight.setAttribute("x", "" + (1 + this._barWidth * bar));
				this._boxHighlight.setAttribute("y", "" + (1 + (this._channelHeight * channel)));
				this._boxHighlight.setAttribute("height", "" + (this._channelHeight - 2));
				this._boxHighlight.setAttribute("width", "" + (this._barWidth - 2));
				this._boxHighlight.style.visibility = "visible";
			} else {
				this._boxHighlight.style.visibility = "hidden";
			}
			
			if ((this._mouseOver || this._touchMode) && selected) {
				const up: boolean = (this._mouseY % this._channelHeight) < this._channelHeight / 2;
				const center: number = this._barWidth * (bar + 0.8);
				const middle: number = this._channelHeight * (channel + 0.5);
				const base: number = this._channelHeight * 0.1;
				const tip: number = this._channelHeight * 0.4;
				const width: number = this._channelHeight * 0.175;
				
				this._upHighlight.setAttribute("fill", up && !this._touchMode ? ColorConfig.hoverPreview : ColorConfig.invertedText);
				this._downHighlight.setAttribute("fill", !up && !this._touchMode ? ColorConfig.hoverPreview : ColorConfig.invertedText);
				
				this._upHighlight.setAttribute("d", `M ${center} ${middle - tip} L ${center + width} ${middle - base} L ${center - width} ${middle - base} z`);
				this._downHighlight.setAttribute("d", `M ${center} ${middle + tip} L ${center + width} ${middle + base} L ${center - width} ${middle + base} z`);
				
				this._upHighlight.style.visibility = "visible";
				this._downHighlight.style.visibility = "visible";
			} else {
				this._upHighlight.style.visibility = "hidden";
				this._downHighlight.style.visibility = "hidden";
			}
			
			this._select.style.left = (this._barWidth * this._doc.bar) + "px";
			this._select.style.width = this._barWidth + "px";
			this._select.style.top = (this._channelHeight * this._doc.channel) + "px";
			this._select.style.height = this._channelHeight + "px";
			
			const patternCount: number = this._doc.song.patternsPerChannel + 1;
			for (let i: number = this._renderedPatternCount; i < patternCount; i++) {
				this._select.appendChild(HTML.option({value: i}, i));
			}
			for (let i: number = patternCount; i < this._renderedPatternCount; i++) {
				this._select.removeChild(<Node> this._select.lastChild);
			}
			this._renderedPatternCount = patternCount;
			const selectedPattern: number = this._doc.song.channels[this._doc.channel].bars[this._doc.bar];
			if (this._select.selectedIndex != selectedPattern) this._select.selectedIndex = selectedPattern;
		}
		
		public render(): void {
			this._barWidth = this._doc.getBarWidth();
			this._channelHeight = this._doc.getChannelHeight();
			
			if (this._renderedChannelCount != this._doc.song.getChannelCount()) {
				for (let y: number = this._renderedChannelCount; y < this._doc.song.getChannelCount(); y++) {
					this._grid[y] = [];
					for (let x: number = 0; x < this._renderedBarCount; x++) {
						const box: Box = new Box(y, x, y, ColorConfig.getChannelColor(this._doc.song, y).secondaryChannel);
						box.setSize(this._barWidth, this._channelHeight);
						this._boxContainer.appendChild(box.container);
						this._grid[y][x] = box;
					}
				}
				
				for (let y: number = this._doc.song.getChannelCount(); y < this._renderedChannelCount; y++) {
					for (let x: number = 0; x < this._renderedBarCount; x++) {
						this._boxContainer.removeChild(this._grid[y][x].container);
					}
				}
				
				this._grid.length = this._doc.song.getChannelCount();
				this._mousePressed = false;
			}
			
			if (this._renderedBarCount != this._doc.song.barCount) {
				for (let y: number = 0; y < this._doc.song.getChannelCount(); y++) {
					for (let x: number = this._renderedBarCount; x < this._doc.song.barCount; x++) {
						const box: Box = new Box(y, x, y, ColorConfig.getChannelColor(this._doc.song, y).secondaryChannel);
						box.setSize(this._barWidth, this._channelHeight);
						this._boxContainer.appendChild(box.container);
						this._grid[y][x] = box;
					}
					for (let x: number = this._doc.song.barCount; x < this._renderedBarCount; x++) {
						this._boxContainer.removeChild(this._grid[y][x].container);
					}
					this._grid[y].length = this._doc.song.barCount;
				}
			}
			
			if (this._renderedBarCount != this._doc.song.barCount || this._renderedBarWidth != this._barWidth) {
				this._renderedBarCount = this._doc.song.barCount;
				const editorWidth = this._barWidth * this._doc.song.barCount;
				this.container.style.width = editorWidth + "px";
				this._svg.setAttribute("width", editorWidth + "");
				this._mousePressed = false;
			}
			
			if (this._renderedChannelHeight != this._channelHeight || this._renderedBarWidth != this._barWidth) {
				this._renderedBarWidth = this._barWidth;
				for (let y: number = 0; y < this._doc.song.getChannelCount(); y++) {
					for (let x: number = 0; x < this._renderedBarCount; x++) {
						this._grid[y][x].setSize(this._barWidth, this._channelHeight);
					}
				}
				this._mousePressed = false;
			}
			
			if (this._renderedChannelHeight != this._channelHeight || this._renderedChannelCount != this._doc.song.getChannelCount()) {
				this._renderedChannelHeight = this._channelHeight;
				this._renderedChannelCount = this._doc.song.getChannelCount();
				const editorHeight: number = this._doc.song.getChannelCount() * this._channelHeight;
				this._svg.setAttribute("height", "" + editorHeight);
				this._playhead.setAttribute("height", "" + editorHeight);
				this.container.style.height = editorHeight + "px";
			}
			
			for (let j: number = 0; j < this._doc.song.getChannelCount(); j++) {
				for (let i: number = 0; i < this._renderedBarCount; i++) {
					const pattern: Pattern | null = this._doc.song.getPattern(j, i);
					const selected: boolean = (i == this._doc.bar && j == this._doc.channel);
					const dim: boolean = (pattern == null || pattern.notes.length == 0);
					
					const box: Box = this._grid[j][i];
					if (i < this._doc.song.barCount) {
						const colors: ChannelColors = ColorConfig.getChannelColor(this._doc.song, j);
						box.setIndex(this._doc.song.channels[j].bars[i], dim, selected, dim && !selected ? colors.secondaryChannel : colors.primaryChannel);
						box.container.style.visibility = "visible";
					} else {
						box.container.style.visibility = "hidden";
					}
				}
			}
			
			this._select.style.display = this._touchMode ? "" : "none";
			
			if (this._doc.selection.boxSelectionWidth > 1 || this._doc.selection.boxSelectionHeight > 1) {
				// TODO: This causes the selection rectangle to repaint every time the
				// editor renders and the selection is visible. Check if anything changed
				// before overwriting the attributes?
				this._selectionRect.setAttribute("x", String(this._barWidth * this._doc.selection.boxSelectionBar + 1));
				this._selectionRect.setAttribute("y", String(this._channelHeight * this._doc.selection.boxSelectionChannel + 1));
				this._selectionRect.setAttribute("width", String(this._barWidth * this._doc.selection.boxSelectionWidth - 2));
				this._selectionRect.setAttribute("height", String(this._channelHeight * this._doc.selection.boxSelectionHeight - 2));
				this._selectionRect.setAttribute("visibility", "visible");
			} else {
				this._selectionRect.setAttribute("visibility", "hidden");
			}
			
			this._updatePreview();
		}
	}
//}
