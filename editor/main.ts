// Copyright (C) 2021 John Nesky, distributed under the MIT license.

import {Dictionary, DictionaryArray, EnvelopeType, InstrumentType, Transition, Chord, Envelope, Config} from "../synth/SynthConfig";
import {isMobile, EditorConfig} from "./EditorConfig";
import {ColorConfig} from "./ColorConfig";
import "./style"; // Import for the side effects, there's no exports.
import {SongEditor} from "./SongEditor";
import {NotePin, Note, Pattern, Instrument, Channel, Synth} from "../synth/synth";
import {SongDocument} from "./SongDocument";
import {ExportPrompt} from "./ExportPrompt";
import {ChangePreset} from "./changes";

const doc: SongDocument = new SongDocument();
const editor: SongEditor = new SongEditor(doc);
const beepboxEditorContainer: HTMLElement = document.getElementById("beepboxEditorContainer")!;
beepboxEditorContainer.appendChild(editor.mainLayer);
editor.whenUpdated();
editor.mainLayer.focus();

// don't autoplay on mobile devices, wait for input.
if (!isMobile && doc.autoPlay) {
	function autoplay(): void {
		if (!document.hidden) {
			doc.synth.play();
			editor.updatePlayButton();
			window.removeEventListener("visibilitychange", autoplay);
		}
	}
	if (document.hidden) {
		// Wait until the tab is visible to autoplay:
		window.addEventListener("visibilitychange", autoplay);
	} else {
		autoplay();
	}
}

// BeepBox uses browser history state as its own undo history. Browsers typically
// remember scroll position for each history state, but BeepBox users would prefer not 
// auto scrolling when undoing. Sadly this tweak doesn't work on Edge or IE.
if ("scrollRestoration" in history) history.scrollRestoration = "manual";

editor.updatePlayButton();

if ("serviceWorker" in navigator) {
	navigator.serviceWorker.register("/service_worker.js", {updateViaCache: "all", scope: "/"}).catch(() => {});
}

// When compiling synth.ts as a standalone module named "beepbox", expose these classes as members to JavaScript:
export {Dictionary, DictionaryArray, EnvelopeType, InstrumentType, Transition, Chord, Envelope, Config, NotePin, Note, Pattern, Instrument, Channel, Synth, ColorConfig, EditorConfig, SongDocument, SongEditor, ExportPrompt, ChangePreset};
