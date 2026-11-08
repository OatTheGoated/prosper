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

// Keep block-state properties from structure palettes and render connected,
// oriented blocks with shapes closer to their in-game appearance. scanner.html
// loads this parser before defining its global parser and viewer functions.
window.addEventListener("DOMContentLoaded", () => {
    if (typeof window.parseSchematicNBT !== "function" || typeof window.init3DViewer !== "function") return;

    const originalParse = window.parseSchematicNBT;
    const tagValue = tag => tag && Object.prototype.hasOwnProperty.call(tag, "value") ? tag.value : tag;
    const stateString = (name, properties) => {
        if (!properties || !Object.keys(properties).length) return name;
        const values = Object.entries(properties).map(([key, value]) => `${key}=${value}`).join(",");
        return `${name}[${values}]`;
    };
    const propertiesOf = entry => {
        const source = tagValue(entry && entry.Properties) || {};
        const properties = {};
        for (const [key, tag] of Object.entries(source)) properties[key] = String(tagValue(tag));
        return properties;
    };

    window.parseSchematicNBT = function (nbtRoot, fileName) {
        const parsed = originalParse(nbtRoot, fileName);
        const root = tagValue(nbtRoot) || {};
        const indexStates = [];
        const coordinateStates = new Map();
        const key = (x, y, z) => `${x},${y},${z}`;

        // Vanilla structure palettes store properties separately from Name.
        if (root.palette && root.blocks) {
            const palette = tagValue(root.palette) || [];
            palette.forEach((entry, index) => {
                const name = tagValue(entry && entry.Name) || "minecraft:air";
                indexStates[index] = stateString(name, propertiesOf(entry));
            });
            for (const block of (tagValue(root.blocks) || [])) {
                const pos = tagValue(block.pos) || [];
                coordinateStates.set(key(pos[0], pos[1], pos[2]), indexStates[tagValue(block.state)] || "minecraft:air");
            }
        }

        // Litematica palette entries also keep block properties as NBT compounds.
        if (root.Regions) {
            const regions = tagValue(root.Regions) || {};
            const regionName = Object.keys(regions)[0];
            const region = regionName ? tagValue(regions[regionName]) : null;
            if (region) {
                const palette = tagValue(region.BlockStatePalette) || [];
                palette.forEach((entry, index) => {
                    const name = tagValue(entry && entry.Name) || "minecraft:air";
                    indexStates[index] = stateString(name, propertiesOf(entry));
                });
                const sizeTag = tagValue(region.Size) || {};
                const width = Math.abs(Number(tagValue(sizeTag.x) || 0));
                const height = Math.abs(Number(tagValue(sizeTag.y) || 0));
                const length = Math.abs(Number(tagValue(sizeTag.z) || 0));
                const packed = tagValue(region.BlockStates) || [];
                const bits = Math.max(2, Math.ceil(Math.log2(palette.length || 2)));
                const mask = (1n << BigInt(bits)) - 1n;
                let stateIndex = 0;
                let bitOffset = 0n;
                let linear = 0;
                const total = width * height * length;
                for (; linear < total && stateIndex < packed.length; linear++) {
                    const current = BigInt.asUintN(64, BigInt(packed[stateIndex]));
                    let value;
                    if (bitOffset + BigInt(bits) <= 64n) {
                        value = Number((current >> bitOffset) & mask);
                        bitOffset += BigInt(bits);
                        if (bitOffset === 64n) { bitOffset = 0n; stateIndex++; }
                    } else {
                        const next = stateIndex + 1 < packed.length ? BigInt.asUintN(64, BigInt(packed[stateIndex + 1])) : 0n;
                        const firstBits = 64n - bitOffset;
                        const secondBits = BigInt(bits) - firstBits;
                        value = Number(((current >> bitOffset) | ((next & ((1n << secondBits) - 1n)) << firstBits)) & mask);
                        bitOffset = secondBits;
                        stateIndex++;
                    }
                    const x = linear % width;
                    const z = Math.floor(linear / width) % length;
                    const y = Math.floor(linear / (width * length));
                    coordinateStates.set(key(x, y, z), indexStates[value] || "minecraft:air");
                }
            }
        }

        for (const voxel of parsed.voxels) {
            // Sponge palettes already encode state as block[state=value,...].
            const x = Math.round(voxel.x + parsed.width / 2);
            const z = Math.round(voxel.z + parsed.length / 2);
            const detailed = coordinateStates.get(key(x, voxel.y, z));
            if (detailed) voxel.rawName = detailed;
            const match = voxel.rawName.match(/^([^[]+)(?:\[([^\]]*)\])?/);
            voxel.blockName = (match ? match[1] : voxel.rawName).replace(/^minecraft:/, "");
            voxel.state = {};
            if (match && match[2]) {
                for (const pair of match[2].split(",")) {
                    const parts = pair.split("=");
                    if (parts.length === 2) voxel.state[parts[0]] = parts[1];
                }
            }
        }
        return parsed;
    };

    const originalViewer = window.init3DViewer;
    window.init3DViewer = function (data) {
        // Use the existing renderer for general blocks; bars/panes are replaced
        // with connection-aware meshes immediately after its scene is created.
        originalViewer(data);
        const app = window.threeApp;
        if (!app || !app.meshGroups) return;

        const special = new Set(["iron_bars", "glass_pane"]);
        const specialVoxels = data.voxels.filter(v => special.has(v.blockName));
        if (!specialVoxels.length) return;

        const positions = new Map(data.voxels.map(v => [key3(v.x, v.y, v.z), v]));
        const directions = [
            { name: "east", dx: 1, dz: 0 }, { name: "west", dx: -1, dz: 0 },
            { name: "south", dx: 0, dz: 1 }, { name: "north", dx: 0, dz: -1 }
        ];
        const masks = new Map();
        for (const voxel of specialVoxels) {
            const mask = directions.reduce((result, dir, index) => {
                const neighbor = positions.get(key3(voxel.x + dir.dx, voxel.y, voxel.z + dir.dz));
                return result | (neighbor ? (1 << index) : 0);
            }, 0);
            if (!masks.has(mask)) masks.set(mask, []);
            masks.get(mask).push(voxel);
        }

        for (const group of app.meshGroups) {
            if (!group.voxels.some(v => special.has(v.blockName))) continue;
            app.scene.remove(group.mesh);
        }

        const box = new THREE.BoxGeometry(1, 1, 1);
        function connectedShape(mask) {
            const pieces = [{ x: 0, y: 0, z: 0, sx: 0.125, sy: 1, sz: 0.125 }];
            directions.forEach((dir, index) => {
                if (mask & (1 << index)) pieces.push({
                    x: dir.dx * 0.25, y: 0, z: dir.dz * 0.25,
                    sx: dir.dx ? 0.5 : 0.125, sy: 0.125, sz: dir.dz ? 0.5 : 0.125
                });
            });
            const geometries = pieces.map(piece => {
                const geometry = new THREE.BoxGeometry(piece.sx, piece.sy, piece.sz);
                geometry.translate(piece.x, piece.y, piece.z);
                return geometry;
            });
            const merged = new THREE.BufferGeometry();
            const positions = [], normals = [], uvs = [], indices = [];
            let offset = 0;
            geometries.forEach(geometry => {
                const p = geometry.attributes.position;
                const n = geometry.attributes.normal;
                const uv = geometry.attributes.uv;
                for (let i = 0; i < p.count; i++) {
                    positions.push(p.getX(i), p.getY(i), p.getZ(i));
                    normals.push(n.getX(i), n.getY(i), n.getZ(i));
                    uvs.push(uv.getX(i), uv.getY(i));
                }
                const sourceIndices = geometry.index ? geometry.index.array : Array.from({ length: p.count }, (_, i) => i);
                for (const index of sourceIndices) indices.push(index + offset);
                offset += p.count;
                geometry.dispose();
            });
            merged.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
            merged.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
            merged.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
            merged.setIndex(indices);
            return merged;
        }

        for (const [mask, voxels] of masks) {
            const first = voxels[0];
            const geometry = connectedShape(mask);
            const material = window.getBlockMaterial(first.blockName, first.color, first.rawName);
            const mesh = new THREE.InstancedMesh(geometry, material, voxels.length);
            const dummy = new THREE.Object3D();
            voxels.forEach((voxel, index) => {
                dummy.position.set(voxel.x, voxel.y, voxel.z);
                dummy.updateMatrix();
                mesh.setMatrixAt(index, dummy.matrix);
            });
            mesh.instanceMatrix.needsUpdate = true;
            app.scene.add(mesh);
            app.meshGroups.push({ mesh, voxels, scale: [1, 1, 1], offsetY: 0 });
        }

        // The original generic bar/pane instances are hidden by replacing their
        // material opacity; the new meshes above preserve their actual connections.
        for (const group of app.meshGroups) {
            if (group.voxels.some(v => special.has(v.blockName)) && !masks.has(0)) group.mesh.visible = false;
        }
    };

    function key3(x, y, z) { return `${x},${y},${z}`; }
});
