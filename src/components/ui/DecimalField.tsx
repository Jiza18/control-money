import { useEffect, useState } from 'react';
import { TextField } from '@mui/material';
import type { TextFieldProps } from '@mui/material';
import { formatAmountInput, parseAmount } from '../../utils/formatters';

type DecimalFieldProps = Omit<TextFieldProps, 'value' | 'onChange' | 'type'> & {
  value: number | undefined | null;
  // Se llama en cada cambio válido; undefined si el campo queda vacío
  onValueChange: (value: number | undefined) => void;
  integer?: boolean; // Solo números enteros (meses, años...)
  masked?: boolean; // Oculta el valor (modo privacidad del saldo)
};

// Campo numérico para formularios. Es de texto con teclado decimal porque <input type="number">
// rechaza la coma en el móvil y vacía el campo (que la app convertía en un 0 imposible de borrar).
// Acepta «12,50», «12.50» y «1.240,50», y se puede dejar vacío.
export default function DecimalField({ value, onValueChange, integer = false, masked = false, inputProps, ...props }: DecimalFieldProps) {
  const [text, setText] = useState(value ? formatAmountInput(value) : '');

  // Si el valor cambia desde fuera (reset del formulario, cálculo), se refleja; mientras se escribe, no
  useEffect(() => {
    const current = parseAmount(text);
    if ((current ?? 0) !== (value ?? 0) && current !== null) setText(value ? formatAmountInput(value) : '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <TextField
      {...props}
      type={masked ? 'password' : 'text'}
      value={text}
      onChange={(e) => {
        const allowed = integer ? /[^\d]/g : /[^\d.,-]/g;
        const next = e.target.value.replace(allowed, '');
        setText(next);
        const parsed = parseAmount(next);
        if (parsed !== null) onValueChange(integer && parsed !== undefined ? Math.trunc(parsed) : parsed);
      }}
      inputProps={{ inputMode: integer ? 'numeric' : 'decimal', autoComplete: 'off', ...inputProps }}
    />
  );
}
