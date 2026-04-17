const { z } = require('zod');

const optionalDate = z.preprocess(
  (val) => (val === '' || val === undefined || val === null ? undefined : val),
  z.coerce.date().optional().nullable()
);

const lifetimeFlag = z.preprocess(
  (val) => val === 'true' || val === true,
  z.boolean().default(false)
);

const uploadComplianceDocSchema = z.object({
  type: z.enum(['RC', 'INSURANCE', 'PERMIT', 'PUCC', 'FITNESS', 'TAX']),
  expiryDate: optionalDate,
  lifetime: lifetimeFlag,
});

const uploadDriverDocSchema = z.object({
  type: z.enum(['DL', 'MEDICAL', 'POLICE_VERIFICATION', 'AADHAAR', 'PAN']),
  expiryDate: optionalDate,
  lifetime: lifetimeFlag,
});

module.exports = { uploadComplianceDocSchema, uploadDriverDocSchema };
