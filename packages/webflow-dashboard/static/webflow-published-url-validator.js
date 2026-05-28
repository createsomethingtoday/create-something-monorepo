(function () {
  const WORKER_URL = "https://gsap-validation-worker.createsomething.workers.dev/crawlWebsite";
  const START_TIMEOUT_MS = 45000;
  const POLL_TIMEOUT_MS = 30000;
  const POLL_INTERVAL_MS = 5000;
  const MAX_RETRIES = 3;
  const POLL_RETRIES = 3;
  const RETRYABLE_STATUS = new Set([502, 503, 504]);
  const VALIDATION_OPTIONS = {
    maxDepth: 10,
    maxPages: 1000,
    async: true
  };
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
    if (typeof html === "string") {
      el.innerHTML = html;
    }
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

  function sleep(ms) {
    return new Promise(function (resolve) {
      setTimeout(resolve, ms);
    });
  }

  function normalizePublishedUrl(rawValue) {
    if (typeof rawValue !== "string" || rawValue.trim() === "") {
      throw new Error("Published URL is required.");
    }

    const trimmed = rawValue.trim();
    const matched = trimmed.match(/https:\/\/[a-z0-9-]+\.webflow\.io(?:\/[^\s]*)?/i);
    const candidate = matched ? matched[0] : trimmed;
    let parsed;

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
        error: error.message || "Enter a valid published Webflow URL."
      };
    }
  }

  function summarizeWorkerResponse(data) {
    if (!data || typeof data !== "object" || data.success !== true) {
      throw new Error((data && data.error) || "Validation service returned an invalid response.");
    }

    const pageResults = Array.isArray(data.pageResults) ? data.pageResults : [];
    const siteResults = data.siteResults && typeof data.siteResults === "object" ? data.siteResults : {};
    const analyzedCount = typeof siteResults.analyzedCount === "number"
      ? siteResults.analyzedCount
      : pageResults.filter(function (page) { return page.success !== false; }).length;
    const passedCount = typeof siteResults.passedCount === "number"
      ? siteResults.passedCount
      : pageResults.filter(function (page) { return page.success !== false && page.passed; }).length;
    const requestFailureCount = typeof siteResults.requestFailureCount === "number"
      ? siteResults.requestFailureCount
      : pageResults.filter(function (page) { return page.success === false; }).length;
    const validationFailureCount = typeof siteResults.validationFailureCount === "number"
      ? siteResults.validationFailureCount
      : pageResults.filter(function (page) { return page.success !== false && !page.passed; }).length;
    const failedCount = typeof siteResults.failedCount === "number"
      ? siteResults.failedCount
      : requestFailureCount + validationFailureCount;
    const pageCount = typeof siteResults.pageCount === "number"
      ? siteResults.pageCount
      : pageResults.length;
    const incomplete = siteResults.incomplete === true || (data.crawlStats && (data.crawlStats.partial === true || data.crawlStats.truncatedByPageLimit === true));
    const passed = data.passed === true && failedCount === 0 && analyzedCount === pageCount && pageCount > 0 && !incomplete;

    return {
      raw: data,
      pageResults: pageResults,
      siteResults: {
        pageCount: pageCount,
        analyzedCount: analyzedCount,
        passedCount: passedCount,
        failedCount: failedCount,
        requestFailureCount: requestFailureCount,
        validationFailureCount: validationFailureCount,
        incomplete: incomplete
      },
      crawlStats: data.crawlStats || {},
      passed: passed
    };
  }

  function buildFailureMessage(summary) {
    if (summary.siteResults.incomplete) {
      return "Validation did not finish crawling the entire project.<br><br><strong>Details:</strong> " + (summary.raw.error || "The crawler hit a limit or timed out before all pages were validated.");
    }

    const firstRequestFailure = summary.pageResults.find(function (page) {
      return page.success === false;
    });
    if (firstRequestFailure) {
      const failedUrl = firstRequestFailure.url || "";
      const failedUrlHtml = failedUrl
        ? '<br><strong>Broken URL:</strong> <a href="' + failedUrl + '" target="_blank" rel="noopener noreferrer">' + failedUrl + "</a>"
        : "";

      if (firstRequestFailure.error === "HTTP error: 404") {
        if (summary.raw && summary.raw.url && failedUrl === summary.raw.url) {
          return "The published template URL returned 404 and could not be validated." + failedUrlHtml + "<br><br><strong>What to fix:</strong> Confirm the published site is live at this exact URL and republish if needed.";
        }

        return "Validation found a broken page link in the template." + failedUrlHtml + "<br><br><strong>What to fix:</strong> Update or remove the broken internal link, then republish the template and validate again.";
      }

      return "Validation could not complete for all pages.<br><br><strong>First failure:</strong> " + (firstRequestFailure.error || "A page could not be analyzed.");
    }

    const firstValidationFailure = summary.pageResults.find(function (page) {
      return page.success !== false && !page.passed;
    });
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

  async function postWorker(payload, timeoutMs) {
    const response = await fetchWithTimeout(
      WORKER_URL,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      },
      timeoutMs
    );

    const data = await response.json().catch(function () {
      return null;
    });

    if (!response.ok) {
      const error = new Error((data && data.error) || ("Worker HTTP " + response.status));
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  }

  async function startWorkflow(url) {
    let lastError = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
      try {
        return await postWorker(
          Object.assign({ url: url }, VALIDATION_OPTIONS),
          START_TIMEOUT_MS
        );
      } catch (error) {
        lastError = error;
        const retryable = typeof error.status === "number"
          ? RETRYABLE_STATUS.has(error.status)
          : error instanceof TypeError;
        if (!retryable || attempt === MAX_RETRIES || (error && error.name === "AbortError")) {
          throw error;
        }
      }
    }

    throw lastError || new Error("Validation could not be started.");
  }

  async function pollWorkflow(url, instanceId, onProgress) {
    const startedAt = Date.now();

    while (true) {
      if (Date.now() - startedAt > 10 * 60 * 1000) {
        const timeoutError = new Error("Validation timed out while waiting for the full project crawl to finish.");
        timeoutError.code = "poll-timeout";
        throw timeoutError;
      }

      let data = null;
      let lastError = null;
      for (let attempt = 1; attempt <= POLL_RETRIES; attempt += 1) {
        try {
          data = await postWorker({ url: url, instanceId: instanceId }, POLL_TIMEOUT_MS);
          lastError = null;
          break;
        } catch (error) {
          lastError = error;
          const retryable = error && (error.name === "AbortError" || error instanceof TypeError || RETRYABLE_STATUS.has(error.status));
          if (!retryable || attempt === POLL_RETRIES) {
            throw error;
          }
          if (typeof onProgress === "function") {
            onProgress("running", "Still waiting for the full-project validation. Retrying status check...");
          }
          await sleep(1000 * attempt);
        }
      }

      if (lastError) {
        throw lastError;
      }

      if (data && data.success === true && Array.isArray(data.pageResults)) {
        return data;
      }

      const status = data && data.status ? data.status : "running";
      if (status === "complete" && data && data.output) {
        return data.output;
      }
      if (status === "errored" || status === "error" || status === "terminated") {
        throw new Error((data && data.error) || "Validation workflow failed.");
      }

      if (typeof onProgress === "function") {
        onProgress(status);
      }

      await sleep(POLL_INTERVAL_MS);
    }
  }

  async function runWorkerValidation(url, onProgress) {
    const startData = await startWorkflow(url);
    if (!startData || typeof startData.instanceId !== "string") {
      throw new Error("Validation service did not return a workflow instance.");
    }

    if (typeof onProgress === "function") {
      onProgress(startData.status || "queued");
    }

    return pollWorkflow(url, startData.instanceId, onProgress);
  }

  function renderSuccess(state, summary, verifiedUrl) {
    resetMessages(state);
    let message = "GSAP check passed. All " + summary.siteResults.passedCount + " pages in the project passed the published-site GSAP and custom-code crawl.";
    const gsapDetected = summary.pageResults.some(function (page) {
      return page.summary && page.summary.validGsapCount > 0;
    });

    if (gsapDetected) {
      message += " GSAP animations were detected and validated.";
    }

    message += " Complete the Webflow Way Validator app pass before submitting.";

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
    } else if (error && (error.name === "AbortError" || error.code === "poll-timeout")) {
      message = "Validation timed out before the full project could be checked. Please try again.";
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

    const validated = validateFormat(state.input.value);
    if (validated.error) {
      clearValidationState(state);
      show(state.error, validated.error);
      return;
    }

    if (state.input.value !== validated.value) {
      state.input.value = validated.value;
    }

    resetMessages(state);
    show(state.progress, "Starting full-project validation...");

    try {
      const workerData = await runWorkerValidation(validated.value, function (status, customMessage) {
        if (customMessage) {
          show(state.progress, customMessage);
          return;
        }
        if (status === "queued") {
          show(state.progress, "Validation queued. Preparing the full-project crawl...");
          return;
        }
        show(state.progress, "Validating the full project. This can take a few minutes for larger sites...");
      });
      const summary = summarizeWorkerResponse(workerData);
      if (!summary.passed) {
        renderError(state, null, summary);
        return;
      }
      renderSuccess(state, summary, validated.value);
    } catch (error) {
      renderError(state, error, null);
    } finally {
      hide(state.progress);
    }
  }

  function bindEvents() {
    const state = getState();
    if (!state.input || !state.button || !state.verified || state.button.getAttribute("data-validator-bound") === "true") {
      return;
    }

    state.button.setAttribute("data-validator-bound", "true");

    state.input.addEventListener("input", function () {
      if (state.input.value !== state.verified.getAttribute("data-last-verified-url")) {
        clearValidationState(state);
      }
    });

    state.input.addEventListener("focusout", function () {
      const validated = validateFormat(state.input.value);
      if (validated.error) {
        clearValidationState(state);
        show(state.error, validated.error);
        return;
      }

      if (state.input.value) {
        state.input.value = validated.value;
        resetMessages(state);
        show(state.progress, "Valid URL format. Click 'Validate Template' to run the GSAP and custom-code crawl.");
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
