import { Box, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { Account } from '../db/config';
import { setAccountBalance } from '../db/accountBalances';
import { tokens } from '../theme';
import AmountField from './ui/AmountField';

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
      <AmountField
        id={`account-balance-${account.id}`}
        value={account.balance}
        onCommit={(value) => setAccountBalance(account.id!, value)}
        ariaLabel={`Saldo de ${account.name}`}
        placeholder="Sin saldo"
        hidden={hidden}
      />
    </Box>
  );
}
