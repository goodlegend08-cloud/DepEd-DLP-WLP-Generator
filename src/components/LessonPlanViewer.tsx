"use client";

import { useState, useRef, useEffect } from "react";
import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { stripTicketLabel } from "@/lib/utils";
import type { GeneratedLessonPlan, GeneratedDLPPlan, LessonPlanInput, DLPFlowPhases, DLPFormativeAssessment, DLPExtendedLearning, DLPSignatories } from "@/types/lesson-plan";

interface LessonPlanViewerProps {
  plan: GeneratedLessonPlan | GeneratedDLPPlan;
  input?: LessonPlanInput;
  /** When provided, text fields become editable via double-click. */
  onEdit?: (key: string, value: string | Record<string, unknown>) => void;
}

function isILAWFormat(plan: GeneratedLessonPlan | GeneratedDLPPlan): plan is GeneratedDLPPlan {
  return "header" in plan && "lesson_plan_meta" in plan && "intentions" in plan;
}

// Resolve nested or flat fields for backward compatibility
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
// TEMPLATE-STYLE BUILDING BLOCKS (mirrors the SCIENCE-ILAW docx)
// ============================================================

/** Solid black 1pt grid cell border. */
const CELL_BORDER = "border border-black";
/** Light-gray section banner fill (#D9D9D9 per template). */
const BANNER_FILL = "bg-[#D9D9D9]";

function MetaRow({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <tr>
      <td className={`${CELL_BORDER} p-2 w-1/3 text-[10pt] align-top`}>{label}</td>
      <td className={`${CELL_BORDER} p-2 text-xs whitespace-pre-wrap align-top`}>{children}</td>
    </tr>
  );
}

/**
 * Declaration of AI Use label with exact inline typography:
 * - "Declaration of AI Use": 10pt regular (not bold), underlined
 * - "(Cite how AI was used in the formulation of the lesson plan.)": 10pt italic
 * - "See DO 3 s.2026 Annex A": 8pt bold italic
 */
function AiDeclarationLabel() {
  return (
    <div className="space-y-1">
      <p className="text-[10pt] font-normal underline">Declaration of AI Use</p>
      <p className="text-[10pt] italic">(Cite how AI was used in the formulation of the lesson plan.)</p>
      <p className="text-[8pt] font-bold italic">See DO 3 s.2026 Annex A</p>
    </div>
  );
}

/** Gray section banner row: bold title (left) + italic guidance (right). */
function BannerRow({ title, guidance }: { title: string; guidance?: string }) {
  return (
    <tr>
      <td className={`${CELL_BORDER} ${BANNER_FILL} p-2 w-1/3 align-top`}>
        <span className="text-[12pt] font-bold">{title}</span>
      </td>
      <td className={`${CELL_BORDER} ${BANNER_FILL} p-2 text-[10pt] italic align-top`}>
        {guidance}
      </td>
    </tr>
  );
}

/** Subsection row: label + instruction (left), content (right). */
function SubRow({
  label,
  instruction,
  children,
}: {
  label: string;
  instruction?: string;
  children: ReactNode;
}) {
  return (
    <tr>
      <td className={`${CELL_BORDER} p-2 w-1/3 align-top`}>
        <p className="text-[12pt] font-bold italic underline">{label}</p>
        {instruction && <p className="text-[10pt] italic whitespace-pre-wrap mt-1 text-slate-700">{instruction}</p>}
      </td>
      <td className={`${CELL_BORDER} p-2 text-xs whitespace-pre-wrap align-top`}>{children}</td>
    </tr>
  );
}

/** Text that becomes an editable textarea on double-click. */
function EditableText({
  value,
  onEdit,
  className,
}: {
  value: string;
  onEdit?: (value: string) => void;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  useEffect(() => {
    if (editing && ref.current) {
      ref.current.focus();
      ref.current.setSelectionRange(ref.current.value.length, ref.current.value.length);
    }
  }, [editing]);

  if (!onEdit) {
    return <span className={className}>{value}</span>;
  }

  if (editing) {
    const commit = () => {
      setEditing(false);
      if (draft !== value) onEdit(draft);
    };
    return (
      <textarea
        ref={ref}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setDraft(value);
            setEditing(false);
          }
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            commit();
          }
        }}
        rows={Math.max(2, Math.ceil(draft.length / 60))}
        className="w-full text-xs p-2 border border-primary rounded bg-background focus:outline-none"
      />
    );
  }

  return (
    <span
      className={`${className || ""} cursor-text hover:bg-muted/50 rounded px-1`}
      title="Double-click to edit"
      onDoubleClick={() => setEditing(true)}
    >
      {value}
    </span>
  );
}

function ProcedureStep({ label, content, onEdit }: { label: string; content: string; onEdit?: (value: string) => void }) {
  return (
    <div className="mb-2">
      <p className="text-xs font-bold italic mb-1">{label}</p>
      <div className="text-xs whitespace-pre-wrap">
        <EditableText value={content} onEdit={onEdit} className="whitespace-pre-wrap" />
      </div>
    </div>
  );
}

// ============================================================
// SIGNATURE BLOCK (exact 3-tier layout)
// ============================================================

const DEFAULT_CHECKED = [
  { name: "TRIXIA A. PALMOS", title: "Master Teacher II - Science" },
  { name: "CARMELITA G. YAP", title: "SCIENCE Coordinator" },
  { name: "Jeanette J. Ruga, Ph.D.", title: "Assistant School Principal II\nOfficer-in-Charge" },
];
const DEFAULT_NOTED = [
  { name: "MILDRED T. TUBLE", title: "Public Schools District Supervisor – Cluster I" },
  { name: "GENOVIE G. TAGUM, Ph.D.", title: "Education Program Supervisor – SCIENCE" },
];

function SignatureRule() {
  return <div className="mx-auto my-1 border-b-2 border-black w-52" />;
}

/** One centered signature column: bold uppercase name, underline rule, italic title. */
function SignatureColumn({
  name,
  title,
  onEditName,
  onEditTitle,
}: {
  name: string;
  title: string;
  onEditName?: (value: string) => void;
  onEditTitle?: (value: string) => void;
}) {
  return (
    <div className="flex-1 text-center">
      <EditableText value={name} onEdit={onEditName} className="text-[12pt] font-bold uppercase" />
      <SignatureRule />
      <EditableText value={title} onEdit={onEditTitle} className="text-[11pt] italic leading-tight whitespace-pre-wrap" />
    </div>
  );
}

/**
 * Signature block rendered as clean, unbordered paragraph text — placed
 * AFTER the main lesson plan table. No table borders or gridlines.
 */
function SignatureBlock({
  preparedName,
  preparedTitle,
  checked,
  noted,
  onEdit,
}: {
  preparedName: string;
  preparedTitle: string;
  checked: { name: string; title: string }[];
  noted: { name: string; title: string }[];
  onEdit?: (path: string, value: string) => void;
}) {
  return (
    <div className="mt-8">
      {/* Prepared */}
      <div>
        <p className="font-bold">Prepared:</p>
        <div className="mt-6 flex">
          <SignatureColumn
            name={preparedName}
            title={preparedTitle}
            onEditName={onEdit ? (v) => onEdit("prepared_by.name", v) : undefined}
            onEditTitle={onEdit ? (v) => onEdit("prepared_by.title", v) : undefined}
          />
        </div>
      </div>

      {/* Checked & Reviewed (3-column spacing, no gridlines) */}
      <div className="mt-10">
        <p className="font-bold">Checked &amp; Reviewed:</p>
        <div className="mt-6 flex">
          {checked.map((s, i) => (
            <SignatureColumn
              key={i}
              name={s.name}
              title={s.title}
              onEditName={onEdit ? (v) => onEdit(`checked_by.${i}.name`, v) : undefined}
              onEditTitle={onEdit ? (v) => onEdit(`checked_by.${i}.title`, v) : undefined}
            />
          ))}
        </div>
      </div>

      {/* Noted (2-column spacing, no gridlines) */}
      <div className="mt-10">
        <p className="font-bold">Noted:</p>
        <div className="mt-6 flex">
          {noted.map((s, i) => (
            <SignatureColumn
              key={i}
              name={s.name}
              title={s.title}
              onEditName={onEdit ? (v) => onEdit(`noted_by.${i}.name`, v) : undefined}
              onEditTitle={onEdit ? (v) => onEdit(`noted_by.${i}.title`, v) : undefined}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export function LessonPlanViewer({ plan, input, onEdit }: LessonPlanViewerProps) {
  if (isILAWFormat(plan)) {
    return <ILAWViewer plan={plan} onEdit={onEdit} />;
  }
  return <LegacyViewer plan={plan} input={input} />;
}

function ILAWViewer({ plan, onEdit }: { plan: GeneratedDLPPlan; onEdit?: (key: string, value: string | Record<string, unknown>) => void }) {
  const { lesson_plan_meta, intentions, learning_experience, assessment, ways_forward, signatories } = plan;
  const flow = resolveFlow(learning_experience.flow, {
    engage: learning_experience.engage,
    explore_explain_modeling: learning_experience.explore_explain_modeling,
    elaborate_guided_practice: learning_experience.elaborate_guided_practice,
    evaluate_independent_practice: learning_experience.evaluate_independent_practice,
    reflection_closure: learning_experience.reflection_closure,
  });
  const formative = resolveFormativeAssessment(assessment.formative_assessment, {
    formative_assessment_frustration: assessment.formative_assessment_frustration,
    formative_assessment_instructional: assessment.formative_assessment_instructional,
    formative_assessment_independent: assessment.formative_assessment_independent,
  });
  const extended = resolveExtendedLearning(ways_forward.extended_learning, {
    extended_learning_advanced: ways_forward.extended_learning_advanced,
    extended_learning_struggling: ways_forward.extended_learning_struggling,
  });

  const preparedName =
    signatories?.prepared_by?.name || lesson_plan_meta.teacher_name || "JOSE ROMMEL L. GARCIA";
  const preparedTitle = signatories?.prepared_by?.title || "Teacher III";
  const checked =
    signatories?.checked_by?.length ? signatories.checked_by : DEFAULT_CHECKED;
  const noted =
    signatories?.noted_by?.length ? signatories.noted_by : DEFAULT_NOTED;

  const handleSignatoryEdit = (path: string, value: string) => {
    // Materialize the full signatories block from the currently rendered
    // values so editing one column never drops the other default columns.
    const base: DLPSignatories = {
      prepared_by: { name: preparedName, title: preparedTitle },
      checked_by: checked,
      noted_by: noted,
    };
    const parts = path.split(".");
    let target = base as unknown as Record<string, unknown>;
    for (let i = 0; i < parts.length - 1; i++) {
      target = target[parts[i]] as Record<string, unknown>;
    }
    target[parts[parts.length - 1]] = value;
    onEdit?.("signatories", base as unknown as Record<string, unknown>);
  };

  const INTENTIONS_GUIDANCE =
    intentions.framework_guidance_note ||
    "Meaningful learning experiences are anchored on how we frame them. Start by deciding what you want your learners to master by the end of the lesson – keep it clear and simple. Remember: Understanding your learner's evolving context and designing around it helps ensure that your lessons connect with and are relevant to them.";
  const EXPERIENCE_GUIDANCE =
    learning_experience.framework_guidance_note ||
    "Each activity and interaction builds towards meaningful understanding and growth. Identify activities and interactions to help learners gain knowledge, skills, or understanding in a purposeful way.";
  const ASSESSMENT_GUIDANCE =
    assessment.framework_guidance_note ||
    "Assessments reveal what learners have gained and what they still need help with. These are helpful in providing you with information to guide your future instruction throughout the entire session.";
  const FORWARD_GUIDANCE =
    ways_forward.framework_guidance_note ||
    "Meaningful learning can also happen beyond the classroom – for both the learners and the teacher. Pause and reflect on what happened today.";

  return (
    <div className="text-black font-serif" style={{ padding: "0.5cm 1.27cm 1.27cm 1.27cm" }}>
      {/* Official LPCAA DepEd Header Image */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/assets/lpcaa header.png"
        alt="LPCAA DepEd Header"
        style={{ width: "19.21cm", height: "4.2cm", display: "block", margin: "0 auto 12px auto" }}
      />

      {/* Lesson Plan Title */}
      <div className="text-center py-2">
        <h3 className="text-base font-bold uppercase tracking-wide">
          LESSON PLAN IN {lesson_plan_meta.learning_area} GRADE {lesson_plan_meta.grade_level}
        </h3>
      </div>

      {/* Metadata Table */}
      <table className="w-full border-collapse border border-black text-sm">
        <tbody>
          <MetaRow label="Name of Lesson">
            <EditableText value={lesson_plan_meta.lesson_title} onEdit={(v) => onEdit?.("lesson_plan_meta.lesson_title", v)} />
          </MetaRow>
          <MetaRow label="Date, Week, Day">
            <EditableText value={lesson_plan_meta.calendar_date} onEdit={(v) => onEdit?.("lesson_plan_meta.calendar_date", v)} />{" | "}
            {!/^week\b/i.test(lesson_plan_meta.week_number) && <span className="font-semibold">Week:</span>}
            {!/^week\b/i.test(lesson_plan_meta.week_number) && " "}
            <EditableText value={lesson_plan_meta.week_number} onEdit={(v) => onEdit?.("lesson_plan_meta.week_number", v)} />{" | "}
            {!/^day\b/i.test(lesson_plan_meta.day_number) && <span className="font-semibold">Day:</span>}
            {!/^day\b/i.test(lesson_plan_meta.day_number) && " "}
            <EditableText value={lesson_plan_meta.day_number} onEdit={(v) => onEdit?.("lesson_plan_meta.day_number", v)} />
          </MetaRow>
          <MetaRow label="Designed by teacher/s">
            <EditableText value={lesson_plan_meta.teacher_name} onEdit={(v) => onEdit?.("lesson_plan_meta.teacher_name", v)} />
          </MetaRow>
          <MetaRow label="Designed for which Grade Level and Section">
            <EditableText value={lesson_plan_meta.grade_and_section} onEdit={(v) => onEdit?.("lesson_plan_meta.grade_and_section", v)} />
          </MetaRow>
          <MetaRow label="No. of Sessions">
            <EditableText value={lesson_plan_meta.sessions} onEdit={(v) => onEdit?.("lesson_plan_meta.sessions", v)} />
          </MetaRow>
          <MetaRow label="References (books, websites, toolkits, etc.)">
            <EditableText value={lesson_plan_meta.references} onEdit={(v) => onEdit?.("lesson_plan_meta.references", v)} />
          </MetaRow>
          <MetaRow label={<AiDeclarationLabel />}>
            <EditableText value={lesson_plan_meta.ai_declaration} onEdit={(v) => onEdit?.("lesson_plan_meta.ai_declaration", v)} />
          </MetaRow>
        </tbody>
      </table>

      {/* Intentions */}
      <table className="w-full border-collapse border border-black text-sm">
        <tbody>
          <BannerRow title="Intentions." guidance={INTENTIONS_GUIDANCE} />
          <SubRow
            label="Learning Competency:"
            instruction="Write the competency/ies from the curriculum guide that we are targeting, and the content or performance standards applicable to the sessions"
          >
            <EditableText value={intentions.learning_competency} onEdit={(v) => onEdit?.("intentions.learning_competency", v)} className="block text-center font-bold" />
          </SubRow>
          <SubRow
            label="Learning Objectives:"
            instruction="Write the smaller knowledge, skills or tasks from the competency that the learners will work on and be able to show by the end of the sessions"
          >
            <EditableText value={intentions.learning_objectives} onEdit={(v) => onEdit?.("intentions.learning_objectives", v)} className="block text-center font-bold" />
          </SubRow>
          <SubRow
            label="Learners' Context:"
            instruction="Write your observations of your learners, and how they have been performing or responding to learning experiences recently, including strengths, interests, and possible barriers to learning"
          >
            <EditableText value={intentions.learners_context} onEdit={(v) => onEdit?.("intentions.learners_context", v)} />
          </SubRow>
        </tbody>
      </table>

      {/* Learning Experience */}
      <table className="w-full border-collapse border border-black text-sm">
        <tbody>
          <BannerRow title="Learning Experience." guidance={EXPERIENCE_GUIDANCE} />
          <SubRow
            label="Pre Lesson:"
            instruction="Describe how you will help learners get ready for the lesson."
          >
            <EditableText value={learning_experience.pre_lesson} onEdit={(v) => onEdit?.("learning_experience.pre_lesson", v)} />
          </SubRow>
          <SubRow
            label="Flow:"
            instruction={`Describe the activities that you can implement in 1 or more sessions to meet the learning objectives.

Apply the Learning Design Principles by thinking about how to:
• make the objectives clear for the learners
• guide learners before letting them try the task on their own
• check the state of the learners’ well-being, understanding, and mastery over the lesson
• connect today’s new concept with past competencies
• encourage collaboration among learners
• invite learners to reflect on why these matters to them
• ensure inclusion for learners’ varied abilities, learning styles, and contexts.`}
          >
            <div className="space-y-2">
              <ProcedureStep label="• ENGAGE (5 mins) — Hook & Well-being" content={flow.engage} onEdit={(v) => onEdit?.("learning_experience.flow.engage", v)} />
              <ProcedureStep label="• Explore & Explain / Modeling (I Do — 15 mins)" content={flow.explore_explain_modeling} onEdit={(v) => onEdit?.("learning_experience.flow.explore_explain_modeling", v)} />
              <ProcedureStep label="• Elaborate / Guided & Collaborative Practice (We Do — 10 mins)" content={flow.elaborate_guided_practice} onEdit={(v) => onEdit?.("learning_experience.flow.elaborate_guided_practice", v)} />
              <ProcedureStep label="• Evaluate / Independent Practice (You Do — 10 mins)" content={flow.evaluate_independent_practice} onEdit={(v) => onEdit?.("learning_experience.flow.evaluate_independent_practice", v)} />
              <ProcedureStep label="• Reflection & Closure (5 mins)" content={flow.reflection_closure} onEdit={(v) => onEdit?.("learning_experience.flow.reflection_closure", v)} />
            </div>
          </SubRow>
          <SubRow
            label="Learning Resources:"
            instruction="List down the learning resources that will help you reach your objectives. Ensure that they are available and inclusive. Including options and alternatives in case of emergencies"
          >
            <EditableText value={learning_experience.learning_resources} onEdit={(v) => onEdit?.("learning_experience.learning_resources", v)} />
          </SubRow>
          <SubRow
            label="Opportunities for Integration:"
            instruction="Write down any possibilities to meaningfully integrate another learning area, special topic, or technology. Write NA if none."
          >
            <EditableText value={learning_experience.opportunities_for_integration} onEdit={(v) => onEdit?.("learning_experience.opportunities_for_integration", v)} />
          </SubRow>
        </tbody>
      </table>

      {/* Assessment */}
      <table className="w-full border-collapse border border-black text-sm">
        <tbody>
          <BannerRow title="Assessment." guidance={ASSESSMENT_GUIDANCE} />
          <SubRow
            label="Formative Assessment:"
            instruction={`Create a task, activity or questions to evaluate learning and provide feedback. Provide ways for learners to ask for guidance and support.

Remember to provide appropriate accommodation so all learners can demonstrate their understanding (e.g. varied response formats, small group options, visual or auditory supports)`}
          >
            {[formative.item_1, formative.item_2, formative.item_3, formative.item_4, formative.item_5].some(Boolean) ? (
              <div className="space-y-2">
                <p className="font-bold italic mb-1">{formative.title || "EVALUATE (5 mins) — Formative Assessment"}</p>
                <p className="italic mb-1">{formative.format || "Individual Written 5-Item Exit Ticket"}</p>
                <ProcedureStep label="Item 1 (Terminology / Key Scientist)" content={stripTicketLabel(formative.item_1 || "", "item")} onEdit={(v) => onEdit?.("assessment.formative_assessment.item_1", v)} />
                <ProcedureStep label="Item 2 (Location / Structure)" content={stripTicketLabel(formative.item_2 || "", "item")} onEdit={(v) => onEdit?.("assessment.formative_assessment.item_2", v)} />
                <ProcedureStep label="Item 3 (Trend / Process / Direction)" content={stripTicketLabel(formative.item_3 || "", "item")} onEdit={(v) => onEdit?.("assessment.formative_assessment.item_3", v)} />
                <ProcedureStep label="Item 4 (Underlying Mechanism / Physical Process)" content={stripTicketLabel(formative.item_4 || "", "item")} onEdit={(v) => onEdit?.("assessment.formative_assessment.item_4", v)} />
                <ProcedureStep label="Item 5 (Concluding Outcome / System Behavior)" content={stripTicketLabel(formative.item_5 || "", "item")} onEdit={(v) => onEdit?.("assessment.formative_assessment.item_5", v)} />
                <p className="font-bold italic mt-2">Answer Key</p>
                {[
                  [formative.answer_key_1, "answer_key_1"],
                  [formative.answer_key_2, "answer_key_2"],
                  [formative.answer_key_3, "answer_key_3"],
                  [formative.answer_key_4, "answer_key_4"],
                  [formative.answer_key_5, "answer_key_5"],
                ].map(([answer, key], idx) =>
                  answer ? (
                    <div key={key} className="mb-1 flex gap-1 text-xs">
                      <span className="shrink-0 font-semibold">{idx + 1}.</span>
                      <div className="min-w-0 flex-1 whitespace-pre-wrap">
                        <EditableText
                          value={stripTicketLabel(answer || "", "answer")}
                          onEdit={(v) => onEdit?.(`assessment.formative_assessment.${key}`, v)}
                          className="whitespace-pre-wrap"
                        />
                      </div>
                    </div>
                  ) : null
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <p className="font-bold italic mb-1">Targeted Assessment Tasks:</p>
                <ProcedureStep label="1. Frustration Level (25%)" content={formative.frustration || ""} onEdit={(v) => onEdit?.("assessment.formative_assessment.frustration", v)} />
                <ProcedureStep label="2. Instructional Level (50%)" content={formative.instructional || ""} onEdit={(v) => onEdit?.("assessment.formative_assessment.instructional", v)} />
                <ProcedureStep label="3. Independent Level / HOTS (25%)" content={formative.independent || ""} onEdit={(v) => onEdit?.("assessment.formative_assessment.independent", v)} />
              </div>
            )}
          </SubRow>
        </tbody>
      </table>

      {/* Ways Forward */}
      <table className="w-full border-collapse border border-black text-sm">
        <tbody>
          <BannerRow title="Ways Forward." guidance={FORWARD_GUIDANCE} />
          <SubRow
            label="Extended learning opportunities:"
            instruction="Suggest other learning experiences outside the classroom hours that learners may want to access or reinforce what they have learned, to spark their curiosity further, or that may provide them support in areas of difficulty."
          >
            <div className="space-y-2">
              <ProcedureStep label="Advanced Readers (Independent Level — 25%)" content={extended.advanced} onEdit={(v) => onEdit?.("ways_forward.extended_learning.advanced", v)} />
              <ProcedureStep label="Struggling Readers (Frustration Level — 25%)" content={extended.struggling} onEdit={(v) => onEdit?.("ways_forward.extended_learning.struggling", v)} />
              {extended.remediation_threshold ? (
                <ProcedureStep label="Remediation Threshold (Exit Ticket)" content={extended.remediation_threshold} onEdit={(v) => onEdit?.("ways_forward.extended_learning.remediation_threshold", v)} />
              ) : null}
            </div>
          </SubRow>
          <SubRow
            label="Reflections:"
            instruction="Think about what you need to change for the next session based on what happened today. Is there something the learners are interested in exploring? Are there some things you would like to share with your co-teachers, parents or school leaders about your classroom experience? What would you like your instructional coach to help you with?"
          >
            <EditableText value={ways_forward.reflections} onEdit={(v) => onEdit?.("ways_forward.reflections", v)} />
          </SubRow>
        </tbody>
      </table>

      {/* Signatories */}
      <SignatureBlock
        preparedName={preparedName}
        preparedTitle={preparedTitle}
        checked={checked}
        noted={noted}
        onEdit={onEdit ? handleSignatoryEdit : undefined}
      />
    </div>
  );
}

function LegacyViewer({ plan, input }: { plan: GeneratedLessonPlan; input?: LessonPlanInput }) {
  return (
    <div className="text-black font-serif space-y-4" style={{ padding: "0.5cm 1.27cm 1.27cm 1.27cm" }}>
      {/* Header */}
      <div className="text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/assets/lpcaa header.png"
          alt="LPCAA DepEd Header"
          style={{ width: "19.21cm", height: "4.2cm", display: "block", margin: "0 auto 12px auto" }}
        />
        <h2 className="text-lg font-bold mt-2">DAILY LESSON PLAN (DLP)</h2>
        <p className="text-sm font-semibold uppercase">{input?.learningArea || "SCIENCE"}</p>
      </div>

      {/* Metadata */}
      {input && (
        <div className="flex flex-wrap gap-2 mb-4">
          <span className="text-xs bg-muted px-2 py-1 rounded">Grade {input.gradeLevel}</span>
          <span className="text-xs bg-muted px-2 py-1 rounded">{input.learningArea}</span>
          <span className="text-xs bg-muted px-2 py-1 rounded">{input.quarter}</span>
          <span className="text-xs bg-muted px-2 py-1 rounded">{input.week}</span>
        </div>
      )}

      {/* Intentions */}
      <Card>
        <CardHeader className="p-0">
          <div className={`${BANNER_FILL} px-4 py-2 rounded-t`}>
            <CardTitle className="text-base font-bold text-slate-900">Intentions.</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <h4 className="text-[12pt] font-bold italic underline mb-1">Learning Competency:</h4>
            <p className="text-sm font-bold text-center whitespace-pre-wrap">{input?.competencies || plan.content.content}</p>
          </div>
          <div>
            <h4 className="text-[12pt] font-bold italic underline mb-1">Learning Objectives:</h4>
            <p className="text-sm font-bold text-center whitespace-pre-wrap">{plan.objectives.objectives_content}</p>
          </div>
          <div>
            <h4 className="text-[12pt] font-bold italic underline mb-1">Learners&apos; Context:</h4>
            <p className="text-sm whitespace-pre-wrap">{plan.objectives.content}</p>
          </div>
        </CardContent>
      </Card>

      {/* Learning Experience */}
      <Card>
        <CardHeader className="p-0">
          <div className={`${BANNER_FILL} px-4 py-2 rounded-t`}>
            <CardTitle className="text-base font-bold text-slate-900">Learning Experience.</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <ProcedureStep label="Pre-Lesson" content={plan.procedures.balik_aral} />
          <Separator />
          <ProcedureStep label="ENGAGE (5 mins)" content={plan.procedures.paghahabi} />
          <Separator />
          <ProcedureStep label="EXPLORE & EXPLAIN / MODELING (I Do — 15 mins)" content={plan.procedures.pagtatalakay} />
          <Separator />
          <ProcedureStep label="ELABORATE / GUIDED & COLLABORATIVE PRACTICE (We Do — 10 mins)" content={plan.procedures.development} />
          <Separator />
          <ProcedureStep label="EVALUATE / INDEPENDENT PRACTICE (You Do — 10 mins)" content={plan.procedures.abstraction} />
          <Separator />
          <ProcedureStep label="REFLECTION & CLOSURE (5 mins)" content={plan.procedures.application} />
          <Separator />
          <ProcedureStep label="Learning Resources" content={plan.learning_resources.content} />
          <Separator />
          <ProcedureStep label="Opportunities for Integration" content={plan.remarks} />
        </CardContent>
      </Card>

      {/* Assessment */}
      <Card>
        <CardHeader className="p-0">
          <div className={`${BANNER_FILL} px-4 py-2 rounded-t`}>
            <CardTitle className="text-base font-bold text-slate-900">Assessment.</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <ProcedureStep label="Formative Assessment" content={plan.procedures.evaluation} />
        </CardContent>
      </Card>

      {/* Ways Forward */}
      <Card>
        <CardHeader className="p-0">
          <div className={`${BANNER_FILL} px-4 py-2 rounded-t`}>
            <CardTitle className="text-base font-bold text-slate-900">Ways Forward.</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <ProcedureStep label="Extended Learning Opportunities" content={plan.reflection} />
          <Separator />
          <div>
            <h4 className="text-[12pt] font-bold italic underline mb-2">Reflections:</h4>
            <ol className="text-sm list-decimal list-inside space-y-2 text-muted-foreground">
              <li>Were the differentiated group activities effective in addressing the three reading levels? What evidence from learner responses supports this?</li>
              <li>Which part of the lesson (Engage, Explore, Elaborate, Evaluate) showed the highest learner engagement, and what instructional strategy contributed to this?</li>
              <li>How effectively did the local context examples help learners connect the abstract concept to their daily lives?</li>
            </ol>
          </div>
        </CardContent>
      </Card>

      {/* Signatories */}
      <Card>
        <CardHeader className="p-0">
          <div className={`${BANNER_FILL} px-4 py-2 rounded-t`}>
            <CardTitle className="text-base font-bold text-slate-900">Signatories.</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <SignatureBlock
            preparedName={input?.teacherName || "JOSE ROMMEL L. GARCIA"}
            preparedTitle="Teacher III"
            checked={DEFAULT_CHECKED}
            noted={DEFAULT_NOTED}
          />
        </CardContent>
      </Card>
    </div>
  );
}