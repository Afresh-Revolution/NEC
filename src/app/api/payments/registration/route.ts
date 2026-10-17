import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "Membership payments are processed through the annual membership fee checkout." },
    { status: 410 },
  );
}
