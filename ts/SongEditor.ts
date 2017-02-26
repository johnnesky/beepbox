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
/// <reference path="editor.ts" />
/// <reference path="PatternEditor.ts" />
/// <reference path="TrackEditor.ts" />
/// <reference path="LoopEditor.ts" />
/// <reference path="BarScrollBar.ts" />
/// <reference path="OctaveScrollBar.ts" />
/// <reference path="Piano.ts" />
/// <reference path="SongDurationPrompt.ts" />
/// <reference path="ExportPrompt.ts" />

"use strict";

module beepbox {
	const {button, div, span, select, canvas, input, text} = html;
	
	function BuildOptions(items: ReadonlyArray<string | number>): string {
		let result: string = "";
		for (let i: number = 0; i < items.length; i++) {
			result = result + '<option value="' + items[i] + '">' + items[i] + '</option>';
		}
		return result;
	}
	
	function BuildOptionsWithTitle(items: ReadonlyArray<ReadonlyArray<string>>, title: string): string {
		let result: string = "";
		result = result + '<option value="' + title + '" selected="selected" disabled="disabled">' + title + '</option>';
		for (let i: number = 0; i < items.length; i++) {
			result = result + '<option value="' + items[i][1] + '">' + items[i][0] + '</option>';
		}
		return result;
	}
	
	export class SongEditor {
		public static readonly channelColorsDim: ReadonlyArray<string>    = ["#0099a1", "#a1a100", "#c75000", "#6f6f6f"];
		public static readonly channelColorsBright: ReadonlyArray<string> = ["#25f3ff", "#ffff25", "#ff9752", "#aaaaaa"];
		public static readonly noteColorsDim: ReadonlyArray<string>       = ["#00bdc7", "#c7c700", "#ff771c", "#aaaaaa"];
		public static readonly noteColorsBright: ReadonlyArray<string>    = ["#92f9ff", "#ffff92", "#ffcdab", "#eeeeee"];
		
		public promptVisible: boolean = false;
		
		private readonly _width: number = 700;
		private readonly _height: number = 645;
		private readonly _waveNames: string = BuildOptions(Music.waveNames);
		private readonly _drumNames: string = BuildOptions(Music.drumNames);
		private readonly _editCommands: ReadonlyArray<ReadonlyArray<string>> = [
			[ "Undo (Z)", "undo" ],
			[ "Redo (Y)", "redo" ],
			[ "Copy Pattern (C)", "copy" ],
			[ "Paste Pattern (V)", "paste" ],
			[ "Shift Notes Up (+)", "transposeUp" ],
			[ "Shift Notes Down (-)", "transposeDown" ],
			[ "Custom song size...", "duration" ],
			[ "Clean Slate", "clean" ],
		];
		private readonly _patternEditor: PatternEditor = new PatternEditor(this._doc);
		private readonly _trackEditor: TrackEditor = new TrackEditor(this._doc, this);
		private readonly _loopEditor: LoopEditor = new LoopEditor(this._doc);
		private readonly _barScrollBar: BarScrollBar = new BarScrollBar(this._doc);
		private readonly _octaveScrollBar: OctaveScrollBar = new OctaveScrollBar(this._doc);
		private readonly _piano: Piano = new Piano(this._doc);
		private readonly _editorBox: HTMLElement = div({style: "width: 512px; height: 645px; float: left;"}, [
			div({style: "width: 512px; height: 481px; display: table; table-layout: fixed;"}, [
				this._piano.container,
				this._patternEditor.container,
				this._octaveScrollBar.container,
			]),
			div({style: "width: 512px; height: 6px; clear: both;"}),
			div({style: "width: 512px; height: 158px;"}, [
				this._trackEditor.container,
				div({style: "width: 512px; height: 5px;"}),
				this._loopEditor.container,
				div({style: "width: 512px; height: 5px;"}),
				this._barScrollBar.container,
			]),
		]);
		private readonly _playButton: HTMLButtonElement = button({style: "width: 75px; float: left; margin: 0px", type: "button"}, [text("Play")]);
		private readonly _volumeSlider: HTMLInputElement = input({className: "beepBoxSlider", style: "float: left; width: 101px; margin: 0px;", type: "range", min: "0", max: "100", value: "50", step: "1"});
		private readonly _editButton: HTMLSelectElement = select({style: "width:100%; margin: 5px 0;"});
		private readonly _optionsButton: HTMLSelectElement = select({style: "width:100%; margin: 5px 0;"}, [text("Preferences Menu")]);
		private readonly _exportButton: HTMLButtonElement = button({style: "width:100%; margin: 5px 0;", type: "button"}, [text("Export")]);
		private readonly _scaleDropDown: HTMLSelectElement = select({style: "width:90px;"});
		private readonly _keyDropDown: HTMLSelectElement = select({style: "width:90px;"});
		private readonly _tempoSlider: HTMLInputElement = input({className: "beepBoxSlider", style: "width: 90px; margin: 0px;", type: "range", min: "0", max: "11", value: "7", step: "1"});
		private readonly _partDropDown: HTMLSelectElement = select({style: "width:90px;"});
		private readonly _patternSettingsLabel: HTMLDivElement = div({style: "visibility: hidden; width:100%; margin: 3px 0;"}, [text("Pattern Settings:")]);
		private readonly _instrumentDropDown: HTMLSelectElement = select({style: "width:120px;"});
		private readonly _instrumentDropDownGroup: HTMLDivElement = div({style: "width:100%; color: #bbbbbb; visibility: hidden; margin: 0; vertical-align: middle; line-height: 27px;"}, [text("Instrument: "), span({style: "float: right;"}, [this._instrumentDropDown])]);
		private readonly _channelVolumeSlider: HTMLInputElement = input({className: "beepBoxSlider", style: "width: 120px; margin: 0px;", type: "range", min: "-5", max: "0", value: "0", step: "1"});
		private readonly _waveDropDown: HTMLSelectElement = select({style: "width:120px;"});
		private readonly _attackDropDown: HTMLSelectElement = select({style: "width:120px;"});
		private readonly _filterDropDown: HTMLSelectElement = select({style: "width:120px;"});
		private readonly _filterDropDownGroup: HTMLDivElement = div({className: "selectRow"}, [text("Filter: "), span({style: "float: right;"}, [this._filterDropDown])]);
		private readonly _chorusDropDown: HTMLSelectElement = select({style: "width:120px;"});
		private readonly _chorusDropDownGroup: HTMLElement = div({className: "selectRow"}, [text("Chorus: "), span({style: "float: right;"}, [this._chorusDropDown])]);
		private readonly _effectDropDown: HTMLSelectElement = select({style: "width:120px;"});
		private readonly _effectDropDownGroup: HTMLElement = div({className: "selectRow"}, [text("Effect: "), span({style: "float: right;"}, [this._effectDropDown])]);
		private readonly _promptBackground: HTMLDivElement = div({style: "position: absolute; background: #000000; opacity: 0.5; width: 100%; height: 100%; display: none;"});
		private readonly _mainLayer: HTMLDivElement = div({className: "beepboxEditor", tabIndex: "0", style: "width: 700px; height: 645px; -webkit-touch-callout: none; -webkit-user-select: none; -khtml-user-select: none; -moz-user-select: none; -ms-user-select: none; user-select: none; position: relative;"}, [
			this._editorBox,
			div({style: "float: left; width: 6px; height: 645px;"}),
			div({style: "float: left; width: 182px; height: 645px; font-size: 12px;"}, [
				div({style: "width:100%; text-align: center; color: #bbbbbb;"}, [text("BeepBox 2.1.1")]),
				div({style: "width:100%; margin: 5px 0;"}, [
					this._playButton,
					div({style: "float: left; width: 4px; height: 10px;"}),
					this._volumeSlider,
					div({style: "clear: both;"}), 
				]),
				this._editButton,
				this._optionsButton,
				this._exportButton,
				div({style: "width: 100%; height: 110px;"}),
				div({style: "width:100%; margin: 3px 0;"}, [text("Song Settings:")]),
				div({className: "selectRow"}, [
					text("Scale: "),
					span({style: "float: right;"}, [this._scaleDropDown]),
				]),
				div({className: "selectRow"}, [
					text("Key: "),
					span({style: "float: right;"}, [this._keyDropDown]),
				]),
				div({className: "selectRow"}, [
					text("Tempo: "),
					span({style: "float: right;"}, [this._tempoSlider]), 
				]),
				div({className: "selectRow"}, [
					text("Rhythm: "),
					span({style: "float: right;"}, [this._partDropDown]),
				]),
				div({style: "width: 100%; height: 25px;"}),
				this._patternSettingsLabel,
				this._instrumentDropDownGroup,
				div({style: "width: 100%; height: 25px;"}),
				div({style: "clear: both; width:100%; margin: 3px 0;"}, [text("Instrument Settings: ")]),
				div({className: "selectRow"}, [
					text("Volume: "),
					span({style: "float: right;"}, [this._channelVolumeSlider]), 
				]),
				div({className: "selectRow"}, [
					text("Wave: "),
					span({style: "float: right;"}, [this._waveDropDown]),
				]),
				div({className: "selectRow"}, [
					text("Envelope: "),
					span({style: "float: right;"}, [this._attackDropDown]),
				]),
				this._filterDropDownGroup,
				this._chorusDropDownGroup,
				this._effectDropDownGroup,
			]),
			this._promptBackground,
		]);
		
		private _copyTones: Tone[];
		private _copyBeats: number = 0;
		private _copyParts: number = 0;
		private _copyDrums: boolean = false;
		private _wasPlaying: boolean;
		
		constructor(private _doc: SongDocument) {
			///@TODO: Expose the "mainLayer" instead and let the caller appendChild.
			const beepboxEditorContainer: HTMLElement = document.getElementById("beepboxEditorContainer");
			beepboxEditorContainer.appendChild(this._mainLayer);
			
			this._editButton.innerHTML  = BuildOptionsWithTitle(this._editCommands, "Edit Menu");
			this._scaleDropDown.innerHTML  = BuildOptions(Music.scaleNames);
			this._keyDropDown.innerHTML    = BuildOptions(Music.keyNames);
			this._partDropDown.innerHTML   = BuildOptions(Music.partNames);
			this._filterDropDown.innerHTML = BuildOptions(Music.filterNames);
			this._attackDropDown.innerHTML = BuildOptions(Music.attackNames);
			this._effectDropDown.innerHTML = BuildOptions(Music.effectNames);
			this._chorusDropDown.innerHTML = BuildOptions(Music.chorusNames);
			
			this._doc.watch(this._onUpdated);
			this._onUpdated();
			
			this._editButton.addEventListener("change", this._editMenuHandler);
			this._optionsButton.addEventListener("change", this._optionsMenuHandler);
			this._scaleDropDown.addEventListener("change", this._onSetScale);
			this._keyDropDown.addEventListener("change", this._onSetKey);
			this._tempoSlider.addEventListener("input", this._onSetTempo);
			this._partDropDown.addEventListener("change", this._onSetParts);
			this._instrumentDropDown.addEventListener("change", this._onSetInstrument);
			this._channelVolumeSlider.addEventListener("input", this._onSetVolume);
			this._waveDropDown.addEventListener("change", this._onSetWave);
			this._attackDropDown.addEventListener("change", this._onSetAttack);
			this._filterDropDown.addEventListener("change", this._onSetFilter);
			this._chorusDropDown.addEventListener("change", this._onSetChorus);
			this._effectDropDown.addEventListener("change", this._onSetEffect);
			this._playButton.addEventListener("click", this._togglePlay);
			this._exportButton.addEventListener("click", this._openExportPrompt);
			this._volumeSlider.addEventListener("input", this._setVolumeSlider);
			
			this._editorBox.addEventListener("mousedown", this._refocusStage);
			this._mainLayer.addEventListener("keydown", this._onKeyPressed);
			this._mainLayer.addEventListener("keyup", this._onKeyReleased);
		}
		
		private _setPrompt(prompt: {container: HTMLElement}): void {
			if (this.promptVisible) return;
			this._wasPlaying = this._doc.synth.playing;
			if (this._wasPlaying) this._togglePlay();
			this._promptBackground.style.display = "block";
			this._mainLayer.appendChild(prompt.container);
			this.promptVisible = true;
		}
		
		public closePrompt(prompt: {container: HTMLElement}) {
			this.promptVisible = false;
			this._promptBackground.style.display = "none";
			if (this._wasPlaying) this._togglePlay();
			this._mainLayer.removeChild(prompt.container);
			this._mainLayer.focus();
		};
		
		private _refocusStage = (event: Event): void => {
			this._mainLayer.focus();
		}
		
		private _onUpdated = (): void => {
			const optionCommands: string[][] = [
				[ (this._doc.showLetters ? "✓ " : "") + "Show Piano", "showLetters" ],
				[ (this._doc.showFifth ? "✓ " : "") + "Highlight 'Fifth' Notes", "showFifth" ],
				[ (this._doc.showChannels ? "✓ " : "") + "Show All Channels", "showChannels" ],
				[ (this._doc.showScrollBar ? "✓ " : "") + "Octave Scroll Bar", "showScrollBar" ],
			]
			this._optionsButton.innerHTML  = BuildOptionsWithTitle(optionCommands, "Preferences Menu");
			
			this._scaleDropDown.selectedIndex = this._doc.song.scale;
			this._keyDropDown.selectedIndex = this._doc.song.key;
			this._tempoSlider.value = ""+this._doc.song.tempo;
			this._partDropDown.selectedIndex = Music.partCounts.indexOf(this._doc.song.parts);
			if (this._doc.channel == 3) {
				this._filterDropDownGroup.style.visibility = "hidden";
				this._chorusDropDownGroup.style.visibility = "hidden";
				this._effectDropDownGroup.style.visibility = "hidden";
				this._waveDropDown.innerHTML = this._drumNames;
			} else {
				this._filterDropDownGroup.style.visibility = "visible";
				this._chorusDropDownGroup.style.visibility = "visible";
				this._effectDropDownGroup.style.visibility = "visible";
				this._waveDropDown.innerHTML = this._waveNames;
			}
			
			const pattern: BarPattern | null = this._doc.getCurrentPattern();
			
			this._patternSettingsLabel.style.visibility    = (this._doc.song.instruments > 1 && pattern != null) ? "visible" : "hidden";
			this._instrumentDropDownGroup.style.visibility = (this._doc.song.instruments > 1 && pattern != null) ? "visible" : "hidden";
			const instrumentList: number[] = [];
			for (let i: number = 0; i < this._doc.song.instruments; i++) {
				instrumentList.push(i + 1);
			}
			this._instrumentDropDown.innerHTML = BuildOptions(instrumentList);
			
			const instrument: number = this._doc.getCurrentInstrument();
			this._waveDropDown.selectedIndex   = this._doc.song.instrumentWaves[this._doc.channel][instrument];
			this._filterDropDown.selectedIndex = this._doc.song.instrumentFilters[this._doc.channel][instrument];
			this._attackDropDown.selectedIndex = this._doc.song.instrumentAttacks[this._doc.channel][instrument];
			this._effectDropDown.selectedIndex = this._doc.song.instrumentEffects[this._doc.channel][instrument];
			this._chorusDropDown.selectedIndex = this._doc.song.instrumentChorus[this._doc.channel][instrument];
			this._channelVolumeSlider.value = -this._doc.song.instrumentVolumes[this._doc.channel][instrument]+"";
			this._instrumentDropDown.selectedIndex = instrument;
			
			//currentState = this._doc.showLetters ? (this._doc.showScrollBar ? "showPianoAndScrollBar" : "showPiano") : (this._doc.showScrollBar ? "showScrollBar" : "hideAll");
			this._piano.container.style.display = this._doc.showLetters ? "table-cell" : "none";
			this._octaveScrollBar.container.style.display = this._doc.showScrollBar ? "table-cell" : "none";
			this._barScrollBar.container.style.display = this._doc.song.bars > 16 ? "table-row" : "none";
			
			let patternWidth: number = 512;
			if (this._doc.showLetters) patternWidth -= 32;
			if (this._doc.showScrollBar) patternWidth -= 20;
			this._patternEditor.container.style.width = String(patternWidth) + "px";
			
			let trackHeight: number = 128;
			if (this._doc.song.bars > 16) trackHeight -= 20;
			this._trackEditor.container.style.height = String(trackHeight) + "px";
			
			this._volumeSlider.value = String(this._doc.volume);
			
			if (this._doc.synth.playing) {
				this._playButton.innerHTML = "Pause";
			} else {
				this._playButton.innerHTML = "Play";
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
						this._doc.history.redo();
					} else {
						this._doc.history.undo();
					}
					event.preventDefault();
					break;
				case 89: // y
					this._doc.history.redo();
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
				case 71: // g
					this._doc.synth.stutterPressed = true;
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
		
		private _onKeyReleased = (event: KeyboardEvent): void => {
			switch (event.keyCode) {
				case 71: // g
					this._doc.synth.stutterPressed = false;
					break;
			}
		}
		
		private _togglePlay = (): void => {
			if (this._doc.synth.playing) {
				this._doc.synth.pause();
				this._doc.synth.snapToBar();
				this._playButton.innerHTML = "Play";
			} else {
				this._doc.synth.play();
				this._playButton.innerHTML = "Pause";
			}
		}
		
		private _setVolumeSlider = (): void => {
			this._doc.setVolume(Number(this._volumeSlider.value));
		}
		
		private _copy(): void {
			const pattern: BarPattern | null = this._doc.getCurrentPattern();
			if (pattern == null) return;
			this._copyTones = pattern.cloneTones();
			this._copyBeats = this._doc.song.beats;
			this._copyParts = this._doc.song.parts;
			this._copyDrums = this._doc.channel == 3;
		}
		
		private _paste(): void {
			if (!this._canPaste()) return;
			this._doc.history.record(new ChangePaste(this._doc, this._copyTones));
		}
		
		private _canPaste(): boolean {
			return this._doc.getCurrentPattern() != null && this._copyTones != null && this._copyBeats == this._doc.song.beats && this._copyParts == this._doc.song.parts && this._copyDrums == (this._doc.channel == 3);
		}
		
		private _cleanSlate(): void {
			this._doc.history.record(new ChangeSong(this._doc, null));
			this._patternEditor.resetCopiedPins();
		}
		
		private _transpose(upward: boolean): void {
			const pattern: BarPattern | null = this._doc.getCurrentPattern();
			if (pattern == null) return;
			this._doc.history.record(new ChangeTranspose(this._doc, pattern, upward));
		}
		
		private _openExportPrompt = (): void => {
			this._setPrompt(new ExportPrompt(this._doc, this));
		}
		
		private _copyToClipboard = (): void => {
			//Clipboard.generalClipboard.clear();
			//Clipboard.generalClipboard.setData(ClipboardFormats.TEXT_FORMAT, "http://www.beepbox.co/" + this._doc.song.toString());
		}
		
		private _onSetScale = (): void => {
			this._doc.history.record(new ChangeScale(this._doc, this._scaleDropDown.selectedIndex));
		}
		
		private _onSetKey = (): void => {
			this._doc.history.record(new ChangeKey(this._doc, this._keyDropDown.selectedIndex));
		}
		
		private _onSetTempo = (): void => {
			this._doc.history.record(new ChangeTempo(this._doc, parseInt(this._tempoSlider.value)));
		}
		
		private _onSetParts = (): void => {
			this._doc.history.record(new ChangeParts(this._doc, Music.partCounts[this._partDropDown.selectedIndex]));
		}
		
		private _onSetWave = (): void => {
			this._doc.history.record(new ChangeWave(this._doc, this._waveDropDown.selectedIndex));
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
			this._doc.history.record(new ChangeVolume(this._doc, -parseInt(this._channelVolumeSlider.value)));
		}
		
		private _onSetInstrument = (): void => {
			if (this._doc.getCurrentPattern() == null) return;
			this._doc.history.record(new ChangePatternInstrument(this._doc, this._instrumentDropDown.selectedIndex));
		}
		
		private _editMenuHandler = (event:Event): void => {
			switch (this._editButton.value) {
				case "undo":
					this._doc.history.undo();
					break;
				case "redo":
					this._doc.history.redo();
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
			this._doc.changed();
			this._doc.savePreferences();
		}
	}


const styleSheet = document.createElement('style');
styleSheet.type = "text/css";
styleSheet.appendChild(document.createTextNode(`
.beepboxEditor div {
	margin: 0;
	padding: 0;
}

.beepboxEditor canvas {
	overflow: hidden;
	position: absolute;
	display: block;
}

.beepboxEditor .selectRow {
	width:100%;
	color: #bbbbbb;
	margin: 0;
	vertical-align: middle;
	line-height: 27px;
}

/* slider style designed with http://danielstern.ca/range.css/ */
input[type=range].beepBoxSlider {
	-webkit-appearance: none;
	width: 100%;
	margin: 4px 0;
}
input[type=range].beepBoxSlider:focus {
	outline: none;
}
input[type=range].beepBoxSlider::-webkit-slider-runnable-track {
	width: 100%;
	height: 6px;
	cursor: pointer;
	background: #b0b0b0;
	border-radius: 0.1px;
	border: 1px solid rgba(0, 0, 0, 0.5);
}
input[type=range].beepBoxSlider::-webkit-slider-thumb {
	box-shadow: 1px 1px 1px rgba(0, 0, 0, 0.5), 0px 0px 1px rgba(13, 13, 13, 0.5);
	border: 1px solid rgba(0, 0, 0, 0.5);
	height: 14px;
	width: 14px;
	border-radius: 8px;
	background: #f0f0f0;
	cursor: pointer;
	-webkit-appearance: none;
	margin-top: -5px;
}
input[type=range].beepBoxSlider:focus::-webkit-slider-runnable-track {
	background: #d6d6d6;
}
input[type=range].beepBoxSlider::-moz-range-track {
	width: 100%;
	height: 6px;
	cursor: pointer;
	background: #b0b0b0;
	border-radius: 0.1px;
	border: 1px solid rgba(0, 0, 0, 0.5);
}
input[type=range].beepBoxSlider::-moz-range-thumb {
	box-shadow: 1px 1px 1px rgba(0, 0, 0, 0.5), 0px 0px 1px rgba(13, 13, 13, 0.5);
	border: 1px solid rgba(0, 0, 0, 0.5);
	height: 14px;
	width: 14px;
	border-radius: 8px;
	background: #f0f0f0;
	cursor: pointer;
}
input[type=range].beepBoxSlider::-ms-track {
	width: 100%;
	height: 6px;
	cursor: pointer;
	background: transparent;
	border-color: transparent;
	color: transparent;
}
input[type=range].beepBoxSlider::-ms-fill-lower {
	background: #8a8a8a;
	border: 1px solid rgba(0, 0, 0, 0.5);
	border-radius: 0.2px;
}
input[type=range].beepBoxSlider::-ms-fill-upper {
	background: #b0b0b0;
	border: 1px solid rgba(0, 0, 0, 0.5);
	border-radius: 0.2px;
}
input[type=range].beepBoxSlider::-ms-thumb {
	box-shadow: 1px 1px 1px rgba(0, 0, 0, 0.5), 0px 0px 1px rgba(13, 13, 13, 0.5);
	border: 1px solid rgba(0, 0, 0, 0.5);
	height: 14px;
	width: 14px;
	border-radius: 8px;
	background: #f0f0f0;
	cursor: pointer;
	height: 6px;
}
input[type=range].beepBoxSlider:focus::-ms-fill-lower {
	background: #b0b0b0;
}
input[type=range].beepBoxSlider:focus::-ms-fill-upper {
	background: #d6d6d6;
}
`));
document.head.appendChild(styleSheet);


let prevHash: string = "**blank**";
const doc: beepbox.SongDocument = new beepbox.SongDocument();
let wokeUp: boolean = false;

function checkHash(): void {
	if (prevHash != location.hash) {
		prevHash = location.hash;
		if (prevHash != "") {
			doc.history.record(new beepbox.ChangeSong(doc, prevHash));
		}
	}
	
	if (!wokeUp && !document.hidden) {
		wokeUp = true;
		if ( /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|android|ipad|playbook|silk/i.test(navigator.userAgent) ) {
			// don't autoplay on mobile devices, wait for input.
		} else {
			doc.synth.play();
		}
		doc.changed();
	}
	
	beepbox.Model.updateAll();
	window.requestAnimationFrame(checkHash);
}

function onUpdated (): void {
	const hash: string = doc.song.toString();
	if (location.hash != hash) {
		location.hash = hash;
		prevHash = hash;
	}
}

new beepbox.SongEditor(doc);

doc.history.watch(onUpdated);

checkHash();

}
