// Copyright (C) 2021 John Nesky, distributed under the MIT license.

export class Deque<T> {
	private _capacity: number = 1;
	private _buffer: Array<T | undefined> = [undefined];
	private _mask: number = 0;
	private _offset: number = 0;
	private _count: number = 0;

	public pushFront(element: T): void {
		if (this._count >= this._capacity) this._expandCapacity();
		this._offset = (this._offset - 1) & this._mask;
		this._buffer[this._offset] = element;
		this._count++;
	}
	public pushBack(element: T): void {
		if (this._count >= this._capacity) this._expandCapacity();
		this._buffer[(this._offset + this._count) & this._mask] = element;
		this._count++;
	}
	public popFront(): T {
		if (this._count <= 0) throw new Error("No elements left to pop.");
		const element: T = <T>this._buffer[this._offset];
		this._buffer[this._offset] = undefined;
		this._offset = (this._offset + 1) & this._mask;
		this._count--;
		return element;
	}
	public popBack(): T {
		if (this._count <= 0) throw new Error("No elements left to pop.");
		this._count--;
		const index: number = (this._offset + this._count) & this._mask;
		const element: T = <T>this._buffer[index];
		this._buffer[index] = undefined;
		return element;
	}
	public peakFront(): T {
		if (this._count <= 0) throw new Error("No elements left to pop.");
		return <T>this._buffer[this._offset];
	}
	public peakBack(): T {
		if (this._count <= 0) throw new Error("No elements left to pop.");
		return <T>this._buffer[(this._offset + this._count - 1) & this._mask];
	}
	public count(): number {
		return this._count;
	}
	public set(index: number, element: T): void {
		if (index < 0 || index >= this._count) throw new Error("Invalid index");
		this._buffer[(this._offset + index) & this._mask] = element;
	}
	public get(index: number): T {
		if (index < 0 || index >= this._count) throw new Error("Invalid index");
		return <T>this._buffer[(this._offset + index) & this._mask];
	}
	public remove(index: number): void {
		if (index < 0 || index >= this._count) throw new Error("Invalid index");
		if (index <= (this._count >> 1)) {
			while (index > 0) {
				this.set(index, this.get(index - 1));
				index--;
			}
			this.popFront();
		} else {
			index++;
			while (index < this._count) {
				this.set(index - 1, this.get(index));
				index++;
			}
			this.popBack();
		}
	}
	private _expandCapacity(): void {
		if (this._capacity >= 0x40000000) throw new Error("Capacity too big.");
		this._capacity = this._capacity << 1;
		const oldBuffer: Array<T | undefined> = this._buffer;
		const newBuffer: Array<T | undefined> = new Array(this._capacity);
		const size: number = this._count | 0;
		const offset: number = this._offset | 0;
		for (let i = 0; i < size; i++) {
			newBuffer[i] = oldBuffer[(offset + i) & this._mask];
		}
		for (let i = size; i < this._capacity; i++) {
			newBuffer[i] = undefined;
		}
		this._offset = 0;
		this._buffer = newBuffer;
		this._mask = this._capacity - 1;
	}
}

