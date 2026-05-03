import { incrementCounter, getRetryAfter } from '../src/modules/enforcement/counter.store.js';

const now = Math.floor(Date.now() / 1000);
const results = [];
for (let index = 0; index < 6; index += 1) {
  // eslint-disable-next-line no-await-in-loop
  results.push(await incrementCounter({
    ruleId: 'auth:login',
    identifier: '127.0.0.1',
    windowSeconds: 60,
    limitCount: 5,
    now,
  }));
}

const retryAfter = await getRetryAfter({
  ruleId: 'auth:login',
  identifier: '127.0.0.1',
  windowSeconds: 60,
  now,
});

console.log(JSON.stringify({ results, retryAfter }, null, 2));
