#include <cassert>
#include <string>

#include "../src/operator_diagnostics.h"
#include "../src/operator_buttons.h"
#include "../src/operator_receipt.h"
#include "../src/operator_state.h"
#include "../src/operator_touch.h"
#include "../src/operator_ui.h"
#include "../src/operator_voice.h"

using namespace calm_operator;

int main() {
  assert(std::string(connectionLabel(true)) == "LINK LIVE");
  assert(std::string(connectionLabel(false)) == "LINK WAIT");
  assert(linkConfirmed(true, true));
  assert(!linkConfirmed(true, false));
  assert(!linkConfirmed(false, true));
  assert(std::string(attentionLabel(0)) == "CLEAR TO MONITOR");
  assert(std::string(attentionLabel(2)) == "02 AWAITING INPUT");
  assert(std::string(decisionModeLabel(false)) == "REVIEW REQUIRED");
  assert(std::string(decisionModeLabel(true)) == "SPEAK + REVIEW");
  assert(std::string(actionPositionLabel(0, 1)) == "ACTION 1 / 1");
  assert(std::string(actionPositionLabel(1, 2)) == "ACTION 2 / 2");
  assert(std::string(readOnlyReasonLabel(ControlReason::PaginatedHistory)) ==
         "VIEW ONLY / PAGINATED HISTORY");
  assert(std::string(readOnlyReasonLabel(ControlReason::RecentDesktopActivity)) ==
         "VIEW ONLY / RECENT DESKTOP ACTIVITY");
  const char utf8_review[] = "abcd\xE7\xA2\xBA\xE8\xAA\x8D";
  assert(nextUtf8LineEnd(utf8_review, sizeof(utf8_review) - 1, 0, 5) == 4);
  assert(nextUtf8LineEnd(utf8_review, sizeof(utf8_review) - 1, 4, 5) == 7);
  const OperatorTaskSnapshot task_snapshots[] = {
      {true, false, false, false},
      {false, true, false, true},
      {false, false, true, false},
      {false, false, false, false},
  };
  const auto task_counts = summarizeOperatorTasks(task_snapshots, 4);
  assert(task_counts.total == 3);
  assert(task_counts.attention == 1);
  assert(task_counts.running == 1);
  assert(task_counts.read_only == 1);
  assert(isWithinDisplaySafeCircle(86, 92));
  assert(isWithinDisplaySafeCircle(380, 92));
  assert(isWithinDisplaySafeCircle(88, 394));
  assert(isWithinDisplaySafeCircle(378, 394));
  assert(!isWithinDisplaySafeCircle(42, 42));
  assert(!isWithinDisplaySafeCircle(424, 402));

  assert(std::string(heartbeatDiagnostic(true)) == "[operator] heartbeat accepted");
  assert(std::string(heartbeatDiagnostic(false)) == "[operator] heartbeat rejected");
  assert(std::string(bridgeFailureDiagnostic(BridgeFailure::WiFiUnavailable)) ==
         "[operator] bridge unavailable: wifi");
  assert(std::string(bridgeFailureDiagnostic(BridgeFailure::TlsSetup)) ==
         "[operator] bridge unavailable: tls");
  assert(std::string(bridgeFailureDiagnostic(BridgeFailure::Http)) ==
         "[operator] bridge unavailable: http");
  assert(std::string(bridgeFailureDiagnostic(BridgeFailure::InvalidJson)) ==
         "[operator] bridge unavailable: invalid-json");

  assert(kStopwatchButtonAPin == 2);
  assert(kStopwatchButtonBPin == 1);
  assert(stopwatchButtonInputUsesPullup());
  int configured_button_pins[2] = {};
  int configured_button_count = 0;
  configureStopwatchButtonPullups([&](int pin) {
    configured_button_pins[configured_button_count++] = pin;
  });
  assert(configured_button_count == 2);
  assert(configured_button_pins[0] == kStopwatchButtonAPin);
  assert(configured_button_pins[1] == kStopwatchButtonBPin);

  assert(std::string(deliveryReceiptPresentation(DeliveryReceiptState::Queued).title) == "QUEUED");
  assert(std::string(deliveryReceiptPresentation(DeliveryReceiptState::Delivered).title) ==
         "DELIVERED");
  assert(std::string(deliveryReceiptPresentation(DeliveryReceiptState::Failed).title) ==
         "DELIVERY FAILED");
  assert(shouldPollDeliveryReceipt(true, DeliveryReceiptState::Queued));
  assert(!shouldPollDeliveryReceipt(true, DeliveryReceiptState::Delivered));
  assert(!shouldPollDeliveryReceipt(true, DeliveryReceiptState::Failed));
  assert(!shouldPollDeliveryReceipt(false, DeliveryReceiptState::Queued));

  assert(isDeliberateTouchRelease(true, false, false));
  assert(!isDeliberateTouchRelease(false, false, false));
  assert(!isDeliberateTouchRelease(true, true, false));
  assert(!isDeliberateTouchRelease(true, false, true));
  assert(actionTouchTarget(200, 318, 2) == ActionTouchTarget::Review);
  assert(actionTouchTarget(370, 318, 2) == ActionTouchTarget::Next);
  assert(actionTouchTarget(370, 318, 1) == ActionTouchTarget::Review);
  assert(actionTouchTarget(200, 270, 2) == ActionTouchTarget::None);

  assert(kVoiceSampleRateHz == 16000);
  assert(kVoiceMaxDurationSeconds == 10);
  assert(kVoiceMaxSamples == 160000);
  assert(kVoiceMaxRawBytes == 320000);
  assert(shouldStopVoiceRecording(true, true, true));
  assert(shouldStopVoiceRecording(true, false, false));
  assert(!shouldStopVoiceRecording(true, false, true));
  assert(!shouldStopVoiceRecording(false, true, false));
  assert(shouldRedrawVoiceCommandPoll(true));
  assert(!shouldRedrawVoiceCommandPoll(false));
  assert(shouldPollVoiceCommand(true, true));
  assert(!shouldPollVoiceCommand(true, false));
  assert(!shouldPollVoiceCommand(false, true));

  std::string voice_payload = "{\"agent_id\":\"test\"";
  const std::string audio_base64(71680, 'A');
  appendVoiceBase64JsonField(
      [&voice_payload](const char* fragment) { voice_payload += fragment; },
      audio_base64.c_str());
  assert(voice_payload.size() > audio_base64.size());
  assert(voice_payload.find("\"audio_base64\":\"") != std::string::npos);
  assert(voice_payload.compare(voice_payload.size() - 2, 2, "\"}") == 0);

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
  const auto transcript_ready = transition(state, Event::TranscriptReady);
  assert(state.screen == Screen::VoiceReview);
  assert(state.has_transcript);
  assert(shouldRedrawVoiceCommandPoll(transcript_ready.changed));
  assert(transition(state, Event::Confirm).submit_voice_decision);

  transition(state, Event::Submitted);
  assert(state.screen == Screen::Receipt);
  return 0;
}
