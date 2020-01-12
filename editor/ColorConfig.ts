// Copyright (C) 2019 John Nesky, distributed under the MIT license.

namespace beepbox {
	export interface ChannelColors extends BeepBoxOption {
		readonly channelDim: string;
		readonly channelBright: string;
		readonly noteDim: string;
		readonly noteBright: string;
	}
	
	export class ColorConfig {
		public static readonly editorBackground = "black";
		public static readonly hoverPreview = "white";
		public static readonly playhead = "white";
		public static readonly primaryText = "white";
		public static readonly secondaryText = "#999";
		public static readonly loopAccent = "#74f";
		public static readonly linkAccent = "#98f";
		public static readonly uiWidgetBackground = "#444";
		public static readonly uiWidgetFocus = "#777";
		public static readonly pitchBackground = "#444";
		public static readonly tonic = "#864";
		public static readonly fifthNote = "#468";
		
		public static readonly pitchChannels: DictionaryArray<ChannelColors> = toNameMap([
			{name: "cyan",   channelDim: "#0099a1", channelBright: "#25f3ff", noteDim: "#00bdc7", noteBright: "#92f9ff"},
			{name: "yellow", channelDim: "#a1a100", channelBright: "#ffff25", noteDim: "#c7c700", noteBright: "#ffff92"},
			{name: "orange", channelDim: "#c75000", channelBright: "#ff9752", noteDim: "#ff771c", noteBright: "#ffcdab"},
			{name: "green",  channelDim: "#00a100", channelBright: "#50ff50", noteDim: "#00c700", noteBright: "#a0ffa0"},
			{name: "purple", channelDim: "#d020d0", channelBright: "#ff90ff", noteDim: "#e040e0", noteBright: "#ffc0ff"},
			{name: "blue",   channelDim: "#7777b0", channelBright: "#a0a0ff", noteDim: "#8888d0", noteBright: "#d0d0ff"},
		]);
		public static readonly noiseChannels: DictionaryArray<ChannelColors> = toNameMap([
			{name: "gray",   channelDim: "#6f6f6f", channelBright: "#aaaaaa", noteDim: "#a7a7a7", noteBright: "#e0e0e0"},
			{name: "brown",  channelDim: "#996633", channelBright: "#ddaa77", noteDim: "#cc9966", noteBright: "#f0d0bb"},
			{name: "azure",  channelDim: "#4a6d8f", channelBright: "#77aadd", noteDim: "#6f9fcf", noteBright: "#bbd7ff"},
		]);
		
		public static getChannelColor(song: Song, channel: number): ChannelColors {
			return channel < song.pitchChannelCount
				? ColorConfig.pitchChannels[channel % ColorConfig.pitchChannels.length]
				: ColorConfig.noiseChannels[(channel - song.pitchChannelCount) % ColorConfig.noiseChannels.length];
		}
	}
}