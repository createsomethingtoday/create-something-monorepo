#include <Arduino.h>
#include <ArduinoJson.h>
#include <HTTPClient.h>
#include <M5Unified.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>

#if __has_include("operator_config.local.h")
#include "operator_config.local.h"
#else
#include "operator_config.example.h"
#endif

namespace {

constexpr const char* FIRMWARE_VERSION = "0.1.0";
constexpr uint32_t AUTO_SYNC_INTERVAL_MS = 5UL * 60UL * 1000UL;
constexpr uint32_t WIFI_TIMEOUT_MS = 15000;

struct Brief {
  String state = "setup";
  String headline = "CALM OPERATOR";
  String line1 = "Set up Wi-Fi";
  String line2 = "and Ink token";
  String detail = "Run config:write";
  String action = "Then upload firmware";
  String generatedAt;
  bool urgent = false;
};

struct MenuAction {
  const char* bucket;
  const char* label;
};

const MenuAction MENU[] = {
  {"Operator", "Sync"},
  {"Operator", "MCP Review"},
  {"Operator", "Check In"},
  {"Rhythm", "Clock"},
  {"Rhythm", "Rhythm"},
  {"Calm", "Calm Reset"},
  {"Calm", "Stone Garden"},
  {"Settings", "Alerts"},
  {"Settings", "Status"}
};

enum class Screen {
  Brief,
  Menu,
  Clock,
  Rhythm,
  CalmReset,
  StoneGarden,
  Status
};

Brief activeBrief;
Screen screen = Screen::Brief;
int menuIndex = 0;
bool alertsEnabled = true;
bool lastUrgentRendered = false;
uint32_t lastSyncAt = 0;
String lastSyncStatus = "boot";
String lastHttpError = "";
String clockLine1 = "";
String clockLine2 = "";
int stoneCursor = 0;
int stoneCount = 0;
const int STONE_SLOTS = 9;
const int STONE_X[STONE_SLOTS] = {50, 100, 150, 62, 100, 138, 45, 100, 155};
const int STONE_Y[STONE_SLOTS] = {75, 68, 75, 112, 105, 112, 150, 146, 150};
M5Canvas canvas(&M5.Display);

String origin() {
  String value = CALM_OPERATOR_BRIDGE_ORIGIN;
  while (value.endsWith("/")) value.remove(value.length() - 1);
  return value;
}

bool hasRuntimeConfig() {
  return strlen(CALM_OPERATOR_DEVICE_TOKEN) > 0;
}

int batteryMillivolts() {
  int mv = M5.Power.getBatteryVoltage();
  if (mv <= 0 || mv > 5000) return 0;
  return mv;
}

int batteryPercent() {
  const int mv = batteryMillivolts();
  if (mv <= 0) return 0;
  const int pct = map(mv, 3300, 4200, 0, 100);
  return constrain(pct, 0, 100);
}

void beepSoft() {
  if (!alertsEnabled) return;
  M5.Speaker.tone(4000, 35);
}

void beepUrgent() {
  if (!alertsEnabled) return;
  M5.Speaker.tone(5200, 90);
  delay(120);
  M5.Speaker.tone(3800, 90);
}

void flushFrame() {
  canvas.pushSprite(0, 0);
}

void drawWrapped(const String& text, int x, int y, int width, int lineHeight, int maxLines) {
  String normalized = text;
  normalized.replace("\n", " ");
  normalized.trim();

  int lines = 0;
  String line = "";
  String word = "";

  for (int i = 0; i <= normalized.length(); i++) {
    const char c = i < normalized.length() ? normalized.charAt(i) : ' ';
    if (c != ' ') {
      word += c;
      continue;
    }

    if (word.length() == 0) continue;
    const String candidate = line.length() == 0 ? word : line + " " + word;
    if (canvas.textWidth(candidate.c_str()) <= width || line.length() == 0) {
      line = candidate;
    } else {
      canvas.drawString(line, x, y + lines * lineHeight);
      lines++;
      if (lines >= maxLines) return;
      line = word;
    }
    word = "";
  }

  if (line.length() > 0 && lines < maxLines) {
    canvas.drawString(line, x, y + lines * lineHeight);
  }
}

void startFrame(const String& title, bool inverted = true) {
  canvas.fillScreen(TFT_WHITE);
  canvas.setTextSize(1);
  canvas.setTextDatum(top_left);
  if (inverted) {
    canvas.fillRect(0, 0, 200, 24, TFT_BLACK);
    canvas.setTextColor(TFT_WHITE, TFT_BLACK);
    canvas.drawString(title, 8, 7);
    canvas.setTextColor(TFT_BLACK, TFT_WHITE);
  } else {
    canvas.setTextColor(TFT_BLACK, TFT_WHITE);
    canvas.drawString(title, 8, 7);
    canvas.drawLine(8, 24, 192, 24, TFT_BLACK);
  }
}

void drawFooter(const String& left = "") {
  canvas.drawLine(8, 180, 192, 180, TFT_BLACK);
  canvas.setTextSize(1);
  String status = left;
  if (status.length() == 0) status = WiFi.status() == WL_CONNECTED ? "Wi-Fi" : "Offline";
  const int pct = batteryPercent();
  if (pct > 0) status += "  " + String(pct) + "%";
  canvas.drawString(status, 10, 186);
}

void renderBrief() {
  screen = Screen::Brief;
  startFrame(activeBrief.headline, true);
  canvas.setTextSize(1);
  drawWrapped(activeBrief.line1, 12, 42, 176, 16, 2);
  canvas.drawLine(26, 86, 174, 86, TFT_BLACK);
  drawWrapped(activeBrief.line2, 12, 100, 176, 15, 2);
  drawWrapped(activeBrief.action, 12, 136, 176, 14, 2);
  drawFooter(activeBrief.urgent ? "ATTENTION" : "CS");
  flushFrame();

  if (activeBrief.urgent && !lastUrgentRendered) {
    beepUrgent();
  }
  lastUrgentRendered = activeBrief.urgent;
}

void renderStatus(const String& title, const String& a, const String& b = "", const String& c = "") {
  screen = Screen::Status;
  startFrame(title, false);
  drawWrapped(a, 12, 42, 176, 15, 3);
  drawWrapped(b, 12, 96, 176, 15, 3);
  drawWrapped(c, 12, 148, 176, 14, 2);
  drawFooter();
  flushFrame();
}

void renderMenu() {
  screen = Screen::Menu;
  const MenuAction& action = MENU[menuIndex];
  startFrame(action.bucket, true);
  canvas.setTextSize(1);

  const int previous = (menuIndex + (int)(sizeof(MENU) / sizeof(MENU[0])) - 1) %
                       (int)(sizeof(MENU) / sizeof(MENU[0]));
  const int next = (menuIndex + 1) % (int)(sizeof(MENU) / sizeof(MENU[0]));

  canvas.drawString(MENU[previous].label, 18, 50);
  canvas.fillRect(10, 82, 180, 44, TFT_BLACK);
  canvas.setTextColor(TFT_WHITE, TFT_BLACK);
  canvas.setTextSize(2);
  drawWrapped(action.label, 18, 94, 164, 18, 1);
  canvas.setTextColor(TFT_BLACK, TFT_WHITE);
  canvas.setTextSize(1);
  canvas.drawString(MENU[next].label, 18, 142);
  drawFooter("A/C move  B select");
  flushFrame();
}

bool connectWifi() {
  if (WiFi.status() == WL_CONNECTED) return true;
  if (!hasRuntimeConfig()) {
    lastSyncStatus = "missing token";
    Serial.println("[ink] missing device/source token");
    return false;
  }

  const bool hasConfiguredWifi = strlen(CALM_OPERATOR_WIFI_SSID) > 0;
  Serial.printf("[ink] connecting Wi-Fi using %s credentials\n", hasConfiguredWifi ? "configured" : "saved");
  renderStatus(
    "CONNECTING",
    hasConfiguredWifi ? CALM_OPERATOR_WIFI_SSID : "Saved Wi-Fi",
    hasConfiguredWifi ? "Joining configured network" : "Trying stored ESP32 credentials",
    "Please wait");
  WiFi.mode(WIFI_STA);
  if (hasConfiguredWifi) {
    WiFi.begin(CALM_OPERATOR_WIFI_SSID, CALM_OPERATOR_WIFI_PASSWORD);
  } else {
    WiFi.begin();
  }

  const uint32_t start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < WIFI_TIMEOUT_MS) {
    delay(250);
    M5.update();
  }

  const bool ok = WiFi.status() == WL_CONNECTED;
  lastSyncStatus = ok ? "wifi connected" : "wifi failed";
  if (ok) {
    Serial.print("[ink] wifi connected ip=");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("[ink] wifi connection failed");
  }
  return ok;
}

String jsonEscape(const String& value) {
  String output = "";
  for (int i = 0; i < value.length(); i++) {
    const char c = value.charAt(i);
    if (c == '"' || c == '\\') output += '\\';
    output += c;
  }
  return output;
}

int requestBridge(const String& method, const String& path, const String& body, String& response) {
  if (!connectWifi()) return -100;

  Serial.printf("[ink] %s %s\n", method.c_str(), path.c_str());
  WiFiClientSecure client;
  client.setInsecure();

  HTTPClient http;
  const String url = origin() + path;
  http.setTimeout(15000);
  if (!http.begin(client, url)) {
    lastHttpError = "begin failed";
    return -101;
  }

  http.addHeader("x-ink-token", CALM_OPERATOR_DEVICE_TOKEN);
  http.addHeader("content-type", "application/json");

  int status = 0;
  if (method == "POST") {
    status = http.POST(body);
  } else {
    status = http.GET();
  }
  response = http.getString();
  http.end();
  Serial.printf("[ink] bridge status=%d bytes=%d\n", status, response.length());

  if (status < 200 || status >= 300) {
    lastHttpError = "HTTP " + String(status);
  } else {
    lastHttpError = "";
  }
  return status;
}

void postHeartbeat() {
  Serial.println("[ink] posting heartbeat");
  String ignored;
  const String body =
    String("{\"device_id\":\"") + jsonEscape(CALM_OPERATOR_DEVICE_ID) +
    "\",\"surface\":\"" + jsonEscape(CALM_OPERATOR_SURFACE) +
    "\",\"firmware_version\":\"" + FIRMWARE_VERSION +
    "\",\"battery_percent\":" + String(batteryPercent()) +
    ",\"battery_mv\":" + String(batteryMillivolts()) +
    ",\"power_mode\":\"wifi\"}";
  requestBridge("POST", "/ink/device-heartbeat", body, ignored);
}

void applyBriefPayload(const String& payload) {
  JsonDocument doc;
  const DeserializationError error = deserializeJson(doc, payload);
  if (error) {
    activeBrief.headline = "SYNC FAILED";
    activeBrief.line1 = "Bad bridge JSON";
    activeBrief.line2 = error.c_str();
    activeBrief.detail = payload.substring(0, 60);
    activeBrief.action = "Try Sync again";
    activeBrief.urgent = false;
    return;
  }

  activeBrief.state = String((const char*)(doc["state"] | "unknown"));
  activeBrief.headline = String((const char*)(doc["headline"] | "CALM OPERATOR"));
  activeBrief.line1 = String((const char*)(doc["line1"] | "No decisions"));
  activeBrief.line2 = String((const char*)(doc["line2"] | "pending"));
  activeBrief.detail = String((const char*)(doc["detail"] | ""));
  activeBrief.action = String((const char*)(doc["action"] | "You can step away."));
  activeBrief.generatedAt = String((const char*)(doc["generated_at"] | ""));
  activeBrief.urgent = doc["urgent"] | false;

  JsonVariantConst clock = doc["clock"];
  if (!clock.isNull()) {
    clockLine1 = String((const char*)(clock["display_time"] | ""));
    clockLine2 = String((const char*)(clock["display_date"] | ""));
  }
}

bool fetchBrief(bool announce = true) {
  Serial.println("[ink] syncing brief");
  if (announce) renderStatus("SYNC", "Fetching operator brief", "Production Ink bridge");
  String payload;
  const String path = String("/ink/brief?surface=") + CALM_OPERATOR_SURFACE;
  const int status = requestBridge("GET", path, "", payload);
  if (status < 200 || status >= 300) {
    activeBrief.headline = "SYNC FAILED";
    activeBrief.line1 = lastHttpError.length() > 0 ? lastHttpError : "Network failed";
    activeBrief.line2 = "Bridge unavailable";
    activeBrief.detail = payload.substring(0, 70);
    activeBrief.action = "Check Wi-Fi/token";
    activeBrief.urgent = false;
    renderBrief();
    return false;
  }

  applyBriefPayload(payload);
  lastSyncAt = millis();
  lastSyncStatus = "synced";
  postHeartbeat();
  renderBrief();
  return true;
}

void requestMcpReview() {
  Serial.println("[ink] requesting MCP review");
  renderStatus("MCP REVIEW", "Running remote review", "This can take a moment");
  String payload;
  const int status = requestBridge("POST", "/ink/health-review/request", "{}", payload);
  if (status >= 200 && status < 300) {
    applyBriefPayload(payload);
    lastSyncAt = millis();
    lastSyncStatus = "mcp reviewed";
    renderBrief();
    return;
  }

  activeBrief.headline = "REVIEW FAILED";
  activeBrief.line1 = lastHttpError.length() > 0 ? lastHttpError : "Remote request failed";
  activeBrief.line2 = "MCP review not updated";
  activeBrief.action = "Check bridge logs";
  activeBrief.urgent = true;
  renderBrief();
}

void operatorCheckIn() {
  Serial.println("[ink] saving operator check-in");
  renderStatus("CHECK IN", "Saving operator state", "Manual Ink check-in");
  String payload;
  const String body =
    String("{\"key\":\"manual\",\"label\":\"Ink check-in\",\"detail\":\"Manual Core Ink operator check-in\",") +
    "\"surface\":\"" + jsonEscape(CALM_OPERATOR_SURFACE) + "\"," +
    "\"device_id\":\"" + jsonEscape(CALM_OPERATOR_DEVICE_ID) + "\"," +
    "\"battery_percent\":" + String(batteryPercent()) + "}";
  const int status = requestBridge("POST", "/ink/operator-check-in", body, payload);
  if (status >= 200 && status < 300) {
    applyBriefPayload(payload);
    lastSyncStatus = "check-in saved";
    renderBrief();
  } else {
    renderStatus("CHECK-IN FAILED", lastHttpError, "Try Sync later");
  }
}

void fetchClock() {
  Serial.println("[ink] fetching clock");
  renderStatus("CLOCK", "Fetching Central Time");
  String payload;
  const int status = requestBridge("GET", "/ink/clock", "", payload);
  if (status >= 200 && status < 300) {
    JsonDocument doc;
    if (!deserializeJson(doc, payload)) {
      clockLine1 = String((const char*)(doc["display_time"] | ""));
      clockLine2 = String((const char*)(doc["display_date"] | ""));
    }
  }

  screen = Screen::Clock;
  startFrame("CLOCK", false);
  canvas.setTextSize(2);
  drawWrapped(clockLine1.length() ? clockLine1 : "Unknown", 18, 60, 170, 22, 2);
  canvas.setTextSize(1);
  drawWrapped(clockLine2.length() ? clockLine2 : "Central Time", 18, 118, 170, 16, 2);
  drawFooter("B menu");
  flushFrame();
}

void renderRhythm() {
  screen = Screen::Rhythm;
  startFrame("RHYTHM", true);
  canvas.drawString("06:00  WORKOUT", 18, 44);
  canvas.drawString("09:00  WORK", 18, 68);
  canvas.drawString("12:30  WALK", 18, 92);
  canvas.drawString("15:00  EAT", 18, 116);
  canvas.drawString("23:00  SLEEP", 18, 140);
  drawFooter("B menu");
  flushFrame();
}

void renderCalmReset() {
  screen = Screen::CalmReset;
  startFrame("CALM RESET", false);
  canvas.drawCircle(100, 78, 30, TFT_BLACK);
  canvas.drawCircle(100, 78, 18, TFT_BLACK);
  canvas.setTextSize(1);
  drawWrapped("Breathe in. Hold. Breathe out.", 22, 124, 156, 15, 3);
  drawFooter("B menu");
  flushFrame();
}

void renderStoneGarden() {
  screen = Screen::StoneGarden;
  startFrame("STONE GARDEN", false);
  for (int i = 0; i < STONE_SLOTS; i++) {
    canvas.drawCircle(STONE_X[i], STONE_Y[i], 10, TFT_BLACK);
    if (i < stoneCount) {
      canvas.fillCircle(STONE_X[i], STONE_Y[i], 6, TFT_BLACK);
    }
  }
  canvas.drawRect(STONE_X[stoneCursor] - 14, STONE_Y[stoneCursor] - 14, 28, 28, TFT_BLACK);
  canvas.drawString("A/C move  B place", 28, 162);
  drawFooter("PWR sync");
  flushFrame();
}

void renderSettingsStatus() {
  renderStatus(
    "STATUS",
    WiFi.status() == WL_CONNECTED ? WiFi.localIP().toString() : "Wi-Fi offline",
    "Last: " + lastSyncStatus + (lastHttpError.length() ? " / " + lastHttpError : ""),
    String("FW ") + FIRMWARE_VERSION + "  token " + (strlen(CALM_OPERATOR_DEVICE_TOKEN) ? "yes" : "no"));
}

void selectMenuAction() {
  const String label = MENU[menuIndex].label;
  Serial.print("[ink] selected action=");
  Serial.println(label);
  if (label == "Sync") {
    fetchBrief(true);
  } else if (label == "MCP Review") {
    requestMcpReview();
  } else if (label == "Check In") {
    operatorCheckIn();
  } else if (label == "Clock") {
    fetchClock();
  } else if (label == "Rhythm") {
    renderRhythm();
  } else if (label == "Calm Reset") {
    renderCalmReset();
  } else if (label == "Stone Garden") {
    renderStoneGarden();
  } else if (label == "Alerts") {
    alertsEnabled = !alertsEnabled;
    renderStatus("ALERTS", alertsEnabled ? "Beep is ON" : "Beep is OFF", "Use menu to toggle");
    beepSoft();
  } else {
    renderSettingsStatus();
  }
}

void handleSelect() {
  if (screen == Screen::Brief || screen == Screen::Clock || screen == Screen::Rhythm ||
      screen == Screen::CalmReset || screen == Screen::Status) {
    renderMenu();
    return;
  }

  if (screen == Screen::StoneGarden) {
    if (stoneCount < STONE_SLOTS && stoneCursor == stoneCount) stoneCount++;
    renderStoneGarden();
    return;
  }

  selectMenuAction();
}

void handlePrevious() {
  if (screen == Screen::Menu) {
    const int count = (int)(sizeof(MENU) / sizeof(MENU[0]));
    menuIndex = (menuIndex + count - 1) % count;
    renderMenu();
  } else if (screen == Screen::StoneGarden) {
    stoneCursor = (stoneCursor + STONE_SLOTS - 1) % STONE_SLOTS;
    renderStoneGarden();
  }
}

void handleNext() {
  if (screen == Screen::Menu) {
    const int count = (int)(sizeof(MENU) / sizeof(MENU[0]));
    menuIndex = (menuIndex + 1) % count;
    renderMenu();
  } else if (screen == Screen::StoneGarden) {
    stoneCursor = (stoneCursor + 1) % STONE_SLOTS;
    renderStoneGarden();
  }
}

void renderBoot() {
  startFrame("CALM OPERATOR", true);
  drawWrapped("Production Ink firmware", 18, 50, 164, 16, 2);
  drawWrapped(String("FW ") + FIRMWARE_VERSION, 18, 92, 164, 16, 1);
  drawWrapped("B opens menu. PWR syncs.", 18, 128, 164, 16, 2);
  drawFooter("boot");
  flushFrame();
}

} // namespace

void setup() {
  Serial.begin(115200);
  delay(200);
  Serial.println();
  Serial.printf("[ink] boot firmware=%s\n", FIRMWARE_VERSION);
  auto cfg = M5.config();
  M5.begin(cfg);
  M5.Display.setRotation(0);
  canvas.setColorDepth(1);
  canvas.createSprite(200, 200);
  canvas.setTextSize(1);
  canvas.setTextColor(TFT_BLACK, TFT_WHITE);
  renderBoot();

  if (!hasRuntimeConfig()) {
    activeBrief.headline = "SETUP NEEDED";
    activeBrief.line1 = "Missing Ink token";
    activeBrief.line2 = "Wi-Fi can be saved";
    activeBrief.action = "Run config:write";
    renderBrief();
    return;
  }

  fetchBrief(true);
}

void loop() {
  M5.update();

  if (M5.BtnA.wasPressed()) {
    handlePrevious();
  }
  if (M5.BtnC.wasPressed()) {
    handleNext();
  }
  if (M5.BtnB.wasPressed() || M5.BtnEXT.wasPressed()) {
    handleSelect();
  }
  if (M5.BtnPWR.wasPressed()) {
    fetchBrief(true);
  }

  if (hasRuntimeConfig() && millis() - lastSyncAt > AUTO_SYNC_INTERVAL_MS && screen == Screen::Brief) {
    fetchBrief(false);
  }

  delay(30);
}
