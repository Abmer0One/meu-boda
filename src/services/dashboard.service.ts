import { EventRepository } from '@/repositories/event.repository';
import { GuestRepository } from '@/repositories/guest.repository';
import { TaskRepository } from '@/repositories/task.repository';
import { BudgetRepository } from '@/repositories/budget.repository';
import { DashboardStats } from '@/types';

export const DashboardService = {
  async getStats(eventId: string): Promise<DashboardStats> {
    const event = await EventRepository.getById(eventId);
    const guests = await GuestRepository.getAll(eventId);
    const tasks = await TaskRepository.getAll(eventId);
    const budgets = await BudgetRepository.getAll(eventId);

    // 1. Days remaining
    let daysRemaining = 0;
    if (event) {
      const eventDate = new Date(event.date);
      const today = new Date();
      const diffTime = eventDate.getTime() - today.getTime();
      daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    }

    // 2. Guest stats
    const totalGuests = guests.reduce((sum, g) => sum + 1 + (g.companions || 0), 0);
    const confirmedGuests = guests
      .filter((g) => g.status === 'Confirmed')
      .reduce((sum, g) => sum + 1 + (g.companions || 0), 0);
    const pendingGuests = guests
      .filter((g) => g.status === 'Pending')
      .reduce((sum, g) => sum + 1 + (g.companions || 0), 0);
    const declinedGuests = guests
      .filter((g) => g.status === 'Declined')
      .reduce((sum, g) => sum + 1 + (g.companions || 0), 0);

    // 3. Invitations
    const invitationsSent = guests.filter((g) => g.invitation_sent).length;
    const invitationsPending = guests.filter((g) => !g.invitation_sent).length;

    // 4. Budget stats
    const totalEstimatedBudget = budgets.reduce((sum, b) => sum + Number(b.estimated_amount), 0);
    const totalBudgetSpent = budgets.reduce((sum, b) => sum + Number(b.paid_amount), 0);
    const remainingBudget = totalEstimatedBudget - totalBudgetSpent;

    // 5. Tasks
    const pendingTasksCount = tasks.filter((t) => t.status !== 'Concluído').length;

    // 6. Upcoming payments count (budget items with unpaid amounts)
    const upcomingPaymentsCount = budgets.filter((b) => Number(b.estimated_amount) > Number(b.paid_amount)).length;

    return {
      daysRemaining,
      totalGuests,
      confirmedGuests,
      pendingGuests,
      declinedGuests,
      invitationsSent,
      invitationsPending,
      totalBudgetSpent,
      totalEstimatedBudget,
      remainingBudget,
      pendingTasksCount,
      upcomingPaymentsCount,
    };
  },
};
