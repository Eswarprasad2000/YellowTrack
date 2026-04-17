const prisma = require('../config/prisma');

const findAll = async () => {
  return prisma.documentType.findMany({
    where: { isActive: true },
    orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
  });
};

const findById = async (id) => {
  return prisma.documentType.findUnique({ where: { id } });
};

const findByCode = async (code) => {
  return prisma.documentType.findUnique({ where: { code } });
};

const findByGroupId = async (groupId) => {
  const joins = await prisma.groupDocumentType.findMany({
    where: { groupId },
    include: { documentType: true },
    orderBy: { documentType: { name: 'asc' } },
  });
  return joins.map((j) => j.documentType);
};

const create = async (data) => prisma.documentType.create({ data });

const update = async (id, data) => {
  return prisma.documentType.update({ where: { id }, data });
};

const remove = async (id) => prisma.documentType.delete({ where: { id } });

const countGroupReferences = async (id) => {
  return prisma.groupDocumentType.count({ where: { documentTypeId: id } });
};

module.exports = { findAll, findById, findByCode, findByGroupId, create, update, remove, countGroupReferences };
