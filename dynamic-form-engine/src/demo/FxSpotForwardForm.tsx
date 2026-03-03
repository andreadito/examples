import type { FormSchema, LogEntry } from '../types';
import { mockFxSubmit, fetchCurrencies, fetchCounterparties } from './mockApi';
import { DynamicForm } from '../engine/DynamicForm';
import type { OptionsProviders } from '../engine/useFieldOptions';

// ─── Schema (100% JSON-serializable — could come from a DB) ─────────────────

const fxSchema: FormSchema = {
  id: 'fx-spot-forward',
  title: 'FX Spot / Forward',
  description: 'Submit an FX spot or forward trade. All rates are indicative.',
  density: 'compact',
  sections: [
    {
      id: 'deal-type',
      title: 'Deal Setup',
      fields: [
        {
          name: 'dealType',
          label: 'Deal Type',
          type: 'radio',
          validation: { required: 'Select deal type' },
          options: [
            { value: 'SPOT', label: 'Spot' },
            { value: 'FORWARD', label: 'Forward' },
            { value: 'NDF', label: 'NDF' },
          ],
          gridSize: { xs: 12, sm: 6, lg: 4 },
        },
        {
          name: 'direction',
          label: 'Direction',
          type: 'radio',
          validation: { required: 'Select buy or sell' },
          options: [
            { value: 'BUY', label: 'Buy' },
            { value: 'SELL', label: 'Sell' },
          ],
          gridSize: { xs: 12, sm: 6, lg: 4 },
        },
        {
          name: 'counterparty',
          label: 'Counterparty',
          type: 'autocomplete',
          optionsSource: { provider: 'counterparties' },
          placeholder: 'Search counterparty...',
          validation: { required: 'Counterparty is required' },
          gridSize: { xs: 12, sm: 6, lg: 4 },
        },
      ],
    },
    {
      id: 'currency-pair',
      title: 'Currency Pair',
      fields: [
        {
          name: 'baseCurrency',
          label: 'Base Currency (Buy)',
          type: 'select',
          optionsSource: { provider: 'currencies' },
          validation: { required: 'Base currency is required' },
          gridSize: { xs: 12, sm: 6, md: 3 },
        },
        {
          name: 'quoteCurrency',
          label: 'Quote Currency (Sell)',
          type: 'select',
          optionsSource: { provider: 'currencies' },
          validation: { required: 'Quote currency is required' },
          gridSize: { xs: 12, sm: 6, md: 3 },
        },
        {
          name: 'notional',
          label: 'Notional Amount',
          type: 'number',
          placeholder: '1,000,000',
          validation: {
            required: 'Notional is required',
            min: { value: 1000, message: 'Minimum 1,000' },
          },
          gridSize: { xs: 12, sm: 6, md: 3 },
        },
        {
          name: 'rate',
          label: 'Agreed Rate',
          type: 'number',
          placeholder: 'e.g. 1.0850',
          decimalPlaces: 6,
          helperText: 'Leave blank for market rate',
          gridSize: { xs: 12, sm: 6, md: 3 },
        },
      ],
    },
    {
      id: 'dates',
      title: 'Settlement',
      fields: [
        {
          name: 'tradeDate',
          label: 'Trade Date',
          type: 'date',
          validation: { required: 'Trade date is required' },
          gridSize: { xs: 12, sm: 6, md: 3 },
        },
        {
          name: 'valueDate',
          label: 'Value Date',
          type: 'date',
          validation: {
            required: 'Value date is required',
            rules: [
              {
                type: 'after',
                field: 'tradeDate',
                message: 'Value date must be after trade date',
              },
            ],
          },
          gridSize: { xs: 12, sm: 6, md: 3 },
        },
        {
          name: 'tenor',
          label: 'Tenor',
          type: 'select',
          options: [
            { value: 'ON', label: 'O/N' },
            { value: 'TN', label: 'T/N' },
            { value: 'SPOT', label: 'Spot (T+2)' },
            { value: '1W', label: '1 Week' },
            { value: '1M', label: '1 Month' },
            { value: '2M', label: '2 Months' },
            { value: '3M', label: '3 Months' },
            { value: '6M', label: '6 Months' },
            { value: '9M', label: '9 Months' },
            { value: '1Y', label: '1 Year' },
          ],
          visible: {
            field: 'dealType',
            operator: 'in',
            value: ['FORWARD', 'NDF'],
          },
          gridSize: { xs: 12, sm: 6, md: 3 },
        },
        {
          name: 'fixingSource',
          label: 'Fixing Source',
          type: 'select',
          options: [
            { value: 'WMR', label: 'WM/Reuters' },
            { value: 'ECB', label: 'ECB Reference Rate' },
            { value: 'BFIX', label: 'Bloomberg FX Fixing' },
          ],
          visible: {
            field: 'dealType',
            operator: 'equals',
            value: 'NDF',
          },
          gridSize: { xs: 12, sm: 6, md: 3 },
        },
      ],
    },
    {
      id: 'settlement-instructions',
      title: 'Settlement Instructions',
      collapsible: true,
      defaultExpanded: false,
      fields: [
        {
          name: 'settlementMethod',
          label: 'Settlement Method',
          type: 'select',
          defaultValue: 'CLS',
          options: [
            { value: 'CLS', label: 'CLS' },
            { value: 'GROSS', label: 'Gross Settlement' },
            { value: 'NET', label: 'Net Settlement' },
          ],
          gridSize: { xs: 12, sm: 6, md: 4 },
        },
        {
          name: 'paymentRef',
          label: 'Payment Reference',
          type: 'text',
          placeholder: 'Optional payment ref',
          gridSize: { xs: 12, sm: 6, md: 4 },
        },
        {
          name: 'notes',
          label: 'Notes',
          type: 'textarea',
          rows: 2,
          gridSize: { xs: 12 },
        },
      ],
    },
  ],
  submission: {
    url: '/api/fx/trades',
    method: 'POST',
  },
  confirmBeforeSubmit: true,
  confirmMessage: 'Submit this FX trade for execution? Rate is indicative and may vary at time of fill.',
};

// ─── Options Providers ───────────────────────────────────────────────────────

const fxOptionsProviders: OptionsProviders = {
  currencies: fetchCurrencies,
  counterparties: fetchCounterparties,
};

// ─── Component ───────────────────────────────────────────────────────────────

export function FxSpotForwardDemo({ onLog }: { onLog?: (entry: LogEntry) => void }) {
  return (
    <DynamicForm
      schema={fxSchema}
      optionsProviders={fxOptionsProviders}
      onLog={onLog}
      submitHandler={mockFxSubmit}
      onSuccess={(response) => {
        console.log('FX trade submitted:', response);
      }}
      onError={(error) => {
        console.error('FX trade failed:', error.message);
      }}
    />
  );
}
