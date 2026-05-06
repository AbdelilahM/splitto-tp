import { describe, it, expect } from 'vitest';
import { PactV3, Matchers } from '@pact-foundation/pact';
import { join } from 'node:path';

const { like, eachLike } = Matchers;

describe('Balances API Pact consumer', () => {
  const provider = new PactV3({
    consumer: 'splitto-frontend',
    provider: 'splitto-api',
    dir: join(process.cwd(), 'pacts'),
    logLevel: 'warn',
  });

  it('should get balances for an existing group', async () => {
    provider
      .given('group-1 a 3 membres et 2 dépenses')
      .uponReceiving('a request for balances of group-1')
      .withRequest({
        method: 'GET',
        path: '/api/groups/group-1/balances',
      })
      .willRespondWith({
        status: 200,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: {
          groupId: like('group-1'),
          balances: like({ alice: 10, bob: -10 }),
          settlements: eachLike({
            from: like('bob'),
            to: like('alice'),
            amount: like(10),
          }),
        },
      });

    await provider.executeTest(async mockServer => {
      const response = await fetch(`${mockServer.url}/api/groups/group-1/balances`);
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.groupId).toBe('group-1');
      expect(body.balances).toHaveProperty('alice');
      expect(Array.isArray(body.settlements)).toBe(true);
    });
  });

  it('should return 404 for a missing group', async () => {
    provider
      .given('aucun groupe inexistant')
      .uponReceiving('a request for balances for a missing group')
      .withRequest({
        method: 'GET',
        path: '/api/groups/inexistant/balances',
      })
      .willRespondWith({
        status: 404,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: {
          error: like('Group not found'),
        },
      });

    await provider.executeTest(async mockServer => {
      const response = await fetch(`${mockServer.url}/api/groups/inexistant/balances`);
      expect(response.status).toBe(404);
      const body = await response.json();
      expect(body).toHaveProperty('error');
    });
  });
});