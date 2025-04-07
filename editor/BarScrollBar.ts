// Copyright (c) John Nesky and contributing authors, distributed under the MIT license, see accompanying the LICENSE.md file.

import {SongDocument} from "./SongDocument.js";
import {ColorConfig} from "./ColorConfig.js";
import {HTML, SVG} from "imperative-html/dist/esm/elements-strict.js";
import {EasyPointers} from "./EasyPointers.js";

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
	
	public readonly container: HTMLElement = HTML.div({class: "barScrollBar", style: "width: 512px; height: 20px; overflow: hidden; position: relative;"}, this._svg);
	
	private readonly _pointers: EasyPointers = new EasyPointers(this.container);
	
	private _mouseX: number = 0;
	private _dragging: boolean = false;
	private _dragStart: number;
	private _notchSpace: number;
	private _renderedNotchCount: number = -1;
	private _renderedScrollBarPos: number = -1;
	
	constructor(private _doc: SongDocument) {
		const center: number = this._editorHeight * 0.5;
		const base: number = 20;
		const tip: number = 9;
		const arrowHeight: number = 6;
		this._leftHighlight.setAttribute("d", `M ${tip} ${center} L ${base} ${center + arrowHeight} L ${base} ${center - arrowHeight} z`);
		this._rightHighlight.setAttribute("d", `M ${this._editorWidth - tip} ${center} L ${this._editorWidth - base} ${center + arrowHeight} L ${this._editorWidth - base} ${center - arrowHeight} z`);
		
		this.container.addEventListener("pointerenter", this._onPointerMove);
		this.container.addEventListener("pointerleave", this._onPointerLeave);
		this.container.addEventListener("pointerdown", this._onPointerDown);
		this.container.addEventListener("pointermove", this._onPointerMove);
		this.container.addEventListener("pointerup", this._onPointerUp);
		this.container.addEventListener("pointercancel", this._onPointerUp);
	}
	
	private _onPointerLeave = (event: PointerEvent): void => {
		this._updatePreview();
	}
	
	private _onPointerDown = (event: PointerEvent): void => {
		this._mouseX = (this._pointers.latest.getPointIn(this._svg).x);
		this._updatePreview();
		if (this._mouseX >= this._doc.barScrollPos * this._notchSpace && this._mouseX <= (this._doc.barScrollPos + this._doc.trackVisibleBars) * this._notchSpace) {
			this._dragging = true;
			this._dragStart = this._mouseX;
		}
	}
	
	private _onPointerMove = (event: PointerEvent): void => {
		this._mouseX = (this._pointers.latest.getPointIn(this._svg).x);
		if (this._dragging) {
			while (this._mouseX - this._dragStart < -this._notchSpace * 0.5) {
				if (this._doc.barScrollPos > 0) {
					this._doc.barScrollPos--;
					this._dragStart -= this._notchSpace;
					this._doc.notifier.changed();
				} else {
					break;
				}
			}
			while (this._mouseX - this._dragStart > this._notchSpace * 0.5) {
				if (this._doc.barScrollPos < this._doc.song.barCount - this._doc.trackVisibleBars) {
					this._doc.barScrollPos++;
					this._dragStart += this._notchSpace;
					this._doc.notifier.changed();
				} else {
					break;
				}
			}
		}
		this._updatePreview();
	}
	
	private _onPointerUp = (event: PointerEvent): void => {
		if (!this._dragging) {
			if (this._mouseX < (this._doc.barScrollPos + 8) * this._notchSpace) {
				if (this._doc.barScrollPos > 0) this._doc.barScrollPos--;
				this._doc.notifier.changed();
			} else {
				if (this._doc.barScrollPos < this._doc.song.barCount - this._doc.trackVisibleBars) this._doc.barScrollPos++;
				this._doc.notifier.changed();
			}
		}
		this._dragging = false;
		this._updatePreview();
	}
	
	private _updatePreview(): void {
		const showHighlight: boolean = this._pointers.latest.isHovering;
		let showleftHighlight: boolean = false;
		let showRightHighlight: boolean = false;
		let showHandleHighlight: boolean = false;
		
		if (showHighlight) {
			if (this._mouseX < this._doc.barScrollPos * this._notchSpace) {
				showleftHighlight = true;
			} else if (this._mouseX > (this._doc.barScrollPos + this._doc.trackVisibleBars) * this._notchSpace) {
				showRightHighlight = true;
			} else {
				showHandleHighlight = true;
			}
		}
		
		this._leftHighlight.style.display = showleftHighlight ? "" : "none";
		this._rightHighlight.style.display = showRightHighlight ? "" : "none";
		this._handleHighlight.style.display = showHandleHighlight ? "" : "none";
	}
	
	public render(): void {
		this._notchSpace = (this._editorWidth-1) / Math.max(this._doc.trackVisibleBars, this._doc.song.barCount);
		
		const resized: boolean = this._renderedNotchCount != this._doc.song.barCount;
		if (resized) {
			this._renderedNotchCount = this._doc.song.barCount;
			
			while (this._notches.firstChild) this._notches.removeChild(this._notches.firstChild);
			
			for (let i: number = 0; i <= this._doc.song.barCount; i++) {
				const lineHeight: number = (i % 16 == 0) ? 0 : ((i % 4 == 0) ? this._editorHeight / 8 : this._editorHeight / 3);
				this._notches.appendChild(SVG.rect({fill: ColorConfig.uiWidgetBackground, x: i * this._notchSpace - 1, y: lineHeight, width: 2, height: this._editorHeight - lineHeight * 2}));
			}
		}
		
		if (resized || this._renderedScrollBarPos != this._doc.barScrollPos) {
			this._renderedScrollBarPos = this._doc.barScrollPos;
			this._handle.setAttribute("x", String(this._notchSpace * this._doc.barScrollPos));
			this._handle.setAttribute("width", String(this._notchSpace * this._doc.trackVisibleBars));
			this._handleHighlight.setAttribute("x", String(this._notchSpace * this._doc.barScrollPos));
			this._handleHighlight.setAttribute("width", String(this._notchSpace * this._doc.trackVisibleBars));
		}
		
		this._updatePreview();
	}
}
