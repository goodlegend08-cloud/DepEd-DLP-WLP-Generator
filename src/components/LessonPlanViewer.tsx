"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { GeneratedLessonPlan, GeneratedDLPPlan, LessonPlanInput, DLPFlowPhases, DLPFormativeAssessment, DLPExtendedLearning } from "@/types/lesson-plan";

interface LessonPlanViewerProps {
  plan: GeneratedLessonPlan | GeneratedDLPPlan;
  input?: LessonPlanInput;
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

export function LessonPlanViewer({ plan, input }: LessonPlanViewerProps) {
  if (isILAWFormat(plan)) {
    return <ILAWViewer plan={plan} input={input} />;
  }
  return <LegacyViewer plan={plan} input={input} />;
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <tr className="border-b">
      <td className="p-2 font-semibold bg-muted/50 w-1/3 text-xs whitespace-pre-wrap">{label}</td>
      <td className="p-2 text-xs whitespace-pre-wrap">{value}</td>
    </tr>
  );
}

function ProcedureStep({ label, content }: { label: string; content: string }) {
  return (
    <div>
      <h4 className="text-sm font-semibold mb-2 text-primary">{label}</h4>
      <div className="text-sm whitespace-pre-wrap text-muted-foreground">{content}</div>
    </div>
  );
}

function ILAWViewer({ plan }: { plan: GeneratedDLPPlan; input?: LessonPlanInput }) {
  const { header, lesson_plan_meta, intentions, learning_experience, assessment, ways_forward, signatories } = plan;
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

  return (
    <div className="space-y-4">
      {/* Official DepEd Header */}
      <div className="text-center py-4 border-b-2 border-primary">
        <p className="text-xs font-semibold">{header.republic}</p>
        <h2 className="text-lg font-bold">{header.department}</h2>
        <p className="text-xs">{header.region}</p>
        <p className="text-xs">{header.division}</p>
        <p className="text-xs font-semibold">{header.school}</p>
        <p className="text-[10px] text-muted-foreground">{header.address}</p>
      </div>

      {/* Lesson Plan Title */}
      <div className="text-center py-2">
        <h3 className="text-base font-bold uppercase">
          Lesson Plan in {lesson_plan_meta.learning_area} — Grade {lesson_plan_meta.grade_level}
        </h3>
      </div>

      {/* Metadata Table */}
      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm border-collapse">
            <tbody>
              <MetaRow label="Name of Lesson" value={lesson_plan_meta.lesson_title} />
              <MetaRow
                label="Date, Week, Day"
                value={`${lesson_plan_meta.calendar_date}, ${lesson_plan_meta.week_number}, ${lesson_plan_meta.day_number}`}
              />
              <MetaRow label="Designed by teacher/s" value={lesson_plan_meta.teacher_name} />
              <MetaRow label="Designed for which Grade Level and Section" value={lesson_plan_meta.grade_and_section} />
              <MetaRow label="No. of Sessions" value={lesson_plan_meta.sessions} />
              <MetaRow label="References" value={lesson_plan_meta.references} />
              <MetaRow
                label="Declaration of AI Use (See DO 3 s.2026 Annex A)"
                value={lesson_plan_meta.ai_declaration}
              />
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Intentions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base bg-primary text-primary-foreground py-2 px-4 rounded">
            INTENTIONS
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {intentions.framework_guidance_note && (
            <div>
              <h4 className="text-sm italic mb-1 bg-blue-50 py-1 px-2 rounded text-muted-foreground">
                {intentions.framework_guidance_note}
              </h4>
            </div>
          )}
          <div>
            <h4 className="text-sm font-semibold mb-1 bg-blue-50 py-1 px-2 rounded">Learning Competency</h4>
            <p className="text-sm whitespace-pre-wrap">{intentions.learning_competency}</p>
          </div>
          <div>
            <h4 className="text-sm font-semibold mb-1 bg-blue-50 py-1 px-2 rounded">Learning Objectives</h4>
            <p className="text-sm whitespace-pre-wrap">{intentions.learning_objectives}</p>
          </div>
          <div>
            <h4 className="text-sm font-semibold mb-1 bg-blue-50 py-1 px-2 rounded">Learners&apos; Context</h4>
            <p className="text-sm whitespace-pre-wrap">{intentions.learners_context}</p>
          </div>
        </CardContent>
      </Card>

      {/* Learning Experience */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base bg-primary text-primary-foreground py-2 px-4 rounded">
            LEARNING EXPERIENCE
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {learning_experience.framework_guidance_note && (
            <div>
              <h4 className="text-sm italic mb-1 bg-blue-50 py-1 px-2 rounded text-muted-foreground">
                {learning_experience.framework_guidance_note}
              </h4>
            </div>
          )}
          <ProcedureStep label="Pre-Lesson" content={learning_experience.pre_lesson} />
          <Separator />

          {/* Flow Section */}
          <div>
            <h4 className="text-sm font-semibold mb-2 text-primary">Flow</h4>
            <div className="space-y-3 ml-2 border-l-2 border-primary/20 pl-4">
              <ProcedureStep label="ENGAGE (5 mins) — Hook & Well-being" content={flow.engage} />
              <Separator />
              <ProcedureStep label="EXPLORE & EXPLAIN / MODELING (I Do — 15 mins)" content={flow.explore_explain_modeling} />
              <Separator />
              <ProcedureStep label="ELABORATE / GUIDED & COLLABORATIVE PRACTICE (We Do — 10 mins)" content={flow.elaborate_guided_practice} />
              <Separator />
              <ProcedureStep label="EVALUATE / INDEPENDENT PRACTICE (You Do — 10 mins)" content={flow.evaluate_independent_practice} />
              <Separator />
              <ProcedureStep label="REFLECTION & CLOSURE (5 mins)" content={flow.reflection_closure} />
            </div>
          </div>

          <Separator />
          <ProcedureStep label="Learning Resources" content={learning_experience.learning_resources} />
          <Separator />
          <ProcedureStep label="Opportunities for Integration" content={learning_experience.opportunities_for_integration} />
        </CardContent>
      </Card>

      {/* Assessment */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base bg-primary text-primary-foreground py-2 px-4 rounded">
            ASSESSMENT
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {assessment.framework_guidance_note && (
              <div>
                <h4 className="text-sm italic mb-1 bg-blue-50 py-1 px-2 rounded text-muted-foreground">
                  {assessment.framework_guidance_note}
                </h4>
              </div>
            )}
            <div>
              <h4 className="text-sm font-semibold mb-2 text-primary">Formative Assessment — Targeted Assessment Tasks</h4>
              <div className="space-y-3 ml-2">
                <ProcedureStep
                  label="1. Frustration Level (25%)"
                  content={formative.frustration}
                />
                <Separator />
                <ProcedureStep
                  label="2. Instructional Level (50%)"
                  content={formative.instructional}
                />
                <Separator />
                <ProcedureStep
                  label="3. Independent Level / HOTS (25%)"
                  content={formative.independent}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ways Forward */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base bg-primary text-primary-foreground py-2 px-4 rounded">
            WAYS FORWARD
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {ways_forward.framework_guidance_note && (
            <div>
              <h4 className="text-sm italic mb-1 bg-blue-50 py-1 px-2 rounded text-muted-foreground">
                {ways_forward.framework_guidance_note}
              </h4>
            </div>
          )}
          <div>
            <h4 className="text-sm font-semibold mb-2 text-primary">Extended Learning Opportunities</h4>
            <div className="space-y-3 ml-2">
              <ProcedureStep label="Advanced Readers (Independent Level — 25%)" content={extended.advanced} />
              <Separator />
              <ProcedureStep label="Struggling Readers (Frustration Level — 25%)" content={extended.struggling} />
            </div>
          </div>
          <Separator />
          <ProcedureStep label="Reflections (Teacher Reflective Prompts & Instructional Coach Items)" content={ways_forward.reflections} />
        </CardContent>
      </Card>

      {/* Signatories */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base bg-primary text-primary-foreground py-2 px-4 rounded">
            SIGNATORIES
          </CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <tbody>
              <tr>
                <td className="p-2 w-1/3 align-top">
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground mb-1">Prepared:</p>
                    <div className="mb-4">
                      <p className="font-semibold">{signatories.prepared_by.name}</p>
                      <p className="text-xs text-muted-foreground">{signatories.prepared_by.title}</p>
                    </div>
                  </div>
                </td>
                <td className="p-2 w-1/3 align-top">
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground mb-1">Checked & Reviewed:</p>
                    {signatories.checked_by.map((s, i) => (
                      <div key={i} className="mb-4">
                        <p className="font-semibold">{s.name}</p>
                        <p className="text-xs text-muted-foreground">{s.title}</p>
                      </div>
                    ))}
                  </div>
                </td>
                <td className="p-2 w-1/3 align-top">
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground mb-1">Noted:</p>
                    {signatories.noted_by.map((s, i) => (
                      <div key={i} className="mb-4">
                        <p className="font-semibold">{s.name}</p>
                        <p className="text-xs text-muted-foreground">{s.title}</p>
                      </div>
                    ))}
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

function LegacyViewer({ plan, input }: { plan: GeneratedLessonPlan; input?: LessonPlanInput }) {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="text-center py-4 border-b-2 border-primary">
        <p className="text-xs text-muted-foreground">NATIONAL CAPITAL REGION</p>
        <p className="text-xs text-muted-foreground">SCHOOLS DIVISION OF LAS PIÑAS CITY</p>
        <p className="text-xs text-muted-foreground">S.Y. 2026-2027 | FIRST TERM</p>
        <h2 className="text-xl font-bold text-primary mt-2">DAILY LESSON PLAN (DLP)</h2>
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
        <CardHeader>
          <CardTitle className="text-base bg-primary text-primary-foreground py-2 px-4 rounded">
            INTENTIONS
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <h4 className="text-sm font-semibold mb-1 bg-blue-50 py-1 px-2 rounded">Learning Competency</h4>
            <p className="text-sm whitespace-pre-wrap">{input?.competencies || plan.content.content}</p>
          </div>
          <div>
            <h4 className="text-sm font-semibold mb-1 bg-blue-50 py-1 px-2 rounded">Learning Objectives</h4>
            <p className="text-sm whitespace-pre-wrap">{plan.objectives.objectives_content}</p>
          </div>
          <div>
            <h4 className="text-sm font-semibold mb-1 bg-blue-50 py-1 px-2 rounded">Learners&apos; Context</h4>
            <p className="text-sm whitespace-pre-wrap">{plan.objectives.content}</p>
          </div>
        </CardContent>
      </Card>

      {/* Learning Experience */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base bg-primary text-primary-foreground py-2 px-4 rounded">
            LEARNING EXPERIENCE
          </CardTitle>
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
        <CardHeader>
          <CardTitle className="text-base bg-primary text-primary-foreground py-2 px-4 rounded">
            ASSESSMENT
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ProcedureStep label="Formative Assessment" content={plan.procedures.evaluation} />
        </CardContent>
      </Card>

      {/* Ways Forward */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base bg-primary text-primary-foreground py-2 px-4 rounded">
            WAYS FORWARD
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <ProcedureStep label="Extended Learning Opportunities" content={plan.reflection} />
          <Separator />
          <div>
            <h4 className="text-sm font-semibold mb-2 bg-blue-50 py-1 px-2 rounded">Reflections (Teacher Reflective Prompts)</h4>
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
        <CardHeader>
          <CardTitle className="text-base bg-primary text-primary-foreground py-2 px-4 rounded">
            SIGNATORIES
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="text-sm font-semibold mb-1">Prepared by</h4>
            <p className="text-sm text-muted-foreground">___________________________________<br />[Teacher Name]<br />Designed by</p>
          </div>
          <Separator />
          <div>
            <h4 className="text-sm font-semibold mb-1">Checked & Reviewed by</h4>
            <p className="text-sm text-muted-foreground">___________________________________<br />[Master Teacher Name]<br />Master Teacher</p>
            <p className="text-sm text-muted-foreground mt-2">___________________________________<br />[Coordinator Name]<br />Coordinator</p>
          </div>
          <Separator />
          <div>
            <h4 className="text-sm font-semibold mb-1">Noted by</h4>
            <p className="text-sm text-muted-foreground">___________________________________<br />[PSDS Name]<br />Public Schools District Supervisor</p>
            <p className="text-sm text-muted-foreground mt-2">___________________________________<br />[EPS Name]<br />Education Program Specialist — Science</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
