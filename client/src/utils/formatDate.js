import {
  formatDistanceToNow,
  format,
  isToday,
  isYesterday,
} from 'date-fns';

export const formatRelativeDate = (date) => {
  const d = new Date(date);
  if (isToday(d)) return formatDistanceToNow(d, { addSuffix: true });
  if (isYesterday(d)) return `Yesterday at ${format(d, 'h:mm a')}`;
  return format(d, 'MMM d, yyyy');
};

export const formatDateTime = (date) => format(new Date(date), 'MMM d, yyyy h:mm a');

export const formatTime = (date) => format(new Date(date), 'h:mm a');
