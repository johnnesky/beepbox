// Copyright (C) 2019 John Nesky, distributed under the MIT license.
/// <reference path="EditorConfig.ts" />

namespace beepbox {
	export interface ChannelColors extends BeepBoxOption {
		readonly channelDim: string;
		readonly channelBright: string;
		readonly noteDim: string;
		readonly noteBright: string;
	}

	export class ColorConfig {
		public static colorLookup: Map<number, ChannelColors> = new Map<number, ChannelColors>();

		/*
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
		*/

		// Merge note - may need to change more than just the first value. What are the others used for? @jummbus
		public static readonly pitchBackgroundColors: string[] = [
			"#446688",
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

		public static resetColors() {
			this.colorLookup.clear();
		}

		public static getChannelColor(song: Song, channel: number): ChannelColors {

			if (ColorConfig.colorLookup.has(channel)) {
				return ColorConfig.colorLookup.get(channel) as ChannelColors;
			}
			else {
				// Pitch channel color formula
				if (channel < song.pitchChannelCount) {
					let newChannelDim: string = "hsl(" + (((channel * 6.1 / Config.pitchChannelCountMax) * 256) % 256) + "," + (83.3 * (1 - (0.1 * Math.floor(channel / 7)))) + "%," + (40 * (1 - (0.05 * Math.floor(channel / 7)))) + "%)";
					let newChannelBright: string = "hsl(" + (((channel * 6.1 / Config.pitchChannelCountMax) * 256) % 256) + "," + (100.0 * (1 - (0.1 * Math.floor(channel / 7)))) + "%," + (67.5 * (1 - (0.05 * Math.floor(channel / 7)))) + "%)";
					let newNoteDim: string = "hsl(" + (((channel * 6.1 / Config.pitchChannelCountMax) * 256) % 256) + "," + (93.9 * (1 - (0.1 * Math.floor(channel / 7)))) + "%," + (25.0 * (1 - (0.05 * Math.floor(channel / 7)))) + "%)";
					let newNoteBright: string = "hsl(" + (((channel * 6.1 / Config.pitchChannelCountMax) * 256) % 256) + "," + (100.0 * (1 - (0.05 * Math.floor(channel / 7)))) + "%," + (85.6 * (1 - (0.025 * Math.floor(channel / 7)))) + "%)";

					let newChannelColors = <ChannelColors>{ channelDim: newChannelDim, channelBright: newChannelBright, noteDim: newNoteDim, noteBright: newNoteBright };
					ColorConfig.colorLookup.set(channel, newChannelColors);
					return ColorConfig.colorLookup.get(channel) as ChannelColors;
				}
				// Drum channel color formula
				else {
					let newChannelDim: string = "hsl(" + ((channel - song.pitchChannelCount) * 2 / Config.noiseChannelCountMax) * 256 + ",25%,42%)";
					let newChannelBright: string = "hsl(" + ((channel - song.pitchChannelCount) * 2 / Config.noiseChannelCountMax) * 256 + ",33%,63.5%)";
					let newNoteDim: string = "hsl(" + ((channel - song.pitchChannelCount) * 2 / Config.noiseChannelCountMax) * 256 + ",33.5%,55%)";
					let newNoteBright: string = "hsl(" + ((channel - song.pitchChannelCount) * 2 / Config.noiseChannelCountMax) * 256 + ",46.5%,74%)";

					let newChannelColors = <ChannelColors>{ channelDim: newChannelDim, channelBright: newChannelBright, noteDim: newNoteDim, noteBright: newNoteBright };
					ColorConfig.colorLookup.set(channel, newChannelColors);
					return ColorConfig.colorLookup.get(channel) as ChannelColors;
				}

			}
		}
	}
}