export function getSiteUrlFromRequest(request: Request) {
  const requestUrl = new URL(request.url);
  const requestHeaders = new Headers(request.headers);
  const forwardedHost = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const forwardedProto = requestHeaders.get("x-forwarded-proto") ?? requestUrl.protocol.replace(":", "");
  const originHeader = requestHeaders.get("origin");

  if (forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`.replace(/\/+$/, "");
  }

  if (originHeader) {
    return originHeader.replace(/\/+$/, "");
  }

  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();

  if (configured) {
    return configured.replace(/\/+$/, "");
  }

  return requestUrl.origin;
}
