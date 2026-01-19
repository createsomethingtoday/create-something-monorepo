//! Similarity computation between files
//!
//! Uses token-based, line-based, and structural similarity metrics.

const std = @import("std");
const fs = std.fs;
const mem = std.mem;
const Sha256 = std.crypto.hash.sha2.Sha256;
const lib = @import("lib.zig");
const structural = @import("structural.zig");

pub const ComputeError = error{
    FileNotFound,
    ReadError,
    OutOfMemory,
};

/// Compute similarity between two files
pub fn compute(allocator: mem.Allocator, path_a: []const u8, path_b: []const u8) !lib.SimilarityEvidence {
    // Read file contents
    const content_a = readFile(allocator, path_a) catch return ComputeError.FileNotFound;
    defer allocator.free(content_a);

    const content_b = readFile(allocator, path_b) catch return ComputeError.FileNotFound;
    defer allocator.free(content_b);

    // Compute hashes
    var hash_a: [64]u8 = undefined;
    var hash_b: [64]u8 = undefined;
    hashContent(content_a, &hash_a);
    hashContent(content_b, &hash_b);

    // Identical files
    if (mem.eql(u8, &hash_a, &hash_b)) {
        var id: [36]u8 = undefined;
        lib.generateUuid(&id);
        return lib.SimilarityEvidence{
            .id = id,
            .file_a = path_a,
            .file_b = path_b,
            .similarity = 1.0,
            .token_overlap = 1.0,
            .line_similarity = 1.0,
            .structural_similarity = 1.0,
            .hash_a = hash_a,
            .hash_b = hash_b,
            .computed_at = lib.timestamp(),
        };
    }

    // Compute text-based similarities
    const token_sim = computeTokenSimilarity(allocator, content_a, content_b) catch 0.0;
    const line_sim = computeLineSimilarity(allocator, content_a, content_b) catch 0.0;

    // Compute structural similarity
    const fp_a = structural.extractFingerprint(content_a);
    const fp_b = structural.extractFingerprint(content_b);
    const struct_result = structural.compareFingerprints(fp_a, fp_b);
    const struct_sim = struct_result.similarity;

    // Combined similarity: Structural 40%, Line 35%, Token 25%
    const overall = (struct_sim * 0.40) + (line_sim * 0.35) + (token_sim * 0.25);

    var id: [36]u8 = undefined;
    lib.generateUuid(&id);

    return lib.SimilarityEvidence{
        .id = id,
        .file_a = path_a,
        .file_b = path_b,
        .similarity = overall,
        .token_overlap = token_sim,
        .line_similarity = line_sim,
        .structural_similarity = struct_sim,
        .hash_a = hash_a,
        .hash_b = hash_b,
        .computed_at = lib.timestamp(),
    };
}

fn readFile(allocator: mem.Allocator, path: []const u8) ![]u8 {
    const file = try fs.cwd().openFile(path, .{});
    defer file.close();

    const stat = try file.stat();
    const size = stat.size;

    if (size > 10 * 1024 * 1024) { // 10MB limit
        return ComputeError.ReadError;
    }

    return try file.readToEndAlloc(allocator, @intCast(size + 1));
}

fn hashContent(content: []const u8, out: *[64]u8) void {
    var hasher = Sha256.init(.{});
    hasher.update(content);
    const digest = hasher.finalResult();

    const hex = "0123456789abcdef";
    for (digest, 0..) |byte, i| {
        out[i * 2] = hex[byte >> 4];
        out[i * 2 + 1] = hex[byte & 0x0f];
    }
}

/// Token-based similarity using Jaccard index
fn computeTokenSimilarity(allocator: mem.Allocator, a: []const u8, b: []const u8) !f64 {
    var tokens_a = std.StringHashMap(void).init(allocator);
    defer tokens_a.deinit();

    var tokens_b = std.StringHashMap(void).init(allocator);
    defer tokens_b.deinit();

    // Tokenize both contents
    try tokenize(a, &tokens_a);
    try tokenize(b, &tokens_b);

    if (tokens_a.count() == 0 and tokens_b.count() == 0) {
        return 1.0;
    }

    // Count intersection
    var intersection: usize = 0;
    var iter = tokens_a.keyIterator();
    while (iter.next()) |key| {
        if (tokens_b.contains(key.*)) {
            intersection += 1;
        }
    }

    // Jaccard: intersection / union
    const union_size = tokens_a.count() + tokens_b.count() - intersection;
    if (union_size == 0) return 1.0;

    return @as(f64, @floatFromInt(intersection)) / @as(f64, @floatFromInt(union_size));
}

fn tokenize(content: []const u8, tokens: *std.StringHashMap(void)) !void {
    var start: usize = 0;
    var in_token = false;

    for (content, 0..) |c, i| {
        const is_word = std.ascii.isAlphanumeric(c) or c == '_';

        if (is_word and !in_token) {
            start = i;
            in_token = true;
        } else if (!is_word and in_token) {
            const token = content[start..i];
            if (token.len >= 2) { // Skip single chars
                try tokens.put(token, {});
            }
            in_token = false;
        }
    }

    // Handle last token
    if (in_token) {
        const token = content[start..];
        if (token.len >= 2) {
            try tokens.put(token, {});
        }
    }
}

/// Line-based similarity using LCS ratio
fn computeLineSimilarity(allocator: mem.Allocator, a: []const u8, b: []const u8) !f64 {
    var lines_a = std.ArrayList([]const u8).init(allocator);
    defer lines_a.deinit();

    var lines_b = std.ArrayList([]const u8).init(allocator);
    defer lines_b.deinit();

    // Split into lines
    var iter_a = mem.splitScalar(u8, a, '\n');
    while (iter_a.next()) |line| {
        const trimmed = mem.trim(u8, line, " \t\r");
        if (trimmed.len > 0) {
            try lines_a.append(trimmed);
        }
    }

    var iter_b = mem.splitScalar(u8, b, '\n');
    while (iter_b.next()) |line| {
        const trimmed = mem.trim(u8, line, " \t\r");
        if (trimmed.len > 0) {
            try lines_b.append(trimmed);
        }
    }

    if (lines_a.items.len == 0 and lines_b.items.len == 0) {
        return 1.0;
    }

    // Count matching lines
    var matches: usize = 0;
    for (lines_a.items) |line_a| {
        for (lines_b.items) |line_b| {
            if (mem.eql(u8, line_a, line_b)) {
                matches += 1;
                break;
            }
        }
    }

    const total = @max(lines_a.items.len, lines_b.items.len);
    if (total == 0) return 1.0;

    return @as(f64, @floatFromInt(matches)) / @as(f64, @floatFromInt(total));
}

// ============================================================================
// Tests
// ============================================================================

test "tokenize basic" {
    const allocator = std.testing.allocator;
    var tokens = std.StringHashMap(void).init(allocator);
    defer tokens.deinit();

    try tokenize("function validateEmail(email) { return true; }", &tokens);

    try std.testing.expect(tokens.contains("function"));
    try std.testing.expect(tokens.contains("validateEmail"));
    try std.testing.expect(tokens.contains("email"));
    try std.testing.expect(tokens.contains("return"));
    try std.testing.expect(tokens.contains("true"));
}

test "token similarity identical" {
    const allocator = std.testing.allocator;
    const sim = try computeTokenSimilarity(allocator, "hello world", "hello world");
    try std.testing.expectApproxEqAbs(@as(f64, 1.0), sim, 0.01);
}

test "token similarity different" {
    const allocator = std.testing.allocator;
    const sim = try computeTokenSimilarity(allocator, "hello world", "goodbye universe");
    try std.testing.expect(sim < 0.5);
}

test "line similarity identical" {
    const allocator = std.testing.allocator;
    const content = "line one\nline two\nline three";
    const sim = try computeLineSimilarity(allocator, content, content);
    try std.testing.expectApproxEqAbs(@as(f64, 1.0), sim, 0.01);
}
