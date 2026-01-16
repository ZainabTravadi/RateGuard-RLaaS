/**
 * Simple diagnostic script to check environment variables
 */
import 'dotenv/config';

console.log('\n🔍 Environment Variables Diagnostic\n');
console.log('='.repeat(50));

const envVars = [
  'PORT',
  'DATABASE_URL',
  'JWT_SECRET',
  'REDIS_URL',
  'EMAIL_PROVIDER',
  'FROM_EMAIL',
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_USER',
  'SMTP_PASS',
  'RECEIVE_EMAIL'
];

envVars.forEach(key => {
  const value = process.env[key];
  if (key.includes('PASS') || key.includes('SECRET') || key.includes('DATABASE_URL') || key.includes('REDIS_URL')) {
    // Hide sensitive values
    console.log(`${key.padEnd(20)}: ${value ? `***${value.slice(-4)}` : '❌ MISSING'}`);
  } else {
    console.log(`${key.padEnd(20)}: ${value || '❌ MISSING'}`);
  }
});

console.log('='.repeat(50));
console.log('\n✅ Diagnostic complete\n');
