// Copyright (C) 2019 John Nesky, distributed under the MIT license.

/// <reference path="../synth/synth.ts" />
/// <reference path="SongDocument.ts" />
/// <reference path="html.ts" />

namespace beepbox {
	export class BarScrollBar {
		private readonly _editorWidth: number = 512;
		private readonly _editorHeight: number = 20;
		
		private readonly _notches: SVGSVGElement = SVG.svg({"pointer-events": "none"});
		private readonly _handle: SVGRectElement = SVG.rect({fill: ColorConfig.uiWidgetBackground, x: 0, y: 2, width: 10, height: this._editorHeight - 4});
		private readonly _handleHighlight: SVGRectElement = SVG.rect({fill: "none", stroke: ColorConfig.hoverPreview, "stroke-width": 2, "pointer-events": "none", x: 0, y: 1, width: 10, height: this._editorHeight - 2});
		private readonly _leftHighlight: SVGPathElement = SVG.path({fill: ColorConfig.hoverPreview, "pointer-events": "none"});
		private readonly _rightHighlight: SVGPathElement = SVG.path({fill: ColorConfig.hoverPreview, "pointer-events": "none"});
		
		private readonly _svg: SVGSVGElement = SVG.svg({style: `background-color: ${ColorConfig.editorBackground}; touch-action: pan-y; position: absolute;`, width: this._editorWidth, height: this._editorHeight},
			this._notches,
			this._handle,
			this._handleHighlight,
			this._leftHighlight,
			this._rightHighlight,
		);
		
		public readonly container: HTMLElement = HTML.div({className: "barScrollBar", style: "width: 512px; height: 20px; overflow: hidden; position: relative;"}, this._svg);
		
		private _mouseX: number = 0;
		//private _mouseY: number = 0;
		private _mouseDown: boolean = false;
		private _mouseOver: boolean = false;
		private _dragging: boolean = false;
		private _dragStart: number;
		private _barWidth: number;
		private _renderedNotchCount: number = -1;
		private _renderedBarPos: number = -1;
		
		constructor(private _doc: SongDocument, private _trackContainer: HTMLDivElement) {
			const center: number = this._editorHeight * 0.5;
			const base: number = 20;
			const tip: number = 9;
			const arrowHeight: number = 6;
			this._leftHighlight.setAttribute("d", `M ${tip} ${center} L ${base} ${center + arrowHeight} L ${base} ${center - arrowHeight} z`);
			this._rightHighlight.setAttribute("d", `M ${this._editorWidth - tip} ${center} L ${this._editorWidth - base} ${center + arrowHeight} L ${this._editorWidth - base} ${center - arrowHeight} z`);
			
			this.container.addEventListener("mousedown", this._whenMousePressed);
			document.addEventListener("mousemove", this._whenMouseMoved);
			document.addEventListener("mouseup", this._whenCursorReleased);
			this.container.addEventListener("mouseover", this._whenMouseOver);
			this.container.addEventListener("mouseout", this._whenMouseOut);
			
			this.container.addEventListener("touchstart", this._whenTouchPressed);
			this.container.addEventListener("touchmove", this._whenTouchMoved);
			this.container.addEventListener("touchend", this._whenCursorReleased);
			this.container.addEventListener("touchcancel", this._whenCursorReleased);
			
			// Sorry, bypassing typescript type safety on this function because I want to use the new "passive" option.
			//this._trackContainer.addEventListener("scroll", this._onScroll, {capture: false, passive: true});
			(<Function>this._trackContainer.addEventListener)("scroll", this._onScroll, {capture: false, passive: true});
		}
		
		private _onScroll = (event: Event): void => {
			this._doc.barScrollPos = (this._trackContainer.scrollLeft / 32);
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
		    //this._mouseY = (event.clientY || event.pageY) - boundingRect.top;
			this._updatePreview();
			if (this._mouseX >= this._doc.barScrollPos * this._barWidth && this._mouseX <= (this._doc.barScrollPos + this._doc.trackVisibleBars) * this._barWidth) {
				this._dragging = true;
				this._dragStart = this._mouseX;
			}
		}
		
		private _whenTouchPressed = (event: TouchEvent): void => {
			event.preventDefault();
			this._mouseDown = true;
			const boundingRect: ClientRect = this._svg.getBoundingClientRect();
			this._mouseX = event.touches[0].clientX - boundingRect.left;
			//this._mouseY = event.touches[0].clientY - boundingRect.top;
			this._updatePreview();
			if (this._mouseX >= this._doc.barScrollPos * this._barWidth && this._mouseX <= (this._doc.barScrollPos + this._doc.trackVisibleBars) * this._barWidth) {
				this._dragging = true;
				this._dragStart = this._mouseX;
			}
		}
		
		private _whenMouseMoved = (event: MouseEvent): void => {
			const boundingRect: ClientRect = this._svg.getBoundingClientRect();
    		this._mouseX = (event.clientX || event.pageX) - boundingRect.left;
		    //this._mouseY = (event.clientY || event.pageY) - boundingRect.top;
		    this._whenCursorMoved();
		}
		
		private _whenTouchMoved = (event: TouchEvent): void => {
			if (!this._mouseDown) return;
			event.preventDefault();
			const boundingRect: ClientRect = this._svg.getBoundingClientRect();
			this._mouseX = event.touches[0].clientX - boundingRect.left;
			//this._mouseY = event.touches[0].clientY - boundingRect.top;
		    this._whenCursorMoved();
		}
		
		private _whenCursorMoved(): void {
			if (this._dragging) {
				while (this._mouseX - this._dragStart < -this._barWidth * 0.5) {
					if (this._doc.barScrollPos > 0) {
						this._doc.barScrollPos--;
						this._dragStart -= this._barWidth;
						this._doc.notifier.changed();
					} else {
						break;
					}
				}
				while (this._mouseX - this._dragStart > this._barWidth * 0.5) {
					if (this._doc.barScrollPos < this._doc.song.barCount - this._doc.trackVisibleBars) {
						this._doc.barScrollPos++;
						this._dragStart += this._barWidth;
						this._doc.notifier.changed();
					} else {
						break;
					}
				}
			}
			if (this._mouseOver) this._updatePreview();
		}
		
		private _whenCursorReleased = (event: Event): void => {
			if (!this._dragging && this._mouseDown) {
				if (this._mouseX < (this._doc.barScrollPos + 8) * this._barWidth) {
					if (this._doc.barScrollPos > 0) this._doc.barScrollPos--;
					this._doc.notifier.changed();
				} else {
					if (this._doc.barScrollPos < this._doc.song.barCount - this._doc.trackVisibleBars) this._doc.barScrollPos++;
					this._doc.notifier.changed();
				}
			}
			this._mouseDown = false;
			this._dragging = false;
			this._updatePreview();
		}
		
		private _updatePreview(): void {
			const showHighlight: boolean = this._mouseOver && !this._mouseDown;
			let showleftHighlight: boolean = false;
			let showRightHighlight: boolean = false;
			let showHandleHighlight: boolean = false;
			
			if (showHighlight) {
				if (this._mouseX < this._doc.barScrollPos * this._barWidth) {
					showleftHighlight = true;
				} else if (this._mouseX > (this._doc.barScrollPos + this._doc.trackVisibleBars) * this._barWidth) {
					showRightHighlight = true;
				} else {
					showHandleHighlight = true;
				}
			}
			
			this._leftHighlight.style.visibility = showleftHighlight ? "visible" : "hidden";
			this._rightHighlight.style.visibility = showRightHighlight ? "visible" : "hidden";
			this._handleHighlight.style.visibility = showHandleHighlight ? "visible" : "hidden";
		}
		
		public render(): void {
			this._barWidth = (this._editorWidth-1) / Math.max(this._doc.trackVisibleBars, this._doc.song.barCount);
			
			const resized: boolean = this._renderedNotchCount != this._doc.song.barCount;
			if (resized) {
				this._renderedNotchCount = this._doc.song.barCount;
				
				while (this._notches.firstChild) this._notches.removeChild(this._notches.firstChild);
				
				for (let i: number = 0; i <= this._doc.song.barCount; i++) {
					const lineHeight: number = (i % 16 == 0) ? 0 : ((i % 4 == 0) ? this._editorHeight / 8 : this._editorHeight / 3);
					this._notches.appendChild(SVG.rect({fill: ColorConfig.uiWidgetBackground, x: i * this._barWidth - 1, y: lineHeight, width: 2, height: this._editorHeight - lineHeight * 2}));
				}
			}
			
			if (resized || this._renderedBarPos != this._doc.barScrollPos) {
				this._renderedBarPos = this._doc.barScrollPos;
				this._handle.setAttribute("x", "" + (this._barWidth * this._doc.barScrollPos));
				this._handle.setAttribute("width", "" + (this._barWidth * this._doc.trackVisibleBars));
				this._handleHighlight.setAttribute("x", "" + (this._barWidth * this._doc.barScrollPos));
				this._handleHighlight.setAttribute("width", "" + (this._barWidth * this._doc.trackVisibleBars));
			}
			
			this._updatePreview();
			
			this._trackContainer.scrollLeft = this._doc.barScrollPos * 32;
		}
	}
}
