// Copyright (c) John Nesky and contributing authors, distributed under the MIT license, see accompanying the LICENSE.md file.

import {DictionaryArray, BeepBoxOption, InstrumentType, toNameMap} from "../synth/SynthConfig.js";

export interface PresetCategory extends BeepBoxOption {
	readonly presets: DictionaryArray<Preset>;
}

export interface Preset extends BeepBoxOption {
	readonly isNoise?: boolean;
	readonly generalMidi?: boolean;
	readonly midiProgram?: number;
	readonly midiSubharmonicOctaves?: number;
	readonly customType?: InstrumentType;
	readonly settings?: any;
}

export const isMobile: boolean = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|android|ipad|playbook|silk/i.test(navigator.userAgent);

export function prettyNumber(value: number): string {
	return value.toFixed(2).replace(/\.?0*$/, "");
}

export class EditorConfig {
	public static readonly version: string = "4.3";
	
	public static readonly versionDisplayName: string = "YipBox";
	public static readonly releaseNotesURL: string = "https://github.com/johnnesky/beepbox/releases/tag/v" + EditorConfig.version;
	
	public static readonly isOnMac: boolean = /^Mac/i.test(navigator.platform) || /Mac OS X/i.test(navigator.userAgent) || /^(iPhone|iPad|iPod)/i.test(navigator.platform) || /(iPhone|iPad|iPod)/i.test(navigator.userAgent);
	public static readonly ctrlSymbol: string = EditorConfig.isOnMac ? "⌘" : "Ctrl+";
	public static readonly ctrlName: string = EditorConfig.isOnMac ? "command" : "control";
	
	public static readonly presetCategories: DictionaryArray<PresetCategory> = toNameMap([
		{name: "Custom Instruments", presets: <DictionaryArray<Preset>> toNameMap([
			{name: "chip wave",        customType: InstrumentType.chip},
			{name: "FM (expert)",      customType: InstrumentType.fm},
			{name: "basic noise",      customType: InstrumentType.noise},
			{name: "spectrum",         customType: InstrumentType.spectrum},
			{name: "drumset",          customType: InstrumentType.drumset},
			{name: "harmonics",        customType: InstrumentType.harmonics},
			{name: "pulse width",      customType: InstrumentType.pwm},
			{name: "picked string",    customType: InstrumentType.pickedString},
			{name: "supersaw",         customType: InstrumentType.supersaw},
		])},
		{name: "Retro Presets", presets: <DictionaryArray<Preset>> toNameMap([
			{name: "chip noise",       midiProgram: 116, isNoise: true, settings: {"type":"noise","transition":"hard","effects":"none","chord":"arpeggio","filterCutoffHz":4000,"filterResonance":0,"filterEnvelope":"steady","wave":"retro"}},
		])},
		{name: "Brass Presets", presets: <DictionaryArray<Preset>> toNameMap([
			{name: "trumpet",          midiProgram:  56, generalMidi: true, settings: {"type":"FM","effects":"reverb","transition":"soft","chord":"harmony","filterCutoffHz":2828,"filterResonance":43,"filterEnvelope":"steady","vibrato":"none","algorithm":"1←(2 3 4)","feedbackType":"1⟲","feedbackAmplitude":9,"feedbackEnvelope":"swell 1","operators":[{"frequency":"1×","amplitude":14,"envelope":"custom"},{"frequency":"1×","amplitude":8,"envelope":"steady"},{"frequency":"1×","amplitude":5,"envelope":"flare 2"},{"frequency":"1×","amplitude":0,"envelope":"steady"}]}},
			{name: "trombone",         midiProgram:  57, generalMidi: true, settings: {"type":"FM","effects":"reverb","transition":"soft","chord":"harmony","filterCutoffHz":2000,"filterResonance":43,"filterEnvelope":"steady","vibrato":"none","algorithm":"1←(2 3 4)","feedbackType":"2⟲","feedbackAmplitude":7,"feedbackEnvelope":"swell 1","operators":[{"frequency":"1×","amplitude":14,"envelope":"custom"},{"frequency":"1×","amplitude":8,"envelope":"steady"},{"frequency":"1×","amplitude":0,"envelope":"steady"},{"frequency":"1×","amplitude":0,"envelope":"steady"}]}},
			{name: "tuba",             midiProgram:  58, generalMidi: true, settings: {"type":"FM","effects":"reverb","transition":"soft","chord":"harmony","filterCutoffHz":2000,"filterResonance":43,"filterEnvelope":"steady","vibrato":"none","algorithm":"1←(2 3 4)","feedbackType":"2⟲","feedbackAmplitude":8,"feedbackEnvelope":"swell 1","operators":[{"frequency":"1×","amplitude":14,"envelope":"custom"},{"frequency":"1×","amplitude":6,"envelope":"steady"},{"frequency":"1×","amplitude":0,"envelope":"steady"},{"frequency":"1×","amplitude":0,"envelope":"steady"}]}},
			{name: "muted trumpet",    midiProgram:  59, generalMidi: true, settings: {"type":"FM","eqFilter":[{"type":"low-pass","cutoffHz":8000,"linearGain":2.8284},{"type":"peak","cutoffHz":4000,"linearGain":2.8284}],"effects":["note filter","reverb"],"noteFilter":[{"type":"low-pass","cutoffHz":3363.59,"linearGain":1}],"reverb":33,"fadeInSeconds":0.0263,"fadeOutTicks":-3,"algorithm":"1←(2 3←4)","feedbackType":"1⟲","feedbackAmplitude":5,"operators":[{"frequency":"1×","amplitude":13},{"frequency":"1×","amplitude":5},{"frequency":"9×","amplitude":5},{"frequency":"13×","amplitude":7}],"envelopes":[{"target":"noteFilterAllFreqs","envelope":"swell 1"},{"target":"operatorAmplitude","envelope":"swell 1","index":3},{"target":"feedbackAmplitude","envelope":"flare 2"}]}},
			{name: "french horn",      midiProgram:  60, generalMidi: true, settings: {"type":"FM","eqFilter":[{"type":"low-pass","cutoffHz":4000,"linearGain":1},{"type":"peak","cutoffHz":2378.41,"linearGain":2.8284}],"effects":["reverb"],"reverb":33,"fadeInSeconds":0.0263,"fadeOutTicks":-3,"algorithm":"1←3 2←4","feedbackType":"1⟲ 2⟲","feedbackAmplitude":3,"operators":[{"frequency":"1×","amplitude":15},{"frequency":"1×","amplitude":12},{"frequency":"1×","amplitude":10},{"frequency":"~1×","amplitude":8}],"envelopes":[{"target":"operatorAmplitude","envelope":"swell 1","index":2},{"target":"operatorAmplitude","envelope":"flare 2","index":3},{"target":"feedbackAmplitude","envelope":"swell 1"}]}},
			{name: "brass section",    midiProgram:  61, generalMidi: true, settings: {"type":"FM","effects":"reverb","transition":"soft","chord":"harmony","filterCutoffHz":2828,"filterResonance":14,"filterEnvelope":"punch","vibrato":"none","algorithm":"1←3 2←4","feedbackType":"1⟲ 2⟲","feedbackAmplitude":6,"feedbackEnvelope":"swell 1","operators":[{"frequency":"1×","amplitude":14,"envelope":"custom"},{"frequency":"1×","amplitude":12,"envelope":"custom"},{"frequency":"1×","amplitude":10,"envelope":"swell 1"},{"frequency":"~1×","amplitude":10,"envelope":"swell 1"}]}},
			{name: "brass synth 1",    midiProgram:  62, generalMidi: true, settings: {"type":"FM","effects":"reverb","transition":"soft","chord":"harmony","filterCutoffHz":4000,"filterResonance":29,"filterEnvelope":"steady","vibrato":"none","algorithm":"1←3 2←4","feedbackType":"1⟲ 2⟲","feedbackAmplitude":11,"feedbackEnvelope":"swell 1","operators":[{"frequency":"1×","amplitude":14,"envelope":"custom"},{"frequency":"1×","amplitude":14,"envelope":"custom"},{"frequency":"1×","amplitude":12,"envelope":"flare 1"},{"frequency":"~1×","amplitude":8,"envelope":"flare 2"}]}},
			{name: "brass synth 2",    midiProgram:  63, generalMidi: true, settings: {"type":"FM","transition":"soft","effects":"reverb","chord":"harmony","filterCutoffHz":4000,"filterResonance":43,"filterEnvelope":"twang 3","vibrato":"none","algorithm":"1←3 2←4","feedbackType":"1⟲ 2⟲","feedbackAmplitude":9,"feedbackEnvelope":"swell 1","operators":[{"frequency":"1×","amplitude":15,"envelope":"custom"},{"frequency":"1×","amplitude":15,"envelope":"custom"},{"frequency":"1×","amplitude":10,"envelope":"flare 1"},{"frequency":"~1×","amplitude":7,"envelope":"flare 1"}]}},
			{name: "pulse brass",      midiProgram:  62, settings: {"type":"PWM","effects":"reverb","transition":"soft","chord":"harmony","filterCutoffHz":4000,"filterResonance":29,"filterEnvelope":"swell 1","pulseWidth":50,"pulseEnvelope":"flare 3","vibrato":"none"}},
		])},
		{name: "Drum Presets", presets: <DictionaryArray<Preset>> toNameMap([
			{name: "standard drumset", midiProgram: 116, isNoise: true, settings: {"type":"drumset","effects":"reverb","drums":[{"filterEnvelope":"twang 1","spectrum":[57,71,71,86,86,86,71,71,71,71,57,57,57,57,43,43,43,43,29,29,29,29,29,29,29,29,29,29,29,29]},{"filterEnvelope":"twang 1","spectrum":[0,0,0,100,71,71,57,86,57,57,57,71,43,43,57,43,43,43,43,43,43,43,43,43,43,43,43,43,43,43]},{"filterEnvelope":"twang 1","spectrum":[0,0,0,0,100,57,43,43,29,57,43,29,71,43,43,43,43,57,43,43,43,43,43,43,43,43,29,43,43,43]},{"filterEnvelope":"twang 1","spectrum":[0,0,0,0,0,71,57,43,43,43,57,57,43,29,57,43,43,43,29,43,57,43,43,43,43,43,43,29,43,43]},{"filterEnvelope":"decay 2","spectrum":[0,14,29,43,86,71,29,43,43,43,43,29,71,29,71,29,43,43,43,43,57,43,43,57,43,43,43,57,57,57]},{"filterEnvelope":"decay 1","spectrum":[0,0,14,14,14,14,29,29,29,43,43,43,57,57,57,71,71,71,71,71,71,71,71,57,57,57,57,43,43,43]},{"filterEnvelope":"twang 3","spectrum":[43,43,43,71,29,29,43,43,43,29,43,43,43,29,29,43,43,29,29,29,57,14,57,43,43,57,43,43,57,57]},{"filterEnvelope":"decay 3","spectrum":[29,43,43,43,43,29,29,43,29,29,43,29,14,29,43,29,43,29,57,29,43,57,43,71,43,71,57,57,71,71]},{"filterEnvelope":"twang 3","spectrum":[43,29,29,43,29,29,29,57,29,29,29,57,43,43,29,29,57,43,43,43,71,43,43,71,57,71,71,71,71,71]},{"filterEnvelope":"decay 3","spectrum":[57,57,57,43,57,57,43,43,57,43,43,43,71,57,43,57,86,71,57,86,71,57,86,100,71,86,86,86,86,86]},{"filterEnvelope":"flare 1","spectrum":[0,0,14,14,14,14,29,29,29,43,43,43,57,57,71,71,86,86,100,100,100,100,100,100,100,100,86,57,29,0]},{"filterEnvelope":"decay 2","spectrum":[14,14,14,14,29,14,14,29,14,43,14,43,57,86,57,57,100,57,43,43,57,100,57,43,29,14,0,0,0,0]}]}},
			{name: "steel pan",        midiProgram: 114, generalMidi: true, settings: {"type":"FM","eqFilter":[{"type":"high-pass","cutoffHz":62.5,"linearGain":0.1768}],"effects":["note filter","chorus","reverb"],"noteFilter":[{"type":"low-pass","cutoffHz":13454.34,"linearGain":0.25}],"chorus":67,"reverb":33,"transition":"normal","fadeInSeconds":0,"fadeOutTicks":24,"chord":"simultaneous","algorithm":"1←(2 3←4)","feedbackType":"1⟲","feedbackAmplitude":0,"operators":[{"frequency":"~1×","amplitude":14},{"frequency":"7×","amplitude":3},{"frequency":"3×","amplitude":5},{"frequency":"4×","amplitude":4}],"envelopes":[{"target":"noteFilterAllFreqs","envelope":"decay 2"},{"target":"operatorAmplitude","envelope":"flare 1","index":1},{"target":"operatorAmplitude","envelope":"flare 2","index":2},{"target":"operatorAmplitude","envelope":"swell 2","index":3}]}},
			{name: "steel pan synth",  midiProgram: 114, settings: {"type":"FM","eqFilter":[],"effects":["note filter"],"noteFilter":[{"type":"low-pass","cutoffHz":13454.34,"linearGain":0.25}],"transition":"normal","fadeInSeconds":0,"fadeOutTicks":-3,"chord":"simultaneous","algorithm":"1 2 3←4","feedbackType":"1⟲","feedbackAmplitude":5,"operators":[{"frequency":"~1×","amplitude":12},{"frequency":"2×","amplitude":15},{"frequency":"4×","amplitude":14},{"frequency":"~1×","amplitude":3}],"envelopes":[{"target":"noteFilterAllFreqs","envelope":"twang 1"},{"target":"operatorAmplitude","envelope":"note size","index":0},{"target":"operatorAmplitude","envelope":"note size","index":1},{"target":"operatorAmplitude","envelope":"flare 1","index":2},{"target":"operatorAmplitude","envelope":"flare 2","index":3},{"target":"feedbackAmplitude","envelope":"flare 1"}]}},
			{name: "timpani",          midiProgram:  47, generalMidi: true, settings: {"type":"spectrum","eqFilter":[{"type":"peak","cutoffHz":6727.17,"linearGain":5.6569}],"effects":["pitch shift","note filter","reverb"],"pitchShiftSemitones":15,"noteFilter":[{"type":"low-pass","cutoffHz":19027.31,"linearGain":0.5}],"reverb":33,"transition":"normal","fadeInSeconds":0,"fadeOutTicks":48,"chord":"simultaneous","spectrum":[100,0,0,0,86,0,0,71,0,14,43,14,43,43,0,29,43,29,29,29,43,29,43,29,43,43,43,43,43,43],"envelopes":[{"target":"noteFilterAllFreqs","envelope":"twang 1"},{"target":"pitchShift","envelope":"twang 1"}]}},
			{name: "dark strike",      midiProgram:  47, settings: {"type":"spectrum","eqFilter":[],"effects":["note filter","reverb"],"noteFilter":[{"type":"low-pass","cutoffHz":4756.83,"linearGain":0.7071}],"reverb":33,"transition":"normal","fadeInSeconds":0,"fadeOutTicks":48,"chord":"simultaneous","spectrum":[0,0,14,14,14,29,29,43,43,86,43,43,43,29,86,29,29,29,86,29,14,14,14,14,0,0,0,0,0,0],"envelopes":[{"target":"noteFilterAllFreqs","envelope":"twang 2"}]}},
			{name: "woodblock",        midiProgram: 115, generalMidi: true, isNoise: true, midiSubharmonicOctaves: -2.5, settings: {"type":"spectrum","effects":"reverb","transition":"hard fade","chord":"strum","filterCutoffHz":2828,"filterResonance":14,"filterEnvelope":"twang 1","spectrum":[0,14,29,43,43,57,86,86,71,57,57,43,43,57,86,86,43,43,71,57,57,57,57,57,86,86,71,71,71,71]}},
			{name: "taiko drum",       midiProgram: 116, generalMidi: true, isNoise: true, midiSubharmonicOctaves: -0.5, settings: {"type":"spectrum","effects":"reverb","transition":"hard fade","chord":"strum","filterCutoffHz":2828,"filterResonance":29,"filterEnvelope":"twang 1","spectrum":[71,100,100,43,43,71,71,43,43,43,43,43,43,57,29,57,43,57,43,43,57,43,43,43,43,43,43,43,43,43]}},
			{name: "melodic drum",     midiProgram: 117, generalMidi: true, isNoise: true, midiSubharmonicOctaves: -1.5, settings: {"type":"spectrum","effects":"reverb","transition":"hard fade","chord":"strum","filterCutoffHz":2828,"filterResonance":43,"filterEnvelope":"twang 1","spectrum":[100,71,71,57,57,43,43,71,43,43,43,57,43,43,57,43,43,43,43,29,29,29,29,29,29,29,29,29,29,29]}},
			{name: "drum synth",       midiProgram: 118, generalMidi: true, isNoise: true, midiSubharmonicOctaves: -2, settings: {"type":"spectrum","effects":"reverb","transition":"hard fade","chord":"harmony","filterCutoffHz":4000,"filterResonance":43,"filterEnvelope":"decay 1","spectrum":[100,86,71,57,43,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29]}},
			{name: "tom-tom",          midiProgram: 116, isNoise: true, midiSubharmonicOctaves: -1, settings: {"type":"spectrum","effects":"reverb","transition":"hard fade","chord":"strum","filterCutoffHz":2000,"filterResonance":14,"filterEnvelope":"twang 1","spectrum":[100,29,14,0,0,86,14,43,29,86,29,14,29,57,43,43,43,43,57,43,43,43,29,57,43,43,43,43,43,43]}},
			{name: "metal pipe",       midiProgram: 117, isNoise: true, midiSubharmonicOctaves: -1.5, settings: {"type":"spectrum","effects":"reverb","transition":"hard fade","chord":"strum","filterCutoffHz":8000,"filterResonance":14,"filterEnvelope":"twang 2","spectrum":[29,43,86,43,43,43,43,43,100,29,14,14,100,14,14,0,0,0,0,0,14,29,29,14,0,0,14,29,0,0]}},
			{name: "synth kick",       midiProgram:  47, settings: {"type":"FM","eqFilter":[],"effects":[],"transition":"normal","fadeInSeconds":0,"fadeOutTicks":-6,"chord":"simultaneous","algorithm":"1←(2 3 4)","feedbackType":"1⟲","feedbackAmplitude":0,"operators":[{"frequency":"8×","amplitude":15},{"frequency":"1×","amplitude":0},{"frequency":"1×","amplitude":0},{"frequency":"1×","amplitude":0}],"envelopes":[{"target":"operatorFrequency","envelope":"twang 1","index":0},{"target":"noteVolume","envelope":"twang 2"}]}},
		])},
	]);
	
	public static valueToPreset(presetValue: number): Preset | null {
		const categoryIndex: number = presetValue >> 6;
		const presetIndex: number = presetValue & 0x3F;
		return EditorConfig.presetCategories[categoryIndex].presets[presetIndex];
	}
	
	public static midiProgramToPresetValue(program: number): number | null {
		for (let categoryIndex: number = 0; categoryIndex < EditorConfig.presetCategories.length; categoryIndex++) {
			const category: PresetCategory = EditorConfig.presetCategories[categoryIndex];
			for (let presetIndex: number = 0; presetIndex < category.presets.length; presetIndex++) {
				const preset: Preset = category.presets[presetIndex];
				if (preset.generalMidi && preset.midiProgram == program) return (categoryIndex << 6) + presetIndex;
			}
		}
		return null;
	}
	
	public static nameToPresetValue(presetName: string): number | null {
		for (let categoryIndex: number = 0; categoryIndex < EditorConfig.presetCategories.length; categoryIndex++) {
			const category: PresetCategory = EditorConfig.presetCategories[categoryIndex];
			for (let presetIndex: number = 0; presetIndex < category.presets.length; presetIndex++) {
				const preset: Preset = category.presets[presetIndex];
				if (preset.name == presetName) return (categoryIndex << 6) + presetIndex;
			}
		}
		return null;
	}
}
