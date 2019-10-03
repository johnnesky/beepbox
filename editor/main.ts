// Copyright (C) 2019 John Nesky, distributed under the MIT license.

/// <reference path="SongEditor.ts" />

namespace beepbox {
	const doc: SongDocument = new SongDocument(location.hash);
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
		navigator.serviceWorker.register("/service_worker.js", { scope: "/" });
	}
}
