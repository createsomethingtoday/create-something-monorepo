#!/usr/bin/env python3
"""Verify the isolated V-JEPA runtime and write a machine-readable receipt."""

from __future__ import annotations

import argparse
import hashlib
import json
import platform
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path


EXPECTED_COMMIT = "204698b45b3712590f06245fbfba32d3be539812"
EXPECTED_CHECKPOINT_SHA256 = "848a77c33cc9e6649ed2119c9bea1e2c569bcdab9539ff3e7c02ccc2959ddf4d"


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def git_output(repository: Path, *args: str) -> bytes:
    return subprocess.check_output(["git", "-C", str(repository), *args])


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--runtime", required=True)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    runtime = Path(args.runtime).resolve()
    repository = runtime / "repo"
    checkpoint = runtime / "vjepa2_1_vitb_dist_vitG_384.pt"
    commit = git_output(repository, "rev-parse", "HEAD").decode().strip()
    if commit != EXPECTED_COMMIT:
        raise SystemExit(f"V-JEPA repository commit mismatch: {commit}")
    clean_code = subprocess.run(
        [
            "git", "-C", str(repository), "diff", "--quiet", "--",
            "src/hub", "src/models", "src/datasets", "evals/video_classification_frozen",
        ],
        check=False,
    )
    if clean_code.returncode != 0:
        raise SystemExit("V-JEPA runtime code paths differ from the pinned repository commit.")
    checkpoint_hash = sha256_file(checkpoint)
    if checkpoint_hash != EXPECTED_CHECKPOINT_SHA256:
        raise SystemExit("V-JEPA checkpoint hash mismatch.")
    archive = git_output(repository, "archive", commit)
    code_hash = hashlib.sha256(archive).hexdigest()

    import torch

    if not torch.backends.mps.is_built() or not torch.backends.mps.is_available():
        raise SystemExit("This prepared Guard profile requires an available PyTorch MPS backend.")
    sys.path.insert(0, str(repository))
    from src.hub.backbones import _clean_backbone_key, vjepa2_1_vit_base_384

    started = time.perf_counter()
    encoder, _ = vjepa2_1_vit_base_384(pretrained=False, num_frames=16)
    checkpoint_value = torch.load(checkpoint, map_location="cpu", weights_only=True, mmap=True)
    encoder.load_state_dict(_clean_backbone_key(checkpoint_value["ema_encoder"]), strict=True)
    encoder.eval().to("mps")
    with torch.inference_mode():
        output = encoder(torch.zeros((1, 3, 16, 384, 384), device="mps"))
    torch.mps.synchronize()
    elapsed = time.perf_counter() - started
    if not bool(torch.isfinite(output).all().item()):
        raise SystemExit("V-JEPA MPS smoke output contains non-finite values.")

    receipt = {
        "version": 1,
        "profile": "guard-vjepa-runtime-v1",
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "repository": "facebookresearch/vjepa2",
        "repositoryCommit": commit,
        "codeSha256": code_hash,
        "checkpoint": checkpoint.name,
        "checkpointSha256": checkpoint_hash,
        "python": platform.python_version(),
        "torch": torch.__version__,
        "device": "mps",
        "mpsBuilt": torch.backends.mps.is_built(),
        "mpsAvailable": torch.backends.mps.is_available(),
        "inputShape": [1, 3, 16, 384, 384],
        "outputShape": list(output.shape),
        "finite": True,
        "loadAndInferenceSeconds": round(elapsed, 3),
    }
    receipt_path = runtime / "runtime-receipt.json"
    temporary = receipt_path.with_suffix(".json.tmp")
    temporary.write_text(json.dumps(receipt, indent=2) + "\n")
    temporary.replace(receipt_path)
    print(json.dumps(receipt))


if __name__ == "__main__":
    main()
