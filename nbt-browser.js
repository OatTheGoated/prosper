// Minimal browser NBT parser for ProsperMC
// Supports uncompressed NBT (.schem, .litematic)

window.NBT = {
    read(buffer) {
        const data = new DataView(buffer);
        let offset = 0;

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
            let out = "";
            for (let i = 0; i < len; i++) {
                out += String.fromCharCode(data.getUint8(offset));
                offset++;
            }
            return out;
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
                    for (let i = 0; i < len; i++) arr[i] = data.getUint8(offset++);
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
                    for (let i = 0; i < len; i++) list.push(readValue(subtype));
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
                    for (let i = 0; i < len; i++) {
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
                    for (let i = 0; i < len; i++) {
                        arr.push(Number(data.getBigInt64(offset)));
                        offset += 8;
                    }
                    return arr;
                }

                default:
                    throw new Error("Unknown NBT tag type: " + type);
            }
        }

        return readTag();
    }
};
