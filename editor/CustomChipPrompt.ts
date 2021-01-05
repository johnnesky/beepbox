// Copyright (C) 2020 John Nesky, distributed under the MIT license.

import { HTML, SVG } from "imperative-html/dist/esm/elements-strict";
import { Prompt } from "./Prompt";
import { SongDocument } from "./SongDocument";
import { ColorConfig } from "./ColorConfig";
import { ChangeCustomWave } from "./changes";
import { SongEditor } from "./SongEditor";

//namespace beepbox {
const { button, div, h2 } = HTML;

export class CustomChipPromptCanvas {
	private readonly _doc: SongDocument;
	private _mouseX: number = 0;
	private _mouseY: number = 0;
	private _lastIndex: number = 0;
	private _lastAmp: number = 0;
	private _mouseDown: boolean = false;
	public chipData: Float64Array = new Float64Array(64);
	public startingChipData: Float64Array = new Float64Array(64);
	private _undoHistoryState: number = 0;
	private _changeQueue: Float64Array[] = [];
	private readonly _editorWidth: number = 768; // 64*12
	private readonly _editorHeight: number = 294; // 49*6
	private readonly _fill: SVGPathElement = SVG.path({ fill: ColorConfig.uiWidgetBackground, "pointer-events": "none" });
	private readonly _ticks: SVGSVGElement = SVG.svg({ "pointer-events": "none" });
	private readonly _subticks: SVGSVGElement = SVG.svg({ "pointer-events": "none" });
	private readonly _blocks: SVGSVGElement = SVG.svg({ "pointer-events": "none" });
	private readonly _svg: SVGSVGElement = SVG.svg({ style: `background-color: ${ColorConfig.editorBackground}; touch-action: none; overflow: visible;`, width: "100%", height: "100%", viewBox: "0 0 " + this._editorWidth + " " + this._editorHeight, preserveAspectRatio: "none" },
		this._fill,
		this._ticks,
		this._subticks,
		this._blocks,
	);

	public readonly container: HTMLElement = HTML.div({ class: "", style: "height: 294px; width: 768px; padding-bottom: 1.5em;" }, this._svg);

	constructor(doc: SongDocument) {

		this._doc = doc;

		for (let i: number = 0; i <= 4; i += 2) {
			this._ticks.appendChild(SVG.rect({ fill: ColorConfig.tonic, x: (i * this._editorWidth / 4) - 1, y: 0, width: 2, height: this._editorHeight }));
		}
		for (let i: number = 1; i <= 8; i++) {
			this._subticks.appendChild(SVG.rect({ fill: ColorConfig.fifthNote, x: (i * this._editorWidth / 8) - 1, y: 0, width: 1, height: this._editorHeight }));
		}

		// Horiz. ticks
		this._ticks.appendChild(SVG.rect({ fill: ColorConfig.tonic, x: 0, y: (this._editorHeight / 2) - 1, width: this._editorWidth, height: 2 }));
		for (let i: number = 0; i < 3; i++) {
			this._subticks.appendChild(SVG.rect({ fill: ColorConfig.fifthNote, x: 0, y: i * 8 * (this._editorHeight / 49), width: this._editorWidth, height: 1 }));
			this._subticks.appendChild(SVG.rect({ fill: ColorConfig.fifthNote, x: 0, y: this._editorHeight - 1 - i * 8 * (this._editorHeight / 49), width: this._editorWidth, height: 1 }));
		}


		let col: string = ColorConfig.getChannelColor(this._doc.song, this._doc.channel).primaryNote;

		for (let i: number = 0; i <= 64; i++) {
			let val: number = this._doc.song.channels[this._doc.channel].instruments[this._doc.getCurrentInstrument()].customChipWave[i];
			this.chipData[i] = val;
			this.startingChipData[i] = val;
			this._blocks.appendChild(SVG.rect({ fill: col, x: (i * this._editorWidth / 64), y: (val + 24) * (this._editorHeight / 49), width: this._editorWidth / 64, height: this._editorHeight / 49 }));
		}

		// Record initial state of the chip data queue
		this._storeChange();

		this.container.addEventListener("mousedown", this._whenMousePressed);
		document.addEventListener("mousemove", this._whenMouseMoved);
		document.addEventListener("mouseup", this._whenCursorReleased);

		this.container.addEventListener("touchstart", this._whenTouchPressed);
		this.container.addEventListener("touchmove", this._whenTouchMoved);
		this.container.addEventListener("touchend", this._whenCursorReleased);
		this.container.addEventListener("touchcancel", this._whenCursorReleased);

		this._svg.addEventListener("keydown", this._whenKeyPressed);
		this.container.addEventListener("keydown", this._whenKeyPressed);

	}

	private _storeChange = (): void => {
		// Check if change is unique compared to the current history state
		var sameCheck = true;
		if (this._changeQueue.length > 0) {
			for (var i = 0; i < 64; i++) {
				if (this._changeQueue[this._undoHistoryState][i] != this.chipData[i]) {
					sameCheck = false; i = 64;
				}
			}
		}

		if (sameCheck == false || this._changeQueue.length == 0) {

			// Create new branch in history, removing all after this in time
			this._changeQueue.splice(0, this._undoHistoryState);

			this._undoHistoryState = 0;

			this._changeQueue.unshift(this.chipData.slice());

			// 32 undo max
			if (this._changeQueue.length > 32) {
				this._changeQueue.pop();
			}

		}

	}

	public undo = (): void => {
		// Go backward, if there is a change to go back to
		if (this._undoHistoryState < this._changeQueue.length - 1) {
			this._undoHistoryState++;
			this.chipData = this._changeQueue[this._undoHistoryState].slice();
			new ChangeCustomWave(this._doc, this.chipData);
			this.render();
		}

	}

	public redo = (): void => {
		// Go forward, if there is a change to go to
		if (this._undoHistoryState > 0) {
			this._undoHistoryState--;
			this.chipData = this._changeQueue[this._undoHistoryState].slice();
			new ChangeCustomWave(this._doc, this.chipData);
			this.render();
		}

	}

	private _whenKeyPressed = (event: KeyboardEvent): void => {
		if (event.keyCode == 90) { // z
			this.undo();
			event.stopPropagation();
		}
		if (event.keyCode == 89) { // y
			this.redo();
			event.stopPropagation();
		}
	}

	private _whenMousePressed = (event: MouseEvent): void => {
		event.preventDefault();
		this._mouseDown = true;
		const boundingRect: ClientRect = this._svg.getBoundingClientRect();
		this._mouseX = ((event.clientX || event.pageX) - boundingRect.left) * this._editorWidth / (boundingRect.right - boundingRect.left);
		this._mouseY = ((event.clientY || event.pageY) - boundingRect.top) * this._editorHeight / (boundingRect.bottom - boundingRect.top);
		if (isNaN(this._mouseX)) this._mouseX = 0;
		if (isNaN(this._mouseY)) this._mouseY = 0;
		this._lastIndex = -1;

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
		this._lastIndex = -1;

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
			const index: number = Math.min(63, Math.max(0, Math.floor(this._mouseX * 64 / this._editorWidth)));
			const amp: number = Math.min(48, Math.max(0, Math.floor(this._mouseY * 49 / this._editorHeight)));

			// Paint between mouse drag indices unless a click just happened.
			if (this._lastIndex != -1 && this._lastIndex != index) {
				var lowest = index;
				var highest = this._lastIndex;
				var startingAmp = amp;
				var endingAmp = this._lastAmp;
				if (this._lastIndex < index) {
					lowest = this._lastIndex;
					highest = index;
					startingAmp = this._lastAmp;
					endingAmp = amp;
				}
				for (var i = lowest; i <= highest; i++) {
					const medAmp: number = Math.round(startingAmp + (endingAmp - startingAmp) * ((i - lowest) / (highest - lowest)));
					this.chipData[i] = medAmp - 24;
					this._blocks.children[i].setAttribute("y", "" + (medAmp * (this._editorHeight / 49)));

				}
			}
			else {
				this.chipData[index] = amp - 24;
				this._blocks.children[index].setAttribute("y", "" + (amp * (this._editorHeight / 49)));

			}


			// Make a change to the data but don't record it, since this prompt uses its own undo/redo queue
			new ChangeCustomWave(this._doc, this.chipData);

			this._lastIndex = index;
			this._lastAmp = amp;

		}
	}

	private _whenCursorReleased = (event: Event): void => {
		// Add current data into queue, if it is unique from last data
		this._storeChange();
		this._mouseDown = false;
	}

	public render(): void {
		for (var i = 0; i < 64; i++) {
			this._blocks.children[i].setAttribute("y", "" + ((this.chipData[i] + 24) * (this._editorHeight / 49)));
		}
	}
}

export class CustomChipPrompt implements Prompt {

	public customChipCanvas: CustomChipPromptCanvas = new CustomChipPromptCanvas(this._doc);

	public readonly _playButton: HTMLButtonElement = button({ style: "width: 55%;", type: "button" });

	private readonly _cancelButton: HTMLButtonElement = button({ class: "cancelButton" });
	private readonly _okayButton: HTMLButtonElement = button({ class: "okayButton", style: "width:45%;" }, "Okay");

	public readonly container: HTMLDivElement = div({ class: "prompt noSelection", style: "width: 600px;" },
		h2("Edit Custom Chip Instrument"),
		div({ style: "display: flex; width: 55%; align-self: center; flex-direction: row; align-items: center; justify-content: center;" },
			this._playButton,
		),
		div({ style: "display: flex; flex-direction: row; align-items: center; justify-content: center;" },
			this.customChipCanvas.container,
		),
		div({ style: "display: flex; flex-direction: row-reverse; justify-content: space-between;" },
			this._okayButton,
		),
		this._cancelButton,
	);

	constructor(private _doc: SongDocument, private _songEditor: SongEditor) {

		this._okayButton.addEventListener("click", this._saveChanges);
		this._cancelButton.addEventListener("click", this._close);
		this.container.addEventListener("keydown", this.whenKeyPressed);
		this._playButton.addEventListener("click", this._togglePlay);
		this.updatePlayButton();

		setTimeout(() => this._playButton.focus());


		this.customChipCanvas.render();
	}

	private _togglePlay = (): void => {
		if (this._doc.synth.playing) {
			this._songEditor._pause();
			this.updatePlayButton();
		} else {
			this._doc.synth.snapToBar();
			this._songEditor._play();
			this.updatePlayButton();
		}
	}

	public updatePlayButton(): void {
		if (this._doc.synth.playing) {
			this._playButton.classList.remove("playButton");
			this._playButton.classList.add("pauseButton");
			this._playButton.title = "Pause (Space)";
			this._playButton.innerText = "Pause";
		} else {
			this._playButton.classList.remove("pauseButton");
			this._playButton.classList.add("playButton");
			this._playButton.title = "Play (Space)";
			this._playButton.innerText = "Play";
		}
	}

	private _close = (): void => {
		this._doc.prompt = null;
		this._doc.undo();
	}

	public cleanUp = (): void => {
		this._okayButton.removeEventListener("click", this._saveChanges);
		this._cancelButton.removeEventListener("click", this._close);
		this.container.removeEventListener("keydown", this.whenKeyPressed);

		this._playButton.removeEventListener("click", this._togglePlay);
	}

	public whenKeyPressed = (event: KeyboardEvent): void => {
		if ((<Element>event.target).tagName != "BUTTON" && event.keyCode == 13) { // Enter key
			this._saveChanges();
		}
		if (event.keyCode == 32) {
			this._togglePlay();
			event.preventDefault();
		}
		if (event.keyCode == 90) { // z
			this.customChipCanvas.undo();
			event.stopPropagation();
		}
		if (event.keyCode == 89) { // y
			this.customChipCanvas.redo();
			event.stopPropagation();
		}
	}

	private _saveChanges = (): void => {
		this._doc.prompt = null;
		// Restore custom chip to starting values
		new ChangeCustomWave(this._doc, this.customChipCanvas.startingChipData);
		this._doc.record(new ChangeCustomWave(this._doc, this.customChipCanvas.chipData), true);
	}
}
//}
