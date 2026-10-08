import { Elmo } from '@elmohq/sdk';
import { it } from 'vitest';

it('runs the README usage example', async () => {
  const elmo = new Elmo();
  const data = await elmo.brands.list();
  console.log(data);
});
