// Native permission and delivery boundary. No remote notifications, analytics or model tools.
import AppKit
import Foundation
import UserNotifications

public typealias GiGiNotificationCallback = @convention(c) (UnsafePointer<CChar>) -> Void
private let callbackLock = NSLock()
private var routeCallback: GiGiNotificationCallback?
private let notificationDelegate = GiGiNotificationDelegate()

private func validRoute(_ text: String) -> [String: String]? {
    guard text.utf8.count <= 1024, let bytes = text.data(using: .utf8),
          let object = try? JSONSerialization.jsonObject(with: bytes) as? [String: String],
          Set(object.keys) == Set(["workspaceId", "id", "revision"]),
          UUID(uuidString: object["workspaceId"] ?? "") != nil else { return nil }
    for key in ["id", "revision"] {
        guard let value = object[key], !value.isEmpty, value.utf8.count <= 128,
              value.unicodeScalars.allSatisfy({ CharacterSet(charactersIn: "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789:_.-").contains($0) }) else { return nil }
    }
    return object
}

private final class GiGiNotificationDelegate: NSObject, UNUserNotificationCenterDelegate {
    func userNotificationCenter(_ center: UNUserNotificationCenter, willPresent notification: UNNotification, withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
        // Foreground work has an in-app feed. Never duplicate it with a banner.
        completionHandler(NSApp.isActive ? [] : [.banner, .list])
    }
    func userNotificationCenter(_ center: UNUserNotificationCenter, didReceive response: UNNotificationResponse, withCompletionHandler completionHandler: @escaping () -> Void) {
        defer { completionHandler() }
        guard response.actionIdentifier == UNNotificationDefaultActionIdentifier,
              response.notification.request.identifier.hasPrefix("gigi.attention."),
              let text = response.notification.request.content.userInfo["gigiRoute"] as? String,
              validRoute(text) != nil else { return }
        callbackLock.lock(); let callback = routeCallback; callbackLock.unlock()
        if let callback = callback { text.withCString { callback($0) } }
    }
}

@_cdecl("gigi_notifications_initialize")
public func initialize(_ callback: GiGiNotificationCallback) -> Int32 {
    callbackLock.lock(); routeCallback = callback; callbackLock.unlock()
    // Rust initializes this on Tauri's main thread; retain the delegate for the app lifetime.
    UNUserNotificationCenter.current().delegate = notificationDelegate
    return 1
}

private func permissionCode(_ settings: UNNotificationSettings) -> Int32 {
    switch settings.authorizationStatus {
    case .notDetermined: return 0
    case .denied: return 1
    case .authorized, .provisional: return settings.alertSetting == .enabled ? 2 : 4
    @unknown default: return -1
    }
}

@_cdecl("gigi_notifications_status")
public func status() -> Int32 {
    let ready = DispatchSemaphore(value: 0)
    let lock = NSLock()
    var result: Int32 = -1
    UNUserNotificationCenter.current().getNotificationSettings { settings in
        lock.lock(); result = permissionCode(settings); lock.unlock(); ready.signal()
    }
    guard ready.wait(timeout: .now() + 10) == .success else { return -1 }
    lock.lock(); defer { lock.unlock() }; return result
}

@_cdecl("gigi_notifications_request")
public func request() -> Int32 {
    let ready = DispatchSemaphore(value: 0)
    let lock = NSLock()
    var result: Int32 = -1
    UNUserNotificationCenter.current().requestAuthorization(options: [.alert]) { granted, error in
        lock.lock(); result = error == nil ? (granted ? 2 : 1) : -1; lock.unlock(); ready.signal()
    }
    guard ready.wait(timeout: .now() + 60) == .success else { return -1 }
    lock.lock(); let outcome = result; lock.unlock()
    return outcome == 2 ? status() : outcome
}

@_cdecl("gigi_notifications_send")
public func send(_ identifierPointer: UnsafePointer<CChar>, _ titlePointer: UnsafePointer<CChar>, _ bodyPointer: UnsafePointer<CChar>, _ routePointer: UnsafePointer<CChar>) -> Int32 {
    let identifier = String(cString: identifierPointer), title = String(cString: titlePointer), body = String(cString: bodyPointer), route = String(cString: routePointer)
    guard identifier.hasPrefix("gigi.attention."), identifier.utf8.count <= 320,
          title.utf8.count <= 256, body.utf8.count <= 1024, validRoute(route) != nil else { return -1 }
    // Status and policy are checked in Rust before claiming; check permission again at delivery.
    guard status() == 2 else { return -3 }
    let content = UNMutableNotificationContent()
    content.title = title; content.body = body
    content.userInfo = ["gigiRoute": route]
    let notification = UNNotificationRequest(identifier: identifier, content: content, trigger: nil)
    let ready = DispatchSemaphore(value: 0), lock = NSLock()
    var result: Int32 = -1
    UNUserNotificationCenter.current().add(notification) { error in
        lock.lock(); result = error == nil ? 1 : -1; lock.unlock(); ready.signal()
    }
    guard ready.wait(timeout: .now() + 10) == .success else { return -2 }
    lock.lock(); defer { lock.unlock() }; return result
}

@_cdecl("gigi_notifications_remove")
public func remove(_ validIdentifiersPointer: UnsafePointer<CChar>) -> Int32 {
    let text = String(cString: validIdentifiersPointer)
    guard text.utf8.count <= 262144, let bytes = text.data(using: .utf8),
          let object = try? JSONSerialization.jsonObject(with: bytes) as? [String: Any],
          Set(object.keys) == Set(["workspaceId", "identifiers"]),
          let workspaceId = object["workspaceId"] as? String, UUID(uuidString: workspaceId) != nil,
          let identifiers = object["identifiers"] as? [String], identifiers.count <= 2000 else { return -1 }
    let prefix = "gigi.attention.\(workspaceId)."
    guard identifiers.allSatisfy({ $0.hasPrefix(prefix) && $0.utf8.count <= 320 }) else { return -1 }
    let keep = Set(identifiers), center = UNUserNotificationCenter.current()
    center.getDeliveredNotifications { notifications in
        center.removeDeliveredNotifications(withIdentifiers: notifications.map { $0.request.identifier }.filter { $0.hasPrefix(prefix) && !keep.contains($0) })
    }
    center.getPendingNotificationRequests { requests in
        center.removePendingNotificationRequests(withIdentifiers: requests.map { $0.identifier }.filter { $0.hasPrefix(prefix) && !keep.contains($0) })
    }
    return 1
}
