import type { FunctionComponent } from 'react';
import { Box, Chip, Stack, Typography } from '@mui/material';
import type { JsonRenderComponentProps } from '../extension';
import { formatValue } from './format';

/**
 * Terminal-grade market components (quote board, order book, news feed).
 * Financial data is set in a monospace stack by design — alignment and
 * fixed-width digits matter more than matching the host's body face.
 */
export const MONO_FONT =
  "ui-monospace, 'SF Mono', 'Roboto Mono', 'JetBrains Mono', Menlo, Consolas, monospace";

type Row = Record<string, unknown>;

const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const str = (v: unknown, fallback: string): string => (typeof v === 'string' && v ? v : fallback);

function QuoteBoardImpl({ props }: JsonRenderComponentProps) {
  const rows = Array.isArray(props.data) ? (props.data as Row[]) : [];
  const symbolKey = str(props.symbolKey, 'symbol');
  const priceKey = str(props.priceKey, 'lastPrice');
  const changeKey = str(props.changeKey, 'pnlPct');
  const minTileWidth = num(props.minTileWidth) || 128;

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: `repeat(auto-fill, minmax(${minTileWidth}px, 1fr))`,
        gap: '1px',
        bgcolor: 'divider',
        border: '1px solid',
        borderColor: 'divider',
      }}
    >
      {rows.map((row, i) => {
        const change = num(row[changeKey]);
        const up = change >= 0;
        return (
          <Box key={i} sx={{ bgcolor: 'background.paper', p: 1, minWidth: 0 }}>
            <Typography component="div" sx={{ fontFamily: MONO_FONT, fontSize: '0.6875rem', fontWeight: 700, color: 'text.secondary' }}>
              {String(row[symbolKey] ?? '')}
            </Typography>
            <Typography component="div" sx={{ fontFamily: MONO_FONT, fontSize: '1rem', fontWeight: 700, lineHeight: 1.3 }}>
              {formatValue(row[priceKey], 'currency')}
            </Typography>
            <Typography
              component="div"
              sx={{ fontFamily: MONO_FONT, fontSize: '0.6875rem', fontWeight: 600, color: up ? 'success.main' : 'error.main' }}
            >
              {up ? '▲' : '▼'} {formatValue(Math.abs(change), 'percent')}
            </Typography>
          </Box>
        );
      })}
    </Box>
  );
}

interface BookSide {
  rows: Row[];
  priceKey: string;
  sizeKey: string;
}

function LadderSide({ rows, priceKey, sizeKey, side }: BookSide & { side: 'bid' | 'ask' }) {
  const maxSize = Math.max(1, ...rows.map((r) => num(r[sizeKey])));
  const color = side === 'bid' ? 'success.main' : 'error.main';
  return (
    <Box sx={{ flex: 1, minWidth: 0 }}>
      {rows.map((row, i) => {
        const depth = Math.round((num(row[sizeKey]) / maxSize) * 100);
        return (
          <Box
            key={i}
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              px: 1,
              py: '1px',
              fontFamily: MONO_FONT,
              fontSize: '0.6875rem',
              position: 'relative',
              // Depth bar: proportional fill behind the row, anchored to the
              // book's center line (right for bids, left for asks).
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                bottom: 0,
                [side === 'bid' ? 'right' : 'left']: 0,
                width: `${depth}%`,
                bgcolor: color,
                opacity: 0.14,
              },
            }}
          >
            {side === 'bid' ? (
              <>
                <Box component="span" sx={{ color: 'text.secondary', position: 'relative' }}>{numberFmt(num(row[sizeKey]))}</Box>
                <Box component="span" sx={{ color, fontWeight: 600, position: 'relative' }}>{num(row[priceKey]).toFixed(2)}</Box>
              </>
            ) : (
              <>
                <Box component="span" sx={{ color, fontWeight: 600, position: 'relative' }}>{num(row[priceKey]).toFixed(2)}</Box>
                <Box component="span" sx={{ color: 'text.secondary', position: 'relative' }}>{numberFmt(num(row[sizeKey]))}</Box>
              </>
            )}
          </Box>
        );
      })}
    </Box>
  );
}

const numberFmt = (n: number) => new Intl.NumberFormat('en-US').format(n);

function OrderBookImpl({ props }: JsonRenderComponentProps) {
  const book = (props.data ?? {}) as Row;
  const bids = Array.isArray(book.bids) ? (book.bids as Row[]) : Array.isArray(props.bids) ? (props.bids as Row[]) : [];
  const asks = Array.isArray(book.asks) ? (book.asks as Row[]) : Array.isArray(props.asks) ? (props.asks as Row[]) : [];
  const priceKey = str(props.priceKey, 'price');
  const sizeKey = str(props.sizeKey, 'size');
  const levels = Math.max(1, num(props.levels) || 8);
  const bestBid = num(bids[0]?.[priceKey]);
  const bestAsk = num(asks[0]?.[priceKey]);
  const spread = bestAsk && bestBid ? bestAsk - bestBid : 0;

  return (
    <Box sx={{ border: '1px solid', borderColor: 'divider' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', px: 1, py: 0.5, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Typography sx={{ fontFamily: MONO_FONT, fontSize: '0.625rem', textTransform: 'uppercase', letterSpacing: 1, color: 'success.main' }}>
          Bid
        </Typography>
        <Typography sx={{ fontFamily: MONO_FONT, fontSize: '0.625rem', color: 'text.secondary' }}>
          {spread > 0 ? `spread ${spread.toFixed(2)}` : ''}
        </Typography>
        <Typography sx={{ fontFamily: MONO_FONT, fontSize: '0.625rem', textTransform: 'uppercase', letterSpacing: 1, color: 'error.main' }}>
          Ask
        </Typography>
      </Box>
      <Stack direction="row" sx={{ '& > *:first-of-type': { borderRight: '1px solid', borderColor: 'divider' } }}>
        <LadderSide rows={bids.slice(0, levels)} priceKey={priceKey} sizeKey={sizeKey} side="bid" />
        <LadderSide rows={asks.slice(0, levels)} priceKey={priceKey} sizeKey={sizeKey} side="ask" />
      </Stack>
    </Box>
  );
}

function NewsFeedImpl({ props }: JsonRenderComponentProps) {
  const rows = Array.isArray(props.data) ? (props.data as Row[]) : [];
  const titleKey = str(props.titleKey, 'headline');
  const timeKey = str(props.timeKey, 'time');
  const sourceKey = str(props.sourceKey, 'source');
  const symbolKey = str(props.symbolKey, 'symbol');
  const maxItems = Math.max(1, num(props.maxItems) || 12);

  const timeLabel = (v: unknown): string => {
    const n = Number(v);
    if (Number.isFinite(n) && n > 1e12) {
      return new Date(n).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }
    return String(v ?? '');
  };

  return (
    <Box>
      {rows.slice(0, maxItems).map((row, i) => (
        <Box
          key={i}
          sx={{
            display: 'flex',
            alignItems: 'baseline',
            gap: 1,
            px: 0.5,
            py: '3px',
            borderBottom: '1px solid',
            borderColor: 'divider',
            '&:last-child': { borderBottom: 'none' },
          }}
        >
          <Typography component="span" sx={{ fontFamily: MONO_FONT, fontSize: '0.625rem', color: 'text.secondary', flexShrink: 0 }}>
            {timeLabel(row[timeKey])}
          </Typography>
          {row[symbolKey] ? (
            <Chip label={String(row[symbolKey])} size="small" sx={{ height: 16, fontSize: '0.625rem', fontFamily: MONO_FONT, flexShrink: 0 }} />
          ) : null}
          <Typography component="span" variant="body2" sx={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {String(row[titleKey] ?? '')}
          </Typography>
          {row[sourceKey] ? (
            <Typography component="span" sx={{ fontFamily: MONO_FONT, fontSize: '0.625rem', color: 'text.secondary', ml: 'auto', flexShrink: 0 }}>
              {String(row[sourceKey])}
            </Typography>
          ) : null}
        </Box>
      ))}
    </Box>
  );
}

export const terminalComponents: Record<string, FunctionComponent<JsonRenderComponentProps>> = {
  QuoteBoard: QuoteBoardImpl,
  OrderBook: OrderBookImpl,
  NewsFeed: NewsFeedImpl,
};
