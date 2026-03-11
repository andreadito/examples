export type OperationType =
  | 'where' | 'select' | 'sort' | 'groupBy' | 'join'
  | 'first' | 'last' | 'distinct' | 'map' | 'reduce'
  | 'rollup' | 'pivot' | 'flatten' | 'transpose';

export interface WhereConfig { condition: string }
export interface SelectConfig { fields: string[]; expressions: string[] }
export interface SortConfig { criteria: Array<{ field: string; direction: 'asc' | 'desc' }> }
export interface GroupByConfig { fields: string[] }
export interface JoinConfig { rightSource: string; condition: string }
export interface FirstLastConfig { count: number }
export interface DistinctConfig { fields: string[] }
export interface MapConfig { expressions: string[] }
export interface ReduceConfig { initial: string; accumulator: string }
export interface RollupConfig { keys: string[]; aggregates: string[] }
export interface PivotConfig { pivotField: string; aggregates: string[] }
export interface FlattenConfig { field: string }
export interface TransposeConfig { headerField: string }

export type StepConfig =
  | { type: 'where'; config: WhereConfig }
  | { type: 'select'; config: SelectConfig }
  | { type: 'sort'; config: SortConfig }
  | { type: 'groupBy'; config: GroupByConfig }
  | { type: 'join'; config: JoinConfig }
  | { type: 'first'; config: FirstLastConfig }
  | { type: 'last'; config: FirstLastConfig }
  | { type: 'distinct'; config: DistinctConfig }
  | { type: 'map'; config: MapConfig }
  | { type: 'reduce'; config: ReduceConfig }
  | { type: 'rollup'; config: RollupConfig }
  | { type: 'pivot'; config: PivotConfig }
  | { type: 'flatten'; config: FlattenConfig }
  | { type: 'transpose'; config: TransposeConfig };

export interface PipelineStep {
  id: string;
  step: StepConfig;
}

export const OPERATION_LABELS: Record<OperationType, string> = {
  where: 'Filter (where)',
  select: 'Select fields',
  sort: 'Sort',
  groupBy: 'Group By',
  join: 'Join',
  first: 'First N',
  last: 'Last N',
  distinct: 'Distinct',
  map: 'Map (add fields)',
  reduce: 'Reduce',
  rollup: 'Rollup',
  pivot: 'Pivot',
  flatten: 'Flatten',
  transpose: 'Transpose',
};

export const ALL_OPERATIONS: OperationType[] = [
  'where', 'select', 'sort', 'groupBy', 'join',
  'first', 'last', 'distinct', 'map', 'reduce',
  'rollup', 'pivot', 'flatten', 'transpose',
];

export function createDefaultConfig(type: OperationType): StepConfig {
  switch (type) {
    case 'where': return { type, config: { condition: '' } };
    case 'select': return { type, config: { fields: [], expressions: [] } };
    case 'sort': return { type, config: { criteria: [{ field: '', direction: 'asc' as const }] } };
    case 'groupBy': return { type, config: { fields: [] } };
    case 'join': return { type, config: { rightSource: '', condition: '' } };
    case 'first': return { type, config: { count: 10 } };
    case 'last': return { type, config: { count: 10 } };
    case 'distinct': return { type, config: { fields: [] } };
    case 'map': return { type, config: { expressions: [''] } };
    case 'reduce': return { type, config: { initial: '0', accumulator: '' } };
    case 'rollup': return { type, config: { keys: [], aggregates: [''] } };
    case 'pivot': return { type, config: { pivotField: '', aggregates: [''] } };
    case 'flatten': return { type, config: { field: '' } };
    case 'transpose': return { type, config: { headerField: '' } };
  }
}

// ─── DSL Generation ───────────────────────────────────────────────────────────

export function generateQuery(source: string, steps: PipelineStep[]): string {
  if (!source) return '';
  const parts = [source];
  for (const { step } of steps) {
    const dsl = stepToDsl(step);
    if (dsl) parts.push(dsl);
  }
  return parts.join(' | ');
}

function stepToDsl(step: StepConfig): string | null {
  switch (step.type) {
    case 'where':
      return step.config.condition ? `where(${step.config.condition})` : null;
    case 'select': {
      const all = [...step.config.fields, ...step.config.expressions.filter(Boolean)];
      return all.length > 0 ? `select(${all.join(', ')})` : null;
    }
    case 'sort': {
      const parts = step.config.criteria
        .filter(c => c.field)
        .map(c => c.direction === 'desc' ? `${c.field} desc` : c.field);
      return parts.length > 0 ? `sort(${parts.join(', ')})` : null;
    }
    case 'groupBy':
      return step.config.fields.length > 0 ? `groupBy(${step.config.fields.join(', ')})` : null;
    case 'join':
      return step.config.rightSource && step.config.condition
        ? `join(${step.config.rightSource}, ${step.config.condition})` : null;
    case 'first':
      return `first(${step.config.count})`;
    case 'last':
      return `last(${step.config.count})`;
    case 'distinct':
      return step.config.fields.length > 0 ? `distinct(${step.config.fields.join(', ')})` : 'distinct()';
    case 'map': {
      const exprs = step.config.expressions.filter(Boolean);
      return exprs.length > 0 ? `map(${exprs.join(', ')})` : null;
    }
    case 'reduce':
      return step.config.initial && step.config.accumulator
        ? `reduce(${step.config.initial}, ${step.config.accumulator})` : null;
    case 'rollup': {
      const parts = [...step.config.keys, ...step.config.aggregates.filter(Boolean)];
      return parts.length > 0 ? `rollup(${parts.join(', ')})` : null;
    }
    case 'pivot': {
      const aggs = step.config.aggregates.filter(Boolean);
      return step.config.pivotField && aggs.length > 0
        ? `pivot(${step.config.pivotField}, ${aggs.join(', ')})` : null;
    }
    case 'flatten':
      return step.config.field ? `flatten(${step.config.field})` : 'flatten()';
    case 'transpose':
      return step.config.headerField ? `transpose(${step.config.headerField})` : 'transpose()';
  }
}
