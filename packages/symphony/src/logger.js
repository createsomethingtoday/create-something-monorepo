function formatValue(value) {
    if (value === undefined)
        return '';
    if (value === null)
        return 'null';
    if (typeof value === 'number' || typeof value === 'boolean')
        return String(value);
    if (/^[A-Za-z0-9._:/+-]+$/.test(value))
        return value;
    return JSON.stringify(value);
}
function formatLine(level, message, fields = {}) {
    const parts = [`level=${level}`, `msg=${formatValue(message)}`];
    for (const [key, value] of Object.entries(fields)) {
        if (value === undefined)
            continue;
        parts.push(`${key}=${formatValue(value)}`);
    }
    return parts.join(' ');
}
export class ConsoleLogger {
    debug(message, fields) {
        console.debug(formatLine('debug', message, fields));
    }
    info(message, fields) {
        console.info(formatLine('info', message, fields));
    }
    warn(message, fields) {
        console.warn(formatLine('warn', message, fields));
    }
    error(message, fields) {
        console.error(formatLine('error', message, fields));
    }
}
export class MemoryLogger {
    lines = [];
    debug(message, fields) {
        this.lines.push(formatLine('debug', message, fields));
    }
    info(message, fields) {
        this.lines.push(formatLine('info', message, fields));
    }
    warn(message, fields) {
        this.lines.push(formatLine('warn', message, fields));
    }
    error(message, fields) {
        this.lines.push(formatLine('error', message, fields));
    }
}
//# sourceMappingURL=logger.js.map