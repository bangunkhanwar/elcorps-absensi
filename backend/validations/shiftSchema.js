const { z } = require('zod');

const createShiftSchema = z.object({
  unit_kerja_id: z.number({ required_error: 'Unit kerja ID harus diisi' }),
  kode_shift: z.string().min(1, 'Kode shift harus diisi'),
  nama_shift: z.string().min(1, 'Nama shift harus diisi'),
  jam_masuk: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)(:([0-5]\d))?$/, 'Format jam masuk harus HH:mm atau HH:mm:ss'),
  jam_keluar: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)(:([0-5]\d))?$/, 'Format jam keluar harus HH:mm atau HH:mm:ss'),
  toleransi_telat_minutes: z.number().int().min(0).optional().default(5),
  is_default: z.boolean().optional().default(false),
});

const updateShiftSchema = createShiftSchema.partial();

module.exports = {
  createShiftSchema,
  updateShiftSchema,
};
