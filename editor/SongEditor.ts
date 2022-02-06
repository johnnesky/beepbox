// Copyright (C) 2021 John Nesky, distributed under the MIT license.

//import {Layout} from "./Layout";
import { InstrumentType, EffectType, Config, effectsIncludeTransition, effectsIncludeChord, effectsIncludePitchShift, effectsIncludeDetune, effectsIncludeVibrato, effectsIncludeNoteFilter, effectsIncludeDistortion, effectsIncludeBitcrusher, effectsIncludePanning, effectsIncludeChorus, effectsIncludeEcho, effectsIncludeReverb, DropdownID } from "../synth/SynthConfig";
import { BarScrollBar } from "./BarScrollBar";
import { BeatsPerBarPrompt } from "./BeatsPerBarPrompt";
import { Change, ChangeGroup } from "./Change";
import { ChannelSettingsPrompt } from "./ChannelSettingsPrompt";
import { ColorConfig, ChannelColors } from "./ColorConfig";
import { CustomChipPrompt } from "./CustomChipPrompt";
import { CustomFilterPrompt } from "./CustomFilterPrompt";
import { EditorConfig, isMobile, prettyNumber, Preset, PresetCategory } from "./EditorConfig";
import { ExportPrompt } from "./ExportPrompt";
import "./Layout"; // Imported here for the sake of ensuring this code is transpiled early.
import { Instrument, Channel, Synth } from "../synth/synth";
import { HTML, SVG } from "imperative-html/dist/esm/elements-strict";
import { HarmonicsEditor } from "./HarmonicsEditor";
import { InputBox, Slider } from "./HTMLWrapper";
import { ImportPrompt } from "./ImportPrompt";
import { LayoutPrompt } from "./LayoutPrompt";
import { EnvelopeEditor } from "./EnvelopeEditor";
import { FadeInOutEditor } from "./FadeInOutEditor";
import { FilterEditor } from "./FilterEditor";
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
import { ChangeTempo, ChangeChorus, ChangeEchoDelay, ChangeEchoSustain, ChangeReverb, ChangeVolume, ChangePan, ChangePatternSelection, ChangePatternsPerChannel, ChangePatternNumbers, ChangePulseWidth, ChangeFeedbackAmplitude, ChangeOperatorAmplitude, ChangeOperatorFrequency, ChangeDrumsetEnvelope, ChangePasteInstrument, ChangePreset, pickRandomPresetValue, ChangeRandomGeneratedInstrument, ChangeEQFilterType, ChangeNoteFilterType, ChangeEQFilterSimpleCut, ChangeEQFilterSimplePeak, ChangeNoteFilterSimpleCut, ChangeNoteFilterSimplePeak, ChangeScale, ChangeDetectKey, ChangeKey, ChangeRhythm, ChangeFeedbackType, ChangeAlgorithm, ChangeChipWave, ChangeNoiseWave, ChangeTransition, ChangeToggleEffects, ChangeVibrato, ChangeUnison, ChangeChord, ChangeSong, ChangePitchShift, ChangeDetune, ChangeDistortion, ChangeStringSustain, ChangeBitcrusherFreq, ChangeBitcrusherQuantization, ChangeAddEnvelope, ChangeAddChannelInstrument, ChangeRemoveChannelInstrument, ChangeCustomWave, ChangeOperatorWaveform, ChangeOperatorPulseWidth, ChangeSongTitle, ChangeVibratoDepth, ChangeVibratoSpeed, ChangeVibratoDelay, ChangeVibratoType, ChangePanDelay, ChangeArpeggioSpeed, ChangeFastTwoNoteArp, ChangeClicklessTransition, ChangeAliasing } from "./changes";

import { TrackEditor } from "./TrackEditor";

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
        menu.appendChild(option({ value: InstrumentType.pickedString }, EditorConfig.valueToPreset(InstrumentType.pickedString)!.name));
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
        option({ selected: true, disabled: true, hidden: false }, "File"), // todo: "hidden" should be true but looks wrong on mac chrome, adds checkmark next to first visible option even though it's not selected. :(
        option({ value: "new" }, "+ New Blank Song"),
        option({ value: "import" }, "↑ Import Song... (" + EditorConfig.ctrlSymbol + "O)"),
        option({ value: "export" }, "↓ Export Song... (" + EditorConfig.ctrlSymbol + "S)"),
        option({ value: "copyUrl" }, "⎘ Copy Song URL"),
        option({ value: "shareUrl" }, "⤳ Share Song URL"),
        option({ value: "shortenUrl" }, "… Shorten Song URL"),
        option({ value: "viewPlayer" }, "▶ View in Song Player"),
        option({ value: "copyEmbed" }, "⎘ Copy HTML Embed Code"),
        option({ value: "songRecovery" }, "⚠ Recover Recent Song..."),
    );
    private readonly _editMenu: HTMLSelectElement = select({ style: "width: 100%;" },
        option({ selected: true, disabled: true, hidden: false }, "Edit"), // todo: "hidden" should be true but looks wrong on mac chrome, adds checkmark next to first visible option even though it's not selected. :(
        option({ value: "undo" }, "Undo (Z)"),
        option({ value: "redo" }, "Redo (Y)"),
        option({ value: "copy" }, "Copy Pattern (C)"),
        option({ value: "pasteNotes" }, "Paste Pattern Notes (V)"),
        option({ value: "pasteNumbers" }, "Paste Pattern Numbers (" + EditorConfig.ctrlSymbol + "⇧V)"),
        option({ value: "insertBars" }, "Insert Bar (⏎)"),
        option({ value: "deleteBars" }, "Delete Selected Bars (⌫)"),
        option({ value: "insertChannel" }, "Insert Channel (" + EditorConfig.ctrlSymbol + "⏎)"),
        option({ value: "deleteChannel" }, "Delete Selected Channels (" + EditorConfig.ctrlSymbol + "⌫)"),
        option({ value: "selectChannel" }, "Select Channel (⇧A)"),
        option({ value: "selectAll" }, "Select All (A)"),
        option({ value: "duplicatePatterns" }, "Duplicate Reused Patterns (D)"),
        option({ value: "transposeUp" }, "Move Notes Up (+ or ⇧+)"),
        option({ value: "transposeDown" }, "Move Notes Down (- or ⇧-)"),
        option({ value: "moveNotesSideways" }, "Move All Notes Sideways... (W)"),
        option({ value: "beatsPerBar" }, "Change Beats Per Bar..."),
        option({ value: "barCount" }, "Change Song Length... (L)"),
        option({ value: "channelSettings" }, "Channel Settings... (Q)"),
        option({ value: "limiterSettings" }, "Limiter Settings... (⇧L)"),
    );
    private readonly _optionsMenu: HTMLSelectElement = select({ style: "width: 100%;" },
        option({ selected: true, disabled: true, hidden: false }, "Preferences"), // todo: "hidden" should be true but looks wrong on mac chrome, adds checkmark next to first visible option even though it's not selected. :(
        option({ value: "autoPlay" }, "Auto Play On Load"),
        option({ value: "autoFollow" }, "Auto Follow Track"),
        option({ value: "enableNotePreview" }, "Preview Added Notes"),
        option({ value: "showLetters" }, "Show Piano Keys"),
        option({ value: "showFifth" }, 'Highlight "Fifth" Notes'),
        option({ value: "notesOutsideScale" }, "Allow Notes Outside Scale"),
        option({ value: "setDefaultScale" }, "Use Current Scale as Default"),
        option({ value: "showChannels" }, "Show All Channels"),
        option({ value: "showScrollBar" }, "Octave Scroll Bar"),
        option({ value: "alwaysFineNoteVol" }, "Always Fine Note Vol."),
        option({ value: "enableChannelMuting" }, "Enable Channel Muting"),
        option({ value: "displayBrowserUrl" }, "Display Song Data in URL"),
        option({ value: "displayVolumeBar" }, "Show Playback Volume"),
        option({ value: "layout" }, "Set Layout..."),
        option({ value: "colorTheme" }, "Set Theme..."),
    );
    private readonly _scaleSelect: HTMLSelectElement = buildOptions(select(), Config.scales.map(scale => scale.name));
    private readonly _keySelect: HTMLSelectElement = buildOptions(select(), Config.keys.map(key => key.name).reverse());
    private readonly _tempoSlider: Slider = new Slider(input({ style: "margin: 0; vertical-align: middle;", type: "range", min: "30", max: "320", value: "160", step: "1" }), this._doc, (oldValue: number, newValue: number) => new ChangeTempo(this._doc, oldValue, newValue), false);
    private readonly _tempoStepper: HTMLInputElement = input({ style: "width: 4em; font-size: 80%; margin-left: 0.4em; vertical-align: middle;", type: "number", step: "1" });
    private readonly _chorusSlider: Slider = new Slider(input({ style: "margin: 0;", type: "range", min: "0", max: Config.chorusRange - 1, value: "0", step: "1" }), this._doc, (oldValue: number, newValue: number) => new ChangeChorus(this._doc, oldValue, newValue), false);
    private readonly _chorusRow: HTMLDivElement = div({ class: "selectRow" }, span({ class: "tip", onclick: () => this._openPrompt("chorus") }, "Chorus:"), this._chorusSlider.container);
    private readonly _reverbSlider: Slider = new Slider(input({ style: "margin: 0; position: sticky,", type: "range", min: "0", max: Config.reverbRange - 1, value: "0", step: "1" }), this._doc, (oldValue: number, newValue: number) => new ChangeReverb(this._doc, oldValue, newValue), false);
    private readonly _reverbRow: HTMLDivElement = div({ class: "selectRow" }, span({ class: "tip", onclick: () => this._openPrompt("reverb") }, "Reverb:"), this._reverbSlider.container);
    private readonly _echoSustainSlider: Slider = new Slider(input({ style: "margin: 0;", type: "range", min: "0", max: Config.echoSustainRange - 1, value: "0", step: "1" }), this._doc, (oldValue: number, newValue: number) => new ChangeEchoSustain(this._doc, oldValue, newValue), false);
    private readonly _echoSustainRow: HTMLDivElement = div({ class: "selectRow" }, span({ class: "tip", onclick: () => this._openPrompt("echoSustain") }, "Echo:"), this._echoSustainSlider.container);
    private readonly _echoDelaySlider: Slider = new Slider(input({ style: "margin: 0;", type: "range", min: "0", max: Config.echoDelayRange - 1, value: "0", step: "1" }), this._doc, (oldValue: number, newValue: number) => new ChangeEchoDelay(this._doc, oldValue, newValue), false);
    private readonly _echoDelayRow: HTMLDivElement = div({ class: "selectRow" }, span({ class: "tip", onclick: () => this._openPrompt("echoDelay") }, "Echo Delay:"), this._echoDelaySlider.container);
    private readonly _rhythmSelect: HTMLSelectElement = buildOptions(select(), Config.rhythms.map(rhythm => rhythm.name));
    private readonly _pitchedPresetSelect: HTMLSelectElement = buildPresetOptions(false, "pitchPresetSelect");
    private readonly _drumPresetSelect: HTMLSelectElement = buildPresetOptions(true, "drumPresetSelect");
    private readonly _algorithmSelect: HTMLSelectElement = buildOptions(select(), Config.algorithms.map(algorithm => algorithm.name));
    private readonly _algorithmSelectRow: HTMLDivElement = div({ class: "selectRow" }, span({ class: "tip", onclick: () => this._openPrompt("algorithm") }, "Algorithm: "), div({ class: "selectContainer" }, this._algorithmSelect));
    private readonly _instrumentButtons: HTMLButtonElement[] = [];
    private readonly _instrumentAddButton: HTMLButtonElement = button({ type: "button", class: "add-instrument last-button" });
    private readonly _instrumentRemoveButton: HTMLButtonElement = button({ type: "button", class: "remove-instrument" });
    private readonly _instrumentsButtonBar: HTMLDivElement = div({ class: "instrument-bar" }, this._instrumentRemoveButton, this._instrumentAddButton);
    private readonly _instrumentsButtonRow: HTMLDivElement = div({ class: "selectRow", style: "display: none;" }, span({ class: "tip", onclick: () => this._openPrompt("instrumentIndex") }, "Instrument:"), this._instrumentsButtonBar);
    private readonly _instrumentVolumeSlider: Slider = new Slider(input({ style: "margin: 0; position: sticky;", type: "range", min: Math.floor(-Config.volumeRange / 2), max: Math.floor(Config.volumeRange / 2), value: "0", step: "1" }), this._doc, (oldValue: number, newValue: number) => new ChangeVolume(this._doc, oldValue, newValue), true);
    private readonly _instrumentVolumeSliderInputBox: HTMLInputElement = input({ style: "width: 4em; font-size: 80%", id: "volumeSliderInputBox", type: "number", step: "1", min: Math.floor(-Config.volumeRange / 2), max: Math.floor(Config.volumeRange / 2), value: "0" });
    private readonly _instrumentVolumeSliderTip: HTMLDivElement = div({ class: "selectRow", style: "height: 1em" }, span({ class: "tip", style: "font-size: smaller;", onclick: () => this._openPrompt("instrumentVolume") }, "Volume: "));
    private readonly _instrumentVolumeSliderRow: HTMLDivElement = div({ class: "selectRow" }, div({},
        div({ style: "color: " + ColorConfig.secondaryText + ";" }, span({ class: "tip" }, this._instrumentVolumeSliderTip)),
        div({ style: "color: " + ColorConfig.secondaryText + "; margin-top: -3px;" }, this._instrumentVolumeSliderInputBox),
    ), this._instrumentVolumeSlider.container);
    private readonly _panSlider: Slider = new Slider(input({ style: "margin: 0; position: sticky;", type: "range", min: "0", max: Config.panMax, value: Config.panCenter, step: "1" }), this._doc, (oldValue: number, newValue: number) => new ChangePan(this._doc, oldValue, newValue), true);
    private readonly _panDropdown: HTMLButtonElement = button({ style: "margin-left:0em; height:1.5em; width: 10px; padding: 0px; font-size: 8px;", onclick: () => this._toggleDropdownMenu(DropdownID.Pan) }, "▼");
    private readonly _panSliderInputBox: HTMLInputElement = input({ style: "width: 4em; font-size: 80%; ", id: "panSliderInputBox", type: "number", step: "1", min: "0", max: "100", value: "0" });
    private readonly _panSliderRow: HTMLDivElement = div({ class: "selectRow" }, div({},
        span({ class: "tip", tabindex: "0", style: "height:1em; font-size: smaller;", onclick: () => this._openPrompt("pan") }, "Pan: "),
        div({ style: "color: " + ColorConfig.secondaryText + "; margin-top: -3px;" }, this._panSliderInputBox),
    ), this._panDropdown, this._panSlider.container);
    private readonly _panDelaySlider: Slider = new Slider(input({ style: "margin: 0;", type: "range", min: "0", max: Config.modulators.dictionary["pan delay"].maxRawVol, value: "0", step: "1" }), this._doc, (oldValue: number, newValue: number) => new ChangePanDelay(this._doc, oldValue, newValue), false);
    private readonly _panDelayRow: HTMLElement = div({ class: "selectRow" }, span({ class: "tip", style: "margin-left:10px;", onclick: () => this._openPrompt("panDelay") }, "Delay:"), this._panDelaySlider.container);
    private readonly _panDropdownGroup: HTMLElement = div({ class: "editor-controls", style: "display: none;" }, this._panDelayRow);
    private readonly _chipWaveSelect: HTMLSelectElement = buildOptions(select(), Config.chipWaves.map(wave => wave.name));
    private readonly _chipNoiseSelect: HTMLSelectElement = buildOptions(select(), Config.chipNoises.map(wave => wave.name));
    private readonly _chipWaveSelectRow: HTMLDivElement = div({ class: "selectRow" }, span({ class: "tip", onclick: () => this._openPrompt("chipWave") }, "Wave: "), div({ class: "selectContainer" }, this._chipWaveSelect));
    private readonly _chipNoiseSelectRow: HTMLDivElement = div({ class: "selectRow" }, span({ class: "tip", onclick: () => this._openPrompt("chipNoise") }, "Noise: "), div({ class: "selectContainer" }, this._chipNoiseSelect));
    private readonly _fadeInOutEditor: FadeInOutEditor = new FadeInOutEditor(this._doc);
    private readonly _fadeInOutRow: HTMLElement = div({ class: "selectRow" }, span({ class: "tip", onclick: () => this._openPrompt("fadeInOut") }, "Fade:"), this._fadeInOutEditor.container);
    private readonly _transitionSelect: HTMLSelectElement = buildOptions(select(), Config.transitions.map(transition => transition.name));
    private readonly _transitionDropdown: HTMLButtonElement = button({ style: "margin-left:0em; height:1.5em; width: 10px; padding: 0px; font-size: 8px;", onclick: () => this._toggleDropdownMenu(DropdownID.Transition) }, "▼");
    private readonly _transitionRow: HTMLDivElement = div({ class: "selectRow" }, span({ class: "tip", onclick: () => this._openPrompt("transition") }, "Transition:"), this._transitionDropdown, div({ class: "selectContainer", style: "width: 52.5%;" }, this._transitionSelect));
    private readonly _clicklessTransitionBox: HTMLInputElement = input({ type: "checkbox", style: "width: 1em; padding: 0; margin-right: 4em;" });
    private readonly _clicklessTransitionRow: HTMLElement = div({ class: "selectRow" }, span({ class: "tip", style: "margin-left:10px;", onclick: () => this._openPrompt("clicklessTransition") }, "Clickless:"), this._clicklessTransitionBox);
    private readonly _transitionDropdownGroup: HTMLElement = div({ class: "editor-controls", style: "display: none;" }, this._clicklessTransitionRow);

    private readonly _effectsSelect: HTMLSelectElement = select(option({ selected: true, disabled: true, hidden: false })); // todo: "hidden" should be true but looks wrong on mac chrome, adds checkmark next to first visible option even though it's not selected. :(
    private readonly _eqFilterSimpleButton: HTMLButtonElement = button({ style: "font-size: x-small; width: 50%; height: 40%", onclick: () => this._switchEQFilterType(true) }, "simple");
    private readonly _eqFilterAdvancedButton: HTMLButtonElement = button({ style: "font-size: x-small; width: 50%; height: 40%", class: "last-button", onclick: () => this._switchEQFilterType(false) }, "advanced");
    private readonly _eqFilterTypeRow: HTMLElement = div({ class: "selectRow", style: "padding-top: 4px; margin-bottom: 0px;" }, span({ style: "font-size: x-small;", class: "tip", onclick: () => this._openPrompt("filterType") }, "EQ Filt.Type:"), div({ class: "instrument-bar" }, this._eqFilterSimpleButton, this._eqFilterAdvancedButton));
    private readonly _eqFilterEditor: FilterEditor = new FilterEditor(this._doc);
    private readonly _eqFilterZoom: HTMLButtonElement = button({ style: "margin-left:0em; padding-left:0.2em; height:1.5em; max-width: 12px;", onclick: () => this._openPrompt("customEQFilterSettings") }, "+");
    private readonly _eqFilterRow: HTMLElement = div({ class: "selectRow" }, span({ class: "tip", onclick: () => this._openPrompt("eqFilter") }, "EQ Filt:"), this._eqFilterZoom, this._eqFilterEditor.container);
    private readonly _eqFilterSimpleCutSlider: Slider = new Slider(input({ style: "margin: 0;", type: "range", min: "0", max: Config.filterSimpleCutRange - 1, value: "6", step: "1" }), this._doc, (oldValue: number, newValue: number) => new ChangeEQFilterSimpleCut(this._doc, oldValue, newValue), false);
    private _eqFilterSimpleCutRow: HTMLDivElement = div({ class: "selectRow", title: "Low-pass Filter Cutoff Frequency" }, span({ class: "tip", onclick: () => this._openPrompt("filterCutoff") }, "Filter Cut:"), this._eqFilterSimpleCutSlider.container);
    private readonly _eqFilterSimplePeakSlider: Slider = new Slider(input({ style: "margin: 0;", type: "range", min: "0", max: Config.filterSimplePeakRange - 1, value: "6", step: "1" }), this._doc, (oldValue: number, newValue: number) => new ChangeEQFilterSimplePeak(this._doc, oldValue, newValue), false);
    private _eqFilterSimplePeakRow: HTMLDivElement = div({ class: "selectRow", title: "Low-pass Filter Peak Resonance" }, span({ class: "tip", onclick: () => this._openPrompt("filterResonance") }, "Filter Peak:"), this._eqFilterSimplePeakSlider.container);

    private readonly _noteFilterSimpleButton: HTMLButtonElement = button({ style: "font-size: x-small; width: 50%; height: 40%", onclick: () => this._switchNoteFilterType(true) }, "simple");
    private readonly _noteFilterAdvancedButton: HTMLButtonElement = button({ style: "font-size: x-small; width: 50%; height: 40%", class: "last-button", onclick: () => this._switchNoteFilterType(false) }, "advanced");
    private readonly _noteFilterTypeRow: HTMLElement = div({ class: "selectRow", style: "padding-top: 4px; margin-bottom: 0px;" }, span({ style: "font-size: x-small;", class: "tip", onclick: () => this._openPrompt("filterType") }, "Note Filt.Type:"), div({ class: "instrument-bar" }, this._noteFilterSimpleButton, this._noteFilterAdvancedButton));
    private readonly _noteFilterEditor: FilterEditor = new FilterEditor(this._doc, true);
    private readonly _noteFilterZoom: HTMLButtonElement = button({ style: "margin-left:0em; padding-left:0.2em; height:1.5em; max-width: 12px;", onclick: () => this._openPrompt("customNoteFilterSettings") }, "+");
    private readonly _noteFilterRow: HTMLElement = div({ class: "selectRow" }, span({ class: "tip", onclick: () => this._openPrompt("noteFilter") }, "Note Filt:"), this._noteFilterZoom, this._noteFilterEditor.container);
    private readonly _noteFilterSimpleCutSlider: Slider = new Slider(input({ style: "margin: 0;", type: "range", min: "0", max: Config.filterSimpleCutRange - 1, value: "6", step: "1" }), this._doc, (oldValue: number, newValue: number) => new ChangeNoteFilterSimpleCut(this._doc, oldValue, newValue), false);
    private _noteFilterSimpleCutRow: HTMLDivElement = div({ class: "selectRow", title: "Low-pass Filter Cutoff Frequency" }, span({ class: "tip", onclick: () => this._openPrompt("filterCutoff") }, "Filter Cut:"), this._noteFilterSimpleCutSlider.container);
    private readonly _noteFilterSimplePeakSlider: Slider = new Slider(input({ style: "margin: 0;", type: "range", min: "0", max: Config.filterSimplePeakRange - 1, value: "6", step: "1" }), this._doc, (oldValue: number, newValue: number) => new ChangeNoteFilterSimplePeak(this._doc, oldValue, newValue), false);
    private _noteFilterSimplePeakRow: HTMLDivElement = div({ class: "selectRow", title: "Low-pass Filter Peak Resonance" }, span({ class: "tip", onclick: () => this._openPrompt("filterResonance") }, "Filter Peak:"), this._noteFilterSimplePeakSlider.container);

    private readonly _pulseWidthSlider: Slider = new Slider(input({ style: "margin: 0;", type: "range", min: "1", max: Config.pulseWidthRange, value: "1", step: "1" }), this._doc, (oldValue: number, newValue: number) => new ChangePulseWidth(this._doc, oldValue, newValue), false);
    private readonly _pulseWidthRow: HTMLDivElement = div({ class: "selectRow" }, span({ class: "tip", onclick: () => this._openPrompt("pulseWidth") }, "Pulse Width:"), this._pulseWidthSlider.container);
    private readonly _pitchShiftSlider: Slider = new Slider(input({ style: "margin: 0;", type: "range", min: "0", max: Config.pitchShiftRange - 1, value: "0", step: "1" }), this._doc, (oldValue: number, newValue: number) => new ChangePitchShift(this._doc, oldValue, newValue), true);
    private readonly _pitchShiftTonicMarkers: HTMLDivElement[] = [div({ class: "pitchShiftMarker", style: { color: ColorConfig.tonic } }), div({ class: "pitchShiftMarker", style: { color: ColorConfig.tonic, left: "50%" } }), div({ class: "pitchShiftMarker", style: { color: ColorConfig.tonic, left: "100%" } })];
    private readonly _pitchShiftFifthMarkers: HTMLDivElement[] = [div({ class: "pitchShiftMarker", style: { color: ColorConfig.fifthNote, left: (100 * 7 / 24) + "%" } }), div({ class: "pitchShiftMarker", style: { color: ColorConfig.fifthNote, left: (100 * 19 / 24) + "%" } })];
    private readonly _pitchShiftMarkerContainer: HTMLDivElement = div({ style: "display: flex; position: relative;" }, this._pitchShiftSlider.container, div({ class: "pitchShiftMarkerContainer" }, this._pitchShiftTonicMarkers, this._pitchShiftFifthMarkers));
    private readonly _pitchShiftRow: HTMLDivElement = div({ class: "selectRow" }, span({ class: "tip", onclick: () => this._openPrompt("pitchShift") }, "Pitch Shift:"), this._pitchShiftMarkerContainer);
    private readonly _detuneSlider: Slider = new Slider(input({ style: "margin: 0;", type: "range", min: Config.detuneMin - Config.detuneCenter, max: Config.detuneMax - Config.detuneCenter, value: 0, step: "4" }), this._doc, (oldValue: number, newValue: number) => new ChangeDetune(this._doc, oldValue, newValue), true);
    private readonly _detuneSliderInputBox: HTMLInputElement = input({ style: "width: 4em; font-size: 80%; ", id: "detuneSliderInputBox", type: "number", step: "1", min: Config.detuneMin - Config.detuneCenter, max: Config.detuneMax - Config.detuneCenter, value: 0 });
    private readonly _detuneSliderRow: HTMLDivElement = div({ class: "selectRow" }, div({},
        span({ class: "tip", style: "height:1em; font-size: smaller;", onclick: () => this._openPrompt("detune") }, "Detune: "),
        div({ style: "color: " + ColorConfig.secondaryText + "; margin-top: -3px;" }, this._detuneSliderInputBox),
    ), this._detuneSlider.container);
    private readonly _distortionSlider: Slider = new Slider(input({ style: "margin: 0; position: sticky;", type: "range", min: "0", max: Config.distortionRange - 1, value: "0", step: "1" }), this._doc, (oldValue: number, newValue: number) => new ChangeDistortion(this._doc, oldValue, newValue), false);
    private readonly _distortionRow: HTMLDivElement = div({ class: "selectRow" }, span({ class: "tip", onclick: () => this._openPrompt("distortion") }, "Distortion:"), this._distortionSlider.container);
    private readonly _aliasingBox: HTMLInputElement = input({ type: "checkbox", style: "width: 1em; padding: 0; margin-right: 4em;" });
    private readonly _aliasingRow: HTMLElement = div({ class: "selectRow" }, span({ class: "tip", style: "margin-left:10px;", onclick: () => this._openPrompt("aliases") }, "Aliasing:"), this._aliasingBox);
    private readonly _bitcrusherQuantizationSlider: Slider = new Slider(input({ style: "margin: 0;", type: "range", min: "0", max: Config.bitcrusherQuantizationRange - 1, value: "0", step: "1" }), this._doc, (oldValue: number, newValue: number) => new ChangeBitcrusherQuantization(this._doc, oldValue, newValue), false);
    private readonly _bitcrusherQuantizationRow: HTMLDivElement = div({ class: "selectRow" }, span({ class: "tip", onclick: () => this._openPrompt("bitcrusherQuantization") }, "Bit Crush:"), this._bitcrusherQuantizationSlider.container);
    private readonly _bitcrusherFreqSlider: Slider = new Slider(input({ style: "margin: 0;", type: "range", min: "0", max: Config.bitcrusherFreqRange - 1, value: "0", step: "1" }), this._doc, (oldValue: number, newValue: number) => new ChangeBitcrusherFreq(this._doc, oldValue, newValue), false);
    private readonly _bitcrusherFreqRow: HTMLDivElement = div({ class: "selectRow" }, span({ class: "tip", onclick: () => this._openPrompt("bitcrusherFreq") }, "Freq Crush:"), this._bitcrusherFreqSlider.container);
    private readonly _stringSustainSlider: Slider = new Slider(input({ style: "margin: 0;", type: "range", min: "0", max: Config.stringSustainRange - 1, value: "0", step: "1" }), this._doc, (oldValue: number, newValue: number) => new ChangeStringSustain(this._doc, oldValue, newValue), false);
    private readonly _stringSustainRow: HTMLDivElement = div({ class: "selectRow" }, span({ class: "tip", onclick: () => this._openPrompt("stringSustain") }, "Sustain:"), this._stringSustainSlider.container);
    private readonly _unisonSelect: HTMLSelectElement = buildOptions(select(), Config.unisons.map(unison => unison.name));
    private readonly _unisonSelectRow: HTMLElement = div({ class: "selectRow" }, span({ class: "tip", onclick: () => this._openPrompt("unison") }, "Unison:"), div({ class: "selectContainer" }, this._unisonSelect));
    private readonly _chordSelect: HTMLSelectElement = buildOptions(select(), Config.chords.map(chord => chord.name));
    private readonly _chordDropdown: HTMLButtonElement = button({ style: "margin-left:0em; height:1.5em; width: 10px; padding: 0px; font-size: 8px;", onclick: () => this._toggleDropdownMenu(DropdownID.Chord) }, "▼");

    private readonly _chordSelectRow: HTMLElement = div({ class: "selectRow" }, span({ class: "tip", onclick: () => this._openPrompt("chords") }, "Chords:"), this._chordDropdown, div({ class: "selectContainer" }, this._chordSelect));
    private readonly _arpeggioSpeedSlider: Slider = new Slider(input({ style: "margin: 0;", type: "range", min: "0", max: Config.modulators.dictionary["arp speed"].maxRawVol, value: "0", step: "1" }), this._doc, (oldValue: number, newValue: number) => new ChangeArpeggioSpeed(this._doc, oldValue, newValue), false);
    private readonly _arpeggioSpeedRow: HTMLElement = div({ class: "selectRow" }, span({ class: "tip", style: "margin-left:10px;", onclick: () => this._openPrompt("arpeggioSpeed") }, "Speed:"), this._arpeggioSpeedSlider.container);
    private readonly _twoNoteArpBox: HTMLInputElement = input({ type: "checkbox", style: "width: 1em; padding: 0; margin-right: 4em;" });
    private readonly _twoNoteArpRow: HTMLElement = div({ class: "selectRow" }, span({ class: "tip", style: "margin-left:10px;", onclick: () => this._openPrompt("twoNoteArpeggio") }, "Fast Two-Note:"), this._twoNoteArpBox);
    private readonly _chordDropdownGroup: HTMLElement = div({ class: "editor-controls", style: "display: none;" }, this._arpeggioSpeedRow, this._twoNoteArpRow);

    private readonly _vibratoSelect: HTMLSelectElement = buildOptions(select(), Config.vibratos.map(vibrato => vibrato.name));
    private readonly _vibratoDropdown: HTMLButtonElement = button({ style: "margin-left:0em; height:1.5em; width: 10px; padding: 0px; font-size: 8px;", onclick: () => this._toggleDropdownMenu(DropdownID.Vibrato) }, "▼");
    private readonly _vibratoSelectRow: HTMLElement = div({ class: "selectRow" }, span({ class: "tip", onclick: () => this._openPrompt("vibrato") }, "Vibrato:"), this._vibratoDropdown, div({ class: "selectContainer", style: "width: 61.5%;" }, this._vibratoSelect));
    private readonly _vibratoDepthSlider: Slider = new Slider(input({ style: "margin: 0;", type: "range", min: "0", max: Config.modulators.dictionary["vibrato depth"].maxRawVol, value: "0", step: "1" }), this._doc, (oldValue: number, newValue: number) => new ChangeVibratoDepth(this._doc, oldValue, newValue), false);
    private readonly _vibratoDepthRow: HTMLElement = div({ class: "selectRow" }, span({ class: "tip", style: "margin-left:10px;", onclick: () => this._openPrompt("vibratoDepth") }, "Depth:"), this._vibratoDepthSlider.container);
    private readonly _vibratoSpeedSlider: Slider = new Slider(input({ style: "margin: 0;", type: "range", min: "0", max: Config.modulators.dictionary["vibrato speed"].maxRawVol, value: "0", step: "1" }), this._doc, (oldValue: number, newValue: number) => new ChangeVibratoSpeed(this._doc, oldValue, newValue), false);
    private readonly _vibratoSpeedRow: HTMLElement = div({ class: "selectRow" }, span({ class: "tip", style: "margin-left:10px;", onclick: () => this._openPrompt("vibratoSpeed") }, "Speed:"), this._vibratoSpeedSlider.container);
    private readonly _vibratoDelaySlider: Slider = new Slider(input({ style: "margin: 0;", type: "range", min: "0", max: Config.modulators.dictionary["vibrato delay"].maxRawVol, value: "0", step: "1" }), this._doc, (oldValue: number, newValue: number) => new ChangeVibratoDelay(this._doc, oldValue, newValue), false);
    private readonly _vibratoDelayRow: HTMLElement = div({ class: "selectRow" }, span({ class: "tip", style: "margin-left:10px;", onclick: () => this._openPrompt("vibratoDelay") }, "Delay:"), this._vibratoDelaySlider.container);
    private readonly _vibratoTypeSelect: HTMLSelectElement = buildOptions(select(), Config.vibratoTypes.map(vibrato => vibrato.name));
    private readonly _vibratoTypeSelectRow: HTMLElement = div({ class: "selectRow" }, span({ class: "tip", style: "margin-left:10px;", onclick: () => this._openPrompt("vibratoType") }, "Type:"), div({ class: "selectContainer", style: "width: 61.5%;" }, this._vibratoTypeSelect));
    private readonly _vibratoDropdownGroup: HTMLElement = div({ class: "editor-controls", style: "display: none;" }, this._vibratoDepthRow, this._vibratoSpeedRow, this._vibratoDelayRow, this._vibratoTypeSelectRow);
    private readonly _phaseModGroup: HTMLElement = div({ class: "editor-controls" });
    private readonly _feedbackTypeSelect: HTMLSelectElement = buildOptions(select(), Config.feedbacks.map(feedback => feedback.name));
    private readonly _feedbackRow1: HTMLDivElement = div({ class: "selectRow" }, span({ class: "tip", onclick: () => this._openPrompt("feedbackType") }, "Feedback:"), div({ class: "selectContainer" }, this._feedbackTypeSelect));
    private readonly _spectrumEditor: SpectrumEditor = new SpectrumEditor(this._doc, null);
    private readonly _spectrumRow: HTMLElement = div({ class: "selectRow" }, span({ class: "tip", onclick: () => this._openPrompt("spectrum") }, "Spectrum:"), this._spectrumEditor.container);
    private readonly _harmonicsEditor: HarmonicsEditor = new HarmonicsEditor(this._doc);
    private readonly _harmonicsRow: HTMLElement = div({ class: "selectRow" }, span({ class: "tip", onclick: () => this._openPrompt("harmonics") }, "Harmonics:"), this._harmonicsEditor.container);
    private readonly _envelopeEditor: EnvelopeEditor = new EnvelopeEditor(this._doc);
    private readonly _drumsetGroup: HTMLElement = div({ class: "editor-controls" });
    private readonly _modulatorGroup: HTMLElement = div({ class: "editor-controls" });
    private readonly _modNameRows: HTMLElement[];
    private readonly _modChannelBoxes: HTMLSelectElement[];
    private readonly _modInstrumentBoxes: HTMLSelectElement[];
    private readonly _modSetRows: HTMLElement[];
    private readonly _modSetBoxes: HTMLSelectElement[];
    private readonly _modFilterRows: HTMLElement[];
    private readonly _modFilterBoxes: HTMLSelectElement[];
    private readonly _modTargetIndicators: SVGElement[];

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


    private readonly _feedbackAmplitudeSlider: Slider = new Slider(input({ type: "range", min: "0", max: Config.operatorAmplitudeMax, value: "0", step: "1", title: "Feedback Amplitude" }), this._doc, (oldValue: number, newValue: number) => new ChangeFeedbackAmplitude(this._doc, oldValue, newValue), false);
    private readonly _feedbackRow2: HTMLDivElement = div({ class: "selectRow" }, span({ class: "tip", onclick: () => this._openPrompt("feedbackVolume") }, "Fdback Vol:"), this._feedbackAmplitudeSlider.container);
    /*
     * @jummbus - my very real, valid reason for cutting this button: I don't like it.
     * 
    private readonly _customizeInstrumentButton: HTMLButtonElement = button({type: "button", style: "margin: 2px 0"},

        "Customize Instrument",
    );
    */
    private readonly _addEnvelopeButton: HTMLButtonElement = button({ type: "button", class: "add-envelope" });
    private readonly _customInstrumentSettingsGroup: HTMLDivElement = div({ class: "editor-controls" },
        this._chipWaveSelectRow,
        this._chipNoiseSelectRow,
        this._customWaveDraw,
        this._eqFilterTypeRow,
        this._eqFilterRow,
        this._eqFilterSimpleCutRow,
        this._eqFilterSimplePeakRow,
        this._fadeInOutRow,
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
        div({ style: `padding: 2px 0; margin-left: 2em; display: flex; align-items: center;` },
            span({ style: `flex-grow: 1; text-align: center;` }, span({ class: "tip", onclick: () => this._openPrompt("effects") }, "Effects")),
            div({ class: "effects-menu" }, this._effectsSelect),
        ),
        this._transitionRow,
        this._transitionDropdownGroup,
        this._chordSelectRow,
        this._chordDropdownGroup,
        this._pitchShiftRow,
        this._detuneSliderRow,
        this._vibratoSelectRow,
        this._vibratoDropdownGroup,
        this._noteFilterTypeRow,
        this._noteFilterRow,
        this._noteFilterSimpleCutRow,
        this._noteFilterSimplePeakRow,
        this._distortionRow,
        this._aliasingRow,
        this._bitcrusherQuantizationRow,
        this._bitcrusherFreqRow,
        this._panSliderRow,
        this._panDropdownGroup,
        this._chorusRow,
        this._echoSustainRow,
        this._echoDelayRow,
        this._reverbRow,
        div({ style: `padding: 2px 0; margin-left: 2em; display: flex; align-items: center;` },
            span({ style: `flex-grow: 1; text-align: center;` }, span({ class: "tip", onclick: () => this._openPrompt("envelopes") }, "Envelopes")),
            this._addEnvelopeButton,
        ),
        this._envelopeEditor.container,
    );
    private readonly _instrumentCopyGroup: HTMLDivElement = div({ class: "editor-controls" },
        div({ class: "selectRow" },
            this._instrumentCopyButton,
            this._instrumentPasteButton,
        ),
    );
    private readonly _instrumentSettingsTextRow: HTMLDivElement = div({ id: "instrumentSettingsText", style: `padding: 3px 0; max-width: 15em; text-align: center; color: ${ColorConfig.secondaryText};` },
        "Instrument Settings"
    );
    private readonly _instrumentSettingsGroup: HTMLDivElement = div({ class: "editor-controls" },
        this._instrumentSettingsTextRow,
        this._instrumentsButtonRow,
        div({ class: "selectRow", id: "typeSelectRow" },
            span({ class: "tip", onclick: () => this._openPrompt("instrumentType") }, "Type:"),
            div(
                div({ class: "pitchSelect" }, this._pitchedPresetSelect),
                div({ class: "drumSelect" }, this._drumPresetSelect)
            ),
        ),
        this._instrumentVolumeSliderRow,
        //this._customizeInstrumentButton,
        this._customInstrumentSettingsGroup,
    );
    private readonly _usedPatternIndicator: SVGElement = SVG.path({ d: "M -6 -6 H 6 V 6 H -6 V -6 M -2 -3 L -2 -3 L -1 -4 H 1 V 4 H -1 V -1.2 L -1.2 -1 H -2 V -3 z", fill: ColorConfig.indicatorSecondary, "fill-rule": "evenodd" });
    private readonly _usedInstrumentIndicator: SVGElement = SVG.path({ d: "M -6 -0.8 H -3.8 V -6 H 0.8 V 4.4 H 2.2 V -0.8 H 6 V 0.8 H 3.8 V 6 H -0.8 V -4.4 H -2.2 V 0.8 H -6 z", fill: ColorConfig.indicatorSecondary });
    private readonly _jumpToModIndicator: SVGElement = SVG.svg({style: "width: 92%; height: 1.3em; flex-shrink: 0; position: absolute;", viewBox: "0 0 200 200" }, [
        SVG.path({ d: "M90 155 l0 -45 -45 0 c-25 0 -45 -4 -45 -10 0 -5 20 -10 45 -10 l45 0 0 -45 c0 -25 5 -45 10 -45 6 0 10 20 10 45 l0 45 45 0 c25 0 45 5 45 10 0 6 -20 10 -45 10 l -45 0 0 45 c0 25 -4 45 -10 45 -5 0 -10 -20 -10 -45z" }),
        SVG.path({ d: "M42 158 c-15 -15 -16 -38 -2 -38 6 0 10 7 10 15 0 8 7 15 15 15 8 0 15 5 15 10 0 14 -23 13 -38 -2z" }),
        SVG.path({ d: "M120 160 c0 -5 7 -10 15 -10 8 0 15 -7 15 -15 0 -8 5 -15 10 -15 14 0 13 23 -2 38 -15 15 -38 16 -38 2z" }),
        SVG.path({ d: "M32 58 c3 -23 48 -40 48 -19 0 6 -7 11 -15 11 -8 0 -15 7 -15 15 0 8 -5 15 -11 15 -6 0 -9 -10 -7 -22z" }),
        SVG.path({ d: "M150 65 c0 -8 -7 -15 -15 -15 -8 0 -15 -4 -15 -10 0 -14 23 -13 38 2 15 15 16 38 2 38 -5 0 -10 -7 -10 -15z" })]);

    private readonly _promptContainer: HTMLDivElement = div({ class: "promptContainer", style: "display: none;" });
    private readonly _zoomInButton: HTMLButtonElement = button({ class: "zoomInButton", type: "button", title: "Zoom In" });
    private readonly _zoomOutButton: HTMLButtonElement = button({ class: "zoomOutButton", type: "button", title: "Zoom Out" });
    private readonly _patternEditorRow: HTMLDivElement = div({ style: "flex: 1; height: 100%; display: flex; overflow: hidden; justify-content: center;" },
        this._patternEditorPrev.container,
        this._patternEditor.container,
        this._patternEditorNext.container,
    );
    private readonly _patternArea: HTMLDivElement = div({ class: "pattern-area" },
        this._piano.container,
        this._patternEditorRow,
        this._octaveScrollBar.container,
        this._zoomInButton,
        this._zoomOutButton,
    );
    private readonly _trackContainer: HTMLDivElement = div({ class: "trackContainer" },
        this._trackEditor.container,
        this._loopEditor.container,
    );
    private readonly _trackVisibleArea: HTMLDivElement = div({ style: "position: absolute; width: 100%; height: 100%; pointer-events: none;" });
    private readonly _trackAndMuteContainer: HTMLDivElement = div({ class: "trackAndMuteContainer" },
        this._muteEditor.container,
        this._trackContainer,
        this._trackVisibleArea,
    );
    public readonly _barScrollBar: BarScrollBar = new BarScrollBar(this._doc, this._trackAndMuteContainer);
    private readonly _trackArea: HTMLDivElement = div({ class: "track-area" },
        this._trackAndMuteContainer,
        this._barScrollBar.container,
    );

    private readonly _instrumentSettingsArea: HTMLDivElement = div({ class: "instrument-settings-area" },
        this._instrumentSettingsGroup,
        this._modulatorGroup);
    public readonly _settingsArea: HTMLDivElement = div({ class: "settings-area noSelection" },
        div({ class: "version-area" },
            div({ style: `text-align: center; margin: 3px 0; color: ${ColorConfig.secondaryText};` },
                this._songTitleInputBox.input,
            ),
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
                        "Song Settings",
                        div({ style: "width: 100%; left: 0; top: -1px; position:absolute; overflow-x:clip;" }, this._jumpToModIndicator),
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
                    span({ class: "tip", onclick: () => this._openPrompt("rhythm") }, "Rhythm: "),
                    div({ class: "selectContainer" }, this._rhythmSelect),
                ),
            ),
        ),
        this._instrumentSettingsArea,
    );

    public readonly mainLayer: HTMLDivElement = div({ class: "beepboxEditor", tabIndex: "0" },
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
    private readonly _operatorRows: HTMLDivElement[] = [];
    private readonly _operatorAmplitudeSliders: Slider[] = [];
    private readonly _operatorFrequencySelects: HTMLSelectElement[] = [];
    private readonly _operatorDropdowns: HTMLButtonElement[] = [];
    private readonly _operatorWaveformSelects: HTMLSelectElement[] = [];
    private readonly _operatorWaveformHints: HTMLSpanElement[] = [];
    private readonly _operatorWaveformPulsewidthSliders: Slider[] = [];
    private readonly _operatorDropdownRows: HTMLElement[] = []
    private readonly _operatorDropdownGroups: HTMLDivElement[] = [];
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
    private _openOperatorDropdowns: boolean[] = [];

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

        this._showModSliders = new Array<boolean>(Config.modulators.length);
        this._modSliderValues = new Array<number>(Config.modulators.length);

        this._phaseModGroup.appendChild(div({ class: "selectRow", style: `color: ${ColorConfig.secondaryText}; height: 1em; margin-top: 0.5em;` },
            div({ style: "margin-right: .1em; visibility: hidden;" }, 1 + "."),
            div({ style: "width: 3em; margin-right: .3em;", class: "tip", onclick: () => this._openPrompt("operatorFrequency") }, "Freq:"),
            div({ class: "tip", onclick: () => this._openPrompt("operatorVolume") }, "Volume:"),
        ));
        for (let i: number = 0; i < Config.operatorCount; i++) {
            const operatorIndex: number = i;
            const operatorNumber: HTMLDivElement = div({ style: "margin-right: 0px; color: " + ColorConfig.secondaryText + ";" }, i + 1 + "");
            const frequencySelect: HTMLSelectElement = buildOptions(select({ style: "width: 100%;", title: "Frequency" }), Config.operatorFrequencies.map(freq => freq.name));
            const amplitudeSlider: Slider = new Slider(input({ type: "range", min: "0", max: Config.operatorAmplitudeMax, value: "0", step: "1", title: "Volume" }), this._doc, (oldValue: number, newValue: number) => new ChangeOperatorAmplitude(this._doc, operatorIndex, oldValue, newValue), false);
            const waveformSelect: HTMLSelectElement = buildOptions(select({ style: "width: 100%;", title: "Waveform" }), Config.operatorWaves.map(wave => wave.name));
            const waveformDropdown: HTMLButtonElement = button({ style: "margin-left:0em; margin-right: 2px; height:1.5em; width: 8px; max-width: 10px; padding: 0px; font-size: 8px;", onclick: () => this._toggleDropdownMenu(DropdownID.FM, i) }, "▼");
            const waveformDropdownHint: HTMLSpanElement = span({ class: "tip", style: "margin-left: 10px;", onclick: () => this._openPrompt("operatorWaveform") }, "Wave:");
            const waveformPulsewidthSlider: Slider = new Slider(input({ style: "margin-left: 10px; width: 85%;", type: "range", min: "0", max: Config.pwmOperatorWaves.length - 1, value: "0", step: "1", title: "Pulse Width" }), this._doc, (oldValue: number, newValue: number) => new ChangeOperatorPulseWidth(this._doc, operatorIndex, oldValue, newValue), true);
            const waveformDropdownRow: HTMLElement = div({ class: "selectRow" }, waveformDropdownHint, waveformPulsewidthSlider.container,
                div({ class: "selectContainer", style: "width: 6em; margin-left: .3em;" }, waveformSelect));
            const waveformDropdownGroup: HTMLDivElement = div({ class: "operatorRow" }, waveformDropdownRow);
            const row: HTMLDivElement = div({ class: "selectRow" },
                operatorNumber,
                waveformDropdown,
                div({ class: "selectContainer", style: "width: 3em; margin-right: .3em;" }, frequencySelect),
                amplitudeSlider.container,
            );
            this._phaseModGroup.appendChild(row);
            this._operatorRows[i] = row;
            this._operatorAmplitudeSliders[i] = amplitudeSlider;
            this._operatorFrequencySelects[i] = frequencySelect;
            this._operatorDropdowns[i] = waveformDropdown;
            this._operatorWaveformHints[i] = waveformDropdownHint;
            this._operatorWaveformSelects[i] = waveformSelect;
            this._operatorWaveformPulsewidthSliders[i] = waveformPulsewidthSlider;
            this._operatorDropdownRows[i] = waveformDropdownRow;
            this._phaseModGroup.appendChild(waveformDropdownGroup);
            this._operatorDropdownGroups[i] = waveformDropdownGroup;
            this._openOperatorDropdowns[i] = false;

            waveformSelect.addEventListener("change", () => {
                this._doc.record(new ChangeOperatorWaveform(this._doc, operatorIndex, waveformSelect.selectedIndex));
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
        this._modFilterRows = [];
        this._modFilterBoxes = [];
        this._modTargetIndicators = [];
        for (let mod: number = 0; mod < Config.modCount; mod++) {

            let modChannelBox: HTMLSelectElement = select({ style: "width: 100%; color: currentColor; text-overflow:ellipsis;" });
            let modInstrumentBox: HTMLSelectElement = select({ style: "width: 100%; color: currentColor;" });

            let modNameRow: HTMLDivElement = div({ class: "operatorRow", style: "height: 1em; margin-bottom: 0.65em;" },
                div({ class: "tip", style: "width: 10%; max-width: 5.4em;", id: "modChannelText" + mod, onclick: () => this._openPrompt("modChannel") }, "Ch:"),
                div({ class: "selectContainer", style: 'width: 25%;' }, modChannelBox),
                div({ class: "tip", style: "width: 1.2em; margin-left: 0.8em;", id: "modInstrumentText" + mod, onclick: () => this._openPrompt("modInstrument") }, "Ins:"),
                div({ class: "selectContainer", style: "width: 10%;" }, modInstrumentBox),
            );

            let modSetBox: HTMLSelectElement = select();
            let modFilterBox: HTMLSelectElement = select();
            let modSetRow: HTMLDivElement = div({ class: "selectRow", id: "modSettingText" + mod, style: "margin-bottom: 0.9em; color: currentColor;" }, span({ class: "tip", onclick: () => this._openPrompt("modSet") }, "Setting: "), div({ class: "selectContainer" }, modSetBox));
            let modFilterRow: HTMLDivElement = div({ class: "selectRow", id: "modFilterText" + mod, style: "margin-bottom: 0.9em; color: currentColor;" }, span({ class: "tip", onclick: () => this._openPrompt("modFilter") }, "Target: "), div({ class: "selectContainer" }, modFilterBox));

            // @jummbus: I could template this up above and simply create from the template, especially since I also reuse it in song settings, but unsure how to do that with imperative-html :P
            let modTarget: SVGElement = SVG.svg({ style:"transform: translate(0px, 1px);", width: "1.5em", height: "1em", viewBox: "0 0 200 200" }, [
                SVG.path({ d: "M90 155 l0 -45 -45 0 c-25 0 -45 -4 -45 -10 0 -5 20 -10 45 -10 l45 0 0 -45 c0 -25 5 -45 10 -45 6 0 10 20 10 45 l0 45 45 0 c25 0 45 5 45 10 0 6 -20 10 -45 10 l -45 0 0 45 c0 25 -4 45 -10 45 -5 0 -10 -20 -10 -45z" }),
                SVG.path({ d: "M42 158 c-15 -15 -16 -38 -2 -38 6 0 10 7 10 15 0 8 7 15 15 15 8 0 15 5 15 10 0 14 -23 13 -38 -2z" }),
                SVG.path({ d: "M120 160 c0 -5 7 -10 15 -10 8 0 15 -7 15 -15 0 -8 5 -15 10 -15 14 0 13 23 -2 38 -15 15 -38 16 -38 2z" }),
                SVG.path({ d: "M32 58 c3 -23 48 -40 48 -19 0 6 -7 11 -15 11 -8 0 -15 7 -15 15 0 8 -5 15 -11 15 -6 0 -9 -10 -7 -22z" }),
                SVG.path({ d: "M150 65 c0 -8 -7 -15 -15 -15 -8 0 -15 -4 -15 -10 0 -14 23 -13 38 2 15 15 16 38 2 38 -5 0 -10 -7 -10 -15z" })]);

            this._modNameRows.push(modNameRow);
            this._modChannelBoxes.push(modChannelBox);
            this._modInstrumentBoxes.push(modInstrumentBox);
            this._modSetRows.push(modSetRow);
            this._modSetBoxes.push(modSetBox);
            this._modFilterRows.push(modFilterRow);
            this._modFilterBoxes.push(modFilterBox);
            this._modTargetIndicators.push(modTarget);

            this._modulatorGroup.appendChild(div({ style: "margin: 3px 0; font-weight: bold; margin-bottom: 0.7em; text-align: center; color: " + ColorConfig.secondaryText + "; background: " + ColorConfig.uiWidgetBackground + ";" }, ["Modulator " + (mod + 1), modTarget]));
            this._modulatorGroup.appendChild(modNameRow);
            this._modulatorGroup.appendChild(modSetRow);
            this._modulatorGroup.appendChild(modFilterRow);

        }

        // @jummbus - Unsure why this hack is needed for alignment, but I've never been a css wiz...
        this._pitchShiftSlider.container.style.setProperty("transform", "translate(0px, 3px)");
        this._pitchShiftSlider.container.style.setProperty("width", "100%");

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
        this._instrumentsButtonBar.addEventListener("click", this._whenSelectInstrument);
        //this._customizeInstrumentButton.addEventListener("click", this._whenCustomizePressed);
        this._feedbackTypeSelect.addEventListener("change", this._whenSetFeedbackType);
        this._chipWaveSelect.addEventListener("change", this._whenSetChipWave);
        this._chipNoiseSelect.addEventListener("change", this._whenSetNoiseWave);
        this._transitionSelect.addEventListener("change", this._whenSetTransition);
        this._effectsSelect.addEventListener("change", this._whenSetEffects);
        this._unisonSelect.addEventListener("change", this._whenSetUnison);
        this._chordSelect.addEventListener("change", this._whenSetChord);
        this._vibratoSelect.addEventListener("change", this._whenSetVibrato);
        this._vibratoTypeSelect.addEventListener("change", this._whenSetVibratoType);
        this._playButton.addEventListener("click", this._togglePlay);
        this._prevBarButton.addEventListener("click", this._whenPrevBarPressed);
        this._nextBarButton.addEventListener("click", this._whenNextBarPressed);
        this._volumeSlider.input.addEventListener("input", this._setVolumeSlider);
        this._zoomInButton.addEventListener("click", this._zoomIn);
        this._zoomOutButton.addEventListener("click", this._zoomOut);
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

        let thisRef: SongEditor = this;
        for (let mod: number = 0; mod < Config.modCount; mod++) {
            this._modChannelBoxes[mod].addEventListener("change", function () { thisRef._whenSetModChannel(mod); });
            this._modInstrumentBoxes[mod].addEventListener("change", function () { thisRef._whenSetModInstrument(mod); });
            this._modSetBoxes[mod].addEventListener("change", function () { thisRef._whenSetModSetting(mod); });
            this._modFilterBoxes[mod].addEventListener("change", function () { thisRef._whenSetModFilter(mod); });
            this._modTargetIndicators[mod].addEventListener("click", function () { thisRef._whenClickModTarget(mod); });
        }

        this._jumpToModIndicator.addEventListener("click", function () { thisRef._whenClickJumpToModTarget() });

        this._patternArea.addEventListener("mousedown", this.refocusStage);
        this._fadeInOutEditor.container.addEventListener("mousedown", this.refocusStage);
        this._spectrumEditor.container.addEventListener("mousedown", this.refocusStage);
        this._eqFilterEditor.container.addEventListener("mousedown", this.refocusStage);
        this._noteFilterEditor.container.addEventListener("mousedown", this.refocusStage);
        this._harmonicsEditor.container.addEventListener("mousedown", this.refocusStage);
        this._tempoStepper.addEventListener("keydown", this._tempoStepperCaptureNumberKeys, false);
        this._addEnvelopeButton.addEventListener("click", this._addNewEnvelope);
        this._patternArea.addEventListener("contextmenu", this._disableCtrlContextMenu);
        this._trackArea.addEventListener("contextmenu", this._disableCtrlContextMenu);
        this.mainLayer.addEventListener("keydown", this._whenKeyPressed);
	this.mainLayer.addEventListener("keyup", this._whenKeyUp);
        this._instrumentCopyButton.addEventListener("click", this._copyInstrument.bind(this));
        this._instrumentPasteButton.addEventListener("click", this._pasteInstrument.bind(this));

        this._instrumentVolumeSliderInputBox.addEventListener("input", () => { this._doc.record(new ChangeVolume(this._doc, this._doc.song.channels[this._doc.channel].instruments[this._doc.getCurrentInstrument()].volume, Math.min(25.0, Math.max(-25.0, Math.round(+this._instrumentVolumeSliderInputBox.value))))) });
        this._panSliderInputBox.addEventListener("input", () => { this._doc.record(new ChangePan(this._doc, this._doc.song.channels[this._doc.channel].instruments[this._doc.getCurrentInstrument()].pan, Math.min(100.0, Math.max(0.0, Math.round(+this._panSliderInputBox.value))))) });
        this._detuneSliderInputBox.addEventListener("input", () => { this._doc.record(new ChangeDetune(this._doc, this._doc.song.channels[this._doc.channel].instruments[this._doc.getCurrentInstrument()].detune, Math.min(Config.detuneMax - Config.detuneCenter, Math.max(Config.detuneMin - Config.detuneCenter, Math.round(+this._detuneSliderInputBox.value))))) });
        this._customWaveDraw.addEventListener("input", () => { this._doc.record(new ChangeCustomWave(this._doc, this._customWaveDrawCanvas.newArray)) });
        this._twoNoteArpBox.addEventListener("input", () => { this._doc.record(new ChangeFastTwoNoteArp(this._doc, this._twoNoteArpBox.checked)) });
        //this._tieNoteTransitionBox.addEventListener("input", () => { this._doc.record(new ChangeTieNoteTransition(this._doc, this._tieNoteTransitionBox.checked)) });
        this._clicklessTransitionBox.addEventListener("input", () => { this._doc.record(new ChangeClicklessTransition(this._doc, this._clicklessTransitionBox.checked)) });
        this._aliasingBox.addEventListener("input", () => { this._doc.record(new ChangeAliasing(this._doc, this._aliasingBox.checked)) });

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
        if (window.screen.availWidth < 710 /*|| window.screen.availHeight < 710*/) {
            const layoutOption: HTMLOptionElement = <HTMLOptionElement>this._optionsMenu.querySelector("[value=layout]");
            layoutOption.disabled = true;
            layoutOption.setAttribute("hidden", "");
        }
    }

    private _toggleDropdownMenu(dropdown: DropdownID, submenu: number = 0): void {
        let target: HTMLButtonElement = this._vibratoDropdown;
        let group: HTMLElement = this._vibratoDropdownGroup;
        switch (dropdown) {
            case DropdownID.Vibrato:
                target = this._vibratoDropdown;
                this._openVibratoDropdown = this._openVibratoDropdown ? false : true;
                group = this._vibratoDropdownGroup;
                break;
            case DropdownID.Pan:
                target = this._panDropdown;
                this._openPanDropdown = this._openPanDropdown ? false : true;
                group = this._panDropdownGroup;
                break;
            case DropdownID.Chord:
                target = this._chordDropdown;
                this._openChordDropdown = this._openChordDropdown ? false : true;
                group = this._chordDropdownGroup;
                break;
            case DropdownID.Transition:
                target = this._transitionDropdown;
                this._openTransitionDropdown = this._openTransitionDropdown ? false : true;
                group = this._transitionDropdownGroup;
                break;
            case DropdownID.FM:
                target = this._operatorDropdowns[submenu];
                this._openOperatorDropdowns[submenu] = this._openOperatorDropdowns[submenu] ? false : true;
                group = this._operatorDropdownGroups[submenu];
                break;
        }

        if (target.textContent == "▼") {
            let instrument: Instrument = this._doc.song.channels[this._doc.channel].instruments[this._doc.getCurrentInstrument()];
            target.textContent = "▲";
            if (group != this._chordDropdownGroup) {
                group.style.display = "";
            } // Only show arpeggio dropdown if chord arpeggiates
            else if (instrument.chord == Config.chords.dictionary["arpeggio"].index) {
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

            for (let setting: number = 0; setting < Config.modulators.length; setting++) {
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

                function updateModSlider(editor: SongEditor, slider: Slider, setting: number, channel: number, instrument: number): boolean {
                    if (editor._doc.synth.isModActive(setting, channel, instrument)) {
                        let currentVal: number = (editor._doc.synth.getModValue(setting, channel, instrument, false) - Config.modulators[setting].convertRealFactor) / Config.modulators[setting].maxRawVol;
                        if (currentVal != editor._modSliderValues[setting]) {
                            editor._modSliderValues[setting] = currentVal;
                            slider.container.style.setProperty("--mod-position", (currentVal * 96.0 + 2.0) + "%");
                        }
                        return true;
                    }
                    return false;
                }

                // Set mod sliders to present values
                for (let setting: number = 0; setting < Config.modulators.length; setting++) {
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
                for (let setting: number = 0; setting < Config.modulators.length; setting++) {
                    this._newShowModSliders[setting] = false;
                }
            }

            // Class or unclass mod sliders based on present status
            if (anyModActive || this._hasActiveModSliders) {

                let anySliderActive: boolean = false;

                for (let setting: number = 0; setting < Config.modulators.length; setting++) {
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

    private _getSliderForModSetting(setting: number): Slider | null {
        switch (setting) {
            case Config.modulators.dictionary["pan"].index:
                return this._panSlider;
            case Config.modulators.dictionary["detune"].index:
                return this._detuneSlider;
            case Config.modulators.dictionary["fm slider 1"].index:
                return this._operatorAmplitudeSliders[0];
            case Config.modulators.dictionary["fm slider 2"].index:
                return this._operatorAmplitudeSliders[1];
            case Config.modulators.dictionary["fm slider 3"].index:
                return this._operatorAmplitudeSliders[2];
            case Config.modulators.dictionary["fm slider 4"].index:
                return this._operatorAmplitudeSliders[3];
            case Config.modulators.dictionary["fm feedback"].index:
                return this._feedbackAmplitudeSlider;
            case Config.modulators.dictionary["pulse width"].index:
                return this._pulseWidthSlider;
            case Config.modulators.dictionary["reverb"].index:
                return this._reverbSlider;
            case Config.modulators.dictionary["distortion"].index:
                return this._distortionSlider;
            case Config.modulators.dictionary["volume"].index:
                return this._instrumentVolumeSlider;
            case Config.modulators.dictionary["vibrato depth"].index:
                return this._vibratoDepthSlider;
            case Config.modulators.dictionary["vibrato speed"].index:
                return this._vibratoSpeedSlider;
            case Config.modulators.dictionary["vibrato delay"].index:
                return this._vibratoDelaySlider;
            case Config.modulators.dictionary["arp speed"].index:
                return this._arpeggioSpeedSlider;
            case Config.modulators.dictionary["pan delay"].index:
                return this._panDelaySlider;
            case Config.modulators.dictionary["tempo"].index:
                return this._tempoSlider;
            case Config.modulators.dictionary["song volume"].index:
                return this._volumeSlider;
            case Config.modulators.dictionary["eq filt cut"].index:
                return this._eqFilterSimpleCutSlider;
            case Config.modulators.dictionary["eq filt peak"].index:
                return this._eqFilterSimplePeakSlider;
            case Config.modulators.dictionary["note filt cut"].index:
                return this._noteFilterSimpleCutSlider;
            case Config.modulators.dictionary["note filt peak"].index:
                return this._noteFilterSimplePeakSlider;
            case Config.modulators.dictionary["bit crush"].index:
                return this._bitcrusherQuantizationSlider;
            case Config.modulators.dictionary["freq crush"].index:
                return this._bitcrusherFreqSlider;
            case Config.modulators.dictionary["pitch shift"].index:
                return this._pitchShiftSlider;
            case Config.modulators.dictionary["chorus"].index:
                return this._chorusSlider;
            case Config.modulators.dictionary["echo"].index:
                return this._echoSustainSlider;
            case Config.modulators.dictionary["echo delay"].index:
                return this._echoDelaySlider;
            case Config.modulators.dictionary["sustain"].index:
                return this._stringSustainSlider;
            default:
                return null;
        }

    }

    public changeInstrument(index: number): void {
        // TODO: Port feature from beepbox
        //this._instrumentSelect.selectedIndex = index;
        //this._whenSetInstrument();
    }

    private _openPrompt(promptName: string): void {
        this._doc.openPrompt(promptName);
        this._setPrompt(promptName);
    }

    private _setPrompt(promptName: string | null): void {
        if (this._currentPromptName == promptName) return;
        this._currentPromptName = promptName;

        if (this.prompt) {
            if (this._wasPlaying && !(this.prompt instanceof TipPrompt || this.prompt instanceof LimiterPrompt || this.prompt instanceof CustomChipPrompt || this.prompt instanceof CustomFilterPrompt)) {
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
                case "customEQFilterSettings":
                    this.prompt = new CustomFilterPrompt(this._doc, this, false);
                    break;
                case "customNoteFilterSettings":
                    this.prompt = new CustomFilterPrompt(this._doc, this, true);
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
                if (!(this.prompt instanceof TipPrompt || this.prompt instanceof LimiterPrompt || this.prompt instanceof CustomChipPrompt || this.prompt instanceof CustomFilterPrompt)) {
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
        const trackBounds: DOMRect = this._trackVisibleArea.getBoundingClientRect();
        this._doc.trackVisibleBars = Math.floor((trackBounds.right - trackBounds.left - (this._doc.enableChannelMuting ? 32 : 0)) / this._doc.getBarWidth());
        this._doc.trackVisibleChannels = Math.floor((trackBounds.bottom - trackBounds.top - 30) / this._doc.getChannelHeight());
        for (let i: number = this._doc.song.pitchChannelCount + this._doc.song.noiseChannelCount; i < this._doc.song.channels.length; i++) {
            const channel: Channel = this._doc.song.channels[i];
            for (let j: number = 0; j < channel.instruments.length; j++) {
                this._doc.synth.determineInvalidModulators(channel.instruments[j]);
            }
        }
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
            this._zoomInButton.style.display = (this._doc.channel < this._doc.song.pitchChannelCount) ? "" : "none";
            this._zoomOutButton.style.display = (this._doc.channel < this._doc.song.pitchChannelCount) ? "" : "none";
            this._zoomInButton.style.right = this._doc.showScrollBar ? "24px" : "4px";
            this._zoomOutButton.style.right = this._doc.showScrollBar ? "24px" : "4px";
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
            (this._doc.autoPlay ? "✓ " : "　") + "Auto Play On Load",
            (this._doc.autoFollow ? "✓ " : "　") + "Auto Follow Track",
            (this._doc.enableNotePreview ? "✓ " : "　") + "Preview Added Notes",
            (this._doc.showLetters ? "✓ " : "　") + "Show Piano Keys",
            (this._doc.showFifth ? "✓ " : "　") + 'Highlight "Fifth" Notes',
            (this._doc.notesOutsideScale ? "✓ " : "　") + "Allow Notes Outside Scale",
            (this._doc.defaultScale == this._doc.song.scale ? "✓ " : "　") + "Use Current Scale as Default",
            (this._doc.showChannels ? "✓ " : "　") + "Show All Channels",
            (this._doc.showScrollBar ? "✓ " : "　") + "Octave Scroll Bar",
            (this._doc.alwaysFineNoteVol ? "✓ " : "") + "Always Fine Note Vol.",
            (this._doc.enableChannelMuting ? "✓ " : "　") + "Enable Channel Muting",
            (this._doc.displayBrowserUrl ? "✓ " : "　") + "Display Song Data in URL",
            (this._doc.displayVolumeBar ? "✓ " : "　") + "Show Playback Volume",
            "　Set Layout...",
            "　Set Theme...",
        ];
        for (let i: number = 0; i < optionCommands.length; i++) {
            const option: HTMLOptionElement = <HTMLOptionElement>this._optionsMenu.children[i + 1];
            if (option.textContent != optionCommands[i]) option.textContent = optionCommands[i];
        }

        const channel: Channel = this._doc.song.channels[this._doc.channel];
        const instrumentIndex: number = this._doc.getCurrentInstrument();
        const instrument: Instrument = channel.instruments[instrumentIndex];
        const wasActive: boolean = this.mainLayer.contains(document.activeElement);
        const activeElement: Element | null = document.activeElement;
        const colors: ChannelColors = ColorConfig.getChannelColor(this._doc.song, this._doc.channel);

        for (let i: number = this._effectsSelect.childElementCount - 1; i < Config.effectOrder.length; i++) {
            this._effectsSelect.appendChild(option({ value: i }));
        }
        this._effectsSelect.selectedIndex = -1;
        for (let i: number = 0; i < Config.effectOrder.length; i++) {
            let effectFlag: number = Config.effectOrder[i];
            const selected: boolean = ((instrument.effects & (1 << effectFlag)) != 0);
            const label: string = (selected ? "✓ " : "　") + Config.effectNames[effectFlag];
            const option: HTMLOptionElement = <HTMLOptionElement>this._effectsSelect.children[i + 1];
            if (option.textContent != label) option.textContent = label;
        }

        setSelectedValue(this._scaleSelect, this._doc.song.scale);
        this._scaleSelect.title = Config.scales[this._doc.song.scale].realName;
        setSelectedValue(this._keySelect, Config.keys.length - 1 - this._doc.song.key);
        this._tempoSlider.updateValue(Math.max(0, Math.round(this._doc.song.tempo)));
        this._tempoStepper.value = Math.round(this._doc.song.tempo).toString();
        this._songTitleInputBox.updateValue(this._doc.song.title);

        this._eqFilterTypeRow.style.setProperty("--text-color-lit", colors.primaryNote);
        this._eqFilterTypeRow.style.setProperty("--text-color-dim", colors.secondaryNote);
        this._eqFilterTypeRow.style.setProperty("--background-color-lit", colors.primaryChannel);
        this._eqFilterTypeRow.style.setProperty("--background-color-dim", colors.secondaryChannel);

        if (instrument.eqFilterType) {
            this._eqFilterSimpleButton.classList.remove("deactivated");
            this._eqFilterAdvancedButton.classList.add("deactivated");
            this._eqFilterRow.style.display = "none";
            this._eqFilterSimpleCutRow.style.display = "";
            this._eqFilterSimplePeakRow.style.display = "";
        } else {
            this._eqFilterSimpleButton.classList.add("deactivated");
            this._eqFilterAdvancedButton.classList.remove("deactivated");
            this._eqFilterRow.style.display = "";
            this._eqFilterSimpleCutRow.style.display = "none";
            this._eqFilterSimplePeakRow.style.display = "none";
        }

        setSelectedValue(this._rhythmSelect, this._doc.song.rhythm);

        if (!this._doc.song.getChannelIsMod(this._doc.channel)) {

            this._customInstrumentSettingsGroup.style.display = "";
            this._panSliderRow.style.display = "";
            this._panDropdownGroup.style.display = (this._openPanDropdown ? "" : "none");
            this._detuneSliderRow.style.display = "";
            this._instrumentVolumeSliderRow.style.display = "";
            $("#typeSelectRow").css("display", "");
            this._instrumentSettingsGroup.appendChild(this._instrumentCopyGroup);
            this._instrumentSettingsGroup.insertBefore(this._instrumentsButtonRow, this._instrumentSettingsGroup.firstChild);
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
            // + Check if a mod targets this
            this._usageCheck(this._doc.channel, instrumentIndex);

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
                if (instrument.type == InstrumentType.harmonics || instrument.type == InstrumentType.pickedString) {
                    this._chipWaveSelectRow.style.display = "none";
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
                    this._pulseWidthRow.style.display = "";
                    this._pulseWidthSlider.input.title = prettyNumber(instrument.pulseWidth) + "%";
                    this._pulseWidthSlider.updateValue(instrument.pulseWidth);
                } else {
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
                    for (let i: number = 0; i < Config.operatorCount; i++) {
                        const isCarrier: boolean = (i < Config.algorithms[instrument.algorithm].carrierCount);
                        this._operatorRows[i].style.color = isCarrier ? ColorConfig.primaryText : "";
                        setSelectedValue(this._operatorFrequencySelects[i], instrument.operators[i].frequency);
                        this._operatorAmplitudeSliders[i].updateValue(instrument.operators[i].amplitude);
                        setSelectedValue(this._operatorWaveformSelects[i], instrument.operators[i].waveform);
                        this._operatorWaveformPulsewidthSliders[i].updateValue(instrument.operators[i].pulseWidth);
                        this._operatorDropdownGroups[i].style.color = isCarrier ? ColorConfig.primaryText : "";
                        const operatorName: string = (isCarrier ? "Voice " : "Modulator ") + (i + 1);
                        this._operatorFrequencySelects[i].title = operatorName + " Frequency";
                        this._operatorAmplitudeSliders[i].input.title = operatorName + (isCarrier ? " Volume" : " Amplitude");
                        this._operatorDropdownGroups[i].style.display = (this._openOperatorDropdowns[i] ? "" : "none");
                        if (instrument.operators[i].waveform == 3) {
                            this._operatorWaveformPulsewidthSliders[i].container.style.display = "";
                            this._operatorWaveformHints[i].style.display = "none";
                        } else {
                            this._operatorWaveformPulsewidthSliders[i].container.style.display = "none";
                            this._operatorWaveformHints[i].style.display = "";
                        }
                    }
                }
                else {
                    this._algorithmSelectRow.style.display = "none";
                    this._phaseModGroup.style.display = "none";
                    this._feedbackRow1.style.display = "none";
                    this._feedbackRow2.style.display = "none";
                }
                this._pulseWidthSlider.input.title = prettyNumber(instrument.pulseWidth) + "%";


                if (effectsIncludeTransition(instrument.effects)) {
                    this._transitionRow.style.display = "";
                    if (this._openTransitionDropdown)
                        this._transitionDropdownGroup.style.display = "";
                    setSelectedValue(this._transitionSelect, instrument.transition);
                } else {
                    this._transitionDropdownGroup.style.display = "none";
                    this._transitionRow.style.display = "none";
                }

                if (effectsIncludeChord(instrument.effects)) {
                    this._chordSelectRow.style.display = "";
                    this._chordDropdown.style.display = (instrument.chord == Config.chords.dictionary["arpeggio"].index) ? "" : "none";
                    this._chordDropdownGroup.style.display = (instrument.chord == Config.chords.dictionary["arpeggio"].index && this._openChordDropdown) ? "" : "none";
                    setSelectedValue(this._chordSelect, instrument.chord);
                } else {
                    this._chordSelectRow.style.display = "none";
                    this._chordDropdown.style.display = "none";
                    this._chordDropdownGroup.style.display = "none";
                }

                if (effectsIncludePitchShift(instrument.effects)) {
                    this._pitchShiftRow.style.display = "";
                    this._pitchShiftSlider.updateValue(instrument.pitchShift);
                    this._pitchShiftSlider.input.title = (instrument.pitchShift - Config.pitchShiftCenter) + " semitone(s)";
                    for (const marker of this._pitchShiftFifthMarkers) {
                        marker.style.display = this._doc.showFifth ? "" : "none";
                    }
                } else {
                    this._pitchShiftRow.style.display = "none";
                }

                if (effectsIncludeDetune(instrument.effects)) {
                    this._detuneSliderRow.style.display = "";
                    this._detuneSlider.updateValue(instrument.detune - Config.detuneCenter);
                    this._detuneSlider.input.title = (Synth.detuneToCents(instrument.detune)) + " cent(s)";
                } else {
                    this._detuneSliderRow.style.display = "none";
                }

                if (effectsIncludeVibrato(instrument.effects)) {
                    this._vibratoSelectRow.style.display = "";
                    if (this._openVibratoDropdown)
                        this._vibratoDropdownGroup.style.display = "";
                    setSelectedValue(this._vibratoSelect, instrument.vibrato);
                } else {
                    this._vibratoDropdownGroup.style.display = "none";
                    this._vibratoSelectRow.style.display = "none";
                }

                if (effectsIncludeNoteFilter(instrument.effects)) {

                    this._noteFilterTypeRow.style.setProperty("--text-color-lit", colors.primaryNote);
                    this._noteFilterTypeRow.style.setProperty("--text-color-dim", colors.secondaryNote);
                    this._noteFilterTypeRow.style.setProperty("--background-color-lit", colors.primaryChannel);
                    this._noteFilterTypeRow.style.setProperty("--background-color-dim", colors.secondaryChannel);
                    this._noteFilterTypeRow.style.display = "";

                    this._noteFilterEditor.render();

                    if (instrument.noteFilterType) {
                        this._noteFilterSimpleButton.classList.remove("deactivated");
                        this._noteFilterAdvancedButton.classList.add("deactivated");
                        this._noteFilterRow.style.display = "none";
                        this._noteFilterSimpleCutRow.style.display = "";
                        this._noteFilterSimplePeakRow.style.display = "";
                    } else {
                        this._noteFilterSimpleButton.classList.add("deactivated");
                        this._noteFilterAdvancedButton.classList.remove("deactivated");
                        this._noteFilterRow.style.display = "";
                        this._noteFilterSimpleCutRow.style.display = "none";
                        this._noteFilterSimplePeakRow.style.display = "none";
                    }
                } else {
                    this._noteFilterRow.style.display = "none";
                    this._noteFilterSimpleCutRow.style.display = "none";
                    this._noteFilterSimplePeakRow.style.display = "none";
                    this._noteFilterTypeRow.style.display = "none";
                }

                if (effectsIncludeDistortion(instrument.effects)) {
                    this._distortionRow.style.display = "";
                    if (instrument.type == InstrumentType.chip || instrument.type == InstrumentType.customChipWave || instrument.type == InstrumentType.pwm)
                        this._aliasingRow.style.display = "";
                    else
                        this._aliasingRow.style.display = "none";
                    this._distortionSlider.updateValue(instrument.distortion);
                } else {
                    this._distortionRow.style.display = "none";
                    this._aliasingRow.style.display = "none";
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
                    if (this._openPanDropdown)
                        this._panDropdownGroup.style.display = "";
                    this._panSlider.updateValue(instrument.pan);
                } else {
                    this._panSliderRow.style.display = "none";
                    this._panDropdownGroup.style.display = "none";
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

                if (instrument.type == InstrumentType.chip || instrument.type == InstrumentType.customChipWave || instrument.type == InstrumentType.harmonics || instrument.type == InstrumentType.pickedString) {
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

            this._instrumentSettingsGroup.style.color = ColorConfig.getChannelColor(this._doc.song, this._doc.channel).primaryNote;

            setSelectedValue(this._transitionSelect, instrument.transition);
            setSelectedValue(this._vibratoSelect, instrument.vibrato);
            setSelectedValue(this._vibratoTypeSelect, instrument.vibratoType);
            setSelectedValue(this._chordSelect, instrument.chord);
            this._panSliderInputBox.value = instrument.pan + "";
            this._detuneSliderInputBox.value = (instrument.detune - Config.detuneCenter) + "";
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
            this._eqFilterSimpleCutSlider.updateValue(instrument.eqFilterSimpleCut);
            this._eqFilterSimplePeakSlider.updateValue(instrument.eqFilterSimplePeak);
            this._noteFilterSimpleCutSlider.updateValue(instrument.noteFilterSimpleCut);
            this._noteFilterSimplePeakSlider.updateValue(instrument.noteFilterSimplePeak);

            if (instrument.type == InstrumentType.customChipWave) {
                this._customWaveDrawCanvas.redrawCanvas();

                if (this.prompt instanceof CustomChipPrompt) {
                    this.prompt.customChipCanvas.render();
                }
            }

            this._renderInstrumentBar(channel, instrumentIndex, colors);
        }
        // Options for mod channel
        else {
            this._usageCheck(this._doc.channel, instrumentIndex);

            this._pitchedPresetSelect.style.display = "none";
            this._drumPresetSelect.style.display = "none";
            $("#pitchPresetSelect").parent().hide();
            $("#drumPresetSelect").parent().hide();
            this._modulatorGroup.appendChild(this._instrumentCopyGroup);

            this._modulatorGroup.insertBefore(this._instrumentsButtonRow, this._modulatorGroup.firstChild);
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
            //this._filterCutoffRow.style.display = "none";
            //this._filterResonanceRow.style.display = "none";
            //this._filterEnvelopeRow.style.display = "none";
            this._drumsetGroup.style.display = "none";
            this._customWaveDraw.style.display = "none";
            this._algorithmSelectRow.style.display = "none";
            this._phaseModGroup.style.display = "none";
            this._feedbackRow1.style.display = "none";
            this._feedbackRow2.style.display = "none";
            //this._pulseEnvelopeRow.style.display = "none";
            this._pulseWidthRow.style.display = "none";
            this._vibratoSelectRow.style.display = "none";
            this._vibratoDropdownGroup.style.display = "none";
            //this._intervalSelectRow.style.display = "none";
            this._detuneSliderRow.style.display = "none";
            this._panSliderRow.style.display = "none";
            this._panDropdownGroup.style.display = "none";

            this._modulatorGroup.style.display = "";
            this._modulatorGroup.style.color = ColorConfig.getChannelColor(this._doc.song, this._doc.channel).primaryNote;

            for (let mod: number = 0; mod < Config.modCount; mod++) {

                let instrument: Instrument = this._doc.song.channels[this._doc.channel].instruments[this._doc.getCurrentInstrument()];
                let modChannel: number = Math.max(0, instrument.modChannels[mod]);
                let modInstrument: number = instrument.modInstruments[mod];

                // Boundary checking
                if (modInstrument >= this._doc.song.channels[modChannel].instruments.length + 2 || (modInstrument > 0 && this._doc.song.channels[modChannel].instruments.length <= 1)) {
                    modInstrument = 0;
                    instrument.modInstruments[mod] = 0;
                    instrument.modulators[mod] = 0;
                }
                if (modChannel >= this._doc.song.pitchChannelCount + this._doc.song.noiseChannelCount) {
                    instrument.modInstruments[mod] = 0;
                    instrument.modulators[mod] = 0;
                }

                // Build options for modulator channels (make sure it has the right number).
                if (this._doc.recalcChannelNames || (this._modChannelBoxes[mod].children.length != 2 + this._doc.song.pitchChannelCount + this._doc.song.noiseChannelCount)) {
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

                this._modChannelBoxes[mod].selectedIndex = instrument.modChannels[mod] + 2; // Offset to get to first pitch channel

                let channel: Channel = this._doc.song.channels[modChannel];

                // Build options for modulator instruments (make sure it has the right number).
                if (this._modInstrumentBoxes[mod].children.length != channel.instruments.length + 2) {
                    while (this._modInstrumentBoxes[mod].firstChild) this._modInstrumentBoxes[mod].remove(0);
                    const instrumentList: string[] = [];
                    for (let i: number = 0; i < channel.instruments.length; i++) {
                        instrumentList.push("" + i + 1);
                    }
                    instrumentList.push("all");
                    instrumentList.push("active");
                    buildOptions(this._modInstrumentBoxes[mod], instrumentList);
                }

                // If non-zero pattern, point to which instrument(s) is/are the current
                if (channel.bars[this._doc.bar] > 0) {

                    let usedInstruments: number[] = channel.patterns[channel.bars[this._doc.bar] - 1].instruments;

                    for (let i: number = 0; i < channel.instruments.length; i++) {

                        if (usedInstruments.includes(i)) {
                            this._modInstrumentBoxes[mod].options[i].label = "🢒" + (i + 1);
                        }
                        else {
                            this._modInstrumentBoxes[mod].options[i].label = "" + (i + 1);
                        }
                    }
                }
                else {
                    for (let i: number = 0; i < channel.instruments.length; i++) {
                        this._modInstrumentBoxes[mod].options[i].label = "" + (i + 1);
                    }
                }

                // Set selected index based on instrument info.
                this._modInstrumentBoxes[mod].selectedIndex = instrument.modInstruments[mod];

                // Build options for modulator settings (based on channel settings)

                if (instrument.modChannels[mod] != -2) {
                    while (this._modSetBoxes[mod].firstChild) this._modSetBoxes[mod].remove(0);
                    const settingList: string[] = [];

                    // Make sure these names match the names declared for modulators in SynthConfig.ts.

                    settingList.push("none");

                    // Populate mod setting options for the song scope.
                    if (instrument.modChannels[mod] == -1) {
                        settingList.push("song volume");
                        settingList.push("tempo");
                        settingList.push("song reverb");
                        settingList.push("next bar");
                        settingList.push("song detune");
                    }
                    // Populate mod setting options for instrument scope.
                    else {

                        settingList.push("volume");

                        // Build a list of target instrument indices, types and other info. It will be a single type for a single instrument, but with "all" and "active" it could be more.
                        // All or active are included together. Active allows any to be set, just in case the user fiddles with which are active later.
                        let tgtInstrumentTypes: InstrumentType[] = [];
                        let anyInstrumentAdvancedEQ, anyInstrumentSimpleEQ, anyInstrumentAdvancedNote, anyInstrumentSimpleNote, anyInstrumentArps, anyInstrumentPitchShifts, anyInstrumentDetunes, anyInstrumentVibratos, anyInstrumentNoteFilters, anyInstrumentDistorts, anyInstrumentBitcrushes, anyInstrumentPans, anyInstrumentChorus, anyInstrumentEchoes, anyInstrumentReverbs: boolean = false;
                        let instrumentCandidates: number[] = [];
                        if (modInstrument >= channel.instruments.length) {
                            for (let i: number = 0; i < channel.instruments.length; i++) {
                                instrumentCandidates.push(i);
                            }
                        } else {
                            instrumentCandidates.push(modInstrument);
                        }
                        for (let i: number = 0; i < instrumentCandidates.length; i++) {
                            let instrumentIndex = instrumentCandidates[i];

                            if (!tgtInstrumentTypes.includes(channel.instruments[instrumentIndex].type))
                                tgtInstrumentTypes.push(channel.instruments[instrumentIndex].type);
                            if (channel.instruments[instrumentIndex].eqFilterType)
                                anyInstrumentSimpleEQ = true;
                            else
                                anyInstrumentAdvancedEQ = true;
                            if (effectsIncludeChord(channel.instruments[instrumentIndex].effects) && channel.instruments[instrumentIndex].getChord().arpeggiates) {
                                anyInstrumentArps = true;
                            }
                            if (effectsIncludePitchShift(channel.instruments[instrumentIndex].effects)) {
                                anyInstrumentPitchShifts = true;
                            }
                            if (effectsIncludeDetune(channel.instruments[instrumentIndex].effects)) {
                                anyInstrumentDetunes = true;
                            }
                            if (effectsIncludeVibrato(channel.instruments[instrumentIndex].effects)) {
                                anyInstrumentVibratos = true;
                            }
                            if (effectsIncludeNoteFilter(channel.instruments[instrumentIndex].effects)) {
                                anyInstrumentNoteFilters = true;
                                if (channel.instruments[instrumentIndex].noteFilterType)
                                    anyInstrumentSimpleNote = true;
                                else
                                    anyInstrumentAdvancedNote = true;
                            }
                            if (effectsIncludeDistortion(channel.instruments[instrumentIndex].effects)) {
                                anyInstrumentDistorts = true;
                            }
                            if (effectsIncludeBitcrusher(channel.instruments[instrumentIndex].effects)) {
                                anyInstrumentBitcrushes = true;
                            }
                            if (effectsIncludePanning(channel.instruments[instrumentIndex].effects)) {
                                anyInstrumentPans = true;
                            }
                            if (effectsIncludeChorus(channel.instruments[instrumentIndex].effects)) {
                                anyInstrumentChorus = true;
                            }
                            if (effectsIncludeEcho(channel.instruments[instrumentIndex].effects)) {
                                anyInstrumentEchoes = true;
                            }
                            if (effectsIncludeReverb(channel.instruments[instrumentIndex].effects)) {
                                anyInstrumentReverbs = true;
                            }

                        }
                        if (anyInstrumentAdvancedEQ) {
                            settingList.push("eq filter");
                        }
                        if (anyInstrumentSimpleEQ) {
                            settingList.push("eq filt cut");
                            settingList.push("eq filt peak");
                        }
                        if (tgtInstrumentTypes.includes(InstrumentType.fm)) {
                            settingList.push("fm slider 1");
                            settingList.push("fm slider 2");
                            settingList.push("fm slider 3");
                            settingList.push("fm slider 4");
                            settingList.push("fm feedback");
                        }
                        if (tgtInstrumentTypes.includes(InstrumentType.pwm)) {
                            settingList.push("pulse width");
                        }
                        if (tgtInstrumentTypes.includes(InstrumentType.pickedString)) {
                            settingList.push("sustain");
                        }

                        if (anyInstrumentArps) {
                            settingList.push("arpeggio speed");
                            settingList.push("reset arpeggio");
                        }
                        if (anyInstrumentPitchShifts) {
                            settingList.push("pitch shift");
                        }
                        if (anyInstrumentDetunes)
                            settingList.push("detune");

                        if (anyInstrumentVibratos) {
                            settingList.push("vibrato depth");
                            settingList.push("vibrato speed");
                            settingList.push("vibrato delay");
                        }
                        if (anyInstrumentNoteFilters) {
                            if (anyInstrumentAdvancedNote) {
                                settingList.push("note filter");
                            }
                            if (anyInstrumentSimpleNote) {
                                settingList.push("note filt cut");
                                settingList.push("note filt peak");
                            }
                        }
                        if (anyInstrumentDistorts) {
                            settingList.push("distortion");
                        }
                        if (anyInstrumentBitcrushes) {
                            settingList.push("bit crush");
                            settingList.push("freq crush");
                        }
                        if (anyInstrumentPans) {
                            settingList.push("pan");
                            settingList.push("pan delay");
                        }
                        if (anyInstrumentChorus) {
                            settingList.push("chorus");
                        }
                        if (anyInstrumentEchoes) {
                            settingList.push("echo");
                            // Disabled currently!
                            //settingList.push("echo delay");
                        }
                        if (anyInstrumentReverbs) {
                            settingList.push("reverb");
                        }

                    }

                    buildOptions(this._modSetBoxes[mod], settingList);

                    let setIndex: number = settingList.indexOf(Config.modulators[instrument.modulators[mod]].name);

                    // Catch instances where invalid set forced setting to "none"
                    if (setIndex == -1) {
                        this._modSetBoxes[mod].insertBefore(option({ value: Config.modulators[instrument.modulators[mod]].name, style: "color: red;" }, Config.modulators[instrument.modulators[mod]].name), this._modSetBoxes[mod].children[0]);
                        this._modSetBoxes[mod].selectedIndex = 0;
                        //instrument.modulators[mod] = 0;
                        //instrument.modInstruments[mod] = 0;
                        this._whenSetModSetting(mod, true);
                    }
                    else {
                        this._modSetBoxes[mod].selectedIndex = setIndex;
                        this._modSetBoxes[mod].classList.remove("invalidSetting");
                        instrument.invalidModulators[mod] = false;
                    }

                } else if (this._modSetBoxes[mod].selectedIndex > 0) {
                    this._modSetBoxes[mod].selectedIndex = 0;
                    this._whenSetModSetting(mod);
                }

                //Hide instrument select if channel is "none" or "song"
                if (instrument.modChannels[mod] < 0) {
                    ((this._modInstrumentBoxes[mod].parentElement) as HTMLDivElement).style.display = "none";
                    $("#modInstrumentText" + mod).get(0).style.display = "none";
                    $("#modChannelText" + mod).get(0).innerText = "Channel:";

                    //Hide setting select if channel is "none"
                    if (instrument.modChannels[mod] == -2) {
                        $("#modSettingText" + mod).get(0).style.display = "none";
                        ((this._modSetBoxes[mod].parentElement) as HTMLDivElement).style.display = "none";
                    }
                    else {
                        $("#modSettingText" + mod).get(0).style.display = "";
                        ((this._modSetBoxes[mod].parentElement) as HTMLDivElement).style.display = "";
                    }

                    this._modTargetIndicators[mod].style.setProperty("fill", ColorConfig.uiWidgetFocus);
                    this._modTargetIndicators[mod].classList.remove("modTarget");

                }
                else {
                    ((this._modInstrumentBoxes[mod].parentElement) as HTMLDivElement).style.display = (channel.instruments.length > 1) ? "" : "none";
                    $("#modInstrumentText" + mod).get(0).style.display = (channel.instruments.length > 1) ? "" : "none";
                    $("#modChannelText" + mod).get(0).innerText = (channel.instruments.length > 1) ? "Ch:" : "Channel:";
                    $("#modSettingText" + mod).get(0).style.display = "";
                    ((this._modSetBoxes[mod].parentElement) as HTMLDivElement).style.display = "";

                    this._modTargetIndicators[mod].style.setProperty("fill", ColorConfig.indicatorPrimary);
                    this._modTargetIndicators[mod].classList.add("modTarget");
                }

                let filterType: string = Config.modulators[instrument.modulators[mod]].name;
                if (filterType == "eq filter" || filterType == "note filter") {
                    $("#modFilterText" + mod).get(0).style.display = "";
                    $("#modSettingText" + mod).get(0).style.setProperty("margin-bottom", "2px");

                    let useInstrument: number = instrument.modInstruments[mod];
                    let modChannel: Channel = this._doc.song.channels[Math.max(0, instrument.modChannels[mod])];
                    let tmpCount: number = -1;
                    if (useInstrument >= modChannel.instruments.length) {
                        // Use greatest number of dots among all instruments if setting is 'all' or 'active'. If it won't have an effect on one, no worry.
                        for (let i: number = 0; i < modChannel.instruments.length; i++) {
                            if (filterType == "eq filter") {
                                if (modChannel.instruments[i].eqFilter.controlPointCount > tmpCount) {
                                    tmpCount = modChannel.instruments[i].eqFilter.controlPointCount;
                                    useInstrument = i;
                                }
                            } else {
                                if (modChannel.instruments[i].noteFilter.controlPointCount > tmpCount) {
                                    tmpCount = modChannel.instruments[i].noteFilter.controlPointCount;
                                    useInstrument = i;
                                }
                            }
                        }
                    }

                    // Build options for modulator filters (make sure it has the right number of filter dots).
                    let dotCount: number = (filterType == "eq filter")
                        ? channel.instruments[useInstrument].eqFilter.controlPointCount
                        : channel.instruments[useInstrument].noteFilter.controlPointCount;

                    const isSimple: boolean = (filterType == "eq filter" ? channel.instruments[useInstrument].eqFilterType : channel.instruments[useInstrument].noteFilterType);
                    if (isSimple)
                        dotCount = 0;

                    if (isSimple || this._modFilterBoxes[mod].children.length != 1 + dotCount * 2) {
                        while (this._modFilterBoxes[mod].firstChild) this._modFilterBoxes[mod].remove(0);
                        const dotList: string[] = [];
                        if (!isSimple)
                            dotList.push("morph");
                        for (let i: number = 0; i < dotCount; i++) {
                            dotList.push("dot " + (i + 1) + " x");
                            dotList.push("dot " + (i + 1) + " y");
                        }
                        buildOptions(this._modFilterBoxes[mod], dotList);
                    }

                    if (isSimple || instrument.modFilterTypes[mod] >= this._modFilterBoxes[mod].length) {
                        this._modFilterBoxes[mod].classList.add("invalidSetting");
                        instrument.invalidModulators[mod] = true;
                        let useName: string = ((instrument.modFilterTypes[mod] - 1) % 2 == 1) ?
                            "dot " + (Math.floor(instrument.modFilterTypes[mod] / 2) + 1) + " y"
                            : "dot " + (Math.floor(instrument.modFilterTypes[mod] / 2) + 1) + " x";
                        this._modFilterBoxes[mod].insertBefore(option({ value: useName, style: "color: red;" }, useName), this._modFilterBoxes[mod].children[0]);
                        this._modFilterBoxes[mod].selectedIndex = 0;

                    }
                    else {
                        this._modFilterBoxes[mod].classList.remove("invalidSetting");
                        instrument.invalidModulators[mod] = false;
                        this._modFilterBoxes[mod].selectedIndex = instrument.modFilterTypes[mod];
                    }



                } else {
                    $("#modFilterText" + mod).get(0).style.display = "none";
                    $("#modSettingText" + mod).get(0).style.setProperty("margin-bottom", "0.9em");

                }
            }

            this._doc.recalcChannelNames = false;

            for (let chordIndex: number = 0; chordIndex < Config.chords.length; chordIndex++) {
                const option: Element = this._chordSelect.children[chordIndex];
                if (!option.hasAttribute("hidden")) {
                    option.setAttribute("hidden", "");
                }

            }

            //this._instrumentSelectRow.style.display = "none";

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

            this._renderInstrumentBar(channel, instrumentIndex, colors);

        }

        this._instrumentSettingsGroup.style.color = colors.primaryNote;

        this._eqFilterEditor.render();
        this._instrumentVolumeSlider.updateValue(instrument.volume);
        this._detuneSlider.updateValue(instrument.detune - Config.detuneCenter);
        this._twoNoteArpBox.checked = instrument.fastTwoNoteArp ? true : false;
        this._clicklessTransitionBox.checked = instrument.clicklessTransition ? true : false;
        this._aliasingBox.checked = instrument.aliases ? true : false;
        this._addEnvelopeButton.disabled = (instrument.envelopeCount >= Config.maxEnvelopeCount);

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

    private _renderInstrumentBar(channel: Channel, instrumentIndex: number, colors: ChannelColors) {
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

            if (this._doc.song.layeredInstruments && this._doc.song.patternInstruments && (this._doc.channel < this._doc.song.pitchChannelCount + this._doc.song.noiseChannelCount)) {
                //const pattern: Pattern | null = this._doc.getCurrentPattern();
                for (let i: number = 0; i < channel.instruments.length; i++) {
                    if (this._doc.recentPatternInstruments[this._doc.channel].indexOf(i) != -1) {
                        this._instrumentButtons[i].classList.remove("deactivated");
                    } else {
                        this._instrumentButtons[i].classList.add("deactivated");
                    }
                }
                this._deactivatedInstruments = true;
            } else if (this._deactivatedInstruments || (this._doc.channel >= this._doc.song.pitchChannelCount + this._doc.song.noiseChannelCount)) {
                for (let i: number = 0; i < channel.instruments.length; i++) {

                    this._instrumentButtons[i].classList.remove("deactivated");
                }
                this._deactivatedInstruments = false;
            }
        } else {
            this._instrumentsButtonRow.style.display = "none";
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

    private _usageCheck(channelIndex: number, instrumentIndex: number): void {
        var instrumentUsed = false;
        var patternUsed = false;
        var modUsed = false;
        const channel: Channel = this._doc.song.channels[channelIndex];

        if (channelIndex < this._doc.song.pitchChannelCount + this._doc.song.noiseChannelCount) {
            for (let modChannelIdx: number = this._doc.song.pitchChannelCount + this._doc.song.noiseChannelCount; modChannelIdx < this._doc.song.channels.length; modChannelIdx++) {
                const modChannel: Channel = this._doc.song.channels[modChannelIdx];
                const patternIdx = modChannel.bars[this._doc.bar];
                if (patternIdx > 0) {
                    const modInstrumentIdx: number = modChannel.patterns[patternIdx - 1].instruments[0];
                    const modInstrument: Instrument = modChannel.instruments[modInstrumentIdx];
                    for (let mod: number = 0; mod < Config.modCount; mod++) {
                        if (modInstrument.modChannels[mod] == channelIndex && (modInstrument.modInstruments[mod] == instrumentIndex || modInstrument.modInstruments[mod] >= channel.instruments.length)) {
                            modUsed = true;
                        }
                    }
                }
            }
        }

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
                if (channel.bars[i] != 0 && channel.bars[i] != channel.bars[this._doc.bar] &&
                    channel.patterns[channel.bars[i] - 1].instruments.includes(instrumentIndex) && i != this._doc.bar &&
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
        if (modUsed) {
            this._jumpToModIndicator.style.setProperty("display", "");
            this._jumpToModIndicator.style.setProperty("fill", ColorConfig.indicatorPrimary);
            this._jumpToModIndicator.classList.add("modTarget");
        }
        else if (channelIndex < this._doc.song.pitchChannelCount + this._doc.song.noiseChannelCount) {
            this._jumpToModIndicator.style.setProperty("display", "");
            this._jumpToModIndicator.style.setProperty("fill", ColorConfig.indicatorSecondary);
            this._jumpToModIndicator.classList.remove("modTarget");
        } else {
            this._jumpToModIndicator.style.setProperty("display", "none");
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
            if (this.prompt instanceof CustomChipPrompt || this.prompt instanceof LimiterPrompt || this.prompt instanceof CustomFilterPrompt) {
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
                if (!event.ctrlKey && !event.metaKey) {
                    new ChangePatternSelection(this._doc, 0, 0);
                    this._doc.selection.resetBoxSelection();
                }
                break;
	    case 16: // Shift
		this._patternEditor.shiftMode = true;
		break;
	    case 17: // Ctrl
		this._patternEditor.controlMode = true;
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
                this.refocusStage();
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
                this._doc.selection.resetBoxSelection();
                this._doc.selection.selectionUpdated();
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
                if (!event.ctrlKey && !event.metaKey) {
                    this._doc.selection.duplicatePatterns();
                    event.preventDefault();
                }
                break;
            case 69: // e (+shift: eq filter settings)
                if (event.shiftKey) {
                    const instrument: Instrument = this._doc.song.channels[this._doc.channel].instruments[this._doc.getCurrentInstrument()];
                    if (!instrument.eqFilterType && this._doc.channel < this._doc.song.pitchChannelCount + this._doc.song.noiseChannelCount)
                        this._openPrompt("customEQFilterSettings");
                }
                break;
            case 70: // f
                if (!event.ctrlKey && !event.metaKey) {
                    this._doc.synth.snapToStart();
                    this._doc.synth.computeLatestModValues();
                    if (this._doc.autoFollow) {
                        this._doc.selection.setChannelBar(this._doc.channel, Math.floor(this._doc.synth.playhead));
                    }
                    event.preventDefault();
                }
                break;
            case 72: // h
                if (!event.ctrlKey && !event.metaKey) {
                    this._doc.synth.goToBar(this._doc.bar);
                    this._doc.synth.snapToBar();
                    this._doc.synth.computeLatestModValues();
                    if (this._doc.autoFollow) {
                        this._doc.selection.setChannelBar(this._doc.channel, Math.floor(this._doc.synth.playhead));
                    }
                    event.preventDefault();
                }
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
                if (!event.ctrlKey && !event.metaKey) {
                    if (this._doc.enableChannelMuting) {
                        this._doc.selection.muteChannels(event.shiftKey);
                        event.preventDefault();
                    }
                }
                break;
            case 78: // n
                // Find lowest-index unused pattern for current channel
                // Ctrl+n - lowest-index completely empty pattern
                // Shift+n - note filter settings

                const group: ChangeGroup = new ChangeGroup();

                if (event.shiftKey) {
                    const instrument: Instrument = this._doc.song.channels[this._doc.channel].instruments[this._doc.getCurrentInstrument()];
                    if (effectsIncludeNoteFilter(instrument.effects) && !instrument.noteFilterType && this._doc.channel < this._doc.song.pitchChannelCount + this._doc.song.noiseChannelCount)
                        this._openPrompt("customNoteFilterSettings");
                    break;
                }
                else if (event.ctrlKey) {
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
                    if (this._doc.enableChannelMuting) {
                        // JummBox deviation: I like shift+s as just another mute toggle personally.
                        // Easier to reach than M and the shift+s invert functionality I am overwriting could be 
                        // obtained with M anyway. Useability-wise you very often want to 'add' channels on to a solo as you work.
                        if (event.shiftKey) {
                            this._doc.selection.muteChannels(false);
                        } else {
                            this._doc.selection.soloChannels(false);
                        }
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
            case 87: // w
                this._openPrompt("moveNotesSideways");
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
                    if (this._doc.autoFollow) {
                        this._doc.selection.setChannelBar(this._doc.channel, Math.floor(this._doc.synth.playhead));
                    }
                    event.preventDefault();
                }
                break;
            case 221: // right brace
                if (!event.ctrlKey && !event.metaKey) {
                    this._doc.synth.goToNextBar();
                    if (this._doc.autoFollow) {
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
                    this._doc.selection.scrollToSelection();
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
                    this._doc.selection.scrollToSelection();
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
                this._doc.selection.nextDigit("0", false, false);
                break;
            case 48: // 0
                this._doc.selection.nextDigit("0", event.shiftKey || event.ctrlKey, event.altKey);
                event.preventDefault();
                break;
            case 49: // 1
                this._doc.selection.nextDigit("1", event.shiftKey || event.ctrlKey, event.altKey);
                event.preventDefault();
                break;
            case 50: // 2
                this._doc.selection.nextDigit("2", event.shiftKey || event.ctrlKey, event.altKey);
                event.preventDefault();
                break;
            case 51: // 3
                this._doc.selection.nextDigit("3", event.shiftKey || event.ctrlKey, event.altKey);
                event.preventDefault();
                break;
            case 52: // 4
                this._doc.selection.nextDigit("4", event.shiftKey || event.ctrlKey, event.altKey);
                event.preventDefault();
                break;
            case 53: // 5
                this._doc.selection.nextDigit("5", event.shiftKey || event.ctrlKey, event.altKey);
                event.preventDefault();
                break;
            case 54: // 6
                this._doc.selection.nextDigit("6", event.shiftKey || event.ctrlKey, event.altKey);
                event.preventDefault();
                break;
            case 55: // 7
                this._doc.selection.nextDigit("7", event.shiftKey || event.ctrlKey, event.altKey);
                event.preventDefault();
                break;
            case 56: // 8
                this._doc.selection.nextDigit("8", event.shiftKey || event.ctrlKey, event.altKey);
                event.preventDefault();
                break;
            case 57: // 9
                this._doc.selection.nextDigit("9", event.shiftKey || event.ctrlKey, event.altKey);
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
        textField.textContent = text;
        document.body.appendChild(textField);
        textField.select();
        const succeeded: boolean = document.execCommand("copy");
        textField.remove();
        this.refocusStage();
        if (!succeeded) window.prompt("Copy this:", text);
    }

    private _whenPrevBarPressed = (): void => {
        this._doc.synth.goToPrevBar();
        this._barScrollBar.animatePlayhead();
    }

    private _whenNextBarPressed = (): void => {
        this._doc.synth.goToNextBar();
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
        // ...and filters
        if (this._doc.synth.isFilterModActive(false, this._doc.channel, this._doc.getCurrentInstrument())) {
            this._eqFilterEditor.render(true);
        }
        if (this._doc.synth.isFilterModActive(true, this._doc.channel, this._doc.getCurrentInstrument())) {
            this._noteFilterEditor.render(true);
        }


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

    private _copyInstrument = (): void => {
        const channel: Channel = this._doc.song.channels[this._doc.channel];
        const instrument: Instrument = channel.instruments[this._doc.getCurrentInstrument()];
        const instrumentCopy: any = instrument.toJsonObject();
        instrumentCopy["isDrum"] = this._doc.song.getChannelIsNoise(this._doc.channel);
        window.localStorage.setItem("instrumentCopy", JSON.stringify(instrumentCopy));
        this.refocusStage();
    }

    private _pasteInstrument = (): void => {
        const channel: Channel = this._doc.song.channels[this._doc.channel];
        const instrument: Instrument = channel.instruments[this._doc.getCurrentInstrument()];
        const instrumentCopy: any = JSON.parse(String(window.localStorage.getItem("instrumentCopy")));
        if (instrumentCopy != null && instrumentCopy["isDrum"] == this._doc.song.getChannelIsNoise(this._doc.channel)) {
            this._doc.record(new ChangePasteInstrument(this._doc, instrument, instrumentCopy));
        }
        this.refocusStage();
    }

    private _switchEQFilterType(toSimple: boolean) {
        const channel: Channel = this._doc.song.channels[this._doc.channel];
        const instrument: Instrument = channel.instruments[this._doc.getCurrentInstrument()];
        if (instrument.eqFilterType != toSimple) {
            this._doc.record(new ChangeEQFilterType(this._doc, instrument, toSimple));
        }
    }

    private _switchNoteFilterType(toSimple: boolean) {
        const channel: Channel = this._doc.song.channels[this._doc.channel];
        const instrument: Instrument = channel.instruments[this._doc.getCurrentInstrument()];
        if (instrument.noteFilterType != toSimple) {
            this._doc.record(new ChangeNoteFilterType(this._doc, instrument, toSimple));
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
            // Force piano to re-show, if channel is modulator
            if (this._doc.channel >= this._doc.song.pitchChannelCount + this._doc.song.noiseChannelCount) {
                this._piano.forceRender();
            }
        }

        this.refocusStage();
    }

    private _whenSetModChannel = (mod: number): void => {

        let instrument: Instrument = this._doc.song.channels[this._doc.channel].instruments[this._doc.getCurrentInstrument()];
        let previouslyUnset: boolean = (instrument.modulators[mod] == 0 || Config.modulators[instrument.modulators[mod]].forSong);

        this._doc.selection.setModChannel(mod, this._modChannelBoxes[mod].selectedIndex);

        const modChannel: number = Math.max(0, instrument.modChannels[mod]);

        // Check if setting was 'song' or 'none' and is changing to a channel number, in which case suggested instrument to mod will auto-set to the current one.
        if (this._doc.song.channels[modChannel].instruments.length > 1 && previouslyUnset && this._modChannelBoxes[mod].selectedIndex >= 2) {
            if (this._doc.song.channels[modChannel].bars[this._doc.bar] > 0) {
                this._doc.selection.setModInstrument(mod, this._doc.song.channels[modChannel].patterns[this._doc.song.channels[modChannel].bars[this._doc.bar] - 1].instruments[0]);
            }
        }

        // Force piano to re-show
        this._piano.forceRender();
    }

    private _whenSetModInstrument = (mod: number): void => {
        this._doc.selection.setModInstrument(mod, this._modInstrumentBoxes[mod].selectedIndex);

        // Force piano to re-show
        this._piano.forceRender();
    }

    private _whenSetModSetting = (mod: number, invalidIndex: boolean = false): void => {
        let text: string = "none";
        if (this._modSetBoxes[mod].selectedIndex != -1) {
            text = this._modSetBoxes[mod].children[this._modSetBoxes[mod].selectedIndex].textContent as string;

            if (invalidIndex) {
                // A setting is invalid (not in instrument's effects). It will be the first index. Allow it, but mark it as red.
                this._modSetBoxes[mod].selectedOptions.item(0)!.style.setProperty("color", "red");
                this._modSetBoxes[mod].classList.add("invalidSetting");
                this._doc.song.channels[this._doc.channel].instruments[this._doc.getCurrentInstrument()].invalidModulators[mod] = true;
            } else {
                this._modSetBoxes[mod].classList.remove("invalidSetting");
                this._doc.song.channels[this._doc.channel].instruments[this._doc.getCurrentInstrument()].invalidModulators[mod] = false;
            }
        }
        if (!invalidIndex) // Invalid index means a set is actually not occurring, just the same index and a warning.
            this._doc.selection.setModSetting(mod, text);

        // Force piano to re-show if channel is modulator, as text shown on it needs to update
        this._piano.forceRender();

    }

    private _whenClickModTarget = (mod: number): void => {
        if (this._modChannelBoxes[mod].selectedIndex >= 2) {
            this._doc.selection.setChannelBar(this._modChannelBoxes[mod].selectedIndex-2, this._doc.bar);
        }
    }

    private _whenClickJumpToModTarget = (): void => {
        const channelIndex: number = this._doc.channel;
        const instrumentIndex: number = this._doc.getCurrentInstrument();
        if (channelIndex < this._doc.song.pitchChannelCount + this._doc.song.noiseChannelCount) {
            for (let modChannelIdx: number = this._doc.song.pitchChannelCount + this._doc.song.noiseChannelCount; modChannelIdx < this._doc.song.channels.length; modChannelIdx++) {
                const modChannel: Channel = this._doc.song.channels[modChannelIdx];
                const patternIdx = modChannel.bars[this._doc.bar];
                if (patternIdx > 0) {
                    const modInstrumentIdx: number = modChannel.patterns[patternIdx - 1].instruments[0];
                    const modInstrument: Instrument = modChannel.instruments[modInstrumentIdx];
                    for (let mod: number = 0; mod < Config.modCount; mod++) {
                        if (modInstrument.modChannels[mod] == channelIndex && (modInstrument.modInstruments[mod] == instrumentIndex || modInstrument.modInstruments[mod] >= this._doc.song.channels[channelIndex].instruments.length)) {
                            this._doc.selection.setChannelBar(modChannelIdx, this._doc.bar);
                            return;
                        }
                    }
                }
            }
        }
    }

    private _whenSetModFilter = (mod: number): void => {
        this._doc.selection.setModFilter(mod, this._modFilterBoxes[mod].selectedIndex);
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
        this._doc.notifier.changed();
    }

    private _whenSetVibrato = (): void => {
        this._doc.record(new ChangeVibrato(this._doc, this._vibratoSelect.selectedIndex));
    }

    private _whenSetVibratoType = (): void => {
        this._doc.record(new ChangeVibratoType(this._doc, this._vibratoTypeSelect.selectedIndex));
    }

    private _whenSetUnison = (): void => {
        this._doc.record(new ChangeUnison(this._doc, this._unisonSelect.selectedIndex));
    }

    private _whenSetChord = (): void => {
        this._doc.record(new ChangeChord(this._doc, this._chordSelect.selectedIndex));
    }

    private _addNewEnvelope = (): void => {
        this._doc.record(new ChangeAddEnvelope(this._doc));
        this.refocusStage();
        this._doc.addedEnvelope = true;
    }

    private _zoomIn = (): void => {
        this._doc.visibleOctaves = Math.max(1, this._doc.visibleOctaves - 1);
        this._doc.savePreferences();
        this._doc.notifier.changed();
        this.refocusStage();
    }

    private _zoomOut = (): void => {
        this._doc.visibleOctaves = Math.min(Config.pitchOctaves, this._doc.visibleOctaves + 1);
        this._doc.savePreferences();
        this._doc.notifier.changed();
        this.refocusStage();
    }

    private _fileMenuHandler = (event: Event): void => {
        switch (this._fileMenu.value) {
            case "new":
                this._doc.goBackToStart();
                this._doc.song.restoreLimiterDefaults();
                for (const channel of this._doc.song.channels) {
                    channel.muted = false;
                    channel.name = "";
                }
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
            case "notesOutsideScale":
                this._doc.notesOutsideScale = !this._doc.notesOutsideScale;
                break;
            case "setDefaultScale":
                this._doc.defaultScale = this._doc.song.scale;
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
            case "layout":
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
        this._doc.record(new ChangeVolume(this._doc, +this._instrumentVolumeSlider.input.value, -Config.volumeRange / 2 + Math.round(Math.sqrt(Config.chipWaves[index].expression) * Config.volumeRange / 2)));

        this._customWavePresetDrop.selectedIndex = 0;
        this._doc.notifier.changed();
        this._doc.savePreferences();
    }
}
