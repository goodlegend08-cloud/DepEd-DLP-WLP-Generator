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
// DYNAMIC DATA INPUT SLOTS — Fill these in before running
// ============================================================
const SLOTS = {
  CALENDAR_DATE: "July 24, 2026",
  WEEK_NUMBER: "Week 8",
  DAY_NUMBER: "Day 5 (Day 37 of DBOW)",
  TEACHER_NAME: "[Teacher Name]",
  GRADE_AND_SECTION: "Grade 9 – ILAW",
  LEARNING_AREA: "SCIENCE",
  GRADE_LEVEL: "9",
  LESSON_TITLE: "Wave After Wave: Comparing the Electromagnetic Spectrum",
  LEARNING_COMPETENCY:
    "Compare the relative wavelengths and frequencies of different types of electromagnetic waves, including radio waves, microwaves, infrared, visible light, ultra-violet, x-rays, and gamma radiation. (DBOW Day 37)",
  DAY_OBJECTIVE:
    "By the end of the session, 80% of learners will be able to compare and arrange the seven types of EM waves according to their relative wavelengths and frequencies using the electromagnetic spectrum diagram, with at least 75% accuracy on the differentiated assessment.",
  SUGGESTED_ACTIVITY:
    "Using the EM spectrum chart, learners will identify and arrange the seven EM wave types in order of increasing frequency and decreasing wavelength.",
};

// ============================================================
// CONFIGURATION
// ============================================================
const CONFIG = {
  outputFile: "SCIENCE-ILAW July 24, 2026.docx",
  outputPath: path.join(process.cwd(), "SCIENCE-ILAW July 24, 2026.docx"),
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
// DATA
// ============================================================
const R = SLOTS; // shorthand

// ============================================================
// CELL HELPERS — TRUE 2-COLUMN LAYOUT
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

/** Right column content cell (75% width) */
function contentCell(text) {
  const safeText = text ?? "";
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
// BUILD DOCUMENT — EXACT DEPED ILAW TEMPLATE
// ============================================================
function buildDocument() {
  const doc = new Document({
    creator: "DepEd DLP Generator",
    title: `DLP - ${R.LESSON_TITLE}`,
    description: `Science 9 Daily Lesson Plan - ${R.CALENDAR_DATE}`,
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
                text: `LESSON PLAN IN ${R.LEARNING_AREA} GRADE ${R.GRADE_LEVEL}`,
                bold: true,
                font: "Arial",
                size: 24,
                color: "1F4E79",
              }),
            ],
          }),

          spacer(),

          // ========== SECTION 2: METADATA TABLE (2-COLUMN) ==========
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              kvRow("Name of Lesson", R.LESSON_TITLE),
              kvRow("Date, week, Day", `${R.CALENDAR_DATE} &nbsp;&nbsp;&nbsp;&nbsp; week: ${R.WEEK_NUMBER} &nbsp;&nbsp;&nbsp;&nbsp; day: ${R.DAY_NUMBER}`),
              kvRow("Designed by teacher/s", R.TEACHER_NAME),
              kvRow("Designed for which Grade Level and Section", R.GRADE_AND_SECTION),
              kvRow("No. of Sessions", "1 Session"),
              kvRow(
                "References\n(books, websites, toolkits, etc.)",
                "MATATAG K-10 Curriculum Guide, Science Learning Materials Grade 9, DepEd MATATAG Curriculum Resources"
              ),
              kvRow(
                "Declaration of AI Use\n(Cite how AI was used in the formulation of the lesson plan.) See DO 3 s.2026 Annex A",
                "Formulated using Gemini Gem (Constructive Alignment & HOTS optimization). See DO 3 s.2026 Annex A. AI was used to structurally align the objectives, format the 5E delivery model, and build contextualized assessment items."
              ),
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
                R.LEARNING_COMPETENCY
              ),
              kvRow(
                "Learning Objectives:\nWrite the smaller knowledge, skills or tasks from the competency that the learners will work on and be able to show by the end of the sessions",
                R.DAY_OBJECTIVE
              ),
              kvRow(
                "Learners\u2019 Context:\nWrite your observations of your learners, and how they have been performing or responding to learning experiences recently, including strengths, interests, and possible barriers to learning",
                `Grade ${R.GRADE_LEVEL} students demonstrate strong interest in technology and mobile communications (e.g., smartphones, Wi-Fi networks along Alabang-Zapote Road). Heterogeneous reading and processing levels: Independent Level (25% - fluent readers, quick conceptual grasp), Instructional Level (50% - benefits from structured graphic organizers), and Frustration Level (25% - struggles with abstract physical concepts, requires visual scaffolds and peer support).`
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
                "Review & Setting Expectations (3 minutes):\n\u2022 The teacher greets the class with a quick emotional barometer check (using thumbs up/down) to gauge student energy levels."
              ),
              kvRow(
                "Flow:\nDescribe the activities that you can implement in 1 or more sessions to meet the learning objectives.\n\nApply the Learning Design Principles by thinking about how to:\n\u2022 make the objectives clear for the learners\n\u2022 guide learners before letting them try the task on their own\n\u2022 check the state of the learners\u2019 well-being, understanding, and mastery over the lesson\n\u2022 connect today\u2019s new concept with past competencies\n\u2022 encourage collaboration among learners\n\u2022 invite learners to reflect on why these matters to them\n\u2022 ensure inclusion for learners\u2019 varied abilities, learning styles, and contexts.",
                `ENGAGE: (5 mins)\n\u2022 Conduct brief well-being check.\n\u2022 Present core objective: "${R.DAY_OBJECTIVE}"\n\u2022 Activate prior knowledge using a contextual signal transmission hook.\n\nEXPLORE & EXPLAIN / MODELING (I Do) (15 mins):\n\u2022 Direct Teacher Modeling integrating mandated activity: ${R.SUGGESTED_ACTIVITY}.\n\u2022 Concept Explanation: Explain particle oscillations, wave propagation, and medium requirements clearly.\n\nELABORATE / GUIDED & COLLABORATIVE PRACTICE (We Do) (10 mins):\n\u2022 Group students into trios for a structured mini-task localized to Las Pi\u00f1as / NCR context.\n\u2022 Differentiated Tasks:\n  - Independent Level: Analyze and formulate a HOTS explanation connecting wave behavior to real-world infrastructure.\n  - Instructional Level: Complete a guided diagram worksheet labeling key components, field orientations, and propagation direction.\n  - Frustration Level: Complete a scaffolded fill-in-the-blank visual organizer matching core terms with direct teacher/peer support.\n\nEVALUATE / INDEPENDENT PRACTICE (You Do) (10 mins):\n\u2022 Students individually solve concept check prompts differentiated by reading level.\n\nREFLECTION & CLOSURE (5 mins):\n\u2022 Well-being & Value Reflection: Prompt students on the real-world value of the concept to daily Philippine life or emergency communications during natural disasters. Wrap up session.`
              ),
              kvRow(
                "Learning Resources:\nList down the learning resources that will help you reach your objectives. Ensure that they are available and inclusive. Including options and alternatives in case of emergencies",
                `\u2022 Primary equipment for ${R.SUGGESTED_ACTIVITY}.\n\u2022 DepEd Science Grade ${R.GRADE_LEVEL} Learner's Material.\n\u2022 Backup Plan (Emergency/Tech Outage): Printed visual diagram charts and physical demonstrations if multimedia displays are unavailable.`
              ),
              kvRow(
                "Opportunities for Integration:\nWrite down any possibilities to meaningfully integrate another learning area, special topic, or technology. Write NA if none.",
                "Cross-Curricular Link: Integration with Earth Science (Atmosphere/Solar Radiation) and Telecommunications Technology (Radio waves & Wi-Fi networks in NCR)."
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
                "Targeted Assessment Tasks:\n1. Frustration Level: Basic term-matching or identification activity with visual options and simple Yes/No concept checks.\n2. Instructional Level: In 2-3 sentences, explain the core scientific mechanism and how it travels through space or materials.\n3. Independent Level (HOTS): Evaluate a real-world scenario or construct a short argument analyzing physical phenomena using higher-order thinking skills."
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
                "Advanced Readers: Research high-level real-world applications in NCR and prepare a 1-page summary.\nStruggling Readers: Home observation activity: Identify 3 home appliances in Las Pi\u00f1as that apply today's concept and list their physical interactions."
              ),
              kvRow(
                "Reflections:\nThink about what you need to change for the next session based on what happened today. Is there something the learners are interested in exploring? Are there some things you would like to share with your co-teachers\u2019 parents or school leaders about your classroom experience? What would you like your instructional coach to help you with?",
                "Teacher Reflective Prompts:\n1. Did direct modeling effectively clarify the target concept within the tight time frame?\n2. Were students at the Frustration Level able to grasp core ideas through visual scaffolding?\n3. Instructional Coach Discussion Item: How can I further optimize direct modeling strategies for abstract concepts within a single 45-minute session?"
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
              new TextRun({ text: R.TEACHER_NAME, font: "Arial", size: 18, bold: true }),
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
// MAIN EXECUTION
// ============================================================
async function main() {
  console.log("📝 Generating DepEd DLP for Science 9 (ILAW Format)...");
  console.log(`   Date: ${R.CALENDAR_DATE}`);
  console.log(`   Topic: ${R.LESSON_TITLE}`);
  console.log(`   Week: ${R.WEEK_NUMBER} | Day: ${R.DAY_NUMBER}`);
  console.log(`   Teacher: ${R.TEACHER_NAME}`);
  console.log(`   Grade & Section: ${R.GRADE_AND_SECTION}`);
  console.log("");

  const doc = buildDocument();

  console.log("📦 Packing document...");
  const buffer = await Packer.toBuffer(doc);

  console.log(`💾 Writing to: ${CONFIG.outputPath}`);
  fs.writeFileSync(CONFIG.outputPath, buffer);

  console.log("");
  console.log("✅ DLP generated successfully!");
  console.log(`📄 File: ${CONFIG.outputFile}`);
  console.log(`📏 Size: ${(buffer.length / 1024).toFixed(2)} KB`);
  console.log("");
  console.log("📋 DYNAMIC DATA SLOTS (edit these at the top of this script):");
  console.log("   CALENDAR_DATE  =", R.CALENDAR_DATE);
  console.log("   WEEK_NUMBER    =", R.WEEK_NUMBER);
  console.log("   DAY_NUMBER     =", R.DAY_NUMBER);
  console.log("   TEACHER_NAME   =", R.TEACHER_NAME);
  console.log("   GRADE_SECTION  =", R.GRADE_AND_SECTION);
  console.log("   LEARNING_AREA  =", R.LEARNING_AREA);
  console.log("   GRADE_LEVEL    =", R.GRADE_LEVEL);
  console.log("   LESSON_TITLE   =", R.LESSON_TITLE);
  console.log("   COMPETENCY     =", R.LEARNING_COMPETENCY);
  console.log("   OBJECTIVE      =", R.DAY_OBJECTIVE);
  console.log("   ACTIVITY       =", R.SUGGESTED_ACTIVITY);
}

main().catch((err) => {
  console.error("❌ Error generating DLP:", err);
  process.exit(1);
});