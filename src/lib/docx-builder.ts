import {
  Document,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
  AlignmentType,
  BorderStyle,
  ShadingType,
  VerticalAlign,
} from "docx";
import type { GeneratedDLPPlan, WeeklyLessonPlan, LessonPlanInput, DLPFlowPhases, DLPFormativeAssessment, DLPExtendedLearning } from "@/types/lesson-plan";

// ============================================================
// STYLES
// ============================================================
const BORDER: ITableCellBorders = {
  top: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
  bottom: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
  left: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
  right: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
};

import type { ITableCellBorders } from "docx";

// ============================================================
// CELL HELPERS — TRUE 2-COLUMN LAYOUT
// ============================================================

/** Full-width section header (colspan=2), blue background */
function sectionHeaderCell(text: string): TableCell {
  return new TableCell({
    borders: BORDER,
    shading: { fill: "1F4E79", type: ShadingType.CLEAR, color: "auto" },
    verticalAlign: VerticalAlign.CENTER,
    columnSpan: 2,
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 60, after: 60 },
        children: [
          new TextRun({ text, bold: true, font: "Arial", size: 20, color: "FFFFFF" }),
        ],
      }),
    ],
  });
}

/** Full-width guidance note (colspan=2), italic */
function guidanceCell(text: string): TableCell {
  return new TableCell({
    borders: BORDER,
    shading: { fill: "F2F7FC", type: ShadingType.CLEAR, color: "auto" },
    verticalAlign: VerticalAlign.TOP,
    columnSpan: 2,
    children: [
      new Paragraph({
        spacing: { before: 40, after: 40 },
        children: [
          new TextRun({ text, italics: true, font: "Arial", size: 16, color: "444444" }),
        ],
      }),
    ],
  });
}

/** Left column label cell (25% width), light blue background */
function labelCell(text: string): TableCell {
  return new TableCell({
    borders: BORDER,
    shading: { fill: "D6E4F0", type: ShadingType.CLEAR, color: "auto" },
    verticalAlign: VerticalAlign.TOP,
    width: { size: 25, type: WidthType.PERCENTAGE },
    children: [
      new Paragraph({
        spacing: { before: 40, after: 40 },
        children: [new TextRun({ text, bold: true, font: "Arial", size: 18 })],
      }),
    ],
  });
}

/** Right column content cell (75% width) */
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
          children: [new TextRun({ text: line, font: "Arial", size: 18 })],
        })
    ),
  });
}

/** Full-width content cell (colspan=2) */
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
          children: [new TextRun({ text: line, font: "Arial", size: 18 })],
        })
    ),
  });
}

// ============================================================
// ROW HELPERS
// ============================================================

function sectionRow(label: string): TableRow {
  return new TableRow({ children: [sectionHeaderCell(label)] });
}

function guidanceRow(text: string): TableRow {
  return new TableRow({ children: [guidanceCell(text)] });
}

function kvRow(label: string, value: string): TableRow {
  return new TableRow({ children: [labelCell(label), contentCell(value)] });
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
// BUILD DOCUMENT (ILAW FORMAT — TRUE 2-COLUMN)
// ============================================================
export async function buildDocx(
  plan: GeneratedDLPPlan,
  input: LessonPlanInput
): Promise<Buffer> {
  const { header, lesson_plan_meta, intentions, learning_experience, assessment, ways_forward, signatories } = plan;
  const lessonTitle = lesson_plan_meta.lesson_title || input.subjectDescription || "Lesson Plan";
  const flow = resolveFlow(learning_experience.flow, learning_experience);
  const formative = resolveFormativeAssessment(assessment.formative_assessment, assessment);
  const extended = resolveExtendedLearning(ways_forward.extended_learning, ways_forward);

  const doc = new Document({
    creator: "DepEd DLP Generator",
    title: `DLP - ${lessonTitle}`,
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1080, right: 1080, bottom: 1080, left: 1080 },
          },
        },
        children: [
          // ========== SECTION 1: OFFICIAL HEADER (LETTERHEAD) ==========
          centeredLine(header.republic, 18, false),
          centeredLine(header.department, 20, true),
          centeredLine(header.region, 18, false),
          centeredLine(header.division, 18, false),
          centeredLine(header.school, 18, true),
          centeredLine(header.address, 14, false),

          spacer(),

          // ========== DOCUMENT TITLE ==========
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 120, after: 60 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "1F4E79" } },
            children: [
              new TextRun({ text: `LESSON PLAN IN ${lesson_plan_meta.learning_area} GRADE ${lesson_plan_meta.grade_level}`, bold: true, font: "Arial", size: 24, color: "1F4E79" }),
            ],
          }),

          spacer(),

          // ========== SECTION 2: METADATA TABLE (2-COLUMN) ==========
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              kvRow("Name of Lesson", lessonTitle),
              kvRow("Date, Week, Day", `${lesson_plan_meta.calendar_date}, ${lesson_plan_meta.week_number}, ${lesson_plan_meta.day_number}`),
              kvRow("Designed by teacher/s", lesson_plan_meta.teacher_name),
              kvRow("Designed for which Grade Level and Section", lesson_plan_meta.grade_and_section),
              kvRow("No. of Sessions", lesson_plan_meta.sessions),
              kvRow("References", lesson_plan_meta.references),
              kvRow("Declaration of AI Use\n(Cite how AI was used in the formulation of the lesson plan.) See DO 3 s.2026 Annex A", lesson_plan_meta.ai_declaration),
            ],
          }),

          spacer(),

          // ========== SECTION 3: ILAW FRAMEWORK ==========

          // --- 3.1 INTENTIONS ---
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              sectionRow("INTENTIONS"),
              guidanceRow(intentions.framework_guidance_note),
              kvRow("Learning Competency:\nWrite the competency/ies from the curriculum guide that we are targeting, and the content or performance standards applicable to the sessions", intentions.learning_competency),
              kvRow("Learning Objectives:\nWrite the smaller knowledge, skills or tasks from the competency that the learners will work on and be able to show by the end of the sessions", intentions.learning_objectives),
              kvRow("Learners' Context:\nWrite your observations of your learners, and how they have been performing or responding to learning experiences recently, including strengths, interests, and possible barriers to learning", intentions.learners_context),
            ],
          }),

          spacer(),

          // --- 3.2 LEARNING EXPERIENCE ---
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              sectionRow("LEARNING EXPERIENCE"),
              guidanceRow(learning_experience.framework_guidance_note),
              kvRow("Pre Lesson:\nDescribe how you will help learners get ready for the lesson.", learning_experience.pre_lesson),
              kvRow("Flow:\nDescribe the activities that you can implement in 1 or more sessions to meet the learning objectives.", [
                `• ENGAGE: 00:00-00:05 (5 mins)\n${flow.engage}`,
                "",
                `• 00:05-00:20 (15 mins) - Explore & Explain / Modeling (I Do):\n${flow.explore_explain_modeling}`,
                "",
                `• 00:20-00:30 (10 mins) - Elaborate / Guided & Collaborative Practice (We Do):\n${flow.elaborate_guided_practice}`,
                "",
                `• 00:30-00:40 (10 mins) - Evaluate / Independent Practice (You Do):\n${flow.evaluate_independent_practice}`,
                "",
                `• 00:40-00:45 (5 mins) - Reflection & Closure:\n${flow.reflection_closure}`,
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
              sectionRow("ASSESSMENT"),
              guidanceRow(assessment.framework_guidance_note),
              kvRow("Formative Assessment:\nCreate a task, activity or questions to evaluate learning and provide feedback. Provide ways for learners to ask for guidance and support.\nRemember to provide appropriate accommodation so all learners can demonstrate their understanding (e.g. varied response formats, small group options, visual or auditory supports)", [
                "Targeted Assessment Tasks:",
                "",
                `1. Frustration Level: ${formative.frustration}`,
                "",
                `2. Instructional Level: ${formative.instructional}`,
                "",
                `3. Independent Level (HOTS): ${formative.independent}`,
              ].join("\n")),
            ],
          }),

          spacer(),

          // --- 3.4 WAYS FORWARD ---
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              sectionRow("WAYS FORWARD"),
              guidanceRow(ways_forward.framework_guidance_note),
              kvRow("Extended learning opportunities:\nSuggest other learning experiences outside the classroom hours that learners may want to access or reinforce what they have learned, to spark their curiosity further, or that may provide them support in areas of difficulty.", [
                `Advanced Readers: ${extended.advanced}`,
                "",
                `Struggling Readers: ${extended.struggling}`,
              ].join("\n")),
              kvRow("Reflections:\nThink about what you need to change for the next session based on what happened today. Is there something the learners are interested in exploring? Are there some things you would like to share with your co-teachers, parents or school leaders about your classroom experience? What would you like your instructional coach to help you with?", ways_forward.reflections),
            ],
          }),

          spacer(),

          // ========== SECTION 4: SIGNATORIES ==========
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              sectionRow("SIGNATORIES"),
              kvRow("Prepared:", `${signatories.prepared_by.name}\n${signatories.prepared_by.title}`),
              kvRow("Checked & Reviewed:", signatories.checked_by.map(s => `${s.name}\n${s.title}`).join("\n\n")),
              kvRow("Noted:", signatories.noted_by.map(s => `${s.name}\n${s.title}`).join("\n\n")),
            ],
          }),

          // Footer
          spacer(),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: "— End of Daily Lesson Plan —", italics: true, font: "Arial", size: 16, color: "808080" }),
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
    children: [new TextRun({ text, bold, font: "Arial", size })],
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

  const doc = new Document({
    creator: "DepEd WLP Generator",
    title: `WLP - ${lessonTitle}`,
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1080, right: 1080, bottom: 1080, left: 1080 },
          },
        },
        children: [
          // ========== HEADER ==========
          centeredLine("NATIONAL CAPITAL REGION", 18, false),
          centeredLine("SCHOOLS DIVISION OF LAS PIÑAS CITY", 18, false),
          centeredLine("S.Y. 2026-2027", 18, false),
          centeredLine("FIRST TERM", 18, false),

          // ========== TITLE ==========
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 120, after: 60 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "1F4E79" } },
            children: [
              new TextRun({ text: "WEEKLY LESSON PLAN (WLP)", bold: true, font: "Arial", size: 28, color: "1F4E79" }),
            ],
          }),
          centeredLine(input.learningArea.toUpperCase(), 24, true),

          // ========== METADATA TABLE ==========
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              kvRow("Name of Lesson", lessonTitle),
              kvRow("Week", `${input.quarter} | ${input.week}`),
              kvRow("Designed by Teacher/s", "[Teacher Name]"),
              kvRow("Grade Level & Section", `Grade ${input.gradeLevel}`),
              kvRow("No. of Sessions", "5 Sessions (50 minutes each)"),
              kvRow("References", "MATATAG K-10 Curriculum Guide; DepEd Science Learning Materials; DepEd MATATAG Curriculum Resources; Division DBOW."),
            ],
          }),

          spacer(),

          // ========== WEEKLY OBJECTIVES ==========
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              sectionRow("WEEKLY OBJECTIVES & COMPETENCIES"),
              kvRow("Weekly Competencies", plan.weeklyCompetencies),
              kvRow("Weekly Objectives", plan.weeklyObjectives),
              kvRow("Weekly Content Overview", plan.weeklyContent),
            ],
          }),

          spacer(),

          // ========== DAILY PLANS ==========
          ...DAYS.flatMap((day) => {
            const dayPlan = plan[day];
            return [
              new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                rows: [
                  sectionRow(`${DAY_LABELS[day]} — ${dayPlan.date}`),
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
              sectionRow("LEARNING RESOURCES"),
              fullRow(plan.learningResources),
            ],
          }),

          spacer(),

          // ========== REMARKS ==========
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              sectionRow("REMARKS & INTEGRATION"),
              fullRow(plan.remarks),
            ],
          }),

          spacer(),

          // ========== REFLECTION ==========
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              sectionRow("TEACHER REFLECTION"),
              fullRow(plan.reflection),
            ],
          }),

          spacer(),

          // ========== SIGNATORIES ==========
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              sectionRow("SIGNATORIES"),
              kvRow("Prepared by", "___________________________________\n[Teacher Name]\nTeacher I"),
              kvRow("Checked & Reviewed by", "___________________________________\n[Master Teacher Name]\nMaster Teacher"),
              kvRow("Noted by", "___________________________________\n[Principal Name]\nSchool Principal IV"),
            ],
          }),

          // Footer
          spacer(),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: "— End of Weekly Lesson Plan —", italics: true, font: "Arial", size: 16, color: "808080" }),
            ],
          }),
        ],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  return buffer;
}
