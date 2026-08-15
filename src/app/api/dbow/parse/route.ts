import { NextResponse } from "next/server";
import PDFParser from "pdf2json";
import PizZip from "pizzip";

/**
 * Structured DBOW row, per the CALENDAR & DBOW MAPPING spec:
 * [Term, Week_Number, Day_Number, Content_Standard, Performance_Standard,
 *  Learning_Competency, Daily_Objective, Suggested_Activity]
 * plus context fields used by the Date Engine / prompt injection.
 */
export interface DBOWEntry {
  term: string;
  contentArea: string;
  weekRange: string;
  weekNumber: string;
  competency: string;
  day: string;
  dayNumber: string;
  objective: string;
  daysTaught: string;
  contentStandard: string;
  performanceStandard: string;
  suggestedActivity: string;
  date: string;
  specificDate?: string;
}

export interface DBOWData {
  rawText: string;
  entries: DBOWEntry[];
  terms: string[];
  contentAreas: string[];
  gradeLevel: string;
  learningArea: string;
}

/** Extract plain text from a .docx buffer (word/document.xml). */
function extractTextFromDocx(buffer: Buffer): string {
  const zip = new PizZip(buffer);
  const docXml = zip.files["word/document.xml"]?.asText();
  if (!docXml) return "";

  const parts: string[] = [];

  // Table rows: join cell texts so DBOW columns remain readable.
  const rowRegex = /<w:tr\b[^>]*>[\s\S]*?<\/w:tr>/gi;
  const rows = docXml.match(rowRegex);
  if (rows) {
    for (const row of rows) {
      const rowCells = [...row.matchAll(/<w:tc\b[^>]*>[\s\S]*?<\/w:tc>/gi)]
        .map((c) =>
          (c[0].match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || [])
            .map((m) => m.replace(/<[^>]+>/g, ""))
            .join(" ")
            .trim()
        )
        .filter(Boolean);
      if (rowCells.length > 0) {
        parts.push(rowCells.join("   "));
      }
    }
  }

  // Paragraph text (non-table content)
  const paraRegex = /<w:p\b[^>]*>[\s\S]*?<\/w:p>/gi;
  let paraMatch: RegExpExecArray | null;
  const paraTexts: string[] = [];
  while ((paraMatch = paraRegex.exec(docXml)) !== null) {
    const text = (paraMatch[0].match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || [])
      .map((m) => m.replace(/<[^>]+>/g, ""))
      .join(" ")
      .trim();
    if (text) paraTexts.push(text);
  }

  return [...parts, ...paraTexts].join("\n");
}

interface PDFTextRun {
  T?: string;
}

interface PDFTextItem {
  R?: PDFTextRun[];
}

interface PDFPage {
  Texts?: PDFTextItem[];
}

interface PDFData {
  Pages?: PDFPage[];
}

function extractTextFromPDF(pdfData: PDFData): string {
  const textParts: string[] = [];

  if (pdfData.Pages) {
    for (const page of pdfData.Pages) {
      if (page.Texts) {
        for (const text of page.Texts) {
          if (text.R) {
            for (const r of text.R) {
              if (r.T) {
                // Decode URI-encoded text
                textParts.push(decodeURIComponent(r.T));
              }
            }
          }
        }
        textParts.push("\n");
      }
    }
  }

  return textParts.join(" ");
}

function extractDateFromContext(context: string): string {
  const normalized = context.replace(/[ \t]+/g, " ");

  // Match patterns like "June 16-20, 2025", "June 16 – 20, 2025", "Jun 16-20 2025"
  const monthNames = "January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec";
  const datePatterns = [
    // "June 16-20, 2025" or "June 16 – 20, 2025"
    new RegExp(`(${monthNames})\\s+(\\d{1,2})\\s*[-–]\\s*(\\d{1,2}),?\\s*(\\d{4})`, "i"),
    // "16-20 June 2025" or "16 – 20 June 2025"
    new RegExp(`(\\d{1,2})\\s*[-–]\\s*(\\d{1,2})\\s+(${monthNames})\\s+(\\d{4})`, "i"),
    // "June 16, 2025" (single day)
    new RegExp(`(${monthNames})\\s+(\\d{1,2}),?\\s*(\\d{4})`, "i"),
  ];

  // Pattern 1: Month Day-Day, Year
  const p1 = normalized.match(datePatterns[0]);
  if (p1) {
    return `${p1[1]} ${p1[2]}-${p1[3]}, ${p1[4]}`;
  }

  // Pattern 2: Day-Day Month Year
  const p2 = normalized.match(datePatterns[1]);
  if (p2) {
    return `${p2[3]} ${p2[1]}-${p2[2]}, ${p2[4]}`;
  }

  // Pattern 3: Single day Month Year
  const p3 = normalized.match(datePatterns[2]);
  if (p3) {
    return `${p3[1]} ${p3[2]}, ${p3[3]}`;
  }

  return "";
}

function computeSpecificDate(dateRange: string, dayNumber: string): string {
  const monthNames = "January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec";
  const dayInWeek = parseInt(dayNumber.replace(/\D/g, ""), 10);
  if (isNaN(dayInWeek) || dayInWeek < 1 || dayInWeek > 5) return "";

  const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  const fmt = (d: Date) =>
    `${MONTHS[d.getMonth()]} ${String(d.getDate()).padStart(2, "0")}, ${d.getFullYear()}`;

  // Try range format first: "July 23-27, 2026"
  const rangeMatch = dateRange.match(
    new RegExp(`(${monthNames})\\s+(\\d{1,2})\\s*[-–]\\s*(\\d{1,2}),?\\s*(\\d{4})`, "i")
  );
  if (rangeMatch) {
    const monthName = rangeMatch[1];
    const startDay = parseInt(rangeMatch[2], 10);
    const year = parseInt(rangeMatch[4], 10);
    const monthIndex = new Date(`${monthName} 1, ${year}`).getMonth();
    if (isNaN(monthIndex)) return "";

    // Find the Monday of the week containing the start date
    const startDate = new Date(year, monthIndex, startDay);
    const dayOfWeek = startDate.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(year, monthIndex, startDay + mondayOffset);

    // Compute specific date: Monday + (dayInWeek - 1)
    const specificDate = new Date(monday);
    specificDate.setDate(monday.getDate() + dayInWeek - 1);

    return fmt(specificDate);
  }

  // Try single date format: "July 24, 2026"
  const singleMatch = dateRange.match(
    new RegExp(`(${monthNames})\\s+(\\d{1,2}),?\\s*(\\d{4})`, "i")
  );
  if (singleMatch) {
    const monthName = singleMatch[1];
    const day = parseInt(singleMatch[2], 10);
    const year = parseInt(singleMatch[3], 10);
    const monthIndex = new Date(`${monthName} 1, ${year}`).getMonth();
    if (isNaN(monthIndex)) return "";

    // The single date is the start; find its Monday
    const startDate = new Date(year, monthIndex, day);
    const dayOfWeek = startDate.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(year, monthIndex, day + mondayOffset);

    // Compute specific date: Monday + (dayInWeek - 1)
    const specificDate = new Date(monday);
    specificDate.setDate(monday.getDate() + dayInWeek - 1);

    return fmt(specificDate);
  }

  return "";
}

/** Split normalized text into term sections with their boundaries. */
function splitTerms(text: string): { name: string; start: number; end: number }[] {
  const terms: { name: string; start: number; end: number }[] = [];
  for (const tname of ["FIRST TERM", "SECOND TERM", "THIRD TERM"]) {
    const idx = text.toUpperCase().indexOf(tname);
    if (idx >= 0) terms.push({ name: tname, start: idx, end: text.length });
  }
  terms.sort((a, b) => a.start - b.start);
  for (let i = 0; i < terms.length; i++) {
    terms[i].end = i + 1 < terms.length ? terms[i + 1].start : text.length;
  }
  return terms;
}

/** Extract term-level sections: CONTENT STANDARD / PERFORMANCE STANDARD / SUGGESTED ACTIVITIES. */
function extractTermSections(
  termText: string
): { contentStandard: string; performanceStandard: string; suggestedActivity: string } {
  const up = termText.toUpperCase();
  const cs = up.indexOf("CONTENT STANDARD");
  const ps = up.indexOf("PERFORMANCE STANDARD");
  const sa = up.indexOf("SUGGESTED ACTIVITIES");
  const spt = up.indexOf("SUGGESTED PERFORMANCE TASK");

  const clean = (s: string) => s.replace(/\s+/g, " ").trim();

  const contentStandard = cs >= 0 && ps > cs ? clean(termText.substring(cs + 16, ps)) : "";
  const performanceStandard = ps >= 0 && sa > ps ? clean(termText.substring(ps + 20, sa)) : "";
  const suggestedActivity =
    sa >= 0 && spt > sa ? clean(termText.substring(sa + 20, spt)) : "";

  return { contentStandard, performanceStandard, suggestedActivity };
}

/** Verbs that commonly start a DBOW learning competency sentence. */
const COMPETENCY_START_VERBS =
  "Identify|Describe|Explain|Compare|Demonstrate|Investigate|Observe|Differentiate|Draw|Participate|Gather|Analyze|Construct|Predict|Arrange|Distinguish|Recognize|Determine|Summarize|Trace|Cite|Collaborate|Read|Use|Apply|Interpret|Classify|Solve|Compute|Develop|Create|Design|Evaluate|Present|Connect|Relate|Translate|Convert|Perform|Measure|Record|Tabulate|Graph|Infer|Formulate|Propose|Illustrate|Model|Simulate|Carry|State|List|Define|Outline|Show|Justify|Explain|Discuss";

/** Content area patterns to detect topic headers in DBOW text. */
const contentAreaPatterns = [
  /Newton's\s+Laws,\s*Force\s*,?\s*and\s+Energy/i,
  /Electric\s+Current,\s*Electrical\s+Circuits[^,.]*?(?:and\s+Electromagneti\s*c\s*Waves)/i,
  /Electric\s+Current[^,.]*/i,
  /Plate\s+Boundaries/i,
  /DNA\s+Replication/i,
  /Biodiversity/i,
  /Types\s+of\s+Ecosystems/i,
  /Chemical\s+Bonding[^,.]*/i,
  /Valid\s+and\s+Reliable[^,.]*/i,
  /Origin\s+of\s+the\s+Solar\s+System/i,
  /Space\s+Technologies/i,
  /Electromagnetic\s+Spectrum/i,
  /Scale,\s*Proportion,\s*and\s*Quantity/i,
  /Structure\s+of\s+the\s+Earth/i,
  /Geologic\s+Time/i,
];

/**
 * Parse DBOW text into structured day entries.
 * For each term it extracts Content Standard, Performance Standard, and
 * Suggested Activities, then walks the "Day N:" rows. Each unit Learning
 * Competency ends with a ". <days> Day <firstDay>:" boundary, so a term is
 * split into competency blocks first — the block's unit line becomes the
 * entry's `competency` and each "Day N:" entry gets its own daily `objective`.
 */
function parseDBOWEntries(text: string): DBOWEntry[] {
  const entries: DBOWEntry[] = [];

  // Normalize text: collapse multiple spaces, trim
  const normalized = text.replace(/[ \t]+/g, " ").trim();

  const terms = splitTerms(normalized);

  // Track current context (persisted across terms so fallbacks are stable)
  let currentContentArea = "";
  let currentWeekRange = "";
  let currentDateRange = "";

  for (const term of terms) {
    const termText = normalized.substring(term.start, term.end);
    const { contentStandard, performanceStandard, suggestedActivity } =
      extractTermSections(termText);

    // The table starts at the "LEARNING COMPETENCIES AND SPECIFIC OBJECTIVES" header
    const tableHeaderIdx = termText.toUpperCase().indexOf("LEARNING COMPETENCIES");
    const tableText = tableHeaderIdx >= 0 ? termText.substring(tableHeaderIdx) : termText;

    // Find all "Day N:" positions within this term
    const dayPositions: { index: number; dayNum: string }[] = [];
    const dayHeaderRegex = /Day\s+(\d+(?:\s*[-–]\s*\d+)?)\s*:/gi;
    let match: RegExpExecArray | null;
    while ((match = dayHeaderRegex.exec(tableText)) !== null) {
      dayPositions.push({ index: match.index, dayNum: match[1].replace(/\s/g, "") });
    }

    // A unit Learning Competency ends with ". <days> Day <firstDay>:" —
    // use that boundary to split the term into competency blocks.
    const blocks: {
      periodIdx: number;
      firstDay: number;
      competencyStart: number;
      competency: string;
    }[] = [];
    const boundaryRegex = /\.\s+(\d{1,2})\s+Day\s+(\d+)\s*:/g;
    let boundaryMatch: RegExpExecArray | null;
    while ((boundaryMatch = boundaryRegex.exec(tableText)) !== null) {
      blocks.push({
        periodIdx: boundaryMatch.index,
        firstDay: parseInt(boundaryMatch[2], 10),
        competencyStart: 0,
        competency: "",
      });
    }

    // For each block, locate the competency text: from the last capitalized
    // competency verb before the boundary period back to the previous day
    // marker (or the table start).
    for (const blk of blocks) {
      let regionStart = 0;
      for (const dp of dayPositions) {
        if (dp.index < blk.periodIdx) regionStart = dp.index;
        else break;
      }
      const sub = tableText.substring(regionStart, blk.periodIdx + 1);
      const verbRegex = new RegExp(`\\b(${COMPETENCY_START_VERBS})\\b`, "g");
      let lastStart = -1;
      let verbMatch: RegExpExecArray | null;
      while ((verbMatch = verbRegex.exec(sub)) !== null) {
        if (/^[A-Z]/.test(verbMatch[1])) lastStart = verbMatch.index;
      }
      blk.competencyStart = lastStart >= 0 ? regionStart + lastStart : regionStart;
      blk.competency = tableText
        .substring(blk.competencyStart, blk.periodIdx + 1)
        .replace(/\s+/g, " ")
        .trim();
    }

    const findBlock = (dayNum: number) => {
      let blk: (typeof blocks)[number] | undefined;
      for (const b of blocks) if (b.firstDay <= dayNum) blk = b;
      return blk;
    };

    for (let i = 0; i < dayPositions.length; i++) {
      const pos = dayPositions[i];
      const nextPos = dayPositions[i + 1];

      const dayNum = parseInt(pos.dayNum.replace(/\D/g, ""), 10) || 0;
      const blk = findBlock(dayNum);
      const nextBlock = blocks.find((b) => b.firstDay > dayNum);

      // Objective: text after "Day N:" up to the next day marker or the start
      // of the next unit's competency (whichever comes first).
      const startIdx = pos.index + pos.dayNum.length + 5; // skip "Day N:"
      let endIdx = nextPos ? nextPos.index : tableText.length;
      if (nextBlock) endIdx = Math.min(endIdx, nextBlock.competencyStart);
      let objective = tableText.substring(startIdx, endIdx).trim();

      // Remove page header artifacts and signature footer (e.g., "Reviewed and checked by:")
      objective = objective
        .replace(/Republic\s+of\s+the\s+Philippines\s*Department\s+of\s+Education/gi, "")
        .replace(/Revi\s*ewed\s+and\s+checked\s+by:[\s\S]*$/gi, "")
        .trim();

      if (objective.length < 5) {
        continue;
      }

      const competency = blk ? blk.competency : "";

      // Context window before this day entry for term/week/content detection
      const contextStart = Math.max(0, pos.index - 5000);
      const context = tableText.substring(contextStart, pos.index);

      // Extract date from context
      const date = extractDateFromContext(context);

      // Detect week range from context — use the LAST match closest to the day entry
      const weekMatches = [...context.matchAll(/Week\s+(\d+(?:\s*[-–]\s*\d+)?)/gi)];
      if (weekMatches.length > 0) {
        const lastWeekMatch = weekMatches[weekMatches.length - 1];
        currentWeekRange = `Week ${lastWeekMatch[1].replace(/\s/g, "")}`;
      }

      // Detect content area from context — use the LAST match closest to the day entry
      for (const pattern of contentAreaPatterns) {
        const matches = [...context.matchAll(new RegExp(pattern.source, "gi"))];
        if (matches.length > 0) {
          const lastMatch = matches[matches.length - 1];
          currentContentArea = lastMatch[0].trim();
          break;
        }
      }

      // Detect date range from context
      const dateFromContext = extractDateFromContext(context);
      if (dateFromContext) {
        currentDateRange = dateFromContext;
      }

      // Compute specific date from date range
      const computedDate = currentDateRange ? computeSpecificDate(currentDateRange, pos.dayNum) : "";
      const finalDate = computedDate || date;

      const weekNum = parseInt(currentWeekRange.replace(/\D/g, ""), 10) || 0;

      // Days taught = number that precedes the day marker within this row (e.g., " 2 Day 1:")
      const beforeDay = context.substring(Math.max(0, context.length - 40));
      const daysTaughtMatch = beforeDay.match(/(\d{1,2})\s*$/);

      entries.push({
        term: term.name.replace("TERM", "Term").trim(),
        contentArea: currentContentArea,
        weekRange: currentWeekRange,
        weekNumber: weekNum ? String(weekNum) : "",
        competency,
        day: `Day ${pos.dayNum}`,
        dayNumber: dayNum ? String(dayNum) : "",
        objective,
        daysTaught: daysTaughtMatch ? daysTaughtMatch[1] : "",
        contentStandard,
        performanceStandard,
        suggestedActivity,
        date: finalDate,
        specificDate: finalDate,
      });
    }
  }

  return entries;
}

const LEARNING_AREAS = [
  "English",
  "Filipino",
  "Mathematics",
  "Science",
  "Araling Panlipunan",
  "Edukasyon sa Pagpapakatao",
  "Music",
  "Arts",
  "Physical Education",
  "Health",
  "Technology and Livelihood Education",
  "TLE",
  "MAPEH",
];

function extractGradeAndSubject(text: string): { gradeLevel: string; learningArea: string } {
  let gradeLevel = "";
  let learningArea = "";

  // Match patterns like "SCIENCE 9", "MATHEMATICS 10", "ENGLISH 7", etc.
  const subjectGradeMatch = text.match(
    /\b(English|Filipino|Mathematics|Math|Science|Araling Panlipunan|Edukasyon sa Pagpapakatao|Music|Arts|Physical Education|Health|Technology and Livelihood Education|TLE|MAPEH)\s+(\d{1,2})\b/i
  );
  if (subjectGradeMatch) {
    const rawSubject = subjectGradeMatch[1];
    gradeLevel = `Grade ${subjectGradeMatch[2]}`;

    // Normalize to match LEARNING_AREAS
    const normalized = rawSubject.toLowerCase();
    if (normalized === "math" || normalized === "mathematics") {
      learningArea = "Mathematics";
    } else if (normalized === "tle" || normalized === "technology and livelihood education") {
      learningArea = "Technology and Livelihood Education (TLE)";
    } else {
      // Find matching area (case-insensitive)
      const match = LEARNING_AREAS.find(
        (a) => a.toLowerCase() === normalized
      );
      learningArea = match || rawSubject;
    }
  } else {
    // Fallback: look for standalone grade number after known keywords
    const gradeMatch = text.match(/Grade\s+(\d{1,2})/i);
    if (gradeMatch) {
      gradeLevel = `Grade ${gradeMatch[1]}`;
    }

    // Fallback: look for standalone subject name
    const subjectMatch = text.match(
      new RegExp(
        `\\b(${LEARNING_AREAS.map((a) => a.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})\\b`,
        "i"
      )
    );
    if (subjectMatch) {
      const raw = subjectMatch[1];
      const match = LEARNING_AREAS.find(
        (a) => a.toLowerCase() === raw.toLowerCase()
      );
      learningArea = match || raw;
    }
  }

  return { gradeLevel, learningArea };
}

function extractContentAreas(text: string): string[] {
  const areas = new Set<string>();
  // Normalize text first
  const normalized = text.replace(/[ \t]+/g, " ");

  const patterns = [
    /Newton's\s+Laws[^,.]*/gi,
    /Electric\s+Current[^,.]*/gi,
    /Electromagnetic[^,.]*/gi,
    /Plate\s+Boundaries/gi,
    /Scale[^,.]*/gi,
    /Origin of the Solar System/gi,
    /Space Technologies/gi,
    /Biodiversity[^,.]*/gi,
    /Types of Ecosystems/gi,
    /DNA Replication/gi,
    /Valid and Reliable[^,.]*/gi,
    /Chemical Bonding[^,.]*/gi,
  ];

  for (const pattern of patterns) {
    const matches = normalized.matchAll(pattern);
    for (const match of matches) {
      const cleaned = match[0].trim().replace(/\s+/g, " ");
      if (cleaned.length > 3) {
        areas.add(cleaned);
      }
    }
  }

  return Array.from(areas);
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const isPDF = file.type === "application/pdf";
    const isDocx =
      file.type ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      file.name.toLowerCase().endsWith(".docx");

    if (!isPDF && !isDocx) {
      return NextResponse.json(
        { error: "Only PDF or Word (.docx) files are accepted" },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let text: string;

    if (isDocx) {
      text = extractTextFromDocx(buffer);
      if (!text.trim()) {
        return NextResponse.json(
          { error: "Could not extract text from the Word document" },
          { status: 422 }
        );
      }
    } else {
      // Parse PDF using pdf2json
      const pdfParser = new PDFParser();

      const pdfData = await new Promise<PDFData>((resolve, reject) => {
        pdfParser.on("pdfParser_dataReady", (data: PDFData) => resolve(data));
        pdfParser.on("pdfParser_dataError", (error: unknown) =>
          reject(error instanceof Error ? error : new Error(String(error)))
        );
        pdfParser.parseBuffer(buffer);
      });

      text = extractTextFromPDF(pdfData);
    }

    const entries = parseDBOWEntries(text);
    const contentAreas = extractContentAreas(text);
    const { gradeLevel, learningArea } = extractGradeAndSubject(text);

    // Extract unique terms
    const terms = [...new Set(entries.map((e) => e.term).filter(Boolean))];

    const dbowData: DBOWData = {
      rawText: text,
      entries,
      terms,
      contentAreas,
      gradeLevel,
      learningArea,
    };

    return NextResponse.json(dbowData);
  } catch (error) {
    console.error("DBOW parse error:", error);
    return NextResponse.json(
      { error: "Failed to parse the DBOW file" },
      { status: 500 }
    );
  }
}
