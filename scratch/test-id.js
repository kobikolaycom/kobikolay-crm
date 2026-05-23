const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.agency.findFirst({ select: { id: true, companyName: true } })
  .then(r => { console.log(JSON.stringify(r)); return p.$disconnect(); })
  .catch(e => { console.error(e); p.$disconnect(); });
