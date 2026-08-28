#include <Arduino.h>
#include <ArduinoJson.h>
#include <HTTPClient.h>
#include <M5Unified.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <driver/gpio.h>
#include <esp_heap_caps.h>
#include <mbedtls/base64.h>

#include "operator_buttons.h"
#include "operator_diagnostics.h"
#include "operator_receipt.h"
#include "operator_state.h"
#include "operator_touch.h"
#include "operator_ui.h"
#include "operator_voice.h"
#include "trust_roots.h"

#if __has_include("operator_config.local.h")
#include "operator_config.local.h"
#else
#include "operator_config.example.h"
#endif

namespace {

using calm_operator::DecisionPolicy;
using calm_operator::DeliveryReceiptState;
using calm_operator::Event;
using calm_operator::Screen;
using calm_operator::State;

constexpr char FIRMWARE_VERSION[] = "0.3.7-stopwatch";
constexpr uint32_t CONSOLE_POLL_MS = 15000;
constexpr uint32_t HEARTBEAT_MS = 5 * 60 * 1000;
constexpr uint32_t RECEIPT_POLL_MS = 1500;
constexpr uint32_t VOICE_POLL_MS = 1500;
constexpr size_t MAX_AGENTS = 8;
constexpr size_t MAX_DECISIONS = 6;
constexpr size_t RECORD_SAMPLE_RATE = calm_operator::kVoiceSampleRateHz;
constexpr size_t RECORD_MAX_SAMPLES = calm_operator::kVoiceMaxSamples;
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
  String workspace_label;
  String control_reason;
  String authority;
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
String pending_decision_id;
String voice_command_id;
String voice_transcript;
DeliveryReceiptState receipt_state = DeliveryReceiptState::Queued;
bool recording = false;
bool bridge_confirmed = false;
int16_t* recording_data = nullptr;
size_t recorded_samples = 0;
uint32_t last_console_poll = 0;
uint32_t last_heartbeat = 0;
uint32_t last_receipt_poll = 0;
uint32_t last_voice_poll = 0;
uint32_t last_recording_draw = 0;

void draw();

void configureStopwatchButtonInputs() {
  calm_operator::configureStopwatchButtonPullups([](int pin) {
    gpio_set_direction(static_cast<gpio_num_t>(pin), GPIO_MODE_INPUT);
    gpio_set_pull_mode(static_cast<gpio_num_t>(pin), GPIO_PULLUP_ONLY);
  });
  Serial.println("[operator] stopwatch button pull-ups enabled");
}

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
    bridge_confirmed = false;
    bridge_error = "Wi-Fi unavailable";
    Serial.println(
        calm_operator::bridgeFailureDiagnostic(calm_operator::BridgeFailure::WiFiUnavailable));
    return false;
  }
  WiFiClientSecure client;
  client.setCACert(CALM_OPERATOR_GTS_ROOT_R4_CA);
  HTTPClient http;
  const String url = String(CALM_OPERATOR_BRIDGE_ORIGIN) + path;
  if (!http.begin(client, url)) {
    bridge_confirmed = false;
    bridge_error = "TLS setup failed";
    Serial.println(calm_operator::bridgeFailureDiagnostic(calm_operator::BridgeFailure::TlsSetup));
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
  bridge_confirmed =
      status >= 200 && status < 500 && status != 401 && status != 403;
  const String payload = http.getString();
  http.end();
  if (status < 200 || status >= 300) {
    bridge_error = "Bridge HTTP " + String(status);
    Serial.println(calm_operator::bridgeFailureDiagnostic(calm_operator::BridgeFailure::Http));
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
    bridge_confirmed = false;
    bridge_error = "Invalid bridge JSON";
    Serial.println(
        calm_operator::bridgeFailureDiagnostic(calm_operator::BridgeFailure::InvalidJson));
    return false;
  }
  bridge_error = "";
  bridge_confirmed = true;
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
    agent.workspace_label = source["operator_context"]["workspace_label"].as<String>();
    agent.control_reason = source["operator_context"]["control_reason"].as<String>();
    agent.authority = source["operator_context"]["authority"].as<String>();
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
  const bool heartbeat_accepted = requestJson("POST", "/operator/device-heartbeat", body, response);
  Serial.println(calm_operator::heartbeatDiagnostic(heartbeat_accepted));
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
  pending_decision_id = response["decision"]["id"].as<String>();
  receipt_state = DeliveryReceiptState::Queued;
  last_receipt_poll = 0;
  receipt_text = "Queued " + decision->label;
  applyEffect(calm_operator::transition(operator_state, Event::Submitted));
  return true;
}

void startRecording() {
  if (!recording_data) {
    recording_data = static_cast<int16_t*>(
        heap_caps_malloc(calm_operator::kVoiceMaxRawBytes, MALLOC_CAP_8BIT | MALLOC_CAP_SPIRAM));
  }
  if (!recording_data) {
    bridge_error = "Audio memory unavailable";
    return;
  }
  recorded_samples = 0;
  voice_command_id = "";
  voice_transcript = "";
  bridge_error = "";
  M5.Speaker.end();
  if (!M5.Mic.begin()) {
    M5.Speaker.begin();
    bridge_error = "Microphone unavailable";
    Serial.println("[operator] voice microphone start failed");
    return;
  }
  recording = true;
  last_recording_draw = millis();
  Serial.printf("[operator] voice recording started max_samples=%u\n",
                static_cast<unsigned>(RECORD_MAX_SAMPLES));
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
  String body;
  serializeJson(body_doc, body);
  if (!body.length() || body[body.length() - 1] != '}') {
    heap_caps_free(encoded);
    bridge_error = "Voice payload unavailable";
    return false;
  }
  body.remove(body.length() - 1);
  if (!body.reserve(body.length() + written + 24)) {
    heap_caps_free(encoded);
    bridge_error = "Voice upload memory unavailable";
    return false;
  }
  calm_operator::appendVoiceBase64JsonField(
      [&body](const char* fragment) { body += fragment; },
      reinterpret_cast<const char*>(encoded));
  heap_caps_free(encoded);
  Serial.printf(
      "[operator] voice upload duration_ms=%u raw_bytes=%u base64_bytes=%u body_bytes=%u\n",
      static_cast<unsigned>(recorded_samples * 1000 / RECORD_SAMPLE_RATE),
      static_cast<unsigned>(recorded_samples * sizeof(int16_t)),
      static_cast<unsigned>(written),
      static_cast<unsigned>(body.length()));

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
  Serial.printf("[operator] voice recording stopped samples=%u\n",
                static_cast<unsigned>(recorded_samples));
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
    if (millis() - last_recording_draw >= 100) {
      last_recording_draw = millis();
      draw();
    }
  } else {
    recording = false;
    M5.Mic.end();
    M5.Speaker.begin();
    bridge_error = "Microphone capture unavailable";
    Serial.println("[operator] voice microphone capture failed");
    draw();
  }
}

void pollVoiceCommand() {
  if (!calm_operator::shouldPollVoiceCommand(
          voice_command_id.length(), operator_state.screen == Screen::VoiceRecord) ||
      millis() - last_voice_poll < VOICE_POLL_MS)
    return;
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
    const auto effect = calm_operator::transition(operator_state, Event::TranscriptReady);
    applyEffect(effect);
    if (calm_operator::shouldRedrawVoiceCommandPoll(effect.changed)) {
      Serial.println("[operator] voice transcript ready");
      draw();
    }
  } else if (state == "failed" || state == "expired") {
    bridge_error = clipped(response["command"]["error"].as<String>(), 54);
    voice_command_id = "";
    draw();
  }
}

bool confirmVoice() {
  if (!voice_command_id.length()) return false;
  Serial.println("[operator] voice confirmation requested");
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
  pending_decision_id = response["decision"]["id"].as<String>();
  receipt_state = DeliveryReceiptState::Queued;
  last_receipt_poll = 0;
  receipt_text = "Voice steering queued";
  applyEffect(calm_operator::transition(operator_state, Event::Submitted));
  Serial.println("[operator] voice confirmation queued");
  return true;
}

void pollDecisionReceipt() {
  if (!calm_operator::shouldPollDeliveryReceipt(
          pending_decision_id.length(), receipt_state) ||
      millis() - last_receipt_poll < RECEIPT_POLL_MS)
    return;
  last_receipt_poll = millis();
  JsonDocument response;
  if (!requestJson("GET", "/operator/agent-console", "", response)) return;
  for (JsonObject candidate : response["recent_decisions"].as<JsonArray>()) {
    if (candidate["id"].as<String>() != pending_decision_id) continue;
    const String state = candidate["state"].as<String>();
    if (state == "completed") {
      receipt_state = DeliveryReceiptState::Delivered;
      receipt_text = candidate["result_summary"].as<String>();
      if (!receipt_text.length()) receipt_text = "Agent completed steering";
      Serial.println("[operator] decision delivered");
      draw();
    } else if (state == "failed") {
      receipt_state = DeliveryReceiptState::Failed;
      receipt_text = candidate["error"].as<String>();
      if (!receipt_text.length()) receipt_text = "Agent delivery failed";
      Serial.println("[operator] decision delivery failed");
      draw();
    }
    return;
  }
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

void operatorRail(const char* view, bool connected) {
  const uint16_t link_color = connected ? TFT_GREEN : TFT_DARKGREY;
  M5.Display.fillScreen(TFT_BLACK);
  M5.Display.fillRect(86, 92, 294, 2, TFT_DARKGREY);
  M5.Display.fillRect(86, 92, connected ? 112 : 66, 2, link_color);
  M5.Display.setTextDatum(top_center);
  M5.Display.setTextColor(TFT_LIGHTGREY, TFT_BLACK);
  M5.Display.drawString("CALM / STOPWATCH", 233, 54, &fonts::FreeSans9pt7b);
  M5.Display.setTextColor(link_color, TFT_BLACK);
  M5.Display.drawString(calm_operator::connectionLabel(connected), 233, 73, &fonts::FreeSans9pt7b);
  M5.Display.setTextColor(TFT_CYAN, TFT_BLACK);
  M5.Display.drawString(view, 233, 111, &fonts::FreeSansBold12pt7b);
}

void operatorFooter(const String& left, const String& right) {
  M5.Display.fillRect(76, 383, 314, 2, TFT_DARKGREY);
  M5.Display.setTextDatum(top_left);
  M5.Display.setTextColor(TFT_LIGHTGREY, TFT_BLACK);
  M5.Display.drawString(left, 88, 391, &fonts::FreeSans9pt7b);
  M5.Display.setTextDatum(top_right);
  M5.Display.drawString(right, 378, 391, &fonts::FreeSans9pt7b);
}

void operatorControlRail(const char* action, const char* detail, uint16_t accent) {
  M5.Display.fillRect(64, 342, 338, 2, TFT_DARKGREY);
  M5.Display.setTextDatum(top_left);
  M5.Display.setTextColor(accent, TFT_BLACK);
  M5.Display.drawString(action, 78, 352, &fonts::FreeSansBold9pt7b);
  M5.Display.setTextDatum(top_right);
  M5.Display.setTextColor(TFT_LIGHTGREY, TFT_BLACK);
  M5.Display.drawString(detail, 388, 352, &fonts::FreeSans9pt7b);
}

calm_operator::ControlReason controlReasonFor(const String& reason) {
  if (reason == "paginated-history-not-resumable") {
    return calm_operator::ControlReason::PaginatedHistory;
  }
  if (reason == "recent-desktop-activity") {
    return calm_operator::ControlReason::RecentDesktopActivity;
  }
  if (reason == "runtime-not-idle") {
    return calm_operator::ControlReason::RuntimeNotIdle;
  }
  if (reason == "new-task" || reason == "settled-legacy-thread") {
    return calm_operator::ControlReason::Actionable;
  }
  return calm_operator::ControlReason::Unknown;
}

void drawDashboard() {
  const bool connected =
      calm_operator::linkConfirmed(WiFi.status() == WL_CONNECTED, bridge_confirmed);
  calm_operator::OperatorTaskSnapshot snapshots[MAX_AGENTS] = {};
  for (size_t index = 0; index < agent_count; ++index) {
    snapshots[index] = {
        agents[index].id == "codex:new",
        agents[index].needs_input,
        agents[index].status == "working",
        agents[index].decision_count > 0,
    };
  }
  const auto counts = calm_operator::summarizeOperatorTasks(snapshots, agent_count);
  const uint16_t state_color = counts.total > 0 ? TFT_CYAN : TFT_DARKGREY;
  operatorRail("OPERATOR / DASHBOARD", connected);
  M5.Display.setTextDatum(top_center);
  M5.Display.setTextColor(TFT_LIGHTGREY, TFT_BLACK);
  M5.Display.drawString("CODEX TASKS", 233, 143, &fonts::FreeSans9pt7b);
  M5.Display.setTextDatum(middle_center);
  M5.Display.setTextColor(state_color, TFT_BLACK);
  M5.Display.drawString(String(counts.total), 233, 187, &fonts::FreeSansBold24pt7b);
  M5.Display.fillRect(64, 229, 338, 2, TFT_DARKGREY);
  M5.Display.setTextDatum(top_left);
  M5.Display.setTextColor(TFT_LIGHTGREY, TFT_BLACK);
  M5.Display.drawString("OPERATOR ATTENTION", 64, 245, &fonts::FreeSans9pt7b);
  M5.Display.setTextColor(counts.attention ? TFT_ORANGE : TFT_GREEN, TFT_BLACK);
  M5.Display.drawString(calm_operator::attentionLabel(counts.attention), 64, 270,
                        &fonts::FreeSansBold12pt7b);
  M5.Display.setTextColor(TFT_LIGHTGREY, TFT_BLACK);
  M5.Display.drawString("RUNNING " + String(counts.running) + " / VIEW ONLY " +
                            String(counts.read_only),
                        64, 298, &fonts::FreeSans9pt7b);
  if (bridge_error.length()) {
    M5.Display.setTextColor(TFT_RED, TFT_BLACK);
    M5.Display.drawString("BRIDGE / " + clipped(bridge_error, 34), 64, 321, &fonts::FreeSans9pt7b);
  } else {
    M5.Display.setTextColor(connected ? TFT_GREEN : TFT_DARKGREY, TFT_BLACK);
    M5.Display.drawString(connected ? "HEARTBEAT / READY" : "HEARTBEAT / WAITING", 64, 321,
                          &fonts::FreeSans9pt7b);
  }
  operatorControlRail("TAP OR A/B", "OPEN AGENTS", state_color);
  operatorFooter("STATE / MONITOR", connected ? "LINK CONFIRMED" : "LINK PENDING");
}

void drawAgents() {
  const bool connected =
      calm_operator::linkConfirmed(WiFi.status() == WL_CONNECTED, bridge_confirmed);
  operatorRail("OPERATOR / CODEX TASKS", connected);
  Agent* agent = currentAgent();
  if (!agent) {
    M5.Display.setTextDatum(middle_center);
    M5.Display.setTextColor(TFT_LIGHTGREY, TFT_BLACK);
    M5.Display.drawString("NO CODEX TASKS", 233, 230, &fonts::FreeSansBold12pt7b);
    operatorControlRail("TAP", "RETURN DASHBOARD", TFT_DARKGREY);
    operatorFooter("STATE / IDLE", "0 / 0");
    return;
  }
  M5.Display.setTextDatum(top_center);
  M5.Display.setTextColor(agent->needs_input ? TFT_ORANGE : TFT_CYAN, TFT_BLACK);
  M5.Display.drawString("TASK " + String(operator_state.agent_index + 1) + " / " + String(agent_count),
                        233, 138, &fonts::FreeSansBold12pt7b);
  M5.Display.setTextColor(TFT_WHITE, TFT_BLACK);
  M5.Display.drawString(clipped(agent->label, 26), 233, 166, &fonts::FreeSansBold18pt7b);
  M5.Display.setTextColor(TFT_LIGHTGREY, TFT_BLACK);
  M5.Display.drawString(clipped(agent->provider + " / " + agent->status, 34), 233, 202,
                        &fonts::FreeSans9pt7b);
  M5.Display.fillRect(64, 225, 338, 2, TFT_DARKGREY);
  M5.Display.setTextDatum(top_left);
  M5.Display.setTextColor(TFT_LIGHTGREY, TFT_BLACK);
  M5.Display.drawString("CURRENT PHASE", 64, 237, &fonts::FreeSans9pt7b);
  M5.Display.setTextColor(TFT_WHITE, TFT_BLACK);
  M5.Display.drawString(clipped(agent->phase, 38), 64, 257, &fonts::FreeSansBold12pt7b);
  M5.Display.setTextColor(TFT_LIGHTGREY, TFT_BLACK);
  M5.Display.drawString("WORKSPACE / " + clipped(agent->workspace_label, 28), 64, 278,
                        &fonts::FreeSans9pt7b);

  if (agent->decision_count > 0) {
    Decision& decision = agent->decisions[decision_index % agent->decision_count];
    const uint16_t decision_color = decision.remote_safe ? TFT_CYAN : TFT_DARKGREY;
    M5.Display.drawRect(64, 294, 338, 48, decision_color);
    if (agent->decision_count > 1) M5.Display.drawFastVLine(334, 294, 48, decision_color);
    M5.Display.setTextDatum(top_left);
    M5.Display.setTextColor(decision_color, TFT_BLACK);
    M5.Display.drawString(clipped(decision.label, 22), 72, 300, &fonts::FreeSansBold9pt7b);
    M5.Display.setTextColor(TFT_LIGHTGREY, TFT_BLACK);
    M5.Display.drawString(calm_operator::actionPositionLabel(
                              decision_index % agent->decision_count, agent->decision_count),
                          72, 320, &fonts::FreeSans9pt7b);
    if (agent->decision_count > 1) {
      M5.Display.setTextDatum(middle_center);
      M5.Display.setTextColor(TFT_CYAN, TFT_BLACK);
      M5.Display.drawString("NEXT", 368, 318, &fonts::FreeSansBold9pt7b);
    }
  } else {
    M5.Display.drawRect(64, 294, 338, 48, TFT_DARKGREY);
    M5.Display.setTextDatum(top_left);
    M5.Display.setTextColor(TFT_LIGHTGREY, TFT_BLACK);
    M5.Display.drawString(calm_operator::readOnlyReasonLabel(
                              controlReasonFor(agent->control_reason)),
                          72, 308, &fonts::FreeSans9pt7b);
  }
  operatorControlRail(agent->decision_count ? "TAP ACTION" : "VIEW ONLY",
                      agent->decision_count > 1 ? "TAP NEXT >" : "A/B SELECT TASK",
                      agent->needs_input ? TFT_ORANGE : TFT_CYAN);
  operatorFooter("A/B / SELECT TASK",
                 clipped(agent->authority.length() ? agent->authority : "read-only", 22));
}

void drawConfirmation(bool voice) {
  header(voice ? "VOICE REVIEW" : "CONFIRM", TFT_ORANGE);
  M5.Display.setTextDatum(top_center);
  M5.Display.setTextColor(TFT_WHITE, TFT_BLACK);
  const String message = voice ? voice_transcript : (currentDecision() ? currentDecision()->label : "");
  if (voice) {
    size_t start = 0;
    for (size_t line = 0; line < 4; ++line) {
      if (start >= message.length()) break;
      const size_t end = calm_operator::nextUtf8LineEnd(
          message.c_str(), message.length(), start, 39);
      M5.Display.drawString(message.substring(start, end), 233,
                            126 + line * 23, &fonts::FreeSans9pt7b);
      start = end;
    }
  } else {
    M5.Display.drawString(clipped(message, 32), 233, 148, &fonts::FreeSansBold12pt7b);
  }
  M5.Display.setTextColor(TFT_LIGHTGREY, TFT_BLACK);
  Agent* agent = currentAgent();
  M5.Display.drawString("WORKSPACE / " + clipped(agent ? agent->workspace_label : "", 28), 233, 226,
                        &fonts::FreeSans9pt7b);
  M5.Display.drawString(voice ? "Reviewed prompt will be sent." : "Reviewed action will be sent.",
                        233, 249, &fonts::FreeSans9pt7b);
  M5.Display.fillRoundRect(82, 292, 136, 58, 16, TFT_DARKGREY);
  M5.Display.fillRoundRect(248, 292, 136, 58, 16, TFT_DARKCYAN);
  M5.Display.setTextColor(TFT_WHITE, TFT_DARKGREY);
  M5.Display.drawString("CANCEL", 150, 311, &fonts::FreeSansBold9pt7b);
  M5.Display.setTextColor(TFT_WHITE, TFT_DARKCYAN);
  M5.Display.drawString("CONFIRM", 316, 311, &fonts::FreeSansBold9pt7b);
  if (bridge_error.length()) {
    M5.Display.setTextColor(TFT_RED, TFT_BLACK);
    M5.Display.drawString(clipped(bridge_error, 42), 233, 370, &fonts::FreeSans9pt7b);
  }
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
  M5.Display.drawString(recording ? String(duration / 1000.0f, 1) + " sec"
                                 : "Maximum " + String(calm_operator::kVoiceMaxDurationSeconds) + " seconds",
                        233, 307, &fonts::FreeSans9pt7b);
  Agent* agent = currentAgent();
  M5.Display.drawString("WORKSPACE / " + clipped(agent ? agent->workspace_label : "", 28), 233, 333,
                        &fonts::FreeSans9pt7b);
  if (bridge_error.length()) {
    M5.Display.setTextColor(TFT_RED, TFT_BLACK);
    M5.Display.drawString(clipped(bridge_error, 42), 233, 354, &fonts::FreeSans9pt7b);
  }
  footer("A CANCEL", recording ? "RELEASE B" : "HOLD B");
}

void drawReceipt() {
  const auto presentation = calm_operator::deliveryReceiptPresentation(receipt_state);
  const uint16_t accent = receipt_state == DeliveryReceiptState::Delivered
                              ? TFT_GREEN
                          : receipt_state == DeliveryReceiptState::Failed
                              ? TFT_RED
                              : TFT_ORANGE;
  header(presentation.title, accent);
  M5.Display.setTextDatum(middle_center);
  M5.Display.setTextColor(accent, TFT_BLACK);
  M5.Display.drawCircle(233, 190, 56, accent);
  M5.Display.drawString(presentation.symbol, 233, 190, &fonts::FreeSansBold24pt7b);
  M5.Display.setTextColor(TFT_WHITE, TFT_BLACK);
  M5.Display.drawString(clipped(receipt_text, 42), 233, 286, &fonts::FreeSans12pt7b);
  footer("TAP AGENTS", presentation.footer);
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
  pending_decision_id = "";
  receipt_state = DeliveryReceiptState::Queued;
  bridge_error = "";
  applyEffect(calm_operator::transition(operator_state, Event::Cancel));
  draw();
}

void handleInputs() {
  const auto touch = M5.Touch.getDetail();
  const bool button_a_pressed = M5.BtnA.wasPressed();
  const bool button_b_pressed = M5.BtnB.wasPressed();
  if (button_a_pressed || button_b_pressed) {
    Serial.printf("[operator] button %c pressed\n", button_a_pressed ? 'A' : 'B');
  }
  if (touch.wasPressed()) {
    Serial.printf("[operator] touch press x=%d y=%d\n", touch.x, touch.y);
  }
  const bool released = calm_operator::isDeliberateTouchRelease(
      touch.wasReleased(), touch.wasFlicked(), touch.wasDragged());
  if (released) {
    Serial.printf("[operator] touch release x=%d y=%d\n", touch.x, touch.y);
  }
  if (operator_state.screen == Screen::Dashboard) {
    if (released || button_a_pressed || button_b_pressed) {
      calm_operator::transition(operator_state, Event::OpenAgents);
      refreshConsole();
      draw();
    }
    return;
  }
  if (operator_state.screen == Screen::Agents) {
    if (button_a_pressed) {
      calm_operator::transition(operator_state, Event::PreviousAgent, {}, agent_count);
      decision_index = 0;
      draw();
    }
    if (button_b_pressed) {
      calm_operator::transition(operator_state, Event::NextAgent, {}, agent_count);
      decision_index = 0;
      draw();
    }
    if (released) {
      if (touch.y < 115) {
        operator_state.screen = Screen::Dashboard;
        draw();
      } else if (currentAgent() &&
                 calm_operator::actionTouchTarget(
                     touch.x, touch.y, currentAgent()->decision_count) ==
                     calm_operator::ActionTouchTarget::Next) {
        decision_index = (decision_index + 1) % currentAgent()->decision_count;
        draw();
      } else if (currentAgent() &&
                 calm_operator::actionTouchTarget(
                     touch.x, touch.y, currentAgent()->decision_count) ==
                     calm_operator::ActionTouchTarget::Review) {
        chooseCurrentDecision();
      }
    }
    return;
  }
  if (operator_state.screen == Screen::DecisionConfirm || operator_state.screen == Screen::VoiceReview) {
    if (button_a_pressed || (released && touch.x < 233)) {
      cancelToAgents();
    } else if (button_b_pressed || (released && touch.x >= 233)) {
      const auto effect = calm_operator::transition(operator_state, Event::Confirm);
      applyEffect(effect);
      if (effect.submit_button_decision) submitButtonDecision();
      if (effect.submit_voice_decision && !confirmVoice()) {
        Serial.println("[operator] voice confirmation failed");
      }
      draw();
    }
    return;
  }
  if (operator_state.screen == Screen::VoiceRecord) {
    if (button_a_pressed) {
      cancelToAgents();
      return;
    }
    const bool button_was_pressed = button_b_pressed;
    const bool button_was_released = M5.BtnB.wasReleased();
    const bool button_is_pressed = M5.BtnB.isPressed();
    if (button_was_pressed && !recording && !voice_command_id.length()) {
      applyEffect(calm_operator::transition(operator_state, Event::StartRecording));
      startRecording();
      draw();
    } else if (calm_operator::shouldStopVoiceRecording(
                   recording,
                   button_was_released,
                   button_is_pressed)) {
      applyEffect(calm_operator::transition(operator_state, Event::StopRecording));
      stopRecording();
      draw();
    }
    return;
  }
  if (operator_state.screen == Screen::Receipt &&
      (released || button_a_pressed || button_b_pressed)) {
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
  configureStopwatchButtonInputs();
  Serial.printf("[operator] stopwatch booted %s\n", FIRMWARE_VERSION);
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
  pollDecisionReceipt();
  if (operator_state.screen == Screen::Agents && millis() - last_console_poll >= CONSOLE_POLL_MS) {
    refreshConsole();
    draw();
  }
  if (millis() - last_heartbeat >= HEARTBEAT_MS) postHeartbeat();
  delay(8);
}
