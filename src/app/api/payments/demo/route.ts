import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "Test payments cannot activate or renew cooperative membership." },
    { status: 410 },
  );
}
