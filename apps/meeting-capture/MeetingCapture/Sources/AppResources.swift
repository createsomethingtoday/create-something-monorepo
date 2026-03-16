import Foundation
import AppKit

struct BrandingManifest: Decodable {
    let appName: String
    let tagline: String
    let markImageName: String
    let markImageExtension: String
    let vectorMarkName: String
    let vectorLockupName: String
    let accentHex: String
    let foregroundHex: String
    let backgroundHex: String

    static let fallback = BrandingManifest(
        appName: "Meeting Capture",
        tagline: "Tools recede, understanding remains.",
        markImageName: "meeting-capture-mark",
        markImageExtension: "png",
        vectorMarkName: "meeting-capture-mark",
        vectorLockupName: "meeting-capture-lockup",
        accentHex: "#C95C3B",
        foregroundHex: "#1B1816",
        backgroundHex: "#F7F1E7"
    )
}

struct MetadataPresetCatalog: Decodable {
    struct PropertyOption: Decodable, Identifiable {
        let id: String
        let label: String
    }

    let properties: [PropertyOption]
    let suggestedTags: [String]
    let appTagMap: [String: [String]]
    let projectHints: [String]

    static let fallback = MetadataPresetCatalog(
        properties: [
            .init(id: "agency", label: "Agency"),
            .init(id: "io", label: "IO"),
            .init(id: "space", label: "Space"),
            .init(id: "ltd", label: "LTD"),
        ],
        suggestedTags: ["meeting-capture", "auto-transcribed"],
        appTagMap: [:],
        projectHints: []
    )
}

struct UserMetadataDefaults: Equatable {
    let property: String?
    let projectId: String?
    let tags: [String]
    let participants: [String]

    static func current() -> UserMetadataDefaults {
        let defaults = UserDefaults.standard
        return UserMetadataDefaults(
            property: sanitizeOptional(defaults.string(forKey: "defaultProperty")),
            projectId: sanitizeOptional(defaults.string(forKey: "defaultProjectId")),
            tags: parseCSV(defaults.string(forKey: "defaultTags")),
            participants: parseCSV(defaults.string(forKey: "defaultParticipants"))
        )
    }
}

final class MeetingCaptureResources {
    static let shared = MeetingCaptureResources()

    let branding: BrandingManifest
    let metadataPresets: MetadataPresetCatalog
    let permissionsGuide: String
    let permissionsSummary: String
    let brandMarkImage: NSImage?

    init(locator: ResourceLocator = .default) {
        self.branding = Self.loadJSON(
            BrandingManifest.self,
            named: "Branding",
            subdirectory: "Branding",
            fallback: .fallback,
            locator: locator
        )
        self.metadataPresets = Self.loadJSON(
            MetadataPresetCatalog.self,
            named: "MetadataPresets",
            fallback: .fallback,
            locator: locator
        )
        self.permissionsGuide = Self.loadTextResource(
            named: "PermissionsGuide",
            ext: "md",
            subdirectory: "Guides",
            fallback: "Grant Screen Recording and Automation before using automatic capture.",
            locator: locator
        )
        self.permissionsSummary = Self.makeSummary(from: permissionsGuide)
        self.brandMarkImage = Self.loadImage(
            named: branding.markImageName,
            ext: branding.markImageExtension,
            subdirectory: "Branding",
            locator: locator
        )
    }

    func mergedTags(appName: String, userTags: [String]) -> [String]? {
        let resourceTags = metadataPresets.suggestedTags + (metadataPresets.appTagMap[appName] ?? [])
        let merged = dedupePreservingOrder(resourceTags + userTags)
        return merged.isEmpty ? nil : merged
    }

    func resolvedProperty(_ property: String?) -> String? {
        guard let property else { return nil }
        return metadataPresets.properties.contains(where: { $0.id == property }) ? property : nil
    }

    func resolvedProjectId(_ projectId: String?) -> String? {
        sanitizeOptional(projectId)
    }

    func normalizedValues(_ values: [String]) -> [String]? {
        let normalized = dedupePreservingOrder(
            values
                .map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
                .filter { !$0.isEmpty }
        )
        return normalized.isEmpty ? nil : normalized
    }

    private static func loadJSON<T: Decodable>(
        _ type: T.Type,
        named: String,
        ext: String = "json",
        subdirectory: String? = nil,
        fallback: T,
        locator: ResourceLocator
    ) -> T {
        guard let url = locator.url(forResource: named, ext: ext, subdirectory: subdirectory),
              let data = try? Data(contentsOf: url),
              let decoded = try? JSONDecoder().decode(T.self, from: data) else {
            return fallback
        }

        return decoded
    }

    private static func loadTextResource(
        named: String,
        ext: String,
        subdirectory: String? = nil,
        fallback: String,
        locator: ResourceLocator
    ) -> String {
        guard let url = locator.url(forResource: named, ext: ext, subdirectory: subdirectory),
              let text = try? String(contentsOf: url, encoding: .utf8) else {
            return fallback
        }

        return text
    }

    private static func loadImage(
        named: String,
        ext: String,
        subdirectory: String? = nil,
        locator: ResourceLocator
    ) -> NSImage? {
        guard let url = locator.url(forResource: named, ext: ext, subdirectory: subdirectory),
              let image = NSImage(contentsOf: url) else {
            return nil
        }

        return image
    }

    private static func makeSummary(from guide: String) -> String {
        let paragraphs = guide
            .components(separatedBy: "\n\n")
            .map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
            .filter { !$0.isEmpty }

        for paragraph in paragraphs {
            let cleaned = paragraph
                .components(separatedBy: .newlines)
                .map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
                .filter { !$0.isEmpty && !$0.hasPrefix("#") }
                .joined(separator: " ")

            if !cleaned.isEmpty {
                return cleaned
            }
        }

        return guide.trimmingCharacters(in: .whitespacesAndNewlines)
    }
}

struct ResourceLocator {
    static let `default` = ResourceLocator()

    private let resourceBundle: Bundle?
    private let sourceResourceRoot: URL

    init() {
        let sourceRoot = URL(fileURLWithPath: #filePath)
            .deletingLastPathComponent()
            .deletingLastPathComponent()
            .appendingPathComponent("Resources", isDirectory: true)

        self.sourceResourceRoot = sourceRoot
        self.resourceBundle = Self.findBundle(fallbackRoot: sourceRoot)
    }

    func url(forResource named: String, ext: String, subdirectory: String? = nil) -> URL? {
        if let resourceBundle,
           let url = resourceBundle.url(forResource: named, withExtension: ext, subdirectory: subdirectory) {
            return url
        }

        let baseURL = if let subdirectory {
            sourceResourceRoot.appendingPathComponent(subdirectory, isDirectory: true)
        } else {
            sourceResourceRoot
        }

        let fileURL = baseURL.appendingPathComponent("\(named).\(ext)")
        return FileManager.default.fileExists(atPath: fileURL.path) ? fileURL : nil
    }

    private static func findBundle(fallbackRoot: URL) -> Bundle? {
        let candidates = [Bundle.main] + Bundle.allBundles + Bundle.allFrameworks

        for bundle in candidates {
            if bundle.url(forResource: "MetadataPresets", withExtension: "json") != nil {
                return bundle
            }

            if bundle.url(forResource: "Branding", withExtension: "json", subdirectory: "Branding") != nil {
                return bundle
            }
        }

        let debugBundle = fallbackRoot
            .deletingLastPathComponent()
            .appendingPathComponent("MeetingCapture_MeetingCapture.bundle", isDirectory: true)
        if let bundle = Bundle(url: debugBundle) {
            return bundle
        }

        return nil
    }
}

private func sanitizeOptional(_ value: String?) -> String? {
    guard let value else { return nil }
    let trimmed = value.trimmingCharacters(in: .whitespacesAndNewlines)
    return trimmed.isEmpty ? nil : trimmed
}

private func parseCSV(_ value: String?) -> [String] {
    guard let value else { return [] }

    return dedupePreservingOrder(
        value
            .split(separator: ",")
            .map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
            .filter { !$0.isEmpty }
    )
}

private func dedupePreservingOrder(_ values: [String]) -> [String] {
    var seen: Set<String> = []
    var result: [String] = []

    for value in values {
        let normalized = value.lowercased()
        if seen.insert(normalized).inserted {
            result.append(value)
        }
    }

    return result
}
