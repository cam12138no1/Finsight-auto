import { openrouter } from '../openrouter'

export interface ExtractedMetadata {
  company_name: string
  company_symbol: string
  report_type: string
  fiscal_year: number
  fiscal_quarter?: number
  filing_date: string
  revenue?: number
  eps?: number
  operating_income?: number
}

const EXTRACTION_PROMPT = `你是一个财务文档分析专家。请从以下财报文档中提取关键元数据信息。

请严格按照 JSON 格式返回以下信息：
- company_name: 公司全称
- company_symbol: 股票代码（如 AAPL, MSFT, META 等）
- report_type: 报告类型（10-Q, 10-K, 8-K, 年报, 季报 等）
- fiscal_year: 财政年度（数字）
- fiscal_quarter: 财政季度（1-4，如果是年报则为 null）
- filing_date: 报告日期（YYYY-MM-DD 格式）
- revenue: 本期收入（单位：百万美元，数字）
- eps: 每股收益（数字）
- operating_income: 营业利润（单位：百万美元，数字）

如果某些信息无法确定，使用合理的推测或默认值。`

export async function extractMetadataFromReport(reportText: string): Promise<ExtractedMetadata> {
  // Truncate text if too long (keep first 15000 chars for metadata extraction)
  const truncatedText = reportText.slice(0, 15000)

  const response = await openrouter.chat({
    model: 'google/gemini-3-pro-preview',
    messages: [
      {
        role: 'system',
        content: EXTRACTION_PROMPT,
      },
      {
        role: 'user',
        content: `请从以下财报内容中提取元数据：\n\n${truncatedText}`,
      },
    ],
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'metadata_extraction',
        strict: true,
        schema: {
          type: 'object',
          properties: {
            company_name: { type: 'string' },
            company_symbol: { type: 'string' },
            report_type: { type: 'string' },
            fiscal_year: { type: 'number' },
            fiscal_quarter: { type: ['number', 'null'] },
            filing_date: { type: 'string' },
            revenue: { type: ['number', 'null'] },
            eps: { type: ['number', 'null'] },
            operating_income: { type: ['number', 'null'] },
          },
          required: ['company_name', 'company_symbol', 'report_type', 'fiscal_year', 'filing_date'],
        },
      },
    },
    temperature: 0.1,
  })

  const content = response.choices[0].message.content
  return JSON.parse(content)
}
