const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const schemaPath = path.join(__dirname, '..', 'prisma', 'schema.prisma');
let schema = fs.readFileSync(schemaPath, 'utf8');

// Determine database provider
// Vercel serverless requires persistent external PostgreSQL (Neon, Supabase, Railway, RDS)
const dbUrl = process.env.DATABASE_URL || '';
const isPostgres =
  dbUrl.startsWith('postgres://') ||
  dbUrl.startsWith('postgresql://') ||
  (process.env.VERCEL === '1' && !dbUrl.startsWith('file:'));

const targetProvider = isPostgres ? 'postgresql' : 'sqlite';

// Match only inside datasource db { ... }
const datasourceMatch = schema.match(/datasource\s+db\s*\{([\s\S]*?)\}/);

if (datasourceMatch) {
  const datasourceBlock = datasourceMatch[1];
  const providerMatch = datasourceBlock.match(/provider\s*=\s*"([^"]+)"/);
  const currentProvider = providerMatch ? providerMatch[1] : '';

  console.log(`[Prisma Prep] Current datasource provider: "${currentProvider}", target: "${targetProvider}"`);

  if (currentProvider && currentProvider !== targetProvider) {
    console.log(`[Prisma Prep] Updating datasource db provider to "${targetProvider}"`);
    const updatedBlock = datasourceBlock.replace(
      /provider\s*=\s*"[^"]+"/,
      `provider = "${targetProvider}"`
    );
    schema = schema.replace(datasourceMatch[0], `datasource db {${updatedBlock}}`);
    fs.writeFileSync(schemaPath, schema, 'utf8');
  }
}

// Generate Prisma client
try {
  console.log('[Prisma Prep] Generating Prisma Client...');
  execSync('npx prisma generate', { stdio: 'inherit' });
  console.log('[Prisma Prep] Prisma Client generated successfully.');
} catch (err) {
  console.error('[Prisma Prep] Failed to generate Prisma Client:', err.message);
  process.exit(1);
}
