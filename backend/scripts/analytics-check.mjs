import 'dotenv/config';
import jwt from 'jsonwebtoken';

const baseUrl = process.env.BACKEND_URL || 'https://rateguard-7b9988e4d5f5.herokuapp.com';
const secret = process.env.JWT_SECRET || 'supersecretdevkey';
const token = jwt.sign({ userId: '930f8b1b-029b-4285-aecf-63b5b8335d60' }, secret, { expiresIn: '1h' });

async function get(path) {
  const res = await fetch(baseUrl + path, {
    headers: { authorization: 'Bearer ' + token },
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

console.log(JSON.stringify({ overview, endpoints, apiKeys }, null, 2));
