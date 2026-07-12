import { describe, it, expect } from 'vitest';
import { parseSourceValue, validateName, RESERVED_KEYS } from './dataSources';

describe('parseSourceValue', () => {
  it('accepts an array of objects', () => {
    expect(parseSourceValue('[{"a": 1}, {"a": 2}]')).toEqual([{ a: 1 }, { a: 2 }]);
  });

  it('accepts a single object with fields', () => {
    expect(parseSourceValue('{"region": "EMEA", "revenue": 12}')).toEqual({ region: 'EMEA', revenue: 12 });
  });

  it('accepts an empty array', () => {
    expect(parseSourceValue('[]')).toEqual([]);
  });

  it('rejects invalid JSON', () => {
    expect(() => parseSourceValue('{nope')).toThrow(/valid JSON/);
  });

  it('rejects arrays of non-objects and bare scalars', () => {
    expect(() => parseSourceValue('[1, 2, 3]')).toThrow(/objects/);
    expect(() => parseSourceValue('"hello"')).toThrow(/array of objects or a single object/);
    expect(() => parseSourceValue('42')).toThrow(/array of objects or a single object/);
  });
});

describe('validateName', () => {
  it('requires a simple identifier', () => {
    expect(validateName('', [])).toMatch(/required/);
    expect(validateName('my source', [])).toMatch(/identifier/);
    expect(validateName('9lives', [])).toMatch(/identifier/);
    expect(validateName('sales', [])).toBeNull();
  });

  it('rejects reserved built-in feed names and duplicates', () => {
    for (const key of RESERVED_KEYS) {
      expect(validateName(key, [])).toMatch(/built-in/);
    }
    expect(validateName('sales', ['sales'])).toMatch(/already exists/);
  });
});
