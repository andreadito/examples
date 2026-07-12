// Library finding (Task 5/6, see catalog/definitions.ts): every element in a
// json-render spec must carry an explicit `visible` key. Hand-authored /
// LLM-generated JSON routinely omits it, or emits `visible: null` — both of
// which are semantically "always visible" to a human reading the spec, but:
//   - an ABSENT `visible` key fails `catalog.validate()` (the schema's
//     `visible` field is a required, non-optional `z.any()`).
//   - `visible: null` PASSES `catalog.validate()` but crashes the renderer:
//     `@json-render/react`'s `ElementRenderer` only short-circuits on
//     `visible === undefined`; any other value (including `null`) falls
//     through to `@json-render/core`'s `evaluateVisibility` /
//     `evaluateCondition`, which does `"$index" in cond` — and
//     `"$index" in null` throws a TypeError.
//
// `visible: true` is safe on both counts: it satisfies the presence check,
// and the renderer/evaluator special-case boolean values before ever
// reaching the `"$index" in cond` code path. We deliberately do NOT default
// to `visible: undefined` (which would also dodge the render crash): once a
// spec round-trips through `JSON.stringify` (e.g. embedded back into a
// follow-up prompt as `currentSpec`), an `undefined` value is dropped
// entirely by JSON serialization, silently reintroducing the "absent key"
// failure on the next validation pass. `true` survives serialization.
//
// This module normalizes LLM tool-call input before it is handed to
// `catalog.validate()` / the strict validator, so generated specs don't fail
// validation (missing `visible`) or crash the renderer (`visible: null`) due
// to a stylistic omission that has no bearing on the actual UI intent.
export function normalizeSpec(spec: unknown): unknown {
  if (spec === null || typeof spec !== 'object' || Array.isArray(spec)) {
    return spec;
  }
  const s = spec as Record<string, unknown>;
  if (s.elements === null || typeof s.elements !== 'object' || Array.isArray(s.elements)) {
    return spec;
  }
  const elements = s.elements as Record<string, unknown>;
  const normalizedElements: Record<string, unknown> = {};
  for (const [id, rawElement] of Object.entries(elements)) {
    if (rawElement === null || typeof rawElement !== 'object' || Array.isArray(rawElement)) {
      normalizedElements[id] = rawElement;
      continue;
    }
    const element = rawElement as Record<string, unknown>;
    const visible = element.visible;
    normalizedElements[id] = {
      ...element,
      visible: visible === undefined || visible === null ? true : visible,
      children: element.children === undefined ? [] : element.children,
      props: element.props === undefined ? {} : element.props,
    };
  }
  return { ...s, elements: normalizedElements };
}
