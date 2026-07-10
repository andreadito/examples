import { defineCatalog } from '@json-render/core';
import { schema } from '@json-render/react/schema';
import { z } from 'zod';
import { coreDefinitions } from './definitions';
import { transformDeclarations } from './transforms';
import type { CatalogExtension } from './extension';

export function buildCatalog(extensions: CatalogExtension[] = []) {
  const components: Record<string, { props: z.ZodObject<z.ZodRawShape>; slots?: string[]; description?: string }> = {
    ...coreDefinitions,
  };
  for (const ext of extensions) {
    components[ext.type] = ext.definition;
  }
  return defineCatalog(schema, {
    components,
    actions: {
      emit: {
        params: z.object({ name: z.string(), payload: z.record(z.string(), z.any()).nullable() }),
        description: 'Notify the host application of a user interaction. Use for submit/select/row-click style events.',
      },
    },
    functions: transformDeclarations,
  });
}
