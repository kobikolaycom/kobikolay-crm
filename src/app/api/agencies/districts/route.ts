import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { AgencyService } from "@/services/AgencyService";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
  }

  const province = req.nextUrl.searchParams.get("province");
  if (!province) {
    return NextResponse.json({ districts: [] });
  }

  const districts = await AgencyService.getDistrictsByProvince(province);
  return NextResponse.json({ districts });
}
