/**
 * PDF Provider Constants
 * Separated from pdf-providers.ts to avoid importing sharp in client components
 */

import type { PDFProviderId, PDFProviderConfig } from './types';

/**
 * PDF Provider Registry
 *
 * Keep the default OpenMAIC experience zero-setup: use the built-in parser and
 * do not expose self-hosted / local PDF parsing providers in the product UI.
 */
export const PDF_PROVIDERS: Record<PDFProviderId, PDFProviderConfig> = {
  unpdf: {
    id: 'unpdf',
    name: 'Built-in PDF Parser',
    requiresApiKey: false,
    icon: '/logos/unpdf.svg',
    features: ['text', 'images', 'metadata'],
  },
};

/**
 * Get all available PDF providers
 */
export function getAllPDFProviders(): PDFProviderConfig[] {
  return Object.values(PDF_PROVIDERS);
}

/**
 * Get PDF provider by ID
 */
export function getPDFProvider(providerId: PDFProviderId): PDFProviderConfig | undefined {
  return PDF_PROVIDERS[providerId];
}
