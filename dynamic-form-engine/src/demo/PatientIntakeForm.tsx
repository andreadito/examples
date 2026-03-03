import type { FormSchema, LogEntry } from '../types';
import { mockPatientIntakeSubmit } from './mockApi';
import { DynamicForm } from '../engine/DynamicForm';

// ─── Schema (100% JSON-serializable — could come from a DB) ─────────────────
// This demonstrates the form engine outside of finance — a medical patient intake.

const patientIntakeSchema: FormSchema = {
  id: 'patient-intake',
  title: 'Patient Intake Form',
  description: 'New patient registration. All information is kept strictly confidential.',
  density: 'comfortable',
  sections: [
    {
      id: 'personal-info',
      title: 'Personal Information',
      fields: [
        {
          name: 'firstName',
          label: 'First Name',
          type: 'text',
          validation: {
            required: 'First name is required',
            minLength: { value: 2, message: 'At least 2 characters' },
          },
          gridSize: { xs: 12, sm: 6, md: 4 },
        },
        {
          name: 'lastName',
          label: 'Last Name',
          type: 'text',
          validation: {
            required: 'Last name is required',
            minLength: { value: 2, message: 'At least 2 characters' },
          },
          gridSize: { xs: 12, sm: 6, md: 4 },
        },
        {
          name: 'dateOfBirth',
          label: 'Date of Birth',
          type: 'date',
          validation: { required: 'Date of birth is required' },
          gridSize: { xs: 12, sm: 6, md: 4 },
        },
        {
          name: 'gender',
          label: 'Gender',
          type: 'select',
          validation: { required: 'Please select' },
          options: [
            { value: 'male', label: 'Male' },
            { value: 'female', label: 'Female' },
            { value: 'non-binary', label: 'Non-binary' },
            { value: 'prefer-not', label: 'Prefer not to say' },
          ],
          gridSize: { xs: 12, sm: 6, md: 4 },
        },
        {
          name: 'email',
          label: 'Email Address',
          type: 'text',
          placeholder: 'patient@email.com',
          validation: {
            required: 'Email is required',
            pattern: {
              value: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$',
              message: 'Invalid email address',
            },
          },
          gridSize: { xs: 12, sm: 6, md: 4 },
        },
        {
          name: 'phone',
          label: 'Phone Number',
          type: 'text',
          placeholder: '+1 (555) 000-0000',
          validation: {
            required: 'Phone number is required',
            pattern: {
              value: '^[\\+]?[\\d\\s\\-\\(\\)]{7,20}$',
              message: 'Invalid phone number',
            },
          },
          gridSize: { xs: 12, sm: 6, md: 4 },
        },
      ],
    },
    {
      id: 'address',
      title: 'Address',
      fields: [
        {
          name: 'street',
          label: 'Street Address',
          type: 'text',
          validation: { required: 'Street address is required' },
          gridSize: { xs: 12, sm: 6 },
        },
        {
          name: 'city',
          label: 'City',
          type: 'text',
          validation: { required: 'City is required' },
          gridSize: { xs: 12, sm: 6, md: 3 },
        },
        {
          name: 'state',
          label: 'State / Province',
          type: 'text',
          gridSize: { xs: 12, sm: 6, md: 3 },
        },
        {
          name: 'zip',
          label: 'ZIP / Postal Code',
          type: 'text',
          validation: {
            required: 'ZIP code is required',
            pattern: {
              value: '^[A-Za-z0-9\\s\\-]{3,10}$',
              message: 'Invalid postal code',
            },
          },
          gridSize: { xs: 12, sm: 6, md: 3 },
        },
        {
          name: 'country',
          label: 'Country',
          type: 'select',
          defaultValue: 'US',
          options: [
            { value: 'US', label: 'United States' },
            { value: 'CA', label: 'Canada' },
            { value: 'UK', label: 'United Kingdom' },
            { value: 'AU', label: 'Australia' },
            { value: 'DE', label: 'Germany' },
            { value: 'FR', label: 'France' },
            { value: 'JP', label: 'Japan' },
          ],
          gridSize: { xs: 12, sm: 6, md: 3 },
        },
      ],
    },
    {
      id: 'insurance',
      title: 'Insurance Information',
      collapsible: true,
      defaultExpanded: true,
      fields: [
        {
          name: 'hasInsurance',
          label: 'I have health insurance',
          type: 'checkbox',
          defaultValue: false,
          gridSize: { xs: 12 },
        },
        {
          name: 'insuranceProvider',
          label: 'Insurance Provider',
          type: 'select',
          options: [
            { value: 'aetna', label: 'Aetna' },
            { value: 'bluecross', label: 'Blue Cross Blue Shield' },
            { value: 'cigna', label: 'Cigna' },
            { value: 'humana', label: 'Humana' },
            { value: 'kaiser', label: 'Kaiser Permanente' },
            { value: 'united', label: 'UnitedHealthcare' },
            { value: 'other', label: 'Other' },
          ],
          visible: { field: 'hasInsurance', operator: 'equals', value: true },
          validation: {
            required: 'Insurance provider is required',
            requiredIf: { field: 'hasInsurance', operator: 'equals', value: true },
          },
          gridSize: { xs: 12, sm: 6 },
        },
        {
          name: 'memberId',
          label: 'Member ID',
          type: 'text',
          placeholder: 'Insurance member/policy number',
          visible: { field: 'hasInsurance', operator: 'equals', value: true },
          validation: {
            required: 'Member ID is required',
            requiredIf: { field: 'hasInsurance', operator: 'equals', value: true },
          },
          gridSize: { xs: 12, sm: 6 },
        },
        {
          name: 'groupNumber',
          label: 'Group Number',
          type: 'text',
          visible: { field: 'hasInsurance', operator: 'equals', value: true },
          gridSize: { xs: 12, sm: 6 },
        },
      ],
    },
    {
      id: 'medical-history',
      title: 'Medical History',
      collapsible: true,
      defaultExpanded: true,
      fields: [
        {
          name: 'allergies',
          label: 'Known Allergies',
          type: 'textarea',
          placeholder: 'List any known allergies (medications, food, environmental)...',
          rows: 2,
          gridSize: { xs: 12, sm: 6 },
        },
        {
          name: 'medications',
          label: 'Current Medications',
          type: 'textarea',
          placeholder: 'List current medications and dosages...',
          rows: 2,
          gridSize: { xs: 12, sm: 6 },
        },
        {
          name: 'conditions',
          label: 'Existing Conditions',
          type: 'textarea',
          placeholder: 'List any pre-existing medical conditions...',
          rows: 2,
          gridSize: { xs: 12 },
        },
      ],
    },
    {
      id: 'appointment',
      title: 'Appointment',
      fields: [
        {
          name: 'appointmentDate',
          label: 'Preferred Date',
          type: 'date',
          validation: {
            required: 'Appointment date is required',
            rules: [{ type: 'futureDate' }],
          },
          gridSize: { xs: 12, sm: 6, md: 4 },
        },
        {
          name: 'preferredTime',
          label: 'Preferred Time',
          type: 'select',
          options: [
            { value: 'morning', label: 'Morning (8am - 12pm)' },
            { value: 'afternoon', label: 'Afternoon (12pm - 5pm)' },
            { value: 'evening', label: 'Evening (5pm - 8pm)' },
          ],
          gridSize: { xs: 12, sm: 6, md: 4 },
        },
        {
          name: 'visitReason',
          label: 'Reason for Visit',
          type: 'select',
          validation: { required: 'Please select a reason' },
          options: [
            { value: 'new-patient', label: 'New Patient Checkup' },
            { value: 'follow-up', label: 'Follow-up Visit' },
            { value: 'specialist', label: 'Specialist Referral' },
            { value: 'urgent', label: 'Urgent Care' },
            { value: 'other', label: 'Other' },
          ],
          gridSize: { xs: 12, sm: 6, md: 4 },
        },
        {
          name: 'additionalNotes',
          label: 'Additional Notes',
          type: 'textarea',
          placeholder: 'Anything else we should know before your visit...',
          rows: 3,
          gridSize: { xs: 12 },
        },
      ],
    },
  ],
  submission: {
    url: '/api/patients/intake',
    method: 'POST',
  },
  confirmBeforeSubmit: true,
  confirmMessage: 'Submit your registration? We will confirm your appointment via email.',
  resetOnSuccess: true,
};

// ─── Component ───────────────────────────────────────────────────────────────

export function PatientIntakeDemo({ onLog }: { onLog?: (entry: LogEntry) => void }) {
  return (
    <DynamicForm
      schema={patientIntakeSchema}
      onLog={onLog}
      submitHandler={mockPatientIntakeSubmit}
      onSuccess={(response) => {
        console.log('Patient registered:', response);
      }}
      onError={(error) => {
        console.error('Registration failed:', error.message);
      }}
    />
  );
}
