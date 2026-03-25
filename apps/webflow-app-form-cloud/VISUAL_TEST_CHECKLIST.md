# Visual Test Checklist ✓

**URL:** http://localhost:3000/complete-form-with-styles  
**Tester:** ________________  
**Date:** ________________  
**Browser:** ________________  

---

## 🎯 Goal 1: No Blocking Alert Dialogs

### Test: Empty Form Submit
- [ ] Click Submit button without filling form
- [ ] ✅ PASS: Inline error banner appears at top
- [ ] ✅ PASS: No `alert()` dialog blocks the page
- [ ] ❌ FAIL: ________________________________

### Test: Client ID Verification
- [ ] Enter invalid Client ID: "123"
- [ ] Click "Verify Client ID" button
- [ ] ✅ PASS: Inline error message below field
- [ ] ✅ PASS: No `alert()` dialog
- [ ] ❌ FAIL: ________________________________

### Test: YouTube URL Validation
- [ ] Enter invalid URL: "not-a-url"
- [ ] Tab away from field
- [ ] ✅ PASS: Inline error message appears
- [ ] ✅ PASS: No `alert()` dialog
- [ ] ❌ FAIL: ________________________________

### Test: Form Submission
- [ ] Fill required fields and submit
- [ ] ✅ PASS: Inline success/error banner
- [ ] ✅ PASS: No `alert()` dialog
- [ ] ❌ FAIL: ________________________________

**Goal 1 Result:** ☐ PASS  ☐ FAIL

---

## ⌨️ Goal 2: Keyboard Usability

### Test: Tab Order
- [ ] Click in address bar
- [ ] Press Tab repeatedly
- [ ] ✅ PASS: Logical tab order (top to bottom)
- [ ] ✅ PASS: Can Tab out of every control
- [ ] ✅ PASS: No keyboard traps
- [ ] ❌ FAIL: ________________________________

### Test: File Upload Button
- [ ] Tab to "App avatar image" upload button
- [ ] Press Enter key
- [ ] ✅ PASS: File picker opens
- [ ] Press Space key (after closing picker)
- [ ] ✅ PASS: File picker opens
- [ ] ❌ FAIL: ________________________________

### Test: File Remove Button
- [ ] Upload a file
- [ ] Tab to Remove button (X icon)
- [ ] Press Enter key
- [ ] ✅ PASS: File removed
- [ ] Upload file again
- [ ] Press Space key on Remove button
- [ ] ✅ PASS: File removed
- [ ] ❌ FAIL: ________________________________

### Test: Payment Type Checkboxes
- [ ] Tab to "Free" checkbox
- [ ] Press Space key
- [ ] ✅ PASS: Checkbox toggles
- [ ] Tab to "Paid" checkbox
- [ ] Press Space key
- [ ] ✅ PASS: Checkbox toggles
- [ ] ❌ FAIL: ________________________________

### Test: Visibility Checkboxes
- [ ] Tab to "Public" checkbox
- [ ] Press Space key
- [ ] ✅ PASS: Checkbox toggles
- [ ] Tab to "Private" checkbox
- [ ] Press Space key
- [ ] ✅ PASS: Checkbox toggles (exclusive)
- [ ] ❌ FAIL: ________________________________

### Test: Submit Button
- [ ] Tab to Submit button
- [ ] Press Enter key
- [ ] ✅ PASS: Form submits
- [ ] ❌ FAIL: ________________________________

**Goal 2 Result:** ☐ PASS  ☐ FAIL

---

## 👁️ Goal 3: Visible Focus States

### Test: Light Mode Focus (Default)
- [ ] Tab to "Submission Type" dropdown
- [ ] ✅ PASS: Blue focus ring visible
- [ ] Tab to "App Name" input
- [ ] ✅ PASS: Blue focus ring + shadow
- [ ] Tab to "Client ID" input
- [ ] ✅ PASS: Blue focus ring + shadow
- [ ] Tab to "Verify Client ID" button
- [ ] ✅ PASS: 2px blue outline with offset
- [ ] Tab to "Free" checkbox
- [ ] ✅ PASS: Blue outline visible
- [ ] Tab to file upload button
- [ ] ✅ PASS: 2px blue outline
- [ ] Tab to Submit button
- [ ] ✅ PASS: 2px blue outline
- [ ] ❌ FAIL: ________________________________

### Test: Dark Mode Focus
- [ ] Enable system dark mode
- [ ] Reload page
- [ ] Tab through all controls above
- [ ] ✅ PASS: Bright blue (`#4d9fff`) outline visible
- [ ] ✅ PASS: High contrast against dark background
- [ ] ❌ FAIL: ________________________________

**Goal 3 Result:** ☐ PASS  ☐ FAIL

---

## 💬 Goal 4: Inline Status Messages

### Test: Form-Level Status Banner
- [ ] Submit empty form
- [ ] ✅ PASS: Error banner at top of form
- [ ] ✅ PASS: Red color with error icon
- [ ] Fill form and submit successfully
- [ ] ✅ PASS: Success banner at top
- [ ] ✅ PASS: Green color with success message
- [ ] ❌ FAIL: ________________________________

### Test: Client ID Inline Feedback
- [ ] Enter invalid Client ID: "123"
- [ ] Click "Verify Client ID"
- [ ] ✅ PASS: Red error text below field
- [ ] Enter valid format: "abcd...64chars"
- [ ] Click "Verify Client ID"
- [ ] ✅ PASS: Green success text below field
- [ ] ❌ FAIL: ________________________________

### Test: YouTube URL Inline Feedback
- [ ] Enter invalid URL: "not-a-url"
- [ ] Tab away
- [ ] ✅ PASS: Red error text below field
- [ ] Enter valid URL: "https://youtube.com/watch?v=xyz"
- [ ] Tab away
- [ ] ✅ PASS: Green success text below field
- [ ] ❌ FAIL: ________________________________

### Test: Field-Level Errors
- [ ] Submit form with empty required field
- [ ] ✅ PASS: Error message appears below field
- [ ] ✅ PASS: Field border turns red (if applicable)
- [ ] ❌ FAIL: ________________________________

**Goal 4 Result:** ☐ PASS  ☐ FAIL

---

## 📱 Goal 5: Mobile Usability (390px)

### Test: Viewport Setup
- [ ] Open DevTools (F12)
- [ ] Enable responsive mode (Cmd+Shift+M)
- [ ] Set viewport: 390 x 844 (iPhone 12 Pro)
- [ ] ✅ Ready to test

### Test: No Horizontal Scroll
- [ ] Scroll through entire form
- [ ] ✅ PASS: No horizontal scrollbar
- [ ] ✅ PASS: All content fits within 390px
- [ ] ❌ FAIL: ________________________________

### Test: Touch Target Sizes
- [ ] Measure file upload button
- [ ] ✅ PASS: ≥44px height
- [ ] Measure file remove button
- [ ] ✅ PASS: ≥44px × 44px
- [ ] Measure checkboxes (tap area)
- [ ] ✅ PASS: ≥44px tap target
- [ ] Measure Submit button
- [ ] ✅ PASS: ≥44px height, full width
- [ ] ❌ FAIL: ________________________________

### Test: Client ID Field Layout
- [ ] Scroll to "App Client ID" field
- [ ] Type long text to fill input
- [ ] ✅ PASS: Verify button below input (not overlapping)
- [ ] ✅ PASS: All text visible
- [ ] ✅ PASS: Button full width on mobile
- [ ] ❌ FAIL: ________________________________

### Test: File Upload Layout
- [ ] Scroll to "App avatar image" field
- [ ] ✅ PASS: Upload button full width
- [ ] ✅ PASS: Controls stacked vertically
- [ ] ✅ PASS: No horizontal overflow
- [ ] ❌ FAIL: ________________________________

### Test: Text Readability
- [ ] Check all labels and text
- [ ] ✅ PASS: Font size ≥16px (no zoom on iOS)
- [ ] ✅ PASS: All text readable without zooming
- [ ] ❌ FAIL: ________________________________

### Test: Submit Button Clarity
- [ ] Scroll to bottom of form
- [ ] ✅ PASS: Submit button full width
- [ ] ✅ PASS: Clearly visible and tappable
- [ ] ✅ PASS: Adequate spacing around button
- [ ] ❌ FAIL: ________________________________

**Goal 5 Result:** ☐ PASS  ☐ FAIL

---

## 🌙 Goal 6: Dark Mode Contrast

### Test: Enable Dark Mode
- [ ] macOS: System Preferences > General > Dark
- [ ] Windows: Settings > Personalization > Colors > Dark
- [ ] Reload page
- [ ] ✅ PASS: Form switches to dark theme
- [ ] ❌ FAIL: ________________________________

### Test: Text Contrast
- [ ] Check body text (white on dark)
- [ ] ✅ PASS: Clearly readable
- [ ] Check labels (white on dark)
- [ ] ✅ PASS: Clearly readable
- [ ] Check secondary text (gray on dark)
- [ ] ✅ PASS: Readable
- [ ] ❌ FAIL: ________________________________

### Test: Input Borders Visible
- [ ] Check text inputs
- [ ] ✅ PASS: Visible border (`#333` on `#1a1a1a`)
- [ ] Check dropdowns
- [ ] ✅ PASS: Visible border
- [ ] Check textareas
- [ ] ✅ PASS: Visible border
- [ ] Check checkboxes
- [ ] ✅ PASS: Visible border
- [ ] ❌ FAIL: ________________________________

### Test: Focus States in Dark Mode
- [ ] Tab to text input
- [ ] ✅ PASS: Bright blue outline visible (`#4d9fff`)
- [ ] Tab to checkbox
- [ ] ✅ PASS: Bright blue outline visible
- [ ] Tab to button
- [ ] ✅ PASS: Bright blue outline visible
- [ ] ❌ FAIL: ________________________________

### Test: Error/Success Messages
- [ ] Trigger validation error
- [ ] ✅ PASS: Red error text readable
- [ ] Trigger success message
- [ ] ✅ PASS: Green success text readable
- [ ] ❌ FAIL: ________________________________

### Test: Quill Editor Dark Mode
- [ ] Scroll to "App preview description"
- [ ] ✅ PASS: Editor has visible border
- [ ] ✅ PASS: Toolbar icons visible (white)
- [ ] Click in editor
- [ ] ✅ PASS: Text visible while typing
- [ ] ❌ FAIL: ________________________________

### Test: File Upload Area
- [ ] Check file upload button
- [ ] ✅ PASS: Visible border and background
- [ ] ✅ PASS: Text readable
- [ ] Upload file and check remove button
- [ ] ✅ PASS: Remove icon visible
- [ ] ❌ FAIL: ________________________________

**Goal 6 Result:** ☐ PASS  ☐ FAIL

---

## 📊 Overall Results

| Goal | Status | Notes |
|------|--------|-------|
| 1. No Alert Dialogs | ☐ PASS ☐ FAIL | ________________ |
| 2. Keyboard Usability | ☐ PASS ☐ FAIL | ________________ |
| 3. Focus States | ☐ PASS ☐ FAIL | ________________ |
| 4. Inline Messages | ☐ PASS ☐ FAIL | ________________ |
| 5. Mobile Usability | ☐ PASS ☐ FAIL | ________________ |
| 6. Dark Mode | ☐ PASS ☐ FAIL | ________________ |

**Overall:** ☐ ALL PASS  ☐ SOME FAIL

---

## 🐛 Issues Found

### Issue 1
- **Severity:** ☐ High  ☐ Medium  ☐ Low
- **Description:** ________________________________
- **Steps to Reproduce:** ________________________________
- **Expected:** ________________________________
- **Actual:** ________________________________

### Issue 2
- **Severity:** ☐ High  ☐ Medium  ☐ Low
- **Description:** ________________________________
- **Steps to Reproduce:** ________________________________
- **Expected:** ________________________________
- **Actual:** ________________________________

### Issue 3
- **Severity:** ☐ High  ☐ Medium  ☐ Low
- **Description:** ________________________________
- **Steps to Reproduce:** ________________________________
- **Expected:** ________________________________
- **Actual:** ________________________________

---

## ✅ Sign-off

**Tester Signature:** ________________  
**Date Completed:** ________________  
**Time Spent:** ________________  
**Recommendation:** ☐ Ship  ☐ Fix Issues First

---

## 📸 Screenshots

Attach screenshots of any issues found:
1. ________________________________
2. ________________________________
3. ________________________________
