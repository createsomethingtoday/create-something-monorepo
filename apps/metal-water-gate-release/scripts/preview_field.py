#!/usr/bin/env python3
"""Write inspectable PNG previews from the versioned SPH field document."""

import json
import pathlib
import struct
import sys
import zlib


def png_chunk(kind, payload):
    return (
        struct.pack(">I", len(payload))
        + kind
        + payload
        + struct.pack(">I", zlib.crc32(kind + payload) & 0xFFFFFFFF)
    )


def write_png(path, width, height, pixels):
    raw = b"".join(b"\x00" + pixels[y * width * 3:(y + 1) * width * 3]
                   for y in range(height))
    data = b"\x89PNG\r\n\x1a\n"
    data += png_chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0))
    data += png_chunk(b"IDAT", zlib.compress(raw, 9))
    data += png_chunk(b"IEND", b"")
    path.write_bytes(data)


def main():
    if len(sys.argv) < 3:
        raise SystemExit(
            "usage: preview_field.py <field.json> <output-dir> [frame ...]"
        )
    source_path = pathlib.Path(sys.argv[1])
    output_dir = pathlib.Path(sys.argv[2])
    frame_indices = [int(value) for value in sys.argv[3:]] or [0, 47, 72, 73, 120, 144, 156, 191]
    document = json.loads(source_path.read_text())
    specification = document["specification"]
    field_width = specification["width"]
    field_height = specification["height"]
    scale = 6
    width = field_width * scale
    height = field_height * scale
    bounds = document["bounds"]
    gate_normalized = (
        (document["gateY"] - bounds["minimumY"])
        / (bounds["maximumY"] - bounds["minimumY"])
    )
    gate_row = field_height - 1 - round(gate_normalized * (field_height - 1))
    frame_map = {frame["frameIndex"]: frame for frame in document["frames"]}
    output_dir.mkdir(parents=True, exist_ok=True)

    for frame_index in frame_indices:
        frame = frame_map[frame_index]
        values = frame["values"]
        maximum = max(values) or 1
        pixels = bytearray(width * height * 3)
        for output_y in range(height):
            field_y = field_height - 1 - output_y // scale
            for output_x in range(width):
                field_x = output_x // scale
                value = values[field_y * field_width + field_x]
                density = min(value / max(maximum * 0.55, 1), 1.0)
                paper = (243, 243, 240)
                water = (0, 87 + int(85 * density), 184 + int(45 * density))
                color = tuple(
                    int(paper[channel] * (1 - density) + water[channel] * density)
                    for channel in range(3)
                )
                if output_y // scale == gate_row and not frame["gateOpen"]:
                    color = (9, 9, 9)
                offset = (output_y * width + output_x) * 3
                pixels[offset:offset + 3] = bytes(color)
        output_path = output_dir / f"field-{frame_index:04d}.png"
        write_png(output_path, width, height, pixels)
        print(output_path)


if __name__ == "__main__":
    main()
