import type { DeclarativeRule, CrossFieldRule } from '../types';

// ─── Built-in Validators ─────────────────────────────────────────────────────

export function validateISIN(value: unknown): string | true {
  if (typeof value !== 'string' || !value) return true;
  const v = value.toUpperCase().trim();

  if (!/^[A-Z]{2}[A-Z0-9]{9}[0-9]$/.test(v)) {
    return 'ISIN must be 2-letter country code + 9 alphanumeric + 1 check digit (e.g., US0378331005)';
  }

  const digits = v
    .split('')
    .map((c) => {
      const code = c.charCodeAt(0);
      return code >= 65 ? (code - 55).toString() : c;
    })
    .join('');

  let sum = 0;
  let doubleNext = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = parseInt(digits[i], 10);
    if (doubleNext) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    doubleNext = !doubleNext;
  }

  return sum % 10 === 0 ? true : 'Invalid ISIN checksum';
}

export function validateTicker(value: unknown): string | true {
  if (typeof value !== 'string' || !value) return true;
  if (!/^[A-Z]{1,5}(\.[A-Z]{1,2})?$/i.test(value.trim())) {
    return 'Invalid ticker format (e.g., AAPL, BRK.B, MSFT)';
  }
  return true;
}

export function validateBusinessDay(value: unknown): string | true {
  if (typeof value !== 'string' || !value) return true;
  const date = new Date(value);
  if (isNaN(date.getTime())) return 'Invalid date';
  const day = date.getUTCDay();
  if (day === 0 || day === 6) {
    return 'Must be a business day (Monday–Friday)';
  }
  return true;
}

export function validateFutureDate(value: unknown): string | true {
  if (typeof value !== 'string' || !value) return true;
  const date = new Date(value);
  if (isNaN(date.getTime())) return 'Invalid date';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (date < today) {
    return 'Date must be today or in the future';
  }
  return true;
}

export function validateQuantity(value: unknown): string | true {
  const n = Number(value);
  if (isNaN(n) || n <= 0) return 'Quantity must be a positive number';
  if (!Number.isInteger(n)) return 'Quantity must be a whole number';
  return true;
}

export function validatePrice(value: unknown): string | true {
  const n = Number(value);
  if (isNaN(n) || n < 0) return 'Price must be a non-negative number';
  const parts = String(value).split('.');
  if (parts.length > 1 && parts[1].length > 4) {
    return 'Maximum 4 decimal places';
  }
  return true;
}

// ─── Built-in Validator Registry ─────────────────────────────────────────────

type ValidatorFn = (value: unknown, formValues: Record<string, unknown>) => string | true;

const BUILT_IN_VALIDATORS: Record<string, (value: unknown) => string | true> = {
  isin: validateISIN,
  ticker: validateTicker,
  futureDate: validateFutureDate,
  businessDay: validateBusinessDay,
  quantity: validateQuantity,
  price: validatePrice,
};

function isCrossFieldRule(rule: DeclarativeRule): rule is CrossFieldRule {
  return 'field' in rule;
}

// ─── Rule Resolver ───────────────────────────────────────────────────────────

/**
 * Resolve a declarative rule into a validator function.
 * Checks custom validators first, then built-in, then cross-field rules.
 */
export function resolveRule(
  rule: DeclarativeRule,
  customValidators?: Record<string, ValidatorFn>,
): ValidatorFn {
  // Cross-field rules (have a `field` property)
  if (isCrossFieldRule(rule)) {
    return (_value, formValues) => {
      if (!_value && _value !== 0) return true; // skip empty — let required handle it
      const otherValue = formValues[rule.field];
      if (!otherValue && otherValue !== 0) return true; // other field empty

      switch (rule.type) {
        case 'after': {
          const thisDate = new Date(_value as string);
          const otherDate = new Date(otherValue as string);
          return thisDate > otherDate ? true : rule.message;
        }
        case 'before': {
          const thisDate = new Date(_value as string);
          const otherDate = new Date(otherValue as string);
          return thisDate < otherDate ? true : rule.message;
        }
        case 'greaterThan':
          return Number(_value) > Number(otherValue) ? true : rule.message;
        case 'lessThan':
          return Number(_value) < Number(otherValue) ? true : rule.message;
        default:
          return true;
      }
    };
  }

  // Custom-registered validators (app-level)
  if (customValidators && rule.type in customValidators) {
    const fn = customValidators[rule.type];
    return (value, formValues) => {
      const result = fn(value, formValues);
      return result === true ? true : (rule.message ?? result);
    };
  }

  // Built-in validators
  if (rule.type in BUILT_IN_VALIDATORS) {
    const fn = BUILT_IN_VALIDATORS[rule.type];
    return (value) => {
      const result = fn(value);
      return result === true ? true : (rule.message ?? result);
    };
  }

  // Unknown rule type — pass through
  return () => true;
}
