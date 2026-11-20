---
name: window-take
description: Record a captioned walkthrough film of a real macOS app window (a native app, Electron app or browser) that the agent drives itself with a smooth, visible pointer. Use when asked to "record the app", "make a walkthrough video", "re-record the demo", "take 5 method", or to film a flow that only exists in a desktop app and cannot be filmed in a headless browser. It logs every action with its time, then renders cuts, sped-up waits, blurs, smooth zooms, captions and title cards into one MP4 with a contact sheet. Silent with captions, no narration.
---

# Window take

One take of one app window, driven by the agent, rendered into a captioned film.

- **Capture** (`scripts/wt`): records the window with the real pointer in it, and moves that pointer on an eased, slightly curved path. Every action and mark is written to `events.jsonl` with its time.
- **Render** (`scripts/render.mjs`): reads the recording and the marks. Nothing is baked in at capture, so captions, cuts and zooms can change without a new take.
- **Overlays** (`scripts/overlay.html`): captions and title cards are one HTML page drawn by Chrome. Change the look there. Opened with `?video=<file>`, the same page plays the film with live overlays, for review.

Needs macOS, ffmpeg, Node 18+, Google Chrome, and Screen Recording plus Accessibility permission for the terminal that runs it. First use: `npm install --prefix <skill>/scripts playwright-core`.

## Rules that are not optional

1. **Ask for the machine.** The take uses the real pointer and keyboard. The person cannot use the Mac during capture. Get a clear "now" first.
2. **One window, in front.** Every pointer and key command checks that the app is in front and sends nothing if it is not. If a command prints `SKIP`, stop and look. Do not retry blind.
3. **Look before you click.** `wt shot <name>` saves a still where 1 image pixel is 1 window point. Read it, then use its coordinates. Never guess a coordinate.
4. **Nothing private in the film.** Blur names, accounts and file dialogs with `blur`. Read the contact sheet before the film goes to anyone.
5. **Do not click consent or payment dialogs.** The person does that.
6. **Say what was not checked.** A film that renders is not a film that was watched. Read the contact sheet and frames at each beat.

## A take

```bash
WT=<skill>/scripts/wt
$WT start --app "Notes" --out ~/Movies/my-take      # brings the app forward, records its window
$WT blur start 8 52 160 44                                    # hide the account name for the whole take
$WT title "Shared notes" "Find a note and rename it"
$WT wait 3
$WT beat "Every note is in one list."                        # caption, stays until the next beat
$WT shot look1                                                # still for you to read; not in the film
$WT click 1382 185                                            # glides there, then clicks
$WT scroll 870 600 -700                                       # eased wheel, negative is down the page
$WT paste "Rename the note to Courtside Club."                # or: type <text>, key return, key a --cmd
$WT focus start 1030 160 460 250 ; ... ; $WT focus end        # smooth zoom to a region, and back
$WT fast start --rate 8 ; ... ; $WT fast end                  # a wait the viewer must know happened
$WT cut start ; ... ; $WT cut end                             # frames to remove (your own looking and thinking)
$WT stop
node <skill>/scripts/render.mjs ~/Movies/my-take              # film.mp4, timeline.json, contact-sheet.png
```

Coordinates are points from the window's top left corner. `wt` with no command lists every command.

## How to make a good take

- **Write the beats first**: one line per moment, in the order a viewer needs. A beat is one visible change and one caption of at most 12 words.
- **Wrap your own work in cuts.** Each `shot`, and each pause while you read one, goes inside `cut start` / `cut end`. Only the motion the viewer needs stays.
- **Waits**: if the wait is part of the story (an agent builds a page), use `fast`. If not, use `cut`.
- **Hold after each change**: `wait 1.2` or more, so the viewer can read the result before the pointer moves again.
- **Zoom when the target is small**: a control under about 200 points wide needs a `focus`.
- **Park the pointer** off the content when nothing happens, so it does not hide text.
- **A failed step**: put it inside a cut, repair the state, and do the step again. Do not restart the take.

## After the render

1. Read `contact-sheet.png` (one frame per caption). Check each beat shows what its caption says, and that nothing private is in frame.
2. Pull frames at any doubtful time: `ffmpeg -ss <t> -i film.mp4 -frames:v 1 f.png`.
3. To change captions, cuts or zooms, edit `events.jsonl` (one JSON event per line, `at` in milliseconds) and render again. No new take.
4. Report the length, what each beat shows, and what you did not check.

## Limits

- Silent. Captions only.
- The recording rectangle is fixed at `start`. Do not move or resize the window during a take.
- A menu or dialog that opens outside the window's rectangle is not recorded.
- `type` sends plain keystrokes; for long or non-ASCII text use `paste`.

## When the recorder stops

On 2026-11-19 the macOS recorder ended by itself five times in one take (after 257 s, 272 s, 1 s, 347 s and 26 s, exit code 0, cause not found). The skill is built for that:

- Every pointer and key command checks the recorder first. If it stopped, a new segment starts at once and the command prints `RESUMED as raw-N.mov`. A long `wait` checks every 4 seconds.
- When you see `RESUMED`, the last step may be missing from the film. Look with `shot`, and do the step again if the story needs it.
- The render joins the segments. Marks and captions from time that no segment holds are dropped. A caption stays up across a join.
- `wt recorder` holds the recorder in the foreground. Run it as a background task if your harness ends the child processes of a finished command.
- `wt status` says if the recorder runs. Check it after each long command.

## The finish (added 2026-11-19)

- **Camera:** a `focus` eases in and out over 0.9 s with no jerk at either end. The frame is scaled and cropped per frame, so the move has no shake.
- **Joins:** where frames were removed (a cut, or a gap between segments), the film dims for 0.4 s. A hard jump reads as a fault; this reads as an edit.
- **Fast ranges:** a small "12× speed" mark shows at the top right while a `fast` range plays.
- **Captions:** one line when the text fits in three quarters of the frame. Keep each to about 8 words: say what the viewer must notice, not what the pointer does.
- **Drawn pointer:** `wt start ... --pointer drawn` records without the system pointer. Each move writes its path to `pointer.log`, and the render draws a pointer about twice the system size on that path. It follows the camera and dips when the button goes down. Use it when the film will be watched small. It was tested on a synthetic take only; check the first real take that uses it. The drawn pointer is always an arrow (no hand or text cursor), and it shows only moves that `wt` made.
- **Names on screen:** an app's greeting can show the account owner's name. Add a time-limited `blur start x y w h` and `blur end` around that screen. An `end` closes the newest open blur, so open a whole-take blur first.
