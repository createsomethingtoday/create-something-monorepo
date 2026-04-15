(function () {
  "use strict";

  var API_BASE = "https://create-something-template-analyzer-api.onrender.com";
  var MAX_CATEGORIES = 2;
  var MAX_STYLES = 2;

  // ─── Form field ID mappings (match the Webflow submission form) ────────────

  var STYLE_IDS = {
    "Bold": "Styles-Bold",
    "Corporate": "Styles-Corporate",
    "Dark": "Styles-Dark",
    "Illustration": "Styles-Illustration",
    "Light": "Styles-Light",
    "Minimal": "Styles-Minimal",
    "Modern": "Styles-Modern",
    "Playful": "Styles-Playful",
    "Retro": "Styles-Retro"
  };

  var FEATURE_IDS = {
    "Responsive design": "Features-Responsive-Design",
    "Responsive navigation": "Features-Responsive-Navigation",
    "Responsive slider": "Features-Responsive-Slider",
    "Media lightbox": "Features-Media-Lightbox",
    "Background video": "Features-Background-Video",
    "3D transforms": "Features-3D-Transforms",
    "Interactions": "Features-Interactions",
    "Forms": "Features-Forms",
    "Symbols": "Features-Symbols",
    "CSS Grid": "Features-CSS-Grid",
    "Custom 404 page": "Features-Custom-404-Page",
    "Web fonts": "Features-Web-Fonts",
    "Retina ready": "Features-Retina-Ready",
    "CMS": "Content-Management-System",
    "Ecommerce": "Ecommerce"
  };

  var PAGE_TYPE_IDS = {
    "one_page": "One",
    "multi_page": "Multi",
    "multi_layout": "Multi-layout"
  };

  // ─── DOM helpers (Webflow custom controls) ─────────────────────────────────

  function getEl(id) {
    return document.getElementById(id);
  }

  function tryFill(id, value) {
    var el = getEl(id);
    if (!el || !value) return;
    el.value = value;
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }

  // Webflow renders custom checkboxes/radios as a hidden <input> + visible
  // sibling <div class="w-checkbox-input"> or <div class="w-form-formradioinput">.
  // We must toggle w--redirected-checked on that div for visual feedback.
  function syncVisual(inputEl) {
    var label = inputEl.closest("label");
    if (!label) return;
    var vizDiv = label.querySelector(".w-checkbox-input, .w-form-formradioinput");
    if (!vizDiv) return;
    if (inputEl.checked) {
      vizDiv.classList.add("w--redirected-checked");
    } else {
      vizDiv.classList.remove("w--redirected-checked");
    }
  }

  // For radio buttons: clear visual state on all siblings first
  function syncRadioGroupVisual(inputEl) {
    if (inputEl.type !== "radio" || !inputEl.name) return;
    var allInGroup = document.querySelectorAll('input[name="' + inputEl.name + '"]');
    allInGroup.forEach(function (radio) {
      var label = radio.closest("label");
      if (!label) return;
      var vizDiv = label.querySelector(".w-form-formradioinput");
      if (vizDiv) vizDiv.classList.remove("w--redirected-checked");
    });
    syncVisual(inputEl);
  }

  function wfCheck(id) {
    var el = getEl(id);
    if (!el) return;
    if (!el.checked) {
      el.checked = true;
      el.dispatchEvent(new Event("change", { bubbles: true }));
    }
    if (el.type === "radio") {
      syncRadioGroupVisual(el);
    } else {
      syncVisual(el);
    }
  }

  function wfUncheck(id) {
    var el = getEl(id);
    if (!el) return;
    if (el.checked) {
      el.checked = false;
      el.dispatchEvent(new Event("change", { bubbles: true }));
    }
    syncVisual(el);
  }

  // ─── Progress messages ─────────────────────────────────────────────────────

  var STEPS = [
    [0,     "Connecting to template\u2026"],
    [5000,  "Scrolling through sections\u2026"],
    [13000, "Taking screenshots\u2026"],
    [23000, "Generating details with Claude\u2026"],
    [52000, "Almost there\u2026"]
  ];

  // ─── Fill form fields from API result ──────────────────────────────────────

  function fillForm(result) {
    // Template name (only if empty)
    var nameEl = getEl("Template-Name");
    if (nameEl && !nameEl.value) {
      tryFill("Template-Name", result.template_name);
    }

    // Short description
    tryFill("Short-Description", (result.short_description || "").substring(0, 250));

    // Long description — Quill editor + hidden textarea
    var longDesc = result.long_description || "";
    tryFill("Long-Description", longDesc);
    var quillEditor = document.querySelector("#quillArea .ql-editor");
    if (quillEditor) {
      quillEditor.innerHTML = "<p>" + longDesc.replace(/\n/g, "</p><p>") + "</p>";
      quillEditor.classList.remove("ql-blank");
    }

    // Pricing (radio buttons)
    if (result.pricing === "Free") {
      wfCheck("Free");
    } else {
      wfCheck("Paid");
    }

    // Page type (radio buttons)
    var ptId = PAGE_TYPE_IDS[result.page_type] || "Multi";
    wfCheck(ptId);

    // CMS / Ecommerce (checkboxes)
    if (result.webflow_features_cms) wfCheck("Type-CMS");
    else wfUncheck("Type-CMS");
    if (result.webflow_features_ecommerce) wfCheck("Type-Ecommerce");
    else wfUncheck("Type-Ecommerce");

    // Trigger pricing recalculation if the form has that function
    if (typeof window.updatePricingOptions === "function") {
      setTimeout(window.updatePricingOptions, 100);
    }

    // Styles (max 2, with visual sync)
    Object.keys(STYLE_IDS).forEach(function (name) {
      wfUncheck(STYLE_IDS[name]);
    });
    var stylesToSet = (result.styles || []).slice(0, MAX_STYLES);
    stylesToSet.forEach(function (name) {
      if (STYLE_IDS[name]) wfCheck(STYLE_IDS[name]);
    });
    // Update style counter if present
    var styleCounter = getEl("style-counter");
    if (styleCounter) {
      styleCounter.textContent = stylesToSet.length + " of " + MAX_STYLES + " styles selected";
    }

    // Features (checkboxes with visual sync)
    (result.features || []).forEach(function (name) {
      if (FEATURE_IDS[name]) wfCheck(FEATURE_IDS[name]);
    });

    // Categories — check by name attribute "Category-{name}" in #Categories-Wrapper
    var catWrapper = getEl("Categories-Wrapper");
    if (catWrapper) {
      var catsToSet = (result.categories || []).slice(0, MAX_CATEGORIES);
      catsToSet.forEach(function (cat) {
        var checkbox = catWrapper.querySelector('input[name="Category-' + cat + '"]');
        if (checkbox && !checkbox.checked) {
          checkbox.checked = true;
          syncVisual(checkbox);
          checkbox.dispatchEvent(new Event("change", { bubbles: true }));
        }
      });
      // Update category counter if present
      var catCounter = getEl("category-counter");
      if (catCounter) {
        var checkedCount = catWrapper.querySelectorAll('input[type="checkbox"]:checked').length;
        catCounter.textContent = checkedCount + " of " + MAX_CATEGORIES + " categories selected";
      }
    }
  }

  // ─── Main flow ─────────────────────────────────────────────────────────────

  function createUI() {
    // Don't double-init
    if (getEl("autofill-btn")) return;

    // Insert right after the Agency-details div
    var agencyDetails = getEl("Agency-details");
    if (!agencyDetails) return;

    // Create the autofill UI block
    var wrapper = document.createElement("div");
    wrapper.id = "autofill-panel";
    wrapper.style.cssText = "margin-top:16px;padding:14px 16px;background:#f8f9fb;border:1px solid #e5e7eb;border-radius:8px;";

    wrapper.innerHTML =
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">' +
        '<span style="font-size:13px;font-weight:600;color:#374151;">AI Autofill</span>' +
        '<span id="autofill-status" style="font-size:11px;color:#6b7280;"></span>' +
      '</div>' +
      '<p style="font-size:11px;color:#6b7280;margin-bottom:10px;line-height:1.4;">' +
        'Generate template name, descriptions, categories, styles, and features from the published URL.' +
      '</p>' +
      '<button id="autofill-btn" type="button" style="' +
        'display:inline-flex;align-items:center;gap:6px;' +
        'padding:8px 16px;background:linear-gradient(135deg,#146EF5,#6B2EFF);color:#fff;' +
        'border:none;border-radius:6px;font:600 12px/1 system-ui,sans-serif;' +
        'cursor:pointer;transition:opacity .15s;">' +
        '\u2728 Generate submission details' +
      '</button>' +
      '<div id="autofill-error" style="display:none;font-size:11px;color:#dc2626;margin-top:8px;"></div>';

    // Insert after the Agency-details section
    agencyDetails.insertAdjacentElement("afterend", wrapper);

    getEl("autofill-btn").addEventListener("click", function (event) {
      event.preventDefault();
      void runAutofill();
    });
  }

  async function runAutofill() {
    var urlInput = getEl("Published-URL");
    var btn = getEl("autofill-btn");
    var statusEl = getEl("autofill-status");
    var errorEl = getEl("autofill-error");

    if (!urlInput || !btn) return;

    var url = urlInput.value.trim();
    if (!url || !url.startsWith("http")) {
      errorEl.textContent = "Enter the published template URL first.";
      errorEl.style.display = "block";
      return;
    }

    // Reset
    errorEl.style.display = "none";
    btn.disabled = true;
    btn.style.opacity = "0.5";
    var originalLabel = btn.innerHTML;
    btn.innerHTML = '<span style="display:inline-block;width:12px;height:12px;border:2px solid rgba(255,255,255,.3);border-top-color:#fff;border-radius:50%;animation:autofill-spin .7s linear infinite;"></span> Analyzing\u2026';

    // Add spinner keyframes if not already present
    if (!document.getElementById("autofill-spin-style")) {
      var style = document.createElement("style");
      style.id = "autofill-spin-style";
      style.textContent = "@keyframes autofill-spin{to{transform:rotate(360deg)}}";
      document.head.appendChild(style);
    }

    // Progress messages
    var stepIdx = 0;
    var start = Date.now();
    statusEl.textContent = STEPS[0][1];
    var timer = setInterval(function () {
      var t = Date.now() - start;
      while (stepIdx + 1 < STEPS.length && t >= STEPS[stepIdx + 1][0]) stepIdx++;
      statusEl.textContent = STEPS[stepIdx][1];
    }, 500);

    try {
      var res = await fetch(API_BASE + "/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url })
      });

      clearInterval(timer);

      if (!res.ok) {
        var errBody = await res.json().catch(function () { return {}; });
        throw new Error(errBody.detail || "Server error " + res.status);
      }

      var result = await res.json();
      fillForm(result);

      statusEl.textContent = "Done \u2014 fields filled.";
      btn.innerHTML = '\u2705 Done \u2014 re-generate';
      btn.disabled = false;
      btn.style.opacity = "1";

    } catch (e) {
      clearInterval(timer);
      statusEl.textContent = "";
      errorEl.textContent = e.message || "Analysis failed.";
      errorEl.style.display = "block";
      btn.innerHTML = originalLabel;
      btn.disabled = false;
      btn.style.opacity = "1";
    }
  }

  // ─── Init ──────────────────────────────────────────────────────────────────

  document.addEventListener("DOMContentLoaded", createUI);
  window.addEventListener("load", createUI);
})();
