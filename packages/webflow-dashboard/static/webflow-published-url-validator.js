(function () {
  const WORKER_URL = "https://gsap-validation-worker.createsomething.workers.dev/crawlWebsite";
  const REQUEST_TIMEOUT_MS = 30000;
  const MAX_RETRIES = 3;
  const RETRYABLE_STATUS = new Set([502, 503, 504]);
  const ids = {
    input: "Published-URL",
    button: "Check-URL",
    success: "Published-Check-Success",
    progress: "Published-Check-Progress",
    error: "Published-Check-Error",
    verified: "Published-URL-Check-Success",
    gsap: "Features-GSAP"
  };

  function getEl(id) {
    return document.getElementById(id);
  }

  function getState() {
    return {
      input: getEl(ids.input),
      button: getEl(ids.button),
      success: getEl(ids.success),
      progress: getEl(ids.progress),
      error: getEl(ids.error),
      verified: getEl(ids.verified),
      gsap: getEl(ids.gsap)
    };
  }

  function show(el, html) {
    if (!el) return;
    if (typeof html === "string") el.innerHTML = html;
    el.style.display = "block";
  }

  function hide(el) {
    if (!el) return;
    el.style.display = "none";
  }

  function resetMessages(state) {
    hide(state.success);
    hide(state.progress);
    hide(state.error);
  }

  function setGsapChecked(state, checked) {
    if (!state.gsap) return;
    state.gsap.checked = checked;
    state.gsap.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function clearValidationState(state) {
    if (state.verified) {
      state.verified.checked = false;
    }
    setGsapChecked(state, false);
    resetMessages(state);
  }

  function validateFormat(url) {
    if (!url.startsWith("https://")) {
      return "URL must start with 'https://'.";
    }
    if (!url.includes(".webflow.io")) {
      return "URL must contain '.webflow.io'.";
    }
    return null;
  }

  function summarizeWorkerResponse(data) {
    const pageResults = Array.isArray(data && data.pageResults) ? data.pageResults : [];
    const analyzedCount = data && data.siteResults && typeof data.siteResults.analyzedCount === "number"
      ? data.siteResults.analyzedCount
      : pageResults.filter((page) => page.success !== false).length;
    const passedCount = data && data.siteResults && typeof data.siteResults.passedCount === "number"
      ? data.siteResults.passedCount
      : pageResults.filter((page) => page.success !== false && page.passed).length;
    const requestFailureCount = data && data.siteResults && typeof data.siteResults.requestFailureCount === "number"
      ? data.siteResults.requestFailureCount
      : pageResults.filter((page) => page.success === false).length;
    const validationFailureCount = data && data.siteResults && typeof data.siteResults.validationFailureCount === "number"
      ? data.siteResults.validationFailureCount
      : pageResults.filter((page) => page.success !== false && !page.passed).length;
    const failedCount = data && data.siteResults && typeof data.siteResults.failedCount === "number"
      ? data.siteResults.failedCount
      : requestFailureCount + validationFailureCount;
    const pageCount = data && data.siteResults && typeof data.siteResults.pageCount === "number"
      ? data.siteResults.pageCount
      : pageResults.length;
    const passed = data && data.success === true && failedCount === 0 && analyzedCount === pageCount && pageCount > 0;

    return {
      pageResults: pageResults,
      siteResults: {
        pageCount: pageCount,
        analyzedCount: analyzedCount,
        passedCount: passedCount,
        failedCount: failedCount,
        requestFailureCount: requestFailureCount,
        validationFailureCount: validationFailureCount
      },
      passed: passed
    };
  }

  function buildFailureMessage(summary) {
    const firstRequestFailure = summary.pageResults.find((page) => page.success === false);
    if (firstRequestFailure) {
      return "Validation could not complete for all pages.<br><br><strong>First failure:</strong> " + (firstRequestFailure.error || "A page could not be analyzed.");
    }

    const firstValidationFailure = summary.pageResults.find((page) => page.success !== false && !page.passed);
    if (firstValidationFailure) {
      const issue = firstValidationFailure.details && Array.isArray(firstValidationFailure.details.flaggedCode)
        ? firstValidationFailure.details.flaggedCode[0]
        : null;
      return "Validation failed on " + summary.siteResults.failedCount + " out of " + summary.siteResults.pageCount + " pages.<br><br><strong>First issue:</strong> " + (issue && issue.message ? issue.message : "Custom code issues were found.");
    }

    return "Validation could not be completed because the response from the validation service was incomplete.";
  }

  async function fetchWithTimeout(url, options, timeoutMs) {
    const controller = new AbortController();
    const timeoutId = setTimeout(function () {
      controller.abort();
    }, timeoutMs);

    try {
      return await fetch(url, Object.assign({}, options, { signal: controller.signal }));
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async function callWorker(url) {
    let lastError = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
      try {
        const response = await fetchWithTimeout(
          WORKER_URL,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: url, maxDepth: 1, maxPages: 50 })
          },
          REQUEST_TIMEOUT_MS
        );

        if (!response.ok) {
          const workerError = new Error("Worker HTTP " + response.status);
          workerError.status = response.status;
          throw workerError;
        }

        const data = await response.json();
        if (!data || typeof data !== "object") {
          throw new Error("Worker returned a malformed response.");
        }

        return data;
      } catch (error) {
        lastError = error;
        const status = error && typeof error === "object" && "status" in error ? error.status : null;
        const retryable = status !== null ? RETRYABLE_STATUS.has(status) : error instanceof TypeError;
        if (!retryable || attempt === MAX_RETRIES || (error && error.name === "AbortError")) {
          throw error;
        }
      }
    }

    throw lastError || new Error("Validation failed.");
  }

  function renderSuccess(state, summary, verifiedUrl) {
    resetMessages(state);
    let message = "Success! All " + summary.siteResults.passedCount + " pages meet our requirements.";
    const gsapDetected = summary.pageResults.some(function (page) {
      return page.summary && page.summary.validGsapCount > 0;
    });

    if (gsapDetected) {
      message += " GSAP animations were detected and validated.";
    }

    show(state.success, message);
    if (state.verified) {
      state.verified.checked = true;
      state.verified.setAttribute("data-last-verified-url", verifiedUrl);
    }
    setGsapChecked(state, gsapDetected);
  }

  function renderError(state, error, summary) {
    resetMessages(state);
    let message;

    if (summary) {
      message = buildFailureMessage(summary);
    } else if (error && error.name === "AbortError") {
      message = "Validation timed out. Please try again.";
    } else if (error && typeof error.status === "number" && RETRYABLE_STATUS.has(error.status)) {
      message = "Validation service is temporarily busy. Please try again in a moment.";
    } else if (error instanceof TypeError) {
      message = "We could not reach the validation service. Please check your connection and try again.";
    } else {
      message = error && error.message ? String(error.message) : "Validation could not be completed. Please try again.";
    }

    show(state.error, message);
    if (state.verified) {
      state.verified.checked = false;
    }
    setGsapChecked(state, false);
  }

  async function runValidation() {
    const state = getState();
    if (!state.input) return;

    const url = state.input.value.trim();
    const formatError = validateFormat(url);
    if (formatError) {
      clearValidationState(state);
      show(state.error, formatError);
      return;
    }

    resetMessages(state);
    show(state.progress, "Checking site... This might take a moment as we analyze multiple pages.");

    try {
      const workerData = await callWorker(url);
      const summary = summarizeWorkerResponse(workerData);
      if (!summary.passed) {
        renderError(state, null, summary);
        return;
      }
      renderSuccess(state, summary, url);
    } catch (error) {
      renderError(state, error, null);
    } finally {
      hide(state.progress);
    }
  }

  function bindEvents() {
    const state = getState();
    if (!state.input || !state.button || !state.verified) return;

    state.input.addEventListener("input", function () {
      if (state.input.value !== state.verified.getAttribute("data-last-verified-url")) {
        clearValidationState(state);
      }
    });

    state.input.addEventListener("focusout", function () {
      const formatError = validateFormat(state.input.value.trim());
      if (formatError) {
        clearValidationState(state);
        show(state.error, formatError);
      }
    });

    state.button.addEventListener("click", function (event) {
      event.preventDefault();
      void runValidation();
    });
  }

  document.addEventListener("DOMContentLoaded", bindEvents);
  window.addEventListener("load", bindEvents);
})();
