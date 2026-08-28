#pragma once

namespace calm_operator {

// M5StopWatch's two user buttons are active-low GPIO inputs. The vendor
// firmware configures their internal pull-ups explicitly.
constexpr int kStopwatchButtonAPin = 2;
constexpr int kStopwatchButtonBPin = 1;

inline constexpr bool stopwatchButtonInputUsesPullup() {
  return true;
}

template <typename ConfigurePullup>
inline void configureStopwatchButtonPullups(ConfigurePullup configure_pullup) {
  configure_pullup(kStopwatchButtonAPin);
  configure_pullup(kStopwatchButtonBPin);
}

}  // namespace calm_operator
