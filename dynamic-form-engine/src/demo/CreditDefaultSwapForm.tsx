import type { FormSchema, LogEntry } from '../types';
import { mockCdsSubmit, fetchCounterparties, fetchReferenceEntities, fetchCurrencies } from './mockApi';
import { DynamicForm } from '../engine/DynamicForm';
import type { OptionsProviders } from '../engine/useFieldOptions';

// ─── Schema (100% JSON-serializable — could come from a DB) ─────────────────

const cdsSchema: FormSchema = {
  id: 'credit-default-swap',
  title: 'Credit Default Swap',
  description: 'Book a single-name CDS contract. All spreads in basis points.',
  density: 'compact',
  sections: [
    {
      id: 'trade-info',
      title: 'Trade Information',
      fields: [
        {
          name: 'direction',
          label: 'Protection',
          type: 'radio',
          validation: { required: 'Select direction' },
          options: [
            { value: 'BUY', label: 'Buy Protection' },
            { value: 'SELL', label: 'Sell Protection' },
          ],
          gridSize: { xs: 12, sm: 6, md: 4 },
        },
        {
          name: 'referenceEntity',
          label: 'Reference Entity',
          type: 'autocomplete',
          optionsSource: { provider: 'referenceEntities' },
          placeholder: 'Search entity...',
          validation: { required: 'Reference entity is required' },
          gridSize: { xs: 12, sm: 6, md: 4 },
        },
        {
          name: 'counterparty',
          label: 'Counterparty',
          type: 'autocomplete',
          optionsSource: { provider: 'counterparties' },
          placeholder: 'Search counterparty...',
          validation: { required: 'Counterparty is required' },
          gridSize: { xs: 12, sm: 6, md: 4 },
        },
      ],
    },
    {
      id: 'economics',
      title: 'Economics',
      fields: [
        {
          name: 'notional',
          label: 'Notional',
          type: 'currency',
          currencySymbol: '$',
          decimalPlaces: 0,
          placeholder: '10,000,000',
          validation: {
            required: 'Notional is required',
            min: { value: 100000, message: 'Minimum notional $100,000' },
          },
          gridSize: { xs: 12, sm: 6, md: 3 },
        },
        {
          name: 'currency',
          label: 'Currency',
          type: 'select',
          defaultValue: 'USD',
          optionsSource: { provider: 'currencies' },
          gridSize: { xs: 12, sm: 6, md: 3 },
        },
        {
          name: 'spread',
          label: 'Spread (bps)',
          type: 'number',
          placeholder: 'e.g. 150',
          helperText: 'Quoted spread in basis points',
          validation: {
            required: 'Spread is required',
            min: { value: 1, message: 'Minimum 1 bp' },
            max: { value: 5000, message: 'Maximum 5000 bps' },
          },
          gridSize: { xs: 12, sm: 6, md: 3 },
        },
        {
          name: 'upfrontFee',
          label: 'Upfront Fee',
          type: 'percentage',
          helperText: 'Points upfront (if applicable)',
          gridSize: { xs: 12, sm: 6, md: 3 },
        },
      ],
    },
    {
      id: 'dates-terms',
      title: 'Dates & Terms',
      fields: [
        {
          name: 'effectiveDate',
          label: 'Effective Date',
          type: 'date',
          validation: { required: 'Effective date is required' },
          gridSize: { xs: 12, sm: 6, md: 3 },
        },
        {
          name: 'maturityDate',
          label: 'Maturity Date',
          type: 'date',
          validation: {
            required: 'Maturity date is required',
            rules: [
              {
                type: 'after',
                field: 'effectiveDate',
                message: 'Maturity must be after effective date',
              },
            ],
          },
          gridSize: { xs: 12, sm: 6, md: 3 },
        },
        {
          name: 'tenor',
          label: 'Standard Tenor',
          type: 'select',
          options: [
            { value: '1Y', label: '1 Year' },
            { value: '2Y', label: '2 Years' },
            { value: '3Y', label: '3 Years' },
            { value: '5Y', label: '5 Years' },
            { value: '7Y', label: '7 Years' },
            { value: '10Y', label: '10 Years' },
          ],
          gridSize: { xs: 12, sm: 6, md: 3 },
        },
        {
          name: 'coupon',
          label: 'Fixed Coupon',
          type: 'select',
          defaultValue: '100',
          options: [
            { value: '100', label: '100 bps' },
            { value: '500', label: '500 bps' },
          ],
          helperText: 'Standard ISDA fixed coupon',
          gridSize: { xs: 12, sm: 6, md: 3 },
        },
      ],
    },
    {
      id: 'credit-events',
      title: 'Credit Events & Documentation',
      collapsible: true,
      defaultExpanded: false,
      fields: [
        {
          name: 'docClause',
          label: 'Documentation Clause',
          type: 'select',
          defaultValue: 'CR',
          options: [
            { value: 'CR', label: 'CR - Full Restructuring' },
            { value: 'MR', label: 'MR - Modified Restructuring' },
            { value: 'MM', label: 'MM - Modified Modified' },
            { value: 'XR', label: 'XR - No Restructuring' },
          ],
          gridSize: { xs: 12, sm: 6, md: 4 },
        },
        {
          name: 'seniority',
          label: 'Seniority',
          type: 'select',
          defaultValue: 'SNRFOR',
          options: [
            { value: 'SNRFOR', label: 'Senior Unsecured' },
            { value: 'SUBLT2', label: 'Subordinated' },
            { value: 'SECDOM', label: 'Secured' },
          ],
          gridSize: { xs: 12, sm: 6, md: 4 },
        },
        {
          name: 'notes',
          label: 'Trade Notes',
          type: 'textarea',
          rows: 2,
          gridSize: { xs: 12 },
        },
      ],
    },
  ],
  submission: {
    url: '/api/credit/cds',
    method: 'POST',
  },
  confirmBeforeSubmit: true,
  confirmMessage: 'Book this CDS trade? Once confirmed, the trade will be sent to the credit desk for booking.',
};

// ─── Options Providers ───────────────────────────────────────────────────────

const cdsOptionsProviders: OptionsProviders = {
  referenceEntities: fetchReferenceEntities,
  counterparties: fetchCounterparties,
  currencies: fetchCurrencies,
};

// ─── Component ───────────────────────────────────────────────────────────────

export function CreditDefaultSwapDemo({ onLog }: { onLog?: (entry: LogEntry) => void }) {
  return (
    <DynamicForm
      schema={cdsSchema}
      optionsProviders={cdsOptionsProviders}
      onLog={onLog}
      submitHandler={mockCdsSubmit}
      onSuccess={(response) => {
        console.log('CDS booked:', response);
      }}
      onError={(error) => {
        console.error('CDS booking failed:', error.message);
      }}
    />
  );
}
