# Recovery tone fixture

`recovery-tone.wav` is generated synthetic audio, with no user media: 100 ms of a 440 Hz sine wave, mono signed 16-bit PCM at 8 kHz, amplitude 4000. Python standard-library generation:

```python
import math, struct, wave
with wave.open("recovery-tone.wav", "wb") as f:
    f.setnchannels(1)
    f.setsampwidth(2)
    f.setframerate(8000)
    f.writeframes(b"".join(struct.pack("<h", int(math.sin(i * 440 * math.tau / 8000) * 4000)) for i in range(800)))
```

The native recovery regression imports these bytes into a disposable workspace, reconnects the same original, drops the database handle, opens fresh dispatch reads, and verifies the returned preview path contains identical bytes. A decoder check is `ffmpeg -v error -i recovery-tone.wav -f null -`. This does not establish native WebKit playback or audible output.
