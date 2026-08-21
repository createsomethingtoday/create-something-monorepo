#pragma once

#include <cstddef>

namespace calm_operator {

enum class Screen {
  Dashboard,
  Agents,
  DecisionConfirm,
  VoiceRecord,
  VoiceReview,
  Receipt
};

enum class Event {
  OpenAgents,
  NextAgent,
  PreviousAgent,
  ChooseDecision,
  StartRecording,
  StopRecording,
  TranscriptReady,
  Confirm,
  Cancel,
  Submitted
};

struct DecisionPolicy {
  bool remote_safe = false;
  bool requires_text = false;

  constexpr DecisionPolicy(bool remote_safe_value = false, bool requires_text_value = false)
      : remote_safe(remote_safe_value), requires_text(requires_text_value) {}
};

struct State {
  Screen screen = Screen::Dashboard;
  std::size_t agent_index = 0;
  bool has_transcript = false;
};

struct Effect {
  bool changed = false;
  bool haptic = false;
  bool start_recording = false;
  bool stop_recording = false;
  bool submit_button_decision = false;
  bool submit_voice_decision = false;
  const char* error = nullptr;
};

inline Effect transition(
    State& state,
    Event event,
    DecisionPolicy policy = {},
    std::size_t agent_count = 0) {
  Effect effect;
  switch (event) {
    case Event::OpenAgents:
      state.screen = Screen::Agents;
      state.agent_index = 0;
      effect.changed = true;
      break;
    case Event::NextAgent:
      if (agent_count > 0) state.agent_index = (state.agent_index + 1) % agent_count;
      effect.changed = true;
      break;
    case Event::PreviousAgent:
      if (agent_count > 0) state.agent_index = (state.agent_index + agent_count - 1) % agent_count;
      effect.changed = true;
      break;
    case Event::ChooseDecision:
      if (!policy.remote_safe) {
        effect.error = "Desktop approval required";
        effect.haptic = true;
        break;
      }
      state.has_transcript = false;
      state.screen = policy.requires_text ? Screen::VoiceRecord : Screen::DecisionConfirm;
      effect.changed = true;
      effect.haptic = true;
      break;
    case Event::StartRecording:
      if (state.screen == Screen::VoiceRecord) {
        effect.start_recording = true;
        effect.haptic = true;
      }
      break;
    case Event::StopRecording:
      if (state.screen == Screen::VoiceRecord) {
        effect.stop_recording = true;
        effect.haptic = true;
      }
      break;
    case Event::TranscriptReady:
      if (state.screen == Screen::VoiceRecord) {
        state.has_transcript = true;
        state.screen = Screen::VoiceReview;
        effect.changed = true;
        effect.haptic = true;
      }
      break;
    case Event::Confirm:
      if (state.screen == Screen::DecisionConfirm) {
        effect.submit_button_decision = true;
        effect.haptic = true;
      } else if (state.screen == Screen::VoiceReview && state.has_transcript) {
        effect.submit_voice_decision = true;
        effect.haptic = true;
      }
      break;
    case Event::Cancel:
      state.screen = Screen::Agents;
      state.has_transcript = false;
      effect.changed = true;
      break;
    case Event::Submitted:
      state.screen = Screen::Receipt;
      effect.changed = true;
      effect.haptic = true;
      break;
  }
  return effect;
}

}  // namespace calm_operator
