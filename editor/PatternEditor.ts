// Copyright (C) 2021 John Nesky, distributed under the MIT license.

import { Chord, Transition, Config } from "../synth/SynthConfig";
import { NotePin, Note, makeNotePin, Pattern, Instrument } from "../synth/synth";
import { ColorConfig } from "./ColorConfig";
import { SongDocument } from "./SongDocument";
import { HTML, SVG } from "imperative-html/dist/esm/elements-strict";
import { ChangeSequence, UndoableChange } from "./Change";
import { ChangeChannelBar, ChangeDragSelectedNotes, ChangeEnsurePatternExists, ChangeNoteTruncate, ChangeNoteAdded, ChangePatternSelection, ChangePinTime, ChangeSizeBend, ChangePitchBend, ChangePitchAdded } from "./changes";
import { prettyNumber } from "./EditorConfig";

function makeEmptyReplacementElement<T extends Node>(node: T): T {
    const clone: T = <T>node.cloneNode(false);
    node.parentNode!.replaceChild(clone, node);
    return clone;
}

class PatternCursor {
    public valid: boolean = false;
    public prevNote: Note | null = null;
    public curNote: Note | null = null;
    public nextNote: Note | null = null;
    public pitch: number = 0;
    public pitchIndex: number = -1;
    public curIndex: number = 0;
    public start: number = 0;
    public end: number = 0;
    public part: number = 0;
    public exactPart: number = 0;
    public nearPinIndex: number = 0;
    public pins: NotePin[] = [];
}

export class PatternEditor {
    public controlMode: boolean = false;
    public shiftMode: boolean = false;
    private readonly _svgNoteBackground: SVGPatternElement = SVG.pattern({ id: "patternEditorNoteBackground" + this._barOffset, x: "0", y: "0", patternUnits: "userSpaceOnUse" });
    private readonly _svgDrumBackground: SVGPatternElement = SVG.pattern({ id: "patternEditorDrumBackground" + this._barOffset, x: "0", y: "0", patternUnits: "userSpaceOnUse" });
    private readonly _svgModBackground: SVGPatternElement = SVG.pattern({ id: "patternEditorModBackground" + this._barOffset, x: "0", y: "0", patternUnits: "userSpaceOnUse" });
    private readonly _svgBackground: SVGRectElement = SVG.rect({ x: "0", y: "0", "pointer-events": "none", fill: "url(#patternEditorNoteBackground" + this._barOffset + ")" });
    private _svgNoteContainer: SVGSVGElement = SVG.svg();
    private readonly _svgPlayhead: SVGRectElement = SVG.rect({ x: "0", y: "0", width: "4", fill: ColorConfig.playhead, "pointer-events": "none" });
    private readonly _selectionRect: SVGRectElement = SVG.rect({ class: "dashed-line dash-move", fill: ColorConfig.boxSelectionFill, stroke: ColorConfig.hoverPreview, "stroke-width": 2, "stroke-dasharray": "5, 3", "fill-opacity": "0.4", "pointer-events": "none", visibility: "hidden" });
    private readonly _svgPreview: SVGPathElement = SVG.path({ fill: "none", stroke: ColorConfig.hoverPreview, "stroke-width": "2", "pointer-events": "none" });
    public modDragValueLabel: HTMLDivElement = HTML.div({ width: "90", "text-anchor": "start", contenteditable: "true", style: "display: flex, justify-content: center; align-items:center; position:absolute; pointer-events: none;", "dominant-baseline": "central", });
    private readonly _svg: SVGSVGElement = SVG.svg({ style: `background-color: ${ColorConfig.editorBackground}; touch-action: none; position: absolute;`, width: "100%", height: "100%" },
        SVG.defs(
            this._svgNoteBackground,
            this._svgDrumBackground,
            this._svgModBackground,
        ),
        this._svgBackground,
        this._selectionRect,
        this._svgNoteContainer,
        this._svgPreview,
        this._svgPlayhead,
    );
    public readonly container: HTMLDivElement = HTML.div({ style: "height: 100%; overflow:hidden; position: relative; flex-grow: 1;" }, this._svg, this.modDragValueLabel);

    private readonly _defaultModBorder: number = 34;
    private readonly _backgroundPitchRows: SVGRectElement[] = [];
    private readonly _backgroundDrumRow: SVGRectElement = SVG.rect();
    private readonly _backgroundModRow: SVGRectElement = SVG.rect();

    private _editorWidth: number;

    private _modDragValueLabelLeft: number = 0;
    private _modDragValueLabelTop: number = 0;
    private _modDragValueLabelWidth: number = 0;
    public editingModLabel: boolean = false;
    private _modDragStartValue: number = 0;
    private _modDragPin: NotePin;
    private _modDragNote: Note;
    private _modDragSetting: number;
    private _modDragLowerBound: number = 0;
    private _modDragUpperBound: number = 6;

    private _editorHeight: number;
    private _partWidth: number;
    private _pitchHeight: number = -1;
    private _pitchBorder: number;
    private _pitchCount: number;
    private _mouseX: number = 0;
    private _mouseY: number = 0;
    private _mouseDown: boolean = false;
    private _mouseOver: boolean = false;
    private _mouseDragging: boolean = false;
    private _mouseHorizontal: boolean = false;
    private _usingTouch: boolean = false;
    private _copiedPinChannels: NotePin[][] = [];
    private _copiedPins: NotePin[];
    private _mouseXStart: number = 0;
    private _mouseYStart: number = 0;
    private _touchTime: number = 0;
    private _shiftHeld: boolean = false;
    private _dragConfirmed: boolean = false;
    private _draggingStartOfSelection: boolean = false;
    private _draggingEndOfSelection: boolean = false;
    private _draggingSelectionContents: boolean = false;
    private _dragTime: number = 0;
    private _dragPitch: number = 0;
    private _dragSize: number = 0;
    private _dragVisible: boolean = false;
    private _dragChange: UndoableChange | null = null;
    private _changePatternSelection: UndoableChange | null = null;
    private _lastChangeWasPatternSelection: boolean = false;
    private _cursor: PatternCursor = new PatternCursor();
    private _stashCursorPinVols: number[][] = [];
    private _pattern: Pattern | null = null;
    private _playheadX: number = 0.0;
    private _octaveOffset: number = 0;
    private _renderedWidth: number = -1;
    private _renderedHeight: number = -1;
    private _renderedBeatWidth: number = -1;
    private _renderedPitchHeight: number = -1;
    private _renderedFifths: boolean = false;
    private _renderedDrums: boolean = false;
    private _renderedMod: boolean = false;
    private _renderedRhythm: number = -1;
    private _renderedPitchChannelCount: number = -1;
    private _renderedNoiseChannelCount: number = -1;
    private _renderedModChannelCount: number = -1;
    private _followPlayheadBar: number = -1;

    constructor(private _doc: SongDocument, private _interactive: boolean, private _barOffset: number) {
        for (let i: number = 0; i < Config.pitchesPerOctave; i++) {
            const rectangle: SVGRectElement = SVG.rect();
            rectangle.setAttribute("x", "1");
            rectangle.setAttribute("fill", (i == 0) ? ColorConfig.tonic : ColorConfig.pitchBackground);
            this._svgNoteBackground.appendChild(rectangle);
            this._backgroundPitchRows[i] = rectangle;
        }

        this._backgroundDrumRow.setAttribute("x", "1");
        this._backgroundDrumRow.setAttribute("y", "1");
        this._backgroundDrumRow.setAttribute("fill", ColorConfig.pitchBackground);
        this._svgDrumBackground.appendChild(this._backgroundDrumRow);
        this._backgroundModRow.setAttribute("fill", ColorConfig.pitchBackground);
        this._svgModBackground.appendChild(this._backgroundModRow);

        if (this._interactive) {
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

            this.modDragValueLabel.addEventListener("input", this._validateModDragLabelInput);
        } else {
            this._svgPlayhead.style.display = "none";
            this._svg.appendChild(SVG.rect({ x: 0, y: 0, width: 10000, height: 10000, fill: ColorConfig.editorBackground, style: "opacity: 0.5;" }));
        }

        this.resetCopiedPins();
    }

    private _validateModDragLabelInput = (event: Event): void => {
        const label: HTMLDivElement = <HTMLDivElement>event.target;

        // Special case - when user is typing a number between zero and min, allow it (the alternative is quite annoying, when min is nonzero)
        let converted: number = Number(label.innerText);
        if (!isNaN(converted) && converted >= 0 && converted < this._modDragLowerBound)
            return;

        // Another special case - allow "" e.g. the empty string and a single negative sign, but don't do anything about it.
        if (label.innerText != "" && label.innerText != "-") {
            // Force NaN results to be 0
            if (isNaN(converted)) {
                converted = this._modDragLowerBound;
                label.innerText = "" + this._modDragLowerBound;
            }

            let presValue: number = Math.floor(Math.max(Number(this._modDragLowerBound), Math.min(Number(this._modDragUpperBound), converted)));
            if (label.innerText != presValue + "")
                label.innerText = presValue + "";

            // This is me being too lazy to fiddle with the css to get it to align center.
            let xOffset: number = (+(presValue >= 10.0)) + (+(presValue >= 100.0)) + (+(presValue < 0.0)) + (+(presValue <= -10.0));
            this._modDragValueLabelLeft = +prettyNumber(Math.max(Math.min(this._editorWidth - 10 - xOffset * 8, this._partWidth * (this._modDragNote.start + this._modDragPin.time) - 4 - xOffset * 4), 2));
            this.modDragValueLabel.style.setProperty("left", "" + this._modDragValueLabelLeft + "px");

            const sequence: ChangeSequence = new ChangeSequence();
            this._dragChange = sequence;
            this._doc.setProspectiveChange(this._dragChange);

            sequence.append(new ChangeSizeBend(this._doc, this._modDragNote, this._modDragPin.time, presValue- Config.modulators[this._modDragSetting].convertRealFactor, this._modDragPin.interval, this.shiftMode));

        }
    }

    private _getMaxDivision(): number {
        const rhythmStepsPerBeat: number = Config.rhythms[this._doc.song.rhythm].stepsPerBeat;
        if (rhythmStepsPerBeat % 4 == 0) {
            // Beat is divisible by 2 (and 4).
            return Config.partsPerBeat / 2;
        } else if (rhythmStepsPerBeat % 3 == 0) {
            // Beat is divisible by 3.
            return Config.partsPerBeat / 3;
        } else if (rhythmStepsPerBeat % 2 == 0) {
            // Beat is divisible by 2.
            return Config.partsPerBeat / 2;
        }
        return Config.partsPerBeat;
    }

    private _getMinDivision(): number {
        return Config.partsPerBeat / Config.rhythms[this._doc.song.rhythm].stepsPerBeat;
    }

    private _snapToMinDivision(input: number): number {
        const minDivision: number = this._getMinDivision();
        return Math.floor(input / minDivision) * minDivision;
    }

    private _updateCursorStatus(): void {
        this._cursor = new PatternCursor();

        if (this._mouseX < 0 || this._mouseX > this._editorWidth || this._mouseY < 0 || this._mouseY > this._editorHeight || this._pitchHeight <= 0) return;

        const minDivision: number = this._getMinDivision();
        this._cursor.exactPart = this._mouseX / this._partWidth;
        this._cursor.part =
            Math.floor(
                Math.max(0,
                    Math.min(this._doc.song.beatsPerBar * Config.partsPerBeat - minDivision, this._cursor.exactPart)
                )
                / minDivision) * minDivision;

        let foundNote: boolean = false;

        if (this._pattern != null) {
            for (const note of this._pattern.notes) {
                if (note.end <= this._cursor.exactPart) {
                    if (this._doc.song.getChannelIsMod(this._doc.channel)) {
                        if (note.pitches[0] == Math.floor(this._findMousePitch(this._mouseY))) {
                            this._cursor.prevNote = note;
                        }
                        if (!foundNote)
                            this._cursor.curIndex++;

                    } else {
                        this._cursor.prevNote = note;
                        this._cursor.curIndex++;
                    }
                } else if (note.start <= this._cursor.exactPart && note.end > this._cursor.exactPart) {
                    if (this._doc.song.getChannelIsMod(this._doc.channel)) {
                        if (note.pitches[0] == Math.floor(this._findMousePitch(this._mouseY))) {
                            this._cursor.curNote = note;
                            foundNote = true;
                        }
                        // Only increment index if the sought note has been found... or if this note truly starts before the other
                        else if (!foundNote || (this._cursor.curNote != null && note.start < this._cursor.curNote.start))
                            this._cursor.curIndex++;
                    }
                    else {
                        this._cursor.curNote = note;
                    }
                } else if (note.start > this._cursor.exactPart) {
                    if (this._doc.song.getChannelIsMod(this._doc.channel)) {
                        if (note.pitches[0] == Math.floor(this._findMousePitch(this._mouseY))) {
                            this._cursor.nextNote = note;
                            break;
                        }
                    } else {
                        this._cursor.nextNote = note;
                        break;
                    }
                }
            }

            if (this._doc.song.getChannelIsMod(this._doc.channel) && !this.editingModLabel) {

                if (this._pattern.notes[this._cursor.curIndex] != null && this._cursor.curNote != null) {

                    let pinIdx: number = 0;

                    while (this._cursor.curNote.start + this._cursor.curNote.pins[pinIdx].time < this._cursor.exactPart && pinIdx < this._cursor.curNote.pins.length) {
                        pinIdx++;
                    }
                    // Decide if the previous pin is closer
                    if (pinIdx > 0) {
                        if (this._cursor.curNote.start + this._cursor.curNote.pins[pinIdx].time - this._cursor.exactPart > this._cursor.exactPart - (this._cursor.curNote.start + this._cursor.curNote.pins[pinIdx - 1].time)) {
                            pinIdx--;
                        }
                    }

                    this.modDragValueLabel.style.setProperty("color", "#666688");
                    this.modDragValueLabel.style.setProperty("display", "");
                    const mod: number = Math.max( 0, Config.modCount - 1 - this._cursor.curNote.pitches[0]);

                    let setting: number = this._doc.song.channels[this._doc.channel].instruments[this._doc.getCurrentInstrument(this._barOffset)].modulators[mod];

                    let presValue: number = this._cursor.curNote.pins[pinIdx].size + Config.modulators[setting].convertRealFactor;

                    // This is me being too lazy to fiddle with the css to get it to align center.
                    let xOffset: number = (+(presValue >= 10.0)) + (+(presValue >= 100.0)) + (+(presValue < 0.0)) + (+(presValue <= -10.0));

                    this._modDragValueLabelWidth = 8 + xOffset * 8;
                    this._modDragValueLabelLeft = +prettyNumber(Math.max(Math.min(this._editorWidth - 10 - xOffset * 8, this._partWidth * (this._cursor.curNote.start + this._cursor.curNote.pins[pinIdx].time) - 4 - xOffset * 4), 2));
                    this._modDragValueLabelTop = +prettyNumber(this._pitchToPixelHeight(this._cursor.curNote.pitches[0] - this._octaveOffset) - 17 - (this._pitchHeight - this._pitchBorder) / 2);

                    this._modDragStartValue = this._cursor.curNote.pins[pinIdx].size;
                    this._modDragNote = this._cursor.curNote;
                    this._modDragPin = this._cursor.curNote.pins[pinIdx];
                    this._modDragLowerBound = Config.modulators[setting].convertRealFactor;
                    this._modDragUpperBound = Config.modulators[setting].convertRealFactor + Config.modulators[setting].maxRawVol;
                    this._modDragSetting = setting;

                    this.modDragValueLabel.style.setProperty("left", "" + this._modDragValueLabelLeft + "px");
                    this.modDragValueLabel.style.setProperty("top", "" + this._modDragValueLabelTop + "px");
                    this.modDragValueLabel.textContent = "" + presValue;

                }
                else {
                    this.modDragValueLabel.style.setProperty("display", "none");
                    this.modDragValueLabel.style.setProperty("pointer-events", "none");
                    this.modDragValueLabel.setAttribute("contenteditable", "false");
                }
            }
            else if (!this.editingModLabel) {
                this.modDragValueLabel.style.setProperty("display", "none");
                this.modDragValueLabel.style.setProperty("pointer-events", "none");
                this.modDragValueLabel.setAttribute("contenteditable", "false");
            }
        }
        else {
            this.modDragValueLabel.style.setProperty("display", "none");
            this.modDragValueLabel.style.setProperty("pointer-events", "none");
            this.modDragValueLabel.setAttribute("contenteditable", "false");
        }

        let mousePitch: number = this._findMousePitch(this._mouseY);

        if (this._cursor.curNote != null) {

            this._cursor.start = this._cursor.curNote.start;
            this._cursor.end = this._cursor.curNote.end;
            this._cursor.pins = this._cursor.curNote.pins;

            let interval: number = 0;
            let error: number = 0;
            let prevPin: NotePin;
            let nextPin: NotePin = this._cursor.curNote.pins[0];
            for (let j: number = 1; j < this._cursor.curNote.pins.length; j++) {
                prevPin = nextPin;
                nextPin = this._cursor.curNote.pins[j];
                const leftSide: number = this._partWidth * (this._cursor.curNote.start + prevPin.time);
                const rightSide: number = this._partWidth * (this._cursor.curNote.start + nextPin.time);
                if (this._mouseX > rightSide) continue;
                if (this._mouseX < leftSide) throw new Error();
                const intervalRatio: number = (this._mouseX - leftSide) / (rightSide - leftSide);
                const arc: number = Math.sqrt(1.0 / Math.sqrt(4.0) - Math.pow(intervalRatio - 0.5, 2.0)) - 0.5;
                const bendHeight: number = Math.abs(nextPin.interval - prevPin.interval);
                interval = prevPin.interval * (1.0 - intervalRatio) + nextPin.interval * intervalRatio;
                error = arc * bendHeight + 0.95;
                break;
            }

            let minInterval: number = Number.MAX_VALUE;
            let maxInterval: number = -Number.MAX_VALUE;
            let bestDistance: number = Number.MAX_VALUE;
            for (const pin of this._cursor.curNote.pins) {
                if (minInterval > pin.interval) minInterval = pin.interval;
                if (maxInterval < pin.interval) maxInterval = pin.interval;
                const pinDistance: number = Math.abs(this._cursor.curNote.start + pin.time - this._mouseX / this._partWidth);
                if (bestDistance > pinDistance) {
                    bestDistance = pinDistance;
                    this._cursor.nearPinIndex = this._cursor.curNote.pins.indexOf(pin);
                }
            }

            mousePitch -= interval;
            const maxPitch: number = this._doc.song.getChannelIsNoise(this._doc.channel) ? Config.drumCount - 1 :
                    this._doc.song.getChannelIsMod(this._doc.channel) ? Config.modCount - 1 : Config.maxPitch;
            this._cursor.pitch = this._snapToPitch(mousePitch, -minInterval, maxPitch - maxInterval);

            // Snap to nearby existing note if present.
            if (!this._doc.song.getChannelIsNoise(this._doc.channel) && !this._doc.song.getChannelIsMod(this._doc.channel)) {
                let nearest: number = error;
                for (let i: number = 0; i < this._cursor.curNote.pitches.length; i++) {
                    const distance: number = Math.abs(this._cursor.curNote.pitches[i] - mousePitch + 0.5);
                    if (distance > nearest) continue;
                    nearest = distance;
                    this._cursor.pitch = this._cursor.curNote.pitches[i];
                }
            }

            for (let i: number = 0; i < this._cursor.curNote.pitches.length; i++) {
                if (this._cursor.curNote.pitches[i] == this._cursor.pitch) {
                    this._cursor.pitchIndex = i;
                    break;
                }
            }
        } else {

            const maxPitch: number = this._doc.song.getChannelIsNoise(this._doc.channel) ? Config.drumCount - 1 :
                this._doc.song.getChannelIsMod(this._doc.channel) ? Config.modCount : Config.maxPitch;
            this._cursor.pitch = this._snapToPitch(mousePitch, 0, maxPitch);
            const defaultLength: number = this._copiedPins[this._copiedPins.length - 1].time;
            const fullBeats: number = Math.floor(this._cursor.part / Config.partsPerBeat);
            const maxDivision: number = this._getMaxDivision();
            const modMouse: number = this._cursor.part % Config.partsPerBeat;
            if (defaultLength == 1) {
                this._cursor.start = this._cursor.part;
            } else if (defaultLength > Config.partsPerBeat) {
                this._cursor.start = fullBeats * Config.partsPerBeat;
            } else if (defaultLength == Config.partsPerBeat) {
                this._cursor.start = fullBeats * Config.partsPerBeat;
                if (maxDivision < Config.partsPerBeat && modMouse > maxDivision) {
                    this._cursor.start += Math.floor(modMouse / maxDivision) * maxDivision;
                }
            } else {
                this._cursor.start = fullBeats * Config.partsPerBeat;
                let division = Config.partsPerBeat % defaultLength == 0 ? defaultLength : Math.min(defaultLength, maxDivision);
                while (division < maxDivision && Config.partsPerBeat % division != 0) {
                    division++;
                }
                this._cursor.start += Math.floor(modMouse / division) * division;
            }
            this._cursor.end = this._cursor.start + defaultLength;
            let forceStart: number = 0;
            let forceEnd: number = this._doc.song.beatsPerBar * Config.partsPerBeat;
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
            } else if (this._cursor.end > forceEnd) {
                this._cursor.end = forceEnd;
                this._cursor.start = this._cursor.end - defaultLength;
                if (this._cursor.start < forceStart) {
                    this._cursor.start = forceStart;
                }
            }

            if (this._cursor.end - this._cursor.start == defaultLength) {
                this._copiedPins = this._copiedPinChannels[this._doc.channel];
                this._cursor.pins = this._copiedPins;
            } else {
                this._cursor.pins = [];
                for (const oldPin of this._copiedPins) {
                    if (oldPin.time <= this._cursor.end - this._cursor.start) {
                        this._cursor.pins.push(makeNotePin(0, oldPin.time, oldPin.size));
                        if (oldPin.time == this._cursor.end - this._cursor.start) break;
                    } else {
                        this._cursor.pins.push(makeNotePin(0, this._cursor.end - this._cursor.start, oldPin.size));
                        break;
                    }
                }
            }

            if (this._doc.song.getChannelIsMod(this._doc.channel)) {

                this._cursor.pitch = Math.max(0, Math.min(Config.modCount - 1, this._cursor.pitch));

                // Return cursor to stashed cursor volumes (so pins aren't destroyed by moving the preview around several volume scales.)
                if (this._stashCursorPinVols != null && this._stashCursorPinVols[this._doc.channel] != null) {
                    for (let pin: number = 0; pin < this._cursor.pins.length; pin++) {
                        this._cursor.pins[pin].size = this._stashCursorPinVols[this._doc.channel][pin];
                    }
                }

                // Scale volume of copied pin to cap for this row
                let maxHeight: number = this._doc.song.getVolumeCap(this._doc.song.getChannelIsMod(this._doc.channel), this._doc.channel, this._doc.getCurrentInstrument(this._barOffset), this._cursor.pitch);
                let maxFoundHeight: number = 0;
                for (const pin of this._cursor.pins) {
                    if (pin.size > maxFoundHeight) {
                        maxFoundHeight = pin.size;
                    }
                }
                // Apply scaling if the max height is below any pin setting.
                if (maxFoundHeight > maxHeight) {
                    for (const pin of this._cursor.pins) {
                        pin.size = Math.round(pin.size * (maxHeight / maxFoundHeight));
                    }
                }
            }

        }

        this._cursor.valid = true;

    }

    private _cursorIsInSelection(): boolean {
        return this._cursor.valid && this._doc.selection.patternSelectionActive && this._doc.selection.patternSelectionStart <= this._cursor.exactPart && this._cursor.exactPart <= this._doc.selection.patternSelectionEnd;
    }

    private _cursorAtStartOfSelection(): boolean {
        return this._cursor.valid && this._doc.selection.patternSelectionActive && this._cursor.pitchIndex == -1 && this._doc.selection.patternSelectionStart - 3 <= this._cursor.exactPart && this._cursor.exactPart <= this._doc.selection.patternSelectionStart + 1.25;
    }

    private _cursorAtEndOfSelection(): boolean {
        return this._cursor.valid && this._doc.selection.patternSelectionActive && this._cursor.pitchIndex == -1 && this._doc.selection.patternSelectionEnd - 1.25 <= this._cursor.exactPart && this._cursor.exactPart <= this._doc.selection.patternSelectionEnd + 3;
    }

    private _findMousePitch(pixelY: number): number {
        return Math.max(0, Math.min(this._pitchCount - 1, this._pitchCount - (pixelY / this._pitchHeight))) + this._octaveOffset;
    }

    private _snapToPitch(guess: number, min: number, max: number): number {
        if (guess < min) guess = min;
        if (guess > max) guess = max;
        const scale: ReadonlyArray<boolean> = this._doc.notesOutsideScale ? Config.scales.dictionary["Free"].flags : Config.scales[this._doc.song.scale].flags;
        if (scale[Math.floor(guess) % Config.pitchesPerOctave] || this._doc.song.getChannelIsNoise(this._doc.channel) || this._doc.song.getChannelIsMod(this._doc.channel)) {

            return Math.floor(guess);
        } else {
            let topPitch: number = Math.floor(guess) + 1;
            let bottomPitch: number = Math.floor(guess) - 1;
            while (!scale[topPitch % Config.pitchesPerOctave]) {
                topPitch++;
            }
            while (!scale[(bottomPitch) % Config.pitchesPerOctave]) {
                bottomPitch--;
            }
            if (topPitch > max) {
                if (bottomPitch < min) {
                    return min;
                } else {
                    return bottomPitch;
                }
            } else if (bottomPitch < min) {
                return topPitch;
            }
            let topRange: number = topPitch;
            let bottomRange: number = bottomPitch + 1;
            if (topPitch % Config.pitchesPerOctave == 0 || topPitch % Config.pitchesPerOctave == 7) {
                topRange -= 0.5;
            }
            if (bottomPitch % Config.pitchesPerOctave == 0 || bottomPitch % Config.pitchesPerOctave == 7) {
                bottomRange += 0.5;
            }
            return guess - bottomRange > topRange - guess ? topPitch : bottomPitch;
        }
    }

    private _copyPins(note: Note): void {
        this._copiedPins = [];
        for (const oldPin of note.pins) {
            this._copiedPins.push(makeNotePin(0, oldPin.time, oldPin.size));
        }
        for (let i: number = 1; i < this._copiedPins.length - 1;) {
            if (this._copiedPins[i - 1].size == this._copiedPins[i].size &&
                this._copiedPins[i].size == this._copiedPins[i + 1].size) {
                this._copiedPins.splice(i, 1);
            } else {
                i++;
            }
        }
        this._copiedPinChannels[this._doc.channel] = this._copiedPins;

        this._stashCursorPinVols[this._doc.channel] = [];
        for (let pin: number = 0; pin < this._copiedPins.length; pin++) {
            this._stashCursorPinVols[this._doc.channel].push(this._copiedPins[pin].size);
        }
    }

    public movePlayheadToMouse(): boolean {
		if (this._mouseOver) {
			this._doc.synth.playhead = this._doc.bar + this._barOffset + (this._mouseX / this._editorWidth);
			return true;
		}
		return false;
	}

    public resetCopiedPins = (): void => {
        const maxDivision: number = this._getMaxDivision();
        let cap: number = this._doc.song.getVolumeCap(false);
        this._copiedPinChannels.length = this._doc.song.getChannelCount();
        this._stashCursorPinVols.length = this._doc.song.getChannelCount();
        for (let i: number = 0; i < this._doc.song.pitchChannelCount; i++) {
            this._copiedPinChannels[i] = [makeNotePin(0, 0, cap), makeNotePin(0, maxDivision, cap)];
            this._stashCursorPinVols[i] = [cap, cap];
        }
        for (let i: number = this._doc.song.pitchChannelCount; i < this._doc.song.pitchChannelCount + this._doc.song.noiseChannelCount; i++) {
            this._copiedPinChannels[i] = [makeNotePin(0, 0, cap), makeNotePin(0, maxDivision, 0)];
            this._stashCursorPinVols[i] = [cap, 0];
        }
        for (let i: number = this._doc.song.pitchChannelCount + this._doc.song.noiseChannelCount; i < this._doc.song.getChannelCount(); i++) {
            this._copiedPinChannels[i] = [makeNotePin(0, 0, cap), makeNotePin(0, maxDivision, 0)];
            this._stashCursorPinVols[i] = [cap, 0];
        }
    }

    private _animatePlayhead = (timestamp: number): void => {

        if (this._usingTouch && !this.shiftMode && !this._mouseDragging && this._mouseDown && performance.now() > this._touchTime + 1000 && this._cursor.valid && this._doc.lastChangeWas(this._dragChange)) {
            this._dragChange!.undo();
            this._shiftHeld = true;
            this._dragConfirmed = false;
            this._whenCursorPressed();
            this._doc.notifier.notifyWatchers();
        }

        const playheadBar: number = Math.floor(this._doc.synth.playhead);

        if (this._doc.synth.playing && ((this._pattern != null && this._doc.song.getPattern(this._doc.channel, Math.floor(this._doc.synth.playhead)) == this._pattern) || Math.floor(this._doc.synth.playhead) == this._doc.bar + this._barOffset)) {
            this._svgPlayhead.setAttribute("visibility", "visible");
            const modPlayhead: number = this._doc.synth.playhead - playheadBar;
            if (Math.abs(modPlayhead - this._playheadX) > 0.1) {
                this._playheadX = modPlayhead;
            } else {
                this._playheadX += (modPlayhead - this._playheadX) * 0.2;
            }
            this._svgPlayhead.setAttribute("x", "" + prettyNumber(this._playheadX * this._editorWidth - 2));
        } else {
            this._svgPlayhead.setAttribute("visibility", "hidden");
        }

        if (this._doc.synth.playing && this._doc.autoFollow && this._followPlayheadBar != playheadBar) {
            new ChangeChannelBar(this._doc, this._doc.channel, playheadBar);
            this._doc.notifier.notifyWatchers();
        }
        this._followPlayheadBar = playheadBar;
        window.requestAnimationFrame(this._animatePlayhead);
    }

    private _whenMouseOver = (event: MouseEvent): void => {
        if (this._mouseOver) return;
        this._mouseOver = true;
        this._usingTouch = false;
    }

    private _whenMouseOut = (event: MouseEvent): void => {
        if (!this._mouseOver) return;
        this._mouseOver = false;
    }

    private _whenMousePressed = (event: MouseEvent): void => {
        event.preventDefault();
        const boundingRect: ClientRect = this._svg.getBoundingClientRect();
        this._mouseX = ((event.clientX || event.pageX) - boundingRect.left) * this._editorWidth / (boundingRect.right - boundingRect.left);
        this._mouseY = ((event.clientY || event.pageY) - boundingRect.top) * this._editorHeight / (boundingRect.bottom - boundingRect.top);
        if (isNaN(this._mouseX)) this._mouseX = 0;
        if (isNaN(this._mouseY)) this._mouseY = 0;
        this._usingTouch = false;
        this._shiftHeld = event.shiftKey;
        this._dragConfirmed = false;
        this._whenCursorPressed();
    }

    private _whenTouchPressed = (event: TouchEvent): void => {
        event.preventDefault();
        const boundingRect: ClientRect = this._svg.getBoundingClientRect();
        this._mouseX = (event.touches[0].clientX - boundingRect.left) * this._editorWidth / (boundingRect.right - boundingRect.left);
        this._mouseY = (event.touches[0].clientY - boundingRect.top) * this._editorHeight / (boundingRect.bottom - boundingRect.top);
        if (isNaN(this._mouseX)) this._mouseX = 0;
        if (isNaN(this._mouseY)) this._mouseY = 0;
        this._usingTouch = true;
        this._shiftHeld = event.shiftKey;
        this._dragConfirmed = false;
        this._touchTime = performance.now();
        this._whenCursorPressed();
    }

    public stopEditingModLabel(discardChanges: boolean) {
        if (this.editingModLabel) {
            this.editingModLabel = false;
            this.modDragValueLabel.style.setProperty("pointer-events", "none");

            if (window.getSelection) {
                let sel: Selection | null = window.getSelection();
                if (sel != null)
                    sel.removeAllRanges();
            }
            // Return pin to its state before text editing
            if (discardChanges) {
                this._modDragPin.size = this._modDragStartValue;

                let presValue: number = this._modDragStartValue + Config.modulators[this._modDragSetting].convertRealFactor;

                // This is me being too lazy to fiddle with the css to get it to align center.
                let xOffset: number = (+(presValue >= 10.0)) + (+(presValue >= 100.0)) + (+(presValue < 0.0)) + (+(presValue <= -10.0));
                this._modDragValueLabelLeft = +prettyNumber(Math.max(Math.min(this._editorWidth - 10 - xOffset * 8, this._partWidth * (this._modDragNote.start + this._modDragPin.time) - 4 - xOffset * 4), 2));
                this.modDragValueLabel.style.setProperty("left", "" + this._modDragValueLabelLeft + "px");

                const sequence: ChangeSequence = new ChangeSequence();
                this._dragChange = sequence;
                this._doc.setProspectiveChange(this._dragChange);

                sequence.append(new ChangeSizeBend(this._doc, this._modDragNote, this._modDragPin.time, this._modDragStartValue, this._modDragPin.interval, this.shiftMode));

                this._dragChange = null;
            }

            const continuousState: boolean = this._doc.lastChangeWas(this._dragChange);
            if (continuousState) {
                if (this._dragChange != null) {
                    this._doc.record(this._dragChange);
                    this._dragChange = null;
                }
            }
        }
    }

    private _whenCursorPressed(): void {
        // Check for click on mod value label
        if (this._doc.song.getChannelIsMod(this._doc.channel) && this.modDragValueLabel.style.getPropertyValue("display") != "none" &&
            this._mouseX > +this._modDragValueLabelLeft - 6 &&
            this._mouseX < +this._modDragValueLabelLeft + this._modDragValueLabelWidth + 6 &&
            this._mouseY > +this._modDragValueLabelTop - 8 &&
            this._mouseY < +this._modDragValueLabelTop + 11) {
            // Mod value label clicked, select it
            this.modDragValueLabel.style.setProperty("pointer-events", "fill");
            this.modDragValueLabel.setAttribute("contenteditable", "true");
            if (window.getSelection) {
                let sel: Selection | null = window.getSelection();
                if (sel != null)
                    sel.selectAllChildren(this.modDragValueLabel);
            }

            window.setTimeout(() => { this.modDragValueLabel.focus(); });
            this.editingModLabel = true;
        } else {
            this.stopEditingModLabel(false);
            if (this._doc.enableNotePreview) this._doc.synth.maintainLiveInput();
            this._mouseDown = true;
            this._mouseXStart = this._mouseX;
            this._mouseYStart = this._mouseY;
            this._updateCursorStatus();
            this._updatePreview();
            const sequence: ChangeSequence = new ChangeSequence();
            this._dragChange = sequence;
            this._lastChangeWasPatternSelection = this._doc.lastChangeWas(this._changePatternSelection);
            this._doc.setProspectiveChange(this._dragChange);

            if (this._cursorAtStartOfSelection()) {
                this._draggingStartOfSelection = true;
            } else if (this._cursorAtEndOfSelection()) {
                this._draggingEndOfSelection = true;
            } else if (this._shiftHeld) {
                if ((this._doc.selection.patternSelectionActive && this._cursor.pitchIndex == -1) || this._cursorIsInSelection()) {
                    sequence.append(new ChangePatternSelection(this._doc, 0, 0));
                } else {
                    if (this._cursor.curNote != null) {
                        sequence.append(new ChangePatternSelection(this._doc, this._cursor.curNote.start, this._cursor.curNote.end));
                    } else {
                        const start: number = Math.max(0, Math.min((this._doc.song.beatsPerBar - 1) * Config.partsPerBeat, Math.floor(this._cursor.exactPart / Config.partsPerBeat) * Config.partsPerBeat));
                        const end: number = start + Config.partsPerBeat;
                        sequence.append(new ChangePatternSelection(this._doc, start, end));
                    }
                }
            } else if (this._cursorIsInSelection()) {
                this._draggingSelectionContents = true;
            } else if (this._cursor.valid && this._cursor.curNote == null) {
                sequence.append(new ChangePatternSelection(this._doc, 0, 0));

                // If clicking in empty space, the result will be adding a note,
                // so we can safely add it immediately. Note that if clicking on
                // or near an existing note, the result will depend on whether
                // a drag follows, so we couldn't add the note yet without being
                // confusing.

                const note: Note = new Note(this._cursor.pitch, this._cursor.start, this._cursor.end, Config.noteSizeMax, this._doc.song.getChannelIsNoise(this._doc.channel));
                note.pins = [];
                for (const oldPin of this._cursor.pins) {
                    note.pins.push(makeNotePin(0, oldPin.time, oldPin.size));
                }
                sequence.append(new ChangeEnsurePatternExists(this._doc, this._doc.channel, this._doc.bar));
                const pattern: Pattern | null = this._doc.getCurrentPattern(this._barOffset);
                if (pattern == null) throw new Error();
                sequence.append(new ChangeNoteAdded(this._doc, pattern, note, this._cursor.curIndex));

                if (this._doc.enableNotePreview && !this._doc.synth.playing) {
                    // Play the new note out loud if enabled.
                    const duration: number = Math.min(Config.partsPerBeat, this._cursor.end - this._cursor.start);
                    this._doc.synth.liveInputDuration = duration;
                    this._doc.synth.liveInputPitches = [this._cursor.pitch];
                    this._doc.synth.liveInputStarted = true;
                }
            }
            this._updateSelection();
        }
    }

    private _whenMouseMoved = (event: MouseEvent): void => {
        const boundingRect: ClientRect = this._svg.getBoundingClientRect();
        this._mouseX = ((event.clientX || event.pageX) - boundingRect.left) * this._editorWidth / (boundingRect.right - boundingRect.left);
        this._mouseY = ((event.clientY || event.pageY) - boundingRect.top) * this._editorHeight / (boundingRect.bottom - boundingRect.top);
        if (isNaN(this._mouseX)) this._mouseX = 0;
        if (isNaN(this._mouseY)) this._mouseY = 0;
        this._usingTouch = false;
        this._whenCursorMoved();
    }

    private _whenTouchMoved = (event: TouchEvent): void => {
        if (!this._mouseDown) return;
        event.preventDefault();
        const boundingRect: ClientRect = this._svg.getBoundingClientRect();
        this._mouseX = (event.touches[0].clientX - boundingRect.left) * this._editorWidth / (boundingRect.right - boundingRect.left);
        this._mouseY = (event.touches[0].clientY - boundingRect.top) * this._editorHeight / (boundingRect.bottom - boundingRect.top);
        if (isNaN(this._mouseX)) this._mouseX = 0;
        if (isNaN(this._mouseY)) this._mouseY = 0;
        this._whenCursorMoved();
    }

    private _whenCursorMoved(): void {
        if (this._doc.enableNotePreview && this._mouseOver) this._doc.synth.maintainLiveInput();

        // HACK: Undoable pattern changes rely on persistent instance
        // references. Loading song from hash via undo/redo breaks that,
        // so changes are no longer undoable and the cursor status may be
        // invalid. Abort further drag changes until the mouse is released.
        const continuousState: boolean = this._doc.lastChangeWas(this._dragChange);

        if (!this._mouseDragging && this._mouseDown && this._cursor.valid && continuousState) {
            const dx: number = this._mouseX - this._mouseXStart;
            const dy: number = this._mouseY - this._mouseYStart;
            if (Math.sqrt(dx * dx + dy * dy) > 5) {
                this._mouseDragging = true;
                this._mouseHorizontal = Math.abs(dx) >= Math.abs(dy);
            }
        }

        if (this._shiftHeld && this._mouseHorizontal && Math.abs(this._mouseXStart - this._mouseX) > 5) {
            this._dragConfirmed = true;
        }

        if (this._mouseDragging && this._mouseDown && this._cursor.valid && continuousState) {
            this._dragChange!.undo();
            const sequence: ChangeSequence = new ChangeSequence();
            this._dragChange = sequence;
            this._doc.setProspectiveChange(this._dragChange);

            const minDivision: number = this._getMinDivision();
            const currentPart: number = this._snapToMinDivision(this._mouseX / this._partWidth);
            if (this._draggingStartOfSelection) {
                sequence.append(new ChangePatternSelection(this._doc, Math.max(0, Math.min(this._doc.song.beatsPerBar * Config.partsPerBeat, currentPart)), this._doc.selection.patternSelectionEnd));
                this._updateSelection();
            } else if (this._draggingEndOfSelection) {
                sequence.append(new ChangePatternSelection(this._doc, this._doc.selection.patternSelectionStart, Math.max(0, Math.min(this._doc.song.beatsPerBar * Config.partsPerBeat, currentPart))));
                this._updateSelection();
            } else if (this._draggingSelectionContents) {
                const pattern: Pattern | null = this._doc.getCurrentPattern(this._barOffset);
                if (this._mouseDragging && pattern != null) {
                    this._dragChange!.undo();
                    const sequence: ChangeSequence = new ChangeSequence();
                    this._dragChange = sequence;
                    this._doc.setProspectiveChange(this._dragChange);

                    const notesInScale: number = Config.scales[this._doc.song.scale].flags.filter(x => x).length;
                    const pitchRatio: number = this._doc.song.getChannelIsNoise(this._doc.channel) ? 1 : 12 / notesInScale;
                    const draggedParts: number = Math.round((this._mouseX - this._mouseXStart) / (this._partWidth * minDivision)) * minDivision;
                    const draggedTranspose: number = Math.round((this._mouseYStart - this._mouseY) / (this._pitchHeight * pitchRatio));
                    sequence.append(new ChangeDragSelectedNotes(this._doc, this._doc.channel, pattern, draggedParts, draggedTranspose));
                }

            } else if (this._shiftHeld && this._dragConfirmed) {

                if (this._mouseDragging) {
                    let start: number = Math.max(0, Math.min((this._doc.song.beatsPerBar - 1) * Config.partsPerBeat, Math.floor(this._cursor.exactPart / Config.partsPerBeat) * Config.partsPerBeat));
                    let end: number = start + Config.partsPerBeat;
                    if (this._cursor.curNote != null) {
                        start = Math.max(start, this._cursor.curNote.start);
                        end = Math.min(end, this._cursor.curNote.end);
                    }

                    // Todo: The following two conditional blocks could maybe be refactored.
                    if (currentPart < start) {
                        start = 0;
                        const pattern: Pattern | null = this._doc.getCurrentPattern(this._barOffset);
                        if (pattern != null) {
                            for (let i: number = 0; i < pattern.notes.length; i++) {
                                if (pattern.notes[i].start <= currentPart) {
                                    start = pattern.notes[i].start;
                                }
                                if (pattern.notes[i].end <= currentPart) {
                                    start = pattern.notes[i].end;
                                }
                            }
                        }
                        for (let beat: number = 0; beat <= this._doc.song.beatsPerBar; beat++) {
                            const part: number = beat * Config.partsPerBeat;
                            if (start <= part && part <= currentPart) {
                                start = part;
                            }
                        }
                    }

                    if (currentPart > end) {
                        end = Config.partsPerBeat * this._doc.song.beatsPerBar;
                        const pattern: Pattern | null = this._doc.getCurrentPattern(this._barOffset);
                        if (pattern != null) {
                            for (let i: number = 0; i < pattern.notes.length; i++) {
                                if (pattern.notes[i].start >= currentPart) {
                                    end = pattern.notes[i].start;
                                    break;
                                }
                                if (pattern.notes[i].end >= currentPart) {
                                    end = pattern.notes[i].end;
                                    break;
                                }
                            }
                        }
                        for (let beat: number = 0; beat <= this._doc.song.beatsPerBar; beat++) {
                            const part: number = beat * Config.partsPerBeat;
                            if (currentPart < part && part < end) {
                                end = part;
                            }
                        }
                    }

                    sequence.append(new ChangePatternSelection(this._doc, start, end));
                    this._updateSelection();
                }
            } else {

                if (this._cursor.curNote == null) {
                    sequence.append(new ChangePatternSelection(this._doc, 0, 0));


                    let backwards: boolean;
                    let directLength: number;
                    if (currentPart < this._cursor.start) {
                        backwards = true;
                        directLength = this._cursor.start - currentPart;
                    } else {
                        backwards = false;
                        directLength = currentPart - this._cursor.start + minDivision;
                    }

                    let defaultLength: number = minDivision;
                    for (let i: number = minDivision; i <= this._doc.song.beatsPerBar * Config.partsPerBeat; i += minDivision) {
                        if (minDivision == 1) {
                            if (i < 5) {
                                // Allow small lengths.
                            } else if (i <= Config.partsPerBeat / 2.0) {
                                if (i % 3 != 0 && i % 4 != 0) {
                                    continue;
                                }
                            } else if (i <= Config.partsPerBeat * 1.5) {
                                if (i % 6 != 0 && i % 8 != 0) {
                                    continue;
                                }
                            } else if (i % Config.partsPerBeat != 0) {
                                continue;
                            }
                        } else {
                            if (i >= 5 * minDivision &&
                                i % Config.partsPerBeat != 0 &&
                                i != Config.partsPerBeat * 3.0 / 4.0 &&
                                i != Config.partsPerBeat * 3.0 / 2.0 &&
                                i != Config.partsPerBeat * 4.0 / 3.0) {
                                continue;
                            }
                        }

                        const blessedLength: number = i;
                        if (blessedLength == directLength) {
                            defaultLength = blessedLength;
                            break;
                        }
                        if (blessedLength < directLength) {
                            defaultLength = blessedLength;
                        }

                        if (blessedLength > directLength) {
                            if (defaultLength < directLength - minDivision) {
                                defaultLength = blessedLength;
                            }
                            break;
                        }
                    }

                    let start: number;
                    let end: number;

                    if (backwards) {
                        end = this._cursor.start;
                        start = end - defaultLength;
                    } else {
                        start = this._cursor.start;
                        end = start + defaultLength;
                    }
                    const continuesLastPattern: boolean = (start < 0 && this._doc.channel < this._doc.song.pitchChannelCount + this._doc.song.noiseChannelCount);
                    if (start < 0) start = 0;
                    if (end > this._doc.song.beatsPerBar * Config.partsPerBeat) end = this._doc.song.beatsPerBar * Config.partsPerBeat;

                    if (start < end) {
                        sequence.append(new ChangeEnsurePatternExists(this._doc, this._doc.channel, this._doc.bar));
                        const pattern: Pattern | null = this._doc.getCurrentPattern(this._barOffset);
                        if (pattern == null) throw new Error();
                        // Using parameter skipNote to force proper "collision" checking vis-a-vis pitch for mod channels.
                        sequence.append(new ChangeNoteTruncate(this._doc, pattern, start, end, new Note(this._cursor.pitch, 0, 0, 0)));
                        let i: number;
                        for (i = 0; i < pattern.notes.length; i++) {
                            if (pattern.notes[i].start >= end) break;
                        }
                        const theNote: Note = new Note(this._cursor.pitch, start, end,
                            this._doc.song.getNewNoteVolume(this._doc.song.getChannelIsMod(this._doc.channel), this._doc.channel, this._doc.getCurrentInstrument(this._barOffset), this._cursor.pitch),
                            this._doc.song.getChannelIsNoise(this._doc.channel));
                        theNote.continuesLastPattern = continuesLastPattern;
                        sequence.append(new ChangeNoteAdded(this._doc, pattern, theNote, i));
                        this._copyPins(theNote);

                        this._dragTime = backwards ? start : end;
                        this._dragPitch = this._cursor.pitch;
                        this._dragSize = theNote.pins[backwards ? 0 : 1].size;
                        this._dragVisible = true;
                    }

                    let prevPattern: Pattern | null = this._pattern;

                    this._pattern = this._doc.getCurrentPattern(this._barOffset);

                    if (this._pattern != null && this._doc.song.getChannelIsMod(this._doc.channel) && this._interactive && prevPattern != this._pattern) {
                        // Need to re-sort the notes by start time as they might change order if user drags them around.
                        this._pattern.notes.sort(function (a, b) { return (a.start == b.start) ? a.pitches[0] - b.pitches[0] : a.start - b.start; });
                    }

                } else if (this._mouseHorizontal) {

                    sequence.append(new ChangePatternSelection(this._doc, 0, 0));

                    const shift: number = (this._mouseX - this._mouseXStart) / this._partWidth;

                    const shiftedPin: NotePin = this._cursor.curNote.pins[this._cursor.nearPinIndex];
                    let shiftedTime: number = Math.round((this._cursor.curNote.start + shiftedPin.time + shift) / minDivision) * minDivision;
                    const continuesLastPattern: boolean = (shiftedTime < 0.0 && this._doc.channel < this._doc.song.pitchChannelCount + this._doc.song.noiseChannelCount);
                    if (shiftedTime < 0) shiftedTime = 0;
                    if (shiftedTime > this._doc.song.beatsPerBar * Config.partsPerBeat) shiftedTime = this._doc.song.beatsPerBar * Config.partsPerBeat;

                    if (this._pattern == null) throw new Error();

                    if (shiftedTime <= this._cursor.curNote.start && this._cursor.nearPinIndex == this._cursor.curNote.pins.length - 1 ||
                        shiftedTime >= this._cursor.curNote.end && this._cursor.nearPinIndex == 0) {

                        sequence.append(new ChangeNoteAdded(this._doc, this._pattern, this._cursor.curNote, this._cursor.curIndex, true));

                        this._dragVisible = false;
                    } else {
                        const start: number = Math.min(this._cursor.curNote.start, shiftedTime);
                        const end: number = Math.max(this._cursor.curNote.end, shiftedTime);

                        this._dragTime = shiftedTime;
                        this._dragPitch = this._cursor.curNote.pitches[this._cursor.pitchIndex == -1 ? 0 : this._cursor.pitchIndex] + this._cursor.curNote.pins[this._cursor.nearPinIndex].interval;
                        this._dragSize = this._cursor.curNote.pins[this._cursor.nearPinIndex].size;
                        this._dragVisible = true;

                        sequence.append(new ChangeNoteTruncate(this._doc, this._pattern, start, end, this._cursor.curNote));
                        sequence.append(new ChangePinTime(this._doc, this._cursor.curNote, this._cursor.nearPinIndex, shiftedTime, continuesLastPattern));
                        this._copyPins(this._cursor.curNote);
                    }
                } else if (this._cursor.pitchIndex == -1 || this._doc.song.getChannelIsMod(this._doc.channel)) {

                    if (!this._mouseDragging)
                    sequence.append(new ChangePatternSelection(this._doc, 0, 0));

                    const bendPart: number =
                        Math.max(this._cursor.curNote.start,
                            Math.min(this._cursor.curNote.end,
                                Math.round(this._mouseX / (this._partWidth * minDivision)) * minDivision
                            )
                        ) - this._cursor.curNote.start;

                    let prevPin: NotePin;
                    let nextPin: NotePin = this._cursor.curNote.pins[0];
                    let bendSize: number = 0;
                    let bendInterval: number = 0;
                    let cap: number = this._doc.song.getVolumeCap(this._doc.song.getChannelIsMod(this._doc.channel), this._doc.channel, this._doc.getCurrentInstrument(this._barOffset), this._cursor.pitch);

                    // Dragging gets a bit faster after difference in drag counts is >8.
                    let dragFactorSlow: number = 25.0 / Math.pow(cap, 0.4);
                    let dragFactorFast: number = 22.0 / Math.pow(cap, 0.5);
                    let dragSign: number = (this._mouseYStart > this._mouseY ? 1 : -1);
                    let dragCounts: number = Math.min(Math.abs(this._mouseYStart - this._mouseY) / dragFactorSlow, 8) + Math.max(0, Math.abs(this._mouseYStart - this._mouseY) / dragFactorFast - 8);

                    // Note volume drag overrides attempts to make a pattern selection
                    if (dragCounts > 0) {
                        this._shiftHeld = false;
                    }

                    for (let i: number = 1; i < this._cursor.curNote.pins.length; i++) {
                        prevPin = nextPin;
                        nextPin = this._cursor.curNote.pins[i];
                        if (bendPart > nextPin.time) continue;
                        if (bendPart < prevPin.time) throw new Error();
                        const sizeRatio: number = (bendPart - prevPin.time) / (nextPin.time - prevPin.time);
                        bendSize = Math.round(prevPin.size * (1.0 - sizeRatio) + nextPin.size * sizeRatio + dragSign * dragCounts);
                        // If not in fine control mode, round to 0~2~4~6 (normal 4 settings)
                        if (!this.controlMode && !this._doc.alwaysFineNoteVol && !this._doc.song.getChannelIsMod(this._doc.channel)) {
                            bendSize = Math.floor(bendSize / 2) * 2;
                        }
                        if (bendSize < 0) bendSize = 0;
                        if (bendSize > cap) bendSize = cap;
                        bendInterval = this._snapToPitch(prevPin.interval * (1.0 - sizeRatio) + nextPin.interval * sizeRatio + this._cursor.curNote.pitches[0], 0, Config.maxPitch) - this._cursor.curNote.pitches[0];
                        break;
                    }
                    if (this._doc.song.getChannelIsMod(this._doc.channel) && this.controlMode) {
                        // Link bend to the next note over
                        if (bendPart >= this._cursor.curNote.pins[this._cursor.curNote.pins.length - 1].time) {
                            if (this._cursor.curNote.start + this._cursor.curNote.pins[this._cursor.curNote.pins.length - 1].time < this._doc.song.beatsPerBar * Config.partsPerBeat) {
                                for (const note of this._pattern!.notes) {
                                    if (note.start == this._cursor.curNote.start + this._cursor.curNote.pins[this._cursor.curNote.pins.length - 1].time && note.pitches[0] == this._cursor.curNote.pitches[0]) {
                                        sequence.append(new ChangeSizeBend(this._doc, note, note.pins[0].time, bendSize, bendInterval, this.shiftMode));
                                    }
                                }
                            }
                            else {
                                // Try to bend to the next pattern over. Only do this if a note starts at 0, and instrument is identical in next pattern.
                                const nextPattern: Pattern | null = this._doc.getCurrentPattern(1);

                                if (nextPattern != null && nextPattern.instruments[0] == this._pattern!.instruments[0]) {
                                    for (const note of nextPattern.notes) {
                                        if (note.start == 0 && note.pitches[0] == this._cursor.curNote.pitches[0]) {
                                            sequence.append(new ChangeSizeBend(this._doc, note, note.pins[0].time, bendSize, bendInterval, this.shiftMode));
                                        }
                                    }
                                }

                            }
                        }
                        // Link bend to the previous note
                        else if (bendPart <= this._cursor.curNote.pins[0].time) {
                            if (this._cursor.curNote.start > 0) {
                                for (const note of this._pattern!.notes) {
                                    if (note.end == this._cursor.curNote.start && note.pitches[0] == this._cursor.curNote.pitches[0]) {
                                        sequence.append(new ChangeSizeBend(this._doc, note, note.pins[note.pins.length - 1].time, bendSize, bendInterval, this.shiftMode));
                                    }
                                }
                            }
                            else {
                                // Try to bend to the previous pattern over. Only do this if a note starts at the end, and instrument is identical in previous pattern.
                                const prevPattern: Pattern | null = this._doc.getCurrentPattern(-1);

                                if (prevPattern != null && prevPattern.instruments[0] == this._pattern!.instruments[0]) {
                                    for (const note of prevPattern.notes) {
                                        if (note.end == this._doc.song.beatsPerBar * Config.partsPerBeat && note.pitches[0] == this._cursor.curNote.pitches[0]) {
                                            sequence.append(new ChangeSizeBend(this._doc, note, note.pins[note.pins.length - 1].time, bendSize, bendInterval, this.shiftMode));
                                        }
                                    }
                                }
                            }
                        }
                    }

                    this._dragTime = this._cursor.curNote.start + bendPart;
                    this._dragPitch = this._cursor.curNote.pitches[this._cursor.pitchIndex == -1 ? 0 : this._cursor.pitchIndex] + bendInterval;
                    this._dragSize = bendSize;
                    this._dragVisible = true;

                    sequence.append(new ChangeSizeBend(this._doc, this._cursor.curNote, bendPart, bendSize, bendInterval, this.shiftMode));
                    this._copyPins(this._cursor.curNote);
                } else {
                    sequence.append(new ChangePatternSelection(this._doc, 0, 0));

                    this._dragSize = this._cursor.curNote.pins[this._cursor.nearPinIndex].size;

                    if (this._pattern == null) throw new Error();

                    let bendStart: number;
                    let bendEnd: number;
                    if (this._mouseX >= this._mouseXStart) {
                        bendStart = Math.max(this._cursor.curNote.start, this._cursor.part);
                        bendEnd = currentPart + minDivision;
                    } else {
                        bendStart = Math.min(this._cursor.curNote.end, this._cursor.part + minDivision);
                        bendEnd = currentPart;
                    }
                    if (bendEnd < 0) bendEnd = 0;
                    if (bendEnd > this._doc.song.beatsPerBar * Config.partsPerBeat) bendEnd = this._doc.song.beatsPerBar * Config.partsPerBeat;
                    if (bendEnd > this._cursor.curNote.end) {
                        sequence.append(new ChangeNoteTruncate(this._doc, this._pattern, this._cursor.curNote.start, bendEnd, this._cursor.curNote));
                    }
                    if (bendEnd < this._cursor.curNote.start) {
                        sequence.append(new ChangeNoteTruncate(this._doc, this._pattern, bendEnd, this._cursor.curNote.end, this._cursor.curNote));
                    }

                    let minPitch: number = Number.MAX_VALUE;
                    let maxPitch: number = -Number.MAX_VALUE;
                    for (const pitch of this._cursor.curNote.pitches) {
                        if (minPitch > pitch) minPitch = pitch;
                        if (maxPitch < pitch) maxPitch = pitch;
                    }
                    minPitch -= this._cursor.curNote.pitches[this._cursor.pitchIndex];
                    maxPitch -= this._cursor.curNote.pitches[this._cursor.pitchIndex];

                    if (!this._doc.song.getChannelIsMod(this._doc.channel)) {
                        const bendTo: number = this._snapToPitch(this._findMousePitch(this._mouseY), -minPitch, (this._doc.song.getChannelIsNoise(this._doc.channel) ? Config.drumCount - 1 : Config.maxPitch) - maxPitch);
                        sequence.append(new ChangePitchBend(this._doc, this._cursor.curNote, bendStart, bendEnd, bendTo, this._cursor.pitchIndex));
                        this._dragPitch = bendTo;
                    }
                    else {
                        const bendTo: number = this._snapToPitch(this._dragPitch, -minPitch, Config.modCount - 1);
                        sequence.append(new ChangePitchBend(this._doc, this._cursor.curNote, bendStart, bendEnd, bendTo, this._cursor.pitchIndex));
                        this._dragPitch = bendTo;
                    }
                    this._copyPins(this._cursor.curNote);

                    this._dragTime = bendEnd;
                    this._dragVisible = true;
                }
            }
        }

        if (!(this._mouseDown && this._cursor.valid && continuousState)) {
            this._updateCursorStatus();
            this._updatePreview();
        }
    }

    private _whenCursorReleased = (event: Event | null): void => {
        if (!this._cursor.valid) return;

        const continuousState: boolean = this._doc.lastChangeWas(this._dragChange);
        if (this._mouseDown && continuousState && this._dragChange != null) {

            if (this._draggingSelectionContents) {
                this._doc.record(this._dragChange);
                this._dragChange = null;
                // Need to re-sort the notes by start time as they might change order if user drags them around.
                if (this._pattern != null && this._doc.song.getChannelIsMod(this._doc.channel)) this._pattern.notes.sort(function (a, b) { return (a.start == b.start) ? a.pitches[0] - b.pitches[0] : a.start - b.start; });

            } else if (this._draggingStartOfSelection || this._draggingEndOfSelection || this._shiftHeld) {
                this._setPatternSelection(this._dragChange);
                this._dragChange = null;
            } else if (this._mouseDragging || this._cursor.curNote == null || !this._dragChange.isNoop() || this._draggingStartOfSelection || this._draggingEndOfSelection || this._draggingSelectionContents || this._shiftHeld) {
                this._doc.record(this._dragChange);
                this._dragChange = null;
                // Need to re-sort the notes by start time as they might change order if user drags them around.
                if (this._pattern != null && this._doc.song.getChannelIsMod(this._doc.channel)) this._pattern.notes.sort(function (a, b) { return (a.start == b.start) ? a.pitches[0] - b.pitches[0] : a.start - b.start; });

            } else {

                if (this._pattern == null) throw new Error();

                const sequence: ChangeSequence = new ChangeSequence();
                sequence.append(new ChangePatternSelection(this._doc, 0, 0));

                if (this._cursor.pitchIndex == -1) {
                    if (this._cursor.curNote.pitches.length == Config.maxChordSize) {
                        sequence.append(new ChangePitchAdded(this._doc, this._cursor.curNote, this._cursor.curNote.pitches[0], 0, true));
                    }
                    sequence.append(new ChangePitchAdded(this._doc, this._cursor.curNote, this._cursor.pitch, this._cursor.curNote.pitches.length));
                    this._copyPins(this._cursor.curNote);

                    if (this._doc.enableNotePreview && !this._doc.synth.playing) {
                        const duration: number = Math.min(Config.partsPerBeat, this._cursor.end - this._cursor.start);
                        this._doc.synth.liveInputDuration = duration;
                        this._doc.synth.liveInputPitches = this._cursor.curNote.pitches.concat();
                        this._doc.synth.liveInputStarted = true;
                    }
                } else {
                    if (this._cursor.curNote.pitches.length == 1) {
                        sequence.append(new ChangeNoteAdded(this._doc, this._pattern, this._cursor.curNote, this._cursor.curIndex, true));
                    } else {
                        sequence.append(new ChangePitchAdded(this._doc, this._cursor.curNote, this._cursor.pitch, this._cursor.curNote.pitches.indexOf(this._cursor.pitch), true));
                    }
                }

                this._doc.record(sequence);
            }
        }

        this._mouseDown = false;
        this._mouseDragging = false;
        this._draggingStartOfSelection = false;
        this._draggingEndOfSelection = false;
        this._draggingSelectionContents = false;
        this._lastChangeWasPatternSelection = false;
        this.modDragValueLabel.setAttribute("fill", ColorConfig.secondaryText);
        this._updateCursorStatus();
        this._updatePreview();
    }

    private _setPatternSelection(change: UndoableChange): void {
        this._changePatternSelection = change;
        this._doc.record(this._changePatternSelection, this._lastChangeWasPatternSelection);
    }


    private _updatePreview(): void {
        if (this._usingTouch) {
            if (!this._mouseDown || !this._cursor.valid || !this._mouseDragging || !this._dragVisible || this._shiftHeld || this._draggingStartOfSelection || this._draggingEndOfSelection || this._draggingSelectionContents) {
                this._svgPreview.setAttribute("visibility", "hidden");

                if (!this.editingModLabel) {
                    this.modDragValueLabel.style.setProperty("display", "none");
                    this.modDragValueLabel.style.setProperty("pointer-events", "none");
                    this.modDragValueLabel.setAttribute("contenteditable", "false");
                }

            } else {
                this._svgPreview.setAttribute("visibility", "visible");

                const x: number = this._partWidth * this._dragTime;
                const y: number = this._pitchToPixelHeight(this._dragPitch - this._octaveOffset);
                const radius: number = (this._pitchHeight - this._pitchBorder) / 2;
                const width: number = 80;
                const height: number = 60;
                const cap: number = this._doc.song.getVolumeCap(this._doc.song.getChannelIsMod(this._doc.channel), this._doc.channel, this._doc.getCurrentInstrument(this._barOffset), this._cursor.pitch);
                //this._drawNote(this._svgPreview, this._cursor.pitch, this._cursor.start, this._cursor.pins, this._pitchHeight / 2 + 1, true, this._octaveOffset);

                let pathString: string = "";

                pathString += "M " + prettyNumber(x) + " " + prettyNumber(y - radius * (this._dragSize / cap)) + " ";
                pathString += "L " + prettyNumber(x) + " " + prettyNumber(y - radius * (this._dragSize / cap) - height) + " ";
                pathString += "M " + prettyNumber(x) + " " + prettyNumber(y + radius * (this._dragSize / cap)) + " ";
                pathString += "L " + prettyNumber(x) + " " + prettyNumber(y + radius * (this._dragSize / cap) + height) + " ";
                pathString += "M " + prettyNumber(x) + " " + prettyNumber(y - radius * (this._dragSize / cap)) + " ";
                pathString += "L " + prettyNumber(x + width) + " " + prettyNumber(y - radius * (this._dragSize / cap)) + " ";
                pathString += "M " + prettyNumber(x) + " " + prettyNumber(y + radius * (this._dragSize / cap)) + " ";
                pathString += "L " + prettyNumber(x + width) + " " + prettyNumber(y + radius * (this._dragSize / cap)) + " ";
                pathString += "M " + prettyNumber(x) + " " + prettyNumber(y - radius * (this._dragSize / cap)) + " ";
                pathString += "L " + prettyNumber(x - width) + " " + prettyNumber(y - radius * (this._dragSize / cap)) + " ";
                pathString += "M " + prettyNumber(x) + " " + prettyNumber(y + radius * (this._dragSize / cap)) + " ";
                pathString += "L " + prettyNumber(x - width) + " " + prettyNumber(y + radius * (this._dragSize / cap)) + " ";

                this._svgPreview.setAttribute("d", pathString);
            }
        } else {
            if (!this._mouseOver || this._mouseDown || !this._cursor.valid) {
                this._svgPreview.setAttribute("visibility", "hidden");
                if (!this.editingModLabel) {
                    this.modDragValueLabel.style.setProperty("display", "none");
                    this.modDragValueLabel.style.setProperty("pointer-events", "none");
                    this.modDragValueLabel.setAttribute("contenteditable", "false");
                }
            } else {
                this._svgPreview.setAttribute("visibility", "visible");

                if (this._cursorAtStartOfSelection()) {
                    const center: number = this._partWidth * this._doc.selection.patternSelectionStart;
                    const left: string = prettyNumber(center - 4);
                    const right: string = prettyNumber(center + 4);
                    const bottom: number = this._pitchToPixelHeight(-0.5);
                    this._svgPreview.setAttribute("d", "M " + left + " 0 L " + left + " " + bottom + " L " + right + " " + bottom + " L " + right + " 0 z");
                } else if (this._cursorAtEndOfSelection()) {
                    const center: number = this._partWidth * this._doc.selection.patternSelectionEnd;
                    const left: string = prettyNumber(center - 4);
                    const right: string = prettyNumber(center + 4);
                    const bottom: number = this._pitchToPixelHeight(-0.5);
                    this._svgPreview.setAttribute("d", "M " + left + " 0 L " + left + " " + bottom + " L " + right + " " + bottom + " L " + right + " 0 z");
                } else if (this._cursorIsInSelection()) {
                    const left: string = prettyNumber(this._partWidth * this._doc.selection.patternSelectionStart - 2);
                    const right: string = prettyNumber(this._partWidth * this._doc.selection.patternSelectionEnd + 2);
                    const bottom: number = this._pitchToPixelHeight(-0.5);
                    this._svgPreview.setAttribute("d", "M " + left + " 0 L " + left + " " + bottom + " L " + right + " " + bottom + " L " + right + " 0 z");
                } else {
                    this._drawNote(this._svgPreview, this._cursor.pitch, this._cursor.start, this._cursor.pins, (this._pitchHeight - this._pitchBorder) / 2 + 1, true, this._octaveOffset);
                }
            }
        }
    }

    private _updateSelection(): void {
        if (this._doc.selection.patternSelectionActive) {
            this._selectionRect.setAttribute("visibility", "visible");
            this._selectionRect.setAttribute("x", String(this._partWidth * this._doc.selection.patternSelectionStart));
            this._selectionRect.setAttribute("width", String(this._partWidth * (this._doc.selection.patternSelectionEnd - this._doc.selection.patternSelectionStart)));
        } else {
            this._selectionRect.setAttribute("visibility", "hidden");
        }
    }

    public render(): void {
        const nextPattern: Pattern | null = this._doc.getCurrentPattern(this._barOffset);

        if (this._pattern != nextPattern && this._pattern != null) {
            if (this._doc.song.getChannelIsMod(this._doc.channel) && this._interactive && nextPattern != null) {
                // Need to re-sort the notes by start time as they might change order if user drags them around.
                nextPattern.notes.sort(function (a, b) { return (a.start == b.start) ? a.pitches[0] - b.pitches[0] : a.start - b.start; });
            }
            this._dragChange = null;
            this._whenCursorReleased(null);
        }
        this._pattern = nextPattern;

        this._editorWidth = this.container.clientWidth;
        this._editorHeight = this.container.clientHeight;
        this._partWidth = this._editorWidth / (this._doc.song.beatsPerBar * Config.partsPerBeat);
        this._octaveOffset = this._doc.song.channels[this._doc.channel].octave * Config.pitchesPerOctave;

        if (this._doc.song.getChannelIsNoise(this._doc.channel)) {
            this._pitchBorder = 0;
            this._pitchCount = Config.drumCount;
        }
        else if (this._doc.song.getChannelIsMod(this._doc.channel)) {
            this._pitchBorder = this._defaultModBorder;
            this._pitchCount = Config.modCount;

            if (this._pattern != null) {
                // Force max height of mod channels to conform to settings.
                for (const note of this._pattern.notes) {
                    let pitch = note.pitches[0]; // No pitch bend possible in mod channels.
                    let maxHeight: number = this._doc.song.getVolumeCap(true, this._doc.channel, this._doc.getCurrentInstrument(this._barOffset), pitch);
                    let maxFoundHeight: number = 0;
                    for (const pin of note.pins) {
                        if (pin.size > maxFoundHeight) {
                            maxFoundHeight = pin.size;
                        }
                    }
                    // Apply scaling if the max height is below any pin setting.
                    if (maxFoundHeight > maxHeight) {
                        for (const pin of note.pins) {
                            pin.size = Math.round(pin.size * (maxHeight / maxFoundHeight));
                        }
                    }
                }
            }
        }
        else {
            this._pitchBorder = 0;
            this._pitchCount = this._doc.getVisiblePitchCount();
        }

        this._pitchHeight = this._editorHeight / this._pitchCount;
        this._octaveOffset = this._doc.getBaseVisibleOctave(this._doc.channel) * Config.pitchesPerOctave;

        if (this._renderedRhythm != this._doc.song.rhythm ||
            this._renderedPitchChannelCount != this._doc.song.pitchChannelCount ||
            this._renderedNoiseChannelCount != this._doc.song.noiseChannelCount ||
            this._renderedModChannelCount != this._doc.song.modChannelCount) {
            this._renderedRhythm = this._doc.song.rhythm;
            this._renderedPitchChannelCount = this._doc.song.pitchChannelCount;
            this._renderedNoiseChannelCount = this._doc.song.noiseChannelCount;
            this._renderedModChannelCount = this._doc.song.modChannelCount;
            this.resetCopiedPins();
        }

        this._copiedPins = this._copiedPinChannels[this._doc.channel];

        if (this._renderedWidth != this._editorWidth || this._renderedHeight != this._editorHeight) {
            this._renderedWidth = this._editorWidth;
            this._renderedHeight = this._editorHeight;
            this._svgBackground.setAttribute("width", "" + this._editorWidth);
            this._svgBackground.setAttribute("height", "" + this._editorHeight);
            this._svgPlayhead.setAttribute("height", "" + this._editorHeight);
            this._selectionRect.setAttribute("y", "0");
            this._selectionRect.setAttribute("height", "" + this._editorHeight);
        }

        const beatWidth = this._editorWidth / this._doc.song.beatsPerBar;
        if (this._renderedBeatWidth != beatWidth || this._renderedPitchHeight != this._pitchHeight) {
            this._renderedBeatWidth = beatWidth;
            this._renderedPitchHeight = this._pitchHeight;
            this._svgNoteBackground.setAttribute("width", "" + beatWidth);
            this._svgNoteBackground.setAttribute("height", "" + (this._pitchHeight * Config.pitchesPerOctave));
            this._svgDrumBackground.setAttribute("width", "" + beatWidth);
            this._svgDrumBackground.setAttribute("height", "" + this._pitchHeight);
            this._svgModBackground.setAttribute("width", "" + beatWidth);
            this._svgModBackground.setAttribute("height", "" + (this._pitchHeight));
            this._svgModBackground.setAttribute("y", "" + (this._pitchBorder / 2));
            this._backgroundDrumRow.setAttribute("width", "" + (beatWidth - 2));
            this._backgroundDrumRow.setAttribute("height", "" + (this._pitchHeight - 2));
            if (this._pitchHeight > this._pitchBorder) {
                this._backgroundModRow.setAttribute("width", "" + (beatWidth - 2));
                this._backgroundModRow.setAttribute("height", "" + (this._pitchHeight - this._pitchBorder));
            }



            for (let j: number = 0; j < Config.pitchesPerOctave; j++) {
                const rectangle: SVGRectElement = this._backgroundPitchRows[j];
                const y: number = (Config.pitchesPerOctave - j) % Config.pitchesPerOctave;
                rectangle.setAttribute("width", "" + (beatWidth - 2));
                rectangle.setAttribute("y", "" + (y * this._pitchHeight + 1));
                rectangle.setAttribute("height", "" + (this._pitchHeight - 2));
            }
        }

        this._svgNoteContainer = makeEmptyReplacementElement(this._svgNoteContainer);

        if (this._interactive) {
            if (!this._mouseDown) this._updateCursorStatus();
            this._updatePreview();
            this._updateSelection();
        }

        if (this._renderedFifths != this._doc.showFifth) {
            this._renderedFifths = this._doc.showFifth;
            this._backgroundPitchRows[7].setAttribute("fill", this._doc.showFifth ? ColorConfig.fifthNote : ColorConfig.pitchBackground);
        }

        for (let j: number = 0; j < Config.pitchesPerOctave; j++) {

            this._backgroundPitchRows[j].style.visibility = Config.scales[this._doc.song.scale].flags[j] ? "visible" : "hidden";
        }

        if (this._doc.song.getChannelIsNoise(this._doc.channel)) {
            if (!this._renderedDrums) {
                this._renderedDrums = true;
                this._renderedMod = false;
                this._svgBackground.setAttribute("fill", "url(#patternEditorDrumBackground" + this._barOffset + ")");
            }
        } else if (this._doc.song.getChannelIsMod(this._doc.channel)) {
            if (!this._renderedMod) {
                this._renderedDrums = false;
                this._renderedMod = true;
                this._svgBackground.setAttribute("fill", "url(#patternEditorModBackground" + this._barOffset + ")");
            }
        } else {
            if (this._renderedDrums || this._renderedMod) {
                this._renderedDrums = false;
                this._renderedMod = false;
                this._svgBackground.setAttribute("fill", "url(#patternEditorNoteBackground" + this._barOffset + ")");
            }
        }

        if (this._doc.showChannels) {
            if (!this._doc.song.getChannelIsMod(this._doc.channel)) {
                for (let channel: number = this._doc.song.pitchChannelCount + this._doc.song.noiseChannelCount - 1; channel >= 0; channel--) {
                    if (channel == this._doc.channel) continue;
                    if (this._doc.song.getChannelIsNoise(channel) != this._doc.song.getChannelIsNoise(this._doc.channel)) continue;

                    const pattern2: Pattern | null = this._doc.song.getPattern(channel, this._doc.bar + this._barOffset);
                    if (pattern2 == null) continue;

                    const octaveOffset: number = this._doc.getBaseVisibleOctave(channel) * Config.pitchesPerOctave;
                    for (const note of pattern2.notes) {
                        for (const pitch of note.pitches) {
                            const notePath: SVGPathElement = SVG.path();
                            notePath.setAttribute("fill", ColorConfig.getChannelColor(this._doc.song, channel).secondaryNote);
                            notePath.setAttribute("pointer-events", "none");
                            this._drawNote(notePath, pitch, note.start, note.pins, this._pitchHeight * 0.19, false, octaveOffset);
                            this._svgNoteContainer.appendChild(notePath);
                        }
                    }
                }
            }
        }

        if (this._pattern != null) {
            const instrument: Instrument = this._doc.song.channels[this._doc.channel].instruments[this._doc.getCurrentInstrument(this._barOffset)];
            const chord: Chord = instrument.getChord();
            const transition: Transition = instrument.getTransition();
            const displayNumberedChords: boolean = chord.customInterval || chord.arpeggiates || chord.strumParts > 0 || transition.slides;
            for (const note of this._pattern.notes) {
                let disabled: boolean = false;
                if (this._doc.song.getChannelIsMod(this._doc.channel)) {
                    const modIndex: number = instrument.modulators[Config.modCount - 1 - note.pitches[0]];
                    if ((modIndex == Config.modulators.dictionary["none"].index)
                    || instrument.invalidModulators[Config.modCount - 1 - note.pitches[0]])
                        disabled = true;
                }
                for (let i: number = 0; i < note.pitches.length; i++) {
                    const pitch: number = note.pitches[i];
                    let notePath: SVGPathElement = SVG.path();
                    let colorPrimary: string = (disabled ? ColorConfig.disabledNotePrimary : ColorConfig.getChannelColor(this._doc.song, this._doc.channel).primaryNote);
                    let colorSecondary: string = (disabled ? ColorConfig.disabledNoteSecondary : ColorConfig.getChannelColor(this._doc.song, this._doc.channel).secondaryNote);
                    notePath.setAttribute("fill", colorSecondary);
                    notePath.setAttribute("pointer-events", "none");
                    this._drawNote(notePath, pitch, note.start, note.pins, (this._pitchHeight - this._pitchBorder) / 2 + 1, false, this._octaveOffset);
                    this._svgNoteContainer.appendChild(notePath);
                    notePath = SVG.path();
                    notePath.setAttribute("fill", colorPrimary);
                    notePath.setAttribute("pointer-events", "none");
                    this._drawNote(notePath, pitch, note.start, note.pins, (this._pitchHeight - this._pitchBorder) / 2 + 1, true, this._octaveOffset);
                    this._svgNoteContainer.appendChild(notePath);

                    let indicatorOffset: number = 2;
                    if (note.continuesLastPattern) {
                        const arrowHeight: number = Math.min(this._pitchHeight, 20);
                        let arrowPath: string;
                        arrowPath = "M " + prettyNumber(this._partWidth * note.start + indicatorOffset) + " " + prettyNumber(this._pitchToPixelHeight(pitch - this._octaveOffset) - 0.1 * arrowHeight);
                        arrowPath += "L " + prettyNumber(this._partWidth * note.start + indicatorOffset) + " " + prettyNumber(this._pitchToPixelHeight(pitch - this._octaveOffset) + 0.1 * arrowHeight);
                        arrowPath += "L " + prettyNumber(this._partWidth * note.start + indicatorOffset + 4) + " " + prettyNumber(this._pitchToPixelHeight(pitch - this._octaveOffset) + 0.1 * arrowHeight);
                        arrowPath += "L " + prettyNumber(this._partWidth * note.start + indicatorOffset + 4) + " " + prettyNumber(this._pitchToPixelHeight(pitch - this._octaveOffset) + 0.3 * arrowHeight);
                        arrowPath += "L " + prettyNumber(this._partWidth * note.start + indicatorOffset + 12) + " " + prettyNumber(this._pitchToPixelHeight(pitch - this._octaveOffset));
                        arrowPath += "L " + prettyNumber(this._partWidth * note.start + indicatorOffset + 4) + " " + prettyNumber(this._pitchToPixelHeight(pitch - this._octaveOffset) - 0.3 * arrowHeight);
                        arrowPath += "L " + prettyNumber(this._partWidth * note.start + indicatorOffset + 4) + " " + prettyNumber(this._pitchToPixelHeight(pitch - this._octaveOffset) - 0.1 * arrowHeight);
                        const arrow: SVGPathElement = SVG.path();
                        arrow.setAttribute("d", arrowPath);
                        arrow.setAttribute("fill", ColorConfig.invertedText);
                        this._svgNoteContainer.appendChild(arrow);
                        indicatorOffset += 12;
                    }

                    if (note.pitches.length > 1) {
                        if (displayNumberedChords) {
                            const oscillatorLabel: SVGTextElement = SVG.text();
                            oscillatorLabel.setAttribute("x", "" + prettyNumber(this._partWidth * note.start + indicatorOffset));
                            oscillatorLabel.setAttribute("y", "" + prettyNumber(this._pitchToPixelHeight(pitch - this._octaveOffset)));
                            oscillatorLabel.setAttribute("width", "30");
                            oscillatorLabel.setAttribute("fill", ColorConfig.invertedText);
                            oscillatorLabel.setAttribute("text-anchor", "start");
                            oscillatorLabel.setAttribute("dominant-baseline", "central");
                            oscillatorLabel.setAttribute("pointer-events", "none");
                            oscillatorLabel.textContent = "" + (i + 1);
                            this._svgNoteContainer.appendChild(oscillatorLabel);
                        }
                    }
                }


                if (this._doc.song.getChannelIsMod(this._doc.channel) && this._mouseDragging && !this._mouseHorizontal && note == this._cursor.curNote) {

                    this.modDragValueLabel.style.setProperty("display", "");
                    this.modDragValueLabel.style.setProperty("pointer-events", "none");
                    this.modDragValueLabel.setAttribute("contenteditable", "false");
                    this.modDragValueLabel.style.setProperty("color", "#FFFFFF");
                    let setting: number = this._doc.song.channels[this._doc.channel].instruments[this._doc.getCurrentInstrument(this._barOffset)].modulators[Config.modCount - 1 - note.pitches[0]];
                    let presValue: number = this._dragSize + Config.modulators[setting].convertRealFactor;

                    // This is me being too lazy to fiddle with the css to get it to align center.
                    let xOffset: number = (+(presValue >= 10.0)) + (+(presValue >= 100.0)) + (+(presValue < 0.0)) + (+(presValue <= -10.0));

                    this._modDragValueLabelWidth = 8 + xOffset * 8;
                    this._modDragValueLabelLeft = +prettyNumber(Math.max(Math.min(this._editorWidth - 10 - xOffset * 8, this._partWidth * this._dragTime - 4 - xOffset * 4), 2));
                    this._modDragValueLabelTop = +prettyNumber(this._pitchToPixelHeight(note.pitches[0] - this._octaveOffset) - 17 - (this._pitchHeight - this._pitchBorder) / 2);

                    this.modDragValueLabel.style.setProperty("left", "" + this._modDragValueLabelLeft + "px");
                    this.modDragValueLabel.style.setProperty("top", "" + this._modDragValueLabelTop + "px");
                    this.modDragValueLabel.textContent = "" + presValue;

                }
            }
        }
    }

    private _drawNote(svgElement: SVGPathElement, pitch: number, start: number, pins: NotePin[], radius: number, showSize: boolean, offset: number): void {
        const totalWidth: number = this._partWidth * (pins[pins.length - 1].time + pins[0].time);
        const endOffset: number = 0.5 * Math.min(2, totalWidth - 1);

        let nextPin: NotePin = pins[0];

        const cap: number = this._doc.song.getVolumeCap(this._doc.song.getChannelIsMod(this._doc.channel), this._doc.channel, this._doc.getCurrentInstrument(this._barOffset), pitch);

        let pathString: string = "M " + prettyNumber(this._partWidth * (start + nextPin.time) + endOffset) + " " + prettyNumber(this._pitchToPixelHeight(pitch - offset) + radius * (showSize ? nextPin.size / cap : 1.0)) + " ";

        for (let i: number = 1; i < pins.length; i++) {
            let prevPin: NotePin = nextPin;
            nextPin = pins[i];
            let prevSide: number = this._partWidth * (start + prevPin.time) + (i == 1 ? endOffset : 0);
            let nextSide: number = this._partWidth * (start + nextPin.time) - (i == pins.length - 1 ? endOffset : 0);
            let prevHeight: number = this._pitchToPixelHeight(pitch + prevPin.interval - offset);
            let nextHeight: number = this._pitchToPixelHeight(pitch + nextPin.interval - offset);
            let prevSize: number = showSize ? prevPin.size / cap : 1.0;
            let nextSize: number = showSize ? nextPin.size / cap : 1.0;
            pathString += "L " + prettyNumber(prevSide) + " " + prettyNumber(prevHeight - radius * prevSize) + " ";
            if (prevPin.interval > nextPin.interval) pathString += "L " + prettyNumber(prevSide + 1) + " " + prettyNumber(prevHeight - radius * prevSize) + " ";
            if (prevPin.interval < nextPin.interval) pathString += "L " + prettyNumber(nextSide - 1) + " " + prettyNumber(nextHeight - radius * nextSize) + " ";
            pathString += "L " + prettyNumber(nextSide) + " " + prettyNumber(nextHeight - radius * nextSize) + " ";
        }
        for (let i: number = pins.length - 2; i >= 0; i--) {
            let prevPin: NotePin = nextPin;
            nextPin = pins[i];
            let prevSide: number = this._partWidth * (start + prevPin.time) - (i == pins.length - 2 ? endOffset : 0);
            let nextSide: number = this._partWidth * (start + nextPin.time) + (i == 0 ? endOffset : 0);
            let prevHeight: number = this._pitchToPixelHeight(pitch + prevPin.interval - offset);
            let nextHeight: number = this._pitchToPixelHeight(pitch + nextPin.interval - offset);
            let prevSize: number = showSize ? prevPin.size / cap : 1.0;
            let nextSize: number = showSize ? nextPin.size / cap : 1.0;
            pathString += "L " + prettyNumber(prevSide) + " " + prettyNumber(prevHeight + radius * prevSize) + " ";
            if (prevPin.interval < nextPin.interval) pathString += "L " + prettyNumber(prevSide - 1) + " " + prettyNumber(prevHeight + radius * prevSize) + " ";
            if (prevPin.interval > nextPin.interval) pathString += "L " + prettyNumber(nextSide + 1) + " " + prettyNumber(nextHeight + radius * nextSize) + " ";
            pathString += "L " + prettyNumber(nextSide) + " " + prettyNumber(nextHeight + radius * nextSize) + " ";
        }
        pathString += "z";

        svgElement.setAttribute("d", pathString);
    }

    private _pitchToPixelHeight(pitch: number): number {
        return this._pitchHeight * (this._pitchCount - (pitch) - 0.5);
    }
}
