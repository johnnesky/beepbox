// Copyright (c) 2012-2022 John Nesky and contributing authors, distributed under the MIT license, see accompanying the LICENSE.md file.

import {Config} from "../synth/SynthConfig";
import {EditorConfig} from "./EditorConfig";
import {SongDocument} from "./SongDocument";
import {Prompt} from "./Prompt";
import {HTML} from "imperative-html/dist/esm/elements-strict";
import {ColorConfig} from "./ColorConfig";
import {KeyboardLayout} from "./KeyboardLayout";
import {Piano} from "./Piano";

const {button, label, div, p, a, h2, input, select, option} = HTML;

export class RecordingSetupPrompt implements Prompt {
	private readonly _keyboardMode: HTMLSelectElement = select({style: "width: 100%;"},
		option({value: "useCapsLockForNotes"}, "simple shortcuts, use caps lock to play notes"),
		option({value: "pressControlForShortcuts"}, "simple notes, press " + EditorConfig.ctrlName + " for shortcuts"),
	);
	private readonly _keyboardLayout: HTMLSelectElement = select({style: "width: 100%;"},
		option({value: "wickiHayden"}, "Wicki-Hayden"),
		option({value: "songScale"}, "selected song scale"),
		option({value: "pianoAtC"}, "piano starting at C :)"),
		option({value: "pianoAtA"}, "piano starting at A :("),
		option({value: "pianoTransposingC"}, "piano transposing C :) to song key"),
		option({value: "pianoTransposingA"}, "piano transposing A :( to song key"),
	);
	private readonly _keyboardLayoutPreview: HTMLDivElement = div({style: "display: grid; row-gap: 4px; margin: 4px auto; font-size: 10px;"});
	private readonly _enableMidi: HTMLInputElement = input({style: "width: 2em; margin-left: 1em;", type: "checkbox"});
	private readonly _showRecordButton: HTMLInputElement = input({style: "width: 2em; margin-left: 1em;", type: "checkbox"});
	private readonly _snapRecordedNotesToRhythm: HTMLInputElement = input({style: "width: 2em; margin-left: 1em;", type: "checkbox"});
	private readonly _ignorePerformedNotesNotInScale: HTMLInputElement = input({style: "width: 2em; margin-left: 1em;", type: "checkbox"});
	private readonly _metronomeCountIn: HTMLInputElement = input({style: "width: 2em; margin-left: 1em;", type: "checkbox"});
	private readonly _metronomeWhileRecording: HTMLInputElement = input({style: "width: 2em; margin-left: 1em;", type: "checkbox"});
	
	private readonly _okayButton: HTMLButtonElement = button({class: "okayButton", style: "width:45%;"}, "Okay");
	private readonly _cancelButton: HTMLButtonElement = button({class: "cancelButton"});
	public readonly container: HTMLDivElement = div({class: "prompt noSelection recordingSetupPrompt", style: "width: 333px; text-align: right; max-height: 90%;"},
		h2("Note Recording Setup"),
		div({style: "display: grid; overflow-y: auto; overflow-x: hidden; flex-shrink: 1;"},
			p("BeepBox can record notes as you perform them. You can start recording by pressing Ctrl+Space (or " + EditorConfig.ctrlSymbol + "P)."),
			label({style: "display: flex; flex-direction: row; align-items: center; height: 2em; justify-content: flex-end;"},
				"Add ● record button next to ▶ play button:",
				this._showRecordButton,
			),
			label({style: "display: flex; flex-direction: row; align-items: center; height: 2em; justify-content: flex-end;"},
				"Snap recorded notes to the song's rhythm:",
				this._snapRecordedNotesToRhythm,
			),
			label({style: "display: flex; flex-direction: row; align-items: center; height: 2em; justify-content: flex-end;"},
				"Ignore notes not in the song's scale:",
				this._ignorePerformedNotesNotInScale,
			),
			p("While recording, you can perform notes on your keyboard!"),
			label({style: "display: flex; flex-direction: row; align-items: center; height: 2em; justify-content: flex-end;"},
				"Keyboard layout:",
				div({class: "selectContainer", style: "width: 65%; margin-left: 1em;"}, this._keyboardLayout),
			),
			this._keyboardLayoutPreview,
			p("When not recording, you can use the computer keyboard either for shortcuts (like C and V for copy and paste) or for performing notes, depending on this mode:"),
			label({style: "display: flex; flex-direction: row; align-items: center; height: 2em; justify-content: flex-end;"},
				div({class: "selectContainer", style: "width: 100%;"}, this._keyboardMode),
			),
			p("Performing music takes practice! Try slowing the tempo and using this metronome to help you keep a rhythm."),
			label({style: "display: flex; flex-direction: row; align-items: center; height: 2em; justify-content: flex-end;"},
				"Hear metronome while recording:",
				this._metronomeWhileRecording,
			),
			label({style: "display: flex; flex-direction: row; align-items: center; height: 2em; justify-content: flex-end;"},
				"Count-in 1 bar of metronome before recording:",
				this._metronomeCountIn,
			),
			p("If you have a ", a({href: "https://caniuse.com/midi", target: "_blank"}, "compatible browser"), " on a device connected to a MIDI keyboard, you can use it to perform notes in BeepBox! (Or you could buy ", a({href: "https://imitone.com/", target: "_blank"}, "Imitone"), " or ", a({href: "https://vochlea.com/", target: "_blank"}, "Dubler"), " to hum notes into a microphone while wearing headphones!)"),
			label({style: "display: flex; flex-direction: row; align-items: center; height: 2em; justify-content: flex-end;"},
				"Enable MIDI performance:",
				this._enableMidi,
			),
			p("The range of pitches available to play via your computer keyboard is affected by the octave scrollbar of the currently selected channel."),
			p("Recorded notes often overlap such that one note ends after the next note already started. In BeepBox, these notes get split into multiple notes which may sound different when re-played than they did when you were recording. To fix the sound, you can either manually clean up the notes in the pattern editor, or you could try enabling the \"transition type\" effect on the instrument and setting it to \"continue\"."),
			div({style: `width: 100%; height: 80px; background: linear-gradient(rgba(0,0,0,0), ${ColorConfig.editorBackground}); position: sticky; bottom: 0; pointer-events: none;`}),
		),
		div({style: "display: flex; flex-direction: row-reverse; justify-content: space-between;"},
			this._okayButton,
		),
		this._cancelButton,
	);
	
	constructor(private _doc: SongDocument) {
		this._keyboardMode.value = this._doc.prefs.pressControlForShortcuts ? "pressControlForShortcuts" : "useCapsLockForNotes";
		this._keyboardLayout.value = this._doc.prefs.keyboardLayout;
		this._enableMidi.checked = this._doc.prefs.enableMidi;
		this._showRecordButton.checked = this._doc.prefs.showRecordButton;
		this._snapRecordedNotesToRhythm.checked = this._doc.prefs.snapRecordedNotesToRhythm;
		this._ignorePerformedNotesNotInScale.checked = this._doc.prefs.ignorePerformedNotesNotInScale;
		this._metronomeCountIn.checked = this._doc.prefs.metronomeCountIn;
		this._metronomeWhileRecording.checked = this._doc.prefs.metronomeWhileRecording;
		
		setTimeout(()=>this._showRecordButton.focus());
		
		this._okayButton.addEventListener("click", this._confirm);
		this._cancelButton.addEventListener("click", this._close);
		this.container.addEventListener("keydown", this._whenKeyPressed);
		
		this._renderKeyboardLayoutPreview();
		this._keyboardLayout.addEventListener("change", this._renderKeyboardLayoutPreview);
	}
	
	private _close = (): void => { 
		this._doc.undo();
	}
	
	public cleanUp = (): void => { 
		this._okayButton.removeEventListener("click", this._confirm);
		this._cancelButton.removeEventListener("click", this._close);
		this.container.removeEventListener("keydown", this._whenKeyPressed);
	}
	
	private _whenKeyPressed = (event: KeyboardEvent): void => {
		if ((<Element> event.target).tagName != "BUTTON" && event.keyCode == 13) { // Enter key
			this._confirm();
		}
	}
	
	private _confirm = (): void => { 
		this._doc.prefs.pressControlForShortcuts = (this._keyboardMode.value == "pressControlForShortcuts");
		this._doc.prefs.keyboardLayout = this._keyboardLayout.value;
		this._doc.prefs.enableMidi = this._enableMidi.checked;
		this._doc.prefs.showRecordButton = this._showRecordButton.checked;
		this._doc.prefs.snapRecordedNotesToRhythm = this._snapRecordedNotesToRhythm.checked;
		this._doc.prefs.ignorePerformedNotesNotInScale = this._ignorePerformedNotesNotInScale.checked;
		this._doc.prefs.metronomeCountIn = this._metronomeCountIn.checked;
		this._doc.prefs.metronomeWhileRecording = this._metronomeWhileRecording.checked;
		this._doc.prefs.save();
		this._close();
	}
	
	private _renderKeyboardLayoutPreview = (): void => {
		while (this._keyboardLayoutPreview.firstChild) {
			this._keyboardLayoutPreview.removeChild(this._keyboardLayoutPreview.firstChild);
		}
		const rowLengths: number[] = [12, 12, 11, 10];
		const scale: ReadonlyArray<boolean> = Config.scales[this._doc.song.scale].flags;
		for (let rowIndex: number = 0; rowIndex < 4; rowIndex++) {
			const row: HTMLDivElement = div({style: "display: flex;"});
			this._keyboardLayoutPreview.appendChild(row);
			const spacer: HTMLDivElement = div({style: "width: " + (rowIndex * 12) + "px; height: 20px; flex-shrink: 0;"});
			row.appendChild(spacer);
			for (let colIndex: number = 0; colIndex < rowLengths[rowIndex]; colIndex++) {
				const key: HTMLDivElement = div({style: `width: 20px; height: 20px; margin: 0 2px; box-sizing: border-box; flex-shrink: 0; display: flex; justify-content: center; align-items: center;`});
				row.appendChild(key);
				const pitch: number | null = KeyboardLayout.keyPosToPitch(this._doc, colIndex, 3 - rowIndex, this._keyboardLayout.value);
				if (pitch != null) {
					const scalePitch: number = pitch % 12;
					if (scale[scalePitch]) {
						if (scalePitch == 0) {
							key.style.background = ColorConfig.tonic;
						} else if (scalePitch == 7 && this._doc.prefs.showFifth) {
							key.style.background = ColorConfig.fifthNote;
						} else {
							key.style.background = ColorConfig.pitchBackground;
						}
					} else {
						key.style.border = "2px solid " + ColorConfig.pitchBackground;
					}
					
					const pitchNameIndex: number = (scalePitch + Config.keys[this._doc.song.key].basePitch) % Config.pitchesPerOctave;
					key.textContent = Piano.getPitchName(pitchNameIndex, scalePitch);
				}
			}
		}
	}
}
