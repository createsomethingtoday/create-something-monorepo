# US state map source

Derived from Michael Bostock’s us-atlas 3.0.1 `states-albers-10m.json`, distributed under ISC. Source: https://registry.npmjs.org/us-atlas/-/us-atlas-3.0.1.tgz

Archive SHA-256: `e6daba1800885868303ad3549da62f85a557b8142bb72629ec15651de62f9c5d`. Source topology SHA-256: `6e7bb086a3c791490361968a3094f377f7726c5d0c4900fec03cc42db2305a3d`.

Offline transformation: decode TopoJSON shared arcs; simplify shared arcs with Douglas–Peucker tolerance 0.45 source units; shift x by 60; round coordinates to one decimal; emit SVG polygon paths. The source is already Albers USA projected, including Alaska and Hawaii insets and DC. No runtime geography dependency, geocoding, credentials, or network requests. These are illustrative state outlines, not precise boundaries.

Copyright 2013-2019 Michael Bostock

Permission to use, copy, modify, and/or distribute this software for any purpose
with or without fee is hereby granted, provided that the above copyright notice
and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND
FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS
OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER
TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF
THIS SOFTWARE.
