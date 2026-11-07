import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

// Security check helper
const isAdmin = (session: any) => session?.id && session.role === "ADMIN";

// 1. GET ALL USERS
export async function GET() {
  const session = await getSession();
  if (!isAdmin(session)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, credits: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(users);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 2. UPDATE USER (Credits or Role)
export async function PUT(req: Request) {
  const session = await getSession();
  if (!isAdmin(session)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id, credits, role } = await req.json();
    if (!id) return NextResponse.json({ error: "User ID required" }, { status: 400 });

    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        ...(credits !== undefined && { credits: parseInt(credits) }),
        ...(role !== undefined && { role }),
      },
    });

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 3. DELETE USER
export async function DELETE(req: Request) {
  const session = await getSession();
  if (!isAdmin(session)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "User ID required" }, { status: 400 });

    // Prevent admin from deleting themselves
    if (id === session.id) {
      return NextResponse.json({ error: "You cannot delete your own admin account." }, { status: 400 });
    }

    await prisma.user.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}