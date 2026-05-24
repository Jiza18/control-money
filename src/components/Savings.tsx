import { Box, Typography } from '@mui/material';
import SavingsList from './SavingsList';

export default function Savings() {
  return (
    <Box>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 3 }}>
        Ahorros
      </Typography>
      <SavingsList />
    </Box>
  );
}