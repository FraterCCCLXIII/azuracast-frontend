import { NextRequest, NextResponse } from "next/server";

const DEFAULT_BASE_URL = "http://127.0.0.1";

function getUpstreamBaseUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_AZURACAST_BASE_URL?.trim();
  return fromEnv && fromEnv.length > 0 ? fromEnv : DEFAULT_BASE_URL;
}

function buildUpstreamUrl(request: NextRequest, path: string[]): URL {
  const upstreamBase = new URL(getUpstreamBaseUrl());
  const upstreamUrl = new URL(`/api/${path.join("/")}`, upstreamBase.origin);

  request.nextUrl.searchParams.forEach((value, key) => {
    upstreamUrl.searchParams.append(key, value);
  });

  return upstreamUrl;
}

function copyResponseHeaders(source: Headers): Headers {
  const headers = new Headers();
  const allowed = [
    "content-type",
    "cache-control",
    "etag",
    "last-modified",
    "expires",
  ];

  for (const key of allowed) {
    const value = source.get(key);
    if (value) {
      headers.set(key, value);
    }
  }

  return headers;
}

async function proxyRequest(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const { path } = await context.params;
  const upstreamUrl = buildUpstreamUrl(request, path);

  const requestHeaders = new Headers();
  const contentType = request.headers.get("content-type");
  if (contentType) {
    requestHeaders.set("content-type", contentType);
  }

  const init: RequestInit = {
    method: request.method,
    headers: requestHeaders,
    cache: "no-store",
  };

  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = await request.arrayBuffer();
  }

  const upstream = await fetch(upstreamUrl.toString(), init);

  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers: copyResponseHeaders(upstream.headers),
  });
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  return proxyRequest(request, context);
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  return proxyRequest(request, context);
}
