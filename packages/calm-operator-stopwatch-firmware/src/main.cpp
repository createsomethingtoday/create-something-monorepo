#include <Arduino.h>
#include <ArduinoJson.h>
#include <HTTPClient.h>
#include <M5Unified.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <esp_heap_caps.h>
#include <mbedtls/base64.h>

#include "operator_state.h"
#include "trust_roots.h"

#if __has_include("operator_config.local.h")
#include "operator_config.local.h"
#else
#include "operator_config.example.h"
#endif

namespace {

using calm_operator::DecisionPolicy;
using calm_operator::Event;
using calm_operator::Screen;
using calm_operator::State;

constexpr char FIRMWARE_VERSION[] = "0.3.0-stopwatch";
constexpr uint32_t CONSOLE_POLL_MS = 15000;
constexpr uint32_t HEARTBEAT_MS = 5 * 60 * 1000;
constexpr uint32_t VOICE_POLL_MS = 1500;
constexpr size_t MAX_AGENTS = 8;
constexpr size_t MAX_DECISIONS = 6;
constexpr size_t RECORD_SAMPLE_RATE = 16000;
constexpr size_t RECORD_MAX_SAMPLES = RECORD_SAMPLE_RATE * 3;
constexpr size_t RECORD_BLOCK_SAMPLES = 256;

struct Decision {
  String id;
  String kind;
  String label;
  String description;
  bool requires_text = false;
  bool remote_safe = false;
};

struct Agent {
  String id;
  String label;
  String provider;
  String status;
  String phase;
  String summary;
  uint32_t progress_version = 0;
  bool needs_input = false;
  Decision decisions[MAX_DECISIONS];
  size_t decision_count = 0;
};

State operator_state;
Agent agents[MAX_AGENTS];
size_t agent_count = 0;
size_t decision_index = 0;
String bridge_error;
String receipt_text;
String voice_command_id;
String voice_transcript;
bool recording = false;
int16_t* recording_data = nullptr;
size_t recorded_samples = 0;
uint32_t last_console_poll = 0;
uint32_t last_heartbeat = 0;
uint32_t last_voice_poll = 0;

String clipped(const String& value, size_t maximum) {
  if (value.length() <= maximum) return value;
  return value.substring(0, maximum - 1) + "…";
}

void haptic(uint8_t strength = 110) {
  M5.Power.setVibration(strength);
  delay(35);
  M5.Power.setVibration(0);
}

void tone(uint16_t frequency = 5000, uint32_t duration = 35) {
  if (M5.Mic.isEnabled()) return;
  M5.Speaker.tone(frequency, duration);
}

void applyEffect(const calm_operator::Effect& effect) {
  if (effect.haptic) haptic();
  if (effect.error) {
    bridge_error = effect.error;
    tone(1400, 80);
  }
}

bool connectWifi() {
  if (WiFi.status() == WL_CONNECTED) return true;
  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(true);
  if (String(CALM_OPERATOR_WIFI_SSID).length()) {
    WiFi.begin(CALM_OPERATOR_WIFI_SSID, CALM_OPERATOR_WIFI_PASSWORD);
  } else {
    WiFi.begin();
  }
  const uint32_t started = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - started < 12000) {
    M5.update();
    delay(40);
  }
  if (WiFi.status() != WL_CONNECTED) return false;
  configTime(0, 0, "time.cloudflare.com", "time.google.com");
  return true;
}

bool requestJson(const char* method, const String& path, const String& body, JsonDocument& response) {
  if (!connectWifi()) {
    bridge_error = "Wi-Fi unavailable";
    return false;
  }
  WiFiClientSecure client;
  client.setCACert(CALM_OPERATOR_GTS_ROOT_R4_CA);
  HTTPClient http;
  const String url = String(CALM_OPERATOR_BRIDGE_ORIGIN) + path;
  if (!http.begin(client, url)) {
    bridge_error = "TLS setup failed";
    return false;
  }
  http.setTimeout(12000);
  http.addHeader("accept", "application/json");
  http.addHeader("x-ink-token", CALM_OPERATOR_DEVICE_TOKEN);
  int status = 0;
  if (strcmp(method, "POST") == 0) {
    http.addHeader("content-type", "application/json");
    status = http.POST(body);
  } else {
    status = http.GET();
  }
  const String payload = http.getString();
  http.end();
  if (status < 200 || status >= 300) {
    bridge_error = "Bridge HTTP " + String(status);
    if (payload.length()) {
      JsonDocument error_doc;
      if (!deserializeJson(error_doc, payload)) {
        bridge_error = clipped(error_doc["error"].as<String>(), 52);
      }
    }
    return false;
  }
  const auto error = deserializeJson(response, payload);
  if (error) {
    bridge_error = "Invalid bridge JSON";
    return false;
  }
  bridge_error = "";
  return true;
}

void parseConsole(JsonDocument& document) {
  agent_count = 0;
  for (JsonObject source : document["agents"].as<JsonArray>()) {
    if (agent_count >= MAX_AGENTS) break;
    Agent& agent = agents[agent_count++];
    agent.id = source["agent_id"].as<String>();
    agent.label = source["label"].as<String>();
    agent.provider = source["provider"].as<String>();
    agent.status = source["status"].as<String>();
    agent.phase = source["phase"].as<String>();
    agent.summary = source["summary"].as<String>();
    agent.progress_version = source["progress_version"] | 0;
    agent.needs_input = source["needs_input"] | false;
    agent.decision_count = 0;
    for (JsonObject candidate : source["decisions"].as<JsonArray>()) {
      if (agent.decision_count >= MAX_DECISIONS) break;
      Decision& decision = agent.decisions[agent.decision_count++];
      decision.id = candidate["id"].as<String>();
      decision.kind = candidate["kind"].as<String>();
      decision.label = candidate["label"].as<String>();
      decision.description = candidate["description"].as<String>();
      decision.requires_text = candidate["requires_text"] | false;
      decision.remote_safe = candidate["remote_safe"] | false;
    }
  }
  if (agent_count == 0) operator_state.agent_index = 0;
  if (operator_state.agent_index >= agent_count && agent_count > 0) operator_state.agent_index = agent_count - 1;
  decision_index = 0;
}

bool refreshConsole() {
  JsonDocument response;
  if (!requestJson("GET", "/operator/agent-console", "", response)) return false;
  parseConsole(response);
  last_console_poll = millis();
  return true;
}

void postHeartbeat() {
  JsonDocument body_doc;
  body_doc["device_id"] = CALM_OPERATOR_DEVICE_ID;
  body_doc["surface"] = CALM_OPERATOR_SURFACE;
  body_doc["firmware_version"] = FIRMWARE_VERSION;
  body_doc["battery_percent"] = M5.Power.getBatteryLevel();
  body_doc["battery_mv"] = M5.Power.getBatteryVoltage();
  body_doc["charging"] = M5.Power.isCharging();
  body_doc["power_mode"] = "amoled-interactive";
  body_doc["payload"]["board"] = "M5StopWatch";
  String body;
  serializeJson(body_doc, body);
  JsonDocument response;
  requestJson("POST", "/operator/device-heartbeat", body, response);
  last_heartbeat = millis();
}

Agent* currentAgent() {
  return agent_count > 0 ? &agents[operator_state.agent_index] : nullptr;
}

Decision* currentDecision() {
  Agent* agent = currentAgent();
  if (!agent || agent->decision_count == 0) return nullptr;
  if (decision_index >= agent->decision_count) decision_index = 0;
  return &agent->decisions[decision_index];
}

bool submitButtonDecision() {
  Agent* agent = currentAgent();
  Decision* decision = currentDecision();
  if (!agent || !decision) return false;
  JsonDocument body_doc;
  body_doc["agent_id"] = agent->id;
  body_doc["progress_version"] = agent->progress_version;
  body_doc["decision_id"] = decision->id;
  body_doc["confirmed"] = true;
  body_doc["device_id"] = CALM_OPERATOR_DEVICE_ID;
  body_doc["idempotency_key"] = String(CALM_OPERATOR_DEVICE_ID) + ":" + agent->id + ":" +
                                 String(agent->progress_version) + ":" + decision->id + ":" +
                                 String(millis());
  String body;
  serializeJson(body_doc, body);
  JsonDocument response;
  if (!requestJson("POST", "/operator/agent-decision", body, response)) return false;
  receipt_text = "Queued " + decision->label;
  applyEffect(calm_operator::transition(operator_state, Event::Submitted));
  return true;
}

void startRecording() {
  if (!recording_data) {
    recording_data = static_cast<int16_t*>(
        heap_caps_malloc(RECORD_MAX_SAMPLES * sizeof(int16_t), MALLOC_CAP_8BIT));
  }
  if (!recording_data) {
    bridge_error = "Audio memory unavailable";
    return;
  }
  recorded_samples = 0;
  voice_command_id = "";
  voice_transcript = "";
  M5.Speaker.end();
  M5.Mic.begin();
  recording = true;
}

bool postVoiceRecording() {
  if (recorded_samples < RECORD_SAMPLE_RATE / 4) {
    bridge_error = "Hold longer to speak";
    return false;
  }
  size_t encoded_size = 4 * ((recorded_samples * sizeof(int16_t) + 2) / 3);
  auto* encoded = static_cast<unsigned char*>(
      heap_caps_malloc(encoded_size + 1, MALLOC_CAP_8BIT));
  if (!encoded) {
    bridge_error = "Encoding memory unavailable";
    return false;
  }
  size_t written = 0;
  const int result = mbedtls_base64_encode(
      encoded,
      encoded_size + 1,
      &written,
      reinterpret_cast<const unsigned char*>(recording_data),
      recorded_samples * sizeof(int16_t));
  if (result != 0) {
    heap_caps_free(encoded);
    bridge_error = "Audio encoding failed";
    return false;
  }
  encoded[written] = '\0';

  Agent* agent = currentAgent();
  Decision* decision = currentDecision();
  if (!agent || !decision) {
    heap_caps_free(encoded);
    return false;
  }
  JsonDocument body_doc;
  body_doc["agent_id"] = agent->id;
  body_doc["progress_version"] = agent->progress_version;
  body_doc["decision_id"] = decision->id;
  body_doc["device_id"] = CALM_OPERATOR_DEVICE_ID;
  body_doc["idempotency_key"] = String(CALM_OPERATOR_DEVICE_ID) + ":voice:" + String(millis());
  body_doc["format"] = "pcm_s16le";
  body_doc["sample_rate_hz"] = RECORD_SAMPLE_RATE;
  body_doc["duration_ms"] = recorded_samples * 1000 / RECORD_SAMPLE_RATE;
  body_doc["audio_base64"] = reinterpret_cast<const char*>(encoded);
  String body;
  body.reserve(written + 1024);
  serializeJson(body_doc, body);
  heap_caps_free(encoded);

  JsonDocument response;
  if (!requestJson("POST", "/operator/voice-command", body, response)) return false;
  voice_command_id = response["command"]["id"].as<String>();
  last_voice_poll = 0;
  return voice_command_id.length() > 0;
}

void stopRecording() {
  recording = false;
  while (M5.Mic.isRecording()) delay(1);
  M5.Mic.end();
  M5.Speaker.begin();
  if (postVoiceRecording()) tone(4200, 50);
}

void captureRecordingBlock() {
  if (!recording || recorded_samples >= RECORD_MAX_SAMPLES) {
    if (recording) stopRecording();
    return;
  }
  const size_t remaining = RECORD_MAX_SAMPLES - recorded_samples;
  const size_t block = remaining < RECORD_BLOCK_SAMPLES ? remaining : RECORD_BLOCK_SAMPLES;
  if (M5.Mic.record(recording_data + recorded_samples, block, RECORD_SAMPLE_RATE)) {
    recorded_samples += block;
  }
}

void pollVoiceCommand() {
  if (!voice_command_id.length() || millis() - last_voice_poll < VOICE_POLL_MS) return;
  last_voice_poll = millis();
  JsonDocument response;
  if (!requestJson(
          "GET",
          "/operator/voice-command/" + voice_command_id,
          "",
          response)) return;
  const String state = response["command"]["state"].as<String>();
  if (state == "transcribed") {
    voice_transcript = response["command"]["transcript"].as<String>();
    applyEffect(calm_operator::transition(operator_state, Event::TranscriptReady));
  } else if (state == "failed" || state == "expired") {
    bridge_error = clipped(response["command"]["error"].as<String>(), 54);
    voice_command_id = "";
  }
}

bool confirmVoice() {
  if (!voice_command_id.length()) return false;
  JsonDocument body_doc;
  body_doc["confirmed"] = true;
  String body;
  serializeJson(body_doc, body);
  JsonDocument response;
  if (!requestJson(
          "POST",
          "/operator/voice-command/" + voice_command_id + "/confirm",
          body,
          response)) return false;
  receipt_text = "Voice steering queued";
  applyEffect(calm_operator::transition(operator_state, Event::Submitted));
  return true;
}

void header(const char* title, uint16_t accent = TFT_CYAN) {
  M5.Display.fillScreen(TFT_BLACK);
  M5.Display.fillCircle(233, 22, 4, accent);
  M5.Display.setTextDatum(top_center);
  M5.Display.setTextColor(TFT_LIGHTGREY, TFT_BLACK);
  M5.Display.setTextSize(1);
  M5.Display.drawString(title, 233, 36, &fonts::FreeSansBold12pt7b);
}

void footer(const String& left, const String& right) {
  M5.Display.drawFastHLine(86, 414, 294, TFT_DARKGREY);
  M5.Display.setTextDatum(top_left);
  M5.Display.setTextColor(TFT_DARKGREY, TFT_BLACK);
  M5.Display.drawString(left, 96, 425, &fonts::FreeSans9pt7b);
  M5.Display.setTextDatum(top_right);
  M5.Display.drawString(right, 370, 425, &fonts::FreeSans9pt7b);
}

void drawDashboard() {
  header("CALM OPERATOR", agent_count > 0 ? TFT_CYAN : TFT_DARKGREY);
  M5.Display.setTextDatum(middle_center);
  M5.Display.setTextColor(TFT_WHITE, TFT_BLACK);
  M5.Display.drawString(String(agent_count), 233, 178, &fonts::FreeSansBold24pt7b);
  M5.Display.setTextColor(TFT_LIGHTGREY, TFT_BLACK);
  M5.Display.drawString(agent_count == 1 ? "active agent" : "active agents", 233, 226,
                        &fonts::FreeSans12pt7b);
  size_t attention = 0;
  for (size_t index = 0; index < agent_count; ++index) attention += agents[index].needs_input ? 1 : 0;
  M5.Display.setTextColor(attention ? TFT_ORANGE : TFT_DARKGREY, TFT_BLACK);
  M5.Display.drawString(attention ? String(attention) + " awaiting direction" : "no input requested",
                        233, 276, &fonts::FreeSans12pt7b);
  if (bridge_error.length()) {
    M5.Display.setTextColor(TFT_RED, TFT_BLACK);
    M5.Display.drawString(clipped(bridge_error, 38), 233, 328, &fonts::FreeSans9pt7b);
  }
  footer("TAP AGENTS", WiFi.status() == WL_CONNECTED ? "ONLINE" : "OFFLINE");
}

void drawAgents() {
  header("AGENTS");
  Agent* agent = currentAgent();
  if (!agent) {
    M5.Display.setTextDatum(middle_center);
    M5.Display.setTextColor(TFT_LIGHTGREY, TFT_BLACK);
    M5.Display.drawString("No active agents", 233, 220, &fonts::FreeSans12pt7b);
    footer("A/B NAV", "TAP HOME");
    return;
  }
  M5.Display.setTextDatum(top_center);
  M5.Display.setTextColor(agent->needs_input ? TFT_ORANGE : TFT_CYAN, TFT_BLACK);
  M5.Display.drawString(clipped(agent->label, 26), 233, 82, &fonts::FreeSansBold18pt7b);
  M5.Display.setTextColor(TFT_LIGHTGREY, TFT_BLACK);
  M5.Display.drawString(clipped(agent->provider + " · " + agent->status, 34), 233, 126,
                        &fonts::FreeSans9pt7b);
  M5.Display.setTextColor(TFT_WHITE, TFT_BLACK);
  M5.Display.drawString(clipped(agent->phase, 38), 233, 158, &fonts::FreeSans12pt7b);
  M5.Display.setTextColor(TFT_LIGHTGREY, TFT_BLACK);
  M5.Display.drawString(clipped(agent->summary, 46), 233, 194, &fonts::FreeSans9pt7b);

  if (agent->decision_count > 0) {
    Decision& decision = agent->decisions[decision_index % agent->decision_count];
    M5.Display.fillRoundRect(76, 255, 314, 105, 20, TFT_DARKCYAN);
    M5.Display.setTextColor(TFT_WHITE, TFT_DARKCYAN);
    M5.Display.drawString(clipped(decision.label, 28), 233, 278, &fonts::FreeSansBold12pt7b);
    M5.Display.setTextColor(TFT_LIGHTGREY, TFT_DARKCYAN);
    M5.Display.drawString(decision.requires_text ? "SPEAK + CONFIRM" : "TAP + CONFIRM", 233, 320,
                          &fonts::FreeSans9pt7b);
  } else {
    M5.Display.setTextColor(TFT_DARKGREY, TFT_BLACK);
    M5.Display.drawString("No remote-safe actions", 233, 292, &fonts::FreeSans9pt7b);
  }
  footer("A/B AGENT", String(operator_state.agent_index + 1) + "/" + String(agent_count));
}

void drawConfirmation(bool voice) {
  header(voice ? "VOICE REVIEW" : "CONFIRM", TFT_ORANGE);
  M5.Display.setTextDatum(top_center);
  M5.Display.setTextColor(TFT_WHITE, TFT_BLACK);
  const String message = voice ? voice_transcript : (currentDecision() ? currentDecision()->label : "");
  M5.Display.drawString(clipped(message, 58), 233, 130, &fonts::FreeSansBold12pt7b);
  M5.Display.setTextColor(TFT_LIGHTGREY, TFT_BLACK);
  M5.Display.drawString("This will steer the live agent.", 233, 215, &fonts::FreeSans9pt7b);
  M5.Display.fillRoundRect(82, 292, 136, 58, 16, TFT_DARKGREY);
  M5.Display.fillRoundRect(248, 292, 136, 58, 16, TFT_DARKCYAN);
  M5.Display.setTextColor(TFT_WHITE, TFT_DARKGREY);
  M5.Display.drawString("CANCEL", 150, 311, &fonts::FreeSansBold9pt7b);
  M5.Display.setTextColor(TFT_WHITE, TFT_DARKCYAN);
  M5.Display.drawString("CONFIRM", 316, 311, &fonts::FreeSansBold9pt7b);
  footer("A CANCEL", "B CONFIRM");
}

void drawVoiceRecord() {
  header("PUSH TO TALK", recording ? TFT_RED : TFT_ORANGE);
  M5.Display.setTextDatum(middle_center);
  M5.Display.setTextColor(recording ? TFT_RED : TFT_WHITE, TFT_BLACK);
  M5.Display.fillCircle(233, 207, 74, recording ? TFT_MAROON : TFT_DARKCYAN);
  M5.Display.drawString(recording ? "RECORDING" : (voice_command_id.length() ? "TRANSCRIBING" : "HOLD B"),
                        233, 207, &fonts::FreeSansBold12pt7b);
  M5.Display.setTextColor(TFT_LIGHTGREY, TFT_BLACK);
  const uint32_t duration = recorded_samples * 1000 / RECORD_SAMPLE_RATE;
  M5.Display.drawString(recording ? String(duration / 1000.0f, 1) + " sec" : "Maximum 3 seconds",
                        233, 307, &fonts::FreeSans9pt7b);
  if (bridge_error.length()) {
    M5.Display.setTextColor(TFT_RED, TFT_BLACK);
    M5.Display.drawString(clipped(bridge_error, 42), 233, 354, &fonts::FreeSans9pt7b);
  }
  footer("A CANCEL", recording ? "RELEASE B" : "HOLD B");
}

void drawReceipt() {
  header("DELIVERED", TFT_GREEN);
  M5.Display.setTextDatum(middle_center);
  M5.Display.setTextColor(TFT_GREEN, TFT_BLACK);
  M5.Display.drawCircle(233, 190, 56, TFT_GREEN);
  M5.Display.drawString("✓", 233, 190, &fonts::FreeSansBold24pt7b);
  M5.Display.setTextColor(TFT_WHITE, TFT_BLACK);
  M5.Display.drawString(clipped(receipt_text, 42), 233, 286, &fonts::FreeSans12pt7b);
  footer("TAP AGENTS", "QUEUED");
}

void draw() {
  M5.Display.startWrite();
  switch (operator_state.screen) {
    case Screen::Dashboard: drawDashboard(); break;
    case Screen::Agents: drawAgents(); break;
    case Screen::DecisionConfirm: drawConfirmation(false); break;
    case Screen::VoiceRecord: drawVoiceRecord(); break;
    case Screen::VoiceReview: drawConfirmation(true); break;
    case Screen::Receipt: drawReceipt(); break;
  }
  M5.Display.endWrite();
}

void chooseCurrentDecision() {
  Decision* decision = currentDecision();
  if (!decision) return;
  const auto effect = calm_operator::transition(
      operator_state,
      Event::ChooseDecision,
      DecisionPolicy{decision->remote_safe, decision->requires_text});
  applyEffect(effect);
  draw();
}

void cancelToAgents() {
  if (recording) {
    recording = false;
    while (M5.Mic.isRecording()) delay(1);
    M5.Mic.end();
    M5.Speaker.begin();
  }
  voice_command_id = "";
  bridge_error = "";
  applyEffect(calm_operator::transition(operator_state, Event::Cancel));
  draw();
}

void handleInputs() {
  const auto touch = M5.Touch.getDetail();
  const bool clicked = touch.wasClicked();
  if (operator_state.screen == Screen::Dashboard) {
    if (clicked || M5.BtnA.wasPressed() || M5.BtnB.wasPressed()) {
      calm_operator::transition(operator_state, Event::OpenAgents);
      refreshConsole();
      draw();
    }
    return;
  }
  if (operator_state.screen == Screen::Agents) {
    if (M5.BtnA.wasPressed()) {
      calm_operator::transition(operator_state, Event::PreviousAgent, {}, agent_count);
      decision_index = 0;
      draw();
    }
    if (M5.BtnB.wasPressed()) {
      calm_operator::transition(operator_state, Event::NextAgent, {}, agent_count);
      decision_index = 0;
      draw();
    }
    if (clicked) {
      if (touch.y < 115) {
        operator_state.screen = Screen::Dashboard;
        draw();
      } else if (touch.y >= 245 && touch.y <= 375) {
        chooseCurrentDecision();
      } else if (currentAgent() && currentAgent()->decision_count > 1) {
        decision_index = (decision_index + 1) % currentAgent()->decision_count;
        draw();
      }
    }
    return;
  }
  if (operator_state.screen == Screen::DecisionConfirm || operator_state.screen == Screen::VoiceReview) {
    if (M5.BtnA.wasPressed() || (clicked && touch.x < 233)) {
      cancelToAgents();
    } else if (M5.BtnB.wasPressed() || (clicked && touch.x >= 233)) {
      const auto effect = calm_operator::transition(operator_state, Event::Confirm);
      applyEffect(effect);
      if (effect.submit_button_decision) submitButtonDecision();
      if (effect.submit_voice_decision) confirmVoice();
      draw();
    }
    return;
  }
  if (operator_state.screen == Screen::VoiceRecord) {
    if (M5.BtnA.wasPressed()) {
      cancelToAgents();
      return;
    }
    if (M5.BtnB.wasPressed() && !recording && !voice_command_id.length()) {
      applyEffect(calm_operator::transition(operator_state, Event::StartRecording));
      startRecording();
      draw();
    }
    if (M5.BtnB.wasReleased() && recording) {
      applyEffect(calm_operator::transition(operator_state, Event::StopRecording));
      stopRecording();
      draw();
    }
    return;
  }
  if (operator_state.screen == Screen::Receipt &&
      (clicked || M5.BtnA.wasPressed() || M5.BtnB.wasPressed())) {
    cancelToAgents();
  }
}

}  // namespace

void setup() {
  auto config = M5.config();
  config.clear_display = true;
  config.output_power = true;
  M5.begin(config);
  Serial.begin(115200);
  M5.Display.setRotation(0);
  M5.Display.setBrightness(96);
  M5.Display.setTextWrap(false);
  M5.Speaker.setVolume(80);
  connectWifi();
  refreshConsole();
  postHeartbeat();
  draw();
}

void loop() {
  M5.update();
  handleInputs();
  captureRecordingBlock();
  pollVoiceCommand();
  if (operator_state.screen == Screen::Agents && millis() - last_console_poll >= CONSOLE_POLL_MS) {
    refreshConsole();
    draw();
  }
  if (millis() - last_heartbeat >= HEARTBEAT_MS) postHeartbeat();
  delay(8);
}
