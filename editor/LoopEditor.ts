// Copyright (c) John Nesky and contributing authors, distributed under the MIT license, see accompanying the LICENSE.md file.

import {ColorConfig} from "./ColorConfig.js";
import {SongDocument} from "./SongDocument.js";
import {HTML, SVG} from "imperative-html/dist/esm/elements-strict.js";
import {EasyPointers} from "./EasyPointers.js";
import {ChangeLoop, ChangeChannelBar} from "./changes.js";

interface Cursor {
	startBar: number;
	mode: number;
}

interface Endpoints {
	start: number;
	length: number;
}

export class LoopEditor {
	private readonly _editorHeight: number = 20;
	private readonly _startMode:   number = 0;
	private readonly _endMode:     number = 1;
	private readonly _bothMode:    number = 2;
	
	private readonly _loop: SVGPathElement = SVG.path({fill: "none", stroke: ColorConfig.loopAccent, "stroke-width": 4});
	private readonly _highlight: SVGPathElement = SVG.path({fill: ColorConfig.hoverPreview, "pointer-events": "none"});
	
	private readonly _svg: SVGSVGElement = SVG.svg({style: `touch-action: pan-y; position: absolute;`, height: this._editorHeight},
		this._loop,
		this._highlight,
	);
	
	public readonly container: HTMLElement = HTML.div({class: "loopEditor"}, this._svg);
	
	private readonly _pointers: EasyPointers = new EasyPointers(this.container);
	
	private _barWidth: number = 32;
	private _change: ChangeLoop | null = null;
	private _cursor: Cursor = {startBar: -1, mode: -1};
	private _renderedLoopStart: number = -1;
	private _renderedLoopStop: number = -1;
	private _renderedBarCount: number = 0;
	private _renderedBarWidth: number = -1;
	
	constructor(private _doc: SongDocument) {
		this._updateCursorStatus();
		this._render();
		this._doc.notifier.watch(this._documentChanged);
		
		this.container.addEventListener("pointerenter", this._onPointerMove);
		this.container.addEventListener("pointerleave", this._onPointerLeave);
		this.container.addEventListener("pointerdown", this._onPointerDown);
		this.container.addEventListener("pointermove", this._onPointerMove);
		this.container.addEventListener("pointerup", this._onPointerUp);
		this.container.addEventListener("pointercancel", this._onPointerUp);
	}
	
	private _getPointerBarPos(): number {
		return this._pointers.latest.getPointIn(this.container).x / this._barWidth;
	}
	
	private _updateCursorStatus(): void {
		const bar: number = this._getPointerBarPos();
		this._cursor.startBar = bar;
		
		if (bar > this._doc.song.loopStart - 0.25 && bar < this._doc.song.loopStart + this._doc.song.loopLength + 0.25) {
			if (bar - this._doc.song.loopStart < this._doc.song.loopLength * 0.5) {
				this._cursor.mode = this._startMode;
			} else {
				this._cursor.mode = this._endMode;
			}
		} else {
			this._cursor.mode = this._bothMode;
		}
	}
	
	private _findEndPoints(middle: number): Endpoints {
		let start: number = Math.round(middle - this._doc.song.loopLength / 2);
		let end: number = start + this._doc.song.loopLength;
		if (start < 0) {
			end -= start;
			start = 0;
		}
		if (end > this._doc.song.barCount) {
			start -= end - this._doc.song.barCount;
			end = this._doc.song.barCount;
		}
		return {start: start, length: end - start};
	}
	
	private _onPointerLeave = (event: PointerEvent): void => {
		this._updatePreview();
	}
	
	private _onPointerDown = (event: PointerEvent): void => {
		this._updateCursorStatus();
		this._onPointerMove(event);
		this._updatePreview();
	}
	
	private _onPointerMove = (event: PointerEvent): void => {
		if (event.pointer!.isDown) {
			let oldStart: number = this._doc.song.loopStart;
			let oldEnd: number = this._doc.song.loopStart + this._doc.song.loopLength;
			if (this._change != null && this._doc.lastChangeWas(this._change)) {
				oldStart = this._change.oldStart;
				oldEnd = oldStart + this._change.oldLength;
			}
			
			const bar: number = this._getPointerBarPos();
			let start: number;
			let end: number;
			let temp: number;
			if (this._cursor.mode == this._startMode) {
				start = oldStart + Math.round(bar - this._cursor.startBar);
				end = oldEnd;
				if (start < 0) start = 0;
				if (start >= this._doc.song.barCount) start = this._doc.song.barCount;
				if (start == end) {
					start = end - 1;
				} else if (start > end) {
					temp = start;
					start = end;
					end = temp;
				}
				this._change = new ChangeLoop(this._doc, oldStart, oldEnd - oldStart, start, end - start);
			} else if (this._cursor.mode == this._endMode) {
				start = oldStart;
				end = oldEnd + Math.round(bar - this._cursor.startBar);
				if (end < 0) end = 0;
				if (end >= this._doc.song.barCount) end = this._doc.song.barCount;
				if (end == start) {
					end = start + 1;
				} else if (end < start) {
					temp = start;
					start = end;
					end = temp;
				}
				this._change = new ChangeLoop(this._doc, oldStart, oldEnd - oldStart, start, end - start);
			} else if (this._cursor.mode == this._bothMode) {
				const endPoints: Endpoints = this._findEndPoints(bar);
				this._change = new ChangeLoop(this._doc, oldStart, oldEnd - oldStart, endPoints.start, endPoints.length);
			}
			this._doc.synth.jumpIntoLoop();
			if (this._doc.prefs.autoFollow) {
				new ChangeChannelBar(this._doc, this._doc.channel, Math.floor(this._doc.synth.playhead), true);
			}
			this._doc.setProspectiveChange(this._change);
		} else {
			// The pointer is not down, just update the cursor.
			this._updateCursorStatus();
			this._updatePreview();
		}
	}
	
	private _onPointerUp = (event: PointerEvent): void => {
		if (this._change != null) this._doc.record(this._change);
		this._change = null;
		this._updateCursorStatus();
		this._render();
	}
	
	private _updatePreview(): void {
		const showHighlight: boolean = this._pointers.latest.isHovering;
		this._highlight.style.display = showHighlight ? "" : "none";
		
		if (showHighlight) {
			const radius: number = this._editorHeight / 2;
			
			let highlightStart: number = (this._doc.song.loopStart) * this._barWidth;
			let highlightStop: number = (this._doc.song.loopStart + this._doc.song.loopLength) * this._barWidth;
			if (this._cursor.mode == this._startMode) {
				highlightStop = (this._doc.song.loopStart) * this._barWidth + radius * 2;
			} else if (this._cursor.mode == this._endMode) {
				highlightStart = (this._doc.song.loopStart + this._doc.song.loopLength) * this._barWidth - radius * 2;
			} else {
				const endPoints: Endpoints = this._findEndPoints(this._cursor.startBar);
				highlightStart = (endPoints.start) * this._barWidth;
				highlightStop = (endPoints.start + endPoints.length) * this._barWidth;
			}
			
			this._highlight.setAttribute("d",
				`M ${highlightStart + radius} ${4} ` +
				`L ${highlightStop - radius} ${4} ` +
				`A ${radius - 4} ${radius - 4} ${0} ${0} ${1} ${highlightStop - radius} ${this._editorHeight - 4} ` +
				`L ${highlightStart + radius} ${this._editorHeight - 4} ` +
				`A ${radius - 4} ${radius - 4} ${0} ${0} ${1} ${highlightStart + radius} ${4} ` +
				`z`
			);
		}
	}
	
	private _documentChanged = (): void => {
		this._render();
	}
	
	private _render(): void {
		this._barWidth = this._doc.getBarWidth();
		
		const radius: number = this._editorHeight / 2;
		const loopStart: number = (this._doc.song.loopStart) * this._barWidth;
		const loopStop: number = (this._doc.song.loopStart + this._doc.song.loopLength) * this._barWidth;
		
		if (this._renderedBarCount != this._doc.song.barCount || this._renderedBarWidth != this._barWidth) {
			this._renderedBarCount = this._doc.song.barCount;
			this._renderedBarWidth = this._barWidth;
			const editorWidth = this._barWidth * this._doc.song.barCount;
			this.container.style.width = editorWidth + "px";
			this._svg.setAttribute("width", editorWidth + "");
		}

		if (this._renderedLoopStart != loopStart || this._renderedLoopStop != loopStop) {
			this._renderedLoopStart = loopStart;
			this._renderedLoopStop = loopStop;
			this._loop.setAttribute("d",
				`M ${loopStart + radius} ${2} ` +
				`L ${loopStop - radius} ${2} ` +
				`A ${radius - 2} ${radius - 2} ${0} ${0} ${1} ${loopStop - radius} ${this._editorHeight - 2} ` +
				`L ${loopStart + radius} ${this._editorHeight - 2} ` +
				`A ${radius - 2} ${radius - 2} ${0} ${0} ${1} ${loopStart + radius} ${2} ` +
				`z`
			);
		}
		
		this._updatePreview();
	}
}
