var beepbox = (function (exports) {
    'use strict';

    /*!
    Copyright (C) 2021 John Nesky

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
    Config.echoDelayRange = 24;
    Config.echoDelayStepTicks = 4;
    Config.echoSustainRange = 8;
    Config.echoShelfHz = 4000.0;
    Config.echoShelfGain = Math.pow(2.0, -0.5);
    Config.reverbShelfHz = 8000.0;
    Config.reverbShelfGain = Math.pow(2.0, -1.5);
    Config.reverbRange = 4;
    Config.reverbDelayBufferSize = 16384;
    Config.reverbDelayBufferMask = Config.reverbDelayBufferSize - 1;
    Config.beatsPerBarMin = 3;
    Config.beatsPerBarMax = 16;
    Config.barCountMin = 1;
    Config.barCountMax = 128;
    Config.instrumentCountMin = 1;
    Config.layeredInstrumentCountMax = 4;
    Config.patternInstrumentCountMax = 10;
    Config.partsPerBeat = 24;
    Config.ticksPerPart = 2;
    Config.rhythms = toNameMap([
        { name: "÷3 (triplets)", stepsPerBeat: 3, ticksPerArpeggio: 4, arpeggioPatterns: [[0], [0, 0, 1, 1], [0, 1, 2, 1]], roundUpThresholds: [5, 12, 18] },
        { name: "÷4 (standard)", stepsPerBeat: 4, ticksPerArpeggio: 3, arpeggioPatterns: [[0], [0, 0, 1, 1], [0, 1, 2, 1]], roundUpThresholds: [3, 9, 17, 21] },
        { name: "÷6", stepsPerBeat: 6, ticksPerArpeggio: 4, arpeggioPatterns: [[0], [0, 1], [0, 1, 2, 1]], roundUpThresholds: null },
        { name: "÷8", stepsPerBeat: 8, ticksPerArpeggio: 3, arpeggioPatterns: [[0], [0, 1], [0, 1, 2, 1]], roundUpThresholds: null },
        { name: "freehand", stepsPerBeat: 24, ticksPerArpeggio: 3, arpeggioPatterns: [[0], [0, 1], [0, 1, 2, 1]], roundUpThresholds: null },
    ]);
    Config.instrumentTypeNames = ["chip", "FM", "noise", "spectrum", "drumset", "harmonics", "PWM", "Picked String"];
    Config.instrumentTypeHasSpecialInterval = [true, true, false, false, false, true, false, false];
    Config.chipBaseExpression = 0.03375;
    Config.fmBaseExpression = 0.03;
    Config.noiseBaseExpression = 0.19;
    Config.spectrumBaseExpression = 0.3;
    Config.drumsetBaseExpression = 0.45;
    Config.harmonicsBaseExpression = 0.025;
    Config.pwmBaseExpression = 0.04725;
    Config.pickedStringBaseExpression = 0.025;
    Config.distortionBaseVolume = 0.011;
    Config.bitcrusherBaseVolume = 0.010;
    Config.chipWaves = toNameMap([
        { name: "rounded", expression: 0.94, samples: centerWave([0.0, 0.2, 0.4, 0.5, 0.6, 0.7, 0.8, 0.85, 0.9, 0.95, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 0.95, 0.9, 0.85, 0.8, 0.7, 0.6, 0.5, 0.4, 0.2, 0.0, -0.2, -0.4, -0.5, -0.6, -0.7, -0.8, -0.85, -0.9, -0.95, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -0.95, -0.9, -0.85, -0.8, -0.7, -0.6, -0.5, -0.4, -0.2]) },
        { name: "triangle", expression: 1.0, samples: centerWave([1.0 / 15.0, 3.0 / 15.0, 5.0 / 15.0, 7.0 / 15.0, 9.0 / 15.0, 11.0 / 15.0, 13.0 / 15.0, 15.0 / 15.0, 15.0 / 15.0, 13.0 / 15.0, 11.0 / 15.0, 9.0 / 15.0, 7.0 / 15.0, 5.0 / 15.0, 3.0 / 15.0, 1.0 / 15.0, -1.0 / 15.0, -3.0 / 15.0, -5.0 / 15.0, -7.0 / 15.0, -9.0 / 15.0, -11.0 / 15.0, -13.0 / 15.0, -15.0 / 15.0, -15.0 / 15.0, -13.0 / 15.0, -11.0 / 15.0, -9.0 / 15.0, -7.0 / 15.0, -5.0 / 15.0, -3.0 / 15.0, -1.0 / 15.0]) },
        { name: "square", expression: 0.5, samples: centerWave([1.0, -1.0]) },
        { name: "1/4 pulse", expression: 0.5, samples: centerWave([1.0, -1.0, -1.0, -1.0]) },
        { name: "1/8 pulse", expression: 0.5, samples: centerWave([1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0]) },
        { name: "sawtooth", expression: 0.65, samples: centerWave([1.0 / 31.0, 3.0 / 31.0, 5.0 / 31.0, 7.0 / 31.0, 9.0 / 31.0, 11.0 / 31.0, 13.0 / 31.0, 15.0 / 31.0, 17.0 / 31.0, 19.0 / 31.0, 21.0 / 31.0, 23.0 / 31.0, 25.0 / 31.0, 27.0 / 31.0, 29.0 / 31.0, 31.0 / 31.0, -31.0 / 31.0, -29.0 / 31.0, -27.0 / 31.0, -25.0 / 31.0, -23.0 / 31.0, -21.0 / 31.0, -19.0 / 31.0, -17.0 / 31.0, -15.0 / 31.0, -13.0 / 31.0, -11.0 / 31.0, -9.0 / 31.0, -7.0 / 31.0, -5.0 / 31.0, -3.0 / 31.0, -1.0 / 31.0]) },
        { name: "double saw", expression: 0.5, samples: centerWave([0.0, -0.2, -0.4, -0.6, -0.8, -1.0, 1.0, -0.8, -0.6, -0.4, -0.2, 1.0, 0.8, 0.6, 0.4, 0.2]) },
        { name: "double pulse", expression: 0.4, samples: centerWave([1.0, 1.0, 1.0, 1.0, 1.0, -1.0, -1.0, -1.0, 1.0, 1.0, 1.0, 1.0, -1.0, -1.0, -1.0, -1.0]) },
        { name: "spiky", expression: 0.4, samples: centerWave([1.0, -1.0, 1.0, -1.0, 1.0, 0.0]) },
    ]);
    Config.chipNoises = toNameMap([
        { name: "retro", expression: 0.25, basePitch: 69, pitchFilterMult: 1024.0, isSoft: false, samples: null },
        { name: "white", expression: 1.0, basePitch: 69, pitchFilterMult: 8.0, isSoft: true, samples: null },
        { name: "clang", expression: 0.4, basePitch: 69, pitchFilterMult: 1024.0, isSoft: false, samples: null },
        { name: "buzz", expression: 0.3, basePitch: 69, pitchFilterMult: 1024.0, isSoft: false, samples: null },
        { name: "hollow", expression: 1.5, basePitch: 96, pitchFilterMult: 1.0, isSoft: true, samples: null },
    ]);
    Config.filterFreqStep = 1.0 / 4.0;
    Config.filterFreqRange = 34;
    Config.filterFreqReferenceSetting = 28;
    Config.filterFreqReferenceHz = 8000.0;
    Config.filterFreqMaxHz = Config.filterFreqReferenceHz * Math.pow(2.0, Config.filterFreqStep * (Config.filterFreqRange - 1 - Config.filterFreqReferenceSetting));
    Config.filterFreqMinHz = 8.0;
    Config.filterGainRange = 15;
    Config.filterGainCenter = 7;
    Config.filterGainStep = 1.0 / 2.0;
    Config.filterMaxPoints = 8;
    Config.filterTypeNames = ["low-pass", "high-pass", "peak"];
    Config.fadeInRange = 10;
    Config.fadeOutTicks = [-24, -12, -6, -3, -1, 6, 12, 24, 48, 72, 96];
    Config.fadeOutNeutral = 4;
    Config.drumsetFadeOutTicks = 48;
    Config.transitions = toNameMap([
        { name: "normal", isSeamless: false, continues: false, slides: false, slideTicks: 3, includeAdjacentPatterns: false },
        { name: "interrupt", isSeamless: true, continues: false, slides: false, slideTicks: 3, includeAdjacentPatterns: true },
        { name: "continue", isSeamless: true, continues: true, slides: false, slideTicks: 3, includeAdjacentPatterns: true },
        { name: "slide", isSeamless: true, continues: false, slides: true, slideTicks: 3, includeAdjacentPatterns: true },
        { name: "slide in pattern", isSeamless: true, continues: false, slides: true, slideTicks: 3, includeAdjacentPatterns: false },
    ]);
    Config.vibratos = toNameMap([
        { name: "none", amplitude: 0.0, periodsSeconds: [0.14], delayTicks: 0 },
        { name: "light", amplitude: 0.15, periodsSeconds: [0.14], delayTicks: 0 },
        { name: "delayed", amplitude: 0.3, periodsSeconds: [0.14], delayTicks: 37 },
        { name: "heavy", amplitude: 0.45, periodsSeconds: [0.14], delayTicks: 0 },
        { name: "shaky", amplitude: 0.1, periodsSeconds: [0.11, 1.618 * 0.11, 3 * 0.11], delayTicks: 0 },
    ]);
    Config.unisons = toNameMap([
        { name: "none", voices: 1, spread: 0.0, offset: 0.0, expression: 1.4, sign: 1.0 },
        { name: "shimmer", voices: 2, spread: 0.018, offset: 0.0, expression: 0.8, sign: 1.0 },
        { name: "hum", voices: 2, spread: 0.045, offset: 0.0, expression: 1.0, sign: 1.0 },
        { name: "honky tonk", voices: 2, spread: 0.09, offset: 0.0, expression: 1.0, sign: 1.0 },
        { name: "dissonant", voices: 2, spread: 0.25, offset: 0.0, expression: 0.9, sign: 1.0 },
        { name: "fifth", voices: 2, spread: 3.5, offset: 3.5, expression: 0.9, sign: 1.0 },
        { name: "octave", voices: 2, spread: 6.0, offset: 6.0, expression: 0.8, sign: 1.0 },
        { name: "bowed", voices: 2, spread: 0.02, offset: 0.0, expression: 1.0, sign: -1.0 },
        { name: "piano", voices: 2, spread: 0.01, offset: 0.0, expression: 1.0, sign: 0.7 },
    ]);
    Config.effectNames = ["reverb", "chorus", "panning", "distortion", "bitcrusher", "note filter", "echo", "pitch shift", "detune", "vibrato", "transition type", "chord type"];
    Config.effectOrder = [10, 11, 7, 8, 9, 5, 3, 4, 2, 1, 6, 0];
    Config.noteSizeMax = 3;
    Config.volumeRange = 8;
    Config.volumeLogScale = -0.5;
    Config.panCenter = 4;
    Config.panMax = Config.panCenter * 2;
    Config.panDelaySecondsMax = 0.0005;
    Config.chorusRange = 4;
    Config.chorusPeriodSeconds = 2.0;
    Config.chorusDelayRange = 0.0034;
    Config.chorusDelayOffsets = [[1.51, 2.10, 3.35], [1.47, 2.15, 3.25]];
    Config.chorusPhaseOffsets = [[0.0, 2.1, 4.2], [3.2, 5.3, 1.0]];
    Config.chorusMaxDelay = Config.chorusDelayRange * (1.0 + Config.chorusDelayOffsets[0].concat(Config.chorusDelayOffsets[1]).reduce((x, y) => Math.max(x, y)));
    Config.chords = toNameMap([
        { name: "simultaneous", customInterval: false, arpeggiates: false, strumParts: 0, singleTone: false },
        { name: "strum", customInterval: false, arpeggiates: false, strumParts: 1, singleTone: false },
        { name: "arpeggio", customInterval: false, arpeggiates: true, strumParts: 0, singleTone: true },
        { name: "custom interval", customInterval: true, arpeggiates: false, strumParts: 0, singleTone: true },
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
        { name: "none", type: 1, speed: 0.0 },
        { name: "note size", type: 0, speed: 0.0 },
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
    Config.spectrumNoiseLength = 1 << 15;
    Config.spectrumBasePitch = 24;
    Config.spectrumControlPoints = 30;
    Config.spectrumControlPointsPerOctave = 7;
    Config.spectrumControlPointBits = 3;
    Config.spectrumMax = (1 << Config.spectrumControlPointBits) - 1;
    Config.harmonicsControlPoints = 28;
    Config.harmonicsRendered = 64;
    Config.harmonicsRenderedForPickedString = 1 << 8;
    Config.harmonicsControlPointBits = 3;
    Config.harmonicsMax = (1 << Config.harmonicsControlPointBits) - 1;
    Config.harmonicsWavelength = 1 << 11;
    Config.pulseWidthRange = 8;
    Config.pulseWidthStepPower = 0.5;
    Config.pitchChannelCountMin = 1;
    Config.pitchChannelCountMax = 10;
    Config.noiseChannelCountMin = 0;
    Config.noiseChannelCountMax = 5;
    Config.noiseInterval = 6;
    Config.pitchesPerOctave = 12;
    Config.drumCount = 12;
    Config.pitchOctaves = 7;
    Config.maxPitch = Config.pitchOctaves * Config.pitchesPerOctave;
    Config.maximumTonesPerChannel = Config.maxChordSize * 2;
    Config.justIntonationSemitones = [1.0 / 2.0, 8.0 / 15.0, 9.0 / 16.0, 3.0 / 5.0, 5.0 / 8.0, 2.0 / 3.0, 32.0 / 45.0, 3.0 / 4.0, 4.0 / 5.0, 5.0 / 6.0, 8.0 / 9.0, 15.0 / 16.0, 1.0, 16.0 / 15.0, 9.0 / 8.0, 6.0 / 5.0, 5.0 / 4.0, 4.0 / 3.0, 45.0 / 32.0, 3.0 / 2.0, 8.0 / 5.0, 5.0 / 3.0, 16.0 / 9.0, 15.0 / 8.0, 2.0].map(x => Math.log2(x) * Config.pitchesPerOctave);
    Config.pitchShiftRange = Config.justIntonationSemitones.length;
    Config.pitchShiftCenter = Config.pitchShiftRange >> 1;
    Config.detuneCenter = 9;
    Config.detuneMax = Config.detuneCenter * 2;
    Config.sineWaveLength = 1 << 8;
    Config.sineWaveMask = Config.sineWaveLength - 1;
    Config.sineWave = generateSineWave();
    Config.pickedStringDispersionCenterFreq = 6000.0;
    Config.pickedStringDispersionFreqScale = 0.3;
    Config.pickedStringDispersionFreqMult = 4.0;
    Config.pickedStringShelfHz = 4000.0;
    Config.distortionRange = 8;
    Config.stringSustainRange = 15;
    Config.stringDecayRate = 0.12;
    Config.bitcrusherFreqRange = 14;
    Config.bitcrusherOctaveStep = 0.5;
    Config.bitcrusherQuantizationRange = 8;
    Config.maxEnvelopeCount = 12;
    Config.defaultAutomationRange = 13;
    Config.instrumentAutomationTargets = toNameMap([
        { name: "none", computeIndex: null, displayName: "none", interleave: false, isFilter: false, maxCount: 1, effect: null, compatibleInstruments: null },
        { name: "noteVolume", computeIndex: 0, displayName: "note volume", interleave: false, isFilter: false, maxCount: 1, effect: null, compatibleInstruments: null },
        { name: "pulseWidth", computeIndex: 2, displayName: "pulse width", interleave: false, isFilter: false, maxCount: 1, effect: null, compatibleInstruments: [6] },
        { name: "stringSustain", computeIndex: 3, displayName: "sustain", interleave: false, isFilter: false, maxCount: 1, effect: null, compatibleInstruments: [7] },
        { name: "unison", computeIndex: 4, displayName: "unison", interleave: false, isFilter: false, maxCount: 1, effect: null, compatibleInstruments: [0, 5, 7] },
        { name: "operatorFrequency", computeIndex: 5, displayName: "fm# freq", interleave: true, isFilter: false, maxCount: Config.operatorCount, effect: null, compatibleInstruments: [1] },
        { name: "operatorAmplitude", computeIndex: 9, displayName: "fm# volume", interleave: false, isFilter: false, maxCount: Config.operatorCount, effect: null, compatibleInstruments: [1] },
        { name: "feedbackAmplitude", computeIndex: 13, displayName: "fm feedback", interleave: false, isFilter: false, maxCount: 1, effect: null, compatibleInstruments: [1] },
        { name: "pitchShift", computeIndex: 14, displayName: "pitch shift", interleave: false, isFilter: false, maxCount: 1, effect: 7, compatibleInstruments: null },
        { name: "detune", computeIndex: 15, displayName: "detune", interleave: false, isFilter: false, maxCount: 1, effect: 8, compatibleInstruments: null },
        { name: "vibratoDepth", computeIndex: 16, displayName: "vibrato range", interleave: false, isFilter: false, maxCount: 1, effect: 9, compatibleInstruments: null },
        { name: "noteFilterAllFreqs", computeIndex: 1, displayName: "n. filter freqs", interleave: false, isFilter: true, maxCount: 1, effect: 5, compatibleInstruments: null },
        { name: "noteFilterFreq", computeIndex: 17, displayName: "n. filter # freq", interleave: false, isFilter: true, maxCount: Config.filterMaxPoints, effect: 5, compatibleInstruments: null },
    ]);
    function centerWave(wave) {
        let sum = 0.0;
        for (let i = 0; i < wave.length; i++)
            sum += wave[i];
        const average = sum / wave.length;
        for (let i = 0; i < wave.length; i++)
            wave[i] -= average;
        performIntegral(wave);
        wave.push(0);
        return new Float64Array(wave);
    }
    function performIntegral(wave) {
        let cumulative = 0.0;
        for (let i = 0; i < wave.length; i++) {
            const temp = wave[i];
            wave[i] = cumulative;
            cumulative += temp;
        }
    }
    function getPulseWidthRatio(pulseWidth) {
        return Math.pow(0.5, (Config.pulseWidthRange - 1 - pulseWidth) * Config.pulseWidthStepPower) * 0.5;
    }
    function getDrumWave(index, inverseRealFourierTransform, scaleElementsByFactor) {
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
                drawNoiseSpectrum(wave, Config.chipNoiseLength, 10, 11, 1, 1, 0);
                drawNoiseSpectrum(wave, Config.chipNoiseLength, 11, 14, .6578, .6578, 0);
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
    function drawNoiseSpectrum(wave, waveLength, lowOctave, highOctave, lowPower, highPower, overallSlope) {
        const referenceOctave = 11;
        const referenceIndex = 1 << referenceOctave;
        const lowIndex = Math.pow(2, lowOctave) | 0;
        const highIndex = Math.min(waveLength >> 1, Math.pow(2, highOctave) | 0);
        const retroWave = getDrumWave(0, null, null);
        let combinedAmplitude = 0.0;
        for (let i = lowIndex; i < highIndex; i++) {
            let lerped = lowPower + (highPower - lowPower) * (Math.log2(i) - lowOctave) / (highOctave - lowOctave);
            let amplitude = Math.pow(2, (lerped - 1) * 7 + 1) * lerped;
            amplitude *= Math.pow(i / referenceIndex, overallSlope);
            combinedAmplitude += amplitude;
            amplitude *= retroWave[i];
            const radians = 0.61803398875 * i * i * Math.PI * 2.0;
            wave[i] = Math.cos(radians) * amplitude;
            wave[waveLength - i] = Math.sin(radians) * amplitude;
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
    function effectsIncludeTransition(effects) {
        return (effects & (1 << 10)) != 0;
    }
    function effectsIncludeChord(effects) {
        return (effects & (1 << 11)) != 0;
    }
    function effectsIncludePitchShift(effects) {
        return (effects & (1 << 7)) != 0;
    }
    function effectsIncludeDetune(effects) {
        return (effects & (1 << 8)) != 0;
    }
    function effectsIncludeVibrato(effects) {
        return (effects & (1 << 9)) != 0;
    }
    function effectsIncludeNoteFilter(effects) {
        return (effects & (1 << 5)) != 0;
    }
    function effectsIncludeDistortion(effects) {
        return (effects & (1 << 3)) != 0;
    }
    function effectsIncludeBitcrusher(effects) {
        return (effects & (1 << 4)) != 0;
    }
    function effectsIncludePanning(effects) {
        return (effects & (1 << 2)) != 0;
    }
    function effectsIncludeChorus(effects) {
        return (effects & (1 << 1)) != 0;
    }
    function effectsIncludeEcho(effects) {
        return (effects & (1 << 6)) != 0;
    }
    function effectsIncludeReverb(effects) {
        return (effects & (1 << 0)) != 0;
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
            for (var args_1 = __values$1(args), args_1_1 = args_1.next(); !args_1_1.done; args_1_1 = args_1.next()) {
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
                        for (var _d = (e_2 = void 0, __values$1(Object.keys(arg))), _e = _d.next(); !_e.done; _e = _d.next()) {
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
                                        for (var _f = (e_3 = void 0, __values$1(Object.keys(value))), _g = _f.next(); !_g.done; _g = _f.next()) {
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
        for (var _c = __values("a abbr address area article aside audio b base bdi bdo blockquote br button canvas caption cite code col colgroup datalist dd del details dfn dialog div dl dt em embed fieldset figcaption figure footer form h1 h2 h3 h4 h5 h6 header hr i iframe img input ins kbd label legend li link main map mark menu menuitem meta meter nav noscript object ol optgroup option output p param picture pre progress q rp rt ruby s samp script section select small source span strong style sub summary sup table tbody td template textarea tfoot th thead time title tr track u ul var video wbr".split(" ")), _d = _c.next(); !_d.done; _d = _c.next()) {
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
        for (var _e = __values("a altGlyph altGlyphDef altGlyphItem animate animateMotion animateTransform circle clipPath color-profile cursor defs desc discard ellipse feBlend feColorMatrix feComponentTransfer feComposite feConvolveMatrix feDiffuseLighting feDisplacementMap feDistantLight feDropShadow feFlood feFuncA feFuncB feFuncG feFuncR feGaussianBlur feImage feMerge feMergeNode feMorphology feOffset fePointLight feSpecularLighting feSpotLight feTile feTurbulence filter font font-face font-face-format font-face-name font-face-src font-face-uri foreignObject g glyph glyphRef hkern image line linearGradient marker mask metadata missing-glyph mpath path pattern polygon polyline radialGradient rect script set stop style svg switch symbol text textPath title tref tspan use view vkern".split(" ")), _f = _e.next(); !_f.done; _f = _e.next()) {
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
        }, {
            name: "pitch7",
            secondaryChannel: "var(--pitch7-secondary-channel)",
            primaryChannel: "var(--pitch7-primary-channel)",
            secondaryNote: "var(--pitch7-secondary-note)",
            primaryNote: "var(--pitch7-primary-note)",
        }, {
            name: "pitch8",
            secondaryChannel: "var(--pitch8-secondary-channel)",
            primaryChannel: "var(--pitch8-primary-channel)",
            secondaryNote: "var(--pitch8-secondary-note)",
            primaryNote: "var(--pitch8-primary-note)",
        }, {
            name: "pitch9",
            secondaryChannel: "var(--pitch9-secondary-channel)",
            primaryChannel: "var(--pitch9-primary-channel)",
            secondaryNote: "var(--pitch9-secondary-note)",
            primaryNote: "var(--pitch9-primary-note)",
        }, {
            name: "pitch10",
            secondaryChannel: "var(--pitch10-secondary-channel)",
            primaryChannel: "var(--pitch10-primary-channel)",
            secondaryNote: "var(--pitch10-secondary-note)",
            primaryNote: "var(--pitch10-primary-note)",
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
        }, {
            name: "noise4",
            secondaryChannel: "var(--noise4-secondary-channel)",
            primaryChannel: "var(--noise4-primary-channel)",
            secondaryNote: "var(--noise4-secondary-note)",
            primaryNote: "var(--noise4-primary-note)",
        }, {
            name: "noise5",
            secondaryChannel: "var(--noise5-secondary-channel)",
            primaryChannel: "var(--noise5-primary-channel)",
            secondaryNote: "var(--noise5-secondary-note)",
            primaryNote: "var(--noise5-primary-note)",
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

    class FilterCoefficients {
        constructor() {
            this.a = [1.0];
            this.b = [1.0];
            this.order = 0;
        }
        linearGain0thOrder(linearGain) {
            this.b[0] = linearGain;
            this.order = 0;
        }
        lowPass1stOrderButterworth(cornerRadiansPerSample) {
            const g = 1.0 / Math.tan(cornerRadiansPerSample * 0.5);
            const a0 = 1.0 + g;
            this.a[1] = (1.0 - g) / a0;
            this.b[1] = this.b[0] = 1 / a0;
            this.order = 1;
        }
        lowPass1stOrderSimplified(cornerRadiansPerSample) {
            const g = 2.0 * Math.sin(cornerRadiansPerSample * 0.5);
            this.a[1] = g - 1.0;
            this.b[0] = g;
            this.b[1] = 0.0;
            this.order = 1;
        }
        highPass1stOrderButterworth(cornerRadiansPerSample) {
            const g = 1.0 / Math.tan(cornerRadiansPerSample * 0.5);
            const a0 = 1.0 + g;
            this.a[1] = (1.0 - g) / a0;
            this.b[0] = g / a0;
            this.b[1] = -g / a0;
            this.order = 1;
        }
        highShelf1stOrder(cornerRadiansPerSample, shelfLinearGain) {
            const tan = Math.tan(cornerRadiansPerSample * 0.5);
            const sqrtGain = Math.sqrt(shelfLinearGain);
            const g = (tan * sqrtGain - 1) / (tan * sqrtGain + 1.0);
            const a0 = 1.0;
            this.a[1] = g / a0;
            this.b[0] = (1.0 + g + shelfLinearGain * (1.0 - g)) / (2.0 * a0);
            this.b[1] = (1.0 + g - shelfLinearGain * (1.0 - g)) / (2.0 * a0);
            this.order = 1;
        }
        allPass1stOrderInvertPhaseAbove(cornerRadiansPerSample) {
            const g = (Math.sin(cornerRadiansPerSample) - 1.0) / Math.cos(cornerRadiansPerSample);
            this.a[1] = g;
            this.b[0] = g;
            this.b[1] = 1.0;
            this.order = 1;
        }
        allPass1stOrderFractionalDelay(delay) {
            const g = (1.0 - delay) / (1.0 + delay);
            this.a[1] = g;
            this.b[0] = g;
            this.b[1] = 1.0;
            this.order = 1;
        }
        lowPass2ndOrderButterworth(cornerRadiansPerSample, peakLinearGain) {
            const alpha = Math.sin(cornerRadiansPerSample) / (2.0 * peakLinearGain);
            const cos = Math.cos(cornerRadiansPerSample);
            const a0 = 1.0 + alpha;
            this.a[1] = -2.0 * cos / a0;
            this.a[2] = (1 - alpha) / a0;
            this.b[2] = this.b[0] = (1 - cos) / (2.0 * a0);
            this.b[1] = (1 - cos) / a0;
            this.order = 2;
        }
        lowPass2ndOrderSimplified(cornerRadiansPerSample, peakLinearGain) {
            const g = 2.0 * Math.sin(cornerRadiansPerSample / 2.0);
            const filterResonance = 1.0 - 1.0 / (2.0 * peakLinearGain);
            const feedback = filterResonance + filterResonance / (1.0 - g);
            this.a[1] = 2.0 * g + (g - 1.0) * g * feedback - 2.0;
            this.a[2] = (g - 1.0) * (g - g * feedback - 1.0);
            this.b[0] = g * g;
            this.b[1] = 0;
            this.b[2] = 0;
            this.order = 2;
        }
        highPass2ndOrderButterworth(cornerRadiansPerSample, peakLinearGain) {
            const alpha = Math.sin(cornerRadiansPerSample) / (2 * peakLinearGain);
            const cos = Math.cos(cornerRadiansPerSample);
            const a0 = 1.0 + alpha;
            this.a[1] = -2.0 * cos / a0;
            this.a[2] = (1.0 - alpha) / a0;
            this.b[2] = this.b[0] = (1.0 + cos) / (2.0 * a0);
            this.b[1] = -(1.0 + cos) / a0;
            this.order = 2;
        }
        peak2ndOrder(cornerRadiansPerSample, peakLinearGain, bandWidthScale) {
            const sqrtGain = Math.sqrt(peakLinearGain);
            const bandWidth = bandWidthScale * cornerRadiansPerSample / (sqrtGain >= 1 ? sqrtGain : 1 / sqrtGain);
            const alpha = Math.tan(bandWidth * 0.5);
            const a0 = 1.0 + alpha / sqrtGain;
            this.b[0] = (1.0 + alpha * sqrtGain) / a0;
            this.b[1] = this.a[1] = -2.0 * Math.cos(cornerRadiansPerSample) / a0;
            this.b[2] = (1.0 - alpha * sqrtGain) / a0;
            this.a[2] = (1.0 - alpha / sqrtGain) / a0;
            this.order = 2;
        }
    }
    class FrequencyResponse {
        constructor() {
            this.real = 0.0;
            this.imag = 0.0;
            this.denom = 1.0;
        }
        analyze(filter, radiansPerSample) {
            this.analyzeComplex(filter, Math.cos(radiansPerSample), Math.sin(radiansPerSample));
        }
        analyzeComplex(filter, real, imag) {
            const a = filter.a;
            const b = filter.b;
            const realZ1 = real;
            const imagZ1 = -imag;
            let realNum = b[0] + b[1] * realZ1;
            let imagNum = b[1] * imagZ1;
            let realDenom = 1.0 + a[1] * realZ1;
            let imagDenom = a[1] * imagZ1;
            let realZ = realZ1;
            let imagZ = imagZ1;
            for (let i = 2; i <= filter.order; i++) {
                const realTemp = realZ * realZ1 - imagZ * imagZ1;
                const imagTemp = realZ * imagZ1 + imagZ * realZ1;
                realZ = realTemp;
                imagZ = imagTemp;
                realNum += b[i] * realZ;
                imagNum += b[i] * imagZ;
                realDenom += a[i] * realZ;
                imagDenom += a[i] * imagZ;
            }
            this.denom = realDenom * realDenom + imagDenom * imagDenom;
            this.real = realNum * realDenom + imagNum * imagDenom;
            this.imag = imagNum * realDenom - realNum * imagDenom;
        }
        magnitude() {
            return Math.sqrt(this.real * this.real + this.imag * this.imag) / this.denom;
        }
        angle() {
            return Math.atan2(this.imag, this.real);
        }
    }
    class DynamicBiquadFilter {
        constructor() {
            this.a1 = 0.0;
            this.a2 = 0.0;
            this.b0 = 1.0;
            this.b1 = 0.0;
            this.b2 = 0.0;
            this.a1Delta = 0.0;
            this.a2Delta = 0.0;
            this.b0Delta = 0.0;
            this.b1Delta = 0.0;
            this.b2Delta = 0.0;
            this.output1 = 0.0;
            this.output2 = 0.0;
            this.useMultiplicativeInputCoefficients = false;
        }
        resetOutput() {
            this.output1 = 0.0;
            this.output2 = 0.0;
        }
        loadCoefficientsWithGradient(start, end, deltaRate, useMultiplicativeInputCoefficients) {
            if (start.order != 2 || end.order != 2)
                throw new Error();
            this.a1 = start.a[1];
            this.a2 = start.a[2];
            this.b0 = start.b[0];
            this.b1 = start.b[1];
            this.b2 = start.b[2];
            this.a1Delta = (end.a[1] - start.a[1]) * deltaRate;
            this.a2Delta = (end.a[2] - start.a[2]) * deltaRate;
            if (useMultiplicativeInputCoefficients) {
                this.b0Delta = Math.pow(end.b[0] / start.b[0], deltaRate);
                this.b1Delta = Math.pow(end.b[1] / start.b[1], deltaRate);
                this.b2Delta = Math.pow(end.b[2] / start.b[2], deltaRate);
            }
            else {
                this.b0Delta = (end.b[0] - start.b[0]) * deltaRate;
                this.b1Delta = (end.b[1] - start.b[1]) * deltaRate;
                this.b2Delta = (end.b[2] - start.b[2]) * deltaRate;
            }
            this.useMultiplicativeInputCoefficients = useMultiplicativeInputCoefficients;
        }
    }

    const epsilon = (1.0e-24);
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
    function makeNotePin(interval, time, size) {
        return { interval: interval, time: time, size: size };
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
        constructor(pitch, start, end, size, fadeout = false) {
            this.pitches = [pitch];
            this.pins = [makeNotePin(0, 0, size), makeNotePin(0, end - start, fadeout ? 0 : size)];
            this.start = start;
            this.end = end;
            this.continuesLastPattern = false;
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
                let loudestSize = 0;
                for (let pinIndex = 0; pinIndex < this.pins.length; pinIndex++) {
                    const pin = this.pins[pinIndex];
                    if (loudestSize < pin.size) {
                        loudestSize = pin.size;
                        mainInterval = pin.interval;
                    }
                }
            }
            return mainInterval;
        }
        clone() {
            const newNote = new Note(-1, this.start, this.end, Config.noteSizeMax);
            newNote.pitches = this.pitches.concat();
            newNote.pins = [];
            for (const pin of this.pins) {
                newNote.pins.push(makeNotePin(pin.interval, pin.time, pin.size));
            }
            newNote.continuesLastPattern = this.continuesLastPattern;
            return newNote;
        }
        getEndPinIndex(part) {
            let endPinIndex;
            for (endPinIndex = 1; endPinIndex < this.pins.length - 1; endPinIndex++) {
                if (this.pins[endPinIndex].time + this.start > part)
                    break;
            }
            return endPinIndex;
        }
    }
    class Pattern {
        constructor() {
            this.notes = [];
            this.instruments = [0];
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
            this.instruments[0] = 0;
            this.instruments.length = 1;
        }
    }
    class Operator {
        constructor(index) {
            this.frequency = 0;
            this.amplitude = 0;
            this.reset(index);
        }
        reset(index) {
            this.frequency = 0;
            this.amplitude = (index <= 1) ? Config.operatorAmplitudeMax : 0;
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
            if (this._waveIsReady)
                return this._wave;
            const waveLength = Config.spectrumNoiseLength;
            if (this._wave == null || this._wave.length != waveLength + 1) {
                this._wave = new Float32Array(waveLength + 1);
            }
            const wave = this._wave;
            for (let i = 0; i < waveLength; i++) {
                wave[i] = 0;
            }
            const highestOctave = 14;
            const falloffRatio = 0.25;
            const pitchTweak = [0, 1 / 7, Math.log2(5 / 4), 3 / 7, Math.log2(3 / 2), 5 / 7, 6 / 7];
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
                combinedAmplitude += 0.02 * drawNoiseSpectrum(wave, waveLength, octave1, octave2, value1 / Config.spectrumMax, value2 / Config.spectrumMax, -0.5);
            }
            if (this.spectrum[Config.spectrumControlPoints - 1] > 0) {
                combinedAmplitude += 0.02 * drawNoiseSpectrum(wave, waveLength, highestOctave + (controlPointToOctave(Config.spectrumControlPoints) - highestOctave) * falloffRatio, highestOctave, this.spectrum[Config.spectrumControlPoints - 1] / Config.spectrumMax, 0, -0.5);
            }
            inverseRealFourierTransform(wave, waveLength);
            scaleElementsByFactor(wave, 5.0 / (Math.sqrt(waveLength) * Math.pow(combinedAmplitude, 0.75)));
            wave[waveLength] = wave[0];
            this._waveIsReady = true;
            return wave;
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
        getCustomWave(instrumentType) {
            if (this._generatedForType != instrumentType) {
                this._generatedForType = instrumentType;
                this._waveIsReady = false;
            }
            const harmonicsRendered = (instrumentType == 7) ? Config.harmonicsRenderedForPickedString : Config.harmonicsRendered;
            if (this._waveIsReady)
                return this._wave;
            const waveLength = Config.harmonicsWavelength;
            const retroWave = getDrumWave(0, null, null);
            if (this._wave == null || this._wave.length != waveLength + 1) {
                this._wave = new Float32Array(waveLength + 1);
            }
            const wave = this._wave;
            for (let i = 0; i < waveLength; i++) {
                wave[i] = 0;
            }
            const overallSlope = -0.25;
            let combinedControlPointAmplitude = 1;
            for (let harmonicIndex = 0; harmonicIndex < harmonicsRendered; harmonicIndex++) {
                const harmonicFreq = harmonicIndex + 1;
                let controlValue = harmonicIndex < Config.harmonicsControlPoints ? this.harmonics[harmonicIndex] : this.harmonics[Config.harmonicsControlPoints - 1];
                if (harmonicIndex >= Config.harmonicsControlPoints) {
                    controlValue *= 1 - (harmonicIndex - Config.harmonicsControlPoints) / (harmonicsRendered - Config.harmonicsControlPoints);
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
            for (let i = 0; i < wave.length; i++)
                wave[i] *= mult;
            performIntegral(wave);
            wave[waveLength] = wave[0];
            this._waveIsReady = true;
            return wave;
        }
    }
    class FilterControlPoint {
        constructor() {
            this.freq = 0;
            this.gain = Config.filterGainCenter;
            this.type = 2;
        }
        set(freqSetting, gainSetting) {
            this.freq = freqSetting;
            this.gain = gainSetting;
        }
        getHz() {
            return FilterControlPoint.getHzFromSettingValue(this.freq);
        }
        static getHzFromSettingValue(value) {
            return Config.filterFreqReferenceHz * Math.pow(2.0, (value - Config.filterFreqReferenceSetting) * Config.filterFreqStep);
        }
        static getSettingValueFromHz(hz) {
            return Math.log2(hz / Config.filterFreqReferenceHz) / Config.filterFreqStep + Config.filterFreqReferenceSetting;
        }
        static getRoundedSettingValueFromHz(hz) {
            return Math.max(0, Math.min(Config.filterFreqRange - 1, Math.round(FilterControlPoint.getSettingValueFromHz(hz))));
        }
        getLinearGain(peakMult = 1.0) {
            const power = (this.gain - Config.filterGainCenter) * Config.filterGainStep;
            const neutral = (this.type == 2) ? 0.0 : -0.5;
            const interpolatedPower = neutral + (power - neutral) * peakMult;
            return Math.pow(2.0, interpolatedPower);
        }
        static getRoundedSettingValueFromLinearGain(linearGain) {
            return Math.max(0, Math.min(Config.filterGainRange - 1, Math.round(Math.log2(linearGain) / Config.filterGainStep + Config.filterGainCenter)));
        }
        toCoefficients(filter, sampleRate, freqMult = 1.0, peakMult = 1.0) {
            const cornerRadiansPerSample = 2.0 * Math.PI * Math.max(Config.filterFreqMinHz, Math.min(Config.filterFreqMaxHz, freqMult * this.getHz())) / sampleRate;
            const linearGain = this.getLinearGain(peakMult);
            switch (this.type) {
                case 0:
                    filter.lowPass2ndOrderButterworth(cornerRadiansPerSample, linearGain);
                    break;
                case 1:
                    filter.highPass2ndOrderButterworth(cornerRadiansPerSample, linearGain);
                    break;
                case 2:
                    filter.peak2ndOrder(cornerRadiansPerSample, linearGain, 1.0);
                    break;
                default:
                    throw new Error();
            }
        }
        getVolumeCompensationMult() {
            const octave = (this.freq - Config.filterFreqReferenceSetting) * Config.filterFreqStep;
            const gainPow = (this.gain - Config.filterGainCenter) * Config.filterGainStep;
            switch (this.type) {
                case 0:
                    const freqRelativeTo8khz = Math.pow(2.0, octave) * Config.filterFreqReferenceHz / 8000.0;
                    const warpedFreq = (Math.sqrt(1.0 + 4.0 * freqRelativeTo8khz) - 1.0) / 2.0;
                    const warpedOctave = Math.log2(warpedFreq);
                    return Math.pow(0.5, 0.2 * Math.max(0.0, gainPow + 1.0) + Math.min(0.0, Math.max(-3.0, 0.595 * warpedOctave + 0.35 * Math.min(0.0, gainPow + 1.0))));
                case 1:
                    return Math.pow(0.5, 0.125 * Math.max(0.0, gainPow + 1.0) + Math.min(0.0, 0.3 * (-octave - Math.log2(Config.filterFreqReferenceHz / 125.0)) + 0.2 * Math.min(0.0, gainPow + 1.0)));
                case 2:
                    const distanceFromCenter = octave + Math.log2(Config.filterFreqReferenceHz / 2000.0);
                    const freqLoudness = Math.pow(1.0 / (1.0 + Math.pow(distanceFromCenter / 3.0, 2.0)), 2.0);
                    return Math.pow(0.5, 0.125 * Math.max(0.0, gainPow) + 0.1 * freqLoudness * Math.min(0.0, gainPow));
                default:
                    throw new Error();
            }
        }
    }
    class FilterSettings {
        constructor() {
            this.controlPoints = [];
            this.controlPointCount = 0;
            this.reset();
        }
        reset() {
            this.controlPointCount = 0;
        }
        addPoint(type, freqSetting, gainSetting) {
            let controlPoint;
            if (this.controlPoints.length <= this.controlPointCount) {
                controlPoint = new FilterControlPoint();
                this.controlPoints[this.controlPointCount] = controlPoint;
            }
            else {
                controlPoint = this.controlPoints[this.controlPointCount];
            }
            this.controlPointCount++;
            controlPoint.type = type;
            controlPoint.set(freqSetting, gainSetting);
        }
        toJsonObject() {
            const filterArray = [];
            for (let i = 0; i < this.controlPointCount; i++) {
                const point = this.controlPoints[i];
                filterArray.push({
                    "type": Config.filterTypeNames[point.type],
                    "cutoffHz": Math.round(point.getHz() * 100) / 100,
                    "linearGain": Math.round(point.getLinearGain() * 10000) / 10000,
                });
            }
            return filterArray;
        }
        fromJsonObject(filterObject) {
            this.controlPoints.length = 0;
            if (filterObject) {
                for (const pointObject of filterObject) {
                    const point = new FilterControlPoint();
                    point.type = Config.filterTypeNames.indexOf(pointObject["type"]);
                    if (point.type == -1)
                        point.type = 2;
                    if (pointObject["cutoffHz"] != undefined) {
                        point.freq = FilterControlPoint.getRoundedSettingValueFromHz(pointObject["cutoffHz"]);
                    }
                    else {
                        point.freq = 0;
                    }
                    if (pointObject["linearGain"] != undefined) {
                        point.gain = FilterControlPoint.getRoundedSettingValueFromLinearGain(pointObject["linearGain"]);
                    }
                    else {
                        point.gain = Config.filterGainCenter;
                    }
                    this.controlPoints.push(point);
                }
            }
            this.controlPointCount = this.controlPoints.length;
        }
        convertLegacySettings(legacyCutoffSetting, legacyResonanceSetting, legacyEnv) {
            this.reset();
            const legacyFilterCutoffMaxHz = 8000;
            const legacyFilterMax = 0.95;
            const legacyFilterMaxRadians = Math.asin(legacyFilterMax / 2.0) * 2.0;
            const legacyFilterMaxResonance = 0.95;
            const legacyFilterCutoffRange = 11;
            const legacyFilterResonanceRange = 8;
            const resonant = (legacyResonanceSetting > 1);
            const firstOrder = (legacyResonanceSetting == 0);
            const cutoffAtMax = (legacyCutoffSetting == legacyFilterCutoffRange - 1);
            const envDecays = (legacyEnv.type == 3 || legacyEnv.type == 4 || legacyEnv.type == 8 || legacyEnv.type == 0);
            const standardSampleRate = 48000;
            const legacyHz = legacyFilterCutoffMaxHz * Math.pow(2.0, (legacyCutoffSetting - (legacyFilterCutoffRange - 1)) * 0.5);
            const legacyRadians = Math.min(legacyFilterMaxRadians, 2 * Math.PI * legacyHz / standardSampleRate);
            if (legacyEnv.type == 1 && !resonant && cutoffAtMax) ;
            else if (firstOrder) {
                const extraOctaves = 3.5;
                const targetRadians = legacyRadians * Math.pow(2.0, extraOctaves);
                const curvedRadians = targetRadians / (1.0 + targetRadians / Math.PI);
                const curvedHz = standardSampleRate * curvedRadians / (2.0 * Math.PI);
                const freqSetting = FilterControlPoint.getRoundedSettingValueFromHz(curvedHz);
                const finalHz = FilterControlPoint.getHzFromSettingValue(freqSetting);
                const finalRadians = 2.0 * Math.PI * finalHz / standardSampleRate;
                const legacyFilter = new FilterCoefficients();
                legacyFilter.lowPass1stOrderSimplified(legacyRadians);
                const response = new FrequencyResponse();
                response.analyze(legacyFilter, finalRadians);
                const legacyFilterGainAtNewRadians = response.magnitude();
                let logGain = Math.log2(legacyFilterGainAtNewRadians);
                logGain = -extraOctaves + (logGain + extraOctaves) * 0.82;
                if (envDecays)
                    logGain = Math.min(logGain, -1.0);
                const convertedGain = Math.pow(2.0, logGain);
                const gainSetting = FilterControlPoint.getRoundedSettingValueFromLinearGain(convertedGain);
                this.addPoint(0, freqSetting, gainSetting);
            }
            else {
                const intendedGain = 0.5 / (1.0 - legacyFilterMaxResonance * Math.sqrt(Math.max(0.0, legacyResonanceSetting - 1.0) / (legacyFilterResonanceRange - 2.0)));
                const invertedGain = 0.5 / intendedGain;
                const maxRadians = 2.0 * Math.PI * legacyFilterCutoffMaxHz / standardSampleRate;
                const freqRatio = legacyRadians / maxRadians;
                const targetRadians = legacyRadians * (freqRatio * Math.pow(invertedGain, 0.9) + 1.0);
                const curvedRadians = legacyRadians + (targetRadians - legacyRadians) * invertedGain;
                let curvedHz;
                if (envDecays) {
                    curvedHz = standardSampleRate * Math.min(curvedRadians, legacyRadians * Math.pow(2, 0.25)) / (2.0 * Math.PI);
                }
                else {
                    curvedHz = standardSampleRate * curvedRadians / (2.0 * Math.PI);
                }
                const freqSetting = FilterControlPoint.getRoundedSettingValueFromHz(curvedHz);
                let legacyFilterGain;
                if (envDecays) {
                    legacyFilterGain = intendedGain;
                }
                else {
                    const legacyFilter = new FilterCoefficients();
                    legacyFilter.lowPass2ndOrderSimplified(legacyRadians, intendedGain);
                    const response = new FrequencyResponse();
                    response.analyze(legacyFilter, curvedRadians);
                    legacyFilterGain = response.magnitude();
                }
                if (!resonant)
                    legacyFilterGain = Math.min(legacyFilterGain, Math.sqrt(0.5));
                const gainSetting = FilterControlPoint.getRoundedSettingValueFromLinearGain(legacyFilterGain);
                this.addPoint(0, freqSetting, gainSetting);
            }
        }
    }
    class EnvelopeSettings {
        constructor() {
            this.target = 0;
            this.index = 0;
            this.envelope = 0;
            this.reset();
        }
        reset() {
            this.target = 0;
            this.index = 0;
            this.envelope = 0;
        }
        toJsonObject() {
            const envelopeObject = {
                "target": Config.instrumentAutomationTargets[this.target].name,
                "envelope": Config.envelopes[this.envelope].name,
            };
            if (Config.instrumentAutomationTargets[this.target].maxCount > 1) {
                envelopeObject["index"] = this.index;
            }
            return envelopeObject;
        }
        fromJsonObject(envelopeObject) {
            this.reset();
            let target = Config.instrumentAutomationTargets.dictionary[envelopeObject["target"]];
            if (target == null)
                target = Config.instrumentAutomationTargets.dictionary["noteVolume"];
            this.target = target.index;
            let envelope = Config.envelopes.dictionary[envelopeObject["envelope"]];
            if (envelope == null)
                envelope = Config.envelopes.dictionary["none"];
            this.envelope = envelope.index;
            if (envelopeObject["index"] != undefined) {
                this.index = clamp(0, Config.instrumentAutomationTargets[this.target].maxCount, envelopeObject["index"] | 0);
            }
            else {
                this.index = 0;
            }
        }
    }
    class Instrument {
        constructor(isNoiseChannel) {
            this.type = 0;
            this.preset = 0;
            this.chipWave = 2;
            this.chipNoise = 1;
            this.eqFilter = new FilterSettings();
            this.noteFilter = new FilterSettings();
            this.envelopes = [];
            this.envelopeCount = 0;
            this.fadeIn = 0;
            this.fadeOut = Config.fadeOutNeutral;
            this.transition = Config.transitions.dictionary["normal"].index;
            this.pitchShift = 0;
            this.detune = 0;
            this.vibrato = 0;
            this.unison = 0;
            this.effects = 0;
            this.chord = 1;
            this.volume = 0;
            this.pan = Config.panCenter;
            this.pulseWidth = Config.pulseWidthRange - 1;
            this.stringSustain = 10;
            this.distortion = 0;
            this.bitcrusherFreq = 0;
            this.bitcrusherQuantization = 0;
            this.chorus = 0;
            this.reverb = 0;
            this.echoSustain = 0;
            this.echoDelay = 0;
            this.algorithm = 0;
            this.feedbackType = 0;
            this.feedbackAmplitude = 0;
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
            this.effects = 0;
            this.chorus = Config.chorusRange - 1;
            this.reverb = 2;
            this.echoSustain = Math.floor((Config.echoSustainRange - 1) * 0.5);
            this.echoDelay = Math.floor((Config.echoDelayRange - 1) * 0.5);
            this.eqFilter.reset();
            this.noteFilter.reset();
            this.distortion = Math.floor((Config.distortionRange - 1) * 0.75);
            this.bitcrusherFreq = Math.floor((Config.bitcrusherFreqRange - 1) * 0.5);
            this.bitcrusherQuantization = Math.floor((Config.bitcrusherQuantizationRange - 1) * 0.5);
            this.pan = Config.panCenter;
            this.pitchShift = Config.pitchShiftCenter;
            this.detune = Config.detuneCenter;
            this.vibrato = 0;
            this.unison = 0;
            this.stringSustain = 10;
            this.fadeIn = 0;
            this.fadeOut = Config.fadeOutNeutral;
            this.transition = Config.transitions.dictionary["normal"].index;
            this.envelopeCount = 0;
            switch (type) {
                case 0:
                    this.chipWave = 2;
                    this.chord = Config.chords.dictionary["arpeggio"].index;
                    break;
                case 1:
                    this.chord = Config.chords.dictionary["custom interval"].index;
                    this.algorithm = 0;
                    this.feedbackType = 0;
                    this.feedbackAmplitude = 0;
                    for (let i = 0; i < this.operators.length; i++) {
                        this.operators[i].reset(i);
                    }
                    break;
                case 2:
                    this.chipNoise = 1;
                    this.chord = Config.chords.dictionary["arpeggio"].index;
                    break;
                case 3:
                    this.chord = Config.chords.dictionary["simultaneous"].index;
                    this.spectrumWave.reset(isNoiseChannel);
                    break;
                case 4:
                    this.chord = Config.chords.dictionary["simultaneous"].index;
                    for (let i = 0; i < Config.drumCount; i++) {
                        this.drumsetEnvelopes[i] = Config.envelopes.dictionary["twang 2"].index;
                        this.drumsetSpectrumWaves[i].reset(isNoiseChannel);
                    }
                    break;
                case 5:
                    this.chord = Config.chords.dictionary["simultaneous"].index;
                    this.harmonicsWave.reset();
                    break;
                case 6:
                    this.chord = Config.chords.dictionary["arpeggio"].index;
                    this.pulseWidth = Config.pulseWidthRange - 1;
                    break;
                case 7:
                    this.chord = Config.chords.dictionary["strum"].index;
                    this.harmonicsWave.reset();
                    break;
                default:
                    throw new Error("Unrecognized instrument type: " + type);
            }
            if (this.chord != Config.chords.dictionary["simultaneous"].index) {
                this.effects = (this.effects | (1 << 11));
            }
        }
        convertLegacySettings(legacySettings) {
            let legacyCutoffSetting = legacySettings.filterCutoff;
            let legacyResonanceSetting = legacySettings.filterResonance;
            let legacyFilterEnv = legacySettings.filterEnvelope;
            let legacyPulseEnv = legacySettings.pulseEnvelope;
            let legacyOperatorEnvelopes = legacySettings.operatorEnvelopes;
            let legacyFeedbackEnv = legacySettings.feedbackEnvelope;
            if (legacyCutoffSetting == undefined)
                legacyCutoffSetting = (this.type == 0) ? 6 : 10;
            if (legacyResonanceSetting == undefined)
                legacyResonanceSetting = 0;
            if (legacyFilterEnv == undefined)
                legacyFilterEnv = Config.envelopes.dictionary["none"];
            if (legacyPulseEnv == undefined)
                legacyPulseEnv = Config.envelopes.dictionary[(this.type == 6) ? "twang 2" : "none"];
            if (legacyOperatorEnvelopes == undefined)
                legacyOperatorEnvelopes = [Config.envelopes.dictionary[(this.type == 1) ? "note size" : "none"], Config.envelopes.dictionary["none"], Config.envelopes.dictionary["none"], Config.envelopes.dictionary["none"]];
            if (legacyFeedbackEnv == undefined)
                legacyFeedbackEnv = Config.envelopes.dictionary["none"];
            const carrierCount = Config.algorithms[this.algorithm].carrierCount;
            let noCarriersControlledByNoteSize = true;
            let allCarriersControlledByNoteSize = true;
            let noteSizeControlsSomethingElse = (legacyFilterEnv.type == 0) || (legacyPulseEnv.type == 0);
            if (this.type == 1) {
                noteSizeControlsSomethingElse = noteSizeControlsSomethingElse || (legacyFeedbackEnv.type == 0);
                for (let i = 0; i < legacyOperatorEnvelopes.length; i++) {
                    if (i < carrierCount) {
                        if (legacyOperatorEnvelopes[i].type != 0) {
                            allCarriersControlledByNoteSize = false;
                        }
                        else {
                            noCarriersControlledByNoteSize = false;
                        }
                    }
                    else {
                        noteSizeControlsSomethingElse = noteSizeControlsSomethingElse || (legacyOperatorEnvelopes[i].type == 0);
                    }
                }
            }
            this.envelopeCount = 0;
            if (this.type == 1) {
                if (allCarriersControlledByNoteSize && noteSizeControlsSomethingElse) {
                    this.addEnvelope(Config.instrumentAutomationTargets.dictionary["noteVolume"].index, 0, Config.envelopes.dictionary["note size"].index);
                }
                else if (noCarriersControlledByNoteSize && !noteSizeControlsSomethingElse) {
                    this.addEnvelope(Config.instrumentAutomationTargets.dictionary["none"].index, 0, Config.envelopes.dictionary["note size"].index);
                }
            }
            if (legacyFilterEnv.type == 1) {
                this.noteFilter.reset();
                this.eqFilter.convertLegacySettings(legacyCutoffSetting, legacyResonanceSetting, legacyFilterEnv);
                this.effects &= ~(1 << 5);
            }
            else {
                this.eqFilter.reset();
                this.noteFilter.convertLegacySettings(legacyCutoffSetting, legacyResonanceSetting, legacyFilterEnv);
                this.effects |= 1 << 5;
                this.addEnvelope(Config.instrumentAutomationTargets.dictionary["noteFilterAllFreqs"].index, 0, legacyFilterEnv.index);
            }
            if (legacyPulseEnv.type != 1) {
                this.addEnvelope(Config.instrumentAutomationTargets.dictionary["pulseWidth"].index, 0, legacyPulseEnv.index);
            }
            for (let i = 0; i < legacyOperatorEnvelopes.length; i++) {
                if (i < carrierCount && allCarriersControlledByNoteSize)
                    continue;
                if (legacyOperatorEnvelopes[i].type != 1) {
                    this.addEnvelope(Config.instrumentAutomationTargets.dictionary["operatorAmplitude"].index, i, legacyOperatorEnvelopes[i].index);
                }
            }
            if (legacyFeedbackEnv.type != 1) {
                this.addEnvelope(Config.instrumentAutomationTargets.dictionary["feedbackAmplitude"].index, 0, legacyFeedbackEnv.index);
            }
        }
        toJsonObject() {
            const instrumentObject = {
                "type": Config.instrumentTypeNames[this.type],
                "volume": (5 - this.volume) * 20,
                "eqFilter": this.eqFilter.toJsonObject(),
            };
            if (this.preset != this.type) {
                instrumentObject["preset"] = this.preset;
            }
            const effects = [];
            for (const effect of Config.effectOrder) {
                if (this.effects & (1 << effect)) {
                    effects.push(Config.effectNames[effect]);
                }
            }
            instrumentObject["effects"] = effects;
            if (effectsIncludeTransition(this.effects)) {
                instrumentObject["transition"] = Config.transitions[this.transition].name;
            }
            if (effectsIncludeChord(this.effects)) {
                instrumentObject["chord"] = this.getChord().name;
            }
            if (effectsIncludePitchShift(this.effects)) {
                instrumentObject["pitchShiftSemitones"] = this.pitchShift;
            }
            if (effectsIncludeDetune(this.effects)) {
                instrumentObject["detuneCents"] = Synth.detuneToCents(this.detune - Config.detuneCenter);
            }
            if (effectsIncludeVibrato(this.effects)) {
                instrumentObject["vibrato"] = Config.vibratos[this.vibrato].name;
            }
            if (effectsIncludeNoteFilter(this.effects)) {
                instrumentObject["noteFilter"] = this.noteFilter.toJsonObject();
            }
            if (effectsIncludeDistortion(this.effects)) {
                instrumentObject["distortion"] = Math.round(100 * this.distortion / (Config.distortionRange - 1));
            }
            if (effectsIncludeBitcrusher(this.effects)) {
                instrumentObject["bitcrusherOctave"] = (Config.bitcrusherFreqRange - 1 - this.bitcrusherFreq) * Config.bitcrusherOctaveStep;
                instrumentObject["bitcrusherQuantization"] = Math.round(100 * this.bitcrusherQuantization / (Config.bitcrusherQuantizationRange - 1));
            }
            if (effectsIncludePanning(this.effects)) {
                instrumentObject["pan"] = Math.round(100 * (this.pan - Config.panCenter) / Config.panCenter);
            }
            if (effectsIncludeChorus(this.effects)) {
                instrumentObject["chorus"] = Math.round(100 * this.chorus / (Config.chorusRange - 1));
            }
            if (effectsIncludeEcho(this.effects)) {
                instrumentObject["echoSustain"] = Math.round(100 * this.echoSustain / (Config.echoSustainRange - 1));
                instrumentObject["echoDelayBeats"] = Math.round(1000 * (this.echoDelay + 1) * Config.echoDelayStepTicks / (Config.ticksPerPart * Config.partsPerBeat)) / 1000;
            }
            if (effectsIncludeReverb(this.effects)) {
                instrumentObject["reverb"] = Math.round(100 * this.reverb / (Config.reverbRange - 1));
            }
            if (this.type != 4) {
                instrumentObject["fadeInSeconds"] = Math.round(10000 * Synth.fadeInSettingToSeconds(this.fadeIn)) / 10000;
                instrumentObject["fadeOutTicks"] = Synth.fadeOutSettingToTicks(this.fadeOut);
            }
            if (this.type == 5 || this.type == 7) {
                instrumentObject["harmonics"] = [];
                for (let i = 0; i < Config.harmonicsControlPoints; i++) {
                    instrumentObject["harmonics"][i] = Math.round(100 * this.harmonicsWave.harmonics[i] / Config.harmonicsMax);
                }
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
                instrumentObject["unison"] = Config.unisons[this.unison].name;
            }
            else if (this.type == 6) {
                instrumentObject["pulseWidth"] = Math.round(getPulseWidthRatio(this.pulseWidth) * 100 * 100000) / 100000;
            }
            else if (this.type == 7) {
                instrumentObject["unison"] = Config.unisons[this.unison].name;
                instrumentObject["stringSustain"] = Math.round(100 * this.stringSustain / (Config.stringSustainRange - 1));
            }
            else if (this.type == 5) {
                instrumentObject["unison"] = Config.unisons[this.unison].name;
            }
            else if (this.type == 1) {
                const operatorArray = [];
                for (const operator of this.operators) {
                    operatorArray.push({
                        "frequency": Config.operatorFrequencies[operator.frequency].name,
                        "amplitude": operator.amplitude,
                    });
                }
                instrumentObject["algorithm"] = Config.algorithms[this.algorithm].name;
                instrumentObject["feedbackType"] = Config.feedbacks[this.feedbackType].name;
                instrumentObject["feedbackAmplitude"] = this.feedbackAmplitude;
                instrumentObject["operators"] = operatorArray;
            }
            else {
                throw new Error("Unrecognized instrument type");
            }
            const envelopes = [];
            for (let i = 0; i < this.envelopeCount; i++) {
                envelopes.push(this.envelopes[i].toJsonObject());
            }
            instrumentObject["envelopes"] = envelopes;
            return instrumentObject;
        }
        fromJsonObject(instrumentObject, isNoiseChannel, legacyGlobalReverb = 0) {
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
            if (Array.isArray(instrumentObject["effects"])) {
                let effects = 0;
                for (let i = 0; i < instrumentObject["effects"].length; i++) {
                    effects = effects | (1 << Config.effectNames.indexOf(instrumentObject["effects"][i]));
                }
                this.effects = (effects & ((1 << 12) - 1));
            }
            else {
                const legacyEffectsNames = ["none", "reverb", "chorus", "chorus & reverb"];
                this.effects = legacyEffectsNames.indexOf(instrumentObject["effects"]);
                if (this.effects == -1)
                    this.effects = (this.type == 2) ? 0 : 1;
            }
            this.transition = Config.transitions.dictionary["normal"].index;
            const transitionProperty = instrumentObject["transition"] || instrumentObject["envelope"];
            if (transitionProperty != undefined) {
                let transition = Config.transitions.dictionary[transitionProperty];
                if (instrumentObject["fadeInSeconds"] == undefined || instrumentObject["fadeOutTicks"] == undefined) {
                    const legacySettings = {
                        "binary": { transition: "interrupt", fadeInSeconds: 0.0, fadeOutTicks: -1 },
                        "seamless": { transition: "interrupt", fadeInSeconds: 0.0, fadeOutTicks: -1 },
                        "sudden": { transition: "normal", fadeInSeconds: 0.0, fadeOutTicks: -3 },
                        "hard": { transition: "normal", fadeInSeconds: 0.0, fadeOutTicks: -3 },
                        "smooth": { transition: "normal", fadeInSeconds: 0.025, fadeOutTicks: -3 },
                        "soft": { transition: "normal", fadeInSeconds: 0.025, fadeOutTicks: -3 },
                        "slide": { transition: "slide in pattern", fadeInSeconds: 0.025, fadeOutTicks: -3 },
                        "cross fade": { transition: "normal", fadeInSeconds: 0.04, fadeOutTicks: 6 },
                        "hard fade": { transition: "normal", fadeInSeconds: 0.0, fadeOutTicks: 48 },
                        "medium fade": { transition: "normal", fadeInSeconds: 0.0125, fadeOutTicks: 72 },
                        "soft fade": { transition: "normal", fadeInSeconds: 0.06, fadeOutTicks: 96 },
                    }[transitionProperty];
                    if (legacySettings != undefined) {
                        transition = Config.transitions.dictionary[legacySettings.transition];
                        this.fadeIn = Synth.secondsToFadeInSetting(legacySettings.fadeInSeconds);
                        this.fadeOut = Synth.ticksToFadeOutSetting(legacySettings.fadeOutTicks);
                    }
                }
                if (transition != undefined)
                    this.transition = transition.index;
                if (this.transition != Config.transitions.dictionary["normal"].index) {
                    this.effects = (this.effects | (1 << 10));
                }
            }
            if (instrumentObject["fadeInSeconds"] != undefined) {
                this.fadeIn = Synth.secondsToFadeInSetting(+instrumentObject["fadeInSeconds"]);
            }
            if (instrumentObject["fadeOutTicks"] != undefined) {
                this.fadeOut = Synth.ticksToFadeOutSetting(+instrumentObject["fadeOutTicks"]);
            }
            {
                const chordProperty = instrumentObject["chord"];
                const legacyChordNames = { "harmony": "simultaneous" };
                const chord = Config.chords.dictionary[legacyChordNames[chordProperty]] || Config.chords.dictionary[chordProperty];
                if (chord != undefined) {
                    this.chord = chord.index;
                }
                else {
                    if (this.type == 2) {
                        this.chord = Config.chords.dictionary["arpeggio"].index;
                    }
                    else if (this.type == 7) {
                        this.chord = Config.chords.dictionary["strum"].index;
                    }
                    else if (this.type == 0) {
                        this.chord = Config.chords.dictionary["arpeggio"].index;
                    }
                    else if (this.type == 1) {
                        this.chord = Config.chords.dictionary["custom interval"].index;
                    }
                    else {
                        this.chord = Config.chords.dictionary["simultaneous"].index;
                    }
                }
            }
            this.unison = Config.unisons.dictionary["none"].index;
            const unisonProperty = instrumentObject["unison"] || instrumentObject["interval"] || instrumentObject["chorus"];
            if (unisonProperty != undefined) {
                const legacyChorusNames = { "union": "none", "fifths": "fifth", "octaves": "octave" };
                const unison = Config.unisons.dictionary[legacyChorusNames[unisonProperty]] || Config.unisons.dictionary[unisonProperty];
                if (unison != undefined)
                    this.unison = unison.index;
            }
            if (instrumentObject["chorus"] == "custom harmony") {
                this.unison = Config.unisons.dictionary["hum"].index;
                this.chord = Config.chords.dictionary["custom interval"].index;
            }
            if (this.chord != Config.chords.dictionary["simultaneous"].index && !Array.isArray(instrumentObject["effects"])) {
                this.effects = (this.effects | (1 << 11));
            }
            if (instrumentObject["pitchShiftSemitones"] != undefined) {
                this.pitchShift = clamp(0, Config.pitchShiftRange, Math.round(+instrumentObject["pitchShiftSemitones"]));
            }
            if (instrumentObject["detuneCents"] != undefined) {
                this.detune = clamp(0, Config.detuneMax + 1, Math.round(Config.detuneCenter + Synth.centsToDetune(+instrumentObject["detuneCents"])));
            }
            this.vibrato = Config.vibratos.dictionary["none"].index;
            const vibratoProperty = instrumentObject["vibrato"] || instrumentObject["effect"];
            if (vibratoProperty != undefined) {
                const legacyVibratoNames = { "vibrato light": "light", "vibrato delayed": "delayed", "vibrato heavy": "heavy" };
                const vibrato = Config.vibratos.dictionary[legacyVibratoNames[unisonProperty]] || Config.vibratos.dictionary[vibratoProperty];
                if (vibrato != undefined)
                    this.vibrato = vibrato.index;
                if (vibrato != Config.vibratos.dictionary["none"]) {
                    this.effects = (this.effects | (1 << 9));
                }
            }
            if (instrumentObject["pan"] != undefined) {
                this.pan = clamp(0, Config.panMax + 1, Math.round(Config.panCenter + (instrumentObject["pan"] | 0) * Config.panCenter / 100));
                if (this.pan != Config.panCenter) {
                    this.effects = (this.effects | (1 << 2));
                }
            }
            else {
                this.pan = Config.panCenter;
            }
            if (instrumentObject["distortion"] != undefined) {
                this.distortion = clamp(0, Config.distortionRange, Math.round((Config.distortionRange - 1) * (instrumentObject["distortion"] | 0) / 100));
            }
            if (instrumentObject["bitcrusherOctave"] != undefined) {
                this.bitcrusherFreq = Config.bitcrusherFreqRange - 1 - (+instrumentObject["bitcrusherOctave"]) / Config.bitcrusherOctaveStep;
            }
            if (instrumentObject["bitcrusherQuantization"] != undefined) {
                this.bitcrusherQuantization = clamp(0, Config.bitcrusherQuantizationRange, Math.round((Config.bitcrusherQuantizationRange - 1) * (instrumentObject["bitcrusherQuantization"] | 0) / 100));
            }
            if (instrumentObject["echoSustain"] != undefined) {
                this.echoSustain = clamp(0, Config.echoSustainRange, Math.round((Config.echoSustainRange - 1) * (instrumentObject["echoSustain"] | 0) / 100));
            }
            if (instrumentObject["echoDelayBeats"] != undefined) {
                this.echoDelay = clamp(0, Config.echoDelayRange, Math.round((+instrumentObject["echoDelayBeats"]) * (Config.ticksPerPart * Config.partsPerBeat) / Config.echoDelayStepTicks - 1.0));
            }
            if (!isNaN(instrumentObject["chorus"])) {
                this.chorus = clamp(0, Config.chorusRange, Math.round((Config.chorusRange - 1) * (instrumentObject["chorus"] | 0) / 100));
            }
            if (instrumentObject["reverb"] != undefined) {
                this.reverb = clamp(0, Config.reverbRange, Math.round((Config.reverbRange - 1) * (instrumentObject["reverb"] | 0) / 100));
            }
            else {
                if (legacyGlobalReverb == 0) {
                    this.effects = (this.effects & (~(1 << 0)));
                }
                else {
                    this.reverb = legacyGlobalReverb;
                }
            }
            if (instrumentObject["pulseWidth"] != undefined) {
                this.pulseWidth = clamp(0, Config.pulseWidthRange, Math.round(Math.log2((+instrumentObject["pulseWidth"]) / 50) / 0.5 - 1 + 8));
            }
            else {
                this.pulseWidth = Config.pulseWidthRange - 1;
            }
            if (instrumentObject["harmonics"] != undefined) {
                for (let i = 0; i < Config.harmonicsControlPoints; i++) {
                    this.harmonicsWave.harmonics[i] = Math.max(0, Math.min(Config.harmonicsMax, Math.round(Config.harmonicsMax * (+instrumentObject["harmonics"][i]) / 100)));
                }
            }
            else {
                this.harmonicsWave.reset();
            }
            if (instrumentObject["spectrum"] != undefined) {
                for (let i = 0; i < Config.spectrumControlPoints; i++) {
                    this.spectrumWave.spectrum[i] = Math.max(0, Math.min(Config.spectrumMax, Math.round(Config.spectrumMax * (+instrumentObject["spectrum"][i]) / 100)));
                }
            }
            else {
                this.spectrumWave.reset(isNoiseChannel);
            }
            if (instrumentObject["stringSustain"] != undefined) {
                this.stringSustain = clamp(0, Config.stringSustainRange, Math.round((Config.stringSustainRange - 1) * (instrumentObject["stringSustain"] | 0) / 100));
            }
            else {
                this.stringSustain = 10;
            }
            if (this.type == 2) {
                this.chipNoise = Config.chipNoises.findIndex(wave => wave.name == instrumentObject["wave"]);
                if (this.chipNoise == -1)
                    this.chipNoise = 1;
            }
            const legacyEnvelopeNames = { "custom": "note size", "steady": "none", "pluck 1": "twang 1", "pluck 2": "twang 2", "pluck 3": "twang 3" };
            const getEnvelope = (name) => (legacyEnvelopeNames[name] != undefined) ? Config.envelopes.dictionary[legacyEnvelopeNames[name]] : Config.envelopes.dictionary[name];
            if (this.type == 4) {
                if (instrumentObject["drums"] != undefined) {
                    for (let j = 0; j < Config.drumCount; j++) {
                        const drum = instrumentObject["drums"][j];
                        if (drum == undefined)
                            continue;
                        this.drumsetEnvelopes[j] = Config.envelopes.dictionary["twang 2"].index;
                        if (drum["filterEnvelope"] != undefined) {
                            const envelope = getEnvelope(drum["filterEnvelope"]);
                            if (envelope != undefined)
                                this.drumsetEnvelopes[j] = envelope.index;
                        }
                        if (drum["spectrum"] != undefined) {
                            for (let i = 0; i < Config.spectrumControlPoints; i++) {
                                this.drumsetSpectrumWaves[j].spectrum[i] = Math.max(0, Math.min(Config.spectrumMax, Math.round(Config.spectrumMax * (+drum["spectrum"][i]) / 100)));
                            }
                        }
                    }
                }
            }
            if (this.type == 0) {
                const legacyWaveNames = { "triangle": 1, "square": 2, "pulse wide": 3, "pulse narrow": 4, "sawtooth": 5, "double saw": 6, "double pulse": 7, "spiky": 8, "plateau": 0 };
                this.chipWave = legacyWaveNames[instrumentObject["wave"]] != undefined ? legacyWaveNames[instrumentObject["wave"]] : Config.chipWaves.findIndex(wave => wave.name == instrumentObject["wave"]);
                if (this.chipWave == -1)
                    this.chipWave = 1;
            }
            if (this.type == 1) {
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
                for (let j = 0; j < Config.operatorCount; j++) {
                    const operator = this.operators[j];
                    let operatorObject = undefined;
                    if (instrumentObject["operators"] != undefined)
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
                }
            }
            if (instrumentObject["noteFilter"] != undefined) {
                this.noteFilter.fromJsonObject(instrumentObject["noteFilter"]);
            }
            else {
                this.noteFilter.reset();
            }
            if (Array.isArray(instrumentObject["eqFilter"])) {
                this.eqFilter.fromJsonObject(instrumentObject["eqFilter"]);
            }
            else {
                this.eqFilter.reset();
                const legacySettings = {};
                const filterCutoffMaxHz = 8000;
                const filterCutoffRange = 11;
                const filterResonanceRange = 8;
                if (instrumentObject["filterCutoffHz"] != undefined) {
                    legacySettings.filterCutoff = clamp(0, filterCutoffRange, Math.round((filterCutoffRange - 1) + 2.0 * Math.log((instrumentObject["filterCutoffHz"] | 0) / filterCutoffMaxHz) / Math.LN2));
                }
                else {
                    legacySettings.filterCutoff = (this.type == 0) ? 6 : 10;
                }
                if (instrumentObject["filterResonance"] != undefined) {
                    legacySettings.filterResonance = clamp(0, filterResonanceRange, Math.round((filterResonanceRange - 1) * (instrumentObject["filterResonance"] | 0) / 100));
                }
                else {
                    legacySettings.filterResonance = 0;
                }
                legacySettings.filterEnvelope = getEnvelope(instrumentObject["filterEnvelope"]);
                legacySettings.pulseEnvelope = getEnvelope(instrumentObject["pulseEnvelope"]);
                legacySettings.feedbackEnvelope = getEnvelope(instrumentObject["feedbackEnvelope"]);
                if (Array.isArray(instrumentObject["operators"])) {
                    legacySettings.operatorEnvelopes = [];
                    for (let j = 0; j < Config.operatorCount; j++) {
                        let envelope;
                        if (instrumentObject["operators"][j] != undefined) {
                            envelope = getEnvelope(instrumentObject["operators"][j]["envelope"]);
                        }
                        legacySettings.operatorEnvelopes[j] = (envelope != undefined) ? envelope : Config.envelopes.dictionary["none"];
                    }
                }
                if (instrumentObject["filter"] != undefined) {
                    const legacyToCutoff = [10, 6, 3, 0, 8, 5, 2];
                    const legacyToEnvelope = ["none", "none", "none", "none", "decay 1", "decay 2", "decay 3"];
                    const filterNames = ["none", "bright", "medium", "soft", "decay bright", "decay medium", "decay soft"];
                    const oldFilterNames = { "sustain sharp": 1, "sustain medium": 2, "sustain soft": 3, "decay sharp": 4 };
                    let legacyFilter = oldFilterNames[instrumentObject["filter"]] != undefined ? oldFilterNames[instrumentObject["filter"]] : filterNames.indexOf(instrumentObject["filter"]);
                    if (legacyFilter == -1)
                        legacyFilter = 0;
                    legacySettings.filterCutoff = legacyToCutoff[legacyFilter];
                    legacySettings.filterEnvelope = getEnvelope(legacyToEnvelope[legacyFilter]);
                    legacySettings.filterResonance = 0;
                }
                this.convertLegacySettings(legacySettings);
            }
            if (Array.isArray(instrumentObject["envelopes"])) {
                const envelopeArray = instrumentObject["envelopes"];
                for (let i = 0; i < envelopeArray.length; i++) {
                    if (this.envelopeCount >= Config.maxEnvelopeCount)
                        break;
                    const tempEnvelope = new EnvelopeSettings();
                    tempEnvelope.fromJsonObject(envelopeArray[i]);
                    this.addEnvelope(tempEnvelope.target, tempEnvelope.index, tempEnvelope.envelope);
                }
            }
        }
        static frequencyFromPitch(pitch) {
            return 440.0 * Math.pow(2.0, (pitch - 69.0) / 12.0);
        }
        static drumsetIndexReferenceDelta(index) {
            return Instrument.frequencyFromPitch(Config.spectrumBasePitch + index * 6) / 44100;
        }
        static _drumsetIndexToSpectrumOctave(index) {
            return 15 + Math.log2(Instrument.drumsetIndexReferenceDelta(index));
        }
        addEnvelope(target, index, envelope) {
            if (!this.supportsEnvelopeTarget(target, index))
                throw new Error();
            if (this.envelopeCount >= Config.maxEnvelopeCount)
                throw new Error();
            while (this.envelopes.length <= this.envelopeCount)
                this.envelopes[this.envelopes.length] = new EnvelopeSettings();
            const envelopeSettings = this.envelopes[this.envelopeCount];
            envelopeSettings.target = target;
            envelopeSettings.index = index;
            envelopeSettings.envelope = envelope;
            this.envelopeCount++;
        }
        supportsEnvelopeTarget(target, index) {
            const automationTarget = Config.instrumentAutomationTargets[target];
            if (index >= automationTarget.maxCount) {
                return false;
            }
            if (automationTarget.compatibleInstruments != null && automationTarget.compatibleInstruments.indexOf(this.type) == -1) {
                return false;
            }
            if (automationTarget.effect != null && (this.effects & (1 << automationTarget.effect)) == 0) {
                return false;
            }
            if (automationTarget.isFilter) {
                if (index >= this.noteFilter.controlPointCount)
                    return false;
            }
            return true;
        }
        clearInvalidEnvelopeTargets() {
            for (let envelopeIndex = 0; envelopeIndex < this.envelopeCount; envelopeIndex++) {
                const target = this.envelopes[envelopeIndex].target;
                const index = this.envelopes[envelopeIndex].index;
                if (!this.supportsEnvelopeTarget(target, index)) {
                    this.envelopes[envelopeIndex].target = Config.instrumentAutomationTargets.dictionary["none"].index;
                    this.envelopes[envelopeIndex].index = 0;
                }
            }
        }
        warmUp(samplesPerSecond) {
            if (this.type == 2) {
                getDrumWave(this.chipNoise, inverseRealFourierTransform, scaleElementsByFactor);
            }
            else if (this.type == 5) {
                this.harmonicsWave.getCustomWave(this.type);
            }
            else if (this.type == 7) {
                this.harmonicsWave.getCustomWave(this.type);
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
                throw new Error("Unhandled instrument type in getDrumsetWave");
            }
        }
        getTransition() {
            return effectsIncludeTransition(this.effects) ? Config.transitions[this.transition] : Config.transitions.dictionary["normal"];
        }
        getFadeInSeconds() {
            return (this.type == 4) ? 0.0 : Synth.fadeInSettingToSeconds(this.fadeIn);
        }
        getFadeOutTicks() {
            return (this.type == 4) ? Config.drumsetFadeOutTicks : Synth.fadeOutSettingToTicks(this.fadeOut);
        }
        getChord() {
            return effectsIncludeChord(this.effects) ? Config.chords[this.chord] : Config.chords.dictionary["simultaneous"];
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
        getMaxInstrumentsPerChannel() {
            return Math.max(this.layeredInstruments ? Config.layeredInstrumentCountMax : Config.instrumentCountMin, this.patternInstruments ? Config.patternInstrumentCountMax : Config.instrumentCountMin);
        }
        getMaxInstrumentsPerPattern(channelIndex) {
            return this.getMaxInstrumentsPerPatternForChannel(this.channels[channelIndex]);
        }
        getMaxInstrumentsPerPatternForChannel(channel) {
            return this.layeredInstruments
                ? Math.min(Config.layeredInstrumentCountMax, channel.instruments.length)
                : 1;
        }
        getChannelIsNoise(channelIndex) {
            return (channelIndex >= this.pitchChannelCount);
        }
        initToDefault(andResetChannels = true) {
            this.scale = 0;
            this.key = 0;
            this.loopStart = 0;
            this.loopLength = 4;
            this.tempo = 150;
            this.beatsPerBar = 8;
            this.barCount = 16;
            this.patternsPerChannel = 8;
            this.rhythm = 1;
            this.layeredInstruments = false;
            this.patternInstruments = false;
            if (andResetChannels) {
                this.pitchChannelCount = 3;
                this.noiseChannelCount = 1;
                for (let channelIndex = 0; channelIndex < this.getChannelCount(); channelIndex++) {
                    const isNoiseChannel = channelIndex >= this.pitchChannelCount;
                    if (this.channels.length <= channelIndex) {
                        this.channels[channelIndex] = new Channel();
                    }
                    const channel = this.channels[channelIndex];
                    channel.octave = isNoiseChannel ? 0 : 4 - channelIndex;
                    for (let pattern = 0; pattern < this.patternsPerChannel; pattern++) {
                        if (channel.patterns.length <= pattern) {
                            channel.patterns[pattern] = new Pattern();
                        }
                        else {
                            channel.patterns[pattern].reset();
                        }
                    }
                    channel.patterns.length = this.patternsPerChannel;
                    for (let instrument = 0; instrument < Config.instrumentCountMin; instrument++) {
                        if (channel.instruments.length <= instrument) {
                            channel.instruments[instrument] = new Instrument(isNoiseChannel);
                        }
                        channel.instruments[instrument].setTypeAndReset(isNoiseChannel ? 2 : 0, isNoiseChannel);
                    }
                    channel.instruments.length = Config.instrumentCountMin;
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
            buffer.push(97, base64IntToCharCode[this.beatsPerBar - 1]);
            buffer.push(103, base64IntToCharCode[(this.barCount - 1) >> 6], base64IntToCharCode[(this.barCount - 1) & 0x3f]);
            buffer.push(106, base64IntToCharCode[(this.patternsPerChannel - 1) >> 6], base64IntToCharCode[(this.patternsPerChannel - 1) & 0x3f]);
            buffer.push(114, base64IntToCharCode[this.rhythm]);
            buffer.push(105, base64IntToCharCode[(this.layeredInstruments << 1) | this.patternInstruments]);
            if (this.layeredInstruments || this.patternInstruments) {
                for (let channelIndex = 0; channelIndex < this.getChannelCount(); channelIndex++) {
                    buffer.push(base64IntToCharCode[this.channels[channelIndex].instruments.length - Config.instrumentCountMin]);
                }
            }
            buffer.push(111);
            for (let channelIndex = 0; channelIndex < this.pitchChannelCount; channelIndex++) {
                buffer.push(base64IntToCharCode[this.channels[channelIndex].octave]);
            }
            for (let channelIndex = 0; channelIndex < this.getChannelCount(); channelIndex++) {
                for (let i = 0; i < this.channels[channelIndex].instruments.length; i++) {
                    const instrument = this.channels[channelIndex].instruments[i];
                    buffer.push(84, base64IntToCharCode[instrument.type]);
                    buffer.push(118, base64IntToCharCode[instrument.volume]);
                    buffer.push(117, base64IntToCharCode[instrument.preset >> 6], base64IntToCharCode[instrument.preset & 63]);
                    buffer.push(102, base64IntToCharCode[instrument.eqFilter.controlPointCount]);
                    for (let j = 0; j < instrument.eqFilter.controlPointCount; j++) {
                        const point = instrument.eqFilter.controlPoints[j];
                        buffer.push(base64IntToCharCode[point.type], base64IntToCharCode[point.freq], base64IntToCharCode[point.gain]);
                    }
                    buffer.push(113, base64IntToCharCode[instrument.effects >> 6], base64IntToCharCode[instrument.effects & 63]);
                    if (effectsIncludeNoteFilter(instrument.effects)) {
                        buffer.push(base64IntToCharCode[instrument.noteFilter.controlPointCount]);
                        for (let j = 0; j < instrument.noteFilter.controlPointCount; j++) {
                            const point = instrument.noteFilter.controlPoints[j];
                            buffer.push(base64IntToCharCode[point.type], base64IntToCharCode[point.freq], base64IntToCharCode[point.gain]);
                        }
                    }
                    if (effectsIncludeTransition(instrument.effects)) {
                        buffer.push(base64IntToCharCode[instrument.transition]);
                    }
                    if (effectsIncludeChord(instrument.effects)) {
                        buffer.push(base64IntToCharCode[instrument.chord]);
                    }
                    if (effectsIncludePitchShift(instrument.effects)) {
                        buffer.push(base64IntToCharCode[instrument.pitchShift]);
                    }
                    if (effectsIncludeDetune(instrument.effects)) {
                        buffer.push(base64IntToCharCode[instrument.detune]);
                    }
                    if (effectsIncludeVibrato(instrument.effects)) {
                        buffer.push(base64IntToCharCode[instrument.vibrato]);
                    }
                    if (effectsIncludeDistortion(instrument.effects)) {
                        buffer.push(base64IntToCharCode[instrument.distortion]);
                    }
                    if (effectsIncludeBitcrusher(instrument.effects)) {
                        buffer.push(base64IntToCharCode[instrument.bitcrusherFreq], base64IntToCharCode[instrument.bitcrusherQuantization]);
                    }
                    if (effectsIncludePanning(instrument.effects)) {
                        buffer.push(base64IntToCharCode[instrument.pan]);
                    }
                    if (effectsIncludeChorus(instrument.effects)) {
                        buffer.push(base64IntToCharCode[instrument.chorus]);
                    }
                    if (effectsIncludeEcho(instrument.effects)) {
                        buffer.push(base64IntToCharCode[instrument.echoSustain], base64IntToCharCode[instrument.echoDelay]);
                    }
                    if (effectsIncludeReverb(instrument.effects)) {
                        buffer.push(base64IntToCharCode[instrument.reverb]);
                    }
                    if (instrument.type != 4) {
                        buffer.push(100, base64IntToCharCode[instrument.fadeIn], base64IntToCharCode[instrument.fadeOut]);
                    }
                    if (instrument.type == 5 || instrument.type == 7) {
                        buffer.push(72);
                        const harmonicsBits = new BitFieldWriter();
                        for (let i = 0; i < Config.harmonicsControlPoints; i++) {
                            harmonicsBits.write(Config.harmonicsControlPointBits, instrument.harmonicsWave.harmonics[i]);
                        }
                        harmonicsBits.encodeBase64(buffer);
                    }
                    if (instrument.type == 0) {
                        buffer.push(119, base64IntToCharCode[instrument.chipWave]);
                        buffer.push(104, base64IntToCharCode[instrument.unison]);
                    }
                    else if (instrument.type == 1) {
                        buffer.push(65, base64IntToCharCode[instrument.algorithm]);
                        buffer.push(70, base64IntToCharCode[instrument.feedbackType]);
                        buffer.push(66, base64IntToCharCode[instrument.feedbackAmplitude]);
                        buffer.push(81);
                        for (let o = 0; o < Config.operatorCount; o++) {
                            buffer.push(base64IntToCharCode[instrument.operators[o].frequency]);
                        }
                        buffer.push(80);
                        for (let o = 0; o < Config.operatorCount; o++) {
                            buffer.push(base64IntToCharCode[instrument.operators[o].amplitude]);
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
                        buffer.push(104, base64IntToCharCode[instrument.unison]);
                    }
                    else if (instrument.type == 6) {
                        buffer.push(87, base64IntToCharCode[instrument.pulseWidth]);
                    }
                    else if (instrument.type == 7) {
                        buffer.push(104, base64IntToCharCode[instrument.unison]);
                        buffer.push(73, base64IntToCharCode[instrument.stringSustain]);
                    }
                    else {
                        throw new Error("Unknown instrument type.");
                    }
                    buffer.push(69, base64IntToCharCode[instrument.envelopeCount]);
                    for (let envelopeIndex = 0; envelopeIndex < instrument.envelopeCount; envelopeIndex++) {
                        buffer.push(base64IntToCharCode[instrument.envelopes[envelopeIndex].target]);
                        if (Config.instrumentAutomationTargets[instrument.envelopes[envelopeIndex].target].maxCount > 1) {
                            buffer.push(base64IntToCharCode[instrument.envelopes[envelopeIndex].index]);
                        }
                        buffer.push(base64IntToCharCode[instrument.envelopes[envelopeIndex].envelope]);
                    }
                }
            }
            buffer.push(98);
            bits = new BitFieldWriter();
            let neededBits = 0;
            while ((1 << neededBits) < this.patternsPerChannel + 1)
                neededBits++;
            for (let channelIndex = 0; channelIndex < this.getChannelCount(); channelIndex++)
                for (let i = 0; i < this.barCount; i++) {
                    bits.write(neededBits, this.channels[channelIndex].bars[i]);
                }
            bits.encodeBase64(buffer);
            buffer.push(112);
            bits = new BitFieldWriter();
            const shapeBits = new BitFieldWriter();
            const bitsPerNoteSize = Song.getNeededBits(Config.noteSizeMax);
            for (let channelIndex = 0; channelIndex < this.getChannelCount(); channelIndex++) {
                const channel = this.channels[channelIndex];
                const maxInstrumentsPerPattern = this.getMaxInstrumentsPerPattern(channelIndex);
                const neededInstrumentCountBits = Song.getNeededBits(maxInstrumentsPerPattern - Config.instrumentCountMin);
                const neededInstrumentIndexBits = Song.getNeededBits(channel.instruments.length - 1);
                const isNoiseChannel = this.getChannelIsNoise(channelIndex);
                const octaveOffset = isNoiseChannel ? 0 : channel.octave * Config.pitchesPerOctave;
                let lastPitch = (isNoiseChannel ? 4 : octaveOffset);
                const recentPitches = isNoiseChannel ? [4, 6, 7, 2, 3, 8, 0, 10] : [0, 7, 12, 19, 24, -5, -12];
                const recentShapes = [];
                for (let i = 0; i < recentPitches.length; i++) {
                    recentPitches[i] += octaveOffset;
                }
                for (const pattern of channel.patterns) {
                    if (this.patternInstruments) {
                        const instrumentCount = validateRange(Config.instrumentCountMin, maxInstrumentsPerPattern, pattern.instruments.length);
                        bits.write(neededInstrumentCountBits, instrumentCount - Config.instrumentCountMin);
                        for (let i = 0; i < instrumentCount; i++) {
                            bits.write(neededInstrumentIndexBits, pattern.instruments[i]);
                        }
                    }
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
                            shapeBits.write(bitsPerNoteSize, note.pins[0].size);
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
                                shapeBits.write(bitsPerNoteSize, pin.size);
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
                            if (note.start == 0) {
                                bits.write(1, note.continuesLastPattern ? 1 : 0);
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
        static _envelopeFromLegacyIndex(legacyIndex) {
            if (legacyIndex == 0)
                legacyIndex = 1;
            else if (legacyIndex == 1)
                legacyIndex = 0;
            return Config.envelopes[clamp(0, Config.envelopes.length, legacyIndex)];
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
            const beforeNine = version < 9;
            this.initToDefault(beforeNine);
            if (beforeThree) {
                for (const channel of this.channels) {
                    channel.instruments[0].transition = Config.transitions.dictionary["interrupt"].index;
                    channel.instruments[0].effects |= 1 << 10;
                }
                this.channels[3].instruments[0].chipNoise = 0;
            }
            let legacySettingsCache = null;
            if (beforeNine) {
                legacySettingsCache = [];
                for (let i = legacySettingsCache.length; i < this.getChannelCount(); i++) {
                    legacySettingsCache[i] = [];
                    for (let j = 0; j < Config.instrumentCountMin; j++)
                        legacySettingsCache[i][j] = {};
                }
            }
            let legacyGlobalReverb = 0;
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
                            if (beforeNine) {
                                for (let i = legacySettingsCache.length; i < this.getChannelCount(); i++) {
                                    legacySettingsCache[i] = [];
                                    for (let j = 0; j < Config.instrumentCountMin; j++)
                                        legacySettingsCache[i][j] = {};
                                }
                            }
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
                            if (beforeNine) {
                                legacyGlobalReverb = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                                legacyGlobalReverb = clamp(0, 4, legacyGlobalReverb);
                            }
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
                            for (let channelIndex = 0; channelIndex < this.getChannelCount(); channelIndex++) {
                                for (let bar = this.channels[channelIndex].bars.length; bar < this.barCount; bar++) {
                                    this.channels[channelIndex].bars[bar] = 1;
                                }
                                this.channels[channelIndex].bars.length = this.barCount;
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
                            const channelCount = this.getChannelCount();
                            for (let channelIndex = 0; channelIndex < channelCount; channelIndex++) {
                                const patterns = this.channels[channelIndex].patterns;
                                for (let pattern = patterns.length; pattern < this.patternsPerChannel; pattern++) {
                                    patterns[pattern] = new Pattern();
                                }
                                patterns.length = this.patternsPerChannel;
                            }
                        }
                        break;
                    case 105:
                        {
                            if (beforeNine) {
                                const instrumentsPerChannel = validateRange(Config.instrumentCountMin, Config.patternInstrumentCountMax, base64CharCodeToInt[compressed.charCodeAt(charIndex++)] + Config.instrumentCountMin);
                                this.layeredInstruments = false;
                                this.patternInstruments = (instrumentsPerChannel > 1);
                                for (let channelIndex = 0; channelIndex < this.getChannelCount(); channelIndex++) {
                                    const isNoiseChannel = channelIndex >= this.pitchChannelCount;
                                    for (let instrumentIndex = this.channels[channelIndex].instruments.length; instrumentIndex < instrumentsPerChannel; instrumentIndex++) {
                                        this.channels[channelIndex].instruments[instrumentIndex] = new Instrument(isNoiseChannel);
                                    }
                                    this.channels[channelIndex].instruments.length = instrumentsPerChannel;
                                    if (beforeSix) {
                                        for (let instrumentIndex = 0; instrumentIndex < instrumentsPerChannel; instrumentIndex++) {
                                            this.channels[channelIndex].instruments[instrumentIndex].setTypeAndReset(isNoiseChannel ? 2 : 0, isNoiseChannel);
                                        }
                                    }
                                    for (let j = legacySettingsCache[channelIndex].length; j < instrumentsPerChannel; j++) {
                                        legacySettingsCache[channelIndex][j] = {};
                                    }
                                }
                            }
                            else {
                                const instrumentsFlagBits = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                                this.layeredInstruments = (instrumentsFlagBits & (1 << 1)) != 0;
                                this.patternInstruments = (instrumentsFlagBits & (1 << 0)) != 0;
                                for (let channelIndex = 0; channelIndex < this.getChannelCount(); channelIndex++) {
                                    let instrumentCount = 1;
                                    if (this.layeredInstruments || this.patternInstruments) {
                                        instrumentCount = validateRange(Config.instrumentCountMin, this.getMaxInstrumentsPerChannel(), base64CharCodeToInt[compressed.charCodeAt(charIndex++)] + Config.instrumentCountMin);
                                    }
                                    const channel = this.channels[channelIndex];
                                    const isNoiseChannel = this.getChannelIsNoise(channelIndex);
                                    for (let i = channel.instruments.length; i < instrumentCount; i++) {
                                        channel.instruments[i] = new Instrument(isNoiseChannel);
                                    }
                                    channel.instruments.length = instrumentCount;
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
                                const channelIndex = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                                this.channels[channelIndex].octave = clamp(0, Config.pitchOctaves, base64CharCodeToInt[compressed.charCodeAt(charIndex++)] + 1);
                                if (channelIndex >= this.pitchChannelCount)
                                    this.channels[channelIndex].octave = 0;
                            }
                            else if (beforeNine) {
                                for (let channelIndex = 0; channelIndex < this.getChannelCount(); channelIndex++) {
                                    this.channels[channelIndex].octave = clamp(0, Config.pitchOctaves, base64CharCodeToInt[compressed.charCodeAt(charIndex++)] + 1);
                                    if (channelIndex >= this.pitchChannelCount)
                                        this.channels[channelIndex].octave = 0;
                                }
                            }
                            else {
                                for (let channelIndex = 0; channelIndex < this.pitchChannelCount; channelIndex++) {
                                    this.channels[channelIndex].octave = clamp(0, Config.pitchOctaves, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                                }
                            }
                        }
                        break;
                    case 84:
                        {
                            instrumentIndexIterator++;
                            if (instrumentIndexIterator >= this.channels[instrumentChannelIterator].instruments.length) {
                                instrumentChannelIterator++;
                                instrumentIndexIterator = 0;
                            }
                            validateRange(0, this.channels.length - 1, instrumentChannelIterator);
                            const instrument = this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator];
                            const instrumentType = validateRange(0, 8 - 1, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                            instrument.setTypeAndReset(instrumentType, instrumentChannelIterator >= this.pitchChannelCount);
                            if (beforeSeven) {
                                instrument.effects = 0;
                                if (legacyGlobalReverb > 0 && !this.getChannelIsNoise(instrumentChannelIterator)) {
                                    instrument.reverb = legacyGlobalReverb;
                                    instrument.effects |= 1 << 0;
                                }
                                if (instrument.chord != Config.chords.dictionary["simultaneous"].index) {
                                    instrument.effects |= 1 << 11;
                                }
                            }
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
                                const channelIndex = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                                const instrument = this.channels[channelIndex].instruments[0];
                                instrument.chipWave = clamp(0, Config.chipWaves.length, legacyWaves[base64CharCodeToInt[compressed.charCodeAt(charIndex++)]] | 0);
                                instrument.convertLegacySettings(legacySettingsCache[channelIndex][0]);
                            }
                            else if (beforeSix) {
                                const legacyWaves = [1, 2, 3, 4, 5, 6, 7, 8, 0];
                                for (let channelIndex = 0; channelIndex < this.getChannelCount(); channelIndex++) {
                                    for (const instrument of this.channels[channelIndex].instruments) {
                                        if (channelIndex >= this.pitchChannelCount) {
                                            instrument.chipNoise = clamp(0, Config.chipNoises.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                                        }
                                        else {
                                            instrument.chipWave = clamp(0, Config.chipWaves.length, legacyWaves[base64CharCodeToInt[compressed.charCodeAt(charIndex++)]] | 0);
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
                            if (beforeNine) {
                                if (beforeSeven) {
                                    const legacyToCutoff = [10, 6, 3, 0, 8, 5, 2];
                                    const legacyToEnvelope = ["none", "none", "none", "none", "decay 1", "decay 2", "decay 3"];
                                    if (beforeThree) {
                                        const channelIndex = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                                        const instrument = this.channels[channelIndex].instruments[0];
                                        const legacySettings = legacySettingsCache[channelIndex][0];
                                        const legacyFilter = [1, 3, 4, 5][clamp(0, legacyToCutoff.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)])];
                                        legacySettings.filterCutoff = legacyToCutoff[legacyFilter];
                                        legacySettings.filterResonance = 0;
                                        legacySettings.filterEnvelope = Config.envelopes.dictionary[legacyToEnvelope[legacyFilter]];
                                        instrument.convertLegacySettings(legacySettings);
                                    }
                                    else if (beforeSix) {
                                        for (let channelIndex = 0; channelIndex < this.getChannelCount(); channelIndex++) {
                                            for (let i = 0; i < this.channels[channelIndex].instruments.length; i++) {
                                                const instrument = this.channels[channelIndex].instruments[i];
                                                const legacySettings = legacySettingsCache[channelIndex][i];
                                                const legacyFilter = clamp(0, legacyToCutoff.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)] + 1);
                                                if (channelIndex < this.pitchChannelCount) {
                                                    legacySettings.filterCutoff = legacyToCutoff[legacyFilter];
                                                    legacySettings.filterResonance = 0;
                                                    legacySettings.filterEnvelope = Config.envelopes.dictionary[legacyToEnvelope[legacyFilter]];
                                                }
                                                else {
                                                    legacySettings.filterCutoff = 10;
                                                    legacySettings.filterResonance = 0;
                                                    legacySettings.filterEnvelope = Config.envelopes.dictionary["none"];
                                                }
                                                instrument.convertLegacySettings(legacySettings);
                                            }
                                        }
                                    }
                                    else {
                                        const legacyFilter = clamp(0, legacyToCutoff.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                                        const instrument = this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator];
                                        const legacySettings = legacySettingsCache[instrumentChannelIterator][instrumentIndexIterator];
                                        legacySettings.filterCutoff = legacyToCutoff[legacyFilter];
                                        legacySettings.filterResonance = 0;
                                        instrument.convertLegacySettings(legacySettings);
                                    }
                                }
                                else {
                                    const filterCutoffRange = 11;
                                    const instrument = this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator];
                                    const legacySettings = legacySettingsCache[instrumentChannelIterator][instrumentIndexIterator];
                                    legacySettings.filterCutoff = clamp(0, filterCutoffRange, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                                    instrument.convertLegacySettings(legacySettings);
                                }
                            }
                            else {
                                const instrument = this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator];
                                const originalControlPointCount = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                                instrument.eqFilter.controlPointCount = clamp(0, Config.filterMaxPoints + 1, originalControlPointCount);
                                for (let i = instrument.eqFilter.controlPoints.length; i < instrument.eqFilter.controlPointCount; i++) {
                                    instrument.eqFilter.controlPoints[i] = new FilterControlPoint();
                                }
                                for (let i = 0; i < instrument.eqFilter.controlPointCount; i++) {
                                    const point = instrument.eqFilter.controlPoints[i];
                                    point.type = clamp(0, 3, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                                    point.freq = clamp(0, Config.filterFreqRange, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                                    point.gain = clamp(0, Config.filterGainRange, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                                }
                                for (let i = instrument.eqFilter.controlPointCount; i < originalControlPointCount; i++) {
                                    charIndex += 3;
                                }
                            }
                        }
                        break;
                    case 121:
                        {
                            if (beforeNine) {
                                const filterResonanceRange = 8;
                                const instrument = this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator];
                                const legacySettings = legacySettingsCache[instrumentChannelIterator][instrumentIndexIterator];
                                legacySettings.filterResonance = clamp(0, filterResonanceRange, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                                instrument.convertLegacySettings(legacySettings);
                            }
                        }
                        break;
                    case 122:
                        {
                            const instrument = this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator];
                            if (beforeNine) {
                                if (instrument.type == 4) {
                                    for (let i = 0; i < Config.drumCount; i++) {
                                        instrument.drumsetEnvelopes[i] = Song._envelopeFromLegacyIndex(base64CharCodeToInt[compressed.charCodeAt(charIndex++)]).index;
                                    }
                                }
                                else {
                                    const legacySettings = legacySettingsCache[instrumentChannelIterator][instrumentIndexIterator];
                                    legacySettings.filterEnvelope = Song._envelopeFromLegacyIndex(base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                                    instrument.convertLegacySettings(legacySettings);
                                }
                            }
                            else {
                                for (let i = 0; i < Config.drumCount; i++) {
                                    instrument.drumsetEnvelopes[i] = clamp(0, Config.envelopes.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                                }
                            }
                        }
                        break;
                    case 87:
                        {
                            const instrument = this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator];
                            instrument.pulseWidth = clamp(0, Config.pulseWidthRange, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                            if (beforeNine) {
                                const legacySettings = legacySettingsCache[instrumentChannelIterator][instrumentIndexIterator];
                                legacySettings.pulseEnvelope = Song._envelopeFromLegacyIndex(base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                                instrument.convertLegacySettings(legacySettings);
                            }
                        }
                        break;
                    case 73:
                        {
                            const instrument = this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator];
                            instrument.stringSustain = clamp(0, Config.stringSustainRange, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                        }
                        break;
                    case 100:
                        {
                            if (beforeNine) {
                                const legacySettings = [
                                    { transition: "interrupt", fadeInSeconds: 0.0, fadeOutTicks: -1 },
                                    { transition: "normal", fadeInSeconds: 0.0, fadeOutTicks: -3 },
                                    { transition: "normal", fadeInSeconds: 0.025, fadeOutTicks: -3 },
                                    { transition: "slide in pattern", fadeInSeconds: 0.025, fadeOutTicks: -3 },
                                    { transition: "normal", fadeInSeconds: 0.04, fadeOutTicks: 6 },
                                    { transition: "normal", fadeInSeconds: 0.0, fadeOutTicks: 48 },
                                    { transition: "normal", fadeInSeconds: 0.0125, fadeOutTicks: 72 },
                                    { transition: "normal", fadeInSeconds: 0.06, fadeOutTicks: 96 },
                                ];
                                if (beforeThree) {
                                    const channelIndex = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                                    const settings = legacySettings[clamp(0, legacySettings.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)])];
                                    const instrument = this.channels[channelIndex].instruments[0];
                                    instrument.fadeIn = Synth.secondsToFadeInSetting(settings.fadeInSeconds);
                                    instrument.fadeOut = Synth.ticksToFadeOutSetting(settings.fadeOutTicks);
                                    instrument.transition = Config.transitions.dictionary[settings.transition].index;
                                    if (instrument.transition != Config.transitions.dictionary["normal"].index) {
                                        instrument.effects |= 1 << 10;
                                    }
                                }
                                else if (beforeSix) {
                                    for (let channelIndex = 0; channelIndex < this.getChannelCount(); channelIndex++) {
                                        for (const instrument of this.channels[channelIndex].instruments) {
                                            const settings = legacySettings[clamp(0, legacySettings.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)])];
                                            instrument.fadeIn = Synth.secondsToFadeInSetting(settings.fadeInSeconds);
                                            instrument.fadeOut = Synth.ticksToFadeOutSetting(settings.fadeOutTicks);
                                            instrument.transition = Config.transitions.dictionary[settings.transition].index;
                                            if (instrument.transition != Config.transitions.dictionary["normal"].index) {
                                                instrument.effects |= 1 << 10;
                                            }
                                        }
                                    }
                                }
                                else {
                                    const settings = legacySettings[clamp(0, legacySettings.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)])];
                                    const instrument = this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator];
                                    instrument.fadeIn = Synth.secondsToFadeInSetting(settings.fadeInSeconds);
                                    instrument.fadeOut = Synth.ticksToFadeOutSetting(settings.fadeOutTicks);
                                    instrument.transition = Config.transitions.dictionary[settings.transition].index;
                                    if (instrument.transition != Config.transitions.dictionary["normal"].index) {
                                        instrument.effects |= 1 << 10;
                                    }
                                }
                            }
                            else {
                                const instrument = this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator];
                                instrument.fadeIn = clamp(0, Config.fadeInRange, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                                instrument.fadeOut = clamp(0, Config.fadeOutTicks.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                            }
                        }
                        break;
                    case 99:
                        {
                            if (beforeNine) {
                                if (beforeSeven) {
                                    if (beforeThree) {
                                        const legacyEffects = [0, 3, 2, 0];
                                        const legacyEnvelopes = ["none", "none", "none", "tremolo2"];
                                        const channelIndex = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                                        const effect = clamp(0, legacyEffects.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                                        const instrument = this.channels[channelIndex].instruments[0];
                                        const legacySettings = legacySettingsCache[channelIndex][0];
                                        instrument.vibrato = legacyEffects[effect];
                                        if (legacySettings.filterEnvelope == undefined || legacySettings.filterEnvelope.type == 1) {
                                            legacySettings.filterEnvelope = Config.envelopes.dictionary[legacyEnvelopes[effect]];
                                            instrument.convertLegacySettings(legacySettings);
                                        }
                                        if (instrument.vibrato != Config.vibratos.dictionary["none"].index) {
                                            instrument.effects |= 1 << 9;
                                        }
                                    }
                                    else if (beforeSix) {
                                        const legacyEffects = [0, 1, 2, 3, 0, 0];
                                        const legacyEnvelopes = ["none", "none", "none", "none", "tremolo5", "tremolo2"];
                                        for (let channelIndex = 0; channelIndex < this.getChannelCount(); channelIndex++) {
                                            for (let i = 0; i < this.channels[channelIndex].instruments.length; i++) {
                                                const effect = clamp(0, legacyEffects.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                                                const instrument = this.channels[channelIndex].instruments[i];
                                                const legacySettings = legacySettingsCache[channelIndex][i];
                                                instrument.vibrato = legacyEffects[effect];
                                                if (legacySettings.filterEnvelope == undefined || legacySettings.filterEnvelope.type == 1) {
                                                    legacySettings.filterEnvelope = Config.envelopes.dictionary[legacyEnvelopes[effect]];
                                                    instrument.convertLegacySettings(legacySettings);
                                                }
                                                if (instrument.vibrato != Config.vibratos.dictionary["none"].index) {
                                                    instrument.effects |= 1 << 9;
                                                }
                                                if (legacyGlobalReverb != 0 && !this.getChannelIsNoise(channelIndex)) {
                                                    instrument.effects |= 1 << 0;
                                                    instrument.reverb = legacyGlobalReverb;
                                                }
                                            }
                                        }
                                    }
                                    else {
                                        const legacyEffects = [0, 1, 2, 3, 0, 0];
                                        const legacyEnvelopes = ["none", "none", "none", "none", "tremolo5", "tremolo2"];
                                        const effect = clamp(0, legacyEffects.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                                        const instrument = this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator];
                                        const legacySettings = legacySettingsCache[instrumentChannelIterator][instrumentIndexIterator];
                                        instrument.vibrato = legacyEffects[effect];
                                        if (legacySettings.filterEnvelope == undefined || legacySettings.filterEnvelope.type == 1) {
                                            legacySettings.filterEnvelope = Config.envelopes.dictionary[legacyEnvelopes[effect]];
                                            instrument.convertLegacySettings(legacySettings);
                                        }
                                        if (instrument.vibrato != Config.vibratos.dictionary["none"].index) {
                                            instrument.effects |= 1 << 9;
                                        }
                                        if (legacyGlobalReverb != 0) {
                                            instrument.effects |= 1 << 0;
                                            instrument.reverb = legacyGlobalReverb;
                                        }
                                    }
                                }
                                else {
                                    const instrument = this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator];
                                    const vibrato = clamp(0, Config.vibratos.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                                    instrument.vibrato = vibrato;
                                    if (instrument.vibrato != Config.vibratos.dictionary["none"].index) {
                                        instrument.effects |= 1 << 9;
                                    }
                                }
                            }
                        }
                        break;
                    case 104:
                        {
                            if (beforeThree) {
                                const channelIndex = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                                this.channels[channelIndex].instruments[0].unison = clamp(0, Config.unisons.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                            }
                            else if (beforeSix) {
                                for (let channelIndex = 0; channelIndex < this.getChannelCount(); channelIndex++) {
                                    for (const instrument of this.channels[channelIndex].instruments) {
                                        const originalValue = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                                        let unison = clamp(0, Config.unisons.length, originalValue);
                                        if (originalValue == 8) {
                                            unison = 2;
                                            instrument.chord = 3;
                                        }
                                        instrument.unison = unison;
                                    }
                                }
                            }
                            else if (beforeSeven) {
                                const originalValue = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                                let unison = clamp(0, Config.unisons.length, originalValue);
                                if (originalValue == 8) {
                                    unison = 2;
                                    this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].chord = 3;
                                }
                                this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].unison = unison;
                            }
                            else {
                                this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].unison = clamp(0, Config.unisons.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                            }
                        }
                        break;
                    case 67:
                        {
                            if (beforeNine) {
                                const instrument = this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator];
                                instrument.chord = clamp(0, Config.chords.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                                if (instrument.chord != Config.chords.dictionary["simultaneous"].index) {
                                    instrument.effects |= 1 << 11;
                                }
                            }
                        }
                        break;
                    case 113:
                        {
                            const instrument = this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator];
                            if (beforeNine) {
                                instrument.effects = (base64CharCodeToInt[compressed.charCodeAt(charIndex++)] & ((1 << 12) - 1));
                                if (legacyGlobalReverb == 0) {
                                    instrument.effects &= ~(1 << 0);
                                }
                                else if (effectsIncludeReverb(instrument.effects)) {
                                    instrument.reverb = legacyGlobalReverb;
                                }
                                if (instrument.pan != Config.panCenter) {
                                    instrument.effects |= 1 << 2;
                                }
                                if (instrument.vibrato != Config.vibratos.dictionary["none"].index) {
                                    instrument.effects |= 1 << 2;
                                }
                                const legacySettings = legacySettingsCache[instrumentChannelIterator][instrumentIndexIterator];
                                instrument.convertLegacySettings(legacySettings);
                            }
                            else {
                                instrument.effects = (base64CharCodeToInt[compressed.charCodeAt(charIndex++)] << 6) | (base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                                if (effectsIncludeNoteFilter(instrument.effects)) {
                                    const originalControlPointCount = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                                    instrument.noteFilter.controlPointCount = clamp(0, Config.filterMaxPoints + 1, originalControlPointCount);
                                    for (let i = instrument.noteFilter.controlPoints.length; i < instrument.noteFilter.controlPointCount; i++) {
                                        instrument.noteFilter.controlPoints[i] = new FilterControlPoint();
                                    }
                                    for (let i = 0; i < instrument.noteFilter.controlPointCount; i++) {
                                        const point = instrument.noteFilter.controlPoints[i];
                                        point.type = clamp(0, 3, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                                        point.freq = clamp(0, Config.filterFreqRange, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                                        point.gain = clamp(0, Config.filterGainRange, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                                    }
                                    for (let i = instrument.noteFilter.controlPointCount; i < originalControlPointCount; i++) {
                                        charIndex += 3;
                                    }
                                }
                                if (effectsIncludeTransition(instrument.effects)) {
                                    instrument.transition = clamp(0, Config.transitions.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                                }
                                if (effectsIncludeChord(instrument.effects)) {
                                    instrument.chord = clamp(0, Config.chords.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                                }
                                if (effectsIncludePitchShift(instrument.effects)) {
                                    instrument.pitchShift = clamp(0, Config.pitchShiftRange, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                                }
                                if (effectsIncludeDetune(instrument.effects)) {
                                    instrument.detune = clamp(0, Config.detuneMax + 1, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                                }
                                if (effectsIncludeVibrato(instrument.effects)) {
                                    instrument.vibrato = clamp(0, Config.vibratos.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                                }
                                if (effectsIncludeDistortion(instrument.effects)) {
                                    instrument.distortion = clamp(0, Config.distortionRange, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                                }
                                if (effectsIncludeBitcrusher(instrument.effects)) {
                                    instrument.bitcrusherFreq = clamp(0, Config.bitcrusherFreqRange, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                                    instrument.bitcrusherQuantization = clamp(0, Config.bitcrusherQuantizationRange, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                                }
                                if (effectsIncludePanning(instrument.effects)) {
                                    instrument.pan = clamp(0, Config.panMax + 1, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                                }
                                if (effectsIncludeChorus(instrument.effects)) {
                                    instrument.chorus = clamp(0, Config.chorusRange, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                                }
                                if (effectsIncludeEcho(instrument.effects)) {
                                    instrument.echoSustain = clamp(0, Config.echoSustainRange, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                                    instrument.echoDelay = clamp(0, Config.echoDelayRange, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                                }
                                if (effectsIncludeReverb(instrument.effects)) {
                                    instrument.reverb = clamp(0, Config.reverbRange, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                                }
                            }
                            instrument.effects &= (1 << 12) - 1;
                        }
                        break;
                    case 118:
                        {
                            if (beforeThree) {
                                const channelIndex = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                                const instrument = this.channels[channelIndex].instruments[0];
                                instrument.volume = clamp(0, Config.volumeRange, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                                if (instrument.volume == 5)
                                    instrument.volume = Config.volumeRange - 1;
                            }
                            else if (beforeSix) {
                                for (let channelIndex = 0; channelIndex < this.getChannelCount(); channelIndex++) {
                                    for (const instrument of this.channels[channelIndex].instruments) {
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
                            if (beforeNine) {
                                const instrument = this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator];
                                instrument.pan = clamp(0, Config.panMax + 1, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                            }
                        }
                        break;
                    case 65:
                        {
                            const instrument = this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator];
                            instrument.algorithm = clamp(0, Config.algorithms.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                            if (beforeNine) {
                                const legacySettings = legacySettingsCache[instrumentChannelIterator][instrumentIndexIterator];
                                instrument.convertLegacySettings(legacySettings);
                            }
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
                            if (beforeNine) {
                                const instrument = this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator];
                                const legacySettings = legacySettingsCache[instrumentChannelIterator][instrumentIndexIterator];
                                legacySettings.feedbackEnvelope = Song._envelopeFromLegacyIndex(base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                                instrument.convertLegacySettings(legacySettings);
                            }
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
                            const instrument = this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator];
                            if (beforeNine) {
                                const legacySettings = legacySettingsCache[instrumentChannelIterator][instrumentIndexIterator];
                                legacySettings.operatorEnvelopes = [];
                                for (let o = 0; o < Config.operatorCount; o++) {
                                    legacySettings.operatorEnvelopes[o] = Song._envelopeFromLegacyIndex(base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                                }
                                instrument.convertLegacySettings(legacySettings);
                            }
                            else {
                                const envelopeCount = clamp(0, Config.maxEnvelopeCount + 1, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                                for (let i = 0; i < envelopeCount; i++) {
                                    const target = clamp(0, Config.instrumentAutomationTargets.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                                    let index = 0;
                                    const maxCount = Config.instrumentAutomationTargets[target].maxCount;
                                    if (maxCount > 1) {
                                        index = clamp(0, maxCount, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                                    }
                                    const envelope = clamp(0, Config.envelopes.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                                    instrument.addEnvelope(target, index, envelope);
                                }
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
                                const channelIndex = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                                const barCount = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                                subStringLength = Math.ceil(barCount * 0.5);
                                const bits = new BitFieldReader(compressed, charIndex, charIndex + subStringLength);
                                for (let i = 0; i < barCount; i++) {
                                    this.channels[channelIndex].bars[i] = bits.read(3) + 1;
                                }
                            }
                            else if (beforeFive) {
                                let neededBits = 0;
                                while ((1 << neededBits) < this.patternsPerChannel)
                                    neededBits++;
                                subStringLength = Math.ceil(this.getChannelCount() * this.barCount * neededBits / 6);
                                const bits = new BitFieldReader(compressed, charIndex, charIndex + subStringLength);
                                for (let channelIndex = 0; channelIndex < this.getChannelCount(); channelIndex++) {
                                    for (let i = 0; i < this.barCount; i++) {
                                        this.channels[channelIndex].bars[i] = bits.read(neededBits) + 1;
                                    }
                                }
                            }
                            else {
                                let neededBits = 0;
                                while ((1 << neededBits) < this.patternsPerChannel + 1)
                                    neededBits++;
                                subStringLength = Math.ceil(this.getChannelCount() * this.barCount * neededBits / 6);
                                const bits = new BitFieldReader(compressed, charIndex, charIndex + subStringLength);
                                for (let channelIndex = 0; channelIndex < this.getChannelCount(); channelIndex++) {
                                    for (let i = 0; i < this.barCount; i++) {
                                        this.channels[channelIndex].bars[i] = bits.read(neededBits);
                                    }
                                }
                            }
                            charIndex += subStringLength;
                        }
                        break;
                    case 112:
                        {
                            let bitStringLength = 0;
                            let channelIndex;
                            if (beforeThree) {
                                channelIndex = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                                charIndex++;
                                bitStringLength = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                                bitStringLength = bitStringLength << 6;
                                bitStringLength += base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                            }
                            else {
                                channelIndex = 0;
                                let bitStringLengthLength = validateRange(1, 4, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                                while (bitStringLengthLength > 0) {
                                    bitStringLength = bitStringLength << 6;
                                    bitStringLength += base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                                    bitStringLengthLength--;
                                }
                            }
                            const bits = new BitFieldReader(compressed, charIndex, charIndex + bitStringLength);
                            charIndex += bitStringLength;
                            const bitsPerNoteSize = Song.getNeededBits(Config.noteSizeMax);
                            while (true) {
                                const channel = this.channels[channelIndex];
                                const isNoiseChannel = this.getChannelIsNoise(channelIndex);
                                const maxInstrumentsPerPattern = this.getMaxInstrumentsPerPattern(channelIndex);
                                const neededInstrumentCountBits = Song.getNeededBits(maxInstrumentsPerPattern - Config.instrumentCountMin);
                                const neededInstrumentIndexBits = Song.getNeededBits(channel.instruments.length - 1);
                                const octaveOffset = isNoiseChannel ? 0 : channel.octave * 12;
                                let lastPitch = (isNoiseChannel ? 4 : octaveOffset);
                                const recentPitches = isNoiseChannel ? [4, 6, 7, 2, 3, 8, 0, 10] : [0, 7, 12, 19, 24, -5, -12];
                                const recentShapes = [];
                                for (let i = 0; i < recentPitches.length; i++) {
                                    recentPitches[i] += octaveOffset;
                                }
                                for (let i = 0; i < this.patternsPerChannel; i++) {
                                    const newPattern = channel.patterns[i];
                                    if (beforeNine) {
                                        newPattern.instruments[0] = validateRange(0, channel.instruments.length - 1, bits.read(neededInstrumentIndexBits));
                                        newPattern.instruments.length = 1;
                                    }
                                    else {
                                        if (this.patternInstruments) {
                                            const instrumentCount = validateRange(Config.instrumentCountMin, maxInstrumentsPerPattern, bits.read(neededInstrumentCountBits) + Config.instrumentCountMin);
                                            for (let j = 0; j < instrumentCount; j++) {
                                                newPattern.instruments[j] = validateRange(0, channel.instruments.length - 1, bits.read(neededInstrumentIndexBits));
                                            }
                                            newPattern.instruments.length = instrumentCount;
                                        }
                                        else {
                                            newPattern.instruments[0] = 0;
                                            newPattern.instruments.length = Config.instrumentCountMin;
                                        }
                                    }
                                    if (!beforeThree && bits.read(1) == 0) {
                                        newPattern.notes.length = 0;
                                        continue;
                                    }
                                    let curPart = 0;
                                    const newNotes = newPattern.notes;
                                    let noteCount = 0;
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
                                                shape.initialSize = bits.read(bitsPerNoteSize);
                                                shape.pins = [];
                                                shape.length = 0;
                                                shape.bendCount = 0;
                                                for (let j = 0; j < shape.pinCount; j++) {
                                                    let pinObj = {};
                                                    pinObj.pitchBend = bits.read(1) == 1;
                                                    if (pinObj.pitchBend)
                                                        shape.bendCount++;
                                                    shape.length += beforeSeven
                                                        ? bits.readLegacyPartDuration() * Config.partsPerBeat / Config.rhythms[this.rhythm].stepsPerBeat
                                                        : bits.readPartDuration();
                                                    pinObj.time = shape.length;
                                                    pinObj.size = bits.read(bitsPerNoteSize);
                                                    shape.pins.push(pinObj);
                                                }
                                            }
                                            recentShapes.unshift(shape);
                                            if (recentShapes.length > 10)
                                                recentShapes.pop();
                                            let note;
                                            if (newNotes.length <= noteCount) {
                                                note = new Note(0, curPart, curPart + shape.length, shape.initialSize);
                                                newNotes[noteCount++] = note;
                                            }
                                            else {
                                                note = newNotes[noteCount++];
                                                note.start = curPart;
                                                note.end = curPart + shape.length;
                                                note.pins[0].size = shape.initialSize;
                                            }
                                            let pitch;
                                            let pitchCount = 0;
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
                                                    note.pitches[pitchCount++] = pitch;
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
                                            note.pitches.length = pitchCount;
                                            pitchBends.unshift(note.pitches[0]);
                                            let pinCount = 1;
                                            for (const pinObj of shape.pins) {
                                                if (pinObj.pitchBend)
                                                    pitchBends.shift();
                                                const interval = pitchBends[0] - note.pitches[0];
                                                if (note.pins.length <= pinCount) {
                                                    note.pins[pinCount++] = makeNotePin(interval, pinObj.time, pinObj.size);
                                                }
                                                else {
                                                    const pin = note.pins[pinCount++];
                                                    pin.interval = interval;
                                                    pin.time = pinObj.time;
                                                    pin.size = pinObj.size;
                                                }
                                            }
                                            note.pins.length = pinCount;
                                            if (note.start == 0 && !beforeNine) {
                                                note.continuesLastPattern = (bits.read(1) == 1);
                                            }
                                            else {
                                                note.continuesLastPattern = false;
                                            }
                                            curPart = validateRange(0, this.beatsPerBar * Config.partsPerBeat, note.end);
                                        }
                                    }
                                    newNotes.length = noteCount;
                                }
                                if (beforeThree) {
                                    break;
                                }
                                else {
                                    channelIndex++;
                                    if (channelIndex >= this.getChannelCount())
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
            for (let channelIndex = 0; channelIndex < this.getChannelCount(); channelIndex++) {
                const channel = this.channels[channelIndex];
                const instrumentArray = [];
                const isNoiseChannel = this.getChannelIsNoise(channelIndex);
                for (const instrument of channel.instruments) {
                    instrumentArray.push(instrument.toJsonObject());
                }
                const patternArray = [];
                for (const pattern of channel.patterns) {
                    const noteArray = [];
                    for (const note of pattern.notes) {
                        const pointArray = [];
                        for (const pin of note.pins) {
                            pointArray.push({
                                "tick": (pin.time + note.start) * Config.rhythms[this.rhythm].stepsPerBeat / Config.partsPerBeat,
                                "pitchBend": pin.interval,
                                "volume": Math.round(pin.size * 100 / 3),
                            });
                        }
                        const noteObject = {
                            "pitches": note.pitches,
                            "points": pointArray,
                        };
                        if (note.start == 0) {
                            noteObject["continuesLastPattern"] = note.continuesLastPattern;
                        }
                        noteArray.push(noteObject);
                    }
                    const patternObject = { "notes": noteArray };
                    if (this.patternInstruments) {
                        patternObject["instruments"] = pattern.instruments.map(i => i + 1);
                    }
                    patternArray.push(patternObject);
                }
                const sequenceArray = [];
                if (enableIntro)
                    for (let i = 0; i < this.loopStart; i++) {
                        sequenceArray.push(channel.bars[i]);
                    }
                for (let l = 0; l < loopCount; l++)
                    for (let i = this.loopStart; i < this.loopStart + this.loopLength; i++) {
                        sequenceArray.push(channel.bars[i]);
                    }
                if (enableOutro)
                    for (let i = this.loopStart + this.loopLength; i < this.barCount; i++) {
                        sequenceArray.push(channel.bars[i]);
                    }
                const channelObject = {
                    "type": isNoiseChannel ? "drum" : "pitch",
                    "instruments": instrumentArray,
                    "patterns": patternArray,
                    "sequence": sequenceArray,
                };
                if (!isNoiseChannel) {
                    channelObject["octaveScrollBar"] = channel.octave - 1;
                }
                channelArray.push(channelObject);
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
                "layeredInstruments": this.layeredInstruments,
                "patternInstruments": this.patternInstruments,
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
            let legacyGlobalReverb = 0;
            if (jsonObject["reverb"] != undefined) {
                legacyGlobalReverb = clamp(0, 4, jsonObject["reverb"] | 0);
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
            if (jsonObject["channels"] != undefined) {
                for (const channelObject of jsonObject["channels"]) {
                    if (channelObject["instruments"])
                        maxInstruments = Math.max(maxInstruments, channelObject["instruments"].length | 0);
                    if (channelObject["patterns"])
                        maxPatterns = Math.max(maxPatterns, channelObject["patterns"].length | 0);
                    if (channelObject["sequence"])
                        maxBars = Math.max(maxBars, channelObject["sequence"].length | 0);
                }
            }
            if (jsonObject["layeredInstruments"] != undefined) {
                this.layeredInstruments = !!jsonObject["layeredInstruments"];
            }
            else {
                this.layeredInstruments = false;
            }
            if (jsonObject["patternInstruments"] != undefined) {
                this.patternInstruments = !!jsonObject["patternInstruments"];
            }
            else {
                this.patternInstruments = (maxInstruments > 1);
            }
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
            if (jsonObject["channels"] != undefined) {
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
                        channel.octave = clamp(0, Config.pitchOctaves, (channelObject["octaveScrollBar"] | 0) + 1);
                        if (isNoiseChannel)
                            channel.octave = 0;
                    }
                    if (Array.isArray(channelObject["instruments"])) {
                        const instrumentObjects = channelObject["instruments"];
                        for (let i = 0; i < instrumentObjects.length; i++) {
                            if (i >= this.getMaxInstrumentsPerChannel())
                                break;
                            const instrument = new Instrument(isNoiseChannel);
                            channel.instruments[i] = instrument;
                            instrument.fromJsonObject(instrumentObjects[i], isNoiseChannel, legacyGlobalReverb);
                        }
                    }
                    for (let i = 0; i < this.patternsPerChannel; i++) {
                        const pattern = new Pattern();
                        channel.patterns[i] = pattern;
                        let patternObject = undefined;
                        if (channelObject["patterns"])
                            patternObject = channelObject["patterns"][i];
                        if (patternObject == undefined)
                            continue;
                        if (this.patternInstruments) {
                            if (Array.isArray(patternObject["instruments"])) {
                                const instruments = patternObject["instruments"];
                                const instrumentCount = clamp(Config.instrumentCountMin, this.getMaxInstrumentsPerPatternForChannel(channel) + 1, instruments.length);
                                for (let j = 0; j < instrumentCount; j++) {
                                    pattern.instruments[j] = clamp(0, channel.instruments.length, (instruments[j] | 0) - 1);
                                }
                                pattern.instruments.length = instrumentCount;
                            }
                            else {
                                pattern.instruments[0] = clamp(0, channel.instruments.length, (patternObject["instrument"] | 0) - 1);
                                pattern.instruments.length = 1;
                            }
                        }
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
                                    const size = (pointObject["volume"] == undefined) ? 3 : Math.max(0, Math.min(3, Math.round((pointObject["volume"] | 0) * 3 / 100)));
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
                                    note.pins.push(makeNotePin(interval - startInterval, time - note.start, size));
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
                                            pin.size == note.pins[k - 1].size &&
                                            pin.size == note.pins[k - 2].size) {
                                            note.pins.splice(k - 1, 1);
                                            k--;
                                        }
                                    }
                                }
                                if (note.start == 0) {
                                    note.continuesLastPattern = (noteObject["continuesLastPattern"] === true);
                                }
                                else {
                                    note.continuesLastPattern = false;
                                }
                                pattern.notes.push(note);
                                tickClock = note.end;
                            }
                        }
                    }
                    channel.patterns.length = this.patternsPerChannel;
                    for (let i = 0; i < this.barCount; i++) {
                        channel.bars[i] = (channelObject["sequence"] != undefined) ? Math.min(this.patternsPerChannel, channelObject["sequence"][i] >>> 0) : 0;
                    }
                    channel.bars.length = this.barCount;
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
        getPattern(channelIndex, bar) {
            if (bar < 0 || bar >= this.barCount)
                return null;
            const patternIndex = this.channels[channelIndex].bars[bar];
            if (patternIndex == 0)
                return null;
            return this.channels[channelIndex].patterns[patternIndex - 1];
        }
        getBeatsPerMinute() {
            return this.tempo;
        }
        static getNeededBits(maxValue) {
            return 32 - Math.clz32(Math.ceil(maxValue + 1) - 1);
        }
    }
    Song._format = "BeepBox";
    Song._oldestVersion = 2;
    Song._latestVersion = 9;
    class PickedString {
        constructor() {
            this.delayLine = null;
            this.reset();
        }
        reset() {
            this.delayIndex = -1;
            this.allPassSample = 0.0;
            this.allPassPrevInput = 0.0;
            this.shelfSample = 0.0;
            this.shelfPrevInput = 0.0;
            this.fractionalDelaySample = 0.0;
            this.prevDelayLength = -1.0;
            this.delayResetOffset = 0;
        }
    }
    class EnvelopeComputer {
        constructor() {
            this.noteSecondsStart = 0.0;
            this.noteSecondsEnd = 0.0;
            this.noteTicksStart = 0.0;
            this.noteTicksEnd = 0.0;
            this.noteSizeStart = Config.noteSizeMax;
            this.noteSizeEnd = Config.noteSizeMax;
            this.prevNoteSize = Config.noteSizeMax;
            this.nextNoteSize = Config.noteSizeMax;
            this._noteSizeFinal = Config.noteSizeMax;
            this.prevNoteSecondsStart = 0.0;
            this.prevNoteSecondsEnd = 0.0;
            this.prevNoteTicksStart = 0.0;
            this.prevNoteTicksEnd = 0.0;
            this._prevNoteSizeFinal = Config.noteSizeMax;
            this.prevSlideStart = false;
            this.prevSlideEnd = false;
            this.nextSlideStart = false;
            this.nextSlideEnd = false;
            this.prevSlideRatioStart = 0.0;
            this.prevSlideRatioEnd = 0.0;
            this.nextSlideRatioStart = 0.0;
            this.nextSlideRatioEnd = 0.0;
            this.envelopeStarts = [];
            this.envelopeEnds = [];
            this.lowpassCutoffDecayVolumeCompensation = 1.0;
            const length = 33;
            for (let i = 0; i < length; i++) {
                this.envelopeStarts[i] = 1.0;
                this.envelopeEnds[i] = 1.0;
            }
            this.reset();
        }
        reset() {
            this.noteSecondsEnd = 0.0;
            this.noteTicksEnd = 0.0;
            this._noteSizeFinal = Config.noteSizeMax;
            this.prevNoteSecondsEnd = 0.0;
            this.prevNoteTicksEnd = 0.0;
            this._prevNoteSizeFinal = Config.noteSizeMax;
        }
        computeEnvelopes(instrument, currentPart, tickTimeStart, tickTimeEnd, secondsPassing, tone) {
            const transition = instrument.getTransition();
            if (tone != null && tone.atNoteStart && !transition.continues && !tone.forceContinueAtStart) {
                this.prevNoteSecondsEnd = this.noteSecondsEnd;
                this.prevNoteTicksEnd = this.noteTicksEnd;
                this._prevNoteSizeFinal = this._noteSizeFinal;
                this.noteSecondsEnd = 0.0;
                this.noteTicksEnd = 0.0;
            }
            if (tone != null) {
                if (tone.note != null) {
                    this._noteSizeFinal = tone.note.pins[tone.note.pins.length - 1].size;
                }
                else {
                    this._noteSizeFinal = Config.noteSizeMax;
                }
            }
            const ticksPassing = tickTimeEnd - tickTimeStart;
            const noteSecondsStart = this.noteSecondsEnd;
            const noteSecondsEnd = noteSecondsStart + secondsPassing;
            const noteTicksStart = this.noteTicksEnd;
            const noteTicksEnd = noteTicksStart + ticksPassing;
            const prevNoteSecondsStart = this.prevNoteSecondsEnd;
            const prevNoteSecondsEnd = prevNoteSecondsStart + secondsPassing;
            const prevNoteTicksStart = this.prevNoteTicksEnd;
            const prevNoteTicksEnd = prevNoteTicksStart + ticksPassing;
            const beatsPerTick = 1.0 / (Config.ticksPerPart * Config.partsPerBeat);
            const beatTimeStart = beatsPerTick * tickTimeStart;
            const beatTimeEnd = beatsPerTick * tickTimeEnd;
            let noteSizeStart = this._noteSizeFinal;
            let noteSizeEnd = this._noteSizeFinal;
            let prevNoteSize = this._prevNoteSizeFinal;
            let nextNoteSize = 0;
            let prevSlideStart = false;
            let prevSlideEnd = false;
            let nextSlideStart = false;
            let nextSlideEnd = false;
            let prevSlideRatioStart = 0.0;
            let prevSlideRatioEnd = 0.0;
            let nextSlideRatioStart = 0.0;
            let nextSlideRatioEnd = 0.0;
            if (tone != null && tone.note != null && !tone.passedEndOfNote) {
                const endPinIndex = tone.note.getEndPinIndex(currentPart);
                const startPin = tone.note.pins[endPinIndex - 1];
                const endPin = tone.note.pins[endPinIndex];
                const startPinTick = (tone.note.start + startPin.time) * Config.ticksPerPart;
                const endPinTick = (tone.note.start + endPin.time) * Config.ticksPerPart;
                const ratioStart = (tickTimeStart - startPinTick) / (endPinTick - startPinTick);
                const ratioEnd = (tickTimeEnd - startPinTick) / (endPinTick - startPinTick);
                noteSizeStart = startPin.size + (endPin.size - startPin.size) * ratioStart;
                noteSizeEnd = startPin.size + (endPin.size - startPin.size) * ratioEnd;
                if (transition.slides) {
                    const noteStartTick = tone.noteStartPart * Config.ticksPerPart;
                    const noteEndTick = tone.noteEndPart * Config.ticksPerPart;
                    const noteLengthTicks = noteEndTick - noteStartTick;
                    const maximumSlideTicks = noteLengthTicks * 0.5;
                    const slideTicks = Math.min(maximumSlideTicks, transition.slideTicks);
                    if (tone.prevNote != null && !tone.forceContinueAtStart) {
                        if (tickTimeStart - noteStartTick < slideTicks) {
                            prevSlideStart = true;
                            prevSlideRatioStart = 0.5 * (1.0 - (tickTimeStart - noteStartTick) / slideTicks);
                        }
                        if (tickTimeEnd - noteStartTick < slideTicks) {
                            prevSlideEnd = true;
                            prevSlideRatioEnd = 0.5 * (1.0 - (tickTimeEnd - noteStartTick) / slideTicks);
                        }
                    }
                    if (tone.nextNote != null && !tone.forceContinueAtEnd) {
                        nextNoteSize = tone.nextNote.pins[0].size;
                        if (noteEndTick - tickTimeStart < slideTicks) {
                            nextSlideStart = true;
                            nextSlideRatioStart = 0.5 * (1.0 - (noteEndTick - tickTimeStart) / slideTicks);
                        }
                        if (noteEndTick - tickTimeEnd < slideTicks) {
                            nextSlideEnd = true;
                            nextSlideRatioEnd = 0.5 * (1.0 - (noteEndTick - tickTimeEnd) / slideTicks);
                        }
                    }
                }
            }
            let lowpassCutoffDecayVolumeCompensation = 1.0;
            let usedNoteSize = false;
            for (let envelopeIndex = 0; envelopeIndex <= instrument.envelopeCount; envelopeIndex++) {
                let automationTarget;
                let targetIndex;
                let envelope;
                if (envelopeIndex == instrument.envelopeCount) {
                    if (usedNoteSize)
                        break;
                    automationTarget = Config.instrumentAutomationTargets.dictionary["noteVolume"];
                    targetIndex = 0;
                    envelope = Config.envelopes.dictionary["note size"];
                }
                else {
                    let envelopeSettings = instrument.envelopes[envelopeIndex];
                    automationTarget = Config.instrumentAutomationTargets[envelopeSettings.target];
                    targetIndex = envelopeSettings.index;
                    envelope = Config.envelopes[envelopeSettings.envelope];
                    if (envelope.type == 0)
                        usedNoteSize = true;
                }
                if (automationTarget.computeIndex != null) {
                    const computeIndex = automationTarget.computeIndex + targetIndex;
                    let envelopeStart = EnvelopeComputer.computeEnvelope(envelope, noteSecondsStart, beatTimeStart, noteSizeStart);
                    let envelopeEnd = EnvelopeComputer.computeEnvelope(envelope, noteSecondsEnd, beatTimeEnd, noteSizeEnd);
                    if (prevSlideStart) {
                        const other = EnvelopeComputer.computeEnvelope(envelope, prevNoteSecondsStart, beatTimeStart, prevNoteSize);
                        envelopeStart += (other - envelopeStart) * prevSlideRatioStart;
                    }
                    if (prevSlideEnd) {
                        const other = EnvelopeComputer.computeEnvelope(envelope, prevNoteSecondsEnd, beatTimeEnd, prevNoteSize);
                        envelopeEnd += (other - envelopeEnd) * prevSlideRatioEnd;
                    }
                    if (nextSlideStart) {
                        const other = EnvelopeComputer.computeEnvelope(envelope, 0.0, beatTimeStart, nextNoteSize);
                        envelopeStart += (other - envelopeStart) * nextSlideRatioStart;
                    }
                    if (nextSlideEnd) {
                        const other = EnvelopeComputer.computeEnvelope(envelope, 0.0, beatTimeEnd, nextNoteSize);
                        envelopeEnd += (other - envelopeEnd) * nextSlideRatioEnd;
                    }
                    this.envelopeStarts[computeIndex] *= envelopeStart;
                    this.envelopeEnds[computeIndex] *= envelopeEnd;
                    if (automationTarget.isFilter) {
                        const filterSettings = instrument.noteFilter;
                        if (filterSettings.controlPointCount > targetIndex && filterSettings.controlPoints[targetIndex].type == 0) {
                            lowpassCutoffDecayVolumeCompensation = Math.max(lowpassCutoffDecayVolumeCompensation, EnvelopeComputer.getLowpassCutoffDecayVolumeCompensation(envelope));
                        }
                    }
                }
            }
            this.noteSecondsStart = noteSecondsStart;
            this.noteSecondsEnd = noteSecondsEnd;
            this.noteTicksStart = noteTicksStart;
            this.noteTicksEnd = noteTicksEnd;
            this.prevNoteSecondsStart = prevNoteSecondsStart;
            this.prevNoteSecondsEnd = prevNoteSecondsEnd;
            this.prevNoteTicksStart = prevNoteTicksStart;
            this.prevNoteTicksEnd = prevNoteTicksEnd;
            this.prevNoteSize = prevNoteSize;
            this.nextNoteSize = nextNoteSize;
            this.noteSizeStart = noteSizeStart;
            this.noteSizeEnd = noteSizeEnd;
            this.prevSlideStart = prevSlideStart;
            this.prevSlideEnd = prevSlideEnd;
            this.nextSlideStart = nextSlideStart;
            this.nextSlideEnd = nextSlideEnd;
            this.prevSlideRatioStart = prevSlideRatioStart;
            this.prevSlideRatioEnd = prevSlideRatioEnd;
            this.nextSlideRatioStart = nextSlideRatioStart;
            this.nextSlideRatioEnd = nextSlideRatioEnd;
            this.lowpassCutoffDecayVolumeCompensation = lowpassCutoffDecayVolumeCompensation;
        }
        clearEnvelopes(instrument) {
            for (let envelopeIndex = 0; envelopeIndex < instrument.envelopeCount; envelopeIndex++) {
                const envelopeSettings = instrument.envelopes[envelopeIndex];
                const automationTarget = Config.instrumentAutomationTargets[envelopeSettings.target];
                if (automationTarget.computeIndex != null) {
                    const computeIndex = automationTarget.computeIndex + envelopeSettings.index;
                    this.envelopeStarts[computeIndex] = 1.0;
                    this.envelopeEnds[computeIndex] = 1.0;
                }
            }
            this.envelopeStarts[0] = 1.0;
            this.envelopeEnds[0] = 1.0;
        }
        static computeEnvelope(envelope, time, beats, noteSize) {
            switch (envelope.type) {
                case 0: return Synth.noteSizeToVolumeMult(noteSize);
                case 1: return 1.0;
                case 4: return 1.0 / (1.0 + time * envelope.speed);
                case 5: return 1.0 - 1.0 / (1.0 + time * envelope.speed);
                case 6: return 0.5 - Math.cos(beats * 2.0 * Math.PI * envelope.speed) * 0.5;
                case 7: return 0.75 - Math.cos(beats * 2.0 * Math.PI * envelope.speed) * 0.25;
                case 2: return Math.max(1.0, 2.0 - time * 10.0);
                case 3:
                    const attack = 0.25 / Math.sqrt(envelope.speed);
                    return time < attack ? time / attack : 1.0 / (1.0 + (time - attack) * envelope.speed);
                case 8: return Math.pow(2, -envelope.speed * time);
                default: throw new Error("Unrecognized operator envelope type.");
            }
        }
        static getLowpassCutoffDecayVolumeCompensation(envelope) {
            if (envelope.type == 8)
                return 1.25 + 0.025 * envelope.speed;
            if (envelope.type == 4)
                return 1.0 + 0.02 * envelope.speed;
            return 1.0;
        }
    }
    class Tone {
        constructor() {
            this.pitches = Array(Config.maxChordSize).fill(0);
            this.pitchCount = 0;
            this.chordSize = 0;
            this.drumsetPitch = null;
            this.note = null;
            this.prevNote = null;
            this.nextNote = null;
            this.prevNotePitchIndex = 0;
            this.nextNotePitchIndex = 0;
            this.freshlyAllocated = true;
            this.atNoteStart = false;
            this.isOnLastTick = false;
            this.passedEndOfNote = false;
            this.forceContinueAtStart = false;
            this.forceContinueAtEnd = false;
            this.noteStartPart = 0;
            this.noteEndPart = 0;
            this.ticksSinceReleased = 0;
            this.liveInputSamplesHeld = 0;
            this.lastInterval = 0;
            this.sample = 0.0;
            this.phases = [];
            this.phaseDeltas = [];
            this.expressionStarts = [];
            this.expressionDeltas = [];
            this.phaseDeltaScales = [];
            this.prevVibrato = null;
            this.pulseWidth = 0.0;
            this.pulseWidthDelta = 0.0;
            this.pickedStrings = [];
            this.noteFilters = [];
            this.noteFilterCount = 0;
            this.initialNoteFilterInput1 = 0.0;
            this.initialNoteFilterInput2 = 0.0;
            this.specialIntervalMult = 0.0;
            this.specialIntervalExpressionMult = 1.0;
            this.feedbackOutputs = [];
            this.feedbackMult = 0.0;
            this.feedbackDelta = 0.0;
            this.envelopeComputer = new EnvelopeComputer();
            this.reset();
        }
        reset() {
            this.sample = 0.0;
            const maxWaves = Math.max(Config.maxChordSize, Config.operatorCount);
            for (let i = 0; i < maxWaves; i++) {
                this.phases[i] = 0.0;
                this.feedbackOutputs[i] = 0.0;
            }
            for (let i = 0; i < this.noteFilterCount; i++) {
                this.noteFilters[i].resetOutput();
            }
            this.noteFilterCount = 0;
            this.initialNoteFilterInput1 = 0.0;
            this.initialNoteFilterInput2 = 0.0;
            this.liveInputSamplesHeld = 0;
            for (const pickedString of this.pickedStrings) {
                pickedString.reset();
            }
            this.envelopeComputer.reset();
            this.prevVibrato = null;
            this.drumsetPitch = null;
        }
    }
    class InstrumentState {
        constructor() {
            this.awake = false;
            this.computed = false;
            this.tonesAddedInThisTick = false;
            this.flushingDelayLines = false;
            this.deactivateAfterThisTick = false;
            this.attentuationProgress = 0.0;
            this.flushedSamples = 0;
            this.activeTones = new Deque();
            this.releasedTones = new Deque();
            this.liveInputTones = new Deque();
            this.eqFilterVolumeStart = 1.0;
            this.eqFilterVolumeDelta = 0.0;
            this.mixVolumeStart = 1.0;
            this.mixVolumeDelta = 0.0;
            this.delayInputMultStart = 0.0;
            this.delayInputMultDelta = 0.0;
            this.distortionStart = 0.0;
            this.distortionEnd = 0.0;
            this.distortionFractionalInput1 = 0.0;
            this.distortionFractionalInput2 = 0.0;
            this.distortionFractionalInput3 = 0.0;
            this.distortionPrevInput = 0.0;
            this.distortionNextOutput = 0.0;
            this.bitcrusherPrevInput = 0.0;
            this.bitcrusherCurrentOutput = 0.0;
            this.bitcrusherPhase = 1.0;
            this.bitcrusherPhaseDelta = 0.0;
            this.bitcrusherPhaseDeltaScale = 1.0;
            this.bitcrusherScale = 1.0;
            this.bitcrusherScaleScale = 1.0;
            this.bitcrusherFoldLevel = 1.0;
            this.bitcrusherFoldLevelScale = 1.0;
            this.eqFilters = [];
            this.eqFilterCount = 0;
            this.initialEqFilterInput1 = 0.0;
            this.initialEqFilterInput2 = 0.0;
            this.panningDelayLine = null;
            this.panningDelayPos = 0;
            this.panningVolumeStartL = 0.0;
            this.panningVolumeStartR = 0.0;
            this.panningVolumeDeltaL = 0.0;
            this.panningVolumeDeltaR = 0.0;
            this.panningOffsetStartL = 0.0;
            this.panningOffsetStartR = 0.0;
            this.panningOffsetDeltaL = 0.0;
            this.panningOffsetDeltaR = 0.0;
            this.chorusDelayLineL = null;
            this.chorusDelayLineR = null;
            this.chorusDelayLineDirty = false;
            this.chorusDelayPos = 0;
            this.chorusPhase = 0;
            this.chorusStart = 0;
            this.chorusEnd = 0;
            this.echoDelayLineL = null;
            this.echoDelayLineR = null;
            this.echoDelayLineDirty = false;
            this.echoDelayPos = 0;
            this.echoDelayOffsetStart = 0;
            this.echoDelayOffsetEnd = 0;
            this.echoDelayOffsetLastTick = 0;
            this.echoDelayOffsetRatio = 0.0;
            this.echoDelayOffsetRatioDelta = 0.0;
            this.echoDelayOffsetLastTickIsComputed = false;
            this.echoMultStart = 0.0;
            this.echoMultDelta = 0.0;
            this.echoShelfA1 = 0.0;
            this.echoShelfB0 = 0.0;
            this.echoShelfB1 = 0.0;
            this.echoShelfSampleL = 0.0;
            this.echoShelfSampleR = 0.0;
            this.echoShelfPrevInputL = 0.0;
            this.echoShelfPrevInputR = 0.0;
            this.reverbDelayLine = null;
            this.reverbDelayLineDirty = false;
            this.reverbDelayPos = 0;
            this.reverbMultStart = 0.0;
            this.reverbMultDelta = 0.0;
            this.reverbShelfA1 = 0.0;
            this.reverbShelfB0 = 0.0;
            this.reverbShelfB1 = 0.0;
            this.reverbShelfSample0 = 0.0;
            this.reverbShelfSample1 = 0.0;
            this.reverbShelfSample2 = 0.0;
            this.reverbShelfSample3 = 0.0;
            this.reverbShelfPrevInput0 = 0.0;
            this.reverbShelfPrevInput1 = 0.0;
            this.reverbShelfPrevInput2 = 0.0;
            this.reverbShelfPrevInput3 = 0.0;
        }
        allocateNecessaryBuffers(synth, instrument, samplesPerTick) {
            if (effectsIncludePanning(instrument.effects)) {
                if (this.panningDelayLine == null || this.panningDelayLine.length < synth.panningDelayBufferSize) {
                    this.panningDelayLine = new Float32Array(synth.panningDelayBufferSize);
                }
            }
            if (effectsIncludeChorus(instrument.effects)) {
                if (this.chorusDelayLineL == null || this.chorusDelayLineL.length < synth.chorusDelayBufferSize) {
                    this.chorusDelayLineL = new Float32Array(synth.chorusDelayBufferSize);
                }
                if (this.chorusDelayLineR == null || this.chorusDelayLineR.length < synth.chorusDelayBufferSize) {
                    this.chorusDelayLineR = new Float32Array(synth.chorusDelayBufferSize);
                }
            }
            if (effectsIncludeEcho(instrument.effects)) {
                const safeEchoDelaySteps = Math.max(Config.echoDelayRange >> 1, (instrument.echoDelay + 1));
                const baseEchoDelayBufferSize = Synth.fittingPowerOfTwo(safeEchoDelaySteps * Config.echoDelayStepTicks * samplesPerTick);
                const safeEchoDelayBufferSize = baseEchoDelayBufferSize * 2;
                if (this.echoDelayLineL == null || this.echoDelayLineR == null) {
                    this.echoDelayLineL = new Float32Array(safeEchoDelayBufferSize);
                    this.echoDelayLineR = new Float32Array(safeEchoDelayBufferSize);
                }
                else if (this.echoDelayLineL.length < safeEchoDelayBufferSize || this.echoDelayLineR.length < safeEchoDelayBufferSize) {
                    const newDelayLineL = new Float32Array(safeEchoDelayBufferSize);
                    const newDelayLineR = new Float32Array(safeEchoDelayBufferSize);
                    const oldMask = this.echoDelayLineL.length - 1;
                    for (let i = 0; i < this.echoDelayLineL.length; i++) {
                        newDelayLineL[i] = this.echoDelayLineL[(this.echoDelayPos + i) & oldMask];
                        newDelayLineR[i] = this.echoDelayLineL[(this.echoDelayPos + i) & oldMask];
                    }
                    this.echoDelayPos = this.echoDelayLineL.length;
                    this.echoDelayLineL = newDelayLineL;
                    this.echoDelayLineR = newDelayLineR;
                }
            }
            if (effectsIncludeReverb(instrument.effects)) {
                if (this.reverbDelayLine == null) {
                    this.reverbDelayLine = new Float32Array(Config.reverbDelayBufferSize);
                }
            }
        }
        deactivate() {
            this.bitcrusherPrevInput = 0.0;
            this.bitcrusherCurrentOutput = 0.0;
            this.bitcrusherPhase = 1.0;
            for (let i = 0; i < this.eqFilterCount; i++) {
                this.eqFilters[i].resetOutput();
            }
            this.eqFilterCount = 0;
            this.initialEqFilterInput1 = 0.0;
            this.initialEqFilterInput2 = 0.0;
            this.distortionFractionalInput1 = 0.0;
            this.distortionFractionalInput2 = 0.0;
            this.distortionFractionalInput3 = 0.0;
            this.distortionPrevInput = 0.0;
            this.distortionNextOutput = 0.0;
            this.panningDelayPos = 0;
            if (this.panningDelayLine != null)
                for (let i = 0; i < this.panningDelayLine.length; i++)
                    this.panningDelayLine[i] = 0.0;
            this.echoDelayOffsetLastTickIsComputed = false;
            this.echoShelfSampleL = 0.0;
            this.echoShelfSampleR = 0.0;
            this.echoShelfPrevInputL = 0.0;
            this.echoShelfPrevInputR = 0.0;
            this.reverbShelfSample0 = 0.0;
            this.reverbShelfSample1 = 0.0;
            this.reverbShelfSample2 = 0.0;
            this.reverbShelfSample3 = 0.0;
            this.reverbShelfPrevInput0 = 0.0;
            this.reverbShelfPrevInput1 = 0.0;
            this.reverbShelfPrevInput2 = 0.0;
            this.reverbShelfPrevInput3 = 0.0;
            this.awake = false;
            this.flushingDelayLines = false;
            this.deactivateAfterThisTick = false;
            this.attentuationProgress = 0.0;
            this.flushedSamples = 0;
        }
        resetAllEffects() {
            this.deactivate();
            if (this.chorusDelayLineDirty) {
                for (let i = 0; i < this.chorusDelayLineL.length; i++)
                    this.chorusDelayLineL[i] = 0.0;
                for (let i = 0; i < this.chorusDelayLineR.length; i++)
                    this.chorusDelayLineR[i] = 0.0;
            }
            if (this.echoDelayLineDirty) {
                for (let i = 0; i < this.echoDelayLineL.length; i++)
                    this.echoDelayLineL[i] = 0.0;
                for (let i = 0; i < this.echoDelayLineR.length; i++)
                    this.echoDelayLineR[i] = 0.0;
            }
            if (this.reverbDelayLineDirty) {
                for (let i = 0; i < this.reverbDelayLine.length; i++)
                    this.reverbDelayLine[i] = 0.0;
            }
            this.chorusPhase = 0.0;
        }
        compute(synth, instrument, samplesPerTick, runLength, tone) {
            this.computed = true;
            this.allocateNecessaryBuffers(synth, instrument, samplesPerTick);
            const samplesPerSecond = synth.samplesPerSecond;
            const tickSampleCountdown = synth.tickSampleCountdown;
            const tickRemainingStart = (tickSampleCountdown) / samplesPerTick;
            const tickRemainingEnd = (tickSampleCountdown - runLength) / samplesPerTick;
            const usesDistortion = effectsIncludeDistortion(instrument.effects);
            const usesBitcrusher = effectsIncludeBitcrusher(instrument.effects);
            const usesPanning = effectsIncludePanning(instrument.effects);
            const usesChorus = effectsIncludeChorus(instrument.effects);
            const usesEcho = effectsIncludeEcho(instrument.effects);
            const usesReverb = effectsIncludeReverb(instrument.effects);
            if (usesDistortion) {
                this.distortionStart = Math.min(1.0, instrument.distortion / (Config.distortionRange - 1));
                this.distortionEnd = Math.min(1.0, instrument.distortion / (Config.distortionRange - 1));
            }
            if (usesBitcrusher) {
                const freqSettingStart = instrument.bitcrusherFreq;
                const freqSettingEnd = instrument.bitcrusherFreq;
                const quantizationSettingStart = instrument.bitcrusherQuantization;
                const quantizationSettingEnd = instrument.bitcrusherQuantization;
                const basePitch = Config.keys[synth.song.key].basePitch;
                const freqStart = Instrument.frequencyFromPitch(basePitch + 60) * Math.pow(2.0, (Config.bitcrusherFreqRange - 1 - freqSettingStart) * Config.bitcrusherOctaveStep);
                const freqEnd = Instrument.frequencyFromPitch(basePitch + 60) * Math.pow(2.0, (Config.bitcrusherFreqRange - 1 - freqSettingEnd) * Config.bitcrusherOctaveStep);
                const phaseDeltaStart = Math.min(1.0, freqStart / samplesPerSecond);
                const phaseDeltaEnd = Math.min(1.0, freqEnd / samplesPerSecond);
                this.bitcrusherPhaseDelta = phaseDeltaStart;
                this.bitcrusherPhaseDeltaScale = Math.pow(phaseDeltaEnd / phaseDeltaStart, 1.0 / runLength);
                const scaleStart = 2.0 * Config.bitcrusherBaseVolume * Math.pow(2.0, 1.0 - Math.pow(2.0, (Config.bitcrusherQuantizationRange - 1 - quantizationSettingStart) * 0.5));
                const scaleEnd = 2.0 * Config.bitcrusherBaseVolume * Math.pow(2.0, 1.0 - Math.pow(2.0, (Config.bitcrusherQuantizationRange - 1 - quantizationSettingEnd) * 0.5));
                this.bitcrusherScale = scaleStart;
                this.bitcrusherScaleScale = Math.pow(scaleEnd / scaleStart, 1.0 / runLength);
                const foldLevelStart = 2.0 * Config.bitcrusherBaseVolume * Math.pow(1.5, Config.bitcrusherQuantizationRange - 1 - quantizationSettingStart);
                const foldLevelEnd = 2.0 * Config.bitcrusherBaseVolume * Math.pow(1.5, Config.bitcrusherQuantizationRange - 1 - quantizationSettingEnd);
                this.bitcrusherFoldLevel = foldLevelStart;
                this.bitcrusherFoldLevelScale = Math.pow(foldLevelEnd / foldLevelStart, 1.0 / runLength);
            }
            let eqFilterVolume = 1.0;
            const eqFilterSettings = instrument.eqFilter;
            for (let i = 0; i < eqFilterSettings.controlPointCount; i++) {
                const point = eqFilterSettings.controlPoints[i];
                point.toCoefficients(Synth.tempFilterStartCoefficients, samplesPerSecond, 1.0, 1.0);
                point.toCoefficients(Synth.tempFilterEndCoefficients, samplesPerSecond, 1.0, 1.0);
                if (this.eqFilters.length <= i)
                    this.eqFilters[i] = new DynamicBiquadFilter();
                this.eqFilters[i].loadCoefficientsWithGradient(Synth.tempFilterStartCoefficients, Synth.tempFilterEndCoefficients, 1.0 / runLength, point.type == 0);
                eqFilterVolume *= point.getVolumeCompensationMult();
            }
            this.eqFilterCount = eqFilterSettings.controlPointCount;
            eqFilterVolume = Math.min(3.0, eqFilterVolume);
            const mainInstrumentVolume = Synth.instrumentVolumeToVolumeMult(instrument.volume);
            this.mixVolumeStart = mainInstrumentVolume;
            const mixVolumeEnd = mainInstrumentVolume;
            this.mixVolumeDelta = (mixVolumeEnd - this.mixVolumeStart) / runLength;
            let eqFilterVolumeStart = eqFilterVolume;
            let eqFilterVolumeEnd = eqFilterVolume;
            let delayInputMultStart = 1.0;
            let delayInputMultEnd = 1.0;
            if (usesPanning) {
                const pan = (instrument.pan - Config.panCenter) / Config.panCenter;
                const panStart = Math.max(-1.0, Math.min(1.0, pan));
                const panEnd = Math.max(-1.0, Math.min(1.0, pan));
                const volumeStartL = Math.cos((1 + panStart) * Math.PI * 0.25) * 1.414;
                const volumeStartR = Math.cos((1 - panStart) * Math.PI * 0.25) * 1.414;
                const volumeEndL = Math.cos((1 + panEnd) * Math.PI * 0.25) * 1.414;
                const volumeEndR = Math.cos((1 - panEnd) * Math.PI * 0.25) * 1.414;
                const maxDelaySamples = samplesPerSecond * Config.panDelaySecondsMax;
                const delayStart = panStart * maxDelaySamples;
                const delayEnd = panEnd * maxDelaySamples;
                const delayStartL = Math.max(0.0, delayStart);
                const delayStartR = Math.max(0.0, -delayStart);
                const delayEndL = Math.max(0.0, delayEnd);
                const delayEndR = Math.max(0.0, -delayEnd);
                this.panningVolumeStartL = volumeStartL;
                this.panningVolumeStartR = volumeStartR;
                this.panningVolumeDeltaL = (volumeEndL - volumeStartL) / runLength;
                this.panningVolumeDeltaR = (volumeEndR - volumeStartR) / runLength;
                this.panningOffsetStartL = delayStartL;
                this.panningOffsetStartR = delayStartR;
                this.panningOffsetDeltaL = (delayEndL - delayStartL) / runLength;
                this.panningOffsetDeltaR = (delayEndR - delayStartR) / runLength;
            }
            if (usesChorus) {
                const chorusStart = Math.min(1.0, instrument.chorus / (Config.chorusRange - 1));
                const chorusEnd = Math.min(1.0, instrument.chorus / (Config.chorusRange - 1));
                this.chorusStart = chorusStart * 0.6 + (Math.pow(chorusStart, 6.0)) * 0.4;
                this.chorusEnd = chorusEnd * 0.6 + (Math.pow(chorusEnd, 6.0)) * 0.4;
            }
            let maxEchoMult = 0.0;
            if (usesEcho) {
                const echoMultStart = Math.min(1.0, Math.pow(instrument.echoSustain / Config.echoSustainRange, 1.1)) * 0.9;
                const echoMultEnd = Math.min(1.0, Math.pow(instrument.echoSustain / Config.echoSustainRange, 1.1)) * 0.9;
                this.echoMultStart = echoMultStart;
                this.echoMultDelta = (echoMultEnd - echoMultStart) / runLength;
                maxEchoMult = Math.max(echoMultStart, echoMultEnd);
                const echoDelayOffset = Math.round((instrument.echoDelay + 1) * Config.echoDelayStepTicks * samplesPerTick);
                if (this.echoDelayOffsetLastTickIsComputed) {
                    this.echoDelayOffsetStart = this.echoDelayOffsetLastTick;
                }
                else {
                    this.echoDelayOffsetStart = echoDelayOffset;
                }
                if (synth.isAtEndOfTick) {
                    this.echoDelayOffsetLastTick = echoDelayOffset;
                    this.echoDelayOffsetLastTickIsComputed = true;
                }
                this.echoDelayOffsetEnd = echoDelayOffset;
                this.echoDelayOffsetRatio = 1.0 - tickRemainingStart;
                this.echoDelayOffsetRatioDelta = (tickRemainingStart - tickRemainingEnd) / runLength;
                const shelfRadians = 2.0 * Math.PI * Config.echoShelfHz / synth.samplesPerSecond;
                Synth.tempFilterStartCoefficients.highShelf1stOrder(shelfRadians, Config.echoShelfGain);
                this.echoShelfA1 = Synth.tempFilterStartCoefficients.a[1];
                this.echoShelfB0 = Synth.tempFilterStartCoefficients.b[0];
                this.echoShelfB1 = Synth.tempFilterStartCoefficients.b[1];
            }
            let maxReverbMult = 0.0;
            if (usesReverb) {
                const reverbStart = Math.min(1.0, Math.pow(instrument.reverb / Config.reverbRange, 0.667)) * 0.425;
                const reverbEnd = Math.min(1.0, Math.pow(instrument.reverb / Config.reverbRange, 0.667)) * 0.425;
                this.reverbMultStart = reverbStart;
                this.reverbMultDelta = (reverbEnd - reverbStart) / runLength;
                maxReverbMult = Math.max(reverbStart, reverbEnd);
                const shelfRadians = 2.0 * Math.PI * Config.reverbShelfHz / synth.samplesPerSecond;
                Synth.tempFilterStartCoefficients.highShelf1stOrder(shelfRadians, Config.reverbShelfGain);
                this.reverbShelfA1 = Synth.tempFilterStartCoefficients.a[1];
                this.reverbShelfB0 = Synth.tempFilterStartCoefficients.b[0];
                this.reverbShelfB1 = Synth.tempFilterStartCoefficients.b[1];
            }
            if (this.tonesAddedInThisTick) {
                this.attentuationProgress = 0.0;
                this.flushedSamples = 0;
                this.flushingDelayLines = false;
            }
            else if (!this.flushingDelayLines) {
                if (this.attentuationProgress == 0.0) {
                    eqFilterVolumeStart *= tickRemainingStart;
                    eqFilterVolumeEnd *= tickRemainingEnd;
                }
                else {
                    eqFilterVolumeStart = 0.0;
                    eqFilterVolumeEnd = 0.0;
                }
                const attenuationThreshold = 1.0 / 256.0;
                const halfLifeMult = -Math.log2(attenuationThreshold);
                let delayDuration = 0.0;
                if (usesChorus) {
                    delayDuration += Config.chorusMaxDelay;
                }
                if (usesEcho) {
                    const averageDelaySeconds = (this.echoDelayOffsetStart + this.echoDelayOffsetEnd) * 0.5 / samplesPerSecond;
                    const attenuationPerSecond = Math.pow(maxEchoMult, 1.0 / averageDelaySeconds);
                    const halfLife = -1.0 / Math.log2(attenuationPerSecond);
                    const echoDuration = halfLife * halfLifeMult;
                    delayDuration += echoDuration;
                }
                if (usesReverb) {
                    const averageMult = maxReverbMult * 2.0;
                    const averageDelaySeconds = (Config.reverbDelayBufferSize / 4.0) / samplesPerSecond;
                    const attenuationPerSecond = Math.pow(averageMult, 1.0 / averageDelaySeconds);
                    const halfLife = -1.0 / Math.log2(attenuationPerSecond);
                    const reverbDuration = halfLife * halfLifeMult;
                    delayDuration += reverbDuration;
                }
                const secondsInTick = samplesPerTick / samplesPerSecond;
                const progressInTick = secondsInTick / delayDuration;
                const progressAtEndOfTick = this.attentuationProgress + progressInTick;
                if (progressAtEndOfTick >= 1.0) {
                    delayInputMultStart *= tickRemainingStart;
                    delayInputMultEnd *= tickRemainingEnd;
                }
                if (synth.isAtEndOfTick) {
                    this.attentuationProgress = progressAtEndOfTick;
                    if (this.attentuationProgress >= 1.0) {
                        this.flushingDelayLines = true;
                    }
                }
            }
            else {
                eqFilterVolumeStart = 0.0;
                eqFilterVolumeEnd = 0.0;
                delayInputMultStart = 0.0;
                delayInputMultEnd = 0.0;
                let totalDelaySamples = 0;
                if (usesChorus)
                    totalDelaySamples += synth.chorusDelayBufferSize;
                if (usesEcho)
                    totalDelaySamples += this.echoDelayLineL.length;
                if (usesReverb)
                    totalDelaySamples += Config.reverbDelayBufferSize;
                this.flushedSamples += runLength;
                if (this.flushedSamples >= totalDelaySamples) {
                    this.deactivateAfterThisTick = true;
                }
            }
            this.eqFilterVolumeStart = eqFilterVolumeStart;
            this.eqFilterVolumeDelta = (eqFilterVolumeEnd - eqFilterVolumeStart) / runLength;
            this.delayInputMultStart = delayInputMultStart;
            this.delayInputMultDelta = (delayInputMultEnd - delayInputMultStart) / runLength;
        }
    }
    class ChannelState {
        constructor() {
            this.instruments = [];
            this.muted = false;
            this.singleSeamlessInstrument = null;
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
            this.liveInputInstruments = [];
            this.loopRepeatCount = -1;
            this.volume = 1.0;
            this.playheadInternal = 0.0;
            this.bar = 0;
            this.prevBar = null;
            this.nextBar = null;
            this.beat = 0;
            this.part = 0;
            this.tick = 0;
            this.isAtStartOfTick = true;
            this.isAtEndOfTick = true;
            this.tickSampleCountdown = 0;
            this.isPlayingSong = false;
            this.liveInputEndTime = 0.0;
            this.browserAutomaticallyClearsAudioBuffer = true;
            this.tempDrumSetControlPoint = new FilterControlPoint();
            this.tempFrequencyResponse = new FrequencyResponse();
            this.channels = [];
            this.tonePool = new Deque();
            this.tempMatchedPitchTones = Array(Config.maxChordSize).fill(null);
            this.limit = 0.0;
            this.tempMonoInstrumentSampleBuffer = null;
            this.audioCtx = null;
            this.scriptNode = null;
            this.audioProcessCallback = (audioProcessingEvent) => {
                const outputBuffer = audioProcessingEvent.outputBuffer;
                const outputDataL = outputBuffer.getChannelData(0);
                const outputDataR = outputBuffer.getChannelData(1);
                if (this.browserAutomaticallyClearsAudioBuffer && (outputDataL[0] != 0.0 || outputDataR[0] != 0.0 || outputDataL[outputBuffer.length - 1] != 0.0 || outputDataR[outputBuffer.length - 1] != 0.0)) {
                    this.browserAutomaticallyClearsAudioBuffer = false;
                }
                if (!this.browserAutomaticallyClearsAudioBuffer) {
                    const length = outputBuffer.length;
                    for (let i = 0; i < length; i++) {
                        outputDataL[i] = 0.0;
                        outputDataR[i] = 0.0;
                    }
                }
                const isPlayingLiveTones = performance.now() < this.liveInputEndTime;
                if (!isPlayingLiveTones && !this.isPlayingSong) {
                    this.deactivateAudio();
                }
                else {
                    this.synthesize(outputDataL, outputDataR, outputBuffer.length, this.isPlayingSong);
                }
            };
            this.computeDelayBufferSizes();
            if (song != null)
                this.setSong(song);
        }
        syncSongState() {
            const channelCount = this.song.getChannelCount();
            for (let i = this.channels.length; i < channelCount; i++) {
                this.channels[i] = new ChannelState();
            }
            this.channels.length = channelCount;
            for (let i = 0; i < channelCount; i++) {
                const channel = this.song.channels[i];
                const channelState = this.channels[i];
                for (let j = channelState.instruments.length; j < channel.instruments.length; j++) {
                    channelState.instruments[j] = new InstrumentState();
                }
                channelState.instruments.length = channel.instruments.length;
                if (channelState.muted != channel.muted) {
                    channelState.muted = channel.muted;
                    if (channelState.muted) {
                        for (const instrumentState of channelState.instruments) {
                            instrumentState.resetAllEffects();
                        }
                    }
                }
            }
        }
        warmUpSynthesizer(song) {
            if (song != null) {
                this.syncSongState();
                const samplesPerTick = this.getSamplesPerTick();
                for (let j = 0; j < song.getChannelCount(); j++) {
                    for (let i = 0; i < song.channels[j].instruments.length; i++) {
                        const instrument = song.channels[j].instruments[i];
                        const instrumentState = this.channels[j].instruments[i];
                        Synth.getInstrumentSynthFunction(instrument);
                        instrument.warmUp(this.samplesPerSecond);
                        instrumentState.allocateNecessaryBuffers(this, instrument, samplesPerTick);
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
                this.prevBar = null;
            }
        }
        getSamplesPerBar() {
            if (this.song == null)
                throw new Error();
            return this.getSamplesPerTick() * Config.ticksPerPart * Config.partsPerBeat * this.song.beatsPerBar;
        }
        getTicksIntoBar() {
            return (this.beat * Config.partsPerBeat + this.part) * Config.ticksPerPart + this.tick;
        }
        getCurrentPart() {
            return (this.beat * Config.partsPerBeat + this.part);
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
            this.prevBar = null;
        }
        computeDelayBufferSizes() {
            this.panningDelayBufferSize = Synth.fittingPowerOfTwo(this.samplesPerSecond * Config.panDelaySecondsMax);
            this.panningDelayBufferMask = this.panningDelayBufferSize - 1;
            this.chorusDelayBufferSize = Synth.fittingPowerOfTwo(this.samplesPerSecond * Config.chorusMaxDelay);
            this.chorusDelayBufferMask = this.chorusDelayBufferSize - 1;
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
                this.computeDelayBufferSizes();
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
            this.activateAudio();
            this.warmUpSynthesizer(this.song);
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
            this.prevBar = null;
        }
        snapToBar() {
            this.playheadInternal = this.bar;
            this.beat = 0;
            this.part = 0;
            this.tick = 0;
            this.tickSampleCountdown = 0;
            this.isAtStartOfTick = true;
            this.prevBar = null;
        }
        resetEffects() {
            this.limit = 0.0;
            this.freeAllTones();
            if (this.song != null) {
                for (const channelState of this.channels) {
                    for (const instrumentState of channelState.instruments) {
                        instrumentState.resetAllEffects();
                    }
                }
            }
        }
        jumpIntoLoop() {
            if (!this.song)
                return;
            if (this.bar < this.song.loopStart || this.bar >= this.song.loopStart + this.song.loopLength) {
                const oldBar = this.bar;
                this.bar = this.song.loopStart;
                this.playheadInternal += this.bar - oldBar;
                this.prevBar = null;
            }
        }
        goToNextBar() {
            if (!this.song)
                return;
            this.prevBar = this.bar;
            const oldBar = this.bar;
            this.bar++;
            if (this.bar >= this.song.barCount) {
                this.bar = 0;
            }
            this.playheadInternal += this.bar - oldBar;
        }
        goToPrevBar() {
            if (!this.song)
                return;
            this.prevBar = null;
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
            const song = this.song;
            const samplesPerTick = this.getSamplesPerTick();
            let ended = false;
            while (this.tickSampleCountdown <= 0)
                this.tickSampleCountdown += samplesPerTick;
            if (this.tickSampleCountdown > samplesPerTick)
                this.tickSampleCountdown = samplesPerTick;
            if (playSong) {
                if (this.beat >= song.beatsPerBar) {
                    this.bar++;
                    this.beat = 0;
                    this.part = 0;
                    this.tick = 0;
                    this.tickSampleCountdown = samplesPerTick;
                    if (this.loopRepeatCount != 0 && this.bar == song.loopStart + song.loopLength) {
                        this.bar = song.loopStart;
                        if (this.loopRepeatCount > 0)
                            this.loopRepeatCount--;
                    }
                }
                if (this.bar >= song.barCount) {
                    this.bar = 0;
                    if (this.loopRepeatCount != -1) {
                        ended = true;
                        this.pause();
                    }
                }
            }
            this.syncSongState();
            if (this.tempMonoInstrumentSampleBuffer == null || this.tempMonoInstrumentSampleBuffer.length < outputBufferLength) {
                this.tempMonoInstrumentSampleBuffer = new Float32Array(outputBufferLength);
            }
            const volume = +this.volume;
            const limitDecay = 1.0 - Math.pow(0.5, 4.0 / this.samplesPerSecond);
            const limitRise = 1.0 - Math.pow(0.5, 4000.0 / this.samplesPerSecond);
            let limit = +this.limit;
            let bufferIndex = 0;
            while (bufferIndex < outputBufferLength && !ended) {
                this.nextBar = this.bar + 1;
                if (this.loopRepeatCount != 0 && this.nextBar == song.loopStart + song.loopLength) {
                    this.nextBar = song.loopStart;
                }
                if (this.nextBar >= song.barCount)
                    this.nextBar = null;
                const samplesLeftInBuffer = outputBufferLength - bufferIndex;
                const samplesLeftInTick = Math.ceil(this.tickSampleCountdown);
                const runLength = Math.min(samplesLeftInTick, samplesLeftInBuffer);
                this.isAtEndOfTick = (runLength >= this.tickSampleCountdown);
                for (let channelIndex = 0; channelIndex < song.getChannelCount(); channelIndex++) {
                    const channel = song.channels[channelIndex];
                    const channelState = this.channels[channelIndex];
                    this.determineCurrentActiveTones(song, channelIndex, playSong);
                    this.determineLiveInputTones(song, channelIndex);
                    for (let instrumentIndex = 0; instrumentIndex < channel.instruments.length; instrumentIndex++) {
                        const instrument = channel.instruments[instrumentIndex];
                        const instrumentState = channelState.instruments[instrumentIndex];
                        let tonesPlayedInThisInstrument = 0;
                        for (let i = 0; i < instrumentState.activeTones.count(); i++) {
                            const tone = instrumentState.activeTones.get(i);
                            this.playTone(song, channelIndex, samplesPerTick, bufferIndex, runLength, tone, false, false);
                            tonesPlayedInThisInstrument++;
                        }
                        for (let i = 0; i < instrumentState.liveInputTones.count(); i++) {
                            const tone = instrumentState.liveInputTones.get(i);
                            this.playTone(song, channelIndex, samplesPerTick, bufferIndex, runLength, tone, false, false);
                            tonesPlayedInThisInstrument++;
                        }
                        for (let i = 0; i < instrumentState.releasedTones.count(); i++) {
                            const tone = instrumentState.releasedTones.get(i);
                            if (tone.ticksSinceReleased >= Math.abs(instrument.getFadeOutTicks())) {
                                this.freeReleasedTone(instrumentState, i);
                                i--;
                                continue;
                            }
                            const shouldFadeOutFast = (tonesPlayedInThisInstrument >= Config.maximumTonesPerChannel);
                            this.playTone(song, channelIndex, samplesPerTick, bufferIndex, runLength, tone, true, shouldFadeOutFast);
                            tonesPlayedInThisInstrument++;
                        }
                        if (instrumentState.awake) {
                            if (!instrumentState.computed) {
                                instrumentState.compute(this, instrument, samplesPerTick, runLength, null);
                            }
                            Synth.effectsSynth(this, outputDataL, outputDataR, bufferIndex, runLength, instrument, instrumentState);
                            instrumentState.computed = false;
                        }
                    }
                }
                const runEnd = bufferIndex + runLength;
                for (let i = bufferIndex; i < runEnd; i++) {
                    const sampleL = outputDataL[i];
                    const sampleR = outputDataR[i];
                    const abs = Math.max(Math.abs(sampleL), Math.abs(sampleR));
                    limit += (abs - limit) * (limit < abs ? limitRise : limitDecay * (1.0 + limit));
                    const limitedVolume = volume / (limit >= 1 ? limit * 1.05 : limit * 0.8 + 0.25);
                    outputDataL[i] = sampleL * limitedVolume;
                    outputDataR[i] = sampleR * limitedVolume;
                }
                bufferIndex += runLength;
                this.isAtStartOfTick = false;
                this.tickSampleCountdown -= runLength;
                if (this.tickSampleCountdown <= 0) {
                    this.isAtStartOfTick = true;
                    for (const channelState of this.channels) {
                        for (const instrumentState of channelState.instruments) {
                            for (let i = 0; i < instrumentState.releasedTones.count(); i++) {
                                const tone = instrumentState.releasedTones.get(i);
                                if (tone.isOnLastTick) {
                                    this.freeReleasedTone(instrumentState, i);
                                    i--;
                                }
                                else {
                                    tone.ticksSinceReleased++;
                                }
                            }
                            if (instrumentState.deactivateAfterThisTick) {
                                instrumentState.deactivate();
                            }
                            instrumentState.tonesAddedInThisTick = false;
                        }
                    }
                    this.tick++;
                    this.tickSampleCountdown += samplesPerTick;
                    if (this.tick == Config.ticksPerPart) {
                        this.tick = 0;
                        this.part++;
                        this.liveInputDuration--;
                        if (this.part == Config.partsPerBeat) {
                            this.part = 0;
                            if (playSong) {
                                this.beat++;
                                if (this.beat == song.beatsPerBar) {
                                    this.beat = 0;
                                    this.prevBar = this.bar;
                                    this.bar++;
                                    if (this.loopRepeatCount != 0 && this.bar == song.loopStart + song.loopLength) {
                                        this.bar = song.loopStart;
                                        if (this.loopRepeatCount > 0)
                                            this.loopRepeatCount--;
                                    }
                                    if (this.bar >= song.barCount) {
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
            if (!Number.isFinite(limit) || Math.abs(limit) < epsilon)
                limit = 0.0;
            this.limit = limit;
            if (playSong) {
                this.playheadInternal = (((this.tick + 1.0 - this.tickSampleCountdown / samplesPerTick) / 2.0 + this.part) / Config.partsPerBeat + this.beat) / song.beatsPerBar + this.bar;
            }
        }
        freeTone(tone) {
            this.tonePool.pushBack(tone);
        }
        newTone() {
            if (this.tonePool.count() > 0) {
                const tone = this.tonePool.popBack();
                tone.freshlyAllocated = true;
                return tone;
            }
            return new Tone();
        }
        releaseTone(instrumentState, tone) {
            instrumentState.releasedTones.pushFront(tone);
            tone.atNoteStart = false;
            tone.passedEndOfNote = true;
        }
        freeReleasedTone(instrumentState, toneIndex) {
            this.freeTone(instrumentState.releasedTones.get(toneIndex));
            instrumentState.releasedTones.remove(toneIndex);
        }
        freeAllTones() {
            for (const channelState of this.channels) {
                for (const instrumentState of channelState.instruments) {
                    while (instrumentState.activeTones.count() > 0)
                        this.freeTone(instrumentState.activeTones.popBack());
                    while (instrumentState.releasedTones.count() > 0)
                        this.freeTone(instrumentState.releasedTones.popBack());
                    while (instrumentState.liveInputTones.count() > 0)
                        this.freeTone(instrumentState.liveInputTones.popBack());
                }
            }
        }
        determineLiveInputTones(song, channelIndex) {
            const channel = song.channels[channelIndex];
            const channelState = this.channels[channelIndex];
            const pitches = this.liveInputPitches;
            for (let instrumentIndex = 0; instrumentIndex < channel.instruments.length; instrumentIndex++) {
                const instrumentState = channelState.instruments[instrumentIndex];
                const toneList = instrumentState.liveInputTones;
                let toneCount = 0;
                if (this.liveInputDuration > 0 && channelIndex == this.liveInputChannel && pitches.length > 0 && this.liveInputInstruments.indexOf(instrumentIndex) != -1) {
                    const instrument = channel.instruments[instrumentIndex];
                    if (instrument.getChord().singleTone) {
                        let tone;
                        if (toneList.count() <= toneCount) {
                            tone = this.newTone();
                            toneList.pushBack(tone);
                        }
                        else if (!instrument.getTransition().isSeamless && this.liveInputStarted) {
                            this.releaseTone(instrumentState, toneList.get(toneCount));
                            tone = this.newTone();
                            toneList.set(toneCount, tone);
                        }
                        else {
                            tone = toneList.get(toneCount);
                        }
                        toneCount++;
                        for (let i = 0; i < pitches.length; i++) {
                            tone.pitches[i] = pitches[i];
                        }
                        tone.pitchCount = pitches.length;
                        tone.chordSize = 1;
                        tone.instrumentIndex = instrumentIndex;
                        tone.note = tone.prevNote = tone.nextNote = null;
                        tone.atNoteStart = this.liveInputStarted;
                        tone.forceContinueAtStart = false;
                        tone.forceContinueAtEnd = false;
                    }
                    else {
                        for (let i = 0; i < pitches.length; i++) {
                            let tone;
                            if (toneList.count() <= toneCount) {
                                tone = this.newTone();
                                toneList.pushBack(tone);
                            }
                            else if (!instrument.getTransition().isSeamless && this.liveInputStarted) {
                                this.releaseTone(instrumentState, toneList.get(toneCount));
                                tone = this.newTone();
                                toneList.set(toneCount, tone);
                            }
                            else {
                                tone = toneList.get(toneCount);
                            }
                            toneCount++;
                            tone.pitches[0] = pitches[i];
                            tone.pitchCount = 1;
                            tone.chordSize = pitches.length;
                            tone.instrumentIndex = instrumentIndex;
                            tone.note = tone.prevNote = tone.nextNote = null;
                            tone.atNoteStart = this.liveInputStarted;
                            tone.forceContinueAtStart = false;
                            tone.forceContinueAtEnd = false;
                        }
                    }
                }
                while (toneList.count() > toneCount) {
                    this.releaseTone(instrumentState, toneList.popBack());
                }
            }
            this.liveInputStarted = false;
        }
        adjacentPatternHasCompatibleInstrumentTransition(song, channel, pattern, otherPattern, instrumentIndex, transition, chord, note, otherNote, forceContinue) {
            if (song.patternInstruments && otherPattern.instruments.indexOf(instrumentIndex) == -1) {
                if (pattern.instruments.length > 1 || otherPattern.instruments.length > 1) {
                    return null;
                }
                const otherInstrument = channel.instruments[otherPattern.instruments[0]];
                if (forceContinue) {
                    return otherInstrument.getChord();
                }
                const otherTransition = otherInstrument.getTransition();
                if (transition.includeAdjacentPatterns && otherTransition.includeAdjacentPatterns && otherTransition.slides == transition.slides) {
                    return otherInstrument.getChord();
                }
                else {
                    return null;
                }
            }
            else {
                return (forceContinue || transition.includeAdjacentPatterns) ? chord : null;
            }
        }
        static adjacentNotesHaveMatchingPitches(firstNote, secondNote) {
            if (firstNote.pitches.length != secondNote.pitches.length)
                return false;
            const firstNoteInterval = firstNote.pins[firstNote.pins.length - 1].interval;
            for (const pitch of firstNote.pitches) {
                if (secondNote.pitches.indexOf(pitch + firstNoteInterval) == -1)
                    return false;
            }
            return true;
        }
        determineCurrentActiveTones(song, channelIndex, playSong) {
            const channel = song.channels[channelIndex];
            const channelState = this.channels[channelIndex];
            const pattern = song.getPattern(channelIndex, this.bar);
            const currentPart = this.getCurrentPart();
            const currentTick = this.tick + Config.ticksPerPart * currentPart;
            let note = null;
            let prevNote = null;
            let nextNote = null;
            if (playSong && pattern != null && !channel.muted) {
                for (let i = 0; i < pattern.notes.length; i++) {
                    if (pattern.notes[i].end <= currentPart) {
                        prevNote = pattern.notes[i];
                    }
                    else if (pattern.notes[i].start <= currentPart && pattern.notes[i].end > currentPart) {
                        note = pattern.notes[i];
                    }
                    else if (pattern.notes[i].start > currentPart) {
                        nextNote = pattern.notes[i];
                        break;
                    }
                }
                if (note != null) {
                    if (prevNote != null && prevNote.end != note.start)
                        prevNote = null;
                    if (nextNote != null && nextNote.start != note.end)
                        nextNote = null;
                }
            }
            if (pattern != null && (!song.layeredInstruments || channel.instruments.length == 1 || (song.patternInstruments && pattern.instruments.length == 1))) {
                const newInstrumentIndex = song.patternInstruments ? pattern.instruments[0] : 0;
                if (channelState.singleSeamlessInstrument != null && channelState.singleSeamlessInstrument != newInstrumentIndex && channelState.singleSeamlessInstrument < channelState.instruments.length) {
                    const sourceInstrumentState = channelState.instruments[channelState.singleSeamlessInstrument];
                    const destInstrumentState = channelState.instruments[newInstrumentIndex];
                    while (sourceInstrumentState.activeTones.count() > 0) {
                        destInstrumentState.activeTones.pushFront(sourceInstrumentState.activeTones.popBack());
                    }
                }
                channelState.singleSeamlessInstrument = newInstrumentIndex;
            }
            else {
                channelState.singleSeamlessInstrument = null;
            }
            for (let instrumentIndex = 0; instrumentIndex < channel.instruments.length; instrumentIndex++) {
                const instrumentState = channelState.instruments[instrumentIndex];
                const toneList = instrumentState.activeTones;
                let toneCount = 0;
                if ((note != null) && (!song.patternInstruments || (pattern.instruments.indexOf(instrumentIndex) != -1))) {
                    const instrument = channel.instruments[instrumentIndex];
                    let prevNoteForThisInstrument = prevNote;
                    let nextNoteForThisInstrument = nextNote;
                    const partsPerBar = Config.partsPerBeat * song.beatsPerBar;
                    const transition = instrument.getTransition();
                    const chord = instrument.getChord();
                    let forceContinueAtStart = false;
                    let forceContinueAtEnd = false;
                    let tonesInPrevNote = 0;
                    let tonesInNextNote = 0;
                    if (note.start == 0) {
                        let prevPattern = (this.prevBar == null) ? null : song.getPattern(channelIndex, this.prevBar);
                        if (prevPattern != null) {
                            const lastNote = (prevPattern.notes.length <= 0) ? null : prevPattern.notes[prevPattern.notes.length - 1];
                            if (lastNote != null && lastNote.end == partsPerBar) {
                                const patternForcesContinueAtStart = note.continuesLastPattern && Synth.adjacentNotesHaveMatchingPitches(lastNote, note);
                                const chordOfCompatibleInstrument = this.adjacentPatternHasCompatibleInstrumentTransition(song, channel, pattern, prevPattern, instrumentIndex, transition, chord, note, lastNote, patternForcesContinueAtStart);
                                if (chordOfCompatibleInstrument != null) {
                                    prevNoteForThisInstrument = lastNote;
                                    tonesInPrevNote = chordOfCompatibleInstrument.singleTone ? 1 : prevNoteForThisInstrument.pitches.length;
                                    forceContinueAtStart = patternForcesContinueAtStart;
                                }
                            }
                        }
                    }
                    else if (prevNoteForThisInstrument != null) {
                        tonesInPrevNote = chord.singleTone ? 1 : prevNoteForThisInstrument.pitches.length;
                    }
                    if (note.end == partsPerBar) {
                        let nextPattern = (this.nextBar == null) ? null : song.getPattern(channelIndex, this.nextBar);
                        if (nextPattern != null) {
                            const firstNote = (nextPattern.notes.length <= 0) ? null : nextPattern.notes[0];
                            if (firstNote != null && firstNote.start == 0) {
                                const nextPatternForcesContinueAtStart = firstNote.continuesLastPattern && Synth.adjacentNotesHaveMatchingPitches(note, firstNote);
                                const chordOfCompatibleInstrument = this.adjacentPatternHasCompatibleInstrumentTransition(song, channel, pattern, nextPattern, instrumentIndex, transition, chord, note, firstNote, nextPatternForcesContinueAtStart);
                                if (chordOfCompatibleInstrument != null) {
                                    nextNoteForThisInstrument = firstNote;
                                    tonesInNextNote = chordOfCompatibleInstrument.singleTone ? 1 : nextNoteForThisInstrument.pitches.length;
                                    forceContinueAtEnd = nextPatternForcesContinueAtStart;
                                }
                            }
                        }
                    }
                    else if (nextNoteForThisInstrument != null) {
                        tonesInNextNote = chord.singleTone ? 1 : nextNoteForThisInstrument.pitches.length;
                    }
                    if (chord.singleTone) {
                        const atNoteStart = (Config.ticksPerPart * note.start == currentTick) && this.isAtStartOfTick;
                        let tone;
                        if (toneList.count() <= toneCount) {
                            tone = this.newTone();
                            toneList.pushBack(tone);
                        }
                        else if (atNoteStart && ((!transition.isSeamless && !forceContinueAtStart) || prevNoteForThisInstrument == null)) {
                            const oldTone = toneList.get(toneCount);
                            if (oldTone.isOnLastTick) {
                                this.freeTone(oldTone);
                            }
                            else {
                                this.releaseTone(instrumentState, oldTone);
                            }
                            tone = this.newTone();
                            toneList.set(toneCount, tone);
                        }
                        else {
                            tone = toneList.get(toneCount);
                        }
                        toneCount++;
                        for (let i = 0; i < note.pitches.length; i++) {
                            tone.pitches[i] = note.pitches[i];
                        }
                        tone.pitchCount = note.pitches.length;
                        tone.chordSize = 1;
                        tone.instrumentIndex = instrumentIndex;
                        tone.note = note;
                        tone.noteStartPart = note.start;
                        tone.noteEndPart = note.end;
                        tone.prevNote = prevNoteForThisInstrument;
                        tone.nextNote = nextNoteForThisInstrument;
                        tone.prevNotePitchIndex = 0;
                        tone.nextNotePitchIndex = 0;
                        tone.atNoteStart = atNoteStart;
                        tone.passedEndOfNote = false;
                        tone.forceContinueAtStart = forceContinueAtStart;
                        tone.forceContinueAtEnd = forceContinueAtEnd;
                    }
                    else {
                        const transition = instrument.getTransition();
                        if (((transition.isSeamless && !transition.slides && chord.strumParts == 0) || forceContinueAtStart) && (Config.ticksPerPart * note.start == currentTick) && this.isAtStartOfTick && prevNoteForThisInstrument != null) {
                            for (let i = 0; i < toneList.count(); i++) {
                                const tone = toneList.get(i);
                                const pitch = tone.pitches[0] + tone.lastInterval;
                                for (let j = 0; j < note.pitches.length; j++) {
                                    if (note.pitches[j] == pitch) {
                                        this.tempMatchedPitchTones[j] = tone;
                                        toneList.remove(i);
                                        i--;
                                        break;
                                    }
                                }
                            }
                            while (toneList.count() > 0) {
                                const tone = toneList.popFront();
                                for (let j = 0; j < this.tempMatchedPitchTones.length; j++) {
                                    if (this.tempMatchedPitchTones[j] == null) {
                                        this.tempMatchedPitchTones[j] = tone;
                                        break;
                                    }
                                }
                            }
                        }
                        let strumOffsetParts = 0;
                        for (let i = 0; i < note.pitches.length; i++) {
                            let prevNoteForThisTone = (tonesInPrevNote > i) ? prevNoteForThisInstrument : null;
                            let noteForThisTone = note;
                            let nextNoteForThisTone = (tonesInNextNote > i) ? nextNoteForThisInstrument : null;
                            let noteStartPart = noteForThisTone.start + strumOffsetParts;
                            let passedEndOfNote = false;
                            if (noteStartPart > currentPart) {
                                if (toneList.count() > i && (transition.isSeamless || forceContinueAtStart) && prevNoteForThisTone != null) {
                                    nextNoteForThisTone = noteForThisTone;
                                    noteForThisTone = prevNoteForThisTone;
                                    prevNoteForThisTone = null;
                                    noteStartPart = noteForThisTone.start + strumOffsetParts;
                                    passedEndOfNote = true;
                                }
                                else {
                                    break;
                                }
                            }
                            let noteEndPart = noteForThisTone.end;
                            if ((transition.isSeamless || forceContinueAtStart) && nextNoteForThisTone != null) {
                                noteEndPart = Math.min(Config.partsPerBeat * this.song.beatsPerBar, noteEndPart + strumOffsetParts);
                            }
                            if ((!transition.continues && !forceContinueAtStart) || prevNoteForThisTone == null) {
                                strumOffsetParts += chord.strumParts;
                            }
                            const atNoteStart = (Config.ticksPerPart * noteStartPart == currentTick) && this.isAtStartOfTick;
                            let tone;
                            if (this.tempMatchedPitchTones[toneCount] != null) {
                                tone = this.tempMatchedPitchTones[toneCount];
                                this.tempMatchedPitchTones[toneCount] = null;
                                toneList.pushBack(tone);
                            }
                            else if (toneList.count() <= toneCount) {
                                tone = this.newTone();
                                toneList.pushBack(tone);
                            }
                            else if (atNoteStart && ((!transition.isSeamless && !forceContinueAtStart) || prevNoteForThisTone == null)) {
                                const oldTone = toneList.get(toneCount);
                                if (oldTone.isOnLastTick) {
                                    this.freeTone(oldTone);
                                }
                                else {
                                    this.releaseTone(instrumentState, oldTone);
                                }
                                tone = this.newTone();
                                toneList.set(toneCount, tone);
                            }
                            else {
                                tone = toneList.get(toneCount);
                            }
                            toneCount++;
                            tone.pitches[0] = noteForThisTone.pitches[i];
                            tone.pitchCount = 1;
                            tone.chordSize = noteForThisTone.pitches.length;
                            tone.instrumentIndex = instrumentIndex;
                            tone.note = noteForThisTone;
                            tone.noteStartPart = noteStartPart;
                            tone.noteEndPart = noteEndPart;
                            tone.prevNote = prevNoteForThisTone;
                            tone.nextNote = nextNoteForThisTone;
                            tone.prevNotePitchIndex = i;
                            tone.nextNotePitchIndex = i;
                            tone.atNoteStart = atNoteStart;
                            tone.passedEndOfNote = passedEndOfNote;
                            tone.forceContinueAtStart = forceContinueAtStart && prevNoteForThisTone != null;
                            tone.forceContinueAtEnd = forceContinueAtEnd && nextNoteForThisTone != null;
                        }
                    }
                }
                while (toneList.count() > toneCount) {
                    const tone = toneList.popBack();
                    const channel = song.channels[channelIndex];
                    if (tone.instrumentIndex < channel.instruments.length && !tone.isOnLastTick) {
                        const instrumentState = this.channels[channelIndex].instruments[tone.instrumentIndex];
                        this.releaseTone(instrumentState, tone);
                    }
                    else {
                        this.freeTone(tone);
                    }
                }
                for (let i = toneCount; i < this.tempMatchedPitchTones.length; i++) {
                    const oldTone = this.tempMatchedPitchTones[i];
                    if (oldTone != null) {
                        if (oldTone.isOnLastTick) {
                            this.freeTone(oldTone);
                        }
                        else {
                            this.releaseTone(instrumentState, oldTone);
                        }
                        this.tempMatchedPitchTones[i] = null;
                    }
                }
            }
        }
        playTone(song, channelIndex, samplesPerTick, bufferIndex, runLength, tone, released, shouldFadeOutFast) {
            const channel = song.channels[channelIndex];
            const channelState = this.channels[channelIndex];
            const instrument = channel.instruments[tone.instrumentIndex];
            const instrumentState = channelState.instruments[tone.instrumentIndex];
            instrumentState.awake = true;
            instrumentState.tonesAddedInThisTick = true;
            if (!instrumentState.computed) {
                instrumentState.compute(this, instrument, samplesPerTick, runLength, tone);
            }
            Synth.computeTone(this, song, channelIndex, samplesPerTick, runLength, tone, released, shouldFadeOutFast);
            const synthesizer = Synth.getInstrumentSynthFunction(instrument);
            synthesizer(this, bufferIndex, runLength, tone, instrument);
            tone.envelopeComputer.clearEnvelopes(instrument);
        }
        static computeChordExpression(chordSize) {
            return 1.0 / ((chordSize - 1) * 0.25 + 1.0);
        }
        static computeTone(synth, song, channelIndex, samplesPerTick, runLength, tone, released, shouldFadeOutFast) {
            const channel = song.channels[channelIndex];
            const instrument = channel.instruments[tone.instrumentIndex];
            const transition = instrument.getTransition();
            const chord = instrument.getChord();
            const chordExpression = chord.singleTone ? 1.0 : Synth.computeChordExpression(tone.chordSize);
            const isNoiseChannel = song.getChannelIsNoise(channelIndex);
            const intervalScale = isNoiseChannel ? Config.noiseInterval : 1;
            const secondsPerPart = Config.ticksPerPart * samplesPerTick / synth.samplesPerSecond;
            const sampleTime = 1.0 / synth.samplesPerSecond;
            const beatsPerPart = 1.0 / Config.partsPerBeat;
            const tickSampleCountdown = synth.tickSampleCountdown;
            const startRatio = 1.0 - (tickSampleCountdown) / samplesPerTick;
            const endRatio = 1.0 - (tickSampleCountdown - runLength) / samplesPerTick;
            const ticksIntoBar = synth.getTicksIntoBar();
            const partTimeTickStart = (ticksIntoBar) / Config.ticksPerPart;
            const partTimeTickEnd = (ticksIntoBar + 1) / Config.ticksPerPart;
            const partTimeStart = partTimeTickStart + (partTimeTickEnd - partTimeTickStart) * startRatio;
            const partTimeEnd = partTimeTickStart + (partTimeTickEnd - partTimeTickStart) * endRatio;
            const currentPart = synth.getCurrentPart();
            tone.specialIntervalMult = 1.0;
            tone.specialIntervalExpressionMult = 1.0;
            let toneIsOnLastTick = shouldFadeOutFast;
            let intervalStart = 0.0;
            let intervalEnd = 0.0;
            let transitionExpressionStart = 1.0;
            let transitionExpressionEnd = 1.0;
            let chordExpressionStart = chordExpression;
            let chordExpressionEnd = chordExpression;
            let expressionReferencePitch = 16;
            let basePitch = Config.keys[song.key].basePitch;
            let baseExpression = 1.0;
            let pitchDamping = 48;
            if (instrument.type == 3) {
                baseExpression = Config.spectrumBaseExpression;
                if (isNoiseChannel) {
                    basePitch = Config.spectrumBasePitch;
                    baseExpression *= 2.0;
                }
                expressionReferencePitch = Config.spectrumBasePitch;
                pitchDamping = 28;
            }
            else if (instrument.type == 4) {
                basePitch = Config.spectrumBasePitch;
                baseExpression = Config.drumsetBaseExpression;
                expressionReferencePitch = basePitch;
            }
            else if (instrument.type == 2) {
                basePitch = Config.chipNoises[instrument.chipNoise].basePitch;
                baseExpression = Config.noiseBaseExpression;
                expressionReferencePitch = basePitch;
                pitchDamping = Config.chipNoises[instrument.chipNoise].isSoft ? 24.0 : 60.0;
            }
            else if (instrument.type == 1) {
                baseExpression = Config.fmBaseExpression;
            }
            else if (instrument.type == 0) {
                baseExpression = Config.chipBaseExpression;
            }
            else if (instrument.type == 5) {
                baseExpression = Config.harmonicsBaseExpression;
            }
            else if (instrument.type == 6) {
                baseExpression = Config.pwmBaseExpression;
            }
            else if (instrument.type == 7) {
                baseExpression = Config.pickedStringBaseExpression;
            }
            else {
                throw new Error("Unknown instrument type in computeTone.");
            }
            if ((tone.atNoteStart && !transition.isSeamless && !tone.forceContinueAtStart) || tone.freshlyAllocated) {
                tone.reset();
            }
            tone.freshlyAllocated = false;
            const maxWaves = Math.max(Config.maxChordSize, Config.operatorCount);
            for (let i = 0; i < maxWaves; i++) {
                tone.phaseDeltas[i] = 0.0;
                tone.expressionStarts[i] = 0.0;
                tone.expressionDeltas[i] = 0.0;
                tone.phaseDeltaScales[i] = 0.0;
            }
            if (released) {
                const startTicksSinceReleased = tone.ticksSinceReleased + startRatio;
                const endTicksSinceReleased = tone.ticksSinceReleased + endRatio;
                intervalStart = intervalEnd = tone.lastInterval;
                const fadeOutTicks = Math.abs(instrument.getFadeOutTicks());
                transitionExpressionStart = Synth.noteSizeToVolumeMult((1.0 - startTicksSinceReleased / fadeOutTicks) * Config.noteSizeMax);
                transitionExpressionEnd = Synth.noteSizeToVolumeMult((1.0 - endTicksSinceReleased / fadeOutTicks) * Config.noteSizeMax);
                if (shouldFadeOutFast) {
                    transitionExpressionStart *= 1.0 - startRatio;
                    transitionExpressionEnd *= 1.0 - endRatio;
                }
                if (tone.ticksSinceReleased + 1 >= fadeOutTicks)
                    toneIsOnLastTick = true;
            }
            else if (tone.note == null) {
                transitionExpressionStart = transitionExpressionEnd = 1;
                tone.lastInterval = 0;
                tone.ticksSinceReleased = 0;
                tone.liveInputSamplesHeld += runLength;
            }
            else {
                const note = tone.note;
                const nextNote = tone.nextNote;
                const noteStartPart = tone.noteStartPart;
                const noteEndPart = tone.noteEndPart;
                const endPinIndex = note.getEndPinIndex(currentPart);
                const startPin = note.pins[endPinIndex - 1];
                const endPin = note.pins[endPinIndex];
                const noteStartTick = noteStartPart * Config.ticksPerPart;
                const noteEndTick = noteEndPart * Config.ticksPerPart;
                const pinStart = (note.start + startPin.time) * Config.ticksPerPart;
                const pinEnd = (note.start + endPin.time) * Config.ticksPerPart;
                tone.ticksSinceReleased = 0;
                const tickTimeStart = currentPart * Config.ticksPerPart + synth.tick;
                const tickTimeEnd = currentPart * Config.ticksPerPart + synth.tick + 1;
                const noteTicksPassedTickStart = tickTimeStart - noteStartTick;
                const noteTicksPassedTickEnd = tickTimeEnd - noteStartTick;
                const pinRatioStart = Math.min(1.0, (tickTimeStart - pinStart) / (pinEnd - pinStart));
                const pinRatioEnd = Math.min(1.0, (tickTimeEnd - pinStart) / (pinEnd - pinStart));
                let transitionExpressionTickStart = 1.0;
                let transitionExpressionTickEnd = 1.0;
                let intervalTickStart = startPin.interval + (endPin.interval - startPin.interval) * pinRatioStart;
                let intervalTickEnd = startPin.interval + (endPin.interval - startPin.interval) * pinRatioEnd;
                tone.lastInterval = intervalTickEnd;
                if ((!transition.isSeamless && !tone.forceContinueAtEnd) || nextNote == null) {
                    const fadeOutTicks = -instrument.getFadeOutTicks();
                    if (fadeOutTicks > 0.0) {
                        const noteLengthTicks = noteEndTick - noteStartTick;
                        transitionExpressionTickStart *= Math.min(1.0, (noteLengthTicks - noteTicksPassedTickStart) / fadeOutTicks);
                        transitionExpressionTickEnd *= Math.min(1.0, (noteLengthTicks - noteTicksPassedTickEnd) / fadeOutTicks);
                        if (tickTimeEnd >= noteStartTick + noteLengthTicks)
                            toneIsOnLastTick = true;
                    }
                }
                intervalStart = intervalTickStart + (intervalTickEnd - intervalTickStart) * startRatio;
                intervalEnd = intervalTickStart + (intervalTickEnd - intervalTickStart) * endRatio;
                transitionExpressionStart = transitionExpressionTickStart + (transitionExpressionTickEnd - transitionExpressionTickStart) * startRatio;
                transitionExpressionEnd = transitionExpressionTickStart + (transitionExpressionTickEnd - transitionExpressionTickStart) * endRatio;
            }
            tone.isOnLastTick = toneIsOnLastTick;
            const envelopeComputer = tone.envelopeComputer;
            envelopeComputer.computeEnvelopes(instrument, currentPart, Config.ticksPerPart * partTimeStart, Config.ticksPerPart * partTimeEnd, secondsPerPart * (partTimeEnd - partTimeStart), tone);
            const envelopeStarts = tone.envelopeComputer.envelopeStarts;
            const envelopeEnds = tone.envelopeComputer.envelopeEnds;
            if (tone.note != null && transition.slides) {
                const prevNote = tone.prevNote;
                const nextNote = tone.nextNote;
                if (prevNote != null) {
                    const intervalDiff = prevNote.pitches[tone.prevNotePitchIndex] + prevNote.pins[prevNote.pins.length - 1].interval - tone.pitches[0];
                    if (envelopeComputer.prevSlideStart)
                        intervalStart += intervalDiff * envelopeComputer.prevSlideRatioStart;
                    if (envelopeComputer.prevSlideEnd)
                        intervalEnd += intervalDiff * envelopeComputer.prevSlideRatioEnd;
                    if (!chord.singleTone) {
                        const chordSizeDiff = prevNote.pitches.length - tone.chordSize;
                        if (envelopeComputer.prevSlideStart)
                            chordExpressionStart = Synth.computeChordExpression(tone.chordSize + chordSizeDiff * envelopeComputer.prevSlideRatioStart);
                        if (envelopeComputer.prevSlideEnd)
                            chordExpressionEnd = Synth.computeChordExpression(tone.chordSize + chordSizeDiff * envelopeComputer.prevSlideRatioEnd);
                    }
                }
                if (nextNote != null) {
                    const intervalDiff = nextNote.pitches[tone.nextNotePitchIndex] - (tone.pitches[0] + tone.note.pins[tone.note.pins.length - 1].interval);
                    if (envelopeComputer.nextSlideStart)
                        intervalStart += intervalDiff * envelopeComputer.nextSlideRatioStart;
                    if (envelopeComputer.nextSlideEnd)
                        intervalEnd += intervalDiff * envelopeComputer.nextSlideRatioEnd;
                    if (!chord.singleTone) {
                        const chordSizeDiff = nextNote.pitches.length - tone.chordSize;
                        if (envelopeComputer.nextSlideStart)
                            chordExpressionStart = Synth.computeChordExpression(tone.chordSize + chordSizeDiff * envelopeComputer.nextSlideRatioStart);
                        if (envelopeComputer.nextSlideEnd)
                            chordExpressionEnd = Synth.computeChordExpression(tone.chordSize + chordSizeDiff * envelopeComputer.nextSlideRatioEnd);
                    }
                }
            }
            if (effectsIncludePitchShift(instrument.effects)) {
                const pitchShift = Config.justIntonationSemitones[instrument.pitchShift] / intervalScale;
                const envelopeStart = envelopeStarts[14];
                const envelopeEnd = envelopeEnds[14];
                intervalStart += pitchShift * envelopeStart;
                intervalEnd += pitchShift * envelopeEnd;
            }
            if (effectsIncludeDetune(instrument.effects)) {
                const envelopeStart = envelopeStarts[15];
                const envelopeEnd = envelopeEnds[15];
                intervalStart += Synth.detuneToCents((instrument.detune - Config.detuneCenter) * envelopeStart) * Config.pitchesPerOctave / (12.0 * 100.0);
                intervalEnd += Synth.detuneToCents((instrument.detune - Config.detuneCenter) * envelopeEnd) * Config.pitchesPerOctave / (12.0 * 100.0);
            }
            if (effectsIncludeVibrato(instrument.effects)) {
                const delayTicks = Config.vibratos[instrument.vibrato].delayTicks;
                const vibratoAmplitude = Config.vibratos[instrument.vibrato].amplitude;
                let vibratoStart;
                if (tone.prevVibrato != null) {
                    vibratoStart = tone.prevVibrato;
                }
                else {
                    let lfoStart = Synth.getLFOAmplitude(instrument, secondsPerPart * partTimeStart);
                    const vibratoDepthEnvelopeStart = envelopeStarts[16];
                    vibratoStart = vibratoAmplitude * lfoStart * vibratoDepthEnvelopeStart;
                    if (delayTicks > 0.0) {
                        const ticksUntilVibratoStart = delayTicks - envelopeComputer.noteTicksStart;
                        vibratoStart *= Math.max(0.0, Math.min(1.0, 1.0 - ticksUntilVibratoStart / 2.0));
                    }
                }
                let lfoEnd = Synth.getLFOAmplitude(instrument, secondsPerPart * partTimeEnd);
                const vibratoDepthEnvelopeEnd = envelopeEnds[16];
                let vibratoEnd = vibratoAmplitude * lfoEnd * vibratoDepthEnvelopeEnd;
                if (delayTicks > 0.0) {
                    const ticksUntilVibratoEnd = delayTicks - envelopeComputer.noteTicksEnd;
                    vibratoEnd *= Math.max(0.0, Math.min(1.0, 1.0 - ticksUntilVibratoEnd / 2.0));
                }
                tone.prevVibrato = vibratoEnd;
                intervalStart += vibratoStart;
                intervalEnd += vibratoEnd;
            }
            if ((!transition.isSeamless && !tone.forceContinueAtStart) || tone.prevNote == null) {
                const fadeInSeconds = instrument.getFadeInSeconds();
                if (fadeInSeconds > 0.0) {
                    transitionExpressionStart *= Math.min(1.0, envelopeComputer.noteSecondsStart / fadeInSeconds);
                    transitionExpressionEnd *= Math.min(1.0, envelopeComputer.noteSecondsEnd / fadeInSeconds);
                }
            }
            if (instrument.type == 4 && tone.drumsetPitch == null) {
                tone.drumsetPitch = tone.pitches[0];
                if (tone.note != null)
                    tone.drumsetPitch += tone.note.pickMainInterval();
                tone.drumsetPitch = Math.max(0, Math.min(Config.drumCount - 1, tone.drumsetPitch));
            }
            let noteFilterExpression = envelopeComputer.lowpassCutoffDecayVolumeCompensation;
            if (!effectsIncludeNoteFilter(instrument.effects)) {
                tone.noteFilterCount = 0;
            }
            else {
                const noteFilterSettings = instrument.noteFilter;
                const noteAllFreqsEnvelopeStart = envelopeStarts[1];
                const noteAllFreqsEnvelopeEnd = envelopeEnds[1];
                for (let i = 0; i < noteFilterSettings.controlPointCount; i++) {
                    const noteFreqEnvelopeStart = envelopeStarts[17 + i];
                    const noteFreqEnvelopeEnd = envelopeEnds[17 + i];
                    const notePeakEnvelopeStart = envelopeStarts[25 + i];
                    const notePeakEnvelopeEnd = envelopeEnds[25 + i];
                    const point = noteFilterSettings.controlPoints[i];
                    point.toCoefficients(Synth.tempFilterStartCoefficients, synth.samplesPerSecond, noteAllFreqsEnvelopeStart * noteFreqEnvelopeStart, notePeakEnvelopeStart);
                    point.toCoefficients(Synth.tempFilterEndCoefficients, synth.samplesPerSecond, noteAllFreqsEnvelopeEnd * noteFreqEnvelopeEnd, notePeakEnvelopeEnd);
                    if (tone.noteFilters.length <= i)
                        tone.noteFilters[i] = new DynamicBiquadFilter();
                    tone.noteFilters[i].loadCoefficientsWithGradient(Synth.tempFilterStartCoefficients, Synth.tempFilterEndCoefficients, 1.0 / runLength, point.type == 0);
                    noteFilterExpression *= point.getVolumeCompensationMult();
                }
                tone.noteFilterCount = noteFilterSettings.controlPointCount;
            }
            if (instrument.type == 4) {
                const drumsetFilterEnvelope = instrument.getDrumsetEnvelope(tone.drumsetPitch);
                noteFilterExpression *= EnvelopeComputer.getLowpassCutoffDecayVolumeCompensation(drumsetFilterEnvelope);
                let drumsetFilterEnvelopeStart = EnvelopeComputer.computeEnvelope(drumsetFilterEnvelope, envelopeComputer.noteSecondsStart, beatsPerPart * partTimeStart, envelopeComputer.noteSizeStart);
                let drumsetFilterEnvelopeEnd = EnvelopeComputer.computeEnvelope(drumsetFilterEnvelope, envelopeComputer.noteSecondsEnd, beatsPerPart * partTimeEnd, envelopeComputer.noteSizeEnd);
                if (envelopeComputer.prevSlideStart) {
                    const other = EnvelopeComputer.computeEnvelope(drumsetFilterEnvelope, envelopeComputer.prevNoteSecondsStart, beatsPerPart * partTimeStart, envelopeComputer.prevNoteSize);
                    drumsetFilterEnvelopeStart += (other - drumsetFilterEnvelopeStart) * envelopeComputer.prevSlideRatioStart;
                }
                if (envelopeComputer.prevSlideEnd) {
                    const other = EnvelopeComputer.computeEnvelope(drumsetFilterEnvelope, envelopeComputer.prevNoteSecondsEnd, beatsPerPart * partTimeEnd, envelopeComputer.prevNoteSize);
                    drumsetFilterEnvelopeEnd += (other - drumsetFilterEnvelopeEnd) * envelopeComputer.prevSlideRatioEnd;
                }
                if (envelopeComputer.nextSlideStart) {
                    const other = EnvelopeComputer.computeEnvelope(drumsetFilterEnvelope, 0.0, beatsPerPart * partTimeStart, envelopeComputer.nextNoteSize);
                    drumsetFilterEnvelopeStart += (other - drumsetFilterEnvelopeStart) * envelopeComputer.nextSlideRatioStart;
                }
                if (envelopeComputer.nextSlideEnd) {
                    const other = EnvelopeComputer.computeEnvelope(drumsetFilterEnvelope, 0.0, beatsPerPart * partTimeEnd, envelopeComputer.nextNoteSize);
                    drumsetFilterEnvelopeEnd += (other - drumsetFilterEnvelopeEnd) * envelopeComputer.nextSlideRatioEnd;
                }
                const point = synth.tempDrumSetControlPoint;
                point.type = 0;
                point.gain = FilterControlPoint.getRoundedSettingValueFromLinearGain(0.5);
                point.freq = FilterControlPoint.getRoundedSettingValueFromHz(8000.0);
                point.toCoefficients(Synth.tempFilterStartCoefficients, synth.samplesPerSecond, drumsetFilterEnvelopeStart * (1.0 + drumsetFilterEnvelopeStart), 1.0);
                point.toCoefficients(Synth.tempFilterEndCoefficients, synth.samplesPerSecond, drumsetFilterEnvelopeEnd * (1.0 + drumsetFilterEnvelopeEnd), 1.0);
                if (tone.noteFilters.length == tone.noteFilterCount)
                    tone.noteFilters[tone.noteFilterCount] = new DynamicBiquadFilter();
                tone.noteFilters[tone.noteFilterCount].loadCoefficientsWithGradient(Synth.tempFilterStartCoefficients, Synth.tempFilterEndCoefficients, 1.0 / runLength, true);
                tone.noteFilterCount++;
            }
            noteFilterExpression = Math.min(3.0, noteFilterExpression);
            if (instrument.type == 1) {
                let sineExpressionBoost = 1.0;
                let totalCarrierExpression = 0.0;
                let arpeggioInterval = 0;
                const arpeggiates = chord.arpeggiates;
                if (tone.pitchCount > 1 && arpeggiates) {
                    const arpeggio = Math.floor((synth.tick + synth.part * Config.ticksPerPart) / Config.rhythms[song.rhythm].ticksPerArpeggio);
                    arpeggioInterval = tone.pitches[getArpeggioPitchIndex(tone.pitchCount, song.rhythm, arpeggio)] - tone.pitches[0];
                }
                const carrierCount = Config.algorithms[instrument.algorithm].carrierCount;
                for (let i = 0; i < Config.operatorCount; i++) {
                    const associatedCarrierIndex = Config.algorithms[instrument.algorithm].associatedCarrier[i] - 1;
                    const pitch = tone.pitches[arpeggiates ? 0 : ((i < tone.pitchCount) ? i : ((associatedCarrierIndex < tone.pitchCount) ? associatedCarrierIndex : 0))];
                    const freqMult = Config.operatorFrequencies[instrument.operators[i].frequency].mult;
                    const interval = Config.operatorCarrierInterval[associatedCarrierIndex] + arpeggioInterval;
                    const pitchStart = basePitch + (pitch + intervalStart) * intervalScale + interval;
                    const pitchEnd = basePitch + (pitch + intervalEnd) * intervalScale + interval;
                    const baseFreqStart = Instrument.frequencyFromPitch(pitchStart);
                    const baseFreqEnd = Instrument.frequencyFromPitch(pitchEnd);
                    const hzOffset = Config.operatorFrequencies[instrument.operators[i].frequency].hzOffset;
                    const targetFreqStart = freqMult * baseFreqStart + hzOffset;
                    const targetFreqEnd = freqMult * baseFreqEnd + hzOffset;
                    const freqEnvelopeStart = envelopeStarts[5 + i];
                    const freqEnvelopeEnd = envelopeEnds[5 + i];
                    let freqStart;
                    let freqEnd;
                    if (freqEnvelopeStart != 1.0 || freqEnvelopeEnd != 1.0) {
                        freqStart = Math.pow(2.0, Math.log2(targetFreqStart / baseFreqStart) * freqEnvelopeStart) * baseFreqStart;
                        freqEnd = Math.pow(2.0, Math.log2(targetFreqEnd / baseFreqEnd) * freqEnvelopeEnd) * baseFreqEnd;
                    }
                    else {
                        freqStart = targetFreqStart;
                        freqEnd = targetFreqEnd;
                    }
                    tone.phaseDeltas[i] = freqStart * sampleTime * Config.sineWaveLength;
                    tone.phaseDeltaScales[i] = Math.pow(freqEnd / freqStart, 1.0 / runLength);
                    const amplitudeCurve = Synth.operatorAmplitudeCurve(instrument.operators[i].amplitude);
                    const amplitudeMult = amplitudeCurve * Config.operatorFrequencies[instrument.operators[i].frequency].amplitudeSign;
                    let expressionStart = amplitudeMult;
                    let expressionEnd = amplitudeMult;
                    if (i < carrierCount) {
                        const pitchExpressionStart = Math.pow(2.0, -(pitchStart - expressionReferencePitch) / pitchDamping);
                        const pitchExpressionEnd = Math.pow(2.0, -(pitchEnd - expressionReferencePitch) / pitchDamping);
                        expressionStart *= baseExpression * pitchExpressionStart * transitionExpressionStart * noteFilterExpression * chordExpressionStart;
                        expressionEnd *= baseExpression * pitchExpressionEnd * transitionExpressionEnd * noteFilterExpression * chordExpressionEnd;
                        expressionStart *= envelopeStarts[0];
                        expressionEnd *= envelopeEnds[0];
                        totalCarrierExpression += amplitudeCurve;
                    }
                    else {
                        expressionStart *= Config.sineWaveLength * 1.5;
                        expressionEnd *= Config.sineWaveLength * 1.5;
                        sineExpressionBoost *= 1.0 - Math.min(1.0, instrument.operators[i].amplitude / 15);
                    }
                    expressionStart *= envelopeStarts[9 + i];
                    expressionEnd *= envelopeEnds[9 + i];
                    tone.expressionStarts[i] = expressionStart;
                    tone.expressionDeltas[i] = (expressionEnd - expressionStart) / runLength;
                }
                sineExpressionBoost *= (Math.pow(2.0, (2.0 - 1.4 * instrument.feedbackAmplitude / 15.0)) - 1.0) / 3.0;
                sineExpressionBoost *= 1.0 - Math.min(1.0, Math.max(0.0, totalCarrierExpression - 1) / 2.0);
                sineExpressionBoost = 1.0 + sineExpressionBoost * 3.0;
                for (let i = 0; i < carrierCount; i++) {
                    tone.expressionStarts[i] *= sineExpressionBoost;
                    tone.expressionDeltas[i] *= sineExpressionBoost;
                }
                const feedbackAmplitude = Config.sineWaveLength * 0.3 * instrument.feedbackAmplitude / 15.0;
                let feedbackStart = feedbackAmplitude * envelopeStarts[13];
                let feedbackEnd = feedbackAmplitude * envelopeEnds[13];
                tone.feedbackMult = feedbackStart;
                tone.feedbackDelta = (feedbackEnd - tone.feedbackMult) / runLength;
            }
            else {
                const basePhaseDeltaScale = Math.pow(2.0, ((intervalEnd - intervalStart) * intervalScale / 12.0) / runLength);
                let pitch = tone.pitches[0];
                if (tone.pitchCount > 1 && (chord.arpeggiates || chord.customInterval)) {
                    const arpeggio = Math.floor((synth.tick + synth.part * Config.ticksPerPart) / Config.rhythms[song.rhythm].ticksPerArpeggio);
                    if (chord.customInterval) {
                        const intervalOffset = tone.pitches[1 + getArpeggioPitchIndex(tone.pitchCount - 1, song.rhythm, arpeggio)] - tone.pitches[0];
                        tone.specialIntervalMult = Math.pow(2.0, intervalOffset / 12.0);
                        tone.specialIntervalExpressionMult = Math.pow(2.0, -intervalOffset / pitchDamping);
                    }
                    else {
                        pitch = tone.pitches[getArpeggioPitchIndex(tone.pitchCount, song.rhythm, arpeggio)];
                    }
                }
                const startPitch = basePitch + (pitch + intervalStart) * intervalScale;
                const endPitch = basePitch + (pitch + intervalEnd) * intervalScale;
                const pitchExpressionStart = Math.pow(2.0, -(startPitch - expressionReferencePitch) / pitchDamping);
                const pitchExpressionEnd = Math.pow(2.0, -(endPitch - expressionReferencePitch) / pitchDamping);
                let settingsExpressionMult = baseExpression * noteFilterExpression;
                if (instrument.type == 2) {
                    settingsExpressionMult *= Config.chipNoises[instrument.chipNoise].expression;
                }
                if (instrument.type == 0) {
                    settingsExpressionMult *= Config.chipWaves[instrument.chipWave].expression;
                }
                if (instrument.type == 6) {
                    const basePulseWidth = getPulseWidthRatio(instrument.pulseWidth);
                    const pulseWidthStart = basePulseWidth * envelopeStarts[2];
                    const pulseWidthEnd = basePulseWidth * envelopeEnds[2];
                    tone.pulseWidth = pulseWidthStart;
                    tone.pulseWidthDelta = (pulseWidthEnd - pulseWidthStart) / runLength;
                }
                if (instrument.type == 7) {
                    settingsExpressionMult *= Math.pow(2.0, 0.7 * (1.0 - instrument.stringSustain / (Config.stringSustainRange - 1)));
                    const unison = Config.unisons[instrument.unison];
                    for (let i = tone.pickedStrings.length; i < unison.voices; i++) {
                        tone.pickedStrings[i] = new PickedString();
                    }
                    if (tone.atNoteStart && !transition.continues && !tone.forceContinueAtStart) {
                        for (const pickedString of tone.pickedStrings) {
                            pickedString.delayIndex = -1;
                        }
                    }
                }
                const startFreq = Instrument.frequencyFromPitch(startPitch);
                if (instrument.type == 0 || instrument.type == 5 || instrument.type == 7) {
                    const unison = Config.unisons[instrument.unison];
                    const voiceCountExpression = (instrument.type == 7) ? 1 : unison.voices / 2.0;
                    settingsExpressionMult *= unison.expression * voiceCountExpression;
                    const unisonEnvelopeStart = envelopeStarts[4];
                    const unisonEnvelopeEnd = envelopeEnds[4];
                    const unisonAStart = Math.pow(2.0, (unison.offset + unison.spread) * unisonEnvelopeStart / 12.0);
                    const unisonAEnd = Math.pow(2.0, (unison.offset + unison.spread) * unisonEnvelopeEnd / 12.0);
                    const unisonBStart = Math.pow(2.0, (unison.offset - unison.spread) * unisonEnvelopeStart / 12.0) * tone.specialIntervalMult;
                    const unisonBEnd = Math.pow(2.0, (unison.offset - unison.spread) * unisonEnvelopeEnd / 12.0) * tone.specialIntervalMult;
                    tone.phaseDeltas[0] = startFreq * sampleTime * unisonAStart;
                    tone.phaseDeltas[1] = startFreq * sampleTime * unisonBStart;
                    tone.phaseDeltaScales[0] = basePhaseDeltaScale * Math.pow(unisonAEnd / unisonAStart, 1.0 / runLength);
                    tone.phaseDeltaScales[1] = basePhaseDeltaScale * Math.pow(unisonBEnd / unisonBStart, 1.0 / runLength);
                }
                else {
                    tone.phaseDeltas[0] = startFreq * sampleTime;
                    tone.phaseDeltaScales[0] = basePhaseDeltaScale;
                }
                let expressionStart = settingsExpressionMult * transitionExpressionStart * chordExpressionStart * pitchExpressionStart * envelopeStarts[0];
                let expressionEnd = settingsExpressionMult * transitionExpressionEnd * chordExpressionEnd * pitchExpressionEnd * envelopeEnds[0];
                tone.expressionStarts[0] = expressionStart;
                tone.expressionDeltas[0] = (expressionEnd - expressionStart) / runLength;
            }
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
                    Synth.fmSynthFunctionCache[fingerprint] = new Function("synth", "bufferIndex", "runLength", "tone", "instrument", synthSource.join("\n"));
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
            else if (instrument.type == 7) {
                return Synth.pickedStringSynth;
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
        static chipSynth(synth, bufferIndex, runLength, tone, instrument) {
            const data = synth.tempMonoInstrumentSampleBuffer;
            const wave = Config.chipWaves[instrument.chipWave].samples;
            const waveLength = wave.length - 1;
            const unisonSign = tone.specialIntervalExpressionMult * Config.unisons[instrument.unison].sign;
            if (instrument.unison == 0 && !instrument.getChord().customInterval)
                tone.phases[1] = tone.phases[0];
            let phaseDeltaA = tone.phaseDeltas[0] * waveLength;
            let phaseDeltaB = tone.phaseDeltas[1] * waveLength;
            const phaseDeltaScaleA = +tone.phaseDeltaScales[0];
            const phaseDeltaScaleB = +tone.phaseDeltaScales[1];
            let expression = +tone.expressionStarts[0];
            const expressionDelta = +tone.expressionDeltas[0];
            let phaseA = (tone.phases[0] % 1) * waveLength;
            let phaseB = (tone.phases[1] % 1) * waveLength;
            const filters = tone.noteFilters;
            const filterCount = tone.noteFilterCount | 0;
            let initialFilterInput1 = +tone.initialNoteFilterInput1;
            let initialFilterInput2 = +tone.initialNoteFilterInput2;
            const applyFilters = Synth.applyFilters;
            const phaseAInt = phaseA | 0;
            const phaseBInt = phaseB | 0;
            const indexA = phaseAInt % waveLength;
            const indexB = phaseBInt % waveLength;
            const phaseRatioA = phaseA - phaseAInt;
            const phaseRatioB = phaseB - phaseBInt;
            let prevWaveIntegralA = +wave[indexA];
            let prevWaveIntegralB = +wave[indexB];
            prevWaveIntegralA += (wave[indexA + 1] - prevWaveIntegralA) * phaseRatioA;
            prevWaveIntegralB += (wave[indexB + 1] - prevWaveIntegralB) * phaseRatioB;
            const stopIndex = bufferIndex + runLength;
            for (let sampleIndex = bufferIndex; sampleIndex < stopIndex; sampleIndex++) {
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
                const waveA = (nextWaveIntegralA - prevWaveIntegralA) / phaseDeltaA;
                const waveB = (nextWaveIntegralB - prevWaveIntegralB) / phaseDeltaB;
                prevWaveIntegralA = nextWaveIntegralA;
                prevWaveIntegralB = nextWaveIntegralB;
                const inputSample = waveA + waveB * unisonSign;
                const sample = applyFilters(inputSample, initialFilterInput1, initialFilterInput2, filterCount, filters);
                initialFilterInput2 = initialFilterInput1;
                initialFilterInput1 = inputSample;
                phaseDeltaA *= phaseDeltaScaleA;
                phaseDeltaB *= phaseDeltaScaleB;
                const output = sample * expression;
                expression += expressionDelta;
                data[sampleIndex] += output;
            }
            tone.phases[0] = phaseA / waveLength;
            tone.phases[1] = phaseB / waveLength;
            synth.sanitizeFilters(filters);
            tone.initialNoteFilterInput1 = initialFilterInput1;
            tone.initialNoteFilterInput2 = initialFilterInput2;
        }
        static harmonicsSynth(synth, bufferIndex, runLength, tone, instrument) {
            const data = synth.tempMonoInstrumentSampleBuffer;
            const wave = instrument.harmonicsWave.getCustomWave(instrument.type);
            const waveLength = wave.length - 1;
            const unisonSign = tone.specialIntervalExpressionMult * Config.unisons[instrument.unison].sign;
            if (instrument.unison == 0 && !instrument.getChord().customInterval)
                tone.phases[1] = tone.phases[0];
            let phaseDeltaA = tone.phaseDeltas[0] * waveLength;
            let phaseDeltaB = tone.phaseDeltas[1] * waveLength;
            const phaseDeltaScaleA = +tone.phaseDeltaScales[0];
            const phaseDeltaScaleB = +tone.phaseDeltaScales[1];
            let expression = +tone.expressionStarts[0];
            const expressionDelta = +tone.expressionDeltas[0];
            let phaseA = (tone.phases[0] % 1) * waveLength;
            let phaseB = (tone.phases[1] % 1) * waveLength;
            const filters = tone.noteFilters;
            const filterCount = tone.noteFilterCount | 0;
            let initialFilterInput1 = +tone.initialNoteFilterInput1;
            let initialFilterInput2 = +tone.initialNoteFilterInput2;
            const applyFilters = Synth.applyFilters;
            const phaseAInt = phaseA | 0;
            const phaseBInt = phaseB | 0;
            const indexA = phaseAInt % waveLength;
            const indexB = phaseBInt % waveLength;
            const phaseRatioA = phaseA - phaseAInt;
            const phaseRatioB = phaseB - phaseBInt;
            let prevWaveIntegralA = +wave[indexA];
            let prevWaveIntegralB = +wave[indexB];
            prevWaveIntegralA += (wave[indexA + 1] - prevWaveIntegralA) * phaseRatioA;
            prevWaveIntegralB += (wave[indexB + 1] - prevWaveIntegralB) * phaseRatioB;
            const stopIndex = bufferIndex + runLength;
            for (let sampleIndex = bufferIndex; sampleIndex < stopIndex; sampleIndex++) {
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
                const waveA = (nextWaveIntegralA - prevWaveIntegralA) / phaseDeltaA;
                const waveB = (nextWaveIntegralB - prevWaveIntegralB) / phaseDeltaB;
                prevWaveIntegralA = nextWaveIntegralA;
                prevWaveIntegralB = nextWaveIntegralB;
                const inputSample = waveA + waveB * unisonSign;
                const sample = applyFilters(inputSample, initialFilterInput1, initialFilterInput2, filterCount, filters);
                initialFilterInput2 = initialFilterInput1;
                initialFilterInput1 = inputSample;
                phaseDeltaA *= phaseDeltaScaleA;
                phaseDeltaB *= phaseDeltaScaleB;
                const output = sample * expression;
                expression += expressionDelta;
                data[sampleIndex] += output;
            }
            tone.phases[0] = phaseA / waveLength;
            tone.phases[1] = phaseB / waveLength;
            synth.sanitizeFilters(filters);
            tone.initialNoteFilterInput1 = initialFilterInput1;
            tone.initialNoteFilterInput2 = initialFilterInput2;
        }
        static pickedStringSynth(synth, bufferIndex, runLength, tone, instrument) {
            const voiceCount = Config.unisons[instrument.unison].voices;
            let pickedStringFunction = Synth.pickedStringFunctionCache[voiceCount];
            if (pickedStringFunction == undefined) {
                let pickedStringSource = "";
                pickedStringSource += `
				
				const Config = beepbox.Config;
				const Synth = beepbox.Synth;
				const NoteAutomationStringSustainIndex = ${3};
				const voiceCount = ${voiceCount};
				const data = synth.tempMonoInstrumentSampleBuffer;
				
				const sustainEnvelopeStart = tone.envelopeComputer.envelopeStarts[NoteAutomationStringSustainIndex];
				const sustainEnvelopeEnd   = tone.envelopeComputer.envelopeEnds[  NoteAutomationStringSustainIndex];
				const stringDecayStart = 1.0 - Math.min(1.0, sustainEnvelopeStart * instrument.stringSustain / (Config.stringSustainRange - 1));
				const stringDecayEnd   = 1.0 - Math.min(1.0, sustainEnvelopeEnd   * instrument.stringSustain / (Config.stringSustainRange - 1));
				
				let pickedString# = tone.pickedStrings[#];
				
				const prevDelayLength# = +pickedString#.prevDelayLength;
				let allPassSample# = +pickedString#.allPassSample;
				let allPassPrevInput# = +pickedString#.allPassPrevInput;
				let shelfSample# = +pickedString#.shelfSample;
				let shelfPrevInput# = +pickedString#.shelfPrevInput;
				let fractionalDelaySample# = +pickedString#.fractionalDelaySample;
				
				let expression = +tone.expressionStarts[0];
				const expressionDelta = +tone.expressionDeltas[0];
				
				const phaseDeltaStart# = +tone.phaseDeltas[#];
				const phaseDeltaScale# = +tone.phaseDeltaScales[#];
				const phaseDeltaEnd# = phaseDeltaStart# * Math.pow(phaseDeltaScale#, runLength);
				
				const radiansPerSampleStart# = Math.PI * 2.0 * phaseDeltaStart#;
				const radiansPerSampleEnd#   = Math.PI * 2.0 * phaseDeltaEnd#;
				
				const centerHarmonicStart# = radiansPerSampleStart# * 2.0;
				const centerHarmonicEnd#   = radiansPerSampleEnd# * 2.0;
				
				const allPassCenter = 2.0 * Math.PI * Config.pickedStringDispersionCenterFreq / synth.samplesPerSecond;
				const allPassRadiansStart# = Math.min(Math.PI, radiansPerSampleStart# * Config.pickedStringDispersionFreqMult * Math.pow(allPassCenter / radiansPerSampleStart#, Config.pickedStringDispersionFreqScale));
				const allPassRadiansEnd# = Math.min(Math.PI, radiansPerSampleEnd# * Config.pickedStringDispersionFreqMult * Math.pow(allPassCenter / radiansPerSampleEnd#, Config.pickedStringDispersionFreqScale));
				
				const shelfRadians = 2.0 * Math.PI * Config.pickedStringShelfHz / synth.samplesPerSecond;
				const decayCurveStart = (Math.pow(100.0, stringDecayStart) - 1.0) / 99.0;
				const decayCurveEnd   = (Math.pow(100.0, stringDecayEnd  ) - 1.0) / 99.0;
				const decayRateStart# = Math.pow(0.5, decayCurveStart * shelfRadians / radiansPerSampleStart#);
				const decayRateEnd#   = Math.pow(0.5, decayCurveEnd   * shelfRadians / radiansPerSampleEnd#);
				const shelfGainStart# = Math.pow(decayRateStart#, Config.stringDecayRate);
				const shelfGainEnd#   = Math.pow(decayRateEnd#,   Config.stringDecayRate);
				const expressionDecayStart# = Math.pow(decayRateStart#, 0.002);
				const expressionDecayEnd#   = Math.pow(decayRateEnd#,   0.002);`;
                for (let voice = 0; voice < voiceCount; voice++) {
                    pickedStringSource += `
				
				Synth.tempFilterStartCoefficients.allPass1stOrderInvertPhaseAbove(allPassRadiansStart#);
				synth.tempFrequencyResponse.analyze(Synth.tempFilterStartCoefficients, centerHarmonicStart#);
				let allPassG# = +Synth.tempFilterStartCoefficients.b[0]; /* same as a[1] */
				const allPassPhaseDelayStart# = -synth.tempFrequencyResponse.angle() / centerHarmonicStart#;
				
				Synth.tempFilterEndCoefficients.allPass1stOrderInvertPhaseAbove(allPassRadiansEnd#);
				synth.tempFrequencyResponse.analyze(Synth.tempFilterEndCoefficients, centerHarmonicEnd#);
				const allPassGEnd# = +Synth.tempFilterEndCoefficients.b[0]; /* same as a[1] */
				const allPassPhaseDelayEnd# = -synth.tempFrequencyResponse.angle() / centerHarmonicEnd#;
				
				Synth.tempFilterStartCoefficients.highShelf1stOrder(shelfRadians, shelfGainStart#);
				synth.tempFrequencyResponse.analyze(Synth.tempFilterStartCoefficients, centerHarmonicStart#)
				let shelfA1# = +Synth.tempFilterStartCoefficients.a[1]
				let shelfB0# = Synth.tempFilterStartCoefficients.b[0] * expressionDecayStart#
				let shelfB1# = Synth.tempFilterStartCoefficients.b[1] * expressionDecayStart#
				const shelfPhaseDelayStart# = -synth.tempFrequencyResponse.angle() / centerHarmonicStart#;
				
				Synth.tempFilterEndCoefficients.highShelf1stOrder(shelfRadians, shelfGainEnd#)
				synth.tempFrequencyResponse.analyze(Synth.tempFilterEndCoefficients, centerHarmonicEnd#)
				const shelfA1End# = +Synth.tempFilterEndCoefficients.a[1]
				const shelfB0End# = Synth.tempFilterEndCoefficients.b[0] * expressionDecayEnd#
				const shelfB1End# = Synth.tempFilterEndCoefficients.b[1] * expressionDecayEnd#
				const shelfPhaseDelayEnd# = -synth.tempFrequencyResponse.angle() / centerHarmonicEnd#;`.replace(/\#/g, String(voice));
                }
                pickedStringSource += `
				
				const periodLengthStart# = 1.0 / phaseDeltaStart#;
				const periodLengthEnd# = 1.0 / phaseDeltaEnd#;
				const minBufferLength# = Math.ceil(Math.max(periodLengthStart#, periodLengthEnd#) * 2);
				let delayLength# = periodLengthStart# - allPassPhaseDelayStart# - shelfPhaseDelayStart#;
				const delayLengthEnd# = periodLengthEnd# - allPassPhaseDelayEnd# - shelfPhaseDelayEnd#;
				
				const delayLengthDelta# = (delayLengthEnd# - delayLength#) / runLength;
				const allPassGDelta# = (allPassGEnd# - allPassG#) / runLength;
				const shelfA1Delta# = (shelfA1End# - shelfA1#) / runLength;
				const shelfB0Delta# = (shelfB0End# - shelfB0#) / runLength;
				const shelfB1Delta# = (shelfB1End# - shelfB1#) / runLength;
				
				const filters = tone.noteFilters;
				const filterCount = tone.noteFilterCount|0;
				let initialFilterInput1 = +tone.initialNoteFilterInput1;
				let initialFilterInput2 = +tone.initialNoteFilterInput2;
				const applyFilters = Synth.applyFilters;
				
				const pitchChanged# = Math.abs(Math.log2(delayLength# / prevDelayLength#)) > 0.01;
				let delayIndex# = pickedString#.delayIndex|0;`;
                for (let voice = 0; voice < voiceCount; voice++) {
                    pickedStringSource += `
				
				const reinitializeImpulse# = (delayIndex# == -1 || pitchChanged#);
				if (pickedString#.delayLine == null || pickedString#.delayLine.length <= minBufferLength#) {
					// The delay line buffer will get reused for other tones so might as well
					// start off with a buffer size that is big enough for most notes.
					const likelyMaximumLength = Math.ceil(2 * synth.samplesPerSecond / beepbox.Instrument.frequencyFromPitch(12));
					const newDelayLine = new Float32Array(Synth.fittingPowerOfTwo(Math.max(likelyMaximumLength, minBufferLength#)));
					if (!reinitializeImpulse# && pickedString#.delayLine != null) {
						// If the tone has already started but the buffer needs to be reallocated,
						// transfer the old data to the new buffer.
						const oldDelayBufferMask = (pickedString#.delayLine.length - 1) >> 0;
						const startCopyingFromIndex = delayIndex# + pickedString#.delayResetOffset;
						delayIndex# = pickedString#.delayLine.length - pickedString#.delayResetOffset;
						for (let i = 0; i < pickedString#.delayLine.length; i++) {
							newDelayLine[i] = pickedString#.delayLine[(startCopyingFromIndex + i) & oldDelayBufferMask];
						}
					}
					pickedString#.delayLine = newDelayLine;
				}
				const delayLine# = pickedString#.delayLine;
				const delayBufferMask# = (delayLine#.length - 1) >> 0;
				
				if (reinitializeImpulse#) {
					// -1 delay index means the tone was reset.
					// Also, if the pitch changed suddenly (e.g. from seamless or arpeggio) then reset the wave.
					
					delayIndex# = 0;
					allPassSample# = 0.0;
					allPassPrevInput# = 0.0;
					shelfSample# = 0.0;
					shelfPrevInput# = 0.0;
					fractionalDelaySample# = 0.0;
					
					// Clear away a region of the delay buffer for the new impulse.
					const startImpulseFrom = -delayLength#;
					const startZerosFrom = Math.floor(startImpulseFrom - periodLengthStart# / 2);
					const stopZerosAt = Math.ceil(startZerosFrom + periodLengthStart# * 2);
					pickedString#.delayResetOffset = stopZerosAt; // And continue clearing the area in front of the delay line.
					for (let i = startZerosFrom; i <= stopZerosAt; i++) {
						delayLine#[i & delayBufferMask#] = 0.0;
					}
					
					const impulseWave = instrument.harmonicsWave.getCustomWave(instrument.type);
					const impulseWaveLength = impulseWave.length - 1; // The first sample is duplicated at the end, don't double-count it.
					const impulsePhaseDelta = impulseWaveLength / periodLengthStart#;
					
					const fadeDuration = Math.min(periodLengthStart# * 0.2, synth.samplesPerSecond * 0.003);
					const startImpulseFromSample = Math.ceil(startImpulseFrom);
					const stopImpulseAt = startImpulseFrom + periodLengthStart# + fadeDuration;
					const stopImpulseAtSample = stopImpulseAt;
					let impulsePhase = (startImpulseFromSample - startImpulseFrom) * impulsePhaseDelta;
					let prevWaveIntegral = 0.0;
					for (let i = startImpulseFromSample; i <= stopImpulseAtSample; i++) {
						const impulsePhaseInt = impulsePhase|0;
						const index = impulsePhaseInt % impulseWaveLength;
						let nextWaveIntegral = impulseWave[index];
						const phaseRatio = impulsePhase - impulsePhaseInt;
						nextWaveIntegral += (impulseWave[index+1] - nextWaveIntegral) * phaseRatio;
						const sample = (nextWaveIntegral - prevWaveIntegral) / impulsePhaseDelta;
						const fadeIn = Math.min(1.0, (i - startImpulseFrom) / fadeDuration);
						const fadeOut = Math.min(1.0, (stopImpulseAt - i) / fadeDuration);
						const combinedFade = fadeIn * fadeOut;
						const curvedFade = combinedFade * combinedFade * (3.0 - 2.0 * combinedFade); // A cubic sigmoid from 0 to 1.
						delayLine#[i & delayBufferMask#] += sample * curvedFade;
						prevWaveIntegral = nextWaveIntegral;
						impulsePhase += impulsePhaseDelta;
					}
				}
				delayIndex# = (delayIndex# & delayBufferMask#) + delayLine#.length;`.replace(/\#/g, String(voice));
                }
                pickedStringSource += `
				
				const unisonSign = tone.specialIntervalExpressionMult * Config.unisons[instrument.unison].sign;
				const delayResetOffset# = pickedString#.delayResetOffset|0;
				
				const stopIndex = bufferIndex + runLength;
				for (let sampleIndex = bufferIndex; sampleIndex < stopIndex; sampleIndex++) {
					const targetSampleTime# = delayIndex# - delayLength#;
					const lowerIndex# = (targetSampleTime# + 0.125) | 0; // Offset to improve stability of all-pass filter.
					const upperIndex# = lowerIndex# + 1;
					const fractionalDelay# = upperIndex# - targetSampleTime#;
					const fractionalDelayG# = (1.0 - fractionalDelay#) / (1.0 + fractionalDelay#); // Inlined version of FilterCoefficients.prototype.allPass1stOrderFractionalDelay
					const prevInput# = delayLine#[lowerIndex# & delayBufferMask#];
					const input# = delayLine#[upperIndex# & delayBufferMask#];
					fractionalDelaySample# = fractionalDelayG# * input# + prevInput# - fractionalDelayG# * fractionalDelaySample#;
					
					allPassSample# = fractionalDelaySample# * allPassG# + allPassPrevInput# - allPassG# * allPassSample#;
					allPassPrevInput# = fractionalDelaySample#;
					
					shelfSample# = shelfB0# * allPassSample# + shelfB1# * shelfPrevInput# - shelfA1# * shelfSample#;
					shelfPrevInput# = allPassSample#;
					
					delayLine#[delayIndex# & delayBufferMask#] += shelfSample#;
					delayLine#[(delayIndex# + delayResetOffset#) & delayBufferMask#] = 0.0;
					delayIndex#++;
					
					const inputSample = (`;
                const sampleList = [];
                for (let voice = 0; voice < voiceCount; voice++) {
                    sampleList.push("fractionalDelaySample" + voice + (voice == 1 ? " * unisonSign" : ""));
                }
                pickedStringSource += sampleList.join(" + ");
                pickedStringSource += `) * expression;
					const sample = applyFilters(inputSample, initialFilterInput1, initialFilterInput2, filterCount, filters);
					initialFilterInput2 = initialFilterInput1;
					initialFilterInput1 = inputSample;
					data[sampleIndex] += sample;
					
					expression += expressionDelta;
					delayLength# += delayLengthDelta#;
					allPassG# += allPassGDelta#;
					shelfA1# += shelfA1Delta#;
					shelfB0# += shelfB0Delta#;
					shelfB1# += shelfB1Delta#;
				}
				
				// Avoid persistent denormal or NaN values in the delay buffers and filter history.
				const epsilon = (1.0e-24);
				if (!Number.isFinite(allPassSample#) || Math.abs(allPassSample#) < epsilon) allPassSample# = 0.0;
				if (!Number.isFinite(allPassPrevInput#) || Math.abs(allPassPrevInput#) < epsilon) allPassPrevInput# = 0.0;
				if (!Number.isFinite(shelfSample#) || Math.abs(shelfSample#) < epsilon) shelfSample# = 0.0;
				if (!Number.isFinite(shelfPrevInput#) || Math.abs(shelfPrevInput#) < epsilon) shelfPrevInput# = 0.0;
				if (!Number.isFinite(fractionalDelaySample#) || Math.abs(fractionalDelaySample#) < epsilon) fractionalDelaySample# = 0.0;
				pickedString#.allPassSample = allPassSample#;
				pickedString#.allPassPrevInput = allPassPrevInput#;
				pickedString#.shelfSample = shelfSample#;
				pickedString#.shelfPrevInput = shelfPrevInput#;
				pickedString#.fractionalDelaySample = fractionalDelaySample#;
				pickedString#.delayIndex = delayIndex#;
				pickedString#.prevDelayLength = delayLength#;
				
				synth.sanitizeFilters(filters);
				tone.initialNoteFilterInput1 = initialFilterInput1;
				tone.initialNoteFilterInput2 = initialFilterInput2;`;
                pickedStringSource = pickedStringSource.replace(/^.*\#.*$/mg, line => {
                    const lines = [];
                    for (let voice = 0; voice < voiceCount; voice++) {
                        lines.push(line.replace(/\#/g, String(voice)));
                    }
                    return lines.join("\n");
                });
                pickedStringFunction = new Function("synth", "bufferIndex", "runLength", "tone", "instrument", pickedStringSource);
                Synth.pickedStringFunctionCache[voiceCount] = pickedStringFunction;
            }
            pickedStringFunction(synth, bufferIndex, runLength, tone, instrument);
        }
        static effectsSynth(synth, outputDataL, outputDataR, bufferIndex, runLength, instrument, instrumentState) {
            const usesDistortion = effectsIncludeDistortion(instrument.effects) && instrument.distortion != 0;
            const usesBitcrusher = effectsIncludeBitcrusher(instrument.effects);
            const usesEqFilter = instrumentState.eqFilterCount > 0;
            const usesPanning = effectsIncludePanning(instrument.effects) && instrument.pan != Config.panCenter;
            const usesChorus = effectsIncludeChorus(instrument.effects) && instrument.chorus != 0;
            const usesEcho = effectsIncludeEcho(instrument.effects) && instrument.echoSustain != 0;
            const usesReverb = effectsIncludeReverb(instrument.effects) && instrument.reverb != 0;
            let signature = 0;
            if (usesDistortion)
                signature = signature | 1;
            signature = signature << 1;
            if (usesBitcrusher)
                signature = signature | 1;
            signature = signature << 1;
            if (usesEqFilter)
                signature = signature | 1;
            signature = signature << 1;
            if (usesPanning)
                signature = signature | 1;
            signature = signature << 1;
            if (usesChorus)
                signature = signature | 1;
            signature = signature << 1;
            if (usesEcho)
                signature = signature | 1;
            signature = signature << 1;
            if (usesReverb)
                signature = signature | 1;
            let effectsFunction = Synth.effectsFunctionCache[signature];
            if (effectsFunction == undefined) {
                let effectsSource = "";
                const usesDelays = usesChorus || usesReverb || usesEcho;
                effectsSource += `
				const tempMonoInstrumentSampleBuffer = synth.tempMonoInstrumentSampleBuffer;
				
				let mixVolume = +instrumentState.mixVolumeStart;
				const mixVolumeDelta = +instrumentState.mixVolumeDelta;`;
                if (usesDelays) {
                    effectsSource += `
				
				let delayInputMult = +instrumentState.delayInputMultStart;
				const delayInputMultDelta = +instrumentState.delayInputMultDelta;`;
                }
                if (usesDistortion) {
                    effectsSource += `
				
				const distortionBaseVolume = +beepbox.Config.distortionBaseVolume;
				const distortionStart = +Math.pow(1.0 - 0.895 * (Math.pow(20.0, instrumentState.distortionStart) - 1.0) / 19.0, 2.0)
				const distortionEnd   = +Math.pow(1.0 - 0.895 * (Math.pow(20.0, instrumentState.distortionEnd  ) - 1.0) / 19.0, 2.0)
				let distortion = distortionStart;
				const distortionDelta = (distortionEnd - distortionStart) / runLength;
				const distortionDriveStart = (1.0 + 2.0 * instrumentState.distortionStart) / distortionBaseVolume;
				const distortionDriveEnd   = (1.0 + 2.0 * instrumentState.distortionEnd)   / distortionBaseVolume;
				let distortionDrive = distortionDriveStart;
				const distortionDriveDelta = (distortionDriveEnd - distortionDriveStart) / runLength;
				const distortionFractionalResolution = 4.0;
				const distortionOversampleCompensation = distortionBaseVolume / distortionFractionalResolution;
				const distortionFractionalDelay1 = 1.0 / distortionFractionalResolution;
				const distortionFractionalDelay2 = 2.0 / distortionFractionalResolution;
				const distortionFractionalDelay3 = 3.0 / distortionFractionalResolution;
				const distortionFractionalDelayG1 = (1.0 - distortionFractionalDelay1) / (1.0 + distortionFractionalDelay1); // Inlined version of FilterCoefficients.prototype.allPass1stOrderFractionalDelay
				const distortionFractionalDelayG2 = (1.0 - distortionFractionalDelay2) / (1.0 + distortionFractionalDelay2); // Inlined version of FilterCoefficients.prototype.allPass1stOrderFractionalDelay
				const distortionFractionalDelayG3 = (1.0 - distortionFractionalDelay3) / (1.0 + distortionFractionalDelay3); // Inlined version of FilterCoefficients.prototype.allPass1stOrderFractionalDelay
				const distortionNextOutputWeight1 = Math.cos(Math.PI * distortionFractionalDelay1) * 0.5 + 0.5;
				const distortionNextOutputWeight2 = Math.cos(Math.PI * distortionFractionalDelay2) * 0.5 + 0.5;
				const distortionNextOutputWeight3 = Math.cos(Math.PI * distortionFractionalDelay3) * 0.5 + 0.5;
				const distortionPrevOutputWeight1 = 1.0 - distortionNextOutputWeight1;
				const distortionPrevOutputWeight2 = 1.0 - distortionNextOutputWeight2;
				const distortionPrevOutputWeight3 = 1.0 - distortionNextOutputWeight3;
				
				let distortionFractionalInput1 = +instrumentState.distortionFractionalInput1;
				let distortionFractionalInput2 = +instrumentState.distortionFractionalInput2;
				let distortionFractionalInput3 = +instrumentState.distortionFractionalInput3;
				let distortionPrevInput = +instrumentState.distortionPrevInput;
				let distortionNextOutput = +instrumentState.distortionNextOutput;`;
                }
                if (usesBitcrusher) {
                    effectsSource += `
				
				let bitcrusherPrevInput = +instrumentState.bitcrusherPrevInput;
				let bitcrusherCurrentOutput = +instrumentState.bitcrusherCurrentOutput;
				let bitcrusherPhase = +instrumentState.bitcrusherPhase;
				let bitcrusherPhaseDelta = +instrumentState.bitcrusherPhaseDelta;
				const bitcrusherPhaseDeltaScale = +instrumentState.bitcrusherPhaseDeltaScale;
				let bitcrusherScale = +instrumentState.bitcrusherScale;
				const bitcrusherScaleScale = +instrumentState.bitcrusherScaleScale;
				let bitcrusherFoldLevel = +instrumentState.bitcrusherFoldLevel;
				const bitcrusherFoldLevelScale = +instrumentState.bitcrusherFoldLevelScale;`;
                }
                if (usesEqFilter) {
                    effectsSource += `
				
				let filters = instrumentState.eqFilters;
				const filterCount = instrumentState.eqFilterCount|0;
				let initialFilterInput1 = +instrumentState.initialEqFilterInput1;
				let initialFilterInput2 = +instrumentState.initialEqFilterInput2;
				const applyFilters = beepbox.Synth.applyFilters;`;
                }
                effectsSource += `
				
				let eqFilterVolume = +instrumentState.eqFilterVolumeStart;
				const eqFilterVolumeDelta = +instrumentState.eqFilterVolumeDelta;`;
                if (usesPanning) {
                    effectsSource += `
				
				const panningMask = synth.panningDelayBufferMask >>> 0;
				const panningDelayLine = instrumentState.panningDelayLine;
				let panningDelayPos = instrumentState.panningDelayPos & panningMask;
				let   panningVolumeL      = +instrumentState.panningVolumeStartL;
				let   panningVolumeR      = +instrumentState.panningVolumeStartR;
				const panningVolumeDeltaL = +instrumentState.panningVolumeDeltaL;
				const panningVolumeDeltaR = +instrumentState.panningVolumeDeltaR;
				let   panningOffsetL      = panningDelayPos - instrumentState.panningOffsetStartL + synth.panningDelayBufferSize;
				let   panningOffsetR      = panningDelayPos - instrumentState.panningOffsetStartR + synth.panningDelayBufferSize;
				const panningOffsetDeltaL = 1.0 - instrumentState.panningOffsetDeltaL;
				const panningOffsetDeltaR = 1.0 - instrumentState.panningOffsetDeltaR;`;
                }
                if (usesChorus) {
                    effectsSource += `
				
				const chorusMask = synth.chorusDelayBufferMask >>> 0;
				const chorusDelayLineL = instrumentState.chorusDelayLineL;
				const chorusDelayLineR = instrumentState.chorusDelayLineR;
				instrumentState.chorusDelayLineDirty = true;
				let chorusDelayPos = instrumentState.chorusDelayPos & chorusMask;
				
				const chorusStart = +instrumentState.chorusStart;
				const chorusEnd   = +instrumentState.chorusEnd;
				let chorusVoiceMult = chorusStart;
				const chorusVoiceMultDelta = (chorusEnd - chorusStart) / runLength;
				let chorusCombinedMult = 1.0 / Math.sqrt(3.0 * chorusStart * chorusStart + 1.0);
				const chorusCombinedMultEnd = 1.0 / Math.sqrt(3.0 * chorusEnd * chorusEnd + 1.0);
				const chorusCombinedMultDelta = (chorusCombinedMultEnd - chorusCombinedMult) / runLength;
				
				const chorusDuration = +beepbox.Config.chorusPeriodSeconds;
				const chorusAngle = Math.PI * 2.0 / (chorusDuration * synth.samplesPerSecond);
				const chorusRange = synth.samplesPerSecond * beepbox.Config.chorusDelayRange;
				const chorusOffset0 = synth.chorusDelayBufferSize - beepbox.Config.chorusDelayOffsets[0][0] * chorusRange;
				const chorusOffset1 = synth.chorusDelayBufferSize - beepbox.Config.chorusDelayOffsets[0][1] * chorusRange;
				const chorusOffset2 = synth.chorusDelayBufferSize - beepbox.Config.chorusDelayOffsets[0][2] * chorusRange;
				const chorusOffset3 = synth.chorusDelayBufferSize - beepbox.Config.chorusDelayOffsets[1][0] * chorusRange;
				const chorusOffset4 = synth.chorusDelayBufferSize - beepbox.Config.chorusDelayOffsets[1][1] * chorusRange;
				const chorusOffset5 = synth.chorusDelayBufferSize - beepbox.Config.chorusDelayOffsets[1][2] * chorusRange;
				let chorusPhase = instrumentState.chorusPhase % (Math.PI * 2.0);
				let chorusTap0Index = chorusDelayPos + chorusOffset0 - chorusRange * Math.sin(chorusPhase + beepbox.Config.chorusPhaseOffsets[0][0]);
				let chorusTap1Index = chorusDelayPos + chorusOffset1 - chorusRange * Math.sin(chorusPhase + beepbox.Config.chorusPhaseOffsets[0][1]);
				let chorusTap2Index = chorusDelayPos + chorusOffset2 - chorusRange * Math.sin(chorusPhase + beepbox.Config.chorusPhaseOffsets[0][2]);
				let chorusTap3Index = chorusDelayPos + chorusOffset3 - chorusRange * Math.sin(chorusPhase + beepbox.Config.chorusPhaseOffsets[1][0]);
				let chorusTap4Index = chorusDelayPos + chorusOffset4 - chorusRange * Math.sin(chorusPhase + beepbox.Config.chorusPhaseOffsets[1][1]);
				let chorusTap5Index = chorusDelayPos + chorusOffset5 - chorusRange * Math.sin(chorusPhase + beepbox.Config.chorusPhaseOffsets[1][2]);
				chorusPhase += chorusAngle * runLength;
				const chorusTap0End = chorusDelayPos + chorusOffset0 - chorusRange * Math.sin(chorusPhase + beepbox.Config.chorusPhaseOffsets[0][0]) + runLength;
				const chorusTap1End = chorusDelayPos + chorusOffset1 - chorusRange * Math.sin(chorusPhase + beepbox.Config.chorusPhaseOffsets[0][1]) + runLength;
				const chorusTap2End = chorusDelayPos + chorusOffset2 - chorusRange * Math.sin(chorusPhase + beepbox.Config.chorusPhaseOffsets[0][2]) + runLength;
				const chorusTap3End = chorusDelayPos + chorusOffset3 - chorusRange * Math.sin(chorusPhase + beepbox.Config.chorusPhaseOffsets[1][0]) + runLength;
				const chorusTap4End = chorusDelayPos + chorusOffset4 - chorusRange * Math.sin(chorusPhase + beepbox.Config.chorusPhaseOffsets[1][1]) + runLength;
				const chorusTap5End = chorusDelayPos + chorusOffset5 - chorusRange * Math.sin(chorusPhase + beepbox.Config.chorusPhaseOffsets[1][2]) + runLength;
				const chorusTap0Delta = (chorusTap0End - chorusTap0Index) / runLength;
				const chorusTap1Delta = (chorusTap1End - chorusTap1Index) / runLength;
				const chorusTap2Delta = (chorusTap2End - chorusTap2Index) / runLength;
				const chorusTap3Delta = (chorusTap3End - chorusTap3Index) / runLength;
				const chorusTap4Delta = (chorusTap4End - chorusTap4Index) / runLength;
				const chorusTap5Delta = (chorusTap5End - chorusTap5Index) / runLength;`;
                }
                if (usesEcho) {
                    effectsSource += `
				
				let echoMult = +instrumentState.echoMultStart;
				const echoMultDelta = +instrumentState.echoMultDelta;
				
				const echoDelayLineL = instrumentState.echoDelayLineL;
				const echoDelayLineR = instrumentState.echoDelayLineR;
				const echoMask = (echoDelayLineL.length - 1) >>> 0;
				instrumentState.echoDelayLineDirty = true;
				
				let echoDelayPos = instrumentState.echoDelayPos & echoMask;
				const echoDelayOffsetStart = (echoDelayLineL.length - instrumentState.echoDelayOffsetStart) & echoMask;
				const echoDelayOffsetEnd   = (echoDelayLineL.length - instrumentState.echoDelayOffsetEnd) & echoMask;
				let echoDelayOffsetRatio = +instrumentState.echoDelayOffsetRatio;
				const echoDelayOffsetRatioDelta = +instrumentState.echoDelayOffsetRatioDelta;
				
				const echoShelfA1 = +instrumentState.echoShelfA1;
				const echoShelfB0 = +instrumentState.echoShelfB0;
				const echoShelfB1 = +instrumentState.echoShelfB1;
				let echoShelfSampleL = +instrumentState.echoShelfSampleL;
				let echoShelfSampleR = +instrumentState.echoShelfSampleR;
				let echoShelfPrevInputL = +instrumentState.echoShelfPrevInputL;
				let echoShelfPrevInputR = +instrumentState.echoShelfPrevInputR;`;
                }
                if (usesReverb) {
                    effectsSource += `
				
				const reverbMask = beepbox.Config.reverbDelayBufferMask >>> 0; //TODO: Dynamic reverb buffer size.
				const reverbDelayLine = instrumentState.reverbDelayLine;
				instrumentState.reverbDelayLineDirty = true;
				let reverbDelayPos = instrumentState.reverbDelayPos & reverbMask;
				
				let reverb = +instrumentState.reverbMultStart;
				const reverbDelta = +instrumentState.reverbMultDelta;
				
				const reverbShelfA1 = +instrumentState.reverbShelfA1;
				const reverbShelfB0 = +instrumentState.reverbShelfB0;
				const reverbShelfB1 = +instrumentState.reverbShelfB1;
				let reverbShelfSample0 = +instrumentState.reverbShelfSample0;
				let reverbShelfSample1 = +instrumentState.reverbShelfSample1;
				let reverbShelfSample2 = +instrumentState.reverbShelfSample2;
				let reverbShelfSample3 = +instrumentState.reverbShelfSample3;
				let reverbShelfPrevInput0 = +instrumentState.reverbShelfPrevInput0;
				let reverbShelfPrevInput1 = +instrumentState.reverbShelfPrevInput1;
				let reverbShelfPrevInput2 = +instrumentState.reverbShelfPrevInput2;
				let reverbShelfPrevInput3 = +instrumentState.reverbShelfPrevInput3;`;
                }
                effectsSource += `
				
				const stopIndex = bufferIndex + runLength;
				for (let sampleIndex = bufferIndex; sampleIndex < stopIndex; sampleIndex++) {
					let sample = tempMonoInstrumentSampleBuffer[sampleIndex];
					tempMonoInstrumentSampleBuffer[sampleIndex] = 0.0;`;
                if (usesDistortion) {
                    effectsSource += `
					
					const distortionReverse = 1.0 - distortion;
					const distortionNextInput = sample * distortionDrive;
					sample = distortionNextOutput;
					distortionNextOutput = distortionNextInput / (distortionReverse * Math.abs(distortionNextInput) + distortion);
					distortionFractionalInput1 = distortionFractionalDelayG1 * distortionNextInput + distortionPrevInput - distortionFractionalDelayG1 * distortionFractionalInput1;
					distortionFractionalInput2 = distortionFractionalDelayG2 * distortionNextInput + distortionPrevInput - distortionFractionalDelayG2 * distortionFractionalInput2;
					distortionFractionalInput3 = distortionFractionalDelayG3 * distortionNextInput + distortionPrevInput - distortionFractionalDelayG3 * distortionFractionalInput3;
					const distortionOutput1 = distortionFractionalInput1 / (distortionReverse * Math.abs(distortionFractionalInput1) + distortion);
					const distortionOutput2 = distortionFractionalInput2 / (distortionReverse * Math.abs(distortionFractionalInput2) + distortion);
					const distortionOutput3 = distortionFractionalInput3 / (distortionReverse * Math.abs(distortionFractionalInput3) + distortion);
					distortionNextOutput += distortionOutput1 * distortionNextOutputWeight1 + distortionOutput2 * distortionNextOutputWeight2 + distortionOutput3 * distortionNextOutputWeight3;
					sample += distortionOutput1 * distortionPrevOutputWeight1 + distortionOutput2 * distortionPrevOutputWeight2 + distortionOutput3 * distortionPrevOutputWeight3;
					sample *= distortionOversampleCompensation;
					distortionPrevInput = distortionNextInput;
					distortion += distortionDelta;
					distortionDrive += distortionDriveDelta;`;
                }
                if (usesBitcrusher) {
                    effectsSource += `
					
					bitcrusherPhase += bitcrusherPhaseDelta;
					if (bitcrusherPhase < 1.0) {
						bitcrusherPrevInput = sample;
						sample = bitcrusherCurrentOutput;
					} else {
						bitcrusherPhase = bitcrusherPhase % 1.0;
						const ratio = bitcrusherPhase / bitcrusherPhaseDelta;
						
						const lerpedInput = sample + (bitcrusherPrevInput - sample) * ratio;
						bitcrusherPrevInput = sample;
						
						const bitcrusherWrapLevel = bitcrusherFoldLevel * 4.0;
						const wrappedSample = (((lerpedInput + bitcrusherFoldLevel) % bitcrusherWrapLevel) + bitcrusherWrapLevel) % bitcrusherWrapLevel;
						const foldedSample = bitcrusherFoldLevel - Math.abs(bitcrusherFoldLevel * 2.0 - wrappedSample);
						const scaledSample = foldedSample / bitcrusherScale;
						const oldValue = bitcrusherCurrentOutput;
						const newValue = (((scaledSample > 0 ? scaledSample + 1 : scaledSample)|0)-.5) * bitcrusherScale;
						
						sample = oldValue + (newValue - oldValue) * ratio;
						bitcrusherCurrentOutput = newValue;
					}
					bitcrusherPhaseDelta *= bitcrusherPhaseDeltaScale;
					bitcrusherScale *= bitcrusherScaleScale;
					bitcrusherFoldLevel *= bitcrusherFoldLevelScale;`;
                }
                if (usesEqFilter) {
                    effectsSource += `
					
					const inputSample = sample;
					sample = applyFilters(inputSample, initialFilterInput1, initialFilterInput2, filterCount, filters);
					initialFilterInput2 = initialFilterInput1;
					initialFilterInput1 = inputSample;`;
                }
                effectsSource += `
					
					sample *= eqFilterVolume;
					eqFilterVolume += eqFilterVolumeDelta;`;
                if (usesPanning) {
                    effectsSource += `
					
					panningDelayLine[panningDelayPos] = sample;
					const panningRatioL  = panningOffsetL % 1;
					const panningRatioR  = panningOffsetR % 1;
					const panningTapLA   = panningDelayLine[(panningOffsetL) & panningMask];
					const panningTapLB   = panningDelayLine[(panningOffsetL + 1) & panningMask];
					const panningTapRA   = panningDelayLine[(panningOffsetR) & panningMask];
					const panningTapRB   = panningDelayLine[(panningOffsetR + 1) & panningMask];
					const panningTapL    = panningTapLA + (panningTapLB - panningTapLA) * panningRatioL;
					const panningTapR    = panningTapRA + (panningTapRB - panningTapRA) * panningRatioR;
					let sampleL = panningTapL * panningVolumeL;
					let sampleR = panningTapR * panningVolumeR;
					panningDelayPos = (panningDelayPos + 1) & panningMask;
					panningVolumeL += panningVolumeDeltaL;
					panningVolumeR += panningVolumeDeltaR;
					panningOffsetL += panningOffsetDeltaL;
					panningOffsetR += panningOffsetDeltaR;`;
                }
                else {
                    effectsSource += `
					
					let sampleL = sample;
					let sampleR = sample;`;
                }
                if (usesChorus) {
                    effectsSource += `
					
					const chorusTap0Ratio = chorusTap0Index % 1;
					const chorusTap1Ratio = chorusTap1Index % 1;
					const chorusTap2Ratio = chorusTap2Index % 1;
					const chorusTap3Ratio = chorusTap3Index % 1;
					const chorusTap4Ratio = chorusTap4Index % 1;
					const chorusTap5Ratio = chorusTap5Index % 1;
					const chorusTap0A = chorusDelayLineL[(chorusTap0Index) & chorusMask];
					const chorusTap0B = chorusDelayLineL[(chorusTap0Index + 1) & chorusMask];
					const chorusTap1A = chorusDelayLineL[(chorusTap1Index) & chorusMask];
					const chorusTap1B = chorusDelayLineL[(chorusTap1Index + 1) & chorusMask];
					const chorusTap2A = chorusDelayLineL[(chorusTap2Index) & chorusMask];
					const chorusTap2B = chorusDelayLineL[(chorusTap2Index + 1) & chorusMask];
					const chorusTap3A = chorusDelayLineR[(chorusTap3Index) & chorusMask];
					const chorusTap3B = chorusDelayLineR[(chorusTap3Index + 1) & chorusMask];
					const chorusTap4A = chorusDelayLineR[(chorusTap4Index) & chorusMask];
					const chorusTap4B = chorusDelayLineR[(chorusTap4Index + 1) & chorusMask];
					const chorusTap5A = chorusDelayLineR[(chorusTap5Index) & chorusMask];
					const chorusTap5B = chorusDelayLineR[(chorusTap5Index + 1) & chorusMask];
					const chorusTap0 = chorusTap0A + (chorusTap0B - chorusTap0A) * chorusTap0Ratio;
					const chorusTap1 = chorusTap1A + (chorusTap1B - chorusTap1A) * chorusTap1Ratio;
					const chorusTap2 = chorusTap2A + (chorusTap2B - chorusTap2A) * chorusTap2Ratio;
					const chorusTap3 = chorusTap3A + (chorusTap3B - chorusTap3A) * chorusTap3Ratio;
					const chorusTap4 = chorusTap4A + (chorusTap4B - chorusTap4A) * chorusTap4Ratio;
					const chorusTap5 = chorusTap5A + (chorusTap5B - chorusTap5A) * chorusTap5Ratio;
					chorusDelayLineL[chorusDelayPos] = sampleL * delayInputMult;
					chorusDelayLineR[chorusDelayPos] = sampleR * delayInputMult;
					sampleL = chorusCombinedMult * (sampleL + chorusVoiceMult * (chorusTap1 - chorusTap0 - chorusTap2));
					sampleR = chorusCombinedMult * (sampleR + chorusVoiceMult * (chorusTap4 - chorusTap3 - chorusTap5));
					chorusDelayPos = (chorusDelayPos + 1) & chorusMask;
					chorusTap0Index += chorusTap0Delta;
					chorusTap1Index += chorusTap1Delta;
					chorusTap2Index += chorusTap2Delta;
					chorusTap3Index += chorusTap3Delta;
					chorusTap4Index += chorusTap4Delta;
					chorusTap5Index += chorusTap5Delta;
					chorusVoiceMult += chorusVoiceMultDelta;
					chorusCombinedMult += chorusCombinedMultDelta;`;
                }
                if (usesEcho) {
                    effectsSource += `
					
					const echoTapStartIndex = (echoDelayPos + echoDelayOffsetStart) & echoMask;
					const echoTapEndIndex   = (echoDelayPos + echoDelayOffsetEnd  ) & echoMask;
					const echoTapStartL = echoDelayLineL[echoTapStartIndex];
					const echoTapEndL   = echoDelayLineL[echoTapEndIndex];
					const echoTapStartR = echoDelayLineR[echoTapStartIndex];
					const echoTapEndR   = echoDelayLineR[echoTapEndIndex];
					const echoTapL = (echoTapStartL + (echoTapEndL - echoTapStartL) * echoDelayOffsetRatio) * echoMult;
					const echoTapR = (echoTapStartR + (echoTapEndR - echoTapStartR) * echoDelayOffsetRatio) * echoMult;
					
					echoShelfSampleL = echoShelfB0 * echoTapL + echoShelfB1 * echoShelfPrevInputL - echoShelfA1 * echoShelfSampleL;
					echoShelfSampleR = echoShelfB0 * echoTapR + echoShelfB1 * echoShelfPrevInputR - echoShelfA1 * echoShelfSampleR;
					echoShelfPrevInputL = echoTapL;
					echoShelfPrevInputR = echoTapR;
					sampleL += echoShelfSampleL;
					sampleR += echoShelfSampleR;
					
					echoDelayLineL[echoDelayPos] = sampleL * delayInputMult;
					echoDelayLineR[echoDelayPos] = sampleR * delayInputMult;
					echoDelayPos = (echoDelayPos + 1) & echoMask;
					echoDelayOffsetRatio += echoDelayOffsetRatioDelta;
					echoMult += echoMultDelta;`;
                }
                if (usesReverb) {
                    effectsSource += `
					
					// Reverb, implemented using a feedback delay network with a Hadamard matrix and lowpass filters.
					// good ratios:    0.555235 + 0.618033 + 0.818 +   1.0 = 2.991268
					// Delay lengths:  3041     + 3385     + 4481  +  5477 = 16384 = 2^14
					// Buffer offsets: 3041    -> 6426   -> 10907 -> 16384
					const reverbDelayPos1 = (reverbDelayPos +  3041) & reverbMask;
					const reverbDelayPos2 = (reverbDelayPos +  6426) & reverbMask;
					const reverbDelayPos3 = (reverbDelayPos + 10907) & reverbMask;
					const reverbSample0 = (reverbDelayLine[reverbDelayPos]);
					const reverbSample1 = reverbDelayLine[reverbDelayPos1];
					const reverbSample2 = reverbDelayLine[reverbDelayPos2];
					const reverbSample3 = reverbDelayLine[reverbDelayPos3];
					const reverbTemp0 = -(reverbSample0 + sampleL) + reverbSample1;
					const reverbTemp1 = -(reverbSample0 + sampleR) - reverbSample1;
					const reverbTemp2 = -reverbSample2 + reverbSample3;
					const reverbTemp3 = -reverbSample2 - reverbSample3;
					const reverbShelfInput0 = (reverbTemp0 + reverbTemp2) * reverb;
					const reverbShelfInput1 = (reverbTemp1 + reverbTemp3) * reverb;
					const reverbShelfInput2 = (reverbTemp0 - reverbTemp2) * reverb;
					const reverbShelfInput3 = (reverbTemp1 - reverbTemp3) * reverb;
					reverbShelfSample0 = reverbShelfB0 * reverbShelfInput0 + reverbShelfB1 * reverbShelfPrevInput0 - reverbShelfA1 * reverbShelfSample0;
					reverbShelfSample1 = reverbShelfB0 * reverbShelfInput1 + reverbShelfB1 * reverbShelfPrevInput1 - reverbShelfA1 * reverbShelfSample1;
					reverbShelfSample2 = reverbShelfB0 * reverbShelfInput2 + reverbShelfB1 * reverbShelfPrevInput2 - reverbShelfA1 * reverbShelfSample2;
					reverbShelfSample3 = reverbShelfB0 * reverbShelfInput3 + reverbShelfB1 * reverbShelfPrevInput3 - reverbShelfA1 * reverbShelfSample3;
					reverbShelfPrevInput0 = reverbShelfInput0;
					reverbShelfPrevInput1 = reverbShelfInput1;
					reverbShelfPrevInput2 = reverbShelfInput2;
					reverbShelfPrevInput3 = reverbShelfInput3;
					reverbDelayLine[reverbDelayPos1] = reverbShelfSample0 * delayInputMult;
					reverbDelayLine[reverbDelayPos2] = reverbShelfSample1 * delayInputMult;
					reverbDelayLine[reverbDelayPos3] = reverbShelfSample2 * delayInputMult;
					reverbDelayLine[reverbDelayPos ] = reverbShelfSample3 * delayInputMult;
					reverbDelayPos = (reverbDelayPos + 1) & reverbMask;
					sampleL += reverbSample1 + reverbSample2 + reverbSample3;
					sampleR += reverbSample0 + reverbSample2 - reverbSample3;
					reverb += reverbDelta;`;
                }
                effectsSource += `
					
					outputDataL[sampleIndex] += sampleL * mixVolume;
					outputDataR[sampleIndex] += sampleR * mixVolume;
					mixVolume += mixVolumeDelta;`;
                if (usesDelays) {
                    effectsSource += `
					
					delayInputMult += delayInputMultDelta;`;
                }
                effectsSource += `
				}
				
				// Avoid persistent denormal or NaN values in the delay buffers and filter history.
				const epsilon = (1.0e-24);`;
                if (usesDistortion) {
                    effectsSource += `
				
				if (!Number.isFinite(distortionFractionalInput1) || Math.abs(distortionFractionalInput1) < epsilon) distortionFractionalInput1 = 0.0;
				if (!Number.isFinite(distortionFractionalInput2) || Math.abs(distortionFractionalInput2) < epsilon) distortionFractionalInput2 = 0.0;
				if (!Number.isFinite(distortionFractionalInput3) || Math.abs(distortionFractionalInput3) < epsilon) distortionFractionalInput3 = 0.0;
				if (!Number.isFinite(distortionPrevInput) || Math.abs(distortionPrevInput) < epsilon) distortionPrevInput = 0.0;
				if (!Number.isFinite(distortionNextOutput) || Math.abs(distortionNextOutput) < epsilon) distortionNextOutput = 0.0;
				
				instrumentState.distortionFractionalInput1 = distortionFractionalInput1;
				instrumentState.distortionFractionalInput2 = distortionFractionalInput2;
				instrumentState.distortionFractionalInput3 = distortionFractionalInput3;
				instrumentState.distortionPrevInput = distortionPrevInput;
				instrumentState.distortionNextOutput = distortionNextOutput;`;
                }
                if (usesBitcrusher) {
                    effectsSource += `
					
				if (Math.abs(bitcrusherPrevInput) < epsilon) bitcrusherPrevInput = 0.0;
				if (Math.abs(bitcrusherCurrentOutput) < epsilon) bitcrusherCurrentOutput = 0.0;
				instrumentState.bitcrusherPrevInput = bitcrusherPrevInput;
				instrumentState.bitcrusherCurrentOutput = bitcrusherCurrentOutput;
				instrumentState.bitcrusherPhase = bitcrusherPhase;`;
                }
                if (usesEqFilter) {
                    effectsSource += `
					
				synth.sanitizeFilters(filters);
				// The filter input here is downstream from another filter so we
				// better make sure it's safe too.
				if (!(initialFilterInput1 < 100) || !(initialFilterInput2 < 100)) {
					initialFilterInput1 = 0.0;
					initialFilterInput2 = 0.0;
				}
				if (Math.abs(initialFilterInput1) < epsilon) initialFilterInput1 = 0.0;
				if (Math.abs(initialFilterInput2) < epsilon) initialFilterInput2 = 0.0;
				instrumentState.initialEqFilterInput1 = initialFilterInput1;
				instrumentState.initialEqFilterInput2 = initialFilterInput2;`;
                }
                if (usesPanning) {
                    effectsSource += `
				
				beepbox.Synth.sanitizeDelayLine(panningDelayLine, panningDelayPos, panningMask);
				instrumentState.panningDelayPos = panningDelayPos;`;
                }
                if (usesChorus) {
                    effectsSource += `
				
				beepbox.Synth.sanitizeDelayLine(chorusDelayLineL, chorusDelayPos, chorusMask);
				beepbox.Synth.sanitizeDelayLine(chorusDelayLineR, chorusDelayPos, chorusMask);
				instrumentState.chorusPhase = chorusPhase;
				instrumentState.chorusDelayPos = chorusDelayPos;`;
                }
                if (usesEcho) {
                    effectsSource += `
				
				beepbox.Synth.sanitizeDelayLine(echoDelayLineL, echoDelayPos, echoMask);
				beepbox.Synth.sanitizeDelayLine(echoDelayLineR, echoDelayPos, echoMask);
				instrumentState.echoDelayPos = echoDelayPos;
				
				if (!Number.isFinite(echoShelfSampleL) || Math.abs(echoShelfSampleL) < epsilon) echoShelfSampleL = 0.0;
				if (!Number.isFinite(echoShelfSampleR) || Math.abs(echoShelfSampleR) < epsilon) echoShelfSampleR = 0.0;
				if (!Number.isFinite(echoShelfPrevInputL) || Math.abs(echoShelfPrevInputL) < epsilon) echoShelfPrevInputL = 0.0;
				if (!Number.isFinite(echoShelfPrevInputR) || Math.abs(echoShelfPrevInputR) < epsilon) echoShelfPrevInputR = 0.0;
				instrumentState.echoShelfSampleL = echoShelfSampleL;
				instrumentState.echoShelfSampleR = echoShelfSampleR;
				instrumentState.echoShelfPrevInputL = echoShelfPrevInputL;
				instrumentState.echoShelfPrevInputR = echoShelfPrevInputR;`;
                }
                if (usesReverb) {
                    effectsSource += `
				
				beepbox.Synth.sanitizeDelayLine(reverbDelayLine, reverbDelayPos        , reverbMask);
				beepbox.Synth.sanitizeDelayLine(reverbDelayLine, reverbDelayPos +  3041, reverbMask);
				beepbox.Synth.sanitizeDelayLine(reverbDelayLine, reverbDelayPos +  6426, reverbMask);
				beepbox.Synth.sanitizeDelayLine(reverbDelayLine, reverbDelayPos + 10907, reverbMask);
				instrumentState.reverbDelayPos  = reverbDelayPos;
				
				if (!Number.isFinite(reverbShelfSample0) || Math.abs(reverbShelfSample0) < epsilon) reverbShelfSample0 = 0.0;
				if (!Number.isFinite(reverbShelfSample1) || Math.abs(reverbShelfSample1) < epsilon) reverbShelfSample1 = 0.0;
				if (!Number.isFinite(reverbShelfSample2) || Math.abs(reverbShelfSample2) < epsilon) reverbShelfSample2 = 0.0;
				if (!Number.isFinite(reverbShelfSample3) || Math.abs(reverbShelfSample3) < epsilon) reverbShelfSample3 = 0.0;
				if (!Number.isFinite(reverbShelfPrevInput0) || Math.abs(reverbShelfPrevInput0) < epsilon) reverbShelfPrevInput0 = 0.0;
				if (!Number.isFinite(reverbShelfPrevInput1) || Math.abs(reverbShelfPrevInput1) < epsilon) reverbShelfPrevInput1 = 0.0;
				if (!Number.isFinite(reverbShelfPrevInput2) || Math.abs(reverbShelfPrevInput2) < epsilon) reverbShelfPrevInput2 = 0.0;
				if (!Number.isFinite(reverbShelfPrevInput3) || Math.abs(reverbShelfPrevInput3) < epsilon) reverbShelfPrevInput3 = 0.0;
				instrumentState.reverbShelfSample0 = reverbShelfSample0;
				instrumentState.reverbShelfSample1 = reverbShelfSample1;
				instrumentState.reverbShelfSample2 = reverbShelfSample2;
				instrumentState.reverbShelfSample3 = reverbShelfSample3;
				instrumentState.reverbShelfPrevInput0 = reverbShelfPrevInput0;
				instrumentState.reverbShelfPrevInput1 = reverbShelfPrevInput1;
				instrumentState.reverbShelfPrevInput2 = reverbShelfPrevInput2;
				instrumentState.reverbShelfPrevInput3 = reverbShelfPrevInput3;`;
                }
                effectsFunction = new Function("synth", "outputDataL", "outputDataR", "bufferIndex", "runLength", "instrument", "instrumentState", effectsSource);
                Synth.effectsFunctionCache[signature] = effectsFunction;
            }
            effectsFunction(synth, outputDataL, outputDataR, bufferIndex, runLength, instrument, instrumentState);
        }
        static pulseWidthSynth(synth, bufferIndex, runLength, tone, instrument) {
            const data = synth.tempMonoInstrumentSampleBuffer;
            let phaseDelta = tone.phaseDeltas[0];
            const phaseDeltaScale = +tone.phaseDeltaScales[0];
            let expression = +tone.expressionStarts[0];
            const expressionDelta = +tone.expressionDeltas[0];
            let phase = (tone.phases[0] % 1);
            let pulseWidth = tone.pulseWidth;
            const pulseWidthDelta = tone.pulseWidthDelta;
            const filters = tone.noteFilters;
            const filterCount = tone.noteFilterCount | 0;
            let initialFilterInput1 = +tone.initialNoteFilterInput1;
            let initialFilterInput2 = +tone.initialNoteFilterInput2;
            const applyFilters = Synth.applyFilters;
            const stopIndex = bufferIndex + runLength;
            for (let sampleIndex = bufferIndex; sampleIndex < stopIndex; sampleIndex++) {
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
                const inputSample = pulseWave;
                const sample = applyFilters(inputSample, initialFilterInput1, initialFilterInput2, filterCount, filters);
                initialFilterInput2 = initialFilterInput1;
                initialFilterInput1 = inputSample;
                phase += phaseDelta;
                phaseDelta *= phaseDeltaScale;
                pulseWidth += pulseWidthDelta;
                const output = sample * expression;
                expression += expressionDelta;
                data[sampleIndex] += output;
            }
            tone.phases[0] = phase;
            synth.sanitizeFilters(filters);
            tone.initialNoteFilterInput1 = initialFilterInput1;
            tone.initialNoteFilterInput2 = initialFilterInput2;
        }
        static noiseSynth(synth, bufferIndex, runLength, tone, instrument) {
            const data = synth.tempMonoInstrumentSampleBuffer;
            let wave = instrument.getDrumWave();
            let phaseDelta = +tone.phaseDeltas[0];
            const phaseDeltaScale = +tone.phaseDeltaScales[0];
            let expression = +tone.expressionStarts[0];
            const expressionDelta = +tone.expressionDeltas[0];
            let phase = (tone.phases[0] % 1) * Config.chipNoiseLength;
            if (tone.phases[0] == 0) {
                phase = Math.random() * Config.chipNoiseLength;
            }
            const phaseMask = Config.chipNoiseLength - 1;
            let noiseSample = +tone.sample;
            const filters = tone.noteFilters;
            const filterCount = tone.noteFilterCount | 0;
            let initialFilterInput1 = +tone.initialNoteFilterInput1;
            let initialFilterInput2 = +tone.initialNoteFilterInput2;
            const applyFilters = Synth.applyFilters;
            const pitchRelativefilter = Math.min(1.0, tone.phaseDeltas[0] * Config.chipNoises[instrument.chipNoise].pitchFilterMult);
            const stopIndex = bufferIndex + runLength;
            for (let sampleIndex = bufferIndex; sampleIndex < stopIndex; sampleIndex++) {
                const waveSample = wave[phase & phaseMask];
                noiseSample += (waveSample - noiseSample) * pitchRelativefilter;
                const inputSample = noiseSample;
                const sample = applyFilters(inputSample, initialFilterInput1, initialFilterInput2, filterCount, filters);
                initialFilterInput2 = initialFilterInput1;
                initialFilterInput1 = inputSample;
                phase += phaseDelta;
                phaseDelta *= phaseDeltaScale;
                const output = sample * expression;
                expression += expressionDelta;
                data[sampleIndex] += output;
            }
            tone.phases[0] = phase / Config.chipNoiseLength;
            tone.sample = noiseSample;
            synth.sanitizeFilters(filters);
            tone.initialNoteFilterInput1 = initialFilterInput1;
            tone.initialNoteFilterInput2 = initialFilterInput2;
        }
        static spectrumSynth(synth, bufferIndex, runLength, tone, instrument) {
            const data = synth.tempMonoInstrumentSampleBuffer;
            let wave = instrument.getDrumWave();
            let phaseDelta = tone.phaseDeltas[0] * (1 << 7);
            const phaseDeltaScale = +tone.phaseDeltaScales[0];
            let expression = +tone.expressionStarts[0];
            const expressionDelta = +tone.expressionDeltas[0];
            let noiseSample = +tone.sample;
            const filters = tone.noteFilters;
            const filterCount = tone.noteFilterCount | 0;
            let initialFilterInput1 = +tone.initialNoteFilterInput1;
            let initialFilterInput2 = +tone.initialNoteFilterInput2;
            const applyFilters = Synth.applyFilters;
            let phase = (tone.phases[0] % 1) * Config.spectrumNoiseLength;
            if (tone.phases[0] == 0)
                phase = Synth.findRandomZeroCrossing(wave, Config.spectrumNoiseLength) + phaseDelta;
            const phaseMask = Config.spectrumNoiseLength - 1;
            const pitchRelativefilter = Math.min(1.0, phaseDelta);
            const stopIndex = bufferIndex + runLength;
            for (let sampleIndex = bufferIndex; sampleIndex < stopIndex; sampleIndex++) {
                const phaseInt = phase | 0;
                const index = phaseInt & phaseMask;
                let waveSample = wave[index];
                const phaseRatio = phase - phaseInt;
                waveSample += (wave[index + 1] - waveSample) * phaseRatio;
                noiseSample += (waveSample - noiseSample) * pitchRelativefilter;
                const inputSample = noiseSample;
                const sample = applyFilters(inputSample, initialFilterInput1, initialFilterInput2, filterCount, filters);
                initialFilterInput2 = initialFilterInput1;
                initialFilterInput1 = inputSample;
                phase += phaseDelta;
                phaseDelta *= phaseDeltaScale;
                const output = sample * expression;
                expression += expressionDelta;
                data[sampleIndex] += output;
            }
            tone.phases[0] = phase / Config.spectrumNoiseLength;
            tone.sample = noiseSample;
            synth.sanitizeFilters(filters);
            tone.initialNoteFilterInput1 = initialFilterInput1;
            tone.initialNoteFilterInput2 = initialFilterInput2;
        }
        static drumsetSynth(synth, bufferIndex, runLength, tone, instrument) {
            const data = synth.tempMonoInstrumentSampleBuffer;
            let wave = instrument.getDrumsetWave(tone.drumsetPitch);
            let phaseDelta = tone.phaseDeltas[0] / Instrument.drumsetIndexReferenceDelta(tone.drumsetPitch);
            const phaseDeltaScale = +tone.phaseDeltaScales[0];
            let expression = +tone.expressionStarts[0];
            const expressionDelta = +tone.expressionDeltas[0];
            const filters = tone.noteFilters;
            const filterCount = tone.noteFilterCount | 0;
            let initialFilterInput1 = +tone.initialNoteFilterInput1;
            let initialFilterInput2 = +tone.initialNoteFilterInput2;
            const applyFilters = Synth.applyFilters;
            let phase = (tone.phases[0] % 1) * Config.spectrumNoiseLength;
            if (tone.phases[0] == 0)
                phase = Synth.findRandomZeroCrossing(wave, Config.spectrumNoiseLength) + phaseDelta;
            const phaseMask = Config.spectrumNoiseLength - 1;
            const stopIndex = bufferIndex + runLength;
            for (let sampleIndex = bufferIndex; sampleIndex < stopIndex; sampleIndex++) {
                const phaseInt = phase | 0;
                const index = phaseInt & phaseMask;
                let noiseSample = wave[index];
                const phaseRatio = phase - phaseInt;
                noiseSample += (wave[index + 1] - noiseSample) * phaseRatio;
                const inputSample = noiseSample;
                const sample = applyFilters(inputSample, initialFilterInput1, initialFilterInput2, filterCount, filters);
                initialFilterInput2 = initialFilterInput1;
                initialFilterInput1 = inputSample;
                phase += phaseDelta;
                phaseDelta *= phaseDeltaScale;
                const output = sample * expression;
                expression += expressionDelta;
                data[sampleIndex] += output;
            }
            tone.phases[0] = phase / Config.spectrumNoiseLength;
            synth.sanitizeFilters(filters);
            tone.initialNoteFilterInput1 = initialFilterInput1;
            tone.initialNoteFilterInput2 = initialFilterInput2;
        }
        static findRandomZeroCrossing(wave, waveLength) {
            let phase = Math.random() * waveLength;
            const phaseMask = waveLength - 1;
            let indexPrev = phase & phaseMask;
            let wavePrev = wave[indexPrev];
            const stride = 16;
            for (let attemptsRemaining = 128; attemptsRemaining > 0; attemptsRemaining--) {
                const indexNext = (indexPrev + stride) & phaseMask;
                const waveNext = wave[indexNext];
                if (wavePrev * waveNext <= 0.0) {
                    for (let i = 0; i < stride; i++) {
                        const innerIndexNext = (indexPrev + 1) & phaseMask;
                        const innerWaveNext = wave[innerIndexNext];
                        if (wavePrev * innerWaveNext <= 0.0) {
                            const slope = innerWaveNext - wavePrev;
                            phase = indexPrev;
                            if (Math.abs(slope) > 0.00000001) {
                                phase += -wavePrev / slope;
                            }
                            phase = Math.max(0, phase) % waveLength;
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
            return (volumeMult <= 0.0) ? Config.volumeRange - 1 : Math.min(Config.volumeRange - 2, Math.log2(volumeMult) / Config.volumeLogScale);
        }
        static noteSizeToVolumeMult(size) {
            return Math.pow(Math.max(0.0, size) / Config.noteSizeMax, 1.5);
        }
        static volumeMultToNoteSize(volumeMult) {
            return Math.pow(Math.max(0.0, volumeMult), 1 / 1.5) * Config.noteSizeMax;
        }
        static fadeInSettingToSeconds(setting) {
            return 0.0125 * (0.95 * setting + 0.05 * setting * setting);
        }
        static secondsToFadeInSetting(seconds) {
            return clamp(0, Config.fadeInRange, Math.round((-0.95 + Math.sqrt(0.9025 + 0.2 * seconds / 0.0125)) / 0.1));
        }
        static fadeOutSettingToTicks(setting) {
            return Config.fadeOutTicks[setting];
        }
        static ticksToFadeOutSetting(ticks) {
            let lower = Config.fadeOutTicks[0];
            if (ticks <= lower)
                return 0;
            for (let i = 1; i < Config.fadeOutTicks.length; i++) {
                let upper = Config.fadeOutTicks[i];
                if (ticks <= upper)
                    return (ticks < (lower + upper) / 2) ? i - 1 : i;
                lower = upper;
            }
            return Config.fadeOutTicks.length - 1;
        }
        static detuneToCents(detune) {
            return detune * (Math.abs(detune) + 1) / 2;
        }
        static centsToDetune(cents) {
            return Math.sign(cents) * (Math.sqrt(1 + 8 * Math.abs(cents)) - 1) / 2.0;
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
        static fittingPowerOfTwo(x) {
            return 1 << (32 - Math.clz32(Math.ceil(x) - 1));
        }
        sanitizeFilters(filters) {
            let reset = false;
            for (const filter of filters) {
                const output1 = Math.abs(filter.output1);
                const output2 = Math.abs(filter.output2);
                if (!(output1 < 100) || !(output2 < 100)) {
                    reset = true;
                    break;
                }
                if (output1 < epsilon)
                    filter.output1 = 0.0;
                if (output2 < epsilon)
                    filter.output2 = 0.0;
            }
            if (reset) {
                for (const filter of filters) {
                    filter.output1 = 0.0;
                    filter.output2 = 0.0;
                }
            }
        }
        static sanitizeDelayLine(delayLine, lastIndex, mask) {
            while (true) {
                lastIndex--;
                const index = lastIndex & mask;
                const sample = Math.abs(delayLine[index]);
                if (Number.isFinite(sample) && (sample == 0.0 || sample >= epsilon))
                    break;
                delayLine[index] = 0.0;
            }
        }
        static applyFilters(sample, input1, input2, filterCount, filters) {
            for (let i = 0; i < filterCount; i++) {
                const filter = filters[i];
                const output1 = filter.output1;
                const output2 = filter.output2;
                const a1 = filter.a1;
                const a2 = filter.a2;
                const b0 = filter.b0;
                const b1 = filter.b1;
                const b2 = filter.b2;
                sample = b0 * sample + b1 * input1 + b2 * input2 - a1 * output1 - a2 * output2;
                filter.a1 = a1 + filter.a1Delta;
                filter.a2 = a2 + filter.a2Delta;
                if (filter.useMultiplicativeInputCoefficients) {
                    filter.b0 = b0 * filter.b0Delta;
                    filter.b1 = b1 * filter.b1Delta;
                    filter.b2 = b2 * filter.b2Delta;
                }
                else {
                    filter.b0 = b0 + filter.b0Delta;
                    filter.b1 = b1 + filter.b1Delta;
                    filter.b2 = b2 + filter.b2Delta;
                }
                filter.output2 = output1;
                filter.output1 = sample;
                input2 = output2;
                input1 = output1;
            }
            return sample;
        }
    }
    Synth.tempFilterStartCoefficients = new FilterCoefficients();
    Synth.tempFilterEndCoefficients = new FilterCoefficients();
    Synth.fmSynthFunctionCache = {};
    Synth.effectsFunctionCache = Array(1 << 7).fill(undefined);
    Synth.pickedStringFunctionCache = Array(3).fill(undefined);
    Synth.fmSourceTemplate = (`
		const data = synth.tempMonoInstrumentSampleBuffer;
		const sineWave = beepbox.Config.sineWave;
		
		// I'm adding 1000 to the phase to ensure that it's never negative even when modulated by other waves because negative numbers don't work with the modulus operator very well.
		let operator#Phase       = +((tone.phases[#] % 1) + 1000) * beepbox.Config.sineWaveLength;
		let operator#PhaseDelta  = +tone.phaseDeltas[#];
		let operator#PhaseDeltaScale = +tone.phaseDeltaScales[#];
		let operator#OutputMult  = +tone.expressionStarts[#];
		const operator#OutputDelta = +tone.expressionDeltas[#];
		let operator#Output      = +tone.feedbackOutputs[#];
		let feedbackMult         = +tone.feedbackMult;
		const feedbackDelta      = +tone.feedbackDelta;
		
		const filters = tone.noteFilters;
		const filterCount = tone.noteFilterCount|0;
		let initialFilterInput1 = +tone.initialNoteFilterInput1;
		let initialFilterInput2 = +tone.initialNoteFilterInput2;
		const applyFilters = beepbox.Synth.applyFilters;
		
		const stopIndex = bufferIndex + runLength;
		for (let sampleIndex = bufferIndex; sampleIndex < stopIndex; sampleIndex++) {
			// INSERT OPERATOR COMPUTATION HERE
			const fmOutput = (/*operator#Scaled*/); // CARRIER OUTPUTS
			
			const inputSample = fmOutput;
			const sample = applyFilters(inputSample, initialFilterInput1, initialFilterInput2, filterCount, filters);
			initialFilterInput2 = initialFilterInput1;
			initialFilterInput1 = inputSample;
			
			feedbackMult += feedbackDelta;
			operator#OutputMult += operator#OutputDelta;
			operator#Phase += operator#PhaseDelta;
			operator#PhaseDelta *= operator#PhaseDeltaScale;
			
			data[sampleIndex] += sample;
		}
		
		tone.phases[#] = operator#Phase / ` + Config.sineWaveLength + `;
		tone.feedbackOutputs[#] = operator#Output;
		
		synth.sanitizeFilters(filters);
		tone.initialNoteFilterInput1 = initialFilterInput1;
		tone.initialNoteFilterInput2 = initialFilterInput2;
	`).split("\n");
    Synth.operatorSourceTemplate = (`
			const operator#PhaseMix = operator#Phase/* + operator@Scaled*/;
			const operator#PhaseInt = operator#PhaseMix|0;
			const operator#Index    = operator#PhaseInt & ` + Config.sineWaveMask + `;
			const operator#Sample   = sineWave[operator#Index];
			operator#Output         = operator#Sample + (sineWave[operator#Index + 1] - operator#Sample) * (operator#PhaseMix - operator#PhaseInt);
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
    function loadSong(songString, reuseParams) {
        synth.setSong(songString);
        synth.snapToStart();
        const updatedSongString = synth.song.toBase64String();
        editLink.href = "../#" + updatedSongString;
        const hashQueryParams = new URLSearchParams(reuseParams ? location.hash.slice(1) : "");
        hashQueryParams.set("song", updatedSongString);
        location.hash = hashQueryParams.toString();
    }
    function hashUpdatedExternally() {
        let myHash = location.hash;
        if (prevHash == myHash || myHash == "")
            return;
        prevHash = myHash;
        if (myHash.charAt(0) == "#") {
            myHash = myHash.substring(1);
        }
        fullscreenLink.href = location.href;
        for (const parameter of myHash.split("&")) {
            let equalsIndex = parameter.indexOf("=");
            if (equalsIndex != -1) {
                let paramName = parameter.substring(0, equalsIndex);
                let value = parameter.substring(equalsIndex + 1);
                switch (paramName) {
                    case "song":
                        loadSong(value, true);
                        break;
                    case "loop":
                        synth.loopRepeatCount = (value != "1") ? 0 : -1;
                        renderLoopIcon();
                        break;
                }
            }
            else {
                loadSong(myHash, false);
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

            for (var i = 0; i < notesByAgzam4.length; i++) {
                let note = notesByAgzam4[i];
                let offsetX = notesXByAgzam4[i];

                let pos = synth.playhead / synth.song.barCount;



                //console.log(offsetX + "/" + timelineWidth * pos);

                // #AGZAM4
                let color = makeColorDarker(notesColorsByAgzam4[i], 0.25);//ColorConfig.getChannelColor(synth.song, notesChannelsByAgzam4[i]).primaryChannel;
                let shadowColor = makeColorDarker(notesColorsByAgzam4[i], 0.25);//ColorConfig.getChannelColor(synth.song, notesChannelsByAgzam4[i]).primaryChannel;
                let shadowSize = 0;
                if(offsetX < timelineWidth * pos) {
                    let k = (timelineWidth * pos - offsetX)*0.01;
                    color = makeColorBrighter(notesColorsByAgzam4[i], k + 0.25);
                    if(k > 1) k = 1;
                    if(k < 0) k = 0;
                    shadowColor = makeColorBrighter(notesColorsByAgzam4[i], k);
                    shadowSize = 5 + k*5;
                }else{

                }
                note.setAttribute("fill", color);
                note.setAttribute("filter", "drop-shadow(0 0 " + shadowSize + "px " + shadowColor + ")");
            }
            // for (let channel = synth.song.channels.length - 1; channel >= 0; channel--) {
            //     const isNoise = synth.song.getChannelIsNoise(channel);
            //     const pitchHeight = isNoise ? drumPitchHeight : wavePitchHeight;
            //     const configuredOctaveScroll = synth.song.channels[channel].octave;
            //     const newOctaveScroll = Math.max(0, Math.min(Config.pitchOctaves - windowOctaves, Math.ceil(configuredOctaveScroll - windowOctaves * 0.5)));
            //     const offsetY = newOctaveScroll * pitchHeight * 12 + timelineHeight - pitchHeight * 0.5 - 0.5;
            //     for (let bar = 0; bar < synth.song.barCount; bar++) {
            //         const pattern = synth.song.getPattern(channel, bar);
            //         if (pattern == null)
            //             continue;

            //         // #NEED
            //         const offsetX = bar * barWidth;
            //         for (let i = 0; i < pattern.notes.length; i++) {
            //             const note = pattern.notes[i];
            //             for (const pitch of note.pitches) {
            //                 const d = drawNote(pitch, note.start, note.pins, (pitchHeight + 1) / 2, offsetX, offsetY, partWidth, pitchHeight);
            //                 let color = ColorConfig.getChannelColor(synth.song, channel).primaryChannel;

            //                 let pos = synth.playhead / synth.song.barCount;

            //                 console.log(offsetX + "/" + timelineWidth * pos);
            //                 if(offsetX < timelineWidth * pos) {
            //                     color = "#FFF";
            //                 }

            //                 const noteElement = path({ d: d, fill: color });
            //                 if (isNoise) noteElement.style.opacity = String(0.6);
            //                 timeline.appendChild(noteElement);
            //             }
            //         }
            //     }
            // }
        }
    }

     function makeColorBrighter(hex, k) {
        // #AGZAM4
        var R = 0;
        var G = 0;
        var B = 0;
        if(hex.length == 3) {
            R = parseInt(hex.substring(0,1),16);
            G = parseInt(hex.substring(1,2),16);
            B = parseInt(hex.substring(2,3),16);
        }else {
            R = parseInt(hex.substring(0,2),16);
            G = parseInt(hex.substring(2,4),16);
            B = parseInt(hex.substring(4,6),16);
        }
        if(k < 0) k = 0;
        if(k > 1) k = 1;
        let iR = 255;//119;
        let iG = 255;//68;
        let iB = 255;
        R = (R-iR)*k+iR;
        G = (G-iG)*k+iG;
        B = (B-iB)*k+iB;

        return "rgb("+R+","+G+","+B+")";
    }

    function makeColorDarker(hex, k) {
        // #AGZAM4
        var R = 0;
        var G = 0;
        var B = 0;
        if(hex.length == 3) {
            R = parseInt(hex.substring(0,1),16);
            G = parseInt(hex.substring(1,2),16);
            B = parseInt(hex.substring(2,3),16);
        }else {
            R = parseInt(hex.substring(0,2),16);
            G = parseInt(hex.substring(2,4),16);
            B = parseInt(hex.substring(4,6),16);
        }
        if(k < 0) k = 0;
        if(k > 1) k = 1;
        let iR = 0;
        let iG = 0;
        let iB = 0;
        R = (R-iR)*k+iR;
        G = (G-iG)*k+iG;
        B = (B-iB)*k+iB;

        return "rgb("+R+","+G+","+B+")";
    }

    let notesByAgzam4 = [];             // #AGZAM4
    let notesXByAgzam4 = [];            // #AGZAM4
    let notesChannelsByAgzam4 = [];     // #AGZAM4
    let notesColorsByAgzam4 = [];       // #AGZAM4



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
            windowOctaves = Math.max(1, Math.min(Config.pitchOctaves, Math.round(timelineHeight / (12 * 2))));
            windowPitchCount = windowOctaves * 12 + 1;
            const semitoneHeight = (timelineHeight - 1) / windowPitchCount;
            const targetBeatWidth = Math.max(8, semitoneHeight * 4);
            timelineWidth = Math.max(boundingRect.width, targetBeatWidth * synth.song.barCount * synth.song.beatsPerBar);
        }
        else {
            timelineWidth = boundingRect.width;
            const targetSemitoneHeight = Math.max(1, timelineWidth / (synth.song.barCount * synth.song.beatsPerBar) / 3);
            timelineHeight = Math.min(boundingRect.height, targetSemitoneHeight * (Config.maxPitch + 1) + 1);
            windowOctaves = Math.max(3, Math.min(Config.pitchOctaves, Math.round(timelineHeight / (12 * targetSemitoneHeight))));
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
            const newOctaveScroll = Math.max(0, Math.min(Config.pitchOctaves - windowOctaves, Math.ceil(configuredOctaveScroll - windowOctaves * 0.5)));
            const offsetY = newOctaveScroll * pitchHeight * 12 + timelineHeight - pitchHeight * 0.5 - 0.5;
            for (let bar = 0; bar < synth.song.barCount; bar++) {
                const pattern = synth.song.getPattern(channel, bar);
                if (pattern == null)
                    continue;
                const offsetX = bar * barWidth;
                for (let i = 0; i < pattern.notes.length; i++) {
                    const note = pattern.notes[i];
                    for (const pitch of note.pitches) {
                        // #AGZAM4
                        const d = drawNote(pitch, note.start, note.pins, (pitchHeight + 1) / 2, offsetX, offsetY, partWidth, pitchHeight);
                        var rootStyles = getComputedStyle(document.querySelector(':root')); // #AGZAM4
                        var hex = rootStyles.getPropertyValue(
                            ColorConfig.getChannelColor(synth.song, channel).primaryChannel.replace("var(", "").replace(")", "")
                        ).replaceAll("#", "").replaceAll(" ", ""); // #AGZAM4

                        const noteElement = path({ d: d, fill: "#000"});

                        notesByAgzam4.push(noteElement); // #AGZAM4
                        notesXByAgzam4.push(offsetX + partWidth * (note.start)); // #AGZAM4
                        notesChannelsByAgzam4.push(channel); // #AGZAM4
                        notesColorsByAgzam4.push(hex); // #AGZAM4

                        if (isNoise) noteElement.style.opacity = String(0.6);
                        timeline.appendChild(noteElement);
                    }
                }
            }
        }
        renderPlayhead();
    }
    function drawNote(pitch, start, pins, radius, offsetX, offsetY, partWidth, pitchHeight) {
        let d = `M ${offsetX + partWidth * (start + pins[0].time)} ${offsetY - pitch * pitchHeight + radius * (pins[0].size / Config.noteSizeMax)} `;
        for (let i = 0; i < pins.length; i++) {
            const pin = pins[i];
            const x = offsetX + partWidth * (start + pin.time);
            const y = offsetY - pitchHeight * (pitch + pin.interval);
            const expression = pin.size / Config.noteSizeMax;
            d += `L ${x} ${y - radius * expression} `;
        }
        for (let i = pins.length - 1; i >= 0; i--) {
            const pin = pins[i];
            const x = offsetX + partWidth * (start + pin.time);
            const y = offsetY - pitchHeight * (pitch + pin.interval);
            const expression = pin.size / Config.noteSizeMax;
            d += `L ${x} ${y + radius * expression} `;
        }
        return d;
    }
    function renderPlayButton() {
        if (synth.playing) {
            playButton.classList.remove("playButton");
            playButton.classList.add("pauseButton");
            playButton.title = "Pause (Space)";
            playButton.textContent = "Pause";
        }
        else {
            playButton.classList.remove("pauseButton");
            playButton.classList.add("playButton");
            playButton.title = "Play (Space)";
            playButton.textContent = "Play";
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
                synth.goToPrevBar();
                renderPlayhead();
                event.preventDefault();
                break;
            case 221:
                synth.goToNextBar();
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
        textField.textContent = location.href;
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

})({});
//# sourceMappingURL=beepbox_player.js.map
