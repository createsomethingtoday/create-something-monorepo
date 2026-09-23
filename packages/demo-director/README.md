# Demo Director

Local FFmpeg tooling and a personal Codex skill for real product footage. No runtime Python dependencies. Read `skills/demo-director/SKILL.md` for the workflow and `references/manifest.md` beneath it for the edit contract.

`python3 scripts/director.py encode-capture <capture-folder> <new-recording.mp4>`

`python3 scripts/director.py render <manifest.json> <new-final.mp4>`

The authorized browser owns capture and the established narration provider owns audio generation. Scripts never obtain credentials or select a browser. Large footage, signed export URLs, and pairing data must stay outside this package.

Install into the personal `demo-director` plugin using the Plugin Creator scaffold, copy `scripts/` and `skills/` into its source folder, validate, update the cachebuster, then `codex plugin add demo-director@personal`. Preserve unrelated plugin files and use the marketplace helper to resolve the installed marketplace name.

Validation: `python3 -m unittest discover -s tests`. Integration tests render a synthetic test fixture; it is never substituted for product footage.
