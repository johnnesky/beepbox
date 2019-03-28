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
/// <reference path="style.ts" />
/// <reference path="Prompt.ts" />
/// <reference path="PatternEditor.ts" />
/// <reference path="TrackEditor.ts" />
/// <reference path="LoopEditor.ts" />
/// <reference path="SpectrumEditor.ts" />
/// <reference path="HarmonicsEditor.ts" />
/// <reference path="BarScrollBar.ts" />
/// <reference path="OctaveScrollBar.ts" />
/// <reference path="Piano.ts" />
/// <reference path="BeatsPerBarPrompt.ts" />
/// <reference path="SongDurationPrompt.ts" />
/// <reference path="ChannelSettingsPrompt.ts" />
/// <reference path="ExportPrompt.ts" />
/// <reference path="ImportPrompt.ts" />
/// <reference path="InstrumentTypePrompt.ts" />
/// <reference path="IntervalPrompt.ts" />

namespace beepbox {
	const {button, div, span, select, option, input, text} = html;
	
	const isMobile: boolean = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|android|ipad|playbook|silk/i.test(navigator.userAgent);
	
	function buildOptions(menu: HTMLSelectElement, items: ReadonlyArray<string | number>): HTMLSelectElement {
		for (let index: number = 0; index < items.length; index++) {
			menu.appendChild(option(index, items[index]));
		} 
		return menu;
	}
	
	function buildPresetOptions(isNoise: boolean): HTMLSelectElement {
		const menu: HTMLSelectElement = select({});
		const customTypeGroup: HTMLElement = html.element("optgroup", {label: "Custom"});
		
		// Show the "spectrum" custom type in both pitched and noise channels.
		if (isNoise) {
			customTypeGroup.appendChild(option(InstrumentType.noise, Config.customTypePresets[InstrumentType.noise].name));
			customTypeGroup.appendChild(option(InstrumentType.spectrum, Config.customTypePresets[InstrumentType.spectrum].name));
			customTypeGroup.appendChild(option(InstrumentType.drumset, Config.customTypePresets[InstrumentType.drumset].name));
		} else {
			customTypeGroup.appendChild(option(InstrumentType.chip, Config.customTypePresets[InstrumentType.chip].name));
			customTypeGroup.appendChild(option(InstrumentType.harmonics, Config.customTypePresets[InstrumentType.harmonics].name));
			customTypeGroup.appendChild(option(InstrumentType.spectrum, Config.customTypePresets[InstrumentType.spectrum].name));
			customTypeGroup.appendChild(option(InstrumentType.fm, Config.customTypePresets[InstrumentType.fm].name));
		}
		
		menu.appendChild(customTypeGroup);
		const beepboxGroup: HTMLElement = html.element("optgroup", {label: "BeepBox Presets"});
		for (let index: number = 0; index < Config.beepboxPresets.length; index++) {
			const preset: Preset = Config.beepboxPresets[index];
			if ((preset.isNoise == true) == isNoise) {
				beepboxGroup.appendChild(option(index + Config.beepboxPresetStart, preset.name));
			}
		}
		menu.appendChild(beepboxGroup);
		const midiGroup: HTMLElement = html.element("optgroup", {label: "Midi Synths"});
		for (let index: number = 0; index < Config.midiPresets.length; index++) {
			const preset: Preset = Config.midiPresets[index];
			if ((preset.isNoise == true) == isNoise) {
				midiGroup.appendChild(option(Config.midiPresetToValue(preset), preset.name));
			}
		}
		menu.appendChild(midiGroup);
		return menu;
	}
	
	function setSelectedValue(menu: HTMLSelectElement, value: number): void {
		const stringValue = value.toString();
		if (menu.value != stringValue) menu.value = stringValue;
	}
	
	interface PatternCopy {
		notes: any[];
		beatsPerBar: number;
		rhythmStepsPerBeat: number;
		scale: number;
		drums: boolean;
	}
	
	class Slider {
		private _change: Change | null = null;
		private _value: number = 0;
		private _oldValue: number = 0;
		
		constructor(public readonly input: HTMLInputElement, private readonly _doc: SongDocument, private readonly _getChange: (oldValue: number, newValue: number)=>Change) {
			input.addEventListener("input", this._whenInput);
			input.addEventListener("change", this._whenChange);
		}
		
		public updateValue(value: number): void {
			this._value = value;
			this.input.value = String(value);
		}
		
		private _whenInput = (): void => {
			const continuingProspectiveChange: boolean = this._doc.lastChangeWas(this._change);
			if (!continuingProspectiveChange) this._oldValue = this._value;
			this._change = this._getChange(this._oldValue, parseInt(this.input.value));
			this._doc.setProspectiveChange(this._change);
		};
		
		private _whenChange = (): void => {
			this._doc.record(this._change!);
			this._change = null;
		};
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
		private readonly _volumeSlider: HTMLInputElement = input({title: "main volume", style: "width: 5em; flex-grow: 1; margin: 0;", type: "range", min: "0", max: "100", value: "50", step: "1"});
		private readonly _fileMenu: HTMLSelectElement = select({style: "width: 100%;"}, [
			option("", "File", true, true, false), // todo: last parameter "hidden" should be true but looks wrong on mac chrome, adds checkmark next to first visible option. :(
			option("new", "+ New Blank Song"),
			option("import", "↑ Import..."),
			option("export", "↓ Export..."),
		]);
		private readonly _editMenu: HTMLSelectElement = select({style: "width: 100%;"}, [
			option("", "Edit", true, true, false), // todo: last parameter "hidden" should be true but looks wrong on mac chrome, adds checkmark next to first visible option. :(
			option("undo", "Undo (Z)"),
			option("redo", "Redo (Y)"),
			option("copy", "Copy Pattern Notes (C)"),
			option("paste", "Paste Pattern Notes (V)"),
			option("copyInstrument", "Copy Instrument"),
			option("pasteInstrument", "Paste Instrument"),
			option("transposeUp", "Shift Notes Up (+)"),
			option("transposeDown", "Shift Notes Down (-)"),
			option("detectKey", "Detect Key"),
			option("barCount", "Change Song Length..."),
			option("beatsPerBar", "Set Beats Per Bar..."),
			option("channelSettings", "Channel Settings..."),
		]);
		private readonly _optionsMenu: HTMLSelectElement = select({style: "width: 100%;"}, [
			option("", "Preferences", true, true, false), // todo: last parameter "hidden" should be true but looks wrong on mac chrome, adds checkmark next to first visible option. :(
			option("autoPlay", "Auto Play On Load"),
			option("autoFollow", "Auto Follow Track"),
			option("showLetters", "Show Piano Keys"),
			option("showFifth", 'Highlight "Fifth" Notes'),
			option("showChannels", "Show All Channels"),
			option("showScrollBar", "Octave Scroll Bar"),
			option("alwaysShowSettings", "Customize All Instruments"),
			option("forceScaleChanges", "Force Scale Changes"),
			option("forceRhythmChanges", "Force Rhythm Changes"),
		]);
		private readonly _scaleSelect: HTMLSelectElement = buildOptions(select({}), Config.scales.map(scale=>scale.name));
		private readonly _keySelect: HTMLSelectElement = buildOptions(select({}), Config.keys.map(key=>key.name).reverse());
		private readonly _tempoSlider: Slider = new Slider(input({style: "margin: 0;", type: "range", min: "0", max: Config.tempoSteps - 1, value: "7", step: "1"}), this._doc, (oldValue: number, newValue: number) => new ChangeTempo(this._doc, oldValue, newValue));
		private readonly _reverbSlider: Slider = new Slider(input({style: "margin: 0;", type: "range", min: "0", max: Config.reverbRange - 1, value: "0", step: "1"}), this._doc, (oldValue: number, newValue: number) => new ChangeReverb(this._doc, oldValue, newValue));
		private readonly _rhythmSelect: HTMLSelectElement = buildOptions(select({}), Config.rhythms.map(rhythm=>rhythm.name));
		private readonly _pitchedPresetSelect: HTMLSelectElement = buildPresetOptions(false);
		private readonly _drumPresetSelect: HTMLSelectElement = buildPresetOptions(true);
		//private readonly _instrumentTypeHint = <HTMLAnchorElement> html.element("a", {className: "hintButton"}, [text("?")]);
		private readonly _algorithmSelect: HTMLSelectElement = buildOptions(select({}), Config.algorithms.map(algorithm=>algorithm.name));
		private readonly _algorithmSelectRow: HTMLDivElement = div({className: "selectRow"}, [span({}, [text("Algorithm: ")]), div({className: "selectContainer"}, [this._algorithmSelect])]);
		private readonly _instrumentSelect: HTMLSelectElement = select({});
		private readonly _instrumentSelectRow: HTMLDivElement = div({className: "selectRow", style: "display: none;"}, [span({}, [text("Instrument: ")]), div({className: "selectContainer"}, [this._instrumentSelect])]);
		private readonly _instrumentVolumeSlider: Slider = new Slider(input({style: "margin: 0;", type: "range", min: "-5", max: "0", value: "0", step: "1"}), this._doc, (oldValue: number, newValue: number) => new ChangeVolume(this._doc, oldValue, -newValue));
		private readonly _instrumentVolumeSliderRow: HTMLDivElement = div({className: "selectRow"}, [span({}, [text("Volume: ")]), this._instrumentVolumeSlider.input]);
		private readonly _chipWaveSelect: HTMLSelectElement = buildOptions(select({}), Config.chipWaves.map(wave=>wave.name));
		private readonly _noiseWaveSelect: HTMLSelectElement = buildOptions(select({}), Config.noiseWaves.map(wave=>wave.name));
		private readonly _waveSelectRow: HTMLDivElement = div({className: "selectRow"}, [span({}, [text("Wave: ")]), div({className: "selectContainer"}, [this._chipWaveSelect, this._noiseWaveSelect])]);
		private readonly _transitionSelect: HTMLSelectElement = buildOptions(select({}), Config.transitions.map(transition=>transition.name));
		private readonly _transitionRow: HTMLDivElement = div({className: "selectRow"}, [span({}, [text("Transition:")]), div({className: "selectContainer"}, [this._transitionSelect])]);
		private readonly _effectsSelect: HTMLSelectElement = buildOptions(select({}), Config.effectsNames);
		private readonly _filterCutoffSlider: Slider = new Slider(input({style: "margin: 0;", type: "range", min: "0", max: Config.filterCutoffRange - 1, value: "6", step: "1"}), this._doc, (oldValue: number, newValue: number) => new ChangeFilterCutoff(this._doc, oldValue, newValue));
		private _filterCutoffRow: HTMLDivElement = div({className: "selectRow", title: "Low-pass Filter Cutoff Frequency"}, [span({}, [text("Filter Cut:")]), this._filterCutoffSlider.input]);
		private readonly _filterResonanceSlider: Slider = new Slider(input({style: "margin: 0;", type: "range", min: "0", max: Config.filterResonanceRange - 1, value: "6", step: "1"}), this._doc, (oldValue: number, newValue: number) => new ChangeFilterResonance(this._doc, oldValue, newValue));
		private _filterResonanceRow: HTMLDivElement = div({className: "selectRow", title: "Low-pass Filter Peak Resonance"}, [span({}, [text("Filter Peak:")]), this._filterResonanceSlider.input]);
		private readonly _filterEnvelopeSelect: HTMLSelectElement = buildOptions(select({}), Config.envelopes.map(envelope=>envelope.name));
		private _filterEnvelopeRow: HTMLDivElement = div({className: "selectRow", title: "Low-pass Filter Envelope"}, [span({}, [text("Filter Env:")]), div({className: "selectContainer"}, [this._filterEnvelopeSelect])]);
		private readonly _intervalSelect: HTMLSelectElement = buildOptions(select({}), Config.intervals.map(interval=>interval.name));
		//private readonly _intervalHint = <HTMLAnchorElement> html.element("a", {className: "hintButton"}, [text("?")]);
		private readonly _intervalSelectRow: HTMLElement = div({className: "selectRow"}, [span({}, [text("Interval:")]), /*this._intervalHint, */div({className: "selectContainer"}, [this._intervalSelect])]);
		private readonly _chordSelect: HTMLSelectElement = buildOptions(select({}), Config.chords.map(chord=>chord.name));
		private readonly _chordSelectRow: HTMLElement = div({className: "selectRow"}, [span({}, [text("Chords:")]), div({className: "selectContainer"}, [this._chordSelect])]);
		private readonly _vibratoSelect: HTMLSelectElement = buildOptions(select({}), Config.vibratos.map(vibrato=>vibrato.name));
		private readonly _vibratoSelectRow: HTMLElement = div({className: "selectRow"}, [span({}, [text("Vibrato:")]), div({className: "selectContainer"}, [this._vibratoSelect])]);
		private readonly _phaseModGroup: HTMLElement = div({style: "display: flex; flex-direction: column; display: none;"}, []);
		private readonly _feedbackTypeSelect: HTMLSelectElement = buildOptions(select({}), Config.feedbacks.map(feedback=>feedback.name));
		private readonly _feedbackRow1: HTMLDivElement = div({className: "selectRow"}, [span({}, [text("Feedback:")]), div({className: "selectContainer"}, [this._feedbackTypeSelect])]);
		private readonly _spectrumEditor: SpectrumEditor = new SpectrumEditor(this._doc, null);
		private readonly _spectrumRow: HTMLElement = div({className: "selectRow"}, [span({}, [text("Spectrum:")]), this._spectrumEditor.container]);
		private readonly _harmonicsEditor: HarmonicsEditor = new HarmonicsEditor(this._doc, null);
		private readonly _harmonicsRow: HTMLElement = div({className: "selectRow"}, [span({}, [text("Harmonics:")]), this._harmonicsEditor.container]);
		private readonly _drumsetGroup: HTMLElement = div({style: "display: flex; flex-direction: column; display: none;"}, []);
		
		private readonly _feedbackAmplitudeSlider: Slider = new Slider(input({style: "margin: 0; width: 4em;", type: "range", min: "0", max: Config.operatorAmplitudeMax, value: "0", step: "1", title: "Feedback Amplitude"}), this._doc, (oldValue: number, newValue: number) => new ChangeFeedbackAmplitude(this._doc, oldValue, newValue));
		private readonly _feedbackEnvelopeSelect: HTMLSelectElement = buildOptions(select({style: "width: 100%;", title: "Feedback Envelope"}), Config.envelopes.map(envelope=>envelope.name));
		private readonly _feedbackRow2: HTMLDivElement = div({className: "operatorRow"}, [
			div({style: "margin-right: .1em; visibility: hidden;"}, [text(1 + ".")]),
			div({style: "width: 3em; margin-right: .3em;"}),
			this._feedbackAmplitudeSlider.input,
			div({className: "selectContainer", style: "width: 5em; margin-left: .3em;"}, [this._feedbackEnvelopeSelect]),
		]);
		private readonly _customizeInstrumentButton: HTMLButtonElement = button({type: "button", style: "margin: .1em 0"}, [
			text("Customize Instrument"),
			// Dial icon
			svgElement("svg", {style: "flex-shrink: 0; position: absolute; left: 0; top: 50%; margin-top: -1em; pointer-events: none;", width: "2em", height: "2em", viewBox: "-13 -13 26 26"}, [
				svgElement("g", {transform: "translate(0,1)"}, [
					svgElement("circle", {cx: "0", cy: "0", r: "6.5", stroke: "currentColor", "stroke-width": "1", fill: "none"}),
					svgElement("rect", {x: "-1", y: "-5", width: "2", height: "4", fill: "currentColor", transform: "rotate(30)"}),
					svgElement("circle", {cx: "-7.79", cy: "4.5", r: "0.75", fill: "currentColor"}),
					svgElement("circle", {cx: "-9", cy: "0", r: "0.75", fill: "currentColor"}),
					svgElement("circle", {cx: "-7.79", cy: "-4.5", r: "0.75", fill: "currentColor"}),
					svgElement("circle", {cx: "-4.5", cy: "-7.79", r: "0.75", fill: "currentColor"}),
					svgElement("circle", {cx: "0", cy: "-9", r: "0.75", fill: "currentColor"}),
					svgElement("circle", {cx: "4.5", cy: "-7.79", r: "0.75", fill: "currentColor"}),
					svgElement("circle", {cx: "7.79", cy: "-4.5", r: "0.75", fill: "currentColor"}),
					svgElement("circle", {cx: "9", cy: "0", r: "0.75", fill: "currentColor"}),
					svgElement("circle", {cx: "7.79", cy: "4.5", r: "0.75", fill: "currentColor"}),
				]),
			]),
		]);
		private readonly _customInstrumentSettingsGroup: HTMLDivElement = div({}, [
			this._filterCutoffRow,
			this._filterResonanceRow,
			this._filterEnvelopeRow,
			this._transitionRow,
			div({className: "selectRow"}, [
				span({}, [text("Effects:")]),
				div({className: "selectContainer"}, [this._effectsSelect]),
			]),
			this._chordSelectRow,
			this._vibratoSelectRow,
			this._intervalSelectRow,
			this._waveSelectRow,
			this._algorithmSelectRow,
			this._phaseModGroup,
			this._feedbackRow1,
			this._feedbackRow2,
			this._spectrumRow,
			this._harmonicsRow,
			this._drumsetGroup,
		]);
		private readonly _instrumentSettingsGroup: HTMLDivElement = div({style: "display: flex; flex-direction: column;"}, [
			this._instrumentSelectRow,
			div({className: "selectRow"}, [
				span({}, [text("Type: ")]),
				//this._instrumentTypeHint,
				div({className: "selectContainer"}, [this._pitchedPresetSelect, this._drumPresetSelect])
			]),
			this._instrumentVolumeSliderRow,
			this._customizeInstrumentButton,
			this._customInstrumentSettingsGroup,
		]);
		private readonly _promptContainer: HTMLDivElement = div({className: "promptContainer", style: "display: none;"});
		public readonly mainLayer: HTMLDivElement = div({className: "beepboxEditor", tabIndex: "0"}, [
			this._editorBox,
			div({className: "editor-widget-column"}, [
				div({style: "text-align: center; color: #999;"}, [text("BeepBox 3.0")]),
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
					]),
					div({className: "editor-settings"}, [
						div({className: "editor-song-settings"}, [
							div({className: "editor-menus"}, [
								div({className: "selectContainer menu"}, [
									this._fileMenu,
									// Page icon:
									svgElement("svg", {style: "flex-shrink: 0; position: absolute; left: 0; top: 50%; margin-top: -1em; pointer-events: none;", width: "2em", height: "2em", viewBox: "-5 -21 26 26"}, [
										svgElement("path", {d: "M 2 0 L 2 -16 L 10 -16 L 14 -12 L 14 0 z M 3 -1 L 13 -1 L 13 -11 L 9 -11 L 9 -15 L 3 -15 z", fill: "currentColor"}),
									]),
								]),
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
							]),
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
								this._tempoSlider.input,
							]),
							div({className: "selectRow"}, [
								span({}, [text("Reverb: ")]),
								this._reverbSlider.input,
							]),
							div({className: "selectRow"}, [
								span({}, [text("Rhythm: ")]),
								div({className: "selectContainer"}, [this._rhythmSelect]),
							]),
						]),
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
		private readonly _operatorRows: HTMLDivElement[] = []
		private readonly _operatorAmplitudeSliders: Slider[] = []
		private readonly _operatorEnvelopeSelects: HTMLSelectElement[] = []
		private readonly _operatorFrequencySelects: HTMLSelectElement[] = []
		private readonly _drumsetSpectrumEditors: SpectrumEditor[] = [];
		private readonly _drumsetEnvelopeSelects: HTMLSelectElement[] = [];
		
		constructor(private _doc: SongDocument) {
			this._doc.notifier.watch(this.whenUpdated);
			
			this._phaseModGroup.appendChild(div({className: "operatorRow", style: "color: #999; height: 1em; margin-top: 0.5em;"}, [
				div({style: "margin-right: .1em; visibility: hidden;"}, [text(1 + ".")]),
				div({style: "width: 3em; margin-right: .3em;"}, [text("Freq:")]),
				div({style: "width: 4em; margin: 0;"}, [text("Volume:")]),
				div({style: "width: 5em; margin-left: .3em;"}, [text("Envelope:")]),
			]));
			for (let i: number = 0; i < Config.operatorCount; i++) {
				const operatorIndex: number = i;
				const operatorNumber: HTMLDivElement = div({style: "margin-right: .1em; color: #999;"}, [text(i + 1 + ".")]);
				const frequencySelect: HTMLSelectElement = buildOptions(select({style: "width: 100%;", title: "Frequency"}), Config.operatorFrequencies.map(freq=>freq.name));
				const amplitudeSlider: Slider = new Slider(input({style: "margin: 0; width: 4em;", type: "range", min: "0", max: Config.operatorAmplitudeMax, value: "0", step: "1", title: "Volume"}), this._doc, (oldValue: number, newValue: number) => new ChangeOperatorAmplitude(this._doc, operatorIndex, oldValue, newValue));
				const envelopeSelect: HTMLSelectElement = buildOptions(select({style: "width: 100%;", title: "Envelope"}), Config.envelopes.map(envelope=>envelope.name));
				const row: HTMLDivElement = div({className: "operatorRow"}, [
					operatorNumber,
					div({className: "selectContainer", style: "width: 3em; margin-right: .3em;"}, [frequencySelect]),
					amplitudeSlider.input,
					div({className: "selectContainer", style: "width: 5em; margin-left: .3em;"}, [envelopeSelect]),
				]);
				this._phaseModGroup.appendChild(row);
				this._operatorRows[i] = row;
				this._operatorAmplitudeSliders[i] = amplitudeSlider;
				this._operatorEnvelopeSelects[i] = envelopeSelect;
				this._operatorFrequencySelects[i] = frequencySelect;
				
				envelopeSelect.addEventListener("change", () => {
					this._doc.record(new ChangeOperatorEnvelope(this._doc, operatorIndex, envelopeSelect.selectedIndex));
				});
				frequencySelect.addEventListener("change", () => {
					this._doc.record(new ChangeOperatorFrequency(this._doc, operatorIndex, frequencySelect.selectedIndex));
				});
			}
			
			for (let i: number = Config.drumCount - 1; i >= 0; i--) {
				const drumIndex: number = i;
				const spectrumEditor: SpectrumEditor = new SpectrumEditor(this._doc, drumIndex);
				spectrumEditor.container.addEventListener("mousedown", this._refocusStage);
				this._drumsetSpectrumEditors[i] = spectrumEditor;
				
				const envelopeSelect: HTMLSelectElement = buildOptions(select({style: "width: 100%;", title: "Filter Envelope"}), Config.envelopes.map(envelope=>envelope.name));
				this._drumsetEnvelopeSelects[i] = envelopeSelect;
				envelopeSelect.addEventListener("change", () => {
					this._doc.record(new ChangeDrumsetEnvelope(this._doc, drumIndex, envelopeSelect.selectedIndex));
				});
				
				const row: HTMLDivElement = div({className: "selectRow"}, [
					div({className: "selectContainer", style: "width: 5em; margin-right: .3em;"}, [envelopeSelect]),
					this._drumsetSpectrumEditors[i].container,
				]);
				this._drumsetGroup.appendChild(row);
			}
			
			this._fileMenu.addEventListener("change", this._fileMenuHandler);
			this._editMenu.addEventListener("change", this._editMenuHandler);
			this._optionsMenu.addEventListener("change", this._optionsMenuHandler);
			this._scaleSelect.addEventListener("change", this._whenSetScale);
			this._keySelect.addEventListener("change", this._whenSetKey);
			this._rhythmSelect.addEventListener("change", this._whenSetRhythm);
			this._pitchedPresetSelect.addEventListener("change", this._whenSetPitchedPreset);
			this._drumPresetSelect.addEventListener("change", this._whenSetDrumPreset);
			this._algorithmSelect.addEventListener("change", this._whenSetAlgorithm);
			this._instrumentSelect.addEventListener("change", this._whenSetInstrument);
			this._customizeInstrumentButton.addEventListener("click", this._whenCustomizePressed);
			this._feedbackTypeSelect.addEventListener("change", this._whenSetFeedbackType);
			this._feedbackEnvelopeSelect.addEventListener("change", this._whenSetFeedbackEnvelope);
			this._chipWaveSelect.addEventListener("change", this._whenSetChipWave);
			this._noiseWaveSelect.addEventListener("change", this._whenSetNoiseWave);
			this._transitionSelect.addEventListener("change", this._whenSetTransition);
			this._effectsSelect.addEventListener("change", this._whenSetEffects);
			this._filterEnvelopeSelect.addEventListener("change", this._whenSetFilterEnvelope);
			this._intervalSelect.addEventListener("change", this._whenSetInterval);
			this._chordSelect.addEventListener("change", this._whenSetChord);
			this._vibratoSelect.addEventListener("change", this._whenSetVibrato);
			this._playButton.addEventListener("click", this._togglePlay);
			this._prevBarButton.addEventListener("click", this._whenPrevBarPressed);
			this._nextBarButton.addEventListener("click", this._whenNextBarPressed);
			this._volumeSlider.addEventListener("input", this._setVolumeSlider);
			//this._instrumentTypeHint.addEventListener("click", this._openInstrumentTypePrompt);
			//this._intervalHint.addEventListener("click", this._openIntervalPrompt);
			
			this._editorBox.addEventListener("mousedown", this._refocusStage);
			this._spectrumEditor.container.addEventListener("mousedown", this._refocusStage);
			this._harmonicsEditor.container.addEventListener("mousedown", this._refocusStage);
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
						this.prompt = new ExportPrompt(this._doc, this);
						break;
					case "import":
						this.prompt = new ImportPrompt(this._doc, this);
						break;
					case "barCount":
						this.prompt = new SongDurationPrompt(this._doc, this);
						break;
					case "beatsPerBar":
						this.prompt = new BeatsPerBarPrompt(this._doc, this);
						break;
					case "channelSettings":
						this.prompt = new ChannelSettingsPrompt(this._doc, this);
						break;
					case "instrumentType":
						this.prompt = new InstrumentTypePrompt(this._doc, this);
						break;
						/*
					case "interval":
						this.prompt = new IntervalPrompt(this._doc, this);
						break;
						*/
					default:
						throw new Error("Unrecognized prompt type.");
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
				(this._doc.showLetters ? "✓ " : "") + "Show Piano Keys",
				(this._doc.showFifth ? "✓ " : "") + 'Highlight "Fifth" Notes',
				(this._doc.showChannels ? "✓ " : "") + "Show All Channels",
				(this._doc.showScrollBar ? "✓ " : "") + "Octave Scroll Bar",
				(this._doc.alwaysShowSettings ? "✓ " : "") + "Customize All Instruments",
				(this._doc.forceScaleChanges ? "✓ " : "") + "Force Scale Changes",
				(this._doc.forceRhythmChanges ? "✓ " : "") + "Force Rhythm Changes",
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
			const activeElement: Element | null = document.activeElement;
			
			setSelectedValue(this._scaleSelect, this._doc.song.scale);
			setSelectedValue(this._keySelect, Config.keys.length - 1 - this._doc.song.key);
			this._tempoSlider.updateValue(this._doc.song.tempo);
			this._tempoSlider.input.title = this._doc.song.getBeatsPerMinute() + " beats per minute";
			this._reverbSlider.updateValue(this._doc.song.reverb);
			setSelectedValue(this._rhythmSelect, this._doc.song.rhythm);
			
			if (this._doc.song.getChannelIsNoise(this._doc.channel)) {
				this._pitchedPresetSelect.style.display = "none";
				this._drumPresetSelect.style.display = "";
			} else {
				this._pitchedPresetSelect.style.display = "";
				this._drumPresetSelect.style.display = "none";
			}
			
			if (!this._doc.alwaysShowSettings && instrument.preset != instrument.type) {
				this._customizeInstrumentButton.style.display = "";
				this._customInstrumentSettingsGroup.style.display = "none";
			} else {
				this._customizeInstrumentButton.style.display = "none";
				this._customInstrumentSettingsGroup.style.display = "";
				
				if (instrument.type == InstrumentType.noise) {
					this._noiseWaveSelect.style.display = "";
				} else {
					this._noiseWaveSelect.style.display = "none";
				}
				if (instrument.type == InstrumentType.spectrum) {
					this._spectrumRow.style.display = "";
					this._spectrumEditor.render();
				} else {
					this._spectrumRow.style.display = "none";
				}
				if (instrument.type == InstrumentType.harmonics) {
					this._harmonicsRow.style.display = "";
					this._harmonicsEditor.render();
				} else {
					this._harmonicsRow.style.display = "none";
				}
				if (instrument.type == InstrumentType.drumset) {
					this._drumsetGroup.style.display = "";
					for (let i: number = 0; i < Config.drumCount; i++) {
						setSelectedValue(this._drumsetEnvelopeSelects[i], instrument.drumsetEnvelopes[i]);
						this._drumsetSpectrumEditors[i].render();
					}
				} else {
					this._drumsetGroup.style.display = "none";
				}
				if (instrument.type == InstrumentType.chip) {
					this._chipWaveSelect.style.display = "";
				} else {
					this._chipWaveSelect.style.display = "none";
				}
				if (instrument.type == InstrumentType.fm) {
					this._algorithmSelectRow.style.display = "";
					this._phaseModGroup.style.display = "";
					this._feedbackRow1.style.display = "";
					this._feedbackRow2.style.display = "";
				} else {
					this._algorithmSelectRow.style.display = "none";
					this._phaseModGroup.style.display = "none";
					this._feedbackRow1.style.display = "none";
					this._feedbackRow2.style.display = "none";
				}
				
				if (instrument.type == InstrumentType.noise) {
					this._vibratoSelectRow.style.display = "none";
					this._intervalSelectRow.style.display = "none";
					this._waveSelectRow.style.display = "";
					this._transitionRow.style.display = "";
					this._chordSelectRow.style.display = "";
					this._filterCutoffRow.style.display = "";
					this._filterResonanceRow.style.display = "";
					this._filterEnvelopeRow.style.display = "";
				} else if (instrument.type == InstrumentType.spectrum) {
					this._vibratoSelectRow.style.display = "none";
					this._intervalSelectRow.style.display = "none";
					this._waveSelectRow.style.display = "none";
					this._transitionRow.style.display = "";
					this._chordSelectRow.style.display = "";
					this._filterCutoffRow.style.display = "";
					this._filterResonanceRow.style.display = "";
					this._filterEnvelopeRow.style.display = "";
				} else if (instrument.type == InstrumentType.drumset) {
					this._vibratoSelectRow.style.display = "none";
					this._intervalSelectRow.style.display = "none";
					this._waveSelectRow.style.display = "none";
					this._transitionRow.style.display = "none";
					this._chordSelectRow.style.display = "none";
					this._filterCutoffRow.style.display = "none";
					this._filterResonanceRow.style.display = "none";
					this._filterEnvelopeRow.style.display = "none";
				} else if (instrument.type == InstrumentType.chip) {
					this._vibratoSelectRow.style.display = "";
					this._intervalSelectRow.style.display = "";
					this._waveSelectRow.style.display = "";
					this._transitionRow.style.display = "";
					this._chordSelectRow.style.display = "";
					this._filterCutoffRow.style.display = "";
					this._filterResonanceRow.style.display = "";
					this._filterEnvelopeRow.style.display = "";
				} else if (instrument.type == InstrumentType.fm) {
					this._vibratoSelectRow.style.display = "";
					this._intervalSelectRow.style.display = "none";
					this._waveSelectRow.style.display = "none";
					this._transitionRow.style.display = "";
					this._chordSelectRow.style.display = "";
					this._filterCutoffRow.style.display = "";
					this._filterResonanceRow.style.display = "";
					this._filterEnvelopeRow.style.display = "";
				} else if (instrument.type == InstrumentType.harmonics) {
					this._vibratoSelectRow.style.display = "";
					this._intervalSelectRow.style.display = "";
					this._waveSelectRow.style.display = "none";
					this._transitionRow.style.display = "";
					this._chordSelectRow.style.display = "";
					this._filterCutoffRow.style.display = "";
					this._filterResonanceRow.style.display = "";
					this._filterEnvelopeRow.style.display = "";
				} else {
					throw new Error("Unrecognized instrument type: " + instrument.type);
				}
			}

			for (let chordIndex: number = 0; chordIndex < Config.chords.length; chordIndex++) {
				const hidden: boolean = (instrument.type == InstrumentType.noise) ? !Config.chords[chordIndex].allowedForNoise : false;
				const option: Element = this._chordSelect.children[chordIndex];
				if (hidden) {
					if (!option.hasAttribute("hidden")) {
						option.setAttribute("hidden", "");
					}
				} else {
					option.removeAttribute("hidden");
				}
			}
			
			
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
			
			setSelectedValue(this._pitchedPresetSelect, instrument.preset);
			setSelectedValue(this._drumPresetSelect, instrument.preset);
			setSelectedValue(this._algorithmSelect, instrument.algorithm);
			setSelectedValue(this._chipWaveSelect, instrument.chipWave);
			setSelectedValue(this._noiseWaveSelect, instrument.noiseWave);
			this._filterCutoffSlider.updateValue(instrument.filterCutoff);
			this._filterResonanceSlider.updateValue(instrument.filterResonance);
			setSelectedValue(this._filterEnvelopeSelect, instrument.filterEnvelope);
			setSelectedValue(this._transitionSelect, instrument.transition);
			setSelectedValue(this._effectsSelect, instrument.effects);
			setSelectedValue(this._vibratoSelect, instrument.vibrato);
			setSelectedValue(this._intervalSelect, instrument.interval);
			setSelectedValue(this._chordSelect, instrument.chord);
			setSelectedValue(this._feedbackTypeSelect, instrument.feedbackType);
			this._feedbackAmplitudeSlider.updateValue(instrument.feedbackAmplitude);
			setSelectedValue(this._feedbackEnvelopeSelect, instrument.feedbackEnvelope);
			this._feedbackEnvelopeSelect.parentElement!.style.color = (instrument.feedbackAmplitude > 0) ? "" : "#999";
			this._instrumentVolumeSlider.updateValue(-instrument.volume);
			setSelectedValue(this._instrumentSelect, instrumentIndex);
			for (let i: number = 0; i < Config.operatorCount; i++) {
				const isCarrier: boolean = (i < Config.algorithms[instrument.algorithm].carrierCount);
				this._operatorRows[i].style.color = isCarrier ? "white" : "";
				setSelectedValue(this._operatorFrequencySelects[i], instrument.operators[i].frequency);
				this._operatorAmplitudeSliders[i].updateValue(instrument.operators[i].amplitude);
				setSelectedValue(this._operatorEnvelopeSelects[i], instrument.operators[i].envelope);
				const operatorName: string = (isCarrier ? "Voice " : "Modulator ") + (i + 1);
				this._operatorFrequencySelects[i].title = operatorName + " Frequency";
				this._operatorAmplitudeSliders[i].input.title = operatorName + (isCarrier ? " Volume" : " Amplitude");
				this._operatorEnvelopeSelects[i].title = operatorName + " Envelope";
				this._operatorEnvelopeSelects[i].parentElement!.style.color = (instrument.operators[i].amplitude > 0) ? "" : "#999";
			}
			
			this._piano.container.style.display = this._doc.showLetters ? "" : "none";
			this._octaveScrollBar.container.style.display = this._doc.showScrollBar ? "" : "none";
			this._barScrollBar.container.style.display = this._doc.song.barCount > this._doc.trackVisibleBars ? "" : "none";
			//this._instrumentTypeHint.style.display = (instrument.type == InstrumentType.fm) ? "" : "none";
			//this._intervalHint.style.display = (Config.intervalHarmonizes[instrument.interval]) ? "" : "none";
			
			let patternWidth: number = 512;
			if (this._doc.showLetters) patternWidth -= 32;
			if (this._doc.showScrollBar) patternWidth -= 20;
			this._patternEditor.container.style.width = String(patternWidth) + "px";
			
			this._volumeSlider.value = String(this._doc.volume);
			
			// If an interface element was selected, but becomes invisible (e.g. an instrument
			// select menu) just select the editor container so keyboard commands still work.
			if (wasActive && activeElement != null && activeElement.clientWidth == 0) {
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
				case 73: // i
					//this._copy();
					if (event.shiftKey) {
						const instrument: Instrument = this._doc.song.channels[this._doc.channel].instruments[this._doc.getCurrentInstrument()];
						const instrumentObject: any = instrument.toJsonObject();
						delete instrumentObject.volume;
						delete instrumentObject.preset;
						this._copyTextToClipboard(JSON.stringify(instrumentObject));
					}
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
		
		private _copyTextToClipboard(text: string): void {
			const textField: HTMLTextAreaElement = document.createElement('textarea');
			textField.innerText = text;
			document.body.appendChild(textField);
			textField.select();
			document.execCommand('copy');
			textField.remove();
			this._refocusStage();
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
				rhythmStepsPerBeat: Config.rhythms[this._doc.song.rhythm].stepsPerBeat,
				scale: this._doc.song.scale,
				drums: this._doc.song.getChannelIsNoise(this._doc.channel),
			};
			
			window.localStorage.setItem("patternCopy", JSON.stringify(patternCopy));
		}
		
		private _paste(): void {
			const pattern: Pattern | null = this._doc.getCurrentPattern();
			if (pattern == null) return;
			
			const patternCopy: PatternCopy | null = JSON.parse(String(window.localStorage.getItem("patternCopy")));
			
			if (patternCopy != null && patternCopy.drums == this._doc.song.getChannelIsNoise(this._doc.channel)) {
				this._doc.record(new ChangePaste(this._doc, pattern, patternCopy.notes, patternCopy.beatsPerBar, patternCopy.rhythmStepsPerBeat, patternCopy.scale));
			}
		}
		
		private _copyInstrument(): void {
			const channel: Channel = this._doc.song.channels[this._doc.channel];
			const instrument: Instrument = channel.instruments[this._doc.getCurrentInstrument()];
			const instrumentCopy: any = instrument.toJsonObject();
			instrumentCopy.isDrum = this._doc.song.getChannelIsNoise(this._doc.channel);
			window.localStorage.setItem("instrumentCopy", JSON.stringify(instrumentCopy));
		}
		
		private _pasteInstrument(): void {
			const channel: Channel = this._doc.song.channels[this._doc.channel];
			const instrument: Instrument = channel.instruments[this._doc.getCurrentInstrument()];
			const instrumentCopy: any = JSON.parse(String(window.localStorage.getItem("instrumentCopy")));
			if (instrumentCopy != null && instrumentCopy.isDrum == this._doc.song.getChannelIsNoise(this._doc.channel)) {
				this._doc.record(new ChangePasteInstrument(this._doc, instrument, instrumentCopy));
			}
		}
		
		private _transpose(upward: boolean): void {
			const pattern: Pattern | null = this._doc.getCurrentPattern();
			if (pattern == null) return;
			
			const canReplaceLastChange: boolean = this._doc.lastChangeWas(this._changeTranspose);
			this._changeTranspose = new ChangeTranspose(this._doc, pattern, upward);
			this._doc.record(this._changeTranspose, canReplaceLastChange);
		}
		/*
		private _openInstrumentTypePrompt = (): void => {
			this._openPrompt("instrumentType");
		}
		
		private _openIntervalPrompt = (): void => {
			this._openPrompt("interval");
		}
		*/
		private _whenSetScale = (): void => {
			this._doc.record(new ChangeScale(this._doc, this._scaleSelect.selectedIndex));
		}
		
		private _whenSetKey = (): void => {
			this._doc.record(new ChangeKey(this._doc, Config.keys.length - 1 - this._keySelect.selectedIndex));
		}
		
		private _whenSetRhythm = (): void => {
			this._doc.record(new ChangeRhythm(this._doc, this._rhythmSelect.selectedIndex));
		}
		
		private _whenSetPitchedPreset = (): void => {
			this._doc.record(new ChangePreset(this._doc, parseInt(this._pitchedPresetSelect.value)));
		}
		
		private _whenSetDrumPreset = (): void => {
			this._doc.record(new ChangePreset(this._doc, parseInt(this._drumPresetSelect.value)));
		}
		
		private _whenSetFeedbackType = (): void => {
			this._doc.record(new ChangeFeedbackType(this._doc, this._feedbackTypeSelect.selectedIndex));
		}
		
		private _whenSetFeedbackEnvelope = (): void => {
			this._doc.record(new ChangeFeedbackEnvelope(this._doc, this._feedbackEnvelopeSelect.selectedIndex));
		}
		
		private _whenSetAlgorithm = (): void => {
			this._doc.record(new ChangeAlgorithm(this._doc, this._algorithmSelect.selectedIndex));
		}
		
		private _whenSetInstrument = (): void => {
			const pattern : Pattern | null = this._doc.getCurrentPattern();
			if (pattern == null) return;
			this._doc.record(new ChangePatternInstrument(this._doc, this._instrumentSelect.selectedIndex, pattern));
		}
		
		private _whenCustomizePressed = (): void => {
			this._doc.record(new ChangeCustomizeInstrument(this._doc));
		}
		
		private _whenSetChipWave = (): void => {
			this._doc.record(new ChangeChipWave(this._doc, this._chipWaveSelect.selectedIndex));
		}
		
		private _whenSetNoiseWave = (): void => {
			this._doc.record(new ChangeNoiseWave(this._doc, this._noiseWaveSelect.selectedIndex));
		}
		
		private _whenSetFilterEnvelope = (): void => {
			this._doc.record(new ChangeFilterEnvelope(this._doc, this._filterEnvelopeSelect.selectedIndex));
		}
		
		private _whenSetTransition = (): void => {
			this._doc.record(new ChangeTransition(this._doc, this._transitionSelect.selectedIndex));
		}
		
		private _whenSetEffects = (): void => {
			this._doc.record(new ChangeEffects(this._doc, this._effectsSelect.selectedIndex));
		}
		
		private _whenSetVibrato = (): void => {
			this._doc.record(new ChangeVibrato(this._doc, this._vibratoSelect.selectedIndex));
		}
		
		private _whenSetInterval = (): void => {
			this._doc.record(new ChangeInterval(this._doc, this._intervalSelect.selectedIndex));
		}
		
		private _whenSetChord = (): void => {
			this._doc.record(new ChangeChord(this._doc, this._chordSelect.selectedIndex));
		}
		
		private _fileMenuHandler = (event:Event): void => {
			switch (this._fileMenu.value) {
				case "new":
					this._doc.record(new ChangeSong(this._doc, ""));
					this._patternEditor.resetCopiedPins();
					break;
				case "export":
					this._openPrompt("export");
					break;
				case "import":
					this._openPrompt("import");
					break;
			}
			this._fileMenu.selectedIndex = 0;
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
				case "copyInstrument":
					this._copyInstrument();
					break;
				case "pasteInstrument":
					this._pasteInstrument();
					break;
				case "transposeUp":
					this._transpose(true);
					break;
				case "transposeDown":
					this._transpose(false);
					break;
				case "detectKey":
					this._doc.record(new ChangeDetectKey(this._doc));
					break;
				case "barCount":
					this._openPrompt("barCount");
					break;
				case "beatsPerBar":
					this._openPrompt("beatsPerBar");
					break;
				case "channelSettings":
					this._openPrompt("channelSettings");
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
				case "forceScaleChanges":
					this._doc.forceScaleChanges = !this._doc.forceScaleChanges;
					break;
				case "forceRhythmChanges":
					this._doc.forceRhythmChanges = !this._doc.forceRhythmChanges;
					break;
				case "alwaysShowSettings":
					this._doc.alwaysShowSettings = !this._doc.alwaysShowSettings;
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
	
	// BeepBox uses browser history state as its own undo history. Browsers typically
	// remember scroll position for each history state, but BeepBox users would prefer not 
	// auto scrolling when undoing. Sadly this tweak doesn't work on Edge or IE.
	if ("scrollRestoration" in history) history.scrollRestoration = "manual";
	
	editor.updatePlayButton();
}
