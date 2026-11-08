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
                case 1:
                    ensure(1);
                    return data.getInt8(offset++);
                case 2: {
                    ensure(2);
                    const value = data.getInt16(offset); offset += 2; return value;
                }
                case 3: {
                    ensure(4);
                    const value = data.getInt32(offset); offset += 4; return value;
                }
                case 4: {
                    ensure(8);
                    const value = Number(data.getBigInt64(offset)); offset += 8; return value;
                }
                case 5: {
                    ensure(4);
                    const value = data.getFloat32(offset); offset += 4; return value;
                }
                case 6: {
                    ensure(8);
                    const value = data.getFloat64(offset); offset += 8; return value;
                }
                case 7: {
                    ensure(4);
                    const len = data.getInt32(offset); offset += 4;
                    ensure(len);
                    const arr = new Uint8Array(len);
                    for (let j = 0; j < len; j++) arr[j] = data.getUint8(offset++);
                    return arr;
                }
                case 8: {
                    ensure(2);
                    const len = data.getUint16(offset); offset += 2;
                    return readString(len);
                }
                case 9: {
                    ensure(5);
                    const subtype = data.getUint8(offset++);
                    const len = data.getInt32(offset); offset += 4;
                    const list = [];
                    for (let j = 0; j < len; j++) list.push(readValue(subtype));
                    return list;
                }
                case 10: {
                    const obj = {};
                    while (true) {
                        const tag = readTag();
                        if (tag.type === 0) break;
                        obj[tag.name] = tag;
                    }
                    return obj;
                }
                case 11: {
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
                case 12: {
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
        if (expectedLength && byteArray.length === expectedLength) return Array.from(byteArray);
        const result = [];
        let i = 0;
        while (i < byteArray.length) {
            let value = 0;
            let shift = 0;
            let b;
            do {
                if (i >= byteArray.length) break;
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

// Give wooden families their species-specific block textures and tint vanilla
// grayscale leaf textures to approximate Minecraft's biome-independent foliage.
window.addEventListener("DOMContentLoaded", () => {
    if (typeof window.getTextureFileName !== "function" || typeof window.getBlockColor !== "function") return;

    const originalTextureName = window.getTextureFileName;
    const originalBlockColor = window.getBlockColor;
    const originalBlockMaterial = window.getBlockMaterial;

    function normalizedBlockName(name) {
        return String(name || "")
            .toLowerCase()
            .replace(/^minecraft:/, "")
            .replace(/\[[^\]]*\]/g, "")
            .replace(/ /g, "_");
    }

    const woodFamilies = [
        ["dark_oak", "dark_oak_planks.png", 0x432c1b],
        ["spruce", "spruce_planks.png", 0x735135],
        ["birch", "birch_planks.png", 0xc4b07c],
        ["jungle", "jungle_planks.png", 0xa37c55],
        ["acacia", "acacia_planks.png", 0xb66a50],
        ["mangrove", "mangrove_planks.png", 0x763c34],
        ["cherry", "cherry_planks.png", 0xe2b1ad],
        ["bamboo", "bamboo_planks.png", 0xd8c46a],
        ["crimson", "crimson_planks.png", 0x7b3546],
        ["warped", "warped_planks.png", 0x3a8b7b],
        ["oak", "oak_planks.png", 0xb8945f]
    ];
    const leafTextures = [
        ["flowering_azalea", "flowering_azalea_leaves.png"], ["dark_oak", "dark_oak_leaves.png"],
        ["spruce", "spruce_leaves.png"], ["birch", "birch_leaves.png"],
        ["jungle", "jungle_leaves.png"], ["acacia", "acacia_leaves.png"],
        ["mangrove", "mangrove_leaves.png"], ["cherry", "cherry_leaves.png"],
        ["azalea", "azalea_leaves.png"], ["oak", "oak_leaves.png"]
    ];
    const foliageTints = [
        ["flowering_azalea", 0x9b6bb5], ["dark_oak", 0x507a32], ["spruce", 0x619961],
        ["birch", 0x80a755], ["jungle", 0x59c93c], ["acacia", 0xb6cf76],
        ["mangrove", 0x3a7a3a], ["cherry", 0xe7a5bb], ["azalea", 0x48b518],
        ["oak", 0x48b518]
    ];

    function getWoodFamily(name) {
        return woodFamilies.find(([species]) => name.includes(`${species}_`));
    }

    function isWoodenShape(name) {
        return /(?:^|_)(?:fence|fence_gate|slab|stairs)(?:_|$)/.test(name) ||
            /(?:^|_)(?:door|trapdoor|button|pressure_plate)(?:_|$)/.test(name);
    }

    window.getTextureFileName = function (blockName) {
        const name = normalizedBlockName(blockName);
        if (name.includes("planks")) {
            const family = getWoodFamily(name);
            if (family) return family[1];
        }
        if (name.includes("leaves")) {
            const match = leafTextures.find(([species]) => name.includes(`${species}_leaves`));
            if (match) return match[1];
        }
        if (isWoodenShape(name)) {
            const family = getWoodFamily(name);
            if (family) return family[1];
        }
        return originalTextureName(blockName);
    };

    window.getBlockColor = function (name) {
        const normalized = normalizedBlockName(name);
        if (normalized.includes("leaves")) {
            const match = foliageTints.find(([species]) => normalized.includes(`${species}_leaves`));
            if (match) return match[1];
        }
        if (normalized.includes("planks") || isWoodenShape(normalized)) {
            const family = getWoodFamily(normalized);
            if (family) return family[2];
        }
        return originalBlockColor(name);
    };

    if (typeof originalBlockMaterial === "function") {
        window.getBlockMaterial = function (blockKey, color, rawName) {
            const material = originalBlockMaterial(blockKey, color, rawName);
            const name = normalizedBlockName(rawName || blockKey);
            if (!name.includes("leaves")) return material;
            const tint = window.getBlockColor(name);
            const materials = Array.isArray(material) ? material : [material];
            for (const faceMaterial of materials) {
                if (faceMaterial && faceMaterial.color) faceMaterial.color.setHex(tint);
            }
            return material;
        };
    }

    // Replace the viewer's generic scaled fence cubes with Minecraft-like posts
    // and two rails that extend toward every adjacent fence or solid block.
    const originalViewer = window.init3DViewer;
    if (typeof originalViewer !== "function") return;

    function voxelKey(x, y, z) { return `${x},${y},${z}`; }
    function isFence(name) { return /(?:^|_)fence$/.test(normalizedBlockName(name)); }
    function isFenceGate(name) { return normalizedBlockName(name).endsWith("_fence_gate"); }
    function isConnectableBlock(name) {
        const n = normalizedBlockName(name);
        if (!n || n.includes("air") || n.includes("glass") || n.includes("leaves") || n.includes("pane") ||
            n.includes("iron_bars") || n.includes("flower") || n.includes("tulip") || n.includes("torch") ||
            n.includes("rail") || n.includes("carpet") || n.includes("pressure_plate") || n.includes("button") ||
            n.includes("sapling") || n.includes("sign") || n.includes("banner")) return false;
        return true;
    }

    function makeFenceGeometry(mask) {
        const pieces = [
            // Tall central post: Minecraft fences rise to 1.5 blocks.
            { x: 0, y: 0.25, z: 0, sx: 0.25, sy: 1.5, sz: 0.25 }
        ];
        const directions = [
            { bit: 1, dx: 1, dz: 0 }, { bit: 2, dx: -1, dz: 0 },
            { bit: 4, dx: 0, dz: 1 }, { bit: 8, dx: 0, dz: -1 }
        ];
        for (const direction of directions) {
            if (!(mask & direction.bit)) continue;
            for (const railY of [-0.125, 0.5]) {
                pieces.push({
                    x: direction.dx * 0.25,
                    y: railY,
                    z: direction.dz * 0.25,
                    sx: direction.dx ? 0.5 : 0.125,
                    sy: 0.125,
                    sz: direction.dz ? 0.5 : 0.125
                });
            }
        }

        const geometries = pieces.map(piece => {
            const geometry = new THREE.BoxGeometry(piece.sx, piece.sy, piece.sz);
            geometry.translate(piece.x, piece.y, piece.z);
            return geometry;
        });
        const merged = new THREE.BufferGeometry();
        const positions = [], normals = [], uvs = [], indices = [];
        let vertexOffset = 0;
        for (const geometry of geometries) {
            const position = geometry.attributes.position;
            const normal = geometry.attributes.normal;
            const uv = geometry.attributes.uv;
            for (let i = 0; i < position.count; i++) {
                positions.push(position.getX(i), position.getY(i), position.getZ(i));
                normals.push(normal.getX(i), normal.getY(i), normal.getZ(i));
                uvs.push(uv.getX(i), uv.getY(i));
            }
            const sourceIndices = geometry.index ? geometry.index.array : Array.from({ length: position.count }, (_, i) => i);
            for (const index of sourceIndices) indices.push(index + vertexOffset);
            vertexOffset += position.count;
            geometry.dispose();
        }
        merged.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
        merged.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
        merged.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
        merged.setIndex(indices);
        return merged;
    }

    window.init3DViewer = function (data) {
        originalViewer(data);
        // threeApp is a top-level lexical variable in scanner.html, shared by
        // classic scripts in this page even though it is not a window property.
        if (typeof threeApp === "undefined" || !threeApp || !threeApp.meshGroups) return;
        const app = threeApp;
        const fenceVoxels = data.voxels.filter(v => isFence(v.blockName || v.rawName));
        if (!fenceVoxels.length) return;

        const allBlocks = new Map(data.voxels.map(v => [voxelKey(v.x, v.y, v.z), v]));
        const directions = [
            { bit: 1, dx: 1, dz: 0 }, { bit: 2, dx: -1, dz: 0 },
            { bit: 4, dx: 0, dz: 1 }, { bit: 8, dx: 0, dz: -1 }
        ];
        const groups = new Map();
        for (const fence of fenceVoxels) {
            let mask = 0;
            for (const direction of directions) {
                const neighbor = allBlocks.get(voxelKey(fence.x + direction.dx, fence.y, fence.z + direction.dz));
                const neighborName = neighbor && (neighbor.blockName || neighbor.rawName);
                if (neighbor && (isFence(neighborName) || isFenceGate(neighborName) || isConnectableBlock(neighborName))) {
                    mask |= direction.bit;
                }
            }
            const groupKey = `${fence.rawName || fence.blockName}:${mask}`;
            if (!groups.has(groupKey)) groups.set(groupKey, { mask, voxels: [] });
            groups.get(groupKey).voxels.push(fence);
        }

        // Hide fence instances from the original full-cube approximation.
        for (const group of app.meshGroups) {
            if (group.voxels.some(v => isFence(v.blockName || v.rawName))) group.mesh.visible = false;
        }

        for (const { mask, voxels } of groups.values()) {
            const first = voxels[0];
            const mesh = new THREE.InstancedMesh(
                makeFenceGeometry(mask),
                window.getBlockMaterial(first.blockName, first.color, first.rawName),
                voxels.length
            );
            const dummy = new THREE.Object3D();
            for (let i = 0; i < voxels.length; i++) {
                dummy.position.set(voxels[i].x, voxels[i].y, voxels[i].z);
                dummy.updateMatrix();
                mesh.setMatrixAt(i, dummy.matrix);
            }
            mesh.instanceMatrix.needsUpdate = true;
            app.scene.add(mesh);
            app.meshGroups.push({ mesh, voxels, scale: [1, 1, 1], offsetY: 0 });
        }
    };
});
