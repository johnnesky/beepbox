// Copyright (C) 2020 John Nesky, distributed under the MIT license.

import { Config } from "../synth/SynthConfig";
import { HarmonicsWave, Instrument } from "../synth/synth";
import { SongDocument } from "./SongDocument";
import { HTML, SVG } from "imperative-html/dist/esm/elements-strict";
import { ColorConfig } from "./ColorConfig";
import { ChangeHarmonics } from "./changes";
import { prettyNumber } from "./EditorConfig";

//namespace beepbox {
export class HarmonicsEditor {
	private readonly _editorWidth: number = 112;
	private readonly _editorHeight: number = 26;
	private readonly _octaves: SVGSVGElement = SVG.svg({ "pointer-events": "none" });
	private readonly _fifths: SVGSVGElement = SVG.svg({ "pointer-events": "none" });
	private readonly _curve: SVGPathElement = SVG.path({ fill: "none", stroke: "currentColor", "stroke-width": 2, "pointer-events": "none" });
	private readonly _lastControlPoints: SVGRectElement[] = [];
	private readonly _lastControlPointContainer: SVGSVGElement = SVG.svg({ "pointer-events": "none" });
	private readonly _svg: SVGSVGElement = SVG.svg({ style: "background-color: ${ColorConfig.editorBackground}; touch-action: none; cursor: crosshair;", width: "100%", height: "100%", viewBox: "0 0 " + this._editorWidth + " " + this._editorHeight, preserveAspectRatio: "none" },
		this._octaves,
		this._fifths,
		this._curve,
		this._lastControlPointContainer,
	);

	public readonly container: HTMLElement = HTML.div({ class: "harmonics", style: "height: 2em;" }, this._svg);

	private _mouseX: number = 0;
	private _mouseY: number = 0;
	private _freqPrev: number = 0;
	private _ampPrev: number = 0;
	private _mouseDown: boolean = false;
	private _change: ChangeHarmonics | null = null;
	private _renderedPath: String = "";
	private _renderedFifths: boolean = true;

	constructor(private _doc: SongDocument) {
		for (let i: number = 1; i <= Config.harmonicsControlPoints; i = i * 2) {
			this._octaves.appendChild(SVG.rect({ fill: ColorConfig.tonic, x: (i - 0.5) * (this._editorWidth - 8) / (Config.harmonicsControlPoints - 1) - 1, y: 0, width: 2, height: this._editorHeight }));
		}
		for (let i: number = 3; i <= Config.harmonicsControlPoints; i = i * 2) {
			this._fifths.appendChild(SVG.rect({ fill: ColorConfig.fifthNote, x: (i - 0.5) * (this._editorWidth - 8) / (Config.harmonicsControlPoints - 1) - 1, y: 0, width: 2, height: this._editorHeight }));
		}
		for (let i: number = 0; i < 4; i++) {
			const rect: SVGRectElement = SVG.rect({ fill: "currentColor", x: (this._editorWidth - i * 2 - 1), y: 0, width: 1, height: this._editorHeight });
			this._lastControlPoints.push(rect);
			this._lastControlPointContainer.appendChild(rect);
		}

		this.container.addEventListener("mousedown", this._whenMousePressed);
		document.addEventListener("mousemove", this._whenMouseMoved);
		document.addEventListener("mouseup", this._whenCursorReleased);

		this.container.addEventListener("touchstart", this._whenTouchPressed);
		this.container.addEventListener("touchmove", this._whenTouchMoved);
		this.container.addEventListener("touchend", this._whenCursorReleased);
		this.container.addEventListener("touchcancel", this._whenCursorReleased);
	}

	private _xToFreq(x: number): number {
		return (Config.harmonicsControlPoints - 1) * x / (this._editorWidth - 8) - 0.5;
	}

	private _yToAmp(y: number): number {
		return Config.harmonicsMax * (1 - y / this._editorHeight);
	}

	private _whenMousePressed = (event: MouseEvent): void => {
		event.preventDefault();
		this._mouseDown = true;
		const boundingRect: ClientRect = this._svg.getBoundingClientRect();
		this._mouseX = ((event.clientX || event.pageX) - boundingRect.left) * this._editorWidth / (boundingRect.right - boundingRect.left);
		this._mouseY = ((event.clientY || event.pageY) - boundingRect.top) * this._editorHeight / (boundingRect.bottom - boundingRect.top);
		if (isNaN(this._mouseX)) this._mouseX = 0;
		if (isNaN(this._mouseY)) this._mouseY = 0;

		this._freqPrev = this._xToFreq(this._mouseX);
		this._ampPrev = this._yToAmp(this._mouseY);
		this._whenCursorMoved();
	}

	private _whenTouchPressed = (event: TouchEvent): void => {
		event.preventDefault();
		this._mouseDown = true;
		const boundingRect: ClientRect = this._svg.getBoundingClientRect();
		this._mouseX = (event.touches[0].clientX - boundingRect.left) * this._editorWidth / (boundingRect.right - boundingRect.left);
		this._mouseY = (event.touches[0].clientY - boundingRect.top) * this._editorHeight / (boundingRect.bottom - boundingRect.top);
		if (isNaN(this._mouseX)) this._mouseX = 0;
		if (isNaN(this._mouseY)) this._mouseY = 0;

		this._freqPrev = this._xToFreq(this._mouseX);
		this._ampPrev = this._yToAmp(this._mouseY);
		this._whenCursorMoved();
	}

	private _whenMouseMoved = (event: MouseEvent): void => {
		if (this.container.offsetParent == null) return;
		const boundingRect: ClientRect = this._svg.getBoundingClientRect();
		this._mouseX = ((event.clientX || event.pageX) - boundingRect.left) * this._editorWidth / (boundingRect.right - boundingRect.left);
		this._mouseY = ((event.clientY || event.pageY) - boundingRect.top) * this._editorHeight / (boundingRect.bottom - boundingRect.top);
		if (isNaN(this._mouseX)) this._mouseX = 0;
		if (isNaN(this._mouseY)) this._mouseY = 0;
		this._whenCursorMoved();
	}

	private _whenTouchMoved = (event: TouchEvent): void => {
		if (this.container.offsetParent == null) return;
		if (!this._mouseDown) return;
		event.preventDefault();
		const boundingRect: ClientRect = this._svg.getBoundingClientRect();
		this._mouseX = (event.touches[0].clientX - boundingRect.left) * this._editorWidth / (boundingRect.right - boundingRect.left);
		this._mouseY = (event.touches[0].clientY - boundingRect.top) * this._editorHeight / (boundingRect.bottom - boundingRect.top);
		if (isNaN(this._mouseX)) this._mouseX = 0;
		if (isNaN(this._mouseY)) this._mouseY = 0;
		this._whenCursorMoved();
	}

	private _whenCursorMoved(): void {
		if (this._mouseDown) {
			const freq: number = this._xToFreq(this._mouseX);
			const amp: number = this._yToAmp(this._mouseY);

			const instrument: Instrument = this._doc.song.channels[this._doc.channel].instruments[this._doc.getCurrentInstrument()];
			const harmonicsWave: HarmonicsWave = instrument.harmonicsWave; //(this._harmonicsIndex == null) ? instrument.harmonicsWave : instrument.drumsetSpectrumWaves[this._harmonicsIndex];

			if (freq != this._freqPrev) {
				const slope: number = (amp - this._ampPrev) / (freq - this._freqPrev);
				const offset: number = this._ampPrev - this._freqPrev * slope;
				const lowerFreq: number = Math.ceil(Math.min(this._freqPrev, freq));
				const upperFreq: number = Math.floor(Math.max(this._freqPrev, freq));
				for (let i: number = lowerFreq; i <= upperFreq; i++) {
					if (i < 0 || i >= Config.harmonicsControlPoints) continue;
					harmonicsWave.harmonics[i] = Math.max(0, Math.min(Config.harmonicsMax, Math.round(i * slope + offset)));
				}
			}

			harmonicsWave.harmonics[Math.max(0, Math.min(Config.harmonicsControlPoints - 1, Math.round(freq)))] = Math.max(0, Math.min(Config.harmonicsMax, Math.round(amp)));

			this._freqPrev = freq;
			this._ampPrev = amp;

			this._change = new ChangeHarmonics(this._doc, instrument, harmonicsWave);
			this._doc.setProspectiveChange(this._change);
		}
	}

	private _whenCursorReleased = (event: Event): void => {
		if (this._mouseDown) {
			this._doc.record(this._change!);
			this._change = null;
		}
		this._mouseDown = false;
	}

	public render(): void {
		const instrument: Instrument = this._doc.song.channels[this._doc.channel].instruments[this._doc.getCurrentInstrument()];
		const harmonicsWave: HarmonicsWave = instrument.harmonicsWave; //(this._harmonicsIndex == null) ? instrument.harmonicsWave : instrument.drumsetSpectrumWaves[this._harmonicsIndex];
		const controlPointToHeight = (point: number): number => {
			return (1 - (point / Config.harmonicsMax)) * this._editorHeight;
		}

		let bottom: string = prettyNumber(this._editorHeight);
		let path: string = "";
		for (let i: number = 0; i < Config.harmonicsControlPoints - 1; i++) {
			if (harmonicsWave.harmonics[i] == 0) continue;
			let xPos: string = prettyNumber((i + 0.5) * (this._editorWidth - 8) / (Config.harmonicsControlPoints - 1));
			path += "M " + xPos + " " + bottom + " ";
			path += "L " + xPos + " " + prettyNumber(controlPointToHeight(harmonicsWave.harmonics[i])) + " ";
		}

		const lastHeight: number = controlPointToHeight(harmonicsWave.harmonics[Config.harmonicsControlPoints - 1]);
		for (let i: number = 0; i < 4; i++) {
			const rect: SVGRectElement = this._lastControlPoints[i];
			rect.setAttribute("y", prettyNumber(lastHeight));
			rect.setAttribute("height", prettyNumber(this._editorHeight - lastHeight));
		}

		if (this._renderedPath != path) {
			this._renderedPath = path;
			this._curve.setAttribute("d", path);
		}
		if (this._renderedFifths != this._doc.showFifth) {
			this._renderedFifths = this._doc.showFifth;
			this._fifths.style.display = this._doc.showFifth ? "" : "none";
		}
	}
}
//}
