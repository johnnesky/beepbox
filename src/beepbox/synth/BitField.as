/*
Copyright (C) 2012 John Nesky

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

package beepbox.synth {
	public class BitField {
		
		private var base64: Array;
		private var bits: Array = [];
		private var readIndex: int = 0;
		
		public function BitField(base64: Array) {
			this.base64 = base64;
		}
		
		public function load(source: String): void {
			for each (var char: String in source.split("")) {
				var value: int = base64.indexOf(char);
				bits.push((value & 0x20) != 0);
				bits.push((value & 0x10) != 0);
				bits.push((value & 0x08) != 0);
				bits.push((value & 0x04) != 0);
				bits.push((value & 0x02) != 0);
				bits.push((value & 0x01) != 0);
			}
		}
		
		public function addPadding(): void {
			while ((bits.length % 6) != 0) {
				bits.push(false);
			}
		}
		
		public function skipPadding(): void {
			readIndex += 5 - ((readIndex + 5) % 6);
		}
		
		public function write(bitCount: int, value: int): void {
			bitCount--;
			while (bitCount >= 0) {
				bits.push(((value >> bitCount) & 1) == 1);
				bitCount--;
			}
		}
		
		public function read(bitCount: int): int {
			var result: int = 0;
			while (bitCount > 0) {
				result = result << 1;
				result += bits[readIndex++] ? 1 : 0;
				bitCount--;
			}
			return result;
		}
		
		public function writeLongTail(minValue: int, minBits: int, value: int): void {
			if (value < minValue) throw new Error();
			value -= minValue;
			var numBits: int = minBits;
			while (value >= (1 << numBits)) {
				bits.push(true);
				value -= 1 << numBits;
				numBits++;
			}
			bits.push(false);
			while (numBits > 0) {
				numBits--;
				bits.push((value & (1 << numBits)) != 0);
			}
		}
		
		public function readLongTail(minValue: int, minBits: int): int {
			var result: int = minValue;
			var numBits: int = minBits;
			while (bits[readIndex++]) {
				result += 1 << numBits;
				numBits++;
			}
			while (numBits > 0) {
				numBits--;
				if (bits[readIndex++]) {
					result += 1 << numBits;
				}
			}
			return result;
		}
		
		public function writePartDuration(value: int): void {
			writeLongTail(1, 2, value);
		}
		
		public function readPartDuration(): int {
			return readLongTail(1, 2);
		}
		
		public function writePinCount(value: int): void {
			writeLongTail(1, 0, value);
		}
		
		public function readPinCount(): int {
			return readLongTail(1, 0);
		}
		
		public function writeNoteInterval(value: int): void {
			if (value < 0) {
				write(1, 1); // sign
				writeLongTail(1, 3, -value);
			} else {
				write(1, 0); // sign
				writeLongTail(1, 3, value);
			}
		}
		
		public function readNoteInterval(): int {
			if (read(1)) {
				return -readLongTail(1, 3);
			} else {
				return readLongTail(1, 3);
			}
		}
		
		public function concat(other: BitField): void {
			bits = bits.concat(other.bits);
		}
		
		public function toString(): String {
			var paddedBits: Array = bits.concat([false, false, false, false, false, false]);
			var result: String = "";
			for (var i: int = 0; i < bits.length; i += 6) {
				var value: int = 0;
				if (bits[i+0]) value += 0x20;
				if (bits[i+1]) value += 0x10;
				if (bits[i+2]) value += 0x08;
				if (bits[i+3]) value += 0x04;
				if (bits[i+4]) value += 0x02;
				if (bits[i+5]) value += 0x01;
				result += base64[value];
				
			}
			return result;
		}
		
		public function traceBits(): void {
			trace(bits);
		}
	}
}