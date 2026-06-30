import { createRemoteJWKSet, jwtVerify } from "jose";

const supabaseUrl = process.env.SUPABASE_URL;
if (!supabaseUrl) {
  throw new Error("SUPABASE_URL is required");
}

const JWKS = createRemoteJWKSet(new URL(`${supabaseUrl}/auth/v1/.well-known/jwks.json`));

export type AuthUser = {
  id: string;
  email: string;
};

export async function verifyToken(token: string): Promise<AuthUser | null> {
  try {
    const { payload } = await jwtVerify(token, JWKS, {
      algorithms: ["ES256", "RS256"],
    });
    if (!payload.sub || !payload.email) {
      return null;
    }
    return {
      id: payload.sub,
      email: payload.email as string,
    };
  } catch {
    return null;
  }
}
