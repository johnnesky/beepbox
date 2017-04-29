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
                this.fromString(string);
            }
            else {
                this.initToDefault();
            }
        }
        Song.prototype.initToDefault = function () {
            this.channelPatterns = [
                [new BarPattern(), new BarPattern(), new BarPattern(), new BarPattern(), new BarPattern(), new BarPattern(), new BarPattern(), new BarPattern()],
                [new BarPattern(), new BarPattern(), new BarPattern(), new BarPattern(), new BarPattern(), new BarPattern(), new BarPattern(), new BarPattern()],
                [new BarPattern(), new BarPattern(), new BarPattern(), new BarPattern(), new BarPattern(), new BarPattern(), new BarPattern(), new BarPattern()],
                [new BarPattern(), new BarPattern(), new BarPattern(), new BarPattern(), new BarPattern(), new BarPattern(), new BarPattern(), new BarPattern()],
            ];
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
        Song.prototype.fromString = function (compressed) {
            compressed = compressed.trim();
            if (compressed == null || compressed.length == 0) {
                this.initToDefault();
                return;
            }
            if (compressed.charAt(0) == "#")
                compressed = compressed.substring(1);
            if (compressed.charAt(0) == "{") {
                this.fromJsonObject(JSON.parse(compressed));
                return;
            }
            this.initToDefault();
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
                    this.tempo = this._clip(0, Music.tempoNames.length, this.tempo);
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
                            this.channelBars[channel].length = this.bars;
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
                            this.channelBars[channel].length = this.bars;
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
        };
        Song.prototype.toJsonObject = function (enableIntro, loopCount, enableOutro) {
            if (enableIntro === void 0) { enableIntro = true; }
            if (loopCount === void 0) { loopCount = 1; }
            if (enableOutro === void 0) { enableOutro = true; }
            var channelArray = [];
            for (var channel = 0; channel < Music.numChannels; channel++) {
                var instrumentArray = [];
                for (var i = 0; i < this.instruments; i++) {
                    if (channel == 3) {
                        instrumentArray.push({
                            volume: (5 - this.instrumentVolumes[channel][i]) * 20,
                            wave: Music.drumNames[this.instrumentWaves[channel][i]],
                            envelope: Music.attackNames[this.instrumentAttacks[channel][i]],
                        });
                    }
                    else {
                        instrumentArray.push({
                            volume: (5 - this.instrumentVolumes[channel][i]) * 20,
                            wave: Music.waveNames[this.instrumentWaves[channel][i]],
                            envelope: Music.attackNames[this.instrumentAttacks[channel][i]],
                            filter: Music.filterNames[this.instrumentFilters[channel][i]],
                            chorus: Music.chorusNames[this.instrumentChorus[channel][i]],
                            effect: Music.effectNames[this.instrumentEffects[channel][i]],
                        });
                    }
                }
                var patternArray = [];
                for (var _i = 0, _a = this.channelPatterns[channel]; _i < _a.length; _i++) {
                    var pattern = _a[_i];
                    var noteArray = [];
                    for (var _b = 0, _c = pattern.tones; _b < _c.length; _b++) {
                        var tone = _c[_b];
                        var pointArray = [];
                        for (var _d = 0, _e = tone.pins; _d < _e.length; _d++) {
                            var pin = _e[_d];
                            pointArray.push({
                                tick: pin.time + tone.start,
                                pitchBend: pin.interval,
                                volume: Math.round(pin.volume * 100 / 3),
                            });
                        }
                        noteArray.push({
                            pitches: tone.notes,
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
                        sequenceArray.push(this.channelBars[channel][i]);
                    }
                for (var l = 0; l < loopCount; l++)
                    for (var i = this.loopStart; i < this.loopStart + this.loopLength; i++) {
                        sequenceArray.push(this.channelBars[channel][i]);
                    }
                if (enableOutro)
                    for (var i = this.loopStart + this.loopLength; i < this.bars; i++) {
                        sequenceArray.push(this.channelBars[channel][i]);
                    }
                channelArray.push({
                    octaveScrollBar: this.channelOctaves[channel],
                    instruments: instrumentArray,
                    patterns: patternArray,
                    sequence: sequenceArray,
                });
            }
            return {
                version: Song._latestVersion,
                scale: Music.scaleNames[this.scale],
                key: Music.keyNames[this.key],
                introBars: this.loopStart,
                loopBars: this.loopLength,
                beatsPerBar: this.beats,
                ticksPerBeat: this.parts,
                beatsPerMinute: this.getBeatsPerMinute(),
                channels: channelArray,
            };
        };
        Song.prototype.fromJsonObject = function (jsonObject) {
            this.initToDefault();
            if (!jsonObject)
                return;
            var version = jsonObject.version;
            if (version !== 5)
                return;
            this.scale = 11;
            if (jsonObject.scale != undefined) {
                var scale = Music.scaleNames.indexOf(jsonObject.scale);
                if (scale != -1)
                    this.scale = scale;
            }
            if (jsonObject.key != undefined) {
                if (typeof (jsonObject.key) == "number") {
                    this.key = Music.keyNames.length - 1 - (((jsonObject.key + 1200) >>> 0) % Music.keyNames.length);
                }
                else if (typeof (jsonObject.key) == "string") {
                    var key = jsonObject.key;
                    var letter = key.charAt(0).toUpperCase();
                    var symbol = key.charAt(1).toLowerCase();
                    var index = { "C": 11, "D": 9, "E": 7, "F": 6, "G": 4, "A": 2, "B": 0 }[letter];
                    var offset = { "#": -1, "♯": -1, "b": 1, "♭": 1 }[symbol];
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
                this.tempo = this._clip(0, Music.tempoNames.length, this.tempo);
            }
            if (jsonObject.beatsPerBar != undefined) {
                this.beats = Math.max(Music.beatsMin, Math.min(Music.beatsMax, jsonObject.beatsPerBar | 0));
            }
            if (jsonObject.ticksPerBeat != undefined) {
                this.parts = Math.max(3, Math.min(4, jsonObject.ticksPerBeat | 0));
            }
            var maxInstruments = 1;
            var maxPatterns = 1;
            var maxBars = 1;
            for (var channel = 0; channel < Music.numChannels; channel++) {
                if (jsonObject.channels && jsonObject.channels[channel]) {
                    var channelObject = jsonObject.channels[channel];
                    if (channelObject.instruments)
                        maxInstruments = Math.max(maxInstruments, channelObject.instruments.length | 0);
                    if (channelObject.patterns)
                        maxPatterns = Math.max(maxPatterns, channelObject.patterns.length | 0);
                    if (channelObject.sequence)
                        maxBars = Math.max(maxBars, channelObject.sequence.length | 0);
                }
            }
            this.instruments = maxInstruments;
            this.patterns = maxPatterns;
            this.bars = maxBars;
            if (jsonObject.introBars != undefined) {
                this.loopStart = this._clip(0, this.bars, jsonObject.introBars | 0);
            }
            if (jsonObject.loopBars != undefined) {
                this.loopLength = this._clip(1, this.bars - this.loopStart + 1, jsonObject.loopBars | 0);
            }
            for (var channel = 0; channel < Music.numChannels; channel++) {
                var channelObject = undefined;
                if (jsonObject.channels)
                    channelObject = jsonObject.channels[channel];
                if (channelObject == undefined)
                    channelObject = {};
                if (channelObject.octaveScrollBar != undefined) {
                    this.channelOctaves[channel] = this._clip(0, 5, channelObject.octaveScrollBar | 0);
                }
                this.instrumentVolumes[channel].length = this.instruments;
                this.instrumentWaves[channel].length = this.instruments;
                this.instrumentAttacks[channel].length = this.instruments;
                this.instrumentFilters[channel].length = this.instruments;
                this.instrumentChorus[channel].length = this.instruments;
                this.instrumentEffects[channel].length = this.instruments;
                this.channelPatterns[channel].length = this.patterns;
                this.channelBars[channel].length = this.bars;
                for (var i = 0; i < this.instruments; i++) {
                    var instrumentObject = undefined;
                    if (channelObject.instruments)
                        instrumentObject = channelObject.instruments[i];
                    if (instrumentObject == undefined)
                        instrumentObject = {};
                    if (instrumentObject.volume != undefined) {
                        this.instrumentVolumes[channel][i] = this._clip(0, Music.volumeNames.length, Math.round(5 - (instrumentObject.volume | 0) / 20));
                    }
                    else {
                        this.instrumentVolumes[channel][i] = 0;
                    }
                    this.instrumentAttacks[channel][i] = Music.attackNames.indexOf(instrumentObject.envelope);
                    if (this.instrumentAttacks[channel][i] == -1)
                        this.instrumentAttacks[channel][i] = 1;
                    if (channel == 3) {
                        this.instrumentWaves[channel][i] = Music.drumNames.indexOf(instrumentObject.wave);
                        if (this.instrumentWaves[channel][i] == -1)
                            this.instrumentWaves[channel][i] = 0;
                        this.instrumentFilters[channel][i] = 0;
                        this.instrumentChorus[channel][i] = 0;
                        this.instrumentEffects[channel][i] = 0;
                    }
                    else {
                        this.instrumentWaves[channel][i] = Music.waveNames.indexOf(instrumentObject.wave);
                        if (this.instrumentWaves[channel][i] == -1)
                            this.instrumentWaves[channel][i] = 1;
                        this.instrumentFilters[channel][i] = Music.filterNames.indexOf(instrumentObject.filter);
                        if (this.instrumentFilters[channel][i] == -1)
                            this.instrumentFilters[channel][i] = 0;
                        this.instrumentChorus[channel][i] = Music.chorusNames.indexOf(instrumentObject.chorus);
                        if (this.instrumentChorus[channel][i] == -1)
                            this.instrumentChorus[channel][i] = 0;
                        this.instrumentEffects[channel][i] = Music.effectNames.indexOf(instrumentObject.effect);
                        if (this.instrumentEffects[channel][i] == -1)
                            this.instrumentEffects[channel][i] = 0;
                    }
                }
                for (var i = 0; i < this.patterns; i++) {
                    var pattern = new BarPattern();
                    this.channelPatterns[channel][i] = pattern;
                    var patternObject = undefined;
                    if (channelObject.patterns)
                        patternObject = channelObject.patterns[i];
                    if (patternObject == undefined)
                        continue;
                    pattern.instrument = this._clip(0, this.instruments, (patternObject.instrument | 0) - 1);
                    if (patternObject.notes && patternObject.notes.length > 0) {
                        var maxToneCount = Math.min(this.beats * this.parts, patternObject.notes.length >>> 0);
                        var tickClock = 0;
                        for (var j = 0; j < patternObject.notes.length; j++) {
                            if (j >= maxToneCount)
                                break;
                            var noteObject = patternObject.notes[j];
                            if (!noteObject || !noteObject.pitches || !(noteObject.pitches.length >= 1) || !noteObject.points || !(noteObject.points.length >= 2)) {
                                continue;
                            }
                            var tone = new Tone(0, 0, 0, 0);
                            tone.notes = [];
                            tone.pins = [];
                            for (var k = 0; k < noteObject.pitches.length; k++) {
                                var pitch = noteObject.pitches[k] | 0;
                                if (tone.notes.indexOf(pitch) != -1)
                                    continue;
                                tone.notes.push(pitch);
                                if (tone.notes.length >= 4)
                                    break;
                            }
                            if (tone.notes.length < 1)
                                continue;
                            var toneClock = tickClock;
                            var startInterval = 0;
                            for (var k = 0; k < noteObject.points.length; k++) {
                                var pointObject = noteObject.points[k];
                                if (pointObject == undefined || pointObject.tick == undefined)
                                    continue;
                                var interval = (pointObject.pitchBend == undefined) ? 0 : (pointObject.pitchBend | 0);
                                var time = pointObject.tick | 0;
                                var volume = (pointObject.volume == undefined) ? 3 : Math.max(0, Math.min(3, Math.round((pointObject.volume | 0) * 3 / 100)));
                                if (time > this.beats * this.parts)
                                    continue;
                                if (tone.pins.length == 0) {
                                    if (time < toneClock)
                                        continue;
                                    tone.start = time;
                                    startInterval = interval;
                                }
                                else {
                                    if (time <= toneClock)
                                        continue;
                                }
                                toneClock = time;
                                tone.pins.push(new TonePin(interval - startInterval, time - tone.start, volume));
                            }
                            if (tone.pins.length < 2)
                                continue;
                            tone.end = tone.pins[tone.pins.length - 1].time + tone.start;
                            var maxPitch = channel == 3 ? Music.drumCount - 1 : Music.maxPitch;
                            var lowestPitch = maxPitch;
                            var highestPitch = 0;
                            for (var k = 0; k < tone.notes.length; k++) {
                                tone.notes[k] += startInterval;
                                if (tone.notes[k] < 0 || tone.notes[k] > maxPitch) {
                                    tone.notes.splice(k, 1);
                                    k--;
                                }
                                if (tone.notes[k] < lowestPitch)
                                    lowestPitch = tone.notes[k];
                                if (tone.notes[k] > highestPitch)
                                    highestPitch = tone.notes[k];
                            }
                            if (tone.notes.length < 1)
                                continue;
                            for (var k = 0; k < tone.pins.length; k++) {
                                var pin = tone.pins[k];
                                if (pin.interval + lowestPitch < 0)
                                    pin.interval = -lowestPitch;
                                if (pin.interval + highestPitch > maxPitch)
                                    pin.interval = maxPitch - highestPitch;
                                if (k >= 2) {
                                    if (pin.interval == tone.pins[k - 1].interval &&
                                        pin.interval == tone.pins[k - 2].interval &&
                                        pin.volume == tone.pins[k - 1].volume &&
                                        pin.volume == tone.pins[k - 2].volume) {
                                        tone.pins.splice(k - 1, 1);
                                        k--;
                                    }
                                }
                            }
                            pattern.tones.push(tone);
                            tickClock = tone.end;
                        }
                    }
                }
                for (var i = 0; i < this.bars; i++) {
                    this.channelBars[channel][i] = channelObject.sequence ? Math.min(this.patterns, channelObject.sequence[i] >>> 0) : 0;
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
                for (var channel = 0; channel < 4; channel++) {
                    var pattern = this.song.getPattern(channel, this._bar);
                    var attack = pattern == null ? 0 : this.song.instrumentAttacks[channel][pattern.instrument];
                    var tone = null;
                    var prevTone = null;
                    var nextTone = null;
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
                    var channelRoot = channel == 3 ? 69 : Music.keyTransposes[this.song.key];
                    var intervalScale = channel == 3 ? Music.drumInterval : 1;
                    var periodDelta = void 0;
                    var periodDeltaScale = void 0;
                    var toneVolume = void 0;
                    var volumeDelta = void 0;
                    var filter = void 0;
                    var filterScale = void 0;
                    var vibratoScale = void 0;
                    var resetPeriod = false;
                    if (this.pianoPressed && channel == this.pianoChannel) {
                        var pianoFreq = this._frequencyFromPitch(channelRoot + this.pianoNote * intervalScale);
                        var pianoPitchDamping = void 0;
                        if (channel == 3) {
                            if (this.song.instrumentWaves[3][pattern.instrument] > 0) {
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
                        toneVolume = Math.pow(2.0, -this.pianoNote * intervalScale / pianoPitchDamping);
                        volumeDelta = 0.0;
                        filter = 1.0;
                        filterScale = 1.0;
                        vibratoScale = Math.pow(2.0, Music.effectVibratos[this.song.instrumentEffects[channel][pattern.instrument]] / 12.0) - 1.0;
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
                            pitch = tone.notes[this._arpeggio >> 1];
                        }
                        else if (tone.notes.length == 3) {
                            pitch = tone.notes[this._arpeggio == 3 ? 1 : this._arpeggio];
                        }
                        else if (tone.notes.length == 4) {
                            pitch = tone.notes[this._arpeggio];
                        }
                        else {
                            pitch = tone.notes[0];
                        }
                        var startPin = null;
                        var endPin = null;
                        for (var _i = 0, _a = tone.pins; _i < _a.length; _i++) {
                            var pin = _a[_i];
                            if (pin.time + tone.start <= time) {
                                startPin = pin;
                            }
                            else {
                                endPin = pin;
                                break;
                            }
                        }
                        var toneStart = tone.start * 4;
                        var toneEnd = tone.end * 4;
                        var pinStart = (tone.start + startPin.time) * 4;
                        var pinEnd = (tone.start + endPin.time) * 4;
                        var arpeggioStart = time * 4 + this._arpeggio;
                        var arpeggioEnd = time * 4 + this._arpeggio + 1;
                        var arpeggioRatioStart = (arpeggioStart - pinStart) / (pinEnd - pinStart);
                        var arpeggioRatioEnd = (arpeggioEnd - pinStart) / (pinEnd - pinStart);
                        var arpeggioVolumeStart = startPin.volume * (1.0 - arpeggioRatioStart) + endPin.volume * arpeggioRatioStart;
                        var arpeggioVolumeEnd = startPin.volume * (1.0 - arpeggioRatioEnd) + endPin.volume * arpeggioRatioEnd;
                        var arpeggioIntervalStart = startPin.interval * (1.0 - arpeggioRatioStart) + endPin.interval * arpeggioRatioStart;
                        var arpeggioIntervalEnd = startPin.interval * (1.0 - arpeggioRatioEnd) + endPin.interval * arpeggioRatioEnd;
                        var arpeggioFilterTimeStart = startPin.time * (1.0 - arpeggioRatioStart) + endPin.time * arpeggioRatioStart;
                        var arpeggioFilterTimeEnd = startPin.time * (1.0 - arpeggioRatioEnd) + endPin.time * arpeggioRatioEnd;
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
                        var startRatio = 1.0 - (this._arpeggioSamples + samples) / samplesPerArpeggio;
                        var endRatio = 1.0 - (this._arpeggioSamples) / samplesPerArpeggio;
                        var startInterval = arpeggioIntervalStart * (1.0 - startRatio) + arpeggioIntervalEnd * startRatio;
                        var endInterval = arpeggioIntervalStart * (1.0 - endRatio) + arpeggioIntervalEnd * endRatio;
                        var startFilterTime = arpeggioFilterTimeStart * (1.0 - startRatio) + arpeggioFilterTimeEnd * startRatio;
                        var endFilterTime = arpeggioFilterTimeStart * (1.0 - endRatio) + arpeggioFilterTimeEnd * endRatio;
                        var startFreq = this._frequencyFromPitch(channelRoot + (pitch + startInterval) * intervalScale);
                        var endFreq = this._frequencyFromPitch(channelRoot + (pitch + endInterval) * intervalScale);
                        var pitchDamping = void 0;
                        if (channel == 3) {
                            if (this.song.instrumentWaves[3][pattern.instrument] > 0) {
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
                        startVol *= this._volumeConversion(arpeggioVolumeStart * (1.0 - startRatio) + arpeggioVolumeEnd * startRatio);
                        endVol *= this._volumeConversion(arpeggioVolumeStart * (1.0 - endRatio) + arpeggioVolumeEnd * endRatio);
                        var freqScale = endFreq / startFreq;
                        periodDelta = startFreq * sampleTime;
                        periodDeltaScale = Math.pow(freqScale, 1.0 / samples);
                        toneVolume = startVol;
                        volumeDelta = (endVol - startVol) / samples;
                        var timeSinceStart = (arpeggioStart + startRatio - toneStart) * samplesPerArpeggio / this.samplesPerSecond;
                        if (timeSinceStart == 0.0 && !inhibitRestart)
                            resetPeriod = true;
                        var filterScaleRate = Music.filterDecays[this.song.instrumentFilters[channel][pattern.instrument]];
                        filter = Math.pow(2, -filterScaleRate * startFilterTime * 4.0 * samplesPerArpeggio / this.samplesPerSecond);
                        var endFilter = Math.pow(2, -filterScaleRate * endFilterTime * 4.0 * samplesPerArpeggio / this.samplesPerSecond);
                        filterScale = Math.pow(endFilter / filter, 1.0 / samples);
                        vibratoScale = (this.song.instrumentEffects[channel][pattern.instrument] == 2 && time - tone.start < 3) ? 0.0 : Math.pow(2.0, Music.effectVibratos[this.song.instrumentEffects[channel][pattern.instrument]] / 12.0) - 1.0;
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
                            this._leadSample = 0.0;
                            this._leadPeriodA = 0.0;
                            this._leadPeriodB = 0.0;
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
                            this._harmonySample = 0.0;
                            this._harmonyPeriodA = 0.0;
                            this._harmonyPeriodB = 0.0;
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
                            this._bassSample = 0.0;
                            this._bassPeriodA = 0.0;
                            this._bassPeriodB = 0.0;
                        }
                    }
                    else if (channel == 3) {
                        drumPeriodDelta = periodDelta / 32767.0;
                        drumPeriodDeltaScale = periodDeltaScale;
                        drumVolume = toneVolume * maxDrumVolume;
                        drumVolumeDelta = volumeDelta * maxDrumVolume;
                    }
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
        function span(attributes, children) {
            return element("span", attributes, children);
        }
        html.span = span;
        function select(attributes, children) {
            return element("select", attributes, children);
        }
        html.select = select;
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
        function ChangeSong(document, newSong) {
            var _this = _super.call(this, false) || this;
            _this._document = document;
            _this._oldSong = document.song;
            _this._oldBar = document.bar;
            document.song = newSong;
            document.synth.setSong(newSong);
            _this._newSong = newSong;
            _this._newBar = Math.max(0, Math.min(document.song.bars - 1, _this._oldBar));
            document.bar = _this._newBar;
            document.barScrollPos = Math.max(0, Math.min(document.song.bars - 16, document.barScrollPos));
            document.barScrollPos = Math.min(document.bar, Math.max(document.bar - 15, document.barScrollPos));
            document.changed();
            _this._didSomething();
            return _this;
        }
        ChangeSong.prototype._doForwards = function () {
            this._document.song = this._newSong;
            this._document.synth.setSong(this._document.song);
            this._document.bar = this._newBar;
            this._document.barScrollPos = Math.max(0, Math.min(this._document.song.bars - 16, this._document.barScrollPos));
            this._document.barScrollPos = Math.min(this._document.bar, Math.max(this._document.bar - 15, this._document.barScrollPos));
            this._document.changed();
        };
        ChangeSong.prototype._doBackwards = function () {
            this._document.song = this._oldSong;
            this._document.synth.setSong(this._document.song);
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
                        _this._newPins.push(new beepbox.TonePin(prevInterval, truncStart, prevVolume));
                    }
                    _this._newPins.push(new beepbox.TonePin(oldPin.interval, oldPin.time, oldPin.volume));
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
    function prettyNumber(value) {
        return value.toFixed(2).replace(/\.?0*$/, "");
    }
    function makeEmptyReplacementElement(node) {
        var clone = node.cloneNode(false);
        node.parentNode.replaceChild(clone, node);
        return clone;
    }
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
            this._svg = beepbox.svgElement("svg", { xmlns: "http://www.w3.org/2000/svg", style: "background-color: #000000; touch-action: none; position: absolute;", width: "512", height: "481" }, [
                beepbox.svgElement("defs", undefined, [
                    this._svgNoteBackground,
                    this._svgDrumBackground,
                ]),
                this._svgBackground,
                this._svgNoteContainer,
                this._svgPreview,
                this._svgPlayhead,
            ]);
            this.container = beepbox.html.div({ style: "height: 481px; overflow:hidden; position: relative;" }, [this._svg]);
            this._defaultNoteHeight = 13;
            this._defaultDrumHeight = 40;
            this._backgroundNoteRows = [];
            this._backgroundDrumRow = beepbox.svgElement("rect");
            this._defaultPinChannels = [
                [new beepbox.TonePin(0, 0, 3), new beepbox.TonePin(0, 2, 3)],
                [new beepbox.TonePin(0, 0, 3), new beepbox.TonePin(0, 2, 3)],
                [new beepbox.TonePin(0, 0, 3), new beepbox.TonePin(0, 2, 3)],
                [new beepbox.TonePin(0, 0, 3), new beepbox.TonePin(0, 2, 0)],
            ];
            this._editorHeight = 481;
            this._mouseDown = false;
            this._mouseOver = false;
            this._mouseDragging = false;
            this._mouseHorizontal = false;
            this._copiedPinChannels = this._defaultPinChannels.concat();
            this._mouseXStart = 0;
            this._mouseYStart = 0;
            this._mouseXPrev = 0;
            this._mouseYPrev = 0;
            this._dragChange = null;
            this._cursor = new beepbox.PatternCursor();
            this._playheadX = 0.0;
            this._octaveOffset = 0;
            this.resetCopiedPins = function () {
                _this._copiedPinChannels = _this._defaultPinChannels.concat();
            };
            this._onEnterFrame = function (timestamp) {
                if (!_this._doc.synth.playing || _this._pattern == null || _this._doc.song.getPattern(_this._doc.channel, Math.floor(_this._doc.synth.playhead)) != _this._pattern) {
                    _this._svgPlayhead.setAttribute("visibility", "hidden");
                }
                else {
                    _this._svgPlayhead.setAttribute("visibility", "visible");
                    var modPlayhead = _this._doc.synth.playhead - Math.floor(_this._doc.synth.playhead);
                    if (Math.abs(modPlayhead - _this._playheadX) > 0.1) {
                        _this._playheadX = modPlayhead;
                    }
                    else {
                        _this._playheadX += (modPlayhead - _this._playheadX) * 0.2;
                    }
                    _this._svgPlayhead.setAttribute("x", "" + prettyNumber(_this._playheadX * _this._editorWidth - 2));
                }
                window.requestAnimationFrame(_this._onEnterFrame);
            };
            this._onMouseOver = function (event) {
                _this._mouseOver = true;
            };
            this._onMouseOut = function (event) {
                _this._mouseOver = false;
            };
            this._onMousePressed = function (event) {
                event.preventDefault();
                if (_this._pattern == null)
                    return;
                _this._mouseDown = true;
                _this._mouseXStart = _this._mouseX;
                _this._mouseYStart = _this._mouseY;
                _this._mouseXPrev = _this._mouseX;
                _this._mouseYPrev = _this._mouseY;
                _this._updateCursorStatus();
                _this._updatePreview();
            };
            this._onTouchPressed = function (event) {
                event.preventDefault();
                if (_this._pattern == null)
                    return;
                _this._mouseDown = true;
                var boundingRect = _this._svg.getBoundingClientRect();
                _this._mouseX = event.touches[0].clientX - boundingRect.left;
                _this._mouseY = event.touches[0].clientY - boundingRect.top;
                _this._mouseXStart = _this._mouseX;
                _this._mouseYStart = _this._mouseY;
                _this._mouseXPrev = _this._mouseX;
                _this._mouseYPrev = _this._mouseY;
                _this._updateCursorStatus();
                _this._updatePreview();
            };
            this._onMouseMoved = function (event) {
                var boundingRect = _this._svg.getBoundingClientRect();
                _this._mouseX = (event.clientX || event.pageX) - boundingRect.left;
                _this._mouseY = (event.clientY || event.pageY) - boundingRect.top;
                _this._onCursorMoved();
            };
            this._onTouchMoved = function (event) {
                if (!_this._mouseDown)
                    return;
                event.preventDefault();
                var boundingRect = _this._svg.getBoundingClientRect();
                _this._mouseX = event.touches[0].clientX - boundingRect.left;
                _this._mouseY = event.touches[0].clientY - boundingRect.top;
                _this._onCursorMoved();
            };
            this._onCursorReleased = function (event) {
                if (!_this._cursor.valid)
                    return;
                if (_this._pattern == null)
                    return;
                if (_this._mouseDragging) {
                    if (_this._dragChange != null) {
                        _this._doc.history.record(_this._dragChange);
                        _this._dragChange = null;
                    }
                }
                else if (_this._mouseDown) {
                    if (_this._cursor.curTone == null) {
                        var tone = new beepbox.Tone(_this._cursor.note, _this._cursor.start, _this._cursor.end, 3, _this._doc.channel == 3);
                        tone.pins = [];
                        for (var _i = 0, _a = _this._cursor.pins; _i < _a.length; _i++) {
                            var oldPin = _a[_i];
                            tone.pins.push(new beepbox.TonePin(0, oldPin.time, oldPin.volume));
                        }
                        _this._doc.history.record(new beepbox.ChangeToneAdded(_this._doc, _this._pattern, tone, _this._cursor.curIndex));
                    }
                    else {
                        if (_this._cursor.noteIndex == -1) {
                            var sequence = new beepbox.ChangeSequence();
                            if (_this._cursor.curTone.notes.length == 4) {
                                sequence.append(new beepbox.ChangeNoteAdded(_this._doc, _this._pattern, _this._cursor.curTone, _this._cursor.curTone.notes[0], 0, true));
                            }
                            sequence.append(new beepbox.ChangeNoteAdded(_this._doc, _this._pattern, _this._cursor.curTone, _this._cursor.note, _this._cursor.curTone.notes.length));
                            _this._doc.history.record(sequence);
                            _this._copyPins(_this._cursor.curTone);
                        }
                        else {
                            if (_this._cursor.curTone.notes.length == 1) {
                                _this._doc.history.record(new beepbox.ChangeToneAdded(_this._doc, _this._pattern, _this._cursor.curTone, _this._cursor.curIndex, true));
                            }
                            else {
                                _this._doc.history.record(new beepbox.ChangeNoteAdded(_this._doc, _this._pattern, _this._cursor.curTone, _this._cursor.note, _this._cursor.curTone.notes.indexOf(_this._cursor.note), true));
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
                _this._partWidth = _this._editorWidth / (_this._doc.song.beats * _this._doc.song.parts);
                _this._noteHeight = _this._doc.channel == 3 ? _this._defaultDrumHeight : _this._defaultNoteHeight;
                _this._noteCount = _this._doc.channel == 3 ? beepbox.Music.drumCount : beepbox.Music.noteCount;
                _this._octaveOffset = _this._doc.song.channelOctaves[_this._doc.channel] * 12;
                _this._copiedPins = _this._copiedPinChannels[_this._doc.channel];
                _this._svg.setAttribute("width", "" + _this._editorWidth);
                _this._svgBackground.setAttribute("width", "" + _this._editorWidth);
                _this._svgNoteBackground.setAttribute("width", "" + (_this._editorWidth / _this._doc.song.beats));
                _this._svgDrumBackground.setAttribute("width", "" + (_this._editorWidth / _this._doc.song.beats));
                if (!_this._mouseDown)
                    _this._updateCursorStatus();
                _this._svgNoteContainer = makeEmptyReplacementElement(_this._svgNoteContainer);
                _this._updatePreview();
                if (_this._pattern == null) {
                    _this._svg.setAttribute("visibility", "hidden");
                    return;
                }
                _this._svg.setAttribute("visibility", "visible");
                for (var j = 0; j < 12; j++) {
                    var color = "#444444";
                    if (j == 0)
                        color = "#886644";
                    if (j == 7 && _this._doc.showFifth)
                        color = "#446688";
                    var rectangle = _this._backgroundNoteRows[j];
                    rectangle.setAttribute("width", "" + (_this._partWidth * _this._doc.song.parts - 2));
                    rectangle.setAttribute("fill", color);
                    rectangle.setAttribute("visibility", beepbox.Music.scaleFlags[_this._doc.song.scale][j] ? "visible" : "hidden");
                }
                _this._backgroundDrumRow.setAttribute("width", "" + (_this._partWidth * _this._doc.song.parts - 2));
                if (_this._doc.channel == 3) {
                    _this._svgBackground.setAttribute("fill", "url(#patternEditorDrumBackground)");
                    _this._svgBackground.setAttribute("height", "" + (_this._defaultDrumHeight * beepbox.Music.drumCount));
                    _this._svg.setAttribute("height", "" + (_this._defaultDrumHeight * beepbox.Music.drumCount));
                }
                else {
                    _this._svgBackground.setAttribute("fill", "url(#patternEditorNoteBackground)");
                    _this._svgBackground.setAttribute("height", "" + _this._editorHeight);
                    _this._svg.setAttribute("height", "" + _this._editorHeight);
                }
                if (_this._doc.channel != 3 && _this._doc.showChannels) {
                    for (var channel = 2; channel >= 0; channel--) {
                        if (channel == _this._doc.channel)
                            continue;
                        var pattern2 = _this._doc.song.getPattern(channel, _this._doc.bar);
                        if (pattern2 == null)
                            continue;
                        for (var _i = 0, _a = pattern2.tones; _i < _a.length; _i++) {
                            var tone = _a[_i];
                            for (var _b = 0, _c = tone.notes; _b < _c.length; _b++) {
                                var note = _c[_b];
                                var notePath = beepbox.svgElement("path");
                                notePath.setAttribute("fill", beepbox.SongEditor.noteColorsDim[channel]);
                                notePath.setAttribute("pointer-events", "none");
                                _this._drawNote(notePath, note, tone.start, tone.pins, _this._noteHeight / 2 - 4, false, _this._doc.song.channelOctaves[channel] * 12);
                                _this._svgNoteContainer.appendChild(notePath);
                            }
                        }
                    }
                }
                for (var _d = 0, _e = _this._pattern.tones; _d < _e.length; _d++) {
                    var tone = _e[_d];
                    for (var _f = 0, _g = tone.notes; _f < _g.length; _f++) {
                        var note = _g[_f];
                        var notePath = beepbox.svgElement("path");
                        notePath.setAttribute("fill", beepbox.SongEditor.noteColorsDim[_this._doc.channel]);
                        notePath.setAttribute("pointer-events", "none");
                        _this._drawNote(notePath, note, tone.start, tone.pins, _this._noteHeight / 2 + 1, false, _this._octaveOffset);
                        _this._svgNoteContainer.appendChild(notePath);
                        notePath = beepbox.svgElement("path");
                        notePath.setAttribute("fill", beepbox.SongEditor.noteColorsBright[_this._doc.channel]);
                        notePath.setAttribute("pointer-events", "none");
                        _this._drawNote(notePath, note, tone.start, tone.pins, _this._noteHeight / 2 + 1, true, _this._octaveOffset);
                        _this._svgNoteContainer.appendChild(notePath);
                    }
                }
            };
            for (var i = 0; i < 12; i++) {
                var y = (12 - i) % 12;
                var rectangle = beepbox.svgElement("rect");
                rectangle.setAttribute("x", "1");
                rectangle.setAttribute("y", "" + (y * this._defaultNoteHeight + 1));
                rectangle.setAttribute("height", "" + (this._defaultNoteHeight - 2));
                this._svgNoteBackground.appendChild(rectangle);
                this._backgroundNoteRows[i] = rectangle;
            }
            this._backgroundDrumRow.setAttribute("x", "1");
            this._backgroundDrumRow.setAttribute("y", "1");
            this._backgroundDrumRow.setAttribute("height", "" + (this._defaultDrumHeight - 2));
            this._backgroundDrumRow.setAttribute("fill", "#444444");
            this._svgDrumBackground.appendChild(this._backgroundDrumRow);
            this._doc.watch(this._documentChanged);
            this._documentChanged();
            this._updateCursorStatus();
            this._updatePreview();
            window.requestAnimationFrame(this._onEnterFrame);
            this._svg.addEventListener("mousedown", this._onMousePressed);
            document.addEventListener("mousemove", this._onMouseMoved);
            document.addEventListener("mouseup", this._onCursorReleased);
            this._svg.addEventListener("mouseover", this._onMouseOver);
            this._svg.addEventListener("mouseout", this._onMouseOut);
            this._svg.addEventListener("touchstart", this._onTouchPressed);
            document.addEventListener("touchmove", this._onTouchMoved);
            document.addEventListener("touchend", this._onCursorReleased);
            document.addEventListener("touchcancel", this._onCursorReleased);
        }
        PatternEditor.prototype._updateCursorStatus = function () {
            if (this._pattern == null)
                return;
            this._cursor = new beepbox.PatternCursor();
            if (this._mouseX < 0 || this._mouseX > this._editorWidth || this._mouseY < 0 || this._mouseY > this._editorHeight)
                return;
            this._cursor.part = Math.floor(Math.max(0, Math.min(this._doc.song.beats * this._doc.song.parts - 1, this._mouseX / this._partWidth)));
            for (var _i = 0, _a = this._pattern.tones; _i < _a.length; _i++) {
                var tone = _a[_i];
                if (tone.end <= this._cursor.part) {
                    this._cursor.prevTone = tone;
                    this._cursor.curIndex++;
                }
                else if (tone.start <= this._cursor.part && tone.end > this._cursor.part) {
                    this._cursor.curTone = tone;
                }
                else if (tone.start > this._cursor.part) {
                    this._cursor.nextTone = tone;
                    break;
                }
            }
            var mousePitch = this._findMousePitch(this._mouseY);
            if (this._cursor.curTone != null) {
                this._cursor.start = this._cursor.curTone.start;
                this._cursor.end = this._cursor.curTone.end;
                this._cursor.pins = this._cursor.curTone.pins;
                var interval = void 0;
                var error = void 0;
                var prevPin = void 0;
                var nextPin = this._cursor.curTone.pins[0];
                for (var j = 1; j < this._cursor.curTone.pins.length; j++) {
                    prevPin = nextPin;
                    nextPin = this._cursor.curTone.pins[j];
                    var leftSide = this._partWidth * (this._cursor.curTone.start + prevPin.time);
                    var rightSide = this._partWidth * (this._cursor.curTone.start + nextPin.time);
                    if (this._mouseX > rightSide)
                        continue;
                    if (this._mouseX < leftSide)
                        throw new Error();
                    var intervalRatio = (this._mouseX - leftSide) / (rightSide - leftSide);
                    var arc = Math.sqrt(1.0 / Math.sqrt(4.0) - Math.pow(intervalRatio - 0.5, 2.0)) - 0.5;
                    var bendHeight = Math.abs(nextPin.interval - prevPin.interval);
                    interval = prevPin.interval * (1.0 - intervalRatio) + nextPin.interval * intervalRatio;
                    error = arc * bendHeight + 1.0;
                    break;
                }
                var minInterval = Number.MAX_VALUE;
                var maxInterval = -Number.MAX_VALUE;
                var bestDistance = Number.MAX_VALUE;
                for (var _b = 0, _c = this._cursor.curTone.pins; _b < _c.length; _b++) {
                    var pin = _c[_b];
                    if (minInterval > pin.interval)
                        minInterval = pin.interval;
                    if (maxInterval < pin.interval)
                        maxInterval = pin.interval;
                    var pinDistance = Math.abs(this._cursor.curTone.start + pin.time - this._mouseX / this._partWidth);
                    if (bestDistance > pinDistance) {
                        bestDistance = pinDistance;
                        this._cursor.nearPinIndex = this._cursor.curTone.pins.indexOf(pin);
                    }
                }
                mousePitch -= interval;
                this._cursor.note = this._snapToNote(mousePitch, -minInterval, (this._doc.channel == 3 ? beepbox.Music.drumCount - 1 : beepbox.Music.maxPitch) - maxInterval);
                var nearest = error;
                for (var i = 0; i < this._cursor.curTone.notes.length; i++) {
                    var distance = Math.abs(this._cursor.curTone.notes[i] - mousePitch + 0.5);
                    if (distance > nearest)
                        continue;
                    nearest = distance;
                    this._cursor.note = this._cursor.curTone.notes[i];
                }
                for (var i = 0; i < this._cursor.curTone.notes.length; i++) {
                    if (this._cursor.curTone.notes[i] == this._cursor.note) {
                        this._cursor.noteIndex = i;
                        break;
                    }
                }
            }
            else {
                this._cursor.note = this._snapToNote(mousePitch, 0, beepbox.Music.maxPitch);
                var defaultLength = this._copiedPins[this._copiedPins.length - 1].time;
                var quadBeats = Math.floor(this._cursor.part / this._doc.song.parts);
                var modLength = defaultLength % this._doc.song.parts;
                var modMouse = this._cursor.part % this._doc.song.parts;
                if (defaultLength == 1) {
                    this._cursor.start = this._cursor.part;
                }
                else if (modLength == 0) {
                    this._cursor.start = quadBeats * this._doc.song.parts;
                    if (this._doc.song.parts >> 1 == this._doc.song.parts / 2 && modMouse > this._doc.song.parts / 2 && defaultLength == this._doc.song.parts) {
                        this._cursor.start += this._doc.song.parts / 2;
                    }
                }
                else {
                    this._cursor.start = quadBeats * this._doc.song.parts;
                    if (modLength == this._doc.song.parts / 2) {
                        if (modMouse >= this._doc.song.parts / 2) {
                            this._cursor.start += this._doc.song.parts - modLength;
                        }
                    }
                    else {
                        if (modMouse > this._doc.song.parts / 2) {
                            this._cursor.start += this._doc.song.parts - modLength;
                        }
                    }
                }
                this._cursor.end = this._cursor.start + defaultLength;
                var forceStart = 0;
                var forceEnd = this._doc.song.beats * this._doc.song.parts;
                if (this._cursor.prevTone != null) {
                    forceStart = this._cursor.prevTone.end;
                }
                if (this._cursor.nextTone != null) {
                    forceEnd = this._cursor.nextTone.start;
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
                            this._cursor.pins.push(new beepbox.TonePin(0, oldPin.time, oldPin.volume));
                            if (oldPin.time == this._cursor.end - this._cursor.start)
                                break;
                        }
                        else {
                            this._cursor.pins.push(new beepbox.TonePin(0, this._cursor.end - this._cursor.start, oldPin.volume));
                            break;
                        }
                    }
                }
            }
            this._cursor.valid = true;
        };
        PatternEditor.prototype._findMousePitch = function (pixelY) {
            return Math.max(0, Math.min(this._noteCount - 1, this._noteCount - (pixelY / this._noteHeight))) + this._octaveOffset;
        };
        PatternEditor.prototype._snapToNote = function (guess, min, max) {
            if (guess < min)
                guess = min;
            if (guess > max)
                guess = max;
            var scale = beepbox.Music.scaleFlags[this._doc.song.scale];
            if (scale[Math.floor(guess) % 12] || this._doc.channel == 3) {
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
        };
        PatternEditor.prototype._copyPins = function (tone) {
            this._copiedPins = [];
            for (var _i = 0, _a = tone.pins; _i < _a.length; _i++) {
                var oldPin = _a[_i];
                this._copiedPins.push(new beepbox.TonePin(0, oldPin.time, oldPin.volume));
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
        PatternEditor.prototype._onCursorMoved = function () {
            var start;
            var end;
            if (this._pattern == null)
                return;
            if (this._mouseDown && this._cursor.valid) {
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
                        this._dragChange = null;
                    }
                    var currentPart = Math.floor(this._mouseX / this._partWidth);
                    var sequence = new beepbox.ChangeSequence();
                    if (this._cursor.curTone == null) {
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
                        for (var i_1 = 0; i_1 <= this._doc.song.beats * this._doc.song.parts; i_1++) {
                            if (i_1 >= 5 &&
                                i_1 % this._doc.song.parts != 0 &&
                                i_1 != this._doc.song.parts * 3.0 / 2.0 &&
                                i_1 != this._doc.song.parts * 4.0 / 3.0 &&
                                i_1 != this._doc.song.parts * 5.0 / 3.0) {
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
                            end = this._cursor.start;
                            start = end - defaultLength;
                        }
                        else {
                            start = this._cursor.start;
                            end = start + defaultLength;
                        }
                        if (start < 0)
                            start = 0;
                        if (end > this._doc.song.beats * this._doc.song.parts)
                            end = this._doc.song.beats * this._doc.song.parts;
                        sequence.append(new beepbox.ChangeToneTruncate(this._doc, this._pattern, start, end));
                        var i = void 0;
                        for (i = 0; i < this._pattern.tones.length; i++) {
                            if (this._pattern.tones[i].start >= end)
                                break;
                        }
                        var theTone = new beepbox.Tone(this._cursor.note, start, end, 3, this._doc.channel == 3);
                        sequence.append(new beepbox.ChangeToneAdded(this._doc, this._pattern, theTone, i));
                        this._copyPins(theTone);
                    }
                    else if (this._mouseHorizontal) {
                        var shift = Math.round((this._mouseX - this._mouseXStart) / this._partWidth);
                        var shiftedPin = this._cursor.curTone.pins[this._cursor.nearPinIndex];
                        var shiftedTime = this._cursor.curTone.start + shiftedPin.time + shift;
                        if (shiftedTime < 0)
                            shiftedTime = 0;
                        if (shiftedTime > this._doc.song.beats * this._doc.song.parts)
                            shiftedTime = this._doc.song.beats * this._doc.song.parts;
                        if (shiftedTime <= this._cursor.curTone.start && this._cursor.nearPinIndex == this._cursor.curTone.pins.length - 1 ||
                            shiftedTime >= this._cursor.curTone.end && this._cursor.nearPinIndex == 0) {
                            sequence.append(new beepbox.ChangeToneAdded(this._doc, this._pattern, this._cursor.curTone, this._cursor.curIndex, true));
                        }
                        else {
                            start = Math.min(this._cursor.curTone.start, shiftedTime);
                            end = Math.max(this._cursor.curTone.end, shiftedTime);
                            sequence.append(new beepbox.ChangeToneTruncate(this._doc, this._pattern, start, end, this._cursor.curTone));
                            sequence.append(new beepbox.ChangePinTime(this._doc, this._cursor.curTone, this._cursor.nearPinIndex, shiftedTime));
                            this._copyPins(this._cursor.curTone);
                        }
                    }
                    else if (this._cursor.noteIndex == -1) {
                        var bendPart = Math.round(Math.max(this._cursor.curTone.start, Math.min(this._cursor.curTone.end, this._mouseX / this._partWidth))) - this._cursor.curTone.start;
                        var prevPin = void 0;
                        var nextPin = this._cursor.curTone.pins[0];
                        var bendVolume = void 0;
                        var bendInterval = void 0;
                        for (var i = 1; i < this._cursor.curTone.pins.length; i++) {
                            prevPin = nextPin;
                            nextPin = this._cursor.curTone.pins[i];
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
                            bendInterval = this._snapToNote(prevPin.interval * (1.0 - volumeRatio) + nextPin.interval * volumeRatio + this._cursor.curTone.notes[0], 0, beepbox.Music.maxPitch) - this._cursor.curTone.notes[0];
                            break;
                        }
                        sequence.append(new beepbox.ChangeVolumeBend(this._doc, this._pattern, this._cursor.curTone, bendPart, bendVolume, bendInterval));
                        this._copyPins(this._cursor.curTone);
                    }
                    else {
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
                        if (bendEnd > this._doc.song.beats * this._doc.song.parts)
                            bendEnd = this._doc.song.beats * this._doc.song.parts;
                        if (bendEnd > this._cursor.curTone.end) {
                            sequence.append(new beepbox.ChangeToneTruncate(this._doc, this._pattern, this._cursor.curTone.start, bendEnd, this._cursor.curTone));
                        }
                        if (bendEnd < this._cursor.curTone.start) {
                            sequence.append(new beepbox.ChangeToneTruncate(this._doc, this._pattern, bendEnd, this._cursor.curTone.end, this._cursor.curTone));
                        }
                        var minNote = Number.MAX_VALUE;
                        var maxNote = -Number.MAX_VALUE;
                        for (var _i = 0, _a = this._cursor.curTone.notes; _i < _a.length; _i++) {
                            var note = _a[_i];
                            if (minNote > note)
                                minNote = note;
                            if (maxNote < note)
                                maxNote = note;
                        }
                        minNote -= this._cursor.curTone.notes[0];
                        maxNote -= this._cursor.curTone.notes[0];
                        var bendTo = this._snapToNote(this._findMousePitch(this._mouseY), -minNote, beepbox.Music.maxPitch - maxNote);
                        sequence.append(new beepbox.ChangePitchBend(this._doc, this._cursor.curTone, bendStart, bendEnd, bendTo, this._cursor.noteIndex));
                        this._copyPins(this._cursor.curTone);
                    }
                    this._dragChange = sequence;
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
            if (!this._mouseOver || this._mouseDown || !this._cursor.valid || this._pattern == null) {
                this._svgPreview.setAttribute("visibility", "hidden");
            }
            else {
                this._svgPreview.setAttribute("visibility", "visible");
                this._drawNote(this._svgPreview, this._cursor.note, this._cursor.start, this._cursor.pins, this._noteHeight / 2 + 1, true, this._octaveOffset);
            }
        };
        PatternEditor.prototype._drawNote = function (svgElement, note, start, pins, radius, showVolume, offset) {
            var nextPin = pins[0];
            var pathString = "M " + prettyNumber(this._partWidth * (start + nextPin.time) + 1) + " " + prettyNumber(this._noteToPixelHeight(note - offset) + radius * (showVolume ? nextPin.volume / 3.0 : 1.0)) + " ";
            for (var i = 1; i < pins.length; i++) {
                var prevPin = nextPin;
                nextPin = pins[i];
                var prevSide = this._partWidth * (start + prevPin.time) + (i == 1 ? 1 : 0);
                var nextSide = this._partWidth * (start + nextPin.time) - (i == pins.length - 1 ? 1 : 0);
                var prevHeight = this._noteToPixelHeight(note + prevPin.interval - offset);
                var nextHeight = this._noteToPixelHeight(note + nextPin.interval - offset);
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
                var prevHeight = this._noteToPixelHeight(note + prevPin.interval - offset);
                var nextHeight = this._noteToPixelHeight(note + nextPin.interval - offset);
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
        PatternEditor.prototype._noteToPixelHeight = function (note) {
            return this._noteHeight * (this._noteCount - (note) - 0.5);
        };
        return PatternEditor;
    }());
    beepbox.PatternEditor = PatternEditor;
})(beepbox || (beepbox = {}));
"use strict";
var beepbox;
(function (beepbox) {
    var TrackEditor = (function () {
        function TrackEditor(_doc, _songEditor) {
            var _this = this;
            this._doc = _doc;
            this._songEditor = _songEditor;
            this._barWidth = 32;
            this._canvas = beepbox.html.canvas({ width: "512", height: "128" });
            this._preview = beepbox.html.canvas({ width: "32", height: "32" });
            this._playhead = beepbox.html.div({ style: "width: 4px; height: 100%; overflow:hidden; position: absolute; background: #ffffff;" });
            this.container = beepbox.html.div({ style: "width: 512px; height: 128px; position: relative; overflow:hidden;" }, [
                this._canvas,
                this._preview,
                this._playhead,
            ]);
            this._graphics = this._canvas.getContext("2d");
            this._previewGraphics = this._preview.getContext("2d");
            this._editorWidth = 512;
            this._mouseOver = false;
            this._digits = "";
            this._editorHeight = 128;
            this._channelHeight = 32;
            this._onEnterFrame = function (timestamp) {
                _this._playhead.style.left = (_this._barWidth * (_this._doc.synth.playhead - _this._doc.barScrollPos) - 2) + "px";
                window.requestAnimationFrame(_this._onEnterFrame);
            };
            this._onMouseOver = function (event) {
                _this._mouseOver = true;
            };
            this._onMouseOut = function (event) {
                _this._mouseOver = false;
            };
            this._onMousePressed = function (event) {
                event.preventDefault();
                var channel = Math.floor(Math.min(beepbox.Music.numChannels - 1, Math.max(0, _this._mouseY / _this._channelHeight)));
                var bar = Math.floor(Math.min(_this._doc.song.bars - 1, Math.max(0, _this._mouseX / _this._barWidth + _this._doc.barScrollPos)));
                if (_this._doc.channel == channel && _this._doc.bar == bar) {
                    var up = (_this._mouseY % _this._channelHeight) < _this._channelHeight / 2;
                    var patternCount = _this._doc.song.channelPatterns[channel].length;
                    _this._setBarPattern((_this._doc.song.channelBars[channel][bar] + (up ? 1 : patternCount)) % (patternCount + 1));
                }
                else {
                    _this._setChannelBar(channel, bar);
                }
            };
            this._onMouseMoved = function (event) {
                var boundingRect = _this._canvas.getBoundingClientRect();
                _this._mouseX = (event.clientX || event.pageX) - boundingRect.left;
                _this._mouseY = (event.clientY || event.pageY) - boundingRect.top;
                _this._updatePreview();
            };
            this._onMouseReleased = function (event) {
            };
            this._documentChanged = function () {
                _this._pattern = _this._doc.getCurrentPattern();
                _this._editorHeight = _this._doc.song.bars > 16 ? 108 : 128;
                _this._canvas.height = _this._editorHeight;
                _this._canvas.style.width = String(_this._editorHeight);
                _this._channelHeight = _this._editorHeight / beepbox.Music.numChannels;
                _this._render();
            };
            this._pattern = this._doc.getCurrentPattern();
            this._render();
            this._doc.watch(this._documentChanged);
            window.requestAnimationFrame(this._onEnterFrame);
            this.container.addEventListener("mousedown", this._onMousePressed);
            document.addEventListener("mousemove", this._onMouseMoved);
            document.addEventListener("mouseup", this._onMouseReleased);
            this.container.addEventListener("mouseover", this._onMouseOver);
            this.container.addEventListener("mouseout", this._onMouseOut);
        }
        TrackEditor.prototype._setChannelBar = function (channel, bar) {
            var oldBarScrollPos = this._doc.barScrollPos;
            if (this._doc.history.getRecentChange() instanceof beepbox.ChangeChannelBar)
                this._doc.history.undo();
            this._doc.barScrollPos = oldBarScrollPos;
            this._doc.history.record(new beepbox.ChangeChannelBar(this._doc, channel, bar));
            this._digits = "";
        };
        TrackEditor.prototype._setBarPattern = function (pattern) {
            if (this._doc.history.getRecentChange() instanceof beepbox.ChangeBarPattern)
                this._doc.history.undo();
            this._doc.history.record(new beepbox.ChangeBarPattern(this._doc, pattern));
        };
        TrackEditor.prototype.onKeyPressed = function (event) {
            switch (event.keyCode) {
                case 38:
                    this._setChannelBar((this._doc.channel + 3) % beepbox.Music.numChannels, this._doc.bar);
                    event.preventDefault();
                    break;
                case 40:
                    this._setChannelBar((this._doc.channel + 1) % beepbox.Music.numChannels, this._doc.bar);
                    event.preventDefault();
                    break;
                case 37:
                    this._setChannelBar(this._doc.channel, (this._doc.bar + this._doc.song.bars - 1) % this._doc.song.bars);
                    event.preventDefault();
                    break;
                case 39:
                    this._setChannelBar(this._doc.channel, (this._doc.bar + 1) % this._doc.song.bars);
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
            if (parsed <= this._doc.song.patterns) {
                this._setBarPattern(parsed);
                return;
            }
            this._digits = digit;
            parsed = parseInt(this._digits);
            if (parsed <= this._doc.song.patterns) {
                this._setBarPattern(parsed);
                return;
            }
            this._digits = "";
        };
        TrackEditor.prototype._updatePreview = function () {
            this._previewGraphics.clearRect(0, 0, 34, 34);
            if (!this._mouseOver)
                return;
            var channel = Math.floor(Math.min(beepbox.Music.numChannels - 1, Math.max(0, this._mouseY / this._channelHeight)));
            var bar = Math.floor(Math.min(this._doc.song.bars - 1, Math.max(0, this._mouseX / this._barWidth + this._doc.barScrollPos)));
            this._preview.style.left = this._barWidth * (bar - this._doc.barScrollPos) + "px";
            this._preview.style.top = this._channelHeight * channel + "px";
            var selected = (bar == this._doc.bar && channel == this._doc.channel);
            if (selected) {
                var up = (this._mouseY % this._channelHeight) < this._channelHeight / 2;
                var center = this._barWidth * 0.8;
                var middle = this._channelHeight * 0.5;
                var base = this._channelHeight * 0.1;
                var tip = this._channelHeight * 0.4;
                var width = this._channelHeight * 0.175;
                this._previewGraphics.lineWidth = 1;
                this._previewGraphics.strokeStyle = "#000000";
                this._previewGraphics.fillStyle = up ? "#ffffff" : "#000000";
                this._previewGraphics.beginPath();
                this._previewGraphics.moveTo(center, middle - tip);
                this._previewGraphics.lineTo(center + width, middle - base);
                this._previewGraphics.lineTo(center - width, middle - base);
                this._previewGraphics.lineTo(center, middle - tip);
                this._previewGraphics.fill();
                this._previewGraphics.stroke();
                this._previewGraphics.fillStyle = !up ? "#ffffff" : "#000000";
                this._previewGraphics.beginPath();
                this._previewGraphics.moveTo(center, middle + tip);
                this._previewGraphics.lineTo(center + width, middle + base);
                this._previewGraphics.lineTo(center - width, middle + base);
                this._previewGraphics.lineTo(center, middle + tip);
                this._previewGraphics.fill();
                this._previewGraphics.stroke();
            }
            else {
                this._previewGraphics.lineWidth = 2;
                this._previewGraphics.strokeStyle = "#ffffff";
                this._previewGraphics.strokeRect(1, 1, this._barWidth - 2, this._channelHeight - 2);
            }
        };
        TrackEditor.prototype._render = function () {
            this._graphics.clearRect(0, 0, this._editorWidth, this._editorHeight);
            var renderCount = Math.min(16, this._doc.song.bars);
            for (var j = 0; j < beepbox.Music.numChannels; j++) {
                var channelColor = beepbox.SongEditor.channelColorsBright[j];
                var channelDim = beepbox.SongEditor.channelColorsDim[j];
                for (var i = 0; i < renderCount; i++) {
                    var pattern = this._doc.song.getPattern(j, i + this._doc.barScrollPos);
                    var selected = (i + this._doc.barScrollPos == this._doc.bar && j == this._doc.channel);
                    if (selected || pattern != null) {
                        this._graphics.fillStyle = (selected ? channelColor : "#444444");
                        this._graphics.fillRect(this._barWidth * i + 1, this._channelHeight * j + 1, this._barWidth - 2, this._channelHeight - 2);
                    }
                    var text = String(this._doc.song.channelBars[j][i + this._doc.barScrollPos]);
                    this._graphics.font = "bold 20px sans-serif";
                    this._graphics.textAlign = 'center';
                    this._graphics.textBaseline = 'middle';
                    this._graphics.fillStyle = selected ? "#000000" : (pattern == null || pattern.tones.length == 0 ? channelDim : channelColor);
                    this._graphics.fillText(text, this._barWidth * (i + 0.5), this._channelHeight * (j + 0.5) + 1.0);
                }
            }
            this._updatePreview();
        };
        return TrackEditor;
    }());
    beepbox.TrackEditor = TrackEditor;
})(beepbox || (beepbox = {}));
"use strict";
var beepbox;
(function (beepbox) {
    var LoopEditor = (function () {
        function LoopEditor(_doc) {
            var _this = this;
            this._doc = _doc;
            this._canvas = beepbox.html.canvas({ width: "512", height: "20" });
            this._preview = beepbox.html.canvas({ width: "512", height: "20" });
            this.container = beepbox.html.div({ style: "width: 512px; height: 20px; position: relative;" }, [
                this._canvas,
                this._preview,
            ]);
            this._graphics = this._canvas.getContext("2d");
            this._previewGraphics = this._preview.getContext("2d");
            this._barWidth = 32;
            this._editorWidth = 512;
            this._editorHeight = 20;
            this._startMode = 0;
            this._endMode = 1;
            this._bothMode = 2;
            this._cursor = {};
            this._mouseDown = false;
            this._mouseOver = false;
            this._onMouseOver = function (event) {
                _this._mouseOver = true;
            };
            this._onMouseOut = function (event) {
                _this._mouseOver = false;
            };
            this._onMousePressed = function (event) {
                event.preventDefault();
                _this._mouseDown = true;
                _this._updateCursorStatus();
                _this._updatePreview();
                _this._onMouseMoved(event);
            };
            this._onTouchPressed = function (event) {
                event.preventDefault();
                _this._mouseDown = true;
                var boundingRect = _this._canvas.getBoundingClientRect();
                _this._mouseX = event.touches[0].clientX - boundingRect.left;
                _this._mouseY = event.touches[0].clientY - boundingRect.top;
                _this._updateCursorStatus();
                _this._updatePreview();
                _this._onTouchMoved(event);
            };
            this._onMouseMoved = function (event) {
                var boundingRect = _this._canvas.getBoundingClientRect();
                _this._mouseX = (event.clientX || event.pageX) - boundingRect.left;
                _this._mouseY = (event.clientY || event.pageY) - boundingRect.top;
                _this._onCursorMoved();
            };
            this._onTouchMoved = function (event) {
                if (!_this._mouseDown)
                    return;
                event.preventDefault();
                var boundingRect = _this._canvas.getBoundingClientRect();
                _this._mouseX = event.touches[0].clientX - boundingRect.left;
                _this._mouseY = event.touches[0].clientY - boundingRect.top;
                _this._onCursorMoved();
            };
            this._onCursorReleased = function (event) {
                if (_this._mouseDown) {
                    if (_this._change != null) {
                        _this._doc.history.record(_this._change);
                        _this._change = null;
                    }
                }
                _this._mouseDown = false;
                _this._updateCursorStatus();
                _this._render();
            };
            this._documentChanged = function () {
                _this._render();
            };
            this._updateCursorStatus();
            this._render();
            this._doc.watch(this._documentChanged);
            this.container.addEventListener("mousedown", this._onMousePressed);
            document.addEventListener("mousemove", this._onMouseMoved);
            document.addEventListener("mouseup", this._onCursorReleased);
            this.container.addEventListener("mouseover", this._onMouseOver);
            this.container.addEventListener("mouseout", this._onMouseOut);
            this.container.addEventListener("touchstart", this._onTouchPressed);
            document.addEventListener("touchmove", this._onTouchMoved);
            document.addEventListener("touchend", this._onCursorReleased);
            document.addEventListener("touchcancel", this._onCursorReleased);
        }
        LoopEditor.prototype._updateCursorStatus = function () {
            var bar = this._mouseX / this._barWidth + this._doc.barScrollPos;
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
            if (end > this._doc.song.bars) {
                start -= end - this._doc.song.bars;
                end = this._doc.song.bars;
            }
            return { start: start, length: end - start };
        };
        LoopEditor.prototype._onCursorMoved = function () {
            if (this._mouseDown) {
                if (this._change != null)
                    this._change.undo();
                this._change = null;
                var bar = this._mouseX / this._barWidth + this._doc.barScrollPos;
                var start = void 0;
                var end = void 0;
                var temp = void 0;
                if (this._cursor.mode == this._startMode) {
                    start = this._doc.song.loopStart + Math.round(bar - this._cursor.startBar);
                    end = this._doc.song.loopStart + this._doc.song.loopLength;
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
                    if (end >= this._doc.song.bars)
                        end = this._doc.song.bars;
                    this._change = new beepbox.ChangeLoop(this._doc, start, end - start);
                }
                else if (this._cursor.mode == this._endMode) {
                    start = this._doc.song.loopStart;
                    end = this._doc.song.loopStart + this._doc.song.loopLength + Math.round(bar - this._cursor.startBar);
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
                    if (end >= this._doc.song.bars)
                        end = this._doc.song.bars;
                    this._change = new beepbox.ChangeLoop(this._doc, start, end - start);
                }
                else if (this._cursor.mode == this._bothMode) {
                    var endPoints = this._findEndPoints(bar);
                    this._change = new beepbox.ChangeLoop(this._doc, endPoints.start, endPoints.length);
                }
            }
            else {
                this._updateCursorStatus();
                this._updatePreview();
            }
        };
        LoopEditor.prototype._updatePreview = function () {
            this._previewGraphics.clearRect(0, 0, this._editorWidth, this._editorHeight);
            if (!this._mouseOver || this._mouseDown)
                return;
            var radius = this._editorHeight / 2;
            if (this._cursor.mode == this._startMode) {
                this._previewGraphics.fillStyle = "#ffffff";
                this._previewGraphics.beginPath();
                this._previewGraphics.arc((this._doc.song.loopStart - this._doc.barScrollPos) * this._barWidth + radius, radius, radius - 4, 0, 2 * Math.PI);
                this._previewGraphics.fill();
            }
            else if (this._cursor.mode == this._endMode) {
                this._previewGraphics.fillStyle = "#ffffff";
                this._previewGraphics.beginPath();
                this._previewGraphics.arc((this._doc.song.loopStart + this._doc.song.loopLength - this._doc.barScrollPos) * this._barWidth - radius, radius, radius - 4, 0, 2 * Math.PI);
                this._previewGraphics.fill();
            }
            else if (this._cursor.mode == this._bothMode) {
                var endPoints = this._findEndPoints(this._cursor.startBar);
                this._previewGraphics.fillStyle = "#ffffff";
                this._previewGraphics.beginPath();
                this._previewGraphics.arc((endPoints.start - this._doc.barScrollPos) * this._barWidth + radius, radius, radius - 4, 0, 2 * Math.PI);
                this._previewGraphics.fill();
                this._previewGraphics.fillStyle = "#ffffff";
                this._previewGraphics.fillRect((endPoints.start - this._doc.barScrollPos) * this._barWidth + radius, 4, endPoints.length * this._barWidth - this._editorHeight, this._editorHeight - 8);
                this._previewGraphics.fillStyle = "#ffffff";
                this._previewGraphics.beginPath();
                this._previewGraphics.arc((endPoints.start + endPoints.length - this._doc.barScrollPos) * this._barWidth - radius, radius, radius - 4, 0, 2 * Math.PI);
                this._previewGraphics.fill();
            }
        };
        LoopEditor.prototype._render = function () {
            this._graphics.clearRect(0, 0, this._editorWidth, this._editorHeight);
            var radius = this._editorHeight / 2;
            this._graphics.fillStyle = "#7744ff";
            this._graphics.beginPath();
            this._graphics.arc((this._doc.song.loopStart - this._doc.barScrollPos) * this._barWidth + radius, radius, radius, 0, 2 * Math.PI);
            this._graphics.fill();
            this._graphics.fillRect((this._doc.song.loopStart - this._doc.barScrollPos) * this._barWidth + radius, 0, this._doc.song.loopLength * this._barWidth - this._editorHeight, this._editorHeight);
            this._graphics.beginPath();
            this._graphics.arc((this._doc.song.loopStart + this._doc.song.loopLength - this._doc.barScrollPos) * this._barWidth - radius, radius, radius, 0, 2 * Math.PI);
            this._graphics.fill();
            this._graphics.fillStyle = "#000000";
            this._graphics.beginPath();
            this._graphics.arc((this._doc.song.loopStart - this._doc.barScrollPos) * this._barWidth + radius, radius, radius - 4, 0, 2 * Math.PI);
            this._graphics.fill();
            this._graphics.fillRect((this._doc.song.loopStart - this._doc.barScrollPos) * this._barWidth + radius, 4, this._doc.song.loopLength * this._barWidth - this._editorHeight, this._editorHeight - 8);
            this._graphics.beginPath();
            this._graphics.arc((this._doc.song.loopStart + this._doc.song.loopLength - this._doc.barScrollPos) * this._barWidth - radius, radius, radius - 4, 0, 2 * Math.PI);
            this._graphics.fill();
            this._updatePreview();
        };
        return LoopEditor;
    }());
    beepbox.LoopEditor = LoopEditor;
})(beepbox || (beepbox = {}));
"use strict";
var beepbox;
(function (beepbox) {
    var BarScrollBar = (function () {
        function BarScrollBar(_doc) {
            var _this = this;
            this._doc = _doc;
            this._canvas = beepbox.html.canvas({ width: "512", height: "20" });
            this._preview = beepbox.html.canvas({ width: "512", height: "20" });
            this.container = beepbox.html.div({ style: "width: 512px; height: 20px; position: relative;" }, [
                this._canvas,
                this._preview,
            ]);
            this._graphics = this._canvas.getContext("2d");
            this._previewGraphics = this._preview.getContext("2d");
            this._editorWidth = 512;
            this._editorHeight = 20;
            this._mouseDown = false;
            this._mouseOver = false;
            this._dragging = false;
            this._onMouseOver = function (event) {
                _this._mouseOver = true;
            };
            this._onMouseOut = function (event) {
                _this._mouseOver = false;
            };
            this._onMousePressed = function (event) {
                event.preventDefault();
                _this._mouseDown = true;
                _this._updatePreview();
                if (_this._mouseX >= _this._doc.barScrollPos * _this._barWidth && _this._mouseX <= (_this._doc.barScrollPos + 16) * _this._barWidth) {
                    _this._dragging = true;
                    _this._dragStart = _this._mouseX;
                }
            };
            this._onTouchPressed = function (event) {
                event.preventDefault();
                _this._mouseDown = true;
                var boundingRect = _this._canvas.getBoundingClientRect();
                _this._mouseX = event.touches[0].clientX - boundingRect.left;
                _this._mouseY = event.touches[0].clientY - boundingRect.top;
                _this._updatePreview();
                if (_this._mouseX >= _this._doc.barScrollPos * _this._barWidth && _this._mouseX <= (_this._doc.barScrollPos + 16) * _this._barWidth) {
                    _this._dragging = true;
                    _this._dragStart = _this._mouseX;
                }
            };
            this._onMouseMoved = function (event) {
                var boundingRect = _this._canvas.getBoundingClientRect();
                _this._mouseX = (event.clientX || event.pageX) - boundingRect.left;
                _this._mouseY = (event.clientY || event.pageY) - boundingRect.top;
                _this._onCursorMoved();
            };
            this._onTouchMoved = function (event) {
                if (!_this._mouseDown)
                    return;
                event.preventDefault();
                var boundingRect = _this._canvas.getBoundingClientRect();
                _this._mouseX = event.touches[0].clientX - boundingRect.left;
                _this._mouseY = event.touches[0].clientY - boundingRect.top;
                _this._onCursorMoved();
            };
            this._onCursorReleased = function (event) {
                if (!_this._dragging && _this._mouseDown) {
                    if (_this._mouseX < (_this._doc.barScrollPos + 8) * _this._barWidth) {
                        if (_this._doc.barScrollPos > 0)
                            _this._doc.barScrollPos--;
                        _this._doc.changed();
                    }
                    else {
                        if (_this._doc.barScrollPos < _this._doc.song.bars - 16)
                            _this._doc.barScrollPos++;
                        _this._doc.changed();
                    }
                }
                _this._mouseDown = false;
                _this._dragging = false;
                _this._updatePreview();
            };
            this._documentChanged = function () {
                _this._barWidth = (_this._editorWidth - 1) / Math.max(16, _this._doc.song.bars);
                _this._render();
            };
            this._doc.watch(this._documentChanged);
            this._documentChanged();
            this.container.addEventListener("mousedown", this._onMousePressed);
            document.addEventListener("mousemove", this._onMouseMoved);
            document.addEventListener("mouseup", this._onCursorReleased);
            this.container.addEventListener("mouseover", this._onMouseOver);
            this.container.addEventListener("mouseout", this._onMouseOut);
            this.container.addEventListener("touchstart", this._onTouchPressed);
            document.addEventListener("touchmove", this._onTouchMoved);
            document.addEventListener("touchend", this._onCursorReleased);
            document.addEventListener("touchcancel", this._onCursorReleased);
        }
        BarScrollBar.prototype._onCursorMoved = function () {
            if (this._dragging) {
                while (this._mouseX - this._dragStart < -this._barWidth * 0.5) {
                    if (this._doc.barScrollPos > 0) {
                        this._doc.barScrollPos--;
                        this._dragStart -= this._barWidth;
                        this._doc.changed();
                    }
                    else {
                        break;
                    }
                }
                while (this._mouseX - this._dragStart > this._barWidth * 0.5) {
                    if (this._doc.barScrollPos < this._doc.song.bars - 16) {
                        this._doc.barScrollPos++;
                        this._dragStart += this._barWidth;
                        this._doc.changed();
                    }
                    else {
                        break;
                    }
                }
            }
            this._updatePreview();
        };
        BarScrollBar.prototype._updatePreview = function () {
            this._previewGraphics.clearRect(0, 0, this._editorWidth, this._editorHeight);
            if (!this._mouseOver || this._mouseDown)
                return;
            var center = this._editorHeight * 0.5;
            var base = 20;
            var tip = 9;
            var arrowHeight = 6;
            if (this._mouseX < this._doc.barScrollPos * this._barWidth) {
                this._previewGraphics.fillStyle = "#ffffff";
                this._previewGraphics.beginPath();
                this._previewGraphics.moveTo(tip, center);
                this._previewGraphics.lineTo(base, center + arrowHeight);
                this._previewGraphics.lineTo(base, center - arrowHeight);
                this._previewGraphics.lineTo(tip, center);
                this._previewGraphics.fill();
            }
            else if (this._mouseX > (this._doc.barScrollPos + 16) * this._barWidth) {
                this._previewGraphics.fillStyle = "#ffffff";
                this._previewGraphics.beginPath();
                this._previewGraphics.moveTo(this._editorWidth - tip, center);
                this._previewGraphics.lineTo(this._editorWidth - base, center + arrowHeight);
                this._previewGraphics.lineTo(this._editorWidth - base, center - arrowHeight);
                this._previewGraphics.lineTo(this._editorWidth - tip, center);
                this._previewGraphics.fill();
            }
            else {
                this._previewGraphics.lineWidth = 2;
                this._previewGraphics.strokeStyle = "#ffffff";
                this._previewGraphics.strokeRect(this._doc.barScrollPos * this._barWidth, 1, 16 * this._barWidth, this._editorHeight - 2);
            }
        };
        BarScrollBar.prototype._render = function () {
            this._graphics.clearRect(0, 0, this._editorWidth, this._editorHeight);
            this._graphics.fillStyle = "#444444";
            this._graphics.fillRect(this._barWidth * this._doc.barScrollPos, 2, this._barWidth * 16, this._editorHeight - 4);
            for (var i = 0; i <= this._doc.song.bars; i++) {
                var lineWidth = (i % 16 == 0) ? 2 : 0;
                var lineHeight = (i % 16 == 0) ? 0 : ((i % 4 == 0) ? this._editorHeight / 8 : this._editorHeight / 3);
                this._graphics.beginPath();
                this._graphics.strokeStyle = "#444444";
                this._graphics.lineWidth = lineWidth;
                this._graphics.moveTo(i * this._barWidth, lineHeight);
                this._graphics.lineTo(i * this._barWidth, this._editorHeight - lineHeight);
                this._graphics.stroke();
            }
            this._updatePreview();
        };
        return BarScrollBar;
    }());
    beepbox.BarScrollBar = BarScrollBar;
})(beepbox || (beepbox = {}));
"use strict";
var beepbox;
(function (beepbox) {
    var OctaveScrollBar = (function () {
        function OctaveScrollBar(_doc) {
            var _this = this;
            this._doc = _doc;
            this._canvas = beepbox.html.canvas({ width: "20", height: "481" });
            this._preview = beepbox.html.canvas({ width: "20", height: "481" });
            this.container = beepbox.html.div({ id: "octaveScrollBarContainer", style: "width: 20px; height: 481px; overflow:hidden; position: relative;" }, [
                this._canvas,
                this._preview,
            ]);
            this._previewGraphics = this._preview.getContext("2d");
            this._graphics = this._canvas.getContext("2d");
            this._editorWidth = 20;
            this._editorHeight = 481;
            this._rootHeight = 4.0;
            this._octaveCount = 7;
            this._mouseDown = false;
            this._mouseOver = false;
            this._dragging = false;
            this._onMouseOver = function (event) {
                _this._mouseOver = true;
            };
            this._onMouseOut = function (event) {
                _this._mouseOver = false;
            };
            this._onMousePressed = function (event) {
                event.preventDefault();
                _this._mouseDown = true;
                if (_this._doc.channel == 3)
                    return;
                _this._updatePreview();
                if (_this._mouseY >= _this._barBottom - _this._barHeight && _this._mouseY <= _this._barBottom) {
                    _this._dragging = true;
                    _this._dragStart = _this._mouseY;
                }
            };
            this._onTouchPressed = function (event) {
                event.preventDefault();
                _this._mouseDown = true;
                var boundingRect = _this._canvas.getBoundingClientRect();
                _this._mouseX = event.touches[0].clientX - boundingRect.left;
                _this._mouseY = event.touches[0].clientY - boundingRect.top;
                if (_this._doc.channel == 3)
                    return;
                _this._updatePreview();
                if (_this._mouseY >= _this._barBottom - _this._barHeight && _this._mouseY <= _this._barBottom) {
                    _this._dragging = true;
                    _this._dragStart = _this._mouseY;
                }
            };
            this._onMouseMoved = function (event) {
                var boundingRect = _this._canvas.getBoundingClientRect();
                _this._mouseX = (event.clientX || event.pageX) - boundingRect.left;
                _this._mouseY = (event.clientY || event.pageY) - boundingRect.top;
                _this._onCursorMoved();
            };
            this._onTouchMoved = function (event) {
                if (!_this._mouseDown)
                    return;
                event.preventDefault();
                var boundingRect = _this._canvas.getBoundingClientRect();
                _this._mouseX = event.touches[0].clientX - boundingRect.left;
                _this._mouseY = event.touches[0].clientY - boundingRect.top;
                _this._onCursorMoved();
            };
            this._onCursorReleased = function (event) {
                if (_this._doc.channel != 3 && !_this._dragging && _this._mouseDown) {
                    if (_this._mouseY < _this._barBottom - _this._barHeight * 0.5) {
                        if (_this._currentOctave < 4)
                            _this._doc.history.record(new beepbox.ChangeOctave(_this._doc, _this._currentOctave + 1));
                    }
                    else {
                        if (_this._currentOctave > 0)
                            _this._doc.history.record(new beepbox.ChangeOctave(_this._doc, _this._currentOctave - 1));
                    }
                }
                _this._mouseDown = false;
                _this._dragging = false;
                _this._updatePreview();
            };
            this._documentChanged = function () {
                _this._currentOctave = _this._doc.song.channelOctaves[_this._doc.channel];
                _this._barBottom = _this._editorHeight - (_this._octaveHeight * _this._currentOctave);
                _this._render();
            };
            this._doc.watch(this._documentChanged);
            this._documentChanged();
            this._octaveHeight = (this._editorHeight - this._rootHeight) / this._octaveCount;
            this._barHeight = (this._octaveHeight * 3 + this._rootHeight);
            this.container.addEventListener("mousedown", this._onMousePressed);
            document.addEventListener("mousemove", this._onMouseMoved);
            document.addEventListener("mouseup", this._onCursorReleased);
            this.container.addEventListener("mouseover", this._onMouseOver);
            this.container.addEventListener("mouseout", this._onMouseOut);
            this.container.addEventListener("touchstart", this._onTouchPressed);
            document.addEventListener("touchmove", this._onTouchMoved);
            document.addEventListener("touchend", this._onCursorReleased);
            document.addEventListener("touchcancel", this._onCursorReleased);
        }
        OctaveScrollBar.prototype._onCursorMoved = function () {
            if (this._doc.channel == 3)
                return;
            if (this._dragging) {
                while (this._mouseY - this._dragStart < -this._octaveHeight * 0.5) {
                    if (this._currentOctave < 4) {
                        this._doc.history.record(new beepbox.ChangeOctave(this._doc, this._currentOctave + 1));
                        this._dragStart -= this._octaveHeight;
                    }
                    else {
                        break;
                    }
                }
                while (this._mouseY - this._dragStart > this._octaveHeight * 0.5) {
                    if (this._currentOctave > 0) {
                        this._doc.history.record(new beepbox.ChangeOctave(this._doc, this._currentOctave - 1));
                        this._dragStart += this._octaveHeight;
                    }
                    else {
                        break;
                    }
                }
            }
            this._updatePreview();
        };
        OctaveScrollBar.prototype._updatePreview = function () {
            this._previewGraphics.clearRect(0, 0, this._editorWidth, this._editorHeight);
            if (this._doc.channel == 3)
                return;
            if (!this._mouseOver || this._mouseDown)
                return;
            var center = this._editorWidth * 0.5;
            var base = 20;
            var tip = 9;
            var arrowWidth = 6;
            if (this._mouseY < this._barBottom - this._barHeight) {
                this._previewGraphics.fillStyle = "#ffffff";
                this._previewGraphics.beginPath();
                this._previewGraphics.moveTo(center, tip);
                this._previewGraphics.lineTo(center + arrowWidth, base);
                this._previewGraphics.lineTo(center - arrowWidth, base);
                this._previewGraphics.lineTo(center, tip);
                this._previewGraphics.fill();
            }
            else if (this._mouseY > this._barBottom) {
                this._previewGraphics.fillStyle = "#ffffff";
                this._previewGraphics.beginPath();
                this._previewGraphics.moveTo(center, this._editorHeight - tip);
                this._previewGraphics.lineTo(center + arrowWidth, this._editorHeight - base);
                this._previewGraphics.lineTo(center - arrowWidth, this._editorHeight - base);
                this._previewGraphics.lineTo(center, this._editorHeight - tip);
                this._previewGraphics.fill();
            }
            else {
                this._previewGraphics.lineWidth = 2;
                this._previewGraphics.strokeStyle = "#ffffff";
                this._previewGraphics.strokeRect(1, this._barBottom, this._editorWidth - 2, -this._barHeight);
            }
        };
        OctaveScrollBar.prototype._render = function () {
            this._graphics.clearRect(0, 0, this._editorWidth, this._editorHeight);
            if (this._doc.channel != 3) {
                this._graphics.fillStyle = "#444444";
                this._graphics.fillRect(2, this._barBottom, this._editorWidth - 4, -this._barHeight);
                for (var i = 0; i <= this._octaveCount; i++) {
                    this._graphics.fillStyle = "#886644";
                    this._graphics.fillRect(0, i * this._octaveHeight, this._editorWidth, this._rootHeight);
                }
            }
            this._updatePreview();
        };
        return OctaveScrollBar;
    }());
    beepbox.OctaveScrollBar = OctaveScrollBar;
})(beepbox || (beepbox = {}));
"use strict";
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
            this._canvas = beepbox.html.canvas({ width: "32", height: "481" });
            this._preview = beepbox.html.canvas({ width: "32", height: "40" });
            this.container = beepbox.html.div({ style: "width: 32px; height: 481px; overflow:hidden; position: relative;" }, [
                this._canvas,
                this._preview,
            ]);
            this._graphics = this._canvas.getContext("2d");
            this._previewGraphics = this._preview.getContext("2d");
            this._editorWidth = 32;
            this._editorHeight = 481;
            this._mouseDown = false;
            this._mouseOver = false;
            this._onMouseOver = function (event) {
                _this._mouseOver = true;
            };
            this._onMouseOut = function (event) {
                _this._mouseOver = false;
            };
            this._onMousePressed = function (event) {
                event.preventDefault();
                _this._mouseDown = true;
                _this._doc.synth.pianoPressed = true;
                _this._updatePreview();
            };
            this._onMouseMoved = function (event) {
                var boundingRect = _this._canvas.getBoundingClientRect();
                _this._mouseX = (event.clientX || event.pageX) - boundingRect.left;
                _this._mouseY = (event.clientY || event.pageY) - boundingRect.top;
                _this._updateCursorNote();
                _this._doc.synth.pianoNote = _this._cursorNote + _this._doc.song.channelOctaves[_this._doc.channel] * 12;
                _this._updatePreview();
            };
            this._onMouseReleased = function (event) {
                _this._mouseDown = false;
                _this._doc.synth.pianoPressed = false;
                _this._updatePreview();
            };
            this._documentChanged = function () {
                _this._noteHeight = _this._doc.channel == 3 ? 40 : 13;
                _this._noteCount = _this._doc.channel == 3 ? beepbox.Music.drumCount : beepbox.Music.noteCount;
                _this._updateCursorNote();
                _this._doc.synth.pianoNote = _this._cursorNote + _this._doc.song.channelOctaves[_this._doc.channel] * 12;
                _this._doc.synth.pianoChannel = _this._doc.channel;
                _this._render();
            };
            this._render = function () {
                if (!finishedLoadingImages) {
                    window.requestAnimationFrame(_this._render);
                    return;
                }
                _this._graphics.clearRect(0, 0, _this._editorWidth, _this._editorHeight);
                if (!_this._doc.showLetters)
                    return;
                var key;
                for (var j = 0; j < _this._noteCount; j++) {
                    var noteNameIndex = (j + beepbox.Music.keyTransposes[_this._doc.song.key]) % 12;
                    if (_this._doc.channel == 3) {
                        key = Drum;
                        var scale = 1.0 - (j / _this._noteCount) * 0.35;
                        var offset = (1.0 - scale) * 0.5;
                        var x = key.width * offset;
                        var y = key.height * offset + _this._noteHeight * (_this._noteCount - j - 1);
                        var w = key.width * scale;
                        var h = key.height * scale;
                        _this._graphics.drawImage(key, x, y, w, h);
                        var brightness = 1.0 + ((j - _this._noteCount / 2.0) / _this._noteCount) * 0.5;
                        var imageData = _this._graphics.getImageData(x, y, w, h);
                        var data = imageData.data;
                        for (var i = 0; i < data.length; i += 4) {
                            data[i + 0] *= brightness;
                            data[i + 1] *= brightness;
                            data[i + 2] *= brightness;
                        }
                        _this._graphics.putImageData(imageData, x, y);
                    }
                    else if (beepbox.Music.scaleFlags[_this._doc.song.scale][j % 12] == false) {
                        key = beepbox.Music.pianoScaleFlags[noteNameIndex] ? WhiteKeyDisabled : BlackKeyDisabled;
                        _this._graphics.drawImage(key, 0, _this._noteHeight * (_this._noteCount - j - 1));
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
                        _this._graphics.drawImage(key, 0, _this._noteHeight * (_this._noteCount - j - 1));
                        _this._graphics.font = "bold 11px sans-serif";
                        _this._graphics.fillStyle = textColor;
                        _this._graphics.fillText(text, 15, _this._noteHeight * (_this._noteCount - j) - 3);
                    }
                }
                _this._updatePreview();
            };
            this._doc.watch(this._documentChanged);
            this._documentChanged();
            this.container.addEventListener("mousedown", this._onMousePressed);
            document.addEventListener("mousemove", this._onMouseMoved);
            document.addEventListener("mouseup", this._onMouseReleased);
            this.container.addEventListener("mouseover", this._onMouseOver);
            this.container.addEventListener("mouseout", this._onMouseOut);
        }
        Piano.prototype._updateCursorNote = function () {
            var scale = beepbox.Music.scaleFlags[this._doc.song.scale];
            var mouseNote = Math.max(0, Math.min(this._noteCount - 1, this._noteCount - (this._mouseY / this._noteHeight)));
            if (scale[Math.floor(mouseNote) % 12] || this._doc.channel == 3) {
                this._cursorNote = Math.floor(mouseNote);
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
                this._cursorNote = mouseNote - bottomRange > topRange - mouseNote ? topNote : bottomNote;
            }
        };
        Piano.prototype._updatePreview = function () {
            this._previewGraphics.clearRect(0, 0, 32, 40);
            if (!this._mouseOver || this._mouseDown)
                return;
            this._preview.style.left = "0px";
            this._preview.style.top = this._noteHeight * (this._noteCount - this._cursorNote - 1) + "px";
            this._previewGraphics.lineWidth = 2;
            this._previewGraphics.strokeStyle = "#ffffff";
            this._previewGraphics.strokeRect(1, 1, this._editorWidth - 2, this._noteHeight - 2);
        };
        return Piano;
    }());
    beepbox.Piano = Piano;
})(beepbox || (beepbox = {}));
"use strict";
var beepbox;
(function (beepbox) {
    var button = beepbox.html.button, div = beepbox.html.div, span = beepbox.html.span, input = beepbox.html.input, br = beepbox.html.br, text = beepbox.html.text;
    var SongDurationPrompt = (function () {
        function SongDurationPrompt(_doc, _songEditor) {
            var _this = this;
            this._doc = _doc;
            this._songEditor = _songEditor;
            this._beatsStepper = input({ style: "width: 40px; height: 16px;", type: "number", min: "1", max: "128", step: "1" });
            this._barsStepper = input({ style: "width: 40px; height: 16px;", type: "number", min: "1", max: "128", step: "1" });
            this._patternsStepper = input({ style: "width: 40px; height: 16px;", type: "number", min: "1", max: "32", step: "1" });
            this._instrumentsStepper = input({ style: "width: 40px; height: 16px;", type: "number", min: "1", max: "10", step: "1" });
            this._okayButton = button({ style: "width:125px;", type: "button" }, [text("Okay")]);
            this._cancelButton = button({ style: "width:125px;", type: "button" }, [text("Cancel")]);
            this.container = div({ style: "position: absolute; width: 100%; height: 100%; display: flex; justify-content: center; align-items: center;" }, [
                div({ style: "text-align: center; background: #000000; width: 274px; border-radius: 15px; border: 4px solid #444444; color: #ffffff; font-size: 12px; padding: 20px;" }, [
                    div({ style: "font-size: 30px" }, [text("Custom Song Size")]),
                    div({ style: "height: 30px;" }),
                    div({ style: "display: flex; flex-direction: row; height: 46px; align-items: center; width: 100%; justify-content: flex-end;" }, [
                        div({ style: "text-align: right; line-height: 18px;" }, [
                            text("Beats per bar:"),
                            br(),
                            span({ style: "color: #888888;" }, [text("(Multiples of 3 or 4 are recommended)")]),
                        ]),
                        div({ style: "display: inline-block; width: 20px; height: 1px;" }),
                        this._beatsStepper,
                    ]),
                    div({ style: "display: flex; flex-direction: row; height: 46px; align-items: center; width: 100%; justify-content: flex-end;" }, [
                        div({ style: "display: inline-block; text-align: right; line-height: 18px;" }, [
                            text("Bars per song:"),
                            br(),
                            span({ style: "color: #888888;" }, [text("(Multiples of 2 or 4 are recommended)")]),
                        ]),
                        div({ style: "display: inline-block; width: 20px; height: 1px;" }),
                        this._barsStepper,
                    ]),
                    div({ style: "display: flex; flex-direction: row; height: 46px; align-items: center; width: 100%; justify-content: flex-end;" }, [
                        text("Patterns per channel:"),
                        div({ style: "display: inline-block; width: 20px; height: 1px;" }),
                        this._patternsStepper,
                    ]),
                    div({ style: "display: flex; flex-direction: row; height: 46px; align-items: center; width: 100%; justify-content: flex-end;" }, [
                        text("Instruments per channel:"),
                        div({ style: "display: inline-block; width: 20px; height: 1px;" }),
                        this._instrumentsStepper,
                    ]),
                    div({ style: "height: 30px;" }),
                    div({ style: "display: flex; flex-direction: row; justify-content: space-between;" }, [
                        this._okayButton,
                        this._cancelButton,
                    ]),
                ]),
            ]);
            this._onClose = function () {
                _this._songEditor.closePrompt(_this);
                _this._okayButton.removeEventListener("click", _this._saveChanges);
                _this._cancelButton.removeEventListener("click", _this._onClose);
                _this._beatsStepper.removeEventListener("keypress", SongDurationPrompt._validateKey);
                _this._barsStepper.removeEventListener("keypress", SongDurationPrompt._validateKey);
                _this._patternsStepper.removeEventListener("keypress", SongDurationPrompt._validateKey);
                _this._instrumentsStepper.removeEventListener("keypress", SongDurationPrompt._validateKey);
                _this._beatsStepper.removeEventListener("blur", SongDurationPrompt._validateNumber);
                _this._barsStepper.removeEventListener("blur", SongDurationPrompt._validateNumber);
                _this._patternsStepper.removeEventListener("blur", SongDurationPrompt._validateNumber);
                _this._instrumentsStepper.removeEventListener("blur", SongDurationPrompt._validateNumber);
            };
            this._saveChanges = function () {
                var sequence = new beepbox.ChangeSequence();
                sequence.append(new beepbox.ChangeBeats(_this._doc, SongDurationPrompt._validate(_this._beatsStepper)));
                sequence.append(new beepbox.ChangeBars(_this._doc, SongDurationPrompt._validate(_this._barsStepper)));
                sequence.append(new beepbox.ChangePatterns(_this._doc, SongDurationPrompt._validate(_this._patternsStepper)));
                sequence.append(new beepbox.ChangeInstruments(_this._doc, SongDurationPrompt._validate(_this._instrumentsStepper)));
                _this._doc.history.record(sequence);
                _this._onClose();
            };
            this._beatsStepper.value = this._doc.song.beats + "";
            this._beatsStepper.min = beepbox.Music.beatsMin + "";
            this._beatsStepper.max = beepbox.Music.beatsMax + "";
            this._barsStepper.value = this._doc.song.bars + "";
            this._barsStepper.min = beepbox.Music.barsMin + "";
            this._barsStepper.max = beepbox.Music.barsMax + "";
            this._patternsStepper.value = this._doc.song.patterns + "";
            this._patternsStepper.min = beepbox.Music.patternsMin + "";
            this._patternsStepper.max = beepbox.Music.patternsMax + "";
            this._instrumentsStepper.value = this._doc.song.instruments + "";
            this._instrumentsStepper.min = beepbox.Music.instrumentsMin + "";
            this._instrumentsStepper.max = beepbox.Music.instrumentsMax + "";
            this._okayButton.addEventListener("click", this._saveChanges);
            this._cancelButton.addEventListener("click", this._onClose);
            this._beatsStepper.addEventListener("keypress", SongDurationPrompt._validateKey);
            this._barsStepper.addEventListener("keypress", SongDurationPrompt._validateKey);
            this._patternsStepper.addEventListener("keypress", SongDurationPrompt._validateKey);
            this._instrumentsStepper.addEventListener("keypress", SongDurationPrompt._validateKey);
            this._beatsStepper.addEventListener("blur", SongDurationPrompt._validateNumber);
            this._barsStepper.addEventListener("blur", SongDurationPrompt._validateNumber);
            this._patternsStepper.addEventListener("blur", SongDurationPrompt._validateNumber);
            this._instrumentsStepper.addEventListener("blur", SongDurationPrompt._validateNumber);
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
"use strict";
var beepbox;
(function (beepbox) {
    var button = beepbox.html.button, div = beepbox.html.div, span = beepbox.html.span, input = beepbox.html.input, text = beepbox.html.text;
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
    var ExportPrompt = (function () {
        function ExportPrompt(_doc, _songEditor) {
            var _this = this;
            this._doc = _doc;
            this._songEditor = _songEditor;
            this._fileName = input({ type: "text", value: "BeepBox-Song", maxlength: 250, size: 15 });
            this._enableIntro = input({ type: "checkbox" });
            this._loopDropDown = input({ style: "width: 40px; height: 16px;", type: "number", min: "1", max: "4", step: "1" });
            this._enableOutro = input({ type: "checkbox" });
            this._exportWavButton = button({ style: "width:200px;", type: "button" }, [text("Export to .wav file")]);
            this._exportMidiButton = button({ style: "width:200px;", type: "button" }, [text("Export to .midi file")]);
            this._exportJsonButton = button({ style: "width:200px;", type: "button" }, [text("Export to .json file")]);
            this._cancelButton = button({ style: "width:200px;", type: "button" }, [text("Cancel")]);
            this.container = div({ style: "position: absolute; width: 100%; height: 100%; display: flex; justify-content: center; align-items: center;" }, [
                div({ style: "margin: auto; text-align: center; background: #000000; width: 200px; border-radius: 15px; border: 4px solid #444444; color: #ffffff; font-size: 12px; padding: 20px;" }, [
                    div({ style: "font-size: 30px" }, [text("Export Options")]),
                    div({ style: "height: 20px;" }),
                    div({ style: "line-height: 46px;" }, [
                        div({ style: "display: inline-block;text-align: right; line-height: 18px;" }, [
                            text("File name:"),
                        ]),
                        div({ style: "display: inline-block; width: 20px; height: 1px;" }),
                        this._fileName,
                    ]),
                    div({ style: "display: table; width: 200px;" }, [
                        div({ style: "display: table-row;" }, [
                            div({ style: "display: table-cell;" }, [text("Intro:")]),
                            div({ style: "display: table-cell;" }, [text("Loop Count:")]),
                            div({ style: "display: table-cell;" }, [text("Outro:")]),
                        ]),
                        div({ style: "display: table-row; height: 30px;" }, [
                            div({ style: "display: table-cell; vertical-align: middle;" }, [this._enableIntro]),
                            div({ style: "display: table-cell; vertical-align: middle;" }, [this._loopDropDown]),
                            div({ style: "display: table-cell; vertical-align: middle;" }, [this._enableOutro]),
                        ]),
                    ]),
                    div({ style: "height: 20px;" }),
                    this._exportWavButton,
                    div({ style: "height: 20px;" }),
                    this._exportMidiButton,
                    div({ style: "height: 20px;" }),
                    this._exportJsonButton,
                    div({ style: "height: 20px;" }),
                    this._cancelButton,
                ]),
            ]);
            this._onClose = function () {
                _this._songEditor.closePrompt(_this);
                _this._fileName.removeEventListener("input", ExportPrompt._validateFileName);
                _this._loopDropDown.removeEventListener("blur", ExportPrompt._validateNumber);
                _this._exportWavButton.removeEventListener("click", _this._onExportToWav);
                _this._exportMidiButton.removeEventListener("click", _this._onExportToMidi);
                _this._exportJsonButton.removeEventListener("click", _this._onExportToJson);
                _this._cancelButton.removeEventListener("click", _this._onClose);
            };
            this._onExportToWav = function () {
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
                saveAs(blob, _this._fileName.value.trim() + ".wav");
                _this._onClose();
            };
            this._onExportToMidi = function () {
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
                var ticksPerPart = ticksPerBeat / song.parts;
                var ticksPerArpeggio = ticksPerPart / 4;
                var secondsPerMinute = 60;
                var microsecondsPerMinute = secondsPerMinute * 1000000;
                var beatsPerMinute = song.getBeatsPerMinute();
                var microsecondsPerBeat = Math.round(microsecondsPerMinute / beatsPerMinute);
                var secondsPerTick = secondsPerMinute / (ticksPerBeat * beatsPerMinute);
                var ticksPerBar = ticksPerBeat * song.beats;
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
                    for (var bar = song.loopStart + song.loopLength; bar < song.bars; bar++) {
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
                        writeAscii("http://www.beepbox.co/" + song.toString());
                        writeEventTime(0);
                        writeUint24(0xFF5103);
                        writeUint24(microsecondsPerBeat);
                        writeEventTime(0);
                        writeUint24(0xFF5804);
                        writeUint8(song.beats);
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
                            barStartTime += ticksPerBar * (song.bars - song.loopStart - song.loopLength);
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
                        var channelRoot = isDrums ? 33 : beepbox.Music.keyTransposes[song.key];
                        var intervalScale = isDrums ? beepbox.Music.drumInterval : 1;
                        for (var _i = 0, unrolledBars_1 = unrolledBars; _i < unrolledBars_1.length; _i++) {
                            var bar = unrolledBars_1[_i];
                            var pattern = song.getPattern(channel, bar);
                            if (pattern != null) {
                                var nextInstrument = pattern.instrument;
                                if (isChorus && song.instrumentChorus[channel][nextInstrument] == 0) {
                                    barStartTime += ticksPerBar;
                                    continue;
                                }
                                if (prevInstrument != nextInstrument) {
                                    prevInstrument = nextInstrument;
                                    writeEventTime(barStartTime);
                                    writeUint16(0xFF04);
                                    if (isDrums) {
                                        var description = "noise: " + beepbox.Music.drumNames[song.instrumentWaves[channel][nextInstrument]];
                                        description += ", volume: " + beepbox.Music.volumeNames[song.instrumentVolumes[channel][nextInstrument]];
                                        description += ", envelope: " + beepbox.Music.attackNames[song.instrumentAttacks[channel][nextInstrument]];
                                        writeAscii(description);
                                        writeEventTime(barStartTime);
                                        writeUint8(0xC0 | midiChannel);
                                        writeFlagAnd7Bits(0, 0x7E);
                                    }
                                    else {
                                        var description = "wave: " + beepbox.Music.waveNames[song.instrumentWaves[channel][nextInstrument]];
                                        description += ", volume: " + beepbox.Music.volumeNames[song.instrumentVolumes[channel][nextInstrument]];
                                        description += ", envelope: " + beepbox.Music.attackNames[song.instrumentAttacks[channel][nextInstrument]];
                                        description += ", filter: " + beepbox.Music.filterNames[song.instrumentFilters[channel][nextInstrument]];
                                        description += ", chorus: " + beepbox.Music.chorusNames[song.instrumentChorus[channel][nextInstrument]];
                                        description += ", effect: " + beepbox.Music.effectNames[song.instrumentEffects[channel][nextInstrument]];
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
                                        var filterInstruments = song.instrumentFilters[channel][nextInstrument] < 3 ? sustainInstruments : decayInstruments;
                                        writeEventTime(barStartTime);
                                        writeUint8(0xC0 | midiChannel);
                                        writeFlagAnd7Bits(0, filterInstruments[song.instrumentWaves[channel][nextInstrument]]);
                                    }
                                    var instrumentVolumeChoice = song.instrumentVolumes[channel][nextInstrument];
                                    var channelVolume = (5 - instrumentVolumeChoice) / 5;
                                    writeEventTime(barStartTime);
                                    writeUint8(0xB0 | midiChannel);
                                    writeFlagAnd7Bits(0, 0x07);
                                    writeFlagAnd7Bits(0, Math.round(0x7f * channelVolume));
                                }
                                var effectChoice = song.instrumentEffects[channel][nextInstrument];
                                var effectVibrato = beepbox.Music.effectVibratos[effectChoice];
                                var effectTremelo = beepbox.Music.effectTremelos[effectChoice];
                                var effectDuration = 0.14;
                                var chorusOffset = beepbox.Music.chorusValues[song.instrumentChorus[channel][nextInstrument]];
                                if (!isChorus)
                                    chorusOffset *= -1;
                                chorusOffset += beepbox.Music.chorusOffsets[song.instrumentChorus[channel][nextInstrument]];
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
                    _loop_1(track);
                }
                arrayBuffer = ArrayBuffer.transfer(arrayBuffer, fileSize);
                var blob = new Blob([arrayBuffer], { type: "audio/midi" });
                saveAs(blob, _this._fileName.value.trim() + ".midi");
                _this._onClose();
            };
            this._onExportToJson = function () {
                var jsonObject = _this._doc.song.toJsonObject(_this._enableIntro.checked, Number(_this._loopDropDown.value), _this._enableOutro.checked);
                var jsonString = JSON.stringify(jsonObject, null, '\t');
                var blob = new Blob([jsonString], { type: "application/json" });
                saveAs(blob, _this._fileName.value.trim() + ".json");
                _this._onClose();
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
            if (this._doc.song.loopStart + this._doc.song.loopLength == this._doc.song.bars) {
                this._enableOutro.checked = false;
                this._enableOutro.disabled = true;
            }
            else {
                this._enableOutro.checked = true;
                this._enableOutro.disabled = false;
            }
            this._fileName.addEventListener("input", ExportPrompt._validateFileName);
            this._loopDropDown.addEventListener("blur", ExportPrompt._validateNumber);
            this._exportWavButton.addEventListener("click", this._onExportToWav);
            this._exportMidiButton.addEventListener("click", this._onExportToMidi);
            this._exportJsonButton.addEventListener("click", this._onExportToJson);
            this._cancelButton.addEventListener("click", this._onClose);
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
    var button = beepbox.html.button, div = beepbox.html.div, input = beepbox.html.input, text = beepbox.html.text;
    var ImportPrompt = (function () {
        function ImportPrompt(_doc, _songEditor) {
            var _this = this;
            this._doc = _doc;
            this._songEditor = _songEditor;
            this._fileInput = input({ style: "width:200px;", type: "file", accept: ".json,application/json" });
            this._cancelButton = button({ style: "width:200px;", type: "button" }, [text("Cancel")]);
            this.container = div({ style: "position: absolute; width: 100%; height: 100%; display: flex; justify-content: center; align-items: center;" }, [
                div({ style: "margin: auto; text-align: center; background: #000000; width: 200px; border-radius: 15px; border: 4px solid #444444; color: #ffffff; font-size: 12px; padding: 20px;" }, [
                    div({ style: "font-size: 30px" }, [text("Import")]),
                    div({ style: "height: 30px;" }),
                    div(undefined, [text("BeepBox songs can be exported and re-imported as .json files. You could also use other means to make .json files for BeepBox as long as they follow the same structure.")]),
                    div({ style: "height: 20px;" }),
                    this._fileInput,
                    div({ style: "height: 20px;" }),
                    this._cancelButton,
                ]),
            ]);
            this._onClose = function () {
                _this._songEditor.closePrompt(_this);
                _this._fileInput.removeEventListener("change", _this._onFileSelected);
                _this._cancelButton.removeEventListener("click", _this._onClose);
            };
            this._onFileSelected = function () {
                var file = _this._fileInput.files[0];
                if (!file)
                    return;
                var reader = new FileReader();
                reader.addEventListener("load", function (event) {
                    _this._doc.history.record(new beepbox.ChangeSong(_this._doc, new beepbox.Song(reader.result)));
                    _this._onClose();
                });
                reader.readAsText(file);
            };
            this._fileInput.addEventListener("change", this._onFileSelected);
            this._cancelButton.addEventListener("click", this._onClose);
        }
        return ImportPrompt;
    }());
    beepbox.ImportPrompt = ImportPrompt;
})(beepbox || (beepbox = {}));
"use strict";
var beepbox;
(function (beepbox) {
    var button = beepbox.html.button, div = beepbox.html.div, span = beepbox.html.span, select = beepbox.html.select, canvas = beepbox.html.canvas, input = beepbox.html.input, text = beepbox.html.text;
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
    var SongEditor = (function () {
        function SongEditor(_doc) {
            var _this = this;
            this._doc = _doc;
            this.promptVisible = false;
            this._width = 700;
            this._height = 645;
            this._waveNames = BuildOptions(beepbox.Music.waveNames);
            this._drumNames = BuildOptions(beepbox.Music.drumNames);
            this._editCommands = [
                ["Undo (Z)", "undo"],
                ["Redo (Y)", "redo"],
                ["Copy Pattern (C)", "copy"],
                ["Paste Pattern (V)", "paste"],
                ["Shift Notes Up (+)", "transposeUp"],
                ["Shift Notes Down (-)", "transposeDown"],
                ["Custom song size...", "duration"],
                ["Import JSON...", "import"],
                ["Clean Slate", "clean"],
            ];
            this._patternEditor = new beepbox.PatternEditor(this._doc);
            this._trackEditor = new beepbox.TrackEditor(this._doc, this);
            this._loopEditor = new beepbox.LoopEditor(this._doc);
            this._barScrollBar = new beepbox.BarScrollBar(this._doc);
            this._octaveScrollBar = new beepbox.OctaveScrollBar(this._doc);
            this._piano = new beepbox.Piano(this._doc);
            this._editorBox = div({ style: "width: 512px; height: 645px;" }, [
                div({ style: "width: 512px; height: 481px; display: flex; flex-direction: row;" }, [
                    this._piano.container,
                    this._patternEditor.container,
                    this._octaveScrollBar.container,
                ]),
                div({ style: "width: 512px; height: 6px;" }),
                div({ style: "width: 512px; height: 158px;" }, [
                    this._trackEditor.container,
                    div({ style: "width: 512px; height: 5px;" }),
                    this._loopEditor.container,
                    div({ style: "width: 512px; height: 5px;" }),
                    this._barScrollBar.container,
                ]),
            ]);
            this._playButton = button({ style: "width: 75px; margin: 0px", type: "button" }, [text("Play")]);
            this._volumeSlider = input({ className: "beepBoxSlider", style: "width: 101px; margin: 0px;", type: "range", min: "0", max: "100", value: "50", step: "1" });
            this._editButton = select({ style: "width:100%; margin: 5px 0;" });
            this._optionsButton = select({ style: "width:100%; margin: 5px 0;" }, [text("Preferences Menu")]);
            this._exportButton = button({ style: "width:100%; margin: 5px 0;", type: "button" }, [text("Export")]);
            this._scaleDropDown = select({ style: "width:90px;" });
            this._keyDropDown = select({ style: "width:90px;" });
            this._tempoSlider = input({ className: "beepBoxSlider", style: "width: 90px; margin: 0px;", type: "range", min: "0", max: "11", value: "7", step: "1" });
            this._partDropDown = select({ style: "width:90px;" });
            this._patternSettingsLabel = div({ style: "visibility: hidden; width:100%; margin: 3px 0;" }, [text("Pattern Settings:")]);
            this._instrumentDropDown = select({ style: "width:120px;" });
            this._instrumentDropDownGroup = div({ className: "selectRow", styleasdf: "width:100%; color: #bbbbbb; visibility: hidden; margin: 0; vertical-align: middle; line-height: 27px;" }, [text("Instrument: "), this._instrumentDropDown]);
            this._channelVolumeSlider = input({ className: "beepBoxSlider", style: "width: 120px; margin: 0px;", type: "range", min: "-5", max: "0", value: "0", step: "1" });
            this._waveDropDown = select({ style: "width:120px;" });
            this._attackDropDown = select({ style: "width:120px;" });
            this._filterDropDown = select({ style: "width:120px;" });
            this._filterDropDownGroup = div({ className: "selectRow" }, [text("Filter: "), this._filterDropDown]);
            this._chorusDropDown = select({ style: "width:120px;" });
            this._chorusDropDownGroup = div({ className: "selectRow" }, [text("Chorus: "), this._chorusDropDown]);
            this._effectDropDown = select({ style: "width:120px;" });
            this._effectDropDownGroup = div({ className: "selectRow" }, [text("Effect: "), this._effectDropDown]);
            this._promptBackground = div({ style: "position: absolute; background: #000000; opacity: 0.5; width: 100%; height: 100%; display: none;" });
            this.mainLayer = div({ className: "beepboxEditor", tabIndex: "0", style: "width: 700px; height: 645px; display: flex; flex-direction: row; -webkit-touch-callout: none; -webkit-user-select: none; -khtml-user-select: none; -moz-user-select: none; -ms-user-select: none; user-select: none; position: relative;" }, [
                this._editorBox,
                div({ style: "width: 6px; height: 645px;" }),
                div({ className: "editor-right-side" }, [
                    div({ style: "width:100%; text-align: center; color: #bbbbbb;" }, [text("BeepBox 2.1.2")]),
                    div({ style: "width:100%; margin: 5px 0; display: flex; flex-direction: row; align-items: center;" }, [
                        this._playButton,
                        div({ style: "width: 4px; height: 10px;" }),
                        this._volumeSlider,
                    ]),
                    this._editButton,
                    this._optionsButton,
                    this._exportButton,
                    div({ style: "width: 100%; height: 110px; flex-shrink: 1;" }),
                    div({ style: "width:100%; margin: 3px 0;" }, [text("Song Settings:")]),
                    div({ className: "selectRow" }, [
                        text("Scale: "),
                        this._scaleDropDown,
                    ]),
                    div({ className: "selectRow" }, [
                        text("Key: "),
                        this._keyDropDown,
                    ]),
                    div({ className: "selectRow" }, [
                        text("Tempo: "),
                        this._tempoSlider,
                    ]),
                    div({ className: "selectRow" }, [
                        text("Rhythm: "),
                        this._partDropDown,
                    ]),
                    div({ style: "width: 100%; height: 25px; flex-shrink: 1;" }),
                    this._patternSettingsLabel,
                    this._instrumentDropDownGroup,
                    div({ style: "width: 100%; height: 25px; flex-shrink: 1;" }),
                    div({ style: "width:100%; margin: 3px 0;" }, [text("Instrument Settings: ")]),
                    div({ className: "selectRow" }, [
                        text("Volume: "),
                        this._channelVolumeSlider,
                    ]),
                    div({ className: "selectRow" }, [
                        text("Wave: "),
                        this._waveDropDown,
                    ]),
                    div({ className: "selectRow" }, [
                        text("Envelope: "),
                        this._attackDropDown,
                    ]),
                    this._filterDropDownGroup,
                    this._chorusDropDownGroup,
                    this._effectDropDownGroup,
                ]),
                this._promptBackground,
            ]);
            this._copyBeats = 0;
            this._copyParts = 0;
            this._copyDrums = false;
            this._refocusStage = function (event) {
                _this.mainLayer.focus();
            };
            this._onUpdated = function () {
                var optionCommands = [
                    [(_this._doc.showLetters ? "✓ " : "") + "Show Piano", "showLetters"],
                    [(_this._doc.showFifth ? "✓ " : "") + "Highlight 'Fifth' Notes", "showFifth"],
                    [(_this._doc.showChannels ? "✓ " : "") + "Show All Channels", "showChannels"],
                    [(_this._doc.showScrollBar ? "✓ " : "") + "Octave Scroll Bar", "showScrollBar"],
                ];
                _this._optionsButton.innerHTML = BuildOptionsWithTitle(optionCommands, "Preferences Menu");
                _this._scaleDropDown.selectedIndex = _this._doc.song.scale;
                _this._keyDropDown.selectedIndex = _this._doc.song.key;
                _this._tempoSlider.value = "" + _this._doc.song.tempo;
                _this._partDropDown.selectedIndex = beepbox.Music.partCounts.indexOf(_this._doc.song.parts);
                if (_this._doc.channel == 3) {
                    _this._filterDropDownGroup.style.visibility = "hidden";
                    _this._chorusDropDownGroup.style.visibility = "hidden";
                    _this._effectDropDownGroup.style.visibility = "hidden";
                    _this._waveDropDown.innerHTML = _this._drumNames;
                }
                else {
                    _this._filterDropDownGroup.style.visibility = "visible";
                    _this._chorusDropDownGroup.style.visibility = "visible";
                    _this._effectDropDownGroup.style.visibility = "visible";
                    _this._waveDropDown.innerHTML = _this._waveNames;
                }
                var pattern = _this._doc.getCurrentPattern();
                _this._patternSettingsLabel.style.visibility = (_this._doc.song.instruments > 1 && pattern != null) ? "visible" : "hidden";
                _this._instrumentDropDownGroup.style.visibility = (_this._doc.song.instruments > 1 && pattern != null) ? "visible" : "hidden";
                var instrumentList = [];
                for (var i = 0; i < _this._doc.song.instruments; i++) {
                    instrumentList.push(i + 1);
                }
                _this._instrumentDropDown.innerHTML = BuildOptions(instrumentList);
                var instrument = _this._doc.getCurrentInstrument();
                _this._waveDropDown.selectedIndex = _this._doc.song.instrumentWaves[_this._doc.channel][instrument];
                _this._filterDropDown.selectedIndex = _this._doc.song.instrumentFilters[_this._doc.channel][instrument];
                _this._attackDropDown.selectedIndex = _this._doc.song.instrumentAttacks[_this._doc.channel][instrument];
                _this._effectDropDown.selectedIndex = _this._doc.song.instrumentEffects[_this._doc.channel][instrument];
                _this._chorusDropDown.selectedIndex = _this._doc.song.instrumentChorus[_this._doc.channel][instrument];
                _this._channelVolumeSlider.value = -_this._doc.song.instrumentVolumes[_this._doc.channel][instrument] + "";
                _this._instrumentDropDown.selectedIndex = instrument;
                _this._piano.container.style.display = _this._doc.showLetters ? "block" : "none";
                _this._octaveScrollBar.container.style.display = _this._doc.showScrollBar ? "block" : "none";
                _this._barScrollBar.container.style.display = _this._doc.song.bars > 16 ? "block" : "none";
                var patternWidth = 512;
                if (_this._doc.showLetters)
                    patternWidth -= 32;
                if (_this._doc.showScrollBar)
                    patternWidth -= 20;
                _this._patternEditor.container.style.width = String(patternWidth) + "px";
                var trackHeight = 128;
                if (_this._doc.song.bars > 16)
                    trackHeight -= 20;
                _this._trackEditor.container.style.height = String(trackHeight) + "px";
                _this._volumeSlider.value = String(_this._doc.volume);
                if (_this._doc.synth.playing) {
                    _this._playButton.innerHTML = "Pause";
                }
                else {
                    _this._playButton.innerHTML = "Play";
                }
            };
            this._onKeyPressed = function (event) {
                if (_this.promptVisible)
                    return;
                _this._trackEditor.onKeyPressed(event);
                switch (event.keyCode) {
                    case 32:
                        _this._togglePlay();
                        event.preventDefault();
                        break;
                    case 90:
                        if (event.shiftKey) {
                            _this._doc.history.redo();
                        }
                        else {
                            _this._doc.history.undo();
                        }
                        event.preventDefault();
                        break;
                    case 89:
                        _this._doc.history.redo();
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
                        event.preventDefault();
                        break;
                    case 221:
                        _this._doc.synth.nextBar();
                        event.preventDefault();
                        break;
                    case 71:
                        _this._doc.synth.stutterPressed = true;
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
            this._onKeyReleased = function (event) {
                switch (event.keyCode) {
                    case 71:
                        _this._doc.synth.stutterPressed = false;
                        break;
                }
            };
            this._togglePlay = function () {
                if (_this._doc.synth.playing) {
                    _this._doc.synth.pause();
                    _this._doc.synth.snapToBar();
                    _this._playButton.innerHTML = "Play";
                }
                else {
                    _this._doc.synth.play();
                    _this._playButton.innerHTML = "Pause";
                }
            };
            this._setVolumeSlider = function () {
                _this._doc.setVolume(Number(_this._volumeSlider.value));
            };
            this._openExportPrompt = function () {
                _this._setPrompt(new beepbox.ExportPrompt(_this._doc, _this));
            };
            this._copyToClipboard = function () {
            };
            this._onSetScale = function () {
                _this._doc.history.record(new beepbox.ChangeScale(_this._doc, _this._scaleDropDown.selectedIndex));
            };
            this._onSetKey = function () {
                _this._doc.history.record(new beepbox.ChangeKey(_this._doc, _this._keyDropDown.selectedIndex));
            };
            this._onSetTempo = function () {
                _this._doc.history.record(new beepbox.ChangeTempo(_this._doc, parseInt(_this._tempoSlider.value)));
            };
            this._onSetParts = function () {
                _this._doc.history.record(new beepbox.ChangeParts(_this._doc, beepbox.Music.partCounts[_this._partDropDown.selectedIndex]));
            };
            this._onSetWave = function () {
                _this._doc.history.record(new beepbox.ChangeWave(_this._doc, _this._waveDropDown.selectedIndex));
            };
            this._onSetFilter = function () {
                _this._doc.history.record(new beepbox.ChangeFilter(_this._doc, _this._filterDropDown.selectedIndex));
            };
            this._onSetAttack = function () {
                _this._doc.history.record(new beepbox.ChangeAttack(_this._doc, _this._attackDropDown.selectedIndex));
            };
            this._onSetEffect = function () {
                _this._doc.history.record(new beepbox.ChangeEffect(_this._doc, _this._effectDropDown.selectedIndex));
            };
            this._onSetChorus = function () {
                _this._doc.history.record(new beepbox.ChangeChorus(_this._doc, _this._chorusDropDown.selectedIndex));
            };
            this._onSetVolume = function () {
                _this._doc.history.record(new beepbox.ChangeVolume(_this._doc, -parseInt(_this._channelVolumeSlider.value)));
            };
            this._onSetInstrument = function () {
                if (_this._doc.getCurrentPattern() == null)
                    return;
                _this._doc.history.record(new beepbox.ChangePatternInstrument(_this._doc, _this._instrumentDropDown.selectedIndex));
            };
            this._editMenuHandler = function (event) {
                switch (_this._editButton.value) {
                    case "undo":
                        _this._doc.history.undo();
                        break;
                    case "redo":
                        _this._doc.history.redo();
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
                        _this._setPrompt(new beepbox.ImportPrompt(_this._doc, _this));
                        break;
                    case "clean":
                        _this._cleanSlate();
                        break;
                    case "duration":
                        _this._setPrompt(new beepbox.SongDurationPrompt(_this._doc, _this));
                        break;
                }
                _this._editButton.selectedIndex = 0;
            };
            this._optionsMenuHandler = function (event) {
                switch (_this._optionsButton.value) {
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
                _this._optionsButton.selectedIndex = 0;
                _this._doc.changed();
                _this._doc.savePreferences();
            };
            this._editButton.innerHTML = BuildOptionsWithTitle(this._editCommands, "Edit Menu");
            this._scaleDropDown.innerHTML = BuildOptions(beepbox.Music.scaleNames);
            this._keyDropDown.innerHTML = BuildOptions(beepbox.Music.keyNames);
            this._partDropDown.innerHTML = BuildOptions(beepbox.Music.partNames);
            this._filterDropDown.innerHTML = BuildOptions(beepbox.Music.filterNames);
            this._attackDropDown.innerHTML = BuildOptions(beepbox.Music.attackNames);
            this._effectDropDown.innerHTML = BuildOptions(beepbox.Music.effectNames);
            this._chorusDropDown.innerHTML = BuildOptions(beepbox.Music.chorusNames);
            this._doc.watch(this._onUpdated);
            this._onUpdated();
            this._editButton.addEventListener("change", this._editMenuHandler);
            this._optionsButton.addEventListener("change", this._optionsMenuHandler);
            this._scaleDropDown.addEventListener("change", this._onSetScale);
            this._keyDropDown.addEventListener("change", this._onSetKey);
            this._tempoSlider.addEventListener("input", this._onSetTempo);
            this._partDropDown.addEventListener("change", this._onSetParts);
            this._instrumentDropDown.addEventListener("change", this._onSetInstrument);
            this._channelVolumeSlider.addEventListener("input", this._onSetVolume);
            this._waveDropDown.addEventListener("change", this._onSetWave);
            this._attackDropDown.addEventListener("change", this._onSetAttack);
            this._filterDropDown.addEventListener("change", this._onSetFilter);
            this._chorusDropDown.addEventListener("change", this._onSetChorus);
            this._effectDropDown.addEventListener("change", this._onSetEffect);
            this._playButton.addEventListener("click", this._togglePlay);
            this._exportButton.addEventListener("click", this._openExportPrompt);
            this._volumeSlider.addEventListener("input", this._setVolumeSlider);
            this._editorBox.addEventListener("mousedown", this._refocusStage);
            this.mainLayer.addEventListener("keydown", this._onKeyPressed);
            this.mainLayer.addEventListener("keyup", this._onKeyReleased);
        }
        SongEditor.prototype._setPrompt = function (prompt) {
            if (this.promptVisible)
                return;
            this._wasPlaying = this._doc.synth.playing;
            if (this._wasPlaying)
                this._togglePlay();
            this._promptBackground.style.display = "block";
            this.mainLayer.appendChild(prompt.container);
            this.promptVisible = true;
        };
        SongEditor.prototype.closePrompt = function (prompt) {
            this.promptVisible = false;
            this._promptBackground.style.display = "none";
            if (this._wasPlaying)
                this._togglePlay();
            this.mainLayer.removeChild(prompt.container);
            this.mainLayer.focus();
        };
        ;
        SongEditor.prototype._copy = function () {
            var pattern = this._doc.getCurrentPattern();
            if (pattern == null)
                return;
            this._copyTones = pattern.cloneTones();
            this._copyBeats = this._doc.song.beats;
            this._copyParts = this._doc.song.parts;
            this._copyDrums = this._doc.channel == 3;
        };
        SongEditor.prototype._paste = function () {
            if (!this._canPaste())
                return;
            this._doc.history.record(new beepbox.ChangePaste(this._doc, this._copyTones));
        };
        SongEditor.prototype._canPaste = function () {
            return this._doc.getCurrentPattern() != null && this._copyTones != null && this._copyBeats == this._doc.song.beats && this._copyParts == this._doc.song.parts && this._copyDrums == (this._doc.channel == 3);
        };
        SongEditor.prototype._cleanSlate = function () {
            this._doc.history.record(new beepbox.ChangeSong(this._doc, new beepbox.Song()));
            this._patternEditor.resetCopiedPins();
        };
        SongEditor.prototype._transpose = function (upward) {
            var pattern = this._doc.getCurrentPattern();
            if (pattern == null)
                return;
            this._doc.history.record(new beepbox.ChangeTranspose(this._doc, pattern, upward));
        };
        return SongEditor;
    }());
    SongEditor.channelColorsDim = ["#0099a1", "#a1a100", "#c75000", "#6f6f6f"];
    SongEditor.channelColorsBright = ["#25f3ff", "#ffff25", "#ff9752", "#aaaaaa"];
    SongEditor.noteColorsDim = ["#00bdc7", "#c7c700", "#ff771c", "#aaaaaa"];
    SongEditor.noteColorsBright = ["#92f9ff", "#ffff92", "#ffcdab", "#eeeeee"];
    beepbox.SongEditor = SongEditor;
    var styleSheet = document.createElement('style');
    styleSheet.type = "text/css";
    styleSheet.appendChild(document.createTextNode("\n.beepboxEditor div {\n\tmargin: 0;\n\tpadding: 0;\n}\n\n.beepboxEditor canvas {\n\toverflow: hidden;\n\tposition: absolute;\n\tdisplay: block;\n}\n\n.beepboxEditor .selectRow {\n\twidth:100%;\n\tcolor: #bbbbbb;\n\tmargin: 0;\n\tline-height: 27px;\n\tdisplay: flex;\n\tflex-direction: row;\n\talign-items: center;\n\tjustify-content: space-between;\n}\n\n.editor-right-side {\n\twidth: 182px;\n\theight: 645px;\n\tfont-size: 12px;\n\tdisplay: flex;\n\tflex-direction: column;\n}\n\n.editor-right-side > * {\n\tflex-shrink: 0;\n}\n\n/* slider style designed with http://danielstern.ca/range.css/ */\ninput[type=range].beepBoxSlider {\n\t-webkit-appearance: none;\n\twidth: 100%;\n\theight: 18px;\n\tmargin: 4px 0;\n\tbackground-color: black;\n}\ninput[type=range].beepBoxSlider:focus {\n\toutline: none;\n}\ninput[type=range].beepBoxSlider::-webkit-slider-runnable-track {\n\twidth: 100%;\n\theight: 6px;\n\tcursor: pointer;\n\tbackground: #b0b0b0;\n\tborder-radius: 0.1px;\n\tborder: 1px solid rgba(0, 0, 0, 0.5);\n}\ninput[type=range].beepBoxSlider::-webkit-slider-thumb {\n\tbox-shadow: 1px 1px 1px rgba(0, 0, 0, 0.5), 0px 0px 1px rgba(13, 13, 13, 0.5);\n\tborder: 1px solid rgba(0, 0, 0, 0.5);\n\theight: 14px;\n\twidth: 14px;\n\tborder-radius: 8px;\n\tbackground: #f0f0f0;\n\tcursor: pointer;\n\t-webkit-appearance: none;\n\tmargin-top: -5px;\n}\ninput[type=range].beepBoxSlider:focus::-webkit-slider-runnable-track {\n\tbackground: #d6d6d6;\n}\ninput[type=range].beepBoxSlider::-moz-range-track {\n\twidth: 100%;\n\theight: 6px;\n\tcursor: pointer;\n\tbackground: #b0b0b0;\n\tborder-radius: 0.1px;\n\tborder: 1px solid rgba(0, 0, 0, 0.5);\n}\ninput[type=range].beepBoxSlider::-moz-range-thumb {\n\tbox-shadow: 1px 1px 1px rgba(0, 0, 0, 0.5), 0px 0px 1px rgba(13, 13, 13, 0.5);\n\tborder: 1px solid rgba(0, 0, 0, 0.5);\n\theight: 14px;\n\twidth: 14px;\n\tborder-radius: 8px;\n\tbackground: #f0f0f0;\n\tcursor: pointer;\n}\ninput[type=range].beepBoxSlider::-ms-track {\n\twidth: 100%;\n\theight: 6px;\n\tcursor: pointer;\n\tbackground: transparent;\n\tborder-color: transparent;\n\tcolor: transparent;\n}\ninput[type=range].beepBoxSlider::-ms-fill-lower {\n\tbackground: #8a8a8a;\n\tborder: 1px solid rgba(0, 0, 0, 0.5);\n\tborder-radius: 0.2px;\n}\ninput[type=range].beepBoxSlider::-ms-fill-upper {\n\tbackground: #b0b0b0;\n\tborder: 1px solid rgba(0, 0, 0, 0.5);\n\tborder-radius: 0.2px;\n}\ninput[type=range].beepBoxSlider::-ms-thumb {\n\tbox-shadow: 1px 1px 1px rgba(0, 0, 0, 0.5), 0px 0px 1px rgba(13, 13, 13, 0.5);\n\tborder: 1px solid rgba(0, 0, 0, 0.5);\n\theight: 14px;\n\twidth: 14px;\n\tborder-radius: 8px;\n\tbackground: #f0f0f0;\n\tcursor: pointer;\n\theight: 6px;\n}\ninput[type=range].beepBoxSlider:focus::-ms-fill-lower {\n\tbackground: #b0b0b0;\n}\ninput[type=range].beepBoxSlider:focus::-ms-fill-upper {\n\tbackground: #d6d6d6;\n}\n"));
    document.head.appendChild(styleSheet);
    var prevHash = "**blank**";
    var doc = new beepbox.SongDocument();
    var wokeUp = false;
    function checkHash() {
        if (prevHash != location.hash) {
            prevHash = location.hash;
            if (prevHash != "") {
                doc.history.record(new beepbox.ChangeSong(doc, new beepbox.Song(prevHash)));
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
    var editor = new SongEditor(doc);
    var beepboxEditorContainer = document.getElementById("beepboxEditorContainer");
    beepboxEditorContainer.appendChild(editor.mainLayer);
    doc.history.watch(onUpdated);
    checkHash();
})(beepbox || (beepbox = {}));
