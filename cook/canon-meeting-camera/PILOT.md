# Internal call check

Use a dedicated two-person occurrence on each provider. Micah hosts and observes through a second participant account/device with headphones. Canon uses the dedicated participant Chrome profile on the pilot Mac. Keep each occurrence's WAV, transcript and private Calendar receipts separate.

## Before joining

1. Install OBS Studio and enable its macOS virtual camera. Check that macOS exposes OBS Virtual Camera. Load the unpacked canon-local-capture extension from this checkout into the dedicated Chrome profile. The [capture guide](../../apps/create-something-scheduler/scripts/canon-local-capture/README.md) covers the normal extension setup.
2. Create a single internal occurrence for the intended platform, invite the dedicated Canon account and complete invitation verification. Use the existing scheduler-created internal event workflow on Meet and the internal Zoom Calendar verification path on Zoom. Use the [participant launcher](../../apps/create-something-scheduler/scripts/canon-participant.md) in a foreground terminal. The launcher needs current host Calendar access for its live verification.
3. Prepare an empty dedicated OBS scene with all audio sources disabled. Select the virtual camera's Scene output and bind it to that single scene. Use a 16:9 canvas. Reserve the window-capture selection until the correct tile is open.

## In each call

1. Admit Canon. With the joined meeting tab active, open the extension, then choose **Open visual-only Canon tile**. Match its eight-character window suffix to the one shown in the controller. Add that exact popup as a window source to the dedicated OBS scene. Crop browser chrome, fill the frame with the tile, inspect the preview and confirm the prompted occurrence. The camera can be active while the recorder is waiting.
2. Look from the host's own account. Confirm a muted Canon participant, visible movement and a readable waiting label at ordinary gallery size. Verify no browser chrome, desktop or other people appear in the tile.
3. Check that the dedicated Canon participant can hear the speaking device. If Meet reports that nearby devices have merged audio, use a separate audio connection for Canon and verify reception before the test. Choose an owner-only local folder outside macOS Library for the WAV. Get everyone's explicit consent and start local capture from the control tab. Verify **Taking notes** from the host account before cueing the test sentence. If the host still sees **Waiting to take notes**, stop immediately. After the sentence, stop and save, verify **Notes stopped**, then turn off the camera and leave the call.
4. Use the existing signed local transcript app with that occurrence's saved WAV. Read back the test sentence against the host's words. Record the provider, occurrence, remote observations and transcript result in the private pilot evidence. Keep private media and meeting URLs outside this repository.
5. Repeat in the other provider. If OBS freezes or switches content, turn the camera off immediately. If the recorder or tile loses contact, inspect the capture controls. A disconnected tile cannot establish whether capture has stopped.

## Rollback

Turn off Canon's meeting camera, stop the OBS virtual camera and use the capture controller to stop and save or discard as appropriate. Omit the camera pilot config for a subsequent ordinary camera-off join. Remove the unpacked extension from the dedicated profile when the pilot ends.
