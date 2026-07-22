/**
 * GET /api/model?repo=Kingman9407/hornet&file=model.onnx
 *
 * Server-side proxy that streams an ONNX model binary from HuggingFace Hub.
 * Required because:
 *  1. The model may be private / gated (uses HF_TOKEN for auth).
 *  2. HF CDN doesn't emit Cross-Origin-Resource-Policy headers, which COEP
 *     (require-corp) would block when the Web Worker fetches cross-origin.
 *  3. Streams the response without buffering so the browser can show progress.
 */

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs'; // need node streaming APIs

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const repo = searchParams.get('repo') ?? 'Kingman9407/hornet';
  const file = searchParams.get('file') ?? 'model.onnx';

  const hfUrl = `https://huggingface.co/${repo}/resolve/main/${file}`;

  let upstream: Response;
  try {
    let currentUrl = hfUrl;
    let redirectCount = 0;
    const maxRedirects = 5;

    while (true) {
      const hfHeaders: HeadersInit = {
        Accept: 'application/octet-stream',
      };
      
      const token = process.env.HF_TOKEN;
      if (!token && redirectCount === 0) {
        console.error('[/api/model] CRITICAL: process.env.HF_TOKEN is missing or undefined!');
        return new NextResponse('Server configuration error: HF_TOKEN is missing', { status: 500 });
      }

      if (token && redirectCount === 0) {
        hfHeaders['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(currentUrl, {
        headers: hfHeaders,
        redirect: 'manual',
      });

      if (res.status >= 300 && res.status < 400) {
        if (redirectCount >= maxRedirects) {
          throw new Error('Too many redirects');
        }
        const location = res.headers.get('location');
        if (!location) {
          throw new Error(`Redirect status ${res.status} returned without Location header`);
        }
        currentUrl = new URL(location, currentUrl).toString();
        redirectCount++;
        continue;
      }

      upstream = res;
      break;
    }
  } catch (err) {
    console.error('[/api/model] fetch error:', err);
    return new NextResponse('Upstream fetch failed', { status: 502 });
  }

  if (!upstream.ok) {
    console.error(`[/api/model] HuggingFace returned ${upstream.status} for ${hfUrl}`);
    return new NextResponse(`HuggingFace error: ${upstream.status} ${upstream.statusText}`, {
      status: upstream.status,
    });
  }

  const responseHeaders = new Headers();
  responseHeaders.set('Content-Type', 'application/octet-stream');
  // Required so COEP (require-corp) allows the worker to receive this response
  responseHeaders.set('Cross-Origin-Resource-Policy', 'same-origin');
  responseHeaders.set('Cache-Control', 'public, max-age=86400, immutable');

  // Forward Content-Length so the browser can show download progress
  const cl = upstream.headers.get('Content-Length');
  if (cl) responseHeaders.set('Content-Length', cl);

  return new NextResponse(upstream.body, {
    status: 200,
    headers: responseHeaders,
  });
}
