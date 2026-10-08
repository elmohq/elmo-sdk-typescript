import type { Error } from './error';

/** Resource already exists */
export type ConflictError = Error;

/** The organization has no active subscription. Cloud deployments only. */
export type PaymentRequiredError = Error;
