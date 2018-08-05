/*
Copyright (C) 2018 John Nesky

Permission is hereby granted, free of charge, to any person obtaining a copy of 
this software and associated documentation files (the "Software"), to deal in 
the Software without restriction, including without limitation the rights to 
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies 
of the Software, and to permit persons to whom the Software is furnished to do 
so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all 
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR 
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, 
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE 
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER 
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, 
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE 
SOFTWARE.
*/

namespace beepbox {
	export class Deque<T> {
		private _capacity: number = 1;
		private _buffer: Array<T | undefined> = [undefined];
		private _mask: number = 0;
		private _offset: number = 0;
		private _size: number = 0;

		public pushFront(element: T): void {
			if (this._size >= this._capacity) this._expandCapacity();
			this._offset = (this._offset - 1) & this._mask;
			this._buffer[this._offset] = element;
			this._size++;
		}
		public pushBack(element: T): void {
			if (this._size >= this._capacity) this._expandCapacity();
			this._buffer[(this._offset + this._size) & this._mask] = element;
			this._size++;
		}
		public popFront(): T {
			if (this._size <= 0) throw new Error("No elements left to pop.");
			const element: T = <T>this._buffer[this._offset];
			this._buffer[this._offset] = undefined;
			this._offset = (this._offset + 1) & this._mask;
			this._size--;
			return element;
		}
		public popBack(): T {
			if (this._size <= 0) throw new Error("No elements left to pop.");
			this._size--;
			const index: number = (this._offset + this._size) & this._mask;
			const element: T = <T>this._buffer[index];
			this._buffer[index] = undefined;
			return element;
		}
		public peakFront(): T {
			if (this._size <= 0) throw new Error("No elements left to pop.");
			return <T>this._buffer[this._offset];
		}
		public peakBack(): T {
			if (this._size <= 0) throw new Error("No elements left to pop.");
			return <T>this._buffer[(this._offset + this._size - 1) & this._mask];
		}
		public size(): number {
			return this._size;
		}
		public set(index: number, element: T): void {
			if (index < 0 || index >= this._size) throw new Error("Invalid index");
			this._buffer[(this._offset + index) & this._mask] = element;
		}
		public get(index: number): T {
			if (index < 0 || index >= this._size) throw new Error("Invalid index");
			return <T>this._buffer[(this._offset + index) & this._mask];
		}
		public remove(index: number): void {
			if (index < 0 || index >= this._size) throw new Error("Invalid index");
			if (index <= (this._size >> 1)) {
				while (index > 0) {
					this.set(index, this.get(index - 1));
					index--;
				}
				this.popFront();
			} else {
				index++;
				while (index < this._size) {
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
			const size: number = this._size | 0;
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
}