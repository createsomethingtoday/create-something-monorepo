//! Verified Triad - Computation-constrained synthesis for AI code analysis
//!
//! Claims require computed evidence. No evidence = blocked claim.

const std = @import("std");
const fs = std.fs;
const mem = std.mem;
const crypto = std.crypto.hash.sha2.Sha256;

// Re-exports
pub const similarity = @import("similarity.zig");
pub const registry = @import("registry.zig");
pub const exceptions = @import("exceptions.zig");
pub const structural = @import("structural.zig");

/// Evidence types that can ground claims
pub const EvidenceType = enum {
    similarity,
    usage,
    connectivity,
};

/// Similarity evidence between two files
pub const SimilarityEvidence = struct {
    id: [36]u8, // UUID string
    file_a: []const u8,
    file_b: []const u8,
    similarity: f64,
    token_overlap: f64,
    line_similarity: f64,
    structural_similarity: f64,
    hash_a: [64]u8,
    hash_b: [64]u8,
    computed_at: i64,

    pub fn meetsThreshold(self: SimilarityEvidence, threshold: f64) bool {
        return self.similarity >= threshold;
    }
};

/// Usage evidence for a symbol
pub const UsageEvidence = struct {
    id: [36]u8,
    symbol: []const u8,
    search_path: []const u8,
    usage_count: usize,
    locations: []const Location,
    computed_at: i64,

    pub const Location = struct {
        file: []const u8,
        line: usize,
        context: []const u8,
    };

    pub fn meetsMinimum(self: UsageEvidence, min: usize) bool {
        return self.usage_count >= min;
    }
};

/// Connectivity evidence for a module
pub const ConnectivityEvidence = struct {
    id: [36]u8,
    module_path: []const u8,
    incoming_count: usize,
    outgoing_count: usize,
    is_connected: bool,
    computed_at: i64,

    pub fn meetsMinimum(self: ConnectivityEvidence, min: usize) bool {
        return (self.incoming_count + self.outgoing_count) >= min;
    }
};

/// Claim types
pub const ClaimType = enum {
    dry_violation,
    no_existence,
    disconnected,
};

/// Result of attempting a claim
pub const ClaimResult = union(enum) {
    allowed: AllowedClaim,
    blocked: BlockedClaim,

    pub const AllowedClaim = struct {
        claim_id: [36]u8,
        evidence_id: [36]u8,
        claim_type: ClaimType,
        reason: []const u8,
    };

    pub const BlockedClaim = struct {
        reason: []const u8,
    };
};

/// Thresholds for the Subtractive Triad
pub const TriadThresholds = struct {
    dry_similarity: f64 = 0.80,
    min_usages: usize = 1,
    min_connections: usize = 1,
};

/// Main Verified Triad instance
pub const VerifiedTriad = struct {
    allocator: mem.Allocator,
    reg: registry.Registry,
    thresholds: TriadThresholds,

    const Self = @This();

    pub fn init(allocator: mem.Allocator, db_path: []const u8) !Self {
        return Self{
            .allocator = allocator,
            .reg = try registry.Registry.init(allocator, db_path),
            .thresholds = .{},
        };
    }

    pub fn deinit(self: *Self) void {
        self.reg.deinit();
    }

    /// Compute similarity between two files
    pub fn computeSimilarity(self: *Self, file_a: []const u8, file_b: []const u8) !SimilarityEvidence {
        const evidence = try similarity.compute(self.allocator, file_a, file_b);
        try self.reg.store(.similarity, &evidence.id, @ptrCast(&evidence));
        return evidence;
    }

    /// Attempt a DRY violation claim
    pub fn claimDry(self: *Self, file_a: []const u8, file_b: []const u8, reason: []const u8) !ClaimResult {
        // Check for evidence
        const evidence = self.reg.getSimilarity(file_a, file_b) orelse {
            return ClaimResult{ .blocked = .{
                .reason = "No evidence found. Run: vt compute similarity",
            } };
        };

        // Check threshold
        if (!evidence.meetsThreshold(self.thresholds.dry_similarity)) {
            return ClaimResult{ .blocked = .{
                .reason = "Evidence below threshold",
            } };
        }

        // Claim allowed
        var claim_id: [36]u8 = undefined;
        generateUuid(&claim_id);

        return ClaimResult{ .allowed = .{
            .claim_id = claim_id,
            .evidence_id = evidence.id,
            .claim_type = .dry_violation,
            .reason = reason,
        } };
    }

    /// Attempt a no-existence claim
    pub fn claimExistence(self: *Self, symbol: []const u8, reason: []const u8) !ClaimResult {
        const evidence = self.reg.getUsage(symbol) orelse {
            return ClaimResult{ .blocked = .{
                .reason = "No evidence found. Run: vt compute usages",
            } };
        };

        // For no-existence claims, we want ZERO usages
        if (evidence.meetsMinimum(self.thresholds.min_usages)) {
            return ClaimResult{ .blocked = .{
                .reason = "Evidence contradicts claim: symbol has usages",
            } };
        }

        var claim_id: [36]u8 = undefined;
        generateUuid(&claim_id);

        return ClaimResult{ .allowed = .{
            .claim_id = claim_id,
            .evidence_id = evidence.id,
            .claim_type = .no_existence,
            .reason = reason,
        } };
    }
};

/// Generate a UUID v4 string
pub fn generateUuid(buf: *[36]u8) void {
    var random_bytes: [16]u8 = undefined;
    std.crypto.random.bytes(&random_bytes);

    // Set version (4) and variant bits
    random_bytes[6] = (random_bytes[6] & 0x0f) | 0x40;
    random_bytes[8] = (random_bytes[8] & 0x3f) | 0x80;

    const hex = "0123456789abcdef";
    var i: usize = 0;
    var j: usize = 0;

    while (i < 16) : (i += 1) {
        if (i == 4 or i == 6 or i == 8 or i == 10) {
            buf[j] = '-';
            j += 1;
        }
        buf[j] = hex[random_bytes[i] >> 4];
        buf[j + 1] = hex[random_bytes[i] & 0x0f];
        j += 2;
    }
}

/// Get current timestamp
pub fn timestamp() i64 {
    return std.time.timestamp();
}

// ============================================================================
// Tests
// ============================================================================

test "uuid generation" {
    var uuid: [36]u8 = undefined;
    generateUuid(&uuid);

    // Check format: 8-4-4-4-12
    try std.testing.expectEqual(@as(u8, '-'), uuid[8]);
    try std.testing.expectEqual(@as(u8, '-'), uuid[13]);
    try std.testing.expectEqual(@as(u8, '-'), uuid[18]);
    try std.testing.expectEqual(@as(u8, '-'), uuid[23]);

    // Check version byte (should be '4')
    try std.testing.expectEqual(@as(u8, '4'), uuid[14]);
}

test "similarity evidence threshold check" {
    var evidence = SimilarityEvidence{
        .id = undefined,
        .file_a = "a.ts",
        .file_b = "b.ts",
        .similarity = 0.85,
        .token_overlap = 0.85,
        .line_similarity = 0.85,
        .structural_similarity = 0.85,
        .hash_a = undefined,
        .hash_b = undefined,
        .computed_at = 0,
    };

    try std.testing.expect(evidence.meetsThreshold(0.80));
    try std.testing.expect(!evidence.meetsThreshold(0.90));
}

test "usage evidence minimum check" {
    var evidence = UsageEvidence{
        .id = undefined,
        .symbol = "test",
        .search_path = ".",
        .usage_count = 5,
        .locations = &[_]UsageEvidence.Location{},
        .computed_at = 0,
    };

    try std.testing.expect(evidence.meetsMinimum(1));
    try std.testing.expect(evidence.meetsMinimum(5));
    try std.testing.expect(!evidence.meetsMinimum(6));
}
