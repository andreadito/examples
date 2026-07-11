import { defineRegistry } from '@json-render/react';
import type { Components } from '@json-render/react';
import { buildCatalog } from './buildCatalog';
import { transformFunctions } from './transforms';
import { layoutComponents } from './impl/layout';
import { displayComponents } from './impl/display';
import { inputComponents } from './impl/inputs';
import { chartComponents } from './impl/charts';
import { gridComponents } from './impl/grid';
import type { CatalogExtension } from './extension';

export function buildRuntime({
  extensions = [],
  emit,
}: {
  extensions?: CatalogExtension[];
  emit: (name: string, payload?: Record<string, unknown>) => void;
}) {
  const catalog = buildCatalog(extensions);
  const extComponents = Object.fromEntries(extensions.map((e) => [e.type, e.component]));
  // `Components<C>` (the type defineRegistry's `components` option expects) is a
  // record of bare render functions, whereas our impl files (and
  // `CatalogExtension.component`) are typed as `ComponentType<JsonRenderComponentProps>`
  // (a React.ComponentType — function OR class) to match the extension contract
  // from Task 5. The class-component branch of that union has no overlap with
  // `Components<C>`'s function-only signature, so a single `as` cast is
  // rejected by tsc; every impl here is in fact a plain function component, so
  // the double cast is safe.
  const mergedComponents = {
    ...layoutComponents,
    ...displayComponents,
    ...inputComponents,
    ...chartComponents,
    ...gridComponents,
    ...extComponents,
  };
  const { registry, handlers } = defineRegistry(catalog, {
    components: mergedComponents as unknown as Components<typeof catalog>,
    actions: {
      emit: async (params: Record<string, unknown> | undefined) => {
        emit(String(params?.name ?? 'event'), (params?.payload as Record<string, unknown>) ?? undefined);
      },
    },
  });
  return { catalog, registry, handlers, functions: transformFunctions };
}
