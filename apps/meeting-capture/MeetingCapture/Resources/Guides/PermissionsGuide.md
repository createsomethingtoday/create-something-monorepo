# Meeting Capture Permission Guide

Grant these permissions before relying on automatic capture:

1. Screen Recording: required for primary system-audio capture.
2. Automation: required to inspect meeting app state and window titles.
3. Microphone: only used when system-audio capture is unavailable.

If detection is unreliable:

- restart the app after granting permissions
- keep the meeting app in the supported list
- use manual recording as a fallback for unsupported calls

If upload fails:

- confirm the API URL points at the meetings worker
- keep local files until upload succeeds
- retry once connectivity returns
