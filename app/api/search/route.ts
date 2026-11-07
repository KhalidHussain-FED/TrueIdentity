import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session?.id) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const cnic = searchParams.get("cnic")?.replace(/\D/g, "");

  if (!cnic || cnic.length !== 13) {
    return NextResponse.json({ success: false, error: "Valid 13-digit CNIC required" }, { status: 400 });
  }

  try {
    const rows = await prisma.verificationRequest.findMany({
      where: {
        reference: cnic,
        ...(session.role !== "ADMIN" && { userId: session.id }), 
      },
      orderBy: { createdAt: "desc" },
      take: 1, // Only get the most recent record
    });

    if (rows.length === 0) {
      return NextResponse.json({ success: false, error: "No record found for this CNIC." }, { status: 404 });
    }

    const row = rows[0];
    let parsed: any = {};
    try { if (row.result) parsed = JSON.parse(row.result); } catch (e) {}

    // Return the FULL data for the ResultCard
    return NextResponse.json({
      success: true,
      result: {
        cnic: row.reference,
        found: row.status === "SUCCESS",
        summary: parsed.summary || "Match Successful",
        name: parsed.name || "N/A",
        nameUrdu: parsed.nameUrdu || "N/A",
        fatherName: parsed.fatherName || "N/A",
        motherName: parsed.motherName || "N/A",
        gender: parsed.gender || "N/A",
        dob: parsed.dob || "N/A",
        issueDate: parsed.issueDate || "N/A",
        expiryDate: parsed.expiryDate || "N/A",
        placeOfBirth: parsed.placeOfBirth || "N/A",
        address: parsed.address || "N/A",
        cnicImage: parsed.cnicImage || "",
      }
    });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}