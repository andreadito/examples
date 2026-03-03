import { useState, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import {
  Paper,
  Typography,
  Box,
  Button,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Alert,
  CircularProgress,
  Collapse,
} from '@mui/material';
import Grid from '@mui/material/Grid2';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SendIcon from '@mui/icons-material/Send';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import type {
  FormSchema,
  FormSection as FormSectionType,
  LogEntry,
} from '../types';
import { FieldRenderer } from './FieldRenderer';
import { useFormSubmission } from './useFormSubmission';
import { evaluateConditions } from './conditions';
import type { OptionsProviders } from './useFieldOptions';

// ─── Types ───────────────────────────────────────────────────────────────────

type ValidatorFn = (value: unknown, formValues: Record<string, unknown>) => string | true;

// ─── Default Values ──────────────────────────────────────────────────────────

function getDefaultValues(
  schema: FormSchema,
  initialValues?: Record<string, unknown>,
): Record<string, unknown> {
  const defaults: Record<string, unknown> = {};
  for (const section of schema.sections) {
    for (const field of section.fields) {
      if (field.defaultValue !== undefined) {
        defaults[field.name] = field.defaultValue;
      } else {
        switch (field.type) {
          case 'checkbox':
            defaults[field.name] = false;
            break;
          default:
            defaults[field.name] = '';
        }
      }
    }
  }
  // initialValues override schema defaults
  if (initialValues) {
    for (const [key, value] of Object.entries(initialValues)) {
      if (value !== undefined) {
        defaults[key] = value;
      }
    }
  }
  return defaults;
}

// ─── Section Renderer ────────────────────────────────────────────────────────

function SectionRenderer({
  section,
  control,
  errors,
  formValues,
  customValidators,
  optionsProviders,
  density,
}: {
  section: FormSectionType;
  control: ReturnType<typeof useForm>['control'];
  errors: ReturnType<typeof useForm>['formState']['errors'];
  formValues: Record<string, unknown>;
  customValidators?: Record<string, ValidatorFn>;
  optionsProviders?: OptionsProviders;
  density?: 'compact' | 'comfortable' | 'dense';
}) {
  const gridSpacing = density === 'dense' ? 1 : density === 'compact' ? 1.5 : 2;

  const content = (
    <Grid container spacing={gridSpacing} columns={12}>
      {section.fields.map((field) => {
        // Evaluate declarative visibility conditions
        const isVisible =
          field.visible === undefined
            ? true
            : evaluateConditions(field.visible, formValues);
        if (!isVisible) return null;

        // Default: 2 fields per row on sm, 3 on lg, 4 on xl (trader-friendly)
        const gridSize = field.gridSize ?? { xs: 12, sm: 6, lg: 4, xl: 3 };
        return (
          <Grid key={field.name} size={gridSize}>
            <FieldRenderer
              field={field}
              control={control}
              errors={errors}
              formValues={formValues}
              customValidators={customValidators}
              optionsProviders={optionsProviders}
            />
          </Grid>
        );
      })}
    </Grid>
  );

  if (section.collapsible) {
    return (
      <Accordion
        defaultExpanded={section.defaultExpanded !== false}
        sx={{ mb: 2 }}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle1" fontWeight={600}>
            {section.title}
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          {section.description && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {section.description}
            </Typography>
          )}
          {content}
        </AccordionDetails>
      </Accordion>
    );
  }

  return (
    <Box sx={{ mb: 3 }}>
      {section.title && (
        <>
          <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 0.5 }}>
            {section.title}
          </Typography>
          <Divider sx={{ mb: 2 }} />
        </>
      )}
      {section.description && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {section.description}
        </Typography>
      )}
      {content}
    </Box>
  );
}

// ─── Dynamic Form Props ──────────────────────────────────────────────────────
// Schema is pure JSON. All runtime behavior lives in component props.

interface DynamicFormProps<TResponse = unknown> {
  /** The form schema (100% JSON-serializable, can come from DB) */
  schema: FormSchema;
  /** Initial values that override schema defaultValues */
  initialValues?: Record<string, unknown>;
  /** Async option providers for fields with `optionsSource` */
  optionsProviders?: OptionsProviders;
  /** Activity log callback */
  onLog?: (entry: LogEntry) => void;
  /** Called after a successful submission */
  onSuccess?: (response: TResponse, values: Record<string, unknown>) => void;
  /** Called when submission fails */
  onError?: (error: Error, values: Record<string, unknown>) => void;
  /** Called when submission starts */
  onSubmitting?: (values: Record<string, unknown>) => void;
  /** Custom submit handler — overrides the default fetch to schema.submission.url */
  submitHandler?: (values: Record<string, unknown>) => Promise<TResponse>;
  /** Transform form values before submission */
  transformPayload?: (values: Record<string, unknown>) => unknown;
  /** Register custom validators referenced by name in schema rules */
  customValidators?: Record<string, ValidatorFn>;
}

// ─── Dynamic Form ────────────────────────────────────────────────────────────

export function DynamicForm<TResponse = unknown>({
  schema,
  initialValues,
  optionsProviders,
  onLog,
  onSuccess,
  onError,
  onSubmitting,
  submitHandler,
  transformPayload,
  customValidators,
}: DynamicFormProps<TResponse>) {
  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm<Record<string, unknown>>({
    defaultValues: getDefaultValues(schema, initialValues),
    mode: 'onBlur',
  });

  const { state, submit, reset: resetSubmission } = useFormSubmission<TResponse>(
    schema.submission,
    {
      onSuccess: (response, values) => {
        onLog?.({
          type: 'success',
          message: 'Submission successful',
          data: response,
          timestamp: new Date(),
        });
        onSuccess?.(response, values);
      },
      onError: (error, values) => {
        onLog?.({
          type: 'error',
          message: error.message,
          data: values,
          timestamp: new Date(),
        });
        onError?.(error, values);
      },
      onSubmitting: (values) => {
        onLog?.({
          type: 'info',
          message: `${schema.submission.method ?? 'POST'} ${schema.submission.url}`,
          data: values,
          timestamp: new Date(),
        });
        onSubmitting?.(values);
      },
    },
    { submitHandler, transformPayload },
  );

  const [confirmOpen, setConfirmOpen] = useState(false);
  const pendingValues = useRef<Record<string, unknown> | null>(null);
  const formValues = watch();

  useEffect(() => {
    if (schema.resetOnSuccess && state.status === 'success') {
      const timer = setTimeout(() => reset(), 1500);
      return () => clearTimeout(timer);
    }
  }, [state.status, schema.resetOnSuccess, reset]);

  const onSubmit = handleSubmit(async (values) => {
    if (schema.confirmBeforeSubmit) {
      pendingValues.current = values;
      setConfirmOpen(true);
      return;
    }
    await submit(values);
  });

  const handleConfirm = async () => {
    setConfirmOpen(false);
    if (pendingValues.current) {
      await submit(pendingValues.current);
      pendingValues.current = null;
    }
  };

  const handleReset = () => {
    reset();
    resetSubmission();
  };

  return (
    <Paper elevation={0} sx={{ p: schema.density === 'dense' ? 2 : schema.density === 'compact' ? 2.5 : 3 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" gutterBottom>
          {schema.title}
        </Typography>
        {schema.description && (
          <Typography variant="body2" color="text.secondary">
            {schema.description}
          </Typography>
        )}
      </Box>

      <form onSubmit={onSubmit} noValidate>
        {schema.sections.map((section) => (
          <SectionRenderer
            key={section.id}
            section={section}
            control={control}
            errors={errors}
            formValues={formValues}
            customValidators={customValidators}
            optionsProviders={optionsProviders}
            density={schema.density}
          />
        ))}

        <Collapse in={state.status === 'success'}>
          <Alert severity="success" sx={{ mt: 2 }}>
            Submission successful
            {state.response && typeof state.response === 'object' && (() => {
              const res = state.response as Record<string, unknown>;
              // Look for common ID fields in the response
              const idKey = Object.keys(res).find(
                (k) => /id$/i.test(k) && typeof res[k] === 'string',
              );
              return idKey ? (
                <> &mdash; {idKey}: <strong>{String(res[idKey])}</strong></>
              ) : null;
            })()}
          </Alert>
        </Collapse>

        <Collapse in={state.status === 'error'}>
          <Alert severity="error" sx={{ mt: 2 }}>
            {state.error?.message || 'Submission failed'}
          </Alert>
        </Collapse>

        <Box
          sx={{
            display: 'flex',
            gap: 2,
            mt: 3,
            justifyContent: 'flex-end',
            borderTop: 1,
            borderColor: 'divider',
            pt: 2,
          }}
        >
          <Button
            variant="outlined"
            color="inherit"
            onClick={handleReset}
            startIcon={<RestartAltIcon />}
            disabled={state.status === 'submitting'}
          >
            Reset
          </Button>
          <Button
            type="submit"
            variant="contained"
            startIcon={
              state.status === 'submitting' ? (
                <CircularProgress size={16} color="inherit" />
              ) : (
                <SendIcon />
              )
            }
            disabled={state.status === 'submitting'}
          >
            {state.status === 'submitting' ? 'Submitting...' : 'Submit'}
          </Button>
        </Box>
      </form>

      <Dialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Confirm Submission</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {schema.confirmMessage ??
              'Are you sure you want to submit this form?'}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)} color="inherit">
            Cancel
          </Button>
          <Button onClick={handleConfirm} variant="contained" autoFocus>
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}
