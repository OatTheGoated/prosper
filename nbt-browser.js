// Browser NBT parser for ProsperMC
// Supports modern & legacy Minecraft schematic files (.schem, .schematic, .nbt, .litematic)

window.NBT = {
    read(buffer) {
        const data = new DataView(buffer);
        let offset = 0;
        const utf8 = new TextDecoder("utf-8");

        function ensure(bytes) {
            if (offset + bytes > data.byteLength) {
                throw new Error("Invalid NBT data (out of bounds)");
            }
        }

        function readTag() {
            ensure(1);
            const type = data.getUint8(offset); offset++;
            if (type === 0) return { type: 0 };

            ensure(2);
            const nameLength = data.getUint16(offset); offset += 2;
            const name = readString(nameLength);

            return { type, name, value: readValue(type) };
        }

        function readString(len) {
            ensure(len);
            const bytes = new Uint8Array(buffer, offset, len);
            offset += len;
            return utf8.decode(bytes);
        }

        function readValue(type) {
            switch (type) {
                case 1: // byte
                    ensure(1);
                    return data.getInt8(offset++);

                case 2: // short
                    ensure(2);
                    const s = data.getInt16(offset); offset += 2; return s;

                case 3: // int
                    ensure(4);
                    const i = data.getInt32(offset); offset += 4; return i;

                case 4: // long
                    ensure(8);
                    const l = Number(data.getBigInt64(offset)); offset += 8; return l;

                case 5: // float
                    ensure(4);
                    const f = data.getFloat32(offset); offset += 4; return f;

                case 6: // double
                    ensure(8);
                    const d = data.getFloat64(offset); offset += 8; return d;

                case 7: { // byte array
                    ensure(4);
                    const len = data.getInt32(offset); offset += 4;
                    ensure(len);
                    const arr = new Uint8Array(len);
                    for (let j = 0; j < len; j++) arr[j] = data.getUint8(offset++);
                    return arr;
                }

                case 8: { // string
                    ensure(2);
                    const len = data.getUint16(offset); offset += 2;
                    return readString(len);
                }

                case 9: { // list
                    ensure(1 + 4);
                    const subtype = data.getUint8(offset++);
                    const len = data.getInt32(offset); offset += 4;
                    const list = [];
                    for (let j = 0; j < len; j++) list.push(readValue(subtype));
                    return list;
                }

                case 10: { // compound
                    const obj = {};
                    while (true) {
                        const tag = readTag();
                        if (tag.type === 0) break;
                        obj[tag.name] = tag;
                    }
                    return obj;
                }

                case 11: { // int array
                    ensure(4);
                    const len = data.getInt32(offset); offset += 4;
                    ensure(len * 4);
                    const arr = [];
                    for (let j = 0; j < len; j++) {
                        arr.push(data.getInt32(offset));
                        offset += 4;
                    }
                    return arr;
                }

                case 12: { // long array
                    ensure(4);
                    const len = data.getInt32(offset); offset += 4;
                    ensure(len * 8);
                    const arr = [];
                    for (let j = 0; j < len; j++) {
                        arr.push(data.getBigInt64(offset));
                        offset += 8;
                    }
                    return arr;
                }

                default:
                    throw new Error("Unknown NBT tag type: " + type);
            }
        }

        return readTag();
    },

    decodeVarIntArray(byteArray, expectedLength) {
        if (!byteArray) return [];
        // If byte count exactly matches expected length, it is 1 byte per block
        if (expectedLength && byteArray.length === expectedLength) {
            return Array.from(byteArray);
        }

        const result = [];
        let i = 0;
        const len = byteArray.length;
        while (i < len) {
            let value = 0;
            let shift = 0;
            let b;
            do {
                if (i >= len) break;
                b = byteArray[i++];
                value |= (b & 0x7F) << shift;
                shift += 7;
            } while ((b & 0x80) !== 0);

            result.push(value);
            if (expectedLength && result.length >= expectedLength) break;
        }
        return result;
    }
};
