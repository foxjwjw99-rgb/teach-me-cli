/**
 * MINERU CLOUD API - HONEST IMPLEMENTATION
 *
 * The official MinerU Cloud API v4 does NOT support direct file uploads.
 * This file documents the actual API behavior and provides an honest error message.
 */

import type { PDFParserConfig } from './types';
import type { ParsedPdfContent } from '@/lib/types/pdf';
import { createLogger } from '@/lib/logger';

const log = createLogger('MinerUCloud');

/**
 * Parse PDF using official MinerU Cloud API (v4/extract/task)
 *
 * ⚠️  IMPORTANT LIMITATION:
 * The official MinerU Cloud API v4 does NOT support direct file uploads.
 * It requires a public HTTP/HTTPS file URL.
 *
 * VERIFIED FACTS from official documentation:
 * - Official endpoint: POST https://mineru.net/api/v4/extract/task
 * - Expected input: JSON body with `url` field (NOT multipart file upload)
 * - Response: { "data": { "task_id": "...", ... }, ... }
 * - Polling: GET https://mineru.net/api/v4/extract/task/{task_id}
 *
 * References:
 * - Official MinerU Cloud docs: https://mineru.net/apiManage/docs
 * - MaxKB integration (trusted source): uses `url` parameter, not file upload
 * - GitHub: https://github.com/opendatalab/MinerU
 *
 * Supported API parameters:
 *   - url (required): public HTTP/HTTPS file URL
 *   - is_ocr: boolean (default: false)
 *   - enable_formula: boolean (default: true)
 *   - enable_table: boolean (default: true)
 *   - language: string (default: "ch", can be "auto")
 *   - model_version: "v1" or "v2" (default: "v1")
 *
 * WHAT WENT WRONG IN PREVIOUS IMPLEMENTATION:
 * The old code tried to POST multipart/form-data with file binary directly to /extract/task.
 * This does NOT work because the API only accepts JSON with a file URL.
 *
 * SOLUTION: Three options to use MinerU with OpenMAIC
 *
 * Option 1: RECOMMENDED - Use self-hosted MinerU (mineru provider)
 *   - Self-hosted MinerU supports direct file upload via POST /file_parse
 *   - Set providerId: 'mineru' and provide baseUrl to your MinerU instance
 *   - Deploy locally: https://github.com/opendatalab/MinerU
 *   - Full privacy, no external dependencies, complete control
 *
 * Option 2: Use public file URL with MinerU Cloud (future feature)
 *   - Upload PDF to public storage (AWS S3, Google Cloud Storage, etc.)
 *   - Get the public HTTPS URL
 *   - This requires UI changes to accept file_url parameter
 *   - Would enable cloud parsing without local infrastructure
 *
 * Option 3: Implement temporary file hosting service (future feature)
 *   - OpenMAIC hosts temporary file endpoints
 *   - Upload local file, get temporary URL
 *   - Pass URL to MinerU Cloud
 *   - More complex, requires additional infrastructure
 *
 * @throws Error - Always throws with helpful guidance
 */
async function parseWithMinerUCloud(
  config: PDFParserConfig,
  pdfBuffer: Buffer,
): Promise<ParsedPdfContent> {
  log.error(
    '[MinerU Cloud] Attempted to use official MinerU Cloud with local file. ' +
      'This is not supported by the official API.',
  );

  const errorMsg =
    '[MinerU Cloud] ❌ Official MinerU Cloud API does not support direct file uploads.\n' +
    '\n' +
    'The API requires a public HTTP/HTTPS file URL, not a local file buffer.\n' +
    '\n' +
    '═══════════════════════════════════════════════════════════════\n' +
    'SOLUTION: Use "mineru" (self-hosted) provider instead\n' +
    '═══════════════════════════════════════════════════════════════\n' +
    '\n' +
    '✅ RECOMMENDED for local PDFs:\n' +
    '   1. Deploy MinerU locally: https://github.com/opendatalab/MinerU\n' +
    '   2. Set provider to "mineru"\n' +
    '   3. Provide baseUrl pointing to your local MinerU instance\n' +
    '\n' +
    'Self-hosted MinerU supports direct file uploads and gives you:\n' +
    '   • Full privacy (files never leave your machine)\n' +
    '   • No external dependencies\n' +
    '   • Complete control over the service\n' +
    '   • Same high-quality PDF parsing\n' +
    '\n' +
    '═══════════════════════════════════════════════════════════════\n' +
    'Other options (future features):\n' +
    '═══════════════════════════════════════════════════════════════\n' +
    '\n' +
    'Option 2: Use public file URL\n' +
    '   • Upload PDF to AWS S3, Google Cloud Storage, etc.\n' +
    '   • Pass the public HTTPS URL to MinerU Cloud\n' +
    '   • Requires UI changes to accept file URLs\n' +
    '\n' +
    'Option 3: Temporary file hosting\n' +
    '   • OpenMAIC hosts temporary file endpoints\n' +
    '   • Generate temporary URLs for MinerU Cloud\n' +
    '   • More complex, requires infrastructure\n' +
    '\n' +
    'For more details, see: lib/pdf/pdf-providers.ts\n';

  throw new Error(errorMsg);
}

export { parseWithMinerUCloud };
