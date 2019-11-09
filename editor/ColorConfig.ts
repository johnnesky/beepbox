// Copyright (C) 2019 John Nesky, distributed under the MIT license.

namespace beepbox {
	export interface ChannelColors extends BeepBoxOption {
		readonly channelDim: string;
		readonly channelBright: string;
		readonly noteDim: string;
		readonly noteBright: string;
	}
	
	export class ColorConfig {
		public static readonly pitchChannelColors: DictionaryArray<ChannelColors> = toNameMap([
			{name: "cyan",   channelDim: "#0099a1", channelBright: "#25f3ff", noteDim: "#00bdc7", noteBright: "#92f9ff"},
			{name: "yellow", channelDim: "#a1a100", channelBright: "#ffff25", noteDim: "#c7c700", noteBright: "#ffff92"},
			{name: "orange", channelDim: "#c75000", channelBright: "#ff9752", noteDim: "#ff771c", noteBright: "#ffcdab"},
			{name: "green",  channelDim: "#00a100", channelBright: "#50ff50", noteDim: "#00c700", noteBright: "#a0ffa0"},
			{name: "purple", channelDim: "#d020d0", channelBright: "#ff90ff", noteDim: "#e040e0", noteBright: "#ffc0ff"},
			{name: "blue",   channelDim: "#7777b0", channelBright: "#a0a0ff", noteDim: "#8888d0", noteBright: "#d0d0ff"},
		]);
		public static readonly noiseChannelColors: DictionaryArray<ChannelColors> = toNameMap([
			{name: "gray",   channelDim: "#6f6f6f", channelBright: "#aaaaaa", noteDim: "#a7a7a7", noteBright: "#e0e0e0"},
			{name: "brown",  channelDim: "#996633", channelBright: "#ddaa77", noteDim: "#cc9966", noteBright: "#f0d0bb"},
			{name: "azure",  channelDim: "#4a6d8f", channelBright: "#77aadd", noteDim: "#6f9fcf", noteBright: "#bbd7ff"},
		]);
		
		public static readonly pitchBackgroundColors: string[] = [
			"#886644",
			"#3E444E",
			"#4A443A",
			"#3E444E",
			"#4A443A",
			"#3E444E",
			"#4A443A",
			"#446688",
			"#4A443A",
			"#3E444E",
			"#4A443A",
			"#3E444E",
		];
		
		public static getChannelColor(song: Song, channel: number): ChannelColors {
			return channel < song.pitchChannelCount
				? ColorConfig.pitchChannelColors[channel % ColorConfig.pitchChannelColors.length]
				: ColorConfig.noiseChannelColors[(channel - song.pitchChannelCount) % ColorConfig.noiseChannelColors.length];
		}
	}
}