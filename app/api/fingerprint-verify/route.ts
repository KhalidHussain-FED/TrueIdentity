import { NextResponse } from "next/server";
import { getSession } from "../../../lib/auth";
import { prisma } from "../../../lib/db";
import crypto from "crypto";

const CREDIT_COST = 50;
const TOKEN_URL = "https://api-gw.jazzcash.com.pk/jazzcash/app-catalog/rest/api/oauth-provider/oauth2/token";
const BIO_URL = "https://api-gw.jazzcash.com.pk/jazzcash/app-catalog/rest/api/v1/account/biometric";

const MERCHANT_CLIENT_ID = process.env.JC_CLIENT_ID || "25a87aca64f31f8ad98b207c92717382";
const MERCHANT_CLIENT_SECRET = process.env.JC_CLIENT_SECRET || "4d47671bcc0ae72b7cfd45a2ff0b23ab";
const MERCHANT_APP_VERSION = process.env.JC_APP_VERSION || "1.2.27";

const findDeep = (obj: any, keys: string[]): string => {
  if (!obj) return "";
  if (typeof obj === "object" && !Array.isArray(obj)) {
    for (const key of keys) {
      if (obj[key]) {
        if (typeof obj[key] === "string" && obj[key].trim() !== "" && obj[key].trim() !== "N/A") {
            return obj[key].trim();
        }
        if (typeof obj[key] === "object") {
           const nested = findDeep(obj[key], ["en", "ur", "value", "addressEn", "addressUr"]);
           if (nested) return nested;
        }
      }
    }
    for (const k of Object.keys(obj)) {
      const val = findDeep(obj[k], keys);
      if (val) return val;
    }
  }
  if (Array.isArray(obj)) {
    for (const item of obj) {
      const val = findDeep(item, keys);
      if (val) return val;
    }
  }
  return "";
};

function calculateIssueDate(expiryDate: string) {
  if (!expiryDate || expiryDate.toLowerCase() === "lifetime" || expiryDate === "N/A") return "N/A";
  try {
    const parts = expiryDate.split(/[-/]/);
    if (parts.length === 3) {
      const year = parseInt(parts[2].length === 2 ? "20" + parts[2] : parts[2]);
      const month = parseInt(parts[1]) - 1;
      const day = parseInt(parts[0]);
      const d = new Date(year, month, day);
      if (!isNaN(d.getTime())) {
        d.setFullYear(d.getFullYear() - 10);
        return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
      }
    }
  } catch (e) {}
  return "N/A";
}

async function getJazzCashToken() {
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: MERCHANT_CLIENT_ID,
    scope: "user",
    client_secret: MERCHANT_CLIENT_SECRET,
    "X-APP-VERSION": process.env.JC_OAUTH_APP_VERSION || "1.2.25",
  });

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "okhttp/4.7.2" },
    body: body.toString(),
  });
  
  const data = await res.json();
  if (!data.access_token) throw new Error("JazzCash OAuth Failed: " + JSON.stringify(data));
  return data.access_token;
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.id) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  try {
    const user = await prisma.user.findUnique({ where: { id: session.id } });
    if (!user) return NextResponse.json({ success: false, error: "Session expired. Log in again." }, { status: 401 });

    const formData = await req.formData();
    const cnic = String(formData.get("cnic") || "").replace(/\D/g, "");
    const file = (formData.get("file") || formData.get("fingerprint")) as File;

    if (cnic.length !== 13) return NextResponse.json({ success: false, error: "Valid 13-digit CNIC required" }, { status: 400 });
    if (!file) return NextResponse.json({ success: false, error: "Fingerprint image is required." }, { status: 400 });

    const imageB64 = Buffer.from(await file.arrayBuffer()).toString("base64");

    const token = await getJazzCashToken();
    const deviceId = crypto.randomBytes(8).toString("hex");
    
    let bioData: any = null;
    let isSuccess = false;
    
    const fingersToTry = [6, 1, 7, 2, 3, 8];

    for (const fingerIndex of fingersToTry) {
      const payload = {
        channel: "merchant", cnic, cnicIssueDate: "", deviceID: deviceId,
        deviceType: "android", email: "", fingerprintScore: 4, fingerprintType: 2,
        fingerprints: [{ fingerprintData: imageB64, fingerprintIndex: fingerIndex }], 
        latitude: 30.71378, longitude: 72.03971,
        msisdn: "03054479283", 
        name: " "
      };

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const bioRes = await fetch(BIO_URL, {
          method: "POST",
          signal: controller.signal,
          headers: {
            "X-DEVICE-ID": deviceId, "Accept": "*/*", "Authorization": `Bearer ${token}`,
            "X-IBM-CLIENT-ID": MERCHANT_CLIENT_ID, "X-APP-TYPE": "ANDROID",
            "X-IP-ADDRESS": "172.22.159.181", "X-ENV": "mProd", "X-MPIN": "",
            "X-APP-VERSION": MERCHANT_APP_VERSION, "X-MSISDN": "923054479283",
            "X-CHANNEL": "merchantApp", "X-DEVICE-TYPE": "ANDROID",
            "Content-Type": "application/json", "Connection": "Keep-Alive", "User-Agent": "okhttp/5.1.0",
          },
          body: JSON.stringify(payload),
        });
        clearTimeout(timeoutId);

        const tempData = await bioRes.json();
        
        let parsedData = tempData.data;
        if (typeof parsedData === "string") {
            try { parsedData = JSON.parse(parsedData); } catch(e) {}
        }
        if (Array.isArray(parsedData) && parsedData.length > 0) {
            parsedData = parsedData[0];
        }

        if (parsedData && (parsedData.dateOfExpiry || parsedData.cnicExpiryDate || parsedData.nameEn || parsedData.nameUr)) {
          bioData = { ...tempData, data: parsedData };
          isSuccess = true;
          break; 
        }
      } catch (err) {
        console.error("JazzCash fetch error:", err);
      }
      await new Promise(r => setTimeout(r, 1000));
    }

    if (!bioData) {
       return NextResponse.json({ success: false, error: "Fingerprint mismatch or Invalid format." }, { status: 400 });
    }

    const profile = bioData.data;
    
    const expiryDate = findDeep(profile, ["dateOfExpiry", "cnicExpiryDate", "expiryDate", "dateOfExpiryEn"]) || "";
    const issueDate = findDeep(profile, ["cnicIssueDate", "issueDate", "dateOfIssue"]) || calculateIssueDate(expiryDate);

    const address = findDeep(profile, [
       "permanentAddress", "presentAddress", "address", "residentialAddress", "currentAddress", "addressEn", "permanentAddressEn"
    ]) || "N/A";

    // FIXED: Extracting both names cleanly
    const nameEn = findDeep(profile, ["nameEn", "name", "fullName"]);
    const nameUr = findDeep(profile, ["nameUr", "nameUrdu", "name_ur"]);
    
    const finalName = nameEn || nameUr || "N/A";
    
    let imgUrl = profile.userCnicImage || "";
    if (imgUrl && !imgUrl.startsWith("data:image")) imgUrl = `data:image/jpeg;base64,${imgUrl}`;

    const resultData = {
      cnic, 
      name: finalName,
      nameUrdu: nameUr || finalName, 
      fatherName: findDeep(profile, ["fatherHusbandName", "fatherName", "fatherNameEn"]) || "N/A",
      motherName: findDeep(profile, ["motherNameEn", "motherName", "motherNameUr"]) || "N/A",
      gender: findDeep(profile, ["genderEn", "gender", "sex"]) || "N/A",
      dob: findDeep(profile, ["dateOfBirth", "dob", "birthDate"]) || "N/A",
      issueDate: issueDate,
      expiryDate: expiryDate || "N/A",
      placeOfBirth: findDeep(profile, ["placeOfBirth", "placeOfBirthEn", "birthPlace"]) || "N/A", 
      address: address,
      cnicImage: imgUrl, 
      found: isSuccess,
      summary: "Match Successful",
    };

    const savedRequest = await prisma.verificationRequest.create({
      data: { userId: session.id, type: "CNIC_MATCH", reference: cnic, status: "SUCCESS", result: JSON.stringify(resultData) },
    });

    await prisma.user.update({ where: { id: session.id }, data: { credits: { decrement: CREDIT_COST } } });

    return NextResponse.json({ success: true, found: true, request: { ...savedRequest, ...resultData }, result: resultData });

  } catch (error: any) {
    console.error("API ERROR:", error);
    return NextResponse.json({ success: false, error: error.message || "Internal Server Error" }, { status: 500 });
  }
}