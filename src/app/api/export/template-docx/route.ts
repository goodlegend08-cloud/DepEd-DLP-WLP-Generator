import { NextResponse } from "next/server";
import path from "path";
import { createClient } from "@/lib/supabase/server";
import {
  loadTemplatesMeta,
  fillTemplate,
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

    const { templateId, values, outputFilename } = (await request.json()) as {
      templateId: string;
      values: Record<string, string>;
      outputFilename?: string;
    };

    if (!templateId || !values) {
      return NextResponse.json(
        { error: "Missing templateId or values" },
        { status: 400 }
      );
    }

    // Find the template
    const templates = await loadTemplatesMeta();
    const template = templates.find((t) => t.id === templateId);
    if (!template) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }

    // Build the path to the template file
    const templateFilePath = path.join(TEMPLATES_DIR, template.filename);

    // Fill the template (reads original, works on copy, never modifies original)
    const buffer = await fillTemplate(templateFilePath, values);

    const filename =
      outputFilename ||
      `DLP_${template.name.replace(/\s+/g, "_")}_filled.docx`;

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Template fill export error:", error);
    return NextResponse.json(
      { error: "Failed to generate document from template" },
      { status: 500 }
    );
  }
}