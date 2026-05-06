import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import { Verifier } from '@pact-foundation/pact';
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { Pool } from 'pg';
import { createApp } from '../../src/server';
import { readFileSync } from 'fs';

const pactFile = `${process.cwd()}/pacts/splitto-frontend-splitto-api.json`;

describe('Balances API Pact provider', () => {
  let container: Awaited<ReturnType<typeof PostgreSqlContainer.prototype.start>>;
  let pool: Pool;
  let server: ReturnType<ReturnType<typeof createApp>['listen']> | null = null;
  let port = 0;

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:16-alpine')
      .withDatabase('testdb')
      .withUsername('testuser')
      .withPassword('testpass')
      .start();

    pool = new Pool({
      host: container.getHost(),
      port: container.getPort(),
      database: container.getDatabase(),
      user: container.getUsername(),
      password: container.getPassword(),
    });

    const migrationSQL = readFileSync('migrations/001-initial.sql', 'utf8');
    await pool.query(migrationSQL);

    const app = createApp(pool);
    await new Promise<void>(resolve => {
      const srv = app.listen(0, () => {
        // @ts-ignore
        port = (srv.address() as any).port;
        server = srv;
        resolve();
      });
    });
  }, 60000);

  afterAll(async () => {
    if (server) {
      server.close();
    }
    await pool.end();
    await container.stop();
  });

  it('should validate the Pact contract', async () => {
    const verifier = new Verifier({
      providerBaseUrl: `http://localhost:${port}`,
      pactUrls: [pactFile],
      stateHandlers: {
        'group-1 a 3 membres et 2 dépenses': async () => {
          await pool.query('TRUNCATE groups CASCADE');
          await pool.query(
            `INSERT INTO groups (id, name, currency) VALUES ($1, $2, $3)`,
            ['group-1', 'Groupe 1', 'EUR'],
          );
          await pool.query(
            `INSERT INTO members (id, group_id, name, email) VALUES
              ('alice', 'group-1', 'Alice', 'alice@test.com'),
              ('bob', 'group-1', 'Bob', 'bob@test.com'),
              ('charlie', 'group-1', 'Charlie', 'charlie@test.com')`,
          );
          await pool.query(
            `INSERT INTO expenses (id, group_id, description, amount, currency, paid_by, paid_at, split_mode, split_data, category, created_at)
             VALUES
             ('exp-1', 'group-1', 'Dépense 1', 20, 'EUR', 'alice', '2023-01-01T10:00:00Z', 'equal', $1, 'food', '2023-01-01T10:00:00Z'),
             ('exp-2', 'group-1', 'Dépense 2', 40, 'EUR', 'bob',   '2023-01-02T10:00:00Z', 'equal', $2, 'travel', '2023-01-02T10:00:00Z')`,
            [JSON.stringify({ mode: 'equal', beneficiaries: ['alice', 'bob', 'charlie'] }), JSON.stringify({ mode: 'equal', beneficiaries: ['alice', 'bob', 'charlie'] })],
          );
        },
        'aucun groupe inexistant': async () => {
          await pool.query('TRUNCATE groups CASCADE');
        },
      },
    });

    await verifier.verifyProvider();
  });
});