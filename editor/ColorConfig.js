// Copyright (C) 2019 John Nesky, distributed under the MIT license.
/// <reference path="EditorConfig.ts" />
var beepbox;
(function (beepbox) {
    class ColorConfig {
        static resetColors() {
            this.colorLookup.clear();
        }
        static getChannelColor(song, channel) {
            if (ColorConfig.colorLookup.has(channel)) {
                return ColorConfig.colorLookup.get(channel);
            }
            else {
                // Pitch channel color formula
                if (channel < song.pitchChannelCount) {
                    let newChannelDim = "hsl(" + (((channel * 6.1 / beepbox.Config.pitchChannelCountMax) * 256) % 256) + "," + (83.3 * (1 - (0.1 * Math.floor(channel / 7)))) + "%," + (40 * (1 - (0.05 * Math.floor(channel / 7)))) + "%)";
                    let newChannelBright = "hsl(" + (((channel * 6.1 / beepbox.Config.pitchChannelCountMax) * 256) % 256) + "," + (100.0 * (1 - (0.1 * Math.floor(channel / 7)))) + "%," + (67.5 * (1 - (0.05 * Math.floor(channel / 7)))) + "%)";
                    let newNoteDim = "hsl(" + (((channel * 6.1 / beepbox.Config.pitchChannelCountMax) * 256) % 256) + "," + (93.9 * (1 - (0.1 * Math.floor(channel / 7)))) + "%," + (25.0 * (1 - (0.05 * Math.floor(channel / 7)))) + "%)";
                    let newNoteBright = "hsl(" + (((channel * 6.1 / beepbox.Config.pitchChannelCountMax) * 256) % 256) + "," + (100.0 * (1 - (0.05 * Math.floor(channel / 7)))) + "%," + (85.6 * (1 - (0.025 * Math.floor(channel / 7)))) + "%)";
                    let newChannelColors = { channelDim: newChannelDim, channelBright: newChannelBright, noteDim: newNoteDim, noteBright: newNoteBright };
                    ColorConfig.colorLookup.set(channel, newChannelColors);
                    return ColorConfig.colorLookup.get(channel);
                }
                // Drum channel color formula
                else if (channel < song.pitchChannelCount + song.noiseChannelCount) {
                    let newChannelDim = "hsl(" + ((channel - song.pitchChannelCount) * 2 / beepbox.Config.noiseChannelCountMax) * 256 + ",25%,42%)";
                    let newChannelBright = "hsl(" + ((channel - song.pitchChannelCount) * 2 / beepbox.Config.noiseChannelCountMax) * 256 + ",33%,63.5%)";
                    let newNoteDim = "hsl(" + ((channel - song.pitchChannelCount) * 2 / beepbox.Config.noiseChannelCountMax) * 256 + ",33.5%,55%)";
                    let newNoteBright = "hsl(" + ((channel - song.pitchChannelCount) * 2 / beepbox.Config.noiseChannelCountMax) * 256 + ",46.5%,74%)";
                    let newChannelColors = { channelDim: newChannelDim, channelBright: newChannelBright, noteDim: newNoteDim, noteBright: newNoteBright };
                    ColorConfig.colorLookup.set(channel, newChannelColors);
                    return ColorConfig.colorLookup.get(channel);
                }
                // Mod channel color formula
                else {
                    let newChannelDim = "hsl(" + 128 + ((channel - song.pitchChannelCount - song.noiseChannelCount) * 2 / beepbox.Config.modChannelCountMax) * 256 + ",88%,50%)";
                    let newChannelBright = "hsl(" + 128 + ((channel - song.pitchChannelCount - song.noiseChannelCount) * 2 / beepbox.Config.modChannelCountMax) * 256 + ",96%,80%)";
                    let newNoteDim = "hsl(" + 128 + ((channel - song.pitchChannelCount - song.noiseChannelCount) * 2 / beepbox.Config.modChannelCountMax) * 256 + ",92%,55%)";
                    let newNoteBright = "hsl(" + 128 + ((channel - song.pitchChannelCount - song.noiseChannelCount) * 2 / beepbox.Config.modChannelCountMax) * 256 + ",96%,85%)";
                    let newChannelColors = { channelDim: newChannelDim, channelBright: newChannelBright, noteDim: newNoteDim, noteBright: newNoteBright };
                    ColorConfig.colorLookup.set(channel, newChannelColors);
                    return ColorConfig.colorLookup.get(channel);
                }
            }
        }
    }
    ColorConfig.colorLookup = new Map();
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
    ColorConfig.pitchBackgroundColors = [
        "#446688",
        "#393e4f",
        "#393e4f",
        "#393e4f",
        "#393e4f",
        "#393e4f",
        "#393e4f",
        "#446688",
        "#393e4f",
        "#393e4f",
        "#393e4f",
        "#393e4f",
    ];
    beepbox.ColorConfig = ColorConfig;
})(beepbox || (beepbox = {}));
//# sourceMappingURL=ColorConfig.js.map