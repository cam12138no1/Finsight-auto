import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

// GET: Summary of what filings are available in DB
// Returns: which companies have filings, which years, which quarters
export async function GET() {
  try {
    // Get all distinct company/year/quarter combos
    const result = await query(`
      SELECT 
        sf.company_id, sf.year, sf.quarter, sf.id as filing_id,
        sf.filename, sf.file_size, sf.content_type,
        c.name as company_name, c.ticker, c.category
      FROM shared_filings sf
      JOIN companies c ON sf.company_id = c.id
      ORDER BY c.category, c.name, sf.year DESC, sf.quarter
    `);

    // Build structured summary
    const companies = new Map<number, {
      id: number; name: string; ticker: string; category: string;
      filings: { year: number; quarter: string; filing_id: number; filename: string; file_size: number }[];
    }>();

    const years = new Set<number>();
    const quarters = new Set<string>();

    for (const row of result.rows as any[]) {
      years.add(row.year);
      quarters.add(row.quarter);

      if (!companies.has(row.company_id)) {
        companies.set(row.company_id, {
          id: row.company_id,
          name: row.company_name,
          ticker: row.ticker,
          category: row.category,
          filings: [],
        });
      }
      companies.get(row.company_id)!.filings.push({
        year: row.year,
        quarter: row.quarter,
        filing_id: row.filing_id,
        filename: row.filename,
        file_size: row.file_size,
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        companies: Array.from(companies.values()),
        years: Array.from(years).sort((a, b) => b - a),
        quarters: Array.from(quarters).sort(),
        total_filings: result.rows.length,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
