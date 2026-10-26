import { useEffect, useState } from 'react';
import { InputAdornment, TextField } from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';
import { formatAmountInput as toInputText, parseAmount } from '../../utils/formatters';

interface AmountFieldProps {
  value: number | undefined;
  // Se llama al salir del campo o con Enter. `undefined` = campo vacío.
  onCommit: (value: number | undefined) => void | Promise<void>;
  ariaLabel: string;
  id?: string;
  placeholder?: string;
  hidden?: boolean;
  width?: number | string;
  sx?: SxProps<Theme>;
}

// Importe editable en línea (acepta «1.240,50»). Guarda al salir del campo, no en cada tecla.
export default function AmountField({
  value,
  onCommit,
  ariaLabel,
  id,
  placeholder,
  hidden = false,
  width = 118,
  sx,
}: AmountFieldProps) {
  const [text, setText] = useState(toInputText(value));

  useEffect(() => setText(toInputText(value)), [value]);

  const commit = async () => {
    const parsed = parseAmount(text);
    if (parsed === null) {
      setText(toInputText(value));
      return;
    }
    if (parsed === value) return;
    await onCommit(parsed);
  };

  return (
    <TextField
      id={id}
      size="small"
      value={hidden ? '•••••' : text}
      placeholder={placeholder}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
      }}
      inputProps={{
        inputMode: 'decimal',
        readOnly: hidden,
        'aria-label': ariaLabel,
        style: { textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600, padding: '6px 4px 6px 8px' },
      }}
      InputProps={{ endAdornment: <InputAdornment position="end" sx={{ ml: 0.25 }}>€</InputAdornment> }}
      sx={[{ width, flexShrink: 0, '& .MuiOutlinedInput-root': { pr: 1 } }, ...(Array.isArray(sx) ? sx : sx ? [sx] : [])]}
    />
  );
}
