import { SignJWT, jwtVerify } from "jose";
import { getRuntimeConfig } from "../env";

export interface TokenPayload {
  sub: string;
  type: "access" | "refresh";
}

function getSecret() {
  return new TextEncoder().encode(getRuntimeConfig().jwtSecret);
}

export async function signAccessToken(userId: string): Promise<string> {
  return new SignJWT({ sub: userId, type: "access" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecret());
}

export async function signRefreshToken(userId: string): Promise<string> {
  return new SignJWT({ sub: userId, type: "refresh" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(getSecret());
}

export async function verifyToken(token: string): Promise<TokenPayload> {
  const { payload } = await jwtVerify(token, getSecret());
  return {
    sub: String(payload.sub),
    type: payload.type as "access" | "refresh",
  };
}
