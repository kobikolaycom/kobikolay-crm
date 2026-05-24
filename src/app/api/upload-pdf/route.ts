import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { put } from "@vercel/blob";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file || file.size === 0) {
      return NextResponse.json({ error: "Dosya seçilmedi" }, { status: 400 });
    }

    // Validate file type
    if (file.type !== "application/pdf") {
      return NextResponse.json({ error: "Sadece PDF dosyası yüklenebilir" }, { status: 400 });
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "Dosya boyutu 10MB'ı geçemez" }, { status: 400 });
    }

    // Generate a clean filename
    const timestamp = Date.now();
    const safeName = file.name
      .replace(/[^a-zA-Z0-9._-]/g, "_")
      .replace(/_+/g, "_");
    const blobPath = `sectors/${timestamp}_${safeName}`;

    // Upload to Vercel Blob
    const blob = await put(blobPath, file, {
      access: "public",
      addRandomSuffix: false,
    });

    return NextResponse.json({ url: blob.url, success: true });
  } catch (error: any) {
    console.error("[upload-pdf] Error:", error);
    return NextResponse.json(
      { error: error.message || "Dosya yüklenemedi" },
      { status: 500 }
    );
  }
}
