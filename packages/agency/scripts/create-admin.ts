/**
 * Script to create the admin user in the database
 * Run this once to seed the admin user
 *
 * Usage:
 *   ADMIN_EMAIL=you@example.com ADMIN_USERNAME=you ADMIN_PASSWORD=secure123 npx tsx create-admin.ts
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
	const email = process.env.ADMIN_EMAIL;
	const password = process.env.ADMIN_PASSWORD;
	const username = process.env.ADMIN_USERNAME;
	const role = 'admin';

	// Validate required environment variables
	if (!email || !password || !username) {
		console.error('Error: Missing required environment variables.\n');
		console.error('Usage:');
		console.error(
			'  ADMIN_EMAIL=you@example.com ADMIN_USERNAME=you ADMIN_PASSWORD=secure123 npx tsx create-admin.ts\n'
		);
		console.error('Required variables:');
		console.error('  ADMIN_EMAIL    - Admin user email address');
		console.error('  ADMIN_USERNAME - Admin username');
		console.error('  ADMIN_PASSWORD - Admin password (use a strong password)');
		process.exit(1);
	}

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

	console.log('Run this SQL statement in Cloudflare D1 dashboard or via wrangler:');
	console.log('  wrangler d1 execute DB_NAME --command "INSERT INTO users ..."');
}

createAdminUser();
