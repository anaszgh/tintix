import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTimeVariance(minutes: number): string {
  const sign = minutes >= 0 ? "+" : "";
  return `${sign}${minutes} min`;
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric'
  });
}

export function formatDateTime(date: string | Date): string {
  return new Date(date).toLocaleString('en-US', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

export function getCurrentPacificDate(): string {
  const now = new Date();
  return now.toLocaleDateString('sv-SE', {
    timeZone: 'America/Los_Angeles'
  });
}

export function getCurrentPacificDateTime(): Date {
  const now = new Date();
  // Get Pacific time as ISO string
  const pacificTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
  return pacificTime;
}

export function calculateSuccessRate(totalJobs: number, redoCount: number): number {
  if (totalJobs === 0) return 100;
  return Math.round(((totalJobs - redoCount) / totalJobs) * 100 * 10) / 10;
}

export function getPerformanceColor(successRate: number): string {
  if (successRate >= 95) return "text-success";
  if (successRate >= 90) return "text-warning";
  return "text-error";
}

export function getRedoCountColor(count: number): string {
  if (count === 0) return "bg-muted text-muted-foreground";
  if (count === 1) return "bg-warning/20 text-warning";
  return "bg-error/20 text-error";
}
