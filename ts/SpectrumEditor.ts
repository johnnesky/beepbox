/*
Copyright (C) 2019 John Nesky

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
/// <reference path="SongDocument.ts" />
/// <reference path="html.ts" />

namespace beepbox {
	export class SpectrumEditor {
		private readonly _editorWidth: number = 112;
		private readonly _editorHeight: number = 26;
		private readonly _fill = <SVGPathElement> svgElement("path", {fill: "#444444", "pointer-events": "none"});
		private readonly _octaves = <SVGSVGElement> svgElement("svg", {"pointer-events": "none"});
		private readonly _curve = <SVGPathElement> svgElement("path", {fill: "none", stroke: "currentColor", "stroke-width": 2, "pointer-events": "none"});
		private readonly _svg = <SVGSVGElement> svgElement("svg", {style: "background-color: #000000; touch-action: none; cursor: crosshair;", width: "100%", height: "100%", viewBox: "0 0 "+this._editorWidth+" "+this._editorHeight, preserveAspectRatio: "none"}, [
			this._fill,
			this._octaves,
			this._curve,
		]);
		
		public readonly container: HTMLElement = html.div({className: "spectrum", style: "height: 2em;"}, [this._svg]);
		
		private _mouseX: number = 0;
		private _mouseY: number = 0;
		private _freqPrev: number = 0;
		private _ampPrev: number = 0;
		private _mouseDown: boolean = false;
		private _change: ChangeSpectrum | null = null;
		private _renderedPath: String = "";
		
		constructor(private _doc: SongDocument) {
			for (let i: number = 0; i < Config.spectrumControlPoints; i += Config.spectrumControlPointsPerOctave) {
				this._octaves.appendChild(svgElement("rect", {fill: "#886644", x: (i+1) * this._editorWidth / (Config.spectrumControlPoints + 2) - 1, y: 0, width: 2, height: this._editorHeight}));
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
			return (Config.spectrumControlPoints + 2) * x / this._editorWidth - 1;
		}
		
		private _yToAmp(y: number): number {
			return Config.spectrumMax * (1 - (y - 1) / (this._editorHeight - 2));
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
			const boundingRect: ClientRect = this._svg.getBoundingClientRect();
    		this._mouseX = ((event.clientX || event.pageX) - boundingRect.left) * this._editorWidth / (boundingRect.right - boundingRect.left);
		    this._mouseY = ((event.clientY || event.pageY) - boundingRect.top) * this._editorHeight / (boundingRect.bottom - boundingRect.top);
		    if (isNaN(this._mouseX)) this._mouseX = 0;
		    if (isNaN(this._mouseY)) this._mouseY = 0;
		    this._whenCursorMoved();
		}
		
		private _whenTouchMoved = (event: TouchEvent): void => {
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
				
				if (freq != this._freqPrev) {
					const slope: number = (amp - this._ampPrev) / (freq - this._freqPrev);
					const offset: number = this._ampPrev - this._freqPrev * slope;
					const lowerFreq: number = Math.ceil(Math.min(this._freqPrev, freq));
					const upperFreq: number = Math.floor(Math.max(this._freqPrev, freq));
					for (let i: number = lowerFreq; i <= upperFreq; i++) {
						if (i < 0 || i >= Config.spectrumControlPoints) continue;
						instrument.spectrum[i] = Math.max(0, Math.min(Config.spectrumMax, Math.round(i * slope + offset)));
					}
				}
				
				instrument.spectrum[Math.max(0, Math.min(Config.spectrumControlPoints - 1, Math.round(freq)))] = Math.max(0, Math.min(Config.spectrumMax, Math.round(amp)));
				
				this._freqPrev = freq;
				this._ampPrev = amp;
				
				this._change = new ChangeSpectrum(this._doc, instrument);
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
			
			if (instrument.type == InstrumentType.spectrum) {
				let path = "M 0 " + (this._editorHeight - 1) + " ";
				for (let i = 0; i < Config.spectrumControlPoints; i++) {
					path += "L " + ((i + 1) * this._editorWidth / (Config.spectrumControlPoints + 2)) + " " + ((1 - (instrument.spectrum[i] / Config.spectrumMax)) * (this._editorHeight - 2) + 1) + " ";
				}
				path += "L " + this._editorWidth + " " + ((1 - (instrument.spectrum[Config.spectrumControlPoints - 1] / Config.spectrumMax)) * (this._editorHeight - 2) + 1) + " ";
				
				if (this._renderedPath != path) {
					this._renderedPath = path;
					this._curve.setAttribute("d", path);
					this._fill.setAttribute("d", path + " L " + this._editorWidth + " " + this._editorHeight + " L 0 " + this._editorHeight + " z ");
				}
			}
		}
	}
}
