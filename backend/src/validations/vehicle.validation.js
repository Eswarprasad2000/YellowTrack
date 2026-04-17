const { z } = require('zod');

const onboardVehicleSchema = z.object({
  registrationNumber: z
    .string()
    .min(4, 'Registration number must be at least 4 characters')
    .max(15, 'Registration number must be at most 15 characters')
    .transform((val) => val.toUpperCase().replace(/\s/g, '')),
  groupId: z.string().min(1, 'Vehicle group is required'),
});

const getVehiclesQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  search: z.string().optional(),
  status: z.enum(['GREEN', 'YELLOW', 'RED']).optional(),
  groupId: z.string().optional(),
});

const manualOnboardSchema = z.object({
  registrationNumber: z
    .string()
    .min(4, 'Registration number must be at least 4 characters')
    .max(15, 'Registration number must be at most 15 characters')
    .transform((val) => val.toUpperCase().replace(/\s/g, '')),
  ownerName: z.string().optional().nullable(),
  make: z.string().min(1, 'Make is required'),
  model: z.string().min(1, 'Model is required'),
  fuelType: z.string().min(1, 'Fuel type is required'),
  chassisNumber: z.string().optional().nullable(),
  engineNumber: z.string().optional().nullable(),
  gvw: z.coerce.number().int().optional().nullable(),
  seatingCapacity: z.coerce.number().int().optional().nullable(),
  permitType: z.string().optional().nullable(),
  groupId: z.string().min(1, 'Vehicle group is required'),
}).passthrough(); // Allow dynamic doc expiry fields (e.g. rcExpiry, route_permitExpiry)

module.exports = { onboardVehicleSchema, manualOnboardSchema, getVehiclesQuerySchema };
