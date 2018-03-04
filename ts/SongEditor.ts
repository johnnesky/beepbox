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
	
	const isMobile: boolean = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|android|ipad|playbook|silk/i.test(navigator.userAgent);
	
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
			option("autoPlay", "Auto Play On Load", false, false),
			option("autoFollow", "Auto Follow Track", false, false),
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
		private readonly _scaleSelect: HTMLSelectElement = buildOptions(select({}), Config.scaleNames);
		private readonly _keySelect: HTMLSelectElement = buildOptions(select({}), Config.keyNames);
		private readonly _tempoSlider: HTMLInputElement = input({style: "margin: 0px;", type: "range", min: "0", max: Config.tempoSteps - 1, value: "7", step: "1"});
		private readonly _reverbSlider: HTMLInputElement = input({style: "margin: 0px;", type: "range", min: "0", max: Config.reverbRange - 1, value: "0", step: "1"});
		private readonly _partSelect: HTMLSelectElement = buildOptions(select({}), Config.partNames);
		private readonly _pitchChannelTypeSelect: HTMLSelectElement = buildOptions(select({}), Config.pitchChannelTypeNames);
		private readonly _pitchChannelTypeSelectRow: HTMLDivElement = div({className: "selectRow"}, [span({}, [text("Type: ")]), div({className: "selectContainer"}, [this._pitchChannelTypeSelect])]);
		private readonly _algorithmSelect: HTMLSelectElement = buildOptions(select({}), Config.operatorAlgorithmNames);
		private readonly _algorithmSelectRow: HTMLDivElement = div({className: "selectRow"}, [span({}, [text("Algorithm: ")]), div({className: "selectContainer"}, [this._algorithmSelect])]);
		private readonly _instrumentSelect: HTMLSelectElement = select({});
		private readonly _instrumentSelectRow: HTMLDivElement = div({className: "selectRow", style: "display: none;"}, [span({}, [text("Instrument: ")]), div({className: "selectContainer"}, [this._instrumentSelect])]);
		private readonly _instrumentVolumeSlider: HTMLInputElement = input({style: "margin: 0px;", type: "range", min: "-5", max: "0", value: "0", step: "1"});
		private readonly _instrumentVolumeSliderRow: HTMLDivElement = div({className: "selectRow"}, [span({}, [text("Volume: ")]), this._instrumentVolumeSlider]);
		private readonly _waveSelect: HTMLSelectElement = buildOptions(select({}), Config.waveNames);
		private readonly _drumSelect: HTMLSelectElement = buildOptions(select({}), Config.drumNames);
		private readonly _waveSelectRow: HTMLDivElement = div({className: "selectRow"}, [span({}, [text("Wave: ")]), div({className: "selectContainer"}, [this._waveSelect, this._drumSelect])]);
		private readonly _transitionSelect: HTMLSelectElement = buildOptions(select({}), Config.transitionNames);
		private readonly _filterSelect: HTMLSelectElement = buildOptions(select({}), Config.filterNames);
		private readonly _filterSelectRow: HTMLDivElement = div({className: "selectRow"}, [span({}, [text("Filter: ")]), div({className: "selectContainer"}, [this._filterSelect])]);
		private readonly _chorusSelect: HTMLSelectElement = buildOptions(select({}), Config.chorusNames);
		private readonly _chorusSelectRow: HTMLElement = div({className: "selectRow"}, [span({}, [text("Chorus: ")]), div({className: "selectContainer"}, [this._chorusSelect])]);
		private readonly _effectSelect: HTMLSelectElement = buildOptions(select({}), Config.effectNames);
		private readonly _effectSelectRow: HTMLElement = div({className: "selectRow"}, [span({}, [text("Effect: ")]), div({className: "selectContainer"}, [this._effectSelect])]);
		private readonly _phaseModGroup: HTMLElement = div({style: "display: flex; flex-direction: column; display: none;"}, []);
		private readonly _feedbackTypeSelect: HTMLSelectElement = buildOptions(select({}), Config.operatorFeedbackNames);
		private readonly _feedbackRow1: HTMLDivElement = div({className: "selectRow"}, [span({}, [text("Feedback:")]), div({className: "selectContainer"}, [this._feedbackTypeSelect])]);
		
		private readonly _feedbackAmplitudeSlider: HTMLInputElement = input({style: "margin: 0px; width: 4em;", type: "range", min: "0", max: Config.operatorAmplitudeMax, value: "0", step: "1", title: "Feedback Amplitude"});
		private readonly _feedbackEnvelopeSelect: HTMLSelectElement = buildOptions(select({style: "width: 100%;", title: "Feedback Envelope"}), Config.operatorEnvelopeNames);
		private readonly _feedbackRow2: HTMLDivElement = div({className: "operatorRow"}, [
			div({style: "margin-right: .1em; visibility: hidden;"}, [text(1 + ".")]),
			div({style: "width: 3em; margin-right: .3em;"}),
			this._feedbackAmplitudeSlider,
			div({className: "selectContainer", style: "width: 5em; margin-left: .3em;"}, [this._feedbackEnvelopeSelect]),
		]);
		private readonly _instrumentSettingsGroup: HTMLDivElement = div({}, [
			this._instrumentSelectRow,
			this._pitchChannelTypeSelectRow,
			this._instrumentVolumeSliderRow,
			this._waveSelectRow,
			div({className: "selectRow"}, [
				span({}, [text("Transition: ")]),
				div({className: "selectContainer"}, [this._transitionSelect]),
			]),
			this._filterSelectRow,
			this._chorusSelectRow,
			this._effectSelectRow,
			this._algorithmSelectRow,
			this._phaseModGroup,
			this._feedbackRow1,
			this._feedbackRow2,
		]);
		private readonly _promptContainer: HTMLDivElement = div({className: "promptContainer", style: "display: none;"});
		public readonly mainLayer: HTMLDivElement = div({className: "beepboxEditor", tabIndex: "0"}, [
			this._editorBox,
			div({className: "editor-widget-column"}, [
				div({style: "text-align: center; color: #999;"}, [text("BeepBox 2.2.3")]),
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
									svgElement("path", {d: "M 4 16 L 4 10 L 8 10 L 13 5 L 13 21 L 8 16 z M 15 11 L 16 10 A 7.2 7.2 0 0 1 16 16 L 15 15 A 5.8 5.8 0 0 0 15 12 z M 18 8 L 19 7 A 11.5 11.5 0 0 1 19 19 L 18 18 A 10.1 10.1 0 0 0 18 8 z", fill: "#777"}),
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
									svgElement("path", {d: "M 5.78 -1.6 L 7.93 -0.94 L 7.93 0.94 L 5.78 1.6 L 4.85 3.53 L 5.68 5.61 L 4.21 6.78 L 2.36 5.52 L 0.27 5.99 L -0.85 7.94 L -2.68 7.52 L -2.84 5.28 L -4.52 3.95 L -6.73 4.28 L -7.55 2.59 L -5.9 1.07 L -5.9 -1.07 L -7.55 -2.59 L -6.73 -4.28 L -4.52 -3.95 L -2.84 -5.28 L -2.68 -7.52 L -0.85 -7.94 L 0.27 -5.99 L 2.36 -5.52 L 4.21 -6.78 L 5.68 -5.61 L 4.85 -3.53 M 2.92 0.67 L 2.92 -0.67 L 2.35 -1.87 L 1.3 -2.7 L 0 -3 L -1.3 -2.7 L -2.35 -1.87 L -2.92 -0.67 L -2.92 0.67 L -2.35 1.87 L -1.3 2.7 L -0 3 L 1.3 2.7 L 2.35 1.87 z", fill: "currentColor"}),
								]),
							]),
							this._exportButton,
						]),
					]),
					div({className: "fullWidthOnly", style: "flex: 0 1 10px;"}),
					div({className: "editor-settings"}, [
						div({className: "editor-song-settings"}, [
							div({style: "margin: 3px 0; text-align: center; color: #999;"}, [
								text("Song Settings")
							]),
							div({className: "selectRow"}, [
								span({}, [text("Scale: ")]),
								div({className: "selectContainer"}, [this._scaleSelect]),
							]),
							div({className: "selectRow"}, [
								span({}, [text("Key: ")]),
								div({className: "selectContainer"}, [this._keySelect]),
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
								div({className: "selectContainer"}, [this._partSelect]),
							]),
						]),
						div({className: "fullWidthOnly", style: "flex: 0 1 10px;"}),
						div({className: "editor-instrument-settings"}, [
							div({style: "margin: 3px 0; text-align: center; color: #999;"}, [
								text("Instrument Settings")
							]),
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
		private _changeOperatorAmplitude: ChangeOperatorAmplitude | null = null;
		private _changeFeedbackAmplitude: ChangeFeedbackAmplitude | null = null;
		private readonly _operatorNumbers: HTMLDivElement[] = []
		private readonly _operatorAmplitudeSliders: HTMLInputElement[] = []
		private readonly _operatorEnvelopeSelects: HTMLSelectElement[] = []
		private readonly _operatorFrequencySelects: HTMLSelectElement[] = []
		
		constructor(private _doc: SongDocument) {
			this._doc.notifier.watch(this.whenUpdated);
			
			this._phaseModGroup.appendChild(div({className: "operatorRow", style: "color: #999; height: 1em; margin-top: 0.5em;"}, [
				div({style: "margin-right: .1em; visibility: hidden;"}, [text(1 + ".")]),
				div({style: "width: 3em; margin-right: .3em;"}, [text("Freq:")]),
				div({style: "width: 4em; margin: 0;"}, [text("Volume:")]),
				div({style: "width: 5em; margin-left: .3em;"}, [text("Envelope:")]),
			]));
			for (let i = 0; i < Config.operatorCount; i++) {
				const operatorIndex: number = i;
				const operatorNumber: HTMLDivElement = div({style: "margin-right: .1em;"}, [text(i + 1 + ".")]);
				const frequencySelect: HTMLSelectElement = buildOptions(select({style: "width: 100%;", title: "Frequency"}), Config.operatorFrequencyNames);
				const amplitudeSlider: HTMLInputElement = input({style: "margin: 0; width: 4em;", type: "range", min: "0", max: Config.operatorAmplitudeMax, value: "0", step: "1", title: "Amplitude"});
				const envelopeSelect: HTMLSelectElement = buildOptions(select({style: "width: 100%;", title: "Envelope"}), Config.operatorEnvelopeNames);
				const row = div({className: "operatorRow"}, [
					operatorNumber,
					div({className: "selectContainer", style: "width: 3em; margin-right: .3em;"}, [frequencySelect]),
					amplitudeSlider,
					div({className: "selectContainer", style: "width: 5em; margin-left: .3em;"}, [envelopeSelect]),
				]);
				this._phaseModGroup.appendChild(row);
				this._operatorNumbers[i] = operatorNumber;
				this._operatorAmplitudeSliders[i] = amplitudeSlider;
				this._operatorEnvelopeSelects[i] = envelopeSelect;
				this._operatorFrequencySelects[i] = frequencySelect;
				
				amplitudeSlider.addEventListener("input", () => {
					// Oh geeze this is hacky!
					const continuousChange: boolean = this._doc.history.lastChangeWas(this._changeOperatorAmplitude) && this._changeOperatorAmplitude!.operatorIndex == operatorIndex;
					const oldValue: number = continuousChange ? this._changeOperatorAmplitude!.oldValue : this._doc.song.channels[this._doc.channel].instruments[this._doc.getCurrentInstrument()].operators[operatorIndex].amplitude;
					this._changeOperatorAmplitude = new ChangeOperatorAmplitude(this._doc, operatorIndex, oldValue, parseInt(amplitudeSlider.value));
					this._doc.history.record(this._changeOperatorAmplitude, continuousChange);
				});
				envelopeSelect.addEventListener("change", () => {
					this._doc.history.record(new ChangeOperatorEnvelope(this._doc, operatorIndex, envelopeSelect.selectedIndex));
				});
				frequencySelect.addEventListener("change", () => {
					this._doc.history.record(new ChangeOperatorFrequency(this._doc, operatorIndex, frequencySelect.selectedIndex));
				});
			}
			
			this._editMenu.addEventListener("change", this._editMenuHandler);
			this._optionsMenu.addEventListener("change", this._optionsMenuHandler);
			this._scaleSelect.addEventListener("change", this._whenSetScale);
			this._keySelect.addEventListener("change", this._whenSetKey);
			this._tempoSlider.addEventListener("input", this._whenSetTempo);
			this._reverbSlider.addEventListener("input", this._whenSetReverb);
			this._partSelect.addEventListener("change", this._whenSetPartsPerBeat);
			this._pitchChannelTypeSelect.addEventListener("change", this._whenSetPitchChannelType);
			this._algorithmSelect.addEventListener("change", this._whenSetAlgorithm);
			this._instrumentSelect.addEventListener("change", this._whenSetInstrument);
			this._instrumentVolumeSlider.addEventListener("input", this._whenSetVolume);
			this._feedbackTypeSelect.addEventListener("change", this._whenSetFeedbackType);
			this._feedbackAmplitudeSlider.addEventListener("input", this._whenSetFeedbackAmplitude);
			this._feedbackEnvelopeSelect.addEventListener("change", this._whenSetFeedbackEnvelope);
			this._waveSelect.addEventListener("change", this._whenSetWave);
			this._drumSelect.addEventListener("change", this._whenSetDrum);
			this._transitionSelect.addEventListener("change", this._whenSetTransition);
			this._filterSelect.addEventListener("change", this._whenSetFilter);
			this._chorusSelect.addEventListener("change", this._whenSetChorus);
			this._effectSelect.addEventListener("change", this._whenSetEffect);
			this._playButton.addEventListener("click", this._togglePlay);
			this._prevBarButton.addEventListener("click", this._whenPrevBarPressed);
			this._nextBarButton.addEventListener("click", this._whenNextBarPressed);
			this._newSongButton.addEventListener("click", this._whenNewSongPressed);
			this._exportButton.addEventListener("click", this._openExportPrompt);
			this._volumeSlider.addEventListener("input", this._setVolumeSlider);
			
			this._editorBox.addEventListener("mousedown", this._refocusStage);
			this.mainLayer.addEventListener("keydown", this._whenKeyPressed);
			
			if (isMobile) (<HTMLOptionElement> this._optionsMenu.children[1]).disabled = true;
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
		
		private _refocusStage = (): void => {
			this.mainLayer.focus();
		}
		
		public whenUpdated = (): void => {
			const trackBounds = this._trackContainer.getBoundingClientRect();
			this._doc.trackVisibleBars = Math.floor((trackBounds.right - trackBounds.left) / 32);
			this._barScrollBar.render();
			this._trackEditor.render();
			
			const optionCommands: ReadonlyArray<string> = [
				(this._doc.autoPlay ? "✓ " : "") + "Auto Play On Load",
				(this._doc.autoFollow ? "✓ " : "") + "Auto Follow Track",
				(this._doc.showLetters ? "✓ " : "") + "Show Piano",
				(this._doc.showFifth ? "✓ " : "") + "Highlight 'Fifth' Notes",
				(this._doc.showChannels ? "✓ " : "") + "Show All Channels",
				(this._doc.showScrollBar ? "✓ " : "") + "Octave Scroll Bar",
			]
			for (let i: number = 0; i < optionCommands.length; i++) {
				const option: HTMLOptionElement = <HTMLOptionElement> this._optionsMenu.children[i + 1];
				if (option.innerText != optionCommands[i]) option.innerText = optionCommands[i];
			}
			
			const channel: Channel = this._doc.song.channels[this._doc.channel];
			const pattern: Pattern | null = this._doc.getCurrentPattern();
			const instrumentIndex: number = this._doc.getCurrentInstrument();
			const instrument: Instrument = channel.instruments[instrumentIndex];
			const wasActive: boolean = this.mainLayer.contains(document.activeElement);
			const activeElement: Element = document.activeElement;
			
			setSelectedIndex(this._scaleSelect, this._doc.song.scale);
			setSelectedIndex(this._keySelect, this._doc.song.key);
			this._tempoSlider.value = "" + this._doc.song.tempo;
			this._tempoSlider.title = this._doc.song.getBeatsPerMinute() + " beats per minute";
			this._reverbSlider.value = "" + this._doc.song.reverb;
			setSelectedIndex(this._partSelect, Config.partCounts.indexOf(this._doc.song.partsPerBeat));
			if (this._doc.song.getChannelIsDrum(this._doc.channel)) {
				this._instrumentVolumeSliderRow.style.display = "";
				this._drumSelect.style.display = "";
				this._waveSelectRow.style.display = "";
				this._pitchChannelTypeSelectRow.style.display = "none";
				this._algorithmSelectRow.style.display = "none";
				this._phaseModGroup.style.display = "none";
				this._feedbackRow1.style.display = "none";
				this._feedbackRow2.style.display = "none";
				this._waveSelect.style.display = "none";
				this._filterSelectRow.style.display = "none";
				this._chorusSelectRow.style.display = "none";
				this._effectSelectRow.style.display = "none";
			} else {
				this._pitchChannelTypeSelectRow.style.display = "";
				this._effectSelectRow.style.display = "";
				this._drumSelect.style.display = "none";
				
				if (instrument.type == 0) { // basic wave
					this._instrumentVolumeSliderRow.style.display = "";
					this._waveSelect.style.display = "";
					this._waveSelectRow.style.display = "";
					this._filterSelectRow.style.display = "";
					this._chorusSelectRow.style.display = "";
					this._algorithmSelectRow.style.display = "none";
					this._phaseModGroup.style.display = "none";
					this._feedbackRow1.style.display = "none";
					this._feedbackRow2.style.display = "none";
				} else {
					this._algorithmSelectRow.style.display = "";
					this._phaseModGroup.style.display = "";
					this._feedbackRow1.style.display = "";
					this._feedbackRow2.style.display = "";
					this._instrumentVolumeSliderRow.style.display = "none";
					this._waveSelectRow.style.display = "none";
					this._filterSelectRow.style.display = "none";
					this._chorusSelectRow.style.display = "none";
				}
			}
			
			setSelectedIndex(this._pitchChannelTypeSelect, instrument.type);
			setSelectedIndex(this._algorithmSelect, instrument.algorithm);
			
			this._instrumentSelectRow.style.display = (this._doc.song.instrumentsPerChannel > 1) ? "" : "none";
			this._instrumentSelectRow.style.visibility = (pattern == null) ? "hidden" : "";
			if (this._instrumentSelect.children.length != this._doc.song.instrumentsPerChannel) {
				while (this._instrumentSelect.firstChild) this._instrumentSelect.removeChild(this._instrumentSelect.firstChild);
				const instrumentList: number[] = [];
				for (let i: number = 0; i < this._doc.song.instrumentsPerChannel; i++) {
					instrumentList.push(i + 1);
				}
				buildOptions(this._instrumentSelect, instrumentList);
			}
			
			this._instrumentSettingsGroup.style.color = this._doc.song.getNoteColorBright(this._doc.channel);
			
			setSelectedIndex(this._waveSelect, instrument.wave);
			setSelectedIndex(this._drumSelect, instrument.wave);
			setSelectedIndex(this._filterSelect, instrument.filter);
			setSelectedIndex(this._transitionSelect, instrument.transition);
			setSelectedIndex(this._effectSelect, instrument.effect);
			setSelectedIndex(this._chorusSelect, instrument.chorus);
			setSelectedIndex(this._feedbackTypeSelect, instrument.feedbackType);
			this._feedbackAmplitudeSlider.value = instrument.feedbackAmplitude + "";
			setSelectedIndex(this._feedbackEnvelopeSelect, instrument.feedbackEnvelope);
			this._instrumentVolumeSlider.value = -instrument.volume + "";
			setSelectedIndex(this._instrumentSelect, instrumentIndex);
			for (let i: number = 0; i < Config.operatorCount; i++) {
				this._operatorNumbers[i].style.color = (i < Config.operatorCarrierCounts[instrument.algorithm]) ? "" : "#999";
				this._operatorAmplitudeSliders[i].value = instrument.operators[i].amplitude + "";
				setSelectedIndex(this._operatorEnvelopeSelects[i], instrument.operators[i].envelope);
				setSelectedIndex(this._operatorFrequencySelects[i], instrument.operators[i].frequency);
			}
			
			this._piano.container.style.display = this._doc.showLetters ? "" : "none";
			this._octaveScrollBar.container.style.display = this._doc.showScrollBar ? "" : "none";
			this._barScrollBar.container.style.display = this._doc.song.barCount > this._doc.trackVisibleBars ? "" : "none";
			
			let patternWidth: number = 512;
			if (this._doc.showLetters) patternWidth -= 32;
			if (this._doc.showScrollBar) patternWidth -= 20;
			this._patternEditor.container.style.width = String(patternWidth) + "px";
			
			this._volumeSlider.value = String(this._doc.volume);
			
			// If an interface element was selected, but becomes invisible (e.g. an instrument
			// select menu) just select the editor container so keyboard commands still work.
			if (wasActive && (activeElement.clientWidth == 0)) {
				this._refocusStage();
			}
			
			this._setPrompt(this._doc.prompt);
			
			if (this._doc.autoFollow && !this._doc.synth.playing) {
				this._doc.synth.snapToBar(this._doc.bar);
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
					if (this._doc.autoFollow) {
						new ChangeChannelBar(this._doc, this._doc.channel, Math.floor(this._doc.synth.playhead));
					}
					event.preventDefault();
					break;
				case 221: // right brace
					this._doc.synth.nextBar();
					if (this._doc.autoFollow) {
						new ChangeChannelBar(this._doc, this._doc.channel, Math.floor(this._doc.synth.playhead));
					}
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
			if (this._doc.autoFollow) {
				this._doc.synth.snapToBar(this._doc.bar);
			} else {
				this._doc.synth.snapToBar();
			}
			this.updatePlayButton();
		}
		
		private _setVolumeSlider = (): void => {
			this._doc.setVolume(Number(this._volumeSlider.value));
		}
		
		private _copy(): void {
			const pattern: Pattern | null = this._doc.getCurrentPattern();
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
			const pattern: Pattern | null = this._doc.getCurrentPattern();
			if (pattern == null) return;
			
			const patternCopy: PatternCopy | null = JSON.parse(String(window.localStorage.getItem("patternCopy")));
			
			if (patternCopy != null && patternCopy.drums == this._doc.song.getChannelIsDrum(this._doc.channel)) {
				this._doc.history.record(new ChangePaste(this._doc, pattern, patternCopy.notes, patternCopy.beatsPerBar, patternCopy.partsPerBeat));
			}
		}
		
		private _transpose(upward: boolean): void {
			const pattern: Pattern | null = this._doc.getCurrentPattern();
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
			this._doc.history.record(new ChangeScale(this._doc, this._scaleSelect.selectedIndex));
		}
		
		private _whenSetKey = (): void => {
			this._doc.history.record(new ChangeKey(this._doc, this._keySelect.selectedIndex));
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
			this._doc.history.record(new ChangePartsPerBeat(this._doc, Config.partCounts[this._partSelect.selectedIndex]));
		}
		
		private _whenSetPitchChannelType = (): void => {
			this._doc.history.record(new ChangePitchChannelType(this._doc, this._pitchChannelTypeSelect.selectedIndex));
		}
		
		private _whenSetFeedbackType = (): void => {
			this._doc.history.record(new ChangeFeedbackType(this._doc, this._feedbackTypeSelect.selectedIndex));
		}
		
		private _whenSetFeedbackAmplitude = (): void => {
			const continuousChange: boolean = this._doc.history.lastChangeWas(this._changeFeedbackAmplitude);
			const oldValue: number = continuousChange ? this._changeFeedbackAmplitude!.oldValue : this._doc.song.channels[this._doc.channel].instruments[this._doc.getCurrentInstrument()].feedbackAmplitude;
			this._changeFeedbackAmplitude = new ChangeFeedbackAmplitude(this._doc, oldValue, parseInt(this._feedbackAmplitudeSlider.value));
			this._doc.history.record(this._changeFeedbackAmplitude, continuousChange);
		}
		
		private _whenSetFeedbackEnvelope = (): void => {
			this._doc.history.record(new ChangeFeedbackEnvelope(this._doc, this._feedbackEnvelopeSelect.selectedIndex));
		}
		
		private _whenSetAlgorithm = (): void => {
			this._doc.history.record(new ChangeAlgorithm(this._doc, this._algorithmSelect.selectedIndex));
		}
		
		private _whenSetInstrument = (): void => {
			const pattern : Pattern | null = this._doc.getCurrentPattern();
			if (pattern == null) return;
			this._doc.history.record(new ChangePatternInstrument(this._doc, this._instrumentSelect.selectedIndex, pattern));
		}
		
		private _whenSetWave = (): void => {
			this._doc.history.record(new ChangeWave(this._doc, this._waveSelect.selectedIndex));
		}
		
		private _whenSetDrum = (): void => {
			this._doc.history.record(new ChangeWave(this._doc, this._drumSelect.selectedIndex));
		}
		
		private _whenSetFilter = (): void => {
			this._doc.history.record(new ChangeFilter(this._doc, this._filterSelect.selectedIndex));
		}
		
		private _whenSetTransition = (): void => {
			this._doc.history.record(new ChangeTransition(this._doc, this._transitionSelect.selectedIndex));
		}
		
		private _whenSetEffect = (): void => {
			this._doc.history.record(new ChangeEffect(this._doc, this._effectSelect.selectedIndex));
		}
		
		private _whenSetChorus = (): void => {
			this._doc.history.record(new ChangeChorus(this._doc, this._chorusSelect.selectedIndex));
		}
		
		private _whenSetVolume = (): void => {
			const continuousChange: boolean = this._doc.history.lastChangeWas(this._changeVolume);
			const oldValue: number = continuousChange ? this._changeVolume!.oldValue : this._doc.song.channels[this._doc.channel].instruments[this._doc.getCurrentInstrument()].volume;
			this._changeVolume = new ChangeVolume(this._doc, oldValue, -parseInt(this._instrumentVolumeSlider.value));
			this._doc.history.record(this._changeVolume, continuousChange);
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
				case "autoPlay":
					this._doc.autoPlay = !this._doc.autoPlay;
					break;
				case "autoFollow":
					this._doc.autoFollow = !this._doc.autoFollow;
					break;
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
	if (!isMobile && doc.autoPlay) {
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
