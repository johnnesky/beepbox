/*
Copyright (C) 2019 John Nesky

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
	// Note: All methods are big endian.
	export class ArrayBufferReader {
		private _readIndex: number = 0;
		private _data: DataView;
		
		constructor(data: DataView) {
			this._data = data;
		}
		
		public getReadIndex(): number {
			return this._readIndex;
		}
		
		public readUint32(): number {
			if (this._readIndex + 4 > this._data.byteLength) throw new Error("Reading past the end of the buffer.");
			const result: number = this._data.getUint32(this._readIndex, false);
			this._readIndex += 4;
			return result;
		}
		
		public readUint24(): number {
			return (this.readUint8() << 16) | (this.readUint8() << 8) | (this.readUint8());
		}
		
		public readUint16(): number {
			if (this._readIndex + 2 > this._data.byteLength) throw new Error("Reading past the end of the buffer.");
			const result: number = this._data.getUint16(this._readIndex, false);
			this._readIndex += 2;
			return result;
		}
		
		public readUint8(): number {
			if (this._readIndex + 1 > this._data.byteLength) throw new Error("Reading past the end of the buffer.");
			const result: number = this._data.getUint8(this._readIndex);
			this._readIndex++;
			return result;
		}
		
		public readInt8(): number {
			if (this._readIndex + 1 > this._data.byteLength) throw new Error("Reading past the end of the buffer.");
			const result: number = this._data.getInt8(this._readIndex);
			this._readIndex++;
			return result;
		}
		
		public peakUint8(): number {
			if (this._readIndex + 1 > this._data.byteLength) throw new Error("Reading past the end of the buffer.");
			return this._data.getUint8(this._readIndex);
		}
		
		public readMidi7Bits(): number {
			const result: number = this.readUint8();
			if (result >= 0x80) throw new Error("7 bit value contained 8th bit! value " + result + ", index " + this._readIndex);
			return result;
		}
		
		public readMidiVariableLength(): number {
			let result: number = 0;
			for (let i: number = 0; i < 4; i++) {
				const nextByte: number = this.readUint8();
				result += nextByte & 0x7f;
				if (nextByte & 0x80) {
					result = result << 7;
				} else {
					break;
				}
			}
			return result;
		}
		
		public skipBytes(length: number): void {
			this._readIndex += length;
		}
		
		public hasMore(): boolean {
			return this._data.byteLength > this._readIndex;
		}
		
		public getReaderForNextBytes(length: number): ArrayBufferReader {
			if (this._readIndex + length > this._data.byteLength) throw new Error("Reading past the end of the buffer.");
			const result: ArrayBufferReader = new ArrayBufferReader(new DataView(this._data.buffer, this._data.byteOffset + this._readIndex, length));
			this.skipBytes(length);
			return result;
		}
	}
}
