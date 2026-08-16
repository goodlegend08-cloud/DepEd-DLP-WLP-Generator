import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import fs from "fs/promises";
import path from "path";

// ============================================================
// TEMPLATE PLACEHOLDER DEFINITIONS
// ============================================================
export const DLP_PLACEHOLDERS = [
  "CALENDAR_DATE",
  "WEEK_NUMBER",
  "DAY_NUMBER",
  "TEACHER_NAME",
  "GRADE_AND_SECTION",
  "LEARNING_AREA",
  "GRADE_LEVEL",
  "LESSON_TITLE",
  "LEARNING_COMPETENCY",
  "DAY_OBJECTIVE",
  "LEARNERS_CONTEXT",
  "SUGGESTED_ACTIVITY",
  "SESSIONS",
  "REFERENCES",
  "AI_DECLARATION",
  "PRE_LESSON",
  "FLOW_ENGAGE",
  "FLOW_EXPLORE_EXPLAIN",
  "FLOW_ELABORATE",
  "FLOW_EVALUATE",
  "FLOW_REFLECTION",
  "LEARNING_RESOURCES",
  "OPPORTUNITIES_INTEGRATION",
  "FORMATIVE_FRUSTRATION",
  "FORMATIVE_INSTRUCTIONAL",
  "FORMATIVE_INDEPENDENT",
  "EXTENDED_ADVANCED",
  "EXTENDED_STRUGGLING",
  "REFLECTIONS",
  "PREPARED_BY",
  "CHECKED_BY_1",
  "CHECKED_BY_2",
  "CHECKED_BY_3",
  "NOTED_BY_1",
  "NOTED_BY_2",
] as const;

export type DLPPlaceholder = (typeof DLP_PLACEHOLDERS)[number];

export type PlaceholderValues = Record<DLPPlaceholder, string>;

// ============================================================
// TEMPLATE UPLOAD DIRECTORY
// ============================================================
export const TEMPLATES_DIR = path.join(process.cwd(), "templates");
export const TEMPLATES_META_FILE = path.join(TEMPLATES_DIR, "templates.json");

export interface TemplateMeta {
  id: string;
  name: string;
  filename: string;
  description: string;
  createdAt: string;
  isDefault?: boolean;
}

// ============================================================
// FILE SYSTEM HELPERS
// ============================================================
export async function ensureTemplatesDir(): Promise<void> {
  try {
    await fs.mkdir(TEMPLATES_DIR, { recursive: true });
  } catch {
    // directory already exists
  }
}

export async function loadTemplatesMeta(): Promise<TemplateMeta[]> {
  try {
    const data = await fs.readFile(TEMPLATES_META_FILE, "utf-8");
    return JSON.parse(data) as TemplateMeta[];
  } catch {
    return [];
  }
}

export async function saveTemplatesMeta(meta: TemplateMeta[]): Promise<void> {
  await ensureTemplatesDir();
  await fs.writeFile(TEMPLATES_META_FILE, JSON.stringify(meta, null, 2), "utf-8");
}

// ============================================================
// TEMPLATE PROCESSING
// ============================================================

/**
 * Load a .docx template, replace placeholders, and produce a filled Buffer.
 * The original template file is NEVER modified — we work on a copy in memory.
 */
export async function fillTemplate(
  templateFilePath: string,
  values: Record<string, string>
): Promise<Buffer> {
  // Read the template file as binary
  const templateBuffer = await fs.readFile(templateFilePath);

  // Load with PizZip (in-memory, original file untouched)
  const zip = new PizZip(templateBuffer);

  // Create docxtemplater instance with {{ }} delimiters
  // (template uses {{TAG}} syntax, not {TAG})
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    delimiters: { start: "{{", end: "}}" },
  });

  // Replace placeholders with values
  doc.render(values);

  // Generate the filled document as buffer
  const filledBuffer = doc.getZip().generate({
    type: "nodebuffer",
    mimeType:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });

  return filledBuffer as Buffer;
}

/**
 * Convenience: fill template using the standard DLP placeholder map.
 */
export async function fillDLPTemplate(
  templateFilePath: string,
  values: PlaceholderValues
): Promise<Buffer> {
  return fillTemplate(templateFilePath, values as Record<string, string>);
}

// ============================================================
// TEMPLATE AUTO-PATCHING (inject {{PLACEHOLDER}} tags)
// ============================================================

interface LabelMapping {
  patterns: RegExp[];
  placeholder: string;
}

const LABEL_MAPPINGS: LabelMapping[] = [
  {
    patterns: [/name\s+of\s+lesson/i],
    placeholder: "{{LESSON_TITLE}}",
  },
  {
    patterns: [/date.*week.*day/i, /^date$/i],
    placeholder: "{{CALENDAR_DATE}}  Week: {{WEEK_NUMBER}}  Day: {{DAY_NUMBER}}",
  },
  {
    patterns: [/designed\s+by/i],
    placeholder: "{{TEACHER_NAME}}",
  },
  {
    patterns: [/grade.*level.*section/i, /grade.*section/i],
    placeholder: "{{GRADE_AND_SECTION}}",
  },
  {
    patterns: [/no\.\s*of\s+sessions/i, /^sessions$/i],
    placeholder: "{{SESSIONS}}",
  },
  {
    patterns: [/^references$/i],
    placeholder: "{{REFERENCES}}",
  },
  {
    patterns: [/declaration\s+of\s+ai/i, /ai\s+declaration/i],
    placeholder: "{{AI_DECLARATION}}",
  },
  {
    patterns: [/learning\s+competency/i],
    placeholder: "{{LEARNING_COMPETENCY}}",
  },
  {
    patterns: [/learning\s+objectives/i],
    placeholder: "{{DAY_OBJECTIVE}}",
  },
  {
    patterns: [/learners?\s*context/i],
    placeholder: "{{LEARNERS_CONTEXT}}",
  },
  {
    patterns: [/pre[\s-]*lesson/i],
    placeholder: "{{PRE_LESSON}}",
  },
  {
    patterns: [/^flow/i],
    placeholder:
      "{{FLOW_ENGAGE}}\n\n{{FLOW_EXPLORE_EXPLAIN}}\n\n{{FLOW_ELABORATE}}\n\n{{FLOW_EVALUATE}}\n\n{{FLOW_REFLECTION}}",
  },
  {
    patterns: [/learning\s+resources/i],
    placeholder: "{{LEARNING_RESOURCES}}",
  },
  {
    patterns: [/opportunities.*integration/i, /^opportunities/i],
    placeholder: "{{OPPORTUNITIES_INTEGRATION}}",
  },
  {
    patterns: [/formative\s+assessment/i],
    placeholder:
      "{{FORMATIVE_FRUSTRATION}}\n\n{{FORMATIVE_INSTRUCTIONAL}}\n\n{{FORMATIVE_INDEPENDENT}}",
  },
  {
    patterns: [/extended\s+learning/i],
    placeholder: "{{EXTENDED_ADVANCED}}\n\n{{EXTENDED_STRUGGLING}}",
  },
  {
    patterns: [/^reflections?$/i],
    placeholder: "{{REFLECTIONS}}",
  },
];

/** Strip XML tags and return plain text content of a cell */
function extractCellText(cellXml: string): string {
  // Extract text from <w:t> tags
  const textMatches = cellXml.match(/<w:t[^>]*>([^<]*)<\/w:t>/g);
  if (!textMatches) return "";
  return textMatches
    .map((m) => m.replace(/<[^>]+>/g, ""))
    .join("")
    .trim();
}

/** Replace a cell's text content with new text, preserving cell properties */
function replaceCellContent(cellXml: string, newText: string): string {
  // Extract cell properties (borders, width, merged cells, etc.)
  const tcPrMatch = cellXml.match(/<w:tcPr>[\s\S]*?<\/w:tcPr>/);
  const tcPr = tcPrMatch ? tcPrMatch[0] : "";

  // For multi-line text, split on \n and create separate paragraphs
  const lines = newText.split("\n");

  const paragraphs = lines
    .map((line) => {
      if (line === "") {
        return `<w:p><w:r><w:t></w:t></w:r></w:p>`;
      }
      return `<w:p><w:r><w:rPr><w:sz w:val="20"/></w:rPr><w:t>${escapeXml(line)}</w:t></w:r></w:p>`;
    })
    .join("");

  // Build new cell preserving properties
  if (tcPr) {
    return `<w:tc>${tcPr}${paragraphs}</w:tc>`;
  }
  return `<w:tc>${paragraphs}</w:tc>`;
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// ============================================================
// TEMPLATE STRUCTURE EXTRACTION (for feeding layout to the LLM)
// ============================================================

/**
 * Extract a plain-text description of a template's layout so it can be
 * fed to Grok as {{EXTRACTED_TEMPLATE_TEXT_OR_STRUCTURE}}.
 * Includes table rows (label -> placeholder/value), placeholder tags,
 * and any standalone headings found in the document.
 */
export async function extractTemplateStructure(docxBuffer: Buffer): Promise<string> {
  const zip = new PizZip(docxBuffer);
  const docXml = zip.files["word/document.xml"]?.asText();
  if (!docXml) return "";

  const lines: string[] = [];
  const placeholders = new Set<string>();

  // Collect all {{...}} placeholder tags
  const tagRegex = /\{\{([^}]+)\}\}/g;
  let tagMatch: RegExpExecArray | null;
  while ((tagMatch = tagRegex.exec(docXml)) !== null) {
    placeholders.add(tagMatch[1].trim());
  }

  // Table rows: first cell = label, subsequent cells = value/placeholder
  const tableRowRegex = /<w:tr\b[^>]*>[\s\S]*?<\/w:tr>/gi;
  let rowMatch: RegExpExecArray | null;
  while ((rowMatch = tableRowRegex.exec(docXml)) !== null) {
    const row = rowMatch[0];
    const cellRegex = /<w:tc\b[^>]*>[\s\S]*?<\/w:tc>/gi;
    const cells: string[] = [];
    let cellMatch: RegExpExecArray | null;
    while ((cellMatch = cellRegex.exec(row)) !== null) {
      cells.push(extractCellText(cellMatch[0]));
    }
    if (cells.length >= 1) {
      const first = cells[0].trim();
      if (first) {
        const rest = cells.slice(1).map((c) => c.trim()).filter(Boolean);
        lines.push(
          `- ${first}${rest.length ? ` : ${rest.join(" | ")}` : ""}`
        );
      }
    }
  }

  // Standalone heading paragraphs (styles Heading1-6, or bold large text)
  const paraRegex = /<w:p\b[^>]*>[\s\S]*?<\/w:p>/gi;
  let paraMatch: RegExpExecArray | null;
  const seenParas = new Set<string>();
  while ((paraMatch = paraRegex.exec(docXml)) !== null) {
    const para = paraMatch[0];
    const isHeading = /Heading\s*[1-6]|pStyle[^>]*>[^<]*Heading/i.test(para);
    const text = extractCellText(para).trim();
    if (isHeading && text && !seenParas.has(text) && !text.includes("{{")) {
      seenParas.add(text);
      lines.push(`# ${text}`);
    }
  }

  const sections = [
    "TEMPLATE STRUCTURE:",
    ...lines,
  ];

  if (placeholders.size > 0) {
    sections.push("", `PLACEHOLDER TAGS (fill these with the corresponding content):`);
    sections.push(Array.from(placeholders).sort().join(", "));
  }

  return sections.join("\n");
}

/** Find the label mapping for a given cell text, or null if no match */
function findLabelMapping(cellText: string): LabelMapping | null {
  for (const mapping of LABEL_MAPPINGS) {
    for (const pattern of mapping.patterns) {
      if (pattern.test(cellText)) {
        return mapping;
      }
    }
  }
  return null;
}

/**
 * Auto-patch a DOCX template by injecting {{PLACEHOLDER}} tags.
 * Reads the document XML, finds table rows with known label patterns,
 * and replaces adjacent content cells with placeholder tags.
 * The original buffer is never modified — a new buffer is returned.
 */
export async function patchTemplateWithPlaceholders(
  docxBuffer: Buffer
): Promise<Buffer> {
  const zip = new PizZip(docxBuffer);
  const docXml = zip.files["word/document.xml"]?.asText();

  if (!docXml) {
    return docxBuffer; // No document.xml found, return as-is
  }

  let modifiedXml = docXml;
  let patchCount = 0;

  // Process each table row
  // Match each <w:tr> block including its content
  const tableRowRegex = /<w:tr\b[^>]*>[\s\S]*?<\/w:tr>/gi;
  const tableRows = modifiedXml.match(tableRowRegex);

  if (!tableRows) return docxBuffer;

  for (const row of tableRows) {
    // Extract all cells from this row
    const cellRegex = /<w:tc\b[^>]*>[\s\S]*?<\/w:tc>/gi;
    const cells = row.match(cellRegex);

    if (!cells || cells.length < 2) continue;

    const firstCellText = extractCellText(cells[0]);

    if (!firstCellText) continue;

    const mapping = findLabelMapping(firstCellText);

    if (!mapping) continue;

    // Check if the second cell already has placeholders
    const secondCellText = extractCellText(cells[1]);
    if (secondCellText.includes("{{") && secondCellText.includes("}}")) {
      continue; // Already patched, skip
    }

    // Replace the second cell's content with the placeholder
    const patchedCell = replaceCellContent(cells[1], mapping.placeholder);

    // Replace the original row with the patched version
    const patchedRow = row.replace(cells[1], patchedCell);
    modifiedXml = modifiedXml.replace(row, patchedRow);
    patchCount++;
  }

  if (patchCount > 0) {
    zip.file("word/document.xml", modifiedXml);
    return zip.generate({
      type: "nodebuffer",
      mimeType:
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    }) as Buffer;
  }

  return docxBuffer;
}