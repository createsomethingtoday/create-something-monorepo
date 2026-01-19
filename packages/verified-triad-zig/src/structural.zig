//! Structural Similarity Analysis
//!
//! Native Zig implementation for structural code comparison.
//! Uses pattern matching to identify code structure without full AST parsing.

const std = @import("std");
const mem = std.mem;

/// Structural fingerprint of code
pub const StructuralFingerprint = struct {
    /// Function/method count
    function_count: usize,
    /// Control flow pattern count (if, for, while, etc.)
    control_flow_count: usize,
    /// Export statement count
    export_count: usize,
    /// Import statement count
    import_count: usize,
    /// Class/interface count
    class_count: usize,
    /// Arrow function count
    arrow_function_count: usize,
    /// Return statement count
    return_count: usize,
    /// Total brace depth (complexity indicator)
    max_brace_depth: usize,
    /// Line count (non-empty)
    line_count: usize,
    /// Average line length
    avg_line_length: f64,

    pub fn empty() StructuralFingerprint {
        return .{
            .function_count = 0,
            .control_flow_count = 0,
            .export_count = 0,
            .import_count = 0,
            .class_count = 0,
            .arrow_function_count = 0,
            .return_count = 0,
            .max_brace_depth = 0,
            .line_count = 0,
            .avg_line_length = 0,
        };
    }
};

/// Result of structural comparison
pub const StructuralSimilarity = struct {
    /// Overall structural similarity (0.0 - 1.0)
    similarity: f64,
    /// Feature vector similarity
    feature_similarity: f64,
    /// Complexity similarity
    complexity_similarity: f64,
};

/// Extract structural fingerprint from source code
pub fn extractFingerprint(content: []const u8) StructuralFingerprint {
    var fp = StructuralFingerprint.empty();

    var current_depth: usize = 0;
    var total_line_length: usize = 0;
    var line_count: usize = 0;

    var iter = mem.splitScalar(u8, content, '\n');
    while (iter.next()) |line| {
        const trimmed = mem.trim(u8, line, " \t\r");
        if (trimmed.len == 0) continue;

        line_count += 1;
        total_line_length += trimmed.len;

        // Count braces for depth
        for (trimmed) |c| {
            if (c == '{') {
                current_depth += 1;
                if (current_depth > fp.max_brace_depth) {
                    fp.max_brace_depth = current_depth;
                }
            } else if (c == '}') {
                if (current_depth > 0) current_depth -= 1;
            }
        }

        // Pattern matching for structure detection
        if (containsPattern(trimmed, "function ") or containsPattern(trimmed, "function(")) {
            fp.function_count += 1;
        }

        if (containsPattern(trimmed, "=>")) {
            fp.arrow_function_count += 1;
        }

        if (startsWithPattern(trimmed, "if ") or startsWithPattern(trimmed, "if(")) {
            fp.control_flow_count += 1;
        }

        if (startsWithPattern(trimmed, "for ") or startsWithPattern(trimmed, "for(")) {
            fp.control_flow_count += 1;
        }

        if (startsWithPattern(trimmed, "while ") or startsWithPattern(trimmed, "while(")) {
            fp.control_flow_count += 1;
        }

        if (startsWithPattern(trimmed, "switch ") or startsWithPattern(trimmed, "switch(")) {
            fp.control_flow_count += 1;
        }

        if (startsWithPattern(trimmed, "export ")) {
            fp.export_count += 1;
        }

        if (startsWithPattern(trimmed, "import ")) {
            fp.import_count += 1;
        }

        if (startsWithPattern(trimmed, "class ") or containsPattern(trimmed, "interface ")) {
            fp.class_count += 1;
        }

        if (startsWithPattern(trimmed, "return ") or mem.eql(u8, trimmed, "return;")) {
            fp.return_count += 1;
        }
    }

    fp.line_count = line_count;
    if (line_count > 0) {
        fp.avg_line_length = @as(f64, @floatFromInt(total_line_length)) / @as(f64, @floatFromInt(line_count));
    }

    return fp;
}

fn containsPattern(haystack: []const u8, needle: []const u8) bool {
    return mem.indexOf(u8, haystack, needle) != null;
}

fn startsWithPattern(haystack: []const u8, needle: []const u8) bool {
    return mem.startsWith(u8, haystack, needle);
}

/// Compare two structural fingerprints
pub fn compareFingerprints(a: StructuralFingerprint, b: StructuralFingerprint) StructuralSimilarity {
    // Feature vector comparison using cosine-like similarity
    const features_a = [_]f64{
        @floatFromInt(a.function_count),
        @floatFromInt(a.control_flow_count),
        @floatFromInt(a.export_count),
        @floatFromInt(a.import_count),
        @floatFromInt(a.class_count),
        @floatFromInt(a.arrow_function_count),
        @floatFromInt(a.return_count),
    };

    const features_b = [_]f64{
        @floatFromInt(b.function_count),
        @floatFromInt(b.control_flow_count),
        @floatFromInt(b.export_count),
        @floatFromInt(b.import_count),
        @floatFromInt(b.class_count),
        @floatFromInt(b.arrow_function_count),
        @floatFromInt(b.return_count),
    };

    const feature_similarity = cosineSimilarity(&features_a, &features_b);

    // Complexity comparison
    const depth_diff = absDiff(a.max_brace_depth, b.max_brace_depth);
    const line_diff = absDiff(a.line_count, b.line_count);
    const max_lines = @max(a.line_count, b.line_count);

    var complexity_similarity: f64 = 1.0;
    if (max_lines > 0) {
        const depth_penalty = @as(f64, @floatFromInt(depth_diff)) / 10.0;
        const line_penalty = @as(f64, @floatFromInt(line_diff)) / @as(f64, @floatFromInt(max_lines));
        complexity_similarity = @max(0.0, 1.0 - depth_penalty - line_penalty);
    }

    // Combined similarity
    const similarity = feature_similarity * 0.7 + complexity_similarity * 0.3;

    return .{
        .similarity = similarity,
        .feature_similarity = feature_similarity,
        .complexity_similarity = complexity_similarity,
    };
}

fn cosineSimilarity(a: []const f64, b: []const f64) f64 {
    var dot_product: f64 = 0;
    var magnitude_a: f64 = 0;
    var magnitude_b: f64 = 0;

    for (a, b) |va, vb| {
        dot_product += va * vb;
        magnitude_a += va * va;
        magnitude_b += vb * vb;
    }

    const magnitude = @sqrt(magnitude_a) * @sqrt(magnitude_b);
    if (magnitude == 0) return 1.0; // Both zero vectors = identical

    return dot_product / magnitude;
}

fn absDiff(a: usize, b: usize) usize {
    return if (a > b) a - b else b - a;
}

// ============================================================================
// Tests
// ============================================================================

test "extract fingerprint - function detection" {
    const code =
        \\function validateEmail(email: string): boolean {
        \\    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        \\    if (!email) {
        \\        return false;
        \\    }
        \\    return regex.test(email);
        \\}
    ;

    const fp = extractFingerprint(code);
    try std.testing.expectEqual(@as(usize, 1), fp.function_count);
    try std.testing.expectEqual(@as(usize, 1), fp.control_flow_count); // if
    try std.testing.expectEqual(@as(usize, 2), fp.return_count);
}

test "extract fingerprint - arrow functions" {
    const code =
        \\const validate = (x: string) => {
        \\    return x.length > 0;
        \\};
        \\const transform = (y: number) => y * 2;
    ;

    const fp = extractFingerprint(code);
    try std.testing.expectEqual(@as(usize, 2), fp.arrow_function_count);
}

test "extract fingerprint - control flow" {
    const code =
        \\function process(items: any[]) {
        \\    for (const item of items) {
        \\        if (item.valid) {
        \\            while (item.processing) {
        \\                // wait
        \\            }
        \\        }
        \\    }
        \\}
    ;

    const fp = extractFingerprint(code);
    try std.testing.expectEqual(@as(usize, 3), fp.control_flow_count); // for, if, while
}

test "compare fingerprints - identical" {
    const code =
        \\function test() {
        \\    if (true) {
        \\        return 1;
        \\    }
        \\}
    ;

    const fp = extractFingerprint(code);
    const result = compareFingerprints(fp, fp);
    try std.testing.expectApproxEqAbs(@as(f64, 1.0), result.similarity, 0.01);
}

test "compare fingerprints - similar structure" {
    const code_a =
        \\function validateA(input: string): boolean {
        \\    if (!input) {
        \\        return false;
        \\    }
        \\    return true;
        \\}
    ;

    const code_b =
        \\function validateB(data: string): boolean {
        \\    if (!data) {
        \\        return false;
        \\    }
        \\    return true;
        \\}
    ;

    const fp_a = extractFingerprint(code_a);
    const fp_b = extractFingerprint(code_b);
    const result = compareFingerprints(fp_a, fp_b);

    // Should be very similar (same structure, different names)
    try std.testing.expect(result.similarity > 0.9);
}

test "compare fingerprints - different structure" {
    const code_a =
        \\function validate(x: string): boolean {
        \\    for (let i = 0; i < 10; i++) {
        \\        if (x[i] === ' ') {
        \\            return false;
        \\        }
        \\    }
        \\    return true;
        \\}
    ;

    const code_b =
        \\const config = {
        \\    name: "app",
        \\    version: "1.0.0"
        \\};
        \\export default config;
    ;

    const fp_a = extractFingerprint(code_a);
    const fp_b = extractFingerprint(code_b);
    const result = compareFingerprints(fp_a, fp_b);

    // Should be quite different
    try std.testing.expect(result.similarity < 0.5);
}
