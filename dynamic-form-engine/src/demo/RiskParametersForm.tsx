import type { FormSchema, LogEntry } from '../types';
import { mockRiskConfigSubmit } from './mockApi';
import { DynamicForm } from '../engine/DynamicForm';

// ─── Schema (100% JSON-serializable — could come from a DB) ─────────────────

const riskParametersSchema: FormSchema = {
  id: 'risk-parameters',
  title: 'Risk Parameters Configuration',
  description:
    'Configure pre-trade and portfolio risk limits. Changes take effect immediately upon submission.',
  sections: [
    {
      id: 'position-limits',
      title: 'Position Limits',
      description:
        'Maximum allowed exposure per instrument and portfolio level.',
      fields: [
        {
          name: 'maxPositionSize',
          label: 'Max Position Size',
          type: 'currency',
          currencySymbol: '$',
          decimalPlaces: 0,
          defaultValue: 1000000,
          validation: {
            required: 'Max position size is required',
            min: { value: 10000, message: 'Minimum $10,000' },
            max: { value: 100000000, message: 'Maximum $100,000,000' },
          },
          helperText: 'Per-instrument notional limit',
          gridSize: { xs: 12, sm: 6 },
        },
        {
          name: 'maxPortfolioExposure',
          label: 'Max Portfolio Exposure',
          type: 'currency',
          currencySymbol: '$',
          decimalPlaces: 0,
          defaultValue: 10000000,
          validation: {
            required: 'Required',
            min: { value: 100000, message: 'Minimum $100,000' },
          },
          helperText: 'Aggregate portfolio notional limit',
          gridSize: { xs: 12, sm: 6 },
        },
        {
          name: 'maxConcentration',
          label: 'Max Single-Name Concentration',
          type: 'percentage',
          defaultValue: 10,
          validation: {
            required: 'Required',
            min: { value: 1, message: 'Minimum 1%' },
            max: { value: 50, message: 'Maximum 50%' },
          },
          helperText: '% of total portfolio in a single instrument',
          gridSize: { xs: 12, sm: 6 },
        },
        {
          name: 'maxSectorConcentration',
          label: 'Max Sector Concentration',
          type: 'percentage',
          defaultValue: 25,
          validation: {
            required: 'Required',
            min: { value: 5, message: 'Minimum 5%' },
            max: { value: 80, message: 'Maximum 80%' },
          },
          helperText: '% of total portfolio in a single sector',
          gridSize: { xs: 12, sm: 6 },
        },
      ],
    },
    {
      id: 'order-limits',
      title: 'Order Limits',
      description: 'Per-order validation thresholds.',
      fields: [
        {
          name: 'maxOrderValue',
          label: 'Max Order Value',
          type: 'currency',
          currencySymbol: '$',
          decimalPlaces: 0,
          defaultValue: 500000,
          validation: {
            required: 'Required',
            min: { value: 1000, message: 'Minimum $1,000' },
          },
          gridSize: { xs: 12, sm: 6 },
        },
        {
          name: 'maxOrderQuantity',
          label: 'Max Order Quantity',
          type: 'number',
          defaultValue: 100000,
          validation: {
            required: 'Required',
            min: { value: 100, message: 'Minimum 100 units' },
          },
          helperText: 'Maximum shares/contracts per order',
          gridSize: { xs: 12, sm: 6 },
        },
        {
          name: 'maxDailyTurnover',
          label: 'Max Daily Turnover',
          type: 'currency',
          currencySymbol: '$',
          decimalPlaces: 0,
          defaultValue: 5000000,
          validation: {
            required: 'Required',
            min: { value: 10000, message: 'Minimum $10,000' },
          },
          helperText: 'Total daily trading volume limit',
          gridSize: { xs: 12, sm: 6 },
        },
        {
          name: 'maxOrdersPerMinute',
          label: 'Max Orders / Minute',
          type: 'number',
          defaultValue: 50,
          validation: {
            required: 'Required',
            min: { value: 1, message: 'Minimum 1' },
            max: { value: 1000, message: 'Maximum 1,000' },
          },
          helperText: 'Rate limiting for automated strategies',
          gridSize: { xs: 12, sm: 6 },
        },
      ],
    },
    {
      id: 'loss-limits',
      title: 'Loss Limits',
      collapsible: true,
      defaultExpanded: true,
      fields: [
        {
          name: 'maxDailyLoss',
          label: 'Max Daily Loss',
          type: 'currency',
          currencySymbol: '$',
          decimalPlaces: 0,
          defaultValue: 100000,
          validation: {
            required: 'Required',
            min: { value: 1000, message: 'Minimum $1,000' },
          },
          helperText: 'Hard stop on daily P&L loss',
          gridSize: { xs: 12, sm: 6 },
        },
        {
          name: 'maxDrawdown',
          label: 'Max Drawdown',
          type: 'percentage',
          defaultValue: 5,
          validation: {
            required: 'Required',
            min: { value: 0.5, message: 'Minimum 0.5%' },
            max: { value: 50, message: 'Maximum 50%' },
          },
          helperText: 'Peak-to-trough limit before auto-flatten',
          gridSize: { xs: 12, sm: 6 },
        },
        {
          name: 'autoFlatten',
          label: 'Auto-flatten on breach',
          type: 'checkbox',
          defaultValue: true,
          helperText:
            'Automatically close all positions when loss limit is breached',
          gridSize: { xs: 12 },
        },
      ],
    },
    {
      id: 'notifications',
      title: 'Notifications',
      collapsible: true,
      defaultExpanded: false,
      fields: [
        {
          name: 'notifyEmail',
          label: 'Notification Email',
          type: 'text',
          placeholder: 'risk-alerts@company.com',
          validation: {
            pattern: {
              value: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$',
              message: 'Invalid email address',
            },
          },
          gridSize: { xs: 12, sm: 6 },
        },
        {
          name: 'warningThreshold',
          label: 'Warning Threshold',
          type: 'percentage',
          defaultValue: 80,
          validation: {
            min: { value: 50, message: 'Minimum 50%' },
            max: { value: 99, message: 'Maximum 99%' },
          },
          helperText: '% of limit that triggers warning notification',
          gridSize: { xs: 12, sm: 6 },
        },
      ],
    },
  ],
  submission: {
    url: '/api/risk/config',
    method: 'PUT',
  },
  confirmBeforeSubmit: true,
  confirmMessage:
    'Risk parameter changes take effect immediately and apply to all active trading strategies. Proceed?',
  resetOnSuccess: false,
};

// ─── Component ───────────────────────────────────────────────────────────────
// Schema is pure JSON. Runtime behavior (handler, callbacks) passed as props.

export function RiskParametersDemo({
  onLog,
}: {
  onLog?: (entry: LogEntry) => void;
}) {
  return (
    <DynamicForm
      schema={riskParametersSchema}
      onLog={onLog}
      submitHandler={mockRiskConfigSubmit}
      onSuccess={(response) => {
        console.log('Risk config applied:', response);
      }}
    />
  );
}
