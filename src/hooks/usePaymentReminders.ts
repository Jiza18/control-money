import { useEffect } from 'react';
import { getExpensesByMonth } from '../db';
import { addMonths } from 'date-fns';

export function usePaymentReminders() {
  useEffect(() => {
    checkUpcomingPayments();
  }, []);
}

async function checkUpcomingPayments() {
  if (!('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  try {
    const now = new Date();
    const currentMonthExpenses = await getExpensesByMonth(now);
    const nextMonthExpenses = await getExpensesByMonth(addMonths(now, 1));
    const allExpenses = [...currentMonthExpenses, ...nextMonthExpenses];

    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const upcoming = allExpenses.filter((expense) => {
      if (expense.frequency === 'one-time') return false;
      const nextDate = expense.nextPaymentDate ? new Date(expense.nextPaymentDate) : null;
      if (!nextDate) return false;
      return nextDate <= sevenDaysFromNow && nextDate >= now;
    });

    if (upcoming.length > 0) {
      const lastNotified = localStorage.getItem('lastPaymentReminderDate');
      const today = new Date().toDateString();
      if (lastNotified === today) return;

      localStorage.setItem('lastPaymentReminderDate', today);

      const formatter = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });
      const totalAmount = upcoming.reduce((sum, e) => sum + e.amount, 0);

      new Notification('Control Money — Pagos próximos', {
        body: `Tienes ${upcoming.length} pago${upcoming.length > 1 ? 's' : ''} pendiente${upcoming.length > 1 ? 's' : ''} por ${formatter.format(totalAmount)}`,
        icon: '/vite.svg',
        tag: 'payment-reminder',
      });
    }
  } catch (error) {
    console.error('Error checking payment reminders:', error);
  }
}
