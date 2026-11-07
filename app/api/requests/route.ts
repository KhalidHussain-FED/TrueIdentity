import { NextResponse } from "next/server";
import { getSession } from "../../../lib/auth";
import { prisma } from "../../../lib/db";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session?.id) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  try {
    // Fetch ALL requests for this user (No type filter, so Bulk and Single both show)
    const rows = await prisma.verificationRequest.findMany({
      where: { userId: session.id },
      orderBy: { createdAt: "desc" },
      take: 200, // Increased limit to ensure bulk records show
    });

    const formattedRows = rows.map((row) => {
      let parsed: any = {};
      try { 
        if (row.result) parsed = JSON.parse(row.result); 
      } catch (e) {
        console.error("Failed to parse JSON for row", row.id);
      }

      return {
        id: row.id, 
        type: row.type, 
        reference: row.reference, 
        status: row.status, // 'SUCCESS' or 'FAILED'
        createdAt: row.createdAt.toISOString(), 
        cnic: row.reference,
        
        // Use safe fallbacks so it never returns undefined
        name: parsed.name || "N/A",
        nameUrdu: parsed.nameUrdu || parsed.name || "N/A",
        fatherName: parsed.fatherName || "N/A", 
        motherName: parsed.motherName || "N/A",
        dob: parsed.dob || "N/A", 
        issueDate: parsed.issueDate || "N/A",
        expiryDate: parsed.expiryDate || "N/A", 
        gender: parsed.gender || "N/A", 
        placeOfBirth: parsed.placeOfBirth || "N/A", 
        address: parsed.address || "N/A", 
        cnicImage: parsed.cnicImage || "", 
        summary: parsed.summary || (row.status === "SUCCESS" ? "Match Successful" : "Failed"),
      };
    });

    return NextResponse.json(formattedRows);
  } catch (error: any) {
    console.error("REQUESTS API ERROR:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}