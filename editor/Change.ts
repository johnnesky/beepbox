// Copyright (C) 2020 John Nesky, distributed under the MIT license.

//namespace beepbox {
export class Change {
	private _noop: boolean = true;

	protected _didSomething(): void {
		this._noop = false;
	}

	public isNoop(): boolean {
		return this._noop;
	}

	public commit(): void { }
}

export class UndoableChange extends Change {
	private _reversed: boolean;
	private _doneForwards: boolean;
	constructor(reversed: boolean) {
		super();
		this._reversed = reversed;
		this._doneForwards = !reversed;
	}

	public undo(): void {
		if (this._reversed) {
			this._doForwards();
			this._doneForwards = true;
		} else {
			this._doBackwards();
			this._doneForwards = false;
		}
	}

	public redo(): void {
		if (this._reversed) {
			this._doBackwards();
			this._doneForwards = false;
		} else {
			this._doForwards();
			this._doneForwards = true;
		}
	}

	// isDoneForwards() returns whether or not the Change was most recently 
	// performed forwards or backwards. If the change created something, do not 
	// delete it in the change destructor unless the Change was performed 
	// backwards: 
	protected _isDoneForwards(): boolean {
		return this._doneForwards;
	}

	protected _doForwards(): void {
		throw new Error("Change.doForwards(): Override me.");
	}

	protected _doBackwards(): void {
		throw new Error("Change.doBackwards(): Override me.");
	}
}

export class ChangeGroup extends Change {
	constructor() {
		super();
	}

	public append(change: Change): void {
		if (change.isNoop()) return;
		this._didSomething();
	}
}

export class ChangeSequence extends UndoableChange {
	private _changes: UndoableChange[];
	constructor(changes?: UndoableChange[]) {
		super(false);
		if (changes == undefined) {
			this._changes = [];
		} else {
			this._changes = changes.concat();
		}
	}

	public append(change: UndoableChange): void {
		if (change.isNoop()) return;
		this._changes[this._changes.length] = change;
		this._didSomething();
	}

	protected _doForwards(): void {
		for (let i: number = 0; i < this._changes.length; i++) {
			this._changes[i].redo();
		}
	}

	protected _doBackwards(): void {
		for (let i: number = this._changes.length - 1; i >= 0; i--) {
			this._changes[i].undo();
		}
	}
}
//}
