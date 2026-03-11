import {
  TextField,
  Stack,
  Autocomplete,
  ToggleButton,
  ToggleButtonGroup,
  Button,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import type { StepConfig } from './types.ts';

const MONO = '"JetBrains Mono", "Fira Code", monospace';

export default function StepConfigForm({
  step,
  availableFields,
  joinSources,
  compact,
  onChange,
}: {
  step: StepConfig;
  availableFields: string[];
  joinSources: string[];
  compact: boolean;
  onChange: (step: StepConfig) => void;
}) {
  const sp = compact ? 0.5 : 1;
  const mono = { fontFamily: MONO, fontSize: compact ? '0.72rem' : '0.8rem' };
  const btnSz = compact ? '0.65rem' : '0.75rem';

  switch (step.type) {
    case 'where':
      return (
        <TextField
          size="small" fullWidth placeholder="e.g. price > 100"
          value={step.config.condition}
          onChange={e => onChange({ ...step, config: { condition: e.target.value } })}
          slotProps={{ input: { sx: mono } }}
        />
      );

    case 'select':
      return (
        <Stack spacing={sp}>
          <Autocomplete
            multiple size="small" freeSolo options={availableFields}
            value={step.config.fields}
            onChange={(_, v) => onChange({ ...step, config: { ...step.config, fields: v } })}
            renderInput={p => <TextField {...p} placeholder="Fields..." InputProps={p.InputProps} sx={{ '& input': mono }} />}
          />
          {step.config.expressions.map((expr, i) => (
            <TextField
              key={i} size="small" fullWidth placeholder="e.g. price * 1.1 as priceWithTax"
              value={expr}
              onChange={e => {
                const exprs = [...step.config.expressions];
                exprs[i] = e.target.value;
                onChange({ ...step, config: { ...step.config, expressions: exprs } });
              }}
              slotProps={{ input: { sx: mono } }}
            />
          ))}
          <Button size="small" sx={{ fontSize: btnSz, py: 0.25, alignSelf: 'flex-start' }}
            onClick={() => onChange({ ...step, config: { ...step.config, expressions: [...step.config.expressions, ''] } })}>
            + expr
          </Button>
        </Stack>
      );

    case 'sort':
      return (
        <Stack spacing={sp}>
          {step.config.criteria.map((c, i) => (
            <Stack key={i} direction="row" spacing={0.5} alignItems="center">
              <Autocomplete
                size="small" freeSolo options={availableFields} sx={{ flex: 1 }}
                value={c.field}
                onInputChange={(_, v) => {
                  const criteria = [...step.config.criteria];
                  criteria[i] = { ...criteria[i], field: v };
                  onChange({ ...step, config: { criteria } });
                }}
                renderInput={p => <TextField {...p} placeholder="Field" InputProps={p.InputProps} sx={{ '& input': mono }} />}
              />
              <ToggleButtonGroup
                size="small" exclusive
                value={c.direction}
                onChange={(_, v) => {
                  if (!v) return;
                  const criteria = [...step.config.criteria];
                  criteria[i] = { ...criteria[i], direction: v };
                  onChange({ ...step, config: { criteria } });
                }}
              >
                <ToggleButton value="asc" sx={{ px: 0.75, fontSize: compact ? '0.6rem' : '0.7rem' }}>ASC</ToggleButton>
                <ToggleButton value="desc" sx={{ px: 0.75, fontSize: compact ? '0.6rem' : '0.7rem' }}>DESC</ToggleButton>
              </ToggleButtonGroup>
              {step.config.criteria.length > 1 && (
                <IconButton size="small" sx={{ p: 0.25 }} onClick={() => {
                  const criteria = step.config.criteria.filter((_, j) => j !== i);
                  onChange({ ...step, config: { criteria } });
                }}>
                  <DeleteOutlineIcon sx={{ fontSize: compact ? 12 : 14 }} />
                </IconButton>
              )}
            </Stack>
          ))}
          <Button size="small" sx={{ fontSize: btnSz, py: 0.25, alignSelf: 'flex-start' }}
            onClick={() => onChange({ ...step, config: { criteria: [...step.config.criteria, { field: '', direction: 'asc' as const }] } })}>
            + criterion
          </Button>
        </Stack>
      );

    case 'groupBy':
      return (
        <Autocomplete
          multiple size="small" freeSolo options={availableFields}
          value={step.config.fields}
          onChange={(_, v) => onChange({ ...step, config: { fields: v } })}
          renderInput={p => <TextField {...p} placeholder="Fields to group by..." InputProps={p.InputProps} sx={{ '& input': mono }} />}
        />
      );

    case 'join':
      return (
        <Stack spacing={sp}>
          <FormControl size="small" fullWidth>
            <InputLabel>Right source</InputLabel>
            <Select
              value={step.config.rightSource}
              label="Right source"
              onChange={e => onChange({ ...step, config: { ...step.config, rightSource: e.target.value } })}
            >
              {joinSources.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
            </Select>
          </FormControl>
          <TextField
            size="small" fullWidth placeholder="e.g. customerId == id"
            value={step.config.condition}
            onChange={e => onChange({ ...step, config: { ...step.config, condition: e.target.value } })}
            slotProps={{ input: { sx: mono } }}
          />
        </Stack>
      );

    case 'first':
    case 'last':
      return (
        <TextField
          size="small" type="number" fullWidth
          value={step.config.count}
          onChange={e => onChange({ ...step, config: { count: Number(e.target.value) || 1 } })}
          slotProps={{ input: { sx: mono } }}
        />
      );

    case 'distinct':
      return (
        <Autocomplete
          multiple size="small" freeSolo options={availableFields}
          value={step.config.fields}
          onChange={(_, v) => onChange({ ...step, config: { fields: v } })}
          renderInput={p => <TextField {...p} placeholder="Fields (empty = all)..." InputProps={p.InputProps} sx={{ '& input': mono }} />}
        />
      );

    case 'map':
      return (
        <Stack spacing={sp}>
          {step.config.expressions.map((expr, i) => (
            <TextField
              key={i} size="small" fullWidth placeholder="e.g. price * 1.1 as priceWithTax"
              value={expr}
              onChange={e => {
                const expressions = [...step.config.expressions];
                expressions[i] = e.target.value;
                onChange({ ...step, config: { expressions } });
              }}
              slotProps={{ input: { sx: mono } }}
            />
          ))}
          <Button size="small" sx={{ fontSize: btnSz, py: 0.25, alignSelf: 'flex-start' }}
            onClick={() => onChange({ ...step, config: { expressions: [...step.config.expressions, ''] } })}>
            + expr
          </Button>
        </Stack>
      );

    case 'reduce':
      return (
        <Stack spacing={sp}>
          <TextField
            size="small" fullWidth label="Initial" placeholder="e.g. 0"
            value={step.config.initial}
            onChange={e => onChange({ ...step, config: { ...step.config, initial: e.target.value } })}
            slotProps={{ input: { sx: mono } }}
          />
          <TextField
            size="small" fullWidth label="Accumulator" placeholder="e.g. _acc + price"
            value={step.config.accumulator}
            onChange={e => onChange({ ...step, config: { ...step.config, accumulator: e.target.value } })}
            slotProps={{ input: { sx: mono } }}
          />
        </Stack>
      );

    case 'rollup':
      return (
        <Stack spacing={sp}>
          <Autocomplete
            multiple size="small" freeSolo options={availableFields}
            value={step.config.keys}
            onChange={(_, v) => onChange({ ...step, config: { ...step.config, keys: v } })}
            renderInput={p => <TextField {...p} placeholder="Group keys..." InputProps={p.InputProps} sx={{ '& input': mono }} />}
          />
          {step.config.aggregates.map((agg, i) => (
            <TextField
              key={i} size="small" fullWidth placeholder="e.g. sum(revenue) as total"
              value={agg}
              onChange={e => {
                const aggregates = [...step.config.aggregates];
                aggregates[i] = e.target.value;
                onChange({ ...step, config: { ...step.config, aggregates } });
              }}
              slotProps={{ input: { sx: mono } }}
            />
          ))}
          <Button size="small" sx={{ fontSize: btnSz, py: 0.25, alignSelf: 'flex-start' }}
            onClick={() => onChange({ ...step, config: { ...step.config, aggregates: [...step.config.aggregates, ''] } })}>
            + agg
          </Button>
        </Stack>
      );

    case 'pivot':
      return (
        <Stack spacing={sp}>
          <Autocomplete
            size="small" freeSolo options={availableFields}
            value={step.config.pivotField}
            onInputChange={(_, v) => onChange({ ...step, config: { ...step.config, pivotField: v } })}
            renderInput={p => <TextField {...p} placeholder="Pivot field..." InputProps={p.InputProps} sx={{ '& input': mono }} />}
          />
          {step.config.aggregates.map((agg, i) => (
            <TextField
              key={i} size="small" fullWidth placeholder="e.g. sum(revenue)"
              value={agg}
              onChange={e => {
                const aggregates = [...step.config.aggregates];
                aggregates[i] = e.target.value;
                onChange({ ...step, config: { ...step.config, aggregates } });
              }}
              slotProps={{ input: { sx: mono } }}
            />
          ))}
          <Button size="small" sx={{ fontSize: btnSz, py: 0.25, alignSelf: 'flex-start' }}
            onClick={() => onChange({ ...step, config: { ...step.config, aggregates: [...step.config.aggregates, ''] } })}>
            + agg
          </Button>
        </Stack>
      );

    case 'flatten':
      return (
        <Autocomplete
          size="small" freeSolo options={availableFields}
          value={step.config.field}
          onInputChange={(_, v) => onChange({ ...step, config: { field: v } })}
          renderInput={p => <TextField {...p} placeholder="Field (optional)..." InputProps={p.InputProps} sx={{ '& input': mono }} />}
        />
      );

    case 'transpose':
      return (
        <Autocomplete
          size="small" freeSolo options={availableFields}
          value={step.config.headerField}
          onInputChange={(_, v) => onChange({ ...step, config: { headerField: v } })}
          renderInput={p => <TextField {...p} placeholder="Header field..." InputProps={p.InputProps} sx={{ '& input': mono }} />}
        />
      );
  }
}
