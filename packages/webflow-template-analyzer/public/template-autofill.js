(function () {
  "use strict";

  var DEFAULT_CLOUDFLARE_API_BASE = "https://webflow-template-analyzer.createsomething.workers.dev";
  var MAX_CATEGORIES = 2;
  var MAX_STYLES = 2;
  var VALIDATION_WAIT_TIMEOUT_MS = 11 * 60 * 1000;
  var VALIDATION_POLL_INTERVAL_MS = 400;
  var MANAGED_ATTR = "data-template-autofill";
  var MANAGED_VALUE_ATTR = "data-template-autofill-value";

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

  var ANALYZE_STEPS = [
    [0, "Loading the published template…"],
    [5000, "Reviewing the page structure…"],
    [15000, "Capturing screenshots…"],
    [30000, "Generating submission details…"],
    [55000, "Applying the results to the form…"]
  ];

  var watchToken = 0;
  var mutationDepth = 0;

  function getEl(id) {
    return document.getElementById(id);
  }

  function sleep(ms) {
    return new Promise(function (resolve) {
      setTimeout(resolve, ms);
    });
  }

  function dispatchAutofillEvent(name, detail) {
    window.dispatchEvent(
      new CustomEvent("template-analyzer:" + name, {
        detail: detail || {}
      })
    );
  }

  function findCurrentScript() {
    if (document.currentScript) {
      return document.currentScript;
    }

    var scripts = document.getElementsByTagName("script");
    for (var i = scripts.length - 1; i >= 0; i -= 1) {
      var src = scripts[i].getAttribute("src") || "";
      if (src.indexOf("template-autofill") !== -1) {
        return scripts[i];
      }
    }

    return null;
  }

  function isLocalOrigin(origin) {
    return (
      origin === "http://localhost" ||
      origin.indexOf("http://localhost:") === 0 ||
      origin === "http://127.0.0.1" ||
      origin.indexOf("http://127.0.0.1:") === 0
    );
  }

  function resolveApiBase() {
    if (typeof window.TEMPLATE_ANALYZER_API_BASE === "string" && window.TEMPLATE_ANALYZER_API_BASE.trim()) {
      return window.TEMPLATE_ANALYZER_API_BASE.trim().replace(/\/$/, "");
    }

    var currentScript = findCurrentScript();
    var attributeBase = currentScript && currentScript.getAttribute("data-api-base");
    if (attributeBase && attributeBase.trim()) {
      return attributeBase.trim().replace(/\/$/, "");
    }

    if (currentScript) {
      try {
        var scriptOrigin = new URL(currentScript.src, window.location.href).origin;
        if (isLocalOrigin(scriptOrigin)) {
          return scriptOrigin;
        }
      } catch (error) {
        // Fall through to the default Cloudflare endpoint.
      }
    }

    if (isLocalOrigin(window.location.origin)) {
      return window.location.origin;
    }

    return DEFAULT_CLOUDFLARE_API_BASE;
  }

  var API_BASE = resolveApiBase();

  function isVisible(el) {
    if (!el) return false;
    return window.getComputedStyle(el).display !== "none";
  }

  function getValidatorState() {
    return {
      input: getEl("Published-URL"),
      button: getEl("Check-URL"),
      success: getEl("Published-Check-Success"),
      progress: getEl("Published-Check-Progress"),
      error: getEl("Published-Check-Error"),
      verified: getEl("Published-URL-Check-Success")
    };
  }

  function ensureStatusNodes() {
    var existing = getEl("Template-Autofill-Status");
    if (existing) {
      return {
        container: existing,
        progress: getEl("Template-Autofill-Progress"),
        success: getEl("Template-Autofill-Success"),
        error: getEl("Template-Autofill-Error")
      };
    }

    var validator = getValidatorState();
    var agencyDetails = getEl("Agency-details");
    if (!agencyDetails) return null;

    var container = document.createElement("div");
    container.id = "Template-Autofill-Status";
    container.innerHTML =
      '<div id="Template-Autofill-Progress" class="cc-progress-text" style="display:none;"></div>' +
      '<div id="Template-Autofill-Success" class="cc-success-text" style="display:none;"></div>' +
      '<div id="Template-Autofill-Error" class="cc-error_text" style="display:none;"></div>';

    if (validator.progress && validator.progress.parentNode) {
      validator.progress.parentNode.insertBefore(container, validator.progress.nextSibling);
    } else {
      agencyDetails.appendChild(container);
    }

    return {
      container: container,
      progress: getEl("Template-Autofill-Progress"),
      success: getEl("Template-Autofill-Success"),
      error: getEl("Template-Autofill-Error")
    };
  }

  function hide(el) {
    if (!el) return;
    el.style.display = "none";
  }

  function show(el, text) {
    if (!el) return;
    el.textContent = text;
    el.style.display = "block";
  }

  function clearStatus() {
    var nodes = ensureStatusNodes();
    if (!nodes) return;
    hide(nodes.progress);
    hide(nodes.success);
    hide(nodes.error);
  }

  function showProgress(text) {
    var nodes = ensureStatusNodes();
    if (!nodes) return;
    hide(nodes.success);
    hide(nodes.error);
    show(nodes.progress, text);
  }

  function showSuccess(text) {
    var nodes = ensureStatusNodes();
    if (!nodes) return;
    hide(nodes.progress);
    hide(nodes.error);
    show(nodes.success, text);
  }

  function showError(text) {
    var nodes = ensureStatusNodes();
    if (!nodes) return;
    hide(nodes.progress);
    hide(nodes.success);
    show(nodes.error, text);
  }

  function normalizePublishedUrl(rawValue) {
    if (typeof rawValue !== "string" || rawValue.trim() === "") {
      throw new Error("Published URL is required.");
    }

    var trimmed = rawValue.trim();
    var matched = trimmed.match(/https:\/\/[a-z0-9-]+\.webflow\.io(?:\/[^\s]*)?/i);
    var candidate = matched ? matched[0] : trimmed;
    var parsed;

    try {
      parsed = new URL(candidate);
    } catch (error) {
      throw new Error("Enter a valid published Webflow URL.");
    }

    if (parsed.protocol !== "https:") {
      throw new Error("URL must start with 'https://'.");
    }

    if (!parsed.hostname || !parsed.hostname.toLowerCase().endsWith(".webflow.io")) {
      throw new Error("URL must use a '.webflow.io' hostname.");
    }

    parsed.hash = "";
    if (!parsed.pathname) {
      parsed.pathname = "/";
    }

    return parsed.toString();
  }

  function validateFormat(rawValue) {
    try {
      return {
        value: normalizePublishedUrl(rawValue),
        error: null
      };
    } catch (error) {
      return {
        value: null,
        error: error && error.message ? error.message : "Enter a valid published Webflow URL."
      };
    }
  }

  function urlsMatch(left, right) {
    if (!left || !right) return false;

    try {
      return normalizePublishedUrl(left) === normalizePublishedUrl(right);
    } catch (error) {
      return left === right;
    }
  }

  function isVerifiedForUrl(expectedUrl) {
    var validator = getValidatorState();
    if (!validator.verified || !validator.verified.checked) {
      return false;
    }

    var verifiedUrl = validator.verified.getAttribute("data-last-verified-url");
    if (!verifiedUrl) {
      return true;
    }

    return urlsMatch(verifiedUrl, expectedUrl);
  }

  function withMutation(fn) {
    mutationDepth += 1;
    try {
      return fn();
    } finally {
      mutationDepth -= 1;
    }
  }

  function getManagedFlag(el) {
    return el && el.getAttribute(MANAGED_ATTR) === "true";
  }

  function setManagedFlag(el, managed) {
    if (!el) return;
    if (managed) {
      el.setAttribute(MANAGED_ATTR, "true");
    } else {
      el.removeAttribute(MANAGED_ATTR);
    }
  }

  function syncVisual(inputEl) {
    if (!inputEl) return;
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

  function syncRadioGroupVisual(inputEl) {
    if (!inputEl || inputEl.type !== "radio" || !inputEl.name) return;

    var allInGroup = document.querySelectorAll('input[name="' + inputEl.name.replace(/"/g, '\\"') + '"]');
    allInGroup.forEach(function (radio) {
      var label = radio.closest("label");
      if (!label) return;
      var vizDiv = label.querySelector(".w-form-formradioinput");
      if (vizDiv) {
        vizDiv.classList.remove("w--redirected-checked");
      }
    });

    syncVisual(inputEl);
  }

  function findChoiceLabel(inputEl) {
    if (!inputEl) return null;
    return inputEl.closest("label");
  }

  function clickChoice(inputEl) {
    var label = findChoiceLabel(inputEl);
    if (!label) return false;

    label.click();
    return true;
  }

  function dispatchInputEvents(el) {
    if (!el) return;
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function shouldFillText(el) {
    if (!el) return false;
    var current = (el.value || "").trim();
    var previous = el.getAttribute(MANAGED_VALUE_ATTR) || "";
    return current === "" || current === previous;
  }

  function fillText(id, value, options) {
    var el = getEl(id);
    if (!el || !value) return false;

    var onlyIfSafe = !options || options.onlyIfSafe !== false;
    if (onlyIfSafe && !shouldFillText(el)) {
      return false;
    }

    withMutation(function () {
      el.value = value;
      el.setAttribute(MANAGED_VALUE_ATTR, value);
      dispatchInputEvents(el);
    });

    return true;
  }

  function clearManagedGroupByName(name) {
    if (!name) return;
    var radios = document.querySelectorAll('input[name="' + name.replace(/"/g, '\\"') + '"]');
    radios.forEach(function (radio) {
      if (getManagedFlag(radio)) {
        withMutation(function () {
          radio.checked = false;
          setManagedFlag(radio, false);
          syncVisual(radio);
          dispatchInputEvents(radio);
        });
      }
    });
  }

  function setCheckedState(inputEl, checked, managed) {
    if (!inputEl) return;

    withMutation(function () {
      var changedViaClick = false;
      if (inputEl.checked !== checked && !inputEl.disabled) {
        changedViaClick = clickChoice(inputEl);
      }

      if (inputEl.checked !== checked) {
        inputEl.checked = checked;
      }

      setManagedFlag(inputEl, managed && checked);

      if (inputEl.type === "radio") {
        if (checked) {
          syncRadioGroupVisual(inputEl);
        } else {
          syncVisual(inputEl);
        }
      } else {
        syncVisual(inputEl);
      }

      if (!changedViaClick) {
        dispatchInputEvents(inputEl);
      }
    });
  }

  function clearManagedIds(ids) {
    ids.forEach(function (id) {
      var el = getEl(id);
      if (el && getManagedFlag(el)) {
        setCheckedState(el, false, false);
      }
    });
  }

  function findCategoryCheckbox(categoryName) {
    var wrapper = getEl("Categories-Wrapper");
    if (!wrapper) return null;

    var inputs = wrapper.querySelectorAll('input[type="checkbox"]');
    for (var i = 0; i < inputs.length; i += 1) {
      if (inputs[i].name === "Category-" + categoryName) {
        return inputs[i];
      }
    }

    return null;
  }

  function clearManagedCategories() {
    var wrapper = getEl("Categories-Wrapper");
    if (!wrapper) return;

    var inputs = wrapper.querySelectorAll('input[type="checkbox"]');
    inputs.forEach(function (checkbox) {
      if (getManagedFlag(checkbox)) {
        setCheckedState(checkbox, false, false);
      }
    });
  }

  function countCheckedIds(ids) {
    return ids.reduce(function (count, id) {
      var el = getEl(id);
      return el && el.checked ? count + 1 : count;
    }, 0);
  }

  function countCheckedCategories() {
    var wrapper = getEl("Categories-Wrapper");
    if (!wrapper) return 0;
    return wrapper.querySelectorAll('input[type="checkbox"]:checked').length;
  }

  function countManualCheckedIds(ids) {
    return ids.reduce(function (count, id) {
      var el = getEl(id);
      return el && el.checked && !getManagedFlag(el) ? count + 1 : count;
    }, 0);
  }

  function countManualCheckedCategories() {
    var wrapper = getEl("Categories-Wrapper");
    if (!wrapper) return 0;

    var inputs = wrapper.querySelectorAll('input[type="checkbox"]');
    return Array.prototype.reduce.call(inputs, function (count, checkbox) {
      return checkbox.checked && !getManagedFlag(checkbox) ? count + 1 : count;
    }, 0);
  }

  function updateCounter(id, count, max, label) {
    var counter = getEl(id);
    if (!counter) return;
    counter.textContent = count + " of " + max + " " + label + " selected";
  }

  function syncManagedVisuals() {
    var managedInputs = document.querySelectorAll('input[' + MANAGED_ATTR + '="true"]');
    managedInputs.forEach(function (inputEl) {
      if (inputEl.type === "radio" && inputEl.checked) {
        syncRadioGroupVisual(inputEl);
        return;
      }

      syncVisual(inputEl);
    });
  }

  function fillLongDescription(value) {
    var didFill = fillText("Long-Description", value, { onlyIfSafe: true });
    if (!didFill) return false;

    var quillEditor = document.querySelector("#quillArea .ql-editor");
    if (quillEditor) {
      withMutation(function () {
        var safeHtml = "<p>" + String(value).replace(/\n+/g, "</p><p>") + "</p>";
        quillEditor.innerHTML = safeHtml;
        quillEditor.classList.remove("ql-blank");
        quillEditor.dispatchEvent(new Event("input", { bubbles: true }));
      });
    }

    return true;
  }

  // ─── Screenshot download links ──────────────────────────────────────────

  var SCREENSHOT_MAP = [
    { key: "primary",   inputId: "Thumbnail-Image",           label: "Primary thumbnail" },
    { key: "secondary", inputId: "Thumbnail-Image-Secondary", label: "Secondary thumbnail" },
    { key: "gallery-0", inputId: "Gallery-Image-1",           label: "Gallery 1" },
    { key: "gallery-1", inputId: "Gallery-Image-2",           label: "Gallery 2" },
    { key: "gallery-2", inputId: "Gallery-Image-3",           label: "Gallery 3" },
    { key: "gallery-3", inputId: "Gallery-Image-4",           label: "Gallery 4" },
    { key: "gallery-4", inputId: "Gallery-Image-5",           label: "Gallery 5" }
  ];

  function extractFilename(path) {
    return String(path).split("/").pop();
  }

  function addDownloadLink(inputId, url, filename, label) {
    var fileInput = getEl(inputId);
    if (!fileInput) return;

    var uploadWidget = fileInput.closest(".w-file-upload");
    if (!uploadWidget) return;

    // Remove any existing autofill download link
    var existing = uploadWidget.parentNode.querySelector('.autofill-download[data-for="' + inputId + '"]');
    if (existing) existing.remove();

    var link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.className = "autofill-download";
    link.setAttribute("data-for", inputId);
    link.style.cssText =
      "display:inline-flex;align-items:center;gap:4px;" +
      "font-size:12px;color:#146ef5;text-decoration:none;" +
      "margin-top:4px;cursor:pointer;";
    link.innerHTML =
      '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>' +
      '</svg>' + label + ' (' + filename + ')';

    uploadWidget.parentNode.insertBefore(link, uploadWidget.nextSibling);
  }

  function addDownloadAllLink(screenshots) {
    var container = getEl("uploadContainer");
    if (!container) return;

    // Remove existing
    var existing = getEl("autofill-download-all");
    if (existing) existing.remove();

    var wrapper = document.createElement("div");
    wrapper.id = "autofill-download-all";
    wrapper.style.cssText = "margin-bottom:12px;padding:10px 12px;background:#f0f7ff;border:1px solid #c8ddf5;border-radius:6px;";
    wrapper.innerHTML =
      '<div style="font-size:12px;font-weight:600;color:#374151;margin-bottom:6px;">Generated screenshots ready</div>' +
      '<div style="font-size:11px;color:#6b7280;margin-bottom:8px;">Download each file below, then drag it into the matching upload field.</div>' +
      '<a id="autofill-zip-link" href="' + API_BASE + '/screenshots/download" download="template-screenshots.zip" ' +
      'style="display:inline-flex;align-items:center;gap:5px;font-size:12px;font-weight:600;color:#146ef5;text-decoration:none;">' +
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>' +
      '</svg>Download all screenshots (ZIP)</a>';

    container.insertBefore(wrapper, container.firstChild);
  }

  function fillScreenshots(screenshots) {
    if (!screenshots || typeof screenshots !== "object") return;

    addDownloadAllLink(screenshots);

    SCREENSHOT_MAP.forEach(function (entry) {
      var path;
      if (entry.key === "primary") {
        path = screenshots.primary;
      } else if (entry.key === "secondary") {
        path = screenshots.secondary;
      } else if (entry.key.indexOf("gallery-") === 0) {
        var idx = parseInt(entry.key.split("-")[1], 10);
        path = Array.isArray(screenshots.gallery) ? screenshots.gallery[idx] : null;
      }

      if (!path) return;

      var filename = extractFilename(path);
      var url = API_BASE + "/screenshots/" + filename;
      addDownloadLink(entry.inputId, url, filename, entry.label);
    });
  }

  // ─── Fill all form fields from API result ──────────────────────────────────

  function fillForm(result) {
    if (!result || typeof result !== "object") return;

    fillText("Template-Name", result.template_name || "", { onlyIfSafe: true });
    fillText("Short-Description", (result.short_description || "").substring(0, 250), { onlyIfSafe: true });
    fillLongDescription(result.long_description || "");

    clearManagedGroupByName("Free-or-Paid");
    setCheckedState(getEl(result.pricing === "Free" ? "Free" : "Paid"), true, true);

    clearManagedGroupByName("Static");
    setCheckedState(getEl(PAGE_TYPE_IDS[result.page_type] || "Multi"), true, true);

    clearManagedIds(["Type-CMS", "Type-Ecommerce"]);
    if (result.webflow_features_cms) {
      setCheckedState(getEl("Type-CMS"), true, true);
    }
    if (result.webflow_features_ecommerce) {
      setCheckedState(getEl("Type-Ecommerce"), true, true);
    }

    if (typeof window.updatePricingOptions === "function") {
      setTimeout(window.updatePricingOptions, 100);
    }

    var styleIds = Object.keys(STYLE_IDS).map(function (key) {
      return STYLE_IDS[key];
    });
    clearManagedIds(styleIds);
    var remainingStyleSlots = Math.max(0, MAX_STYLES - countManualCheckedIds(styleIds));
    var stylesToSet = Array.isArray(result.styles) ? result.styles.slice(0, remainingStyleSlots) : [];
    stylesToSet.forEach(function (name) {
      var id = STYLE_IDS[name];
      if (id) {
        setCheckedState(getEl(id), true, true);
      }
    });
    updateCounter("style-counter", countCheckedIds(styleIds), MAX_STYLES, "styles");

    clearManagedIds(Object.keys(FEATURE_IDS).map(function (key) {
      return FEATURE_IDS[key];
    }));
    (Array.isArray(result.features) ? result.features : []).forEach(function (name) {
      var id = FEATURE_IDS[name];
      if (id) {
        setCheckedState(getEl(id), true, true);
      }
    });

    clearManagedCategories();
    var remainingCategorySlots = Math.max(0, MAX_CATEGORIES - countManualCheckedCategories());
    var categoriesToSet = Array.isArray(result.categories) ? result.categories.slice(0, remainingCategorySlots) : [];
    categoriesToSet.forEach(function (categoryName) {
      var checkbox = findCategoryCheckbox(categoryName);
      if (checkbox) {
        setCheckedState(checkbox, true, true);
      }
    });
    updateCounter("category-counter", countCheckedCategories(), MAX_CATEGORIES, "categories");

    syncManagedVisuals();
    setTimeout(syncManagedVisuals, 0);
    setTimeout(syncManagedVisuals, 80);

    // Screenshots (async, runs after form fields are set)
    if (result.screenshots) {
      fillScreenshots(result.screenshots);
    }
  }

  async function waitForValidationSuccess(token, expectedUrl) {
    if (isVerifiedForUrl(expectedUrl)) {
      return expectedUrl;
    }

    var startedAt = Date.now();
    while (Date.now() - startedAt < VALIDATION_WAIT_TIMEOUT_MS) {
      if (token !== watchToken) {
        return null;
      }

      var validator = getValidatorState();
      if (!validator.input) {
        return null;
      }

      if (isVerifiedForUrl(expectedUrl)) {
        return validator.verified.getAttribute("data-last-verified-url") || expectedUrl;
      }

      if (!isVisible(validator.progress) && isVisible(validator.error)) {
        clearStatus();
        return null;
      }

      var validated = validateFormat(validator.input.value);
      if (validated.value && !urlsMatch(validated.value, expectedUrl)) {
        clearStatus();
        return null;
      }

      await sleep(VALIDATION_POLL_INTERVAL_MS);
    }

    showError("Template validation took too long. Validate the URL again to retry autofill.");
    dispatchAutofillEvent("error", {
      url: expectedUrl,
      error: "validation-timeout"
    });
    return null;
  }

  async function runAutofill(url, token) {
    dispatchAutofillEvent("start", {
      url: url,
      apiBase: API_BASE
    });

    var stepIndex = 0;
    var startedAt = Date.now();
    showProgress(ANALYZE_STEPS[0][1]);

    var progressTimer = setInterval(function () {
      var elapsed = Date.now() - startedAt;
      while (stepIndex + 1 < ANALYZE_STEPS.length && elapsed >= ANALYZE_STEPS[stepIndex + 1][0]) {
        stepIndex += 1;
      }
      showProgress(ANALYZE_STEPS[stepIndex][1]);
    }, 500);

    try {
      var response = await fetch(API_BASE + "/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ url: url })
      });

      var payload = await response.json().catch(function () {
        return {};
      });

      if (token !== watchToken) {
        return;
      }

      if (!response.ok) {
        throw new Error(payload.detail || payload.error || ("Server error " + response.status));
      }

      fillForm(payload);
      showSuccess("Template details added to the form. Review them before submitting.");
      dispatchAutofillEvent("success", {
        url: url,
        apiBase: API_BASE,
        result: payload
      });
    } catch (error) {
      if (token !== watchToken) {
        return;
      }

      showError(error && error.message ? error.message : "Template analysis failed.");
      dispatchAutofillEvent("error", {
        url: url,
        apiBase: API_BASE,
        error: error && error.message ? error.message : "Template analysis failed."
      });
    } finally {
      clearInterval(progressTimer);
    }
  }

  async function handleValidateClick(event) {
    if (event) {
      event.preventDefault();
    }

    var validator = getValidatorState();
    if (!validator.input) {
      return;
    }

    var validated = validateFormat(validator.input.value);
    if (validated.error) {
      clearStatus();
      return;
    }

    var token = watchToken + 1;
    watchToken = token;

    showProgress("Waiting for template validation to finish…");
    dispatchAutofillEvent("pending", {
      url: validated.value,
      apiBase: API_BASE
    });

    var verifiedUrl = await waitForValidationSuccess(token, validated.value);
    if (!verifiedUrl || token !== watchToken) {
      return;
    }

    await runAutofill(verifiedUrl, token);
  }

  function bindManualOverrideTracking() {
    if (document.documentElement.getAttribute("data-template-autofill-tracking") === "true") {
      return;
    }

    document.documentElement.setAttribute("data-template-autofill-tracking", "true");

    document.addEventListener("change", function (event) {
      if (mutationDepth > 0) {
        return;
      }

      var target = event.target;
      if (!target || typeof target.getAttribute !== "function") {
        return;
      }

      if (target.matches && target.matches('input[type="checkbox"], input[type="radio"]')) {
        setManagedFlag(target, false);
      }
    });
  }

  function bindEvents() {
    var validator = getValidatorState();
    if (!validator.input || !validator.button) {
      return;
    }

    if (validator.button.getAttribute("data-template-autofill-bound") === "true") {
      return;
    }

    ensureStatusNodes();
    bindManualOverrideTracking();

    validator.button.setAttribute("data-template-autofill-bound", "true");

    validator.input.addEventListener("input", function () {
      watchToken += 1;
      clearStatus();
    });

    validator.button.addEventListener("click", function (event) {
      void handleValidateClick(event);
    });
  }

  window.TemplateAnalyzerAutofill = {
    apiBase: API_BASE,
    run: function () {
      return handleValidateClick();
    }
  };

  document.addEventListener("DOMContentLoaded", bindEvents);
  window.addEventListener("load", bindEvents);
})();
