import { db } from '../src/db/index.js';
import { evaluate } from '../src/modules/enforcement/rateLimit.service.js';

const userId = '930f8b1b-029b-4285-aecf-63b5b8335d60';
const identifier = '10.0.0.42';
const endpoint = '/api/pdf-to-txt';

const { rows } = await db.query(
  'select id, scope, endpoint, limit_count, window_seconds, enabled from rate_limit_rules where user_id = $1 and endpoint = $2 limit 1',
  [userId, endpoint]
);

if (!rows.length) {
  throw new Error('Rule not found');
}

const rule = rows[0];
const results = [];
for (let index = 0; index < 6; index += 1) {
  // eslint-disable-next-line no-await-in-loop
  const result = await evaluate({
    rules: [rule],
    identifier,
    endpoint,
    method: 'POST',
    apiKeyId: 'test-key',
    environmentId: 'env',
    now: Math.floor(Date.now() / 1000),
    smartMode: true,
  });
  results.push(result);
}

console.log(JSON.stringify(results, null, 2));
