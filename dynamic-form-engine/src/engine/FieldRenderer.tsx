import {
  TextField,
  MenuItem,
  FormControl,
  FormControlLabel,
  FormLabel,
  Checkbox,
  RadioGroup,
  Radio,
  Autocomplete,
  InputAdornment,
  CircularProgress,
} from '@mui/material';
import { Controller, type Control, type FieldErrors } from 'react-hook-form';
import type { FieldDefinition } from '../types';
import { evaluateConditions } from './conditions';
import { resolveRule } from './validators';
import { useFieldOptions, type OptionsProviders } from './useFieldOptions';

// ─── Types ───────────────────────────────────────────────────────────────────

type ValidatorFn = (value: unknown, formValues: Record<string, unknown>) => string | true;

type RHFRules = {
  required?: string | boolean;
  min?: { value: number; message: string };
  max?: { value: number; message: string };
  minLength?: { value: number; message: string };
  maxLength?: { value: number; message: string };
  pattern?: { value: RegExp; message: string };
  validate?: Record<string, ValidatorFn>;
};

// ─── Validation Rule Mapping ─────────────────────────────────────────────────

function buildRules(
  field: FieldDefinition,
  customValidators?: Record<string, ValidatorFn>,
): RHFRules {
  const rules: RHFRules = {};
  const v = field.validation;

  // Static `required` (no requiredIf)
  if (v?.required && !v.requiredIf) {
    rules.required =
      typeof v.required === 'string' ? v.required : 'This field is required';
  }
  if (v?.min) rules.min = v.min;
  if (v?.max) rules.max = v.max;
  if (v?.minLength) rules.minLength = v.minLength;
  if (v?.maxLength) rules.maxLength = v.maxLength;

  // Pattern: convert string → RegExp at runtime
  if (v?.pattern) {
    rules.pattern = {
      value: new RegExp(v.pattern.value, v.pattern.flags),
      message: v.pattern.message,
    };
  }

  const validators: Record<string, ValidatorFn> = {};

  // requiredIf: conditionally required based on other fields
  if (v?.requiredIf) {
    const conditions = v.requiredIf;
    const message =
      typeof v.required === 'string' ? v.required : 'This field is required';
    validators.requiredIf = (value: unknown, formValues: Record<string, unknown>) => {
      const conditionMet = evaluateConditions(conditions, formValues);
      if (conditionMet && !value && value !== 0 && value !== false) {
        return message;
      }
      return true;
    };
  }

  // Declarative rules → resolved to validator functions
  if (v?.rules) {
    for (const rule of v.rules) {
      const key = 'field' in rule ? `${rule.type}_${rule.field}` : rule.type;
      validators[key] = resolveRule(rule, customValidators);
    }
  }

  // Auto-validators for financial field types
  if (field.type === 'isin' && !validators.isin) {
    validators.isin = resolveRule({ type: 'isin' });
  }
  if (field.type === 'ticker' && !validators.ticker) {
    validators.ticker = resolveRule({ type: 'ticker' });
  }

  if (Object.keys(validators).length > 0) {
    rules.validate = validators;
  }

  return rules;
}

// ─── Props ───────────────────────────────────────────────────────────────────

interface FieldRendererProps {
  field: FieldDefinition;
  control: Control<Record<string, unknown>>;
  errors: FieldErrors<Record<string, unknown>>;
  formValues: Record<string, unknown>;
  customValidators?: Record<string, ValidatorFn>;
  optionsProviders?: OptionsProviders;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function FieldRenderer({ field, control, formValues, customValidators, optionsProviders }: FieldRendererProps) {
  const isDisabled =
    typeof field.disabled === 'boolean'
      ? field.disabled
      : field.disabled
        ? evaluateConditions(field.disabled, formValues)
        : false;

  const rules = buildRules(field, customValidators);

  // Resolve options: static from schema or dynamic from provider
  const { options: resolvedOptions, loading: optionsLoading } = useFieldOptions(
    field.options,
    field.optionsSource,
    optionsProviders,
  );

  return (
    <Controller
      name={field.name}
      control={control}
      rules={rules}
      render={({ field: rhf, fieldState }) => {
        const errorMessage = fieldState.error?.message;
        const hasError = !!fieldState.error;

        switch (field.type) {
          case 'text':
          case 'isin':
          case 'ticker':
            return (
              <TextField
                {...rhf}
                value={rhf.value ?? ''}
                label={field.label}
                placeholder={field.placeholder}
                helperText={errorMessage || field.helperText}
                error={hasError}
                disabled={isDisabled}
                fullWidth
                onChange={(e) => {
                  const val =
                    field.type === 'ticker'
                      ? e.target.value.toUpperCase()
                      : e.target.value;
                  rhf.onChange(val);
                }}
                slotProps={{
                  input: field.type === 'isin' || field.type === 'ticker'
                    ? { style: { fontFamily: '"JetBrains Mono", monospace', letterSpacing: '0.05em' } }
                    : undefined,
                }}
              />
            );

          case 'number':
            return (
              <TextField
                {...rhf}
                value={rhf.value ?? ''}
                label={field.label}
                type="number"
                placeholder={field.placeholder}
                helperText={errorMessage || field.helperText}
                error={hasError}
                disabled={isDisabled}
                fullWidth
                onChange={(e) => {
                  rhf.onChange(e.target.value === '' ? '' : Number(e.target.value));
                }}
                slotProps={{
                  input: { style: { fontFamily: '"JetBrains Mono", monospace' } },
                }}
              />
            );

          case 'currency':
            return (
              <TextField
                {...rhf}
                value={rhf.value ?? ''}
                label={field.label}
                type="number"
                placeholder={field.placeholder}
                helperText={errorMessage || field.helperText}
                error={hasError}
                disabled={isDisabled}
                fullWidth
                onChange={(e) => {
                  rhf.onChange(e.target.value === '' ? '' : Number(e.target.value));
                }}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        {field.currencySymbol ?? '$'}
                      </InputAdornment>
                    ),
                    style: { fontFamily: '"JetBrains Mono", monospace' },
                    inputProps: {
                      step: field.decimalPlaces !== undefined
                        ? 1 / Math.pow(10, field.decimalPlaces)
                        : 0.01,
                    },
                  },
                }}
              />
            );

          case 'percentage':
            return (
              <TextField
                {...rhf}
                value={rhf.value ?? ''}
                label={field.label}
                type="number"
                placeholder={field.placeholder}
                helperText={errorMessage || field.helperText}
                error={hasError}
                disabled={isDisabled}
                fullWidth
                onChange={(e) => {
                  rhf.onChange(e.target.value === '' ? '' : Number(e.target.value));
                }}
                slotProps={{
                  input: {
                    endAdornment: (
                      <InputAdornment position="end">%</InputAdornment>
                    ),
                    style: { fontFamily: '"JetBrains Mono", monospace' },
                    inputProps: { step: 0.01 },
                  },
                }}
              />
            );

          case 'date':
            return (
              <TextField
                {...rhf}
                value={rhf.value ?? ''}
                label={field.label}
                type="date"
                helperText={errorMessage || field.helperText}
                error={hasError}
                disabled={isDisabled}
                fullWidth
                slotProps={{
                  inputLabel: { shrink: true },
                }}
              />
            );

          case 'datetime':
            return (
              <TextField
                {...rhf}
                value={rhf.value ?? ''}
                label={field.label}
                type="datetime-local"
                helperText={errorMessage || field.helperText}
                error={hasError}
                disabled={isDisabled}
                fullWidth
                slotProps={{
                  inputLabel: { shrink: true },
                }}
              />
            );

          case 'select':
            return (
              <TextField
                {...rhf}
                value={rhf.value ?? ''}
                label={field.label}
                select
                helperText={errorMessage || field.helperText}
                error={hasError}
                disabled={isDisabled || optionsLoading}
                fullWidth
                slotProps={{
                  input: optionsLoading
                    ? { endAdornment: <CircularProgress size={18} sx={{ mr: 2 }} /> }
                    : undefined,
                }}
              >
                <MenuItem value="" disabled>
                  <em>{optionsLoading ? 'Loading...' : (field.placeholder ?? 'Select...')}</em>
                </MenuItem>
                {resolvedOptions.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </MenuItem>
                ))}
              </TextField>
            );

          case 'autocomplete':
            return (
              <Autocomplete
                options={resolvedOptions}
                loading={optionsLoading}
                getOptionLabel={(option) =>
                  typeof option === 'string' ? option : option.label
                }
                value={
                  resolvedOptions.find((o) => o.value === rhf.value) ?? null
                }
                onChange={(_e, newValue) => {
                  if (newValue === null) {
                    rhf.onChange('');
                  } else if (typeof newValue === 'string') {
                    rhf.onChange(newValue);
                  } else {
                    rhf.onChange(newValue.value);
                  }
                }}
                freeSolo={field.freeSolo}
                disabled={isDisabled}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label={field.label}
                    placeholder={field.placeholder}
                    helperText={errorMessage || field.helperText}
                    error={hasError}
                    slotProps={{
                      input: {
                        ...params.InputProps,
                        endAdornment: (
                          <>
                            {optionsLoading ? <CircularProgress size={18} /> : null}
                            {params.InputProps.endAdornment}
                          </>
                        ),
                      },
                    }}
                  />
                )}
              />
            );

          case 'checkbox':
            return (
              <FormControlLabel
                control={
                  <Checkbox
                    checked={!!rhf.value}
                    onChange={(e) => rhf.onChange(e.target.checked)}
                    disabled={isDisabled}
                  />
                }
                label={field.label}
              />
            );

          case 'radio':
            return (
              <FormControl error={hasError} disabled={isDisabled}>
                <FormLabel>{field.label}</FormLabel>
                <RadioGroup
                  value={rhf.value ?? ''}
                  onChange={(e) => rhf.onChange(e.target.value)}
                  row
                >
                  {resolvedOptions.map((opt) => (
                    <FormControlLabel
                      key={opt.value}
                      value={opt.value}
                      control={<Radio size="small" />}
                      label={opt.label}
                    />
                  ))}
                </RadioGroup>
              </FormControl>
            );

          case 'textarea':
            return (
              <TextField
                {...rhf}
                value={rhf.value ?? ''}
                label={field.label}
                multiline
                rows={field.rows ?? 3}
                placeholder={field.placeholder}
                helperText={errorMessage || field.helperText}
                error={hasError}
                disabled={isDisabled}
                fullWidth
              />
            );

          default:
            return null;
        }
      }}
    />
  );
}
