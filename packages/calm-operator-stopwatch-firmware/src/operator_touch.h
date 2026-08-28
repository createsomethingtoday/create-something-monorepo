#pragma once

#include <cstddef>

namespace calm_operator {

// Treat a stationary release as deliberate. This accepts a normal press-and-hold
// without interpreting a flick or drag as an operator action.
inline constexpr bool isDeliberateTouchRelease(bool released, bool flicked, bool dragged) {
  return released && !flicked && !dragged;
}

enum class ActionTouchTarget { None, Review, Next };

inline constexpr ActionTouchTarget actionTouchTarget(int x, int y, std::size_t decision_count) {
  return y < 115 || y > 342
             ? ActionTouchTarget::None
         : decision_count > 1 && y >= 294 && x >= 334
             ? ActionTouchTarget::Next
             : ActionTouchTarget::Review;
}

}  // namespace calm_operator
