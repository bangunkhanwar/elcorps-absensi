// src/utils/selectConfig.ts (Simplified Version)
export interface SelectOption {
  value: string;
  label: string;
}

// Options untuk berbagai dropdown
export const jabatanOptions: SelectOption[] = [
  { value: 'Director', label: 'Director' },
  { value: 'Manager', label: 'Manager' },
  { value: 'Supervisor', label: 'Supervisor' },
  { value: 'Team Leader', label: 'Team Leader' },
  { value: 'Senior Staff', label: 'Senior Staff' },
  { value: 'Staff', label: 'Staff' },
  { value: 'Intern', label: 'Intern' },
];

export const departemenOptions: SelectOption[] = [
  { value: 'Executive', label: 'Executive' },
  { value: 'HR & GA', label: 'HR & GA' },
  { value: 'Finance & Accounting', label: 'Finance & Accounting' },
  { value: 'IT & Technology', label: 'IT & Technology' },
  { value: 'Marketing', label: 'Marketing' },
  { value: 'Sales', label: 'Sales' },
  { value: 'Operations', label: 'Operations' },
  { value: 'Production', label: 'Production' },
  { value: 'Quality Control', label: 'Quality Control' },
  { value: 'Research & Development', label: 'Research & Development' },
];

export const unitKerjaOptions: SelectOption[] = [
  { value: 'Head Office - Jakarta', label: 'Head Office - Jakarta' },
  { value: 'Branch Office - Bandung', label: 'Branch Office - Bandung' },
  { value: 'Branch Office - Surabaya', label: 'Branch Office - Surabaya' },
  { value: 'Production Site - Cikarang', label: 'Production Site - Cikarang' },
  { value: 'Remote Worker', label: 'Remote Worker' },
  { value: 'Branch Office - Medan', label: 'Branch Office - Medan' },
  { value: 'Branch Office - Makassar', label: 'Branch Office - Makassar' },
];

export const roleOptions: SelectOption[] = [
  { value: 'karyawan', label: 'Karyawan - Akses Mobile App' },
  { value: 'hr', label: 'HR/Admin - Akses Website & Mobile' },
  { value: 'manager', label: 'Manager - Akses Website & Mobile' },
  { value: 'supervisor', label: 'Supervisor - Akses Website & Mobile' },
];

// Custom styles untuk react-select (simplified tanpa Types)
export const customStyles = {
  control: (base: any) => ({
    ...base,
    padding: '4px 8px',
    borderRadius: '12px',
    border: '1px solid #d1d5db',
    fontSize: '0.875rem',
    minHeight: '48px',
    boxShadow: 'none',
  }),
  option: (base: any, state: any) => ({
    ...base,
    fontSize: '0.875rem',
    padding: '8px 12px',
    backgroundColor: state.isSelected ? '#3b82f6' : state.isFocused ? '#f3f4f6' : 'white',
    color: state.isSelected ? 'white' : '#374151',
  }),
  menu: (base: any) => ({
    ...base,
    borderRadius: '12px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    zIndex: 9999,
  }),
};