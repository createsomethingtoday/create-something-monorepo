import Foundation

enum RecordingOrigin {
    case automatic
    case manual
}

struct RecordingContext {
    let meetingId: String
    let appName: String
    let meetingTitle: String?
    let startTime: Date
    let origin: RecordingOrigin

    func toUploadMetadata(
        resources: MeetingCaptureResources = .shared,
        defaults: UserMetadataDefaults = .current()
    ) -> MeetingMetadata {
        MeetingMetadata(
            recordedAt: startTime,
            title: resolvedTitle(),
            property: resources.resolvedProperty(defaults.property),
            projectId: resources.resolvedProjectId(defaults.projectId),
            tags: resources.mergedTags(appName: appName, userTags: defaults.tags),
            participants: resources.normalizedValues(defaults.participants)
        )
    }

    private func resolvedTitle() -> String {
        if let normalized = normalizedSpecificTitle() {
            return normalized
        }

        return "Meeting \(meetingId)"
    }

    private func normalizedSpecificTitle() -> String? {
        guard let meetingTitle else { return nil }
        let trimmed = meetingTitle.trimmingCharacters(in: .whitespacesAndNewlines)

        guard !trimmed.isEmpty else { return nil }

        let normalized = trimmed.lowercased()
        let genericTitles: Set<String> = [
            appName.lowercased(),
            "zoom",
            "zoom meeting",
            "zoom workplace",
            "google meet",
            "meet",
            "microsoft teams",
            "webex",
            "facetime",
            "slack huddle",
            "manual recording",
            "meeting",
            "call",
        ]

        if genericTitles.contains(normalized) {
            return nil
        }

        return trimmed
    }
}
