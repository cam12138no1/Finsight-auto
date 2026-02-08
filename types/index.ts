// ============================================================
// Database Models
// ============================================================

export interface Company {
  id: number;
  name: string;
  ticker: string;
  category: 'AI_Applications' | 'AI_Supply_Chain';
  ir_url: string;
  sec_cik: string;
  description: string;
  logo_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DownloadJob {
  id: number;
  status: JobStatus;
  years: number[];
  quarters: string[];
  company_ids: number[] | null;
  category_filter: string | null;
  total_files: number;
  completed_files: number;
  failed_files: number;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  error_message: string | null;
}

export interface DownloadLog {
  id: number;
  job_id: number;
  company_id: number;
  company_name?: string;
  company_ticker?: string;
  year: number;
  quarter: string;
  filename: string | null;
  file_url: string | null;
  file_size: number | null;
  status: FileStatus;
  error_message: string | null;
  download_duration_ms: number | null;
  created_at: string;
  updated_at: string;
}

// ============================================================
// Enums & Constants
// ============================================================

export type JobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
export type FileStatus = 'pending' | 'downloading' | 'success' | 'failed' | 'skipped';

export const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4', 'FY'] as const;
export type Quarter = typeof QUARTERS[number];

export const YEAR_RANGE = Array.from(
  { length: new Date().getFullYear() - 2019 },
  (_, i) => 2020 + i
);

// ============================================================
// API Request/Response Types
// ============================================================

export interface CreateJobRequest {
  years: number[];
  quarters: string[];
  company_ids?: number[];
  company_tickers?: string[];
  category_filter?: string;
}

export interface JobWithStats extends DownloadJob {
  progress_percent: number;
}

export interface DashboardStats {
  total_companies: number;
  active_companies: number;
  total_jobs: number;
  running_jobs: number;
  total_files_downloaded: number;
  total_download_size: number;
  success_rate: number;
}

export interface RecentActivity {
  id: number;
  type: 'job_created' | 'job_completed' | 'job_failed' | 'download_success' | 'download_failed';
  message: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

// ============================================================
// API Response Wrapper
// ============================================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  meta?: {
    total: number;
    limit: number;
    offset: number;
  };
}
