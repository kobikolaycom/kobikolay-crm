const { PrismaClient } = require('@prisma/client');

// Read existing DATABASE_URL from process.env (automatically loaded from .env if we run with dotenv,
// or we can manually load/modify it here)
let url = process.env.DATABASE_URL;
if (!url) {
  const fs = require('fs');
  const path = require('path');
  const envContent = fs.readFileSync(path.join(__dirname, '../.env'), 'utf8');
  const match = envContent.match(/DATABASE_URL="([^"]+)"/);
  if (match) {
    url = match[1];
  }
}

if (url) {
  // Replace localhost with 127.0.0.1
  const modifiedUrl = url.replace('localhost', '127.0.0.1');
  console.log('Trying with modified URL:', modifiedUrl);
  process.env.DATABASE_URL = modifiedUrl;
}

const prisma = new PrismaClient();

async function main() {
  const count = await prisma.activity.count();
  console.log('Connection successful! Total activities:', count);
}

main()
  .catch(err => {
    console.error('Connection failed with error:', err);
  })
  .finally(() => prisma.$disconnect());
