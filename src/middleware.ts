import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Initialize Redis only if environment variables are provided
const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

const redis = redisUrl && redisToken ? new Redis({
  url: redisUrl,
  token: redisToken,
}) : null;

// Create a new ratelimiter, that allows 20 requests per 10 seconds
const ratelimit = redis ? new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(20, '10 s'),
  analytics: true,
}) : null;

export async function middleware(request: NextRequest) {
  // Applica el rate limiting sólo a la rutas de la API
  if (request.nextUrl.pathname.startsWith('/api/') && ratelimit) {
    const ip = request.headers.get('x-forwarded-for') ?? (request as any).ip ?? '127.0.0.1';
    
    try {
      const { success, limit, reset, remaining } = await ratelimit.limit(ip);
      
      const response = success
        ? NextResponse.next()
        : NextResponse.json(
            { error: 'Too many requests. Please try again later.' },
            { status: 429 }
          );

      // Agrega rate limit headers
      response.headers.set('X-RateLimit-Limit', limit.toString());
      response.headers.set('X-RateLimit-Remaining', remaining.toString());
      response.headers.set('X-RateLimit-Reset', reset.toString());

      return response;
    } catch (error) {
      console.error('Rate limiting error:', error);
      // In case of Redis down, pass through or block depending on policy
      return NextResponse.next();
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
