// Copyright (c) 2012-2022 John Nesky and contributing authors, distributed under the MIT license, see accompanying the LICENSE.md file.

import {Config} from "../synth/SynthConfig";
import {SongDocument} from "./SongDocument";
import {HTML} from "imperative-html/dist/esm/elements-strict";
import {ColorConfig} from "./ColorConfig";

export class Piano {
	private readonly _pianoContainer: HTMLDivElement = HTML.div({style: "width: 100%; height: 100%; display: flex; flex-direction: column-reverse; align-items: stretch;"});
	private readonly _drumContainer: HTMLDivElement = HTML.div({style: "width: 100%; height: 100%; display: flex; flex-direction: column-reverse; align-items: stretch;"});
	private readonly _preview: HTMLDivElement = HTML.div({style: `width: 100%; height: 40px; border: 2px solid ${ColorConfig.primaryText}; position: absolute; box-sizing: border-box; pointer-events: none;`});
	public readonly container: HTMLDivElement = HTML.div({style: "width: 32px; height: 100%; overflow: hidden; position: relative; flex-shrink: 0; touch-action: none;"},
		this._pianoContainer,
		this._drumContainer,
		this._preview,
	);
	private readonly _editorHeight: number = 481;
	private readonly _pianoKeys: HTMLDivElement[] = [];
	private readonly _pianoLabels: HTMLDivElement[] = [];
	
	private _pitchHeight: number;
	private _pitchCount: number;
	//private _mouseX: number = 0;
	private _mouseY: number = 0;
	private _mouseDown: boolean = false;
	private _mouseOver: boolean = false;
	private _cursorPitch: number;
	private _playedPitch: number = -1;
	private _renderedScale: number = -1;
	private _renderedDrums: boolean = false;
	private _renderedKey: number = -1;
	private _renderedPitchCount: number = -1;
	private readonly _renderedLiveInputPitches: number[] = [];
	
	constructor(private _doc: SongDocument) {
		for (let i: number = 0; i < Config.drumCount; i++) {
			const scale: number = (1.0 - (i / Config.drumCount) * 0.35) * 100;
			this._drumContainer.appendChild(HTML.div({class: "drum-button", style: `background-size: ${scale}% ${scale}%;`}));
		}
		
		this.container.addEventListener("mousedown", this._whenMousePressed);
		document.addEventListener("mousemove", this._whenMouseMoved);
		document.addEventListener("mouseup", this._whenMouseReleased);
		this.container.addEventListener("mouseover", this._whenMouseOver);
		this.container.addEventListener("mouseout", this._whenMouseOut);
		
		this.container.addEventListener("touchstart", this._whenTouchPressed);
		this.container.addEventListener("touchmove", this._whenTouchMoved);
		this.container.addEventListener("touchend", this._whenTouchReleased);
		this.container.addEventListener("touchcancel", this._whenTouchReleased);
		
		this._doc.notifier.watch(this._documentChanged);
		this._documentChanged();
		
		window.requestAnimationFrame(this._onAnimationFrame);
	}
	
	private _updateCursorPitch(): void {
		const scale: ReadonlyArray<boolean> = Config.scales[this._doc.song.scale].flags;
		const mousePitch: number = Math.max(0, Math.min(this._pitchCount-1, this._pitchCount - (this._mouseY / this._pitchHeight)));
		if (scale[Math.floor(mousePitch) % Config.pitchesPerOctave] || this._doc.song.getChannelIsNoise(this._doc.channel)) {
			this._cursorPitch = Math.floor(mousePitch);
		} else {
			let topPitch: number = Math.floor(mousePitch) + 1;
			let bottomPitch: number = Math.floor(mousePitch) - 1;
			while (!scale[topPitch % Config.pitchesPerOctave]) {
				topPitch++;
			}
			while (!scale[(bottomPitch) % Config.pitchesPerOctave]) {
				bottomPitch--;
			}
			let topRange: number = topPitch;
			let bottomRange: number = bottomPitch + 1;
			if (topPitch % Config.pitchesPerOctave == 0 || topPitch % Config.pitchesPerOctave == 7) {
				topRange -= 0.5;
			}
			if (bottomPitch % Config.pitchesPerOctave == 0 || bottomPitch % Config.pitchesPerOctave == 7) {
				bottomRange += 0.5;
			}
			this._cursorPitch = mousePitch - bottomRange > topRange - mousePitch ? topPitch : bottomPitch;
		}
	}
	
	private _playLiveInput(): void {
		const octaveOffset: number = this._doc.getBaseVisibleOctave(this._doc.channel) * Config.pitchesPerOctave;
		const currentPitch: number = this._cursorPitch + octaveOffset;
		if (this._playedPitch == currentPitch) return;
		this._doc.performance.removePerformedPitch(this._playedPitch);
		this._playedPitch = currentPitch;
		this._doc.performance.addPerformedPitch(currentPitch);
	}
	
	private _releaseLiveInput(): void {
		this._doc.performance.removePerformedPitch(this._playedPitch);
		this._playedPitch = -1;
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
		this._doc.synth.maintainLiveInput();
		this._mouseDown = true;
		const boundingRect: ClientRect = this.container.getBoundingClientRect();
		//this._mouseX = (event.clientX || event.pageX) - boundingRect.left;
		this._mouseY = ((event.clientY || event.pageY) - boundingRect.top) * this._editorHeight / (boundingRect.bottom - boundingRect.top);
		if (isNaN(this._mouseY)) this._mouseY = 0;
		this._updateCursorPitch();
		this._playLiveInput();
		this._updatePreview();
	}
	
	private _whenMouseMoved = (event: MouseEvent): void => {
		if (this._mouseDown || this._mouseOver) this._doc.synth.maintainLiveInput();
		const boundingRect: ClientRect = this.container.getBoundingClientRect();
		//this._mouseX = (event.clientX || event.pageX) - boundingRect.left;
		this._mouseY = ((event.clientY || event.pageY) - boundingRect.top) * this._editorHeight / (boundingRect.bottom - boundingRect.top);
		if (isNaN(this._mouseY)) this._mouseY = 0;
		this._updateCursorPitch();
		if (this._mouseDown) this._playLiveInput();
		this._updatePreview();
	}
	
	private _whenMouseReleased = (event: MouseEvent): void => {
		if (this._mouseDown) this._releaseLiveInput();
		this._mouseDown = false;
		this._updatePreview();
	}
	
	private _whenTouchPressed = (event: TouchEvent): void => {
		event.preventDefault();
		this._doc.synth.maintainLiveInput();
		this._mouseDown = true;
		const boundingRect: ClientRect = this.container.getBoundingClientRect();
		//this._mouseX = event.touches[0].clientX - boundingRect.left;
		this._mouseY = (event.touches[0].clientY - boundingRect.top) * this._editorHeight / (boundingRect.bottom - boundingRect.top);
		if (isNaN(this._mouseY)) this._mouseY = 0;
		this._updateCursorPitch();
		this._playLiveInput();
	}
	
	private _whenTouchMoved = (event: TouchEvent): void => {
		event.preventDefault();
		this._doc.synth.maintainLiveInput();
		const boundingRect: ClientRect = this.container.getBoundingClientRect();
		//this._mouseX = event.touches[0].clientX - boundingRect.left;
		this._mouseY = (event.touches[0].clientY - boundingRect.top) * this._editorHeight / (boundingRect.bottom - boundingRect.top);
		if (isNaN(this._mouseY)) this._mouseY = 0;
		this._updateCursorPitch();
		if (this._mouseDown) this._playLiveInput();
	}
	
	private _whenTouchReleased = (event: TouchEvent): void => {
		event.preventDefault();
		this._releaseLiveInput();
	}
	
	private _onAnimationFrame = (): void => {
		window.requestAnimationFrame(this._onAnimationFrame);
		
		let liveInputChanged: boolean = false;
		const liveInputPitchCount: number = !this._doc.performance.pitchesAreTemporary() ? this._doc.synth.liveInputPitches.length : 0;
		if (this._renderedLiveInputPitches.length != liveInputPitchCount) {
			liveInputChanged = true;
		}
		for (let i: number = 0; i < liveInputPitchCount; i++) {
			if (this._renderedLiveInputPitches[i] != this._doc.synth.liveInputPitches[i]) {
				this._renderedLiveInputPitches[i] = this._doc.synth.liveInputPitches[i];
				liveInputChanged = true;
			}
		}
		this._renderedLiveInputPitches.length = liveInputPitchCount;
		
		if (liveInputChanged) {
			this._updatePreview();
		}
	}
	
	private _updatePreview(): void {
		this._preview.style.visibility = (!this._mouseOver || this._mouseDown) ? "hidden" : "visible";
		
		if (this._mouseOver && !this._mouseDown) {
			const boundingRect: ClientRect = this.container.getBoundingClientRect();
			const pitchHeight: number = this._pitchHeight / (this._editorHeight / (boundingRect.bottom - boundingRect.top));
			
			this._preview.style.left = "0px";
			this._preview.style.top = pitchHeight * (this._pitchCount - this._cursorPitch - 1) + "px";
			this._preview.style.height = pitchHeight + "px";
		}
		
		const octaveOffset: number = this._doc.getBaseVisibleOctave(this._doc.channel) * Config.pitchesPerOctave;
		const container: HTMLDivElement = this._doc.song.getChannelIsNoise(this._doc.channel) ? this._drumContainer : this._pianoContainer;
		const children: HTMLCollection = container.children;
		for (let i: number = 0; i < children.length; i++) {
			const child: Element = children[i];
			if (this._renderedLiveInputPitches.indexOf(i + octaveOffset) == -1) {
				child.classList.remove("pressed");
			} else {
				child.classList.add("pressed");
			}
		}
	}
	
	private _documentChanged = (): void => {
		const isDrum: boolean = this._doc.song.getChannelIsNoise(this._doc.channel);
		this._pitchCount = isDrum ? Config.drumCount : this._doc.getVisiblePitchCount();
		this._pitchHeight = this._editorHeight / this._pitchCount;
		this._updateCursorPitch();
		if (this._mouseDown) this._playLiveInput();
		
		if (!this._doc.prefs.showLetters) return;
		if (this._renderedScale == this._doc.song.scale && this._renderedKey == this._doc.song.key && this._renderedDrums == isDrum && this._renderedPitchCount == this._pitchCount) return;
		
		this._renderedScale = this._doc.song.scale;
		this._renderedKey = this._doc.song.key;
		this._renderedDrums = isDrum;
		
		this._pianoContainer.style.display = isDrum ? "none" : "flex";
		this._drumContainer.style.display = isDrum ? "flex" : "none";
		
		if (!isDrum) {
			if (this._renderedPitchCount != this._pitchCount) {
				this._pianoContainer.innerHTML = "";
				for (let i: number = 0; i < this._pitchCount; i++) {
					const pianoLabel: HTMLDivElement = HTML.div({class: "piano-label", style: "font-weight: bold; -webkit-text-stroke-width: 0; font-size: 11px; font-family: sans-serif; position: absolute; padding-left: 15px;"});
					const pianoKey: HTMLDivElement = HTML.div({class: "piano-button", style: "background: gray;"}, pianoLabel);
					this._pianoContainer.appendChild(pianoKey);
					this._pianoLabels[i] = pianoLabel;
					this._pianoKeys[i] = pianoKey;
				}
				this._pianoLabels.length = this._pitchCount;
				this._pianoKeys.length = this._pitchCount;
				this._renderedPitchCount = this._pitchCount;
			}
			
			for (let j: number = 0; j < this._pitchCount; j++) {
				const pitchNameIndex: number = (j + Config.keys[this._doc.song.key].basePitch) % Config.pitchesPerOctave;
				const isWhiteKey: boolean = Config.keys[pitchNameIndex].isWhiteKey;
				this._pianoKeys[j].style.background = isWhiteKey ? ColorConfig.whitePianoKey : ColorConfig.blackPianoKey;
				if (!Config.scales[this._doc.song.scale].flags[j % Config.pitchesPerOctave]) {
					this._pianoKeys[j].classList.add("disabled");
					this._pianoLabels[j].style.display = "none";
				} else {
					this._pianoKeys[j].classList.remove("disabled");
					this._pianoLabels[j].style.display = "";
					
					const label: HTMLDivElement = this._pianoLabels[j];
					label.style.color = Config.keys[pitchNameIndex].isWhiteKey ? "black" : "white";
					label.textContent = Piano.getPitchName(pitchNameIndex, j);
				}
			}
		}
		this._updatePreview();
	}
	
	public static getPitchName(pitchNameIndex: number, scaleIndex: number): string {
		let text: string;
		
		if (Config.keys[pitchNameIndex].isWhiteKey) {
			text = Config.keys[pitchNameIndex].name;
		} else {
			const shiftDir: number = Config.blackKeyNameParents[scaleIndex % Config.pitchesPerOctave];
			text = Config.keys[(pitchNameIndex + Config.pitchesPerOctave + shiftDir) % Config.pitchesPerOctave].name;
			if (shiftDir == 1) {
				text += "♭";
			} else if (shiftDir == -1) {
				text += "♯";
			}
		}
		
		return text;
	}
}
