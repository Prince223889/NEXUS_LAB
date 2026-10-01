"""Lecture et retouche du AndroidManifest.xml binaire (format AXML) d'une APK déjà compilée.

Le Studio APK ne recompile rien : il reprend l'APK NEXUS et change seulement le nom du paquet, le nom affiché
et la version. Les nouvelles chaînes sont ajoutées à la fin du pool (les index existants, dont ceux reliés à la
table des ressources, ne bougent pas) et seuls les attributs visés sont repointés.
"""
from __future__ import annotations

import struct

RES_STRING_POOL = 0x0001
RES_XML = 0x0003
RES_XML_START_ELEMENT = 0x0102
RES_XML_RESOURCE_MAP = 0x0180

UTF8_FLAG = 1 << 8
SORTED_FLAG = 1 << 0
NO_INDEX = 0xFFFFFFFF

TYPE_REFERENCE = 0x01
TYPE_STRING = 0x03
TYPE_INT_DEC = 0x10

ATTR = {"label": 0x01010001, "name": 0x01010003, "versionCode": 0x0101021B, "versionName": 0x0101021C, "targetActivity": 0x01010202}
COMPONENTS = ("application", "activity", "activity-alias", "service", "receiver", "provider")


class AxmlError(ValueError):
    pass


def _decode_len8(b: bytes, o: int) -> tuple[int, int]:
    n = b[o]
    if n & 0x80:
        return ((n & 0x7F) << 8) | b[o + 1], o + 2
    return n, o + 1


def _decode_len16(b: bytes, o: int) -> tuple[int, int]:
    n = struct.unpack_from("<H", b, o)[0]
    if n & 0x8000:
        return ((n & 0x7FFF) << 16) | struct.unpack_from("<H", b, o + 2)[0], o + 4
    return n, o + 2


def _encode_len8(n: int) -> bytes:
    if n > 0x7FFF:
        raise AxmlError("Chaîne trop longue")
    return bytes([n]) if n < 0x80 else bytes([0x80 | (n >> 8), n & 0xFF])


def _encode_len16(n: int) -> bytes:
    if n > 0x7FFFFFFF:
        raise AxmlError("Chaîne trop longue")
    return struct.pack("<H", n) if n < 0x8000 else struct.pack("<HH", 0x8000 | (n >> 16), n & 0xFFFF)


class StringPool:
    def __init__(self, chunk: bytes):
        typ, hsize, size, count, styles, flags, s_start, st_start = struct.unpack_from("<HHIIIIII", chunk, 0)
        if typ != RES_STRING_POOL:
            raise AxmlError("Pool de chaînes absent")
        self.utf8 = bool(flags & UTF8_FLAG)
        self.flags = flags & ~SORTED_FLAG
        offsets = struct.unpack_from(f"<{count}I", chunk, hsize)
        self.style_offsets = list(struct.unpack_from(f"<{styles}I", chunk, hsize + 4 * count))
        self.styles_data = chunk[st_start:size] if styles else b""
        self.strings: list[str] = []
        for off in offsets:
            o = s_start + off
            if self.utf8:
                _, o = _decode_len8(chunk, o)
                blen, o = _decode_len8(chunk, o)
                self.strings.append(chunk[o:o + blen].decode("utf-8", "replace"))
            else:
                clen, o = _decode_len16(chunk, o)
                self.strings.append(chunk[o:o + 2 * clen].decode("utf-16-le", "replace"))

    def add(self, s: str) -> int:
        self.strings.append(s)
        return len(self.strings) - 1

    def encode(self) -> bytes:
        data = bytearray()
        offsets = []
        for s in self.strings:
            offsets.append(len(data))
            if self.utf8:
                raw = s.encode("utf-8")
                data += _encode_len8(len(s)) + _encode_len8(len(raw)) + raw + b"\x00"
            else:
                raw = s.encode("utf-16-le")
                data += _encode_len16(len(raw) // 2) + raw + b"\x00\x00"
        while len(data) % 4:
            data += b"\x00"
        count, styles = len(self.strings), len(self.style_offsets)
        hsize = 28
        s_start = hsize + 4 * count + 4 * styles
        st_start = s_start + len(data) if styles else 0
        body = struct.pack(f"<{count}I", *offsets) + struct.pack(f"<{styles}I", *self.style_offsets) + bytes(data) + self.styles_data
        size = hsize + len(body)
        return struct.pack("<HHIIIIII", RES_STRING_POOL, hsize, size, count, styles, self.flags, s_start, st_start) + body


class Manifest:
    """AndroidManifest.xml binaire modifiable."""

    def __init__(self, data: bytes):
        if len(data) < 8:
            raise AxmlError("Manifeste vide")
        typ, hsize, size = struct.unpack_from("<HHI", data, 0)
        if typ != RES_XML or size != len(data):
            raise AxmlError("Ce n'est pas un manifeste Android compilé")
        self.head = data[:hsize]
        o = hsize
        ptype, _, psize = struct.unpack_from("<HHI", data, o)
        if ptype != RES_STRING_POOL:
            raise AxmlError("Pool de chaînes absent du manifeste")
        self.pool = StringPool(data[o:o + psize])
        o += psize
        self.chunks: list[bytearray] = []
        self.resmap: list[int] = []
        while o < len(data):
            ctype, _, csize = struct.unpack_from("<HHI", data, o)
            if csize < 8 or o + csize > len(data):
                raise AxmlError("Manifeste tronqué")
            chunk = bytearray(data[o:o + csize])
            if ctype == RES_XML_RESOURCE_MAP:
                self.resmap = list(struct.unpack_from(f"<{(csize - 8) // 4}I", chunk, 8))
            self.chunks.append(chunk)
            o += csize

    # ------------------------------------------------------------------ lecture
    def _elements(self):
        for chunk in self.chunks:
            if struct.unpack_from("<H", chunk, 0)[0] == RES_XML_START_ELEMENT:
                hsize = struct.unpack_from("<H", chunk, 2)[0]
                _ns, name, astart, asize, acount = struct.unpack_from("<IIHHH", chunk, hsize)
                yield chunk, self.pool.strings[name], hsize + astart, asize, acount

    def _attr_key(self, name_idx: int) -> int | str:
        if name_idx < len(self.resmap) and self.resmap[name_idx]:
            return self.resmap[name_idx]
        return self.pool.strings[name_idx]

    def attributes(self, element: str) -> dict:
        """{nom ou id de ressource: valeur} du premier élément portant ce nom (pour les tests et le contrôle)."""
        for chunk, name, base, asize, count in self._elements():
            if name != element:
                continue
            out = {}
            for i in range(count):
                a = base + i * asize
                _ns, nidx, raw, _vs, _r0, dtype, value = struct.unpack_from("<IIIHBBI", chunk, a)
                key = self._attr_key(nidx)
                if dtype == TYPE_STRING:
                    out[key] = self.pool.strings[value]
                elif raw != NO_INDEX:
                    out[key] = self.pool.strings[raw]
                else:
                    out[key] = value
            return out
        raise AxmlError(f"Élément <{element}> absent")

    # ------------------------------------------------------------------ écriture
    def _find(self, element: str, key):
        for chunk, name, base, asize, count in self._elements():
            if name != element:
                continue
            for i in range(count):
                a = base + i * asize
                nidx = struct.unpack_from("<I", chunk, a + 4)[0]
                if self._attr_key(nidx) == key:
                    return chunk, a
            raise AxmlError(f"Attribut {key} absent de <{element}>")
        raise AxmlError(f"Élément <{element}> absent")

    def set_string(self, element: str, key, value: str) -> None:
        chunk, a = self._find(element, key)
        idx = self.pool.add(value)
        struct.pack_into("<IHBBI", chunk, a + 8, idx, 8, 0, TYPE_STRING, idx)

    def set_int(self, element: str, key, value: int) -> None:
        chunk, a = self._find(element, key)
        struct.pack_into("<IHBBI", chunk, a + 8, NO_INDEX, 8, 0, TYPE_INT_DEC, value & 0xFFFFFFFF)

    def qualify_classes(self, package: str) -> int:
        """« .MainActivity » dépend du paquet : on écrit le nom complet avant de renommer le paquet."""
        n = 0
        for chunk, name, base, asize, count in self._elements():
            if name not in COMPONENTS:
                continue
            for i in range(count):
                a = base + i * asize
                nidx, raw, _vs, _r0, dtype, value = struct.unpack_from("<IIHBBI", chunk, a + 4)
                if self._attr_key(nidx) not in (ATTR["name"], ATTR["targetActivity"]) or dtype != TYPE_STRING:
                    continue
                cls = self.pool.strings[value]
                full = package + cls if cls.startswith(".") else cls if "." in cls else f"{package}.{cls}"
                if full != cls:
                    idx = self.pool.add(full)
                    struct.pack_into("<IHBBI", chunk, a + 8, idx, 8, 0, TYPE_STRING, idx)
                    n += 1
        return n

    def encode(self) -> bytes:
        body = self.pool.encode() + b"".join(bytes(c) for c in self.chunks)
        head = bytearray(self.head)
        struct.pack_into("<I", head, 4, len(head) + len(body))
        return bytes(head) + body


def rebrand(data: bytes, package: str, label: str, version_code: int, version_name: str) -> bytes:
    m = Manifest(data)
    old = m.attributes("manifest").get("package")
    if not isinstance(old, str) or not old:
        raise AxmlError("Nom de paquet d'origine absent")
    m.qualify_classes(old)
    m.set_string("manifest", "package", package)
    m.set_int("manifest", ATTR["versionCode"], version_code)
    m.set_string("manifest", ATTR["versionName"], version_name)
    m.set_string("application", ATTR["label"], label)
    return m.encode()
