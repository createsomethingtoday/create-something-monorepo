import { SymphonyError } from './errors.js';

function count_indent(line) {
    let index = 0;
    while (index < line.length && line[index] === ' ') {
        index += 1;
    }
    return index;
}

function strip_comments(value) {
    let in_single = false;
    let in_double = false;
    for (let index = 0; index < value.length; index += 1) {
        const char = value[index];
        const prev = index > 0 ? value[index - 1] : '';
        if (char === "'" && !in_double) {
            in_single = !in_single;
            continue;
        }
        if (char === '"' && !in_single && prev !== '\\') {
            in_double = !in_double;
            continue;
        }
        if (char === '#' && !in_single && !in_double) {
            return value.slice(0, index).trimEnd();
        }
    }
    return value;
}

function parse_scalar(raw_value) {
    const value = strip_comments(raw_value).trim();
    if (value === '') {
        return '';
    }
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith('[') && value.endsWith(']')) || (value.startsWith('{') && value.endsWith('}'))) {
        return JSON.parse(value);
    }
    if (value.startsWith("'") && value.endsWith("'")) {
        return value.slice(1, -1).replace(/''/g, "'");
    }
    if (/^-?\d+$/.test(value)) {
        return Number.parseInt(value, 10);
    }
    if (/^-?\d+\.\d+$/.test(value)) {
        return Number.parseFloat(value);
    }
    if (value === 'true') {
        return true;
    }
    if (value === 'false') {
        return false;
    }
    if (value === 'null' || value === '~') {
        return null;
    }
    return value;
}

function find_next_significant_line(lines, start_index) {
    for (let index = start_index; index < lines.length; index += 1) {
        const raw_line = lines[index];
        const trimmed = raw_line.trim();
        if (trimmed === '' || trimmed.startsWith('#')) {
            continue;
        }
        return {
            index,
            indent: count_indent(raw_line),
            trimmed: raw_line.slice(count_indent(raw_line)),
        };
    }
    return null;
}

function split_key_value(line) {
    let in_single = false;
    let in_double = false;
    for (let index = 0; index < line.length; index += 1) {
        const char = line[index];
        const prev = index > 0 ? line[index - 1] : '';
        if (char === "'" && !in_double) {
            in_single = !in_single;
            continue;
        }
        if (char === '"' && !in_single && prev !== '\\') {
            in_double = !in_double;
            continue;
        }
        if (char === ':' && !in_single && !in_double) {
            return {
                key: line.slice(0, index).trim(),
                value: line.slice(index + 1),
            };
        }
    }
    return null;
}

export function parse_front_matter_map(source) {
    const lines = source.replace(/\r\n?/g, '\n').split('\n');
    const root = {};
    const stack = [{ indent: -1, container: root }];

    for (let index = 0; index < lines.length; index += 1) {
        const raw_line = lines[index];
        const trimmed_line = raw_line.trim();
        if (trimmed_line === '' || trimmed_line.startsWith('#')) {
            continue;
        }

        const indent = count_indent(raw_line);
        const line = raw_line.slice(indent);

        while (stack.length > 1 && indent <= stack[stack.length - 1].indent) {
            stack.pop();
        }

        const current = stack[stack.length - 1];

        if (line.startsWith('- ')) {
            if (!Array.isArray(current.container)) {
                throw new SymphonyError('workflow_parse_error', `Unexpected list item on line ${index + 1}.`);
            }
            const item_source = line.slice(2).trim();
            if (item_source === '') {
                const next = find_next_significant_line(lines, index + 1);
                const container = next && next.indent > indent && next.trimmed.startsWith('- ') ? [] : {};
                current.container.push(container);
                stack.push({ indent, container });
                continue;
            }
            const inline = split_key_value(item_source);
            if (inline && inline.value.trim() === '') {
                const container = {};
                container[inline.key] = {};
                current.container.push(container);
                stack.push({ indent, container: container[inline.key] });
                continue;
            }
            current.container.push(inline ? { [inline.key]: parse_scalar(inline.value) } : parse_scalar(item_source));
            continue;
        }

        if (Array.isArray(current.container)) {
            throw new SymphonyError('workflow_parse_error', `Unexpected mapping entry inside list on line ${index + 1}.`);
        }

        const pair = split_key_value(line);
        if (!pair || pair.key === '') {
            throw new SymphonyError('workflow_parse_error', `Invalid mapping entry on line ${index + 1}.`);
        }

        const value_source = pair.value.trim();
        if (value_source === '') {
            const next = find_next_significant_line(lines, index + 1);
            const container = next && next.indent > indent && next.trimmed.startsWith('- ') ? [] : {};
            current.container[pair.key] = container;
            stack.push({ indent, container });
            continue;
        }

        current.container[pair.key] = parse_scalar(pair.value);
    }

    return root;
}
