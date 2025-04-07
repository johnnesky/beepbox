// Copyright (c) John Nesky and contributing authors, distributed under the MIT license, see accompanying the LICENSE.md file.

import {BeepBoxOption, DictionaryArray, toNameMap} from "../synth/SynthConfig.js";
import {Song} from "../synth/synth.js";
import {HTML} from "imperative-html/dist/esm/elements-strict.js";

export interface ChannelColors extends BeepBoxOption {
	readonly secondaryChannel: string;
	readonly primaryChannel:   string;
	readonly secondaryNote: string;
	readonly primaryNote: string;
}

export class ColorConfig {
	public static readonly themes: {[name: string]: string} = {
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
				--pitch1-secondary-channel: #0099A1;
				--pitch1-primary-channel:   #25F3FF;
				--pitch1-secondary-note:    #00BDC7;
				--pitch1-primary-note:      #92F9FF;
				--pitch2-secondary-channel: #A1A100;
				--pitch2-primary-channel:   #FFFF25;
				--pitch2-secondary-note:    #C7C700;
				--pitch2-primary-note:      #FFFF92;
				--pitch3-secondary-channel: #C75000;
				--pitch3-primary-channel:   #FF9752;
				--pitch3-secondary-note:    #FF771C;
				--pitch3-primary-note:      #FFCDAB;
				--pitch4-secondary-channel: #00A100;
				--pitch4-primary-channel:   #50FF50;
				--pitch4-secondary-note:    #00C700;
				--pitch4-primary-note:      #A0FFA0;
				--pitch5-secondary-channel: #D020D0;
				--pitch5-primary-channel:   #FF90FF;
				--pitch5-secondary-note:    #E040E0;
				--pitch5-primary-note:      #FFC0FF;
				--pitch6-secondary-channel: #7777B0;
				--pitch6-primary-channel:   #A0A0FF;
				--pitch6-secondary-note:    #8888D0;
				--pitch6-primary-note:      #D0D0FF;
				--pitch7-secondary-channel: #8AA100;
				--pitch7-primary-channel:   #DEFF25;
				--pitch7-secondary-note:    #AAC700;
				--pitch7-primary-note:      #E6FF92;
				--pitch8-secondary-channel: #DF0019;
				--pitch8-primary-channel:   #FF98A4;
				--pitch8-secondary-note:    #FF4E63;
				--pitch8-primary-note:      #FFB2BB;
				--pitch9-secondary-channel: #00A170;
				--pitch9-primary-channel:   #50FFC9;
				--pitch9-secondary-note:    #00C78A;
				--pitch9-primary-note:      #83FFD9;
				--pitch10-secondary-channel:#A11FFF;
				--pitch10-primary-channel:  #CE8BFF;
				--pitch10-secondary-note:   #B757FF;
				--pitch10-primary-note:     #DFACFF;
				--noise1-secondary-channel: #6F6F6F;
				--noise1-primary-channel:   #AAAAAA;
				--noise1-secondary-note:    #A7A7A7;
				--noise1-primary-note:      #E0E0E0;
				--noise2-secondary-channel: #996633;
				--noise2-primary-channel:   #DDAA77;
				--noise2-secondary-note:    #CC9966;
				--noise2-primary-note:      #F0D0BB;
				--noise3-secondary-channel: #4A6D8F;
				--noise3-primary-channel:   #77AADD;
				--noise3-secondary-note:    #6F9FCF;
				--noise3-primary-note:      #BBD7FF;
				--noise4-secondary-channel: #7A4F9A;
				--noise4-primary-channel:   #AF82D2;
				--noise4-secondary-note:    #9E71C1;
				--noise4-primary-note:      #D4C1EA;
				--noise5-secondary-channel: #607837;
				--noise5-primary-channel:   #A2BB77;
				--noise5-secondary-note:    #91AA66;
				--noise5-primary-note:      #C5E2B2;
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
					--input-box-outline: #333;
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
					--noise5-secondary-channel: #607837;
					--noise5-primary-channel:   #A2BB77;
					--noise5-secondary-note:    #91AA66;
					--noise5-primary-note:      #C5E2B2;

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
				--pitch7-secondary-channel: #C2D848;
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
				--noise4-secondary-note:    #B290CC;
				--noise4-primary-note:      #684F7D;
				--noise5-secondary-channel: #B8CE93;
				--noise5-primary-channel:   #87A74F;
				--noise5-secondary-note:    #ABC183;
				--noise5-primary-note:      #68784C;
			}
			
			.beepboxEditor button, .beepboxEditor select {
				box-shadow: inset 0 0 0 1px var(--secondary-text);
			}
		`,
		"marine": `
			:root {
				--page-margin: #09070f;
				--editor-background: #09070f;
				--hover-preview: #bec2f0;
				--playhead: #fff;
				--primary-text: #bec2f0;
				--secondary-text: #5a5f9d;
				--inverted-text: #09070f;
				--text-selection: rgba(156, 118, 255, 0.99);
				--box-selection-fill: rgba(187, 186, 232, 0.2);
				--loop-accent: #74f;
				--link-accent: #98f;
				--ui-widget-background: #2d3057;
				--ui-widget-focus: #383c73;
				--pitch-background: #383b4f;
				--tonic: #5a44a6;
				--fifth-note: #88447d;
				--white-piano-key: #96a1bb;
				--black-piano-key: #303144;
				--pitch1-secondary-channel: #117734;
				--pitch1-primary-channel: #5de88d;
				--pitch1-secondary-note: #117734;
				--pitch1-primary-note: #5de88d;
				--pitch2-secondary-channel: #106b75;
				--pitch2-primary-channel: #4dc7d5;
				--pitch2-secondary-note: #106b75;
				--pitch2-primary-note: #4dc7d5;
				--pitch3-secondary-channel: #0f1f75;
				--pitch3-primary-channel: #566dec;
				--pitch3-secondary-note: #0f1f75;
				--pitch3-primary-note: #566dec;
				--pitch4-secondary-channel: #230948;
				--pitch4-primary-channel: #a07dd2;
				--pitch4-secondary-note: #230948;
				--pitch4-primary-note: #a07dd2;
				--pitch5-secondary-channel: #3e073d;
				--pitch5-primary-channel: #d944d6;
				--pitch5-secondary-note: #3e073d;
				--pitch5-primary-note: #d944d6;
				--pitch6-secondary-channel: #4f031c;
				--pitch6-primary-channel: #d73c6f;
				--pitch6-secondary-note: #4f031c;
				--pitch6-primary-note: #d73c6f;
				--pitch7-secondary-channel: #4d1313;
				--pitch7-primary-channel: #d27373;
				--pitch7-secondary-note: #4d1313;
				--pitch7-primary-note: #d27373;
				--pitch8-secondary-channel: #623a07;
				--pitch8-primary-channel: #e8af67;
				--pitch8-secondary-note: #623a07;
				--pitch8-primary-note: #e8af67;
				--pitch9-secondary-channel: #4d4805;
				--pitch9-primary-channel: #eadd33;
				--pitch9-secondary-note: #4d4805;
				--pitch9-primary-note: #eadd33;
				--pitch10-secondary-channel: #134f06;
				--pitch10-primary-channel: #7fee66;
				--pitch10-secondary-note: #134f06;
				--pitch10-primary-note: #7fee66;
				--noise1-secondary-channel: #3d4c5e;
				--noise1-primary-channel: #7089a6;
				--noise1-secondary-note: #3d4c5e;
				--noise1-primary-note: #7089a6;
				--noise2-secondary-channel: #2b5127;
				--noise2-primary-channel: #4c8a44;
				--noise2-secondary-note: #2b5127;
				--noise2-primary-note: #4c8a44;
				--noise3-secondary-channel: #2e4b4f;
				--noise3-primary-channel: #71a5ac;
				--noise3-secondary-note: #2e4b4f;
				--noise3-primary-note: #71a5ac;
				--noise4-secondary-channel: #1c1b40;
				--noise4-primary-channel: #6765ae;
				--noise4-secondary-note: #1c1b40;
				--noise4-primary-note: #6765ae;
				--noise5-secondary-channel: #3e1237;
				--noise5-primary-channel: #bf6cb2;
				--noise5-secondary-note: #3e1237;
				--noise5-primary-note: #bf6cb2;
			}
		`,
		"flame": `
			:root {
				--page-margin: #1a0306;
				--editor-background: #1a0306;
				--hover-preview: #dfa4a4;
				--playhead: white;
				--primary-text: #f4b1b1;
				--secondary-text: #a25050;
				--inverted-text: black;
				--text-selection: rgba(255, 68, 164, 0.99);
				--box-selection-fill: rgba(255, 0, 143, 0.2);
				--loop-accent: #ff44ad;
				--link-accent: #ff3d85;
				--ui-widget-background: #640b1b;
				--ui-widget-focus: #8a1b2f;
				--pitch-background: #441515;
				--tonic: #842929;
				--fifth-note: #771c4f;
				--white-piano-key: #ffbebe;
				--black-piano-key: #6a3535;
				--pitch1-secondary-channel: #391702;
				--pitch1-primary-channel: #c4794c;
				--pitch1-secondary-note: #391702;
				--pitch1-primary-note: #c4794c;
				--pitch2-secondary-channel: #1f5307;
				--pitch2-primary-channel: #81b768;
				--pitch2-secondary-note: #1f5307;
				--pitch2-primary-note: #81b768;
				--pitch3-secondary-channel: #01261a;
				--pitch3-primary-channel: #26bb8b;
				--pitch3-secondary-note: #01261a;
				--pitch3-primary-note: #26bb8b;
				--pitch4-secondary-channel: #051239;
				--pitch4-primary-channel: #7085c4;
				--pitch4-secondary-note: #051239;
				--pitch4-primary-note: #7085c4;
				--pitch5-secondary-channel: #290442;
				--pitch5-primary-channel: #894eb0;
				--pitch5-secondary-note: #290442;
				--pitch5-primary-note: #894eb0;
				--pitch6-secondary-channel: #350534;
				--pitch6-primary-channel: #a811a5;
				--pitch6-secondary-note: #350534;
				--pitch6-primary-note: #a811a5;
				--pitch7-secondary-channel: #46031c;
				--pitch7-primary-channel: #e84481;
				--pitch7-secondary-note: #46031c;
				--pitch7-primary-note: #e84481;
				--pitch8-secondary-channel: #400;
				--pitch8-primary-channel: #c45656;
				--pitch8-secondary-note: #400;
				--pitch8-primary-note: #c45656;
				--pitch9-secondary-channel: #2d1f1f;
				--pitch9-primary-channel: #a47777;
				--pitch9-secondary-note: #2d1f1f;
				--pitch9-primary-note: #a47777;
				--pitch10-secondary-channel: #604017;
				--pitch10-primary-channel: #e19533;
				--pitch10-secondary-note: #604017;
				--pitch10-primary-note: #e19533;
				--noise1-secondary-channel: #535353;
				--noise1-primary-channel: #959595;
				--noise1-secondary-note: #535353;
				--noise1-primary-note: #959595;
				--noise2-secondary-channel: #223303;
				--noise2-primary-channel: #62930a;
				--noise2-secondary-note: #223303;
				--noise2-primary-note: #62930a;
				--noise3-secondary-channel: #01482d;
				--noise3-primary-channel: #00b36f;
				--noise3-secondary-note: #01482d;
				--noise3-primary-note: #00b36f;
				--noise4-secondary-channel: #001439;
				--noise4-primary-channel: #0052ea;
				--noise4-secondary-note: #001439;
				--noise4-primary-note: #0052ea;
				--noise5-secondary-channel: #420625;
				--noise5-primary-channel: #bf1a6f;
				--noise5-secondary-note: #420625;
				--noise5-primary-note: #bf1a6f;
			}
		`,
		"amber": `
			:root {
				--page-margin: #240e04;
				--editor-background: #240e04;
				--hover-preview: #dfbc90;
				--playhead: white;
				--primary-text: #dfbc90;
				--secondary-text: #b78a52;
				--inverted-text: #240e04;
				--text-selection: rgba(255, 138, 68, 0.99);
				--box-selection-fill: rgba(255,255,255,0.2);
				--loop-accent: #ff7944;
				--link-accent: #ffc588;
				--ui-widget-background: #4f2113;
				--ui-widget-focus: #804634;
				--pitch-background: #482b22;
				--tonic: #8e4534;
				--fifth-note: #a26835;
				--white-piano-key: #eac2b3;
				--black-piano-key: #4f3329;
				--pitch1-secondary-channel: #0d1b2d;
				--pitch1-primary-channel: #3d6293;
				--pitch1-secondary-note: #20334d;
				--pitch1-primary-note: #3d6293;
				--pitch2-secondary-channel: #002821;
				--pitch2-primary-channel: #2a9d89;
				--pitch2-secondary-note: #107160;
				--pitch2-primary-note: #2a9d89;
				--pitch3-secondary-channel: #1f3906;
				--pitch3-primary-channel: #7fc140;
				--pitch3-secondary-note: #4a8413;
				--pitch3-primary-note: #7fc140;
				--pitch4-secondary-channel: #391a02;
				--pitch4-primary-channel: #e38d4a;
				--pitch4-secondary-note: #664730;
				--pitch4-primary-note: #e38d4a;
				--pitch5-secondary-channel: #2f0014;
				--pitch5-primary-channel: #b01c5b;
				--pitch5-secondary-note: #6f0e37;
				--pitch5-primary-note: #b01c5b;
				--pitch6-secondary-channel: #20002f;
				--pitch6-primary-channel: #9635c4;
				--pitch6-secondary-note: #6f1699;
				--pitch6-primary-note: #9635c4;
				--pitch7-secondary-channel: #100537;
				--pitch7-primary-channel: #6243d0;
				--pitch7-secondary-note: #3d2593;
				--pitch7-primary-note: #6243d0;
				--pitch8-secondary-channel: #03132d;
				--pitch8-primary-channel: #305ca4;
				--pitch8-secondary-note: #0c3c8a;
				--pitch8-primary-note: #305ca4;
				--pitch9-secondary-channel: #001317;
				--pitch9-primary-channel: #30b3ce;
				--pitch9-secondary-note: #036d84;
				--pitch9-primary-note: #30b3ce;
				--pitch10-secondary-channel: #2b1400;
				--pitch10-primary-channel: #bb5700;
				--pitch10-secondary-note: #7b3900;
				--pitch10-primary-note: #bb5700;
				--noise1-secondary-channel: #1e1e1e;
				--noise1-primary-channel: #848484;
				--noise1-secondary-note: #4a4a4a;
				--noise1-primary-note: #848484;
				--noise2-secondary-channel: #072800;
				--noise2-primary-channel: #1eaa00;
				--noise2-secondary-note: #147500;
				--noise2-primary-note: #1eaa00;
				--noise3-secondary-channel: #260000;
				--noise3-primary-channel: #ca0000;
				--noise3-secondary-note: #860000;
				--noise3-primary-note: #ca0000;
				--noise4-secondary-channel: #01002f;
				--noise4-primary-channel: #4a48c6;
				--noise4-secondary-note: #3c39b5;
				--noise4-primary-note: #4a48c6;
				--noise5-secondary-channel: #002616;
				--noise5-primary-channel: #00c471;
				--noise5-secondary-note: #00804a;
				--noise5-primary-note: #00c471;
			}
		`,
		"emerald": `
			:root {
				--page-margin: #040b04;
				--editor-background: #040b04;
				--hover-preview: white;
				--playhead: white;
				--primary-text: #ddf7cc;
				--secondary-text: #579f4c;
				--inverted-text: black;
				--text-selection: rgba(119,68,255,0.99);
				--box-selection-fill: rgba(178, 255, 201, 0.2);
				--loop-accent: #44ffc2;
				--link-accent: #dfff88;
				--ui-widget-background: #064616;
				--ui-widget-focus: #0c7526;
				--pitch-background: #1a3118;
				--tonic: #00600a;
				--fifth-note: #568844;
				--white-piano-key: #c9fdb6;
				--black-piano-key: #32593a;
				--pitch1-secondary-channel: #A14B00;
				--pitch1-primary-channel: #FFB425;
				--pitch1-secondary-note: #C79500;
				--pitch1-primary-note: #FFDF92;
				--pitch2-secondary-channel: #A10000;
				--pitch2-primary-channel: #FF2525;
				--pitch2-secondary-note: #C70000;
				--pitch2-primary-note: #FF9292;
				--pitch3-secondary-channel: #C7004B;
				--pitch3-primary-channel: #FF526A;
				--pitch3-secondary-note: #FF1C5C;
				--pitch3-primary-note: #FFABDA;
				--pitch4-secondary-channel: #7E00A1;
				--pitch4-primary-channel: #D950FF;
				--pitch4-secondary-note: #C700BB;
				--pitch4-primary-note: #FFA0F0;
				--pitch5-secondary-channel: #6820D0;
				--pitch5-primary-channel: #BD90FF;
				--pitch5-secondary-note: #9040E0;
				--pitch5-primary-note: #E0C0FF;
				--pitch6-secondary-channel: #778BB0;
				--pitch6-primary-channel: #A0BCFF;
				--pitch6-secondary-note: #889AD0;
				--pitch6-primary-note: #D0DEFF;
				--pitch7-secondary-channel: #0092A1;
				--pitch7-primary-channel: #25B7FF;
				--pitch7-secondary-note: #008FC7;
				--pitch7-primary-note: #92E0FF;
				--pitch8-secondary-channel: #00DF2D;
				--pitch8-primary-channel: #98FFA8;
				--pitch8-secondary-note: #4EFF6A;
				--pitch8-primary-note: #B2FFD0;
				--pitch9-secondary-channel: #23A100;
				--pitch9-primary-channel: #6EFF50;
				--pitch9-secondary-note: #06C700;
				--pitch9-primary-note: #AAFF83;
				--pitch10-secondary-channel: #D9FF1F;
				--pitch10-primary-channel: #F1FF8B;
				--pitch10-secondary-note: #C6B103;
				--pitch10-primary-note: #FFF2AC;
				--noise1-secondary-channel: #6F6F6F;
				--noise1-primary-channel: #AAAAAA;
				--noise1-secondary-note: #A7A7A7;
				--noise1-primary-note: #E0E0E0;
				--noise2-secondary-channel: #338699;
				--noise2-primary-channel: #77CFDD;
				--noise2-secondary-note: #669CCC;
				--noise2-primary-note: #BBE9F0;
				--noise3-secondary-channel: #568F4A;
				--noise3-primary-channel: #84DD77;
				--noise3-secondary-note: #84CF6F;
				--noise3-primary-note: #C7FFBB;
				--noise4-secondary-channel: #7A4F9A;
				--noise4-primary-channel: #AF82D2;
				--noise4-secondary-note: #9E71C1;
				--noise4-primary-note: #D4C1EA;
				--noise5-secondary-channel: #78373a;
				--noise5-primary-channel: #BB777D;
				--noise5-secondary-note: #AA666C;
				--noise5-primary-note: #E2B2B4;
			}
		`,
		"amethyst": `
			:root {
				--page-margin: #150613;
				--editor-background: #150613;
				--hover-preview: white;
				--playhead: white;
				--primary-text: #b8aaea;
				--secondary-text: #412c8a;
				--inverted-text: black;
				--text-selection: rgba(119,68,255,0.99);
				--box-selection-fill: rgba(255,255,255,0.2);
				--loop-accent: #b145b5;
				--link-accent: #f88;
				--ui-widget-background: #331942;
				--ui-widget-focus: #502668;
				--pitch-background: #2a1f31;
				--tonic: #3f1b53;
				--fifth-note: #533762;
				--white-piano-key: #eec0ff;
				--black-piano-key: #4b2e53;
				--pitch1-secondary-channel: #0099A1;
				--pitch1-primary-channel: #25F3FF;
				--pitch1-secondary-note: #00BDC7;
				--pitch1-primary-note: #92F9FF;
				--pitch2-secondary-channel: #A1A100;
				--pitch2-primary-channel: #FFFF25;
				--pitch2-secondary-note: #C7C700;
				--pitch2-primary-note: #FFFF92;
				--pitch3-secondary-channel: #C75000;
				--pitch3-primary-channel: #FF9752;
				--pitch3-secondary-note: #FF771C;
				--pitch3-primary-note: #FFCDAB;
				--pitch4-secondary-channel: #00A100;
				--pitch4-primary-channel: #50FF50;
				--pitch4-secondary-note: #00C700;
				--pitch4-primary-note: #A0FFA0;
				--pitch5-secondary-channel: #D020D0;
				--pitch5-primary-channel: #FF90FF;
				--pitch5-secondary-note: #E040E0;
				--pitch5-primary-note: #FFC0FF;
				--pitch6-secondary-channel: #7777B0;
				--pitch6-primary-channel: #A0A0FF;
				--pitch6-secondary-note: #8888D0;
				--pitch6-primary-note: #D0D0FF;
				--pitch7-secondary-channel: #8AA100;
				--pitch7-primary-channel: #DEFF25;
				--pitch7-secondary-note: #AAC700;
				--pitch7-primary-note: #E6FF92;
				--pitch8-secondary-channel: #DF0019;
				--pitch8-primary-channel: #FF98A4;
				--pitch8-secondary-note: #FF4E63;
				--pitch8-primary-note: #FFB2BB;
				--pitch9-secondary-channel: #00A170;
				--pitch9-primary-channel: #50FFC9;
				--pitch9-secondary-note: #00C78A;
				--pitch9-primary-note: #83FFD9;
				--pitch10-secondary-channel: #A11FFF;
				--pitch10-primary-channel: #CE8BFF;
				--pitch10-secondary-note: #B757FF;
				--pitch10-primary-note: #DFACFF;
				--noise1-secondary-channel: #6F6F6F;
				--noise1-primary-channel: #AAAAAA;
				--noise1-secondary-note: #A7A7A7;
				--noise1-primary-note: #E0E0E0;
				--noise2-secondary-channel: #996633;
				--noise2-primary-channel: #DDAA77;
				--noise2-secondary-note: #CC9966;
				--noise2-primary-note: #F0D0BB;
				--noise3-secondary-channel: #4A6D8F;
				--noise3-primary-channel: #77AADD;
				--noise3-secondary-note: #6F9FCF;
				--noise3-primary-note: #BBD7FF;
				--noise4-secondary-channel: #7A4F9A;
				--noise4-primary-channel: #AF82D2;
				--noise4-secondary-note: #9E71C1;
				--noise4-primary-note: #D4C1EA;
				--noise5-secondary-channel: #607837;
				--noise5-primary-channel: #A2BB77;
				--noise5-secondary-note: #91AA66;
				--noise5-primary-note: #C5E2B2;
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
	
	public static readonly pitchChannels: DictionaryArray<ChannelColors> = toNameMap([
		{
			name: "pitch1", // cyan
			secondaryChannel: "var(--pitch1-secondary-channel)",
			primaryChannel:   "var(--pitch1-primary-channel)",
			secondaryNote:    "var(--pitch1-secondary-note)",
			primaryNote:      "var(--pitch1-primary-note)",
		}, {
			name: "pitch2", // yellow
			secondaryChannel: "var(--pitch2-secondary-channel)",
			primaryChannel:   "var(--pitch2-primary-channel)",
			secondaryNote:    "var(--pitch2-secondary-note)",
			primaryNote:      "var(--pitch2-primary-note)",
		}, {
			name: "pitch3", // orange
			secondaryChannel: "var(--pitch3-secondary-channel)",
			primaryChannel:   "var(--pitch3-primary-channel)",
			secondaryNote:    "var(--pitch3-secondary-note)",
			primaryNote:      "var(--pitch3-primary-note)",
		}, {
			name: "pitch4", // green
			secondaryChannel: "var(--pitch4-secondary-channel)",
			primaryChannel:   "var(--pitch4-primary-channel)",
			secondaryNote:    "var(--pitch4-secondary-note)",
			primaryNote:      "var(--pitch4-primary-note)",
		}, {
			name: "pitch5", // magenta
			secondaryChannel: "var(--pitch5-secondary-channel)",
			primaryChannel:   "var(--pitch5-primary-channel)",
			secondaryNote:    "var(--pitch5-secondary-note)",
			primaryNote:      "var(--pitch5-primary-note)",
		}, {
			name: "pitch6", // blue
			secondaryChannel: "var(--pitch6-secondary-channel)",
			primaryChannel:   "var(--pitch6-primary-channel)",
			secondaryNote:    "var(--pitch6-secondary-note)",
			primaryNote:      "var(--pitch6-primary-note)",
		}, {
			name: "pitch7", // olive
			secondaryChannel: "var(--pitch7-secondary-channel)",
			primaryChannel:   "var(--pitch7-primary-channel)",
			secondaryNote:    "var(--pitch7-secondary-note)",
			primaryNote:      "var(--pitch7-primary-note)",
		}, {
			name: "pitch8", // red
			secondaryChannel: "var(--pitch8-secondary-channel)",
			primaryChannel:   "var(--pitch8-primary-channel)",
			secondaryNote:    "var(--pitch8-secondary-note)",
			primaryNote:      "var(--pitch8-primary-note)",
		}, {
			name: "pitch9", // teal
			secondaryChannel: "var(--pitch9-secondary-channel)",
			primaryChannel:   "var(--pitch9-primary-channel)",
			secondaryNote:    "var(--pitch9-secondary-note)",
			primaryNote:      "var(--pitch9-primary-note)",
		}, {
			name: "pitch10", // purple
			secondaryChannel: "var(--pitch10-secondary-channel)",
			primaryChannel:   "var(--pitch10-primary-channel)",
			secondaryNote:    "var(--pitch10-secondary-note)",
			primaryNote:      "var(--pitch10-primary-note)",
		},
	]);
	public static readonly noiseChannels: DictionaryArray<ChannelColors> = toNameMap([
		{
			name: "noise1", // gray
			secondaryChannel: "var(--noise1-secondary-channel)",
			primaryChannel:   "var(--noise1-primary-channel)",
			secondaryNote:    "var(--noise1-secondary-note)",
			primaryNote:      "var(--noise1-primary-note)",
		}, {
			name: "noise2", // brown
			secondaryChannel: "var(--noise2-secondary-channel)",
			primaryChannel:   "var(--noise2-primary-channel)",
			secondaryNote:    "var(--noise2-secondary-note)",
			primaryNote:      "var(--noise2-primary-note)",
		}, {
			name: "noise3", // azure
			secondaryChannel: "var(--noise3-secondary-channel)",
			primaryChannel:   "var(--noise3-primary-channel)",
			secondaryNote:    "var(--noise3-secondary-note)",
			primaryNote:      "var(--noise3-primary-note)",
		}, {
			name: "noise4", // purple
			secondaryChannel: "var(--noise4-secondary-channel)",
			primaryChannel:   "var(--noise4-primary-channel)",
			secondaryNote:    "var(--noise4-secondary-note)",
			primaryNote:      "var(--noise4-primary-note)",
		}, {
			name: "noise5", // sage
			secondaryChannel: "var(--noise5-secondary-channel)",
			primaryChannel:   "var(--noise5-primary-channel)",
			secondaryNote:    "var(--noise5-secondary-note)",
			primaryNote:      "var(--noise5-primary-note)",
		},
	]);
	
	public static getChannelColor(song: Song, channel: number): ChannelColors {
		return channel < song.pitchChannelCount
			? ColorConfig.pitchChannels[channel % ColorConfig.pitchChannels.length]
			: ColorConfig.noiseChannels[(channel - song.pitchChannelCount) % ColorConfig.noiseChannels.length];
	}
	
	private static readonly _styleElement: HTMLStyleElement = document.head.appendChild(HTML.style({type: "text/css"}));
	
	public static setTheme(name: string): void {
		let theme: string = this.themes[name];
		if (theme == undefined) theme = this.themes["dark classic"];
		this._styleElement.textContent = theme;
		
		const themeColor = <HTMLMetaElement> document.querySelector("meta[name='theme-color']");
		if (themeColor != null) {
			themeColor.setAttribute("content", getComputedStyle(document.documentElement).getPropertyValue('--ui-widget-background'));
		}
	}
}
