const { z } = require('zod');

const loginSchema = z.object({
  email: z.string().email('Format email tidak valid'),
  password: z.string().min(6, 'Password minimal 6 karakter'),
  login_type: z.enum(['website', 'mobile']).optional(),
});

const registerSchema = z.object({
  nama: z.string().min(3, 'Nama minimal 3 karakter'),
  nik: z.string().min(5, 'NIK minimal 5 karakter'),
  email: z.string().email('Format email tidak valid'),
  password: z.string().min(6, 'Password minimal 6 karakter'),
  role: z.enum(['hr', 'karyawan']).default('karyawan'),
  unit_kerja_id: z.number().optional(),
  shift_id: z.number().optional(),
});

module.exports = {
  loginSchema,
  registerSchema,
};
