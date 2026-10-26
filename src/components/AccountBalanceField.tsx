import { useEffect, useState } from 'react';
import { Box, InputAdornment, TextField, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { Account } from '../db/config';
import { setAccountBalance } from '../db/accountBalances';
import { tokens } from '../theme';
import { parseAmount } from '../utils/formatters';

// 1240 → "1240", 560.5 → "560,50"
const toInputText = (value: number | undefined) =>
  value === undefined ? '' : Number.isInteger(value) ? String(value) : value.toFixed(2).replace('.', ',');

// Saldo de una cuenta: se guarda al salir del campo o con Enter
export default function AccountBalanceField({
  account,
  hidden = false,
  showName = true,
}: {
  account: Account;
  hidden?: boolean;
  showName?: boolean;
}) {
  const theme = useTheme();
  const t = tokens[theme.palette.mode];
  const [text, setText] = useState(toInputText(account.balance));

  useEffect(() => setText(toInputText(account.balance)), [account.balance]);

  const commit = async () => {
    const value = parseAmount(text);
    if (value === null) {
      setText(toInputText(account.balance));
      return;
    }
    if (value === account.balance) return;
    await setAccountBalance(account.id!, value);
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
      {showName && (
        <>
          <Box sx={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: account.color, flexShrink: 0 }} />
          <Typography
            component="label"
            htmlFor={`account-balance-${account.id}`}
            variant="caption"
            sx={{ flex: 1, minWidth: 0, color: t.textSecondary, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
          >
            {account.name}
          </Typography>
        </>
      )}
      <TextField
        id={`account-balance-${account.id}`}
        size="small"
        value={hidden ? '•••••' : text}
        placeholder="Sin saldo"
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
        }}
        inputProps={{
          inputMode: 'decimal',
          readOnly: hidden,
          'aria-label': `Saldo de ${account.name}`,
          style: { textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600, padding: '6px 4px 6px 8px' },
        }}
        InputProps={{ endAdornment: <InputAdornment position="end" sx={{ ml: 0.25 }}>€</InputAdornment> }}
        sx={{ width: 118, flexShrink: 0, '& .MuiOutlinedInput-root': { pr: 1 } }}
      />
    </Box>
  );
}
