// Copyright (C) 2020 John Nesky, distributed under the MIT license.

import {FilterCoefficients, FrequencyResponse} from "../synth/filtering";
import {FilterType, Config} from "../synth/SynthConfig";
import {FilterSettings, FilterControlPoint, Instrument} from "../synth/synth";
import {SongDocument} from "./SongDocument";
import {HTML, SVG} from "imperative-html/dist/esm/elements-strict";
import {ColorConfig} from "./ColorConfig";
import {ChangeSequence, UndoableChange} from "./Change";
import {ChangeFilterAddPoint, ChangeFilterMovePoint} from "./changes";
import {prettyNumber} from "./EditorConfig";

export class FilterEditor {
	private readonly _editorWidth: number = 112;
	private readonly _editorHeight: number = 26;
	private readonly _responsePath: SVGPathElement = SVG.path({fill: ColorConfig.uiWidgetBackground, "pointer-events": "none"});
	//private readonly _octaves: SVGSVGElement = SVG.svg({"pointer-events": "none", overflow: "visible"});
	private readonly _controlPointPath: SVGPathElement = SVG.path({fill: "currentColor", "pointer-events": "none"});
	private readonly _dottedLinePath: SVGPathElement = SVG.path({fill: "none", stroke: "currentColor", "stroke-width": 1, "stroke-dasharray": "3, 2", "pointer-events": "none"});
	private readonly _highlight: SVGCircleElement = SVG.circle({fill: "white", stroke: "none", "pointer-events": "none", r: 4});
	private readonly _svg: SVGSVGElement = SVG.svg({style: `background-color: ${ColorConfig.editorBackground}; touch-action: none;`, width: "100%", height: "100%", viewBox: "0 0 "+this._editorWidth+" "+this._editorHeight, preserveAspectRatio: "none"},
		this._responsePath,
		//this._octaves,
		this._dottedLinePath,
		this._highlight,
		this._controlPointPath,
	);
	private readonly _label: HTMLDivElement = HTML.div({style: "position: absolute; bottom: 0; left: 2px; font-size: 8px; line-height: 1; pointer-events: none;"});
	
	public readonly container: HTMLElement = HTML.div({class: "filterEditor", style: "height: 2em; position: relative;"},
		this._svg,
		this._label,
	);
	private readonly _pointRadius: number = 2;
	
	private _touchMode: boolean = false;
	private _mouseX: number = 0;
	private _mouseY: number = 0;
	private _mouseOver: boolean = false;
	private _mouseDown: boolean = false;
	private _mouseDragging: boolean = false;
	private _addingPoint: boolean = false;
	private _deletingPoint: boolean = false;
	private _addedType: FilterType = FilterType.peak;
	private _selectedIndex: number = 0;
	private _freqStart: number = 0;
	private _gainStart: number = 0;
	private _dragChange: UndoableChange | null = null;
	
	private _filterSettings: FilterSettings;
	private _renderedSelectedIndex: number = -1;
	private _renderedPointCount: number = -1;
	private _renderedPointTypes: number = -1;
	private _renderedPointFreqs: number = -1;
	private _renderedPointGains: number = -1;
	//private _renderedKey: number = -1;
	
	constructor(private _doc: SongDocument) {
		/*
		for (let i: number = 0; i < Config.filterFreqRange * Config.filterFreqStep; i++) {
			this._octaves.appendChild(SVG.rect({fill: ColorConfig.tonic, x: i * this._editorWidth / (Config.filterFreqRange * Config.filterFreqStep) - 0.5, y: 0, width: 1, height: this._editorHeight}));
		}
		*/
		this.container.addEventListener("mousedown", this._whenMousePressed);
		this.container.addEventListener("mouseover", this._whenMouseOver);
		this.container.addEventListener("mouseout", this._whenMouseOut);
		document.addEventListener("mousemove", this._whenMouseMoved);
		document.addEventListener("mouseup", this._whenCursorReleased);
		
		this.container.addEventListener("touchstart", this._whenTouchPressed);
		this.container.addEventListener("touchmove", this._whenTouchMoved);
		this.container.addEventListener("touchend", this._whenCursorReleased);
		this.container.addEventListener("touchcancel", this._whenCursorReleased);
	}
	
	private _xToFreq(x: number): number {
		return Config.filterFreqRange * x / this._editorWidth - 0.5;
	}
	private _freqToX(freq: number): number {
		return this._editorWidth * (freq + 0.5) / Config.filterFreqRange;
	}
	private _yToGain(y: number): number {
		return (Config.filterGainRange - 1) * (1 - (y - .5) / (this._editorHeight - 1));
	}
	private _gainToY(gain: number): number {
		return (this._editorHeight - 1) * (1 - gain / (Config.filterGainRange - 1)) + .5;
	}
	
	private _whenMouseOver = (event: MouseEvent): void => {
		this._mouseOver = true;
	}
	
	private _whenMouseOut = (event: MouseEvent): void => {
		this._mouseOver = false;
		this._updatePath();
	}
	
	private _whenMousePressed = (event: MouseEvent): void => {
		event.preventDefault();
		this._touchMode = false;
		const boundingRect: ClientRect = this._svg.getBoundingClientRect();
		this._mouseX = ((event.clientX || event.pageX) - boundingRect.left) * this._editorWidth / (boundingRect.right - boundingRect.left);
		this._mouseY = ((event.clientY || event.pageY) - boundingRect.top) * this._editorHeight / (boundingRect.bottom - boundingRect.top);
		if (isNaN(this._mouseX)) this._mouseX = 0;
		if (isNaN(this._mouseY)) this._mouseY = 0;
		this._whenCursorPressed();
	}
	
	private _whenTouchPressed = (event: TouchEvent): void => {
		event.preventDefault();
		this._touchMode = true;
		const boundingRect: ClientRect = this._svg.getBoundingClientRect();
		this._mouseX = (event.touches[0].clientX - boundingRect.left) * this._editorWidth / (boundingRect.right - boundingRect.left);
		this._mouseY = (event.touches[0].clientY - boundingRect.top) * this._editorHeight / (boundingRect.bottom - boundingRect.top);
		if (isNaN(this._mouseX)) this._mouseX = 0;
		if (isNaN(this._mouseY)) this._mouseY = 0;
		this._whenCursorPressed();
	}
	
	private _whenMouseMoved = (event: MouseEvent): void => {
		if (this.container.offsetParent == null) return;
		const boundingRect: ClientRect = this._svg.getBoundingClientRect();
		this._mouseX = ((event.clientX || event.pageX) - boundingRect.left) * this._editorWidth / (boundingRect.right - boundingRect.left);
		this._mouseY = ((event.clientY || event.pageY) - boundingRect.top) * this._editorHeight / (boundingRect.bottom - boundingRect.top);
		if (isNaN(this._mouseX)) this._mouseX = 0;
		if (isNaN(this._mouseY)) this._mouseY = 0;
		if (!this._mouseDown) this._updateCursor();
		this._whenCursorMoved();
	}
	
	private _whenTouchMoved = (event: TouchEvent): void => {
		if (this.container.offsetParent == null) return;
		if (this._mouseDown) event.preventDefault();
		const boundingRect: ClientRect = this._svg.getBoundingClientRect();
		this._mouseX = (event.touches[0].clientX - boundingRect.left) * this._editorWidth / (boundingRect.right - boundingRect.left);
		this._mouseY = (event.touches[0].clientY - boundingRect.top) * this._editorHeight / (boundingRect.bottom - boundingRect.top);
		if (isNaN(this._mouseX)) this._mouseX = 0;
		if (isNaN(this._mouseY)) this._mouseY = 0;
		if (!this._mouseDown) this._updateCursor();
		this._whenCursorMoved();
	}
	
	private _whenCursorPressed(): void {
		this._mouseDown = true;
		const sequence: ChangeSequence = new ChangeSequence();
		this._dragChange = sequence;
		this._doc.setProspectiveChange(this._dragChange);
		this._updateCursor();
		this._whenCursorMoved();
	}
	
	private _updateCursor(): void {
		this._freqStart = this._xToFreq(this._mouseX);
		this._gainStart = this._yToGain(this._mouseY);
		
		this._addingPoint = true;
		this._selectedIndex = -1;
		let nearestDistance: number = Number.POSITIVE_INFINITY;
		for (let i: number = 0; i < this._filterSettings.controlPointCount; i++) {
			const point: FilterControlPoint = this._filterSettings.controlPoints[i];
			const distance: number = Math.sqrt(Math.pow(this._freqToX(point.freq) - this._mouseX, 2) + Math.pow(this._gainToY(point.gain) - this._mouseY, 2));
			if ((distance <= 13 || this._filterSettings.controlPointCount >= Config.filterMaxPoints) && distance < nearestDistance) {
				nearestDistance = distance;
				this._selectedIndex = i;
				this._addingPoint = false;
			}
		}
		if (this._addingPoint) {
			const ratio: number = this._mouseX / this._editorWidth;
			if (ratio < 0.2) {
				this._addedType = FilterType.highPass;
			} else if (ratio < 0.8) {
				this._addedType = FilterType.peak;
			} else {
				this._addedType = FilterType.lowPass;
			}
		}
	}
	
	private _whenCursorMoved(): void {
		if (this._dragChange != null && this._doc.lastChangeWas(this._dragChange)) {
			this._dragChange.undo();
		} else {
			this._mouseDown = false;
		}
		this._dragChange = null;
		this._deletingPoint = false;
		
		if (this._mouseDown) {
			const sequence: ChangeSequence = new ChangeSequence();
			this._dragChange = sequence;
			this._doc.setProspectiveChange(this._dragChange);
			
			if (this._addingPoint) {
				const gain: number = Math.max(0, Math.min(Config.filterGainRange - 1, Math.round(this._yToGain(this._mouseY))));
				const freq: number = this._findNearestFreqSlot(this._filterSettings, this._xToFreq(this._mouseX), -1);
				if (freq >= 0 && freq < Config.filterFreqRange) {
					const point: FilterControlPoint = new FilterControlPoint();
					point.type = this._addedType;
					point.freq = freq;
					point.gain = gain;
					sequence.append(new ChangeFilterAddPoint(this._doc, this._filterSettings, point, this._filterSettings.controlPointCount));
				} else {
					this._deletingPoint = true;
				}
			} else if (this._selectedIndex >= this._filterSettings.controlPointCount || this._selectedIndex == -1) {
				this._dragChange = null;
				this._mouseDown = false;
			} else {
				const freqDelta: number = this._xToFreq(this._mouseX) - this._freqStart;
				const gainDelta: number = this._yToGain(this._mouseY) - this._gainStart;
				const point: FilterControlPoint = this._filterSettings.controlPoints[this._selectedIndex];
				const gain: number = Math.max(0, Math.min(Config.filterGainRange - 1, Math.round(point.gain + gainDelta)));
				const freq: number = this._findNearestFreqSlot(this._filterSettings, point.freq + freqDelta, this._selectedIndex);
				
				if (Math.round(freqDelta) != 0.0 || Math.round(gainDelta) != 0.0 || freq != point.freq || gain != point.gain) {
					this._mouseDragging = true;
				}
				
				if (freq >= 0 && freq < Config.filterFreqRange) {
					sequence.append(new ChangeFilterMovePoint(this._doc, point, point.freq, freq, point.gain, gain));
				} else {
					sequence.append(new ChangeFilterAddPoint(this._doc, this._filterSettings, point, this._selectedIndex, true));
					this._deletingPoint = true;
				}
			}
		}
		if (this._mouseDown || this._mouseOver) {
			this._updatePath();
		}
	}
	
	private _whenCursorReleased = (event: Event): void => {
		if (this._mouseDown && this._doc.lastChangeWas(this._dragChange) && this._dragChange != null) {
			if (!this._addingPoint && !this._mouseDragging && !this._touchMode) {
				if (this._selectedIndex < this._filterSettings.controlPointCount && this._selectedIndex != -1) {
					const point: FilterControlPoint = this._filterSettings.controlPoints[this._selectedIndex];
					this._doc.record(new ChangeFilterAddPoint(this._doc, this._filterSettings, point, this._selectedIndex, true));
				}
			} else {
				this._doc.record(this._dragChange);
			}
			this._updatePath();
		}
		this._dragChange = null;
		this._mouseDragging = false;
		this._deletingPoint = false;
		this._mouseDown = false;
		this._updateCursor();
	}
	
	private _findNearestFreqSlot(filterSettings: FilterSettings, targetFreq: number, ignoreIndex: number): number {
		const roundedFreq: number = Math.round(targetFreq);
		let lowerFreq: number = roundedFreq;
		let upperFreq: number = roundedFreq;
		let tryingLower: boolean = (roundedFreq <= targetFreq);
		while (true) {
			let foundConflict: boolean = false;
			const currentFreq: number = tryingLower ? lowerFreq : upperFreq;
			for (let i: number = 0; i < filterSettings.controlPointCount; i++) {
				if (i == ignoreIndex) continue;
				if (filterSettings.controlPoints[i].freq == currentFreq) {
					foundConflict = true;
					break;
				}
			}
			if (!foundConflict) return currentFreq;
			tryingLower = !tryingLower;
			if (tryingLower) lowerFreq--;
			if (!tryingLower) upperFreq++;
		}
	}
	
	private static _circlePath(cx: number, cy: number, radius: number, reverse: boolean = false): string {
		return `M ${cx - radius} ${cy} ` +
			`a ${radius} ${radius} 0 1 ${reverse?1:0} ${ radius * 2} 0 ` +
			`a ${radius} ${radius} 0 1 ${reverse?1:0} ${-radius * 2} 0 `;
	}
	
	private _updatePath(): void {
		this._highlight.style.display = "none";
		this._label.textContent = "";
		
		let controlPointPath: string = "";
		let dottedLinePath: string = "";
		for (let i: number = 0; i < this._filterSettings.controlPointCount; i++) {
			const point: FilterControlPoint = this._filterSettings.controlPoints[i];
			const pointX: number = this._freqToX(point.freq);
			const pointY: number = this._gainToY(point.gain);
			
			controlPointPath += FilterEditor._circlePath(pointX, pointY, this._pointRadius);
			
			if (point.type == FilterType.highPass) {
				dottedLinePath += "M " + 0 + " " + pointY + " L " + pointX + " " + pointY + " ";
			} else if (point.type == FilterType.lowPass) {
				dottedLinePath += "M " + this._editorWidth + " " + pointY + " L " + pointX + " " + pointY + " ";
			}
			
			if (this._selectedIndex == i && this._mouseOver && !this._mouseDown) {
				this._highlight.setAttribute("cx", String(pointX));
				this._highlight.setAttribute("cy", String(pointY));
				this._highlight.style.display = "";
			}
			if ((this._selectedIndex == i || (this._addingPoint && this._mouseDown && i == this._filterSettings.controlPointCount - 1)) && (this._mouseOver || this._mouseDown) && !this._deletingPoint) {
				this._label.textContent = (i + 1) + ": " + Config.filterTypeNames[point.type];// + " " + prettyNumber(point.getHz()) + "Hz";
			}
		}
		this._controlPointPath.setAttribute("d", controlPointPath);
		this._dottedLinePath.setAttribute("d", dottedLinePath);
		if (this._addingPoint && !this._mouseDown && this._mouseOver) {
			this._label.textContent = "+ " + Config.filterTypeNames[this._addedType];
		}
		
		//let volumeCompensation: number = 1.0;
		const standardSampleRate: number = 44800;
		const filters: FilterCoefficients[] = [];
		for (let i: number = 0; i < this._filterSettings.controlPointCount; i++) {
			const point: FilterControlPoint = this._filterSettings.controlPoints[i];
			const filter: FilterCoefficients = new FilterCoefficients();
			point.toCoefficients(filter, standardSampleRate);
			filters.push(filter);
			//volumeCompensation *= point.getVolumeCompensationMult();
		}
		
		const response: FrequencyResponse = new FrequencyResponse();
		let responsePath: string = "M 0 " + this._editorHeight + " ";
		for (let i: number = -1; i <= Config.filterFreqRange; i++) {
			const hz: number = FilterControlPoint.getHzFromSettingValue(i);
			const cornerRadiansPerSample: number = 2.0 * Math.PI * hz / standardSampleRate;
			const real: number = Math.cos(cornerRadiansPerSample);
			const imag: number = Math.sin(cornerRadiansPerSample);
			
			let linearGain: number = 1.0; //volumeCompensation;
			for (const filter of filters) {
				response.analyzeComplex(filter, real, imag);
				linearGain *= response.magnitude();
			}
			
			const gainSetting: number = Math.log2(linearGain) / Config.filterGainStep + Config.filterGainCenter;
			const y: number = this._gainToY(gainSetting);
			const x: number = this._freqToX(i);
			responsePath += "L " + prettyNumber(x) + " " + prettyNumber(y) + " ";
		}
		
		responsePath += "L " + this._editorWidth + " " + this._editorHeight + " L 0 " + this._editorHeight + " z ";
		this._responsePath.setAttribute("d", responsePath);
	}
	
	public render(): void {
		const instrument: Instrument = this._doc.song.channels[this._doc.channel].instruments[this._doc.getCurrentInstrument()];
		const filterSettings: FilterSettings = instrument.filter;
		if (this._filterSettings != filterSettings) {
			this._dragChange = null;
			this._mouseDown = false;
		}
		this._filterSettings = filterSettings;
		if (!this._mouseDown) this._updateCursor();
		
		let pointTypes: number = 0;
		let pointFreqs: number = 0;
		let pointGains: number = 0;
		for (let i: number = 0; i < filterSettings.controlPointCount; i++) {
			const point: FilterControlPoint = filterSettings.controlPoints[i];
			pointTypes = pointTypes * FilterType.length      + point.type;
			pointFreqs = pointFreqs * Config.filterFreqRange + point.freq;
			pointGains = pointGains * Config.filterGainRange + point.gain;
		}
		if (this._renderedSelectedIndex != this._selectedIndex ||
			this._renderedPointCount != filterSettings.controlPointCount ||
			this._renderedPointTypes != pointTypes ||
			this._renderedPointFreqs != pointFreqs ||
			this._renderedPointGains != pointGains)
		{
			this._renderedSelectedIndex = this._selectedIndex;
			this._renderedPointCount = filterSettings.controlPointCount;
			this._renderedPointTypes = pointTypes;
			this._renderedPointFreqs = pointFreqs;
			this._renderedPointGains = pointGains;
			this._updatePath();
		}
		
		/*
		if (this._renderedKey != this._doc.song.key) {
			this._renderedKey = this._doc.song.key;
			const tonicHz: number = Instrument.frequencyFromPitch(Config.keys[this._doc.song.key].basePitch);
			const x: number = this._freqToX(FilterControlPoint.getSettingValueFromHz(tonicHz));
			this._octaves.setAttribute("x", String(x));
		}
		*/
	}
}
