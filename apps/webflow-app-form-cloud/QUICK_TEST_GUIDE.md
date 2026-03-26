# Quick Visual Test Guide

## Critical Fixes Applied ✅

The following high and medium severity issues have been fixed:

### 1. ✅ Dark Mode Focus Outline (HIGH)
**Fixed:** Changed from `#333` to `#4d9fff` for better contrast
- **Test:** Enable dark mode, Tab through inputs, verify blue outline visible

### 2. ✅ Dark Mode Input Borders (MEDIUM)
**Fixed:** Added `1px solid #333` borders to all inputs in dark mode
- **Test:** Enable dark mode, verify input fields have visible borders

### 3. ✅ Mobile Client ID Verify Button (MEDIUM)
**Fixed:** Button now stacks below input on mobile (<768px)
- **Test:** Resize to 390px, verify button doesn't overlap input text

### 4. ✅ Mobile File Upload Layout (LOW)
**Fixed:** File upload controls now stack vertically on mobile
- **Test:** Resize to 390px, verify no horizontal overflow

### 5. ✅ Checkbox Focus States (LOW)
**Fixed:** Added explicit `:focus-visible` styles for checkboxes
- **Test:** Tab to checkboxes, verify blue outline appears

---

## 5-Minute Quick Test

### Test 1: Dark Mode Contrast (2 min)
```
1. Open http://localhost:3000/complete-form-with-styles
2. Enable system dark mode (macOS: System Preferences > General > Dark)
3. Reload page
4. Visual checks:
   ✓ Input fields have visible borders
   ✓ Text is readable (white on dark)
   ✓ Checkboxes have borders
   ✓ Quill editor has borders
5. Press Tab repeatedly
6. Visual check:
   ✓ Blue focus outline visible on all inputs
   ✓ Focus outline has good contrast
```

### Test 2: Mobile Layout (2 min)
```
1. Open DevTools (F12)
2. Click responsive mode icon (Cmd+Shift+M / Ctrl+Shift+M)
3. Set viewport to 390 x 844 (iPhone 12 Pro)
4. Scroll through form
5. Visual checks:
   ✓ No horizontal scrolling
   ✓ Client ID verify button below input (not overlapping)
   ✓ File upload button full width
   ✓ Submit button full width
   ✓ All text readable
```

### Test 3: Keyboard Navigation (1 min)
```
1. Click in address bar
2. Press Tab repeatedly to navigate through form
3. Check each control:
   ✓ Text inputs show blue focus ring
   ✓ Dropdowns show blue focus ring
   ✓ Checkboxes show blue outline
   ✓ File upload button shows outline
   ✓ Submit button shows outline
   ✓ Can Tab out of every control (no traps)
```

---

## Detailed Test Scenarios

### Scenario A: Dark Mode Focus Testing
**Goal:** Verify focus states meet WCAG 3:1 contrast requirement

1. Enable dark mode
2. Open form
3. Tab to "Submission Type" dropdown
   - Expected: Blue outline visible (#4d9fff)
4. Tab to "App Name" input
   - Expected: Blue outline + light blue shadow
5. Tab to "Payment Type" checkboxes
   - Expected: Blue outline around checkbox
6. Take screenshot for documentation

**Pass Criteria:**
- All focus outlines clearly visible
- Contrast ratio ≥3:1 (use DevTools color picker)

### Scenario B: Mobile Client ID Field
**Goal:** Verify button doesn't overlap input text

1. Set viewport to 390px width
2. Scroll to "App Client ID" field
3. Type long text: "abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890"
4. Observe button position
   - Expected: Button below input, not overlapping

**Pass Criteria:**
- All text visible
- Button fully clickable
- No horizontal scroll

### Scenario C: File Upload Keyboard
**Goal:** Verify file upload accessible via keyboard

1. Tab to first file upload button
2. Press Enter or Space
   - Expected: File picker opens
3. Select a file
4. Tab to "Remove" button (X icon)
5. Press Enter or Space
   - Expected: File removed

**Pass Criteria:**
- File picker opens with keyboard
- File can be removed with keyboard
- Focus outline visible on all states

### Scenario D: Validation Messages
**Goal:** Verify inline messages appear (no alert dialogs)

1. Leave form empty
2. Click Submit
   - Expected: Inline error banner at top
   - Expected: No alert() dialog
3. Enter invalid Client ID: "123"
4. Click "Verify Client ID"
   - Expected: Inline error message below field
   - Expected: No alert() dialog
5. Enter valid Client ID format: "abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890"
6. Click "Verify Client ID"
   - Expected: Inline success or error message
   - Expected: No alert() dialog

**Pass Criteria:**
- All feedback inline
- No blocking dialogs
- Messages have proper ARIA attributes

---

## Browser Compatibility Checklist

Test in multiple browsers to ensure consistency:

### Chrome/Edge (Chromium)
- [ ] Dark mode focus visible
- [ ] Mobile layout correct
- [ ] Keyboard navigation works
- [ ] No console errors

### Firefox
- [ ] Dark mode focus visible
- [ ] Mobile layout correct
- [ ] Keyboard navigation works
- [ ] No console errors

### Safari (macOS/iOS)
- [ ] Dark mode focus visible
- [ ] Mobile layout correct
- [ ] Keyboard navigation works
- [ ] No console errors

---

## Automated Contrast Check

Use browser DevTools to verify contrast ratios:

### Chrome DevTools Method:
1. Right-click element → Inspect
2. In Styles panel, click color swatch
3. Expand "Contrast ratio" section
4. Verify:
   - AA: ≥4.5:1 for text
   - AA: ≥3:1 for UI components
   - AAA: ≥7:1 for text (optional)

### Elements to Check:
- [ ] Body text (#ffffff on #080808) → Should be ~20:1 ✅
- [ ] Input text (#ffffff on #1a1a1a) → Should be ~18:1 ✅
- [ ] Input border (#333 on #080808) → Should be ~3.7:1 ✅
- [ ] Focus outline (#4d9fff on #080808) → Should be ~7.8:1 ✅
- [ ] Secondary text (#d4d4d4 on #080808) → Should be ~16:1 ✅

---

## Known Limitations

### Iframe Constraints
If testing within an iframe:
- Some parent styles may not be accessible (CORS)
- Focus management may behave differently
- Screen reader announcements may vary

### Browser-Specific Behaviors
- **Safari:** May render focus outlines slightly differently
- **Firefox:** May have different checkbox rendering
- **Mobile Safari:** May have different touch behavior

---

## Reporting Issues

If you find issues during testing, document:

1. **Browser/Device:** Chrome 120 on macOS 14
2. **Viewport Size:** 390px width
3. **Dark Mode:** Enabled/Disabled
4. **Steps to Reproduce:**
   - Step 1
   - Step 2
   - Step 3
5. **Expected Result:** What should happen
6. **Actual Result:** What actually happened
7. **Screenshot:** Attach if visual issue
8. **Severity:** High/Medium/Low

---

## Success Criteria Summary

✅ **All tests pass if:**
1. No blocking alert() dialogs appear
2. All interactive elements keyboard accessible
3. Focus states visible in light and dark mode
4. All feedback messages inline with proper ARIA
5. No horizontal scroll at 390px width
6. Touch targets ≥44x44px on mobile
7. Text contrast ≥4.5:1 in dark mode
8. Input borders visible in dark mode

---

## Next Steps After Testing

1. ✅ Run quick 5-minute test
2. ✅ Document any issues found
3. ✅ Fix critical issues
4. ✅ Re-test after fixes
5. ✅ Run full manual test suite (see QA_REPORT.md)
6. ✅ Test with real users if possible
7. ✅ Deploy to staging/production

**Estimated Time:** 5-10 minutes for quick test, 1-2 hours for full suite
