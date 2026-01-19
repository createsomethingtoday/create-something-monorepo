//! Verified Triad DRY Audit
//!
//! Batch audit for DRY violations across a codebase.
//! Usage: vt-audit <path> [--threshold 0.8] [--show-all]

const std = @import("std");
const fs = std.fs;
const mem = std.mem;
const similarity = @import("similarity.zig");
const exceptions = @import("exceptions.zig");
const lib = @import("lib.zig");

const DEFAULT_THRESHOLD: f64 = 0.80;
const MAX_FILES: usize = 500;
const EXTENSIONS = [_][]const u8{ ".ts", ".tsx", ".js", ".jsx", ".svelte" };

const Finding = struct {
    file_a: []const u8,
    file_b: []const u8,
    similarity: f64,
    evidence_id: [36]u8,
    exception: exceptions.ExceptionMatch,
};

const Results = struct {
    violations: std.ArrayList(Finding),
    acceptable: std.ArrayList(Finding),

    fn init(allocator: mem.Allocator) Results {
        return .{
            .violations = std.ArrayList(Finding).init(allocator),
            .acceptable = std.ArrayList(Finding).init(allocator),
        };
    }

    fn deinit(self: *Results) void {
        self.violations.deinit();
        self.acceptable.deinit();
    }
};

pub fn main() !void {
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    const allocator = gpa.allocator();

    const args = try std.process.argsAlloc(allocator);
    defer std.process.argsFree(allocator, args);

    // Parse arguments
    var path: []const u8 = ".";
    var threshold: f64 = DEFAULT_THRESHOLD;
    var show_all = false;

    var i: usize = 1;
    while (i < args.len) : (i += 1) {
        if (mem.eql(u8, args[i], "--threshold") and i + 1 < args.len) {
            threshold = std.fmt.parseFloat(f64, args[i + 1]) catch DEFAULT_THRESHOLD;
            i += 1;
        } else if (mem.eql(u8, args[i], "--show-all")) {
            show_all = true;
        } else if (!mem.startsWith(u8, args[i], "--")) {
            path = args[i];
        }
    }

    // Print header
    std.debug.print("Verified Triad DRY Audit\n", .{});
    std.debug.print("========================\n", .{});
    std.debug.print("Path: {s}\n", .{path});
    std.debug.print("Threshold: {d:.0}%\n", .{threshold * 100});
    std.debug.print("Extensions: ", .{});
    for (EXTENSIONS, 0..) |ext, idx| {
        if (idx > 0) std.debug.print(", ", .{});
        std.debug.print("{s}", .{ext});
    }
    std.debug.print("\n\n", .{});

    // Collect files
    var files = std.ArrayList([]const u8).init(allocator);
    defer {
        for (files.items) |f| allocator.free(f);
        files.deinit();
    }

    try collectFiles(allocator, path, &files);

    if (files.items.len == 0) {
        std.debug.print("No matching files found.\n", .{});
        return;
    }

    const file_count = @min(files.items.len, MAX_FILES);
    std.debug.print("Found {d} files", .{files.items.len});
    if (files.items.len > MAX_FILES) {
        std.debug.print(", limiting to {d} for performance", .{MAX_FILES});
    }
    std.debug.print("\n\n", .{});

    // Compare files
    var results = Results.init(allocator);
    defer results.deinit();

    var comparisons: usize = 0;
    const config = exceptions.ExceptionConfig.default;

    // Load file contents for exception checking
    var contents = std.StringHashMap([]const u8).init(allocator);
    defer {
        var iter = contents.valueIterator();
        while (iter.next()) |v| allocator.free(v.*);
        contents.deinit();
    }

    for (files.items[0..file_count]) |file| {
        const content = readFileContent(allocator, file) catch continue;
        try contents.put(file, content);
    }

    std.debug.print("Comparing files...\n", .{});

    for (files.items[0..file_count], 0..) |file_a, idx_a| {
        for (files.items[idx_a + 1 .. file_count]) |file_b| {
            comparisons += 1;

            const evidence = similarity.compute(allocator, file_a, file_b) catch continue;

            if (!evidence.meetsThreshold(threshold)) continue;

            // Check exceptions
            const content_a = contents.get(file_a) orelse "";
            const content_b = contents.get(file_b) orelse "";

            const exception = exceptions.checkException(config, file_a, file_b, content_a, content_b);

            const finding = Finding{
                .file_a = file_a,
                .file_b = file_b,
                .similarity = evidence.similarity,
                .evidence_id = evidence.id,
                .exception = exception,
            };

            if (exception.isException()) {
                try results.acceptable.append(finding);
            } else {
                try results.violations.append(finding);
            }
        }
    }

    // Print results
    std.debug.print("\n========================================\n", .{});
    std.debug.print("DRY AUDIT RESULTS (Grounded in Evidence)\n", .{});
    std.debug.print("========================================\n\n", .{});

    if (results.violations.items.len == 0) {
        std.debug.print("VIOLATIONS: None found\n", .{});
    } else {
        std.debug.print("VIOLATIONS ({d}):\n\n", .{results.violations.items.len});
        for (results.violations.items, 0..) |finding, idx| {
            std.debug.print("  {d}. {d:.1}% similar\n", .{ idx + 1, finding.similarity * 100 });
            std.debug.print("     {s} <-> {s}\n", .{ finding.file_a, finding.file_b });
            std.debug.print("     Evidence: {s}\n\n", .{finding.evidence_id});
        }
    }

    std.debug.print("----------------------------------------\n", .{});

    if (show_all and results.acceptable.items.len > 0) {
        std.debug.print("ACCEPTABLE ({d} - matched exception patterns):\n\n", .{results.acceptable.items.len});
        for (results.acceptable.items, 0..) |finding, idx| {
            std.debug.print("  {d}. {d:.1}% similar\n", .{ idx + 1, finding.similarity * 100 });
            std.debug.print("     {s} <-> {s}\n", .{ finding.file_a, finding.file_b });
            std.debug.print("     Reason: {s}\n\n", .{finding.exception.reason()});
        }
    } else {
        std.debug.print("ACCEPTABLE: {d} findings filtered by exception patterns\n", .{results.acceptable.items.len});
        if (results.acceptable.items.len > 0) {
            std.debug.print("(use --show-all to see details)\n", .{});
        }
    }

    // Summary
    std.debug.print("\n========================================\n", .{});
    std.debug.print("SUMMARY\n", .{});
    std.debug.print("========================================\n", .{});
    std.debug.print("  Files analyzed:     {d}\n", .{file_count});
    std.debug.print("  Comparisons made:   {d}\n", .{comparisons});
    std.debug.print("  Violations:         {d}\n", .{results.violations.items.len});
    std.debug.print("  Acceptable:         {d}\n", .{results.acceptable.items.len});
    std.debug.print("  Total findings:     {d}\n", .{results.violations.items.len + results.acceptable.items.len});

    if (results.violations.items.len > 0) {
        std.debug.print("\nAll violations are GROUNDED in computation.\n", .{});
        std.debug.print("Evidence IDs can be verified in: .vt/registry.txt\n", .{});
        std.process.exit(1);
    }
}

fn collectFiles(allocator: mem.Allocator, path: []const u8, files: *std.ArrayList([]const u8)) !void {
    var dir = fs.cwd().openDir(path, .{ .iterate = true }) catch return;
    defer dir.close();

    var walker = dir.walk(allocator) catch return;
    defer walker.deinit();

    while (walker.next() catch null) |entry| {
        if (entry.kind != .file) continue;

        // Check extension
        var matches = false;
        for (EXTENSIONS) |ext| {
            if (mem.endsWith(u8, entry.basename, ext)) {
                matches = true;
                break;
            }
        }
        if (!matches) continue;

        // Build full path
        const full_path = try std.fmt.allocPrint(allocator, "{s}/{s}", .{ path, entry.path });
        try files.append(full_path);

        if (files.items.len >= MAX_FILES) return;
    }
}

fn readFileContent(allocator: mem.Allocator, path: []const u8) ![]const u8 {
    const file = try fs.cwd().openFile(path, .{});
    defer file.close();

    const stat = try file.stat();
    if (stat.size > 1024 * 1024) return error.FileTooLarge; // 1MB limit

    return try file.readToEndAlloc(allocator, @intCast(stat.size + 1));
}
