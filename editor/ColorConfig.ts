// Copyright (C) 2020 John Nesky, distributed under the MIT license.

/// <reference path="../editor/html.ts" />

namespace beepbox {
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
				}
			`,
			"light classic": `
				:root {
					-webkit-text-stroke-width: 0.5px;
					--page-margin: #685d88;
					--editor-background: #d6d3df;
					--hover-preview: black;
					--playhead: rgba(0,0,0,0.5);
					--primary-text: black;
					--secondary-text: #777;
					--inverted-text: white;
					--text-selection: rgba(200,170,255,0.99);
					--box-selection-fill: rgba(0,0,0,0.1);
					--loop-accent: #98f;
					--link-accent: #74f;
					--ui-widget-background: #fff;
					--ui-widget-focus: #eee;
					--pitch-background: #f7f7f7;
					--tonic: #ffe7cf;
					--fifth-note: #def;
					--pitch1-secondary-channel: #37D9E2;
					--pitch1-primary-channel:   #00A0AB;
					--pitch1-secondary-note:    #43CFD6;
					--pitch1-primary-note:      #017A80;
					--pitch2-secondary-channel: #D6CB26;
					--pitch2-primary-channel:   #A29500;
					--pitch2-secondary-note:    #D0C841;
					--pitch2-primary-note:      #7C7500;
					--pitch3-secondary-channel: #FF9B4F;
					--pitch3-primary-channel:   #E15A00;
					--pitch3-secondary-note:    #FF9A56;
					--pitch3-primary-note:      #A44D12;
					--pitch4-secondary-channel: #37DF37;
					--pitch4-primary-channel:   #00A800;
					--pitch4-secondary-note:    #41D641;
					--pitch4-primary-note:      #008000;
					--pitch5-secondary-channel: #FF83FF;
					--pitch5-primary-channel:   #E12EDF;
					--pitch5-secondary-note:    #F189F1;
					--pitch5-primary-note:      #973D97;
					--pitch6-secondary-channel: #B1B1FC;
					--pitch6-primary-channel:   #6A6AD4;
					--pitch6-secondary-note:    #B0B0EC;
					--pitch6-primary-note:      #5F5F94;
					--noise1-secondary-channel: #BABABA;
					--noise1-primary-channel:   #898989;
					--noise1-secondary-note:    #BDBDBD;
					--noise1-primary-note:      #6C6C6C;
					--noise2-secondary-channel: #E5B37F;
					--noise2-primary-channel:   #BD7D3A;
					--noise2-secondary-note:    #D9B48D;
					--noise2-primary-note:      #836342;
					--noise3-secondary-channel: #90BDE9;
					--noise3-primary-channel:   #4481BE;
					--noise3-secondary-note:    #94B7DC;
					--noise3-primary-note:      #476685;
				}
			`,
		};
		
		public static readonly pageMargin: string = "var(--page-margin, black)";
		public static readonly editorBackground: string = "var(--editor-background, black)";
		public static readonly hoverPreview: string = "var(--hover-preview, white)";
		public static readonly playhead: string = "var(--playhead, white)";
		public static readonly primaryText: string = "var(--primary-text, white)";
		public static readonly secondaryText: string = "var(--secondary-text, #999)";
		public static readonly invertedText: string = "var(--inverted-text, black)";
		public static readonly textSelection: string = "var(--text-selection, rgba(119,68,255,0.99))"; // #7744ff ugh browsers override the alpha.
		public static readonly boxSelectionFill: string = "var(--box-selection-fill, rgba(255,255,255,0.2))";
		public static readonly loopAccent: string = "var(--loop-accent, #74f)";
		public static readonly linkAccent: string = "var(--link-accent, #98f)";
		public static readonly uiWidgetBackground: string = "var(--ui-widget-background, #444)";
		public static readonly uiWidgetFocus: string = "var(--ui-widget-focus, #777)";
		public static readonly pitchBackground: string = "var(--pitch-background, #444)";
		public static readonly tonic: string = "var(--tonic, #864)";
		public static readonly fifthNote: string = "var(--fifth-note, #468)";
		
		public static readonly pitchChannels: DictionaryArray<ChannelColors> = toNameMap([
			{
				name: "pitch1", // cyan
				secondaryChannel: "var(--pitch1-secondary-channel, #0099a1)",
				primaryChannel:   "var(--pitch1-primary-channel,   #25f3ff)",
				secondaryNote:    "var(--pitch1-secondary-note,    #00bdc7)",
				primaryNote:      "var(--pitch1-primary-note,      #92f9ff)",
			}, {
				name: "pitch2", // yellow
				secondaryChannel: "var(--pitch2-secondary-channel, #a1a100)",
				primaryChannel:   "var(--pitch2-primary-channel,   #ffff25)",
				secondaryNote:    "var(--pitch2-secondary-note,    #c7c700)",
				primaryNote:      "var(--pitch2-primary-note,      #ffff92)",
			}, {
				name: "pitch3", // orange
				secondaryChannel: "var(--pitch3-secondary-channel, #c75000)",
				primaryChannel:   "var(--pitch3-primary-channel,   #ff9752)",
				secondaryNote:    "var(--pitch3-secondary-note,    #ff771c)",
				primaryNote:      "var(--pitch3-primary-note,      #ffcdab)",
			}, {
				name: "pitch4", // green
				secondaryChannel: "var(--pitch4-secondary-channel, #00a100)",
				primaryChannel:   "var(--pitch4-primary-channel,   #50ff50)",
				secondaryNote:    "var(--pitch4-secondary-note,    #00c700)",
				primaryNote:      "var(--pitch4-primary-note,      #a0ffa0)",
			}, {
				name: "pitch5", // purple
				secondaryChannel: "var(--pitch5-secondary-channel, #d020d0)",
				primaryChannel:   "var(--pitch5-primary-channel,   #ff90ff)",
				secondaryNote:    "var(--pitch5-secondary-note,    #e040e0)",
				primaryNote:      "var(--pitch5-primary-note,      #ffc0ff)",
			}, {
				name: "pitch6", // blue
				secondaryChannel: "var(--pitch6-secondary-channel, #7777b0)",
				primaryChannel:   "var(--pitch6-primary-channel,   #a0a0ff)",
				secondaryNote:    "var(--pitch6-secondary-note,    #8888d0)",
				primaryNote:      "var(--pitch6-primary-note,      #d0d0ff)",
			},
		]);
		public static readonly noiseChannels: DictionaryArray<ChannelColors> = toNameMap([
			{
				name: "noise1", // gray
				secondaryChannel: "var(--noise1-secondary-channel, #6f6f6f)",
				primaryChannel:   "var(--noise1-primary-channel,   #aaaaaa)",
				secondaryNote:    "var(--noise1-secondary-note,    #a7a7a7)",
				primaryNote:      "var(--noise1-primary-note,      #e0e0e0)",
			}, {
				name: "noise2", // brown
				secondaryChannel: "var(--noise2-secondary-channel, #996633)",
				primaryChannel:   "var(--noise2-primary-channel,   #ddaa77)",
				secondaryNote:    "var(--noise2-secondary-note,    #cc9966)",
				primaryNote:      "var(--noise2-primary-note,      #f0d0bb)",
			}, {
				name: "noise3", // azure
				secondaryChannel: "var(--noise3-secondary-channel, #4a6d8f)",
				primaryChannel:   "var(--noise3-primary-channel,   #77aadd)",
				secondaryNote:    "var(--noise3-secondary-note,    #6f9fcf)",
				primaryNote:      "var(--noise3-primary-note,      #bbd7ff)",
			},
		]);
		
		public static getChannelColor(song: Song, channel: number): ChannelColors {
			return channel < song.pitchChannelCount
				? ColorConfig.pitchChannels[channel % ColorConfig.pitchChannels.length]
				: ColorConfig.noiseChannels[(channel - song.pitchChannelCount) % ColorConfig.noiseChannels.length];
		}
		
		private static readonly _styleElement: HTMLStyleElement = document.head.appendChild(HTML.style({type: "text/css"}));
		
		public static setTheme(name: string): void {
			this._styleElement.textContent = this.themes[name];
		}
	}
}
