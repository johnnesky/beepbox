var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
"use strict";
var beepbox;
(function (beepbox) {
    var BitField = (function () {
        function BitField(base64) {
            this._bits = [];
            this._readIndex = 0;
            this._base64 = base64;
        }
        BitField.prototype.load = function (source) {
            for (var _i = 0, _a = source.split(""); _i < _a.length; _i++) {
                var char = _a[_i];
                var value = this._base64.indexOf(char);
                this._bits.push((value & 0x20) != 0);
                this._bits.push((value & 0x10) != 0);
                this._bits.push((value & 0x08) != 0);
                this._bits.push((value & 0x04) != 0);
                this._bits.push((value & 0x02) != 0);
                this._bits.push((value & 0x01) != 0);
            }
        };
        BitField.prototype.addPadding = function () {
            while ((this._bits.length % 6) != 0) {
                this._bits.push(false);
            }
        };
        BitField.prototype.skipPadding = function () {
            this._readIndex += 5 - ((this._readIndex + 5) % 6);
        };
        BitField.prototype.write = function (bitCount, value) {
            bitCount--;
            while (bitCount >= 0) {
                this._bits.push(((value >> bitCount) & 1) == 1);
                bitCount--;
            }
        };
        BitField.prototype.read = function (bitCount) {
            var result = 0;
            while (bitCount > 0) {
                result = result << 1;
                result += this._bits[this._readIndex++] ? 1 : 0;
                bitCount--;
            }
            return result;
        };
        BitField.prototype.writeLongTail = function (minValue, minBits, value) {
            if (value < minValue)
                throw new Error("value out of bounds");
            value -= minValue;
            var numBits = minBits;
            while (value >= (1 << numBits)) {
                this._bits.push(true);
                value -= 1 << numBits;
                numBits++;
            }
            this._bits.push(false);
            while (numBits > 0) {
                numBits--;
                this._bits.push((value & (1 << numBits)) != 0);
            }
        };
        BitField.prototype.readLongTail = function (minValue, minBits) {
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
        BitField.prototype.writePartDuration = function (value) {
            this.writeLongTail(1, 2, value);
        };
        BitField.prototype.readPartDuration = function () {
            return this.readLongTail(1, 2);
        };
        BitField.prototype.writePinCount = function (value) {
            this.writeLongTail(1, 0, value);
        };
        BitField.prototype.readPinCount = function () {
            return this.readLongTail(1, 0);
        };
        BitField.prototype.writeNoteInterval = function (value) {
            if (value < 0) {
                this.write(1, 1);
                this.writeLongTail(1, 3, -value);
            }
            else {
                this.write(1, 0);
                this.writeLongTail(1, 3, value);
            }
        };
        BitField.prototype.readNoteInterval = function () {
            if (this.read(1)) {
                return -this.readLongTail(1, 3);
            }
            else {
                return this.readLongTail(1, 3);
            }
        };
        BitField.prototype.concat = function (other) {
            this._bits = this._bits.concat(other._bits);
        };
        BitField.prototype.toString = function () {
            var paddedBits = this._bits.concat([false, false, false, false, false, false]);
            var result = "";
            for (var i = 0; i < this._bits.length; i += 6) {
                var value = 0;
                if (this._bits[i + 0])
                    value += 0x20;
                if (this._bits[i + 1])
                    value += 0x10;
                if (this._bits[i + 2])
                    value += 0x08;
                if (this._bits[i + 3])
                    value += 0x04;
                if (this._bits[i + 4])
                    value += 0x02;
                if (this._bits[i + 5])
                    value += 0x01;
                result += this._base64[value];
            }
            return result;
        };
        BitField.prototype.traceBits = function () {
            console.log(this._bits);
        };
        return BitField;
    }());
    beepbox.BitField = BitField;
    var Music = (function () {
        function Music() {
        }
        return Music;
    }());
    Music.scaleNames = ["easy :)", "easy :(", "island :)", "island :(", "blues :)", "blues :(", "normal :)", "normal :(", "romani :)", "romani :(", "enigma", "expert"];
    Music.scaleFlags = [
        [true, false, true, false, true, false, false, true, false, true, false, false],
        [true, false, false, true, false, true, false, true, false, false, true, false],
        [true, false, false, false, true, true, false, true, false, false, false, true],
        [true, true, false, true, false, false, false, true, true, false, false, false],
        [true, false, true, true, true, false, false, true, false, true, false, false],
        [true, false, false, true, false, true, true, true, false, false, true, false],
        [true, false, true, false, true, true, false, true, false, true, false, true],
        [true, false, true, true, false, true, false, true, true, false, true, false],
        [true, true, false, false, true, true, false, true, true, false, true, false],
        [true, false, true, true, false, false, true, true, true, false, false, true],
        [true, false, true, false, true, false, true, false, true, false, true, false],
        [true, true, true, true, true, true, true, true, true, true, true, true],
    ];
    Music.pianoScaleFlags = [true, false, true, false, true, true, false, true, false, true, false, true];
    Music.blackKeyNameParents = [-1, 1, -1, 1, -1, 1, -1, -1, 1, -1, 1, -1];
    Music.noteNames = ["C", null, "D", null, "E", "F", null, "G", null, "A", null, "B"];
    Music.keyNames = ["B", "A♯", "A", "G♯", "G", "F♯", "F", "E", "D♯", "D", "C♯", "C"];
    Music.keyTransposes = [23, 22, 21, 20, 19, 18, 17, 16, 15, 14, 13, 12];
    Music.tempoNames = ["molasses", "slow", "leisurely", "moderate", "steady", "brisk", "hasty", "fast", "strenuous", "grueling", "hyper", "ludicrous"];
    Music.beatsMin = 3;
    Music.beatsMax = 15;
    Music.barsMin = 1;
    Music.barsMax = 128;
    Music.patternsMin = 1;
    Music.patternsMax = 64;
    Music.instrumentsMin = 1;
    Music.instrumentsMax = 10;
    Music.partNames = ["triples", "standard"];
    Music.partCounts = [3, 4];
    Music.waveNames = ["triangle", "square", "pulse wide", "pulse narrow", "sawtooth", "double saw", "double pulse", "spiky", "plateau"];
    Music.waveVolumes = [1.0, 0.5, 0.5, 0.5, 0.65, 0.5, 0.4, 0.4, 0.94];
    Music.drumNames = ["retro", "white"];
    Music.drumVolumes = [0.25, 1.0];
    Music.filterNames = ["sustain sharp", "sustain medium", "sustain soft", "decay sharp", "decay medium", "decay soft"];
    Music.filterBases = [2.0, 3.5, 5.0, 1.0, 2.5, 4.0];
    Music.filterDecays = [0.0, 0.0, 0.0, 10.0, 7.0, 4.0];
    Music.filterVolumes = [0.4, 0.7, 1.0, 0.5, 0.75, 1.0];
    Music.attackNames = ["binary", "sudden", "smooth", "slide"];
    Music.effectNames = ["none", "vibrato light", "vibrato delayed", "vibrato heavy", "tremelo light", "tremelo heavy"];
    Music.effectVibratos = [0.0, 0.15, 0.3, 0.45, 0.0, 0.0];
    Music.effectTremelos = [0.0, 0.0, 0.0, 0.0, 0.25, 0.5];
    Music.chorusNames = ["union", "shimmer", "hum", "honky tonk", "dissonant", "fifths", "octaves"];
    Music.chorusValues = [0.0, 0.02, 0.05, 0.1, 0.25, 3.5, 6];
    Music.chorusOffsets = [0.0, 0.0, 0.0, 0.0, 0.0, 3.5, 6];
    Music.chorusVolumes = [0.7, 0.8, 1.0, 1.0, 0.9, 0.9, 0.8];
    Music.volumeNames = ["loudest", "loud", "medium", "quiet", "quietest", "mute"];
    Music.volumeValues = [0.0, 0.5, 1.0, 1.5, 2.0, -1.0];
    Music.channelVolumes = [0.27, 0.27, 0.27, 0.19];
    Music.drumInterval = 6;
    Music.numChannels = 4;
    Music.drumCount = 12;
    Music.noteCount = 37;
    Music.maxPitch = 84;
    beepbox.Music = Music;
    var TonePin = (function () {
        function TonePin(interval, time, volume) {
            this.interval = interval;
            this.time = time;
            this.volume = volume;
        }
        return TonePin;
    }());
    beepbox.TonePin = TonePin;
    var Tone = (function () {
        function Tone(note, start, end, volume, fadeout) {
            if (fadeout === void 0) { fadeout = false; }
            this.notes = [note];
            this.pins = [new TonePin(0, 0, volume), new TonePin(0, end - start, fadeout ? 0 : volume)];
            this.start = start;
            this.end = end;
        }
        return Tone;
    }());
    beepbox.Tone = Tone;
    var BarPattern = (function () {
        function BarPattern() {
            this.tones = [];
            this.instrument = 0;
        }
        BarPattern.prototype.cloneTones = function () {
            var result = [];
            for (var _i = 0, _a = this.tones; _i < _a.length; _i++) {
                var oldTone = _a[_i];
                var newTone = new Tone(-1, oldTone.start, oldTone.end, 3);
                newTone.notes = oldTone.notes.concat();
                newTone.pins = [];
                for (var _b = 0, _c = oldTone.pins; _b < _c.length; _b++) {
                    var oldPin = _c[_b];
                    newTone.pins.push(new TonePin(oldPin.interval, oldPin.time, oldPin.volume));
                }
                result.push(newTone);
            }
            return result;
        };
        return BarPattern;
    }());
    beepbox.BarPattern = BarPattern;
    var Song = (function () {
        function Song(string) {
            if (string === void 0) { string = null; }
            if (string != null) {
                this.fromString(string, false);
            }
            else {
                this.initToDefault(false);
            }
        }
        Song.prototype.initToDefault = function (skipPatterns) {
            if (skipPatterns === void 0) { skipPatterns = false; }
            if (!skipPatterns) {
                this.channelPatterns = [
                    [new BarPattern(), new BarPattern(), new BarPattern(), new BarPattern(), new BarPattern(), new BarPattern(), new BarPattern(), new BarPattern()],
                    [new BarPattern(), new BarPattern(), new BarPattern(), new BarPattern(), new BarPattern(), new BarPattern(), new BarPattern(), new BarPattern()],
                    [new BarPattern(), new BarPattern(), new BarPattern(), new BarPattern(), new BarPattern(), new BarPattern(), new BarPattern(), new BarPattern()],
                    [new BarPattern(), new BarPattern(), new BarPattern(), new BarPattern(), new BarPattern(), new BarPattern(), new BarPattern(), new BarPattern()],
                ];
            }
            this.channelBars = [
                [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
                [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
                [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
                [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
            ];
            this.channelOctaves = [3, 2, 1, 0];
            this.instrumentVolumes = [[0], [0], [0], [0]];
            this.instrumentWaves = [[1], [1], [1], [1]];
            this.instrumentFilters = [[0], [0], [0], [0]];
            this.instrumentAttacks = [[1], [1], [1], [1]];
            this.instrumentEffects = [[0], [0], [0], [0]];
            this.instrumentChorus = [[0], [0], [0], [0]];
            this.scale = 0;
            this.key = Music.keyNames.length - 1;
            this.loopStart = 0;
            this.loopLength = 4;
            this.tempo = 7;
            this.beats = 8;
            this.bars = 16;
            this.patterns = 8;
            this.parts = 4;
            this.instruments = 1;
        };
        Song.prototype.toString = function () {
            var channel;
            var bits;
            var result = "#";
            var base64 = Song._newBase64;
            result += base64[Song._latestVersion];
            result += "s" + base64[this.scale];
            result += "k" + base64[this.key];
            result += "l" + base64[this.loopStart >> 6] + base64[this.loopStart & 0x3f];
            result += "e" + base64[(this.loopLength - 1) >> 6] + base64[(this.loopLength - 1) & 0x3f];
            result += "t" + base64[this.tempo];
            result += "a" + base64[this.beats - 1];
            result += "g" + base64[(this.bars - 1) >> 6] + base64[(this.bars - 1) & 0x3f];
            result += "j" + base64[this.patterns - 1];
            result += "i" + base64[this.instruments - 1];
            result += "r" + base64[Music.partCounts.indexOf(this.parts)];
            result += "w";
            for (channel = 0; channel < Music.numChannels; channel++)
                for (var i = 0; i < this.instruments; i++) {
                    result += base64[this.instrumentWaves[channel][i]];
                }
            result += "f";
            for (channel = 0; channel < Music.numChannels; channel++)
                for (var i = 0; i < this.instruments; i++) {
                    result += base64[this.instrumentFilters[channel][i]];
                }
            result += "d";
            for (channel = 0; channel < Music.numChannels; channel++)
                for (var i = 0; i < this.instruments; i++) {
                    result += base64[this.instrumentAttacks[channel][i]];
                }
            result += "c";
            for (channel = 0; channel < Music.numChannels; channel++)
                for (var i = 0; i < this.instruments; i++) {
                    result += base64[this.instrumentEffects[channel][i]];
                }
            result += "h";
            for (channel = 0; channel < Music.numChannels; channel++)
                for (var i = 0; i < this.instruments; i++) {
                    result += base64[this.instrumentChorus[channel][i]];
                }
            result += "v";
            for (channel = 0; channel < Music.numChannels; channel++)
                for (var i = 0; i < this.instruments; i++) {
                    result += base64[this.instrumentVolumes[channel][i]];
                }
            result += "o";
            for (channel = 0; channel < Music.numChannels; channel++) {
                result += base64[this.channelOctaves[channel]];
            }
            result += "b";
            bits = new BitField(base64);
            var neededBits = 0;
            while ((1 << neededBits) < this.patterns + 1)
                neededBits++;
            for (channel = 0; channel < Music.numChannels; channel++)
                for (var i = 0; i < this.bars; i++) {
                    bits.write(neededBits, this.channelBars[channel][i]);
                }
            result += bits.toString();
            result += "p";
            bits = new BitField(base64);
            var neededInstrumentBits = 0;
            while ((1 << neededInstrumentBits) < this.instruments)
                neededInstrumentBits++;
            for (channel = 0; channel < Music.numChannels; channel++) {
                var octaveOffset = channel == 3 ? 0 : this.channelOctaves[channel] * 12;
                var lastNote = (channel == 3 ? 4 : 12) + octaveOffset;
                var recentNotes = channel == 3 ? [4, 6, 7, 2, 3, 8, 0, 10] : [12, 19, 24, 31, 36, 7, 0];
                var recentShapes = [];
                for (var i = 0; i < recentNotes.length; i++) {
                    recentNotes[i] += octaveOffset;
                }
                for (var _i = 0, _a = this.channelPatterns[channel]; _i < _a.length; _i++) {
                    var p = _a[_i];
                    bits.write(neededInstrumentBits, p.instrument);
                    if (p.tones.length > 0) {
                        bits.write(1, 1);
                        var curPart = 0;
                        for (var _b = 0, _c = p.tones; _b < _c.length; _b++) {
                            var t = _c[_b];
                            if (t.start > curPart) {
                                bits.write(2, 0);
                                bits.writePartDuration(t.start - curPart);
                            }
                            var shapeBits = new BitField(base64);
                            for (var i = 1; i < t.notes.length; i++)
                                shapeBits.write(1, 1);
                            if (t.notes.length < 4)
                                shapeBits.write(1, 0);
                            shapeBits.writePinCount(t.pins.length - 1);
                            shapeBits.write(2, t.pins[0].volume);
                            var shapePart = 0;
                            var startNote = t.notes[0];
                            var currentNote = startNote;
                            var pitchBends = [];
                            for (var i = 1; i < t.pins.length; i++) {
                                var pin = t.pins[i];
                                var nextNote = startNote + pin.interval;
                                if (currentNote != nextNote) {
                                    shapeBits.write(1, 1);
                                    pitchBends.push(nextNote);
                                    currentNote = nextNote;
                                }
                                else {
                                    shapeBits.write(1, 0);
                                }
                                shapeBits.writePartDuration(pin.time - shapePart);
                                shapePart = pin.time;
                                shapeBits.write(2, pin.volume);
                            }
                            var shapeString = shapeBits.toString();
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
                            var allNotes = t.notes.concat(pitchBends);
                            for (var i = 0; i < allNotes.length; i++) {
                                var note = allNotes[i];
                                var noteIndex = recentNotes.indexOf(note);
                                if (noteIndex == -1) {
                                    var interval = 0;
                                    var noteIter = lastNote;
                                    if (noteIter < note) {
                                        while (noteIter != note) {
                                            noteIter++;
                                            if (recentNotes.indexOf(noteIter) == -1)
                                                interval++;
                                        }
                                    }
                                    else {
                                        while (noteIter != note) {
                                            noteIter--;
                                            if (recentNotes.indexOf(noteIter) == -1)
                                                interval--;
                                        }
                                    }
                                    bits.write(1, 0);
                                    bits.writeNoteInterval(interval);
                                }
                                else {
                                    bits.write(1, 1);
                                    bits.write(3, noteIndex);
                                    recentNotes.splice(noteIndex, 1);
                                }
                                recentNotes.unshift(note);
                                if (recentNotes.length > 8)
                                    recentNotes.pop();
                                if (i == t.notes.length - 1) {
                                    lastNote = t.notes[0];
                                }
                                else {
                                    lastNote = note;
                                }
                            }
                            curPart = t.end;
                        }
                        if (curPart < this.beats * this.parts) {
                            bits.write(2, 0);
                            bits.writePartDuration(this.beats * this.parts - curPart);
                        }
                    }
                    else {
                        bits.write(1, 0);
                    }
                }
            }
            var bitString = bits.toString();
            var stringLength = bitString.length;
            var digits = "";
            while (stringLength > 0) {
                digits = base64[stringLength & 0x3f] + digits;
                stringLength = stringLength >> 6;
            }
            result += base64[digits.length];
            result += digits;
            result += bitString;
            return result;
        };
        Song.prototype.fromString = function (compressed, skipPatterns) {
            if (skipPatterns === void 0) { skipPatterns = false; }
            this.initToDefault(skipPatterns);
            if (compressed == null || compressed.length == 0)
                return;
            if (compressed.charAt(0) == "#")
                compressed = compressed.substring(1);
            var charIndex = 0;
            var version = Song._newBase64.indexOf(compressed.charAt(charIndex++));
            if (version == -1 || version > Song._latestVersion || version < Song._oldestVersion)
                return;
            var beforeThree = version < 3;
            var beforeFour = version < 4;
            var beforeFive = version < 5;
            var base64 = beforeThree ? Song._oldBase64 : Song._newBase64;
            if (beforeThree)
                this.instrumentAttacks = [[0], [0], [0], [0]];
            if (beforeThree)
                this.instrumentWaves = [[1], [1], [1], [0]];
            while (charIndex < compressed.length) {
                var command = compressed.charAt(charIndex++);
                var bits = void 0;
                var channel = void 0;
                if (command == "s") {
                    this.scale = base64.indexOf(compressed.charAt(charIndex++));
                    if (beforeThree && this.scale == 10)
                        this.scale = 11;
                }
                else if (command == "k") {
                    this.key = base64.indexOf(compressed.charAt(charIndex++));
                }
                else if (command == "l") {
                    if (beforeFive) {
                        this.loopStart = base64.indexOf(compressed.charAt(charIndex++));
                    }
                    else {
                        this.loopStart = (base64.indexOf(compressed.charAt(charIndex++)) << 6) + base64.indexOf(compressed.charAt(charIndex++));
                    }
                }
                else if (command == "e") {
                    if (beforeFive) {
                        this.loopLength = base64.indexOf(compressed.charAt(charIndex++));
                    }
                    else {
                        this.loopLength = (base64.indexOf(compressed.charAt(charIndex++)) << 6) + base64.indexOf(compressed.charAt(charIndex++)) + 1;
                    }
                }
                else if (command == "t") {
                    if (beforeFour) {
                        this.tempo = [1, 4, 7, 10][base64.indexOf(compressed.charAt(charIndex++))];
                    }
                    else {
                        this.tempo = base64.indexOf(compressed.charAt(charIndex++));
                    }
                    this.tempo = Math.max(0, Math.min(Music.tempoNames.length, this.tempo));
                }
                else if (command == "a") {
                    if (beforeThree) {
                        this.beats = [6, 7, 8, 9, 10][base64.indexOf(compressed.charAt(charIndex++))];
                    }
                    else {
                        this.beats = base64.indexOf(compressed.charAt(charIndex++)) + 1;
                    }
                    this.beats = Math.max(Music.beatsMin, Math.min(Music.beatsMax, this.beats));
                }
                else if (command == "g") {
                    this.bars = (base64.indexOf(compressed.charAt(charIndex++)) << 6) + base64.indexOf(compressed.charAt(charIndex++)) + 1;
                    this.bars = Math.max(Music.barsMin, Math.min(Music.barsMax, this.bars));
                }
                else if (command == "j") {
                    this.patterns = base64.indexOf(compressed.charAt(charIndex++)) + 1;
                    this.patterns = Math.max(Music.patternsMin, Math.min(Music.patternsMax, this.patterns));
                }
                else if (command == "i") {
                    this.instruments = base64.indexOf(compressed.charAt(charIndex++)) + 1;
                    this.instruments = Math.max(Music.instrumentsMin, Math.min(Music.instrumentsMax, this.instruments));
                }
                else if (command == "r") {
                    this.parts = Music.partCounts[base64.indexOf(compressed.charAt(charIndex++))];
                }
                else if (command == "w") {
                    if (beforeThree) {
                        channel = base64.indexOf(compressed.charAt(charIndex++));
                        this.instrumentWaves[channel][0] = this._clip(0, Music.waveNames.length, base64.indexOf(compressed.charAt(charIndex++)));
                    }
                    else {
                        for (channel = 0; channel < Music.numChannels; channel++) {
                            for (var i = 0; i < this.instruments; i++) {
                                this.instrumentWaves[channel][i] = this._clip(0, Music.waveNames.length, base64.indexOf(compressed.charAt(charIndex++)));
                            }
                        }
                    }
                }
                else if (command == "f") {
                    if (beforeThree) {
                        channel = base64.indexOf(compressed.charAt(charIndex++));
                        this.instrumentFilters[channel][0] = [0, 2, 3, 5][this._clip(0, Music.filterNames.length, base64.indexOf(compressed.charAt(charIndex++)))];
                    }
                    else {
                        for (channel = 0; channel < Music.numChannels; channel++) {
                            for (var i = 0; i < this.instruments; i++) {
                                this.instrumentFilters[channel][i] = this._clip(0, Music.filterNames.length, base64.indexOf(compressed.charAt(charIndex++)));
                            }
                        }
                    }
                }
                else if (command == "d") {
                    if (beforeThree) {
                        channel = base64.indexOf(compressed.charAt(charIndex++));
                        this.instrumentAttacks[channel][0] = this._clip(0, Music.attackNames.length, base64.indexOf(compressed.charAt(charIndex++)));
                    }
                    else {
                        for (channel = 0; channel < Music.numChannels; channel++) {
                            for (var i = 0; i < this.instruments; i++) {
                                this.instrumentAttacks[channel][i] = this._clip(0, Music.attackNames.length, base64.indexOf(compressed.charAt(charIndex++)));
                            }
                        }
                    }
                }
                else if (command == "c") {
                    if (beforeThree) {
                        channel = base64.indexOf(compressed.charAt(charIndex++));
                        this.instrumentEffects[channel][0] = this._clip(0, Music.effectNames.length, base64.indexOf(compressed.charAt(charIndex++)));
                        if (this.instrumentEffects[channel][0] == 1)
                            this.instrumentEffects[channel][0] = 3;
                        else if (this.instrumentEffects[channel][0] == 3)
                            this.instrumentEffects[channel][0] = 5;
                    }
                    else {
                        for (channel = 0; channel < Music.numChannels; channel++) {
                            for (var i = 0; i < this.instruments; i++) {
                                this.instrumentEffects[channel][i] = this._clip(0, Music.effectNames.length, base64.indexOf(compressed.charAt(charIndex++)));
                            }
                        }
                    }
                }
                else if (command == "h") {
                    if (beforeThree) {
                        channel = base64.indexOf(compressed.charAt(charIndex++));
                        this.instrumentChorus[channel][0] = this._clip(0, Music.chorusNames.length, base64.indexOf(compressed.charAt(charIndex++)));
                    }
                    else {
                        for (channel = 0; channel < Music.numChannels; channel++) {
                            for (var i = 0; i < this.instruments; i++) {
                                this.instrumentChorus[channel][i] = this._clip(0, Music.chorusNames.length, base64.indexOf(compressed.charAt(charIndex++)));
                            }
                        }
                    }
                }
                else if (command == "v") {
                    if (beforeThree) {
                        channel = base64.indexOf(compressed.charAt(charIndex++));
                        this.instrumentVolumes[channel][0] = this._clip(0, Music.volumeNames.length, base64.indexOf(compressed.charAt(charIndex++)));
                    }
                    else {
                        for (channel = 0; channel < Music.numChannels; channel++) {
                            for (var i = 0; i < this.instruments; i++) {
                                this.instrumentVolumes[channel][i] = this._clip(0, Music.volumeNames.length, base64.indexOf(compressed.charAt(charIndex++)));
                            }
                        }
                    }
                }
                else if (command == "o") {
                    if (beforeThree) {
                        channel = base64.indexOf(compressed.charAt(charIndex++));
                        this.channelOctaves[channel] = this._clip(0, 5, base64.indexOf(compressed.charAt(charIndex++)));
                    }
                    else {
                        for (channel = 0; channel < Music.numChannels; channel++) {
                            this.channelOctaves[channel] = this._clip(0, 5, base64.indexOf(compressed.charAt(charIndex++)));
                        }
                    }
                }
                else if (command == "b") {
                    var subStringLength = void 0;
                    if (beforeThree) {
                        channel = base64.indexOf(compressed.charAt(charIndex++));
                        var barCount = base64.indexOf(compressed.charAt(charIndex++));
                        subStringLength = Math.ceil(barCount * 0.5);
                        bits = new BitField(base64);
                        bits.load(compressed.substr(charIndex, subStringLength));
                        for (var i = 0; i < barCount; i++) {
                            this.channelBars[channel][i] = bits.read(3) + 1;
                        }
                    }
                    else if (beforeFive) {
                        var neededBits = 0;
                        while ((1 << neededBits) < this.patterns)
                            neededBits++;
                        bits = new BitField(base64);
                        subStringLength = Math.ceil(Music.numChannels * this.bars * neededBits / 6);
                        bits.load(compressed.substr(charIndex, subStringLength));
                        for (channel = 0; channel < Music.numChannels; channel++) {
                            for (var i = 0; i < this.bars; i++) {
                                this.channelBars[channel][i] = bits.read(neededBits) + 1;
                            }
                        }
                    }
                    else {
                        var neededBits2 = 0;
                        while ((1 << neededBits2) < this.patterns + 1)
                            neededBits2++;
                        bits = new BitField(base64);
                        subStringLength = Math.ceil(Music.numChannels * this.bars * neededBits2 / 6);
                        bits.load(compressed.substr(charIndex, subStringLength));
                        for (channel = 0; channel < Music.numChannels; channel++) {
                            for (var i = 0; i < this.bars; i++) {
                                this.channelBars[channel][i] = bits.read(neededBits2);
                            }
                        }
                    }
                    charIndex += subStringLength;
                }
                else if (command == "p") {
                    var bitStringLength = 0;
                    if (beforeThree) {
                        channel = base64.indexOf(compressed.charAt(charIndex++));
                        var patternCount = base64.indexOf(compressed.charAt(charIndex++));
                        bitStringLength = base64.indexOf(compressed.charAt(charIndex++));
                        bitStringLength = bitStringLength << 6;
                        bitStringLength += base64.indexOf(compressed.charAt(charIndex++));
                    }
                    else {
                        channel = 0;
                        var bitStringLengthLength = base64.indexOf(compressed.charAt(charIndex++));
                        while (bitStringLengthLength > 0) {
                            bitStringLength = bitStringLength << 6;
                            bitStringLength += base64.indexOf(compressed.charAt(charIndex++));
                            bitStringLengthLength--;
                        }
                    }
                    bits = new BitField(base64);
                    bits.load(compressed.substr(charIndex, bitStringLength));
                    charIndex += bitStringLength;
                    if (!skipPatterns) {
                        var neededInstrumentBits = 0;
                        while ((1 << neededInstrumentBits) < this.instruments)
                            neededInstrumentBits++;
                        while (true) {
                            this.channelPatterns[channel] = [];
                            var octaveOffset = channel == 3 ? 0 : this.channelOctaves[channel] * 12;
                            var tone = null;
                            var pin = null;
                            var lastNote = (channel == 3 ? 4 : 12) + octaveOffset;
                            var recentNotes = channel == 3 ? [4, 6, 7, 2, 3, 8, 0, 10] : [12, 19, 24, 31, 36, 7, 0];
                            var recentShapes = [];
                            for (var i = 0; i < recentNotes.length; i++) {
                                recentNotes[i] += octaveOffset;
                            }
                            for (var i = 0; i < this.patterns; i++) {
                                var newPattern = new BarPattern();
                                newPattern.instrument = bits.read(neededInstrumentBits);
                                this.channelPatterns[channel][i] = newPattern;
                                if (!beforeThree && bits.read(1) == 0)
                                    continue;
                                var curPart = 0;
                                var newTones = [];
                                while (curPart < this.beats * this.parts) {
                                    var useOldShape = bits.read(1) == 1;
                                    var newTone = false;
                                    var shapeIndex = 0;
                                    if (useOldShape) {
                                        shapeIndex = bits.readLongTail(0, 0);
                                    }
                                    else {
                                        newTone = bits.read(1) == 1;
                                    }
                                    if (!useOldShape && !newTone) {
                                        var restLength = bits.readPartDuration();
                                        curPart += restLength;
                                    }
                                    else {
                                        var shape = void 0;
                                        var pinObj = void 0;
                                        var note = void 0;
                                        if (useOldShape) {
                                            shape = recentShapes[shapeIndex];
                                            recentShapes.splice(shapeIndex, 1);
                                        }
                                        else {
                                            shape = {};
                                            shape.noteCount = 1;
                                            while (shape.noteCount < 4 && bits.read(1) == 1)
                                                shape.noteCount++;
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
                                        tone = new Tone(0, curPart, curPart + shape.length, shape.initialVolume);
                                        tone.notes = [];
                                        tone.pins.length = 1;
                                        var pitchBends = [];
                                        for (var j = 0; j < shape.noteCount + shape.bendCount; j++) {
                                            var useOldNote = bits.read(1) == 1;
                                            if (!useOldNote) {
                                                var interval = bits.readNoteInterval();
                                                note = lastNote;
                                                var intervalIter = interval;
                                                while (intervalIter > 0) {
                                                    note++;
                                                    while (recentNotes.indexOf(note) != -1)
                                                        note++;
                                                    intervalIter--;
                                                }
                                                while (intervalIter < 0) {
                                                    note--;
                                                    while (recentNotes.indexOf(note) != -1)
                                                        note--;
                                                    intervalIter++;
                                                }
                                            }
                                            else {
                                                var noteIndex = bits.read(3);
                                                note = recentNotes[noteIndex];
                                                recentNotes.splice(noteIndex, 1);
                                            }
                                            recentNotes.unshift(note);
                                            if (recentNotes.length > 8)
                                                recentNotes.pop();
                                            if (j < shape.noteCount) {
                                                tone.notes.push(note);
                                            }
                                            else {
                                                pitchBends.push(note);
                                            }
                                            if (j == shape.noteCount - 1) {
                                                lastNote = tone.notes[0];
                                            }
                                            else {
                                                lastNote = note;
                                            }
                                        }
                                        pitchBends.unshift(tone.notes[0]);
                                        for (var _i = 0, _a = shape.pins; _i < _a.length; _i++) {
                                            var pinObj_1 = _a[_i];
                                            if (pinObj_1.pitchBend)
                                                pitchBends.shift();
                                            pin = new TonePin(pitchBends[0] - tone.notes[0], pinObj_1.time, pinObj_1.volume);
                                            tone.pins.push(pin);
                                        }
                                        curPart = tone.end;
                                        newTones.push(tone);
                                    }
                                }
                                newPattern.tones = newTones;
                            }
                            if (beforeThree) {
                                break;
                            }
                            else {
                                channel++;
                                if (channel >= Music.numChannels)
                                    break;
                            }
                        }
                    }
                }
            }
        };
        Song.prototype._clip = function (min, max, val) {
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
            var patternIndex = this.channelBars[channel][bar];
            if (patternIndex == 0)
                return null;
            return this.channelPatterns[channel][patternIndex - 1];
        };
        Song.prototype.getPatternInstrument = function (channel, bar) {
            var pattern = this.getPattern(channel, bar);
            return pattern == null ? 0 : pattern.instrument;
        };
        Song.prototype.getBeatsPerMinute = function () {
            return Math.round(120.0 * Math.pow(2.0, (-4.0 + this.tempo) / 9.0));
        };
        return Song;
    }());
    Song._oldestVersion = 2;
    Song._latestVersion = 5;
    Song._oldBase64 = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m", "n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z", "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z", ".", "_",];
    Song._newBase64 = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m", "n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z", "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z", "-", "_",];
    beepbox.Song = Song;
    var Synth = (function () {
        function Synth(song) {
            if (song === void 0) { song = null; }
            this.samplesPerSecond = 44100;
            this._effectDuration = 0.14;
            this._effectAngle = Math.PI * 2.0 / (this._effectDuration * this.samplesPerSecond);
            this._effectYMult = 2.0 * Math.cos(this._effectAngle);
            this._limitDecay = 1.0 / (2.0 * this.samplesPerSecond);
            this._waves = [
                new Float64Array([1.0 / 15.0, 3.0 / 15.0, 5.0 / 15.0, 7.0 / 15.0, 9.0 / 15.0, 11.0 / 15.0, 13.0 / 15.0, 15.0 / 15.0, 15.0 / 15.0, 13.0 / 15.0, 11.0 / 15.0, 9.0 / 15.0, 7.0 / 15.0, 5.0 / 15.0, 3.0 / 15.0, 1.0 / 15.0, -1.0 / 15.0, -3.0 / 15.0, -5.0 / 15.0, -7.0 / 15.0, -9.0 / 15.0, -11.0 / 15.0, -13.0 / 15.0, -15.0 / 15.0, -15.0 / 15.0, -13.0 / 15.0, -11.0 / 15.0, -9.0 / 15.0, -7.0 / 15.0, -5.0 / 15.0, -3.0 / 15.0, -1.0 / 15.0]),
                new Float64Array([1.0, -1.0]),
                new Float64Array([1.0, -1.0, -1.0, -1.0]),
                new Float64Array([1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0]),
                new Float64Array([1.0 / 31.0, 3.0 / 31.0, 5.0 / 31.0, 7.0 / 31.0, 9.0 / 31.0, 11.0 / 31.0, 13.0 / 31.0, 15.0 / 31.0, 17.0 / 31.0, 19.0 / 31.0, 21.0 / 31.0, 23.0 / 31.0, 25.0 / 31.0, 27.0 / 31.0, 29.0 / 31.0, 31.0 / 31.0, -31.0 / 31.0, -29.0 / 31.0, -27.0 / 31.0, -25.0 / 31.0, -23.0 / 31.0, -21.0 / 31.0, -19.0 / 31.0, -17.0 / 31.0, -15.0 / 31.0, -13.0 / 31.0, -11.0 / 31.0, -9.0 / 31.0, -7.0 / 31.0, -5.0 / 31.0, -3.0 / 31.0, -1.0 / 31.0]),
                new Float64Array([0.0, -0.2, -0.4, -0.6, -0.8, -1.0, 1.0, -0.8, -0.6, -0.4, -0.2, 1.0, 0.8, 0.6, 0.4, 0.2,]),
                new Float64Array([1.0, 1.0, 1.0, 1.0, 1.0, -1.0, -1.0, -1.0, 1.0, 1.0, 1.0, 1.0, -1.0, -1.0, -1.0, -1.0]),
                new Float64Array([1.0, -1.0, 1.0, -1.0, 1.0, 0.0]),
                new Float64Array([0.0, 0.2, 0.4, 0.5, 0.6, 0.7, 0.8, 0.85, 0.9, 0.95, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 0.95, 0.9, 0.85, 0.8, 0.7, 0.6, 0.5, 0.4, 0.2, 0.0, -0.2, -0.4, -0.5, -0.6, -0.7, -0.8, -0.85, -0.9, -0.95, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -0.95, -0.9, -0.85, -0.8, -0.7, -0.6, -0.5, -0.4, -0.2,]),
            ];
            this._drumWaves = [new Float64Array(32767), new Float64Array(32767)];
            this.song = null;
            this.stutterPressed = false;
            this.pianoPressed = false;
            this.pianoNote = 0;
            this.pianoChannel = 0;
            this.enableIntro = true;
            this.enableOutro = false;
            this.loopCount = -1;
            this.volume = 1.0;
            this._playhead = 0.0;
            this._bar = 0;
            this._beat = 0;
            this._part = 0;
            this._arpeggio = 0;
            this._arpeggioSamples = 0;
            this._paused = true;
            this._leadPeriodA = 0.0;
            this._leadPeriodB = 0.0;
            this._leadSample = 0.0;
            this._harmonyPeriodA = 0.0;
            this._harmonyPeriodB = 0.0;
            this._harmonySample = 0.0;
            this._bassPeriodA = 0.0;
            this._bassPeriodB = 0.0;
            this._bassSample = 0.0;
            this._drumPeriod = 0.0;
            this._drumSample = 0.0;
            this._drumSignal = 1.0;
            this._stillGoing = false;
            this._effectPeriod = 0.0;
            this._limit = 0.0;
            var wave;
            for (var _i = 0, _a = this._waves; _i < _a.length; _i++) {
                var wave_1 = _a[_i];
                var sum = 0.0;
                for (var i = 0; i < wave_1.length; i++)
                    sum += wave_1[i];
                var average = sum / wave_1.length;
                for (var i = 0; i < wave_1.length; i++)
                    wave_1[i] -= average;
            }
            for (var index = 0; index < this._drumWaves.length; index++) {
                var wave_2 = this._drumWaves[index];
                if (index == 0) {
                    var drumBuffer = 1;
                    for (var i = 0; i < 32767; i++) {
                        wave_2[i] = (drumBuffer & 1) * 2.0 - 1.0;
                        var newBuffer = drumBuffer >> 1;
                        if (((drumBuffer + newBuffer) & 1) == 1) {
                            newBuffer += 1 << 14;
                        }
                        drumBuffer = newBuffer;
                    }
                }
                else if (index == 1) {
                    for (var i = 0; i < 32767; i++) {
                        wave_2[i] = Math.random() * 2.0 - 1.0;
                    }
                }
            }
            if (song != null) {
                this.setSong(song);
            }
        }
        Object.defineProperty(Synth.prototype, "playing", {
            get: function () {
                return !this._paused;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Synth.prototype, "playhead", {
            get: function () {
                return this._playhead;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Synth.prototype, "totalSamples", {
            get: function () {
                if (this.song == null)
                    return 0;
                var samplesPerBar = this._getSamplesPerArpeggio() * 4 * this.song.parts * this.song.beats;
                var loopMinCount = this.loopCount;
                if (loopMinCount < 0)
                    loopMinCount = 1;
                var bars = this.song.loopLength * loopMinCount;
                if (this.enableIntro)
                    bars += this.song.loopStart;
                if (this.enableOutro)
                    bars += this.song.bars - (this.song.loopStart + this.song.loopLength);
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
                return this.song.bars;
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
            if (!this._paused)
                return;
            this._paused = false;
            var contextClass = (window.AudioContext || window.webkitAudioContext || window.mozAudioContext || window.oAudioContext || window.msAudioContext);
            this._audioCtx = this._audioCtx || new contextClass();
            this._scriptNode = this._audioCtx.createScriptProcessor ? this._audioCtx.createScriptProcessor(2048, 0, 1) : this._audioCtx.createJavaScriptNode(2048, 0, 1);
            this._scriptNode.onaudioprocess = this._onSampleData.bind(this);
            this._scriptNode.channelCountMode = 'explicit';
            this._scriptNode.channelInterpretation = 'speakers';
            this._scriptNode.connect(this._audioCtx.destination);
            this.samplesPerSecond = this._audioCtx.sampleRate;
            this._effectAngle = Math.PI * 2.0 / (this._effectDuration * this.samplesPerSecond);
            this._effectYMult = 2.0 * Math.cos(this._effectAngle);
            this._limitDecay = 1.0 / (2.0 * this.samplesPerSecond);
        };
        Synth.prototype.pause = function () {
            if (this._paused)
                return;
            this._paused = true;
            this._scriptNode.disconnect(this._audioCtx.destination);
            if (this._audioCtx.close) {
                this._audioCtx.close();
                this._audioCtx = null;
            }
            this._scriptNode = null;
        };
        Synth.prototype.snapToStart = function () {
            this._bar = 0;
            this.enableIntro = true;
            this.snapToBar();
        };
        Synth.prototype.snapToBar = function () {
            this._playhead = this._bar;
            this._beat = 0;
            this._part = 0;
            this._arpeggio = 0;
            this._arpeggioSamples = 0;
            this._effectPeriod = 0.0;
        };
        Synth.prototype.nextBar = function () {
            var oldBar = this._bar;
            this._bar++;
            if (this._bar >= this.song.bars) {
                this._bar = this.song.loopStart;
            }
            if (this._bar >= this.song.loopStart + this.song.loopLength || this._bar >= this.song.bars) {
                this._bar = this.song.loopStart;
            }
            this._playhead += this._bar - oldBar;
        };
        Synth.prototype.prevBar = function () {
            var oldBar = this._bar;
            this._bar--;
            if (this._bar < 0) {
                this._bar = this.song.bars - 1;
            }
            if (this._bar < this.song.loopStart) {
                this.enableIntro = true;
            }
            if (this._bar >= this.song.loopStart + this.song.loopLength || this._bar >= this.song.bars) {
                this._bar = this.song.loopStart + this.song.loopLength - 1;
            }
            this._playhead += this._bar - oldBar;
        };
        Synth.prototype._onSampleData = function (audioProcessingEvent) {
            var outputBuffer = audioProcessingEvent.outputBuffer;
            var outputData = outputBuffer.getChannelData(0);
            this.synthesize(outputData, outputBuffer.length);
        };
        Synth.prototype.synthesize = function (data, totalSamples) {
            var _this = this;
            var bufferIndex = 0;
            var stutterFunction;
            if (this.stutterPressed) {
                var barOld_1 = this._bar;
                var beatOld_1 = this._beat;
                var partOld_1 = this._part;
                var arpeggioOld_1 = this._arpeggio;
                var arpeggioSamplesOld_1 = this._arpeggioSamples;
                var leadPeriodAOld_1 = this._leadPeriodA;
                var leadPeriodBOld_1 = this._leadPeriodB;
                var leadSampleOld_1 = this._leadSample;
                var harmonyPeriodAOld_1 = this._harmonyPeriodA;
                var harmonyPeriodBOld_1 = this._harmonyPeriodB;
                var harmonySampleOld_1 = this._harmonySample;
                var bassPeriodAOld_1 = this._bassPeriodA;
                var bassPeriodBOld_1 = this._bassPeriodB;
                var bassSampleOld_1 = this._bassSample;
                var drumPeriodOld_1 = this._drumPeriod;
                var drumSampleOld_1 = this._drumSample;
                var drumSignalOld_1 = this._drumSignal;
                var effectPeriodOld_1 = this._effectPeriod;
                var limitOld_1 = this._limit;
                stutterFunction = function () {
                    _this._bar = barOld_1;
                    _this._beat = beatOld_1;
                    _this._part = partOld_1;
                    _this._arpeggio = arpeggioOld_1;
                    _this._arpeggioSamples = arpeggioSamplesOld_1;
                    _this._leadPeriodA = leadPeriodAOld_1;
                    _this._leadPeriodB = leadPeriodBOld_1;
                    _this._leadSample = leadSampleOld_1;
                    _this._harmonyPeriodA = harmonyPeriodAOld_1;
                    _this._harmonyPeriodB = harmonyPeriodBOld_1;
                    _this._harmonySample = harmonySampleOld_1;
                    _this._bassPeriodA = bassPeriodAOld_1;
                    _this._bassPeriodB = bassPeriodBOld_1;
                    _this._bassSample = bassSampleOld_1;
                    _this._drumPeriod = drumPeriodOld_1;
                    _this._drumSample = drumSampleOld_1;
                    _this._drumSignal = drumSignalOld_1;
                    _this._effectPeriod = effectPeriodOld_1;
                    _this._limit = limitOld_1;
                };
            }
            var sampleTime = 1.0 / this.samplesPerSecond;
            var samplesPerArpeggio = this._getSamplesPerArpeggio();
            if (this.song == null) {
                for (var i = 0; i < totalSamples; i++) {
                    data[i] = 0.0;
                }
                return;
            }
            if (this._arpeggioSamples == 0 || this._arpeggioSamples > samplesPerArpeggio) {
                this._arpeggioSamples = samplesPerArpeggio;
            }
            if (this._part >= this.song.parts) {
                this._beat++;
                this._part = 0;
                this._arpeggio = 0;
                this._arpeggioSamples = samplesPerArpeggio;
            }
            if (this._beat >= this.song.beats) {
                this._bar++;
                this._beat = 0;
                this._part = 0;
                this._arpeggio = 0;
                this._arpeggioSamples = samplesPerArpeggio;
                if (this.loopCount == -1) {
                    if (this._bar < this.song.loopStart && !this.enableIntro)
                        this._bar = this.song.loopStart;
                    if (this._bar >= this.song.loopStart + this.song.loopLength && !this.enableOutro)
                        this._bar = this.song.loopStart;
                }
            }
            if (this._bar >= this.song.bars) {
                this._bar = this.song.loopStart;
                this.enableOutro = false;
            }
            if (this._bar >= this.song.loopStart) {
                this.enableIntro = false;
            }
            var maxLeadVolume;
            var maxHarmonyVolume;
            var maxBassVolume;
            var maxDrumVolume;
            var leadWave;
            var harmonyWave;
            var bassWave;
            var drumWave;
            var leadWaveLength;
            var harmonyWaveLength;
            var bassWaveLength;
            var leadFilterBase;
            var harmonyFilterBase;
            var bassFilterBase;
            var drumFilter;
            var leadTremeloScale;
            var harmonyTremeloScale;
            var bassTremeloScale;
            var leadChorusA;
            var harmonyChorusA;
            var bassChorusA;
            var leadChorusB;
            var harmonyChorusB;
            var bassChorusB;
            var updateInstruments = function () {
                var instrumentLead = _this.song.getPatternInstrument(0, _this._bar);
                var instrumentHarmony = _this.song.getPatternInstrument(1, _this._bar);
                var instrumentBass = _this.song.getPatternInstrument(2, _this._bar);
                var instrumentDrum = _this.song.getPatternInstrument(3, _this._bar);
                maxLeadVolume = Music.channelVolumes[0] * (_this.song.instrumentVolumes[0][instrumentLead] == 5 ? 0.0 : Math.pow(2, -Music.volumeValues[_this.song.instrumentVolumes[0][instrumentLead]])) * Music.waveVolumes[_this.song.instrumentWaves[0][instrumentLead]] * Music.filterVolumes[_this.song.instrumentFilters[0][instrumentLead]] * Music.chorusVolumes[_this.song.instrumentChorus[0][instrumentLead]] * 0.5;
                maxHarmonyVolume = Music.channelVolumes[1] * (_this.song.instrumentVolumes[1][instrumentHarmony] == 5 ? 0.0 : Math.pow(2, -Music.volumeValues[_this.song.instrumentVolumes[1][instrumentHarmony]])) * Music.waveVolumes[_this.song.instrumentWaves[1][instrumentHarmony]] * Music.filterVolumes[_this.song.instrumentFilters[1][instrumentHarmony]] * Music.chorusVolumes[_this.song.instrumentChorus[0][instrumentHarmony]] * 0.5;
                maxBassVolume = Music.channelVolumes[2] * (_this.song.instrumentVolumes[2][instrumentBass] == 5 ? 0.0 : Math.pow(2, -Music.volumeValues[_this.song.instrumentVolumes[2][instrumentBass]])) * Music.waveVolumes[_this.song.instrumentWaves[2][instrumentBass]] * Music.filterVolumes[_this.song.instrumentFilters[2][instrumentBass]] * Music.chorusVolumes[_this.song.instrumentChorus[0][instrumentBass]] * 0.5;
                maxDrumVolume = Music.channelVolumes[3] * (_this.song.instrumentVolumes[3][instrumentDrum] == 5 ? 0.0 : Math.pow(2, -Music.volumeValues[_this.song.instrumentVolumes[3][instrumentDrum]])) * Music.drumVolumes[_this.song.instrumentWaves[3][instrumentDrum]];
                leadWave = _this._waves[_this.song.instrumentWaves[0][instrumentLead]];
                harmonyWave = _this._waves[_this.song.instrumentWaves[1][instrumentHarmony]];
                bassWave = _this._waves[_this.song.instrumentWaves[2][instrumentBass]];
                drumWave = _this._drumWaves[_this.song.instrumentWaves[3][instrumentDrum]];
                leadWaveLength = leadWave.length;
                harmonyWaveLength = harmonyWave.length;
                bassWaveLength = bassWave.length;
                leadFilterBase = Math.pow(2, -Music.filterBases[_this.song.instrumentFilters[0][instrumentLead]]);
                harmonyFilterBase = Math.pow(2, -Music.filterBases[_this.song.instrumentFilters[1][instrumentHarmony]]);
                bassFilterBase = Math.pow(2, -Music.filterBases[_this.song.instrumentFilters[2][instrumentBass]]);
                drumFilter = 1.0;
                leadTremeloScale = Music.effectTremelos[_this.song.instrumentEffects[0][instrumentLead]];
                harmonyTremeloScale = Music.effectTremelos[_this.song.instrumentEffects[1][instrumentHarmony]];
                bassTremeloScale = Music.effectTremelos[_this.song.instrumentEffects[2][instrumentBass]];
                leadChorusA = Math.pow(2.0, (Music.chorusOffsets[_this.song.instrumentChorus[0][instrumentLead]] + Music.chorusValues[_this.song.instrumentChorus[0][instrumentLead]]) / 12.0);
                harmonyChorusA = Math.pow(2.0, (Music.chorusOffsets[_this.song.instrumentChorus[1][instrumentHarmony]] + Music.chorusValues[_this.song.instrumentChorus[1][instrumentHarmony]]) / 12.0);
                bassChorusA = Math.pow(2.0, (Music.chorusOffsets[_this.song.instrumentChorus[2][instrumentBass]] + Music.chorusValues[_this.song.instrumentChorus[2][instrumentBass]]) / 12.0);
                leadChorusB = Math.pow(2.0, (Music.chorusOffsets[_this.song.instrumentChorus[0][instrumentLead]] - Music.chorusValues[_this.song.instrumentChorus[0][instrumentLead]]) / 12.0);
                harmonyChorusB = Math.pow(2.0, (Music.chorusOffsets[_this.song.instrumentChorus[1][instrumentHarmony]] - Music.chorusValues[_this.song.instrumentChorus[1][instrumentHarmony]]) / 12.0);
                bassChorusB = Math.pow(2.0, (Music.chorusOffsets[_this.song.instrumentChorus[2][instrumentBass]] - Music.chorusValues[_this.song.instrumentChorus[2][instrumentBass]]) / 12.0);
                if (_this.song.instrumentChorus[0][instrumentLead] == 0)
                    _this._leadPeriodB = _this._leadPeriodA;
                if (_this.song.instrumentChorus[1][instrumentHarmony] == 0)
                    _this._harmonyPeriodB = _this._harmonyPeriodA;
                if (_this.song.instrumentChorus[2][instrumentBass] == 0)
                    _this._bassPeriodB = _this._bassPeriodA;
            };
            updateInstruments();
            while (totalSamples > 0) {
                var samples = void 0;
                if (this._arpeggioSamples <= totalSamples) {
                    samples = this._arpeggioSamples;
                }
                else {
                    samples = totalSamples;
                }
                totalSamples -= samples;
                this._arpeggioSamples -= samples;
                var leadPeriodDelta;
                var leadPeriodDeltaScale;
                var leadVolume;
                var leadVolumeDelta;
                var leadFilter;
                var leadFilterScale;
                var leadVibratoScale;
                var harmonyPeriodDelta;
                var harmonyPeriodDeltaScale;
                var harmonyVolume;
                var harmonyVolumeDelta;
                var harmonyFilter;
                var harmonyFilterScale;
                var harmonyVibratoScale;
                var bassPeriodDelta;
                var bassPeriodDeltaScale;
                var bassVolume;
                var bassVolumeDelta;
                var bassFilter;
                var bassFilterScale;
                var bassVibratoScale;
                var drumPeriodDelta;
                var drumPeriodDeltaScale;
                var drumVolume;
                var drumVolumeDelta;
                var time = this._part + this._beat * this.song.parts;
                var _loop_1 = function (channel) {
                    var pattern = this_1.song.getPattern(channel, this_1._bar);
                    var attack = pattern == null ? 0 : this_1.song.instrumentAttacks[channel][pattern.instrument];
                    tone = null;
                    prevTone = null;
                    nextTone = null;
                    if (pattern != null) {
                        for (var i = 0; i < pattern.tones.length; i++) {
                            if (pattern.tones[i].end <= time) {
                                prevTone = pattern.tones[i];
                            }
                            else if (pattern.tones[i].start <= time && pattern.tones[i].end > time) {
                                tone = pattern.tones[i];
                            }
                            else if (pattern.tones[i].start > time) {
                                nextTone = pattern.tones[i];
                                break;
                            }
                        }
                    }
                    if (tone != null && prevTone != null && prevTone.end != tone.start)
                        prevTone = null;
                    if (tone != null && nextTone != null && nextTone.start != tone.end)
                        nextTone = null;
                    var channelRoot = channel == 3 ? 69 : Music.keyTransposes[this_1.song.key];
                    var intervalScale = channel == 3 ? Music.drumInterval : 1;
                    var periodDelta = void 0;
                    var periodDeltaScale = void 0;
                    var toneVolume = void 0;
                    var volumeDelta = void 0;
                    var filter = void 0;
                    var filterScale = void 0;
                    var vibratoScale = void 0;
                    var resetPeriod = false;
                    if (this_1.pianoPressed && channel == this_1.pianoChannel) {
                        var pianoFreq = this_1._frequencyFromPitch(channelRoot + this_1.pianoNote * intervalScale);
                        var pianoPitchDamping = void 0;
                        if (channel == 3) {
                            if (this_1.song.instrumentWaves[3][pattern.instrument] > 0) {
                                drumFilter = Math.min(1.0, pianoFreq * sampleTime * 8.0);
                                pianoPitchDamping = 24.0;
                            }
                            else {
                                pianoPitchDamping = 60.0;
                            }
                        }
                        else {
                            pianoPitchDamping = 48.0;
                        }
                        periodDelta = pianoFreq * sampleTime;
                        periodDeltaScale = 1.0;
                        toneVolume = Math.pow(2.0, -this_1.pianoNote * intervalScale / pianoPitchDamping);
                        volumeDelta = 0.0;
                        filter = 1.0;
                        filterScale = 1.0;
                        vibratoScale = Math.pow(2.0, Music.effectVibratos[this_1.song.instrumentEffects[channel][pattern.instrument]] / 12.0) - 1.0;
                    }
                    else if (tone == null) {
                        periodDelta = 0.0;
                        periodDeltaScale = 0.0;
                        toneVolume = 0.0;
                        volumeDelta = 0.0;
                        filter = 1.0;
                        filterScale = 1.0;
                        vibratoScale = 0.0;
                        resetPeriod = true;
                    }
                    else {
                        var pitch = void 0;
                        if (tone.notes.length == 2) {
                            pitch = tone.notes[this_1._arpeggio >> 1];
                        }
                        else if (tone.notes.length == 3) {
                            pitch = tone.notes[this_1._arpeggio == 3 ? 1 : this_1._arpeggio];
                        }
                        else if (tone.notes.length == 4) {
                            pitch = tone.notes[this_1._arpeggio];
                        }
                        else {
                            pitch = tone.notes[0];
                        }
                        var startPin_1 = null;
                        var endPin_1 = null;
                        tone.pins.every(function (pin) {
                            if (pin.time + tone.start <= time) {
                                startPin_1 = pin;
                            }
                            else {
                                endPin_1 = pin;
                                return false;
                            }
                            return true;
                        }, this_1);
                        var toneStart = tone.start * 4;
                        var toneEnd = tone.end * 4;
                        var pinStart = (tone.start + startPin_1.time) * 4;
                        var pinEnd = (tone.start + endPin_1.time) * 4;
                        var arpeggioStart = time * 4 + this_1._arpeggio;
                        var arpeggioEnd = time * 4 + this_1._arpeggio + 1;
                        var arpeggioRatioStart = (arpeggioStart - pinStart) / (pinEnd - pinStart);
                        var arpeggioRatioEnd = (arpeggioEnd - pinStart) / (pinEnd - pinStart);
                        var arpeggioVolumeStart = startPin_1.volume * (1.0 - arpeggioRatioStart) + endPin_1.volume * arpeggioRatioStart;
                        var arpeggioVolumeEnd = startPin_1.volume * (1.0 - arpeggioRatioEnd) + endPin_1.volume * arpeggioRatioEnd;
                        var arpeggioIntervalStart = startPin_1.interval * (1.0 - arpeggioRatioStart) + endPin_1.interval * arpeggioRatioStart;
                        var arpeggioIntervalEnd = startPin_1.interval * (1.0 - arpeggioRatioEnd) + endPin_1.interval * arpeggioRatioEnd;
                        var arpeggioFilterTimeStart = startPin_1.time * (1.0 - arpeggioRatioStart) + endPin_1.time * arpeggioRatioStart;
                        var arpeggioFilterTimeEnd = startPin_1.time * (1.0 - arpeggioRatioEnd) + endPin_1.time * arpeggioRatioEnd;
                        var inhibitRestart = false;
                        if (arpeggioStart == toneStart) {
                            if (attack == 0) {
                                inhibitRestart = true;
                            }
                            else if (attack == 2) {
                                arpeggioVolumeStart = 0.0;
                            }
                            else if (attack == 3) {
                                if (prevTone == null || prevTone.notes.length > 1 || tone.notes.length > 1) {
                                    arpeggioVolumeStart = 0.0;
                                }
                                else if (prevTone.pins[prevTone.pins.length - 1].volume == 0 || tone.pins[0].volume == 0) {
                                    arpeggioVolumeStart = 0.0;
                                }
                                else {
                                    arpeggioIntervalStart = (prevTone.notes[0] + prevTone.pins[prevTone.pins.length - 1].interval - pitch) * 0.5;
                                    arpeggioFilterTimeStart = prevTone.pins[prevTone.pins.length - 1].time * 0.5;
                                    inhibitRestart = true;
                                }
                            }
                        }
                        if (arpeggioEnd == toneEnd) {
                            if (attack == 1 || attack == 2) {
                                arpeggioVolumeEnd = 0.0;
                            }
                            else if (attack == 3) {
                                if (nextTone == null || nextTone.notes.length > 1 || tone.notes.length > 1) {
                                    arpeggioVolumeEnd = 0.0;
                                }
                                else if (tone.pins[tone.pins.length - 1].volume == 0 || nextTone.pins[0].volume == 0) {
                                    arpeggioVolumeStart = 0.0;
                                }
                                else {
                                    arpeggioIntervalEnd = (nextTone.notes[0] + tone.pins[tone.pins.length - 1].interval - pitch) * 0.5;
                                    arpeggioFilterTimeEnd *= 0.5;
                                }
                            }
                        }
                        var startRatio = 1.0 - (this_1._arpeggioSamples + samples) / samplesPerArpeggio;
                        var endRatio = 1.0 - (this_1._arpeggioSamples) / samplesPerArpeggio;
                        var startInterval = arpeggioIntervalStart * (1.0 - startRatio) + arpeggioIntervalEnd * startRatio;
                        var endInterval = arpeggioIntervalStart * (1.0 - endRatio) + arpeggioIntervalEnd * endRatio;
                        var startFilterTime = arpeggioFilterTimeStart * (1.0 - startRatio) + arpeggioFilterTimeEnd * startRatio;
                        var endFilterTime = arpeggioFilterTimeStart * (1.0 - endRatio) + arpeggioFilterTimeEnd * endRatio;
                        var startFreq = this_1._frequencyFromPitch(channelRoot + (pitch + startInterval) * intervalScale);
                        var endFreq = this_1._frequencyFromPitch(channelRoot + (pitch + endInterval) * intervalScale);
                        var pitchDamping = void 0;
                        if (channel == 3) {
                            if (this_1.song.instrumentWaves[3][pattern.instrument] > 0) {
                                drumFilter = Math.min(1.0, startFreq * sampleTime * 8.0);
                                pitchDamping = 24.0;
                            }
                            else {
                                pitchDamping = 60.0;
                            }
                        }
                        else {
                            pitchDamping = 48.0;
                        }
                        var startVol = Math.pow(2.0, -(pitch + startInterval) * intervalScale / pitchDamping);
                        var endVol = Math.pow(2.0, -(pitch + endInterval) * intervalScale / pitchDamping);
                        startVol *= this_1._volumeConversion(arpeggioVolumeStart * (1.0 - startRatio) + arpeggioVolumeEnd * startRatio);
                        endVol *= this_1._volumeConversion(arpeggioVolumeStart * (1.0 - endRatio) + arpeggioVolumeEnd * endRatio);
                        var freqScale = endFreq / startFreq;
                        periodDelta = startFreq * sampleTime;
                        periodDeltaScale = Math.pow(freqScale, 1.0 / samples);
                        toneVolume = startVol;
                        volumeDelta = (endVol - startVol) / samples;
                        var timeSinceStart = (arpeggioStart + startRatio - toneStart) * samplesPerArpeggio / this_1.samplesPerSecond;
                        if (timeSinceStart == 0.0 && !inhibitRestart)
                            resetPeriod = true;
                        var filterScaleRate = Music.filterDecays[this_1.song.instrumentFilters[channel][pattern.instrument]];
                        filter = Math.pow(2, -filterScaleRate * startFilterTime * 4.0 * samplesPerArpeggio / this_1.samplesPerSecond);
                        var endFilter = Math.pow(2, -filterScaleRate * endFilterTime * 4.0 * samplesPerArpeggio / this_1.samplesPerSecond);
                        filterScale = Math.pow(endFilter / filter, 1.0 / samples);
                        vibratoScale = (this_1.song.instrumentEffects[channel][pattern.instrument] == 2 && time - tone.start < 3) ? 0.0 : Math.pow(2.0, Music.effectVibratos[this_1.song.instrumentEffects[channel][pattern.instrument]] / 12.0) - 1.0;
                    }
                    if (channel == 0) {
                        leadPeriodDelta = periodDelta;
                        leadPeriodDeltaScale = periodDeltaScale;
                        leadVolume = toneVolume * maxLeadVolume;
                        leadVolumeDelta = volumeDelta * maxLeadVolume;
                        leadFilter = filter * leadFilterBase;
                        leadFilterScale = filterScale;
                        leadVibratoScale = vibratoScale;
                        if (resetPeriod) {
                            this_1._leadSample = 0.0;
                            this_1._leadPeriodA = 0.0;
                            this_1._leadPeriodB = 0.0;
                        }
                    }
                    else if (channel == 1) {
                        harmonyPeriodDelta = periodDelta;
                        harmonyPeriodDeltaScale = periodDeltaScale;
                        harmonyVolume = toneVolume * maxHarmonyVolume;
                        harmonyVolumeDelta = volumeDelta * maxHarmonyVolume;
                        harmonyFilter = filter * harmonyFilterBase;
                        harmonyFilterScale = filterScale;
                        harmonyVibratoScale = vibratoScale;
                        if (resetPeriod) {
                            this_1._harmonySample = 0.0;
                            this_1._harmonyPeriodA = 0.0;
                            this_1._harmonyPeriodB = 0.0;
                        }
                    }
                    else if (channel == 2) {
                        bassPeriodDelta = periodDelta;
                        bassPeriodDeltaScale = periodDeltaScale;
                        bassVolume = toneVolume * maxBassVolume;
                        bassVolumeDelta = volumeDelta * maxBassVolume;
                        bassFilter = filter * bassFilterBase;
                        bassFilterScale = filterScale;
                        bassVibratoScale = vibratoScale;
                        if (resetPeriod) {
                            this_1._bassSample = 0.0;
                            this_1._bassPeriodA = 0.0;
                            this_1._bassPeriodB = 0.0;
                        }
                    }
                    else if (channel == 3) {
                        drumPeriodDelta = periodDelta / 32767.0;
                        drumPeriodDeltaScale = periodDeltaScale;
                        drumVolume = toneVolume * maxDrumVolume;
                        drumVolumeDelta = volumeDelta * maxDrumVolume;
                    }
                };
                var this_1 = this, tone, prevTone, nextTone;
                for (var channel = 0; channel < 4; channel++) {
                    _loop_1(channel);
                }
                var effectY = Math.sin(this._effectPeriod);
                var prevEffectY = Math.sin(this._effectPeriod - this._effectAngle);
                while (samples > 0) {
                    var sample = 0.0;
                    var leadVibrato = 1.0 + leadVibratoScale * effectY;
                    var harmonyVibrato = 1.0 + harmonyVibratoScale * effectY;
                    var bassVibrato = 1.0 + bassVibratoScale * effectY;
                    var leadTremelo = 1.0 + leadTremeloScale * (effectY - 1.0);
                    var harmonyTremelo = 1.0 + harmonyTremeloScale * (effectY - 1.0);
                    var bassTremelo = 1.0 + bassTremeloScale * (effectY - 1.0);
                    var temp = effectY;
                    effectY = this._effectYMult * effectY - prevEffectY;
                    prevEffectY = temp;
                    this._leadSample += ((leadWave[Math.floor(this._leadPeriodA * leadWaveLength)] + leadWave[Math.floor(this._leadPeriodB * leadWaveLength)]) * leadVolume * leadTremelo - this._leadSample) * leadFilter;
                    leadVolume += leadVolumeDelta;
                    this._leadPeriodA += leadPeriodDelta * leadVibrato * leadChorusA;
                    this._leadPeriodB += leadPeriodDelta * leadVibrato * leadChorusB;
                    leadPeriodDelta *= leadPeriodDeltaScale;
                    this._leadPeriodA -= Math.floor(this._leadPeriodA);
                    this._leadPeriodB -= Math.floor(this._leadPeriodB);
                    leadFilter *= leadFilterScale;
                    sample += this._leadSample;
                    this._harmonySample += ((harmonyWave[Math.floor(this._harmonyPeriodA * harmonyWaveLength)] + harmonyWave[Math.floor(this._harmonyPeriodB * harmonyWaveLength)]) * harmonyVolume * harmonyTremelo - this._harmonySample) * harmonyFilter;
                    harmonyVolume += harmonyVolumeDelta;
                    this._harmonyPeriodA += harmonyPeriodDelta * harmonyVibrato * harmonyChorusA;
                    this._harmonyPeriodB += harmonyPeriodDelta * harmonyVibrato * harmonyChorusB;
                    harmonyPeriodDelta *= harmonyPeriodDeltaScale;
                    this._harmonyPeriodA -= Math.floor(this._harmonyPeriodA);
                    this._harmonyPeriodB -= Math.floor(this._harmonyPeriodB);
                    harmonyFilter *= harmonyFilterScale;
                    sample += this._harmonySample;
                    this._bassSample += ((bassWave[Math.floor(this._bassPeriodA * bassWaveLength)] + bassWave[Math.floor(this._bassPeriodB * bassWaveLength)]) * bassVolume * bassTremelo - this._bassSample) * bassFilter;
                    bassVolume += bassVolumeDelta;
                    this._bassPeriodA += bassPeriodDelta * bassVibrato * bassChorusA;
                    this._bassPeriodB += bassPeriodDelta * bassVibrato * bassChorusB;
                    bassPeriodDelta *= bassPeriodDeltaScale;
                    this._bassPeriodA -= Math.floor(this._bassPeriodA);
                    this._bassPeriodB -= Math.floor(this._bassPeriodB);
                    bassFilter *= bassFilterScale;
                    sample += this._bassSample;
                    this._drumSample += (drumWave[Math.floor(this._drumPeriod * 32767.0)] * drumVolume - this._drumSample) * drumFilter;
                    drumVolume += drumVolumeDelta;
                    this._drumPeriod += drumPeriodDelta;
                    drumPeriodDelta *= drumPeriodDeltaScale;
                    this._drumPeriod -= Math.floor(this._drumPeriod);
                    sample += this._drumSample;
                    var abs = sample < 0.0 ? -sample : sample;
                    this._limit -= this._limitDecay;
                    if (this._limit < abs)
                        this._limit = abs;
                    sample /= this._limit * 0.75 + 0.25;
                    sample *= this.volume;
                    data[bufferIndex] = sample;
                    bufferIndex = bufferIndex + 1;
                    samples--;
                }
                if (this._effectYMult * effectY - prevEffectY > prevEffectY) {
                    this._effectPeriod = Math.asin(effectY);
                }
                else {
                    this._effectPeriod = Math.PI - Math.asin(effectY);
                }
                if (this._arpeggioSamples == 0) {
                    this._arpeggio++;
                    this._arpeggioSamples = samplesPerArpeggio;
                    if (this._arpeggio == 4) {
                        this._arpeggio = 0;
                        this._part++;
                        if (this._part == this.song.parts) {
                            this._part = 0;
                            this._beat++;
                            if (this._beat == this.song.beats) {
                                this._beat = 0;
                                this._effectPeriod = 0.0;
                                this._bar++;
                                if (this._bar < this.song.loopStart) {
                                    if (!this.enableIntro)
                                        this._bar = this.song.loopStart;
                                }
                                else {
                                    this.enableIntro = false;
                                }
                                if (this._bar >= this.song.loopStart + this.song.loopLength) {
                                    if (this.loopCount > 0)
                                        this.loopCount--;
                                    if (this.loopCount != 0) {
                                        this._bar = this.song.loopStart;
                                    }
                                }
                                if (this._bar >= this.song.bars) {
                                    this._bar = this.song.loopStart;
                                    this.enableOutro = false;
                                }
                                updateInstruments();
                            }
                        }
                    }
                }
            }
            if (this.stutterPressed)
                stutterFunction();
            this._playhead = (((this._arpeggio + 1.0 - this._arpeggioSamples / samplesPerArpeggio) / 4.0 + this._part) / this.song.parts + this._beat) / this.song.beats + this._bar;
        };
        Synth.prototype._frequencyFromPitch = function (pitch) {
            return 440.0 * Math.pow(2.0, (pitch - 69.0) / 12.0);
        };
        Synth.prototype._volumeConversion = function (toneVolume) {
            return Math.pow(toneVolume / 3.0, 1.5);
        };
        Synth.prototype._getSamplesPerArpeggio = function () {
            if (this.song == null)
                return 0;
            var beatsPerMinute = this.song.getBeatsPerMinute();
            var beatsPerSecond = beatsPerMinute / 60.0;
            var partsPerSecond = beatsPerSecond * this.song.parts;
            var arpeggioPerSecond = partsPerSecond * 4.0;
            return Math.floor(this.samplesPerSecond / arpeggioPerSecond);
        };
        return Synth;
    }());
    beepbox.Synth = Synth;
})(beepbox || (beepbox = {}));
"use strict";
var beepbox;
(function (beepbox) {
    function lerp(low, high, t) {
        return low + t * (high - low);
    }
    beepbox.lerp = lerp;
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
        function input(attributes) {
            return element("input", attributes);
        }
        html.input = input;
        function text(content) {
            return document.createTextNode(content);
        }
        html.text = text;
    })(html = beepbox.html || (beepbox.html = {}));
    var Model = (function () {
        function Model() {
            this._watchers = [];
            this._dirty = false;
        }
        Model.prototype.watch = function (watcher) {
            if (this._watchers.indexOf(watcher) == -1) {
                this._watchers.push(watcher);
            }
        };
        Model.prototype.unwatch = function (watcher) {
            var index = this._watchers.indexOf(watcher);
            if (index != -1) {
                this._watchers.splice(index, 1);
            }
        };
        Model.prototype.changed = function () {
            if (this._dirty == false) {
                this._dirty = true;
                Model._waitingForFrame.push(this);
            }
        };
        Model.prototype._update = function () {
            this._dirty = false;
            for (var _i = 0, _a = this._watchers.concat(); _i < _a.length; _i++) {
                var watcher = _a[_i];
                watcher();
            }
        };
        Model.updateAll = function () {
            for (var _i = 0, _a = this._waitingForFrame.concat(); _i < _a.length; _i++) {
                var model = _a[_i];
                model._update();
            }
            this._waitingForFrame.length = 0;
        };
        return Model;
    }());
    Model._waitingForFrame = [];
    beepbox.Model = Model;
    var Change = (function () {
        function Change(reversed) {
            this._reversed = reversed;
            this._doneForwards = !reversed;
            this._noop = true;
        }
        Change.prototype._didSomething = function () {
            this._noop = false;
        };
        Change.prototype.isNoop = function () {
            return this._noop;
        };
        Change.prototype.undo = function () {
            if (this._reversed) {
                this._doForwards();
                this._doneForwards = true;
            }
            else {
                this._doBackwards();
                this._doneForwards = false;
            }
        };
        Change.prototype.redo = function () {
            if (this._reversed) {
                this._doBackwards();
                this._doneForwards = false;
            }
            else {
                this._doForwards();
                this._doneForwards = true;
            }
        };
        Change.prototype._isDoneForwards = function () {
            return this._doneForwards;
        };
        Change.prototype._doForwards = function () {
            throw new Error("Change.doForwards(): Override me.");
        };
        Change.prototype._doBackwards = function () {
            throw new Error("Change.doBackwards(): Override me.");
        };
        return Change;
    }());
    beepbox.Change = Change;
    var ChangeHistory = (function (_super) {
        __extends(ChangeHistory, _super);
        function ChangeHistory() {
            var _this = _super.call(this) || this;
            _this._changes = [];
            _this._index = 0;
            _this._recentChange = null;
            _this.changed();
            return _this;
        }
        ChangeHistory.prototype.canUndo = function () {
            return this._index > 0;
        };
        ChangeHistory.prototype.canRedo = function () {
            return this._index < this._changes.length;
        };
        ChangeHistory.prototype.record = function (change) {
            if (change.isNoop())
                return;
            this._changes[this._index] = change;
            this._index++;
            this._changes.length = this._index;
            this._recentChange = change;
            this.changed();
        };
        ChangeHistory.prototype.undo = function () {
            if (this._index <= 0)
                return;
            this._index--;
            var change = this._changes[this._index];
            change.undo();
            this._recentChange = null;
            this.changed();
        };
        ChangeHistory.prototype.redo = function () {
            if (this._index >= this._changes.length)
                return;
            var change = this._changes[this._index];
            change.redo();
            this._index++;
            this.changed();
        };
        ChangeHistory.prototype.getRecentChange = function () {
            return this._recentChange;
        };
        return ChangeHistory;
    }(Model));
    beepbox.ChangeHistory = ChangeHistory;
    var SongDocument = (function (_super) {
        __extends(SongDocument, _super);
        function SongDocument() {
            var _this = _super.call(this) || this;
            _this.channel = 0;
            _this.bar = 0;
            _this.barScrollPos = 0;
            _this.volume = 75;
            _this.history = new ChangeHistory();
            _this.song = new beepbox.Song();
            _this.synth = new beepbox.Synth(_this.song);
            _this.showFifth = _this._getCookie("showFifth") == "true";
            _this.showLetters = _this._getCookie("showLetters") == "true";
            _this.showChannels = _this._getCookie("showChannels") == "true";
            _this.showScrollBar = _this._getCookie("showScrollBar") == "true";
            if (_this._getCookie("volume") != "")
                _this.volume = Number(_this._getCookie("volume"));
            _this.synth.volume = _this._calcVolume();
            return _this;
        }
        SongDocument.prototype.savePreferences = function () {
            this._setCookie("showFifth", this.showFifth ? "true" : "false");
            this._setCookie("showLetters", this.showLetters ? "true" : "false");
            this._setCookie("showChannels", this.showChannels ? "true" : "false");
            this._setCookie("showScrollBar", this.showScrollBar ? "true" : "false");
            this._setCookie("volume", String(this.volume));
        };
        SongDocument.prototype._calcVolume = function () {
            return Math.min(1.0, Math.pow(this.volume / 50.0, 0.5)) * Math.pow(2.0, (this.volume - 75.0) / 25.0);
        };
        SongDocument.prototype.setVolume = function (val) {
            this.volume = val;
            this.savePreferences();
            this.synth.volume = this._calcVolume();
        };
        SongDocument.prototype.getCurrentPattern = function () {
            return this.song.getPattern(this.channel, this.bar);
        };
        SongDocument.prototype.getCurrentInstrument = function () {
            var pattern = this.getCurrentPattern();
            return pattern == null ? 0 : pattern.instrument;
        };
        SongDocument.prototype._setCookie = function (name, value) {
            localStorage.setItem(name, value);
        };
        SongDocument.prototype._getCookie = function (cname) {
            var item = localStorage.getItem(cname);
            if (item != null) {
                return item;
            }
            var name = cname + "=";
            var ca = document.cookie.split(';');
            for (var i = 0; i < ca.length; i++) {
                var c = ca[i];
                while (c.charAt(0) == ' ')
                    c = c.substring(1);
                if (c.indexOf(name) == 0) {
                    var value = c.substring(name.length, c.length);
                    this._setCookie(cname, value);
                    document.cookie = cname + '=; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
                    return value;
                }
            }
            return "";
        };
        return SongDocument;
    }(Model));
    SongDocument._latestVersion = 2;
    beepbox.SongDocument = SongDocument;
    var ChangeSequence = (function (_super) {
        __extends(ChangeSequence, _super);
        function ChangeSequence(changes) {
            if (changes === void 0) { changes = null; }
            var _this = _super.call(this, false) || this;
            if (changes == null) {
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
    }(Change));
    beepbox.ChangeSequence = ChangeSequence;
    var ChangePins = (function (_super) {
        __extends(ChangePins, _super);
        function ChangePins(_document, _tone) {
            var _this = _super.call(this, false) || this;
            _this._document = _document;
            _this._tone = _tone;
            _this._oldStart = _this._tone.start;
            _this._oldEnd = _this._tone.end;
            _this._newStart = _this._tone.start;
            _this._newEnd = _this._tone.end;
            _this._oldPins = _this._tone.pins;
            _this._newPins = [];
            _this._oldNotes = _this._tone.notes;
            _this._newNotes = [];
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
            for (var i = 0; i < this._oldNotes.length; i++) {
                this._newNotes[i] = this._oldNotes[i] + firstInterval;
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
            this._tone.pins = this._newPins;
            this._tone.notes = this._newNotes;
            this._tone.start = this._newStart;
            this._tone.end = this._newEnd;
            this._document.changed();
        };
        ChangePins.prototype._doBackwards = function () {
            this._tone.pins = this._oldPins;
            this._tone.notes = this._oldNotes;
            this._tone.start = this._oldStart;
            this._tone.end = this._oldEnd;
            this._document.changed();
        };
        return ChangePins;
    }(Change));
    beepbox.ChangePins = ChangePins;
    var ChangeAttack = (function (_super) {
        __extends(ChangeAttack, _super);
        function ChangeAttack(document, attack) {
            var _this = _super.call(this, false) || this;
            _this._document = document;
            _this._oldAttack = document.song.instrumentAttacks[document.channel][document.getCurrentInstrument()];
            _this._newAttack = attack;
            if (_this._oldAttack != _this._newAttack) {
                _this._didSomething();
                _this.redo();
            }
            return _this;
        }
        ChangeAttack.prototype._doForwards = function () {
            this._document.song.instrumentAttacks[this._document.channel][this._document.getCurrentInstrument()] = this._newAttack;
            this._document.changed();
        };
        ChangeAttack.prototype._doBackwards = function () {
            this._document.song.instrumentAttacks[this._document.channel][this._document.getCurrentInstrument()] = this._oldAttack;
            this._document.changed();
        };
        return ChangeAttack;
    }(Change));
    beepbox.ChangeAttack = ChangeAttack;
    var ChangeBarPattern = (function (_super) {
        __extends(ChangeBarPattern, _super);
        function ChangeBarPattern(document, pattern) {
            var _this = _super.call(this, false) || this;
            _this._document = document;
            _this._oldPattern = document.song.channelBars[document.channel][document.bar];
            _this._newPattern = pattern;
            if (_this._oldPattern != _this._newPattern && pattern <= document.song.channelPatterns[document.channel].length) {
                _this._didSomething();
                _this.redo();
            }
            return _this;
        }
        ChangeBarPattern.prototype._doForwards = function () {
            this._document.song.channelBars[this._document.channel][this._document.bar] = this._newPattern;
            this._document.changed();
        };
        ChangeBarPattern.prototype._doBackwards = function () {
            this._document.song.channelBars[this._document.channel][this._document.bar] = this._oldPattern;
            this._document.changed();
        };
        return ChangeBarPattern;
    }(Change));
    beepbox.ChangeBarPattern = ChangeBarPattern;
    var ChangeBars = (function (_super) {
        __extends(ChangeBars, _super);
        function ChangeBars(document, bars) {
            var _this = _super.call(this, false) || this;
            _this._document = document;
            _this._oldBars = document.song.bars;
            _this._newBars = bars;
            if (_this._oldBars != _this._newBars) {
                _this._oldChannelBars = document.song.channelBars;
                _this._newChannelBars = [];
                for (var i = 0; i < beepbox.Music.numChannels; i++) {
                    var channel = [];
                    for (var j = 0; j < _this._newBars; j++) {
                        channel.push(j < _this._oldBars ? _this._oldChannelBars[i][j] : 1);
                    }
                    _this._newChannelBars.push(channel);
                }
                _this._oldBar = document.bar;
                _this._oldBarScrollPos = document.barScrollPos;
                _this._oldLoopStart = document.song.loopStart;
                _this._oldLoopLength = document.song.loopLength;
                _this._newBar = document.bar;
                _this._newBarScrollPos = document.barScrollPos;
                _this._newLoopStart = document.song.loopStart;
                _this._newLoopLength = document.song.loopLength;
                if (_this._oldBars > _this._newBars) {
                    _this._newBar = Math.min(_this._newBar, _this._newBars - 1);
                    _this._newBarScrollPos = Math.max(0, Math.min(_this._newBars - 16, _this._newBarScrollPos));
                    _this._newLoopLength = Math.min(_this._newBars, _this._newLoopLength);
                    _this._newLoopStart = Math.min(_this._newBars - _this._newLoopLength, _this._newLoopStart);
                }
                _this._doForwards();
                _this._didSomething();
            }
            return _this;
        }
        ChangeBars.prototype._doForwards = function () {
            this._document.bar = this._newBar;
            this._document.barScrollPos = this._newBarScrollPos;
            this._document.song.loopStart = this._newLoopStart;
            this._document.song.loopLength = this._newLoopLength;
            this._document.song.bars = this._newBars;
            this._document.song.channelBars = this._newChannelBars;
            this._document.changed();
        };
        ChangeBars.prototype._doBackwards = function () {
            this._document.bar = this._oldBar;
            this._document.barScrollPos = this._oldBarScrollPos;
            this._document.song.loopStart = this._oldLoopStart;
            this._document.song.loopLength = this._oldLoopLength;
            this._document.song.bars = this._oldBars;
            this._document.song.channelBars = this._oldChannelBars;
            this._document.changed();
        };
        return ChangeBars;
    }(Change));
    beepbox.ChangeBars = ChangeBars;
    var ChangeBeats = (function (_super) {
        __extends(ChangeBeats, _super);
        function ChangeBeats(document, beats) {
            var _this = _super.call(this, false) || this;
            _this._document = document;
            _this._oldBeats = document.song.beats;
            _this._newBeats = beats;
            if (_this._oldBeats != _this._newBeats) {
                if (_this._oldBeats > _this._newBeats) {
                    _this._sequence = new ChangeSequence();
                    for (var i = 0; i < beepbox.Music.numChannels; i++) {
                        for (var j = 0; j < document.song.channelPatterns[i].length; j++) {
                            _this._sequence.append(new ChangeToneTruncate(document, document.song.channelPatterns[i][j], _this._newBeats * document.song.parts, _this._oldBeats * document.song.parts));
                        }
                    }
                }
                _this._document.song.beats = _this._newBeats;
                _this._document.changed();
                _this._didSomething();
            }
            return _this;
        }
        ChangeBeats.prototype._doForwards = function () {
            if (this._sequence != null)
                this._sequence.redo();
            this._document.song.beats = this._newBeats;
            this._document.changed();
        };
        ChangeBeats.prototype._doBackwards = function () {
            this._document.song.beats = this._oldBeats;
            if (this._sequence != null)
                this._sequence.undo();
            this._document.changed();
        };
        return ChangeBeats;
    }(Change));
    beepbox.ChangeBeats = ChangeBeats;
    var ChangeChannelBar = (function (_super) {
        __extends(ChangeChannelBar, _super);
        function ChangeChannelBar(document, channel, bar) {
            var _this = _super.call(this, false) || this;
            _this._document = document;
            _this._oldChannel = document.channel;
            _this._newChannel = channel;
            _this._oldBar = document.bar;
            _this._newBar = bar;
            _this._doForwards();
            if (_this._oldChannel != _this._newChannel || _this._oldBar != _this._newBar) {
                _this._didSomething();
            }
            return _this;
        }
        ChangeChannelBar.prototype._doForwards = function () {
            this._document.channel = this._newChannel;
            this._document.bar = this._newBar;
            this._document.barScrollPos = Math.min(this._document.bar, Math.max(this._document.bar - 15, this._document.barScrollPos));
            this._document.changed();
        };
        ChangeChannelBar.prototype._doBackwards = function () {
            this._document.channel = this._oldChannel;
            this._document.bar = this._oldBar;
            this._document.barScrollPos = Math.min(this._document.bar, Math.max(this._document.bar - 15, this._document.barScrollPos));
            this._document.changed();
        };
        return ChangeChannelBar;
    }(Change));
    beepbox.ChangeChannelBar = ChangeChannelBar;
    var ChangeChorus = (function (_super) {
        __extends(ChangeChorus, _super);
        function ChangeChorus(document, chorus) {
            var _this = _super.call(this, false) || this;
            _this._document = document;
            _this._oldChorus = document.song.instrumentChorus[document.channel][document.getCurrentInstrument()];
            _this._newChorus = chorus;
            if (_this._oldChorus != _this._newChorus) {
                _this._didSomething();
                _this.redo();
            }
            return _this;
        }
        ChangeChorus.prototype._doForwards = function () {
            this._document.song.instrumentChorus[this._document.channel][this._document.getCurrentInstrument()] = this._newChorus;
            this._document.changed();
        };
        ChangeChorus.prototype._doBackwards = function () {
            this._document.song.instrumentChorus[this._document.channel][this._document.getCurrentInstrument()] = this._oldChorus;
            this._document.changed();
        };
        return ChangeChorus;
    }(Change));
    beepbox.ChangeChorus = ChangeChorus;
    var ChangeEffect = (function (_super) {
        __extends(ChangeEffect, _super);
        function ChangeEffect(document, effect) {
            var _this = _super.call(this, false) || this;
            _this._document = document;
            _this._oldEffect = document.song.instrumentEffects[document.channel][document.getCurrentInstrument()];
            _this._newEffect = effect;
            if (_this._oldEffect != _this._newEffect) {
                _this._didSomething();
                _this.redo();
            }
            return _this;
        }
        ChangeEffect.prototype._doForwards = function () {
            this._document.song.instrumentEffects[this._document.channel][this._document.getCurrentInstrument()] = this._newEffect;
            this._document.changed();
        };
        ChangeEffect.prototype._doBackwards = function () {
            this._document.song.instrumentEffects[this._document.channel][this._document.getCurrentInstrument()] = this._oldEffect;
            this._document.changed();
        };
        return ChangeEffect;
    }(Change));
    beepbox.ChangeEffect = ChangeEffect;
    var ChangeFilter = (function (_super) {
        __extends(ChangeFilter, _super);
        function ChangeFilter(document, filter) {
            var _this = _super.call(this, false) || this;
            _this._document = document;
            _this._oldFilter = document.song.instrumentFilters[document.channel][document.getCurrentInstrument()];
            _this._newFilter = filter;
            if (_this._oldFilter != _this._newFilter) {
                _this._didSomething();
                _this.redo();
            }
            return _this;
        }
        ChangeFilter.prototype._doForwards = function () {
            this._document.song.instrumentFilters[this._document.channel][this._document.getCurrentInstrument()] = this._newFilter;
            this._document.changed();
        };
        ChangeFilter.prototype._doBackwards = function () {
            this._document.song.instrumentFilters[this._document.channel][this._document.getCurrentInstrument()] = this._oldFilter;
            this._document.changed();
        };
        return ChangeFilter;
    }(Change));
    beepbox.ChangeFilter = ChangeFilter;
    var ChangeInstruments = (function (_super) {
        __extends(ChangeInstruments, _super);
        function ChangeInstruments(document, instruments) {
            var _this = _super.call(this, false) || this;
            _this._document = document;
            _this._oldInstruments = document.song.instruments;
            _this._newInstruments = instruments;
            if (_this._oldInstruments != _this._newInstruments) {
                _this._oldInstrumentWaves = document.song.instrumentWaves;
                _this._oldInstrumentFilters = document.song.instrumentFilters;
                _this._oldInstrumentAttacks = document.song.instrumentAttacks;
                _this._oldInstrumentEffects = document.song.instrumentEffects;
                _this._oldInstrumentChorus = document.song.instrumentChorus;
                _this._oldInstrumentVolumes = document.song.instrumentVolumes;
                _this._newInstrumentWaves = [];
                _this._newInstrumentFilters = [];
                _this._newInstrumentAttacks = [];
                _this._newInstrumentEffects = [];
                _this._newInstrumentChorus = [];
                _this._newInstrumentVolumes = [];
                var oldArrays = [_this._oldInstrumentWaves, _this._oldInstrumentFilters, _this._oldInstrumentAttacks, _this._oldInstrumentEffects, _this._oldInstrumentChorus, _this._oldInstrumentVolumes];
                var newArrays = [_this._newInstrumentWaves, _this._newInstrumentFilters, _this._newInstrumentAttacks, _this._newInstrumentEffects, _this._newInstrumentChorus, _this._newInstrumentVolumes];
                for (var k = 0; k < newArrays.length; k++) {
                    var oldArray = oldArrays[k];
                    var newArray = newArrays[k];
                    for (var i = 0; i < beepbox.Music.numChannels; i++) {
                        var channel = [];
                        for (var j = 0; j < _this._newInstruments; j++) {
                            if (j < _this._oldInstruments) {
                                channel.push(oldArray[i][j]);
                            }
                            else {
                                if (k == 0) {
                                    channel.push(1);
                                }
                                else if (k == 2) {
                                    channel.push(1);
                                }
                                else {
                                    channel.push(0);
                                }
                            }
                        }
                        newArray.push(channel);
                    }
                }
                _this._oldInstrumentIndices = [];
                _this._newInstrumentIndices = [];
                for (var i = 0; i < beepbox.Music.numChannels; i++) {
                    var oldIndices = [];
                    var newIndices = [];
                    for (var j = 0; j < document.song.patterns; j++) {
                        var oldIndex = document.song.channelPatterns[i][j].instrument;
                        oldIndices.push(oldIndex);
                        newIndices.push(oldIndex < _this._newInstruments ? oldIndex : 0);
                    }
                    _this._oldInstrumentIndices.push(oldIndices);
                    _this._newInstrumentIndices.push(newIndices);
                }
                _this._doForwards();
                _this._didSomething();
            }
            return _this;
        }
        ChangeInstruments.prototype._doForwards = function () {
            this._document.song.instruments = this._newInstruments;
            this._document.song.instrumentWaves = this._newInstrumentWaves;
            this._document.song.instrumentFilters = this._newInstrumentFilters;
            this._document.song.instrumentAttacks = this._newInstrumentAttacks;
            this._document.song.instrumentEffects = this._newInstrumentEffects;
            this._document.song.instrumentChorus = this._newInstrumentChorus;
            this._document.song.instrumentVolumes = this._newInstrumentVolumes;
            this._copyIndices(this._newInstrumentIndices);
            this._document.changed();
        };
        ChangeInstruments.prototype._doBackwards = function () {
            this._document.song.instruments = this._oldInstruments;
            this._document.song.instrumentWaves = this._oldInstrumentWaves;
            this._document.song.instrumentFilters = this._oldInstrumentFilters;
            this._document.song.instrumentAttacks = this._oldInstrumentAttacks;
            this._document.song.instrumentEffects = this._oldInstrumentEffects;
            this._document.song.instrumentChorus = this._oldInstrumentChorus;
            this._document.song.instrumentVolumes = this._oldInstrumentVolumes;
            this._copyIndices(this._oldInstrumentIndices);
            this._document.changed();
        };
        ChangeInstruments.prototype._copyIndices = function (indices) {
            for (var i = 0; i < beepbox.Music.numChannels; i++) {
                for (var j = 0; j < this._document.song.patterns; j++) {
                    this._document.song.channelPatterns[i][j].instrument = indices[i][j];
                }
            }
        };
        return ChangeInstruments;
    }(Change));
    beepbox.ChangeInstruments = ChangeInstruments;
    var ChangeKey = (function (_super) {
        __extends(ChangeKey, _super);
        function ChangeKey(document, key) {
            var _this = _super.call(this, false) || this;
            _this._document = document;
            _this._oldKey = document.song.key;
            _this._newKey = key;
            if (_this._oldKey != _this._newKey) {
                _this._didSomething();
                _this.redo();
            }
            return _this;
        }
        ChangeKey.prototype._doForwards = function () {
            this._document.song.key = this._newKey;
            this._document.changed();
        };
        ChangeKey.prototype._doBackwards = function () {
            this._document.song.key = this._oldKey;
            this._document.changed();
        };
        return ChangeKey;
    }(Change));
    beepbox.ChangeKey = ChangeKey;
    var ChangeLoop = (function (_super) {
        __extends(ChangeLoop, _super);
        function ChangeLoop(document, start, length) {
            var _this = _super.call(this, false) || this;
            _this._document = document;
            _this._oldStart = document.song.loopStart;
            _this._newStart = start;
            _this._oldLength = document.song.loopLength;
            _this._newLength = length;
            if (_this._oldStart != _this._newStart || _this._oldLength != _this._newLength) {
                _this._didSomething();
                _this.redo();
            }
            return _this;
        }
        ChangeLoop.prototype._doForwards = function () {
            this._document.song.loopStart = this._newStart;
            this._document.song.loopLength = this._newLength;
            this._document.changed();
        };
        ChangeLoop.prototype._doBackwards = function () {
            this._document.song.loopStart = this._oldStart;
            this._document.song.loopLength = this._oldLength;
            this._document.changed();
        };
        return ChangeLoop;
    }(Change));
    beepbox.ChangeLoop = ChangeLoop;
    var ChangeNoteAdded = (function (_super) {
        __extends(ChangeNoteAdded, _super);
        function ChangeNoteAdded(document, pattern, tone, note, index, deletion) {
            if (deletion === void 0) { deletion = false; }
            var _this = _super.call(this, deletion) || this;
            _this._document = document;
            _this._pattern = pattern;
            _this._tone = tone;
            _this._note = note;
            _this._index = index;
            _this._didSomething();
            _this.redo();
            return _this;
        }
        ChangeNoteAdded.prototype._doForwards = function () {
            this._tone.notes.splice(this._index, 0, this._note);
            this._document.changed();
        };
        ChangeNoteAdded.prototype._doBackwards = function () {
            this._tone.notes.splice(this._index, 1);
            this._document.changed();
        };
        return ChangeNoteAdded;
    }(Change));
    beepbox.ChangeNoteAdded = ChangeNoteAdded;
    var ChangeOctave = (function (_super) {
        __extends(ChangeOctave, _super);
        function ChangeOctave(document, octave) {
            var _this = _super.call(this, false) || this;
            _this._document = document;
            _this._oldOctave = document.song.channelOctaves[document.channel];
            _this._newOctave = octave;
            if (_this._oldOctave != _this._newOctave) {
                _this._didSomething();
                _this.redo();
            }
            return _this;
        }
        ChangeOctave.prototype._doForwards = function () {
            this._document.song.channelOctaves[this._document.channel] = this._newOctave;
            this._document.changed();
        };
        ChangeOctave.prototype._doBackwards = function () {
            this._document.song.channelOctaves[this._document.channel] = this._oldOctave;
            this._document.changed();
        };
        return ChangeOctave;
    }(Change));
    beepbox.ChangeOctave = ChangeOctave;
    var ChangeParts = (function (_super) {
        __extends(ChangeParts, _super);
        function ChangeParts(document, parts) {
            var _this = _super.call(this, false) || this;
            _this._document = document;
            _this._oldParts = document.song.parts;
            _this._newParts = parts;
            if (_this._oldParts != _this._newParts) {
                _this._sequence = new ChangeSequence();
                for (var i = 0; i < beepbox.Music.numChannels; i++) {
                    for (var j = 0; j < document.song.channelPatterns[i].length; j++) {
                        _this._sequence.append(new ChangeRhythm(document, document.song.channelPatterns[i][j], _this._oldParts, _this._newParts));
                    }
                }
                document.song.parts = _this._newParts;
                document.changed();
                _this._didSomething();
            }
            return _this;
        }
        ChangeParts.prototype._doForwards = function () {
            if (this._sequence != null)
                this._sequence.redo();
            this._document.song.parts = this._newParts;
            this._document.changed();
        };
        ChangeParts.prototype._doBackwards = function () {
            this._document.song.parts = this._oldParts;
            if (this._sequence != null)
                this._sequence.undo();
            this._document.changed();
        };
        return ChangeParts;
    }(Change));
    beepbox.ChangeParts = ChangeParts;
    var ChangePaste = (function (_super) {
        __extends(ChangePaste, _super);
        function ChangePaste(document, tones) {
            var _this = _super.call(this, false) || this;
            _this._document = document;
            var pattern = document.getCurrentPattern();
            _this.oldTones = pattern.tones;
            pattern.tones = tones;
            pattern.tones = pattern.cloneTones();
            _this.newTones = pattern.tones;
            document.changed();
            _this._didSomething();
            return _this;
        }
        ChangePaste.prototype._doForwards = function () {
            var pattern = this._document.getCurrentPattern();
            pattern.tones = this.newTones;
            this._document.changed();
        };
        ChangePaste.prototype._doBackwards = function () {
            var pattern = this._document.getCurrentPattern();
            pattern.tones = this.oldTones;
            this._document.changed();
        };
        return ChangePaste;
    }(Change));
    beepbox.ChangePaste = ChangePaste;
    var ChangePatternInstrument = (function (_super) {
        __extends(ChangePatternInstrument, _super);
        function ChangePatternInstrument(document, instrument) {
            var _this = _super.call(this, false) || this;
            _this._document = document;
            _this._oldInstrument = document.getCurrentPattern().instrument;
            _this._newInstrument = instrument;
            if (_this._oldInstrument != _this._newInstrument) {
                _this._doForwards();
                _this._didSomething();
            }
            return _this;
        }
        ChangePatternInstrument.prototype._doForwards = function () {
            this._document.getCurrentPattern().instrument = this._newInstrument;
            this._document.changed();
        };
        ChangePatternInstrument.prototype._doBackwards = function () {
            this._document.getCurrentPattern().instrument = this._oldInstrument;
            this._document.changed();
        };
        return ChangePatternInstrument;
    }(Change));
    beepbox.ChangePatternInstrument = ChangePatternInstrument;
    var ChangePatterns = (function (_super) {
        __extends(ChangePatterns, _super);
        function ChangePatterns(document, patterns) {
            var _this = _super.call(this, false) || this;
            _this._document = document;
            _this._oldPatterns = document.song.patterns;
            _this._newPatterns = patterns;
            if (_this._oldPatterns != _this._newPatterns) {
                _this._oldChannelBars = document.song.channelBars;
                _this._newChannelBars = [];
                _this._oldChannelPatterns = document.song.channelPatterns;
                _this._newChannelPatterns = [];
                for (var i = 0; i < beepbox.Music.numChannels; i++) {
                    var channelBars = [];
                    for (var j = 0; j < document.song.channelBars[i].length; j++) {
                        var bar = document.song.channelBars[i][j];
                        if (bar > _this._newPatterns)
                            bar = 1;
                        channelBars.push(bar);
                    }
                    _this._newChannelBars.push(channelBars);
                    var channelPatterns = [];
                    for (var j = 0; j < _this._newPatterns; j++) {
                        if (j < document.song.channelPatterns[i].length) {
                            channelPatterns.push(document.song.channelPatterns[i][j]);
                        }
                        else {
                            channelPatterns.push(new beepbox.BarPattern());
                        }
                    }
                    _this._newChannelPatterns.push(channelPatterns);
                }
                _this._doForwards();
                _this._didSomething();
            }
            return _this;
        }
        ChangePatterns.prototype._doForwards = function () {
            if (this._sequence != null)
                this._sequence.redo();
            this._document.song.patterns = this._newPatterns;
            this._document.song.channelBars = this._newChannelBars;
            this._document.song.channelPatterns = this._newChannelPatterns;
            this._document.changed();
        };
        ChangePatterns.prototype._doBackwards = function () {
            this._document.song.patterns = this._oldPatterns;
            this._document.song.channelBars = this._oldChannelBars;
            this._document.song.channelPatterns = this._oldChannelPatterns;
            if (this._sequence != null)
                this._sequence.undo();
            this._document.changed();
        };
        return ChangePatterns;
    }(Change));
    beepbox.ChangePatterns = ChangePatterns;
    var ChangePinTime = (function (_super) {
        __extends(ChangePinTime, _super);
        function ChangePinTime(document, tone, pinIndex, shiftedTime) {
            var _this = _super.call(this, document, tone) || this;
            shiftedTime -= _this._oldStart;
            var originalTime = _this._oldPins[pinIndex].time;
            var skipStart = Math.min(originalTime, shiftedTime);
            var skipEnd = Math.max(originalTime, shiftedTime);
            var setPin = false;
            for (var i = 0; i < _this._oldPins.length; i++) {
                var oldPin = tone.pins[i];
                var time = oldPin.time;
                if (time < skipStart) {
                    _this._newPins.push(new beepbox.TonePin(oldPin.interval, time, oldPin.volume));
                }
                else if (time > skipEnd) {
                    if (!setPin) {
                        _this._newPins.push(new beepbox.TonePin(_this._oldPins[pinIndex].interval, shiftedTime, _this._oldPins[pinIndex].volume));
                        setPin = true;
                    }
                    _this._newPins.push(new beepbox.TonePin(oldPin.interval, time, oldPin.volume));
                }
            }
            if (!setPin) {
                _this._newPins.push(new beepbox.TonePin(_this._oldPins[pinIndex].interval, shiftedTime, _this._oldPins[pinIndex].volume));
            }
            _this._finishSetup();
            return _this;
        }
        return ChangePinTime;
    }(ChangePins));
    beepbox.ChangePinTime = ChangePinTime;
    var ChangePitchBend = (function (_super) {
        __extends(ChangePitchBend, _super);
        function ChangePitchBend(document, tone, bendStart, bendEnd, bendTo, noteIndex) {
            var _this = _super.call(this, document, tone) || this;
            bendStart -= _this._oldStart;
            bendEnd -= _this._oldStart;
            bendTo -= tone.notes[noteIndex];
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
                stop = tone.pins.length;
                push = function (item) { _this._newPins.push(item); };
            }
            else {
                i = tone.pins.length - 1;
                direction = -1;
                stop = -1;
                push = function (item) { _this._newPins.unshift(item); };
            }
            for (; i != stop; i += direction) {
                var oldPin = tone.pins[i];
                var time = oldPin.time;
                for (;;) {
                    if (!setStart) {
                        if (time * direction <= bendStart * direction) {
                            prevInterval = oldPin.interval;
                            prevVolume = oldPin.volume;
                        }
                        if (time * direction < bendStart * direction) {
                            push(new beepbox.TonePin(oldPin.interval, time, oldPin.volume));
                            break;
                        }
                        else {
                            push(new beepbox.TonePin(prevInterval, bendStart, prevVolume));
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
                            push(new beepbox.TonePin(bendTo, bendEnd, prevVolume));
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
                            push(new beepbox.TonePin(persist ? bendTo : oldPin.interval, time, oldPin.volume));
                            break;
                        }
                    }
                }
            }
            if (!setEnd) {
                push(new beepbox.TonePin(bendTo, bendEnd, prevVolume));
            }
            _this._finishSetup();
            return _this;
        }
        return ChangePitchBend;
    }(ChangePins));
    beepbox.ChangePitchBend = ChangePitchBend;
    var ChangeRhythm = (function (_super) {
        __extends(ChangeRhythm, _super);
        function ChangeRhythm(document, bar, oldParts, newParts) {
            var _this = _super.call(this) || this;
            var changeRhythm;
            if (oldParts == 4 && newParts == 3)
                changeRhythm = function (oldTime) {
                    return Math.ceil(oldTime * 3.0 / 4.0);
                };
            if (oldParts == 3 && newParts == 4)
                changeRhythm = function (oldTime) {
                    return Math.floor(oldTime * 4.0 / 3.0);
                };
            var i = 0;
            while (i < bar.tones.length) {
                var tone = bar.tones[i];
                if (changeRhythm(tone.start) >= changeRhythm(tone.end)) {
                    _this.append(new ChangeToneAdded(document, bar, tone, i, true));
                }
                else {
                    _this.append(new ChangeRhythmTone(document, tone, changeRhythm));
                    i++;
                }
            }
            return _this;
        }
        return ChangeRhythm;
    }(ChangeSequence));
    beepbox.ChangeRhythm = ChangeRhythm;
    var ChangeRhythmTone = (function (_super) {
        __extends(ChangeRhythmTone, _super);
        function ChangeRhythmTone(document, tone, changeRhythm) {
            var _this = _super.call(this, document, tone) || this;
            for (var _i = 0, _a = _this._oldPins; _i < _a.length; _i++) {
                var oldPin = _a[_i];
                _this._newPins.push(new beepbox.TonePin(oldPin.interval, changeRhythm(oldPin.time + _this._oldStart) - _this._oldStart, oldPin.volume));
            }
            _this._finishSetup();
            return _this;
        }
        return ChangeRhythmTone;
    }(ChangePins));
    beepbox.ChangeRhythmTone = ChangeRhythmTone;
    var ChangeScale = (function (_super) {
        __extends(ChangeScale, _super);
        function ChangeScale(document, scale) {
            var _this = _super.call(this, false) || this;
            _this._document = document;
            _this._oldScale = document.song.scale;
            _this._newScale = scale;
            if (_this._oldScale != _this._newScale) {
                _this._didSomething();
                _this.redo();
            }
            return _this;
        }
        ChangeScale.prototype._doForwards = function () {
            this._document.song.scale = this._newScale;
            this._document.changed();
        };
        ChangeScale.prototype._doBackwards = function () {
            this._document.song.scale = this._oldScale;
            this._document.changed();
        };
        return ChangeScale;
    }(Change));
    beepbox.ChangeScale = ChangeScale;
    var ChangeSong = (function (_super) {
        __extends(ChangeSong, _super);
        function ChangeSong(document, song) {
            var _this = _super.call(this, false) || this;
            _this._document = document;
            _this._oldSong = document.song.toString();
            _this._oldPatterns = document.song.channelPatterns;
            _this._oldBar = document.bar;
            if (song != null) {
                _this._newSong = song;
                document.song.fromString(_this._newSong, false);
            }
            else {
                document.song.initToDefault(false);
                _this._newSong = document.song.toString();
            }
            _this._newPatterns = document.song.channelPatterns;
            _this._newBar = Math.max(0, Math.min(document.song.bars - 1, _this._oldBar));
            document.bar = _this._newBar;
            document.barScrollPos = Math.max(0, Math.min(document.song.bars - 16, document.barScrollPos));
            document.barScrollPos = Math.min(document.bar, Math.max(document.bar - 15, document.barScrollPos));
            document.changed();
            _this._didSomething();
            return _this;
        }
        ChangeSong.prototype._doForwards = function () {
            this._document.song.fromString(this._newSong, true);
            this._document.song.channelPatterns = this._newPatterns;
            this._document.bar = this._newBar;
            this._document.barScrollPos = Math.max(0, Math.min(this._document.song.bars - 16, this._document.barScrollPos));
            this._document.barScrollPos = Math.min(this._document.bar, Math.max(this._document.bar - 15, this._document.barScrollPos));
            this._document.changed();
        };
        ChangeSong.prototype._doBackwards = function () {
            this._document.song.fromString(this._oldSong, true);
            this._document.song.channelPatterns = this._oldPatterns;
            this._document.bar = this._oldBar;
            this._document.barScrollPos = Math.max(0, Math.min(this._document.song.bars - 16, this._document.barScrollPos));
            this._document.barScrollPos = Math.min(this._document.bar, Math.max(this._document.bar - 15, this._document.barScrollPos));
            this._document.changed();
        };
        return ChangeSong;
    }(Change));
    beepbox.ChangeSong = ChangeSong;
    var ChangeTempo = (function (_super) {
        __extends(ChangeTempo, _super);
        function ChangeTempo(document, tempo) {
            var _this = _super.call(this, false) || this;
            _this._document = document;
            _this._oldTempo = document.song.tempo;
            _this._newTempo = tempo;
            if (_this._oldTempo != _this._newTempo) {
                _this._didSomething();
                _this.redo();
            }
            return _this;
        }
        ChangeTempo.prototype._doForwards = function () {
            this._document.song.tempo = this._newTempo;
            this._document.changed();
        };
        ChangeTempo.prototype._doBackwards = function () {
            this._document.song.tempo = this._oldTempo;
            this._document.changed();
        };
        return ChangeTempo;
    }(Change));
    beepbox.ChangeTempo = ChangeTempo;
    var ChangeToneAdded = (function (_super) {
        __extends(ChangeToneAdded, _super);
        function ChangeToneAdded(document, bar, tone, index, deletion) {
            if (deletion === void 0) { deletion = false; }
            var _this = _super.call(this, deletion) || this;
            _this._document = document;
            _this._bar = bar;
            _this._tone = tone;
            _this._index = index;
            _this._didSomething();
            _this.redo();
            return _this;
        }
        ChangeToneAdded.prototype._doForwards = function () {
            this._bar.tones.splice(this._index, 0, this._tone);
            this._document.changed();
        };
        ChangeToneAdded.prototype._doBackwards = function () {
            this._bar.tones.splice(this._index, 1);
            this._document.changed();
        };
        return ChangeToneAdded;
    }(Change));
    beepbox.ChangeToneAdded = ChangeToneAdded;
    var ChangeToneLength = (function (_super) {
        __extends(ChangeToneLength, _super);
        function ChangeToneLength(document, tone, truncStart, truncEnd) {
            var _this = _super.call(this, document, tone) || this;
            truncStart -= _this._oldStart;
            truncEnd -= _this._oldStart;
            var setStart = false;
            var prevVolume = _this._oldPins[0].volume;
            var prevInterval = _this._oldPins[0].interval;
            var i;
            for (i = 0; i < _this._oldPins.length; i++) {
                var oldPin = _this._oldPins[i];
                if (oldPin.time < truncStart) {
                    prevVolume = oldPin.volume;
                    prevInterval = oldPin.interval;
                }
                else if (oldPin.time <= truncEnd) {
                    if (oldPin.time > truncStart && !setStart) {
                        _this._newPins.push(new beepbox.TonePin(prevInterval, truncStart, prevVolume));
                    }
                    _this._newPins.push(new beepbox.TonePin(oldPin.interval, oldPin.time, oldPin.volume));
                    setStart = true;
                    if (oldPin.time == truncEnd) {
                        return _this;
                    }
                }
                else {
                    break;
                }
            }
            _this._newPins.push(new beepbox.TonePin(_this._oldPins[i].interval, truncEnd, _this._oldPins[i].volume));
            _this._finishSetup();
            return _this;
        }
        return ChangeToneLength;
    }(ChangePins));
    beepbox.ChangeToneLength = ChangeToneLength;
    var ChangeToneTruncate = (function (_super) {
        __extends(ChangeToneTruncate, _super);
        function ChangeToneTruncate(document, bar, start, end, skipTone) {
            if (skipTone === void 0) { skipTone = null; }
            var _this = _super.call(this) || this;
            var i = 0;
            while (i < bar.tones.length) {
                var tone = bar.tones[i];
                if (tone == skipTone && skipTone != null) {
                    i++;
                }
                else if (tone.end <= start) {
                    i++;
                }
                else if (tone.start >= end) {
                    break;
                }
                else if (tone.start < start) {
                    _this.append(new ChangeToneLength(document, tone, tone.start, start));
                    i++;
                }
                else if (tone.end > end) {
                    _this.append(new ChangeToneLength(document, tone, end, tone.end));
                    i++;
                }
                else {
                    _this.append(new ChangeToneAdded(document, bar, tone, i, true));
                }
            }
            return _this;
        }
        return ChangeToneTruncate;
    }(ChangeSequence));
    beepbox.ChangeToneTruncate = ChangeToneTruncate;
    var ChangeTransposeTone = (function (_super) {
        __extends(ChangeTransposeTone, _super);
        function ChangeTransposeTone(doc, tone, upward) {
            var _this = _super.call(this, false) || this;
            _this._document = doc;
            _this._tone = tone;
            _this._oldPins = tone.pins;
            _this._newPins = [];
            _this._oldNotes = tone.notes;
            _this._newNotes = [];
            var maxPitch = (doc.channel == 3 ? beepbox.Music.drumCount - 1 : beepbox.Music.maxPitch);
            for (var i = 0; i < _this._oldNotes.length; i++) {
                var note = _this._oldNotes[i];
                if (upward) {
                    for (var j = note + 1; j <= maxPitch; j++) {
                        if (doc.channel == 3 || beepbox.Music.scaleFlags[doc.song.scale][j % 12] == true) {
                            note = j;
                            break;
                        }
                    }
                }
                else {
                    for (var j = note - 1; j >= 0; j--) {
                        if (doc.channel == 3 || beepbox.Music.scaleFlags[doc.song.scale][j % 12] == true) {
                            note = j;
                            break;
                        }
                    }
                }
                var foundMatch = false;
                for (var j = 0; j < _this._newNotes.length; j++) {
                    if (_this._newNotes[j] == note) {
                        foundMatch = true;
                        break;
                    }
                }
                if (!foundMatch)
                    _this._newNotes.push(note);
            }
            var min = 0;
            var max = maxPitch;
            for (var i = 1; i < _this._newNotes.length; i++) {
                var diff = _this._newNotes[0] - _this._newNotes[i];
                if (min < diff)
                    min = diff;
                if (max > diff + maxPitch)
                    max = diff + maxPitch;
            }
            for (var _i = 0, _a = _this._oldPins; _i < _a.length; _i++) {
                var oldPin = _a[_i];
                var interval = oldPin.interval + _this._oldNotes[0];
                if (interval < min)
                    interval = min;
                if (interval > max)
                    interval = max;
                if (upward) {
                    for (var i = interval + 1; i <= max; i++) {
                        if (doc.channel == 3 || beepbox.Music.scaleFlags[doc.song.scale][i % 12] == true) {
                            interval = i;
                            break;
                        }
                    }
                }
                else {
                    for (var i = interval - 1; i >= min; i--) {
                        if (doc.channel == 3 || beepbox.Music.scaleFlags[doc.song.scale][i % 12] == true) {
                            interval = i;
                            break;
                        }
                    }
                }
                interval -= _this._newNotes[0];
                _this._newPins.push(new beepbox.TonePin(interval, oldPin.time, oldPin.volume));
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
        ChangeTransposeTone.prototype._doForwards = function () {
            this._tone.pins = this._newPins;
            this._tone.notes = this._newNotes;
            this._document.changed();
        };
        ChangeTransposeTone.prototype._doBackwards = function () {
            this._tone.pins = this._oldPins;
            this._tone.notes = this._oldNotes;
            this._document.changed();
        };
        return ChangeTransposeTone;
    }(Change));
    beepbox.ChangeTransposeTone = ChangeTransposeTone;
    var ChangeTranspose = (function (_super) {
        __extends(ChangeTranspose, _super);
        function ChangeTranspose(document, bar, upward) {
            var _this = _super.call(this) || this;
            for (var i = 0; i < bar.tones.length; i++) {
                _this.append(new ChangeTransposeTone(document, bar.tones[i], upward));
            }
            return _this;
        }
        return ChangeTranspose;
    }(ChangeSequence));
    beepbox.ChangeTranspose = ChangeTranspose;
    var ChangeVolume = (function (_super) {
        __extends(ChangeVolume, _super);
        function ChangeVolume(document, volume) {
            var _this = _super.call(this, false) || this;
            _this._document = document;
            _this._oldVolume = document.song.instrumentVolumes[document.channel][document.getCurrentInstrument()];
            _this._newVolume = volume;
            if (_this._oldVolume != _this._newVolume) {
                _this._didSomething();
                _this.redo();
            }
            return _this;
        }
        ChangeVolume.prototype._doForwards = function () {
            this._document.song.instrumentVolumes[this._document.channel][this._document.getCurrentInstrument()] = this._newVolume;
            this._document.changed();
        };
        ChangeVolume.prototype._doBackwards = function () {
            this._document.song.instrumentVolumes[this._document.channel][this._document.getCurrentInstrument()] = this._oldVolume;
            this._document.changed();
        };
        return ChangeVolume;
    }(Change));
    beepbox.ChangeVolume = ChangeVolume;
    var ChangeVolumeBend = (function (_super) {
        __extends(ChangeVolumeBend, _super);
        function ChangeVolumeBend(document, bar, tone, bendPart, bendVolume, bendInterval) {
            var _this = _super.call(this, false) || this;
            _this._document = document;
            _this._bar = bar;
            _this._tone = tone;
            _this._oldPins = tone.pins;
            _this._newPins = [];
            var inserted = false;
            for (var _i = 0, _a = tone.pins; _i < _a.length; _i++) {
                var pin = _a[_i];
                if (pin.time < bendPart) {
                    _this._newPins.push(pin);
                }
                else if (pin.time == bendPart) {
                    _this._newPins.push(new beepbox.TonePin(bendInterval, bendPart, bendVolume));
                    inserted = true;
                }
                else {
                    if (!inserted) {
                        _this._newPins.push(new beepbox.TonePin(bendInterval, bendPart, bendVolume));
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
            this._tone.pins = this._newPins;
            this._document.changed();
        };
        ChangeVolumeBend.prototype._doBackwards = function () {
            this._tone.pins = this._oldPins;
            this._document.changed();
        };
        return ChangeVolumeBend;
    }(Change));
    beepbox.ChangeVolumeBend = ChangeVolumeBend;
    var ChangeWave = (function (_super) {
        __extends(ChangeWave, _super);
        function ChangeWave(document, wave) {
            var _this = _super.call(this, false) || this;
            _this._document = document;
            _this._oldWave = document.song.instrumentWaves[document.channel][document.getCurrentInstrument()];
            _this._newWave = wave;
            if (_this._oldWave != _this._newWave) {
                _this._didSomething();
                _this.redo();
            }
            return _this;
        }
        ChangeWave.prototype._doForwards = function () {
            this._document.song.instrumentWaves[this._document.channel][this._document.getCurrentInstrument()] = this._newWave;
            this._document.changed();
        };
        ChangeWave.prototype._doBackwards = function () {
            this._document.song.instrumentWaves[this._document.channel][this._document.getCurrentInstrument()] = this._oldWave;
            this._document.changed();
        };
        return ChangeWave;
    }(Change));
    beepbox.ChangeWave = ChangeWave;
    var PatternCursor = (function () {
        function PatternCursor() {
            this.valid = false;
            this.prevTone = null;
            this.curTone = null;
            this.nextTone = null;
            this.note = 0;
            this.noteIndex = -1;
            this.curIndex = 0;
            this.start = 0;
            this.end = 0;
            this.part = 0;
            this.tonePart = 0;
            this.nearPinIndex = 0;
            this.pins = null;
        }
        return PatternCursor;
    }());
    beepbox.PatternCursor = PatternCursor;
})(beepbox || (beepbox = {}));
"use strict";
var beepbox;
(function (beepbox) {
    function PatternEditor(doc) {
        function prettyNumber(value) {
            return value.toFixed(2).replace(/\.?0*$/, "");
        }
        var container = document.getElementById("patternEditorContainer");
        var svgNS = "http://www.w3.org/2000/svg";
        var svg = document.getElementById("patternEditorSvg");
        var svgPlayhead = document.getElementById("patternEditorPlayhead");
        var svgNoteContainer = document.getElementById("patternEditorNoteContainer");
        var svgPreview = document.getElementById("patternEditorPreview");
        var svgNoteBackground = document.getElementById("patternEditorNoteBackground");
        var svgDrumBackground = document.getElementById("patternEditorDrumBackground");
        var svgBackground = document.getElementById("patternEditorBackground");
        var editorWidth;
        var editorHeight = 481;
        var partWidth;
        var noteHeight;
        var noteCount;
        var mouseX;
        var mouseY;
        var mouseDown = false;
        var mouseOver = false;
        var mouseDragging = false;
        var mouseHorizontal = false;
        var defaultPinChannels = [
            [new beepbox.TonePin(0, 0, 3), new beepbox.TonePin(0, 2, 3)],
            [new beepbox.TonePin(0, 0, 3), new beepbox.TonePin(0, 2, 3)],
            [new beepbox.TonePin(0, 0, 3), new beepbox.TonePin(0, 2, 3)],
            [new beepbox.TonePin(0, 0, 3), new beepbox.TonePin(0, 2, 0)],
        ];
        var copiedPinChannels = defaultPinChannels.concat();
        var copiedPins;
        var mouseXStart = 0;
        var mouseYStart = 0;
        var mouseXPrev = 0;
        var mouseYPrev = 0;
        var dragChange = null;
        var cursor = new beepbox.PatternCursor();
        var pattern;
        var playheadX = 0.0;
        var octaveOffset = 0;
        var defaultNoteHeight = 13;
        var defaultDrumHeight = 40;
        var backgroundNoteRows = [];
        for (var i = 0; i < 12; i++) {
            var y = (12 - i) % 12;
            var rectangle = document.createElementNS(svgNS, "rect");
            rectangle.setAttribute("x", "1");
            rectangle.setAttribute("y", "" + (y * defaultNoteHeight + 1));
            rectangle.setAttribute("height", "" + (defaultNoteHeight - 2));
            svgNoteBackground.appendChild(rectangle);
            backgroundNoteRows[i] = rectangle;
        }
        var backgroundDrumRow = document.createElementNS(svgNS, "rect");
        backgroundDrumRow.setAttribute("x", "1");
        backgroundDrumRow.setAttribute("y", "1");
        backgroundDrumRow.setAttribute("height", "" + (defaultDrumHeight - 2));
        backgroundDrumRow.setAttribute("fill", "#444444");
        svgDrumBackground.appendChild(backgroundDrumRow);
        function updateCursorStatus() {
            if (pattern == null)
                return;
            cursor = new beepbox.PatternCursor();
            if (mouseX < 0 || mouseX > editorWidth || mouseY < 0 || mouseY > editorHeight)
                return;
            cursor.part = Math.floor(Math.max(0, Math.min(doc.song.beats * doc.song.parts - 1, mouseX / partWidth)));
            for (var _i = 0, _a = pattern.tones; _i < _a.length; _i++) {
                var tone = _a[_i];
                if (tone.end <= cursor.part) {
                    cursor.prevTone = tone;
                    cursor.curIndex++;
                }
                else if (tone.start <= cursor.part && tone.end > cursor.part) {
                    cursor.curTone = tone;
                }
                else if (tone.start > cursor.part) {
                    cursor.nextTone = tone;
                    break;
                }
            }
            var mousePitch = findMousePitch(mouseY);
            if (cursor.curTone != null) {
                cursor.start = cursor.curTone.start;
                cursor.end = cursor.curTone.end;
                cursor.pins = cursor.curTone.pins;
                var interval = void 0;
                var error = void 0;
                var prevPin = void 0;
                var nextPin = cursor.curTone.pins[0];
                for (var j = 1; j < cursor.curTone.pins.length; j++) {
                    prevPin = nextPin;
                    nextPin = cursor.curTone.pins[j];
                    var leftSide = partWidth * (cursor.curTone.start + prevPin.time);
                    var rightSide = partWidth * (cursor.curTone.start + nextPin.time);
                    if (mouseX > rightSide)
                        continue;
                    if (mouseX < leftSide)
                        throw new Error();
                    var intervalRatio = (mouseX - leftSide) / (rightSide - leftSide);
                    var arc = Math.sqrt(1.0 / Math.sqrt(4.0) - Math.pow(intervalRatio - 0.5, 2.0)) - 0.5;
                    var bendHeight = Math.abs(nextPin.interval - prevPin.interval);
                    interval = prevPin.interval * (1.0 - intervalRatio) + nextPin.interval * intervalRatio;
                    error = arc * bendHeight + 1.0;
                    break;
                }
                var minInterval = Number.MAX_VALUE;
                var maxInterval = -Number.MAX_VALUE;
                var bestDistance = Number.MAX_VALUE;
                for (var _b = 0, _c = cursor.curTone.pins; _b < _c.length; _b++) {
                    var pin = _c[_b];
                    if (minInterval > pin.interval)
                        minInterval = pin.interval;
                    if (maxInterval < pin.interval)
                        maxInterval = pin.interval;
                    var pinDistance = Math.abs(cursor.curTone.start + pin.time - mouseX / partWidth);
                    if (bestDistance > pinDistance) {
                        bestDistance = pinDistance;
                        cursor.nearPinIndex = cursor.curTone.pins.indexOf(pin);
                    }
                }
                mousePitch -= interval;
                cursor.note = snapToNote(mousePitch, -minInterval, (doc.channel == 3 ? beepbox.Music.drumCount - 1 : beepbox.Music.maxPitch) - maxInterval);
                var nearest = error;
                for (var i = 0; i < cursor.curTone.notes.length; i++) {
                    var distance = Math.abs(cursor.curTone.notes[i] - mousePitch + 0.5);
                    if (distance > nearest)
                        continue;
                    nearest = distance;
                    cursor.note = cursor.curTone.notes[i];
                }
                for (var i = 0; i < cursor.curTone.notes.length; i++) {
                    if (cursor.curTone.notes[i] == cursor.note) {
                        cursor.noteIndex = i;
                        break;
                    }
                }
            }
            else {
                cursor.note = snapToNote(mousePitch, 0, beepbox.Music.maxPitch);
                var defaultLength = copiedPins[copiedPins.length - 1].time;
                var quadBeats = Math.floor(cursor.part / doc.song.parts);
                var modLength = defaultLength % doc.song.parts;
                var modMouse = cursor.part % doc.song.parts;
                if (defaultLength == 1) {
                    cursor.start = cursor.part;
                }
                else if (modLength == 0) {
                    cursor.start = quadBeats * doc.song.parts;
                    if (doc.song.parts >> 1 == doc.song.parts / 2 && modMouse > doc.song.parts / 2 && defaultLength == doc.song.parts) {
                        cursor.start += doc.song.parts / 2;
                    }
                }
                else {
                    cursor.start = quadBeats * doc.song.parts;
                    if (modLength == doc.song.parts / 2) {
                        if (modMouse >= doc.song.parts / 2) {
                            cursor.start += doc.song.parts - modLength;
                        }
                    }
                    else {
                        if (modMouse > doc.song.parts / 2) {
                            cursor.start += doc.song.parts - modLength;
                        }
                    }
                }
                cursor.end = cursor.start + defaultLength;
                var forceStart = 0;
                var forceEnd = doc.song.beats * doc.song.parts;
                if (cursor.prevTone != null) {
                    forceStart = cursor.prevTone.end;
                }
                if (cursor.nextTone != null) {
                    forceEnd = cursor.nextTone.start;
                }
                if (cursor.start < forceStart) {
                    cursor.start = forceStart;
                    cursor.end = cursor.start + defaultLength;
                    if (cursor.end > forceEnd) {
                        cursor.end = forceEnd;
                    }
                }
                else if (cursor.end > forceEnd) {
                    cursor.end = forceEnd;
                    cursor.start = cursor.end - defaultLength;
                    if (cursor.start < forceStart) {
                        cursor.start = forceStart;
                    }
                }
                if (cursor.end - cursor.start == defaultLength) {
                    cursor.pins = copiedPins;
                }
                else {
                    cursor.pins = [];
                    for (var _d = 0, copiedPins_1 = copiedPins; _d < copiedPins_1.length; _d++) {
                        var oldPin = copiedPins_1[_d];
                        if (oldPin.time <= cursor.end - cursor.start) {
                            cursor.pins.push(new beepbox.TonePin(0, oldPin.time, oldPin.volume));
                            if (oldPin.time == cursor.end - cursor.start)
                                break;
                        }
                        else {
                            cursor.pins.push(new beepbox.TonePin(0, cursor.end - cursor.start, oldPin.volume));
                            break;
                        }
                    }
                }
            }
            cursor.valid = true;
        }
        function findMousePitch(pixelY) {
            return Math.max(0, Math.min(noteCount - 1, noteCount - (pixelY / noteHeight))) + octaveOffset;
        }
        function snapToNote(guess, min, max) {
            if (guess < min)
                guess = min;
            if (guess > max)
                guess = max;
            var scale = beepbox.Music.scaleFlags[doc.song.scale];
            if (scale[Math.floor(guess) % 12] || doc.channel == 3) {
                return Math.floor(guess);
            }
            else {
                var topNote = Math.floor(guess) + 1;
                var bottomNote = Math.floor(guess) - 1;
                while (scale[topNote % 12] == false) {
                    topNote++;
                }
                while (scale[(bottomNote) % 12] == false) {
                    bottomNote--;
                }
                if (topNote > max) {
                    if (bottomNote < min) {
                        return min;
                    }
                    else {
                        return bottomNote;
                    }
                }
                else if (bottomNote < min) {
                    return topNote;
                }
                var topRange = topNote;
                var bottomRange = bottomNote + 1;
                if (topNote % 12 == 0 || topNote % 12 == 7) {
                    topRange -= 0.5;
                }
                if (bottomNote % 12 == 0 || bottomNote % 12 == 7) {
                    bottomRange += 0.5;
                }
                return guess - bottomRange > topRange - guess ? topNote : bottomNote;
            }
        }
        function copyPins(tone) {
            copiedPins = [];
            for (var _i = 0, _a = tone.pins; _i < _a.length; _i++) {
                var oldPin = _a[_i];
                copiedPins.push(new beepbox.TonePin(0, oldPin.time, oldPin.volume));
            }
            for (var i = 1; i < copiedPins.length - 1;) {
                if (copiedPins[i - 1].volume == copiedPins[i].volume &&
                    copiedPins[i].volume == copiedPins[i + 1].volume) {
                    copiedPins.splice(i, 1);
                }
                else {
                    i++;
                }
            }
            copiedPinChannels[doc.channel] = copiedPins;
        }
        this.resetCopiedPins = (function () {
            copiedPinChannels = defaultPinChannels.concat();
        });
        function onEnterFrame(timestamp) {
            if (!doc.synth.playing || pattern == null || doc.song.getPattern(doc.channel, Math.floor(doc.synth.playhead)) != pattern) {
                svgPlayhead.setAttribute("visibility", "hidden");
            }
            else {
                svgPlayhead.setAttribute("visibility", "visible");
                var modPlayhead = doc.synth.playhead - Math.floor(doc.synth.playhead);
                if (Math.abs(modPlayhead - playheadX) > 0.1) {
                    playheadX = modPlayhead;
                }
                else {
                    playheadX += (modPlayhead - playheadX) * 0.2;
                }
                svgPlayhead.setAttribute("x", "" + prettyNumber(playheadX * editorWidth - 2));
            }
            window.requestAnimationFrame(onEnterFrame);
        }
        function onMouseOver(event) {
            mouseOver = true;
        }
        function onMouseOut(event) {
            mouseOver = false;
        }
        function onMousePressed(event) {
            event.preventDefault();
            if (pattern == null)
                return;
            mouseDown = true;
            mouseXStart = mouseX;
            mouseYStart = mouseY;
            mouseXPrev = mouseX;
            mouseYPrev = mouseY;
            updateCursorStatus();
            updatePreview();
        }
        function onTouchPressed(event) {
            event.preventDefault();
            if (pattern == null)
                return;
            mouseDown = true;
            var boundingRect = svg.getBoundingClientRect();
            mouseX = event.touches[0].clientX - boundingRect.left;
            mouseY = event.touches[0].clientY - boundingRect.top;
            mouseXStart = mouseX;
            mouseYStart = mouseY;
            mouseXPrev = mouseX;
            mouseYPrev = mouseY;
            updateCursorStatus();
            updatePreview();
        }
        function onMouseMoved(event) {
            var boundingRect = svg.getBoundingClientRect();
            mouseX = (event.clientX || event.pageX) - boundingRect.left;
            mouseY = (event.clientY || event.pageY) - boundingRect.top;
            onCursorMoved();
        }
        function onTouchMoved(event) {
            if (!mouseDown)
                return;
            event.preventDefault();
            var boundingRect = svg.getBoundingClientRect();
            mouseX = event.touches[0].clientX - boundingRect.left;
            mouseY = event.touches[0].clientY - boundingRect.top;
            onCursorMoved();
        }
        function onCursorMoved() {
            var start;
            var end;
            if (pattern == null)
                return;
            if (mouseDown && cursor.valid) {
                if (!mouseDragging) {
                    var dx = mouseX - mouseXStart;
                    var dy = mouseY - mouseYStart;
                    if (Math.sqrt(dx * dx + dy * dy) > 5) {
                        mouseDragging = true;
                        mouseHorizontal = Math.abs(dx) >= Math.abs(dy);
                    }
                }
                if (mouseDragging) {
                    if (dragChange != null) {
                        dragChange.undo();
                        dragChange = null;
                    }
                    var currentPart = Math.floor(mouseX / partWidth);
                    var sequence = new beepbox.ChangeSequence();
                    if (cursor.curTone == null) {
                        var backwards = void 0;
                        var directLength = void 0;
                        if (currentPart < cursor.start) {
                            backwards = true;
                            directLength = cursor.start - currentPart;
                        }
                        else {
                            backwards = false;
                            directLength = currentPart - cursor.start + 1;
                        }
                        var defaultLength = 1;
                        for (var i_1 = 0; i_1 <= doc.song.beats * doc.song.parts; i_1++) {
                            if (i_1 >= 5 &&
                                i_1 % doc.song.parts != 0 &&
                                i_1 != doc.song.parts * 3.0 / 2.0 &&
                                i_1 != doc.song.parts * 4.0 / 3.0 &&
                                i_1 != doc.song.parts * 5.0 / 3.0) {
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
                        if (defaultLength < directLength) {
                        }
                        if (backwards) {
                            end = cursor.start;
                            start = end - defaultLength;
                        }
                        else {
                            start = cursor.start;
                            end = start + defaultLength;
                        }
                        if (start < 0)
                            start = 0;
                        if (end > doc.song.beats * doc.song.parts)
                            end = doc.song.beats * doc.song.parts;
                        sequence.append(new beepbox.ChangeToneTruncate(doc, pattern, start, end));
                        var i = void 0;
                        for (i = 0; i < pattern.tones.length; i++) {
                            if (pattern.tones[i].start >= end)
                                break;
                        }
                        var theTone = new beepbox.Tone(cursor.note, start, end, 3, doc.channel == 3);
                        sequence.append(new beepbox.ChangeToneAdded(doc, pattern, theTone, i));
                        copyPins(theTone);
                    }
                    else if (mouseHorizontal) {
                        var shift = Math.round((mouseX - mouseXStart) / partWidth);
                        var shiftedPin = cursor.curTone.pins[cursor.nearPinIndex];
                        var shiftedTime = cursor.curTone.start + shiftedPin.time + shift;
                        if (shiftedTime < 0)
                            shiftedTime = 0;
                        if (shiftedTime > doc.song.beats * doc.song.parts)
                            shiftedTime = doc.song.beats * doc.song.parts;
                        if (shiftedTime <= cursor.curTone.start && cursor.nearPinIndex == cursor.curTone.pins.length - 1 ||
                            shiftedTime >= cursor.curTone.end && cursor.nearPinIndex == 0) {
                            sequence.append(new beepbox.ChangeToneAdded(doc, pattern, cursor.curTone, cursor.curIndex, true));
                        }
                        else {
                            start = Math.min(cursor.curTone.start, shiftedTime);
                            end = Math.max(cursor.curTone.end, shiftedTime);
                            sequence.append(new beepbox.ChangeToneTruncate(doc, pattern, start, end, cursor.curTone));
                            sequence.append(new beepbox.ChangePinTime(doc, cursor.curTone, cursor.nearPinIndex, shiftedTime));
                            copyPins(cursor.curTone);
                        }
                    }
                    else if (cursor.noteIndex == -1) {
                        var bendPart = Math.round(Math.max(cursor.curTone.start, Math.min(cursor.curTone.end, mouseX / partWidth))) - cursor.curTone.start;
                        var prevPin = void 0;
                        var nextPin = cursor.curTone.pins[0];
                        var bendVolume = void 0;
                        var bendInterval = void 0;
                        for (var i = 1; i < cursor.curTone.pins.length; i++) {
                            prevPin = nextPin;
                            nextPin = cursor.curTone.pins[i];
                            if (bendPart > nextPin.time)
                                continue;
                            if (bendPart < prevPin.time)
                                throw new Error();
                            var volumeRatio = (bendPart - prevPin.time) / (nextPin.time - prevPin.time);
                            bendVolume = Math.round(prevPin.volume * (1.0 - volumeRatio) + nextPin.volume * volumeRatio + ((mouseYStart - mouseY) / 25.0));
                            if (bendVolume < 0)
                                bendVolume = 0;
                            if (bendVolume > 3)
                                bendVolume = 3;
                            bendInterval = snapToNote(prevPin.interval * (1.0 - volumeRatio) + nextPin.interval * volumeRatio + cursor.curTone.notes[0], 0, beepbox.Music.maxPitch) - cursor.curTone.notes[0];
                            break;
                        }
                        sequence.append(new beepbox.ChangeVolumeBend(doc, pattern, cursor.curTone, bendPart, bendVolume, bendInterval));
                        copyPins(cursor.curTone);
                    }
                    else {
                        var bendStart = void 0;
                        var bendEnd = void 0;
                        if (mouseX >= mouseXStart) {
                            bendStart = cursor.part;
                            bendEnd = currentPart + 1;
                        }
                        else {
                            bendStart = cursor.part + 1;
                            bendEnd = currentPart;
                        }
                        if (bendEnd < 0)
                            bendEnd = 0;
                        if (bendEnd > doc.song.beats * doc.song.parts)
                            bendEnd = doc.song.beats * doc.song.parts;
                        if (bendEnd > cursor.curTone.end) {
                            sequence.append(new beepbox.ChangeToneTruncate(doc, pattern, cursor.curTone.start, bendEnd, cursor.curTone));
                        }
                        if (bendEnd < cursor.curTone.start) {
                            sequence.append(new beepbox.ChangeToneTruncate(doc, pattern, bendEnd, cursor.curTone.end, cursor.curTone));
                        }
                        var minNote = Number.MAX_VALUE;
                        var maxNote = -Number.MAX_VALUE;
                        for (var _i = 0, _a = cursor.curTone.notes; _i < _a.length; _i++) {
                            var note = _a[_i];
                            if (minNote > note)
                                minNote = note;
                            if (maxNote < note)
                                maxNote = note;
                        }
                        minNote -= cursor.curTone.notes[0];
                        maxNote -= cursor.curTone.notes[0];
                        var bendTo = snapToNote(findMousePitch(mouseY), -minNote, beepbox.Music.maxPitch - maxNote);
                        sequence.append(new beepbox.ChangePitchBend(doc, cursor.curTone, bendStart, bendEnd, bendTo, cursor.noteIndex));
                        copyPins(cursor.curTone);
                    }
                    dragChange = sequence;
                }
                mouseXPrev = mouseX;
                mouseYPrev = mouseY;
            }
            else {
                updateCursorStatus();
                updatePreview();
            }
        }
        function onCursorReleased(event) {
            if (!cursor.valid)
                return;
            if (pattern == null)
                return;
            if (mouseDragging) {
                if (dragChange != null) {
                    doc.history.record(dragChange);
                    dragChange = null;
                }
            }
            else if (mouseDown) {
                if (cursor.curTone == null) {
                    var tone = new beepbox.Tone(cursor.note, cursor.start, cursor.end, 3, doc.channel == 3);
                    tone.pins = [];
                    for (var _i = 0, _a = cursor.pins; _i < _a.length; _i++) {
                        var oldPin = _a[_i];
                        tone.pins.push(new beepbox.TonePin(0, oldPin.time, oldPin.volume));
                    }
                    doc.history.record(new beepbox.ChangeToneAdded(doc, pattern, tone, cursor.curIndex));
                }
                else {
                    if (cursor.noteIndex == -1) {
                        var sequence = new beepbox.ChangeSequence();
                        if (cursor.curTone.notes.length == 4) {
                            sequence.append(new beepbox.ChangeNoteAdded(doc, pattern, cursor.curTone, cursor.curTone.notes[0], 0, true));
                        }
                        sequence.append(new beepbox.ChangeNoteAdded(doc, pattern, cursor.curTone, cursor.note, cursor.curTone.notes.length));
                        doc.history.record(sequence);
                        copyPins(cursor.curTone);
                    }
                    else {
                        if (cursor.curTone.notes.length == 1) {
                            doc.history.record(new beepbox.ChangeToneAdded(doc, pattern, cursor.curTone, cursor.curIndex, true));
                        }
                        else {
                            doc.history.record(new beepbox.ChangeNoteAdded(doc, pattern, cursor.curTone, cursor.note, cursor.curTone.notes.indexOf(cursor.note), true));
                        }
                    }
                }
            }
            mouseDown = false;
            mouseDragging = false;
            updateCursorStatus();
            updatePreview();
        }
        function updatePreview() {
            if (!mouseOver || mouseDown || !cursor.valid || pattern == null) {
                svgPreview.setAttribute("visibility", "hidden");
            }
            else {
                svgPreview.setAttribute("visibility", "visible");
                drawNote(svgPreview, cursor.note, cursor.start, cursor.pins, noteHeight / 2 + 1, true, octaveOffset);
            }
        }
        function makeEmptyReplacementElement(node) {
            var clone = node.cloneNode(false);
            node.parentNode.replaceChild(clone, node);
            return clone;
        }
        function documentChanged() {
            editorWidth = doc.showLetters ? (doc.showScrollBar ? 460 : 480) : (doc.showScrollBar ? 492 : 512);
            pattern = doc.getCurrentPattern();
            partWidth = editorWidth / (doc.song.beats * doc.song.parts);
            noteHeight = doc.channel == 3 ? defaultDrumHeight : defaultNoteHeight;
            noteCount = doc.channel == 3 ? beepbox.Music.drumCount : beepbox.Music.noteCount;
            octaveOffset = doc.song.channelOctaves[doc.channel] * 12;
            copiedPins = copiedPinChannels[doc.channel];
            svg.setAttribute("width", "" + editorWidth);
            svgBackground.setAttribute("width", "" + editorWidth);
            svgNoteBackground.setAttribute("width", "" + (editorWidth / doc.song.beats));
            svgDrumBackground.setAttribute("width", "" + (editorWidth / doc.song.beats));
            if (!mouseDown)
                updateCursorStatus();
            svgNoteContainer = makeEmptyReplacementElement(svgNoteContainer);
            updatePreview();
            if (pattern == null) {
                svg.setAttribute("visibility", "hidden");
                return;
            }
            svg.setAttribute("visibility", "visible");
            for (var j = 0; j < 12; j++) {
                var color = "#444444";
                if (j == 0)
                    color = "#886644";
                if (j == 7 && doc.showFifth)
                    color = "#446688";
                var rectangle = backgroundNoteRows[j];
                rectangle.setAttribute("width", "" + (partWidth * doc.song.parts - 2));
                rectangle.setAttribute("fill", color);
                rectangle.setAttribute("visibility", beepbox.Music.scaleFlags[doc.song.scale][j] ? "visible" : "hidden");
            }
            backgroundDrumRow.setAttribute("width", "" + (partWidth * doc.song.parts - 2));
            if (doc.channel == 3) {
                svgBackground.setAttribute("fill", "url(#patternEditorDrumBackground)");
                svgBackground.setAttribute("height", "" + (defaultDrumHeight * beepbox.Music.drumCount));
                svg.setAttribute("height", "" + (defaultDrumHeight * beepbox.Music.drumCount));
            }
            else {
                svgBackground.setAttribute("fill", "url(#patternEditorNoteBackground)");
                svgBackground.setAttribute("height", "" + editorHeight);
                svg.setAttribute("height", "" + editorHeight);
            }
            if (doc.channel != 3 && doc.showChannels) {
                for (var channel = 2; channel >= 0; channel--) {
                    if (channel == doc.channel)
                        continue;
                    var pattern2 = doc.song.getPattern(channel, doc.bar);
                    if (pattern2 == null)
                        continue;
                    for (var _i = 0, _a = pattern2.tones; _i < _a.length; _i++) {
                        var tone = _a[_i];
                        for (var _b = 0, _c = tone.notes; _b < _c.length; _b++) {
                            var note = _c[_b];
                            var notePath = document.createElementNS(svgNS, "path");
                            notePath.setAttribute("fill", beepbox.SongEditor.noteColorsDim[channel]);
                            notePath.setAttribute("pointer-events", "none");
                            drawNote(notePath, note, tone.start, tone.pins, noteHeight / 2 - 4, false, doc.song.channelOctaves[channel] * 12);
                            svgNoteContainer.appendChild(notePath);
                        }
                    }
                }
            }
            for (var _d = 0, _e = pattern.tones; _d < _e.length; _d++) {
                var tone = _e[_d];
                for (var _f = 0, _g = tone.notes; _f < _g.length; _f++) {
                    var note = _g[_f];
                    var notePath = document.createElementNS(svgNS, "path");
                    notePath.setAttribute("fill", beepbox.SongEditor.noteColorsDim[doc.channel]);
                    notePath.setAttribute("pointer-events", "none");
                    drawNote(notePath, note, tone.start, tone.pins, noteHeight / 2 + 1, false, octaveOffset);
                    svgNoteContainer.appendChild(notePath);
                    notePath = document.createElementNS(svgNS, "path");
                    notePath.setAttribute("fill", beepbox.SongEditor.noteColorsBright[doc.channel]);
                    notePath.setAttribute("pointer-events", "none");
                    drawNote(notePath, note, tone.start, tone.pins, noteHeight / 2 + 1, true, octaveOffset);
                    svgNoteContainer.appendChild(notePath);
                }
            }
        }
        function drawNote(svgElement, note, start, pins, radius, showVolume, offset) {
            var nextPin = pins[0];
            var pathString = "M " + prettyNumber(partWidth * (start + nextPin.time) + 1) + " " + prettyNumber(noteToPixelHeight(note - offset) + radius * (showVolume ? nextPin.volume / 3.0 : 1.0)) + " ";
            for (var i = 1; i < pins.length; i++) {
                var prevPin = nextPin;
                nextPin = pins[i];
                var prevSide = partWidth * (start + prevPin.time) + (i == 1 ? 1 : 0);
                var nextSide = partWidth * (start + nextPin.time) - (i == pins.length - 1 ? 1 : 0);
                var prevHeight = noteToPixelHeight(note + prevPin.interval - offset);
                var nextHeight = noteToPixelHeight(note + nextPin.interval - offset);
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
                var prevSide = partWidth * (start + prevPin.time) - (i == pins.length - 2 ? 1 : 0);
                var nextSide = partWidth * (start + nextPin.time) + (i == 0 ? 1 : 0);
                var prevHeight = noteToPixelHeight(note + prevPin.interval - offset);
                var nextHeight = noteToPixelHeight(note + nextPin.interval - offset);
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
        }
        function noteToPixelHeight(note) {
            return noteHeight * (noteCount - (note) - 0.5);
        }
        doc.watch(documentChanged);
        documentChanged();
        updateCursorStatus();
        updatePreview();
        window.requestAnimationFrame(onEnterFrame);
        svg.addEventListener("mousedown", onMousePressed);
        document.addEventListener("mousemove", onMouseMoved);
        document.addEventListener("mouseup", onCursorReleased);
        svg.addEventListener("mouseover", onMouseOver);
        svg.addEventListener("mouseout", onMouseOut);
        svg.addEventListener("touchstart", onTouchPressed);
        document.addEventListener("touchmove", onTouchMoved);
        document.addEventListener("touchend", onCursorReleased);
        document.addEventListener("touchcancel", onCursorReleased);
    }
    beepbox.PatternEditor = PatternEditor;
})(beepbox || (beepbox = {}));
"use strict";
var beepbox;
(function (beepbox) {
    function TrackEditor(doc, songEditor) {
        var barWidth = 32;
        var mouseX;
        var mouseY;
        var mainLayer = document.getElementById("mainLayer");
        var container = document.getElementById("trackEditorContainer");
        var canvas = document.getElementById("trackEditor");
        var graphics = canvas.getContext("2d");
        var playhead = document.getElementById("trackPlayhead");
        var preview = document.getElementById("trackEditorPreview");
        var previewGraphics = preview.getContext("2d");
        var pattern;
        var mouseOver = false;
        var digits = "";
        var editorWidth = 512;
        var editorHeight = 128;
        var channelHeight = 32;
        function onEnterFrame(timestamp) {
            playhead.style.left = (barWidth * (doc.synth.playhead - doc.barScrollPos) - 2) + "px";
            window.requestAnimationFrame(onEnterFrame);
        }
        function setChannelBar(channel, bar) {
            var oldBarScrollPos = doc.barScrollPos;
            if (doc.history.getRecentChange() instanceof beepbox.ChangeChannelBar)
                doc.history.undo();
            doc.barScrollPos = oldBarScrollPos;
            doc.history.record(new beepbox.ChangeChannelBar(doc, channel, bar));
            digits = "";
        }
        function setBarPattern(pattern) {
            if (doc.history.getRecentChange() instanceof beepbox.ChangeBarPattern)
                doc.history.undo();
            doc.history.record(new beepbox.ChangeBarPattern(doc, pattern));
        }
        function onKeyPressed(event) {
            if (songEditor.promptVisible)
                return;
            switch (event.keyCode) {
                case 38:
                    setChannelBar((doc.channel + 3) % beepbox.Music.numChannels, doc.bar);
                    event.preventDefault();
                    break;
                case 40:
                    setChannelBar((doc.channel + 1) % beepbox.Music.numChannels, doc.bar);
                    event.preventDefault();
                    break;
                case 37:
                    setChannelBar(doc.channel, (doc.bar + doc.song.bars - 1) % doc.song.bars);
                    event.preventDefault();
                    break;
                case 39:
                    setChannelBar(doc.channel, (doc.bar + 1) % doc.song.bars);
                    event.preventDefault();
                    break;
                case 48:
                    nextDigit("0");
                    event.preventDefault();
                    break;
                case 49:
                    nextDigit("1");
                    event.preventDefault();
                    break;
                case 50:
                    nextDigit("2");
                    event.preventDefault();
                    break;
                case 51:
                    nextDigit("3");
                    event.preventDefault();
                    break;
                case 52:
                    nextDigit("4");
                    event.preventDefault();
                    break;
                case 53:
                    nextDigit("5");
                    event.preventDefault();
                    break;
                case 54:
                    nextDigit("6");
                    event.preventDefault();
                    break;
                case 55:
                    nextDigit("7");
                    event.preventDefault();
                    break;
                case 56:
                    nextDigit("8");
                    event.preventDefault();
                    break;
                case 57:
                    nextDigit("9");
                    event.preventDefault();
                    break;
                default:
                    digits = "";
                    break;
            }
        }
        function nextDigit(digit) {
            digits += digit;
            var parsed = parseInt(digits);
            if (parsed <= doc.song.patterns) {
                setBarPattern(parsed);
                return;
            }
            digits = digit;
            parsed = parseInt(digits);
            if (parsed <= doc.song.patterns) {
                setBarPattern(parsed);
                return;
            }
            digits = "";
        }
        function onKeyReleased(event) {
        }
        function onMouseOver(event) {
            mouseOver = true;
        }
        function onMouseOut(event) {
            mouseOver = false;
        }
        function onMousePressed(event) {
            event.preventDefault();
            var channel = Math.floor(Math.min(beepbox.Music.numChannels - 1, Math.max(0, mouseY / channelHeight)));
            var bar = Math.floor(Math.min(doc.song.bars - 1, Math.max(0, mouseX / barWidth + doc.barScrollPos)));
            if (doc.channel == channel && doc.bar == bar) {
                var up = (mouseY % channelHeight) < channelHeight / 2;
                var patternCount = doc.song.channelPatterns[channel].length;
                setBarPattern((doc.song.channelBars[channel][bar] + (up ? 1 : patternCount)) % (patternCount + 1));
            }
            else {
                setChannelBar(channel, bar);
            }
        }
        function onMouseMoved(event) {
            var boundingRect = canvas.getBoundingClientRect();
            mouseX = (event.clientX || event.pageX) - boundingRect.left;
            mouseY = (event.clientY || event.pageY) - boundingRect.top;
            updatePreview();
        }
        function onMouseReleased(event) {
        }
        function updatePreview() {
            previewGraphics.clearRect(0, 0, 34, 34);
            if (!mouseOver)
                return;
            var channel = Math.floor(Math.min(beepbox.Music.numChannels - 1, Math.max(0, mouseY / channelHeight)));
            var bar = Math.floor(Math.min(doc.song.bars - 1, Math.max(0, mouseX / barWidth + doc.barScrollPos)));
            preview.style.left = barWidth * (bar - doc.barScrollPos) + "px";
            preview.style.top = channelHeight * channel + "px";
            var selected = (bar == doc.bar && channel == doc.channel);
            if (selected) {
                var up = (mouseY % channelHeight) < channelHeight / 2;
                var center = barWidth * 0.8;
                var middle = channelHeight * 0.5;
                var base = channelHeight * 0.1;
                var tip = channelHeight * 0.4;
                var width = channelHeight * 0.175;
                previewGraphics.lineWidth = 1;
                previewGraphics.strokeStyle = "#000000";
                previewGraphics.fillStyle = up ? "#ffffff" : "#000000";
                previewGraphics.beginPath();
                previewGraphics.moveTo(center, middle - tip);
                previewGraphics.lineTo(center + width, middle - base);
                previewGraphics.lineTo(center - width, middle - base);
                previewGraphics.lineTo(center, middle - tip);
                previewGraphics.fill();
                previewGraphics.stroke();
                previewGraphics.fillStyle = !up ? "#ffffff" : "#000000";
                previewGraphics.beginPath();
                previewGraphics.moveTo(center, middle + tip);
                previewGraphics.lineTo(center + width, middle + base);
                previewGraphics.lineTo(center - width, middle + base);
                previewGraphics.lineTo(center, middle + tip);
                previewGraphics.fill();
                previewGraphics.stroke();
            }
            else {
                previewGraphics.lineWidth = 2;
                previewGraphics.strokeStyle = "#ffffff";
                previewGraphics.strokeRect(1, 1, barWidth - 2, channelHeight - 2);
            }
        }
        function documentChanged() {
            pattern = doc.getCurrentPattern();
            editorHeight = doc.song.bars > 16 ? 108 : 128;
            canvas.height = editorHeight;
            canvas.style.width = String(editorHeight);
            channelHeight = editorHeight / beepbox.Music.numChannels;
            render();
        }
        function render() {
            graphics.clearRect(0, 0, editorWidth, editorHeight);
            var renderCount = Math.min(16, doc.song.bars);
            for (var j = 0; j < beepbox.Music.numChannels; j++) {
                var channelColor = beepbox.SongEditor.channelColorsBright[j];
                var channelDim = beepbox.SongEditor.channelColorsDim[j];
                for (var i = 0; i < renderCount; i++) {
                    var pattern_1 = doc.song.getPattern(j, i + doc.barScrollPos);
                    var selected = (i + doc.barScrollPos == doc.bar && j == doc.channel);
                    if (selected || pattern_1 != null) {
                        graphics.fillStyle = (selected ? channelColor : "#444444");
                        graphics.fillRect(barWidth * i + 1, channelHeight * j + 1, barWidth - 2, channelHeight - 2);
                    }
                    var text = String(doc.song.channelBars[j][i + doc.barScrollPos]);
                    graphics.font = "bold 20px sans-serif";
                    graphics.textAlign = 'center';
                    graphics.textBaseline = 'middle';
                    graphics.fillStyle = selected ? "#000000" : (pattern_1 == null || pattern_1.tones.length == 0 ? channelDim : channelColor);
                    graphics.fillText(text, barWidth * (i + 0.5), channelHeight * (j + 0.5) + 1.0);
                }
            }
            updatePreview();
        }
        pattern = doc.getCurrentPattern();
        render();
        doc.watch(documentChanged);
        window.requestAnimationFrame(onEnterFrame);
        container.addEventListener("mousedown", onMousePressed);
        document.addEventListener("mousemove", onMouseMoved);
        document.addEventListener("mouseup", onMouseReleased);
        container.addEventListener("mouseover", onMouseOver);
        container.addEventListener("mouseout", onMouseOut);
        mainLayer.addEventListener("keydown", onKeyPressed);
        mainLayer.addEventListener("keyup", onKeyReleased);
    }
    beepbox.TrackEditor = TrackEditor;
})(beepbox || (beepbox = {}));
"use strict";
var beepbox;
(function (beepbox) {
    function LoopEditor(doc) {
        var barWidth = 32;
        var mouseX;
        var mouseY;
        var container = document.getElementById("loopEditorContainer");
        var canvas = document.getElementById("loopEditor");
        var graphics = canvas.getContext("2d");
        var preview = document.getElementById("loopEditorPreview");
        var previewGraphics = preview.getContext("2d");
        var editorWidth = 512;
        var editorHeight = 20;
        var startMode = 0;
        var endMode = 1;
        var bothMode = 2;
        var change;
        var cursor = {};
        var mouseDown = false;
        var mouseOver = false;
        function updateCursorStatus() {
            var bar = mouseX / barWidth + doc.barScrollPos;
            cursor.startBar = bar;
            if (bar > doc.song.loopStart - 0.25 && bar < doc.song.loopStart + doc.song.loopLength + 0.25) {
                if (bar - doc.song.loopStart < doc.song.loopLength * 0.5) {
                    cursor.mode = startMode;
                }
                else {
                    cursor.mode = endMode;
                }
            }
            else {
                cursor.mode = bothMode;
            }
        }
        function findEndPoints(middle) {
            var start = Math.round(middle - doc.song.loopLength / 2);
            var end = start + doc.song.loopLength;
            if (start < 0) {
                end -= start;
                start = 0;
            }
            if (end > doc.song.bars) {
                start -= end - doc.song.bars;
                end = doc.song.bars;
            }
            return { start: start, length: end - start };
        }
        function onKeyPressed(event) {
        }
        function onKeyReleased(event) {
        }
        function onMouseOver(event) {
            mouseOver = true;
        }
        function onMouseOut(event) {
            mouseOver = false;
        }
        function onMousePressed(event) {
            event.preventDefault();
            mouseDown = true;
            updateCursorStatus();
            updatePreview();
            onMouseMoved(event);
        }
        function onTouchPressed(event) {
            event.preventDefault();
            mouseDown = true;
            var boundingRect = canvas.getBoundingClientRect();
            mouseX = event.touches[0].clientX - boundingRect.left;
            mouseY = event.touches[0].clientY - boundingRect.top;
            updateCursorStatus();
            updatePreview();
            onTouchMoved(event);
        }
        function onMouseMoved(event) {
            var boundingRect = canvas.getBoundingClientRect();
            mouseX = (event.clientX || event.pageX) - boundingRect.left;
            mouseY = (event.clientY || event.pageY) - boundingRect.top;
            onCursorMoved();
        }
        function onTouchMoved(event) {
            if (!mouseDown)
                return;
            event.preventDefault();
            var boundingRect = canvas.getBoundingClientRect();
            mouseX = event.touches[0].clientX - boundingRect.left;
            mouseY = event.touches[0].clientY - boundingRect.top;
            onCursorMoved();
        }
        function onCursorMoved() {
            if (mouseDown) {
                if (change != null)
                    change.undo();
                change = null;
                var bar = mouseX / barWidth + doc.barScrollPos;
                var start = void 0;
                var end = void 0;
                var temp = void 0;
                if (cursor.mode == startMode) {
                    start = doc.song.loopStart + Math.round(bar - cursor.startBar);
                    end = doc.song.loopStart + doc.song.loopLength;
                    if (start == end) {
                        start = end - 1;
                    }
                    else if (start > end) {
                        temp = start;
                        start = end;
                        end = temp;
                    }
                    if (start < 0)
                        start = 0;
                    if (end >= doc.song.bars)
                        end = doc.song.bars;
                    change = new beepbox.ChangeLoop(doc, start, end - start);
                }
                else if (cursor.mode == endMode) {
                    start = doc.song.loopStart;
                    end = doc.song.loopStart + doc.song.loopLength + Math.round(bar - cursor.startBar);
                    if (end == start) {
                        end = start + 1;
                    }
                    else if (end < start) {
                        temp = start;
                        start = end;
                        end = temp;
                    }
                    if (start < 0)
                        start = 0;
                    if (end >= doc.song.bars)
                        end = doc.song.bars;
                    change = new beepbox.ChangeLoop(doc, start, end - start);
                }
                else if (cursor.mode == bothMode) {
                    var endPoints = findEndPoints(bar);
                    change = new beepbox.ChangeLoop(doc, endPoints.start, endPoints.length);
                }
            }
            else {
                updateCursorStatus();
                updatePreview();
            }
        }
        function onCursorReleased(event) {
            if (mouseDown) {
                if (change != null) {
                    doc.history.record(change);
                    change = null;
                }
            }
            mouseDown = false;
            updateCursorStatus();
            render();
        }
        function updatePreview() {
            previewGraphics.clearRect(0, 0, editorWidth, editorHeight);
            if (!mouseOver || mouseDown)
                return;
            var radius = editorHeight / 2;
            if (cursor.mode == startMode) {
                previewGraphics.fillStyle = "#ffffff";
                previewGraphics.beginPath();
                previewGraphics.arc((doc.song.loopStart - doc.barScrollPos) * barWidth + radius, radius, radius - 4, 0, 2 * Math.PI);
                previewGraphics.fill();
            }
            else if (cursor.mode == endMode) {
                previewGraphics.fillStyle = "#ffffff";
                previewGraphics.beginPath();
                previewGraphics.arc((doc.song.loopStart + doc.song.loopLength - doc.barScrollPos) * barWidth - radius, radius, radius - 4, 0, 2 * Math.PI);
                previewGraphics.fill();
            }
            else if (cursor.mode == bothMode) {
                var endPoints = findEndPoints(cursor.startBar);
                previewGraphics.fillStyle = "#ffffff";
                previewGraphics.beginPath();
                previewGraphics.arc((endPoints.start - doc.barScrollPos) * barWidth + radius, radius, radius - 4, 0, 2 * Math.PI);
                previewGraphics.fill();
                previewGraphics.fillStyle = "#ffffff";
                previewGraphics.fillRect((endPoints.start - doc.barScrollPos) * barWidth + radius, 4, endPoints.length * barWidth - editorHeight, editorHeight - 8);
                previewGraphics.fillStyle = "#ffffff";
                previewGraphics.beginPath();
                previewGraphics.arc((endPoints.start + endPoints.length - doc.barScrollPos) * barWidth - radius, radius, radius - 4, 0, 2 * Math.PI);
                previewGraphics.fill();
            }
        }
        function documentChanged() {
            render();
        }
        function render() {
            graphics.clearRect(0, 0, editorWidth, editorHeight);
            var radius = editorHeight / 2;
            graphics.fillStyle = "#7744ff";
            graphics.beginPath();
            graphics.arc((doc.song.loopStart - doc.barScrollPos) * barWidth + radius, radius, radius, 0, 2 * Math.PI);
            graphics.fill();
            graphics.fillRect((doc.song.loopStart - doc.barScrollPos) * barWidth + radius, 0, doc.song.loopLength * barWidth - editorHeight, editorHeight);
            graphics.beginPath();
            graphics.arc((doc.song.loopStart + doc.song.loopLength - doc.barScrollPos) * barWidth - radius, radius, radius, 0, 2 * Math.PI);
            graphics.fill();
            graphics.fillStyle = "#000000";
            graphics.beginPath();
            graphics.arc((doc.song.loopStart - doc.barScrollPos) * barWidth + radius, radius, radius - 4, 0, 2 * Math.PI);
            graphics.fill();
            graphics.fillRect((doc.song.loopStart - doc.barScrollPos) * barWidth + radius, 4, doc.song.loopLength * barWidth - editorHeight, editorHeight - 8);
            graphics.beginPath();
            graphics.arc((doc.song.loopStart + doc.song.loopLength - doc.barScrollPos) * barWidth - radius, radius, radius - 4, 0, 2 * Math.PI);
            graphics.fill();
            updatePreview();
        }
        updateCursorStatus();
        render();
        doc.watch(documentChanged);
        container.addEventListener("mousedown", onMousePressed);
        document.addEventListener("mousemove", onMouseMoved);
        document.addEventListener("mouseup", onCursorReleased);
        container.addEventListener("mouseover", onMouseOver);
        container.addEventListener("mouseout", onMouseOut);
        document.addEventListener("keydown", onKeyPressed);
        document.addEventListener("keyup", onKeyReleased);
        container.addEventListener("touchstart", onTouchPressed);
        document.addEventListener("touchmove", onTouchMoved);
        document.addEventListener("touchend", onCursorReleased);
        document.addEventListener("touchcancel", onCursorReleased);
    }
    beepbox.LoopEditor = LoopEditor;
})(beepbox || (beepbox = {}));
"use strict";
var beepbox;
(function (beepbox) {
    function BarScrollBar(doc) {
        var preview = document.getElementById("barScrollBarPreview");
        var previewGraphics = preview.getContext("2d");
        var mouseX;
        var mouseY;
        var container = document.getElementById("barScrollBarContainer");
        var canvas = document.getElementById("barScrollBar");
        var graphics = canvas.getContext("2d");
        var editorWidth = 512;
        var editorHeight = 20;
        var mouseDown = false;
        var mouseOver = false;
        var dragging = false;
        var dragStart;
        var barWidth;
        function onMouseOver(event) {
            mouseOver = true;
        }
        function onMouseOut(event) {
            mouseOver = false;
        }
        function onMousePressed(event) {
            event.preventDefault();
            mouseDown = true;
            updatePreview();
            if (mouseX >= doc.barScrollPos * barWidth && mouseX <= (doc.barScrollPos + 16) * barWidth) {
                dragging = true;
                dragStart = mouseX;
            }
        }
        function onTouchPressed(event) {
            event.preventDefault();
            mouseDown = true;
            var boundingRect = canvas.getBoundingClientRect();
            mouseX = event.touches[0].clientX - boundingRect.left;
            mouseY = event.touches[0].clientY - boundingRect.top;
            updatePreview();
            if (mouseX >= doc.barScrollPos * barWidth && mouseX <= (doc.barScrollPos + 16) * barWidth) {
                dragging = true;
                dragStart = mouseX;
            }
        }
        function onMouseMoved(event) {
            var boundingRect = canvas.getBoundingClientRect();
            mouseX = (event.clientX || event.pageX) - boundingRect.left;
            mouseY = (event.clientY || event.pageY) - boundingRect.top;
            onCursorMoved();
        }
        function onTouchMoved(event) {
            if (!mouseDown)
                return;
            event.preventDefault();
            var boundingRect = canvas.getBoundingClientRect();
            mouseX = event.touches[0].clientX - boundingRect.left;
            mouseY = event.touches[0].clientY - boundingRect.top;
            onCursorMoved();
        }
        function onCursorMoved() {
            if (dragging) {
                while (mouseX - dragStart < -barWidth * 0.5) {
                    if (doc.barScrollPos > 0) {
                        doc.barScrollPos--;
                        dragStart -= barWidth;
                        doc.changed();
                    }
                    else {
                        break;
                    }
                }
                while (mouseX - dragStart > barWidth * 0.5) {
                    if (doc.barScrollPos < doc.song.bars - 16) {
                        doc.barScrollPos++;
                        dragStart += barWidth;
                        doc.changed();
                    }
                    else {
                        break;
                    }
                }
            }
            updatePreview();
        }
        function onCursorReleased(event) {
            if (!dragging && mouseDown) {
                if (mouseX < (doc.barScrollPos + 8) * barWidth) {
                    if (doc.barScrollPos > 0)
                        doc.barScrollPos--;
                    doc.changed();
                }
                else {
                    if (doc.barScrollPos < doc.song.bars - 16)
                        doc.barScrollPos++;
                    doc.changed();
                }
            }
            mouseDown = false;
            dragging = false;
            updatePreview();
        }
        function updatePreview() {
            previewGraphics.clearRect(0, 0, editorWidth, editorHeight);
            if (!mouseOver || mouseDown)
                return;
            var center = editorHeight * 0.5;
            var base = 20;
            var tip = 9;
            var arrowHeight = 6;
            if (mouseX < doc.barScrollPos * barWidth) {
                previewGraphics.fillStyle = "#ffffff";
                previewGraphics.beginPath();
                previewGraphics.moveTo(tip, center);
                previewGraphics.lineTo(base, center + arrowHeight);
                previewGraphics.lineTo(base, center - arrowHeight);
                previewGraphics.lineTo(tip, center);
                previewGraphics.fill();
            }
            else if (mouseX > (doc.barScrollPos + 16) * barWidth) {
                previewGraphics.fillStyle = "#ffffff";
                previewGraphics.beginPath();
                previewGraphics.moveTo(editorWidth - tip, center);
                previewGraphics.lineTo(editorWidth - base, center + arrowHeight);
                previewGraphics.lineTo(editorWidth - base, center - arrowHeight);
                previewGraphics.lineTo(editorWidth - tip, center);
                previewGraphics.fill();
            }
            else {
                previewGraphics.lineWidth = 2;
                previewGraphics.strokeStyle = "#ffffff";
                previewGraphics.strokeRect(doc.barScrollPos * barWidth, 1, 16 * barWidth, editorHeight - 2);
            }
        }
        function documentChanged() {
            barWidth = (editorWidth - 1) / Math.max(16, doc.song.bars);
            render();
        }
        function render() {
            graphics.clearRect(0, 0, editorWidth, editorHeight);
            graphics.fillStyle = "#444444";
            graphics.fillRect(barWidth * doc.barScrollPos, 2, barWidth * 16, editorHeight - 4);
            for (var i = 0; i <= doc.song.bars; i++) {
                var lineWidth = (i % 16 == 0) ? 2 : 0;
                var lineHeight = (i % 16 == 0) ? 0 : ((i % 4 == 0) ? editorHeight / 8 : editorHeight / 3);
                graphics.beginPath();
                graphics.strokeStyle = "#444444";
                graphics.lineWidth = lineWidth;
                graphics.moveTo(i * barWidth, lineHeight);
                graphics.lineTo(i * barWidth, editorHeight - lineHeight);
                graphics.stroke();
            }
            updatePreview();
        }
        doc.watch(documentChanged);
        documentChanged();
        container.addEventListener("mousedown", onMousePressed);
        document.addEventListener("mousemove", onMouseMoved);
        document.addEventListener("mouseup", onCursorReleased);
        container.addEventListener("mouseover", onMouseOver);
        container.addEventListener("mouseout", onMouseOut);
        container.addEventListener("touchstart", onTouchPressed);
        document.addEventListener("touchmove", onTouchMoved);
        document.addEventListener("touchend", onCursorReleased);
        document.addEventListener("touchcancel", onCursorReleased);
    }
    beepbox.BarScrollBar = BarScrollBar;
})(beepbox || (beepbox = {}));
"use strict";
var beepbox;
(function (beepbox) {
    function OctaveScrollBar(doc) {
        var preview = document.getElementById("octaveScrollBarPreview");
        var previewGraphics = preview.getContext("2d");
        var mouseX;
        var mouseY;
        var container = document.getElementById("octaveScrollBarContainer");
        var canvas = document.getElementById("octaveScrollBar");
        var graphics = canvas.getContext("2d");
        var editorWidth = 20;
        var editorHeight = 481;
        var mouseDown = false;
        var mouseOver = false;
        var rootHeight = 4.0;
        var octaveCount = 7;
        var octaveHeight;
        var barHeight;
        var dragging = false;
        var dragStart;
        var currentOctave;
        var barBottom;
        function onMouseOver(event) {
            mouseOver = true;
        }
        function onMouseOut(event) {
            mouseOver = false;
        }
        function onMousePressed(event) {
            event.preventDefault();
            mouseDown = true;
            if (doc.channel == 3)
                return;
            updatePreview();
            if (mouseY >= barBottom - barHeight && mouseY <= barBottom) {
                dragging = true;
                dragStart = mouseY;
            }
        }
        function onTouchPressed(event) {
            event.preventDefault();
            mouseDown = true;
            var boundingRect = canvas.getBoundingClientRect();
            mouseX = event.touches[0].clientX - boundingRect.left;
            mouseY = event.touches[0].clientY - boundingRect.top;
            if (doc.channel == 3)
                return;
            updatePreview();
            if (mouseY >= barBottom - barHeight && mouseY <= barBottom) {
                dragging = true;
                dragStart = mouseY;
            }
        }
        function onMouseMoved(event) {
            var boundingRect = canvas.getBoundingClientRect();
            mouseX = (event.clientX || event.pageX) - boundingRect.left;
            mouseY = (event.clientY || event.pageY) - boundingRect.top;
            onCursorMoved();
        }
        function onTouchMoved(event) {
            if (!mouseDown)
                return;
            event.preventDefault();
            var boundingRect = canvas.getBoundingClientRect();
            mouseX = event.touches[0].clientX - boundingRect.left;
            mouseY = event.touches[0].clientY - boundingRect.top;
            onCursorMoved();
        }
        function onCursorMoved() {
            if (doc.channel == 3)
                return;
            if (dragging) {
                while (mouseY - dragStart < -octaveHeight * 0.5) {
                    if (currentOctave < 4) {
                        doc.history.record(new beepbox.ChangeOctave(doc, currentOctave + 1));
                        dragStart -= octaveHeight;
                    }
                    else {
                        break;
                    }
                }
                while (mouseY - dragStart > octaveHeight * 0.5) {
                    if (currentOctave > 0) {
                        doc.history.record(new beepbox.ChangeOctave(doc, currentOctave - 1));
                        dragStart += octaveHeight;
                    }
                    else {
                        break;
                    }
                }
            }
            updatePreview();
        }
        function onCursorReleased(event) {
            if (doc.channel != 3 && !dragging && mouseDown) {
                if (mouseY < barBottom - barHeight * 0.5) {
                    if (currentOctave < 4)
                        doc.history.record(new beepbox.ChangeOctave(doc, currentOctave + 1));
                }
                else {
                    if (currentOctave > 0)
                        doc.history.record(new beepbox.ChangeOctave(doc, currentOctave - 1));
                }
            }
            mouseDown = false;
            dragging = false;
            updatePreview();
        }
        function updatePreview() {
            previewGraphics.clearRect(0, 0, editorWidth, editorHeight);
            if (doc.channel == 3)
                return;
            if (!mouseOver || mouseDown)
                return;
            var center = editorWidth * 0.5;
            var base = 20;
            var tip = 9;
            var arrowWidth = 6;
            if (mouseY < barBottom - barHeight) {
                previewGraphics.fillStyle = "#ffffff";
                previewGraphics.beginPath();
                previewGraphics.moveTo(center, tip);
                previewGraphics.lineTo(center + arrowWidth, base);
                previewGraphics.lineTo(center - arrowWidth, base);
                previewGraphics.lineTo(center, tip);
                previewGraphics.fill();
            }
            else if (mouseY > barBottom) {
                previewGraphics.fillStyle = "#ffffff";
                previewGraphics.beginPath();
                previewGraphics.moveTo(center, editorHeight - tip);
                previewGraphics.lineTo(center + arrowWidth, editorHeight - base);
                previewGraphics.lineTo(center - arrowWidth, editorHeight - base);
                previewGraphics.lineTo(center, editorHeight - tip);
                previewGraphics.fill();
            }
            else {
                previewGraphics.lineWidth = 2;
                previewGraphics.strokeStyle = "#ffffff";
                previewGraphics.strokeRect(1, barBottom, editorWidth - 2, -barHeight);
            }
        }
        function documentChanged() {
            currentOctave = doc.song.channelOctaves[doc.channel];
            barBottom = editorHeight - (octaveHeight * currentOctave);
            render();
        }
        function render() {
            graphics.clearRect(0, 0, editorWidth, editorHeight);
            if (doc.channel != 3) {
                graphics.fillStyle = "#444444";
                graphics.fillRect(2, barBottom, editorWidth - 4, -barHeight);
                for (var i = 0; i <= octaveCount; i++) {
                    graphics.fillStyle = "#886644";
                    graphics.fillRect(0, i * octaveHeight, editorWidth, rootHeight);
                }
            }
            updatePreview();
        }
        doc.watch(documentChanged);
        documentChanged();
        octaveHeight = (editorHeight - rootHeight) / octaveCount;
        barHeight = (octaveHeight * 3 + rootHeight);
        container.addEventListener("mousedown", onMousePressed);
        document.addEventListener("mousemove", onMouseMoved);
        document.addEventListener("mouseup", onCursorReleased);
        container.addEventListener("mouseover", onMouseOver);
        container.addEventListener("mouseout", onMouseOut);
        container.addEventListener("touchstart", onTouchPressed);
        document.addEventListener("touchmove", onTouchMoved);
        document.addEventListener("touchend", onCursorReleased);
        document.addEventListener("touchcancel", onCursorReleased);
    }
    beepbox.OctaveScrollBar = OctaveScrollBar;
})(beepbox || (beepbox = {}));
"use strict";
var beepbox;
(function (beepbox) {
    function Piano(doc) {
        var noteHeight;
        var noteCount;
        var loadedCount = 0;
        function onLoaded() {
            loadedCount++;
            if (loadedCount == 5)
                render();
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
        var mouseX;
        var mouseY;
        var container = document.getElementById("pianoContainer");
        var canvas = document.getElementById("piano");
        var graphics = canvas.getContext("2d");
        var preview = document.getElementById("pianoPreview");
        var previewGraphics = preview.getContext("2d");
        var editorWidth = 32;
        var editorHeight = 481;
        var mouseDown = false;
        var mouseOver = false;
        var cursorNote;
        function updateCursorNote() {
            var scale = beepbox.Music.scaleFlags[doc.song.scale];
            var mouseNote = Math.max(0, Math.min(noteCount - 1, noteCount - (mouseY / noteHeight)));
            if (scale[Math.floor(mouseNote) % 12] || doc.channel == 3) {
                cursorNote = Math.floor(mouseNote);
            }
            else {
                var topNote = Math.floor(mouseNote) + 1;
                var bottomNote = Math.floor(mouseNote) - 1;
                while (scale[topNote % 12] == false) {
                    topNote++;
                }
                while (scale[(bottomNote) % 12] == false) {
                    bottomNote--;
                }
                var topRange = topNote;
                var bottomRange = bottomNote + 1;
                if (topNote % 12 == 0 || topNote % 12 == 7) {
                    topRange -= 0.5;
                }
                if (bottomNote % 12 == 0 || bottomNote % 12 == 7) {
                    bottomRange += 0.5;
                }
                cursorNote = mouseNote - bottomRange > topRange - mouseNote ? topNote : bottomNote;
            }
        }
        function onMouseOver(event) {
            mouseOver = true;
        }
        function onMouseOut(event) {
            mouseOver = false;
        }
        function onMousePressed(event) {
            event.preventDefault();
            mouseDown = true;
            doc.synth.pianoPressed = true;
            updatePreview();
        }
        function onMouseMoved(event) {
            var boundingRect = canvas.getBoundingClientRect();
            mouseX = (event.clientX || event.pageX) - boundingRect.left;
            mouseY = (event.clientY || event.pageY) - boundingRect.top;
            updateCursorNote();
            doc.synth.pianoNote = cursorNote + doc.song.channelOctaves[doc.channel] * 12;
            updatePreview();
        }
        function onMouseReleased(event) {
            mouseDown = false;
            doc.synth.pianoPressed = false;
            updatePreview();
        }
        function updatePreview() {
            previewGraphics.clearRect(0, 0, 32, 40);
            if (!mouseOver || mouseDown)
                return;
            preview.style.left = "0px";
            preview.style.top = noteHeight * (noteCount - cursorNote - 1) + "px";
            previewGraphics.lineWidth = 2;
            previewGraphics.strokeStyle = "#ffffff";
            previewGraphics.strokeRect(1, 1, editorWidth - 2, noteHeight - 2);
        }
        function documentChanged() {
            noteHeight = doc.channel == 3 ? 40 : 13;
            noteCount = doc.channel == 3 ? beepbox.Music.drumCount : beepbox.Music.noteCount;
            updateCursorNote();
            doc.synth.pianoNote = cursorNote + doc.song.channelOctaves[doc.channel] * 12;
            doc.synth.pianoChannel = doc.channel;
            render();
        }
        function render() {
            if (loadedCount < 5)
                return;
            graphics.clearRect(0, 0, editorWidth, editorHeight);
            if (!doc.showLetters)
                return;
            var key;
            for (var j = 0; j < noteCount; j++) {
                var noteNameIndex = (j + beepbox.Music.keyTransposes[doc.song.key]) % 12;
                if (doc.channel == 3) {
                    key = Drum;
                    var scale = 1.0 - (j / noteCount) * 0.35;
                    var offset = (1.0 - scale) * 0.5;
                    var x = key.width * offset;
                    var y = key.height * offset + noteHeight * (noteCount - j - 1);
                    var w = key.width * scale;
                    var h = key.height * scale;
                    graphics.drawImage(key, x, y, w, h);
                    var brightness = 1.0 + ((j - noteCount / 2.0) / noteCount) * 0.5;
                    var imageData = graphics.getImageData(x, y, w, h);
                    var data = imageData.data;
                    for (var i = 0; i < data.length; i += 4) {
                        data[i + 0] *= brightness;
                        data[i + 1] *= brightness;
                        data[i + 2] *= brightness;
                    }
                    graphics.putImageData(imageData, x, y);
                }
                else if (beepbox.Music.scaleFlags[doc.song.scale][j % 12] == false) {
                    key = beepbox.Music.pianoScaleFlags[noteNameIndex] ? WhiteKeyDisabled : BlackKeyDisabled;
                    graphics.drawImage(key, 0, noteHeight * (noteCount - j - 1));
                }
                else {
                    var text = beepbox.Music.noteNames[noteNameIndex];
                    if (text == null) {
                        var shiftDir = beepbox.Music.blackKeyNameParents[j % 12];
                        text = beepbox.Music.noteNames[(noteNameIndex + 12 + shiftDir) % 12];
                        if (shiftDir == 1) {
                            text += "♭";
                        }
                        else if (shiftDir == -1) {
                            text += "♯";
                        }
                    }
                    var textColor = beepbox.Music.pianoScaleFlags[noteNameIndex] ? "#000000" : "#ffffff";
                    key = beepbox.Music.pianoScaleFlags[noteNameIndex] ? WhiteKey : BlackKey;
                    graphics.drawImage(key, 0, noteHeight * (noteCount - j - 1));
                    graphics.font = "bold 11px sans-serif";
                    graphics.fillStyle = textColor;
                    graphics.fillText(text, 15, noteHeight * (noteCount - j) - 3);
                }
            }
            updatePreview();
        }
        doc.watch(documentChanged);
        documentChanged();
        container.addEventListener("mousedown", onMousePressed);
        document.addEventListener("mousemove", onMouseMoved);
        document.addEventListener("mouseup", onMouseReleased);
        container.addEventListener("mouseover", onMouseOver);
        container.addEventListener("mouseout", onMouseOut);
    }
    beepbox.Piano = Piano;
})(beepbox || (beepbox = {}));
"use strict";
var beepbox;
(function (beepbox) {
    function SongDurationPrompt(doc, songEditor) {
        var container = document.getElementById("songSizePrompt");
        var beatsStepper = document.getElementById("beatsStepper");
        var barsStepper = document.getElementById("barsStepper");
        var patternsStepper = document.getElementById("patternsStepper");
        var instrumentsStepper = document.getElementById("instrumentsStepper");
        var songDurationOkayButton = document.getElementById("songDurationOkayButton");
        var songDurationCancelButton = document.getElementById("songDurationCancelButton");
        function onClose() {
            container.style.display = "none";
            songEditor.closePrompt();
            songDurationOkayButton.removeEventListener("click", saveChanges);
            songDurationCancelButton.removeEventListener("click", onClose);
            beatsStepper.removeEventListener("keypress", validateKey);
            barsStepper.removeEventListener("keypress", validateKey);
            patternsStepper.removeEventListener("keypress", validateKey);
            instrumentsStepper.removeEventListener("keypress", validateKey);
            beatsStepper.removeEventListener("blur", validateNumber);
            barsStepper.removeEventListener("blur", validateNumber);
            patternsStepper.removeEventListener("blur", validateNumber);
            instrumentsStepper.removeEventListener("blur", validateNumber);
        }
        function validateKey(event) {
            var charCode = (event.which) ? event.which : event.keyCode;
            if (charCode != 46 && charCode > 31 && (charCode < 48 || charCode > 57)) {
                event.preventDefault();
                return true;
            }
            return false;
        }
        function validateNumber(event) {
            var input = event.target;
            input.value = Math.floor(Math.max(Number(input.min), Math.min(Number(input.max), Number(input.value)))) + "";
        }
        function validate(input) {
            return Math.floor(Number(input.value));
        }
        function saveChanges() {
            var sequence = new beepbox.ChangeSequence();
            sequence.append(new beepbox.ChangeBeats(doc, validate(beatsStepper)));
            sequence.append(new beepbox.ChangeBars(doc, validate(barsStepper)));
            sequence.append(new beepbox.ChangePatterns(doc, validate(patternsStepper)));
            sequence.append(new beepbox.ChangeInstruments(doc, validate(instrumentsStepper)));
            doc.history.record(sequence);
            onClose();
        }
        beatsStepper.value = doc.song.beats + "";
        beatsStepper.min = beepbox.Music.beatsMin + "";
        beatsStepper.max = beepbox.Music.beatsMax + "";
        barsStepper.value = doc.song.bars + "";
        barsStepper.min = beepbox.Music.barsMin + "";
        barsStepper.max = beepbox.Music.barsMax + "";
        patternsStepper.value = doc.song.patterns + "";
        patternsStepper.min = beepbox.Music.patternsMin + "";
        patternsStepper.max = beepbox.Music.patternsMax + "";
        instrumentsStepper.value = doc.song.instruments + "";
        instrumentsStepper.min = beepbox.Music.instrumentsMin + "";
        instrumentsStepper.max = beepbox.Music.instrumentsMax + "";
        songDurationOkayButton.addEventListener("click", saveChanges);
        songDurationCancelButton.addEventListener("click", onClose);
        beatsStepper.addEventListener("keypress", validateKey);
        barsStepper.addEventListener("keypress", validateKey);
        patternsStepper.addEventListener("keypress", validateKey);
        instrumentsStepper.addEventListener("keypress", validateKey);
        beatsStepper.addEventListener("blur", validateNumber);
        barsStepper.addEventListener("blur", validateNumber);
        patternsStepper.addEventListener("blur", validateNumber);
        instrumentsStepper.addEventListener("blur", validateNumber);
        container.style.display = "block";
    }
    beepbox.SongDurationPrompt = SongDurationPrompt;
})(beepbox || (beepbox = {}));
"use strict";
var beepbox;
(function (beepbox) {
    var button = beepbox.html.button, div = beepbox.html.div, input = beepbox.html.input, text = beepbox.html.text;
    if (!ArrayBuffer.transfer) {
        ArrayBuffer.transfer = function (source, length) {
            source = Object(source);
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
    function ExportPrompt(doc, songEditor) {
        var enableIntro = input({ type: "checkbox" });
        var loopDropDown = input({ style: "width: 40px; height: 16px;", type: "number", min: "1", max: "4", step: "1" });
        var enableOutro = input({ type: "checkbox" });
        var exportWavButton = button({ style: "width:200px;", type: "button" }, [text("Export to .wav")]);
        var exportMidiButton = button({ style: "width:200px;", type: "button" }, [text("Export to .midi")]);
        var exportCancelButton = button({ style: "width:200px;", type: "button" }, [text("Cancel")]);
        var container = div({ style: "position: absolute;" }, [
            div({ style: "display: table-cell; vertical-align: middle; width: 700px; height: 645px;" }, [
                div({ style: "margin: auto; text-align: center; background: #000000; width: 200px; border-radius: 15px; border: 4px solid #444444; color: #ffffff; font-size: 12px; padding: 20px;" }, [
                    div({ style: "font-size: 30px" }, [text("Export Options")]),
                    div({ style: "height: 30px;" }),
                    div({ style: "display: table; width: 200px;" }, [
                        div({ style: "display: table-row;" }, [
                            div({ style: "display: table-cell;" }, [text("Intro:")]),
                            div({ style: "display: table-cell;" }, [text("Loop Count:")]),
                            div({ style: "display: table-cell;" }, [text("Outro:")]),
                        ]),
                        div({ style: "display: table-row; height: 30px;" }, [
                            div({ style: "display: table-cell; vertical-align: middle;" }, [enableIntro]),
                            div({ style: "display: table-cell; vertical-align: middle;" }, [loopDropDown]),
                            div({ style: "display: table-cell; vertical-align: middle;" }, [enableOutro]),
                        ]),
                    ]),
                    div({ style: "height: 20px;" }),
                    exportWavButton,
                    div({ style: "height: 20px;" }),
                    exportMidiButton,
                    div({ style: "height: 20px;" }),
                    exportCancelButton,
                ]),
            ]),
        ]);
        beepboxEditorContainer.children[0].appendChild(container);
        function onClose() {
            beepboxEditorContainer.children[0].removeChild(container);
            songEditor.closePrompt();
            loopDropDown.removeEventListener("keypress", validateKey);
            loopDropDown.removeEventListener("blur", validateNumber);
            exportWavButton.removeEventListener("click", onExportToWav);
            exportMidiButton.removeEventListener("click", onExportToMidi);
            exportCancelButton.removeEventListener("click", onClose);
        }
        function validateKey(event) {
            var charCode = (event.which) ? event.which : event.keyCode;
            if (charCode != 46 && charCode > 31 && (charCode < 48 || charCode > 57)) {
                event.preventDefault();
                return true;
            }
            return false;
        }
        function validateNumber(event) {
            var input = event.target;
            input.value = Math.floor(Math.max(Number(input.min), Math.min(Number(input.max), Number(input.value)))) + "";
        }
        function onExportToWav() {
            var synth = new beepbox.Synth(doc.song);
            synth.enableIntro = enableIntro.checked;
            synth.enableOutro = enableOutro.checked;
            synth.loopCount = Number(loopDropDown.value);
            if (!synth.enableIntro) {
                for (var introIter = 0; introIter < doc.song.loopStart; introIter++) {
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
            saveAs(blob, "song.wav");
            onClose();
        }
        function onExportToMidi() {
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
            var ticksPerBeat = 96;
            var ticksPerPart = ticksPerBeat / doc.song.parts;
            var ticksPerArpeggio = ticksPerPart / 4;
            var secondsPerMinute = 60;
            var microsecondsPerMinute = secondsPerMinute * 1000000;
            var beatsPerMinute = doc.song.getBeatsPerMinute();
            var microsecondsPerBeat = Math.round(microsecondsPerMinute / beatsPerMinute);
            var secondsPerTick = secondsPerMinute / (ticksPerBeat * beatsPerMinute);
            var ticksPerBar = ticksPerBeat * doc.song.beats;
            var unrolledBars = [];
            if (enableIntro.checked) {
                for (var bar = 0; bar < doc.song.loopStart; bar++) {
                    unrolledBars.push(bar);
                }
            }
            for (var loopIndex = 0; loopIndex < Number(loopDropDown.value); loopIndex++) {
                for (var bar = doc.song.loopStart; bar < doc.song.loopStart + doc.song.loopLength; bar++) {
                    unrolledBars.push(bar);
                }
            }
            if (enableIntro.checked) {
                for (var bar = doc.song.loopStart + doc.song.loopLength; bar < doc.song.bars; bar++) {
                    unrolledBars.push(bar);
                }
            }
            var tracks = [
                { isMeta: true, channel: -1, midiChannel: -1, isChorus: false, isDrums: false },
                { isMeta: false, channel: 0, midiChannel: 0, isChorus: false, isDrums: false },
                { isMeta: false, channel: 0, midiChannel: 1, isChorus: true, isDrums: false },
                { isMeta: false, channel: 1, midiChannel: 2, isChorus: false, isDrums: false },
                { isMeta: false, channel: 1, midiChannel: 3, isChorus: true, isDrums: false },
                { isMeta: false, channel: 2, midiChannel: 4, isChorus: false, isDrums: false },
                { isMeta: false, channel: 2, midiChannel: 5, isChorus: true, isDrums: false },
                { isMeta: false, channel: 3, midiChannel: 6, isChorus: false, isDrums: true },
            ];
            writeUint32(0x4D546864);
            writeUint32(6);
            writeUint16(1);
            writeUint16(tracks.length);
            writeUint16(ticksPerBeat);
            var _loop_2 = function (track) {
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
                    writeAscii("http://www.beepbox.co/" + doc.song.toString());
                    writeEventTime(0);
                    writeUint24(0xFF5103);
                    writeUint24(microsecondsPerBeat);
                    writeEventTime(0);
                    writeUint24(0xFF5804);
                    writeUint8(doc.song.beats);
                    writeUint8(2);
                    writeUint8(24);
                    writeUint8(8);
                    var isMinor = (doc.song.scale < 10) && ((doc.song.scale & 1) == 1);
                    var key = 11 - doc.song.key;
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
                    if (enableIntro.checked)
                        barStartTime += ticksPerBar * doc.song.loopStart;
                    writeEventTime(barStartTime);
                    writeUint16(0xFF06);
                    writeAscii("Loop Start");
                    for (var loopIndex = 0; loopIndex < Number(loopDropDown.value); loopIndex++) {
                        barStartTime += ticksPerBar * doc.song.loopLength;
                        writeEventTime(barStartTime);
                        writeUint16(0xFF06);
                        writeAscii(loopIndex < Number(loopDropDown.value) - 1 ? "Loop Repeat" : "Loop End");
                    }
                    if (enableOutro.checked)
                        barStartTime += ticksPerBar * (doc.song.bars - doc.song.loopStart - doc.song.loopLength);
                    if (barStartTime != ticksPerBar * unrolledBars.length)
                        throw new Error("Miscalculated number of bars.");
                }
                else {
                    var channelName = ["blue channel", "yellow channel", "orange channel", "gray channel"][channel];
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
                    var channelRoot = isDrums ? 33 : beepbox.Music.keyTransposes[doc.song.key];
                    var intervalScale = isDrums ? beepbox.Music.drumInterval : 1;
                    for (var _i = 0, unrolledBars_1 = unrolledBars; _i < unrolledBars_1.length; _i++) {
                        var bar = unrolledBars_1[_i];
                        var pattern = doc.song.getPattern(channel, bar);
                        if (pattern != null) {
                            var nextInstrument = pattern.instrument;
                            if (isChorus && doc.song.instrumentChorus[channel][nextInstrument] == 0) {
                                barStartTime += ticksPerBar;
                                continue;
                            }
                            if (prevInstrument != nextInstrument) {
                                prevInstrument = nextInstrument;
                                writeEventTime(barStartTime);
                                writeUint16(0xFF04);
                                if (isDrums) {
                                    var description = "noise: " + beepbox.Music.drumNames[doc.song.instrumentWaves[channel][nextInstrument]];
                                    description += ", volume: " + beepbox.Music.volumeNames[doc.song.instrumentVolumes[channel][nextInstrument]];
                                    description += ", envelope: " + beepbox.Music.attackNames[doc.song.instrumentAttacks[channel][nextInstrument]];
                                    writeAscii(description);
                                    writeEventTime(barStartTime);
                                    writeUint8(0xC0 | midiChannel);
                                    writeFlagAnd7Bits(0, 0x7E);
                                }
                                else {
                                    var description = "wave: " + beepbox.Music.waveNames[doc.song.instrumentWaves[channel][nextInstrument]];
                                    description += ", volume: " + beepbox.Music.volumeNames[doc.song.instrumentVolumes[channel][nextInstrument]];
                                    description += ", envelope: " + beepbox.Music.attackNames[doc.song.instrumentAttacks[channel][nextInstrument]];
                                    description += ", filter: " + beepbox.Music.filterNames[doc.song.instrumentFilters[channel][nextInstrument]];
                                    description += ", chorus: " + beepbox.Music.chorusNames[doc.song.instrumentChorus[channel][nextInstrument]];
                                    description += ", effect: " + beepbox.Music.effectNames[doc.song.instrumentEffects[channel][nextInstrument]];
                                    writeAscii(description);
                                    var sustainInstruments = [
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
                                    var decayInstruments = [
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
                                    var filterInstruments = doc.song.instrumentFilters[channel][nextInstrument] < 3 ? sustainInstruments : decayInstruments;
                                    writeEventTime(barStartTime);
                                    writeUint8(0xC0 | midiChannel);
                                    writeFlagAnd7Bits(0, filterInstruments[doc.song.instrumentWaves[channel][nextInstrument]]);
                                }
                                var instrumentVolumeChoice = doc.song.instrumentVolumes[channel][nextInstrument];
                                var channelVolume = (5 - instrumentVolumeChoice) / 5;
                                writeEventTime(barStartTime);
                                writeUint8(0xB0 | midiChannel);
                                writeFlagAnd7Bits(0, 0x07);
                                writeFlagAnd7Bits(0, Math.round(0x7f * channelVolume));
                            }
                            var effectChoice = doc.song.instrumentEffects[channel][nextInstrument];
                            var effectVibrato = beepbox.Music.effectVibratos[effectChoice];
                            var effectTremelo = beepbox.Music.effectTremelos[effectChoice];
                            var effectDuration = 0.14;
                            var chorusOffset = beepbox.Music.chorusValues[doc.song.instrumentChorus[channel][nextInstrument]];
                            if (!isChorus)
                                chorusOffset *= -1;
                            chorusOffset += beepbox.Music.chorusOffsets[doc.song.instrumentChorus[channel][nextInstrument]];
                            for (var toneIndex = 0; toneIndex < pattern.tones.length; toneIndex++) {
                                var tone = pattern.tones[toneIndex];
                                var toneStartTime = barStartTime + tone.start * ticksPerPart;
                                var pinTime = toneStartTime;
                                var pinVolume = tone.pins[0].volume;
                                var pinInterval = tone.pins[0].interval;
                                var pitch = channelRoot + tone.notes[0] * intervalScale;
                                for (var pinIndex = 1; pinIndex < tone.pins.length; pinIndex++) {
                                    var nextPinTime = toneStartTime + tone.pins[pinIndex].time * ticksPerPart;
                                    var nextPinVolume = tone.pins[pinIndex].volume;
                                    var nextPinInterval = tone.pins[pinIndex].interval;
                                    var length_1 = nextPinTime - pinTime;
                                    for (var tick = 0; tick < length_1; tick++) {
                                        var tickTime = pinTime + tick;
                                        var linearVolume = beepbox.lerp(pinVolume, nextPinVolume, tick / length_1);
                                        var linearInterval = beepbox.lerp(pinInterval, nextPinInterval, tick / length_1);
                                        var arpeggio = Math.floor(tick / ticksPerArpeggio) % 4;
                                        var nextPitch = void 0;
                                        if (tone.notes.length == 2) {
                                            nextPitch = tone.notes[arpeggio >> 1];
                                        }
                                        else if (tone.notes.length == 3) {
                                            nextPitch = tone.notes[arpeggio == 3 ? 1 : arpeggio];
                                        }
                                        else if (tone.notes.length == 4) {
                                            nextPitch = tone.notes[arpeggio];
                                        }
                                        else {
                                            nextPitch = tone.notes[0];
                                        }
                                        var fractionalPitch = channelRoot + nextPitch * intervalScale + linearInterval + chorusOffset;
                                        nextPitch = Math.round(fractionalPitch);
                                        var pitchOffset = fractionalPitch - nextPitch;
                                        var effectCurve = Math.sin(Math.PI * 2.0 * (tickTime - barStartTime) * secondsPerTick / effectDuration);
                                        if (effectChoice != 2 || tickTime - toneStartTime >= 3 * ticksPerPart) {
                                            pitchOffset += effectVibrato * effectCurve;
                                        }
                                        var pitchBend = Math.max(0, Math.min(0x3fff, Math.round(0x2000 + 0x1000 * pitchOffset)));
                                        var volume = linearVolume / 3;
                                        var tremelo = 1.0 + effectTremelo * (effectCurve - 1.0);
                                        var expression = Math.round(0x7f * volume * tremelo);
                                        if (pitchBend != prevPitchBend) {
                                            writeEventTime(tickTime);
                                            writeUint8(0xE0 | midiChannel);
                                            writeFlagAnd7Bits(0, pitchBend & 0x7f);
                                            writeFlagAnd7Bits(0, (pitchBend >> 7) & 0x7f);
                                            prevPitchBend = pitchBend;
                                        }
                                        if (expression != prevExpression) {
                                            writeEventTime(tickTime);
                                            writeUint8(0xB0 | midiChannel);
                                            writeFlagAnd7Bits(0, 0x0B);
                                            writeFlagAnd7Bits(0, expression);
                                            prevExpression = expression;
                                        }
                                        if (tickTime == toneStartTime) {
                                            writeEventTime(tickTime);
                                            writeUint8(0x90 | midiChannel);
                                            writeFlagAnd7Bits(0, nextPitch);
                                            writeFlagAnd7Bits(0, 0x40);
                                        }
                                        else if (nextPitch != pitch) {
                                            writeEventTime(tickTime);
                                            writeUint8(0x90 | midiChannel);
                                            writeFlagAnd7Bits(0, nextPitch);
                                            writeFlagAnd7Bits(0, 0x40);
                                            writeEventTime(tickTime);
                                            writeUint8(0x80 | midiChannel);
                                            writeFlagAnd7Bits(0, pitch);
                                            writeFlagAnd7Bits(0, 0x40);
                                        }
                                        pitch = nextPitch;
                                    }
                                    pinTime = nextPinTime;
                                    pinVolume = nextPinVolume;
                                    pinInterval = nextPinInterval;
                                }
                                writeEventTime(barStartTime + tone.end * ticksPerPart);
                                writeUint8(0x80 | midiChannel);
                                writeFlagAnd7Bits(0, pitch);
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
                _loop_2(track);
            }
            arrayBuffer = ArrayBuffer.transfer(arrayBuffer, fileSize);
            var blob = new Blob([arrayBuffer], { type: "audio/midi" });
            saveAs(blob, "song.midi");
            onClose();
        }
        loopDropDown.value = "1";
        if (doc.song.loopStart == 0) {
            enableIntro.checked = false;
            enableIntro.disabled = true;
        }
        else {
            enableIntro.checked = true;
            enableIntro.disabled = false;
        }
        if (doc.song.loopStart + doc.song.loopLength == doc.song.bars) {
            enableOutro.checked = false;
            enableOutro.disabled = true;
        }
        else {
            enableOutro.checked = true;
            enableOutro.disabled = false;
        }
        loopDropDown.addEventListener("keypress", validateKey);
        loopDropDown.addEventListener("blur", validateNumber);
        exportWavButton.addEventListener("click", onExportToWav);
        exportMidiButton.addEventListener("click", onExportToMidi);
        exportCancelButton.addEventListener("click", onClose);
        container.style.display = "block";
    }
    beepbox.ExportPrompt = ExportPrompt;
})(beepbox || (beepbox = {}));
var saveAs = saveAs || function (e) {
    "use strict";
    if (typeof e === "undefined" || typeof navigator !== "undefined" && /MSIE [1-9]\./.test(navigator.userAgent)) {
        return;
    }
    var t = e.document, n = function () { return e.URL || e.webkitURL || e; }, r = t.createElementNS("http://www.w3.org/1999/xhtml", "a"), o = "download" in r, i = function (e) { var t = new MouseEvent("click"); e.dispatchEvent(t); }, a = /constructor/i.test(e.HTMLElement), f = /CriOS\/[\d]+/.test(navigator.userAgent), u = function (t) { (e.setImmediate || e.setTimeout)(function () { throw t; }, 0); }, d = "application/octet-stream", s = 1e3 * 40, c = function (e) { var t = function () { if (typeof e === "string") {
        n().revokeObjectURL(e);
    }
    else {
        e.remove();
    } }; setTimeout(t, s); }, l = function (e, t, n) { t = [].concat(t); var r = t.length; while (r--) {
        var o_1 = e["on" + t[r]];
        if (typeof o_1 === "function") {
            try {
                o_1.call(e, n || e);
            }
            catch (i) {
                u(i);
            }
        }
    } }, p = function (e) { if (/^\s*(?:text\/\S*|application\/xml|\S*\/\S*\+xml)\s*;.*charset\s*=\s*utf-8/i.test(e.type)) {
        return new Blob([String.fromCharCode(65279), e], { type: e.type });
    } return e; }, v = function (t, u, s) { if (!s) {
        t = p(t);
    } var v = this, w = t.type, m = w === d, y, h = function () { l(v, "writestart progress write writeend".split(" ")); }, S = function () { if ((f || m && a) && e.FileReader) {
        var r_1 = new FileReader;
        r_1.onloadend = function () { var t = f ? r_1.result : r_1.result.replace(/^data:[^;]*;/, "data:attachment/file;"); var n = e.open(t, "_blank"); if (!n)
            e.location.href = t; t = undefined; v.readyState = v.DONE; h(); };
        r_1.readAsDataURL(t);
        v.readyState = v.INIT;
        return;
    } if (!y) {
        y = n().createObjectURL(t);
    } if (m) {
        e.location.href = y;
    }
    else {
        var o_2 = e.open(y, "_blank");
        if (!o_2) {
            e.location.href = y;
        }
    } v.readyState = v.DONE; h(); c(y); }; v.readyState = v.INIT; if (o) {
        y = n().createObjectURL(t);
        setTimeout(function () { r.href = y; r.download = u; i(r); h(); c(y); v.readyState = v.DONE; });
        return;
    } S(); }, w = v.prototype, m = function (e, t, n) { return new v(e, t || e.name || "download", n); };
    if (typeof navigator !== "undefined" && navigator.msSaveOrOpenBlob) {
        return function (e, t, n) { t = t || e.name || "download"; if (!n) {
            e = p(e);
        } return navigator.msSaveOrOpenBlob(e, t); };
    }
    w.abort = function () { };
    w.readyState = w.INIT = 0;
    w.WRITING = 1;
    w.DONE = 2;
    w.error = w.onwritestart = w.onprogress = w.onwrite = w.onabort = w.onerror = w.onwriteend = null;
    return m;
}(typeof self !== "undefined" && self || typeof window !== "undefined" && window || this.content);
if (typeof module !== "undefined" && module.exports) {
    module.exports.saveAs = saveAs;
}
else if (typeof define !== "undefined" && define !== null && define.amd !== null) {
    define([], function () { return saveAs; });
}
"use strict";
var beepbox;
(function (beepbox) {
    beepbox.SongEditor = function (doc) {
        var _this = this;
        var width = 700;
        var height = 645;
        var patternEditor = new beepbox.PatternEditor(doc);
        var trackEditor = new beepbox.TrackEditor(doc, this);
        var loopEditor = new beepbox.LoopEditor(doc);
        var barScrollBar = new beepbox.BarScrollBar(doc);
        var octaveScrollBar = new beepbox.OctaveScrollBar(doc);
        var piano = new beepbox.Piano(doc);
        var copyTones;
        var copyBeats = 0;
        var copyParts = 0;
        var copyDrums = false;
        var wasPlaying;
        this.promptVisible = false;
        function BuildOptions(items) {
            var result = "";
            for (var i = 0; i < items.length; i++) {
                result = result + '<option value="' + items[i] + '">' + items[i] + '</option>';
            }
            return result;
        }
        function BuildOptionsWithTitle(items, title) {
            var result = "";
            result = result + '<option value="' + title + '" selected="selected" disabled="disabled">' + title + '</option>';
            for (var i = 0; i < items.length; i++) {
                result = result + '<option value="' + items[i][1] + '">' + items[i][0] + '</option>';
            }
            return result;
        }
        var promptBackground = document.getElementById("promptBackground");
        var editButton = document.getElementById("editButton");
        var optionsButton = document.getElementById("optionsButton");
        var mainLayer = document.getElementById("mainLayer");
        var editorBox = document.getElementById("editorBox");
        var patternContainerContainer = document.getElementById("patternContainerContainer");
        var patternEditorContainer = document.getElementById("patternEditorContainer");
        var pianoContainer = document.getElementById("pianoContainer");
        var octaveScrollBarContainer = document.getElementById("octaveScrollBarContainer");
        var trackEditorContainer = document.getElementById("trackEditorContainer");
        var barScrollBarContainer = document.getElementById("barScrollBarContainer");
        var playButton = document.getElementById("playButton");
        var exportButton = document.getElementById("exportButton");
        var volumeSlider = document.getElementById("volumeSlider");
        var filterDropDownGroup = document.getElementById("filterDropDownGroup");
        var chorusDropDownGroup = document.getElementById("chorusDropDownGroup");
        var effectDropDownGroup = document.getElementById("effectDropDownGroup");
        var patternSettingsLabel = document.getElementById("patternSettingsLabel");
        var instrumentDropDownGroup = document.getElementById("instrumentDropDownGroup");
        var scaleDropDown = document.getElementById("scaleDropDown");
        var keyDropDown = document.getElementById("keyDropDown");
        var tempoSlider = document.getElementById("tempoSlider");
        var partDropDown = document.getElementById("partDropDown");
        var instrumentDropDown = document.getElementById("instrumentDropDown");
        var channelVolumeSlider = document.getElementById("channelVolumeSlider");
        var waveDropDown = document.getElementById("waveDropDown");
        var attackDropDown = document.getElementById("attackDropDown");
        var filterDropDown = document.getElementById("filterDropDown");
        var chorusDropDown = document.getElementById("chorusDropDown");
        var effectDropDown = document.getElementById("effectDropDown");
        var editCommands = [
            ["Undo (Z)", "undo"],
            ["Redo (Y)", "redo"],
            ["Copy Pattern (C)", "copy"],
            ["Paste Pattern (V)", "paste"],
            ["Shift Notes Up (+)", "transposeUp"],
            ["Shift Notes Down (-)", "transposeDown"],
            ["Custom song size...", "duration"],
            ["Clean Slate", "clean"],
        ];
        editButton.innerHTML = BuildOptionsWithTitle(editCommands, "Edit Menu");
        scaleDropDown.innerHTML = BuildOptions(beepbox.Music.scaleNames);
        keyDropDown.innerHTML = BuildOptions(beepbox.Music.keyNames);
        partDropDown.innerHTML = BuildOptions(beepbox.Music.partNames);
        filterDropDown.innerHTML = BuildOptions(beepbox.Music.filterNames);
        attackDropDown.innerHTML = BuildOptions(beepbox.Music.attackNames);
        effectDropDown.innerHTML = BuildOptions(beepbox.Music.effectNames);
        chorusDropDown.innerHTML = BuildOptions(beepbox.Music.chorusNames);
        var waveNames = BuildOptions(beepbox.Music.waveNames);
        var drumNames = BuildOptions(beepbox.Music.drumNames);
        function setPrompt(newPrompt) {
            if (_this.promptVisible)
                return;
            wasPlaying = doc.synth.playing;
            if (wasPlaying)
                togglePlay();
            promptBackground.style.display = "block";
            new newPrompt(doc, _this);
            _this.promptVisible = true;
        }
        this.closePrompt = (function () {
            _this.promptVisible = false;
            promptBackground.style.display = "none";
            if (wasPlaying)
                togglePlay();
            mainLayer.focus();
        });
        function refocusStage(event) {
            mainLayer.focus();
        }
        function onUpdated() {
            var optionCommands = [
                [(doc.showLetters ? "✓ " : "") + "Show Piano", "showLetters"],
                [(doc.showFifth ? "✓ " : "") + "Highlight 'Fifth' Notes", "showFifth"],
                [(doc.showChannels ? "✓ " : "") + "Show All Channels", "showChannels"],
                [(doc.showScrollBar ? "✓ " : "") + "Octave Scroll Bar", "showScrollBar"],
            ];
            optionsButton.innerHTML = BuildOptionsWithTitle(optionCommands, "Preferences Menu");
            scaleDropDown.selectedIndex = doc.song.scale;
            keyDropDown.selectedIndex = doc.song.key;
            tempoSlider.value = "" + doc.song.tempo;
            partDropDown.selectedIndex = beepbox.Music.partCounts.indexOf(doc.song.parts);
            if (doc.channel == 3) {
                filterDropDownGroup.style.visibility = "hidden";
                chorusDropDownGroup.style.visibility = "hidden";
                effectDropDownGroup.style.visibility = "hidden";
                waveDropDown.innerHTML = drumNames;
            }
            else {
                filterDropDownGroup.style.visibility = "visible";
                chorusDropDownGroup.style.visibility = "visible";
                effectDropDownGroup.style.visibility = "visible";
                waveDropDown.innerHTML = waveNames;
            }
            var pattern = doc.getCurrentPattern();
            patternSettingsLabel.style.visibility = (doc.song.instruments > 1 && pattern != null) ? "visible" : "hidden";
            instrumentDropDownGroup.style.visibility = (doc.song.instruments > 1 && pattern != null) ? "visible" : "hidden";
            var instrumentList = [];
            for (var i = 0; i < doc.song.instruments; i++) {
                instrumentList.push(i + 1);
            }
            instrumentDropDown.innerHTML = BuildOptions(instrumentList);
            var instrument = doc.getCurrentInstrument();
            waveDropDown.selectedIndex = doc.song.instrumentWaves[doc.channel][instrument];
            filterDropDown.selectedIndex = doc.song.instrumentFilters[doc.channel][instrument];
            attackDropDown.selectedIndex = doc.song.instrumentAttacks[doc.channel][instrument];
            effectDropDown.selectedIndex = doc.song.instrumentEffects[doc.channel][instrument];
            chorusDropDown.selectedIndex = doc.song.instrumentChorus[doc.channel][instrument];
            channelVolumeSlider.value = -doc.song.instrumentVolumes[doc.channel][instrument] + "";
            instrumentDropDown.selectedIndex = instrument;
            pianoContainer.style.display = doc.showLetters ? "table-cell" : "none";
            octaveScrollBarContainer.style.display = doc.showScrollBar ? "table-cell" : "none";
            barScrollBarContainer.style.display = doc.song.bars > 16 ? "table-row" : "none";
            var patternWidth = 512;
            if (doc.showLetters)
                patternWidth -= 32;
            if (doc.showScrollBar)
                patternWidth -= 20;
            patternEditorContainer.style.width = String(patternWidth) + "px";
            var trackHeight = 128;
            if (doc.song.bars > 16)
                trackHeight -= 20;
            trackEditorContainer.style.height = String(trackHeight) + "px";
            volumeSlider.value = String(doc.volume);
            if (doc.synth.playing) {
                playButton.innerHTML = "Pause";
            }
            else {
                playButton.innerHTML = "Play";
            }
        }
        function onKeyPressed(event) {
            if (_this.promptVisible)
                return;
            switch (event.keyCode) {
                case 32:
                    togglePlay();
                    event.preventDefault();
                    break;
                case 90:
                    if (event.shiftKey) {
                        doc.history.redo();
                    }
                    else {
                        doc.history.undo();
                    }
                    event.preventDefault();
                    break;
                case 89:
                    doc.history.redo();
                    event.preventDefault();
                    break;
                case 67:
                    copy();
                    event.preventDefault();
                    break;
                case 86:
                    paste();
                    event.preventDefault();
                    break;
                case 219:
                    doc.synth.prevBar();
                    event.preventDefault();
                    break;
                case 221:
                    doc.synth.nextBar();
                    event.preventDefault();
                    break;
                case 71:
                    doc.synth.stutterPressed = true;
                    event.preventDefault();
                    break;
                case 189:
                case 173:
                    transpose(false);
                    event.preventDefault();
                    break;
                case 187:
                case 61:
                    transpose(true);
                    event.preventDefault();
                    break;
            }
        }
        function onKeyReleased(event) {
            switch (event.keyCode) {
                case 71:
                    doc.synth.stutterPressed = false;
                    break;
            }
        }
        function togglePlay() {
            if (doc.synth.playing) {
                doc.synth.pause();
                doc.synth.snapToBar();
                playButton.innerHTML = "Play";
            }
            else {
                doc.synth.play();
                playButton.innerHTML = "Pause";
            }
        }
        function setVolumeSlider() {
            doc.setVolume(Number(volumeSlider.value));
        }
        function copy() {
            var pattern = doc.getCurrentPattern();
            if (pattern == null)
                return;
            copyTones = pattern.cloneTones();
            copyBeats = doc.song.beats;
            copyParts = doc.song.parts;
            copyDrums = doc.channel == 3;
        }
        function paste() {
            if (!canPaste())
                return;
            doc.history.record(new beepbox.ChangePaste(doc, copyTones));
        }
        function canPaste() {
            return doc.getCurrentPattern() != null && copyTones != null && copyBeats == doc.song.beats && copyParts == doc.song.parts && copyDrums == (doc.channel == 3);
        }
        function cleanSlate() {
            doc.history.record(new beepbox.ChangeSong(doc, null));
            patternEditor.resetCopiedPins();
        }
        function transpose(upward) {
            var pattern = doc.getCurrentPattern();
            if (pattern == null)
                return;
            doc.history.record(new beepbox.ChangeTranspose(doc, pattern, upward));
        }
        function openPublishPrompt() {
        }
        function openExportPrompt() {
            setPrompt(beepbox.ExportPrompt);
        }
        function copyToClipboard() {
        }
        function onSetScale() {
            doc.history.record(new beepbox.ChangeScale(doc, scaleDropDown.selectedIndex));
        }
        function onSetKey() {
            doc.history.record(new beepbox.ChangeKey(doc, keyDropDown.selectedIndex));
        }
        function onSetTempo() {
            doc.history.record(new beepbox.ChangeTempo(doc, parseInt(tempoSlider.value)));
        }
        function onSetParts() {
            doc.history.record(new beepbox.ChangeParts(doc, beepbox.Music.partCounts[partDropDown.selectedIndex]));
        }
        function onSetWave() {
            doc.history.record(new beepbox.ChangeWave(doc, waveDropDown.selectedIndex));
        }
        function onSetFilter() {
            doc.history.record(new beepbox.ChangeFilter(doc, filterDropDown.selectedIndex));
        }
        function onSetAttack() {
            doc.history.record(new beepbox.ChangeAttack(doc, attackDropDown.selectedIndex));
        }
        function onSetEffect() {
            doc.history.record(new beepbox.ChangeEffect(doc, effectDropDown.selectedIndex));
        }
        function onSetChorus() {
            doc.history.record(new beepbox.ChangeChorus(doc, chorusDropDown.selectedIndex));
        }
        function onSetVolume() {
            doc.history.record(new beepbox.ChangeVolume(doc, -parseInt(channelVolumeSlider.value)));
        }
        function onSetInstrument() {
            if (doc.getCurrentPattern() == null)
                return;
            doc.history.record(new beepbox.ChangePatternInstrument(doc, instrumentDropDown.selectedIndex));
        }
        function editMenuHandler(event) {
            switch (editButton.value) {
                case "undo":
                    doc.history.undo();
                    break;
                case "redo":
                    doc.history.redo();
                    break;
                case "copy":
                    copy();
                    break;
                case "paste":
                    paste();
                    break;
                case "transposeUp":
                    transpose(true);
                    break;
                case "transposeDown":
                    transpose(false);
                    break;
                case "clean":
                    cleanSlate();
                    break;
                case "duration":
                    setPrompt(beepbox.SongDurationPrompt);
                    break;
            }
            editButton.selectedIndex = 0;
        }
        function optionsMenuHandler(event) {
            switch (optionsButton.value) {
                case "showLetters":
                    doc.showLetters = !doc.showLetters;
                    break;
                case "showFifth":
                    doc.showFifth = !doc.showFifth;
                    break;
                case "showChannels":
                    doc.showChannels = !doc.showChannels;
                    break;
                case "showScrollBar":
                    doc.showScrollBar = !doc.showScrollBar;
                    break;
            }
            optionsButton.selectedIndex = 0;
            doc.changed();
            doc.savePreferences();
        }
        doc.watch(onUpdated);
        onUpdated();
        editButton.addEventListener("change", editMenuHandler);
        optionsButton.addEventListener("change", optionsMenuHandler);
        scaleDropDown.addEventListener("change", onSetScale);
        keyDropDown.addEventListener("change", onSetKey);
        tempoSlider.addEventListener("input", onSetTempo);
        partDropDown.addEventListener("change", onSetParts);
        instrumentDropDown.addEventListener("change", onSetInstrument);
        channelVolumeSlider.addEventListener("input", onSetVolume);
        waveDropDown.addEventListener("change", onSetWave);
        attackDropDown.addEventListener("change", onSetAttack);
        filterDropDown.addEventListener("change", onSetFilter);
        chorusDropDown.addEventListener("change", onSetChorus);
        effectDropDown.addEventListener("change", onSetEffect);
        playButton.addEventListener("click", togglePlay);
        exportButton.addEventListener("click", openExportPrompt);
        volumeSlider.addEventListener("input", setVolumeSlider);
        editorBox.addEventListener("mousedown", refocusStage);
        mainLayer.addEventListener("keydown", onKeyPressed);
        mainLayer.addEventListener("keyup", onKeyReleased);
    };
    beepbox.SongEditor.channelColorsDim = ["#0099a1", "#a1a100", "#c75000", "#6f6f6f"];
    beepbox.SongEditor.channelColorsBright = ["#25f3ff", "#ffff25", "#ff9752", "#aaaaaa"];
    beepbox.SongEditor.noteColorsDim = ["#00bdc7", "#c7c700", "#ff771c", "#aaaaaa"];
    beepbox.SongEditor.noteColorsBright = ["#92f9ff", "#ffff92", "#ffcdab", "#eeeeee"];
})(beepbox || (beepbox = {}));
var styleSheet = document.createElement('style');
styleSheet.type = "text/css";
styleSheet.appendChild(document.createTextNode("\n#mainLayer div {\n\tmargin: 0;\n\tpadding: 0;\n}\n#mainLayer canvas {\n\toverflow: hidden;\n\tposition: absolute;\n\tdisplay: block;\n}\n\n#mainLayer .selectRow {\n\twidth:100%;\n\tcolor: #bbbbbb;\n\tmargin: 0;\n\tvertical-align: middle;\n\tline-height: 27px;\n}\n\n/* slider style designed with http://danielstern.ca/range.css/ */\ninput[type=range].beepBoxSlider {\n\t-webkit-appearance: none;\n\twidth: 100%;\n\tmargin: 4px 0;\n}\ninput[type=range].beepBoxSlider:focus {\n\toutline: none;\n}\ninput[type=range].beepBoxSlider::-webkit-slider-runnable-track {\n\twidth: 100%;\n\theight: 6px;\n\tcursor: pointer;\n\tbackground: #b0b0b0;\n\tborder-radius: 0.1px;\n\tborder: 1px solid rgba(0, 0, 0, 0.5);\n}\ninput[type=range].beepBoxSlider::-webkit-slider-thumb {\n\tbox-shadow: 1px 1px 1px rgba(0, 0, 0, 0.5), 0px 0px 1px rgba(13, 13, 13, 0.5);\n\tborder: 1px solid rgba(0, 0, 0, 0.5);\n\theight: 14px;\n\twidth: 14px;\n\tborder-radius: 8px;\n\tbackground: #f0f0f0;\n\tcursor: pointer;\n\t-webkit-appearance: none;\n\tmargin-top: -5px;\n}\ninput[type=range].beepBoxSlider:focus::-webkit-slider-runnable-track {\n\tbackground: #d6d6d6;\n}\ninput[type=range].beepBoxSlider::-moz-range-track {\n\twidth: 100%;\n\theight: 6px;\n\tcursor: pointer;\n\tbackground: #b0b0b0;\n\tborder-radius: 0.1px;\n\tborder: 1px solid rgba(0, 0, 0, 0.5);\n}\ninput[type=range].beepBoxSlider::-moz-range-thumb {\n\tbox-shadow: 1px 1px 1px rgba(0, 0, 0, 0.5), 0px 0px 1px rgba(13, 13, 13, 0.5);\n\tborder: 1px solid rgba(0, 0, 0, 0.5);\n\theight: 14px;\n\twidth: 14px;\n\tborder-radius: 8px;\n\tbackground: #f0f0f0;\n\tcursor: pointer;\n}\ninput[type=range].beepBoxSlider::-ms-track {\n\twidth: 100%;\n\theight: 6px;\n\tcursor: pointer;\n\tbackground: transparent;\n\tborder-color: transparent;\n\tcolor: transparent;\n}\ninput[type=range].beepBoxSlider::-ms-fill-lower {\n\tbackground: #8a8a8a;\n\tborder: 1px solid rgba(0, 0, 0, 0.5);\n\tborder-radius: 0.2px;\n}\ninput[type=range].beepBoxSlider::-ms-fill-upper {\n\tbackground: #b0b0b0;\n\tborder: 1px solid rgba(0, 0, 0, 0.5);\n\tborder-radius: 0.2px;\n}\ninput[type=range].beepBoxSlider::-ms-thumb {\n\tbox-shadow: 1px 1px 1px rgba(0, 0, 0, 0.5), 0px 0px 1px rgba(13, 13, 13, 0.5);\n\tborder: 1px solid rgba(0, 0, 0, 0.5);\n\theight: 14px;\n\twidth: 14px;\n\tborder-radius: 8px;\n\tbackground: #f0f0f0;\n\tcursor: pointer;\n\theight: 6px;\n}\ninput[type=range].beepBoxSlider:focus::-ms-fill-lower {\n\tbackground: #b0b0b0;\n}\ninput[type=range].beepBoxSlider:focus::-ms-fill-upper {\n\tbackground: #d6d6d6;\n}\n"));
document.head.appendChild(styleSheet);
var beepboxEditorContainer = document.getElementById("beepboxEditorContainer");
beepboxEditorContainer.innerHTML = "\n<div id=\"mainLayer\" tabindex=\"0\" style=\"width: 700px; height: 645px; -webkit-touch-callout: none; -webkit-user-select: none; -khtml-user-select: none; -moz-user-select: none; -ms-user-select: none; user-select: none; position: relative;\">\n\t<div id=\"editorBox\" style=\"width: 512px; height: 645px; float: left;\">\n\t\t<div id=\"patternContainerContainer\" style=\"width: 512px; height: 481px; display: table; table-layout: fixed;\">\n\t\t\t<div id=\"pianoContainer\" style=\"width: 32px; height: 481px; display: table-cell; overflow:hidden; position: relative;\">\n\t\t\t\t<canvas id=\"piano\" width=\"32\" height=\"481\"></canvas>\n\t\t\t\t<canvas id=\"pianoPreview\" width=\"32\" height=\"40\"></canvas>\n\t\t\t</div>\n\t\t\t<div id=\"patternEditorContainer\"  style=\"height: 481px; display: table-cell; overflow:hidden; position: relative;\">\n\t\t\t\t<svg id=\"patternEditorSvg\" xmlns=\"http://www.w3.org/2000/svg\" style=\"background-color: #000000; touch-action: none; position: absolute;\" width=\"512\" height=\"481\">\n\t\t\t\t\t<defs id=\"patternEditorDefs\">\n\t\t\t\t\t\t<pattern id=\"patternEditorNoteBackground\" x=\"0\" y=\"0\" width=\"64\" height=\"156\" patternUnits=\"userSpaceOnUse\"></pattern>\n\t\t\t\t\t\t<pattern id=\"patternEditorDrumBackground\" x=\"0\" y=\"0\" width=\"64\" height=\"40\" patternUnits=\"userSpaceOnUse\"></pattern>\n\t\t\t\t\t</defs>\n\t\t\t\t\t<rect id=\"patternEditorBackground\" x=\"0\" y=\"0\" width=\"512\" height=\"481\" pointer-events=\"none\" fill=\"url(#patternEditorNoteBackground)\"></rect>\n\t\t\t\t\t<svg id=\"patternEditorNoteContainer\"></svg>\n\t\t\t\t\t<path id=\"patternEditorPreview\" fill=\"none\" stroke=\"white\" stroke-width=\"2\" pointer-events=\"none\"></path>\n\t\t\t\t\t<rect id=\"patternEditorPlayhead\" x=\"0\" y=\"0\" width=\"4\" height=\"481\" fill=\"white\" pointer-events=\"none\"></rect>\n\t\t\t\t</svg>\n\t\t\t</div>\n\t\t\t<div id=\"octaveScrollBarContainer\" style=\"width: 20px; height: 481px; display: table-cell; overflow:hidden; position: relative;\">\n\t\t\t\t<canvas id=\"octaveScrollBar\" width=\"20\" height=\"481\"></canvas>\n\t\t\t\t<canvas id=\"octaveScrollBarPreview\" width=\"20\" height=\"481\"></canvas>\n\t\t\t</div>\n\t\t</div>\n\t\t<div style=\"width: 512px; height: 6px; clear: both;\"></div>\n\t\t<div id=\"trackContainerContainer\" style=\"width: 512px; height: 158px;\">\n\t\t\t<div id=\"trackEditorContainer\" style=\"width: 512px; height: 128px; position: relative; overflow:hidden;\">\n\t\t\t\t<canvas id=\"trackEditor\" width=\"512\" height=\"128\"></canvas>\n\t\t\t\t<canvas id=\"trackEditorPreview\" width=\"32\" height=\"32\"></canvas>\n\t\t\t\t<div id=\"trackPlayhead\" style=\"width: 4px; height: 100%; overflow:hidden; position: absolute; background: #ffffff;\"></div>\n\t\t\t</div>\n\t\t\t<div style=\"width: 512px; height: 5px;\"></div>\n\t\t\t<div id=\"loopEditorContainer\" style=\"width: 512px; height: 20px; position: relative;\">\n\t\t\t\t<canvas id=\"loopEditor\" width=\"512\" height=\"20\"></canvas>\n\t\t\t\t<canvas id=\"loopEditorPreview\" width=\"512\" height=\"20\"></canvas>\n\t\t\t</div>\n\t\t\t<div style=\"width: 512px; height: 5px;\"></div>\n\t\t\t<div id=\"barScrollBarContainer\" style=\"width: 512px; height: 20px; position: relative;\">\n\t\t\t\t<canvas id=\"barScrollBar\" width=\"512\" height=\"20\"></canvas>\n\t\t\t\t<canvas id=\"barScrollBarPreview\" width=\"512\" height=\"20\"></canvas>\n\t\t\t</div>\n\t\t</div>\n\t</div>\n\t\n\t<div style=\"float: left; width: 6px; height: 645px;\"></div>\n\t\n\t<div style=\"float: left; width: 182px; height: 645px; font-size: 12px;\">\n\t\t<div style=\"width:100%; text-align: center; color: #bbbbbb;\">\n\t\t\tBeepBox 2.1.1\n\t\t</div>\n\t\t\n\t\t<div style=\"width:100%; margin: 5px 0;\">\n\t\t\t<button id=\"playButton\" style=\"width: 75px; float: left; margin: 0px\" type=\"button\">Play</button>\n\t\t\t<div style=\"float: left; width: 4px; height: 10px;\"></div>\n\t\t\t<input class=\"beepBoxSlider\" id=\"volumeSlider\" style=\"float: left; width: 101px; margin: 0px;\" type=\"range\" min=\"0\" max=\"100\" value=\"50\" step=\"1\" />\n\t\t\t<div style=\"clear: both;\"></div> \n\t\t</div>\n\t\t\n\t\t<select id=\"editButton\" style=\"width:100%; margin: 5px 0;\">Edit Menu</select>\n\t\t<select id=\"optionsButton\" style=\"width:100%; margin: 5px 0;\">Preferences Menu</select>\n\t\t<!--<button id=\"publishButton\" style=\"width:100%\" type=\"button\">Publishing Panel...</button>-->\n\t\t<button id=\"exportButton\" style=\"width:100%; margin: 5px 0;\" type=\"button\">Export</button>\n\t\t<!--<button id=\"copyButton\" style=\"width:100%\" type=\"button\">Copy URL to Clipboard</button>-->\n\t\t\n\t\t<div style=\"width: 100%; height: 110px;\"></div>\n\t\t\n\t\t<div style=\"width:100%; margin: 3px 0;\">\n\t\t\tSong Settings:\n\t\t</div>\n\t\t\n\t\t<div class=\"selectRow\">\n\t\t\tScale: <span style=\"float: right;\"><select id=\"scaleDropDown\" style=\"width:90px;\"></select></span><div style=\"clear: both;\"></div> \n\t\t</div>\n\t\t<div class=\"selectRow\">\n\t\t\tKey: <span style=\"float: right;\"><select id=\"keyDropDown\" style=\"width:90px;\"></select></span><div style=\"clear: both;\"></div> \n\t\t</div>\n\t\t<div class=\"selectRow\">\n\t\t\tTempo: \n\t\t\t<span style=\"float: right;\">\n\t\t\t\t<input class=\"beepBoxSlider\" id=\"tempoSlider\" style=\"width: 90px; margin: 0px;\" type=\"range\" min=\"0\" max=\"11\" value=\"7\" step=\"1\" />\n\t\t\t</span><div style=\"clear: both;\"></div> \n\t\t</div>\n\t\t<div class=\"selectRow\">\n\t\t\tRhythm: <span style=\"float: right;\"><select id=\"partDropDown\" style=\"width:90px;\"></select></span><div style=\"clear: both;\"></div> \n\t\t</div>\n\t\t\n\t\t<div style=\"width: 100%; height: 25px;\"></div>\n\t\t\n\t\t<div id=\"patternSettingsLabel\" style=\"visibility: hidden; width:100%; margin: 3px 0;\">\n\t\t\tPattern Settings:\n\t\t</div>\n\t\t\n\t\t<div id=\"instrumentDropDownGroup\" style=\"width:100%; color: #bbbbbb; visibility: hidden; margin: 0; vertical-align: middle; line-height: 27px;\">\n\t\t\tInstrument: <span style=\"float: right;\"><select id=\"instrumentDropDown\" style=\"width:120px;\"></select></span><div style=\"clear: both;\"></div> \n\t\t</div>\n\t\t\n\t\t<div style=\"width: 100%; height: 25px;\"></div>\n\t\t\n\t\t<div id=\"instrumentSettingsLabel\" style=\"clear: both; width:100%; margin: 3px 0;\">\n\t\t\tInstrument Settings:\n\t\t</div>\n\t\t\n\t\t<div id=\"channelVolumeSliderGroup\" class=\"selectRow\">\n\t\t\tVolume: \n\t\t\t<span style=\"float: right;\">\n\t\t\t\t<input class=\"beepBoxSlider\" id=\"channelVolumeSlider\" style=\"width: 120px; margin: 0px;\" type=\"range\" min=\"-5\" max=\"0\" value=\"0\" step=\"1\" />\n\t\t\t</span><div style=\"clear: both;\"></div> \n\t\t</div>\n\t\t<div id=\"waveDropDownGroup\" class=\"selectRow\">\n\t\t\tWave: <span style=\"float: right;\"><select id=\"waveDropDown\" style=\"width:120px;\"></select></span><div style=\"clear: both;\"></div> \n\t\t</div>\n\t\t<div id=\"attackDropDownGroup\" class=\"selectRow\">\n\t\t\tEnvelope: <span style=\"float: right;\"><select id=\"attackDropDown\" style=\"width:120px;\"></select></span><div style=\"clear: both;\"></div> \n\t\t</div>\n\t\t<div id=\"filterDropDownGroup\" class=\"selectRow\">\n\t\t\tFilter: <span style=\"float: right;\"><select id=\"filterDropDown\" style=\"width:120px;\"></select></span><div style=\"clear: both;\"></div> \n\t\t</div>\n\t\t<div id=\"chorusDropDownGroup\" class=\"selectRow\">\n\t\t\tChorus: <span style=\"float: right;\"><select id=\"chorusDropDown\" style=\"width:120px;\"></select></span><div style=\"clear: both;\"></div> \n\t\t</div>\n\t\t<div id=\"effectDropDownGroup\" class=\"selectRow\">\n\t\t\tEffect: <span style=\"float: right;\"><select id=\"effectDropDown\" style=\"width:120px;\"></select></span><div style=\"clear: both;\"></div> \n\t\t</div>\n\t</div>\n\t\n\t<div id=\"promptBackground\" style=\"position: absolute; background: #000000; opacity: 0.5; width: 100%; height: 100%; display: none;\"></div>\n\t\n\t<div id=\"songSizePrompt\" style=\"position: absolute; display: none;\">\n\t\t<div style=\"display: table-cell; vertical-align: middle; width: 700px; height: 645px;\">\n\t\t\t<div style=\"margin: auto; text-align: center; background: #000000; width: 274px; border-radius: 15px; border: 4px solid #444444; color: #ffffff; font-size: 12px; padding: 20px;\">\n\t\t\t\t<div style=\"font-size: 30px\">Custom Song Size</div>\n\t\t\t\t\n\t\t\t\t<div style=\"height: 30px;\"></div>\n\t\t\t\t\n\t\t\t\t<div style=\"vertical-align: middle; line-height: 46px;\">\n\t\t\t\t\t<span style=\"float: right;\"><div style=\"display: inline-block; vertical-align: middle; text-align: right; line-height: 18px;\">Beats per bar:<br /><span style=\"color: #888888;\">(Multiples of 3 or 4 are recommended)</span></div><div style=\"display: inline-block; width: 20px; height: 1px;\"></div><input id=\"beatsStepper\" style=\"width: 40px; height: 16px;\" type=\"number\" min=\"1\" max=\"128\" step=\"1\" /></span>\n\t\t\t\t\t<div style=\"clear: both;\"></div>\n\t\t\t\t</div>\n\t\t\t\t<div style=\"vertical-align: middle; line-height: 46px;\">\n\t\t\t\t\t<span style=\"float: right;\"><div style=\"display: inline-block; vertical-align: middle; text-align: right; line-height: 18px;\">Bars per song:<br /><span style=\"color: #888888;\">(Multiples of 2 or 4 are recommended)</span></div><div style=\"display: inline-block; width: 20px; height: 1px;\"></div><input id=\"barsStepper\" style=\"width: 40px; height: 16px;\" type=\"number\" min=\"1\" max=\"128\" step=\"1\" /></span>\n\t\t\t\t\t<div style=\"clear: both;\"></div>\n\t\t\t\t</div>\n\t\t\t\t<div style=\"vertical-align: middle; line-height: 46px;\">\n\t\t\t\t\t<span style=\"float: right;\">Patterns per channel:<div style=\"display: inline-block; width: 20px; height: 1px;\"></div><input id=\"patternsStepper\" style=\"width: 40px; height: 16px;\" type=\"number\" min=\"1\" max=\"32\" step=\"1\" /></span>\n\t\t\t\t\t<div style=\"clear: both;\"></div>\n\t\t\t\t</div>\n\t\t\t\t<div style=\"vertical-align: middle; line-height: 46px;\">\n\t\t\t\t\t<span style=\"float: right;\">Instruments per channel:<div style=\"display: inline-block; width: 20px; height: 1px;\"></div><input id=\"instrumentsStepper\" style=\"width: 40px; height: 16px;\" type=\"number\" min=\"1\" max=\"10\" step=\"1\" /></span>\n\t\t\t\t\t<div style=\"clear: both;\"></div>\n\t\t\t\t</div>\n\t\t\t\t\n\t\t\t\t<div style=\"height: 30px;\"></div>\n\t\t\t\t\n\t\t\t\t<button id=\"songDurationOkayButton\" style=\"width:125px; float: left;\" type=\"button\">Okay</button>\n\t\t\t\t<button id=\"songDurationCancelButton\" style=\"width:125px; float: right;\" type=\"button\">Cancel</button>\n\t\t\t\t<div style=\"clear: both;\"></div>\n\t\t\t</div>\n\t\t</div>\n\t</div>\n</div>\n";
var prevHash = "**blank**";
var doc = new beepbox.SongDocument();
var wokeUp = false;
function checkHash() {
    if (prevHash != location.hash) {
        prevHash = location.hash;
        if (prevHash != "") {
            doc.history.record(new beepbox.ChangeSong(doc, prevHash));
        }
    }
    if (!wokeUp && !document.hidden) {
        wokeUp = true;
        if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|android|ipad|playbook|silk/i.test(navigator.userAgent)) {
        }
        else {
            doc.synth.play();
        }
        doc.changed();
    }
    beepbox.Model.updateAll();
    window.requestAnimationFrame(checkHash);
}
function onUpdated() {
    var hash = doc.song.toString();
    if (location.hash != hash) {
        location.hash = hash;
        prevHash = hash;
    }
}
new beepbox.SongEditor(doc);
doc.history.watch(onUpdated);
checkHash();
