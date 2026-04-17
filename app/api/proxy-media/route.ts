/**
 * Media Proxy API
 *
 * Server-side proxy for fetching remote media URLs (images/videos).
 * Required because browser fetch() to remote CDN URLs fails with CORS errors.
 * The media orchestrator uses this to download generated media as blobs
 * for IndexedDB persistence.
 *
 * POST /api/proxy-media
 * Body: { url: string }
 * Response: Binary blob with appropriate Content-Type
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSSRFProtectedUrl } from '@/lib/server/ssrf-guard';
import { apiError } from '@/lib/server/api-response';
import { createLogger } from '@/lib/logger';

const log = createLogger('ProxyMedia');
const PROXY_TIMEOUT_MS = 15_000;
const MAX_PROXY_BYTES = 25 * 1024 * 1024;

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  let url: string | undefined;
  try {
    ({ url } = await request.json());

    if (!url || typeof url !== 'string') {
      return apiError('MISSING_REQUIRED_FIELD', 400, 'Missing or invalid url');
    }

    const guardedUrl = await createSSRFProtectedUrl(url);
    const abortController = new AbortController();
    const signal = AbortSignal.any([abortController.signal, AbortSignal.timeout(PROXY_TIMEOUT_MS)]);

    // Disable redirect following to prevent redirect-to-internal attacks
    const response = await guardedUrl.fetch(guardedUrl.url, {
      redirect: 'manual',
      signal,
    });
    if (response.status >= 300 && response.status < 400) {
      return apiError('REDIRECT_NOT_ALLOWED', 403, 'Redirects are not allowed');
    }
    if (!response.ok) {
      return apiError('UPSTREAM_ERROR', 502, `Upstream returned ${response.status}`);
    }

    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    const contentLengthHeader = response.headers.get('content-length');
    const contentLength = contentLengthHeader ? Number(contentLengthHeader) : Number.NaN;

    if (Number.isFinite(contentLength) && contentLength > MAX_PROXY_BYTES) {
      abortController.abort('response too large');
      return apiError(
        'PAYLOAD_TOO_LARGE',
        413,
        `Remote media exceeds ${MAX_PROXY_BYTES} bytes`,
      );
    }

    if (!response.body) {
      return apiError('UPSTREAM_ERROR', 502, 'Upstream returned an empty response body');
    }

    const reader = response.body.getReader();
    let transferred = 0;
    const stream = new ReadableStream({
      async pull(controller) {
        const { done, value } = await reader.read();
        if (done) {
          controller.close();
          return;
        }

        transferred += value.byteLength;
        if (transferred > MAX_PROXY_BYTES) {
          abortController.abort('response too large');
          controller.error(new Error(`Remote media exceeds ${MAX_PROXY_BYTES} bytes`));
          return;
        }

        controller.enqueue(value);
      },
      cancel(reason) {
        abortController.abort(
          typeof reason === 'string' ? reason : 'proxy stream cancelled by downstream client',
        );
        void reader.cancel(reason);
      },
    });

    return new NextResponse(stream, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'private, max-age=3600',
        ...(Number.isFinite(contentLength) ? { 'Content-Length': String(contentLength) } : {}),
      },
    });
  } catch (error) {
    log.error(`Proxy media failed [url="${url?.substring(0, 100) ?? 'unknown'}"]:`, error);
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('exceeds')) {
      return apiError('PAYLOAD_TOO_LARGE', 413, message);
    }
    if (message.includes('timed out') || error instanceof DOMException) {
      return apiError('UPSTREAM_TIMEOUT', 504, 'Remote media request timed out');
    }
    return apiError('INTERNAL_ERROR', 500, message);
  }
}
