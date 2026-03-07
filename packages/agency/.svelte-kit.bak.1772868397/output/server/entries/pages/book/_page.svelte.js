import { a7 as attr_class, a4 as attr, a6 as escape_html, aa as ensure_array_like } from "../../../chunks/index.js";
import { S as SEO } from "../../../chunks/SEO.js";
function DatePicker($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { availableDates, loading = false } = $$props;
    let currentMonth = /* @__PURE__ */ new Date();
    const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const today = (() => {
      const d = /* @__PURE__ */ new Date();
      d.setHours(0, 0, 0, 0);
      return d;
    })();
    const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
    const calendarDays = (() => {
      const days = [];
      const startDay = monthStart.getDay();
      for (let i = 0; i < startDay; i++) {
        days.push(null);
      }
      for (let d = 1; d <= monthEnd.getDate(); d++) {
        days.push(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), d));
      }
      return days;
    })();
    function formatDateKey(date) {
      return date.toISOString().split("T")[0];
    }
    function isDateAvailable(date) {
      if (!availableDates) return true;
      return availableDates.has(formatDateKey(date));
    }
    function isToday(date) {
      return formatDateKey(date) === formatDateKey(today);
    }
    function isSelected(date) {
      return false;
    }
    function isPast(date) {
      return date < today;
    }
    const canGoPrevious = currentMonth.getFullYear() > today.getFullYear() || currentMonth.getFullYear() === today.getFullYear() && currentMonth.getMonth() > today.getMonth();
    $$renderer2.push(`<div${attr_class("date-picker svelte-1mtgnq0", void 0, { "loading": loading })}><div class="month-header svelte-1mtgnq0"><button type="button" class="nav-button svelte-1mtgnq0"${attr("disabled", !canGoPrevious, true)} aria-label="Previous month"><span class="arrow svelte-1mtgnq0">←</span></button> <span class="month-label svelte-1mtgnq0">${escape_html(currentMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" }))}</span> <button type="button" class="nav-button svelte-1mtgnq0" aria-label="Next month"><span class="arrow svelte-1mtgnq0">→</span></button></div> <div class="weekdays svelte-1mtgnq0"><!--[-->`);
    const each_array = ensure_array_like(weekdays);
    for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
      let day = each_array[$$index];
      $$renderer2.push(`<span class="weekday svelte-1mtgnq0">${escape_html(day)}</span>`);
    }
    $$renderer2.push(`<!--]--></div> <div class="days-grid svelte-1mtgnq0"><!--[-->`);
    const each_array_1 = ensure_array_like(calendarDays);
    for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
      let day = each_array_1[$$index_1];
      if (day === null) {
        $$renderer2.push("<!--[-->");
        $$renderer2.push(`<span class="day empty svelte-1mtgnq0"></span>`);
      } else {
        $$renderer2.push("<!--[!-->");
        $$renderer2.push(`<button type="button"${attr_class("day svelte-1mtgnq0", void 0, {
          "today": isToday(day),
          "selected": isSelected(),
          "past": isPast(day),
          "unavailable": !isPast(day) && !isDateAvailable(day)
        })}${attr("disabled", isPast(day) || !isDateAvailable(day), true)}${attr("aria-label", day.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }))}${attr("aria-pressed", isSelected())}>${escape_html(day.getDate())}</button>`);
      }
      $$renderer2.push(`<!--]-->`);
    }
    $$renderer2.push(`<!--]--></div> `);
    if (loading) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="loading-overlay svelte-1mtgnq0"><span class="loading-text svelte-1mtgnq0">Loading availability...</span></div>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--></div>`);
  });
}
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let step = "date";
    let loadingSlots = false;
    let availableDates = /* @__PURE__ */ new Set();
    const steps = [
      { key: "date", label: "Date" },
      { key: "time", label: "Time" },
      { key: "details", label: "Details" },
      { key: "confirm", label: "Confirm" }
    ];
    const currentStepIndex = steps.findIndex((s) => s.key === step);
    SEO($$renderer2, {
      title: "Book a Workflow Mapping Session",
      description: "Schedule a workflow mapping session to identify the highest-risk workflow, the safest starting wedge, and the right level of reliability control.",
      propertyName: "agency"
    });
    $$renderer2.push(`<!----> <main class="booking-page svelte-17et19q"><header class="booking-header svelte-17et19q"><h1 class="booking-title svelte-17et19q">Book a Workflow Mapping Session</h1> <p class="booking-subtitle svelte-17et19q">Bring the workflow with the most drag or risk. We’ll map the safest starting wedge together.</p></header> `);
    {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<nav class="progress svelte-17et19q" aria-label="Booking progress"><!--[-->`);
      const each_array = ensure_array_like(steps.slice(0, 3));
      for (let i = 0, $$length = each_array.length; i < $$length; i++) {
        let s = each_array[i];
        $$renderer2.push(`<div${attr_class("progress-step svelte-17et19q", void 0, {
          "active": i === currentStepIndex,
          "complete": i < currentStepIndex
        })}${attr("aria-current", i === currentStepIndex ? "step" : void 0)}><span class="step-number svelte-17et19q">${escape_html(i + 1)}</span> <span class="step-label svelte-17et19q">${escape_html(s.label)}</span></div> `);
        if (i < 2) {
          $$renderer2.push("<!--[-->");
          $$renderer2.push(`<div${attr_class("progress-line svelte-17et19q", void 0, { "complete": i < currentStepIndex })}></div>`);
        } else {
          $$renderer2.push("<!--[!-->");
        }
        $$renderer2.push(`<!--]-->`);
      }
      $$renderer2.push(`<!--]--></nav>`);
    }
    $$renderer2.push(`<!--]--> <div class="booking-content svelte-17et19q">`);
    {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<section class="step-content svelte-17et19q"><h2 class="step-title svelte-17et19q">Select a date</h2> `);
      DatePicker($$renderer2, {
        availableDates,
        loading: loadingSlots
      });
      $$renderer2.push(`<!----> `);
      {
        $$renderer2.push("<!--[!-->");
      }
      $$renderer2.push(`<!--]--></section>`);
    }
    $$renderer2.push(`<!--]--></div> `);
    {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<footer class="booking-footer svelte-17et19q"><p class="fallback-text svelte-17et19q">Having trouble? <a href="https://savvycal.com/createsomething/together" target="_blank" rel="noopener noreferrer" class="fallback-link svelte-17et19q">Book directly on SavvyCal →</a></p></footer>`);
    }
    $$renderer2.push(`<!--]--></main>`);
  });
}
export {
  _page as default
};
