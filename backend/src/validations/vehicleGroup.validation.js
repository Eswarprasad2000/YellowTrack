const { z } = require('zod');

const createGroupSchema = z.object({
  name: z.string().min(1, 'Group name is required').max(50),
  icon: z.string().min(1, 'Icon is required'),
  color: z.string().optional(),
  order: z.coerce.number().int().optional(),
  tyreCount: z.coerce.number().int().min(4, 'Minimum 4 tyres (4+ wheelers only)').max(20).optional(),
  requiredDocTypeIds: z.array(z.string()).optional(),
});

const updateGroupSchema = createGroupSchema.partial();

module.exports = { createGroupSchema, updateGroupSchema };
