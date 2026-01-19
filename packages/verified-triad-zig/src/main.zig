//! Verified Triad CLI
//!
//! Usage:
//!   vt init                              Initialize registry
//!   vt compute similarity <a> <b>        Compute file similarity
//!   vt claim dry <a> <b> <reason>        Claim DRY violation
//!   vt status                            Show registry status

const std = @import("std");
const fs = std.fs;
const lib = @import("lib.zig");
const similarity = @import("similarity.zig");

const VERSION = "0.1.0";

pub fn main() !void {
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    const allocator = gpa.allocator();

    const args = try std.process.argsAlloc(allocator);
    defer std.process.argsFree(allocator, args);

    if (args.len < 2) {
        printUsage();
        return;
    }

    const command = args[1];

    if (std.mem.eql(u8, command, "init")) {
        try cmdInit();
    } else if (std.mem.eql(u8, command, "compute")) {
        if (args.len < 3) {
            printUsage();
            return;
        }
        const subcommand = args[2];
        if (std.mem.eql(u8, subcommand, "similarity")) {
            if (args.len < 5) {
                std.debug.print("Usage: vt compute similarity <file_a> <file_b>\n", .{});
                return;
            }
            try cmdComputeSimilarity(allocator, args[3], args[4]);
        } else {
            std.debug.print("Unknown compute subcommand: {s}\n", .{subcommand});
        }
    } else if (std.mem.eql(u8, command, "claim")) {
        if (args.len < 3) {
            printUsage();
            return;
        }
        const subcommand = args[2];
        if (std.mem.eql(u8, subcommand, "dry")) {
            if (args.len < 6) {
                std.debug.print("Usage: vt claim dry <file_a> <file_b> <reason>\n", .{});
                return;
            }
            try cmdClaimDry(allocator, args[3], args[4], args[5]);
        } else {
            std.debug.print("Unknown claim subcommand: {s}\n", .{subcommand});
        }
    } else if (std.mem.eql(u8, command, "status")) {
        try cmdStatus(allocator);
    } else if (std.mem.eql(u8, command, "version") or std.mem.eql(u8, command, "--version")) {
        std.debug.print("vt {s}\n", .{VERSION});
    } else if (std.mem.eql(u8, command, "help") or std.mem.eql(u8, command, "--help")) {
        printUsage();
    } else {
        std.debug.print("Unknown command: {s}\n", .{command});
        printUsage();
    }
}

fn printUsage() void {
    const usage =
        \\Verified Triad - Computation-constrained synthesis for AI code analysis
        \\
        \\Usage: vt <command> [options]
        \\
        \\Commands:
        \\  init                           Initialize registry in current directory
        \\  compute similarity <a> <b>     Compute similarity between two files
        \\  claim dry <a> <b> <reason>     Claim DRY violation (requires prior compute)
        \\  status                         Show registry status
        \\  version                        Show version
        \\  help                           Show this help
        \\
        \\Examples:
        \\  vt init
        \\  vt compute similarity src/a.ts src/b.ts
        \\  vt claim dry src/a.ts src/b.ts "Duplicate validation"
        \\
    ;
    std.debug.print("{s}", .{usage});
}

fn cmdInit() !void {
    // Create .vt directory
    fs.cwd().makeDir(".vt") catch |err| {
        if (err != error.PathAlreadyExists) return err;
    };

    // Create empty registry file
    const file = try fs.cwd().createFile(".vt/registry.txt", .{});
    defer file.close();
    try file.writeAll("# Verified Triad Registry\n# Format: type|key|data\n");

    std.debug.print("✓ Initialized Verified Triad registry at .vt/registry.txt\n\n", .{});
    std.debug.print("Next steps:\n", .{});
    std.debug.print("  vt compute similarity <file_a> <file_b>  # Compute before claiming\n", .{});
    std.debug.print("  vt claim dry <file_a> <file_b> \"reason\"  # Make grounded claim\n", .{});
}

fn cmdComputeSimilarity(allocator: std.mem.Allocator, file_a: []const u8, file_b: []const u8) !void {
    const evidence = similarity.compute(allocator, file_a, file_b) catch |err| {
        std.debug.print("✗ Error computing similarity: {}\n", .{err});
        return;
    };

    // Store in registry
    var reg = try lib.registry.Registry.init(allocator, ".vt/registry.txt");
    defer reg.deinit();
    try reg.store(.similarity, &evidence.id, @ptrCast(&evidence));

    const threshold: f64 = 0.80;
    const meets = evidence.meetsThreshold(threshold);

    std.debug.print("✓ Computed similarity\n", .{});
    std.debug.print("  Files: {s} ↔ {s}\n", .{ file_a, file_b });
    std.debug.print("  Similarity: {d:.2}%\n", .{evidence.similarity * 100});
    std.debug.print("  Token overlap: {d:.2}%\n", .{evidence.token_overlap * 100});
    std.debug.print("  Line similarity: {d:.2}%\n", .{evidence.line_similarity * 100});
    std.debug.print("  Structural similarity: {d:.2}%\n", .{evidence.structural_similarity * 100});
    std.debug.print("  Evidence ID: {s}\n\n", .{evidence.id});

    if (meets) {
        std.debug.print("  → Meets DRY threshold ({d:.0}%), claim allowed\n", .{threshold * 100});
    } else {
        std.debug.print("  → Below DRY threshold ({d:.0}%), claim would be blocked\n", .{threshold * 100});
    }
}

fn cmdClaimDry(allocator: std.mem.Allocator, file_a: []const u8, file_b: []const u8, reason: []const u8) !void {
    var reg = try lib.registry.Registry.init(allocator, ".vt/registry.txt");
    defer reg.deinit();

    const evidence = reg.getSimilarity(file_a, file_b);

    if (evidence == null) {
        std.debug.print("✗ Claim BLOCKED\n", .{});
        std.debug.print("  No evidence found for DRY violation.\n", .{});
        std.debug.print("  Run: vt compute similarity \"{s}\" \"{s}\"\n", .{ file_a, file_b });
        return;
    }

    const threshold: f64 = 0.80;
    if (!evidence.?.meetsThreshold(threshold)) {
        std.debug.print("✗ Claim BLOCKED\n", .{});
        std.debug.print("  Evidence below threshold: {d:.2} < {d:.2}\n", .{ evidence.?.similarity, threshold });
        return;
    }

    // Generate claim ID
    var claim_id: [36]u8 = undefined;
    lib.generateUuid(&claim_id);

    std.debug.print("✓ Claim ALLOWED (grounded in computation)\n", .{});
    std.debug.print("  Claim ID: {s}\n", .{claim_id});
    std.debug.print("  Files: {s} ↔ {s}\n", .{ file_a, file_b });
    std.debug.print("  Similarity: {d:.2}%\n", .{evidence.?.similarity * 100});
    std.debug.print("  Reason: {s}\n", .{reason});
    std.debug.print("  Evidence: {s}\n", .{evidence.?.id});
}

fn cmdStatus(allocator: std.mem.Allocator) !void {
    var reg = lib.registry.Registry.init(allocator, ".vt/registry.txt") catch {
        std.debug.print("No registry found. Run: vt init\n", .{});
        return;
    };
    defer reg.deinit();

    std.debug.print("Verified Triad Status\n", .{});
    std.debug.print("=====================\n\n", .{});
    std.debug.print("Registry: .vt/registry.txt\n", .{});
    std.debug.print("Evidence count: {d}\n\n", .{reg.count()});
    std.debug.print("Thresholds:\n", .{});
    std.debug.print("  DRY similarity: 80%\n", .{});
    std.debug.print("  Min usages (Rams): 1\n", .{});
    std.debug.print("  Min connections (Heidegger): 1\n", .{});
}
