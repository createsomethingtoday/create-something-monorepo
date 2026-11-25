"""Render the GiGi LinkedIn still from the public walkthrough frame and Agency fonts."""
from io import BytesIO
from pathlib import Path
import subprocess
import sys

from fontTools.ttLib import TTFont
from PIL import Image, ImageDraw, ImageFont

HERE = Path(__file__).resolve().parent
DESIGN = "18eb4c2ed89e0fe181a292dc76ec232c89e049a3"
PAPER, INK, MUTED = "#faf8f5", "#262626", "#55514c"


def font(filename, size):
    source = f"{DESIGN}:packages/agency/static/{filename}.woff2"
    data = subprocess.check_output(["git", "show", source], cwd=HERE)
    face = TTFont(BytesIO(data))
    face.flavor = None
    buffer = BytesIO()
    face.save(buffer)
    return ImageFont.truetype(BytesIO(buffer.getvalue()), size)


def render(frame, destination):
    image = Image.new("RGB", (1080, 1350), PAPER)
    draw = ImageDraw.Draw(image)
    mono = font("agency/fonts/geist-mono-latin", 27)
    serif = font("agency/fonts/stix-two-text-latin", 108)
    body = font("fonts/agency-geist-latin", 39)
    draw.text((64, 60), "CREATE SOMETHING", font=mono, fill=INK)
    draw.text((1016, 60), "GiGi for Mac", anchor="rt", font=mono, fill=INK)
    draw.line((64, 120, 1016, 120), fill="#aaa59d", width=2)
    draw.text((58, 177), "A task rename,", font=serif, fill=INK)
    draw.text((58, 286), "held for review.", font=serif, fill=INK)
    draw.text((64, 457), "Ask GiGi prepares the edit. You decide whether", font=body, fill=INK)
    draw.text((64, 509), "to save it to your gig.", font=body, fill=INK)
    # Preserve the native confirmation card and linked gig from the recorded demo.
    with Image.open(frame) as capture:
        panel = capture.crop((740, 119, 1850, 748))
    image.paste(panel.resize((952, 539), Image.Resampling.LANCZOS), (64, 626))
    draw.text((64, 1190), "Ask GiGi walkthrough  /  Sample workspace", font=mono, fill=MUTED)
    draw.line((64, 1260, 1016, 1260), fill="#aaa59d", width=2)
    image.save(destination)


if __name__ == "__main__":
    render(*sys.argv[1:])
