import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    let cat = await prisma.businessCategory.findFirst({ where: { name: 'Seyahat Acenteleri TR' } });
    if (!cat) {
      cat = await prisma.businessCategory.create({ 
        data: { name: 'Seyahat Acenteleri TR', slug: 'seyahat-acenteleri-tr' } 
      });
    }
    
    const result = await prisma.agency.updateMany({ 
      where: { categoryId: null },
      data: { categoryId: cat.id } 
    });
    
    return NextResponse.json({
      success: true,
      message: `Tüm kategorisiz işletmeler 'Seyahat Acenteleri TR' kategorisine taşındı.`,
      updatedCount: result.count
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
