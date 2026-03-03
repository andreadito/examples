// ─── Field Types ─────────────────────────────────────────────────────────────

export type FieldType =
  | 'text'
  | 'number'
  | 'currency'
  | 'percentage'
  | 'date'
  | 'datetime'
  | 'select'
  | 'autocomplete'
  | 'checkbox'
  | 'radio'
  | 'isin'
  | 'ticker'
  | 'textarea';

// ─── Options ─────────────────────────────────────────────────────────────────

export interface SelectOption {
  value: string | number;
  label: string;
}

// ─── Dynamic Options Source (JSON-serializable) ─────────────────────────────
// Declares where to fetch options at runtime. The actual fetching is handled
// by an `optionsProviders` map passed as a component prop, or by the engine
// if a URL-based source is provided.

export interface OptionsSource {
  /** A key that maps to an async provider function passed via `optionsProviders` prop */
  provider: string;
}

// ─── Declarative Conditions ──────────────────────────────────────────────────
// Used for `visible`, `disabled`, and `requiredIf` — fully JSON-serializable.

export interface FieldCondition {
  field: string;
  operator:
    | 'equals'
    | 'notEquals'
    | 'in'
    | 'notIn'
    | 'gt'
    | 'lt'
    | 'gte'
    | 'lte'
    | 'empty'
    | 'notEmpty';
  value?: unknown;
}

// ─── Declarative Validation Rules ────────────────────────────────────────────
// All rules are referenced by name — no function references.

/** Built-in validator names */
export type BuiltInValidator =
  | 'isin'
  | 'ticker'
  | 'futureDate'
  | 'businessDay'
  | 'quantity'
  | 'price';

/** A rule that references a built-in (or custom-registered) validator by name */
export interface BuiltInRule {
  type: BuiltInValidator | string; // string allows custom-registered validators
  message?: string; // override the validator's default message
}

/** A cross-field validation rule */
export interface CrossFieldRule {
  type: 'after' | 'before' | 'greaterThan' | 'lessThan';
  field: string; // the other field's name
  message: string;
}

export type DeclarativeRule = BuiltInRule | CrossFieldRule;

export interface ValidationRule {
  /** Always required (true = default message, string = custom message) */
  required?: boolean | string;
  /** Conditionally required — field is required only when conditions are met.
   *  Uses the `required` string as the error message if provided. */
  requiredIf?: FieldCondition | FieldCondition[];
  min?: { value: number; message: string };
  max?: { value: number; message: string };
  minLength?: { value: number; message: string };
  maxLength?: { value: number; message: string };
  /** Regex pattern as a string (JSON-safe). Converted to RegExp at runtime. */
  pattern?: { value: string; flags?: string; message: string };
  /** Declarative validator references */
  rules?: DeclarativeRule[];
}

// ─── Field Definition ────────────────────────────────────────────────────────

export interface FieldDefinition {
  name: string;
  label: string;
  type: FieldType;
  defaultValue?: unknown;
  validation?: ValidationRule;
  options?: SelectOption[];
  /** Fetch options dynamically at runtime. Resolved via `optionsProviders` prop. */
  optionsSource?: OptionsSource;
  placeholder?: string;
  helperText?: string;
  /** Static boolean or declarative condition(s). Array = AND. */
  disabled?: boolean | FieldCondition | FieldCondition[];
  /** Static boolean or declarative condition(s). Array = AND. */
  visible?: boolean | FieldCondition | FieldCondition[];
  gridSize?: { xs?: number; sm?: number; md?: number; lg?: number; xl?: number };
  currencySymbol?: string;
  decimalPlaces?: number;
  freeSolo?: boolean;
  rows?: number;
}

// ─── Section ─────────────────────────────────────────────────────────────────

export interface FormSection {
  id: string;
  title?: string;
  description?: string;
  collapsible?: boolean;
  defaultExpanded?: boolean;
  fields: FieldDefinition[];
}

// ─── Submission (JSON-serializable target info only) ─────────────────────────

export interface SubmissionConfig {
  url: string;
  method?: 'POST' | 'PUT' | 'PATCH';
  headers?: Record<string, string>;
  timeout?: number;
}

// ─── Callbacks (passed as component props, NOT in schema) ────────────────────

export interface FormCallbacks<TResponse = unknown> {
  onSuccess?: (response: TResponse, values: Record<string, unknown>) => void;
  onError?: (error: Error, values: Record<string, unknown>) => void;
  onSubmitting?: (values: Record<string, unknown>) => void;
}

// ─── Form Schema (100% JSON-serializable) ────────────────────────────────────

export interface FormSchema {
  id: string;
  title: string;
  description?: string;
  sections: FormSection[];
  submission: SubmissionConfig;
  resetOnSuccess?: boolean;
  confirmBeforeSubmit?: boolean;
  confirmMessage?: string;
  /** Controls field density: 'compact' packs fields tighter (for trader screens),
   *  'comfortable' is the default, 'dense' uses minimal spacing. */
  density?: 'compact' | 'comfortable' | 'dense';
}

// ─── Submission State ────────────────────────────────────────────────────────

export interface SubmissionState<TResponse = unknown> {
  status: 'idle' | 'submitting' | 'success' | 'error';
  response?: TResponse;
  error?: Error;
}

// ─── Log Entry ───────────────────────────────────────────────────────────────

export interface LogEntry {
  type: 'info' | 'success' | 'error' | 'warning';
  message: string;
  data?: unknown;
  timestamp: Date;
}
