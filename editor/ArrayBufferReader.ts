// Copyright (C) 2021 John Nesky, distributed under the MIT license.

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
		if (result >= 0x80) console.log("7 bit value contained 8th bit! value " + result + ", index " + this._readIndex);
		return result & 0x7f;
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
