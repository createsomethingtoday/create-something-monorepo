export class SymphonyError extends Error {
    code;
    details;
    constructor(code, message, options) {
        super(message, options?.cause ? { cause: options.cause } : undefined);
        this.name = 'SymphonyError';
        this.code = code;
        this.details = options?.details;
    }
}
export function isSymphonyError(error) {
    return error instanceof SymphonyError;
}
//# sourceMappingURL=errors.js.map