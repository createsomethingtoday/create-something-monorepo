#!/usr/bin/env swift

import EventKit
import Foundation

private struct BusyInterval: Codable {
  let start: String
  let end: String
}

private struct Projection: Codable {
  let source: String
  let rangeStart: String
  let rangeEnd: String
  let observedAt: String
  let expiresAt: String
  let intervals: [BusyInterval]
  let explicitIntent: Bool
}

private struct ProjectionReceipt: Codable {
  let status: String
  let receiptId: String?
  let intervalCount: Int?
  let rangeEnd: String?
  let expiresAt: String?
  let reason: String?
}

private struct Configuration {
  var endpoint = "https://create-something-scheduler.createsomething.workers.dev/api/v1/operator/conflict-projections/webflow-google-calendar"
  var source = "WEBFLOW"
  var calendar = "micah@webflow.com"
  var horizonDays = 42
  var ttlMinutes = 45
  var dryRun = false
}

private enum SyncError: Error, CustomStringConvertible {
  case argument(String)
  case calendarAccess(String)
  case calendarMatch(Int)
  case configuration(String)
  case http(Int)
  case transport(String)

  var description: String {
    switch self {
    case .argument(let message), .calendarAccess(let message), .configuration(let message),
         .transport(let message):
      return message
    case .calendarMatch(let count):
      return "Expected exactly one EventKit calendar matching the configured source and title; found \(count)."
    case .http(let status):
      return "Projection endpoint returned HTTP \(status)."
    }
  }
}

private let iso8601: ISO8601DateFormatter = {
  let formatter = ISO8601DateFormatter()
  formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
  return formatter
}()

private func parseConfiguration() throws -> Configuration {
  var config = Configuration()
  var arguments = Array(CommandLine.arguments.dropFirst())

  func takeValue(for option: String) throws -> String {
    guard !arguments.isEmpty else { throw SyncError.argument("Missing value for \(option).") }
    return arguments.removeFirst()
  }

  while !arguments.isEmpty {
    let option = arguments.removeFirst()
    switch option {
    case "--":
      continue
    case "--endpoint":
      config.endpoint = try takeValue(for: option)
    case "--source":
      config.source = try takeValue(for: option)
    case "--calendar":
      config.calendar = try takeValue(for: option)
    case "--horizon-days":
      guard let value = Int(try takeValue(for: option)), value >= 28, value <= 60 else {
        throw SyncError.argument("--horizon-days must be between 28 and 60.")
      }
      config.horizonDays = value
    case "--ttl-minutes":
      guard let value = Int(try takeValue(for: option)), value >= 15, value <= 90 else {
        throw SyncError.argument("--ttl-minutes must be between 15 and 90.")
      }
      config.ttlMinutes = value
    case "--dry-run":
      config.dryRun = true
    default:
      throw SyncError.argument("Unknown option: \(option).")
    }
  }

  return config
}

private func requestCalendarAccess(_ store: EKEventStore) throws {
  let semaphore = DispatchSemaphore(value: 0)
  var granted = false
  var accessError: Error?
  store.requestFullAccessToEvents { result, error in
    granted = result
    accessError = error
    semaphore.signal()
  }
  semaphore.wait()

  if let accessError {
    throw SyncError.calendarAccess("Calendar access failed: \(accessError.localizedDescription)")
  }
  guard granted else {
    throw SyncError.calendarAccess("Calendar access was not granted to the Swift/EventKit process.")
  }
}

private func mergedBusyIntervals(
  store: EKEventStore,
  calendar: EKCalendar,
  rangeStart: Date,
  rangeEnd: Date
) -> [(start: Date, end: Date)] {
  let predicate = store.predicateForEvents(
    withStart: rangeStart,
    end: rangeEnd,
    calendars: [calendar]
  )
  let projected = store.events(matching: predicate)
    .filter { $0.status != .canceled && $0.availability != .free }
    .compactMap { event -> (start: Date, end: Date)? in
      let start = max(event.startDate, rangeStart)
      let end = min(event.endDate, rangeEnd)
      return start < end ? (start, end) : nil
    }
    .sorted { left, right in
      left.start == right.start ? left.end < right.end : left.start < right.start
    }

  return projected.reduce(into: []) { merged, interval in
    guard let last = merged.last else {
      merged.append(interval)
      return
    }
    if interval.start <= last.end {
      merged[merged.count - 1] = (last.start, max(last.end, interval.end))
    } else {
      merged.append(interval)
    }
  }
}

private func send(_ projection: Projection, endpoint: String, token: String) throws -> ProjectionReceipt {
  guard let url = URL(string: endpoint), url.scheme == "https" else {
    throw SyncError.configuration("Projection endpoint must be a valid HTTPS URL.")
  }

  var request = URLRequest(url: url)
  request.httpMethod = "PUT"
  request.setValue("application/json", forHTTPHeaderField: "content-type")
  request.setValue("Bearer \(token)", forHTTPHeaderField: "authorization")
  request.httpBody = try JSONEncoder().encode(projection)

  let semaphore = DispatchSemaphore(value: 0)
  var responseData: Data?
  var responseStatus: Int?
  var responseError: Error?
  URLSession.shared.dataTask(with: request) { data, response, error in
    responseData = data
    responseStatus = (response as? HTTPURLResponse)?.statusCode
    responseError = error
    semaphore.signal()
  }.resume()
  semaphore.wait()

  if let responseError {
    throw SyncError.transport("Projection request failed: \(responseError.localizedDescription)")
  }
  guard let responseStatus else {
    throw SyncError.transport("Projection endpoint returned no HTTP response.")
  }
  guard (200..<300).contains(responseStatus), let responseData else {
    throw SyncError.http(responseStatus)
  }
  return try JSONDecoder().decode(ProjectionReceipt.self, from: responseData)
}

do {
  let config = try parseConfiguration()
  let store = EKEventStore()
  try requestCalendarAccess(store)

  let matchingCalendars = store.calendars(for: .event).filter {
    $0.source.title == config.source && $0.title == config.calendar
  }
  guard matchingCalendars.count == 1, let calendar = matchingCalendars.first else {
    throw SyncError.calendarMatch(matchingCalendars.count)
  }

  let observedAt = Date()
  let rangeStart = observedAt.addingTimeInterval(-24 * 60 * 60)
  let rangeEnd = observedAt.addingTimeInterval(TimeInterval(config.horizonDays * 24 * 60 * 60))
  let expiresAt = observedAt.addingTimeInterval(TimeInterval(config.ttlMinutes * 60))
  let intervals = mergedBusyIntervals(
    store: store,
    calendar: calendar,
    rangeStart: rangeStart,
    rangeEnd: rangeEnd
  ).map { BusyInterval(start: iso8601.string(from: $0.start), end: iso8601.string(from: $0.end)) }

  let projection = Projection(
    source: "webflow-google-calendar",
    rangeStart: iso8601.string(from: rangeStart),
    rangeEnd: iso8601.string(from: rangeEnd),
    observedAt: iso8601.string(from: observedAt),
    expiresAt: iso8601.string(from: expiresAt),
    intervals: intervals,
    explicitIntent: true
  )

  if config.dryRun {
    print("projection=dry-run source=\(config.source) calendar=\(config.calendar) intervals=\(intervals.count) rangeEnd=\(projection.rangeEnd) expiresAt=\(projection.expiresAt)")
  } else {
    let environment = ProcessInfo.processInfo.environment
    guard let token = environment["OPERATOR_API_TOKEN"], !token.isEmpty else {
      throw SyncError.configuration("OPERATOR_API_TOKEN is required unless --dry-run is used.")
    }
    let receipt = try send(projection, endpoint: config.endpoint, token: token)
    guard receipt.status == "accepted" else {
      throw SyncError.transport("Projection was not accepted: \(receipt.reason ?? "unknown reason").")
    }
    print("projection=accepted receipt=\(receipt.receiptId ?? "missing") intervals=\(receipt.intervalCount ?? intervals.count) rangeEnd=\(receipt.rangeEnd ?? projection.rangeEnd) expiresAt=\(receipt.expiresAt ?? projection.expiresAt)")
  }
} catch {
  fputs("projection=failed error=\(error)\n", stderr)
  exit(1)
}
