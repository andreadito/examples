import type { ColDef } from '../types';

// ─── Column Definitions ──────────────────────────────────────────────────────

export const employeeColDefs: ColDef[] = [
  { field: 'name', headerName: 'Name', width: 160, cellStyle: { fontWeight: 600 } },
  { field: 'department', headerName: 'Department', width: 130 },
  { field: 'title', headerName: 'Title', width: 180 },
  {
    field: 'email',
    headerName: 'Email',
    width: 220,
    cellRenderer: ({ value }) => (
      <a href={`mailto:${value}`} style={{ color: '#2563eb', textDecoration: 'none' }}>{String(value)}</a>
    ),
  },
  { field: 'phone', headerName: 'Phone', width: 130 },
  {
    field: 'hireDate',
    headerName: 'Hire Date',
    width: 110,
    valueFormatter: ({ value }) =>
      new Date(value as string).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
  },
  { field: 'location', headerName: 'Location', width: 120 },
];

// ─── Row Data ────────────────────────────────────────────────────────────────

export const employeeData: Record<string, unknown>[] = [
  { name: 'Sarah Chen', department: 'Engineering', title: 'Senior Software Engineer', email: 'sarah.chen@company.com', phone: '+1 (555) 234-5678', hireDate: '2021-03-15', location: 'New York' },
  { name: 'James Wilson', department: 'Product', title: 'Product Manager', email: 'james.wilson@company.com', phone: '+1 (555) 345-6789', hireDate: '2020-08-01', location: 'San Francisco' },
  { name: 'Maria Garcia', department: 'Engineering', title: 'Staff Engineer', email: 'maria.garcia@company.com', phone: '+1 (555) 456-7890', hireDate: '2019-01-10', location: 'London' },
  { name: 'David Kim', department: 'Design', title: 'UX Designer', email: 'david.kim@company.com', phone: '+1 (555) 567-8901', hireDate: '2022-05-20', location: 'New York' },
  { name: 'Emily Johnson', department: 'Finance', title: 'Financial Analyst', email: 'emily.johnson@company.com', phone: '+1 (555) 678-9012', hireDate: '2023-02-14', location: 'Chicago' },
  { name: 'Michael Brown', department: 'Engineering', title: 'DevOps Engineer', email: 'michael.brown@company.com', phone: '+1 (555) 789-0123', hireDate: '2021-11-08', location: 'San Francisco' },
  { name: 'Ana Petrova', department: 'Marketing', title: 'Marketing Director', email: 'ana.petrova@company.com', phone: '+1 (555) 890-1234', hireDate: '2018-06-25', location: 'London' },
  { name: 'Robert Taylor', department: 'Engineering', title: 'Backend Engineer', email: 'robert.taylor@company.com', phone: '+1 (555) 901-2345', hireDate: '2022-09-12', location: 'New York' },
];
