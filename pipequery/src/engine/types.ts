// ─── Token Types ─────────────────────────────────────────────────────────────

export type TokenType =
  | 'IDENTIFIER'
  | 'NUMBER'
  | 'STRING'
  | 'BOOLEAN'
  | 'PIPE'
  | 'LPAREN'
  | 'RPAREN'
  | 'COMMA'
  | 'DOT'
  | 'GT'
  | 'GTE'
  | 'LT'
  | 'LTE'
  | 'EQ'
  | 'NEQ'
  | 'AND'
  | 'OR'
  | 'NOT'
  | 'PLUS'
  | 'MINUS'
  | 'STAR'
  | 'SLASH'
  | 'MOD'
  | 'AS'
  | 'ASC'
  | 'DESC'
  | 'NULL'
  | 'EOF';

export interface Token {
  type: TokenType;
  value: string;
  position: number;
  line: number;
  column: number;
}

// ─── AST Expression Nodes ────────────────────────────────────────────────────

export interface NumberLiteral {
  kind: 'NumberLiteral';
  value: number;
}

export interface StringLiteral {
  kind: 'StringLiteral';
  value: string;
}

export interface BooleanLiteral {
  kind: 'BooleanLiteral';
  value: boolean;
}

export interface NullLiteral {
  kind: 'NullLiteral';
}

export interface FieldAccess {
  kind: 'FieldAccess';
  path: string[];
}

export interface BinaryExpr {
  kind: 'BinaryExpr';
  operator: '>' | '>=' | '<' | '<=' | '==' | '!=' | '&&' | '||' | '+' | '-' | '*' | '/' | '%';
  left: Expression;
  right: Expression;
}

export interface UnaryExpr {
  kind: 'UnaryExpr';
  operator: '!' | '-';
  operand: Expression;
}

export interface FunctionCall {
  kind: 'FunctionCall';
  name: string;
  args: Expression[];
}

export interface AliasExpr {
  kind: 'AliasExpr';
  expression: Expression;
  alias: string;
}

export type Expression =
  | NumberLiteral
  | StringLiteral
  | BooleanLiteral
  | NullLiteral
  | FieldAccess
  | BinaryExpr
  | UnaryExpr
  | FunctionCall
  | AliasExpr;

// ─── AST Operation Nodes ────────────────────────────────────────────────────

export interface WhereOp {
  kind: 'WhereOp';
  condition: Expression;
}

export interface SelectOp {
  kind: 'SelectOp';
  fields: Expression[];
}

export interface SortOp {
  kind: 'SortOp';
  criteria: Array<{ expression: Expression; direction: 'asc' | 'desc' }>;
}

export interface GroupByOp {
  kind: 'GroupByOp';
  keys: Expression[];
}

export interface JoinOp {
  kind: 'JoinOp';
  right: string;
  condition: Expression;
}

export interface FirstOp {
  kind: 'FirstOp';
  count: number;
}

export interface LastOp {
  kind: 'LastOp';
  count: number;
}

export interface DistinctOp {
  kind: 'DistinctOp';
  fields?: Expression[];
}

export interface FlattenOp {
  kind: 'FlattenOp';
  field?: Expression;
}

export interface AggregateOp {
  kind: 'AggregateOp';
  function: 'sum' | 'avg' | 'min' | 'max' | 'count';
  field?: Expression;
}

export interface RollupOp {
  kind: 'RollupOp';
  keys: Expression[];
  aggregates: Expression[];
}

export interface PivotOp {
  kind: 'PivotOp';
  pivotField: Expression;
  aggregates: Expression[];
}

export interface TransposeOp {
  kind: 'TransposeOp';
  headerField?: Expression;
}

export interface MapOp {
  kind: 'MapOp';
  fields: Expression[];
}

export interface ReduceOp {
  kind: 'ReduceOp';
  initial: Expression;
  accumulator: Expression;
}

export type Operation =
  | WhereOp
  | SelectOp
  | SortOp
  | GroupByOp
  | JoinOp
  | FirstOp
  | LastOp
  | DistinctOp
  | FlattenOp
  | AggregateOp
  | RollupOp
  | PivotOp
  | TransposeOp
  | MapOp
  | ReduceOp;

// ─── Pipeline (Top-Level AST) ───────────────────────────────────────────────

export interface Pipeline {
  kind: 'Pipeline';
  source: string;
  operations: Operation[];
}

// ─── Error Types ─────────────────────────────────────────────────────────────

export class DataWeaveError extends Error {
  position: number;
  line: number;
  column: number;
  constructor(message: string, position: number, line: number, column: number) {
    super(message);
    this.name = 'DataWeaveError';
    this.position = position;
    this.line = line;
    this.column = column;
  }
}

export class LexerError extends DataWeaveError {
  constructor(message: string, position: number, line: number, column: number) {
    super(message, position, line, column);
    this.name = 'LexerError';
  }
}

export class ParseError extends DataWeaveError {
  constructor(message: string, position: number, line: number, column: number) {
    super(message, position, line, column);
    this.name = 'ParseError';
  }
}

export class RuntimeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RuntimeError';
  }
}

// ─── Compiled Query ──────────────────────────────────────────────────────────

export type DataContext = Record<string, unknown[]>;
export type RowData = Record<string, unknown>;

export interface CompiledQuery {
  (context: DataContext): unknown;
  source: string;
  ast: Pipeline;
}
