// Copyright (C) 2020 John Nesky, distributed under the MIT license.

import { BeepBoxOption, DictionaryArray, toNameMap, Config } from "../synth/SynthConfig";
import { Song } from "../synth/synth";
import { HTML } from "imperative-html/dist/esm/elements-strict";

//namespace beepbox {
export interface ChannelColors extends BeepBoxOption {
	readonly secondaryChannel: string;
	readonly primaryChannel: string;
	readonly secondaryNote: string;
	readonly primaryNote: string;
}

export class ColorConfig {
	public static colorLookup: Map<number, ChannelColors> = new Map<number, ChannelColors>();

	public static readonly themes: { [name: string]: string } = {
		"dark classic": `
				:root {
					--page-margin: black;
					--editor-background: black;
					--hover-preview: white;
					--playhead: white;
					--primary-text: white;
					--secondary-text: #999;
					--inverted-text: black;
					--text-selection: rgba(119,68,255,0.99);
					--box-selection-fill: rgba(255,255,255,0.2);
					--loop-accent: #74f;
					--link-accent: #98f;
					--ui-widget-background: #444;
					--ui-widget-focus: #777;
					--pitch-background: #444;
					--tonic: #864;
					--fifth-note: #468;
					--white-piano-key: #bbb;
					--black-piano-key: #444;
					--use-color-formula: false;
					--track-editor-bg-pitch: #444;
					--track-editor-bg-pitch-dim: #333;
					--track-editor-bg-noise: #444;
					--track-editor-bg-noise-dim: #333;
					--track-editor-bg-mod: #234;
					--track-editor-bg-mod-dim: #123;
					--multiplicative-mod-slider: #456;
					--overwriting-mod-slider: #654;
					--indicator-primary: #74f;
					--indicator-secondary: #444;
					--select2-opt-group: #585858;
					--input-box-outline: #333;
					--mute-button-normal: #ffa033;
					--mute-button-mod: #9a6bff;
					--pitch1-secondary-channel: #0099a1;
					--pitch1-primary-channel:   #25f3ff;
					--pitch1-secondary-note:    #00bdc7;
					--pitch1-primary-note:      #92f9ff;
					--pitch2-secondary-channel: #a1a100;
					--pitch2-primary-channel:   #ffff25;
					--pitch2-secondary-note:    #c7c700;
					--pitch2-primary-note:      #ffff92;
					--pitch3-secondary-channel: #c75000;
					--pitch3-primary-channel:   #ff9752;
					--pitch3-secondary-note:    #ff771c;
					--pitch3-primary-note:      #ffcdab;
					--pitch4-secondary-channel: #00a100;
					--pitch4-primary-channel:   #50ff50;
					--pitch4-secondary-note:    #00c700;
					--pitch4-primary-note:      #a0ffa0;
					--pitch5-secondary-channel: #d020d0;
					--pitch5-primary-channel:   #ff90ff;
					--pitch5-secondary-note:    #e040e0;
					--pitch5-primary-note:      #ffc0ff;
					--pitch6-secondary-channel: #7777b0;
					--pitch6-primary-channel:   #a0a0ff;
					--pitch6-secondary-note:    #8888d0;
					--pitch6-primary-note:      #d0d0ff;
					--pitch7-secondary-channel: #8AA100;
					--pitch7-primary-channel:   #DEFF25;
					--pitch7-secondary-note:	  #AAC700;
					--pitch7-primary-note:			#E6FF92;
					--pitch8-secondary-channel: #DF0019;
					--pitch8-primary-channel:   #FF98A4;
					--pitch8-secondary-note:    #FF4E63;
					--pitch8-primary-note:      #FFB2BB;
					--pitch9-secondary-channel: #00A170;
					--pitch9-primary-channel:   #50FFC9;
					--pitch9-secondary-note:    #00C78A;
					--pitch9-primary-note:			#83FFD9;
					--pitch10-secondary-channel:#A11FFF;
					--pitch10-primary-channel:  #CE8BFF;
					--pitch10-secondary-note:   #B757FF;
					--pitch10-primary-note:     #DFACFF;
					--noise1-secondary-channel: #6f6f6f;
					--noise1-primary-channel:   #aaaaaa;
					--noise1-secondary-note:    #a7a7a7;
					--noise1-primary-note:      #e0e0e0;
					--noise2-secondary-channel: #996633;
					--noise2-primary-channel:   #ddaa77;
					--noise2-secondary-note:    #cc9966;
					--noise2-primary-note:      #f0d0bb;
					--noise3-secondary-channel: #4a6d8f;
					--noise3-primary-channel:   #77aadd;
					--noise3-secondary-note:    #6f9fcf;
					--noise3-primary-note:      #bbd7ff;
					--noise4-secondary-channel: #6B3E8E;
					--noise4-primary-channel:   #AF82D2;
					--noise4-secondary-note:    #9E71C1;
					--noise4-primary-note:      #D4C1EA;
          --mod1-secondary-channel:   #339955;
					--mod1-primary-channel:     #77fc55;
					--mod1-secondary-note:      #77ff8a;
					--mod1-primary-note:        #cdffee;
					--mod2-secondary-channel:   #993355;
					--mod2-primary-channel:     #f04960;
					--mod2-secondary-note:      #f057a0;
					--mod2-primary-note:        #ffb8de;
					--mod3-secondary-channel:   #553399;
					--mod3-primary-channel:     #8855fc;
					--mod3-secondary-note:      #aa64ff;
					--mod3-primary-note:			  #f8ddff;
					--mod4-secondary-channel:   #a86436;
					--mod4-primary-channel:     #c8a825;
					--mod4-secondary-note:      #e8ba46;
					--mod4-primary-note:        #fff6d3;
					--mod-label-primary:        #999;
					--mod-label-secondary-text: #333;
					--mod-label-primary-text:   black;

				}
			`,
		"dark competition": `
				:root {
					--page-margin: black;
					--editor-background: black;
					--hover-preview: #ddd;
					--playhead: #ddd;
					--primary-text: #ddd;
					--secondary-text: #8e695b;
					--inverted-text: black;
					--text-selection: rgba(169,0,255,0.99);
					--box-selection-fill: rgba(221,221,221,0.2);
					--loop-accent: #bf15ba;
					--link-accent: #f888ff;
					--ui-widget-background: #443a3a;
					--ui-widget-focus: #777;
					--pitch-background: #353333;
					--tonic: #884a44;
					--fifth-note: #415498;
					--white-piano-key: #bbb;
					--black-piano-key: #444;
					--use-color-formula: false;
					--track-editor-bg-pitch: #444;
					--track-editor-bg-pitch-dim: #333;
					--track-editor-bg-noise: #444;
					--track-editor-bg-noise-dim: #333;
					--track-editor-bg-mod: #234;
					--track-editor-bg-mod-dim: #123;
					--multiplicative-mod-slider: #456;
					--overwriting-mod-slider: #654;
					--indicator-primary: #74f;
					--indicator-secondary: #444;
					--select2-opt-group: #585858;
					--input-box-outline: #333;
					--mute-button-normal: #ffa033;
					--mute-button-mod: #9a6bff;
					--pitch1-secondary-channel: #0099a1;
					--pitch1-primary-channel:   #25f3ff;
					--pitch1-secondary-note:    #00bdc7;
					--pitch1-primary-note:      #92f9ff;
					--pitch2-secondary-channel: #a1a100;
					--pitch2-primary-channel:   #ffff25;
					--pitch2-secondary-note:    #c7c700;
					--pitch2-primary-note:      #ffff92;
					--pitch3-secondary-channel: #c75000;
					--pitch3-primary-channel:   #ff9752;
					--pitch3-secondary-note:    #ff771c;
					--pitch3-primary-note:      #ffcdab;
					--pitch4-secondary-channel: #00a100;
					--pitch4-primary-channel:   #50ff50;
					--pitch4-secondary-note:    #00c700;
					--pitch4-primary-note:      #a0ffa0;
					--pitch5-secondary-channel: #d020d0;
					--pitch5-primary-channel:   #ff90ff;
					--pitch5-secondary-note:    #e040e0;
					--pitch5-primary-note:      #ffc0ff;
					--pitch6-secondary-channel: #7777b0;
					--pitch6-primary-channel:   #a0a0ff;
					--pitch6-secondary-note:    #8888d0;
					--pitch6-primary-note:      #d0d0ff;
					--pitch7-secondary-channel: #8AA100;
					--pitch7-primary-channel:   #DEFF25;
					--pitch7-secondary-note:	  #AAC700;
					--pitch7-primary-note:			#E6FF92;
					--pitch8-secondary-channel: #DF0019;
					--pitch8-primary-channel:   #FF98A4;
					--pitch8-secondary-note:    #FF4E63;
					--pitch8-primary-note:      #FFB2BB;
					--pitch9-secondary-channel: #00A170;
					--pitch9-primary-channel:   #50FFC9;
					--pitch9-secondary-note:    #00C78A;
					--pitch9-primary-note:			#83FFD9;
					--pitch10-secondary-channel:#A11FFF;
					--pitch10-primary-channel:  #CE8BFF;
					--pitch10-secondary-note:   #B757FF;
					--pitch10-primary-note:     #DFACFF;
					--noise1-secondary-channel: #6f6f6f;
					--noise1-primary-channel:   #aaaaaa;
					--noise1-secondary-note:    #a7a7a7;
					--noise1-primary-note:      #e0e0e0;
					--noise2-secondary-channel: #996633;
					--noise2-primary-channel:   #ddaa77;
					--noise2-secondary-note:    #cc9966;
					--noise2-primary-note:      #f0d0bb;
					--noise3-secondary-channel: #4a6d8f;
					--noise3-primary-channel:   #77aadd;
					--noise3-secondary-note:    #6f9fcf;
					--noise3-primary-note:      #bbd7ff;
					--noise4-secondary-channel: #6B3E8E;
					--noise4-primary-channel:   #AF82D2;
					--noise4-secondary-note:    #9E71C1;
					--noise4-primary-note:      #D4C1EA;
          --mod1-secondary-channel:   #339955;
					--mod1-primary-channel:     #77fc55;
					--mod1-secondary-note:      #77ff8a;
					--mod1-primary-note:        #cdffee;
					--mod2-secondary-channel:   #993355;
					--mod2-primary-channel:     #f04960;
					--mod2-secondary-note:      #f057a0;
					--mod2-primary-note:        #ffb8de;
					--mod3-secondary-channel:   #553399;
					--mod3-primary-channel:     #8855fc;
					--mod3-secondary-note:      #aa64ff;
					--mod3-primary-note:			  #f8ddff;
					--mod4-secondary-channel:   #a86436;
					--mod4-primary-channel:     #c8a825;
					--mod4-secondary-note:      #e8ba46;
					--mod4-primary-note:        #fff6d3;
					--mod-label-primary:        #999;
					--mod-label-secondary-text: #333;
					--mod-label-primary-text:   black;

				}
			`,
		"light classic": `
				:root {
					-webkit-text-stroke-width: 0.5px;
					--page-margin: #685d88;
					--editor-background: white;
					--hover-preview: black;
					--playhead: rgba(0,0,0,0.5);
					--primary-text: black;
					--secondary-text: #777;
					--inverted-text: white;
					--text-selection: rgba(200,170,255,0.99);
					--box-selection-fill: rgba(0,0,0,0.1);
					--loop-accent: #98f;
					--link-accent: #74f;
					--ui-widget-background: #ececec;
					--ui-widget-focus: #eee;
					--pitch-background: #ececec;
					--tonic: #f0d6b6;
					--fifth-note: #bbddf0;
					--white-piano-key: #eee;
					--black-piano-key: #666;
					--use-color-formula: false;
					--track-editor-bg-pitch: #ececec;
					--track-editor-bg-pitch-dim: #fdfdfd;
					--track-editor-bg-noise: #ececec;
					--track-editor-bg-noise-dim: #fdfdfd;
					--track-editor-bg-mod: #dbecfd;
					--track-editor-bg-mod-dim: #ecfdff;
					--multiplicative-mod-slider: #789;
					--overwriting-mod-slider: #987;
					--indicator-primary: #98f;
					--indicator-secondary: #cde;
					--select2-opt-group: #cecece;
					--input-box-outline: #ddd;
					--mute-button-normal: #c0b47f;
					--mute-button-mod: #bd7fc0;
					--pitch1-secondary-channel: #6CD9ED;
					--pitch1-primary-channel:   #00A0BD;
					--pitch1-secondary-note:    #34C2DC;
					--pitch1-primary-note:      #00758A;
					--pitch2-secondary-channel: #E3C941;
					--pitch2-primary-channel:   #B49700;
					--pitch2-secondary-note:    #D1B628;
					--pitch2-primary-note:      #836E00;
					--pitch3-secondary-channel: #FF9D61;
					--pitch3-primary-channel:   #E14E00;
					--pitch3-secondary-note:    #F67D3C;
					--pitch3-primary-note:      #B64000;
					--pitch4-secondary-channel: #4BE24B;
					--pitch4-primary-channel:   #00A800;
					--pitch4-secondary-note:    #2DC82D;
					--pitch4-primary-note:      #008000;
					--pitch5-secondary-channel: #FF90FF;
					--pitch5-primary-channel:   #E12EDF;
					--pitch5-secondary-note:    #EC6EEC;
					--pitch5-primary-note:      #A600A5;
					--pitch6-secondary-channel: #B5B5FE;
					--pitch6-primary-channel:   #6969FD;
					--pitch6-secondary-note:    #9393FE;
					--pitch6-primary-note:      #4A4AD7;
					--pitch7-secondary-channel: #CBE24B;
					--pitch7-primary-channel:   #8EA800;
					--pitch7-secondary-note:    #B0C82D;
					--pitch7-primary-note:      #6C8000;
					--pitch8-secondary-channel: #FF90A4;
					--pitch8-primary-channel:   #E12E4D;
					--pitch8-secondary-note:    #EC6E85;
					--pitch8-primary-note:      #A6001D;
					--pitch9-secondary-channel: #41E3B5;
					--pitch9-primary-channel:   #00B481;
					--pitch9-secondary-note:    #28D1A1;
					--pitch9-primary-note:      #00835E;
					--pitch10-secondary-channel:#CA77FF;
					--pitch10-primary-channel:  #9609FF;
					--pitch10-secondary-note:   #B54FFF;
					--pitch10-primary-note:     #8400E3;
					--noise1-secondary-channel: #C1C1C1;
					--noise1-primary-channel:   #898989;
					--noise1-secondary-note:    #ADADAD;
					--noise1-primary-note:      #6C6C6C;
					--noise2-secondary-channel: #E8BB8C;
					--noise2-primary-channel:   #BD7D3A;
					--noise2-secondary-note:    #D1A374;
					--noise2-primary-note:      #836342;
					--noise3-secondary-channel: #9BC4EB;
					--noise3-primary-channel:   #4481BE;
					--noise3-secondary-note:    #7CA7D3;
					--noise3-primary-note:      #476685;
					--noise4-secondary-channel: #C5A5E0;
					--noise4-primary-channel:   #8553AE;
					--noise4-secondary-note:    #AB87C8;
					--noise4-primary-note:      #684F7D;
					--mod1-secondary-channel:   #339955;
					--mod1-primary-channel:     #77dd55;
					--mod1-secondary-note:      #77ff8a;
					--mod1-primary-note:        #2ad84a;
					--mod2-secondary-channel:   #993355;
					--mod2-primary-channel:     #f04960;
					--mod2-secondary-note:      #f057a0;
					--mod2-primary-note:        #ba124a;
					--mod3-secondary-channel:   #553399;
					--mod3-primary-channel:     #8855fc;
					--mod3-secondary-note:      #aa64ff;
					--mod3-primary-note:        #7a1caa;
					--mod4-secondary-channel:   #a86436;
					--mod4-primary-channel:     #c8a825;
					--mod4-secondary-note:      #e8ba46;
					--mod4-primary-note:        #a86810;
					--mod-label-primary:        #dddddd;
					--mod-label-secondary-text: #777;
					--mod-label-primary-text:   black;
				}
				
				.beepboxEditor button, .beepboxEditor select {
					box-shadow: inset 0 0 0 1px var(--secondary-text);
				}

				.select2-selection__rendered {
					box-shadow: inset 0 0 0 1px var(--secondary-text);
				}
			`,
		"jummbox classic": `
				:root {
					--page-margin: #040410;
					--editor-background: #040410;
					--hover-preview: white;
					--playhead: rgba(255, 255, 255, 0.9);
					--primary-text: white;
					--secondary-text: #84859a;
					--inverted-text: black;
					--text-selection: rgba(119,68,255,0.99);
					--box-selection-fill: #044b94;
					--loop-accent: #74f;
					--link-accent: #98f;
					--ui-widget-background: #393e4f;
					--ui-widget-focus: #6d6886;
					--pitch-background: #393e4f;
					--tonic: #725491;
					--fifth-note: #54547a;
					--white-piano-key: #eee;
					--black-piano-key: #666;
					--use-color-formula: true;
					--track-editor-bg-pitch: #393e4f;
					--track-editor-bg-pitch-dim: #1c1d28;
					--track-editor-bg-noise: #3d3535;
					--track-editor-bg-noise-dim: #161313;
					--track-editor-bg-mod: #283560;
					--track-editor-bg-mod-dim: #0a101f;
					--multiplicative-mod-slider: #606c9f;
					--overwriting-mod-slider: #6850b5;
					--indicator-primary: #9c64f7;
					--indicator-secondary: #393e4f;
					--select2-opt-group: #5d576f;
					--input-box-outline: #222;
					--mute-button-normal: #dda85d;
					--mute-button-mod: #886eae;
					--mod-label-primary: #282840;
					--mod-label-secondary-text: rgb(87, 86, 120);
					--mod-label-primary-text: white;
					--pitch-secondary-channel-hue: 0;
					--pitch-secondary-channel-hue-scale: 6.1;
					--pitch-secondary-channel-sat: 83.3;
					--pitch-secondary-channel-sat-scale: 0.1;
					--pitch-secondary-channel-lum: 40;
					--pitch-secondary-channel-lum-scale: 0.05;
					--pitch-primary-channel-hue: 0;
					--pitch-primary-channel-hue-scale: 6.1;
					--pitch-primary-channel-sat: 100;
					--pitch-primary-channel-sat-scale: 0.1;
					--pitch-primary-channel-lum: 67.5;
					--pitch-primary-channel-lum-scale: 0.05;
					--pitch-secondary-note-hue: 0;
					--pitch-secondary-note-hue-scale: 6.1;
					--pitch-secondary-note-sat: 93.9;
					--pitch-secondary-note-sat-scale: 0.1;
					--pitch-secondary-note-lum: 25;
					--pitch-secondary-note-lum-scale: 0.05;
					--pitch-primary-note-hue: 0;
					--pitch-primary-note-hue-scale: 6.1;
					--pitch-primary-note-sat: 100;
					--pitch-primary-note-sat-scale: 0.05;
					--pitch-primary-note-lum: 85.6;
					--pitch-primary-note-lum-scale: 0.025;
					--noise-secondary-channel-hue: 0;
					--noise-secondary-channel-hue-scale: 2;
					--noise-secondary-channel-sat: 25;
					--noise-secondary-channel-sat-scale: 0;
					--noise-secondary-channel-lum: 42;
					--noise-secondary-channel-lum-scale: 0;
					--noise-primary-channel-hue: 0;
					--noise-primary-channel-hue-scale: 2;
					--noise-primary-channel-sat: 33;
					--noise-primary-channel-sat-scale: 0;
					--noise-primary-channel-lum: 63.5;
					--noise-primary-channel-lum-scale: 0;
					--noise-secondary-note-hue: 0;
					--noise-secondary-note-hue-scale: 2;
					--noise-secondary-note-sat: 33.5;
					--noise-secondary-note-sat-scale: 0;
					--noise-secondary-note-lum: 55;
					--noise-secondary-note-lum-scale: 0;
					--noise-primary-note-hue: 0;
					--noise-primary-note-hue-scale: 2;
					--noise-primary-note-sat: 46.5;
					--noise-primary-note-sat-scale: 0;
					--noise-primary-note-lum: 74;
					--noise-primary-note-lum-scale: 0;
					--mod-secondary-channel-hue: 192;
					--mod-secondary-channel-hue-scale: 1.5;
					--mod-secondary-channel-sat: 88;
					--mod-secondary-channel-sat-scale: 0;
					--mod-secondary-channel-lum: 50;
					--mod-secondary-channel-lum-scale: 0;
					--mod-primary-channel-hue: 192;
					--mod-primary-channel-hue-scale: 1.5;
					--mod-primary-channel-sat: 96;
					--mod-primary-channel-sat-scale: 0;
					--mod-primary-channel-lum: 80;
					--mod-primary-channel-lum-scale: 0;
					--mod-secondary-note-hue: 192;
					--mod-secondary-note-hue-scale: 1.5;
					--mod-secondary-note-sat: 92;
					--mod-secondary-note-sat-scale: 0;
					--mod-secondary-note-lum: 45;
					--mod-secondary-note-lum-scale: 0;
					--mod-primary-note-hue: 192;
					--mod-primary-note-hue-scale: 1.5;
					--mod-primary-note-sat: 96;
					--mod-primary-note-sat-scale: 0;
					--mod-primary-note-lum: 85;
					--mod-primary-note-lum-scale: 0;
				}
			`,
		"forest": `
				:root {
					--page-margin: #010c03;
					--editor-background: #010c03;
					--hover-preview: #efe;
					--playhead: rgba(232, 255, 232, 0.9);
					--primary-text: #efe;
					--secondary-text: #70A070;
					--inverted-text: #280228;
					--text-selection: rgba(255,68,199,0.99);
					--box-selection-fill: #267aa3;
					--loop-accent: #ffe845;
					--link-accent: #9f8;
					--ui-widget-background: #203829;
					--ui-widget-focus: #487860;
					--pitch-background: #203829;
					--tonic: #2b8d20;
					--fifth-note: #385840;
					--white-piano-key: #bda;
					--black-piano-key: #573;
					--use-color-formula: true;
					--track-editor-bg-pitch: #254820;
					--track-editor-bg-pitch-dim: #102819;
					--track-editor-bg-noise: #304050;
					--track-editor-bg-noise-dim: #102030;
					--track-editor-bg-mod: #506030;
					--track-editor-bg-mod-dim: #2a300a;
					--multiplicative-mod-slider: #205c8f;
					--overwriting-mod-slider: #20ac6f;
					--indicator-primary: #dcd866;
					--indicator-secondary: #203829;
					--select2-opt-group: #1a6f5a;
					--input-box-outline: #242;
					--mute-button-normal: #49e980;
					--mute-button-mod: #c2e502;
					--mod-label-primary: #133613;
					--mod-label-secondary-text: rgb(27, 126, 40);
					--mod-label-primary-text: #efe;
					--pitch-secondary-channel-hue: 120;
					--pitch-secondary-channel-hue-scale: 8.1;
					--pitch-secondary-channel-sat: 59;
					--pitch-secondary-channel-sat-scale: 0.1;
					--pitch-secondary-channel-lum: 50;
					--pitch-secondary-channel-lum-scale: 0.04;
					--pitch-primary-channel-hue: 120;
					--pitch-primary-channel-hue-scale: 8.1;
					--pitch-primary-channel-sat: 86;
					--pitch-primary-channel-sat-scale: 0.1;
					--pitch-primary-channel-lum: 70;
					--pitch-primary-channel-lum-scale: 0.04;
					--pitch-secondary-note-hue: 120;
					--pitch-secondary-note-hue-scale: 8.1;
					--pitch-secondary-note-sat: 85;
					--pitch-secondary-note-sat-scale: 0.1;
					--pitch-secondary-note-lum: 30;
					--pitch-secondary-note-lum-scale: 0.04;
					--pitch-primary-note-hue: 120;
					--pitch-primary-note-hue-scale: 8.1;
					--pitch-primary-note-sat: 90;
					--pitch-primary-note-sat-scale: 0.05;
					--pitch-primary-note-lum: 80;
					--pitch-primary-note-lum-scale: 0.025;
					--noise-secondary-channel-hue: 200;
					--noise-secondary-channel-hue-scale: 1.1;
					--noise-secondary-channel-sat: 25;
					--noise-secondary-channel-sat-scale: 0;
					--noise-secondary-channel-lum: 22;
					--noise-secondary-channel-lum-scale: 0;
					--noise-primary-channel-hue: 200;
					--noise-primary-channel-hue-scale: 1.1;
					--noise-primary-channel-sat: 48;
					--noise-primary-channel-sat-scale: 0;
					--noise-primary-channel-lum: 65;
					--noise-primary-channel-lum-scale: 0;
					--noise-secondary-note-hue: 200;
					--noise-secondary-note-hue-scale: 1.1;
					--noise-secondary-note-sat: 33.5;
					--noise-secondary-note-sat-scale: 0;
					--noise-secondary-note-lum: 33;
					--noise-secondary-note-lum-scale: 0;
					--noise-primary-note-hue: 200;
					--noise-primary-note-hue-scale: 1.1;
					--noise-primary-note-sat: 46.5;
					--noise-primary-note-sat-scale: 0;
					--noise-primary-note-lum: 64;
					--noise-primary-note-lum-scale: 0;
					--mod-secondary-channel-hue: 40;
					--mod-secondary-channel-hue-scale: 1.8;
					--mod-secondary-channel-sat: 44;
					--mod-secondary-channel-sat-scale: 0;
					--mod-secondary-channel-lum: 50;
					--mod-secondary-channel-lum-scale: 0;
					--mod-primary-channel-hue: 40;
					--mod-primary-channel-hue-scale: 1.8;
					--mod-primary-channel-sat: 60;
					--mod-primary-channel-sat-scale: 0;
					--mod-primary-channel-lum: 80;
					--mod-primary-channel-lum-scale: 0;
					--mod-secondary-note-hue: 40;
					--mod-secondary-note-hue-scale: 1.8;
					--mod-secondary-note-sat: 62;
					--mod-secondary-note-sat-scale: 0;
					--mod-secondary-note-lum: 55;
					--mod-secondary-note-lum-scale: 0;
					--mod-primary-note-hue: 40;
					--mod-primary-note-hue-scale: 1.8;
					--mod-primary-note-sat: 66;
					--mod-primary-note-sat-scale: 0;
					--mod-primary-note-lum: 85;
					--mod-primary-note-lum-scale: 0;
				}
			`,
		"canyon": `
				:root {
					--page-margin: #0a0000;
					--editor-background: #0a0000;
					--hover-preview: white;
					--playhead: rgba(247, 172, 196, 0.9);
					--primary-text: #f5d6bf;
					--secondary-text: #934050;
					--inverted-text: #290505;
					--text-selection: rgba(255, 208, 68, 0.99);
					--box-selection-fill: #94044870;
					--loop-accent: #ff1e1e;
					--link-accent: #da7b76;
					--ui-widget-background: #533137;
					--ui-widget-focus: #743e4b;
					--pitch-background: #4f3939;
					--tonic: #9e4145;
					--fifth-note: #5b3e6b;
					--white-piano-key: #d89898;
					--black-piano-key: #572b29;
					--use-color-formula: true;
					--track-editor-bg-pitch: #5e3a41;
					--track-editor-bg-pitch-dim: #281d1c;
					--track-editor-bg-noise: #3a3551;
					--track-editor-bg-noise-dim: #272732;
					--track-editor-bg-mod: #552045;
					--track-editor-bg-mod-dim: #3e1442;
					--multiplicative-mod-slider: #9f6095;
					--overwriting-mod-slider: #b55050;
					--indicator-primary: #f2f764;
					--indicator-secondary: #4f3939;
					--select2-opt-group: #673030;
					--input-box-outline: #443131;
					--mute-button-normal: #d81833;
					--mute-button-mod: #9e2691;
					--mod-label-primary: #5f2b39;
					--mod-label-secondary-text: rgb(158, 66, 122);
					--mod-label-primary-text: #e6caed;
					--pitch-secondary-channel-hue: 0;
					--pitch-secondary-channel-hue-scale: 11.8;
					--pitch-secondary-channel-sat: 73.3;
					--pitch-secondary-channel-sat-scale: 0.1;
					--pitch-secondary-channel-lum: 40;
					--pitch-secondary-channel-lum-scale: 0.05;
					--pitch-primary-channel-hue: 0;
					--pitch-primary-channel-hue-scale: 11.8;
					--pitch-primary-channel-sat: 90;
					--pitch-primary-channel-sat-scale: 0.1;
					--pitch-primary-channel-lum: 67.5;
					--pitch-primary-channel-lum-scale: 0.05;
					--pitch-secondary-note-hue: 0;
					--pitch-secondary-note-hue-scale: 11.8;
					--pitch-secondary-note-sat: 83.9;
					--pitch-secondary-note-sat-scale: 0.1;
					--pitch-secondary-note-lum: 35;
					--pitch-secondary-note-lum-scale: 0.05;
					--pitch-primary-note-hue: 0;
					--pitch-primary-note-hue-scale: 11.8;
					--pitch-primary-note-sat: 100;
					--pitch-primary-note-sat-scale: 0.05;
					--pitch-primary-note-lum: 85.6;
					--pitch-primary-note-lum-scale: 0.025;
					--noise-secondary-channel-hue: 60;
					--noise-secondary-channel-hue-scale: 2;
					--noise-secondary-channel-sat: 25;
					--noise-secondary-channel-sat-scale: 0;
					--noise-secondary-channel-lum: 42;
					--noise-secondary-channel-lum-scale: 0;
					--noise-primary-channel-hue: 60;
					--noise-primary-channel-hue-scale: 2;
					--noise-primary-channel-sat: 33;
					--noise-primary-channel-sat-scale: 0;
					--noise-primary-channel-lum: 63.5;
					--noise-primary-channel-lum-scale: 0;
					--noise-secondary-note-hue: 60;
					--noise-secondary-note-hue-scale: 2;
					--noise-secondary-note-sat: 33.5;
					--noise-secondary-note-sat-scale: 0;
					--noise-secondary-note-lum: 55;
					--noise-secondary-note-lum-scale: 0;
					--noise-primary-note-hue: 60;
					--noise-primary-note-hue-scale: 2;
					--noise-primary-note-sat: 46.5;
					--noise-primary-note-sat-scale: 0;
					--noise-primary-note-lum: 74;
					--noise-primary-note-lum-scale: 0;
					--mod-secondary-channel-hue: 222;
					--mod-secondary-channel-hue-scale: 1.5;
					--mod-secondary-channel-sat: 88;
					--mod-secondary-channel-sat-scale: 0;
					--mod-secondary-channel-lum: 50;
					--mod-secondary-channel-lum-scale: 0;
					--mod-primary-channel-hue: 222;
					--mod-primary-channel-hue-scale: 1.5;
					--mod-primary-channel-sat: 96;
					--mod-primary-channel-sat-scale: 0;
					--mod-primary-channel-lum: 80;
					--mod-primary-channel-lum-scale: 0;
					--mod-secondary-note-hue: 222;
					--mod-secondary-note-hue-scale: 1.5;
					--mod-secondary-note-sat: 92;
					--mod-secondary-note-sat-scale: 0;
					--mod-secondary-note-lum: 54;
					--mod-secondary-note-lum-scale: 0;
					--mod-primary-note-hue: 222;
					--mod-primary-note-hue-scale: 1.5;
					--mod-primary-note-sat: 96;
					--mod-primary-note-sat-scale: 0;
					--mod-primary-note-lum: 75;
					--mod-primary-note-lum-scale: 0;
				}
			`,
		"midnight" :  `
		:root {
			--page-margin: #000;
			--editor-background: #000;
			--hover-preview: #757575;
			--playhead: #fff;
			--primary-text: #fff;
			--secondary-text: #acacac;
			--inverted-text: #290505;
			--text-selection: rgba(155, 155, 155, 0.99);
			--box-selection-fill: #79797970;
			--loop-accent: #646464;
			--link-accent: #707070;
			--ui-widget-background: #353535;
			--ui-widget-focus: #464646;
			--pitch-background: #222121;
			--tonic: #1a1818;
			--fifth-note: #555955;
			--white-piano-key: #a89e9e;
			--black-piano-key: #2d2424;
			--use-color-formula: true;
			--track-editor-bg-pitch: #373737;
			--track-editor-bg-pitch-dim: #131313;
			--track-editor-bg-noise: #484848;
			--track-editor-bg-noise-dim: #131313;
			--track-editor-bg-mod: #373737;
			--track-editor-bg-mod-dim: #131313;
			--multiplicative-mod-slider: #555;
			--overwriting-mod-slider: #464545;
			--indicator-primary: #e0e0e0;
			--indicator-secondary: #404040;
			--select2-opt-group: #3c3b3b;
			--input-box-outline: #757575;
			--mute-button-normal: #8e8d8d;
			--mute-button-mod: #ddd;
			--mod-label-primary: #262526;
			--mod-label-secondary-text: rgb(227, 222, 225);
			--mod-label-primary-text: #b9b9b9;
			--pitch-secondary-channel-hue: 240;
			--pitch-secondary-channel-hue-scale: 228;
			--pitch-secondary-channel-sat: 73.3;
			--pitch-secondary-channel-sat-scale: 0.1;
			--pitch-secondary-channel-lum: 25;
			--pitch-secondary-channel-lum-scale: 0.05;
			--pitch-primary-channel-hue: 240;
			--pitch-primary-channel-hue-scale: 228;
			--pitch-primary-channel-sat: 80;
			--pitch-primary-channel-sat-scale: 0.1;
			--pitch-primary-channel-lum: 60.5;
			--pitch-primary-channel-lum-scale: 0.05;
			--pitch-secondary-note-hue: 240;
			--pitch-secondary-note-hue-scale: 228;
			--pitch-secondary-note-sat: 73.9;
			--pitch-secondary-note-sat-scale: 0.1;
			--pitch-secondary-note-lum: 32;
			--pitch-secondary-note-lum-scale: 0.05;
			--pitch-primary-note-hue: 240;
			--pitch-primary-note-hue-scale: 228;
			--pitch-primary-note-sat: 90;
			--pitch-primary-note-sat-scale: 0.05;
			--pitch-primary-note-lum: 80.6;
			--pitch-primary-note-lum-scale: 0.025;
			--noise-secondary-channel-hue: 160;
			--noise-secondary-channel-hue-scale: 2;
			--noise-secondary-channel-sat: 25;
			--noise-secondary-channel-sat-scale: 0;
			--noise-secondary-channel-lum: 42;
			--noise-secondary-channel-lum-scale: 0;
			--noise-primary-channel-hue: 160;
			--noise-primary-channel-hue-scale: 2;
			--noise-primary-channel-sat: 33;
			--noise-primary-channel-sat-scale: 0;
			--noise-primary-channel-lum: 63.5;
			--noise-primary-channel-lum-scale: 0;
			--noise-secondary-note-hue: 160;
			--noise-secondary-note-hue-scale: 2;
			--noise-secondary-note-sat: 33.5;
			--noise-secondary-note-sat-scale: 0;
			--noise-secondary-note-lum: 55;
			--noise-secondary-note-lum-scale: 0;
			--noise-primary-note-hue: 160;
			--noise-primary-note-hue-scale: 2;
			--noise-primary-note-sat: 46.5;
			--noise-primary-note-sat-scale: 0;
			--noise-primary-note-lum: 74;
			--noise-primary-note-lum-scale: 0;
			--mod-secondary-channel-hue: 62;
			--mod-secondary-channel-hue-scale: 1.5;
			--mod-secondary-channel-sat: 88;
			--mod-secondary-channel-sat-scale: 0;
			--mod-secondary-channel-lum: 30;
			--mod-secondary-channel-lum-scale: 0;
			--mod-primary-channel-hue: 62;
			--mod-primary-channel-hue-scale: 1.5;
			--mod-primary-channel-sat: 96;
			--mod-primary-channel-sat-scale: 0;
			--mod-primary-channel-lum: 80;
			--mod-primary-channel-lum-scale: 0;
			--mod-secondary-note-hue: 62;
			--mod-secondary-note-hue-scale: 1.5;
			--mod-secondary-note-sat: 92;
			--mod-secondary-note-sat-scale: 0;
			--mod-secondary-note-lum: 34;
			--mod-secondary-note-lum-scale: 0;
			--mod-primary-note-hue: 62;
			--mod-primary-note-hue-scale: 1.5;
			--mod-primary-note-sat: 96;
			--mod-primary-note-sat-scale: 0;
			--mod-primary-note-lum: 75;
			--mod-primary-note-lum-scale: 0;
		}
	`,
		"jummbox light": `
				:root {
					-webkit-text-stroke-width: 0.5px;
					--page-margin: #fefdff;
					--editor-background: #fefdff;
					--hover-preview: #302880;
					--playhead: rgba(62, 32, 120, 0.9);
					--primary-text: #401890;
					--secondary-text: #8769af;
					--inverted-text: #fefdff;
					--text-selection: rgba(255,160,235,0.99);
					--box-selection-fill: rgba(30,62,220,0.5);
					--loop-accent: #4c35d4;
					--link-accent: #7af;
					--ui-widget-background: #bf9cec;
					--ui-widget-focus: #e9c4ff;
					--pitch-background: #e2d9f9;
					--tonic: #c288cc;
					--fifth-note: #d8c9fd;
					--white-piano-key: #e2e2ff;
					--black-piano-key: #66667a;
					--use-color-formula: true;
					--track-editor-bg-pitch: #d9e5ec;
					--track-editor-bg-pitch-dim: #eaeef5;
					--track-editor-bg-noise: #ffc3ae;
					--track-editor-bg-noise-dim: #ffe0cf;
					--track-editor-bg-mod: #c9accc;
					--track-editor-bg-mod-dim: #ebe3ef;
					--multiplicative-mod-slider: #807caf;
					--overwriting-mod-slider: #909cdf;
					--indicator-primary: #ae38ff;
					--indicator-secondary: #bbd4ec;
					--select2-opt-group: #c1b7f1;
					--input-box-outline: #bbb;
					--mute-button-normal: #e9b752;
					--mute-button-mod: #9558ee;
					--mod-label-primary: #ececff;
					--mod-label-secondary-text: rgb(197, 145, 247);
					--mod-label-primary-text: #302880;
					--pitch-secondary-channel-hue: 0;
					--pitch-secondary-channel-hue-scale: 8.1;
					--pitch-secondary-channel-sat: 53.3;
					--pitch-secondary-channel-sat-scale: -0.1;
					--pitch-secondary-channel-lum: 72;
					--pitch-secondary-channel-lum-scale: -0.05;
					--pitch-primary-channel-hue: 0;
					--pitch-primary-channel-hue-scale: 8.1;
					--pitch-primary-channel-sat: 97;
					--pitch-primary-channel-sat-scale: -0.1;
					--pitch-primary-channel-lum: 45.5;
					--pitch-primary-channel-lum-scale: -0.05;
					--pitch-secondary-note-hue: 0;
					--pitch-secondary-note-hue-scale: 8.1;
					--pitch-secondary-note-sat: 93.9;
					--pitch-secondary-note-sat-scale: -0.1;
					--pitch-secondary-note-lum: 95;
					--pitch-secondary-note-lum-scale: -0.05;
					--pitch-primary-note-hue: 0;
					--pitch-primary-note-hue-scale: 8.1;
					--pitch-primary-note-sat: 100;
					--pitch-primary-note-sat-scale: 0.05;
					--pitch-primary-note-lum: 43.6;
					--pitch-primary-note-lum-scale: -0.025;
					--noise-secondary-channel-hue: 220;
					--noise-secondary-channel-hue-scale: 2;
					--noise-secondary-channel-sat: 25;
					--noise-secondary-channel-sat-scale: 0;
					--noise-secondary-channel-lum: 62;
					--noise-secondary-channel-lum-scale: -0.1;
					--noise-primary-channel-hue: 220;
					--noise-primary-channel-hue-scale: 2;
					--noise-primary-channel-sat: 53;
					--noise-primary-channel-sat-scale: 0;
					--noise-primary-channel-lum: 53.5;
					--noise-primary-channel-lum-scale: -0.1;
					--noise-secondary-note-hue: 220;
					--noise-secondary-note-hue-scale: 2;
					--noise-secondary-note-sat: 58.5;
					--noise-secondary-note-sat-scale: 0;
					--noise-secondary-note-lum: 85;
					--noise-secondary-note-lum-scale: -1;
					--noise-primary-note-hue: 220;
					--noise-primary-note-hue-scale: 2;
					--noise-primary-note-sat: 56.5;
					--noise-primary-note-sat-scale: 0;
					--noise-primary-note-lum: 54;
					--noise-primary-note-lum-scale: -1;
					--mod-secondary-channel-hue: 90;
					--mod-secondary-channel-hue-scale: 1.5;
					--mod-secondary-channel-sat: 88;
					--mod-secondary-channel-sat-scale: 0;
					--mod-secondary-channel-lum: 60;
					--mod-secondary-channel-lum-scale: 0;
					--mod-primary-channel-hue: 90;
					--mod-primary-channel-hue-scale: 1.5;
					--mod-primary-channel-sat: 100;
					--mod-primary-channel-sat-scale: 0;
					--mod-primary-channel-lum: 65;
					--mod-primary-channel-lum-scale: 0;
					--mod-secondary-note-hue: 90;
					--mod-secondary-note-hue-scale: 1.5;
					--mod-secondary-note-sat: 92;
					--mod-secondary-note-sat-scale: 0;
					--mod-secondary-note-lum: 95;
					--mod-secondary-note-lum-scale: 0;
					--mod-primary-note-hue: 90;
					--mod-primary-note-hue-scale: 1.5;
					--mod-primary-note-sat: 96;
					--mod-primary-note-sat-scale: 0;
					--mod-primary-note-lum: 55;
					--mod-primary-note-lum-scale: 0;
				}

				.beepboxEditor button, .beepboxEditor select {
					box-shadow: inset 0 0 0 1px var(--secondary-text);
				}

				.select2-selection__rendered {
					box-shadow: inset 0 0 0 1px var(--secondary-text);
				}
			`,
	};

	public static readonly pageMargin: string = "var(--page-margin)";
	public static readonly editorBackground: string = "var(--editor-background)";
	public static readonly hoverPreview: string = "var(--hover-preview)";
	public static readonly playhead: string = "var(--playhead)";
	public static readonly primaryText: string = "var(--primary-text)";
	public static readonly secondaryText: string = "var(--secondary-text)";
	public static readonly invertedText: string = "var(--inverted-text)";
	public static readonly textSelection: string = "var(--text-selection)";
	public static readonly boxSelectionFill: string = "var(--box-selection-fill)";
	public static readonly loopAccent: string = "var(--loop-accent)";
	public static readonly linkAccent: string = "var(--link-accent)";
	public static readonly uiWidgetBackground: string = "var(--ui-widget-background)";
	public static readonly uiWidgetFocus: string = "var(--ui-widget-focus)";
	public static readonly pitchBackground: string = "var(--pitch-background)";
	public static readonly tonic: string = "var(--tonic)";
	public static readonly fifthNote: string = "var(--fifth-note)";
	public static readonly whitePianoKey: string = "var(--white-piano-key)";
	public static readonly blackPianoKey: string = "var(--black-piano-key)";
	public static readonly useColorFormula: string = "var(--use-color-formula)";
	public static readonly pitchSecondaryChannelHue: string = "var(--pitch-secondary-channel-hue)";
	public static readonly pitchSecondaryChannelHueScale: string = "var(--pitch-secondary-channel-hue-scale)";
	public static readonly pitchSecondaryChannelSat: string = "var(--pitch-secondary-channel-sat)";
	public static readonly pitchSecondaryChannelSatScale: string = "var(--pitch-secondary-channel-sat-scale)";
	public static readonly pitchSecondaryChannelLum: string = "var(--pitch-secondary-channel-lum)";
	public static readonly pitchSecondaryChannelLumScale: string = "var(--pitch-secondary-channel-lum-scale)";
	public static readonly pitchPrimaryChannelHue: string = "var(--pitch-primary-channel-hue)";
	public static readonly pitchPrimaryChannelHueScale: string = "var(--pitch-primary-channel-hue-scale)";
	public static readonly pitchPrimaryChannelSat: string = "var(--pitch-primary-channel-sat)";
	public static readonly pitchPrimaryChannelSatScale: string = "var(--pitch-primary-channel-sat-scale)";
	public static readonly pitchPrimaryChannelLum: string = "var(--pitch-primary-channel-lum)";
	public static readonly pitchPrimaryChannelLumScale: string = "var(--pitch-primary-channel-lum-scale)";
	public static readonly pitchSecondaryNoteHue: string = "var(--pitch-secondary-note-hue)";
	public static readonly pitchSecondaryNoteHueScale: string = "var(--pitch-secondary-note-hue-scale)";
	public static readonly pitchSecondaryNoteSat: string = "var(--pitch-secondary-note-sat)";
	public static readonly pitchSecondaryNoteSatScale: string = "var(--pitch-secondary-note-sat-scale)";
	public static readonly pitchSecondaryNoteLum: string = "var(--pitch-secondary-note-lum)";
	public static readonly pitchSecondaryNoteLumScale: string = "var(--pitch-secondary-note-lum-scale)";
	public static readonly pitchPrimaryNoteHue: string = "var(--pitch-primary-note-hue)";
	public static readonly pitchPrimaryNoteHueScale: string = "var(--pitch-primary-note-hue-scale)";
	public static readonly pitchPrimaryNoteSat: string = "var(--pitch-primary-note-sat)";
	public static readonly pitchPrimaryNoteSatScale: string = "var(--pitch-primary-note-sat-scale)";
	public static readonly pitchPrimaryNoteLum: string = "var(--pitch-primary-note-lum)";
	public static readonly pitchPrimaryNoteLumScale: string = "var(--pitch-primary-note-lum-scale)";
	public static readonly modSecondaryChannelHue: string = "var(--mod-secondary-channel-hue)";
	public static readonly modSecondaryChannelHueScale: string = "var(--mod-secondary-channel-hue-scale)";
	public static readonly modSecondaryChannelSat: string = "var(--mod-secondary-channel-sat)";
	public static readonly modSecondaryChannelSatScale: string = "var(--mod-secondary-channel-sat-scale)";
	public static readonly modSecondaryChannelLum: string = "var(--mod-secondary-channel-lum)";
	public static readonly modSecondaryChannelLumScale: string = "var(--mod-secondary-channel-lum-scale)";
	public static readonly modPrimaryChannelHue: string = "var(--mod-primary-channel-hue)";
	public static readonly modPrimaryChannelHueScale: string = "var(--mod-primary-channel-hue-scale)";
	public static readonly modPrimaryChannelSat: string = "var(--mod-primary-channel-sat)";
	public static readonly modPrimaryChannelSatScale: string = "var(--mod-primary-channel-sat-scale)";
	public static readonly modPrimaryChannelLum: string = "var(--mod-primary-channel-lum)";
	public static readonly modPrimaryChannelLumScale: string = "var(--mod-primary-channel-lum-scale)";
	public static readonly modSecondaryNoteHue: string = "var(--mod-secondary-note-hue)";
	public static readonly modSecondaryNoteHueScale: string = "var(--mod-secondary-note-hue-scale)";
	public static readonly modSecondaryNoteSat: string = "var(--mod-secondary-note-sat)";
	public static readonly modSecondaryNoteSatScale: string = "var(--mod-secondary-note-sat-scale)";
	public static readonly modSecondaryNoteLum: string = "var(--mod-secondary-note-lum)";
	public static readonly modSecondaryNoteLumScale: string = "var(--mod-secondary-note-lum-scale)";
	public static readonly modPrimaryNoteHue: string = "var(--mod-primary-note-hue)";
	public static readonly modPrimaryNoteHueScale: string = "var(--mod-primary-note-hue-scale)";
	public static readonly modPrimaryNoteSat: string = "var(--mod-primary-note-sat)";
	public static readonly modPrimaryNoteSatScale: string = "var(--mod-primary-note-sat-scale)";
	public static readonly modPrimaryNoteLum: string = "var(--mod-primary-note-lum)";
	public static readonly modPrimaryNoteLumScale: string = "var(--mod-primary-note-lum-scale)";
	public static readonly noiseSecondaryChannelHue: string = "var(--noise-secondary-channel-hue)";
	public static readonly noiseSecondaryChannelHueScale: string = "var(--noise-secondary-channel-hue-scale)";
	public static readonly noiseSecondaryChannelSat: string = "var(--noise-secondary-channel-sat)";
	public static readonly noiseSecondaryChannelSatScale: string = "var(--noise-secondary-channel-sat-scale)";
	public static readonly noiseSecondaryChannelLum: string = "var(--noise-secondary-channel-lum)";
	public static readonly noiseSecondaryChannelLumScale: string = "var(--noise-secondary-channel-lum-scale)";
	public static readonly noisePrimaryChannelHue: string = "var(--noise-primary-channel-hue)";
	public static readonly noisePrimaryChannelHueScale: string = "var(--noise-primary-channel-hue-scale)";
	public static readonly noisePrimaryChannelSat: string = "var(--noise-primary-channel-sat)";
	public static readonly noisePrimaryChannelSatScale: string = "var(--noise-primary-channel-sat-scale)";
	public static readonly noisePrimaryChannelLum: string = "var(--noise-primary-channel-lum)";
	public static readonly noisePrimaryChannelLumScale: string = "var(--noise-primary-channel-lum-scale)";
	public static readonly noiseSecondaryNoteHue: string = "var(--noise-secondary-note-hue)";
	public static readonly noiseSecondaryNoteHueScale: string = "var(--noise-secondary-note-hue-scale)";
	public static readonly noiseSecondaryNoteSat: string = "var(--noise-secondary-note-sat)";
	public static readonly noiseSecondaryNoteSatScale: string = "var(--noise-secondary-note-sat-scale)";
	public static readonly noiseSecondaryNoteLum: string = "var(--noise-secondary-note-lum)";
	public static readonly noiseSecondaryNoteLumScale: string = "var(--noise-secondary-note-lum-scale)";
	public static readonly noisePrimaryNoteHue: string = "var(--noise-primary-note-hue)";
	public static readonly noisePrimaryNoteHueScale: string = "var(--noise-primary-note-hue-scale)";
	public static readonly noisePrimaryNoteSat: string = "var(--noise-primary-note-sat)";
	public static readonly noisePrimaryNoteSatScale: string = "var(--noise-primary-note-sat-scale)";
	public static readonly noisePrimaryNoteLum: string = "var(--noise-primary-note-lum)";
	public static readonly noisePrimaryNoteLumScale: string = "var(--noise-primary-note-lum-scale)";
	public static readonly trackEditorBgPitch: string = "var(--track-editor-bg-pitch)";
	public static readonly trackEditorBgPitchDim: string = "var(--track-editor-bg-pitch-dim)";
	public static readonly trackEditorBgNoise: string = "var(--track-editor-bg-noise)";
	public static readonly trackEditorBgNoiseDim: string = "var(--track-editor-bg-noise-dim)";
	public static readonly trackEditorBgMod: string = "var(--track-editor-bg-mod)";
	public static readonly trackEditorBgModDim: string = "var(--track-editor-bg-mod-dim)";
	public static readonly multiplicativeModSlider: string = "var(--multiplicative-mod-slider)";
	public static readonly overwritingModSlider: string = "var(--overwriting-mod-slider)";
	public static readonly indicatorPrimary: string = "var(--indicator-primary)";
	public static readonly indicatorSecondary: string = "var(--indicator-secondary)";
	public static readonly select2OptGroup: string = "var(--select2-opt-group)";
	public static readonly inputBoxOutline: string = "var(--input-box-outline)";
	public static readonly muteButtonNormal: string = "var(--mute-button-normal)";
	public static readonly muteButtonMod: string = "var(--mute-button-mod)";
	public static readonly modLabelPrimary: string = "var(--mod-label-primary)";
	public static readonly modLabelSecondaryText: string = "var(--mod-label-secondary-text)";
	public static readonly modLabelPrimaryText: string = "var(--mod-label-primary-text)";

	public static readonly pitchChannels: DictionaryArray<ChannelColors> = toNameMap([
		{
			name: "pitch1", // cyan
			secondaryChannel: "var(--pitch1-secondary-channel)",
			primaryChannel: "var(--pitch1-primary-channel)",
			secondaryNote: "var(--pitch1-secondary-note)",
			primaryNote: "var(--pitch1-primary-note)",
		}, {
			name: "pitch2", // yellow
			secondaryChannel: "var(--pitch2-secondary-channel)",
			primaryChannel: "var(--pitch2-primary-channel)",
			secondaryNote: "var(--pitch2-secondary-note)",
			primaryNote: "var(--pitch2-primary-note)",
		}, {
			name: "pitch3", // orange
			secondaryChannel: "var(--pitch3-secondary-channel)",
			primaryChannel: "var(--pitch3-primary-channel)",
			secondaryNote: "var(--pitch3-secondary-note)",
			primaryNote: "var(--pitch3-primary-note)",
		}, {
			name: "pitch4", // green
			secondaryChannel: "var(--pitch4-secondary-channel)",
			primaryChannel: "var(--pitch4-primary-channel)",
			secondaryNote: "var(--pitch4-secondary-note)",
			primaryNote: "var(--pitch4-primary-note)",
		}, {
			name: "pitch5", // purple
			secondaryChannel: "var(--pitch5-secondary-channel)",
			primaryChannel: "var(--pitch5-primary-channel)",
			secondaryNote: "var(--pitch5-secondary-note)",
			primaryNote: "var(--pitch5-primary-note)",
		}, {
			name: "pitch6", // blue
			secondaryChannel: "var(--pitch6-secondary-channel)",
			primaryChannel: "var(--pitch6-primary-channel)",
			secondaryNote: "var(--pitch6-secondary-note)",
			primaryNote: "var(--pitch6-primary-note)",
		}, {
			name: "pitch7", // blue
			secondaryChannel: "var(--pitch7-secondary-channel)",
			primaryChannel: "var(--pitch7-primary-channel)",
			secondaryNote: "var(--pitch7-secondary-note)",
			primaryNote: "var(--pitch7-primary-note)",
		}, {
			name: "pitch8", // blue
			secondaryChannel: "var(--pitch8-secondary-channel)",
			primaryChannel: "var(--pitch8-primary-channel)",
			secondaryNote: "var(--pitch8-secondary-note)",
			primaryNote: "var(--pitch8-primary-note)",
		}, {
			name: "pitch9", // blue
			secondaryChannel: "var(--pitch9-secondary-channel)",
			primaryChannel: "var(--pitch9-primary-channel)",
			secondaryNote: "var(--pitch9-secondary-note)",
			primaryNote: "var(--pitch9-primary-note)",
		}, {
			name: "pitch10", // blue
			secondaryChannel: "var(--pitch10-secondary-channel)",
			primaryChannel: "var(--pitch10-primary-channel)",
			secondaryNote: "var(--pitch10-secondary-note)",
			primaryNote: "var(--pitch10-primary-note)",
		},
	]);
	public static readonly noiseChannels: DictionaryArray<ChannelColors> = toNameMap([
		{
			name: "noise1", // gray
			secondaryChannel: "var(--noise1-secondary-channel)",
			primaryChannel: "var(--noise1-primary-channel)",
			secondaryNote: "var(--noise1-secondary-note)",
			primaryNote: "var(--noise1-primary-note)",
		}, {
			name: "noise2", // brown
			secondaryChannel: "var(--noise2-secondary-channel)",
			primaryChannel: "var(--noise2-primary-channel)",
			secondaryNote: "var(--noise2-secondary-note)",
			primaryNote: "var(--noise2-primary-note)",
		}, {
			name: "noise3", // azure
			secondaryChannel: "var(--noise3-secondary-channel)",
			primaryChannel: "var(--noise3-primary-channel)",
			secondaryNote: "var(--noise3-secondary-note)",
			primaryNote: "var(--noise3-primary-note)",
		}, {
			name: "noise4",
			secondaryChannel: "var(--noise4-secondary-channel)",
			primaryChannel: "var(--noise4-primary-channel)",
			secondaryNote: "var(--noise4-secondary-note)",
			primaryNote: "var(--noise4-primary-note)",
		},
	]);
	public static readonly modChannels: DictionaryArray<ChannelColors> = toNameMap([
		{
			name: "mod1",
			secondaryChannel: "var(--mod1-secondary-channel)",
			primaryChannel: "var(--mod1-primary-channel)",
			secondaryNote: "var(--mod1-secondary-note)",
			primaryNote: "var(--mod1-primary-note)",
		}, {
			name: "mod2",
			secondaryChannel: "var(--mod2-secondary-channel)",
			primaryChannel: "var(--mod2-primary-channel)",
			secondaryNote: "var(--mod2-secondary-note)",
			primaryNote: "var(--mod2-primary-note)",
		}, {
			name: "mod3",
			secondaryChannel: "var(--mod3-secondary-channel)",
			primaryChannel: "var(--mod3-primary-channel)",
			secondaryNote: "var(--mod3-secondary-note)",
			primaryNote: "var(--mod3-primary-note)",
		}, {
			name: "mod4",
			secondaryChannel: "var(--mod4-secondary-channel)",
			primaryChannel: "var(--mod4-primary-channel)",
			secondaryNote: "var(--mod4-secondary-note)",
			primaryNote: "var(--mod4-primary-note)",
		},
	]);

	public static resetColors() {
		this.colorLookup.clear();
	}

	// Same as below, but won't return var colors
	public static getComputedChannelColor(song: Song, channel: number): ChannelColors {
		if (getComputedStyle(this._styleElement).getPropertyValue("--use-color-formula").trim() == "false") {
			let base: ChannelColors = ColorConfig.getChannelColor(song, channel);
			// Trim away "var(...)"
			var regex = /\(([^)]+)\)/;
			let newChannelSecondary: string = ColorConfig.getComputed((regex.exec(base.secondaryChannel) as RegExpExecArray)[1] as string);
			let newChannelPrimary: string = ColorConfig.getComputed((regex.exec(base.primaryChannel) as RegExpExecArray)[1] as string);
			let newNoteSecondary: string = ColorConfig.getComputed((regex.exec(base.secondaryNote) as RegExpExecArray)[1] as string);
			let newNotePrimary: string = ColorConfig.getComputed((regex.exec(base.primaryNote) as RegExpExecArray)[1] as string);
			return <ChannelColors>{ secondaryChannel: newChannelSecondary, primaryChannel: newChannelPrimary, secondaryNote: newNoteSecondary, primaryNote: newNotePrimary };
		}
		else {
			return ColorConfig.getChannelColor(song, channel);
		}
	};

	public static getChannelColor(song: Song, channel: number): ChannelColors {
		if (getComputedStyle(this._styleElement).getPropertyValue("--use-color-formula").trim() == "false") {
			// Set colors, not defined by formula
			if (channel < song.pitchChannelCount) {
				return ColorConfig.pitchChannels[channel % ColorConfig.pitchChannels.length];
			} else if (channel < song.pitchChannelCount + song.noiseChannelCount) {
				return ColorConfig.noiseChannels[(channel - song.pitchChannelCount) % ColorConfig.noiseChannels.length];
			} else {
				return ColorConfig.modChannels[(channel - song.pitchChannelCount - song.noiseChannelCount) % ColorConfig.modChannels.length];
			}
		}
		else {
			// Determine if color is cached
			if (ColorConfig.colorLookup.has(channel)) {
				return ColorConfig.colorLookup.get(channel) as ChannelColors;
			}
			else {
				// Formulaic color definition
				if (channel < song.pitchChannelCount) {
					// Pitch formula
					const pitchSecondaryChannelHue: number = +getComputedStyle(this._styleElement).getPropertyValue("--pitch-secondary-channel-hue");
					const pitchSecondaryChannelHueScale: number = +getComputedStyle(this._styleElement).getPropertyValue("--pitch-secondary-channel-hue-scale");
					const pitchSecondaryChannelSat: number = +getComputedStyle(this._styleElement).getPropertyValue("--pitch-secondary-channel-sat");
					const pitchSecondaryChannelSatScale: number = +getComputedStyle(this._styleElement).getPropertyValue("--pitch-secondary-channel-sat-scale");
					const pitchSecondaryChannelLum: number = +getComputedStyle(this._styleElement).getPropertyValue("--pitch-secondary-channel-lum");
					const pitchSecondaryChannelLumScale: number = +getComputedStyle(this._styleElement).getPropertyValue("--pitch-secondary-channel-lum-scale");
					const pitchPrimaryChannelHue: number = +getComputedStyle(this._styleElement).getPropertyValue("--pitch-primary-channel-hue");
					const pitchPrimaryChannelHueScale: number = +getComputedStyle(this._styleElement).getPropertyValue("--pitch-primary-channel-hue-scale");
					const pitchPrimaryChannelSat: number = +getComputedStyle(this._styleElement).getPropertyValue("--pitch-primary-channel-sat");
					const pitchPrimaryChannelSatScale: number = +getComputedStyle(this._styleElement).getPropertyValue("--pitch-primary-channel-sat-scale");
					const pitchPrimaryChannelLum: number = +getComputedStyle(this._styleElement).getPropertyValue("--pitch-primary-channel-lum");
					const pitchPrimaryChannelLumScale: number = +getComputedStyle(this._styleElement).getPropertyValue("--pitch-primary-channel-lum-scale");
					const pitchSecondaryNoteHue: number = +getComputedStyle(this._styleElement).getPropertyValue("--pitch-secondary-note-hue");
					const pitchSecondaryNoteHueScale: number = +getComputedStyle(this._styleElement).getPropertyValue("--pitch-secondary-note-hue-scale");
					const pitchSecondaryNoteSat: number = +getComputedStyle(this._styleElement).getPropertyValue("--pitch-secondary-note-sat");
					const pitchSecondaryNoteSatScale: number = +getComputedStyle(this._styleElement).getPropertyValue("--pitch-secondary-note-sat-scale");
					const pitchSecondaryNoteLum: number = +getComputedStyle(this._styleElement).getPropertyValue("--pitch-secondary-note-lum");
					const pitchSecondaryNoteLumScale: number = +getComputedStyle(this._styleElement).getPropertyValue("--pitch-secondary-note-lum-scale");
					const pitchPrimaryNoteHue: number = +getComputedStyle(this._styleElement).getPropertyValue("--pitch-primary-note-hue");
					const pitchPrimaryNoteHueScale: number = +getComputedStyle(this._styleElement).getPropertyValue("--pitch-primary-note-hue-scale");
					const pitchPrimaryNoteSat: number = +getComputedStyle(this._styleElement).getPropertyValue("--pitch-primary-note-sat");
					const pitchPrimaryNoteSatScale: number = +getComputedStyle(this._styleElement).getPropertyValue("--pitch-primary-note-sat-scale");
					const pitchPrimaryNoteLum: number = +getComputedStyle(this._styleElement).getPropertyValue("--pitch-primary-note-lum");
					const pitchPrimaryNoteLumScale: number = +getComputedStyle(this._styleElement).getPropertyValue("--pitch-primary-note-lum-scale");

					let newChannelSecondary: string = "hsl(" + ((+pitchSecondaryChannelHue + (channel * +pitchSecondaryChannelHueScale / Config.pitchChannelCountMax) * 256) % 256) + ","
						+ (+pitchSecondaryChannelSat * (1 - (+pitchSecondaryChannelSatScale * Math.floor(channel / 7)))) + "%,"
						+ (+pitchSecondaryChannelLum * (1 - (+pitchSecondaryChannelLumScale * Math.floor(channel / 7)))) + "%)";
					let newChannelPrimary: string = "hsl(" + ((+pitchPrimaryChannelHue + (channel * +pitchPrimaryChannelHueScale / Config.pitchChannelCountMax) * 256) % 256) + ","
						+ (+pitchPrimaryChannelSat * (1 - (+pitchPrimaryChannelSatScale * Math.floor(channel / 7)))) + "%,"
						+ (+pitchPrimaryChannelLum * (1 - (+pitchPrimaryChannelLumScale * Math.floor(channel / 7)))) + "%)";
					let newNoteSecondary: string = "hsl(" + ((+pitchSecondaryNoteHue + (channel * +pitchSecondaryNoteHueScale / Config.pitchChannelCountMax) * 256) % 256) + ","
						+ (+pitchSecondaryNoteSat * (1 - (+pitchSecondaryNoteSatScale * Math.floor(channel / 7)))) + "%,"
						+ (+pitchSecondaryNoteLum * (1 - (+pitchSecondaryNoteLumScale * Math.floor(channel / 7)))) + "%)";
					let newNotePrimary: string = "hsl(" + ((+pitchPrimaryNoteHue + (channel * +pitchPrimaryNoteHueScale / Config.pitchChannelCountMax) * 256) % 256) + ","
						+ (+pitchPrimaryNoteSat * (1 - (+pitchPrimaryNoteSatScale * Math.floor(channel / 7)))) + "%,"
						+ (+pitchPrimaryNoteLum * (1 - (+pitchPrimaryNoteLumScale * Math.floor(channel / 7)))) + "%)";

					let newChannelColors = <ChannelColors>{ secondaryChannel: newChannelSecondary, primaryChannel: newChannelPrimary, secondaryNote: newNoteSecondary, primaryNote: newNotePrimary };
					ColorConfig.colorLookup.set(channel, newChannelColors);
					return newChannelColors;

				}
				else if (channel < song.pitchChannelCount + song.noiseChannelCount) {
					// Noise formula
					const noiseSecondaryChannelHue: number = +getComputedStyle(this._styleElement).getPropertyValue("--noise-secondary-channel-hue");
					const noiseSecondaryChannelHueScale: number = +getComputedStyle(this._styleElement).getPropertyValue("--noise-secondary-channel-hue-scale");
					const noiseSecondaryChannelSat: number = +getComputedStyle(this._styleElement).getPropertyValue("--noise-secondary-channel-sat");
					const noiseSecondaryChannelSatScale: number = +getComputedStyle(this._styleElement).getPropertyValue("--noise-secondary-channel-sat-scale");
					const noiseSecondaryChannelLum: number = +getComputedStyle(this._styleElement).getPropertyValue("--noise-secondary-channel-lum");
					const noiseSecondaryChannelLumScale: number = +getComputedStyle(this._styleElement).getPropertyValue("--noise-secondary-channel-lum-scale");
					const noisePrimaryChannelHue: number = +getComputedStyle(this._styleElement).getPropertyValue("--noise-primary-channel-hue");
					const noisePrimaryChannelHueScale: number = +getComputedStyle(this._styleElement).getPropertyValue("--noise-primary-channel-hue-scale");
					const noisePrimaryChannelSat: number = +getComputedStyle(this._styleElement).getPropertyValue("--noise-primary-channel-sat");
					const noisePrimaryChannelSatScale: number = +getComputedStyle(this._styleElement).getPropertyValue("--noise-primary-channel-sat-scale");
					const noisePrimaryChannelLum: number = +getComputedStyle(this._styleElement).getPropertyValue("--noise-primary-channel-lum");
					const noisePrimaryChannelLumScale: number = +getComputedStyle(this._styleElement).getPropertyValue("--noise-primary-channel-lum-scale");
					const noiseSecondaryNoteHue: number = +getComputedStyle(this._styleElement).getPropertyValue("--noise-secondary-note-hue");
					const noiseSecondaryNoteHueScale: number = +getComputedStyle(this._styleElement).getPropertyValue("--noise-secondary-note-hue-scale");
					const noiseSecondaryNoteSat: number = +getComputedStyle(this._styleElement).getPropertyValue("--noise-secondary-note-sat");
					const noiseSecondaryNoteSatScale: number = +getComputedStyle(this._styleElement).getPropertyValue("--noise-secondary-note-sat-scale");
					const noiseSecondaryNoteLum: number = +getComputedStyle(this._styleElement).getPropertyValue("--noise-secondary-note-lum");
					const noiseSecondaryNoteLumScale: number = +getComputedStyle(this._styleElement).getPropertyValue("--noise-secondary-note-lum-scale");
					const noisePrimaryNoteHue: number = +getComputedStyle(this._styleElement).getPropertyValue("--noise-primary-note-hue");
					const noisePrimaryNoteHueScale: number = +getComputedStyle(this._styleElement).getPropertyValue("--noise-primary-note-hue-scale");
					const noisePrimaryNoteSat: number = +getComputedStyle(this._styleElement).getPropertyValue("--noise-primary-note-sat");
					const noisePrimaryNoteSatScale: number = +getComputedStyle(this._styleElement).getPropertyValue("--noise-primary-note-sat-scale");
					const noisePrimaryNoteLum: number = +getComputedStyle(this._styleElement).getPropertyValue("--noise-primary-note-lum");
					const noisePrimaryNoteLumScale: number = +getComputedStyle(this._styleElement).getPropertyValue("--noise-primary-note-lum-scale");

					let newChannelSecondary: string = "hsl(" + ((+noiseSecondaryChannelHue + (((channel - song.pitchChannelCount) * +noiseSecondaryChannelHueScale) / Config.noiseChannelCountMax) * 256) % 256) + ","
						+ (+noiseSecondaryChannelSat + channel * +noiseSecondaryChannelSatScale) + "%,"
						+ (+noiseSecondaryChannelLum + channel * +noiseSecondaryChannelLumScale) + "%)";
					let newChannelPrimary: string = "hsl(" + ((+noisePrimaryChannelHue + (((channel - song.pitchChannelCount) * +noisePrimaryChannelHueScale) / Config.noiseChannelCountMax) * 256) % 256) + ","
						+ (+noisePrimaryChannelSat + channel * +noisePrimaryChannelSatScale) + "%,"
						+ (+noisePrimaryChannelLum + channel * +noisePrimaryChannelLumScale) + "%)";
					let newNoteSecondary: string = "hsl(" + ((+noiseSecondaryNoteHue + (((channel - song.pitchChannelCount) * +noiseSecondaryNoteHueScale) / Config.noiseChannelCountMax) * 256) % 256) + ","
						+ (+noiseSecondaryNoteSat + channel * +noiseSecondaryNoteSatScale) + "%,"
						+ (+noiseSecondaryNoteLum + channel * +noiseSecondaryNoteLumScale) + "%)";
					let newNotePrimary: string = "hsl(" + ((+noisePrimaryNoteHue + (((channel - song.pitchChannelCount) * +noisePrimaryNoteHueScale) / Config.noiseChannelCountMax) * 256) % 256) + ","
						+ (+noisePrimaryNoteSat + channel * +noisePrimaryNoteSatScale) + "%,"
						+ (+noisePrimaryNoteLum + channel * +noisePrimaryNoteLumScale) + "%)";

					let newChannelColors = <ChannelColors>{ secondaryChannel: newChannelSecondary, primaryChannel: newChannelPrimary, secondaryNote: newNoteSecondary, primaryNote: newNotePrimary };
					ColorConfig.colorLookup.set(channel, newChannelColors);
					return newChannelColors;
				}
				else {
					// Mod formula
					const modSecondaryChannelHue: number = +getComputedStyle(this._styleElement).getPropertyValue("--mod-secondary-channel-hue");
					const modSecondaryChannelHueScale: number = +getComputedStyle(this._styleElement).getPropertyValue("--mod-secondary-channel-hue-scale");
					const modSecondaryChannelSat: number = +getComputedStyle(this._styleElement).getPropertyValue("--mod-secondary-channel-sat");
					const modSecondaryChannelSatScale: number = +getComputedStyle(this._styleElement).getPropertyValue("--mod-secondary-channel-sat-scale");
					const modSecondaryChannelLum: number = +getComputedStyle(this._styleElement).getPropertyValue("--mod-secondary-channel-lum");
					const modSecondaryChannelLumScale: number = +getComputedStyle(this._styleElement).getPropertyValue("--mod-secondary-channel-lum-scale");
					const modPrimaryChannelHue: number = +getComputedStyle(this._styleElement).getPropertyValue("--mod-primary-channel-hue");
					const modPrimaryChannelHueScale: number = +getComputedStyle(this._styleElement).getPropertyValue("--mod-primary-channel-hue-scale");
					const modPrimaryChannelSat: number = +getComputedStyle(this._styleElement).getPropertyValue("--mod-primary-channel-sat");
					const modPrimaryChannelSatScale: number = +getComputedStyle(this._styleElement).getPropertyValue("--mod-primary-channel-sat-scale");
					const modPrimaryChannelLum: number = +getComputedStyle(this._styleElement).getPropertyValue("--mod-primary-channel-lum");
					const modPrimaryChannelLumScale: number = +getComputedStyle(this._styleElement).getPropertyValue("--mod-primary-channel-lum-scale");
					const modSecondaryNoteHue: number = +getComputedStyle(this._styleElement).getPropertyValue("--mod-secondary-note-hue");
					const modSecondaryNoteHueScale: number = +getComputedStyle(this._styleElement).getPropertyValue("--mod-secondary-note-hue-scale");
					const modSecondaryNoteSat: number = +getComputedStyle(this._styleElement).getPropertyValue("--mod-secondary-note-sat");
					const modSecondaryNoteSatScale: number = +getComputedStyle(this._styleElement).getPropertyValue("--mod-secondary-note-sat-scale");
					const modSecondaryNoteLum: number = +getComputedStyle(this._styleElement).getPropertyValue("--mod-secondary-note-lum");
					const modSecondaryNoteLumScale: number = +getComputedStyle(this._styleElement).getPropertyValue("--mod-secondary-note-lum-scale");
					const modPrimaryNoteHue: number = +getComputedStyle(this._styleElement).getPropertyValue("--mod-primary-note-hue");
					const modPrimaryNoteHueScale: number = +getComputedStyle(this._styleElement).getPropertyValue("--mod-primary-note-hue-scale");
					const modPrimaryNoteSat: number = +getComputedStyle(this._styleElement).getPropertyValue("--mod-primary-note-sat");
					const modPrimaryNoteSatScale: number = +getComputedStyle(this._styleElement).getPropertyValue("--mod-primary-note-sat-scale");
					const modPrimaryNoteLum: number = +getComputedStyle(this._styleElement).getPropertyValue("--mod-primary-note-lum");
					const modPrimaryNoteLumScale: number = +getComputedStyle(this._styleElement).getPropertyValue("--mod-primary-note-lum-scale");

					let newChannelSecondary: string = "hsl(" + ((+modSecondaryChannelHue + (((channel - song.pitchChannelCount - song.noiseChannelCount) * +modSecondaryChannelHueScale) / Config.modChannelCountMax) * 256) % 256) + ","
						+ (+modSecondaryChannelSat + channel * +modSecondaryChannelSatScale) + "%,"
						+ (+modSecondaryChannelLum + channel * +modSecondaryChannelLumScale) + "%)";
					let newChannelPrimary: string = "hsl(" + ((+modPrimaryChannelHue + (((channel - song.pitchChannelCount - song.noiseChannelCount) * +modPrimaryChannelHueScale) / Config.modChannelCountMax) * 256) % 256) + ","
						+ (+modPrimaryChannelSat + channel * +modPrimaryChannelSatScale) + "%,"
						+ (+modPrimaryChannelLum + channel * +modPrimaryChannelLumScale) + "%)";
					let newNoteSecondary: string = "hsl(" + ((+modSecondaryNoteHue + (((channel - song.pitchChannelCount - song.noiseChannelCount) * +modSecondaryNoteHueScale) / Config.modChannelCountMax) * 256) % 256) + ","
						+ (+modSecondaryNoteSat + channel * +modSecondaryNoteSatScale) + "%,"
						+ (+modSecondaryNoteLum + channel * +modSecondaryNoteLumScale) + "%)";
					let newNotePrimary: string = "hsl(" + ((+modPrimaryNoteHue + (((channel - song.pitchChannelCount - song.noiseChannelCount) * +modPrimaryNoteHueScale) / Config.modChannelCountMax) * 256) % 256) + ","
						+ (+modPrimaryNoteSat + channel * +modPrimaryNoteSatScale) + "%,"
						+ (+modPrimaryNoteLum + channel * +modPrimaryNoteLumScale) + "%)";

					let newChannelColors = <ChannelColors>{ secondaryChannel: newChannelSecondary, primaryChannel: newChannelPrimary, secondaryNote: newNoteSecondary, primaryNote: newNotePrimary };
					ColorConfig.colorLookup.set(channel, newChannelColors);
					return newChannelColors;
				}
			}
		}
	}

	private static readonly _styleElement: HTMLStyleElement = document.head.appendChild(HTML.style({ type: "text/css" }));

	public static setTheme(name: string): void {
		this._styleElement.textContent = this.themes[name];
		const themeColor = <HTMLMetaElement>document.querySelector("meta[name='theme-color']");
		if (themeColor != null) {
			themeColor.setAttribute("content", getComputedStyle(document.documentElement).getPropertyValue('--ui-widget-background'));
		}

		this.resetColors();
	}

	public static getComputed(name: string): string {
		return getComputedStyle(this._styleElement).getPropertyValue(name);
	}
}
//}
