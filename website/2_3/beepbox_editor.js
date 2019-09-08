var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var beepbox;
(function (beepbox) {
    function scaleElementsByFactor(array, factor) {
        for (var i = 0; i < array.length; i++) {
            array[i] *= factor;
        }
    }
    beepbox.scaleElementsByFactor = scaleElementsByFactor;
    function isPowerOf2(n) {
        return !!n && !(n & (n - 1));
    }
    function countBits(n) {
        if (!isPowerOf2(n))
            throw new Error("FFT array length must be a power of 2.");
        return Math.round(Math.log(n) / Math.log(2));
    }
    function reverseIndexBits(array) {
        var fullArrayLength = array.length;
        var bitCount = countBits(fullArrayLength);
        if (bitCount > 16)
            throw new Error("FFT array length must not be greater than 2^16.");
        var finalShift = 16 - bitCount;
        for (var i = 0; i < fullArrayLength; i++) {
            var j = void 0;
            j = ((i & 0xaaaa) >> 1) | ((i & 0x5555) << 1);
            j = ((j & 0xcccc) >> 2) | ((j & 0x3333) << 2);
            j = ((j & 0xf0f0) >> 4) | ((j & 0x0f0f) << 4);
            j = ((j >> 8) | ((j & 0xff) << 8)) >> finalShift;
            if (j > i) {
                var temp = array[i];
                array[i] = array[j];
                array[j] = temp;
            }
        }
    }
    function inverseRealFourierTransform(array) {
        var fullArrayLength = array.length;
        var totalPasses = countBits(fullArrayLength);
        if (fullArrayLength < 4)
            throw new Error("FFT array length must be at least 4.");
        for (var pass = totalPasses - 1; pass >= 2; pass--) {
            var subStride = 1 << pass;
            var midSubStride = subStride >> 1;
            var stride = subStride << 1;
            var radiansIncrement = Math.PI * 2.0 / stride;
            var cosIncrement = Math.cos(radiansIncrement);
            var sinIncrement = Math.sin(radiansIncrement);
            var oscillatorMultiplier = 2.0 * cosIncrement;
            for (var startIndex = 0; startIndex < fullArrayLength; startIndex += stride) {
                var startIndexA = startIndex;
                var midIndexA = startIndexA + midSubStride;
                var startIndexB = startIndexA + subStride;
                var midIndexB = startIndexB + midSubStride;
                var stopIndex = startIndexB + subStride;
                var realStartA = array[startIndexA];
                var imagStartB = array[startIndexB];
                array[startIndexA] = realStartA + imagStartB;
                array[midIndexA] *= 2;
                array[startIndexB] = realStartA - imagStartB;
                array[midIndexB] *= 2;
                var c = cosIncrement;
                var s = -sinIncrement;
                var cPrev = 1.0;
                var sPrev = 0.0;
                for (var index = 1; index < midSubStride; index++) {
                    var indexA0 = startIndexA + index;
                    var indexA1 = startIndexB - index;
                    var indexB0 = startIndexB + index;
                    var indexB1 = stopIndex - index;
                    var real0 = array[indexA0];
                    var real1 = array[indexA1];
                    var imag0 = array[indexB0];
                    var imag1 = array[indexB1];
                    var tempA = real0 - real1;
                    var tempB = imag0 + imag1;
                    array[indexA0] = real0 + real1;
                    array[indexA1] = imag1 - imag0;
                    array[indexB0] = tempA * c - tempB * s;
                    array[indexB1] = tempB * c + tempA * s;
                    var cTemp = oscillatorMultiplier * c - cPrev;
                    var sTemp = oscillatorMultiplier * s - sPrev;
                    cPrev = c;
                    sPrev = s;
                    c = cTemp;
                    s = sTemp;
                }
            }
        }
        for (var index = 0; index < fullArrayLength; index += 4) {
            var index1 = index + 1;
            var index2 = index + 2;
            var index3 = index + 3;
            var real0 = array[index];
            var real1 = array[index1] * 2;
            var imag2 = array[index2];
            var imag3 = array[index3] * 2;
            var tempA = real0 + imag2;
            var tempB = real0 - imag2;
            array[index] = tempA + real1;
            array[index1] = tempA - real1;
            array[index2] = tempB + imag3;
            array[index3] = tempB - imag3;
        }
        reverseIndexBits(array);
    }
    beepbox.inverseRealFourierTransform = inverseRealFourierTransform;
})(beepbox || (beepbox = {}));
var beepbox;
(function (beepbox) {
    var samplesAccumulated = 0;
    var samplePerformance = 0;
    var Config = (function () {
        function Config() {
        }
        Config._centerWave = function (wave) {
            var sum = 0.0;
            for (var i = 0; i < wave.length; i++)
                sum += wave[i];
            var average = sum / wave.length;
            for (var i = 0; i < wave.length; i++)
                wave[i] -= average;
            return new Float64Array(wave);
        };
        Config.getDrumWave = function (index) {
            var wave = Config._drumWaves[index];
            if (wave == null) {
                wave = new Float32Array(32768);
                Config._drumWaves[index] = wave;
                if (index == 0) {
                    var drumBuffer = 1;
                    for (var i = 0; i < 32768; i++) {
                        wave[i] = (drumBuffer & 1) * 2.0 - 1.0;
                        var newBuffer = drumBuffer >> 1;
                        if (((drumBuffer + newBuffer) & 1) == 1) {
                            newBuffer += 1 << 14;
                        }
                        drumBuffer = newBuffer;
                    }
                }
                else if (index == 1) {
                    for (var i = 0; i < 32768; i++) {
                        wave[i] = Math.random() * 2.0 - 1.0;
                    }
                }
                else if (index == 2) {
                    var drumBuffer = 1;
                    for (var i = 0; i < 32768; i++) {
                        wave[i] = (drumBuffer & 1) * 2.0 - 1.0;
                        var newBuffer = drumBuffer >> 1;
                        if (((drumBuffer + newBuffer) & 1) == 1) {
                            newBuffer += 2 << 14;
                        }
                        drumBuffer = newBuffer;
                    }
                }
                else if (index == 3) {
                    var drumBuffer = 1;
                    for (var i = 0; i < 32768; i++) {
                        wave[i] = (drumBuffer & 1) * 2.0 - 1.0;
                        var newBuffer = drumBuffer >> 1;
                        if (((drumBuffer + newBuffer) & 1) == 1) {
                            newBuffer += 10 << 2;
                        }
                        drumBuffer = newBuffer;
                    }
                }
                else if (index == 4) {
                    Config.drawNoiseSpectrum(wave, 10, 11, 1, 1, 0);
                    Config.drawNoiseSpectrum(wave, 11, 14, -2, -2, 0);
                    beepbox.inverseRealFourierTransform(wave);
                    beepbox.scaleElementsByFactor(wave, 1.0 / Math.sqrt(wave.length));
                }
                else {
                    throw new Error("Unrecognized drum index: " + index);
                }
            }
            return wave;
        };
        Config.drawNoiseSpectrum = function (wave, lowOctave, highOctave, lowPower, highPower, overalSlope) {
            var referenceOctave = 11;
            var referenceIndex = 1 << referenceOctave;
            var lowIndex = Math.pow(2, lowOctave) | 0;
            var highIndex = Math.pow(2, highOctave) | 0;
            var log2 = Math.log(2);
            for (var i = lowIndex; i < highIndex; i++) {
                var amplitude = Math.pow(2, lowPower + (highPower - lowPower) * (Math.log(i) / log2 - lowOctave) / (highOctave - lowOctave));
                amplitude *= Math.pow(i / referenceIndex, overalSlope);
                var radians = Math.random() * Math.PI * 2.0;
                wave[i] = Math.cos(radians) * amplitude;
                wave[32768 - i] = Math.sin(radians) * amplitude;
            }
        };
        Config.generateSineWave = function () {
            var wave = new Float64Array(Config.sineWaveLength + 1);
            for (var i = 0; i < Config.sineWaveLength + 1; i++) {
                wave[i] = Math.sin(i * Math.PI * 2.0 / Config.sineWaveLength);
            }
            return wave;
        };
        Config.scaleNames = ["easy :)", "easy :(", "island :)", "island :(", "blues :)", "blues :(", "normal :)", "normal :(", "dbl harmonic :)", "dbl harmonic :(", "enigma", "expert"];
        Config.scaleFlags = [
            [true, false, true, false, true, false, false, true, false, true, false, false],
            [true, false, false, true, false, true, false, true, false, false, true, false],
            [true, false, false, false, true, true, false, true, false, false, false, true],
            [true, true, false, true, false, false, false, true, true, false, false, false],
            [true, false, true, true, true, false, false, true, false, true, false, false],
            [true, false, false, true, false, true, true, true, false, false, true, false],
            [true, false, true, false, true, true, false, true, false, true, false, true],
            [true, false, true, true, false, true, false, true, true, false, true, false],
            [true, true, false, false, true, true, false, true, true, false, false, true],
            [true, false, true, true, false, false, true, true, true, false, false, true],
            [true, false, true, false, true, false, true, false, true, false, true, false],
            [true, true, true, true, true, true, true, true, true, true, true, true],
        ];
        Config.pianoScaleFlags = [true, false, true, false, true, true, false, true, false, true, false, true];
        Config.blackKeyNameParents = [-1, 1, -1, 1, -1, 1, -1, -1, 1, -1, 1, -1];
        Config.pitchNames = ["C", null, "D", null, "E", "F", null, "G", null, "A", null, "B"];
        Config.keyNames = ["B", "A♯", "A", "G♯", "G", "F♯", "F", "E", "D♯", "D", "C♯", "C"];
        Config.keyTransposes = [23, 22, 21, 20, 19, 18, 17, 16, 15, 14, 13, 12];
        Config.tempoSteps = 15;
        Config.reverbRange = 4;
        Config.beatsPerBarMin = 3;
        Config.beatsPerBarMax = 16;
        Config.barCountMin = 1;
        Config.barCountMax = 128;
        Config.patternsPerChannelMin = 1;
        Config.patternsPerChannelMax = 64;
        Config.instrumentsPerChannelMin = 1;
        Config.instrumentsPerChannelMax = 10;
        Config.partNames = ["÷3 (triplets)", "÷4 (standard)", "÷6", "÷8"];
        Config.partCounts = [3, 4, 6, 8];
        Config.waveNames = ["triangle", "square", "pulse wide", "pulse narrow", "sawtooth", "double saw", "double pulse", "spiky", "plateau"];
        Config.waveVolumes = [1.0, 0.5, 0.5, 0.5, 0.65, 0.5, 0.4, 0.4, 0.94];
        Config.drumNames = ["retro", "white", "clang", "buzz", "hollow",];
        Config.drumVolumes = [0.25, 1.0, 0.4, 0.3, 1.5,];
        Config.drumBasePitches = [69, 69, 69, 69, 96,];
        Config.drumPitchFilterMult = [100.0, 8.0, 100.0, 100.0, 1.0,];
        Config.drumWaveIsSoft = [false, true, false, false, true,];
        Config._drumWaves = [null, null, null, null, null,];
        Config.filterNames = ["none", "bright", "medium", "soft", "decay bright", "decay medium", "decay soft"];
        Config.filterBases = [0.0, 2.0, 3.5, 5.0, 1.0, 2.5, 4.0];
        Config.filterDecays = [0.0, 0.0, 0.0, 0.0, 10.0, 7.0, 4.0];
        Config.filterVolumes = [0.2, 0.4, 0.7, 1.0, 0.5, 0.75, 1.0];
        Config.transitionNames = ["seamless", "sudden", "smooth", "slide"];
        Config.effectNames = ["none", "vibrato light", "vibrato delayed", "vibrato heavy", "tremolo light", "tremolo heavy"];
        Config.effectVibratos = [0.0, 0.15, 0.3, 0.45, 0.0, 0.0];
        Config.effectTremolos = [0.0, 0.0, 0.0, 0.0, 0.25, 0.5];
        Config.effectVibratoDelays = [0, 0, 3, 0, 0, 0];
        Config.chorusNames = ["union", "shimmer", "hum", "honky tonk", "dissonant", "fifths", "octaves", "bowed", "custom harmony"];
        Config.chorusIntervals = [0.0, 0.02, 0.05, 0.1, 0.25, 3.5, 6, 0.02, 0.05];
        Config.chorusOffsets = [0.0, 0.0, 0.0, 0.0, 0.0, 3.5, 6, 0.0, 0.0];
        Config.chorusVolumes = [0.7, 0.8, 1.0, 1.0, 0.9, 0.9, 0.8, 1.0, 1.0];
        Config.chorusSigns = [1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, -1.0, 1.0];
        Config.chorusHarmonizes = [false, false, false, false, false, false, false, false, true];
        Config.volumeNames = ["loudest", "loud", "medium", "quiet", "quietest", "mute"];
        Config.volumeValues = [0.0, 0.5, 1.0, 1.5, 2.0, -1.0];
        Config.operatorCount = 4;
        Config.operatorAlgorithmNames = [
            "1←(2 3 4)",
            "1←(2 3←4)",
            "1←2←(3 4)",
            "1←(2 3)←4",
            "1←2←3←4",
            "1←3 2←4",
            "1 2←(3 4)",
            "1 2←3←4",
            "(1 2)←3←4",
            "(1 2)←(3 4)",
            "1 2 3←4",
            "(1 2 3)←4",
            "1 2 3 4",
        ];
        Config.midiAlgorithmNames = ["1<(2 3 4)", "1<(2 3<4)", "1<2<(3 4)", "1<(2 3)<4", "1<2<3<4", "1<3 2<4", "1 2<(3 4)", "1 2<3<4", "(1 2)<3<4", "(1 2)<(3 4)", "1 2 3<4", "(1 2 3)<4", "1 2 3 4"];
        Config.operatorModulatedBy = [
            [[2, 3, 4], [], [], []],
            [[2, 3], [], [4], []],
            [[2], [3, 4], [], []],
            [[2, 3], [4], [4], []],
            [[2], [3], [4], []],
            [[3], [4], [], []],
            [[], [3, 4], [], []],
            [[], [3], [4], []],
            [[3], [3], [4], []],
            [[3, 4], [3, 4], [], []],
            [[], [], [4], []],
            [[4], [4], [4], []],
            [[], [], [], []],
        ];
        Config.operatorAssociatedCarrier = [
            [1, 1, 1, 1],
            [1, 1, 1, 1],
            [1, 1, 1, 1],
            [1, 1, 1, 1],
            [1, 1, 1, 1],
            [1, 2, 1, 2],
            [1, 2, 2, 2],
            [1, 2, 2, 2],
            [1, 2, 2, 2],
            [1, 2, 2, 2],
            [1, 2, 3, 3],
            [1, 2, 3, 3],
            [1, 2, 3, 4],
        ];
        Config.operatorCarrierCounts = [1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 3, 3, 4];
        Config.operatorCarrierChorus = [0.0, 0.04, -0.073, 0.091];
        Config.operatorAmplitudeMax = 15;
        Config.operatorFrequencyNames = ["1×", "~1×", "2×", "~2×", "3×", "4×", "5×", "6×", "7×", "8×", "9×", "11×", "13×", "16×", "20×"];
        Config.midiFrequencyNames = ["1x", "~1x", "2x", "~2x", "3x", "4x", "5x", "6x", "7x", "8x", "9x", "11x", "13x", "16x", "20x"];
        Config.operatorFrequencies = [1.0, 1.0, 2.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 11.0, 13.0, 16.0, 20.0];
        Config.operatorHzOffsets = [0.0, 1.5, 0.0, -1.3, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0];
        Config.operatorAmplitudeSigns = [1.0, -1.0, 1.0, -1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0];
        Config.operatorEnvelopeNames = ["custom", "steady", "punch", "flare 1", "flare 2", "flare 3", "pluck 1", "pluck 2", "pluck 3", "swell 1", "swell 2", "swell 3", "tremolo1", "tremolo2", "tremolo3"];
        Config.operatorEnvelopeType = [0, 1, 2, 3, 3, 3, 4, 4, 4, 4, 4, 4, 5, 5, 5];
        Config.operatorEnvelopeSpeed = [0.0, 0.0, 0.0, 32.0, 8.0, 2.0, 32.0, 8.0, 2.0, 32.0, 8.0, 2.0, 4.0, 2.0, 1.0];
        Config.operatorEnvelopeInverted = [false, false, false, false, false, false, false, false, false, true, true, true, false, false, false];
        Config.operatorFeedbackNames = [
            "1⟲",
            "2⟲",
            "3⟲",
            "4⟲",
            "1⟲ 2⟲",
            "3⟲ 4⟲",
            "1⟲ 2⟲ 3⟲",
            "2⟲ 3⟲ 4⟲",
            "1⟲ 2⟲ 3⟲ 4⟲",
            "1→2",
            "1→3",
            "1→4",
            "2→3",
            "2→4",
            "3→4",
            "1→3 2→4",
            "1→4 2→3",
            "1→2→3→4",
        ];
        Config.midiFeedbackNames = [
            "1",
            "2",
            "3",
            "4",
            "1 2",
            "3 4",
            "1 2 3",
            "2 3 4",
            "1 2 3 4",
            "1>2",
            "1>3",
            "1>4",
            "2>3",
            "2>4",
            "3>4",
            "1>3 2>4",
            "1>4 2>3",
            "1>2>3>4",
        ];
        Config.operatorFeedbackIndices = [
            [[1], [], [], []],
            [[], [2], [], []],
            [[], [], [3], []],
            [[], [], [], [4]],
            [[1], [2], [], []],
            [[], [], [3], [4]],
            [[1], [2], [3], []],
            [[], [2], [3], [4]],
            [[1], [2], [3], [4]],
            [[], [1], [], []],
            [[], [], [1], []],
            [[], [], [], [1]],
            [[], [], [2], []],
            [[], [], [], [2]],
            [[], [], [], [3]],
            [[], [], [1], [2]],
            [[], [], [2], [1]],
            [[], [1], [2], [3]],
        ];
        Config.pitchChannelTypeNames = ["chip", "FM (expert)"];
        Config.instrumentTypeNames = ["chip", "FM", "noise"];
        Config.pitchChannelColorsDim = ["#0099a1", "#a1a100", "#c75000", "#00a100", "#d020d0", "#7777b0"];
        Config.pitchChannelColorsBright = ["#25f3ff", "#ffff25", "#ff9752", "#50ff50", "#ff90ff", "#a0a0ff"];
        Config.pitchNoteColorsDim = ["#00bdc7", "#c7c700", "#ff771c", "#00c700", "#e040e0", "#8888d0"];
        Config.pitchNoteColorsBright = ["#92f9ff", "#ffff92", "#ffcdab", "#a0ffa0", "#ffc0ff", "#d0d0ff"];
        Config.drumChannelColorsDim = ["#6f6f6f", "#996633"];
        Config.drumChannelColorsBright = ["#aaaaaa", "#ddaa77"];
        Config.drumNoteColorsDim = ["#aaaaaa", "#cc9966"];
        Config.drumNoteColorsBright = ["#eeeeee", "#f0d0bb"];
        Config.midiPitchChannelNames = ["cyan channel", "yellow channel", "orange channel", "green channel", "purple channel", "blue channel"];
        Config.midiDrumChannelNames = ["gray channel", "brown channel"];
        Config.midiSustainInstruments = [
            0x47,
            0x50,
            0x46,
            0x44,
            0x51,
            0x51,
            0x51,
            0x51,
            0x4A,
        ];
        Config.midiDecayInstruments = [
            0x2E,
            0x2E,
            0x06,
            0x18,
            0x19,
            0x19,
            0x6A,
            0x6A,
            0x21,
        ];
        Config.drumInterval = 6;
        Config.drumCount = 12;
        Config.pitchCount = 37;
        Config.maxPitch = 84;
        Config.pitchChannelCountMin = 1;
        Config.pitchChannelCountMax = 6;
        Config.drumChannelCountMin = 0;
        Config.drumChannelCountMax = 2;
        Config.waves = [
            Config._centerWave([1.0 / 15.0, 3.0 / 15.0, 5.0 / 15.0, 7.0 / 15.0, 9.0 / 15.0, 11.0 / 15.0, 13.0 / 15.0, 15.0 / 15.0, 15.0 / 15.0, 13.0 / 15.0, 11.0 / 15.0, 9.0 / 15.0, 7.0 / 15.0, 5.0 / 15.0, 3.0 / 15.0, 1.0 / 15.0, -1.0 / 15.0, -3.0 / 15.0, -5.0 / 15.0, -7.0 / 15.0, -9.0 / 15.0, -11.0 / 15.0, -13.0 / 15.0, -15.0 / 15.0, -15.0 / 15.0, -13.0 / 15.0, -11.0 / 15.0, -9.0 / 15.0, -7.0 / 15.0, -5.0 / 15.0, -3.0 / 15.0, -1.0 / 15.0]),
            Config._centerWave([1.0, -1.0]),
            Config._centerWave([1.0, -1.0, -1.0, -1.0]),
            Config._centerWave([1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0]),
            Config._centerWave([1.0 / 31.0, 3.0 / 31.0, 5.0 / 31.0, 7.0 / 31.0, 9.0 / 31.0, 11.0 / 31.0, 13.0 / 31.0, 15.0 / 31.0, 17.0 / 31.0, 19.0 / 31.0, 21.0 / 31.0, 23.0 / 31.0, 25.0 / 31.0, 27.0 / 31.0, 29.0 / 31.0, 31.0 / 31.0, -31.0 / 31.0, -29.0 / 31.0, -27.0 / 31.0, -25.0 / 31.0, -23.0 / 31.0, -21.0 / 31.0, -19.0 / 31.0, -17.0 / 31.0, -15.0 / 31.0, -13.0 / 31.0, -11.0 / 31.0, -9.0 / 31.0, -7.0 / 31.0, -5.0 / 31.0, -3.0 / 31.0, -1.0 / 31.0]),
            Config._centerWave([0.0, -0.2, -0.4, -0.6, -0.8, -1.0, 1.0, -0.8, -0.6, -0.4, -0.2, 1.0, 0.8, 0.6, 0.4, 0.2]),
            Config._centerWave([1.0, 1.0, 1.0, 1.0, 1.0, -1.0, -1.0, -1.0, 1.0, 1.0, 1.0, 1.0, -1.0, -1.0, -1.0, -1.0]),
            Config._centerWave([1.0, -1.0, 1.0, -1.0, 1.0, 0.0]),
            Config._centerWave([0.0, 0.2, 0.4, 0.5, 0.6, 0.7, 0.8, 0.85, 0.9, 0.95, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 0.95, 0.9, 0.85, 0.8, 0.7, 0.6, 0.5, 0.4, 0.2, 0.0, -0.2, -0.4, -0.5, -0.6, -0.7, -0.8, -0.85, -0.9, -0.95, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -0.95, -0.9, -0.85, -0.8, -0.7, -0.6, -0.5, -0.4, -0.2]),
        ];
        Config.sineWaveLength = 1 << 8;
        Config.sineWaveMask = Config.sineWaveLength - 1;
        Config.sineWave = Config.generateSineWave();
        return Config;
    }());
    beepbox.Config = Config;
    var BitFieldReader = (function () {
        function BitFieldReader(base64CharCodeToInt, source, startIndex, stopIndex) {
            this._bits = [];
            this._readIndex = 0;
            for (var i = startIndex; i < stopIndex; i++) {
                var value = base64CharCodeToInt[source.charCodeAt(i)];
                this._bits.push((value >> 5) & 0x1);
                this._bits.push((value >> 4) & 0x1);
                this._bits.push((value >> 3) & 0x1);
                this._bits.push((value >> 2) & 0x1);
                this._bits.push((value >> 1) & 0x1);
                this._bits.push(value & 0x1);
            }
        }
        BitFieldReader.prototype.read = function (bitCount) {
            var result = 0;
            while (bitCount > 0) {
                result = result << 1;
                result += this._bits[this._readIndex++];
                bitCount--;
            }
            return result;
        };
        BitFieldReader.prototype.readLongTail = function (minValue, minBits) {
            var result = minValue;
            var numBits = minBits;
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
        };
        BitFieldReader.prototype.readPartDuration = function () {
            return this.readLongTail(1, 2);
        };
        BitFieldReader.prototype.readPinCount = function () {
            return this.readLongTail(1, 0);
        };
        BitFieldReader.prototype.readPitchInterval = function () {
            if (this.read(1)) {
                return -this.readLongTail(1, 3);
            }
            else {
                return this.readLongTail(1, 3);
            }
        };
        return BitFieldReader;
    }());
    var BitFieldWriter = (function () {
        function BitFieldWriter() {
            this._bits = [];
        }
        BitFieldWriter.prototype.write = function (bitCount, value) {
            bitCount--;
            while (bitCount >= 0) {
                this._bits.push((value >>> bitCount) & 1);
                bitCount--;
            }
        };
        BitFieldWriter.prototype.writeLongTail = function (minValue, minBits, value) {
            if (value < minValue)
                throw new Error("value out of bounds");
            value -= minValue;
            var numBits = minBits;
            while (value >= (1 << numBits)) {
                this._bits.push(1);
                value -= 1 << numBits;
                numBits++;
            }
            this._bits.push(0);
            while (numBits > 0) {
                numBits--;
                this._bits.push((value >>> numBits) & 1);
            }
        };
        BitFieldWriter.prototype.writePartDuration = function (value) {
            this.writeLongTail(1, 2, value);
        };
        BitFieldWriter.prototype.writePinCount = function (value) {
            this.writeLongTail(1, 0, value);
        };
        BitFieldWriter.prototype.writePitchInterval = function (value) {
            if (value < 0) {
                this.write(1, 1);
                this.writeLongTail(1, 3, -value);
            }
            else {
                this.write(1, 0);
                this.writeLongTail(1, 3, value);
            }
        };
        BitFieldWriter.prototype.concat = function (other) {
            this._bits = this._bits.concat(other._bits);
        };
        BitFieldWriter.prototype.encodeBase64 = function (base64IntToCharCode, buffer) {
            for (var i = 0; i < this._bits.length; i += 6) {
                var value = (this._bits[i] << 5) | (this._bits[i + 1] << 4) | (this._bits[i + 2] << 3) | (this._bits[i + 3] << 2) | (this._bits[i + 4] << 1) | this._bits[i + 5];
                buffer.push(base64IntToCharCode[value]);
            }
            return buffer;
        };
        BitFieldWriter.prototype.lengthBase64 = function () {
            return Math.ceil(this._bits.length / 6);
        };
        return BitFieldWriter;
    }());
    function makeNotePin(interval, time, volume) {
        return { interval: interval, time: time, volume: volume };
    }
    beepbox.makeNotePin = makeNotePin;
    function makeNote(pitch, start, end, volume, fadeout) {
        if (fadeout === void 0) { fadeout = false; }
        return {
            pitches: [pitch],
            pins: [makeNotePin(0, 0, volume), makeNotePin(0, end - start, fadeout ? 0 : volume)],
            start: start,
            end: end,
        };
    }
    beepbox.makeNote = makeNote;
    var Pattern = (function () {
        function Pattern() {
            this.notes = [];
            this.instrument = 0;
        }
        Pattern.prototype.cloneNotes = function () {
            var result = [];
            for (var _i = 0, _a = this.notes; _i < _a.length; _i++) {
                var oldNote = _a[_i];
                var newNote = makeNote(-1, oldNote.start, oldNote.end, 3);
                newNote.pitches = oldNote.pitches.concat();
                newNote.pins = [];
                for (var _b = 0, _c = oldNote.pins; _b < _c.length; _b++) {
                    var oldPin = _c[_b];
                    newNote.pins.push(makeNotePin(oldPin.interval, oldPin.time, oldPin.volume));
                }
                result.push(newNote);
            }
            return result;
        };
        Pattern.prototype.reset = function () {
            this.notes.length = 0;
            this.instrument = 0;
        };
        return Pattern;
    }());
    beepbox.Pattern = Pattern;
    var Operator = (function () {
        function Operator(index) {
            this.frequency = 0;
            this.amplitude = 0;
            this.envelope = 0;
            this.reset(index);
        }
        Operator.prototype.reset = function (index) {
            this.frequency = 0;
            this.amplitude = (index <= 1) ? Config.operatorAmplitudeMax : 0;
            this.envelope = (index == 0) ? 0 : 1;
        };
        Operator.prototype.copy = function (other) {
            this.frequency = other.frequency;
            this.amplitude = other.amplitude;
            this.envelope = other.envelope;
        };
        return Operator;
    }());
    beepbox.Operator = Operator;
    var Instrument = (function () {
        function Instrument() {
            this.type = 0;
            this.wave = 1;
            this.filter = 1;
            this.transition = 1;
            this.effect = 0;
            this.chorus = 0;
            this.volume = 0;
            this.algorithm = 0;
            this.feedbackType = 0;
            this.feedbackAmplitude = 0;
            this.feedbackEnvelope = 1;
            this.operators = [];
            for (var i = 0; i < Config.operatorCount; i++) {
                this.operators.push(new Operator(i));
            }
        }
        Instrument.prototype.setTypeAndReset = function (type) {
            this.type = type;
            switch (type) {
                case 0:
                    this.wave = 1;
                    this.filter = 1;
                    this.transition = 1;
                    this.effect = 0;
                    this.chorus = 0;
                    this.volume = 0;
                    break;
                case 1:
                    this.wave = 1;
                    this.transition = 1;
                    this.volume = 0;
                    break;
                case 2:
                    this.transition = 1;
                    this.effect = 0;
                    this.algorithm = 0;
                    this.feedbackType = 0;
                    this.feedbackAmplitude = 0;
                    this.feedbackEnvelope = 1;
                    for (var i = 0; i < this.operators.length; i++) {
                        this.operators[i].reset(i);
                    }
                    break;
            }
        };
        Instrument.prototype.copy = function (other) {
            this.type = other.type;
            this.wave = other.wave;
            this.filter = other.filter;
            this.transition = other.transition;
            this.effect = other.effect;
            this.chorus = other.chorus;
            this.volume = other.volume;
            this.algorithm = other.algorithm;
            this.feedbackType = other.feedbackType;
            this.feedbackAmplitude = other.feedbackAmplitude;
            this.feedbackEnvelope = other.feedbackEnvelope;
            for (var i = 0; i < this.operators.length; i++) {
                this.operators[i].copy(other.operators[i]);
            }
        };
        return Instrument;
    }());
    beepbox.Instrument = Instrument;
    var Channel = (function () {
        function Channel() {
            this.octave = 0;
            this.instruments = [];
            this.patterns = [];
            this.bars = [];
        }
        return Channel;
    }());
    beepbox.Channel = Channel;
    var Song = (function () {
        function Song(string) {
            this.channels = [];
            if (string != undefined) {
                this.fromBase64String(string);
            }
            else {
                this.initToDefault(true);
            }
        }
        Song.prototype.getChannelCount = function () {
            return this.pitchChannelCount + this.drumChannelCount;
        };
        Song.prototype.getChannelIsDrum = function (channel) {
            return (channel >= this.pitchChannelCount);
        };
        Song.prototype.getChannelColorDim = function (channel) {
            return channel < this.pitchChannelCount ? Config.pitchChannelColorsDim[channel] : Config.drumChannelColorsDim[channel - this.pitchChannelCount];
        };
        Song.prototype.getChannelColorBright = function (channel) {
            return channel < this.pitchChannelCount ? Config.pitchChannelColorsBright[channel] : Config.drumChannelColorsBright[channel - this.pitchChannelCount];
        };
        Song.prototype.getNoteColorDim = function (channel) {
            return channel < this.pitchChannelCount ? Config.pitchNoteColorsDim[channel] : Config.drumNoteColorsDim[channel - this.pitchChannelCount];
        };
        Song.prototype.getNoteColorBright = function (channel) {
            return channel < this.pitchChannelCount ? Config.pitchNoteColorsBright[channel] : Config.drumNoteColorsBright[channel - this.pitchChannelCount];
        };
        Song.prototype.initToDefault = function (andResetChannels) {
            if (andResetChannels === void 0) { andResetChannels = true; }
            this.scale = 0;
            this.key = Config.keyNames.length - 1;
            this.loopStart = 0;
            this.loopLength = 4;
            this.tempo = 7;
            this.reverb = 0;
            this.beatsPerBar = 8;
            this.barCount = 16;
            this.patternsPerChannel = 8;
            this.partsPerBeat = 4;
            this.instrumentsPerChannel = 1;
            if (andResetChannels) {
                this.pitchChannelCount = 3;
                this.drumChannelCount = 1;
                for (var channelIndex = 0; channelIndex < this.getChannelCount(); channelIndex++) {
                    if (this.channels.length <= channelIndex) {
                        this.channels[channelIndex] = new Channel();
                    }
                    var channel = this.channels[channelIndex];
                    channel.octave = 3 - channelIndex;
                    for (var pattern = 0; pattern < this.patternsPerChannel; pattern++) {
                        if (channel.patterns.length <= pattern) {
                            channel.patterns[pattern] = new Pattern();
                        }
                        else {
                            channel.patterns[pattern].reset();
                        }
                    }
                    channel.patterns.length = this.patternsPerChannel;
                    for (var instrument = 0; instrument < this.instrumentsPerChannel; instrument++) {
                        if (channel.instruments.length <= instrument) {
                            channel.instruments[instrument] = new Instrument();
                        }
                        channel.instruments[instrument].setTypeAndReset(channelIndex < this.pitchChannelCount ? 0 : 2);
                    }
                    channel.instruments.length = this.instrumentsPerChannel;
                    for (var bar = 0; bar < this.barCount; bar++) {
                        channel.bars[bar] = 1;
                    }
                    channel.bars.length = this.barCount;
                }
                this.channels.length = this.getChannelCount();
            }
        };
        Song.prototype.toBase64String = function () {
            var bits;
            var buffer = [];
            var base64IntToCharCode = Song._base64IntToCharCode;
            buffer.push(base64IntToCharCode[Song._latestVersion]);
            buffer.push(110, base64IntToCharCode[this.pitchChannelCount], base64IntToCharCode[this.drumChannelCount]);
            buffer.push(115, base64IntToCharCode[this.scale]);
            buffer.push(107, base64IntToCharCode[this.key]);
            buffer.push(108, base64IntToCharCode[this.loopStart >> 6], base64IntToCharCode[this.loopStart & 0x3f]);
            buffer.push(101, base64IntToCharCode[(this.loopLength - 1) >> 6], base64IntToCharCode[(this.loopLength - 1) & 0x3f]);
            buffer.push(116, base64IntToCharCode[this.tempo]);
            buffer.push(109, base64IntToCharCode[this.reverb]);
            buffer.push(97, base64IntToCharCode[this.beatsPerBar - 1]);
            buffer.push(103, base64IntToCharCode[(this.barCount - 1) >> 6], base64IntToCharCode[(this.barCount - 1) & 0x3f]);
            buffer.push(106, base64IntToCharCode[this.patternsPerChannel - 1]);
            buffer.push(105, base64IntToCharCode[this.instrumentsPerChannel - 1]);
            buffer.push(114, base64IntToCharCode[Config.partCounts.indexOf(this.partsPerBeat)]);
            buffer.push(111);
            for (var channel = 0; channel < this.getChannelCount(); channel++) {
                buffer.push(base64IntToCharCode[this.channels[channel].octave]);
            }
            for (var channel = 0; channel < this.getChannelCount(); channel++) {
                for (var i = 0; i < this.instrumentsPerChannel; i++) {
                    var instrument = this.channels[channel].instruments[i];
                    buffer.push(84, base64IntToCharCode[instrument.type]);
                    if (instrument.type == 0) {
                        buffer.push(119, base64IntToCharCode[instrument.wave]);
                        buffer.push(102, base64IntToCharCode[instrument.filter]);
                        buffer.push(100, base64IntToCharCode[instrument.transition]);
                        buffer.push(99, base64IntToCharCode[instrument.effect]);
                        buffer.push(104, base64IntToCharCode[instrument.chorus]);
                        buffer.push(118, base64IntToCharCode[instrument.volume]);
                    }
                    else if (instrument.type == 1) {
                        buffer.push(100, base64IntToCharCode[instrument.transition]);
                        buffer.push(99, base64IntToCharCode[instrument.effect]);
                        buffer.push(65, base64IntToCharCode[instrument.algorithm]);
                        buffer.push(70, base64IntToCharCode[instrument.feedbackType]);
                        buffer.push(66, base64IntToCharCode[instrument.feedbackAmplitude]);
                        buffer.push(86, base64IntToCharCode[instrument.feedbackEnvelope]);
                        buffer.push(81);
                        for (var o = 0; o < Config.operatorCount; o++) {
                            buffer.push(base64IntToCharCode[instrument.operators[o].frequency]);
                        }
                        buffer.push(80);
                        for (var o = 0; o < Config.operatorCount; o++) {
                            buffer.push(base64IntToCharCode[instrument.operators[o].amplitude]);
                        }
                        buffer.push(69);
                        for (var o = 0; o < Config.operatorCount; o++) {
                            buffer.push(base64IntToCharCode[instrument.operators[o].envelope]);
                        }
                    }
                    else if (instrument.type == 2) {
                        buffer.push(119, base64IntToCharCode[instrument.wave]);
                        buffer.push(100, base64IntToCharCode[instrument.transition]);
                        buffer.push(118, base64IntToCharCode[instrument.volume]);
                    }
                    else {
                        throw new Error("Unknown instrument type.");
                    }
                }
            }
            buffer.push(98);
            bits = new BitFieldWriter();
            var neededBits = 0;
            while ((1 << neededBits) < this.patternsPerChannel + 1)
                neededBits++;
            for (var channel = 0; channel < this.getChannelCount(); channel++)
                for (var i = 0; i < this.barCount; i++) {
                    bits.write(neededBits, this.channels[channel].bars[i]);
                }
            bits.encodeBase64(base64IntToCharCode, buffer);
            buffer.push(112);
            bits = new BitFieldWriter();
            var neededInstrumentBits = 0;
            while ((1 << neededInstrumentBits) < this.instrumentsPerChannel)
                neededInstrumentBits++;
            for (var channel = 0; channel < this.getChannelCount(); channel++) {
                var isDrum = this.getChannelIsDrum(channel);
                var octaveOffset = isDrum ? 0 : this.channels[channel].octave * 12;
                var lastPitch = (isDrum ? 4 : 12) + octaveOffset;
                var recentPitches = isDrum ? [4, 6, 7, 2, 3, 8, 0, 10] : [12, 19, 24, 31, 36, 7, 0];
                var recentShapes = [];
                for (var i = 0; i < recentPitches.length; i++) {
                    recentPitches[i] += octaveOffset;
                }
                for (var _i = 0, _a = this.channels[channel].patterns; _i < _a.length; _i++) {
                    var p = _a[_i];
                    bits.write(neededInstrumentBits, p.instrument);
                    if (p.notes.length > 0) {
                        bits.write(1, 1);
                        var curPart = 0;
                        for (var _b = 0, _c = p.notes; _b < _c.length; _b++) {
                            var t = _c[_b];
                            if (t.start > curPart) {
                                bits.write(2, 0);
                                bits.writePartDuration(t.start - curPart);
                            }
                            var shapeBits = new BitFieldWriter();
                            for (var i = 1; i < t.pitches.length; i++)
                                shapeBits.write(1, 1);
                            if (t.pitches.length < 4)
                                shapeBits.write(1, 0);
                            shapeBits.writePinCount(t.pins.length - 1);
                            shapeBits.write(2, t.pins[0].volume);
                            var shapePart = 0;
                            var startPitch = t.pitches[0];
                            var currentPitch = startPitch;
                            var pitchBends = [];
                            for (var i = 1; i < t.pins.length; i++) {
                                var pin = t.pins[i];
                                var nextPitch = startPitch + pin.interval;
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
                            var shapeString = String.fromCharCode.apply(null, shapeBits.encodeBase64(base64IntToCharCode, []));
                            var shapeIndex = recentShapes.indexOf(shapeString);
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
                            var allPitches = t.pitches.concat(pitchBends);
                            for (var i = 0; i < allPitches.length; i++) {
                                var pitch = allPitches[i];
                                var pitchIndex = recentPitches.indexOf(pitch);
                                if (pitchIndex == -1) {
                                    var interval = 0;
                                    var pitchIter = lastPitch;
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
                                if (i == t.pitches.length - 1) {
                                    lastPitch = t.pitches[0];
                                }
                                else {
                                    lastPitch = pitch;
                                }
                            }
                            curPart = t.end;
                        }
                        if (curPart < this.beatsPerBar * this.partsPerBeat) {
                            bits.write(2, 0);
                            bits.writePartDuration(this.beatsPerBar * this.partsPerBeat - curPart);
                        }
                    }
                    else {
                        bits.write(1, 0);
                    }
                }
            }
            var stringLength = bits.lengthBase64();
            var digits = [];
            while (stringLength > 0) {
                digits.unshift(base64IntToCharCode[stringLength & 0x3f]);
                stringLength = stringLength >> 6;
            }
            buffer.push(base64IntToCharCode[digits.length]);
            Array.prototype.push.apply(buffer, digits);
            bits.encodeBase64(base64IntToCharCode, buffer);
            if (buffer.length >= 65535)
                throw new Error("Song hash code too long.");
            return String.fromCharCode.apply(null, buffer);
        };
        Song.prototype.fromBase64String = function (compressed) {
            if (compressed == null || compressed == "") {
                this.initToDefault(true);
                return;
            }
            var charIndex = 0;
            while (compressed.charCodeAt(charIndex) <= 32)
                charIndex++;
            if (compressed.charCodeAt(charIndex) == 35)
                charIndex++;
            if (compressed.charCodeAt(charIndex) == 123) {
                this.fromJsonObject(JSON.parse(charIndex == 0 ? compressed : compressed.substring(charIndex)));
                return;
            }
            var version = Song._base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
            if (version == -1 || version > Song._latestVersion || version < Song._oldestVersion)
                return;
            var beforeThree = version < 3;
            var beforeFour = version < 4;
            var beforeFive = version < 5;
            var beforeSix = version < 6;
            var base64CharCodeToInt = Song._base64CharCodeToInt;
            this.initToDefault(beforeSix);
            if (beforeThree) {
                for (var _i = 0, _a = this.channels; _i < _a.length; _i++) {
                    var channel = _a[_i];
                    channel.instruments[0].transition = 0;
                }
                this.channels[3].instruments[0].wave = 0;
            }
            var instrumentChannelIterator = 0;
            var instrumentIndexIterator = -1;
            while (charIndex < compressed.length) {
                var command = compressed.charCodeAt(charIndex++);
                var channel = void 0;
                if (command == 110) {
                    this.pitchChannelCount = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                    this.drumChannelCount = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                    this.pitchChannelCount = Song._clip(Config.pitchChannelCountMin, Config.pitchChannelCountMax + 1, this.pitchChannelCount);
                    this.drumChannelCount = Song._clip(Config.drumChannelCountMin, Config.drumChannelCountMax + 1, this.drumChannelCount);
                    for (var channelIndex = this.channels.length; channelIndex < this.getChannelCount(); channelIndex++) {
                        this.channels[channelIndex] = new Channel();
                    }
                    this.channels.length = this.getChannelCount();
                }
                else if (command == 115) {
                    this.scale = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                    if (beforeThree && this.scale == 10)
                        this.scale = 11;
                }
                else if (command == 107) {
                    this.key = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                }
                else if (command == 108) {
                    if (beforeFive) {
                        this.loopStart = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                    }
                    else {
                        this.loopStart = (base64CharCodeToInt[compressed.charCodeAt(charIndex++)] << 6) + base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                    }
                }
                else if (command == 101) {
                    if (beforeFive) {
                        this.loopLength = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                    }
                    else {
                        this.loopLength = (base64CharCodeToInt[compressed.charCodeAt(charIndex++)] << 6) + base64CharCodeToInt[compressed.charCodeAt(charIndex++)] + 1;
                    }
                }
                else if (command == 116) {
                    if (beforeFour) {
                        this.tempo = [1, 4, 7, 10][base64CharCodeToInt[compressed.charCodeAt(charIndex++)]];
                    }
                    else {
                        this.tempo = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                    }
                    this.tempo = Song._clip(0, Config.tempoSteps, this.tempo);
                }
                else if (command == 109) {
                    this.reverb = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                    this.reverb = Song._clip(0, Config.reverbRange, this.reverb);
                }
                else if (command == 97) {
                    if (beforeThree) {
                        this.beatsPerBar = [6, 7, 8, 9, 10][base64CharCodeToInt[compressed.charCodeAt(charIndex++)]];
                    }
                    else {
                        this.beatsPerBar = base64CharCodeToInt[compressed.charCodeAt(charIndex++)] + 1;
                    }
                    this.beatsPerBar = Math.max(Config.beatsPerBarMin, Math.min(Config.beatsPerBarMax, this.beatsPerBar));
                }
                else if (command == 103) {
                    this.barCount = (base64CharCodeToInt[compressed.charCodeAt(charIndex++)] << 6) + base64CharCodeToInt[compressed.charCodeAt(charIndex++)] + 1;
                    this.barCount = Math.max(Config.barCountMin, Math.min(Config.barCountMax, this.barCount));
                    for (var channel_1 = 0; channel_1 < this.getChannelCount(); channel_1++) {
                        for (var bar = this.channels[channel_1].bars.length; bar < this.barCount; bar++) {
                            this.channels[channel_1].bars[bar] = 1;
                        }
                        this.channels[channel_1].bars.length = this.barCount;
                    }
                }
                else if (command == 106) {
                    this.patternsPerChannel = base64CharCodeToInt[compressed.charCodeAt(charIndex++)] + 1;
                    this.patternsPerChannel = Math.max(Config.patternsPerChannelMin, Math.min(Config.patternsPerChannelMax, this.patternsPerChannel));
                    for (var channel_2 = 0; channel_2 < this.getChannelCount(); channel_2++) {
                        for (var pattern = this.channels[channel_2].patterns.length; pattern < this.patternsPerChannel; pattern++) {
                            this.channels[channel_2].patterns[pattern] = new Pattern();
                        }
                        this.channels[channel_2].patterns.length = this.patternsPerChannel;
                    }
                }
                else if (command == 105) {
                    this.instrumentsPerChannel = base64CharCodeToInt[compressed.charCodeAt(charIndex++)] + 1;
                    this.instrumentsPerChannel = Math.max(Config.instrumentsPerChannelMin, Math.min(Config.instrumentsPerChannelMax, this.instrumentsPerChannel));
                    for (var channel_3 = 0; channel_3 < this.getChannelCount(); channel_3++) {
                        for (var instrumentIndex = this.channels[channel_3].instruments.length; instrumentIndex < this.instrumentsPerChannel; instrumentIndex++) {
                            this.channels[channel_3].instruments[instrumentIndex] = new Instrument();
                        }
                        this.channels[channel_3].instruments.length = this.instrumentsPerChannel;
                        if (beforeSix) {
                            for (var instrumentIndex = 0; instrumentIndex < this.instrumentsPerChannel; instrumentIndex++) {
                                this.channels[channel_3].instruments[instrumentIndex].setTypeAndReset(channel_3 < this.pitchChannelCount ? 0 : 2);
                            }
                        }
                    }
                }
                else if (command == 114) {
                    this.partsPerBeat = Config.partCounts[base64CharCodeToInt[compressed.charCodeAt(charIndex++)]];
                }
                else if (command == 111) {
                    if (beforeThree) {
                        channel = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                        this.channels[channel].octave = Song._clip(0, 5, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                    }
                    else {
                        for (channel = 0; channel < this.getChannelCount(); channel++) {
                            this.channels[channel].octave = Song._clip(0, 5, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                        }
                    }
                }
                else if (command == 84) {
                    instrumentIndexIterator++;
                    if (instrumentIndexIterator >= this.instrumentsPerChannel) {
                        instrumentChannelIterator++;
                        instrumentIndexIterator = 0;
                    }
                    var instrument = this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator];
                    instrument.setTypeAndReset(Song._clip(0, 3, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]));
                }
                else if (command == 119) {
                    if (beforeThree) {
                        channel = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                        this.channels[channel].instruments[0].wave = Song._clip(0, Config.waveNames.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                    }
                    else if (beforeSix) {
                        for (channel = 0; channel < this.getChannelCount(); channel++) {
                            var isDrums = (channel >= this.pitchChannelCount);
                            for (var i = 0; i < this.instrumentsPerChannel; i++) {
                                this.channels[channel].instruments[i].wave = Song._clip(0, isDrums ? Config.drumNames.length : Config.waveNames.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                            }
                        }
                    }
                    else {
                        var isDrums = (instrumentChannelIterator >= this.pitchChannelCount);
                        this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].wave = Song._clip(0, isDrums ? Config.drumNames.length : Config.waveNames.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                    }
                }
                else if (command == 102) {
                    if (beforeThree) {
                        channel = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                        this.channels[channel].instruments[0].filter = [1, 3, 4, 5][Song._clip(0, Config.filterNames.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)])];
                    }
                    else if (beforeSix) {
                        for (channel = 0; channel < this.getChannelCount(); channel++) {
                            for (var i = 0; i < this.instrumentsPerChannel; i++) {
                                this.channels[channel].instruments[i].filter = Song._clip(0, Config.filterNames.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)] + 1);
                            }
                        }
                    }
                    else {
                        this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].filter = Song._clip(0, Config.filterNames.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                    }
                }
                else if (command == 100) {
                    if (beforeThree) {
                        channel = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                        this.channels[channel].instruments[0].transition = Song._clip(0, Config.transitionNames.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                    }
                    else if (beforeSix) {
                        for (channel = 0; channel < this.getChannelCount(); channel++) {
                            for (var i = 0; i < this.instrumentsPerChannel; i++) {
                                this.channels[channel].instruments[i].transition = Song._clip(0, Config.transitionNames.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                            }
                        }
                    }
                    else {
                        this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].transition = Song._clip(0, Config.transitionNames.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                    }
                }
                else if (command == 99) {
                    if (beforeThree) {
                        channel = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                        var effect = Song._clip(0, Config.effectNames.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                        if (effect == 1)
                            effect = 3;
                        else if (effect == 3)
                            effect = 5;
                        this.channels[channel].instruments[0].effect = effect;
                    }
                    else if (beforeSix) {
                        for (channel = 0; channel < this.getChannelCount(); channel++) {
                            for (var i = 0; i < this.instrumentsPerChannel; i++) {
                                this.channels[channel].instruments[i].effect = Song._clip(0, Config.effectNames.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                            }
                        }
                    }
                    else {
                        this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].effect = Song._clip(0, Config.effectNames.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                    }
                }
                else if (command == 104) {
                    if (beforeThree) {
                        channel = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                        this.channels[channel].instruments[0].chorus = Song._clip(0, Config.chorusNames.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                    }
                    else if (beforeSix) {
                        for (channel = 0; channel < this.getChannelCount(); channel++) {
                            for (var i = 0; i < this.instrumentsPerChannel; i++) {
                                this.channels[channel].instruments[i].chorus = Song._clip(0, Config.chorusNames.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                            }
                        }
                    }
                    else {
                        this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].chorus = Song._clip(0, Config.chorusNames.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                    }
                }
                else if (command == 118) {
                    if (beforeThree) {
                        channel = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                        this.channels[channel].instruments[0].volume = Song._clip(0, Config.volumeNames.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                    }
                    else if (beforeSix) {
                        for (channel = 0; channel < this.getChannelCount(); channel++) {
                            for (var i = 0; i < this.instrumentsPerChannel; i++) {
                                this.channels[channel].instruments[i].volume = Song._clip(0, Config.volumeNames.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                            }
                        }
                    }
                    else {
                        this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].volume = Song._clip(0, Config.volumeNames.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                    }
                }
                else if (command == 65) {
                    this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].algorithm = Song._clip(0, Config.operatorAlgorithmNames.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                }
                else if (command == 70) {
                    this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].feedbackType = Song._clip(0, Config.operatorFeedbackNames.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                }
                else if (command == 66) {
                    this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].feedbackAmplitude = Song._clip(0, Config.operatorAmplitudeMax + 1, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                }
                else if (command == 86) {
                    this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].feedbackEnvelope = Song._clip(0, Config.operatorEnvelopeNames.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                }
                else if (command == 81) {
                    for (var o = 0; o < Config.operatorCount; o++) {
                        this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].operators[o].frequency = Song._clip(0, Config.operatorFrequencyNames.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                    }
                }
                else if (command == 80) {
                    for (var o = 0; o < Config.operatorCount; o++) {
                        this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].operators[o].amplitude = Song._clip(0, Config.operatorAmplitudeMax + 1, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                    }
                }
                else if (command == 69) {
                    for (var o = 0; o < Config.operatorCount; o++) {
                        this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].operators[o].envelope = Song._clip(0, Config.operatorEnvelopeNames.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                    }
                }
                else if (command == 98) {
                    var subStringLength = void 0;
                    if (beforeThree) {
                        channel = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                        var barCount = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                        subStringLength = Math.ceil(barCount * 0.5);
                        var bits = new BitFieldReader(base64CharCodeToInt, compressed, charIndex, charIndex + subStringLength);
                        for (var i = 0; i < barCount; i++) {
                            this.channels[channel].bars[i] = bits.read(3) + 1;
                        }
                    }
                    else if (beforeFive) {
                        var neededBits = 0;
                        while ((1 << neededBits) < this.patternsPerChannel)
                            neededBits++;
                        subStringLength = Math.ceil(this.getChannelCount() * this.barCount * neededBits / 6);
                        var bits = new BitFieldReader(base64CharCodeToInt, compressed, charIndex, charIndex + subStringLength);
                        for (channel = 0; channel < this.getChannelCount(); channel++) {
                            for (var i = 0; i < this.barCount; i++) {
                                this.channels[channel].bars[i] = bits.read(neededBits) + 1;
                            }
                        }
                    }
                    else {
                        var neededBits = 0;
                        while ((1 << neededBits) < this.patternsPerChannel + 1)
                            neededBits++;
                        subStringLength = Math.ceil(this.getChannelCount() * this.barCount * neededBits / 6);
                        var bits = new BitFieldReader(base64CharCodeToInt, compressed, charIndex, charIndex + subStringLength);
                        for (channel = 0; channel < this.getChannelCount(); channel++) {
                            for (var i = 0; i < this.barCount; i++) {
                                this.channels[channel].bars[i] = bits.read(neededBits);
                            }
                        }
                    }
                    charIndex += subStringLength;
                }
                else if (command == 112) {
                    var bitStringLength = 0;
                    if (beforeThree) {
                        channel = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                        charIndex++;
                        bitStringLength = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                        bitStringLength = bitStringLength << 6;
                        bitStringLength += base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                    }
                    else {
                        channel = 0;
                        var bitStringLengthLength = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                        while (bitStringLengthLength > 0) {
                            bitStringLength = bitStringLength << 6;
                            bitStringLength += base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                            bitStringLengthLength--;
                        }
                    }
                    var bits = new BitFieldReader(base64CharCodeToInt, compressed, charIndex, charIndex + bitStringLength);
                    charIndex += bitStringLength;
                    var neededInstrumentBits = 0;
                    while ((1 << neededInstrumentBits) < this.instrumentsPerChannel)
                        neededInstrumentBits++;
                    while (true) {
                        var isDrum = this.getChannelIsDrum(channel);
                        var octaveOffset = isDrum ? 0 : this.channels[channel].octave * 12;
                        var note = null;
                        var pin = null;
                        var lastPitch = (isDrum ? 4 : 12) + octaveOffset;
                        var recentPitches = isDrum ? [4, 6, 7, 2, 3, 8, 0, 10] : [12, 19, 24, 31, 36, 7, 0];
                        var recentShapes = [];
                        for (var i = 0; i < recentPitches.length; i++) {
                            recentPitches[i] += octaveOffset;
                        }
                        for (var i = 0; i < this.patternsPerChannel; i++) {
                            var newPattern = this.channels[channel].patterns[i];
                            newPattern.reset();
                            newPattern.instrument = bits.read(neededInstrumentBits);
                            if (!beforeThree && bits.read(1) == 0)
                                continue;
                            var curPart = 0;
                            var newNotes = newPattern.notes;
                            while (curPart < this.beatsPerBar * this.partsPerBeat) {
                                var useOldShape = bits.read(1) == 1;
                                var newNote = false;
                                var shapeIndex = 0;
                                if (useOldShape) {
                                    shapeIndex = bits.readLongTail(0, 0);
                                }
                                else {
                                    newNote = bits.read(1) == 1;
                                }
                                if (!useOldShape && !newNote) {
                                    var restLength = bits.readPartDuration();
                                    curPart += restLength;
                                }
                                else {
                                    var shape = void 0;
                                    var pinObj = void 0;
                                    var pitch = void 0;
                                    if (useOldShape) {
                                        shape = recentShapes[shapeIndex];
                                        recentShapes.splice(shapeIndex, 1);
                                    }
                                    else {
                                        shape = {};
                                        shape.pitchCount = 1;
                                        while (shape.pitchCount < 4 && bits.read(1) == 1)
                                            shape.pitchCount++;
                                        shape.pinCount = bits.readPinCount();
                                        shape.initialVolume = bits.read(2);
                                        shape.pins = [];
                                        shape.length = 0;
                                        shape.bendCount = 0;
                                        for (var j = 0; j < shape.pinCount; j++) {
                                            pinObj = {};
                                            pinObj.pitchBend = bits.read(1) == 1;
                                            if (pinObj.pitchBend)
                                                shape.bendCount++;
                                            shape.length += bits.readPartDuration();
                                            pinObj.time = shape.length;
                                            pinObj.volume = bits.read(2);
                                            shape.pins.push(pinObj);
                                        }
                                    }
                                    recentShapes.unshift(shape);
                                    if (recentShapes.length > 10)
                                        recentShapes.pop();
                                    note = makeNote(0, curPart, curPart + shape.length, shape.initialVolume);
                                    note.pitches = [];
                                    note.pins.length = 1;
                                    var pitchBends = [];
                                    for (var j = 0; j < shape.pitchCount + shape.bendCount; j++) {
                                        var useOldPitch = bits.read(1) == 1;
                                        if (!useOldPitch) {
                                            var interval = bits.readPitchInterval();
                                            pitch = lastPitch;
                                            var intervalIter = interval;
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
                                            var pitchIndex = bits.read(3);
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
                                    for (var _b = 0, _c = shape.pins; _b < _c.length; _b++) {
                                        var pinObj_1 = _c[_b];
                                        if (pinObj_1.pitchBend)
                                            pitchBends.shift();
                                        pin = makeNotePin(pitchBends[0] - note.pitches[0], pinObj_1.time, pinObj_1.volume);
                                        note.pins.push(pin);
                                    }
                                    curPart = note.end;
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
            }
        };
        Song.prototype.toJsonObject = function (enableIntro, loopCount, enableOutro) {
            if (enableIntro === void 0) { enableIntro = true; }
            if (loopCount === void 0) { loopCount = 1; }
            if (enableOutro === void 0) { enableOutro = true; }
            var channelArray = [];
            for (var channel = 0; channel < this.getChannelCount(); channel++) {
                var instrumentArray = [];
                var isDrum = this.getChannelIsDrum(channel);
                for (var i = 0; i < this.instrumentsPerChannel; i++) {
                    var instrument = this.channels[channel].instruments[i];
                    if (instrument.type == 2) {
                        instrumentArray.push({
                            type: Config.instrumentTypeNames[instrument.type],
                            volume: (5 - instrument.volume) * 20,
                            wave: Config.drumNames[instrument.wave],
                            transition: Config.transitionNames[instrument.transition],
                        });
                    }
                    else if (instrument.type == 0) {
                        instrumentArray.push({
                            type: Config.instrumentTypeNames[instrument.type],
                            volume: (5 - instrument.volume) * 20,
                            wave: Config.waveNames[instrument.wave],
                            transition: Config.transitionNames[instrument.transition],
                            filter: Config.filterNames[instrument.filter],
                            chorus: Config.chorusNames[instrument.chorus],
                            effect: Config.effectNames[instrument.effect],
                        });
                    }
                    else if (instrument.type == 1) {
                        var operatorArray = [];
                        for (var _i = 0, _a = instrument.operators; _i < _a.length; _i++) {
                            var operator = _a[_i];
                            operatorArray.push({
                                frequency: Config.operatorFrequencyNames[operator.frequency],
                                amplitude: operator.amplitude,
                                envelope: Config.operatorEnvelopeNames[operator.envelope],
                            });
                        }
                        instrumentArray.push({
                            type: Config.instrumentTypeNames[instrument.type],
                            transition: Config.transitionNames[instrument.transition],
                            effect: Config.effectNames[instrument.effect],
                            algorithm: Config.operatorAlgorithmNames[instrument.algorithm],
                            feedbackType: Config.operatorFeedbackNames[instrument.feedbackType],
                            feedbackAmplitude: instrument.feedbackAmplitude,
                            feedbackEnvelope: Config.operatorEnvelopeNames[instrument.feedbackEnvelope],
                            operators: operatorArray,
                        });
                    }
                    else {
                        throw new Error("Unrecognized instrument type");
                    }
                }
                var patternArray = [];
                for (var _b = 0, _c = this.channels[channel].patterns; _b < _c.length; _b++) {
                    var pattern = _c[_b];
                    var noteArray = [];
                    for (var _d = 0, _e = pattern.notes; _d < _e.length; _d++) {
                        var note = _e[_d];
                        var pointArray = [];
                        for (var _f = 0, _g = note.pins; _f < _g.length; _f++) {
                            var pin = _g[_f];
                            pointArray.push({
                                tick: pin.time + note.start,
                                pitchBend: pin.interval,
                                volume: Math.round(pin.volume * 100 / 3),
                            });
                        }
                        noteArray.push({
                            pitches: note.pitches,
                            points: pointArray,
                        });
                    }
                    patternArray.push({
                        instrument: pattern.instrument + 1,
                        notes: noteArray,
                    });
                }
                var sequenceArray = [];
                if (enableIntro)
                    for (var i = 0; i < this.loopStart; i++) {
                        sequenceArray.push(this.channels[channel].bars[i]);
                    }
                for (var l = 0; l < loopCount; l++)
                    for (var i = this.loopStart; i < this.loopStart + this.loopLength; i++) {
                        sequenceArray.push(this.channels[channel].bars[i]);
                    }
                if (enableOutro)
                    for (var i = this.loopStart + this.loopLength; i < this.barCount; i++) {
                        sequenceArray.push(this.channels[channel].bars[i]);
                    }
                channelArray.push({
                    type: isDrum ? "drum" : "pitch",
                    octaveScrollBar: this.channels[channel].octave,
                    instruments: instrumentArray,
                    patterns: patternArray,
                    sequence: sequenceArray,
                });
            }
            return {
                format: Song._format,
                version: Song._latestVersion,
                scale: Config.scaleNames[this.scale],
                key: Config.keyNames[this.key],
                introBars: this.loopStart,
                loopBars: this.loopLength,
                beatsPerBar: this.beatsPerBar,
                ticksPerBeat: this.partsPerBeat,
                beatsPerMinute: this.getBeatsPerMinute(),
                reverb: this.reverb,
                channels: channelArray,
            };
        };
        Song.prototype.fromJsonObject = function (jsonObject) {
            this.initToDefault(true);
            if (!jsonObject)
                return;
            var version = jsonObject.version;
            if (version > Song._format)
                return;
            this.scale = 11;
            if (jsonObject.scale != undefined) {
                var oldScaleNames = { "romani :)": 8, "romani :(": 9 };
                var scale = oldScaleNames[jsonObject.scale] != undefined ? oldScaleNames[jsonObject.scale] : Config.scaleNames.indexOf(jsonObject.scale);
                if (scale != -1)
                    this.scale = scale;
            }
            if (jsonObject.key != undefined) {
                if (typeof (jsonObject.key) == "number") {
                    this.key = Config.keyNames.length - 1 - (((jsonObject.key + 1200) >>> 0) % Config.keyNames.length);
                }
                else if (typeof (jsonObject.key) == "string") {
                    var key = jsonObject.key;
                    var letter = key.charAt(0).toUpperCase();
                    var symbol = key.charAt(1).toLowerCase();
                    var letterMap = { "C": 11, "D": 9, "E": 7, "F": 6, "G": 4, "A": 2, "B": 0 };
                    var accidentalMap = { "#": -1, "♯": -1, "b": 1, "♭": 1 };
                    var index = letterMap[letter];
                    var offset = accidentalMap[symbol];
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
            if (jsonObject.beatsPerMinute != undefined) {
                var bpm = jsonObject.beatsPerMinute | 0;
                this.tempo = Math.round(4.0 + 9.0 * Math.log(bpm / 120) / Math.LN2);
                this.tempo = Song._clip(0, Config.tempoSteps, this.tempo);
            }
            if (jsonObject.reverb != undefined) {
                this.reverb = Song._clip(0, Config.reverbRange, jsonObject.reverb | 0);
            }
            if (jsonObject.beatsPerBar != undefined) {
                this.beatsPerBar = Math.max(Config.beatsPerBarMin, Math.min(Config.beatsPerBarMax, jsonObject.beatsPerBar | 0));
            }
            if (jsonObject.ticksPerBeat != undefined) {
                this.partsPerBeat = jsonObject.ticksPerBeat | 0;
                if (Config.partCounts.indexOf(this.partsPerBeat) == -1) {
                    this.partsPerBeat = Config.partCounts[Config.partCounts.length - 1];
                }
            }
            var maxInstruments = 1;
            var maxPatterns = 1;
            var maxBars = 1;
            if (jsonObject.channels) {
                for (var _i = 0, _a = jsonObject.channels; _i < _a.length; _i++) {
                    var channelObject = _a[_i];
                    if (channelObject.instruments)
                        maxInstruments = Math.max(maxInstruments, channelObject.instruments.length | 0);
                    if (channelObject.patterns)
                        maxPatterns = Math.max(maxPatterns, channelObject.patterns.length | 0);
                    if (channelObject.sequence)
                        maxBars = Math.max(maxBars, channelObject.sequence.length | 0);
                }
            }
            this.instrumentsPerChannel = maxInstruments;
            this.patternsPerChannel = maxPatterns;
            this.barCount = maxBars;
            if (jsonObject.introBars != undefined) {
                this.loopStart = Song._clip(0, this.barCount, jsonObject.introBars | 0);
            }
            if (jsonObject.loopBars != undefined) {
                this.loopLength = Song._clip(1, this.barCount - this.loopStart + 1, jsonObject.loopBars | 0);
            }
            var pitchChannelCount = 0;
            var drumChannelCount = 0;
            if (jsonObject.channels) {
                for (var channel = 0; channel < jsonObject.channels.length; channel++) {
                    var channelObject = jsonObject.channels[channel];
                    if (this.channels.length <= channel)
                        this.channels[channel] = new Channel();
                    if (channelObject.octaveScrollBar != undefined) {
                        this.channels[channel].octave = Song._clip(0, 5, channelObject.octaveScrollBar | 0);
                    }
                    for (var i = this.channels[channel].instruments.length; i < this.instrumentsPerChannel; i++) {
                        this.channels[channel].instruments[i] = new Instrument();
                    }
                    this.channels[channel].instruments.length = this.instrumentsPerChannel;
                    for (var i = this.channels[channel].patterns.length; i < this.patternsPerChannel; i++) {
                        this.channels[channel].patterns[i] = new Pattern();
                    }
                    this.channels[channel].patterns.length = this.patternsPerChannel;
                    for (var i = 0; i < this.barCount; i++) {
                        this.channels[channel].bars[i] = 1;
                    }
                    this.channels[channel].bars.length = this.barCount;
                    var isDrum = false;
                    if (channelObject.type) {
                        isDrum = (channelObject.type == "drum");
                    }
                    else {
                        isDrum = (channel >= 3);
                    }
                    if (isDrum)
                        drumChannelCount++;
                    else
                        pitchChannelCount++;
                    for (var i = 0; i < this.instrumentsPerChannel; i++) {
                        var instrument = this.channels[channel].instruments[i];
                        var instrumentObject = undefined;
                        if (channelObject.instruments)
                            instrumentObject = channelObject.instruments[i];
                        if (instrumentObject == undefined)
                            instrumentObject = {};
                        var oldTransitionNames = { "binary": 0 };
                        var transitionObject = instrumentObject.transition || instrumentObject.envelope;
                        instrument.transition = oldTransitionNames[transitionObject] != undefined ? oldTransitionNames[transitionObject] : Config.transitionNames.indexOf(transitionObject);
                        if (instrument.transition == -1)
                            instrument.transition = 1;
                        instrument.type = Config.instrumentTypeNames.indexOf(instrumentObject.type);
                        if (instrument.type == -1)
                            instrument.type = isDrum ? 2 : 0;
                        if (instrument.type == 2) {
                            if (instrumentObject.volume != undefined) {
                                instrument.volume = Song._clip(0, Config.volumeNames.length, Math.round(5 - (instrumentObject.volume | 0) / 20));
                            }
                            else {
                                instrument.volume = 0;
                            }
                            instrument.wave = Config.drumNames.indexOf(instrumentObject.wave);
                            if (instrument.wave == -1)
                                instrument.wave = 1;
                        }
                        else if (instrument.type == 0) {
                            if (instrumentObject.volume != undefined) {
                                instrument.volume = Song._clip(0, Config.volumeNames.length, Math.round(5 - (instrumentObject.volume | 0) / 20));
                            }
                            else {
                                instrument.volume = 0;
                            }
                            instrument.wave = Config.waveNames.indexOf(instrumentObject.wave);
                            if (instrument.wave == -1)
                                instrument.wave = 1;
                            var oldFilterNames = { "sustain sharp": 1, "sustain medium": 2, "sustain soft": 3, "decay sharp": 4 };
                            instrument.filter = oldFilterNames[instrumentObject.filter] != undefined ? oldFilterNames[instrumentObject.filter] : Config.filterNames.indexOf(instrumentObject.filter);
                            if (instrument.filter == -1)
                                instrument.filter = 0;
                            instrument.chorus = Config.chorusNames.indexOf(instrumentObject.chorus);
                            if (instrument.chorus == -1)
                                instrument.chorus = 0;
                            instrument.effect = Config.effectNames.indexOf(instrumentObject.effect);
                            if (instrument.effect == -1)
                                instrument.effect = 0;
                        }
                        else if (instrument.type == 1) {
                            instrument.effect = Config.effectNames.indexOf(instrumentObject.effect);
                            if (instrument.effect == -1)
                                instrument.effect = 0;
                            instrument.algorithm = Config.operatorAlgorithmNames.indexOf(instrumentObject.algorithm);
                            if (instrument.algorithm == -1)
                                instrument.algorithm = 0;
                            instrument.feedbackType = Config.operatorFeedbackNames.indexOf(instrumentObject.feedbackType);
                            if (instrument.feedbackType == -1)
                                instrument.feedbackType = 0;
                            if (instrumentObject.feedbackAmplitude != undefined) {
                                instrument.feedbackAmplitude = Song._clip(0, Config.operatorAmplitudeMax + 1, instrumentObject.feedbackAmplitude | 0);
                            }
                            else {
                                instrument.feedbackAmplitude = 0;
                            }
                            instrument.feedbackEnvelope = Config.operatorEnvelopeNames.indexOf(instrumentObject.feedbackEnvelope);
                            if (instrument.feedbackEnvelope == -1)
                                instrument.feedbackEnvelope = 0;
                            for (var j = 0; j < Config.operatorCount; j++) {
                                var operator = instrument.operators[j];
                                var operatorObject = undefined;
                                if (instrumentObject.operators)
                                    operatorObject = instrumentObject.operators[j];
                                if (operatorObject == undefined)
                                    operatorObject = {};
                                operator.frequency = Config.operatorFrequencyNames.indexOf(operatorObject.frequency);
                                if (operator.frequency == -1)
                                    operator.frequency = 0;
                                if (operatorObject.amplitude != undefined) {
                                    operator.amplitude = Song._clip(0, Config.operatorAmplitudeMax + 1, operatorObject.amplitude | 0);
                                }
                                else {
                                    operator.amplitude = 0;
                                }
                                operator.envelope = Config.operatorEnvelopeNames.indexOf(operatorObject.envelope);
                                if (operator.envelope == -1)
                                    operator.envelope = 0;
                            }
                        }
                        else {
                            throw new Error("Unrecognized instrument type.");
                        }
                    }
                    for (var i = 0; i < this.patternsPerChannel; i++) {
                        var pattern = this.channels[channel].patterns[i];
                        var patternObject = undefined;
                        if (channelObject.patterns)
                            patternObject = channelObject.patterns[i];
                        if (patternObject == undefined)
                            continue;
                        pattern.instrument = Song._clip(0, this.instrumentsPerChannel, (patternObject.instrument | 0) - 1);
                        if (patternObject.notes && patternObject.notes.length > 0) {
                            var maxNoteCount = Math.min(this.beatsPerBar * this.partsPerBeat, patternObject.notes.length >>> 0);
                            var tickClock = 0;
                            for (var j = 0; j < patternObject.notes.length; j++) {
                                if (j >= maxNoteCount)
                                    break;
                                var noteObject = patternObject.notes[j];
                                if (!noteObject || !noteObject.pitches || !(noteObject.pitches.length >= 1) || !noteObject.points || !(noteObject.points.length >= 2)) {
                                    continue;
                                }
                                var note = makeNote(0, 0, 0, 0);
                                note.pitches = [];
                                note.pins = [];
                                for (var k = 0; k < noteObject.pitches.length; k++) {
                                    var pitch = noteObject.pitches[k] | 0;
                                    if (note.pitches.indexOf(pitch) != -1)
                                        continue;
                                    note.pitches.push(pitch);
                                    if (note.pitches.length >= 4)
                                        break;
                                }
                                if (note.pitches.length < 1)
                                    continue;
                                var noteClock = tickClock;
                                var startInterval = 0;
                                for (var k = 0; k < noteObject.points.length; k++) {
                                    var pointObject = noteObject.points[k];
                                    if (pointObject == undefined || pointObject.tick == undefined)
                                        continue;
                                    var interval = (pointObject.pitchBend == undefined) ? 0 : (pointObject.pitchBend | 0);
                                    var time = pointObject.tick | 0;
                                    var volume = (pointObject.volume == undefined) ? 3 : Math.max(0, Math.min(3, Math.round((pointObject.volume | 0) * 3 / 100)));
                                    if (time > this.beatsPerBar * this.partsPerBeat)
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
                                var maxPitch = isDrum ? Config.drumCount - 1 : Config.maxPitch;
                                var lowestPitch = maxPitch;
                                var highestPitch = 0;
                                for (var k = 0; k < note.pitches.length; k++) {
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
                                for (var k = 0; k < note.pins.length; k++) {
                                    var pin = note.pins[k];
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
                    for (var i = 0; i < this.barCount; i++) {
                        this.channels[channel].bars[i] = channelObject.sequence ? Math.min(this.patternsPerChannel, channelObject.sequence[i] >>> 0) : 0;
                    }
                }
            }
            this.pitchChannelCount = pitchChannelCount;
            this.drumChannelCount = drumChannelCount;
            this.channels.length = this.getChannelCount();
        };
        Song._clip = function (min, max, val) {
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
        };
        Song.prototype.getPattern = function (channel, bar) {
            var patternIndex = this.channels[channel].bars[bar];
            if (patternIndex == 0)
                return null;
            return this.channels[channel].patterns[patternIndex - 1];
        };
        Song.prototype.getPatternInstrument = function (channel, bar) {
            var pattern = this.getPattern(channel, bar);
            return pattern == null ? 0 : pattern.instrument;
        };
        Song.prototype.getBeatsPerMinute = function () {
            return Math.round(120.0 * Math.pow(2.0, (-4.0 + this.tempo) / 9.0));
        };
        Song._format = "BeepBox";
        Song._oldestVersion = 2;
        Song._latestVersion = 6;
        Song._base64CharCodeToInt = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 62, 62, 0, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0, 0, 0, 0, 0, 0, 0, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 0, 0, 0, 0, 63, 0, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 0, 0, 0, 0, 0];
        Song._base64IntToCharCode = [48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 97, 98, 99, 100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118, 119, 120, 121, 122, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 45, 95];
        return Song;
    }());
    beepbox.Song = Song;
    var Tone = (function () {
        function Tone() {
            this.active = false;
            this.sample = 0.0;
            this.phases = [];
            this.phaseDeltas = [];
            this.volumeStarts = [];
            this.volumeDeltas = [];
            this.phaseDeltaScale = 0.0;
            this.filter = 0.0;
            this.filterScale = 0.0;
            this.vibratoScale = 0.0;
            this.harmonyMult = 0.0;
            this.harmonyVolumeMult = 1.0;
            this.feedbackOutputs = [];
            this.feedbackMult = 0.0;
            this.feedbackDelta = 0.0;
            this.reset();
        }
        Tone.prototype.reset = function () {
            for (var i = 0; i < Config.operatorCount; i++) {
                this.phases[i] = 0.0;
                this.feedbackOutputs[i] = 0.0;
            }
            this.sample = 0.0;
        };
        return Tone;
    }());
    var Synth = (function () {
        function Synth(song) {
            if (song === void 0) { song = null; }
            var _this = this;
            this.samplesPerSecond = 44100;
            this.effectDuration = 0.14;
            this.effectAngle = Math.PI * 2.0 / (this.effectDuration * this.samplesPerSecond);
            this.effectYMult = 2.0 * Math.cos(this.effectAngle);
            this.limitDecay = 1.0 / (2.0 * this.samplesPerSecond);
            this.song = null;
            this.pianoPressed = false;
            this.pianoPitch = [0];
            this.pianoChannel = 0;
            this.enableIntro = true;
            this.enableOutro = false;
            this.loopCount = -1;
            this.volume = 1.0;
            this.playheadInternal = 0.0;
            this.bar = 0;
            this.beat = 0;
            this.part = 0;
            this.arpeggio = 0;
            this.arpeggioSampleCountdown = 0;
            this.paused = true;
            this.tones = [];
            this.stillGoing = false;
            this.effectPhase = 0.0;
            this.limit = 0.0;
            this.samplesForReverb = null;
            this.reverbDelayLine = new Float32Array(16384);
            this.reverbDelayPos = 0;
            this.reverbFeedback0 = 0.0;
            this.reverbFeedback1 = 0.0;
            this.reverbFeedback2 = 0.0;
            this.reverbFeedback3 = 0.0;
            this.audioCtx = null;
            this.scriptNode = null;
            this.audioProcessCallback = function (audioProcessingEvent) {
                var outputBuffer = audioProcessingEvent.outputBuffer;
                var outputData = outputBuffer.getChannelData(0);
                _this.synthesize(outputData, outputBuffer.length);
            };
            if (song != null)
                this.setSong(song);
        }
        Synth.warmUpSynthesizer = function (song) {
            if (song != null) {
                for (var i = 0; i < song.instrumentsPerChannel; i++) {
                    for (var j = song.pitchChannelCount; j < song.pitchChannelCount + song.drumChannelCount; j++) {
                        Config.getDrumWave(song.channels[j].instruments[i].wave);
                    }
                    for (var j = 0; j < song.getChannelCount(); j++) {
                        Synth.getGeneratedSynthesizer(song.channels[j].instruments[i]);
                    }
                }
            }
        };
        Synth.operatorAmplitudeCurve = function (amplitude) {
            return (Math.pow(16.0, amplitude / 15.0) - 1.0) / 15.0;
        };
        Object.defineProperty(Synth.prototype, "playing", {
            get: function () {
                return !this.paused;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Synth.prototype, "playhead", {
            get: function () {
                return this.playheadInternal;
            },
            set: function (value) {
                if (this.song != null) {
                    this.playheadInternal = Math.max(0, Math.min(this.song.barCount, value));
                    var remainder = this.playheadInternal;
                    this.bar = Math.floor(remainder);
                    remainder = this.song.beatsPerBar * (remainder - this.bar);
                    this.beat = Math.floor(remainder);
                    remainder = this.song.partsPerBeat * (remainder - this.beat);
                    this.part = Math.floor(remainder);
                    remainder = 4 * (remainder - this.part);
                    this.arpeggio = Math.floor(remainder);
                    var samplesPerArpeggio = this.getSamplesPerArpeggio();
                    remainder = samplesPerArpeggio * (remainder - this.arpeggio);
                    this.arpeggioSampleCountdown = Math.floor(samplesPerArpeggio - remainder);
                    if (this.bar < this.song.loopStart) {
                        this.enableIntro = true;
                    }
                    if (this.bar > this.song.loopStart + this.song.loopLength) {
                        this.enableOutro = true;
                    }
                }
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Synth.prototype, "totalSamples", {
            get: function () {
                if (this.song == null)
                    return 0;
                var samplesPerBar = this.getSamplesPerArpeggio() * 4 * this.song.partsPerBeat * this.song.beatsPerBar;
                var loopMinCount = this.loopCount;
                if (loopMinCount < 0)
                    loopMinCount = 1;
                var bars = this.song.loopLength * loopMinCount;
                if (this.enableIntro)
                    bars += this.song.loopStart;
                if (this.enableOutro)
                    bars += this.song.barCount - (this.song.loopStart + this.song.loopLength);
                return bars * samplesPerBar;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Synth.prototype, "totalSeconds", {
            get: function () {
                return this.totalSamples / this.samplesPerSecond;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Synth.prototype, "totalBars", {
            get: function () {
                if (this.song == null)
                    return 0.0;
                return this.song.barCount;
            },
            enumerable: true,
            configurable: true
        });
        Synth.prototype.setSong = function (song) {
            if (typeof (song) == "string") {
                this.song = new Song(song);
            }
            else if (song instanceof Song) {
                this.song = song;
            }
        };
        Synth.prototype.play = function () {
            if (!this.paused)
                return;
            this.paused = false;
            Synth.warmUpSynthesizer(this.song);
            var contextClass = (window.AudioContext || window.webkitAudioContext || window.mozAudioContext || window.oAudioContext || window.msAudioContext);
            this.audioCtx = this.audioCtx || new contextClass();
            this.scriptNode = this.audioCtx.createScriptProcessor ? this.audioCtx.createScriptProcessor(2048, 0, 1) : this.audioCtx.createJavaScriptNode(2048, 0, 1);
            this.scriptNode.onaudioprocess = this.audioProcessCallback;
            this.scriptNode.channelCountMode = 'explicit';
            this.scriptNode.channelInterpretation = 'speakers';
            this.scriptNode.connect(this.audioCtx.destination);
            this.samplesPerSecond = this.audioCtx.sampleRate;
            this.effectAngle = Math.PI * 2.0 / (this.effectDuration * this.samplesPerSecond);
            this.effectYMult = 2.0 * Math.cos(this.effectAngle);
            this.limitDecay = 1.0 / (2.0 * this.samplesPerSecond);
        };
        Synth.prototype.pause = function () {
            if (this.paused)
                return;
            this.paused = true;
            this.scriptNode.disconnect(this.audioCtx.destination);
            if (this.audioCtx.close) {
                this.audioCtx.close();
                this.audioCtx = null;
            }
            this.scriptNode = null;
        };
        Synth.prototype.snapToStart = function () {
            this.bar = 0;
            this.enableIntro = true;
            this.snapToBar();
        };
        Synth.prototype.snapToBar = function (bar) {
            if (bar !== undefined)
                this.bar = bar;
            this.playheadInternal = this.bar;
            this.beat = 0;
            this.part = 0;
            this.arpeggio = 0;
            this.arpeggioSampleCountdown = 0;
            this.effectPhase = 0.0;
            for (var _i = 0, _a = this.tones; _i < _a.length; _i++) {
                var tone = _a[_i];
                tone.reset();
            }
            this.reverbDelayPos = 0;
            this.reverbFeedback0 = 0.0;
            this.reverbFeedback1 = 0.0;
            this.reverbFeedback2 = 0.0;
            this.reverbFeedback3 = 0.0;
            for (var i = 0; i < this.reverbDelayLine.length; i++)
                this.reverbDelayLine[i] = 0.0;
        };
        Synth.prototype.nextBar = function () {
            if (!this.song)
                return;
            var oldBar = this.bar;
            this.bar++;
            if (this.enableOutro) {
                if (this.bar >= this.song.barCount) {
                    this.bar = this.enableIntro ? 0 : this.song.loopStart;
                }
            }
            else {
                if (this.bar >= this.song.loopStart + this.song.loopLength || this.bar >= this.song.barCount) {
                    this.bar = this.song.loopStart;
                }
            }
            this.playheadInternal += this.bar - oldBar;
        };
        Synth.prototype.prevBar = function () {
            if (!this.song)
                return;
            var oldBar = this.bar;
            this.bar--;
            if (this.bar < 0) {
                this.bar = this.song.loopStart + this.song.loopLength - 1;
            }
            if (this.bar >= this.song.barCount) {
                this.bar = this.song.barCount - 1;
            }
            if (this.bar < this.song.loopStart) {
                this.enableIntro = true;
            }
            if (!this.enableOutro && this.bar >= this.song.loopStart + this.song.loopLength) {
                this.bar = this.song.loopStart + this.song.loopLength - 1;
            }
            this.playheadInternal += this.bar - oldBar;
        };
        Synth.prototype.synthesize = function (data, bufferLength) {
            if (this.song == null) {
                for (var i = 0; i < bufferLength; i++) {
                    data[i] = 0.0;
                }
                return;
            }
            var channelCount = this.song.getChannelCount();
            for (var i = this.tones.length; i < channelCount; i++) {
                this.tones[i] = new Tone();
            }
            this.tones.length = channelCount;
            var samplesPerArpeggio = this.getSamplesPerArpeggio();
            var bufferIndex = 0;
            var ended = false;
            if (this.arpeggioSampleCountdown == 0 || this.arpeggioSampleCountdown > samplesPerArpeggio) {
                this.arpeggioSampleCountdown = samplesPerArpeggio;
            }
            if (this.part >= this.song.partsPerBeat) {
                this.beat++;
                this.part = 0;
                this.arpeggio = 0;
                this.arpeggioSampleCountdown = samplesPerArpeggio;
            }
            if (this.beat >= this.song.beatsPerBar) {
                this.bar++;
                this.beat = 0;
                this.part = 0;
                this.arpeggio = 0;
                this.arpeggioSampleCountdown = samplesPerArpeggio;
                if (this.loopCount == -1) {
                    if (this.bar < this.song.loopStart && !this.enableIntro)
                        this.bar = this.song.loopStart;
                    if (this.bar >= this.song.loopStart + this.song.loopLength && !this.enableOutro)
                        this.bar = this.song.loopStart;
                }
            }
            if (this.bar >= this.song.barCount) {
                if (this.enableOutro) {
                    this.bar = 0;
                    this.enableIntro = true;
                    ended = true;
                    this.pause();
                }
                else {
                    this.bar = this.song.loopStart;
                }
            }
            if (this.bar >= this.song.loopStart) {
                this.enableIntro = false;
            }
            var synthStartTime = performance.now();
            for (var i = 0; i < bufferLength;) {
                data[i++] = 0.0;
                data[i++] = 0.0;
                data[i++] = 0.0;
                data[i++] = 0.0;
            }
            if (this.samplesForReverb == null || this.samplesForReverb.length < bufferLength) {
                this.samplesForReverb = new Float32Array(bufferLength);
            }
            var samplesForReverb = this.samplesForReverb;
            for (var i = 0; i < bufferLength;) {
                samplesForReverb[i++] = 0.0;
                samplesForReverb[i++] = 0.0;
                samplesForReverb[i++] = 0.0;
                samplesForReverb[i++] = 0.0;
            }
            while (bufferIndex < bufferLength && !ended) {
                while (bufferIndex < bufferLength) {
                    var samplesLeftInBuffer = bufferLength - bufferIndex;
                    var runLength = (this.arpeggioSampleCountdown <= samplesLeftInBuffer)
                        ? this.arpeggioSampleCountdown
                        : samplesLeftInBuffer;
                    for (var channel = 0; channel < this.song.getChannelCount(); channel++) {
                        var instrument = this.song.channels[channel].instruments[this.song.getPatternInstrument(channel, this.bar)];
                        Synth.computeTone(this, this.song, channel, samplesPerArpeggio, runLength, instrument);
                        var tone = this.tones[channel];
                        if (tone.active) {
                            var synthBuffer = this.song.getChannelIsDrum(channel)
                                ? data
                                : samplesForReverb;
                            var synthesizer = Synth.getGeneratedSynthesizer(instrument);
                            synthesizer(this, synthBuffer, bufferIndex, runLength, tone, instrument);
                        }
                    }
                    bufferIndex += runLength;
                    this.effectPhase = (this.effectPhase + this.effectAngle * runLength) % (Math.PI * 2.0);
                    this.arpeggioSampleCountdown -= runLength;
                    if (this.arpeggioSampleCountdown <= 0) {
                        this.arpeggio++;
                        this.arpeggioSampleCountdown = samplesPerArpeggio;
                        if (this.arpeggio == 4) {
                            this.arpeggio = 0;
                            this.part++;
                            if (this.part == this.song.partsPerBeat) {
                                this.part = 0;
                                this.beat++;
                                if (this.beat == this.song.beatsPerBar) {
                                    this.beat = 0;
                                    this.bar++;
                                    this.effectPhase = 0.0;
                                    if (this.bar < this.song.loopStart) {
                                        if (!this.enableIntro)
                                            this.bar = this.song.loopStart;
                                    }
                                    else {
                                        this.enableIntro = false;
                                    }
                                    if (this.bar >= this.song.loopStart + this.song.loopLength) {
                                        if (this.loopCount > 0)
                                            this.loopCount--;
                                        if (this.loopCount > 0 || !this.enableOutro) {
                                            this.bar = this.song.loopStart;
                                        }
                                    }
                                    if (this.bar >= this.song.barCount) {
                                        this.bar = 0;
                                        this.enableIntro = true;
                                        ended = true;
                                        this.pause();
                                    }
                                    break;
                                }
                            }
                        }
                    }
                }
            }
            var volume = +this.volume;
            var reverbDelayLine = this.reverbDelayLine;
            var reverbDelayPos = 0 | this.reverbDelayPos;
            var reverbFeedback0 = +this.reverbFeedback0;
            var reverbFeedback1 = +this.reverbFeedback1;
            var reverbFeedback2 = +this.reverbFeedback2;
            var reverbFeedback3 = +this.reverbFeedback3;
            var reverb = Math.pow(this.song.reverb / beepbox.Config.reverbRange, 0.667) * 0.425;
            var limitDecay = +this.limitDecay;
            var limit = +this.limit;
            for (var i = 0; i < bufferLength; i++) {
                var sampleForReverb = samplesForReverb[i];
                var reverbDelayPos1 = (reverbDelayPos + 3041) & 0x3FFF;
                var reverbDelayPos2 = (reverbDelayPos + 6426) & 0x3FFF;
                var reverbDelayPos3 = (reverbDelayPos + 10907) & 0x3FFF;
                var delaySample0 = (reverbDelayLine[reverbDelayPos] + sampleForReverb);
                var delaySample1 = reverbDelayLine[reverbDelayPos1];
                var delaySample2 = reverbDelayLine[reverbDelayPos2];
                var delaySample3 = reverbDelayLine[reverbDelayPos3];
                var delayTemp0 = -delaySample0 + delaySample1;
                var delayTemp1 = -delaySample0 - delaySample1;
                var delayTemp2 = -delaySample2 + delaySample3;
                var delayTemp3 = -delaySample2 - delaySample3;
                reverbFeedback0 += ((delayTemp0 + delayTemp2) * reverb - reverbFeedback0) * 0.5;
                reverbFeedback1 += ((delayTemp1 + delayTemp3) * reverb - reverbFeedback1) * 0.5;
                reverbFeedback2 += ((delayTemp0 - delayTemp2) * reverb - reverbFeedback2) * 0.5;
                reverbFeedback3 += ((delayTemp1 - delayTemp3) * reverb - reverbFeedback3) * 0.5;
                reverbDelayLine[reverbDelayPos1] = reverbFeedback0;
                reverbDelayLine[reverbDelayPos2] = reverbFeedback1;
                reverbDelayLine[reverbDelayPos3] = reverbFeedback2;
                reverbDelayLine[reverbDelayPos] = reverbFeedback3;
                reverbDelayPos = (reverbDelayPos + 1) & 0x3FFF;
                var sample = data[i] + delaySample0 + delaySample1 + delaySample2 + delaySample3;
                var abs = sample < 0.0 ? -sample : sample;
                if (limit < abs)
                    limit = abs;
                data[i] = (sample / (limit * 0.75 + 0.25)) * volume;
                limit -= limitDecay;
            }
            this.reverbDelayPos = reverbDelayPos;
            this.reverbFeedback0 = reverbFeedback0;
            this.reverbFeedback1 = reverbFeedback1;
            this.reverbFeedback2 = reverbFeedback2;
            this.reverbFeedback3 = reverbFeedback3;
            this.limit = limit;
            this.playheadInternal = (((this.arpeggio + 1.0 - this.arpeggioSampleCountdown / samplesPerArpeggio) / 4.0 + this.part) / this.song.partsPerBeat + this.beat) / this.song.beatsPerBar + this.bar;
            var synthDuration = performance.now() - synthStartTime;
            samplesAccumulated += bufferLength;
            samplePerformance += synthDuration;
        };
        Synth.computeOperatorEnvelope = function (envelope, time, beats, customVolume) {
            switch (Config.operatorEnvelopeType[envelope]) {
                case 0: return customVolume;
                case 1: return 1.0;
                case 4:
                    var curve = 1.0 / (1.0 + time * Config.operatorEnvelopeSpeed[envelope]);
                    if (Config.operatorEnvelopeInverted[envelope]) {
                        return 1.0 - curve;
                    }
                    else {
                        return curve;
                    }
                case 5:
                    return 0.5 - Math.cos(beats * 2.0 * Math.PI * Config.operatorEnvelopeSpeed[envelope]) * 0.5;
                case 2:
                    return Math.max(1.0, 2.0 - time * 10.0);
                case 3:
                    var speed = Config.operatorEnvelopeSpeed[envelope];
                    var attack = 0.25 / Math.sqrt(speed);
                    return time < attack ? time / attack : 1.0 / (1.0 + (time - attack) * speed);
                default: throw new Error("Unrecognized operator envelope type.");
            }
        };
        Synth.computeTone = function (synth, song, channel, samplesPerArpeggio, runLength, instrument) {
            var isDrum = song.getChannelIsDrum(channel);
            var tone = synth.tones[channel];
            var pattern = song.getPattern(channel, synth.bar);
            var pianoMode = (synth.pianoPressed && channel == synth.pianoChannel);
            var basePitch = isDrum ? Config.drumBasePitches[instrument.wave] : Config.keyTransposes[song.key];
            var intervalScale = isDrum ? Config.drumInterval : 1;
            var pitchDamping = isDrum ? (Config.drumWaveIsSoft[instrument.wave] ? 24.0 : 60.0) : 48.0;
            var secondsPerPart = 4.0 * samplesPerArpeggio / synth.samplesPerSecond;
            var beatsPerPart = 1.0 / song.partsPerBeat;
            tone.phaseDeltaScale = 0.0;
            tone.filter = 1.0;
            tone.filterScale = 1.0;
            tone.vibratoScale = 0.0;
            tone.harmonyMult = 1.0;
            tone.harmonyVolumeMult = 1.0;
            tone.active = false;
            var partsSinceStart = 0.0;
            var arpeggio = synth.arpeggio;
            var arpeggioSampleCountdown = synth.arpeggioSampleCountdown;
            var pitches = null;
            var resetPhases = true;
            var intervalStart = 0.0;
            var intervalEnd = 0.0;
            var transitionVolumeStart = 1.0;
            var transitionVolumeEnd = 1.0;
            var envelopeVolumeStart = 0.0;
            var envelopeVolumeEnd = 0.0;
            var partTimeStart = 0.0;
            var partTimeEnd = 0.0;
            var decayTimeStart = 0.0;
            var decayTimeEnd = 0.0;
            for (var i = 0; i < Config.operatorCount; i++) {
                tone.phaseDeltas[i] = 0.0;
                tone.volumeStarts[i] = 0.0;
                tone.volumeDeltas[i] = 0.0;
            }
            if (pianoMode) {
                pitches = synth.pianoPitch;
                transitionVolumeStart = transitionVolumeEnd = 1;
                envelopeVolumeStart = envelopeVolumeEnd = 1;
                resetPhases = false;
            }
            else if (pattern != null) {
                var time = synth.part + synth.beat * song.partsPerBeat;
                var note = null;
                var prevNote = null;
                var nextNote = null;
                for (var i = 0; i < pattern.notes.length; i++) {
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
                if (note != null && prevNote != null && prevNote.end != note.start)
                    prevNote = null;
                if (note != null && nextNote != null && nextNote.start != note.end)
                    nextNote = null;
                if (note != null) {
                    pitches = note.pitches;
                    partsSinceStart = time - note.start;
                    var endPinIndex = void 0;
                    for (endPinIndex = 1; endPinIndex < note.pins.length - 1; endPinIndex++) {
                        if (note.pins[endPinIndex].time + note.start > time)
                            break;
                    }
                    var startPin = note.pins[endPinIndex - 1];
                    var endPin = note.pins[endPinIndex];
                    var noteStart = note.start * 4;
                    var noteEnd = note.end * 4;
                    var pinStart = (note.start + startPin.time) * 4;
                    var pinEnd = (note.start + endPin.time) * 4;
                    var tickTimeStart = time * 4 + arpeggio;
                    var tickTimeEnd = time * 4 + arpeggio + 1;
                    var pinRatioStart = (tickTimeStart - pinStart) / (pinEnd - pinStart);
                    var pinRatioEnd = (tickTimeEnd - pinStart) / (pinEnd - pinStart);
                    var envelopeVolumeTickStart = startPin.volume + (endPin.volume - startPin.volume) * pinRatioStart;
                    var envelopeVolumeTickEnd = startPin.volume + (endPin.volume - startPin.volume) * pinRatioEnd;
                    var transitionVolumeTickStart = 1.0;
                    var transitionVolumeTickEnd = 1.0;
                    var intervalTickStart = startPin.interval + (endPin.interval - startPin.interval) * pinRatioStart;
                    var intervalTickEnd = startPin.interval + (endPin.interval - startPin.interval) * pinRatioEnd;
                    var partTimeTickStart = startPin.time + (endPin.time - startPin.time) * pinRatioStart;
                    var partTimeTickEnd = startPin.time + (endPin.time - startPin.time) * pinRatioEnd;
                    var decayTimeTickStart = partTimeTickStart;
                    var decayTimeTickEnd = partTimeTickEnd;
                    var startRatio = 1.0 - (arpeggioSampleCountdown) / samplesPerArpeggio;
                    var endRatio = 1.0 - (arpeggioSampleCountdown - runLength) / samplesPerArpeggio;
                    resetPhases = (tickTimeStart + startRatio - noteStart == 0.0);
                    var transition = instrument.transition;
                    if (tickTimeStart == noteStart) {
                        if (transition == 0) {
                            resetPhases = false;
                        }
                        else if (transition == 2) {
                            transitionVolumeTickStart = 0.0;
                        }
                        else if (transition == 3) {
                            if (prevNote == null) {
                                transitionVolumeTickStart = 0.0;
                            }
                            else if (prevNote.pins[prevNote.pins.length - 1].volume == 0 || note.pins[0].volume == 0) {
                                transitionVolumeTickStart = 0.0;
                            }
                            else {
                                intervalTickStart = (prevNote.pitches[0] + prevNote.pins[prevNote.pins.length - 1].interval - note.pitches[0]) * 0.5;
                                decayTimeTickStart = prevNote.pins[prevNote.pins.length - 1].time * 0.5;
                                resetPhases = false;
                            }
                        }
                    }
                    if (tickTimeEnd == noteEnd) {
                        if (transition == 0) {
                            if (nextNote == null && note.start + endPin.time != song.partsPerBeat * song.beatsPerBar) {
                                transitionVolumeTickEnd = 0.0;
                            }
                        }
                        else if (transition == 1 || transition == 2) {
                            transitionVolumeTickEnd = 0.0;
                        }
                        else if (transition == 3) {
                            if (nextNote == null) {
                                transitionVolumeTickEnd = 0.0;
                            }
                            else if (note.pins[note.pins.length - 1].volume == 0 || nextNote.pins[0].volume == 0) {
                                transitionVolumeTickEnd = 0.0;
                            }
                            else {
                                intervalTickEnd = (nextNote.pitches[0] - note.pitches[0] + note.pins[note.pins.length - 1].interval) * 0.5;
                                decayTimeTickEnd *= 0.5;
                            }
                        }
                    }
                    intervalStart = intervalTickStart + (intervalTickEnd - intervalTickStart) * startRatio;
                    intervalEnd = intervalTickStart + (intervalTickEnd - intervalTickStart) * endRatio;
                    envelopeVolumeStart = synth.volumeConversion(envelopeVolumeTickStart + (envelopeVolumeTickEnd - envelopeVolumeTickStart) * startRatio);
                    envelopeVolumeEnd = synth.volumeConversion(envelopeVolumeTickStart + (envelopeVolumeTickEnd - envelopeVolumeTickStart) * endRatio);
                    transitionVolumeStart = transitionVolumeTickStart + (transitionVolumeTickEnd - transitionVolumeTickStart) * startRatio;
                    transitionVolumeEnd = transitionVolumeTickStart + (transitionVolumeTickEnd - transitionVolumeTickStart) * endRatio;
                    partTimeStart = note.start + partTimeTickStart + (partTimeTickEnd - partTimeTickStart) * startRatio;
                    partTimeEnd = note.start + partTimeTickStart + (partTimeTickEnd - partTimeTickStart) * endRatio;
                    decayTimeStart = decayTimeTickStart + (decayTimeTickEnd - decayTimeTickStart) * startRatio;
                    decayTimeEnd = decayTimeTickStart + (decayTimeTickEnd - decayTimeTickStart) * endRatio;
                }
            }
            if (pitches != null) {
                var sampleTime = 1.0 / synth.samplesPerSecond;
                tone.active = true;
                if (!isDrum && instrument.type == 1) {
                    var sineVolumeBoost = 1.0;
                    var totalCarrierVolume = 0.0;
                    var carrierCount = Config.operatorCarrierCounts[instrument.algorithm];
                    for (var i = 0; i < Config.operatorCount; i++) {
                        var associatedCarrierIndex = Config.operatorAssociatedCarrier[instrument.algorithm][i] - 1;
                        var pitch = pitches[(i < pitches.length) ? i : ((associatedCarrierIndex < pitches.length) ? associatedCarrierIndex : 0)];
                        var freqMult = Config.operatorFrequencies[instrument.operators[i].frequency];
                        var chorusInterval = Config.operatorCarrierChorus[associatedCarrierIndex];
                        var startPitch = (pitch + intervalStart) * intervalScale + chorusInterval;
                        var startFreq = freqMult * (synth.frequencyFromPitch(basePitch + startPitch)) + Config.operatorHzOffsets[instrument.operators[i].frequency];
                        tone.phaseDeltas[i] = startFreq * sampleTime * Config.sineWaveLength;
                        if (resetPhases)
                            tone.reset();
                        var amplitudeCurve = Synth.operatorAmplitudeCurve(instrument.operators[i].amplitude);
                        var amplitudeMult = amplitudeCurve * Config.operatorAmplitudeSigns[instrument.operators[i].frequency];
                        var volumeStart = amplitudeMult;
                        var volumeEnd = amplitudeMult;
                        if (i < carrierCount) {
                            var volumeMult = 0.03;
                            var endPitch = (pitch + intervalEnd) * intervalScale;
                            var pitchVolumeStart = Math.pow(2.0, -startPitch / pitchDamping);
                            var pitchVolumeEnd = Math.pow(2.0, -endPitch / pitchDamping);
                            volumeStart *= pitchVolumeStart * volumeMult * transitionVolumeStart;
                            volumeEnd *= pitchVolumeEnd * volumeMult * transitionVolumeEnd;
                            totalCarrierVolume += amplitudeCurve;
                        }
                        else {
                            volumeStart *= Config.sineWaveLength * 1.5;
                            volumeEnd *= Config.sineWaveLength * 1.5;
                            sineVolumeBoost *= 1.0 - Math.min(1.0, instrument.operators[i].amplitude / 15);
                        }
                        var envelope = instrument.operators[i].envelope;
                        volumeStart *= Synth.computeOperatorEnvelope(envelope, secondsPerPart * decayTimeStart, beatsPerPart * partTimeStart, envelopeVolumeStart);
                        volumeEnd *= Synth.computeOperatorEnvelope(envelope, secondsPerPart * decayTimeEnd, beatsPerPart * partTimeEnd, envelopeVolumeEnd);
                        tone.volumeStarts[i] = volumeStart;
                        tone.volumeDeltas[i] = (volumeEnd - volumeStart) / runLength;
                    }
                    var feedbackAmplitude = Config.sineWaveLength * 0.3 * instrument.feedbackAmplitude / 15.0;
                    var feedbackStart = feedbackAmplitude * Synth.computeOperatorEnvelope(instrument.feedbackEnvelope, secondsPerPart * decayTimeStart, beatsPerPart * partTimeStart, envelopeVolumeStart);
                    var feedbackEnd = feedbackAmplitude * Synth.computeOperatorEnvelope(instrument.feedbackEnvelope, secondsPerPart * decayTimeEnd, beatsPerPart * partTimeEnd, envelopeVolumeEnd);
                    tone.feedbackMult = feedbackStart;
                    tone.feedbackDelta = (feedbackEnd - tone.feedbackMult) / runLength;
                    sineVolumeBoost *= 1.0 - instrument.feedbackAmplitude / 15.0;
                    sineVolumeBoost *= 1.0 - Math.min(1.0, Math.max(0.0, totalCarrierVolume - 1) / 2.0);
                    for (var i = 0; i < carrierCount; i++) {
                        tone.volumeStarts[i] *= 1.0 + sineVolumeBoost * 3.0;
                        tone.volumeDeltas[i] *= 1.0 + sineVolumeBoost * 3.0;
                    }
                }
                else {
                    var pitch = pitches[0];
                    if (Config.chorusHarmonizes[instrument.chorus]) {
                        var harmonyOffset = 0.0;
                        if (pitches.length == 2) {
                            harmonyOffset = pitches[1] - pitches[0];
                        }
                        else if (pitches.length == 3) {
                            harmonyOffset = pitches[(arpeggio >> 1) + 1] - pitches[0];
                        }
                        else if (pitches.length == 4) {
                            harmonyOffset = pitches[(arpeggio == 3 ? 1 : arpeggio) + 1] - pitches[0];
                        }
                        tone.harmonyMult = Math.pow(2.0, harmonyOffset / 12.0);
                        tone.harmonyVolumeMult = Math.pow(2.0, -harmonyOffset / pitchDamping);
                    }
                    else {
                        if (pitches.length == 2) {
                            pitch = pitches[arpeggio >> 1];
                        }
                        else if (pitches.length == 3) {
                            pitch = pitches[arpeggio == 3 ? 1 : arpeggio];
                        }
                        else if (pitches.length == 4) {
                            pitch = pitches[arpeggio];
                        }
                    }
                    var startPitch = (pitch + intervalStart) * intervalScale;
                    var endPitch = (pitch + intervalEnd) * intervalScale;
                    var startFreq = synth.frequencyFromPitch(basePitch + startPitch);
                    var pitchVolumeStart = Math.pow(2.0, -startPitch / pitchDamping);
                    var pitchVolumeEnd = Math.pow(2.0, -endPitch / pitchDamping);
                    if (isDrum && Config.drumWaveIsSoft[instrument.wave]) {
                        tone.filter = Math.min(1.0, startFreq * sampleTime * Config.drumPitchFilterMult[instrument.wave]);
                    }
                    var settingsVolumeMult = void 0;
                    if (!isDrum) {
                        var filterScaleRate = Config.filterDecays[instrument.filter];
                        tone.filter = Math.pow(2, -filterScaleRate * secondsPerPart * decayTimeStart);
                        var endFilter = Math.pow(2, -filterScaleRate * secondsPerPart * decayTimeEnd);
                        tone.filterScale = Math.pow(endFilter / tone.filter, 1.0 / runLength);
                        settingsVolumeMult = 0.27 * 0.5 * Config.waveVolumes[instrument.wave] * Config.filterVolumes[instrument.filter] * Config.chorusVolumes[instrument.chorus];
                    }
                    else {
                        settingsVolumeMult = 0.19 * Config.drumVolumes[instrument.wave];
                    }
                    if (resetPhases && !isDrum) {
                        tone.reset();
                    }
                    tone.phaseDeltas[0] = startFreq * sampleTime;
                    var instrumentVolumeMult = (instrument.volume == 5) ? 0.0 : Math.pow(2, -Config.volumeValues[instrument.volume]);
                    tone.volumeStarts[0] = transitionVolumeStart * envelopeVolumeStart * pitchVolumeStart * settingsVolumeMult * instrumentVolumeMult;
                    var volumeEnd = transitionVolumeEnd * envelopeVolumeEnd * pitchVolumeEnd * settingsVolumeMult * instrumentVolumeMult;
                    tone.volumeDeltas[0] = (volumeEnd - tone.volumeStarts[0]) / runLength;
                }
                tone.phaseDeltaScale = Math.pow(2.0, ((intervalEnd - intervalStart) * intervalScale / 12.0) / runLength);
                tone.vibratoScale = (partsSinceStart < Config.effectVibratoDelays[instrument.effect]) ? 0.0 : Math.pow(2.0, Config.effectVibratos[instrument.effect] / 12.0) - 1.0;
            }
            else {
                if (!isDrum) {
                    tone.reset();
                }
                for (var i = 0; i < Config.operatorCount; i++) {
                    tone.phaseDeltas[0] = 0.0;
                    tone.volumeStarts[0] = 0.0;
                    tone.volumeDeltas[0] = 0.0;
                }
            }
        };
        Synth.getGeneratedSynthesizer = function (instrument) {
            if (instrument.type == 1) {
                var fingerprint = instrument.algorithm + "_" + instrument.feedbackType;
                if (Synth.fmSynthFunctionCache[fingerprint] == undefined) {
                    var synthSource = [];
                    for (var _i = 0, _a = Synth.fmSourceTemplate; _i < _a.length; _i++) {
                        var line = _a[_i];
                        if (line.indexOf("// CARRIER OUTPUTS") != -1) {
                            if (instrument.type == 1) {
                                var outputs = [];
                                for (var j = 0; j < Config.operatorCarrierCounts[instrument.algorithm]; j++) {
                                    outputs.push("operator" + j + "Scaled");
                                }
                                synthSource.push(line.replace("/*operator#Scaled*/", outputs.join(" + ")));
                            }
                        }
                        else if (line.indexOf("// INSERT OPERATOR COMPUTATION HERE") != -1) {
                            for (var j = Config.operatorCount - 1; j >= 0; j--) {
                                for (var _b = 0, _c = Synth.operatorSourceTemplate; _b < _c.length; _b++) {
                                    var operatorLine = _c[_b];
                                    if (operatorLine.indexOf("/* + operator@Scaled*/") != -1) {
                                        var modulators = "";
                                        for (var _d = 0, _e = Config.operatorModulatedBy[instrument.algorithm][j]; _d < _e.length; _d++) {
                                            var modulatorNumber = _e[_d];
                                            modulators += " + operator" + (modulatorNumber - 1) + "Scaled";
                                        }
                                        var feedbackIndices = Config.operatorFeedbackIndices[instrument.feedbackType][j];
                                        if (feedbackIndices.length > 0) {
                                            modulators += " + feedbackMult * (";
                                            var feedbacks = [];
                                            for (var _f = 0, feedbackIndices_1 = feedbackIndices; _f < feedbackIndices_1.length; _f++) {
                                                var modulatorNumber = feedbackIndices_1[_f];
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
                            for (var j = 0; j < Config.operatorCount; j++) {
                                synthSource.push(line.replace(/\#/g, j + ""));
                            }
                        }
                        else {
                            synthSource.push(line);
                        }
                    }
                    Synth.fmSynthFunctionCache[fingerprint] = new Function("synth", "data", "bufferIndex", "runLength", "tone", "instrument", synthSource.join("\n"));
                }
                return Synth.fmSynthFunctionCache[fingerprint];
            }
            else if (instrument.type == 0) {
                return Synth.chipSynth;
            }
            else if (instrument.type == 2) {
                return Synth.noiseSynth;
            }
            else {
                throw new Error("Unrecognized instrument type: " + instrument.type);
            }
        };
        Synth.chipSynth = function (synth, data, bufferIndex, runLength, tone, instrument) {
            var effectYMult = +synth.effectYMult;
            var effectY = +Math.sin(synth.effectPhase);
            var prevEffectY = +Math.sin(synth.effectPhase - synth.effectAngle);
            var wave = beepbox.Config.waves[instrument.wave];
            var waveLength = +wave.length;
            var filterBase = +Math.pow(2, -beepbox.Config.filterBases[instrument.filter]);
            var tremoloScale = +beepbox.Config.effectTremolos[instrument.effect];
            var chorusA = +Math.pow(2.0, (beepbox.Config.chorusOffsets[instrument.chorus] + beepbox.Config.chorusIntervals[instrument.chorus]) / 12.0);
            var chorusB = Math.pow(2.0, (beepbox.Config.chorusOffsets[instrument.chorus] - beepbox.Config.chorusIntervals[instrument.chorus]) / 12.0) * tone.harmonyMult;
            var chorusSign = tone.harmonyVolumeMult * beepbox.Config.chorusSigns[instrument.chorus];
            if (instrument.chorus == 0)
                tone.phases[1] = tone.phases[0];
            var deltaRatio = chorusB / chorusA;
            var phaseDelta = tone.phaseDeltas[0] * chorusA;
            var phaseDeltaScale = +tone.phaseDeltaScale;
            var volume = +tone.volumeStarts[0];
            var volumeDelta = +tone.volumeDeltas[0];
            var filter = tone.filter * filterBase;
            var filterScale = +tone.filterScale;
            var vibratoScale = +tone.vibratoScale;
            var phaseA = tone.phases[0] % 1;
            var phaseB = tone.phases[1] % 1;
            var sample = +tone.sample;
            var stopIndex = bufferIndex + runLength;
            while (bufferIndex < stopIndex) {
                var vibrato = 1.0 + vibratoScale * effectY;
                var tremolo = 1.0 + tremoloScale * (effectY - 1.0);
                var temp = effectY;
                effectY = effectYMult * effectY - prevEffectY;
                prevEffectY = temp;
                var waveA = wave[0 | (phaseA * waveLength)];
                var waveB = wave[0 | (phaseB * waveLength)] * chorusSign;
                var combinedWave = (waveA + waveB) * volume * tremolo;
                sample += (combinedWave - sample) * filter;
                volume += volumeDelta;
                phaseA += phaseDelta * vibrato;
                phaseB += phaseDelta * vibrato * deltaRatio;
                filter *= filterScale;
                phaseA -= 0 | phaseA;
                phaseB -= 0 | phaseB;
                phaseDelta *= phaseDeltaScale;
                data[bufferIndex] += sample;
                bufferIndex++;
            }
            tone.phases[0] = phaseA;
            tone.phases[1] = phaseB;
            tone.sample = sample;
        };
        Synth.noiseSynth = function (synth, data, bufferIndex, runLength, tone, instrument) {
            var wave = beepbox.Config.getDrumWave(instrument.wave);
            var phaseDelta = +tone.phaseDeltas[0] / 32768.0;
            var phaseDeltaScale = +tone.phaseDeltaScale;
            var volume = +tone.volumeStarts[0];
            var volumeDelta = +tone.volumeDeltas[0];
            var filter = +tone.filter;
            var phase = tone.phases[0] % 1;
            var sample = +tone.sample;
            var stopIndex = bufferIndex + runLength;
            while (bufferIndex < stopIndex) {
                sample += (wave[0 | (phase * 32768.0)] * volume - sample) * filter;
                volume += volumeDelta;
                phase += phaseDelta;
                phase -= 0 | phase;
                phaseDelta *= phaseDeltaScale;
                data[bufferIndex] += sample;
                bufferIndex++;
            }
            tone.phases[0] = phase;
            tone.sample = sample;
        };
        Synth.prototype.frequencyFromPitch = function (pitch) {
            return 440.0 * Math.pow(2.0, (pitch - 69.0) / 12.0);
        };
        Synth.prototype.volumeConversion = function (noteVolume) {
            return Math.pow(noteVolume / 3.0, 1.5);
        };
        Synth.prototype.getSamplesPerArpeggio = function () {
            if (this.song == null)
                return 0;
            var beatsPerMinute = this.song.getBeatsPerMinute();
            var beatsPerSecond = beatsPerMinute / 60.0;
            var partsPerSecond = beatsPerSecond * this.song.partsPerBeat;
            var arpeggioPerSecond = partsPerSecond * 4.0;
            return Math.floor(this.samplesPerSecond / arpeggioPerSecond);
        };
        Synth.negativePhaseGuard = 1000;
        Synth.fmSynthFunctionCache = {};
        Synth.fmSourceTemplate = ("\n\t\t\t// TODO: Skip this line and oscillator below unless using an effect:\n\t\t\tvar effectYMult = +synth.effectYMult;\n\t\t\tvar effectY     = +Math.sin(synth.effectPhase);\n\t\t\tvar prevEffectY = +Math.sin(synth.effectPhase - synth.effectAngle);\n\t\t\t\n\t\t\tvar sineWave = beepbox.Config.sineWave;\n\t\t\t\n\t\t\tvar tremoloScale = +beepbox.Config.effectTremolos[instrument.effect];\n\t\t\t\n\t\t\tvar phaseDeltaScale = +tone.phaseDeltaScale;\n\t\t\tvar vibratoScale = +tone.vibratoScale;\n\t\t\tvar operator#Phase       = +((tone.phases[#] % 1) + " + Synth.negativePhaseGuard + ") * " + Config.sineWaveLength + ";\n\t\t\tvar operator#PhaseDelta  = +tone.phaseDeltas[#];\n\t\t\tvar operator#OutputMult  = +tone.volumeStarts[#];\n\t\t\tvar operator#OutputDelta = +tone.volumeDeltas[#];\n\t\t\tvar operator#Output      = +tone.feedbackOutputs[#];\n\t\t\tvar feedbackMult         = +tone.feedbackMult;\n\t\t\tvar feedbackDelta        = +tone.feedbackDelta;\n\t\t\tvar sample = +tone.sample;\n\t\t\t\n\t\t\tvar stopIndex = bufferIndex + runLength;\n\t\t\twhile (bufferIndex < stopIndex) {\n\t\t\t\tvar vibrato = 1.0 + vibratoScale * effectY;\n\t\t\t\tvar tremolo = 1.0 + tremoloScale * (effectY - 1.0);\n\t\t\t\tvar temp = effectY;\n\t\t\t\teffectY = effectYMult * effectY - prevEffectY;\n\t\t\t\tprevEffectY = temp;\n\t\t\t\t\n\t\t\t\t// INSERT OPERATOR COMPUTATION HERE\n\t\t\t\tsample = tremolo * (/*operator#Scaled*/); // CARRIER OUTPUTS\n\t\t\t\tfeedbackMult += feedbackDelta;\n\t\t\t\toperator#OutputMult += operator#OutputDelta;\n\t\t\t\toperator#Phase += operator#PhaseDelta * vibrato;\n\t\t\t\toperator#PhaseDelta *= phaseDeltaScale;\n\t\t\t\t\n\t\t\t\tdata[bufferIndex] += sample;\n\t\t\t\tbufferIndex++;\n\t\t\t}\n\t\t\t\n\t\t\ttone.phases[#] = operator#Phase / " + Config.sineWaveLength + ";\n\t\t\ttone.feedbackOutputs[#] = operator#Output;\n\t\t\ttone.sample = sample;\n\t\t").split("\n");
        Synth.operatorSourceTemplate = ("\n\t\t\t\tvar operator#PhaseMix = operator#Phase/* + operator@Scaled*/;\n\t\t\t\tvar operator#PhaseInt = operator#PhaseMix|0;\n\t\t\t\tvar operator#Index    = operator#PhaseInt & " + Config.sineWaveMask + ";\n\t\t\t\tvar operator#Sample   = sineWave[operator#Index];\n\t\t\t\toperator#Output       = operator#Sample + (sineWave[operator#Index + 1] - operator#Sample) * (operator#PhaseMix - operator#PhaseInt);\n\t\t\t\tvar operator#Scaled   = operator#OutputMult * operator#Output;\n\t\t").split("\n");
        return Synth;
    }());
    beepbox.Synth = Synth;
})(beepbox || (beepbox = {}));
var beepbox;
(function (beepbox) {
    var ChangeNotifier = (function () {
        function ChangeNotifier() {
            this._watchers = [];
            this._dirty = false;
        }
        ChangeNotifier.prototype.watch = function (watcher) {
            if (this._watchers.indexOf(watcher) == -1) {
                this._watchers.push(watcher);
            }
        };
        ChangeNotifier.prototype.unwatch = function (watcher) {
            var index = this._watchers.indexOf(watcher);
            if (index != -1) {
                this._watchers.splice(index, 1);
            }
        };
        ChangeNotifier.prototype.changed = function () {
            this._dirty = true;
        };
        ChangeNotifier.prototype.notifyWatchers = function () {
            if (!this._dirty)
                return;
            this._dirty = false;
            for (var _i = 0, _a = this._watchers.concat(); _i < _a.length; _i++) {
                var watcher = _a[_i];
                watcher();
            }
        };
        return ChangeNotifier;
    }());
    beepbox.ChangeNotifier = ChangeNotifier;
})(beepbox || (beepbox = {}));
var beepbox;
(function (beepbox) {
    var SongDocument = (function () {
        function SongDocument(string) {
            var _this = this;
            this.notifier = new beepbox.ChangeNotifier();
            this.channel = 0;
            this.bar = 0;
            this.volume = 75;
            this.trackVisibleBars = 16;
            this.barScrollPos = 0;
            this.prompt = null;
            this._recentChange = null;
            this._sequenceNumber = 0;
            this._barFromCurrentState = 0;
            this._channelFromCurrentState = 0;
            this._shouldPushState = false;
            this._waitingToUpdateState = false;
            this._whenHistoryStateChanged = function () {
                var state = window.history.state;
                if (state && state.sequenceNumber == _this._sequenceNumber)
                    return;
                if (state == null) {
                    _this._sequenceNumber++;
                    state = { canUndo: true, sequenceNumber: _this._sequenceNumber, bar: _this.bar, channel: _this.channel, prompt: _this.prompt };
                    new beepbox.ChangeSong(_this, location.hash);
                    window.history.replaceState(state, "", "#" + _this.song.toBase64String());
                }
                else {
                    if (state.sequenceNumber == _this._sequenceNumber - 1) {
                        _this.bar = _this._barFromCurrentState;
                        _this.channel = _this._channelFromCurrentState;
                    }
                    else if (state.sequenceNumber != _this._sequenceNumber) {
                        _this.bar = state.bar;
                        _this.channel = state.channel;
                    }
                    _this._sequenceNumber = state.sequenceNumber;
                    _this.prompt = state.prompt;
                    new beepbox.ChangeSong(_this, location.hash);
                }
                _this._barFromCurrentState = state.bar;
                _this._channelFromCurrentState = state.channel;
                _this.forgetLastChange();
                _this.notifier.notifyWatchers();
            };
            this._cleanDocument = function () {
                _this.notifier.notifyWatchers();
            };
            this._updateHistoryState = function () {
                _this._waitingToUpdateState = false;
                var hash = "#" + _this.song.toBase64String();
                var state;
                if (_this._shouldPushState) {
                    _this._sequenceNumber++;
                    state = { canUndo: true, sequenceNumber: _this._sequenceNumber, bar: _this.bar, channel: _this.channel, prompt: _this.prompt };
                    window.history.pushState(state, "", hash);
                }
                else {
                    state = { canUndo: true, sequenceNumber: _this._sequenceNumber, bar: _this.bar, channel: _this.channel, prompt: _this.prompt };
                    window.history.replaceState(state, "", hash);
                }
                _this._barFromCurrentState = state.bar;
                _this._channelFromCurrentState = state.channel;
                _this._shouldPushState = false;
            };
            this.song = new beepbox.Song(string);
            this.synth = new beepbox.Synth(this.song);
            this.autoPlay = localStorage.getItem("autoPlay") == "true";
            this.autoFollow = localStorage.getItem("autoFollow") == "true";
            this.showFifth = localStorage.getItem("showFifth") == "true";
            this.showLetters = localStorage.getItem("showLetters") == "true";
            this.showChannels = localStorage.getItem("showChannels") == "true";
            this.showScrollBar = localStorage.getItem("showScrollBar") == "true";
            if (localStorage.getItem("volume") != null)
                this.volume = Number(localStorage.getItem("volume"));
            this.synth.volume = this._calcVolume();
            var state = window.history.state;
            if (state == null) {
                state = { canUndo: false, sequenceNumber: 0, bar: 0, channel: 0, prompt: null };
                window.history.replaceState(state, "", "#" + this.song.toBase64String());
            }
            window.addEventListener("hashchange", this._whenHistoryStateChanged);
            window.addEventListener("popstate", this._whenHistoryStateChanged);
            this.bar = state.bar;
            this.channel = state.channel;
            this._barFromCurrentState = state.bar;
            this._channelFromCurrentState = state.channel;
            this.barScrollPos = Math.max(0, this.bar - (this.trackVisibleBars - 6));
            this.prompt = state.prompt;
            for (var _i = 0, _a = ["input", "change", "click", "keyup", "keydown", "mousedown", "mousemove", "mouseup", "touchstart", "touchmove", "touchend", "touchcancel"]; _i < _a.length; _i++) {
                var eventName = _a[_i];
                window.addEventListener(eventName, this._cleanDocument);
            }
        }
        SongDocument.prototype.record = function (change, replaceState) {
            if (replaceState === void 0) { replaceState = false; }
            if (change.isNoop()) {
                this._recentChange = null;
                if (replaceState) {
                    window.history.back();
                }
            }
            else {
                this._recentChange = change;
                if (!replaceState) {
                    this._shouldPushState = true;
                }
                if (!this._waitingToUpdateState) {
                    window.requestAnimationFrame(this._updateHistoryState);
                    this._waitingToUpdateState = true;
                }
            }
        };
        SongDocument.prototype.openPrompt = function (prompt) {
            this.prompt = prompt;
            var hash = "#" + this.song.toBase64String();
            this._sequenceNumber++;
            var state = { canUndo: true, sequenceNumber: this._sequenceNumber, bar: this.bar, channel: this.channel, prompt: this.prompt };
            window.history.pushState(state, "", hash);
        };
        SongDocument.prototype.undo = function () {
            var state = window.history.state;
            if (state.canUndo)
                window.history.back();
        };
        SongDocument.prototype.redo = function () {
            window.history.forward();
        };
        SongDocument.prototype.setProspectiveChange = function (change) {
            this._recentChange = change;
        };
        SongDocument.prototype.forgetLastChange = function () {
            this._recentChange = null;
        };
        SongDocument.prototype.lastChangeWas = function (change) {
            return change != null && change == this._recentChange;
        };
        SongDocument.prototype.savePreferences = function () {
            localStorage.setItem("autoPlay", this.autoPlay ? "true" : "false");
            localStorage.setItem("autoFollow", this.autoFollow ? "true" : "false");
            localStorage.setItem("showFifth", this.showFifth ? "true" : "false");
            localStorage.setItem("showLetters", this.showLetters ? "true" : "false");
            localStorage.setItem("showChannels", this.showChannels ? "true" : "false");
            localStorage.setItem("showScrollBar", this.showScrollBar ? "true" : "false");
            localStorage.setItem("volume", String(this.volume));
        };
        SongDocument.prototype.setVolume = function (val) {
            this.volume = val;
            this.savePreferences();
            this.synth.volume = this._calcVolume();
        };
        SongDocument.prototype._calcVolume = function () {
            return Math.min(1.0, Math.pow(this.volume / 50.0, 0.5)) * Math.pow(2.0, (this.volume - 75.0) / 25.0);
        };
        SongDocument.prototype.getCurrentPattern = function () {
            return this.song.getPattern(this.channel, this.bar);
        };
        SongDocument.prototype.getCurrentInstrument = function () {
            var pattern = this.getCurrentPattern();
            return pattern == null ? 0 : pattern.instrument;
        };
        SongDocument._latestVersion = 2;
        return SongDocument;
    }());
    beepbox.SongDocument = SongDocument;
})(beepbox || (beepbox = {}));
var beepbox;
(function (beepbox) {
    var html;
    (function (html) {
        function element(type, attributes, children) {
            var elem = document.createElement(type);
            if (attributes)
                for (var _i = 0, _a = Object.keys(attributes); _i < _a.length; _i++) {
                    var key = _a[_i];
                    if (key == "style")
                        elem.setAttribute(key, attributes[key]);
                    else
                        elem[key] = attributes[key];
                }
            if (children)
                for (var _b = 0, children_1 = children; _b < children_1.length; _b++) {
                    var child = children_1[_b];
                    elem.appendChild(child);
                }
            return elem;
        }
        html.element = element;
        function button(attributes, children) {
            return element("button", attributes, children);
        }
        html.button = button;
        function div(attributes, children) {
            return element("div", attributes, children);
        }
        html.div = div;
        function span(attributes, children) {
            return element("span", attributes, children);
        }
        html.span = span;
        function select(attributes, children) {
            return element("select", attributes, children);
        }
        html.select = select;
        function option(value, display, selected, disabled) {
            if (selected === void 0) { selected = false; }
            if (disabled === void 0) { disabled = false; }
            var o = document.createElement("option");
            o.value = value;
            o.selected = selected;
            o.disabled = disabled;
            o.appendChild(text(display));
            return o;
        }
        html.option = option;
        function canvas(attributes) {
            return element("canvas", attributes);
        }
        html.canvas = canvas;
        function input(attributes) {
            return element("input", attributes);
        }
        html.input = input;
        function br() {
            return element("br");
        }
        html.br = br;
        function text(content) {
            return document.createTextNode(content);
        }
        html.text = text;
    })(html = beepbox.html || (beepbox.html = {}));
    var svgNS = "http://www.w3.org/2000/svg";
    function svgElement(type, attributes, children) {
        var elem = document.createElementNS(svgNS, type);
        if (attributes)
            for (var _i = 0, _a = Object.keys(attributes); _i < _a.length; _i++) {
                var key = _a[_i];
                elem.setAttribute(key, attributes[key]);
            }
        if (children)
            for (var _b = 0, children_2 = children; _b < children_2.length; _b++) {
                var child = children_2[_b];
                elem.appendChild(child);
            }
        return elem;
    }
    beepbox.svgElement = svgElement;
})(beepbox || (beepbox = {}));
var beepbox;
(function (beepbox) {
    var styleSheet = document.createElement('style');
    styleSheet.type = "text/css";
    styleSheet.appendChild(document.createTextNode("\n\n.beepboxEditor {\n\tdisplay: flex;\n\t-webkit-touch-callout: none;\n\t-webkit-user-select: none;\n\t-khtml-user-select: none;\n\t-moz-user-select: none;\n\t-ms-user-select: none;\n\tuser-select: none;\n\tposition: relative;\n\ttouch-action: manipulation;\n\tcursor: default;\n\tfont-size: small;\n\toverflow: hidden;\n}\n\n.beepboxEditor div {\n\tmargin: 0;\n\tpadding: 0;\n}\n\n.beepboxEditor .promptContainer {\n\tposition: absolute;\n\ttop: 0;\n\tleft: 0;\n\twidth: 100%;\n\theight: 100%;\n\tbackground: rgba(0,0,0,0.5);\n\tdisplay: flex;\n\tjustify-content: center;\n\talign-items: center;\n}\n\n.beepboxEditor .prompt {\n\tmargin: auto;\n\ttext-align: center;\n\tbackground: #000;\n\tborder-radius: 15px;\n\tborder: 4px solid #444;\n\tcolor: #fff;\n\tpadding: 20px;\n\tdisplay: flex;\n\tflex-direction: column;\n}\n\n.beepboxEditor .prompt > *:not(:first-child) {\n\tmargin-top: 1.5em;\n}\n\n/* Use psuedo-elements to add cross-browser up & down arrows to select elements: */\n.beepboxEditor .selectContainer {\n\tposition: relative;\n}\n.beepboxEditor .selectContainer:not(.menu)::before {\n\tcontent: \"\";\n\tposition: absolute;\n\tright: 0.3em;\n\ttop: 0.4em;\n\tborder-bottom: 0.4em solid currentColor;\n\tborder-left: 0.3em solid transparent;\n\tborder-right: 0.3em solid transparent;\n\tpointer-events: none;\n}\n.beepboxEditor .selectContainer:not(.menu)::after {\n\tcontent: \"\";\n\tposition: absolute;\n\tright: 0.3em;\n\tbottom: 0.4em;\n\tborder-top: 0.4em solid currentColor;\n\tborder-left: 0.3em solid transparent;\n\tborder-right: 0.3em solid transparent;\n\tpointer-events: none;\n}\n.beepboxEditor .selectContainer.menu::after {\n\tcontent: \"\";\n\tposition: absolute;\n\tright: 0.7em;\n\tmargin: auto;\n\ttop: 0;\n\tbottom: 0;\n\theight: 0;\n\tborder-top: 0.4em solid currentColor;\n\tborder-left: 0.3em solid transparent;\n\tborder-right: 0.3em solid transparent;\n\tpointer-events: none;\n}\n.beepboxEditor select {\n\tmargin: 0;\n\tpadding: 0 0.3em;\n\tdisplay: block;\n\theight: 2em;\n\tborder: none;\n\tborder-radius: 0.4em;\n\tbackground: #444444;\n\tcolor: inherit;\n\tfont-size: inherit;\n\tcursor: pointer;\n\tfont-family: inherit;\n\n\t-webkit-appearance:none;\n\t-moz-appearance: none;\n\tappearance: none;\n}\n.beepboxEditor .menu select {\n\tpadding: 0 2em;\n}\n.beepboxEditor select:focus {\n\tbackground: #777777;\n\toutline: none;\n}\n.beepboxEditor .menu select {\n\ttext-align: center;\n\ttext-align-last: center;\n}\n\n/* This makes it look better in firefox on my computer... What about others?\n@-moz-document url-prefix() {\n\t.beepboxEditor select { padding: 0 2px; }\n}\n*/\n.beepboxEditor button {\n\tmargin: 0;\n\tposition: relative;\n\theight: 2em;\n\tborder: none;\n\tborder-radius: 0.4em;\n\tbackground: #444;\n\tcolor: inherit;\n\tfont-size: inherit;\n\tfont-family: inherit;\n\tcursor: pointer;\n}\n.beepboxEditor button:focus {\n\tbackground: #777;\n\toutline: none;\n}\n.beepboxEditor button.playButton, .beepboxEditor button.pauseButton {\n\tpadding-left: 2em;\n}\n.beepboxEditor button.playButton::before {\n\tcontent: \"\";\n\tposition: absolute;\n\tleft: 0.7em;\n\ttop: 50%;\n\tmargin-top: -0.65em;\n\tborder-left: 1em solid currentColor;\n\tborder-top: 0.65em solid transparent;\n\tborder-bottom: 0.65em solid transparent;\n\tpointer-events: none;\n}\n.beepboxEditor button.pauseButton::before {\n\tcontent: \"\";\n\tposition: absolute;\n\tleft: 0.7em;\n\ttop: 50%;\n\tmargin-top: -0.65em;\n\twidth: 0.3em;\n\theight: 1.3em;\n\tbackground: currentColor;\n\tpointer-events: none;\n}\n.beepboxEditor button.pauseButton::after {\n\tcontent: \"\";\n\tposition: absolute;\n\tleft: 1.4em;\n\ttop: 50%;\n\tmargin-top: -0.65em;\n\twidth: 0.3em;\n\theight: 1.3em;\n\tbackground: currentColor;\n\tpointer-events: none;\n}\n\n.beepboxEditor button.prevBarButton::before {\n\tcontent: \"\";\n\tposition: absolute;\n\tleft: 50%;\n\ttop: 50%;\n\tmargin-left: -0.5em;\n\tmargin-top: -0.5em;\n\twidth: 0.2em;\n\theight: 1em;\n\tbackground: currentColor;\n\tpointer-events: none;\n}\n.beepboxEditor button.prevBarButton::after {\n\tcontent: \"\";\n\tposition: absolute;\n\tleft: 50%;\n\ttop: 50%;\n\tmargin-left: -0.3em;\n\tmargin-top: -0.5em;\n\tborder-right: 0.8em solid currentColor;\n\tborder-top: 0.5em solid transparent;\n\tborder-bottom: 0.5em solid transparent;\n\tpointer-events: none;\n}\n\n.beepboxEditor button.nextBarButton::before {\n\tcontent: \"\";\n\tposition: absolute;\n\tleft: 50%;\n\ttop: 50%;\n\tmargin-left: -0.5em;\n\tmargin-top: -0.5em;\n\tborder-left: 0.8em solid currentColor;\n\tborder-top: 0.5em solid transparent;\n\tborder-bottom: 0.5em solid transparent;\n\tpointer-events: none;\n}\n.beepboxEditor button.nextBarButton::after {\n\tcontent: \"\";\n\tposition: absolute;\n\tleft: 50%;\n\ttop: 50%;\n\tmargin-left: 0.3em;\n\tmargin-top: -0.5em;\n\twidth: 0.2em;\n\theight: 1em;\n\tbackground: currentColor;\n\tpointer-events: none;\n}\n\n.beepboxEditor canvas {\n\toverflow: hidden;\n\tposition: absolute;\n\tdisplay: block;\n}\n\n.beepboxEditor .trackContainer {\n\toverflow-x: hidden;\n}\n\n.beepboxEditor .selectRow {\n\tmargin: 0;\n\theight: 2.5em;\n\tdisplay: flex;\n\tflex-direction: row;\n\talign-items: center;\n\tjustify-content: space-between;\n}\n\n.beepboxEditor .selectRow > span {\n\tcolor: #999;\n}\n\n.beepboxEditor .operatorRow {\n\tmargin: 0;\n\theight: 2.5em;\n\tdisplay: flex;\n\tflex-direction: row;\n\talign-items: center;\n}\n\n.beepboxEditor .operatorRow > * {\n\tflex-grow: 1;\n\tflex-shrink: 1;\n}\n\n.beepboxEditor .editor-widget-column {\n\tdisplay: flex;\n\tflex-direction: column;\n}\n\n.beepboxEditor .editor-widgets {\n\tdisplay: flex;\n\tflex-direction: column;\n}\n\n.beepboxEditor .editor-controls {\n\tdisplay: flex;\n\tflex-direction: column;\n}\n\n.beepboxEditor .editor-menus {\n\tdisplay: flex;\n\tflex-direction: column;\n}\n\n.beepboxEditor .editor-settings {\n\tdisplay: flex;\n\tflex-direction: column;\n}\n\n.beepboxEditor .editor-song-settings {\n\tdisplay: flex;\n\tflex-direction: column;\n}\n\n.beepboxEditor .editor-instrument-settings {\n\tdisplay: flex;\n\tflex-direction: column;\n}\n\n.beepboxEditor .editor-right-side-top > *, .beepboxEditor .editor-right-side-bottom > * {\n\tflex-shrink: 0;\n}\n\n.beepboxEditor input[type=text], .beepboxEditor input[type=number] {\n\tfont-size: inherit;\n\tbackground: transparent;\n\tborder: 1px solid #777;\n\tcolor: white;\n}\n\n.beepboxEditor input[type=checkbox] {\n  transform: scale(1.5);\n}\n\n.beepboxEditor input[type=range] {\n\t-webkit-appearance: none;\n\tcolor: inherit;\n\twidth: 100%;\n\theight: 2em;\n\tfont-size: inherit;\n\tmargin: 0;\n\tcursor: pointer;\n\tbackground-color: black;\n\ttouch-action: pan-y;\n}\n.beepboxEditor input[type=range]:focus {\n\toutline: none;\n}\n.beepboxEditor input[type=range]::-webkit-slider-runnable-track {\n\twidth: 100%;\n\theight: 0.5em;\n\tcursor: pointer;\n\tbackground: #444;\n}\n.beepboxEditor input[type=range]::-webkit-slider-thumb {\n\theight: 2em;\n\twidth: 0.5em;\n\tborder-radius: 0.25em;\n\tbackground: currentColor;\n\tcursor: pointer;\n\t-webkit-appearance: none;\n\tmargin-top: -0.75em;\n}\n.beepboxEditor input[type=range]:focus::-webkit-slider-runnable-track {\n\tbackground: #777;\n}\n.beepboxEditor input[type=range]::-moz-range-track {\n\twidth: 100%;\n\theight: 0.5em;\n\tcursor: pointer;\n\tbackground: #444;\n}\n.beepboxEditor input[type=range]:focus::-moz-range-track {\n\tbackground: #777;\n}\n.beepboxEditor input[type=range]::-moz-range-thumb {\n\theight: 2em;\n\twidth: 0.5em;\n\tborder-radius: 0.25em;\n\tborder: none;\n\tbackground: currentColor;\n\tcursor: pointer;\n}\n.beepboxEditor input[type=range]::-ms-track {\n\twidth: 100%;\n\theight: 0.5em;\n\tcursor: pointer;\n\tbackground: #444;\n\tborder-color: transparent;\n}\n.beepboxEditor input[type=range]:focus::-ms-track {\n\tbackground: #777;\n}\n.beepboxEditor input[type=range]::-ms-thumb {\n\theight: 2em;\n\twidth: 0.5em;\n\tborder-radius: 0.25em;\n\tbackground: currentColor;\n\tcursor: pointer;\n}\n.beepboxEditor .hintButton {\n\tborder: 1px solid currentColor;\n\tborder-radius: 50%;\n\ttext-decoration: none;\n\twidth: 1em;\n\theight: 1em;\n\ttext-align: center;\n\tmargin-left: auto;\n\tmargin-right: .4em;\n\tcursor: pointer;\n}\n\n/* wide screen */\n@media (min-width: 701px) {\n\t#beepboxEditorContainer {\n\t\tdisplay: table;\n\t}\n\t.beepboxEditor {\n\t\tflex-direction: row;\n\t}\n\t.beepboxEditor:focus-within {\n\t\toutline: 3px solid #555;\n\t}\n\t.beepboxEditor .trackContainer {\n\t\twidth: 512px;\n\t}\n\t.beepboxEditor .trackSelectBox {\n\t\tdisplay: none;\n\t}\n\t.beepboxEditor .playback-controls {\n\t\tdisplay: flex;\n\t\tflex-direction: column;\n\t}\n\t.beepboxEditor .playback-bar-controls {\n\t\tdisplay: flex;\n\t\tflex-direction: row;\n\t\tmargin: .2em 0;\n\t}\n\t.beepboxEditor .playback-volume-controls {\n\t\tdisplay: flex;\n\t\tflex-direction: row;\n\t\tmargin: .2em 0;\n\t\talign-items: center;\n\t}\n\t.beepboxEditor .pauseButton, .beepboxEditor .playButton {\n\t\tflex-grow: 1;\n\t}\n\t.beepboxEditor .nextBarButton, .beepboxEditor .prevBarButton {\n\t\tflex-grow: 1;\n\t\tmargin-left: 10px;\n\t}\n\t.beepboxEditor .editor-widget-column {\n\t\tmargin-left: 6px;\n\t\twidth: 14em;\n\t\tflex-direction: column;\n\t}\n\t.beepboxEditor .editor-widgets {\n\t\tflex-grow: 1;\n\t}\n\t.beepboxEditor .editor-settings input, .beepboxEditor .editor-settings select {\n\t\twidth: 8.6em;\n\t}\n\t.beepboxEditor .editor-menus > * {\n\t\tflex-grow: 1;\n\t\tmargin: .2em 0;\n\t}\n\t.beepboxEditor .editor-menus > button {\n\t\tpadding: 0 2em;\n\t\twhite-space: nowrap;\n\t}\n}\n\n/* narrow screen */\n@media (max-width: 700px) {\n\t.beepboxEditor {\n\t\tflex-direction: column;\n\t}\n\t.beepboxEditor:focus-within {\n\t\toutline: none;\n\t}\n\t.beepboxEditor .editorBox {\n\t\tmax-height: 75vh;\n\t}\n\t.beepboxEditor .editor-menus {\n\t\tflex-direction: row;\n\t}\n\t.beepboxEditor .editor-menus > * {\n\t\tflex-grow: 1;\n\t\tmargin: .2em;\n\t}\n\t.beepboxEditor .editor-menus > button {\n\t\tpadding-left: 2em;\n\t\twhite-space: nowrap;\n\t}\n\t.beepboxEditor .trackContainer {\n\t\toverflow-x: auto;\n\t}\n\t.beepboxEditor .barScrollBar {\n\t\tdisplay: none;\n\t}\n\t.beepboxEditor .playback-controls {\n\t\tdisplay: flex;\n\t\tflex-direction: row;\n\t\tmargin: .2em 0;\n\t}\n\t.beepboxEditor .playback-bar-controls {\n\t\tdisplay: flex;\n\t\tflex-direction: row;\n\t\tflex-grow: 1;\n\t}\n\t.beepboxEditor .playback-volume-controls {\n\t\tdisplay: flex;\n\t\tflex-direction: row;\n\t\talign-items: center;\n\t\tflex-grow: 1;\n\t\tmargin: 0 .2em;\n\t}\n\t.beepboxEditor .editor-widget-column {\n\t\tflex-direction: column-reverse;\n\t}\n\t.beepboxEditor .editor-settings {\n\t\tflex-direction: row;\n\t}\n\t.beepboxEditor .pauseButton, .beepboxEditor .playButton,\n\t.beepboxEditor .nextBarButton, .beepboxEditor .prevBarButton {\n\t\tflex-grow: 1;\n\t\tmargin: 0 .2em;\n\t}\n\t.beepboxEditor .editor-song-settings, .beepboxEditor .editor-instrument-settings {\n\t\tflex-grow: 1;\n\t\tmargin: 0 .2em;\n\t}\n\t.beepboxEditor .editor-settings input, .beepboxEditor .editor-settings .selectContainer {\n\t\twidth: 60%;\n\t}\n\t.beepboxEditor .editor-settings select {\n\t\twidth: 100%;\n\t}\n\t.fullWidthOnly {\n\t\tdisplay: none;\n\t}\n\tp {\n\t\tmargin: 1em 0.5em;\n\t}\n}\n\n"));
    document.head.appendChild(styleSheet);
})(beepbox || (beepbox = {}));
var beepbox;
(function (beepbox) {
    var Change = (function () {
        function Change() {
            this._noop = true;
        }
        Change.prototype._didSomething = function () {
            this._noop = false;
        };
        Change.prototype.isNoop = function () {
            return this._noop;
        };
        return Change;
    }());
    beepbox.Change = Change;
    var UndoableChange = (function (_super) {
        __extends(UndoableChange, _super);
        function UndoableChange(reversed) {
            var _this = _super.call(this) || this;
            _this._reversed = reversed;
            _this._doneForwards = !reversed;
            return _this;
        }
        UndoableChange.prototype.undo = function () {
            if (this._reversed) {
                this._doForwards();
                this._doneForwards = true;
            }
            else {
                this._doBackwards();
                this._doneForwards = false;
            }
        };
        UndoableChange.prototype.redo = function () {
            if (this._reversed) {
                this._doBackwards();
                this._doneForwards = false;
            }
            else {
                this._doForwards();
                this._doneForwards = true;
            }
        };
        UndoableChange.prototype._isDoneForwards = function () {
            return this._doneForwards;
        };
        UndoableChange.prototype._doForwards = function () {
            throw new Error("Change.doForwards(): Override me.");
        };
        UndoableChange.prototype._doBackwards = function () {
            throw new Error("Change.doBackwards(): Override me.");
        };
        return UndoableChange;
    }(Change));
    beepbox.UndoableChange = UndoableChange;
    var ChangeGroup = (function (_super) {
        __extends(ChangeGroup, _super);
        function ChangeGroup() {
            return _super.call(this) || this;
        }
        ChangeGroup.prototype.append = function (change) {
            if (change.isNoop())
                return;
            this._didSomething();
        };
        return ChangeGroup;
    }(Change));
    beepbox.ChangeGroup = ChangeGroup;
    var ChangeSequence = (function (_super) {
        __extends(ChangeSequence, _super);
        function ChangeSequence(changes) {
            var _this = _super.call(this, false) || this;
            if (changes == undefined) {
                _this._changes = [];
            }
            else {
                _this._changes = changes.concat();
            }
            return _this;
        }
        ChangeSequence.prototype.append = function (change) {
            if (change.isNoop())
                return;
            this._changes[this._changes.length] = change;
            this._didSomething();
        };
        ChangeSequence.prototype._doForwards = function () {
            for (var i = 0; i < this._changes.length; i++) {
                this._changes[i].redo();
            }
        };
        ChangeSequence.prototype._doBackwards = function () {
            for (var i = this._changes.length - 1; i >= 0; i--) {
                this._changes[i].undo();
            }
        };
        return ChangeSequence;
    }(UndoableChange));
    beepbox.ChangeSequence = ChangeSequence;
})(beepbox || (beepbox = {}));
var beepbox;
(function (beepbox) {
    var ChangePins = (function (_super) {
        __extends(ChangePins, _super);
        function ChangePins(_doc, _note) {
            var _this = _super.call(this, false) || this;
            _this._doc = _doc;
            _this._note = _note;
            _this._oldStart = _this._note.start;
            _this._oldEnd = _this._note.end;
            _this._newStart = _this._note.start;
            _this._newEnd = _this._note.end;
            _this._oldPins = _this._note.pins;
            _this._newPins = [];
            _this._oldPitches = _this._note.pitches;
            _this._newPitches = [];
            return _this;
        }
        ChangePins.prototype._finishSetup = function () {
            for (var i = 0; i < this._newPins.length - 1;) {
                if (this._newPins[i].time >= this._newPins[i + 1].time) {
                    this._newPins.splice(i, 1);
                }
                else {
                    i++;
                }
            }
            for (var i = 1; i < this._newPins.length - 1;) {
                if (this._newPins[i - 1].interval == this._newPins[i].interval &&
                    this._newPins[i].interval == this._newPins[i + 1].interval &&
                    this._newPins[i - 1].volume == this._newPins[i].volume &&
                    this._newPins[i].volume == this._newPins[i + 1].volume) {
                    this._newPins.splice(i, 1);
                }
                else {
                    i++;
                }
            }
            var firstInterval = this._newPins[0].interval;
            var firstTime = this._newPins[0].time;
            for (var i = 0; i < this._oldPitches.length; i++) {
                this._newPitches[i] = this._oldPitches[i] + firstInterval;
            }
            for (var i = 0; i < this._newPins.length; i++) {
                this._newPins[i].interval -= firstInterval;
                this._newPins[i].time -= firstTime;
            }
            this._newStart = this._oldStart + firstTime;
            this._newEnd = this._newStart + this._newPins[this._newPins.length - 1].time;
            this._doForwards();
            this._didSomething();
        };
        ChangePins.prototype._doForwards = function () {
            this._note.pins = this._newPins;
            this._note.pitches = this._newPitches;
            this._note.start = this._newStart;
            this._note.end = this._newEnd;
            this._doc.notifier.changed();
        };
        ChangePins.prototype._doBackwards = function () {
            this._note.pins = this._oldPins;
            this._note.pitches = this._oldPitches;
            this._note.start = this._oldStart;
            this._note.end = this._oldEnd;
            this._doc.notifier.changed();
        };
        return ChangePins;
    }(beepbox.UndoableChange));
    beepbox.ChangePins = ChangePins;
    var ChangeInstrumentType = (function (_super) {
        __extends(ChangeInstrumentType, _super);
        function ChangeInstrumentType(doc, newValue) {
            var _this = _super.call(this) || this;
            var oldValue = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()].type;
            if (oldValue != newValue) {
                doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()].type = newValue;
                doc.notifier.changed();
                _this._didSomething();
            }
            return _this;
        }
        return ChangeInstrumentType;
    }(beepbox.Change));
    beepbox.ChangeInstrumentType = ChangeInstrumentType;
    var ChangeTransition = (function (_super) {
        __extends(ChangeTransition, _super);
        function ChangeTransition(doc, newValue) {
            var _this = _super.call(this) || this;
            var oldValue = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()].transition;
            if (oldValue != newValue) {
                _this._didSomething();
                doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()].transition = newValue;
                doc.notifier.changed();
            }
            return _this;
        }
        return ChangeTransition;
    }(beepbox.Change));
    beepbox.ChangeTransition = ChangeTransition;
    var ChangePattern = (function (_super) {
        __extends(ChangePattern, _super);
        function ChangePattern(doc, oldValue, newValue) {
            var _this = _super.call(this) || this;
            _this.oldValue = oldValue;
            if (newValue > doc.song.patternsPerChannel)
                throw new Error("invalid pattern");
            doc.song.channels[doc.channel].bars[doc.bar] = newValue;
            doc.notifier.changed();
            if (oldValue != newValue)
                _this._didSomething();
            return _this;
        }
        return ChangePattern;
    }(beepbox.Change));
    beepbox.ChangePattern = ChangePattern;
    var ChangeBarCount = (function (_super) {
        __extends(ChangeBarCount, _super);
        function ChangeBarCount(doc, newValue) {
            var _this = _super.call(this) || this;
            if (doc.song.barCount != newValue) {
                for (var channel = 0; channel < doc.song.getChannelCount(); channel++) {
                    for (var bar = doc.song.barCount; bar < newValue; bar++) {
                        doc.song.channels[channel].bars[bar] = 1;
                    }
                    doc.song.channels[channel].bars.length = newValue;
                }
                var newBar = doc.bar;
                var newBarScrollPos = doc.barScrollPos;
                var newLoopStart = doc.song.loopStart;
                var newLoopLength = doc.song.loopLength;
                if (doc.song.barCount > newValue) {
                    newBar = Math.min(newBar, newValue - 1);
                    newBarScrollPos = Math.max(0, Math.min(newValue - doc.trackVisibleBars, newBarScrollPos));
                    newLoopLength = Math.min(newValue, newLoopLength);
                    newLoopStart = Math.min(newValue - newLoopLength, newLoopStart);
                }
                doc.bar = newBar;
                doc.barScrollPos = newBarScrollPos;
                doc.song.loopStart = newLoopStart;
                doc.song.loopLength = newLoopLength;
                doc.song.barCount = newValue;
                doc.notifier.changed();
                _this._didSomething();
            }
            return _this;
        }
        return ChangeBarCount;
    }(beepbox.Change));
    beepbox.ChangeBarCount = ChangeBarCount;
    var ChangeChannelCount = (function (_super) {
        __extends(ChangeChannelCount, _super);
        function ChangeChannelCount(doc, newPitchChannelCount, newDrumChannelCount) {
            var _this = _super.call(this) || this;
            if (doc.song.pitchChannelCount != newPitchChannelCount || doc.song.drumChannelCount != newDrumChannelCount) {
                var newChannels = [];
                for (var i = 0; i < newPitchChannelCount; i++) {
                    var channel = i;
                    var oldChannel = i;
                    if (i < doc.song.pitchChannelCount) {
                        newChannels[channel] = doc.song.channels[oldChannel];
                    }
                    else {
                        newChannels[channel] = new beepbox.Channel();
                        newChannels[channel].octave = 2;
                        for (var j = 0; j < doc.song.instrumentsPerChannel; j++) {
                            var instrument = new beepbox.Instrument();
                            instrument.setTypeAndReset(0);
                            newChannels[channel].instruments[j] = instrument;
                        }
                        for (var j = 0; j < doc.song.patternsPerChannel; j++) {
                            newChannels[channel].patterns[j] = new beepbox.Pattern();
                        }
                        for (var j = 0; j < doc.song.barCount; j++) {
                            newChannels[channel].bars[j] = 1;
                        }
                    }
                }
                for (var i = 0; i < newDrumChannelCount; i++) {
                    var channel = i + newPitchChannelCount;
                    var oldChannel = i + doc.song.pitchChannelCount;
                    if (i < doc.song.drumChannelCount) {
                        newChannels[channel] = doc.song.channels[oldChannel];
                    }
                    else {
                        newChannels[channel] = new beepbox.Channel();
                        newChannels[channel].octave = 0;
                        for (var j = 0; j < doc.song.instrumentsPerChannel; j++) {
                            var instrument = new beepbox.Instrument();
                            instrument.setTypeAndReset(2);
                            newChannels[channel].instruments[j] = instrument;
                        }
                        for (var j = 0; j < doc.song.patternsPerChannel; j++) {
                            newChannels[channel].patterns[j] = new beepbox.Pattern();
                        }
                        for (var j = 0; j < doc.song.barCount; j++) {
                            newChannels[channel].bars[j] = 1;
                        }
                    }
                }
                doc.song.pitchChannelCount = newPitchChannelCount;
                doc.song.drumChannelCount = newDrumChannelCount;
                for (var channel = 0; channel < doc.song.getChannelCount(); channel++) {
                    doc.song.channels[channel] = newChannels[channel];
                }
                doc.song.channels.length = doc.song.getChannelCount();
                doc.channel = Math.min(doc.channel, newPitchChannelCount + newDrumChannelCount - 1);
                doc.notifier.changed();
                _this._didSomething();
            }
            return _this;
        }
        return ChangeChannelCount;
    }(beepbox.Change));
    beepbox.ChangeChannelCount = ChangeChannelCount;
    var ChangeBeatsPerBar = (function (_super) {
        __extends(ChangeBeatsPerBar, _super);
        function ChangeBeatsPerBar(doc, newValue) {
            var _this = _super.call(this) || this;
            if (doc.song.beatsPerBar != newValue) {
                if (doc.song.beatsPerBar > newValue) {
                    var sequence = new beepbox.ChangeSequence();
                    for (var i = 0; i < doc.song.getChannelCount(); i++) {
                        for (var j = 0; j < doc.song.channels[i].patterns.length; j++) {
                            sequence.append(new ChangeNoteTruncate(doc, doc.song.channels[i].patterns[j], newValue * doc.song.partsPerBeat, doc.song.beatsPerBar * doc.song.partsPerBeat));
                        }
                    }
                }
                doc.song.beatsPerBar = newValue;
                doc.notifier.changed();
                _this._didSomething();
            }
            return _this;
        }
        return ChangeBeatsPerBar;
    }(beepbox.Change));
    beepbox.ChangeBeatsPerBar = ChangeBeatsPerBar;
    var ChangeChannelBar = (function (_super) {
        __extends(ChangeChannelBar, _super);
        function ChangeChannelBar(doc, newChannel, newBar) {
            var _this = _super.call(this) || this;
            var oldChannel = doc.channel;
            var oldBar = doc.bar;
            doc.channel = newChannel;
            doc.bar = newBar;
            doc.barScrollPos = Math.min(doc.bar, Math.max(doc.bar - (doc.trackVisibleBars - 1), doc.barScrollPos));
            doc.notifier.changed();
            if (oldChannel != newChannel || oldBar != newBar) {
                _this._didSomething();
            }
            return _this;
        }
        return ChangeChannelBar;
    }(beepbox.Change));
    beepbox.ChangeChannelBar = ChangeChannelBar;
    var ChangeChorus = (function (_super) {
        __extends(ChangeChorus, _super);
        function ChangeChorus(doc, newValue) {
            var _this = _super.call(this) || this;
            var oldValue = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()].chorus;
            if (oldValue != newValue) {
                _this._didSomething();
                doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()].chorus = newValue;
                doc.notifier.changed();
            }
            return _this;
        }
        return ChangeChorus;
    }(beepbox.Change));
    beepbox.ChangeChorus = ChangeChorus;
    var ChangeEffect = (function (_super) {
        __extends(ChangeEffect, _super);
        function ChangeEffect(doc, newValue) {
            var _this = _super.call(this) || this;
            var oldValue = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()].effect;
            if (oldValue != newValue) {
                doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()].effect = newValue;
                doc.notifier.changed();
                _this._didSomething();
            }
            return _this;
        }
        return ChangeEffect;
    }(beepbox.Change));
    beepbox.ChangeEffect = ChangeEffect;
    var ChangeFilter = (function (_super) {
        __extends(ChangeFilter, _super);
        function ChangeFilter(doc, newValue) {
            var _this = _super.call(this) || this;
            var oldValue = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()].filter;
            if (oldValue != newValue) {
                doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()].filter = newValue;
                doc.notifier.changed();
                _this._didSomething();
            }
            return _this;
        }
        return ChangeFilter;
    }(beepbox.Change));
    beepbox.ChangeFilter = ChangeFilter;
    var ChangeAlgorithm = (function (_super) {
        __extends(ChangeAlgorithm, _super);
        function ChangeAlgorithm(doc, newValue) {
            var _this = _super.call(this) || this;
            var oldValue = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()].algorithm;
            if (oldValue != newValue) {
                doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()].algorithm = newValue;
                doc.notifier.changed();
                _this._didSomething();
            }
            return _this;
        }
        return ChangeAlgorithm;
    }(beepbox.Change));
    beepbox.ChangeAlgorithm = ChangeAlgorithm;
    var ChangeFeedbackType = (function (_super) {
        __extends(ChangeFeedbackType, _super);
        function ChangeFeedbackType(doc, newValue) {
            var _this = _super.call(this) || this;
            var oldValue = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()].feedbackType;
            if (oldValue != newValue) {
                doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()].feedbackType = newValue;
                doc.notifier.changed();
                _this._didSomething();
            }
            return _this;
        }
        return ChangeFeedbackType;
    }(beepbox.Change));
    beepbox.ChangeFeedbackType = ChangeFeedbackType;
    var ChangeFeedbackEnvelope = (function (_super) {
        __extends(ChangeFeedbackEnvelope, _super);
        function ChangeFeedbackEnvelope(doc, newValue) {
            var _this = _super.call(this) || this;
            var oldValue = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()].feedbackEnvelope;
            if (oldValue != newValue) {
                doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()].feedbackEnvelope = newValue;
                doc.notifier.changed();
                _this._didSomething();
            }
            return _this;
        }
        return ChangeFeedbackEnvelope;
    }(beepbox.Change));
    beepbox.ChangeFeedbackEnvelope = ChangeFeedbackEnvelope;
    var ChangeOperatorEnvelope = (function (_super) {
        __extends(ChangeOperatorEnvelope, _super);
        function ChangeOperatorEnvelope(doc, operatorIndex, newValue) {
            var _this = _super.call(this) || this;
            var oldValue = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()].operators[operatorIndex].envelope;
            if (oldValue != newValue) {
                doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()].operators[operatorIndex].envelope = newValue;
                doc.notifier.changed();
                _this._didSomething();
            }
            return _this;
        }
        return ChangeOperatorEnvelope;
    }(beepbox.Change));
    beepbox.ChangeOperatorEnvelope = ChangeOperatorEnvelope;
    var ChangeOperatorFrequency = (function (_super) {
        __extends(ChangeOperatorFrequency, _super);
        function ChangeOperatorFrequency(doc, operatorIndex, newValue) {
            var _this = _super.call(this) || this;
            var oldValue = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()].operators[operatorIndex].frequency;
            if (oldValue != newValue) {
                doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()].operators[operatorIndex].frequency = newValue;
                doc.notifier.changed();
                _this._didSomething();
            }
            return _this;
        }
        return ChangeOperatorFrequency;
    }(beepbox.Change));
    beepbox.ChangeOperatorFrequency = ChangeOperatorFrequency;
    var ChangeOperatorAmplitude = (function (_super) {
        __extends(ChangeOperatorAmplitude, _super);
        function ChangeOperatorAmplitude(doc, operatorIndex, oldValue, newValue) {
            var _this = _super.call(this) || this;
            doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()].operators[operatorIndex].amplitude = newValue;
            doc.notifier.changed();
            if (oldValue != newValue)
                _this._didSomething();
            return _this;
        }
        return ChangeOperatorAmplitude;
    }(beepbox.Change));
    beepbox.ChangeOperatorAmplitude = ChangeOperatorAmplitude;
    var ChangeFeedbackAmplitude = (function (_super) {
        __extends(ChangeFeedbackAmplitude, _super);
        function ChangeFeedbackAmplitude(doc, oldValue, newValue) {
            var _this = _super.call(this) || this;
            doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()].feedbackAmplitude = newValue;
            doc.notifier.changed();
            if (oldValue != newValue)
                _this._didSomething();
            return _this;
        }
        return ChangeFeedbackAmplitude;
    }(beepbox.Change));
    beepbox.ChangeFeedbackAmplitude = ChangeFeedbackAmplitude;
    var ChangeInstrumentsPerChannel = (function (_super) {
        __extends(ChangeInstrumentsPerChannel, _super);
        function ChangeInstrumentsPerChannel(doc, newInstrumentsPerChannel) {
            var _this = _super.call(this) || this;
            if (doc.song.instrumentsPerChannel != newInstrumentsPerChannel) {
                for (var channel = 0; channel < doc.song.getChannelCount(); channel++) {
                    var sampleInstrument = doc.song.channels[channel].instruments[doc.song.instrumentsPerChannel - 1];
                    for (var j = doc.song.instrumentsPerChannel; j < newInstrumentsPerChannel; j++) {
                        var newInstrument = new beepbox.Instrument();
                        newInstrument.copy(sampleInstrument);
                        doc.song.channels[channel].instruments[j] = newInstrument;
                    }
                    doc.song.channels[channel].instruments.length = newInstrumentsPerChannel;
                    for (var j = 0; j < doc.song.patternsPerChannel; j++) {
                        if (doc.song.channels[channel].patterns[j].instrument >= newInstrumentsPerChannel) {
                            doc.song.channels[channel].patterns[j].instrument = 0;
                        }
                    }
                }
                doc.song.instrumentsPerChannel = newInstrumentsPerChannel;
                doc.notifier.changed();
                _this._didSomething();
            }
            return _this;
        }
        return ChangeInstrumentsPerChannel;
    }(beepbox.Change));
    beepbox.ChangeInstrumentsPerChannel = ChangeInstrumentsPerChannel;
    var ChangeKey = (function (_super) {
        __extends(ChangeKey, _super);
        function ChangeKey(doc, newValue) {
            var _this = _super.call(this) || this;
            if (doc.song.key != newValue) {
                doc.song.key = newValue;
                doc.notifier.changed();
                _this._didSomething();
            }
            return _this;
        }
        return ChangeKey;
    }(beepbox.Change));
    beepbox.ChangeKey = ChangeKey;
    var ChangeLoop = (function (_super) {
        __extends(ChangeLoop, _super);
        function ChangeLoop(_doc, oldStart, oldLength, newStart, newLength) {
            var _this = _super.call(this) || this;
            _this._doc = _doc;
            _this.oldStart = oldStart;
            _this.oldLength = oldLength;
            _this.newStart = newStart;
            _this.newLength = newLength;
            _this._doc.song.loopStart = _this.newStart;
            _this._doc.song.loopLength = _this.newLength;
            _this._doc.notifier.changed();
            if (_this.oldStart != _this.newStart || _this.oldLength != _this.newLength) {
                _this._didSomething();
            }
            return _this;
        }
        return ChangeLoop;
    }(beepbox.Change));
    beepbox.ChangeLoop = ChangeLoop;
    var ChangePitchAdded = (function (_super) {
        __extends(ChangePitchAdded, _super);
        function ChangePitchAdded(doc, note, pitch, index, deletion) {
            if (deletion === void 0) { deletion = false; }
            var _this = _super.call(this, deletion) || this;
            _this._doc = doc;
            _this._note = note;
            _this._pitch = pitch;
            _this._index = index;
            _this._didSomething();
            _this.redo();
            return _this;
        }
        ChangePitchAdded.prototype._doForwards = function () {
            this._note.pitches.splice(this._index, 0, this._pitch);
            this._doc.notifier.changed();
        };
        ChangePitchAdded.prototype._doBackwards = function () {
            this._note.pitches.splice(this._index, 1);
            this._doc.notifier.changed();
        };
        return ChangePitchAdded;
    }(beepbox.UndoableChange));
    beepbox.ChangePitchAdded = ChangePitchAdded;
    var ChangeOctave = (function (_super) {
        __extends(ChangeOctave, _super);
        function ChangeOctave(doc, oldValue, newValue) {
            var _this = _super.call(this) || this;
            _this.oldValue = oldValue;
            doc.song.channels[doc.channel].octave = newValue;
            doc.notifier.changed();
            if (oldValue != newValue)
                _this._didSomething();
            return _this;
        }
        return ChangeOctave;
    }(beepbox.Change));
    beepbox.ChangeOctave = ChangeOctave;
    var ChangePartsPerBeat = (function (_super) {
        __extends(ChangePartsPerBeat, _super);
        function ChangePartsPerBeat(doc, newValue) {
            var _this = _super.call(this) || this;
            if (doc.song.partsPerBeat != newValue) {
                for (var i = 0; i < doc.song.getChannelCount(); i++) {
                    for (var j = 0; j < doc.song.channels[i].patterns.length; j++) {
                        _this.append(new ChangeRhythm(doc, doc.song.channels[i].patterns[j], doc.song.partsPerBeat, newValue));
                    }
                }
                doc.song.partsPerBeat = newValue;
                doc.notifier.changed();
                _this._didSomething();
            }
            return _this;
        }
        return ChangePartsPerBeat;
    }(beepbox.ChangeGroup));
    beepbox.ChangePartsPerBeat = ChangePartsPerBeat;
    var ChangePaste = (function (_super) {
        __extends(ChangePaste, _super);
        function ChangePaste(doc, pattern, notes, newBeatsPerBar, newPartsPerBeat) {
            var _this = _super.call(this) || this;
            pattern.notes = notes;
            if (doc.song.partsPerBeat != newPartsPerBeat) {
                _this.append(new ChangeRhythm(doc, pattern, newPartsPerBeat, doc.song.partsPerBeat));
            }
            if (doc.song.beatsPerBar != newBeatsPerBar) {
                _this.append(new ChangeNoteTruncate(doc, pattern, doc.song.beatsPerBar * doc.song.partsPerBeat, newBeatsPerBar * doc.song.partsPerBeat));
            }
            doc.notifier.changed();
            _this._didSomething();
            return _this;
        }
        return ChangePaste;
    }(beepbox.ChangeGroup));
    beepbox.ChangePaste = ChangePaste;
    var ChangePatternInstrument = (function (_super) {
        __extends(ChangePatternInstrument, _super);
        function ChangePatternInstrument(doc, newValue, pattern) {
            var _this = _super.call(this) || this;
            if (pattern.instrument != newValue) {
                pattern.instrument = newValue;
                doc.notifier.changed();
                _this._didSomething();
            }
            return _this;
        }
        return ChangePatternInstrument;
    }(beepbox.Change));
    beepbox.ChangePatternInstrument = ChangePatternInstrument;
    var ChangePatternsPerChannel = (function (_super) {
        __extends(ChangePatternsPerChannel, _super);
        function ChangePatternsPerChannel(doc, newValue) {
            var _this = _super.call(this) || this;
            if (doc.song.patternsPerChannel != newValue) {
                for (var i = 0; i < doc.song.getChannelCount(); i++) {
                    var channelBars = doc.song.channels[i].bars;
                    var channelPatterns = doc.song.channels[i].patterns;
                    for (var j = 0; j < channelBars.length; j++) {
                        if (channelBars[j] > newValue)
                            channelBars[j] = 0;
                    }
                    for (var j = channelPatterns.length; j < newValue; j++) {
                        channelPatterns[j] = new beepbox.Pattern();
                    }
                    channelPatterns.length = newValue;
                }
                doc.song.patternsPerChannel = newValue;
                doc.notifier.changed();
                _this._didSomething();
            }
            return _this;
        }
        return ChangePatternsPerChannel;
    }(beepbox.Change));
    beepbox.ChangePatternsPerChannel = ChangePatternsPerChannel;
    var ChangePinTime = (function (_super) {
        __extends(ChangePinTime, _super);
        function ChangePinTime(doc, note, pinIndex, shiftedTime) {
            var _this = _super.call(this, doc, note) || this;
            shiftedTime -= _this._oldStart;
            var originalTime = _this._oldPins[pinIndex].time;
            var skipStart = Math.min(originalTime, shiftedTime);
            var skipEnd = Math.max(originalTime, shiftedTime);
            var setPin = false;
            for (var i = 0; i < _this._oldPins.length; i++) {
                var oldPin = note.pins[i];
                var time = oldPin.time;
                if (time < skipStart) {
                    _this._newPins.push(beepbox.makeNotePin(oldPin.interval, time, oldPin.volume));
                }
                else if (time > skipEnd) {
                    if (!setPin) {
                        _this._newPins.push(beepbox.makeNotePin(_this._oldPins[pinIndex].interval, shiftedTime, _this._oldPins[pinIndex].volume));
                        setPin = true;
                    }
                    _this._newPins.push(beepbox.makeNotePin(oldPin.interval, time, oldPin.volume));
                }
            }
            if (!setPin) {
                _this._newPins.push(beepbox.makeNotePin(_this._oldPins[pinIndex].interval, shiftedTime, _this._oldPins[pinIndex].volume));
            }
            _this._finishSetup();
            return _this;
        }
        return ChangePinTime;
    }(ChangePins));
    beepbox.ChangePinTime = ChangePinTime;
    var ChangePitchBend = (function (_super) {
        __extends(ChangePitchBend, _super);
        function ChangePitchBend(doc, note, bendStart, bendEnd, bendTo, pitchIndex) {
            var _this = _super.call(this, doc, note) || this;
            bendStart -= _this._oldStart;
            bendEnd -= _this._oldStart;
            bendTo -= note.pitches[pitchIndex];
            var setStart = false;
            var setEnd = false;
            var prevInterval = 0;
            var prevVolume = 3;
            var persist = true;
            var i;
            var direction;
            var stop;
            var push;
            if (bendEnd > bendStart) {
                i = 0;
                direction = 1;
                stop = note.pins.length;
                push = function (item) { _this._newPins.push(item); };
            }
            else {
                i = note.pins.length - 1;
                direction = -1;
                stop = -1;
                push = function (item) { _this._newPins.unshift(item); };
            }
            for (; i != stop; i += direction) {
                var oldPin = note.pins[i];
                var time = oldPin.time;
                for (;;) {
                    if (!setStart) {
                        if (time * direction <= bendStart * direction) {
                            prevInterval = oldPin.interval;
                            prevVolume = oldPin.volume;
                        }
                        if (time * direction < bendStart * direction) {
                            push(beepbox.makeNotePin(oldPin.interval, time, oldPin.volume));
                            break;
                        }
                        else {
                            push(beepbox.makeNotePin(prevInterval, bendStart, prevVolume));
                            setStart = true;
                        }
                    }
                    else if (!setEnd) {
                        if (time * direction <= bendEnd * direction) {
                            prevInterval = oldPin.interval;
                            prevVolume = oldPin.volume;
                        }
                        if (time * direction < bendEnd * direction) {
                            break;
                        }
                        else {
                            push(beepbox.makeNotePin(bendTo, bendEnd, prevVolume));
                            setEnd = true;
                        }
                    }
                    else {
                        if (time * direction == bendEnd * direction) {
                            break;
                        }
                        else {
                            if (oldPin.interval != prevInterval)
                                persist = false;
                            push(beepbox.makeNotePin(persist ? bendTo : oldPin.interval, time, oldPin.volume));
                            break;
                        }
                    }
                }
            }
            if (!setEnd) {
                push(beepbox.makeNotePin(bendTo, bendEnd, prevVolume));
            }
            _this._finishSetup();
            return _this;
        }
        return ChangePitchBend;
    }(ChangePins));
    beepbox.ChangePitchBend = ChangePitchBend;
    var ChangeRhythm = (function (_super) {
        __extends(ChangeRhythm, _super);
        function ChangeRhythm(doc, bar, oldPartsPerBeat, newPartsPerBeat) {
            var _this = _super.call(this) || this;
            var changeRhythm;
            if (oldPartsPerBeat > newPartsPerBeat) {
                changeRhythm = function (oldTime) { return Math.ceil(oldTime * newPartsPerBeat / oldPartsPerBeat); };
            }
            else if (oldPartsPerBeat < newPartsPerBeat) {
                changeRhythm = function (oldTime) { return Math.floor(oldTime * newPartsPerBeat / oldPartsPerBeat); };
            }
            else {
                throw new Error("ChangeRhythm couldn't handle rhythm change from " + oldPartsPerBeat + " to " + newPartsPerBeat + ".");
            }
            var i = 0;
            while (i < bar.notes.length) {
                var note = bar.notes[i];
                if (changeRhythm(note.start) >= changeRhythm(note.end)) {
                    _this.append(new ChangeNoteAdded(doc, bar, note, i, true));
                }
                else {
                    _this.append(new ChangeRhythmNote(doc, note, changeRhythm));
                    i++;
                }
            }
            return _this;
        }
        return ChangeRhythm;
    }(beepbox.ChangeSequence));
    beepbox.ChangeRhythm = ChangeRhythm;
    var ChangeRhythmNote = (function (_super) {
        __extends(ChangeRhythmNote, _super);
        function ChangeRhythmNote(doc, note, changeRhythm) {
            var _this = _super.call(this, doc, note) || this;
            for (var _i = 0, _a = _this._oldPins; _i < _a.length; _i++) {
                var oldPin = _a[_i];
                _this._newPins.push(beepbox.makeNotePin(oldPin.interval, changeRhythm(oldPin.time + _this._oldStart) - _this._oldStart, oldPin.volume));
            }
            _this._finishSetup();
            return _this;
        }
        return ChangeRhythmNote;
    }(ChangePins));
    beepbox.ChangeRhythmNote = ChangeRhythmNote;
    var ChangeScale = (function (_super) {
        __extends(ChangeScale, _super);
        function ChangeScale(doc, newValue) {
            var _this = _super.call(this) || this;
            if (doc.song.scale != newValue) {
                doc.song.scale = newValue;
                doc.notifier.changed();
                _this._didSomething();
            }
            return _this;
        }
        return ChangeScale;
    }(beepbox.Change));
    beepbox.ChangeScale = ChangeScale;
    var ChangeSong = (function (_super) {
        __extends(ChangeSong, _super);
        function ChangeSong(doc, newHash) {
            var _this = _super.call(this) || this;
            doc.song.fromBase64String(newHash);
            doc.channel = Math.min(doc.channel, doc.song.getChannelCount() - 1);
            doc.bar = Math.max(0, Math.min(doc.song.barCount - 1, doc.bar));
            doc.barScrollPos = Math.max(0, Math.min(doc.song.barCount - doc.trackVisibleBars, doc.barScrollPos));
            doc.barScrollPos = Math.min(doc.bar, Math.max(doc.bar - (doc.trackVisibleBars - 1), doc.barScrollPos));
            doc.notifier.changed();
            _this._didSomething();
            return _this;
        }
        return ChangeSong;
    }(beepbox.Change));
    beepbox.ChangeSong = ChangeSong;
    var ChangeTempo = (function (_super) {
        __extends(ChangeTempo, _super);
        function ChangeTempo(doc, oldValue, newValue) {
            var _this = _super.call(this) || this;
            doc.song.tempo = newValue;
            doc.notifier.changed();
            if (oldValue != newValue)
                _this._didSomething();
            return _this;
        }
        return ChangeTempo;
    }(beepbox.Change));
    beepbox.ChangeTempo = ChangeTempo;
    var ChangeReverb = (function (_super) {
        __extends(ChangeReverb, _super);
        function ChangeReverb(doc, oldValue, newValue) {
            var _this = _super.call(this) || this;
            doc.song.reverb = newValue;
            doc.notifier.changed();
            if (oldValue != newValue)
                _this._didSomething();
            return _this;
        }
        return ChangeReverb;
    }(beepbox.Change));
    beepbox.ChangeReverb = ChangeReverb;
    var ChangeNoteAdded = (function (_super) {
        __extends(ChangeNoteAdded, _super);
        function ChangeNoteAdded(doc, pattern, note, index, deletion) {
            if (deletion === void 0) { deletion = false; }
            var _this = _super.call(this, deletion) || this;
            _this._doc = doc;
            _this._pattern = pattern;
            _this._note = note;
            _this._index = index;
            _this._didSomething();
            _this.redo();
            return _this;
        }
        ChangeNoteAdded.prototype._doForwards = function () {
            this._pattern.notes.splice(this._index, 0, this._note);
            this._doc.notifier.changed();
        };
        ChangeNoteAdded.prototype._doBackwards = function () {
            this._pattern.notes.splice(this._index, 1);
            this._doc.notifier.changed();
        };
        return ChangeNoteAdded;
    }(beepbox.UndoableChange));
    beepbox.ChangeNoteAdded = ChangeNoteAdded;
    var ChangeNoteLength = (function (_super) {
        __extends(ChangeNoteLength, _super);
        function ChangeNoteLength(doc, note, truncStart, truncEnd) {
            var _this = _super.call(this, doc, note) || this;
            truncStart -= _this._oldStart;
            truncEnd -= _this._oldStart;
            var setStart = false;
            var prevVolume = _this._oldPins[0].volume;
            var prevInterval = _this._oldPins[0].interval;
            var pushLastPin = true;
            var i;
            for (i = 0; i < _this._oldPins.length; i++) {
                var oldPin = _this._oldPins[i];
                if (oldPin.time < truncStart) {
                    prevVolume = oldPin.volume;
                    prevInterval = oldPin.interval;
                }
                else if (oldPin.time <= truncEnd) {
                    if (oldPin.time > truncStart && !setStart) {
                        _this._newPins.push(beepbox.makeNotePin(prevInterval, truncStart, prevVolume));
                    }
                    _this._newPins.push(beepbox.makeNotePin(oldPin.interval, oldPin.time, oldPin.volume));
                    setStart = true;
                    if (oldPin.time == truncEnd) {
                        pushLastPin = false;
                        break;
                    }
                }
                else {
                    break;
                }
            }
            if (pushLastPin)
                _this._newPins.push(beepbox.makeNotePin(_this._oldPins[i].interval, truncEnd, _this._oldPins[i].volume));
            _this._finishSetup();
            return _this;
        }
        return ChangeNoteLength;
    }(ChangePins));
    beepbox.ChangeNoteLength = ChangeNoteLength;
    var ChangeNoteTruncate = (function (_super) {
        __extends(ChangeNoteTruncate, _super);
        function ChangeNoteTruncate(doc, pattern, start, end, skipNote) {
            var _this = _super.call(this) || this;
            var i = 0;
            while (i < pattern.notes.length) {
                var note = pattern.notes[i];
                if (note == skipNote && skipNote != undefined) {
                    i++;
                }
                else if (note.end <= start) {
                    i++;
                }
                else if (note.start >= end) {
                    break;
                }
                else if (note.start < start) {
                    _this.append(new ChangeNoteLength(doc, note, note.start, start));
                    i++;
                }
                else if (note.end > end) {
                    _this.append(new ChangeNoteLength(doc, note, end, note.end));
                    i++;
                }
                else {
                    _this.append(new ChangeNoteAdded(doc, pattern, note, i, true));
                }
            }
            return _this;
        }
        return ChangeNoteTruncate;
    }(beepbox.ChangeSequence));
    beepbox.ChangeNoteTruncate = ChangeNoteTruncate;
    var ChangeTransposeNote = (function (_super) {
        __extends(ChangeTransposeNote, _super);
        function ChangeTransposeNote(doc, note, upward) {
            var _this = _super.call(this, false) || this;
            _this._doc = doc;
            _this._note = note;
            _this._oldPins = note.pins;
            _this._newPins = [];
            _this._oldPitches = note.pitches;
            _this._newPitches = [];
            var maxPitch = (doc.song.getChannelIsDrum(doc.channel) ? beepbox.Config.drumCount - 1 : beepbox.Config.maxPitch);
            for (var i = 0; i < _this._oldPitches.length; i++) {
                var pitch = _this._oldPitches[i];
                if (upward) {
                    for (var j = pitch + 1; j <= maxPitch; j++) {
                        if (doc.song.getChannelIsDrum(doc.channel) || beepbox.Config.scaleFlags[doc.song.scale][j % 12]) {
                            pitch = j;
                            break;
                        }
                    }
                }
                else {
                    for (var j = pitch - 1; j >= 0; j--) {
                        if (doc.song.getChannelIsDrum(doc.channel) || beepbox.Config.scaleFlags[doc.song.scale][j % 12]) {
                            pitch = j;
                            break;
                        }
                    }
                }
                var foundMatch = false;
                for (var j = 0; j < _this._newPitches.length; j++) {
                    if (_this._newPitches[j] == pitch) {
                        foundMatch = true;
                        break;
                    }
                }
                if (!foundMatch)
                    _this._newPitches.push(pitch);
            }
            var min = 0;
            var max = maxPitch;
            for (var i = 1; i < _this._newPitches.length; i++) {
                var diff = _this._newPitches[0] - _this._newPitches[i];
                if (min < diff)
                    min = diff;
                if (max > diff + maxPitch)
                    max = diff + maxPitch;
            }
            for (var _i = 0, _a = _this._oldPins; _i < _a.length; _i++) {
                var oldPin = _a[_i];
                var interval = oldPin.interval + _this._oldPitches[0];
                if (interval < min)
                    interval = min;
                if (interval > max)
                    interval = max;
                if (upward) {
                    for (var i = interval + 1; i <= max; i++) {
                        if (doc.song.getChannelIsDrum(doc.channel) || beepbox.Config.scaleFlags[doc.song.scale][i % 12]) {
                            interval = i;
                            break;
                        }
                    }
                }
                else {
                    for (var i = interval - 1; i >= min; i--) {
                        if (doc.song.getChannelIsDrum(doc.channel) || beepbox.Config.scaleFlags[doc.song.scale][i % 12]) {
                            interval = i;
                            break;
                        }
                    }
                }
                interval -= _this._newPitches[0];
                _this._newPins.push(beepbox.makeNotePin(interval, oldPin.time, oldPin.volume));
            }
            if (_this._newPins[0].interval != 0)
                throw new Error("wrong pin start interval");
            for (var i = 1; i < _this._newPins.length - 1;) {
                if (_this._newPins[i - 1].interval == _this._newPins[i].interval &&
                    _this._newPins[i].interval == _this._newPins[i + 1].interval &&
                    _this._newPins[i - 1].volume == _this._newPins[i].volume &&
                    _this._newPins[i].volume == _this._newPins[i + 1].volume) {
                    _this._newPins.splice(i, 1);
                }
                else {
                    i++;
                }
            }
            _this._doForwards();
            _this._didSomething();
            return _this;
        }
        ChangeTransposeNote.prototype._doForwards = function () {
            this._note.pins = this._newPins;
            this._note.pitches = this._newPitches;
            this._doc.notifier.changed();
        };
        ChangeTransposeNote.prototype._doBackwards = function () {
            this._note.pins = this._oldPins;
            this._note.pitches = this._oldPitches;
            this._doc.notifier.changed();
        };
        return ChangeTransposeNote;
    }(beepbox.UndoableChange));
    beepbox.ChangeTransposeNote = ChangeTransposeNote;
    var ChangeTranspose = (function (_super) {
        __extends(ChangeTranspose, _super);
        function ChangeTranspose(doc, pattern, upward) {
            var _this = _super.call(this) || this;
            for (var i = 0; i < pattern.notes.length; i++) {
                _this.append(new ChangeTransposeNote(doc, pattern.notes[i], upward));
            }
            return _this;
        }
        return ChangeTranspose;
    }(beepbox.ChangeSequence));
    beepbox.ChangeTranspose = ChangeTranspose;
    var ChangeVolume = (function (_super) {
        __extends(ChangeVolume, _super);
        function ChangeVolume(doc, oldValue, newValue) {
            var _this = _super.call(this) || this;
            doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()].volume = newValue;
            doc.notifier.changed();
            if (oldValue != newValue)
                _this._didSomething();
            return _this;
        }
        return ChangeVolume;
    }(beepbox.Change));
    beepbox.ChangeVolume = ChangeVolume;
    var ChangeVolumeBend = (function (_super) {
        __extends(ChangeVolumeBend, _super);
        function ChangeVolumeBend(doc, note, bendPart, bendVolume, bendInterval) {
            var _this = _super.call(this, false) || this;
            _this._doc = doc;
            _this._note = note;
            _this._oldPins = note.pins;
            _this._newPins = [];
            var inserted = false;
            for (var _i = 0, _a = note.pins; _i < _a.length; _i++) {
                var pin = _a[_i];
                if (pin.time < bendPart) {
                    _this._newPins.push(pin);
                }
                else if (pin.time == bendPart) {
                    _this._newPins.push(beepbox.makeNotePin(bendInterval, bendPart, bendVolume));
                    inserted = true;
                }
                else {
                    if (!inserted) {
                        _this._newPins.push(beepbox.makeNotePin(bendInterval, bendPart, bendVolume));
                        inserted = true;
                    }
                    _this._newPins.push(pin);
                }
            }
            for (var i = 1; i < _this._newPins.length - 1;) {
                if (_this._newPins[i - 1].interval == _this._newPins[i].interval &&
                    _this._newPins[i].interval == _this._newPins[i + 1].interval &&
                    _this._newPins[i - 1].volume == _this._newPins[i].volume &&
                    _this._newPins[i].volume == _this._newPins[i + 1].volume) {
                    _this._newPins.splice(i, 1);
                }
                else {
                    i++;
                }
            }
            _this._doForwards();
            _this._didSomething();
            return _this;
        }
        ChangeVolumeBend.prototype._doForwards = function () {
            this._note.pins = this._newPins;
            this._doc.notifier.changed();
        };
        ChangeVolumeBend.prototype._doBackwards = function () {
            this._note.pins = this._oldPins;
            this._doc.notifier.changed();
        };
        return ChangeVolumeBend;
    }(beepbox.UndoableChange));
    beepbox.ChangeVolumeBend = ChangeVolumeBend;
    var ChangeWave = (function (_super) {
        __extends(ChangeWave, _super);
        function ChangeWave(doc, newValue) {
            var _this = _super.call(this) || this;
            if (doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()].wave != newValue) {
                doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()].wave = newValue;
                doc.notifier.changed();
                _this._didSomething();
            }
            return _this;
        }
        return ChangeWave;
    }(beepbox.Change));
    beepbox.ChangeWave = ChangeWave;
})(beepbox || (beepbox = {}));
var beepbox;
(function (beepbox) {
    function prettyNumber(value) {
        return value.toFixed(2).replace(/\.?0*$/, "");
    }
    function makeEmptyReplacementElement(node) {
        var clone = node.cloneNode(false);
        node.parentNode.replaceChild(clone, node);
        return clone;
    }
    var PatternCursor = (function () {
        function PatternCursor() {
            this.valid = false;
            this.prevNote = null;
            this.curNote = null;
            this.nextNote = null;
            this.pitch = 0;
            this.pitchIndex = -1;
            this.curIndex = 0;
            this.start = 0;
            this.end = 0;
            this.part = 0;
            this.notePart = 0;
            this.nearPinIndex = 0;
            this.pins = [];
        }
        return PatternCursor;
    }());
    var PatternEditor = (function () {
        function PatternEditor(_doc) {
            var _this = this;
            this._doc = _doc;
            this._svgNoteBackground = beepbox.svgElement("pattern", { id: "patternEditorNoteBackground", x: "0", y: "0", width: "64", height: "156", patternUnits: "userSpaceOnUse" });
            this._svgDrumBackground = beepbox.svgElement("pattern", { id: "patternEditorDrumBackground", x: "0", y: "0", width: "64", height: "40", patternUnits: "userSpaceOnUse" });
            this._svgBackground = beepbox.svgElement("rect", { x: "0", y: "0", width: "512", height: "481", "pointer-events": "none", fill: "url(#patternEditorNoteBackground)" });
            this._svgNoteContainer = beepbox.svgElement("svg");
            this._svgPlayhead = beepbox.svgElement("rect", { id: "", x: "0", y: "0", width: "4", height: "481", fill: "white", "pointer-events": "none" });
            this._svgPreview = beepbox.svgElement("path", { fill: "none", stroke: "white", "stroke-width": "2", "pointer-events": "none" });
            this._svg = beepbox.svgElement("svg", { style: "background-color: #000000; touch-action: none; position: absolute;", width: "100%", height: "100%", viewBox: "0 0 512 481", preserveAspectRatio: "none" }, [
                beepbox.svgElement("defs", undefined, [
                    this._svgNoteBackground,
                    this._svgDrumBackground,
                ]),
                this._svgBackground,
                this._svgNoteContainer,
                this._svgPreview,
                this._svgPlayhead,
            ]);
            this.container = beepbox.html.div({ style: "height: 100%; overflow:hidden; position: relative; flex-grow: 1;" }, [this._svg]);
            this._defaultPitchHeight = 13;
            this._defaultDrumHeight = 40;
            this._backgroundPitchRows = [];
            this._backgroundDrumRow = beepbox.svgElement("rect");
            this._defaultPinChannels = [
                [beepbox.makeNotePin(0, 0, 3), beepbox.makeNotePin(0, 2, 3)],
                [beepbox.makeNotePin(0, 0, 3), beepbox.makeNotePin(0, 2, 3)],
                [beepbox.makeNotePin(0, 0, 3), beepbox.makeNotePin(0, 2, 3)],
                [beepbox.makeNotePin(0, 0, 3), beepbox.makeNotePin(0, 2, 0)],
            ];
            this._editorHeight = 481;
            this._mouseX = 0;
            this._mouseY = 0;
            this._mouseDown = false;
            this._mouseOver = false;
            this._mouseDragging = false;
            this._mouseHorizontal = false;
            this._usingTouch = false;
            this._copiedPinChannels = [];
            this._mouseXStart = 0;
            this._mouseYStart = 0;
            this._mouseXPrev = 0;
            this._mouseYPrev = 0;
            this._dragTime = 0;
            this._dragPitch = 0;
            this._dragVolume = 0;
            this._dragVisible = false;
            this._dragChange = null;
            this._cursor = new PatternCursor();
            this._pattern = null;
            this._playheadX = 0.0;
            this._octaveOffset = 0;
            this._renderedWidth = -1;
            this._renderedBeatWidth = -1;
            this._renderedFifths = false;
            this._renderedDrums = false;
            this._renderedPartsPerBeat = -1;
            this._renderedPitchChannelCount = -1;
            this._renderedDrumChannelCount = -1;
            this._followPlayheadBar = -1;
            this.resetCopiedPins = function () {
                var maxDivision = _this._getMaxDivision();
                _this._copiedPinChannels.length = _this._doc.song.getChannelCount();
                for (var i = 0; i < _this._doc.song.pitchChannelCount; i++) {
                    _this._copiedPinChannels[i] = [beepbox.makeNotePin(0, 0, 3), beepbox.makeNotePin(0, maxDivision, 3)];
                }
                for (var i = _this._doc.song.pitchChannelCount; i < _this._doc.song.getChannelCount(); i++) {
                    _this._copiedPinChannels[i] = [beepbox.makeNotePin(0, 0, 3), beepbox.makeNotePin(0, maxDivision, 0)];
                }
            };
            this._animatePlayhead = function (timestamp) {
                var playheadBar = Math.floor(_this._doc.synth.playhead);
                if (!_this._doc.synth.playing || _this._pattern == null || _this._doc.song.getPattern(_this._doc.channel, Math.floor(_this._doc.synth.playhead)) != _this._pattern) {
                    _this._svgPlayhead.setAttribute("visibility", "hidden");
                }
                else {
                    _this._svgPlayhead.setAttribute("visibility", "visible");
                    var modPlayhead = _this._doc.synth.playhead - playheadBar;
                    if (Math.abs(modPlayhead - _this._playheadX) > 0.1) {
                        _this._playheadX = modPlayhead;
                    }
                    else {
                        _this._playheadX += (modPlayhead - _this._playheadX) * 0.2;
                    }
                    _this._svgPlayhead.setAttribute("x", "" + prettyNumber(_this._playheadX * _this._editorWidth - 2));
                }
                if (_this._doc.synth.playing && _this._doc.autoFollow && _this._followPlayheadBar != playheadBar) {
                    new beepbox.ChangeChannelBar(_this._doc, _this._doc.channel, playheadBar);
                    _this._doc.notifier.notifyWatchers();
                }
                _this._followPlayheadBar = playheadBar;
                window.requestAnimationFrame(_this._animatePlayhead);
            };
            this._whenMouseOver = function (event) {
                if (_this._mouseOver)
                    return;
                _this._mouseOver = true;
                _this._usingTouch = false;
            };
            this._whenMouseOut = function (event) {
                if (!_this._mouseOver)
                    return;
                _this._mouseOver = false;
            };
            this._whenMousePressed = function (event) {
                event.preventDefault();
                if (_this._pattern == null)
                    return;
                var boundingRect = _this._svg.getBoundingClientRect();
                _this._mouseX = ((event.clientX || event.pageX) - boundingRect.left) * _this._editorWidth / (boundingRect.right - boundingRect.left);
                _this._mouseY = ((event.clientY || event.pageY) - boundingRect.top) * _this._editorHeight / (boundingRect.bottom - boundingRect.top);
                if (isNaN(_this._mouseX))
                    _this._mouseX = 0;
                if (isNaN(_this._mouseY))
                    _this._mouseY = 0;
                _this._usingTouch = false;
                _this._whenCursorPressed();
            };
            this._whenTouchPressed = function (event) {
                event.preventDefault();
                if (_this._pattern == null)
                    return;
                var boundingRect = _this._svg.getBoundingClientRect();
                _this._mouseX = (event.touches[0].clientX - boundingRect.left) * _this._editorWidth / (boundingRect.right - boundingRect.left);
                _this._mouseY = (event.touches[0].clientY - boundingRect.top) * _this._editorHeight / (boundingRect.bottom - boundingRect.top);
                if (isNaN(_this._mouseX))
                    _this._mouseX = 0;
                if (isNaN(_this._mouseY))
                    _this._mouseY = 0;
                _this._usingTouch = true;
                _this._whenCursorPressed();
            };
            this._whenMouseMoved = function (event) {
                var boundingRect = _this._svg.getBoundingClientRect();
                _this._mouseX = ((event.clientX || event.pageX) - boundingRect.left) * _this._editorWidth / (boundingRect.right - boundingRect.left);
                _this._mouseY = ((event.clientY || event.pageY) - boundingRect.top) * _this._editorHeight / (boundingRect.bottom - boundingRect.top);
                if (isNaN(_this._mouseX))
                    _this._mouseX = 0;
                if (isNaN(_this._mouseY))
                    _this._mouseY = 0;
                _this._usingTouch = false;
                _this._whenCursorMoved();
            };
            this._whenTouchMoved = function (event) {
                if (!_this._mouseDown)
                    return;
                event.preventDefault();
                var boundingRect = _this._svg.getBoundingClientRect();
                _this._mouseX = (event.touches[0].clientX - boundingRect.left) * _this._editorWidth / (boundingRect.right - boundingRect.left);
                _this._mouseY = (event.touches[0].clientY - boundingRect.top) * _this._editorHeight / (boundingRect.bottom - boundingRect.top);
                if (isNaN(_this._mouseX))
                    _this._mouseX = 0;
                if (isNaN(_this._mouseY))
                    _this._mouseY = 0;
                _this._whenCursorMoved();
            };
            this._whenCursorReleased = function (event) {
                if (!_this._cursor.valid)
                    return;
                if (_this._pattern == null)
                    return;
                var continuousState = _this._doc.lastChangeWas(_this._dragChange);
                if (_this._mouseDragging && continuousState) {
                    if (_this._dragChange != null) {
                        _this._doc.record(_this._dragChange);
                        _this._dragChange = null;
                    }
                }
                else if (_this._mouseDown && continuousState) {
                    if (_this._cursor.curNote == null) {
                        var note = beepbox.makeNote(_this._cursor.pitch, _this._cursor.start, _this._cursor.end, 3, _this._doc.song.getChannelIsDrum(_this._doc.channel));
                        note.pins = [];
                        for (var _i = 0, _a = _this._cursor.pins; _i < _a.length; _i++) {
                            var oldPin = _a[_i];
                            note.pins.push(beepbox.makeNotePin(0, oldPin.time, oldPin.volume));
                        }
                        _this._doc.record(new beepbox.ChangeNoteAdded(_this._doc, _this._pattern, note, _this._cursor.curIndex));
                    }
                    else {
                        if (_this._cursor.pitchIndex == -1) {
                            var sequence = new beepbox.ChangeSequence();
                            if (_this._cursor.curNote.pitches.length == 4) {
                                sequence.append(new beepbox.ChangePitchAdded(_this._doc, _this._cursor.curNote, _this._cursor.curNote.pitches[0], 0, true));
                            }
                            sequence.append(new beepbox.ChangePitchAdded(_this._doc, _this._cursor.curNote, _this._cursor.pitch, _this._cursor.curNote.pitches.length));
                            _this._doc.record(sequence);
                            _this._copyPins(_this._cursor.curNote);
                        }
                        else {
                            if (_this._cursor.curNote.pitches.length == 1) {
                                _this._doc.record(new beepbox.ChangeNoteAdded(_this._doc, _this._pattern, _this._cursor.curNote, _this._cursor.curIndex, true));
                            }
                            else {
                                _this._doc.record(new beepbox.ChangePitchAdded(_this._doc, _this._cursor.curNote, _this._cursor.pitch, _this._cursor.curNote.pitches.indexOf(_this._cursor.pitch), true));
                            }
                        }
                    }
                }
                _this._mouseDown = false;
                _this._mouseDragging = false;
                _this._updateCursorStatus();
                _this._updatePreview();
            };
            this._documentChanged = function () {
                _this._editorWidth = _this._doc.showLetters ? (_this._doc.showScrollBar ? 460 : 480) : (_this._doc.showScrollBar ? 492 : 512);
                _this._pattern = _this._doc.getCurrentPattern();
                _this._partWidth = _this._editorWidth / (_this._doc.song.beatsPerBar * _this._doc.song.partsPerBeat);
                _this._pitchHeight = _this._doc.song.getChannelIsDrum(_this._doc.channel) ? _this._defaultDrumHeight : _this._defaultPitchHeight;
                _this._pitchCount = _this._doc.song.getChannelIsDrum(_this._doc.channel) ? beepbox.Config.drumCount : beepbox.Config.pitchCount;
                _this._octaveOffset = _this._doc.song.channels[_this._doc.channel].octave * 12;
                if (_this._renderedPartsPerBeat != _this._doc.song.partsPerBeat ||
                    _this._renderedPitchChannelCount != _this._doc.song.pitchChannelCount ||
                    _this._renderedDrumChannelCount != _this._doc.song.drumChannelCount) {
                    _this._renderedPartsPerBeat = _this._doc.song.partsPerBeat;
                    _this._renderedPitchChannelCount = _this._doc.song.pitchChannelCount;
                    _this._renderedDrumChannelCount = _this._doc.song.drumChannelCount;
                    _this.resetCopiedPins();
                }
                _this._copiedPins = _this._copiedPinChannels[_this._doc.channel];
                if (_this._renderedWidth != _this._editorWidth) {
                    _this._renderedWidth = _this._editorWidth;
                    _this._svg.setAttribute("viewBox", "0 0 " + _this._editorWidth + " 481");
                    _this._svgBackground.setAttribute("width", "" + _this._editorWidth);
                }
                var beatWidth = _this._editorWidth / _this._doc.song.beatsPerBar;
                if (_this._renderedBeatWidth != beatWidth) {
                    _this._renderedBeatWidth = beatWidth;
                    _this._svgNoteBackground.setAttribute("width", "" + beatWidth);
                    _this._svgDrumBackground.setAttribute("width", "" + beatWidth);
                    _this._backgroundDrumRow.setAttribute("width", "" + (beatWidth - 2));
                    for (var j = 0; j < 12; j++) {
                        _this._backgroundPitchRows[j].setAttribute("width", "" + (beatWidth - 2));
                    }
                }
                if (!_this._mouseDown)
                    _this._updateCursorStatus();
                _this._svgNoteContainer = makeEmptyReplacementElement(_this._svgNoteContainer);
                _this._updatePreview();
                if (_this._renderedFifths != _this._doc.showFifth) {
                    _this._renderedFifths = _this._doc.showFifth;
                    _this._backgroundPitchRows[7].setAttribute("fill", _this._doc.showFifth ? "#446688" : "#444444");
                }
                for (var j = 0; j < 12; j++) {
                    _this._backgroundPitchRows[j].style.visibility = beepbox.Config.scaleFlags[_this._doc.song.scale][j] ? "visible" : "hidden";
                }
                if (_this._doc.song.getChannelIsDrum(_this._doc.channel)) {
                    if (!_this._renderedDrums) {
                        _this._renderedDrums = true;
                        _this._svgBackground.setAttribute("fill", "url(#patternEditorDrumBackground)");
                        _this._svgBackground.setAttribute("height", "" + (_this._defaultDrumHeight * beepbox.Config.drumCount));
                    }
                }
                else {
                    if (_this._renderedDrums) {
                        _this._renderedDrums = false;
                        _this._svgBackground.setAttribute("fill", "url(#patternEditorNoteBackground)");
                        _this._svgBackground.setAttribute("height", "" + _this._editorHeight);
                    }
                }
                if (_this._doc.showChannels) {
                    for (var channel = _this._doc.song.getChannelCount() - 1; channel >= 0; channel--) {
                        if (channel == _this._doc.channel)
                            continue;
                        if (_this._doc.song.getChannelIsDrum(channel) != _this._doc.song.getChannelIsDrum(_this._doc.channel))
                            continue;
                        var pattern2 = _this._doc.song.getPattern(channel, _this._doc.bar);
                        if (pattern2 == null)
                            continue;
                        for (var _i = 0, _a = pattern2.notes; _i < _a.length; _i++) {
                            var note = _a[_i];
                            for (var _b = 0, _c = note.pitches; _b < _c.length; _b++) {
                                var pitch = _c[_b];
                                var notePath = beepbox.svgElement("path");
                                notePath.setAttribute("fill", _this._doc.song.getNoteColorDim(channel));
                                notePath.setAttribute("pointer-events", "none");
                                _this._drawNote(notePath, pitch, note.start, note.pins, _this._pitchHeight * 0.19, false, _this._doc.song.channels[channel].octave * 12);
                                _this._svgNoteContainer.appendChild(notePath);
                            }
                        }
                    }
                }
                if (_this._pattern != null) {
                    for (var _d = 0, _e = _this._pattern.notes; _d < _e.length; _d++) {
                        var note = _e[_d];
                        for (var i = 0; i < note.pitches.length; i++) {
                            var pitch = note.pitches[i];
                            var notePath = beepbox.svgElement("path");
                            notePath.setAttribute("fill", _this._doc.song.getNoteColorDim(_this._doc.channel));
                            notePath.setAttribute("pointer-events", "none");
                            _this._drawNote(notePath, pitch, note.start, note.pins, _this._pitchHeight / 2 + 1, false, _this._octaveOffset);
                            _this._svgNoteContainer.appendChild(notePath);
                            notePath = beepbox.svgElement("path");
                            notePath.setAttribute("fill", _this._doc.song.getNoteColorBright(_this._doc.channel));
                            notePath.setAttribute("pointer-events", "none");
                            _this._drawNote(notePath, pitch, note.start, note.pins, _this._pitchHeight / 2 + 1, true, _this._octaveOffset);
                            _this._svgNoteContainer.appendChild(notePath);
                            if (note.pitches.length > 1 && !_this._doc.song.getChannelIsDrum(_this._doc.channel)) {
                                var instrumentType = _this._doc.song.channels[_this._doc.channel].instruments[_this._doc.getCurrentInstrument()].type;
                                if (instrumentType == 1) {
                                    var oscillatorLabel = beepbox.svgElement("text");
                                    oscillatorLabel.setAttribute("x", "" + prettyNumber(_this._partWidth * note.start + 2));
                                    oscillatorLabel.setAttribute("y", "" + prettyNumber(_this._pitchToPixelHeight(pitch - _this._octaveOffset)));
                                    oscillatorLabel.setAttribute("width", "30");
                                    oscillatorLabel.setAttribute("fill", "black");
                                    oscillatorLabel.setAttribute("text-anchor", "start");
                                    oscillatorLabel.setAttribute("dominant-baseline", "central");
                                    oscillatorLabel.setAttribute("pointer-events", "none");
                                    oscillatorLabel.textContent = "" + (i + 1);
                                    _this._svgNoteContainer.appendChild(oscillatorLabel);
                                }
                            }
                        }
                    }
                    _this._svgBackground.style.visibility = "visible";
                }
                else {
                    _this._svgBackground.style.visibility = "hidden";
                }
            };
            for (var i = 0; i < 12; i++) {
                var y = (12 - i) % 12;
                var rectangle = beepbox.svgElement("rect");
                rectangle.setAttribute("x", "1");
                rectangle.setAttribute("y", "" + (y * this._defaultPitchHeight + 1));
                rectangle.setAttribute("height", "" + (this._defaultPitchHeight - 2));
                rectangle.setAttribute("fill", (i == 0) ? "#886644" : "#444444");
                this._svgNoteBackground.appendChild(rectangle);
                this._backgroundPitchRows[i] = rectangle;
            }
            this._backgroundDrumRow.setAttribute("x", "1");
            this._backgroundDrumRow.setAttribute("y", "1");
            this._backgroundDrumRow.setAttribute("height", "" + (this._defaultDrumHeight - 2));
            this._backgroundDrumRow.setAttribute("fill", "#444444");
            this._svgDrumBackground.appendChild(this._backgroundDrumRow);
            this._doc.notifier.watch(this._documentChanged);
            this._documentChanged();
            this._updateCursorStatus();
            this._updatePreview();
            window.requestAnimationFrame(this._animatePlayhead);
            this._svg.addEventListener("mousedown", this._whenMousePressed);
            document.addEventListener("mousemove", this._whenMouseMoved);
            document.addEventListener("mouseup", this._whenCursorReleased);
            this._svg.addEventListener("mouseover", this._whenMouseOver);
            this._svg.addEventListener("mouseout", this._whenMouseOut);
            this._svg.addEventListener("touchstart", this._whenTouchPressed);
            this._svg.addEventListener("touchmove", this._whenTouchMoved);
            this._svg.addEventListener("touchend", this._whenCursorReleased);
            this._svg.addEventListener("touchcancel", this._whenCursorReleased);
            this.resetCopiedPins();
        }
        PatternEditor.prototype._getMaxDivision = function () {
            if (this._doc.song.partsPerBeat % 3 == 0) {
                return this._doc.song.partsPerBeat / 3;
            }
            else if (this._doc.song.partsPerBeat % 2 == 0) {
                return this._doc.song.partsPerBeat / 2;
            }
            return this._doc.song.partsPerBeat;
        };
        PatternEditor.prototype._updateCursorStatus = function () {
            if (this._pattern == null)
                return;
            this._cursor = new PatternCursor();
            if (this._mouseX < 0 || this._mouseX > this._editorWidth || this._mouseY < 0 || this._mouseY > this._editorHeight)
                return;
            this._cursor.part = Math.floor(Math.max(0, Math.min(this._doc.song.beatsPerBar * this._doc.song.partsPerBeat - 1, this._mouseX / this._partWidth)));
            for (var _i = 0, _a = this._pattern.notes; _i < _a.length; _i++) {
                var note = _a[_i];
                if (note.end <= this._cursor.part) {
                    this._cursor.prevNote = note;
                    this._cursor.curIndex++;
                }
                else if (note.start <= this._cursor.part && note.end > this._cursor.part) {
                    this._cursor.curNote = note;
                }
                else if (note.start > this._cursor.part) {
                    this._cursor.nextNote = note;
                    break;
                }
            }
            var mousePitch = this._findMousePitch(this._mouseY);
            if (this._cursor.curNote != null) {
                this._cursor.start = this._cursor.curNote.start;
                this._cursor.end = this._cursor.curNote.end;
                this._cursor.pins = this._cursor.curNote.pins;
                var interval = 0;
                var error = 0;
                var prevPin = void 0;
                var nextPin = this._cursor.curNote.pins[0];
                for (var j = 1; j < this._cursor.curNote.pins.length; j++) {
                    prevPin = nextPin;
                    nextPin = this._cursor.curNote.pins[j];
                    var leftSide = this._partWidth * (this._cursor.curNote.start + prevPin.time);
                    var rightSide = this._partWidth * (this._cursor.curNote.start + nextPin.time);
                    if (this._mouseX > rightSide)
                        continue;
                    if (this._mouseX < leftSide)
                        throw new Error();
                    var intervalRatio = (this._mouseX - leftSide) / (rightSide - leftSide);
                    var arc = Math.sqrt(1.0 / Math.sqrt(4.0) - Math.pow(intervalRatio - 0.5, 2.0)) - 0.5;
                    var bendHeight = Math.abs(nextPin.interval - prevPin.interval);
                    interval = prevPin.interval * (1.0 - intervalRatio) + nextPin.interval * intervalRatio;
                    error = arc * bendHeight + 0.95;
                    break;
                }
                var minInterval = Number.MAX_VALUE;
                var maxInterval = -Number.MAX_VALUE;
                var bestDistance = Number.MAX_VALUE;
                for (var _b = 0, _c = this._cursor.curNote.pins; _b < _c.length; _b++) {
                    var pin = _c[_b];
                    if (minInterval > pin.interval)
                        minInterval = pin.interval;
                    if (maxInterval < pin.interval)
                        maxInterval = pin.interval;
                    var pinDistance = Math.abs(this._cursor.curNote.start + pin.time - this._mouseX / this._partWidth);
                    if (bestDistance > pinDistance) {
                        bestDistance = pinDistance;
                        this._cursor.nearPinIndex = this._cursor.curNote.pins.indexOf(pin);
                    }
                }
                mousePitch -= interval;
                this._cursor.pitch = this._snapToPitch(mousePitch, -minInterval, (this._doc.song.getChannelIsDrum(this._doc.channel) ? beepbox.Config.drumCount - 1 : beepbox.Config.maxPitch) - maxInterval);
                if (!this._doc.song.getChannelIsDrum(this._doc.channel)) {
                    var nearest = error;
                    for (var i = 0; i < this._cursor.curNote.pitches.length; i++) {
                        var distance = Math.abs(this._cursor.curNote.pitches[i] - mousePitch + 0.5);
                        if (distance > nearest)
                            continue;
                        nearest = distance;
                        this._cursor.pitch = this._cursor.curNote.pitches[i];
                    }
                }
                for (var i = 0; i < this._cursor.curNote.pitches.length; i++) {
                    if (this._cursor.curNote.pitches[i] == this._cursor.pitch) {
                        this._cursor.pitchIndex = i;
                        break;
                    }
                }
            }
            else {
                this._cursor.pitch = this._snapToPitch(mousePitch, 0, beepbox.Config.maxPitch);
                var defaultLength = this._copiedPins[this._copiedPins.length - 1].time;
                var fullBeats = Math.floor(this._cursor.part / this._doc.song.partsPerBeat);
                var maxDivision = this._getMaxDivision();
                var modMouse = this._cursor.part % this._doc.song.partsPerBeat;
                if (defaultLength == 1) {
                    this._cursor.start = this._cursor.part;
                }
                else if (defaultLength > this._doc.song.partsPerBeat) {
                    this._cursor.start = fullBeats * this._doc.song.partsPerBeat;
                }
                else if (defaultLength == this._doc.song.partsPerBeat) {
                    this._cursor.start = fullBeats * this._doc.song.partsPerBeat;
                    if (maxDivision < this._doc.song.partsPerBeat && modMouse > maxDivision) {
                        this._cursor.start += Math.floor(modMouse / maxDivision) * maxDivision;
                    }
                }
                else {
                    this._cursor.start = fullBeats * this._doc.song.partsPerBeat;
                    var division = this._doc.song.partsPerBeat % defaultLength == 0 ? defaultLength : Math.min(defaultLength, maxDivision);
                    while (division < maxDivision && this._doc.song.partsPerBeat % division != 0) {
                        division++;
                    }
                    this._cursor.start += Math.floor(modMouse / division) * division;
                }
                this._cursor.end = this._cursor.start + defaultLength;
                var forceStart = 0;
                var forceEnd = this._doc.song.beatsPerBar * this._doc.song.partsPerBeat;
                if (this._cursor.prevNote != null) {
                    forceStart = this._cursor.prevNote.end;
                }
                if (this._cursor.nextNote != null) {
                    forceEnd = this._cursor.nextNote.start;
                }
                if (this._cursor.start < forceStart) {
                    this._cursor.start = forceStart;
                    this._cursor.end = this._cursor.start + defaultLength;
                    if (this._cursor.end > forceEnd) {
                        this._cursor.end = forceEnd;
                    }
                }
                else if (this._cursor.end > forceEnd) {
                    this._cursor.end = forceEnd;
                    this._cursor.start = this._cursor.end - defaultLength;
                    if (this._cursor.start < forceStart) {
                        this._cursor.start = forceStart;
                    }
                }
                if (this._cursor.end - this._cursor.start == defaultLength) {
                    this._cursor.pins = this._copiedPins;
                }
                else {
                    this._cursor.pins = [];
                    for (var _d = 0, _e = this._copiedPins; _d < _e.length; _d++) {
                        var oldPin = _e[_d];
                        if (oldPin.time <= this._cursor.end - this._cursor.start) {
                            this._cursor.pins.push(beepbox.makeNotePin(0, oldPin.time, oldPin.volume));
                            if (oldPin.time == this._cursor.end - this._cursor.start)
                                break;
                        }
                        else {
                            this._cursor.pins.push(beepbox.makeNotePin(0, this._cursor.end - this._cursor.start, oldPin.volume));
                            break;
                        }
                    }
                }
            }
            this._cursor.valid = true;
        };
        PatternEditor.prototype._findMousePitch = function (pixelY) {
            return Math.max(0, Math.min(this._pitchCount - 1, this._pitchCount - (pixelY / this._pitchHeight))) + this._octaveOffset;
        };
        PatternEditor.prototype._snapToPitch = function (guess, min, max) {
            if (guess < min)
                guess = min;
            if (guess > max)
                guess = max;
            var scale = beepbox.Config.scaleFlags[this._doc.song.scale];
            if (scale[Math.floor(guess) % 12] || this._doc.song.getChannelIsDrum(this._doc.channel)) {
                return Math.floor(guess);
            }
            else {
                var topPitch = Math.floor(guess) + 1;
                var bottomPitch = Math.floor(guess) - 1;
                while (!scale[topPitch % 12]) {
                    topPitch++;
                }
                while (!scale[(bottomPitch) % 12]) {
                    bottomPitch--;
                }
                if (topPitch > max) {
                    if (bottomPitch < min) {
                        return min;
                    }
                    else {
                        return bottomPitch;
                    }
                }
                else if (bottomPitch < min) {
                    return topPitch;
                }
                var topRange = topPitch;
                var bottomRange = bottomPitch + 1;
                if (topPitch % 12 == 0 || topPitch % 12 == 7) {
                    topRange -= 0.5;
                }
                if (bottomPitch % 12 == 0 || bottomPitch % 12 == 7) {
                    bottomRange += 0.5;
                }
                return guess - bottomRange > topRange - guess ? topPitch : bottomPitch;
            }
        };
        PatternEditor.prototype._copyPins = function (note) {
            this._copiedPins = [];
            for (var _i = 0, _a = note.pins; _i < _a.length; _i++) {
                var oldPin = _a[_i];
                this._copiedPins.push(beepbox.makeNotePin(0, oldPin.time, oldPin.volume));
            }
            for (var i = 1; i < this._copiedPins.length - 1;) {
                if (this._copiedPins[i - 1].volume == this._copiedPins[i].volume &&
                    this._copiedPins[i].volume == this._copiedPins[i + 1].volume) {
                    this._copiedPins.splice(i, 1);
                }
                else {
                    i++;
                }
            }
            this._copiedPinChannels[this._doc.channel] = this._copiedPins;
        };
        PatternEditor.prototype._whenCursorPressed = function () {
            this._mouseDown = true;
            this._mouseXStart = this._mouseX;
            this._mouseYStart = this._mouseY;
            this._mouseXPrev = this._mouseX;
            this._mouseYPrev = this._mouseY;
            this._updateCursorStatus();
            this._updatePreview();
            this._dragChange = new beepbox.ChangeSequence();
            this._doc.setProspectiveChange(this._dragChange);
        };
        PatternEditor.prototype._whenCursorMoved = function () {
            var start;
            var end;
            if (this._pattern == null)
                return;
            var continuousState = this._doc.lastChangeWas(this._dragChange);
            if (this._mouseDown && this._cursor.valid && continuousState) {
                if (!this._mouseDragging) {
                    var dx = this._mouseX - this._mouseXStart;
                    var dy = this._mouseY - this._mouseYStart;
                    if (Math.sqrt(dx * dx + dy * dy) > 5) {
                        this._mouseDragging = true;
                        this._mouseHorizontal = Math.abs(dx) >= Math.abs(dy);
                    }
                }
                if (this._mouseDragging) {
                    if (this._dragChange != null) {
                        this._dragChange.undo();
                    }
                    var currentPart = Math.floor(this._mouseX / this._partWidth);
                    var sequence = new beepbox.ChangeSequence();
                    this._dragChange = sequence;
                    this._doc.setProspectiveChange(this._dragChange);
                    if (this._cursor.curNote == null) {
                        var backwards = void 0;
                        var directLength = void 0;
                        if (currentPart < this._cursor.start) {
                            backwards = true;
                            directLength = this._cursor.start - currentPart;
                        }
                        else {
                            backwards = false;
                            directLength = currentPart - this._cursor.start + 1;
                        }
                        var defaultLength = 1;
                        for (var i_1 = 0; i_1 <= this._doc.song.beatsPerBar * this._doc.song.partsPerBeat; i_1++) {
                            if (i_1 >= 5 &&
                                i_1 % this._doc.song.partsPerBeat != 0 &&
                                i_1 != this._doc.song.partsPerBeat * 3.0 / 2.0 &&
                                i_1 != this._doc.song.partsPerBeat * 4.0 / 3.0 &&
                                i_1 != this._doc.song.partsPerBeat * 5.0 / 3.0) {
                                continue;
                            }
                            var blessedLength = i_1;
                            if (blessedLength == directLength) {
                                defaultLength = blessedLength;
                                break;
                            }
                            if (blessedLength < directLength) {
                                defaultLength = blessedLength;
                            }
                            if (blessedLength > directLength) {
                                if (defaultLength < directLength - 1) {
                                    defaultLength = blessedLength;
                                }
                                break;
                            }
                        }
                        if (backwards) {
                            end = this._cursor.start;
                            start = end - defaultLength;
                        }
                        else {
                            start = this._cursor.start;
                            end = start + defaultLength;
                        }
                        if (start < 0)
                            start = 0;
                        if (end > this._doc.song.beatsPerBar * this._doc.song.partsPerBeat)
                            end = this._doc.song.beatsPerBar * this._doc.song.partsPerBeat;
                        sequence.append(new beepbox.ChangeNoteTruncate(this._doc, this._pattern, start, end));
                        var i = void 0;
                        for (i = 0; i < this._pattern.notes.length; i++) {
                            if (this._pattern.notes[i].start >= end)
                                break;
                        }
                        var theNote = beepbox.makeNote(this._cursor.pitch, start, end, 3, this._doc.song.getChannelIsDrum(this._doc.channel));
                        sequence.append(new beepbox.ChangeNoteAdded(this._doc, this._pattern, theNote, i));
                        this._copyPins(theNote);
                        this._dragTime = backwards ? start : end;
                        this._dragPitch = this._cursor.pitch;
                        this._dragVolume = theNote.pins[backwards ? 0 : 1].volume;
                        this._dragVisible = true;
                    }
                    else if (this._mouseHorizontal) {
                        var shift = Math.round((this._mouseX - this._mouseXStart) / this._partWidth);
                        var shiftedPin = this._cursor.curNote.pins[this._cursor.nearPinIndex];
                        var shiftedTime = this._cursor.curNote.start + shiftedPin.time + shift;
                        if (shiftedTime < 0)
                            shiftedTime = 0;
                        if (shiftedTime > this._doc.song.beatsPerBar * this._doc.song.partsPerBeat)
                            shiftedTime = this._doc.song.beatsPerBar * this._doc.song.partsPerBeat;
                        if (shiftedTime <= this._cursor.curNote.start && this._cursor.nearPinIndex == this._cursor.curNote.pins.length - 1 ||
                            shiftedTime >= this._cursor.curNote.end && this._cursor.nearPinIndex == 0) {
                            sequence.append(new beepbox.ChangeNoteAdded(this._doc, this._pattern, this._cursor.curNote, this._cursor.curIndex, true));
                            this._dragVisible = false;
                        }
                        else {
                            start = Math.min(this._cursor.curNote.start, shiftedTime);
                            end = Math.max(this._cursor.curNote.end, shiftedTime);
                            this._dragTime = shiftedTime;
                            this._dragPitch = this._cursor.curNote.pitches[this._cursor.pitchIndex == -1 ? 0 : this._cursor.pitchIndex] + this._cursor.curNote.pins[this._cursor.nearPinIndex].interval;
                            this._dragVolume = this._cursor.curNote.pins[this._cursor.nearPinIndex].volume;
                            this._dragVisible = true;
                            sequence.append(new beepbox.ChangeNoteTruncate(this._doc, this._pattern, start, end, this._cursor.curNote));
                            sequence.append(new beepbox.ChangePinTime(this._doc, this._cursor.curNote, this._cursor.nearPinIndex, shiftedTime));
                            this._copyPins(this._cursor.curNote);
                        }
                    }
                    else if (this._cursor.pitchIndex == -1) {
                        var bendPart = Math.round(Math.max(this._cursor.curNote.start, Math.min(this._cursor.curNote.end, this._mouseX / this._partWidth))) - this._cursor.curNote.start;
                        var prevPin = void 0;
                        var nextPin = this._cursor.curNote.pins[0];
                        var bendVolume = 0;
                        var bendInterval = 0;
                        for (var i = 1; i < this._cursor.curNote.pins.length; i++) {
                            prevPin = nextPin;
                            nextPin = this._cursor.curNote.pins[i];
                            if (bendPart > nextPin.time)
                                continue;
                            if (bendPart < prevPin.time)
                                throw new Error();
                            var volumeRatio = (bendPart - prevPin.time) / (nextPin.time - prevPin.time);
                            bendVolume = Math.round(prevPin.volume * (1.0 - volumeRatio) + nextPin.volume * volumeRatio + ((this._mouseYStart - this._mouseY) / 25.0));
                            if (bendVolume < 0)
                                bendVolume = 0;
                            if (bendVolume > 3)
                                bendVolume = 3;
                            bendInterval = this._snapToPitch(prevPin.interval * (1.0 - volumeRatio) + nextPin.interval * volumeRatio + this._cursor.curNote.pitches[0], 0, beepbox.Config.maxPitch) - this._cursor.curNote.pitches[0];
                            break;
                        }
                        this._dragTime = this._cursor.curNote.start + bendPart;
                        this._dragPitch = this._cursor.curNote.pitches[this._cursor.pitchIndex == -1 ? 0 : this._cursor.pitchIndex] + bendInterval;
                        this._dragVolume = bendVolume;
                        this._dragVisible = true;
                        sequence.append(new beepbox.ChangeVolumeBend(this._doc, this._cursor.curNote, bendPart, bendVolume, bendInterval));
                        this._copyPins(this._cursor.curNote);
                    }
                    else {
                        this._dragVolume = this._cursor.curNote.pins[this._cursor.nearPinIndex].volume;
                        var bendStart = void 0;
                        var bendEnd = void 0;
                        if (this._mouseX >= this._mouseXStart) {
                            bendStart = this._cursor.part;
                            bendEnd = currentPart + 1;
                        }
                        else {
                            bendStart = this._cursor.part + 1;
                            bendEnd = currentPart;
                        }
                        if (bendEnd < 0)
                            bendEnd = 0;
                        if (bendEnd > this._doc.song.beatsPerBar * this._doc.song.partsPerBeat)
                            bendEnd = this._doc.song.beatsPerBar * this._doc.song.partsPerBeat;
                        if (bendEnd > this._cursor.curNote.end) {
                            sequence.append(new beepbox.ChangeNoteTruncate(this._doc, this._pattern, this._cursor.curNote.start, bendEnd, this._cursor.curNote));
                        }
                        if (bendEnd < this._cursor.curNote.start) {
                            sequence.append(new beepbox.ChangeNoteTruncate(this._doc, this._pattern, bendEnd, this._cursor.curNote.end, this._cursor.curNote));
                        }
                        var minPitch = Number.MAX_VALUE;
                        var maxPitch = -Number.MAX_VALUE;
                        for (var _i = 0, _a = this._cursor.curNote.pitches; _i < _a.length; _i++) {
                            var pitch = _a[_i];
                            if (minPitch > pitch)
                                minPitch = pitch;
                            if (maxPitch < pitch)
                                maxPitch = pitch;
                        }
                        minPitch -= this._cursor.curNote.pitches[this._cursor.pitchIndex];
                        maxPitch -= this._cursor.curNote.pitches[this._cursor.pitchIndex];
                        var bendTo = this._snapToPitch(this._findMousePitch(this._mouseY), -minPitch, (this._doc.song.getChannelIsDrum(this._doc.channel) ? beepbox.Config.drumCount - 1 : beepbox.Config.maxPitch) - maxPitch);
                        sequence.append(new beepbox.ChangePitchBend(this._doc, this._cursor.curNote, bendStart, bendEnd, bendTo, this._cursor.pitchIndex));
                        this._copyPins(this._cursor.curNote);
                        this._dragTime = bendEnd;
                        this._dragPitch = bendTo;
                        this._dragVisible = true;
                    }
                }
                this._mouseXPrev = this._mouseX;
                this._mouseYPrev = this._mouseY;
            }
            else {
                this._updateCursorStatus();
                this._updatePreview();
            }
        };
        PatternEditor.prototype._updatePreview = function () {
            if (this._usingTouch) {
                if (!this._mouseDown || !this._cursor.valid || !this._mouseDragging || !this._dragVisible || this._pattern == null) {
                    this._svgPreview.setAttribute("visibility", "hidden");
                }
                else {
                    this._svgPreview.setAttribute("visibility", "visible");
                    var x = this._partWidth * this._dragTime;
                    var y = this._pitchToPixelHeight(this._dragPitch - this._octaveOffset);
                    var radius = this._pitchHeight / 2;
                    var width = 80;
                    var height = 60;
                    var pathString = "";
                    pathString += "M " + prettyNumber(x) + " " + prettyNumber(y - radius * (this._dragVolume / 3.0)) + " ";
                    pathString += "L " + prettyNumber(x) + " " + prettyNumber(y - radius * (this._dragVolume / 3.0) - height) + " ";
                    pathString += "M " + prettyNumber(x) + " " + prettyNumber(y + radius * (this._dragVolume / 3.0)) + " ";
                    pathString += "L " + prettyNumber(x) + " " + prettyNumber(y + radius * (this._dragVolume / 3.0) + height) + " ";
                    pathString += "M " + prettyNumber(x) + " " + prettyNumber(y - radius * (this._dragVolume / 3.0)) + " ";
                    pathString += "L " + prettyNumber(x + width) + " " + prettyNumber(y - radius * (this._dragVolume / 3.0)) + " ";
                    pathString += "M " + prettyNumber(x) + " " + prettyNumber(y + radius * (this._dragVolume / 3.0)) + " ";
                    pathString += "L " + prettyNumber(x + width) + " " + prettyNumber(y + radius * (this._dragVolume / 3.0)) + " ";
                    pathString += "M " + prettyNumber(x) + " " + prettyNumber(y - radius * (this._dragVolume / 3.0)) + " ";
                    pathString += "L " + prettyNumber(x - width) + " " + prettyNumber(y - radius * (this._dragVolume / 3.0)) + " ";
                    pathString += "M " + prettyNumber(x) + " " + prettyNumber(y + radius * (this._dragVolume / 3.0)) + " ";
                    pathString += "L " + prettyNumber(x - width) + " " + prettyNumber(y + radius * (this._dragVolume / 3.0)) + " ";
                    this._svgPreview.setAttribute("d", pathString);
                }
            }
            else {
                if (!this._mouseOver || this._mouseDown || !this._cursor.valid || this._pattern == null) {
                    this._svgPreview.setAttribute("visibility", "hidden");
                }
                else {
                    this._svgPreview.setAttribute("visibility", "visible");
                    this._drawNote(this._svgPreview, this._cursor.pitch, this._cursor.start, this._cursor.pins, this._pitchHeight / 2 + 1, true, this._octaveOffset);
                }
            }
        };
        PatternEditor.prototype._drawNote = function (svgElement, pitch, start, pins, radius, showVolume, offset) {
            var nextPin = pins[0];
            var pathString = "M " + prettyNumber(this._partWidth * (start + nextPin.time) + 1) + " " + prettyNumber(this._pitchToPixelHeight(pitch - offset) + radius * (showVolume ? nextPin.volume / 3.0 : 1.0)) + " ";
            for (var i = 1; i < pins.length; i++) {
                var prevPin = nextPin;
                nextPin = pins[i];
                var prevSide = this._partWidth * (start + prevPin.time) + (i == 1 ? 1 : 0);
                var nextSide = this._partWidth * (start + nextPin.time) - (i == pins.length - 1 ? 1 : 0);
                var prevHeight = this._pitchToPixelHeight(pitch + prevPin.interval - offset);
                var nextHeight = this._pitchToPixelHeight(pitch + nextPin.interval - offset);
                var prevVolume = showVolume ? prevPin.volume / 3.0 : 1.0;
                var nextVolume = showVolume ? nextPin.volume / 3.0 : 1.0;
                pathString += "L " + prettyNumber(prevSide) + " " + prettyNumber(prevHeight - radius * prevVolume) + " ";
                if (prevPin.interval > nextPin.interval)
                    pathString += "L " + prettyNumber(prevSide + 1) + " " + prettyNumber(prevHeight - radius * prevVolume) + " ";
                if (prevPin.interval < nextPin.interval)
                    pathString += "L " + prettyNumber(nextSide - 1) + " " + prettyNumber(nextHeight - radius * nextVolume) + " ";
                pathString += "L " + prettyNumber(nextSide) + " " + prettyNumber(nextHeight - radius * nextVolume) + " ";
            }
            for (var i = pins.length - 2; i >= 0; i--) {
                var prevPin = nextPin;
                nextPin = pins[i];
                var prevSide = this._partWidth * (start + prevPin.time) - (i == pins.length - 2 ? 1 : 0);
                var nextSide = this._partWidth * (start + nextPin.time) + (i == 0 ? 1 : 0);
                var prevHeight = this._pitchToPixelHeight(pitch + prevPin.interval - offset);
                var nextHeight = this._pitchToPixelHeight(pitch + nextPin.interval - offset);
                var prevVolume = showVolume ? prevPin.volume / 3.0 : 1.0;
                var nextVolume = showVolume ? nextPin.volume / 3.0 : 1.0;
                pathString += "L " + prettyNumber(prevSide) + " " + prettyNumber(prevHeight + radius * prevVolume) + " ";
                if (prevPin.interval < nextPin.interval)
                    pathString += "L " + prettyNumber(prevSide - 1) + " " + prettyNumber(prevHeight + radius * prevVolume) + " ";
                if (prevPin.interval > nextPin.interval)
                    pathString += "L " + prettyNumber(nextSide + 1) + " " + prettyNumber(nextHeight + radius * nextVolume) + " ";
                pathString += "L " + prettyNumber(nextSide) + " " + prettyNumber(nextHeight + radius * nextVolume) + " ";
            }
            pathString += "z";
            svgElement.setAttribute("d", pathString);
        };
        PatternEditor.prototype._pitchToPixelHeight = function (pitch) {
            return this._pitchHeight * (this._pitchCount - (pitch) - 0.5);
        };
        return PatternEditor;
    }());
    beepbox.PatternEditor = PatternEditor;
})(beepbox || (beepbox = {}));
var beepbox;
(function (beepbox) {
    var Box = (function () {
        function Box(channel, x, y, color) {
            this._text = beepbox.html.text("1");
            this._label = beepbox.svgElement("text", { x: 16, y: 23, "font-family": "sans-serif", "font-size": 20, "text-anchor": "middle", "font-weight": "bold", fill: "red" }, [this._text]);
            this._rect = beepbox.svgElement("rect", { width: 30, height: 30, x: 1, y: 1 });
            this.container = beepbox.svgElement("svg", undefined, [this._rect, this._label]);
            this._renderedIndex = 1;
            this._renderedDim = true;
            this._renderedSelected = false;
            this._renderedColor = "";
            this.container.setAttribute("x", "" + (x * 32));
            this.container.setAttribute("y", "" + (y * 32));
            this._rect.setAttribute("fill", "#444444");
            this._label.setAttribute("fill", color);
        }
        Box.prototype.setSquashed = function (squashed, y) {
            if (squashed) {
                this.container.setAttribute("y", "" + (y * 27));
                this._rect.setAttribute("height", "" + 25);
                this._label.setAttribute("y", "" + 21);
            }
            else {
                this.container.setAttribute("y", "" + (y * 32));
                this._rect.setAttribute("height", "" + 30);
                this._label.setAttribute("y", "" + 23);
            }
        };
        Box.prototype.setIndex = function (index, dim, selected, y, color) {
            if (this._renderedIndex != index) {
                if (!this._renderedSelected && ((index == 0) != (this._renderedIndex == 0))) {
                    this._rect.setAttribute("fill", (index == 0) ? "#000000" : "#444444");
                }
                this._renderedIndex = index;
                this._text.data = "" + index;
            }
            if (this._renderedDim != dim || this._renderedColor != color) {
                this._renderedDim = dim;
                if (selected) {
                    this._label.setAttribute("fill", "#000000");
                }
                else {
                    this._label.setAttribute("fill", color);
                }
            }
            if (this._renderedSelected != selected || this._renderedColor != color) {
                this._renderedSelected = selected;
                if (selected) {
                    this._rect.setAttribute("fill", color);
                    this._label.setAttribute("fill", "#000000");
                }
                else {
                    this._rect.setAttribute("fill", (this._renderedIndex == 0) ? "#000000" : "#444444");
                    this._label.setAttribute("fill", color);
                }
            }
            this._renderedColor = color;
        };
        return Box;
    }());
    var TrackEditor = (function () {
        function TrackEditor(_doc, _songEditor) {
            var _this = this;
            this._doc = _doc;
            this._songEditor = _songEditor;
            this._barWidth = 32;
            this._svg = beepbox.svgElement("svg", { style: "background-color: #000000; position: absolute;", height: 128 });
            this._select = beepbox.html.select({ className: "trackSelectBox", style: "width: 32px; height: 32px; background: none; border: none; appearance: none; color: transparent; position: absolute;" });
            this.container = beepbox.html.div({ style: "height: 128px; position: relative; overflow:hidden;" }, [this._svg, this._select]);
            this._boxContainer = beepbox.svgElement("g");
            this._playhead = beepbox.svgElement("rect", { fill: "white", x: 0, y: 0, width: 4, height: 128 });
            this._boxHighlight = beepbox.svgElement("rect", { fill: "none", stroke: "white", "stroke-width": 2, "pointer-events": "none", x: 1, y: 1, width: 30, height: 30 });
            this._upHighlight = beepbox.svgElement("path", { fill: "black", stroke: "black", "stroke-width": 1, "pointer-events": "none" });
            this._downHighlight = beepbox.svgElement("path", { fill: "black", stroke: "black", "stroke-width": 1, "pointer-events": "none" });
            this._grid = [];
            this._mouseX = 0;
            this._mouseY = 0;
            this._pattern = null;
            this._mouseOver = false;
            this._digits = "";
            this._editorHeight = 128;
            this._channelHeight = 32;
            this._renderedChannelCount = 0;
            this._renderedBarCount = 0;
            this._renderedPatternCount = 0;
            this._renderedPlayhead = -1;
            this._renderedSquashed = false;
            this._changePattern = null;
            this._whenSelectChanged = function () {
                _this._setPattern(_this._select.selectedIndex);
            };
            this._animatePlayhead = function (timestamp) {
                var playhead = (_this._barWidth * _this._doc.synth.playhead - 2);
                if (_this._renderedPlayhead != playhead) {
                    _this._renderedPlayhead = playhead;
                    _this._playhead.setAttribute("x", "" + playhead);
                }
                window.requestAnimationFrame(_this._animatePlayhead);
            };
            this._whenMouseOver = function (event) {
                if (_this._mouseOver)
                    return;
                _this._mouseOver = true;
            };
            this._whenMouseOut = function (event) {
                if (!_this._mouseOver)
                    return;
                _this._mouseOver = false;
            };
            this._whenMousePressed = function (event) {
                event.preventDefault();
                var boundingRect = _this._svg.getBoundingClientRect();
                _this._mouseX = (event.clientX || event.pageX) - boundingRect.left;
                _this._mouseY = (event.clientY || event.pageY) - boundingRect.top;
                var channel = Math.floor(Math.min(_this._doc.song.getChannelCount() - 1, Math.max(0, _this._mouseY / _this._channelHeight)));
                var bar = Math.floor(Math.min(_this._doc.song.barCount - 1, Math.max(0, _this._mouseX / _this._barWidth)));
                if (_this._doc.channel == channel && _this._doc.bar == bar) {
                    var up = (_this._mouseY % _this._channelHeight) < _this._channelHeight / 2;
                    var patternCount = _this._doc.song.patternsPerChannel;
                    _this._setPattern((_this._doc.song.channels[channel].bars[bar] + (up ? 1 : patternCount)) % (patternCount + 1));
                }
                else {
                    _this._setChannelBar(channel, bar);
                }
            };
            this._whenMouseMoved = function (event) {
                var boundingRect = _this._svg.getBoundingClientRect();
                _this._mouseX = (event.clientX || event.pageX) - boundingRect.left;
                _this._mouseY = (event.clientY || event.pageY) - boundingRect.top;
                _this._updatePreview();
            };
            this._whenMouseReleased = function (event) {
            };
            this._svg.appendChild(this._boxContainer);
            this._svg.appendChild(this._boxHighlight);
            this._svg.appendChild(this._upHighlight);
            this._svg.appendChild(this._downHighlight);
            this._svg.appendChild(this._playhead);
            window.requestAnimationFrame(this._animatePlayhead);
            this._svg.addEventListener("mousedown", this._whenMousePressed);
            document.addEventListener("mousemove", this._whenMouseMoved);
            document.addEventListener("mouseup", this._whenMouseReleased);
            this._svg.addEventListener("mouseover", this._whenMouseOver);
            this._svg.addEventListener("mouseout", this._whenMouseOut);
            this._select.addEventListener("change", this._whenSelectChanged);
        }
        TrackEditor.prototype._setChannelBar = function (channel, bar) {
            new beepbox.ChangeChannelBar(this._doc, channel, bar);
            this._digits = "";
            this._doc.forgetLastChange();
        };
        TrackEditor.prototype._setPattern = function (pattern) {
            var currentValue = this._doc.song.channels[this._doc.channel].bars[this._doc.bar];
            var canReplaceLastChange = this._doc.lastChangeWas(this._changePattern);
            var oldValue = canReplaceLastChange ? this._changePattern.oldValue : currentValue;
            if (pattern != currentValue) {
                this._changePattern = new beepbox.ChangePattern(this._doc, oldValue, pattern);
                this._doc.record(this._changePattern, canReplaceLastChange);
            }
        };
        TrackEditor.prototype.onKeyPressed = function (event) {
            switch (event.keyCode) {
                case 38:
                    this._setChannelBar((this._doc.channel - 1 + this._doc.song.getChannelCount()) % this._doc.song.getChannelCount(), this._doc.bar);
                    event.preventDefault();
                    break;
                case 40:
                    this._setChannelBar((this._doc.channel + 1) % this._doc.song.getChannelCount(), this._doc.bar);
                    event.preventDefault();
                    break;
                case 37:
                    this._setChannelBar(this._doc.channel, (this._doc.bar + this._doc.song.barCount - 1) % this._doc.song.barCount);
                    event.preventDefault();
                    break;
                case 39:
                    this._setChannelBar(this._doc.channel, (this._doc.bar + 1) % this._doc.song.barCount);
                    event.preventDefault();
                    break;
                case 48:
                    this._nextDigit("0");
                    event.preventDefault();
                    break;
                case 49:
                    this._nextDigit("1");
                    event.preventDefault();
                    break;
                case 50:
                    this._nextDigit("2");
                    event.preventDefault();
                    break;
                case 51:
                    this._nextDigit("3");
                    event.preventDefault();
                    break;
                case 52:
                    this._nextDigit("4");
                    event.preventDefault();
                    break;
                case 53:
                    this._nextDigit("5");
                    event.preventDefault();
                    break;
                case 54:
                    this._nextDigit("6");
                    event.preventDefault();
                    break;
                case 55:
                    this._nextDigit("7");
                    event.preventDefault();
                    break;
                case 56:
                    this._nextDigit("8");
                    event.preventDefault();
                    break;
                case 57:
                    this._nextDigit("9");
                    event.preventDefault();
                    break;
                default:
                    this._digits = "";
                    break;
            }
        };
        TrackEditor.prototype._nextDigit = function (digit) {
            this._digits += digit;
            var parsed = parseInt(this._digits);
            if (parsed <= this._doc.song.patternsPerChannel) {
                this._setPattern(parsed);
                return;
            }
            this._digits = digit;
            parsed = parseInt(this._digits);
            if (parsed <= this._doc.song.patternsPerChannel) {
                this._setPattern(parsed);
                return;
            }
            this._digits = "";
        };
        TrackEditor.prototype._updatePreview = function () {
            var channel = Math.floor(Math.min(this._doc.song.getChannelCount() - 1, Math.max(0, this._mouseY / this._channelHeight)));
            var bar = Math.floor(Math.min(this._doc.song.barCount - 1, Math.max(0, this._mouseX / this._barWidth)));
            var wideScreen = window.innerWidth > 700;
            if (!wideScreen) {
                bar = this._doc.bar;
                channel = this._doc.channel;
            }
            var selected = (bar == this._doc.bar && channel == this._doc.channel);
            if (this._mouseOver && !selected) {
                this._boxHighlight.setAttribute("x", "" + (1 + this._barWidth * bar));
                this._boxHighlight.setAttribute("y", "" + (1 + (this._channelHeight * channel)));
                this._boxHighlight.setAttribute("height", "" + (this._channelHeight - 2));
                this._boxHighlight.style.visibility = "visible";
            }
            else {
                this._boxHighlight.style.visibility = "hidden";
            }
            if ((this._mouseOver || !wideScreen) && selected) {
                var up = (this._mouseY % this._channelHeight) < this._channelHeight / 2;
                var center = this._barWidth * (bar + 0.8);
                var middle = this._channelHeight * (channel + 0.5);
                var base = this._channelHeight * 0.1;
                var tip = this._channelHeight * 0.4;
                var width = this._channelHeight * 0.175;
                this._upHighlight.setAttribute("fill", up && wideScreen ? "#fff" : "#000");
                this._downHighlight.setAttribute("fill", !up && wideScreen ? "#fff" : "#000");
                this._upHighlight.setAttribute("d", "M " + center + " " + (middle - tip) + " L " + (center + width) + " " + (middle - base) + " L " + (center - width) + " " + (middle - base) + " z");
                this._downHighlight.setAttribute("d", "M " + center + " " + (middle + tip) + " L " + (center + width) + " " + (middle + base) + " L " + (center - width) + " " + (middle + base) + " z");
                this._upHighlight.style.visibility = "visible";
                this._downHighlight.style.visibility = "visible";
            }
            else {
                this._upHighlight.style.visibility = "hidden";
                this._downHighlight.style.visibility = "hidden";
            }
            this._select.style.left = (this._barWidth * this._doc.bar) + "px";
            this._select.style.top = (this._channelHeight * this._doc.channel) + "px";
            this._select.style.height = this._channelHeight + "px";
            var patternCount = this._doc.song.patternsPerChannel;
            for (var i = this._renderedPatternCount; i < patternCount; i++) {
                this._select.appendChild(beepbox.html.option(i, i, false, false));
            }
            for (var i = patternCount; i < this._renderedPatternCount; i++) {
                this._select.removeChild(this._select.lastChild);
            }
            this._renderedPatternCount = patternCount;
            var selectedPattern = this._doc.song.channels[this._doc.channel].bars[this._doc.bar];
            if (this._select.selectedIndex != selectedPattern)
                this._select.selectedIndex = selectedPattern;
        };
        TrackEditor.prototype.render = function () {
            this._pattern = this._doc.getCurrentPattern();
            var wideScreen = window.innerWidth > 700;
            var squashed = !wideScreen || this._doc.song.getChannelCount() > 4 || (this._doc.song.barCount > this._doc.trackVisibleBars && this._doc.song.getChannelCount() > 3);
            this._channelHeight = squashed ? 27 : 32;
            if (this._renderedChannelCount != this._doc.song.getChannelCount()) {
                for (var y = this._renderedChannelCount; y < this._doc.song.getChannelCount(); y++) {
                    this._grid[y] = [];
                    for (var x = 0; x < this._renderedBarCount; x++) {
                        var box = new Box(y, x, y, this._doc.song.getChannelColorDim(y));
                        box.setSquashed(squashed, y);
                        this._boxContainer.appendChild(box.container);
                        this._grid[y][x] = box;
                    }
                }
                for (var y = this._doc.song.getChannelCount(); y < this._renderedChannelCount; y++) {
                    for (var x = 0; x < this._renderedBarCount; x++) {
                        this._boxContainer.removeChild(this._grid[y][x].container);
                    }
                }
                this._grid.length = this._doc.song.getChannelCount();
            }
            if (this._renderedBarCount != this._doc.song.barCount) {
                for (var y = 0; y < this._doc.song.getChannelCount(); y++) {
                    for (var x = this._renderedBarCount; x < this._doc.song.barCount; x++) {
                        var box = new Box(y, x, y, this._doc.song.getChannelColorDim(y));
                        box.setSquashed(squashed, y);
                        this._boxContainer.appendChild(box.container);
                        this._grid[y][x] = box;
                    }
                    for (var x = this._doc.song.barCount; x < this._renderedBarCount; x++) {
                        this._boxContainer.removeChild(this._grid[y][x].container);
                    }
                    this._grid[y].length = this._doc.song.barCount;
                }
                this._renderedBarCount = this._doc.song.barCount;
                var editorWidth = 32 * this._doc.song.barCount;
                this.container.style.width = editorWidth + "px";
                this._svg.setAttribute("width", editorWidth + "");
            }
            if (this._renderedSquashed != squashed) {
                for (var y = 0; y < this._doc.song.getChannelCount(); y++) {
                    for (var x = 0; x < this._renderedBarCount; x++) {
                        this._grid[y][x].setSquashed(squashed, y);
                    }
                }
            }
            if (this._renderedSquashed != squashed || this._renderedChannelCount != this._doc.song.getChannelCount()) {
                this._renderedSquashed = squashed;
                this._renderedChannelCount = this._doc.song.getChannelCount();
                this._editorHeight = this._doc.song.getChannelCount() * this._channelHeight;
                this._svg.setAttribute("height", "" + this._editorHeight);
                this._playhead.setAttribute("height", "" + this._editorHeight);
                this.container.style.height = this._editorHeight + "px";
            }
            for (var j = 0; j < this._doc.song.getChannelCount(); j++) {
                for (var i = 0; i < this._renderedBarCount; i++) {
                    var pattern = this._doc.song.getPattern(j, i);
                    var selected = (i == this._doc.bar && j == this._doc.channel);
                    var dim = (pattern == null || pattern.notes.length == 0);
                    var box = this._grid[j][i];
                    if (i < this._doc.song.barCount) {
                        box.setIndex(this._doc.song.channels[j].bars[i], dim, selected, j, dim && !selected ? this._doc.song.getChannelColorDim(j) : this._doc.song.getChannelColorBright(j));
                        box.container.style.visibility = "visible";
                    }
                    else {
                        box.container.style.visibility = "hidden";
                    }
                }
            }
            this._updatePreview();
        };
        return TrackEditor;
    }());
    beepbox.TrackEditor = TrackEditor;
})(beepbox || (beepbox = {}));
var beepbox;
(function (beepbox) {
    var LoopEditor = (function () {
        function LoopEditor(_doc) {
            var _this = this;
            this._doc = _doc;
            this._barWidth = 32;
            this._editorHeight = 20;
            this._startMode = 0;
            this._endMode = 1;
            this._bothMode = 2;
            this._loop = beepbox.svgElement("path", { fill: "none", stroke: "#7744ff", "stroke-width": 4 });
            this._highlight = beepbox.svgElement("path", { fill: "white", "pointer-events": "none" });
            this._svg = beepbox.svgElement("svg", { style: "background-color: #000000; touch-action: pan-y; position: absolute;", height: this._editorHeight }, [
                this._loop,
                this._highlight,
            ]);
            this.container = beepbox.html.div({ style: "height: 20px; position: relative; margin: 5px 0;" }, [this._svg]);
            this._change = null;
            this._cursor = { startBar: -1, mode: -1 };
            this._mouseX = 0;
            this._mouseY = 0;
            this._clientStartX = 0;
            this._clientStartY = 0;
            this._startedScrolling = false;
            this._draggingHorizontally = false;
            this._mouseDown = false;
            this._mouseOver = false;
            this._renderedLoopStart = -1;
            this._renderedLoopStop = -1;
            this._renderedBarCount = 0;
            this._whenMouseOver = function (event) {
                if (_this._mouseOver)
                    return;
                _this._mouseOver = true;
                _this._updatePreview();
            };
            this._whenMouseOut = function (event) {
                if (!_this._mouseOver)
                    return;
                _this._mouseOver = false;
                _this._updatePreview();
            };
            this._whenMousePressed = function (event) {
                event.preventDefault();
                _this._mouseDown = true;
                var boundingRect = _this._svg.getBoundingClientRect();
                _this._mouseX = (event.clientX || event.pageX) - boundingRect.left;
                _this._mouseY = (event.clientY || event.pageY) - boundingRect.top;
                _this._updateCursorStatus();
                _this._updatePreview();
                _this._whenMouseMoved(event);
            };
            this._whenTouchPressed = function (event) {
                _this._mouseDown = true;
                var boundingRect = _this._svg.getBoundingClientRect();
                _this._mouseX = event.touches[0].clientX - boundingRect.left;
                _this._mouseY = event.touches[0].clientY - boundingRect.top;
                _this._updateCursorStatus();
                _this._updatePreview();
                _this._clientStartX = event.touches[0].clientX;
                _this._clientStartY = event.touches[0].clientY;
                _this._draggingHorizontally = false;
                _this._startedScrolling = false;
            };
            this._whenMouseMoved = function (event) {
                var boundingRect = _this._svg.getBoundingClientRect();
                _this._mouseX = (event.clientX || event.pageX) - boundingRect.left;
                _this._mouseY = (event.clientY || event.pageY) - boundingRect.top;
                _this._whenCursorMoved();
            };
            this._whenTouchMoved = function (event) {
                if (!_this._mouseDown)
                    return;
                var boundingRect = _this._svg.getBoundingClientRect();
                _this._mouseX = event.touches[0].clientX - boundingRect.left;
                _this._mouseY = event.touches[0].clientY - boundingRect.top;
                if (!_this._draggingHorizontally && !_this._startedScrolling) {
                    if (Math.abs(event.touches[0].clientY - _this._clientStartY) > 10) {
                        _this._startedScrolling = true;
                    }
                    else if (Math.abs(event.touches[0].clientX - _this._clientStartX) > 10) {
                        _this._draggingHorizontally = true;
                    }
                }
                if (_this._draggingHorizontally) {
                    _this._whenCursorMoved();
                    event.preventDefault();
                }
            };
            this._whenTouchReleased = function (event) {
                event.preventDefault();
                if (!_this._startedScrolling) {
                    _this._whenCursorMoved();
                    _this._mouseOver = false;
                    _this._whenCursorReleased(event);
                    _this._updatePreview();
                }
            };
            this._whenCursorReleased = function (event) {
                if (_this._change != null)
                    _this._doc.record(_this._change);
                _this._change = null;
                _this._mouseDown = false;
                _this._updateCursorStatus();
                _this._render();
            };
            this._documentChanged = function () {
                _this._render();
            };
            this._updateCursorStatus();
            this._render();
            this._doc.notifier.watch(this._documentChanged);
            this.container.addEventListener("mousedown", this._whenMousePressed);
            document.addEventListener("mousemove", this._whenMouseMoved);
            document.addEventListener("mouseup", this._whenCursorReleased);
            this.container.addEventListener("mouseover", this._whenMouseOver);
            this.container.addEventListener("mouseout", this._whenMouseOut);
            this.container.addEventListener("touchstart", this._whenTouchPressed);
            this.container.addEventListener("touchmove", this._whenTouchMoved);
            this.container.addEventListener("touchend", this._whenTouchReleased);
            this.container.addEventListener("touchcancel", this._whenTouchReleased);
        }
        LoopEditor.prototype._updateCursorStatus = function () {
            var bar = this._mouseX / this._barWidth;
            this._cursor.startBar = bar;
            if (bar > this._doc.song.loopStart - 0.25 && bar < this._doc.song.loopStart + this._doc.song.loopLength + 0.25) {
                if (bar - this._doc.song.loopStart < this._doc.song.loopLength * 0.5) {
                    this._cursor.mode = this._startMode;
                }
                else {
                    this._cursor.mode = this._endMode;
                }
            }
            else {
                this._cursor.mode = this._bothMode;
            }
        };
        LoopEditor.prototype._findEndPoints = function (middle) {
            var start = Math.round(middle - this._doc.song.loopLength / 2);
            var end = start + this._doc.song.loopLength;
            if (start < 0) {
                end -= start;
                start = 0;
            }
            if (end > this._doc.song.barCount) {
                start -= end - this._doc.song.barCount;
                end = this._doc.song.barCount;
            }
            return { start: start, length: end - start };
        };
        LoopEditor.prototype._whenCursorMoved = function () {
            if (this._mouseDown) {
                var oldStart = this._doc.song.loopStart;
                var oldEnd = this._doc.song.loopStart + this._doc.song.loopLength;
                if (this._change != null && this._doc.lastChangeWas(this._change)) {
                    oldStart = this._change.oldStart;
                    oldEnd = oldStart + this._change.oldLength;
                }
                var bar = this._mouseX / this._barWidth;
                var start = void 0;
                var end = void 0;
                var temp = void 0;
                if (this._cursor.mode == this._startMode) {
                    start = oldStart + Math.round(bar - this._cursor.startBar);
                    end = oldEnd;
                    if (start < 0)
                        start = 0;
                    if (start >= this._doc.song.barCount)
                        start = this._doc.song.barCount;
                    if (start == end) {
                        start = end - 1;
                    }
                    else if (start > end) {
                        temp = start;
                        start = end;
                        end = temp;
                    }
                    this._change = new beepbox.ChangeLoop(this._doc, oldStart, oldEnd - oldStart, start, end - start);
                }
                else if (this._cursor.mode == this._endMode) {
                    start = oldStart;
                    end = oldEnd + Math.round(bar - this._cursor.startBar);
                    if (end < 0)
                        end = 0;
                    if (end >= this._doc.song.barCount)
                        end = this._doc.song.barCount;
                    if (end == start) {
                        end = start + 1;
                    }
                    else if (end < start) {
                        temp = start;
                        start = end;
                        end = temp;
                    }
                    this._change = new beepbox.ChangeLoop(this._doc, oldStart, oldEnd - oldStart, start, end - start);
                }
                else if (this._cursor.mode == this._bothMode) {
                    var endPoints = this._findEndPoints(bar);
                    this._change = new beepbox.ChangeLoop(this._doc, oldStart, oldEnd - oldStart, endPoints.start, endPoints.length);
                }
                this._doc.setProspectiveChange(this._change);
            }
            else {
                this._updateCursorStatus();
                this._updatePreview();
            }
        };
        LoopEditor.prototype._updatePreview = function () {
            var showHighlight = this._mouseOver && !this._mouseDown;
            this._highlight.style.visibility = showHighlight ? "visible" : "hidden";
            if (showHighlight) {
                var radius = this._editorHeight / 2;
                var highlightStart = (this._doc.song.loopStart) * this._barWidth;
                var highlightStop = (this._doc.song.loopStart + this._doc.song.loopLength) * this._barWidth;
                if (this._cursor.mode == this._startMode) {
                    highlightStop = (this._doc.song.loopStart) * this._barWidth + radius * 2;
                }
                else if (this._cursor.mode == this._endMode) {
                    highlightStart = (this._doc.song.loopStart + this._doc.song.loopLength) * this._barWidth - radius * 2;
                }
                else {
                    var endPoints = this._findEndPoints(this._cursor.startBar);
                    highlightStart = (endPoints.start) * this._barWidth;
                    highlightStop = (endPoints.start + endPoints.length) * this._barWidth;
                }
                this._highlight.setAttribute("d", "M " + (highlightStart + radius) + " " + 4 + " " +
                    ("L " + (highlightStop - radius) + " " + 4 + " ") +
                    ("A " + (radius - 4) + " " + (radius - 4) + " " + 0 + " " + 0 + " " + 1 + " " + (highlightStop - radius) + " " + (this._editorHeight - 4) + " ") +
                    ("L " + (highlightStart + radius) + " " + (this._editorHeight - 4) + " ") +
                    ("A " + (radius - 4) + " " + (radius - 4) + " " + 0 + " " + 0 + " " + 1 + " " + (highlightStart + radius) + " " + 4 + " ") +
                    "z");
            }
        };
        LoopEditor.prototype._render = function () {
            var radius = this._editorHeight / 2;
            var loopStart = (this._doc.song.loopStart) * this._barWidth;
            var loopStop = (this._doc.song.loopStart + this._doc.song.loopLength) * this._barWidth;
            if (this._renderedBarCount != this._doc.song.barCount) {
                this._renderedBarCount = this._doc.song.barCount;
                var editorWidth = 32 * this._doc.song.barCount;
                this.container.style.width = editorWidth + "px";
                this._svg.setAttribute("width", editorWidth + "");
            }
            if (this._renderedLoopStart != loopStart || this._renderedLoopStop != loopStop) {
                this._renderedLoopStart = loopStart;
                this._renderedLoopStop = loopStop;
                this._loop.setAttribute("d", "M " + (loopStart + radius) + " " + 2 + " " +
                    ("L " + (loopStop - radius) + " " + 2 + " ") +
                    ("A " + (radius - 2) + " " + (radius - 2) + " " + 0 + " " + 0 + " " + 1 + " " + (loopStop - radius) + " " + (this._editorHeight - 2) + " ") +
                    ("L " + (loopStart + radius) + " " + (this._editorHeight - 2) + " ") +
                    ("A " + (radius - 2) + " " + (radius - 2) + " " + 0 + " " + 0 + " " + 1 + " " + (loopStart + radius) + " " + 2 + " ") +
                    "z");
            }
            this._updatePreview();
        };
        return LoopEditor;
    }());
    beepbox.LoopEditor = LoopEditor;
})(beepbox || (beepbox = {}));
var beepbox;
(function (beepbox) {
    var BarScrollBar = (function () {
        function BarScrollBar(_doc, _trackContainer) {
            var _this = this;
            this._doc = _doc;
            this._trackContainer = _trackContainer;
            this._editorWidth = 512;
            this._editorHeight = 20;
            this._notches = beepbox.svgElement("svg", { "pointer-events": "none" });
            this._handle = beepbox.svgElement("rect", { fill: "#444444", x: 0, y: 2, width: 10, height: this._editorHeight - 4 });
            this._handleHighlight = beepbox.svgElement("rect", { fill: "none", stroke: "white", "stroke-width": 2, "pointer-events": "none", x: 0, y: 1, width: 10, height: this._editorHeight - 2 });
            this._leftHighlight = beepbox.svgElement("path", { fill: "white", "pointer-events": "none" });
            this._rightHighlight = beepbox.svgElement("path", { fill: "white", "pointer-events": "none" });
            this._svg = beepbox.svgElement("svg", { style: "background-color: #000000; touch-action: pan-y; position: absolute;", width: this._editorWidth, height: this._editorHeight }, [
                this._notches,
                this._handle,
                this._handleHighlight,
                this._leftHighlight,
                this._rightHighlight,
            ]);
            this.container = beepbox.html.div({ className: "barScrollBar", style: "width: 512px; height: 20px; overflow: hidden; position: relative;" }, [this._svg]);
            this._mouseX = 0;
            this._mouseY = 0;
            this._mouseDown = false;
            this._mouseOver = false;
            this._dragging = false;
            this._renderedNotchCount = -1;
            this._renderedBarPos = -1;
            this._onScroll = function (event) {
                _this._doc.barScrollPos = (_this._trackContainer.scrollLeft / 32);
            };
            this._whenMouseOver = function (event) {
                if (_this._mouseOver)
                    return;
                _this._mouseOver = true;
                _this._updatePreview();
            };
            this._whenMouseOut = function (event) {
                if (!_this._mouseOver)
                    return;
                _this._mouseOver = false;
                _this._updatePreview();
            };
            this._whenMousePressed = function (event) {
                event.preventDefault();
                _this._mouseDown = true;
                var boundingRect = _this._svg.getBoundingClientRect();
                _this._mouseX = (event.clientX || event.pageX) - boundingRect.left;
                _this._mouseY = (event.clientY || event.pageY) - boundingRect.top;
                _this._updatePreview();
                if (_this._mouseX >= _this._doc.barScrollPos * _this._barWidth && _this._mouseX <= (_this._doc.barScrollPos + _this._doc.trackVisibleBars) * _this._barWidth) {
                    _this._dragging = true;
                    _this._dragStart = _this._mouseX;
                }
            };
            this._whenTouchPressed = function (event) {
                event.preventDefault();
                _this._mouseDown = true;
                var boundingRect = _this._svg.getBoundingClientRect();
                _this._mouseX = event.touches[0].clientX - boundingRect.left;
                _this._mouseY = event.touches[0].clientY - boundingRect.top;
                _this._updatePreview();
                if (_this._mouseX >= _this._doc.barScrollPos * _this._barWidth && _this._mouseX <= (_this._doc.barScrollPos + _this._doc.trackVisibleBars) * _this._barWidth) {
                    _this._dragging = true;
                    _this._dragStart = _this._mouseX;
                }
            };
            this._whenMouseMoved = function (event) {
                var boundingRect = _this._svg.getBoundingClientRect();
                _this._mouseX = (event.clientX || event.pageX) - boundingRect.left;
                _this._mouseY = (event.clientY || event.pageY) - boundingRect.top;
                _this._whenCursorMoved();
            };
            this._whenTouchMoved = function (event) {
                if (!_this._mouseDown)
                    return;
                event.preventDefault();
                var boundingRect = _this._svg.getBoundingClientRect();
                _this._mouseX = event.touches[0].clientX - boundingRect.left;
                _this._mouseY = event.touches[0].clientY - boundingRect.top;
                _this._whenCursorMoved();
            };
            this._whenCursorReleased = function (event) {
                if (!_this._dragging && _this._mouseDown) {
                    if (_this._mouseX < (_this._doc.barScrollPos + 8) * _this._barWidth) {
                        if (_this._doc.barScrollPos > 0)
                            _this._doc.barScrollPos--;
                        _this._doc.notifier.changed();
                    }
                    else {
                        if (_this._doc.barScrollPos < _this._doc.song.barCount - _this._doc.trackVisibleBars)
                            _this._doc.barScrollPos++;
                        _this._doc.notifier.changed();
                    }
                }
                _this._mouseDown = false;
                _this._dragging = false;
                _this._updatePreview();
            };
            var center = this._editorHeight * 0.5;
            var base = 20;
            var tip = 9;
            var arrowHeight = 6;
            this._leftHighlight.setAttribute("d", "M " + tip + " " + center + " L " + base + " " + (center + arrowHeight) + " L " + base + " " + (center - arrowHeight) + " z");
            this._rightHighlight.setAttribute("d", "M " + (this._editorWidth - tip) + " " + center + " L " + (this._editorWidth - base) + " " + (center + arrowHeight) + " L " + (this._editorWidth - base) + " " + (center - arrowHeight) + " z");
            this.container.addEventListener("mousedown", this._whenMousePressed);
            document.addEventListener("mousemove", this._whenMouseMoved);
            document.addEventListener("mouseup", this._whenCursorReleased);
            this.container.addEventListener("mouseover", this._whenMouseOver);
            this.container.addEventListener("mouseout", this._whenMouseOut);
            this.container.addEventListener("touchstart", this._whenTouchPressed);
            this.container.addEventListener("touchmove", this._whenTouchMoved);
            this.container.addEventListener("touchend", this._whenCursorReleased);
            this.container.addEventListener("touchcancel", this._whenCursorReleased);
            this._trackContainer.addEventListener("scroll", this._onScroll, { capture: false, passive: true });
        }
        BarScrollBar.prototype._whenCursorMoved = function () {
            if (this._dragging) {
                while (this._mouseX - this._dragStart < -this._barWidth * 0.5) {
                    if (this._doc.barScrollPos > 0) {
                        this._doc.barScrollPos--;
                        this._dragStart -= this._barWidth;
                        this._doc.notifier.changed();
                    }
                    else {
                        break;
                    }
                }
                while (this._mouseX - this._dragStart > this._barWidth * 0.5) {
                    if (this._doc.barScrollPos < this._doc.song.barCount - this._doc.trackVisibleBars) {
                        this._doc.barScrollPos++;
                        this._dragStart += this._barWidth;
                        this._doc.notifier.changed();
                    }
                    else {
                        break;
                    }
                }
            }
            if (this._mouseOver)
                this._updatePreview();
        };
        BarScrollBar.prototype._updatePreview = function () {
            var showHighlight = this._mouseOver && !this._mouseDown;
            var showleftHighlight = false;
            var showRightHighlight = false;
            var showHandleHighlight = false;
            if (showHighlight) {
                if (this._mouseX < this._doc.barScrollPos * this._barWidth) {
                    showleftHighlight = true;
                }
                else if (this._mouseX > (this._doc.barScrollPos + this._doc.trackVisibleBars) * this._barWidth) {
                    showRightHighlight = true;
                }
                else {
                    showHandleHighlight = true;
                }
            }
            this._leftHighlight.style.visibility = showleftHighlight ? "visible" : "hidden";
            this._rightHighlight.style.visibility = showRightHighlight ? "visible" : "hidden";
            this._handleHighlight.style.visibility = showHandleHighlight ? "visible" : "hidden";
        };
        BarScrollBar.prototype.render = function () {
            this._barWidth = (this._editorWidth - 1) / Math.max(this._doc.trackVisibleBars, this._doc.song.barCount);
            var resized = this._renderedNotchCount != this._doc.song.barCount;
            if (resized) {
                this._renderedNotchCount = this._doc.song.barCount;
                while (this._notches.firstChild)
                    this._notches.removeChild(this._notches.firstChild);
                for (var i = 0; i <= this._doc.song.barCount; i++) {
                    var lineHeight = (i % 16 == 0) ? 0 : ((i % 4 == 0) ? this._editorHeight / 8 : this._editorHeight / 3);
                    this._notches.appendChild(beepbox.svgElement("rect", { fill: "#444444", x: i * this._barWidth - 1, y: lineHeight, width: 2, height: this._editorHeight - lineHeight * 2 }));
                }
            }
            if (resized || this._renderedBarPos != this._doc.barScrollPos) {
                this._renderedBarPos = this._doc.barScrollPos;
                this._handle.setAttribute("x", "" + (this._barWidth * this._doc.barScrollPos));
                this._handle.setAttribute("width", "" + (this._barWidth * this._doc.trackVisibleBars));
                this._handleHighlight.setAttribute("x", "" + (this._barWidth * this._doc.barScrollPos));
                this._handleHighlight.setAttribute("width", "" + (this._barWidth * this._doc.trackVisibleBars));
            }
            this._updatePreview();
            this._trackContainer.scrollLeft = this._doc.barScrollPos * 32;
        };
        return BarScrollBar;
    }());
    beepbox.BarScrollBar = BarScrollBar;
})(beepbox || (beepbox = {}));
var beepbox;
(function (beepbox) {
    var OctaveScrollBar = (function () {
        function OctaveScrollBar(_doc) {
            var _this = this;
            this._doc = _doc;
            this._editorWidth = 20;
            this._editorHeight = 481;
            this._notchHeight = 4.0;
            this._octaveCount = 7;
            this._octaveHeight = (this._editorHeight - this._notchHeight) / this._octaveCount;
            this._barHeight = (this._octaveHeight * 3 + this._notchHeight);
            this._handle = beepbox.svgElement("rect", { fill: "#444444", x: 2, y: 0, width: this._editorWidth - 4, height: this._barHeight });
            this._handleHighlight = beepbox.svgElement("rect", { fill: "none", stroke: "white", "stroke-width": 2, "pointer-events": "none", x: 1, y: 0, width: this._editorWidth - 2, height: this._barHeight });
            this._upHighlight = beepbox.svgElement("path", { fill: "white", "pointer-events": "none" });
            this._downHighlight = beepbox.svgElement("path", { fill: "white", "pointer-events": "none" });
            this._svg = beepbox.svgElement("svg", { style: "background-color: #000000; touch-action: pan-x; position: absolute;", width: this._editorWidth, height: "100%", viewBox: "0 0 20 481", preserveAspectRatio: "none" });
            this.container = beepbox.html.div({ id: "octaveScrollBarContainer", style: "width: 20px; height: 100%; overflow: hidden; position: relative; flex-shrink: 0;" }, [this._svg]);
            this._mouseX = 0;
            this._mouseY = 0;
            this._mouseDown = false;
            this._mouseOver = false;
            this._dragging = false;
            this._renderedBarBottom = -1;
            this._change = null;
            this._whenMouseOver = function (event) {
                if (_this._mouseOver)
                    return;
                _this._mouseOver = true;
                _this._updatePreview();
            };
            this._whenMouseOut = function (event) {
                if (!_this._mouseOver)
                    return;
                _this._mouseOver = false;
                _this._updatePreview();
            };
            this._whenMousePressed = function (event) {
                event.preventDefault();
                _this._mouseDown = true;
                var boundingRect = _this._svg.getBoundingClientRect();
                _this._mouseX = (event.clientX || event.pageX) - boundingRect.left;
                _this._mouseY = ((event.clientY || event.pageY) - boundingRect.top) * _this._editorHeight / (boundingRect.bottom - boundingRect.top);
                if (isNaN(_this._mouseY))
                    _this._mouseY = 0;
                if (_this._doc.song.getChannelIsDrum(_this._doc.channel))
                    return;
                _this._updatePreview();
                if (_this._mouseY >= _this._barBottom - _this._barHeight && _this._mouseY <= _this._barBottom) {
                    _this._dragging = true;
                    _this._change = null;
                    _this._dragStart = _this._mouseY;
                }
            };
            this._whenTouchPressed = function (event) {
                event.preventDefault();
                _this._mouseDown = true;
                var boundingRect = _this._svg.getBoundingClientRect();
                _this._mouseX = event.touches[0].clientX - boundingRect.left;
                _this._mouseY = (event.touches[0].clientY - boundingRect.top) * _this._editorHeight / (boundingRect.bottom - boundingRect.top);
                if (isNaN(_this._mouseY))
                    _this._mouseY = 0;
                if (_this._doc.song.getChannelIsDrum(_this._doc.channel))
                    return;
                _this._updatePreview();
                if (_this._mouseY >= _this._barBottom - _this._barHeight && _this._mouseY <= _this._barBottom) {
                    _this._dragging = true;
                    _this._change = null;
                    _this._dragStart = _this._mouseY;
                }
            };
            this._whenMouseMoved = function (event) {
                var boundingRect = _this._svg.getBoundingClientRect();
                _this._mouseX = (event.clientX || event.pageX) - boundingRect.left;
                _this._mouseY = ((event.clientY || event.pageY) - boundingRect.top) * _this._editorHeight / (boundingRect.bottom - boundingRect.top);
                if (isNaN(_this._mouseY))
                    _this._mouseY = 0;
                _this._whenCursorMoved();
            };
            this._whenTouchMoved = function (event) {
                if (!_this._mouseDown)
                    return;
                event.preventDefault();
                var boundingRect = _this._svg.getBoundingClientRect();
                _this._mouseX = event.touches[0].clientX - boundingRect.left;
                _this._mouseY = (event.touches[0].clientY - boundingRect.top) * _this._editorHeight / (boundingRect.bottom - boundingRect.top);
                if (isNaN(_this._mouseY))
                    _this._mouseY = 0;
                _this._whenCursorMoved();
            };
            this._whenCursorReleased = function (event) {
                if (!_this._doc.song.getChannelIsDrum(_this._doc.channel) && _this._mouseDown) {
                    if (_this._dragging) {
                        if (_this._change != null)
                            _this._doc.record(_this._change);
                    }
                    else {
                        var canReplaceLastChange = _this._doc.lastChangeWas(_this._change);
                        var oldValue = canReplaceLastChange ? _this._change.oldValue : _this._doc.song.channels[_this._doc.channel].octave;
                        var currentOctave = _this._doc.song.channels[_this._doc.channel].octave;
                        if (_this._mouseY < _this._barBottom - _this._barHeight * 0.5) {
                            if (currentOctave < 4) {
                                _this._change = new beepbox.ChangeOctave(_this._doc, oldValue, currentOctave + 1);
                                _this._doc.record(_this._change, canReplaceLastChange);
                            }
                        }
                        else {
                            if (currentOctave > 0) {
                                _this._change = new beepbox.ChangeOctave(_this._doc, oldValue, currentOctave - 1);
                                _this._doc.record(_this._change, canReplaceLastChange);
                            }
                        }
                    }
                }
                _this._mouseDown = false;
                _this._dragging = false;
                _this._updatePreview();
            };
            this._documentChanged = function () {
                _this._barBottom = _this._editorHeight - (_this._octaveHeight * _this._doc.song.channels[_this._doc.channel].octave);
                _this._render();
            };
            this._doc.notifier.watch(this._documentChanged);
            this._documentChanged();
            this._svg.appendChild(this._handle);
            for (var i = 0; i <= this._octaveCount; i++) {
                this._svg.appendChild(beepbox.svgElement("rect", { fill: "#886644", x: 0, y: i * this._octaveHeight, width: this._editorWidth, height: this._notchHeight }));
            }
            this._svg.appendChild(this._handleHighlight);
            this._svg.appendChild(this._upHighlight);
            this._svg.appendChild(this._downHighlight);
            var center = this._editorWidth * 0.5;
            var base = 20;
            var tip = 9;
            var arrowWidth = 6;
            this._upHighlight.setAttribute("d", "M " + center + " " + tip + " L " + (center + arrowWidth) + " " + base + " L " + (center - arrowWidth) + " " + base + " z");
            this._downHighlight.setAttribute("d", "M " + center + " " + (this._editorHeight - tip) + " L " + (center + arrowWidth) + " " + (this._editorHeight - base) + " L " + (center - arrowWidth) + " " + (this._editorHeight - base) + " z");
            this.container.addEventListener("mousedown", this._whenMousePressed);
            document.addEventListener("mousemove", this._whenMouseMoved);
            document.addEventListener("mouseup", this._whenCursorReleased);
            this.container.addEventListener("mouseover", this._whenMouseOver);
            this.container.addEventListener("mouseout", this._whenMouseOut);
            this.container.addEventListener("touchstart", this._whenTouchPressed);
            this.container.addEventListener("touchmove", this._whenTouchMoved);
            this.container.addEventListener("touchend", this._whenCursorReleased);
            this.container.addEventListener("touchcancel", this._whenCursorReleased);
        }
        OctaveScrollBar.prototype._whenCursorMoved = function () {
            if (this._doc.song.getChannelIsDrum(this._doc.channel))
                return;
            if (this._dragging) {
                var currentOctave = this._doc.song.channels[this._doc.channel].octave;
                var continuingProspectiveChange = this._doc.lastChangeWas(this._change);
                var oldValue = continuingProspectiveChange ? this._change.oldValue : currentOctave;
                var octave = currentOctave;
                while (this._mouseY - this._dragStart < -this._octaveHeight * 0.5) {
                    if (octave < 4) {
                        octave++;
                        this._dragStart -= this._octaveHeight;
                    }
                    else {
                        break;
                    }
                }
                while (this._mouseY - this._dragStart > this._octaveHeight * 0.5) {
                    if (octave > 0) {
                        octave--;
                        this._dragStart += this._octaveHeight;
                    }
                    else {
                        break;
                    }
                }
                this._change = new beepbox.ChangeOctave(this._doc, oldValue, octave);
                this._doc.setProspectiveChange(this._change);
            }
            if (this._mouseOver)
                this._updatePreview();
        };
        OctaveScrollBar.prototype._updatePreview = function () {
            var showHighlight = this._mouseOver && !this._mouseDown;
            var showUpHighlight = false;
            var showDownHighlight = false;
            var showHandleHighlight = false;
            if (showHighlight) {
                if (this._mouseY < this._barBottom - this._barHeight) {
                    showUpHighlight = true;
                }
                else if (this._mouseY > this._barBottom) {
                    showDownHighlight = true;
                }
                else {
                    showHandleHighlight = true;
                }
            }
            this._upHighlight.style.visibility = showUpHighlight ? "inherit" : "hidden";
            this._downHighlight.style.visibility = showDownHighlight ? "inherit" : "hidden";
            this._handleHighlight.style.visibility = showHandleHighlight ? "inherit" : "hidden";
        };
        OctaveScrollBar.prototype._render = function () {
            this._svg.style.visibility = (this._doc.song.getChannelIsDrum(this._doc.channel)) ? "hidden" : "visible";
            if (this._renderedBarBottom != this._barBottom) {
                this._renderedBarBottom = this._barBottom;
                this._handle.setAttribute("y", "" + (this._barBottom - this._barHeight));
                this._handleHighlight.setAttribute("y", "" + (this._barBottom - this._barHeight));
            }
            this._updatePreview();
        };
        return OctaveScrollBar;
    }());
    beepbox.OctaveScrollBar = OctaveScrollBar;
})(beepbox || (beepbox = {}));
var beepbox;
(function (beepbox) {
    var loadedCount = 0;
    var finishedLoadingImages = false;
    function onLoaded() {
        loadedCount++;
        finishedLoadingImages = true;
    }
    var BlackKey = document.createElement("img");
    BlackKey.onload = onLoaded;
    BlackKey.src = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAANCAIAAABHKvtLAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyJpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuMC1jMDYwIDYxLjEzNDc3NywgMjAxMC8wMi8xMi0xNzozMjowMCAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENTNSBNYWNpbnRvc2giIHhtcE1NOkluc3RhbmNlSUQ9InhtcC5paWQ6NEU3RTM2RTg0NzBEMTFFMTgyMjBBREEyQTVGRDY5MjIiIHhtcE1NOkRvY3VtZW50SUQ9InhtcC5kaWQ6NEU3RTM2RTk0NzBEMTFFMTgyMjBBREEyQTVGRDY5MjIiPiA8eG1wTU06RGVyaXZlZEZyb20gc3RSZWY6aW5zdGFuY2VJRD0ieG1wLmlpZDozMzYxN0U3RDQ3MEQxMUUxODIyMEFEQTJBNUZENjkyMiIgc3RSZWY6ZG9jdW1lbnRJRD0ieG1wLmRpZDozMzYxN0U3RTQ3MEQxMUUxODIyMEFEQTJBNUZENjkyMiIvPiA8L3JkZjpEZXNjcmlwdGlvbj4gPC9yZGY6UkRGPiA8L3g6eG1wbWV0YT4gPD94cGFja2V0IGVuZD0iciI/PomGIaQAAABgSURBVHjaYpSWlmZhYWFmZgaSTExMQAYTGGAyIICRkRFIMhANWISFhdlggAUHANrBysoKNBfuCGKMvnjx4r59+xhp5wOg6UCSBM+SB0YtGLVgCFgAzDeMeOSGgAUAAQYAGgwJrOg8pdQAAAAASUVORK5CYII=";
    var BlackKeyDisabled = document.createElement("img");
    BlackKeyDisabled.onload = onLoaded;
    BlackKeyDisabled.src = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAANCAIAAABHKvtLAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyJpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuMC1jMDYwIDYxLjEzNDc3NywgMjAxMC8wMi8xMi0xNzozMjowMCAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENTNSBNYWNpbnRvc2giIHhtcE1NOkluc3RhbmNlSUQ9InhtcC5paWQ6NEU3RTM2RUM0NzBEMTFFMTgyMjBBREEyQTVGRDY5MjIiIHhtcE1NOkRvY3VtZW50SUQ9InhtcC5kaWQ6NEU3RTM2RUQ0NzBEMTFFMTgyMjBBREEyQTVGRDY5MjIiPiA8eG1wTU06RGVyaXZlZEZyb20gc3RSZWY6aW5zdGFuY2VJRD0ieG1wLmlpZDo0RTdFMzZFQTQ3MEQxMUUxODIyMEFEQTJBNUZENjkyMiIgc3RSZWY6ZG9jdW1lbnRJRD0ieG1wLmRpZDo0RTdFMzZFQjQ3MEQxMUUxODIyMEFEQTJBNUZENjkyMiIvPiA8L3JkZjpEZXNjcmlwdGlvbj4gPC9yZGY6UkRGPiA8L3g6eG1wbWV0YT4gPD94cGFja2V0IGVuZD0iciI/PhURscAAAAB1SURBVHja7NPBCoAgDAZgnaMX8Oj7P2KKldXPhiR4CwwCv4PInPvxoA0hMLNzDisRYUPCCiMucVallJzzJnaBih5pp2mw936puKEZ2qQ3MeUQmLiKGGNKCZ1IQr2fDnb0C8gMNgNmwA8Cnt/0Tv91vw64BRgALUuP70jrlrwAAAAASUVORK5CYII=";
    var WhiteKey = document.createElement("img");
    WhiteKey.onload = onLoaded;
    WhiteKey.src = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAANCAIAAABHKvtLAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyJpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuMC1jMDYwIDYxLjEzNDc3NywgMjAxMC8wMi8xMi0xNzozMjowMCAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENTNSBNYWNpbnRvc2giIHhtcE1NOkluc3RhbmNlSUQ9InhtcC5paWQ6MzM2MTdFNzc0NzBEMTFFMTgyMjBBREEyQTVGRDY5MjIiIHhtcE1NOkRvY3VtZW50SUQ9InhtcC5kaWQ6MzM2MTdFNzg0NzBEMTFFMTgyMjBBREEyQTVGRDY5MjIiPiA8eG1wTU06RGVyaXZlZEZyb20gc3RSZWY6aW5zdGFuY2VJRD0ieG1wLmlpZDozMzYxN0U3NTQ3MEQxMUUxODIyMEFEQTJBNUZENjkyMiIgc3RSZWY6ZG9jdW1lbnRJRD0ieG1wLmRpZDozMzYxN0U3NjQ3MEQxMUUxODIyMEFEQTJBNUZENjkyMiIvPiA8L3JkZjpEZXNjcmlwdGlvbj4gPC9yZGY6UkRGPiA8L3g6eG1wbWV0YT4gPD94cGFja2V0IGVuZD0iciI/PgBmMXoAAACTSURBVHja7JQ7CgMhGIT3920M2Hko7+RJPYWViE0myi5sEXAhKQL7FcP8PmawkWKMjx2llNb60MNIKY0xnPPphRDbMsJ7/xw458wAodZa6PRQ5GIF0RjlYCU655xSEqWU3ntrrdb63RcgHcq2H3MX3AV/UEAhBL7DBkTEzmAFuzSY44UC/BDHtU+8z539esFLgAEAkZ4XCDjZXPEAAAAASUVORK5CYII=";
    var WhiteKeyDisabled = document.createElement("img");
    WhiteKeyDisabled.onload = onLoaded;
    WhiteKeyDisabled.src = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAANCAIAAABHKvtLAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyJpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuMC1jMDYwIDYxLjEzNDc3NywgMjAxMC8wMi8xMi0xNzozMjowMCAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENTNSBNYWNpbnRvc2giIHhtcE1NOkluc3RhbmNlSUQ9InhtcC5paWQ6MzM2MTdFN0I0NzBEMTFFMTgyMjBBREEyQTVGRDY5MjIiIHhtcE1NOkRvY3VtZW50SUQ9InhtcC5kaWQ6MzM2MTdFN0M0NzBEMTFFMTgyMjBBREEyQTVGRDY5MjIiPiA8eG1wTU06RGVyaXZlZEZyb20gc3RSZWY6aW5zdGFuY2VJRD0ieG1wLmlpZDozMzYxN0U3OTQ3MEQxMUUxODIyMEFEQTJBNUZENjkyMiIgc3RSZWY6ZG9jdW1lbnRJRD0ieG1wLmRpZDozMzYxN0U3QTQ3MEQxMUUxODIyMEFEQTJBNUZENjkyMiIvPiA8L3JkZjpEZXNjcmlwdGlvbj4gPC9yZGY6UkRGPiA8L3g6eG1wbWV0YT4gPD94cGFja2V0IGVuZD0iciI/PlZjoH4AAADHSURBVHja7JTNDoMgEIRBGq21iTcfyvd/DeNvJBYBp7uFEE+99NDE70AMMDPLYZRt2z4CeZ4XRcFrRkgphRD7vnvvX8RGdF03DEPf99M0LcuitcamMcZa6wkRuNV1/SSqqroTcC/LEu5KKQ6AEhq21oRzDl5bAME8DUjd3wHjOELPyu9fgNnneV7XNQ6OyNPsTCZ+zBVwBfxBgGyaRgViuWIt+ZIPuAAaZwh00BKxaKeuSfwhUsfI55g+WOMT2DEl3jm94BBgAAtY6T6d3wTNAAAAAElFTkSuQmCC";
    var Drum = document.createElement("img");
    Drum.onload = onLoaded;
    Drum.src = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAArCAIAAACW3x1gAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAA2ZpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuMC1jMDYwIDYxLjEzNDc3NywgMjAxMC8wMi8xMi0xNzozMjowMCAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wTU09Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9tbS8iIHhtbG5zOnN0UmVmPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvc1R5cGUvUmVzb3VyY2VSZWYjIiB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iIHhtcE1NOk9yaWdpbmFsRG9jdW1lbnRJRD0ieG1wLmRpZDowMTgwMTE3NDA3MjA2ODExOUJCOEEzOUJCMkI3MTdFNCIgeG1wTU06RG9jdW1lbnRJRD0ieG1wLmRpZDo5NzVEOTA1QzQ5MjMxMUUxOTM3RDhDNEI4QkIxQkFCNSIgeG1wTU06SW5zdGFuY2VJRD0ieG1wLmlpZDo5NzVEOTA1QjQ5MjMxMUUxOTM3RDhDNEI4QkIxQkFCNSIgeG1wOkNyZWF0b3JUb29sPSJBZG9iZSBQaG90b3Nob3AgQ1M1IE1hY2ludG9zaCI+IDx4bXBNTTpEZXJpdmVkRnJvbSBzdFJlZjppbnN0YW5jZUlEPSJ4bXAuaWlkOjAxODAxMTc0MDcyMDY4MTE5QkI4QTM5QkIyQjcxN0U0IiBzdFJlZjpkb2N1bWVudElEPSJ4bXAuZGlkOjAxODAxMTc0MDcyMDY4MTE5QkI4QTM5QkIyQjcxN0U0Ii8+IDwvcmRmOkRlc2NyaXB0aW9uPiA8L3JkZjpSREY+IDwveDp4bXBtZXRhPiA8P3hwYWNrZXQgZW5kPSJyIj8+dtFK5QAACbRJREFUeNrcV0lsG9cZnnmzcJdIcRHFRZtly5IVSVYSOcriNY7jqHHTBE2bJkCRNijQQ9re2kOBAj30kByKAm1PvQVF0RYIkLRpkiZuLMqyLVm7bGvlIpKiuHOGyww52+ubIbXYCYLk2P4ccobz3nzf+9f3D4b9rwv+5cOXL5x48crDT54b8Pr6jOZWQJoxKIi13WJ+Oziz+Z/r6x9N3AvMhb42gcWkf/P1Mz/40fkWz2iuAAsFrljkOK5crVYwTNTrcaMRNDURNhtl1Slrn9x55x+zf/5ooVIVvhLBq1ce+eXPLpt6RnZ22EIBmk1Oi8VuMFoMBgNF6RUMF2tcrVqscPlSKcGV4zaC85qNd25u/PHdm/+8tf5lBBRJ/Oan49/98cVEDmcYg9PZ09LSrjcYSRzHcAAxDGBQQfMgJiuyAiFUFMSUT23mtu9YxYxVgX/6YPa3796QZGUfk9i/Mhvo3//8W99443wwKtB0T1fXqM3m0en0iJUgSIIkKYoiKBL9A4QqAEcCSFJnbnI3uboqIpHP7D7T73WYDbfW4+IexwHB22+OX3zpsfAu5nI96vUM0gY9wqN0JEJG2AAATFs7hlABrhKgk3qJQwwCgrY4/ZiuaSceO+VvslkM11Yi9xG8+dLj33/tdDgLPB1POB09JE0RAOESFEEiVOWQaIZBPxCtX2MBUKVRMAXTWZyk2RaPRp440lIV5PngboPgZE/br16/kBJwR9dTTtdxQkejBzUOoHxO4P2CCAgcV+8iDSHUWWyA0ieDa4N++1J4N8VUVMVfvTCEm/S0vc/Z1g9IoKIjU6PHkCBvyrJ63hMJffZ+tQkyDnDVPThR18beM6zvHmky0i8/OYDAwTGvfXz0WKoCXL5BFVv1p0qgmULRMJTD0HVKWdqj1EZVS2meV+MNU1zHTmZE6tLJ7qOeFvLMQ504TRkt3SarC00j1aOBrhmksUxFu4PuNxytAqHAhZj2Bw2h6Kprgym40d5m9PXqmbXTA53gzIA/V+KaXZ3aTBSCuKrpniDMOo+yv/bGr3qCyv46VE8jDVCmIBT0t7mtK1fkn+rzgpPdrWy5arS2qloCXHMWdp8flYatZGVPm7rd7nc6psUV0BgQgsnhYbnacGcr8DltXE3UGZsxFNA4JAgcUzU/RHDoWsOFh2Pp8ES0OnX9anWAtNnK1wSf00paTIZG0UAhV19+4/uAHNCqc2Hj3n2CDCxDWRvU1FCLJuB43qijahyLiFG2wEZ5wr+gLOKac7USUX/+gVlQ1pahsdZKjEFHcxwPWIZpNus5JgUhPICqY+1B4XvAQItHrUjsDR6aiRRT9gAq2USzUccyLNhNpe0WI5uOYFrEoAPDDqHvoSJMcJ8Q+7f3J6rxIGP1hbKJsN1iQOAgtJNutZu5bKjEpmU1HNXQeABcKzsNIfeKqVbv8H0OLbCgamQIuXySS6y7rOZQIgO2M2WsxrealHRsSdEiW5Kkfez6uV47Dyg0+ANzgUbqIAfXDZBZn3eSoiJUorkyoMzW9bW1Tk+LkFtNJ1YQPApESZFAAxqAQ9jEYZK6aKPItJJaPdRPdmupGlnocDWvra4hcHCi7/jdxXtihe3yWFKx2+lsUJZESVKLxAH2F1A0wNEAsrooC5Ko5ggb38wsBbps+mqZXVxZHeg7Dvq7vYlo+c78vN9t7fSARPxmMrmuCKIgSfUqRnwxeEOQZQRBRnpDWcxur6QWPm3XcT67eX5uLrHD93V5SSOsWk2ttwMLNp9rePwiyZbC0Vs8X/R5T+gNFog41F2SOEjdevRrXhVFUS2sklTjSsmt21xw7ogZ8za3XEcyvdzS3KOXeeInlx9iC3IikqkKCZ2ROjr6kKXJVCjsRqMx9CRBGpHBkWXrW1g9nRG0pNpRRGav8Gw6thy995mhuHW81eSxmK4HpiYnrzNFU9+xXp/XQLz8aIel2RqeTZZrNVHYJYDi7u7s6OqkaaJQSEajYYbJ8xwvSgJaLDI3YuW5EsNkc7lIYmchEbtJC9tHHFS/z6GUuclrE4GJwG6BBpJ1bKy3WGXJ5WDs+WfOOX0t+UgmaqieOM1uXP2Xb/iUv+Nhv7+DYYRstlIoZLYj259rvMg2D+mwuq2ohjL81vTC8tQ0hyk7eRpyTd52W09P6/uBKXLmXuSlK7D3VM+tSAZugv7Lb3349otCOe3OxW3+oWb7gNXqwDAdhqHdX0I1BsNQ+8ZjWBXDOHQh88XY3EpoZml1ZjGdLP/ivX9cffcVtKcPDXdStHJ7bZtcjGS2Ntb7xwbDs2F2K4UX37rzMcOOQoN5RSpuNbnnjPYjlMkP6DaIm1AfpDZdQqlWSVVyMSYeTm5sJtZCHMOHd2q7O2T449+hXdPvd5wc7tpYX12OZslIEd6YWe4a7h+8PHT9D5/GVxhXEiTey2eC1aOnnINnUUuUx2vLtIGUqlKVq/FlgWf5ClstM1yF4Zk0F4zUIiGhkiLNgNxeLaDUfvzxXkAIgfmV7TJGcBJGSJUeFz36wllBlP/+6+suknQSlCGthGfyK7PpWKhcydckUYtRHBN5KZ/m4qHS+jK7OFNYmC6mNyRzlTIRSDlseT537uzApUvDk4HAX29s3C2olsUWk9K/r06jPBj94WmlJu68v4RuNpGEkzLCNJbbza98mL4qiowsj35vOLZVWL8VpnFcDwA6/AQt62FVwQSo7iVjj/WOP/fwzVs3PpicvVuAjcarJKhrawM5i8My+NoFqSxVtlKEApE1DQA4KKqd1nXrdb1Gw/jf/jL2/KPyO5+00bSVotCoorkexS9OkWPnB158eWxpbnYiEPgsrmyyh1rHGCOhztkF07SJOHrlrMnTVo3nFKaCdmgSRxs56kXU3a79lZ3NTz/JLORFXkG4yGwSVNFt7Y6nvzM2dubo7NTUxLVrEzH5Zgo+2PyGswJqarwUq0gV92ivf/wSbbFIGRayZVSP1WqM47pHbKH5TC3MCRW5TmBpt498e/TZN85RRHn6s4mF2flAVJ5Mavb6/K6K2pZvPuZ45ZK364jTfXzE2j5EQn95LsyvbJXWQ+VofDIci4vC00d9lMdlOuZ2DHndI242EgqjPJheiCdLE1vVqYSswC99wznVZ33hvOfKxQ5Ts6HJ3X0oD8xaHlQVoVCrJCq5OLMTSm5sJO4FObY6tVqcCnJrWfkrvaPpaXBxzP3sOd9zT3fYXSa9kab0lFhFVRPlAepAahUWJUEV5UE2XZ5azE6vl+YivCDDr/2WOdzfcmqkdWTINXDC4XXpzTqiWq7F42wwyKxuFO5sMneDxc0Ej/0/y38FGACBHjS0mkQ17AAAAABJRU5ErkJggg==";
    var Piano = (function () {
        function Piano(_doc) {
            var _this = this;
            this._doc = _doc;
            this._canvas = beepbox.html.canvas({ width: "32", height: "481", style: "width: 100%; height: 100%;" });
            this._preview = beepbox.html.canvas({ width: "32", height: "40" });
            this.container = beepbox.html.div({ style: "width: 32px; height: 100%; overflow:hidden; position: relative; flex-shrink: 0; touch-action: none;" }, [
                this._canvas,
                this._preview,
            ]);
            this._graphics = this._canvas.getContext("2d");
            this._previewGraphics = this._preview.getContext("2d");
            this._editorWidth = 32;
            this._editorHeight = 481;
            this._mouseX = 0;
            this._mouseY = 0;
            this._mouseDown = false;
            this._mouseOver = false;
            this._renderedScale = -1;
            this._renderedDrums = false;
            this._renderedKey = -1;
            this._whenMouseOver = function (event) {
                if (_this._mouseOver)
                    return;
                _this._mouseOver = true;
                _this._updatePreview();
            };
            this._whenMouseOut = function (event) {
                if (!_this._mouseOver)
                    return;
                _this._mouseOver = false;
                _this._updatePreview();
            };
            this._whenMousePressed = function (event) {
                event.preventDefault();
                _this._mouseDown = true;
                var boundingRect = _this._canvas.getBoundingClientRect();
                _this._mouseX = (event.clientX || event.pageX) - boundingRect.left;
                _this._mouseY = ((event.clientY || event.pageY) - boundingRect.top) * _this._editorHeight / (boundingRect.bottom - boundingRect.top);
                if (isNaN(_this._mouseY))
                    _this._mouseY = 0;
                _this._doc.synth.pianoPressed = true;
                _this._updatePreview();
            };
            this._whenMouseMoved = function (event) {
                var boundingRect = _this._canvas.getBoundingClientRect();
                _this._mouseX = (event.clientX || event.pageX) - boundingRect.left;
                _this._mouseY = ((event.clientY || event.pageY) - boundingRect.top) * _this._editorHeight / (boundingRect.bottom - boundingRect.top);
                if (isNaN(_this._mouseY))
                    _this._mouseY = 0;
                _this._updateCursorPitch();
                _this._doc.synth.pianoPitch[0] = _this._cursorPitch + _this._doc.song.channels[_this._doc.channel].octave * 12;
                _this._updatePreview();
            };
            this._whenMouseReleased = function (event) {
                _this._mouseDown = false;
                _this._doc.synth.pianoPressed = false;
                _this._updatePreview();
            };
            this._whenTouchPressed = function (event) {
                event.preventDefault();
                _this._mouseDown = true;
                var boundingRect = _this._canvas.getBoundingClientRect();
                _this._mouseX = event.touches[0].clientX - boundingRect.left;
                _this._mouseY = (event.touches[0].clientY - boundingRect.top) * _this._editorHeight / (boundingRect.bottom - boundingRect.top);
                if (isNaN(_this._mouseY))
                    _this._mouseY = 0;
                _this._updateCursorPitch();
                _this._doc.synth.pianoPressed = true;
                _this._doc.synth.pianoPitch[0] = _this._cursorPitch + _this._doc.song.channels[_this._doc.channel].octave * 12;
            };
            this._whenTouchMoved = function (event) {
                event.preventDefault();
                var boundingRect = _this._canvas.getBoundingClientRect();
                _this._mouseX = event.touches[0].clientX - boundingRect.left;
                _this._mouseY = (event.touches[0].clientY - boundingRect.top) * _this._editorHeight / (boundingRect.bottom - boundingRect.top);
                if (isNaN(_this._mouseY))
                    _this._mouseY = 0;
                _this._updateCursorPitch();
                _this._doc.synth.pianoPitch[0] = _this._cursorPitch + _this._doc.song.channels[_this._doc.channel].octave * 12;
            };
            this._whenTouchReleased = function (event) {
                event.preventDefault();
                _this._doc.synth.pianoPressed = false;
            };
            this._documentChanged = function () {
                var isDrum = _this._doc.song.getChannelIsDrum(_this._doc.channel);
                _this._pitchHeight = isDrum ? 40 : 13;
                _this._pitchCount = isDrum ? beepbox.Config.drumCount : beepbox.Config.pitchCount;
                _this._updateCursorPitch();
                _this._doc.synth.pianoPitch[0] = _this._cursorPitch + _this._doc.song.channels[_this._doc.channel].octave * 12;
                _this._doc.synth.pianoChannel = _this._doc.channel;
                _this._render();
            };
            this._render = function () {
                if (!finishedLoadingImages) {
                    window.requestAnimationFrame(_this._render);
                    return;
                }
                if (!_this._doc.showLetters)
                    return;
                var isDrum = _this._doc.song.getChannelIsDrum(_this._doc.channel);
                if (_this._renderedScale == _this._doc.song.scale && _this._renderedKey == _this._doc.song.key && _this._renderedDrums == isDrum)
                    return;
                _this._renderedScale = _this._doc.song.scale;
                _this._renderedKey = _this._doc.song.key;
                _this._renderedDrums = isDrum;
                _this._graphics.clearRect(0, 0, _this._editorWidth, _this._editorHeight);
                var key;
                for (var j = 0; j < _this._pitchCount; j++) {
                    var pitchNameIndex = (j + beepbox.Config.keyTransposes[_this._doc.song.key]) % 12;
                    if (isDrum) {
                        key = Drum;
                        var scale = 1.0 - (j / _this._pitchCount) * 0.35;
                        var offset = (1.0 - scale) * 0.5;
                        var x = key.width * offset;
                        var y = key.height * offset + _this._pitchHeight * (_this._pitchCount - j - 1);
                        var w = key.width * scale;
                        var h = key.height * scale;
                        _this._graphics.drawImage(key, x, y, w, h);
                        var brightness = 1.0 + ((j - _this._pitchCount / 2.0) / _this._pitchCount) * 0.5;
                        var imageData = _this._graphics.getImageData(x, y, w, h);
                        var data = imageData.data;
                        for (var i = 0; i < data.length; i += 4) {
                            data[i + 0] *= brightness;
                            data[i + 1] *= brightness;
                            data[i + 2] *= brightness;
                        }
                        _this._graphics.putImageData(imageData, x, y);
                    }
                    else if (!beepbox.Config.scaleFlags[_this._doc.song.scale][j % 12]) {
                        key = beepbox.Config.pianoScaleFlags[pitchNameIndex] ? WhiteKeyDisabled : BlackKeyDisabled;
                        _this._graphics.drawImage(key, 0, _this._pitchHeight * (_this._pitchCount - j - 1));
                    }
                    else {
                        var text = beepbox.Config.pitchNames[pitchNameIndex];
                        if (text == null) {
                            var shiftDir = beepbox.Config.blackKeyNameParents[j % 12];
                            text = beepbox.Config.pitchNames[(pitchNameIndex + 12 + shiftDir) % 12];
                            if (shiftDir == 1) {
                                text += "♭";
                            }
                            else if (shiftDir == -1) {
                                text += "♯";
                            }
                        }
                        var textColor = beepbox.Config.pianoScaleFlags[pitchNameIndex] ? "#000000" : "#ffffff";
                        key = beepbox.Config.pianoScaleFlags[pitchNameIndex] ? WhiteKey : BlackKey;
                        _this._graphics.drawImage(key, 0, _this._pitchHeight * (_this._pitchCount - j - 1));
                        _this._graphics.font = "bold 11px sans-serif";
                        _this._graphics.fillStyle = textColor;
                        _this._graphics.fillText(text, 15, _this._pitchHeight * (_this._pitchCount - j) - 3);
                    }
                }
                _this._updatePreview();
            };
            this._doc.notifier.watch(this._documentChanged);
            this._documentChanged();
            this.container.addEventListener("mousedown", this._whenMousePressed);
            document.addEventListener("mousemove", this._whenMouseMoved);
            document.addEventListener("mouseup", this._whenMouseReleased);
            this.container.addEventListener("mouseover", this._whenMouseOver);
            this.container.addEventListener("mouseout", this._whenMouseOut);
            this.container.addEventListener("touchstart", this._whenTouchPressed);
            this.container.addEventListener("touchmove", this._whenTouchMoved);
            this.container.addEventListener("touchend", this._whenTouchReleased);
            this.container.addEventListener("touchcancel", this._whenTouchReleased);
        }
        Piano.prototype._updateCursorPitch = function () {
            var scale = beepbox.Config.scaleFlags[this._doc.song.scale];
            var mousePitch = Math.max(0, Math.min(this._pitchCount - 1, this._pitchCount - (this._mouseY / this._pitchHeight)));
            if (scale[Math.floor(mousePitch) % 12] || this._doc.song.getChannelIsDrum(this._doc.channel)) {
                this._cursorPitch = Math.floor(mousePitch);
            }
            else {
                var topPitch = Math.floor(mousePitch) + 1;
                var bottomPitch = Math.floor(mousePitch) - 1;
                while (!scale[topPitch % 12]) {
                    topPitch++;
                }
                while (!scale[(bottomPitch) % 12]) {
                    bottomPitch--;
                }
                var topRange = topPitch;
                var bottomRange = bottomPitch + 1;
                if (topPitch % 12 == 0 || topPitch % 12 == 7) {
                    topRange -= 0.5;
                }
                if (bottomPitch % 12 == 0 || bottomPitch % 12 == 7) {
                    bottomRange += 0.5;
                }
                this._cursorPitch = mousePitch - bottomRange > topRange - mousePitch ? topPitch : bottomPitch;
            }
        };
        Piano.prototype._updatePreview = function () {
            this._preview.style.visibility = (!this._mouseOver || this._mouseDown) ? "hidden" : "visible";
            if (!this._mouseOver || this._mouseDown)
                return;
            this._previewGraphics.clearRect(0, 0, 32, 40);
            this._preview.style.left = "0px";
            this._preview.style.top = this._pitchHeight * (this._pitchCount - this._cursorPitch - 1) + "px";
            this._previewGraphics.lineWidth = 2;
            this._previewGraphics.strokeStyle = "#ffffff";
            this._previewGraphics.strokeRect(1, 1, this._editorWidth - 2, this._pitchHeight - 2);
        };
        return Piano;
    }());
    beepbox.Piano = Piano;
})(beepbox || (beepbox = {}));
var beepbox;
(function (beepbox) {
    var button = beepbox.html.button, div = beepbox.html.div, span = beepbox.html.span, input = beepbox.html.input, br = beepbox.html.br, text = beepbox.html.text;
    var SongDurationPrompt = (function () {
        function SongDurationPrompt(_doc, _songEditor) {
            var _this = this;
            this._doc = _doc;
            this._songEditor = _songEditor;
            this._beatsStepper = input({ style: "width: 3em; margin-left: 1em;", type: "number", step: "1" });
            this._barsStepper = input({ style: "width: 3em; margin-left: 1em;", type: "number", step: "1" });
            this._patternsStepper = input({ style: "width: 3em; margin-left: 1em;", type: "number", step: "1" });
            this._instrumentsStepper = input({ style: "width: 3em; margin-left: 1em;", type: "number", step: "1" });
            this._pitchChannelStepper = input({ style: "width: 3em; margin-left: 1em;", type: "number", step: "1" });
            this._drumChannelStepper = input({ style: "width: 3em; margin-left: 1em;", type: "number", step: "1" });
            this._okayButton = button({ style: "width:45%;" }, [text("Okay")]);
            this._cancelButton = button({ style: "width:45%;" }, [text("Cancel")]);
            this.container = div({ className: "prompt", style: "width: 250px;" }, [
                div({ style: "font-size: 2em" }, [text("Custom Song Size")]),
                div({ style: "display: flex; flex-direction: row; align-items: center; height: 2em; justify-content: flex-end;" }, [
                    div({ style: "text-align: right;" }, [
                        text("Beats per bar:"),
                        br(),
                        span({ style: "font-size: smaller; color: #888888;" }, [text("(Multiples of 3 or 4 are recommended)")]),
                    ]),
                    this._beatsStepper,
                ]),
                div({ style: "display: flex; flex-direction: row; align-items: center; height: 2em; justify-content: flex-end;" }, [
                    div({ style: "display: inline-block; text-align: right;" }, [
                        text("Bars per song:"),
                        br(),
                        span({ style: "font-size: smaller; color: #888888;" }, [text("(Multiples of 2 or 4 are recommended)")]),
                    ]),
                    this._barsStepper,
                ]),
                div({ style: "display: flex; flex-direction: row; align-items: center; height: 2em; justify-content: flex-end;" }, [
                    text("Patterns per channel:"),
                    this._patternsStepper,
                ]),
                div({ style: "display: flex; flex-direction: row; align-items: center; height: 2em; justify-content: flex-end;" }, [
                    text("Instruments per channel:"),
                    this._instrumentsStepper,
                ]),
                div({ style: "display: flex; flex-direction: row; align-items: center; height: 2em; justify-content: flex-end;" }, [
                    text("Number of pitch channels:"),
                    this._pitchChannelStepper,
                ]),
                div({ style: "display: flex; flex-direction: row; align-items: center; height: 2em; justify-content: flex-end;" }, [
                    text("Number of drum channels:"),
                    this._drumChannelStepper,
                ]),
                div({ style: "display: flex; flex-direction: row; justify-content: space-between;" }, [
                    this._okayButton,
                    this._cancelButton,
                ]),
            ]);
            this._close = function () {
                _this._doc.undo();
            };
            this.cleanUp = function () {
                _this._okayButton.removeEventListener("click", _this._saveChanges);
                _this._cancelButton.removeEventListener("click", _this._close);
                _this._beatsStepper.removeEventListener("keypress", SongDurationPrompt._validateKey);
                _this._barsStepper.removeEventListener("keypress", SongDurationPrompt._validateKey);
                _this._patternsStepper.removeEventListener("keypress", SongDurationPrompt._validateKey);
                _this._instrumentsStepper.removeEventListener("keypress", SongDurationPrompt._validateKey);
                _this._pitchChannelStepper.removeEventListener("keypress", SongDurationPrompt._validateKey);
                _this._drumChannelStepper.removeEventListener("keypress", SongDurationPrompt._validateKey);
                _this._beatsStepper.removeEventListener("blur", SongDurationPrompt._validateNumber);
                _this._barsStepper.removeEventListener("blur", SongDurationPrompt._validateNumber);
                _this._patternsStepper.removeEventListener("blur", SongDurationPrompt._validateNumber);
                _this._instrumentsStepper.removeEventListener("blur", SongDurationPrompt._validateNumber);
                _this._pitchChannelStepper.removeEventListener("blur", SongDurationPrompt._validateNumber);
                _this._drumChannelStepper.removeEventListener("blur", SongDurationPrompt._validateNumber);
            };
            this._saveChanges = function () {
                var group = new beepbox.ChangeGroup();
                group.append(new beepbox.ChangeBeatsPerBar(_this._doc, SongDurationPrompt._validate(_this._beatsStepper)));
                group.append(new beepbox.ChangeBarCount(_this._doc, SongDurationPrompt._validate(_this._barsStepper)));
                group.append(new beepbox.ChangePatternsPerChannel(_this._doc, SongDurationPrompt._validate(_this._patternsStepper)));
                group.append(new beepbox.ChangeInstrumentsPerChannel(_this._doc, SongDurationPrompt._validate(_this._instrumentsStepper)));
                group.append(new beepbox.ChangeChannelCount(_this._doc, SongDurationPrompt._validate(_this._pitchChannelStepper), SongDurationPrompt._validate(_this._drumChannelStepper)));
                _this._doc.prompt = null;
                _this._doc.record(group, true);
            };
            this._beatsStepper.value = this._doc.song.beatsPerBar + "";
            this._beatsStepper.min = beepbox.Config.beatsPerBarMin + "";
            this._beatsStepper.max = beepbox.Config.beatsPerBarMax + "";
            this._barsStepper.value = this._doc.song.barCount + "";
            this._barsStepper.min = beepbox.Config.barCountMin + "";
            this._barsStepper.max = beepbox.Config.barCountMax + "";
            this._patternsStepper.value = this._doc.song.patternsPerChannel + "";
            this._patternsStepper.min = beepbox.Config.patternsPerChannelMin + "";
            this._patternsStepper.max = beepbox.Config.patternsPerChannelMax + "";
            this._instrumentsStepper.value = this._doc.song.instrumentsPerChannel + "";
            this._instrumentsStepper.min = beepbox.Config.instrumentsPerChannelMin + "";
            this._instrumentsStepper.max = beepbox.Config.instrumentsPerChannelMax + "";
            this._pitchChannelStepper.value = this._doc.song.pitchChannelCount + "";
            this._pitchChannelStepper.min = beepbox.Config.pitchChannelCountMin + "";
            this._pitchChannelStepper.max = beepbox.Config.pitchChannelCountMax + "";
            this._drumChannelStepper.value = this._doc.song.drumChannelCount + "";
            this._drumChannelStepper.min = beepbox.Config.drumChannelCountMin + "";
            this._drumChannelStepper.max = beepbox.Config.drumChannelCountMax + "";
            this._okayButton.addEventListener("click", this._saveChanges);
            this._cancelButton.addEventListener("click", this._close);
            this._beatsStepper.addEventListener("keypress", SongDurationPrompt._validateKey);
            this._barsStepper.addEventListener("keypress", SongDurationPrompt._validateKey);
            this._patternsStepper.addEventListener("keypress", SongDurationPrompt._validateKey);
            this._instrumentsStepper.addEventListener("keypress", SongDurationPrompt._validateKey);
            this._pitchChannelStepper.addEventListener("keypress", SongDurationPrompt._validateKey);
            this._drumChannelStepper.addEventListener("keypress", SongDurationPrompt._validateKey);
            this._beatsStepper.addEventListener("blur", SongDurationPrompt._validateNumber);
            this._barsStepper.addEventListener("blur", SongDurationPrompt._validateNumber);
            this._patternsStepper.addEventListener("blur", SongDurationPrompt._validateNumber);
            this._instrumentsStepper.addEventListener("blur", SongDurationPrompt._validateNumber);
            this._pitchChannelStepper.addEventListener("blur", SongDurationPrompt._validateNumber);
            this._drumChannelStepper.addEventListener("blur", SongDurationPrompt._validateNumber);
        }
        SongDurationPrompt._validateKey = function (event) {
            var charCode = (event.which) ? event.which : event.keyCode;
            if (charCode != 46 && charCode > 31 && (charCode < 48 || charCode > 57)) {
                event.preventDefault();
                return true;
            }
            return false;
        };
        SongDurationPrompt._validateNumber = function (event) {
            var input = event.target;
            input.value = Math.floor(Math.max(Number(input.min), Math.min(Number(input.max), Number(input.value)))) + "";
        };
        SongDurationPrompt._validate = function (input) {
            return Math.floor(Number(input.value));
        };
        return SongDurationPrompt;
    }());
    beepbox.SongDurationPrompt = SongDurationPrompt;
})(beepbox || (beepbox = {}));
var beepbox;
(function (beepbox) {
    var button = beepbox.html.button, div = beepbox.html.div, input = beepbox.html.input, text = beepbox.html.text;
    function lerp(low, high, t) {
        return low + t * (high - low);
    }
    function save(blob, name) {
        if (navigator.msSaveOrOpenBlob) {
            navigator.msSaveOrOpenBlob(blob, name);
            return;
        }
        var anchor = document.createElement("a");
        if (anchor.download != undefined) {
            var url_1 = URL.createObjectURL(blob);
            setTimeout(function () { URL.revokeObjectURL(url_1); }, 60000);
            anchor.href = url_1;
            anchor.download = name;
            setTimeout(function () { anchor.dispatchEvent(new MouseEvent("click")); }, 0);
        }
        else if (navigator.vendor.indexOf("Apple") > -1) {
            var reader = new FileReader();
            reader.onloadend = function () {
                console.log(reader.result);
                var url = reader.result.replace(/^data:[^;]*;/, 'data:attachment/file;');
                if (!window.open(url, "_blank"))
                    window.location.href = url;
            };
            reader.readAsDataURL(blob);
        }
        else {
            var url_2 = URL.createObjectURL(blob);
            setTimeout(function () { URL.revokeObjectURL(url_2); }, 60000);
            if (!window.open(url_2, "_blank"))
                window.location.href = url_2;
        }
    }
    if (!ArrayBuffer.transfer) {
        ArrayBuffer.transfer = function (source, length) {
            var dest = new ArrayBuffer(length);
            if (!(source instanceof ArrayBuffer) || !(dest instanceof ArrayBuffer)) {
                throw new TypeError('Source and destination must be ArrayBuffer instances');
            }
            var nextOffset = 0;
            var leftBytes = Math.min(source.byteLength, dest.byteLength);
            var wordSizes = [8, 4, 2, 1];
            for (var _i = 0, wordSizes_1 = wordSizes; _i < wordSizes_1.length; _i++) {
                var wordSize = wordSizes_1[_i];
                if (leftBytes >= wordSize) {
                    var done = transferWith(wordSize, source, dest, nextOffset, leftBytes);
                    nextOffset = done.nextOffset;
                    leftBytes = done.leftBytes;
                }
            }
            return dest;
            function transferWith(wordSize, source, dest, nextOffset, leftBytes) {
                var ViewClass = Uint8Array;
                switch (wordSize) {
                    case 8:
                        ViewClass = Float64Array;
                        break;
                    case 4:
                        ViewClass = Float32Array;
                        break;
                    case 2:
                        ViewClass = Uint16Array;
                        break;
                    case 1:
                        ViewClass = Uint8Array;
                        break;
                    default:
                        ViewClass = Uint8Array;
                        break;
                }
                var view_source = new ViewClass(source, nextOffset, (leftBytes / wordSize) | 0);
                var view_dest = new ViewClass(dest, nextOffset, (leftBytes / wordSize) | 0);
                for (var i = 0; i < view_dest.length; i++) {
                    view_dest[i] = view_source[i];
                }
                return {
                    nextOffset: view_source.byteOffset + view_source.byteLength,
                    leftBytes: leftBytes - view_dest.length * wordSize,
                };
            }
        };
    }
    var ExportPrompt = (function () {
        function ExportPrompt(_doc, _songEditor) {
            var _this = this;
            this._doc = _doc;
            this._songEditor = _songEditor;
            this._fileName = input({ type: "text", style: "width: 10em;", value: "BeepBox-Song", maxlength: 250 });
            this._enableIntro = input({ type: "checkbox" });
            this._loopDropDown = input({ style: "width: 2em;", type: "number", min: "1", max: "4", step: "1" });
            this._enableOutro = input({ type: "checkbox" });
            this._exportWavButton = button({}, [text("Export to .wav file")]);
            this._exportMidiButton = button({}, [text("Export to .midi file")]);
            this._exportJsonButton = button({}, [text("Export to .json file")]);
            this._cancelButton = button({}, [text("Cancel")]);
            this.container = div({ className: "prompt", style: "width: 200px;" }, [
                div({ style: "font-size: 2em" }, [text("Export Options")]),
                div({ style: "display: flex; flex-direction: row; align-items: center; justify-content: space-between;" }, [
                    text("File name:"),
                    this._fileName,
                ]),
                div({ style: "display: table; width: 100%;" }, [
                    div({ style: "display: table-row;" }, [
                        div({ style: "display: table-cell;" }, [text("Intro:")]),
                        div({ style: "display: table-cell;" }, [text("Loop Count:")]),
                        div({ style: "display: table-cell;" }, [text("Outro:")]),
                    ]),
                    div({ style: "display: table-row;" }, [
                        div({ style: "display: table-cell; vertical-align: middle;" }, [this._enableIntro]),
                        div({ style: "display: table-cell; vertical-align: middle;" }, [this._loopDropDown]),
                        div({ style: "display: table-cell; vertical-align: middle;" }, [this._enableOutro]),
                    ]),
                ]),
                this._exportWavButton,
                this._exportMidiButton,
                this._exportJsonButton,
                this._cancelButton,
            ]);
            this._close = function () {
                _this._doc.undo();
            };
            this.cleanUp = function () {
                _this._fileName.removeEventListener("input", ExportPrompt._validateFileName);
                _this._loopDropDown.removeEventListener("blur", ExportPrompt._validateNumber);
                _this._exportWavButton.removeEventListener("click", _this._whenExportToWav);
                _this._exportMidiButton.removeEventListener("click", _this._whenExportToMidi);
                _this._exportJsonButton.removeEventListener("click", _this._whenExportToJson);
                _this._cancelButton.removeEventListener("click", _this._close);
            };
            this._whenExportToWav = function () {
                var synth = new beepbox.Synth(_this._doc.song);
                synth.enableIntro = _this._enableIntro.checked;
                synth.enableOutro = _this._enableOutro.checked;
                synth.loopCount = Number(_this._loopDropDown.value);
                if (!synth.enableIntro) {
                    for (var introIter = 0; introIter < _this._doc.song.loopStart; introIter++) {
                        synth.nextBar();
                    }
                }
                var sampleFrames = synth.totalSamples;
                var recordedSamples = new Float32Array(sampleFrames);
                synth.synthesize(recordedSamples, sampleFrames);
                var srcChannelCount = 1;
                var wavChannelCount = 1;
                var sampleRate = 44100;
                var bytesPerSample = 2;
                var bitsPerSample = 8 * bytesPerSample;
                var sampleCount = wavChannelCount * sampleFrames;
                var totalFileSize = 44 + sampleCount * bytesPerSample;
                var index = 0;
                var arrayBuffer = new ArrayBuffer(totalFileSize);
                var data = new DataView(arrayBuffer);
                data.setUint32(index, 0x52494646, false);
                index += 4;
                data.setUint32(index, 36 + sampleCount * bytesPerSample, true);
                index += 4;
                data.setUint32(index, 0x57415645, false);
                index += 4;
                data.setUint32(index, 0x666D7420, false);
                index += 4;
                data.setUint32(index, 0x00000010, true);
                index += 4;
                data.setUint16(index, 0x0001, true);
                index += 2;
                data.setUint16(index, wavChannelCount, true);
                index += 2;
                data.setUint32(index, sampleRate, true);
                index += 4;
                data.setUint32(index, sampleRate * bytesPerSample * wavChannelCount, true);
                index += 4;
                data.setUint16(index, bytesPerSample, true);
                index += 2;
                data.setUint16(index, bitsPerSample, true);
                index += 2;
                data.setUint32(index, 0x64617461, false);
                index += 4;
                data.setUint32(index, sampleCount * bytesPerSample, true);
                index += 4;
                var stride;
                var repeat;
                if (srcChannelCount == wavChannelCount) {
                    stride = 1;
                    repeat = 1;
                }
                else {
                    stride = srcChannelCount;
                    repeat = wavChannelCount;
                }
                var val;
                if (bytesPerSample > 1) {
                    for (var i = 0; i < sampleFrames; i++) {
                        val = Math.floor(recordedSamples[i * stride] * ((1 << (bitsPerSample - 1)) - 1));
                        for (var k = 0; k < repeat; k++) {
                            if (bytesPerSample == 2) {
                                data.setInt16(index, val, true);
                                index += 2;
                            }
                            else if (bytesPerSample == 4) {
                                data.setInt32(index, val, true);
                                index += 4;
                            }
                            else {
                                throw new Error("unsupported sample size");
                            }
                        }
                    }
                }
                else {
                    for (var i = 0; i < sampleFrames; i++) {
                        val = Math.floor(recordedSamples[i * stride] * 127 + 128);
                        for (var k = 0; k < repeat; k++) {
                            data.setUint8(index, val > 255 ? 255 : (val < 0 ? 0 : val));
                            index++;
                        }
                    }
                }
                var blob = new Blob([arrayBuffer], { type: "audio/wav" });
                save(blob, _this._fileName.value.trim() + ".wav");
                _this._close();
            };
            this._whenExportToMidi = function () {
                var writeIndex = 0;
                var fileSize = 0;
                var arrayBuffer = new ArrayBuffer(1024);
                var data = new DataView(arrayBuffer);
                function addBytes(numBytes) {
                    fileSize += numBytes;
                    if (fileSize > arrayBuffer.byteLength) {
                        arrayBuffer = ArrayBuffer.transfer(arrayBuffer, Math.max(arrayBuffer.byteLength * 2, fileSize));
                        data = new DataView(arrayBuffer);
                    }
                }
                function writeUint32(value) {
                    value = value >>> 0;
                    addBytes(4);
                    data.setUint32(writeIndex, value, false);
                    writeIndex = fileSize;
                }
                function writeUint24(value) {
                    value = value >>> 0;
                    addBytes(3);
                    data.setUint8(writeIndex, (value >> 16) & 0xff);
                    data.setUint8(writeIndex + 1, (value >> 8) & 0xff);
                    data.setUint8(writeIndex + 2, (value) & 0xff);
                    writeIndex = fileSize;
                }
                function writeUint16(value) {
                    value = value >>> 0;
                    addBytes(2);
                    data.setUint16(writeIndex, value, false);
                    writeIndex = fileSize;
                }
                function writeUint8(value) {
                    value = value >>> 0;
                    addBytes(1);
                    data.setUint8(writeIndex, value);
                    writeIndex = fileSize;
                }
                function writeFlagAnd7Bits(flag, value) {
                    value = ((value >>> 0) & 0x7f) | ((flag & 0x01) << 7);
                    addBytes(1);
                    data.setUint8(writeIndex, value);
                    writeIndex = fileSize;
                }
                function writeVariableLength(value) {
                    value = value >>> 0;
                    if (value > 0x0fffffff)
                        throw new Error("writeVariableLength value too big.");
                    var startWriting = false;
                    for (var i = 0; i < 4; i++) {
                        var shift = 21 - i * 7;
                        var bits = (value >>> shift) & 0x7f;
                        if (bits != 0 || i == 3)
                            startWriting = true;
                        if (startWriting)
                            writeFlagAnd7Bits(i == 3 ? 0 : 1, bits);
                    }
                }
                function writeAscii(string) {
                    writeVariableLength(string.length);
                    for (var i = 0; i < string.length; i++) {
                        var charCode = string.charCodeAt(i);
                        if (charCode > 0x7f)
                            throw new Error("Trying to write unicode character as ascii.");
                        writeUint8(charCode);
                    }
                }
                var song = _this._doc.song;
                var ticksPerBeat = 96;
                var ticksPerPart = ticksPerBeat / song.partsPerBeat;
                var ticksPerArpeggio = ticksPerPart / 4;
                var secondsPerMinute = 60;
                var microsecondsPerMinute = secondsPerMinute * 1000000;
                var beatsPerMinute = song.getBeatsPerMinute();
                var microsecondsPerBeat = Math.round(microsecondsPerMinute / beatsPerMinute);
                var secondsPerTick = secondsPerMinute / (ticksPerBeat * beatsPerMinute);
                var ticksPerBar = ticksPerBeat * song.beatsPerBar;
                var unrolledBars = [];
                if (_this._enableIntro.checked) {
                    for (var bar = 0; bar < song.loopStart; bar++) {
                        unrolledBars.push(bar);
                    }
                }
                for (var loopIndex = 0; loopIndex < Number(_this._loopDropDown.value); loopIndex++) {
                    for (var bar = song.loopStart; bar < song.loopStart + song.loopLength; bar++) {
                        unrolledBars.push(bar);
                    }
                }
                if (_this._enableOutro.checked) {
                    for (var bar = song.loopStart + song.loopLength; bar < song.barCount; bar++) {
                        unrolledBars.push(bar);
                    }
                }
                var tracks = [{ isMeta: true, channel: -1, midiChannel: -1, isChorus: false, isDrums: false }];
                var midiChannelCounter = 0;
                for (var channel = 0; channel < _this._doc.song.getChannelCount(); channel++) {
                    if (_this._doc.song.getChannelIsDrum(channel)) {
                        tracks.push({ isMeta: false, channel: channel, midiChannel: midiChannelCounter++, isChorus: false, isDrums: true });
                        if (midiChannelCounter == 9)
                            midiChannelCounter++;
                    }
                    else {
                        tracks.push({ isMeta: false, channel: channel, midiChannel: midiChannelCounter++, isChorus: false, isDrums: false });
                        if (midiChannelCounter == 9)
                            midiChannelCounter++;
                        tracks.push({ isMeta: false, channel: channel, midiChannel: midiChannelCounter++, isChorus: true, isDrums: false });
                        if (midiChannelCounter == 9)
                            midiChannelCounter++;
                    }
                }
                writeUint32(0x4D546864);
                writeUint32(6);
                writeUint16(1);
                writeUint16(tracks.length);
                writeUint16(ticksPerBeat);
                var _loop_1 = function (track) {
                    writeUint32(0x4D54726B);
                    var isMeta = track.isMeta, channel = track.channel, midiChannel = track.midiChannel, isChorus = track.isChorus, isDrums = track.isDrums;
                    var trackLengthIndex = writeIndex;
                    fileSize += 4;
                    writeIndex = fileSize;
                    var prevTime = 0;
                    var barStartTime = 0;
                    var writeEventTime = function (time) {
                        if (time < prevTime)
                            throw new Error("Midi event time cannot go backwards.");
                        writeVariableLength(time - prevTime);
                        prevTime = time;
                    };
                    if (isMeta) {
                        writeEventTime(0);
                        writeUint16(0xFF01);
                        writeAscii("http://www.beepbox.co/#" + song.toBase64String());
                        writeEventTime(0);
                        writeUint24(0xFF5103);
                        writeUint24(microsecondsPerBeat);
                        writeEventTime(0);
                        writeUint24(0xFF5804);
                        writeUint8(song.beatsPerBar);
                        writeUint8(2);
                        writeUint8(24);
                        writeUint8(8);
                        var isMinor = (song.scale < 10) && ((song.scale & 1) == 1);
                        var key = 11 - song.key;
                        var numSharps = key;
                        if ((key & 1) == 1)
                            numSharps += 6;
                        if (isMinor)
                            numSharps += 9;
                        while (numSharps > 6)
                            numSharps -= 12;
                        writeEventTime(0);
                        writeUint24(0xFF5902);
                        writeUint8(numSharps);
                        writeUint8(isMinor ? 1 : 0);
                        if (_this._enableIntro.checked)
                            barStartTime += ticksPerBar * song.loopStart;
                        writeEventTime(barStartTime);
                        writeUint16(0xFF06);
                        writeAscii("Loop Start");
                        for (var loopIndex = 0; loopIndex < Number(_this._loopDropDown.value); loopIndex++) {
                            barStartTime += ticksPerBar * song.loopLength;
                            writeEventTime(barStartTime);
                            writeUint16(0xFF06);
                            writeAscii(loopIndex < Number(_this._loopDropDown.value) - 1 ? "Loop Repeat" : "Loop End");
                        }
                        if (_this._enableOutro.checked)
                            barStartTime += ticksPerBar * (song.barCount - song.loopStart - song.loopLength);
                        if (barStartTime != ticksPerBar * unrolledBars.length)
                            throw new Error("Miscalculated number of bars.");
                    }
                    else {
                        var channelName = song.getChannelIsDrum(channel) ? beepbox.Config.midiDrumChannelNames[channel - song.pitchChannelCount] : beepbox.Config.midiPitchChannelNames[channel];
                        if (isChorus)
                            channelName += " chorus";
                        writeEventTime(0);
                        writeUint16(0xFF03);
                        writeAscii(channelName);
                        writeEventTime(barStartTime);
                        writeUint8(0xB0 | midiChannel);
                        writeFlagAnd7Bits(0, 0x7E);
                        writeFlagAnd7Bits(0, 1);
                        writeEventTime(barStartTime);
                        writeUint8(0xB0 | midiChannel);
                        writeFlagAnd7Bits(0, 0x44);
                        writeFlagAnd7Bits(0, 0x7f);
                        var prevInstrument = -1;
                        var prevPitchBend = -1;
                        var prevExpression = -1;
                        var channelRoot = isDrums ? 33 : beepbox.Config.keyTransposes[song.key];
                        var intervalScale = isDrums ? beepbox.Config.drumInterval : 1;
                        for (var _i = 0, unrolledBars_1 = unrolledBars; _i < unrolledBars_1.length; _i++) {
                            var bar = unrolledBars_1[_i];
                            var pattern = song.getPattern(channel, bar);
                            if (pattern != null) {
                                var nextInstrument = pattern.instrument;
                                var instrument = song.channels[channel].instruments[nextInstrument];
                                if (isChorus && (isDrums || instrument.type == 1 || instrument.chorus == 0)) {
                                    barStartTime += ticksPerBar;
                                    continue;
                                }
                                if (prevInstrument != nextInstrument) {
                                    prevInstrument = nextInstrument;
                                    var description = "";
                                    var instrumentProgram = 0x51;
                                    if (isDrums) {
                                        description += "type: " + beepbox.Config.instrumentTypeNames[2];
                                        description += ", noise: " + beepbox.Config.drumNames[instrument.wave];
                                        description += ", volume: " + beepbox.Config.volumeNames[instrument.volume];
                                        description += ", transition: " + beepbox.Config.transitionNames[instrument.transition];
                                        instrumentProgram = 0x7E;
                                    }
                                    else {
                                        description += "type: " + beepbox.Config.instrumentTypeNames[instrument.type];
                                        if (instrument.type == 0) {
                                            description += ", wave: " + beepbox.Config.waveNames[instrument.wave];
                                            description += ", volume: " + beepbox.Config.volumeNames[instrument.volume];
                                            description += ", transition: " + beepbox.Config.transitionNames[instrument.transition];
                                            description += ", filter: " + beepbox.Config.filterNames[instrument.filter];
                                            description += ", chorus: " + beepbox.Config.chorusNames[instrument.chorus];
                                            description += ", effect: " + beepbox.Config.effectNames[instrument.effect];
                                            var filterInstruments = beepbox.Config.filterDecays[instrument.filter] == 0 ? beepbox.Config.midiSustainInstruments : beepbox.Config.midiDecayInstruments;
                                            instrumentProgram = filterInstruments[instrument.wave];
                                        }
                                        else if (instrument.type == 1) {
                                            description += ", transition: " + beepbox.Config.transitionNames[instrument.transition];
                                            description += ", effect: " + beepbox.Config.effectNames[instrument.effect];
                                            description += ", algorithm: " + beepbox.Config.midiAlgorithmNames[instrument.algorithm];
                                            description += ", feedbackType: " + beepbox.Config.midiFeedbackNames[instrument.feedbackType];
                                            description += ", feedbackAmplitude: " + instrument.feedbackAmplitude;
                                            description += ", feedbackEnvelope: " + beepbox.Config.operatorEnvelopeNames[instrument.feedbackEnvelope];
                                            for (var i = 0; i < beepbox.Config.operatorCount; i++) {
                                                var operator = instrument.operators[i];
                                                description += ", operator" + (i + 1) + ": {";
                                                description += "frequency: " + beepbox.Config.midiFrequencyNames[operator.frequency];
                                                description += ", amplitude: " + operator.amplitude;
                                                description += ", envelope: " + beepbox.Config.operatorEnvelopeNames[operator.envelope];
                                                description += "}";
                                            }
                                        }
                                        else {
                                            throw new Error("Unrecognized instrument type.");
                                        }
                                    }
                                    writeEventTime(barStartTime);
                                    writeUint16(0xFF04);
                                    writeAscii(description);
                                    writeEventTime(barStartTime);
                                    writeUint8(0xC0 | midiChannel);
                                    writeFlagAnd7Bits(0, instrumentProgram);
                                    var channelVolume = (5 - instrument.volume) / 5;
                                    if (!isDrums && instrument.type == 1)
                                        channelVolume = 1.0;
                                    writeEventTime(barStartTime);
                                    writeUint8(0xB0 | midiChannel);
                                    writeFlagAnd7Bits(0, 0x07);
                                    writeFlagAnd7Bits(0, Math.round(0x7f * channelVolume));
                                }
                                var effectChoice = instrument.effect;
                                var effectVibrato = beepbox.Config.effectVibratos[effectChoice];
                                var effectTremolo = beepbox.Config.effectTremolos[effectChoice];
                                var effectDuration = 0.14;
                                var chorusOffset = 0.0;
                                var chorusHarmonizes = false;
                                var usesArpeggio = true;
                                if (!isDrums) {
                                    if (instrument.type == 0) {
                                        chorusOffset = beepbox.Config.chorusIntervals[instrument.chorus];
                                        if (!isChorus)
                                            chorusOffset *= -1;
                                        chorusOffset += beepbox.Config.chorusOffsets[instrument.chorus];
                                        chorusHarmonizes = beepbox.Config.chorusHarmonizes[instrument.chorus];
                                    }
                                    else if (instrument.type == 1) {
                                        usesArpeggio = false;
                                    }
                                    else {
                                        throw new Error("Unrecognized instrument type.");
                                    }
                                }
                                for (var noteIndex = 0; noteIndex < pattern.notes.length; noteIndex++) {
                                    var note = pattern.notes[noteIndex];
                                    var noteStartTime = barStartTime + note.start * ticksPerPart;
                                    var pinTime = noteStartTime;
                                    var pinVolume = note.pins[0].volume;
                                    var pinInterval = note.pins[0].interval;
                                    var prevPitch = channelRoot + note.pitches[0] * intervalScale;
                                    for (var pinIndex = 1; pinIndex < note.pins.length; pinIndex++) {
                                        var nextPinTime = noteStartTime + note.pins[pinIndex].time * ticksPerPart;
                                        var nextPinVolume = note.pins[pinIndex].volume;
                                        var nextPinInterval = note.pins[pinIndex].interval;
                                        var length_1 = nextPinTime - pinTime;
                                        for (var tick = 0; tick < length_1; tick++) {
                                            var tickTime = pinTime + tick;
                                            var linearVolume = lerp(pinVolume, nextPinVolume, tick / length_1);
                                            var linearInterval = lerp(pinInterval, nextPinInterval, tick / length_1);
                                            var arpeggio = Math.floor(tick / ticksPerArpeggio) % 4;
                                            var nextPitch = note.pitches[0];
                                            if (usesArpeggio) {
                                                if (chorusHarmonizes) {
                                                    if (isChorus) {
                                                        if (note.pitches.length == 2) {
                                                            nextPitch = note.pitches[1];
                                                        }
                                                        else if (note.pitches.length == 3) {
                                                            nextPitch = note.pitches[(arpeggio >> 1) + 1];
                                                        }
                                                        else if (note.pitches.length == 4) {
                                                            nextPitch = note.pitches[(arpeggio == 3 ? 1 : arpeggio) + 1];
                                                        }
                                                    }
                                                }
                                                else {
                                                    if (note.pitches.length == 2) {
                                                        nextPitch = note.pitches[arpeggio >> 1];
                                                    }
                                                    else if (note.pitches.length == 3) {
                                                        nextPitch = note.pitches[arpeggio == 3 ? 1 : arpeggio];
                                                    }
                                                    else if (note.pitches.length == 4) {
                                                        nextPitch = note.pitches[arpeggio];
                                                    }
                                                }
                                            }
                                            var interval = linearInterval * intervalScale + chorusOffset;
                                            var wholeInterval = Math.round(interval);
                                            var fractionalInterval = interval - wholeInterval;
                                            var pitchOffset = fractionalInterval;
                                            var effectCurve = Math.sin(Math.PI * 2.0 * (tickTime - barStartTime) * secondsPerTick / effectDuration);
                                            if (effectChoice != 2 || tickTime - noteStartTime >= 3 * ticksPerPart) {
                                                pitchOffset += effectVibrato * effectCurve;
                                            }
                                            var pitchBend = Math.max(0, Math.min(0x3fff, Math.round(0x2000 + 0x1000 * pitchOffset)));
                                            var volume = linearVolume / 3;
                                            var tremolo = 1.0 + effectTremolo * (effectCurve - 1.0);
                                            var expression = Math.round(0x7f * volume * tremolo);
                                            if (pitchBend != prevPitchBend) {
                                                writeEventTime(tickTime);
                                                writeUint8(0xE0 | midiChannel);
                                                writeFlagAnd7Bits(0, pitchBend & 0x7f);
                                                writeFlagAnd7Bits(0, (pitchBend >> 7) & 0x7f);
                                            }
                                            if (expression != prevExpression) {
                                                writeEventTime(tickTime);
                                                writeUint8(0xB0 | midiChannel);
                                                writeFlagAnd7Bits(0, 0x0B);
                                                writeFlagAnd7Bits(0, expression);
                                            }
                                            nextPitch = channelRoot + nextPitch * intervalScale + wholeInterval;
                                            if (tickTime == noteStartTime) {
                                                writeEventTime(tickTime);
                                                writeUint8(0x90 | midiChannel);
                                                writeFlagAnd7Bits(0, nextPitch);
                                                writeFlagAnd7Bits(0, 0x40);
                                            }
                                            else if (nextPitch != prevPitch) {
                                                writeEventTime(tickTime);
                                                writeUint8(0x90 | midiChannel);
                                                writeFlagAnd7Bits(0, nextPitch);
                                                writeFlagAnd7Bits(0, 0x40);
                                                writeEventTime(tickTime);
                                                writeUint8(0x80 | midiChannel);
                                                writeFlagAnd7Bits(0, prevPitch);
                                                writeFlagAnd7Bits(0, 0x40);
                                            }
                                            prevPitchBend = pitchBend;
                                            prevExpression = expression;
                                            prevPitch = nextPitch;
                                        }
                                        pinTime = nextPinTime;
                                        pinVolume = nextPinVolume;
                                        pinInterval = nextPinInterval;
                                    }
                                    writeEventTime(barStartTime + note.end * ticksPerPart);
                                    writeUint8(0x80 | midiChannel);
                                    writeFlagAnd7Bits(0, prevPitch);
                                    writeFlagAnd7Bits(0, 0x40);
                                }
                            }
                            barStartTime += ticksPerBar;
                        }
                    }
                    writeEventTime(barStartTime);
                    writeUint24(0xFF2F00);
                    data.setUint32(trackLengthIndex, writeIndex - trackLengthIndex - 4, false);
                };
                for (var _i = 0, tracks_1 = tracks; _i < tracks_1.length; _i++) {
                    var track = tracks_1[_i];
                    _loop_1(track);
                }
                arrayBuffer = ArrayBuffer.transfer(arrayBuffer, fileSize);
                var blob = new Blob([arrayBuffer], { type: "audio/midi" });
                save(blob, _this._fileName.value.trim() + ".midi");
                _this._close();
            };
            this._whenExportToJson = function () {
                var jsonObject = _this._doc.song.toJsonObject(_this._enableIntro.checked, Number(_this._loopDropDown.value), _this._enableOutro.checked);
                var jsonString = JSON.stringify(jsonObject, null, '\t');
                var blob = new Blob([jsonString], { type: "application/json" });
                save(blob, _this._fileName.value.trim() + ".json");
                _this._close();
            };
            this._loopDropDown.value = "1";
            if (this._doc.song.loopStart == 0) {
                this._enableIntro.checked = false;
                this._enableIntro.disabled = true;
            }
            else {
                this._enableIntro.checked = true;
                this._enableIntro.disabled = false;
            }
            if (this._doc.song.loopStart + this._doc.song.loopLength == this._doc.song.barCount) {
                this._enableOutro.checked = false;
                this._enableOutro.disabled = true;
            }
            else {
                this._enableOutro.checked = true;
                this._enableOutro.disabled = false;
            }
            this._fileName.addEventListener("input", ExportPrompt._validateFileName);
            this._loopDropDown.addEventListener("blur", ExportPrompt._validateNumber);
            this._exportWavButton.addEventListener("click", this._whenExportToWav);
            this._exportMidiButton.addEventListener("click", this._whenExportToMidi);
            this._exportJsonButton.addEventListener("click", this._whenExportToJson);
            this._cancelButton.addEventListener("click", this._close);
        }
        ExportPrompt._validateFileName = function (event) {
            var input = event.target;
            var deleteChars = /[\+\*\$\?\|\{\}\\\/<>#%!`&'"=:@]/gi;
            if (deleteChars.test(input.value)) {
                var cursorPos = input.selectionStart;
                input.value = input.value.replace(deleteChars, "");
                cursorPos--;
                input.setSelectionRange(cursorPos, cursorPos);
            }
        };
        ExportPrompt._validateNumber = function (event) {
            var input = event.target;
            input.value = Math.floor(Math.max(Number(input.min), Math.min(Number(input.max), Number(input.value)))) + "";
        };
        return ExportPrompt;
    }());
    beepbox.ExportPrompt = ExportPrompt;
})(beepbox || (beepbox = {}));
var beepbox;
(function (beepbox) {
    var button = beepbox.html.button, div = beepbox.html.div, input = beepbox.html.input, text = beepbox.html.text;
    var ImportPrompt = (function () {
        function ImportPrompt(_doc, _songEditor) {
            var _this = this;
            this._doc = _doc;
            this._songEditor = _songEditor;
            this._fileInput = input({ type: "file", accept: ".json,application/json" });
            this._cancelButton = button({}, [text("Cancel")]);
            this.container = div({ className: "prompt", style: "width: 200px;" }, [
                div({ style: "font-size: 2em" }, [text("Import")]),
                div({ style: "text-align: left;" }, [text("BeepBox songs can be exported and re-imported as .json files. You could also use other means to make .json files for BeepBox as long as they follow the same structure.")]),
                this._fileInput,
                this._cancelButton,
            ]);
            this._close = function () {
                _this._doc.undo();
            };
            this.cleanUp = function () {
                _this._fileInput.removeEventListener("change", _this._whenFileSelected);
                _this._cancelButton.removeEventListener("click", _this._close);
            };
            this._whenFileSelected = function () {
                var file = _this._fileInput.files[0];
                if (!file)
                    return;
                var reader = new FileReader();
                reader.addEventListener("load", function (event) {
                    _this._doc.prompt = null;
                    _this._doc.record(new beepbox.ChangeSong(_this._doc, reader.result), true);
                });
                reader.readAsText(file);
            };
            this._fileInput.addEventListener("change", this._whenFileSelected);
            this._cancelButton.addEventListener("click", this._close);
        }
        return ImportPrompt;
    }());
    beepbox.ImportPrompt = ImportPrompt;
})(beepbox || (beepbox = {}));
var beepbox;
(function (beepbox) {
    var button = beepbox.html.button, div = beepbox.html.div, text = beepbox.html.text;
    var InstrumentTypePrompt = (function () {
        function InstrumentTypePrompt(_doc, _songEditor) {
            var _this = this;
            this._doc = _doc;
            this._songEditor = _songEditor;
            this._cancelButton = button({}, [text("Close")]);
            this.container = div({ className: "prompt", style: "width: 300px;" }, [
                div({ style: "font-size: 2em" }, [text("FM Synthesis")]),
                div({ style: "text-align: left; margin: 0.5em 0;" }, [
                    text('Popularized by the Sega Genesis and Yamaha keyboards, FM Synthesis is a mysterious but powerful technique for crafting sounds. It may seem confusing, but just play around with the options until you get a feel for it, or check out some examples in '),
                    beepbox.html.element("a", { target: "_blank", href: "#6n10s0kbl00e07t5m0a7g07j7i7r1o2T1d2c0A0F1B0V1Q0200Pff00E0411T1d1c0A0F0B0V1Q2800Pf700E0711T1d2c0A0F1B4VaQ0200Pfb00E0911T1d1c2A0F9B3V1Q1000Pfbc0E0191T1d2c0AcF8B5V1Q0259PffffE0000T1d3c1AcF4B5V4Q2600Pff00E0011T1d1c0AbF0B0V1Q2580PfffaE2226T1d1c0A1F0B0V1Q520dPff4dEd41eb4zhmu0p21h5dfxd7ij7XrjfiAjPudUTtUSRsTzudTudJvdUTztTzrpPudUTtUSSYTzudTudJTdUTztTzrvPudUTtUSQ" }, [text("this demo")]),
                    text('. '),
                ]),
                div({ style: "text-align: left; margin: 0.5em 0;" }, [text('This FM instrument uses up to four waves, numbered 1, 2, 3, and 4. ' +
                        'Each wave may have its own frequency, volume, and volume envelope to control its effect over time. ')]),
                div({ style: "text-align: left; margin: 0.5em 0;" }, [text('There are two kinds of waves: "carrier" waves play a tone out loud, but "modulator" waves distort other waves instead. ' +
                        'Wave 1 is always a carrier and plays a tone, but other waves may distort it. ' +
                        'The "Algorithm" setting determines which waves are modulators, and which other waves those modulators distort. ')]),
                div({ style: "text-align: left; margin: 0.5em 0;" }, [text('Modulators distort in one direction (like 1←2), but you can also use "Feedback" to make any wave distort in the opposite direction (1→2), or even itself (1⟲). ')]),
                div({ style: "text-align: left; margin: 0.5em 0;" }, [text('You can set the pitch of each wave independently by adding simultaneous notes, one above another. This often sounds harsh or dissonant, but can make cool sound effects! ')]),
                this._cancelButton,
            ]);
            this._close = function () {
                _this._doc.undo();
            };
            this.cleanUp = function () {
                _this._cancelButton.removeEventListener("click", _this._close);
            };
            this._cancelButton.addEventListener("click", this._close);
        }
        return InstrumentTypePrompt;
    }());
    beepbox.InstrumentTypePrompt = InstrumentTypePrompt;
})(beepbox || (beepbox = {}));
var beepbox;
(function (beepbox) {
    var button = beepbox.html.button, div = beepbox.html.div, text = beepbox.html.text;
    var ChorusPrompt = (function () {
        function ChorusPrompt(_doc, _songEditor) {
            var _this = this;
            this._doc = _doc;
            this._songEditor = _songEditor;
            this._cancelButton = button({}, [text("Close")]);
            this.container = div({ className: "prompt", style: "width: 250px;" }, [
                div({ style: "font-size: 2em" }, [text("Custom Harmony")]),
                div({ style: "text-align: left;" }, [text('BeepBox "chip" instruments play two waves at once, each with their own pitch. ' +
                        'The "Chorus" setting usually determines how far apart these pitches are, but in "custom harmony" mode, you can control these pitches individually by making two simultaneous notes, one above the other. ' +
                        'This replaces the "arpeggio/trill" effect, and gives you greater control over your harmony. ')]),
                this._cancelButton,
            ]);
            this._close = function () {
                _this._doc.undo();
            };
            this.cleanUp = function () {
                _this._cancelButton.removeEventListener("click", _this._close);
            };
            this._cancelButton.addEventListener("click", this._close);
        }
        return ChorusPrompt;
    }());
    beepbox.ChorusPrompt = ChorusPrompt;
})(beepbox || (beepbox = {}));
var beepbox;
(function (beepbox) {
    var button = beepbox.html.button, div = beepbox.html.div, span = beepbox.html.span, select = beepbox.html.select, option = beepbox.html.option, input = beepbox.html.input, text = beepbox.html.text;
    var isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|android|ipad|playbook|silk/i.test(navigator.userAgent);
    function buildOptions(menu, items) {
        for (var _i = 0, items_1 = items; _i < items_1.length; _i++) {
            var item = items_1[_i];
            menu.appendChild(option(item, item, false, false));
        }
        return menu;
    }
    function setSelectedIndex(menu, index) {
        if (menu.selectedIndex != index)
            menu.selectedIndex = index;
    }
    var Slider = (function () {
        function Slider(input, _doc, _getChange) {
            var _this = this;
            this.input = input;
            this._doc = _doc;
            this._getChange = _getChange;
            this._change = null;
            this._value = 0;
            this._oldValue = 0;
            this._whenInput = function () {
                var continuingProspectiveChange = _this._doc.lastChangeWas(_this._change);
                if (!continuingProspectiveChange)
                    _this._oldValue = _this._value;
                _this._change = _this._getChange(_this._oldValue, parseInt(_this.input.value));
                _this._doc.setProspectiveChange(_this._change);
            };
            this._whenChange = function () {
                _this._doc.record(_this._change);
                _this._change = null;
            };
            input.addEventListener("input", this._whenInput);
            input.addEventListener("change", this._whenChange);
        }
        Slider.prototype.updateValue = function (value) {
            this._value = value;
            this.input.value = String(value);
        };
        return Slider;
    }());
    var SongEditor = (function () {
        function SongEditor(_doc) {
            var _this = this;
            this._doc = _doc;
            this.prompt = null;
            this._patternEditor = new beepbox.PatternEditor(this._doc);
            this._trackEditor = new beepbox.TrackEditor(this._doc, this);
            this._loopEditor = new beepbox.LoopEditor(this._doc);
            this._trackContainer = div({ className: "trackContainer" }, [
                this._trackEditor.container,
                this._loopEditor.container,
            ]);
            this._barScrollBar = new beepbox.BarScrollBar(this._doc, this._trackContainer);
            this._octaveScrollBar = new beepbox.OctaveScrollBar(this._doc);
            this._piano = new beepbox.Piano(this._doc);
            this._editorBox = div({}, [
                div({ className: "editorBox", style: "height: 481px; display: flex; flex-direction: row; margin-bottom: 6px;" }, [
                    this._piano.container,
                    this._patternEditor.container,
                    this._octaveScrollBar.container,
                ]),
                this._trackContainer,
                this._barScrollBar.container,
            ]);
            this._playButton = button({ style: "width: 80px;", type: "button" });
            this._prevBarButton = button({ className: "prevBarButton", style: "width: 40px;", type: "button", title: "Previous Bar (left bracket)" });
            this._nextBarButton = button({ className: "nextBarButton", style: "width: 40px;", type: "button", title: "Next Bar (right bracket)" });
            this._volumeSlider = input({ title: "main volume", style: "width: 5em; flex-grow: 1; margin: 0px;", type: "range", min: "0", max: "100", value: "50", step: "1" });
            this._editMenu = select({ style: "width: 100%;" }, [
                option("", "Edit", true, true),
                option("undo", "Undo (Z)", false, false),
                option("redo", "Redo (Y)", false, false),
                option("copy", "Copy Pattern (C)", false, false),
                option("paste", "Paste Pattern (V)", false, false),
                option("transposeUp", "Shift Notes Up (+)", false, false),
                option("transposeDown", "Shift Notes Down (-)", false, false),
                option("duration", "Custom song size...", false, false),
                option("import", "Import JSON...", false, false),
            ]);
            this._optionsMenu = select({ style: "width: 100%;" }, [
                option("", "Preferences", true, true),
                option("autoPlay", "Auto Play On Load", false, false),
                option("autoFollow", "Auto Follow Track", false, false),
                option("showLetters", "Show Piano", false, false),
                option("showFifth", "Highlight 'Fifth' Notes", false, false),
                option("showChannels", "Show All Channels", false, false),
                option("showScrollBar", "Octave Scroll Bar", false, false),
            ]);
            this._newSongButton = button({ type: "button" }, [
                text("New"),
                span({ className: "fullWidthOnly" }, [text(" Song")]),
                beepbox.svgElement("svg", { style: "flex-shrink: 0; position: absolute; left: 0; top: 50%; margin-top: -1em; pointer-events: none;", width: "2em", height: "2em", viewBox: "-5 -21 26 26" }, [
                    beepbox.svgElement("path", { d: "M 2 0 L 2 -16 L 10 -16 L 14 -12 L 14 0 z M 3 -1 L 13 -1 L 13 -11 L 9 -11 L 9 -15 L 3 -15 z", fill: "currentColor" }),
                ]),
            ]);
            this._exportButton = button({ type: "button" }, [
                text("Export"),
                beepbox.svgElement("svg", { style: "flex-shrink: 0; position: absolute; left: 0; top: 50%; margin-top: -1em; pointer-events: none;", width: "2em", height: "2em", viewBox: "-13 -13 26 26" }, [
                    beepbox.svgElement("path", { d: "M -8 3 L -8 8 L 8 8 L 8 3 L 6 3 L 6 6 L -6 6 L -6 3 z M 0 2 L -4 -2 L -1 -2 L -1 -8 L 1 -8 L 1 -2 L 4 -2 z", fill: "currentColor" }),
                ]),
            ]);
            this._scaleSelect = buildOptions(select({}), beepbox.Config.scaleNames);
            this._keySelect = buildOptions(select({}), beepbox.Config.keyNames);
            this._tempoSlider = new Slider(input({ style: "margin: 0px;", type: "range", min: "0", max: beepbox.Config.tempoSteps - 1, value: "7", step: "1" }), this._doc, function (oldValue, newValue) { return new beepbox.ChangeTempo(_this._doc, oldValue, newValue); });
            this._reverbSlider = new Slider(input({ style: "margin: 0px;", type: "range", min: "0", max: beepbox.Config.reverbRange - 1, value: "0", step: "1" }), this._doc, function (oldValue, newValue) { return new beepbox.ChangeReverb(_this._doc, oldValue, newValue); });
            this._partSelect = buildOptions(select({}), beepbox.Config.partNames);
            this._instrumentTypeSelect = buildOptions(select({}), beepbox.Config.pitchChannelTypeNames);
            this._instrumentTypeHint = beepbox.html.element("a", { className: "hintButton" }, [text("?")]);
            this._instrumentTypeSelectRow = div({ className: "selectRow" }, [span({}, [text("Type: ")]), this._instrumentTypeHint, div({ className: "selectContainer" }, [this._instrumentTypeSelect])]);
            this._algorithmSelect = buildOptions(select({}), beepbox.Config.operatorAlgorithmNames);
            this._algorithmSelectRow = div({ className: "selectRow" }, [span({}, [text("Algorithm: ")]), div({ className: "selectContainer" }, [this._algorithmSelect])]);
            this._instrumentSelect = select({});
            this._instrumentSelectRow = div({ className: "selectRow", style: "display: none;" }, [span({}, [text("Instrument: ")]), div({ className: "selectContainer" }, [this._instrumentSelect])]);
            this._instrumentVolumeSlider = new Slider(input({ style: "margin: 0px;", type: "range", min: "-5", max: "0", value: "0", step: "1" }), this._doc, function (oldValue, newValue) { return new beepbox.ChangeVolume(_this._doc, oldValue, -newValue); });
            this._instrumentVolumeSliderRow = div({ className: "selectRow" }, [span({}, [text("Volume: ")]), this._instrumentVolumeSlider.input]);
            this._waveSelect = buildOptions(select({}), beepbox.Config.waveNames);
            this._drumSelect = buildOptions(select({}), beepbox.Config.drumNames);
            this._waveSelectRow = div({ className: "selectRow" }, [span({}, [text("Wave: ")]), div({ className: "selectContainer" }, [this._waveSelect, this._drumSelect])]);
            this._transitionSelect = buildOptions(select({}), beepbox.Config.transitionNames);
            this._filterSelect = buildOptions(select({}), beepbox.Config.filterNames);
            this._filterSelectRow = div({ className: "selectRow" }, [span({}, [text("Filter: ")]), div({ className: "selectContainer" }, [this._filterSelect])]);
            this._chorusSelect = buildOptions(select({}), beepbox.Config.chorusNames);
            this._chorusHint = beepbox.html.element("a", { className: "hintButton" }, [text("?")]);
            this._chorusSelectRow = div({ className: "selectRow" }, [span({}, [text("Chorus: ")]), this._chorusHint, div({ className: "selectContainer" }, [this._chorusSelect])]);
            this._effectSelect = buildOptions(select({}), beepbox.Config.effectNames);
            this._effectSelectRow = div({ className: "selectRow" }, [span({}, [text("Effect: ")]), div({ className: "selectContainer" }, [this._effectSelect])]);
            this._phaseModGroup = div({ style: "display: flex; flex-direction: column; display: none;" }, []);
            this._feedbackTypeSelect = buildOptions(select({}), beepbox.Config.operatorFeedbackNames);
            this._feedbackRow1 = div({ className: "selectRow" }, [span({}, [text("Feedback:")]), div({ className: "selectContainer" }, [this._feedbackTypeSelect])]);
            this._feedbackAmplitudeSlider = new Slider(input({ style: "margin: 0px; width: 4em;", type: "range", min: "0", max: beepbox.Config.operatorAmplitudeMax, value: "0", step: "1", title: "Feedback Amplitude" }), this._doc, function (oldValue, newValue) { return new beepbox.ChangeFeedbackAmplitude(_this._doc, oldValue, newValue); });
            this._feedbackEnvelopeSelect = buildOptions(select({ style: "width: 100%;", title: "Feedback Envelope" }), beepbox.Config.operatorEnvelopeNames);
            this._feedbackRow2 = div({ className: "operatorRow" }, [
                div({ style: "margin-right: .1em; visibility: hidden;" }, [text(1 + ".")]),
                div({ style: "width: 3em; margin-right: .3em;" }),
                this._feedbackAmplitudeSlider.input,
                div({ className: "selectContainer", style: "width: 5em; margin-left: .3em;" }, [this._feedbackEnvelopeSelect]),
            ]);
            this._instrumentSettingsGroup = div({}, [
                this._instrumentSelectRow,
                this._instrumentTypeSelectRow,
                this._instrumentVolumeSliderRow,
                this._waveSelectRow,
                div({ className: "selectRow" }, [
                    span({}, [text("Transition: ")]),
                    div({ className: "selectContainer" }, [this._transitionSelect]),
                ]),
                this._filterSelectRow,
                this._chorusSelectRow,
                this._effectSelectRow,
                this._algorithmSelectRow,
                this._phaseModGroup,
                this._feedbackRow1,
                this._feedbackRow2,
            ]);
            this._promptContainer = div({ className: "promptContainer", style: "display: none;" });
            this.mainLayer = div({ className: "beepboxEditor", tabIndex: "0" }, [
                this._editorBox,
                div({ className: "editor-widget-column" }, [
                    div({ style: "text-align: center; color: #999;" }, [text("BeepBox 2.3")]),
                    div({ className: "editor-widgets" }, [
                        div({ className: "editor-controls" }, [
                            div({ className: "playback-controls" }, [
                                div({ className: "playback-bar-controls" }, [
                                    this._playButton,
                                    this._prevBarButton,
                                    this._nextBarButton,
                                ]),
                                div({ className: "playback-volume-controls" }, [
                                    beepbox.svgElement("svg", { style: "flex-shrink: 0;", width: "2em", height: "2em", viewBox: "0 0 26 26" }, [
                                        beepbox.svgElement("path", { d: "M 4 16 L 4 10 L 8 10 L 13 5 L 13 21 L 8 16 z M 15 11 L 16 10 A 7.2 7.2 0 0 1 16 16 L 15 15 A 5.8 5.8 0 0 0 15 12 z M 18 8 L 19 7 A 11.5 11.5 0 0 1 19 19 L 18 18 A 10.1 10.1 0 0 0 18 8 z", fill: "#777" }),
                                    ]),
                                    this._volumeSlider,
                                ]),
                            ]),
                            div({ className: "editor-menus" }, [
                                this._newSongButton,
                                div({ className: "selectContainer menu" }, [
                                    this._editMenu,
                                    beepbox.svgElement("svg", { style: "flex-shrink: 0; position: absolute; left: 0; top: 50%; margin-top: -1em; pointer-events: none;", width: "2em", height: "2em", viewBox: "-5 -21 26 26" }, [
                                        beepbox.svgElement("path", { d: "M 0 0 L 1 -4 L 4 -1 z M 2 -5 L 10 -13 L 13 -10 L 5 -2 zM 11 -14 L 13 -16 L 14 -16 L 16 -14 L 16 -13 L 14 -11 z", fill: "currentColor" }),
                                    ]),
                                ]),
                                div({ className: "selectContainer menu" }, [
                                    this._optionsMenu,
                                    beepbox.svgElement("svg", { style: "flex-shrink: 0; position: absolute; left: 0; top: 50%; margin-top: -1em; pointer-events: none;", width: "2em", height: "2em", viewBox: "-13 -13 26 26" }, [
                                        beepbox.svgElement("path", { d: "M 5.78 -1.6 L 7.93 -0.94 L 7.93 0.94 L 5.78 1.6 L 4.85 3.53 L 5.68 5.61 L 4.21 6.78 L 2.36 5.52 L 0.27 5.99 L -0.85 7.94 L -2.68 7.52 L -2.84 5.28 L -4.52 3.95 L -6.73 4.28 L -7.55 2.59 L -5.9 1.07 L -5.9 -1.07 L -7.55 -2.59 L -6.73 -4.28 L -4.52 -3.95 L -2.84 -5.28 L -2.68 -7.52 L -0.85 -7.94 L 0.27 -5.99 L 2.36 -5.52 L 4.21 -6.78 L 5.68 -5.61 L 4.85 -3.53 M 2.92 0.67 L 2.92 -0.67 L 2.35 -1.87 L 1.3 -2.7 L 0 -3 L -1.3 -2.7 L -2.35 -1.87 L -2.92 -0.67 L -2.92 0.67 L -2.35 1.87 L -1.3 2.7 L -0 3 L 1.3 2.7 L 2.35 1.87 z", fill: "currentColor" }),
                                    ]),
                                ]),
                                this._exportButton,
                            ]),
                        ]),
                        div({ className: "editor-settings" }, [
                            div({ className: "editor-song-settings" }, [
                                div({ style: "margin: 3px 0; text-align: center; color: #999;" }, [
                                    text("Song Settings")
                                ]),
                                div({ className: "selectRow" }, [
                                    span({}, [text("Scale: ")]),
                                    div({ className: "selectContainer" }, [this._scaleSelect]),
                                ]),
                                div({ className: "selectRow" }, [
                                    span({}, [text("Key: ")]),
                                    div({ className: "selectContainer" }, [this._keySelect]),
                                ]),
                                div({ className: "selectRow" }, [
                                    span({}, [text("Tempo: ")]),
                                    this._tempoSlider.input,
                                ]),
                                div({ className: "selectRow" }, [
                                    span({}, [text("Reverb: ")]),
                                    this._reverbSlider.input,
                                ]),
                                div({ className: "selectRow" }, [
                                    span({}, [text("Rhythm: ")]),
                                    div({ className: "selectContainer" }, [this._partSelect]),
                                ]),
                            ]),
                            div({ className: "editor-instrument-settings" }, [
                                div({ style: "margin: 3px 0; text-align: center; color: #999;" }, [
                                    text("Instrument Settings")
                                ]),
                                this._instrumentSettingsGroup,
                            ]),
                        ]),
                    ]),
                ]),
                this._promptContainer,
            ]);
            this._changeTranspose = null;
            this._operatorRows = [];
            this._operatorAmplitudeSliders = [];
            this._operatorEnvelopeSelects = [];
            this._operatorFrequencySelects = [];
            this._refocusStage = function () {
                _this.mainLayer.focus();
            };
            this.whenUpdated = function () {
                var trackBounds = _this._trackContainer.getBoundingClientRect();
                _this._doc.trackVisibleBars = Math.floor((trackBounds.right - trackBounds.left) / 32);
                _this._barScrollBar.render();
                _this._trackEditor.render();
                var optionCommands = [
                    (_this._doc.autoPlay ? "✓ " : "") + "Auto Play On Load",
                    (_this._doc.autoFollow ? "✓ " : "") + "Auto Follow Track",
                    (_this._doc.showLetters ? "✓ " : "") + "Show Piano",
                    (_this._doc.showFifth ? "✓ " : "") + "Highlight 'Fifth' Notes",
                    (_this._doc.showChannels ? "✓ " : "") + "Show All Channels",
                    (_this._doc.showScrollBar ? "✓ " : "") + "Octave Scroll Bar",
                ];
                for (var i = 0; i < optionCommands.length; i++) {
                    var option_1 = _this._optionsMenu.children[i + 1];
                    if (option_1.innerText != optionCommands[i])
                        option_1.innerText = optionCommands[i];
                }
                var channel = _this._doc.song.channels[_this._doc.channel];
                var pattern = _this._doc.getCurrentPattern();
                var instrumentIndex = _this._doc.getCurrentInstrument();
                var instrument = channel.instruments[instrumentIndex];
                var wasActive = _this.mainLayer.contains(document.activeElement);
                var activeElement = document.activeElement;
                setSelectedIndex(_this._scaleSelect, _this._doc.song.scale);
                setSelectedIndex(_this._keySelect, _this._doc.song.key);
                _this._tempoSlider.updateValue(_this._doc.song.tempo);
                _this._tempoSlider.input.title = _this._doc.song.getBeatsPerMinute() + " beats per minute";
                _this._reverbSlider.updateValue(_this._doc.song.reverb);
                setSelectedIndex(_this._partSelect, beepbox.Config.partCounts.indexOf(_this._doc.song.partsPerBeat));
                if (instrument.type == 2) {
                    _this._instrumentVolumeSliderRow.style.display = "";
                    _this._drumSelect.style.display = "";
                    _this._waveSelectRow.style.display = "";
                    _this._instrumentTypeSelectRow.style.display = "none";
                    _this._algorithmSelectRow.style.display = "none";
                    _this._phaseModGroup.style.display = "none";
                    _this._feedbackRow1.style.display = "none";
                    _this._feedbackRow2.style.display = "none";
                    _this._waveSelect.style.display = "none";
                    _this._filterSelectRow.style.display = "none";
                    _this._chorusSelectRow.style.display = "none";
                    _this._effectSelectRow.style.display = "none";
                }
                else if (instrument.type == 0) {
                    _this._instrumentTypeSelectRow.style.display = "";
                    _this._effectSelectRow.style.display = "";
                    _this._drumSelect.style.display = "none";
                    _this._instrumentVolumeSliderRow.style.display = "";
                    _this._waveSelect.style.display = "";
                    _this._waveSelectRow.style.display = "";
                    _this._filterSelectRow.style.display = "";
                    _this._chorusSelectRow.style.display = "";
                    _this._algorithmSelectRow.style.display = "none";
                    _this._phaseModGroup.style.display = "none";
                    _this._feedbackRow1.style.display = "none";
                    _this._feedbackRow2.style.display = "none";
                }
                else if (instrument.type == 1) {
                    _this._instrumentTypeSelectRow.style.display = "";
                    _this._effectSelectRow.style.display = "";
                    _this._drumSelect.style.display = "none";
                    _this._algorithmSelectRow.style.display = "";
                    _this._phaseModGroup.style.display = "";
                    _this._feedbackRow1.style.display = "";
                    _this._feedbackRow2.style.display = "";
                    _this._instrumentVolumeSliderRow.style.display = "none";
                    _this._waveSelectRow.style.display = "none";
                    _this._filterSelectRow.style.display = "none";
                    _this._chorusSelectRow.style.display = "none";
                }
                else {
                    throw new Error("Unrecognized instrument type: " + instrument.type);
                }
                setSelectedIndex(_this._instrumentTypeSelect, instrument.type);
                setSelectedIndex(_this._algorithmSelect, instrument.algorithm);
                _this._instrumentSelectRow.style.display = (_this._doc.song.instrumentsPerChannel > 1) ? "" : "none";
                _this._instrumentSelectRow.style.visibility = (pattern == null) ? "hidden" : "";
                if (_this._instrumentSelect.children.length != _this._doc.song.instrumentsPerChannel) {
                    while (_this._instrumentSelect.firstChild)
                        _this._instrumentSelect.removeChild(_this._instrumentSelect.firstChild);
                    var instrumentList = [];
                    for (var i = 0; i < _this._doc.song.instrumentsPerChannel; i++) {
                        instrumentList.push(i + 1);
                    }
                    buildOptions(_this._instrumentSelect, instrumentList);
                }
                _this._instrumentSettingsGroup.style.color = _this._doc.song.getNoteColorBright(_this._doc.channel);
                setSelectedIndex(_this._waveSelect, instrument.wave);
                setSelectedIndex(_this._drumSelect, instrument.wave);
                setSelectedIndex(_this._filterSelect, instrument.filter);
                setSelectedIndex(_this._transitionSelect, instrument.transition);
                setSelectedIndex(_this._effectSelect, instrument.effect);
                setSelectedIndex(_this._chorusSelect, instrument.chorus);
                setSelectedIndex(_this._feedbackTypeSelect, instrument.feedbackType);
                _this._feedbackAmplitudeSlider.updateValue(instrument.feedbackAmplitude);
                setSelectedIndex(_this._feedbackEnvelopeSelect, instrument.feedbackEnvelope);
                _this._feedbackEnvelopeSelect.parentElement.style.color = (instrument.feedbackAmplitude > 0) ? "" : "#999";
                _this._instrumentVolumeSlider.updateValue(-instrument.volume);
                setSelectedIndex(_this._instrumentSelect, instrumentIndex);
                for (var i = 0; i < beepbox.Config.operatorCount; i++) {
                    var isCarrier = (i < beepbox.Config.operatorCarrierCounts[instrument.algorithm]);
                    _this._operatorRows[i].style.color = isCarrier ? "white" : "";
                    setSelectedIndex(_this._operatorFrequencySelects[i], instrument.operators[i].frequency);
                    _this._operatorAmplitudeSliders[i].updateValue(instrument.operators[i].amplitude);
                    setSelectedIndex(_this._operatorEnvelopeSelects[i], instrument.operators[i].envelope);
                    var operatorName = (isCarrier ? "Voice " : "Modulator ") + (i + 1);
                    _this._operatorFrequencySelects[i].title = operatorName + " Frequency";
                    _this._operatorAmplitudeSliders[i].input.title = operatorName + (isCarrier ? " Volume" : " Amplitude");
                    _this._operatorEnvelopeSelects[i].title = operatorName + " Envelope";
                    _this._operatorEnvelopeSelects[i].parentElement.style.color = (instrument.operators[i].amplitude > 0) ? "" : "#999";
                }
                _this._piano.container.style.display = _this._doc.showLetters ? "" : "none";
                _this._octaveScrollBar.container.style.display = _this._doc.showScrollBar ? "" : "none";
                _this._barScrollBar.container.style.display = _this._doc.song.barCount > _this._doc.trackVisibleBars ? "" : "none";
                _this._instrumentTypeHint.style.display = (instrument.type == 1) ? "" : "none";
                _this._chorusHint.style.display = (beepbox.Config.chorusHarmonizes[instrument.chorus]) ? "" : "none";
                var patternWidth = 512;
                if (_this._doc.showLetters)
                    patternWidth -= 32;
                if (_this._doc.showScrollBar)
                    patternWidth -= 20;
                _this._patternEditor.container.style.width = String(patternWidth) + "px";
                _this._volumeSlider.value = String(_this._doc.volume);
                if (wasActive && (activeElement.clientWidth == 0)) {
                    _this._refocusStage();
                }
                _this._setPrompt(_this._doc.prompt);
                if (_this._doc.autoFollow && !_this._doc.synth.playing) {
                    _this._doc.synth.snapToBar(_this._doc.bar);
                }
            };
            this._whenKeyPressed = function (event) {
                if (_this.prompt) {
                    if (event.keyCode == 27) {
                        window.history.back();
                    }
                    return;
                }
                _this._trackEditor.onKeyPressed(event);
                switch (event.keyCode) {
                    case 32:
                        _this._togglePlay();
                        event.preventDefault();
                        break;
                    case 90:
                        if (event.shiftKey) {
                            _this._doc.redo();
                        }
                        else {
                            _this._doc.undo();
                        }
                        event.preventDefault();
                        break;
                    case 89:
                        _this._doc.redo();
                        event.preventDefault();
                        break;
                    case 67:
                        _this._copy();
                        event.preventDefault();
                        break;
                    case 86:
                        _this._paste();
                        event.preventDefault();
                        break;
                    case 219:
                        _this._doc.synth.prevBar();
                        if (_this._doc.autoFollow) {
                            new beepbox.ChangeChannelBar(_this._doc, _this._doc.channel, Math.floor(_this._doc.synth.playhead));
                        }
                        event.preventDefault();
                        break;
                    case 221:
                        _this._doc.synth.nextBar();
                        if (_this._doc.autoFollow) {
                            new beepbox.ChangeChannelBar(_this._doc, _this._doc.channel, Math.floor(_this._doc.synth.playhead));
                        }
                        event.preventDefault();
                        break;
                    case 189:
                    case 173:
                        _this._transpose(false);
                        event.preventDefault();
                        break;
                    case 187:
                    case 61:
                        _this._transpose(true);
                        event.preventDefault();
                        break;
                }
            };
            this._whenPrevBarPressed = function () {
                _this._doc.synth.prevBar();
            };
            this._whenNextBarPressed = function () {
                _this._doc.synth.nextBar();
            };
            this._togglePlay = function () {
                if (_this._doc.synth.playing) {
                    _this._pause();
                }
                else {
                    _this._play();
                }
            };
            this._setVolumeSlider = function () {
                _this._doc.setVolume(Number(_this._volumeSlider.value));
            };
            this._whenNewSongPressed = function () {
                _this._doc.record(new beepbox.ChangeSong(_this._doc, ""));
                _this._patternEditor.resetCopiedPins();
            };
            this._openExportPrompt = function () {
                _this._openPrompt("export");
            };
            this._openInstrumentTypePrompt = function () {
                _this._openPrompt("instrumentType");
            };
            this._openChorusPrompt = function () {
                _this._openPrompt("chorus");
            };
            this._whenSetScale = function () {
                _this._doc.record(new beepbox.ChangeScale(_this._doc, _this._scaleSelect.selectedIndex));
            };
            this._whenSetKey = function () {
                _this._doc.record(new beepbox.ChangeKey(_this._doc, _this._keySelect.selectedIndex));
            };
            this._whenSetPartsPerBeat = function () {
                _this._doc.record(new beepbox.ChangePartsPerBeat(_this._doc, beepbox.Config.partCounts[_this._partSelect.selectedIndex]));
            };
            this._whenSetInstrumentType = function () {
                _this._doc.record(new beepbox.ChangeInstrumentType(_this._doc, _this._instrumentTypeSelect.selectedIndex));
            };
            this._whenSetFeedbackType = function () {
                _this._doc.record(new beepbox.ChangeFeedbackType(_this._doc, _this._feedbackTypeSelect.selectedIndex));
            };
            this._whenSetFeedbackEnvelope = function () {
                _this._doc.record(new beepbox.ChangeFeedbackEnvelope(_this._doc, _this._feedbackEnvelopeSelect.selectedIndex));
            };
            this._whenSetAlgorithm = function () {
                _this._doc.record(new beepbox.ChangeAlgorithm(_this._doc, _this._algorithmSelect.selectedIndex));
            };
            this._whenSetInstrument = function () {
                var pattern = _this._doc.getCurrentPattern();
                if (pattern == null)
                    return;
                _this._doc.record(new beepbox.ChangePatternInstrument(_this._doc, _this._instrumentSelect.selectedIndex, pattern));
            };
            this._whenSetWave = function () {
                _this._doc.record(new beepbox.ChangeWave(_this._doc, _this._waveSelect.selectedIndex));
            };
            this._whenSetDrum = function () {
                _this._doc.record(new beepbox.ChangeWave(_this._doc, _this._drumSelect.selectedIndex));
            };
            this._whenSetFilter = function () {
                _this._doc.record(new beepbox.ChangeFilter(_this._doc, _this._filterSelect.selectedIndex));
            };
            this._whenSetTransition = function () {
                _this._doc.record(new beepbox.ChangeTransition(_this._doc, _this._transitionSelect.selectedIndex));
            };
            this._whenSetEffect = function () {
                _this._doc.record(new beepbox.ChangeEffect(_this._doc, _this._effectSelect.selectedIndex));
            };
            this._whenSetChorus = function () {
                _this._doc.record(new beepbox.ChangeChorus(_this._doc, _this._chorusSelect.selectedIndex));
            };
            this._editMenuHandler = function (event) {
                switch (_this._editMenu.value) {
                    case "undo":
                        _this._doc.undo();
                        break;
                    case "redo":
                        _this._doc.redo();
                        break;
                    case "copy":
                        _this._copy();
                        break;
                    case "paste":
                        _this._paste();
                        break;
                    case "transposeUp":
                        _this._transpose(true);
                        break;
                    case "transposeDown":
                        _this._transpose(false);
                        break;
                    case "import":
                        _this._openPrompt("import");
                        break;
                    case "duration":
                        _this._openPrompt("duration");
                        break;
                }
                _this._editMenu.selectedIndex = 0;
            };
            this._optionsMenuHandler = function (event) {
                switch (_this._optionsMenu.value) {
                    case "autoPlay":
                        _this._doc.autoPlay = !_this._doc.autoPlay;
                        break;
                    case "autoFollow":
                        _this._doc.autoFollow = !_this._doc.autoFollow;
                        break;
                    case "showLetters":
                        _this._doc.showLetters = !_this._doc.showLetters;
                        break;
                    case "showFifth":
                        _this._doc.showFifth = !_this._doc.showFifth;
                        break;
                    case "showChannels":
                        _this._doc.showChannels = !_this._doc.showChannels;
                        break;
                    case "showScrollBar":
                        _this._doc.showScrollBar = !_this._doc.showScrollBar;
                        break;
                }
                _this._optionsMenu.selectedIndex = 0;
                _this._doc.notifier.changed();
                _this._doc.savePreferences();
            };
            this._doc.notifier.watch(this.whenUpdated);
            this._phaseModGroup.appendChild(div({ className: "operatorRow", style: "color: #999; height: 1em; margin-top: 0.5em;" }, [
                div({ style: "margin-right: .1em; visibility: hidden;" }, [text(1 + ".")]),
                div({ style: "width: 3em; margin-right: .3em;" }, [text("Freq:")]),
                div({ style: "width: 4em; margin: 0;" }, [text("Volume:")]),
                div({ style: "width: 5em; margin-left: .3em;" }, [text("Envelope:")]),
            ]));
            var _loop_2 = function (i) {
                var operatorIndex = i;
                var operatorNumber = div({ style: "margin-right: .1em; color: #999;" }, [text(i + 1 + ".")]);
                var frequencySelect = buildOptions(select({ style: "width: 100%;", title: "Frequency" }), beepbox.Config.operatorFrequencyNames);
                var amplitudeSlider = new Slider(input({ style: "margin: 0; width: 4em;", type: "range", min: "0", max: beepbox.Config.operatorAmplitudeMax, value: "0", step: "1", title: "Volume" }), this_1._doc, function (oldValue, newValue) { return new beepbox.ChangeOperatorAmplitude(_this._doc, operatorIndex, oldValue, newValue); });
                var envelopeSelect = buildOptions(select({ style: "width: 100%;", title: "Envelope" }), beepbox.Config.operatorEnvelopeNames);
                var row = div({ className: "operatorRow" }, [
                    operatorNumber,
                    div({ className: "selectContainer", style: "width: 3em; margin-right: .3em;" }, [frequencySelect]),
                    amplitudeSlider.input,
                    div({ className: "selectContainer", style: "width: 5em; margin-left: .3em;" }, [envelopeSelect]),
                ]);
                this_1._phaseModGroup.appendChild(row);
                this_1._operatorRows[i] = row;
                this_1._operatorAmplitudeSliders[i] = amplitudeSlider;
                this_1._operatorEnvelopeSelects[i] = envelopeSelect;
                this_1._operatorFrequencySelects[i] = frequencySelect;
                envelopeSelect.addEventListener("change", function () {
                    _this._doc.record(new beepbox.ChangeOperatorEnvelope(_this._doc, operatorIndex, envelopeSelect.selectedIndex));
                });
                frequencySelect.addEventListener("change", function () {
                    _this._doc.record(new beepbox.ChangeOperatorFrequency(_this._doc, operatorIndex, frequencySelect.selectedIndex));
                });
            };
            var this_1 = this;
            for (var i = 0; i < beepbox.Config.operatorCount; i++) {
                _loop_2(i);
            }
            this._editMenu.addEventListener("change", this._editMenuHandler);
            this._optionsMenu.addEventListener("change", this._optionsMenuHandler);
            this._scaleSelect.addEventListener("change", this._whenSetScale);
            this._keySelect.addEventListener("change", this._whenSetKey);
            this._partSelect.addEventListener("change", this._whenSetPartsPerBeat);
            this._instrumentTypeSelect.addEventListener("change", this._whenSetInstrumentType);
            this._algorithmSelect.addEventListener("change", this._whenSetAlgorithm);
            this._instrumentSelect.addEventListener("change", this._whenSetInstrument);
            this._feedbackTypeSelect.addEventListener("change", this._whenSetFeedbackType);
            this._feedbackEnvelopeSelect.addEventListener("change", this._whenSetFeedbackEnvelope);
            this._waveSelect.addEventListener("change", this._whenSetWave);
            this._drumSelect.addEventListener("change", this._whenSetDrum);
            this._transitionSelect.addEventListener("change", this._whenSetTransition);
            this._filterSelect.addEventListener("change", this._whenSetFilter);
            this._chorusSelect.addEventListener("change", this._whenSetChorus);
            this._effectSelect.addEventListener("change", this._whenSetEffect);
            this._playButton.addEventListener("click", this._togglePlay);
            this._prevBarButton.addEventListener("click", this._whenPrevBarPressed);
            this._nextBarButton.addEventListener("click", this._whenNextBarPressed);
            this._newSongButton.addEventListener("click", this._whenNewSongPressed);
            this._exportButton.addEventListener("click", this._openExportPrompt);
            this._volumeSlider.addEventListener("input", this._setVolumeSlider);
            this._instrumentTypeHint.addEventListener("click", this._openInstrumentTypePrompt);
            this._chorusHint.addEventListener("click", this._openChorusPrompt);
            this._editorBox.addEventListener("mousedown", this._refocusStage);
            this.mainLayer.addEventListener("keydown", this._whenKeyPressed);
            if (isMobile)
                this._optionsMenu.children[1].disabled = true;
        }
        SongEditor.prototype._openPrompt = function (promptName) {
            this._doc.openPrompt(promptName);
            this._setPrompt(promptName);
        };
        SongEditor.prototype._setPrompt = function (promptName) {
            if (this.prompt) {
                if (this._wasPlaying)
                    this._play();
                this._wasPlaying = false;
                this._promptContainer.style.display = "none";
                this._promptContainer.removeChild(this.prompt.container);
                this.prompt.cleanUp();
                this.prompt = null;
                this.mainLayer.focus();
            }
            if (promptName) {
                switch (promptName) {
                    case "export":
                        this.prompt = new beepbox.ExportPrompt(this._doc, this);
                        break;
                    case "import":
                        this.prompt = new beepbox.ImportPrompt(this._doc, this);
                        break;
                    case "duration":
                        this.prompt = new beepbox.SongDurationPrompt(this._doc, this);
                        break;
                    case "instrumentType":
                        this.prompt = new beepbox.InstrumentTypePrompt(this._doc, this);
                        break;
                    case "chorus":
                        this.prompt = new beepbox.ChorusPrompt(this._doc, this);
                        break;
                    default:
                        throw new Error("Unrecognized prompt type.");
                }
                if (this.prompt) {
                    this._wasPlaying = this._doc.synth.playing;
                    this._pause();
                    this._promptContainer.style.display = null;
                    this._promptContainer.appendChild(this.prompt.container);
                }
            }
        };
        SongEditor.prototype.updatePlayButton = function () {
            if (this._doc.synth.playing) {
                this._playButton.classList.remove("playButton");
                this._playButton.classList.add("pauseButton");
                this._playButton.title = "Pause (Space)";
                this._playButton.innerText = "Pause";
            }
            else {
                this._playButton.classList.remove("pauseButton");
                this._playButton.classList.add("playButton");
                this._playButton.title = "Play (Space)";
                this._playButton.innerText = "Play";
            }
        };
        SongEditor.prototype._play = function () {
            this._doc.synth.play();
            this.updatePlayButton();
        };
        SongEditor.prototype._pause = function () {
            this._doc.synth.pause();
            if (this._doc.autoFollow) {
                this._doc.synth.snapToBar(this._doc.bar);
            }
            else {
                this._doc.synth.snapToBar();
            }
            this.updatePlayButton();
        };
        SongEditor.prototype._copy = function () {
            var pattern = this._doc.getCurrentPattern();
            if (pattern == null)
                return;
            var patternCopy = {
                notes: pattern.notes,
                beatsPerBar: this._doc.song.beatsPerBar,
                partsPerBeat: this._doc.song.partsPerBeat,
                drums: this._doc.song.getChannelIsDrum(this._doc.channel),
            };
            window.localStorage.setItem("patternCopy", JSON.stringify(patternCopy));
        };
        SongEditor.prototype._paste = function () {
            var pattern = this._doc.getCurrentPattern();
            if (pattern == null)
                return;
            var patternCopy = JSON.parse(String(window.localStorage.getItem("patternCopy")));
            if (patternCopy != null && patternCopy.drums == this._doc.song.getChannelIsDrum(this._doc.channel)) {
                this._doc.record(new beepbox.ChangePaste(this._doc, pattern, patternCopy.notes, patternCopy.beatsPerBar, patternCopy.partsPerBeat));
            }
        };
        SongEditor.prototype._transpose = function (upward) {
            var pattern = this._doc.getCurrentPattern();
            if (pattern == null)
                return;
            var canReplaceLastChange = this._doc.lastChangeWas(this._changeTranspose);
            this._changeTranspose = new beepbox.ChangeTranspose(this._doc, pattern, upward);
            this._doc.record(this._changeTranspose, canReplaceLastChange);
        };
        return SongEditor;
    }());
    beepbox.SongEditor = SongEditor;
    var doc = new beepbox.SongDocument(location.hash);
    var editor = new SongEditor(doc);
    var beepboxEditorContainer = document.getElementById("beepboxEditorContainer");
    beepboxEditorContainer.appendChild(editor.mainLayer);
    editor.whenUpdated();
    editor.mainLayer.focus();
    if (!isMobile && doc.autoPlay) {
        function autoplay() {
            if (!document.hidden) {
                doc.synth.play();
                editor.updatePlayButton();
                window.removeEventListener("visibilitychange", autoplay);
            }
        }
        if (document.hidden) {
            window.addEventListener("visibilitychange", autoplay);
        }
        else {
            autoplay();
        }
    }
    if ("scrollRestoration" in history)
        history.scrollRestoration = "manual";
    editor.updatePlayButton();
})(beepbox || (beepbox = {}));
