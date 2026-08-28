#pragma once

#include <cstddef>
#include <cstdint>

namespace calm_operator {

constexpr size_t kVoiceSampleRateHz = 16000;
constexpr size_t kVoiceMaxDurationSeconds = 10;
constexpr size_t kVoiceMaxSamples = kVoiceSampleRateHz * kVoiceMaxDurationSeconds;
constexpr size_t kVoiceMaxRawBytes = kVoiceMaxSamples * sizeof(int16_t);

constexpr bool shouldStopVoiceRecording(
    bool is_recording,
    bool button_was_released,
    bool button_is_pressed) {
  return is_recording && (button_was_released || !button_is_pressed);
}

constexpr bool shouldRedrawVoiceCommandPoll(bool command_state_changed) {
  return command_state_changed;
}

constexpr bool shouldPollVoiceCommand(bool has_command, bool is_voice_record_screen) {
  return has_command && is_voice_record_screen;
}

template <typename AppendFragment>
inline void appendVoiceBase64JsonField(AppendFragment append_fragment, const char* audio_base64) {
  append_fragment(",\"audio_base64\":\"");
  append_fragment(audio_base64);
  append_fragment("\"}");
}

}  // namespace calm_operator
