
import ieee754 from 'ieee754'


export default class Pbf {

	constructor(buf) {
		this.buf = ArrayBuffer.isView && ArrayBuffer.isView(buf) ? buf : new Uint8Array(buf || 0);
		this.pos = 0;
		this.type = 0;
		this.length = this.buf.length;      

		this.Varint  = 0; // varint: int32, int64, uint32, uint64, sint32, sint64, bool, enum
		this.Fixed64 = 1; // 64-bit: double, fixed64, sfixed64
		this.Bytes   = 2; // length-delimited: string, bytes, embedded messages, packed repeated fields
		this.Fixed32 = 5; // 32-bit: float, fixed32, sfixed32  
	

		this.SHIFT_LEFT_32 = (1 << 16) * (1 << 16)
		this.SHIFT_RIGHT_32 = 1 / this.SHIFT_LEFT_32;

		// Threshold chosen based on both benchmarking and knowledge about browser string
		// data structures (which currently switch structure types at 12 bytes or more)
		this.TEXT_DECODER_MIN_LENGTH = 12;
		this.utf8TextDecoder = typeof TextDecoder === 'undefined' ? null : new TextDecoder('utf-8');

	}


	destroy() {
		this.buf = null;
	}


	// === READING =================================================================

	readFields(readField, result, end) {
		end = end || this.length;

		while (this.pos < end) {
			var val = this.readVarint(),
				tag = val >> 3,
				startPos = this.pos;

			this.type = val & 0x7;
			readField(tag, result, this);

			if (this.pos === startPos) this.skip(val);
		}
		return result;
	}


	readMessage(readField, result) {
		return this.readFields(readField, result, this.readVarint() + this.pos);
	}


	readFixed32() {
		var val = this.readUInt32(this.buf, this.pos);
		this.pos += 4;
		return val;
	}


	readSFixed32() {
		var val = this.readInt32(this.buf, this.pos);
		this.pos += 4;
		return val;
	}


	// 64-bit int handling is based on github.com/dpw/node-buffer-more-ints (MIT-licensed)

	readFixed64() {
		var val = this.readUInt32(this.buf, this.pos) + this.readUInt32(this.buf, this.pos + 4) * this.SHIFT_LEFT_32;
		this.pos += 8;
		return val;
	}


	readSFixed64() {
		var val = this.readUInt32(this.buf, this.pos) + this.readInt32(this.buf, this.pos + 4) * this.SHIFT_LEFT_32;
		this.pos += 8;
		return val;
	}


	readFloat() {
		var val = ieee754.read(this.buf, this.pos, true, 23, 4);
		this.pos += 4;
		return val;
	}


	readDouble() {
		var val = ieee754.read(this.buf, this.pos, true, 52, 8);
		this.pos += 8;
		return val;
	}


	readVarint(isSigned) {
		var buf = this.buf,
			val, b;

		b = buf[this.pos++]; val  =  b & 0x7f;        if (b < 0x80) return val;
		b = buf[this.pos++]; val |= (b & 0x7f) << 7;  if (b < 0x80) return val;
		b = buf[this.pos++]; val |= (b & 0x7f) << 14; if (b < 0x80) return val;
		b = buf[this.pos++]; val |= (b & 0x7f) << 21; if (b < 0x80) return val;
		b = buf[this.pos];   val |= (b & 0x0f) << 28;

		return this.readVarintRemainder(val, isSigned, this);
	}


	readVarint64() { // for compatibility with v2.0.1
		return this.readVarint(true);
	}


	readSVarint() {
		var num = this.readVarint();
		return num % 2 === 1 ? (num + 1) / -2 : num / 2; // zigzag encoding
	}


	readBoolean() {
		return Boolean(this.readVarint());
	}


	readString() {
		var end = this.readVarint() + this.pos;
		var pos = this.pos;
		this.pos = end;

		if (end - pos >= this.TEXT_DECODER_MIN_LENGTH && this.utf8TextDecoder) {
			// longer strings are fast with the built-in browser TextDecoder API
			return this.readUtf8TextDecoder(this.buf, pos, end);
		}
		// short strings are fast with our custom implementation
		return this.readUtf8(this.buf, pos, end);
	}


	readBytes() {
		var end = this.readVarint() + this.pos,
			buffer = this.buf.subarray(this.pos, end);
		this.pos = end;
		return buffer;
	}


	// verbose for performance reasons; doesn't affect gzipped size

	readPackedVarint(arr, isSigned) {
		if (this.type !== Pbf.Bytes) return arr.push(this.readVarint(isSigned));
		var end = this.readPackedEnd(this);
		arr = arr || [];
		while (this.pos < end) arr.push(this.readVarint(isSigned));
		return arr;
	}

	readPackedSVarint(arr) {
		if (this.type !== Pbf.Bytes) return arr.push(this.readSVarint());
		var end = readPackedEnd(this);
		arr = arr || [];
		while (this.pos < end) arr.push(this.readSVarint());
		return arr;
	}

	readPackedBoolean(arr) {
		if (this.type !== Pbf.Bytes) return arr.push(this.readBoolean());
		var end = readPackedEnd(this);
		arr = arr || [];
		while (this.pos < end) arr.push(this.readBoolean());
		return arr;
	}

	readPackedFloat(arr) {
		if (this.type !== Pbf.Bytes) return arr.push(this.readFloat());
		var end = readPackedEnd(this);
		arr = arr || [];
		while (this.pos < end) arr.push(this.readFloat());
		return arr;
	}

	readPackedDouble(arr) {
		if (this.type !== Pbf.Bytes) return arr.push(this.readDouble());
		var end = readPackedEnd(this);
		arr = arr || [];
		while (this.pos < end) arr.push(this.readDouble());
		return arr;
	}

	readPackedFixed32(arr) {
		if (this.type !== Pbf.Bytes) return arr.push(this.readFixed32());
		var end = readPackedEnd(this);
		arr = arr || [];
		while (this.pos < end) arr.push(this.readFixed32());
		return arr;
	}

	readPackedSFixed32(arr) {
		if (this.type !== Pbf.Bytes) return arr.push(this.readSFixed32());
		var end = readPackedEnd(this);
		arr = arr || [];
		while (this.pos < end) arr.push(this.readSFixed32());
		return arr;
	}

	readPackedFixed64(arr) {
		if (this.type !== Pbf.Bytes) return arr.push(this.readFixed64());
		var end = readPackedEnd(this);
		arr = arr || [];
		while (this.pos < end) arr.push(this.readFixed64());
		return arr;
	}

	readPackedSFixed64(arr) {
		if (this.type !== Pbf.Bytes) return arr.push(this.readSFixed64());
		var end = readPackedEnd(this);
		arr = arr || [];
		while (this.pos < end) arr.push(this.readSFixed64());
		return arr;
	}


	skip(val) {
		var type = val & 0x7;
		if (type === Pbf.Varint) while (this.buf[this.pos++] > 0x7f) {}
		else if (type === this.Bytes) this.pos = this.readVarint() + this.pos;
		else if (type === this.Fixed32) this.pos += 4;
		else if (type === this.Fixed64) this.pos += 8;
		else throw new Error('Unimplemented type: ' + type);
	}


	// === WRITING =================================================================

	writeTag(tag, type) {
		this.writeVarint((tag << 3) | type);
	}


	realloc(min) {
		var length = this.length || 16;

		while (length < this.pos + min) length *= 2;

		if (length !== this.length) {
			var buf = new Uint8Array(length);
			buf.set(this.buf);
			this.buf = buf;
			this.length = length;
		}
	}


	finish() {
		this.length = this.pos;
		this.pos = 0;
		return this.buf.subarray(0, this.length);
	}


	writeFixed32(val) {
		this.realloc(4);
		writeInt32(this.buf, val, this.pos);
		this.pos += 4;
	}


	writeSFixed32(val) {
		this.realloc(4);
		writeInt32(this.buf, val, this.pos);
		this.pos += 4;
	}


	writeFixed64(val) {
		this.realloc(8);
		writeInt32(this.buf, val & -1, this.pos);
		writeInt32(this.buf, Math.floor(val * this.SHIFT_RIGHT_32), this.pos + 4);
		this.pos += 8;
	}


	writeSFixed64(val) {
		this.realloc(8);
		writeInt32(this.buf, val & -1, this.pos);
		writeInt32(this.buf, Math.floor(val * this.SHIFT_RIGHT_32), this.pos + 4);
		this.pos += 8;
	}


	writeVarint(val) {
		val = +val || 0;

		if (val > 0xfffffff || val < 0) {
			writeBigVarint(val, this);
			return;
		}

		this.realloc(4);

		this.buf[this.pos++] =           val & 0x7f  | (val > 0x7f ? 0x80 : 0); if (val <= 0x7f) return;
		this.buf[this.pos++] = ((val >>>= 7) & 0x7f) | (val > 0x7f ? 0x80 : 0); if (val <= 0x7f) return;
		this.buf[this.pos++] = ((val >>>= 7) & 0x7f) | (val > 0x7f ? 0x80 : 0); if (val <= 0x7f) return;
		this.buf[this.pos++] =   (val >>> 7) & 0x7f;
	}


	writeSVarint(val) {
		this.writeVarint(val < 0 ? -val * 2 - 1 : val * 2);
	}


	writeBoolean(val) {
		this.writeVarint(Boolean(val));
	}


	writeString(str) {
		str = String(str);
		this.realloc(str.length * 4);

		this.pos++; // reserve 1 byte for short string length

		var startPos = this.pos;
		// write the string directly to the buffer and see how much was written
		this.pos = writeUtf8(this.buf, str, this.pos);
		var len = this.pos - startPos;

		if (len >= 0x80) makeRoomForExtraLength(startPos, len, this);

		// finally, write the message length in the reserved place and restore the position
		this.pos = startPos - 1;
		this.writeVarint(len);
		this.pos += len;
	}


	writeFloat(val) {
		this.realloc(4);
		ieee754.write(this.buf, val, this.pos, true, 23, 4);
		this.pos += 4;
	}


	writeDouble(val) {
		this.realloc(8);
		ieee754.write(this.buf, val, this.pos, true, 52, 8);
		this.pos += 8;
	}


	writeBytes(buffer) {
		var len = buffer.length;
		this.writeVarint(len);
		this.realloc(len);
		for (var i = 0; i < len; i++) this.buf[this.pos++] = buffer[i];
	}


	writeRawMessage(fn, obj) {
		this.pos++; // reserve 1 byte for short message length

		// write the message directly to the buffer and see how much was written
		var startPos = this.pos;
		fn(obj, this);
		var len = this.pos - startPos;

		if (len >= 0x80) makeRoomForExtraLength(startPos, len, this);

		// finally, write the message length in the reserved place and restore the position
		this.pos = startPos - 1;
		this.writeVarint(len);
		this.pos += len;
	}


	writeMessage(tag, fn, obj) {
		this.writeTag(tag, Pbf.Bytes);
		this.writeRawMessage(fn, obj);
	}


	writePackedVarint(tag, arr) { if (arr.length) this.writeMessage(tag, writePackedVarint, arr);   }

	writePackedSVarint(tag, arr) { if (arr.length) this.writeMessage(tag, writePackedSVarint, arr);  }

	writePackedBoolean(tag, arr) { if (arr.length) this.writeMessage(tag, writePackedBoolean, arr);  }

	writePackedFloat(tag, arr) { if (arr.length) this.writeMessage(tag, writePackedFloat, arr);    }

	writePackedDouble(tag, arr) { if (arr.length) this.writeMessage(tag, writePackedDouble, arr);   }

	writePackedFixed32(tag, arr) { if (arr.length) this.writeMessage(tag, writePackedFixed32, arr);  }

	writePackedSFixed32(tag, arr) { if (arr.length) this.writeMessage(tag, writePackedSFixed32, arr); }

	writePackedFixed64(tag, arr) { if (arr.length) this.writeMessage(tag, writePackedFixed64, arr);  }

	writePackedSFixed64(tag, arr) { if (arr.length) this.writeMessage(tag, writePackedSFixed64, arr); }


	writeBytesField(tag, buffer) {
		this.writeTag(tag, Pbf.Bytes);
		this.writeBytes(buffer);
	}

	writeFixed32Field(tag, val) {
		this.writeTag(tag, Pbf.Fixed32);
		this.writeFixed32(val);
	}

	writeSFixed32Field(tag, val) {
		this.writeTag(tag, Pbf.Fixed32);
		this.writeSFixed32(val);
	}

	writeFixed64Field(tag, val) {
		this.writeTag(tag, Pbf.Fixed64);
		this.writeFixed64(val);
	}

	writeSFixed64Field(tag, val) {
		this.writeTag(tag, Pbf.Fixed64);
		this.writeSFixed64(val);
	}

	writeVarintField(tag, val) {
		this.writeTag(tag, Pbf.Varint);
		this.writeVarint(val);
	}

	writeSVarintField(tag, val) {
		this.writeTag(tag, Pbf.Varint);
		this.writeSVarint(val);
	}

	writeStringField(tag, str) {
		this.writeTag(tag, Pbf.Bytes);
		this.writeString(str);
	}

	writeFloatField(tag, val) {
		this.writeTag(tag, Pbf.Fixed32);
		this.writeFloat(val);
	}

	writeDoubleField(tag, val) {
		this.writeTag(tag, Pbf.Fixed64);
		this.writeDouble(val);
	}

	writeBooleanField(tag, val) {
		this.writeVarintField(tag, Boolean(val));
	}




	readVarintRemainder(l, s, p) {
		var buf = p.buf,
			h, b;

		b = buf[p.pos++]; h  = (b & 0x70) >> 4;  if (b < 0x80) return this.toNum(l, h, s);
		b = buf[p.pos++]; h |= (b & 0x7f) << 3;  if (b < 0x80) return this.toNum(l, h, s);
		b = buf[p.pos++]; h |= (b & 0x7f) << 10; if (b < 0x80) return this.toNum(l, h, s);
		b = buf[p.pos++]; h |= (b & 0x7f) << 17; if (b < 0x80) return this.toNum(l, h, s);
		b = buf[p.pos++]; h |= (b & 0x7f) << 24; if (b < 0x80) return this.toNum(l, h, s);
		b = buf[p.pos++]; h |= (b & 0x01) << 31; if (b < 0x80) return this.toNum(l, h, s);

		throw new Error('Expected varint not more than 10 bytes');
	}

	readPackedEnd(pbf) {
		return pbf.type === Pbf.Bytes ?
			pbf.readVarint() + pbf.pos : pbf.pos + 1;
	}

	toNum(low, high, isSigned) {
		if (isSigned) {
			return high * 0x100000000 + (low >>> 0);
		}

		return ((high >>> 0) * 0x100000000) + (low >>> 0);
	}

	writeBigVarint(val, pbf) {
		var low, high;

		if (val >= 0) {
			low  = (val % 0x100000000) | 0;
			high = (val / 0x100000000) | 0;
		} else {
			low  = ~(-val % 0x100000000);
			high = ~(-val / 0x100000000);

			if (low ^ 0xffffffff) {
				low = (low + 1) | 0;
			} else {
				low = 0;
				high = (high + 1) | 0;
			}
		}

		if (val >= 0x10000000000000000 || val < -0x10000000000000000) {
			throw new Error('Given varint doesn\'t fit into 10 bytes');
		}

		pbf.realloc(10);

		writeBigVarintLow(low, high, pbf);
		writeBigVarintHigh(high, pbf);
	}

	writeBigVarintLow(low, high, pbf) {
		pbf.buf[pbf.pos++] = low & 0x7f | 0x80; low >>>= 7;
		pbf.buf[pbf.pos++] = low & 0x7f | 0x80; low >>>= 7;
		pbf.buf[pbf.pos++] = low & 0x7f | 0x80; low >>>= 7;
		pbf.buf[pbf.pos++] = low & 0x7f | 0x80; low >>>= 7;
		pbf.buf[pbf.pos]   = low & 0x7f;
	}

	writeBigVarintHigh(high, pbf) {
		var lsb = (high & 0x07) << 4;

		pbf.buf[pbf.pos++] |= lsb         | ((high >>>= 3) ? 0x80 : 0); if (!high) return;
		pbf.buf[pbf.pos++]  = high & 0x7f | ((high >>>= 7) ? 0x80 : 0); if (!high) return;
		pbf.buf[pbf.pos++]  = high & 0x7f | ((high >>>= 7) ? 0x80 : 0); if (!high) return;
		pbf.buf[pbf.pos++]  = high & 0x7f | ((high >>>= 7) ? 0x80 : 0); if (!high) return;
		pbf.buf[pbf.pos++]  = high & 0x7f | ((high >>>= 7) ? 0x80 : 0); if (!high) return;
		pbf.buf[pbf.pos++]  = high & 0x7f;
	}

	makeRoomForExtraLength(startPos, len, pbf) {
		var extraLen =
			len <= 0x3fff ? 1 :
			len <= 0x1fffff ? 2 :
			len <= 0xfffffff ? 3 : Math.floor(Math.log(len) / (Math.LN2 * 7));

		// if 1 byte isn't enough for encoding message length, shift the data to the right
		pbf.realloc(extraLen);
		for (var i = pbf.pos - 1; i >= startPos; i--) pbf.buf[i + extraLen] = pbf.buf[i];
	}

	writePackedVarint(arr, pbf)   { for (var i = 0; i < arr.length; i++) pbf.writeVarint(arr[i]);   }
	writePackedSVarint(arr, pbf)  { for (var i = 0; i < arr.length; i++) pbf.writeSVarint(arr[i]);  }
	writePackedFloat(arr, pbf)    { for (var i = 0; i < arr.length; i++) pbf.writeFloat(arr[i]);    }
	writePackedDouble(arr, pbf)   { for (var i = 0; i < arr.length; i++) pbf.writeDouble(arr[i]);   }
	writePackedBoolean(arr, pbf)  { for (var i = 0; i < arr.length; i++) pbf.writeBoolean(arr[i]);  }
	writePackedFixed32(arr, pbf)  { for (var i = 0; i < arr.length; i++) pbf.writeFixed32(arr[i]);  }
	writePackedSFixed32(arr, pbf) { for (var i = 0; i < arr.length; i++) pbf.writeSFixed32(arr[i]); }
	writePackedFixed64(arr, pbf)  { for (var i = 0; i < arr.length; i++) pbf.writeFixed64(arr[i]);  }
	writePackedSFixed64(arr, pbf) { for (var i = 0; i < arr.length; i++) pbf.writeSFixed64(arr[i]); }

	// Buffer code below from https://github.com/feross/buffer, MIT-licensed

	readUInt32(buf, pos) {
		return ((buf[pos]) |
			(buf[pos + 1] << 8) |
			(buf[pos + 2] << 16)) +
			(buf[pos + 3] * 0x1000000);
	}

	writeInt32(buf, val, pos) {
		buf[pos] = val;
		buf[pos + 1] = (val >>> 8);
		buf[pos + 2] = (val >>> 16);
		buf[pos + 3] = (val >>> 24);
	}

	readInt32(buf, pos) {
		return ((buf[pos]) |
			(buf[pos + 1] << 8) |
			(buf[pos + 2] << 16)) +
			(buf[pos + 3] << 24);
	}

	readUtf8(buf, pos, end) {
		var str = '';
		var i = pos;

		while (i < end) {
			var b0 = buf[i];
			var c = null; // codepoint
			var bytesPerSequence =
				b0 > 0xEF ? 4 :
				b0 > 0xDF ? 3 :
				b0 > 0xBF ? 2 : 1;

			if (i + bytesPerSequence > end) break;

			var b1, b2, b3;

			if (bytesPerSequence === 1) {
				if (b0 < 0x80) {
					c = b0;
				}
			} else if (bytesPerSequence === 2) {
				b1 = buf[i + 1];
				if ((b1 & 0xC0) === 0x80) {
					c = (b0 & 0x1F) << 0x6 | (b1 & 0x3F);
					if (c <= 0x7F) {
						c = null;
					}
				}
			} else if (bytesPerSequence === 3) {
				b1 = buf[i + 1];
				b2 = buf[i + 2];
				if ((b1 & 0xC0) === 0x80 && (b2 & 0xC0) === 0x80) {
					c = (b0 & 0xF) << 0xC | (b1 & 0x3F) << 0x6 | (b2 & 0x3F);
					if (c <= 0x7FF || (c >= 0xD800 && c <= 0xDFFF)) {
						c = null;
					}
				}
			} else if (bytesPerSequence === 4) {
				b1 = buf[i + 1];
				b2 = buf[i + 2];
				b3 = buf[i + 3];
				if ((b1 & 0xC0) === 0x80 && (b2 & 0xC0) === 0x80 && (b3 & 0xC0) === 0x80) {
					c = (b0 & 0xF) << 0x12 | (b1 & 0x3F) << 0xC | (b2 & 0x3F) << 0x6 | (b3 & 0x3F);
					if (c <= 0xFFFF || c >= 0x110000) {
						c = null;
					}
				}
			}

			if (c === null) {
				c = 0xFFFD;
				bytesPerSequence = 1;

			} else if (c > 0xFFFF) {
				c -= 0x10000;
				str += String.fromCharCode(c >>> 10 & 0x3FF | 0xD800);
				c = 0xDC00 | c & 0x3FF;
			}

			str += String.fromCharCode(c);
			i += bytesPerSequence;
		}

		return str;
	}

	readUtf8TextDecoder(buf, pos, end) {
		return this.utf8TextDecoder.decode(buf.subarray(pos, end));
	}

	writeUtf8(buf, str, pos) {
		for (var i = 0, c, lead; i < str.length; i++) {
			c = str.charCodeAt(i); // code point

			if (c > 0xD7FF && c < 0xE000) {
				if (lead) {
					if (c < 0xDC00) {
						buf[pos++] = 0xEF;
						buf[pos++] = 0xBF;
						buf[pos++] = 0xBD;
						lead = c;
						continue;
					} else {
						c = lead - 0xD800 << 10 | c - 0xDC00 | 0x10000;
						lead = null;
					}
				} else {
					if (c > 0xDBFF || (i + 1 === str.length)) {
						buf[pos++] = 0xEF;
						buf[pos++] = 0xBF;
						buf[pos++] = 0xBD;
					} else {
						lead = c;
					}
					continue;
				}
			} else if (lead) {
				buf[pos++] = 0xEF;
				buf[pos++] = 0xBF;
				buf[pos++] = 0xBD;
				lead = null;
			}

			if (c < 0x80) {
				buf[pos++] = c;
			} else {
				if (c < 0x800) {
					buf[pos++] = c >> 0x6 | 0xC0;
				} else {
					if (c < 0x10000) {
						buf[pos++] = c >> 0xC | 0xE0;
					} else {
						buf[pos++] = c >> 0x12 | 0xF0;
						buf[pos++] = c >> 0xC & 0x3F | 0x80;
					}
					buf[pos++] = c >> 0x6 & 0x3F | 0x80;
				}
				buf[pos++] = c & 0x3F | 0x80;
			}
		}
		return pos;
	}
}
