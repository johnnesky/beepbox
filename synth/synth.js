// Copyright (C) 2019 John Nesky, distributed under the MIT license.
/// <reference path="SynthConfig.ts" />
/// <reference path="FFT.ts" />
/// <reference path="Deque.ts" />
var beepbox;
(function (beepbox) {
    // For performance debugging:
    //let samplesAccumulated: number = 0;
    //let samplePerformance: number = 0;
    const base64IntToCharCode = [48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 97, 98, 99, 100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118, 119, 120, 121, 122, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 45, 95];
    const base64CharCodeToInt = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 62, 62, 0, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0, 0, 0, 0, 0, 0, 0, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 0, 0, 0, 0, 63, 0, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 0, 0, 0, 0, 0]; // 62 could be represented by either "-" or "." for historical reasons. New songs should use "-".
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
            this._bits = [];
        }
        write(bitCount, value) {
            bitCount--;
            while (bitCount >= 0) {
                this._bits.push((value >>> bitCount) & 1);
                bitCount--;
            }
        }
        writeLongTail(minValue, minBits, value) {
            if (value < minValue)
                throw new Error("value out of bounds");
            value -= minValue;
            let numBits = minBits;
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
        }
        writePartDuration(value) {
            this.writeLongTail(1, 3, value);
        }
        writePinCount(value) {
            this.writeLongTail(1, 0, value);
        }
        writePitchInterval(value) {
            if (value < 0) {
                this.write(1, 1); // sign
                this.writeLongTail(1, 3, -value);
            }
            else {
                this.write(1, 0); // sign
                this.writeLongTail(1, 3, value);
            }
        }
        concat(other) {
            this._bits = this._bits.concat(other._bits);
        }
        encodeBase64(buffer) {
            for (let i = 0; i < this._bits.length; i += 6) {
                const value = (this._bits[i] << 5) | (this._bits[i + 1] << 4) | (this._bits[i + 2] << 3) | (this._bits[i + 3] << 2) | (this._bits[i + 4] << 1) | this._bits[i + 5];
                buffer.push(base64IntToCharCode[value]);
            }
            return buffer;
        }
        lengthBase64() {
            return Math.ceil(this._bits.length / 6);
        }
    }
    function makeNotePin(interval, time, volume) {
        return { interval: interval, time: time, volume: volume };
    }
    beepbox.makeNotePin = makeNotePin;
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
    }
    beepbox.Note = Note;
    class Pattern {
        constructor() {
            this.notes = [];
            this.instrument = 0;
        }
        cloneNotes() {
            const result = [];
            for (const oldNote of this.notes) {
                const newNote = new Note(-1, oldNote.start, oldNote.end, 6);
                newNote.pitches = oldNote.pitches.concat();
                newNote.pins = [];
                for (const oldPin of oldNote.pins) {
                    newNote.pins.push(makeNotePin(oldPin.interval, oldPin.time, oldPin.volume));
                }
                result.push(newNote);
            }
            return result;
        }
        reset() {
            this.notes.length = 0;
            this.instrument = 0;
        }
    }
    beepbox.Pattern = Pattern;
    class Operator {
        constructor(index) {
            this.frequency = 0;
            this.amplitude = 0;
            this.envelope = 0;
            this.reset(index);
        }
        reset(index) {
            this.frequency = 0;
            this.amplitude = (index <= 1) ? beepbox.Config.operatorAmplitudeMax : 0;
            this.envelope = (index == 0) ? 0 : 1;
        }
        copy(other) {
            this.frequency = other.frequency;
            this.amplitude = other.amplitude;
            this.envelope = other.envelope;
        }
    }
    beepbox.Operator = Operator;
    class SpectrumWave {
        constructor(isNoiseChannel) {
            this.spectrum = [];
            this._wave = null;
            this._waveIsReady = false;
            this.reset(isNoiseChannel);
        }
        reset(isNoiseChannel) {
            for (let i = 0; i < beepbox.Config.spectrumControlPoints; i++) {
                if (isNoiseChannel) {
                    this.spectrum[i] = Math.round(beepbox.Config.spectrumMax * (1 / Math.sqrt(1 + i / 3)));
                }
                else {
                    const isHarmonic = i == 0 || i == 7 || i == 11 || i == 14 || i == 16 || i == 18 || i == 21 || i == 23 || i >= 25;
                    this.spectrum[i] = isHarmonic ? Math.max(0, Math.round(beepbox.Config.spectrumMax * (1 - i / 30))) : 0;
                }
            }
            this._waveIsReady = false;
        }
        markCustomWaveDirty() {
            this._waveIsReady = false;
        }
        getCustomWave(lowestOctave) {
            if (!this._waveIsReady || this._wave == null) {
                let waveLength = beepbox.Config.chipNoiseLength;
                if (this._wave == null || this._wave.length != waveLength + 1) {
                    this._wave = new Float32Array(waveLength + 1);
                }
                const wave = this._wave;
                for (let i = 0; i < waveLength; i++) {
                    wave[i] = 0;
                }
                const highestOctave = 14;
                const falloffRatio = 0.25;
                // Nudge the 2/7 and 4/7 control points so that they form harmonic intervals.
                const pitchTweak = [0, 1 / 7, Math.log(5 / 4) / Math.LN2, 3 / 7, Math.log(3 / 2) / Math.LN2, 5 / 7, 6 / 7];
                function controlPointToOctave(point) {
                    return lowestOctave + Math.floor(point / beepbox.Config.spectrumControlPointsPerOctave) + pitchTweak[(point + beepbox.Config.spectrumControlPointsPerOctave) % beepbox.Config.spectrumControlPointsPerOctave];
                }
                let combinedAmplitude = 1;
                for (let i = 0; i < beepbox.Config.spectrumControlPoints + 1; i++) {
                    const value1 = (i <= 0) ? 0 : this.spectrum[i - 1];
                    const value2 = (i >= beepbox.Config.spectrumControlPoints) ? this.spectrum[beepbox.Config.spectrumControlPoints - 1] : this.spectrum[i];
                    const octave1 = controlPointToOctave(i - 1);
                    let octave2 = controlPointToOctave(i);
                    if (i >= beepbox.Config.spectrumControlPoints)
                        octave2 = highestOctave + (octave2 - highestOctave) * falloffRatio;
                    if (value1 == 0 && value2 == 0)
                        continue;
                    combinedAmplitude += 0.02 * beepbox.drawNoiseSpectrum(wave, octave1, octave2, value1 / beepbox.Config.spectrumMax, value2 / beepbox.Config.spectrumMax, -0.5);
                }
                if (this.spectrum[beepbox.Config.spectrumControlPoints - 1] > 0) {
                    combinedAmplitude += 0.02 * beepbox.drawNoiseSpectrum(wave, highestOctave + (controlPointToOctave(beepbox.Config.spectrumControlPoints) - highestOctave) * falloffRatio, highestOctave, this.spectrum[beepbox.Config.spectrumControlPoints - 1] / beepbox.Config.spectrumMax, 0, -0.5);
                }
                beepbox.inverseRealFourierTransform(wave, waveLength);
                beepbox.scaleElementsByFactor(wave, 5.0 / (Math.sqrt(waveLength) * Math.pow(combinedAmplitude, 0.75)));
                // Duplicate the first sample at the end for easier wrap-around interpolation.
                wave[waveLength] = wave[0];
                this._waveIsReady = true;
            }
            return this._wave;
        }
    }
    beepbox.SpectrumWave = SpectrumWave;
    class HarmonicsWave {
        constructor() {
            this.harmonics = [];
            this._wave = null;
            this._waveIsReady = false;
            this.reset();
        }
        reset() {
            for (let i = 0; i < beepbox.Config.harmonicsControlPoints; i++) {
                this.harmonics[i] = 0;
            }
            this.harmonics[0] = beepbox.Config.harmonicsMax;
            this.harmonics[3] = beepbox.Config.harmonicsMax;
            this.harmonics[6] = beepbox.Config.harmonicsMax;
            this._waveIsReady = false;
        }
        markCustomWaveDirty() {
            this._waveIsReady = false;
        }
        getCustomWave() {
            if (!this._waveIsReady || this._wave == null) {
                let waveLength = beepbox.Config.harmonicsWavelength;
                const retroWave = beepbox.getDrumWave(0);
                if (this._wave == null || this._wave.length != waveLength + 1) {
                    this._wave = new Float32Array(waveLength + 1);
                }
                const wave = this._wave;
                for (let i = 0; i < waveLength; i++) {
                    wave[i] = 0;
                }
                const overallSlope = -0.25;
                let combinedControlPointAmplitude = 1;
                for (let harmonicIndex = 0; harmonicIndex < beepbox.Config.harmonicsRendered; harmonicIndex++) {
                    const harmonicFreq = harmonicIndex + 1;
                    let controlValue = harmonicIndex < beepbox.Config.harmonicsControlPoints ? this.harmonics[harmonicIndex] : this.harmonics[beepbox.Config.harmonicsControlPoints - 1];
                    if (harmonicIndex >= beepbox.Config.harmonicsControlPoints) {
                        controlValue *= 1 - (harmonicIndex - beepbox.Config.harmonicsControlPoints) / (beepbox.Config.harmonicsRendered - beepbox.Config.harmonicsControlPoints);
                    }
                    const normalizedValue = controlValue / beepbox.Config.harmonicsMax;
                    let amplitude = Math.pow(2, controlValue - beepbox.Config.harmonicsMax + 1) * Math.sqrt(normalizedValue);
                    if (harmonicIndex < beepbox.Config.harmonicsControlPoints) {
                        combinedControlPointAmplitude += amplitude;
                    }
                    amplitude *= Math.pow(harmonicFreq, overallSlope);
                    // Multiple all the sine wave amplitudes by 1 or -1 based on the LFSR
                    // retro wave (effectively random) to avoid egregiously tall spikes.
                    amplitude *= retroWave[harmonicIndex + 589];
                    wave[waveLength - harmonicFreq] = amplitude;
                }
                beepbox.inverseRealFourierTransform(wave, waveLength);
                // Limit the maximum wave amplitude.
                const mult = 1 / Math.pow(combinedControlPointAmplitude, 0.7);
                // Perform the integral on the wave. The chipSynth will perform the derivative to get the original wave back but with antialiasing.
                let cumulative = 0;
                let wavePrev = 0;
                for (let i = 0; i < wave.length; i++) {
                    cumulative += wavePrev;
                    wavePrev = wave[i] * mult;
                    wave[i] = cumulative;
                }
                // The first sample should be zero, and we'll duplicate it at the end for easier interpolation.
                wave[waveLength] = wave[0];
                this._waveIsReady = true;
            }
            return this._wave;
        }
    }
    beepbox.HarmonicsWave = HarmonicsWave;
    class Instrument {
        constructor(isNoiseChannel, isModChannel) {
            this.type = 0 /* chip */;
            this.preset = 0;
            this.chipWave = 2;
            this.chipNoise = 1;
            this.filterCutoff = 12;
            this.filterResonance = 0;
            this.filterEnvelope = 1;
            this.transition = 1;
            this.vibrato = 0;
            this.interval = 0;
            this.effects = 0;
            this.chord = 1;
            this.volume = 0;
            this.pan = beepbox.Config.panCenter;
            this.pulseWidth = beepbox.Config.pulseWidthRange;
            this.pulseEnvelope = 1;
            this.algorithm = 0;
            this.feedbackType = 0;
            this.feedbackAmplitude = 0;
            this.feedbackEnvelope = 1;
            this.customChipWave = new Float64Array(64);
            this.customChipWaveIntegral = new Float64Array(65); // One extra element for wrap-around in chipSynth.
            this.operators = [];
            this.harmonicsWave = new HarmonicsWave();
            this.drumsetEnvelopes = [];
            this.drumsetSpectrumWaves = [];
            this.modChannels = [];
            this.modStatuses = [];
            this.modInstruments = [];
            this.modSettings = [];
            if (isModChannel) {
                for (let mod = 0; mod < beepbox.Config.modCount; mod++) {
                    this.modChannels.push(0);
                    this.modStatuses.push(ModStatus.msNone);
                    this.modInstruments.push(0);
                    this.modSettings.push(ModSetting.mstNone);
                }
            }
            this.spectrumWave = new SpectrumWave(isNoiseChannel);
            for (let i = 0; i < beepbox.Config.operatorCount; i++) {
                this.operators[i] = new Operator(i);
            }
            for (let i = 0; i < beepbox.Config.drumCount; i++) {
                this.drumsetEnvelopes[i] = beepbox.Config.envelopes.dictionary["twang 2"].index;
                this.drumsetSpectrumWaves[i] = new SpectrumWave(true);
            }
            for (let i = 0; i < 64; i++) {
                this.customChipWave[i] = 24 - Math.floor(i * (48 / 64));
            }
            let sum = 0.0;
            for (let i = 0; i < this.customChipWave.length; i++) {
                sum += this.customChipWave[i];
            }
            const average = sum / this.customChipWave.length;
            // Perform the integral on the wave. The chipSynth will perform the derivative to get the original wave back but with antialiasing.
            let cumulative = 0;
            let wavePrev = 0;
            for (let i = 0; i < this.customChipWave.length; i++) {
                cumulative += wavePrev;
                wavePrev = this.customChipWave[i] - average;
                this.customChipWaveIntegral[i] = cumulative;
            }
            // 65th, last sample is for anti-aliasing
            this.customChipWaveIntegral[64] = 0.0;
        }
        setTypeAndReset(type, isNoiseChannel, isModChannel) {
            // Mod channels are forced to one type.
            if (isModChannel)
                type = 8 /* mod */;
            this.type = type;
            this.preset = type;
            this.volume = 0;
            this.pan = beepbox.Config.panCenter;
            switch (type) {
                case 0 /* chip */:
                    this.chipWave = 2;
                    this.filterCutoff = 6;
                    this.filterResonance = 0;
                    this.filterEnvelope = beepbox.Config.envelopes.dictionary["steady"].index;
                    this.transition = 1;
                    this.vibrato = 0;
                    this.interval = 0;
                    this.effects = 1;
                    this.chord = 2;
                    break;
                case 7 /* customChipWave */:
                    this.chipWave = 2;
                    this.filterCutoff = 6;
                    this.filterResonance = 0;
                    this.filterEnvelope = beepbox.Config.envelopes.dictionary["steady"].index;
                    this.transition = 1;
                    this.vibrato = 0;
                    this.interval = 0;
                    this.effects = 1;
                    this.chord = 2;
                    for (let i = 0; i < 64; i++) {
                        this.customChipWave[i] = 24 - (Math.floor(i * (48 / 64)));
                    }
                    let sum = 0.0;
                    for (let i = 0; i < this.customChipWave.length; i++) {
                        sum += this.customChipWave[i];
                    }
                    const average = sum / this.customChipWave.length;
                    // Perform the integral on the wave. The chipSynth will perform the derivative to get the original wave back but with antialiasing.
                    let cumulative = 0;
                    let wavePrev = 0;
                    for (let i = 0; i < this.customChipWave.length; i++) {
                        cumulative += wavePrev;
                        wavePrev = this.customChipWave[i] - average;
                        this.customChipWaveIntegral[i] = cumulative;
                    }
                    this.customChipWaveIntegral[64] = 0.0;
                    break;
                case 1 /* fm */:
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
                    this.feedbackEnvelope = beepbox.Config.envelopes.dictionary["steady"].index;
                    for (let i = 0; i < this.operators.length; i++) {
                        this.operators[i].reset(i);
                    }
                    break;
                case 2 /* noise */:
                    this.chipNoise = 1;
                    this.transition = 1;
                    this.effects = 0;
                    this.chord = 2;
                    this.filterCutoff = 10;
                    this.filterResonance = 0;
                    this.filterEnvelope = beepbox.Config.envelopes.dictionary["steady"].index;
                    break;
                case 3 /* spectrum */:
                    this.transition = 1;
                    this.effects = 1;
                    this.chord = 0;
                    this.filterCutoff = 10;
                    this.filterResonance = 0;
                    this.filterEnvelope = beepbox.Config.envelopes.dictionary["steady"].index;
                    this.spectrumWave.reset(isNoiseChannel);
                    break;
                case 4 /* drumset */:
                    this.effects = 0;
                    for (let i = 0; i < beepbox.Config.drumCount; i++) {
                        this.drumsetEnvelopes[i] = beepbox.Config.envelopes.dictionary["twang 2"].index;
                        if (this.drumsetSpectrumWaves[i] == undefined) {
                            this.drumsetSpectrumWaves[i] = new SpectrumWave(true);
                        }
                        this.drumsetSpectrumWaves[i].reset(isNoiseChannel);
                    }
                    break;
                case 5 /* harmonics */:
                    this.filterCutoff = 10;
                    this.filterResonance = 0;
                    this.filterEnvelope = beepbox.Config.envelopes.dictionary["steady"].index;
                    this.transition = 1;
                    this.vibrato = 0;
                    this.interval = 0;
                    this.effects = 1;
                    this.chord = 0;
                    this.harmonicsWave.reset();
                    break;
                case 6 /* pwm */:
                    this.filterCutoff = 10;
                    this.filterResonance = 0;
                    this.filterEnvelope = beepbox.Config.envelopes.dictionary["steady"].index;
                    this.transition = 1;
                    this.vibrato = 0;
                    this.interval = 0;
                    this.effects = 1;
                    this.chord = 2;
                    this.pulseWidth = beepbox.Config.pulseWidthRange;
                    this.pulseEnvelope = beepbox.Config.envelopes.dictionary["twang 2"].index;
                    break;
                case 8 /* mod */:
                    this.transition = 0;
                    this.vibrato = 0;
                    this.interval = 0;
                    this.effects = 0;
                    this.chord = 0;
                    this.modChannels = [];
                    this.modStatuses = [];
                    this.modInstruments = [];
                    this.modSettings = [];
                    for (let mod = 0; mod < beepbox.Config.modCount; mod++) {
                        this.modChannels.push(0);
                        this.modStatuses.push(ModStatus.msNone);
                        this.modInstruments.push(0);
                        this.modSettings.push(ModSetting.mstNone);
                    }
                    break;
                default:
                    throw new Error("Unrecognized instrument type: " + type);
            }
        }
        toJsonObject() {
            const instrumentObject = {
                "type": beepbox.Config.instrumentTypeNames[this.type],
                "volume": this.volume,
                "pan": (this.pan - beepbox.Config.panCenter) * 100 / beepbox.Config.panCenter,
                "effects": beepbox.Config.effectsNames[this.effects],
            };
            if (this.preset != this.type) {
                instrumentObject["preset"] = this.preset;
            }
            if (this.type != 4 /* drumset */) {
                instrumentObject["transition"] = beepbox.Config.transitions[this.transition].name;
                instrumentObject["chord"] = this.getChord().name;
                instrumentObject["filterCutoffHz"] = Math.round(beepbox.Config.filterCutoffMaxHz * Math.pow(2.0, this.getFilterCutoffOctaves()));
                instrumentObject["filterResonance"] = Math.round(100 * this.filterResonance / (beepbox.Config.filterResonanceRange - 1));
                instrumentObject["filterEnvelope"] = this.getFilterEnvelope().name;
            }
            if (this.type == 2 /* noise */) {
                instrumentObject["wave"] = beepbox.Config.chipNoises[this.chipNoise].name;
            }
            else if (this.type == 3 /* spectrum */) {
                instrumentObject["spectrum"] = [];
                for (let i = 0; i < beepbox.Config.spectrumControlPoints; i++) {
                    instrumentObject["spectrum"][i] = Math.round(100 * this.spectrumWave.spectrum[i] / beepbox.Config.spectrumMax);
                }
            }
            else if (this.type == 4 /* drumset */) {
                instrumentObject["drums"] = [];
                for (let j = 0; j < beepbox.Config.drumCount; j++) {
                    const spectrum = [];
                    for (let i = 0; i < beepbox.Config.spectrumControlPoints; i++) {
                        spectrum[i] = Math.round(100 * this.drumsetSpectrumWaves[j].spectrum[i] / beepbox.Config.spectrumMax);
                    }
                    instrumentObject["drums"][j] = {
                        "filterEnvelope": this.getDrumsetEnvelope(j).name,
                        "spectrum": spectrum,
                    };
                }
            }
            else if (this.type == 0 /* chip */) {
                instrumentObject["wave"] = beepbox.Config.chipWaves[this.chipWave].name;
                instrumentObject["interval"] = beepbox.Config.intervals[this.interval].name;
                instrumentObject["vibrato"] = beepbox.Config.vibratos[this.vibrato].name;
            }
            else if (this.type == 7 /* customChipWave */) {
                instrumentObject["wave"] = beepbox.Config.chipWaves[this.chipWave].name;
                instrumentObject["interval"] = beepbox.Config.intervals[this.interval].name;
                instrumentObject["vibrato"] = beepbox.Config.vibratos[this.vibrato].name;
                instrumentObject["customChipWave"] = new Float64Array(64);
                instrumentObject["customChipWaveIntegral"] = new Float64Array(65);
                for (let i = 0; i < this.customChipWave.length; i++) {
                    instrumentObject["customChipWave"][i] = this.customChipWave[i];
                    // Meh, waste of space and can be inaccurate. It will be recalc'ed when instrument loads.
                    //instrumentObject["customChipWaveIntegral"][i] = this.customChipWaveIntegral[i];
                }
                instrumentObject["customChipWaveIntegral"][64] = 0;
            }
            else if (this.type == 6 /* pwm */) {
                instrumentObject["pulseWidth"] = this.pulseWidth;
                instrumentObject["pulseEnvelope"] = beepbox.Config.envelopes[this.pulseEnvelope].name;
                instrumentObject["vibrato"] = beepbox.Config.vibratos[this.vibrato].name;
            }
            else if (this.type == 5 /* harmonics */) {
                instrumentObject["interval"] = beepbox.Config.intervals[this.interval].name;
                instrumentObject["vibrato"] = beepbox.Config.vibratos[this.vibrato].name;
                instrumentObject["harmonics"] = [];
                for (let i = 0; i < beepbox.Config.harmonicsControlPoints; i++) {
                    instrumentObject["harmonics"][i] = Math.round(100 * this.harmonicsWave.harmonics[i] / beepbox.Config.harmonicsMax);
                }
            }
            else if (this.type == 1 /* fm */) {
                const operatorArray = [];
                for (const operator of this.operators) {
                    operatorArray.push({
                        "frequency": beepbox.Config.operatorFrequencies[operator.frequency].name,
                        "amplitude": operator.amplitude,
                        "envelope": beepbox.Config.envelopes[operator.envelope].name,
                    });
                }
                instrumentObject["vibrato"] = beepbox.Config.vibratos[this.vibrato].name;
                instrumentObject["algorithm"] = beepbox.Config.algorithms[this.algorithm].name;
                instrumentObject["feedbackType"] = beepbox.Config.feedbacks[this.feedbackType].name;
                instrumentObject["feedbackAmplitude"] = this.feedbackAmplitude;
                instrumentObject["feedbackEnvelope"] = beepbox.Config.envelopes[this.feedbackEnvelope].name;
                instrumentObject["operators"] = operatorArray;
            }
            else if (this.type == 8 /* mod */) {
                instrumentObject["modChannels"] = [];
                instrumentObject["modInstruments"] = [];
                instrumentObject["modSettings"] = [];
                instrumentObject["modStatuses"] = [];
                for (let mod = 0; mod < beepbox.Config.modCount; mod++) {
                    instrumentObject["modChannels"][mod] = this.modChannels[mod];
                    instrumentObject["modInstruments"][mod] = this.modInstruments[mod];
                    instrumentObject["modSettings"][mod] = this.modSettings[mod];
                    instrumentObject["modStatuses"][mod] = this.modStatuses[mod];
                }
            }
            else {
                throw new Error("Unrecognized instrument type");
            }
            return instrumentObject;
        }
        fromJsonObject(instrumentObject, isNoiseChannel, isModChannel) {
            if (instrumentObject == undefined)
                instrumentObject = {};
            let type = beepbox.Config.instrumentTypeNames.indexOf(instrumentObject["type"]);
            if (type == -1)
                type = isModChannel ? 8 /* mod */ : (isNoiseChannel ? 2 /* noise */ : 0 /* chip */);
            this.setTypeAndReset(type, isNoiseChannel, isModChannel);
            if (instrumentObject["preset"] != undefined) {
                this.preset = instrumentObject["preset"] >>> 0;
            }
            if (instrumentObject["volume"] != undefined) {
                this.volume = clamp(-beepbox.Config.volumeRange / 2, beepbox.Config.volumeRange / 2, instrumentObject["volume"] | 0);
            }
            else {
                this.volume = 0;
            }
            if (instrumentObject["pan"] != undefined) {
                this.pan = clamp(0, beepbox.Config.panMax + 1, Math.round(beepbox.Config.panCenter + (instrumentObject["pan"] | 0) * beepbox.Config.panCenter / 100));
            }
            else {
                this.pan = beepbox.Config.panCenter;
            }
            const oldTransitionNames = { "binary": 0, "sudden": 1, "smooth": 2 };
            const transitionObject = instrumentObject["transition"] || instrumentObject["envelope"]; // the transition property used to be called envelope, so try that too.
            this.transition = oldTransitionNames[transitionObject] != undefined ? oldTransitionNames[transitionObject] : beepbox.Config.transitions.findIndex(transition => transition.name == transitionObject);
            if (this.transition == -1)
                this.transition = 1;
            this.effects = beepbox.Config.effectsNames.indexOf(instrumentObject["effects"]);
            if (this.effects == -1)
                this.effects = (this.type == 2 /* noise */) ? 0 : 1;
            if (instrumentObject["filterCutoffHz"] != undefined) {
                this.filterCutoff = clamp(0, beepbox.Config.filterCutoffRange, Math.round((beepbox.Config.filterCutoffRange - 1) + 2.0 * Math.log((instrumentObject["filterCutoffHz"] | 0) / beepbox.Config.filterCutoffMaxHz) / Math.LN2));
            }
            else {
                this.filterCutoff = (this.type == 0 /* chip */) ? 6 : 10;
            }
            if (instrumentObject["filterResonance"] != undefined) {
                this.filterResonance = clamp(0, beepbox.Config.filterResonanceRange, Math.round((beepbox.Config.filterResonanceRange - 1) * (instrumentObject["filterResonance"] | 0) / 100));
            }
            else {
                this.filterResonance = 0;
            }
            this.filterEnvelope = beepbox.Config.envelopes.findIndex(envelope => envelope.name == instrumentObject["filterEnvelope"]);
            if (this.filterEnvelope == -1)
                this.filterEnvelope = beepbox.Config.envelopes.dictionary["steady"].index;
            if (instrumentObject["filter"] != undefined) {
                const legacyToCutoff = [20, 12, 6, 0, 16, 10, 4];
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
            if (this.type == 2 /* noise */) {
                this.chipNoise = beepbox.Config.chipNoises.findIndex(wave => wave.name == instrumentObject["wave"]);
                if (this.chipNoise == -1)
                    this.chipNoise = 1;
                this.chord = beepbox.Config.chords.findIndex(chord => chord.name == instrumentObject["chord"]);
                if (this.chord == -1)
                    this.chord = 2;
            }
            else if (this.type == 3 /* spectrum */) {
                if (instrumentObject["spectrum"] != undefined) {
                    for (let i = 0; i < beepbox.Config.spectrumControlPoints; i++) {
                        this.spectrumWave.spectrum[i] = Math.max(0, Math.min(beepbox.Config.spectrumMax, Math.round(beepbox.Config.spectrumMax * (+instrumentObject["spectrum"][i]) / 100)));
                    }
                }
                this.chord = beepbox.Config.chords.findIndex(chord => chord.name == instrumentObject["chord"]);
                if (this.chord == -1)
                    this.chord = 0;
            }
            else if (this.type == 4 /* drumset */) {
                if (instrumentObject["drums"] != undefined) {
                    for (let j = 0; j < beepbox.Config.drumCount; j++) {
                        const drum = instrumentObject["drums"][j];
                        if (drum == undefined)
                            continue;
                        if (drum["filterEnvelope"] != undefined) {
                            this.drumsetEnvelopes[j] = beepbox.Config.envelopes.findIndex(envelope => envelope.name == drum["filterEnvelope"]);
                            if (this.drumsetEnvelopes[j] == -1)
                                this.drumsetEnvelopes[j] = beepbox.Config.envelopes.dictionary["twang 2"].index;
                        }
                        if (drum["spectrum"] != undefined) {
                            for (let i = 0; i < beepbox.Config.spectrumControlPoints; i++) {
                                this.drumsetSpectrumWaves[j].spectrum[i] = Math.max(0, Math.min(beepbox.Config.spectrumMax, Math.round(beepbox.Config.spectrumMax * (+drum["spectrum"][i]) / 100)));
                            }
                        }
                    }
                }
            }
            else if (this.type == 5 /* harmonics */) {
                if (instrumentObject["harmonics"] != undefined) {
                    for (let i = 0; i < beepbox.Config.harmonicsControlPoints; i++) {
                        this.harmonicsWave.harmonics[i] = Math.max(0, Math.min(beepbox.Config.harmonicsMax, Math.round(beepbox.Config.harmonicsMax * (+instrumentObject["harmonics"][i]) / 100)));
                    }
                }
                if (instrumentObject["interval"] != undefined) {
                    this.interval = beepbox.Config.intervals.findIndex(interval => interval.name == instrumentObject["interval"]);
                    if (this.interval == -1)
                        this.interval = 0;
                }
                if (instrumentObject["vibrato"] != undefined) {
                    this.vibrato = beepbox.Config.vibratos.findIndex(vibrato => vibrato.name == instrumentObject["vibrato"]);
                    if (this.vibrato == -1)
                        this.vibrato = 0;
                }
                this.chord = beepbox.Config.chords.findIndex(chord => chord.name == instrumentObject["chord"]);
                if (this.chord == -1)
                    this.chord = 0;
            }
            else if (this.type == 6 /* pwm */) {
                if (instrumentObject["pulseWidth"] != undefined) {
                    this.pulseWidth = clamp(0, beepbox.Config.pulseWidthRange + 1, instrumentObject["pulseWidth"]);
                }
                else {
                    this.pulseWidth = beepbox.Config.pulseWidthRange;
                }
                if (instrumentObject["pulseEnvelope"] != undefined) {
                    this.pulseEnvelope = beepbox.Config.envelopes.findIndex(envelope => envelope.name == instrumentObject["pulseEnvelope"]);
                    if (this.pulseEnvelope == -1)
                        this.pulseEnvelope = beepbox.Config.envelopes.dictionary["steady"].index;
                }
                if (instrumentObject["vibrato"] != undefined) {
                    this.vibrato = beepbox.Config.vibratos.findIndex(vibrato => vibrato.name == instrumentObject["vibrato"]);
                    if (this.vibrato == -1)
                        this.vibrato = 0;
                }
                this.chord = beepbox.Config.chords.findIndex(chord => chord.name == instrumentObject["chord"]);
                if (this.chord == -1)
                    this.chord = 0;
            }
            else if (this.type == 0 /* chip */) {
                const legacyWaveNames = { "triangle": 1, "square": 2, "pulse wide": 3, "pulse narrow": 4, "sawtooth": 5, "double saw": 6, "double pulse": 7, "spiky": 8, "plateau": 0 };
                this.chipWave = legacyWaveNames[instrumentObject["wave"]] != undefined ? legacyWaveNames[instrumentObject["wave"]] : beepbox.Config.chipWaves.findIndex(wave => wave.name == instrumentObject["wave"]);
                if (this.chipWave == -1)
                    this.chipWave = 1;
                if (instrumentObject["interval"] != undefined) {
                    this.interval = beepbox.Config.intervals.findIndex(interval => interval.name == instrumentObject["interval"]);
                    if (this.interval == -1)
                        this.interval = 0;
                }
                else if (instrumentObject["chorus"] != undefined) {
                    const legacyChorusNames = { "fifths": 5, "octaves": 6 };
                    this.interval = legacyChorusNames[instrumentObject["chorus"]] != undefined ? legacyChorusNames[instrumentObject["chorus"]] : beepbox.Config.intervals.findIndex(interval => interval.name == instrumentObject["chorus"]);
                    if (this.interval == -1)
                        this.interval = 0;
                }
                if (instrumentObject["vibrato"] != undefined) {
                    this.vibrato = beepbox.Config.vibratos.findIndex(vibrato => vibrato.name == instrumentObject["vibrato"]);
                    if (this.vibrato == -1)
                        this.vibrato = 0;
                }
                else if (instrumentObject["effect"] != undefined) {
                    this.vibrato = legacyEffectNames.indexOf(instrumentObject["effect"]);
                    if (this.vibrato == -1)
                        this.vibrato = 0;
                }
                this.chord = beepbox.Config.chords.findIndex(chord => chord.name == instrumentObject["chord"]);
                if (this.chord == -1)
                    this.chord = 2;
                // The original chorus setting had an option that now maps to two different settings. Override those if necessary.
                if (instrumentObject["chorus"] == "custom harmony") {
                    this.interval = 2;
                    this.chord = 3;
                }
            }
            else if (this.type == 1 /* fm */) {
                if (instrumentObject["vibrato"] != undefined) {
                    this.vibrato = beepbox.Config.vibratos.findIndex(vibrato => vibrato.name == instrumentObject["vibrato"]);
                    if (this.vibrato == -1)
                        this.vibrato = 0;
                }
                else if (instrumentObject["effect"] != undefined) {
                    this.vibrato = legacyEffectNames.indexOf(instrumentObject["effect"]);
                    if (this.vibrato == -1)
                        this.vibrato = 0;
                }
                this.chord = beepbox.Config.chords.findIndex(chord => chord.name == instrumentObject["chord"]);
                if (this.chord == -1)
                    this.chord = 3;
                this.algorithm = beepbox.Config.algorithms.findIndex(algorithm => algorithm.name == instrumentObject["algorithm"]);
                if (this.algorithm == -1)
                    this.algorithm = 0;
                this.feedbackType = beepbox.Config.feedbacks.findIndex(feedback => feedback.name == instrumentObject["feedbackType"]);
                if (this.feedbackType == -1)
                    this.feedbackType = 0;
                if (instrumentObject["feedbackAmplitude"] != undefined) {
                    this.feedbackAmplitude = clamp(0, beepbox.Config.operatorAmplitudeMax + 1, instrumentObject["feedbackAmplitude"] | 0);
                }
                else {
                    this.feedbackAmplitude = 0;
                }
                const legacyEnvelopeNames = { "pluck 1": 6, "pluck 2": 7, "pluck 3": 8 };
                this.feedbackEnvelope = legacyEnvelopeNames[instrumentObject["feedbackEnvelope"]] != undefined ? legacyEnvelopeNames[instrumentObject["feedbackEnvelope"]] : beepbox.Config.envelopes.findIndex(envelope => envelope.name == instrumentObject["feedbackEnvelope"]);
                if (this.feedbackEnvelope == -1)
                    this.feedbackEnvelope = 0;
                for (let j = 0; j < beepbox.Config.operatorCount; j++) {
                    const operator = this.operators[j];
                    let operatorObject = undefined;
                    if (instrumentObject["operators"])
                        operatorObject = instrumentObject["operators"][j];
                    if (operatorObject == undefined)
                        operatorObject = {};
                    operator.frequency = beepbox.Config.operatorFrequencies.findIndex(freq => freq.name == operatorObject["frequency"]);
                    if (operator.frequency == -1)
                        operator.frequency = 0;
                    if (operatorObject["amplitude"] != undefined) {
                        operator.amplitude = clamp(0, beepbox.Config.operatorAmplitudeMax + 1, operatorObject["amplitude"] | 0);
                    }
                    else {
                        operator.amplitude = 0;
                    }
                    operator.envelope = legacyEnvelopeNames[operatorObject["envelope"]] != undefined ? legacyEnvelopeNames[operatorObject["envelope"]] : beepbox.Config.envelopes.findIndex(envelope => envelope.name == operatorObject["envelope"]);
                    if (operator.envelope == -1)
                        operator.envelope = 0;
                }
            }
            else if (this.type == 7 /* customChipWave */) {
                if (instrumentObject["interval"] != undefined) {
                    this.interval = beepbox.Config.intervals.findIndex(interval => interval.name == instrumentObject["interval"]);
                    if (this.interval == -1)
                        this.interval = 0;
                }
                else if (instrumentObject["chorus"] != undefined) {
                    const legacyChorusNames = { "fifths": 5, "octaves": 6 };
                    this.interval = legacyChorusNames[instrumentObject["chorus"]] != undefined ? legacyChorusNames[instrumentObject["chorus"]] : beepbox.Config.intervals.findIndex(interval => interval.name == instrumentObject["chorus"]);
                    if (this.interval == -1)
                        this.interval = 0;
                }
                if (instrumentObject["vibrato"] != undefined) {
                    this.vibrato = beepbox.Config.vibratos.findIndex(vibrato => vibrato.name == instrumentObject["vibrato"]);
                    if (this.vibrato == -1)
                        this.vibrato = 0;
                }
                else if (instrumentObject["effect"] != undefined) {
                    this.vibrato = legacyEffectNames.indexOf(instrumentObject["effect"]);
                    if (this.vibrato == -1)
                        this.vibrato = 0;
                }
                this.chord = beepbox.Config.chords.findIndex(chord => chord.name == instrumentObject["chord"]);
                if (this.chord == -1)
                    this.chord = 2;
                // The original chorus setting had an option that now maps to two different settings. Override those if necessary.
                if (instrumentObject["chorus"] == "custom harmony") {
                    this.interval = 2;
                    this.chord = 3;
                }
                if (instrumentObject["customChipWave"]) {
                    for (let i = 0; i < 64; i++) {
                        this.customChipWave[i] = instrumentObject["customChipWave"][i];
                    }
                    let sum = 0.0;
                    for (let i = 0; i < this.customChipWave.length; i++) {
                        sum += this.customChipWave[i];
                    }
                    const average = sum / this.customChipWave.length;
                    // Perform the integral on the wave. The chipSynth will perform the derivative to get the original wave back but with antialiasing.
                    let cumulative = 0;
                    let wavePrev = 0;
                    for (let i = 0; i < this.customChipWave.length; i++) {
                        cumulative += wavePrev;
                        wavePrev = this.customChipWave[i] - average;
                        this.customChipWaveIntegral[i] = cumulative;
                    }
                    // 65th, last sample is for anti-aliasing
                    this.customChipWaveIntegral[64] = 0.0;
                }
            }
            else if (this.type == 8 /* mod */) {
                if (instrumentObject["modChannels"] != undefined) {
                    for (let mod = 0; mod < beepbox.Config.modCount; mod++) {
                        this.modChannels[mod] = instrumentObject["modChannels"][mod];
                        this.modInstruments[mod] = instrumentObject["modChannels"][mod];
                        this.modSettings[mod] = instrumentObject["modSettings"][mod];
                        this.modStatuses[mod] = instrumentObject["modStatuses"][mod];
                    }
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
            return Instrument.frequencyFromPitch(beepbox.Config.spectrumBasePitch + index * 6) / 44100;
        }
        static _drumsetIndexToSpectrumOctave(index) {
            return 15 + Math.log(Instrument.drumsetIndexReferenceDelta(index)) / Math.LN2;
        }
        warmUp() {
            if (this.type == 2 /* noise */) {
                beepbox.getDrumWave(this.chipNoise);
            }
            else if (this.type == 5 /* harmonics */) {
                this.harmonicsWave.getCustomWave();
            }
            else if (this.type == 3 /* spectrum */) {
                this.spectrumWave.getCustomWave(8);
            }
            else if (this.type == 4 /* drumset */) {
                for (let i = 0; i < beepbox.Config.drumCount; i++) {
                    this.drumsetSpectrumWaves[i].getCustomWave(Instrument._drumsetIndexToSpectrumOctave(i));
                }
            }
        }
        getDrumWave() {
            if (this.type == 2 /* noise */) {
                return beepbox.getDrumWave(this.chipNoise);
            }
            else if (this.type == 3 /* spectrum */) {
                return this.spectrumWave.getCustomWave(8);
            }
            else {
                throw new Error("Unhandled instrument type in getDrumWave");
            }
        }
        getDrumsetWave(pitch) {
            if (this.type == 4 /* drumset */) {
                return this.drumsetSpectrumWaves[pitch].getCustomWave(Instrument._drumsetIndexToSpectrumOctave(pitch));
            }
            else {
                throw new Error("Unhandled instrument type in getDrumWave");
            }
        }
        getTransition() {
            return this.type == 4 /* drumset */ ? beepbox.Config.transitions.dictionary["hard fade"] : beepbox.Config.transitions[this.transition];
        }
        getChord() {
            return this.type == 4 /* drumset */ ? beepbox.Config.chords.dictionary["harmony"] : beepbox.Config.chords[this.chord];
        }
        getFilterCutoffOctaves() {
            return this.type == 4 /* drumset */ ? 0 : (this.filterCutoff - (beepbox.Config.filterCutoffRange - 1)) * 0.5;
        }
        getFilterIsFirstOrder() {
            return this.type == 4 /* drumset */ ? false : this.filterResonance == 0;
        }
        getFilterResonance() {
            return this.type == 4 /* drumset */ ? 1 : this.filterResonance;
        }
        getFilterEnvelope() {
            if (this.type == 4 /* drumset */)
                throw new Error("Can't getFilterEnvelope() for drumset.");
            return beepbox.Config.envelopes[this.filterEnvelope];
        }
        getDrumsetEnvelope(pitch) {
            if (this.type != 4 /* drumset */)
                throw new Error("Can't getDrumsetEnvelope() for non-drumset.");
            return beepbox.Config.envelopes[this.drumsetEnvelopes[pitch]];
        }
    }
    beepbox.Instrument = Instrument;
    let ModStatus;
    (function (ModStatus) {
        ModStatus[ModStatus["msForPitch"] = 0] = "msForPitch";
        ModStatus[ModStatus["msForNoise"] = 1] = "msForNoise";
        ModStatus[ModStatus["msForSong"] = 2] = "msForSong";
        ModStatus[ModStatus["msNone"] = 3] = "msNone";
    })(ModStatus = beepbox.ModStatus || (beepbox.ModStatus = {}));
    let ModSetting;
    (function (ModSetting) {
        ModSetting[ModSetting["mstNone"] = 0] = "mstNone";
        ModSetting[ModSetting["mstSongVolume"] = 1] = "mstSongVolume";
        ModSetting[ModSetting["mstTempo"] = 2] = "mstTempo";
        ModSetting[ModSetting["mstReverb"] = 3] = "mstReverb";
        ModSetting[ModSetting["mstNextBar"] = 4] = "mstNextBar";
        ModSetting[ModSetting["mstInsVolume"] = 5] = "mstInsVolume";
        ModSetting[ModSetting["mstPan"] = 6] = "mstPan";
        ModSetting[ModSetting["mstFilterCut"] = 7] = "mstFilterCut";
        ModSetting[ModSetting["mstFilterPeak"] = 8] = "mstFilterPeak";
        ModSetting[ModSetting["mstFMSlider1"] = 9] = "mstFMSlider1";
        ModSetting[ModSetting["mstFMSlider2"] = 10] = "mstFMSlider2";
        ModSetting[ModSetting["mstFMSlider3"] = 11] = "mstFMSlider3";
        ModSetting[ModSetting["mstFMSlider4"] = 12] = "mstFMSlider4";
        ModSetting[ModSetting["mstFMFeedback"] = 13] = "mstFMFeedback";
        ModSetting[ModSetting["mstPulseWidth"] = 14] = "mstPulseWidth";
        ModSetting[ModSetting["mstMaxValue"] = 15] = "mstMaxValue";
    })(ModSetting = beepbox.ModSetting || (beepbox.ModSetting = {}));
    class Channel {
        constructor() {
            this.octave = 0;
            this.instruments = [];
            this.patterns = [];
            this.bars = [];
            this.muted = false;
        }
    }
    beepbox.Channel = Channel;
    class Song {
        constructor(string) {
            this.channels = [];
            this.mstMaxVols = new Map([
                [ModSetting.mstNone, 6],
                [ModSetting.mstSongVolume, 100],
                [ModSetting.mstTempo, beepbox.Config.tempoMax - beepbox.Config.tempoMin],
                [ModSetting.mstReverb, beepbox.Config.reverbRange - 1],
                [ModSetting.mstNextBar, 1],
                [ModSetting.mstInsVolume, beepbox.Config.volumeRange],
                [ModSetting.mstPan, beepbox.Config.panMax],
                [ModSetting.mstFilterCut, beepbox.Config.filterCutoffRange - 1],
                [ModSetting.mstFilterPeak, beepbox.Config.filterResonanceRange - 1],
                [ModSetting.mstFMSlider1, 15],
                [ModSetting.mstFMSlider2, 15],
                [ModSetting.mstFMSlider3, 15],
                [ModSetting.mstFMSlider4, 15],
                [ModSetting.mstFMFeedback, 15],
                [ModSetting.mstPulseWidth, beepbox.Config.pulseWidthRange],
            ]);
            if (string != undefined) {
                this.fromBase64String(string);
            }
            else {
                this.initToDefault(true);
            }
        }
        modValueToReal(value, setting) {
            switch (setting) {
                case ModSetting.mstTempo:
                    value += beepbox.Config.tempoMin;
                    //value = Math.round(value); // Very bad things happen when decimal BPMs are input, it seems.
                    break;
                case ModSetting.mstInsVolume:
                    value -= beepbox.Config.volumeRange / 2.0;
                    break;
                case ModSetting.mstFilterCut:
                case ModSetting.mstFilterPeak:
                case ModSetting.mstSongVolume:
                case ModSetting.mstPan:
                case ModSetting.mstReverb:
                case ModSetting.mstNextBar:
                case ModSetting.mstFMSlider1:
                case ModSetting.mstFMSlider2:
                case ModSetting.mstFMSlider3:
                case ModSetting.mstFMSlider4:
                case ModSetting.mstFMFeedback:
                case ModSetting.mstPulseWidth:
                case ModSetting.mstNone:
                default:
                    break;
            }
            return value;
        }
        isSettingForSong(setting) {
            switch (setting) {
                case ModSetting.mstTempo:
                case ModSetting.mstReverb:
                case ModSetting.mstSongVolume:
                case ModSetting.mstNextBar:
                    return true;
                default:
                    return false;
            }
        }
        realToModValue(value, setting) {
            switch (setting) {
                case ModSetting.mstTempo:
                    value -= beepbox.Config.tempoMin;
                    break;
                case ModSetting.mstInsVolume:
                    value += beepbox.Config.volumeRange / 2.0;
                    break;
                case ModSetting.mstFilterCut:
                case ModSetting.mstFilterPeak:
                case ModSetting.mstSongVolume:
                case ModSetting.mstPan:
                case ModSetting.mstReverb:
                case ModSetting.mstNextBar:
                case ModSetting.mstFMSlider1:
                case ModSetting.mstFMSlider2:
                case ModSetting.mstFMSlider3:
                case ModSetting.mstFMSlider4:
                case ModSetting.mstFMFeedback:
                case ModSetting.mstPulseWidth:
                case ModSetting.mstNone:
                default:
                    break;
            }
            return value;
        }
        getChannelCount() {
            return this.pitchChannelCount + this.noiseChannelCount + this.modChannelCount;
        }
        getChannelIsNoise(channel) {
            return (channel >= this.pitchChannelCount && channel < this.pitchChannelCount + this.noiseChannelCount);
        }
        getChannelIsMod(channel) {
            return (channel >= this.pitchChannelCount + this.noiseChannelCount);
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
            this.title = "Unnamed";
            document.title = beepbox.Config.versionDisplayName;
            if (andResetChannels) {
                this.pitchChannelCount = 3;
                this.noiseChannelCount = 1;
                this.modChannelCount = 0;
                for (let channelIndex = 0; channelIndex < this.getChannelCount(); channelIndex++) {
                    if (this.channels.length <= channelIndex) {
                        this.channels[channelIndex] = new Channel();
                    }
                    const channel = this.channels[channelIndex];
                    channel.octave = Math.max(3 - channelIndex, 0); // [3, 2, 1, 0, 0, ...]; Descending octaves with drums at zero in last channel and onward.
                    for (let pattern = 0; pattern < this.patternsPerChannel; pattern++) {
                        if (channel.patterns.length <= pattern) {
                            channel.patterns[pattern] = new Pattern();
                        }
                        else {
                            channel.patterns[pattern].reset();
                        }
                    }
                    channel.patterns.length = this.patternsPerChannel;
                    const isNoiseChannel = channelIndex >= this.pitchChannelCount && channelIndex < this.pitchChannelCount + this.noiseChannelCount;
                    const isModChannel = channelIndex >= this.pitchChannelCount + this.noiseChannelCount;
                    for (let instrument = 0; instrument < this.instrumentsPerChannel; instrument++) {
                        if (channel.instruments.length <= instrument) {
                            channel.instruments[instrument] = new Instrument(isNoiseChannel, isModChannel);
                        }
                        channel.instruments[instrument].setTypeAndReset(isModChannel ? 8 /* mod */ : (isNoiseChannel ? 2 /* noise */ : 0 /* chip */), isNoiseChannel, isModChannel);
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
            buffer.push(Song._variant);
            buffer.push(base64IntToCharCode[Song._latestJummBoxVersion]);
            buffer.push(78 /* songTitle */);
            // Length of the song name string
            var encodedSongTitle = encodeURIComponent(this.title);
            buffer.push(base64IntToCharCode[encodedSongTitle.length >> 6], base64IntToCharCode[encodedSongTitle.length & 0x3f]);
            // Actual encoded string follows
            for (let i = 0; i < encodedSongTitle.length; i++) {
                buffer.push(encodedSongTitle.charCodeAt(i));
            }
            buffer.push(110 /* channelCount */, base64IntToCharCode[this.pitchChannelCount], base64IntToCharCode[this.noiseChannelCount], base64IntToCharCode[this.modChannelCount]);
            buffer.push(115 /* scale */, base64IntToCharCode[this.scale]);
            buffer.push(107 /* key */, base64IntToCharCode[this.key]);
            buffer.push(108 /* loopStart */, base64IntToCharCode[this.loopStart >> 6], base64IntToCharCode[this.loopStart & 0x3f]);
            buffer.push(101 /* loopEnd */, base64IntToCharCode[(this.loopLength - 1) >> 6], base64IntToCharCode[(this.loopLength - 1) & 0x3f]);
            buffer.push(116 /* tempo */, base64IntToCharCode[this.tempo >> 6], base64IntToCharCode[this.tempo & 0x3F]);
            buffer.push(109 /* reverb */, base64IntToCharCode[this.reverb]);
            buffer.push(97 /* beatCount */, base64IntToCharCode[this.beatsPerBar - 1]);
            buffer.push(103 /* barCount */, base64IntToCharCode[(this.barCount - 1) >> 6], base64IntToCharCode[(this.barCount - 1) & 0x3f]);
            buffer.push(106 /* patternCount */, base64IntToCharCode[(this.patternsPerChannel - 1) >> 6], base64IntToCharCode[(this.patternsPerChannel - 1) & 0x3f]);
            buffer.push(105 /* instrumentCount */, base64IntToCharCode[this.instrumentsPerChannel - 1]);
            buffer.push(114 /* rhythm */, base64IntToCharCode[this.rhythm]);
            buffer.push(111 /* channelOctave */);
            for (let channel = 0; channel < this.getChannelCount(); channel++) {
                buffer.push(base64IntToCharCode[this.channels[channel].octave]);
            }
            for (let channel = 0; channel < this.getChannelCount(); channel++) {
                for (let i = 0; i < this.instrumentsPerChannel; i++) {
                    const instrument = this.channels[channel].instruments[i];
                    buffer.push(84 /* startInstrument */, base64IntToCharCode[instrument.type]);
                    buffer.push(118 /* volume */, base64IntToCharCode[(instrument.volume + beepbox.Config.volumeRange / 2) >> 6], base64IntToCharCode[(instrument.volume + beepbox.Config.volumeRange / 2) & 0x3f]);
                    buffer.push(76 /* panning */, base64IntToCharCode[instrument.pan >> 6], base64IntToCharCode[instrument.pan & 0x3f]);
                    buffer.push(117 /* preset */, base64IntToCharCode[instrument.preset >> 6], base64IntToCharCode[instrument.preset & 63]);
                    buffer.push(113 /* effects */, base64IntToCharCode[instrument.effects]);
                    if (instrument.type != 4 /* drumset */) {
                        buffer.push(100 /* transition */, base64IntToCharCode[instrument.transition]);
                        buffer.push(102 /* filterCutoff */, base64IntToCharCode[instrument.filterCutoff]);
                        buffer.push(121 /* filterResonance */, base64IntToCharCode[instrument.filterResonance]);
                        buffer.push(122 /* filterEnvelope */, base64IntToCharCode[instrument.filterEnvelope]);
                        buffer.push(67 /* chord */, base64IntToCharCode[instrument.chord]);
                    }
                    if (instrument.type == 0 /* chip */) {
                        buffer.push(119 /* wave */, base64IntToCharCode[instrument.chipWave]);
                        buffer.push(99 /* vibrato */, base64IntToCharCode[instrument.vibrato]);
                        buffer.push(104 /* interval */, base64IntToCharCode[instrument.interval]);
                    }
                    else if (instrument.type == 1 /* fm */) {
                        buffer.push(99 /* vibrato */, base64IntToCharCode[instrument.vibrato]);
                        buffer.push(65 /* algorithm */, base64IntToCharCode[instrument.algorithm]);
                        buffer.push(70 /* feedbackType */, base64IntToCharCode[instrument.feedbackType]);
                        buffer.push(66 /* feedbackAmplitude */, base64IntToCharCode[instrument.feedbackAmplitude]);
                        buffer.push(86 /* feedbackEnvelope */, base64IntToCharCode[instrument.feedbackEnvelope]);
                        buffer.push(81 /* operatorFrequencies */);
                        for (let o = 0; o < beepbox.Config.operatorCount; o++) {
                            buffer.push(base64IntToCharCode[instrument.operators[o].frequency]);
                        }
                        buffer.push(80 /* operatorAmplitudes */);
                        for (let o = 0; o < beepbox.Config.operatorCount; o++) {
                            buffer.push(base64IntToCharCode[instrument.operators[o].amplitude]);
                        }
                        buffer.push(69 /* operatorEnvelopes */);
                        for (let o = 0; o < beepbox.Config.operatorCount; o++) {
                            buffer.push(base64IntToCharCode[instrument.operators[o].envelope]);
                        }
                    }
                    else if (instrument.type == 7 /* customChipWave */) {
                        buffer.push(119 /* wave */, base64IntToCharCode[instrument.chipWave]);
                        buffer.push(99 /* vibrato */, base64IntToCharCode[instrument.vibrato]);
                        buffer.push(104 /* interval */, base64IntToCharCode[instrument.interval]);
                        buffer.push(77 /* customChipWave */);
                        // Push custom wave values
                        for (let j = 0; j < 64; j++) {
                            buffer.push(base64IntToCharCode[(instrument.customChipWave[j] + 24)]);
                        }
                    }
                    else if (instrument.type == 2 /* noise */) {
                        buffer.push(119 /* wave */, base64IntToCharCode[instrument.chipNoise]);
                    }
                    else if (instrument.type == 3 /* spectrum */) {
                        buffer.push(83 /* spectrum */);
                        const spectrumBits = new BitFieldWriter();
                        for (let i = 0; i < beepbox.Config.spectrumControlPoints; i++) {
                            spectrumBits.write(beepbox.Config.spectrumControlPointBits, instrument.spectrumWave.spectrum[i]);
                        }
                        spectrumBits.encodeBase64(buffer);
                    }
                    else if (instrument.type == 4 /* drumset */) {
                        buffer.push(122 /* filterEnvelope */);
                        for (let j = 0; j < beepbox.Config.drumCount; j++) {
                            buffer.push(base64IntToCharCode[instrument.drumsetEnvelopes[j]]);
                        }
                        buffer.push(83 /* spectrum */);
                        const spectrumBits = new BitFieldWriter();
                        for (let j = 0; j < beepbox.Config.drumCount; j++) {
                            for (let i = 0; i < beepbox.Config.spectrumControlPoints; i++) {
                                spectrumBits.write(beepbox.Config.spectrumControlPointBits, instrument.drumsetSpectrumWaves[j].spectrum[i]);
                            }
                        }
                        spectrumBits.encodeBase64(buffer);
                    }
                    else if (instrument.type == 5 /* harmonics */) {
                        buffer.push(99 /* vibrato */, base64IntToCharCode[instrument.vibrato]);
                        buffer.push(104 /* interval */, base64IntToCharCode[instrument.interval]);
                        buffer.push(72 /* harmonics */);
                        const harmonicsBits = new BitFieldWriter();
                        for (let i = 0; i < beepbox.Config.harmonicsControlPoints; i++) {
                            harmonicsBits.write(beepbox.Config.harmonicsControlPointBits, instrument.harmonicsWave.harmonics[i]);
                        }
                        harmonicsBits.encodeBase64(buffer);
                    }
                    else if (instrument.type == 6 /* pwm */) {
                        buffer.push(99 /* vibrato */, base64IntToCharCode[instrument.vibrato]);
                        buffer.push(87 /* pulseWidth */, base64IntToCharCode[instrument.pulseWidth], base64IntToCharCode[instrument.pulseEnvelope]);
                    }
                    else if (instrument.type == 8 /* mod */) {
                        // Handled down below. Could be moved, but meh.
                    }
                    else {
                        throw new Error("Unknown instrument type.");
                    }
                }
            }
            buffer.push(98 /* bars */);
            bits = new BitFieldWriter();
            let neededBits = 0;
            while ((1 << neededBits) < this.patternsPerChannel + 1)
                neededBits++;
            for (let channel = 0; channel < this.getChannelCount(); channel++)
                for (let i = 0; i < this.barCount; i++) {
                    bits.write(neededBits, this.channels[channel].bars[i]);
                }
            bits.encodeBase64(buffer);
            buffer.push(112 /* patterns */);
            bits = new BitFieldWriter();
            let neededInstrumentBits = 0;
            while ((1 << neededInstrumentBits) < this.instrumentsPerChannel)
                neededInstrumentBits++;
            for (let channel = 0; channel < this.getChannelCount(); channel++) {
                const isNoiseChannel = this.getChannelIsNoise(channel);
                const isModChannel = this.getChannelIsMod(channel);
                // Some info about modulator settings immediately follows in mod channels.
                if (isModChannel) {
                    for (let instrumentIndex = 0; instrumentIndex < this.instrumentsPerChannel; instrumentIndex++) {
                        let instrument = this.channels[channel].instruments[instrumentIndex];
                        for (let mod = 0; mod < beepbox.Config.modCount; mod++) {
                            const modStatus = instrument.modStatuses[mod];
                            const modChannel = instrument.modChannels[mod];
                            const modInstrument = instrument.modInstruments[mod];
                            const modSetting = instrument.modSettings[mod];
                            bits.write(2, modStatus);
                            // Channel/Instrument is only used if the status isn't "song" or "none".
                            if (modStatus == ModStatus.msForPitch || modStatus == ModStatus.msForNoise) {
                                bits.write(8, modChannel);
                                bits.write(neededInstrumentBits, modInstrument);
                            }
                            // Mod setting is only used if the status isn't "none".
                            if (modStatus != ModStatus.msNone) {
                                bits.write(6, modSetting);
                            }
                        }
                    }
                }
                const octaveOffset = (isNoiseChannel || isModChannel) ? 0 : this.channels[channel].octave * 12;
                let lastPitch = ((isNoiseChannel || isModChannel) ? 4 : 12) + octaveOffset;
                const recentPitches = isModChannel ? [0, 1, 2, 3, 4, 5] : (isNoiseChannel ? [4, 6, 7, 2, 3, 8, 0, 10] : [12, 19, 24, 31, 36, 7, 0]);
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
                            // For mod channels, a negative offset may be necessary.
                            if (note.start < curPart && isModChannel) {
                                bits.write(2, 0); // rest, then...
                                bits.write(1, 1); // negative offset
                                bits.writePartDuration(curPart - note.start);
                            }
                            if (note.start > curPart) {
                                bits.write(2, 0); // rest, then...
                                if (isModChannel)
                                    bits.write(1, 0); // positive offset, only needed for mod channels
                                bits.writePartDuration(note.start - curPart);
                            }
                            const shapeBits = new BitFieldWriter();
                            // 0: 1 pitch, 10: 2 pitches, 110: 3 pitches, 111: 4 pitches
                            for (let i = 1; i < note.pitches.length; i++)
                                shapeBits.write(1, 1);
                            if (note.pitches.length < 4)
                                shapeBits.write(1, 0);
                            shapeBits.writePinCount(note.pins.length - 1);
                            if (!isModChannel) {
                                shapeBits.write(3, note.pins[0].volume); // volume
                            }
                            else {
                                shapeBits.write(9, note.pins[0].volume); // Modulator value. 9 bits for now = 512 max mod value?
                            }
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
                                if (!isModChannel) {
                                    shapeBits.write(3, pin.volume); // volume
                                }
                                else {
                                    shapeBits.write(9, pin.volume); // Modulator value. 9 bits for now = 512 max mod value?
                                }
                            }
                            const shapeString = String.fromCharCode.apply(null, shapeBits.encodeBase64([]));
                            const shapeIndex = recentShapes.indexOf(shapeString);
                            if (shapeIndex == -1) {
                                bits.write(2, 1); // new shape
                                bits.concat(shapeBits);
                            }
                            else {
                                bits.write(1, 1); // old shape
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
                        if (curPart < this.beatsPerBar * beepbox.Config.partsPerBeat + (+isModChannel)) {
                            bits.write(2, 0); // rest, then...
                            if (isModChannel)
                                bits.write(1, 0); // positive offset
                            bits.writePartDuration(this.beatsPerBar * beepbox.Config.partsPerBeat + (+isModChannel) - curPart);
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
            Array.prototype.push.apply(buffer, digits); // append digits to buffer.
            bits.encodeBase64(buffer);
            const maxApplyArgs = 64000;
            if (buffer.length < maxApplyArgs) {
                // Note: Function.apply may break for long argument lists. 
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
            // skip whitespace.
            while (compressed.charCodeAt(charIndex) <= 32 /* SPACE */)
                charIndex++;
            // skip hash mark.
            if (compressed.charCodeAt(charIndex) == 35 /* HASH */)
                charIndex++;
            // if it starts with curly brace, treat it as JSON.
            if (compressed.charCodeAt(charIndex) == 123 /* LEFT_CURLY_BRACE */) {
                this.fromJsonObject(JSON.parse(charIndex == 0 ? compressed : compressed.substring(charIndex)));
                return;
            }
            const variantTest = compressed.charCodeAt(charIndex);
            var variant = "";
            // Detect variant here. If version doesn't match known variant, assume it is a vanilla string which does not report variant.
            if (variantTest == 0x6A) { //"j"
                variant = "jummbox";
                charIndex++;
            }
            else {
                variant = "beepbox";
            }
            const version = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
            if (variant == "beepbox" && (version == -1 || version > Song._latestBeepboxVersion || version < Song._oldestBeepboxVersion))
                return;
            if (variant == "jummbox" && (version == -1 || version > Song._latestJummBoxVersion || version < Song._oldestJummBoxVersion))
                return;
            const beforeTwo = version < 2;
            const beforeThree = version < 3;
            const beforeFour = version < 4;
            const beforeFive = version < 5;
            const beforeSix = version < 6;
            const beforeSeven = version < 7;
            const beforeEight = version < 8;
            this.initToDefault(variant == "beepbox" && beforeSix);
            if (beforeThree && variant == "beepbox") {
                // Originally, the only instrument transition was "seamless" and the only drum wave was "retro".
                for (const channel of this.channels)
                    channel.instruments[0].transition = 0;
                this.channels[3].instruments[0].chipNoise = 0;
            }
            let instrumentChannelIterator = 0;
            let instrumentIndexIterator = -1;
            while (charIndex < compressed.length) {
                const command = compressed.charCodeAt(charIndex++);
                let channel;
                if (command == 78 /* songTitle */) {
                    // Length of song name string
                    var songNameLength = (base64CharCodeToInt[compressed.charCodeAt(charIndex++)] << 6) + base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                    this.title = decodeURIComponent(compressed.substring(charIndex, charIndex + songNameLength));
                    document.title = this.title + " - " + beepbox.Config.versionDisplayName;
                    charIndex += songNameLength;
                }
                else if (command == 110 /* channelCount */) {
                    this.pitchChannelCount = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                    this.noiseChannelCount = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                    if (variant == "beepbox" || beforeTwo) {
                        // No mod channel support before jummbox v2
                        this.modChannelCount = 0;
                    }
                    else {
                        this.modChannelCount = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                    }
                    this.pitchChannelCount = clamp(beepbox.Config.pitchChannelCountMin, beepbox.Config.pitchChannelCountMax + 1, this.pitchChannelCount);
                    this.noiseChannelCount = clamp(beepbox.Config.noiseChannelCountMin, beepbox.Config.noiseChannelCountMax + 1, this.noiseChannelCount);
                    this.modChannelCount = clamp(beepbox.Config.modChannelCountMin, beepbox.Config.modChannelCountMax + 1, this.modChannelCount);
                    for (let channelIndex = this.channels.length; channelIndex < this.getChannelCount(); channelIndex++) {
                        this.channels[channelIndex] = new Channel();
                    }
                    this.channels.length = this.getChannelCount();
                    beepbox.ColorConfig.resetColors();
                }
                else if (command == 115 /* scale */) {
                    this.scale = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                    // All the scales were jumbled around by Jummbox. Just convert to free.
                    if (variant == "beepbox")
                        this.scale = 0;
                }
                else if (command == 107 /* key */) {
                    if (beforeSeven && variant == "beepbox") {
                        this.key = clamp(0, beepbox.Config.keys.length, 11 - base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                    }
                    else {
                        this.key = clamp(0, beepbox.Config.keys.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                    }
                }
                else if (command == 108 /* loopStart */) {
                    if (beforeFive && variant == "beepbox") {
                        this.loopStart = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                    }
                    else {
                        this.loopStart = (base64CharCodeToInt[compressed.charCodeAt(charIndex++)] << 6) + base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                    }
                }
                else if (command == 101 /* loopEnd */) {
                    if (beforeFive && variant == "beepbox") {
                        this.loopLength = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                    }
                    else {
                        this.loopLength = (base64CharCodeToInt[compressed.charCodeAt(charIndex++)] << 6) + base64CharCodeToInt[compressed.charCodeAt(charIndex++)] + 1;
                    }
                }
                else if (command == 116 /* tempo */) {
                    if (beforeFour && variant == "beepbox") {
                        this.tempo = [95, 120, 151, 190][base64CharCodeToInt[compressed.charCodeAt(charIndex++)]];
                    }
                    else if (beforeSeven && variant == "beepbox") {
                        this.tempo = [88, 95, 103, 111, 120, 130, 140, 151, 163, 176, 190, 206, 222, 240, 259][base64CharCodeToInt[compressed.charCodeAt(charIndex++)]];
                    }
                    else {
                        this.tempo = (base64CharCodeToInt[compressed.charCodeAt(charIndex++)] << 6) | (base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                    }
                    this.tempo = clamp(beepbox.Config.tempoMin, beepbox.Config.tempoMax + 1, this.tempo);
                }
                else if (command == 109 /* reverb */) {
                    if (variant == "beepbox") {
                        this.reverb = base64CharCodeToInt[compressed.charCodeAt(charIndex++)] * 8;
                        this.reverb = clamp(0, beepbox.Config.reverbRange, this.reverb);
                    }
                    else {
                        this.reverb = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                        this.reverb = clamp(0, beepbox.Config.reverbRange, this.reverb);
                    }
                }
                else if (command == 97 /* beatCount */) {
                    if (beforeThree && variant == "beepbox") {
                        this.beatsPerBar = [6, 7, 8, 9, 10][base64CharCodeToInt[compressed.charCodeAt(charIndex++)]];
                    }
                    else {
                        this.beatsPerBar = base64CharCodeToInt[compressed.charCodeAt(charIndex++)] + 1;
                    }
                    this.beatsPerBar = Math.max(beepbox.Config.beatsPerBarMin, Math.min(beepbox.Config.beatsPerBarMax, this.beatsPerBar));
                }
                else if (command == 103 /* barCount */) {
                    this.barCount = (base64CharCodeToInt[compressed.charCodeAt(charIndex++)] << 6) + base64CharCodeToInt[compressed.charCodeAt(charIndex++)] + 1;
                    this.barCount = Math.max(beepbox.Config.barCountMin, Math.min(beepbox.Config.barCountMax, this.barCount));
                    for (let channel = 0; channel < this.getChannelCount(); channel++) {
                        for (let bar = this.channels[channel].bars.length; bar < this.barCount; bar++) {
                            this.channels[channel].bars[bar] = (bar < 4) ? 1 : 0;
                        }
                        this.channels[channel].bars.length = this.barCount;
                    }
                }
                else if (command == 106 /* patternCount */) {
                    if (variant == "beepbox" && beforeEight) {
                        this.patternsPerChannel = base64CharCodeToInt[compressed.charCodeAt(charIndex++)] + 1;
                    }
                    else {
                        this.patternsPerChannel = (base64CharCodeToInt[compressed.charCodeAt(charIndex++)] << 6) + base64CharCodeToInt[compressed.charCodeAt(charIndex++)] + 1;
                    }
                    this.patternsPerChannel = Math.max(1, Math.min(beepbox.Config.barCountMax, this.patternsPerChannel));
                    for (let channel = 0; channel < this.getChannelCount(); channel++) {
                        for (let pattern = this.channels[channel].patterns.length; pattern < this.patternsPerChannel; pattern++) {
                            this.channels[channel].patterns[pattern] = new Pattern();
                        }
                        this.channels[channel].patterns.length = this.patternsPerChannel;
                    }
                }
                else if (command == 105 /* instrumentCount */) {
                    this.instrumentsPerChannel = base64CharCodeToInt[compressed.charCodeAt(charIndex++)] + 1;
                    this.instrumentsPerChannel = Math.max(beepbox.Config.instrumentsPerChannelMin, Math.min(beepbox.Config.instrumentsPerChannelMax, this.instrumentsPerChannel));
                    for (let channel = 0; channel < this.getChannelCount(); channel++) {
                        const isNoiseChannel = channel >= this.pitchChannelCount && channel < this.pitchChannelCount + this.noiseChannelCount;
                        const isModChannel = channel >= this.pitchChannelCount + this.noiseChannelCount;
                        for (let instrumentIndex = this.channels[channel].instruments.length; instrumentIndex < this.instrumentsPerChannel; instrumentIndex++) {
                            this.channels[channel].instruments[instrumentIndex] = new Instrument(isNoiseChannel, isModChannel);
                        }
                        this.channels[channel].instruments.length = this.instrumentsPerChannel;
                        if (beforeSix && variant == "beepbox") {
                            for (let instrumentIndex = 0; instrumentIndex < this.instrumentsPerChannel; instrumentIndex++) {
                                this.channels[channel].instruments[instrumentIndex].setTypeAndReset(isNoiseChannel ? 2 /* noise */ : 0 /* chip */, isNoiseChannel, isModChannel);
                            }
                        }
                    }
                }
                else if (command == 114 /* rhythm */) {
                    this.rhythm = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                }
                else if (command == 111 /* channelOctave */) {
                    if (beforeThree && variant == "beepbox") {
                        channel = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                        this.channels[channel].octave = clamp(0, beepbox.Config.scrollableOctaves + 1, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                    }
                    else {
                        for (channel = 0; channel < this.getChannelCount(); channel++) {
                            this.channels[channel].octave = clamp(0, beepbox.Config.scrollableOctaves + 1, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                        }
                    }
                }
                else if (command == 84 /* startInstrument */) {
                    instrumentIndexIterator++;
                    if (instrumentIndexIterator >= this.instrumentsPerChannel) {
                        instrumentChannelIterator++;
                        instrumentIndexIterator = 0;
                    }
                    const instrument = this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator];
                    const instrumentType = clamp(0, 9 /* length */, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                    instrument.setTypeAndReset(instrumentType, instrumentChannelIterator >= this.pitchChannelCount && instrumentChannelIterator < this.pitchChannelCount + this.noiseChannelCount, instrumentChannelIterator >= this.pitchChannelCount + this.noiseChannelCount);
                }
                else if (command == 117 /* preset */) {
                    const presetValue = (base64CharCodeToInt[compressed.charCodeAt(charIndex++)] << 6) | (base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                    this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].preset = presetValue;
                }
                else if (command == 119 /* wave */) {
                    if (beforeThree && variant == "beepbox") {
                        const legacyWaves = [1, 2, 3, 4, 5, 6, 7, 8, 0];
                        channel = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                        this.channels[channel].instruments[0].chipWave = clamp(0, beepbox.Config.chipWaves.length, legacyWaves[base64CharCodeToInt[compressed.charCodeAt(charIndex++)]] | 0);
                    }
                    else if (beforeSix && variant == "beepbox") {
                        const legacyWaves = [1, 2, 3, 4, 5, 6, 7, 8, 0];
                        for (channel = 0; channel < this.getChannelCount(); channel++) {
                            for (let i = 0; i < this.instrumentsPerChannel; i++) {
                                if (channel >= this.pitchChannelCount) {
                                    this.channels[channel].instruments[i].chipNoise = clamp(0, beepbox.Config.chipNoises.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                                }
                                else {
                                    this.channels[channel].instruments[i].chipWave = clamp(0, beepbox.Config.chipWaves.length, legacyWaves[base64CharCodeToInt[compressed.charCodeAt(charIndex++)]] | 0);
                                }
                            }
                        }
                    }
                    else if (beforeSeven && variant == "beepbox") {
                        const legacyWaves = [1, 2, 3, 4, 5, 6, 7, 8, 0];
                        if (instrumentChannelIterator >= this.pitchChannelCount) {
                            this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].chipNoise = clamp(0, beepbox.Config.chipNoises.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                        }
                        else {
                            this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].chipWave = clamp(0, beepbox.Config.chipWaves.length, legacyWaves[base64CharCodeToInt[compressed.charCodeAt(charIndex++)]] | 0);
                        }
                    }
                    else {
                        if (instrumentChannelIterator >= this.pitchChannelCount) {
                            this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].chipNoise = clamp(0, beepbox.Config.chipNoises.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                        }
                        else {
                            this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].chipWave = clamp(0, beepbox.Config.chipWaves.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                        }
                    }
                }
                else if (command == 102 /* filterCutoff */) {
                    if (beforeSeven && variant == "beepbox") {
                        const legacyToCutoff = [10, 6, 3, 0, 8, 5, 2];
                        const legacyToEnvelope = [1, 1, 1, 1, 18, 19, 20];
                        const filterNames = ["none", "bright", "medium", "soft", "decay bright", "decay medium", "decay soft"];
                        if (beforeThree && variant == "beepbox") {
                            channel = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                            const instrument = this.channels[channel].instruments[0];
                            const legacyFilter = [1, 3, 4, 5][clamp(0, filterNames.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)])];
                            instrument.filterCutoff = legacyToCutoff[legacyFilter];
                            instrument.filterEnvelope = legacyToEnvelope[legacyFilter];
                            instrument.filterResonance = 0;
                        }
                        else if (beforeSix && variant == "beepbox") {
                            for (channel = 0; channel < this.getChannelCount(); channel++) {
                                for (let i = 0; i < this.instrumentsPerChannel; i++) {
                                    const instrument = this.channels[channel].instruments[i];
                                    if (channel < this.pitchChannelCount) {
                                        const legacyFilter = clamp(0, filterNames.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)] + 1);
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
                        instrument.filterCutoff = clamp(0, beepbox.Config.filterCutoffRange, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                    }
                }
                else if (command == 121 /* filterResonance */) {
                    this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].filterResonance = clamp(0, beepbox.Config.filterResonanceRange, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                }
                else if (command == 122 /* filterEnvelope */) {
                    const instrument = this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator];
                    if (instrument.type == 4 /* drumset */) {
                        for (let i = 0; i < beepbox.Config.drumCount; i++) {
                            instrument.drumsetEnvelopes[i] = clamp(0, beepbox.Config.envelopes.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                        }
                    }
                    else {
                        instrument.filterEnvelope = clamp(0, beepbox.Config.envelopes.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                    }
                }
                else if (command == 87 /* pulseWidth */) {
                    if (variant == "beepbox") {
                        // Convert back from beepbox's weird pulse width storage formula, rounding. The "7" in there is the old
                        // piece of the formula "beepbox.Config.pulseWidthRange - 1".
                        const instrument = this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator];
                        instrument.pulseWidth = Math.round(clamp(0, beepbox.Config.pulseWidthRange + 1, Math.pow(0.5, (7 - base64CharCodeToInt[compressed.charCodeAt(charIndex++)]) * 0.5) * 50));
                        instrument.pulseEnvelope = clamp(0, beepbox.Config.envelopes.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                    }
                    else {
                        const instrument = this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator];
                        instrument.pulseWidth = clamp(0, beepbox.Config.pulseWidthRange + 1, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                        instrument.pulseEnvelope = clamp(0, beepbox.Config.envelopes.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                    }
                }
                else if (command == 100 /* transition */) {
                    if (beforeThree && variant == "beepbox") {
                        channel = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                        this.channels[channel].instruments[0].transition = clamp(0, beepbox.Config.transitions.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                    }
                    else if (beforeSix && variant == "beepbox") {
                        for (channel = 0; channel < this.getChannelCount(); channel++) {
                            for (let i = 0; i < this.instrumentsPerChannel; i++) {
                                this.channels[channel].instruments[i].transition = clamp(0, beepbox.Config.transitions.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                            }
                        }
                    }
                    else {
                        this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].transition = clamp(0, beepbox.Config.transitions.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                    }
                }
                else if (command == 99 /* vibrato */) {
                    if (beforeThree && variant == "beepbox") {
                        const legacyEffects = [0, 3, 2, 0];
                        const legacyEnvelopes = [1, 1, 1, 13];
                        channel = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                        const effect = clamp(0, legacyEffects.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                        const instrument = this.channels[channel].instruments[0];
                        instrument.vibrato = legacyEffects[effect];
                        instrument.filterEnvelope = (instrument.filterEnvelope == 1)
                            ? legacyEnvelopes[effect]
                            : instrument.filterEnvelope;
                    }
                    else if (beforeSix && variant == "beepbox") {
                        const legacyEffects = [0, 1, 2, 3, 0, 0];
                        const legacyEnvelopes = [1, 1, 1, 1, 16, 13];
                        for (channel = 0; channel < this.getChannelCount(); channel++) {
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
                    else if (beforeSeven && variant == "beepbox") {
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
                        const vibrato = clamp(0, beepbox.Config.vibratos.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                        this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].vibrato = vibrato;
                    }
                }
                else if (command == 104 /* interval */) {
                    if (beforeThree && variant == "beepbox") {
                        channel = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                        this.channels[channel].instruments[0].interval = clamp(0, beepbox.Config.intervals.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                    }
                    else if (beforeSix && variant == "beepbox") {
                        for (channel = 0; channel < this.getChannelCount(); channel++) {
                            for (let i = 0; i < this.instrumentsPerChannel; i++) {
                                const originalValue = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                                let interval = clamp(0, beepbox.Config.intervals.length, originalValue);
                                if (originalValue == 8) {
                                    // original "custom harmony" now maps to "hum" and "custom interval".
                                    interval = 2;
                                    this.channels[channel].instruments[i].chord = 3;
                                }
                                this.channels[channel].instruments[i].interval = interval;
                            }
                        }
                    }
                    else if (beforeSeven && variant == "beepbox") {
                        const originalValue = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                        let interval = clamp(0, beepbox.Config.intervals.length, originalValue);
                        if (originalValue == 8) {
                            // original "custom harmony" now maps to "hum" and "custom interval".
                            interval = 2;
                            this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].chord = 3;
                        }
                        this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].interval = interval;
                    }
                    else {
                        this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].interval = clamp(0, beepbox.Config.intervals.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                    }
                }
                else if (command == 67 /* chord */) {
                    this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].chord = clamp(0, beepbox.Config.chords.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                }
                else if (command == 113 /* effects */) {
                    this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].effects = clamp(0, beepbox.Config.effectsNames.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                }
                else if (command == 118 /* volume */) {
                    if (beforeThree && variant == "beepbox") {
                        channel = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                        const instrument = this.channels[channel].instruments[0];
                        instrument.volume = Math.round(clamp(-beepbox.Config.volumeRange, 1, -base64CharCodeToInt[compressed.charCodeAt(charIndex++)] * 5.0));
                    }
                    else if (beforeSix && variant == "beepbox") {
                        for (channel = 0; channel < this.getChannelCount(); channel++) {
                            for (let i = 0; i < this.instrumentsPerChannel; i++) {
                                const instrument = this.channels[channel].instruments[i];
                                instrument.volume = Math.round(clamp(-beepbox.Config.volumeRange, 1, -base64CharCodeToInt[compressed.charCodeAt(charIndex++)] * 5.0));
                            }
                        }
                    }
                    else if (beforeSeven && variant == "beepbox") {
                        const instrument = this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator];
                        instrument.volume = Math.round(clamp(-beepbox.Config.volumeRange, 1, -base64CharCodeToInt[compressed.charCodeAt(charIndex++)] * 5.0));
                    }
                    else if (variant == "beepbox") {
                        const instrument = this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator];
                        // Beepbox v7's volume range is 0-7 (0 is max, 7 is mute)
                        instrument.volume = Math.round(clamp(-beepbox.Config.volumeRange / 2, 1, -base64CharCodeToInt[compressed.charCodeAt(charIndex++)] * 25.0 / 7.0));
                    }
                    else {
                        const instrument = this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator];
                        // Volume is stored in two bytes in jummbox just in case range ever exceeds one byte, e.g. through later waffling on the subject.
                        instrument.volume = Math.round(clamp(-beepbox.Config.volumeRange / 2, beepbox.Config.volumeRange / 2 + 1, ((base64CharCodeToInt[compressed.charCodeAt(charIndex++)] << 6) | (base64CharCodeToInt[compressed.charCodeAt(charIndex++)])) - beepbox.Config.volumeRange / 2));
                    }
                }
                else if (command == 76 /* panning */) {
                    const instrument = this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator];
                    if (variant == "beepbox") {
                        // Beepbox has a panMax of 8 (9 total positions), Jummbox has a panMax of 100 (101 total positions)
                        instrument.pan = clamp(0, beepbox.Config.panMax + 1, Math.round(base64CharCodeToInt[compressed.charCodeAt(charIndex++)] * ((beepbox.Config.panMax) / 8.0)));
                    }
                    else {
                        instrument.pan = clamp(0, beepbox.Config.panMax + 1, (base64CharCodeToInt[compressed.charCodeAt(charIndex++)] << 6) + base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                    }
                }
                else if (command == 77 /* customChipWave */) {
                    let instrument = this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator];
                    // Pop custom wave values
                    for (let j = 0; j < 64; j++) {
                        instrument.customChipWave[j]
                            = clamp(-24, 25, base64CharCodeToInt[compressed.charCodeAt(charIndex++)] - 24);
                    }
                    let sum = 0.0;
                    for (let i = 0; i < instrument.customChipWave.length; i++) {
                        sum += instrument.customChipWave[i];
                    }
                    const average = sum / instrument.customChipWave.length;
                    // Perform the integral on the wave. The chipSynth will perform the derivative to get the original wave back but with antialiasing.
                    let cumulative = 0;
                    let wavePrev = 0;
                    for (let i = 0; i < instrument.customChipWave.length; i++) {
                        cumulative += wavePrev;
                        wavePrev = instrument.customChipWave[i] - average;
                        instrument.customChipWaveIntegral[i] = cumulative;
                    }
                    // 65th, last sample is for anti-aliasing
                    instrument.customChipWaveIntegral[64] = 0.0;
                }
                else if (command == 65 /* algorithm */) {
                    this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].algorithm = clamp(0, beepbox.Config.algorithms.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                }
                else if (command == 70 /* feedbackType */) {
                    this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].feedbackType = clamp(0, beepbox.Config.feedbacks.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                }
                else if (command == 66 /* feedbackAmplitude */) {
                    this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].feedbackAmplitude = clamp(0, beepbox.Config.operatorAmplitudeMax + 1, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                }
                else if (command == 86 /* feedbackEnvelope */) {
                    this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].feedbackEnvelope = clamp(0, beepbox.Config.envelopes.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                }
                else if (command == 81 /* operatorFrequencies */) {
                    for (let o = 0; o < beepbox.Config.operatorCount; o++) {
                        this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].operators[o].frequency = clamp(0, beepbox.Config.operatorFrequencies.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                    }
                }
                else if (command == 80 /* operatorAmplitudes */) {
                    for (let o = 0; o < beepbox.Config.operatorCount; o++) {
                        this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].operators[o].amplitude = clamp(0, beepbox.Config.operatorAmplitudeMax + 1, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                    }
                }
                else if (command == 69 /* operatorEnvelopes */) {
                    for (let o = 0; o < beepbox.Config.operatorCount; o++) {
                        this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].operators[o].envelope = clamp(0, beepbox.Config.envelopes.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                    }
                }
                else if (command == 83 /* spectrum */) {
                    const instrument = this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator];
                    if (instrument.type == 3 /* spectrum */) {
                        const byteCount = Math.ceil(beepbox.Config.spectrumControlPoints * beepbox.Config.spectrumControlPointBits / 6);
                        const bits = new BitFieldReader(compressed, charIndex, charIndex + byteCount);
                        for (let i = 0; i < beepbox.Config.spectrumControlPoints; i++) {
                            instrument.spectrumWave.spectrum[i] = bits.read(beepbox.Config.spectrumControlPointBits);
                        }
                        instrument.spectrumWave.markCustomWaveDirty();
                        charIndex += byteCount;
                    }
                    else if (instrument.type == 4 /* drumset */) {
                        const byteCount = Math.ceil(beepbox.Config.drumCount * beepbox.Config.spectrumControlPoints * beepbox.Config.spectrumControlPointBits / 6);
                        const bits = new BitFieldReader(compressed, charIndex, charIndex + byteCount);
                        for (let j = 0; j < beepbox.Config.drumCount; j++) {
                            for (let i = 0; i < beepbox.Config.spectrumControlPoints; i++) {
                                instrument.drumsetSpectrumWaves[j].spectrum[i] = bits.read(beepbox.Config.spectrumControlPointBits);
                            }
                            instrument.drumsetSpectrumWaves[j].markCustomWaveDirty();
                        }
                        charIndex += byteCount;
                    }
                    else {
                        throw new Error("Unhandled instrument type for spectrum song tag code.");
                    }
                }
                else if (command == 72 /* harmonics */) {
                    const instrument = this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator];
                    const byteCount = Math.ceil(beepbox.Config.harmonicsControlPoints * beepbox.Config.harmonicsControlPointBits / 6);
                    const bits = new BitFieldReader(compressed, charIndex, charIndex + byteCount);
                    for (let i = 0; i < beepbox.Config.harmonicsControlPoints; i++) {
                        instrument.harmonicsWave.harmonics[i] = bits.read(beepbox.Config.harmonicsControlPointBits);
                    }
                    instrument.harmonicsWave.markCustomWaveDirty();
                    charIndex += byteCount;
                }
                else if (command == 98 /* bars */) {
                    let subStringLength;
                    if (beforeThree && variant == "beepbox") {
                        channel = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                        const barCount = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                        subStringLength = Math.ceil(barCount * 0.5);
                        const bits = new BitFieldReader(compressed, charIndex, charIndex + subStringLength);
                        for (let i = 0; i < barCount; i++) {
                            this.channels[channel].bars[i] = bits.read(3) + 1;
                        }
                    }
                    else if (beforeFive && variant == "beepbox") {
                        let neededBits = 0;
                        while ((1 << neededBits) < this.patternsPerChannel)
                            neededBits++;
                        subStringLength = Math.ceil(this.getChannelCount() * this.barCount * neededBits / 6);
                        const bits = new BitFieldReader(compressed, charIndex, charIndex + subStringLength);
                        for (channel = 0; channel < this.getChannelCount(); channel++) {
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
                        for (channel = 0; channel < this.getChannelCount(); channel++) {
                            for (let i = 0; i < this.barCount; i++) {
                                this.channels[channel].bars[i] = bits.read(neededBits);
                            }
                        }
                    }
                    charIndex += subStringLength;
                }
                else if (command == 112 /* patterns */) {
                    let bitStringLength = 0;
                    if (beforeThree && variant == "beepbox") {
                        channel = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                        // The old format used the next character to represent the number of patterns in the channel, which is usually eight, the default. 
                        charIndex++; //let patternCount: number = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                        bitStringLength = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                        bitStringLength = bitStringLength << 6;
                        bitStringLength += base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                    }
                    else {
                        channel = 0;
                        let bitStringLengthLength = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
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
                        const isModChannel = this.getChannelIsMod(channel);
                        // Some info about modulator settings immediately follows in mod channels.
                        if (isModChannel) {
                            for (let instrumentIndex = 0; instrumentIndex < this.instrumentsPerChannel; instrumentIndex++) {
                                let instrument = this.channels[channel].instruments[instrumentIndex];
                                for (let mod = 0; mod < beepbox.Config.modCount; mod++) {
                                    instrument.modStatuses[mod] = bits.read(2);
                                    // Channel/Instrument is only used if the status isn't "song" or "none".
                                    if (instrument.modStatuses[mod] == ModStatus.msForPitch || instrument.modStatuses[mod] == ModStatus.msForNoise) {
                                        // Clamp to pitch/noise max
                                        if (instrument.modStatuses[mod] == ModStatus.msForPitch) {
                                            instrument.modChannels[mod] = clamp(0, this.pitchChannelCount + 1, bits.read(8));
                                        }
                                        else {
                                            instrument.modChannels[mod] = clamp(0, this.noiseChannelCount + 1, bits.read(8));
                                        }
                                        instrument.modInstruments[mod] = clamp(0, this.instrumentsPerChannel + 1, bits.read(neededInstrumentBits));
                                    }
                                    // Mod setting is only used if the status isn't "none".
                                    if (instrument.modStatuses[mod] != ModStatus.msNone) {
                                        instrument.modSettings[mod] = bits.read(6);
                                    }
                                }
                            }
                        }
                        const octaveOffset = (isNoiseChannel || isModChannel) ? 0 : this.channels[channel].octave * 12;
                        let note = null;
                        let pin = null;
                        let lastPitch = ((isNoiseChannel || isModChannel) ? 4 : 12) + octaveOffset;
                        const recentPitches = isModChannel ? [0, 1, 2, 3, 4, 5] : (isNoiseChannel ? [4, 6, 7, 2, 3, 8, 0, 10] : [12, 19, 24, 31, 36, 7, 0]);
                        const recentShapes = [];
                        for (let i = 0; i < recentPitches.length; i++) {
                            recentPitches[i] += octaveOffset;
                        }
                        for (let i = 0; i < this.patternsPerChannel; i++) {
                            const newPattern = this.channels[channel].patterns[i];
                            newPattern.reset();
                            newPattern.instrument = bits.read(neededInstrumentBits);
                            if (!(variant == "beepbox" && beforeThree) && bits.read(1) == 0)
                                continue;
                            let curPart = 0;
                            const newNotes = newPattern.notes;
                            // Due to arbitrary note positioning, mod channels don't end the count until curPart actually exceeds the max
                            while (curPart < this.beatsPerBar * beepbox.Config.partsPerBeat + (+isModChannel)) {
                                const useOldShape = bits.read(1) == 1;
                                let newNote = false;
                                let shapeIndex = 0;
                                if (useOldShape) {
                                    shapeIndex = bits.readLongTail(0, 0);
                                }
                                else {
                                    newNote = bits.read(1) == 1;
                                }
                                if (!useOldShape && !newNote) {
                                    // For mod channels, check if you need to move backward too (notes can appear in any order and offset from each other).
                                    if (isModChannel) {
                                        const isBackwards = bits.read(1) == 1;
                                        const restLength = bits.readPartDuration();
                                        if (isBackwards) {
                                            curPart -= restLength;
                                        }
                                        else {
                                            curPart += restLength;
                                        }
                                    }
                                    else {
                                        const restLength = (beforeSeven && variant == "beepbox")
                                            ? bits.readLegacyPartDuration() * beepbox.Config.partsPerBeat / beepbox.Config.rhythms[this.rhythm].stepsPerBeat
                                            : bits.readPartDuration();
                                        curPart += restLength;
                                    }
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
                                        while (shape.pitchCount < 4 && bits.read(1) == 1)
                                            shape.pitchCount++;
                                        shape.pinCount = bits.readPinCount();
                                        if (variant == "beepbox") {
                                            shape.initialVolume = bits.read(2) * 2;
                                        }
                                        else if (!isModChannel) {
                                            shape.initialVolume = bits.read(3);
                                        }
                                        else {
                                            shape.initialVolume = bits.read(9);
                                        }
                                        shape.pins = [];
                                        shape.length = 0;
                                        shape.bendCount = 0;
                                        for (let j = 0; j < shape.pinCount; j++) {
                                            pinObj = {};
                                            pinObj.pitchBend = bits.read(1) == 1;
                                            if (pinObj.pitchBend)
                                                shape.bendCount++;
                                            shape.length += (beforeSeven && variant == "beepbox")
                                                ? bits.readLegacyPartDuration() * beepbox.Config.partsPerBeat / beepbox.Config.rhythms[this.rhythm].stepsPerBeat
                                                : bits.readPartDuration();
                                            pinObj.time = shape.length;
                                            if (variant == "beepbox") {
                                                pinObj.volume = bits.read(2) * 2;
                                            }
                                            else if (!isModChannel) {
                                                pinObj.volume = bits.read(3);
                                            }
                                            else {
                                                pinObj.volume = bits.read(9);
                                            }
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
                                            const pitchIndex = bits.read(3);
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
                                    curPart = note.end;
                                    newNotes.push(note);
                                }
                            }
                        }
                        if (beforeThree && variant == "beepbox") {
                            break;
                        }
                        else {
                            channel++;
                            if (channel >= this.getChannelCount())
                                break;
                        }
                    } // while (true)
                }
            }
        }
        toJsonObject(enableIntro = true, loopCount = 1, enableOutro = true) {
            const channelArray = [];
            for (let channel = 0; channel < this.getChannelCount(); channel++) {
                const instrumentArray = [];
                const isNoiseChannel = this.getChannelIsNoise(channel);
                const isModChannel = this.getChannelIsMod(channel);
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
                                "tick": (pin.time + note.start) * beepbox.Config.rhythms[this.rhythm].stepsPerBeat / beepbox.Config.partsPerBeat,
                                "pitchBend": pin.interval,
                                "volume": Math.round(pin.volume * 100 / 6),
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
                    "type": isModChannel ? "mod" : (isNoiseChannel ? "drum" : "pitch"),
                    "octaveScrollBar": this.channels[channel].octave,
                    "instruments": instrumentArray,
                    "patterns": patternArray,
                    "sequence": sequenceArray,
                });
            }
            return {
                "format": Song._format,
                "version": Song._latestJummBoxVersion,
                "scale": beepbox.Config.scales[this.scale].name,
                "key": beepbox.Config.keys[this.key].name,
                "introBars": this.loopStart,
                "loopBars": this.loopLength,
                "beatsPerBar": this.beatsPerBar,
                "ticksPerBeat": beepbox.Config.rhythms[this.rhythm].stepsPerBeat,
                "beatsPerMinute": this.tempo,
                "reverb": this.reverb,
                //"outroBars": this.barCount - this.loopStart - this.loopLength; // derive this from bar arrays?
                //"patternCount": this.patternsPerChannel, // derive this from pattern arrays?
                //"instrumentsPerChannel": this.instrumentsPerChannel, //derive this from instrument arrays?
                "channels": channelArray,
            };
        }
        fromJsonObject(jsonObject) {
            this.initToDefault(true);
            if (!jsonObject)
                return;
            //const version: number = jsonObject["version"] | 0;
            //if (version > Song._latestVersion) return; // Go ahead and try to parse something from the future I guess? JSON is pretty easy-going!
            this.scale = 0; // default to free.
            if (jsonObject["scale"] != undefined) {
                const oldScaleNames = { "romani :)": 8, "romani :(": 9 };
                const scale = oldScaleNames[jsonObject["scale"]] != undefined ? oldScaleNames[jsonObject["scale"]] : beepbox.Config.scales.findIndex(scale => scale.name == jsonObject["scale"]);
                if (scale != -1)
                    this.scale = scale;
            }
            if (jsonObject["key"] != undefined) {
                if (typeof (jsonObject["key"]) == "number") {
                    this.key = ((jsonObject["key"] + 1200) >>> 0) % beepbox.Config.keys.length;
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
                this.tempo = clamp(beepbox.Config.tempoMin, beepbox.Config.tempoMax + 1, jsonObject["beatsPerMinute"] | 0);
            }
            if (jsonObject["reverb"] != undefined) {
                this.reverb = clamp(0, beepbox.Config.reverbRange, jsonObject["reverb"] | 0);
            }
            if (jsonObject["beatsPerBar"] != undefined) {
                this.beatsPerBar = Math.max(beepbox.Config.beatsPerBarMin, Math.min(beepbox.Config.beatsPerBarMax, jsonObject["beatsPerBar"] | 0));
            }
            let importedPartsPerBeat = 4;
            if (jsonObject["ticksPerBeat"] != undefined) {
                importedPartsPerBeat = (jsonObject["ticksPerBeat"] | 0) || 4;
                this.rhythm = beepbox.Config.rhythms.findIndex(rhythm => rhythm.stepsPerBeat == importedPartsPerBeat);
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
            this.instrumentsPerChannel = maxInstruments;
            this.patternsPerChannel = maxPatterns;
            this.barCount = maxBars;
            if (jsonObject["introBars"] != undefined) {
                this.loopStart = clamp(0, this.barCount, jsonObject["introBars"] | 0);
            }
            if (jsonObject["loopBars"] != undefined) {
                this.loopLength = clamp(1, this.barCount - this.loopStart + 1, jsonObject["loopBars"] | 0);
            }
            const newPitchChannels = [];
            const newNoiseChannels = [];
            const newModChannels = [];
            if (jsonObject["channels"]) {
                for (let channelIndex = 0; channelIndex < jsonObject["channels"].length; channelIndex++) {
                    let channelObject = jsonObject["channels"][channelIndex];
                    const channel = new Channel();
                    let isNoiseChannel = false;
                    let isModChannel = false;
                    if (channelObject["type"] != undefined) {
                        isNoiseChannel = (channelObject["type"] == "drum");
                        isModChannel = (channelObject["type"] == "mod");
                    }
                    else {
                        // for older files, assume drums are channel 3.
                        isNoiseChannel = (channelIndex >= 3);
                    }
                    if (isNoiseChannel) {
                        newNoiseChannels.push(channel);
                    }
                    else if (isModChannel) {
                        newModChannels.push(channel);
                    }
                    else {
                        newPitchChannels.push(channel);
                    }
                    if (channelObject["octaveScrollBar"] != undefined) {
                        channel.octave = clamp(0, beepbox.Config.scrollableOctaves + 1, channelObject["octaveScrollBar"] | 0);
                    }
                    for (let i = channel.instruments.length; i < this.instrumentsPerChannel; i++) {
                        channel.instruments[i] = new Instrument(isNoiseChannel, isModChannel);
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
                        instrument.fromJsonObject(channelObject["instruments"][i], isNoiseChannel, isModChannel);
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
                            const maxNoteCount = Math.min(this.beatsPerBar * beepbox.Config.partsPerBeat, patternObject["notes"].length >>> 0);
                            ///@TODO: Consider supporting notes specified in any timing order, sorting them and truncating as necessary. 
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
                                    if (note.pitches.length >= 4)
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
                                    const time = Math.round((+pointObject["tick"]) * beepbox.Config.partsPerBeat / importedPartsPerBeat);
                                    const volume = (pointObject["volume"] == undefined) ? 6 : Math.max(0, Math.min(6, Math.round((pointObject["volume"] | 0) * 6 / 100)));
                                    if (time > this.beatsPerBar * beepbox.Config.partsPerBeat)
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
                                const maxPitch = isNoiseChannel ? beepbox.Config.drumCount - 1 : beepbox.Config.maxPitch;
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
            if (newPitchChannels.length > beepbox.Config.pitchChannelCountMax)
                newPitchChannels.length = beepbox.Config.pitchChannelCountMax;
            if (newNoiseChannels.length > beepbox.Config.noiseChannelCountMax)
                newNoiseChannels.length = beepbox.Config.noiseChannelCountMax;
            if (newModChannels.length > beepbox.Config.modChannelCountMax)
                newModChannels.length = beepbox.Config.modChannelCountMax;
            this.pitchChannelCount = newPitchChannels.length;
            this.noiseChannelCount = newNoiseChannels.length;
            this.modChannelCount = newModChannels.length;
            this.channels.length = 0;
            Array.prototype.push.apply(this.channels, newPitchChannels);
            Array.prototype.push.apply(this.channels, newNoiseChannels);
            Array.prototype.push.apply(this.channels, newModChannels);
        }
        getPattern(channel, bar) {
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
    Song._oldestBeepboxVersion = 2;
    Song._latestBeepboxVersion = 8;
    Song._oldestJummBoxVersion = 1;
    Song._latestJummBoxVersion = 2;
    // One-character variant detection at the start of URL to distinguish variants such as JummBox.
    Song._variant = 0x6A; //"j" ~ jummbox
    beepbox.Song = Song;
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
            this.stereoVolumeLStart = 0.0;
            this.stereoVolumeRStart = 0.0;
            this.stereoVolumeLDelta = 0.0;
            this.stereoVolumeRDelta = 0.0;
            this.stereoDelayStart = 0.0;
            this.stereoDelayEnd = 0.0;
            this.stereoDelayDelta = 0.0;
            this.customVolumeStart = 0.0;
            this.customVolumeEnd = 0.0;
            this.filterResonanceStart = 0.0;
            this.filterResonanceDelta = 0.0;
            this.isFirstOrder = false;
            this.reset();
        }
        reset() {
            for (let i = 0; i < beepbox.Config.operatorCount; i++) {
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
            this.liveInputPressed = false;
            this.liveInputPitches = [0];
            this.liveInputChannel = 0;
            this.loopRepeatCount = -1;
            this.volume = 1.0;
            this.playheadInternal = 0.0;
            this.bar = 0;
            this.beat = 0;
            this.part = 0;
            this.tick = 0;
            this.tickSampleCountdown = 0;
            this.paused = true;
            this.tonePool = new beepbox.Deque();
            this.activeTones = [];
            this.activeModTones = [];
            //private readonly releasedModTones: Array<Array<Deque<Tone>>> = [];
            this.releasedTones = [];
            this.liveInputTones = new beepbox.Deque();
            //private highpassInput: number = 0.0;
            //private highpassOutput: number = 0.0;
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
                if (this.paused) {
                    for (let i = 0; i < outputBuffer.length; i++) {
                        outputDataL[i] = 0.0;
                        outputDataR[i] = 0.0;
                    }
                }
                else {
                    this.synthesize(outputDataL, outputDataR, outputBuffer.length);
                }
            };
            if (song != null)
                this.setSong(song);
        }
        warmUpSynthesizer(song) {
            // Don't bother to generate the drum waves unless the song actually
            // uses them, since they may require a lot of computation.
            if (song != null) {
                for (let channel = 0; channel < song.getChannelCount(); channel++) {
                    for (let instrument = 0; instrument < song.instrumentsPerChannel; instrument++) {
                        Synth.getInstrumentSynthFunction(song.channels[channel].instruments[instrument]);
                        song.channels[channel].instruments[instrument].warmUp();
                    }
                }
            }
        }
        computeLatestModValues(song) {
            if (this.song != null && this.song.modChannelCount > 0) {
                // Clear all mod values
                this.modValues = [];
                this.nextModValues = [];
                this.modInsValues = [];
                this.nextModInsValues = [];
                for (let channel = 0; channel < this.song.pitchChannelCount + this.song.noiseChannelCount; channel++) {
                    this.modInsValues[channel] = [];
                    this.nextModInsValues[channel] = [];
                    for (let instrument = 0; instrument < this.song.instrumentsPerChannel; instrument++) {
                        this.modInsValues[channel][instrument] = [];
                        this.nextModInsValues[channel][instrument] = [];
                    }
                }
                // For mod channels, calculate last set value for each mod
                for (let channel = this.song.pitchChannelCount + this.song.noiseChannelCount; channel < this.song.getChannelCount(); channel++) {
                    if (!(song.channels[channel].muted)) {
                        let pattern;
                        for (let currentBar = this.bar - 1; currentBar >= 0; currentBar--) {
                            pattern = song.getPattern(channel, currentBar);
                            let instrumentIdx = song.getPatternInstrument(channel, currentBar);
                            let instrument = song.channels[channel].instruments[instrumentIdx];
                            if (pattern != null) {
                                let latestPinTicks = [];
                                let latestPinValues = [];
                                for (const note of pattern.notes) {
                                    if (latestPinTicks[beepbox.Config.modCount - 1 - note.pitches[0]] == null || note.end > latestPinTicks[beepbox.Config.modCount - 1 - note.pitches[0]]) {
                                        latestPinTicks[beepbox.Config.modCount - 1 - note.pitches[0]] = note.end;
                                        latestPinValues[beepbox.Config.modCount - 1 - note.pitches[0]] = note.pins[note.pins.length - 1].volume;
                                    }
                                }
                                // Set modulator value, if it wasn't set in another pattern already scanned
                                for (let mod = 0; mod < beepbox.Config.modCount; mod++) {
                                    if (latestPinTicks[mod] != null) {
                                        if (!this.isModActive(instrument.modSettings[mod], (instrument.modStatuses[mod] == ModStatus.msForSong), instrument.modChannels[mod], instrument.modInstruments[mod]))
                                            this.setModValue(latestPinValues[mod], latestPinValues[mod], mod, instrument, instrument.modSettings[mod]);
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        static operatorAmplitudeCurve(amplitude) {
            return (Math.pow(16.0, amplitude / 15.0) - 1.0) / 15.0;
        }
        get playing() {
            return !this.paused;
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
                remainder = beepbox.Config.partsPerBeat * (remainder - this.beat);
                this.part = Math.floor(remainder);
                remainder = beepbox.Config.ticksPerPart * (remainder - this.part);
                this.tick = Math.floor(remainder);
                const samplesPerTick = this.getSamplesPerTick();
                remainder = samplesPerTick * (remainder - this.tick);
                this.tickSampleCountdown = Math.floor(samplesPerTick - remainder);
            }
        }
        getSamplesPerBar() {
            if (this.song == null)
                throw new Error();
            return this.getSamplesPerTick() * beepbox.Config.ticksPerPart * beepbox.Config.partsPerBeat * this.song.beatsPerBar;
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
        play() {
            if (!this.paused)
                return;
            this.paused = false;
            this.warmUpSynthesizer(this.song);
            this.computeLatestModValues(this.song);
            const contextClass = (window.AudioContext || window.webkitAudioContext);
            this.audioCtx = this.audioCtx || new contextClass();
            this.scriptNode = this.audioCtx.createScriptProcessor ? this.audioCtx.createScriptProcessor(2048, 0, 2) : this.audioCtx.createJavaScriptNode(2048, 0, 2); // 2048, 0 input channels, 2 output channels
            this.scriptNode.onaudioprocess = this.audioProcessCallback;
            this.scriptNode.channelCountMode = 'explicit';
            this.scriptNode.channelInterpretation = 'speakers';
            this.scriptNode.connect(this.audioCtx.destination);
            this.samplesPerSecond = this.audioCtx.sampleRate;
            if (this.song == null)
                return;
        }
        pause() {
            if (this.paused)
                return;
            this.paused = true;
            this.scriptNode.disconnect(this.audioCtx.destination);
            if (this.audioCtx.close) {
                this.audioCtx.close(); // firefox is missing this function?
            }
            this.audioCtx = null;
            this.scriptNode = null;
            this.modValues = [];
            this.modInsValues = [];
            this.nextModValues = [];
            this.nextModInsValues = [];
        }
        setModValue(volumeStart, volumeEnd, mod, instrument, setting) {
            let val;
            let nextVal;
            switch (setting) {
                case ModSetting.mstSongVolume:
                case ModSetting.mstReverb:
                case ModSetting.mstTempo:
                    val = this.song.modValueToReal(volumeStart, setting);
                    nextVal = this.song.modValueToReal(volumeEnd, setting);
                    if (this.modValues[setting] == null || this.modValues[setting] != val || this.nextModValues[setting] != nextVal) {
                        this.modValues[setting] = val;
                        this.nextModValues[setting] = nextVal;
                    }
                    break;
                case ModSetting.mstInsVolume:
                case ModSetting.mstPan:
                case ModSetting.mstPulseWidth:
                case ModSetting.mstFilterCut:
                case ModSetting.mstFilterPeak:
                case ModSetting.mstFMSlider1:
                case ModSetting.mstFMSlider2:
                case ModSetting.mstFMSlider3:
                case ModSetting.mstFMSlider4:
                case ModSetting.mstFMFeedback:
                    val = this.song.modValueToReal(volumeStart, setting);
                    nextVal = this.song.modValueToReal(volumeEnd, setting);
                    let channelAdjust = instrument.modChannels[mod] + ((instrument.modStatuses[mod] == ModStatus.msForNoise) ? this.song.pitchChannelCount : 0);
                    if (this.modInsValues[channelAdjust][instrument.modInstruments[mod]][setting] == null
                        || this.modInsValues[channelAdjust][instrument.modInstruments[mod]][setting] != val
                        || this.nextModInsValues[channelAdjust][instrument.modInstruments[mod]][setting] != nextVal) {
                        this.modInsValues[channelAdjust][instrument.modInstruments[mod]][setting] = val;
                        this.nextModInsValues[channelAdjust][instrument.modInstruments[mod]][setting] = nextVal;
                    }
                    break;
                case ModSetting.mstNextBar:
                    val = this.song.modValueToReal(volumeStart, setting);
                    break;
                case ModSetting.mstNone:
                default:
                    val = -1;
                    break;
            }
            return val;
        }
        getModValue(setting, forSong, channel, instrument, nextVal) {
            if (forSong) {
                if (this.modValues[setting] != null && this.nextModValues[setting] != null) {
                    return nextVal ? this.nextModValues[setting] : this.modValues[setting];
                }
            }
            else if (channel != undefined && instrument != undefined) {
                if (this.modInsValues[channel][instrument][setting] != null && this.nextModInsValues[channel][instrument][setting] != null) {
                    return nextVal ? this.nextModInsValues[channel][instrument][setting] : this.modInsValues[channel][instrument][setting];
                }
            }
            return -1;
        }
        // Checks if any mod is active for the given channel/instrument OR if any mod is active for the song scope. Could split the logic if needed later.
        isAnyModActive(channel, instrument) {
            for (let setting = 0; setting < ModSetting.mstMaxValue; setting++) {
                if ((this.modValues != undefined && this.modValues[setting] != null)
                    || (this.modInsValues != undefined && this.modInsValues[channel] != undefined && this.modInsValues[channel][instrument] != undefined && this.modInsValues[channel][instrument][setting] != null)) {
                    return true;
                }
            }
            return false;
        }
        unsetMod(setting, channel, instrument) {
            if (this.isModActive(setting, true) || (channel != undefined && instrument != undefined && this.isModActive(setting, false, channel, instrument))) {
                this.modValues[setting] = null;
                this.nextModValues[setting] = null;
                if (channel != undefined && instrument != undefined) {
                    this.modInsValues[channel][instrument][setting] = null;
                    this.nextModInsValues[channel][instrument][setting] = null;
                }
            }
        }
        isModActive(setting, forSong, channel, instrument) {
            if (forSong) {
                return (this.modValues != undefined && this.modValues[setting] != null);
            }
            else if (channel != undefined && instrument != undefined && this.modInsValues != undefined && this.modInsValues[channel] != null && this.modInsValues[channel][instrument] != null && this.modInsValues[channel][instrument][setting] != null) {
                return (this.modInsValues[channel][instrument][setting] != null);
            }
            return false;
        }
        resetBuffers() {
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
        snapToStart() {
            this.bar = 0;
            this.snapToBar();
        }
        snapToBar(bar) {
            if (bar !== undefined)
                this.bar = bar;
            this.playheadInternal = this.bar;
            this.beat = 0;
            this.part = 0;
            this.tick = 0;
            this.tickSampleCountdown = 0;
            this.reverbDelayPos = 0;
            this.reverbFeedback0 = 0.0;
            this.reverbFeedback1 = 0.0;
            this.reverbFeedback2 = 0.0;
            this.reverbFeedback3 = 0.0;
            //this.highpassInput = 0.0;
            //this.highpassOutput = 0.0;
            this.freeAllTones();
            this.resetBuffers();
        }
        jumpIntoLoop() {
            if (!this.song)
                return;
            if (this.bar < this.song.loopStart || this.bar >= this.song.loopStart + this.song.loopLength) {
                const oldBar = this.bar;
                this.bar = this.song.loopStart;
                this.computeLatestModValues(this.song);
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
            this.computeLatestModValues(this.song);
            this.playheadInternal += this.bar - oldBar;
        }
        skipBar() {
            if (!this.song)
                return;
            const samplesPerTick = this.getSamplesPerTick();
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
        firstBar() {
            if (!this.song)
                return;
            this.bar = 0;
            this.playheadInternal = 0;
            this.beat = 0;
            this.part = 0;
            this.computeLatestModValues(this.song);
        }
        jumpToEditingBar(bar) {
            if (!this.song)
                return;
            this.bar = bar;
            this.playheadInternal = bar;
            this.beat = 0;
            this.part = 0;
            this.computeLatestModValues(this.song);
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
            this.computeLatestModValues(this.song);
        }
        synthesize(outputDataL, outputDataR, outputBufferLength) {
            if (this.song == null) {
                for (let i = 0; i < outputBufferLength; i++) {
                    outputDataL[i] = 0.0;
                    outputDataR[i] = 0.0;
                }
                return;
            }
            const channelCount = this.song.pitchChannelCount + this.song.noiseChannelCount;
            for (let i = this.activeTones.length; i < channelCount; i++) {
                this.activeTones[i] = new beepbox.Deque();
                this.releasedTones[i] = new beepbox.Deque();
            }
            this.activeTones.length = channelCount;
            this.releasedTones.length = channelCount;
            for (let i = this.activeModTones.length; i < this.song.modChannelCount; i++) {
                this.activeModTones[i] = [];
                //this.releasedModTones[i] = [];
                for (let mod = 0; mod < beepbox.Config.modCount; mod++) {
                    this.activeModTones[i][mod] = new beepbox.Deque();
                    //this.releasedModTones[i][mod] = new Deque<Tone>();
                }
                this.activeModTones[i].length = beepbox.Config.modCount;
                //this.releasedModTones[i].length = Config.modCount;
            }
            this.activeModTones.length = this.song.modChannelCount;
            //this.releasedModTones.length = this.song.modChannelCount;
            const samplesPerTick = this.getSamplesPerTick();
            let bufferIndex = 0;
            let ended = false;
            // Check the bounds of the playhead:
            if (this.tickSampleCountdown == 0 || this.tickSampleCountdown > samplesPerTick) {
                this.tickSampleCountdown = samplesPerTick;
            }
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
            //const synthStartTime: number = performance.now();
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
            let useReverb = this.song.reverb;
            if (this.isModActive(ModSetting.mstReverb, true)) {
                useReverb = this.getModValue(ModSetting.mstReverb, true);
            }
            const reverb = Math.pow(useReverb / beepbox.Config.reverbRange, 0.667) * 0.425;
            //const highpassFilter: number = Math.pow(0.5, 400 / this.samplesPerSecond);
            const limitDecay = 1.0 - Math.pow(0.5, 4.0 / this.samplesPerSecond);
            const limitRise = 1.0 - Math.pow(0.5, 4000.0 / this.samplesPerSecond);
            //let highpassInput: number = +this.highpassInput;
            //let highpassOutput: number = +this.highpassOutput;
            let limit = +this.limit;
            while (bufferIndex < outputBufferLength && !ended) {
                const samplesLeftInBuffer = outputBufferLength - bufferIndex;
                const runLength = (this.tickSampleCountdown <= samplesLeftInBuffer)
                    ? this.tickSampleCountdown
                    : samplesLeftInBuffer;
                for (let modChannel = 0, channel = this.song.pitchChannelCount + this.song.noiseChannelCount; modChannel < this.song.modChannelCount; modChannel++, channel++) {
                    // Also determines mod tones.
                    this.determineCurrentActiveTones(this.song, channel);
                    for (let mod = 0; mod < beepbox.Config.modCount; mod++) {
                        for (let i = 0; i < this.activeModTones[modChannel][mod].count(); i++) {
                            const tone = this.activeModTones[modChannel][mod].get(i);
                            if (this.song.channels[channel].muted == false)
                                this.playTone(this.song, stereoBufferIndex, stereoBufferLength, channel, samplesPerTick, runLength, tone, false, false);
                        }
                    }
                    // Could do released mod tones here too, but that functionality is unused currently.
                    /* for (let i: number = 0; i < this.releasedModtones[channel].count(); i++) { ... */
                }
                for (let channel = 0; channel < this.song.pitchChannelCount + this.song.noiseChannelCount; channel++) {
                    if (channel == this.liveInputChannel) {
                        this.determineLiveInputTones(this.song);
                        for (let i = 0; i < this.liveInputTones.count(); i++) {
                            const tone = this.liveInputTones.get(i);
                            // Hmm. Will allow active input from a muted channel for now.
                            //if (this.song.channels[channel].muted == false)
                            this.playTone(this.song, stereoBufferIndex, stereoBufferLength, channel, samplesPerTick, runLength, tone, false, false);
                        }
                    }
                    if (this.song.channels[channel].muted == false) {
                        this.determineCurrentActiveTones(this.song, channel);
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
                            const shouldFadeOutFast = (i + this.activeTones[channel].count() >= beepbox.Config.maximumTonesPerChannel);
                            this.playTone(this.song, stereoBufferIndex, stereoBufferLength, channel, samplesPerTick, runLength, tone, true, shouldFadeOutFast);
                        }
                    }
                }
                // Post processing:
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
                    // Reverb, implemented using a feedback delay network with a Hadamard matrix and lowpass filters.
                    // good ratios:    0.555235 + 0.618033 + 0.818 +   1.0 = 2.991268
                    // Delay lengths:  3041     + 3385     + 4481  +  5477 = 16384 = 2^14
                    // Buffer offsets: 3041    -> 6426   -> 10907 -> 16384
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
                    /*
                    highpassOutput = highpassOutput * highpassFilter + sample - highpassInput;
                    highpassInput = sample;
                    // use highpassOutput instead of sample below?
                    */
                    // A compressor/limiter.
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
                    // Track how long tones have been released, and free them if there are too many.
                    for (let channel = 0; channel < this.song.pitchChannelCount + this.song.noiseChannelCount; channel++) {
                        for (let i = 0; i < this.releasedTones[channel].count(); i++) {
                            const tone = this.releasedTones[channel].get(i);
                            tone.ticksSinceReleased++;
                            const shouldFadeOutFast = (i + this.activeTones[channel].count() >= beepbox.Config.maximumTonesPerChannel);
                            if (shouldFadeOutFast) {
                                this.freeReleasedTone(channel, i);
                                i--;
                            }
                        }
                    }
                    this.tick++;
                    this.tickSampleCountdown = samplesPerTick;
                    if (this.tick == beepbox.Config.ticksPerPart) {
                        this.tick = 0;
                        this.part++;
                        // Check if any active tones should be released.
                        for (let channel = 0; channel < this.song.pitchChannelCount + this.song.noiseChannelCount; channel++) {
                            for (let i = 0; i < this.activeTones[channel].count(); i++) {
                                const tone = this.activeTones[channel].get(i);
                                const transition = tone.instrument.getTransition();
                                if (!transition.isSeamless && tone.note != null && tone.note.end == this.part + this.beat * beepbox.Config.partsPerBeat) {
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
                        for (let channel = 0; channel < this.song.modChannelCount; channel++) {
                            for (let mod = 0; mod < beepbox.Config.modCount; mod++) {
                                for (let i = 0; i < this.activeModTones[channel][mod].count(); i++) {
                                    const tone = this.activeModTones[channel][mod].get(i);
                                    const transition = tone.instrument.getTransition();
                                    if (!transition.isSeamless && tone.note != null && tone.note.end == this.part + this.beat * beepbox.Config.partsPerBeat) {
                                        this.freeTone(tone);
                                        this.activeModTones[channel][mod].remove(i);
                                        i--;
                                    }
                                }
                            }
                        }
                        if (this.part == beepbox.Config.partsPerBeat) {
                            this.part = 0;
                            this.beat++;
                            if (this.beat == this.song.beatsPerBar) {
                                // bar changed, reset for next bar:
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
                                        this.resetBuffers();
                                        this.pause();
                                    }
                                }
                            }
                        }
                    }
                }
                // Update mod values so that next values copy to current values
                for (let setting = 0; setting < ModSetting.mstMaxValue; setting++) {
                    if (this.nextModValues[setting] != null)
                        this.modValues[setting] = this.nextModValues[setting];
                }
                for (let setting = 0; setting < ModSetting.mstMaxValue; setting++) {
                    for (let channel = 0; channel < channelCount; channel++) {
                        for (let instrument = 0; instrument < this.song.instrumentsPerChannel; instrument++) {
                            if (this.nextModInsValues[channel][instrument][setting] != null) {
                                //console.log(this.modInsValues[channel][instrument][setting] + " ~ " + this.nextModInsValues[channel][instrument][setting]);;
                                this.modInsValues[channel][instrument][setting] = this.nextModInsValues[channel][instrument][setting];
                            }
                        }
                    }
                }
            }
            // Optimization: Avoid persistent reverb values in the float denormal range.
            const epsilon = (1.0e-24);
            if (-epsilon < reverbFeedback0 && reverbFeedback0 < epsilon)
                reverbFeedback0 = 0.0;
            if (-epsilon < reverbFeedback1 && reverbFeedback1 < epsilon)
                reverbFeedback1 = 0.0;
            if (-epsilon < reverbFeedback2 && reverbFeedback2 < epsilon)
                reverbFeedback2 = 0.0;
            if (-epsilon < reverbFeedback3 && reverbFeedback3 < epsilon)
                reverbFeedback3 = 0.0;
            //if (-epsilon < highpassInput && highpassInput < epsilon) highpassInput = 0.0;
            //if (-epsilon < highpassOutput && highpassOutput < epsilon) highpassOutput = 0.0;
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
            //this.highpassInput = highpassInput;
            //this.highpassOutput = highpassOutput;
            this.limit = limit;
            this.playheadInternal = (((this.tick + 1.0 - this.tickSampleCountdown / samplesPerTick) / 2.0 + this.part) / beepbox.Config.partsPerBeat + this.beat) / this.song.beatsPerBar + this.bar;
            /*
            const synthDuration: number = performance.now() - synthStartTime;
            // Performance measurements:
            samplesAccumulated += outputBufferLength;
            samplePerformance += synthDuration;
            
            if (samplesAccumulated >= 44100 * 4) {
                const secondsGenerated = samplesAccumulated / 44100;
                const secondsRequired = samplePerformance / 1000;
                const ratio = secondsRequired / secondsGenerated;
                console.log(ratio);
                samplePerformance = 0;
                samplesAccumulated = 0;
            }
            */
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
            if (this.song == null || !this.song.getChannelIsMod(channel)) {
                this.releasedTones[channel].pushFront(tone);
            }
            else {
                /*
                for (let mod = 0; mod < Config.modCount; mod++) {
                    this.releasedModTones[channel - (this.song.pitchChannelCount + this.song.noiseChannelCount)][mod].pushFront(tone);
                }
                */
            }
        }
        freeReleasedTone(channel, toneIndex) {
            if (this.song == null || !this.song.getChannelIsMod(channel)) {
                this.freeTone(this.releasedTones[channel].get(toneIndex));
                this.releasedTones[channel].remove(toneIndex);
            }
            else {
                /*
                for (let mod = 0; mod < Config.modCount; mod++) {
                    this.freeTone(this.releasedModTones[channel - (this.song.pitchChannelCount + this.song.noiseChannelCount)][mod].get(toneIndex));
                    this.releasedModTones[channel][mod].remove(toneIndex);
                }
                */
            }
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
            for (let i = 0; i < this.activeModTones.length; i++) {
                for (let mod = 0; mod < this.activeModTones[i].length; mod++) {
                    while (this.activeModTones[i][mod].count() > 0) {
                        this.freeTone(this.activeModTones[i][mod].popBack());
                    }
                }
            }
            /*
            for (let i = 0; i < this.releasedModTones.length; i++) {
                for (let mod = 0; mod < this.releasedModTones[i].length; mod++) {
                    while (this.releasedModTones[i][mod].count() > 0) {
                        this.freeTone(this.releasedModTones[i][mod].popBack());
                    }
                }
            }
            */
        }
        determineLiveInputTones(song) {
            if (this.liveInputPressed) {
                // TODO: Support multiple live pitches correctly. Distinguish between arpeggio and harmony behavior like with song notes.
                const instrument = song.channels[this.liveInputChannel].instruments[song.getPatternInstrument(this.liveInputChannel, this.bar)];
                let tone;
                if (this.liveInputTones.count() == 0) {
                    tone = this.newTone();
                    this.liveInputTones.pushBack(tone);
                }
                else if (!instrument.getTransition().isSeamless && this.liveInputTones.peakFront().pitches[0] != this.liveInputPitches[0]) {
                    // pitches[0] changed, start a new tone.
                    this.releaseTone(this.liveInputChannel, this.liveInputTones.popFront());
                    tone = this.newTone();
                    this.liveInputTones.pushBack(tone);
                }
                else {
                    tone = this.liveInputTones.get(0);
                }
                for (let i = 0; i < this.liveInputPitches.length; i++) {
                    tone.pitches[i] = this.liveInputPitches[i];
                }
                tone.pitchCount = this.liveInputPitches.length;
                tone.chordSize = 1;
                tone.instrument = instrument;
                tone.note = tone.prevNote = tone.nextNote = null;
            }
            else {
                while (this.liveInputTones.count() > 0) {
                    this.releaseTone(this.liveInputChannel, this.liveInputTones.popBack());
                }
            }
        }
        determineCurrentActiveTones(song, channel) {
            const instrument = song.channels[channel].instruments[song.getPatternInstrument(channel, this.bar)];
            const pattern = song.getPattern(channel, this.bar);
            const time = this.part + this.beat * beepbox.Config.partsPerBeat;
            if (this.song != null && song.getChannelIsMod(channel)) {
                // Offset channel (first mod channel is 0 index in mod tone array)
                let modChannelIdx = channel - (song.pitchChannelCount + song.noiseChannelCount);
                // For mod channels, notes aren't strictly arranged chronologically. Also, each pitch value could play or not play at a given time. So... a bit more computation involved!
                // The same transition logic should apply though, even though it isn't really used by mod channels.
                let notes = [];
                let prevNotes = [];
                let nextNotes = [];
                let fillCount = beepbox.Config.modCount;
                while (fillCount--) {
                    notes.push(null);
                    prevNotes.push(null);
                    nextNotes.push(null);
                }
                if (pattern != null) {
                    for (let i = 0; i < pattern.notes.length; i++) {
                        if (pattern.notes[i].end <= time) {
                            // Actually need to check which note starts closer to the start of this note.
                            if (prevNotes[pattern.notes[i].pitches[0]] == null || pattern.notes[i].end > prevNotes[pattern.notes[i].pitches[0]].start) {
                                prevNotes[pattern.notes[i].pitches[0]] = pattern.notes[i];
                            }
                        }
                        else if (pattern.notes[i].start <= time && pattern.notes[i].end > time) {
                            notes[pattern.notes[i].pitches[0]] = pattern.notes[i];
                        }
                        else if (pattern.notes[i].start > time) {
                            // Actually need to check which note starts closer to the end of this note.
                            if (nextNotes[pattern.notes[i].pitches[0]] == null || pattern.notes[i].start < nextNotes[pattern.notes[i].pitches[0]].start) {
                                nextNotes[pattern.notes[i].pitches[0]] = pattern.notes[i];
                            }
                        }
                    }
                }
                for (let mod = 0; mod < beepbox.Config.modCount; mod++) {
                    const toneList = this.activeModTones[modChannelIdx][mod];
                    if (notes[mod] != null) {
                        if (prevNotes[mod] != null && prevNotes[mod].end != notes[mod].start)
                            prevNotes[mod] = null;
                        if (nextNotes[mod] != null && nextNotes[mod].start != notes[mod].end)
                            nextNotes[mod] = null;
                        this.syncTones(channel, toneList, instrument, notes[mod].pitches, notes[mod], prevNotes[mod], nextNotes[mod], time);
                    }
                    else {
                        while (toneList.count() > 0) {
                            // Automatically free or release seamless tones if there's no new note to take over.
                            if (toneList.peakBack().instrument.getTransition().releases) {
                                this.releaseTone(channel, toneList.popBack());
                            }
                            else {
                                this.freeTone(toneList.popBack());
                            }
                        }
                    }
                }
            }
            else {
                let note = null;
                let prevNote = null;
                let nextNote = null;
                if (pattern != null) {
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
                        // Automatically free or release seamless tones if there's no new note to take over.
                        if (toneList.peakBack().instrument.getTransition().releases) {
                            this.releaseTone(channel, toneList.popBack());
                        }
                        else {
                            this.freeTone(toneList.popBack());
                        }
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
                        noteEnd = Math.min(beepbox.Config.partsPerBeat * this.song.beatsPerBar, noteEnd + strumOffsetParts);
                    }
                    let tone;
                    if (toneList.count() > i) {
                        tone = toneList.get(i);
                    }
                    else {
                        tone = this.newTone();
                        toneList.pushBack(tone);
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
                // Automatically free or release seamless tones if there's no new note to take over.
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
                case 0 /* custom */: return customVolume;
                case 1 /* steady */: return 1.0;
                case 4 /* twang */:
                    return 1.0 / (1.0 + time * envelope.speed);
                case 5 /* swell */:
                    return 1.0 - 1.0 / (1.0 + time * envelope.speed);
                case 6 /* tremolo */:
                    return 0.5 - Math.cos(beats * 2.0 * Math.PI * envelope.speed) * 0.5;
                case 7 /* tremolo2 */:
                    return 0.75 - Math.cos(beats * 2.0 * Math.PI * envelope.speed) * 0.25;
                case 2 /* punch */:
                    return Math.max(1.0, 2.0 - time * 10.0);
                case 3 /* flare */:
                    const speed = envelope.speed;
                    const attack = 0.25 / Math.sqrt(speed);
                    return time < attack ? time / attack : 1.0 / (1.0 + (time - attack) * speed);
                case 8 /* decay */:
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
            const intervalScale = isNoiseChannel ? beepbox.Config.noiseInterval : 1;
            const secondsPerPart = beepbox.Config.ticksPerPart * samplesPerTick / synth.samplesPerSecond;
            const beatsPerPart = 1.0 / beepbox.Config.partsPerBeat;
            const toneWasActive = tone.active;
            const tickSampleCountdown = synth.tickSampleCountdown;
            const startRatio = 1.0 - (tickSampleCountdown) / samplesPerTick;
            const endRatio = 1.0 - (tickSampleCountdown - runLength) / samplesPerTick;
            const ticksIntoBar = (synth.beat * beepbox.Config.partsPerBeat + synth.part) * beepbox.Config.ticksPerPart + synth.tick;
            const partTimeTickStart = (ticksIntoBar) / beepbox.Config.ticksPerPart;
            const partTimeTickEnd = (ticksIntoBar + 1) / beepbox.Config.ticksPerPart;
            const partTimeStart = partTimeTickStart + (partTimeTickEnd - partTimeTickStart) * startRatio;
            const partTimeEnd = partTimeTickStart + (partTimeTickEnd - partTimeTickStart) * endRatio;
            const instrumentIdx = synth.song.channels[channel].instruments.findIndex(i => i == instrument);
            tone.phaseDeltaScale = 0.0;
            tone.filter = 1.0;
            tone.filterScale = 1.0;
            tone.vibratoScale = 0.0;
            tone.intervalMult = 1.0;
            tone.intervalVolumeMult = 1.0;
            tone.active = false;
            let startPan = instrument.pan;
            let endPan = instrument.pan;
            if (synth.isModActive(ModSetting.mstPan, false, channel, instrumentIdx)) {
                startPan = synth.getModValue(ModSetting.mstPan, false, channel, instrumentIdx, false);
                endPan = synth.getModValue(ModSetting.mstPan, false, channel, instrumentIdx, true);
            }
            const useStartPan = (startPan - beepbox.Config.panCenter) / beepbox.Config.panCenter;
            const useEndPan = (endPan - beepbox.Config.panCenter) / beepbox.Config.panCenter;
            const maxDelay = 0.00065 * synth.samplesPerSecond;
            tone.stereoDelayStart = -useStartPan * maxDelay * 2;
            const delayEnd = -useEndPan * maxDelay * 2;
            tone.stereoDelayDelta = (delayEnd - tone.stereoDelayStart) / runLength;
            tone.stereoVolumeLStart = Math.cos((1 + useStartPan) * Math.PI * 0.25) * 1.414;
            tone.stereoVolumeRStart = Math.cos((1 - useStartPan) * Math.PI * 0.25) * 1.414;
            const stereoVolumeLEnd = Math.cos((1 + useEndPan) * Math.PI * 0.25) * 1.414;
            const stereoVolumeREnd = Math.cos((1 - useEndPan) * Math.PI * 0.25) * 1.414;
            tone.stereoVolumeLDelta = (stereoVolumeLEnd - tone.stereoVolumeLStart) / runLength;
            tone.stereoVolumeRDelta = (stereoVolumeREnd - tone.stereoVolumeRStart) / runLength;
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
            if (instrument.type == 3 /* spectrum */) {
                if (isNoiseChannel) {
                    basePitch = beepbox.Config.spectrumBasePitch;
                    baseVolume = 0.6; // Note: spectrum is louder for drum channels than pitch channels!
                }
                else {
                    basePitch = beepbox.Config.keys[song.key].basePitch;
                    baseVolume = 0.3;
                }
                volumeReferencePitch = beepbox.Config.spectrumBasePitch;
                pitchDamping = 28;
            }
            else if (instrument.type == 4 /* drumset */) {
                basePitch = beepbox.Config.spectrumBasePitch;
                baseVolume = 0.45;
                volumeReferencePitch = basePitch;
                pitchDamping = 48;
            }
            else if (instrument.type == 2 /* noise */) {
                basePitch = beepbox.Config.chipNoises[instrument.chipNoise].basePitch;
                baseVolume = 0.19;
                volumeReferencePitch = basePitch;
                pitchDamping = beepbox.Config.chipNoises[instrument.chipNoise].isSoft ? 24.0 : 60.0;
            }
            else if (instrument.type == 1 /* fm */) {
                basePitch = beepbox.Config.keys[song.key].basePitch;
                baseVolume = 0.03;
                volumeReferencePitch = 16;
                pitchDamping = 48;
            }
            else if (instrument.type == 0 /* chip */ || instrument.type == 7 /* customChipWave */) {
                basePitch = beepbox.Config.keys[song.key].basePitch;
                baseVolume = 0.03375; // looks low compared to drums, but it's doubled for chorus and drums tend to be loud anyway.
                volumeReferencePitch = 16;
                pitchDamping = 48;
            }
            else if (instrument.type == 5 /* harmonics */) {
                basePitch = beepbox.Config.keys[song.key].basePitch;
                baseVolume = 0.025;
                volumeReferencePitch = 16;
                pitchDamping = 48;
            }
            else if (instrument.type == 6 /* pwm */) {
                basePitch = beepbox.Config.keys[song.key].basePitch;
                baseVolume = 0.04725;
                volumeReferencePitch = 16;
                pitchDamping = 48;
            }
            else if (instrument.type == 8 /* mod */) {
                baseVolume = 1.0;
                volumeReferencePitch = 0;
                pitchDamping = 1.0;
                basePitch = 0;
            }
            else {
                throw new Error("Unknown instrument type in computeTone.");
            }
            for (let i = 0; i < beepbox.Config.operatorCount; i++) {
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
                partsSinceStart = Math.floor(ticksSoFar / beepbox.Config.ticksPerPart);
                intervalStart = intervalEnd = tone.lastInterval;
                customVolumeStart = customVolumeEnd = Synth.expressionToVolumeMult(tone.lastVolume);
                transitionVolumeStart = Synth.expressionToVolumeMult((1.0 - startTicksSinceReleased / toneTransition.releaseTicks) * 6.0);
                transitionVolumeEnd = Synth.expressionToVolumeMult((1.0 - endTicksSinceReleased / toneTransition.releaseTicks) * 6.0);
                decayTimeStart = startTick / beepbox.Config.ticksPerPart;
                decayTimeEnd = endTick / beepbox.Config.ticksPerPart;
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
                const heldPartsStart = heldTicksStart / beepbox.Config.ticksPerPart;
                const heldPartsEnd = heldTicksEnd / beepbox.Config.ticksPerPart;
                partsSinceStart = Math.floor(heldPartsStart);
                decayTimeStart = heldPartsStart;
                decayTimeEnd = heldPartsEnd;
            }
            else {
                const note = tone.note;
                const prevNote = tone.prevNote;
                const nextNote = tone.nextNote;
                const time = synth.part + synth.beat * beepbox.Config.partsPerBeat;
                const partsPerBar = beepbox.Config.partsPerBeat * song.beatsPerBar;
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
                const noteStartTick = noteStart * beepbox.Config.ticksPerPart;
                const noteEndTick = noteEnd * beepbox.Config.ticksPerPart;
                const noteLengthTicks = noteEndTick - noteStartTick;
                const pinStart = (note.start + startPin.time) * beepbox.Config.ticksPerPart;
                const pinEnd = (note.start + endPin.time) * beepbox.Config.ticksPerPart;
                tone.lastInterval = note.pins[note.pins.length - 1].interval;
                tone.lastVolume = note.pins[note.pins.length - 1].volume;
                tone.ticksSinceReleased = 0;
                tone.noteLengthTicks = noteLengthTicks;
                const tickTimeStart = time * beepbox.Config.ticksPerPart + synth.tick;
                const tickTimeEnd = time * beepbox.Config.ticksPerPart + synth.tick + 1;
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
                // if seamless, don't reset phases at start. (it's probably not necessary to constantly reset phases if there are no notes? Just do it once when note starts? But make sure that reset phases doesn't also reset stuff that this function did to set up the tone. Remember when the first run length was lost!
                // if slide, average the interval, decayTime, and custom volume at the endpoints and interpolate between over slide duration.
                // note that currently seamless and slide make different assumptions about whether a note at the end of a bar will connect with the next bar!
                const maximumSlideTicks = noteLengthTicks * 0.5;
                if (transition.isSeamless && !transition.slides && note.start == 0) {
                    // Special case for seamless, no-slide transition: assume the previous bar ends with another seamless note, don't reset tone history.
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
                if (transition.isSeamless && !transition.slides && note.end == partsPerBar) {
                    // Special case for seamless, no-slide transition: assume the next bar starts with another seamless note, don't fade out.
                }
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
                if (instrument.type != 8 /* mod */) {
                    customVolumeStart = Synth.expressionToVolumeMult(customVolumeTickStart + (customVolumeTickEnd - customVolumeTickStart) * startRatio);
                    customVolumeEnd = Synth.expressionToVolumeMult(customVolumeTickStart + (customVolumeTickEnd - customVolumeTickStart) * endRatio);
                }
                else {
                    customVolumeStart = customVolumeTickStart + (customVolumeTickEnd - customVolumeTickStart) * startRatio;
                    customVolumeEnd = customVolumeTickStart + (customVolumeTickEnd - customVolumeTickStart) * endRatio;
                    tone.customVolumeStart = customVolumeStart;
                    tone.customVolumeEnd = customVolumeEnd;
                }
                transitionVolumeStart = transitionVolumeTickStart + (transitionVolumeTickEnd - transitionVolumeTickStart) * startRatio;
                transitionVolumeEnd = transitionVolumeTickStart + (transitionVolumeTickEnd - transitionVolumeTickStart) * endRatio;
                chordVolumeStart = chordVolumeTickStart + (chordVolumeTickEnd - chordVolumeTickStart) * startRatio;
                chordVolumeEnd = chordVolumeTickStart + (chordVolumeTickEnd - chordVolumeTickStart) * endRatio;
                decayTimeStart = decayTimeTickStart + (decayTimeTickEnd - decayTimeTickStart) * startRatio;
                decayTimeEnd = decayTimeTickStart + (decayTimeTickEnd - decayTimeTickStart) * endRatio;
            }
            const sampleTime = 1.0 / synth.samplesPerSecond;
            tone.active = true;
            if (instrument.type == 0 /* chip */ || instrument.type == 1 /* fm */ || instrument.type == 5 /* harmonics */ || instrument.type == 6 /* pwm */ || instrument.type == 7 /* customChipWave */) {
                const lfoEffectStart = Synth.getLFOAmplitude(instrument, secondsPerPart * partTimeStart);
                const lfoEffectEnd = Synth.getLFOAmplitude(instrument, secondsPerPart * partTimeEnd);
                const vibratoScale = (partsSinceStart < beepbox.Config.vibratos[instrument.vibrato].delayParts) ? 0.0 : beepbox.Config.vibratos[instrument.vibrato].amplitude;
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
            if (instrument.type == 4 /* drumset */) {
                // It's possible that the note will change while the user is editing it,
                // but the tone's pitches don't get updated because the tone has already
                // ended and is fading out. To avoid an array index out of bounds error, clamp the pitch.
                tone.drumsetPitch = tone.pitches[0];
                if (tone.note != null)
                    tone.drumsetPitch += tone.note.pickMainInterval();
                tone.drumsetPitch = Math.max(0, Math.min(beepbox.Config.drumCount - 1, tone.drumsetPitch));
            }
            let filterCutModStart = instrument.filterCutoff;
            let filterCutModEnd = instrument.filterCutoff;
            if (synth.isModActive(ModSetting.mstFilterCut, false, channel, instrumentIdx)) {
                filterCutModStart = song.modValueToReal(synth.getModValue(ModSetting.mstFilterCut, false, channel, instrumentIdx, false), ModSetting.mstFilterCut);
                filterCutModEnd = song.modValueToReal(synth.getModValue(ModSetting.mstFilterCut, false, channel, instrumentIdx, true), ModSetting.mstFilterCut);
            }
            let cutoffOctavesModStart;
            let cutoffOctavesModEnd;
            if (instrument.type == 4 /* drumset */) {
                cutoffOctavesModStart = 0;
                cutoffOctavesModEnd = 0;
            }
            else {
                cutoffOctavesModStart = (filterCutModStart - (beepbox.Config.filterCutoffRange - 1)) * 0.5;
                cutoffOctavesModEnd = (filterCutModEnd - (beepbox.Config.filterCutoffRange - 1)) * 0.5;
            }
            const filterEnvelope = (instrument.type == 4 /* drumset */) ? instrument.getDrumsetEnvelope(tone.drumsetPitch) : instrument.getFilterEnvelope();
            const filterCutoffHzStart = beepbox.Config.filterCutoffMaxHz * Math.pow(2.0, cutoffOctavesModStart);
            const filterCutoffHzEnd = beepbox.Config.filterCutoffMaxHz * Math.pow(2.0, cutoffOctavesModEnd);
            const filterBaseStart = 2.0 * Math.sin(Math.PI * filterCutoffHzStart / synth.samplesPerSecond);
            const filterBaseEnd = 2.0 * Math.sin(Math.PI * filterCutoffHzEnd / synth.samplesPerSecond);
            const filterMin = 2.0 * Math.sin(Math.PI * beepbox.Config.filterCutoffMinHz / synth.samplesPerSecond);
            tone.filter = filterBaseStart * Synth.computeEnvelope(filterEnvelope, secondsPerPart * decayTimeStart, beatsPerPart * partTimeStart, customVolumeStart);
            let endFilter = filterBaseEnd * Synth.computeEnvelope(filterEnvelope, secondsPerPart * decayTimeEnd, beatsPerPart * partTimeEnd, customVolumeEnd);
            tone.filter = Math.min(beepbox.Config.filterMax, Math.max(filterMin, tone.filter));
            endFilter = Math.min(beepbox.Config.filterMax, Math.max(filterMin, endFilter));
            tone.filterScale = Math.pow(endFilter / tone.filter, 1.0 / runLength);
            let filterVolumeStart = Math.pow(0.5, cutoffOctavesModStart * 0.35);
            let filterVolumeEnd = Math.pow(0.5, cutoffOctavesModEnd * 0.35);
            tone.filterResonanceStart = instrument.getFilterResonance();
            tone.filterResonanceDelta = 0.0;
            let useFilterResonanceStart = instrument.filterResonance;
            let useFilterResonanceEnd = instrument.filterResonance;
            tone.isFirstOrder = (instrument.type == 4 /* drumset */) ? false : (useFilterResonanceStart == 0);
            if (synth.isModActive(ModSetting.mstFilterPeak, false, channel, instrumentIdx)) {
                // This flag is used to avoid the special casing when filter resonance == 0 without mods. So, it will sound a bit different,
                // but the effect and ability to smoothly modulate will be preserved.
                tone.isFirstOrder = false;
                useFilterResonanceStart = song.modValueToReal(synth.getModValue(ModSetting.mstFilterPeak, false, channel, instrumentIdx, false), ModSetting.mstFilterPeak);
                useFilterResonanceEnd = song.modValueToReal(synth.getModValue(ModSetting.mstFilterPeak, false, channel, instrumentIdx, true), ModSetting.mstFilterPeak);
                // Also set cut in the tone.
                tone.filterResonanceStart = beepbox.Config.filterMaxResonance * Math.pow(Math.max(0, useFilterResonanceStart - 1) / (beepbox.Config.filterResonanceRange - 2), 0.5);
                const filterResonanceEnd = beepbox.Config.filterMaxResonance * Math.pow(Math.max(0, useFilterResonanceEnd - 1) / (beepbox.Config.filterResonanceRange - 2), 0.5);
                // Just a linear delta. Could get messy since it's not an amazing approximation of sqrt?
                tone.filterResonanceDelta = (filterResonanceEnd - tone.filterResonanceStart) / runLength;
            }
            else {
                // Still need to compute this, mods or no. This calc is delegated to the tone level instead of the synth level, a notable difference from beepbox.
                // No functional difference though.
                tone.filterResonanceStart = beepbox.Config.filterMaxResonance * Math.pow(Math.max(0, useFilterResonanceStart - 1) / (beepbox.Config.filterResonanceRange - 2), 0.5);
            }
            if (tone.isFirstOrder == false) {
                filterVolumeStart = Math.pow(filterVolumeStart, 1.7) * Math.pow(0.5, 0.125 * (useFilterResonanceStart - 1));
                filterVolumeEnd = Math.pow(filterVolumeEnd, 1.7) * Math.pow(0.5, 0.125 * (useFilterResonanceEnd - 1));
            }
            if (filterEnvelope.type == 8 /* decay */) {
                filterVolumeStart *= (1.25 + .025 * filterEnvelope.speed);
                filterVolumeEnd *= (1.25 + .025 * filterEnvelope.speed);
            }
            else if (filterEnvelope.type == 4 /* twang */) {
                filterVolumeStart *= (1 + .02 * filterEnvelope.speed);
                filterVolumeEnd *= (1 + .02 * filterEnvelope.speed);
            }
            if (resetPhases) {
                tone.reset();
            }
            if (instrument.type == 1 /* fm */) {
                // phase modulation!
                let sineVolumeBoostStart = 1.0;
                let sineVolumeBoostEnd = 1.0;
                let totalCarrierVolumeStart = 0.0;
                let totalCarrierVolumeEnd = 0.0;
                let arpeggioInterval = 0;
                if (tone.pitchCount > 1 && !chord.harmonizes) {
                    const arpeggio = Math.floor((synth.tick + synth.part * beepbox.Config.ticksPerPart) / beepbox.Config.rhythms[song.rhythm].ticksPerArpeggio);
                    const arpeggioPattern = beepbox.Config.rhythms[song.rhythm].arpeggioPatterns[tone.pitchCount - 1];
                    arpeggioInterval = tone.pitches[arpeggioPattern[arpeggio % arpeggioPattern.length]] - tone.pitches[0];
                }
                const carrierCount = beepbox.Config.algorithms[instrument.algorithm].carrierCount;
                for (let i = 0; i < beepbox.Config.operatorCount; i++) {
                    const associatedCarrierIndex = beepbox.Config.algorithms[instrument.algorithm].associatedCarrier[i] - 1;
                    const pitch = tone.pitches[!chord.harmonizes ? 0 : ((i < tone.pitchCount) ? i : ((associatedCarrierIndex < tone.pitchCount) ? associatedCarrierIndex : 0))];
                    const freqMult = beepbox.Config.operatorFrequencies[instrument.operators[i].frequency].mult;
                    const interval = beepbox.Config.operatorCarrierInterval[associatedCarrierIndex] + arpeggioInterval;
                    const startPitch = basePitch + (pitch + intervalStart) * intervalScale + interval;
                    const startFreq = freqMult * (Instrument.frequencyFromPitch(startPitch)) + beepbox.Config.operatorFrequencies[instrument.operators[i].frequency].hzOffset;
                    tone.phaseDeltas[i] = startFreq * sampleTime * beepbox.Config.sineWaveLength;
                    let amplitudeStart = instrument.operators[i].amplitude;
                    let amplitudeEnd = instrument.operators[i].amplitude;
                    if (synth.isModActive(ModSetting.mstFMSlider1 + i, false, channel, instrumentIdx)) {
                        amplitudeStart *= synth.getModValue(ModSetting.mstFMSlider1 + i, false, channel, instrumentIdx, false) / 15.0;
                        amplitudeEnd *= synth.getModValue(ModSetting.mstFMSlider1 + i, false, channel, instrumentIdx, true) / 15.0;
                    }
                    const amplitudeCurveStart = Synth.operatorAmplitudeCurve(amplitudeStart);
                    const amplitudeCurveEnd = Synth.operatorAmplitudeCurve(amplitudeEnd);
                    const amplitudeMultStart = amplitudeCurveStart * beepbox.Config.operatorFrequencies[instrument.operators[i].frequency].amplitudeSign;
                    const amplitudeMultEnd = amplitudeCurveEnd * beepbox.Config.operatorFrequencies[instrument.operators[i].frequency].amplitudeSign;
                    let volumeStart = amplitudeMultStart;
                    let volumeEnd = amplitudeMultEnd;
                    // Check for mod-related volume delta
                    if (synth.isModActive(ModSetting.mstInsVolume, false, channel, instrumentIdx)) {
                        volumeStart *= (synth.getModValue(ModSetting.mstInsVolume, false, channel, instrumentIdx, false) + beepbox.Config.volumeRange / 2) / beepbox.Config.volumeRange;
                        volumeEnd *= (synth.getModValue(ModSetting.mstInsVolume, false, channel, instrumentIdx, true) + beepbox.Config.volumeRange / 2) / beepbox.Config.volumeRange;
                    }
                    // Check for SONG mod-related volume delta
                    if (synth.isModActive(ModSetting.mstSongVolume, true)) {
                        volumeStart *= (synth.getModValue(ModSetting.mstSongVolume, true, undefined, undefined, false)) / 100.0;
                        volumeEnd *= (synth.getModValue(ModSetting.mstSongVolume, true, undefined, undefined, true)) / 100.0;
                    }
                    if (i < carrierCount) {
                        // carrier
                        const endPitch = basePitch + (pitch + intervalEnd) * intervalScale + interval;
                        const pitchVolumeStart = Math.pow(2.0, -(startPitch - volumeReferencePitch) / pitchDamping);
                        const pitchVolumeEnd = Math.pow(2.0, -(endPitch - volumeReferencePitch) / pitchDamping);
                        volumeStart *= pitchVolumeStart;
                        volumeEnd *= pitchVolumeEnd;
                        totalCarrierVolumeStart += amplitudeCurveStart;
                        totalCarrierVolumeEnd += amplitudeCurveEnd;
                    }
                    else {
                        // modulator
                        volumeStart *= beepbox.Config.sineWaveLength * 1.5;
                        volumeEnd *= beepbox.Config.sineWaveLength * 1.5;
                        sineVolumeBoostStart *= 1.0 - Math.min(1.0, amplitudeStart / 15);
                        sineVolumeBoostEnd *= 1.0 - Math.min(1.0, amplitudeEnd / 15);
                    }
                    const operatorEnvelope = beepbox.Config.envelopes[instrument.operators[i].envelope];
                    volumeStart *= Synth.computeEnvelope(operatorEnvelope, secondsPerPart * decayTimeStart, beatsPerPart * partTimeStart, customVolumeStart);
                    volumeEnd *= Synth.computeEnvelope(operatorEnvelope, secondsPerPart * decayTimeEnd, beatsPerPart * partTimeEnd, customVolumeEnd);
                    tone.volumeStarts[i] = volumeStart;
                    tone.volumeDeltas[i] = (volumeEnd - volumeStart) / runLength;
                }
                let useFeedbackAmplitudeStart = instrument.feedbackAmplitude;
                let useFeedbackAmplitudeEnd = instrument.feedbackAmplitude;
                if (synth.isModActive(ModSetting.mstFMFeedback, false, channel, instrumentIdx)) {
                    useFeedbackAmplitudeStart *= synth.getModValue(ModSetting.mstFMFeedback, false, channel, instrumentIdx, false) / 15.0;
                    useFeedbackAmplitudeEnd *= synth.getModValue(ModSetting.mstFMFeedback, false, channel, instrumentIdx, true) / 15.0;
                }
                const feedbackAmplitudeStart = beepbox.Config.sineWaveLength * 0.3 * useFeedbackAmplitudeStart / 15.0;
                const feedbackAmplitudeEnd = beepbox.Config.sineWaveLength * 0.3 * useFeedbackAmplitudeEnd / 15.0;
                const feedbackEnvelope = beepbox.Config.envelopes[instrument.feedbackEnvelope];
                let feedbackStart = feedbackAmplitudeStart * Synth.computeEnvelope(feedbackEnvelope, secondsPerPart * decayTimeStart, beatsPerPart * partTimeStart, customVolumeStart);
                let feedbackEnd = feedbackAmplitudeEnd * Synth.computeEnvelope(feedbackEnvelope, secondsPerPart * decayTimeEnd, beatsPerPart * partTimeEnd, customVolumeEnd);
                tone.feedbackMult = feedbackStart;
                tone.feedbackDelta = (feedbackEnd - tone.feedbackMult) / runLength;
                const volumeMult = baseVolume * instrumentVolumeMult;
                tone.volumeStart = filterVolumeStart * volumeMult * transitionVolumeStart * chordVolumeStart;
                const volumeEnd = filterVolumeEnd * volumeMult * transitionVolumeEnd * chordVolumeEnd;
                tone.volumeDelta = (volumeEnd - tone.volumeStart) / runLength;
                sineVolumeBoostStart *= (Math.pow(2.0, (2.0 - 1.4 * feedbackAmplitudeStart / 15.0)) - 1.0) / 3.0;
                sineVolumeBoostEnd *= (Math.pow(2.0, (2.0 - 1.4 * feedbackAmplitudeEnd / 15.0)) - 1.0) / 3.0;
                sineVolumeBoostStart *= 1.0 - Math.min(1.0, Math.max(0.0, totalCarrierVolumeStart - 1) / 2.0);
                sineVolumeBoostEnd *= 1.0 - Math.min(1.0, Math.max(0.0, totalCarrierVolumeEnd - 1) / 2.0);
                tone.volumeStart *= 1.0 + sineVolumeBoostStart * 3.0;
                tone.volumeDelta *= 1.0 + (sineVolumeBoostStart + sineVolumeBoostEnd) * 1.5; // Volume boosts are averaged such that delta brings you to next target start boost.
            }
            else if (instrument.type == 8 /* mod */) {
                // Modulator value is used for data, so don't actually compute audio nonsense for it.
                tone.volumeStart = transitionVolumeStart;
                let volumeEnd = transitionVolumeEnd;
                tone.volumeStart *= customVolumeStart;
                volumeEnd *= customVolumeEnd;
                tone.volumeDelta = (volumeEnd - tone.volumeStart) / runLength;
            }
            else {
                let pitch = tone.pitches[0];
                if (tone.pitchCount > 1) {
                    const arpeggio = Math.floor((synth.tick + synth.part * beepbox.Config.ticksPerPart) / beepbox.Config.rhythms[song.rhythm].ticksPerArpeggio);
                    if (chord.harmonizes) {
                        const arpeggioPattern = beepbox.Config.rhythms[song.rhythm].arpeggioPatterns[tone.pitchCount - 2];
                        const intervalOffset = tone.pitches[1 + arpeggioPattern[arpeggio % arpeggioPattern.length]] - tone.pitches[0];
                        tone.intervalMult = Math.pow(2.0, intervalOffset / 12.0);
                        tone.intervalVolumeMult = Math.pow(2.0, -intervalOffset / pitchDamping);
                    }
                    else {
                        const arpeggioPattern = beepbox.Config.rhythms[song.rhythm].arpeggioPatterns[tone.pitchCount - 1];
                        pitch = tone.pitches[arpeggioPattern[arpeggio % arpeggioPattern.length]];
                    }
                }
                const startPitch = basePitch + (pitch + intervalStart) * intervalScale;
                const endPitch = basePitch + (pitch + intervalEnd) * intervalScale;
                const startFreq = Instrument.frequencyFromPitch(startPitch);
                const pitchVolumeStart = Math.pow(2.0, -(startPitch - volumeReferencePitch) / pitchDamping);
                const pitchVolumeEnd = Math.pow(2.0, -(endPitch - volumeReferencePitch) / pitchDamping);
                let settingsVolumeMultStart = baseVolume * filterVolumeStart;
                let settingsVolumeMultEnd = baseVolume * filterVolumeEnd;
                if (instrument.type == 2 /* noise */) {
                    settingsVolumeMultStart *= beepbox.Config.chipNoises[instrument.chipNoise].volume;
                    settingsVolumeMultEnd *= beepbox.Config.chipNoises[instrument.chipNoise].volume;
                }
                if (instrument.type == 0 /* chip */ || instrument.type == 7 /* customChipWave */) {
                    settingsVolumeMultStart *= beepbox.Config.chipWaves[instrument.chipWave].volume;
                    settingsVolumeMultEnd *= beepbox.Config.chipWaves[instrument.chipWave].volume;
                }
                if (instrument.type == 0 /* chip */ || instrument.type == 5 /* harmonics */ || instrument.type == 7 /* customChipWave */) {
                    settingsVolumeMultStart *= beepbox.Config.intervals[instrument.interval].volume;
                    settingsVolumeMultEnd *= beepbox.Config.intervals[instrument.interval].volume;
                }
                if (instrument.type == 6 /* pwm */) {
                    // Check for PWM mods to this instrument
                    let pulseWidthModStart = 1.0;
                    let pulseWidthModEnd = 1.0;
                    if (synth.isModActive(ModSetting.mstPulseWidth, false, channel, instrumentIdx)) {
                        pulseWidthModStart = (synth.getModValue(ModSetting.mstPulseWidth, false, channel, instrumentIdx, false)) / beepbox.Config.pulseWidthRange;
                        pulseWidthModEnd = (synth.getModValue(ModSetting.mstPulseWidth, false, channel, instrumentIdx, true)) / beepbox.Config.pulseWidthRange;
                    }
                    const pulseEnvelope = beepbox.Config.envelopes[instrument.pulseEnvelope];
                    const basePulseWidth = instrument.pulseWidth / 100;
                    const pulseWidthStart = basePulseWidth * pulseWidthModStart * Synth.computeEnvelope(pulseEnvelope, secondsPerPart * decayTimeStart, beatsPerPart * partTimeStart, customVolumeStart);
                    const pulseWidthEnd = basePulseWidth * pulseWidthModEnd * Synth.computeEnvelope(pulseEnvelope, secondsPerPart * decayTimeEnd, beatsPerPart * partTimeEnd, customVolumeEnd);
                    tone.pulseWidth = pulseWidthStart;
                    tone.pulseWidthDelta = (pulseWidthEnd - pulseWidthStart) / runLength;
                }
                tone.phaseDeltas[0] = startFreq * sampleTime;
                tone.volumeStart = transitionVolumeStart * chordVolumeStart * pitchVolumeStart * settingsVolumeMultStart * instrumentVolumeMult;
                let volumeEnd = transitionVolumeEnd * chordVolumeEnd * pitchVolumeEnd * settingsVolumeMultEnd * instrumentVolumeMult;
                if (filterEnvelope.type != 0 /* custom */ && (instrument.type != 6 /* pwm */ || beepbox.Config.envelopes[instrument.pulseEnvelope].type != 0 /* custom */)) {
                    tone.volumeStart *= customVolumeStart;
                    volumeEnd *= customVolumeEnd;
                }
                // Check for mod-related volume delta
                if (synth.isModActive(ModSetting.mstInsVolume, false, channel, instrumentIdx)) {
                    tone.volumeStart *= (synth.getModValue(ModSetting.mstInsVolume, false, channel, instrumentIdx, false) + beepbox.Config.volumeRange / 2) / beepbox.Config.volumeRange;
                    volumeEnd *= (synth.getModValue(ModSetting.mstInsVolume, false, channel, instrumentIdx, true) + beepbox.Config.volumeRange / 2) / beepbox.Config.volumeRange;
                }
                // Check for SONG mod-related volume delta
                if (synth.isModActive(ModSetting.mstSongVolume, true)) {
                    tone.volumeStart *= (synth.getModValue(ModSetting.mstSongVolume, true, undefined, undefined, false)) / 100.0;
                    volumeEnd *= (synth.getModValue(ModSetting.mstSongVolume, true, undefined, undefined, true)) / 100.0;
                }
                tone.volumeDelta = (volumeEnd - tone.volumeStart) / runLength;
            }
            tone.phaseDeltaScale = Math.pow(2.0, ((intervalEnd - intervalStart) * intervalScale / 12.0) / runLength);
        }
        static getLFOAmplitude(instrument, secondsIntoBar) {
            let effect = 0.0;
            for (const vibratoPeriodSeconds of beepbox.Config.vibratos[instrument.vibrato].periodsSeconds) {
                effect += Math.sin(Math.PI * 2.0 * secondsIntoBar / vibratoPeriodSeconds);
            }
            return effect;
        }
        static getInstrumentSynthFunction(instrument) {
            if (instrument.type == 1 /* fm */) {
                const fingerprint = instrument.algorithm + "_" + instrument.feedbackType;
                if (Synth.fmSynthFunctionCache[fingerprint] == undefined) {
                    const synthSource = [];
                    for (const line of Synth.fmSourceTemplate) {
                        if (line.indexOf("// CARRIER OUTPUTS") != -1) {
                            const outputs = [];
                            for (let j = 0; j < beepbox.Config.algorithms[instrument.algorithm].carrierCount; j++) {
                                outputs.push("operator" + j + "Scaled");
                            }
                            synthSource.push(line.replace("/*operator#Scaled*/", outputs.join(" + ")));
                        }
                        else if (line.indexOf("// INSERT OPERATOR COMPUTATION HERE") != -1) {
                            for (let j = beepbox.Config.operatorCount - 1; j >= 0; j--) {
                                for (const operatorLine of Synth.operatorSourceTemplate) {
                                    if (operatorLine.indexOf("/* + operator@Scaled*/") != -1) {
                                        let modulators = "";
                                        for (const modulatorNumber of beepbox.Config.algorithms[instrument.algorithm].modulatedBy[j]) {
                                            modulators += " + operator" + (modulatorNumber - 1) + "Scaled";
                                        }
                                        const feedbackIndices = beepbox.Config.feedbacks[instrument.feedbackType].indices[j];
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
                            for (let j = 0; j < beepbox.Config.operatorCount; j++) {
                                synthSource.push(line.replace(/\#/g, j + ""));
                            }
                        }
                        else {
                            synthSource.push(line);
                        }
                    }
                    //console.log(synthSource.join("\n"));
                    Synth.fmSynthFunctionCache[fingerprint] = new Function("synth", "data", "stereoBufferIndex", "stereoBufferLength", "runLength", "tone", "instrument", synthSource.join("\n"));
                }
                return Synth.fmSynthFunctionCache[fingerprint];
            }
            else if (instrument.type == 0 /* chip */) {
                return Synth.chipSynth;
            }
            else if (instrument.type == 7 /* customChipWave */) {
                return Synth.chipSynth;
            }
            else if (instrument.type == 5 /* harmonics */) {
                return Synth.harmonicsSynth;
            }
            else if (instrument.type == 6 /* pwm */) {
                return Synth.pulseWidthSynth;
            }
            else if (instrument.type == 2 /* noise */) {
                return Synth.noiseSynth;
            }
            else if (instrument.type == 3 /* spectrum */) {
                return Synth.spectrumSynth;
            }
            else if (instrument.type == 4 /* drumset */) {
                return Synth.drumsetSynth;
            }
            else if (instrument.type == 8 /* mod */) {
                return Synth.modSynth;
            }
            else {
                throw new Error("Unrecognized instrument type: " + instrument.type);
            }
        }
        static chipSynth(synth, data, stereoBufferIndex, stereoBufferLength, runLength, tone, instrument) {
            var wave;
            var volumeScale;
            const isCustomWave = (instrument.type == 7 /* customChipWave */);
            if (!isCustomWave) {
                wave = beepbox.Config.chipWaves[instrument.chipWave].samples;
                volumeScale = 1.0;
            }
            else {
                wave = instrument.customChipWaveIntegral;
                // Integrals for custom chip wave can get rather big. This "zero point" can be config'ed later.
                volumeScale = 0.1;
            }
            const waveLength = +wave.length - 1; // The first sample is duplicated at the end, don't double-count it.
            const intervalA = +Math.pow(2.0, (beepbox.Config.intervals[instrument.interval].offset + beepbox.Config.intervals[instrument.interval].spread) / 12.0);
            const intervalB = Math.pow(2.0, (beepbox.Config.intervals[instrument.interval].offset - beepbox.Config.intervals[instrument.interval].spread) / 12.0) * tone.intervalMult;
            const intervalSign = tone.intervalVolumeMult * beepbox.Config.intervals[instrument.interval].sign;
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
            const isFirstOrder = tone.isFirstOrder;
            let filter1 = +tone.filter;
            let filter2 = isFirstOrder ? 1.0 : filter1;
            const filterScale1 = +tone.filterScale;
            const filterScale2 = isFirstOrder ? 1.0 : filterScale1;
            let filterResonance = tone.filterResonanceStart;
            let filterResonanceDelta = tone.filterResonanceDelta;
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
            let stereoVolumeL = tone.stereoVolumeLStart;
            let stereoVolumeLDelta = tone.stereoVolumeLDelta;
            let stereoVolumeR = tone.stereoVolumeRStart;
            let stereoVolumeRDelta = tone.stereoVolumeRDelta;
            let stereoDelay = tone.stereoDelayStart;
            let stereoDelayDelta = tone.stereoDelayDelta;
            let delays;
            //console.log("S: " + stereoBufferIndex + " P: " + stopIndex);
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
                filterResonance += filterResonanceDelta;
                const output = filterSample1 * volume * volumeScale;
                volume += volumeDelta;
                //const absStereoDelay: number = Math.abs(stereoDelay);
                //const fracStereoDelay: number = absStereoDelay % 1;
                //const floorStereoDelay: number = absStereoDelay | 0;
                //delays = stereoDelay < 0 ? [0, 0, floorStereoDelay * 2, fracStereoDelay] : [floorStereoDelay * 2, fracStereoDelay, 0, 0];
                // Optimized ver: can remove the above three declarations, but muddier conceptually. Still has that conditional, too...
                delays = stereoDelay < 0 ? [0, 0, ((-stereoDelay) | 0) * 2, (-stereoDelay) % 1] : [(stereoDelay | 0) * 2, stereoDelay % 1, 0, 0];
                data[(stereoBufferIndex + delays[0]) % stereoBufferLength] += output * stereoVolumeL * (1 - delays[1]);
                data[(stereoBufferIndex + delays[0] + 2) % stereoBufferLength] += output * stereoVolumeL * delays[1];
                data[(stereoBufferIndex + delays[2] + 1) % stereoBufferLength] += output * stereoVolumeR * (1 - delays[3]);
                data[(stereoBufferIndex + delays[2] + 3) % stereoBufferLength] += output * stereoVolumeR * delays[3];
                stereoVolumeL += stereoVolumeLDelta;
                stereoVolumeR += stereoVolumeRDelta;
                stereoDelay += stereoDelayDelta;
                stereoBufferIndex += 2;
            }
            //debugString += "," + data.subarray(stereoBufferIndex - runLength, stereoBufferIndex).toString();
            //console.log(stereoBufferIndex);
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
            const waveLength = +wave.length - 1; // The first sample is duplicated at the end, don't double-count it.
            const intervalA = +Math.pow(2.0, (beepbox.Config.intervals[instrument.interval].offset + beepbox.Config.intervals[instrument.interval].spread) / 12.0);
            const intervalB = Math.pow(2.0, (beepbox.Config.intervals[instrument.interval].offset - beepbox.Config.intervals[instrument.interval].spread) / 12.0) * tone.intervalMult;
            const intervalSign = tone.intervalVolumeMult * beepbox.Config.intervals[instrument.interval].sign;
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
            const isFirstOrder = tone.isFirstOrder;
            let filter1 = +tone.filter;
            let filter2 = isFirstOrder ? 1.0 : filter1;
            const filterScale1 = +tone.filterScale;
            const filterScale2 = isFirstOrder ? 1.0 : filterScale1;
            let filterResonance = tone.filterResonanceStart;
            let filterResonanceDelta = tone.filterResonanceDelta;
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
            let stereoVolumeL = tone.stereoVolumeLStart;
            let stereoVolumeLDelta = tone.stereoVolumeLDelta;
            let stereoVolumeR = tone.stereoVolumeRStart;
            let stereoVolumeRDelta = tone.stereoVolumeRDelta;
            let stereoDelay = tone.stereoDelayStart;
            let stereoDelayDelta = tone.stereoDelayDelta;
            let delays;
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
                filterResonance += filterResonanceDelta;
                const output = filterSample1 * volume;
                volume += volumeDelta;
                //const absStereoDelay: number = Math.abs(stereoDelay);
                //const fracStereoDelay: number = absStereoDelay % 1;
                //const floorStereoDelay: number = absStereoDelay | 0;
                //delays = stereoDelay < 0 ? [0, 0, floorStereoDelay * 2, fracStereoDelay] : [floorStereoDelay * 2, fracStereoDelay, 0, 0];
                // Optimized ver: can remove the above three declarations, but muddier conceptually. Still has that conditional, too...
                delays = stereoDelay < 0 ? [0, 0, ((-stereoDelay) | 0) * 2, (-stereoDelay) % 1] : [(stereoDelay | 0) * 2, stereoDelay % 1, 0, 0];
                data[(stereoBufferIndex + delays[0]) % stereoBufferLength] += output * stereoVolumeL * (1 - delays[1]);
                data[(stereoBufferIndex + delays[0] + 2) % stereoBufferLength] += output * stereoVolumeL * delays[1];
                data[(stereoBufferIndex + delays[2] + 1) % stereoBufferLength] += output * stereoVolumeR * (1 - delays[3]);
                data[(stereoBufferIndex + delays[2] + 3) % stereoBufferLength] += output * stereoVolumeR * delays[3];
                stereoVolumeL += stereoVolumeLDelta;
                stereoVolumeR += stereoVolumeRDelta;
                stereoDelay += stereoDelayDelta;
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
            const isFirstOrder = tone.isFirstOrder;
            let filter1 = +tone.filter;
            let filter2 = isFirstOrder ? 1.0 : filter1;
            const filterScale1 = +tone.filterScale;
            const filterScale2 = isFirstOrder ? 1.0 : filterScale1;
            let filterResonance = tone.filterResonanceStart;
            let filterResonanceDelta = tone.filterResonanceDelta;
            let filterSample0 = +tone.filterSample0;
            let filterSample1 = +tone.filterSample1;
            const stopIndex = stereoBufferIndex + runLength;
            stereoBufferIndex += tone.stereoOffset;
            let stereoVolumeL = tone.stereoVolumeLStart;
            let stereoVolumeLDelta = tone.stereoVolumeLDelta;
            let stereoVolumeR = tone.stereoVolumeRStart;
            let stereoVolumeRDelta = tone.stereoVolumeRDelta;
            let stereoDelay = tone.stereoDelayStart;
            let stereoDelayDelta = tone.stereoDelayDelta;
            let delays;
            while (stereoBufferIndex < stopIndex) {
                const sawPhaseA = phase % 1;
                const sawPhaseB = (phase + pulseWidth) % 1;
                let pulseWave = sawPhaseB - sawPhaseA;
                // This a PolyBLEP, which smooths out discontinuities at any frequency to reduce aliasing. 
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
                filterResonance += filterResonanceDelta;
                const output = filterSample1 * volume;
                volume += volumeDelta;
                //const absStereoDelay: number = Math.abs(stereoDelay);
                //const fracStereoDelay: number = absStereoDelay % 1;
                //const floorStereoDelay: number = absStereoDelay | 0;
                //delays = stereoDelay < 0 ? [0, 0, floorStereoDelay * 2, fracStereoDelay] : [floorStereoDelay * 2, fracStereoDelay, 0, 0];
                // Optimized ver: can remove the above three declarations, but muddier conceptually. Still has that conditional, too...
                delays = stereoDelay < 0 ? [0, 0, ((-stereoDelay) | 0) * 2, (-stereoDelay) % 1] : [(stereoDelay | 0) * 2, stereoDelay % 1, 0, 0];
                data[(stereoBufferIndex + delays[0]) % stereoBufferLength] += output * stereoVolumeL * (1 - delays[1]);
                data[(stereoBufferIndex + delays[0] + 2) % stereoBufferLength] += output * stereoVolumeL * delays[1];
                data[(stereoBufferIndex + delays[2] + 1) % stereoBufferLength] += output * stereoVolumeR * (1 - delays[3]);
                data[(stereoBufferIndex + delays[2] + 3) % stereoBufferLength] += output * stereoVolumeR * delays[3];
                stereoVolumeL += stereoVolumeLDelta;
                stereoVolumeR += stereoVolumeRDelta;
                stereoDelay += stereoDelayDelta;
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
            let phase = (tone.phases[0] % 1) * beepbox.Config.chipNoiseLength;
            if (tone.phases[0] == 0) {
                // Zero phase means the tone was reset, just give noise a random start phase instead.
                phase = Math.random() * beepbox.Config.chipNoiseLength;
            }
            let sample = +tone.sample;
            const isFirstOrder = tone.isFirstOrder;
            let filter1 = +tone.filter;
            let filter2 = isFirstOrder ? 1.0 : filter1;
            const filterScale1 = +tone.filterScale;
            const filterScale2 = isFirstOrder ? 1.0 : filterScale1;
            let filterResonance = tone.filterResonanceStart;
            let filterResonanceDelta = tone.filterResonanceDelta;
            let filterSample0 = +tone.filterSample0;
            let filterSample1 = +tone.filterSample1;
            const pitchRelativefilter = Math.min(1.0, tone.phaseDeltas[0] * beepbox.Config.chipNoises[instrument.chipNoise].pitchFilterMult);
            const stopIndex = stereoBufferIndex + runLength;
            stereoBufferIndex += tone.stereoOffset;
            let stereoVolumeL = tone.stereoVolumeLStart;
            let stereoVolumeLDelta = tone.stereoVolumeLDelta;
            let stereoVolumeR = tone.stereoVolumeRStart;
            let stereoVolumeRDelta = tone.stereoVolumeRDelta;
            let stereoDelay = tone.stereoDelayStart;
            let stereoDelayDelta = tone.stereoDelayDelta;
            let delays;
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
                filterResonance += filterResonanceDelta;
                const output = filterSample1 * volume;
                volume += volumeDelta;
                //const absStereoDelay: number = Math.abs(stereoDelay);
                //const fracStereoDelay: number = absStereoDelay % 1;
                //const floorStereoDelay: number = absStereoDelay | 0;
                //delays = stereoDelay < 0 ? [0, 0, floorStereoDelay * 2, fracStereoDelay] : [floorStereoDelay * 2, fracStereoDelay, 0, 0];
                // Optimized ver: can remove the above three declarations, but muddier conceptually. Still has that conditional, too...
                delays = stereoDelay < 0 ? [0, 0, ((-stereoDelay) | 0) * 2, (-stereoDelay) % 1] : [(stereoDelay | 0) * 2, stereoDelay % 1, 0, 0];
                data[(stereoBufferIndex + delays[0]) % stereoBufferLength] += output * stereoVolumeL * (1 - delays[1]);
                data[(stereoBufferIndex + delays[0] + 2) % stereoBufferLength] += output * stereoVolumeL * delays[1];
                data[(stereoBufferIndex + delays[2] + 1) % stereoBufferLength] += output * stereoVolumeR * (1 - delays[3]);
                data[(stereoBufferIndex + delays[2] + 3) % stereoBufferLength] += output * stereoVolumeR * delays[3];
                stereoVolumeL += stereoVolumeLDelta;
                stereoVolumeR += stereoVolumeRDelta;
                stereoDelay += stereoDelayDelta;
                stereoBufferIndex += 2;
            }
            tone.phases[0] = phase / beepbox.Config.chipNoiseLength;
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
            const isFirstOrder = tone.isFirstOrder;
            let filter1 = +tone.filter;
            let filter2 = isFirstOrder ? 1.0 : filter1;
            const filterScale1 = +tone.filterScale;
            const filterScale2 = isFirstOrder ? 1.0 : filterScale1;
            let filterResonance = tone.filterResonanceStart;
            let filterResonanceDelta = tone.filterResonanceDelta;
            let filterSample0 = +tone.filterSample0;
            let filterSample1 = +tone.filterSample1;
            let phase = (tone.phases[0] % 1) * beepbox.Config.chipNoiseLength;
            // Zero phase means the tone was reset, just give noise a random start phase instead.
            if (tone.phases[0] == 0)
                phase = Synth.findRandomZeroCrossing(wave) + phaseDelta;
            const pitchRelativefilter = Math.min(1.0, phaseDelta);
            const stopIndex = stereoBufferIndex + runLength;
            stereoBufferIndex += tone.stereoOffset;
            let stereoVolumeL = tone.stereoVolumeLStart;
            let stereoVolumeLDelta = tone.stereoVolumeLDelta;
            let stereoVolumeR = tone.stereoVolumeRStart;
            let stereoVolumeRDelta = tone.stereoVolumeRDelta;
            let stereoDelay = tone.stereoDelayStart;
            let stereoDelayDelta = tone.stereoDelayDelta;
            let delays;
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
                filterResonance += filterResonanceDelta;
                const output = filterSample1 * volume;
                volume += volumeDelta;
                //const absStereoDelay: number = Math.abs(stereoDelay);
                //const fracStereoDelay: number = absStereoDelay % 1;
                //const floorStereoDelay: number = absStereoDelay | 0;
                //delays = stereoDelay < 0 ? [0, 0, floorStereoDelay * 2, fracStereoDelay] : [floorStereoDelay * 2, fracStereoDelay, 0, 0];
                // Optimized ver: can remove the above three declarations, but muddier conceptually. Still has that conditional, too...
                delays = stereoDelay < 0 ? [0, 0, ((-stereoDelay) | 0) * 2, (-stereoDelay) % 1] : [(stereoDelay | 0) * 2, stereoDelay % 1, 0, 0];
                data[(stereoBufferIndex + delays[0]) % stereoBufferLength] += output * stereoVolumeL * (1 - delays[1]);
                data[(stereoBufferIndex + delays[0] + 2) % stereoBufferLength] += output * stereoVolumeL * delays[1];
                data[(stereoBufferIndex + delays[2] + 1) % stereoBufferLength] += output * stereoVolumeR * (1 - delays[3]);
                data[(stereoBufferIndex + delays[2] + 3) % stereoBufferLength] += output * stereoVolumeR * delays[3];
                stereoVolumeL += stereoVolumeLDelta;
                stereoVolumeR += stereoVolumeRDelta;
                stereoDelay += stereoDelayDelta;
                stereoBufferIndex += 2;
            }
            tone.phases[0] = phase / beepbox.Config.chipNoiseLength;
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
            ;
            const phaseDeltaScale = +tone.phaseDeltaScale;
            let volume = +tone.volumeStart;
            const volumeDelta = +tone.volumeDelta;
            let sample = +tone.sample;
            const isFirstOrder = tone.isFirstOrder;
            let filter1 = +tone.filter;
            let filter2 = isFirstOrder ? 1.0 : filter1;
            const filterScale1 = +tone.filterScale;
            const filterScale2 = isFirstOrder ? 1.0 : filterScale1;
            let filterResonance = tone.filterResonanceStart;
            let filterResonanceDelta = tone.filterResonanceDelta;
            let filterSample0 = +tone.filterSample0;
            let filterSample1 = +tone.filterSample1;
            let phase = (tone.phases[0] % 1) * beepbox.Config.chipNoiseLength;
            // Zero phase means the tone was reset, just give noise a random start phase instead.
            if (tone.phases[0] == 0)
                phase = Synth.findRandomZeroCrossing(wave) + phaseDelta;
            const stopIndex = stereoBufferIndex + runLength;
            stereoBufferIndex += tone.stereoOffset;
            let stereoVolumeL = tone.stereoVolumeLStart;
            let stereoVolumeLDelta = tone.stereoVolumeLDelta;
            let stereoVolumeR = tone.stereoVolumeRStart;
            let stereoVolumeRDelta = tone.stereoVolumeRDelta;
            let stereoDelay = tone.stereoDelayStart;
            let stereoDelayDelta = tone.stereoDelayDelta;
            let delays;
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
                filterResonance += filterResonanceDelta;
                const output = filterSample1 * volume;
                volume += volumeDelta;
                //const absStereoDelay: number = Math.abs(stereoDelay);
                //const fracStereoDelay: number = absStereoDelay % 1;
                //const floorStereoDelay: number = absStereoDelay | 0;
                //delays = stereoDelay < 0 ? [0, 0, floorStereoDelay * 2, fracStereoDelay] : [floorStereoDelay * 2, fracStereoDelay, 0, 0];
                // Optimized ver: can remove the above three declarations, but muddier conceptually. Still has that conditional, too...
                delays = stereoDelay < 0 ? [0, 0, ((-stereoDelay) | 0) * 2, (-stereoDelay) % 1] : [(stereoDelay | 0) * 2, stereoDelay % 1, 0, 0];
                data[(stereoBufferIndex + delays[0]) % stereoBufferLength] += output * stereoVolumeL * (1 - delays[1]);
                data[(stereoBufferIndex + delays[0] + 2) % stereoBufferLength] += output * stereoVolumeL * delays[1];
                data[(stereoBufferIndex + delays[2] + 1) % stereoBufferLength] += output * stereoVolumeR * (1 - delays[3]);
                data[(stereoBufferIndex + delays[2] + 3) % stereoBufferLength] += output * stereoVolumeR * delays[3];
                stereoVolumeL += stereoVolumeLDelta;
                stereoVolumeR += stereoVolumeRDelta;
                stereoDelay += stereoDelayDelta;
                stereoBufferIndex += 2;
            }
            tone.phases[0] = phase / beepbox.Config.chipNoiseLength;
            tone.sample = sample;
            const epsilon = (1.0e-24);
            if (-epsilon < filterSample0 && filterSample0 < epsilon)
                filterSample0 = 0.0;
            if (-epsilon < filterSample1 && filterSample1 < epsilon)
                filterSample1 = 0.0;
            tone.filterSample0 = filterSample0;
            tone.filterSample1 = filterSample1;
        }
        static modSynth(synth, data, stereoBufferIndex, stereoBufferLength, runLength, tone, instrument) {
            // Note: present modulator value is tone.volumeStart.
            if (!synth.song)
                return;
            let mod = beepbox.Config.modCount - 1 - tone.pitches[0];
            let setting = instrument.modSettings[mod];
            let val;
            val = synth.setModValue(tone.customVolumeStart, tone.customVolumeEnd, mod, instrument, setting);
            if (val >= 1.0 && setting == ModSetting.mstNextBar) {
                synth.skipBar();
            }
        }
        static findRandomZeroCrossing(wave) {
            let phase = Math.random() * beepbox.Config.chipNoiseLength;
            // Spectrum and drumset waves sounds best when they start at a zero crossing,
            // otherwise they pop. Try to find a zero crossing.
            let indexPrev = phase & 0x7fff;
            let wavePrev = wave[indexPrev];
            const stride = 16;
            for (let attemptsRemaining = 128; attemptsRemaining > 0; attemptsRemaining--) {
                const indexNext = (indexPrev + stride) & 0x7fff;
                const waveNext = wave[indexNext];
                if (wavePrev * waveNext <= 0.0) {
                    // Found a zero crossing! Now let's narrow it down to two adjacent sample indices.
                    for (let i = 0; i < 16; i++) {
                        const innerIndexNext = (indexPrev + 1) & 0x7fff;
                        const innerWaveNext = wave[innerIndexNext];
                        if (wavePrev * innerWaveNext <= 0.0) {
                            // Found the zero crossing again! Now let's find the exact intersection.
                            const slope = innerWaveNext - wavePrev;
                            phase = indexPrev;
                            if (Math.abs(slope) > 0.00000001) {
                                phase += -wavePrev / slope;
                            }
                            phase = Math.max(0, phase) % beepbox.Config.chipNoiseLength;
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
            return (instrumentVolume == -beepbox.Config.volumeRange / 2.0) ? 0.0 : Math.pow(2, beepbox.Config.volumeLogScale * instrumentVolume);
        }
        static volumeMultToInstrumentVolume(volumeMult) {
            return (volumeMult <= 0.0) ? -beepbox.Config.volumeRange / 2 : Math.min(beepbox.Config.volumeRange, (Math.log(volumeMult) / Math.LN2) / beepbox.Config.volumeLogScale);
        }
        static expressionToVolumeMult(expression) {
            return Math.pow(Math.max(0.0, expression) / 6.0, 1.5);
        }
        static volumeMultToExpression(volumeMult) {
            return Math.pow(Math.max(0.0, volumeMult), 1 / 1.5) * 6.0;
        }
        getSamplesPerTick() {
            if (this.song == null)
                return 0;
            let beatsPerMinute = this.song.getBeatsPerMinute();
            if (this.isModActive(ModSetting.mstTempo, true)) {
                beatsPerMinute = this.getModValue(ModSetting.mstTempo, true);
            }
            const beatsPerSecond = beatsPerMinute / 60.0;
            const partsPerSecond = beatsPerSecond * beepbox.Config.partsPerBeat;
            const tickPerSecond = partsPerSecond * beepbox.Config.ticksPerPart;
            return Math.floor(this.samplesPerSecond / tickPerSecond);
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
			
			const isFirstOrder = tone.isFirstOrder;
			let filter1 = +tone.filter;
			let filter2 = isFirstOrder ? 1.0 : filter1;
			const filterScale1 = +tone.filterScale;
			const filterScale2 = isFirstOrder ? 1.0 : filterScale1;
			let filterResonance = tone.filterResonanceStart;
			let filterResonanceDelta = tone.filterResonanceDelta;
			let filterSample0 = +tone.filterSample0;
			let filterSample1 = +tone.filterSample1;
			
			const stopIndex = stereoBufferIndex + runLength;
			stereoBufferIndex += tone.stereoOffset;
			let stereoVolumeL = tone.stereoVolumeLStart;
			let stereoVolumeLDelta = tone.stereoVolumeLDelta;
			let stereoVolumeR = tone.stereoVolumeRStart;
			let stereoVolumeRDelta = tone.stereoVolumeRDelta;
			let stereoDelay = tone.stereoDelayStart;
			let stereoDelayDelta = tone.stereoDelayDelta;
			let delays = [];
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
				filterResonance += filterResonanceDelta;
				
				const output = filterSample1 * volume;
				volume += volumeDelta;

				//const absStereoDelay: number = Math.abs(stereoDelay);
				//const fracStereoDelay: number = absStereoDelay % 1;
				//const floorStereoDelay: number = absStereoDelay | 0;

				//delays = stereoDelay < 0 ? [0, 0, floorStereoDelay * 2, fracStereoDelay] : [floorStereoDelay * 2, fracStereoDelay, 0, 0];

				// Optimized ver: can remove the above three declarations, but muddier conceptually. Still has that conditional, too...
				delays = stereoDelay < 0 ? [0, 0, ((-stereoDelay) | 0) * 2, (-stereoDelay) % 1] : [(stereoDelay | 0) * 2, stereoDelay % 1, 0, 0];

				data[(stereoBufferIndex + delays[0]) % stereoBufferLength] += output * stereoVolumeL * (1 - delays[1]);
				data[(stereoBufferIndex + delays[0] + 2) % stereoBufferLength] += output * stereoVolumeL * delays[1];
				data[(stereoBufferIndex + delays[2] + 1) % stereoBufferLength] += output * stereoVolumeR * (1 - delays[3]);
				data[(stereoBufferIndex + delays[2] + 3) % stereoBufferLength] += output * stereoVolumeR * delays[3];

				stereoVolumeL += stereoVolumeLDelta;
				stereoVolumeR += stereoVolumeRDelta;
				stereoDelay += stereoDelayDelta;

				stereoBufferIndex += 2;
			}
			
			tone.phases[#] = operator#Phase / ` + beepbox.Config.sineWaveLength + `;
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
				const operator#Index    = operator#PhaseInt & ` + beepbox.Config.sineWaveMask + `;
				const operator#Sample   = sineWave[operator#Index];
				operator#Output       = operator#Sample + (sineWave[operator#Index + 1] - operator#Sample) * (operator#PhaseMix - operator#PhaseInt);
				const operator#Scaled   = operator#OutputMult * operator#Output;
		`).split("\n");
    beepbox.Synth = Synth;
})(beepbox || (beepbox = {}));
//# sourceMappingURL=synth.js.map