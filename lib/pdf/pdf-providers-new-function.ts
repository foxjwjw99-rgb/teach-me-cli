/**
 * Parse PDF using official MinerU Cloud API (v4/extract/task)
 *
 * ⚠️  IMPORTANT LIMITATION - NOT SUPPORTED:
 * The official MinerU Cloud API v4 endpoint does NOT support direct file uploads.
 * It requires a public HTTP/HTTPS file URL as input.
 *
 * VERIFIED FACTS from official documentation:
 * - Official endpoint: POST https://mineru.net/api/v4/extract/task
 * - Expected input: JSON body with `url` field (NOT multipart file upload)
 * - Response: { "data": { "task_id": "...", ... }, ... }
 * - Polling: GET https://mineru.net/api/v4/extract/task/{task_id}
 *
 * Sources:
 * - Official MinerU Cloud docs: https://mineru.net/apiManage/docs
 * - MaxKB integration guide (trusted reference): uses `url` parameter
 * - MinerU GitHub: https://github.com/opendatalab/MinerU
 *
 * Supported API parameters:
 *   - url (required): public HTTP/HTTPS file URL
 *   - is_ocr: boolean (default: false)
 *   - enable_formula: boolean (default: true)
 *   - enable_table: boolean (default: true)
 *   - language: string (default: "ch", can be "auto")
 *   - model_version: "v1" or "v2" (default: "v1")
 *
 * PROBLEM WITH PREVIOUS IMPLEMENTATION:
 * The old code attempted to POST multipart/form-data with file binary directly.
 * This does NOT work because the official API only accepts JSON with a file URL.
 *
 * RECOMMENDED SOLUTION:
 * Use "mineru" provider (self-hosted) instead:
 *   - Deploy MinerU locally: https://github.com/opendatalab/MinerU
 *   - Self-hosted MinerU supports direct file upload via POST /file_parse
 *   - Full privacy, no external dependencies
 *   - Set providerId to 'mineru' and provide baseUrl
 *
 * FUTURE POSSIBILITIES:
 * 1. Accept public file URL input for MinerU Cloud (would require UI changes)
 * 2. Implement temporary file hosting service in OpenMAIC
 *
 * @throws Error - Always throws with clear guidance on alternatives
 */
async function parseWithMinerUCloud(
  config: PDFParserConfig,
  pdfBuffer: Buffer,
): Promise<ParsedPdfContent> {
  log.error(
    '[MinerU Cloud] Cannot use official MinerU Cloud API with local file buffer. ' +
      'The API requires a public file URL, not local files.',
  );

  throw new Error(
    '[MinerU Cloud] ❌ Official MinerU Cloud API does not support direct file uploads.\n' +
      '\n' +
      'Problem: The API requires a public HTTP/HTTPS file URL.\n' +
      'You have: A local file buffer\n' +
      '\n' +
      '═══════════════════════════════════════════════════════════════\n' +
      'SOLUTION: Use "mineru" (self-hosted) provider\n' +
      '═══════════════════════════════════════════════════════════════\n' +
      '\n' +
      '✅ RECOMMENDED for parsing local PDFs:\n' +
      '   1. Deploy MinerU locally: https://github.com/opendatalab/MinerU\n' +
      '   2. Set provider to "mineru"\n' +
      '   3. Provide baseUrl pointing to your local MinerU instance\n' +
      '\n' +
      'Self-hosted MinerU gives you:\n' +
      '   • Direct file upload support\n' +
      '   • Full privacy (files never leave your machine)\n' +
      '   • No external cloud dependencies\n' +
      '   • Same high-quality PDF parsing capabilities\n' +
      '\n' +
      '═══════════════════════════════════════════════════════════════\n' +
      'Alternative approaches (future features):\n' +
      '═══════════════════════════════════════════════════════════════\n' +
      '\n' +
      'Option 2: If you have a public file URL:\n' +
      '   • Upload your PDF to AWS S3, Google Cloud Storage, etc.\n' +
      '   • Use the public HTTPS URL with MinerU Cloud\n' +
      '   • Would need UI changes to accept file_url parameter\n' +
      '\n' +
      'Option 3: Temporary file hosting:\n' +
      '   • OpenMAIC could host temporary file endpoints\n' +
      '   • Generate temporary URLs for MinerU Cloud\n' +
      '   • More complex, requires additional infrastructure\n' +
      '\n' +
      'Documentation: lib/pdf/pdf-providers.ts (parseWithMinerUCloud)\n',
  );
}
