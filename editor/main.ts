// Copyright (C) 2020 John Nesky, distributed under the MIT license.

import { Dictionary, DictionaryArray, EnvelopeType, InstrumentType, Transition, Chord, Envelope, Config } from "../synth/SynthConfig";
import { isMobile, EditorConfig } from "./EditorConfig";
import { ColorConfig } from "./ColorConfig";
import "./style"; // Import for the side effects, there's no exports.
import { SongEditor } from "./SongEditor";
import { NotePin, Note, Pattern, Instrument, Channel, Synth } from "../synth/synth";
import { SongDocument } from "./SongDocument";
import { ExportPrompt } from "./ExportPrompt";
import { ChangePreset } from "./changes";


//namespace beepbox {
const doc: SongDocument = new SongDocument();
const editor: SongEditor = new SongEditor(doc);
const beepboxEditorContainer: HTMLElement = document.getElementById("beepboxEditorContainer")!;
beepboxEditorContainer.appendChild(editor.mainLayer);
editor.whenUpdated();

// Fade-in transitions
editor.mainLayer.className += " load";
editor.mainLayer.getElementsByClassName("pattern-area")[0].className += " load";
editor.mainLayer.getElementsByClassName("settings-area")[0].className += " load";
editor.mainLayer.getElementsByClassName("editor-song-settings")[0].className += " load";
editor.mainLayer.getElementsByClassName("instrument-settings-area")[0].className += " load";
editor.mainLayer.getElementsByClassName("trackAndMuteContainer")[0].className += " load";
editor.mainLayer.getElementsByClassName("barScrollBar")[0].className += " load";

// Give select2 class to these
$('#pitchPresetSelect').select2({ dropdownAutoWidth: true });
$('#drumPresetSelect').select2({ dropdownAutoWidth: true });

// Onclick event to expand/collapse optgroups
$("body").on('click', '.select2-container--open .select2-results__group', function () {
	$(this).siblings().toggle();
});

// Open event to collapse all optgroups by default
$("#pitchPresetSelect").on('select2:open', function () {
	$('.select2-dropdown--below').css('opacity', 0);
	$('.select2-dropdown').css('opacity', 1);
	$('#pitchPresetSelect')
	setTimeout(() => {
		let groups = $('.select2-container--open .select2-results__group');
		let options = $('.select2-container--open .select2-results__option');

		$.each(groups, (index, v) => {
			$(v).siblings().hide();
			$(v)[0].setAttribute("style", "color: " + ColorConfig.getChannelColor(doc.song, doc.channel).primaryNote + ";");
		})
		$.each(options, (index, v) => {
			$(v)[0].setAttribute("style", "color: " + ColorConfig.getChannelColor(doc.song, doc.channel).primaryNote + ";");
		})

		$('.select2-dropdown--below').css('opacity', 1);
	}, 0);
});

// Open event to collapse all optgroups by default
$("#drumPresetSelect").on('select2:open', function () {
	$('.select2-dropdown--below').css('opacity', 0);
	$('.select2-dropdown').css('opacity', 1);
	$('#drumPresetSelect')
	setTimeout(() => {
		let groups = $('.select2-container--open .select2-results__group');
		let options = $('.select2-container--open .select2-results__option');

		$.each(groups, (index, v) => {
			$(v).siblings().hide();
			$(v)[0].setAttribute("style", "color: " + ColorConfig.getChannelColor(doc.song, doc.channel).primaryNote + ";");
		})
		$.each(options, (index, v) => {
			$(v)[0].setAttribute("style", "color: " + ColorConfig.getChannelColor(doc.song, doc.channel).primaryNote + ";");
		})

		$('.select2-dropdown--below').css('opacity', 1);
	}, 0);
});

// Select2 events
// The latter is to ensure select2 doesn't keep focus after the select2 is closed without making a selection.
$('#pitchPresetSelect').on("change", editor._whenSetPitchedPreset);
$('#pitchPresetSelect').on("select2:close", editor._refocus);

$('#drumPresetSelect').on("change", editor._whenSetDrumPreset);
$('#drumPresetSelect').on("select2:close", editor._refocus);


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
	navigator.serviceWorker.register("/service_worker.js", { updateViaCache: "all", scope: "/" }).catch(() => { });
}

// When compiling synth.ts as a standalone module named "beepbox", expose these classes as members to JavaScript:
export { Dictionary, DictionaryArray, EnvelopeType, InstrumentType, Transition, Chord, Envelope, Config, NotePin, Note, Pattern, Instrument, Channel, Synth, ColorConfig, EditorConfig, SongDocument, SongEditor, ExportPrompt, ChangePreset };
//}




