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

function copyResponseHeaders(source: Headers, isRangeRequest: boolean): Headers {
  const headers = new Headers();

  const always = [
    "content-type",
    "cache-control",
    "etag",
    "last-modified",
    "expires",
    "content-length",
    "accept-ranges",
  ];

  // Include range-specific headers when the client sent a Range request.
  const rangeOnly = ["content-range"];

  for (const key of always) {
    const value = source.get(key);
    if (value) headers.set(key, value);
  }

  if (isRangeRequest) {
    for (const key of rangeOnly) {
      const value = source.get(key);
      if (value) headers.set(key, value);
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
  if (contentType) requestHeaders.set("content-type", contentType);

  // Forward the browser User-Agent so AzuraCast doesn't classify the server-side
  // proxy request as a search engine crawler (which blocks song requests).
  const userAgent = request.headers.get("user-agent");
  if (userAgent) requestHeaders.set("user-agent", userAgent);

  // Forward Range header so the upstream can honour partial-content requests
  // (required for audio seeking in browsers).
  const range = request.headers.get("range");
  const isRangeRequest = range !== null;
  if (isRangeRequest) requestHeaders.set("range", range);

  const init: RequestInit = {
    method: request.method,
    headers: requestHeaders,
    cache: "no-store",
  };

  if (request.method !== "GET" && request.method !== "HEAD") {
    const body = await request.arrayBuffer();
    if (body.byteLength > 0) {
      init.body = body;
    }
  }

  const upstream = await fetch(upstreamUrl.toString(), init);

  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers: copyResponseHeaders(upstream.headers, isRangeRequest),
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
