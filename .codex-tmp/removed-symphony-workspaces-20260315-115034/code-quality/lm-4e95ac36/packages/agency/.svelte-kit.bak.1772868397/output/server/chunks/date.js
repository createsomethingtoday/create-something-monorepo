function getStartOfWeek(date, timezone) {
  const d = new Date(date);
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "short"
  });
  while (formatter.format(d).toLowerCase() !== "mon") {
    d.setDate(d.getDate() - 1);
  }
  d.setHours(0, 0, 0, 0);
  return d;
}
function getWeekNumber(date, timezone) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric"
  });
  const year = formatter.format(date);
  const startOfYear = new Date(parseInt(year), 0, 1);
  const days = Math.floor((date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1e3));
  const weekNum = Math.ceil((days + startOfYear.getDay() + 1) / 7);
  return `${year}-W${weekNum.toString().padStart(2, "0")}`;
}
export {
  getWeekNumber as a,
  getStartOfWeek as g
};
