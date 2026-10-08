import type { BaseURL, BehaviorOptions, ClientCredentials } from '../../client';
import type { Client } from '../../internal/core/client';
import type {
  AuthValue,
  BodySerializerOptions,
  ConnectionOptions,
  MetadataOptions,
  PageOptions,
  SignalOptions,
} from '../../internal/core/types';

/** What one call may set for itself, overriding the client it goes through. */
export type RequestOptions = BehaviorOptions &
  BodySerializerOptions &
  ClientCredentials &
  ConnectionOptions<BaseURL, AuthValue, never> &
  MetadataOptions &
  PageOptions &
  SignalOptions & {
    /**
     * The client that sends this call, in place of the one this SDK uses.
     *
     * Build one with `createElmoClient`.
     */
    client?: Client;
  };
