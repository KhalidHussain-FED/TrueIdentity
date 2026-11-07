import { NextResponse } from "next/server";
// 🚨 FIXED: Using relative path instead of @/ alias
import { prisma } from "../../../../lib/db"; 
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });

    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET!, { expiresIn: "7d" });
    const response = NextResponse.json({ success: true, role: user.role });
    
    response.cookies.set("token", token, { httpOnly: true, secure: process.env.NODE_ENV === "production", path: "/" });
    return response;
  } catch (e: any) {
    console.error("LOGIN ERROR:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}