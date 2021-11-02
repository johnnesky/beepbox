var beepbox = (function (exports) {
    'use strict';

    /*!
    Copyright (C) 2020 John Nesky

    Permission is hereby granted, free of charge, to any person obtaining a copy of
    this software and associated documentation files (the "Software"), to deal in
    the Software without restriction, including without limitation the rights to
    use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
    of the Software, and to permit persons to whom the Software is furnished to do
    so, subject to the following conditions:

    The above copyright notice and this permission notice shall be included in all
    copies or substantial portions of the Software.

    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
    IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
    FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
    AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
    LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
    OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
    SOFTWARE.
    */
    class Config {
    }
    Config.scales = toNameMap([
        { name: "easy :)", realName: "pentatonic major", flags: [true, false, true, false, true, false, false, true, false, true, false, false] },
        { name: "easy :(", realName: "pentatonic minor", flags: [true, false, false, true, false, true, false, true, false, false, true, false] },
        { name: "island :)", realName: "ryukyu", flags: [true, false, false, false, true, true, false, true, false, false, false, true] },
        { name: "island :(", realName: "pelog selisir", flags: [true, true, false, true, false, false, false, true, true, false, false, false] },
        { name: "blues :)", realName: "blues major", flags: [true, false, true, true, true, false, false, true, false, true, false, false] },
        { name: "blues :(", realName: "blues", flags: [true, false, false, true, false, true, true, true, false, false, true, false] },
        { name: "normal :)", realName: "ionian", flags: [true, false, true, false, true, true, false, true, false, true, false, true] },
        { name: "normal :(", realName: "aeolian", flags: [true, false, true, true, false, true, false, true, true, false, true, false] },
        { name: "dbl harmonic :)", realName: "double harmonic major", flags: [true, true, false, false, true, true, false, true, true, false, false, true] },
        { name: "dbl harmonic :(", realName: "double harmonic minor", flags: [true, false, true, true, false, false, true, true, true, false, false, true] },
        { name: "strange", realName: "whole tone", flags: [true, false, true, false, true, false, true, false, true, false, true, false] },
        { name: "expert", realName: "chromatic", flags: [true, true, true, true, true, true, true, true, true, true, true, true] },
    ]);
    Config.keys = toNameMap([
        { name: "C", isWhiteKey: true, basePitch: 12 },
        { name: "C♯", isWhiteKey: false, basePitch: 13 },
        { name: "D", isWhiteKey: true, basePitch: 14 },
        { name: "D♯", isWhiteKey: false, basePitch: 15 },
        { name: "E", isWhiteKey: true, basePitch: 16 },
        { name: "F", isWhiteKey: true, basePitch: 17 },
        { name: "F♯", isWhiteKey: false, basePitch: 18 },
        { name: "G", isWhiteKey: true, basePitch: 19 },
        { name: "G♯", isWhiteKey: false, basePitch: 20 },
        { name: "A", isWhiteKey: true, basePitch: 21 },
        { name: "A♯", isWhiteKey: false, basePitch: 22 },
        { name: "B", isWhiteKey: true, basePitch: 23 },
    ]);
    Config.blackKeyNameParents = [-1, 1, -1, 1, -1, 1, -1, -1, 1, -1, 1, -1];
    Config.tempoMin = 30;
    Config.tempoMax = 300;
    Config.reverbRange = 4;
    Config.beatsPerBarMin = 3;
    Config.beatsPerBarMax = 16;
    Config.barCountMin = 1;
    Config.barCountMax = 128;
    Config.instrumentsPerChannelMin = 1;
    Config.instrumentsPerChannelMax = 10;
    Config.partsPerBeat = 24;
    Config.ticksPerPart = 2;
    Config.rhythms = toNameMap([
        { name: "÷3 (triplets)", stepsPerBeat: 3, ticksPerArpeggio: 4, arpeggioPatterns: [[0], [0, 0, 1, 1], [0, 1, 2, 1]], roundUpThresholds: [5, 12, 18] },
        { name: "÷4 (standard)", stepsPerBeat: 4, ticksPerArpeggio: 3, arpeggioPatterns: [[0], [0, 0, 1, 1], [0, 1, 2, 1]], roundUpThresholds: [3, 9, 17, 21] },
        { name: "÷6", stepsPerBeat: 6, ticksPerArpeggio: 4, arpeggioPatterns: [[0], [0, 1], [0, 1, 2, 1]], roundUpThresholds: null },
        { name: "÷8", stepsPerBeat: 8, ticksPerArpeggio: 3, arpeggioPatterns: [[0], [0, 1], [0, 1, 2, 1]], roundUpThresholds: null },
        { name: "freehand", stepsPerBeat: 24, ticksPerArpeggio: 3, arpeggioPatterns: [[0], [0, 1], [0, 1, 2, 1]], roundUpThresholds: null },
    ]);
    Config.instrumentTypeNames = ["chip", "FM", "noise", "spectrum", "drumset", "harmonics", "PWM"];
    Config.instrumentTypeHasSpecialInterval = [true, true, false, false, false, true, false];
    Config.chipWaves = toNameMap([
        { name: "rounded", volume: 0.94, samples: centerWave([0.0, 0.2, 0.4, 0.5, 0.6, 0.7, 0.8, 0.85, 0.9, 0.95, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 0.95, 0.9, 0.85, 0.8, 0.7, 0.6, 0.5, 0.4, 0.2, 0.0, -0.2, -0.4, -0.5, -0.6, -0.7, -0.8, -0.85, -0.9, -0.95, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -0.95, -0.9, -0.85, -0.8, -0.7, -0.6, -0.5, -0.4, -0.2]) },
        { name: "triangle", volume: 1.0, samples: centerWave([1.0 / 15.0, 3.0 / 15.0, 5.0 / 15.0, 7.0 / 15.0, 9.0 / 15.0, 11.0 / 15.0, 13.0 / 15.0, 15.0 / 15.0, 15.0 / 15.0, 13.0 / 15.0, 11.0 / 15.0, 9.0 / 15.0, 7.0 / 15.0, 5.0 / 15.0, 3.0 / 15.0, 1.0 / 15.0, -1.0 / 15.0, -3.0 / 15.0, -5.0 / 15.0, -7.0 / 15.0, -9.0 / 15.0, -11.0 / 15.0, -13.0 / 15.0, -15.0 / 15.0, -15.0 / 15.0, -13.0 / 15.0, -11.0 / 15.0, -9.0 / 15.0, -7.0 / 15.0, -5.0 / 15.0, -3.0 / 15.0, -1.0 / 15.0]) },
        { name: "square", volume: 0.5, samples: centerWave([1.0, -1.0]) },
        { name: "1/4 pulse", volume: 0.5, samples: centerWave([1.0, -1.0, -1.0, -1.0]) },
        { name: "1/8 pulse", volume: 0.5, samples: centerWave([1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0]) },
        { name: "sawtooth", volume: 0.65, samples: centerWave([1.0 / 31.0, 3.0 / 31.0, 5.0 / 31.0, 7.0 / 31.0, 9.0 / 31.0, 11.0 / 31.0, 13.0 / 31.0, 15.0 / 31.0, 17.0 / 31.0, 19.0 / 31.0, 21.0 / 31.0, 23.0 / 31.0, 25.0 / 31.0, 27.0 / 31.0, 29.0 / 31.0, 31.0 / 31.0, -31.0 / 31.0, -29.0 / 31.0, -27.0 / 31.0, -25.0 / 31.0, -23.0 / 31.0, -21.0 / 31.0, -19.0 / 31.0, -17.0 / 31.0, -15.0 / 31.0, -13.0 / 31.0, -11.0 / 31.0, -9.0 / 31.0, -7.0 / 31.0, -5.0 / 31.0, -3.0 / 31.0, -1.0 / 31.0]) },
        { name: "double saw", volume: 0.5, samples: centerWave([0.0, -0.2, -0.4, -0.6, -0.8, -1.0, 1.0, -0.8, -0.6, -0.4, -0.2, 1.0, 0.8, 0.6, 0.4, 0.2]) },
        { name: "double pulse", volume: 0.4, samples: centerWave([1.0, 1.0, 1.0, 1.0, 1.0, -1.0, -1.0, -1.0, 1.0, 1.0, 1.0, 1.0, -1.0, -1.0, -1.0, -1.0]) },
        { name: "spiky", volume: 0.4, samples: centerWave([1.0, -1.0, 1.0, -1.0, 1.0, 0.0]) },
    ]);
    Config.chipNoises = toNameMap([
        { name: "retro", volume: 0.25, basePitch: 69, pitchFilterMult: 1024.0, isSoft: false, samples: null },
        { name: "white", volume: 1.0, basePitch: 69, pitchFilterMult: 8.0, isSoft: true, samples: null },
        { name: "clang", volume: 0.4, basePitch: 69, pitchFilterMult: 1024.0, isSoft: false, samples: null },
        { name: "buzz", volume: 0.3, basePitch: 69, pitchFilterMult: 1024.0, isSoft: false, samples: null },
        { name: "hollow", volume: 1.5, basePitch: 96, pitchFilterMult: 1.0, isSoft: true, samples: null },
    ]);
    Config.filterCutoffMaxHz = 8000;
    Config.filterCutoffMinHz = 1;
    Config.filterMax = 0.95;
    Config.filterMaxResonance = 0.95;
    Config.filterCutoffRange = 11;
    Config.filterResonanceRange = 8;
    Config.transitions = toNameMap([
        { name: "seamless", isSeamless: true, attackSeconds: 0.0, releases: false, releaseTicks: 1, slides: false, slideTicks: 3 },
        { name: "hard", isSeamless: false, attackSeconds: 0.0, releases: false, releaseTicks: 3, slides: false, slideTicks: 3 },
        { name: "soft", isSeamless: false, attackSeconds: 0.025, releases: false, releaseTicks: 3, slides: false, slideTicks: 3 },
        { name: "slide", isSeamless: true, attackSeconds: 0.025, releases: false, releaseTicks: 3, slides: true, slideTicks: 3 },
        { name: "cross fade", isSeamless: false, attackSeconds: 0.04, releases: true, releaseTicks: 6, slides: false, slideTicks: 3 },
        { name: "hard fade", isSeamless: false, attackSeconds: 0.0, releases: true, releaseTicks: 48, slides: false, slideTicks: 3 },
        { name: "medium fade", isSeamless: false, attackSeconds: 0.0125, releases: true, releaseTicks: 72, slides: false, slideTicks: 3 },
        { name: "soft fade", isSeamless: false, attackSeconds: 0.06, releases: true, releaseTicks: 96, slides: false, slideTicks: 6 },
    ]);
    Config.vibratos = toNameMap([
        { name: "none", amplitude: 0.0, periodsSeconds: [0.14], delayParts: 0 },
        { name: "light", amplitude: 0.15, periodsSeconds: [0.14], delayParts: 0 },
        { name: "delayed", amplitude: 0.3, periodsSeconds: [0.14], delayParts: 18 },
        { name: "heavy", amplitude: 0.45, periodsSeconds: [0.14], delayParts: 0 },
        { name: "shaky", amplitude: 0.1, periodsSeconds: [0.11, 1.618 * 0.11, 3 * 0.11], delayParts: 0 },
    ]);
    Config.intervals = toNameMap([
        { name: "union", spread: 0.0, offset: 0.0, volume: 0.7, sign: 1.0 },
        { name: "shimmer", spread: 0.018, offset: 0.0, volume: 0.8, sign: 1.0 },
        { name: "hum", spread: 0.045, offset: 0.0, volume: 1.0, sign: 1.0 },
        { name: "honky tonk", spread: 0.09, offset: 0.0, volume: 1.0, sign: 1.0 },
        { name: "dissonant", spread: 0.25, offset: 0.0, volume: 0.9, sign: 1.0 },
        { name: "fifth", spread: 3.5, offset: 3.5, volume: 0.9, sign: 1.0 },
        { name: "octave", spread: 6.0, offset: 6.0, volume: 0.8, sign: 1.0 },
        { name: "bowed", spread: 0.02, offset: 0.0, volume: 1.0, sign: -1.0 },
        { name: "piano", spread: 0.01, offset: 0.0, volume: 1.0, sign: 0.7 },
    ]);
    Config.effectsNames = ["none", "reverb", "chorus", "chorus & reverb"];
    Config.volumeRange = 8;
    Config.volumeLogScale = -0.5;
    Config.panCenter = 4;
    Config.panMax = Config.panCenter * 2;
    Config.chords = toNameMap([
        { name: "harmony", harmonizes: true, customInterval: false, arpeggiates: false, isCustomInterval: false, strumParts: 0 },
        { name: "strum", harmonizes: true, customInterval: false, arpeggiates: false, isCustomInterval: false, strumParts: 1 },
        { name: "arpeggio", harmonizes: false, customInterval: false, arpeggiates: true, isCustomInterval: false, strumParts: 0 },
        { name: "custom interval", harmonizes: true, customInterval: true, arpeggiates: true, isCustomInterval: true, strumParts: 0 },
    ]);
    Config.maxChordSize = 4;
    Config.operatorCount = 4;
    Config.algorithms = toNameMap([
        { name: "1←(2 3 4)", carrierCount: 1, associatedCarrier: [1, 1, 1, 1], modulatedBy: [[2, 3, 4], [], [], []] },
        { name: "1←(2 3←4)", carrierCount: 1, associatedCarrier: [1, 1, 1, 1], modulatedBy: [[2, 3], [], [4], []] },
        { name: "1←2←(3 4)", carrierCount: 1, associatedCarrier: [1, 1, 1, 1], modulatedBy: [[2], [3, 4], [], []] },
        { name: "1←(2 3)←4", carrierCount: 1, associatedCarrier: [1, 1, 1, 1], modulatedBy: [[2, 3], [4], [4], []] },
        { name: "1←2←3←4", carrierCount: 1, associatedCarrier: [1, 1, 1, 1], modulatedBy: [[2], [3], [4], []] },
        { name: "1←3 2←4", carrierCount: 2, associatedCarrier: [1, 2, 1, 2], modulatedBy: [[3], [4], [], []] },
        { name: "1 2←(3 4)", carrierCount: 2, associatedCarrier: [1, 2, 2, 2], modulatedBy: [[], [3, 4], [], []] },
        { name: "1 2←3←4", carrierCount: 2, associatedCarrier: [1, 2, 2, 2], modulatedBy: [[], [3], [4], []] },
        { name: "(1 2)←3←4", carrierCount: 2, associatedCarrier: [1, 2, 2, 2], modulatedBy: [[3], [3], [4], []] },
        { name: "(1 2)←(3 4)", carrierCount: 2, associatedCarrier: [1, 2, 2, 2], modulatedBy: [[3, 4], [3, 4], [], []] },
        { name: "1 2 3←4", carrierCount: 3, associatedCarrier: [1, 2, 3, 3], modulatedBy: [[], [], [4], []] },
        { name: "(1 2 3)←4", carrierCount: 3, associatedCarrier: [1, 2, 3, 3], modulatedBy: [[4], [4], [4], []] },
        { name: "1 2 3 4", carrierCount: 4, associatedCarrier: [1, 2, 3, 4], modulatedBy: [[], [], [], []] },
    ]);
    Config.operatorCarrierInterval = [0.0, 0.04, -0.073, 0.091];
    Config.operatorAmplitudeMax = 15;
    Config.operatorFrequencies = toNameMap([
        { name: "1×", mult: 1.0, hzOffset: 0.0, amplitudeSign: 1.0 },
        { name: "~1×", mult: 1.0, hzOffset: 1.5, amplitudeSign: -1.0 },
        { name: "2×", mult: 2.0, hzOffset: 0.0, amplitudeSign: 1.0 },
        { name: "~2×", mult: 2.0, hzOffset: -1.3, amplitudeSign: -1.0 },
        { name: "3×", mult: 3.0, hzOffset: 0.0, amplitudeSign: 1.0 },
        { name: "4×", mult: 4.0, hzOffset: 0.0, amplitudeSign: 1.0 },
        { name: "5×", mult: 5.0, hzOffset: 0.0, amplitudeSign: 1.0 },
        { name: "6×", mult: 6.0, hzOffset: 0.0, amplitudeSign: 1.0 },
        { name: "7×", mult: 7.0, hzOffset: 0.0, amplitudeSign: 1.0 },
        { name: "8×", mult: 8.0, hzOffset: 0.0, amplitudeSign: 1.0 },
        { name: "9×", mult: 9.0, hzOffset: 0.0, amplitudeSign: 1.0 },
        { name: "11×", mult: 11.0, hzOffset: 0.0, amplitudeSign: 1.0 },
        { name: "13×", mult: 13.0, hzOffset: 0.0, amplitudeSign: 1.0 },
        { name: "16×", mult: 16.0, hzOffset: 0.0, amplitudeSign: 1.0 },
        { name: "20×", mult: 20.0, hzOffset: 0.0, amplitudeSign: 1.0 },
    ]);
    Config.envelopes = toNameMap([
        { name: "custom", type: 0, speed: 0.0 },
        { name: "steady", type: 1, speed: 0.0 },
        { name: "punch", type: 2, speed: 0.0 },
        { name: "flare 1", type: 3, speed: 32.0 },
        { name: "flare 2", type: 3, speed: 8.0 },
        { name: "flare 3", type: 3, speed: 2.0 },
        { name: "twang 1", type: 4, speed: 32.0 },
        { name: "twang 2", type: 4, speed: 8.0 },
        { name: "twang 3", type: 4, speed: 2.0 },
        { name: "swell 1", type: 5, speed: 32.0 },
        { name: "swell 2", type: 5, speed: 8.0 },
        { name: "swell 3", type: 5, speed: 2.0 },
        { name: "tremolo1", type: 6, speed: 4.0 },
        { name: "tremolo2", type: 6, speed: 2.0 },
        { name: "tremolo3", type: 6, speed: 1.0 },
        { name: "tremolo4", type: 7, speed: 4.0 },
        { name: "tremolo5", type: 7, speed: 2.0 },
        { name: "tremolo6", type: 7, speed: 1.0 },
        { name: "decay 1", type: 8, speed: 10.0 },
        { name: "decay 2", type: 8, speed: 7.0 },
        { name: "decay 3", type: 8, speed: 4.0 },
    ]);
    Config.feedbacks = toNameMap([
        { name: "1⟲", indices: [[1], [], [], []] },
        { name: "2⟲", indices: [[], [2], [], []] },
        { name: "3⟲", indices: [[], [], [3], []] },
        { name: "4⟲", indices: [[], [], [], [4]] },
        { name: "1⟲ 2⟲", indices: [[1], [2], [], []] },
        { name: "3⟲ 4⟲", indices: [[], [], [3], [4]] },
        { name: "1⟲ 2⟲ 3⟲", indices: [[1], [2], [3], []] },
        { name: "2⟲ 3⟲ 4⟲", indices: [[], [2], [3], [4]] },
        { name: "1⟲ 2⟲ 3⟲ 4⟲", indices: [[1], [2], [3], [4]] },
        { name: "1→2", indices: [[], [1], [], []] },
        { name: "1→3", indices: [[], [], [1], []] },
        { name: "1→4", indices: [[], [], [], [1]] },
        { name: "2→3", indices: [[], [], [2], []] },
        { name: "2→4", indices: [[], [], [], [2]] },
        { name: "3→4", indices: [[], [], [], [3]] },
        { name: "1→3 2→4", indices: [[], [], [1], [2]] },
        { name: "1→4 2→3", indices: [[], [], [2], [1]] },
        { name: "1→2→3→4", indices: [[], [1], [2], [3]] },
    ]);
    Config.chipNoiseLength = 1 << 15;
    Config.spectrumBasePitch = 24;
    Config.spectrumControlPoints = 30;
    Config.spectrumControlPointsPerOctave = 7;
    Config.spectrumControlPointBits = 3;
    Config.spectrumMax = (1 << Config.spectrumControlPointBits) - 1;
    Config.harmonicsControlPoints = 28;
    Config.harmonicsRendered = 64;
    Config.harmonicsControlPointBits = 3;
    Config.harmonicsMax = (1 << Config.harmonicsControlPointBits) - 1;
    Config.harmonicsWavelength = 1 << 11;
    Config.pulseWidthRange = 8;
    Config.pitchChannelCountMin = 1;
    Config.pitchChannelCountMax = 6;
    Config.noiseChannelCountMin = 0;
    Config.noiseChannelCountMax = 3;
    Config.noiseInterval = 6;
    Config.pitchesPerOctave = 12;
    Config.drumCount = 12;
    Config.pitchOctaves = 7;
    Config.windowOctaves = 3;
    Config.scrollableOctaves = Config.pitchOctaves - Config.windowOctaves;
    Config.windowPitchCount = Config.windowOctaves * Config.pitchesPerOctave + 1;
    Config.maxPitch = Config.pitchOctaves * Config.pitchesPerOctave;
    Config.maximumTonesPerChannel = Config.maxChordSize * 2;
    Config.sineWaveLength = 1 << 8;
    Config.sineWaveMask = Config.sineWaveLength - 1;
    Config.sineWave = generateSineWave();
    function centerWave(wave) {
        let sum = 0.0;
        for (let i = 0; i < wave.length; i++) {
            sum += wave[i];
        }
        const average = sum / wave.length;
        let cumulative = 0;
        let wavePrev = 0;
        for (let i = 0; i < wave.length; i++) {
            cumulative += wavePrev;
            wavePrev = wave[i] - average;
            wave[i] = cumulative;
        }
        wave.push(0);
        return new Float64Array(wave);
    }
    function getDrumWave(index, inverseRealFourierTransform = null, scaleElementsByFactor = null) {
        let wave = Config.chipNoises[index].samples;
        if (wave == null) {
            wave = new Float32Array(Config.chipNoiseLength + 1);
            Config.chipNoises[index].samples = wave;
            if (index == 0) {
                let drumBuffer = 1;
                for (let i = 0; i < Config.chipNoiseLength; i++) {
                    wave[i] = (drumBuffer & 1) * 2.0 - 1.0;
                    let newBuffer = drumBuffer >> 1;
                    if (((drumBuffer + newBuffer) & 1) == 1) {
                        newBuffer += 1 << 14;
                    }
                    drumBuffer = newBuffer;
                }
            }
            else if (index == 1) {
                for (let i = 0; i < Config.chipNoiseLength; i++) {
                    wave[i] = Math.random() * 2.0 - 1.0;
                }
            }
            else if (index == 2) {
                let drumBuffer = 1;
                for (let i = 0; i < Config.chipNoiseLength; i++) {
                    wave[i] = (drumBuffer & 1) * 2.0 - 1.0;
                    let newBuffer = drumBuffer >> 1;
                    if (((drumBuffer + newBuffer) & 1) == 1) {
                        newBuffer += 2 << 14;
                    }
                    drumBuffer = newBuffer;
                }
            }
            else if (index == 3) {
                let drumBuffer = 1;
                for (let i = 0; i < Config.chipNoiseLength; i++) {
                    wave[i] = (drumBuffer & 1) * 2.0 - 1.0;
                    let newBuffer = drumBuffer >> 1;
                    if (((drumBuffer + newBuffer) & 1) == 1) {
                        newBuffer += 10 << 2;
                    }
                    drumBuffer = newBuffer;
                }
            }
            else if (index == 4) {
                drawNoiseSpectrum(wave, 10, 11, 1, 1, 0);
                drawNoiseSpectrum(wave, 11, 14, .6578, .6578, 0);
                inverseRealFourierTransform(wave, Config.chipNoiseLength);
                scaleElementsByFactor(wave, 1.0 / Math.sqrt(Config.chipNoiseLength));
            }
            else {
                throw new Error("Unrecognized drum index: " + index);
            }
            wave[Config.chipNoiseLength] = wave[0];
        }
        return wave;
    }
    function drawNoiseSpectrum(wave, lowOctave, highOctave, lowPower, highPower, overallSlope) {
        const referenceOctave = 11;
        const referenceIndex = 1 << referenceOctave;
        const lowIndex = Math.pow(2, lowOctave) | 0;
        const highIndex = Math.min(Config.chipNoiseLength >> 1, Math.pow(2, highOctave) | 0);
        const retroWave = getDrumWave(0);
        let combinedAmplitude = 0.0;
        for (let i = lowIndex; i < highIndex; i++) {
            let lerped = lowPower + (highPower - lowPower) * (Math.log(i) / Math.LN2 - lowOctave) / (highOctave - lowOctave);
            let amplitude = Math.pow(2, (lerped - 1) * Config.spectrumMax + 1) * lerped;
            amplitude *= Math.pow(i / referenceIndex, overallSlope);
            combinedAmplitude += amplitude;
            amplitude *= retroWave[i];
            const radians = 0.61803398875 * i * i * Math.PI * 2.0;
            wave[i] = Math.cos(radians) * amplitude;
            wave[Config.chipNoiseLength - i] = Math.sin(radians) * amplitude;
        }
        return combinedAmplitude;
    }
    function generateSineWave() {
        const wave = new Float64Array(Config.sineWaveLength + 1);
        for (let i = 0; i < Config.sineWaveLength + 1; i++) {
            wave[i] = Math.sin(i * Math.PI * 2.0 / Config.sineWaveLength);
        }
        return wave;
    }
    function getArpeggioPitchIndex(pitchCount, rhythm, arpeggio) {
        const arpeggioPattern = Config.rhythms[rhythm].arpeggioPatterns[pitchCount - 1];
        if (arpeggioPattern != null) {
            return arpeggioPattern[arpeggio % arpeggioPattern.length];
        }
        else {
            return arpeggio % pitchCount;
        }
    }
    function toNameMap(array) {
        const dictionary = {};
        for (let i = 0; i < array.length; i++) {
            const value = array[i];
            value.index = i;
            dictionary[value.name] = value;
        }
        const result = array;
        result.dictionary = dictionary;
        return result;
    }

    var __values = (exports && exports.__values) || function(o) {
        var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
        if (m) return m.call(o);
        if (o && typeof o.length === "number") return {
            next: function () {
                if (o && i >= o.length) o = void 0;
                return { value: o && o[i++], done: !o };
            }
        };
        throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
    };
    var __read = (exports && exports.__read) || function (o, n) {
        var m = typeof Symbol === "function" && o[Symbol.iterator];
        if (!m) return o;
        var i = m.call(o), r, ar = [], e;
        try {
            while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
        }
        catch (error) { e = { error: error }; }
        finally {
            try {
                if (r && !r.done && (m = i["return"])) m.call(i);
            }
            finally { if (e) throw e.error; }
        }
        return ar;
    };
    var __spread = (exports && exports.__spread) || function () {
        for (var ar = [], i = 0; i < arguments.length; i++) ar = ar.concat(__read(arguments[i]));
        return ar;
    };
    function applyElementArgs(element, args) {
        var e_1, _a, e_2, _b, e_3, _c;
        try {
            for (var args_1 = __values(args), args_1_1 = args_1.next(); !args_1_1.done; args_1_1 = args_1.next()) {
                var arg = args_1_1.value;
                if (arg instanceof Node) {
                    element.appendChild(arg);
                }
                else if (typeof arg === "string") {
                    element.appendChild(document.createTextNode(arg));
                }
                else if (typeof arg === "function") {
                    applyElementArgs(element, [arg()]);
                }
                else if (Array.isArray(arg)) {
                    applyElementArgs(element, arg);
                }
                else if (arg && typeof Symbol !== "undefined" && typeof arg[Symbol.iterator] === "function") {
                    applyElementArgs(element, __spread(arg));
                }
                else if (arg && arg.constructor === Object && element instanceof Element) {
                    try {
                        for (var _d = (e_2 = void 0, __values(Object.keys(arg))), _e = _d.next(); !_e.done; _e = _d.next()) {
                            var key = _e.value;
                            var value = arg[key];
                            if (key === "class") {
                                if (typeof value === "string") {
                                    element.setAttribute("class", value);
                                }
                                else if (Array.isArray(arg) || (value && typeof Symbol !== "undefined" && typeof value[Symbol.iterator] === "function")) {
                                    element.setAttribute("class", __spread(value).join(" "));
                                }
                                else {
                                    console.warn("Invalid " + key + " value \"" + value + "\" on " + element.tagName + " element.");
                                }
                            }
                            else if (key === "style") {
                                if (value && value.constructor === Object) {
                                    try {
                                        for (var _f = (e_3 = void 0, __values(Object.keys(value))), _g = _f.next(); !_g.done; _g = _f.next()) {
                                            var styleKey = _g.value;
                                            if (styleKey in element.style) {
                                                element.style[styleKey] = value[styleKey];
                                            }
                                            else {
                                                element.style.setProperty(styleKey, value[styleKey]);
                                            }
                                        }
                                    }
                                    catch (e_3_1) { e_3 = { error: e_3_1 }; }
                                    finally {
                                        try {
                                            if (_g && !_g.done && (_c = _f.return)) _c.call(_f);
                                        }
                                        finally { if (e_3) throw e_3.error; }
                                    }
                                }
                                else {
                                    element.setAttribute(key, value);
                                }
                            }
                            else if (typeof (value) === "function") {
                                element[key] = value;
                            }
                            else if (typeof (value) === "boolean") {
                                if (value)
                                    element.setAttribute(key, "");
                                else
                                    element.removeAttribute(key);
                            }
                            else {
                                element.setAttribute(key, value);
                            }
                        }
                    }
                    catch (e_2_1) { e_2 = { error: e_2_1 }; }
                    finally {
                        try {
                            if (_e && !_e.done && (_b = _d.return)) _b.call(_d);
                        }
                        finally { if (e_2) throw e_2.error; }
                    }
                }
                else {
                    element.appendChild(document.createTextNode(arg));
                }
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (args_1_1 && !args_1_1.done && (_a = args_1.return)) _a.call(args_1);
            }
            finally { if (e_1) throw e_1.error; }
        }
        return element;
    }
    var svgNS = "http://www.w3.org/2000/svg";
    function parseHTML() {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        return document.createRange().createContextualFragment(args.join());
    }
    function parseSVG() {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        var fragment = document.createDocumentFragment();
        var svgParser = new DOMParser().parseFromString("<svg xmlns=\"http://www.w3.org/2000/svg\">" + args.join() + "</svg>", "image/svg+xml").documentElement;
        while (svgParser.firstChild !== null) {
            document.importNode(svgParser.firstChild, true);
            fragment.appendChild(svgParser.firstChild);
        }
        return fragment;
    }

    var __values$1 = (exports && exports.__values) || function(o) {
        var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
        if (m) return m.call(o);
        if (o && typeof o.length === "number") return {
            next: function () {
                if (o && i >= o.length) o = void 0;
                return { value: o && o[i++], done: !o };
            }
        };
        throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
    };
    var e_1, _a, e_2, _b;
    var HTML = parseHTML;
    var SVG = parseSVG;
    var _loop_1 = function (name_1) {
        HTML[name_1] = function () {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i] = arguments[_i];
            }
            return applyElementArgs(document.createElement(name_1), args);
        };
    };
    try {
        for (var _c = __values$1("a abbr address area article aside audio b base bdi bdo blockquote br button canvas caption cite code col colgroup datalist dd del details dfn dialog div dl dt em embed fieldset figcaption figure footer form h1 h2 h3 h4 h5 h6 header hr i iframe img input ins kbd label legend li link main map mark menu menuitem meta meter nav noscript object ol optgroup option output p param picture pre progress q rp rt ruby s samp script section select small source span strong style sub summary sup table tbody td template textarea tfoot th thead time title tr track u ul var video wbr".split(" ")), _d = _c.next(); !_d.done; _d = _c.next()) {
            var name_1 = _d.value;
            _loop_1(name_1);
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (_d && !_d.done && (_a = _c.return)) _a.call(_c);
        }
        finally { if (e_1) throw e_1.error; }
    }
    var _loop_2 = function (name_2) {
        SVG[name_2] = function () {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i] = arguments[_i];
            }
            return applyElementArgs(document.createElementNS(svgNS, name_2), args);
        };
        if (/-/.test(name_2)) {
            var snakeCaseName = name_2.replace(/-/g, "_");
            SVG[snakeCaseName] = function () {
                var args = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    args[_i] = arguments[_i];
                }
                return applyElementArgs(document.createElementNS(svgNS, name_2), args);
            };
        }
    };
    try {
        for (var _e = __values$1("a altGlyph altGlyphDef altGlyphItem animate animateMotion animateTransform circle clipPath color-profile cursor defs desc discard ellipse feBlend feColorMatrix feComponentTransfer feComposite feConvolveMatrix feDiffuseLighting feDisplacementMap feDistantLight feDropShadow feFlood feFuncA feFuncB feFuncG feFuncR feGaussianBlur feImage feMerge feMergeNode feMorphology feOffset fePointLight feSpecularLighting feSpotLight feTile feTurbulence filter font font-face font-face-format font-face-name font-face-src font-face-uri foreignObject g glyph glyphRef hkern image line linearGradient marker mask metadata missing-glyph mpath path pattern polygon polyline radialGradient rect script set stop style svg switch symbol text textPath title tref tspan use view vkern".split(" ")), _f = _e.next(); !_f.done; _f = _e.next()) {
            var name_2 = _f.value;
            _loop_2(name_2);
        }
    }
    catch (e_2_1) { e_2 = { error: e_2_1 }; }
    finally {
        try {
            if (_f && !_f.done && (_b = _e.return)) _b.call(_e);
        }
        finally { if (e_2) throw e_2.error; }
    }

    class ColorConfig {
        static getChannelColor(song, channel) {
            return channel < song.pitchChannelCount
                ? ColorConfig.pitchChannels[channel % ColorConfig.pitchChannels.length]
                : ColorConfig.noiseChannels[(channel - song.pitchChannelCount) % ColorConfig.noiseChannels.length];
        }
        static setTheme(name) {
            this._styleElement.textContent = this.themes[name];
            const themeColor = document.querySelector("meta[name='theme-color']");
            if (themeColor != null) {
                themeColor.setAttribute("content", getComputedStyle(document.documentElement).getPropertyValue('--ui-widget-background'));
            }
        }
    }
    ColorConfig.themes = {
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
    ColorConfig.pageMargin = "var(--page-margin)";
    ColorConfig.editorBackground = "var(--editor-background)";
    ColorConfig.hoverPreview = "var(--hover-preview)";
    ColorConfig.playhead = "var(--playhead)";
    ColorConfig.primaryText = "var(--primary-text)";
    ColorConfig.secondaryText = "var(--secondary-text)";
    ColorConfig.invertedText = "var(--inverted-text)";
    ColorConfig.textSelection = "var(--text-selection)";
    ColorConfig.boxSelectionFill = "var(--box-selection-fill)";
    ColorConfig.loopAccent = "var(--loop-accent)";
    ColorConfig.linkAccent = "var(--link-accent)";
    ColorConfig.uiWidgetBackground = "var(--ui-widget-background)";
    ColorConfig.uiWidgetFocus = "var(--ui-widget-focus)";
    ColorConfig.pitchBackground = "var(--pitch-background)";
    ColorConfig.tonic = "var(--tonic)";
    ColorConfig.fifthNote = "var(--fifth-note)";
    ColorConfig.whitePianoKey = "var(--white-piano-key)";
    ColorConfig.blackPianoKey = "var(--black-piano-key)";
    ColorConfig.pitchChannels = toNameMap([
        {
            name: "pitch1",
            secondaryChannel: "var(--pitch1-secondary-channel)",
            primaryChannel: "var(--pitch1-primary-channel)",
            secondaryNote: "var(--pitch1-secondary-note)",
            primaryNote: "var(--pitch1-primary-note)",
        }, {
            name: "pitch2",
            secondaryChannel: "var(--pitch2-secondary-channel)",
            primaryChannel: "var(--pitch2-primary-channel)",
            secondaryNote: "var(--pitch2-secondary-note)",
            primaryNote: "var(--pitch2-primary-note)",
        }, {
            name: "pitch3",
            secondaryChannel: "var(--pitch3-secondary-channel)",
            primaryChannel: "var(--pitch3-primary-channel)",
            secondaryNote: "var(--pitch3-secondary-note)",
            primaryNote: "var(--pitch3-primary-note)",
        }, {
            name: "pitch4",
            secondaryChannel: "var(--pitch4-secondary-channel)",
            primaryChannel: "var(--pitch4-primary-channel)",
            secondaryNote: "var(--pitch4-secondary-note)",
            primaryNote: "var(--pitch4-primary-note)",
        }, {
            name: "pitch5",
            secondaryChannel: "var(--pitch5-secondary-channel)",
            primaryChannel: "var(--pitch5-primary-channel)",
            secondaryNote: "var(--pitch5-secondary-note)",
            primaryNote: "var(--pitch5-primary-note)",
        }, {
            name: "pitch6",
            secondaryChannel: "var(--pitch6-secondary-channel)",
            primaryChannel: "var(--pitch6-primary-channel)",
            secondaryNote: "var(--pitch6-secondary-note)",
            primaryNote: "var(--pitch6-primary-note)",
        },
    ]);
    ColorConfig.noiseChannels = toNameMap([
        {
            name: "noise1",
            secondaryChannel: "var(--noise1-secondary-channel)",
            primaryChannel: "var(--noise1-primary-channel)",
            secondaryNote: "var(--noise1-secondary-note)",
            primaryNote: "var(--noise1-primary-note)",
        }, {
            name: "noise2",
            secondaryChannel: "var(--noise2-secondary-channel)",
            primaryChannel: "var(--noise2-primary-channel)",
            secondaryNote: "var(--noise2-secondary-note)",
            primaryNote: "var(--noise2-primary-note)",
        }, {
            name: "noise3",
            secondaryChannel: "var(--noise3-secondary-channel)",
            primaryChannel: "var(--noise3-primary-channel)",
            secondaryNote: "var(--noise3-secondary-note)",
            primaryNote: "var(--noise3-primary-note)",
        },
    ]);
    ColorConfig._styleElement = document.head.appendChild(HTML.style({ type: "text/css" }));

    function scaleElementsByFactor(array, factor) {
        for (let i = 0; i < array.length; i++) {
            array[i] *= factor;
        }
    }
    function isPowerOf2(n) {
        return !!n && !(n & (n - 1));
    }
    function countBits(n) {
        if (!isPowerOf2(n))
            throw new Error("FFT array length must be a power of 2.");
        return Math.round(Math.log(n) / Math.log(2));
    }
    function reverseIndexBits(array, fullArrayLength) {
        const bitCount = countBits(fullArrayLength);
        if (bitCount > 16)
            throw new Error("FFT array length must not be greater than 2^16.");
        const finalShift = 16 - bitCount;
        for (let i = 0; i < fullArrayLength; i++) {
            let j;
            j = ((i & 0xaaaa) >> 1) | ((i & 0x5555) << 1);
            j = ((j & 0xcccc) >> 2) | ((j & 0x3333) << 2);
            j = ((j & 0xf0f0) >> 4) | ((j & 0x0f0f) << 4);
            j = ((j >> 8) | ((j & 0xff) << 8)) >> finalShift;
            if (j > i) {
                let temp = array[i];
                array[i] = array[j];
                array[j] = temp;
            }
        }
    }
    function inverseRealFourierTransform(array, fullArrayLength) {
        const totalPasses = countBits(fullArrayLength);
        if (fullArrayLength < 4)
            throw new Error("FFT array length must be at least 4.");
        for (let pass = totalPasses - 1; pass >= 2; pass--) {
            const subStride = 1 << pass;
            const midSubStride = subStride >> 1;
            const stride = subStride << 1;
            const radiansIncrement = Math.PI * 2.0 / stride;
            const cosIncrement = Math.cos(radiansIncrement);
            const sinIncrement = Math.sin(radiansIncrement);
            const oscillatorMultiplier = 2.0 * cosIncrement;
            for (let startIndex = 0; startIndex < fullArrayLength; startIndex += stride) {
                const startIndexA = startIndex;
                const midIndexA = startIndexA + midSubStride;
                const startIndexB = startIndexA + subStride;
                const midIndexB = startIndexB + midSubStride;
                const stopIndex = startIndexB + subStride;
                const realStartA = array[startIndexA];
                const imagStartB = array[startIndexB];
                array[startIndexA] = realStartA + imagStartB;
                array[midIndexA] *= 2;
                array[startIndexB] = realStartA - imagStartB;
                array[midIndexB] *= 2;
                let c = cosIncrement;
                let s = -sinIncrement;
                let cPrev = 1.0;
                let sPrev = 0.0;
                for (let index = 1; index < midSubStride; index++) {
                    const indexA0 = startIndexA + index;
                    const indexA1 = startIndexB - index;
                    const indexB0 = startIndexB + index;
                    const indexB1 = stopIndex - index;
                    const real0 = array[indexA0];
                    const real1 = array[indexA1];
                    const imag0 = array[indexB0];
                    const imag1 = array[indexB1];
                    const tempA = real0 - real1;
                    const tempB = imag0 + imag1;
                    array[indexA0] = real0 + real1;
                    array[indexA1] = imag1 - imag0;
                    array[indexB0] = tempA * c - tempB * s;
                    array[indexB1] = tempB * c + tempA * s;
                    const cTemp = oscillatorMultiplier * c - cPrev;
                    const sTemp = oscillatorMultiplier * s - sPrev;
                    cPrev = c;
                    sPrev = s;
                    c = cTemp;
                    s = sTemp;
                }
            }
        }
        for (let index = 0; index < fullArrayLength; index += 4) {
            const index1 = index + 1;
            const index2 = index + 2;
            const index3 = index + 3;
            const real0 = array[index];
            const real1 = array[index1] * 2;
            const imag2 = array[index2];
            const imag3 = array[index3] * 2;
            const tempA = real0 + imag2;
            const tempB = real0 - imag2;
            array[index] = tempA + real1;
            array[index1] = tempA - real1;
            array[index2] = tempB + imag3;
            array[index3] = tempB - imag3;
        }
        reverseIndexBits(array, fullArrayLength);
    }

    class Deque {
        constructor() {
            this._capacity = 1;
            this._buffer = [undefined];
            this._mask = 0;
            this._offset = 0;
            this._count = 0;
        }
        pushFront(element) {
            if (this._count >= this._capacity)
                this._expandCapacity();
            this._offset = (this._offset - 1) & this._mask;
            this._buffer[this._offset] = element;
            this._count++;
        }
        pushBack(element) {
            if (this._count >= this._capacity)
                this._expandCapacity();
            this._buffer[(this._offset + this._count) & this._mask] = element;
            this._count++;
        }
        popFront() {
            if (this._count <= 0)
                throw new Error("No elements left to pop.");
            const element = this._buffer[this._offset];
            this._buffer[this._offset] = undefined;
            this._offset = (this._offset + 1) & this._mask;
            this._count--;
            return element;
        }
        popBack() {
            if (this._count <= 0)
                throw new Error("No elements left to pop.");
            this._count--;
            const index = (this._offset + this._count) & this._mask;
            const element = this._buffer[index];
            this._buffer[index] = undefined;
            return element;
        }
        peakFront() {
            if (this._count <= 0)
                throw new Error("No elements left to pop.");
            return this._buffer[this._offset];
        }
        peakBack() {
            if (this._count <= 0)
                throw new Error("No elements left to pop.");
            return this._buffer[(this._offset + this._count - 1) & this._mask];
        }
        count() {
            return this._count;
        }
        set(index, element) {
            if (index < 0 || index >= this._count)
                throw new Error("Invalid index");
            this._buffer[(this._offset + index) & this._mask] = element;
        }
        get(index) {
            if (index < 0 || index >= this._count)
                throw new Error("Invalid index");
            return this._buffer[(this._offset + index) & this._mask];
        }
        remove(index) {
            if (index < 0 || index >= this._count)
                throw new Error("Invalid index");
            if (index <= (this._count >> 1)) {
                while (index > 0) {
                    this.set(index, this.get(index - 1));
                    index--;
                }
                this.popFront();
            }
            else {
                index++;
                while (index < this._count) {
                    this.set(index - 1, this.get(index));
                    index++;
                }
                this.popBack();
            }
        }
        _expandCapacity() {
            if (this._capacity >= 0x40000000)
                throw new Error("Capacity too big.");
            this._capacity = this._capacity << 1;
            const oldBuffer = this._buffer;
            const newBuffer = new Array(this._capacity);
            const size = this._count | 0;
            const offset = this._offset | 0;
            for (let i = 0; i < size; i++) {
                newBuffer[i] = oldBuffer[(offset + i) & this._mask];
            }
            for (let i = size; i < this._capacity; i++) {
                newBuffer[i] = undefined;
            }
            this._offset = 0;
            this._buffer = newBuffer;
            this._mask = this._capacity - 1;
        }
    }

    const base64IntToCharCode = [48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 97, 98, 99, 100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118, 119, 120, 121, 122, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 45, 95];
    const base64CharCodeToInt = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 62, 62, 0, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0, 0, 0, 0, 0, 0, 0, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 0, 0, 0, 0, 63, 0, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 0, 0, 0, 0, 0];
    class BitFieldReader {
        constructor(source, startIndex, stopIndex) {
            this._bits = [];
            this._readIndex = 0;
            for (let i = startIndex; i < stopIndex; i++) {
                const value = base64CharCodeToInt[source.charCodeAt(i)];
                this._bits.push((value >> 5) & 0x1);
                this._bits.push((value >> 4) & 0x1);
                this._bits.push((value >> 3) & 0x1);
                this._bits.push((value >> 2) & 0x1);
                this._bits.push((value >> 1) & 0x1);
                this._bits.push(value & 0x1);
            }
        }
        read(bitCount) {
            let result = 0;
            while (bitCount > 0) {
                result = result << 1;
                result += this._bits[this._readIndex++];
                bitCount--;
            }
            return result;
        }
        readLongTail(minValue, minBits) {
            let result = minValue;
            let numBits = minBits;
            while (this._bits[this._readIndex++]) {
                result += 1 << numBits;
                numBits++;
            }
            while (numBits > 0) {
                numBits--;
                if (this._bits[this._readIndex++]) {
                    result += 1 << numBits;
                }
            }
            return result;
        }
        readPartDuration() {
            return this.readLongTail(1, 3);
        }
        readLegacyPartDuration() {
            return this.readLongTail(1, 2);
        }
        readPinCount() {
            return this.readLongTail(1, 0);
        }
        readPitchInterval() {
            if (this.read(1)) {
                return -this.readLongTail(1, 3);
            }
            else {
                return this.readLongTail(1, 3);
            }
        }
    }
    class BitFieldWriter {
        constructor() {
            this._index = 0;
            this._bits = [];
        }
        clear() {
            this._index = 0;
        }
        write(bitCount, value) {
            bitCount--;
            while (bitCount >= 0) {
                this._bits[this._index++] = (value >>> bitCount) & 1;
                bitCount--;
            }
        }
        writeLongTail(minValue, minBits, value) {
            if (value < minValue)
                throw new Error("value out of bounds");
            value -= minValue;
            let numBits = minBits;
            while (value >= (1 << numBits)) {
                this._bits[this._index++] = 1;
                value -= 1 << numBits;
                numBits++;
            }
            this._bits[this._index++] = 0;
            while (numBits > 0) {
                numBits--;
                this._bits[this._index++] = (value >>> numBits) & 1;
            }
        }
        writePartDuration(value) {
            this.writeLongTail(1, 3, value);
        }
        writePinCount(value) {
            this.writeLongTail(1, 0, value);
        }
        writePitchInterval(value) {
            if (value < 0) {
                this.write(1, 1);
                this.writeLongTail(1, 3, -value);
            }
            else {
                this.write(1, 0);
                this.writeLongTail(1, 3, value);
            }
        }
        concat(other) {
            for (let i = 0; i < other._index; i++) {
                this._bits[this._index++] = other._bits[i];
            }
        }
        encodeBase64(buffer) {
            for (let i = 0; i < this._index; i += 6) {
                const value = (this._bits[i] << 5) | (this._bits[i + 1] << 4) | (this._bits[i + 2] << 3) | (this._bits[i + 3] << 2) | (this._bits[i + 4] << 1) | this._bits[i + 5];
                buffer.push(base64IntToCharCode[value]);
            }
            return buffer;
        }
        lengthBase64() {
            return Math.ceil(this._index / 6);
        }
    }
    function makeNotePin(interval, time, volume) {
        return { interval: interval, time: time, volume: volume };
    }
    function clamp(min, max, val) {
        max = max - 1;
        if (val <= max) {
            if (val >= min)
                return val;
            else
                return min;
        }
        else {
            return max;
        }
    }
    function validateRange(min, max, val) {
        if (min <= val && val <= max)
            return val;
        throw new Error(`Value ${val} not in range [${min}, ${max}]`);
    }
    class Note {
        constructor(pitch, start, end, volume, fadeout = false) {
            this.pitches = [pitch];
            this.pins = [makeNotePin(0, 0, volume), makeNotePin(0, end - start, fadeout ? 0 : volume)];
            this.start = start;
            this.end = end;
        }
        pickMainInterval() {
            let longestFlatIntervalDuration = 0;
            let mainInterval = 0;
            for (let pinIndex = 1; pinIndex < this.pins.length; pinIndex++) {
                const pinA = this.pins[pinIndex - 1];
                const pinB = this.pins[pinIndex];
                if (pinA.interval == pinB.interval) {
                    const duration = pinB.time - pinA.time;
                    if (longestFlatIntervalDuration < duration) {
                        longestFlatIntervalDuration = duration;
                        mainInterval = pinA.interval;
                    }
                }
            }
            if (longestFlatIntervalDuration == 0) {
                let loudestVolume = 0;
                for (let pinIndex = 0; pinIndex < this.pins.length; pinIndex++) {
                    const pin = this.pins[pinIndex];
                    if (loudestVolume < pin.volume) {
                        loudestVolume = pin.volume;
                        mainInterval = pin.interval;
                    }
                }
            }
            return mainInterval;
        }
        clone() {
            const newNote = new Note(-1, this.start, this.end, 3);
            newNote.pitches = this.pitches.concat();
            newNote.pins = [];
            for (const pin of this.pins) {
                newNote.pins.push(makeNotePin(pin.interval, pin.time, pin.volume));
            }
            return newNote;
        }
    }
    class Pattern {
        constructor() {
            this.notes = [];
            this.instrument = 0;
        }
        cloneNotes() {
            const result = [];
            for (const note of this.notes) {
                result.push(note.clone());
            }
            return result;
        }
        reset() {
            this.notes.length = 0;
            this.instrument = 0;
        }
    }
    class Operator {
        constructor(index) {
            this.frequency = 0;
            this.amplitude = 0;
            this.envelope = 0;
            this.reset(index);
        }
        reset(index) {
            this.frequency = 0;
            this.amplitude = (index <= 1) ? Config.operatorAmplitudeMax : 0;
            this.envelope = (index == 0) ? 0 : 1;
        }
    }
    class SpectrumWave {
        constructor(isNoiseChannel) {
            this.spectrum = [];
            this._wave = null;
            this._waveIsReady = false;
            this.reset(isNoiseChannel);
        }
        reset(isNoiseChannel) {
            for (let i = 0; i < Config.spectrumControlPoints; i++) {
                if (isNoiseChannel) {
                    this.spectrum[i] = Math.round(Config.spectrumMax * (1 / Math.sqrt(1 + i / 3)));
                }
                else {
                    const isHarmonic = i == 0 || i == 7 || i == 11 || i == 14 || i == 16 || i == 18 || i == 21 || i == 23 || i >= 25;
                    this.spectrum[i] = isHarmonic ? Math.max(0, Math.round(Config.spectrumMax * (1 - i / 30))) : 0;
                }
            }
            this._waveIsReady = false;
        }
        markCustomWaveDirty() {
            this._waveIsReady = false;
        }
        getCustomWave(lowestOctave) {
            if (!this._waveIsReady || this._wave == null) {
                let waveLength = Config.chipNoiseLength;
                if (this._wave == null || this._wave.length != waveLength + 1) {
                    this._wave = new Float32Array(waveLength + 1);
                }
                const wave = this._wave;
                for (let i = 0; i < waveLength; i++) {
                    wave[i] = 0;
                }
                const highestOctave = 14;
                const falloffRatio = 0.25;
                const pitchTweak = [0, 1 / 7, Math.log(5 / 4) / Math.LN2, 3 / 7, Math.log(3 / 2) / Math.LN2, 5 / 7, 6 / 7];
                function controlPointToOctave(point) {
                    return lowestOctave + Math.floor(point / Config.spectrumControlPointsPerOctave) + pitchTweak[(point + Config.spectrumControlPointsPerOctave) % Config.spectrumControlPointsPerOctave];
                }
                let combinedAmplitude = 1;
                for (let i = 0; i < Config.spectrumControlPoints + 1; i++) {
                    const value1 = (i <= 0) ? 0 : this.spectrum[i - 1];
                    const value2 = (i >= Config.spectrumControlPoints) ? this.spectrum[Config.spectrumControlPoints - 1] : this.spectrum[i];
                    const octave1 = controlPointToOctave(i - 1);
                    let octave2 = controlPointToOctave(i);
                    if (i >= Config.spectrumControlPoints)
                        octave2 = highestOctave + (octave2 - highestOctave) * falloffRatio;
                    if (value1 == 0 && value2 == 0)
                        continue;
                    combinedAmplitude += 0.02 * drawNoiseSpectrum(wave, octave1, octave2, value1 / Config.spectrumMax, value2 / Config.spectrumMax, -0.5);
                }
                if (this.spectrum[Config.spectrumControlPoints - 1] > 0) {
                    combinedAmplitude += 0.02 * drawNoiseSpectrum(wave, highestOctave + (controlPointToOctave(Config.spectrumControlPoints) - highestOctave) * falloffRatio, highestOctave, this.spectrum[Config.spectrumControlPoints - 1] / Config.spectrumMax, 0, -0.5);
                }
                inverseRealFourierTransform(wave, waveLength);
                scaleElementsByFactor(wave, 5.0 / (Math.sqrt(waveLength) * Math.pow(combinedAmplitude, 0.75)));
                wave[waveLength] = wave[0];
                this._waveIsReady = true;
            }
            return this._wave;
        }
    }
    class HarmonicsWave {
        constructor() {
            this.harmonics = [];
            this._wave = null;
            this._waveIsReady = false;
            this.reset();
        }
        reset() {
            for (let i = 0; i < Config.harmonicsControlPoints; i++) {
                this.harmonics[i] = 0;
            }
            this.harmonics[0] = Config.harmonicsMax;
            this.harmonics[3] = Config.harmonicsMax;
            this.harmonics[6] = Config.harmonicsMax;
            this._waveIsReady = false;
        }
        markCustomWaveDirty() {
            this._waveIsReady = false;
        }
        getCustomWave() {
            if (!this._waveIsReady || this._wave == null) {
                let waveLength = Config.harmonicsWavelength;
                const retroWave = getDrumWave(0);
                if (this._wave == null || this._wave.length != waveLength + 1) {
                    this._wave = new Float32Array(waveLength + 1);
                }
                const wave = this._wave;
                for (let i = 0; i < waveLength; i++) {
                    wave[i] = 0;
                }
                const overallSlope = -0.25;
                let combinedControlPointAmplitude = 1;
                for (let harmonicIndex = 0; harmonicIndex < Config.harmonicsRendered; harmonicIndex++) {
                    const harmonicFreq = harmonicIndex + 1;
                    let controlValue = harmonicIndex < Config.harmonicsControlPoints ? this.harmonics[harmonicIndex] : this.harmonics[Config.harmonicsControlPoints - 1];
                    if (harmonicIndex >= Config.harmonicsControlPoints) {
                        controlValue *= 1 - (harmonicIndex - Config.harmonicsControlPoints) / (Config.harmonicsRendered - Config.harmonicsControlPoints);
                    }
                    const normalizedValue = controlValue / Config.harmonicsMax;
                    let amplitude = Math.pow(2, controlValue - Config.harmonicsMax + 1) * Math.sqrt(normalizedValue);
                    if (harmonicIndex < Config.harmonicsControlPoints) {
                        combinedControlPointAmplitude += amplitude;
                    }
                    amplitude *= Math.pow(harmonicFreq, overallSlope);
                    amplitude *= retroWave[harmonicIndex + 589];
                    wave[waveLength - harmonicFreq] = amplitude;
                }
                inverseRealFourierTransform(wave, waveLength);
                const mult = 1 / Math.pow(combinedControlPointAmplitude, 0.7);
                let cumulative = 0;
                let wavePrev = 0;
                for (let i = 0; i < wave.length; i++) {
                    cumulative += wavePrev;
                    wavePrev = wave[i] * mult;
                    wave[i] = cumulative;
                }
                wave[waveLength] = wave[0];
                this._waveIsReady = true;
            }
            return this._wave;
        }
    }
    class Instrument {
        constructor(isNoiseChannel) {
            this.type = 0;
            this.preset = 0;
            this.chipWave = 2;
            this.chipNoise = 1;
            this.filterCutoff = 6;
            this.filterResonance = 0;
            this.filterEnvelope = 1;
            this.transition = 1;
            this.vibrato = 0;
            this.interval = 0;
            this.effects = 0;
            this.chord = 1;
            this.volume = 0;
            this.pan = Config.panCenter;
            this.pulseWidth = Config.pulseWidthRange - 1;
            this.pulseEnvelope = 1;
            this.algorithm = 0;
            this.feedbackType = 0;
            this.feedbackAmplitude = 0;
            this.feedbackEnvelope = 1;
            this.operators = [];
            this.harmonicsWave = new HarmonicsWave();
            this.drumsetEnvelopes = [];
            this.drumsetSpectrumWaves = [];
            this.spectrumWave = new SpectrumWave(isNoiseChannel);
            for (let i = 0; i < Config.operatorCount; i++) {
                this.operators[i] = new Operator(i);
            }
            for (let i = 0; i < Config.drumCount; i++) {
                this.drumsetEnvelopes[i] = Config.envelopes.dictionary["twang 2"].index;
                this.drumsetSpectrumWaves[i] = new SpectrumWave(true);
            }
        }
        setTypeAndReset(type, isNoiseChannel) {
            this.type = type;
            this.preset = type;
            this.volume = 0;
            this.pan = Config.panCenter;
            switch (type) {
                case 0:
                    this.chipWave = 2;
                    this.filterCutoff = 6;
                    this.filterResonance = 0;
                    this.filterEnvelope = Config.envelopes.dictionary["steady"].index;
                    this.transition = 1;
                    this.vibrato = 0;
                    this.interval = 0;
                    this.effects = 1;
                    this.chord = 2;
                    break;
                case 1:
                    this.transition = 1;
                    this.vibrato = 0;
                    this.effects = 1;
                    this.chord = 3;
                    this.filterCutoff = 10;
                    this.filterResonance = 0;
                    this.filterEnvelope = 1;
                    this.algorithm = 0;
                    this.feedbackType = 0;
                    this.feedbackAmplitude = 0;
                    this.feedbackEnvelope = Config.envelopes.dictionary["steady"].index;
                    for (let i = 0; i < this.operators.length; i++) {
                        this.operators[i].reset(i);
                    }
                    break;
                case 2:
                    this.chipNoise = 1;
                    this.transition = 1;
                    this.effects = 0;
                    this.chord = 2;
                    this.filterCutoff = 10;
                    this.filterResonance = 0;
                    this.filterEnvelope = Config.envelopes.dictionary["steady"].index;
                    break;
                case 3:
                    this.transition = 1;
                    this.effects = 1;
                    this.chord = 0;
                    this.filterCutoff = 10;
                    this.filterResonance = 0;
                    this.filterEnvelope = Config.envelopes.dictionary["steady"].index;
                    this.spectrumWave.reset(isNoiseChannel);
                    break;
                case 4:
                    this.effects = 0;
                    for (let i = 0; i < Config.drumCount; i++) {
                        this.drumsetEnvelopes[i] = Config.envelopes.dictionary["twang 2"].index;
                        this.drumsetSpectrumWaves[i].reset(isNoiseChannel);
                    }
                    break;
                case 5:
                    this.filterCutoff = 10;
                    this.filterResonance = 0;
                    this.filterEnvelope = Config.envelopes.dictionary["steady"].index;
                    this.transition = 1;
                    this.vibrato = 0;
                    this.interval = 0;
                    this.effects = 1;
                    this.chord = 0;
                    this.harmonicsWave.reset();
                    break;
                case 6:
                    this.filterCutoff = 10;
                    this.filterResonance = 0;
                    this.filterEnvelope = Config.envelopes.dictionary["steady"].index;
                    this.transition = 1;
                    this.vibrato = 0;
                    this.interval = 0;
                    this.effects = 1;
                    this.chord = 2;
                    this.pulseWidth = Config.pulseWidthRange - 1;
                    this.pulseEnvelope = Config.envelopes.dictionary["twang 2"].index;
                    break;
                default:
                    throw new Error("Unrecognized instrument type: " + type);
            }
        }
        toJsonObject() {
            const instrumentObject = {
                "type": Config.instrumentTypeNames[this.type],
                "volume": (5 - this.volume) * 20,
                "pan": (this.pan - Config.panCenter) * 100 / Config.panCenter,
                "effects": Config.effectsNames[this.effects],
            };
            if (this.preset != this.type) {
                instrumentObject["preset"] = this.preset;
            }
            if (this.type != 4) {
                instrumentObject["transition"] = Config.transitions[this.transition].name;
                instrumentObject["chord"] = this.getChord().name;
                instrumentObject["filterCutoffHz"] = Math.round(Config.filterCutoffMaxHz * Math.pow(2.0, this.getFilterCutoffOctaves()));
                instrumentObject["filterResonance"] = Math.round(100 * this.filterResonance / (Config.filterResonanceRange - 1));
                instrumentObject["filterEnvelope"] = this.getFilterEnvelope().name;
            }
            if (this.type == 2) {
                instrumentObject["wave"] = Config.chipNoises[this.chipNoise].name;
            }
            else if (this.type == 3) {
                instrumentObject["spectrum"] = [];
                for (let i = 0; i < Config.spectrumControlPoints; i++) {
                    instrumentObject["spectrum"][i] = Math.round(100 * this.spectrumWave.spectrum[i] / Config.spectrumMax);
                }
            }
            else if (this.type == 4) {
                instrumentObject["drums"] = [];
                for (let j = 0; j < Config.drumCount; j++) {
                    const spectrum = [];
                    for (let i = 0; i < Config.spectrumControlPoints; i++) {
                        spectrum[i] = Math.round(100 * this.drumsetSpectrumWaves[j].spectrum[i] / Config.spectrumMax);
                    }
                    instrumentObject["drums"][j] = {
                        "filterEnvelope": this.getDrumsetEnvelope(j).name,
                        "spectrum": spectrum,
                    };
                }
            }
            else if (this.type == 0) {
                instrumentObject["wave"] = Config.chipWaves[this.chipWave].name;
                instrumentObject["interval"] = Config.intervals[this.interval].name;
                instrumentObject["vibrato"] = Config.vibratos[this.vibrato].name;
            }
            else if (this.type == 6) {
                instrumentObject["pulseWidth"] = Math.round(Math.pow(0.5, (Config.pulseWidthRange - this.pulseWidth - 1) * 0.5) * 50 * 32) / 32;
                instrumentObject["pulseEnvelope"] = Config.envelopes[this.pulseEnvelope].name;
                instrumentObject["vibrato"] = Config.vibratos[this.vibrato].name;
            }
            else if (this.type == 5) {
                instrumentObject["interval"] = Config.intervals[this.interval].name;
                instrumentObject["vibrato"] = Config.vibratos[this.vibrato].name;
                instrumentObject["harmonics"] = [];
                for (let i = 0; i < Config.harmonicsControlPoints; i++) {
                    instrumentObject["harmonics"][i] = Math.round(100 * this.harmonicsWave.harmonics[i] / Config.harmonicsMax);
                }
            }
            else if (this.type == 1) {
                const operatorArray = [];
                for (const operator of this.operators) {
                    operatorArray.push({
                        "frequency": Config.operatorFrequencies[operator.frequency].name,
                        "amplitude": operator.amplitude,
                        "envelope": Config.envelopes[operator.envelope].name,
                    });
                }
                instrumentObject["vibrato"] = Config.vibratos[this.vibrato].name;
                instrumentObject["algorithm"] = Config.algorithms[this.algorithm].name;
                instrumentObject["feedbackType"] = Config.feedbacks[this.feedbackType].name;
                instrumentObject["feedbackAmplitude"] = this.feedbackAmplitude;
                instrumentObject["feedbackEnvelope"] = Config.envelopes[this.feedbackEnvelope].name;
                instrumentObject["operators"] = operatorArray;
            }
            else {
                throw new Error("Unrecognized instrument type");
            }
            return instrumentObject;
        }
        fromJsonObject(instrumentObject, isNoiseChannel) {
            if (instrumentObject == undefined)
                instrumentObject = {};
            let type = Config.instrumentTypeNames.indexOf(instrumentObject["type"]);
            if (type == -1)
                type = isNoiseChannel ? 2 : 0;
            this.setTypeAndReset(type, isNoiseChannel);
            if (instrumentObject["preset"] != undefined) {
                this.preset = instrumentObject["preset"] >>> 0;
            }
            if (instrumentObject["volume"] != undefined) {
                this.volume = clamp(0, Config.volumeRange, Math.round(5 - (instrumentObject["volume"] | 0) / 20));
            }
            else {
                this.volume = 0;
            }
            if (instrumentObject["pan"] != undefined) {
                this.pan = clamp(0, Config.panMax + 1, Math.round(Config.panCenter + (instrumentObject["pan"] | 0) * Config.panCenter / 100));
            }
            else {
                this.pan = Config.panCenter;
            }
            const oldTransitionNames = { "binary": 0, "sudden": 1, "smooth": 2 };
            const transitionObject = instrumentObject["transition"] || instrumentObject["envelope"];
            this.transition = oldTransitionNames[transitionObject] != undefined ? oldTransitionNames[transitionObject] : Config.transitions.findIndex(transition => transition.name == transitionObject);
            if (this.transition == -1)
                this.transition = 1;
            this.effects = Config.effectsNames.indexOf(instrumentObject["effects"]);
            if (this.effects == -1)
                this.effects = (this.type == 2) ? 0 : 1;
            if (instrumentObject["filterCutoffHz"] != undefined) {
                this.filterCutoff = clamp(0, Config.filterCutoffRange, Math.round((Config.filterCutoffRange - 1) + 2.0 * Math.log((instrumentObject["filterCutoffHz"] | 0) / Config.filterCutoffMaxHz) / Math.LN2));
            }
            else {
                this.filterCutoff = (this.type == 0) ? 6 : 10;
            }
            if (instrumentObject["filterResonance"] != undefined) {
                this.filterResonance = clamp(0, Config.filterResonanceRange, Math.round((Config.filterResonanceRange - 1) * (instrumentObject["filterResonance"] | 0) / 100));
            }
            else {
                this.filterResonance = 0;
            }
            this.filterEnvelope = Config.envelopes.findIndex(envelope => envelope.name == instrumentObject["filterEnvelope"]);
            if (this.filterEnvelope == -1)
                this.filterEnvelope = Config.envelopes.dictionary["steady"].index;
            if (instrumentObject["filter"] != undefined) {
                const legacyToCutoff = [10, 6, 3, 0, 8, 5, 2];
                const legacyToEnvelope = [1, 1, 1, 1, 18, 19, 20];
                const filterNames = ["none", "bright", "medium", "soft", "decay bright", "decay medium", "decay soft"];
                const oldFilterNames = { "sustain sharp": 1, "sustain medium": 2, "sustain soft": 3, "decay sharp": 4 };
                let legacyFilter = oldFilterNames[instrumentObject["filter"]] != undefined ? oldFilterNames[instrumentObject["filter"]] : filterNames.indexOf(instrumentObject["filter"]);
                if (legacyFilter == -1)
                    legacyFilter = 0;
                this.filterCutoff = legacyToCutoff[legacyFilter];
                this.filterEnvelope = legacyToEnvelope[legacyFilter];
                this.filterResonance = 0;
            }
            const legacyEffectNames = ["none", "vibrato light", "vibrato delayed", "vibrato heavy"];
            if (this.type == 2) {
                this.chipNoise = Config.chipNoises.findIndex(wave => wave.name == instrumentObject["wave"]);
                if (this.chipNoise == -1)
                    this.chipNoise = 1;
                this.chord = Config.chords.findIndex(chord => chord.name == instrumentObject["chord"]);
                if (this.chord == -1)
                    this.chord = 2;
            }
            else if (this.type == 3) {
                if (instrumentObject["spectrum"] != undefined) {
                    for (let i = 0; i < Config.spectrumControlPoints; i++) {
                        this.spectrumWave.spectrum[i] = Math.max(0, Math.min(Config.spectrumMax, Math.round(Config.spectrumMax * (+instrumentObject["spectrum"][i]) / 100)));
                    }
                }
                this.chord = Config.chords.findIndex(chord => chord.name == instrumentObject["chord"]);
                if (this.chord == -1)
                    this.chord = 0;
            }
            else if (this.type == 4) {
                if (instrumentObject["drums"] != undefined) {
                    for (let j = 0; j < Config.drumCount; j++) {
                        const drum = instrumentObject["drums"][j];
                        if (drum == undefined)
                            continue;
                        if (drum["filterEnvelope"] != undefined) {
                            this.drumsetEnvelopes[j] = Config.envelopes.findIndex(envelope => envelope.name == drum["filterEnvelope"]);
                            if (this.drumsetEnvelopes[j] == -1)
                                this.drumsetEnvelopes[j] = Config.envelopes.dictionary["twang 2"].index;
                        }
                        if (drum["spectrum"] != undefined) {
                            for (let i = 0; i < Config.spectrumControlPoints; i++) {
                                this.drumsetSpectrumWaves[j].spectrum[i] = Math.max(0, Math.min(Config.spectrumMax, Math.round(Config.spectrumMax * (+drum["spectrum"][i]) / 100)));
                            }
                        }
                    }
                }
            }
            else if (this.type == 5) {
                if (instrumentObject["harmonics"] != undefined) {
                    for (let i = 0; i < Config.harmonicsControlPoints; i++) {
                        this.harmonicsWave.harmonics[i] = Math.max(0, Math.min(Config.harmonicsMax, Math.round(Config.harmonicsMax * (+instrumentObject["harmonics"][i]) / 100)));
                    }
                }
                if (instrumentObject["interval"] != undefined) {
                    this.interval = Config.intervals.findIndex(interval => interval.name == instrumentObject["interval"]);
                    if (this.interval == -1)
                        this.interval = 0;
                }
                if (instrumentObject["vibrato"] != undefined) {
                    this.vibrato = Config.vibratos.findIndex(vibrato => vibrato.name == instrumentObject["vibrato"]);
                    if (this.vibrato == -1)
                        this.vibrato = 0;
                }
                this.chord = Config.chords.findIndex(chord => chord.name == instrumentObject["chord"]);
                if (this.chord == -1)
                    this.chord = 0;
            }
            else if (this.type == 6) {
                if (instrumentObject["pulseWidth"] != undefined) {
                    this.pulseWidth = clamp(0, Config.pulseWidthRange, Math.round((Math.log((+instrumentObject["pulseWidth"]) / 50) / Math.LN2) / 0.5 - 1 + 8));
                }
                else {
                    this.pulseWidth = Config.pulseWidthRange - 1;
                }
                if (instrumentObject["pulseEnvelope"] != undefined) {
                    this.pulseEnvelope = Config.envelopes.findIndex(envelope => envelope.name == instrumentObject["pulseEnvelope"]);
                    if (this.pulseEnvelope == -1)
                        this.pulseEnvelope = Config.envelopes.dictionary["steady"].index;
                }
                if (instrumentObject["vibrato"] != undefined) {
                    this.vibrato = Config.vibratos.findIndex(vibrato => vibrato.name == instrumentObject["vibrato"]);
                    if (this.vibrato == -1)
                        this.vibrato = 0;
                }
                this.chord = Config.chords.findIndex(chord => chord.name == instrumentObject["chord"]);
                if (this.chord == -1)
                    this.chord = 0;
            }
            else if (this.type == 0) {
                const legacyWaveNames = { "triangle": 1, "square": 2, "pulse wide": 3, "pulse narrow": 4, "sawtooth": 5, "double saw": 6, "double pulse": 7, "spiky": 8, "plateau": 0 };
                this.chipWave = legacyWaveNames[instrumentObject["wave"]] != undefined ? legacyWaveNames[instrumentObject["wave"]] : Config.chipWaves.findIndex(wave => wave.name == instrumentObject["wave"]);
                if (this.chipWave == -1)
                    this.chipWave = 1;
                if (instrumentObject["interval"] != undefined) {
                    this.interval = Config.intervals.findIndex(interval => interval.name == instrumentObject["interval"]);
                    if (this.interval == -1)
                        this.interval = 0;
                }
                else if (instrumentObject["chorus"] != undefined) {
                    const legacyChorusNames = { "fifths": 5, "octaves": 6 };
                    this.interval = legacyChorusNames[instrumentObject["chorus"]] != undefined ? legacyChorusNames[instrumentObject["chorus"]] : Config.intervals.findIndex(interval => interval.name == instrumentObject["chorus"]);
                    if (this.interval == -1)
                        this.interval = 0;
                }
                if (instrumentObject["vibrato"] != undefined) {
                    this.vibrato = Config.vibratos.findIndex(vibrato => vibrato.name == instrumentObject["vibrato"]);
                    if (this.vibrato == -1)
                        this.vibrato = 0;
                }
                else if (instrumentObject["effect"] != undefined) {
                    this.vibrato = legacyEffectNames.indexOf(instrumentObject["effect"]);
                    if (this.vibrato == -1)
                        this.vibrato = 0;
                }
                this.chord = Config.chords.findIndex(chord => chord.name == instrumentObject["chord"]);
                if (this.chord == -1)
                    this.chord = 2;
                if (instrumentObject["chorus"] == "custom harmony") {
                    this.interval = 2;
                    this.chord = 3;
                }
            }
            else if (this.type == 1) {
                if (instrumentObject["vibrato"] != undefined) {
                    this.vibrato = Config.vibratos.findIndex(vibrato => vibrato.name == instrumentObject["vibrato"]);
                    if (this.vibrato == -1)
                        this.vibrato = 0;
                }
                else if (instrumentObject["effect"] != undefined) {
                    this.vibrato = legacyEffectNames.indexOf(instrumentObject["effect"]);
                    if (this.vibrato == -1)
                        this.vibrato = 0;
                }
                this.chord = Config.chords.findIndex(chord => chord.name == instrumentObject["chord"]);
                if (this.chord == -1)
                    this.chord = 3;
                this.algorithm = Config.algorithms.findIndex(algorithm => algorithm.name == instrumentObject["algorithm"]);
                if (this.algorithm == -1)
                    this.algorithm = 0;
                this.feedbackType = Config.feedbacks.findIndex(feedback => feedback.name == instrumentObject["feedbackType"]);
                if (this.feedbackType == -1)
                    this.feedbackType = 0;
                if (instrumentObject["feedbackAmplitude"] != undefined) {
                    this.feedbackAmplitude = clamp(0, Config.operatorAmplitudeMax + 1, instrumentObject["feedbackAmplitude"] | 0);
                }
                else {
                    this.feedbackAmplitude = 0;
                }
                const legacyEnvelopeNames = { "pluck 1": 6, "pluck 2": 7, "pluck 3": 8 };
                this.feedbackEnvelope = legacyEnvelopeNames[instrumentObject["feedbackEnvelope"]] != undefined ? legacyEnvelopeNames[instrumentObject["feedbackEnvelope"]] : Config.envelopes.findIndex(envelope => envelope.name == instrumentObject["feedbackEnvelope"]);
                if (this.feedbackEnvelope == -1)
                    this.feedbackEnvelope = 0;
                for (let j = 0; j < Config.operatorCount; j++) {
                    const operator = this.operators[j];
                    let operatorObject = undefined;
                    if (instrumentObject["operators"])
                        operatorObject = instrumentObject["operators"][j];
                    if (operatorObject == undefined)
                        operatorObject = {};
                    operator.frequency = Config.operatorFrequencies.findIndex(freq => freq.name == operatorObject["frequency"]);
                    if (operator.frequency == -1)
                        operator.frequency = 0;
                    if (operatorObject["amplitude"] != undefined) {
                        operator.amplitude = clamp(0, Config.operatorAmplitudeMax + 1, operatorObject["amplitude"] | 0);
                    }
                    else {
                        operator.amplitude = 0;
                    }
                    operator.envelope = legacyEnvelopeNames[operatorObject["envelope"]] != undefined ? legacyEnvelopeNames[operatorObject["envelope"]] : Config.envelopes.findIndex(envelope => envelope.name == operatorObject["envelope"]);
                    if (operator.envelope == -1)
                        operator.envelope = 0;
                }
            }
            else {
                throw new Error("Unrecognized instrument type.");
            }
        }
        static frequencyFromPitch(pitch) {
            return 440.0 * Math.pow(2.0, (pitch - 69.0) / 12.0);
        }
        static drumsetIndexReferenceDelta(index) {
            return Instrument.frequencyFromPitch(Config.spectrumBasePitch + index * 6) / 44100;
        }
        static _drumsetIndexToSpectrumOctave(index) {
            return 15 + Math.log(Instrument.drumsetIndexReferenceDelta(index)) / Math.LN2;
        }
        warmUp() {
            if (this.type == 2) {
                getDrumWave(this.chipNoise, inverseRealFourierTransform, scaleElementsByFactor);
            }
            else if (this.type == 5) {
                this.harmonicsWave.getCustomWave();
            }
            else if (this.type == 3) {
                this.spectrumWave.getCustomWave(8);
            }
            else if (this.type == 4) {
                for (let i = 0; i < Config.drumCount; i++) {
                    this.drumsetSpectrumWaves[i].getCustomWave(Instrument._drumsetIndexToSpectrumOctave(i));
                }
            }
        }
        getDrumWave() {
            if (this.type == 2) {
                return getDrumWave(this.chipNoise, inverseRealFourierTransform, scaleElementsByFactor);
            }
            else if (this.type == 3) {
                return this.spectrumWave.getCustomWave(8);
            }
            else {
                throw new Error("Unhandled instrument type in getDrumWave");
            }
        }
        getDrumsetWave(pitch) {
            if (this.type == 4) {
                return this.drumsetSpectrumWaves[pitch].getCustomWave(Instrument._drumsetIndexToSpectrumOctave(pitch));
            }
            else {
                throw new Error("Unhandled instrument type in getDrumWave");
            }
        }
        getTransition() {
            return this.type == 4 ? Config.transitions.dictionary["hard fade"] : Config.transitions[this.transition];
        }
        getChord() {
            return this.type == 4 ? Config.chords.dictionary["harmony"] : Config.chords[this.chord];
        }
        getFilterCutoffOctaves() {
            return this.type == 4 ? 0 : (this.filterCutoff - (Config.filterCutoffRange - 1)) * 0.5;
        }
        getFilterIsFirstOrder() {
            return this.type == 4 ? false : this.filterResonance == 0;
        }
        getFilterResonance() {
            return this.type == 4 ? 1 : this.filterResonance;
        }
        getFilterEnvelope() {
            if (this.type == 4)
                throw new Error("Can't getFilterEnvelope() for drumset.");
            return Config.envelopes[this.filterEnvelope];
        }
        getDrumsetEnvelope(pitch) {
            if (this.type != 4)
                throw new Error("Can't getDrumsetEnvelope() for non-drumset.");
            return Config.envelopes[this.drumsetEnvelopes[pitch]];
        }
    }
    class Channel {
        constructor() {
            this.octave = 0;
            this.instruments = [];
            this.patterns = [];
            this.bars = [];
            this.muted = false;
        }
    }
    class Song {
        constructor(string) {
            this.channels = [];
            if (string != undefined) {
                this.fromBase64String(string);
            }
            else {
                this.initToDefault(true);
            }
        }
        getChannelCount() {
            return this.pitchChannelCount + this.noiseChannelCount;
        }
        getChannelIsNoise(channel) {
            return (channel >= this.pitchChannelCount);
        }
        initToDefault(andResetChannels = true) {
            this.scale = 0;
            this.key = 0;
            this.loopStart = 0;
            this.loopLength = 4;
            this.tempo = 150;
            this.reverb = 0;
            this.beatsPerBar = 8;
            this.barCount = 16;
            this.patternsPerChannel = 8;
            this.rhythm = 1;
            this.instrumentsPerChannel = 1;
            if (andResetChannels) {
                this.pitchChannelCount = 3;
                this.noiseChannelCount = 1;
                for (let channelIndex = 0; channelIndex < this.getChannelCount(); channelIndex++) {
                    if (this.channels.length <= channelIndex) {
                        this.channels[channelIndex] = new Channel();
                    }
                    const channel = this.channels[channelIndex];
                    channel.octave = 3 - channelIndex;
                    for (let pattern = 0; pattern < this.patternsPerChannel; pattern++) {
                        if (channel.patterns.length <= pattern) {
                            channel.patterns[pattern] = new Pattern();
                        }
                        else {
                            channel.patterns[pattern].reset();
                        }
                    }
                    channel.patterns.length = this.patternsPerChannel;
                    const isNoiseChannel = channelIndex >= this.pitchChannelCount;
                    for (let instrument = 0; instrument < this.instrumentsPerChannel; instrument++) {
                        if (channel.instruments.length <= instrument) {
                            channel.instruments[instrument] = new Instrument(isNoiseChannel);
                        }
                        channel.instruments[instrument].setTypeAndReset(isNoiseChannel ? 2 : 0, isNoiseChannel);
                    }
                    channel.instruments.length = this.instrumentsPerChannel;
                    for (let bar = 0; bar < this.barCount; bar++) {
                        channel.bars[bar] = bar < 4 ? 1 : 0;
                    }
                    channel.bars.length = this.barCount;
                }
                this.channels.length = this.getChannelCount();
            }
        }
        toBase64String() {
            let bits;
            let buffer = [];
            buffer.push(base64IntToCharCode[Song._latestVersion]);
            buffer.push(110, base64IntToCharCode[this.pitchChannelCount], base64IntToCharCode[this.noiseChannelCount]);
            buffer.push(115, base64IntToCharCode[this.scale]);
            buffer.push(107, base64IntToCharCode[this.key]);
            buffer.push(108, base64IntToCharCode[this.loopStart >> 6], base64IntToCharCode[this.loopStart & 0x3f]);
            buffer.push(101, base64IntToCharCode[(this.loopLength - 1) >> 6], base64IntToCharCode[(this.loopLength - 1) & 0x3f]);
            buffer.push(116, base64IntToCharCode[this.tempo >> 6], base64IntToCharCode[this.tempo & 63]);
            buffer.push(109, base64IntToCharCode[this.reverb]);
            buffer.push(97, base64IntToCharCode[this.beatsPerBar - 1]);
            buffer.push(103, base64IntToCharCode[(this.barCount - 1) >> 6], base64IntToCharCode[(this.barCount - 1) & 0x3f]);
            buffer.push(106, base64IntToCharCode[(this.patternsPerChannel - 1) >> 6], base64IntToCharCode[(this.patternsPerChannel - 1) & 0x3f]);
            buffer.push(105, base64IntToCharCode[this.instrumentsPerChannel - 1]);
            buffer.push(114, base64IntToCharCode[this.rhythm]);
            buffer.push(111);
            for (let channel = 0; channel < this.getChannelCount(); channel++) {
                buffer.push(base64IntToCharCode[this.channels[channel].octave]);
            }
            for (let channel = 0; channel < this.getChannelCount(); channel++) {
                for (let i = 0; i < this.instrumentsPerChannel; i++) {
                    const instrument = this.channels[channel].instruments[i];
                    buffer.push(84, base64IntToCharCode[instrument.type]);
                    buffer.push(118, base64IntToCharCode[instrument.volume]);
                    buffer.push(76, base64IntToCharCode[instrument.pan]);
                    buffer.push(117, base64IntToCharCode[instrument.preset >> 6], base64IntToCharCode[instrument.preset & 63]);
                    buffer.push(113, base64IntToCharCode[instrument.effects]);
                    if (instrument.type != 4) {
                        buffer.push(100, base64IntToCharCode[instrument.transition]);
                        buffer.push(102, base64IntToCharCode[instrument.filterCutoff]);
                        buffer.push(121, base64IntToCharCode[instrument.filterResonance]);
                        buffer.push(122, base64IntToCharCode[instrument.filterEnvelope]);
                        buffer.push(67, base64IntToCharCode[instrument.chord]);
                    }
                    if (instrument.type == 0) {
                        buffer.push(119, base64IntToCharCode[instrument.chipWave]);
                        buffer.push(99, base64IntToCharCode[instrument.vibrato]);
                        buffer.push(104, base64IntToCharCode[instrument.interval]);
                    }
                    else if (instrument.type == 1) {
                        buffer.push(99, base64IntToCharCode[instrument.vibrato]);
                        buffer.push(65, base64IntToCharCode[instrument.algorithm]);
                        buffer.push(70, base64IntToCharCode[instrument.feedbackType]);
                        buffer.push(66, base64IntToCharCode[instrument.feedbackAmplitude]);
                        buffer.push(86, base64IntToCharCode[instrument.feedbackEnvelope]);
                        buffer.push(81);
                        for (let o = 0; o < Config.operatorCount; o++) {
                            buffer.push(base64IntToCharCode[instrument.operators[o].frequency]);
                        }
                        buffer.push(80);
                        for (let o = 0; o < Config.operatorCount; o++) {
                            buffer.push(base64IntToCharCode[instrument.operators[o].amplitude]);
                        }
                        buffer.push(69);
                        for (let o = 0; o < Config.operatorCount; o++) {
                            buffer.push(base64IntToCharCode[instrument.operators[o].envelope]);
                        }
                    }
                    else if (instrument.type == 2) {
                        buffer.push(119, base64IntToCharCode[instrument.chipNoise]);
                    }
                    else if (instrument.type == 3) {
                        buffer.push(83);
                        const spectrumBits = new BitFieldWriter();
                        for (let i = 0; i < Config.spectrumControlPoints; i++) {
                            spectrumBits.write(Config.spectrumControlPointBits, instrument.spectrumWave.spectrum[i]);
                        }
                        spectrumBits.encodeBase64(buffer);
                    }
                    else if (instrument.type == 4) {
                        buffer.push(122);
                        for (let j = 0; j < Config.drumCount; j++) {
                            buffer.push(base64IntToCharCode[instrument.drumsetEnvelopes[j]]);
                        }
                        buffer.push(83);
                        const spectrumBits = new BitFieldWriter();
                        for (let j = 0; j < Config.drumCount; j++) {
                            for (let i = 0; i < Config.spectrumControlPoints; i++) {
                                spectrumBits.write(Config.spectrumControlPointBits, instrument.drumsetSpectrumWaves[j].spectrum[i]);
                            }
                        }
                        spectrumBits.encodeBase64(buffer);
                    }
                    else if (instrument.type == 5) {
                        buffer.push(99, base64IntToCharCode[instrument.vibrato]);
                        buffer.push(104, base64IntToCharCode[instrument.interval]);
                        buffer.push(72);
                        const harmonicsBits = new BitFieldWriter();
                        for (let i = 0; i < Config.harmonicsControlPoints; i++) {
                            harmonicsBits.write(Config.harmonicsControlPointBits, instrument.harmonicsWave.harmonics[i]);
                        }
                        harmonicsBits.encodeBase64(buffer);
                    }
                    else if (instrument.type == 6) {
                        buffer.push(99, base64IntToCharCode[instrument.vibrato]);
                        buffer.push(87, base64IntToCharCode[instrument.pulseWidth], base64IntToCharCode[instrument.pulseEnvelope]);
                    }
                    else {
                        throw new Error("Unknown instrument type.");
                    }
                }
            }
            buffer.push(98);
            bits = new BitFieldWriter();
            let neededBits = 0;
            while ((1 << neededBits) < this.patternsPerChannel + 1)
                neededBits++;
            for (let channel = 0; channel < this.getChannelCount(); channel++)
                for (let i = 0; i < this.barCount; i++) {
                    bits.write(neededBits, this.channels[channel].bars[i]);
                }
            bits.encodeBase64(buffer);
            buffer.push(112);
            bits = new BitFieldWriter();
            const shapeBits = new BitFieldWriter();
            let neededInstrumentBits = 0;
            while ((1 << neededInstrumentBits) < this.instrumentsPerChannel)
                neededInstrumentBits++;
            for (let channel = 0; channel < this.getChannelCount(); channel++) {
                const isNoiseChannel = this.getChannelIsNoise(channel);
                const octaveOffset = isNoiseChannel ? 0 : this.channels[channel].octave * 12;
                let lastPitch = (isNoiseChannel ? 4 : 12) + octaveOffset;
                const recentPitches = isNoiseChannel ? [4, 6, 7, 2, 3, 8, 0, 10] : [12, 19, 24, 31, 36, 7, 0];
                const recentShapes = [];
                for (let i = 0; i < recentPitches.length; i++) {
                    recentPitches[i] += octaveOffset;
                }
                for (const pattern of this.channels[channel].patterns) {
                    bits.write(neededInstrumentBits, pattern.instrument);
                    if (pattern.notes.length > 0) {
                        bits.write(1, 1);
                        let curPart = 0;
                        for (const note of pattern.notes) {
                            if (note.start > curPart) {
                                bits.write(2, 0);
                                bits.writePartDuration(note.start - curPart);
                            }
                            shapeBits.clear();
                            for (let i = 1; i < note.pitches.length; i++)
                                shapeBits.write(1, 1);
                            if (note.pitches.length < Config.maxChordSize)
                                shapeBits.write(1, 0);
                            shapeBits.writePinCount(note.pins.length - 1);
                            shapeBits.write(2, note.pins[0].volume);
                            let shapePart = 0;
                            let startPitch = note.pitches[0];
                            let currentPitch = startPitch;
                            const pitchBends = [];
                            for (let i = 1; i < note.pins.length; i++) {
                                const pin = note.pins[i];
                                const nextPitch = startPitch + pin.interval;
                                if (currentPitch != nextPitch) {
                                    shapeBits.write(1, 1);
                                    pitchBends.push(nextPitch);
                                    currentPitch = nextPitch;
                                }
                                else {
                                    shapeBits.write(1, 0);
                                }
                                shapeBits.writePartDuration(pin.time - shapePart);
                                shapePart = pin.time;
                                shapeBits.write(2, pin.volume);
                            }
                            const shapeString = String.fromCharCode.apply(null, shapeBits.encodeBase64([]));
                            const shapeIndex = recentShapes.indexOf(shapeString);
                            if (shapeIndex == -1) {
                                bits.write(2, 1);
                                bits.concat(shapeBits);
                            }
                            else {
                                bits.write(1, 1);
                                bits.writeLongTail(0, 0, shapeIndex);
                                recentShapes.splice(shapeIndex, 1);
                            }
                            recentShapes.unshift(shapeString);
                            if (recentShapes.length > 10)
                                recentShapes.pop();
                            const allPitches = note.pitches.concat(pitchBends);
                            for (let i = 0; i < allPitches.length; i++) {
                                const pitch = allPitches[i];
                                const pitchIndex = recentPitches.indexOf(pitch);
                                if (pitchIndex == -1) {
                                    let interval = 0;
                                    let pitchIter = lastPitch;
                                    if (pitchIter < pitch) {
                                        while (pitchIter != pitch) {
                                            pitchIter++;
                                            if (recentPitches.indexOf(pitchIter) == -1)
                                                interval++;
                                        }
                                    }
                                    else {
                                        while (pitchIter != pitch) {
                                            pitchIter--;
                                            if (recentPitches.indexOf(pitchIter) == -1)
                                                interval--;
                                        }
                                    }
                                    bits.write(1, 0);
                                    bits.writePitchInterval(interval);
                                }
                                else {
                                    bits.write(1, 1);
                                    bits.write(3, pitchIndex);
                                    recentPitches.splice(pitchIndex, 1);
                                }
                                recentPitches.unshift(pitch);
                                if (recentPitches.length > 8)
                                    recentPitches.pop();
                                if (i == note.pitches.length - 1) {
                                    lastPitch = note.pitches[0];
                                }
                                else {
                                    lastPitch = pitch;
                                }
                            }
                            curPart = note.end;
                        }
                        if (curPart < this.beatsPerBar * Config.partsPerBeat) {
                            bits.write(2, 0);
                            bits.writePartDuration(this.beatsPerBar * Config.partsPerBeat - curPart);
                        }
                    }
                    else {
                        bits.write(1, 0);
                    }
                }
            }
            let stringLength = bits.lengthBase64();
            let digits = [];
            while (stringLength > 0) {
                digits.unshift(base64IntToCharCode[stringLength & 0x3f]);
                stringLength = stringLength >> 6;
            }
            buffer.push(base64IntToCharCode[digits.length]);
            Array.prototype.push.apply(buffer, digits);
            bits.encodeBase64(buffer);
            const maxApplyArgs = 64000;
            if (buffer.length < maxApplyArgs) {
                return String.fromCharCode.apply(null, buffer);
            }
            else {
                let result = "";
                for (let i = 0; i < buffer.length; i += maxApplyArgs) {
                    result += String.fromCharCode.apply(null, buffer.slice(i, i + maxApplyArgs));
                }
                return result;
            }
        }
        fromBase64String(compressed) {
            if (compressed == null || compressed == "") {
                this.initToDefault(true);
                return;
            }
            let charIndex = 0;
            while (compressed.charCodeAt(charIndex) <= 32)
                charIndex++;
            if (compressed.charCodeAt(charIndex) == 35)
                charIndex++;
            if (compressed.charCodeAt(charIndex) == 123) {
                this.fromJsonObject(JSON.parse(charIndex == 0 ? compressed : compressed.substring(charIndex)));
                return;
            }
            const version = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
            if (version == -1 || version > Song._latestVersion || version < Song._oldestVersion)
                return;
            const beforeThree = version < 3;
            const beforeFour = version < 4;
            const beforeFive = version < 5;
            const beforeSix = version < 6;
            const beforeSeven = version < 7;
            const beforeEight = version < 8;
            this.initToDefault(beforeSix);
            if (beforeThree) {
                for (const channel of this.channels)
                    channel.instruments[0].transition = 0;
                this.channels[3].instruments[0].chipNoise = 0;
            }
            let instrumentChannelIterator = 0;
            let instrumentIndexIterator = -1;
            let command;
            while (charIndex < compressed.length)
                switch (command = compressed.charCodeAt(charIndex++)) {
                    case 110:
                        {
                            this.pitchChannelCount = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                            this.noiseChannelCount = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                            this.pitchChannelCount = validateRange(Config.pitchChannelCountMin, Config.pitchChannelCountMax, this.pitchChannelCount);
                            this.noiseChannelCount = validateRange(Config.noiseChannelCountMin, Config.noiseChannelCountMax, this.noiseChannelCount);
                            for (let channelIndex = this.channels.length; channelIndex < this.getChannelCount(); channelIndex++) {
                                this.channels[channelIndex] = new Channel();
                            }
                            this.channels.length = this.getChannelCount();
                        }
                        break;
                    case 115:
                        {
                            this.scale = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                            if (beforeThree && this.scale == 10)
                                this.scale = 11;
                        }
                        break;
                    case 107:
                        {
                            if (beforeSeven) {
                                this.key = clamp(0, Config.keys.length, 11 - base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                            }
                            else {
                                this.key = clamp(0, Config.keys.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                            }
                        }
                        break;
                    case 108:
                        {
                            if (beforeFive) {
                                this.loopStart = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                            }
                            else {
                                this.loopStart = (base64CharCodeToInt[compressed.charCodeAt(charIndex++)] << 6) + base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                            }
                        }
                        break;
                    case 101:
                        {
                            if (beforeFive) {
                                this.loopLength = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                            }
                            else {
                                this.loopLength = (base64CharCodeToInt[compressed.charCodeAt(charIndex++)] << 6) + base64CharCodeToInt[compressed.charCodeAt(charIndex++)] + 1;
                            }
                        }
                        break;
                    case 116:
                        {
                            if (beforeFour) {
                                this.tempo = [95, 120, 151, 190][base64CharCodeToInt[compressed.charCodeAt(charIndex++)]];
                            }
                            else if (beforeSeven) {
                                this.tempo = [88, 95, 103, 111, 120, 130, 140, 151, 163, 176, 190, 206, 222, 240, 259][base64CharCodeToInt[compressed.charCodeAt(charIndex++)]];
                            }
                            else {
                                this.tempo = (base64CharCodeToInt[compressed.charCodeAt(charIndex++)] << 6) | (base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                            }
                            this.tempo = clamp(Config.tempoMin, Config.tempoMax + 1, this.tempo);
                        }
                        break;
                    case 109:
                        {
                            this.reverb = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                            this.reverb = clamp(0, Config.reverbRange, this.reverb);
                        }
                        break;
                    case 97:
                        {
                            if (beforeThree) {
                                this.beatsPerBar = [6, 7, 8, 9, 10][base64CharCodeToInt[compressed.charCodeAt(charIndex++)]];
                            }
                            else {
                                this.beatsPerBar = base64CharCodeToInt[compressed.charCodeAt(charIndex++)] + 1;
                            }
                            this.beatsPerBar = Math.max(Config.beatsPerBarMin, Math.min(Config.beatsPerBarMax, this.beatsPerBar));
                        }
                        break;
                    case 103:
                        {
                            const barCount = (base64CharCodeToInt[compressed.charCodeAt(charIndex++)] << 6) + base64CharCodeToInt[compressed.charCodeAt(charIndex++)] + 1;
                            this.barCount = validateRange(Config.barCountMin, Config.barCountMax, barCount);
                            for (let channel = 0; channel < this.getChannelCount(); channel++) {
                                for (let bar = this.channels[channel].bars.length; bar < this.barCount; bar++) {
                                    this.channels[channel].bars[bar] = 1;
                                }
                                this.channels[channel].bars.length = this.barCount;
                            }
                        }
                        break;
                    case 106:
                        {
                            let patternsPerChannel;
                            if (beforeEight) {
                                patternsPerChannel = base64CharCodeToInt[compressed.charCodeAt(charIndex++)] + 1;
                            }
                            else {
                                patternsPerChannel = (base64CharCodeToInt[compressed.charCodeAt(charIndex++)] << 6) + base64CharCodeToInt[compressed.charCodeAt(charIndex++)] + 1;
                            }
                            this.patternsPerChannel = validateRange(1, Config.barCountMax, patternsPerChannel);
                            for (let channel = 0; channel < this.getChannelCount(); channel++) {
                                for (let pattern = this.channels[channel].patterns.length; pattern < this.patternsPerChannel; pattern++) {
                                    this.channels[channel].patterns[pattern] = new Pattern();
                                }
                                this.channels[channel].patterns.length = this.patternsPerChannel;
                            }
                        }
                        break;
                    case 105:
                        {
                            const instrumentsPerChannel = base64CharCodeToInt[compressed.charCodeAt(charIndex++)] + 1;
                            this.instrumentsPerChannel = validateRange(Config.instrumentsPerChannelMin, Config.instrumentsPerChannelMax, instrumentsPerChannel);
                            for (let channel = 0; channel < this.getChannelCount(); channel++) {
                                const isNoiseChannel = channel >= this.pitchChannelCount;
                                for (let instrumentIndex = this.channels[channel].instruments.length; instrumentIndex < this.instrumentsPerChannel; instrumentIndex++) {
                                    this.channels[channel].instruments[instrumentIndex] = new Instrument(isNoiseChannel);
                                }
                                this.channels[channel].instruments.length = this.instrumentsPerChannel;
                                if (beforeSix) {
                                    for (let instrumentIndex = 0; instrumentIndex < this.instrumentsPerChannel; instrumentIndex++) {
                                        this.channels[channel].instruments[instrumentIndex].setTypeAndReset(isNoiseChannel ? 2 : 0, isNoiseChannel);
                                    }
                                }
                            }
                        }
                        break;
                    case 114:
                        {
                            this.rhythm = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                        }
                        break;
                    case 111:
                        {
                            if (beforeThree) {
                                const channel = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                                this.channels[channel].octave = clamp(0, Config.scrollableOctaves + 1, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                            }
                            else {
                                for (let channel = 0; channel < this.getChannelCount(); channel++) {
                                    this.channels[channel].octave = clamp(0, Config.scrollableOctaves + 1, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                                }
                            }
                        }
                        break;
                    case 84:
                        {
                            instrumentIndexIterator++;
                            if (instrumentIndexIterator >= this.instrumentsPerChannel) {
                                instrumentChannelIterator++;
                                instrumentIndexIterator = 0;
                            }
                            validateRange(0, this.channels.length - 1, instrumentChannelIterator);
                            const instrument = this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator];
                            const instrumentType = validateRange(0, 7 - 1, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                            instrument.setTypeAndReset(instrumentType, instrumentChannelIterator >= this.pitchChannelCount);
                        }
                        break;
                    case 117:
                        {
                            const presetValue = (base64CharCodeToInt[compressed.charCodeAt(charIndex++)] << 6) | (base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                            this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].preset = presetValue;
                        }
                        break;
                    case 119:
                        {
                            if (beforeThree) {
                                const legacyWaves = [1, 2, 3, 4, 5, 6, 7, 8, 0];
                                const channel = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                                this.channels[channel].instruments[0].chipWave = clamp(0, Config.chipWaves.length, legacyWaves[base64CharCodeToInt[compressed.charCodeAt(charIndex++)]] | 0);
                            }
                            else if (beforeSix) {
                                const legacyWaves = [1, 2, 3, 4, 5, 6, 7, 8, 0];
                                for (let channel = 0; channel < this.getChannelCount(); channel++) {
                                    for (let i = 0; i < this.instrumentsPerChannel; i++) {
                                        if (channel >= this.pitchChannelCount) {
                                            this.channels[channel].instruments[i].chipNoise = clamp(0, Config.chipNoises.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                                        }
                                        else {
                                            this.channels[channel].instruments[i].chipWave = clamp(0, Config.chipWaves.length, legacyWaves[base64CharCodeToInt[compressed.charCodeAt(charIndex++)]] | 0);
                                        }
                                    }
                                }
                            }
                            else if (beforeSeven) {
                                const legacyWaves = [1, 2, 3, 4, 5, 6, 7, 8, 0];
                                if (instrumentChannelIterator >= this.pitchChannelCount) {
                                    this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].chipNoise = clamp(0, Config.chipNoises.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                                }
                                else {
                                    this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].chipWave = clamp(0, Config.chipWaves.length, legacyWaves[base64CharCodeToInt[compressed.charCodeAt(charIndex++)]] | 0);
                                }
                            }
                            else {
                                if (instrumentChannelIterator >= this.pitchChannelCount) {
                                    this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].chipNoise = clamp(0, Config.chipNoises.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                                }
                                else {
                                    this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].chipWave = clamp(0, Config.chipWaves.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                                }
                            }
                        }
                        break;
                    case 102:
                        {
                            if (beforeSeven) {
                                const legacyToCutoff = [10, 6, 3, 0, 8, 5, 2];
                                const legacyToEnvelope = [1, 1, 1, 1, 18, 19, 20];
                                const filterNames = ["none", "bright", "medium", "soft", "decay bright", "decay medium", "decay soft"];
                                if (beforeThree) {
                                    const channel = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                                    const instrument = this.channels[channel].instruments[0];
                                    const legacyFilter = [1, 3, 4, 5][clamp(0, filterNames.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)])];
                                    instrument.filterCutoff = legacyToCutoff[legacyFilter];
                                    instrument.filterEnvelope = legacyToEnvelope[legacyFilter];
                                    instrument.filterResonance = 0;
                                }
                                else if (beforeSix) {
                                    for (let channel = 0; channel < this.getChannelCount(); channel++) {
                                        for (let i = 0; i < this.instrumentsPerChannel; i++) {
                                            const instrument = this.channels[channel].instruments[i];
                                            const legacyFilter = clamp(0, filterNames.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)] + 1);
                                            if (channel < this.pitchChannelCount) {
                                                instrument.filterCutoff = legacyToCutoff[legacyFilter];
                                                instrument.filterEnvelope = legacyToEnvelope[legacyFilter];
                                                instrument.filterResonance = 0;
                                            }
                                            else {
                                                instrument.filterCutoff = 10;
                                                instrument.filterEnvelope = 1;
                                                instrument.filterResonance = 0;
                                            }
                                        }
                                    }
                                }
                                else {
                                    const legacyFilter = clamp(0, filterNames.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                                    const instrument = this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator];
                                    instrument.filterCutoff = legacyToCutoff[legacyFilter];
                                    instrument.filterEnvelope = legacyToEnvelope[legacyFilter];
                                    instrument.filterResonance = 0;
                                }
                            }
                            else {
                                const instrument = this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator];
                                instrument.filterCutoff = clamp(0, Config.filterCutoffRange, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                            }
                        }
                        break;
                    case 121:
                        {
                            this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].filterResonance = clamp(0, Config.filterResonanceRange, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                        }
                        break;
                    case 122:
                        {
                            const instrument = this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator];
                            if (instrument.type == 4) {
                                for (let i = 0; i < Config.drumCount; i++) {
                                    instrument.drumsetEnvelopes[i] = clamp(0, Config.envelopes.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                                }
                            }
                            else {
                                instrument.filterEnvelope = clamp(0, Config.envelopes.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                            }
                        }
                        break;
                    case 87:
                        {
                            const instrument = this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator];
                            instrument.pulseWidth = clamp(0, Config.pulseWidthRange, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                            instrument.pulseEnvelope = clamp(0, Config.envelopes.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                        }
                        break;
                    case 100:
                        {
                            if (beforeThree) {
                                const channel = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                                this.channels[channel].instruments[0].transition = clamp(0, Config.transitions.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                            }
                            else if (beforeSix) {
                                for (let channel = 0; channel < this.getChannelCount(); channel++) {
                                    for (let i = 0; i < this.instrumentsPerChannel; i++) {
                                        this.channels[channel].instruments[i].transition = clamp(0, Config.transitions.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                                    }
                                }
                            }
                            else {
                                this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].transition = clamp(0, Config.transitions.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                            }
                        }
                        break;
                    case 99:
                        {
                            if (beforeThree) {
                                const legacyEffects = [0, 3, 2, 0];
                                const legacyEnvelopes = [1, 1, 1, 13];
                                const channel = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                                const effect = clamp(0, legacyEffects.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                                const instrument = this.channels[channel].instruments[0];
                                instrument.vibrato = legacyEffects[effect];
                                instrument.filterEnvelope = (instrument.filterEnvelope == 1)
                                    ? legacyEnvelopes[effect]
                                    : instrument.filterEnvelope;
                            }
                            else if (beforeSix) {
                                const legacyEffects = [0, 1, 2, 3, 0, 0];
                                const legacyEnvelopes = [1, 1, 1, 1, 16, 13];
                                for (let channel = 0; channel < this.getChannelCount(); channel++) {
                                    for (let i = 0; i < this.instrumentsPerChannel; i++) {
                                        const effect = clamp(0, legacyEffects.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                                        const instrument = this.channels[channel].instruments[i];
                                        instrument.vibrato = legacyEffects[effect];
                                        instrument.filterEnvelope = (instrument.filterEnvelope == 1)
                                            ? legacyEnvelopes[effect]
                                            : instrument.filterEnvelope;
                                    }
                                }
                            }
                            else if (beforeSeven) {
                                const legacyEffects = [0, 1, 2, 3, 0, 0];
                                const legacyEnvelopes = [1, 1, 1, 1, 16, 13];
                                const effect = clamp(0, legacyEffects.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                                const instrument = this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator];
                                instrument.vibrato = legacyEffects[effect];
                                instrument.filterEnvelope = (instrument.filterEnvelope == 1)
                                    ? legacyEnvelopes[effect]
                                    : instrument.filterEnvelope;
                            }
                            else {
                                const vibrato = clamp(0, Config.vibratos.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                                this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].vibrato = vibrato;
                            }
                        }
                        break;
                    case 104:
                        {
                            if (beforeThree) {
                                const channel = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                                this.channels[channel].instruments[0].interval = clamp(0, Config.intervals.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                            }
                            else if (beforeSix) {
                                for (let channel = 0; channel < this.getChannelCount(); channel++) {
                                    for (let i = 0; i < this.instrumentsPerChannel; i++) {
                                        const originalValue = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                                        let interval = clamp(0, Config.intervals.length, originalValue);
                                        if (originalValue == 8) {
                                            interval = 2;
                                            this.channels[channel].instruments[i].chord = 3;
                                        }
                                        this.channels[channel].instruments[i].interval = interval;
                                    }
                                }
                            }
                            else if (beforeSeven) {
                                const originalValue = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                                let interval = clamp(0, Config.intervals.length, originalValue);
                                if (originalValue == 8) {
                                    interval = 2;
                                    this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].chord = 3;
                                }
                                this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].interval = interval;
                            }
                            else {
                                this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].interval = clamp(0, Config.intervals.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                            }
                        }
                        break;
                    case 67:
                        {
                            this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].chord = clamp(0, Config.chords.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                        }
                        break;
                    case 113:
                        {
                            this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].effects = clamp(0, Config.effectsNames.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                        }
                        break;
                    case 118:
                        {
                            if (beforeThree) {
                                const channel = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                                const instrument = this.channels[channel].instruments[0];
                                instrument.volume = clamp(0, Config.volumeRange, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                                if (instrument.volume == 5)
                                    instrument.volume = Config.volumeRange - 1;
                            }
                            else if (beforeSix) {
                                for (let channel = 0; channel < this.getChannelCount(); channel++) {
                                    for (let i = 0; i < this.instrumentsPerChannel; i++) {
                                        const instrument = this.channels[channel].instruments[i];
                                        instrument.volume = clamp(0, Config.volumeRange, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                                        if (instrument.volume == 5)
                                            instrument.volume = Config.volumeRange - 1;
                                    }
                                }
                            }
                            else if (beforeSeven) {
                                const instrument = this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator];
                                instrument.volume = clamp(0, Config.volumeRange, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                                if (instrument.volume == 5)
                                    instrument.volume = Config.volumeRange - 1;
                            }
                            else {
                                const instrument = this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator];
                                instrument.volume = clamp(0, Config.volumeRange, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                            }
                        }
                        break;
                    case 76:
                        {
                            const instrument = this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator];
                            instrument.pan = clamp(0, Config.panMax + 1, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                        }
                        break;
                    case 65:
                        {
                            this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].algorithm = clamp(0, Config.algorithms.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                        }
                        break;
                    case 70:
                        {
                            this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].feedbackType = clamp(0, Config.feedbacks.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                        }
                        break;
                    case 66:
                        {
                            this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].feedbackAmplitude = clamp(0, Config.operatorAmplitudeMax + 1, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                        }
                        break;
                    case 86:
                        {
                            this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].feedbackEnvelope = clamp(0, Config.envelopes.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                        }
                        break;
                    case 81:
                        {
                            for (let o = 0; o < Config.operatorCount; o++) {
                                this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].operators[o].frequency = clamp(0, Config.operatorFrequencies.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                            }
                        }
                        break;
                    case 80:
                        {
                            for (let o = 0; o < Config.operatorCount; o++) {
                                this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].operators[o].amplitude = clamp(0, Config.operatorAmplitudeMax + 1, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                            }
                        }
                        break;
                    case 69:
                        {
                            for (let o = 0; o < Config.operatorCount; o++) {
                                this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].operators[o].envelope = clamp(0, Config.envelopes.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                            }
                        }
                        break;
                    case 83:
                        {
                            const instrument = this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator];
                            if (instrument.type == 3) {
                                const byteCount = Math.ceil(Config.spectrumControlPoints * Config.spectrumControlPointBits / 6);
                                const bits = new BitFieldReader(compressed, charIndex, charIndex + byteCount);
                                for (let i = 0; i < Config.spectrumControlPoints; i++) {
                                    instrument.spectrumWave.spectrum[i] = bits.read(Config.spectrumControlPointBits);
                                }
                                instrument.spectrumWave.markCustomWaveDirty();
                                charIndex += byteCount;
                            }
                            else if (instrument.type == 4) {
                                const byteCount = Math.ceil(Config.drumCount * Config.spectrumControlPoints * Config.spectrumControlPointBits / 6);
                                const bits = new BitFieldReader(compressed, charIndex, charIndex + byteCount);
                                for (let j = 0; j < Config.drumCount; j++) {
                                    for (let i = 0; i < Config.spectrumControlPoints; i++) {
                                        instrument.drumsetSpectrumWaves[j].spectrum[i] = bits.read(Config.spectrumControlPointBits);
                                    }
                                    instrument.drumsetSpectrumWaves[j].markCustomWaveDirty();
                                }
                                charIndex += byteCount;
                            }
                            else {
                                throw new Error("Unhandled instrument type for spectrum song tag code.");
                            }
                        }
                        break;
                    case 72:
                        {
                            const instrument = this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator];
                            const byteCount = Math.ceil(Config.harmonicsControlPoints * Config.harmonicsControlPointBits / 6);
                            const bits = new BitFieldReader(compressed, charIndex, charIndex + byteCount);
                            for (let i = 0; i < Config.harmonicsControlPoints; i++) {
                                instrument.harmonicsWave.harmonics[i] = bits.read(Config.harmonicsControlPointBits);
                            }
                            instrument.harmonicsWave.markCustomWaveDirty();
                            charIndex += byteCount;
                        }
                        break;
                    case 98:
                        {
                            let subStringLength;
                            if (beforeThree) {
                                const channel = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                                const barCount = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                                subStringLength = Math.ceil(barCount * 0.5);
                                const bits = new BitFieldReader(compressed, charIndex, charIndex + subStringLength);
                                for (let i = 0; i < barCount; i++) {
                                    this.channels[channel].bars[i] = bits.read(3) + 1;
                                }
                            }
                            else if (beforeFive) {
                                let neededBits = 0;
                                while ((1 << neededBits) < this.patternsPerChannel)
                                    neededBits++;
                                subStringLength = Math.ceil(this.getChannelCount() * this.barCount * neededBits / 6);
                                const bits = new BitFieldReader(compressed, charIndex, charIndex + subStringLength);
                                for (let channel = 0; channel < this.getChannelCount(); channel++) {
                                    for (let i = 0; i < this.barCount; i++) {
                                        this.channels[channel].bars[i] = bits.read(neededBits) + 1;
                                    }
                                }
                            }
                            else {
                                let neededBits = 0;
                                while ((1 << neededBits) < this.patternsPerChannel + 1)
                                    neededBits++;
                                subStringLength = Math.ceil(this.getChannelCount() * this.barCount * neededBits / 6);
                                const bits = new BitFieldReader(compressed, charIndex, charIndex + subStringLength);
                                for (let channel = 0; channel < this.getChannelCount(); channel++) {
                                    for (let i = 0; i < this.barCount; i++) {
                                        this.channels[channel].bars[i] = bits.read(neededBits);
                                    }
                                }
                            }
                            charIndex += subStringLength;
                        }
                        break;
                    case 112:
                        {
                            let bitStringLength = 0;
                            let channel;
                            if (beforeThree) {
                                channel = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                                charIndex++;
                                bitStringLength = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                                bitStringLength = bitStringLength << 6;
                                bitStringLength += base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                            }
                            else {
                                channel = 0;
                                let bitStringLengthLength = validateRange(1, 4, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                                while (bitStringLengthLength > 0) {
                                    bitStringLength = bitStringLength << 6;
                                    bitStringLength += base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                                    bitStringLengthLength--;
                                }
                            }
                            const bits = new BitFieldReader(compressed, charIndex, charIndex + bitStringLength);
                            charIndex += bitStringLength;
                            let neededInstrumentBits = 0;
                            while ((1 << neededInstrumentBits) < this.instrumentsPerChannel)
                                neededInstrumentBits++;
                            while (true) {
                                const isNoiseChannel = this.getChannelIsNoise(channel);
                                const octaveOffset = isNoiseChannel ? 0 : this.channels[channel].octave * 12;
                                let note = null;
                                let pin = null;
                                let lastPitch = (isNoiseChannel ? 4 : 12) + octaveOffset;
                                const recentPitches = isNoiseChannel ? [4, 6, 7, 2, 3, 8, 0, 10] : [12, 19, 24, 31, 36, 7, 0];
                                const recentShapes = [];
                                for (let i = 0; i < recentPitches.length; i++) {
                                    recentPitches[i] += octaveOffset;
                                }
                                for (let i = 0; i < this.patternsPerChannel; i++) {
                                    const newPattern = this.channels[channel].patterns[i];
                                    newPattern.reset();
                                    newPattern.instrument = bits.read(neededInstrumentBits);
                                    if (!beforeThree && bits.read(1) == 0)
                                        continue;
                                    let curPart = 0;
                                    const newNotes = newPattern.notes;
                                    while (curPart < this.beatsPerBar * Config.partsPerBeat) {
                                        const useOldShape = bits.read(1) == 1;
                                        let newNote = false;
                                        let shapeIndex = 0;
                                        if (useOldShape) {
                                            shapeIndex = validateRange(0, recentShapes.length - 1, bits.readLongTail(0, 0));
                                        }
                                        else {
                                            newNote = bits.read(1) == 1;
                                        }
                                        if (!useOldShape && !newNote) {
                                            const restLength = beforeSeven
                                                ? bits.readLegacyPartDuration() * Config.partsPerBeat / Config.rhythms[this.rhythm].stepsPerBeat
                                                : bits.readPartDuration();
                                            curPart += restLength;
                                        }
                                        else {
                                            let shape;
                                            let pinObj;
                                            let pitch;
                                            if (useOldShape) {
                                                shape = recentShapes[shapeIndex];
                                                recentShapes.splice(shapeIndex, 1);
                                            }
                                            else {
                                                shape = {};
                                                shape.pitchCount = 1;
                                                while (shape.pitchCount < Config.maxChordSize && bits.read(1) == 1)
                                                    shape.pitchCount++;
                                                shape.pinCount = bits.readPinCount();
                                                shape.initialVolume = bits.read(2);
                                                shape.pins = [];
                                                shape.length = 0;
                                                shape.bendCount = 0;
                                                for (let j = 0; j < shape.pinCount; j++) {
                                                    pinObj = {};
                                                    pinObj.pitchBend = bits.read(1) == 1;
                                                    if (pinObj.pitchBend)
                                                        shape.bendCount++;
                                                    shape.length += beforeSeven
                                                        ? bits.readLegacyPartDuration() * Config.partsPerBeat / Config.rhythms[this.rhythm].stepsPerBeat
                                                        : bits.readPartDuration();
                                                    pinObj.time = shape.length;
                                                    pinObj.volume = bits.read(2);
                                                    shape.pins.push(pinObj);
                                                }
                                            }
                                            recentShapes.unshift(shape);
                                            if (recentShapes.length > 10)
                                                recentShapes.pop();
                                            note = new Note(0, curPart, curPart + shape.length, shape.initialVolume);
                                            note.pitches = [];
                                            note.pins.length = 1;
                                            const pitchBends = [];
                                            for (let j = 0; j < shape.pitchCount + shape.bendCount; j++) {
                                                const useOldPitch = bits.read(1) == 1;
                                                if (!useOldPitch) {
                                                    const interval = bits.readPitchInterval();
                                                    pitch = lastPitch;
                                                    let intervalIter = interval;
                                                    while (intervalIter > 0) {
                                                        pitch++;
                                                        while (recentPitches.indexOf(pitch) != -1)
                                                            pitch++;
                                                        intervalIter--;
                                                    }
                                                    while (intervalIter < 0) {
                                                        pitch--;
                                                        while (recentPitches.indexOf(pitch) != -1)
                                                            pitch--;
                                                        intervalIter++;
                                                    }
                                                }
                                                else {
                                                    const pitchIndex = validateRange(0, recentPitches.length - 1, bits.read(3));
                                                    pitch = recentPitches[pitchIndex];
                                                    recentPitches.splice(pitchIndex, 1);
                                                }
                                                recentPitches.unshift(pitch);
                                                if (recentPitches.length > 8)
                                                    recentPitches.pop();
                                                if (j < shape.pitchCount) {
                                                    note.pitches.push(pitch);
                                                }
                                                else {
                                                    pitchBends.push(pitch);
                                                }
                                                if (j == shape.pitchCount - 1) {
                                                    lastPitch = note.pitches[0];
                                                }
                                                else {
                                                    lastPitch = pitch;
                                                }
                                            }
                                            pitchBends.unshift(note.pitches[0]);
                                            for (const pinObj of shape.pins) {
                                                if (pinObj.pitchBend)
                                                    pitchBends.shift();
                                                pin = makeNotePin(pitchBends[0] - note.pitches[0], pinObj.time, pinObj.volume);
                                                note.pins.push(pin);
                                            }
                                            curPart = validateRange(0, this.beatsPerBar * Config.partsPerBeat, note.end);
                                            newNotes.push(note);
                                        }
                                    }
                                }
                                if (beforeThree) {
                                    break;
                                }
                                else {
                                    channel++;
                                    if (channel >= this.getChannelCount())
                                        break;
                                }
                            }
                        }
                        break;
                    default:
                        {
                            throw new Error("Unrecognized song tag code " + String.fromCharCode(command) + " at index " + (charIndex - 1));
                        }
                }
        }
        toJsonObject(enableIntro = true, loopCount = 1, enableOutro = true) {
            const channelArray = [];
            for (let channel = 0; channel < this.getChannelCount(); channel++) {
                const instrumentArray = [];
                const isNoiseChannel = this.getChannelIsNoise(channel);
                for (let i = 0; i < this.instrumentsPerChannel; i++) {
                    instrumentArray.push(this.channels[channel].instruments[i].toJsonObject());
                }
                const patternArray = [];
                for (const pattern of this.channels[channel].patterns) {
                    const noteArray = [];
                    for (const note of pattern.notes) {
                        const pointArray = [];
                        for (const pin of note.pins) {
                            pointArray.push({
                                "tick": (pin.time + note.start) * Config.rhythms[this.rhythm].stepsPerBeat / Config.partsPerBeat,
                                "pitchBend": pin.interval,
                                "volume": Math.round(pin.volume * 100 / 3),
                            });
                        }
                        noteArray.push({
                            "pitches": note.pitches,
                            "points": pointArray,
                        });
                    }
                    patternArray.push({
                        "instrument": pattern.instrument + 1,
                        "notes": noteArray,
                    });
                }
                const sequenceArray = [];
                if (enableIntro)
                    for (let i = 0; i < this.loopStart; i++) {
                        sequenceArray.push(this.channels[channel].bars[i]);
                    }
                for (let l = 0; l < loopCount; l++)
                    for (let i = this.loopStart; i < this.loopStart + this.loopLength; i++) {
                        sequenceArray.push(this.channels[channel].bars[i]);
                    }
                if (enableOutro)
                    for (let i = this.loopStart + this.loopLength; i < this.barCount; i++) {
                        sequenceArray.push(this.channels[channel].bars[i]);
                    }
                channelArray.push({
                    "type": isNoiseChannel ? "drum" : "pitch",
                    "octaveScrollBar": this.channels[channel].octave,
                    "instruments": instrumentArray,
                    "patterns": patternArray,
                    "sequence": sequenceArray,
                });
            }
            return {
                "format": Song._format,
                "version": Song._latestVersion,
                "scale": Config.scales[this.scale].name,
                "key": Config.keys[this.key].name,
                "introBars": this.loopStart,
                "loopBars": this.loopLength,
                "beatsPerBar": this.beatsPerBar,
                "ticksPerBeat": Config.rhythms[this.rhythm].stepsPerBeat,
                "beatsPerMinute": this.tempo,
                "reverb": this.reverb,
                "channels": channelArray,
            };
        }
        fromJsonObject(jsonObject) {
            this.initToDefault(true);
            if (!jsonObject)
                return;
            this.scale = 11;
            if (jsonObject["scale"] != undefined) {
                const oldScaleNames = {
                    "romani :)": "dbl harmonic :)",
                    "romani :(": "dbl harmonic :(",
                    "enigma": "strange",
                };
                const scaleName = (oldScaleNames[jsonObject["scale"]] != undefined) ? oldScaleNames[jsonObject["scale"]] : jsonObject["scale"];
                const scale = Config.scales.findIndex(scale => scale.name == scaleName);
                if (scale != -1)
                    this.scale = scale;
            }
            if (jsonObject["key"] != undefined) {
                if (typeof (jsonObject["key"]) == "number") {
                    this.key = ((jsonObject["key"] + 1200) >>> 0) % Config.keys.length;
                }
                else if (typeof (jsonObject["key"]) == "string") {
                    const key = jsonObject["key"];
                    const letter = key.charAt(0).toUpperCase();
                    const symbol = key.charAt(1).toLowerCase();
                    const letterMap = { "C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11 };
                    const accidentalMap = { "#": 1, "♯": 1, "b": -1, "♭": -1 };
                    let index = letterMap[letter];
                    const offset = accidentalMap[symbol];
                    if (index != undefined) {
                        if (offset != undefined)
                            index += offset;
                        if (index < 0)
                            index += 12;
                        index = index % 12;
                        this.key = index;
                    }
                }
            }
            if (jsonObject["beatsPerMinute"] != undefined) {
                this.tempo = clamp(Config.tempoMin, Config.tempoMax + 1, jsonObject["beatsPerMinute"] | 0);
            }
            if (jsonObject["reverb"] != undefined) {
                this.reverb = clamp(0, Config.reverbRange, jsonObject["reverb"] | 0);
            }
            if (jsonObject["beatsPerBar"] != undefined) {
                this.beatsPerBar = Math.max(Config.beatsPerBarMin, Math.min(Config.beatsPerBarMax, jsonObject["beatsPerBar"] | 0));
            }
            let importedPartsPerBeat = 4;
            if (jsonObject["ticksPerBeat"] != undefined) {
                importedPartsPerBeat = (jsonObject["ticksPerBeat"] | 0) || 4;
                this.rhythm = Config.rhythms.findIndex(rhythm => rhythm.stepsPerBeat == importedPartsPerBeat);
                if (this.rhythm == -1) {
                    this.rhythm = 1;
                }
            }
            let maxInstruments = 1;
            let maxPatterns = 1;
            let maxBars = 1;
            if (jsonObject["channels"]) {
                for (const channelObject of jsonObject["channels"]) {
                    if (channelObject["instruments"])
                        maxInstruments = Math.max(maxInstruments, channelObject["instruments"].length | 0);
                    if (channelObject["patterns"])
                        maxPatterns = Math.max(maxPatterns, channelObject["patterns"].length | 0);
                    if (channelObject["sequence"])
                        maxBars = Math.max(maxBars, channelObject["sequence"].length | 0);
                }
            }
            this.instrumentsPerChannel = Math.min(maxInstruments, Config.instrumentsPerChannelMax);
            this.patternsPerChannel = Math.min(maxPatterns, Config.barCountMax);
            this.barCount = Math.min(maxBars, Config.barCountMax);
            if (jsonObject["introBars"] != undefined) {
                this.loopStart = clamp(0, this.barCount, jsonObject["introBars"] | 0);
            }
            if (jsonObject["loopBars"] != undefined) {
                this.loopLength = clamp(1, this.barCount - this.loopStart + 1, jsonObject["loopBars"] | 0);
            }
            const newPitchChannels = [];
            const newNoiseChannels = [];
            if (jsonObject["channels"]) {
                for (let channelIndex = 0; channelIndex < jsonObject["channels"].length; channelIndex++) {
                    let channelObject = jsonObject["channels"][channelIndex];
                    const channel = new Channel();
                    let isNoiseChannel = false;
                    if (channelObject["type"] != undefined) {
                        isNoiseChannel = (channelObject["type"] == "drum");
                    }
                    else {
                        isNoiseChannel = (channelIndex >= 3);
                    }
                    if (isNoiseChannel) {
                        newNoiseChannels.push(channel);
                    }
                    else {
                        newPitchChannels.push(channel);
                    }
                    if (channelObject["octaveScrollBar"] != undefined) {
                        channel.octave = clamp(0, Config.scrollableOctaves + 1, channelObject["octaveScrollBar"] | 0);
                    }
                    for (let i = channel.instruments.length; i < this.instrumentsPerChannel; i++) {
                        channel.instruments[i] = new Instrument(isNoiseChannel);
                    }
                    channel.instruments.length = this.instrumentsPerChannel;
                    for (let i = channel.patterns.length; i < this.patternsPerChannel; i++) {
                        channel.patterns[i] = new Pattern();
                    }
                    channel.patterns.length = this.patternsPerChannel;
                    for (let i = 0; i < this.barCount; i++) {
                        channel.bars[i] = 1;
                    }
                    channel.bars.length = this.barCount;
                    for (let i = 0; i < this.instrumentsPerChannel; i++) {
                        const instrument = channel.instruments[i];
                        instrument.fromJsonObject(channelObject["instruments"][i], isNoiseChannel);
                    }
                    for (let i = 0; i < this.patternsPerChannel; i++) {
                        const pattern = channel.patterns[i];
                        let patternObject = undefined;
                        if (channelObject["patterns"])
                            patternObject = channelObject["patterns"][i];
                        if (patternObject == undefined)
                            continue;
                        pattern.instrument = clamp(0, this.instrumentsPerChannel, (patternObject["instrument"] | 0) - 1);
                        if (patternObject["notes"] && patternObject["notes"].length > 0) {
                            const maxNoteCount = Math.min(this.beatsPerBar * Config.partsPerBeat, patternObject["notes"].length >>> 0);
                            let tickClock = 0;
                            for (let j = 0; j < patternObject["notes"].length; j++) {
                                if (j >= maxNoteCount)
                                    break;
                                const noteObject = patternObject["notes"][j];
                                if (!noteObject || !noteObject["pitches"] || !(noteObject["pitches"].length >= 1) || !noteObject["points"] || !(noteObject["points"].length >= 2)) {
                                    continue;
                                }
                                const note = new Note(0, 0, 0, 0);
                                note.pitches = [];
                                note.pins = [];
                                for (let k = 0; k < noteObject["pitches"].length; k++) {
                                    const pitch = noteObject["pitches"][k] | 0;
                                    if (note.pitches.indexOf(pitch) != -1)
                                        continue;
                                    note.pitches.push(pitch);
                                    if (note.pitches.length >= Config.maxChordSize)
                                        break;
                                }
                                if (note.pitches.length < 1)
                                    continue;
                                let noteClock = tickClock;
                                let startInterval = 0;
                                for (let k = 0; k < noteObject["points"].length; k++) {
                                    const pointObject = noteObject["points"][k];
                                    if (pointObject == undefined || pointObject["tick"] == undefined)
                                        continue;
                                    const interval = (pointObject["pitchBend"] == undefined) ? 0 : (pointObject["pitchBend"] | 0);
                                    const time = Math.round((+pointObject["tick"]) * Config.partsPerBeat / importedPartsPerBeat);
                                    const volume = (pointObject["volume"] == undefined) ? 3 : Math.max(0, Math.min(3, Math.round((pointObject["volume"] | 0) * 3 / 100)));
                                    if (time > this.beatsPerBar * Config.partsPerBeat)
                                        continue;
                                    if (note.pins.length == 0) {
                                        if (time < noteClock)
                                            continue;
                                        note.start = time;
                                        startInterval = interval;
                                    }
                                    else {
                                        if (time <= noteClock)
                                            continue;
                                    }
                                    noteClock = time;
                                    note.pins.push(makeNotePin(interval - startInterval, time - note.start, volume));
                                }
                                if (note.pins.length < 2)
                                    continue;
                                note.end = note.pins[note.pins.length - 1].time + note.start;
                                const maxPitch = isNoiseChannel ? Config.drumCount - 1 : Config.maxPitch;
                                let lowestPitch = maxPitch;
                                let highestPitch = 0;
                                for (let k = 0; k < note.pitches.length; k++) {
                                    note.pitches[k] += startInterval;
                                    if (note.pitches[k] < 0 || note.pitches[k] > maxPitch) {
                                        note.pitches.splice(k, 1);
                                        k--;
                                    }
                                    if (note.pitches[k] < lowestPitch)
                                        lowestPitch = note.pitches[k];
                                    if (note.pitches[k] > highestPitch)
                                        highestPitch = note.pitches[k];
                                }
                                if (note.pitches.length < 1)
                                    continue;
                                for (let k = 0; k < note.pins.length; k++) {
                                    const pin = note.pins[k];
                                    if (pin.interval + lowestPitch < 0)
                                        pin.interval = -lowestPitch;
                                    if (pin.interval + highestPitch > maxPitch)
                                        pin.interval = maxPitch - highestPitch;
                                    if (k >= 2) {
                                        if (pin.interval == note.pins[k - 1].interval &&
                                            pin.interval == note.pins[k - 2].interval &&
                                            pin.volume == note.pins[k - 1].volume &&
                                            pin.volume == note.pins[k - 2].volume) {
                                            note.pins.splice(k - 1, 1);
                                            k--;
                                        }
                                    }
                                }
                                pattern.notes.push(note);
                                tickClock = note.end;
                            }
                        }
                    }
                    for (let i = 0; i < this.barCount; i++) {
                        channel.bars[i] = channelObject["sequence"] ? Math.min(this.patternsPerChannel, channelObject["sequence"][i] >>> 0) : 0;
                    }
                }
            }
            if (newPitchChannels.length > Config.pitchChannelCountMax)
                newPitchChannels.length = Config.pitchChannelCountMax;
            if (newNoiseChannels.length > Config.noiseChannelCountMax)
                newNoiseChannels.length = Config.noiseChannelCountMax;
            this.pitchChannelCount = newPitchChannels.length;
            this.noiseChannelCount = newNoiseChannels.length;
            this.channels.length = 0;
            Array.prototype.push.apply(this.channels, newPitchChannels);
            Array.prototype.push.apply(this.channels, newNoiseChannels);
        }
        getPattern(channel, bar) {
            if (bar < 0 || bar >= this.barCount)
                return null;
            const patternIndex = this.channels[channel].bars[bar];
            if (patternIndex == 0)
                return null;
            return this.channels[channel].patterns[patternIndex - 1];
        }
        getPatternInstrument(channel, bar) {
            const pattern = this.getPattern(channel, bar);
            return pattern == null ? 0 : pattern.instrument;
        }
        getBeatsPerMinute() {
            return this.tempo;
        }
    }
    Song._format = "BeepBox";
    Song._oldestVersion = 2;
    Song._latestVersion = 8;
    class Tone {
        constructor() {
            this.pitches = [0, 0, 0, 0];
            this.pitchCount = 0;
            this.chordSize = 0;
            this.drumsetPitch = 0;
            this.note = null;
            this.prevNote = null;
            this.nextNote = null;
            this.prevNotePitchIndex = 0;
            this.nextNotePitchIndex = 0;
            this.active = false;
            this.noteStart = 0;
            this.noteEnd = 0;
            this.noteLengthTicks = 0;
            this.ticksSinceReleased = 0;
            this.liveInputSamplesHeld = 0;
            this.lastInterval = 0;
            this.lastVolume = 0;
            this.stereoVolume1 = 0.0;
            this.stereoVolume2 = 0.0;
            this.stereoOffset = 0.0;
            this.stereoDelay = 0.0;
            this.sample = 0.0;
            this.phases = [];
            this.phaseDeltas = [];
            this.volumeStarts = [];
            this.volumeDeltas = [];
            this.volumeStart = 0.0;
            this.volumeDelta = 0.0;
            this.phaseDeltaScale = 0.0;
            this.pulseWidth = 0.0;
            this.pulseWidthDelta = 0.0;
            this.filter = 0.0;
            this.filterScale = 0.0;
            this.filterSample0 = 0.0;
            this.filterSample1 = 0.0;
            this.vibratoScale = 0.0;
            this.intervalMult = 0.0;
            this.intervalVolumeMult = 1.0;
            this.feedbackOutputs = [];
            this.feedbackMult = 0.0;
            this.feedbackDelta = 0.0;
            this.reset();
        }
        reset() {
            for (let i = 0; i < Config.operatorCount; i++) {
                this.phases[i] = 0.0;
                this.feedbackOutputs[i] = 0.0;
            }
            this.sample = 0.0;
            this.filterSample0 = 0.0;
            this.filterSample1 = 0.0;
            this.liveInputSamplesHeld = 0.0;
        }
    }
    class Synth {
        constructor(song = null) {
            this.samplesPerSecond = 44100;
            this.song = null;
            this.liveInputDuration = 0;
            this.liveInputStarted = false;
            this.liveInputPitches = [];
            this.liveInputChannel = 0;
            this.loopRepeatCount = -1;
            this.volume = 1.0;
            this.playheadInternal = 0.0;
            this.bar = 0;
            this.beat = 0;
            this.part = 0;
            this.tick = 0;
            this.tickSampleCountdown = 0;
            this.isPlayingSong = false;
            this.liveInputEndTime = 0.0;
            this.tonePool = new Deque();
            this.activeTones = [];
            this.releasedTones = [];
            this.liveInputTones = new Deque();
            this.limit = 0.0;
            this.stereoBufferIndex = 0;
            this.samplesForNone = null;
            this.samplesForReverb = null;
            this.samplesForChorus = null;
            this.samplesForChorusReverb = null;
            this.chorusDelayLine = new Float32Array(2048);
            this.chorusDelayPos = 0;
            this.chorusPhase = 0;
            this.reverbDelayLine = new Float32Array(16384);
            this.reverbDelayPos = 0;
            this.reverbFeedback0 = 0.0;
            this.reverbFeedback1 = 0.0;
            this.reverbFeedback2 = 0.0;
            this.reverbFeedback3 = 0.0;
            this.audioCtx = null;
            this.scriptNode = null;
            this.audioProcessCallback = (audioProcessingEvent) => {
                const outputBuffer = audioProcessingEvent.outputBuffer;
                const outputDataL = outputBuffer.getChannelData(0);
                const outputDataR = outputBuffer.getChannelData(1);
                const isPlayingLiveTones = performance.now() < this.liveInputEndTime;
                if (!isPlayingLiveTones && !this.isPlayingSong) {
                    for (let i = 0; i < outputBuffer.length; i++) {
                        outputDataL[i] = 0.0;
                        outputDataR[i] = 0.0;
                    }
                    this.deactivateAudio();
                }
                else {
                    this.synthesize(outputDataL, outputDataR, outputBuffer.length, this.isPlayingSong);
                }
            };
            if (song != null)
                this.setSong(song);
        }
        static warmUpSynthesizer(song) {
            if (song != null) {
                for (let j = 0; j < song.getChannelCount(); j++) {
                    for (let i = 0; i < song.instrumentsPerChannel; i++) {
                        Synth.getInstrumentSynthFunction(song.channels[j].instruments[i]);
                        song.channels[j].instruments[i].warmUp();
                    }
                }
            }
        }
        static operatorAmplitudeCurve(amplitude) {
            return (Math.pow(16.0, amplitude / 15.0) - 1.0) / 15.0;
        }
        get playing() {
            return this.isPlayingSong;
        }
        get playhead() {
            return this.playheadInternal;
        }
        set playhead(value) {
            if (this.song != null) {
                this.playheadInternal = Math.max(0, Math.min(this.song.barCount, value));
                let remainder = this.playheadInternal;
                this.bar = Math.floor(remainder);
                remainder = this.song.beatsPerBar * (remainder - this.bar);
                this.beat = Math.floor(remainder);
                remainder = Config.partsPerBeat * (remainder - this.beat);
                this.part = Math.floor(remainder);
                remainder = Config.ticksPerPart * (remainder - this.part);
                this.tick = Math.floor(remainder);
                const samplesPerTick = this.getSamplesPerTick();
                remainder = samplesPerTick * (remainder - this.tick);
                this.tickSampleCountdown = samplesPerTick - remainder;
            }
        }
        getSamplesPerBar() {
            if (this.song == null)
                throw new Error();
            return this.getSamplesPerTick() * Config.ticksPerPart * Config.partsPerBeat * this.song.beatsPerBar;
        }
        getTotalBars(enableIntro, enableOutro) {
            if (this.song == null)
                throw new Error();
            let bars = this.song.loopLength * (this.loopRepeatCount + 1);
            if (enableIntro)
                bars += this.song.loopStart;
            if (enableOutro)
                bars += this.song.barCount - (this.song.loopStart + this.song.loopLength);
            return bars;
        }
        setSong(song) {
            if (typeof (song) == "string") {
                this.song = new Song(song);
            }
            else if (song instanceof Song) {
                this.song = song;
            }
        }
        activateAudio() {
            if (this.audioCtx == null || this.scriptNode == null) {
                this.audioCtx = this.audioCtx || new (window.AudioContext || window.webkitAudioContext)();
                this.samplesPerSecond = this.audioCtx.sampleRate;
                this.scriptNode = this.audioCtx.createScriptProcessor ? this.audioCtx.createScriptProcessor(2048, 0, 2) : this.audioCtx.createJavaScriptNode(2048, 0, 2);
                this.scriptNode.onaudioprocess = this.audioProcessCallback;
                this.scriptNode.channelCountMode = 'explicit';
                this.scriptNode.channelInterpretation = 'speakers';
                this.scriptNode.connect(this.audioCtx.destination);
            }
            this.audioCtx.resume();
        }
        deactivateAudio() {
            if (this.audioCtx != null && this.scriptNode != null) {
                this.scriptNode.disconnect(this.audioCtx.destination);
                this.scriptNode = null;
                if (this.audioCtx.close)
                    this.audioCtx.close();
                this.audioCtx = null;
            }
        }
        maintainLiveInput() {
            this.activateAudio();
            this.liveInputEndTime = performance.now() + 10000.0;
        }
        play() {
            if (this.isPlayingSong)
                return;
            this.isPlayingSong = true;
            Synth.warmUpSynthesizer(this.song);
            this.activateAudio();
        }
        pause() {
            if (!this.isPlayingSong)
                return;
            this.isPlayingSong = false;
        }
        snapToStart() {
            this.bar = 0;
            this.snapToBar();
        }
        goToBar(bar) {
            this.bar = bar;
            this.playheadInternal = this.bar;
        }
        snapToBar() {
            this.playheadInternal = this.bar;
            this.beat = 0;
            this.part = 0;
            this.tick = 0;
            this.tickSampleCountdown = 0;
        }
        resetEffects() {
            this.reverbDelayPos = 0;
            this.reverbFeedback0 = 0.0;
            this.reverbFeedback1 = 0.0;
            this.reverbFeedback2 = 0.0;
            this.reverbFeedback3 = 0.0;
            this.freeAllTones();
            for (let i = 0; i < this.reverbDelayLine.length; i++)
                this.reverbDelayLine[i] = 0.0;
            for (let i = 0; i < this.chorusDelayLine.length; i++)
                this.chorusDelayLine[i] = 0.0;
            if (this.samplesForNone != null)
                for (let i = 0; i < this.samplesForNone.length; i++)
                    this.samplesForNone[i] = 0.0;
            if (this.samplesForReverb != null)
                for (let i = 0; i < this.samplesForReverb.length; i++)
                    this.samplesForReverb[i] = 0.0;
            if (this.samplesForChorus != null)
                for (let i = 0; i < this.samplesForChorus.length; i++)
                    this.samplesForChorus[i] = 0.0;
            if (this.samplesForChorusReverb != null)
                for (let i = 0; i < this.samplesForChorusReverb.length; i++)
                    this.samplesForChorusReverb[i] = 0.0;
        }
        jumpIntoLoop() {
            if (!this.song)
                return;
            if (this.bar < this.song.loopStart || this.bar >= this.song.loopStart + this.song.loopLength) {
                const oldBar = this.bar;
                this.bar = this.song.loopStart;
                this.playheadInternal += this.bar - oldBar;
            }
        }
        nextBar() {
            if (!this.song)
                return;
            const oldBar = this.bar;
            this.bar++;
            if (this.bar >= this.song.barCount) {
                this.bar = 0;
            }
            this.playheadInternal += this.bar - oldBar;
        }
        prevBar() {
            if (!this.song)
                return;
            const oldBar = this.bar;
            this.bar--;
            if (this.bar < 0 || this.bar >= this.song.barCount) {
                this.bar = this.song.barCount - 1;
            }
            this.playheadInternal += this.bar - oldBar;
        }
        synthesize(outputDataL, outputDataR, outputBufferLength, playSong = true) {
            if (this.song == null) {
                for (let i = 0; i < outputBufferLength; i++) {
                    outputDataL[i] = 0.0;
                    outputDataR[i] = 0.0;
                }
                this.deactivateAudio();
                return;
            }
            const channelCount = this.song.getChannelCount();
            for (let i = this.activeTones.length; i < channelCount; i++) {
                this.activeTones[i] = new Deque();
                this.releasedTones[i] = new Deque();
            }
            this.activeTones.length = channelCount;
            this.releasedTones.length = channelCount;
            const samplesPerTick = this.getSamplesPerTick();
            let bufferIndex = 0;
            let ended = false;
            while (this.tickSampleCountdown <= 0)
                this.tickSampleCountdown += samplesPerTick;
            if (this.tickSampleCountdown > samplesPerTick)
                this.tickSampleCountdown = samplesPerTick;
            if (playSong) {
                if (this.beat >= this.song.beatsPerBar) {
                    this.bar++;
                    this.beat = 0;
                    this.part = 0;
                    this.tick = 0;
                    this.tickSampleCountdown = samplesPerTick;
                    if (this.loopRepeatCount != 0 && this.bar == this.song.loopStart + this.song.loopLength) {
                        this.bar = this.song.loopStart;
                        if (this.loopRepeatCount > 0)
                            this.loopRepeatCount--;
                    }
                }
                if (this.bar >= this.song.barCount) {
                    this.bar = 0;
                    if (this.loopRepeatCount != -1) {
                        ended = true;
                        this.pause();
                    }
                }
            }
            const stereoBufferLength = outputBufferLength * 4;
            if (this.samplesForNone == null || this.samplesForNone.length != stereoBufferLength ||
                this.samplesForReverb == null || this.samplesForReverb.length != stereoBufferLength ||
                this.samplesForChorus == null || this.samplesForChorus.length != stereoBufferLength ||
                this.samplesForChorusReverb == null || this.samplesForChorusReverb.length != stereoBufferLength) {
                this.samplesForNone = new Float32Array(stereoBufferLength);
                this.samplesForReverb = new Float32Array(stereoBufferLength);
                this.samplesForChorus = new Float32Array(stereoBufferLength);
                this.samplesForChorusReverb = new Float32Array(stereoBufferLength);
                this.stereoBufferIndex = 0;
            }
            let stereoBufferIndex = this.stereoBufferIndex;
            const samplesForNone = this.samplesForNone;
            const samplesForReverb = this.samplesForReverb;
            const samplesForChorus = this.samplesForChorus;
            const samplesForChorusReverb = this.samplesForChorusReverb;
            const volume = +this.volume;
            const chorusDelayLine = this.chorusDelayLine;
            const reverbDelayLine = this.reverbDelayLine;
            const chorusDuration = 2.0;
            const chorusAngle = Math.PI * 2.0 / (chorusDuration * this.samplesPerSecond);
            const chorusRange = 150 * this.samplesPerSecond / 44100;
            const chorusOffset0 = 0x800 - 1.51 * chorusRange;
            const chorusOffset1 = 0x800 - 2.10 * chorusRange;
            const chorusOffset2 = 0x800 - 3.35 * chorusRange;
            const chorusOffset3 = 0x800 - 1.47 * chorusRange;
            const chorusOffset4 = 0x800 - 2.15 * chorusRange;
            const chorusOffset5 = 0x800 - 3.25 * chorusRange;
            let chorusPhase = this.chorusPhase % (Math.PI * 2.0);
            let chorusDelayPos = this.chorusDelayPos & 0x7FF;
            let reverbDelayPos = this.reverbDelayPos & 0x3FFF;
            let reverbFeedback0 = +this.reverbFeedback0;
            let reverbFeedback1 = +this.reverbFeedback1;
            let reverbFeedback2 = +this.reverbFeedback2;
            let reverbFeedback3 = +this.reverbFeedback3;
            const reverb = Math.pow(this.song.reverb / Config.reverbRange, 0.667) * 0.425;
            const limitDecay = 1.0 - Math.pow(0.5, 4.0 / this.samplesPerSecond);
            const limitRise = 1.0 - Math.pow(0.5, 4000.0 / this.samplesPerSecond);
            let limit = +this.limit;
            while (bufferIndex < outputBufferLength && !ended) {
                const samplesLeftInBuffer = outputBufferLength - bufferIndex;
                const runLength = Math.min(Math.ceil(this.tickSampleCountdown), samplesLeftInBuffer);
                for (let channel = 0; channel < this.song.getChannelCount(); channel++) {
                    if (channel == this.liveInputChannel) {
                        this.determineLiveInputTones(this.song);
                        for (let i = 0; i < this.liveInputTones.count(); i++) {
                            const tone = this.liveInputTones.get(i);
                            this.playTone(this.song, stereoBufferIndex, stereoBufferLength, channel, samplesPerTick, runLength, tone, false, false);
                        }
                    }
                    this.determineCurrentActiveTones(this.song, channel, playSong);
                    for (let i = 0; i < this.activeTones[channel].count(); i++) {
                        const tone = this.activeTones[channel].get(i);
                        this.playTone(this.song, stereoBufferIndex, stereoBufferLength, channel, samplesPerTick, runLength, tone, false, false);
                    }
                    for (let i = 0; i < this.releasedTones[channel].count(); i++) {
                        const tone = this.releasedTones[channel].get(i);
                        if (tone.ticksSinceReleased >= tone.instrument.getTransition().releaseTicks) {
                            this.freeReleasedTone(channel, i);
                            i--;
                            continue;
                        }
                        const shouldFadeOutFast = (i + this.activeTones[channel].count() >= Config.maximumTonesPerChannel);
                        this.playTone(this.song, stereoBufferIndex, stereoBufferLength, channel, samplesPerTick, runLength, tone, true, shouldFadeOutFast);
                    }
                }
                let chorusTap0Index = chorusDelayPos + chorusOffset0 - chorusRange * Math.sin(chorusPhase + 0);
                let chorusTap1Index = chorusDelayPos + chorusOffset1 - chorusRange * Math.sin(chorusPhase + 2.1);
                let chorusTap2Index = chorusDelayPos + chorusOffset2 - chorusRange * Math.sin(chorusPhase + 4.2);
                let chorusTap3Index = chorusDelayPos + 0x400 + chorusOffset3 - chorusRange * Math.sin(chorusPhase + 3.2);
                let chorusTap4Index = chorusDelayPos + 0x400 + chorusOffset4 - chorusRange * Math.sin(chorusPhase + 5.3);
                let chorusTap5Index = chorusDelayPos + 0x400 + chorusOffset5 - chorusRange * Math.sin(chorusPhase + 1.0);
                chorusPhase += chorusAngle * runLength;
                const chorusTap0End = chorusDelayPos + runLength + chorusOffset0 - chorusRange * Math.sin(chorusPhase + 0);
                const chorusTap1End = chorusDelayPos + runLength + chorusOffset1 - chorusRange * Math.sin(chorusPhase + 2.1);
                const chorusTap2End = chorusDelayPos + runLength + chorusOffset2 - chorusRange * Math.sin(chorusPhase + 4.2);
                const chorusTap3End = chorusDelayPos + runLength + 0x400 + chorusOffset3 - chorusRange * Math.sin(chorusPhase + 3.2);
                const chorusTap4End = chorusDelayPos + runLength + 0x400 + chorusOffset4 - chorusRange * Math.sin(chorusPhase + 5.3);
                const chorusTap5End = chorusDelayPos + runLength + 0x400 + chorusOffset5 - chorusRange * Math.sin(chorusPhase + 1.0);
                const chorusTap0Delta = (chorusTap0End - chorusTap0Index) / runLength;
                const chorusTap1Delta = (chorusTap1End - chorusTap1Index) / runLength;
                const chorusTap2Delta = (chorusTap2End - chorusTap2Index) / runLength;
                const chorusTap3Delta = (chorusTap3End - chorusTap3Index) / runLength;
                const chorusTap4Delta = (chorusTap4End - chorusTap4Index) / runLength;
                const chorusTap5Delta = (chorusTap5End - chorusTap5Index) / runLength;
                const runEnd = bufferIndex + runLength;
                for (let i = bufferIndex; i < runEnd; i++) {
                    const bufferIndexL = stereoBufferIndex;
                    const bufferIndexR = stereoBufferIndex + 1;
                    const sampleForNoneL = samplesForNone[bufferIndexL];
                    samplesForNone[bufferIndexL] = 0.0;
                    const sampleForNoneR = samplesForNone[bufferIndexR];
                    samplesForNone[bufferIndexR] = 0.0;
                    const sampleForReverbL = samplesForReverb[bufferIndexL];
                    samplesForReverb[bufferIndexL] = 0.0;
                    const sampleForReverbR = samplesForReverb[bufferIndexR];
                    samplesForReverb[bufferIndexR] = 0.0;
                    const sampleForChorusL = samplesForChorus[bufferIndexL];
                    samplesForChorus[bufferIndexL] = 0.0;
                    const sampleForChorusR = samplesForChorus[bufferIndexR];
                    samplesForChorus[bufferIndexR] = 0.0;
                    const sampleForChorusReverbL = samplesForChorusReverb[bufferIndexL];
                    samplesForChorusReverb[bufferIndexL] = 0.0;
                    const sampleForChorusReverbR = samplesForChorusReverb[bufferIndexR];
                    samplesForChorusReverb[bufferIndexR] = 0.0;
                    stereoBufferIndex += 2;
                    const combinedChorusL = sampleForChorusL + sampleForChorusReverbL;
                    const combinedChorusR = sampleForChorusR + sampleForChorusReverbR;
                    const chorusTap0Ratio = chorusTap0Index % 1;
                    const chorusTap1Ratio = chorusTap1Index % 1;
                    const chorusTap2Ratio = chorusTap2Index % 1;
                    const chorusTap3Ratio = chorusTap3Index % 1;
                    const chorusTap4Ratio = chorusTap4Index % 1;
                    const chorusTap5Ratio = chorusTap5Index % 1;
                    const chorusTap0A = chorusDelayLine[(chorusTap0Index) & 0x7FF];
                    const chorusTap0B = chorusDelayLine[(chorusTap0Index + 1) & 0x7FF];
                    const chorusTap1A = chorusDelayLine[(chorusTap1Index) & 0x7FF];
                    const chorusTap1B = chorusDelayLine[(chorusTap1Index + 1) & 0x7FF];
                    const chorusTap2A = chorusDelayLine[(chorusTap2Index) & 0x7FF];
                    const chorusTap2B = chorusDelayLine[(chorusTap2Index + 1) & 0x7FF];
                    const chorusTap3A = chorusDelayLine[(chorusTap3Index) & 0x7FF];
                    const chorusTap3B = chorusDelayLine[(chorusTap3Index + 1) & 0x7FF];
                    const chorusTap4A = chorusDelayLine[(chorusTap4Index) & 0x7FF];
                    const chorusTap4B = chorusDelayLine[(chorusTap4Index + 1) & 0x7FF];
                    const chorusTap5A = chorusDelayLine[(chorusTap5Index) & 0x7FF];
                    const chorusTap5B = chorusDelayLine[(chorusTap5Index + 1) & 0x7FF];
                    const chorusTap0 = chorusTap0A + (chorusTap0B - chorusTap0A) * chorusTap0Ratio;
                    const chorusTap1 = chorusTap1A + (chorusTap1B - chorusTap1A) * chorusTap1Ratio;
                    const chorusTap2 = chorusTap2A + (chorusTap2B - chorusTap2A) * chorusTap2Ratio;
                    const chorusTap3 = chorusTap3A + (chorusTap3B - chorusTap3A) * chorusTap3Ratio;
                    const chorusTap4 = chorusTap4A + (chorusTap4B - chorusTap4A) * chorusTap4Ratio;
                    const chorusTap5 = chorusTap5A + (chorusTap5B - chorusTap5A) * chorusTap5Ratio;
                    const chorusSampleL = 0.5 * (combinedChorusL - chorusTap0 + chorusTap1 - chorusTap2);
                    const chorusSampleR = 0.5 * (combinedChorusR - chorusTap3 + chorusTap4 - chorusTap5);
                    chorusDelayLine[chorusDelayPos] = combinedChorusL;
                    chorusDelayLine[(chorusDelayPos + 0x400) & 0x7FF] = combinedChorusR;
                    chorusDelayPos = (chorusDelayPos + 1) & 0x7FF;
                    chorusTap0Index += chorusTap0Delta;
                    chorusTap1Index += chorusTap1Delta;
                    chorusTap2Index += chorusTap2Delta;
                    chorusTap3Index += chorusTap3Delta;
                    chorusTap4Index += chorusTap4Delta;
                    chorusTap5Index += chorusTap5Delta;
                    const reverbDelayPos1 = (reverbDelayPos + 3041) & 0x3FFF;
                    const reverbDelayPos2 = (reverbDelayPos + 6426) & 0x3FFF;
                    const reverbDelayPos3 = (reverbDelayPos + 10907) & 0x3FFF;
                    const reverbSample0 = (reverbDelayLine[reverbDelayPos]);
                    const reverbSample1 = reverbDelayLine[reverbDelayPos1];
                    const reverbSample2 = reverbDelayLine[reverbDelayPos2];
                    const reverbSample3 = reverbDelayLine[reverbDelayPos3];
                    const reverbTemp0 = -(reverbSample0 + sampleForChorusReverbL + sampleForReverbL) + reverbSample1;
                    const reverbTemp1 = -(reverbSample0 + sampleForChorusReverbR + sampleForReverbR) - reverbSample1;
                    const reverbTemp2 = -reverbSample2 + reverbSample3;
                    const reverbTemp3 = -reverbSample2 - reverbSample3;
                    reverbFeedback0 += ((reverbTemp0 + reverbTemp2) * reverb - reverbFeedback0) * 0.5;
                    reverbFeedback1 += ((reverbTemp1 + reverbTemp3) * reverb - reverbFeedback1) * 0.5;
                    reverbFeedback2 += ((reverbTemp0 - reverbTemp2) * reverb - reverbFeedback2) * 0.5;
                    reverbFeedback3 += ((reverbTemp1 - reverbTemp3) * reverb - reverbFeedback3) * 0.5;
                    reverbDelayLine[reverbDelayPos1] = reverbFeedback0;
                    reverbDelayLine[reverbDelayPos2] = reverbFeedback1;
                    reverbDelayLine[reverbDelayPos3] = reverbFeedback2;
                    reverbDelayLine[reverbDelayPos] = reverbFeedback3;
                    reverbDelayPos = (reverbDelayPos + 1) & 0x3FFF;
                    const sampleL = sampleForNoneL + chorusSampleL + sampleForReverbL + reverbSample1 + reverbSample2 + reverbSample3;
                    const sampleR = sampleForNoneR + chorusSampleR + sampleForReverbR + reverbSample0 + reverbSample2 - reverbSample3;
                    const absL = sampleL < 0.0 ? -sampleL : sampleL;
                    const absR = sampleR < 0.0 ? -sampleR : sampleR;
                    const abs = absL > absR ? absL : absR;
                    limit += (abs - limit) * (limit < abs ? limitRise : limitDecay);
                    const limitedVolume = volume / (limit >= 1 ? limit * 1.05 : limit * 0.8 + 0.25);
                    outputDataL[i] = sampleL * limitedVolume;
                    outputDataR[i] = sampleR * limitedVolume;
                }
                bufferIndex += runLength;
                this.tickSampleCountdown -= runLength;
                if (this.tickSampleCountdown <= 0) {
                    for (let channel = 0; channel < this.song.getChannelCount(); channel++) {
                        for (let i = 0; i < this.releasedTones[channel].count(); i++) {
                            const tone = this.releasedTones[channel].get(i);
                            tone.ticksSinceReleased++;
                            const shouldFadeOutFast = (i + this.activeTones[channel].count() >= Config.maximumTonesPerChannel);
                            if (shouldFadeOutFast) {
                                this.freeReleasedTone(channel, i);
                                i--;
                            }
                        }
                    }
                    this.tick++;
                    this.tickSampleCountdown += samplesPerTick;
                    if (this.tick == Config.ticksPerPart) {
                        this.tick = 0;
                        this.part++;
                        this.liveInputDuration--;
                        for (let channel = 0; channel < this.song.getChannelCount(); channel++) {
                            for (let i = 0; i < this.activeTones[channel].count(); i++) {
                                const tone = this.activeTones[channel].get(i);
                                const transition = tone.instrument.getTransition();
                                if (!transition.isSeamless && tone.note != null && tone.note.end == this.part + this.beat * Config.partsPerBeat) {
                                    if (transition.releases) {
                                        this.releaseTone(channel, tone);
                                    }
                                    else {
                                        this.freeTone(tone);
                                    }
                                    this.activeTones[channel].remove(i);
                                    i--;
                                }
                            }
                        }
                        if (this.part == Config.partsPerBeat) {
                            this.part = 0;
                            if (playSong) {
                                this.beat++;
                                if (this.beat == this.song.beatsPerBar) {
                                    this.beat = 0;
                                    this.bar++;
                                    if (this.loopRepeatCount != 0 && this.bar == this.song.loopStart + this.song.loopLength) {
                                        this.bar = this.song.loopStart;
                                        if (this.loopRepeatCount > 0)
                                            this.loopRepeatCount--;
                                    }
                                    if (this.bar >= this.song.barCount) {
                                        this.bar = 0;
                                        if (this.loopRepeatCount != -1) {
                                            ended = true;
                                            this.resetEffects();
                                            this.pause();
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
            const epsilon = (1.0e-24);
            if (-epsilon < reverbFeedback0 && reverbFeedback0 < epsilon)
                reverbFeedback0 = 0.0;
            if (-epsilon < reverbFeedback1 && reverbFeedback1 < epsilon)
                reverbFeedback1 = 0.0;
            if (-epsilon < reverbFeedback2 && reverbFeedback2 < epsilon)
                reverbFeedback2 = 0.0;
            if (-epsilon < reverbFeedback3 && reverbFeedback3 < epsilon)
                reverbFeedback3 = 0.0;
            if (-epsilon < limit && limit < epsilon)
                limit = 0.0;
            this.stereoBufferIndex = (this.stereoBufferIndex + outputBufferLength * 2) % stereoBufferLength;
            this.chorusPhase = chorusPhase;
            this.chorusDelayPos = chorusDelayPos;
            this.reverbDelayPos = reverbDelayPos;
            this.reverbFeedback0 = reverbFeedback0;
            this.reverbFeedback1 = reverbFeedback1;
            this.reverbFeedback2 = reverbFeedback2;
            this.reverbFeedback3 = reverbFeedback3;
            this.limit = limit;
            if (playSong) {
                this.playheadInternal = (((this.tick + 1.0 - this.tickSampleCountdown / samplesPerTick) / 2.0 + this.part) / Config.partsPerBeat + this.beat) / this.song.beatsPerBar + this.bar;
            }
        }
        freeTone(tone) {
            this.tonePool.pushBack(tone);
        }
        newTone() {
            if (this.tonePool.count() > 0) {
                const tone = this.tonePool.popBack();
                tone.reset();
                tone.active = false;
                return tone;
            }
            return new Tone();
        }
        releaseTone(channel, tone) {
            this.releasedTones[channel].pushFront(tone);
        }
        freeReleasedTone(channel, toneIndex) {
            this.freeTone(this.releasedTones[channel].get(toneIndex));
            this.releasedTones[channel].remove(toneIndex);
        }
        freeAllTones() {
            while (this.liveInputTones.count() > 0) {
                this.freeTone(this.liveInputTones.popBack());
            }
            for (let i = 0; i < this.activeTones.length; i++) {
                while (this.activeTones[i].count() > 0) {
                    this.freeTone(this.activeTones[i].popBack());
                }
            }
            for (let i = 0; i < this.releasedTones.length; i++) {
                while (this.releasedTones[i].count() > 0) {
                    this.freeTone(this.releasedTones[i].popBack());
                }
            }
        }
        determineLiveInputTones(song) {
            const toneList = this.liveInputTones;
            const pitches = this.liveInputPitches;
            let toneCount = 0;
            if (this.liveInputDuration > 0) {
                const instrument = song.channels[this.liveInputChannel].instruments[song.getPatternInstrument(this.liveInputChannel, this.bar)];
                if (instrument.getChord().arpeggiates) {
                    let tone;
                    if (toneList.count() == 0) {
                        tone = this.newTone();
                        toneList.pushBack(tone);
                    }
                    else if (!instrument.getTransition().isSeamless && this.liveInputStarted) {
                        this.releaseTone(this.liveInputChannel, toneList.popFront());
                        tone = this.newTone();
                        toneList.pushBack(tone);
                    }
                    else {
                        tone = toneList.get(0);
                    }
                    toneCount = 1;
                    for (let i = 0; i < pitches.length; i++) {
                        tone.pitches[i] = pitches[i];
                    }
                    tone.pitchCount = pitches.length;
                    tone.chordSize = 1;
                    tone.instrument = instrument;
                    tone.note = tone.prevNote = tone.nextNote = null;
                }
                else {
                    for (let i = 0; i < pitches.length; i++) {
                        let tone;
                        if (toneList.count() <= i) {
                            tone = this.newTone();
                            toneList.pushBack(tone);
                        }
                        else if (!instrument.getTransition().isSeamless && this.liveInputStarted) {
                            this.releaseTone(this.liveInputChannel, toneList.get(i));
                            tone = this.newTone();
                            toneList.set(i, tone);
                        }
                        else {
                            tone = toneList.get(i);
                        }
                        toneCount++;
                        tone.pitches[0] = pitches[i];
                        tone.pitchCount = 1;
                        tone.chordSize = pitches.length;
                        tone.instrument = instrument;
                        tone.note = tone.prevNote = tone.nextNote = null;
                    }
                }
            }
            while (toneList.count() > toneCount) {
                this.releaseTone(this.liveInputChannel, toneList.popBack());
            }
            this.liveInputStarted = false;
        }
        determineCurrentActiveTones(song, channel, playSong) {
            const instrument = song.channels[channel].instruments[song.getPatternInstrument(channel, this.bar)];
            const pattern = song.getPattern(channel, this.bar);
            const time = this.part + this.beat * Config.partsPerBeat;
            let note = null;
            let prevNote = null;
            let nextNote = null;
            if (playSong && pattern != null && !song.channels[channel].muted) {
                for (let i = 0; i < pattern.notes.length; i++) {
                    if (pattern.notes[i].end <= time) {
                        prevNote = pattern.notes[i];
                    }
                    else if (pattern.notes[i].start <= time && pattern.notes[i].end > time) {
                        note = pattern.notes[i];
                    }
                    else if (pattern.notes[i].start > time) {
                        nextNote = pattern.notes[i];
                        break;
                    }
                }
            }
            const toneList = this.activeTones[channel];
            if (note != null) {
                if (prevNote != null && prevNote.end != note.start)
                    prevNote = null;
                if (nextNote != null && nextNote.start != note.end)
                    nextNote = null;
                this.syncTones(channel, toneList, instrument, note.pitches, note, prevNote, nextNote, time);
            }
            else {
                while (toneList.count() > 0) {
                    if (toneList.peakBack().instrument.getTransition().releases) {
                        this.releaseTone(channel, toneList.popBack());
                    }
                    else {
                        this.freeTone(toneList.popBack());
                    }
                }
            }
        }
        syncTones(channel, toneList, instrument, pitches, note, prevNote, nextNote, currentPart) {
            let toneCount = 0;
            if (instrument.getChord().arpeggiates) {
                let tone;
                if (toneList.count() == 0) {
                    tone = this.newTone();
                    toneList.pushBack(tone);
                }
                else {
                    tone = toneList.get(0);
                }
                toneCount = 1;
                for (let i = 0; i < pitches.length; i++) {
                    tone.pitches[i] = pitches[i];
                }
                tone.pitchCount = pitches.length;
                tone.chordSize = 1;
                tone.instrument = instrument;
                tone.note = note;
                tone.noteStart = note.start;
                tone.noteEnd = note.end;
                tone.prevNote = prevNote;
                tone.nextNote = nextNote;
                tone.prevNotePitchIndex = 0;
                tone.nextNotePitchIndex = 0;
            }
            else {
                const transition = instrument.getTransition();
                for (let i = 0; i < pitches.length; i++) {
                    const strumOffsetParts = i * instrument.getChord().strumParts;
                    let prevNoteForThisTone = (prevNote && prevNote.pitches.length > i) ? prevNote : null;
                    let noteForThisTone = note;
                    let nextNoteForThisTone = (nextNote && nextNote.pitches.length > i) ? nextNote : null;
                    let noteStart = noteForThisTone.start + strumOffsetParts;
                    if (noteStart > currentPart) {
                        if (toneList.count() > i && transition.isSeamless && prevNoteForThisTone != null) {
                            nextNoteForThisTone = noteForThisTone;
                            noteForThisTone = prevNoteForThisTone;
                            prevNoteForThisTone = null;
                            noteStart = noteForThisTone.start + strumOffsetParts;
                        }
                        else {
                            break;
                        }
                    }
                    let noteEnd = noteForThisTone.end;
                    if (transition.isSeamless && nextNoteForThisTone != null) {
                        noteEnd = Math.min(Config.partsPerBeat * this.song.beatsPerBar, noteEnd + strumOffsetParts);
                    }
                    let tone;
                    if (toneList.count() <= i) {
                        tone = this.newTone();
                        toneList.pushBack(tone);
                    }
                    else {
                        tone = toneList.get(i);
                    }
                    toneCount++;
                    tone.pitches[0] = noteForThisTone.pitches[i];
                    tone.pitchCount = 1;
                    tone.chordSize = noteForThisTone.pitches.length;
                    tone.instrument = instrument;
                    tone.note = noteForThisTone;
                    tone.noteStart = noteStart;
                    tone.noteEnd = noteEnd;
                    tone.prevNote = prevNoteForThisTone;
                    tone.nextNote = nextNoteForThisTone;
                    tone.prevNotePitchIndex = i;
                    tone.nextNotePitchIndex = i;
                }
            }
            while (toneList.count() > toneCount) {
                if (toneList.peakBack().instrument.getTransition().releases) {
                    this.releaseTone(channel, toneList.popBack());
                }
                else {
                    this.freeTone(toneList.popBack());
                }
            }
        }
        playTone(song, stereoBufferIndex, stereoBufferLength, channel, samplesPerTick, runLength, tone, released, shouldFadeOutFast) {
            Synth.computeTone(this, song, channel, samplesPerTick, runLength, tone, released, shouldFadeOutFast);
            let synthBuffer;
            switch (tone.instrument.effects) {
                case 0:
                    synthBuffer = this.samplesForNone;
                    break;
                case 1:
                    synthBuffer = this.samplesForReverb;
                    break;
                case 2:
                    synthBuffer = this.samplesForChorus;
                    break;
                case 3:
                    synthBuffer = this.samplesForChorusReverb;
                    break;
                default: throw new Error();
            }
            const synthesizer = Synth.getInstrumentSynthFunction(tone.instrument);
            synthesizer(this, synthBuffer, stereoBufferIndex, stereoBufferLength, runLength * 2, tone, tone.instrument);
        }
        static computeEnvelope(envelope, time, beats, customVolume) {
            switch (envelope.type) {
                case 0: return customVolume;
                case 1: return 1.0;
                case 4:
                    return 1.0 / (1.0 + time * envelope.speed);
                case 5:
                    return 1.0 - 1.0 / (1.0 + time * envelope.speed);
                case 6:
                    return 0.5 - Math.cos(beats * 2.0 * Math.PI * envelope.speed) * 0.5;
                case 7:
                    return 0.75 - Math.cos(beats * 2.0 * Math.PI * envelope.speed) * 0.25;
                case 2:
                    return Math.max(1.0, 2.0 - time * 10.0);
                case 3:
                    const speed = envelope.speed;
                    const attack = 0.25 / Math.sqrt(speed);
                    return time < attack ? time / attack : 1.0 / (1.0 + (time - attack) * speed);
                case 8:
                    return Math.pow(2, -envelope.speed * time);
                default: throw new Error("Unrecognized operator envelope type.");
            }
        }
        static computeChordVolume(chordSize) {
            return 1.0 / ((chordSize - 1) * 0.25 + 1.0);
        }
        static computeTone(synth, song, channel, samplesPerTick, runLength, tone, released, shouldFadeOutFast) {
            const instrument = tone.instrument;
            const transition = instrument.getTransition();
            const chord = instrument.getChord();
            const chordVolume = chord.arpeggiates ? 1 : Synth.computeChordVolume(tone.chordSize);
            const isNoiseChannel = song.getChannelIsNoise(channel);
            const intervalScale = isNoiseChannel ? Config.noiseInterval : 1;
            const secondsPerPart = Config.ticksPerPart * samplesPerTick / synth.samplesPerSecond;
            const beatsPerPart = 1.0 / Config.partsPerBeat;
            const toneWasActive = tone.active;
            const tickSampleCountdown = synth.tickSampleCountdown;
            const startRatio = 1.0 - (tickSampleCountdown) / samplesPerTick;
            const endRatio = 1.0 - (tickSampleCountdown - runLength) / samplesPerTick;
            const ticksIntoBar = (synth.beat * Config.partsPerBeat + synth.part) * Config.ticksPerPart + synth.tick;
            const partTimeTickStart = (ticksIntoBar) / Config.ticksPerPart;
            const partTimeTickEnd = (ticksIntoBar + 1) / Config.ticksPerPart;
            const partTimeStart = partTimeTickStart + (partTimeTickEnd - partTimeTickStart) * startRatio;
            const partTimeEnd = partTimeTickStart + (partTimeTickEnd - partTimeTickStart) * endRatio;
            tone.phaseDeltaScale = 0.0;
            tone.filter = 1.0;
            tone.filterScale = 1.0;
            tone.vibratoScale = 0.0;
            tone.intervalMult = 1.0;
            tone.intervalVolumeMult = 1.0;
            tone.active = false;
            const pan = (instrument.pan - Config.panCenter) / Config.panCenter;
            const maxDelay = 0.00065 * synth.samplesPerSecond;
            const delay = Math.round(-pan * maxDelay) * 2;
            const volumeL = Math.cos((1 + pan) * Math.PI * 0.25) * 1.414;
            const volumeR = Math.cos((1 - pan) * Math.PI * 0.25) * 1.414;
            const delayL = Math.max(0.0, -delay);
            const delayR = Math.max(0.0, delay);
            if (delay >= 0) {
                tone.stereoVolume1 = volumeL;
                tone.stereoVolume2 = volumeR;
                tone.stereoOffset = 0;
                tone.stereoDelay = delayR + 1;
            }
            else {
                tone.stereoVolume1 = volumeR;
                tone.stereoVolume2 = volumeL;
                tone.stereoOffset = 1;
                tone.stereoDelay = delayL - 1;
            }
            let resetPhases = true;
            let partsSinceStart = 0.0;
            let intervalStart = 0.0;
            let intervalEnd = 0.0;
            let transitionVolumeStart = 1.0;
            let transitionVolumeEnd = 1.0;
            let chordVolumeStart = chordVolume;
            let chordVolumeEnd = chordVolume;
            let customVolumeStart = 0.0;
            let customVolumeEnd = 0.0;
            let decayTimeStart = 0.0;
            let decayTimeEnd = 0.0;
            let volumeReferencePitch;
            let basePitch;
            let baseVolume;
            let pitchDamping;
            if (instrument.type == 3) {
                if (isNoiseChannel) {
                    basePitch = Config.spectrumBasePitch;
                    baseVolume = 0.6;
                }
                else {
                    basePitch = Config.keys[song.key].basePitch;
                    baseVolume = 0.3;
                }
                volumeReferencePitch = Config.spectrumBasePitch;
                pitchDamping = 28;
            }
            else if (instrument.type == 4) {
                basePitch = Config.spectrumBasePitch;
                baseVolume = 0.45;
                volumeReferencePitch = basePitch;
                pitchDamping = 48;
            }
            else if (instrument.type == 2) {
                basePitch = Config.chipNoises[instrument.chipNoise].basePitch;
                baseVolume = 0.19;
                volumeReferencePitch = basePitch;
                pitchDamping = Config.chipNoises[instrument.chipNoise].isSoft ? 24.0 : 60.0;
            }
            else if (instrument.type == 1) {
                basePitch = Config.keys[song.key].basePitch;
                baseVolume = 0.03;
                volumeReferencePitch = 16;
                pitchDamping = 48;
            }
            else if (instrument.type == 0) {
                basePitch = Config.keys[song.key].basePitch;
                baseVolume = 0.03375;
                volumeReferencePitch = 16;
                pitchDamping = 48;
            }
            else if (instrument.type == 5) {
                basePitch = Config.keys[song.key].basePitch;
                baseVolume = 0.025;
                volumeReferencePitch = 16;
                pitchDamping = 48;
            }
            else if (instrument.type == 6) {
                basePitch = Config.keys[song.key].basePitch;
                baseVolume = 0.04725;
                volumeReferencePitch = 16;
                pitchDamping = 48;
            }
            else {
                throw new Error("Unknown instrument type in computeTone.");
            }
            for (let i = 0; i < Config.operatorCount; i++) {
                tone.phaseDeltas[i] = 0.0;
                tone.volumeStarts[i] = 0.0;
                tone.volumeDeltas[i] = 0.0;
            }
            if (released) {
                const ticksSoFar = tone.noteLengthTicks + tone.ticksSinceReleased;
                const startTicksSinceReleased = tone.ticksSinceReleased + startRatio;
                const endTicksSinceReleased = tone.ticksSinceReleased + endRatio;
                const startTick = tone.noteLengthTicks + startTicksSinceReleased;
                const endTick = tone.noteLengthTicks + endTicksSinceReleased;
                const toneTransition = tone.instrument.getTransition();
                resetPhases = false;
                partsSinceStart = Math.floor(ticksSoFar / Config.ticksPerPart);
                intervalStart = intervalEnd = tone.lastInterval;
                customVolumeStart = customVolumeEnd = Synth.expressionToVolumeMult(tone.lastVolume);
                transitionVolumeStart = Synth.expressionToVolumeMult((1.0 - startTicksSinceReleased / toneTransition.releaseTicks) * 3.0);
                transitionVolumeEnd = Synth.expressionToVolumeMult((1.0 - endTicksSinceReleased / toneTransition.releaseTicks) * 3.0);
                decayTimeStart = startTick / Config.ticksPerPart;
                decayTimeEnd = endTick / Config.ticksPerPart;
                if (shouldFadeOutFast) {
                    transitionVolumeStart *= 1.0 - startRatio;
                    transitionVolumeEnd *= 1.0 - endRatio;
                }
            }
            else if (tone.note == null) {
                transitionVolumeStart = transitionVolumeEnd = 1;
                customVolumeStart = customVolumeEnd = 1;
                tone.lastInterval = 0;
                tone.lastVolume = 3;
                tone.ticksSinceReleased = 0;
                resetPhases = false;
                const heldTicksStart = tone.liveInputSamplesHeld / samplesPerTick;
                tone.liveInputSamplesHeld += runLength;
                const heldTicksEnd = tone.liveInputSamplesHeld / samplesPerTick;
                tone.noteLengthTicks = heldTicksEnd;
                const heldPartsStart = heldTicksStart / Config.ticksPerPart;
                const heldPartsEnd = heldTicksEnd / Config.ticksPerPart;
                partsSinceStart = Math.floor(heldPartsStart);
                decayTimeStart = heldPartsStart;
                decayTimeEnd = heldPartsEnd;
            }
            else {
                const note = tone.note;
                const prevNote = tone.prevNote;
                const nextNote = tone.nextNote;
                const time = synth.part + synth.beat * Config.partsPerBeat;
                const partsPerBar = Config.partsPerBeat * song.beatsPerBar;
                const noteStart = tone.noteStart;
                const noteEnd = tone.noteEnd;
                partsSinceStart = time - noteStart;
                let endPinIndex;
                for (endPinIndex = 1; endPinIndex < note.pins.length - 1; endPinIndex++) {
                    if (note.pins[endPinIndex].time + note.start > time)
                        break;
                }
                const startPin = note.pins[endPinIndex - 1];
                const endPin = note.pins[endPinIndex];
                const noteStartTick = noteStart * Config.ticksPerPart;
                const noteEndTick = noteEnd * Config.ticksPerPart;
                const noteLengthTicks = noteEndTick - noteStartTick;
                const pinStart = (note.start + startPin.time) * Config.ticksPerPart;
                const pinEnd = (note.start + endPin.time) * Config.ticksPerPart;
                tone.lastInterval = note.pins[note.pins.length - 1].interval;
                tone.lastVolume = note.pins[note.pins.length - 1].volume;
                tone.ticksSinceReleased = 0;
                tone.noteLengthTicks = noteLengthTicks;
                const tickTimeStart = time * Config.ticksPerPart + synth.tick;
                const tickTimeEnd = time * Config.ticksPerPart + synth.tick + 1;
                const noteTicksPassedTickStart = tickTimeStart - noteStartTick;
                const noteTicksPassedTickEnd = tickTimeEnd - noteStartTick;
                const pinRatioStart = Math.min(1.0, (tickTimeStart - pinStart) / (pinEnd - pinStart));
                const pinRatioEnd = Math.min(1.0, (tickTimeEnd - pinStart) / (pinEnd - pinStart));
                let customVolumeTickStart = startPin.volume + (endPin.volume - startPin.volume) * pinRatioStart;
                let customVolumeTickEnd = startPin.volume + (endPin.volume - startPin.volume) * pinRatioEnd;
                let transitionVolumeTickStart = 1.0;
                let transitionVolumeTickEnd = 1.0;
                let chordVolumeTickStart = chordVolume;
                let chordVolumeTickEnd = chordVolume;
                let intervalTickStart = startPin.interval + (endPin.interval - startPin.interval) * pinRatioStart;
                let intervalTickEnd = startPin.interval + (endPin.interval - startPin.interval) * pinRatioEnd;
                let decayTimeTickStart = partTimeTickStart - noteStart;
                let decayTimeTickEnd = partTimeTickEnd - noteStart;
                resetPhases = (tickTimeStart + startRatio - noteStartTick == 0.0) || !toneWasActive;
                const maximumSlideTicks = noteLengthTicks * 0.5;
                if (transition.isSeamless && !transition.slides && note.start == 0) {
                    resetPhases = !toneWasActive;
                }
                else if (transition.isSeamless && prevNote != null) {
                    resetPhases = !toneWasActive;
                    if (transition.slides) {
                        const slideTicks = Math.min(maximumSlideTicks, transition.slideTicks);
                        const slideRatioStartTick = Math.max(0.0, 1.0 - noteTicksPassedTickStart / slideTicks);
                        const slideRatioEndTick = Math.max(0.0, 1.0 - noteTicksPassedTickEnd / slideTicks);
                        const intervalDiff = ((prevNote.pitches[tone.prevNotePitchIndex] + prevNote.pins[prevNote.pins.length - 1].interval) - tone.pitches[0]) * 0.5;
                        const volumeDiff = (prevNote.pins[prevNote.pins.length - 1].volume - note.pins[0].volume) * 0.5;
                        const decayTimeDiff = (prevNote.end - prevNote.start) * 0.5;
                        intervalTickStart += slideRatioStartTick * intervalDiff;
                        intervalTickEnd += slideRatioEndTick * intervalDiff;
                        customVolumeTickStart += slideRatioStartTick * volumeDiff;
                        customVolumeTickEnd += slideRatioEndTick * volumeDiff;
                        decayTimeTickStart += slideRatioStartTick * decayTimeDiff;
                        decayTimeTickEnd += slideRatioEndTick * decayTimeDiff;
                        if (!chord.arpeggiates) {
                            const chordSizeDiff = (prevNote.pitches.length - tone.chordSize) * 0.5;
                            chordVolumeTickStart = Synth.computeChordVolume(tone.chordSize + slideRatioStartTick * chordSizeDiff);
                            chordVolumeTickEnd = Synth.computeChordVolume(tone.chordSize + slideRatioEndTick * chordSizeDiff);
                        }
                    }
                }
                if (transition.isSeamless && !transition.slides && note.end == partsPerBar) ;
                else if (transition.isSeamless && nextNote != null) {
                    if (transition.slides) {
                        const slideTicks = Math.min(maximumSlideTicks, transition.slideTicks);
                        const slideRatioStartTick = Math.max(0.0, 1.0 - (noteLengthTicks - noteTicksPassedTickStart) / slideTicks);
                        const slideRatioEndTick = Math.max(0.0, 1.0 - (noteLengthTicks - noteTicksPassedTickEnd) / slideTicks);
                        const intervalDiff = (nextNote.pitches[tone.nextNotePitchIndex] - (tone.pitches[0] + note.pins[note.pins.length - 1].interval)) * 0.5;
                        const volumeDiff = (nextNote.pins[0].volume - note.pins[note.pins.length - 1].volume) * 0.5;
                        const decayTimeDiff = -(noteEnd - noteStart) * 0.5;
                        intervalTickStart += slideRatioStartTick * intervalDiff;
                        intervalTickEnd += slideRatioEndTick * intervalDiff;
                        customVolumeTickStart += slideRatioStartTick * volumeDiff;
                        customVolumeTickEnd += slideRatioEndTick * volumeDiff;
                        decayTimeTickStart += slideRatioStartTick * decayTimeDiff;
                        decayTimeTickEnd += slideRatioEndTick * decayTimeDiff;
                        if (!chord.arpeggiates) {
                            const chordSizeDiff = (nextNote.pitches.length - tone.chordSize) * 0.5;
                            chordVolumeTickStart = Synth.computeChordVolume(tone.chordSize + slideRatioStartTick * chordSizeDiff);
                            chordVolumeTickEnd = Synth.computeChordVolume(tone.chordSize + slideRatioEndTick * chordSizeDiff);
                        }
                    }
                }
                else if (!transition.releases) {
                    const releaseTicks = transition.releaseTicks;
                    if (releaseTicks > 0.0) {
                        transitionVolumeTickStart *= Math.min(1.0, (noteLengthTicks - noteTicksPassedTickStart) / releaseTicks);
                        transitionVolumeTickEnd *= Math.min(1.0, (noteLengthTicks - noteTicksPassedTickEnd) / releaseTicks);
                    }
                }
                intervalStart = intervalTickStart + (intervalTickEnd - intervalTickStart) * startRatio;
                intervalEnd = intervalTickStart + (intervalTickEnd - intervalTickStart) * endRatio;
                customVolumeStart = Synth.expressionToVolumeMult(customVolumeTickStart + (customVolumeTickEnd - customVolumeTickStart) * startRatio);
                customVolumeEnd = Synth.expressionToVolumeMult(customVolumeTickStart + (customVolumeTickEnd - customVolumeTickStart) * endRatio);
                transitionVolumeStart = transitionVolumeTickStart + (transitionVolumeTickEnd - transitionVolumeTickStart) * startRatio;
                transitionVolumeEnd = transitionVolumeTickStart + (transitionVolumeTickEnd - transitionVolumeTickStart) * endRatio;
                chordVolumeStart = chordVolumeTickStart + (chordVolumeTickEnd - chordVolumeTickStart) * startRatio;
                chordVolumeEnd = chordVolumeTickStart + (chordVolumeTickEnd - chordVolumeTickStart) * endRatio;
                decayTimeStart = decayTimeTickStart + (decayTimeTickEnd - decayTimeTickStart) * startRatio;
                decayTimeEnd = decayTimeTickStart + (decayTimeTickEnd - decayTimeTickStart) * endRatio;
            }
            const sampleTime = 1.0 / synth.samplesPerSecond;
            tone.active = true;
            if (instrument.type == 0 || instrument.type == 1 || instrument.type == 5 || instrument.type == 6) {
                const lfoEffectStart = Synth.getLFOAmplitude(instrument, secondsPerPart * partTimeStart);
                const lfoEffectEnd = Synth.getLFOAmplitude(instrument, secondsPerPart * partTimeEnd);
                const vibratoScale = (partsSinceStart < Config.vibratos[instrument.vibrato].delayParts) ? 0.0 : Config.vibratos[instrument.vibrato].amplitude;
                const vibratoStart = vibratoScale * lfoEffectStart;
                const vibratoEnd = vibratoScale * lfoEffectEnd;
                intervalStart += vibratoStart;
                intervalEnd += vibratoEnd;
            }
            if (!transition.isSeamless || (!(!transition.slides && tone.note != null && tone.note.start == 0) && !(tone.prevNote != null))) {
                const attackSeconds = transition.attackSeconds;
                if (attackSeconds > 0.0) {
                    transitionVolumeStart *= Math.min(1.0, secondsPerPart * decayTimeStart / attackSeconds);
                    transitionVolumeEnd *= Math.min(1.0, secondsPerPart * decayTimeEnd / attackSeconds);
                }
            }
            const instrumentVolumeMult = Synth.instrumentVolumeToVolumeMult(instrument.volume);
            if (instrument.type == 4) {
                tone.drumsetPitch = tone.pitches[0];
                if (tone.note != null)
                    tone.drumsetPitch += tone.note.pickMainInterval();
                tone.drumsetPitch = Math.max(0, Math.min(Config.drumCount - 1, tone.drumsetPitch));
            }
            const cutoffOctaves = instrument.getFilterCutoffOctaves();
            const filterEnvelope = (instrument.type == 4) ? instrument.getDrumsetEnvelope(tone.drumsetPitch) : instrument.getFilterEnvelope();
            const filterCutoffHz = Config.filterCutoffMaxHz * Math.pow(2.0, cutoffOctaves);
            const filterBase = 2.0 * Math.sin(Math.PI * filterCutoffHz / synth.samplesPerSecond);
            const filterMin = 2.0 * Math.sin(Math.PI * Config.filterCutoffMinHz / synth.samplesPerSecond);
            tone.filter = filterBase * Synth.computeEnvelope(filterEnvelope, secondsPerPart * decayTimeStart, beatsPerPart * partTimeStart, customVolumeStart);
            let endFilter = filterBase * Synth.computeEnvelope(filterEnvelope, secondsPerPart * decayTimeEnd, beatsPerPart * partTimeEnd, customVolumeEnd);
            tone.filter = Math.min(Config.filterMax, Math.max(filterMin, tone.filter));
            endFilter = Math.min(Config.filterMax, Math.max(filterMin, endFilter));
            tone.filterScale = Math.pow(endFilter / tone.filter, 1.0 / runLength);
            let filterVolume = Math.pow(0.5, cutoffOctaves * 0.35);
            if (instrument.filterResonance > 0) {
                filterVolume = Math.pow(filterVolume, 1.7) * Math.pow(0.5, 0.125 * (instrument.filterResonance - 1));
            }
            if (filterEnvelope.type == 8) {
                filterVolume *= (1.25 + .025 * filterEnvelope.speed);
            }
            else if (filterEnvelope.type == 4) {
                filterVolume *= (1 + .02 * filterEnvelope.speed);
            }
            if (resetPhases) {
                tone.reset();
            }
            if (instrument.type == 1) {
                let sineVolumeBoost = 1.0;
                let totalCarrierVolume = 0.0;
                let arpeggioInterval = 0;
                if (tone.pitchCount > 1 && !chord.harmonizes) {
                    const arpeggio = Math.floor((synth.tick + synth.part * Config.ticksPerPart) / Config.rhythms[song.rhythm].ticksPerArpeggio);
                    arpeggioInterval = tone.pitches[getArpeggioPitchIndex(tone.pitchCount, song.rhythm, arpeggio)] - tone.pitches[0];
                }
                const carrierCount = Config.algorithms[instrument.algorithm].carrierCount;
                for (let i = 0; i < Config.operatorCount; i++) {
                    const associatedCarrierIndex = Config.algorithms[instrument.algorithm].associatedCarrier[i] - 1;
                    const pitch = tone.pitches[!chord.harmonizes ? 0 : ((i < tone.pitchCount) ? i : ((associatedCarrierIndex < tone.pitchCount) ? associatedCarrierIndex : 0))];
                    const freqMult = Config.operatorFrequencies[instrument.operators[i].frequency].mult;
                    const interval = Config.operatorCarrierInterval[associatedCarrierIndex] + arpeggioInterval;
                    const startPitch = basePitch + (pitch + intervalStart) * intervalScale + interval;
                    const startFreq = freqMult * (Instrument.frequencyFromPitch(startPitch)) + Config.operatorFrequencies[instrument.operators[i].frequency].hzOffset;
                    tone.phaseDeltas[i] = startFreq * sampleTime * Config.sineWaveLength;
                    const amplitudeCurve = Synth.operatorAmplitudeCurve(instrument.operators[i].amplitude);
                    const amplitudeMult = amplitudeCurve * Config.operatorFrequencies[instrument.operators[i].frequency].amplitudeSign;
                    let volumeStart = amplitudeMult;
                    let volumeEnd = amplitudeMult;
                    if (i < carrierCount) {
                        const endPitch = basePitch + (pitch + intervalEnd) * intervalScale + interval;
                        const pitchVolumeStart = Math.pow(2.0, -(startPitch - volumeReferencePitch) / pitchDamping);
                        const pitchVolumeEnd = Math.pow(2.0, -(endPitch - volumeReferencePitch) / pitchDamping);
                        volumeStart *= pitchVolumeStart;
                        volumeEnd *= pitchVolumeEnd;
                        totalCarrierVolume += amplitudeCurve;
                    }
                    else {
                        volumeStart *= Config.sineWaveLength * 1.5;
                        volumeEnd *= Config.sineWaveLength * 1.5;
                        sineVolumeBoost *= 1.0 - Math.min(1.0, instrument.operators[i].amplitude / 15);
                    }
                    const operatorEnvelope = Config.envelopes[instrument.operators[i].envelope];
                    volumeStart *= Synth.computeEnvelope(operatorEnvelope, secondsPerPart * decayTimeStart, beatsPerPart * partTimeStart, customVolumeStart);
                    volumeEnd *= Synth.computeEnvelope(operatorEnvelope, secondsPerPart * decayTimeEnd, beatsPerPart * partTimeEnd, customVolumeEnd);
                    tone.volumeStarts[i] = volumeStart;
                    tone.volumeDeltas[i] = (volumeEnd - volumeStart) / runLength;
                }
                const feedbackAmplitude = Config.sineWaveLength * 0.3 * instrument.feedbackAmplitude / 15.0;
                const feedbackEnvelope = Config.envelopes[instrument.feedbackEnvelope];
                let feedbackStart = feedbackAmplitude * Synth.computeEnvelope(feedbackEnvelope, secondsPerPart * decayTimeStart, beatsPerPart * partTimeStart, customVolumeStart);
                let feedbackEnd = feedbackAmplitude * Synth.computeEnvelope(feedbackEnvelope, secondsPerPart * decayTimeEnd, beatsPerPart * partTimeEnd, customVolumeEnd);
                tone.feedbackMult = feedbackStart;
                tone.feedbackDelta = (feedbackEnd - tone.feedbackMult) / runLength;
                const volumeMult = baseVolume * instrumentVolumeMult;
                tone.volumeStart = filterVolume * volumeMult * transitionVolumeStart * chordVolumeStart;
                const volumeEnd = filterVolume * volumeMult * transitionVolumeEnd * chordVolumeEnd;
                tone.volumeDelta = (volumeEnd - tone.volumeStart) / runLength;
                sineVolumeBoost *= (Math.pow(2.0, (2.0 - 1.4 * instrument.feedbackAmplitude / 15.0)) - 1.0) / 3.0;
                sineVolumeBoost *= 1.0 - Math.min(1.0, Math.max(0.0, totalCarrierVolume - 1) / 2.0);
                tone.volumeStart *= 1.0 + sineVolumeBoost * 3.0;
                tone.volumeDelta *= 1.0 + sineVolumeBoost * 3.0;
            }
            else {
                let pitch = tone.pitches[0];
                if (tone.pitchCount > 1) {
                    const arpeggio = Math.floor((synth.tick + synth.part * Config.ticksPerPart) / Config.rhythms[song.rhythm].ticksPerArpeggio);
                    if (chord.harmonizes) {
                        const intervalOffset = tone.pitches[1 + getArpeggioPitchIndex(tone.pitchCount - 1, song.rhythm, arpeggio)] - tone.pitches[0];
                        tone.intervalMult = Math.pow(2.0, intervalOffset / 12.0);
                        tone.intervalVolumeMult = Math.pow(2.0, -intervalOffset / pitchDamping);
                    }
                    else {
                        pitch = tone.pitches[getArpeggioPitchIndex(tone.pitchCount, song.rhythm, arpeggio)];
                    }
                }
                const startPitch = basePitch + (pitch + intervalStart) * intervalScale;
                const endPitch = basePitch + (pitch + intervalEnd) * intervalScale;
                const startFreq = Instrument.frequencyFromPitch(startPitch);
                const pitchVolumeStart = Math.pow(2.0, -(startPitch - volumeReferencePitch) / pitchDamping);
                const pitchVolumeEnd = Math.pow(2.0, -(endPitch - volumeReferencePitch) / pitchDamping);
                let settingsVolumeMult = baseVolume * filterVolume;
                if (instrument.type == 2) {
                    settingsVolumeMult *= Config.chipNoises[instrument.chipNoise].volume;
                }
                if (instrument.type == 0) {
                    settingsVolumeMult *= Config.chipWaves[instrument.chipWave].volume;
                }
                if (instrument.type == 0 || instrument.type == 5) {
                    settingsVolumeMult *= Config.intervals[instrument.interval].volume;
                }
                if (instrument.type == 6) {
                    const pulseEnvelope = Config.envelopes[instrument.pulseEnvelope];
                    const basePulseWidth = Math.pow(0.5, (Config.pulseWidthRange - instrument.pulseWidth - 1) * 0.5) * 0.5;
                    const pulseWidthStart = basePulseWidth * Synth.computeEnvelope(pulseEnvelope, secondsPerPart * decayTimeStart, beatsPerPart * partTimeStart, customVolumeStart);
                    const pulseWidthEnd = basePulseWidth * Synth.computeEnvelope(pulseEnvelope, secondsPerPart * decayTimeEnd, beatsPerPart * partTimeEnd, customVolumeEnd);
                    tone.pulseWidth = pulseWidthStart;
                    tone.pulseWidthDelta = (pulseWidthEnd - pulseWidthStart) / runLength;
                }
                tone.phaseDeltas[0] = startFreq * sampleTime;
                tone.volumeStart = transitionVolumeStart * chordVolumeStart * pitchVolumeStart * settingsVolumeMult * instrumentVolumeMult;
                let volumeEnd = transitionVolumeEnd * chordVolumeEnd * pitchVolumeEnd * settingsVolumeMult * instrumentVolumeMult;
                if (filterEnvelope.type != 0 && (instrument.type != 6 || Config.envelopes[instrument.pulseEnvelope].type != 0)) {
                    tone.volumeStart *= customVolumeStart;
                    volumeEnd *= customVolumeEnd;
                }
                tone.volumeDelta = (volumeEnd - tone.volumeStart) / runLength;
            }
            tone.phaseDeltaScale = Math.pow(2.0, ((intervalEnd - intervalStart) * intervalScale / 12.0) / runLength);
        }
        static getLFOAmplitude(instrument, secondsIntoBar) {
            let effect = 0.0;
            for (const vibratoPeriodSeconds of Config.vibratos[instrument.vibrato].periodsSeconds) {
                effect += Math.sin(Math.PI * 2.0 * secondsIntoBar / vibratoPeriodSeconds);
            }
            return effect;
        }
        static getInstrumentSynthFunction(instrument) {
            if (instrument.type == 1) {
                const fingerprint = instrument.algorithm + "_" + instrument.feedbackType;
                if (Synth.fmSynthFunctionCache[fingerprint] == undefined) {
                    const synthSource = [];
                    for (const line of Synth.fmSourceTemplate) {
                        if (line.indexOf("// CARRIER OUTPUTS") != -1) {
                            const outputs = [];
                            for (let j = 0; j < Config.algorithms[instrument.algorithm].carrierCount; j++) {
                                outputs.push("operator" + j + "Scaled");
                            }
                            synthSource.push(line.replace("/*operator#Scaled*/", outputs.join(" + ")));
                        }
                        else if (line.indexOf("// INSERT OPERATOR COMPUTATION HERE") != -1) {
                            for (let j = Config.operatorCount - 1; j >= 0; j--) {
                                for (const operatorLine of Synth.operatorSourceTemplate) {
                                    if (operatorLine.indexOf("/* + operator@Scaled*/") != -1) {
                                        let modulators = "";
                                        for (const modulatorNumber of Config.algorithms[instrument.algorithm].modulatedBy[j]) {
                                            modulators += " + operator" + (modulatorNumber - 1) + "Scaled";
                                        }
                                        const feedbackIndices = Config.feedbacks[instrument.feedbackType].indices[j];
                                        if (feedbackIndices.length > 0) {
                                            modulators += " + feedbackMult * (";
                                            const feedbacks = [];
                                            for (const modulatorNumber of feedbackIndices) {
                                                feedbacks.push("operator" + (modulatorNumber - 1) + "Output");
                                            }
                                            modulators += feedbacks.join(" + ") + ")";
                                        }
                                        synthSource.push(operatorLine.replace(/\#/g, j + "").replace("/* + operator@Scaled*/", modulators));
                                    }
                                    else {
                                        synthSource.push(operatorLine.replace(/\#/g, j + ""));
                                    }
                                }
                            }
                        }
                        else if (line.indexOf("#") != -1) {
                            for (let j = 0; j < Config.operatorCount; j++) {
                                synthSource.push(line.replace(/\#/g, j + ""));
                            }
                        }
                        else {
                            synthSource.push(line);
                        }
                    }
                    Synth.fmSynthFunctionCache[fingerprint] = new Function("synth", "data", "stereoBufferIndex", "stereoBufferLength", "runLength", "tone", "instrument", synthSource.join("\n"));
                }
                return Synth.fmSynthFunctionCache[fingerprint];
            }
            else if (instrument.type == 0) {
                return Synth.chipSynth;
            }
            else if (instrument.type == 5) {
                return Synth.harmonicsSynth;
            }
            else if (instrument.type == 6) {
                return Synth.pulseWidthSynth;
            }
            else if (instrument.type == 2) {
                return Synth.noiseSynth;
            }
            else if (instrument.type == 3) {
                return Synth.spectrumSynth;
            }
            else if (instrument.type == 4) {
                return Synth.drumsetSynth;
            }
            else {
                throw new Error("Unrecognized instrument type: " + instrument.type);
            }
        }
        static chipSynth(synth, data, stereoBufferIndex, stereoBufferLength, runLength, tone, instrument) {
            const wave = Config.chipWaves[instrument.chipWave].samples;
            const waveLength = +wave.length - 1;
            const intervalA = +Math.pow(2.0, (Config.intervals[instrument.interval].offset + Config.intervals[instrument.interval].spread) / 12.0);
            const intervalB = Math.pow(2.0, (Config.intervals[instrument.interval].offset - Config.intervals[instrument.interval].spread) / 12.0) * tone.intervalMult;
            const intervalSign = tone.intervalVolumeMult * Config.intervals[instrument.interval].sign;
            if (instrument.interval == 0 && !instrument.getChord().customInterval)
                tone.phases[1] = tone.phases[0];
            const deltaRatio = intervalB / intervalA;
            let phaseDeltaA = tone.phaseDeltas[0] * intervalA * waveLength;
            let phaseDeltaB = phaseDeltaA * deltaRatio;
            const phaseDeltaScale = +tone.phaseDeltaScale;
            let volume = +tone.volumeStart;
            const volumeDelta = +tone.volumeDelta;
            let phaseA = (tone.phases[0] % 1) * waveLength;
            let phaseB = (tone.phases[1] % 1) * waveLength;
            let filter1 = +tone.filter;
            let filter2 = instrument.getFilterIsFirstOrder() ? 1.0 : filter1;
            const filterScale1 = +tone.filterScale;
            const filterScale2 = instrument.getFilterIsFirstOrder() ? 1.0 : filterScale1;
            const filterResonance = Config.filterMaxResonance * Math.pow(Math.max(0, instrument.getFilterResonance() - 1) / (Config.filterResonanceRange - 2), 0.5);
            let filterSample0 = +tone.filterSample0;
            let filterSample1 = +tone.filterSample1;
            const phaseAInt = phaseA | 0;
            const phaseBInt = phaseB | 0;
            const indexA = phaseAInt % waveLength;
            const indexB = phaseBInt % waveLength;
            const phaseRatioA = phaseA - phaseAInt;
            const phaseRatioB = phaseB - phaseBInt;
            let prevWaveIntegralA = wave[indexA];
            let prevWaveIntegralB = wave[indexB];
            prevWaveIntegralA += (wave[indexA + 1] - prevWaveIntegralA) * phaseRatioA;
            prevWaveIntegralB += (wave[indexB + 1] - prevWaveIntegralB) * phaseRatioB;
            const stopIndex = stereoBufferIndex + runLength;
            stereoBufferIndex += tone.stereoOffset;
            const stereoVolume1 = tone.stereoVolume1;
            const stereoVolume2 = tone.stereoVolume2;
            const stereoDelay = tone.stereoDelay;
            while (stereoBufferIndex < stopIndex) {
                phaseA += phaseDeltaA;
                phaseB += phaseDeltaB;
                const phaseAInt = phaseA | 0;
                const phaseBInt = phaseB | 0;
                const indexA = phaseAInt % waveLength;
                const indexB = phaseBInt % waveLength;
                let nextWaveIntegralA = wave[indexA];
                let nextWaveIntegralB = wave[indexB];
                const phaseRatioA = phaseA - phaseAInt;
                const phaseRatioB = phaseB - phaseBInt;
                nextWaveIntegralA += (wave[indexA + 1] - nextWaveIntegralA) * phaseRatioA;
                nextWaveIntegralB += (wave[indexB + 1] - nextWaveIntegralB) * phaseRatioB;
                let waveA = (nextWaveIntegralA - prevWaveIntegralA) / phaseDeltaA;
                let waveB = (nextWaveIntegralB - prevWaveIntegralB) / phaseDeltaB;
                prevWaveIntegralA = nextWaveIntegralA;
                prevWaveIntegralB = nextWaveIntegralB;
                const combinedWave = (waveA + waveB * intervalSign);
                const feedback = filterResonance + filterResonance / (1.0 - filter1);
                filterSample0 += filter1 * (combinedWave - filterSample0 + feedback * (filterSample0 - filterSample1));
                filterSample1 += filter2 * (filterSample0 - filterSample1);
                filter1 *= filterScale1;
                filter2 *= filterScale2;
                phaseDeltaA *= phaseDeltaScale;
                phaseDeltaB *= phaseDeltaScale;
                const output = filterSample1 * volume;
                volume += volumeDelta;
                data[stereoBufferIndex] += output * stereoVolume1;
                data[(stereoBufferIndex + stereoDelay) % stereoBufferLength] += output * stereoVolume2;
                stereoBufferIndex += 2;
            }
            tone.phases[0] = phaseA / waveLength;
            tone.phases[1] = phaseB / waveLength;
            const epsilon = (1.0e-24);
            if (-epsilon < filterSample0 && filterSample0 < epsilon)
                filterSample0 = 0.0;
            if (-epsilon < filterSample1 && filterSample1 < epsilon)
                filterSample1 = 0.0;
            tone.filterSample0 = filterSample0;
            tone.filterSample1 = filterSample1;
        }
        static harmonicsSynth(synth, data, stereoBufferIndex, stereoBufferLength, runLength, tone, instrument) {
            const wave = instrument.harmonicsWave.getCustomWave();
            const waveLength = +wave.length - 1;
            const intervalA = +Math.pow(2.0, (Config.intervals[instrument.interval].offset + Config.intervals[instrument.interval].spread) / 12.0);
            const intervalB = Math.pow(2.0, (Config.intervals[instrument.interval].offset - Config.intervals[instrument.interval].spread) / 12.0) * tone.intervalMult;
            const intervalSign = tone.intervalVolumeMult * Config.intervals[instrument.interval].sign;
            if (instrument.interval == 0 && !instrument.getChord().customInterval)
                tone.phases[1] = tone.phases[0];
            const deltaRatio = intervalB / intervalA;
            let phaseDeltaA = tone.phaseDeltas[0] * intervalA * waveLength;
            let phaseDeltaB = phaseDeltaA * deltaRatio;
            const phaseDeltaScale = +tone.phaseDeltaScale;
            let volume = +tone.volumeStart;
            const volumeDelta = +tone.volumeDelta;
            let phaseA = (tone.phases[0] % 1) * waveLength;
            let phaseB = (tone.phases[1] % 1) * waveLength;
            let filter1 = +tone.filter;
            let filter2 = instrument.getFilterIsFirstOrder() ? 1.0 : filter1;
            const filterScale1 = +tone.filterScale;
            const filterScale2 = instrument.getFilterIsFirstOrder() ? 1.0 : filterScale1;
            const filterResonance = Config.filterMaxResonance * Math.pow(Math.max(0, instrument.getFilterResonance() - 1) / (Config.filterResonanceRange - 2), 0.5);
            let filterSample0 = +tone.filterSample0;
            let filterSample1 = +tone.filterSample1;
            const phaseAInt = phaseA | 0;
            const phaseBInt = phaseB | 0;
            const indexA = phaseAInt % waveLength;
            const indexB = phaseBInt % waveLength;
            const phaseRatioA = phaseA - phaseAInt;
            const phaseRatioB = phaseB - phaseBInt;
            let prevWaveIntegralA = wave[indexA];
            let prevWaveIntegralB = wave[indexB];
            prevWaveIntegralA += (wave[indexA + 1] - prevWaveIntegralA) * phaseRatioA;
            prevWaveIntegralB += (wave[indexB + 1] - prevWaveIntegralB) * phaseRatioB;
            const stopIndex = stereoBufferIndex + runLength;
            stereoBufferIndex += tone.stereoOffset;
            const stereoVolume1 = tone.stereoVolume1;
            const stereoVolume2 = tone.stereoVolume2;
            const stereoDelay = tone.stereoDelay;
            while (stereoBufferIndex < stopIndex) {
                phaseA += phaseDeltaA;
                phaseB += phaseDeltaB;
                const phaseAInt = phaseA | 0;
                const phaseBInt = phaseB | 0;
                const indexA = phaseAInt % waveLength;
                const indexB = phaseBInt % waveLength;
                let nextWaveIntegralA = wave[indexA];
                let nextWaveIntegralB = wave[indexB];
                const phaseRatioA = phaseA - phaseAInt;
                const phaseRatioB = phaseB - phaseBInt;
                nextWaveIntegralA += (wave[indexA + 1] - nextWaveIntegralA) * phaseRatioA;
                nextWaveIntegralB += (wave[indexB + 1] - nextWaveIntegralB) * phaseRatioB;
                let waveA = (nextWaveIntegralA - prevWaveIntegralA) / phaseDeltaA;
                let waveB = (nextWaveIntegralB - prevWaveIntegralB) / phaseDeltaB;
                prevWaveIntegralA = nextWaveIntegralA;
                prevWaveIntegralB = nextWaveIntegralB;
                const combinedWave = (waveA + waveB * intervalSign);
                const feedback = filterResonance + filterResonance / (1.0 - filter1);
                filterSample0 += filter1 * (combinedWave - filterSample0 + feedback * (filterSample0 - filterSample1));
                filterSample1 += filter2 * (filterSample0 - filterSample1);
                filter1 *= filterScale1;
                filter2 *= filterScale2;
                phaseDeltaA *= phaseDeltaScale;
                phaseDeltaB *= phaseDeltaScale;
                const output = filterSample1 * volume;
                volume += volumeDelta;
                data[stereoBufferIndex] += output * stereoVolume1;
                data[(stereoBufferIndex + stereoDelay) % stereoBufferLength] += output * stereoVolume2;
                stereoBufferIndex += 2;
            }
            tone.phases[0] = phaseA / waveLength;
            tone.phases[1] = phaseB / waveLength;
            const epsilon = (1.0e-24);
            if (-epsilon < filterSample0 && filterSample0 < epsilon)
                filterSample0 = 0.0;
            if (-epsilon < filterSample1 && filterSample1 < epsilon)
                filterSample1 = 0.0;
            tone.filterSample0 = filterSample0;
            tone.filterSample1 = filterSample1;
        }
        static pulseWidthSynth(synth, data, stereoBufferIndex, stereoBufferLength, runLength, tone, instrument) {
            let phaseDelta = tone.phaseDeltas[0];
            const phaseDeltaScale = +tone.phaseDeltaScale;
            let volume = +tone.volumeStart;
            const volumeDelta = +tone.volumeDelta;
            let phase = (tone.phases[0] % 1);
            let pulseWidth = tone.pulseWidth;
            const pulseWidthDelta = tone.pulseWidthDelta;
            let filter1 = +tone.filter;
            let filter2 = instrument.getFilterIsFirstOrder() ? 1.0 : filter1;
            const filterScale1 = +tone.filterScale;
            const filterScale2 = instrument.getFilterIsFirstOrder() ? 1.0 : filterScale1;
            const filterResonance = Config.filterMaxResonance * Math.pow(Math.max(0, instrument.getFilterResonance() - 1) / (Config.filterResonanceRange - 2), 0.5);
            let filterSample0 = +tone.filterSample0;
            let filterSample1 = +tone.filterSample1;
            const stopIndex = stereoBufferIndex + runLength;
            stereoBufferIndex += tone.stereoOffset;
            const stereoVolume1 = tone.stereoVolume1;
            const stereoVolume2 = tone.stereoVolume2;
            const stereoDelay = tone.stereoDelay;
            while (stereoBufferIndex < stopIndex) {
                const sawPhaseA = phase % 1;
                const sawPhaseB = (phase + pulseWidth) % 1;
                let pulseWave = sawPhaseB - sawPhaseA;
                if (sawPhaseA < phaseDelta) {
                    var t = sawPhaseA / phaseDelta;
                    pulseWave += (t + t - t * t - 1) * 0.5;
                }
                else if (sawPhaseA > 1.0 - phaseDelta) {
                    var t = (sawPhaseA - 1.0) / phaseDelta;
                    pulseWave += (t + t + t * t + 1) * 0.5;
                }
                if (sawPhaseB < phaseDelta) {
                    var t = sawPhaseB / phaseDelta;
                    pulseWave -= (t + t - t * t - 1) * 0.5;
                }
                else if (sawPhaseB > 1.0 - phaseDelta) {
                    var t = (sawPhaseB - 1.0) / phaseDelta;
                    pulseWave -= (t + t + t * t + 1) * 0.5;
                }
                const feedback = filterResonance + filterResonance / (1.0 - filter1);
                filterSample0 += filter1 * (pulseWave - filterSample0 + feedback * (filterSample0 - filterSample1));
                filterSample1 += filter2 * (filterSample0 - filterSample1);
                filter1 *= filterScale1;
                filter2 *= filterScale2;
                phase += phaseDelta;
                phaseDelta *= phaseDeltaScale;
                pulseWidth += pulseWidthDelta;
                const output = filterSample1 * volume;
                volume += volumeDelta;
                data[stereoBufferIndex] += output * stereoVolume1;
                data[(stereoBufferIndex + stereoDelay) % stereoBufferLength] += output * stereoVolume2;
                stereoBufferIndex += 2;
            }
            tone.phases[0] = phase;
            const epsilon = (1.0e-24);
            if (-epsilon < filterSample0 && filterSample0 < epsilon)
                filterSample0 = 0.0;
            if (-epsilon < filterSample1 && filterSample1 < epsilon)
                filterSample1 = 0.0;
            tone.filterSample0 = filterSample0;
            tone.filterSample1 = filterSample1;
        }
        static noiseSynth(synth, data, stereoBufferIndex, stereoBufferLength, runLength, tone, instrument) {
            let wave = instrument.getDrumWave();
            let phaseDelta = +tone.phaseDeltas[0];
            const phaseDeltaScale = +tone.phaseDeltaScale;
            let volume = +tone.volumeStart;
            const volumeDelta = +tone.volumeDelta;
            let phase = (tone.phases[0] % 1) * Config.chipNoiseLength;
            if (tone.phases[0] == 0) {
                phase = Math.random() * Config.chipNoiseLength;
            }
            let sample = +tone.sample;
            let filter1 = +tone.filter;
            let filter2 = instrument.getFilterIsFirstOrder() ? 1.0 : filter1;
            const filterScale1 = +tone.filterScale;
            const filterScale2 = instrument.getFilterIsFirstOrder() ? 1.0 : filterScale1;
            const filterResonance = Config.filterMaxResonance * Math.pow(Math.max(0, instrument.getFilterResonance() - 1) / (Config.filterResonanceRange - 2), 0.5);
            let filterSample0 = +tone.filterSample0;
            let filterSample1 = +tone.filterSample1;
            const pitchRelativefilter = Math.min(1.0, tone.phaseDeltas[0] * Config.chipNoises[instrument.chipNoise].pitchFilterMult);
            const stopIndex = stereoBufferIndex + runLength;
            stereoBufferIndex += tone.stereoOffset;
            const stereoVolume1 = tone.stereoVolume1;
            const stereoVolume2 = tone.stereoVolume2;
            const stereoDelay = tone.stereoDelay;
            while (stereoBufferIndex < stopIndex) {
                const waveSample = wave[phase & 0x7fff];
                sample += (waveSample - sample) * pitchRelativefilter;
                const feedback = filterResonance + filterResonance / (1.0 - filter1);
                filterSample0 += filter1 * (sample - filterSample0 + feedback * (filterSample0 - filterSample1));
                filterSample1 += filter2 * (filterSample0 - filterSample1);
                phase += phaseDelta;
                filter1 *= filterScale1;
                filter2 *= filterScale2;
                phaseDelta *= phaseDeltaScale;
                const output = filterSample1 * volume;
                volume += volumeDelta;
                data[stereoBufferIndex] += output * stereoVolume1;
                data[(stereoBufferIndex + stereoDelay) % stereoBufferLength] += output * stereoVolume2;
                stereoBufferIndex += 2;
            }
            tone.phases[0] = phase / Config.chipNoiseLength;
            tone.sample = sample;
            const epsilon = (1.0e-24);
            if (-epsilon < filterSample0 && filterSample0 < epsilon)
                filterSample0 = 0.0;
            if (-epsilon < filterSample1 && filterSample1 < epsilon)
                filterSample1 = 0.0;
            tone.filterSample0 = filterSample0;
            tone.filterSample1 = filterSample1;
        }
        static spectrumSynth(synth, data, stereoBufferIndex, stereoBufferLength, runLength, tone, instrument) {
            let wave = instrument.getDrumWave();
            let phaseDelta = tone.phaseDeltas[0] * (1 << 7);
            const phaseDeltaScale = +tone.phaseDeltaScale;
            let volume = +tone.volumeStart;
            const volumeDelta = +tone.volumeDelta;
            let sample = +tone.sample;
            let filter1 = +tone.filter;
            let filter2 = instrument.getFilterIsFirstOrder() ? 1.0 : filter1;
            const filterScale1 = +tone.filterScale;
            const filterScale2 = instrument.getFilterIsFirstOrder() ? 1.0 : filterScale1;
            const filterResonance = Config.filterMaxResonance * Math.pow(Math.max(0, instrument.getFilterResonance() - 1) / (Config.filterResonanceRange - 2), 0.5);
            let filterSample0 = +tone.filterSample0;
            let filterSample1 = +tone.filterSample1;
            let phase = (tone.phases[0] % 1) * Config.chipNoiseLength;
            if (tone.phases[0] == 0)
                phase = Synth.findRandomZeroCrossing(wave) + phaseDelta;
            const pitchRelativefilter = Math.min(1.0, phaseDelta);
            const stopIndex = stereoBufferIndex + runLength;
            stereoBufferIndex += tone.stereoOffset;
            const stereoVolume1 = tone.stereoVolume1;
            const stereoVolume2 = tone.stereoVolume2;
            const stereoDelay = tone.stereoDelay;
            while (stereoBufferIndex < stopIndex) {
                const phaseInt = phase | 0;
                const index = phaseInt & 0x7fff;
                let waveSample = wave[index];
                const phaseRatio = phase - phaseInt;
                waveSample += (wave[index + 1] - waveSample) * phaseRatio;
                sample += (waveSample - sample) * pitchRelativefilter;
                const feedback = filterResonance + filterResonance / (1.0 - filter1);
                filterSample0 += filter1 * (sample - filterSample0 + feedback * (filterSample0 - filterSample1));
                filterSample1 += filter2 * (filterSample0 - filterSample1);
                phase += phaseDelta;
                filter1 *= filterScale1;
                filter2 *= filterScale2;
                phaseDelta *= phaseDeltaScale;
                const output = filterSample1 * volume;
                volume += volumeDelta;
                data[stereoBufferIndex] += output * stereoVolume1;
                data[(stereoBufferIndex + stereoDelay) % stereoBufferLength] += output * stereoVolume2;
                stereoBufferIndex += 2;
            }
            tone.phases[0] = phase / Config.chipNoiseLength;
            tone.sample = sample;
            const epsilon = (1.0e-24);
            if (-epsilon < filterSample0 && filterSample0 < epsilon)
                filterSample0 = 0.0;
            if (-epsilon < filterSample1 && filterSample1 < epsilon)
                filterSample1 = 0.0;
            tone.filterSample0 = filterSample0;
            tone.filterSample1 = filterSample1;
        }
        static drumsetSynth(synth, data, stereoBufferIndex, stereoBufferLength, runLength, tone, instrument) {
            let wave = instrument.getDrumsetWave(tone.drumsetPitch);
            let phaseDelta = tone.phaseDeltas[0] / Instrument.drumsetIndexReferenceDelta(tone.drumsetPitch);
            const phaseDeltaScale = +tone.phaseDeltaScale;
            let volume = +tone.volumeStart;
            const volumeDelta = +tone.volumeDelta;
            let sample = +tone.sample;
            let filter1 = +tone.filter;
            let filter2 = instrument.getFilterIsFirstOrder() ? 1.0 : filter1;
            const filterScale1 = +tone.filterScale;
            const filterScale2 = instrument.getFilterIsFirstOrder() ? 1.0 : filterScale1;
            const filterResonance = Config.filterMaxResonance * Math.pow(Math.max(0, instrument.getFilterResonance() - 1) / (Config.filterResonanceRange - 2), 0.5);
            let filterSample0 = +tone.filterSample0;
            let filterSample1 = +tone.filterSample1;
            let phase = (tone.phases[0] % 1) * Config.chipNoiseLength;
            if (tone.phases[0] == 0)
                phase = Synth.findRandomZeroCrossing(wave) + phaseDelta;
            const stopIndex = stereoBufferIndex + runLength;
            stereoBufferIndex += tone.stereoOffset;
            const stereoVolume1 = tone.stereoVolume1;
            const stereoVolume2 = tone.stereoVolume2;
            const stereoDelay = tone.stereoDelay;
            while (stereoBufferIndex < stopIndex) {
                const phaseInt = phase | 0;
                const index = phaseInt & 0x7fff;
                sample = wave[index];
                const phaseRatio = phase - phaseInt;
                sample += (wave[index + 1] - sample) * phaseRatio;
                const feedback = filterResonance + filterResonance / (1.0 - filter1);
                filterSample0 += filter1 * (sample - filterSample0 + feedback * (filterSample0 - filterSample1));
                filterSample1 += filter2 * (filterSample0 - filterSample1);
                phase += phaseDelta;
                filter1 *= filterScale1;
                filter2 *= filterScale2;
                phaseDelta *= phaseDeltaScale;
                const output = filterSample1 * volume;
                volume += volumeDelta;
                data[stereoBufferIndex] += output * stereoVolume1;
                data[(stereoBufferIndex + stereoDelay) % stereoBufferLength] += output * stereoVolume2;
                stereoBufferIndex += 2;
            }
            tone.phases[0] = phase / Config.chipNoiseLength;
            tone.sample = sample;
            const epsilon = (1.0e-24);
            if (-epsilon < filterSample0 && filterSample0 < epsilon)
                filterSample0 = 0.0;
            if (-epsilon < filterSample1 && filterSample1 < epsilon)
                filterSample1 = 0.0;
            tone.filterSample0 = filterSample0;
            tone.filterSample1 = filterSample1;
        }
        static findRandomZeroCrossing(wave) {
            let phase = Math.random() * Config.chipNoiseLength;
            let indexPrev = phase & 0x7fff;
            let wavePrev = wave[indexPrev];
            const stride = 16;
            for (let attemptsRemaining = 128; attemptsRemaining > 0; attemptsRemaining--) {
                const indexNext = (indexPrev + stride) & 0x7fff;
                const waveNext = wave[indexNext];
                if (wavePrev * waveNext <= 0.0) {
                    for (let i = 0; i < 16; i++) {
                        const innerIndexNext = (indexPrev + 1) & 0x7fff;
                        const innerWaveNext = wave[innerIndexNext];
                        if (wavePrev * innerWaveNext <= 0.0) {
                            const slope = innerWaveNext - wavePrev;
                            phase = indexPrev;
                            if (Math.abs(slope) > 0.00000001) {
                                phase += -wavePrev / slope;
                            }
                            phase = Math.max(0, phase) % Config.chipNoiseLength;
                            break;
                        }
                        else {
                            indexPrev = innerIndexNext;
                            wavePrev = innerWaveNext;
                        }
                    }
                    break;
                }
                else {
                    indexPrev = indexNext;
                    wavePrev = waveNext;
                }
            }
            return phase;
        }
        static instrumentVolumeToVolumeMult(instrumentVolume) {
            return (instrumentVolume == Config.volumeRange - 1) ? 0.0 : Math.pow(2, Config.volumeLogScale * instrumentVolume);
        }
        static volumeMultToInstrumentVolume(volumeMult) {
            return (volumeMult <= 0.0) ? Config.volumeRange - 1 : Math.min(Config.volumeRange - 2, (Math.log(volumeMult) / Math.LN2) / Config.volumeLogScale);
        }
        static expressionToVolumeMult(expression) {
            return Math.pow(Math.max(0.0, expression) / 3.0, 1.5);
        }
        static volumeMultToExpression(volumeMult) {
            return Math.pow(Math.max(0.0, volumeMult), 1 / 1.5) * 3.0;
        }
        getSamplesPerTick() {
            if (this.song == null)
                return 0;
            const beatsPerMinute = this.song.getBeatsPerMinute();
            const beatsPerSecond = beatsPerMinute / 60.0;
            const partsPerSecond = Config.partsPerBeat * beatsPerSecond;
            const tickPerSecond = Config.ticksPerPart * partsPerSecond;
            return this.samplesPerSecond / tickPerSecond;
        }
    }
    Synth.fmSynthFunctionCache = {};
    Synth.fmSourceTemplate = (`
			const sineWave = beepbox.Config.sineWave;
			
			let phaseDeltaScale = +tone.phaseDeltaScale;
			// I'm adding 1000 to the phase to ensure that it's never negative even when modulated by other waves because negative numbers don't work with the modulus operator very well.
			let operator#Phase       = +((tone.phases[#] % 1) + 1000) * beepbox.Config.sineWaveLength;
			let operator#PhaseDelta  = +tone.phaseDeltas[#];
			let operator#OutputMult  = +tone.volumeStarts[#];
			const operator#OutputDelta = +tone.volumeDeltas[#];
			let operator#Output      = +tone.feedbackOutputs[#];
			let feedbackMult         = +tone.feedbackMult;
			const feedbackDelta        = +tone.feedbackDelta;
			let volume = +tone.volumeStart;
			const volumeDelta = +tone.volumeDelta;
			
			let filter1 = +tone.filter;
			let filter2 = instrument.getFilterIsFirstOrder() ? 1.0 : filter1;
			const filterScale1 = +tone.filterScale;
			const filterScale2 = instrument.getFilterIsFirstOrder() ? 1.0 : filterScale1;
			const filterResonance = beepbox.Config.filterMaxResonance * Math.pow(Math.max(0, instrument.getFilterResonance() - 1) / (beepbox.Config.filterResonanceRange - 2), 0.5);
			let filterSample0 = +tone.filterSample0;
			let filterSample1 = +tone.filterSample1;
			
			const stopIndex = stereoBufferIndex + runLength;
			stereoBufferIndex += tone.stereoOffset;
			const stereoVolume1 = tone.stereoVolume1;
			const stereoVolume2 = tone.stereoVolume2;
			const stereoDelay = tone.stereoDelay;
			while (stereoBufferIndex < stopIndex) {
				// INSERT OPERATOR COMPUTATION HERE
				const fmOutput = (/*operator#Scaled*/); // CARRIER OUTPUTS
				
				const feedback = filterResonance + filterResonance / (1.0 - filter1);
				filterSample0 += filter1 * (fmOutput - filterSample0 + feedback * (filterSample0 - filterSample1));
				filterSample1 += filter2 * (filterSample0 - filterSample1);
				
				feedbackMult += feedbackDelta;
				operator#OutputMult += operator#OutputDelta;
				operator#Phase += operator#PhaseDelta;
				operator#PhaseDelta *= phaseDeltaScale;
				filter1 *= filterScale1;
				filter2 *= filterScale2;
				
				const output = filterSample1 * volume;
				volume += volumeDelta;
				
				data[stereoBufferIndex] += output * stereoVolume1;
				data[(stereoBufferIndex + stereoDelay) % stereoBufferLength] += output * stereoVolume2;
				stereoBufferIndex += 2;
			}
			
			tone.phases[#] = operator#Phase / ` + Config.sineWaveLength + `;
			tone.feedbackOutputs[#] = operator#Output;
			
			const epsilon = (1.0e-24);
			if (-epsilon < filterSample0 && filterSample0 < epsilon) filterSample0 = 0.0;
			if (-epsilon < filterSample1 && filterSample1 < epsilon) filterSample1 = 0.0;
			tone.filterSample0 = filterSample0;
			tone.filterSample1 = filterSample1;
		`).split("\n");
    Synth.operatorSourceTemplate = (`
				const operator#PhaseMix = operator#Phase/* + operator@Scaled*/;
				const operator#PhaseInt = operator#PhaseMix|0;
				const operator#Index    = operator#PhaseInt & ` + Config.sineWaveMask + `;
				const operator#Sample   = sineWave[operator#Index];
				operator#Output       = operator#Sample + (sineWave[operator#Index + 1] - operator#Sample) * (operator#PhaseMix - operator#PhaseInt);
				const operator#Scaled   = operator#OutputMult * operator#Output;
		`).split("\n");

    const { a, button, div, h1, input } = HTML;
    const { svg, circle, rect, path } = SVG;
    document.head.appendChild(HTML.style({ type: "text/css" }, `
		body {
			color: ${ColorConfig.primaryText};
			background: ${ColorConfig.editorBackground};
		}
		h1 {
			font-weight: bold;
			font-size: 14px;
			line-height: 22px;
			text-align: initial;
			margin: 0;
		}
		a {
			font-weight: bold;
			font-size: 12px;
			line-height: 22px;
			white-space: nowrap;
			color: ${ColorConfig.linkAccent};
		}
		button {
			margin: 0;
			padding: 0;
			position: relative;
			border: none;
			border-radius: 5px;
			background: ${ColorConfig.uiWidgetBackground};
			color: ${ColorConfig.primaryText};
			cursor: pointer;
			font-size: 14px;
			font-family: inherit;
		}
		button:hover, button:focus {
			background: ${ColorConfig.uiWidgetFocus};
		}
		.playButton, .pauseButton {
			padding-left: 24px;
			padding-right: 6px;
		}
		.playButton::before {
			content: "";
			position: absolute;
			left: 6px;
			top: 50%;
			margin-top: -6px;
			width: 12px;
			height: 12px;
			pointer-events: none;
			background: ${ColorConfig.primaryText};
			-webkit-mask-image: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="-6 -6 12 12"><path d="M 6 0 L -5 6 L -5 -6 z" fill="gray"/></svg>');
			-webkit-mask-repeat: no-repeat;
			-webkit-mask-position: center;
			mask-image: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="-6 -6 12 12"><path d="M 6 0 L -5 6 L -5 -6 z" fill="gray"/></svg>');
			mask-repeat: no-repeat;
			mask-position: center;
		}
		.pauseButton::before {
			content: "";
			position: absolute;
			left: 6px;
			top: 50%;
			margin-top: -6px;
			width: 12px;
			height: 12px;
			pointer-events: none;
			background: ${ColorConfig.primaryText};
			-webkit-mask-image: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="-6 -6 12 12"><rect x="-5" y="-6" width="3" height="12" fill="gray"/><rect x="2"  y="-6" width="3" height="12" fill="gray"/></svg>');
			-webkit-mask-repeat: no-repeat;
			-webkit-mask-position: center;
			mask-image: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="-6 -6 12 12"><rect x="-5" y="-6" width="3" height="12" fill="gray"/><rect x="2"  y="-6" width="3" height="12" fill="gray"/></svg>');
			mask-repeat: no-repeat;
			mask-position: center;
		}
		
		input[type=range] {
			-webkit-appearance: none;
			appearance: none;
			height: 16px;
			margin: 0;
			cursor: pointer;
			background-color: ${ColorConfig.editorBackground};
			touch-action: pan-y;
		}
		input[type=range]:focus {
			outline: none;
		}
		input[type=range]::-webkit-slider-runnable-track {
			width: 100%;
			height: 4px;
			cursor: pointer;
			background: ${ColorConfig.uiWidgetBackground};
		}
		input[type=range]::-webkit-slider-thumb {
			height: 16px;
			width: 4px;
			border-radius: 2px;
			background: ${ColorConfig.primaryText};
			cursor: pointer;
			-webkit-appearance: none;
			margin-top: -6px;
		}
		input[type=range]:focus::-webkit-slider-runnable-track, input[type=range]:hover::-webkit-slider-runnable-track {
			background: ${ColorConfig.uiWidgetFocus};
		}
		input[type=range]::-moz-range-track {
			width: 100%;
			height: 4px;
			cursor: pointer;
			background: ${ColorConfig.uiWidgetBackground};
		}
		input[type=range]:focus::-moz-range-track, input[type=range]:hover::-moz-range-track  {
			background: ${ColorConfig.uiWidgetFocus};
		}
		input[type=range]::-moz-range-thumb {
			height: 16px;
			width: 4px;
			border-radius: 2px;
			border: none;
			background: ${ColorConfig.primaryText};
			cursor: pointer;
		}
		input[type=range]::-ms-track {
			width: 100%;
			height: 4px;
			cursor: pointer;
			background: ${ColorConfig.uiWidgetBackground};
			border-color: transparent;
		}
		input[type=range]:focus::-ms-track, input[type=range]:hover::-ms-track {
			background: ${ColorConfig.uiWidgetFocus};
		}
		input[type=range]::-ms-thumb {
			height: 16px;
			width: 4px;
			border-radius: 2px;
			background: ${ColorConfig.primaryText};
			cursor: pointer;
		}
	`));
    ColorConfig.setTheme("dark classic");
    let prevHash = null;
    let id = ((Math.random() * 0xffffffff) >>> 0).toString(16);
    let pauseButtonDisplayed = false;
    let animationRequest;
    let zoomEnabled = false;
    let timelineWidth = 1;
    const synth = new Synth();
    let titleText = h1({ style: "flex-grow: 1; margin: 0 1px;" }, "");
    let editLink = a({ target: "_top", style: "margin: 0 4px;" }, "✎ Edit");
    let copyLink = a({ href: "javascript:void(0)", style: "margin: 0 4px;" }, "⎘ Copy URL");
    let shareLink = a({ href: "javascript:void(0)", style: "margin: 0 4px;" }, "⤳ Share");
    let fullscreenLink = a({ target: "_top", style: "margin: 0 4px;" }, "⇱ Fullscreen");
    let draggingPlayhead = false;
    const playButton = button({ style: "width: 100%; height: 100%; max-height: 50px;" });
    const playButtonContainer = div({ style: "flex-shrink: 0; display: flex; padding: 2px; width: 80px; height: 100%; box-sizing: border-box; align-items: center;" }, playButton);
    const loopIcon = path({ d: "M 4 2 L 4 0 L 7 3 L 4 6 L 4 4 Q 2 4 2 6 Q 2 8 4 8 L 4 10 Q 0 10 0 6 Q 0 2 4 2 M 8 10 L 8 12 L 5 9 L 8 6 L 8 8 Q 10 8 10 6 Q 10 4 8 4 L 8 2 Q 12 2 12 6 Q 12 10 8 10 z" });
    const loopButton = button({ title: "loop", style: "background: none; flex: 0 0 12px; margin: 0 3px; width: 12px; height: 12px; display: flex;" }, svg({ width: 12, height: 12, viewBox: "0 0 12 12" }, loopIcon));
    const volumeIcon = svg({ style: "flex: 0 0 12px; margin: 0 1px; width: 12px; height: 12px;", viewBox: "0 0 12 12" }, path({ fill: ColorConfig.uiWidgetBackground, d: "M 1 9 L 1 3 L 4 3 L 7 0 L 7 12 L 4 9 L 1 9 M 9 3 Q 12 6 9 9 L 8 8 Q 10.5 6 8 4 L 9 3 z" }));
    const volumeSlider = input({ title: "volume", type: "range", value: 75, min: 0, max: 100, step: 1, style: "width: 12vw; max-width: 100px; margin: 0 1px;" });
    const zoomIcon = svg({ width: 12, height: 12, viewBox: "0 0 12 12" }, circle({ cx: "5", cy: "5", r: "4.5", "stroke-width": "1", stroke: "currentColor", fill: "none" }), path({ stroke: "currentColor", "stroke-width": "2", d: "M 8 8 L 11 11 M 5 2 L 5 8 M 2 5 L 8 5", fill: "none" }));
    const zoomButton = button({ title: "zoom", style: "background: none; flex: 0 0 12px; margin: 0 3px; width: 12px; height: 12px; display: flex;" }, zoomIcon);
    const timeline = svg({ style: "min-width: 0; min-height: 0; touch-action: pan-y pinch-zoom;" });
    const playhead = div({ style: `position: absolute; left: 0; top: 0; width: 2px; height: 100%; background: ${ColorConfig.playhead}; pointer-events: none;` });
    const timelineContainer = div({ style: "display: flex; flex-grow: 1; flex-shrink: 1; position: relative;" }, timeline, playhead);
    const visualizationContainer = div({ style: "display: flex; flex-grow: 1; flex-shrink: 1; height: 0; position: relative; align-items: center; overflow: hidden;" }, timelineContainer);
    document.body.appendChild(visualizationContainer);
    document.body.appendChild(div({ style: `flex-shrink: 0; height: 20vh; min-height: 22px; max-height: 70px; display: flex; align-items: center;` }, playButtonContainer, loopButton, volumeIcon, volumeSlider, zoomButton, titleText, editLink, copyLink, shareLink, fullscreenLink));
    function hashUpdatedExternally() {
        let myHash = location.hash;
        if (prevHash == myHash || myHash == "")
            return;
        prevHash = myHash;
        if (myHash.charAt(0) == "#") {
            myHash = myHash.substring(1);
        }
        fullscreenLink.setAttribute("href", location.href);
        for (const parameter of myHash.split("&")) {
            let equalsIndex = parameter.indexOf("=");
            if (equalsIndex != -1) {
                let paramName = parameter.substring(0, equalsIndex);
                let value = parameter.substring(equalsIndex + 1);
                switch (paramName) {
                    case "song":
                        synth.setSong(value);
                        synth.snapToStart();
                        editLink.setAttribute("href", "../#" + value);
                        break;
                    case "loop":
                        synth.loopRepeatCount = (value != "1") ? 0 : -1;
                        renderLoopIcon();
                        break;
                }
            }
            else {
                synth.setSong(myHash);
                synth.snapToStart();
                editLink.setAttribute("href", "../#" + myHash);
            }
        }
        renderTimeline();
    }
    function onWindowResize() {
        renderTimeline();
    }
    function animate() {
        if (synth.playing) {
            animationRequest = requestAnimationFrame(animate);
            if (localStorage.getItem("playerId") != id) {
                onTogglePlay();
            }
            renderPlayhead();
        }
        if (pauseButtonDisplayed != synth.playing) {
            renderPlayButton();
        }
    }
    function onTogglePlay() {
        if (synth.song != null) {
            if (animationRequest != null)
                cancelAnimationFrame(animationRequest);
            animationRequest = null;
            if (synth.playing) {
                synth.pause();
            }
            else {
                synth.play();
                localStorage.setItem("playerId", id);
                animate();
            }
        }
        renderPlayButton();
    }
    function onToggleLoop() {
        if (synth.loopRepeatCount == -1) {
            synth.loopRepeatCount = 0;
        }
        else {
            synth.loopRepeatCount = -1;
        }
        renderLoopIcon();
    }
    function onVolumeChange() {
        localStorage.setItem("volume", volumeSlider.value);
        setSynthVolume();
    }
    function onToggleZoom() {
        zoomEnabled = !zoomEnabled;
        renderZoomIcon();
        renderTimeline();
    }
    function onTimelineMouseDown(event) {
        draggingPlayhead = true;
        onTimelineMouseMove(event);
    }
    function onTimelineMouseMove(event) {
        event.preventDefault();
        onTimelineCursorMove(event.clientX || event.pageX);
    }
    function onTimelineTouchDown(event) {
        draggingPlayhead = true;
        onTimelineTouchMove(event);
    }
    function onTimelineTouchMove(event) {
        onTimelineCursorMove(event.touches[0].clientX);
    }
    function onTimelineCursorMove(mouseX) {
        if (draggingPlayhead && synth.song != null) {
            const boundingRect = visualizationContainer.getBoundingClientRect();
            synth.playhead = synth.song.barCount * (mouseX - boundingRect.left) / (boundingRect.right - boundingRect.left);
            renderPlayhead();
        }
    }
    function onTimelineCursorUp() {
        draggingPlayhead = false;
    }
    function setSynthVolume() {
        const volume = +volumeSlider.value;
        synth.volume = Math.min(1.0, Math.pow(volume / 50.0, 0.5)) * Math.pow(2.0, (volume - 75.0) / 25.0);
    }
    function renderPlayhead() {
        if (synth.song != null) {
            let pos = synth.playhead / synth.song.barCount;
            playhead.style.left = (timelineWidth * pos) + "px";
            const boundingRect = visualizationContainer.getBoundingClientRect();
            visualizationContainer.scrollLeft = pos * (timelineWidth - boundingRect.width);
        }
    }
    function renderTimeline() {
        timeline.innerHTML = "";
        if (synth.song == null)
            return;
        const boundingRect = visualizationContainer.getBoundingClientRect();
        let timelineHeight;
        let windowOctaves;
        let windowPitchCount;
        if (zoomEnabled) {
            timelineHeight = boundingRect.height;
            windowOctaves = Math.max(Config.windowOctaves, Math.min(Config.pitchOctaves, Math.round(timelineHeight / (12 * 2))));
            windowPitchCount = windowOctaves * 12 + 1;
            const semitoneHeight = (timelineHeight - 1) / windowPitchCount;
            const targetBeatWidth = Math.max(8, semitoneHeight * 4);
            timelineWidth = Math.max(boundingRect.width, targetBeatWidth * synth.song.barCount * synth.song.beatsPerBar);
        }
        else {
            timelineWidth = boundingRect.width;
            const targetSemitoneHeight = Math.max(1, timelineWidth / (synth.song.barCount * synth.song.beatsPerBar) / 3);
            timelineHeight = Math.min(boundingRect.height, targetSemitoneHeight * (Config.maxPitch + 1) + 1);
            windowOctaves = Math.max(Config.windowOctaves, Math.min(Config.pitchOctaves, Math.round(timelineHeight / (12 * targetSemitoneHeight))));
            windowPitchCount = windowOctaves * 12 + 1;
        }
        timelineContainer.style.width = timelineWidth + "px";
        timelineContainer.style.height = timelineHeight + "px";
        timeline.style.width = timelineWidth + "px";
        timeline.style.height = timelineHeight + "px";
        const barWidth = timelineWidth / synth.song.barCount;
        const partWidth = barWidth / (synth.song.beatsPerBar * Config.partsPerBeat);
        const wavePitchHeight = (timelineHeight - 1) / windowPitchCount;
        const drumPitchHeight = (timelineHeight - 1) / Config.drumCount;
        for (let bar = 0; bar < synth.song.barCount + 1; bar++) {
            const color = (bar == synth.song.loopStart || bar == synth.song.loopStart + synth.song.loopLength) ? ColorConfig.loopAccent : ColorConfig.uiWidgetBackground;
            timeline.appendChild(rect({ x: bar * barWidth - 1, y: 0, width: 2, height: timelineHeight, fill: color }));
        }
        for (let octave = 0; octave <= windowOctaves; octave++) {
            timeline.appendChild(rect({ x: 0, y: octave * 12 * wavePitchHeight, width: timelineWidth, height: wavePitchHeight + 1, fill: ColorConfig.tonic, opacity: 0.75 }));
        }
        for (let channel = synth.song.channels.length - 1; channel >= 0; channel--) {
            const isNoise = synth.song.getChannelIsNoise(channel);
            const pitchHeight = isNoise ? drumPitchHeight : wavePitchHeight;
            const configuredOctaveScroll = synth.song.channels[channel].octave;
            const octavesToMove = (windowOctaves - Config.windowOctaves) / 2;
            const newScrollableOctaves = Config.pitchOctaves - windowOctaves;
            const oldCenter = Config.scrollableOctaves / 2;
            const newCenter = newScrollableOctaves / 2;
            let distanceFromCenter = configuredOctaveScroll - oldCenter;
            if (Math.abs(distanceFromCenter) <= octavesToMove) {
                distanceFromCenter = 0;
            }
            else if (distanceFromCenter < 0) {
                distanceFromCenter += octavesToMove;
            }
            else {
                distanceFromCenter -= octavesToMove;
            }
            const newOctaveScroll = Math.max(0, Math.min(newScrollableOctaves, Math.round(newCenter + distanceFromCenter)));
            const offsetY = newOctaveScroll * pitchHeight * 12 + timelineHeight - pitchHeight * 0.5 - 0.5;
            for (let bar = 0; bar < synth.song.barCount; bar++) {
                const pattern = synth.song.getPattern(channel, bar);
                if (pattern == null)
                    continue;
                const offsetX = bar * barWidth;
                for (let i = 0; i < pattern.notes.length; i++) {
                    const note = pattern.notes[i];
                    for (const pitch of note.pitches) {
                        const d = drawNote(pitch, note.start, note.pins, (pitchHeight + 1) / 2, offsetX, offsetY, partWidth, pitchHeight);
                        const noteElement = path({ d: d, fill: ColorConfig.getChannelColor(synth.song, channel).primaryChannel });
                        if (isNoise)
                            noteElement.style.opacity = String(0.6);
                        timeline.appendChild(noteElement);
                    }
                }
            }
        }
        renderPlayhead();
    }
    function drawNote(pitch, start, pins, radius, offsetX, offsetY, partWidth, pitchHeight) {
        let d = `M ${offsetX + partWidth * (start + pins[0].time)} ${offsetY - pitch * pitchHeight + radius * (pins[0].volume / 3.0)} `;
        for (let i = 0; i < pins.length; i++) {
            const pin = pins[i];
            const x = offsetX + partWidth * (start + pin.time);
            const y = offsetY - pitchHeight * (pitch + pin.interval);
            const expression = pin.volume / 3.0;
            d += `L ${x} ${y - radius * expression} `;
        }
        for (let i = pins.length - 1; i >= 0; i--) {
            const pin = pins[i];
            const x = offsetX + partWidth * (start + pin.time);
            const y = offsetY - pitchHeight * (pitch + pin.interval);
            const expression = pin.volume / 3.0;
            d += `L ${x} ${y + radius * expression} `;
        }
        return d;
    }
    function renderPlayButton() {
        if (synth.playing) {
            playButton.classList.remove("playButton");
            playButton.classList.add("pauseButton");
            playButton.title = "Pause (Space)";
            playButton.innerText = "Pause";
        }
        else {
            playButton.classList.remove("pauseButton");
            playButton.classList.add("playButton");
            playButton.title = "Play (Space)";
            playButton.innerText = "Play";
        }
        pauseButtonDisplayed = synth.playing;
    }
    function renderLoopIcon() {
        loopIcon.setAttribute("fill", (synth.loopRepeatCount == -1) ? ColorConfig.linkAccent : ColorConfig.uiWidgetBackground);
    }
    function renderZoomIcon() {
        zoomIcon.style.color = zoomEnabled ? ColorConfig.linkAccent : ColorConfig.uiWidgetBackground;
    }
    function onKeyPressed(event) {
        switch (event.keyCode) {
            case 32:
                onTogglePlay();
                event.preventDefault();
                break;
            case 219:
                synth.prevBar();
                renderPlayhead();
                event.preventDefault();
                break;
            case 221:
                synth.nextBar();
                renderPlayhead();
                event.preventDefault();
                break;
        }
    }
    function onCopyClicked() {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(location.href).catch(() => {
                window.prompt("Copy to clipboard:", location.href);
            });
            return;
        }
        const textField = document.createElement("textarea");
        textField.innerText = location.href;
        document.body.appendChild(textField);
        textField.select();
        const succeeded = document.execCommand("copy");
        textField.remove();
        if (!succeeded)
            window.prompt("Copy this:", location.href);
    }
    function onShareClicked() {
        navigator.share({ url: location.href });
    }
    if (top !== self) {
        copyLink.style.display = "none";
        shareLink.style.display = "none";
    }
    else {
        fullscreenLink.style.display = "none";
        if (!("share" in navigator))
            shareLink.style.display = "none";
    }
    if (localStorage.getItem("volume") != null) {
        volumeSlider.value = localStorage.getItem("volume");
    }
    setSynthVolume();
    window.addEventListener("resize", onWindowResize);
    window.addEventListener("keydown", onKeyPressed);
    timeline.addEventListener("mousedown", onTimelineMouseDown);
    window.addEventListener("mousemove", onTimelineMouseMove);
    window.addEventListener("mouseup", onTimelineCursorUp);
    timeline.addEventListener("touchstart", onTimelineTouchDown);
    timeline.addEventListener("touchmove", onTimelineTouchMove);
    timeline.addEventListener("touchend", onTimelineCursorUp);
    timeline.addEventListener("touchcancel", onTimelineCursorUp);
    playButton.addEventListener("click", onTogglePlay);
    loopButton.addEventListener("click", onToggleLoop);
    volumeSlider.addEventListener("input", onVolumeChange);
    zoomButton.addEventListener("click", onToggleZoom);
    copyLink.addEventListener("click", onCopyClicked);
    shareLink.addEventListener("click", onShareClicked);
    window.addEventListener("hashchange", hashUpdatedExternally);
    hashUpdatedExternally();
    renderLoopIcon();
    renderZoomIcon();
    renderPlayButton();

    exports.Channel = Channel;
    exports.Config = Config;
    exports.Instrument = Instrument;
    exports.Note = Note;
    exports.Pattern = Pattern;
    exports.Synth = Synth;

    Object.defineProperty(exports, '__esModule', { value: true });

    return exports;

}({}));
//# sourceMappingURL=beepbox_player.js.map
