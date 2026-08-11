import { NextResponse } from "next/server";
import PDFParser from "pdf2json";

export interface DBOWEntry {
  term: string;
  contentArea: string;
  weekRange: string;
  competency: string;
  day: string;
  objective: string;
  daysTaught: string;
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

function extractTextFromPDF(pdfData: any): string {
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

    const months = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December",
    ];
    return `${months[specificDate.getMonth()]} ${specificDate.getDate()}, ${specificDate.getFullYear()}`;
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

    const months = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December",
    ];
    return `${months[specificDate.getMonth()]} ${specificDate.getDate()}, ${specificDate.getFullYear()}`;
  }

  return "";
}

function computeWeekNumber(date: Date, semesterStart: Date): number {
  // Compute week number based on school weeks (Mon-Fri)
  // Each school week = 5 days (Mon-Fri)
  const diffTime = date.getTime() - semesterStart.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  // Find the Monday of the date's week
  const dayOfWeek = date.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const mondayOfDate = new Date(date);
  mondayOfDate.setDate(date.getDate() + mondayOffset);
  // Find the Monday of semester start's week
  const startDayOfWeek = semesterStart.getDay();
  const startMondayOffset = startDayOfWeek === 0 ? -6 : 1 - startDayOfWeek;
  const mondayOfStart = new Date(semesterStart);
  mondayOfStart.setDate(semesterStart.getDate() + startMondayOffset);
  // Compute week number
  const weekDiff = Math.floor((mondayOfDate.getTime() - mondayOfStart.getTime()) / (7 * 24 * 60 * 60 * 1000));
  return weekDiff + 1;
}

function formatDate(date: Date): string {
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

function parseDBOWEntries(text: string): DBOWEntry[] {
  const entries: DBOWEntry[] = [];

  // Normalize text: collapse multiple spaces, trim
  const normalized = text.replace(/[ \t]+/g, " ").trim();

  // Track current context
  let currentContentArea = "";
  let currentWeekRange = "";
  let currentDateRange = "";

  // Detect term positions in the text
  const termMatches = [
    ...normalized.matchAll(/FIRST\s+TERM/gi),
    ...normalized.matchAll(/SECOND\s+TERM/gi),
    ...normalized.matchAll(/THIRD\s+TERM/gi),
  ].sort((a, b) => (a.index ?? 0) - (b.index ?? 0));

  const termPositions: { index: number; term: string }[] = termMatches.map((m) => ({
    index: m.index ?? 0,
    term: m[0].toLowerCase().includes("first")
      ? "First Term"
      : m[0].toLowerCase().includes("second")
        ? "Second Term"
        : "Third Term",
  }));

  // Content area patterns to detect topic headers
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
  ];

  // Split on Day entries - use a simpler approach
  // Find all "Day N:" positions and extract text between them
  const dayPositions: { index: number; dayNum: string }[] = [];
  const dayHeaderRegex = /Day\s+(\d+(?:\s*[-–]\s*\d+)?)\s*:/gi;
  let match;
  while ((match = dayHeaderRegex.exec(normalized)) !== null) {
    dayPositions.push({ index: match.index, dayNum: match[1].replace(/\s/g, "") });
  }

  for (let i = 0; i < dayPositions.length; i++) {
    const pos = dayPositions[i];
    const nextPos = dayPositions[i + 1];

    // Get text from after "Day N:" to before next "Day M:" or end
    const startIdx = pos.index + pos.dayNum.length + 5; // skip "Day N:"
    const endIdx = nextPos ? nextPos.index : normalized.length;
    let chunk = normalized.substring(startIdx, endIdx).trim();

    // Remove page header artifacts
    chunk = chunk.replace(/Republic\s+of\s+the\s+Philippines\s*Department\s+of\s+Education/gi, "").trim();

    // The objective is the first sentence(s) up to the next competency or week marker
    // Stop at competency-like text, week headers, content area headers, or day count numbers
    // Competency text usually starts with verbs like "Identify", "Describe", etc. and is longer
    // Day objectives are typically shorter sentences

    // Split on patterns that indicate the end of the objective:
    // - A number followed by "Day" (next entry)
    // - Week markers
    // - Content area headers
    // - Competency-level text (longer sentences with teaching verbs before next day)

    // Simple approach: take text up to the first period followed by a space and uppercase letter,
    // or up to known markers
    let objective = chunk;

    // Try to cut at a natural sentence boundary before competency/week/content markers
    const cutPatterns = [
      /\.\s+(?:Identify|Describe|Explain|Compare|Demonstrate|Investigate|Observe|Differentiate|Draw|Participate|Gather|Analyze|Construct|Predict|Arrange|Distinguish|Recognize|Determine|Summarize|Trace|Cite|Collaborate|Read|Use|Apply|Interpret|Classify|Solve|Compute|Develop|Create|Design|Evaluate|Present|Connect|Relate|Translate|Convert|Perform|Measure|Record|Tabulate|Graph|Infer|Formulate|Propose|Illustrate|Model|Simulate)\b/i,
      /\.\s+Week\s/i,
      /\.\s+(?:Newton|Electric|Plate|DNA|Biodiversity|Types|Chemical|Valid|Origin|Space|Electromagnetic)/i,
      /\s+\d+\s+Day\s/i, // "2 Day 3:" pattern
    ];

    // Find the earliest cut point
    let earliestCut = objective.length;
    for (const pattern of cutPatterns) {
      const m = objective.match(pattern);
      if (m && m.index !== undefined && m.index < earliestCut) {
        // Include the period in the objective
        earliestCut = m.index + 1;
      }
    }

    objective = objective.substring(0, earliestCut).trim();

    // If the objective is very short, it might be just a number or empty
    if (objective.length < 5) {
      continue;
    }

    // Get context before this day entry for term/week/content detection
    // Use a larger context window to capture date ranges that may appear earlier
    const contextStart = Math.max(0, pos.index - 5000);
    const context = normalized.substring(contextStart, pos.index);

    // Extract date from context
    const date = extractDateFromContext(context);

    // Detect term
    let term = "";
    for (let j = termPositions.length - 1; j >= 0; j--) {
      if (pos.index > termPositions[j].index) {
        term = termPositions[j].term;
        break;
      }
    }

    // Detect content area from context — use the LAST match closest to the day entry
    let contentAreaFound = false;
    for (const pattern of contentAreaPatterns) {
      const matches = [...context.matchAll(new RegExp(pattern.source, "gi"))];
      if (matches.length > 0) {
        const lastMatch = matches[matches.length - 1];
        currentContentArea = lastMatch[0].trim();
        contentAreaFound = true;
        break;
      }
    }

    // Detect week range from context — use the LAST match closest to the day entry
    const weekMatches = [...context.matchAll(/Week\s+(\d+(?:\s*[-–]\s*\d+)?)/gi)];
    if (weekMatches.length > 0) {
      const lastWeekMatch = weekMatches[weekMatches.length - 1];
      currentWeekRange = `Week ${lastWeekMatch[1].replace(/\s/g, "")}`;
    }

    // Detect date range from context (e.g., "July 23-27, 2026" or "July 24, 2026")
    const dateFromContext = extractDateFromContext(context);
    if (dateFromContext) {
      currentDateRange = dateFromContext;
    }

    // Compute specific date from date range
    const computedDate = currentDateRange ? computeSpecificDate(currentDateRange, pos.dayNum) : "";
    // Fall back to the extracted date if computation fails
    const finalDate = computedDate || date;

    entries.push({
      term,
      contentArea: currentContentArea,
      weekRange: currentWeekRange,
      competency: "",
      day: `Day ${pos.dayNum}`,
      objective,
      daysTaught: "",
      date: finalDate,
      specificDate: finalDate,
    });
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

    if (file.type !== "application/pdf") {
      return NextResponse.json(
        { error: "Only PDF files are accepted" },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Parse PDF using pdf2json
    const pdfParser = new PDFParser();

    const pdfData = await new Promise<any>((resolve, reject) => {
      pdfParser.on("pdfParser_dataReady", resolve);
      pdfParser.on("pdfParser_dataError", (error: any) => reject(error));
      pdfParser.parseBuffer(buffer);
    });

    const text = extractTextFromPDF(pdfData);
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
      { error: "Failed to parse PDF" },
      { status: 500 }
    );
  }
}
