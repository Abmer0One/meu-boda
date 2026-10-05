import { NextResponse } from 'next/server';

// Deny-list for loopback, local network, and cloud metadata IPs
const BLOCKED_HOSTS = new Set([
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '169.254.169.254', // AWS/GCP/Azure link-local metadata
  'metadata.google.internal',
  'instance-data',
  '::1',
]);

function isPrivateOrLocalHost(hostname: string): boolean {
  const lower = hostname.toLowerCase();
  if (BLOCKED_HOSTS.has(lower)) return true;

  // Private IPv4 ranges
  // 10.0.0.0 - 10.255.255.255
  if (/^10\./.test(lower)) return true;
  // 172.16.0.0 - 172.31.255.255
  if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(lower)) return true;
  // 192.168.0.0 - 192.168.255.255
  if (/^192\.168\./.test(lower)) return true;
  // 127.0.0.0 - 127.255.255.255
  if (/^127\./.test(lower)) return true;
  // Link-local 169.254.0.0 - 169.254.255.255
  if (/^169\.254\./.test(lower)) return true;

  return false;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const imageUrl = searchParams.get('url');

  if (!imageUrl) {
    return NextResponse.json({ error: 'Parâmetro de URL obrigatório.' }, { status: 400 });
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(imageUrl);
  } catch {
    return NextResponse.json({ error: 'URL inválida.' }, { status: 400 });
  }

  // 1. Strict HTTPS protocol requirement
  if (parsedUrl.protocol !== 'https:') {
    return NextResponse.json({ error: 'Apenas ligações seguras HTTPS são permitidas.' }, { status: 400 });
  }

  // 2. Anti-SSRF: Block local/internal hosts and cloud metadata
  if (isPrivateOrLocalHost(parsedUrl.hostname)) {
    return NextResponse.json({ error: 'Endereço de destino restrito.' }, { status: 403 });
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s timeout

    const res = await fetch(imageUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'MeuBoda-ImageProxy/1.0',
        Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      },
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      return NextResponse.json({ error: 'Falha ao carregar imagem remota.' }, { status: 502 });
    }

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.toLowerCase().startsWith('image/')) {
      return NextResponse.json({ error: 'O ficheiro solicitado não é uma imagem válida.' }, { status: 415 });
    }

    // Limit maximum image response buffer (10 MB)
    const arrayBuffer = await res.arrayBuffer();
    if (arrayBuffer.byteLength > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'Imagem excede o limite máximo permitido (10MB).' }, { status: 413 });
    }

    return new NextResponse(arrayBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400, s-maxage=86400',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (err: any) {
    console.error('Proxy image error:', err?.message);
    return NextResponse.json({ error: 'Não foi possível descarregar a imagem.' }, { status: 500 });
  }
}
