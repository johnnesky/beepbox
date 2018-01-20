/*
Copyright (C) 2018 John Nesky

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
/// <reference path="style.ts" />
/// <reference path="Prompt.ts" />
/// <reference path="PatternEditor.ts" />
/// <reference path="TrackEditor.ts" />
/// <reference path="LoopEditor.ts" />
/// <reference path="BarScrollBar.ts" />
/// <reference path="OctaveScrollBar.ts" />
/// <reference path="Piano.ts" />
/// <reference path="SongDurationPrompt.ts" />
/// <reference path="ExportPrompt.ts" />
/// <reference path="ImportPrompt.ts" />

namespace beepbox {
	const {button, div, span, select, option, input, text} = html;
	
	function buildOptions(menu: HTMLSelectElement, items: ReadonlyArray<string | number>): HTMLSelectElement {
		for (const item of items) {
			menu.appendChild(option(item, item, false, false));
		}
		return menu;
	}
	
	function setSelectedIndex(menu: HTMLSelectElement, index: number): void {
		if (menu.selectedIndex != index) menu.selectedIndex = index;
	}
	
	interface PatternCopy {
		notes: Note[];
		beatsPerBar: number;
		partsPerBeat: number;
		drums: boolean;
	}
	
	export class SongEditor {
		public prompt: Prompt | null = null;
		
		private readonly _patternEditor: PatternEditor = new PatternEditor(this._doc);
		private readonly _trackEditor: TrackEditor = new TrackEditor(this._doc, this);
		private readonly _loopEditor: LoopEditor = new LoopEditor(this._doc);
		private readonly _trackContainer: HTMLDivElement = div({className: "trackContainer"}, [
			this._trackEditor.container,
			this._loopEditor.container,
		]);
		private readonly _barScrollBar: BarScrollBar = new BarScrollBar(this._doc, this._trackContainer);
		private readonly _octaveScrollBar: OctaveScrollBar = new OctaveScrollBar(this._doc);
		private readonly _piano: Piano = new Piano(this._doc);
		private readonly _editorBox: HTMLDivElement = div({}, [
			div({className: "editorBox", style: "height: 481px; display: flex; flex-direction: row; margin-bottom: 6px;"}, [
				this._piano.container,
				this._patternEditor.container,
				this._octaveScrollBar.container,
			]),
			this._trackContainer,
			this._barScrollBar.container,
		]);
		private readonly _playButton: HTMLButtonElement = button({style: "width: 80px;", type: "button"});
		private readonly _prevBarButton: HTMLButtonElement = button({className: "prevBarButton", style: "width: 40px;", type: "button", title: "Previous Bar (left bracket)"});
		private readonly _nextBarButton: HTMLButtonElement = button({className: "nextBarButton", style: "width: 40px;", type: "button", title: "Next Bar (right bracket)"});
		private readonly _volumeSlider: HTMLInputElement = input({title: "main volume", style: "width: 5em; flex-grow: 1; margin: 0px;", type: "range", min: "0", max: "100", value: "50", step: "1"});
		private readonly _editMenu: HTMLSelectElement = select({style: "width:100%;"}, [
			option("", "Edit", true, true),
			option("undo", "Undo (Z)", false, false),
			option("redo", "Redo (Y)", false, false),
			option("copy", "Copy Pattern (C)", false, false),
			option("paste", "Paste Pattern (V)", false, false),
			option("transposeUp", "Shift Notes Up (+)", false, false),
			option("transposeDown", "Shift Notes Down (-)", false, false),
			option("duration", "Custom song size...", false, false),
			option("import", "Import JSON...", false, false),
		]);
		private readonly _optionsMenu: HTMLSelectElement = select({style: "width:100%;"}, [
			option("", "Preferences", true, true),
			option("showLetters", "Show Piano", false, false),
			option("showFifth", "Highlight 'Fifth' Notes", false, false),
			option("showChannels", "Show All Channels", false, false),
			option("showScrollBar", "Octave Scroll Bar", false, false),
		]);
		private readonly _newSongButton: HTMLButtonElement = button({type: "button"}, [
			text("New"),
			span({className: "fullWidthOnly"}, [text(" Song")]),
			// Page icon:
			svgElement("svg", {style: "flex-shrink: 0; position: absolute; left: 0; top: 50%; margin-top: -1em; pointer-events: none;", width: "2em", height: "2em", viewBox: "-5 -21 26 26"}, [
				svgElement("path", {d: "M 2 0 L 2 -16 L 10 -16 L 14 -12 L 14 0 z M 3 -1 L 13 -1 L 13 -11 L 9 -11 L 9 -15 L 3 -15 z", fill: "currentColor"}),
			]),
		]);
		private readonly _exportButton: HTMLButtonElement = button({type: "button"}, [
			text("Export"),
			// Download icon:
			svgElement("svg", {style: "flex-shrink: 0; position: absolute; left: 0; top: 50%; margin-top: -1em; pointer-events: none;", width: "2em", height: "2em", viewBox: "-13 -13 26 26"}, [
				svgElement("path", {d: "M -8 3 L -8 8 L 8 8 L 8 3 L 6 3 L 6 6 L -6 6 L -6 3 z M 0 2 L -4 -2 L -1 -2 L -1 -8 L 1 -8 L 1 -2 L 4 -2 z", fill: "currentColor"}),
			]),
		]);
		private readonly _scaleDropDown: HTMLSelectElement = buildOptions(select({}), Config.scaleNames);
		private readonly _keyDropDown: HTMLSelectElement = buildOptions(select({}), Config.keyNames);
		private readonly _tempoSlider: HTMLInputElement = input({style: "margin: 0px;", type: "range", min: "0", max: Config.tempoSteps - 1, value: "7", step: "1"});
		private readonly _reverbSlider: HTMLInputElement = input({style: "margin: 0px;", type: "range", min: "0", max: Config.reverbRange - 1, value: "0", step: "1"});
		private readonly _partDropDown: HTMLSelectElement = buildOptions(select({}), Config.partNames);
		private readonly _instrumentDropDown: HTMLSelectElement = select({});
		private readonly _instrumentDropDownGroup: HTMLDivElement = div({className: "selectRow", style: "display: none;"}, [span({}, [text("Instrument: ")]), div({className: "selectContainer"}, [this._instrumentDropDown])]);
		private readonly _instrumentSettingsLabel: HTMLDivElement = div({style: "margin: 3px 0; text-align: center; color: #999;"}, [text("Instrument Settings")]);
		private readonly _channelVolumeSlider: HTMLInputElement = input({style: "margin: 0px;", type: "range", min: "-5", max: "0", value: "0", step: "1"});
		private readonly _waveNames: HTMLSelectElement = buildOptions(select({}), Config.waveNames);
		private readonly _drumNames: HTMLSelectElement = buildOptions(select({}), Config.drumNames);
		private readonly _envelopeDropDown: HTMLSelectElement = buildOptions(select({}), Config.envelopeNames);
		private readonly _filterDropDown: HTMLSelectElement = buildOptions(select({}), Config.filterNames);
		private readonly _filterDropDownGroup: HTMLDivElement = div({className: "selectRow"}, [span({}, [text("Filter: ")]), div({className: "selectContainer"}, [this._filterDropDown])]);
		private readonly _chorusDropDown: HTMLSelectElement = buildOptions(select({}), Config.chorusNames);
		private readonly _chorusDropDownGroup: HTMLElement = div({className: "selectRow"}, [span({}, [text("Chorus: ")]), div({className: "selectContainer"}, [this._chorusDropDown])]);
		private readonly _effectDropDown: HTMLSelectElement = buildOptions(select({}), Config.effectNames);
		private readonly _effectDropDownGroup: HTMLElement = div({className: "selectRow"}, [span({}, [text("Effect: ")]), div({className: "selectContainer"}, [this._effectDropDown])]);
		private readonly _instrumentSettingsGroup: HTMLDivElement = div({}, [
			this._instrumentDropDownGroup,
			div({className: "selectRow"}, [
				span({}, [text("Volume: ")]),
				this._channelVolumeSlider,
			]),
			div({className: "selectRow"}, [
				span({}, [text("Wave: ")]),
				div({className: "selectContainer"}, [this._waveNames, this._drumNames]),
			]),
			div({className: "selectRow"}, [
				span({}, [text("Envelope: ")]),
				div({className: "selectContainer"}, [this._envelopeDropDown]),
			]),
			this._filterDropDownGroup,
			this._chorusDropDownGroup,
			this._effectDropDownGroup,
		]);
		private readonly _promptContainer: HTMLDivElement = div({className: "promptContainer", style: "display: none;"});
		public readonly mainLayer: HTMLDivElement = div({className: "beepboxEditor", tabIndex: "0"}, [
			this._editorBox,
			div({className: "editor-widget-column"}, [
				div({style: "text-align: center; color: #999;"}, [text("BeepBox 2.2.1")]),
				div({className: "editor-widgets"}, [
					div({className: "editor-controls"}, [
						div({className: "playback-controls"}, [
							div({className: "playback-bar-controls"}, [
								this._playButton,
								this._prevBarButton,
								this._nextBarButton,
							]),
							div({className: "playback-volume-controls"}, [
								// Volume speaker icon:
								svgElement("svg", {style: "flex-shrink: 0;", width: "2em", height: "2em", viewBox: "0 0 26 26"}, [
									svgElement("path", {d: "M 4 17 L 4 9 L 8 9 L 12 5 L 12 21 L 8 17 z", fill: "#777"}),
									svgElement("path", {d: "M 15 11 L 16 10 A 7.2 7.2 0 0 1 16 16 L 15 15 A 5.8 5.8 0 0 0 15 12 z", fill: "#777"}),
									svgElement("path", {d: "M 18 8 L 19 7 A 11.5 11.5 0 0 1 19 19 L 18 18 A 10.1 10.1 0 0 0 18 8 z", fill: "#777"}),
								]),
								this._volumeSlider,
							]),
						]),
						div({className: "editor-menus"}, [
							this._newSongButton,
							div({className: "selectContainer menu"}, [
								this._editMenu,
								// Edit icon:
								svgElement("svg", {style: "flex-shrink: 0; position: absolute; left: 0; top: 50%; margin-top: -1em; pointer-events: none;", width: "2em", height: "2em", viewBox: "-5 -21 26 26"}, [
									svgElement("path", {d: "M 0 0 L 1 -4 L 4 -1 z M 2 -5 L 10 -13 L 13 -10 L 5 -2 zM 11 -14 L 13 -16 L 14 -16 L 16 -14 L 16 -13 L 14 -11 z", fill: "currentColor"}),
								]),
							]),
							div({className: "selectContainer menu"}, [
								this._optionsMenu,
								// Gear icon:
								svgElement("svg", {style: "flex-shrink: 0; position: absolute; left: 0; top: 50%; margin-top: -1em; pointer-events: none;", width: "2em", height: "2em", viewBox: "-13 -13 26 26"}, [
									svgElement("path", {d: "M 5.85 -1.34 L 7.85 -1.34 L 7.85 1.34 L 5.85 1.34 L 4.69 3.74 L 5.94 5.3 L 3.85 6.97 L 2.6 5.41 L 0 6 L -0.45 7.95 L -3.05 7.36 L -2.6 5.41 L -4.69 3.74 L -6.49 4.61 L -7.65 2.2 L -5.85 1.34 L -5.85 -1.34 L -7.65 -2.2 L -6.49 -4.61 L -4.69 -3.74 L -2.6 -5.41 L -3.05 -7.36 L -0.45 -7.95 L -0 -6 L 2.6 -5.41 L 3.85 -6.97 L 5.94 -5.3 L 4.69 -3.74 M 2.92 0.67 L 2.92 -0.67 L 2.35 -1.87 L 1.3 -2.7 L 0 -3 L -1.3 -2.7 L -2.35 -1.87 L -2.92 -0.67 L -2.92 0.67 L -2.35 1.87 L -1.3 2.7 L -0 3 L 1.3 2.7 L 2.35 1.87 z", fill: "currentColor"}),
								]),
							]),
							this._exportButton,
						]),
					]),
					div({className: "fullWidthOnly", style: "flex: 0 1 10px;"}),
					div({className: "editor-settings"}, [
						div({className: "editor-song-settings"}, [
							div({style: "margin: 3px 0; text-align: center; color: #999;"}, [text("Song Settings")]),
							div({className: "selectRow"}, [
								span({}, [text("Scale: ")]),
								div({className: "selectContainer"}, [this._scaleDropDown]),
							]),
							div({className: "selectRow"}, [
								span({}, [text("Key: ")]),
								div({className: "selectContainer"}, [this._keyDropDown]),
							]),
							div({className: "selectRow"}, [
								span({}, [text("Tempo: ")]),
								this._tempoSlider,
							]),
							div({className: "selectRow"}, [
								span({}, [text("Reverb: ")]),
								this._reverbSlider,
							]),
							div({className: "selectRow"}, [
								span({}, [text("Rhythm: ")]),
								div({className: "selectContainer"}, [this._partDropDown]),
							]),
						]),
						div({className: "editor-instrument-settings"}, [
							this._instrumentSettingsLabel,
							this._instrumentSettingsGroup,
						]),
					]),
				]),
			]),
			this._promptContainer,
		]);
		
		private _wasPlaying: boolean;
		private _changeTranspose: ChangeTranspose | null = null;
		private _changeTempo: ChangeTempo | null = null;
		private _changeReverb: ChangeReverb | null = null;
		private _changeVolume: ChangeVolume | null = null;
		
		constructor(private _doc: SongDocument) {
			this._doc.notifier.watch(this.whenUpdated);
			
			this._editMenu.addEventListener("change", this._editMenuHandler);
			this._optionsMenu.addEventListener("change", this._optionsMenuHandler);
			this._scaleDropDown.addEventListener("change", this._whenSetScale);
			this._keyDropDown.addEventListener("change", this._whenSetKey);
			this._tempoSlider.addEventListener("input", this._whenSetTempo);
			this._reverbSlider.addEventListener("input", this._whenSetReverb);
			this._partDropDown.addEventListener("change", this._whenSetPartsPerBeat);
			this._instrumentDropDown.addEventListener("change", this._whenSetInstrument);
			this._channelVolumeSlider.addEventListener("input", this._whenSetVolume);
			this._waveNames.addEventListener("change", this._whenSetWave);
			this._drumNames.addEventListener("change", this._whenSetDrum);
			this._envelopeDropDown.addEventListener("change", this._whenSetEnvelope);
			this._filterDropDown.addEventListener("change", this._whenSetFilter);
			this._chorusDropDown.addEventListener("change", this._whenSetChorus);
			this._effectDropDown.addEventListener("change", this._whenSetEffect);
			this._playButton.addEventListener("click", this._togglePlay);
			this._prevBarButton.addEventListener("click", this._whenPrevBarPressed);
			this._nextBarButton.addEventListener("click", this._whenNextBarPressed);
			this._newSongButton.addEventListener("click", this._whenNewSongPressed);
			this._exportButton.addEventListener("click", this._openExportPrompt);
			this._volumeSlider.addEventListener("input", this._setVolumeSlider);
			
			this._editorBox.addEventListener("mousedown", this._refocusStage);
			this.mainLayer.addEventListener("keydown", this._whenKeyPressed);
		}
		
		private _openPrompt(promptName: string): void {
			this._doc.openPrompt(promptName);
			this._setPrompt(promptName);
		}
		
		private _setPrompt(promptName: string | null): void {
			if (this.prompt) {
				if (this._wasPlaying) this._play();
				this._wasPlaying = false;
				this._promptContainer.style.display = "none";
				this._promptContainer.removeChild(this.prompt.container);
				this.prompt.cleanUp();
				this.prompt = null;
				this.mainLayer.focus();
			}
			
			if (promptName) {
				switch (promptName) {
					case "export":
						this.prompt = new ExportPrompt(this._doc, this)
						break;
					case "import":
						this.prompt = new ImportPrompt(this._doc, this)
						break;
					case "duration":
						this.prompt = new SongDurationPrompt(this._doc, this)
						break;
				}
				
				if (this.prompt) {
					this._wasPlaying = this._doc.synth.playing;
					this._pause();
					this._promptContainer.style.display = null;
					this._promptContainer.appendChild(this.prompt.container);
				}
			}
		}
		
		private _refocusStage = (event: Event): void => {
			this.mainLayer.focus();
		}
		
		public whenUpdated = (): void => {
			const trackBounds = this._trackContainer.getBoundingClientRect();
			this._doc.trackVisibleBars = Math.floor((trackBounds.right - trackBounds.left) / 32);
			this._barScrollBar.render();
			this._trackEditor.render();
			
			const optionCommands: ReadonlyArray<string> = [
				(this._doc.showLetters ? "✓ " : "") + "Show Piano",
				(this._doc.showFifth ? "✓ " : "") + "Highlight 'Fifth' Notes",
				(this._doc.showChannels ? "✓ " : "") + "Show All Channels",
				(this._doc.showScrollBar ? "✓ " : "") + "Octave Scroll Bar",
			]
			for (let i: number = 0; i < optionCommands.length; i++) {
				const option: HTMLOptionElement = <HTMLOptionElement> this._optionsMenu.children[i + 1];
				if (option.innerText != optionCommands[i]) option.innerText = optionCommands[i];
			}
			
			setSelectedIndex(this._scaleDropDown, this._doc.song.scale);
			setSelectedIndex(this._keyDropDown, this._doc.song.key);
			this._tempoSlider.value = "" + this._doc.song.tempo;
			this._reverbSlider.value = "" + this._doc.song.reverb;
			setSelectedIndex(this._partDropDown, Config.partCounts.indexOf(this._doc.song.partsPerBeat));
			if (this._doc.song.getChannelIsDrum(this._doc.channel)) {
				this._filterDropDownGroup.style.visibility = "hidden";
				this._chorusDropDownGroup.style.visibility = "hidden";
				this._effectDropDownGroup.style.visibility = "hidden";
				this._waveNames.style.display = "none";
				this._drumNames.style.display = "block";
			} else {
				this._filterDropDownGroup.style.visibility = "visible";
				this._chorusDropDownGroup.style.visibility = "visible";
				this._effectDropDownGroup.style.visibility = "visible";
				this._waveNames.style.display = "block";
				this._drumNames.style.display = "none";
			}
			
			const pattern: BarPattern | null = this._doc.getCurrentPattern();
			
			this._instrumentDropDownGroup.style.display = (this._doc.song.instrumentsPerChannel > 1) ? "flex" : "none";
			this._instrumentDropDownGroup.style.visibility = (pattern != null) ? "visible" : "hidden";
			if (this._instrumentDropDown.children.length != this._doc.song.instrumentsPerChannel) {
				while (this._instrumentDropDown.firstChild) this._instrumentDropDown.removeChild(this._instrumentDropDown.firstChild);
				const instrumentList: number[] = [];
				for (let i: number = 0; i < this._doc.song.instrumentsPerChannel; i++) {
					instrumentList.push(i + 1);
				}
				buildOptions(this._instrumentDropDown, instrumentList);
			}
			
			this._instrumentSettingsGroup.style.color = this._doc.song.getNoteColorBright(this._doc.channel);
			
			const instrument: number = this._doc.getCurrentInstrument();
			setSelectedIndex(this._waveNames, this._doc.song.instrumentWaves[this._doc.channel][instrument]);
			setSelectedIndex(this._drumNames, this._doc.song.instrumentWaves[this._doc.channel][instrument]);
			setSelectedIndex(this._filterDropDown, this._doc.song.instrumentFilters[this._doc.channel][instrument]);
			setSelectedIndex(this._envelopeDropDown, this._doc.song.instrumentEnvelopes[this._doc.channel][instrument]);
			setSelectedIndex(this._effectDropDown, this._doc.song.instrumentEffects[this._doc.channel][instrument]);
			setSelectedIndex(this._chorusDropDown, this._doc.song.instrumentChorus[this._doc.channel][instrument]);
			this._channelVolumeSlider.value = -this._doc.song.instrumentVolumes[this._doc.channel][instrument]+"";
			setSelectedIndex(this._instrumentDropDown, instrument);
			
			//currentState = this._doc.showLetters ? (this._doc.showScrollBar ? "showPianoAndScrollBar" : "showPiano") : (this._doc.showScrollBar ? "showScrollBar" : "hideAll");
			this._piano.container.style.display = this._doc.showLetters ? "block" : "none";
			this._octaveScrollBar.container.style.display = this._doc.showScrollBar ? "block" : "none";
			this._barScrollBar.container.style.display = this._doc.song.barCount > this._doc.trackVisibleBars ? "" : "none";
			
			let patternWidth: number = 512;
			if (this._doc.showLetters) patternWidth -= 32;
			if (this._doc.showScrollBar) patternWidth -= 20;
			this._patternEditor.container.style.width = String(patternWidth) + "px";
			
			this._volumeSlider.value = String(this._doc.volume);
			
			this._setPrompt(this._doc.prompt);
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
		
		private _whenKeyPressed = (event: KeyboardEvent): void => {
			if (this.prompt) {
				if (event.keyCode == 27) { // ESC key
					// close prompt.
					window.history.back();
				}
				return;
			}
			
			this._trackEditor.onKeyPressed(event);
			//if (event.ctrlKey)
			//trace(event.keyCode)
			switch (event.keyCode) {
				case 32: // space
					//stage.focus = stage;
					this._togglePlay();
					event.preventDefault();
					break;
				case 90: // z
					if (event.shiftKey) {
						this._doc.redo();
					} else {
						this._doc.undo();
					}
					event.preventDefault();
					break;
				case 89: // y
					this._doc.redo();
					event.preventDefault();
					break;
				case 67: // c
					this._copy();
					event.preventDefault();
					break;
				case 86: // v
					this._paste();
					event.preventDefault();
					break;
				case 219: // left brace
					this._doc.synth.prevBar();
					event.preventDefault();
					break;
				case 221: // right brace
					this._doc.synth.nextBar();
					event.preventDefault();
					break;
				case 189: // -
				case 173: // Firefox -
					this._transpose(false);
					event.preventDefault();
					break;
				case 187: // +
				case 61: // Firefox +
					this._transpose(true);
					event.preventDefault();
					break;
			}
		}
		
		private _whenPrevBarPressed = (): void => {
			this._doc.synth.prevBar();
		}
		
		private _whenNextBarPressed = (): void => {
			this._doc.synth.nextBar();
		}
		
		private _togglePlay = (): void => {
			if (this._doc.synth.playing) {
				this._pause();
			} else {
				this._play();
			}
		}
		
		private _play(): void {
			this._doc.synth.play();
			this.updatePlayButton();
		}
		
		private _pause(): void {
			this._doc.synth.pause();
			this._doc.synth.snapToBar();
			this.updatePlayButton();
		}
		
		private _setVolumeSlider = (): void => {
			this._doc.setVolume(Number(this._volumeSlider.value));
		}
		
		private _copy(): void {
			const pattern: BarPattern | null = this._doc.getCurrentPattern();
			if (pattern == null) return;
			
			const patternCopy: PatternCopy = {
				notes: pattern.notes,
				beatsPerBar: this._doc.song.beatsPerBar,
				partsPerBeat: this._doc.song.partsPerBeat,
				drums: this._doc.song.getChannelIsDrum(this._doc.channel),
			};
			
			window.localStorage.setItem("patternCopy", JSON.stringify(patternCopy));
		}
		
		private _paste(): void {
			const pattern: BarPattern | null = this._doc.getCurrentPattern();
			if (pattern == null) return;
			
			const patternCopy: PatternCopy | null = JSON.parse(String(window.localStorage.getItem("patternCopy")));
			
			if (patternCopy != null && patternCopy.drums == this._doc.song.getChannelIsDrum(this._doc.channel)) {
				this._doc.history.record(new ChangePaste(this._doc, pattern, patternCopy.notes, patternCopy.beatsPerBar, patternCopy.partsPerBeat));
			}
		}
		
		private _transpose(upward: boolean): void {
			const pattern: BarPattern | null = this._doc.getCurrentPattern();
			if (pattern == null) return;
			
			const continuousChange: boolean = this._doc.history.lastChangeWas(this._changeTranspose);
			this._changeTranspose = new ChangeTranspose(this._doc, pattern, upward);
			this._doc.history.record(this._changeTranspose, continuousChange);
		}
		
		private _whenNewSongPressed = (): void => {
			this._doc.history.record(new ChangeSong(this._doc, ""));
			this._patternEditor.resetCopiedPins();
		}
		
		private _openExportPrompt = (): void => {
			this._openPrompt("export");
		}
		
		private _whenSetScale = (): void => {
			this._doc.history.record(new ChangeScale(this._doc, this._scaleDropDown.selectedIndex));
		}
		
		private _whenSetKey = (): void => {
			this._doc.history.record(new ChangeKey(this._doc, this._keyDropDown.selectedIndex));
		}
		
		private _whenSetTempo = (): void => {
			const continuousChange: boolean = this._doc.history.lastChangeWas(this._changeTempo);
			const oldValue: number = continuousChange ? this._changeTempo!.oldValue : this._doc.song.tempo;
			this._changeTempo = new ChangeTempo(this._doc, oldValue, parseInt(this._tempoSlider.value));
			this._doc.history.record(this._changeTempo, continuousChange);
		}
		
		private _whenSetReverb = (): void => {
			const continuousChange: boolean = this._doc.history.lastChangeWas(this._changeReverb);
			const oldValue: number = continuousChange ? this._changeReverb!.oldValue : this._doc.song.reverb;
			this._changeReverb = new ChangeReverb(this._doc, oldValue, parseInt(this._reverbSlider.value));
			this._doc.history.record(this._changeReverb, continuousChange);
		}
		
		private _whenSetPartsPerBeat = (): void => {
			this._doc.history.record(new ChangePartsPerBeat(this._doc, Config.partCounts[this._partDropDown.selectedIndex]));
		}
		
		private _whenSetWave = (): void => {
			this._doc.history.record(new ChangeWave(this._doc, this._waveNames.selectedIndex));
		}
		
		private _whenSetDrum = (): void => {
			this._doc.history.record(new ChangeWave(this._doc, this._drumNames.selectedIndex));
		}
		
		private _whenSetFilter = (): void => {
			this._doc.history.record(new ChangeFilter(this._doc, this._filterDropDown.selectedIndex));
		}
		
		private _whenSetEnvelope = (): void => {
			this._doc.history.record(new ChangeEnvelope(this._doc, this._envelopeDropDown.selectedIndex));
		}
		
		private _whenSetEffect = (): void => {
			this._doc.history.record(new ChangeEffect(this._doc, this._effectDropDown.selectedIndex));
		}
		
		private _whenSetChorus = (): void => {
			this._doc.history.record(new ChangeChorus(this._doc, this._chorusDropDown.selectedIndex));
		}
		
		private _whenSetVolume = (): void => {
			const continuousChange: boolean = this._doc.history.lastChangeWas(this._changeVolume);
			const oldValue: number = continuousChange ? this._changeVolume!.oldValue : this._doc.song.instrumentVolumes[this._doc.channel][this._doc.getCurrentInstrument()];
			this._changeVolume = new ChangeVolume(this._doc, oldValue, -parseInt(this._channelVolumeSlider.value));
			this._doc.history.record(this._changeVolume, continuousChange);
		}
		
		private _whenSetInstrument = (): void => {
			const pattern : BarPattern | null = this._doc.getCurrentPattern();
			if (pattern == null) return;
			this._doc.history.record(new ChangePatternInstrument(this._doc, this._instrumentDropDown.selectedIndex, pattern));
		}
		
		private _editMenuHandler = (event:Event): void => {
			switch (this._editMenu.value) {
				case "undo":
					this._doc.undo();
					break;
				case "redo":
					this._doc.redo();
					break;
				case "copy":
					this._copy();
					break;
				case "paste":
					this._paste();
					break;
				case "transposeUp":
					this._transpose(true);
					break;
				case "transposeDown":
					this._transpose(false);
					break;
				case "import":
					this._openPrompt("import");
					break;
				case "duration":
					this._openPrompt("duration");
					break;
			}
			this._editMenu.selectedIndex = 0;
		}
		
		private _optionsMenuHandler = (event:Event): void => {
			switch (this._optionsMenu.value) {
				case "showLetters":
					this._doc.showLetters = !this._doc.showLetters;
					break;
				case "showFifth":
					this._doc.showFifth = !this._doc.showFifth;
					break;
				case "showChannels":
					this._doc.showChannels = !this._doc.showChannels;
					break;
				case "showScrollBar":
					this._doc.showScrollBar = !this._doc.showScrollBar;
					break;
			}
			this._optionsMenu.selectedIndex = 0;
			this._doc.notifier.changed();
			this._doc.savePreferences();
		}
	}
	
	
	const doc: SongDocument = new SongDocument(location.hash);
	const editor: SongEditor = new SongEditor(doc);
	const beepboxEditorContainer: HTMLElement = document.getElementById("beepboxEditorContainer")!;
	beepboxEditorContainer.appendChild(editor.mainLayer);
	editor.whenUpdated();
	editor.mainLayer.focus();
	
	// don't autoplay on mobile devices, wait for input.
	if (!/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|android|ipad|playbook|silk/i.test(navigator.userAgent) ) {
		function autoplay(): void {
			if (!document.hidden) {
				doc.synth.play();
				editor.updatePlayButton();
				window.removeEventListener("visibilitychange", autoplay);
			}
		}
		if (document.hidden) {
			// Wait until the tab is visible to autoplay:
			window.addEventListener("visibilitychange", autoplay);
		} else {
			autoplay();
		}
	}
	
	editor.updatePlayButton();
}
