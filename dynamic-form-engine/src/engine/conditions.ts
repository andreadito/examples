import type { FieldCondition } from '../types';

/**
 * Evaluate a single declarative condition against form values.
 */
export function evaluateCondition(
  condition: FieldCondition,
  formValues: Record<string, unknown>,
): boolean {
  const fieldValue = formValues[condition.field];

  switch (condition.operator) {
    case 'equals':
      return fieldValue === condition.value;
    case 'notEquals':
      return fieldValue !== condition.value;
    case 'in':
      return Array.isArray(condition.value) && condition.value.includes(fieldValue);
    case 'notIn':
      return Array.isArray(condition.value) && !condition.value.includes(fieldValue);
    case 'gt':
      return Number(fieldValue) > Number(condition.value);
    case 'lt':
      return Number(fieldValue) < Number(condition.value);
    case 'gte':
      return Number(fieldValue) >= Number(condition.value);
    case 'lte':
      return Number(fieldValue) <= Number(condition.value);
    case 'empty':
      return fieldValue === '' || fieldValue === null || fieldValue === undefined;
    case 'notEmpty':
      return fieldValue !== '' && fieldValue !== null && fieldValue !== undefined;
    default:
      return true;
  }
}

/**
 * Evaluate one or more conditions (array = AND logic).
 * Accepts a static boolean, a single condition, or an array of conditions.
 */
export function evaluateConditions(
  conditions: boolean | FieldCondition | FieldCondition[],
  formValues: Record<string, unknown>,
): boolean {
  if (typeof conditions === 'boolean') return conditions;
  if (Array.isArray(conditions)) {
    return conditions.every((c) => evaluateCondition(c, formValues));
  }
  return evaluateCondition(conditions, formValues);
}
