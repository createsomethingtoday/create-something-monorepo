#include <cassert>

#include "../src/operator_state.h"

using namespace calm_operator;

int main() {
  State state;
  transition(state, Event::OpenAgents);
  assert(state.screen == Screen::Agents);

  transition(state, Event::NextAgent, {}, 3);
  assert(state.agent_index == 1);
  transition(state, Event::PreviousAgent, {}, 3);
  assert(state.agent_index == 0);

  auto unsafe = transition(state, Event::ChooseDecision, {false, false});
  assert(state.screen == Screen::Agents);
  assert(unsafe.error != nullptr);

  auto button = transition(state, Event::ChooseDecision, {true, false});
  assert(state.screen == Screen::DecisionConfirm);
  assert(button.haptic);
  assert(transition(state, Event::Confirm).submit_button_decision);

  transition(state, Event::Cancel);
  transition(state, Event::ChooseDecision, {true, true});
  assert(state.screen == Screen::VoiceRecord);
  assert(transition(state, Event::StartRecording).start_recording);
  assert(transition(state, Event::StopRecording).stop_recording);
  transition(state, Event::TranscriptReady);
  assert(state.screen == Screen::VoiceReview);
  assert(state.has_transcript);
  assert(transition(state, Event::Confirm).submit_voice_decision);

  transition(state, Event::Submitted);
  assert(state.screen == Screen::Receipt);
  return 0;
}
