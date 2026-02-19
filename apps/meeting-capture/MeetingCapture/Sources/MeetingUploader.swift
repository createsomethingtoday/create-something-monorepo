/**
 * Meeting Uploader
 * Uploads audio files to CREATE SOMETHING infrastructure
 */

import Foundation

struct MeetingMetadata: Codable {
    let recordedAt: Date
    let title: String?
    let property: String?
    let projectId: String?
    let tags: [String]?
    let participants: [String]?

    enum CodingKeys: String, CodingKey {
        case recordedAt
        case title
        case property
        case projectId
        case tags
        case participants
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)

        let formatter = ISO8601DateFormatter()
        try container.encode(formatter.string(from: recordedAt), forKey: .recordedAt)
        try container.encodeIfPresent(title, forKey: .title)
        try container.encodeIfPresent(property, forKey: .property)
        try container.encodeIfPresent(projectId, forKey: .projectId)
        try container.encodeIfPresent(tags, forKey: .tags)
        try container.encodeIfPresent(participants, forKey: .participants)
    }
}

struct UploadResponse: Codable {
    let success: Bool
    let meetingId: String?
    let message: String
}

enum UploadError: LocalizedError {
    case fileNotFound
    case networkError(String)
    case serverError(String)
    case invalidResponse

    var errorDescription: String? {
        switch self {
        case .fileNotFound:
            return "Audio file not found"
        case .networkError(let message):
            return "Network error: \(message)"
        case .serverError(let message):
            return "Server error: \(message)"
        case .invalidResponse:
            return "Invalid response from server"
        }
    }
}

class MeetingUploader {
    // Configure this to your deployed Worker URL
    private var baseURL: String {
        UserDefaults.standard.string(forKey: "apiBaseURL")
            ?? "https://create-something-meetings.createsomething.workers.dev"
    }

    func upload(audioURL: URL, metadata: MeetingMetadata) async throws -> String {
        guard FileManager.default.fileExists(atPath: audioURL.path) else {
            throw UploadError.fileNotFound
        }

        let url = URL(string: "\(baseURL)/upload")!

        // Create multipart form data
        let boundary = UUID().uuidString
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")

        var body = Data()

        // Add metadata as JSON
        let encoder = JSONEncoder()
        if let metadataData = try? encoder.encode(metadata),
           let metadataString = String(data: metadataData, encoding: .utf8) {
            body.append("--\(boundary)\r\n".data(using: .utf8)!)
            body.append("Content-Disposition: form-data; name=\"metadata\"\r\n".data(using: .utf8)!)
            body.append("Content-Type: application/json\r\n\r\n".data(using: .utf8)!)
            body.append("\(metadataString)\r\n".data(using: .utf8)!)
        }

        // Add audio file
        let audioData = try Data(contentsOf: audioURL)
        let filename = audioURL.lastPathComponent
        let mimeType = getMimeType(for: audioURL)

        body.append("--\(boundary)\r\n".data(using: .utf8)!)
        body.append("Content-Disposition: form-data; name=\"audio\"; filename=\"\(filename)\"\r\n".data(using: .utf8)!)
        body.append("Content-Type: \(mimeType)\r\n\r\n".data(using: .utf8)!)
        body.append(audioData)
        body.append("\r\n".data(using: .utf8)!)

        // Close boundary
        body.append("--\(boundary)--\r\n".data(using: .utf8)!)

        request.httpBody = body

        // Send request
        do {
            let (data, response) = try await URLSession.shared.data(for: request)

            guard let httpResponse = response as? HTTPURLResponse else {
                throw UploadError.invalidResponse
            }

            if httpResponse.statusCode >= 400 {
                if let errorResponse = try? JSONDecoder().decode(UploadResponse.self, from: data) {
                    throw UploadError.serverError(errorResponse.message)
                }
                throw UploadError.serverError("HTTP \(httpResponse.statusCode)")
            }

            guard let uploadResponse = try? JSONDecoder().decode(UploadResponse.self, from: data) else {
                throw UploadError.invalidResponse
            }

            if uploadResponse.success, let meetingId = uploadResponse.meetingId {
                return meetingId
            } else {
                throw UploadError.serverError(uploadResponse.message)
            }

        } catch let error as UploadError {
            throw error
        } catch {
            throw UploadError.networkError(error.localizedDescription)
        }
    }

    private func getMimeType(for url: URL) -> String {
        let ext = url.pathExtension.lowercased()
        switch ext {
        case "m4a": return "audio/mp4"
        case "mp3": return "audio/mpeg"
        case "wav": return "audio/wav"
        case "webm": return "audio/webm"
        case "ogg": return "audio/ogg"
        case "flac": return "audio/flac"
        default: return "audio/mpeg"
        }
    }
}
