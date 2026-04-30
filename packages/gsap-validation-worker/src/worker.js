var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});

// cloudflare-worker/lib/shared-validator.js
function validateGsapUsage(html, pageUrl, customPatterns = []) {
  const defaultPatterns = [
    // Core GSAP object and method access
    /gsap\./g,
    // gsap object access
    /GSAP\./g,
    // GSAP uppercase
    /gsap\s*\[\s*['"`][^'"`]*['"`]\s*\]/g,
    // gsap["method"] bracket notation
    // Core GSAP animation methods
    /gsap\.to\s*\(/g,
    // gsap.to() animations
    /gsap\.from\s*\(/g,
    // gsap.from() animations
    /gsap\.fromTo\s*\(/g,
    // gsap.fromTo() animations
    /gsap\.set\s*\(/g,
    // gsap.set() method
    /gsap\.timeline\s*\(/g,
    // gsap.timeline() creation
    /gsap\.registerPlugin\s*\(/g,
    // gsap.registerPlugin()
    /gsap\.getProperty\s*\(/g,
    // gsap.getProperty()
    /gsap\.setProperty\s*\(/g,
    // gsap.setProperty()
    /gsap\.quickSetter\s*\(/g,
    // gsap.quickSetter()
    /gsap\.quickTo\s*\(/g,
    // gsap.quickTo()
    /gsap\.getById\s*\(/g,
    // gsap.getById()
    /gsap\.killTweensOf\s*\(/g,
    // gsap.killTweensOf()
    /gsap\.getTweensOf\s*\(/g,
    // gsap.getTweensOf()
    // Legacy TweenMax/TweenLite patterns
    /TweenMax\./g,
    // Legacy TweenMax
    /TweenLite\./g,
    // Legacy TweenLite
    /TimelineMax\./g,
    // Legacy TimelineMax
    /TimelineLite\./g,
    // Legacy TimelineLite
    // GSAP plugins
    /ScrollTrigger/g,
    // ScrollTrigger plugin
    /SplitText/g,
    // SplitText plugin
    /Draggable/g,
    // Draggable plugin
    /DrawSVGPlugin/g,
    // DrawSVG plugin
    /MorphSVGPlugin/g,
    // MorphSVG plugin
    /TextPlugin/g,
    // Text plugin
    /ScrambleTextPlugin/g,
    // ScrambleText plugin
    /MotionPathPlugin/g,
    // MotionPath plugin
    /ScrollToPlugin/g,
    // ScrollTo plugin
    /CustomEase/g,
    // CustomEase
    /CustomWiggle/g,
    // CustomWiggle
    /CustomBounce/g,
    // CustomBounce
    /SlowMo/g,
    // SlowMo ease
    /RoughEase/g,
    // RoughEase
    /ExpoScaleEase/g,
    // ExpoScaleEase
    /Observer/g,
    // Observer plugin
    /Flip/g,
    // Flip plugin
    // GSAP-specific easing patterns
    /Power[0-4]\.ease/g,
    // Power eases
    /Back\.ease/g,
    // Back eases
    /Elastic\.ease/g,
    // Elastic eases
    /Bounce\.ease/g,
    // Bounce eases
    /Circ\.ease/g,
    // Circular eases
    /Expo\.ease/g,
    // Exponential eases
    /Sine\.ease/g,
    // Sine eases
    // ScrollTrigger specific patterns
    /ScrollTrigger\.create/g,
    // ScrollTrigger.create()
    /ScrollTrigger\.refresh/g,
    // ScrollTrigger.refresh()
    /ScrollTrigger\.update/g,
    // ScrollTrigger.update()
    /ScrollTrigger\.kill/g,
    // ScrollTrigger.kill()
    /ScrollTrigger\.addEventListener/g,
    // ScrollTrigger events
    /ScrollTrigger\.batch/g,
    // ScrollTrigger.batch()
    /ScrollTrigger\.matchMedia/g,
    // ScrollTrigger.matchMedia()
    /scrollTrigger\s*:/g,
    // scrollTrigger property
    // GSAP-specific properties and callbacks
    /stagger\s*:/g,
    // GSAP-specific stagger property
    /autoAlpha\s*:/g,
    // GSAP-specific autoAlpha property
    /transformOrigin\s*:/g,
    // transformOrigin (commonly used with GSAP)
    // Timeline-specific patterns (when used with GSAP context)
    /timeline\s*\(/g,
    // timeline creation
    /Timeline\s*\(/g,
    // Timeline constructor
    // SplitText plugin specific patterns
    /type\s*:\s*["'](?:words|chars|lines)["']/g,
    // SplitText type options
    /mask\s*:\s*["'](?:words|chars|lines)["']/g,
    // SplitText mask options
    /wordsClass\s*:/g,
    // SplitText wordsClass
    /charsClass\s*:/g,
    // SplitText charsClass
    /linesClass\s*:/g,
    // SplitText linesClass
    /autoSplit\s*:/g,
    // SplitText autoSplit option
    // Draggable plugin specific patterns
    /type\s*:\s*["'][xy,\s]*["']/g,
    // Draggable type (x,y movement)
    /edgeResistance\s*:/g,
    // Draggable edge resistance
    /inertia\s*:/g,
    // Draggable inertia
    /bounds\s*:/g,
    // Draggable bounds
    /onDrag\s*[\(\)]*\s*\{/g,
    // Draggable onDrag callback
    /onThrowUpdate\s*[\(\)]*\s*\{/g,
    // Draggable onThrowUpdate callback
    // GSAP animation properties commonly used
    /duration\s*:/g,
    // Animation duration
    /ease\s*:\s*["'][^"']*["']/g,
    // Ease patterns
    /opacity\s*:/g,
    // Opacity animations
    /rotateZ\s*:/g,
    // Z-axis rotation
    /y\s*:\s*["'][^"']*["']/g,
    // Y-axis movement
    /x\s*:\s*["'][^"']*["']/g,
    // X-axis movement
    /trigger\s*:/g,
    // ScrollTrigger trigger
    /start\s*:\s*["'][^"']*["']/g,
    // ScrollTrigger start position
    // Performance optimization patterns (commonly used with GSAP)
    /willChange\s*:/g,
    // CSS will-change optimization
    /transformStyle\s*:/g,
    // CSS transform-style
    /preserve-3d/g,
    // 3D transform preservation
    // jQuery patterns when supporting GSAP animations
    /\$\s*\(\s*["'][^"']*["']\s*\)\s*\.each\s*\(/g,
    // jQuery .each() method
    /\$\s*\(\s*["'][^"']*["']\s*\)\s*\.find\s*\(/g,
    // jQuery .find() method
    /\$\s*\(\s*["'][^"']*["']\s*\)\s*\.on\s*\(/g,
    // jQuery .on() event handling
    /\$\s*\(\s*["'][^"']*["']\s*\)\s*\.off\s*\(/g,
    // jQuery .off() event handling
    /\$\s*\(\s*["'][^"']*["']\s*\)\s*\.clone\s*\(/g,
    // jQuery .clone() method
    /\$\s*\(\s*["'][^"']*["']\s*\)\s*\.appendTo\s*\(/g,
    // jQuery .appendTo() method
    /\$\s*\(\s*["'][^"']*["']\s*\)\s*\.attr\s*\(/g,
    // jQuery .attr() method
    /\$\s*\(\s*["'][^"']*["']\s*\)\s*\.remove\s*\(/g,
    // jQuery .remove() method
    /\$\s*\(\s*this\s*\)/g,
    // jQuery $(this) reference
    /\$\s*\(\s*["'][^"']*["']\s*\)/g,
    // General jQuery selector
    // Lenis smooth scroll library patterns
    /new\s+Lenis\s*\(/g,
    // Lenis constructor
    /const\s+lenis\s*=\s*new\s+Lenis/g,
    // Lenis initialization
    /let\s+lenis\s*=\s*new\s+Lenis/g,
    // Lenis initialization (let)
    /var\s+lenis\s*=\s*new\s+Lenis/g,
    // Lenis initialization (var)
    /lenis\s*\.\s*on\s*\(/g,
    // Lenis event listener
    /lenis\s*\.\s*raf\s*\(/g,
    // Lenis requestAnimationFrame
    /lenis\s*\.\s*start\s*\(/g,
    // Lenis start method
    /lenis\s*\.\s*stop\s*\(/g,
    // Lenis stop method
    /lenis\s*\.\s*destroy\s*\(/g,
    // Lenis destroy method
    /lenis\s*\.\s*resize\s*\(/g,
    // Lenis resize method
    /lenis\s*\.\s*scrollTo\s*\(/g,
    // Lenis scrollTo method
    /ScrollTrigger\.update.*lenis/g,
    // Lenis + ScrollTrigger integration
    /lenis.*ScrollTrigger\.update/g,
    // Lenis + ScrollTrigger integration (reverse)
    /gsap\.ticker\.add.*lenis/g,
    // Lenis + GSAP ticker integration
    /lenis.*gsap\.ticker/g,
    // Lenis + GSAP ticker integration (reverse)
    /gsap\.ticker\.lagSmoothing\s*\(\s*0\s*\)/g,
    // GSAP ticker lag smoothing (commonly used with Lenis)
    /requestAnimationFrame.*lenis\.raf/g,
    // Lenis RAF integration
    /function\s+raf\s*\([^)]*\)\s*\{[^}]*lenis\.raf/g,
    // Lenis RAF function pattern
    /smooth\s*:\s*true/g,
    // Lenis smooth option
    /lerp\s*:\s*[\d.]+/g,
    // Lenis lerp option
    /wheelMultiplier\s*:/g,
    // Lenis wheel multiplier
    /infinite\s*:\s*(true|false)/g,
    // Lenis infinite option
    /autoRaf\s*:\s*(true|false)/g,
    // Lenis autoRaf option
    /syncTouch\s*:\s*(true|false)/g,
    // Lenis syncTouch option
    /smoothTouch\s*:\s*(true|false)/g
    // Lenis smoothTouch option
  ];
  const acceptedPatterns = [
    ...defaultPatterns,
    ...Array.isArray(customPatterns) ? customPatterns.map((p) => new RegExp(p, "g")) : []
  ];
  const flaggedGsapUsagePatterns = [
    /ScrollSmoother\.create\s*\(/g,
    // ScrollSmoother.create() - breaks position: sticky
    /new\s+ScrollSmoother\s*\(/g
    // new ScrollSmoother() - alternative initialization
  ];
  const approvedGsapCDNs = [
    /cdn\.prod\.website-files\.com\/gsap\//i,
    // Webflow's official GSAP CDN
    /cdnjs\.cloudflare\.com\/ajax\/libs\/gsap\//i,
    // cdnjs GSAP library
    /unpkg\.com\/@?gsap\//i,
    // unpkg GSAP library
    /cdn\.jsdelivr\.net\/npm\/@?gsap\//i,
    // jsDelivr GSAP library
    /assets\.codepen\.io\/assets\/common\/gsap/i
    // CodePen GSAP assets
  ];
  const securityRiskPatterns = [
    // Direct data exfiltration
    /new\s+Image\s*\(\s*\)\s*\.\s*src\s*=\s*['"]/i,
    /fetch\s*\(\s*['"](https?:\/\/|\/\/)[^'"]*['"]\s*\+\s*document\s*\./i,
    /fetch\s*\(\s*['"](https?:\/\/|\/\/)[^'"]*['"]\s*\+\s*window\s*\./i,
    /fetch\s*\(\s*['"](https?:\/\/|\/\/)[^'"]*['"]\s*\+\s*localStorage\s*\./i,
    // Cookie stealing
    /fetch\s*\(\s*['"](https?:\/\/|\/\/)[^'"]*['"]\s*\+\s*document\.cookie/i,
    /\.src\s*=\s*['"](https?:\/\/|\/\/)[^'"]*['"]\s*\+\s*document\.cookie/i,
    // Form hijacking
    /addEventListener\s*\(\s*['"]submit['"]/i,
    /querySelector\s*\(\s*['"]form['"]\s*\)\s*\.addEventListener/i,
    /\$\s*\(\s*['"]form['"]|form\[[^\]]*\]\s*\)\s*\.\s*on\s*\(\s*['"]submit['"]/i,
    // Keylogging
    /addEventListener\s*\(\s*['"]keydown['"]/i,
    /addEventListener\s*\(\s*['"]keyup['"]/i,
    /addEventListener\s*\(\s*['"]keypress['"]/i,
    // Malicious redirects
    /window\s*\.\s*open\s*\(\s*['"][^'"]*['"]/i
  ];
  const customAnimationPatterns = [
    // IntersectionObserver used for scroll-triggered animations
    /new\s+IntersectionObserver\s*\([^)]*\)\s*[^;]*requestAnimationFrame/s,
    /IntersectionObserver\s*\([^)]*\)\s*[^;]*requestAnimationFrame/s,
    /requestAnimationFrame.*IntersectionObserver/s,
    // Counter/number animations with requestAnimationFrame
    /requestAnimationFrame.*\.(innerText|textContent|innerHTML)\s*=.*toLocaleString/s,
    /requestAnimationFrame.*parseInt.*toLocaleString/s,
    /toLocaleString.*requestAnimationFrame/s,
    // Scroll-triggered custom animations (IntersectionObserver + DOM manipulation)
    /IntersectionObserver.*\.(innerText|textContent|innerHTML)\s*=/s,
    /IntersectionObserver.*\.style\./s,
    // requestAnimationFrame-based custom animations (not in GSAP context)
    /function.*requestAnimationFrame.*\+\+/s,
    /const\s+\w+\s*=\s*\(\s*\)\s*=>\s*\{[^}]*requestAnimationFrame[^}]*\+\+[^}]*\}/s
  ];
  const defaultAllowedScripts = [
    // Webflow core scripts — w-mod feature detection
    // Must handle both minified and pretty-printed versions (newlines between tokens)
    /!function\(o,c\)\{var n=c\.documentElement,t=" w-mod-";/,
    /!\s*function\s*\(\s*o\s*,\s*c\s*\)\s*\{[\s\S]*?w-mod-/,
    // Flexible w-mod pattern: [\s\S]* crosses newlines (unlike .*)
    /documentElement[\s\S]*w-mod-|w-mod-[\s\S]*documentElement/i,
    // Simple w-mod signature — this string only appears in Webflow's default script
    /w-mod-/,
    /var Webflow = Webflow \|\| \[\];/,
    // Common legitimate scripts
    /WebFont\.load\(/,
    // WebFont loading
    /window\.__WEBFLOW_CURRENCY_SETTINGS =/,
    // Webflow currency settings
    /%3C.*?%3E/,
    // URL-encoded HTML (often in Webflow commerce)
    /\(function\(e\)\{var s=\{r:\[\]\};e\.wf=\{r:s\.r,ready:/,
    // Webflow ready function pattern
    /Webflow\.require\(/,
    // Webflow require calls
    /Webflow\.push\(/,
    // Webflow push calls
    // Third-party integrations
    /localStorage\.removeItem\(/,
    // Local storage operations
    /localStorage\.getItem\(/,
    // Local storage read
    /localStorage\.setItem\(/,
    // Local storage write
    /intellimize/,
    // Intellimize integration
    /\.anti-flicker/,
    // Intellimize anti-flicker CSS (prevents FOUC)
    /data-wf-hidden-variation/,
    // Webflow A/B testing variation hiding
    /data-wf-bindings/,
    // Webflow bindings
    /recaptcha/,
    // Google reCAPTCHA
    // Webflow lightbox elements with embedded JSON
    /"items":\s*\[\s*{\s*"url":/,
    // Webflow lightbox JSON pattern
    /"originalUrl":/,
    // Webflow lightbox embedded video
    /"thumbnailUrl":/,
    // Webflow lightbox thumbnail
    /"html":\s*"<iframe class=\\"embedly-embed\\"/,
    // Webflow embedly iframe
    // Webflow Lottie animations
    /data-animation-type="lottie"/,
    // Lottie animation type attribute
    /data-is-ix2-target/,
    // Webflow IX2 interaction target
    /data-default-duration/,
    // Lottie animation duration
    /data-renderer="svg"/,
    // SVG renderer for Lottie
    /lottie-element/,
    // Lottie element ID pattern
    // Webflow password page handlers
    /_handlePasswordPageOnload/,
    // Password page handler function
    /w-password-page/,
    // Password page class
    // Common script patterns
    /document\.createElement\("script"\)/
    // Script loading pattern
  ];
  const results = {
    url: pageUrl,
    validGsapUsage: [],
    // Scripts using GSAP properly
    allowedCustomCode: [],
    // Custom code that is allowed but not GSAP-related
    flaggedCode: [],
    // Scripts that are flagged for validation
    securityRisks: []
    // Scripts that pose security risks
  };
  const scriptContents = extractScriptContents(html);
  const styleContents = extractStyleContents(html);
  scriptContents.forEach((script, index) => {
    if (!script.trim()) return;
    if (script.startsWith("/* Webflow Lightbox JSON */")) {
      results.allowedCustomCode.push({
        scriptIndex: index,
        message: "Webflow lightbox JSON (allowed)"
      });
      return;
    }
    if (script.startsWith("/* Webflow Lottie Animation */")) {
      results.allowedCustomCode.push({
        scriptIndex: index,
        message: "Webflow Lottie animation (allowed)"
      });
      return;
    }
    const isSchemaJsonLd = /"@context"\s*:\s*"https?:\/\/(www\.)?schema\.org"/.test(script) && /"@type"\s*:/.test(script);
    if (isSchemaJsonLd) {
      results.allowedCustomCode.push({
        scriptIndex: index,
        message: "Schema.org JSON-LD structured data (allowed)"
      });
      return;
    }
    const hasCustomAnimation = customAnimationPatterns.some((pattern) => pattern.test(script));
    const hasAnyGsap = /gsap|ScrollTrigger|SplitText|timeline|TweenMax|TweenLite/i.test(script);
    if (hasCustomAnimation && !hasAnyGsap) {
      const matchedPatterns = customAnimationPatterns.filter((pattern) => pattern.test(script)).map((pattern) => pattern.source.substring(0, 50) + "...");
      results.flaggedCode.push({
        scriptIndex: index,
        message: "Custom animation detected - should use GSAP for animations",
        flaggedCode: [`Contains custom animation patterns: ${matchedPatterns.join(", ")}`, truncateScript(script, 200)]
      });
      return;
    }
    const isDefaultScript = defaultAllowedScripts.some((pattern) => pattern.test(script));
    if (isDefaultScript) {
      results.allowedCustomCode.push({
        scriptIndex: index,
        message: "Webflow default or approved script"
      });
      return;
    }
    const hasFlaggedGsapUsage = flaggedGsapUsagePatterns.some((pattern) => pattern.test(script));
    if (hasFlaggedGsapUsage) {
      const flaggedPatterns = flaggedGsapUsagePatterns.filter((pattern) => pattern.test(script)).map((pattern) => pattern.source);
      results.flaggedCode.push({
        scriptIndex: index,
        message: "Script contains problematic GSAP usage (ScrollSmoother breaks position: sticky and Webflow interactions)",
        flaggedCode: [`Contains flagged GSAP usage patterns: ${flaggedPatterns.join(", ")}`]
      });
      return;
    }
    const hasSecurityRisks2 = securityRiskPatterns.some((pattern) => pattern.test(script));
    if (hasSecurityRisks2) {
      const riskPatterns = securityRiskPatterns.filter((pattern) => pattern.test(script)).map((pattern) => pattern.source);
      results.securityRisks.push({
        scriptIndex: index,
        message: "Script contains security risk patterns",
        flaggedCode: [`Contains security risk patterns: ${riskPatterns.join(", ")}`]
      });
      return;
    }
    const hasGsapUsage = acceptedPatterns.some((pattern) => pattern.test(script));
    const coreGsapPatterns = [
      /gsap\./g,
      /GSAP\./g,
      /TweenMax\./g,
      /TweenLite\./g,
      /TimelineMax\./g,
      /TimelineLite\./g,
      /ScrollTrigger/g,
      /SplitText/g,
      /Draggable/g
    ];
    const hasCoreGsapUsage = coreGsapPatterns.some((pattern) => pattern.test(script));
    const maxLength = 150;
    if (script.trim().length < maxLength && !containsPotentiallyHarmfulCode(script)) {
      results.allowedCustomCode.push({
        scriptIndex: index,
        message: "Simple initialization script (allowed)"
      });
      return;
    }
    if (hasGsapUsage) {
      if (hasGsapUsage && !hasCoreGsapUsage) {
        const pluginSpecificPatterns = [
          /type\s*:\s*["'](?:words|chars|lines)["']/g,
          /mask\s*:\s*["'](?:words|chars|lines)["']/g,
          /wordsClass\s*:/g,
          /charsClass\s*:/g,
          /linesClass\s*:/g,
          /autoSplit\s*:/g,
          /type\s*:\s*["'][xy,\s]*["']/g,
          /edgeResistance\s*:/g,
          /inertia\s*:/g,
          /bounds\s*:/g,
          /duration\s*:/g,
          /ease\s*:\s*["'][^"']*["']/g,
          /opacity\s*:/g,
          /rotateZ\s*:/g,
          /y\s*:\s*["'][^"']*["']/g,
          /x\s*:\s*["'][^"']*["']/g,
          /trigger\s*:/g,
          /start\s*:\s*["'][^"']*["']/g,
          /willChange\s*:/g,
          /transformStyle\s*:/g,
          /preserve-3d/g
        ];
        const onlyHasPluginPatterns = pluginSpecificPatterns.some((pattern) => pattern.test(script));
        if (onlyHasPluginPatterns) {
          results.flaggedCode.push({
            scriptIndex: index,
            message: "Script contains GSAP plugin patterns but no core GSAP usage - may be using these properties outside GSAP context",
            flaggedCode: [truncateScript(script, 200)]
          });
          return;
        }
      }
      const unacceptedCode = findUnacceptedCode(script, acceptedPatterns);
      if (unacceptedCode.length === 0) {
        results.validGsapUsage.push({
          scriptIndex: index,
          message: "Valid GSAP usage detected"
        });
      } else {
        results.flaggedCode.push({
          scriptIndex: index,
          message: "Mixed GSAP usage with unapproved code",
          flaggedCode: unacceptedCode
        });
      }
    } else {
      results.flaggedCode.push({
        scriptIndex: index,
        message: "Custom script detected without approved GSAP patterns",
        flaggedCode: [truncateScript(script, 200)]
      });
    }
  });
  styleContents.forEach((style, index) => {
    if (!style.trim()) return;
    const isHarmlessCSS = isCommonStylingCSS(style);
    if (isHarmlessCSS) {
      results.allowedCustomCode.push({
        scriptIndex: `style-${index}`,
        message: "Common styling CSS (allowed)"
      });
      return;
    }
    const hasGsapUsage = acceptedPatterns.some((pattern) => pattern.test(style));
    if (!hasGsapUsage) {
      results.flaggedCode.push({
        scriptIndex: `style-${index}`,
        message: "Custom CSS detected without corresponding GSAP implementation",
        flaggedCode: [truncateScript(style, 200)]
      });
    } else {
      results.allowedCustomCode.push({
        scriptIndex: `style-${index}`,
        message: "CSS supporting GSAP implementation"
      });
    }
  });
  const externalScripts = extractExternalScripts(html);
  if (externalScripts.length > 0) {
    results.externalScripts = externalScripts;
    externalScripts.forEach((externalScript, index) => {
      if (externalScript.src && /ScrollSmoother/i.test(externalScript.src)) {
        results.flaggedCode.push({
          scriptIndex: `external-${index}`,
          message: "ScrollSmoother plugin is enabled in your Webflow project settings",
          flaggedCode: [
            "ScrollSmoother breaks position: sticky and Webflow native scroll interactions.",
            "To fix: In Webflow Designer, go to Site Settings \u2192 GSAP \u2192 uncheck 'ScrollSmoother'",
            `Found at: ${externalScript.src}`
          ],
          externalScript: externalScript.src,
          fixable: true
          // Indicates this can be fixed in Webflow settings
        });
      }
    });
  }
  const hasFlaggedCode = results.flaggedCode.length > 0;
  const hasSecurityRisks = results.securityRisks.length > 0;
  const hasValidGsap = results.validGsapUsage.length > 0;
  const actualGsapScripts = results.validGsapUsage.filter(
    (item) => !item.scriptIndex.toString().startsWith("style-")
  ).length;
  const passed = !hasFlaggedCode && !hasSecurityRisks && (actualGsapScripts === 0 || hasValidGsap);
  return {
    passed,
    summary: {
      url: pageUrl,
      scriptCount: scriptContents.length,
      styleCount: styleContents.length,
      externalScriptCount: externalScripts.length,
      validGsapCount: results.validGsapUsage.length,
      allowedCustomCodeCount: results.allowedCustomCode.length,
      flaggedCodeCount: results.flaggedCode.length,
      securityRiskCount: results.securityRisks.length,
      passed
    },
    details: results
  };
}
__name(validateGsapUsage, "validateGsapUsage");
function extractScriptContents(html) {
  const scriptRegex = /<script([^>]*)>([\s\S]*?)<\/script>/g;
  const scripts = [];
  const lottieRegex = /<div[^>]*data-animation-type=["']lottie["'][^>]*>([\s\S]*?)<\/div>/g;
  let match = scriptRegex.exec(html);
  while (match !== null) {
    const scriptAttributes = match[1] || "";
    const scriptContent = match[2].trim();
    if (scriptContent) {
      if (scriptAttributes.includes('class="w-json"') || scriptAttributes.includes('type="application/json"')) {
        scripts.push(`/* Webflow Lightbox JSON */ ${scriptContent}`);
      } else {
        scripts.push(scriptContent);
      }
    }
    match = scriptRegex.exec(html);
  }
  let lottieMatch = lottieRegex.exec(html);
  while (lottieMatch !== null) {
    const lottieElement = lottieMatch[0];
    scripts.push(`/* Webflow Lottie Animation */ ${lottieElement}`);
    lottieMatch = lottieRegex.exec(html);
  }
  return scripts;
}
__name(extractScriptContents, "extractScriptContents");
function extractStyleContents(html) {
  const styleRegex = /<style([^>]*)>([\s\S]*?)<\/style>/g;
  const styles = [];
  let match = styleRegex.exec(html);
  while (match !== null) {
    const styleContent = match[2].trim();
    if (styleContent) {
      styles.push(styleContent);
    }
    match = styleRegex.exec(html);
  }
  return styles;
}
__name(extractStyleContents, "extractStyleContents");
function extractExternalScripts(html) {
  if (typeof window === "undefined" && typeof __require === "undefined") {
    const scriptRegex = /<script[^>]+src\s*=\s*['"]([^'"]+)['"][^>]*>/gi;
    const externalScripts = [];
    let match;
    while ((match = scriptRegex.exec(html)) !== null) {
      externalScripts.push({
        src: match[1],
        type: "text/javascript"
      });
    }
    return externalScripts;
  } else {
    try {
      const cheerio = __require("cheerio");
      const $ = cheerio.load(html);
      const externalScripts = [];
      $("script[src]").each((_, element) => {
        const src = $(element).attr("src");
        if (src) {
          externalScripts.push({
            src,
            type: $(element).attr("type") || "text/javascript"
          });
        }
      });
      return externalScripts;
    } catch (error) {
      const scriptRegex = /<script[^>]+src\s*=\s*['"]([^'"]+)['"][^>]*>/gi;
      const externalScripts = [];
      let match;
      while ((match = scriptRegex.exec(html)) !== null) {
        externalScripts.push({
          src: match[1],
          type: "text/javascript"
        });
      }
      return externalScripts;
    }
  }
}
__name(extractExternalScripts, "extractExternalScripts");
function findUnacceptedCode(script, acceptedPatterns) {
  const totalLength = script.length;
  let acceptedLength = 0;
  for (const pattern of acceptedPatterns) {
    const matches = script.match(pattern);
    if (matches) {
      for (const match of matches) {
        acceptedLength += match.length;
      }
    }
  }
  const acceptedRatio = acceptedLength / totalLength;
  if (acceptedRatio >= 0.4) {
    return [];
  }
  const codeBlocks = script.split(/[;\n\r{}]/).map((block) => block.trim()).filter((block) => block.length > 10);
  if (codeBlocks.length === 0) return [];
  const unacceptedBlocks = codeBlocks.filter((block) => {
    if (block.trim().length < 10) return false;
    if (block.trim().startsWith("//") || block.trim().startsWith("/*")) return false;
    return !acceptedPatterns.some((pattern) => pattern.test(block));
  });
  const blockAcceptedRatio = (codeBlocks.length - unacceptedBlocks.length) / codeBlocks.length;
  if (blockAcceptedRatio >= 0.3) {
    return [];
  }
  const harmlessUnacceptedBlocks = unacceptedBlocks.filter((block) => {
    if (/^(var|let|const)\s+\w+\s*=/.test(block.trim())) return false;
    if (/^\w+\.\w+$/.test(block.trim())) return false;
    if (/^\w+\([^)]*\)$/.test(block.trim()) && !containsPotentiallyHarmfulCode(block)) return false;
    if (/^\w+\.\w+\s*=\s*[^;]*$/.test(block.trim())) return false;
    if (/\.(push|pop|shift|unshift|splice|slice)\s*\(/.test(block)) return false;
    if (/\.(substring|substr|slice|charAt|indexOf|split|replace)\s*\(/.test(block)) return false;
    return true;
  });
  if (harmlessUnacceptedBlocks.length <= Math.ceil(unacceptedBlocks.length * 0.3)) {
    return [];
  }
  return harmlessUnacceptedBlocks.map((block) => truncateScript(block, 100));
}
__name(findUnacceptedCode, "findUnacceptedCode");
function truncateScript(script, maxLength = 100) {
  if (script.length <= maxLength) return script;
  return `${script.substring(0, maxLength)}...`;
}
__name(truncateScript, "truncateScript");
function isCommonStylingCSS(css) {
  const harmlessPatterns = [
    // Typography enhancements
    /-webkit-font-smoothing\s*:\s*antialiased/i,
    /-moz-osx-font-smoothing\s*:\s*grayscale/i,
    /text-rendering\s*:\s*optimizeLegibility/i,
    // Basic body/html styling
    /body\s*\{[^}]*font-smoothing[^}]*\}/i,
    /html\s*\{[^}]*font-smoothing[^}]*\}/i,
    // Webflow background video fallback for accessibility
    /\[data-wf-bgvideo-fallback-img\]/i,
    /@media\s*\(prefers-reduced-motion\s*:\s*reduce\)/i,
    // Webflow IX2 interaction system CSS
    /html\.w-mod-js:not\(\.w-mod-ix\)/i,
    /\[data-w-id\s*=\s*["'][^"']*["']\]/i,
    /w-mod-ix/i,
    // Webflow platform-injected CSS patterns
    /\.anti-flicker/i,
    // Intellimize anti-flicker CSS
    /data-wf-hidden-variation/i,
    // Webflow A/B testing variation hiding
    // Webflow SVG color inheritance patterns
    /svg\s*\[data-color\s*=\s*["']\d+["']\]\s*\{\s*fill\s*:\s*currentColor\s*;\s*\}/i,
    /#[a-z0-9-]+\s+svg\s*\[data-color\s*=\s*["']\d+["']\]\s*\{\s*fill\s*:\s*currentColor\s*;\s*\}/i,
    /\[data-color\s*=\s*["']\d+["']\]/i,
    // General data-color attribute patterns
    /fill\s*:\s*currentColor/i,
    // SVG fill inheritance
    // Google Fonts imports (standard Webflow practice)
    /@import\s+url\s*\(\s*['"]https:\/\/fonts\.googleapis\.com\/css/i,
    // Color inheritance CSS (ensures all elements inherit color from parent)
    /\/\*\s*Ensure all elements inherit the color from its parent\s*\*\//i,
    /color\s*:\s*inherit\s*[;!]/i
  ];
  const cleanCSS = css.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\s+/g, " ").trim();
  const onlyHarmlessPatterns = harmlessPatterns.some((pattern) => pattern.test(cleanCSS));
  if (onlyHarmlessPatterns) return true;
  if (cleanCSS.length < 200) {
    const fontSmoothingOnly = /^[^{}]*\{[^{}]*(-webkit-font-smoothing|-moz-osx-font-smoothing)[^{}]*\}[^{}]*$/i.test(cleanCSS);
    if (fontSmoothingOnly) return true;
  }
  return false;
}
__name(isCommonStylingCSS, "isCommonStylingCSS");
function containsPotentiallyHarmfulCode(script) {
  const harmfulPatterns = [
    /eval\s*\(/,
    // Direct eval calls
    /Function\s*\(\s*['"`]/,
    // Function constructor with string
    /document\.write\s*\(/,
    // document.write
    /XMLHttpRequest/,
    // XHR usage (might be legitimate but flag it)
    /fetch\s*\(/,
    // fetch API
    /\.open\s*\(\s*['"`]POST/,
    // XHR POST requests
    /\.open\s*\(\s*['"`]PUT/,
    // XHR PUT requests
    /\.open\s*\(\s*['"`]DELETE/,
    // XHR DELETE requests
    /\.setRequestHeader/,
    // Setting custom request headers
    /window\.open\s*\(/,
    // Opening new windows
    /window\.location\s*=/,
    // Changing window location
    /document\.cookie/,
    // Cookie manipulation
    /setAttribute\(\s*['"`]src/,
    // Setting src via setAttribute
    /sessionStorage\./,
    // SessionStorage usage
    /indexedDB\./,
    // IndexedDB usage
    /navigator\.sendBeacon/,
    // SendBeacon API
    /new Worker\(/
    // Web Workers
  ];
  const gsapRelated = /gsap|ScrollTrigger|SplitText|timeline|tween|Draggable/i.test(script);
  const conditionalPatterns = gsapRelated ? [] : [
    /\.innerHTML\s*=/,
    // Allow innerHTML in GSAP scripts
    /\.src\s*=/,
    // Allow src changes in GSAP scripts
    /style\s*\.\s*position\s*=/,
    // Allow position changes in GSAP scripts
    /style\s*\.\s*display\s*=/,
    // Allow display changes in GSAP scripts
    /style\s*\.\s*zIndex\s*=/,
    // Allow zIndex changes in GSAP scripts
    /style\s*\.\s*overflow\s*=/
    // Allow overflow changes in GSAP scripts
  ];
  const patternsToCheck = [...harmfulPatterns, ...conditionalPatterns];
  return patternsToCheck.some((pattern) => {
    if (pattern.test(script)) {
      const match = script.match(pattern);
      if (match) {
        const matchIndex = match.index;
        const precedingCode = script.substring(0, matchIndex);
        const commentStartsCount = (precedingCode.match(/\/\*/g) || []).length;
        const commentEndsCount = (precedingCode.match(/\*\//g) || []).length;
        if (commentStartsCount > commentEndsCount) return false;
        const lastLineBreak = precedingCode.lastIndexOf("\n");
        const currentLine = precedingCode.substring(lastLineBreak + 1);
        if (currentLine.includes("//")) return false;
      }
      return true;
    }
    return false;
  });
}
__name(containsPotentiallyHarmfulCode, "containsPotentiallyHarmfulCode");

// cloudflare-worker/lib/crawler.js
var urlCache = /* @__PURE__ */ new Set();
async function crawlWebsite(baseUrl, options = {}, customEnv = {}) {
  urlCache.clear();
  const maxDepth = options.maxDepth || 1;
  const maxPages = options.maxPages || 50;
  const timeout = options.timeout || 25e3;
  const baseUrlObj = new URL(baseUrl);
  const pages = [];
  const siteMap = {
    "/": {
      url: baseUrl,
      links: []
    }
  };
  const fetchImpl = customEnv.fetch || fetch;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  try {
    const startTime = Date.now();
    await breadthFirstCrawl(baseUrl, baseUrlObj, maxDepth, maxPages, pages, siteMap, controller.signal, fetchImpl);
    const endTime = Date.now();
    const crawlStats = {
      maxDepth,
      maxPages,
      pagesDiscovered: Object.keys(siteMap).length,
      pagesProcessed: pages.length,
      processingTime: endTime - startTime
    };
    return {
      url: baseUrl,
      pages,
      siteMap,
      crawlStats
    };
  } catch (error) {
    if (error.name === "AbortError") {
      console.log("Crawl operation timed out, returning partial results");
      return {
        url: baseUrl,
        pages,
        siteMap,
        partial: true,
        error: "Crawl operation timed out"
      };
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}
__name(crawlWebsite, "crawlWebsite");
async function breadthFirstCrawl(baseUrl, baseUrlObj, maxDepth, maxPages, pages, siteMap, signal, fetchImpl = fetch) {
  const queue = [{ url: baseUrl, depth: 0 }];
  while (queue.length > 0 && pages.length < maxPages) {
    if (signal && signal.aborted) {
      throw new DOMException("Crawl aborted due to timeout", "AbortError");
    }
    const { url, depth } = queue.shift();
    if (urlCache.has(url) || depth > maxDepth) {
      continue;
    }
    urlCache.add(url);
    try {
      const response = await fetchImpl(url, {
        signal,
        headers: {
          "User-Agent": "Mozilla/5.0 CloudflareWorker/1.0 GSAP-Validator"
        }
      });
      if (!response.ok) {
        pages.push({
          url,
          error: `HTTP error: ${response.status}`,
          depth,
          success: false
        });
        continue;
      }
      const html = await response.text();
      if (!html) {
        throw new Error("Empty response");
      }
      const { title, links } = extractPageInfo(html, url, baseUrlObj);
      let validationResult;
      try {
        validationResult = await validateGsapUsage(html);
      } catch (validationError) {
        validationResult = {
          success: false,
          passed: false,
          error: validationError.message,
          flaggedCodeCount: 0
        };
      }
      pages.push({
        url,
        title,
        depth,
        success: true,
        passed: validationResult.passed,
        flaggedCodeCount: validationResult.flaggedCodeCount || 0,
        summary: validationResult.summary
      });
      siteMap[url] = {
        url,
        title,
        links: links.map((l) => l.url)
      };
      if (depth < maxDepth) {
        links.forEach((link) => {
          if (!urlCache.has(link.url)) {
            queue.push({
              url: link.url,
              depth: depth + 1
            });
          }
        });
      }
    } catch (error) {
      console.error(`Error fetching ${url}:`, error);
      pages.push({
        url,
        error: error.message,
        depth,
        success: false,
        passed: false
      });
    }
  }
  return {
    pagesDiscovered: urlCache.size,
    pagesProcessed: pages.length
  };
}
__name(breadthFirstCrawl, "breadthFirstCrawl");
function extractPageInfo(html, sourceUrl, baseUrlObj) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const title = doc.querySelector("title")?.textContent || "";
  const links = [];
  const anchorElements = doc.querySelectorAll("a[href]");
  anchorElements.forEach((anchor) => {
    const href = anchor.getAttribute("href");
    if (!href) return;
    try {
      let fullUrl;
      let relativeUrl;
      if (href.startsWith("/")) {
        fullUrl = new URL(href, baseUrlObj.origin).href;
        relativeUrl = href;
      } else if (!href.includes("://")) {
        fullUrl = new URL(href, sourceUrl).href;
        relativeUrl = "/" + href.replace(/^\.\//, "");
      } else {
        fullUrl = href;
        const linkUrlObj = new URL(fullUrl);
        if (linkUrlObj.hostname !== baseUrlObj.hostname) {
          return;
        }
        relativeUrl = linkUrlObj.pathname;
      }
      if (!fullUrl.match(/\.(css|js|png|jpg|jpeg|gif|pdf|svg|ico|mp4|webp|woff|ttf|otf)$/i) && !fullUrl.includes("#") && !fullUrl.startsWith("mailto:") && !fullUrl.startsWith("tel:")) {
        links.push({
          url: fullUrl,
          relativeUrl
        });
      }
    } catch (error) {
      console.error(`Error processing URL ${href}:`, error.message);
    }
  });
  return { title, links };
}
__name(extractPageInfo, "extractPageInfo");
var DOMParser = class {
  static {
    __name(this, "DOMParser");
  }
  parseFromString(html, mimeType) {
    if (mimeType !== "text/html") {
      throw new Error("Only text/html mime type is supported");
    }
    if (!html || typeof html !== "string") {
      html = "<html><head><title>Empty Page</title></head><body></body></html>";
    }
    return {
      querySelector(selector) {
        if (selector === "title") {
          const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
          return titleMatch ? { textContent: titleMatch[1] } : { textContent: "Untitled Page" };
        }
        return null;
      },
      querySelectorAll(selector) {
        if (selector === "a[href]") {
          const links = [];
          const regex = /<a[^>]*href=["']([^"']*)["'][^>]*>/gi;
          let match;
          while ((match = regex.exec(html)) !== null) {
            const href = match[1];
            if (href) {
              links.push({
                getAttribute: /* @__PURE__ */ __name((attr) => attr === "href" ? href : null, "getAttribute")
              });
            }
          }
          return links;
        }
        return [];
      }
    };
  }
};

// cloudflare-worker/lib/markdown.js
function generateMarkdownReport(results) {
  if (!results) {
    return "# GSAP Validation Report\n\nNo results to display.\n";
  }
  let markdown = "# GSAP Validation Report\n\n";
  markdown += "## Site Overview\n\n";
  if (results.url) {
    markdown += `**Site URL**: ${results.url}

`;
  }
  if (results.siteResults) {
    const { pageCount, analyzedCount, passedCount, failedCount } = results.siteResults;
    markdown += `**Total Pages**: ${pageCount}
`;
    markdown += `**Successfully Analyzed**: ${analyzedCount}
`;
    markdown += `**Passed Validation**: ${passedCount}
`;
    markdown += `**Failed Validation**: ${failedCount}

`;
    if (pageCount > 0) {
      const passPercentage = Math.round(passedCount / pageCount * 100);
      markdown += `**Overall Pass Rate**: ${passPercentage}%

`;
    }
  }
  markdown += "## Validation Summary\n\n";
  if (results.passed) {
    markdown += "\u2705 **PASSED**: All pages passed GSAP validation.\n\n";
  } else {
    markdown += "\u274C **FAILED**: Some pages did not pass GSAP validation.\n\n";
  }
  if (results.error) {
    markdown += `**Error**: ${results.error}

`;
  }
  if (results.crawlStats) {
    markdown += "## Crawl Statistics\n\n";
    markdown += `**Maximum Depth**: ${results.crawlStats.maxDepth}
`;
    markdown += `**Maximum Pages**: ${results.crawlStats.maxPages}
`;
    markdown += `**Pages Discovered**: ${results.crawlStats.pagesDiscovered}
`;
    markdown += `**Pages Processed**: ${results.crawlStats.pagesProcessed}
`;
    markdown += `**Processing Time**: ${results.crawlStats.processingTime}ms

`;
  }
  if (results.pageResults && results.pageResults.length > 0) {
    markdown += "## Page Results\n\n";
    markdown += "| Page URL | Status | GSAP Scripts | Flagged Scripts | Issues |\n";
    markdown += "|----------|--------|-------------|-----------------|--------|\n";
    results.pageResults.forEach((page) => {
      const status = page.success === false ? "\u274C Request failed" : page.passed ? "\u2705 Pass" : "\u274C Fail";
      const gsapCount = page.success === false ? "N/A" : page.summary?.validGsapCount ?? 0;
      const flaggedCount = page.success === false ? "N/A" : (page.summary?.flaggedCodeCount || 0) + (page.summary?.securityRiskCount || 0);
      const issuesCount = page.success === false ? 1 : (page.summary?.flaggedCodeCount || 0) + (page.summary?.securityRiskCount || 0);
      markdown += `| ${page.url} | ${status} | ${gsapCount} | ${flaggedCount} | ${issuesCount} |
`;
    });
    markdown += "\n";
    markdown += "## Detailed Issues\n\n";
    let hasDetailedIssues = false;
    results.pageResults.forEach((page) => {
      if (page.success === false) {
        hasDetailedIssues = true;
        markdown += `### ${page.url}

`;
        markdown += `- **Request Failure**: ${page.error || "Unknown crawl error"}
`;
        if (Array.isArray(page.referrers) && page.referrers.length > 0) {
          markdown += `- **Linked From**: ${page.referrers.join(", ")}
`;
        }
        markdown += `
`;
        return;
      }
      if (page.success && !page.passed) {
        hasDetailedIssues = true;
        markdown += `### ${page.url}

`;
        if (page.summary) {
          markdown += `- **Issues Found**: ${page.flaggedCodeCount}
`;
          if (Array.isArray(page.details?.flaggedCode) && page.details.flaggedCode.length > 0) {
            markdown += `
**Problematic Code Snippets**:

`;
            page.details.flaggedCode.forEach((issue, index) => {
              const flaggedText = Array.isArray(issue.flaggedCode) ? issue.flaggedCode.join(" ") : issue.message || "Flagged code";
              const flaggedPreview = flaggedText.slice(0, 50);
              markdown += `${index + 1}. \`${flaggedPreview}${flaggedText.length > 50 ? "..." : ""}\`
`;
              if (issue.reason) {
                markdown += `   - Reason: ${issue.reason}
`;
              }
              markdown += `
`;
            });
          }
        }
      }
    });
    if (!hasDetailedIssues) {
      markdown += `No detailed issue information available.
`;
    }
  }
  if (!results.passed) {
    markdown += "## Recommendations\n\n";
    markdown += "1. **Review Flagged Code**: Check all flagged code snippets for potential issues.\n";
    markdown += "2. **Fix Security Risks**: Immediately address any security risk issues identified.\n";
    markdown += "3. **Verify GSAP Usage**: Ensure GSAP is properly imported and used in your templates.\n";
    markdown += "4. **Minimize External Scripts**: Reduce reliance on external scripts when possible.\n";
    markdown += "5. **Use Official CDNs**: When using external libraries, use official CDNs like cdnjs, unpkg, or jsdelivr.\n";
  }
  markdown += `
---

`;
  markdown += `Report generated on: ${(/* @__PURE__ */ new Date()).toLocaleString()}
`;
  return markdown;
}
__name(generateMarkdownReport, "generateMarkdownReport");
function normalizePublishedSiteUrl(value) {
  if (typeof value !== "string") {
    throw new Error("Published URL is required");
  }
  const trimmed = value.trim();
  const matched = trimmed.match(/https:\/\/[a-z0-9-]+\.webflow\.io(?:\/[^\s]*)?/i);
  const candidate = matched ? matched[0] : trimmed;
  let parsed;
  try {
    parsed = new URL(candidate);
  } catch {
    throw new Error("Invalid URL provided");
  }
  if (parsed.protocol !== "https:") {
    throw new Error("Published URL must start with https://");
  }
  if (!parsed.hostname.toLowerCase().endsWith(".webflow.io")) {
    throw new Error("Published URL must use a .webflow.io hostname");
  }
  parsed.hash = "";
  if (!parsed.pathname) {
    parsed.pathname = "/";
  }
  return parsed.toString();
}
__name(normalizePublishedSiteUrl, "normalizePublishedSiteUrl");

// cloudflare-worker/lib/cors.js
var ALLOWED_ORIGINS = [
  "https://wf-form-validation-with-airtable-databa.webflow.io",
  "https://webflow.com",
  "https://www.webflow.com",
  "https://gsap-validator.vercel.app",
  "https://wf.createsomething.io"
];
var ALLOWED_ORIGIN_PATTERNS = [
  /^https:\/\/([a-z0-9-]+\.)*webflow\.com$/i,
  /^https:\/\/[a-z0-9-]+\.webflow\.io$/i,
  /^https:\/\/[a-z0-9-]+\.webflow-dashboard\.pages\.dev$/i
];
function handleCors(request) {
  const origin = request.headers.get("Origin");
  const requestedHeaders = request.headers.get("Access-Control-Request-Headers");
  const isAllowedOrigin = !origin || ALLOWED_ORIGINS.includes(origin) || ALLOWED_ORIGIN_PATTERNS.some((pattern) => pattern.test(origin));
  const corsHeaders = {
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": requestedHeaders && requestedHeaders.trim() !== "" ? requestedHeaders : "Content-Type, Authorization, X-Correlation-Id",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin, Access-Control-Request-Headers"
  };
  if (isAllowedOrigin) {
    corsHeaders["Access-Control-Allow-Origin"] = origin || "*";
  }
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }
  return {
    corsHeaders,
    isAllowedOrigin
  };
}
__name(handleCors, "handleCors");

// cloudflare-worker/workflow.js
import { WorkflowEntrypoint } from "cloudflare:workers";
var GsapValidationWorkflow = class extends WorkflowEntrypoint {
  static {
    __name(this, "GsapValidationWorkflow");
  }
  async run(event, step) {
    const params = event?.params || event?.payload || event || {};
    const { url, maxDepth = 10, maxPages = 1000 } = params;
    const crawlResults = await step.do("crawl website", {
      retries: {
        limit: 3,
        delay: "2 seconds",
        backoff: "exponential"
      },
      timeout: "5 minutes"
    }, async () => {
      const results = await crawlWebsite(url, {
        maxDepth,
        maxPages,
        timeout: 24e4
      });
      return {
        pages: results.pages || [],
        siteMap: results.siteMap || {},
        crawlStats: results.crawlStats || {},
        partial: Boolean(results.partial),
        error: results.error || null
      };
    });
    const pageResults = [];
    const pages = crawlResults.pages;
    const batchSize = 10;
    for (let i = 0; i < pages.length; i += batchSize) {
      const batch = pages.slice(i, Math.min(i + batchSize, pages.length));
      const batchResults = await step.do(`validate pages ${i}-${i + batch.length - 1}`, {
        retries: {
          limit: 2,
          delay: "1 second",
          backoff: "linear"
        },
        timeout: "2 minutes"
      }, async () => {
        const results = [];
        for (const page of batch) {
          try {
            if (page.error) {
              results.push({
                url: page.url,
                success: false,
                error: page.error
              });
              continue;
            }
            const response = await fetch(page.url, {
              headers: {
                "User-Agent": "Mozilla/5.0 (compatible; Cloudflare-Worker/1.0; +https://gsap-validation-worker.createsomething.workers.dev/)"
              }
            });
            if (!response.ok) {
              results.push({
                url: page.url,
                success: false,
                error: `HTTP error: ${response.status}`
              });
              continue;
            }
            const html = await response.text();
            const validation = validateGsapUsage(html, page.url);
            results.push({
              url: page.url,
              title: page.title || "",
              success: true,
              passed: validation.passed,
              summary: {
                url: page.url,
                scriptCount: validation.scriptCount,
                styleCount: validation.styleCount,
                externalScriptCount: validation.externalScripts?.length || 0,
                validGsapCount: validation.validGsapUsage?.length || 0,
                allowedCustomCodeCount: validation.allowedCustomCode?.length || 0,
                flaggedCodeCount: validation.flaggedCode?.length || 0,
                securityRiskCount: validation.securityRisks?.length || 0,
                passed: validation.passed
              },
              details: {
                url: page.url,
                validGsapUsage: validation.validGsapUsage || [],
                allowedCustomCode: validation.allowedCustomCode || [],
                flaggedCode: validation.flaggedCode || [],
                securityRisks: validation.securityRisks || [],
                externalScripts: validation.externalScripts || []
              },
              flaggedCodeCount: validation.flaggedCode?.length || 0
            });
          } catch (error) {
            results.push({
              url: page.url,
              success: false,
              error: error.message
            });
          }
        }
        return results;
      });
      pageResults.push(...batchResults);
    }
    const finalResults = await step.do("aggregate results", async () => {
      return finalizeCrawlResponse(url, pageResults, crawlResults, crawlResults.siteMap);
    });
    return finalResults;
  }
};

// cloudflare-worker/worker.js
var worker_default = {
  async fetch(request, env, ctx) {
    const corsResult = handleCors(request);
    if (corsResult instanceof Response) {
      return corsResult;
    }
    const { corsHeaders, isAllowedOrigin } = corsResult;
    if (!isAllowedOrigin) {
      return new Response(JSON.stringify({ error: "Origin not allowed" }), {
        status: 403,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders
        }
      });
    }
    const url = new URL(request.url);
    const path = url.pathname;
    if (path === "/" && request.method === "GET") {
      return new Response(JSON.stringify({
        name: "GSAP Validation API",
        version: "1.0.0",
        endpoints: [
          { path: "/validateGsap", method: "POST", description: "Validate GSAP usage with site crawling" },
          { path: "/validateGsapUsage", method: "POST", description: "Validate GSAP usage on a single page with detailed results" },
          { path: "/crawlWebsite", method: "POST", description: "Crawl a website and validate all pages" }
        ]
      }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders
        }
      });
    }
    try {
      if (request.method !== "POST") {
        return new Response(JSON.stringify({ error: "Method not allowed" }), {
          status: 405,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders
          }
        });
      }
      const contentType = request.headers.get("Content-Type") || "";
      if (!contentType.includes("application/json")) {
        return new Response(JSON.stringify({ error: "Content-Type must be application/json" }), {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders
          }
        });
      }
      let requestData;
      try {
        requestData = await request.json();
      } catch (error) {
        return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders
          }
        });
      }
      if (path === "/validateGsap" || path === "/api/gsapValidation") {
        return await handleGsapValidation(requestData, env, ctx, corsHeaders);
      }
      if (path === "/validateGsapUsage" || path === "/api/validateGsapUsage") {
        return await handleSinglePageValidation(requestData, env, ctx, corsHeaders);
      }
      if (path === "/crawlWebsite" || path === "/api/crawlWebsite") {
        return await handleWebsiteCrawl(requestData, env, ctx, corsHeaders);
      }
      return new Response(JSON.stringify({
        error: "Route not found",
        availableRoutes: ["/validateGsap", "/validateGsapUsage", "/crawlWebsite"],
        requestedPath: path
      }), {
        status: 404,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders
        }
      });
    } catch (error) {
      console.error("Worker error:", error);
      return new Response(JSON.stringify({ error: error.message || "Internal server error" }), {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders
        }
      });
    }
  }
};
async function handleSinglePageValidation(requestData, env, ctx, corsHeaders) {
  let urlToValidate = requestData.url || "";
  const customPatterns = requestData.customPatterns || [];
  try {
    urlToValidate = normalizePublishedSiteUrl(urlToValidate);
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message || "Invalid URL provided" }), {
      status: 400,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders
      }
    });
  }
  try {
    const response = await fetch(urlToValidate);
    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }
    const html = await response.text();
    const validationResults = validateGsapUsage(html, urlToValidate, customPatterns);
    return new Response(JSON.stringify(validationResults), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      error: error.message,
      message: "Error validating URL"
    }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders
      }
    });
  }
}
__name(handleSinglePageValidation, "handleSinglePageValidation");
async function handleWebsiteCrawl(requestData, env, ctx, corsHeaders) {
  let urlToValidate = requestData.url || "";
  const maxDepth = requestData.maxDepth || 10;
  const maxPages = requestData.maxPages || 250;
  const instanceId = requestData.instanceId;
  const runAsync = requestData.async === true;
  try {
    urlToValidate = normalizePublishedSiteUrl(urlToValidate);
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message || "Invalid URL provided" }), {
      status: 400,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders
      }
    });
  }
  try {
    if (instanceId) {
      if (!env.GSAP_WORKFLOW) {
        return new Response(JSON.stringify({
          error: "Workflows not available"
        }), {
          status: 404,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders
          }
        });
      }
      try {
        const instance = await env.GSAP_WORKFLOW.get(instanceId);
        const status = await instance.status();
        if (status.status === "complete") {
          return new Response(JSON.stringify(status.output), {
            status: 200,
            headers: {
              "Content-Type": "application/json",
              ...corsHeaders
            }
          });
        }
        return new Response(JSON.stringify({
          instanceId,
          status: status.status,
          error: status.error
        }), {
          status: status.status === "running" ? 202 : 200,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders
          }
        });
      } catch (error) {
        return new Response(JSON.stringify({
          error: "Failed to retrieve workflow instance",
          details: error.message
        }), {
          status: 404,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders
          }
        });
      }
    }
    if (runAsync) {
      if (!env.GSAP_WORKFLOW) {
        return new Response(JSON.stringify({
          error: "Workflows not available"
        }), {
          status: 404,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders
          }
        });
      }
      const instance = await env.GSAP_WORKFLOW.create({
        params: {
          url: urlToValidate,
          maxDepth,
          maxPages
        }
      });
      return new Response(JSON.stringify({
        success: true,
        status: "queued",
        instanceId: instance.id
      }), {
        status: 202,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders
        }
      });
    }
    return await handleWebsiteCrawlSync(requestData, env, ctx, corsHeaders);
  } catch (error) {
    console.error("Worker error:", error);
    return new Response(JSON.stringify({
      error: error.message || "Internal server error"
    }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders
      }
    });
  }
}
__name(handleWebsiteCrawl, "handleWebsiteCrawl");
function summarizeCrawlPageResults(pageResults, pageCount) {
  const analyzedCount = pageResults.filter((page) => page.success).length;
  const passedCount = pageResults.filter((page) => page.success && page.passed).length;
  const requestFailureCount = pageResults.filter((page) => !page.success).length;
  const validationFailureCount = pageResults.filter((page) => page.success && !page.passed).length;
  const failedCount = requestFailureCount + validationFailureCount;
  return {
    pageCount,
    analyzedCount,
    passedCount,
    failedCount,
    requestFailureCount,
    validationFailureCount,
    passRate: pageCount > 0 ? Math.round(passedCount / pageCount * 100) : 0
  };
}
__name(summarizeCrawlPageResults, "summarizeCrawlPageResults");
function buildReferrerMap(siteMap) {
  const referrerMap = {};
  if (!siteMap || typeof siteMap !== "object") {
    return referrerMap;
  }
  Object.entries(siteMap).forEach(([sourceKey, entry]) => {
    if (!entry || typeof entry !== "object" || !Array.isArray(entry.links)) {
      return;
    }
    const sourceUrl = typeof entry.url === "string" ? entry.url : sourceKey;
    entry.links.forEach((linkUrl) => {
      if (typeof linkUrl !== "string") {
        return;
      }
      if (!referrerMap[linkUrl]) {
        referrerMap[linkUrl] = [];
      }
      if (!referrerMap[linkUrl].includes(sourceUrl)) {
        referrerMap[linkUrl].push(sourceUrl);
      }
    });
  });
  return referrerMap;
}
__name(buildReferrerMap, "buildReferrerMap");
function finalizeCrawlResponse(url, pageResults, crawlResults, siteMap) {
  const resolvedSiteMap = siteMap || crawlResults?.siteMap;
  const referrerMap = buildReferrerMap(resolvedSiteMap);
  const enrichedPageResults = pageResults.map((page) => {
    const referrers = typeof page?.url === "string" ? referrerMap[page.url] || [] : [];
    return referrers.length > 0 ? {
      ...page,
      referrers
    } : page;
  });
  const pageCount = Array.isArray(crawlResults?.pages) ? crawlResults.pages.length : 0;
  const siteResults = summarizeCrawlPageResults(enrichedPageResults, pageCount);
  const crawlStats = {
    ...(crawlResults?.crawlStats || {}),
    partial: Boolean(crawlResults?.partial),
    truncatedByPageLimit: Boolean(crawlResults?.crawlStats?.maxPages) && pageCount >= crawlResults.crawlStats.maxPages
  };
  const incomplete = crawlStats.partial || crawlStats.truncatedByPageLimit;
  const error = crawlResults?.error || (crawlStats.truncatedByPageLimit ? "Validation stopped before the full project could be analyzed. Increase maxPages and retry." : void 0);
  const results = {
    url,
    success: true,
    passed: siteResults.failedCount === 0 && siteResults.analyzedCount === siteResults.pageCount && siteResults.pageCount > 0 && !incomplete,
    siteResults: {
      ...siteResults,
      incomplete
    },
    pageResults: enrichedPageResults,
    siteMap: resolvedSiteMap,
    crawlStats,
    ...(error ? { error } : {})
  };
  results.markdown = generateMarkdownReport(results);
  return results;
}
__name(finalizeCrawlResponse, "finalizeCrawlResponse");
async function handleWebsiteCrawlSync(requestData, env, ctx, corsHeaders) {
  let urlToValidate = requestData.url || "";
  const maxDepth = requestData.maxDepth || 10;
  const maxPages = requestData.maxPages || 1000;
  try {
    urlToValidate = normalizePublishedSiteUrl(urlToValidate);
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message || "Invalid URL provided" }), {
      status: 400,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders
      }
    });
  }
  try {
    const crawlResults = await crawlWebsite(urlToValidate, {
      maxDepth,
      maxPages,
      timeout: 24e4
    });
    const pages = crawlResults.pages || [];
    const pageResults = [];
    for (const page of pages) {
      try {
        if (page.error) {
          pageResults.push({
            url: page.url,
            success: false,
            error: page.error
          });
          continue;
        }
        const response = await fetch(page.url);
        if (!response.ok) {
          throw new Error(`HTTP error: ${response.status}`);
        }
        const html = await response.text();
        const validationResult = await validateGsapUsage(html, page.url);
        pageResults.push({
          url: page.url,
          title: page.title,
          success: true,
          passed: validationResult.passed,
          summary: validationResult.summary,
          details: validationResult.details,
          flaggedCodeCount: validationResult.summary.flaggedCodeCount || 0
        });
      } catch (pageError) {
        pageResults.push({
          url: page.url,
          success: false,
          error: pageError.message
        });
      }
    }
    const results = finalizeCrawlResponse(urlToValidate, pageResults, crawlResults, crawlResults.siteMap);
    return new Response(JSON.stringify(results), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      error: error.message,
      success: false
    }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders
      }
    });
  }
}
__name(handleWebsiteCrawlSync, "handleWebsiteCrawlSync");
async function handleGsapValidation(requestData, env, ctx, corsHeaders) {
  let urlToValidate = requestData.url || "";
  const maxDepth = requestData.maxDepth || 10;
  const maxPages = requestData.maxPages || 1000;
  try {
    urlToValidate = normalizePublishedSiteUrl(urlToValidate);
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message || "Invalid URL provided" }), {
      status: 400,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders
      }
    });
  }
  const results = {
    siteUrl: urlToValidate,
    totalPagesFound: 0,
    validatedPages: 0,
    passedPages: 0,
    failedPages: 0,
    pageResults: [],
    crawlMethod: "unknown"
  };
  try {
    const crawlResults = await crawlWebsite(urlToValidate, {
      maxDepth,
      maxPages,
      timeout: 2e4
      // 20 seconds max for entire crawl operation
    });
    results.totalPagesFound = crawlResults.pages.length;
    results.crawlMethod = "multi-page";
    results.crawlIncomplete = Boolean(crawlResults.partial) || Boolean(crawlResults.crawlStats?.maxPages) && crawlResults.pages.length >= crawlResults.crawlStats.maxPages;
    const pagesToValidate = crawlResults.pages.filter((page) => !page.error);
    results.failedPages += crawlResults.pages.length - pagesToValidate.length;
    const PAGE_BATCH_SIZE = 5;
    const pageBatches = [];
    for (let i = 0; i < pagesToValidate.length; i += PAGE_BATCH_SIZE) {
      pageBatches.push(pagesToValidate.slice(i, i + PAGE_BATCH_SIZE));
    }
    for (const batch of pageBatches) {
      const pagePromises = batch.map(async (page) => {
        try {
          const response = await fetch(page.url);
          if (!response.ok) {
            throw new Error(`HTTP error: ${response.status}`);
          }
          const html = await response.text();
          const validationResults = await validateGsapUsage(html, page.url);
          results.validatedPages++;
          if (validationResults.summary.passed) {
            results.passedPages++;
          } else {
            results.failedPages++;
          }
          return {
            url: page.url,
            success: true,
            passed: validationResults.summary.passed,
            flaggedCodeCount: validationResults.summary.flaggedCodeCount,
            summary: validationResults.summary,
            details: validationResults.details
          };
        } catch (pageError) {
          results.validatedPages++;
          results.failedPages++;
          return {
            url: page.url,
            success: false,
            error: pageError.message
          };
        }
      });
      const batchResults = await Promise.all(pagePromises);
      results.pageResults.push(...batchResults);
    }
  } catch (crawlError) {
    console.log("Crawling failed, falling back to single URL validation:", crawlError.message);
    try {
      results.crawlMethod = "single-page-fallback";
      const response = await fetch(urlToValidate);
      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }
      const html = await response.text();
      const validationResults = await validateGsapUsage(html, urlToValidate);
      results.totalPagesFound = 1;
      results.validatedPages = 1;
      if (validationResults.summary.passed) {
        results.passedPages = 1;
        results.failedPages = 0;
      } else {
        results.passedPages = 0;
        results.failedPages = 1;
      }
      results.pageResults.push({
        url: urlToValidate,
        success: true,
        passed: validationResults.summary.passed,
        flaggedCodeCount: validationResults.summary.flaggedCodeCount,
        summary: validationResults.summary,
        details: validationResults.details
      });
    } catch (validationError) {
      results.crawlMethod = "failed";
      results.error = validationError.message;
      results.crawlError = crawlError.message;
    }
  }
  results.passRate = results.validatedPages > 0 ? Math.round(results.passedPages / results.validatedPages * 100) : 0;
  results.passed = results.failedPages === 0 && results.validatedPages > 0 && !results.crawlIncomplete;
  results.markdown = generateMarkdownReport(results);
  return new Response(JSON.stringify(results), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders
    }
  });
}
__name(handleGsapValidation, "handleGsapValidation");
export {
  GsapValidationWorkflow,
  worker_default as default
};
//# sourceMappingURL=worker.js.map
