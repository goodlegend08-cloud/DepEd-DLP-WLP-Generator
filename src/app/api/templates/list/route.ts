import { NextResponse } from "next/server";
import { loadTemplatesMeta } from "@/lib/template-processor";

export async function GET() {
  try {
    const templates = await loadTemplatesMeta();
    return NextResponse.json({ templates });
  } catch (error) {
    console.error("Failed to load templates:", error);
    return NextResponse.json(
      { error: "Failed to load templates" },
      { status: 500 }
    );
  }
}