/**
 * Test script to verify email sending works
 */
import dotenv from 'dotenv';
import { sendEmail, emailTemplates } from './src/utils/email.js';

// Load environment variables
dotenv.config();

async function testEmail() {
  console.log('🧪 Testing Email Configuration...\n');
  
  // Show configuration
  console.log('Environment Variables:');
  console.log(`  EMAIL_PROVIDER: ${process.env.EMAIL_PROVIDER}`);
  console.log(`  SMTP_HOST: ${process.env.SMTP_HOST}`);
  console.log(`  SMTP_PORT: ${process.env.SMTP_PORT}`);
  console.log(`  SMTP_USER: ${process.env.SMTP_USER}`);
  console.log(`  SMTP_PASS: ${process.env.SMTP_PASS ? '***' + process.env.SMTP_PASS.slice(-4) : 'MISSING'}`);
  console.log(`  FROM_EMAIL: ${process.env.FROM_EMAIL}\n`);

  try {
    // Generate a test OTP
    const testOTP = '123456';
    const testEmail = 'test@example.com';
    
    console.log(`📤 Sending test OTP email to ${testEmail}...`);
    
    // Use the password reset template
    const template = emailTemplates.passwordReset(testOTP);
    
    // Send the email
    const result = await sendEmail(testEmail, template.subject, template.html, template.text);
    
    console.log('\n✅ Email sent successfully!');
    console.log('Result:', JSON.stringify(result, null, 2));
    
    if (result.previewUrl) {
      console.log(`\n📬 View email at: ${result.previewUrl}`);
    }
    
  } catch (error) {
    console.error('\n❌ Email sending failed:');
    console.error(error);
    process.exit(1);
  }
}

// Run the test
testEmail();
