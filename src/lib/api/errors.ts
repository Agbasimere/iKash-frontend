/**
 * Backend errors are shaped as { statusCode, error, message } (see
 * AppException in ikash-backend). This preserves that shape on the client
 * so callers can branch on `err.code` (e.g. "ORDER_CANCELLATION_NOT_ALLOWED")
 * instead of parsing message text.
 */
export class ApiError extends Error {
    status: number;
    code?: string;

    constructor(message: string, status: number, code?: string) {
        super(message);
        this.name = "ApiError";
        this.status = status;
        this.code = code;
    }
}