/*
Copyright (C) 2012 John Nesky

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
/// <reference path="PatternEditor.ts" />
/// <reference path="TrackEditor.ts" />
/// <reference path="LoopEditor.ts" />
/// <reference path="BarScrollBar.ts" />
/// <reference path="OctaveScrollBar.ts" />
/// <reference path="Piano.ts" />
/// <reference path="SongDurationPrompt.ts" />
/// <reference path="ExportPrompt.ts" />
/// <reference path="ImportPrompt.ts" />

module beepbox {
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
	
	export class SongEditor {
		public static readonly channelColorsDim: ReadonlyArray<string>    = ["#0099a1", "#a1a100", "#c75000", "#6f6f6f"];
		public static readonly channelColorsBright: ReadonlyArray<string> = ["#25f3ff", "#ffff25", "#ff9752", "#aaaaaa"];
		public static readonly noteColorsDim: ReadonlyArray<string>       = ["#00bdc7", "#c7c700", "#ff771c", "#aaaaaa"];
		public static readonly noteColorsBright: ReadonlyArray<string>    = ["#92f9ff", "#ffff92", "#ffcdab", "#eeeeee"];
		
		public promptVisible: boolean = false;
		
		private readonly _width: number = 700;
		private readonly _height: number = 645;
		private readonly _patternEditor: PatternEditor = new PatternEditor(this._doc);
		private readonly _trackEditor: TrackEditor = new TrackEditor(this._doc, this);
		private readonly _loopEditor: LoopEditor = new LoopEditor(this._doc);
		private readonly _barScrollBar: BarScrollBar = new BarScrollBar(this._doc);
		private readonly _octaveScrollBar: OctaveScrollBar = new OctaveScrollBar(this._doc);
		private readonly _piano: Piano = new Piano(this._doc);
		private readonly _editorBox: HTMLElement = div({style: "width: 512px; height: 645px;"}, [
			div({style: "width: 512px; height: 481px; display: flex; flex-direction: row;"}, [
				this._piano.container,
				this._patternEditor.container,
				this._octaveScrollBar.container,
			]),
			div({style: "width: 512px; height: 6px;"}),
			div({style: "width: 512px; height: 158px;"}, [
				this._trackEditor.container,
				div({style: "width: 512px; height: 5px;"}),
				this._loopEditor.container,
				div({style: "width: 512px; height: 5px;"}),
				this._barScrollBar.container,
			]),
		]);
		private readonly _playButton: HTMLButtonElement = button({style: "width: 34px; margin: 0px", type: "button"});
		private readonly _volumeSlider: HTMLInputElement = input({style: "width: 9em; flex-shrink: 0; margin: 0px;", type: "range", min: "0", max: "100", value: "50", step: "1"});
		private readonly _editButton: HTMLSelectElement = select({style: "width:100%;"}, [
			option("", "Edit Menu", true, true),
			option("undo", "Undo (Z)", false, false),
			option("redo", "Redo (Y)", false, false),
			option("copy", "Copy Pattern (C)", false, false),
			option("paste", "Paste Pattern (V)", false, false),
			option("transposeUp", "Shift Notes Up (+)", false, false),
			option("transposeDown", "Shift Notes Down (-)", false, false),
			option("duration", "Custom song size...", false, false),
			option("import", "Import JSON...", false, false),
			option("clean", "Clean Slate", false, false),
		]);
		private readonly _optionsButton: HTMLSelectElement = select({style: "width:100%;"}, [
			option("", "Preferences Menu", true, true),
			option("showLetters", "Show Piano", false, false),
			option("showFifth", "Highlight 'Fifth' Notes", false, false),
			option("showChannels", "Show All Channels", false, false),
			option("showScrollBar", "Octave Scroll Bar", false, false),
		]);
		private readonly _exportButton: HTMLButtonElement = button({style: "margin: 5px 0;", type: "button"}, [text("Export")]);
		private readonly _scaleDropDown: HTMLSelectElement = buildOptions(select({style: "width:9em;"}), Music.scaleNames);
		private readonly _keyDropDown: HTMLSelectElement = buildOptions(select({style: "width:9em;"}), Music.keyNames);
		private readonly _tempoSlider: HTMLInputElement = input({style: "width: 9em; margin: 0px;", type: "range", min: "0", max: "11", value: "7", step: "1"});
		private readonly _reverbSlider: HTMLInputElement = input({style: "width: 9em; margin: 0px;", type: "range", min: "0", max: "3", value: "0", step: "1"});
		private readonly _partDropDown: HTMLSelectElement = buildOptions(select({style: "width:9em;"}), Music.partNames);
		private readonly _patternSettingsLabel: HTMLDivElement = div({style: "visibility: hidden; margin: 3px 0; text-align: center;"}, [text("Pattern Settings")]);
		private readonly _instrumentDropDown: HTMLSelectElement = select({style: "width:9em;"});
		private readonly _instrumentDropDownGroup: HTMLDivElement = div({className: "selectRow", style: "visibility: hidden;"}, [span({}, [text("Instrument: ")]), div({className: "selectContainer"}, [this._instrumentDropDown])]);
		private readonly _instrumentSettingsLabel: HTMLDivElement = div({style: "margin: 3px 0; text-align: center;"}, [text("Instrument Settings")]);
		private readonly _channelVolumeSlider: HTMLInputElement = input({style: "width: 9em; margin: 0px;", type: "range", min: "-5", max: "0", value: "0", step: "1"});
		private readonly _waveNames: HTMLSelectElement = buildOptions(select({style: "width:9em;"}), Music.waveNames);
		private readonly _drumNames: HTMLSelectElement = buildOptions(select({style: "width:9em;"}), Music.drumNames);
		private readonly _attackDropDown: HTMLSelectElement = buildOptions(select({style: "width:9em;"}), Music.attackNames);
		private readonly _filterDropDown: HTMLSelectElement = buildOptions(select({style: "width:9em;"}), Music.filterNames);
		private readonly _filterDropDownGroup: HTMLDivElement = div({className: "selectRow"}, [span({}, [text("Filter: ")]), div({className: "selectContainer"}, [this._filterDropDown])]);
		private readonly _chorusDropDown: HTMLSelectElement = buildOptions(select({style: "width:9em;"}), Music.chorusNames);
		private readonly _chorusDropDownGroup: HTMLElement = div({className: "selectRow"}, [span({}, [text("Chorus: ")]), div({className: "selectContainer"}, [this._chorusDropDown])]);
		private readonly _effectDropDown: HTMLSelectElement = buildOptions(select({style: "width:9em;"}), Music.effectNames);
		private readonly _effectDropDownGroup: HTMLElement = div({className: "selectRow"}, [span({}, [text("Effect: ")]), div({className: "selectContainer"}, [this._effectDropDown])]);
		private readonly _instrumentSettingsGroup: HTMLDivElement = div({}, [
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
				div({className: "selectContainer"}, [this._attackDropDown]),
			]),
			this._filterDropDownGroup,
			this._chorusDropDownGroup,
			this._effectDropDownGroup,
		]);
		private readonly _promptContainer: HTMLDivElement = div({className: "promptContainer", style: "display: none;"});
		public readonly mainLayer: HTMLDivElement = div({className: "beepboxEditor", tabIndex: "0"}, [
			this._editorBox,
			div({className: "editor-right-side"}, [
				div({style: "text-align: center; color: #999;"}, [text("BeepBox 2.1.4")]),
				div({style: "margin: 5px 0; display: flex; flex-direction: row; align-items: center;"}, [
					this._playButton,
					div({style: "width: 1px; height: 10px;"}),
					// Volume speaker icon:
					svgElement("svg", {width: "2em", height: "2em", viewBox: "0 0 26 26"}, [
						svgElement("path", {d: "M 4 17 L 4 9 L 8 9 L 12 5 L 12 21 L 8 17 z", fill: "#777"}),
						svgElement("path", {d: "M 15 11 L 16 10 A 7.2 7.2 0 0 1 16 16 L 15 15 A 5.8 5.8 0 0 0 15 12 z", fill: "#777"}),
						svgElement("path", {d: "M 18 8 L 19 7 A 11.5 11.5 0 0 1 19 19 L 18 18 A 10.1 10.1 0 0 0 18 8 z", fill: "#777"}),
					]),
					div({style: "width: 1px; height: 10px;"}),
					this._volumeSlider,
				]),
				div({className: "selectContainer", style: "margin: 5px 0;"}, [this._editButton]),
				div({className: "selectContainer", style: "margin: 5px 0;"}, [this._optionsButton]),
				this._exportButton,
				div({style: "flex: 1 1 110px;"}),
				div({style: "margin: 3px 0; text-align: center;"}, [text("Song Settings")]),
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
				div({style: "flex: 1 1 25px;"}),
				this._patternSettingsLabel,
				this._instrumentDropDownGroup,
				div({style: "flex: 1 1 25px;"}),
				this._instrumentSettingsLabel,
				this._instrumentSettingsGroup,
			]),
			this._promptContainer,
		]);
		
		private _copyNotes: Note[];
		private _copyBeats: number = 0;
		private _copyParts: number = 0;
		private _copyDrums: boolean = false;
		private _wasPlaying: boolean;
		private _changeTranspose: ChangeTranspose | null = null;
		private _changeTempo: ChangeTempo | null = null;
		private _changeReverb: ChangeReverb | null = null;
		private _changeVolume: ChangeVolume | null = null;
		
		constructor(private _doc: SongDocument) {
			this._doc.notifier.watch(this._onUpdated);
			this._onUpdated();
			
			this._editButton.addEventListener("change", this._editMenuHandler);
			this._optionsButton.addEventListener("change", this._optionsMenuHandler);
			this._scaleDropDown.addEventListener("change", this._onSetScale);
			this._keyDropDown.addEventListener("change", this._onSetKey);
			this._tempoSlider.addEventListener("input", this._onSetTempo);
			this._reverbSlider.addEventListener("input", this._onSetReverb);
			this._partDropDown.addEventListener("change", this._onSetParts);
			this._instrumentDropDown.addEventListener("change", this._onSetInstrument);
			this._channelVolumeSlider.addEventListener("input", this._onSetVolume);
			this._waveNames.addEventListener("change", this._onSetWave);
			this._drumNames.addEventListener("change", this._onSetDrum);
			this._attackDropDown.addEventListener("change", this._onSetAttack);
			this._filterDropDown.addEventListener("change", this._onSetFilter);
			this._chorusDropDown.addEventListener("change", this._onSetChorus);
			this._effectDropDown.addEventListener("change", this._onSetEffect);
			this._playButton.addEventListener("click", this._togglePlay);
			this._exportButton.addEventListener("click", this._openExportPrompt);
			this._volumeSlider.addEventListener("input", this._setVolumeSlider);
			
			this._editorBox.addEventListener("mousedown", this._refocusStage);
			this.mainLayer.addEventListener("keydown", this._onKeyPressed);
		}
		
		private _setPrompt(prompt: {container: HTMLElement}): void {
			if (this.promptVisible) return;
			this._wasPlaying = this._doc.synth.playing;
			if (this._wasPlaying) this._togglePlay();
			this._promptContainer.style.display = null;
			this._promptContainer.appendChild(prompt.container);
			this.promptVisible = true;
		}
		
		public closePrompt(prompt: {container: HTMLElement}) {
			this.promptVisible = false;
			if (this._wasPlaying) this._togglePlay();
			this._promptContainer.style.display = "none";
			this._promptContainer.removeChild(prompt.container);
			this.mainLayer.focus();
		};
		
		private _refocusStage = (event: Event): void => {
			this.mainLayer.focus();
		}
		
		private _onUpdated = (): void => {
			const optionCommands: ReadonlyArray<string> = [
				(this._doc.showLetters ? "✓ " : "") + "Show Piano",
				(this._doc.showFifth ? "✓ " : "") + "Highlight 'Fifth' Notes",
				(this._doc.showChannels ? "✓ " : "") + "Show All Channels",
				(this._doc.showScrollBar ? "✓ " : "") + "Octave Scroll Bar",
			]
			for (let i: number = 0; i < optionCommands.length; i++) {
				const option: HTMLOptionElement = <HTMLOptionElement> this._optionsButton.children[i + 1];
				if (option.innerText != optionCommands[i]) option.innerText = optionCommands[i];
			}
			
			setSelectedIndex(this._scaleDropDown, this._doc.song.scale);
			setSelectedIndex(this._keyDropDown, this._doc.song.key);
			this._tempoSlider.value = "" + this._doc.song.tempo;
			this._reverbSlider.value = "" + this._doc.song.reverb;
			setSelectedIndex(this._partDropDown, Music.partCounts.indexOf(this._doc.song.parts));
			if (this._doc.channel == 3) {
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
			
			this._patternSettingsLabel.style.visibility    = (this._doc.song.instruments > 1 && pattern != null) ? "visible" : "hidden";
			this._instrumentDropDownGroup.style.visibility = (this._doc.song.instruments > 1 && pattern != null) ? "visible" : "hidden";
			if (this._instrumentDropDown.children.length != this._doc.song.instruments) {
				while (this._instrumentDropDown.firstChild) this._instrumentDropDown.removeChild(this._instrumentDropDown.firstChild);
				const instrumentList: number[] = [];
				for (let i: number = 0; i < this._doc.song.instruments; i++) {
					instrumentList.push(i + 1);
				}
				buildOptions(this._instrumentDropDown, instrumentList);
			}
			
			this._instrumentSettingsGroup.style.color = SongEditor.noteColorsBright[this._doc.channel];
			
			const instrument: number = this._doc.getCurrentInstrument();
			setSelectedIndex(this._waveNames, this._doc.song.instrumentWaves[this._doc.channel][instrument]);
			setSelectedIndex(this._drumNames, this._doc.song.instrumentWaves[this._doc.channel][instrument]);
			setSelectedIndex(this._filterDropDown, this._doc.song.instrumentFilters[this._doc.channel][instrument]);
			setSelectedIndex(this._attackDropDown, this._doc.song.instrumentAttacks[this._doc.channel][instrument]);
			setSelectedIndex(this._effectDropDown, this._doc.song.instrumentEffects[this._doc.channel][instrument]);
			setSelectedIndex(this._chorusDropDown, this._doc.song.instrumentChorus[this._doc.channel][instrument]);
			this._channelVolumeSlider.value = -this._doc.song.instrumentVolumes[this._doc.channel][instrument]+"";
			setSelectedIndex(this._instrumentDropDown, instrument);
			
			//currentState = this._doc.showLetters ? (this._doc.showScrollBar ? "showPianoAndScrollBar" : "showPiano") : (this._doc.showScrollBar ? "showScrollBar" : "hideAll");
			this._piano.container.style.display = this._doc.showLetters ? "block" : "none";
			this._octaveScrollBar.container.style.display = this._doc.showScrollBar ? "block" : "none";
			this._barScrollBar.container.style.display = this._doc.song.bars > 16 ? "block" : "none";
			
			let patternWidth: number = 512;
			if (this._doc.showLetters) patternWidth -= 32;
			if (this._doc.showScrollBar) patternWidth -= 20;
			this._patternEditor.container.style.width = String(patternWidth) + "px";
			
			let trackHeight: number = 128;
			if (this._doc.song.bars > 16) trackHeight -= 20;
			this._trackEditor.container.style.height = String(trackHeight) + "px";
			
			this._volumeSlider.value = String(this._doc.volume);
		}
		
		public updatePlayButton(): void {
			if (this._doc.synth.playing) {
				this._playButton.classList.remove("playButton");
				this._playButton.classList.add("pauseButton");
				//if (this._playButton.innerText != "Pause") this._playButton.innerText = "Pause";
			} else {
				this._playButton.classList.remove("pauseButton");
				this._playButton.classList.add("playButton");
				//if (this._playButton.innerText != "Play") this._playButton.innerText = "Play";
			}
		}
		
		private _onKeyPressed = (event: KeyboardEvent): void => {
			if (this.promptVisible) return;
			
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
		
		private _togglePlay = (): void => {
			if (this._doc.synth.playing) {
				this._doc.synth.pause();
				this._doc.synth.snapToBar();
			} else {
				this._doc.synth.play();
			}
			this.updatePlayButton();
		}
		
		private _setVolumeSlider = (): void => {
			this._doc.setVolume(Number(this._volumeSlider.value));
		}
		
		private _copy(): void {
			const pattern: BarPattern | null = this._doc.getCurrentPattern();
			if (pattern == null) return;
			this._copyNotes = pattern.cloneNotes();
			this._copyBeats = this._doc.song.beats;
			this._copyParts = this._doc.song.parts;
			this._copyDrums = this._doc.channel == 3;
		}
		
		private _paste(): void {
			const pattern: BarPattern | null = this._doc.getCurrentPattern();
			if (pattern != null && this._copyNotes != null && this._copyBeats == this._doc.song.beats && this._copyParts == this._doc.song.parts && this._copyDrums == (this._doc.channel == 3)) {
				this._doc.history.record(new ChangePaste(this._doc, this._copyNotes, pattern));
			}
		}
		
		private _cleanSlate(): void {
			this._doc.history.record(new ChangeSong(this._doc, ""));
			this._patternEditor.resetCopiedPins();
		}
		
		private _transpose(upward: boolean): void {
			const pattern: BarPattern | null = this._doc.getCurrentPattern();
			if (pattern == null) return;
			
			const continuousChange: boolean = this._doc.history.lastChangeWas(this._changeTranspose);
			this._changeTranspose = new ChangeTranspose(this._doc, pattern, upward);
			this._doc.history.record(this._changeTranspose, continuousChange);
		}
		
		private _openExportPrompt = (): void => {
			this._setPrompt(new ExportPrompt(this._doc, this));
		}
		
		private _onSetScale = (): void => {
			this._doc.history.record(new ChangeScale(this._doc, this._scaleDropDown.selectedIndex));
		}
		
		private _onSetKey = (): void => {
			this._doc.history.record(new ChangeKey(this._doc, this._keyDropDown.selectedIndex));
		}
		
		private _onSetTempo = (): void => {
			const continuousChange: boolean = this._doc.history.lastChangeWas(this._changeTempo);
			const oldValue: number = continuousChange ? this._changeTempo!.oldValue : this._doc.song.tempo;
			this._changeTempo = new ChangeTempo(this._doc, oldValue, parseInt(this._tempoSlider.value));
			this._doc.history.record(this._changeTempo, continuousChange);
		}
		
		private _onSetReverb = (): void => {
			const continuousChange: boolean = this._doc.history.lastChangeWas(this._changeReverb);
			const oldValue: number = continuousChange ? this._changeReverb!.oldValue : this._doc.song.reverb;
			this._changeReverb = new ChangeReverb(this._doc, oldValue, parseInt(this._reverbSlider.value));
			this._doc.history.record(this._changeReverb, continuousChange);
		}
		
		private _onSetParts = (): void => {
			this._doc.history.record(new ChangeParts(this._doc, Music.partCounts[this._partDropDown.selectedIndex]));
		}
		
		private _onSetWave = (): void => {
			this._doc.history.record(new ChangeWave(this._doc, this._waveNames.selectedIndex));
		}
		
		private _onSetDrum = (): void => {
			this._doc.history.record(new ChangeWave(this._doc, this._drumNames.selectedIndex));
		}
		
		private _onSetFilter = (): void => {
			this._doc.history.record(new ChangeFilter(this._doc, this._filterDropDown.selectedIndex));
		}
		
		private _onSetAttack = (): void => {
			this._doc.history.record(new ChangeAttack(this._doc, this._attackDropDown.selectedIndex));
		}
		
		private _onSetEffect = (): void => {
			this._doc.history.record(new ChangeEffect(this._doc, this._effectDropDown.selectedIndex));
		}
		
		private _onSetChorus = (): void => {
			this._doc.history.record(new ChangeChorus(this._doc, this._chorusDropDown.selectedIndex));
		}
		
		private _onSetVolume = (): void => {
			const continuousChange: boolean = this._doc.history.lastChangeWas(this._changeVolume);
			const oldValue: number = continuousChange ? this._changeVolume!.oldValue : this._doc.song.instrumentVolumes[this._doc.channel][this._doc.getCurrentInstrument()];
			this._changeVolume = new ChangeVolume(this._doc, oldValue, -parseInt(this._channelVolumeSlider.value));
			this._doc.history.record(this._changeVolume, continuousChange);
		}
		
		private _onSetInstrument = (): void => {
			const pattern : BarPattern | null = this._doc.getCurrentPattern();
			if (pattern == null) return;
			this._doc.history.record(new ChangePatternInstrument(this._doc, this._instrumentDropDown.selectedIndex, pattern));
		}
		
		private _editMenuHandler = (event:Event): void => {
			switch (this._editButton.value) {
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
					this._setPrompt(new ImportPrompt(this._doc, this));
					break;
				case "clean":
					this._cleanSlate();
					break;
				case "duration":
					this._setPrompt(new SongDurationPrompt(this._doc, this));
					break;
			}
			this._editButton.selectedIndex = 0;
		}
		
		private _optionsMenuHandler = (event:Event): void => {
			switch (this._optionsButton.value) {
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
			this._optionsButton.selectedIndex = 0;
			this._doc.notifier.changed();
			this._doc.savePreferences();
		}
	}
	
	
	const doc: SongDocument = new SongDocument(location.hash);
	const editor: SongEditor = new SongEditor(doc);
	const beepboxEditorContainer: HTMLElement = document.getElementById("beepboxEditorContainer")!;
	beepboxEditorContainer.appendChild(editor.mainLayer);
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
	
}
