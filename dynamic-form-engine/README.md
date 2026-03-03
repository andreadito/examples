# Dynamic Form Engine

A declarative, JSON-driven form engine built with **React 19**, **Material UI v6**, and **react-hook-form**. Designed for financial trading applications but flexible enough for any domain.

The core idea: **define your form as JSON** (store it in a database), and the engine renders it with full validation, conditional logic, async option loading, and submission handling — all at runtime.

---

## Table of Contents

- [Quick Start](#quick-start)
- [Architecture](#architecture)
- [Schema Reference](#schema-reference)
  - [FormSchema](#formschema)
  - [FormSection](#formsection)
  - [FieldDefinition](#fielddefinition)
  - [Field Types](#field-types)
  - [ValidationRule](#validationrule)
  - [Declarative Conditions](#declarative-conditions)
  - [Declarative Validators (rules)](#declarative-validators-rules)
  - [OptionsSource](#optionssource)
- [Component Props](#component-props)
  - [DynamicForm Props](#dynamicform-props)
  - [initialValues](#initialvalues)
  - [optionsProviders](#optionsproviders)
  - [submitHandler](#submithandler)
  - [transformPayload](#transformpayload)
  - [customValidators](#customvalidators)
  - [Callbacks](#callbacks)
- [Layout & Responsiveness](#layout--responsiveness)
  - [Grid System](#grid-system)
  - [Density](#density)
  - [Wide Screen (Trader) Layout](#wide-screen-trader-layout)
- [Recipes](#recipes)
  - [Loading Options from an API](#loading-options-from-an-api)
  - [Loading Options from React Context](#loading-options-from-react-context)
  - [Pre-filling from Context or Props](#pre-filling-from-context-or-props)
  - [Custom Validators](#custom-validators)
  - [Conditional Fields](#conditional-fields)
  - [Cross-Field Validation](#cross-field-validation)
  - [Custom Regex Validation](#custom-regex-validation)
- [Demo Forms](#demo-forms)
- [File Structure](#file-structure)

---

## Quick Start

```bash
npm install
npm run dev
```

Open `http://localhost:5174` to see the demo with 6 example forms.

---

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                     Your Application                         │
│                                                              │
│  ┌─────────────┐   ┌─────────────────┐   ┌──────────────┐   │
│  │ JSON Schema  │   │ Options         │   │ Callbacks &  │   │
│  │ (from DB)    │   │ Providers       │   │ Handlers     │   │
│  └──────┬───────┘   └───────┬─────────┘   └──────┬───────┘   │
│         │                   │                     │           │
│         ▼                   ▼                     ▼           │
│  ┌──────────────────────────────────────────────────────┐    │
│  │              <DynamicForm                             │    │
│  │                schema={schema}                        │    │
│  │                initialValues={...}                    │    │
│  │                optionsProviders={...}                 │    │
│  │                submitHandler={...}                    │    │
│  │                onSuccess={...}                        │    │
│  │                customValidators={...}                 │    │
│  │              />                                       │    │
│  └──────────────────────────────────────────────────────┘    │
│         │                                                     │
│         ▼                                                     │
│  ┌──────────────────────────────────────────────────────┐    │
│  │  Engine Internals (you don't touch these)             │    │
│  │  ├── SectionRenderer (grid layout, visibility)        │    │
│  │  ├── FieldRenderer (13 field types, conditions)       │    │
│  │  ├── useFieldOptions (async option loading)           │    │
│  │  ├── useFormSubmission (fetch / custom handler)       │    │
│  │  ├── conditions.ts (declarative condition evaluator)  │    │
│  │  └── validators.ts (built-in + custom registry)       │    │
│  └──────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────┘
```

**Key principle**: The schema is 100% JSON-serializable (no functions). All runtime behavior — callbacks, submit handlers, option providers, custom validators — is passed as component props.

---

## Schema Reference

### FormSchema

The root object. This is what you store in your database.

| Property              | Type                           | Required | Description                                     |
|-----------------------|--------------------------------|----------|-------------------------------------------------|
| `id`                  | `string`                       | Yes      | Unique form identifier                          |
| `title`               | `string`                       | Yes      | Form title displayed at the top                 |
| `description`         | `string`                       | No       | Subtitle / instructions                         |
| `sections`            | `FormSection[]`                | Yes      | Array of form sections                          |
| `submission`          | `SubmissionConfig`             | Yes      | Where to send data (url, method, headers)       |
| `density`             | `'compact' \| 'comfortable' \| 'dense'` | No | Controls spacing between fields           |
| `resetOnSuccess`      | `boolean`                      | No       | Clear form after successful submit              |
| `confirmBeforeSubmit` | `boolean`                      | No       | Show confirmation dialog before submit          |
| `confirmMessage`      | `string`                       | No       | Custom confirmation dialog message              |

### FormSection

Groups fields under a heading. Sections can be collapsible (accordion).

| Property          | Type              | Required | Description                                |
|-------------------|-------------------|----------|--------------------------------------------|
| `id`              | `string`          | Yes      | Unique section identifier                  |
| `title`           | `string`          | No       | Section heading                            |
| `description`     | `string`          | No       | Section description text                   |
| `collapsible`     | `boolean`         | No       | Render as an accordion                     |
| `defaultExpanded` | `boolean`         | No       | Initial expanded state (default: `true`)   |
| `fields`          | `FieldDefinition[]` | Yes    | Array of field definitions                 |

### FieldDefinition

Defines a single form field.

| Property         | Type                                              | Required | Description                                          |
|------------------|---------------------------------------------------|----------|------------------------------------------------------|
| `name`           | `string`                                          | Yes      | Field name (used as form key)                        |
| `label`          | `string`                                          | Yes      | Display label                                        |
| `type`           | `FieldType`                                       | Yes      | See [Field Types](#field-types)                      |
| `defaultValue`   | `unknown`                                         | No       | Default value from schema                            |
| `validation`     | `ValidationRule`                                  | No       | Validation configuration                             |
| `options`        | `SelectOption[]`                                  | No       | Static options for select/autocomplete/radio         |
| `optionsSource`  | `OptionsSource`                                   | No       | Dynamic options — see [OptionsSource](#optionssource) |
| `placeholder`    | `string`                                          | No       | Placeholder text                                     |
| `helperText`     | `string`                                          | No       | Helper text below the field                          |
| `disabled`       | `boolean \| FieldCondition \| FieldCondition[]`   | No       | Static or conditional disabled state                 |
| `visible`        | `boolean \| FieldCondition \| FieldCondition[]`   | No       | Static or conditional visibility                     |
| `gridSize`       | `{ xs?, sm?, md?, lg?, xl? }`                     | No       | MUI Grid2 responsive column spans (out of 12)        |
| `currencySymbol` | `string`                                          | No       | Symbol for `currency` type (default: `$`)            |
| `decimalPlaces`  | `number`                                          | No       | Step precision for currency/number                   |
| `freeSolo`       | `boolean`                                         | No       | Allow free text in autocomplete                      |
| `rows`           | `number`                                          | No       | Rows for `textarea` type (default: 3)                |

### Field Types

| Type           | Renders                    | Notes                              |
|----------------|----------------------------|------------------------------------|
| `text`         | Text input                 |                                    |
| `number`       | Numeric input              | Monospace font                     |
| `currency`     | Numeric + currency symbol  | `currencySymbol`, `decimalPlaces`  |
| `percentage`   | Numeric + % suffix         |                                    |
| `date`         | Date picker                |                                    |
| `datetime`     | Date-time picker           |                                    |
| `select`       | Dropdown select            | Uses `options` or `optionsSource`  |
| `autocomplete` | Searchable dropdown        | Uses `options` or `optionsSource`  |
| `checkbox`     | Single checkbox            |                                    |
| `radio`        | Radio button group         | Uses `options`                     |
| `isin`         | ISIN input (auto-validated)| Luhn checksum, monospace           |
| `ticker`       | Ticker input (auto-caps)   | Auto-validated, monospace          |
| `textarea`     | Multi-line text            | `rows` prop                        |

### ValidationRule

All validation is declarative — no functions in JSON.

| Property    | Type                          | Description                                       |
|-------------|-------------------------------|---------------------------------------------------|
| `required`  | `boolean \| string`           | Required field. String = custom error message.     |
| `requiredIf`| `FieldCondition \| FieldCondition[]` | Conditionally required based on other fields. |
| `min`       | `{ value, message }`          | Minimum numeric value                             |
| `max`       | `{ value, message }`          | Maximum numeric value                             |
| `minLength` | `{ value, message }`          | Minimum string length                             |
| `maxLength` | `{ value, message }`          | Maximum string length                             |
| `pattern`   | `{ value, flags?, message }`  | Regex as string (converted to RegExp at runtime)  |
| `rules`     | `DeclarativeRule[]`           | Named validator references                        |

### Declarative Conditions

Used in `visible`, `disabled`, and `requiredIf`. When an array is given, all conditions must be true (AND logic).

```json
{
  "field": "orderType",
  "operator": "equals",
  "value": "MARKET"
}
```

**Available operators:** `equals`, `notEquals`, `in`, `notIn`, `gt`, `lt`, `gte`, `lte`, `empty`, `notEmpty`

**Examples:**

```json
// Disable price when order type is MARKET
"disabled": { "field": "orderType", "operator": "equals", "value": "MARKET" }

// Show stop price only for STOP and STOP_LIMIT orders
"visible": { "field": "orderType", "operator": "in", "value": ["STOP", "STOP_LIMIT"] }

// Required only when insurance checkbox is checked
"requiredIf": { "field": "hasInsurance", "operator": "equals", "value": true }
```

### Declarative Validators (rules)

Reference validators by name. The engine resolves them at runtime.

**Built-in validators:**

| Name          | Description                                      |
|---------------|--------------------------------------------------|
| `isin`        | Validates ISIN format + Luhn checksum            |
| `ticker`      | Validates ticker symbol format (1-10 uppercase)  |
| `futureDate`  | Date must be today or in the future              |
| `businessDay` | Date must be a weekday (Mon-Fri)                 |
| `quantity`    | Must be a positive integer                       |
| `price`       | Must be a positive number                        |

**Cross-field validators:**

| Name          | Description                                      |
|---------------|--------------------------------------------------|
| `after`       | Date must be after another field's date           |
| `before`      | Date must be before another field's date          |
| `greaterThan` | Value must be greater than another field's value  |
| `lessThan`    | Value must be less than another field's value     |

```json
{
  "rules": [
    { "type": "futureDate" },
    { "type": "businessDay" },
    { "type": "after", "field": "tradeDate", "message": "Settlement must be after trade date" }
  ]
}
```

### OptionsSource

Declares that a field's options should be loaded dynamically at runtime.

```json
{
  "optionsSource": { "provider": "exchanges" }
}
```

The `provider` string maps to an async function in the `optionsProviders` prop. See [Loading Options](#loading-options-from-an-api).

---

## Component Props

### DynamicForm Props

```tsx
<DynamicForm
  schema={schema}                    // Required — JSON schema from DB
  initialValues={values}             // Optional — override schema defaults
  optionsProviders={providers}       // Optional — async option loaders
  submitHandler={handler}            // Optional — custom submit function
  transformPayload={transform}       // Optional — transform before submit
  customValidators={validators}      // Optional — app-specific validators
  onLog={logFn}                      // Optional — activity logging
  onSuccess={successFn}              // Optional — success callback
  onError={errorFn}                  // Optional — error callback
  onSubmitting={submittingFn}        // Optional — submitting callback
/>
```

### initialValues

Override schema `defaultValue`s at runtime. Useful for editing existing records or pre-filling from context.

```tsx
<DynamicForm
  schema={schema}
  initialValues={{
    side: 'BUY',
    ticker: 'AAPL',
    quantity: 500,
    orderType: 'LIMIT',
  }}
/>
```

Values merge on top of schema defaults — any field not in `initialValues` still gets its schema default.

### optionsProviders

A map of async functions that return `SelectOption[]`. Each key matches a `provider` name in the schema's `optionsSource`.

```tsx
const providers: OptionsProviders = {
  exchanges: async () => {
    const res = await fetch('/api/exchanges');
    return res.json(); // must return SelectOption[]
  },
  currencies: fetchCurrencies,
};

<DynamicForm schema={schema} optionsProviders={providers} />
```

Fields show a loading spinner while options are being fetched.

### submitHandler

Override the default `fetch()` to `schema.submission.url`. Use this to call your own API layer.

```tsx
<DynamicForm
  schema={schema}
  submitHandler={async (values) => {
    const res = await myApiClient.post('/trades', values);
    return res.data;
  }}
/>
```

### transformPayload

Transform form values before they are sent to the submit handler.

```tsx
<DynamicForm
  schema={schema}
  transformPayload={(values) => ({
    ...values,
    submittedAt: new Date().toISOString(),
    userId: currentUser.id,
  })}
/>
```

### customValidators

Register app-specific validators that can be referenced by name in schema `rules`.

```tsx
<DynamicForm
  schema={schema}
  customValidators={{
    myCustomRule: (value) => {
      if (someCondition(value)) return 'Custom error message';
      return true;
    },
  }}
/>
```

Then in your schema JSON:
```json
{ "rules": [{ "type": "myCustomRule" }] }
```

### Callbacks

```tsx
<DynamicForm
  schema={schema}
  onSuccess={(response, values) => {
    // Called after successful submission
    toast.success(`Order ${response.orderId} submitted!`);
  }}
  onError={(error, values) => {
    // Called when submission fails
    toast.error(error.message);
  }}
  onSubmitting={(values) => {
    // Called when submission starts
    console.log('Submitting:', values);
  }}
  onLog={(entry) => {
    // Activity log entry (info/success/error/warning)
    myLogger.log(entry);
  }}
/>
```

---

## Layout & Responsiveness

### Grid System

Every field has a `gridSize` property that controls its width at each breakpoint (MUI Grid2, 12-column system):

| Breakpoint | Minimum Width | Typical Use              |
|------------|---------------|--------------------------|
| `xs`       | 0px           | Mobile — usually 12 (full width) |
| `sm`       | 600px         | Tablet — 6 (2 per row)  |
| `md`       | 900px         | Desktop — 4 (3 per row) |
| `lg`       | 1200px        | Wide — 3 or 4           |
| `xl`       | 1536px        | Ultra-wide — 2 or 3     |

**Default** (if no `gridSize` is specified): `{ xs: 12, sm: 6, lg: 4, xl: 3 }`

This means on a trader's ultra-wide monitor, fields automatically arrange 4 per row.

### Density

Control spacing via the schema's `density` property:

| Density       | Grid Spacing | Padding | Best For                        |
|---------------|--------------|---------|---------------------------------|
| `'dense'`     | 8px          | 16px    | Maximum information density     |
| `'compact'`   | 12px         | 20px    | Trading desks, dashboards       |
| `'comfortable'`| 16px        | 24px    | Standard forms (default)        |

```json
{
  "id": "my-form",
  "title": "My Form",
  "density": "compact",
  "sections": [...]
}
```

### Wide Screen (Trader) Layout

For trader desks with 2560px+ monitors:

1. **Use `density: 'compact'`** — tighter spacing, more fields visible.
2. **Set `gridSize` with `lg` and `xl`** — pack 3-4 fields per row:
   ```json
   { "gridSize": { "xs": 12, "sm": 6, "md": 3 } }
   ```
3. **The app container uses `maxWidth="xl"`** — forms fill the width.
4. **Radio groups render inline** (`row` mode) — buy/sell toggles are horizontal.

---

## Recipes

### Loading Options from an API

**Schema (JSON):**
```json
{
  "name": "exchange",
  "label": "Exchange",
  "type": "autocomplete",
  "optionsSource": { "provider": "exchanges" }
}
```

**Component:**
```tsx
<DynamicForm
  schema={schema}
  optionsProviders={{
    exchanges: async () => {
      const res = await fetch('/api/exchanges');
      const data = await res.json();
      return data.map(e => ({ value: e.mic, label: e.name }));
    },
  }}
/>
```

### Loading Options from React Context

```tsx
function MyForm({ schema }) {
  const { exchanges, currencies } = useMarketDataContext();

  const providers = useMemo(() => ({
    exchanges: async () => exchanges.map(e => ({ value: e.mic, label: e.name })),
    currencies: async () => currencies.map(c => ({ value: c.code, label: `${c.code} - ${c.name}` })),
  }), [exchanges, currencies]);

  return <DynamicForm schema={schema} optionsProviders={providers} />;
}
```

### Pre-filling from Context or Props

```tsx
function EditOrderForm({ schema, order }) {
  return (
    <DynamicForm
      schema={schema}
      initialValues={{
        side: order.side,
        ticker: order.ticker,
        quantity: order.quantity,
        price: order.price,
      }}
    />
  );
}
```

### Custom Validators

```tsx
// Register at the component level
<DynamicForm
  schema={schema}
  customValidators={{
    evenNumber: (value) => {
      if (typeof value === 'number' && value % 2 !== 0) {
        return 'Must be an even number';
      }
      return true;
    },
    notWeekend: (value) => {
      const d = new Date(value as string);
      if (d.getDay() === 0 || d.getDay() === 6) {
        return 'Cannot select a weekend';
      }
      return true;
    },
  }}
/>
```

Reference in JSON:
```json
{ "rules": [{ "type": "evenNumber" }, { "type": "notWeekend" }] }
```

### Conditional Fields

```json
{
  "name": "stopPrice",
  "label": "Stop Price",
  "type": "currency",
  "visible": {
    "field": "orderType",
    "operator": "in",
    "value": ["STOP", "STOP_LIMIT"]
  },
  "disabled": {
    "field": "orderType",
    "operator": "equals",
    "value": "MARKET"
  }
}
```

### Cross-Field Validation

```json
{
  "name": "settlementDate",
  "label": "Settlement Date",
  "type": "date",
  "validation": {
    "required": "Settlement date is required",
    "rules": [
      { "type": "futureDate" },
      { "type": "after", "field": "tradeDate", "message": "Must be after trade date" }
    ]
  }
}
```

### Custom Regex Validation

Pattern is a string (JSON-safe), converted to `RegExp` at runtime:

```json
{
  "name": "email",
  "label": "Email",
  "type": "text",
  "validation": {
    "pattern": {
      "value": "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$",
      "flags": "i",
      "message": "Invalid email address"
    }
  }
}
```

---

## Demo Forms

The project includes 6 demo forms showing different capabilities:

| Tab                    | Domain   | Highlights                                                    |
|------------------------|----------|---------------------------------------------------------------|
| **Trade Entry**        | Equity   | Conditional fields, cross-field validation, dynamic options, initial values |
| **FX Spot/Forward**    | FX       | NDF-specific fields, tenor selection, settlement methods      |
| **Credit Default Swap**| Credit   | Spread in bps, seniority, documentation clauses               |
| **Equity Options**     | Options  | Call/Put, strike, Greeks limits, auto-hedge toggle            |
| **Risk Parameters**    | Risk     | Currency/percentage fields, loss limits, auto-flatten         |
| **Patient Intake**     | Medical  | Non-finance example: address, insurance, medical history      |

---

## File Structure

```
src/
├── engine/                     # Form engine (the library)
│   ├── DynamicForm.tsx         # Main form component
│   ├── FieldRenderer.tsx       # Renders 13 field types
│   ├── useFormSubmission.ts    # Submission hook (fetch / custom)
│   ├── useFieldOptions.ts      # Async option loading hook
│   ├── conditions.ts           # Declarative condition evaluator
│   └── validators.ts           # Built-in + custom validator registry
│
├── types/
│   └── index.ts                # All TypeScript interfaces (JSON-serializable)
│
├── demo/                       # Example forms
│   ├── TradeEntryForm.tsx
│   ├── FxSpotForwardForm.tsx
│   ├── CreditDefaultSwapForm.tsx
│   ├── EquityOptionsForm.tsx
│   ├── RiskParametersForm.tsx
│   ├── PatientIntakeForm.tsx
│   └── mockApi.ts              # Mock API handlers & option providers
│
├── App.tsx                     # Demo app shell with tabs
├── theme.ts                    # Dark financial terminal theme
└── main.tsx                    # Entry point
```
