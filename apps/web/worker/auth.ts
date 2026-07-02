import { createRemoteJWKSet, jwtVerify } from "jose";

export type AuthUser = {
  id: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
};

const jwksCache = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

function getJWKS(supabaseUrl: string) {
  let jwks = jwksCache.get(supabaseUrl);
  if (!jwks) {
    jwks = createRemoteJWKSet(new URL(`${supabaseUrl}/auth/v1/.well-known/jwks.json`));
    jwksCache.set(supabaseUrl, jwks);
  }
  return jwks;
}

export async function verifyToken(token: string, supabaseUrl: string): Promise<AuthUser | null> {
  try {
    const jwks = getJWKS(supabaseUrl);
    const { payload } = await jwtVerify(token, jwks, {
      algorithms: ["ES256", "RS256"],
    });
    if (!payload.sub || !payload.email) {
      return null;
    }
    const userMetadata = payload.user_metadata as
      | { full_name?: string; name?: string; avatar_url?: string; picture?: string }
      | undefined;
    const displayName = userMetadata?.full_name ?? userMetadata?.name ?? null;
    const avatarUrl = userMetadata?.avatar_url ?? userMetadata?.picture ?? null;
    return {
      id: payload.sub,
      email: payload.email as string,
      displayName,
      avatarUrl,
    };
  } catch {
    return null;
  }
}
