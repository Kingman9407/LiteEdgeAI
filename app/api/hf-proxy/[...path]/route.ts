/**
 * GET /api/hf-proxy/[...path]
 *
 * Transparent proxy for HuggingFace Hub file requests.
 * The Web Worker configures @xenova/transformers to use this proxy as its
 * remoteHost so that tokenizer JSON files pass through with CORP headers.
 *
 * Example:
 *   /api/hf-proxy/Kingman9407/hornet/resolve/main/tokenizer.json
 *   → https://huggingface.co/Kingman9407/hornet/resolve/main/tokenizer.json
 */

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const hfPath = path.join('/');
  const hfUrl  = `https://huggingface.co/${hfPath}`;

  const hfHeaders: HeadersInit = {};
  const token = process.env.HF_TOKEN;
  if (token) hfHeaders['Authorization'] = `Bearer ${token}`;

  const isTokenizerConfig = hfPath.endsWith('tokenizer_config.json');

  let upstream: Response;
  try {
    upstream = await fetch(hfUrl, { headers: hfHeaders, redirect: 'follow' });
  } catch (err) {
    console.error('[/api/hf-proxy] fetch error:', err);
    return new NextResponse('Upstream fetch failed', { status: 502 });
  }

  if (!upstream.ok) {
    return new NextResponse(`HuggingFace proxy error: ${upstream.status}`, {
      status: upstream.status,
    });
  }

  const contentType =
    upstream.headers.get('Content-Type') ?? 'application/octet-stream';

  const responseHeaders = new Headers();
  responseHeaders.set('Content-Type', contentType);
  // CORP header needed for COEP (require-corp) in the worker
  responseHeaders.set('Cross-Origin-Resource-Policy', 'same-origin');
  responseHeaders.set('Cache-Control', 'public, max-age=3600');

  if (isTokenizerConfig) {
    try {
      const text = await upstream.text();
      const json = JSON.parse(text);

      // Force fast tokenizer class
      json.tokenizer_class = 'PreTrainedTokenizerFast';

      // Ensure extra_special_tokens is an array
      if (json.extra_special_tokens !== undefined && !Array.isArray(json.extra_special_tokens)) {
        if (typeof json.extra_special_tokens === 'object' && json.extra_special_tokens !== null) {
          json.extra_special_tokens = Object.values(json.extra_special_tokens);
        } else {
          json.extra_special_tokens = [json.extra_special_tokens];
        }
      }

      const patchedBody = JSON.stringify(json, null, 2);
      responseHeaders.set('Content-Length', Buffer.byteLength(patchedBody).toString());

      return new NextResponse(patchedBody, {
        status: 200,
        headers: responseHeaders,
      });
    } catch (parseErr) {
      console.error('[/api/hf-proxy] failed to parse or patch tokenizer_config.json:', parseErr);
    }
  }

  const cl = upstream.headers.get('Content-Length');
  if (cl) responseHeaders.set('Content-Length', cl);

  return new NextResponse(upstream.body, {
    status: 200,
    headers: responseHeaders,
  });
}
