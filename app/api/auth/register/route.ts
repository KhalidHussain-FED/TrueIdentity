import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const { email, password, name, role } = await req.json(); // <-- Added role here

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return NextResponse.json({ error: "User already exists" }, { status: 400 });

    const passwordHash = await bcrypt.hash(password, 10);
    
    // Safety check: Ensure role is either USER or ADMIN
    const finalRole = role === "ADMIN" ? "ADMIN" : "USER";

    const user = await prisma.user.create({
      data: { 
        email, 
        passwordHash, 
        name, 
        role: finalRole, // <-- Save the selected role
        credits: 500 // 500 free starter credits
      }
    });
    
    return NextResponse.json({ success: true, userId: user.id });
  } catch (e) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}