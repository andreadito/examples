import { defineRegistry } from '@json-render/react';
import type { Components } from '@json-render/react';
import { buildCatalog } from './buildCatalog';
import { transformFunctions } from './transforms';
import { layoutComponents } from './impl/layout';
import { displayComponents } from './impl/display';
import { terminalComponents } from './impl/terminal';
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
  // `Components<C>` (the type defineRegistry's `components` option expects) defines
  // ComponentFn with `props: Record<string, unknown>`, while our JsonRenderComponentProps
  // uses `props: Record<string, never> & Record<string, unknown>`. These are structurally
  // incompatible due to TypeScript's variance rules on index signatures; the intersection
  // type creates a different structural shape than the bare `Record<string, unknown>`.
  // All components conform to JsonRenderComponentProps at runtime, so the double cast via
  // `unknown` bypasses the structural mismatch. Extensions are now constrained to
  // FunctionComponent (no class components), so this cast is safe.
  const mergedComponents = {
    ...layoutComponents,
    ...terminalComponents,
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
