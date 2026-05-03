import 'dotenv/config';
import jwt from 'jsonwebtoken';
import { db } from '../src/db/index.js';
import { createApiKey } from '../src/modules/api-keys/apiKeys.service.js';

const baseUrl = 'http://127.0.0.1:4000';
const userId = '930f8b1b-029b-4285-aecf-63b5b8335d60';
const endpoint = '/api/pdf-to-txt';
const identifier = '10.0.0.45';

const keyResult = await createApiKey(userId, { name: 'smart-mode-http-test', environment: 'production' });
const apiKey = keyResult.apiKey;
const apiKeyId = keyResult.meta.id;

async function postCheck(body, key = apiKey) {
  const res = await fetch(baseUrl + '/v1/check', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': key,
    },
    body: JSON.stringify(body),
  });

  let json = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }

  return {
    status: res.status,
    retryAfter: res.headers.get('retry-after'),
    body: json,
  };
}

const burst = [];
for (let index = 0; index < 6; index += 1) {
  // eslint-disable-next-line no-await-in-loop
  burst.push(await postCheck({ identifier, endpoint, method: 'POST', smartMode: true }));
}

const token = jwt.sign({ userId }, process.env.JWT_SECRET || 'supersecretdevkey', { expiresIn: '1h' });
async function get(path) {
  const res = await fetch(baseUrl + path, {
    headers: { authorization: `Bearer ${token}` },
  });
  let json = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }
  return { status: res.status, body: json };
}

const overview = await get('/analytics/overview');
const endpoints = await get('/analytics/endpoints?limit=5');
const apiKeys = await get('/analytics/apikeys?limit=5');

console.log(JSON.stringify({ apiKeyId, apiKey, burst, overview, endpoints, apiKeys }, null, 2));
