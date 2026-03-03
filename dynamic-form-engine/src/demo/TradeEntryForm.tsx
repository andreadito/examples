import type { FormSchema, LogEntry } from '../types';
import { mockTradeSubmit, fetchExchanges, fetchCurrencies } from './mockApi';
import { DynamicForm } from '../engine/DynamicForm';
import type { OptionsProviders } from '../engine/useFieldOptions';

// ─── Schema (100% JSON-serializable — could come from a DB) ─────────────────

const tradeEntrySchema: FormSchema = {
  id: 'trade-entry',
  title: 'Trade Order Entry',
  description:
    'Submit a new trade order. All fields marked with * are required. Orders are subject to pre-trade risk checks.',
  density: 'compact',
  sections: [
    {
      id: 'instrument',
      title: 'Instrument',
      fields: [
        {
          name: 'side',
          label: 'Side',
          type: 'radio',
          validation: { required: 'Please select Buy or Sell' },
          options: [
            { value: 'BUY', label: 'Buy' },
            { value: 'SELL', label: 'Sell' },
          ],
          gridSize: { xs: 12 },
        },
        {
          name: 'instrumentType',
          label: 'Instrument Type',
          type: 'select',
          validation: { required: 'Instrument type is required' },
          options: [
            { value: 'equity', label: 'Equity' },
            { value: 'bond', label: 'Fixed Income' },
            { value: 'fx', label: 'FX' },
            { value: 'derivative', label: 'Derivative' },
          ],
          gridSize: { xs: 12, sm: 6 },
        },
        {
          name: 'isin',
          label: 'ISIN',
          type: 'isin',
          placeholder: 'e.g., US0378331005',
          validation: { required: 'ISIN is required' },
          gridSize: { xs: 12, sm: 6 },
        },
        {
          name: 'ticker',
          label: 'Ticker Symbol',
          type: 'ticker',
          placeholder: 'e.g., AAPL',
          helperText: 'Bloomberg or exchange ticker',
          gridSize: { xs: 12, sm: 6 },
        },
        {
          name: 'exchange',
          label: 'Exchange',
          type: 'autocomplete',
          optionsSource: { provider: 'exchanges' },
          placeholder: 'Search exchange...',
          gridSize: { xs: 12, sm: 6 },
        },
      ],
    },
    {
      id: 'order-details',
      title: 'Order Details',
      fields: [
        {
          name: 'orderType',
          label: 'Order Type',
          type: 'select',
          validation: { required: 'Order type is required' },
          defaultValue: 'LIMIT',
          options: [
            { value: 'MARKET', label: 'Market' },
            { value: 'LIMIT', label: 'Limit' },
            { value: 'STOP', label: 'Stop' },
            { value: 'STOP_LIMIT', label: 'Stop Limit' },
          ],
          gridSize: { xs: 12, sm: 6 },
        },
        {
          name: 'timeInForce',
          label: 'Time in Force',
          type: 'select',
          validation: { required: 'Time in force is required' },
          defaultValue: 'DAY',
          options: [
            { value: 'DAY', label: 'Day' },
            { value: 'GTC', label: 'Good Till Cancel' },
            { value: 'IOC', label: 'Immediate or Cancel' },
            { value: 'FOK', label: 'Fill or Kill' },
          ],
          gridSize: { xs: 12, sm: 6 },
        },
        {
          name: 'quantity',
          label: 'Quantity',
          type: 'number',
          placeholder: 'Number of shares/units',
          validation: {
            required: 'Quantity is required',
            min: { value: 1, message: 'Minimum quantity is 1' },
            rules: [{ type: 'quantity' }],
          },
          gridSize: { xs: 12, sm: 6 },
        },
        {
          name: 'price',
          label: 'Limit Price',
          type: 'currency',
          currencySymbol: '$',
          decimalPlaces: 4,
          placeholder: '0.0000',
          validation: {
            required: 'Price is required for limit orders',
            requiredIf: [
              { field: 'orderType', operator: 'notEquals', value: 'MARKET' },
            ],
            rules: [{ type: 'price' }],
          },
          disabled: { field: 'orderType', operator: 'equals', value: 'MARKET' },
          gridSize: { xs: 12, sm: 6 },
        },
        {
          name: 'stopPrice',
          label: 'Stop Price',
          type: 'currency',
          currencySymbol: '$',
          decimalPlaces: 4,
          placeholder: '0.0000',
          visible: {
            field: 'orderType',
            operator: 'in',
            value: ['STOP', 'STOP_LIMIT'],
          },
          validation: {
            required: 'Stop price is required',
            requiredIf: [
              {
                field: 'orderType',
                operator: 'in',
                value: ['STOP', 'STOP_LIMIT'],
              },
            ],
            rules: [{ type: 'price' }],
          },
          gridSize: { xs: 12, sm: 6 },
        },
      ],
    },
    {
      id: 'settlement',
      title: 'Settlement',
      collapsible: true,
      defaultExpanded: true,
      fields: [
        {
          name: 'tradeDate',
          label: 'Trade Date',
          type: 'date',
          validation: {
            required: 'Trade date is required',
            rules: [{ type: 'futureDate' }, { type: 'businessDay' }],
          },
          gridSize: { xs: 12, sm: 6 },
        },
        {
          name: 'settlementDate',
          label: 'Settlement Date',
          type: 'date',
          validation: {
            required: 'Settlement date is required',
            rules: [
              { type: 'futureDate' },
              { type: 'businessDay' },
              {
                type: 'after',
                field: 'tradeDate',
                message: 'Settlement date must be after trade date',
              },
            ],
          },
          gridSize: { xs: 12, sm: 6 },
        },
        {
          name: 'settlementCurrency',
          label: 'Settlement Currency',
          type: 'select',
          defaultValue: 'USD',
          optionsSource: { provider: 'currencies' },
          gridSize: { xs: 12, sm: 6 },
        },
      ],
    },
    {
      id: 'notes',
      title: 'Additional Information',
      collapsible: true,
      defaultExpanded: false,
      fields: [
        {
          name: 'clientRef',
          label: 'Client Reference',
          type: 'text',
          placeholder: 'Optional client reference ID',
          gridSize: { xs: 12, sm: 6 },
        },
        {
          name: 'notes',
          label: 'Notes',
          type: 'textarea',
          placeholder: 'Any additional notes for the trade desk...',
          rows: 3,
          gridSize: { xs: 12 },
        },
      ],
    },
  ],
  submission: {
    url: '/api/trades',
    method: 'POST',
  },
  confirmBeforeSubmit: true,
  confirmMessage:
    'Please verify your trade details. Once submitted, the order will be sent for execution. Continue?',
  resetOnSuccess: false,
};

// ─── Options Providers (async functions that fetch options at runtime) ────────

const tradeOptionsProviders: OptionsProviders = {
  exchanges: fetchExchanges,
  currencies: fetchCurrencies,
};

// ─── Component ───────────────────────────────────────────────────────────────
// Schema is pure JSON. Runtime behavior (handler, callbacks) passed as props.

export function TradeEntryDemo({
  onLog,
  initialValues,
}: {
  onLog?: (entry: LogEntry) => void;
  initialValues?: Record<string, unknown>;
}) {
  return (
    <DynamicForm
      schema={tradeEntrySchema}
      initialValues={initialValues}
      optionsProviders={tradeOptionsProviders}
      onLog={onLog}
      submitHandler={mockTradeSubmit}
      transformPayload={(values) => ({
        ...values,
        submittedAt: new Date().toISOString(),
      })}
      onSuccess={(response) => {
        console.log('Trade submitted:', response);
      }}
      onError={(error) => {
        console.error('Trade failed:', error.message);
      }}
    />
  );
}
