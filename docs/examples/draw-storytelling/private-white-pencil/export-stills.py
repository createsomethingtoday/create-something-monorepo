"""Refresh accessibility frames and media evidence from the newly rendered video."""
import json
from pathlib import Path
import subprocess

OUT = Path(__file__).resolve().parent
scenes = json.loads((OUT / 'scene-times.json').read_text())
video = OUT / 'private-white-pencil.mp4'
if len(scenes) != 4:
    raise ValueError('The review page needs four teaching beats; update its layout before changing the scene count.')
for i, scene in enumerate(scenes, 1):
    if not scene['start'] <= scene['still'] < scene['end']:
        raise ValueError(f'Invalid still time for scene {i}')
    subprocess.run(['ffmpeg', '-y', '-v', 'error', '-ss', str(scene['still']),
                    '-i', str(video), '-frames:v', '1', str(OUT / f'frame-{i}.png')], check=True)
subprocess.run(['ffmpeg', '-y', '-v', 'error', '-framerate', '1',
                '-i', str(OUT / 'frame-%d.png'), '-vf', 'scale=640:360,tile=2x2',
                '-frames:v', '1', str(OUT / 'storyboard.jpg')], check=True)
metadata = json.loads(subprocess.check_output(
    ['ffprobe', '-v', 'error', '-show_streams', '-show_format', '-of', 'json', str(video)], text=True))
metadata['format']['filename'] = video.name
(OUT / 'media-check.json').write_text(json.dumps(metadata, indent=2) + '\n')
print('Refreshed four stills, storyboard and media evidence from the current video.')
