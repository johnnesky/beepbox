// Copyright (c) John Nesky and contributing authors, distributed under the MIT license, see accompanying the LICENSE.md file.

import {ColorConfig} from "./ColorConfig.js";
import {SongDocument} from "./SongDocument.js";
import {ChannelRow} from "./ChannelRow.js";
import {HTML, SVG} from "imperative-html/dist/esm/elements-strict.js";
import {EasyPointers, Point2d} from "./EasyPointers.js";

export class TrackEditor {
	private readonly _channelRowContainer: HTMLElement = HTML.div({style: "display: flex; flex-direction: column;"});
	private readonly _playhead: SVGRectElement = SVG.rect({fill: ColorConfig.playhead, x: 0, y: 0, width: 4, height: 128});
	private readonly _boxHighlight: SVGRectElement = SVG.rect({fill: "none", stroke: ColorConfig.hoverPreview, "stroke-width": 2, "pointer-events": "none", x: 1, y: 1, width: 30, height: 30});
	private readonly _upHighlight: SVGPathElement = SVG.path({fill: ColorConfig.invertedText, stroke: ColorConfig.invertedText, "stroke-width": 1, "pointer-events": "none"});
	private readonly _downHighlight: SVGPathElement = SVG.path({fill: ColorConfig.invertedText, stroke: ColorConfig.invertedText, "stroke-width": 1, "pointer-events": "none"});
	private readonly _selectionRect: SVGRectElement = SVG.rect({fill: ColorConfig.boxSelectionFill, stroke: ColorConfig.hoverPreview, "stroke-width": 2, "stroke-dasharray": "5, 3", "pointer-events": "none", display: "none", x: 1, y: 1, width: 62, height: 62});
	private readonly _svg: SVGSVGElement = SVG.svg({style: `position: absolute; top: 0;`},
		this._selectionRect,
		this._boxHighlight,
		this._upHighlight,
		this._downHighlight,
		this._playhead,
	);
	private readonly _select: HTMLSelectElement = HTML.select({class: "trackSelectBox", style: "background: none; border: none; appearance: none; border-radius: initial; box-shadow: none; color: transparent; position: absolute; touch-action: none;"});
	public readonly container: HTMLElement = HTML.div({class: "noSelection", style: "position: relative; overflow: hidden;"},
		this._channelRowContainer,
		this._svg,
		this._select,
	);
	
	private readonly _pointers: EasyPointers = new EasyPointers(this.container);
	
	private readonly _channels: ChannelRow[] = [];
	private _mouseX: number = 0;
	private _mouseY: number = 0;
	private _mouseStartBar: number = 0;
	private _mouseStartChannel: number = 0;
	private _mouseBar: number = 0;
	private _mouseChannel: number = 0;
	private _mouseDragging = false;
	private _barWidth: number = 32;
	private _renderedEditorWidth: number = -1;
	private _renderedEditorHeight: number = -1;
	private _renderedPatternCount: number = 0;
	private _renderedPlayhead: number = -1;
	
	constructor(private _doc: SongDocument) {
		window.requestAnimationFrame(this._animatePlayhead);
		
		// HACK: In my testing of mobile Chrome, it seems to bias towards tapping on the
		// select menu unless the svg element has a mousedown listener.
		this._svg.addEventListener("mousedown", event => {/* Do nothing. */});
		
		this.container.addEventListener("pointerenter", this._onPointerMove);
		this.container.addEventListener("pointerleave", this._onPointerLeave);
		this.container.addEventListener("pointerdown", this._onPointerDown);
		this.container.addEventListener("pointermove", this._onPointerMove);
		this.container.addEventListener("pointerup", this._onPointerUp);
		//this.container.addEventListener("pointercancel", this._onPointerUp);
		
		this._select.addEventListener("change", this._whenSelectChanged);
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
	
	public movePlayheadToMouse(): boolean {
		if (this._pointers.latest.isPresent) {
			this._doc.synth.playhead = this._mouseBar + (this._mouseX % this._barWidth) / this._barWidth;
			return true;
		}
		return false;
	}
	
	private _dragBoxSelection(): void {
		this._doc.selection.setTrackSelection(this._doc.selection.boxSelectionX0, this._mouseBar, this._doc.selection.boxSelectionY0, this._mouseChannel);
		this._doc.selection.selectionUpdated();
	}
	
	private _updateMousePos(event: PointerEvent): void {
		const point: Point2d = event.pointer!.getPointIn(this.container);
		this._mouseX = point.x;
		this._mouseY = point.y;
		this._mouseBar = Math.floor(Math.min(this._doc.song.barCount - 1, Math.max(0, this._mouseX / this._barWidth)));
		this._mouseChannel = Math.floor(Math.min(this._doc.song.getChannelCount() - 1, Math.max(0, this._mouseY / ChannelRow.patternHeight)));
	}
	
	private _onPointerLeave = (event: PointerEvent): void => {
		this._updatePreview();
	}
	
	private _onPointerDown = (event: PointerEvent): void => {
		this._updateMousePos(event);
		this._mouseStartBar = this._mouseBar;
		this._mouseStartChannel = this._mouseChannel;
		if (event.target == this._select) {
			this._mouseDragging = true;
		} else if (event.shiftKey) {
			this._mouseDragging = true;
			this._doc.selection.setTrackSelection(this._doc.selection.boxSelectionX0, this._mouseBar, this._doc.selection.boxSelectionY0, this._mouseChannel);
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
	
	private _onPointerMove = (event: PointerEvent): void => {
		this._updateMousePos(event);
		if (event.pointer!.isDown) {
			if (this._mouseStartBar != this._mouseBar || this._mouseStartChannel != this._mouseChannel) {
				this._mouseDragging = true;
			}
			this._dragBoxSelection();
		}
		this._updatePreview();
	}
	
	private _onPointerUp = (event: PointerEvent): void => {
		if (!this._mouseDragging && !event.pointer!.isTouch) {
			if (this._doc.channel == this._mouseChannel && this._doc.bar == this._mouseBar) {
				const up: boolean = (this._mouseY % ChannelRow.patternHeight) < ChannelRow.patternHeight / 2;
				const patternCount: number = this._doc.song.patternsPerChannel;
				this._doc.selection.setPattern((this._doc.song.channels[this._mouseChannel].bars[this._mouseBar] + (up ? 1 : patternCount)) % (patternCount + 1));
			}
		}
		this._mouseDragging = false;
		this._updatePreview();
	}
	
	private _updatePreview(): void {
		let channel: number = this._mouseChannel;
		let bar: number = this._mouseBar;
		
		if (this._pointers.latest.isTouch) {
			bar = this._doc.bar;
			channel = this._doc.channel;
		}
		
		const selected: boolean = (bar == this._doc.bar && channel == this._doc.channel);
		
		if (this._pointers.latest.isHovering && !selected) {
			this._boxHighlight.setAttribute("x", "" + (1 + this._barWidth * bar));
			this._boxHighlight.setAttribute("y", "" + (1 + (ChannelRow.patternHeight * channel)));
			this._boxHighlight.setAttribute("height", "" + (ChannelRow.patternHeight - 2));
			this._boxHighlight.setAttribute("width", "" + (this._barWidth - 2));
			this._boxHighlight.style.display = "";
		} else {
			this._boxHighlight.style.display = "none";
		}
		
		if ((this._pointers.latest.isPresent && selected) || this._pointers.latest.isTouch) {
			const up: boolean = (this._mouseY % ChannelRow.patternHeight) < ChannelRow.patternHeight / 2;
			const center: number = this._barWidth * (bar + 0.8);
			const middle: number = ChannelRow.patternHeight * (channel + 0.5);
			const base: number = ChannelRow.patternHeight * 0.1;
			const tip: number = ChannelRow.patternHeight * 0.4;
			const width: number = ChannelRow.patternHeight * 0.175;
			
			this._upHighlight.setAttribute("fill", up && !this._pointers.latest.isTouch ? ColorConfig.hoverPreview : ColorConfig.invertedText);
			this._downHighlight.setAttribute("fill", !up && !this._pointers.latest.isTouch ? ColorConfig.hoverPreview : ColorConfig.invertedText);
			
			this._upHighlight.setAttribute("d", `M ${center} ${middle - tip} L ${center + width} ${middle - base} L ${center - width} ${middle - base} z`);
			this._downHighlight.setAttribute("d", `M ${center} ${middle + tip} L ${center + width} ${middle + base} L ${center - width} ${middle + base} z`);
			
			this._upHighlight.style.display = "";
			this._downHighlight.style.display = "";
		} else {
			this._upHighlight.style.display = "none";
			this._downHighlight.style.display = "none";
		}
		
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
		
		if (this._channels.length != this._doc.song.getChannelCount()) {
			for (let y: number = this._channels.length; y < this._doc.song.getChannelCount(); y++) {
				const channelRow: ChannelRow = new ChannelRow(this._doc, y);
				this._channels[y] = channelRow;
				this._channelRowContainer.appendChild(channelRow.container);
			}
			
			for (let y: number = this._doc.song.getChannelCount(); y < this._channels.length; y++) {
				this._channelRowContainer.removeChild(this._channels[y].container);
			}
			
			this._channels.length = this._doc.song.getChannelCount();
			this._pointers.latest.cancel();
		}
		
		for (let j: number = 0; j < this._doc.song.getChannelCount(); j++) {
			this._channels[j].render();
		}
		
		const editorWidth: number = this._barWidth * this._doc.song.barCount;
		if (this._renderedEditorWidth != editorWidth) {
			this._renderedEditorWidth = editorWidth;
			this._channelRowContainer.style.width = editorWidth + "px";
			this.container.style.width = editorWidth + "px";
			this._svg.setAttribute("width", editorWidth + "");
			this._pointers.latest.cancel();
		}
		
		const editorHeight: number = this._doc.song.getChannelCount() * ChannelRow.patternHeight;
		if (this._renderedEditorHeight != editorHeight) {
			this._renderedEditorHeight = editorHeight;
			this._svg.setAttribute("height", "" + editorHeight);
			this._playhead.setAttribute("height", "" + editorHeight);
			this.container.style.height = editorHeight + "px";
		}
		
		setTimeout(() => {
			// HACK: In my testing of mobile Chrome, it seems to open the select menu
			// after pointerup even if the select element wasn't under the finger until
			// rendering, unless I defer moving the select menu by a few milliseconds. :(
			this._select.style.display = this._pointers.latest.isTouch ? "" : "none";
			this._select.style.left = (this._barWidth * this._doc.bar) + "px";
			this._select.style.width = this._barWidth + "px";
			this._select.style.top = (ChannelRow.patternHeight * this._doc.channel) + "px";
			this._select.style.height = ChannelRow.patternHeight + "px";
		}, 50);
		
		if (this._doc.selection.boxSelectionActive) {
			// TODO: This causes the selection rectangle to repaint every time the
			// editor renders and the selection is visible. Check if anything changed
			// before overwriting the attributes?
			this._selectionRect.setAttribute("x", String(this._barWidth * this._doc.selection.boxSelectionBar + 1));
			this._selectionRect.setAttribute("y", String(ChannelRow.patternHeight * this._doc.selection.boxSelectionChannel + 1));
			this._selectionRect.setAttribute("width", String(this._barWidth * this._doc.selection.boxSelectionWidth - 2));
			this._selectionRect.setAttribute("height", String(ChannelRow.patternHeight * this._doc.selection.boxSelectionHeight - 2));
			this._selectionRect.setAttribute("display", "");
		} else {
			this._selectionRect.setAttribute("display", "none");
		}
		
		this._updatePreview();
	}
}
