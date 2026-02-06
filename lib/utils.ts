import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}

export function formatDate(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getQuarterLabel(quarter: string): string {
  const labels: Record<string, string> = {
    Q1: '第一季度',
    Q2: '第二季度',
    Q3: '第三季度',
    Q4: '第四季度',
    FY: '全年',
  };
  return labels[quarter] || quarter;
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    pending: 'text-gold-500 bg-gold-500/10',
    running: 'text-blue-500 bg-blue-500/10',
    completed: 'text-emerald-500 bg-emerald-500/10',
    failed: 'text-red-500 bg-red-500/10',
    downloading: 'text-blue-400 bg-blue-400/10',
    success: 'text-emerald-500 bg-emerald-500/10',
    skipped: 'text-muted-foreground bg-muted',
  };
  return colors[status] || 'text-muted-foreground bg-muted';
}
