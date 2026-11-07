import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

export async function getSession() {
  // 🚨 FIXED: Added 'await' before cookies() for Next.js 15
  const token = (await cookies()).get("token")?.value;
  
  if (!token) return null;
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!);
    return decoded as { id: string; role: string };
  } catch (e) {
    return null;
  }
}