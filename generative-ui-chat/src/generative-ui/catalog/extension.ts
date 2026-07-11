import type { FunctionComponent, ReactNode } from 'react';
import type { z } from 'zod';

/** Props every registered json-render component receives (ComponentContext). */
export interface JsonRenderComponentProps {
  props: Record<string, never> & Record<string, unknown>;
  children?: ReactNode;
  emit: (event: string) => void;
  bindings?: Record<string, string>;
  loading?: boolean;
}

export interface CatalogExtension {
  type: string;
  definition: {
    props: z.ZodObject<z.ZodRawShape>;
    slots?: string[];
    description?: string;
  };
  component: FunctionComponent<JsonRenderComponentProps>;
}

/** Identity helper — exists for inference/documentation at call sites. */
export function defineCatalogComponent(ext: CatalogExtension): CatalogExtension {
  return ext;
}
