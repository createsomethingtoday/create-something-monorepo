"""Local portrait composition; exact type stays separate from concept artwork."""
from pathlib import Path
from io import BytesIO
import subprocess, hashlib, json
from PIL import Image, ImageDraw, ImageFont
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parents[5]
OUT = Path(__file__).resolve().parent
DESIGN = '18eb4c2ed89e0fe181a292dc76ec232c89e049a3'
ART = ROOT / 'packages/agency/static/images/agency-stories/editorial-template-review-evidence-trays.webp'

def font(path, size):
    data = subprocess.check_output(['git', 'show', f'{DESIGN}:packages/agency/static/{path}.woff2'], cwd=ROOT)
    face = TTFont(BytesIO(data)); face.flavor = None
    buf = BytesIO(); face.save(buf)
    return ImageFont.truetype(BytesIO(buf.getvalue()), size)

image = Image.new('RGB', (1080, 1350), '#faf8f5')
d = ImageDraw.Draw(image)
serif = font('agency/fonts/stix-two-text-latin', 96)
body = font('fonts/agency-geist-latin', 35)
mono = font('agency/fonts/geist-mono-latin', 25)
def text(x, y, value, face, fill='#262626'):
    box = d.textbbox((x,y), value, font=face)
    assert box[2] <= 1020 and box[3] <= 1310, (value, box)
    d.text((x,y), value, font=face, fill=fill)

text(64, 55, 'CREATE SOMETHING / FIELD NOTE', mono)
d.line((64, 113, 1016, 113), fill='#aaa59d', width=2)
text(58, 155, 'Prepare the evidence.', serif)
text(58, 256, 'Keep the decision.', serif)
text(64, 404, '49 of 50 selected cases produced a usable', body)
text(64, 450, 'packet in a balanced shadow sample.', body)
# The editorial artwork was retired from the current Agency tree.
art_revision = '5f9bfab3f6a9069332d650f42a09f5bd18d806a7'
art_bytes = subprocess.check_output(['git', 'show', f'{art_revision}:{ART.relative_to(ROOT)}'], cwd=ROOT)
with Image.open(BytesIO(art_bytes)) as art:
    art = art.convert('RGB'); art.thumbnail((952, 635), Image.Resampling.LANCZOS)
    image.paste(art, (64, 540))
text(64, 1198, 'Concept illustration / Human review retained', mono)
text(64, 1250, 'Reviewer time savings remain unmeasured.', mono)
image.save(OUT / 'evidence-before-approval.png')
image.resize((360,450), Image.Resampling.LANCZOS).save(OUT / 'feed-preview.png')
(OUT / 'manifest.json').write_text(json.dumps({'design_revision':DESIGN,'artwork':str(ART.relative_to(ROOT)),'artwork_revision':art_revision,'artwork_sha256':hashlib.sha256(art_bytes).hexdigest(),'dimensions':[1080,1350],'status':'local draft; not scheduled or published'}, indent=2)+'\n')
