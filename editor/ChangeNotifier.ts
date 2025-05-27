// Copyright (c) John Nesky and contributing authors, distributed under the MIT license, see accompanying the LICENSE.md file.

export class ChangeNotifier {
	private _watchers: (()=>void)[] = [];
	private _dirty: boolean = false;
	private _notifyingWatchers: boolean = false;
	
	// Optionally pass a callback function to be called in response to the dirty flag. This is an
	// opportunity to clean up potentially internally-inconsistent data before any other watchers
	// have a chance to respond. This callback is allowed to set the dirty flag again, unlike the
	// rest of the watchers.
	constructor(private _validateAndFinalizeState?: () => void) {};
	
	public watch(watcher: ()=>void): void {
		if (this._watchers.indexOf(watcher) == -1) {
			this._watchers.push(watcher);
		}
	}
	
	// This method isn't used by anything, maybe just delete it?
	public unwatch(watcher: ()=>void): void {
		if (this._notifyingWatchers) {
			throw new Error("Attempted to remove a song document change watchers while in the middle of iterating over them.");
		}
		const index: number = this._watchers.indexOf(watcher);
		if (index != -1) {
			this._watchers.splice(index, 1);
		}
	}
	
	public changed(): void {
		if (this._notifyingWatchers) {
			throw new Error("Attempted to mark song document as dirty while in the middle of notifying change watchers.");
		}
		this._dirty = true;
	}
	
	public notifyWatchers(): void {
		if (!this._dirty) return;
		if (this._notifyingWatchers) {
			throw new Error("Attempted to start notifying song document change watchers while in the middle of doing so.");
		}
		this._validateAndFinalizeState?.();
		this._dirty = false;
		this._notifyingWatchers = true;
		for (const watcher of this._watchers) {
			watcher();
		}
		this._notifyingWatchers = false;
		if (this._dirty) {
			throw new Error("A song document change watcher marked the document as dirty again.");
		}
	}
}
