import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

// 1. DELETE a record
export async function DELETE(req: Request) {
  const session = await getSession();
  if (!session?.id || session.role !== "ADMIN") {
    return NextResponse.json({ success: false, error: "Unauthorized. Admin access required." }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) return NextResponse.json({ success: false, error: "Record ID required" }, { status: 400 });

    await prisma.verificationRequest.delete({ where: { id } });
    return NextResponse.json({ success: true, message: "Record deleted successfully." });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// 2. UPDATE (Edit) a record
export async function PUT(req: Request) {
  const session = await getSession();
  if (!session?.id || session.role !== "ADMIN") {
    return NextResponse.json({ success: false, error: "Unauthorized. Admin access required." }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { id, name, fatherName, motherName, dob, issueDate, expiryDate, address, gender, placeOfBirth } = body;

    if (!id) return NextResponse.json({ success: false, error: "Record ID required" }, { status: 400 });

    const existing = await prisma.verificationRequest.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ success: false, error: "Record not found" }, { status: 404 });

    let parsed: any = {};
    try { if (existing.result) parsed = JSON.parse(existing.result); } catch (e) {}

    // Merge old data with new edits
    const updatedResult = {
      ...parsed,
      name: name !== undefined ? name : parsed.name,
      nameUrdu: name !== undefined ? name : parsed.nameUrdu,
      fatherName: fatherName !== undefined ? fatherName : parsed.fatherName,
      motherName: motherName !== undefined ? motherName : parsed.motherName,
      dob: dob !== undefined ? dob : parsed.dob,
      issueDate: issueDate !== undefined ? issueDate : parsed.issueDate,
      expiryDate: expiryDate !== undefined ? expiryDate : parsed.expiryDate,
      address: address !== undefined ? address : parsed.address,
      gender: gender !== undefined ? gender : parsed.gender,
      placeOfBirth: placeOfBirth !== undefined ? placeOfBirth : parsed.placeOfBirth,
    };

    const updatedRecord = await prisma.verificationRequest.update({
      where: { id },
      data: { result: JSON.stringify(updatedResult) },
    });

    return NextResponse.json({ success: true, data: updatedRecord });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}