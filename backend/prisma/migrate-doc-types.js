/**
 * One-time migration script to add system document types
 * and link them to all existing vehicle groups.
 * Safe to run multiple times (idempotent).
 *
 * Usage: node prisma/migrate-doc-types.js
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const SYSTEM_DOC_TYPES = [
  { code: 'RC', name: 'Registration Certificate', hasExpiry: true, isSystem: true },
  { code: 'INSURANCE', name: 'Insurance Policy', hasExpiry: true, isSystem: true },
  { code: 'PERMIT', name: 'Permit', hasExpiry: true, isSystem: true },
  { code: 'PUCC', name: 'Pollution Certificate', hasExpiry: true, isSystem: true },
  { code: 'FITNESS', name: 'Fitness Certificate', hasExpiry: true, isSystem: true },
  { code: 'TAX', name: 'Road Tax', hasExpiry: true, isSystem: true },
];

async function main() {
  console.log('🔄 Migrating document types...\n');

  // Upsert system doc types
  const docTypes = [];
  for (const dt of SYSTEM_DOC_TYPES) {
    const existing = await prisma.documentType.findUnique({ where: { code: dt.code } });
    if (existing) {
      docTypes.push(existing);
      console.log(`  ⏭️  ${dt.code} already exists`);
    } else {
      const created = await prisma.documentType.create({ data: dt });
      docTypes.push(created);
      console.log(`  ✅ ${dt.code} created`);
    }
  }

  // Link all system doc types to every existing group
  const groups = await prisma.vehicleGroup.findMany();
  for (const group of groups) {
    for (const dt of docTypes) {
      const exists = await prisma.groupDocumentType.findUnique({
        where: { groupId_documentTypeId: { groupId: group.id, documentTypeId: dt.id } },
      });
      if (!exists) {
        await prisma.groupDocumentType.create({
          data: { groupId: group.id, documentTypeId: dt.id },
        });
        console.log(`  🔗 Linked ${dt.code} → ${group.name}`);
      }
    }
  }

  console.log('\n🎉 Migration complete!');
}

main()
  .catch((e) => { console.error('Migration failed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
