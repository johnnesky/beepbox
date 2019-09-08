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
