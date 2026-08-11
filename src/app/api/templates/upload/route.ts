import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { createClient } from "@/lib/supabase/server";
import {
  ensureTemplatesDir,
  loadTemplatesMeta,
  saveTemplatesMeta,
  patchTemplateWithPlaceholders,
  TEMPLATES_DIR,
} from "@/lib/template-processor";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const name = formData.get("name") as string | null;
    const description = formData.get("description") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!file.name.endsWith(".docx")) {
      return NextResponse.json(
        { error: "Only .docx files are accepted" },
        { status: 400 }
      );
    }

    // Generate unique filename
    const safeName = name || file.name.replace(/\.docx$/i, "");
    const filename = `${Date.now()}_${safeName.replace(/[^a-zA-Z0-9_-]/g, "_")}.docx`;

    // Save file to templates directory
    await ensureTemplatesDir();
    const filePath = path.join(TEMPLATES_DIR, filename);
    const buffer = Buffer.from(await file.arrayBuffer());

    // Auto-patch the template to inject {{PLACEHOLDER}} tags
    const patchedBuffer = await patchTemplateWithPlaceholders(buffer);
    await fs.writeFile(filePath, patchedBuffer);

    // Register in metadata
    const templates = await loadTemplatesMeta();
    const newTemplate = {
      id: `tpl_${Date.now()}`,
      name: safeName,
      filename,
      description: description || "",
      createdAt: new Date().toISOString(),
    };
    templates.push(newTemplate);
    await saveTemplatesMeta(templates);

    return NextResponse.json({ template: newTemplate });
  } catch (error) {
    console.error("Template upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload template" },
      { status: 500 }
    );
  }
}