import { APIError, DecodeError, safeAddress } from '../../core/errors';

export function undeclaredBody(response: Response, value: unknown): DecodeError {
  const where = response.url ? ` for "${safeAddress(response.url)}"` : '';
  const contentType = response.headers.get('content-type');
  const said = contentType ? ` Its content type said "${contentType}".` : '';
  const got =
    value === null || value === undefined
      ? 'no JSON object or list, where the API description declares one.'
      : `a body that is not the JSON object or list the API description declares.${said}`;
  return new DecodeError(`The API answered ${response.status}${where} with ${got}`, {
    response,
    value,
  });
}

export function unreadableBody(response: Response, cause: unknown): DecodeError {
  const where = response.url ? ` for "${safeAddress(response.url)}"` : '';
  const contentType = response.headers.get('content-type');
  const said = contentType ? ` Its content type said "${contentType}".` : '';
  return new DecodeError(
    `The API answered ${response.status}${where} with a body this client could not read.${said}`,
    { cause, response },
  );
}

/** The API could not read the request, so it did not act on it. */
export class BadRequestError extends APIError {
  override readonly name = 'BadRequestError';
  declare readonly status: 400;
}

/** No usable credential reached the API: it was missing, unreadable, or rejected. */
export class AuthenticationError extends APIError {
  override readonly name = 'AuthenticationError';
  declare readonly status: 401;
}

/** The plan or the quota on this account does not cover the call. */
export class PaymentRequiredError extends APIError {
  override readonly name = 'PaymentRequiredError';
  declare readonly status: 402;
}

/** The credential was accepted, but it does not grant this call. */
export class PermissionDeniedError extends APIError {
  override readonly name = 'PermissionDeniedError';
  declare readonly status: 403;
}

/** Nothing is at this address, or the credential may not see what is. */
export class NotFoundError extends APIError {
  override readonly name = 'NotFoundError';
  declare readonly status: 404;
}

/** The call collided with the resource's current state: a duplicate, or a concurrent change. */
export class ConflictError extends APIError {
  override readonly name = 'ConflictError';
  declare readonly status: 409;
}

/** The request was read, and its contents were rejected. */
export class UnprocessableEntityError extends APIError {
  override readonly name = 'UnprocessableEntityError';
  declare readonly status: 422;
}

/** Too many calls. {@link APIError.retryAfterMs} carries how long the API asked to wait. */
export class RateLimitError extends APIError {
  override readonly name = 'RateLimitError';
  declare readonly status: 429;
}

export type APIErrorClass = new (
  status: number,
  body: unknown,
  response: Response,
  note?: string,
) => APIError;

const BY_STATUS: Readonly<Record<number, APIErrorClass>> = {
  400: BadRequestError,
  401: AuthenticationError,
  402: PaymentRequiredError,
  403: PermissionDeniedError,
  404: NotFoundError,
  409: ConflictError,
  422: UnprocessableEntityError,
  429: RateLimitError,
};

/** The API failed after accepting the call. Every status from 500 up arrives as this. */
export class InternalServerError extends APIError {
  override readonly name = 'InternalServerError';
}

export function toAPIError(
  status: number,
  error: unknown,
  response: Response,
  unauthenticated?: () => string,
): APIError {
  const Failure = BY_STATUS[status] ?? (status >= 500 ? InternalServerError : APIError);
  const note = status === 401 || status === 403 ? unauthenticated?.() : undefined;
  return new Failure(status, error, response, note);
}
