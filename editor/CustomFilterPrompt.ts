// Copyright (C) 2020 John Nesky, distributed under the MIT license.

import { HTML, SVG } from "imperative-html/dist/esm/elements-strict";
import { Prompt } from "./Prompt";
import { SongDocument } from "./SongDocument";
import { Config } from "../synth/SynthConfig";
import { FilterEditor } from "./FilterEditor";
import { SongEditor } from "./SongEditor";
import { FilterSettings } from "../synth/synth";
import { ColorConfig } from "./ColorConfig";

//namespace beepbox {
const { button, div, h2 } = HTML;

export class CustomFilterPrompt implements Prompt {

	public filterEditor: FilterEditor;

	public filterData: FilterSettings = new FilterSettings;
	public startingFilterData: FilterSettings = new FilterSettings;

	private _subfilterIndex = 0;

	public readonly _playButton: HTMLButtonElement = button({ style: "width: 55%;", type: "button" });

	public readonly _filterButtons: HTMLButtonElement[] = [];

	public readonly _filterButtonContainer: HTMLDivElement = div({class: "instrument-bar", style: "justify-content: center;"});

	private readonly _cancelButton: HTMLButtonElement = button({ class: "cancelButton" });
	private readonly _okayButton: HTMLButtonElement = button({ class: "okayButton", style: "width:45%;" }, "Okay");

	private readonly _filterContainer: HTMLDivElement = div({ style: "width: 100%; display: flex; flex-direction: row; align-items: center; justify-content: center;" });

	private readonly _editorTitle: HTMLDivElement = div({}, h2("Edit Filter"));

	private readonly _filterCopyButton: HTMLButtonElement = button({ style: "width:86px; margin-right: 5px;", class: "copyButton" }, [
		"Copy",
		// Copy icon:
		SVG.svg({ style: "flex-shrink: 0; position: absolute; left: 0; top: 50%; margin-top: -1em; pointer-events: none;", width: "2em", height: "2em", viewBox: "-5 -21 26 26" }, [
			SVG.path({ d: "M 0 -15 L 1 -15 L 1 0 L 13 0 L 13 1 L 0 1 L 0 -15 z M 2 -1 L 2 -17 L 10 -17 L 14 -13 L 14 -1 z M 3 -2 L 13 -2 L 13 -12 L 9 -12 L 9 -16 L 3 -16 z", fill: "currentColor" }),
		]),
	]);
	private readonly _filterPasteButton: HTMLButtonElement = button({ style: "width:86px;", class: "pasteButton" }, [
		"Paste",
		// Paste icon:
		SVG.svg({ style: "flex-shrink: 0; position: absolute; left: 0; top: 50%; margin-top: -1em; pointer-events: none;", width: "2em", height: "2em", viewBox: "0 0 26 26" }, [
			SVG.path({ d: "M 8 18 L 6 18 L 6 5 L 17 5 L 17 7 M 9 8 L 16 8 L 20 12 L 20 22 L 9 22 z", stroke: "currentColor", fill: "none" }),
			SVG.path({ d: "M 9 3 L 14 3 L 14 6 L 9 6 L 9 3 z M 16 8 L 20 12 L 16 12 L 16 8 z", fill: "currentColor", }),
		]),
	]);
	private readonly _filterCopyPasteContainer: HTMLDivElement = div({ style: "width: 185px;" }, this._filterCopyButton, this._filterPasteButton);

	public readonly container: HTMLDivElement = div({ class: "prompt noSelection", style: "width: 600px;" },
		this._editorTitle,
		div({ style: "display: flex; width: 55%; align-self: center; flex-direction: row; align-items: center; justify-content: center;" },
			this._playButton
		),
		this._filterButtonContainer,
		this._filterContainer,
		div({ style: "display: flex; flex-direction: row-reverse; justify-content: space-between;" },
			this._okayButton,
			this._filterCopyPasteContainer
		),
		this._cancelButton,
	);

	constructor(private _doc: SongDocument, private _songEditor: SongEditor, private _useNoteFilter: boolean) {

		this._okayButton.addEventListener("click", this._saveChanges);
		this._cancelButton.addEventListener("click", this._close);
		this._playButton.addEventListener("click", this._togglePlay);
		this._filterCopyButton.addEventListener("click", this._copyFilterSettings);
		this._filterPasteButton.addEventListener("click", this._pasteFilterSettings);
		this.updatePlayButton();
		let colors = ColorConfig.getChannelColor(this._doc.song, this._doc.channel);

		this.filterEditor = new FilterEditor(_doc, _useNoteFilter, true);
		this._filterContainer.appendChild(this.filterEditor.container);

		this._editorTitle.children[0].innerHTML = (_useNoteFilter) ? "Edit Note Filter" : "Edit EQ Filter";

		let newButton: HTMLButtonElement = button({ style: "max-width: 5em;"}, "Main");
		this._filterButtonContainer.appendChild(newButton);
		this._filterButtons.push(newButton);
		newButton.addEventListener("click", () => { this._setSubfilter(0); });
		for (let i: number = 1; i < Config.filterMorphCount; i++) {
			let newSubButton: HTMLButtonElement = button({ style: "max-width: 2em;"}, "" + i);
			this._filterButtons.push(newSubButton);
			this._filterButtonContainer.appendChild(newSubButton);
			newSubButton.addEventListener("click", () => { this._setSubfilter(i); });
		}
		this._filterButtons[Config.filterMorphCount - 1].classList.add("last-button");
		this._filterButtons[0].classList.add("selected-instrument");

		this._filterButtonContainer.style.setProperty("--text-color-lit", colors.primaryNote);
		this._filterButtonContainer.style.setProperty("--text-color-dim", colors.secondaryNote);
		this._filterButtonContainer.style.setProperty("--background-color-lit", colors.primaryChannel);
		this._filterButtonContainer.style.setProperty("--background-color-dim", colors.secondaryChannel);

		this._filterContainer.addEventListener("keydown", this._whenKeyPressed);
		this.filterEditor.container.addEventListener("keydown", this._whenKeyPressed);
		this.container.addEventListener("keydown", this._whenKeyPressed);

		setTimeout(() => this._playButton.focus());

		this.filterEditor.render();
	}

	private _setSubfilter = (index: number, useHistory: boolean = true, doSwap: boolean = true): void => {
		this._filterButtons[this._subfilterIndex].classList.remove("selected-instrument");
		if ( doSwap ) this.filterEditor.swapToSubfilter(this._subfilterIndex, index, useHistory);
		this._subfilterIndex = index;
		this._filterButtons[index].classList.add("selected-instrument");
    }

	private _copyFilterSettings = (): void => {
		const filterCopy: any = this._useNoteFilter
			? this._doc.song.channels[this._doc.channel].instruments[this._doc.getCurrentInstrument()].noteFilter.toJsonObject()
			: this._doc.song.channels[this._doc.channel].instruments[this._doc.getCurrentInstrument()].eqFilter.toJsonObject();
		window.localStorage.setItem("filterCopy", JSON.stringify(filterCopy));
	}

	private _pasteFilterSettings = (): void => {

		let filterCopy: FilterSettings = new FilterSettings();
		filterCopy.fromJsonObject(JSON.parse(String(window.localStorage.getItem("filterCopy"))));
		if (filterCopy != null) {
			this.filterEditor.swapToSettings(filterCopy, true);
		}
    }

	private _whenKeyPressed = (event: KeyboardEvent): void => {
		if (event.keyCode == 90) { // z
			let newIdx = this.filterEditor.undo();
			if (newIdx >= 0) {
				this._setSubfilter(newIdx, false, false);
            }
			event.stopPropagation();
		}
		if (event.keyCode == 89) { // y
			let newIdx = this.filterEditor.redo();
			if (newIdx >= 0) {
				this._setSubfilter(newIdx, false, false);
			}
			event.stopPropagation();
		}
		// Number 1-9
		if (event.keyCode >= 49 && event.keyCode <= 57) {
			this.filterEditor.swapSubfilterIndices(event.keyCode - 49);
			event.stopPropagation();
		}
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
		// Restore filter settings to default
		this.filterEditor.resetToInitial();
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
			this.filterEditor.undo();
			event.stopPropagation();
		}
		if (event.keyCode == 89) { // y
			this.filterEditor.redo();
			event.stopPropagation();
		}
	}

	private _saveChanges = (): void => {
		this._doc.prompt = null;
		this.filterEditor.saveSettings();
	}
}
//}
