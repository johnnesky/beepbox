// Copyright (C) 2019 John Nesky, distributed under the MIT license.

/// <reference path="../synth/SynthConfig.ts" />
/// <reference path="ColorConfig.ts" />
/// <reference path="EditorConfig.ts" />
/// <reference path="../synth/synth.ts" />
/// <reference path="SongDocument.ts" />
/// <reference path="html.ts" />
/// <reference path="style.ts" />
/// <reference path="Prompt.ts" />
/// <reference path="TipPrompt.ts" />
/// <reference path="PatternEditor.ts" />
/// <reference path="TrackEditor.ts" />
/// <reference path="LoopEditor.ts" />
/// <reference path="SpectrumEditor.ts" />
/// <reference path="HarmonicsEditor.ts" />
/// <reference path="BarScrollBar.ts" />
/// <reference path="OctaveScrollBar.ts" />
/// <reference path="Piano.ts" />
/// <reference path="BeatsPerBarPrompt.ts" />
/// <reference path="MoveNotesSidewaysPrompt.ts" />
/// <reference path="SongDurationPrompt.ts" />
/// <reference path="ChannelSettingsPrompt.ts" />
/// <reference path="ExportPrompt.ts" />
/// <reference path="ImportPrompt.ts" />
/// <reference path="MuteButton.ts" />

namespace beepbox {
	const {button, div, span, select, option, optgroup, input, canvas} = HTML;
	
	export const isMobile: boolean = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|android|ipad|playbook|silk/i.test(navigator.userAgent);
	
	function buildOptions(menu: HTMLSelectElement, items: ReadonlyArray<string | number>): HTMLSelectElement {
		for (let index: number = 0; index < items.length; index++) {
			menu.appendChild(option({value: index}, items[index]));
		} 
		return menu;
	}
	
  // Similar to the above, but adds a non-interactive header to the list.
  // @jummbus: Honestly not necessary with new HTML options interface, but not exactly necessary to change either!

  function buildHeaderedOptions(header: string, menu: HTMLSelectElement, items: ReadonlyArray<string | number>): HTMLSelectElement {
    menu.appendChild(option({selected: true, disabled: true, value: header}, header));

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
			menu.appendChild(option({value: InstrumentType.noise}, EditorConfig.valueToPreset(InstrumentType.noise)!.name));
      		menu.appendChild(option({value: InstrumentType.spectrum}, EditorConfig.valueToPreset(InstrumentType.spectrum)!.name));
      		menu.appendChild(option({value: InstrumentType.drumset}, EditorConfig.valueToPreset(InstrumentType.drumset)!.name));
		} else {
	        menu.appendChild(option({value: InstrumentType.chip}, EditorConfig.valueToPreset(InstrumentType.chip)!.name));
	        menu.appendChild(option({value: InstrumentType.pwm}, EditorConfig.valueToPreset(InstrumentType.pwm)!.name));
	        menu.appendChild(option({value: InstrumentType.harmonics}, EditorConfig.valueToPreset(InstrumentType.harmonics)!.name));
	        menu.appendChild(option({value: InstrumentType.spectrum}, EditorConfig.valueToPreset(InstrumentType.spectrum)!.name));
	        menu.appendChild(option({ value: InstrumentType.fm }, EditorConfig.valueToPreset(InstrumentType.fm)!.name));
	        menu.appendChild(option({ value: InstrumentType.customChipWave }, EditorConfig.valueToPreset(InstrumentType.customChipWave)!.name));
		}
		
		for (let categoryIndex: number = 1; categoryIndex < EditorConfig.presetCategories.length; categoryIndex++) {
			const category: PresetCategory = EditorConfig.presetCategories[categoryIndex];
			const group: HTMLElement = optgroup({label: category.name + " ▾"});
			let foundAny: boolean = false;
			for (let presetIndex: number = 0; presetIndex < category.presets.length; presetIndex++) {
				const preset: Preset = category.presets[presetIndex];
				if ((preset.isNoise == true) == isNoise) {
					group.appendChild(option({value: (categoryIndex << 6) + presetIndex}, preset.name));
					foundAny = true;
				}
			}

	      // Need to re-sort some elements for readability. Can't just do this in the menu, because indices are saved in URLs and would get broken if the ordering actually changed.
	      if (category.name == "String Presets" && foundAny ) {
	
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

	    const randomGroup: HTMLElement = optgroup({ label: "Randomize ▾" });
	    randomGroup.appendChild(option({ value: "randomPreset" }, "Random Preset"));
	    randomGroup.appendChild(option({ value: "randomGenerated" }, "Random Generated"));
	    menu.appendChild(randomGroup);

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
	
	interface PatternCopy {
		notes: any[];
		beatsPerBar: number;
		drums: boolean;
	}
	
    class Canvas {
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

            this.newArray = new Float64Array( 64 );

            // Init waveform
            this.redrawCanvas();

        }

        public redrawCanvas(): void {
            var ctx = this.canvas.getContext("2d") as CanvasRenderingContext2D;

            // Black BG
            ctx.fillStyle = "#040410";
            ctx.fillRect(0, 0, 128, 52);

            // Mid-bar
            ctx.fillStyle = "#393e4f";
            ctx.fillRect(0, 25, 128, 2);

            // 25-75 bars
            ctx.fillStyle = "#1c1d28";
            ctx.fillRect(0, 13, 128, 1);
            ctx.fillRect(0, 39, 128, 1);

            // Waveform
            ctx.fillStyle = ColorConfig.getChannelColor(this._doc.song, this._doc.channel).noteBright;

            for (let x: number = 0; x < 64; x++) {
                var y: number = this._doc.song.channels[this._doc.channel].instruments[this._doc.getCurrentInstrument()].customChipWave[x] + 26;
                ctx.fillRect(x * 2, y - 2, 2, 4);

                this.newArray[x] = y - 26;
            }
        }

        private _onMouseMove = ( event: MouseEvent ): void => {
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
                        var j = Math.round( y + (this.lastY - y) * progress );

                        ctx.fillStyle = "#040410";
                        ctx.fillRect(Math.floor(i / 2) * 2, 0, 2, 53);
                        ctx.fillStyle = "#393e4f";
                        ctx.fillRect(Math.floor(i / 2) * 2, 25, 2, 2);
                        ctx.fillStyle = "#1c1d28";
                        ctx.fillRect(Math.floor(i / 2) * 2, 13, 2, 1);
                        ctx.fillRect(Math.floor(i / 2) * 2, 39, 2, 1);
                        ctx.fillStyle = ColorConfig.getChannelColor(this._doc.song, this._doc.channel).noteBright;
                        ctx.fillRect(Math.floor(i / 2) * 2, j - 2, 2, 4);

                        // Actually update current instrument's custom waveform
                        this.newArray[Math.floor(i / 2)] = (j - 26);
                    }

                }
                else {

                    ctx.fillStyle = "#040410";
                    ctx.fillRect(Math.floor(x / 2) * 2, 0, 2, 52);
                    ctx.fillStyle = "#393e4f";
                    ctx.fillRect(Math.floor(x / 2) * 2, 25, 2, 2);
                    ctx.fillStyle = "#1c1d28";
                    ctx.fillRect(Math.floor(x / 2) * 2, 13, 2, 1);
                    ctx.fillRect(Math.floor(x / 2) * 2, 39, 2, 1);
                    ctx.fillStyle = ColorConfig.getChannelColor(this._doc.song, this._doc.channel).noteBright;
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

        private _onMouseDown = ( event: MouseEvent  ) : void => {
            this.mouseDown = true;

            // Allow single-click edit
            this._onMouseMove( event );
        }
        private _onMouseUp = () : void => {
            this.mouseDown = false;
            this.continuousEdit = false;

            this._whenChange( );
        }

        private _whenChange = (): void => {
          this._change = this._getChange(this.newArray);

          this._doc.record(this._change!);

          this._change = null;
        };


    }

    class InputBox {
        private _change: Change | null = null;
        private _value: string = "";
        private _oldValue: string = "";

        constructor(public readonly input: HTMLInputElement, private readonly _doc: SongDocument, private readonly _getChange: (oldValue: string, newValue: string) => Change) {
            input.addEventListener("input", this._whenInput);
            input.addEventListener("change", this._whenChange);
        }

        public updateValue(value: string): void {
            this._value = value;
            this.input.value = String(value);
        }

        private _whenInput = (): void => {
            const continuingProspectiveChange: boolean = this._doc.lastChangeWas(this._change);
            if (!continuingProspectiveChange) this._oldValue = this._value;
            this._change = this._getChange(this._oldValue, this.input.value);
            this._doc.setProspectiveChange(this._change);
        };

        private _whenChange = (): void => {
            this._doc.record(this._change!);
            this._change = null;
        };
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
        private readonly _muteButtonEditor: MuteButtonEditor = new MuteButtonEditor(this._doc);
        private readonly _trackOptionsEditor: HTMLDivElement = div({ className: "trackEditorOptions", style: "width: 32px; display: flex; flex-direction: row" }, [
            this._muteButtonEditor.container,
        ]);
		private readonly _trackContainer: HTMLDivElement = div({className: "trackContainer", tabindex:"1"}, [
			this._trackEditor.container,
			this._loopEditor.container,
		]);
        private readonly _trackBar: HTMLDivElement = div({ className: "trackBar", style: "display: flex; flex-direction: row;" }, [
            this._trackOptionsEditor,
			this._trackContainer,
		]);
		private readonly _barScrollBar: BarScrollBar = new BarScrollBar(this._doc, this._trackContainer);
		private readonly _octaveScrollBar: OctaveScrollBar = new OctaveScrollBar(this._doc);
		private readonly _piano: Piano = new Piano(this._doc);
		private readonly _editorBox: HTMLDivElement = div(
			div({className: "editorBox noSelection", style: "height: 481px; display: flex; flex-direction: row; margin-bottom: 6px;"},
				this._piano.container,
				this._patternEditor.container,
				this._octaveScrollBar.container,
			),
			this._trackBar,
            div({ style: "display:flex; flex-direction: row;" }, 
                div({ style: "width: 32px; height: 32px" }, []),
			this._barScrollBar.container,
			),
		);
		private readonly _playButton: HTMLButtonElement = button({style: "width: 80px;", type: "button"});
		private readonly _prevBarButton: HTMLButtonElement = button({className: "prevBarButton", style: "width: 40px;", type: "button", title: "Previous Bar (left bracket)"});
		private readonly _nextBarButton: HTMLButtonElement = button({className: "nextBarButton", style: "width: 40px;", type: "button", title: "Next Bar (right bracket)"});
		private readonly _volumeSlider: HTMLInputElement = input({title: "main volume", style: "width: 5em; flex-grow: 1; margin: 0;", type: "range", min: "0", max: "115", value: "50", step: "1"});
		private readonly _fileMenu: HTMLSelectElement = select({style: "width: 100%;"},
			option({selected: true, disabled: true, hidden: false}, "File"), // todo: "hidden" should be true but looks wrong on mac chrome, adds checkmark next to first visible option. :(
			option({value: "new"}, "+ New Blank Song"),
			option({value: "import"}, "↑ Import Song..."),
			option({value: "export"}, "↓ Export Song..."),
			option({value: "copyUrl"}, "⎘ Copy Song URL"),
			option({value: "shareUrl"}, "⤳ Share Song URL"),
			option({value: "viewPlayer"}, "▶ View in Song Player"),
			option({value: "copyEmbed"}, "⎘ Copy HTML Embed Code"),
		);
		private readonly _editMenu: HTMLSelectElement = select({style: "width: 100%;"},
			option({selected: true, disabled: true, hidden: false}, "Edit"), // todo: "hidden" should be true but looks wrong on mac chrome, adds checkmark next to first visible option. :(
			option({value: "undo"}, "Undo (Z)"),
			option({value: "redo"}, "Redo (Y)"),
			option({value: "copy"}, "Copy Pattern Notes (C)"),
			option({value: "paste"}, "Paste Pattern Notes (V)"),
			option({value: "transposeUp"}, "Move Pattern Notes Up (+)"),
			option({value: "transposeDown"}, "Move Pattern Notes Down (-)"),
			option({value: "forceScale"}, "Snap All Notes To Scale"),
			option({value: "forceRhythm"}, "Snap All Notes To Rhythm"),
			option({value: "moveNotesSideways"}, "Move All Notes Sideways..."),
			option({value: "beatsPerBar"}, "Change Beats Per Bar..."),
			option({value: "barCount"}, "Change Song Length..."),
			option({value: "channelSettings"}, "Channel Settings..."),
			option({value: "detectKey"}, "Detect Key"),
		);
		private readonly _optionsMenu: HTMLSelectElement = select({style: "width: 100%;"},
			option({selected: true, disabled: true, hidden: false}, "Preferences"), // todo: "hidden" should be true but looks wrong on mac chrome, adds checkmark next to first visible option. :(
			option({value: "autoPlay"}, "Auto Play On Load"),
			option({value: "autoFollow"}, "Auto Follow Track"),
			option({value: "showLetters"}, "Show Piano Keys"),
			option({value: "showFifth"}, 'Highlight "Fifth" Notes'),
			option({value: "showChannels"}, "Show All Channels"),
      		option({ value: "showScrollBar" }, "Octave Scroll Bar"),
      		option({ value: "alwaysFineNoteVol" }, "Always Fine Note Vol.")
			//option({value: "alwaysShowSettings"}, "Customize All Instruments"),
		);
		private readonly _scaleSelect: HTMLSelectElement = buildOptions(select(), Config.scales.map(scale=>scale.name));
		private readonly _keySelect: HTMLSelectElement = buildOptions(select(), Config.keys.map(key=>key.name).reverse());
		private readonly _tempoSlider: Slider = new Slider(input({style: "margin: 0; vertical-align: middle;", type: "range", min: "30", max: "320", value: "160", step: "1"}), this._doc, (oldValue: number, newValue: number) => new ChangeTempo(this._doc, oldValue, newValue));
		private readonly _tempoStepper: HTMLInputElement = input({style: "width: 4em; font-size: 80%; margin-left: 0.4em; vertical-align: middle;", type: "number", step: "1"});
    	private readonly _reverbSlider: Slider = new Slider(input({ style: "margin: 0;", type: "range", min: "0", max: Config.reverbRange - 1, value: "0", step: "1" }), this._doc, (oldValue: number, newValue: number) => new ChangeReverb(this._doc, oldValue, newValue));
		private readonly _rhythmSelect: HTMLSelectElement = buildOptions(select(), Config.rhythms.map(rhythm=>rhythm.name));
		private readonly _pitchedPresetSelect: HTMLSelectElement = buildPresetOptions(false, "pitchPresetSelect");
		private readonly _drumPresetSelect: HTMLSelectElement = buildPresetOptions(true, "drumPresetSelect");
		private readonly _algorithmSelect: HTMLSelectElement = buildOptions(select(), Config.algorithms.map(algorithm=>algorithm.name));
		private readonly _algorithmSelectRow: HTMLDivElement = div({className: "selectRow"}, span({class: "tip", onclick: ()=>this._openPrompt("algorithm")}, "Algorithm: "), div({className: "selectContainer"}, this._algorithmSelect));
		private readonly _instrumentSelect: HTMLSelectElement = select();
		private readonly _instrumentSelectRow: HTMLDivElement = div({className: "selectRow", style: "display: none;"}, span({class: "tip", onclick: ()=>this._openPrompt("instrumentIndex")}, "Instrument: "), div({className: "selectContainer"}, this._instrumentSelect));
		private readonly _instrumentVolumeSlider: Slider = new Slider(input({style: "margin: 0; position: sticky;", className:"midTick", type: "range", min: Math.floor(-Config.volumeRange/2), max: Math.floor(Config.volumeRange/2), value: "0", step: "1"}), this._doc, (oldValue: number, newValue: number) => new ChangeVolume(this._doc, oldValue, newValue));
        private readonly _instrumentVolumeSliderInputBox: HTMLInputElement = input({ style: "width: 4em; font-size: 80%", id: "volumeSliderInputBox", type: "number", step: "1", min: Math.floor(-Config.volumeRange/2), max: Math.floor(Config.volumeRange/2), value: "0" });
		private readonly _instrumentVolumeSliderTip: HTMLDivElement = div({className: "selectRow", style: "height: 1em"}, span({class: "tip", onclick: ()=>this._openPrompt("instrumentVolume")}, "Volume: "));
		
		private readonly _instrumentVolumeSliderRow: HTMLDivElement = div({ className: "selectRow" }, div({}, 
            div({ style: "color: #999" }, span({}, this._instrumentVolumeSliderTip)),
            div({ style: "color: #555" }, this._instrumentVolumeSliderInputBox),
        ), this._instrumentVolumeSlider.input );
		
		private readonly _chipWaveSelect: HTMLSelectElement = buildOptions(select(), Config.chipWaves.map(wave=>wave.name));
		private readonly _chipNoiseSelect: HTMLSelectElement = buildOptions(select(), Config.chipNoises.map(wave=>wave.name));
		private readonly _chipWaveSelectRow: HTMLDivElement = div({className: "selectRow"}, span({class: "tip", onclick: ()=>this._openPrompt("chipWave")}, "Wave: "), div({className: "selectContainer"}, this._chipWaveSelect));
		private readonly _chipNoiseSelectRow: HTMLDivElement = div({className: "selectRow"}, span({class: "tip", onclick: ()=>this._openPrompt("chipNoise")}, "Noise: "), div({className: "selectContainer"}, this._chipNoiseSelect));
		private readonly _transitionSelect: HTMLSelectElement = buildOptions(select(), Config.transitions.map(transition=>transition.name));
		private readonly _transitionRow: HTMLDivElement = div({className: "selectRow"}, span({class: "tip", onclick: ()=>this._openPrompt("transition")}, "Transition:"), div({className: "selectContainer"}, this._transitionSelect));
		private readonly _effectsSelect: HTMLSelectElement = buildOptions(select(), Config.effectsNames);
		private readonly _filterCutoffSlider: Slider = new Slider(input({style: "margin: 0;", type: "range", min: "0", max: Config.filterCutoffRange - 1, value: "6", step: "1"}), this._doc, (oldValue: number, newValue: number) => new ChangeFilterCutoff(this._doc, oldValue, newValue));
		private _filterCutoffRow: HTMLDivElement = div({className: "selectRow", title: "Low-pass Filter Cutoff Frequency"}, span({class: "tip", onclick: ()=>this._openPrompt("filterCutoff")}, "Filter Cut:"), this._filterCutoffSlider.input);
		private readonly _filterResonanceSlider: Slider = new Slider(input({style: "margin: 0;", type: "range", min: "0", max: Config.filterResonanceRange - 1, value: "6", step: "1"}), this._doc, (oldValue: number, newValue: number) => new ChangeFilterResonance(this._doc, oldValue, newValue));
		private _filterResonanceRow: HTMLDivElement = div({className: "selectRow", title: "Low-pass Filter Peak Resonance"}, span({class: "tip", onclick: ()=>this._openPrompt("filterResonance")}, "Filter Peak:"), this._filterResonanceSlider.input);
		private readonly _filterEnvelopeSelect: HTMLSelectElement = buildOptions(select(), Config.envelopes.map(envelope=>envelope.name));
		private _filterEnvelopeRow: HTMLDivElement = div({className: "selectRow", title: "Low-pass Filter Envelope"}, span({class: "tip", onclick: ()=>this._openPrompt("filterEnvelope")}, "Filter Env:"), div({className: "selectContainer"}, this._filterEnvelopeSelect));
		private readonly _pulseEnvelopeSelect: HTMLSelectElement = buildOptions(select(), Config.envelopes.map(envelope=>envelope.name));
		private _pulseEnvelopeRow: HTMLDivElement = div({className: "selectRow", title: "Pulse Width Modulator Envelope"}, span({class: "tip", onclick: ()=>this._openPrompt("pulseEnvelope")}, "Pulse Env:"), div({className: "selectContainer"}, this._pulseEnvelopeSelect));
		private readonly _pulseWidthSlider: Slider = new Slider(input({style: "margin: 0;", type: "range", min: "0", max: Config.pulseWidthRange - 1, value: "0", step: "1"}), this._doc, (oldValue: number, newValue: number) => new ChangePulseWidth(this._doc, oldValue, newValue));
		private _pulseWidthRow: HTMLDivElement = div({className: "selectRow"}, span({class: "tip", onclick: ()=>this._openPrompt("pulseWidth")}, "Pulse Width:"), this._pulseWidthSlider.input);
		private readonly _intervalSelect: HTMLSelectElement = buildOptions(select(), Config.intervals.map(interval=>interval.name));
		private readonly _intervalSelectRow: HTMLElement = div({className: "selectRow"}, span({class: "tip", onclick: ()=>this._openPrompt("interval")}, "Interval:"), div({className: "selectContainer"}, this._intervalSelect));
		private readonly _chordSelect: HTMLSelectElement = buildOptions(select(), Config.chords.map(chord=>chord.name));
		private readonly _chordSelectRow: HTMLElement = div({className: "selectRow"}, span({class: "tip", onclick: ()=>this._openPrompt("chords")}, "Chords:"), div({className: "selectContainer"}, this._chordSelect));
		private readonly _vibratoSelect: HTMLSelectElement = buildOptions(select(), Config.vibratos.map(vibrato=>vibrato.name));
		private readonly _vibratoSelectRow: HTMLElement = div({className: "selectRow"}, span({class: "tip", onclick: ()=>this._openPrompt("vibrato")}, "Vibrato:"), div({className: "selectContainer"}, this._vibratoSelect));
		private readonly _phaseModGroup: HTMLElement = div({className: "editor-controls"});
		private readonly _feedbackTypeSelect: HTMLSelectElement = buildOptions(select(), Config.feedbacks.map(feedback=>feedback.name));
		private readonly _feedbackRow1: HTMLDivElement = div({className: "selectRow"}, span({class: "tip", onclick: ()=>this._openPrompt("feedbackType")}, "Feedback:"), div({className: "selectContainer"}, this._feedbackTypeSelect));
		private readonly _spectrumEditor: SpectrumEditor = new SpectrumEditor(this._doc, null);
		private readonly _spectrumRow: HTMLElement = div({className: "selectRow"}, span({class: "tip", onclick: ()=>this._openPrompt("spectrum")}, "Spectrum:"), this._spectrumEditor.container);
		private readonly _harmonicsEditor: HarmonicsEditor = new HarmonicsEditor(this._doc);
		private readonly _harmonicsRow: HTMLElement = div({className: "selectRow"}, span({class: "tip", onclick: ()=>this._openPrompt("harmonics")}, "Harmonics:"), this._harmonicsEditor.container);
		private readonly _drumsetGroup: HTMLElement = div({className: "editor-controls"});
		
		
        private readonly _instrumentCopyButton: HTMLButtonElement = button({ style: "max-width:86px;", className: "copyButton" }, [
            "Copy",
            // Copy icon:
            SVG.svg( { style: "flex-shrink: 0; position: absolute; left: 0; top: 50%; margin-top: -1em; pointer-events: none;", width: "2em", height: "2em", viewBox: "-5 -21 26 26" }, [
                SVG.path( { d: "M 0 -15 L 1 -15 L 1 0 L 13 0 L 13 1 L 0 1 L 0 -15 z M 2 -1 L 2 -17 L 10 -17 L 14 -13 L 14 -1 z M 3 -2 L 13 -2 L 13 -12 L 9 -12 L 9 -16 L 3 -16 z", fill: "currentColor" }),
            ]),
        ]);
        private readonly _instrumentPasteButton: HTMLButtonElement = button({ style: "max-width:86px;", className: "pasteButton" }, [
            "Paste",
            // Paste icon:
            SVG.svg( { style: "flex-shrink: 0; position: absolute; left: 0; top: 50%; margin-top: -1em; pointer-events: none;", width: "2em", height: "2em", viewBox: "0 0 26 26" }, [
                SVG.path( { d: "M 8 18 L 6 18 L 6 5 L 17 5 L 17 7 M 9 8 L 16 8 L 20 12 L 20 22 L 9 22 z", stroke: "currentColor", fill: "none" }),
                SVG.path( { d: "M 9 3 L 14 3 L 14 6 L 9 6 L 9 3 z M 16 8 L 20 12 L 16 12 L 16 8 z", fill: "currentColor", }),
            ]),
        ]);

        private readonly _panSlider: Slider = new Slider(input({ style: "margin: 0px; position: sticky;", className: "midTick", type: "range", min: "0", max: "100", value: "50", step: "1"}), this._doc, (oldValue: number, newValue: number) => new ChangePan(this._doc, oldValue, newValue ));
        private readonly _panSliderInputBox: HTMLInputElement = input({ style: "width: 4em; font-size: 80%; ", id: "panSliderInputBox", type: "number", step: "1", min: "-100", max: "100", value: "0"});
		    private readonly _panSliderRow: HTMLDivElement = div({className: "selectRow"}, div({}, 							
          div({ class: "tip", style: "color: #999; height:1em;", onclick: () => this._openPrompt("pan") }, "Pan: "),
				  div({style: "color: #555"}, this._panSliderInputBox),		
			  ), this._panSlider.input );

        private readonly _customWaveDrawCanvas: Canvas = new Canvas(canvas({ width: 128, height: 52, style: "border:2px solid #393e4f;", id: "customWaveDrawCanvas" }), this._doc, (newArray: Float64Array) => new ChangeCustomWave(this._doc, newArray));
        private readonly _customWavePresetDrop: HTMLSelectElement = buildHeaderedOptions( "Load Preset", select({ style: "height:1.5em; text-align: center; text-align-last: center;" } ),
            Config.chipWaves.map(wave=>wave.name)
        );

        private readonly _customWaveDraw: HTMLDivElement = div({ style: "height:80px; margin-top:10px; margin-bottom:5px" }, [
            div({ style: "height:54px; display:flex; justify-content:center;" }, [this._customWaveDrawCanvas.canvas]),
            div({ style: "margin-top:5px; display:flex; justify-content:center;" }, [this._customWavePresetDrop]),
        ]);
        
        private readonly _songTitleInputBox: InputBox = new InputBox(input({ style: "border:none; background-color:#040410; color:#FFFFFF; text-align:center", maxlength:"30", type: "text", value: "JummBox 1.2" }), this._doc, (oldValue: string, newValue: string) => new ChangeInputBoxText(this._doc, oldValue, newValue));


		private readonly _feedbackAmplitudeSlider: Slider = new Slider(input({style: "margin: 0; width: 4em;", type: "range", min: "0", max: Config.operatorAmplitudeMax, value: "0", step: "1", title: "Feedback Amplitude"}), this._doc, (oldValue: number, newValue: number) => new ChangeFeedbackAmplitude(this._doc, oldValue, newValue));
		private readonly _feedbackEnvelopeSelect: HTMLSelectElement = buildOptions(select({style: "width: 100%;", title: "Feedback Envelope"}), Config.envelopes.map(envelope=>envelope.name));
		private readonly _feedbackRow2: HTMLDivElement = div({className: "operatorRow"},
			div({style: "margin-right: .1em; visibility: hidden;"}, 1 + "."),
			div({style: "width: 3em; margin-right: .3em;"}),
			this._feedbackAmplitudeSlider.input,
			div({className: "selectContainer", style: "width: 5em; margin-left: .3em;"}, this._feedbackEnvelopeSelect),
		);
		/*
     	* @jummbus - my very real, valid reason for cutting this button: I don't like it.
     	* 
		private readonly _customizeInstrumentButton: HTMLButtonElement = button({type: "button", style: "margin: 2px 0"},
			"Customize Instrument",
			// Dial icon
			SVG.svg({style: "flex-shrink: 0; position: absolute; left: 0; top: 50%; margin-top: -1em; pointer-events: none;", width: "2em", height: "2em", viewBox: "-13 -13 26 26"},
				SVG.g({transform: "translate(0,1)"},
					SVG.circle({cx: "0", cy: "0", r: "6.5", stroke: "currentColor", "stroke-width": "1", fill: "none"}),
					SVG.rect({x: "-1", y: "-5", width: "2", height: "4", fill: "currentColor", transform: "rotate(30)"}),
					SVG.circle({cx: "-7.79", cy: "4.5", r: "0.75", fill: "currentColor"}),
					SVG.circle({cx: "-9", cy: "0", r: "0.75", fill: "currentColor"}),
					SVG.circle({cx: "-7.79", cy: "-4.5", r: "0.75", fill: "currentColor"}),
					SVG.circle({cx: "-4.5", cy: "-7.79", r: "0.75", fill: "currentColor"}),
					SVG.circle({cx: "0", cy: "-9", r: "0.75", fill: "currentColor"}),
					SVG.circle({cx: "4.5", cy: "-7.79", r: "0.75", fill: "currentColor"}),
					SVG.circle({cx: "7.79", cy: "-4.5", r: "0.75", fill: "currentColor"}),
					SVG.circle({cx: "9", cy: "0", r: "0.75", fill: "currentColor"}),
					SVG.circle({cx: "7.79", cy: "4.5", r: "0.75", fill: "currentColor"}),
				),
			),
		);
	    */
	    private readonly _customInstrumentSettingsGroup: HTMLDivElement = div({ className: "editor-controls" },
	        this._chipWaveSelectRow,
	        this._chipNoiseSelectRow,
	        this._customWaveDraw,	
			this._filterCutoffRow,
			this._filterResonanceRow,
			this._filterEnvelopeRow,
			this._transitionRow,
			div({className: "selectRow"},
				span({class: "tip", onclick: ()=>this._openPrompt("effects")}, "Effects:"),
				div({className: "selectContainer"}, this._effectsSelect),
			),
			this._chordSelectRow,
			this._vibratoSelectRow,
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
	    private readonly _instrumentCopyGroup: HTMLDivElement = div({}, 
	      div({ className: "selectRow" }, 
	          this._instrumentCopyButton,
	          this._instrumentPasteButton,
	      ),
	    );
		private readonly _instrumentSettingsGroup: HTMLDivElement = div({className: "editor-controls"},
			this._instrumentSelectRow,
      		div({ className: "selectRow", id: "typeSelectRow" },
        		span({ class: "tip", onclick: () => this._openPrompt("instrumentType") }, "Type: "),
        			div(
          				div({ className: "pitchSelect" }, this._pitchedPresetSelect),
          				div({ className: "drumSelect" }, this._drumPresetSelect)
				),
      		),
      		this._instrumentVolumeSliderRow,
      		this._panSliderRow,
			//this._customizeInstrumentButton,
			this._customInstrumentSettingsGroup,
		);
	    private readonly _usedPatternIndicator: SVGElement = SVG.path( { d: "M -6 -6 H 6 V 6 H -6 V -6 M -2 -3 L -2 -3 L -1 -4 H 1 V 4 H -1 V -1.2 L -1.2 -1 H -2 V -3 z", fill: "#393e4f", "fill-rule": "evenodd" });
	    private readonly _usedInstrumentIndicator: SVGElement = SVG.path( { d: "M -6 -0.8 H -3.8 V -6 H 0.8 V 4.4 H 2.2 V -0.8 H 6 V 0.8 H 3.8 V 6 H -0.8 V -4.4 H -2.2 V 0.8 H -6 z", fill: "#393e4f" });
	        
		private readonly _promptContainer: HTMLDivElement = div({className: "promptContainer", style: "display: none;"});
		public readonly mainLayer: HTMLDivElement = div({className: "beepboxEditor", tabIndex: "0"},
			this._editorBox,
			div({className: "editor-widget-column noSelection"},
        		div({ style: "text-align: center; color: #79B;" }, [this._songTitleInputBox.input]),
					div({className: "editor-widgets"},
						div({className: "editor-controls"},
							div({className: "playback-controls"},
								div({className: "playback-bar-controls"},
									this._playButton,
									this._prevBarButton,
									this._nextBarButton,
								),
								div({className: "playback-volume-controls"},
									// Volume speaker icon:
									SVG.svg({style: "flex-shrink: 0;", width: "2em", height: "2em", viewBox: "0 0 26 26"},
										SVG.path({d: "M 4 16 L 4 10 L 8 10 L 13 5 L 13 21 L 8 16 z M 15 11 L 16 10 A 7.2 7.2 0 0 1 16 16 L 15 15 A 5.8 5.8 0 0 0 15 12 z M 18 8 L 19 7 A 11.5 11.5 0 0 1 19 19 L 18 18 A 10.1 10.1 0 0 0 18 8 z", fill: "#777"}),
								),
								this._volumeSlider,
							),
						),
					),
					div({className: "editor-settings"},
						div({className: "editor-song-settings"},
							div({className: "editor-menus"},
								div({className: "selectContainer menu"},
									this._fileMenu,
									// Page icon:
									SVG.svg({style: "flex-shrink: 0; position: absolute; left: 0; top: 50%; margin-top: -1em; pointer-events: none;", width: "2em", height: "2em", viewBox: "-5 -21 26 26"},
										SVG.path({d: "M 2 0 L 2 -16 L 10 -16 L 14 -12 L 14 0 z M 3 -1 L 13 -1 L 13 -11 L 9 -11 L 9 -15 L 3 -15 z", fill: "currentColor"}),
									),
								),
								div({className: "selectContainer menu"},
									this._editMenu,
									// Edit icon:
									SVG.svg({style: "flex-shrink: 0; position: absolute; left: 0; top: 50%; margin-top: -1em; pointer-events: none;", width: "2em", height: "2em", viewBox: "-5 -21 26 26"},
										SVG.path({d: "M 0 0 L 1 -4 L 4 -1 z M 2 -5 L 10 -13 L 13 -10 L 5 -2 zM 11 -14 L 13 -16 L 14 -16 L 16 -14 L 16 -13 L 14 -11 z", fill: "currentColor"}),
									),
								),
								div({className: "selectContainer menu"},
									this._optionsMenu,
									// Gear icon:
									SVG.svg({style: "flex-shrink: 0; position: absolute; left: 0; top: 50%; margin-top: -1em; pointer-events: none;", width: "2em", height: "2em", viewBox: "-13 -13 26 26"},
										SVG.path({d: "M 5.78 -1.6 L 7.93 -0.94 L 7.93 0.94 L 5.78 1.6 L 4.85 3.53 L 5.68 5.61 L 4.21 6.78 L 2.36 5.52 L 0.27 5.99 L -0.85 7.94 L -2.68 7.52 L -2.84 5.28 L -4.52 3.95 L -6.73 4.28 L -7.55 2.59 L -5.9 1.07 L -5.9 -1.07 L -7.55 -2.59 L -6.73 -4.28 L -4.52 -3.95 L -2.84 -5.28 L -2.68 -7.52 L -0.85 -7.94 L 0.27 -5.99 L 2.36 -5.52 L 4.21 -6.78 L 5.68 -5.61 L 4.85 -3.53 M 2.92 0.67 L 2.92 -0.67 L 2.35 -1.87 L 1.3 -2.7 L 0 -3 L -1.3 -2.7 L -2.35 -1.87 L -2.92 -0.67 L -2.92 0.67 L -2.35 1.87 L -1.3 2.7 L -0 3 L 1.3 2.7 L 2.35 1.87 z", fill: "currentColor"}),
									),
								),
							),
							div({className: "editor-settings"}, 
								div({className: "editor-song-settings"}, 
                  					div({ style: "margin: 3px 0; position: relative; text-align: center; color: #999;" }, 
                    					div({ class: "tip", style: "flex-shrink: 0; position:absolute; left: 0; top: 0; width: 12px; height: 12px", onclick: () => this._openPrompt("usedPattern") }, 
                      						SVG.svg({ style: "flex-shrink: 0; position: absolute; left: 0; top: 0; pointer-events: none;", width: "12px", height: "12px", "margin-right": "0.5em", viewBox: "-6 -6 12 12" }, 
                        						this._usedPatternIndicator,
                      						),
                    					),
                    					div({ class: "tip", style: "flex-shrink: 0; position: absolute; left: 14px; top: 0; width: 12px; height: 12px", onclick: () => this._openPrompt("usedInstrument") }, 
                      						SVG.svg( { style: "flex-shrink: 0; position: absolute; left: 0; top: 0; pointer-events: none;", width: "12px", height: "12px", "margin-right": "1em", viewBox: "-6 -6 12 12" }, 
                        						this._usedInstrumentIndicator,
                    						),
                						),
										"Song Settings"
									),
								),
    						),
							div({className: "selectRow"},
								span({class: "tip", onclick: ()=>this._openPrompt("scale")}, "Scale: "),
								div({className: "selectContainer"}, this._scaleSelect),
							),
							div({className: "selectRow"},
								span({class: "tip", onclick: ()=>this._openPrompt("key")}, "Key: "),
								div({className: "selectContainer"}, this._keySelect),
							),

              				div({ className: "selectRow" },
                				div({ style: "color: #999" }, span({}, div({ class: "tip", style: "color: #999; height:1em;", onclick: () => this._openPrompt("tempo") }, "Tempo: ")),
                				div({ style: "color: #555" }, this._tempoStepper),
                				), this._tempoSlider.input
							),
							div({className: "selectRow"},
								span({class: "tip", onclick: ()=>this._openPrompt("reverb")}, "Reverb: "),
								this._reverbSlider.input,
							),
							div({className: "selectRow"},
								span({class: "tip", onclick: ()=>this._openPrompt("rhythm")}, "Rhythm: "),
								div({className: "selectContainer"}, this._rhythmSelect),
							),
						),
						div({className: "editor-instrument-settings"},
							div({style: "margin: 3px 0; text-align: center; color: #999;"},
								"Instrument Settings"
							),
							this._instrumentSettingsGroup,
              				this._instrumentCopyGroup,
						),
					),
				),
			),
			this._promptContainer,
		);
		
    //private _copiedInstrument: string;
		private _wasPlaying: boolean = false;
		private _currentPromptName: string | null = null;
		private _changeTranspose: ChangeTranspose | null = null;
		private readonly _operatorRows: HTMLDivElement[] = []
		private readonly _operatorAmplitudeSliders: Slider[] = []
		private readonly _operatorEnvelopeSelects: HTMLSelectElement[] = []
		private readonly _operatorFrequencySelects: HTMLSelectElement[] = []
		private readonly _drumsetSpectrumEditors: SpectrumEditor[] = [];
		private readonly _drumsetEnvelopeSelects: HTMLSelectElement[] = [];
		
		constructor(private _doc: SongDocument) {
			this._doc.notifier.watch(this.whenUpdated);
			
			if (!("share" in navigator)) {
				this._fileMenu.removeChild(this._fileMenu.querySelector("[value='shareUrl']")!);
			}
			
			this._phaseModGroup.appendChild(div({className: "operatorRow", style: "color: #999; height: 1em; margin-top: 0.5em;"},
				div({style: "margin-right: .1em; visibility: hidden;"}, 1 + "."),
				div({style: "width: 3em; margin-right: .3em;", class: "tip", onclick: ()=>this._openPrompt("operatorFrequency")}, "Freq:"),
				div({style: "width: 4em; margin: 0;", class: "tip", onclick: ()=>this._openPrompt("operatorVolume")}, "Volume:"),
				div({style: "width: 5em; margin-left: .3em;", class: "tip", onclick: ()=>this._openPrompt("operatorEnvelope")}, "Envelope:"),
			));
			for (let i: number = 0; i < Config.operatorCount; i++) {
				const operatorIndex: number = i;
				const operatorNumber: HTMLDivElement = div({style: "margin-right: .1em; color: #999;"}, i + 1 + ".");
				const frequencySelect: HTMLSelectElement = buildOptions(select({style: "width: 100%;", title: "Frequency"}), Config.operatorFrequencies.map(freq=>freq.name));
				const amplitudeSlider: Slider = new Slider(input({style: "margin: 0; width: 4em;", type: "range", min: "0", max: Config.operatorAmplitudeMax, value: "0", step: "1", title: "Volume"}), this._doc, (oldValue: number, newValue: number) => new ChangeOperatorAmplitude(this._doc, operatorIndex, oldValue, newValue));
				const envelopeSelect: HTMLSelectElement = buildOptions(select({style: "width: 100%;", title: "Envelope"}), Config.envelopes.map(envelope=>envelope.name));
				const row: HTMLDivElement = div({className: "operatorRow"},
					operatorNumber,
					div({className: "selectContainer", style: "width: 3em; margin-right: .3em;"}, frequencySelect),
					amplitudeSlider.input,
					div({className: "selectContainer", style: "width: 5em; margin-left: .3em;"}, envelopeSelect),
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
				div({className: "selectRow"},
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
				
				const row: HTMLDivElement = div({className: "selectRow"},
					div({className: "selectContainer", style: "width: 5em; margin-right: .3em;"}, envelopeSelect),
					this._drumsetSpectrumEditors[i].container,
				);
				this._drumsetGroup.appendChild(row);
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
			this._playButton.addEventListener("click", this._togglePlay);
			this._prevBarButton.addEventListener("click", this._whenPrevBarPressed);
			this._nextBarButton.addEventListener("click", this._whenNextBarPressed);
			this._volumeSlider.addEventListener("input", this._setVolumeSlider);
			
			this._editorBox.addEventListener("mousedown", this._refocusStage);
			this._spectrumEditor.container.addEventListener("mousedown", this._refocusStage);
			this._harmonicsEditor.container.addEventListener("mousedown", this._refocusStage);
			this._tempoStepper.addEventListener("keydown", this._tempoStepperCaptureNumberKeys, false);
			this.mainLayer.addEventListener("keydown", this._whenKeyPressed);
			this.mainLayer.addEventListener("keyup", this._whenKeyUp);
	        this._instrumentCopyButton.addEventListener("click", this._copyInstrument.bind(this));
	        this._instrumentPasteButton.addEventListener("click", this._pasteInstrument.bind(this));
	            
      this._instrumentVolumeSliderInputBox.addEventListener("input", () => { this._doc.record(new ChangeVolume(this._doc, this._doc.song.channels[this._doc.channel].instruments[this._doc.getCurrentInstrument()].volume, Math.min( 50.0, Math.max( -50.0, Math.round( +this._instrumentVolumeSliderInputBox.value ) )))) }); 
      this._panSliderInputBox.addEventListener("input", () => { this._doc.record(new ChangePan(this._doc, this._doc.song.channels[this._doc.channel].instruments[this._doc.getCurrentInstrument()].pan, Math.min( 100.0, Math.max( 0.0, Math.round( +this._panSliderInputBox.value ) ) ))) } ); 
	
	        this._customWaveDraw.addEventListener("input", () => { this._doc.record(new ChangeCustomWave(this._doc, this._customWaveDrawCanvas.newArray)) });
			
			this._promptContainer.addEventListener("click", (event) => {
				if (event.target == this._promptContainer) {
					this._doc.undo();
				}
			});
			
			if (isMobile) {
				const autoPlayOption: HTMLOptionElement = <HTMLOptionElement> this._optionsMenu.children[1]
				autoPlayOption.disabled = true;
				autoPlayOption.setAttribute("hidden", "");
			}

		}

        public changeInstrument(index: number) : void {
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
				if (this._wasPlaying && !(this.prompt instanceof TipPrompt)) {
					this._play();
				}
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
						this.prompt = new ExportPrompt(this._doc);
						break;
					case "import":
						this.prompt = new ImportPrompt(this._doc);
						break;
					case "barCount":
						this.prompt = new SongDurationPrompt(this._doc, this._trackEditor);
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
					this._promptContainer.style.display = null;
					this._promptContainer.appendChild(this.prompt.container);
				}
			}
		}
		
		private _refocusStage = (): void => {
			this.mainLayer.focus();
		}
		
	    public changeBarScrollPos( offset: number ) {
	        this._barScrollBar.changePos(offset);
	    }
		
		public whenUpdated = (): void => {
			const trackBounds = this._trackContainer.getBoundingClientRect();
			this._doc.trackVisibleBars = Math.floor((trackBounds.right - trackBounds.left) / 32);
			this._trackEditor.render();
		    this._barScrollBar.render();
		    this._muteButtonEditor.render();
					
			const optionCommands: ReadonlyArray<string> = [
				(this._doc.autoPlay ? "✓ " : "") + "Auto Play On Load",
				(this._doc.autoFollow ? "✓ " : "") + "Auto Follow Track",
				(this._doc.showLetters ? "✓ " : "") + "Show Piano Keys",
				(this._doc.showFifth ? "✓ " : "") + 'Highlight "Fifth" Notes',
				(this._doc.showChannels ? "✓ " : "") + "Show All Channels",
				(this._doc.showScrollBar ? "✓ " : "") + "Octave Scroll Bar",
        		(this._doc.alwaysFineNoteVol ? "✓ " : "") + "Always Fine Note Vol.",
				//(this._doc.alwaysShowSettings ? "✓ " : "") + "Customize All Instruments",
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
			this._tempoSlider.updateValue(Math.max(0, Math.min(28, Math.round(4.0 + 9.0 * Math.log(this._doc.song.tempo / 120.0) / Math.LN2))));
			this._tempoStepper.value = this._doc.song.tempo.toString();
      		this._songTitleInputBox.updateValue(this._doc.song.title);
			this._reverbSlider.updateValue(this._doc.song.reverb);

		    // Check if current viewed pattern on channel is used anywhere
		    // + Check if current instrument on channel is used anywhere
		    var instrumentUsed = false;
		    var patternUsed = false;
		
		    if (channel.bars[this._doc.bar] != 0) {
		
		        for (let i: number = 0; i < this._doc.song.barCount; i++) {
		            if (channel.bars[i] == channel.bars[this._doc.bar] && i != this._doc.bar) {
		                patternUsed = true;
		                i = this._doc.song.barCount;
		            }
		        }
		
		        for (let i: number = 0; i < this._doc.song.barCount; i++) {
		            if (channel.bars[i] != 0 && this._doc.song.getPatternInstrument(this._doc.channel, i) == instrumentIndex && i != this._doc.bar) {
		                instrumentUsed = true;
		                i = this._doc.song.barCount;
		            }
		        }
		
		    }
		
		    if (patternUsed) {
		        this._usedPatternIndicator.style.setProperty("fill", "#9c64f7");
		    }
		    else {
		        this._usedPatternIndicator.style.setProperty("fill", "#393e4f");
		    }
		    if (instrumentUsed) {
		        this._usedInstrumentIndicator.style.setProperty("fill", "#9c64f7");
		    }
		    else {
		        this._usedInstrumentIndicator.style.setProperty("fill", "#393e4f");
		    }

			setSelectedValue(this._rhythmSelect, this._doc.song.rhythm);
			
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
					this._chordSelectRow.style.display = "none";
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
					this._chordSelectRow.style.display = "";
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

				if (instrument.type == InstrumentType.fm) {
          			this._chipWaveSelectRow.style.display = "none";
					this._algorithmSelectRow.style.display = "";
					this._phaseModGroup.style.display = "";
					this._feedbackRow1.style.display = "";
					this._feedbackRow2.style.display = "";
					setSelectedValue(this._algorithmSelect, instrument.algorithm);
					setSelectedValue(this._feedbackTypeSelect, instrument.feedbackType);
					this._feedbackAmplitudeSlider.updateValue(instrument.feedbackAmplitude);
					setSelectedValue(this._feedbackEnvelopeSelect, instrument.feedbackEnvelope);
					this._feedbackEnvelopeSelect.parentElement!.style.color = (instrument.feedbackAmplitude > 0) ? "" : "#999";
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
				} else {
					this._algorithmSelectRow.style.display = "none";
					this._phaseModGroup.style.display = "none";
					this._feedbackRow1.style.display = "none";
					this._feedbackRow2.style.display = "none";
				}
				if (instrument.type == InstrumentType.pwm) {
          			this._chipWaveSelectRow.style.display = "none";
					this._pulseEnvelopeRow.style.display = "";
					this._pulseWidthRow.style.display = "";
					this._pulseWidthSlider.input.title = prettyNumber( instrument.pulseWidth ) + "%";
					setSelectedValue(this._pulseEnvelopeSelect, instrument.pulseEnvelope);
					this._pulseWidthSlider.updateValue(instrument.pulseWidth);
				} else {
					this._pulseEnvelopeRow.style.display = "none";
					this._pulseWidthRow.style.display = "none";
				}
				
				if (instrument.type == InstrumentType.noise) {
          			this._chipWaveSelectRow.style.display = "none";
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
		        } else if (instrument.type == InstrumentType.customChipWave) {
		            this._vibratoSelectRow.style.display = "";
		            this._intervalSelectRow.style.display = "";
				} else {
					throw new Error("Unrecognized instrument type: " + instrument.type);
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
			
			for (let effectsIndex: number = 0; effectsIndex < Config.effectsNames.length; effectsIndex++) {
				const hidden: boolean = !Config.instrumentTypeHasChorus[instrument.type] ? Config.effectsNames[effectsIndex].indexOf("chorus") != -1 : false;
				const option: Element = this._effectsSelect.children[effectsIndex];
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
			
			this._instrumentSettingsGroup.style.color = ColorConfig.getChannelColor(this._doc.song, this._doc.channel).noteBright;
			
			this._filterCutoffSlider.updateValue(instrument.filterCutoff);
			this._filterResonanceSlider.updateValue(instrument.filterResonance);
			setSelectedValue(this._filterEnvelopeSelect, instrument.filterEnvelope);
			setSelectedValue(this._transitionSelect, instrument.transition);
			setSelectedValue(this._effectsSelect, instrument.effects);
			setSelectedValue(this._vibratoSelect, instrument.vibrato);
			setSelectedValue(this._intervalSelect, instrument.interval);
			setSelectedValue(this._chordSelect, instrument.chord);
      		this._panSlider.updateValue(instrument.pan);
      		this._customWaveDrawCanvas.redrawCanvas();
			this._panSliderInputBox.value = instrument.pan + "";
			this._instrumentVolumeSlider.updateValue( instrument.volume );
      		this._instrumentVolumeSliderInputBox.value = "" + ( instrument.volume );
			setSelectedValue(this._instrumentSelect, instrumentIndex);
			
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
		
	    private _whenKeyUp = (event: KeyboardEvent): void => {
	        if (event.keyCode == 17)
	            this._patternEditor.controlMode = false;
	    }
		
		private _tempoStepperCaptureNumberKeys = (event: KeyboardEvent): void => {
			switch (event.keyCode) {
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
			
            // Defer to actively editing song title
            if (document.activeElement == this._songTitleInputBox.input) {
                // Enter/esc returns focus to form
                if (event.keyCode == 13 || event.keyCode == 27) {
                    this.mainLayer.focus();
                }

                return;
            }
			
			// Defer to actively editing volume/pan rows
			if ( document.activeElement == this._panSliderInputBox || document.activeElement == this._instrumentVolumeSliderInputBox ) {
				// Enter/esc returns focus to form
				if (event.keyCode == 13 || event.keyCode == 27) {
					this.mainLayer.focus();
				}
				
				return;
			}
			
			this._trackEditor.onKeyPressed(event);
			//if (event.ctrlKey)
			//trace(event.keyCode)
			switch (event.keyCode) {
		        case 17: // Ctrl
		            this._patternEditor.controlMode = true;
		            break;
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
        case 70: // f
          this._doc.synth.firstBar();
          if (this._doc.autoFollow) {
              new ChangeChannelBar(this._doc, this._doc.channel, Math.floor(this._doc.synth.playhead));
          }
          event.preventDefault();
          break;
      case 72: // h
          this._doc.synth.jumpToEditingBar(this._doc.bar);
          new ChangeChannelBar(this._doc, this._doc.channel, Math.floor(this._doc.synth.playhead));
          event.preventDefault();
          break;
      case 65: // a

          var muteCondition = true;

          for (let i: number = 0; i < this._doc.song.getChannelCount(); i++) {
              if (this._muteButtonEditor._muteButtons[i].getMuteState() == true)
                  muteCondition = false;
          }

          // If any channel is muted, unmute all
          if (muteCondition == false) {
              for (let i: number = 0; i < this._doc.song.getChannelCount(); i++) {
                  if (this._muteButtonEditor._muteButtons[i].getMuteState() == true)
                      this._muteButtonEditor._muteButtons[i].toggleMute();

                  this._doc.song.channels[i].muted = this._muteButtonEditor._muteButtons[i].getMuteState();
              }
          }
          // Else, mute all
          else {
              for (let i: number = 0; i < this._doc.song.getChannelCount(); i++) {
                  if (this._muteButtonEditor._muteButtons[i].getMuteState() == false)
                      this._muteButtonEditor._muteButtons[i].toggleMute();

                  this._doc.song.channels[i].muted = this._muteButtonEditor._muteButtons[i].getMuteState();
              }
          }
           event.preventDefault();
          break;
      case 78: // n
          // Find lowest-index unused pattern for current channel
          // Shift+n - lowest-index completely empty pattern

          if (event.shiftKey || event.ctrlKey) {
              let nextEmpty: number = 0;
              while (this._doc.song.channels[this._doc.channel].patterns[nextEmpty].notes.length > 0
                  && nextEmpty <= this._doc.song.patternsPerChannel)
                  nextEmpty++;

              if (nextEmpty <= this._doc.song.patternsPerChannel) {
                  this._doc.song.channels[this._doc.channel].bars[this._doc.bar] = nextEmpty + 1;

                  this._doc.notifier.changed();
              }

          }
          else {
              let nextUnused: number = 1;
              while (this._doc.song.channels[this._doc.channel].bars.indexOf(nextUnused) != -1
                  && nextUnused <= this._doc.song.patternsPerChannel)
                  nextUnused++;

              if (nextUnused <= this._doc.song.patternsPerChannel) {
                  this._doc.song.channels[this._doc.channel].bars[this._doc.bar] = nextUnused;
                  
                  this._doc.notifier.changed();
              }
          }
          
           event.preventDefault();
          break;
      case 77: // m
          this._muteButtonEditor._muteButtons[this._doc.channel].toggleMute();
           this._doc.song.channels[this._doc.channel].muted = this._muteButtonEditor._muteButtons[this._doc.channel].getMuteState();
           event.preventDefault();
          break;
      case 83: // s

          var muteCondition = false;

          for (let i: number = 0; i < this._doc.song.getChannelCount(); i++) {
              if (this._muteButtonEditor._muteButtons[i].getMuteState() == ( i == this._doc.channel ) )
                  muteCondition = true;
          }

          // If this channel exactly is solo, unmute all
          if (muteCondition == false) {
              for (let i: number = 0; i < this._doc.song.getChannelCount(); i++) {
                  if (this._muteButtonEditor._muteButtons[i].getMuteState() == true)
                      this._muteButtonEditor._muteButtons[i].toggleMute();

                  this._doc.song.channels[i].muted = this._muteButtonEditor._muteButtons[i].getMuteState();
              }
          }
          // Else, mute all except current channel
          else {
              for (let i: number = 0; i < this._muteButtonEditor._muteButtons.length; i++) {

                  if (i == this._doc.channel && this._muteButtonEditor._muteButtons[i].getMuteState() == true)
                      this._muteButtonEditor._muteButtons[i].toggleMute();
                  else if (i != this._doc.channel && this._muteButtonEditor._muteButtons[i].getMuteState() == false)
                      this._muteButtonEditor._muteButtons[i].toggleMute();

                  this._doc.song.channels[i].muted = this._muteButtonEditor._muteButtons[i].getMuteState();

              }


          }
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
						delete instrumentObject["volume"];
						delete instrumentObject["preset"];
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
		            if (event.shiftKey || event.ctrlKey) { //Octave shift
		                for (let i: number = 0; i < 11; i++) {
		                    this._transpose(false, true);
		                }
		            }
					this._transpose(false, false);
					event.preventDefault();
					break;
				case 187: // +
				case 61: // Firefox +
          			if (event.shiftKey || event.ctrlKey) { //Octave shift
              			for (let i: number = 0; i < 11; i++) {
                  			this._transpose(true, true);
              			}
          			}
					this._transpose(true, false);
					event.preventDefault();
					break;
			}
		}
		
		private _copyTextToClipboard(text: string): void {
			// Set as any to allow compilation without clipboard types (since, uh, I didn't write this bit and don't know the proper types library) -jummbus
			let nav : any;
			nav = navigator;
			
			if (nav.clipboard && nav.clipboard.writeText) {
				nav.clipboard.writeText(text).catch(()=>{
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

      /*
    	private multiPatternZero(): void {

	        var patternArray: (PatternCopy | null)[][] = [];
	        var indexArray: number[][] = [];
	
	        for (let bar: number = 0; bar <= this._trackEditor._selectionWidth; bar++) {
	
	            for (let channel: number = 0; channel <= this._trackEditor._selectionHeight; channel++) {
	
	                const pattern: Pattern | null = this._doc.song.getPattern(channel + this._trackEditor._selectionTop, bar + this._trackEditor._selectionLeft);
	
	                if (pattern == null) {
	                    patternArray[bar][channel] = null;
	                }
	                else {
	                    const patternCopy: PatternCopy = {
	                    notes: pattern.notes,
	                    beatsPerBar: this._doc.song.beatsPerBar,
	                	drums: this._doc.song.getChannelIsNoise(channel + this._trackEditor._selectionTop),
	                };
	
	                patternArray[bar][channel] = patternCopy;
	
	            }
	
	            indexArray[bar][channel] = this._doc.song.channels[channel + this._trackEditor._selectionTop].bars[bar + this._trackEditor._selectionLeft];
	        }
        }

        var storageArray: any[] = [this._trackEditor._selectionWidth, this._trackEditor._selectionHeight, patternArray, indexArray];

        window.localStorage.setItem("patternCopyMulti", JSON.stringify(storageArray));
        window.localStorage.setItem("patternCopy", "{}");

        this._trackEditor.clearSelection();
        this._trackEditor.render();

    }
    */
		
		private _copy(): void {
            // Determine whether to copy single pattern or multiple based on track editor's selection
            if (this._trackEditor.hasASelection()) {

                var patternArray: (PatternCopy | null)[][] = [];
                var indexArray: number[][] = [];

                for (let bar: number = 0; bar <= this._trackEditor._selectionWidth; bar++) {

                    patternArray[bar] = [];
                    indexArray[bar] = [];

                    for (let channel: number = 0; channel <= this._trackEditor._selectionHeight; channel++) {

                        const pattern: Pattern | null = this._doc.song.getPattern(channel + this._trackEditor._selectionTop, bar + this._trackEditor._selectionLeft);

                        if (pattern == null) {
                            patternArray[bar][channel] = null;
                        }
                        else {
                            const patternCopy : PatternCopy = {
                                notes: pattern.notes,
                                beatsPerBar: this._doc.song.beatsPerBar,
                                drums: this._doc.song.getChannelIsNoise(channel + this._trackEditor._selectionTop),
                            };

                            patternArray[bar][channel] = patternCopy;
                            
                        }

                        indexArray[bar][channel] = this._doc.song.channels[channel + this._trackEditor._selectionTop].bars[bar + this._trackEditor._selectionLeft];
                    }
                }

                var storageArray: any[] = [this._trackEditor._selectionWidth, this._trackEditor._selectionHeight, patternArray, indexArray];

                window.localStorage.setItem("patternCopyMulti", JSON.stringify(storageArray));
                window.localStorage.setItem("patternCopy", "{}");

                this._trackEditor.clearSelection();
                this._trackEditor.render();

            } else {

			const pattern: Pattern | null = this._doc.getCurrentPattern();
                if (pattern == null) return;
			
			const patternCopy: PatternCopy = {
                    notes: pattern.notes,
				beatsPerBar: this._doc.song.beatsPerBar,
				drums: this._doc.song.getChannelIsNoise(this._doc.channel),
			};
			
			window.localStorage.setItem("patternCopy", JSON.stringify(patternCopy));
                window.localStorage.setItem("patternCopyMulti", "{}");

            }
		}
		
		private _paste(): void {
				const pattern: Pattern | null = this._doc.getCurrentPattern();
			
      const patternCopy: PatternCopy | null = JSON.parse(String(window.localStorage.getItem("patternCopy")));
      const patternCopyMulti: any[] | null = JSON.parse(String(window.localStorage.getItem("patternCopyMulti")));
			
			if (patternCopy != null && pattern != null && patternCopy["drums"] == this._doc.song.getChannelIsNoise(this._doc.channel)) {
				this._doc.record(new ChangePaste(this._doc, pattern, patternCopy["notes"], patternCopy["beatsPerBar"]));
			}
            else if (patternCopyMulti != null) {
                // If check for property "drums" fails, check if this is a multi-pattern copy and handle that instead.
                var selectionWidth = +patternCopyMulti[0];
                var selectionHeight = +patternCopyMulti[1];
                var patternArray : PatternCopy[][] = patternCopyMulti[2];
                var indexArray : number[][] = patternCopyMulti[3];

                var pasteGroup: ChangeGroup = new ChangeGroup();

                var prevChannel = this._doc.channel;
                var prevBar = this._doc.bar;

                for (let bar: number = 0; bar <= selectionWidth && bar + prevBar < this._doc.song.barCount; bar++) {
                    for (let channel: number = 0; channel <= selectionHeight && channel + prevChannel < this._doc.song.getChannelCount(); channel++) {
                        const patternCopy: PatternCopy | null = patternArray[bar][channel];

                        // Change pattern
                        this._doc.channel = channel + prevChannel;
                        this._doc.bar = bar + prevBar;
                        pasteGroup.append(new ChangePattern(this._doc, this._doc.song.channels[this._doc.channel].bars[this._doc.bar], indexArray[bar][channel]));

                        // Change notes in pattern
                        if (patternCopy != null && patternCopy.drums == this._doc.song.getChannelIsNoise(this._doc.channel)) {

                            var currentPattern = this._doc.song.getPattern(this._doc.channel, this._doc.bar);

                            if ( currentPattern != null ) 
                                pasteGroup.append(new ChangePaste(this._doc, currentPattern, patternCopy.notes, patternCopy.beatsPerBar));
                        }
                        
                    }
                }

                this._doc.channel = prevChannel;
                this._doc.bar = prevBar;

                this._doc.record(pasteGroup, false);
                
            }
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

	        // @jummbus: Guh, I don't know why you'd do this. I like the volume where it is!
	        // delete instrumentCopy["volume"];

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
		
	    private _transpose(upward: boolean, ignoreScale: boolean): void {
	
	        // Apply transpose to all selected patterns. But only a single, discrete pattern once (So if you select [1123], the transpose will apply once to 1,2,3.)
	        if (this._trackEditor.hasASelection()) {
	
	            let previousChannel = this._doc.channel;
	            let previousBar = this._doc.bar;
	
	            let changeGroup: ChangeGroup = new ChangeGroup();
	            const canReplaceLastChange: boolean = this._doc.lastChangeWas(this._changeTranspose);
	
	            for (let channel: number = 0; channel <= this._trackEditor._selectionHeight; channel++) {
	          	    let usedBars: number[] = [];
	
	                for (let bar: number = 0; bar <= this._trackEditor._selectionWidth; bar++) {
	
	            	    // ChangeTranspose uses current channel, so these are temporarily updated.
	            	    this._doc.bar = bar;
	            	    this._doc.channel = channel;
	
	            	    const ptnNum: number = this._doc.song.channels[channel + this._trackEditor._selectionTop].bars[bar + this._trackEditor._selectionLeft];
	
	            	    // Check if this pattern for this channel was already transposed to or not.
	            	    if ( usedBars.indexOf(ptnNum) < 0 ) {
	              		    usedBars.push(ptnNum);
	
	              		    const pattern: Pattern | null = this._doc.song.getPattern(channel + this._trackEditor._selectionTop, bar + this._trackEditor._selectionLeft);
	              		    if (pattern == null) continue;
	
	              		    changeGroup.append( new ChangeTranspose(this._doc, pattern, upward, ignoreScale) );
	
	            	    }
	
	                }
	            }
	
	            this._doc.channel = previousChannel;
	            this._doc.bar = previousBar;
	
	            this._doc.record(changeGroup, canReplaceLastChange);
	
	        }
	        else {
	
				 const pattern: Pattern | null = this._doc.getCurrentPattern();
				 if (pattern == null) return;
				
				 const canReplaceLastChange: boolean = this._doc.lastChangeWas(this._changeTranspose);
	        	 this._changeTranspose = new ChangeTranspose(this._doc, pattern, upward, ignoreScale);
				 this._doc.record(this._changeTranspose, canReplaceLastChange);
		    }
	    }

		/*
		private _openInstrumentTypePrompt = (): void => {
			this._openPrompt("instrumentType");
		}
		
		private _openIntervalPrompt = (): void => {
			this._openPrompt("interval");
		}
		*/
		private _whenSetTempo = (): void => {
			this._doc.record(new ChangeTempo(this._doc, -1, parseInt(this._tempoStepper.value) | 0));
		}
		
		private _whenSetScale = (): void => {
			this._doc.record(new ChangeScale(this._doc, this._scaleSelect.selectedIndex));
		}
		
		private _whenSetKey = (): void => {
			this._doc.record(new ChangeKey(this._doc, Config.keys.length - 1 - this._keySelect.selectedIndex));
		}
		
		private _whenSetRhythm = (): void => {
			this._doc.record(new ChangeRhythm(this._doc, this._rhythmSelect.selectedIndex));
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
			const pattern : Pattern | null = this._doc.getCurrentPattern();
			if (pattern == null) return;
			this._doc.record(new ChangePatternInstrument(this._doc, this._instrumentSelect.selectedIndex, pattern));
		    this.mainLayer.focus();
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
					this._doc.record(new ChangeSong(this._doc, ""));
					break;
				case "export":
					this._openPrompt("export");
					break;
				case "import":
					this._openPrompt("import");
					break;
				case "copyUrl": {
					this._copyTextToClipboard(location.href);
				} break;
				case "shareUrl":
					(<any>navigator).share({ url: location.href });
					break;
				case "viewPlayer":
					location.href = "player/#song=" + this._doc.song.toBase64String();
					break;
				case "copyEmbed":
					this._copyTextToClipboard(`<iframe width="384" height="60" style="border: none;" src="${new URL("player/#song=" + this._doc.song.toBase64String(), location.href).href}"></iframe>`);
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
				case "transposeUp":
					this._transpose(true, false);
					break;
				case "transposeDown":
					this._transpose(false, false);
					break;
				case "detectKey":
					this._doc.record(new ChangeDetectKey(this._doc));
					break;
				case "forceScale":
					this._doc.record(new ChangeForceScale(this._doc));
					break;
				case "forceRhythm":
					this._doc.record(new ChangeForceRhythm(this._doc));
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
				//case "alwaysShowSettings":
					//this._doc.alwaysShowSettings = !this._doc.alwaysShowSettings;
					//break;
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
	        this._doc.record(new ChangeVolume(this._doc, +this._instrumentVolumeSlider.input.value, -Config.volumeRange / 2 + Math.round(Config.chipWaves[index].volume * Config.volumeRange/2 ) ));
	
	        this._customWavePresetDrop.selectedIndex = 0;
	        this._doc.notifier.changed();
	        this._doc.savePreferences();
	    }
	}
	
}
