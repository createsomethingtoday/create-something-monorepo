#pragma once

namespace calm_operator {

enum class BridgeFailure {
  WiFiUnavailable,
  TlsSetup,
  Http,
  InvalidJson
};

inline const char* heartbeatDiagnostic(bool accepted) {
  return accepted ? "[operator] heartbeat accepted" : "[operator] heartbeat rejected";
}

inline const char* bridgeFailureDiagnostic(BridgeFailure failure) {
  switch (failure) {
    case BridgeFailure::WiFiUnavailable:
      return "[operator] bridge unavailable: wifi";
    case BridgeFailure::TlsSetup:
      return "[operator] bridge unavailable: tls";
    case BridgeFailure::Http:
      return "[operator] bridge unavailable: http";
    case BridgeFailure::InvalidJson:
      return "[operator] bridge unavailable: invalid-json";
  }
  return "[operator] bridge unavailable";
}

}  // namespace calm_operator
