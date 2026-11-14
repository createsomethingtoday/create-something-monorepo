# Welcome identity repair R33

The final parent walkthrough found the old r09 full-body PNG still active in Workbench welcome at 80 px on mobile. `before.json` records the actual failing browser condition: old source, no supported head frame, pass false. `before-390.png` preserves that output.

Replaced only the welcome image with the shared CanonCompanion at its supported 96 px; adjusted its desktop/mobile grid track and wrapper to 96 px. Workflow scripts, current character component and approved scene sources are unchanged.

Existing meaningful workflow, mounted Workbench and character tests pass: 11 tests in three files (tests.log). Actual Ego matrix passes 12 cases: 320/390/768/1024/1025/1440 in both owning palettes, current loaded head source, 96 px complete frame, no heading overlap or root overflow. Parent directly viewed dark320 and light390, plus the actual current desktop hero capture. Begin transfers focus to the next heading and removes the welcome decoration. Back to start restores the welcome and focus; no-JS320 retains readable copy/current head and honestly disabled action (states.json).

Functional and parent visual gates pass within this scope. Fresh independent acceptance is pending. No production publication or master-art approval. Harness first invocation incorrectly passed a filename to ego nodejs; corrected to documented stdin without application changes. All local test commands are finished. Worktree remains preserved at t3/canon-design-system-redesign; no commit or promotion.
