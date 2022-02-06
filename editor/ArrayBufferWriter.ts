// Copyright (C) 2021 John Nesky, distributed under the MIT license.

function transfer(source: ArrayBuffer, length: number): ArrayBuffer {
	const dest: ArrayBuffer = new ArrayBuffer(length);
	let nextOffset = 0;
	let leftBytes = Math.min(source.byteLength, dest.byteLength);
	const wordSizes = [8, 4, 2, 1];
	for (const wordSize of wordSizes) {
		if (leftBytes >= wordSize) {
			const done = transferWith(wordSize, source, dest, nextOffset, leftBytes);
			nextOffset = done.nextOffset;
			leftBytes = done.leftBytes;
		}
	}
	return dest;
	function transferWith(wordSize: number, source: ArrayBuffer, dest: ArrayBuffer, nextOffset: number, leftBytes: number) {
		let ViewClass: any = Uint8Array;
		switch (wordSize) {
			case 8:
				ViewClass = Float64Array;
				break;
			case 4:
				ViewClass = Float32Array;
				break;
			case 2:
				ViewClass = Uint16Array;
				break;
			case 1:
				ViewClass = Uint8Array;
				break;
			default:
				ViewClass = Uint8Array;
				break;
		}
			
		const view_source = new ViewClass(source, nextOffset, (leftBytes / wordSize) | 0);
		const view_dest = new ViewClass(dest, nextOffset, (leftBytes / wordSize) | 0);
		for (let i: number = 0; i < view_dest.length; i++) {
			view_dest[i] = view_source[i];
		}
		return {
			nextOffset: view_source.byteOffset + view_source.byteLength,
			leftBytes: leftBytes - view_dest.length * wordSize,
		}
	}
}

// Note: All methods are big endian.
export class ArrayBufferWriter {
	private _writeIndex: number = 0;
	private _fileSize: number = 0;
	private _arrayBuffer: ArrayBuffer;
	private _data: DataView;
		
	constructor(initialCapacity: number) {
		this._arrayBuffer = new ArrayBuffer(initialCapacity);
		this._data = new DataView(this._arrayBuffer);
	}
		
	private _addBytes(numBytes: number): void {
		this._fileSize += numBytes;
		if (this._fileSize > this._arrayBuffer.byteLength) {
			this._arrayBuffer = transfer(this._arrayBuffer, Math.max(this._arrayBuffer.byteLength * 2, this._fileSize));
			this._data = new DataView(this._arrayBuffer);
		}
	}
		
	public getWriteIndex(): number {
		return this._writeIndex;
	}
		
	public rewriteUint32(index: number, value: number): void {
		this._data.setUint32(index, value >>> 0, false);
	}
		
	public writeUint32(value: number): void {
		value = value >>> 0;
		this._addBytes(4);
		this._data.setUint32(this._writeIndex, value, false);
		this._writeIndex = this._fileSize;
	}
		
	public writeUint24(value: number): void {
		value = value >>> 0;
		this._addBytes(3);
		this._data.setUint8(this._writeIndex, (value >> 16) & 0xff);
		this._data.setUint8(this._writeIndex + 1, (value >> 8) & 0xff);
		this._data.setUint8(this._writeIndex + 2, (value) & 0xff);
		this._writeIndex = this._fileSize;
	}
		
	public writeUint16(value: number): void {
		value = value >>> 0;
		this._addBytes(2);
		this._data.setUint16(this._writeIndex, value, false);
		this._writeIndex = this._fileSize;
	}
		
	public writeUint8(value: number): void {
		value = value >>> 0;
		this._addBytes(1);
		this._data.setUint8(this._writeIndex, value);
		this._writeIndex = this._fileSize;
	}
		
	public writeInt8(value: number): void {
		value = value | 0;
		this._addBytes(1);
		this._data.setInt8(this._writeIndex, value);
		this._writeIndex = this._fileSize;
	}
		
	public writeMidi7Bits(value: number): void {
		value = value >>> 0;
		if (value >= 0x80) throw new Error("7 bit value contained 8th bit!");
		this._addBytes(1);
		this._data.setUint8(this._writeIndex, value);
		this._writeIndex = this._fileSize;
	}
		
	public writeMidiVariableLength(value: number): void {
		value = value >>> 0;
		if (value > 0x0fffffff) throw new Error("writeVariableLength value too big.");
		let startWriting: boolean = false;
		for (let i: number = 0; i < 4; i++) {
			const shift: number = 21 - i * 7;
			const bits: number = (value >>> shift) & 0x7f;
			if (bits != 0 || i == 3) startWriting = true; // skip leading zero bytes, but always write the last byte even if it's zero. 
			if (startWriting) this.writeUint8((i == 3 ? 0x00 : 0x80) | bits);
		}
	}
		
	public writeMidiAscii(string: string): void {
		this.writeMidiVariableLength(string.length);
		for (let i: number = 0; i < string.length; i++) {
			const charCode: number = string.charCodeAt(i);
			if (charCode > 0x7f) throw new Error("Trying to write unicode character as ascii.");
			this.writeUint8(charCode); // technically charCodeAt returns 2 byte values, but this string should contain exclusively 1 byte values.
		}
	}
		
	public toCompactArrayBuffer(): ArrayBuffer {
		return transfer(this._arrayBuffer, this._fileSize);
	}
}
