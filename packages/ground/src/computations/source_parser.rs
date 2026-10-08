//! Shared source projections. Byte offsets and line numbers always refer to the
//! original source; these projections never modify files or erase syntax errors.
use tree_sitter::{Node, Parser, Tree};

fn whitespace(source: &str) -> Vec<u8> {
    source.bytes().map(|b| if matches!(b, b'\n' | b'\r') { b } else { b' ' }).collect()
}

/// Extract Svelte scripts while ignoring HTML comments, quoted tag attributes
/// and style content. This is a script boundary reader, not a markup validator.
pub(super) fn svelte_scripts(source: &str, module_only: bool) -> Result<Option<String>, String> {
    let mut projected = whitespace(source);
    let mut cursor = 0;
    let mut found = false;
    while let Some(relative) = source[cursor..].find('<') {
        let start = cursor + relative;
        if source[start..].starts_with("<!--") {
            let Some(end) = source[start + 4..].find("-->") else {
                return Err("Unclosed Svelte HTML comment".into());
            };
            cursor = start + 4 + end + 3;
            continue;
        }
        if !source.as_bytes().get(start + 1).is_some_and(|b| b.is_ascii_alphabetic() || matches!(b, b'/' | b'!')) {
            cursor = start + 1;
            continue;
        }
        let Some(end) = tag_end(source, start) else {
            if source[start..].starts_with("<script") { return Err("Unclosed Svelte script tag".into()); }
            break;
        };
        let opening = &source[start..end];
        let is_script = tag_is(opening, "script");
        let is_style = tag_is(opening, "style");
        cursor = end;
        if !is_script && !is_style { continue; }
        let closing = if is_script { "</script>" } else { "</style>" };
        let Some(relative_end) = source[end..].find(closing) else {
            return Err(format!("Svelte tag has no closing {closing}"));
        };
        let content_end = end + relative_end;
        if is_script && (!module_only || is_module_script(opening)) {
            projected[end..content_end].copy_from_slice(&source.as_bytes()[end..content_end]);
            found = true;
        }
        cursor = content_end + closing.len();
    }
    Ok(found.then(|| String::from_utf8(projected).expect("source spans preserve UTF-8")))
}

fn tag_is(opening: &str, name: &str) -> bool {
    opening.strip_prefix('<').and_then(|s| s.strip_prefix(name))
        .is_some_and(|rest| rest.starts_with('>') || rest.starts_with(char::is_whitespace))
}

fn tag_end(source: &str, start: usize) -> Option<usize> {
    let mut quote = None;
    for (index, byte) in source.as_bytes().iter().enumerate().skip(start + 1) {
        match (quote, *byte) {
            (Some(q), b) if q == b => quote = None,
            (None, b'\'' | b'"') => quote = Some(*byte),
            (None, b'>') => return Some(index + 1),
            _ => {}
        }
    }
    None
}

fn is_module_script(opening: &str) -> bool {
    // Attribute values cannot introduce module/context attributes.
    let mut rest = opening.trim_start_matches("<script").trim_end_matches('>').trim();
    while !rest.is_empty() {
        let end = rest.find(|c: char| c.is_whitespace() || c == '=').unwrap_or(rest.len());
        let name = &rest[..end];
        rest = rest[end..].trim_start();
        let mut value = None;
        if let Some(after_equals) = rest.strip_prefix('=') {
            rest = after_equals.trim_start();
            if let Some(q @ ('\'' | '"')) = rest.chars().next() {
                rest = &rest[1..];
                let end = rest.find(q).unwrap_or(rest.len());
                value = Some(&rest[..end]);
                rest = rest.get(end + 1..).unwrap_or("").trim_start();
            } else {
                let end = rest.find(char::is_whitespace).unwrap_or(rest.len());
                value = Some(&rest[..end]);
                rest = rest[end..].trim_start();
            }
        }
        if (name == "module" && value.is_none()) || (name == "context" && value == Some("module")) { return true; }
        if name.is_empty() { break; }
    }
    false
}

/// tree-sitter-typescript 0.23 cannot attach type arguments to import-type
/// members (e.g. import('svelte').Snippet<[string]>). Only for a syntax-error
/// tree, project a proven type-context import(string) operand to an identifier.
/// Reparse the ENTIRE source and let callers reject every remaining error.
/// Keep original bytes for all extraction/evidence; do not touch runtime imports.
pub(super) fn parse_typescript(parser: &mut Parser, source: &str) -> Option<Tree> {
    let mut tree = parser.parse(source, None)?;
    let mut projected = source.as_bytes().to_vec();
    // Repair one recovered type context at a time: an earlier unsupported
    // generic can make later interface members look like runtime expressions.
    // Each iteration removes at least one proven import operand, so this is
    // bounded by the number of operands in the original source.
    while tree.root_node().has_error() {
        let mut spans = Vec::new();
        type_import_spans(tree.root_node(), &mut spans);
        if spans.is_empty() { break; }
        for (start, end) in spans {
            projected[start..end].copy_from_slice(&whitespace(&source[start..end]));
            projected[start] = b'I';
        }
        tree = parser.parse(&projected, None)?;
    }
    Some(tree)
}

fn type_import_spans(node: Node, spans: &mut Vec<(usize, usize)>) {
    if node.kind() == "call_expression" && !node.has_error()
        && node.child_by_field_name("function").is_some_and(|n| n.kind() == "import") {
        let arguments = node.child_by_field_name("arguments");
        let literal_argument = arguments.is_some_and(|args| {
            let mut cursor = args.walk();
            let args: Vec<_> = args.named_children(&mut cursor).filter(|n| n.kind() != "comment").collect();
            args.len() == 1 && args[0].kind() == "string" && !args[0].has_error()
        });
        if literal_argument {
            let mut member = node;
            while let Some(parent) = member.parent() {
                if parent.kind() != "member_expression" || parent.child_by_field_name("object") != Some(member) { break; }
                member = parent;
            }
            let type_context = member.parent().is_some_and(|parent| {
                parent.kind() == "type_annotation"
                    || (parent.kind() == "type_alias_declaration" && parent.child_by_field_name("value") == Some(member))
            });
            if member != node && type_context { spans.push((node.start_byte(), node.end_byte())); }
        }
    }
    let mut cursor = node.walk();
    for child in node.named_children(&mut cursor) { type_import_spans(child, spans); }
}
