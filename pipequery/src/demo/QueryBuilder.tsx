import { useState, useCallback, useMemo, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Stack,
  Chip,
  IconButton,
  Divider,
  Autocomplete,
  ToggleButton,
  ToggleButtonGroup,
  Button,
  Menu,
  alpha,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import type { DataContext } from '../engine/index.ts';
import {
  type PipelineStep,
  type OperationType,
  type StepConfig,
  createDefaultConfig,
  generateQuery,
  OPERATION_LABELS,
  ALL_OPERATIONS,
} from './query-builder-types.ts';

interface QueryBuilderProps {
  source: string;
  onSourceChange: (source: string) => void;
  availableSources: string[];
  availableFields: string[];
  dataContext: DataContext;
  onQueryChange: (query: string) => void;
}

let nextStepId = 1;

export default function QueryBuilder({
  source,
  onSourceChange,
  availableSources,
  availableFields,
  dataContext,
  onQueryChange,
}: QueryBuilderProps) {
  const [steps, setSteps] = useState<PipelineStep[]>([]);

  const generatedQuery = useMemo(
    () => generateQuery(source, steps),
    [source, steps],
  );

  useEffect(() => {
    onQueryChange(generatedQuery);
  }, [generatedQuery, onQueryChange]);

  const addStep = useCallback((type: OperationType) => {
    setSteps(prev => [...prev, { id: `step_${nextStepId++}`, step: createDefaultConfig(type) }]);
  }, []);

  const removeStep = useCallback((id: string) => {
    setSteps(prev => prev.filter(s => s.id !== id));
  }, []);

  const moveStep = useCallback((id: string, direction: 'up' | 'down') => {
    setSteps(prev => {
      const idx = prev.findIndex(s => s.id === id);
      if (idx < 0) return prev;
      const newIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (newIdx < 0 || newIdx >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[newIdx]] = [next[newIdx], next[idx]];
      return next;
    });
  }, []);

  const updateStep = useCallback((id: string, newStep: StepConfig) => {
    setSteps(prev => prev.map(s => s.id === id ? { ...s, step: newStep } : s));
  }, []);

  const joinSources = useMemo(
    () => Object.keys(dataContext).filter(k => k !== source),
    [dataContext, source],
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, overflow: 'auto', flex: 1 }}>
      <FormControl size="small" fullWidth>
        <InputLabel>Source collection</InputLabel>
        <Select value={source} label="Source collection" onChange={e => onSourceChange(e.target.value)}>
          {availableSources.map(s => (
            <MenuItem key={s} value={s}>{s}</MenuItem>
          ))}
        </Select>
      </FormControl>

      {steps.map((step, idx) => (
        <StepCard
          key={step.id}
          step={step}
          isFirst={idx === 0}
          isLast={idx === steps.length - 1}
          availableFields={availableFields}
          joinSources={joinSources}
          onUpdate={(newStep) => updateStep(step.id, newStep)}
          onRemove={() => removeStep(step.id)}
          onMoveUp={() => moveStep(step.id, 'up')}
          onMoveDown={() => moveStep(step.id, 'down')}
        />
      ))}

      <AddStepMenu onAdd={addStep} />

      <Divider />
      <Typography variant="caption" color="text.secondary">Generated Query</Typography>
      <Box sx={{
        p: 1.5,
        bgcolor: 'background.default',
        borderRadius: 1,
        fontFamily: '"JetBrains Mono", "Fira Code", "Consolas", monospace',
        fontSize: '0.8rem',
        color: 'text.primary',
        minHeight: 40,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-all',
        lineHeight: 1.6,
      }}>
        {generatedQuery || '(select a source to begin)'}
      </Box>
    </Box>
  );
}

// ─── Step Card ──────────────────────────────────────────────────────────────

function StepCard({
  step, isFirst, isLast,
  availableFields, joinSources,
  onUpdate, onRemove, onMoveUp, onMoveDown,
}: {
  step: PipelineStep;
  isFirst: boolean;
  isLast: boolean;
  availableFields: string[];
  joinSources: string[];
  onUpdate: (step: StepConfig) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  return (
    <Paper
      variant="outlined"
      sx={{
        p: 1.5,
        border: '1px solid',
        borderColor: (t) => alpha(t.palette.primary.main, 0.2),
        '&:hover': { borderColor: (t) => alpha(t.palette.primary.main, 0.4) },
      }}
    >
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
        <Chip
          label={OPERATION_LABELS[step.step.type]}
          size="small"
          color="primary"
          sx={{ fontWeight: 600, fontSize: '0.7rem' }}
        />
        <Box sx={{ flex: 1 }} />
        <IconButton size="small" onClick={onMoveUp} disabled={isFirst}>
          <ArrowUpwardIcon sx={{ fontSize: 16 }} />
        </IconButton>
        <IconButton size="small" onClick={onMoveDown} disabled={isLast}>
          <ArrowDownwardIcon sx={{ fontSize: 16 }} />
        </IconButton>
        <IconButton size="small" onClick={onRemove} sx={{ color: 'error.main' }}>
          <DeleteIcon sx={{ fontSize: 16 }} />
        </IconButton>
      </Stack>
      <StepConfigForm
        step={step.step}
        availableFields={availableFields}
        joinSources={joinSources}
        onChange={onUpdate}
      />
    </Paper>
  );
}

// ─── Config Forms ───────────────────────────────────────────────────────────

const monoSx = { fontFamily: '"JetBrains Mono", monospace', fontSize: '0.8rem' };

function StepConfigForm({
  step, availableFields, joinSources, onChange,
}: {
  step: StepConfig;
  availableFields: string[];
  joinSources: string[];
  onChange: (step: StepConfig) => void;
}) {
  switch (step.type) {
    case 'where':
      return (
        <TextField
          size="small" fullWidth placeholder="e.g. price > 100"
          value={step.config.condition}
          onChange={e => onChange({ ...step, config: { condition: e.target.value } })}
          slotProps={{ input: { sx: monoSx } }}
        />
      );

    case 'select':
      return (
        <Stack spacing={1}>
          <Autocomplete
            multiple size="small" freeSolo options={availableFields}
            value={step.config.fields}
            onChange={(_, v) => onChange({ ...step, config: { ...step.config, fields: v } })}
            renderInput={p => <TextField {...p} placeholder="Fields..." InputProps={p.InputProps} sx={{ '& input': monoSx }} />}
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
              slotProps={{ input: { sx: monoSx } }}
            />
          ))}
          <Button size="small" onClick={() => onChange({ ...step, config: { ...step.config, expressions: [...step.config.expressions, ''] } })}>
            + expression
          </Button>
        </Stack>
      );

    case 'sort':
      return (
        <Stack spacing={1}>
          {step.config.criteria.map((c, i) => (
            <Stack key={i} direction="row" spacing={1} alignItems="center">
              <Autocomplete
                size="small" freeSolo options={availableFields} sx={{ flex: 1 }}
                value={c.field}
                onInputChange={(_, v) => {
                  const criteria = [...step.config.criteria];
                  criteria[i] = { ...criteria[i], field: v };
                  onChange({ ...step, config: { criteria } });
                }}
                renderInput={p => <TextField {...p} placeholder="Field" InputProps={p.InputProps} sx={{ '& input': monoSx }} />}
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
                <ToggleButton value="asc" sx={{ px: 1, fontSize: '0.7rem' }}>ASC</ToggleButton>
                <ToggleButton value="desc" sx={{ px: 1, fontSize: '0.7rem' }}>DESC</ToggleButton>
              </ToggleButtonGroup>
              {step.config.criteria.length > 1 && (
                <IconButton size="small" onClick={() => {
                  const criteria = step.config.criteria.filter((_, j) => j !== i);
                  onChange({ ...step, config: { criteria } });
                }}>
                  <DeleteIcon sx={{ fontSize: 14 }} />
                </IconButton>
              )}
            </Stack>
          ))}
          <Button size="small" onClick={() => onChange({ ...step, config: { criteria: [...step.config.criteria, { field: '', direction: 'asc' as const }] } })}>
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
          renderInput={p => <TextField {...p} placeholder="Fields to group by..." InputProps={p.InputProps} sx={{ '& input': monoSx }} />}
        />
      );

    case 'join':
      return (
        <Stack spacing={1}>
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
            slotProps={{ input: { sx: monoSx } }}
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
          slotProps={{ input: { sx: monoSx } }}
        />
      );

    case 'distinct':
      return (
        <Autocomplete
          multiple size="small" freeSolo options={availableFields}
          value={step.config.fields}
          onChange={(_, v) => onChange({ ...step, config: { fields: v } })}
          renderInput={p => <TextField {...p} placeholder="Fields (empty = all)..." InputProps={p.InputProps} sx={{ '& input': monoSx }} />}
        />
      );

    case 'map':
      return (
        <Stack spacing={1}>
          {step.config.expressions.map((expr, i) => (
            <TextField
              key={i} size="small" fullWidth placeholder="e.g. price * 1.1 as priceWithTax"
              value={expr}
              onChange={e => {
                const expressions = [...step.config.expressions];
                expressions[i] = e.target.value;
                onChange({ ...step, config: { expressions } });
              }}
              slotProps={{ input: { sx: monoSx } }}
            />
          ))}
          <Button size="small" onClick={() => onChange({ ...step, config: { expressions: [...step.config.expressions, ''] } })}>
            + expression
          </Button>
        </Stack>
      );

    case 'reduce':
      return (
        <Stack spacing={1}>
          <TextField
            size="small" fullWidth label="Initial value" placeholder="e.g. 0"
            value={step.config.initial}
            onChange={e => onChange({ ...step, config: { ...step.config, initial: e.target.value } })}
            slotProps={{ input: { sx: monoSx } }}
          />
          <TextField
            size="small" fullWidth label="Accumulator" placeholder="e.g. _acc + price"
            value={step.config.accumulator}
            onChange={e => onChange({ ...step, config: { ...step.config, accumulator: e.target.value } })}
            slotProps={{ input: { sx: monoSx } }}
          />
        </Stack>
      );

    case 'rollup':
      return (
        <Stack spacing={1}>
          <Autocomplete
            multiple size="small" freeSolo options={availableFields}
            value={step.config.keys}
            onChange={(_, v) => onChange({ ...step, config: { ...step.config, keys: v } })}
            renderInput={p => <TextField {...p} placeholder="Group keys..." InputProps={p.InputProps} sx={{ '& input': monoSx }} />}
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
              slotProps={{ input: { sx: monoSx } }}
            />
          ))}
          <Button size="small" onClick={() => onChange({ ...step, config: { ...step.config, aggregates: [...step.config.aggregates, ''] } })}>
            + aggregate
          </Button>
        </Stack>
      );

    case 'pivot':
      return (
        <Stack spacing={1}>
          <Autocomplete
            size="small" freeSolo options={availableFields}
            value={step.config.pivotField}
            onInputChange={(_, v) => onChange({ ...step, config: { ...step.config, pivotField: v } })}
            renderInput={p => <TextField {...p} placeholder="Pivot field..." InputProps={p.InputProps} sx={{ '& input': monoSx }} />}
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
              slotProps={{ input: { sx: monoSx } }}
            />
          ))}
          <Button size="small" onClick={() => onChange({ ...step, config: { ...step.config, aggregates: [...step.config.aggregates, ''] } })}>
            + aggregate
          </Button>
        </Stack>
      );

    case 'flatten':
      return (
        <Autocomplete
          size="small" freeSolo options={availableFields}
          value={step.config.field}
          onInputChange={(_, v) => onChange({ ...step, config: { field: v } })}
          renderInput={p => <TextField {...p} placeholder="Field (optional)..." InputProps={p.InputProps} sx={{ '& input': monoSx }} />}
        />
      );

    case 'transpose':
      return (
        <Autocomplete
          size="small" freeSolo options={availableFields}
          value={step.config.headerField}
          onInputChange={(_, v) => onChange({ ...step, config: { headerField: v } })}
          renderInput={p => <TextField {...p} placeholder="Header field (optional)..." InputProps={p.InputProps} sx={{ '& input': monoSx }} />}
        />
      );
  }
}

// ─── Add Step Menu ──────────────────────────────────────────────────────────

function AddStepMenu({ onAdd }: { onAdd: (type: OperationType) => void }) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  return (
    <>
      <Button
        variant="outlined"
        size="small"
        startIcon={<AddIcon />}
        onClick={e => setAnchorEl(e.currentTarget)}
        sx={{ alignSelf: 'flex-start' }}
      >
        Add Step
      </Button>
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
        {ALL_OPERATIONS.map(op => (
          <MenuItem key={op} onClick={() => { onAdd(op); setAnchorEl(null); }}>
            {OPERATION_LABELS[op]}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
