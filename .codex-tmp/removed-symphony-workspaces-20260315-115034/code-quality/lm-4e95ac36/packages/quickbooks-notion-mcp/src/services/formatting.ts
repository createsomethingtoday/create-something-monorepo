import { CHARACTER_LIMIT } from "../constants.js";
import { ResponseFormat } from "../types.js";
import type { PaginatedResponse } from "../types.js";

/**
 * Format a paginated response for MCP output.
 */
export function formatPaginatedResponse<T>(
  data: PaginatedResponse<T>,
  format: ResponseFormat,
  formatItem: (item: T, index: number) => string
): string {
  if (format === ResponseFormat.JSON) {
    return truncateWithWarning(JSON.stringify(data, null, 2));
  }

  const lines: string[] = [];
  lines.push(`**Results**: ${data.count} of ${data.total} total`);
  if (data.has_more) {
    lines.push(
      `_More results available. Use offset=${data.next_offset} to get the next page._`
    );
  }
  lines.push("");

  data.items.forEach((item, i) => {
    lines.push(formatItem(item, i));
    lines.push("");
  });

  return truncateWithWarning(lines.join("\n"));
}

/**
 * Truncate text that exceeds the character limit.
 */
export function truncateWithWarning(text: string): string {
  if (text.length <= CHARACTER_LIMIT) return text;
  return (
    text.slice(0, CHARACTER_LIMIT) +
    "\n\n⚠️ Response truncated. Use pagination (limit/offset) to retrieve smaller batches."
  );
}

/**
 * Format currency amounts.
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

/**
 * Format a date string for display.
 */
export function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return "N/A";
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

/**
 * Format a QBO address as a single line.
 */
export function formatAddress(addr: {
  Line1?: string;
  Line2?: string;
  City?: string;
  CountrySubDivisionCode?: string;
  PostalCode?: string;
} | undefined): string {
  if (!addr) return "N/A";
  const parts = [
    addr.Line1,
    addr.Line2,
    addr.City,
    addr.CountrySubDivisionCode,
    addr.PostalCode,
  ].filter(Boolean);
  return parts.join(", ") || "N/A";
}

/**
 * Build a standardized MCP tool response.
 */
export function toolResponse(
  text: string,
  isError = false
): { content: Array<{ type: "text"; text: string }>; isError?: boolean } {
  const result: { content: Array<{ type: "text"; text: string }>; isError?: boolean } = {
    content: [{ type: "text" as const, text }],
  };
  if (isError) result.isError = true;
  return result;
}

/**
 * Wrap a tool handler with error handling.
 */
export function withErrorHandling<TParams, TResult>(
  handler: (params: TParams) => Promise<TResult>
): (params: TParams) => Promise<TResult | ReturnType<typeof toolResponse>> {
  return async (params: TParams) => {
    try {
      return await handler(params);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : String(error);
      return toolResponse(`Error: ${message}`, true);
    }
  };
}
