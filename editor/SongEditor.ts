// Copyright (C) 2020 John Nesky, distributed under the MIT license.

import {InstrumentType, EffectType, Config, getPulseWidthRatio, effectsIncludeDistortion, effectsIncludePanning, effectsIncludeReverb} from "../synth/SynthConfig";
import {Preset, PresetCategory, EditorConfig, isMobile, prettyNumber} from "./EditorConfig";
import {ColorConfig} from "./ColorConfig";
import {Layout} from "./Layout";
import {Pattern, Instrument, Channel} from "../synth/synth";
import {HTML} from "imperative-html/dist/esm/elements-strict";
import {SongDocument} from "./SongDocument";
import {Prompt} from "./Prompt";
import {TipPrompt} from "./TipPrompt";
import {PatternEditor} from "./PatternEditor";
import {FilterEditor} from "./FilterEditor";
import {MuteEditor} from "./MuteEditor";
import {TrackEditor} from "./TrackEditor";
import {LoopEditor} from "./LoopEditor";
import {SpectrumEditor} from "./SpectrumEditor";
import {HarmonicsEditor} from "./HarmonicsEditor";
import {BarScrollBar} from "./BarScrollBar";
import {OctaveScrollBar} from "./OctaveScrollBar";
import {Piano} from "./Piano";
import {BeatsPerBarPrompt} from "./BeatsPerBarPrompt";
import {MoveNotesSidewaysPrompt} from "./MoveNotesSidewaysPrompt";
import {SongDurationPrompt} from "./SongDurationPrompt";
import {ChannelSettingsPrompt} from "./ChannelSettingsPrompt";
import {ExportPrompt} from "./ExportPrompt";
import {ImportPrompt} from "./ImportPrompt";
import {SongRecoveryPrompt} from "./SongRecoveryPrompt";
import {Change} from "./Change";
import {ChangeTempo, ChangeReverb, ChangeVolume, ChangePan, ChangePatternSelection, ChangePulseWidth, ChangeFeedbackAmplitude, ChangeFilterEnvelope, ChangeOperatorAmplitude, ChangeOperatorEnvelope, ChangeOperatorFrequency, ChangeDrumsetEnvelope, ChangeChannelBar, ChangePasteInstrument, ChangePreset, pickRandomPresetValue, ChangeRandomGeneratedInstrument, ChangeScale, ChangeDetectKey, ChangeKey, ChangeRhythm, ChangeFeedbackType, ChangeFeedbackEnvelope, ChangeAlgorithm, ChangeCustomizeInstrument, ChangeChipWave, ChangeNoiseWave, ChangePulseEnvelope, ChangeTransition, ChangeToggleEffects, ChangeVibrato, ChangeInterval, ChangeChord, ChangeSong, ChangeDistortion, ChangeSustain} from "./changes";

//namespace beepbox {
	const {button, div, input, select, span, optgroup, option} = HTML;
	
	function buildOptions(menu: HTMLSelectElement, items: ReadonlyArray<string | number>): HTMLSelectElement {
		for (let index: number = 0; index < items.length; index++) {
			menu.appendChild(option({value: index}, items[index]));
		} 
		return menu;
	}
	
	function buildPresetOptions(isNoise: boolean): HTMLSelectElement {
		const menu: HTMLSelectElement = select();
		
		menu.appendChild(optgroup({label: "Edit"},
			option({value: "copyInstrument"}, "Copy Instrument"),
			option({value: "pasteInstrument"}, "Paste Instrument"),
			option({value: "randomPreset"}, "Random Preset"),
			option({value: "randomGenerated"}, "Random Generated"),
		));
		
		// Show the "spectrum" custom type in both pitched and noise channels.
		const customTypeGroup: HTMLElement = optgroup({label: EditorConfig.presetCategories[0].name});
		if (isNoise) {
			customTypeGroup.appendChild(option({value: InstrumentType.noise}, EditorConfig.valueToPreset(InstrumentType.noise)!.name));
			customTypeGroup.appendChild(option({value: InstrumentType.spectrum}, EditorConfig.valueToPreset(InstrumentType.spectrum)!.name));
			customTypeGroup.appendChild(option({value: InstrumentType.drumset}, EditorConfig.valueToPreset(InstrumentType.drumset)!.name));
		} else {
			customTypeGroup.appendChild(option({value: InstrumentType.chip}, EditorConfig.valueToPreset(InstrumentType.chip)!.name));
			customTypeGroup.appendChild(option({value: InstrumentType.pwm}, EditorConfig.valueToPreset(InstrumentType.pwm)!.name));
			customTypeGroup.appendChild(option({value: InstrumentType.harmonics}, EditorConfig.valueToPreset(InstrumentType.harmonics)!.name));
			customTypeGroup.appendChild(option({value: InstrumentType.spectrum}, EditorConfig.valueToPreset(InstrumentType.spectrum)!.name));
			customTypeGroup.appendChild(option({value: InstrumentType.guitar}, EditorConfig.valueToPreset(InstrumentType.guitar)!.name));
			customTypeGroup.appendChild(option({value: InstrumentType.fm}, EditorConfig.valueToPreset(InstrumentType.fm)!.name));
		}
		menu.appendChild(customTypeGroup);
		
		for (let categoryIndex: number = 1; categoryIndex < EditorConfig.presetCategories.length; categoryIndex++) {
			const category: PresetCategory = EditorConfig.presetCategories[categoryIndex];
			const group: HTMLElement = optgroup({label: category.name});
			let foundAny: boolean = false;
			for (let presetIndex: number = 0; presetIndex < category.presets.length; presetIndex++) {
				const preset: Preset = category.presets[presetIndex];
				if ((preset.isNoise == true) == isNoise) {
					group.appendChild(option({value: (categoryIndex << 6) + presetIndex}, preset.name));
					foundAny = true;
				}
			}
			if (foundAny) menu.appendChild(group);
		}
		return menu;
	}
	
	function setSelectedValue(menu: HTMLSelectElement, value: number): void {
		const stringValue = value.toString();
		if (menu.value != stringValue) menu.value = stringValue;
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
		
		private readonly _patternEditorPrev: PatternEditor = new PatternEditor(this._doc, false, -1);
		private readonly _patternEditor: PatternEditor = new PatternEditor(this._doc, true, 0);
		private readonly _patternEditorNext: PatternEditor = new PatternEditor(this._doc, false, 1);
		private readonly _muteEditor: MuteEditor = new MuteEditor(this._doc);
		private readonly _trackEditor: TrackEditor = new TrackEditor(this._doc);
		private readonly _loopEditor: LoopEditor = new LoopEditor(this._doc);
		private readonly _octaveScrollBar: OctaveScrollBar = new OctaveScrollBar(this._doc);
		private readonly _piano: Piano = new Piano(this._doc);
		private readonly _playButton: HTMLButtonElement = button({style: "width: 80px;", type: "button"});
		private readonly _prevBarButton: HTMLButtonElement = button({class: "prevBarButton", style: "width: 40px;", type: "button", title: "Previous Bar (left bracket)"});
		private readonly _nextBarButton: HTMLButtonElement = button({class: "nextBarButton", style: "width: 40px;", type: "button", title: "Next Bar (right bracket)"});
		private readonly _volumeSlider: HTMLInputElement = input({title: "main volume", style: "width: 5em; flex-grow: 1; margin: 0;", type: "range", min: "0", max: "75", value: "50", step: "1"});
		private readonly _fileMenu: HTMLSelectElement = select({style: "width: 100%;"},
			option({selected: true, disabled: true, hidden: false}, "File"), // todo: "hidden" should be true but looks wrong on mac chrome, adds checkmark next to first visible option even though it's not selected. :(
			option({value: "new"}, "+ New Blank Song"),
			option({value: "import"}, "↑ Import Song..."),
			option({value: "export"}, "↓ Export Song..."),
			option({value: "copyUrl"}, "⎘ Copy Song URL"),
			option({value: "shareUrl"}, "⤳ Share Song URL"),
			option({value: "shortenUrl"}, "… Shorten Song URL"),
			option({value: "viewPlayer"}, "▶ View in Song Player"),
			option({value: "copyEmbed"}, "⎘ Copy HTML Embed Code"),
			option({value: "songRecovery"}, "⚠ Recover Recent Song..."),
		);
		private readonly _editMenu: HTMLSelectElement = select({style: "width: 100%;"},
			option({selected: true, disabled: true, hidden: false}, "Edit"), // todo: "hidden" should be true but looks wrong on mac chrome, adds checkmark next to first visible option even though it's not selected. :(
			option({value: "undo"}, "Undo (Z)"),
			option({value: "redo"}, "Redo (Y)"),
			option({value: "copy"}, "Copy Pattern (C)"),
			option({value: "pasteNotes"}, "Paste Pattern Notes (V)"),
			option({value: "pasteNumbers"}, "Paste Pattern Numbers (⇧V)"),
			option({value: "insertBars"}, "Insert Bar After Selection (⏎)"),
			option({value: "deleteBars"}, "Delete Selected Bar (⌫)"),
			option({value: "selectAll"}, "Select All (A)"),
			option({value: "selectChannel"}, "Select Channel (⇧A)"),
			option({value: "duplicatePatterns"}, "Duplicate Reused Patterns (D)"),
			option({value: "transposeUp"}, "Move Notes Up (+)"),
			option({value: "transposeDown"}, "Move Notes Down (-)"),
			option({value: "moveNotesSideways"}, "Move All Notes Sideways..."),
			option({value: "beatsPerBar"}, "Change Beats Per Bar..."),
			option({value: "barCount"}, "Change Song Length..."),
			option({value: "channelSettings"}, "Channel Settings..."),
		);
		private readonly _optionsMenu: HTMLSelectElement = select({style: "width: 100%;"},
			option({selected: true, disabled: true, hidden: false}, "Preferences"), // todo: "hidden" should be true but looks wrong on mac chrome, adds checkmark next to first visible option even though it's not selected. :(
			option({value: "autoPlay"}, "Auto Play On Load"),
			option({value: "autoFollow"}, "Auto Follow Track"),
			option({value: "enableNotePreview"}, "Preview Added Notes"),
			option({value: "showLetters"}, "Show Piano Keys"),
			option({value: "showFifth"}, 'Highlight "Fifth" Notes'),
			option({value: "showChannels"}, "Show All Channels"),
			option({value: "showScrollBar"}, "Octave Scroll Bar"),
			option({value: "alwaysShowSettings"}, "Customize All Instruments"),
			option({value: "enableChannelMuting"}, "Enable Channel Muting"),
			option({value: "displayBrowserUrl"}, "Display Song Data in URL"),
			option({value: "fullScreen"}, "Full-Screen Layout"),
			option({value: "colorTheme"}, "Light Theme"),
		);
		private readonly _scaleSelect: HTMLSelectElement = buildOptions(select(), Config.scales.map(scale=>scale.name));
		private readonly _keySelect: HTMLSelectElement = buildOptions(select(), Config.keys.map(key=>key.name).reverse());
		private readonly _tempoSlider: Slider = new Slider(input({style: "margin: 0; width: 4em; flex-grow: 1; vertical-align: middle;", type: "range", min: "0", max: "14", value: "7", step: "1"}), this._doc, (oldValue: number, newValue: number) => new ChangeTempo(this._doc, oldValue, Math.round(120.0 * Math.pow(2.0, (-4.0 + newValue) / 9.0))));
		private readonly _tempoStepper: HTMLInputElement = input({style: "width: 3em; margin-left: 0.4em; vertical-align: middle;", type: "number", step: "1"});
		private readonly _reverbSlider: Slider = new Slider(input({style: "margin: 0;", type: "range", min: "0", max: Config.reverbRange - 1, value: "0", step: "1"}), this._doc, (oldValue: number, newValue: number) => new ChangeReverb(this._doc, oldValue, newValue));
		private readonly _reverbRow: HTMLDivElement = div({class: "selectRow"}, span({class: "tip", onclick: ()=>this._openPrompt("reverb")}, "Reverb: "), this._reverbSlider.input);
		private readonly _rhythmSelect: HTMLSelectElement = buildOptions(select(), Config.rhythms.map(rhythm=>rhythm.name));
		private readonly _pitchedPresetSelect: HTMLSelectElement = buildPresetOptions(false);
		private readonly _drumPresetSelect: HTMLSelectElement = buildPresetOptions(true);
		private readonly _algorithmSelect: HTMLSelectElement = buildOptions(select(), Config.algorithms.map(algorithm=>algorithm.name));
		private readonly _algorithmSelectRow: HTMLDivElement = div({class: "selectRow"}, span({class: "tip", onclick: ()=>this._openPrompt("algorithm")}, "Algorithm: "), div({class: "selectContainer"}, this._algorithmSelect));
		private readonly _instrumentSelect: HTMLSelectElement = select();
		private readonly _instrumentSelectRow: HTMLDivElement = div({class: "selectRow", style: "display: none;"}, span({class: "tip", onclick: ()=>this._openPrompt("instrumentIndex")}, "Instrument: "), div({class: "selectContainer"}, this._instrumentSelect));
		private readonly _instrumentVolumeSlider: Slider = new Slider(input({style: "margin: 0;", type: "range", min: -(Config.volumeRange - 1), max: "0", value: "0", step: "1"}), this._doc, (oldValue: number, newValue: number) => new ChangeVolume(this._doc, oldValue, -newValue));
		private readonly _instrumentVolumeSliderRow: HTMLDivElement = div({class: "selectRow"}, span({class: "tip", onclick: ()=>this._openPrompt("instrumentVolume")}, "Volume: "), this._instrumentVolumeSlider.input);
		private readonly _panSlider: Slider = new Slider(input({style: "margin: 0;", type: "range", min: "0", max: Config.panMax, value: Config.panCenter, step: "1"}), this._doc, (oldValue: number, newValue: number) => new ChangePan(this._doc, oldValue, newValue));
		private readonly _panSliderRow: HTMLDivElement = div({class: "selectRow"}, span({class: "tip", onclick: ()=>this._openPrompt("pan")}, "Panning: "), this._panSlider.input);
		private readonly _chipWaveSelect: HTMLSelectElement = buildOptions(select(), Config.chipWaves.map(wave=>wave.name));
		private readonly _chipNoiseSelect: HTMLSelectElement = buildOptions(select(), Config.chipNoises.map(wave=>wave.name));
		private readonly _chipWaveSelectRow: HTMLDivElement = div({class: "selectRow"}, span({class: "tip", onclick: ()=>this._openPrompt("chipWave")}, "Wave: "), div({class: "selectContainer"}, this._chipWaveSelect));
		private readonly _chipNoiseSelectRow: HTMLDivElement = div({class: "selectRow"}, span({class: "tip", onclick: ()=>this._openPrompt("chipNoise")}, "Noise: "), div({class: "selectContainer"}, this._chipNoiseSelect));
		private readonly _transitionSelect: HTMLSelectElement = buildOptions(select(), Config.transitions.map(transition=>transition.name));
		private readonly _transitionRow: HTMLDivElement = div({class: "selectRow"}, span({class: "tip", onclick: ()=>this._openPrompt("transition")}, "Transition:"), div({class: "selectContainer"}, this._transitionSelect));
		private readonly _effectsDisplayOption: HTMLOptionElement = option({selected: true, disabled: true, hidden: false}, "Preferences"); // todo: "hidden" should be true but looks wrong on mac chrome, adds checkmark next to first visible option even though it's not selected. :(
		private readonly _effectsSelect: HTMLSelectElement = select(this._effectsDisplayOption);
		private readonly _filterEditor: FilterEditor = new FilterEditor(this._doc);
		private readonly _filterRow: HTMLElement = div({class: "selectRow"}, span({class: "tip", onclick: ()=>this._openPrompt("filter")}, "Filter:"), this._filterEditor.container);
		private readonly _distortionFilterEditor: FilterEditor = new FilterEditor(this._doc, true);
		private readonly _distortionFilterRow: HTMLElement = div({class: "selectRow"}, span({class: "tip", onclick: ()=>this._openPrompt("distortionFilter")}, "Post-Filter:"), this._distortionFilterEditor.container);
		private readonly _filterEnvelopeSelect: HTMLSelectElement = buildOptions(select(), Config.envelopes.map(envelope=>envelope.name));
		private _filterEnvelopeRow: HTMLDivElement = div({class: "selectRow", title: "Low-pass Filter Envelope"}, span({class: "tip", onclick: ()=>this._openPrompt("filterEnvelope")}, "Filter Env:"), div({class: "selectContainer"}, this._filterEnvelopeSelect));
		private readonly _pulseEnvelopeSelect: HTMLSelectElement = buildOptions(select(), Config.envelopes.map(envelope=>envelope.name));
		private _pulseEnvelopeRow: HTMLDivElement = div({class: "selectRow", title: "Pulse Width Modulator Envelope"}, span({class: "tip", onclick: ()=>this._openPrompt("pulseEnvelope")}, "Pulse Env:"), div({class: "selectContainer"}, this._pulseEnvelopeSelect));
		private readonly _pulseWidthSlider: Slider = new Slider(input({style: "margin: 0;", type: "range", min: "0", max: Config.pulseWidthRange - 1, value: "0", step: "1"}), this._doc, (oldValue: number, newValue: number) => new ChangePulseWidth(this._doc, oldValue, newValue));
		private _pulseWidthRow: HTMLDivElement = div({class: "selectRow"}, span({class: "tip", onclick: ()=>this._openPrompt("pulseWidth")}, "Pulse Width:"), this._pulseWidthSlider.input);
		private readonly _distortionSlider: Slider = new Slider(input({style: "margin: 0;", type: "range", min: "0", max: Config.distortionRange - 1, value: "0", step: "1"}), this._doc, (oldValue: number, newValue: number) => new ChangeDistortion(this._doc, oldValue, newValue));
		private _distortionRow: HTMLDivElement = div({class: "selectRow"}, span({class: "tip", onclick: ()=>this._openPrompt("distortion")}, "Distortion:"), this._distortionSlider.input);
		private readonly _sustainSlider: Slider = new Slider(input({style: "margin: 0;", type: "range", min: "0", max: Config.sustainRange - 1, value: "0", step: "1"}), this._doc, (oldValue: number, newValue: number) => new ChangeSustain(this._doc, oldValue, newValue));
		private _sustainRow: HTMLDivElement = div({class: "selectRow"}, span({class: "tip", onclick: ()=>this._openPrompt("sustain")}, "Sustain:"), this._sustainSlider.input);
		private readonly _intervalSelect: HTMLSelectElement = buildOptions(select(), Config.intervals.map(interval=>interval.name));
		private readonly _intervalSelectRow: HTMLElement = div({class: "selectRow"}, span({class: "tip", onclick: ()=>this._openPrompt("interval")}, "Interval:"), div({class: "selectContainer"}, this._intervalSelect));
		private readonly _chordSelect: HTMLSelectElement = buildOptions(select(), Config.chords.map(chord=>chord.name));
		private readonly _chordSelectRow: HTMLElement = div({class: "selectRow"}, span({class: "tip", onclick: ()=>this._openPrompt("chords")}, "Chords:"), div({class: "selectContainer"}, this._chordSelect));
		private readonly _vibratoSelect: HTMLSelectElement = buildOptions(select(), Config.vibratos.map(vibrato=>vibrato.name));
		private readonly _vibratoSelectRow: HTMLElement = div({class: "selectRow"}, span({class: "tip", onclick: ()=>this._openPrompt("vibrato")}, "Vibrato:"), div({class: "selectContainer"}, this._vibratoSelect));
		private readonly _phaseModGroup: HTMLElement = div({class: "editor-controls"});
		private readonly _feedbackTypeSelect: HTMLSelectElement = buildOptions(select(), Config.feedbacks.map(feedback=>feedback.name));
		private readonly _feedbackRow1: HTMLDivElement = div({class: "selectRow"}, span({class: "tip", onclick: ()=>this._openPrompt("feedbackType")}, "Feedback:"), div({class: "selectContainer"}, this._feedbackTypeSelect));
		private readonly _spectrumEditor: SpectrumEditor = new SpectrumEditor(this._doc, null);
		private readonly _spectrumRow: HTMLElement = div({class: "selectRow"}, span({class: "tip", onclick: ()=>this._openPrompt("spectrum")}, "Spectrum:"), this._spectrumEditor.container);
		private readonly _harmonicsEditor: HarmonicsEditor = new HarmonicsEditor(this._doc);
		private readonly _harmonicsRow: HTMLElement = div({class: "selectRow"}, span({class: "tip", onclick: ()=>this._openPrompt("harmonics")}, "Harmonics:"), this._harmonicsEditor.container);
		private readonly _drumsetGroup: HTMLElement = div({class: "editor-controls"});
		
		private readonly _feedbackAmplitudeSlider: Slider = new Slider(input({style: "margin: 0; width: 4em;", type: "range", min: "0", max: Config.operatorAmplitudeMax, value: "0", step: "1", title: "Feedback Amplitude"}), this._doc, (oldValue: number, newValue: number) => new ChangeFeedbackAmplitude(this._doc, oldValue, newValue));
		private readonly _feedbackEnvelopeSelect: HTMLSelectElement = buildOptions(select({style: "width: 100%;", title: "Feedback Envelope"}), Config.envelopes.map(envelope=>envelope.name));
		private readonly _feedbackRow2: HTMLDivElement = div({class: "operatorRow"},
			div({style: "margin-right: .1em; visibility: hidden;"}, 1 + "."),
			div({style: "width: 3em; margin-right: .3em;"}),
			this._feedbackAmplitudeSlider.input,
			div({class: "selectContainer", style: "width: 5em; margin-left: .3em;"}, this._feedbackEnvelopeSelect),
		);
		private readonly _customizeInstrumentButton: HTMLButtonElement = button({type: "button", class: "customize-instrument"},
			"Customize Instrument",
		);
		private readonly _customInstrumentSettingsGroup: HTMLDivElement = div({class: "editor-controls"},
			this._filterRow,
			this._filterEnvelopeRow,
			this._transitionRow,
			this._chordSelectRow,
			this._vibratoSelectRow,
			this._intervalSelectRow,
			this._chipWaveSelectRow,
			this._chipNoiseSelectRow,
			this._algorithmSelectRow,
			this._phaseModGroup,
			this._feedbackRow1,
			this._feedbackRow2,
			this._spectrumRow,
			this._harmonicsRow,
			this._drumsetGroup,
			this._pulseEnvelopeRow,
			this._pulseWidthRow,
			this._sustainRow,
			div({class: "selectRow"},
				span({class: "tip", onclick: ()=>this._openPrompt("effects")}, "Effects:"),
				div({class: "selectContainer"}, this._effectsSelect),
			),
			this._distortionRow,
			this._distortionFilterRow,
			this._panSliderRow,
			this._reverbRow,
		);
		private readonly _instrumentSettingsGroup: HTMLDivElement = div({class: "editor-controls"},
			div({style: `margin: 3px 0; text-align: center; color: ${ColorConfig.secondaryText};`},
				"Instrument Settings"
			),
			this._instrumentSelectRow,
			this._instrumentVolumeSliderRow,
			div({class: "selectRow"},
				span({class: "tip", onclick: ()=>this._openPrompt("instrumentType")}, "Type: "),
				div({class: "selectContainer"}, this._pitchedPresetSelect, this._drumPresetSelect),
			),
			this._customizeInstrumentButton,
			this._customInstrumentSettingsGroup,
		);
		private readonly _promptContainer: HTMLDivElement = div({class: "promptContainer", style: "display: none;"});
		private readonly _patternEditorRow: HTMLDivElement = div({style: "flex: 1; height: 100%; display: flex; overflow: hidden; justify-content: center;"},
			this._patternEditorPrev.container,
			this._patternEditor.container,
			this._patternEditorNext.container,
		);
		private readonly _patternArea: HTMLDivElement = div({class: "pattern-area"},
			this._piano.container,
			this._patternEditorRow,
			this._octaveScrollBar.container,
		);
		private readonly _trackContainer: HTMLDivElement = div({class: "trackContainer"},
			this._trackEditor.container,
			this._loopEditor.container,
		);
		private readonly _trackAndMuteContainer: HTMLDivElement = div({class: "trackAndMuteContainer"},
			this._muteEditor.container,
			this._trackContainer,
		);
		private readonly _barScrollBar: BarScrollBar = new BarScrollBar(this._doc, this._trackContainer);
		private readonly _trackArea: HTMLDivElement = div({class: "track-area"},
			this._trackAndMuteContainer,
			this._barScrollBar.container,
		);
		
		private readonly _settingsArea: HTMLDivElement = div({class: "settings-area noSelection"},
			div({class: "version-area"},
				div({style: `text-align: center; margin: 3px 0; color: ${ColorConfig.secondaryText};`}, EditorConfig.versionDisplayName),
			),
			div({class: "play-pause-area"},
				div({class: "playback-bar-controls"},
					this._playButton,
					this._prevBarButton,
					this._nextBarButton,
				),
				div({class: "playback-volume-controls"},
					span({class: "volume-speaker"}),
					this._volumeSlider,
				),
			),
			div({class: "menu-area"},
				div({class: "selectContainer menu file"},
					this._fileMenu,
				),
				div({class: "selectContainer menu edit"},
					this._editMenu,
				),
				div({class: "selectContainer menu preferences"},
					this._optionsMenu,
				),
			),
			div({class: "song-settings-area"},
				div({class: "editor-controls"},
					div({style: `margin: 3px 0; text-align: center; color: ${ColorConfig.secondaryText};`},
						"Song Settings",
					),
					div({class: "selectRow"},
						span({class: "tip", onclick: ()=>this._openPrompt("scale")}, "Scale: "),
						div({class: "selectContainer"}, this._scaleSelect),
					),
					div({class: "selectRow"},
						span({class: "tip", onclick: ()=>this._openPrompt("key")}, "Key: "),
						div({class: "selectContainer"}, this._keySelect),
					),
					div({class: "selectRow"},
						span({class: "tip", onclick: ()=>this._openPrompt("tempo")}, "Tempo: "),
						span({style: "display: flex;"},
							this._tempoSlider.input,
							this._tempoStepper,
						),
					),
					div({class: "selectRow"},
						span({class: "tip", onclick: ()=>this._openPrompt("rhythm")}, "Rhythm: "),
						div({class: "selectContainer"}, this._rhythmSelect),
					),
				),
			),
			div({class: "instrument-settings-area"},
				this._instrumentSettingsGroup,
			),
		);
		
		public readonly mainLayer: HTMLDivElement = div({class: "beepboxEditor", tabIndex: "0"},
			this._patternArea,
			this._trackArea,
			this._settingsArea,
			this._promptContainer,
		);
		
		private _wasPlaying: boolean = false;
		private _currentPromptName: string | null = null;
		private readonly _operatorRows: HTMLDivElement[] = []
		private readonly _operatorAmplitudeSliders: Slider[] = []
		private readonly _operatorEnvelopeSelects: HTMLSelectElement[] = []
		private readonly _operatorFrequencySelects: HTMLSelectElement[] = []
		private readonly _drumsetSpectrumEditors: SpectrumEditor[] = [];
		private readonly _drumsetEnvelopeSelects: HTMLSelectElement[] = [];
		
		constructor(private _doc: SongDocument) {
			this._doc.notifier.watch(this.whenUpdated);
			window.addEventListener("resize", this.whenUpdated);
			
			if (!("share" in navigator)) {
				this._fileMenu.removeChild(this._fileMenu.querySelector("[value='shareUrl']")!);
			}
			
			this._scaleSelect.appendChild(optgroup({label: "Edit"},
				option({value: "forceScale"}, "Snap Notes To Scale"),
			));
			this._keySelect.appendChild(optgroup({label: "Edit"},
				option({value: "detectKey"}, "Detect Key"),
			));
			this._rhythmSelect.appendChild(optgroup({label: "Edit"},
				option({value: "forceRhythm"}, "Snap Notes To Rhythm"),
			));
			
			this._phaseModGroup.appendChild(div({class: "operatorRow", style: `color: ${ColorConfig.secondaryText}; height: 1em; margin-top: 0.5em;`},
				div({style: "margin-right: .1em; visibility: hidden;"}, 1 + "."),
				div({style: "width: 3em; margin-right: .3em;", class: "tip", onclick: ()=>this._openPrompt("operatorFrequency")}, "Freq:"),
				div({style: "width: 4em; margin: 0;", class: "tip", onclick: ()=>this._openPrompt("operatorVolume")}, "Volume:"),
				div({style: "width: 5em; margin-left: .3em;", class: "tip", onclick: ()=>this._openPrompt("operatorEnvelope")}, "Envelope:"),
			));
			for (let i: number = 0; i < Config.operatorCount; i++) {
				const operatorIndex: number = i;
				const operatorNumber: HTMLDivElement = div({style: `margin-right: .1em; color: ${ColorConfig.secondaryText};`}, i + 1 + ".");
				const frequencySelect: HTMLSelectElement = buildOptions(select({style: "width: 100%;", title: "Frequency"}), Config.operatorFrequencies.map(freq=>freq.name));
				const amplitudeSlider: Slider = new Slider(input({style: "margin: 0; width: 4em;", type: "range", min: "0", max: Config.operatorAmplitudeMax, value: "0", step: "1", title: "Volume"}), this._doc, (oldValue: number, newValue: number) => new ChangeOperatorAmplitude(this._doc, operatorIndex, oldValue, newValue));
				const envelopeSelect: HTMLSelectElement = buildOptions(select({style: "width: 100%;", title: "Envelope"}), Config.envelopes.map(envelope=>envelope.name));
				const row: HTMLDivElement = div({class: "operatorRow"},
					operatorNumber,
					div({class: "selectContainer", style: "width: 3em; margin-right: .3em;"}, frequencySelect),
					amplitudeSlider.input,
					div({class: "selectContainer", style: "width: 5em; margin-left: .3em;"}, envelopeSelect),
				);
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
			
			this._drumsetGroup.appendChild(
				div({class: "selectRow"},
					span({class: "tip", onclick: ()=>this._openPrompt("drumsetEnvelope")}, "Envelope:"),
					span({class: "tip", onclick: ()=>this._openPrompt("drumsetSpectrum")}, "Spectrum:"),
				),
			);
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
				
				const row: HTMLDivElement = div({class: "selectRow"},
					div({class: "selectContainer", style: "width: 5em; margin-right: .3em;"}, envelopeSelect),
					this._drumsetSpectrumEditors[i].container,
				);
				this._drumsetGroup.appendChild(row);
			}
			
			this._fileMenu.addEventListener("change", this._fileMenuHandler);
			this._editMenu.addEventListener("change", this._editMenuHandler);
			this._optionsMenu.addEventListener("change", this._optionsMenuHandler);
			this._tempoStepper.addEventListener("change", this._whenSetTempo);
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
			this._chipNoiseSelect.addEventListener("change", this._whenSetNoiseWave);
			this._transitionSelect.addEventListener("change", this._whenSetTransition);
			this._effectsSelect.addEventListener("change", this._whenSetEffects);
			this._filterEnvelopeSelect.addEventListener("change", this._whenSetFilterEnvelope);
			this._pulseEnvelopeSelect.addEventListener("change", this._whenSetPulseEnvelope);
			this._intervalSelect.addEventListener("change", this._whenSetInterval);
			this._chordSelect.addEventListener("change", this._whenSetChord);
			this._vibratoSelect.addEventListener("change", this._whenSetVibrato);
			this._playButton.addEventListener("click", this._togglePlay);
			this._prevBarButton.addEventListener("click", this._whenPrevBarPressed);
			this._nextBarButton.addEventListener("click", this._whenNextBarPressed);
			this._volumeSlider.addEventListener("input", this._setVolumeSlider);
			
			this._patternArea.addEventListener("mousedown", this._refocusStage);
			this._trackArea.addEventListener("mousedown", this._refocusStage);
			this._spectrumEditor.container.addEventListener("mousedown", this._refocusStage);
			this._filterEditor.container.addEventListener("mousedown", this._refocusStage);
			this._distortionFilterEditor.container.addEventListener("mousedown", this._refocusStage);
			this._harmonicsEditor.container.addEventListener("mousedown", this._refocusStage);
			this._tempoStepper.addEventListener("keydown", this._tempoStepperCaptureNumberKeys, false);
			this.mainLayer.addEventListener("keydown", this._whenKeyPressed);
			
			this._promptContainer.addEventListener("click", (event) => {
				if (event.target == this._promptContainer) {
					this._doc.undo();
				}
			});
			
			if (isMobile) {
				const autoPlayOption: HTMLOptionElement = <HTMLOptionElement> this._optionsMenu.querySelector("[value=autoPlay]");
				autoPlayOption.disabled = true;
				autoPlayOption.setAttribute("hidden", "");
			}
			
			if (window.screen.availWidth < 700 || window.screen.availHeight < 700) {
				const fullScreenOption: HTMLOptionElement = <HTMLOptionElement> this._optionsMenu.querySelector("[value=fullScreen]");
				fullScreenOption.disabled = true;
				fullScreenOption.setAttribute("hidden", "");
			}
		}
		
		private _openPrompt(promptName: string): void {
			this._doc.openPrompt(promptName);
			this._setPrompt(promptName);
		}
		
		private _setPrompt(promptName: string | null): void {
			if (this._currentPromptName == promptName) return;
			this._currentPromptName = promptName;
			
			if (this.prompt) {
				if (this._wasPlaying && !(this.prompt instanceof TipPrompt)) {
					this._play();
				}
				this._wasPlaying = false;
				this._promptContainer.style.display = "none";
				this._promptContainer.removeChild(this.prompt.container);
				this.prompt.cleanUp();
				this.prompt = null;
				this._refocusStage();
			}
			
			if (promptName) {
				switch (promptName) {
					case "export":
						this.prompt = new ExportPrompt(this._doc);
						break;
					case "import":
						this.prompt = new ImportPrompt(this._doc);
						break;
					case "songRecovery":
						this.prompt = new SongRecoveryPrompt(this._doc);
						break;
					case "barCount":
						this.prompt = new SongDurationPrompt(this._doc);
						break;
					case "beatsPerBar":
						this.prompt = new BeatsPerBarPrompt(this._doc);
						break;
					case "moveNotesSideways":
						this.prompt = new MoveNotesSidewaysPrompt(this._doc);
						break;
					case "channelSettings":
						this.prompt = new ChannelSettingsPrompt(this._doc);
						break;
					default:
						this.prompt = new TipPrompt(this._doc, promptName);
						break;
				}
				
				if (this.prompt) {
					if (!(this.prompt instanceof TipPrompt)) {
						this._wasPlaying = this._doc.synth.playing;
						this._pause();
					}
					this._promptContainer.style.display = "";
					this._promptContainer.appendChild(this.prompt.container);
				}
			}
		}
		
		private _refocusStage = (): void => {
			this.mainLayer.focus({preventScroll: true});
		}
		
		public whenUpdated = (): void => {
			this._muteEditor.container.style.display = this._doc.enableChannelMuting ? "" : "none";
			const trackBounds = this._trackContainer.getBoundingClientRect();
			this._doc.trackVisibleBars = Math.floor((trackBounds.right - trackBounds.left) / this._doc.getBarWidth());
			this._barScrollBar.render();
			this._muteEditor.render();
			this._trackEditor.render();
			
			this._piano.container.style.display = this._doc.showLetters ? "" : "none";
			this._octaveScrollBar.container.style.display = this._doc.showScrollBar ? "" : "none";
			this._barScrollBar.container.style.display = this._doc.song.barCount > this._doc.trackVisibleBars ? "" : "none";
			
			if (this._doc.getFullScreen()) {
				const semitoneHeight: number = this._patternEditorRow.clientHeight / Config.windowPitchCount;
				const targetBeatWidth: number = semitoneHeight * 5;
				const minBeatWidth: number = this._patternEditorRow.clientWidth / (this._doc.song.beatsPerBar * 3);
				const maxBeatWidth: number = this._patternEditorRow.clientWidth / (this._doc.song.beatsPerBar + 2);
				const beatWidth: number = Math.max(minBeatWidth, Math.min(maxBeatWidth, targetBeatWidth));
				const patternEditorWidth: number = beatWidth * this._doc.song.beatsPerBar;
				
				this._patternEditorPrev.container.style.width = patternEditorWidth + "px";
				this._patternEditor.container.style.width = patternEditorWidth + "px";
				this._patternEditorNext.container.style.width = patternEditorWidth + "px";
				this._patternEditorPrev.container.style.flexShrink = "0";
				this._patternEditor.container.style.flexShrink = "0";
				this._patternEditorNext.container.style.flexShrink = "0";
				this._patternEditorPrev.container.style.display = "";
				this._patternEditorNext.container.style.display = "";
				this._patternEditorPrev.render();
				this._patternEditorNext.render();
			} else {
				this._patternEditor.container.style.width = "";
				this._patternEditor.container.style.flexShrink = "";
				this._patternEditorPrev.container.style.display = "none";
				this._patternEditorNext.container.style.display = "none";
			}
			this._patternEditor.render();
			
			const optionCommands: ReadonlyArray<string> = [
				(this._doc.autoPlay ? "✓ " : "　") + "Auto Play On Load",
				(this._doc.autoFollow ? "✓ " : "　") + "Auto Follow Track",
				(this._doc.enableNotePreview ? "✓ " : "　") + "Preview Added Notes",
				(this._doc.showLetters ? "✓ " : "　") + "Show Piano Keys",
				(this._doc.showFifth ? "✓ " : "　") + 'Highlight "Fifth" Notes',
				(this._doc.showChannels ? "✓ " : "　") + "Show All Channels",
				(this._doc.showScrollBar ? "✓ " : "　") + "Octave Scroll Bar",
				(this._doc.alwaysShowSettings ? "✓ " : "　") + "Customize All Instruments",
				(this._doc.enableChannelMuting ? "✓ " : "　") + "Enable Channel Muting",
				(this._doc.displayBrowserUrl ? "✓ " : "　") + "Display Song Data in URL",
				(this._doc.fullScreen ? "✓ " : "　") + "Full-Screen Layout",
				(this._doc.colorTheme == "light classic" ? "✓ " : "　") + "Light Theme",
			];
			for (let i: number = 0; i < optionCommands.length; i++) {
				const option: HTMLOptionElement = <HTMLOptionElement> this._optionsMenu.children[i + 1];
				if (option.textContent != optionCommands[i]) option.textContent = optionCommands[i];
			}
			
			const channel: Channel = this._doc.song.channels[this._doc.channel];
			const pattern: Pattern | null = this._doc.getCurrentPattern();
			const instrumentIndex: number = this._doc.getCurrentInstrument();
			const instrument: Instrument = channel.instruments[instrumentIndex];
			const wasActive: boolean = this.mainLayer.contains(document.activeElement);
			const activeElement: Element | null = document.activeElement;
			
			let effectDisplayLabel: string = "";
			for (let i: number = this._effectsSelect.childElementCount - 1; i < Config.effectOrder.length; i++) {
				this._effectsSelect.appendChild(option({value: i}));
			}
			this._effectsSelect.selectedIndex = 0;
			for (let i: number = 0; i < Config.effectOrder.length; i++) {
				let effectFlag: number = Config.effectOrder[i];
				const selected: boolean = ((instrument.effects & (1 << effectFlag)) != 0);
				const label: string = (selected ? "✓ " : "　") + Config.effectsNames[effectFlag];
				const option: HTMLOptionElement = <HTMLOptionElement> this._effectsSelect.children[i + 1];
				if (option.textContent != label) option.textContent = label;
				if (selected) {
					if (effectDisplayLabel != "") effectDisplayLabel += ", ";
					effectDisplayLabel += Config.effectsNames[effectFlag];
				}
			}
			if (effectDisplayLabel == "") effectDisplayLabel = "none";
			if (this._effectsDisplayOption.textContent != effectDisplayLabel) this._effectsDisplayOption.textContent = effectDisplayLabel;
			
			setSelectedValue(this._scaleSelect, this._doc.song.scale);
			this._scaleSelect.title = Config.scales[this._doc.song.scale].realName;
			setSelectedValue(this._keySelect, Config.keys.length - 1 - this._doc.song.key);
			this._tempoSlider.updateValue(Math.max(0, Math.min(28, Math.round(4.0 + 9.0 * Math.log2(this._doc.song.tempo / 120.0)))));
			this._tempoStepper.value = this._doc.song.tempo.toString();
			setSelectedValue(this._rhythmSelect, this._doc.song.rhythm);
			
			if (this._doc.song.getChannelIsNoise(this._doc.channel)) {
				this._pitchedPresetSelect.style.display = "none";
				this._drumPresetSelect.style.display = "";
				setSelectedValue(this._drumPresetSelect, instrument.preset);
			} else {
				this._pitchedPresetSelect.style.display = "";
				this._drumPresetSelect.style.display = "none";
				setSelectedValue(this._pitchedPresetSelect, instrument.preset);
			}
			
			if (!this._doc.alwaysShowSettings && instrument.preset != instrument.type) {
				this._customizeInstrumentButton.style.display = "";
				this._customInstrumentSettingsGroup.style.display = "none";
			} else {
				this._customizeInstrumentButton.style.display = "none";
				this._customInstrumentSettingsGroup.style.display = "";
				
				if (instrument.type == InstrumentType.noise) {
					this._chipNoiseSelectRow.style.display = "";
					setSelectedValue(this._chipNoiseSelect, instrument.chipNoise);
				} else {
					this._chipNoiseSelectRow.style.display = "none";
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
					this._transitionRow.style.display = "none";
					this._chordSelectRow.style.display = "none";
					this._filterEnvelopeRow.style.display = "none";
					for (let i: number = 0; i < Config.drumCount; i++) {
						setSelectedValue(this._drumsetEnvelopeSelects[i], instrument.drumsetEnvelopes[i]);
						this._drumsetSpectrumEditors[i].render();
					}
				} else {
					this._drumsetGroup.style.display = "none";
					this._transitionRow.style.display = "";
					this._chordSelectRow.style.display = "";
					this._filterEnvelopeRow.style.display = "";
				}
				if (instrument.type == InstrumentType.chip) {
					this._chipWaveSelectRow.style.display = "";
					setSelectedValue(this._chipWaveSelect, instrument.chipWave);
				} else {
					this._chipWaveSelectRow.style.display = "none";
				}
				if (instrument.type == InstrumentType.fm) {
					this._algorithmSelectRow.style.display = "";
					this._phaseModGroup.style.display = "";
					this._feedbackRow1.style.display = "";
					this._feedbackRow2.style.display = "";
					setSelectedValue(this._algorithmSelect, instrument.algorithm);
					setSelectedValue(this._feedbackTypeSelect, instrument.feedbackType);
					this._feedbackAmplitudeSlider.updateValue(instrument.feedbackAmplitude);
					setSelectedValue(this._feedbackEnvelopeSelect, instrument.feedbackEnvelope);
					this._feedbackEnvelopeSelect.parentElement!.style.color = (instrument.feedbackAmplitude > 0) ? "" : ColorConfig.secondaryText;
					for (let i: number = 0; i < Config.operatorCount; i++) {
						const isCarrier: boolean = (i < Config.algorithms[instrument.algorithm].carrierCount);
						this._operatorRows[i].style.color = isCarrier ? ColorConfig.primaryText : "";
						setSelectedValue(this._operatorFrequencySelects[i], instrument.operators[i].frequency);
						this._operatorAmplitudeSliders[i].updateValue(instrument.operators[i].amplitude);
						setSelectedValue(this._operatorEnvelopeSelects[i], instrument.operators[i].envelope);
						const operatorName: string = (isCarrier ? "Voice " : "Modulator ") + (i + 1);
						this._operatorFrequencySelects[i].title = operatorName + " Frequency";
						this._operatorAmplitudeSliders[i].input.title = operatorName + (isCarrier ? " Volume" : " Amplitude");
						this._operatorEnvelopeSelects[i].title = operatorName + " Envelope";
						this._operatorEnvelopeSelects[i].parentElement!.style.color = (instrument.operators[i].amplitude > 0) ? "" : ColorConfig.secondaryText;
					}
				} else {
					this._algorithmSelectRow.style.display = "none";
					this._phaseModGroup.style.display = "none";
					this._feedbackRow1.style.display = "none";
					this._feedbackRow2.style.display = "none";
				}
				if (instrument.type == InstrumentType.pwm) {
					this._pulseEnvelopeRow.style.display = "";
					setSelectedValue(this._pulseEnvelopeSelect, instrument.pulseEnvelope);
				} else {
					this._pulseEnvelopeRow.style.display = "none";
				}
				if (instrument.type == InstrumentType.guitar) {
					this._sustainRow.style.display = "";
					this._sustainSlider.updateValue(instrument.sustain);
				} else {
					this._sustainRow.style.display = "none";
				}
				if (instrument.type == InstrumentType.pwm || instrument.type == InstrumentType.guitar) {
					this._pulseWidthRow.style.display = "";
					this._pulseWidthSlider.input.title = prettyNumber(getPulseWidthRatio(instrument.pulseWidth) * 100) + "%";
					this._pulseWidthSlider.updateValue(instrument.pulseWidth);
				} else {
					this._pulseWidthRow.style.display = "none";
				}
				
				if (effectsIncludeDistortion(instrument.effects)) {
					this._distortionRow.style.display = "";
					this._distortionSlider.updateValue(instrument.distortion);
					this._distortionFilterRow.style.display = "";
					this._distortionFilterEditor.render();
				} else {
					this._distortionRow.style.display = "none";
					this._distortionFilterRow.style.display = "none";
				}
				
				if (effectsIncludePanning(instrument.effects)) {
					this._panSliderRow.style.display = "";
					this._panSlider.updateValue(instrument.pan);
				} else {
					this._panSliderRow.style.display = "none";
				}
				
				if (effectsIncludeReverb(instrument.effects)) {
					this._reverbRow.style.display = "";
					this._reverbSlider.updateValue(instrument.reverb);
				} else {
					this._reverbRow.style.display = "none";
				}
				
				if (instrument.type == InstrumentType.noise) {
					this._vibratoSelectRow.style.display = "none";
					this._intervalSelectRow.style.display = "none";
				} else if (instrument.type == InstrumentType.spectrum) {
					this._vibratoSelectRow.style.display = "none";
					this._intervalSelectRow.style.display = "none";
				} else if (instrument.type == InstrumentType.drumset) {
					this._vibratoSelectRow.style.display = "none";
					this._intervalSelectRow.style.display = "none";
				} else if (instrument.type == InstrumentType.chip) {
					this._vibratoSelectRow.style.display = "";
					this._intervalSelectRow.style.display = "";
				} else if (instrument.type == InstrumentType.fm) {
					this._vibratoSelectRow.style.display = "";
					this._intervalSelectRow.style.display = "none";
				} else if (instrument.type == InstrumentType.harmonics) {
					this._vibratoSelectRow.style.display = "";
					this._intervalSelectRow.style.display = "";
				} else if (instrument.type == InstrumentType.pwm) {
					this._vibratoSelectRow.style.display = "";
					this._intervalSelectRow.style.display = "none";
				} else if (instrument.type == InstrumentType.guitar) {
					this._vibratoSelectRow.style.display = "";
					this._intervalSelectRow.style.display = "none";
				} else {
					throw new Error("Unrecognized instrument type: " + instrument.type);
				}
			}
			
			for (let chordIndex: number = 0; chordIndex < Config.chords.length; chordIndex++) {
				let hidden: boolean = (!Config.instrumentTypeHasSpecialInterval[instrument.type] && Config.chords[chordIndex].customInterval);
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
			
			this._instrumentSettingsGroup.style.color = ColorConfig.getChannelColor(this._doc.song, this._doc.channel).primaryNote;
			
			this._filterEditor.render();
			setSelectedValue(this._filterEnvelopeSelect, instrument.filterEnvelope);
			setSelectedValue(this._transitionSelect, instrument.transition);
			setSelectedValue(this._vibratoSelect, instrument.vibrato);
			setSelectedValue(this._intervalSelect, instrument.interval);
			setSelectedValue(this._chordSelect, instrument.chord);
			this._instrumentVolumeSlider.updateValue(-instrument.volume);
			setSelectedValue(this._instrumentSelect, instrumentIndex);
			
			this._volumeSlider.value = String(this._doc.volume);
			
			// If an interface element was selected, but becomes invisible (e.g. an instrument
			// select menu) just select the editor container so keyboard commands still work.
			if (wasActive && activeElement != null && activeElement.clientWidth == 0) {
				this._refocusStage();
			}
			
			this._setPrompt(this._doc.prompt);
			
			if (this._doc.autoFollow && !this._doc.synth.playing) {
				this._doc.synth.goToBar(this._doc.bar);
			}
		}
		
		public updatePlayButton(): void {
			if (this._doc.synth.playing) {
				this._playButton.classList.remove("playButton");
				this._playButton.classList.add("pauseButton");
				this._playButton.title = "Pause (Space)";
				this._playButton.textContent = "Pause";
			} else {
				this._playButton.classList.remove("pauseButton");
				this._playButton.classList.add("playButton");
				this._playButton.title = "Play (Space)";
				this._playButton.textContent = "Play";
			}
		}
		
		private _tempoStepperCaptureNumberKeys = (event: KeyboardEvent): void => {
			// When the number input is in focus, allow some keyboard events to
			// edit the input without accidentally editing the song otherwise.
			switch (event.keyCode) {
				case 8: // backspace/delete
				case 13: // enter/return
				case 38: // up
				case 40: // down
				case 37: // left
				case 39: // right
				case 48: // 0
				case 49: // 1
				case 50: // 2
				case 51: // 3
				case 52: // 4
				case 53: // 5
				case 54: // 6
				case 55: // 7
				case 56: // 8
				case 57: // 9
					event.stopPropagation();
					break;
			}
		}
		
		private _whenKeyPressed = (event: KeyboardEvent): void => {
			if (this.prompt) {
				if (event.keyCode == 27) { // ESC key
					// close prompt.
					this._doc.undo();
				}
				return;
			}
			
			switch (event.keyCode) {
				case 27: // ESC key
					new ChangePatternSelection(this._doc, 0, 0);
					this._doc.selection.resetBoxSelection();
					break;
				case 32: // space
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
					this._doc.selection.copy();
					event.preventDefault();
					break;
				case 13: // enter/return
					this._doc.selection.insertBars();
					event.preventDefault();
					break;
				case 8: // backspace/delete
					this._doc.selection.deleteBars();
					event.preventDefault();
					break;
				case 65: // a
					if (event.shiftKey) {
						this._doc.selection.selectChannel();
					} else {
						this._doc.selection.selectAll();
					}
					event.preventDefault();
					break;
				case 68: // d
					this._doc.selection.duplicatePatterns();
					event.preventDefault();
					break;
				case 77: // m
					if (this._doc.enableChannelMuting) {
						this._doc.selection.muteChannels(event.shiftKey);
						event.preventDefault();
					}
					break;
				case 83: // s
					if (this._doc.enableChannelMuting) {
						if (event.shiftKey) {
							this._doc.selection.muteChannels(false);
						} else {
							this._doc.selection.soloChannels();
						}
						event.preventDefault();
					}
					break;
				case 86: // v
					if (event.shiftKey) {
						this._doc.selection.pasteNumbers();
					} else {
						this._doc.selection.pasteNotes();
					}
					event.preventDefault();
					break;
				case 73: // i
					if (event.shiftKey) {
						// Copy the current instrument as a preset to the clipboard.
						const instrument: Instrument = this._doc.song.channels[this._doc.channel].instruments[this._doc.getCurrentInstrument()];
						const instrumentObject: any = instrument.toJsonObject();
						delete instrumentObject["preset"];
						// Volume and the panning effect are not included in presets.
						delete instrumentObject["volume"];
						delete instrumentObject["pan"];
						const panningEffectIndex: number = instrumentObject["effects"].indexOf(Config.effectsNames[EffectType.panning]);
						if (panningEffectIndex != -1) instrumentObject["effects"].splice(panningEffectIndex, 1);
						// TODO: If the instrument has any envelopes or automation targetting panning, remove those too.
						this._copyTextToClipboard(JSON.stringify(instrumentObject));
					}
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
					this._doc.selection.transpose(false, event.shiftKey);
					event.preventDefault();
					break;
				case 187: // +
				case 61: // Firefox +
					this._doc.selection.transpose(true, event.shiftKey);
					event.preventDefault();
					break;
				case 38: // up
					if (event.shiftKey) {
						this._doc.selection.boxSelectionY1 = Math.max(0, this._doc.selection.boxSelectionY1 - 1);
						this._doc.selection.selectionUpdated();
					} else {
						this._doc.selection.setChannelBar((this._doc.channel - 1 + this._doc.song.getChannelCount()) % this._doc.song.getChannelCount(), this._doc.bar);
						this._doc.selection.resetBoxSelection();
					}
					event.preventDefault();
					break;
				case 40: // down
					if (event.shiftKey) {
						this._doc.selection.boxSelectionY1 = Math.min(this._doc.song.getChannelCount() - 1, this._doc.selection.boxSelectionY1 + 1);
						this._doc.selection.selectionUpdated();
					} else {
						this._doc.selection.setChannelBar((this._doc.channel + 1) % this._doc.song.getChannelCount(), this._doc.bar);
						this._doc.selection.resetBoxSelection();
					}
					event.preventDefault();
					break;
				case 37: // left
					if (event.shiftKey) {
						this._doc.selection.boxSelectionX1 = Math.max(0, this._doc.selection.boxSelectionX1 - 1);
						this._doc.selection.scrollToSelection();
						this._doc.selection.selectionUpdated();
					} else {
						this._doc.selection.setChannelBar(this._doc.channel, (this._doc.bar + this._doc.song.barCount - 1) % this._doc.song.barCount);
						this._doc.selection.resetBoxSelection();
					}
					event.preventDefault();
					break;
				case 39: // right
					if (event.shiftKey) {
						this._doc.selection.boxSelectionX1 = Math.min(this._doc.song.barCount - 1, this._doc.selection.boxSelectionX1 + 1);
						this._doc.selection.scrollToSelection();
						this._doc.selection.selectionUpdated();
					} else {
						this._doc.selection.setChannelBar(this._doc.channel, (this._doc.bar + 1) % this._doc.song.barCount);
						this._doc.selection.resetBoxSelection();
					}
					event.preventDefault();
					break;
				case 48: // 0
					this._doc.selection.nextDigit("0");
					event.preventDefault();
					break;
				case 49: // 1
					this._doc.selection.nextDigit("1");
					event.preventDefault();
					break;
				case 50: // 2
					this._doc.selection.nextDigit("2");
					event.preventDefault();
					break;
				case 51: // 3
					this._doc.selection.nextDigit("3");
					event.preventDefault();
					break;
				case 52: // 4
					this._doc.selection.nextDigit("4");
					event.preventDefault();
					break;
				case 53: // 5
					this._doc.selection.nextDigit("5");
					event.preventDefault();
					break;
				case 54: // 6
					this._doc.selection.nextDigit("6");
					event.preventDefault();
					break;
				case 55: // 7
					this._doc.selection.nextDigit("7");
					event.preventDefault();
					break;
				case 56: // 8
					this._doc.selection.nextDigit("8");
					event.preventDefault();
					break;
				case 57: // 9
					this._doc.selection.nextDigit("9");
					event.preventDefault();
					break;
				default:
					this._doc.selection.digits = "";
					break;
			}
		}
		
		private _copyTextToClipboard(text: string): void {
			if (navigator.clipboard && navigator.clipboard.writeText) {
				navigator.clipboard.writeText(text).catch(()=>{
					window.prompt("Copy to clipboard:", text);
				});
				return;
			}
			const textField: HTMLTextAreaElement = document.createElement("textarea");
			textField.textContent = text;
			document.body.appendChild(textField);
			textField.select();
			const succeeded: boolean = document.execCommand("copy");
			textField.remove();
			this._refocusStage();
			if (!succeeded) window.prompt("Copy this:", text);
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
				this._doc.synth.snapToBar();
				this._play();
			}
		}
		
		private _play(): void {
			this._doc.synth.play();
			this.updatePlayButton();
		}
		
		private _pause(): void {
			this._doc.synth.pause();
			this._doc.synth.resetEffects();
			if (this._doc.autoFollow) {
				this._doc.synth.goToBar(this._doc.bar);
			}
			this._doc.synth.snapToBar();
			this.updatePlayButton();
		}
		
		private _setVolumeSlider = (): void => {
			this._doc.setVolume(Number(this._volumeSlider.value));
		}
		
		private _copyInstrument(): void {
			const channel: Channel = this._doc.song.channels[this._doc.channel];
			const instrument: Instrument = channel.instruments[this._doc.getCurrentInstrument()];
			const instrumentCopy: any = instrument.toJsonObject();
			instrumentCopy["isDrum"] = this._doc.song.getChannelIsNoise(this._doc.channel);
			window.localStorage.setItem("instrumentCopy", JSON.stringify(instrumentCopy));
		}
		
		private _pasteInstrument(): void {
			const channel: Channel = this._doc.song.channels[this._doc.channel];
			const instrument: Instrument = channel.instruments[this._doc.getCurrentInstrument()];
			const instrumentCopy: any = JSON.parse(String(window.localStorage.getItem("instrumentCopy")));
			if (instrumentCopy != null && instrumentCopy["isDrum"] == this._doc.song.getChannelIsNoise(this._doc.channel)) {
				this._doc.record(new ChangePasteInstrument(this._doc, instrument, instrumentCopy));
			}
		}
		
		private _randomPreset(): void {
			const isNoise: boolean = this._doc.song.getChannelIsNoise(this._doc.channel);
			this._doc.record(new ChangePreset(this._doc, pickRandomPresetValue(isNoise)));
		}
		
		private _randomGenerated(): void {
			this._doc.record(new ChangeRandomGeneratedInstrument(this._doc));
		}
		
		private _whenSetTempo = (): void => {
			this._doc.record(new ChangeTempo(this._doc, -1, parseInt(this._tempoStepper.value) | 0));
		}
		
		private _whenSetScale = (): void => {
			if (isNaN(<number> <unknown> this._scaleSelect.value)) {
				switch (this._scaleSelect.value) {
					case "forceScale":
						this._doc.selection.forceScale();
						break;
				}
				this._doc.notifier.changed();
			} else {
				this._doc.record(new ChangeScale(this._doc, this._scaleSelect.selectedIndex));
			}
		}
		
		private _whenSetKey = (): void => {
			if (isNaN(<number> <unknown> this._keySelect.value)) {
				switch (this._keySelect.value) {
					case "detectKey":
						this._doc.record(new ChangeDetectKey(this._doc));
						break;
				}
				this._doc.notifier.changed();
			} else {
				this._doc.record(new ChangeKey(this._doc, Config.keys.length - 1 - this._keySelect.selectedIndex));
			}
		}
		
		private _whenSetRhythm = (): void => {
			if (isNaN(<number> <unknown> this._rhythmSelect.value)) {
				switch (this._rhythmSelect.value) {
					case "forceRhythm":
						this._doc.selection.forceRhythm();
						break;
				}
				this._doc.notifier.changed();
			} else {
				this._doc.record(new ChangeRhythm(this._doc, this._rhythmSelect.selectedIndex));
			}
		}
		
		private _whenSetPitchedPreset = (): void => {
			this._setPreset(this._pitchedPresetSelect.value);
		}
		
		private _whenSetDrumPreset = (): void => {
			this._setPreset(this._drumPresetSelect.value);
		}
		
		private _setPreset(preset: string): void {
			if (isNaN(<number> <unknown> preset)) {
				switch (preset) {
					case "copyInstrument":
						this._copyInstrument();
						break;
					case "pasteInstrument":
						this._pasteInstrument();
						break;
					case "randomPreset":
						this._randomPreset();
						break;
					case "randomGenerated":
						this._randomGenerated();
						break;
				}
				this._doc.notifier.changed();
			} else {
				this._doc.record(new ChangePreset(this._doc, parseInt(preset)));
			}
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
			this._doc.selection.setInstrument(this._instrumentSelect.selectedIndex);
		}
		
		private _whenCustomizePressed = (): void => {
			this._doc.record(new ChangeCustomizeInstrument(this._doc));
		}
		
		private _whenSetChipWave = (): void => {
			this._doc.record(new ChangeChipWave(this._doc, this._chipWaveSelect.selectedIndex));
		}
		
		private _whenSetNoiseWave = (): void => {
			this._doc.record(new ChangeNoiseWave(this._doc, this._chipNoiseSelect.selectedIndex));
		}
		
		private _whenSetFilterEnvelope = (): void => {
			this._doc.record(new ChangeFilterEnvelope(this._doc, this._filterEnvelopeSelect.selectedIndex));
		}
		
		private _whenSetPulseEnvelope = (): void => {
			this._doc.record(new ChangePulseEnvelope(this._doc, this._pulseEnvelopeSelect.selectedIndex));
		}
		
		private _whenSetTransition = (): void => {
			this._doc.record(new ChangeTransition(this._doc, this._transitionSelect.selectedIndex));
		}
		
		private _whenSetEffects = (): void => {
			const toggleFlag: number = Config.effectOrder[this._effectsSelect.selectedIndex - 1];
			this._doc.record(new ChangeToggleEffects(this._doc, toggleFlag));
			this._effectsSelect.selectedIndex = 0;
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
					this._doc.goBackToStart();
					for (const channel of this._doc.song.channels) channel.muted = false;
					this._doc.record(new ChangeSong(this._doc, ""), false, true);
					break;
				case "export":
					this._openPrompt("export");
					break;
				case "import":
					this._openPrompt("import");
					break;
				case "copyUrl":
					this._copyTextToClipboard(new URL("#" + this._doc.song.toBase64String(), location.href).href);
					break;
				case "shareUrl":
					(<any>navigator).share({ url: new URL("#" + this._doc.song.toBase64String(), location.href).href });
					break;
				case "shortenUrl":
					window.open("https://tinyurl.com/api-create.php?url=" + encodeURIComponent(new URL("#" + this._doc.song.toBase64String(), location.href).href));
					break;
				case "viewPlayer":
					location.href = "player/#song=" + this._doc.song.toBase64String();
					break;
				case "copyEmbed":
					this._copyTextToClipboard(`<iframe width="384" height="60" style="border: none;" src="${new URL("player/#song=" + this._doc.song.toBase64String(), location.href).href}"></iframe>`);
					break;
				case "songRecovery":
					this._openPrompt("songRecovery");
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
					this._doc.selection.copy();
					break;
				case "insertBars":
					this._doc.selection.insertBars();
					break;
				case "deleteBars":
					this._doc.selection.deleteBars();
					break;
				case "pasteNotes":
					this._doc.selection.pasteNotes();
					break;
				case "pasteNumbers":
					this._doc.selection.pasteNumbers();
					break;
				case "transposeUp":
					this._doc.selection.transpose(true, false);
					break;
				case "transposeDown":
					this._doc.selection.transpose(false, false);
					break;
				case "selectAll":
					this._doc.selection.selectAll();
					break;
				case "selectChannel":
					this._doc.selection.selectChannel();
					break;
				case "duplicatePatterns":
					this._doc.selection.duplicatePatterns();
					break;
				case "barCount":
					this._openPrompt("barCount");
					break;
				case "beatsPerBar":
					this._openPrompt("beatsPerBar");
					break;
				case "moveNotesSideways":
					this._openPrompt("moveNotesSideways");
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
				case "enableNotePreview":
					this._doc.enableNotePreview = !this._doc.enableNotePreview;
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
				case "alwaysShowSettings":
					this._doc.alwaysShowSettings = !this._doc.alwaysShowSettings;
					break;
				case "enableChannelMuting":
					this._doc.enableChannelMuting = !this._doc.enableChannelMuting;
					for (const channel of this._doc.song.channels) channel.muted = false;
					break;
				case "displayBrowserUrl":
					this._doc.toggleDisplayBrowserUrl();
					break;
				case "fullScreen":
					this._doc.fullScreen = !this._doc.fullScreen;
					Layout.setFullScreen(this._doc.fullScreen);
					break;
				case "colorTheme":
					this._doc.colorTheme = this._doc.colorTheme == "light classic" ? "dark classic" : "light classic";
					ColorConfig.setTheme(this._doc.colorTheme);
					break;
			}
			this._optionsMenu.selectedIndex = 0;
			this._doc.notifier.changed();
			this._doc.savePreferences();
		}
	}
//}
