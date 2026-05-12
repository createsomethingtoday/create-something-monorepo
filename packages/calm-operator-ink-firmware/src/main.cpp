#include <Arduino.h>
#include <ArduinoJson.h>
#include <HTTPClient.h>
#include <M5Unified.h>
#include <Preferences.h>
#include <Update.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <mbedtls/bignum.h>
#include <mbedtls/ecdsa.h>
#include <mbedtls/ecp.h>
#include <mbedtls/sha256.h>

#include "firmware_signing_pubkey.h"

#if __has_include("operator_config.local.h")
#include "operator_config.local.h"
#else
#include "operator_config.example.h"
#endif

namespace {

constexpr const char* FIRMWARE_VERSION = "0.1.9";
constexpr uint32_t AUTO_SYNC_INTERVAL_MS = 5UL * 60UL * 1000UL;
constexpr uint32_t WIFI_TIMEOUT_MS = 15000;
constexpr int LOW_BATTERY_PERCENT = 15;
constexpr int RHYTHM_ANCHOR_MAX = 5;
constexpr const char* SETTINGS_NAMESPACE = "calm-ink";

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

struct RhythmAnchor {
  String time;
  String label;
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
  {"Settings", "Quiet Mode"},
  {"Settings", "Update"},
  {"Settings", "Status"}
};
constexpr int MENU_COUNT = sizeof(MENU) / sizeof(MENU[0]);

enum class Screen {
  Brief,
  Menu,
  Clock,
  Rhythm,
  CalmReset,
  StoneGarden,
  Status,
  Detail,
  Update
};

Brief activeBrief;
Screen screen = Screen::Brief;
int menuIndex = 0;
bool alertsEnabled = true;
bool quietMode = false;
bool lastUrgentRendered = false;
bool briefIsCached = false;
bool rtcSeeded = false;
uint32_t lastSyncAt = 0;          // millis() of last *successful* sync
uint32_t lastSyncAttemptAt = 0;   // millis() of last sync *attempt* (success or fail)
uint32_t consecutiveSyncFailures = 0;
String lastSyncStatus = "boot";
String lastHttpError = "";
String lastFrameKey = "";
String clockLine1 = "";
String clockLine2 = "";
int stoneCursor = 0;
int stoneCount = 0;
const int STONE_SLOTS = 9;
const int STONE_X[STONE_SLOTS] = {50, 100, 150, 62, 100, 138, 45, 100, 155};
const int STONE_Y[STONE_SLOTS] = {75, 68, 75, 112, 105, 112, 150, 146, 150};
RhythmAnchor rhythmAnchors[RHYTHM_ANCHOR_MAX] = {
  {"06:00", "WORKOUT"},
  {"09:00", "WORK"},
  {"12:30", "WALK"},
  {"15:00", "EAT"},
  {"23:00", "SLEEP"}
};
int rhythmAnchorCount = RHYTHM_ANCHOR_MAX;
String rhythmSource = "Default";
M5Canvas canvas(&M5.Display);
Preferences prefs;

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

String batteryLabel() {
  const int pct = batteryPercent();
  if (pct <= 0) return "";
  if (pct >= 98 && batteryMillivolts() >= 4150) return "FULL";
  if (pct <= LOW_BATTERY_PERCENT) return "LOW";
  return String(pct) + "%";
}

// Compact age string that doubles as a trust signal in the footer.
// Buckets are coarse on purpose: the screen key uses this output, so a too-fine
// bucket would force needless e-ink refreshes between auto-syncs.
String formatSyncAge() {
  if (briefIsCached) return "Cached";
  if (lastSyncAt == 0) return "";
  const uint32_t elapsed = millis() - lastSyncAt;
  const uint32_t seconds = elapsed / 1000UL;
  if (seconds < 60UL) return "Synced now";
  const uint32_t minutes = seconds / 60UL;
  if (minutes < 60UL) return String("Synced ") + minutes + "m";
  const uint32_t hours = minutes / 60UL;
  if (hours < 24UL) return String("Synced ") + hours + "h";
  return "Stale";
}

String soundLabel() {
  if (quietMode) return "QUIET";
  if (!alertsEnabled) return "MUTE";
  return "BEEP";
}

void loadSettings() {
  prefs.begin(SETTINGS_NAMESPACE, false);
  alertsEnabled = prefs.getBool("alerts", true);
  quietMode = prefs.getBool("quiet", false);
  Serial.printf("[ink] settings alerts=%s quiet=%s\n", alertsEnabled ? "on" : "off", quietMode ? "on" : "off");
}

void saveSettings() {
  prefs.putBool("alerts", alertsEnabled);
  prefs.putBool("quiet", quietMode);
}

// Persist the current brief so the next boot can render it before Wi-Fi is
// up. NVS de-duplicates identical writes, so calling this every sync is cheap.
void saveBriefToNvs() {
  prefs.putString("br_h", activeBrief.headline);
  prefs.putString("br_l1", activeBrief.line1);
  prefs.putString("br_l2", activeBrief.line2);
  prefs.putString("br_d", activeBrief.detail);
  prefs.putString("br_a", activeBrief.action);
  prefs.putString("br_st", activeBrief.state);
  prefs.putString("br_g", activeBrief.generatedAt);
  prefs.putBool("br_u", activeBrief.urgent);
}

bool loadBriefFromNvs() {
  const String headline = prefs.getString("br_h", "");
  if (headline.length() == 0) return false;
  activeBrief.headline = headline;
  activeBrief.line1 = prefs.getString("br_l1", "");
  activeBrief.line2 = prefs.getString("br_l2", "");
  activeBrief.detail = prefs.getString("br_d", "");
  activeBrief.action = prefs.getString("br_a", "");
  activeBrief.state = prefs.getString("br_st", "unknown");
  activeBrief.generatedAt = prefs.getString("br_g", "");
  // Don't restore urgent: the device just booted; we don't know if it's still
  // urgent, and the cached label is enough trust signal. Fresh fetch will set
  // urgent correctly.
  activeBrief.urgent = false;
  return true;
}

// Seed the BM8563 RTC from a bridge clock payload so the Clock screen stays
// honest when /ink/clock is unreachable. The bridge timezone is authoritative
// (America/Chicago); the RTC stores those wall-clock values directly so reads
// can be displayed without a tz library on-device.
void seedRtcFromBridgeClock(JsonVariantConst clock) {
  if (clock.isNull()) return;
  const String date = String((const char*)(clock["local_date"] | ""));
  if (date.length() < 10) return;
  const int year = date.substring(0, 4).toInt();
  const int month = date.substring(5, 7).toInt();
  const int day = date.substring(8, 10).toInt();
  const int hour = clock["hour"] | -1;
  const int minute = clock["minute"] | -1;
  if (year < 2025 || month < 1 || month > 12 || day < 1 || day > 31) return;
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return;
  m5::rtc_date_t d{(int16_t)year, (int8_t)month, (int8_t)day};
  m5::rtc_time_t t{(int8_t)hour, (int8_t)minute, 0};
  M5.Rtc.setDateTime({d, t});
  rtcSeeded = true;
  Serial.printf("[ink] RTC seeded to %04d-%02d-%02d %02d:%02d CT\n", year, month, day, hour, minute);
}

String formatDisplayTime(int hour, int minute) {
  const char* suffix = hour >= 12 ? "PM" : "AM";
  int displayHour = hour % 12;
  if (displayHour == 0) displayHour = 12;
  char buf[16];
  snprintf(buf, sizeof(buf), "%d:%02d %s", displayHour, minute, suffix);
  return String(buf);
}

// Populate clockLine1/clockLine2 from the on-device RTC. Returns true when the
// RTC has been seeded at some point (this boot or a previous one - BM8563
// retains state across power cycles when backup is available).
bool readRtcClock() {
  m5::rtc_datetime_t dt;
  if (!M5.Rtc.getDateTime(&dt)) return false;
  if (dt.date.year < 2025) return false;
  clockLine1 = formatDisplayTime(dt.time.hours, dt.time.minutes);
  char dateBuf[16];
  snprintf(dateBuf, sizeof(dateBuf), "%04d-%02d-%02d", dt.date.year, dt.date.month, dt.date.date);
  clockLine2 = String(dateBuf);
  return true;
}

void beepSoft() {
  if (!alertsEnabled || quietMode) return;
  M5.Speaker.tone(4000, 35);
}

void beepUrgent() {
  if (!alertsEnabled || quietMode) return;
  M5.Speaker.tone(5200, 90);
  delay(120);
  M5.Speaker.tone(3800, 90);
}

void flushFrame(const String& key, bool force = false) {
  if (!force && key == lastFrameKey) {
    Serial.print("[ink] skipped duplicate frame=");
    Serial.println(key);
    return;
  }
  lastFrameKey = key;
  canvas.pushSprite(0, 0);
}

String screenKey(
  const String& type,
  const String& a = "",
  const String& b = "",
  const String& c = "",
  const String& d = "",
  const String& e = "") {
  return type + "|" + a + "|" + b + "|" + c + "|" + d + "|" + e;
}

String fitText(String text, int width) {
  text.trim();
  if (canvas.textWidth(text.c_str()) <= width) return text;

  while (text.length() > 2) {
    text.remove(text.length() - 1);
    const String candidate = text + "..";
    if (canvas.textWidth(candidate.c_str()) <= width) return candidate;
  }

  return "..";
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
      canvas.drawString(fitText(line, width), x, y + lines * lineHeight);
      lines++;
      if (lines >= maxLines) return;
      line = word;
    }
    word = "";
  }

  if (line.length() > 0 && lines < maxLines) {
    canvas.drawString(fitText(line, width), x, y + lines * lineHeight);
  }
}

String footerMeta() {
  String meta = batteryLabel();
  if (meta.length() > 0) meta += " ";
  meta += soundLabel();
  return meta;
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
  const String meta = footerMeta();
  const int metaWidth = canvas.textWidth(meta.c_str());
  const int metaX = max(96, 192 - metaWidth);
  const int statusWidth = max(70, metaX - 16);
  canvas.drawString(fitText(status, statusWidth), 10, 186);
  canvas.drawString(meta, metaX, 186);
}

void renderBrief() {
  screen = Screen::Brief;
  startFrame(activeBrief.headline, true);
  canvas.setTextSize(1);
  drawWrapped(activeBrief.line1, 12, 42, 176, 16, 2);
  drawWrapped(activeBrief.line2, 12, 78, 176, 15, 2);
  canvas.drawLine(26, 118, 174, 118, TFT_BLACK);
  drawWrapped(activeBrief.action, 12, 132, 176, 14, 2);
  const String footerLeft = activeBrief.urgent ? String("ATTENTION") : formatSyncAge();
  drawFooter(footerLeft);
  // Include footerLeft in the screen key so an age-bucket change (1m -> 2m)
  // busts the duplicate-frame skip when no other content changed.
  flushFrame(
    screenKey("brief", activeBrief.headline, activeBrief.line1, activeBrief.line2, activeBrief.action, footerLeft));

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
  flushFrame(screenKey("status", title, a, b, c));
}

String menuDisplayLabel(const MenuAction& action) {
  const String label = action.label;
  if (label == "Alerts") return String("Alerts ") + (alertsEnabled ? "On" : "Off");
  if (label == "Quiet Mode") return String("Quiet ") + (quietMode ? "On" : "Off");
  return label;
}

String menuHint(const String& label) {
  if (label == "Sync") return "Fetch latest brief";
  if (label == "MCP Review") return "Run health review";
  if (label == "Check In") return "Save operator state";
  if (label == "Clock") return "Show Central Time";
  if (label == "Rhythm") return "Daily anchors";
  if (label == "Calm Reset") return "Breathing reset";
  if (label == "Stone Garden") return "Slow tactile play";
  if (label == "Alerts") return "Toggle beeps";
  if (label == "Quiet Mode") return "Mute all beeps";
  if (label == "Update") return "Check OTA firmware";
  if (label == "Status") return "Device status";
  return "";
}

void renderMenu() {
  screen = Screen::Menu;
  const MenuAction& action = MENU[menuIndex];
  startFrame(String(action.bucket) + " " + String(menuIndex + 1) + "/" + String(MENU_COUNT), true);
  canvas.setTextSize(1);

  const int previous = (menuIndex + MENU_COUNT - 1) % MENU_COUNT;
  const int next = (menuIndex + 1) % MENU_COUNT;

  canvas.drawString(fitText(menuDisplayLabel(MENU[previous]), 160), 18, 44);
  canvas.fillRect(10, 68, 180, 42, TFT_BLACK);
  canvas.setTextColor(TFT_WHITE, TFT_BLACK);
  canvas.setTextSize(2);
  const String selectedLabel = menuDisplayLabel(action);
  if (canvas.textWidth(selectedLabel.c_str()) > 164) canvas.setTextSize(1);
  drawWrapped(selectedLabel, 18, 80, 164, 18, 1);
  canvas.setTextColor(TFT_BLACK, TFT_WHITE);
  canvas.setTextSize(1);
  canvas.drawString(fitText(menuHint(action.label), 160), 20, 122);
  canvas.drawString(fitText(menuDisplayLabel(MENU[next]), 160), 18, 148);
  drawFooter("A/C move B select");
  flushFrame(screenKey("menu", action.bucket, selectedLabel, menuDisplayLabel(MENU[previous]), menuDisplayLabel(MENU[next])));
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

// Returns true when the payload parsed cleanly and activeBrief reflects fresh
// bridge content. Returns false when the response was unusable; the caller
// must NOT treat that as a successful sync (no NVS save, no heartbeat, no
// lastSyncAt bump).
bool applyBriefPayload(const String& payload) {
  JsonDocument doc;
  const DeserializationError error = deserializeJson(doc, payload);
  if (error) {
    activeBrief.headline = "SYNC FAILED";
    activeBrief.line1 = "Bad bridge JSON";
    activeBrief.line2 = error.c_str();
    activeBrief.detail = payload.substring(0, 60);
    activeBrief.action = "Try Sync again";
    activeBrief.urgent = false;
    return false;
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
    // /ink/brief only ships local_date; /ink/clock adds display_date. Accept either.
    clockLine2 = String((const char*)(clock["display_date"] | clock["local_date"] | ""));
    seedRtcFromBridgeClock(clock);
  }
  return true;
}

bool fetchBrief(bool announce = true) {
  Serial.println("[ink] syncing brief");
  if (announce) beepSoft();
  // Whatever this fetch returns (data or failure message) replaces the
  // cached-from-NVS body, so the "Cached" footer signal no longer applies.
  briefIsCached = false;
  // Record the attempt up-front so auto-sync backs off on failure regardless
  // of how requestBridge() returns. Without this, a persistently-unreachable
  // bridge causes the loop() auto-sync to re-fire every iteration (~15 s of
  // blocking HTTP each time).
  lastSyncAttemptAt = millis();
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
    consecutiveSyncFailures++;
    lastSyncStatus = String("net fail x") + consecutiveSyncFailures;
    renderBrief();
    return false;
  }

  if (!applyBriefPayload(payload)) {
    // HTTP 200 but unparseable body. Show the parse-failure brief (set inside
    // applyBriefPayload) but do not persist it to NVS, do not advance the
    // success clock, and do not heartbeat — the device should not vouch for
    // a malformed bridge response.
    consecutiveSyncFailures++;
    lastSyncStatus = String("parse error x") + consecutiveSyncFailures;
    renderBrief();
    return false;
  }

  lastSyncAt = millis();
  lastSyncStatus = "synced";
  consecutiveSyncFailures = 0;
  saveBriefToNvs();
  postHeartbeat();
  renderBrief();
  return true;
}

void requestMcpReview() {
  Serial.println("[ink] requesting MCP review");
  beepSoft();
  briefIsCached = false;
  String payload;
  const int status = requestBridge("POST", "/ink/health-review/request", "{}", payload);
  lastSyncAttemptAt = millis();
  if (status >= 200 && status < 300) {
    if (!applyBriefPayload(payload)) {
      consecutiveSyncFailures++;
      lastSyncStatus = String("review parse error x") + consecutiveSyncFailures;
      renderBrief();
      return;
    }
    lastSyncAt = millis();
    lastSyncStatus = "mcp reviewed";
    consecutiveSyncFailures = 0;
    briefIsCached = false;
    saveBriefToNvs();
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
    String("{\"type\":\"manual_check_in\",\"source\":\"core-ink\",") +
    "\"summary\":\"Manual Core Ink operator check-in\"," +
    "\"payload\":{\"surface\":\"" + jsonEscape(CALM_OPERATOR_SURFACE) + "\"," +
    "\"device_id\":\"" + jsonEscape(CALM_OPERATOR_DEVICE_ID) + "\"," +
    "\"battery_percent\":" + String(batteryPercent()) + "}}";
  const int status = requestBridge("POST", "/ink/operator-event", body, payload);
  if (status >= 200 && status < 300) {
    lastSyncStatus = "check-in saved";
    fetchBrief(true);
  } else {
    renderStatus("CHECK-IN FAILED", lastHttpError, "Try Sync later");
  }
}

void resetRhythmAnchors() {
  const char* times[RHYTHM_ANCHOR_MAX] = {"06:00", "09:00", "12:30", "15:00", "23:00"};
  const char* labels[RHYTHM_ANCHOR_MAX] = {"WORKOUT", "WORK", "WALK", "EAT", "SLEEP"};
  for (int i = 0; i < RHYTHM_ANCHOR_MAX; i++) {
    rhythmAnchors[i].time = times[i];
    rhythmAnchors[i].label = labels[i];
  }
  rhythmAnchorCount = RHYTHM_ANCHOR_MAX;
  rhythmSource = "Default";
}

bool isValidRhythmTime(const String& time) {
  if (time.length() != 5 || time.charAt(2) != ':') return false;
  const char h0 = time.charAt(0);
  const char h1 = time.charAt(1);
  const char m0 = time.charAt(3);
  const char m1 = time.charAt(4);
  if (h0 < '0' || h0 > '2' || h1 < '0' || h1 > '9') return false;
  if (m0 < '0' || m0 > '5' || m1 < '0' || m1 > '9') return false;
  return time.substring(0, 2).toInt() <= 23;
}

bool applyRhythmPayload(const String& payload) {
  JsonDocument doc;
  if (deserializeJson(doc, payload)) return false;
  JsonArrayConst anchors = doc["anchors"].as<JsonArrayConst>();
  if (anchors.isNull()) return false;

  RhythmAnchor parsed[RHYTHM_ANCHOR_MAX];
  int count = 0;
  for (JsonVariantConst item : anchors) {
    String time = String((const char*)(item["time"] | ""));
    String label = String((const char*)(item["label"] | ""));
    time.trim();
    label.trim();
    if (!isValidRhythmTime(time) || label.length() == 0) continue;
    parsed[count].time = time;
    parsed[count].label = label;
    count++;
    if (count >= RHYTHM_ANCHOR_MAX) break;
  }

  if (count == 0) return false;
  for (int i = 0; i < count; i++) {
    rhythmAnchors[i] = parsed[i];
  }
  rhythmAnchorCount = count;
  rhythmSource = "Bridge";
  return true;
}

String rhythmKey() {
  String key = rhythmSource;
  for (int i = 0; i < rhythmAnchorCount; i++) {
    key += "|";
    key += rhythmAnchors[i].time;
    key += ":";
    key += rhythmAnchors[i].label;
  }
  return key;
}

void fetchClock() {
  Serial.println("[ink] fetching clock");
  String payload;
  String sourceTag = "";  // Empty when fresh, "RTC" when fallback was used.
  const int status = requestBridge("GET", "/ink/clock", "", payload);
  if (status >= 200 && status < 300) {
    JsonDocument doc;
    if (!deserializeJson(doc, payload)) {
      JsonVariantConst clock = doc["clock"];
      if (clock.isNull()) clock = doc.as<JsonVariantConst>();
      clockLine1 = String((const char*)(clock["display_time"] | ""));
      clockLine2 = String((const char*)(clock["display_date"] | clock["local_date"] | ""));
      seedRtcFromBridgeClock(clock);
    }
  } else if (readRtcClock()) {
    // Bridge unreachable but RTC has a seeded value - use it and tell the
    // operator the time is locally tracked, not freshly fetched.
    sourceTag = "RTC";
  } else if (clockLine1.length() == 0) {
    clockLine1 = "Clock failed";
    clockLine2 = lastHttpError.length() ? lastHttpError : "Bridge unavailable";
  }

  screen = Screen::Clock;
  startFrame("CLOCK", false);
  canvas.setTextSize(2);
  drawWrapped(clockLine1.length() ? clockLine1 : "Unknown", 18, 60, 170, 22, 2);
  canvas.setTextSize(1);
  drawWrapped(clockLine2.length() ? clockLine2 : "Central Time", 18, 118, 170, 16, 2);
  const String footerLeft = sourceTag.length() > 0 ? sourceTag + " B menu" : String("B menu");
  drawFooter(footerLeft);
  flushFrame(screenKey("clock", clockLine1, clockLine2, footerLeft));
}

void renderRhythm() {
  screen = Screen::Rhythm;
  startFrame("RHYTHM", true);
  for (int i = 0; i < rhythmAnchorCount; i++) {
    const int y = 44 + i * 24;
    canvas.drawString(fitText(rhythmAnchors[i].time, 42), 18, y);
    canvas.drawString(fitText(rhythmAnchors[i].label, 112), 70, y);
  }
  const String footerLeft = rhythmSource + " B menu";
  drawFooter(footerLeft);
  flushFrame(screenKey("rhythm", rhythmKey(), footerLeft));
}

void fetchRhythm() {
  Serial.println("[ink] fetching rhythm anchors");
  renderStatus("RHYTHM", "Loading daily anchors", "Bridge rhythm");
  String payload;
  const int status = requestBridge("GET", "/ink/rhythm", "", payload);
  if (status >= 200 && status < 300) {
    if (!applyRhythmPayload(payload)) resetRhythmAnchors();
  } else {
    // Keep the last known anchors on screen, but mark that this draw is offline.
    rhythmSource = "Offline";
  }
  renderRhythm();
}

void renderCalmReset() {
  screen = Screen::CalmReset;
  startFrame("CALM RESET", false);
  canvas.drawCircle(100, 78, 30, TFT_BLACK);
  canvas.drawCircle(100, 78, 18, TFT_BLACK);
  canvas.setTextSize(1);
  drawWrapped("Breathe in. Hold. Breathe out.", 22, 124, 156, 15, 3);
  drawFooter("B menu");
  flushFrame(screenKey("calm-reset"));
}

void renderDetail() {
  screen = Screen::Detail;
  startFrame("DETAIL", false);
  canvas.setTextSize(1);
  const String body = activeBrief.detail.length() > 0 ? activeBrief.detail : String("No additional detail from bridge.");
  drawWrapped(body, 12, 40, 176, 14, 9);
  drawFooter("B menu");
  // Frame key keyed on first 60 chars so a changed detail busts the skip.
  flushFrame(screenKey("detail", body.substring(0, 30), body.substring(30, 60)));
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
  const bool full = stoneCount >= STONE_SLOTS;
  canvas.drawString(full ? "B clears garden" : "A/C move  B place", 28, 162);
  drawFooter("PWR sync");
  flushFrame(screenKey("stone", String(stoneCursor), String(stoneCount), full ? "full" : "place"));
}

// ---- OTA firmware update ---------------------------------------------------

struct FirmwareManifest {
  bool valid = false;
  String version;
  String url;
  String sha256;
  int32_t size = 0;
  String notes;
  String signature;  // Base64-encoded 64-byte ECDSA P-256 r||s
};

// Decode RFC 4648 base64 (with optional padding) into a fixed-size output.
// Returns true when the decoded length matches `outLen` exactly.
bool decodeBase64Fixed(const String& input, uint8_t* out, size_t outLen) {
  static constexpr int8_t TABLE[256] = {
    /* 0x00 */ -1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
    /* 0x10 */ -1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
    /* 0x20 */ -1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,62,-1,-1,-1,63,
    /* 0x30 */ 52,53,54,55,56,57,58,59,60,61,-1,-1,-1,-1,-1,-1,
    /* 0x40 */ -1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9,10,11,12,13,14,
    /* 0x50 */ 15,16,17,18,19,20,21,22,23,24,25,-1,-1,-1,-1,-1,
    /* 0x60 */ -1,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,
    /* 0x70 */ 41,42,43,44,45,46,47,48,49,50,51,-1,-1,-1,-1,-1,
    /* 0x80+ */ -1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
    -1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
    -1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
    -1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
    -1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
    -1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
    -1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
    -1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1
  };
  uint32_t buffer = 0;
  int bits = 0;
  size_t written = 0;
  for (int i = 0; i < input.length(); i++) {
    const uint8_t c = (uint8_t)input.charAt(i);
    if (c == '=' || c == '\n' || c == '\r' || c == ' ') continue;
    const int8_t v = TABLE[c];
    if (v < 0) return false;
    buffer = (buffer << 6) | (uint32_t)v;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      if (written >= outLen) return false;
      out[written++] = (uint8_t)((buffer >> bits) & 0xff);
    }
  }
  return written == outLen;
}

// Verify an ECDSA-P256-SHA256 signature over `payload` using the burned-in
// public key. `signatureBase64` is the 64-byte raw r||s that Web Crypto
// produces on the publisher side (sign-manifest.mjs).
bool verifyManifestSignature(const String& payload, const String& signatureBase64) {
  if (signatureBase64.length() == 0) return false;

  uint8_t sigRaw[64];
  if (!decodeBase64Fixed(signatureBase64, sigRaw, sizeof(sigRaw))) {
    Serial.println("[ink] manifest signature: base64 decode failed");
    return false;
  }

  uint8_t digest[32];
  // ESP32 mbedtls ships `mbedtls_sha256` as void (deprecated); the int-returning
  // variant is `mbedtls_sha256_ret`. The OTA streaming path uses the context
  // API, so we only need the one-shot variant here.
  if (mbedtls_sha256_ret((const unsigned char*)payload.c_str(), payload.length(), digest, 0) != 0) {
    return false;
  }

  mbedtls_ecp_group grp;
  mbedtls_ecp_point Q;
  mbedtls_mpi r;
  mbedtls_mpi s;
  mbedtls_ecp_group_init(&grp);
  mbedtls_ecp_point_init(&Q);
  mbedtls_mpi_init(&r);
  mbedtls_mpi_init(&s);

  bool ok = false;
  do {
    if (mbedtls_ecp_group_load(&grp, MBEDTLS_ECP_DP_SECP256R1) != 0) break;
    if (mbedtls_ecp_point_read_binary(&grp, &Q, INK_FIRMWARE_SIGNING_PUBKEY, sizeof(INK_FIRMWARE_SIGNING_PUBKEY)) != 0) break;
    if (mbedtls_mpi_read_binary(&r, sigRaw, 32) != 0) break;
    if (mbedtls_mpi_read_binary(&s, sigRaw + 32, 32) != 0) break;
    ok = (mbedtls_ecdsa_verify(&grp, digest, sizeof(digest), &Q, &r, &s) == 0);
  } while (false);

  mbedtls_mpi_free(&r);
  mbedtls_mpi_free(&s);
  mbedtls_ecp_point_free(&Q);
  mbedtls_ecp_group_free(&grp);
  return ok;
}

FirmwareManifest pendingManifest;
String otaStatusLine = "";  // Set during/after an attempt; surfaced on screen.

bool parseManifest(const String& payload, FirmwareManifest& out) {
  JsonDocument doc;
  if (deserializeJson(doc, payload)) return false;
  JsonVariantConst manifest = doc["manifest"];
  if (manifest.isNull()) return false;
  out.version = String((const char*)(manifest["version"] | ""));
  out.url = String((const char*)(manifest["url"] | ""));
  out.sha256 = String((const char*)(manifest["sha256"] | ""));
  out.sha256.toLowerCase();
  out.size = manifest["size"] | 0;
  out.notes = String((const char*)(manifest["notes"] | ""));
  out.signature = String((const char*)(manifest["signature"] | ""));
  // Shape-valid even before signature verification — callers (showUpdateMenu)
  // need shape validity to decide whether to surface "No update channel" vs
  // "Unsigned manifest".
  out.valid = out.version.length() > 0 && out.url.startsWith("https://") && out.sha256.length() == 64;
  return out.valid;
}

// Signature payload: must match the canonical string the publisher's
// scripts/sign-manifest.mjs signs. Pipe separator over (version, sha256_hex,
// size_in_bytes_decimal).
String manifestSigningPayload(const FirmwareManifest& m) {
  return m.version + "|" + m.sha256 + "|" + String(m.size);
}

void renderUpdate(const String& title, const String& a, const String& b, const String& c, const String& footer) {
  screen = Screen::Update;
  startFrame(title, false);
  drawWrapped(a, 12, 40, 176, 15, 3);
  drawWrapped(b, 12, 92, 176, 15, 3);
  drawWrapped(c, 12, 144, 176, 14, 2);
  drawFooter(footer);
  flushFrame(screenKey("update", title, a, b, footer));
}

// Streams the new firmware image into the ESP32 OTA partition, hashing every
// byte. Returns true only when the post-write SHA-256 matches the manifest
// and Update.end() succeeds. Caller reboots on success.
bool downloadAndApplyOta(const FirmwareManifest& manifest) {
  if (!connectWifi()) {
    otaStatusLine = "Wi-Fi unavailable";
    return false;
  }

  WiFiClientSecure client;
  client.setInsecure();
  HTTPClient http;
  http.setTimeout(60000);
  if (!http.begin(client, manifest.url)) {
    otaStatusLine = "http begin failed";
    return false;
  }
  // If the manifest URL is on the bridge, the token is helpful; harmless on
  // anonymous origins.
  http.addHeader("x-ink-token", CALM_OPERATOR_DEVICE_TOKEN);
  Serial.printf("[ink] OTA GET %s\n", manifest.url.c_str());
  const int status = http.GET();
  if (status != HTTP_CODE_OK) {
    otaStatusLine = String("download HTTP ") + status;
    http.end();
    return false;
  }
  const int contentLength = http.getSize();
  if (contentLength <= 0) {
    otaStatusLine = "unknown size";
    http.end();
    return false;
  }
  if (manifest.size > 0 && manifest.size != contentLength) {
    otaStatusLine = String("size mismatch ") + contentLength;
    http.end();
    return false;
  }
  if (!Update.begin(contentLength)) {
    otaStatusLine = String("Update.begin: ") + Update.errorString();
    http.end();
    return false;
  }

  mbedtls_sha256_context sha;
  mbedtls_sha256_init(&sha);
  mbedtls_sha256_starts(&sha, 0);

  WiFiClient* stream = http.getStreamPtr();
  uint8_t buf[1024];
  int received = 0;
  uint32_t lastProgressLog = millis();
  while (http.connected() && received < contentLength) {
    const size_t avail = stream->available();
    if (avail == 0) {
      delay(1);
      continue;
    }
    const size_t want = avail < sizeof(buf) ? avail : sizeof(buf);
    const int read = stream->readBytes(buf, want);
    if (read <= 0) break;
    mbedtls_sha256_update(&sha, buf, read);
    const size_t wrote = Update.write(buf, read);
    if (wrote != (size_t)read) {
      otaStatusLine = String("flash write ") + Update.errorString();
      Update.abort();
      mbedtls_sha256_free(&sha);
      http.end();
      return false;
    }
    received += read;
    if (millis() - lastProgressLog > 1000) {
      Serial.printf("[ink] OTA %d / %d bytes\n", received, contentLength);
      lastProgressLog = millis();
    }
  }
  http.end();

  uint8_t digest[32];
  mbedtls_sha256_finish(&sha, digest);
  mbedtls_sha256_free(&sha);

  if (received != contentLength) {
    otaStatusLine = String("truncated at ") + received;
    Update.abort();
    return false;
  }

  char hex[65];
  for (int i = 0; i < 32; i++) snprintf(hex + (i * 2), 3, "%02x", digest[i]);
  hex[64] = 0;
  if (!manifest.sha256.equalsIgnoreCase(hex)) {
    Serial.printf("[ink] OTA hash mismatch: got %s, expected %s\n", hex, manifest.sha256.c_str());
    otaStatusLine = "hash mismatch";
    Update.abort();
    return false;
  }

  if (!Update.end(true)) {
    otaStatusLine = String("Update.end: ") + Update.errorString();
    return false;
  }
  Serial.println("[ink] OTA verified; rebooting into new image");
  otaStatusLine = "OK rebooting";
  return true;
}

void showUpdateMenu() {
  beepSoft();
  renderUpdate("UPDATE", "Checking for firmware", "", "", "Working");
  String payload;
  const int status = requestBridge("GET", "/ink/firmware/manifest", "", payload);
  if (status < 200 || status >= 300) {
    renderUpdate("UPDATE", "Manifest fetch failed",
                 lastHttpError.length() > 0 ? lastHttpError : String("Bridge unreachable"),
                 String("On FW ") + FIRMWARE_VERSION,
                 "B menu");
    return;
  }
  FirmwareManifest manifest;
  if (!parseManifest(payload, manifest)) {
    renderUpdate("UPDATE", "No update channel",
                 "Bridge has no manifest configured for this build.",
                 String("On FW ") + FIRMWARE_VERSION,
                 "B menu");
    return;
  }
  // 0.1.9+: mandatory ECDSA signature verification. An unsigned or invalid
  // manifest must not be installable, regardless of which firmware version
  // it advertises.
  if (manifest.signature.length() == 0) {
    renderUpdate("UNSIGNED MANIFEST",
                 "Bridge manifest is missing a signature.",
                 "Publisher must sign with the firmware key before this device will apply.",
                 String("On FW ") + FIRMWARE_VERSION,
                 "B menu");
    return;
  }
  if (!verifyManifestSignature(manifestSigningPayload(manifest), manifest.signature)) {
    renderUpdate("SIGNATURE FAILED",
                 String("Manifest for ") + manifest.version + " does not verify.",
                 "Refused. Wrong key or tampered payload.",
                 String("On FW ") + FIRMWARE_VERSION,
                 "B menu");
    return;
  }
  if (manifest.version == FIRMWARE_VERSION) {
    renderUpdate("UPDATE", "Up to date",
                 String("Bridge offers FW ") + manifest.version,
                 String("Signature OK. On FW ") + FIRMWARE_VERSION,
                 "B menu");
    return;
  }
  pendingManifest = manifest;
  renderUpdate("UPDATE AVAILABLE",
               String("From ") + FIRMWARE_VERSION + " to " + manifest.version,
               manifest.notes.length() > 0 ? manifest.notes : String("Hold B 0.5s to apply."),
               "Signature OK. B exits.",
               "Hold B to apply");
}

void applyPendingOta() {
  if (!pendingManifest.valid) {
    showUpdateMenu();
    return;
  }
  beepSoft();
  renderUpdate("APPLYING",
               String("Downloading ") + pendingManifest.version,
               "Do not unplug or reset.",
               "",
               "working");
  const bool ok = downloadAndApplyOta(pendingManifest);
  if (ok) {
    renderUpdate("APPLIED", "Hash verified.", "Rebooting...",
                 String("To FW ") + pendingManifest.version, "reboot");
    delay(800);
    ESP.restart();
    return;
  }
  pendingManifest.valid = false;
  renderUpdate("UPDATE FAILED",
               otaStatusLine.length() > 0 ? otaStatusLine : String("Unknown error"),
               String("Still on FW ") + FIRMWARE_VERSION,
               "B menu. Re-open Update to retry.",
               "B menu");
}

// ---- end OTA --------------------------------------------------------------

void renderSettingsStatus() {
  String last = "Last " + lastSyncStatus;
  if (lastHttpError.length() > 0) last += " / " + lastHttpError;
  const String age = formatSyncAge();
  if (age.length() > 0) last += " / " + age;
  String middle = String("FW ") + FIRMWARE_VERSION + " / " + soundLabel();
  // Surface a coin-cell warning if the RTC backup is low so the operator can
  // service the device before the clock falls back to bridge-only.
  if (M5.Rtc.getVoltLow()) middle += " / RTC LOW";
  renderStatus(
    "STATUS",
    WiFi.status() == WL_CONNECTED ? WiFi.localIP().toString() : "Wi-Fi offline",
    middle,
    last);
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
    fetchRhythm();
  } else if (label == "Calm Reset") {
    renderCalmReset();
  } else if (label == "Stone Garden") {
    renderStoneGarden();
  } else if (label == "Alerts") {
    alertsEnabled = !alertsEnabled;
    saveSettings();
    if (alertsEnabled && !quietMode) beepSoft();
    renderStatus("ALERTS", alertsEnabled ? "Sound alerts ON" : "Sound alerts OFF", "Saved on device", quietMode ? "Quiet also ON" : "B menu");
  } else if (label == "Quiet Mode") {
    quietMode = !quietMode;
    saveSettings();
    if (!quietMode && alertsEnabled) beepSoft();
    renderStatus("QUIET MODE", quietMode ? "Quiet mode ON" : "Quiet mode OFF", "Saved on device", quietMode ? "No beeps until off" : "Alerts follow setting");
  } else if (label == "Update") {
    pendingManifest.valid = false;
    showUpdateMenu();
  } else {
    renderSettingsStatus();
  }
}

void handleSelect() {
  if (screen == Screen::Brief || screen == Screen::Clock || screen == Screen::Rhythm ||
      screen == Screen::CalmReset || screen == Screen::Status || screen == Screen::Detail) {
    renderMenu();
    return;
  }

  // On the Update screen short-press goes back to the menu; the apply gesture
  // is intentionally a long-press (handled in loop()) so a single tap can
  // never flash unsigned firmware.
  if (screen == Screen::Update) {
    renderMenu();
    return;
  }

  if (screen == Screen::StoneGarden) {
    if (stoneCount >= STONE_SLOTS) {
      // Garden full: B starts a fresh cycle instead of being a dead end.
      stoneCount = 0;
      stoneCursor = 0;
    } else if (stoneCursor == stoneCount) {
      stoneCount++;
    }
    renderStoneGarden();
    return;
  }

  selectMenuAction();
}

void handlePrevious() {
  if (screen == Screen::Menu) {
    menuIndex = (menuIndex + MENU_COUNT - 1) % MENU_COUNT;
    renderMenu();
  } else if (screen == Screen::StoneGarden) {
    stoneCursor = (stoneCursor + STONE_SLOTS - 1) % STONE_SLOTS;
    renderStoneGarden();
  }
}

void handleNext() {
  if (screen == Screen::Menu) {
    menuIndex = (menuIndex + 1) % MENU_COUNT;
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
  flushFrame(screenKey("boot", FIRMWARE_VERSION), true);
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
  // Modem sleep: lets the Wi-Fi radio idle between TCP transactions while
  // staying associated. For a polling e-ink device this is the right cut
  // between battery life and manual-action latency — disconnect-after-fetch
  // would force every button-triggered sync to pay a 5–10 s reassociation.
  WiFi.setSleep(true);
  loadSettings();
  canvas.setColorDepth(1);
  canvas.createSprite(200, 200);
  canvas.setTextSize(1);
  canvas.setTextColor(TFT_BLACK, TFT_WHITE);
  if (!hasRuntimeConfig()) {
    // No token: paint boot frame, then overwrite with explicit setup guidance.
    renderBoot();
    activeBrief.headline = "SETUP NEEDED";
    activeBrief.line1 = "Missing Ink token";
    activeBrief.line2 = "Wi-Fi can be saved";
    activeBrief.action = "Run config:write";
    renderBrief();
    return;
  }

  // If we have a cached brief from a previous boot, paint it immediately so
  // the operator sees their last known state during the 10-15s Wi-Fi +
  // first-fetch window. Footer reads "Cached" until the fresh fetch lands;
  // duplicate-frame skip means an unchanged fresh brief won't refresh e-ink.
  if (loadBriefFromNvs()) {
    briefIsCached = true;
    renderBrief();
  } else {
    renderBoot();
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
  // Long-press B on Brief opens Detail; otherwise tap-or-hold acts as select.
  // wasClicked() and wasHold() are mutually exclusive per press, so a single
  // press lands in exactly one branch.
  const bool bClicked = M5.BtnB.wasClicked() || M5.BtnEXT.wasClicked();
  const bool bHeld = M5.BtnB.wasHold();
  if (bHeld && screen == Screen::Brief) {
    renderDetail();
  } else if (bHeld && screen == Screen::Update && pendingManifest.valid) {
    // Long-press B on Update with a pending manifest applies the OTA. Short
    // presses can never trigger a flash.
    applyPendingOta();
  } else if (bClicked || bHeld) {
    handleSelect();
  }
  if (M5.BtnPWR.wasPressed()) {
    fetchBrief(true);
  }

  // Gate the auto-sync on the last *attempt* (not the last *success*). When
  // the bridge is unreachable the device should still back off for the full
  // interval between attempts instead of pinning CPU + radio on a retry storm.
  if (hasRuntimeConfig() && screen == Screen::Brief &&
      (lastSyncAttemptAt == 0 || millis() - lastSyncAttemptAt > AUTO_SYNC_INTERVAL_MS)) {
    fetchBrief(false);
  }

  delay(30);
}
