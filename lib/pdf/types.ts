/**
 * PDF Parsing Provider Type Definitions
 */

/**
 * PDF Provider IDs
 */
export type PDFProviderId = 'unpdf' | 'mineru' | 'mineru-cloud';

/**
 * PDF Provider Configuration
 */
export interface PDFProviderConfig {
  id: PDFProviderId;
  name: string;
  requiresApiKey: boolean;
  baseUrl?: string;
  icon?: string;
  features: string[]; // ['text', 'images', 'tables', 'formulas', 'layout-analysis', etc.]
}

/**
 * PDF Parser Configuration for API calls
 */
export interface PDFParserConfig {
  providerId: PDFProviderId;
  apiKey?: string;
  baseUrl?: string;
  /** For MinerU cloud: polling timeout in ms (default 300000 = 5min) */
  pollingTimeoutMs?: number;
  /** For MinerU cloud: polling interval in ms (default 2000 = 2sec) */
  pollingIntervalMs?: number;
}

// Note: ParsedPdfContent is imported from @/lib/types/pdf to avoid duplication
