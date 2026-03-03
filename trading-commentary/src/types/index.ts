// ─── Placeholder Definition ──────────────────────────────────────────────────

export interface PlaceholderDefinition {
  /** The placeholder token, e.g. "market.price.last" */
  token: string;
  /** Human-readable label shown in the picker, e.g. "Last Price" */
  label: string;
  /** Optional description/tooltip */
  description?: string;
  /** Example resolved value for preview hints, e.g. "$142.50" */
  example?: string;
}

export interface PlaceholderCategory {
  /** Category ID */
  id: string;
  /** Display label, e.g. "Market Data", "Position", "Risk" */
  label: string;
  /** Placeholders in this category */
  placeholders: PlaceholderDefinition[];
}

// ─── Commentary Config (100% JSON-serializable) ─────────────────────────────

export interface CommentaryConfig {
  /** Unique ID for this commentary configuration */
  id: string;
  /** Display title */
  title: string;
  /** Optional description */
  description?: string;
  /** Prefix used to identify placeholders in the markdown text.
   *  Default: ":::" — so a placeholder looks like :::market.price.last */
  placeholderPrefix?: string;
  /** Editor settings */
  editor?: {
    /** Initial height in pixels (default: 300) */
    height?: number;
    /** Whether to show the live preview panel by default (default: true) */
    showPreview?: boolean;
    /** Toolbar items to show. If omitted, uses a compact default set */
    toolbar?: (
      | 'bold'
      | 'italic'
      | 'heading'
      | 'unordered-list'
      | 'ordered-list'
      | 'code'
      | 'table'
      | 'link'
      | 'quote'
      | 'strikethrough'
    )[];
    /** Max character count (optional) */
    maxLength?: number;
  };
  /** Default markdown template content (optional) */
  defaultContent?: string;
}

// ─── Runtime Types (passed as component props, NOT in config) ────────────────

/** Resolves a placeholder token to its display value. Return undefined if unresolvable. */
export type PlaceholderReplacer = (token: string) => string | undefined;
