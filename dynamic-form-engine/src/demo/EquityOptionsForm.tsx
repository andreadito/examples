import type { FormSchema, LogEntry } from '../types';
import { mockOptionsSubmit, fetchExchanges } from './mockApi';
import { DynamicForm } from '../engine/DynamicForm';
import type { OptionsProviders } from '../engine/useFieldOptions';

// ─── Schema (100% JSON-serializable — could come from a DB) ─────────────────

const equityOptionsSchema: FormSchema = {
  id: 'equity-options',
  title: 'Equity Options Order',
  description: 'Submit a listed equity options order. All prices in contract currency.',
  density: 'compact',
  sections: [
    {
      id: 'option-leg',
      title: 'Option Leg',
      fields: [
        {
          name: 'direction',
          label: 'Direction',
          type: 'radio',
          validation: { required: 'Select direction' },
          options: [
            { value: 'BUY', label: 'Buy' },
            { value: 'SELL', label: 'Sell' },
          ],
          gridSize: { xs: 6, sm: 4, md: 2 },
        },
        {
          name: 'optionType',
          label: 'Option Type',
          type: 'radio',
          validation: { required: 'Select option type' },
          options: [
            { value: 'CALL', label: 'Call' },
            { value: 'PUT', label: 'Put' },
          ],
          gridSize: { xs: 6, sm: 4, md: 2 },
        },
        {
          name: 'style',
          label: 'Exercise Style',
          type: 'select',
          defaultValue: 'AMERICAN',
          options: [
            { value: 'AMERICAN', label: 'American' },
            { value: 'EUROPEAN', label: 'European' },
          ],
          gridSize: { xs: 12, sm: 4, md: 2 },
        },
        {
          name: 'underlying',
          label: 'Underlying',
          type: 'ticker',
          placeholder: 'e.g. AAPL',
          validation: { required: 'Underlying is required' },
          gridSize: { xs: 12, sm: 6, md: 3 },
        },
        {
          name: 'exchange',
          label: 'Exchange',
          type: 'autocomplete',
          optionsSource: { provider: 'exchanges' },
          validation: { required: 'Exchange is required' },
          gridSize: { xs: 12, sm: 6, md: 3 },
        },
      ],
    },
    {
      id: 'strike-expiry',
      title: 'Strike & Expiry',
      fields: [
        {
          name: 'strike',
          label: 'Strike Price',
          type: 'currency',
          currencySymbol: '$',
          decimalPlaces: 2,
          placeholder: '0.00',
          validation: {
            required: 'Strike is required',
            rules: [{ type: 'price' }],
          },
          gridSize: { xs: 12, sm: 6, md: 3 },
        },
        {
          name: 'expiryDate',
          label: 'Expiry Date',
          type: 'date',
          validation: {
            required: 'Expiry date is required',
            rules: [{ type: 'futureDate' }],
          },
          gridSize: { xs: 12, sm: 6, md: 3 },
        },
        {
          name: 'contracts',
          label: 'Contracts',
          type: 'number',
          placeholder: 'Number of contracts',
          helperText: '1 contract = 100 shares',
          validation: {
            required: 'Number of contracts is required',
            min: { value: 1, message: 'Minimum 1 contract' },
            max: { value: 10000, message: 'Maximum 10,000 contracts' },
          },
          gridSize: { xs: 12, sm: 6, md: 3 },
        },
        {
          name: 'limitPrice',
          label: 'Limit Price',
          type: 'currency',
          currencySymbol: '$',
          decimalPlaces: 2,
          placeholder: '0.00',
          helperText: 'Leave blank for market order',
          gridSize: { xs: 12, sm: 6, md: 3 },
        },
      ],
    },
    {
      id: 'order-params',
      title: 'Order Parameters',
      fields: [
        {
          name: 'orderType',
          label: 'Order Type',
          type: 'select',
          defaultValue: 'LIMIT',
          options: [
            { value: 'MARKET', label: 'Market' },
            { value: 'LIMIT', label: 'Limit' },
            { value: 'STOP', label: 'Stop' },
          ],
          validation: { required: 'Order type is required' },
          gridSize: { xs: 12, sm: 6, md: 3 },
        },
        {
          name: 'timeInForce',
          label: 'Time in Force',
          type: 'select',
          defaultValue: 'DAY',
          options: [
            { value: 'DAY', label: 'Day' },
            { value: 'GTC', label: 'Good Till Cancel' },
            { value: 'IOC', label: 'Immediate or Cancel' },
            { value: 'FOK', label: 'Fill or Kill' },
          ],
          gridSize: { xs: 12, sm: 6, md: 3 },
        },
        {
          name: 'openClose',
          label: 'Open / Close',
          type: 'select',
          defaultValue: 'OPEN',
          options: [
            { value: 'OPEN', label: 'Opening' },
            { value: 'CLOSE', label: 'Closing' },
          ],
          gridSize: { xs: 12, sm: 6, md: 3 },
        },
        {
          name: 'account',
          label: 'Account',
          type: 'text',
          placeholder: 'Trading account',
          gridSize: { xs: 12, sm: 6, md: 3 },
        },
      ],
    },
    {
      id: 'greeks-limits',
      title: 'Risk Limits',
      collapsible: true,
      defaultExpanded: false,
      fields: [
        {
          name: 'maxDelta',
          label: 'Max Delta Exposure',
          type: 'currency',
          currencySymbol: '$',
          decimalPlaces: 0,
          helperText: 'Auto-reject if delta exceeds',
          gridSize: { xs: 12, sm: 6, md: 3 },
        },
        {
          name: 'maxVega',
          label: 'Max Vega Exposure',
          type: 'currency',
          currencySymbol: '$',
          decimalPlaces: 0,
          helperText: 'Auto-reject if vega exceeds',
          gridSize: { xs: 12, sm: 6, md: 3 },
        },
        {
          name: 'hedgeOnFill',
          label: 'Auto-hedge underlying on fill',
          type: 'checkbox',
          defaultValue: false,
          gridSize: { xs: 12, sm: 6, md: 3 },
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
    url: '/api/options/orders',
    method: 'POST',
  },
  confirmBeforeSubmit: true,
  confirmMessage: 'Submit this options order for execution?',
};

// ─── Options Providers ───────────────────────────────────────────────────────

const optionsProviders: OptionsProviders = {
  exchanges: fetchExchanges,
};

// ─── Component ───────────────────────────────────────────────────────────────

export function EquityOptionsDemo({ onLog }: { onLog?: (entry: LogEntry) => void }) {
  return (
    <DynamicForm
      schema={equityOptionsSchema}
      optionsProviders={optionsProviders}
      onLog={onLog}
      submitHandler={mockOptionsSubmit}
      onSuccess={(response) => {
        console.log('Options order submitted:', response);
      }}
      onError={(error) => {
        console.error('Options order failed:', error.message);
      }}
    />
  );
}
