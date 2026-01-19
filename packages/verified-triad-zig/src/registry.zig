//! Evidence Registry - In-memory storage with JSON persistence
//!
//! Stores computed evidence that can be referenced by claims.

const std = @import("std");
const fs = std.fs;
const json = std.json;
const mem = std.mem;
const lib = @import("lib.zig");

pub const RegistryError = error{
    NotFound,
    StorageError,
    OutOfMemory,
};

/// Simple file-based registry (JSON)
pub const Registry = struct {
    allocator: mem.Allocator,
    db_path: []const u8,
    similarity_cache: std.StringHashMap(lib.SimilarityEvidence),
    usage_cache: std.StringHashMap(lib.UsageEvidence),

    const Self = @This();

    pub fn init(allocator: mem.Allocator, db_path: []const u8) !Self {
        // Ensure directory exists
        const dir_path = std.fs.path.dirname(db_path) orelse ".";
        fs.cwd().makePath(dir_path) catch {};

        var self = Self{
            .allocator = allocator,
            .db_path = db_path,
            .similarity_cache = std.StringHashMap(lib.SimilarityEvidence).init(allocator),
            .usage_cache = std.StringHashMap(lib.UsageEvidence).init(allocator),
        };

        // Load existing data if present
        self.load() catch {};

        return self;
    }

    pub fn deinit(self: *Self) void {
        self.similarity_cache.deinit();
        self.usage_cache.deinit();
    }

    /// Store evidence
    pub fn store(self: *Self, evidence_type: lib.EvidenceType, id: *const [36]u8, data: *const anyopaque) !void {
        switch (evidence_type) {
            .similarity => {
                const evidence: *const lib.SimilarityEvidence = @ptrCast(@alignCast(data));
                const key = try self.makeSimilarityKey(evidence.file_a, evidence.file_b);
                try self.similarity_cache.put(key, evidence.*);
            },
            .usage => {
                const evidence: *const lib.UsageEvidence = @ptrCast(@alignCast(data));
                const key = try self.allocator.dupe(u8, evidence.symbol);
                try self.usage_cache.put(key, evidence.*);
            },
            .connectivity => {
                // TODO: implement connectivity storage
                _ = id;
            },
        }
        try self.save();
    }

    /// Get similarity evidence for a file pair
    pub fn getSimilarity(self: *Self, file_a: []const u8, file_b: []const u8) ?lib.SimilarityEvidence {
        // Try both orderings since we store with canonical key
        const first = if (mem.lessThan(u8, file_a, file_b)) file_a else file_b;
        const second = if (mem.lessThan(u8, file_a, file_b)) file_b else file_a;

        var iter = self.similarity_cache.iterator();
        while (iter.next()) |entry| {
            if (mem.eql(u8, entry.value_ptr.file_a, first) and
                mem.eql(u8, entry.value_ptr.file_b, second))
            {
                return entry.value_ptr.*;
            }
            if (mem.eql(u8, entry.value_ptr.file_a, second) and
                mem.eql(u8, entry.value_ptr.file_b, first))
            {
                return entry.value_ptr.*;
            }
        }
        return null;
    }

    /// Get usage evidence for a symbol
    pub fn getUsage(self: *Self, symbol: []const u8) ?lib.UsageEvidence {
        return self.usage_cache.get(symbol);
    }

    /// Create a canonical key for file pairs (sorted)
    fn makeSimilarityKey(self: *Self, a: []const u8, b: []const u8) ![]u8 {
        const first = if (mem.lessThan(u8, a, b)) a else b;
        const second = if (mem.lessThan(u8, a, b)) b else a;
        return try std.fmt.allocPrint(self.allocator, "{s}:{s}", .{ first, second });
    }

    /// Save registry to disk
    fn save(self: *Self) !void {
        const file = try fs.cwd().createFile(self.db_path, .{});
        defer file.close();

        var writer = file.writer();

        // Write header
        try writer.writeAll("# Verified Triad Registry\n");
        try writer.writeAll("# Format: type|key|data\n\n");

        // Write similarity entries
        var sim_iter = self.similarity_cache.iterator();
        while (sim_iter.next()) |entry| {
            try writer.print("similarity|{s}|{d:.4}|{s}|{s}\n", .{
                entry.key_ptr.*,
                entry.value_ptr.similarity,
                entry.value_ptr.file_a,
                entry.value_ptr.file_b,
            });
        }

        // Write usage entries
        var usage_iter = self.usage_cache.iterator();
        while (usage_iter.next()) |entry| {
            try writer.print("usage|{s}|{d}\n", .{
                entry.key_ptr.*,
                entry.value_ptr.usage_count,
            });
        }
    }

    /// Load registry from disk
    fn load(self: *Self) !void {
        const file = fs.cwd().openFile(self.db_path, .{}) catch return;
        defer file.close();

        var buf: [4096]u8 = undefined;
        while (file.reader().readUntilDelimiterOrEof(&buf, '\n')) |maybe_line| {
            const line = maybe_line orelse break;
            if (line.len == 0 or line[0] == '#') continue;

            // Parse line: type|key|similarity|file_a|file_b
            var iter = mem.splitScalar(u8, line, '|');
            const entry_type = iter.next() orelse continue;

            if (mem.eql(u8, entry_type, "similarity")) {
                const key = iter.next() orelse continue;
                const sim_str = iter.next() orelse continue;
                const file_a = iter.next() orelse continue;
                const file_b = iter.next() orelse continue;

                const sim = std.fmt.parseFloat(f64, sim_str) catch continue;

                // Duplicate strings for storage
                const owned_key = self.allocator.dupe(u8, key) catch continue;
                const owned_file_a = self.allocator.dupe(u8, file_a) catch continue;
                const owned_file_b = self.allocator.dupe(u8, file_b) catch continue;

                var id: [36]u8 = undefined;
                lib.generateUuid(&id);

                const evidence = lib.SimilarityEvidence{
                    .id = id,
                    .file_a = owned_file_a,
                    .file_b = owned_file_b,
                    .similarity = sim,
                    .token_overlap = sim,
                    .line_similarity = sim,
                    .structural_similarity = sim,
                    .hash_a = undefined,
                    .hash_b = undefined,
                    .computed_at = lib.timestamp(),
                };

                self.similarity_cache.put(owned_key, evidence) catch continue;
            }
        } else |_| {}
    }

    /// Get count of stored evidence
    pub fn count(self: *Self) usize {
        return self.similarity_cache.count() + self.usage_cache.count();
    }
};

// ============================================================================
// Tests
// ============================================================================

test "registry init and store" {
    const allocator = std.testing.allocator;

    var reg = try Registry.init(allocator, "/tmp/vt-test-registry.txt");
    defer reg.deinit();

    var evidence = lib.SimilarityEvidence{
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
    lib.generateUuid(&evidence.id);

    try reg.store(.similarity, &evidence.id, @ptrCast(&evidence));

    const retrieved = reg.getSimilarity("a.ts", "b.ts");
    try std.testing.expect(retrieved != null);
    try std.testing.expectApproxEqAbs(@as(f64, 0.85), retrieved.?.similarity, 0.01);
}

test "registry key ordering" {
    const allocator = std.testing.allocator;

    var reg = try Registry.init(allocator, "/tmp/vt-test-registry2.txt");
    defer reg.deinit();

    // Keys should be normalized regardless of order
    const key1 = try reg.makeSimilarityKey("b.ts", "a.ts");
    defer allocator.free(key1);

    const key2 = try reg.makeSimilarityKey("a.ts", "b.ts");
    defer allocator.free(key2);

    try std.testing.expectEqualStrings(key1, key2);
}
