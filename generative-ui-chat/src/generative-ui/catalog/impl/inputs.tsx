import type { FunctionComponent } from 'react';
import {
  Button as MuiButton,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select as MuiSelect,
  Slider as MuiSlider,
  Switch as MuiSwitch,
  Tab,
  Tabs as MuiTabs,
  TextField as MuiTextField,
  ToggleButton,
  ToggleButtonGroup as MuiToggleButtonGroup,
  Typography,
} from '@mui/material';
import { useBoundProp } from '@json-render/react';
import type { JsonRenderComponentProps } from '../extension';
import { tokenToMuiColor } from '../styleTokens';
import type { ColorToken } from '../styleTokens';

type Option = { value: string; label: string };
const asOptions = (v: unknown): Option[] => (Array.isArray(v) ? (v as Option[]) : []);

function TabsImpl({ props, children, bindings }: JsonRenderComponentProps) {
  const labels = Array.isArray(props.labels) ? (props.labels as string[]) : [];
  const [value, setValue] = useBoundProp<string>(props.value as string, bindings?.value);
  const current = value ?? labels[0] ?? false;
  return (
    <>
      <MuiTabs value={current} onChange={(_, v) => setValue(v)}>
        {labels.map((label) => (
          <Tab key={label} value={label} label={label} />
        ))}
      </MuiTabs>
      {children}
    </>
  );
}

function SelectImpl({ props, bindings }: JsonRenderComponentProps) {
  const [value, setValue] = useBoundProp<string>(props.value as string, bindings?.value);
  const options = asOptions(props.options);
  const label = props.label as string | null | undefined;
  return (
    <FormControl size="small">
      {label ? <InputLabel>{label}</InputLabel> : null}
      <MuiSelect value={value ?? ''} label={label ?? undefined} onChange={(e) => setValue(e.target.value)}>
        {options.map((o) => (
          <MenuItem key={o.value} value={o.value}>
            {o.label}
          </MenuItem>
        ))}
      </MuiSelect>
    </FormControl>
  );
}

function SliderImpl({ props, bindings }: JsonRenderComponentProps) {
  const [value, setValue] = useBoundProp<number>(props.value as number, bindings?.value);
  const min = props.min as number;
  const max = props.max as number;
  const label = props.label as string | null | undefined;
  return (
    <FormControl size="small" fullWidth>
      {label ? <Typography variant="caption">{label}</Typography> : null}
      <MuiSlider
        value={value ?? min ?? 0}
        min={min}
        max={max}
        step={(props.step as number | null | undefined) ?? undefined}
        onChange={(_, v) => setValue(Array.isArray(v) ? v[0] : v)}
        valueLabelDisplay="auto"
      />
    </FormControl>
  );
}

function ToggleButtonGroupImpl({ props, bindings }: JsonRenderComponentProps) {
  const [value, setValue] = useBoundProp<string>(props.value as string, bindings?.value);
  const options = asOptions(props.options);
  return (
    <MuiToggleButtonGroup
      exclusive
      value={value ?? null}
      onChange={(_, next) => {
        if (next !== null) setValue(next);
      }}
    >
      {options.map((o) => (
        <ToggleButton key={o.value} value={o.value}>
          {o.label}
        </ToggleButton>
      ))}
    </MuiToggleButtonGroup>
  );
}

function TextFieldImpl({ props, bindings }: JsonRenderComponentProps) {
  const [value, setValue] = useBoundProp<string>(props.value as string, bindings?.value);
  return (
    <MuiTextField
      size="small"
      label={(props.label as string | null | undefined) ?? undefined}
      placeholder={(props.placeholder as string | null | undefined) ?? undefined}
      value={value ?? ''}
      onChange={(e) => setValue(e.target.value)}
    />
  );
}

function SwitchImpl({ props, bindings }: JsonRenderComponentProps) {
  const [checked, setChecked] = useBoundProp<boolean>(props.checked as boolean, bindings?.checked);
  return (
    <FormControlLabel
      control={<MuiSwitch checked={!!checked} onChange={(e) => setChecked(e.target.checked)} />}
      label={(props.label as string | null | undefined) ?? ''}
    />
  );
}

function ButtonImpl({ props, emit }: JsonRenderComponentProps) {
  return (
    <MuiButton
      variant={(props.variant as never) ?? 'contained'}
      color={tokenToMuiColor(props.color as ColorToken | null | undefined) ?? 'primary'}
      onClick={() => emit('press')}
    >
      {String(props.label ?? '')}
    </MuiButton>
  );
}

export const inputComponents: Record<string, FunctionComponent<JsonRenderComponentProps>> = {
  Tabs: TabsImpl,
  Select: SelectImpl,
  Slider: SliderImpl,
  ToggleButtonGroup: ToggleButtonGroupImpl,
  TextField: TextFieldImpl,
  Switch: SwitchImpl,
  Button: ButtonImpl,
};
