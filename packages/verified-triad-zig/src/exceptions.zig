//! Exception patterns for filtering false positives in DRY audits
//!
//! Filters out acceptable duplications like boilerplate, config files, and re-exports.

const std = @import("std");
const mem = std.mem;
const fs = std.fs;

/// Configuration for exception patterns
pub const ExceptionConfig = struct {
    ignore_paths: []const []const u8,
    ignore_files: []const []const u8,
    boilerplate_max_lines: usize,
    small_file_max_bytes: u64,

    pub const default = ExceptionConfig{
        .ignore_paths = &default_ignore_paths,
        .ignore_files = &default_ignore_files,
        .boilerplate_max_lines = 15,
        .small_file_max_bytes = 300,
    };
};

const default_ignore_paths = [_][]const u8{
    "test",
    "tests",
    "__tests__",
    "fixtures",
    "__fixtures__",
    "__mocks__",
    "examples",
    "generated",
    "dist",
    ".svelte-kit",
    "node_modules",
};

const default_ignore_files = [_][]const u8{
    "vite.config.ts",
    "vite.config.js",
    "svelte.config.js",
    "tailwind.config.js",
    "tailwind.config.ts",
    "postcss.config.js",
    "postcss.config.cjs",
    "tsconfig.json",
    "mdsvex.config.js",
    "package-lock.json",
    "pnpm-lock.yaml",
    "yarn.lock",
    ".prettierrc",
    ".eslintrc.js",
    ".eslintrc.cjs",
};

/// Result of checking for exceptions
pub const ExceptionMatch = union(enum) {
    none,
    ignored_path: []const u8,
    ignored_file: []const u8,
    boilerplate,
    small_file,
    reexport_only,

    pub fn isException(self: ExceptionMatch) bool {
        return self != .none;
    }

    pub fn reason(self: ExceptionMatch) []const u8 {
        return switch (self) {
            .none => "No exception",
            .ignored_path => |p| p,
            .ignored_file => |f| f,
            .boilerplate => "Both files ≤15 lines",
            .small_file => "Both files ≤300 bytes",
            .reexport_only => "Re-export only file",
        };
    }
};

/// Check if a file pair matches any exception pattern
pub fn checkException(
    config: ExceptionConfig,
    path_a: []const u8,
    path_b: []const u8,
    content_a: []const u8,
    content_b: []const u8,
) ExceptionMatch {
    // Check ignored paths
    for (config.ignore_paths) |pattern| {
        if (containsPath(path_a, pattern) or containsPath(path_b, pattern)) {
            return .{ .ignored_path = pattern };
        }
    }

    // Check ignored files
    const name_a = std.fs.path.basename(path_a);
    const name_b = std.fs.path.basename(path_b);

    for (config.ignore_files) |pattern| {
        if (mem.eql(u8, name_a, pattern) or mem.eql(u8, name_b, pattern)) {
            return .{ .ignored_file = pattern };
        }
    }

    // Check boilerplate (both files small by line count)
    const lines_a = countLines(content_a);
    const lines_b = countLines(content_b);

    if (lines_a <= config.boilerplate_max_lines and lines_b <= config.boilerplate_max_lines) {
        return .boilerplate;
    }

    // Check small files by bytes
    if (content_a.len <= config.small_file_max_bytes and content_b.len <= config.small_file_max_bytes) {
        return .small_file;
    }

    // Check for re-export only files
    if (isReexportOnly(content_a) or isReexportOnly(content_b)) {
        return .reexport_only;
    }

    return .none;
}

fn containsPath(path: []const u8, pattern: []const u8) bool {
    // Simple substring match for path components
    var iter = mem.splitScalar(u8, path, '/');
    while (iter.next()) |component| {
        if (mem.eql(u8, component, pattern)) {
            return true;
        }
    }

    // Also check with backslash for Windows
    var iter2 = mem.splitScalar(u8, path, '\\');
    while (iter2.next()) |component| {
        if (mem.eql(u8, component, pattern)) {
            return true;
        }
    }

    return false;
}

fn countLines(content: []const u8) usize {
    if (content.len == 0) return 0;

    var count: usize = 1;
    for (content) |c| {
        if (c == '\n') count += 1;
    }
    return count;
}

/// Check if content is only re-exports
fn isReexportOnly(content: []const u8) bool {
    var iter = mem.splitScalar(u8, content, '\n');
    var has_content = false;

    while (iter.next()) |line| {
        const trimmed = mem.trim(u8, line, " \t\r");

        // Skip empty lines and comments
        if (trimmed.len == 0) continue;
        if (mem.startsWith(u8, trimmed, "//")) continue;
        if (mem.startsWith(u8, trimmed, "/*")) continue;
        if (mem.startsWith(u8, trimmed, "*")) continue;

        has_content = true;

        // Must be export statement
        if (!mem.startsWith(u8, trimmed, "export")) {
            return false;
        }

        // Check for re-export patterns
        const is_reexport = mem.indexOf(u8, trimmed, " from ") != null or
            mem.indexOf(u8, trimmed, " from\"") != null or
            mem.indexOf(u8, trimmed, " from'") != null or
            mem.startsWith(u8, trimmed, "export *") or
            mem.startsWith(u8, trimmed, "export type");

        if (!is_reexport) {
            return false;
        }
    }

    return has_content;
}

/// Load config from TOML file (simplified - uses defaults if not found)
pub fn loadConfig(allocator: mem.Allocator, path: []const u8) ExceptionConfig {
    _ = allocator;
    _ = path;
    // For simplicity, just return defaults
    // Full implementation would parse TOML
    return ExceptionConfig.default;
}

// ============================================================================
// Tests
// ============================================================================

test "exception - ignored path" {
    const config = ExceptionConfig.default;
    const result = checkException(
        config,
        "src/test/utils.ts",
        "src/lib/utils.ts",
        "content",
        "content",
    );
    try std.testing.expect(result.isException());
    try std.testing.expectEqual(ExceptionMatch{ .ignored_path = "test" }, result);
}

test "exception - ignored file" {
    const config = ExceptionConfig.default;
    const result = checkException(
        config,
        "pkg-a/vite.config.ts",
        "pkg-b/vite.config.ts",
        "content here that is long enough",
        "content here that is long enough",
    );
    try std.testing.expect(result.isException());
}

test "exception - boilerplate" {
    const config = ExceptionConfig.default;
    const small_content = "line1\nline2\nline3";
    const result = checkException(
        config,
        "src/a.ts",
        "src/b.ts",
        small_content,
        small_content,
    );
    try std.testing.expect(result.isException());
    try std.testing.expectEqual(ExceptionMatch.boilerplate, result);
}

test "exception - reexport only" {
    const config = ExceptionConfig.default;
    const reexport = "export { foo } from './foo';\nexport type { Bar } from './bar';";
    const normal =
        \\function longFunction() {
        \\  const a = 1;
        \\  const b = 2;
        \\  const c = 3;
        \\  const d = 4;
        \\  const e = 5;
        \\  const f = 6;
        \\  const g = 7;
        \\  const h = 8;
        \\  const i = 9;
        \\  const j = 10;
        \\  const k = 11;
        \\  const l = 12;
        \\  const m = 13;
        \\  const n = 14;
        \\  const o = 15;
        \\  const p = 16;
        \\  return a + b;
        \\}
    ;
    const result = checkException(
        config,
        "src/index.ts",
        "src/other.ts",
        reexport,
        normal,
    );
    try std.testing.expect(result.isException());
    try std.testing.expectEqual(ExceptionMatch.reexport_only, result);
}

test "exception - none (real violation)" {
    const config = ExceptionConfig.default;
    const long_content =
        \\function validateEmail(email: string): boolean {
        \\  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        \\  if (!email || email.length === 0) {
        \\    return false;
        \\  }
        \\  return regex.test(email);
        \\}
        \\
        \\function validatePhone(phone: string): boolean {
        \\  const regex = /^\+?[\d\s-]{10,}$/;
        \\  return regex.test(phone);
        \\}
        \\
        \\function validateName(name: string): boolean {
        \\  if (!name || name.trim().length === 0) {
        \\    return false;
        \\  }
        \\  return true;
        \\}
    ;
    const result = checkException(
        config,
        "src/validators/email.ts",
        "src/validators/user.ts",
        long_content,
        long_content,
    );
    try std.testing.expect(!result.isException());
}

test "line counting" {
    try std.testing.expectEqual(@as(usize, 1), countLines("single line"));
    try std.testing.expectEqual(@as(usize, 3), countLines("one\ntwo\nthree"));
    try std.testing.expectEqual(@as(usize, 0), countLines(""));
}

test "reexport detection" {
    try std.testing.expect(isReexportOnly("export { foo } from './foo';"));
    try std.testing.expect(isReexportOnly("export * from './module';"));
    try std.testing.expect(isReexportOnly("export type { Foo } from './types';"));
    try std.testing.expect(!isReexportOnly("export function foo() {}"));
    try std.testing.expect(!isReexportOnly("const x = 1;\nexport { x };"));
}
