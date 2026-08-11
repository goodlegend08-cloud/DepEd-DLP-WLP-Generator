/**
 * Script to patch the SCIENCE-ILAW template.docx with {{PLACEHOLDER}} tags
 * 
 * This script reads the template, finds the table cells that need placeholders,
 * and replaces their content with the appropriate {{PLACEHOLDER}} tags.
 * 
 * Usage: node scripts/patch-template.mjs
 */

import PizZip from "pizzip";
import fs from "fs";
import path from "path";

const TEMPLATE_PATH = path.join(process.cwd(), "SCIENCE-ILAW template.docx");
const OUTPUT_PATH = path.join(process.cwd(), "SCIENCE-ILAW template.docx"); // overwrite

// Mapping of cell content patterns to placeholder tags
// The script searches for these patterns in the XML and replaces them
const REPLACEMENTS = [
  // Metadata table - Name of Lesson
  { search: "Harnessing EMR: Transverse Energy in Motion", replace: "{{LESSON_TITLE}}" },
  
  // Metadata table - Date, week, Day (empty cell with just spaces)
  { search: /<w:r[^>]*><w:rPr[^>]*><w:sz w:val="20"\/><\/w:rPr><w:t xml:space="preserve">   <\/w:t><\/w:r>/g, 
    replace: '<w:r><w:rPr><w:sz w:val="20"/></w:rPr><w:t>{{CALENDAR_DATE}}  Week: {{WEEK_NUMBER}}  Day: {{DAY_NUMBER}}</w:t></w:r>' },
  
  // Metadata table - Designed by teacher/s (empty cell with just spaces)
  { search: /<w:r[^>]*><w:rPr[^>]*><w:sz w:val="20"\/><\/w:rPr><w:t xml:space="preserve">   <\/w:t><\/w:r>(?=<\/w:p>)/g,
    replace: '<w:r><w:rPr><w:sz w:val="20"/></w:rPr><w:t>{{TEACHER_NAME}}</w:t></w:r>' },
  
  // Grade and Section
  { search: "Grade 9 – Enthusiastic, Empathy, Effulgence", replace: "{{GRADE_AND_SECTION}}" },
  
  // No. of Sessions
  { search: "1 Session", replace: "{{SESSIONS}}" },
  
  // References content
  { search: "MATATAG K-10 Curriculum Guide, Science Learning Materials Grade 9, DepEd MATATAG Curriculum Resources", replace: "{{REFERENCES}}" },
  
  // AI Declaration content
  { search: /Formulated using Gemini[\s\S]*?assessment items\./, replace: "{{AI_DECLARATION}}" },
  
  // Learning Competency (empty cell)
  { search: /<w:p[^>]*><w:pPr[^>]*><w:pStyle w:val="TableParagraph"\/><w:jc w:val="center"\/><w:rPr[^>]*><w:b[^>]*\/><w:bCs[^>]*\/><w:sz w:val="20"\/><\/w:rPr><\/w:pPr><\/w:p>/g,
    replace: '<w:p><w:pPr><w:pStyle w:val="TableParagraph"/><w:jc w:val="center"/><w:rPr><w:b/><w:bCs/><w:sz w:val="20"/></w:rPr></w:pPr><w:r><w:rPr><w:b/><w:bCs/><w:sz w:val="20"/></w:rPr><w:t>{{LEARNING_COMPETENCY}}</w:t></w:r></w:p>' },
  
  // Learning Objectives (empty cell)
  { search: /<w:p[^>]*><w:pPr[^>]*><w:pStyle w:val="TableParagraph"\/><w:jc w:val="center"\/><w:rPr[^>]*><w:b[^>]*\/><w:bCs[^>]*\/><w:sz w:val="20"\/><\/w:rPr><\/w:pPr><\/w:p>(?=<w:p)/g,
    replace: '<w:p><w:pPr><w:pStyle w:val="TableParagraph"/><w:jc w:val="center"/><w:rPr><w:b/><w:bCs/><w:sz w:val="20"/></w:rPr></w:pPr><w:r><w:rPr><w:b/><w:bCs/><w:sz w:val="20"/></w:rPr><w:t>{{DAY_OBJECTIVE}}</w:t></w:r></w:p>' },
  
  // Learners Context (empty cell)
  { search: /<w:p[^>]*><w:pPr[^>]*><w:pStyle w:val="NoSpacing"\/><\/w:pPr><\/w:p>/g,
    replace: '<w:p><w:pPr><w:pStyle w:val="NoSpacing"/></w:pPr><w:r><w:rPr><w:sz w:val="20"/></w:rPr><w:t>{{LEARNERS_CONTEXT}}</w:t></w:r></w:p>' },
  
  // Pre Lesson (empty cell)
  { search: /<w:p[^>]*><w:pPr[^>]*><w:pStyle w:val="TableParagraph"\/><w:rPr[^>]*><w:sz w:val="20"\/><\/w:rPr><\/w:pPr><\/w:p>(?=<w:p)/g,
    replace: '<w:p><w:pPr><w:pStyle w:val="TableParagraph"/><w:rPr><w:sz w:val="20"/></w:rPr></w:pPr><w:r><w:rPr><w:sz w:val="20"/></w:rPr><w:t>{{PRE_LESSON}}</w:t></w:r></w:p>' },
  
  // Flow (empty cell)
  { search: /<w:p[^>]*><w:pPr[^>]*><w:pStyle w:val="NoSpacing"\/><w:rPr[^>]*><w:b[^>]*\/><w:bCs[^>]*\/><\/w:rPr><\/w:pPr><\/w:p>/g,
    replace: '<w:p><w:pPr><w:pStyle w:val="NoSpacing"/><w:rPr><w:b/><w:bCs/></w:rPr></w:pPr><w:r><w:rPr><w:sz w:val="20"/></w:rPr><w:t>{{FLOW_ENGAGE}}</w:t></w:r></w:p>' },
  
  // Learning Resources (empty cell)
  { search: /<w:p[^>]*><w:pPr[^>]*><w:pStyle w:val="TableParagraph"\/><w:rPr[^>]*><w:b[^>]*\/><w:bCs[^>]*\/><w:sz w:val="20"\/><w:szCs w:val="20"\/><\/w:rPr><\/w:pPr><\/w:p>/g,
    replace: '<w:p><w:pPr><w:pStyle w:val="TableParagraph"/><w:rPr><w:b/><w:bCs/><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr></w:pPr><w:r><w:rPr><w:sz w:val="20"/></w:rPr><w:t>{{LEARNING_RESOURCES}}</w:t></w:r></w:p>' },
  
  // Opportunities for Integration (empty cell)
  { search: /<w:p[^>]*><w:pPr[^>]*><w:pStyle w:val="TableParagraph"\/><w:rPr[^>]*><w:b[^>]*\/><w:bCs[^>]*\/><w:sz w:val="20"\/><\/w:rPr><\/w:pPr><\/w:p>/g,
    replace: '<w:p><w:pPr><w:pStyle w:val="TableParagraph"/><w:rPr><w:b/><w:bCs/><w:sz w:val="20"/></w:rPr></w:pPr><w:r><w:rPr><w:sz w:val="20"/></w:rPr><w:t>{{OPPORTUNITIES_INTEGRATION}}</w:t></w:r></w:p>' },
  
  // Formative Assessment (empty cell)
  { search: /<w:p[^>]*><w:pPr[^>]*><w:pStyle w:val="NoSpacing"\/><w:rPr[^>]*><w:b[^>]*\/><w:bCs[^>]*\/><\/w:rPr><\/w:pPr><\/w:p>(?=<w:p)/g,
    replace: '<w:p><w:pPr><w:pStyle w:val="NoSpacing"/><w:rPr><w:b/><w:bCs/></w:rPr></w:pPr><w:r><w:rPr><w:sz w:val="20"/></w:rPr><w:t>{{FORMATIVE_FRUSTRATION}}</w:t></w:r></w:p>' },
  
  // Extended learning (empty cell)
  { search: /<w:p[^>]*><w:pPr[^>]*><w:pStyle w:val="TableParagraph"\/><w:rPr[^>]*><w:b[^>]*\/><w:bCs[^>]*\/><w:sz w:val="20"\/><\/w:rPr><\/w:pPr><\/w:p>(?=<w:p)/g,
    replace: '<w:p><w:pPr><w:pStyle w:val="TableParagraph"/><w:rPr><w:b/><w:bCs/><w:sz w:val="20"/></w:rPr></w:pPr><w:r><w:rPr><w:sz w:val="20"/></w:rPr><w:t>{{EXTENDED_ADVANCED}}</w:t></w:r></w:p>' },
  
  // Reflections (empty cell)
  { search: /<w:p[^>]*><w:pPr[^>]*><w:rPr[^>]*><w:b[^>]*\/><w:bCs[^>]*\/><w:i[^>]*\/><w:iCs[^>]*\/><w:sz w:val="20"\/><w:szCs w:val="20"\/><\/w:rPr><\/w:pPr><\/w:p>/g,
    replace: '<w:p><w:pPr><w:rPr><w:b/><w:bCs/><w:i/><w:iCs/><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr></w:pPr><w:r><w:rPr><w:sz w:val="20"/></w:rPr><w:t>{{REFLECTIONS}}</w:t></w:r></w:p>' },
];

async function main() {
  console.log("📝 Patching template with placeholder tags...");
  
  // Read the template
  const templateBuffer = fs.readFileSync(TEMPLATE_PATH);
  const zip = new PizZip(templateBuffer);
  
  // Get the document XML
  const docXml = zip.files["word/document.xml"].asText();
  
  let modifiedXml = docXml;
  let replacementCount = 0;
  
  // Apply each replacement
  for (const { search, replace } of REPLACEMENTS) {
    if (search instanceof RegExp) {
      const matches = modifiedXml.match(search);
      if (matches) {
        modifiedXml = modifiedXml.replace(search, replace);
        replacementCount += matches.length;
        console.log(`  ✓ Regex replacement matched ${matches.length} time(s)`);
      } else {
        console.log(`  ✗ Regex replacement did not match`);
      }
    } else {
      if (modifiedXml.includes(search)) {
        modifiedXml = modifiedXml.replace(search, replace);
        replacementCount++;
        console.log(`  ✓ Replaced: "${search.substring(0, 50)}..."`);
      } else {
        console.log(`  ✗ Not found: "${search.substring(0, 50)}..."`);
      }
    }
  }
  
  // Update the zip with modified XML
  zip.file("word/document.xml", modifiedXml);
  
  // Generate the modified DOCX
  const outputBuffer = zip.generate({
    type: "nodebuffer",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
  
  // Write the output
  fs.writeFileSync(OUTPUT_PATH, outputBuffer);
  
  console.log(`\n✅ Template patched successfully!`);
  console.log(`   ${replacementCount} replacements made`);
  console.log(`   Output: ${OUTPUT_PATH}`);
}

main().catch(err => {
  console.error("❌ Error:", err);
  process.exit(1);
});