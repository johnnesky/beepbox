// Copyright (c) 2012-2022 John Nesky and contributing authors, distributed under the MIT license, see accompanying the LICENSE.md file.

import {EditorConfig} from "./EditorConfig";
import {SongDocument} from "./SongDocument";
import {Prompt} from "./Prompt";
import {HTML} from "imperative-html/dist/esm/elements-strict";
import {ColorConfig} from "./ColorConfig";

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
	private readonly _enableMidi: HTMLInputElement = input({style: "width: 2em; margin-left: 1em;", type: "checkbox"});
	private readonly _showRecordButton: HTMLInputElement = input({style: "width: 2em; margin-left: 1em;", type: "checkbox"});
	private readonly _snapRecordedNotesToRhythm: HTMLInputElement = input({style: "width: 2em; margin-left: 1em;", type: "checkbox"});
	private readonly _ignorePerformedNotesNotInScale: HTMLInputElement = input({style: "width: 2em; margin-left: 1em;", type: "checkbox"});
	private readonly _metronomeCountIn: HTMLInputElement = input({style: "width: 2em; margin-left: 1em;", type: "checkbox"});
	private readonly _metronomeWhileRecording: HTMLInputElement = input({style: "width: 2em; margin-left: 1em;", type: "checkbox"});
	
	private readonly _okayButton: HTMLButtonElement = button({class: "okayButton", style: "width:45%;"}, "Okay");
	private readonly _cancelButton: HTMLButtonElement = button({class: "cancelButton"});
	public readonly container: HTMLDivElement = div({class: "prompt noSelection recordingSetupPrompt", style: "width: 333px; text-align: right; max-height: 80%;"},
		h2("Note Recording Setup"),
		div({style: "display: grid; overflow-y: auto; flex-shrink: 1;"},
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
			div({style: `width: 100%; height: 40px; background: linear-gradient(rgba(0,0,0,0), ${ColorConfig.editorBackground}); position: sticky; bottom: 0; pointer-events: none;`}),
		),
		label({style: "display: flex; flex-direction: row-reverse; justify-content: space-between;"},
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
}
