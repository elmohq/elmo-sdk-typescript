import { Elmo } from '@elmohq/sdk';

/** What a project that installs the package writes first. */
export const client: Elmo = new Elmo({ apiKey: 'elmo_test' });
