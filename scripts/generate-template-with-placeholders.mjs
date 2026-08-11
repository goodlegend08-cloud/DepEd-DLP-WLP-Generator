/**
 * Generate a proper DOCX template with {{PLACEHOLDER}} tags for docxtemplater
 * 
 * This creates a new template file that docxtemplater can properly fill.
 * 
 * Usage: node scripts/generate-template-with-placeholders.mjs
 */

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
import fs from "fs";
import path from "path";

// ============================================================
// CONFIGURATION
// ============================================================
const CONFIG = {
  outputFile: "SCIENCE-ILAW_template_filled.docx",
  outputPath: path.join(process.cwd(), "templates", "SCIENCE-ILAW_template_filled.docx"),
};

// ============================================================
// STYLES
// ============================================================
const BORDER_STYLE = {
  top: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
  bottom: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
  left: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
  right: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
};

// ============================================================
// CELL HELPERS
// ============================================================

/** Full-width section header (colspan=2), blue background */
function sectionHeaderCell(text) {
  return new TableCell({
    borders: BORDER_STYLE,
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

/** Full-width italic guidance cell (colspan=2), light blue background */
function guidanceCell(text) {
  return new TableCell({
    borders: BORDER_STYLE,
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
function labelCell(text) {
  return new TableCell({
    borders: BORDER_STYLE,
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

/** Right column content cell (75% width) with placeholder text */
function contentCell(placeholder) {
  const safeText = placeholder ?? "";
  const lines = safeText.split("\n");
  return new TableCell({
    borders: BORDER_STYLE,
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

function sectionRow(label) {
  return new TableRow({ children: [sectionHeaderCell(label)] });
}

function guidanceRow(text) {
  return new TableRow({ children: [guidanceCell(text)] });
}

function kvRow(label, value) {
  return new TableRow({ children: [labelCell(label), contentCell(value)] });
}

// ============================================================
// UTILITY HELPERS
// ============================================================
function centeredLine(text, size, bold) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 0 },
    children: [new TextRun({ text, bold, font: "Arial", size })],
  });
}

function spacer() {
  return new Paragraph({ spacing: { before: 120 }, children: [] });
}

// ============================================================
// BUILD DOCUMENT WITH PLACEHOLDERS
// ============================================================
function buildDocument() {
  const doc = new Document({
    creator: "DepEd DLP Generator",
    title: "DLP Template with Placeholders",
    description: "Science 9 Daily Lesson Plan Template",
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1080, right: 1080, bottom: 1080, left: 1080 },
          },
        },
        children: [
          // ========== SECTION 1: OFFICIAL HEADER (LETTERHEAD) ==========
          centeredLine("Republic of the Philippines", 18, false),
          centeredLine("Department of Education", 20, true),
          centeredLine("NATIONAL CAPITAL REGION", 18, false),
          centeredLine("SCHOOLS DIVISION OF LAS PIÑAS CITY", 18, false),
          centeredLine("LAS PIÑAS CAA NATIONAL HIGH SCHOOL", 18, true),
          centeredLine("NARRA CORNER RECEIVER STS., BF INTERNATIONAL VILLAGE, LAS PIÑAS CITY", 14, false),

          spacer(),

          // ========== DOCUMENT TITLE ==========
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 120, after: 60 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "1F4E79" } },
            children: [
              new TextRun({
                text: "LESSON PLAN IN {{LEARNING_AREA}} GRADE {{GRADE_LEVEL}}",
                bold: true,
                font: "Arial",
                size: 24,
                color: "1F4E79",
              }),
            ],
          }),

          spacer(),

          // ========== SECTION 2: METADATA TABLE ==========
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              kvRow("Name of Lesson", "{{LESSON_TITLE}}"),
              kvRow("Date, week, Day", "{{CALENDAR_DATE}}  Week: {{WEEK_NUMBER}}  Day: {{DAY_NUMBER}}"),
              kvRow("Designed by teacher/s", "{{TEACHER_NAME}}"),
              kvRow("Designed for which Grade Level and Section", "{{GRADE_AND_SECTION}}"),
              kvRow("No. of Sessions", "{{SESSIONS}}"),
              kvRow("References\n(books, websites, toolkits, etc.)", "{{REFERENCES}}"),
              kvRow("Declaration of AI Use\n(Cite how AI was used in the formulation of the lesson plan.) See DO 3 s.2026 Annex A", "{{AI_DECLARATION}}"),
            ],
          }),

          spacer(),

          // ========== SECTION 3: ILAW FRAMEWORK ==========

          // --- 3.1 INTENTIONS ---
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              sectionRow("Intentions."),
              guidanceRow(
                "Meaningful learning experiences are anchored on how we frame them. Start by deciding what you want your learners to master by the end of the lesson – keep it clear and simple.\nRemember: Understanding your learner\u2019s evolving context and designing around it helps ensure that your lessons connect with and are relevant to them."
              ),
              kvRow(
                "Learning Competency:\nWrite the competency/ies from the curriculum guide that we are targeting, and the content or performance standards applicable to the sessions",
                "{{LEARNING_COMPETENCY}}"
              ),
              kvRow(
                "Learning Objectives:\nWrite the smaller knowledge, skills or tasks from the competency that the learners will work on and be able to show by the end of the sessions",
                "{{DAY_OBJECTIVE}}"
              ),
              kvRow(
                "Learners\u2019 Context:\nWrite your observations of your learners, and how they have been performing or responding to learning experiences recently, including strengths, interests, and possible barriers to learning",
                "{{LEARNERS_CONTEXT}}"
              ),
            ],
          }),

          spacer(),

          // --- 3.2 LEARNING EXPERIENCE ---
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              sectionRow("Learning Experience."),
              guidanceRow(
                "Each activity and interaction builds towards meaningful understanding and growth. Identify activities and interactions to help learners gain knowledge, skills, or understanding in a purposeful way."
              ),
              kvRow(
                "Pre Lesson:\nDescribe how you will help learners get ready for the lesson.",
                "{{PRE_LESSON}}"
              ),
              kvRow(
                "Flow:\nDescribe the activities that you can implement in 1 or more sessions to meet the learning objectives.\n\nApply the Learning Design Principles by thinking about how to:\n\u2022 make the objectives clear for the learners\n\u2022 guide learners before letting them try the task on their own\n\u2022 check the state of the learners\u2019 well-being, understanding, and mastery over the lesson\n\u2022 connect today\u2019s new concept with past competencies\n\u2022 encourage collaboration among learners\n\u2022 invite learners to reflect on why these matters to them\n\u2022 ensure inclusion for learners\u2019 varied abilities, learning styles, and contexts.",
                "{{FLOW_ENGAGE}}\n\n{{FLOW_EXPLORE_EXPLAIN}}\n\n{{FLOW_ELABORATE}}\n\n{{FLOW_EVALUATE}}\n\n{{FLOW_REFLECTION}}"
              ),
              kvRow(
                "Learning Resources:\nList down the learning resources that will help you reach your objectives. Ensure that they are available and inclusive. Including options and alternatives in case of emergencies",
                "{{LEARNING_RESOURCES}}"
              ),
              kvRow(
                "Opportunities for Integration:\nWrite down any possibilities to meaningfully integrate another learning area, special topic, or technology. Write NA if none.",
                "{{OPPORTUNITIES_INTEGRATION}}"
              ),
            ],
          }),

          spacer(),

          // --- 3.3 ASSESSMENT ---
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              sectionRow("Assessment."),
              guidanceRow(
                "Assessments reveal what learners have gained and what they still need help with. These are helpful in providing you with information to guide your future instruction throughout the entire session."
              ),
              kvRow(
                "Formative Assessment:\nCreate a task, activity or questions to evaluate learning and provide feedback. Provide ways for learners to ask for guidance and support.\n\nRemember to provide appropriate accommodation so all learners can demonstrate their understanding (e.g. varied response formats, small group options, visual or auditory supports)",
                "{{FORMATIVE_FRUSTRATION}}\n\n{{FORMATIVE_INSTRUCTIONAL}}\n\n{{FORMATIVE_INDEPENDENT}}"
              ),
            ],
          }),

          spacer(),

          // --- 3.4 WAYS FORWARD ---
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              sectionRow("Ways Forward."),
              guidanceRow(
                "Meaningful learning can also happen beyond the classroom \u2013 for both the learners and the teacher. Pause and reflect on what happened today."
              ),
              kvRow(
                "Extended learning opportunities:\nSuggest other learning experiences outside the classroom hours that learners may want to access or reinforce what they have learned, to spark their curiosity further, or that may provide them support in areas of difficulty.",
                "{{EXTENDED_ADVANCED}}\n\n{{EXTENDED_STRUGGLING}}"
              ),
              kvRow(
                "Reflections:\nThink about what you need to change for the next session based on what happened today. Is there something the learners are interested in exploring? Are there some things you would like to share with your co-teachers\u2019 parents or school leaders about your classroom experience? What would you like your instructional coach to help you with?",
                "{{REFLECTIONS}}"
              ),
            ],
          }),

          spacer(),

          // ========== SECTION 4: SIGNATORIES ==========
          new Paragraph({
            alignment: AlignmentType.LEFT,
            spacing: { before: 60, after: 120 },
            children: [
              new TextRun({ text: "Prepared:", font: "Arial", size: 18 }),
            ],
          }),

          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 40, after: 20 },
            children: [
              new TextRun({ text: "{{TEACHER_NAME}}", font: "Arial", size: 18, bold: true }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 20 },
            children: [
              new TextRun({ text: "_________________________________________", font: "Arial", size: 18 }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 60 },
            children: [
              new TextRun({ text: "Teacher III", font: "Arial", size: 18 }),
            ],
          }),

          spacer(),

          new Paragraph({
            alignment: AlignmentType.LEFT,
            spacing: { before: 40, after: 60 },
            children: [
              new TextRun({ text: "Checked & Reviewed:", font: "Arial", size: 18 }),
            ],
          }),

          // Signatories table
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  createSigCell("TRIXIA A. PALMOS"),
                  createSigCell("CARMELITA G. YAP"),
                  createSigCell("Jeanette J. Ruga, Ph.D."),
                ],
              }),
              new TableRow({
                children: [
                  createSigLineCell(),
                  createSigLineCell(),
                  createSigLineCell(),
                ],
              }),
              new TableRow({
                children: [
                  createSigTitleCell("Master Teacher II - Science"),
                  createSigTitleCell("SCIENCE Coordinator"),
                  createSigTitleCell("Assistant School Principal II\nOfficer \u2013 in \u2013 Charge"),
                ],
              }),
            ],
          }),

          spacer(),

          new Paragraph({
            alignment: AlignmentType.LEFT,
            spacing: { before: 40, after: 60 },
            children: [
              new TextRun({ text: "Noted:", font: "Arial", size: 18 }),
            ],
          }),

          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  createSigCell("MILDRED T. TUBLE"),
                  createSigCell("GENOVIE G. TAGUM, Ph.D."),
                ],
              }),
              new TableRow({
                children: [
                  createSigLineCell(),
                  createSigLineCell(),
                ],
              }),
              new TableRow({
                children: [
                  createSigTitleCell("Public Schools District Supervisor \u2013 Cluster I"),
                  createSigTitleCell("Education Program Supervisor \u2013 SCIENCE"),
                ],
              }),
            ],
          }),

          // Footer
          spacer(),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: "\u2014 End of Daily Lesson Plan \u2014", italics: true, font: "Arial", size: 16, color: "808080" }),
            ],
          }),
        ],
      },
    ],
  });

  return doc;
}

// ============================================================
// SIGNATORY CELL HELPERS
// ============================================================
function createSigCell(name) {
  return new TableCell({
    borders: { top: { style: BorderStyle.NONE, size: 0 }, bottom: { style: BorderStyle.NONE, size: 0 }, left: { style: BorderStyle.NONE, size: 0 }, right: { style: BorderStyle.NONE, size: 0 } },
    verticalAlign: VerticalAlign.CENTER,
    width: { size: 33, type: WidthType.PERCENTAGE },
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 20, after: 20 },
        children: [
          new TextRun({ text: name, font: "Arial", size: 18, bold: true }),
        ],
      }),
    ],
  });
}

function createSigLineCell() {
  return new TableCell({
    borders: { top: { style: BorderStyle.NONE, size: 0 }, bottom: { style: BorderStyle.NONE, size: 0 }, left: { style: BorderStyle.NONE, size: 0 }, right: { style: BorderStyle.NONE, size: 0 } },
    verticalAlign: VerticalAlign.CENTER,
    width: { size: 33, type: WidthType.PERCENTAGE },
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 10, after: 10 },
        children: [
          new TextRun({ text: "___________________________________", font: "Arial", size: 18 }),
        ],
      }),
    ],
  });
}

function createSigTitleCell(title) {
  return new TableCell({
    borders: { top: { style: BorderStyle.NONE, size: 0 }, bottom: { style: BorderStyle.NONE, size: 0 }, left: { style: BorderStyle.NONE, size: 0 }, right: { style: BorderStyle.NONE, size: 0 } },
    verticalAlign: VerticalAlign.CENTER,
    width: { size: 33, type: WidthType.PERCENTAGE },
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 10, after: 10 },
        children: [
          new TextRun({ text: title, font: "Arial", size: 16, italics: true }),
        ],
      }),
    ],
  });
}

// ============================================================
// MAIN EXECUTION
// ============================================================
async function main() {
  console.log("📝 Generating template with {{PLACEHOLDER}} tags...");
  console.log(`   Output: ${CONFIG.outputPath}`);

  const doc = buildDocument();

  console.log("📦 Packing document...");
  const buffer = await Packer.toBuffer(doc);

  // Ensure templates directory exists
  const dir = path.dirname(CONFIG.outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  console.log(`💾 Writing to: ${CONFIG.outputPath}`);
  fs.writeFileSync(CONFIG.outputPath, buffer);

  console.log("");
  console.log("✅ Template generated successfully!");
  console.log(`📄 File: ${CONFIG.outputFile}`);
  console.log(`📏 Size: ${(buffer.length / 1024).toFixed(2)} KB`);
  console.log("");
  console.log("📋 Placeholders included:");
  console.log("   {{LESSON_TITLE}}, {{CALENDAR_DATE}}, {{WEEK_NUMBER}}, {{DAY_NUMBER}}");
  console.log("   {{TEACHER_NAME}}, {{GRADE_AND_SECTION}}, {{LEARNING_AREA}}, {{GRADE_LEVEL}}");
  console.log("   {{LEARNING_COMPETENCY}}, {{DAY_OBJECTIVE}}, {{LEARNERS_CONTEXT}}");
  console.log("   {{PRE_LESSON}}, {{FLOW_ENGAGE}}, {{FLOW_EXPLORE_EXPLAIN}}");
  console.log("   {{FLOW_ELABORATE}}, {{FLOW_EVALUATE}}, {{FLOW_REFLECTION}}");
  console.log("   {{LEARNING_RESOURCES}}, {{OPPORTUNITIES_INTEGRATION}}");
  console.log("   {{FORMATIVE_FRUSTRATION}}, {{FORMATIVE_INSTRUCTIONAL}}, {{FORMATIVE_INDEPENDENT}}");
  console.log("   {{EXTENDED_ADVANCED}}, {{EXTENDED_STRUGGLING}}, {{REFLECTIONS}}");
  console.log("   {{REFERENCES}}, {{AI_DECLARATION}}, {{SESSIONS}}");
}

main().catch((err) => {
  console.error("❌ Error generating template:", err);
  process.exit(1);
});