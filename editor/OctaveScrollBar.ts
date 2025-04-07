// Copyright (c) John Nesky and contributing authors, distributed under the MIT license, see accompanying the LICENSE.md file.

import {Config} from "../synth/SynthConfig.js";
import {ColorConfig} from "./ColorConfig.js";
import {SongDocument} from "./SongDocument.js";
import {HTML, SVG} from "imperative-html/dist/esm/elements-strict.js";
import {EasyPointers} from "./EasyPointers.js";
import {ChangeOctave} from "./changes.js";

export class OctaveScrollBar {
	private readonly _editorWidth: number = 20;
	private readonly _editorHeight: number = 481;
	private readonly _notchHeight: number = 4.0;
	private readonly _octaveCount: number = Config.pitchOctaves;
	private readonly _octaveHeight: number = (this._editorHeight - this._notchHeight) / this._octaveCount;
	
	private readonly _handle: SVGRectElement = SVG.rect({fill: ColorConfig.uiWidgetBackground, x: 2, y: 0, width: this._editorWidth - 4});
	private readonly _handleHighlight: SVGRectElement = SVG.rect({fill: "none", stroke: ColorConfig.hoverPreview, "stroke-width": 2, "pointer-events": "none", x: 1, y: 0, width: this._editorWidth - 2});
	private readonly _upHighlight: SVGPathElement = SVG.path({fill: ColorConfig.hoverPreview, "pointer-events": "none"});
	private readonly _downHighlight: SVGPathElement = SVG.path({fill: ColorConfig.hoverPreview, "pointer-events": "none"});
	
	private readonly _svg: SVGSVGElement = SVG.svg({style: `background-color: ${ColorConfig.editorBackground}; touch-action: pan-x; position: absolute;`, width: this._editorWidth, height: "100%", viewBox: "0 0 20 481", preserveAspectRatio: "none"});
	public readonly container: HTMLDivElement = HTML.div({id: "octaveScrollBarContainer", style: "width: 20px; height: 100%; overflow: hidden; position: relative; flex-shrink: 0;"}, this._svg);
	
	private readonly _pointers: EasyPointers = new EasyPointers(this.container, {preventTouchGestureScrolling: true});
	
	private _mouseY: number = 0;
	private _dragging: boolean = false;
	private _dragStart: number;
	private _barBottom: number;
	private _barHeight: number;
	private _renderedBarBottom: number = -1;
	private _renderedVisibleOctaveCount: number = -1;
	private _change: ChangeOctave | null = null;
	
	constructor(private _doc: SongDocument) {
		this._doc.notifier.watch(this._documentChanged);
		this._documentChanged();
		
		this._svg.appendChild(this._handle);
		
		// notches:
		for (let i: number = 0; i <= this._octaveCount; i++) {
			this._svg.appendChild(SVG.rect({fill: ColorConfig.tonic, x: 0, y: i * this._octaveHeight, width: this._editorWidth, height: this._notchHeight}));
		}
		
		this._svg.appendChild(this._handleHighlight);
		this._svg.appendChild(this._upHighlight);
		this._svg.appendChild(this._downHighlight);
		
		const center: number = this._editorWidth * 0.5;
		const base: number = 20;
		const tip: number = 9;
		const arrowWidth: number = 6;
		this._upHighlight.setAttribute("d", `M ${center} ${tip} L ${center + arrowWidth} ${base} L ${center - arrowWidth} ${base} z`);
		this._downHighlight.setAttribute("d", `M ${center} ${this._editorHeight - tip} L ${center + arrowWidth} ${this._editorHeight - base} L ${center - arrowWidth} ${this._editorHeight - base} z`);
		
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
		this._mouseY = (this._pointers.latest.getPointInNormalized(this.container).y) * this._editorHeight;
		if (this._doc.song.getChannelIsNoise(this._doc.channel)) return;
		this._updatePreview();
		
		if (this._mouseY >= this._barBottom - this._barHeight && this._mouseY <= this._barBottom) {
			this._dragging = true;
			this._change = null;
			this._dragStart = this._mouseY;
		}
	}
	
	private _onPointerMove = (event: PointerEvent): void => {
		this._mouseY = (this._pointers.latest.getPointInNormalized(this.container).y) * this._editorHeight;
		if (this._doc.song.getChannelIsNoise(this._doc.channel)) return;
		if (this._dragging) {
			const visibleOctaveCount: number = this._doc.getVisibleOctaveCount();
			const scrollableOctaves: number = Config.pitchOctaves - visibleOctaveCount;
			const continuingProspectiveChange: boolean = this._doc.lastChangeWas(this._change);
			const oldValue: number = continuingProspectiveChange ? this._change!.oldValue : this._doc.song.channels[this._doc.channel].octave;
			
			const currentOctave: number = this._doc.getBaseVisibleOctave(this._doc.channel);
			let octave: number = currentOctave;
			while (this._mouseY - this._dragStart < -this._octaveHeight * 0.5) {
				if (octave < scrollableOctaves) {
					octave++;
					this._dragStart -= this._octaveHeight;
				} else {
					break;
				}
			}
			while (this._mouseY - this._dragStart > this._octaveHeight * 0.5) {
				if (octave > 0) {
					octave--;
					this._dragStart += this._octaveHeight;
				} else {
					break;
				}
			}
			
			this._change = new ChangeOctave(this._doc, oldValue, Math.floor(octave + visibleOctaveCount * 0.5));
			this._doc.setProspectiveChange(this._change);
		}
		
		this._updatePreview();
	}
	
	private _onPointerUp = (event: PointerEvent): void => {
		if (!this._doc.song.getChannelIsNoise(this._doc.channel)) {
			if (this._dragging) {
				if (this._change != null) this._doc.record(this._change);
			} else {
				const visibleOctaveCount: number = this._doc.getVisibleOctaveCount();
				const scrollableOctaves: number = Config.pitchOctaves - visibleOctaveCount;
				const canReplaceLastChange: boolean = this._doc.lastChangeWas(this._change);
				const oldValue: number = canReplaceLastChange ? this._change!.oldValue : this._doc.song.channels[this._doc.channel].octave;
			
				const currentOctave: number = this._doc.getBaseVisibleOctave(this._doc.channel);
				if (this._mouseY < this._barBottom - this._barHeight * 0.5) {
					if (currentOctave < scrollableOctaves) {
						this._change = new ChangeOctave(this._doc, oldValue, Math.floor(currentOctave + 1 + visibleOctaveCount * 0.5));
						this._doc.record(this._change, canReplaceLastChange);
					}
				} else {
					if (currentOctave > 0) {
						this._change = new ChangeOctave(this._doc, oldValue, Math.floor(currentOctave - 1 + visibleOctaveCount * 0.5));
						this._doc.record(this._change, canReplaceLastChange);
					}
				}
			}
		}
		this._dragging = false;
		this._updatePreview();
	}
	
	private _updatePreview(): void {
		const showHighlight: boolean = this._pointers.latest.isHovering;
		let showUpHighlight: boolean = false;
		let showDownHighlight: boolean = false;
		let showHandleHighlight: boolean = false;
		
		if (showHighlight) {
			if (this._mouseY < this._barBottom - this._barHeight) {
				showUpHighlight = true;
			} else if (this._mouseY > this._barBottom) {
				showDownHighlight = true;
			} else {
				showHandleHighlight = true;
			}
		}
		
		this._upHighlight.style.display = showUpHighlight ? "" : "none";
		this._downHighlight.style.display = showDownHighlight ? "" : "none";
		this._handleHighlight.style.display = showHandleHighlight ? "" : "none";
	}
	
	private _documentChanged = (): void => {
		this._barBottom = this._editorHeight - (this._octaveHeight * this._doc.getBaseVisibleOctave(this._doc.channel));
		this._svg.style.display = (this._doc.song.getChannelIsNoise(this._doc.channel)) ? "none" : "";
		const visibleOctaveCount: number = this._doc.getVisibleOctaveCount();
		if (this._renderedBarBottom != this._barBottom || this._renderedVisibleOctaveCount != visibleOctaveCount) {
			this._renderedBarBottom = this._barBottom;
			this._renderedVisibleOctaveCount = visibleOctaveCount;
			this._barHeight = (this._octaveHeight * visibleOctaveCount + this._notchHeight);
			this._handle.setAttribute("height", String(this._barHeight));
			this._handleHighlight.setAttribute("height", String(this._barHeight));
			this._handle.setAttribute("y", String(this._barBottom - this._barHeight));
			this._handleHighlight.setAttribute("y", String(this._barBottom - this._barHeight));
		}
		this._updatePreview();
	}
}
