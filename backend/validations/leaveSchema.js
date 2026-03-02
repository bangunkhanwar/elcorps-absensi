const { z } = require('zod');

const applyLeaveSchema = z.object({
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD'),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD'),
  jenis_izin: z.string().min(1, 'Jenis izin harus diisi'),
  keterangan: z.string().min(5, 'Keterangan minimal 5 karakter'),
  lampiran: z.string().nullable().optional(),
});

const updateStatusSchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected'], {
    errorMap: () => ({ message: 'Status harus pending, approved, atau rejected' })
  }),
});

module.exports = {
  applyLeaveSchema,
  updateStatusSchema,
};
