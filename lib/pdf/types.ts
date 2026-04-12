/**
 * PDF Parsing Provider Type Definitions
 */

/**
 * PDF Provider IDs
 *
 * Product-facing OpenMAIC currently exposes a single built-in parser so the
 * hosted experience stays zero-setup.
 */
export type PDFProviderId = 'unpdf';

/**
 * PDF Provider Configuration
 */
export interface PDFProviderConfig {
  id: PDFProviderId;
  name: string;
  requiresApiKey: boolean;
  baseUrl?: string;
  icon?: string;
  features: string[]; // ['text', 'images', 'metadata', etc.]
}

/**
 * PDF Parser Configuration for API calls
 */
export interface PDFParserConfig {
  providerId: PDFProviderId;
  apiKey?: string;
  baseUrl?: string;
}

// Note: ParsedPdfContent is imported from @/lib/types/pdf to avoid duplication
