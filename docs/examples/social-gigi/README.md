# GiGi company LinkedIn draft

## Caption

A musician asks GiGi to rename a task for Friday’s jazz set. GiGi brings back the proposed title, “Confirm Saturday crew,” with two choices: Approve or Reject. The gig stays linked while the musician reviews the change.

That small pause is worth designing for. When an assistant edits something you rely on, you should be able to see exactly what you’re agreeing to.

Watch “Read, review and approve with Ask GiGi” on the [GiGi for Mac beta page](https://createsomething.agency/gigi/beta).

## Alt text

A cream CREATE SOMETHING card reads “A task rename, held for review.” A frame from the GiGi sample workspace shows the proposed task title “Confirm Saturday crew,” the Approve and Reject buttons, and the linked Friday jazz set.

## Source and reproduction

Company LinkedIn draft, November 22, 2026. The musician scenario comes from the synthetic workspace in the public walkthrough. The frame illustrates one proposed edit. The walkthrough shows the subsequent approval and saved result. The screenshot keeps the native product appearance. The surrounding type and paper color adapt the [Agency editorial design](https://github.com/createsomethingtoday/create-something-monorepo/blob/18eb4c2ed89e0fe181a292dc76ec232c89e049a3/packages/agency/src/lib/styles/editorial-runtime.css), using its Geist body fallback.

To reproduce the [1080 × 1350 PNG](gigi-task-review.png), download the [public walkthrough](https://media.createsomething.io/releases/gigi/walkthroughs/6bdd2b9b49f5e8c67879d47ae0c87ab2fae9ca6c5a330ef14c7302cceebfcbbc/gigi-codex-chat-walkthrough.mp4). Its SHA-256 is `6bdd2b9b49f5e8c67879d47ae0c87ab2fae9ca6c5a330ef14c7302cceebfcbbc`. From this directory, run the following with Pillow 11.3 and fonttools[woff] 4.60.1 installed. The [editable composition](render.py) reads the pinned font files from Git.

```sh
ffmpeg -v error -ss 53 -i walkthrough.mp4 -frames:v 1 frame.png
python3 render.py frame.png gigi-task-review.png
```
