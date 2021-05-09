// Copyright (C) 2020 John Nesky, distributed under the MIT license.

//import {Layout} from "./Layout";
import { Channel, Instrument, ModSetting, ModStatus, Pattern } from "../synth/synth";
import { Config, InstrumentType } from "../synth/SynthConfig";
import { BarScrollBar } from "./BarScrollBar";
import { BeatsPerBarPrompt } from "./BeatsPerBarPrompt";
import { Change, ChangeGroup } from "./Change";
import { ChangeAlgorithm, ChangeChannelBar, ChangeChipWave, ChangeChannelOrder, ChangeChord, ChangeCustomWave, ChangeDetectKey, ChangeDetune, ChangeDrumsetEnvelope, ChangeEffects, ChangeFeedbackAmplitude, ChangeFeedbackEnvelope, ChangeFeedbackType, ChangeFilterCutoff, ChangeFilterEnvelope, ChangeFilterResonance, ChangeInterval, ChangeKey, ChangeNoiseWave, ChangeOperatorAmplitude, ChangeOperatorEnvelope, ChangeOperatorFrequency, ChangePan, ChangePasteInstrument, ChangePatternNumbers, ChangePatternsPerChannel, ChangePreset, ChangePulseEnvelope, ChangePulseWidth, ChangeRandomGeneratedInstrument, ChangeReverb, ChangeRhythm, ChangeScale, ChangeSong, ChangeSongTitle, ChangeTempo, ChangeTransition, ChangeVibrato, ChangeVibratoType, ChangeVolume, ChangeVibratoDepth, ChangeVibratoSpeed, ChangeVibratoDelay, ChangePanDelay, ChangeArpeggioSpeed, pickRandomPresetValue, ChangeFastTwoNoteArp, ChangeClicklessTransition, ChangeTieNoteTransition, ChangePatternSelection } from "./changes";
import { ChannelSettingsPrompt } from "./ChannelSettingsPrompt";
import { ColorConfig } from "./ColorConfig";
import { CustomChipPrompt } from "./CustomChipPrompt";
import { EditorConfig, isMobile, prettyNumber, Preset, PresetCategory } from "./EditorConfig";
import { ExportPrompt } from "./ExportPrompt";
import { HarmonicsEditor } from "./HarmonicsEditor";
import { HTML, SVG } from "imperative-html/dist/esm/elements-strict";
import { InputBox, Slider } from "./HTMLWrapper";
import { ImportPrompt } from "./ImportPrompt";
import { LayoutPrompt } from "./LayoutPrompt";
import { LimiterPrompt } from "./LimiterPrompt";
import { LoopEditor } from "./LoopEditor";
import { MoveNotesSidewaysPrompt } from "./MoveNotesSidewaysPrompt";
import { MuteEditor } from "./MuteEditor";
import { OctaveScrollBar } from "./OctaveScrollBar";
import { PatternEditor } from "./PatternEditor";
import { Piano } from "./Piano";
import { Prompt } from "./Prompt";
import { SongDocument } from "./SongDocument";
import { SongDurationPrompt } from "./SongDurationPrompt";
import { SongRecoveryPrompt } from "./SongRecoveryPrompt";
import { SpectrumEditor } from "./SpectrumEditor";
import { ThemePrompt } from "./ThemePrompt";
import { TipPrompt } from "./TipPrompt";
import { TrackEditor } from "./TrackEditor";

//namespace beepbox {
const { button, div, input, select, span, optgroup, option, canvas } = HTML;

function buildOptions(menu: HTMLSelectElement, items: ReadonlyArray<string | number>): HTMLSelectElement {
	for (let index: number = 0; index < items.length; index++) {
		menu.appendChild(option({ value: index }, items[index]));
	}
	return menu;
}

// Similar to the above, but adds a non-interactive header to the list.
// @jummbus: Honestly not necessary with new HTML options interface, but not exactly necessary to change either!

function buildHeaderedOptions(header: string, menu: HTMLSelectElement, items: ReadonlyArray<string | number>): HTMLSelectElement {
	menu.appendChild(option({ selected: true, disabled: true, value: header }, header));

	for (const item of items) {
		menu.appendChild(option({ value: item }, item));
	}
	return menu;
}

function buildPresetOptions(isNoise: boolean, idSet: string): HTMLSelectElement {
	const menu: HTMLSelectElement = select({ id: idSet });

	// Show the "spectrum" custom type in both pitched and noise channels.
	//const customTypeGroup: HTMLElement = optgroup({label: EditorConfig.presetCategories[0].name});
	if (isNoise) {
		menu.appendChild(option({ value: InstrumentType.noise }, EditorConfig.valueToPreset(InstrumentType.noise)!.name));
		menu.appendChild(option({ value: InstrumentType.spectrum }, EditorConfig.valueToPreset(InstrumentType.spectrum)!.name));
		menu.appendChild(option({ value: InstrumentType.drumset }, EditorConfig.valueToPreset(InstrumentType.drumset)!.name));
	} else {
		menu.appendChild(option({ value: InstrumentType.chip }, EditorConfig.valueToPreset(InstrumentType.chip)!.name));
		menu.appendChild(option({ value: InstrumentType.pwm }, EditorConfig.valueToPreset(InstrumentType.pwm)!.name));
		menu.appendChild(option({ value: InstrumentType.harmonics }, EditorConfig.valueToPreset(InstrumentType.harmonics)!.name));
		menu.appendChild(option({ value: InstrumentType.spectrum }, EditorConfig.valueToPreset(InstrumentType.spectrum)!.name));
		menu.appendChild(option({ value: InstrumentType.fm }, EditorConfig.valueToPreset(InstrumentType.fm)!.name));
		menu.appendChild(option({ value: InstrumentType.customChipWave }, EditorConfig.valueToPreset(InstrumentType.customChipWave)!.name));
	}

	const randomGroup: HTMLElement = optgroup({ label: "Randomize ▾" });
	randomGroup.appendChild(option({ value: "randomPreset" }, "Random Preset"));
	randomGroup.appendChild(option({ value: "randomGenerated" }, "Random Generated"));
	menu.appendChild(randomGroup);


	for (let categoryIndex: number = 1; categoryIndex < EditorConfig.presetCategories.length; categoryIndex++) {
		const category: PresetCategory = EditorConfig.presetCategories[categoryIndex];
		const group: HTMLElement = optgroup({ label: category.name + " ▾" });
		let foundAny: boolean = false;
		for (let presetIndex: number = 0; presetIndex < category.presets.length; presetIndex++) {
			const preset: Preset = category.presets[presetIndex];
			if ((preset.isNoise == true) == isNoise) {
				group.appendChild(option({ value: (categoryIndex << 6) + presetIndex }, preset.name));
				foundAny = true;
			}
		}

		// Need to re-sort some elements for readability. Can't just do this in the menu, because indices are saved in URLs and would get broken if the ordering actually changed.
		if (category.name == "String Presets" && foundAny) {

			// Put violin 2 after violin 1
			let moveViolin2 = group.removeChild(group.children[11]);
			group.insertBefore(moveViolin2, group.children[1]);
		}

		if (category.name == "Flute Presets" && foundAny) {

			// Put flute 2 after flute 1
			let moveFlute2 = group.removeChild(group.children[11]);
			group.insertBefore(moveFlute2, group.children[1]);
		}

		if (category.name == "Keyboard Presets" && foundAny) {

			// Put grand piano 2 after grand piano 1
			let moveGrandPiano2 = group.removeChild(group.children[9]);
			group.insertBefore(moveGrandPiano2, group.children[1]);
		}

		if (foundAny) menu.appendChild(group);
	}

	return menu;
}

function setSelectedValue(menu: HTMLSelectElement, value: number): void {
	const stringValue = value.toString();
	if (menu.value != stringValue) menu.value = stringValue;

	// Change select2 value, if this select is a member of that class.
	if ($(menu).data('select2')) {
		$(menu).val(value).trigger('change.select2');
	}
}

class CustomChipCanvas {
	private mouseDown: boolean;
	private continuousEdit: boolean;
	private lastX: number;
	private lastY: number;
	public newArray: Float64Array;

	private _change: Change | null = null;

	constructor(public readonly canvas: HTMLCanvasElement, private readonly _doc: SongDocument, private readonly _getChange: (newArray: Float64Array) => Change) {
		//canvas.addEventListener("input", this._whenInput);
		//canvas.addEventListener("change", this._whenChange);
		canvas.addEventListener("mousemove", this._onMouseMove);
		canvas.addEventListener("mousedown", this._onMouseDown);
		canvas.addEventListener("mouseup", this._onMouseUp);
		canvas.addEventListener("mouseleave", this._onMouseUp);

		this.mouseDown = false;
		this.continuousEdit = false;
		this.lastX = 0;
		this.lastY = 0;

		this.newArray = new Float64Array(64);

		// Init waveform
		this.redrawCanvas();

	}

	public redrawCanvas(): void {
		var ctx = this.canvas.getContext("2d") as CanvasRenderingContext2D;

		// Black BG
		ctx.fillStyle = ColorConfig.getComputed("--editor-background");
		ctx.fillRect(0, 0, 128, 52);

		// Mid-bar
		ctx.fillStyle = ColorConfig.getComputed("--ui-widget-background");
		ctx.fillRect(0, 25, 128, 2);

		// 25-75 bars
		ctx.fillStyle = ColorConfig.getComputed("--track-editor-bg-pitch-dim");
		ctx.fillRect(0, 13, 128, 1);
		ctx.fillRect(0, 39, 128, 1);

		// Waveform
		ctx.fillStyle = ColorConfig.getComputedChannelColor(this._doc.song, this._doc.channel).primaryNote;

		for (let x: number = 0; x < 64; x++) {
			var y: number = this._doc.song.channels[this._doc.channel].instruments[this._doc.getCurrentInstrument()].customChipWave[x] + 26;
			ctx.fillRect(x * 2, y - 2, 2, 4);

			this.newArray[x] = y - 26;
		}
	}

	private _onMouseMove = (event: MouseEvent): void => {
		if (this.mouseDown) {

			var x = (event.clientX || event.pageX) - this.canvas.getBoundingClientRect().left;
			var y = Math.floor((event.clientY || event.pageY) - this.canvas.getBoundingClientRect().top);

			if (y < 2) y = 2;
			if (y > 50) y = 50;

			var ctx = this.canvas.getContext("2d") as CanvasRenderingContext2D;

			if (this.continuousEdit == true && Math.abs(this.lastX - x) < 40) {

				var lowerBound = (x < this.lastX) ? x : this.lastX;
				var upperBound = (x < this.lastX) ? this.lastX : x;

				for (let i = lowerBound; i <= upperBound; i += 2) {

					var progress = (Math.abs(x - this.lastX) > 2.0) ? ((x > this.lastX) ?
						1.0 - ((i - lowerBound) / (upperBound - lowerBound))
						: ((i - lowerBound) / (upperBound - lowerBound))) : 0.0;
					var j = Math.round(y + (this.lastY - y) * progress);

					ctx.fillStyle = ColorConfig.getComputed("--editor-background");
					ctx.fillRect(Math.floor(i / 2) * 2, 0, 2, 53);
					ctx.fillStyle = ColorConfig.getComputed("--ui-widget-background");
					ctx.fillRect(Math.floor(i / 2) * 2, 25, 2, 2);
					ctx.fillStyle = ColorConfig.getComputed("--track-editor-bg-pitch-dim");
					ctx.fillRect(Math.floor(i / 2) * 2, 13, 2, 1);
					ctx.fillRect(Math.floor(i / 2) * 2, 39, 2, 1);
					ctx.fillStyle = ColorConfig.getComputedChannelColor(this._doc.song, this._doc.channel).primaryNote;
					ctx.fillRect(Math.floor(i / 2) * 2, j - 2, 2, 4);

					// Actually update current instrument's custom waveform
					this.newArray[Math.floor(i / 2)] = (j - 26);
				}

			}
			else {

				ctx.fillStyle = ColorConfig.getComputed("--editor-background");
				ctx.fillRect(Math.floor(x / 2) * 2, 0, 2, 52);
				ctx.fillStyle = ColorConfig.getComputed("--ui-widget-background");
				ctx.fillRect(Math.floor(x / 2) * 2, 25, 2, 2);
				ctx.fillStyle = ColorConfig.getComputed("--track-editor-bg-pitch-dim");
				ctx.fillRect(Math.floor(x / 2) * 2, 13, 2, 1);
				ctx.fillRect(Math.floor(x / 2) * 2, 39, 2, 1);
				ctx.fillStyle = ColorConfig.getComputedChannelColor(this._doc.song, this._doc.channel).primaryNote;
				ctx.fillRect(Math.floor(x / 2) * 2, y - 2, 2, 4);

				// Actually update current instrument's custom waveform
				this.newArray[Math.floor(x / 2)] = (y - 26);

			}

			this.continuousEdit = true;
			this.lastX = x;
			this.lastY = y;

			// Preview - update integral used for sound synthesis based on new array, not actual stored array. When mouse is released, real update will happen.
			let instrument: Instrument = this._doc.song.channels[this._doc.channel].instruments[this._doc.getCurrentInstrument()];

			let sum: number = 0.0;
			for (let i: number = 0; i < this.newArray.length; i++) {
				sum += this.newArray[i];
			}
			const average: number = sum / this.newArray.length;

			// Perform the integral on the wave. The chipSynth will perform the derivative to get the original wave back but with antialiasing.
			let cumulative: number = 0;
			let wavePrev: number = 0;
			for (let i: number = 0; i < this.newArray.length; i++) {
				cumulative += wavePrev;
				wavePrev = this.newArray[i] - average;
				instrument.customChipWaveIntegral[i] = cumulative;
			}

			instrument.customChipWaveIntegral[64] = 0.0;
		}

	}

	private _onMouseDown = (event: MouseEvent): void => {
		this.mouseDown = true;

		// Allow single-click edit
		this._onMouseMove(event);
	}
	private _onMouseUp = (): void => {
		this.mouseDown = false;
		this.continuousEdit = false;

		this._whenChange();
	}

	private _whenChange = (): void => {
		this._change = this._getChange(this.newArray);

		this._doc.record(this._change!);

		this._change = null;
	};

}

export class SongEditor {
	public prompt: Prompt | null = null;

	private readonly _patternEditorPrev: PatternEditor = new PatternEditor(this._doc, false, -1);
	private readonly _patternEditor: PatternEditor = new PatternEditor(this._doc, true, 0);
	private readonly _patternEditorNext: PatternEditor = new PatternEditor(this._doc, false, 1);
	private readonly _trackEditor: TrackEditor = new TrackEditor(this._doc, this);
	private readonly _muteEditor: MuteEditor = new MuteEditor(this._doc, this);
	private readonly _loopEditor: LoopEditor = new LoopEditor(this._doc);
	private readonly _piano: Piano = new Piano(this._doc);
	private readonly _octaveScrollBar: OctaveScrollBar = new OctaveScrollBar(this._doc, this._piano);
	private readonly _playButton: HTMLButtonElement = button({ style: "width: 80px;", type: "button" });
	private readonly _prevBarButton: HTMLButtonElement = button({ class: "prevBarButton", style: "width: 40px;", type: "button", title: "Previous Bar (left bracket)" });
	private readonly _nextBarButton: HTMLButtonElement = button({ class: "nextBarButton", style: "width: 40px;", type: "button", title: "Next Bar (right bracket)" });
	private readonly _volumeSlider: Slider = new Slider(input({ title: "main volume", style: "width: 5em; flex-grow: 1; margin: 0;", type: "range", min: "0", max: "75", value: "50", step: "1" }), this._doc, null, false);
	private readonly _outVolumeBarBg: SVGRectElement = SVG.rect({ "pointer-events": "none", width: "90%", height: "50%", x: "5%", y: "25%", fill: ColorConfig.uiWidgetBackground });
	private readonly _outVolumeBar: SVGRectElement = SVG.rect({ "pointer-events": "none", height: "50%", width: "0%", x: "5%", y: "25%", fill: "url('#volumeGrad2')" });
	private readonly _outVolumeCap: SVGRectElement = SVG.rect({ "pointer-events": "none", width: "2px", height: "50%", x: "5%", y: "25%", fill: ColorConfig.uiWidgetFocus });
	private readonly _stop1: SVGStopElement = SVG.stop({ "stop-color": "lime", offset: "60%" });
	private readonly _stop2: SVGStopElement = SVG.stop({ "stop-color": "orange", offset: "90%" });
	private readonly _stop3: SVGStopElement = SVG.stop({ "stop-color": "red", offset: "100%" });
	private readonly _gradient: SVGGradientElement = SVG.linearGradient({ id: "volumeGrad2", gradientUnits: "userSpaceOnUse" }, this._stop1, this._stop2, this._stop3);
	private readonly _defs: SVGDefsElement = SVG.defs({}, this._gradient);
	private readonly _volumeBarContainer: SVGSVGElement = SVG.svg({ style: `touch-action: none; overflow: visible; margin: auto; max-width: 20vw;`, width: "160px", height: "100%", preserveAspectRatio: "none", viewBox: "0 0 160 12" },
		this._defs,
		this._outVolumeBarBg,
		this._outVolumeBar,
		this._outVolumeCap,
	);
	private readonly _volumeBarBox: HTMLDivElement = div({ class: "playback-volume-bar", style: "height: 12px; align-self: center;" },
		this._volumeBarContainer,
	);
	private readonly _fileMenu: HTMLSelectElement = select({ style: "width: 100%;" },
		option({ selected: true, disabled: true, hidden: false }, "File"), // todo: "hidden" should be true but looks wrong on mac chrome, adds checkmark next to first visible option. :(
		option({ value: "new" }, "+ New Blank Song"),
		option({ value: "import" }, "↑ Import Song..."),
		option({ value: "export" }, "↓ Export Song..."),
		option({ value: "copyUrl" }, "⎘ Copy Song URL"),
		option({ value: "shareUrl" }, "⤳ Share Song URL"),
		option({ value: "shortenUrl" }, "… Shorten Song URL"),
		option({ value: "viewPlayer" }, "▶ View in Song Player"),
		option({ value: "copyEmbed" }, "⎘ Copy HTML Embed Code"),
		option({ value: "songRecovery" }, "⚠ Recover Recent Song..."),
	);
	private readonly _editMenu: HTMLSelectElement = select({ style: "width: 100%;" },
		option({ selected: true, disabled: true, hidden: false }, "Edit"), // todo: "hidden" should be true but looks wrong on mac chrome, adds checkmark next to first visible option. :(
		option({ value: "undo" }, "Undo (Z)"),
		option({ value: "redo" }, "Redo (Y)"),
		option({ value: "copy" }, "Copy Pattern (C)"),
		option({ value: "pasteNotes" }, "Paste Pattern Notes (V)"),
		option({ value: "pasteNumbers" }, "Paste Pattern Numbers (⇧V)"),
		option({ value: "insertBars" }, "Insert Bar After Selection (⏎)"),
		option({ value: "deleteBars" }, "Delete Selected Bar (⌫)"),
		option({ value: "selectAll" }, "Select All (A)"),
		option({ value: "selectChannel" }, "Select Channel (⇧A)"),
		option({ value: "duplicatePatterns" }, "Duplicate Reused Patterns (D)"),
		option({ value: "transposeUp" }, "Move Notes Up (+)"),
		option({ value: "transposeDown" }, "Move Notes Down (-)"),
		option({ value: "moveNotesSideways" }, "Move All Notes Sideways... (W)"),
		option({ value: "beatsPerBar" }, "Change Beats Per Bar..."),
		option({ value: "barCount" }, "Change Song Length... (L)"),
		option({ value: "channelSettings" }, "Channel Settings... (Q)"),
		option({ value: "limiterSettings" }, "Limiter Settings... (⇧L)"),
	);
	private readonly _optionsMenu: HTMLSelectElement = select({ style: "width: 100%;" },
		option({ selected: true, disabled: true, hidden: false }, "Preferences"), // todo: "hidden" should be true but looks wrong on mac chrome, adds checkmark next to first visible option. :(
		option({ value: "autoPlay" }, "Auto Play On Load"),
		option({ value: "autoFollow" }, "Auto Follow Track"),
		option({ value: "enableNotePreview" }, "Preview Added Notes"),
		option({ value: "showLetters" }, "Show Piano Keys"),
		option({ value: "showFifth" }, 'Highlight "Fifth" Notes'),
		option({ value: "showChannels" }, "Show All Channels"),
		option({ value: "showScrollBar" }, "Octave Scroll Bar"),
		option({ value: "alwaysFineNoteVol" }, "Always Fine Note Vol."),
		option({ value: "enableChannelMuting" }, "Enable Channel Muting"),
		option({ value: "displayBrowserUrl" }, "Display Song Data in URL"),
		option({ value: "displayVolumeBar" }, "Show Playback Volume"),
		option({ value: "fullScreen" }, "Set Layout..."),
		option({ value: "colorTheme" }, "Set Theme..."),
		//option({value: "alwaysShowSettings"}, "Customize All Instruments"),
	);
	private readonly _scaleSelect: HTMLSelectElement = buildOptions(select(), Config.scales.map(scale => scale.name));
	private readonly _keySelect: HTMLSelectElement = buildOptions(select(), Config.keys.map(key => key.name).reverse());
	private readonly _tempoSlider: Slider = new Slider(input({ style: "margin: 0; vertical-align: middle;", type: "range", min: "30", max: "320", value: "160", step: "1" }), this._doc, (oldValue: number, newValue: number) => new ChangeTempo(this._doc, oldValue, newValue), false);
	private readonly _tempoStepper: HTMLInputElement = input({ style: "width: 4em; font-size: 80%; margin-left: 0.4em; vertical-align: middle;", type: "number", step: "1" });
	private readonly _reverbSlider: Slider = new Slider(input({ style: "margin: 0;", type: "range", min: "0", max: Config.reverbRange - 1, value: "0", step: "1" }), this._doc, (oldValue: number, newValue: number) => new ChangeReverb(this._doc, oldValue, newValue), false);
	private readonly _rhythmSelect: HTMLSelectElement = buildOptions(select(), Config.rhythms.map(rhythm => rhythm.name));
	private readonly _pitchedPresetSelect: HTMLSelectElement = buildPresetOptions(false, "pitchPresetSelect");
	private readonly _drumPresetSelect: HTMLSelectElement = buildPresetOptions(true, "drumPresetSelect");
	private readonly _algorithmSelect: HTMLSelectElement = buildOptions(select(), Config.algorithms.map(algorithm => algorithm.name));
	private readonly _algorithmSelectRow: HTMLDivElement = div({ class: "selectRow" }, span({ class: "tip", onclick: () => this._openPrompt("algorithm") }, "Algorithm: "), div({ class: "selectContainer" }, this._algorithmSelect));
	private readonly _instrumentSelect: HTMLSelectElement = select();
	private readonly _instrumentSelectRow: HTMLDivElement = div({ class: "selectRow", style: "display: none;" }, span({ class: "tip", onclick: () => this._openPrompt("instrumentIndex") }, "Instrument: "), div({ class: "selectContainer" }, this._instrumentSelect));
	private readonly _instrumentVolumeSlider: Slider = new Slider(input({ style: "margin: 0; position: sticky;", type: "range", min: Math.floor(-Config.volumeRange / 2), max: Math.floor(Config.volumeRange / 2), value: "0", step: "1" }), this._doc, (oldValue: number, newValue: number) => new ChangeVolume(this._doc, oldValue, newValue), true);
	private readonly _instrumentVolumeSliderInputBox: HTMLInputElement = input({ style: "width: 4em; font-size: 80%", id: "volumeSliderInputBox", type: "number", step: "1", min: Math.floor(-Config.volumeRange / 2), max: Math.floor(Config.volumeRange / 2), value: "0" });
	private readonly _instrumentVolumeSliderTip: HTMLDivElement = div({ class: "selectRow", style: "height: 1em" }, span({ class: "tip", style: "font-size: smaller;", onclick: () => this._openPrompt("instrumentVolume") }, "Volume: "));
	private readonly _instrumentVolumeSliderRow: HTMLDivElement = div({ class: "selectRow" }, div({},
		div({ style: "color: " + ColorConfig.secondaryText + ";" }, span({ class: "tip" }, this._instrumentVolumeSliderTip)),
		div({ style: "color: " + ColorConfig.secondaryText + "; margin-top: -3px;" }, this._instrumentVolumeSliderInputBox),
	), this._instrumentVolumeSlider.container);
	private readonly _panSlider: Slider = new Slider(input({ style: "margin: 0;", position: "sticky;", type: "range", min: "0", max: Config.panMax, value: Config.panCenter, step: "1" }), this._doc, (oldValue: number, newValue: number) => new ChangePan(this._doc, oldValue, newValue), true);
	private readonly _panDropdown: HTMLButtonElement = button({ style: "margin-left:0em; height:1.5em; width: 10px; padding: 0px; font-size: 8px;", onclick: () => this._toggleDropdownMenu(1) }, "▼");
	private readonly _panSliderInputBox: HTMLInputElement = input({ style: "width: 4em; font-size: 80%; ", id: "panSliderInputBox", type: "number", step: "1", min: "0", max: "100", value: "0" });
	private readonly _panSliderRow: HTMLDivElement = div({ class: "selectRow" }, div({},
		span({ class: "tip", tabindex: "0", style: "height:1em; font-size: smaller;", onclick: () => this._openPrompt("pan") }, "Pan: "),
		div({ style: "color: " + ColorConfig.secondaryText + "; margin-top: -3px;" }, this._panSliderInputBox),
	), this._panDropdown, this._panSlider.container);
	private readonly _panDelaySlider: Slider = new Slider(input({ style: "margin: 0;", type: "range", min: "0", max: this._doc.song.mstMaxVols.get(ModSetting.mstPanDelay), value: "0", step: "1" }), this._doc, (oldValue: number, newValue: number) => new ChangePanDelay(this._doc, oldValue, newValue), false);
	private readonly _panDelayRow: HTMLElement = div({ class: "selectRow" }, span({ class: "tip", style: "margin-left:10px;", onclick: () => this._openPrompt("panDelay") }, "Delay:"), this._panDelaySlider.container);
	private readonly _panDropdownGroup: HTMLElement = div({ class: "editor-controls" }, this._panDelayRow);
	private readonly _detuneSlider: Slider = new Slider(input({ style: "margin: 0;", type: "range", min: Config.detuneMin, max: Config.detuneMax, value: 0, step: "1" }), this._doc, (oldValue: number, newValue: number) => new ChangeDetune(this._doc, oldValue, newValue), true);
	private readonly _detuneSliderInputBox: HTMLInputElement = input({ style: "width: 4em; font-size: 80%; ", id: "detuneSliderInputBox", type: "number", step: "1", min: "" + Config.detuneMin, max: "" + Config.detuneMax, value: "0" });
	private readonly _detuneSliderRow: HTMLDivElement = div({ class: "selectRow" }, div({},
		span({ class: "tip", style: "height:1em; font-size: smaller;", onclick: () => this._openPrompt("detune") }, "Detune: "),
		div({ style: "color: " + ColorConfig.secondaryText + "; margin-top: -3px;" }, this._detuneSliderInputBox),
	), this._detuneSlider.container);
	private readonly _chipWaveSelect: HTMLSelectElement = buildOptions(select(), Config.chipWaves.map(wave => wave.name));
	private readonly _chipNoiseSelect: HTMLSelectElement = buildOptions(select(), Config.chipNoises.map(wave => wave.name));
	private readonly _chipWaveSelectRow: HTMLDivElement = div({ class: "selectRow" }, span({ class: "tip", onclick: () => this._openPrompt("chipWave") }, "Wave: "), div({ class: "selectContainer" }, this._chipWaveSelect));
	private readonly _chipNoiseSelectRow: HTMLDivElement = div({ class: "selectRow" }, span({ class: "tip", onclick: () => this._openPrompt("chipNoise") }, "Noise: "), div({ class: "selectContainer" }, this._chipNoiseSelect));
	private readonly _transitionSelect: HTMLSelectElement = buildOptions(select(), Config.transitions.map(transition => transition.name));
	private readonly _transitionDropdown: HTMLButtonElement = button({ style: "margin-left:0em; height:1.5em; width: 10px; padding: 0px; font-size: 8px;", onclick: () => this._toggleDropdownMenu(3) }, "▼");
	private readonly _transitionRow: HTMLDivElement = div({ class: "selectRow" }, span({ class: "tip", onclick: () => this._openPrompt("transition") }, "Transition:"), this._transitionDropdown, div({ class: "selectContainer" }, this._transitionSelect));
	private readonly _tieNoteTransitionBox: HTMLInputElement = input({ type: "checkbox", style: "width: 1em; padding: 0; margin-right: 4em;" });
	private readonly _tieNoteTransitionRow: HTMLElement = div({ class: "selectRow" }, span({ class: "tip", style: "margin-left:10px;", onclick: () => this._openPrompt("transitionBar") }, "Tie Over Bars:"), this._tieNoteTransitionBox);
	private readonly _clicklessTransitionBox: HTMLInputElement = input({ type: "checkbox", style: "width: 1em; padding: 0; margin-right: 4em;" });
	private readonly _clicklessTransitionRow: HTMLElement = div({ class: "selectRow" }, span({ class: "tip", style: "margin-left:10px;", onclick: () => this._openPrompt("clicklessTransition") }, "Clickless:"), this._clicklessTransitionBox);
	private readonly _transitionDropdownGroup: HTMLElement = div({ class: "editor-controls" }, this._tieNoteTransitionRow, this._clicklessTransitionRow);
	private readonly _effectsSelect: HTMLSelectElement = buildOptions(select(), Config.effectsNames);
	private readonly _filterCutoffSlider: Slider = new Slider(input({ style: "margin: 0;", type: "range", min: "0", max: Config.filterCutoffRange - 1, value: "6", step: "1" }), this._doc, (oldValue: number, newValue: number) => new ChangeFilterCutoff(this._doc, oldValue, newValue), false);
	private _filterCutoffRow: HTMLDivElement = div({ class: "selectRow", title: "Low-pass Filter Cutoff Frequency" }, span({ class: "tip", onclick: () => this._openPrompt("filterCutoff") }, "Filter Cut:"), this._filterCutoffSlider.container);
	private readonly _filterResonanceSlider: Slider = new Slider(input({ style: "margin: 0;", type: "range", min: "0", max: Config.filterResonanceRange - 1, value: "6", step: "1" }), this._doc, (oldValue: number, newValue: number) => new ChangeFilterResonance(this._doc, oldValue, newValue), false);
	private _filterResonanceRow: HTMLDivElement = div({ class: "selectRow", title: "Low-pass Filter Peak Resonance" }, span({ class: "tip", onclick: () => this._openPrompt("filterResonance") }, "Filter Peak:"), this._filterResonanceSlider.container);
	private readonly _filterEnvelopeSelect: HTMLSelectElement = buildOptions(select(), Config.envelopes.map(envelope => envelope.name));
	private _filterEnvelopeRow: HTMLDivElement = div({ class: "selectRow", title: "Low-pass Filter Envelope" }, span({ class: "tip", onclick: () => this._openPrompt("filterEnvelope") }, "Filter Env:"), div({ class: "selectContainer" }, this._filterEnvelopeSelect));
	private readonly _pulseEnvelopeSelect: HTMLSelectElement = buildOptions(select(), Config.envelopes.map(envelope => envelope.name));
	private _pulseEnvelopeRow: HTMLDivElement = div({ class: "selectRow", title: "Pulse Width Modulator Envelope" }, span({ class: "tip", onclick: () => this._openPrompt("pulseEnvelope") }, "Pulse Env:"), div({ class: "selectContainer" }, this._pulseEnvelopeSelect));
	private readonly _pulseWidthSlider: Slider = new Slider(input({ style: "margin: 0;", type: "range", min: "1", max: Config.pulseWidthRange, value: "0", step: "1" }), this._doc, (oldValue: number, newValue: number) => new ChangePulseWidth(this._doc, oldValue, newValue), false);
	private _pulseWidthRow: HTMLDivElement = div({ class: "selectRow" }, span({ class: "tip", onclick: () => this._openPrompt("pulseWidth") }, "Pulse Width:"), this._pulseWidthSlider.container);
	private readonly _intervalSelect: HTMLSelectElement = buildOptions(select(), Config.intervals.map(interval => interval.name));
	private readonly _intervalSelectRow: HTMLElement = div({ class: "selectRow" }, span({ class: "tip", onclick: () => this._openPrompt("interval") }, "Interval:"), div({ class: "selectContainer" }, this._intervalSelect));
	private readonly _chordSelect: HTMLSelectElement = buildOptions(select(), Config.chords.map(chord => chord.name));
	private readonly _chordDropdown: HTMLButtonElement = button({ style: "margin-left:0em; height:1.5em; width: 10px; padding: 0px; font-size: 8px;", onclick: () => this._toggleDropdownMenu(2) }, "▼");
	private readonly _chordSelectRow: HTMLElement = div({ class: "selectRow" }, span({ class: "tip", onclick: () => this._openPrompt("chords") }, "Chords:"), this._chordDropdown, div({ class: "selectContainer", style: "width: 61.5%;" }, this._chordSelect));
	private readonly _arpeggioSpeedSlider: Slider = new Slider(input({ style: "margin: 0;", type: "range", min: "0", max: this._doc.song.mstMaxVols.get(ModSetting.mstArpeggioSpeed), value: "0", step: "1" }), this._doc, (oldValue: number, newValue: number) => new ChangeArpeggioSpeed(this._doc, oldValue, newValue), false);
	private readonly _arpeggioSpeedRow: HTMLElement = div({ class: "selectRow" }, span({ class: "tip", style: "margin-left:10px;", onclick: () => this._openPrompt("arpeggioSpeed") }, "Speed:"), this._arpeggioSpeedSlider.container);
	private readonly _twoNoteArpBox: HTMLInputElement = input({ type: "checkbox", style: "width: 1em; padding: 0; margin-right: 4em;" });
	private readonly _twoNoteArpRow: HTMLElement = div({ class: "selectRow" }, span({ class: "tip", style: "margin-left:10px;", onclick: () => this._openPrompt("twoNoteArpeggio") }, "Fast Two-Note:"), this._twoNoteArpBox);
	private readonly _chordDropdownGroup: HTMLElement = div({ class: "editor-controls" }, this._arpeggioSpeedRow, this._twoNoteArpRow);
	private readonly _vibratoSelect: HTMLSelectElement = buildOptions(select(), Config.vibratos.map(vibrato => vibrato.name));
	private readonly _vibratoDropdown: HTMLButtonElement = button({ style: "margin-left:0em; height:1.5em; width: 10px; padding: 0px; font-size: 8px;", onclick: () => this._toggleDropdownMenu(0) }, "▼");
	private readonly _vibratoSelectRow: HTMLElement = div({ class: "selectRow" }, span({ class: "tip", onclick: () => this._openPrompt("vibrato") }, "Vibrato:"), this._vibratoDropdown, div({ class: "selectContainer", style: "width: 61.5%;" }, this._vibratoSelect));
	private readonly _vibratoDepthSlider: Slider = new Slider(input({ style: "margin: 0;", type: "range", min: "0", max: this._doc.song.mstMaxVols.get(ModSetting.mstVibratoDepth), value: "0", step: "1" }), this._doc, (oldValue: number, newValue: number) => new ChangeVibratoDepth(this._doc, oldValue, newValue), false);
	private readonly _vibratoDepthRow: HTMLElement = div({ class: "selectRow" }, span({ class: "tip", style: "margin-left:10px;", onclick: () => this._openPrompt("vibratoDepth") }, "Depth:"), this._vibratoDepthSlider.container);
	private readonly _vibratoSpeedSlider: Slider = new Slider(input({ style: "margin: 0;", type: "range", min: "0", max: this._doc.song.mstMaxVols.get(ModSetting.mstVibratoSpeed), value: "0", step: "1" }), this._doc, (oldValue: number, newValue: number) => new ChangeVibratoSpeed(this._doc, oldValue, newValue), false);
	private readonly _vibratoSpeedRow: HTMLElement = div({ class: "selectRow" }, span({ class: "tip", style: "margin-left:10px;", onclick: () => this._openPrompt("vibratoSpeed") }, "Speed:"), this._vibratoSpeedSlider.container);
	private readonly _vibratoDelaySlider: Slider = new Slider(input({ style: "margin: 0;", type: "range", min: "0", max: this._doc.song.mstMaxVols.get(ModSetting.mstVibratoDelay), value: "0", step: "1" }), this._doc, (oldValue: number, newValue: number) => new ChangeVibratoDelay(this._doc, oldValue, newValue), false);
	private readonly _vibratoDelayRow: HTMLElement = div({ class: "selectRow" }, span({ class: "tip", style: "margin-left:10px;", onclick: () => this._openPrompt("vibratoDelay") }, "Delay:"), this._vibratoDelaySlider.container);
	private readonly _vibratoTypeSelect: HTMLSelectElement = buildOptions(select(), Config.vibratoTypes.map(vibrato => vibrato.name));
	private readonly _vibratoTypeSelectRow: HTMLElement = div({ class: "selectRow" }, span({ class: "tip", style: "margin-left:10px;", onclick: () => this._openPrompt("vibratoType") }, "Type:"), div({ class: "selectContainer", style: "width: 61.5%;" }, this._vibratoTypeSelect));
	private readonly _vibratoDropdownGroup: HTMLElement = div({ class: "editor-controls" }, this._vibratoDepthRow, this._vibratoSpeedRow, this._vibratoDelayRow, this._vibratoTypeSelectRow);
	private readonly _phaseModGroup: HTMLElement = div({ class: "editor-controls" });
	private readonly _feedbackTypeSelect: HTMLSelectElement = buildOptions(select(), Config.feedbacks.map(feedback => feedback.name));
	private readonly _feedbackRow1: HTMLDivElement = div({ class: "selectRow" }, span({ class: "tip", onclick: () => this._openPrompt("feedbackType") }, "Feedback:"), div({ class: "selectContainer" }, this._feedbackTypeSelect));
	private readonly _spectrumEditor: SpectrumEditor = new SpectrumEditor(this._doc, null);
	private readonly _spectrumRow: HTMLElement = div({ class: "selectRow" }, span({ class: "tip", onclick: () => this._openPrompt("spectrum") }, "Spectrum:"), this._spectrumEditor.container);
	private readonly _harmonicsEditor: HarmonicsEditor = new HarmonicsEditor(this._doc);
	private readonly _harmonicsRow: HTMLElement = div({ class: "selectRow" }, span({ class: "tip", onclick: () => this._openPrompt("harmonics") }, "Harmonics:"), this._harmonicsEditor.container);
	private readonly _drumsetGroup: HTMLElement = div({ class: "editor-controls" });
	private readonly _modulatorGroup: HTMLElement = div({ class: "editor-controls" });
	private readonly _modNameRows: HTMLElement[];
	private readonly _modChannelBoxes: HTMLSelectElement[];
	private readonly _modInstrumentBoxes: HTMLSelectElement[];
	private readonly _modSetRows: HTMLElement[];
	private readonly _modSetBoxes: HTMLSelectElement[];

	private readonly _instrumentCopyButton: HTMLButtonElement = button({ style: "max-width:86px;", class: "copyButton" }, [
		"Copy",
		// Copy icon:
		SVG.svg({ style: "flex-shrink: 0; position: absolute; left: 0; top: 50%; margin-top: -1em; pointer-events: none;", width: "2em", height: "2em", viewBox: "-5 -21 26 26" }, [
			SVG.path({ d: "M 0 -15 L 1 -15 L 1 0 L 13 0 L 13 1 L 0 1 L 0 -15 z M 2 -1 L 2 -17 L 10 -17 L 14 -13 L 14 -1 z M 3 -2 L 13 -2 L 13 -12 L 9 -12 L 9 -16 L 3 -16 z", fill: "currentColor" }),
		]),
	]);
	private readonly _instrumentPasteButton: HTMLButtonElement = button({ style: "max-width:86px;", class: "pasteButton" }, [
		"Paste",
		// Paste icon:
		SVG.svg({ style: "flex-shrink: 0; position: absolute; left: 0; top: 50%; margin-top: -1em; pointer-events: none;", width: "2em", height: "2em", viewBox: "0 0 26 26" }, [
			SVG.path({ d: "M 8 18 L 6 18 L 6 5 L 17 5 L 17 7 M 9 8 L 16 8 L 20 12 L 20 22 L 9 22 z", stroke: "currentColor", fill: "none" }),
			SVG.path({ d: "M 9 3 L 14 3 L 14 6 L 9 6 L 9 3 z M 16 8 L 20 12 L 16 12 L 16 8 z", fill: "currentColor", }),
		]),
	]);

	private readonly _customWaveDrawCanvas: CustomChipCanvas = new CustomChipCanvas(canvas({ width: 128, height: 52, style: "border:2px solid " + ColorConfig.uiWidgetBackground, id: "customWaveDrawCanvas" }), this._doc, (newArray: Float64Array) => new ChangeCustomWave(this._doc, newArray));
	private readonly _customWavePresetDrop: HTMLSelectElement = buildHeaderedOptions("Load Preset", select({ style: "width: 50%; height:1.5em; text-align: center; text-align-last: center;" }),
		Config.chipWaves.map(wave => wave.name)
	);
	private readonly _customWaveZoom: HTMLButtonElement = button({ style: "margin-left:0.5em; height:1.5em; max-width: 20px;", onclick: () => this._openPrompt("customChipSettings") }, "+");

	private readonly _customWaveDraw: HTMLDivElement = div({ style: "height:80px; margin-top:10px; margin-bottom:5px" }, [
		div({ style: "height:54px; display:flex; justify-content:center;" }, [this._customWaveDrawCanvas.canvas]),
		div({ style: "margin-top:5px; display:flex; justify-content:center;" }, [this._customWavePresetDrop, this._customWaveZoom]),
	]);

	private readonly _songTitleInputBox: InputBox = new InputBox(input({ style: "font-weight:bold; border:none; width: 100%; background-color:${ColorConfig.editorBackground}; color:${ColorConfig.primaryText}; text-align:center", maxlength: "30", type: "text", value: EditorConfig.versionDisplayName }), this._doc, (oldValue: string, newValue: string) => new ChangeSongTitle(this._doc, oldValue, newValue));


	private readonly _feedbackAmplitudeSlider: Slider = new Slider(input({ style: "margin: 0; width: 4em;", type: "range", min: "0", max: Config.operatorAmplitudeMax, value: "0", step: "1", title: "Feedback Amplitude" }), this._doc, (oldValue: number, newValue: number) => new ChangeFeedbackAmplitude(this._doc, oldValue, newValue), false);
	private readonly _feedbackEnvelopeSelect: HTMLSelectElement = buildOptions(select({ style: "width: 100%;", title: "Feedback Envelope" }), Config.envelopes.map(envelope => envelope.name));
	private readonly _feedbackRow2: HTMLDivElement = div({ class: "operatorRow" },
		div({ style: "margin-right: .1em; visibility: hidden;" }, 1 + "."),
		div({ style: "width: 3em; margin-right: .3em;" }),
		this._feedbackAmplitudeSlider.container,
		div({ class: "selectContainer", style: "width: 5em; margin-left: .3em;" }, this._feedbackEnvelopeSelect),
	);
	/*
			* @jummbus - my very real, valid reason for cutting this button: I don't like it.
			* 
	private readonly _customizeInstrumentButton: HTMLButtonElement = button({type: "button", style: "margin: 2px 0"},

		"Customize Instrument",
	);
		*/
	private readonly _customInstrumentSettingsGroup: HTMLDivElement = div({ class: "editor-controls" },
		this._chipWaveSelectRow,
		this._chipNoiseSelectRow,
		this._detuneSliderRow,
		this._customWaveDraw,
		this._filterCutoffRow,
		this._filterResonanceRow,
		this._filterEnvelopeRow,
		this._transitionRow,
		this._transitionDropdownGroup,

		div({ class: "selectRow" },
			span({ class: "tip", onclick: () => this._openPrompt("effects") }, "Effects:"),
			div({ class: "selectContainer" }, this._effectsSelect),
		),
		this._chordSelectRow,
		this._chordDropdownGroup,
		this._vibratoSelectRow,
		this._vibratoDropdownGroup,
		this._intervalSelectRow,
		this._algorithmSelectRow,
		this._phaseModGroup,
		this._feedbackRow1,
		this._feedbackRow2,
		this._spectrumRow,
		this._harmonicsRow,
		this._drumsetGroup,
		this._pulseEnvelopeRow,
		this._pulseWidthRow,
	);
	private readonly _instrumentCopyGroup: HTMLDivElement = div({ class: "editor-controls" },
		div({ class: "selectRow" },
			this._instrumentCopyButton,
			this._instrumentPasteButton,
		),
	);
	private readonly _instrumentSettingsTextRow: HTMLDivElement = div({ id: "instrumentSettingsText", style: `margin: 3px 0; max-width: 15em; text-align: center; color: ${ColorConfig.secondaryText};` },
		"Instrument Settings"
	);
	private readonly _instrumentSettingsGroup: HTMLDivElement = div({ class: "editor-controls" },
		this._instrumentSettingsTextRow,
		this._instrumentSelectRow,
		div({ class: "selectRow", id: "typeSelectRow" },
			span({ class: "tip", onclick: () => this._openPrompt("instrumentType") }, "Type: "),
			div(
				div({ class: "pitchSelect" }, this._pitchedPresetSelect),
				div({ class: "drumSelect" }, this._drumPresetSelect)
			),
		),
		this._instrumentVolumeSliderRow,
		this._panSliderRow,
		this._panDropdownGroup,
		//this._customizeInstrumentButton,
		this._customInstrumentSettingsGroup,
	);
	private readonly _usedPatternIndicator: SVGElement = SVG.path({ d: "M -6 -6 H 6 V 6 H -6 V -6 M -2 -3 L -2 -3 L -1 -4 H 1 V 4 H -1 V -1.2 L -1.2 -1 H -2 V -3 z", fill: ColorConfig.indicatorSecondary, "fill-rule": "evenodd" });
	private readonly _usedInstrumentIndicator: SVGElement = SVG.path({ d: "M -6 -0.8 H -3.8 V -6 H 0.8 V 4.4 H 2.2 V -0.8 H 6 V 0.8 H 3.8 V 6 H -0.8 V -4.4 H -2.2 V 0.8 H -6 z", fill: ColorConfig.indicatorSecondary });

	private readonly _promptContainer: HTMLDivElement = div({ class: "promptContainer", style: "display: none;" });
	private readonly _patternEditorRow: HTMLDivElement = div({ style: "flex: 1; height: 100%; display: flex; overflow: hidden; justify-content: center;" },
		this._patternEditorPrev.container,
		this._patternEditor.container,
		this._patternEditorNext.container,
	);
	private readonly _patternArea: HTMLDivElement = div({ class: "pattern-area" },
		this._piano.container,
		this._patternEditorRow,
		this._octaveScrollBar.container,
	);
	private readonly _trackContainer: HTMLDivElement = div({ class: "trackContainer" },
		this._trackEditor.container,
		this._loopEditor.container,
	);
	private readonly _trackAndMuteContainer: HTMLDivElement = div({ class: "trackAndMuteContainer" },
		this._muteEditor.container,
		this._trackContainer,
	);
	public readonly _barScrollBar: BarScrollBar = new BarScrollBar(this._doc, this._trackContainer);
	private readonly _trackArea: HTMLDivElement = div({ class: "track-area" },
		this._trackAndMuteContainer,
		this._barScrollBar.container,
	);

	public readonly _settingsArea: HTMLDivElement = div({ class: "settings-area noSelection" },
		div({ class: "version-area" },
			div({ style: "text-align: center; color: ${ColorConfig.secondaryText};" }, [this._songTitleInputBox.input]),
		),
		div({ class: "play-pause-area" },
			this._volumeBarBox,
			div({ class: "playback-bar-controls" },
				this._playButton,
				this._prevBarButton,
				this._nextBarButton,
			),
			div({ class: "playback-volume-controls" },
				span({ class: "volume-speaker" }),
				this._volumeSlider.container,
			),
		),
		div({ class: "menu-area" },
			div({ class: "selectContainer menu file" },
				this._fileMenu,
			),
			div({ class: "selectContainer menu edit" },
				this._editMenu,
			),
			div({ class: "selectContainer menu preferences" },
				this._optionsMenu,
			),
		),
		div({ class: "song-settings-area" },
			div({ class: "editor-controls" },
				div({ class: "editor-song-settings" },
					div({ style: "margin: 3px 0; position: relative; text-align: center; color: ${ColorConfig.secondaryText};" },
						div({ class: "tip", style: "flex-shrink: 0; position:absolute; left: 0; top: 0; width: 12px; height: 12px", onclick: () => this._openPrompt("usedPattern") },
							SVG.svg({ style: "flex-shrink: 0; position: absolute; left: 0; top: 0; pointer-events: none;", width: "12px", height: "12px", "margin-right": "0.5em", viewBox: "-6 -6 12 12" },
								this._usedPatternIndicator,
							),
						),
						div({ class: "tip", style: "flex-shrink: 0; position: absolute; left: 14px; top: 0; width: 12px; height: 12px", onclick: () => this._openPrompt("usedInstrument") },
							SVG.svg({ style: "flex-shrink: 0; position: absolute; left: 0; top: 0; pointer-events: none;", width: "12px", height: "12px", "margin-right": "1em", viewBox: "-6 -6 12 12" },
								this._usedInstrumentIndicator,
							),
						),
						"Song Settings"
					),
				),
				div({ class: "selectRow" },
					span({ class: "tip", onclick: () => this._openPrompt("scale") }, "Scale: "),
					div({ class: "selectContainer" }, this._scaleSelect),
				),
				div({ class: "selectRow" },
					span({ class: "tip", onclick: () => this._openPrompt("key") }, "Key: "),
					div({ class: "selectContainer" }, this._keySelect),
				),
				div({ class: "selectRow" },
					span({ class: "tip", onclick: () => this._openPrompt("tempo") }, "Tempo: "),
					span({ style: "display: flex;" },
						this._tempoSlider.container,
						this._tempoStepper,
					),
				),
				div({ class: "selectRow" },
					span({ class: "tip", onclick: () => this._openPrompt("reverb") }, "Reverb: "),
					this._reverbSlider.container,
				),
				div({ class: "selectRow" },
					span({ class: "tip", onclick: () => this._openPrompt("rhythm") }, "Rhythm: "),
					div({ class: "selectContainer" }, this._rhythmSelect),
				),
			),
		),
		div({ class: "instrument-settings-area" },
			this._instrumentSettingsGroup,
			this._modulatorGroup,
		),
	);

	public readonly mainLayer: HTMLDivElement = div({ class: "beepboxEditor", tabIndex: "0" },
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
	private _showModSliders: boolean[] = [];
	private _newShowModSliders: boolean[] = [];
	private _modSliderValues: number[] = [];
	private _hasActiveModSliders: boolean = false;
	private _modSliderHandle: number = 0;
	private _volumeHandle: number = 0;
	private _barScrollbarHandle: number = 0;

	private _openPanDropdown: boolean = false;
	private _openVibratoDropdown: boolean = false;
	private _openChordDropdown: boolean = false;
	private _openTransitionDropdown: boolean = false;

	private outVolumeHistoricTimer: number = 0;
	private outVolumeHistoricCap: number = 0;
	private lastOutVolumeCap: number = 0;

	constructor(private _doc: SongDocument) {
		this._doc.notifier.watch(this.whenUpdated);
		window.addEventListener("resize", this.whenUpdated);

		if (!("share" in navigator)) {
			this._fileMenu.removeChild(this._fileMenu.querySelector("[value='shareUrl']")!);
		}

		this._scaleSelect.appendChild(optgroup({ label: "Edit" },
			option({ value: "forceScale" }, "Snap Notes To Scale"),
		));
		this._keySelect.appendChild(optgroup({ label: "Edit" },
			option({ value: "detectKey" }, "Detect Key"),
		));
		this._rhythmSelect.appendChild(optgroup({ label: "Edit" },
			option({ value: "forceRhythm" }, "Snap Notes To Rhythm"),
		));

		this._vibratoSelect.appendChild(option({ hidden: true, value: 5 }, "custom"));


		this._showModSliders = new Array<boolean>(ModSetting.mstMaxValue);
		this._modSliderValues = new Array<number>(ModSetting.mstMaxValue);

		this._phaseModGroup.appendChild(div({ class: "operatorRow", style: "color: ${ColorConfig.secondaryText}; height: 1em; margin-top: 0.5em;" },
			div({ style: "margin-right: .1em; visibility: hidden;" }, 1 + "."),
			div({ style: "width: 3em; margin-right: .3em;", class: "tip", onclick: () => this._openPrompt("operatorFrequency") }, "Freq:"),
			div({ style: "width: 4em; margin: 0;", class: "tip", onclick: () => this._openPrompt("operatorVolume") }, "Volume:"),
			div({ style: "width: 5em; margin-left: .3em;", class: "tip", onclick: () => this._openPrompt("operatorEnvelope") }, "Envelope:"),
		));
		for (let i: number = 0; i < Config.operatorCount; i++) {
			const operatorIndex: number = i;
			const operatorNumber: HTMLDivElement = div({ style: "margin-right: .1em; color: " + ColorConfig.secondaryText + ";" }, i + 1 + ".");
			const frequencySelect: HTMLSelectElement = buildOptions(select({ style: "width: 100%;", title: "Frequency" }), Config.operatorFrequencies.map(freq => freq.name));
			const amplitudeSlider: Slider = new Slider(input({ style: "margin: 0; width: 4em;", type: "range", min: "0", max: Config.operatorAmplitudeMax, value: "0", step: "1", title: "Volume" }), this._doc, (oldValue: number, newValue: number) => new ChangeOperatorAmplitude(this._doc, operatorIndex, oldValue, newValue), false);
			const envelopeSelect: HTMLSelectElement = buildOptions(select({ style: "width: 100%;", title: "Envelope" }), Config.envelopes.map(envelope => envelope.name));
			const row: HTMLDivElement = div({ class: "operatorRow" },
				operatorNumber,
				div({ class: "selectContainer", style: "width: 3em; margin-right: .3em;" }, frequencySelect),
				amplitudeSlider.container,
				div({ class: "selectContainer", style: "width: 5em; margin-left: .3em;" }, envelopeSelect),
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
			div({ class: "selectRow" },
				span({ class: "tip", onclick: () => this._openPrompt("drumsetEnvelope") }, "Envelope:"),
				span({ class: "tip", onclick: () => this._openPrompt("drumsetSpectrum") }, "Spectrum:"),
			),
		);
		for (let i: number = Config.drumCount - 1; i >= 0; i--) {
			const drumIndex: number = i;
			const spectrumEditor: SpectrumEditor = new SpectrumEditor(this._doc, drumIndex);
			spectrumEditor.container.addEventListener("mousedown", this.refocusStage);
			this._drumsetSpectrumEditors[i] = spectrumEditor;

			const envelopeSelect: HTMLSelectElement = buildOptions(select({ style: "width: 100%;", title: "Filter Envelope" }), Config.envelopes.map(envelope => envelope.name));
			this._drumsetEnvelopeSelects[i] = envelopeSelect;
			envelopeSelect.addEventListener("change", () => {
				this._doc.record(new ChangeDrumsetEnvelope(this._doc, drumIndex, envelopeSelect.selectedIndex));
			});

			const row: HTMLDivElement = div({ class: "selectRow" },
				div({ class: "selectContainer", style: "width: 5em; margin-right: .3em;" }, envelopeSelect),
				this._drumsetSpectrumEditors[i].container,
			);
			this._drumsetGroup.appendChild(row);
		}

		this._modNameRows = [];
		this._modChannelBoxes = [];
		this._modInstrumentBoxes = [];
		this._modSetRows = [];
		this._modSetBoxes = [];
		for (let mod: number = 0; mod < Config.modCount; mod++) {

			let modChannelBox: HTMLSelectElement = select({ style: "width: 100%; color: currentColor; text-overflow:ellipsis;" });
			let modInstrumentBox: HTMLSelectElement = select({ style: "width: 100%; color: currentColor;" });

			let modNameRow: HTMLDivElement = div({ class: "operatorRow", style: "height: 1em; margin-bottom: 0.65em;" },
				div({ class: "tip", style: "width: 1em; max-width: 5.4em; min-width: 5.4em;", id: "modChannelText" + mod, onclick: () => this._openPrompt("modChannel") }, "Ch:"),
				div({ class: "selectContainer" }, modChannelBox),
				div({ class: "tip", style: "width: 1.2em; margin-left: 0.8em;", id: "modInstrumentText" + mod, onclick: () => this._openPrompt("modInstrument") }, "Ins:"),
				div({ class: "selectContainer" }, modInstrumentBox),
			);

			let modSetBox: HTMLSelectElement = select();
			let modSetRow: HTMLDivElement = div({ class: "selectRow", id: "modSettingText" + mod, style: "margin-bottom: 0.9em; color: currentColor;" }, span({ class: "tip", onclick: () => this._openPrompt("modSet") }, "Setting: "), div({ class: "selectContainer" }, modSetBox));

			this._modNameRows.push(modNameRow);
			this._modChannelBoxes.push(modChannelBox);
			this._modInstrumentBoxes.push(modInstrumentBox);
			this._modSetRows.push(modSetRow);
			this._modSetBoxes.push(modSetBox);

			this._modulatorGroup.appendChild(div({ style: "margin: 3px 0; font-weight: bold; margin-bottom: 0.7em; text-align: center; color: " + ColorConfig.secondaryText + "; background: " + ColorConfig.uiWidgetBackground + ";" }, "Modulator " + (mod + 1)));
			this._modulatorGroup.appendChild(modNameRow);
			this._modulatorGroup.appendChild(modSetRow);

		}

		this._fileMenu.addEventListener("change", this._fileMenuHandler);
		this._editMenu.addEventListener("change", this._editMenuHandler);
		this._optionsMenu.addEventListener("change", this._optionsMenuHandler);
		this._customWavePresetDrop.addEventListener("change", this._customWavePresetHandler);
		this._tempoStepper.addEventListener("change", this._whenSetTempo);
		this._scaleSelect.addEventListener("change", this._whenSetScale);
		this._keySelect.addEventListener("change", this._whenSetKey);
		this._rhythmSelect.addEventListener("change", this._whenSetRhythm);
		//this._pitchedPresetSelect.addEventListener("change", this._whenSetPitchedPreset);
		//this._drumPresetSelect.addEventListener("change", this._whenSetDrumPreset);
		this._algorithmSelect.addEventListener("change", this._whenSetAlgorithm);
		this._instrumentSelect.addEventListener("change", this._whenSetInstrument);
		//this._customizeInstrumentButton.addEventListener("click", this._whenCustomizePressed);
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
		this._vibratoTypeSelect.addEventListener("change", this._whenSetVibratoType);
		this._playButton.addEventListener("click", this._togglePlay);
		this._prevBarButton.addEventListener("click", this._whenPrevBarPressed);
		this._nextBarButton.addEventListener("click", this._whenNextBarPressed);
		this._volumeSlider.input.addEventListener("input", this._setVolumeSlider);
		this._patternArea.addEventListener("mousedown", this._refocusStageNotEditing);
		this._trackArea.addEventListener("mousedown", this.refocusStage);

		// The song volume slider is styled slightly different than the class' default.
		this._volumeSlider.container.style.setProperty("flex-grow", "1");
		this._volumeSlider.container.style.setProperty("display", "flex");

		this._volumeBarContainer.style.setProperty("flex-grow", "1");
		this._volumeBarContainer.style.setProperty("display", "flex");

		// Also, any slider with a multiplicative effect instead of a replacement effect gets a different mod color, and a round slider.
		this._volumeSlider.container.style.setProperty("--mod-color", ColorConfig.multiplicativeModSlider);
		this._volumeSlider.container.style.setProperty("--mod-border-radius", "50%");
		this._instrumentVolumeSlider.container.style.setProperty("--mod-color", ColorConfig.multiplicativeModSlider);
		this._instrumentVolumeSlider.container.style.setProperty("--mod-border-radius", "50%");
		this._feedbackAmplitudeSlider.container.style.setProperty("--mod-color", ColorConfig.multiplicativeModSlider);
		this._feedbackAmplitudeSlider.container.style.setProperty("--mod-border-radius", "50%");
		for (let i: number = 0; i < Config.operatorCount; i++) {
			this._operatorAmplitudeSliders[i].container.style.setProperty("--mod-color", ColorConfig.multiplicativeModSlider);
			this._operatorAmplitudeSliders[i].container.style.setProperty("--mod-border-radius", "50%");
		}


		for (let mod: number = 0; mod < Config.modCount; mod++) {
			let thisRef: SongEditor = this;
			this._modChannelBoxes[mod].addEventListener("change", function () { thisRef._whenSetModChannel(mod); });
			this._modInstrumentBoxes[mod].addEventListener("change", function () { thisRef._whenSetModInstrument(mod); });
			this._modSetBoxes[mod].addEventListener("change", function () { thisRef._whenSetModSetting(mod); });
		}

		this._patternArea.addEventListener("mousedown", this.refocusStage);
		this._spectrumEditor.container.addEventListener("mousedown", this.refocusStage);
		this._harmonicsEditor.container.addEventListener("mousedown", this.refocusStage);
		this._tempoStepper.addEventListener("keydown", this._tempoStepperCaptureNumberKeys, false);
		this.mainLayer.addEventListener("keydown", this._whenKeyPressed);
		this.mainLayer.addEventListener("keyup", this._whenKeyUp);
		this._instrumentCopyButton.addEventListener("click", this._copyInstrument.bind(this));
		this._instrumentPasteButton.addEventListener("click", this._pasteInstrument.bind(this));

		this._instrumentVolumeSliderInputBox.addEventListener("input", () => { this._doc.record(new ChangeVolume(this._doc, this._doc.song.channels[this._doc.channel].instruments[this._doc.getCurrentInstrument()].volume, Math.min(25.0, Math.max(-25.0, Math.round(+this._instrumentVolumeSliderInputBox.value))))) });
		this._panSliderInputBox.addEventListener("input", () => { this._doc.record(new ChangePan(this._doc, this._doc.song.channels[this._doc.channel].instruments[this._doc.getCurrentInstrument()].pan, Math.min(100.0, Math.max(0.0, Math.round(+this._panSliderInputBox.value))))) });
		this._detuneSliderInputBox.addEventListener("input", () => { this._doc.record(new ChangeDetune(this._doc, this._doc.song.channels[this._doc.channel].instruments[this._doc.getCurrentInstrument()].detune, Math.min(Config.detuneMax, Math.max(Config.detuneMin, Math.round(+this._detuneSliderInputBox.value))))) });
		this._customWaveDraw.addEventListener("input", () => { this._doc.record(new ChangeCustomWave(this._doc, this._customWaveDrawCanvas.newArray)) });
		this._twoNoteArpBox.addEventListener("input", () => { this._doc.record(new ChangeFastTwoNoteArp(this._doc, this._twoNoteArpBox.checked)) });
		this._tieNoteTransitionBox.addEventListener("input", () => { this._doc.record(new ChangeTieNoteTransition(this._doc, this._tieNoteTransitionBox.checked)) });
		this._clicklessTransitionBox.addEventListener("input", () => { this._doc.record(new ChangeClicklessTransition(this._doc, this._clicklessTransitionBox.checked)) });

		this._promptContainer.addEventListener("click", (event) => {
			if (event.target == this._promptContainer) {
				this._doc.undo();
			}
		});

		if (isMobile) {
			const autoPlayOption: HTMLOptionElement = <HTMLOptionElement>this._optionsMenu.querySelector("[value=autoPlay]");
			autoPlayOption.disabled = true;
			autoPlayOption.setAttribute("hidden", "");
		}

		// Beepbox uses availHeight too, but I have a display that fails the check even when one of the other layouts would look better on it. -jummbus
		if (window.screen.availWidth < 700 /*|| window.screen.availHeight < 700*/) {
			const fullScreenOption: HTMLOptionElement = <HTMLOptionElement>this._optionsMenu.querySelector("[value=fullScreen]");
			fullScreenOption.disabled = true;
			fullScreenOption.setAttribute("hidden", "");
		}
	}

	private _toggleDropdownMenu(dropdown: number): void {
		let target: HTMLButtonElement = this._vibratoDropdown;
		let group: HTMLElement = this._vibratoDropdownGroup;
		switch (dropdown) {
			case 0:
				target = this._vibratoDropdown;
				this._openVibratoDropdown = this._openVibratoDropdown ? false : true;
				group = this._vibratoDropdownGroup;
				break;
			case 1:
				target = this._panDropdown;
				this._openPanDropdown = this._openPanDropdown ? false : true;
				group = this._panDropdownGroup;
				break;
			case 2:
				target = this._chordDropdown;
				this._openChordDropdown = this._openChordDropdown ? false : true;
				group = this._chordDropdownGroup;
				break;
			case 3:
				target = this._transitionDropdown;
				this._openTransitionDropdown = this._openTransitionDropdown ? false : true;
				group = this._transitionDropdownGroup;
		}

		if (target.textContent == "▼") {
			target.textContent = "▲";
			if (group != this._chordDropdownGroup) {
				group.style.display = "";
			} // Only show arpeggio dropdown if chord arpeggiates
			else if (this._doc.song.channels[this._doc.channel].instruments[this._doc.getCurrentInstrument()].chord == 2) {
				group.style.display = "";
			}
		}
		else {
			target.textContent = "▼";
			group.style.display = "none";
		}
	}

	private _modSliderUpdate(): void {

		if (!this._doc.synth.playing) {
			this._hasActiveModSliders = false;

			for (let setting: number = 0; setting < ModSetting.mstMaxValue; setting++) {
				if (this._showModSliders[setting] == true) {
					this._showModSliders[setting] = false;
					this._newShowModSliders[setting] = false;
					let slider: Slider | null = this._getSliderForModSetting(setting);

					if (slider != null) {

						slider.container.classList.remove("modSlider");

					}
				}
			}
		}
		else {

			let instrument: number = this._doc.getCurrentInstrument();
			const anyModActive: boolean = this._doc.synth.isAnyModActive(this._doc.channel, instrument);

			// Check and update mod values on sliders
			if (anyModActive) {

				let instrument: number = this._doc.getCurrentInstrument();

				function updateModSlider(editor: SongEditor, slider: Slider, setting: ModSetting, channel: number, instrument: number): boolean {
					const forSong: boolean = editor._doc.synth.song!.isSettingForSong(setting);
					if (editor._doc.synth.isModActive(setting, forSong, channel, instrument)) {
						let currentVal: number = editor._doc.synth.song!.realToModValue(editor._doc.synth.getModValue(setting, forSong, channel, instrument, false), setting) / editor._doc.song.mstMaxVols.get(setting)!;
						if (currentVal != editor._modSliderValues[setting]) {
							editor._modSliderValues[setting] = currentVal;
							slider.container.style.setProperty("--mod-position", (currentVal * 96.0 + 2.0) + "%");
						}
						return true;
					}
					return false;
				}

				// Set mod sliders to present values
				for (let setting: number = 0; setting < ModSetting.mstMaxValue; setting++) {
					// Set to last value
					this._newShowModSliders[setting] = this._showModSliders[setting];

					// Check for newer value
					let slider: Slider | null = this._getSliderForModSetting(setting);
					if (slider != null) {
						this._newShowModSliders[setting] = updateModSlider(this, slider, setting, this._doc.channel, instrument);
					}
				}

			}
			else if (this._hasActiveModSliders) {
				// Zero out show-mod-slider settings (since none are active) to kill active mod slider flag
				for (let setting: number = 0; setting < ModSetting.mstMaxValue; setting++) {
					this._newShowModSliders[setting] = false;
				}
			}

			// Class or unclass mod sliders based on present status
			if (anyModActive || this._hasActiveModSliders) {

				let anySliderActive: boolean = false;

				for (let setting: number = 0; setting < ModSetting.mstMaxValue; setting++) {
					if (this._newShowModSliders[setting] != this._showModSliders[setting]) {
						this._showModSliders[setting] = this._newShowModSliders[setting];
						let slider: Slider | null = this._getSliderForModSetting(setting);

						if (slider != null) {

							if (this._showModSliders[setting] == true) {
								slider.container.classList.add("modSlider");
							}
							else {
								slider.container.classList.remove("modSlider");
							}

						}
					}

					if (this._newShowModSliders[setting] == true)
						anySliderActive = true;
				}

				this._hasActiveModSliders = anySliderActive;

			}

		}

	}

	private _getSliderForModSetting(setting: ModSetting): Slider | null {
		switch (setting) {
			case ModSetting.mstPan:
				return this._panSlider;
			case ModSetting.mstDetune:
				return this._detuneSlider;
			case ModSetting.mstFMSlider1:
				return this._operatorAmplitudeSliders[0];
			case ModSetting.mstFMSlider2:
				return this._operatorAmplitudeSliders[1];
			case ModSetting.mstFMSlider3:
				return this._operatorAmplitudeSliders[2];
			case ModSetting.mstFMSlider4:
				return this._operatorAmplitudeSliders[3];
			case ModSetting.mstFMFeedback:
				return this._feedbackAmplitudeSlider;
			case ModSetting.mstPulseWidth:
				return this._pulseWidthSlider;
			case ModSetting.mstFilterPeak:
				return this._filterResonanceSlider;
			case ModSetting.mstFilterCut:
				return this._filterCutoffSlider;
			case ModSetting.mstInsVolume:
				return this._instrumentVolumeSlider;
			case ModSetting.mstVibratoDepth:
				return this._vibratoDepthSlider;
			case ModSetting.mstVibratoSpeed:
				return this._vibratoSpeedSlider;
			case ModSetting.mstVibratoDelay:
				return this._vibratoDelaySlider;
			case ModSetting.mstArpeggioSpeed:
				return this._arpeggioSpeedSlider;
			case ModSetting.mstPanDelay:
				return this._panDelaySlider;
			case ModSetting.mstTempo:
				return this._tempoSlider;
			case ModSetting.mstReverb:
				return this._reverbSlider;
			case ModSetting.mstSongVolume:
				return this._volumeSlider;
			default:
				return null;
		}

	}

	public changeInstrument(index: number): void {
		this._instrumentSelect.selectedIndex = index;
		this._whenSetInstrument();
	}

	private _openPrompt(promptName: string): void {
		this._doc.openPrompt(promptName);
		this._setPrompt(promptName);
	}

	private _setPrompt(promptName: string | null): void {
		if (this._currentPromptName == promptName) return;
		this._currentPromptName = promptName;

		if (this.prompt) {
			if (this._wasPlaying && !(this.prompt instanceof TipPrompt || this.prompt instanceof LimiterPrompt || this.prompt instanceof CustomChipPrompt)) {
				this._play();
			}
			this._wasPlaying = false;
			this._promptContainer.style.display = "none";
			this._promptContainer.removeChild(this.prompt.container);
			this.prompt.cleanUp();
			this.prompt = null;
			this.refocusStage();
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
				case "limiterSettings":
					this.prompt = new LimiterPrompt(this._doc, this);
					break;
				case "customChipSettings":
					this.prompt = new CustomChipPrompt(this._doc, this);
					break;
				case "theme":
					this.prompt = new ThemePrompt(this._doc);
					break;
				case "layout":
					this.prompt = new LayoutPrompt(this._doc);
					break;
				default:
					this.prompt = new TipPrompt(this._doc, promptName);
					break;
			}

			if (this.prompt) {
				if (!(this.prompt instanceof TipPrompt || this.prompt instanceof LimiterPrompt || this.prompt instanceof CustomChipPrompt)) {
					this._wasPlaying = this._doc.synth.playing;
					this._pause();
				}
				this._promptContainer.style.display = "";
				this._promptContainer.appendChild(this.prompt.container);
			}
		}
	}

	public refocusStage = (): void => {
		this.mainLayer.focus({ preventScroll: true });
	}

	// Refocus stage if a sub-element that needs focus isn't being edited.
	private _refocusStageNotEditing = (): void => {
		if (!this._patternEditor.editingModLabel)
			this.mainLayer.focus({ preventScroll: true });
	}

	public changeBarScrollPos(offset: number) {
		this._barScrollBar.changePos(offset);
	}

	public whenUpdated = (): void => {
		this._muteEditor.container.style.display = this._doc.enableChannelMuting ? "" : "none";
		const trackBounds = this._trackContainer.getBoundingClientRect();
		this._doc.trackVisibleBars = Math.floor((trackBounds.right - trackBounds.left) / this._doc.getBarWidth());
		this._barScrollBar.render();
		this._muteEditor.render();
		this._trackEditor.render();

		if (document.activeElement != this._patternEditor.modDragValueLabel && this._patternEditor.editingModLabel) {
			this._patternEditor.stopEditingModLabel(false);
		}

		this._piano.container.style.display = this._doc.showLetters ? "" : "none";
		this._octaveScrollBar.container.style.display = this._doc.showScrollBar ? "" : "none";
		this._barScrollBar.container.style.display = this._doc.song.barCount > this._doc.trackVisibleBars ? "" : "none";
		this._volumeBarBox.style.display = this._doc.displayVolumeBar ? "" : "none";

		if (this._doc.getFullScreen()) {
			const semitoneHeight: number = this._patternEditorRow.clientHeight / this._doc.windowPitchCount;
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
			(this._doc.autoPlay ? "✓ " : "") + "Auto Play On Load",
			(this._doc.autoFollow ? "✓ " : "") + "Auto Follow Track",
			(this._doc.enableNotePreview ? "✓ " : "") + "Preview Added Notes",
			(this._doc.showLetters ? "✓ " : "") + "Show Piano Keys",
			(this._doc.showFifth ? "✓ " : "") + 'Highlight "Fifth" Notes',
			(this._doc.showChannels ? "✓ " : "") + "Show All Channels",
			(this._doc.showScrollBar ? "✓ " : "") + "Octave Scroll Bar",
			(this._doc.alwaysFineNoteVol ? "✓ " : "") + "Always Fine Note Vol.",
			(this._doc.enableChannelMuting ? "✓ " : "") + "Enable Channel Muting",
			(this._doc.displayBrowserUrl ? "✓ " : "") + "Display Song Data in URL",
			(this._doc.displayVolumeBar ? "✓ " : "") + "Show Playback Volume",
			"Set Layout...",
			"Set Theme...",
			//(this._doc.alwaysShowSettings ? "✓ " : "") + "Customize All Instruments",
		]
		for (let i: number = 0; i < optionCommands.length; i++) {
			const option: HTMLOptionElement = <HTMLOptionElement>this._optionsMenu.children[i + 1];
			if (option.innerText != optionCommands[i]) option.innerText = optionCommands[i];
		}

		const channel: Channel = this._doc.song.channels[this._doc.channel];
		const pattern: Pattern | null = this._doc.getCurrentPattern();
		const instrumentIndex: number = this._doc.getCurrentInstrument();
		const instrument: Instrument = channel.instruments[instrumentIndex];
		const wasActive: boolean = this.mainLayer.contains(document.activeElement);
		const activeElement: Element | null = document.activeElement;

		setSelectedValue(this._scaleSelect, this._doc.song.scale);
		this._scaleSelect.title = Config.scales[this._doc.song.scale].realName;
		setSelectedValue(this._keySelect, Config.keys.length - 1 - this._doc.song.key);
		this._tempoSlider.updateValue(Math.max(0, Math.round(this._doc.song.tempo)));
		this._tempoStepper.value = Math.round(this._doc.song.tempo).toString();
		this._songTitleInputBox.updateValue(this._doc.song.title);
		this._reverbSlider.updateValue(this._doc.song.reverb);

		setSelectedValue(this._rhythmSelect, this._doc.song.rhythm);

		if (!this._doc.song.getChannelIsMod(this._doc.channel)) {

			this._customInstrumentSettingsGroup.style.display = "";
			this._panSliderRow.style.display = "";
			this._panDropdownGroup.style.display = (this._openPanDropdown ? "" : "none");
			this._detuneSliderRow.style.display = "";
			this._instrumentVolumeSliderRow.style.display = "";
			$("#typeSelectRow").css("display", "");
			this._instrumentSettingsGroup.appendChild(this._instrumentCopyGroup);
			this._instrumentSettingsGroup.insertBefore(this._instrumentSelectRow, this._instrumentSettingsGroup.firstChild);
			this._instrumentSettingsGroup.insertBefore(this._instrumentSettingsTextRow, this._instrumentSettingsGroup.firstChild);

			if (this._doc.song.channels[this._doc.channel].name == "") {
				this._instrumentSettingsTextRow.textContent = "Instrument Settings";
			}
			else {
				this._instrumentSettingsTextRow.textContent = this._doc.song.channels[this._doc.channel].name;
			}

			this._modulatorGroup.style.display = "none";

			// Check if current viewed pattern on channel is used anywhere
			// + Check if current instrument on channel is used anywhere
			var instrumentUsed = false;
			var patternUsed = false;

			if (channel.bars[this._doc.bar] != 0) {

				let lowestSelX: number = Math.min(this._doc.selection.boxSelectionX0, this._doc.selection.boxSelectionX1);
				let highestSelX: number = Math.max(this._doc.selection.boxSelectionX0, this._doc.selection.boxSelectionX1);
				let lowestSelY: number = Math.min(this._doc.selection.boxSelectionY0, this._doc.selection.boxSelectionY1);
				let highestSelY: number = Math.max(this._doc.selection.boxSelectionY0, this._doc.selection.boxSelectionY1);

				for (let i: number = 0; i < this._doc.song.barCount; i++) {
					// Check for this exact bar in another place, but only count it if it's not within the selection
					if (channel.bars[i] == channel.bars[this._doc.bar] && i != this._doc.bar &&
						(i < lowestSelX || i > highestSelX || this._doc.channel < lowestSelY || this._doc.channel > highestSelY)) {

						patternUsed = true;
						i = this._doc.song.barCount;
					}
				}

				for (let i: number = 0; i < this._doc.song.barCount; i++) {
					// Check for this exact instrument in another place, but only count it if it's not within the selection
					if (channel.bars[i] != 0 && this._doc.song.getPatternInstrument(this._doc.channel, i) == instrumentIndex && i != this._doc.bar &&
						(i < lowestSelX || i > highestSelX || this._doc.channel < lowestSelY || this._doc.channel > highestSelY)) {

						instrumentUsed = true;
						i = this._doc.song.barCount;
					}
				}

			}

			if (patternUsed) {
				this._usedPatternIndicator.style.setProperty("fill", ColorConfig.indicatorPrimary);
			}
			else {
				this._usedPatternIndicator.style.setProperty("fill", ColorConfig.indicatorSecondary);
			}
			if (instrumentUsed) {
				this._usedInstrumentIndicator.style.setProperty("fill", ColorConfig.indicatorPrimary);
			}
			else {
				this._usedInstrumentIndicator.style.setProperty("fill", ColorConfig.indicatorSecondary);
			}

			if (this._doc.song.getChannelIsNoise(this._doc.channel)) {
				this._pitchedPresetSelect.style.display = "none";
				this._drumPresetSelect.style.display = "";
				// Also hide select2
				$("#pitchPresetSelect").parent().hide();
				$("#drumPresetSelect").parent().show();

				setSelectedValue(this._drumPresetSelect, instrument.preset);
			} else {
				this._pitchedPresetSelect.style.display = "";
				this._drumPresetSelect.style.display = "none";

				// Also hide select2
				$("#pitchPresetSelect").parent().show();
				$("#drumPresetSelect").parent().hide();

				setSelectedValue(this._pitchedPresetSelect, instrument.preset);
			}

			if (!this._doc.alwaysShowSettings && instrument.preset != instrument.type) {
				//this._customizeInstrumentButton.style.display = "";
				//this._customInstrumentSettingsGroup.style.display = "none";
			} else {
				//this._customizeInstrumentButton.style.display = "none";
				//this._customInstrumentSettingsGroup.style.display = "";

				if (instrument.type == InstrumentType.noise) {
					this._chipNoiseSelectRow.style.display = "";
					setSelectedValue(this._chipNoiseSelect, instrument.chipNoise);
				} else {
					this._chipNoiseSelectRow.style.display = "none";
				}
				if (instrument.type == InstrumentType.spectrum) {
					this._chipWaveSelectRow.style.display = "none";
					this._spectrumRow.style.display = "";
					this._spectrumEditor.render();
				} else {
					this._spectrumRow.style.display = "none";
				}
				if (instrument.type == InstrumentType.harmonics) {
					this._chipWaveSelectRow.style.display = "none";
					this._harmonicsRow.style.display = "";
					this._harmonicsEditor.render();
				} else {
					this._harmonicsRow.style.display = "none";
				}
				if (instrument.type == InstrumentType.drumset) {
					this._chipWaveSelectRow.style.display = "none";
					this._drumsetGroup.style.display = "";
					this._transitionRow.style.display = "none";
					this._transitionDropdownGroup.style.display = "none";
					this._chordSelectRow.style.display = "none";
					this._chordDropdownGroup.style.display = "none";
					this._filterCutoffRow.style.display = "none";
					this._filterResonanceRow.style.display = "none";
					this._filterEnvelopeRow.style.display = "none";
					for (let i: number = 0; i < Config.drumCount; i++) {
						setSelectedValue(this._drumsetEnvelopeSelects[i], instrument.drumsetEnvelopes[i]);
						this._drumsetSpectrumEditors[i].render();
					}
				} else {
					this._drumsetGroup.style.display = "none";
					this._transitionRow.style.display = "";
					this._transitionDropdownGroup.style.display = (this._openTransitionDropdown ? "" : "none");
					this._chordSelectRow.style.display = "";
					this._chordDropdownGroup.style.display = (this._openChordDropdown && instrument.chord == 2 ? "" : "none");
					this._chordDropdown.style.display = (instrument.chord == 2 ? "" : "none");
					this._filterCutoffRow.style.display = "";
					this._filterResonanceRow.style.display = "";
					this._filterEnvelopeRow.style.display = "";
				}
				if (instrument.type == InstrumentType.chip) {
					this._chipWaveSelectRow.style.display = "";
					setSelectedValue(this._chipWaveSelect, instrument.chipWave);
				}

				if (instrument.type == InstrumentType.customChipWave) {
					this._customWaveDraw.style.display = "";
					this._chipWaveSelectRow.style.display = "none";
				}
				else {
					this._customWaveDraw.style.display = "none";
				}

				if (instrument.type == InstrumentType.pwm) {
					this._chipWaveSelectRow.style.display = "none";
					this._pulseEnvelopeRow.style.display = "";
					this._pulseWidthRow.style.display = "";
					this._pulseWidthSlider.input.title = prettyNumber(instrument.pulseWidth) + "%";
					setSelectedValue(this._pulseEnvelopeSelect, instrument.pulseEnvelope);
					this._pulseWidthSlider.updateValue(instrument.pulseWidth);
				} else {
					this._pulseEnvelopeRow.style.display = "none";
					this._pulseWidthRow.style.display = "none";
				}


				if (instrument.type == InstrumentType.fm) {
					this._algorithmSelectRow.style.display = "";
					this._phaseModGroup.style.display = "";
					this._feedbackRow1.style.display = "";
					this._feedbackRow2.style.display = "";
					this._chipWaveSelectRow.style.display = "none";
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
				}
				else {
					this._algorithmSelectRow.style.display = "none";
					this._phaseModGroup.style.display = "none";
					this._feedbackRow1.style.display = "none";
					this._feedbackRow2.style.display = "none";
				}

				if (instrument.type == InstrumentType.noise) {
					this._chipWaveSelectRow.style.display = "none";
					this._vibratoSelectRow.style.display = "none";
					this._vibratoDropdownGroup.style.display = "none";
					this._intervalSelectRow.style.display = "none";
				} else if (instrument.type == InstrumentType.drumset) {
					this._vibratoSelectRow.style.display = "none";
					this._intervalSelectRow.style.display = "none";
					this._vibratoDropdownGroup.style.display = "none";
				} else {
					this._vibratoSelectRow.style.display = "";
					// Temporarily hide interval select, until I get them working for these instrument types!
					if (instrument.type == InstrumentType.spectrum || instrument.type == InstrumentType.fm || instrument.type == InstrumentType.pwm) {
						this._intervalSelectRow.style.display = "none";
					}
					else {
						this._intervalSelectRow.style.display = "";
					}
					this._vibratoDropdownGroup.style.display = (this._openVibratoDropdown ? "" : "none");
				}
			}

			for (let chordIndex: number = 0; chordIndex < Config.chords.length; chordIndex++) {
				const hidden: boolean = !Config.instrumentTypeHasSpecialInterval[instrument.type] ? Config.chords[chordIndex].isCustomInterval : false;
				const option: Element = this._chordSelect.children[chordIndex];
				if (hidden) {
					if (!option.hasAttribute("hidden")) {
						option.setAttribute("hidden", "");
					}
				} else {
					option.removeAttribute("hidden");
				}
			}

			this._instrumentSettingsGroup.style.color = ColorConfig.getChannelColor(this._doc.song, this._doc.channel).primaryNote;

			this._filterCutoffSlider.updateValue(instrument.filterCutoff);
			this._filterResonanceSlider.updateValue(instrument.filterResonance);
			setSelectedValue(this._filterEnvelopeSelect, instrument.filterEnvelope);
			setSelectedValue(this._transitionSelect, instrument.transition);
			setSelectedValue(this._effectsSelect, instrument.effects);
			setSelectedValue(this._vibratoSelect, instrument.vibrato);
			setSelectedValue(this._vibratoTypeSelect, instrument.vibratoType);
			setSelectedValue(this._intervalSelect, instrument.interval);
			setSelectedValue(this._chordSelect, instrument.chord);
			this._panSliderInputBox.value = instrument.pan + "";
			this._detuneSliderInputBox.value = instrument.detune + "";
			this._instrumentVolumeSlider.updateValue(instrument.volume);
			this._instrumentVolumeSliderInputBox.value = "" + (instrument.volume);
			this._vibratoDepthSlider.updateValue(Math.round(instrument.vibratoDepth * 25));
			this._vibratoDelaySlider.updateValue(instrument.vibratoDelay);
			this._vibratoSpeedSlider.updateValue(instrument.vibratoSpeed);
			setSelectedValue(this._vibratoTypeSelect, instrument.vibratoType);
			this._arpeggioSpeedSlider.updateValue(instrument.arpeggioSpeed);
			this._panDelaySlider.updateValue(instrument.panDelay);
			this._vibratoDelaySlider.input.title = "" + instrument.vibratoDelay;
			this._vibratoDepthSlider.input.title = "" + instrument.vibratoDepth;
			this._vibratoSpeedSlider.input.title = "" + instrument.vibratoSpeed;
			this._panDelaySlider.input.title = "" + instrument.panDelay;
			this._arpeggioSpeedSlider.input.title = "x" + prettyNumber(Config.arpSpeedScale[instrument.arpeggioSpeed]);

			if (instrument.type == InstrumentType.customChipWave) {
				this._customWaveDrawCanvas.redrawCanvas();

				if (this.prompt instanceof CustomChipPrompt) {
					this.prompt.customChipCanvas.render();
				}
			}

		}
		// Options for mod channel
		else {
			var patternUsed = false;
			var instrumentUsed = false;

			let lowestSelX: number = Math.min(this._doc.selection.boxSelectionX0, this._doc.selection.boxSelectionX1);
			let highestSelX: number = Math.max(this._doc.selection.boxSelectionX0, this._doc.selection.boxSelectionX1);
			let lowestSelY: number = Math.min(this._doc.selection.boxSelectionY0, this._doc.selection.boxSelectionY1);
			let highestSelY: number = Math.max(this._doc.selection.boxSelectionY0, this._doc.selection.boxSelectionY1);

			if (channel.bars[this._doc.bar] != 0) {

				for (let i: number = 0; i < this._doc.song.barCount; i++) {
					// Check for this exact bar in another place, but only count it if it's not within the selection
					if (channel.bars[i] == channel.bars[this._doc.bar] && i != this._doc.bar &&
						(i < lowestSelX || i > highestSelX || this._doc.channel < lowestSelY || this._doc.channel > highestSelY)) {

						patternUsed = true;
						i = this._doc.song.barCount;
					}
				}
			}
			for (let i: number = 0; i < this._doc.song.barCount; i++) {
				// Check for this exact instrument in another place, but only count it if it's not within the selection
				if (channel.bars[i] != 0 && this._doc.song.getPatternInstrument(this._doc.channel, i) == instrumentIndex && i != this._doc.bar &&
					(i < lowestSelX || i > highestSelX || this._doc.channel < lowestSelY || this._doc.channel > highestSelY)) {

					instrumentUsed = true;
					i = this._doc.song.barCount;
				}
			}

			if (patternUsed) {
				this._usedPatternIndicator.style.setProperty("fill", ColorConfig.indicatorPrimary);
			}
			else {
				this._usedPatternIndicator.style.setProperty("fill", ColorConfig.indicatorSecondary);
			}

			if (instrumentUsed) {
				this._usedInstrumentIndicator.style.setProperty("fill", ColorConfig.indicatorPrimary);
			}
			else {
				this._usedInstrumentIndicator.style.setProperty("fill", ColorConfig.indicatorSecondary);
			}

			this._pitchedPresetSelect.style.display = "none";
			this._drumPresetSelect.style.display = "none";
			$("#pitchPresetSelect").parent().hide();
			$("#drumPresetSelect").parent().hide();
			this._modulatorGroup.appendChild(this._instrumentCopyGroup);
			this._modulatorGroup.insertBefore(this._instrumentSelectRow, this._modulatorGroup.firstChild);
			this._modulatorGroup.insertBefore(this._instrumentSettingsTextRow, this._modulatorGroup.firstChild);
			if (this._doc.song.channels[this._doc.channel].name == "") {
				this._instrumentSettingsTextRow.textContent = "Modulator Settings";
			}
			else {
				this._instrumentSettingsTextRow.textContent = this._doc.song.channels[this._doc.channel].name;
			}

			this._chipNoiseSelectRow.style.display = "none";
			this._chipWaveSelectRow.style.display = "none";
			this._spectrumRow.style.display = "none";
			this._harmonicsRow.style.display = "none";
			this._transitionRow.style.display = "none";
			this._chordSelectRow.style.display = "none";
			this._chordDropdownGroup.style.display = "none";
			this._filterCutoffRow.style.display = "none";
			this._filterResonanceRow.style.display = "none";
			this._filterEnvelopeRow.style.display = "none";
			this._drumsetGroup.style.display = "none";
			this._customWaveDraw.style.display = "none";
			this._algorithmSelectRow.style.display = "none";
			this._phaseModGroup.style.display = "none";
			this._feedbackRow1.style.display = "none";
			this._feedbackRow2.style.display = "none";
			this._pulseEnvelopeRow.style.display = "none";
			this._pulseWidthRow.style.display = "none";
			this._vibratoSelectRow.style.display = "none";
			this._vibratoDropdownGroup.style.display = "none";
			this._intervalSelectRow.style.display = "none";
			this._detuneSliderRow.style.display = "none";
			this._panSliderRow.style.display = "none";
			this._panDropdownGroup.style.display = "none";

			this._modulatorGroup.style.display = "";
			this._modulatorGroup.style.color = ColorConfig.getChannelColor(this._doc.song, this._doc.channel).primaryNote;

			for (let mod: number = 0; mod < Config.modCount; mod++) {

				let instrument: Instrument = this._doc.song.channels[this._doc.channel].instruments[this._doc.getCurrentInstrument()];
				let modStatus: number = instrument.modStatuses[mod];
				let modChannel: number = instrument.modChannels[mod] + ((modStatus == ModStatus.msForNoise) ? this._doc.song.pitchChannelCount : 0);
				let modInstrument: number = instrument.modInstruments[mod];

				// Boundary checking
				if (modInstrument >= this._doc.song.instrumentsPerChannel) {
					modInstrument = 0;
					instrument.modInstruments[mod] = 0;
					instrument.modSettings[mod] = 0;
				}
				if (modChannel >= this._doc.song.pitchChannelCount && (modStatus == ModStatus.msForPitch)) {
					modStatus = ModStatus.msNone;
					instrument.modStatuses[mod] = ModStatus.msNone;
					instrument.modSettings[mod] = ModSetting.mstNone;
				}
				if (modChannel >= this._doc.song.pitchChannelCount + this._doc.song.noiseChannelCount && (modStatus == ModStatus.msForNoise)) {
					instrument.modStatuses[mod] = ModStatus.msNone;
					instrument.modSettings[mod] = ModSetting.mstNone;
				}

				// Build options for modulator channels (make sure it has the right number).
				if (this._doc.recalcChannelNames || this._modChannelBoxes[mod].children.length != 2 + this._doc.song.pitchChannelCount + this._doc.song.noiseChannelCount) {
					while (this._modChannelBoxes[mod].firstChild) this._modChannelBoxes[mod].remove(0);
					const channelList: string[] = [];
					channelList.push("none");
					channelList.push("song");
					for (let i: number = 0; i < this._doc.song.pitchChannelCount; i++) {
						if (this._doc.song.channels[i].name == "") {
							channelList.push("pitch " + (i + 1));
						}
						else {
							channelList.push(this._doc.song.channels[i].name);
						}
					}
					for (let i: number = 0; i < this._doc.song.noiseChannelCount; i++) {
						if (this._doc.song.channels[i + this._doc.song.pitchChannelCount].name == "") {
							channelList.push("noise " + (i + 1));
						}
						else {
							channelList.push(this._doc.song.channels[i + this._doc.song.pitchChannelCount].name);
						}
					}
					buildOptions(this._modChannelBoxes[mod], channelList);
				}

				// Set selected index based on channel info.
				if (instrument.modStatuses[mod] == ModStatus.msNone) {
					this._modChannelBoxes[mod].selectedIndex = 0; // none
				}
				else if (instrument.modStatuses[mod] == ModStatus.msForSong) {
					this._modChannelBoxes[mod].selectedIndex = 1; // song
				}
				else if (instrument.modStatuses[mod] == ModStatus.msForPitch) {
					this._modChannelBoxes[mod].selectedIndex = instrument.modChannels[mod] + 2; // Offset to get to first pitch channel
				}
				else {
					this._modChannelBoxes[mod].selectedIndex = instrument.modChannels[mod] + 2 + this._doc.song.pitchChannelCount; // Offset to get to first noise channel
				}

				// Build options for modulator instruments (make sure it has the right number).
				if (this._modInstrumentBoxes[mod].children.length != this._doc.song.instrumentsPerChannel) {
					while (this._modInstrumentBoxes[mod].firstChild) this._modInstrumentBoxes[mod].remove(0);
					const instrumentList: number[] = [];
					for (let i: number = 0; i < this._doc.song.instrumentsPerChannel; i++) {
						instrumentList.push(i + 1);
					}
					buildOptions(this._modInstrumentBoxes[mod], instrumentList);
				}

				// Set selected index based on instrument info.
				this._modInstrumentBoxes[mod].selectedIndex = instrument.modInstruments[mod];

				// Build options for modulator settings (based on channel settings)

				if (modStatus != ModStatus.msNone) {

					let tgtInstrument: Instrument = this._doc.song.channels[modChannel].instruments[modInstrument];

					while (this._modSetBoxes[mod].firstChild) this._modSetBoxes[mod].remove(0);
					const settingList: string[] = [];
					settingList.push("none");

					// Populate mod setting options for the song scope.
					if (this._modChannelBoxes[mod].selectedIndex == 1) {
						settingList.push("song volume");
						settingList.push("tempo");
						settingList.push("reverb");
						settingList.push("next bar");
						settingList.push("song detune");
					}
					// Populate mod setting options for instrument scope.
					else {

						settingList.push("volume");
						settingList.push("pan");
						settingList.push("pan delay");
						settingList.push("filter cut");
						settingList.push("filter peak");
						settingList.push("detune");
						settingList.push("arpeggio speed");
						settingList.push("reset arpeggio");
						if (tgtInstrument.type == InstrumentType.chip || tgtInstrument.type == InstrumentType.fm || tgtInstrument.type == InstrumentType.harmonics || tgtInstrument.type == InstrumentType.pwm || tgtInstrument.type == InstrumentType.customChipWave) {
							settingList.push("vibrato depth");
							settingList.push("vibrato speed");
							settingList.push("vibrato delay");
						}
						if (tgtInstrument.type == InstrumentType.pwm) {
							settingList.push("pulse width");
						}
						else if (tgtInstrument.type == InstrumentType.fm) {
							settingList.push("fm slider 1");
							settingList.push("fm slider 2");
							settingList.push("fm slider 3");
							settingList.push("fm slider 4");
							settingList.push("fm feedback");
						}
					}

					buildOptions(this._modSetBoxes[mod], settingList);

					let needReset: boolean = false;
					let setIndex: number = 0;

					// Set selected index based on instrument info. Based on how the list is built.
					//Also has to check for a change in channel setting. Sigh...maybe it could be done better!
					switch (instrument.modSettings[mod]) {
						// For song
						case ModSetting.mstSongVolume:
							if (modStatus == ModStatus.msForSong)
								setIndex = 1;
							else
								needReset = true;
							break;
						case ModSetting.mstTempo:
							if (modStatus == ModStatus.msForSong)
								setIndex = 2;
							else
								needReset = true;
							break;
						case ModSetting.mstReverb:
							if (modStatus == ModStatus.msForSong)
								setIndex = 3;
							else
								needReset = true;
							break;
						case ModSetting.mstNextBar:
							if (modStatus == ModStatus.msForSong)
								setIndex = 4;
							else
								needReset = true;
							break;
						case ModSetting.mstSongDetune:
							if (modStatus == ModStatus.msForSong)
								setIndex = 5;
							else
								needReset = true;
							break;
						// For instruments
						case ModSetting.mstInsVolume:
							if (modStatus == ModStatus.msForPitch || modStatus == ModStatus.msForNoise)
								setIndex = 1;
							else
								needReset = true;
							break;
						case ModSetting.mstPan:
							if (modStatus == ModStatus.msForPitch || modStatus == ModStatus.msForNoise)
								setIndex = 2;
							else
								needReset = true;
							break;
						case ModSetting.mstPanDelay:
							if (modStatus == ModStatus.msForPitch || modStatus == ModStatus.msForNoise)
								setIndex = 3;
							else
								needReset = true;
							break;
						case ModSetting.mstFilterCut:
							if (modStatus == ModStatus.msForPitch || modStatus == ModStatus.msForNoise)
								setIndex = 4;
							else
								needReset = true;
							break;
						case ModSetting.mstFilterPeak:
							if (modStatus == ModStatus.msForPitch || modStatus == ModStatus.msForNoise)
								setIndex = 5;
							else
								needReset = true;
							break;
						case ModSetting.mstDetune:
							if (modStatus == ModStatus.msForPitch || modStatus == ModStatus.msForNoise)
								setIndex = 6;
							else
								needReset = true;
							break;
						case ModSetting.mstArpeggioSpeed:
							if (modStatus == ModStatus.msForPitch || modStatus == ModStatus.msForNoise)
								setIndex = 7;
							else
								needReset = true;
							break;
						case ModSetting.mstResetArpeggio:
							if (modStatus == ModStatus.msForPitch || modStatus == ModStatus.msForNoise)
								setIndex = 8;
							else
								needReset = true;
							break;
							break;
						case ModSetting.mstVibratoDepth:
							if (modStatus == ModStatus.msForPitch)
								setIndex = 9;
							else
								needReset = true;
							break;
						case ModSetting.mstVibratoSpeed:
							if (modStatus == ModStatus.msForPitch)
								setIndex = 10;
							else
								needReset = true;
							break;
						case ModSetting.mstVibratoDelay:
							if (modStatus == ModStatus.msForPitch)
								setIndex = 11;
							else
								needReset = true;
							break;
						case ModSetting.mstPulseWidth:
							if ((modStatus == ModStatus.msForPitch || modStatus == ModStatus.msForNoise) && tgtInstrument.type == InstrumentType.pwm)
								setIndex = 12;
							else
								needReset = true;
							break;
						case ModSetting.mstFMSlider1:
							if ((modStatus == ModStatus.msForPitch || modStatus == ModStatus.msForNoise) && tgtInstrument.type == InstrumentType.fm)
								setIndex = 12;
							else
								needReset = true;
							break;
						case ModSetting.mstFMSlider2:
							if ((modStatus == ModStatus.msForPitch || modStatus == ModStatus.msForNoise) && tgtInstrument.type == InstrumentType.fm)
								setIndex = 13;
							else
								needReset = true;
							break;
						case ModSetting.mstFMSlider3:
							if ((modStatus == ModStatus.msForPitch || modStatus == ModStatus.msForNoise) && tgtInstrument.type == InstrumentType.fm)
								setIndex = 14;
							else
								needReset = true;
							break;
						case ModSetting.mstFMSlider4:
							if ((modStatus == ModStatus.msForPitch || modStatus == ModStatus.msForNoise) && tgtInstrument.type == InstrumentType.fm)
								setIndex = 15;
							else
								needReset = true;
							break;
						case ModSetting.mstFMFeedback:
							if ((modStatus == ModStatus.msForPitch || modStatus == ModStatus.msForNoise) && tgtInstrument.type == InstrumentType.fm)
								setIndex = 16;
							else
								needReset = true;
							break;
						case ModSetting.mstNone:
						default:
							break;
					}

					// Catch instances where invalid set forced setting to "none"
					if (needReset) {
						this._modSetBoxes[mod].selectedIndex = 0;
						instrument.modSettings[mod] = ModSetting.mstNone;
						this._whenSetModSetting(mod);
					}
					else {
						this._modSetBoxes[mod].selectedIndex = setIndex;
					}

				} else if (instrument.modSettings[mod] != ModSetting.mstNone) {
					this._modSetBoxes[mod].selectedIndex = 0;
					this._whenSetModSetting(mod);
				}


				//Hide instrument select if channel is "none" or "song"
				if (this._modChannelBoxes[mod].selectedIndex <= 1) {
					((this._modInstrumentBoxes[mod].parentElement) as HTMLDivElement).style.display = "none";
					$("#modInstrumentText" + mod).get(0).style.display = "none";
					$("#modChannelText" + mod).get(0).innerText = "Channel:";

					//Hide setting select if channel is "none"
					if (this._modChannelBoxes[mod].selectedIndex == 0) {
						$("#modSettingText" + mod).get(0).style.display = "none";
						((this._modSetBoxes[mod].parentElement) as HTMLDivElement).style.display = "none";
					}
					else {
						$("#modSettingText" + mod).get(0).style.display = "";
						((this._modSetBoxes[mod].parentElement) as HTMLDivElement).style.display = "";
					}
				}
				else {
					((this._modInstrumentBoxes[mod].parentElement) as HTMLDivElement).style.display = (this._doc.song.instrumentsPerChannel > 1) ? "" : "none";
					$("#modInstrumentText" + mod).get(0).style.display = (this._doc.song.instrumentsPerChannel > 1) ? "" : "none";
					$("#modChannelText" + mod).get(0).innerText = (this._doc.song.instrumentsPerChannel > 1) ? "Ch:" : "Channel:";
					$("#modSettingText" + mod).get(0).style.display = "";
					((this._modSetBoxes[mod].parentElement) as HTMLDivElement).style.display = "";

				}
			}

			this._doc.recalcChannelNames = false;

			for (let chordIndex: number = 0; chordIndex < Config.chords.length; chordIndex++) {
				const option: Element = this._chordSelect.children[chordIndex];
				if (!option.hasAttribute("hidden")) {
					option.setAttribute("hidden", "");
				}

			}

			this._instrumentSelectRow.style.display = "none";

			this._customInstrumentSettingsGroup.style.display = "none";
			this._panSliderRow.style.display = "none";
			this._panDropdownGroup.style.display = "none";
			this._instrumentVolumeSliderRow.style.display = "none";
			$("#typeSelectRow").css("display", "none");

			this._instrumentSettingsGroup.style.color = ColorConfig.getChannelColor(this._doc.song, this._doc.channel).primaryNote;

			// Force piano to re-show, if channel is modulator
			if (this._doc.channel >= this._doc.song.pitchChannelCount + this._doc.song.noiseChannelCount) {
				this._piano.forceRender();
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

		this._filterCutoffSlider.updateValue(instrument.filterCutoff);
		this._filterResonanceSlider.updateValue(instrument.filterResonance);
		setSelectedValue(this._filterEnvelopeSelect, instrument.filterEnvelope);
		setSelectedValue(this._transitionSelect, instrument.transition);
		setSelectedValue(this._effectsSelect, instrument.effects);
		setSelectedValue(this._vibratoSelect, instrument.vibrato);
		setSelectedValue(this._vibratoTypeSelect, instrument.vibratoType);
		setSelectedValue(this._intervalSelect, instrument.interval);
		setSelectedValue(this._chordSelect, instrument.chord);
		this._instrumentVolumeSlider.updateValue(instrument.volume);
		this._panSlider.updateValue(instrument.pan);
		this._detuneSlider.updateValue(instrument.detune);
		this._twoNoteArpBox.checked = instrument.fastTwoNoteArp ? true : false;
		this._tieNoteTransitionBox.checked = instrument.tieNoteTransition ? true : false;
		this._clicklessTransitionBox.checked = instrument.clicklessTransition ? true : false;
		setSelectedValue(this._instrumentSelect, instrumentIndex);

		this._volumeSlider.updateValue(this._doc.volume);

		// If an interface element was selected, but becomes invisible (e.g. an instrument
		// select menu) just select the editor container so keyboard commands still work.
		if (wasActive && activeElement != null && activeElement.clientWidth == 0) {
			this.refocusStage();
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
			this._playButton.innerText = "Pause";
		} else {
			this._playButton.classList.remove("pauseButton");
			this._playButton.classList.add("playButton");
			this._playButton.title = "Play (Space)";
			this._playButton.innerText = "Play";
		}
	}

	private _whenKeyUp = (event: KeyboardEvent): void => {
		this._muteEditor.onKeyUp(event);
		if (event.keyCode == 17) { // Ctrl
			this._patternEditor.controlMode = false;
		}
		else if (event.keyCode == 16) { // Shift
			this._patternEditor.shiftMode = false;
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
			if (this.prompt instanceof CustomChipPrompt || this.prompt instanceof LimiterPrompt) {
				this.prompt.whenKeyPressed(event);
			}
			if (event.keyCode == 27) { // ESC key
				// close prompt.
				this._doc.undo();
			}
			return;
		}

		// Defer to actively editing song title, channel name, or mod label
		if (document.activeElement == this._songTitleInputBox.input || this._patternEditor.editingModLabel || document.activeElement == this._muteEditor._channelNameInput.input) {
			// Enter/esc returns focus to form
			if (event.keyCode == 13 || event.keyCode == 27) {
				this.mainLayer.focus();
				this._patternEditor.stopEditingModLabel(event.keyCode == 27);
			}

			return;
		}

		// Defer to actively editing volume/pan rows
		if (document.activeElement == this._panSliderInputBox || document.activeElement == this._detuneSliderInputBox || document.activeElement == this._instrumentVolumeSliderInputBox) {
			// Enter/esc returns focus to form
			if (event.keyCode == 13 || event.keyCode == 27) {
				this.mainLayer.focus();
			}

			return;
		}

		//this._trackEditor.onKeyPressed(event);
		switch (event.keyCode) {
			case 27: // ESC key
				new ChangePatternSelection(this._doc, 0, 0);
				this._doc.selection.resetBoxSelection();
				break;
			case 16: // Shift
				this._patternEditor.shiftMode = true;
				break;
			case 17: // Ctrl
				this._patternEditor.controlMode = true;
				break;
			case 32: // space
				// Jump to mouse
				if (event.ctrlKey || event.shiftKey) {
					if (!this._doc.synth.playing) {
						this._togglePlay();
					}
					this._trackEditor.movePlayheadToMouse();
					this._patternEditor.movePlayheadToMouse();
				}
				else {
					this._togglePlay();
				}
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
				new ChangePatternSelection(this._doc, 0, 0);
				this._doc.selection.resetBoxSelection();
				//this._trackEditor._selectionUpdated();
				event.preventDefault();
				break;
			case 13: // enter/return
				this._doc.selection.insertBars();
				event.preventDefault();
				break;
			case 8: // backspace/delete
				this._doc.selection.deleteBars();
				this._barScrollBar.animatePlayhead();
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
			case 70: // f
				this._doc.synth.firstBar();
				this._barScrollBar.animatePlayhead();
				if (this._doc.autoFollow) {
					new ChangeChannelBar(this._doc, this._doc.channel, Math.floor(this._doc.synth.playhead));
				}
				event.preventDefault();
				break;
			case 72: // h
				this._doc.synth.jumpToEditingBar(this._doc.bar);
				this._barScrollBar.animatePlayhead();
				new ChangeChannelBar(this._doc, this._doc.channel, Math.floor(this._doc.synth.playhead));
				event.preventDefault();
				break;
			case 76: // l
				if (event.shiftKey) {
					this._openPrompt("limiterSettings");
				}
				else {
					this._openPrompt("barCount");
				}
				break;
			case 77: // m
				if (this._doc.enableChannelMuting) {
					this._doc.selection.muteChannels(event.shiftKey);
					event.preventDefault();
				}
				break;
			case 78: // n
				// Find lowest-index unused pattern for current channel
				// Shift+n - lowest-index completely empty pattern

				const group: ChangeGroup = new ChangeGroup();

				if (event.shiftKey || event.ctrlKey) {
					let nextEmpty: number = 0;
					while (nextEmpty < this._doc.song.patternsPerChannel && this._doc.song.channels[this._doc.channel].patterns[nextEmpty].notes.length > 0)
						nextEmpty++;

					nextEmpty++; // The next empty pattern is actually the one after the found one

					// Can't set anything if we're at the absolute limit.
					if (nextEmpty <= Config.barCountMax) {

						if (nextEmpty > this._doc.song.patternsPerChannel) {

							// Add extra empty pattern, if all the rest have something in them.
							group.append(new ChangePatternsPerChannel(this._doc, nextEmpty));
						}

						// Change pattern number to lowest-index unused
						group.append(new ChangePatternNumbers(this._doc, nextEmpty, this._doc.bar, this._doc.channel, 1, 1));


					}
				}
				else {
					let nextUnused: number = 1;
					while (this._doc.song.channels[this._doc.channel].bars.indexOf(nextUnused) != -1
						&& nextUnused <= this._doc.song.patternsPerChannel)
						nextUnused++;

					// Can't set anything if we're at the absolute limit.
					if (nextUnused <= Config.barCountMax) {

						if (nextUnused > this._doc.song.patternsPerChannel) {

							// Add extra empty pattern, if all the rest are used.
							group.append(new ChangePatternsPerChannel(this._doc, nextUnused));
						}

						// Change pattern number to lowest-index unused
						group.append(new ChangePatternNumbers(this._doc, nextUnused, this._doc.bar, this._doc.channel, 1, 1));


					}
				}

				this._doc.record(group);

				event.preventDefault();
				break;
			case 81: // q
				this._openPrompt("channelSettings");
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
			case 87: // w
				this._openPrompt("moveNotesSideways");
				break;
			case 73: // i
				if (event.shiftKey) {
					const instrument: Instrument = this._doc.song.channels[this._doc.channel].instruments[this._doc.getCurrentInstrument()];
					const instrumentObject: any = instrument.toJsonObject();
					delete instrumentObject["volume"];
					delete instrumentObject["pan"];
					delete instrumentObject["preset"];
					this._copyTextToClipboard(JSON.stringify(instrumentObject));
				}
				event.preventDefault();
				break;
			case 82: // r
				if (event.shiftKey) {
					this._randomGenerated();
				} else {
					this._randomPreset();

				}
				event.preventDefault();

				break;
			case 219: // left brace
				this._doc.synth.prevBar();
				if (this._doc.autoFollow) {
					new ChangeChannelBar(this._doc, this._doc.channel, Math.floor(this._doc.synth.playhead));
				}
				this._barScrollBar.animatePlayhead();
				event.preventDefault();
				break;
			case 221: // right brace
				this._doc.synth.nextBar();
				if (this._doc.autoFollow) {
					new ChangeChannelBar(this._doc, this._doc.channel, Math.floor(this._doc.synth.playhead));
				}
				this._barScrollBar.animatePlayhead();
				event.preventDefault();
				break;
			case 189: // -
			case 173: // Firefox -
				this._doc.selection.transpose(false, event.shiftKey || event.ctrlKey);
				event.preventDefault();
				break;
			case 187: // +
			case 61: // Firefox +
			case 171: // Some users have this as +? Hmm.
				this._doc.selection.transpose(true, event.shiftKey || event.ctrlKey);
				event.preventDefault();
				break;
			case 38: // up
				if (event.ctrlKey) {
					// Swap channel up, if it wouldn't break from the channel type layout
					if (this._doc.channel == 0 || this._doc.channel == this._doc.song.pitchChannelCount || this._doc.channel == this._doc.song.pitchChannelCount + this._doc.song.noiseChannelCount) {
						break;
					}
					this._doc.record(new ChangeChannelOrder(this._doc, this._doc.channel - 1, this._doc.channel), false);
					this._doc.selection.setChannelBar((this._doc.channel - 1), this._doc.bar);
				}
				else if (event.shiftKey) {
					this._doc.selection.boxSelectionY1 = Math.max(0, this._doc.selection.boxSelectionY1 - 1);
					this._doc.selection.selectionUpdated();
				} else {
					this._doc.selection.setChannelBar((this._doc.channel - 1 + this._doc.song.getChannelCount()) % this._doc.song.getChannelCount(), this._doc.bar);
					this._doc.selection.resetBoxSelection();
				}
				event.preventDefault();
				break;
			case 40: // down
				if (event.ctrlKey) {
					// Swap channel down, if it wouldn't break from the channel type layout
					if (this._doc.channel == this._doc.song.pitchChannelCount - 1 || this._doc.channel == this._doc.song.pitchChannelCount + this._doc.song.noiseChannelCount - 1 || this._doc.channel == this._doc.song.getChannelCount() - 1) {
						break;
					}
					this._doc.record(new ChangeChannelOrder(this._doc, this._doc.channel, this._doc.channel + 1), false);
					this._doc.selection.setChannelBar((this._doc.channel + 1), this._doc.bar);
				}
				else if (event.shiftKey) {
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
			case 46: // Delete
				this._doc.selection.digits = "";
				this._doc.selection.nextDigit("0", false);
				break;
			case 48: // 0
				this._doc.selection.nextDigit("0", event.shiftKey || event.ctrlKey);
				event.preventDefault();
				break;
			case 49: // 1
				this._doc.selection.nextDigit("1", event.shiftKey || event.ctrlKey);
				event.preventDefault();
				break;
			case 50: // 2
				this._doc.selection.nextDigit("2", event.shiftKey || event.ctrlKey);
				event.preventDefault();
				break;
			case 51: // 3
				this._doc.selection.nextDigit("3", event.shiftKey || event.ctrlKey);
				event.preventDefault();
				break;
			case 52: // 4
				this._doc.selection.nextDigit("4", event.shiftKey || event.ctrlKey);
				event.preventDefault();
				break;
			case 53: // 5
				this._doc.selection.nextDigit("5", event.shiftKey || event.ctrlKey);
				event.preventDefault();
				break;
			case 54: // 6
				this._doc.selection.nextDigit("6", event.shiftKey || event.ctrlKey);
				event.preventDefault();
				break;
			case 55: // 7
				this._doc.selection.nextDigit("7", event.shiftKey || event.ctrlKey);
				event.preventDefault();
				break;
			case 56: // 8
				this._doc.selection.nextDigit("8", event.shiftKey || event.ctrlKey);
				event.preventDefault();
				break;
			case 57: // 9
				this._doc.selection.nextDigit("9", event.shiftKey || event.ctrlKey);
				event.preventDefault();
				break;
			default:
				this._doc.selection.digits = "";
				this._doc.selection.instrumentDigits = "";
				break;
		}
	}

	private _copyTextToClipboard(text: string): void {
		// Set as any to allow compilation without clipboard types (since, uh, I didn't write this bit and don't know the proper types library) -jummbus
		let nav: any;
		nav = navigator;

		if (nav.clipboard && nav.clipboard.writeText) {
			nav.clipboard.writeText(text).catch(() => {
				window.prompt("Copy to clipboard:", text);
			});
			return;
		}
		const textField: HTMLTextAreaElement = document.createElement("textarea");
		textField.innerText = text;
		document.body.appendChild(textField);
		textField.select();
		const succeeded: boolean = document.execCommand("copy");
		textField.remove();
		this.refocusStage();
		if (!succeeded) window.prompt("Copy this:", text);
	}

	private _whenPrevBarPressed = (): void => {
		this._doc.synth.prevBar();
		this._barScrollBar.animatePlayhead();
	}

	private _whenNextBarPressed = (): void => {
		this._doc.synth.nextBar();
		this._barScrollBar.animatePlayhead();
	}

	private _togglePlay = (): void => {
		if (this._doc.synth.playing) {
			this._pause();
		} else {
			this._doc.synth.snapToBar();
			this._play();
		}
	}

	public _play(): void {
		this._doc.synth.play();
		this.updatePlayButton();
		window.requestAnimationFrame(this._animate);
	}

	public _pause(): void {
		this._doc.synth.pause();
		this._doc.synth.resetEffects();
		if (this._doc.autoFollow) {
			this._doc.synth.goToBar(this._doc.bar);
		}
		this._doc.synth.snapToBar();
		this.updatePlayButton();
		window.clearInterval(this._modSliderHandle);
		window.clearInterval(this._volumeHandle);
		window.clearInterval(this._barScrollbarHandle);
		window.requestAnimationFrame(this._animate);
		this.outVolumeHistoricCap = 0;
	}

	public _animate = (): void => {
		// Need to update mods once more to clear the slider display
		this._modSliderUpdate();
		// Same for volume display
		if (this._doc.displayVolumeBar) {
			this._volumeUpdate();
		}
		// ...and barscrollbar playhead
		this._barScrollBar.animatePlayhead();

		window.requestAnimationFrame(this._animate);
	}

	public _volumeUpdate = (): void => {
		this.outVolumeHistoricTimer--;
		if (this.outVolumeHistoricTimer <= 0) {
			this.outVolumeHistoricCap -= 0.03;
		}
		if (this._doc.song.outVolumeCap > this.outVolumeHistoricCap) {
			this.outVolumeHistoricCap = this._doc.song.outVolumeCap;
			this.outVolumeHistoricTimer = 50;
		}

		if (this._doc.song.outVolumeCap != this.lastOutVolumeCap) {
			this.lastOutVolumeCap = this._doc.song.outVolumeCap;
			this._animateVolume(this._doc.song.outVolumeCap, this.outVolumeHistoricCap);
		}
	}

	private _animateVolume(outVolumeCap: number, historicOutCap: number): void {
		this._outVolumeBar.setAttribute("width", "" + Math.min(144, outVolumeCap * 144));
		this._outVolumeCap.setAttribute("x", "" + (8 + Math.min(144, historicOutCap * 144)));
	}

	private _setVolumeSlider = (): void => {
		this._doc.setVolume(Number(this._volumeSlider.input.value));
	}

	private _copyInstrument(): void {
		const channel: Channel = this._doc.song.channels[this._doc.channel];
		const instrument: Instrument = channel.instruments[this._doc.getCurrentInstrument()];
		const instrumentCopy: any = instrument.toJsonObject();
		instrumentCopy["isDrum"] = this._doc.song.getChannelIsNoise(this._doc.channel);
		window.localStorage.setItem("instrumentCopy", JSON.stringify(instrumentCopy));
		this.refocusStage();
	}

	private _pasteInstrument(): void {
		const channel: Channel = this._doc.song.channels[this._doc.channel];
		const instrument: Instrument = channel.instruments[this._doc.getCurrentInstrument()];
		const instrumentCopy: any = JSON.parse(String(window.localStorage.getItem("instrumentCopy")));
		if (instrumentCopy != null && instrumentCopy["isDrum"] == this._doc.song.getChannelIsNoise(this._doc.channel)) {
			this._doc.record(new ChangePasteInstrument(this._doc, instrument, instrumentCopy));
		}
		this.refocusStage();
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
		if (isNaN(<number><unknown>this._scaleSelect.value)) {
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
		if (isNaN(<number><unknown>this._keySelect.value)) {
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
		if (isNaN(<number><unknown>this._rhythmSelect.value)) {
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

	public _refocus = (): void => {
		// Waits a bit because select2 "steals" back focus even after the close event fires.
		var selfRef = this;
		setTimeout(function () { selfRef.mainLayer.focus(); }, 20);
	}

	public _whenSetPitchedPreset = (): void => {
		this._setPreset($('#pitchPresetSelect').val() + "");
	}

	public _whenSetDrumPreset = (): void => {
		this._setPreset($('#drumPresetSelect').val() + "");
	}

	private _setPreset(preset: string): void {
		if (isNaN(<number><unknown>preset)) {
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

		// Force piano to re-show, if channel is modulator
		if (this._doc.channel >= this._doc.song.pitchChannelCount + this._doc.song.noiseChannelCount) {
			this._piano.forceRender();
		}
	}

	private _whenSetModChannel = (mod: number): void => {
		this._doc.selection.setModChannel(mod, this._modChannelBoxes[mod].selectedIndex);

		// Force piano to re-show
		this._piano.forceRender();
	}

	private _whenSetModInstrument = (mod: number): void => {
		this._doc.selection.setModInstrument(mod, this._modInstrumentBoxes[mod].selectedIndex);

		// Force piano to re-show
		this._piano.forceRender();
	}

	private _whenSetModSetting = (mod: number): void => {
		//let prevSetting: number = this._doc.song.channels[this._doc.channel].instruments[this._doc.getCurrentInstrument()].modSettings[mod];

		this._doc.selection.setModSetting(mod, this._modSetBoxes[mod].children[this._modSetBoxes[mod].selectedIndex].textContent as string);

		/* Currently cut this as it would have to scale all patterns to make any sense, and I'm leery about the loss of information
		 * inherent in scaling to and from a smaller note resolution.
		// Cause pattern editor to scale note heights if necessary. Relies on above call to change this setting, of course.
		this._patternEditor.scaleModNotes(mod, prevSetting, this._doc.song.channels[this._doc.channel].instruments[this._doc.getCurrentInstrument()].modSettings[mod]);
		*/

		// Force piano to re-show if channel is modulator, as text shown on it needs to update
		this._piano.forceRender();

	}

	//private _whenCustomizePressed = (): void => {
	//	this._doc.record(new ChangeCustomizeInstrument(this._doc));
	//}

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
		this._doc.record(new ChangeEffects(this._doc, this._effectsSelect.selectedIndex));
	}

	private _whenSetVibrato = (): void => {
		this._doc.record(new ChangeVibrato(this._doc, this._vibratoSelect.selectedIndex));
	}

	private _whenSetVibratoType = (): void => {
		this._doc.record(new ChangeVibratoType(this._doc, this._vibratoTypeSelect.selectedIndex));
	}

	private _whenSetInterval = (): void => {
		this._doc.record(new ChangeInterval(this._doc, this._intervalSelect.selectedIndex));
	}

	private _whenSetChord = (): void => {
		this._doc.record(new ChangeChord(this._doc, this._chordSelect.selectedIndex));
	}

	private _fileMenuHandler = (event: Event): void => {
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

	private _editMenuHandler = (event: Event): void => {
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
			case "limiterSettings":
				this._openPrompt("limiterSettings");
				break;
		}
		this._editMenu.selectedIndex = 0;
	}

	private _optionsMenuHandler = (event: Event): void => {
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
			case "alwaysFineNoteVol":
				this._doc.alwaysFineNoteVol = !this._doc.alwaysFineNoteVol;
				break;
			case "enableChannelMuting":
				this._doc.enableChannelMuting = !this._doc.enableChannelMuting;
				for (const channel of this._doc.song.channels) channel.muted = false;
				break;
			case "displayBrowserUrl":
				this._doc.toggleDisplayBrowserUrl();
				break;
			case "displayVolumeBar":
				this._doc.displayVolumeBar = !this._doc.displayVolumeBar;
				break;
			case "fullScreen":
				this._openPrompt("layout");
				break;
			case "colorTheme":
				this._openPrompt("theme");
				break;
		}
		this._optionsMenu.selectedIndex = 0;
		this._doc.notifier.changed();
		this._doc.savePreferences();
	}

	private _customWavePresetHandler = (event: Event): void => {

		// Update custom wave value
		let customWaveArray: Float64Array = new Float64Array(64);
		let index: number = this._customWavePresetDrop.selectedIndex - 1;
		let maxValue: number = Number.MIN_VALUE;
		let minValue: number = Number.MAX_VALUE;
		let arrayPoint: number = 0;
		let arrayStep: number = (Config.chipWaves[index].samples.length - 1) / 64.0;

		for (let i: number = 0; i < 64; i++) {
			// Compute derivative to get original wave.
			customWaveArray[i] = (Config.chipWaves[index].samples[Math.floor(arrayPoint)] - Config.chipWaves[index].samples[(Math.floor(arrayPoint) + 1)]) / arrayStep;

			if (customWaveArray[i] < minValue)
				minValue = customWaveArray[i];

			if (customWaveArray[i] > maxValue)
				maxValue = customWaveArray[i];

			// Scale an any-size array to 64 elements
			arrayPoint += arrayStep;
		}

		for (let i: number = 0; i < 64; i++) {
			// Change array range from Min~Max to 0~(Max-Min)
			customWaveArray[i] -= minValue;
			// Divide by (Max-Min) to get a range of 0~1,
			customWaveArray[i] /= (maxValue - minValue);
			//then multiply by 48 to get 0~48,
			customWaveArray[i] *= 48.0;
			//then subtract 24 to get - 24~24
			customWaveArray[i] -= 24.0;
			//need to force integers
			customWaveArray[i] = Math.ceil(customWaveArray[i]);

			// Copy back data to canvas
			this._customWaveDrawCanvas.newArray[i] = customWaveArray[i];
		}

		//this._instrumentVolumeSlider.input.value = "" + Math.round(Config.waveVolumes[index] * 50.0 - 50.0);

		this._doc.record(new ChangeCustomWave(this._doc, customWaveArray))
		this._doc.record(new ChangeVolume(this._doc, +this._instrumentVolumeSlider.input.value, -Config.volumeRange / 2 + Math.round(Math.sqrt(Config.chipWaves[index].volume) * Config.volumeRange / 2)));

		this._customWavePresetDrop.selectedIndex = 0;
		this._doc.notifier.changed();
		this._doc.savePreferences();
	}
}
//}
