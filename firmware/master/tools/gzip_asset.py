#!/usr/bin/env python3
"""Compresse une ressource web en gzip reproductible (mtime=0) pour l'embarquer dans le firmware."""
import gzip
import pathlib
import sys


def main() -> int:
    if len(sys.argv) != 3:
        print("usage: gzip_asset.py <source> <destination.gz>", file=sys.stderr)
        return 2
    src, dst = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2])
    data = src.read_bytes()
    dst.parent.mkdir(parents=True, exist_ok=True)
    with open(dst, "wb") as raw:
        with gzip.GzipFile(filename="", mode="wb", fileobj=raw, compresslevel=9, mtime=0) as gz:
            gz.write(data)
    print(f"{src.name}: {len(data)} -> {dst.stat().st_size} octets (gzip)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
