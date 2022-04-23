// Copyright (c) 2012-2022 John Nesky and contributing authors, distributed under the MIT license, see accompanying the LICENSE.md file.

import {InstrumentType, EffectType, Config, getPulseWidthRatio, effectsIncludeTransition, effectsIncludeChord, effectsIncludePitchShift, effectsIncludeDetune, effectsIncludeVibrato, effectsIncludeNoteFilter, effectsIncludeDistortion, effectsIncludeBitcrusher, effectsIncludePanning, effectsIncludeChorus, effectsIncludeEcho, effectsIncludeReverb} from "../synth/SynthConfig";
import {Preset, PresetCategory, EditorConfig, isMobile, prettyNumber} from "./EditorConfig";
import {ColorConfig, ChannelColors} from "./ColorConfig";
import "./Layout"; // Imported here for the sake of ensuring this code is transpiled early.
import {Instrument, Channel, Synth} from "../synth/synth";
import {HTML} from "imperative-html/dist/esm/elements-strict";
import {Preferences} from "./Preferences";
import {SongDocument} from "./SongDocument";
import {Prompt} from "./Prompt";
import {TipPrompt} from "./TipPrompt";
import {PatternEditor} from "./PatternEditor";
import {EnvelopeEditor} from "./EnvelopeEditor";
import {FadeInOutEditor} from "./FadeInOutEditor";
import {FilterEditor} from "./FilterEditor";
import {MuteEditor} from "./MuteEditor";
import {TrackEditor} from "./TrackEditor";
import {LayoutPrompt} from "./LayoutPrompt";
import {LoopEditor} from "./LoopEditor";
import {SpectrumEditor} from "./SpectrumEditor";
import {HarmonicsEditor} from "./HarmonicsEditor";
import {BarScrollBar} from "./BarScrollBar";
import {OctaveScrollBar} from "./OctaveScrollBar";
import {LiveInput} from "./LiveInput";
import {MidiInputHandler} from "./MidiInput";
import {Piano} from "./Piano";
import {BeatsPerBarPrompt} from "./BeatsPerBarPrompt";
import {MoveNotesSidewaysPrompt} from "./MoveNotesSidewaysPrompt";
import {SongDurationPrompt} from "./SongDurationPrompt";
import {ChannelSettingsPrompt} from "./ChannelSettingsPrompt";
import {ExportPrompt} from "./ExportPrompt";
import {ImportPrompt} from "./ImportPrompt";
import {SongRecoveryPrompt} from "./SongRecoveryPrompt";
import {Change} from "./Change";
import {ChangeTempo, ChangeChorus, ChangeEchoDelay, ChangeEchoSustain, ChangeReverb, ChangeVolume, ChangePan, ChangePatternSelection, ChangePulseWidth, ChangeFeedbackAmplitude, ChangeOperatorAmplitude, ChangeOperatorFrequency, ChangeDrumsetEnvelope, ChangePasteInstrument, ChangePreset, pickRandomPresetValue, ChangeRandomGeneratedInstrument, ChangeScale, ChangeDetectKey, ChangeKey, ChangeRhythm, ChangeFeedbackType, ChangeAlgorithm, ChangeCustomizeInstrument, ChangeChipWave, ChangeNoiseWave, ChangeTransition, ChangeToggleEffects, ChangeVibrato, ChangeUnison, ChangeChord, ChangeSong, ChangePitchShift, ChangeDetune, ChangeDistortion, ChangeStringSustain, ChangeBitcrusherFreq, ChangeBitcrusherQuantization, ChangeAddEnvelope, ChangeAddChannelInstrument, ChangeRemoveChannelInstrument} from "./changes";

const {a, button, div, input, select, span, optgroup, option} = HTML;

function buildOptions(menu: HTMLSelectElement, items: ReadonlyArray<string | number>): HTMLSelectElement {
	for (let index: number = 0; index < items.length; index++) {
		menu.appendChild(option({value: index}, items[index]));
	} 
	return menu;
}

function buildPresetOptions(isNoise: boolean): HTMLSelectElement {
	const menu: HTMLSelectElement = select();
	
	menu.appendChild(optgroup({label: "Edit"},
		option({value: "copyInstrument"}, "Copy Instrument (⇧C)"),
		option({value: "pasteInstrument"}, "Paste Instrument (⇧V)"),
		option({value: "randomPreset"}, "Random Preset (R)"),
		option({value: "randomGenerated"}, "Random Generated (⇧R)"),
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
		customTypeGroup.appendChild(option({value: InstrumentType.pickedString}, EditorConfig.valueToPreset(InstrumentType.pickedString)!.name));
		customTypeGroup.appendChild(option({value: InstrumentType.spectrum}, EditorConfig.valueToPreset(InstrumentType.spectrum)!.name));
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
	
	private readonly _liveInput: LiveInput = new LiveInput(this._doc);
	private readonly _patternEditorPrev: PatternEditor = new PatternEditor(this._doc, this._liveInput, false, -1);
	private readonly _patternEditor: PatternEditor = new PatternEditor(this._doc, this._liveInput, true, 0);
	private readonly _patternEditorNext: PatternEditor = new PatternEditor(this._doc, this._liveInput, false, 1);
	private readonly _muteEditor: MuteEditor = new MuteEditor(this._doc);
	private readonly _trackEditor: TrackEditor = new TrackEditor(this._doc);
	private readonly _loopEditor: LoopEditor = new LoopEditor(this._doc);
	private readonly _octaveScrollBar: OctaveScrollBar = new OctaveScrollBar(this._doc);
	private readonly _piano: Piano = new Piano(this._doc, this._liveInput);
	private readonly _playButton: HTMLButtonElement = button({style: "width: 80px;", type: "button"});
	private readonly _prevBarButton: HTMLButtonElement = button({class: "prevBarButton", style: "width: 40px;", type: "button", title: "Previous Bar (left bracket)"});
	private readonly _nextBarButton: HTMLButtonElement = button({class: "nextBarButton", style: "width: 40px;", type: "button", title: "Next Bar (right bracket)"});
	private readonly _volumeSlider: HTMLInputElement = input({title: "main volume", style: "width: 5em; flex-grow: 1; margin: 0;", type: "range", min: "0", max: "75", value: "50", step: "1"});
	private readonly _fileMenu: HTMLSelectElement = select({style: "width: 100%;"},
		option({selected: true, disabled: true, hidden: false}, "File"), // todo: "hidden" should be true but looks wrong on mac chrome, adds checkmark next to first visible option even though it's not selected. :(
		option({value: "new"}, "+ New Blank Song"),
		option({value: "import"}, "↑ Import Song... (" + EditorConfig.ctrlSymbol + "O)"),
		option({value: "export"}, "↓ Export Song... (" + EditorConfig.ctrlSymbol + "S)"),
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
		option({value: "pasteNumbers"}, "Paste Pattern Numbers (" + EditorConfig.ctrlSymbol + "⇧V)"),
		option({value: "insertBars"}, "Insert Bar (⏎)"),
		option({value: "deleteBars"}, "Delete Selected Bars (⌫)"),
		option({value: "insertChannel"}, "Insert Channel (" + EditorConfig.ctrlSymbol + "⏎)"),
		option({value: "deleteChannel"}, "Delete Selected Channels (" + EditorConfig.ctrlSymbol + "⌫)"),
		option({value: "selectAll"}, "Select All (A)"),
		option({value: "selectChannel"}, "Select Channel (⇧A)"),
		option({value: "duplicatePatterns"}, "Duplicate Reused Patterns (D)"),
		option({value: "transposeUp"}, "Move Notes Up (+ or ⇧+)"),
		option({value: "transposeDown"}, "Move Notes Down (- or ⇧-)"),
		option({value: "moveNotesSideways"}, "Move All Notes Sideways..."),
		option({value: "beatsPerBar"}, "Change Beats Per Bar..."),
		option({value: "barCount"}, "Change Song Length..."),
		option({value: "channelSettings"}, "Channel Settings... (Q)"),
	);
	private readonly _optionsMenu: HTMLSelectElement = select({style: "width: 100%;"},
		option({selected: true, disabled: true, hidden: false}, "Preferences"), // todo: "hidden" should be true but looks wrong on mac chrome, adds checkmark next to first visible option even though it's not selected. :(
		option({value: "autoPlay"}, "Auto Play On Load"),
		option({value: "autoFollow"}, "Auto Follow Track"),
		option({value: "enableNotePreview"}, "Preview Added Notes"),
		option({value: "showLetters"}, "Show Piano Keys"),
		option({value: "showFifth"}, 'Highlight "Fifth" Notes'),
		option({value: "notesOutsideScale"}, "Allow Notes Outside Scale"),
		option({value: "setDefaultScale"}, "Use Current Scale as Default"),
		option({value: "showChannels"}, "Show All Channels"),
		option({value: "showScrollBar"}, "Octave Scroll Bar"),
		option({value: "alwaysShowSettings"}, "Customize All Instruments"),
		option({value: "instrumentCopyPaste"}, "Instrument Copy/Paste Buttons"),
		option({value: "enableChannelMuting"}, "Enable Channel Muting"),
		option({value: "displayBrowserUrl"}, "Display Song Data in URL"),
		option({value: "layout"}, "Choose Layout..."),
		option({value: "colorTheme"}, "Light Theme"),
	);
	private readonly _scaleSelect: HTMLSelectElement = buildOptions(select(), Config.scales.map(scale=>scale.name));
	private readonly _keySelect: HTMLSelectElement = buildOptions(select(), Config.keys.map(key=>key.name).reverse());
	private readonly _tempoSlider: Slider = new Slider(input({style: "margin: 0; width: 4em; flex-grow: 1; vertical-align: middle;", type: "range", min: "0", max: "14", value: "7", step: "1"}), this._doc, (oldValue: number, newValue: number) => new ChangeTempo(this._doc, oldValue, Math.round(120.0 * Math.pow(2.0, (-4.0 + newValue) / 9.0))));
	private readonly _tempoStepper: HTMLInputElement = input({style: "width: 3em; margin-left: 0.4em; vertical-align: middle;", type: "number", step: "1"});
	private readonly _chorusSlider: Slider = new Slider(input({style: "margin: 0;", type: "range", min: "0", max: Config.chorusRange - 1, value: "0", step: "1"}), this._doc, (oldValue: number, newValue: number) => new ChangeChorus(this._doc, oldValue, newValue));
	private readonly _chorusRow: HTMLDivElement = div({class: "selectRow"}, span({class: "tip", onclick: ()=>this._openPrompt("chorus")}, "Chorus:"), this._chorusSlider.input);
	private readonly _reverbSlider: Slider = new Slider(input({style: "margin: 0;", type: "range", min: "0", max: Config.reverbRange - 1, value: "0", step: "1"}), this._doc, (oldValue: number, newValue: number) => new ChangeReverb(this._doc, oldValue, newValue));
	private readonly _reverbRow: HTMLDivElement = div({class: "selectRow"}, span({class: "tip", onclick: ()=>this._openPrompt("reverb")}, "Reverb:"), this._reverbSlider.input);
	private readonly _echoSustainSlider: Slider = new Slider(input({style: "margin: 0;", type: "range", min: "0", max: Config.echoSustainRange - 1, value: "0", step: "1"}), this._doc, (oldValue: number, newValue: number) => new ChangeEchoSustain(this._doc, oldValue, newValue));
	private readonly _echoSustainRow: HTMLDivElement = div({class: "selectRow"}, span({class: "tip", onclick: ()=>this._openPrompt("echoSustain")}, "Echo:"), this._echoSustainSlider.input);
	private readonly _echoDelaySlider: Slider = new Slider(input({style: "margin: 0;", type: "range", min: "0", max: Config.echoDelayRange - 1, value: "0", step: "1"}), this._doc, (oldValue: number, newValue: number) => new ChangeEchoDelay(this._doc, oldValue, newValue));
	private readonly _echoDelayRow: HTMLDivElement = div({class: "selectRow"}, span({class: "tip", onclick: ()=>this._openPrompt("echoDelay")}, "Echo Delay:"), this._echoDelaySlider.input);
	private readonly _rhythmSelect: HTMLSelectElement = buildOptions(select(), Config.rhythms.map(rhythm=>rhythm.name));
	private readonly _pitchedPresetSelect: HTMLSelectElement = buildPresetOptions(false);
	private readonly _drumPresetSelect: HTMLSelectElement = buildPresetOptions(true);
	private readonly _algorithmSelect: HTMLSelectElement = buildOptions(select(), Config.algorithms.map(algorithm=>algorithm.name));
	private readonly _algorithmSelectRow: HTMLDivElement = div({class: "selectRow"}, span({class: "tip", onclick: ()=>this._openPrompt("algorithm")}, "Algorithm:"), div({class: "selectContainer"}, this._algorithmSelect));
	private readonly _instrumentButtons: HTMLButtonElement[] = [];
	private readonly _instrumentAddButton: HTMLButtonElement = button({type: "button", class: "add-instrument last-button"});
	private readonly _instrumentRemoveButton: HTMLButtonElement = button({type: "button", class: "remove-instrument"});
	private readonly _instrumentsButtonBar: HTMLDivElement = div({class: "instrument-bar"}, this._instrumentRemoveButton, this._instrumentAddButton);
	private readonly _instrumentsButtonRow: HTMLDivElement = div({class: "selectRow", style: "display: none;"}, span({class: "tip", onclick: ()=>this._openPrompt("instrumentIndex")}, "Instrument:"), this._instrumentsButtonBar);
	private readonly _instrumentCopyButton: HTMLButtonElement = button({type: "button", class: "copy-instrument"}, "Copy");
	private readonly _instrumentPasteButton: HTMLButtonElement = button({type: "button", class: "paste-instrument"}, "Paste");
	private readonly _instrumentCopyPasteRow: HTMLDivElement = div({class: "instrumentCopyPasteRow", style: "display: none;"}, this._instrumentCopyButton, this._instrumentPasteButton);
	private readonly _instrumentVolumeSlider: Slider = new Slider(input({style: "margin: 0;", type: "range", min: -(Config.volumeRange - 1), max: "0", value: "0", step: "1"}), this._doc, (oldValue: number, newValue: number) => new ChangeVolume(this._doc, oldValue, -newValue));
	private readonly _instrumentVolumeSliderRow: HTMLDivElement = div({class: "selectRow"}, span({class: "tip", onclick: ()=>this._openPrompt("instrumentVolume")}, "Volume:"), this._instrumentVolumeSlider.input);
	private readonly _panSlider: Slider = new Slider(input({style: "margin: 0;", type: "range", min: "0", max: Config.panMax, value: Config.panCenter, step: "1"}), this._doc, (oldValue: number, newValue: number) => new ChangePan(this._doc, oldValue, newValue));
	private readonly _panSliderRow: HTMLDivElement = div({class: "selectRow"}, span({class: "tip", onclick: ()=>this._openPrompt("pan")}, "Panning:"), this._panSlider.input);
	private readonly _chipWaveSelect: HTMLSelectElement = buildOptions(select(), Config.chipWaves.map(wave=>wave.name));
	private readonly _chipNoiseSelect: HTMLSelectElement = buildOptions(select(), Config.chipNoises.map(wave=>wave.name));
	private readonly _chipWaveSelectRow: HTMLDivElement = div({class: "selectRow"}, span({class: "tip", onclick: ()=>this._openPrompt("chipWave")}, "Wave:"), div({class: "selectContainer"}, this._chipWaveSelect));
	private readonly _chipNoiseSelectRow: HTMLDivElement = div({class: "selectRow"}, span({class: "tip", onclick: ()=>this._openPrompt("chipNoise")}, "Noise:"), div({class: "selectContainer"}, this._chipNoiseSelect));
	private readonly _fadeInOutEditor: FadeInOutEditor = new FadeInOutEditor(this._doc);
	private readonly _fadeInOutRow: HTMLElement = div({class: "selectRow"}, span({class: "tip", onclick: ()=>this._openPrompt("fadeInOut")}, "Fade In/Out:"), this._fadeInOutEditor.container);
	private readonly _transitionSelect: HTMLSelectElement = buildOptions(select(), Config.transitions.map(transition=>transition.name));
	private readonly _transitionRow: HTMLDivElement = div({class: "selectRow"}, span({class: "tip", onclick: ()=>this._openPrompt("transition")}, "Transition:"), div({class: "selectContainer"}, this._transitionSelect));
	private readonly _effectsSelect: HTMLSelectElement = select(option({selected: true, disabled: true, hidden: false})); // todo: "hidden" should be true but looks wrong on mac chrome, adds checkmark next to first visible option even though it's not selected. :(
	private readonly _eqFilterEditor: FilterEditor = new FilterEditor(this._doc);
	private readonly _eqFilterRow: HTMLElement = div({class: "selectRow"}, span({class: "tip", onclick: ()=>this._openPrompt("eqFilter")}, "EQ Filter:"), this._eqFilterEditor.container);
	private readonly _noteFilterEditor: FilterEditor = new FilterEditor(this._doc, true);
	private readonly _noteFilterRow: HTMLElement = div({class: "selectRow"}, span({class: "tip", onclick: ()=>this._openPrompt("noteFilter")}, "Note Filter:"), this._noteFilterEditor.container);
	private readonly _pulseWidthSlider: Slider = new Slider(input({style: "margin: 0;", type: "range", min: "0", max: Config.pulseWidthRange - 1, value: "0", step: "1"}), this._doc, (oldValue: number, newValue: number) => new ChangePulseWidth(this._doc, oldValue, newValue));
	private readonly _pulseWidthRow: HTMLDivElement = div({class: "selectRow"}, span({class: "tip", onclick: ()=>this._openPrompt("pulseWidth")}, "Pulse Width:"), this._pulseWidthSlider.input);
	private readonly _pitchShiftSlider: Slider = new Slider(input({style: "margin: 0;", type: "range", min: "0", max: Config.pitchShiftRange - 1, value: "0", step: "1"}), this._doc, (oldValue: number, newValue: number) => new ChangePitchShift(this._doc, oldValue, newValue));
	private readonly _pitchShiftTonicMarkers: HTMLDivElement[] = [div({class: "pitchShiftMarker", style: {color: ColorConfig.tonic}}), div({class: "pitchShiftMarker", style: {color: ColorConfig.tonic, left: "50%"}}), div({class: "pitchShiftMarker", style: {color: ColorConfig.tonic, left: "100%"}})];
	private readonly _pitchShiftFifthMarkers: HTMLDivElement[] = [div({class: "pitchShiftMarker", style: {color: ColorConfig.fifthNote, left: (100*7/24)+"%"}}), div({class: "pitchShiftMarker", style: {color: ColorConfig.fifthNote, left: (100*19/24)+"%"}})];
	private readonly _pitchShiftMarkerContainer: HTMLDivElement = div({style: "display: flex; position: relative;"}, this._pitchShiftSlider.input, div({class: "pitchShiftMarkerContainer"}, this._pitchShiftTonicMarkers, this._pitchShiftFifthMarkers));
	private readonly _pitchShiftRow: HTMLDivElement = div({class: "selectRow"}, span({class: "tip", onclick: ()=>this._openPrompt("pitchShift")}, "Pitch Shift:"), this._pitchShiftMarkerContainer);
	private readonly _detuneSlider: Slider = new Slider(input({style: "margin: 0;", type: "range", min: "0", max: Config.detuneMax, value: "0", step: "1"}), this._doc, (oldValue: number, newValue: number) => new ChangeDetune(this._doc, oldValue, newValue));
	private readonly _detuneRow: HTMLDivElement = div({class: "selectRow"}, span({class: "tip", onclick: ()=>this._openPrompt("detune")}, "Detune:"), this._detuneSlider.input);
	private readonly _distortionSlider: Slider = new Slider(input({style: "margin: 0;", type: "range", min: "0", max: Config.distortionRange - 1, value: "0", step: "1"}), this._doc, (oldValue: number, newValue: number) => new ChangeDistortion(this._doc, oldValue, newValue));
	private readonly _distortionRow: HTMLDivElement = div({class: "selectRow"}, span({class: "tip", onclick: ()=>this._openPrompt("distortion")}, "Distortion:"), this._distortionSlider.input);
	private readonly _bitcrusherQuantizationSlider: Slider = new Slider(input({style: "margin: 0;", type: "range", min: "0", max: Config.bitcrusherQuantizationRange - 1, value: "0", step: "1"}), this._doc, (oldValue: number, newValue: number) => new ChangeBitcrusherQuantization(this._doc, oldValue, newValue));
	private readonly _bitcrusherQuantizationRow: HTMLDivElement = div({class: "selectRow"}, span({class: "tip", onclick: ()=>this._openPrompt("bitcrusherQuantization")}, "Bit Crush:"), this._bitcrusherQuantizationSlider.input);
	private readonly _bitcrusherFreqSlider: Slider = new Slider(input({style: "margin: 0;", type: "range", min: "0", max: Config.bitcrusherFreqRange - 1, value: "0", step: "1"}), this._doc, (oldValue: number, newValue: number) => new ChangeBitcrusherFreq(this._doc, oldValue, newValue));
	private readonly _bitcrusherFreqRow: HTMLDivElement = div({class: "selectRow"}, span({class: "tip", onclick: ()=>this._openPrompt("bitcrusherFreq")}, "Freq Crush:"), this._bitcrusherFreqSlider.input);
	private readonly _stringSustainSlider: Slider = new Slider(input({style: "margin: 0;", type: "range", min: "0", max: Config.stringSustainRange - 1, value: "0", step: "1"}), this._doc, (oldValue: number, newValue: number) => new ChangeStringSustain(this._doc, oldValue, newValue));
	private readonly _stringSustainRow: HTMLDivElement = div({class: "selectRow"}, span({class: "tip", onclick: ()=>this._openPrompt("stringSustain")}, "Sustain:"), this._stringSustainSlider.input);
	private readonly _unisonSelect: HTMLSelectElement = buildOptions(select(), Config.unisons.map(unison=>unison.name));
	private readonly _unisonSelectRow: HTMLElement = div({class: "selectRow"}, span({class: "tip", onclick: ()=>this._openPrompt("unison")}, "Unison:"), div({class: "selectContainer"}, this._unisonSelect));
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
	private readonly _envelopeEditor: EnvelopeEditor = new EnvelopeEditor(this._doc);
	private readonly _drumsetGroup: HTMLElement = div({class: "editor-controls"});
	
	private readonly _feedbackAmplitudeSlider: Slider = new Slider(input({type: "range", min: "0", max: Config.operatorAmplitudeMax, value: "0", step: "1", title: "Feedback Amplitude"}), this._doc, (oldValue: number, newValue: number) => new ChangeFeedbackAmplitude(this._doc, oldValue, newValue));
	private readonly _feedbackRow2: HTMLDivElement = div({class: "selectRow"}, span({class: "tip", onclick: ()=>this._openPrompt("feedbackVolume")}, "Fdback Vol:"), this._feedbackAmplitudeSlider.input);
	private readonly _customizeInstrumentButton: HTMLButtonElement = button({type: "button", class: "customize-instrument"},
		"Customize Instrument",
	);
	private readonly _addEnvelopeButton: HTMLButtonElement = button({type: "button", class: "add-envelope"});
	private readonly _customInstrumentSettingsGroup: HTMLDivElement = div({class: "editor-controls"},
		this._eqFilterRow,
		this._fadeInOutRow,
		this._chipWaveSelectRow,
		this._chipNoiseSelectRow,
		this._algorithmSelectRow,
		this._phaseModGroup,
		this._feedbackRow1,
		this._feedbackRow2,
		this._spectrumRow,
		this._harmonicsRow,
		this._drumsetGroup,
		this._pulseWidthRow,
		this._stringSustainRow,
		this._unisonSelectRow,
		div({style: `margin: 2px 0; margin-left: 2em; display: flex; align-items: center;`},
			span({style: `flex-grow: 1; text-align: center;`}, span({class: "tip", onclick: ()=>this._openPrompt("effects")}, "Effects")),
			div({class: "effects-menu"}, this._effectsSelect),
		),
		this._transitionRow,
		this._chordSelectRow,
		this._pitchShiftRow,
		this._detuneRow,
		this._vibratoSelectRow,
		this._noteFilterRow,
		this._distortionRow,
		this._bitcrusherQuantizationRow,
		this._bitcrusherFreqRow,
		this._panSliderRow,
		this._chorusRow,
		this._echoSustainRow,
		this._echoDelayRow,
		this._reverbRow,
		div({style: `margin: 2px 0; margin-left: 2em; display: flex; align-items: center;`},
			span({style: `flex-grow: 1; text-align: center;`}, span({class: "tip", onclick: ()=>this._openPrompt("envelopes")}, "Envelopes")),
			this._addEnvelopeButton,
		),
		this._envelopeEditor.container,
	);
	private readonly _instrumentSettingsGroup: HTMLDivElement = div({class: "editor-controls"},
		div({style: `margin: 3px 0; text-align: center; color: ${ColorConfig.secondaryText};`},
			"Instrument Settings"
		),
		this._instrumentsButtonRow,
		this._instrumentCopyPasteRow,
		this._instrumentVolumeSliderRow,
		div({class: "selectRow"},
			span({class: "tip", onclick: ()=>this._openPrompt("instrumentType")}, "Type:"),
			div({class: "selectContainer"}, this._pitchedPresetSelect, this._drumPresetSelect),
		),
		this._customizeInstrumentButton,
		this._customInstrumentSettingsGroup,
	);
	private readonly _promptContainer: HTMLDivElement = div({class: "promptContainer", style: "display: none;"});
	private readonly _zoomInButton: HTMLButtonElement = button({class: "zoomInButton", type: "button", title: "Zoom In"});
	private readonly _zoomOutButton: HTMLButtonElement = button({class: "zoomOutButton", type: "button", title: "Zoom Out"});
	private readonly _patternEditorRow: HTMLDivElement = div({style: "flex: 1; height: 100%; display: flex; overflow: hidden; justify-content: center;"},
		this._patternEditorPrev.container,
		this._patternEditor.container,
		this._patternEditorNext.container,
	);
	private readonly _patternArea: HTMLDivElement = div({class: "pattern-area"},
		this._piano.container,
		this._patternEditorRow,
		this._octaveScrollBar.container,
		this._zoomInButton,
		this._zoomOutButton,
	);
	private readonly _trackContainer: HTMLDivElement = div({class: "trackContainer"},
		this._trackEditor.container,
		this._loopEditor.container,
	);
	private readonly _trackVisibleArea: HTMLDivElement = div({style: "position: absolute; width: 100%; height: 100%; pointer-events: none;"});
	private readonly _trackAndMuteContainer: HTMLDivElement = div({class: "trackAndMuteContainer"},
		this._muteEditor.container,
		this._trackContainer,
		this._trackVisibleArea,
	);
	private readonly _barScrollBar: BarScrollBar = new BarScrollBar(this._doc, this._trackAndMuteContainer);
	private readonly _trackArea: HTMLDivElement = div({class: "track-area"},
		this._trackAndMuteContainer,
		this._barScrollBar.container,
	);
	
	private readonly _instrumentSettingsArea: HTMLDivElement = div({class: "instrument-settings-area"}, this._instrumentSettingsGroup);
	private readonly _settingsArea: HTMLDivElement = div({class: "settings-area noSelection"},
		div({class: "version-area"},
			div({style: `text-align: center; margin: 3px 0; color: ${ColorConfig.secondaryText};`},
				EditorConfig.versionDisplayName,
				" ",
				a({class: "tip", target: "_blank", href: EditorConfig.releaseNotesURL},
					EditorConfig.version,
				),
			),
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
					span({class: "tip", onclick: ()=>this._openPrompt("scale")}, "Scale:"),
					div({class: "selectContainer"}, this._scaleSelect),
				),
				div({class: "selectRow"},
					span({class: "tip", onclick: ()=>this._openPrompt("key")}, "Key:"),
					div({class: "selectContainer"}, this._keySelect),
				),
				div({class: "selectRow"},
					span({class: "tip", onclick: ()=>this._openPrompt("tempo")}, "Tempo:"),
					span({style: "display: flex;"},
						this._tempoSlider.input,
						this._tempoStepper,
					),
				),
				div({class: "selectRow"},
					span({class: "tip", onclick: ()=>this._openPrompt("rhythm")}, "Rhythm:"),
					div({class: "selectContainer"}, this._rhythmSelect),
				),
			),
		),
		this._instrumentSettingsArea,
	);
	
	public readonly mainLayer: HTMLDivElement = div({class: "beepboxEditor", tabIndex: "0"},
		this._patternArea,
		this._trackArea,
		this._settingsArea,
		this._promptContainer,
	);
	
	private _wasPlaying: boolean = false;
	private _currentPromptName: string | null = null;
	private _highlightedInstrumentIndex: number = -1;
	private _renderedInstrumentCount: number = 0;
	private _deactivatedInstruments: boolean = false;
	private readonly _operatorRows: HTMLDivElement[] = []
	private readonly _operatorAmplitudeSliders: Slider[] = []
	private readonly _operatorFrequencySelects: HTMLSelectElement[] = []
	private readonly _drumsetSpectrumEditors: SpectrumEditor[] = [];
	private readonly _drumsetEnvelopeSelects: HTMLSelectElement[] = [];
	
	constructor(private _doc: SongDocument) {
		this._doc.notifier.watch(this.whenUpdated);
		new MidiInputHandler(this._doc, this._liveInput);
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
		
		this._phaseModGroup.appendChild(div({class: "selectRow", style: `color: ${ColorConfig.secondaryText}; height: 1em; margin-top: 0.5em;`},
			div({style: "margin-right: .1em; visibility: hidden;"}, 1 + "."),
			div({style: "width: 3em; margin-right: .3em;", class: "tip", onclick: ()=>this._openPrompt("operatorFrequency")}, "Freq:"),
			div({class: "tip", onclick: ()=>this._openPrompt("operatorVolume")}, "Volume:"),
		));
		for (let i: number = 0; i < Config.operatorCount; i++) {
			const operatorIndex: number = i;
			const operatorNumber: HTMLDivElement = div({style: `margin-right: .1em; color: ${ColorConfig.secondaryText};`}, i + 1 + ".");
			const frequencySelect: HTMLSelectElement = buildOptions(select({style: "width: 100%;", title: "Frequency"}), Config.operatorFrequencies.map(freq=>freq.name));
			const amplitudeSlider: Slider = new Slider(input({type: "range", min: "0", max: Config.operatorAmplitudeMax, value: "0", step: "1", title: "Volume"}), this._doc, (oldValue: number, newValue: number) => new ChangeOperatorAmplitude(this._doc, operatorIndex, oldValue, newValue));
			const row: HTMLDivElement = div({class: "selectRow"},
				operatorNumber,
				div({class: "selectContainer", style: "width: 3em; margin-right: .3em;"}, frequencySelect),
				amplitudeSlider.input,
			);
			this._phaseModGroup.appendChild(row);
			this._operatorRows[i] = row;
			this._operatorAmplitudeSliders[i] = amplitudeSlider;
			this._operatorFrequencySelects[i] = frequencySelect;
			
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
		this._instrumentsButtonBar.addEventListener("click", this._whenSelectInstrument);
		this._instrumentCopyButton.addEventListener("click", this._copyInstrument);
		this._instrumentPasteButton.addEventListener("click", this._pasteInstrument);
		this._customizeInstrumentButton.addEventListener("click", this._whenCustomizePressed);
		this._feedbackTypeSelect.addEventListener("change", this._whenSetFeedbackType);
		this._chipWaveSelect.addEventListener("change", this._whenSetChipWave);
		this._chipNoiseSelect.addEventListener("change", this._whenSetNoiseWave);
		this._transitionSelect.addEventListener("change", this._whenSetTransition);
		this._effectsSelect.addEventListener("change", this._whenSetEffects);
		this._unisonSelect.addEventListener("change", this._whenSetUnison);
		this._chordSelect.addEventListener("change", this._whenSetChord);
		this._vibratoSelect.addEventListener("change", this._whenSetVibrato);
		this._playButton.addEventListener("click", this._togglePlay);
		this._prevBarButton.addEventListener("click", this._whenPrevBarPressed);
		this._nextBarButton.addEventListener("click", this._whenNextBarPressed);
		this._volumeSlider.addEventListener("input", this._setVolumeSlider);
		this._zoomInButton.addEventListener("click", this._zoomIn);
		this._zoomOutButton.addEventListener("click", this._zoomOut);
		
		this._patternArea.addEventListener("mousedown", this._refocusStage);
		this._trackArea.addEventListener("mousedown", this._refocusStage);
		this._fadeInOutEditor.container.addEventListener("mousedown", this._refocusStage);
		this._spectrumEditor.container.addEventListener("mousedown", this._refocusStage);
		this._eqFilterEditor.container.addEventListener("mousedown", this._refocusStage);
		this._noteFilterEditor.container.addEventListener("mousedown", this._refocusStage);
		this._harmonicsEditor.container.addEventListener("mousedown", this._refocusStage);
		this._tempoStepper.addEventListener("keydown", this._tempoStepperCaptureNumberKeys, false);
		this._addEnvelopeButton.addEventListener("click", this._addNewEnvelope);
		this._patternArea.addEventListener("contextmenu", this._disableCtrlContextMenu);
		this._trackArea.addEventListener("contextmenu", this._disableCtrlContextMenu);
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
		
		if (window.screen.availWidth < 710 || window.screen.availHeight < 710) {
			const layoutOption: HTMLOptionElement = <HTMLOptionElement> this._optionsMenu.querySelector("[value=layout]");
			layoutOption.disabled = true;
			layoutOption.setAttribute("hidden", "");
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
				case "layout":
					this.prompt = new LayoutPrompt(this._doc);
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
		const prefs: Preferences = this._doc.prefs;
		this._muteEditor.container.style.display = prefs.enableChannelMuting ? "" : "none";
		const trackBounds: DOMRect = this._trackVisibleArea.getBoundingClientRect();
		this._doc.trackVisibleBars = Math.floor((trackBounds.right - trackBounds.left - (prefs.enableChannelMuting ? 32 : 0)) / this._doc.getBarWidth());
		this._doc.trackVisibleChannels = Math.floor((trackBounds.bottom - trackBounds.top - 30) / this._doc.getChannelHeight());
		this._barScrollBar.render();
		this._muteEditor.render();
		this._trackEditor.render();
		
		this._piano.container.style.display = prefs.showLetters ? "" : "none";
		this._octaveScrollBar.container.style.display = prefs.showScrollBar ? "" : "none";
		this._barScrollBar.container.style.display = this._doc.song.barCount > this._doc.trackVisibleBars ? "" : "none";
		
		if (this._doc.getFullScreen()) {
			const semitoneHeight: number = this._patternEditorRow.clientHeight / this._doc.getVisiblePitchCount();
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
			this._zoomInButton.style.display = "";
			this._zoomOutButton.style.display = "";
			this._zoomInButton.style.right = prefs.showScrollBar ? "24px" : "4px";
			this._zoomOutButton.style.right = prefs.showScrollBar ? "24px" : "4px";
		} else {
			this._patternEditor.container.style.width = "";
			this._patternEditor.container.style.flexShrink = "";
			this._patternEditorPrev.container.style.display = "none";
			this._patternEditorNext.container.style.display = "none";
			this._zoomInButton.style.display = "none";
			this._zoomOutButton.style.display = "none";
		}
		this._patternEditor.render();
		
		const optionCommands: ReadonlyArray<string> = [
			(prefs.autoPlay ? "✓ " : "　") + "Auto Play On Load",
			(prefs.autoFollow ? "✓ " : "　") + "Auto Follow Track",
			(prefs.enableNotePreview ? "✓ " : "　") + "Preview Added Notes",
			(prefs.showLetters ? "✓ " : "　") + "Show Piano Keys",
			(prefs.showFifth ? "✓ " : "　") + 'Highlight "Fifth" Notes',
			(prefs.notesOutsideScale ? "✓ " : "　") + "Allow Notes Outside Scale",
			(prefs.defaultScale == this._doc.song.scale ? "✓ " : "　") + "Use Current Scale as Default",
			(prefs.showChannels ? "✓ " : "　") + "Show All Channels",
			(prefs.showScrollBar ? "✓ " : "　") + "Octave Scroll Bar",
			(prefs.alwaysShowSettings ? "✓ " : "　") + "Customize All Instruments",
			(prefs.instrumentCopyPaste ? "✓ " : "　") + "Instrument Copy/Paste Buttons",
			(prefs.enableChannelMuting ? "✓ " : "　") + "Enable Channel Muting",
			(prefs.displayBrowserUrl ? "✓ " : "　") + "Display Song Data in URL",
			"　Choose Layout...",
			(prefs.colorTheme == "light classic" ? "✓ " : "　") + "Light Theme",
		];
		for (let i: number = 0; i < optionCommands.length; i++) {
			const option: HTMLOptionElement = <HTMLOptionElement> this._optionsMenu.children[i + 1];
			if (option.textContent != optionCommands[i]) option.textContent = optionCommands[i];
		}
		
		const channel: Channel = this._doc.song.channels[this._doc.channel];
		const instrumentIndex: number = this._doc.getCurrentInstrument();
		const instrument: Instrument = channel.instruments[instrumentIndex];
		const wasActive: boolean = this.mainLayer.contains(document.activeElement);
		const activeElement: Element | null = document.activeElement;
		const colors: ChannelColors = ColorConfig.getChannelColor(this._doc.song, this._doc.channel);
		
		for (let i: number = this._effectsSelect.childElementCount - 1; i < Config.effectOrder.length; i++) {
			this._effectsSelect.appendChild(option({value: i}));
		}
		this._effectsSelect.selectedIndex = 0;
		for (let i: number = 0; i < Config.effectOrder.length; i++) {
			let effectFlag: number = Config.effectOrder[i];
			const selected: boolean = ((instrument.effects & (1 << effectFlag)) != 0);
			const label: string = (selected ? "✓ " : "　") + Config.effectNames[effectFlag];
			const option: HTMLOptionElement = <HTMLOptionElement> this._effectsSelect.children[i + 1];
			if (option.textContent != label) option.textContent = label;
		}
		
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
		
		if (prefs.instrumentCopyPaste) {
			this._instrumentCopyPasteRow.style.display = "";
		} else {
			this._instrumentCopyPasteRow.style.display = "none";
		}
		
		if (!prefs.alwaysShowSettings && instrument.preset != instrument.type) {
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
			if (instrument.type == InstrumentType.harmonics || instrument.type == InstrumentType.pickedString) {
				this._harmonicsRow.style.display = "";
				this._harmonicsEditor.render();
			} else {
				this._harmonicsRow.style.display = "none";
			}
			if (instrument.type == InstrumentType.pickedString) {
				this._stringSustainRow.style.display = "";
				this._stringSustainSlider.updateValue(instrument.stringSustain);
			} else {
				this._stringSustainRow.style.display = "none";
			}
			if (instrument.type == InstrumentType.drumset) {
				this._drumsetGroup.style.display = "";
				this._fadeInOutRow.style.display = "none";
				for (let i: number = 0; i < Config.drumCount; i++) {
					setSelectedValue(this._drumsetEnvelopeSelects[i], instrument.drumsetEnvelopes[i]);
					this._drumsetSpectrumEditors[i].render();
				}
			} else {
				this._drumsetGroup.style.display = "none";
				this._fadeInOutRow.style.display = "";
				this._fadeInOutEditor.render();
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
				for (let i: number = 0; i < Config.operatorCount; i++) {
					const isCarrier: boolean = (i < Config.algorithms[instrument.algorithm].carrierCount);
					this._operatorRows[i].style.color = isCarrier ? ColorConfig.primaryText : "";
					setSelectedValue(this._operatorFrequencySelects[i], instrument.operators[i].frequency);
					this._operatorAmplitudeSliders[i].updateValue(instrument.operators[i].amplitude);
					const operatorName: string = (isCarrier ? "Voice " : "Modulator ") + (i + 1);
					this._operatorFrequencySelects[i].title = operatorName + " Frequency";
					this._operatorAmplitudeSliders[i].input.title = operatorName + (isCarrier ? " Volume" : " Amplitude");
				}
			} else {
				this._algorithmSelectRow.style.display = "none";
				this._phaseModGroup.style.display = "none";
				this._feedbackRow1.style.display = "none";
				this._feedbackRow2.style.display = "none";
			}
			if (instrument.type == InstrumentType.pwm) {
				this._pulseWidthRow.style.display = "";
				this._pulseWidthSlider.input.title = prettyNumber(getPulseWidthRatio(instrument.pulseWidth) * 100) + "%";
				this._pulseWidthSlider.updateValue(instrument.pulseWidth);
			} else {
				this._pulseWidthRow.style.display = "none";
			}
			
			if (effectsIncludeTransition(instrument.effects)) {
				this._transitionRow.style.display = "";
				setSelectedValue(this._transitionSelect, instrument.transition);
			} else {
				this._transitionRow.style.display = "none";
			}
			
			if (effectsIncludeChord(instrument.effects)) {
				this._chordSelectRow.style.display = "";
				setSelectedValue(this._chordSelect, instrument.chord);
			} else {
				this._chordSelectRow.style.display = "none";
			}
			
			if (effectsIncludePitchShift(instrument.effects)) {
				this._pitchShiftRow.style.display = "";
				this._pitchShiftSlider.updateValue(instrument.pitchShift);
				this._pitchShiftSlider.input.title = (instrument.pitchShift - Config.pitchShiftCenter) + " semitone(s)";
				for (const marker of this._pitchShiftFifthMarkers) {
					marker.style.display = prefs.showFifth ? "" : "none";
				}
			} else {
				this._pitchShiftRow.style.display = "none";
			}
			
			if (effectsIncludeDetune(instrument.effects)) {
				this._detuneRow.style.display = "";
				this._detuneSlider.updateValue(instrument.detune);
				this._detuneSlider.input.title = (Synth.detuneToCents(instrument.detune - Config.detuneCenter)) + " cent(s)";
			} else {
				this._detuneRow.style.display = "none";
			}
			
			if (effectsIncludeVibrato(instrument.effects)) {
				this._vibratoSelectRow.style.display = "";
				setSelectedValue(this._vibratoSelect, instrument.vibrato);
			} else {
				this._vibratoSelectRow.style.display = "none";
			}
			
			if (effectsIncludeNoteFilter(instrument.effects)) {
				this._noteFilterRow.style.display = "";
				this._noteFilterEditor.render();
			} else {
				this._noteFilterRow.style.display = "none";
			}
			
			if (effectsIncludeDistortion(instrument.effects)) {
				this._distortionRow.style.display = "";
				this._distortionSlider.updateValue(instrument.distortion);
			} else {
				this._distortionRow.style.display = "none";
			}
			
			if (effectsIncludeBitcrusher(instrument.effects)) {
				this._bitcrusherQuantizationRow.style.display = "";
				this._bitcrusherFreqRow.style.display = "";
				this._bitcrusherQuantizationSlider.updateValue(instrument.bitcrusherQuantization);
				this._bitcrusherFreqSlider.updateValue(instrument.bitcrusherFreq);
			} else {
				this._bitcrusherQuantizationRow.style.display = "none";
				this._bitcrusherFreqRow.style.display = "none";
			}
			
			if (effectsIncludePanning(instrument.effects)) {
				this._panSliderRow.style.display = "";
				this._panSlider.updateValue(instrument.pan);
			} else {
				this._panSliderRow.style.display = "none";
			}
			
			if (effectsIncludeChorus(instrument.effects)) {
				this._chorusRow.style.display = "";
				this._chorusSlider.updateValue(instrument.chorus);
			} else {
				this._chorusRow.style.display = "none";
			}
			
			if (effectsIncludeEcho(instrument.effects)) {
				this._echoSustainRow.style.display = "";
				this._echoSustainSlider.updateValue(instrument.echoSustain);
				this._echoDelayRow.style.display = "";
				this._echoDelaySlider.updateValue(instrument.echoDelay);
				this._echoDelaySlider.input.title = (Math.round((instrument.echoDelay + 1) * Config.echoDelayStepTicks / (Config.ticksPerPart * Config.partsPerBeat) * 1000) / 1000) + " beat(s)";
			} else {
				this._echoSustainRow.style.display = "none";
				this._echoDelayRow.style.display = "none";
			}
			
			if (effectsIncludeReverb(instrument.effects)) {
				this._reverbRow.style.display = "";
				this._reverbSlider.updateValue(instrument.reverb);
			} else {
				this._reverbRow.style.display = "none";
			}
			
			if (instrument.type == InstrumentType.chip || instrument.type == InstrumentType.harmonics || instrument.type == InstrumentType.pickedString) {
				this._unisonSelectRow.style.display = "";
				setSelectedValue(this._unisonSelect, instrument.unison);
			} else {
				this._unisonSelectRow.style.display = "none";
			}
			
			this._envelopeEditor.render();
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
		
		if (this._doc.song.layeredInstruments || this._doc.song.patternInstruments) {
			this._instrumentsButtonRow.style.display = "";
			
			this._instrumentsButtonBar.style.setProperty("--text-color-lit", colors.primaryNote);
			this._instrumentsButtonBar.style.setProperty("--text-color-dim", colors.secondaryNote);
			this._instrumentsButtonBar.style.setProperty("--background-color-lit", colors.primaryChannel);
			this._instrumentsButtonBar.style.setProperty("--background-color-dim", colors.secondaryChannel);
			
			const maxInstrumentsPerChannel = this._doc.song.getMaxInstrumentsPerChannel();
			while (this._instrumentButtons.length < channel.instruments.length) {
				const instrumentButton: HTMLButtonElement = button(String(this._instrumentButtons.length + 1));
				this._instrumentButtons.push(instrumentButton);
				this._instrumentsButtonBar.insertBefore(instrumentButton, this._instrumentRemoveButton);
			}
			for (let i: number = this._renderedInstrumentCount; i < channel.instruments.length; i++) {
				this._instrumentButtons[i].style.display = "";
			}
			for (let i: number = channel.instruments.length; i < this._renderedInstrumentCount; i++) {
				this._instrumentButtons[i].style.display = "none";
			}
			this._renderedInstrumentCount = channel.instruments.length;
			while (this._instrumentButtons.length > maxInstrumentsPerChannel) {
				this._instrumentsButtonBar.removeChild(this._instrumentButtons.pop()!);
			}
			
			this._instrumentRemoveButton.style.display = (channel.instruments.length > Config.instrumentCountMin) ? "" : "none";
			this._instrumentAddButton.style.display = (channel.instruments.length < maxInstrumentsPerChannel) ? "" : "none";
			if (channel.instruments.length < maxInstrumentsPerChannel) {
				this._instrumentRemoveButton.classList.remove("last-button");
			} else {
				this._instrumentRemoveButton.classList.add("last-button");
			}
			if (channel.instruments.length > 1) {
				if (this._highlightedInstrumentIndex != instrumentIndex) {
					const oldButton: HTMLButtonElement = this._instrumentButtons[this._highlightedInstrumentIndex];
					if (oldButton != null) oldButton.classList.remove("selected-instrument");
					const newButton: HTMLButtonElement = this._instrumentButtons[instrumentIndex];
					newButton.classList.add("selected-instrument");
					this._highlightedInstrumentIndex = instrumentIndex;
				}
			} else {
				const oldButton: HTMLButtonElement = this._instrumentButtons[this._highlightedInstrumentIndex];
				if (oldButton != null) oldButton.classList.remove("selected-instrument");
				this._highlightedInstrumentIndex = -1;
			}
			
			if (this._doc.song.layeredInstruments && this._doc.song.patternInstruments) {
				//const pattern: Pattern | null = this._doc.getCurrentPattern();
				for (let i: number = 0; i < channel.instruments.length; i++) {
					if (this._doc.recentPatternInstruments[this._doc.channel].indexOf(i) != -1) {
						this._instrumentButtons[i].classList.remove("deactivated");
					} else {
						this._instrumentButtons[i].classList.add("deactivated");
					}
				}
				this._deactivatedInstruments = true;
			} else if (this._deactivatedInstruments) {
				for (let i: number = 0; i < channel.instruments.length; i++) {
					this._instrumentButtons[i].classList.remove("deactivated");
				}
				this._deactivatedInstruments = false;
			}
		} else {
			this._instrumentsButtonRow.style.display = "none";
		}
		
		this._instrumentSettingsGroup.style.color = colors.primaryNote;
		
		this._eqFilterEditor.render();
		this._instrumentVolumeSlider.updateValue(-instrument.volume);
		this._addEnvelopeButton.disabled = (instrument.envelopeCount >= Config.maxEnvelopeCount);
		
		this._volumeSlider.value = String(prefs.volume);
		
		// If an interface element was selected, but becomes invisible (e.g. an instrument
		// select menu) just select the editor container so keyboard commands still work.
		if (wasActive && activeElement != null && activeElement.clientWidth == 0) {
			this._refocusStage();
		}
		
		this._setPrompt(this._doc.prompt);
		
		if (prefs.autoFollow && !this._doc.synth.playing) {
			this._doc.synth.goToBar(this._doc.bar);
		}
		
		// When adding effects or envelopes to an instrument in fullscreen modes,
		// auto-scroll the settings areas to ensure the new settings are visible.
		if (this._doc.addedEffect) {
			const envButtonRect: DOMRect = this._addEnvelopeButton.getBoundingClientRect();
			const instSettingsRect: DOMRect = this._instrumentSettingsArea.getBoundingClientRect();
			const settingsRect: DOMRect = this._settingsArea.getBoundingClientRect();
			this._instrumentSettingsArea.scrollTop += Math.max(0, envButtonRect.top - (instSettingsRect.top + instSettingsRect.height));
			this._settingsArea.scrollTop += Math.max(0, envButtonRect.top - (settingsRect.top + settingsRect.height));
			this._doc.addedEffect = false;
		}
		if (this._doc.addedEnvelope) {
			this._instrumentSettingsArea.scrollTop = this._instrumentSettingsArea.scrollHeight;
			this._settingsArea.scrollTop = this._settingsArea.scrollHeight;
			this._doc.addedEnvelope = false;
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
	
	private _disableCtrlContextMenu = (event: MouseEvent): boolean => {
		// On a Mac, clicking while holding control opens the right-click context menu.
		// But in the pattern and track editors I'd rather prevent that and instead allow
		// custom behaviors such as setting the volume of a note.
		if (event.ctrlKey) {
			event.preventDefault();
			return false;
		}
		return true;
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
				if (!event.ctrlKey && !event.metaKey) {
					new ChangePatternSelection(this._doc, 0, 0);
					this._doc.selection.resetBoxSelection();
				}
				break;
			case 32: // space
				if (event.shiftKey) {
					// Jump to mouse
					if (this._trackEditor.movePlayheadToMouse() || this._patternEditor.movePlayheadToMouse()) {
						if (!this._doc.synth.playing) this._play();
					}
				} else {
					this._togglePlay();
				}
				event.preventDefault();
				this._refocusStage();
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
				if (event.shiftKey) {
					this._copyInstrument();
				} else {
					this._doc.selection.copy();
				}
				event.preventDefault();
				break;
			case 13: // enter/return
				if (event.ctrlKey || event.metaKey) {
					this._doc.selection.insertChannel();
				} else {
					this._doc.selection.insertBars();
				}
				event.preventDefault();
				break;
			case 8: // backspace/delete
				if (event.ctrlKey || event.metaKey) {
					this._doc.selection.deleteChannel();
				} else {
					this._doc.selection.deleteBars();
				}
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
				if (!event.ctrlKey && !event.metaKey) {
					this._doc.selection.duplicatePatterns();
					event.preventDefault();
				}
				break;
			case 70: // f
				if (!event.ctrlKey && !event.metaKey) {
					this._doc.synth.snapToStart();
					if (this._doc.prefs.autoFollow) {
						this._doc.selection.setChannelBar(this._doc.channel, Math.floor(this._doc.synth.playhead));
					}
					event.preventDefault();
				}
				break;
			case 72: // h
				if (!event.ctrlKey && !event.metaKey) {
					this._doc.synth.goToBar(this._doc.bar);
					this._doc.synth.snapToBar();
					if (this._doc.prefs.autoFollow) {
						this._doc.selection.setChannelBar(this._doc.channel, Math.floor(this._doc.synth.playhead));
					}
					event.preventDefault();
				}
				break;
			case 77: // m
				if (!event.ctrlKey && !event.metaKey) {
					if (this._doc.prefs.enableChannelMuting) {
						this._doc.selection.muteChannels(event.shiftKey);
						event.preventDefault();
					}
				}
				break;
			case 81: // q
				if (!event.ctrlKey && !event.metaKey) {
					this._openPrompt("channelSettings");
					event.preventDefault();
				}
				break;
			case 83: // s
				if (event.ctrlKey || event.metaKey) {
					this._openPrompt("export");
					event.preventDefault();
				} else {
					if (this._doc.prefs.enableChannelMuting) {
						this._doc.selection.soloChannels(event.shiftKey);
						event.preventDefault();
					}
				}
				break;
			case 79: // o
				if (event.ctrlKey || event.metaKey) {
					this._openPrompt("import");
					event.preventDefault();
				}
				break;
			case 86: // v
				if ((event.ctrlKey || event.metaKey) && event.shiftKey) {
					this._doc.selection.pasteNumbers();
				} else if (event.shiftKey) {
					this._pasteInstrument();
				} else {
					this._doc.selection.pasteNotes();
				}
				event.preventDefault();
				break;
			case 73: // i
				if (!event.ctrlKey && !event.metaKey && event.shiftKey) {
					// Copy the current instrument as a preset to the clipboard.
					const instrument: Instrument = this._doc.song.channels[this._doc.channel].instruments[this._doc.getCurrentInstrument()];
					const instrumentObject: any = instrument.toJsonObject();
					delete instrumentObject["preset"];
					// Volume and the panning effect are not included in presets.
					delete instrumentObject["volume"];
					delete instrumentObject["pan"];
					const panningEffectIndex: number = instrumentObject["effects"].indexOf(Config.effectNames[EffectType.panning]);
					if (panningEffectIndex != -1) instrumentObject["effects"].splice(panningEffectIndex, 1);
					for (let i: number = 0; i < instrumentObject["envelopes"].length; i++) {
						const envelope: any = instrumentObject["envelopes"][i];
						// If there are any envelopes targeting panning or none, remove those too.
						if (envelope["target"] == "panning" || envelope["target"] == "none" || envelope["envelope"] == "none") {
							instrumentObject["envelopes"].splice(i, 1);
							i--;
						}
					}
					this._copyTextToClipboard(JSON.stringify(instrumentObject));
					event.preventDefault();
				}
				break;
			case 82: // r
				if (!event.ctrlKey && !event.metaKey) {
					if (event.shiftKey) {
						this._randomGenerated();
					} else {
						this._randomPreset();
					}
					event.preventDefault();
				}
				break;
			case 219: // left brace
				if (!event.ctrlKey && !event.metaKey) {
					this._doc.synth.goToPrevBar();
					if (this._doc.prefs.autoFollow) {
						this._doc.selection.setChannelBar(this._doc.channel, Math.floor(this._doc.synth.playhead));
					}
					event.preventDefault();
				}
				break;
			case 221: // right brace
				if (!event.ctrlKey && !event.metaKey) {
					this._doc.synth.goToNextBar();
					if (this._doc.prefs.autoFollow) {
						this._doc.selection.setChannelBar(this._doc.channel, Math.floor(this._doc.synth.playhead));
					}
					event.preventDefault();
				}
				break;
			case 189: // -
			case 173: // Firefox -
				if (!event.ctrlKey && !event.metaKey) {
					this._doc.selection.transpose(false, event.shiftKey);
					event.preventDefault();
				}
				break;
			case 187: // +
			case 61: // Firefox +
			case 171: // Some users have this as +? Hmm.
				if (!event.ctrlKey && !event.metaKey) {
					this._doc.selection.transpose(true, event.shiftKey);
					event.preventDefault();
				}
				break;
			case 38: // up
				if (event.ctrlKey || event.metaKey) {
					this._doc.selection.swapChannels(-1);
				} else if (event.shiftKey) {
					this._doc.selection.boxSelectionY1 = Math.max(0, this._doc.selection.boxSelectionY1 - 1);
					this._doc.selection.scrollToEndOfSelection();
					this._doc.selection.selectionUpdated();
				} else {
					this._doc.selection.setChannelBar((this._doc.channel - 1 + this._doc.song.getChannelCount()) % this._doc.song.getChannelCount(), this._doc.bar);
					this._doc.selection.resetBoxSelection();
				}
				event.preventDefault();
				break;
			case 40: // down
				if (event.ctrlKey || event.metaKey) {
					this._doc.selection.swapChannels(1);
				} else if (event.shiftKey) {
					this._doc.selection.boxSelectionY1 = Math.min(this._doc.song.getChannelCount() - 1, this._doc.selection.boxSelectionY1 + 1);
					this._doc.selection.scrollToEndOfSelection();
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
					this._doc.selection.scrollToEndOfSelection();
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
					this._doc.selection.scrollToEndOfSelection();
					this._doc.selection.selectionUpdated();
				} else {
					this._doc.selection.setChannelBar(this._doc.channel, (this._doc.bar + 1) % this._doc.song.barCount);
					this._doc.selection.resetBoxSelection();
				}
				event.preventDefault();
				break;
			case 48: // 0
				if (!event.ctrlKey && !event.metaKey) {
					this._doc.selection.nextDigit("0", event.shiftKey);
					event.preventDefault();
				}
				break;
			case 49: // 1
				if (!event.ctrlKey && !event.metaKey) {
					this._doc.selection.nextDigit("1", event.shiftKey);
					event.preventDefault();
				}
				break;
			case 50: // 2
				if (!event.ctrlKey && !event.metaKey) {
					this._doc.selection.nextDigit("2", event.shiftKey);
					event.preventDefault();
				}
				break;
			case 51: // 3
				if (!event.ctrlKey && !event.metaKey) {
					this._doc.selection.nextDigit("3", event.shiftKey);
					event.preventDefault();
				}
				break;
			case 52: // 4
				if (!event.ctrlKey && !event.metaKey) {
					this._doc.selection.nextDigit("4", event.shiftKey);
					event.preventDefault();
				}
				break;
			case 53: // 5
				if (!event.ctrlKey && !event.metaKey) {
					this._doc.selection.nextDigit("5", event.shiftKey);
					event.preventDefault();
				}
				break;
			case 54: // 6
				if (!event.ctrlKey && !event.metaKey) {
					this._doc.selection.nextDigit("6", event.shiftKey);
					event.preventDefault();
				}
				break;
			case 55: // 7
				if (!event.ctrlKey && !event.metaKey) {
					this._doc.selection.nextDigit("7", event.shiftKey);
					event.preventDefault();
				}
				break;
			case 56: // 8
				if (!event.ctrlKey && !event.metaKey) {
					this._doc.selection.nextDigit("8", event.shiftKey);
					event.preventDefault();
				}
				break;
			case 57: // 9
				if (!event.ctrlKey && !event.metaKey) {
					this._doc.selection.nextDigit("9", event.shiftKey);
					event.preventDefault();
				}
				break;
			default:
				this._doc.selection.digits = "";
				this._doc.selection.instrumentDigits = "";
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
		this._doc.synth.goToPrevBar();
	}
	
	private _whenNextBarPressed = (): void => {
		this._doc.synth.goToNextBar();
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
		this._doc.synth.maintainLiveInput();
		this.updatePlayButton();
	}
	
	private _pause(): void {
		this._doc.synth.pause();
		this._doc.synth.resetEffects();
		if (this._doc.prefs.autoFollow) {
			this._doc.synth.goToBar(this._doc.bar);
		}
		this._doc.synth.snapToBar();
		this.updatePlayButton();
	}
	
	private _setVolumeSlider = (): void => {
		this._doc.setVolume(Number(this._volumeSlider.value));
	}
	
	private _copyInstrument = (): void => {
		const channel: Channel = this._doc.song.channels[this._doc.channel];
		const instrument: Instrument = channel.instruments[this._doc.getCurrentInstrument()];
		const instrumentCopy: any = instrument.toJsonObject();
		instrumentCopy["isDrum"] = this._doc.song.getChannelIsNoise(this._doc.channel);
		window.localStorage.setItem("instrumentCopy", JSON.stringify(instrumentCopy));
		this._refocusStage();
	}
	
	private _pasteInstrument = (): void => {
		const channel: Channel = this._doc.song.channels[this._doc.channel];
		const instrument: Instrument = channel.instruments[this._doc.getCurrentInstrument()];
		const instrumentCopy: any = JSON.parse(String(window.localStorage.getItem("instrumentCopy")));
		if (instrumentCopy != null && instrumentCopy["isDrum"] == this._doc.song.getChannelIsNoise(this._doc.channel)) {
			this._doc.record(new ChangePasteInstrument(this._doc, instrument, instrumentCopy));
		}
		this._refocusStage();
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
	
	private _whenSetAlgorithm = (): void => {
		this._doc.record(new ChangeAlgorithm(this._doc, this._algorithmSelect.selectedIndex));
	}
	
	private _whenSelectInstrument = (event: MouseEvent): void => {
		if (event.target == this._instrumentAddButton) {
			this._doc.record(new ChangeAddChannelInstrument(this._doc));
		} else if (event.target == this._instrumentRemoveButton) {
			this._doc.record(new ChangeRemoveChannelInstrument(this._doc));
		} else {
			const index: number = this._instrumentButtons.indexOf(<any>event.target);
			if (index != -1) {
				this._doc.selection.selectInstrument(index);
			}
		}
		this._refocusStage();
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
	private _whenSetTransition = (): void => {
		this._doc.record(new ChangeTransition(this._doc, this._transitionSelect.selectedIndex));
	}
	
	private _whenSetEffects = (): void => {
		const instrument: Instrument = this._doc.song.channels[this._doc.channel].instruments[this._doc.getCurrentInstrument()];
		const oldValue: number = instrument.effects;
		const toggleFlag: number = Config.effectOrder[this._effectsSelect.selectedIndex - 1];
		this._doc.record(new ChangeToggleEffects(this._doc, toggleFlag));
		this._effectsSelect.selectedIndex = 0;
		if (instrument.effects > oldValue) {
			this._doc.addedEffect = true;
		}
	}
	
	private _whenSetVibrato = (): void => {
		this._doc.record(new ChangeVibrato(this._doc, this._vibratoSelect.selectedIndex));
	}
	
	private _whenSetUnison = (): void => {
		this._doc.record(new ChangeUnison(this._doc, this._unisonSelect.selectedIndex));
	}
	
	private _whenSetChord = (): void => {
		this._doc.record(new ChangeChord(this._doc, this._chordSelect.selectedIndex));
	}
	
	private _addNewEnvelope = (): void => {
		this._doc.record(new ChangeAddEnvelope(this._doc));
		this._refocusStage();
		this._doc.addedEnvelope = true;
	}
	
	private _zoomIn = (): void => {
		this._doc.prefs.visibleOctaves = Math.max(1, this._doc.prefs.visibleOctaves - 1);
		this._doc.prefs.save();
		this._doc.notifier.changed();
		this._refocusStage();
	}
	
	private _zoomOut = (): void => {
		this._doc.prefs.visibleOctaves = Math.min(Config.pitchOctaves, this._doc.prefs.visibleOctaves + 1);
		this._doc.prefs.save();
		this._doc.notifier.changed();
		this._refocusStage();
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
			case "insertChannel":
				this._doc.selection.insertChannel();
				break;
			case "deleteChannel":
				this._doc.selection.deleteChannel();
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
				this._doc.prefs.autoPlay = !this._doc.prefs.autoPlay;
				break;
			case "autoFollow":
				this._doc.prefs.autoFollow = !this._doc.prefs.autoFollow;
				break;
			case "enableNotePreview":
				this._doc.prefs.enableNotePreview = !this._doc.prefs.enableNotePreview;
				break;
			case "showLetters":
				this._doc.prefs.showLetters = !this._doc.prefs.showLetters;
				break;
			case "showFifth":
				this._doc.prefs.showFifth = !this._doc.prefs.showFifth;
				break;
			case "notesOutsideScale":
				this._doc.prefs.notesOutsideScale = !this._doc.prefs.notesOutsideScale;
				break;
			case "setDefaultScale":
				this._doc.prefs.defaultScale = this._doc.song.scale;
				break;
			case "showChannels":
				this._doc.prefs.showChannels = !this._doc.prefs.showChannels;
				break;
			case "showScrollBar":
				this._doc.prefs.showScrollBar = !this._doc.prefs.showScrollBar;
				break;
			case "alwaysShowSettings":
				this._doc.prefs.alwaysShowSettings = !this._doc.prefs.alwaysShowSettings;
				break;
			case "instrumentCopyPaste":
				this._doc.prefs.instrumentCopyPaste = !this._doc.prefs.instrumentCopyPaste;
				break;
			case "enableChannelMuting":
				this._doc.prefs.enableChannelMuting = !this._doc.prefs.enableChannelMuting;
				for (const channel of this._doc.song.channels) channel.muted = false;
				break;
			case "displayBrowserUrl":
				this._doc.toggleDisplayBrowserUrl();
				break;
			case "layout":
				this._openPrompt("layout");
				break;
			case "colorTheme":
				this._doc.prefs.colorTheme = this._doc.prefs.colorTheme == "light classic" ? "dark classic" : "light classic";
				ColorConfig.setTheme(this._doc.prefs.colorTheme);
				break;
		}
		this._optionsMenu.selectedIndex = 0;
		this._doc.notifier.changed();
		this._doc.prefs.save();
	}
}
