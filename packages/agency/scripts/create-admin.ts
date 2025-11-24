/**
 * Script to create the admin user in the database
 * Run this once to seed the admin user
 */

// Simple password hashing using Web Crypto API (matches the hash in create-user API)
async function hashPassword(password: string): Promise<string> {
	const encoder = new TextEncoder();
	const data = encoder.encode(password);
	const hashBuffer = await crypto.subtle.digest('SHA-256', data);
	const hashArray = Array.from(new Uint8Array(hashBuffer));
	return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function createAdminUser() {
	const email = 'micah@createsomething.io';
	const password = '***REMOVED***';
	const username = 'micah';
	const role = 'admin';

	console.log('Creating admin user...');
	console.log('Email:', email);
	console.log('Username:', username);
	console.log('Role:', role);

	const passwordHash = await hashPassword(password);
	const userId = crypto.randomUUID();
	const now = new Date().toISOString();

	console.log('\n=== SQL INSERT STATEMENT ===\n');
	console.log(`INSERT INTO users (id, username, email, password_hash, role, active, created_at, updated_at)
VALUES (
  '${userId}',
  '${username}',
  '${email}',
  '${passwordHash}',
  '${role}',
  1,
  '${now}',
  '${now}'
);`);
	console.log('\n=== END SQL ===\n');

	console.log('\nYou can run this SQL statement directly in Cloudflare D1 or use the API:');
	console.log(`\ncurl -X POST https://your-domain.com/api/auth/create-user \\
  -H "Content-Type: application/json" \\
  -d '{
    "email": "${email}",
    "username": "${username}",
    "password": "${password}",
    "role": "${role}"
  }'`);
}

createAdminUser();
