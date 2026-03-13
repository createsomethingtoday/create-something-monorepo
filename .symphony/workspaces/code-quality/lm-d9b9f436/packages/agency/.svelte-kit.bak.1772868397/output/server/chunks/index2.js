function generateId(prefix = "fn") {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 6);
  return `${prefix}_${timestamp}_${random}`;
}
function calculateConversionRate(numerator, denominator) {
  if (denominator === 0) return 0;
  return numerator / denominator * 100;
}
function formatCurrency(amount) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0
  }).format(amount);
}
function formatNumber(num) {
  if (num >= 1e6) {
    return (num / 1e6).toFixed(1) + "M";
  }
  if (num >= 1e3) {
    return (num / 1e3).toFixed(1) + "K";
  }
  return num.toString();
}
function formatPercent(rate) {
  return rate.toFixed(1) + "%";
}
function getDeltaIndicator(delta) {
  if (delta > 0) return `+${delta.toFixed(1)}%`;
  if (delta < 0) return `${delta.toFixed(1)}%`;
  return "0%";
}
export {
  formatNumber as a,
  getDeltaIndicator as b,
  calculateConversionRate as c,
  formatPercent as d,
  formatCurrency as f,
  generateId as g
};
