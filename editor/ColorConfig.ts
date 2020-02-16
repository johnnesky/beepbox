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
					--white-piano-key: #bbb;
					--black-piano-key: #444;
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
				}
				
				.beepboxEditor button, .beepboxEditor select {
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
				name: "pitch5", // purple
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
			
			const themeColor = <HTMLMetaElement> document.querySelector("meta[name='theme-color']");
			if (themeColor != null) {
				themeColor.setAttribute("content", getComputedStyle(document.documentElement).getPropertyValue('--ui-widget-background'));
			}
		}
	}
}
