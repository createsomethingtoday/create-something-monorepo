# Draw pilot onboarding

Allow about 20 minutes. Use an Apple Silicon Mac running macOS 13 or later and the supplied CREATE SOMETHING Draw 0.1.1 DMG. This exercise uses fictional data; no account, phone or agent connection is required.

## Install and start

1. If you already use Draw, open it and export the current canvas with **File → JSON** before changing anything. Keep the previous app and backup until the pilot is complete.
2. Open the supplied DMG. Copy CREATE SOMETHING Draw to Applications. If Finder asks to replace an existing app, pause and ask the pilot organizer for a separate install arrangement.
3. Launch CREATE SOMETHING Draw from Applications. A normal macOS downloaded-app confirmation may appear. If macOS blocks the app or reports a damaged/unverified build, stop and send the exact message and macOS version to the organizer. Do not bypass security settings.
4. Give the canvas a title, such as **Pilot — request approval**. The lower status bar identifies the Mac as **MAC AUTHORITY**.

The organizer can check the supplied file with `shasum -a 256 /path/to/file.dmg`; it should match the hash in the [pilot overview](README.md).

## Map one fictional workflow

Use this scenario, or replace it with a redacted process of similar size:

> An employee submits an equipment request. Operations checks whether required details are complete. Requests within the fictional $500 limit are approved by the team lead. Larger requests need a finance approval. Missing details return to the requester. Approved requests enter a fulfillment queue.

Keep names, IDs, links and amounts fictional. For a real process, remove client names, personal details, credentials and commercial information before entering it.

1. Select **Note** and click the canvas to add a note. Type three short lines: **Equipment request**, **Trigger: request submitted**, **Owner: Operations**.
2. Switch to **Select**, select the note by its border, then choose **Edit & format**. Give the first block the **Title** role, keep the supporting lines as **Body**, and bold the word **Operations** by selecting it before choosing **Bold**. Review the preview and choose **Save note**. Keep **Fit note height to text** checked.
3. Add notes for **Check details**, **Approval decision**, **Fulfillment**, and **Return for details**. Use headings for stage names and bullets for actions. Include the fictional approval threshold and the two approval owners.
4. Draw arrows between stages, including the missing-details return path. Use Select to move objects until the main flow and exception path are distinguishable. Use **Fit drawing** to see the whole map; zoom in again to read detail.
5. Reopen a formatted note and change one sentence. Save it. Try **Undo** and **Redo** after leaving the text field. Open the editor again, make a temporary change, then **Cancel** or press Escape; confirm the discarded change is absent.
6. Add a longer explanation to one note, save with height fitting enabled, and use Fit drawing. Decide whether the map remains useful when text becomes longer.
7. Choose **File → JSON** and keep the downloaded file as an editable backup. Export **SVG** or **PNG** as a visual handoff. Exports use the current canvas view, so Fit drawing before exporting the whole map and inspect the result for the intended framing.
8. Quit Draw completely, reopen it, and confirm the canvas and formatted notes remain. Complete the [feedback form](feedback.md).

Useful keys outside text fields: **V** Select, **N** Note, **A** Arrow, **F** Fit drawing, Space to pan, ⌘Z Undo, ⌘⇧Z Redo. Inside the note editor, ⌘Enter saves; Escape cancels. The **Shortcuts** button lists the available keys.

## Storage and backups

Draw saves the Mac's canonical canvas locally in its application-data directory. The normal macOS location is under `~/Library/Application Support/agency.createsomething.draw/`; testing profiles can use a different directory. The pilot does not require you to open or edit these internal files.

Local saving is not a remote backup. Export JSON at the end of each session and before importing or starting a new canvas. Keep dated copies in your chosen backup location. JSON retains editable document data; SVG and PNG are visual exports rather than editable backups.

**File → Import** loads an exported Draw JSON document into the current canvas and clears the current undo history. Export the current work first. **File → New canvas** also replaces the Mac's current canvas after confirmation. Do not use either command on work you need until you have a JSON copy. This pilot uses one active workflow; it does not assume a native project library or cloud sync.

## Sharing and scope

The macOS app offers JSON/SVG/PNG file exports. Send an export only to an intended recipient using a channel you choose; the pilot instructions do not send anything automatically. A JSON file exposes the full document, including text and links. Redact it before sharing.

The separate web canvas has explicit view-only snapshot publishing. That is a network action which uploads a document and creates an unlisted link; it is not a native sharing control or a private collaborative session. Do not publish a pilot map as part of this exercise. Ordinary local drawing does not publish it.

This macOS pilot does not cover iPhone pairing, simultaneous multi-user editing, motion generation or agent automation.

## If something goes wrong

Record the action, expected result, actual result, app version and macOS version. A cropped screenshot of the synthetic exercise is useful. If the app still opens, export JSON before troubleshooting. Do not delete application data, reinstall over an existing app, send credentials, or attach your entire app-data folder. Report save failures, missing work and security prompts immediately through the organizer's supplied feedback channel.
