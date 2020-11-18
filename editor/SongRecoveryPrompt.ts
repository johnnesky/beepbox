// Copyright (C) 2020 John Nesky, distributed under the MIT license.

import { SongDocument } from "./SongDocument";
import { RecoveredSong, RecoveredVersion, SongRecovery, versionToKey } from "./SongRecovery";
import { Prompt } from "./Prompt";
import { HTML } from "imperative-html/dist/esm/elements-strict";

//namespace beepbox {
const { button, div, h2, p, select, option, iframe } = HTML;

export class SongRecoveryPrompt implements Prompt {
	private readonly _songContainer: HTMLDivElement = div();
	private readonly _cancelButton: HTMLButtonElement = button({ class: "cancelButton" });

	public readonly container: HTMLDivElement = div({ class: "prompt", style: "width: 300px;" },
		h2("Song Recovery"),
		div({ style: "max-height: 385px; overflow-y: auto;" },
			p("This is a TEMPORARY list of songs you have recently modified. Please keep your own backups of songs you care about!"),
			this._songContainer,
			p("(If \"Display Song Data in URL\" is enabled in your preferences, then you may also be able to find song versions in your browser history. However, song recovery won't work if you were browsing in private/incognito mode.)"),
		),
		this._cancelButton,
	);

	constructor(private _doc: SongDocument) {
		this._cancelButton.addEventListener("click", this._close);

		const songs: RecoveredSong[] = SongRecovery.getAllRecoveredSongs();

		if (songs.length == 0) {
			this._songContainer.appendChild(p("There are no recovered songs available yet. Try making a song!"));
		}

		for (const song of songs) {
			const versionMenu: HTMLSelectElement = select({ style: "width: 100%;" });

			for (const version of song.versions) {
				versionMenu.appendChild(option({ value: version.time }, version.name + ": " + new Date(version.time).toLocaleString()));
			}

			const player: HTMLIFrameElement = iframe({ style: "width: 100%; height: 60px; border: none; display: block;" });
			player.src = "player/#song=" + window.localStorage.getItem(versionToKey(song.versions[0]));
			const container: HTMLDivElement = div({ style: "margin: 4px 0;" }, div({ class: "selectContainer", style: "width: 100%; margin: 2px 0;" }, versionMenu), player);
			this._songContainer.appendChild(container);

			versionMenu.addEventListener("change", () => {
				const version: RecoveredVersion = song.versions[versionMenu.selectedIndex];
				player.contentWindow!.location.replace("player/#song=" + window.localStorage.getItem(versionToKey(version)));
				player.contentWindow!.dispatchEvent(new Event("hashchange"));
			});
		}
	}

	private _close = (): void => {
		this._doc.undo();
	}

	public cleanUp = (): void => {
		this._cancelButton.removeEventListener("click", this._close);
	}
}
//}
