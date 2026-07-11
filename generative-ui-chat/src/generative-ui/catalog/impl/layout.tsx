import type { ComponentType } from 'react';
import { Box as MuiBox, Card as MuiCard, CardContent, CardHeader, Divider as MuiDivider, Stack as MuiStack } from '@mui/material';
import type { JsonRenderComponentProps } from '../extension';
import { toSx } from '../styleTokens';
import type { SxSubset } from '../styleTokens';

function StackImpl({ props, children }: JsonRenderComponentProps) {
  return (
    <MuiStack
      direction={(props.direction as 'row' | 'column') ?? 'column'}
      spacing={typeof props.gap === 'number' ? props.gap : undefined}
      flexWrap={props.wrap ? 'wrap' : undefined}
      sx={toSx(props.sx as SxSubset | null | undefined)}
    >
      {children}
    </MuiStack>
  );
}

function BoxImpl({ props, children }: JsonRenderComponentProps) {
  return <MuiBox sx={toSx(props.sx as SxSubset | null | undefined)}>{children}</MuiBox>;
}

function CardImpl({ props, children }: JsonRenderComponentProps) {
  const title = props.title as string | null | undefined;
  const subtitle = props.subtitle as string | null | undefined;
  return (
    <MuiCard sx={toSx(props.sx as SxSubset | null | undefined)}>
      {title || subtitle ? <CardHeader title={title ?? undefined} subheader={subtitle ?? undefined} /> : null}
      <CardContent>{children}</CardContent>
    </MuiCard>
  );
}

function DividerImpl() {
  return <MuiDivider />;
}

export const layoutComponents: Record<string, ComponentType<JsonRenderComponentProps>> = {
  Stack: StackImpl,
  Box: BoxImpl,
  Card: CardImpl,
  Divider: DividerImpl,
};
