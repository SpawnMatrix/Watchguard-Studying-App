/**
 * Transport-level security primitives shared by every route.
 *
 * The portal is deployed internet-facing behind a reverse proxy (Pangolin).
 * Two things therefore cannot be inferred from the request and must be
 * configured explicitly: how many proxy hops to trust, and whether the
 * connection the browser sees is HTTPS.
 */
import type { Request, Response, NextFunction } from 'express';

/**
 * Proxy trust.
 *
 * Previously this trusted every RFC1918 address, which let a client walk the
 * `X-Forwarded-For` chain by supplying private-range hops of its own and so
 * choose its own `req.ip`. Every rate limiter keys on `req.ip`, so that made
 * all of them bypassable.
 *
 * `TRUSTED_PROXY_HOPS` is the number of reverse proxies in front of this
 * process (1 for a single Pangolin/Traefik/nginx layer). Express then takes
 * the address that many hops from the right of `X-Forwarded-For` and ignores
 * anything further left, which the client cannot influence.
 *
 * Default 0: trust nothing. A misconfigured deployment loses correct client
 * IPs in logs, which is recoverable; the previous default silently disabled
 * brute-force protection, which is not.
 */
export function proxyTrustSetting(): number | string[] {
  const raw = (process.env.TRUSTED_PROXY_HOPS ?? '').trim();
  const cidr = (process.env.TRUSTED_PROXY_CIDR ?? '').trim();
  if (cidr) return cidr.split(',').map(entry => entry.trim()).filter(Boolean);
  const hops = Number.parseInt(raw || '0', 10);
  return Number.isFinite(hops) && hops >= 0 ? hops : 0;
}

/**
 * Cookie `Secure` flag.
 *
 * `req.secure` only reports HTTPS when the proxy forwards
 * `X-Forwarded-Proto` and the hop is trusted. Behind a TLS-terminating proxy
 * that does not set the header, the session cookie was issued without
 * `Secure` over a connection the user believes is encrypted — and a client
 * able to spoof headers could strip the flag deliberately.
 *
 * Production defaults to secure cookies. `COOKIE_SECURE=false` is available
 * for plain-HTTP LAN deployments and must be set deliberately.
 */
export function cookiesAreSecure(): boolean {
  const raw = (process.env.COOKIE_SECURE ?? '').trim().toLowerCase();
  if (raw === 'true' || raw === '1') return true;
  if (raw === 'false' || raw === '0') return false;
  return process.env.NODE_ENV === 'production';
}

export interface CookieOptions {
  httpOnly: true;
  sameSite: 'strict';
  secure: boolean;
  path: '/';
  maxAge?: number;
}

export function cookieOptions(maxAgeMs?: number): CookieOptions {
  const options: CookieOptions = {
    httpOnly: true,
    sameSite: 'strict',
    secure: cookiesAreSecure(),
    path: '/',
  };
  if (maxAgeMs !== undefined) options.maxAge = maxAgeMs;
  return options;
}

/** Reads one cookie without pulling in a parser dependency. */
export function readCookie(req: Request, name: string): string | undefined {
  const header = req.headers.cookie;
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const entry = part.trim();
    if (entry.startsWith(name + '=')) return entry.slice(name.length + 1);
  }
  return undefined;
}

/**
 * Security headers.
 *
 * Hand-rolled rather than pulled from `helmet` so the hardening work adds no
 * new dependency to the production image or the Proxmox build.
 *
 * The CSP matches how the app actually loads: Vite emits hashed module
 * scripts and a stylesheet, and the only runtime fetches are same-origin API
 * calls. `'unsafe-inline'` is allowed for styles because Tailwind v4 and the
 * `motion` library both set inline style attributes; scripts get no such
 * exemption.
 */
export function securityHeaders(isProduction: boolean) {
  const csp = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(isProduction ? ['upgrade-insecure-requests'] : []),
  ].join('; ');

  return (_req: Request, res: Response, next: NextFunction) => {
    res.setHeader('Content-Security-Policy', csp);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=(), payment=()');
    res.removeHeader('X-Powered-By');
    if (isProduction && cookiesAreSecure()) {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    next();
  };
}

/**
 * Rejects cross-site writes. `SameSite=strict` already blocks the cookie on
 * cross-site requests; requiring a JSON body and a non-safelisted header
 * forces a preflight, so a form post cannot reach a mutating route at all.
 */
export function requireSameSiteWrite(req: Request, res: Response, next: NextFunction) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  if (!req.is('application/json') || req.get('X-Study-Request') !== '1' || req.get('Sec-Fetch-Site') === 'cross-site') {
    return res.status(403).json({ message: 'Open the study app to make this request.' });
  }
  next();
}
