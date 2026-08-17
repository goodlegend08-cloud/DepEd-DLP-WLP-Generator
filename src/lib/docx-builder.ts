import {
  Document,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  ImageRun,
  WidthType,
  AlignmentType,
  BorderStyle,
  ShadingType,
  VerticalAlign,
  TabStopType,
  UnderlineType,
} from "docx";
import type { ITableCellBorders } from "docx";
import fs from "fs";
import path from "path";
import type { GeneratedDLPPlan, WeeklyLessonPlan, LessonPlanInput, DLPFlowPhases, DLPFormativeAssessment, DLPExtendedLearning } from "@/types/lesson-plan";

// ============================================================
// STYLES — solid black 1pt grid borders, light-gray banners
// ============================================================
const BORDER: ITableCellBorders = {
  top: { style: BorderStyle.SINGLE, size: 8, color: "000000" },
  bottom: { style: BorderStyle.SINGLE, size: 8, color: "000000" },
  left: { style: BorderStyle.SINGLE, size: 8, color: "000000" },
  right: { style: BorderStyle.SINGLE, size: 8, color: "000000" },
};

/** Light-gray section banner fill (#D9D9D9). */
const BANNER_FILL = "D9D9D9";

/** Official signature names used when the AI omits them. */
const DEFAULT_CHECKED = [
  { name: "TRIXIA A. PALMOS", title: "Master Teacher II - Science" },
  { name: "CARMELITA G. YAP", title: "SCIENCE Coordinator" },
  { name: "Jeanette J. Ruga, Ph.D.", title: "Assistant school Principal II / Officer – in – Charge" },
];
const DEFAULT_NOTED = [
  { name: "MILDRED T. TUBLE", title: "Public Schools District Supervisor – Cluster I" },
  { name: "GENOVIE G. TAGUM, Ph.D.", title: "Education Program Supervisor – SCIENCE" },
];

const SIGNATURE_RULE = "_____________________";

// ============================================================
// CELL HELPERS — TRUE 2-COLUMN LAYOUT (template-style)
// ============================================================

/** Split "Label:\ninstruction" into header + italic instruction. */
function splitLabel(label: string): { header: string; instruction: string } {
  const idx = label.indexOf("\n");
  if (idx === -1) return { header: label, instruction: "" };
  return { header: label.slice(0, idx), instruction: label.slice(idx + 1) };
}

/** Banner cell (left bold italic title / right italic guidance), light-gray fill. */
function bannerCell(text: string, italic: boolean): TableCell {
  return new TableCell({
    borders: BORDER,
    shading: { fill: BANNER_FILL, type: ShadingType.CLEAR, color: "auto" },
    verticalAlign: VerticalAlign.TOP,
    children: [
      new Paragraph({
        spacing: { before: 40, after: 40 },
        children: [new TextRun({ text, bold: !italic, italics: true, font: "Times New Roman", size: italic ? 20 : 24 })],
      }),
    ],
  });
}

/** Left column label cell: bold italic underlined header (12pt) + italic instruction (10pt). */
function labelCell(label: string): TableCell {
  const { header, instruction } = splitLabel(label);
  const runs: TextRun[] = [new TextRun({ text: header, bold: true, italics: true, underline: { type: UnderlineType.SINGLE }, font: "Times New Roman", size: 24 })];
  if (instruction) {
    runs.push(new TextRun({ text: "\n" + instruction, italics: true, font: "Times New Roman", size: 20, color: "333333" }));
  }
  return new TableCell({
    borders: BORDER,
    verticalAlign: VerticalAlign.TOP,
    width: { size: 25, type: WidthType.PERCENTAGE },
    children: [
      new Paragraph({
        spacing: { before: 40, after: 40 },
        children: runs,
      }),
    ],
  });
}

/** Metadata table label cell: 10pt regular (not bold), left column. */
function metaLabelCell(label: string): TableCell {
  return new TableCell({
    borders: BORDER,
    verticalAlign: VerticalAlign.TOP,
    width: { size: 25, type: WidthType.PERCENTAGE },
    children: [
      new Paragraph({
        spacing: { before: 40, after: 40 },
        children: [new TextRun({ text: label, font: "Times New Roman", size: 20 })],
      }),
    ],
  });
}

/**
 * Declaration of AI Use label cell with exact inline typography:
 * - "Declaration of AI Use": 12pt bold regular
 * - "(Cite how AI was used in the formulation of the lesson plan.)": 8pt normal italic
 * - "See DO 3 s.2026 Annex A": 8pt bold italic
 */
function aiDeclarationLabelCell(): TableCell {
  return new TableCell({
    borders: BORDER,
    verticalAlign: VerticalAlign.TOP,
    width: { size: 25, type: WidthType.PERCENTAGE },
    children: [
      new Paragraph({
        spacing: { before: 40, after: 20 },
        children: [new TextRun({ text: "Declaration of AI Use", bold: true, font: "Times New Roman", size: 24 })],
      }),
      new Paragraph({
        spacing: { before: 20, after: 20 },
        children: [new TextRun({ text: "(Cite how AI was used in the formulation of the lesson plan.)", italics: true, font: "Times New Roman", size: 16 })],
      }),
      new Paragraph({
        spacing: { before: 20, after: 40 },
        children: [new TextRun({ text: "See DO 3 s.2026 Annex A", bold: true, italics: true, font: "Times New Roman", size: 16 })],
      }),
    ],
  });
}

/**
 * Flow label cell with exact typography:
 * - "Flow:": 12pt bold italic underlined
 * - Guideline text: 10pt normal weight italic
 */
function flowLabelCell(): TableCell {
  const guideline = `Describe the activities that you can implement in 1 or more sessions to meet the learning objectives.

Apply the Learning Design Principles by thinking about how to:
• make the objectives clear for the learners
• guide learners before letting them try the task on their own
• check the state of the learners’ well-being, understanding, and mastery over the lesson
• connect today’s new concept with past competencies
• encourage collaboration among learners
• invite learners to reflect on why these matters to them
• ensure inclusion for learners’ varied abilities, learning styles, and contexts.`;

  return new TableCell({
    borders: BORDER,
    verticalAlign: VerticalAlign.TOP,
    width: { size: 25, type: WidthType.PERCENTAGE },
    children: [
      new Paragraph({
        spacing: { before: 40, after: 20 },
        children: [new TextRun({ text: "Flow:", bold: true, italics: true, underline: { type: UnderlineType.SINGLE }, font: "Times New Roman", size: 24 })],
      }),
      ...guideline.split("\n").map(
        (line) =>
          new Paragraph({
            spacing: { before: 10, after: 10 },
            children: [new TextRun({ text: line, italics: true, font: "Times New Roman", size: 20 })],
          })
      ),
    ],
  });
}

/** Right column content cell (75% width). */
function contentCell(text: string): TableCell {
  const safeText = text ?? "";
  const lines = safeText.split("\n");
  return new TableCell({
    borders: BORDER,
    verticalAlign: VerticalAlign.TOP,
    width: { size: 75, type: WidthType.PERCENTAGE },
    children: lines.map(
      (line) =>
        new Paragraph({
          spacing: { before: 20, after: 20 },
          children: [new TextRun({ text: line, font: "Times New Roman", size: 18 })],
        })
    ),
  });
}

/** Right column content cell (75% width), bold and centered. */
function centeredBoldContentCell(text: string): TableCell {
  const safeText = text ?? "";
  const lines = safeText.split("\n");
  return new TableCell({
    borders: BORDER,
    verticalAlign: VerticalAlign.TOP,
    width: { size: 75, type: WidthType.PERCENTAGE },
    children: lines.map(
      (line) =>
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 20, after: 20 },
          children: [new TextRun({ text: line, bold: true, font: "Times New Roman", size: 18 })],
        })
    ),
  });
}

/** Full-width content cell (colspan=2). */
function fullWidthContentCell(text: string): TableCell {
  const safeText = text ?? "";
  const lines = safeText.split("\n");
  return new TableCell({
    borders: BORDER,
    verticalAlign: VerticalAlign.TOP,
    columnSpan: 2,
    children: lines.map(
      (line) =>
        new Paragraph({
          spacing: { before: 20, after: 20 },
          children: [new TextRun({ text: line, font: "Times New Roman", size: 18 })],
        })
    ),
  });
}

// ============================================================
// ROW HELPERS
// ============================================================

/** Section banner row: bold title (left) + italic guidance (right). */
function sectionBannerRow(title: string, guidance?: string): TableRow {
  return new TableRow({
    children: [
      bannerCell(title, false),
      bannerCell(guidance || "", true),
    ],
  });
}

function kvRow(label: string, value: string): TableRow {
  return new TableRow({ children: [labelCell(label), contentCell(value)] });
}

/** Metadata table row: 10pt regular label (not bold) + content. */
function kvMetaRow(label: string, value: string): TableRow {
  return new TableRow({ children: [metaLabelCell(label), contentCell(value)] });
}

/** Declaration of AI Use row with its special label cell. */
function aiDeclarationRow(value: string): TableRow {
  return new TableRow({ children: [aiDeclarationLabelCell(), contentCell(value)] });
}

function kvRowCentered(label: string, value: string): TableRow {
  return new TableRow({ children: [labelCell(label), centeredBoldContentCell(value)] });
}

/** Flow row with its specialized label cell. */
function flowRow(value: string): TableRow {
  return new TableRow({ children: [flowLabelCell(), contentCell(value)] });
}

function fullRow(text: string): TableRow {
  return new TableRow({ children: [fullWidthContentCell(text)] });
}

// ============================================================
// RESOLVE NESTED FIELDS (backward compatibility)
// ============================================================
function resolveFlow(flow?: DLPFlowPhases, flat?: {
  engage?: string;
  explore_explain_modeling?: string;
  elaborate_guided_practice?: string;
  evaluate_independent_practice?: string;
  reflection_closure?: string;
}): DLPFlowPhases {
  if (flow) return flow;
  return {
    engage: flat?.engage || "",
    explore_explain_modeling: flat?.explore_explain_modeling || "",
    elaborate_guided_practice: flat?.elaborate_guided_practice || "",
    evaluate_independent_practice: flat?.evaluate_independent_practice || "",
    reflection_closure: flat?.reflection_closure || "",
  };
}

function resolveFormativeAssessment(fa?: DLPFormativeAssessment, flat?: {
  formative_assessment_frustration?: string;
  formative_assessment_instructional?: string;
  formative_assessment_independent?: string;
}): DLPFormativeAssessment {
  if (fa) return fa;
  return {
    frustration: flat?.formative_assessment_frustration || "",
    instructional: flat?.formative_assessment_instructional || "",
    independent: flat?.formative_assessment_independent || "",
  };
}

function resolveExtendedLearning(el?: DLPExtendedLearning, flat?: {
  extended_learning_advanced?: string;
  extended_learning_struggling?: string;
}): DLPExtendedLearning {
  if (el) return el;
  return {
    advanced: flat?.extended_learning_advanced || "",
    struggling: flat?.extended_learning_struggling || "",
  };
}

// ============================================================
// SIGNATURE BLOCK (clean, unbordered paragraph text — no table)
// ============================================================

/** Solid signature rule line. */
function signatureRuleParagraph(): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 40, after: 40 },
    children: [new TextRun({ text: SIGNATURE_RULE, font: "Times New Roman", size: 18 })],
  });
}

/** Centered name line (bold, 12pt, uppercase). */
function signatureNameParagraph(name: string): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 240, after: 0 },
    children: [new TextRun({ text: name.toUpperCase(), bold: true, font: "Times New Roman", size: 24 })],
  });
}

/** Centered title line (italic, 11pt). */
function signatureTitleParagraph(title: string): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 0, after: 80 },
    children: [new TextRun({ text: title, italics: true, font: "Times New Roman", size: 22 })],
  });
}

/** Left-aligned signature section label ("Prepared:", "Checked & Reviewed:", "Noted:"). */
function signatureLabelParagraph(label: string, before = 200, after = 60): Paragraph {
  return new Paragraph({
    spacing: { before, after },
    children: [new TextRun({ text: label, bold: true, font: "Times New Roman", size: 18 })],
  });
}

/**
 * Render signature names/titles as horizontal columns using center-aligned tab
 * stops — no table, no gridlines. Produces N columns spread evenly across the
 * text width (usable width = 12240 - 2*1080 twips margins = 10080 twips).
 */
function signatureColumns(
  signatories: { name: string; title: string }[],
  columns: number
): Paragraph[] {
  const usable = 12240 - 1080 - 1080; // 8.5 x 13 in width minus left/right margins
  const tabStops = Array.from({ length: columns }, (_, i) => ({
    type: TabStopType.CENTER,
    position: Math.round(((i + 0.5) * usable) / columns),
  }));

  const names = signatories.slice(0, columns).map((s) => s.name.toUpperCase());
  const titles = signatories.slice(0, columns).map((s) => s.title);

  const buildRow = (cells: string[], bold: boolean, italics: boolean, size: number): Paragraph =>
    new Paragraph({
      tabStops,
      spacing: { before: 20, after: 20 },
      children: [
        ...cells.flatMap((cell) => [
          new TextRun({ text: "\t", font: "Times New Roman", size }),
          new TextRun({ text: cell, bold, italics, font: "Times New Roman", size }),
        ]),
      ],
    });

  return [
    buildRow(names, true, false, 24),
    new Paragraph({
      tabStops,
      spacing: { before: 20, after: 20 },
      children: Array.from({ length: columns }).flatMap(() => [
        new TextRun({ text: "\t", font: "Times New Roman", size: 18 }),
        new TextRun({ text: SIGNATURE_RULE, font: "Times New Roman", size: 18 }),
      ]),
    }),
    buildRow(titles, false, true, 22),
  ];
}

/** Full signature block: "Prepared:" + "Checked & Reviewed:" + "Noted:". */
function signatureBlock(
  prepared: { name: string; title: string },
  checked: { name: string; title: string }[],
  noted: { name: string; title: string }[]
): Paragraph[] {
  return [
    signatureLabelParagraph("Prepared:"),
    signatureNameParagraph(prepared.name),
    signatureRuleParagraph(),
    signatureTitleParagraph(prepared.title),
    signatureLabelParagraph("Checked & Reviewed:", 360, 240),
    ...signatureColumns(checked, 3),
    signatureLabelParagraph("Noted:", 360, 240),
    ...signatureColumns(noted, 2),
  ];
}

// ============================================================
// BUILD DOCUMENT (ILAW FORMAT — template-style 2-column)
// ============================================================
export async function buildDocx(
  plan: GeneratedDLPPlan,
  input: LessonPlanInput
): Promise<Buffer> {
  const { lesson_plan_meta, intentions, learning_experience, assessment, ways_forward, signatories } = plan;
  const lessonTitle = lesson_plan_meta.lesson_title || input.subjectDescription || "Lesson Plan";
  const flow = resolveFlow(learning_experience.flow, learning_experience);
  const formative = resolveFormativeAssessment(assessment.formative_assessment, assessment);
  const extended = resolveExtendedLearning(ways_forward.extended_learning, ways_forward);

  const preparedName =
    signatories?.prepared_by?.name || lesson_plan_meta.teacher_name || "JOSE ROMMEL L. GARCIA";
  const preparedTitle = signatories?.prepared_by?.title || "Teacher III";
  const checked = signatories?.checked_by?.length ? signatories.checked_by : DEFAULT_CHECKED;
  const noted = signatories?.noted_by?.length ? signatories.noted_by : DEFAULT_NOTED;

  const doc = new Document({
    creator: "DepEd DLP Generator",
    title: `DLP - ${lessonTitle}`,
    sections: [
      {
        properties: {
          page: {
            size: { width: 12240, height: 18720 }, // 8.5 x 13 in (Legal/Folio)
            margin: { top: 1080, right: 1080, bottom: 1080, left: 1080 },
          },
        },
        children: [
          // ========== SECTION 1: OFFICIAL LETTERHEAD ==========
          headerImageParagraph(),

          // ========== DOCUMENT TITLE ==========
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 120, after: 60 },
            children: [
              new TextRun({ text: `LESSON PLAN IN ${lesson_plan_meta.learning_area} GRADE ${lesson_plan_meta.grade_level}`, bold: true, font: "Times New Roman", size: 24 }),
            ],
          }),

          spacer(),

          // ========== SECTION 2: METADATA TABLE ==========
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              kvMetaRow("Name of Lesson", lessonTitle),
              kvMetaRow("Date, Week, Day", `${lesson_plan_meta.calendar_date} | Week: ${lesson_plan_meta.week_number} | Day: ${lesson_plan_meta.day_number}`),
              kvMetaRow("Designed by teacher/s", lesson_plan_meta.teacher_name),
              kvMetaRow("Designed for which Grade Level and Section", lesson_plan_meta.grade_and_section),
              kvMetaRow("No. of Sessions", lesson_plan_meta.sessions),
              kvMetaRow("References (books, websites, toolkits, etc.)", lesson_plan_meta.references),
              aiDeclarationRow(lesson_plan_meta.ai_declaration),
            ],
          }),

          spacer(),

          // ========== SECTION 3: ILAW FRAMEWORK ==========

          // --- 3.1 INTENTIONS ---
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              sectionBannerRow("Intentions.", intentions.framework_guidance_note || "Meaningful learning experiences are anchored on how we frame them. Start by deciding what you want your learners to master by the end of the lesson – keep it clear and simple. Remember: Understanding your learner's evolving context and designing around it helps ensure that your lessons connect with and are relevant to them."),
              kvRowCentered("Learning Competency:\nWrite the competency/ies from the curriculum guide that we are targeting, and the content or performance standards applicable to the sessions", intentions.learning_competency),
              kvRowCentered("Learning Objectives:\nWrite the smaller knowledge, skills or tasks from the competency that the learners will work on and be able to show by the end of the sessions", intentions.learning_objectives),
              kvRow("Learners' Context:\nWrite your observations of your learners, and how they have been performing or responding to learning experiences recently, including strengths, interests, and possible barriers to learning", intentions.learners_context),
            ],
          }),

          spacer(),

          // --- 3.2 LEARNING EXPERIENCE ---
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              sectionBannerRow("Learning Experience.", learning_experience.framework_guidance_note || "Each activity and interaction builds towards meaningful understanding and growth. Identify activities and interactions to help learners gain knowledge, skills, or understanding in a purposeful way."),
              kvRow("Pre Lesson:\nDescribe how you will help learners get ready for the lesson.", learning_experience.pre_lesson),
              flowRow([
                `• ENGAGE (5 mins) — Hook & Well-being:\n${flow.engage}`,
                "",
                `• Explore & Explain / Modeling (I Do — 15 mins):\n${flow.explore_explain_modeling}`,
                "",
                `• Elaborate / Guided & Collaborative Practice (We Do — 10 mins):\n${flow.elaborate_guided_practice}`,
                "",
                `• Evaluate / Independent Practice (You Do — 10 mins):\n${flow.evaluate_independent_practice}`,
                "",
                `• Reflection & Closure (5 mins):\n${flow.reflection_closure}`,
              ].join("\n")),
              kvRow("Learning Resources:\nList down the learning resources that will help you reach your objectives. Ensure that they are available and inclusive. Including options and alternatives in case of emergencies", learning_experience.learning_resources),
              kvRow("Opportunities for Integration:\nWrite down any possibilities to meaningfully integrate another learning area, special topic, or technology. Write NA if none.", learning_experience.opportunities_for_integration),
            ],
          }),

          spacer(),

          // --- 3.3 ASSESSMENT ---
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              sectionBannerRow("Assessment.", assessment.framework_guidance_note || "Assessments reveal what learners have gained and what they still need help with. These are helpful in providing you with information to guide your future instruction throughout the entire session."),
              kvRow("Formative Assessment:\nCreate a task, activity or questions to evaluate learning and provide feedback. Provide ways for learners to ask for guidance and support.\nRemember to provide appropriate accommodation so all learners can demonstrate their understanding (e.g. varied response formats, small group options, visual or auditory supports)", [
                "Targeted Assessment Tasks:",
                "",
                `1. Frustration Level (25%): ${formative.frustration}`,
                "",
                `2. Instructional Level (50%): ${formative.instructional}`,
                "",
                `3. Independent Level / HOTS (25%): ${formative.independent}`,
              ].join("\n")),
            ],
          }),

          spacer(),

          // --- 3.4 WAYS FORWARD ---
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              sectionBannerRow("Ways Forward.", ways_forward.framework_guidance_note || "Meaningful learning can also happen beyond the classroom – for both the learners and the teacher. Pause and reflect on what happened today."),
              kvRow("Extended learning opportunities:\nSuggest other learning experiences outside the classroom hours that learners may want to access or reinforce what they have learned, to spark their curiosity further, or that may provide them support in areas of difficulty.", [
                `Advanced Readers (Independent Level — 25%): ${extended.advanced}`,
                "",
                `Struggling Readers (Frustration Level — 25%): ${extended.struggling}`,
              ].join("\n")),
              kvRow("Reflections:\nThink about what you need to change for the next session based on what happened today. Is there something the learners are interested in exploring? Are there some things you would like to share with your co-teachers, parents or school leaders about your classroom experience? What would you like your instructional coach to help you with?", ways_forward.reflections),
            ],
          }),

          spacer(),

          // ========== SECTION 4: SIGNATORIES ==========
          ...signatureBlock(
            { name: preparedName, title: preparedTitle },
            checked,
            noted
          ),

          // Footer
          spacer(),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: "— End of Daily Lesson Plan —", italics: true, font: "Times New Roman", size: 16, color: "808080" }),
            ],
          }),
        ],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  return buffer;
}

// ============================================================
// UTILITY HELPERS
// ============================================================
function centeredLine(text: string, size: number, bold: boolean): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 0 },
    children: [new TextRun({ text, bold, font: "Times New Roman", size })],
  });
}

/**
 * Official LPCAA DepEd header image as a centered ImageRun spanning the full
 * document content width (~600px). Falls back to the text letterhead when the
 * image asset cannot be read at runtime.
 */
function headerImageParagraph(): Paragraph {
  const candidates = [
    path.join(process.cwd(), "src", "templates", "lpcaa-header.png"),
    path.join(process.cwd(), "public", "assets", "lpcaa header.png"),
  ];
  const file = candidates.find((p) => {
    try {
      return fs.statSync(p).isFile();
    } catch {
      return false;
    }
  });

  if (file) {
    const data = fs.readFileSync(file);
    return new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
      children: [
        new ImageRun({
          type: "png",
          data,
          transformation: { width: 600, height: 124 },
        }),
      ],
    });
  }

  // Fallback: render the standard DepEd letterhead text.
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [
      new TextRun({ text: "Republic of the Philippines\nDepartment of Education", bold: true, font: "Old English Text MT", size: 32 }),
    ],
  });
}

function spacer(): Paragraph {
  return new Paragraph({ spacing: { before: 120 }, children: [] });
}

// ============================================================
// BUILD WEEKLY LESSON PLAN
// ============================================================
export async function buildWLPDocx(
  plan: WeeklyLessonPlan,
  input: LessonPlanInput
): Promise<Buffer> {
  const lessonTitle = input.subjectDescription || "Weekly Lesson Plan";

  const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday"] as const;
  const DAY_LABELS: Record<string, string> = {
    monday: "MONDAY",
    tuesday: "TUESDAY",
    wednesday: "WEDNESDAY",
    thursday: "THURSDAY",
    friday: "FRIDAY",
  };

  /** Flatten a structured activities object into a readable string. */
  const flattenActivities = (value: unknown): string => {
    if (value == null) return "";
    if (typeof value === "string") return value.trim();
    if (Array.isArray(value)) return value.map((v) => flattenActivities(v)).filter(Boolean).join("\n");
    if (typeof value === "object") {
      const lines: string[] = [];
      const collect = (obj: Record<string, unknown>, depth: number) => {
        for (const [key, val] of Object.entries(obj)) {
          if (val == null) continue;
          if (typeof val === "string") lines.push(`• ${key}: ${val.trim()}`);
          else if (typeof val === "object") { if (depth < 2) collect(val as Record<string, unknown>, depth + 1); }
          else lines.push(`• ${key}: ${String(val)}`);
        }
      };
      collect(value as Record<string, unknown>, 0);
      return lines.join("\n");
    }
    return String(value ?? "");
  };

  /** Normalize a day entry into a string-activities DayPlan. */
  const normalizeDay = (day: string, rawDay: unknown): { day: string; date: string; activities: string } => {
    if (!rawDay || typeof rawDay !== "object") return { day, date: "", activities: "" };
    const obj = rawDay as Record<string, unknown>;
    const activitiesValue = typeof obj.activities === "string" || obj.activities == null ? obj.activities : obj.activities ?? obj;
    return {
      day: typeof obj.day === "string" ? obj.day : day,
      date: typeof obj.date === "string" ? obj.date : "",
      activities: flattenActivities(activitiesValue),
    };
  };

  const doc = new Document({
    creator: "DepEd WLP Generator",
    title: `WLP - ${lessonTitle}`,
    sections: [
      {
        properties: {
          page: {
            size: { width: 12240, height: 18720 }, // 8.5 x 13 in (Legal/Folio)
            margin: { top: 1080, right: 1080, bottom: 1080, left: 1080 },
          },
        },
        children: [
          // ========== HEADER ==========
          headerImageParagraph(),
          // ========== TITLE ==========
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 120, after: 60 },
            children: [
              new TextRun({ text: "WEEKLY LESSON PLAN (WLP)", bold: true, font: "Times New Roman", size: 28 }),
            ],
          }),
          centeredLine(input.learningArea.toUpperCase(), 24, true),

          // ========== METADATA TABLE ==========
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              kvMetaRow("Name of Lesson", lessonTitle),
              kvMetaRow("Week", `${input.quarter} | ${input.week}`),
              kvMetaRow("Designed by Teacher/s", input.teacherName || "[Teacher Name]"),
              kvMetaRow("Grade Level & Section", `Grade ${input.gradeLevel}`),
              kvMetaRow("No. of Sessions", "5 Sessions (50 minutes each)"),
              kvMetaRow("References (books, websites, toolkits, etc.)", "MATATAG K-10 Curriculum Guide; DepEd Science Learning Materials; DepEd MATATAG Curriculum Resources; Division DBOW."),
            ],
          }),

          spacer(),

          // ========== WEEKLY OBJECTIVES ==========
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              sectionBannerRow("Weekly Objectives & Competencies.", "Weekly competencies, objectives, and the content overview for the week."),
              kvRow("Weekly Competencies:", flattenActivities(plan.weeklyCompetencies)),
              kvRow("Weekly Objectives:", flattenActivities(plan.weeklyObjectives)),
              kvRow("Weekly Content Overview:", flattenActivities(plan.weeklyContent)),
            ],
          }),

          spacer(),

          // ========== DAILY PLANS ==========
          ...DAYS.flatMap((day) => {
            const dayPlan = normalizeDay(day, plan[day]);
            return [
              new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                rows: [
                  sectionBannerRow(`${DAY_LABELS[day]} — ${dayPlan.date}`, ""),
                  fullRow(dayPlan.activities),
                ],
              }),
              spacer(),
            ];
          }),

          // ========== LEARNING RESOURCES ==========
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              sectionBannerRow("Learning Resources.", "Resources used to reach the weekly objectives."),
              fullRow(flattenActivities(plan.learningResources)),
            ],
          }),

          spacer(),

          // ========== REMARKS ==========
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              sectionBannerRow("Remarks & Integration.", "Integration notes and remarks for the week."),
              fullRow(flattenActivities(plan.remarks)),
            ],
          }),

          spacer(),

          // ========== REFLECTION ==========
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              sectionBannerRow("Teacher Reflection.", "Reflect on the week to guide the next sessions."),
              fullRow(flattenActivities(plan.reflection)),
            ],
          }),

          spacer(),

          // ========== SIGNATORIES ==========
          ...signatureBlock(
            { name: input.teacherName || "JOSE ROMMEL L. GARCIA", title: "Teacher III" },
            DEFAULT_CHECKED,
            DEFAULT_NOTED
          ),

          // Footer
          spacer(),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: "— End of Weekly Lesson Plan —", italics: true, font: "Times New Roman", size: 16, color: "808080" }),
            ],
          }),
        ],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  return buffer;
}