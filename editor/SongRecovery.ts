// Copyright (C) 2020 John Nesky, distributed under the MIT license.

import { Dictionary } from "../synth/SynthConfig";
import { Song } from "../synth/synth";

//namespace beepbox {

export interface RecoveredVersion {
	uid: string;
	time: number;
	name: string;
	work: number;
}

export interface RecoveredSong {
	versions: RecoveredVersion[];
}

const versionPrefix = "songVersion: ";
const maximumSongCount = 8;
const maximumWorkPerVersion = 3 * 60 * 1000; // 3 minutes
const minimumWorkPerSpan = 1 * 60 * 1000; // 1 minute

function keyIsVersion(key: string): boolean {
	return key.indexOf(versionPrefix) == 0;
}

function keyToVersion(key: string): RecoveredVersion {
	return JSON.parse(key.substring(versionPrefix.length));
}

export function versionToKey(version: RecoveredVersion): string {
	return versionPrefix + JSON.stringify(version);
}

export function generateUid(): string {
	// Not especially robust, but simple and effective!
	return ((Math.random() * (-1 >>> 0)) >>> 0).toString(32);
}

function compareSongs(a: RecoveredSong, b: RecoveredSong): number {
	return b.versions[0].time - a.versions[0].time;
}

function compareVersions(a: RecoveredVersion, b: RecoveredVersion): number {
	return b.time - a.time;
}

export class SongRecovery {
	private _saveVersionTimeoutHandle: ReturnType<typeof setTimeout>;

	private _song: Song = new Song();

	public static getAllRecoveredSongs(): RecoveredSong[] {
		const songs: RecoveredSong[] = [];
		const songsByUid: Dictionary<RecoveredSong> = {};
		for (let i = 0; i < localStorage.length; i++) {
			const itemKey: string = localStorage.key(i)!;
			if (keyIsVersion(itemKey)) {
				const version: RecoveredVersion = keyToVersion(itemKey);
				let song: RecoveredSong | undefined = songsByUid[version.uid];
				if (song == undefined) {
					song = { versions: [] };
					songsByUid[version.uid] = song;
					songs.push(song);
				}
				song.versions.push(version);
			}
		}
		for (const song of songs) {
			song.versions.sort(compareVersions);
		}
		songs.sort(compareSongs);
		return songs;
	}

	public saveVersion(uid: string, name: string, songData: string): void {
		const newName: string = name;
		const newTime: number = Math.round(Date.now());

		clearTimeout(this._saveVersionTimeoutHandle);
		this._saveVersionTimeoutHandle = setTimeout((): void => {
			try {
				// Ensure that the song is not corrupted before saving it.
				this._song.fromBase64String(songData);
			} catch (error) {
				window.alert("Whoops, the song data appears to have been corrupted! Please try to recover the last working version of the song from the \"Recover Recent Song...\" option in BeepBox's \"File\" menu.");
				return;
			}

			const songs: RecoveredSong[] = SongRecovery.getAllRecoveredSongs();
			let currentSong: RecoveredSong | null = null;
			for (const song of songs) {
				if (song.versions[0].uid == uid) {
					currentSong = song;
				}
			}
			if (currentSong == null) {
				currentSong = { versions: [] };
				songs.unshift(currentSong);
			}
			let versions: RecoveredVersion[] = currentSong.versions;

			let newWork: number = 1000; // default to 1 second of work for the first change.
			if (versions.length > 0) {
				const mostRecentTime: number = versions[0].time;
				const mostRecentWork: number = versions[0].work;
				newWork = mostRecentWork + Math.min(maximumWorkPerVersion, newTime - mostRecentTime);
			}

			const newVersion: RecoveredVersion = { uid: uid, name: newName, time: newTime, work: newWork };
			const newKey: string = versionToKey(newVersion);
			versions.unshift(newVersion);
			localStorage.setItem(newKey, songData);

			// Consider deleting an old version to free up space.
			let minSpan: number = minimumWorkPerSpan; // start out with a gap between versions.
			const spanMult: number = Math.pow(2, 1 / 2); // Double the span every 2 versions back.
			for (var i: number = 1; i < versions.length; i++) {
				const currentWork: number = versions[i].work;
				const olderWork: number = (i == versions.length - 1) ? 0.0 : versions[i + 1].work;
				// If not enough work happened between two versions, discard one of them.
				if (currentWork - olderWork < minSpan) {
					let indexToDiscard: number = i;
					if (i < versions.length - 1) {
						const currentTime: number = versions[i].time;
						const newerTime: number = versions[i - 1].time;
						const olderTime: number = versions[i + 1].time;
						// Weird heuristic: Between the three adjacent versions, prefer to keep
						// the newest and the oldest, discarding the middle one (i), unless
						// there is a large gap of time between the newest and middle one, in
						// which case the middle one represents the end of a span of work and is
						// thus more memorable.
						if ((currentTime - olderTime) < 0.5 * (newerTime - currentTime)) {
							indexToDiscard = i + 1;
						}
					}
					localStorage.removeItem(versionToKey(versions[indexToDiscard]));
					break;
				}
				minSpan *= spanMult;
			}

			// If there are too many songs, discard the least important ones.
			// Songs that are older, or have less work, are less important.
			while (songs.length > maximumSongCount) {
				let leastImportantSong: RecoveredSong | null = null;
				let leastImportance: number = Number.POSITIVE_INFINITY;
				for (let i: number = Math.round(maximumSongCount / 2); i < songs.length; i++) {
					const song: RecoveredSong = songs[i];
					const timePassed: number = newTime - song.versions[0].time;
					// Convert the time into a factor of 12 hours, add one, then divide by the result.
					// This creates a curve that starts at 1, and then gradually drops off.
					const timeScale: number = 1.0 / ((timePassed / (12 * 60 * 60 * 1000)) + 1.0);
					// Add 5 minutes of work, to balance out simple songs a little bit.
					const adjustedWork: number = song.versions[0].work + 5 * 60 * 1000;
					const weight: number = adjustedWork * timeScale;
					if (leastImportance > weight) {
						leastImportance = weight;
						leastImportantSong = song;
					}
				}
				for (const version of leastImportantSong!.versions) {
					localStorage.removeItem(versionToKey(version));
				}
				songs.splice(songs.indexOf(leastImportantSong!), 1);
			}
		}, 750); // Wait 3/4 of a second before saving a version.
	}
}
//}
