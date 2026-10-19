import { Typography, TypographyProps } from '@mui/material';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface DateDisplayProps extends Omit<TypographyProps, 'children'> {
  date: Date | string | null | undefined;
  fallback?: string;
}

// Fecha legible en español: "1 oct 2026"
export default function DateDisplay({ 
  date, 
  fallback = '—', 
  ...typographyProps 
}: DateDisplayProps) {
  const props: TypographyProps = { component: 'span', variant: 'inherit', ...typographyProps };

  if (!date) {
    return <Typography {...props}>{fallback}</Typography>;
  }

  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const formattedDate = format(dateObj, 'd MMM yyyy', { locale: es }).replace('.', '');
    return <Typography {...props}>{formattedDate}</Typography>;
  } catch (error) {
    console.error('Error formatting date:', error);
    return <Typography {...props}>{fallback}</Typography>;
  }
}
