#pragma once

#include <cstddef>

namespace calm_operator {

inline constexpr bool isWithinDisplaySafeCircle(int x, int y) {
  return (x - 233) * (x - 233) + (y - 233) * (y - 233) <= 223 * 223;
}

inline constexpr const char* connectionLabel(bool connected) {
  return connected ? "LINK LIVE" : "LINK WAIT";
}

inline constexpr bool linkConfirmed(bool wifi_connected, bool bridge_confirmed) {
  return wifi_connected && bridge_confirmed;
}

inline constexpr const char* attentionLabel(std::size_t count) {
  return count == 0 ? "CLEAR TO MONITOR"
         : count == 1 ? "01 AWAITING INPUT"
         : count == 2 ? "02 AWAITING INPUT"
         : count == 3 ? "03 AWAITING INPUT"
         : count == 4 ? "04 AWAITING INPUT"
         : count == 5 ? "05 AWAITING INPUT"
         : count == 6 ? "06 AWAITING INPUT"
         : count == 7 ? "07 AWAITING INPUT"
                      : "08 AWAITING INPUT";
}

inline constexpr const char* decisionModeLabel(bool requires_text) {
  return requires_text ? "SPEAK + REVIEW" : "REVIEW REQUIRED";
}

inline const char* actionPositionLabel(std::size_t index, std::size_t count) {
  static const char* labels[6][6] = {
      {"ACTION 1 / 1", "ACTION 1 / 2", "ACTION 1 / 3", "ACTION 1 / 4", "ACTION 1 / 5",
       "ACTION 1 / 6"},
      {"ACTION 2 / 1", "ACTION 2 / 2", "ACTION 2 / 3", "ACTION 2 / 4", "ACTION 2 / 5",
       "ACTION 2 / 6"},
      {"ACTION 3 / 1", "ACTION 3 / 2", "ACTION 3 / 3", "ACTION 3 / 4", "ACTION 3 / 5",
       "ACTION 3 / 6"},
      {"ACTION 4 / 1", "ACTION 4 / 2", "ACTION 4 / 3", "ACTION 4 / 4", "ACTION 4 / 5",
       "ACTION 4 / 6"},
      {"ACTION 5 / 1", "ACTION 5 / 2", "ACTION 5 / 3", "ACTION 5 / 4", "ACTION 5 / 5",
       "ACTION 5 / 6"},
      {"ACTION 6 / 1", "ACTION 6 / 2", "ACTION 6 / 3", "ACTION 6 / 4", "ACTION 6 / 5",
       "ACTION 6 / 6"}};
  const std::size_t safe_index = index < 6 ? index : 5;
  const std::size_t safe_count = count > 0 && count <= 6 ? count : 6;
  return labels[safe_index][safe_count - 1];
}

enum class ControlReason {
  Actionable,
  PaginatedHistory,
  RecentDesktopActivity,
  RuntimeNotIdle,
  Unknown,
};

inline const char* readOnlyReasonLabel(ControlReason reason) {
  switch (reason) {
    case ControlReason::PaginatedHistory:
      return "VIEW ONLY / PAGINATED HISTORY";
    case ControlReason::RecentDesktopActivity:
      return "VIEW ONLY / RECENT DESKTOP ACTIVITY";
    case ControlReason::RuntimeNotIdle:
      return "VIEW ONLY / DESKTOP ACTIVE";
    case ControlReason::Actionable:
      return "ACTION AVAILABLE";
    case ControlReason::Unknown:
      return "VIEW ONLY / NO SAFE ACTION";
  }
  return "VIEW ONLY / NO SAFE ACTION";
}

inline std::size_t nextUtf8LineEnd(
    const char* text,
    std::size_t byte_length,
    std::size_t start,
    std::size_t maximum_bytes) {
  if (start >= byte_length) return byte_length;
  std::size_t end =
      start + maximum_bytes < byte_length ? start + maximum_bytes : byte_length;
  while (end > start && end < byte_length &&
         (static_cast<unsigned char>(text[end]) & 0xC0) == 0x80) {
    --end;
  }
  return end > start ? end : byte_length;
}

struct OperatorTaskSnapshot {
  bool synthetic_new_task;
  bool needs_input;
  bool working;
  bool actionable;
};

struct OperatorTaskCounts {
  std::size_t total = 0;
  std::size_t attention = 0;
  std::size_t running = 0;
  std::size_t read_only = 0;
};

inline OperatorTaskCounts summarizeOperatorTasks(
    const OperatorTaskSnapshot* tasks,
    std::size_t count) {
  OperatorTaskCounts result;
  for (std::size_t index = 0; index < count; ++index) {
    const auto& task = tasks[index];
    if (task.synthetic_new_task) continue;
    ++result.total;
    if (task.needs_input) ++result.attention;
    if (task.working) ++result.running;
    if (!task.working && !task.actionable) ++result.read_only;
  }
  return result;
}

}  // namespace calm_operator
