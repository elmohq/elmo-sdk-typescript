import type { ClientOptions } from '../../client';
import type { Client } from '../../internal/core/client';
import { clientFor, withClient } from '../../internal/core/client';

export class ElmoResource {
  /** The client every call on this SDK dispatches through. */
  readonly client: Client;

  constructor(client: Client) {
    this.client = client;
  }

  /**
   * The same calls, with different options.
   *
   * Options given here layer over the ones already in force. Headers, path
   * parameters and query parameters merge per name. Everything else replaces.
   * What this was called on does not change.
   */
  public withOptions(options: ClientOptions): this {
    return withClient(this, clientFor(options, this.client));
  }
}
