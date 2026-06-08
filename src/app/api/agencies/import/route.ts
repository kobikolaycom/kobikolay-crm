import { NextRequest } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import * as XLSX from "xlsx";

export const maxDuration = 300; // 5 minutes max

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return new Response(JSON.stringify({ error: "Yetkisiz erişim" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Role check: only admins can import
  const role = session.user.role;
  const permissions = (session.user as any).permissions;
  if (role !== "Super Admin" && !(Array.isArray(permissions) && permissions.includes("*"))) {
    return new Response(JSON.stringify({ error: "Import için yetkiniz yok" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const sectorId = formData.get("sectorId") as string | null;

    if (!file) {
      return new Response(JSON.stringify({ error: "Dosya yüklenmedi" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // File validation: size (max 10MB) and type
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    if (file.size > MAX_FILE_SIZE) {
      return new Response(JSON.stringify({ error: "Dosya boyutu 10MB'ı aşamaz" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    const allowedExtensions = [".xlsx", ".xls"];
    const fileName = file.name?.toLowerCase() || "";
    if (!allowedExtensions.some(ext => fileName.endsWith(ext))) {
      return new Response(JSON.stringify({ error: "Sadece .xlsx ve .xls dosyaları kabul edilir" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Read Excel file
    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });

    if (rows.length === 0) {
      return new Response(JSON.stringify({ error: "Excel dosyası boş" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Detect column mappings
    const keys = Object.keys(rows[0]);
    const findCol = (patterns: string[]) =>
      keys.find((k) => patterns.some((p) => {
        const keyLower = k.toLowerCase().trim();
        const patLower = p.toLowerCase().trim();
        
        // Exact match is always preferred
        if (keyLower === patLower) return true;

        // Specific exclusions to prevent "email adresi" matching "adres"
        if (patLower === "adres" && (keyLower.includes("email") || keyLower.includes("mail") || keyLower.includes("posta"))) {
          return false;
        }

        // Specific exclusions to prevent "email" matching "il"
        if (patLower === "il" && (keyLower.includes("email") || keyLower.includes("mail") || keyLower.includes("ilçe"))) {
          return false;
        }
        
        return keyLower.includes(patLower);
      }));

    const companyCol = findCol(["firma", "şirket", "company", "acente", "unvan", "ünvan", "ad"]);
    const docCol = findCol(["belge", "document", "belge no", "tursab", "sicil"]);
    const phoneCol = findCol(["tel", "phone", "telefon"]);
    const emailCol = findCol(["mail", "email", "e-posta", "eposta"]);
    const addressCol = findCol(["adres", "address"]);
    const provinceCol = findCol(["il", "şehir", "province", "city"]);
    const districtCol = findCol(["ilçe", "district"]);
    const websiteCol = findCol(["web", "site", "website"]);
    const authorizedCol = findCol(["yetkili", "authorized", "kişi", "sorumlu"]);
    const btkCol = findCol(["btk", "bölge", "zone"]);

    if (!companyCol) {
      return new Response(
        JSON.stringify({
          error: "Excel'de firma adı sütunu bulunamadı. Sütun başlığında 'firma', 'şirket', 'acente' veya 'unvan' olmalı.",
          columns: keys,
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // ─── STREAMING RESPONSE ───
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const total = rows.length;
        let created = 0;
        let skipped = 0;
        let errors: string[] = [];
        const BATCH_SIZE = 50;

        // Send initial info
        controller.enqueue(
          encoder.encode(
            JSON.stringify({ type: "start", total, columns: keys }) + "\n"
          )
        );

        // Get existing documentNos for fast duplicate check
        const existingDocs = new Set<string>();
        const allExisting = await prisma.agency.findMany({
          select: { documentNo: true },
        });
        allExisting.forEach((a) => existingDocs.add(a.documentNo));

        for (let i = 0; i < total; i += BATCH_SIZE) {
          const batch = rows.slice(i, i + BATCH_SIZE);
          const agenciesToCreate: any[] = [];
          const contactsToCreate: any[] = [];

          for (const row of batch) {
            const companyName = String(row[companyCol] || "").trim();
            if (!companyName) {
              skipped++;
              continue;
            }

            let documentNo = docCol ? String(row[docCol] || "").trim() : "";
            if (!documentNo) {
              documentNo = `AUTO-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
            }

            if (existingDocs.has(documentNo)) {
              skipped++;
              continue;
            }

            // Mark as seen
            existingDocs.add(documentNo);

            const agencyId = crypto.randomUUID();
            agenciesToCreate.push({
              id: agencyId,
              companyName,
              documentNo,
              website: websiteCol ? String(row[websiteCol] || "").trim() || null : null,
              authorizedPerson: authorizedCol ? String(row[authorizedCol] || "").trim() || null : null,
              btkZone: btkCol ? String(row[btkCol] || "").trim() || null : null,
              status: "PASSIVE",
            });

            // Build contact data
            const phone = phoneCol ? String(row[phoneCol] || "").trim() : "";
            const email = emailCol ? String(row[emailCol] || "").trim() : "";
            const address = addressCol ? String(row[addressCol] || "").trim() : "";
            const province = provinceCol ? String(row[provinceCol] || "").trim() : "";
            const district = districtCol ? String(row[districtCol] || "").trim() : "";

            if (phone || email || address || province || district) {
              contactsToCreate.push({
                agencyId,
                phone: phone || null,
                email: email || null,
                address: address || null,
                province: province || null,
                district: district || null,
              });
            }
          }

          // Batch insert agencies
          if (agenciesToCreate.length > 0) {
            try {
              await prisma.agency.createMany({
                data: agenciesToCreate,
                skipDuplicates: true,
              });

              // Batch insert contacts
              if (contactsToCreate.length > 0) {
                await prisma.contact.createMany({
                  data: contactsToCreate,
                  skipDuplicates: true,
                });
              }

              // Link to sector if specified
              if (sectorId && sectorId !== "none") {
                for (const agency of agenciesToCreate) {
                  try {
                    await prisma.agency.update({
                      where: { id: agency.id },
                      data: { sectors: { connect: { id: sectorId } } },
                    });
                  } catch {
                    // Sector link failure is not critical
                  }
                }
              }

              created += agenciesToCreate.length;
            } catch (err: any) {
              errors.push(`Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${err.message}`);
            }
          }

          // Send progress update
          const processed = Math.min(i + BATCH_SIZE, total);
          const percent = Math.round((processed / total) * 100);
          controller.enqueue(
            encoder.encode(
              JSON.stringify({
                type: "progress",
                processed,
                total,
                percent,
                created,
                skipped,
              }) + "\n"
            )
          );
        }

        // Send final result
        controller.enqueue(
          encoder.encode(
            JSON.stringify({
              type: "done",
              success: true,
              created,
              skipped,
              total,
              errors: errors.slice(0, 10),
            }) + "\n"
          )
        );

        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
        "Cache-Control": "no-cache",
      },
    });
  } catch (error: any) {
    console.error("Excel import error:", error);
    return new Response(
      JSON.stringify({ error: "Import işlemi başarısız oldu" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
