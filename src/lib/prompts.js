/** Program graduate outcomes block for prompts (no acronym in model-facing text). */
export function buildGraduateOutcomesContext(organizationDisplayName) {
  const org = organizationDisplayName?.trim() || "Your organization";
  return `${org} graduate learning outcomes must be woven into this document, but with restraint:
- Do NOT include inline outcome tags in the Course Description or Learning Outcomes sections. Write those sections in clear, professional language only.
- In all other sections (Unit Map, Weekly Plan, Assessment, Instructional Philosophy, etc.), when content naturally aligns with an outcome, reference it inline using this exact format (use an em dash or hyphen before the closing phrase): (Principle name — program outcome). Example: "Students examine how policy decisions affect vulnerable populations (Global Responsibility — program outcome)." Distribute the nine outcomes proportionally in those sections. Do not cluster them.
The nine outcome labels to draw from: 1.Critical Thinking and Problem Solving 2.Collaboration Across Networks and Leading by Example 3.Agility and Adaptability 4.Initiative and Entrepreneurship 5.Accessing and Analyzing Information 6.Effective Oral and Written Multimedia Communication 7.Curiosity and Imagination 8.Global Responsibility 9.Environmental Stewardship`;
}

/** @deprecated use buildGraduateOutcomesContext */
export const buildGloContext = buildGraduateOutcomesContext;

export function buildRules(organizationDisplayName) {
  const org = organizationDisplayName?.trim() || "Your organization";
  return `Formatting and writing rules:
- Use Markdown: # for major sections, ## for subsections, ### for sub-subsections
- Bold (**text**) only for course titles, book titles, and key academic terms
- Use bullet points for lists of 3 or more items; use tables for structured data
- No em dashes; replace with commas, semicolons, or rewrite
- No filler phrases (e.g., "It is worth noting", "It should be emphasized")
- Write with academic precision and professional clarity suited to educators and administrators
- Cite instructional materials by textbook title and author names only; do not name publishers, platforms, or repositories
- When referring to the authoring program office, use the full name: "${org}"
- Never start more than two consecutive sentences with "This course"
- Avoid AI-sounding phrases; write as a senior curriculum specialist would`;
}

export function buildGradeBandPedagogy(programGradeBand) {
  const band = programGradeBand || "6-12";
  const bands = {
    "6-8": `Grades 6–8 emphasis: concrete-to-abstract scaffolding, shorter instructional chunks, explicit modeling, guided inquiry, vocabulary routines across disciplines, and frequent formative checks. Prioritize executive-function supports and collaborative structures with clear roles.`,
    "9-10": `Grades 9–10 emphasis: increasing disciplinary literacy, structured argumentation, data and text evidence, study and revision strategies, and peer feedback protocols. Bridge foundational skills toward more independent inquiry.`,
    "11-12": `Grades 11–12 emphasis: synthesis across texts and disciplines, authentic tasks tied to post-secondary readiness, student choice within parameters, seminar-style discussion, and metacognitive reflection on learning strategies.`,
    "6-12": `Vertical coherence (grades 6–12): align prerequisite skills, vocabulary, and habits of mind year over year; increase independence and text complexity gradually; maintain common academic language for outcomes and rubrics across the program.`,
  };
  return bands[band] || bands["6-12"];
}

export function buildInstructionalOptionsBlock(opts) {
  const parts = [];
  if (opts?.prioritizeUDL) {
    parts.push(
      "Instructional design: prioritize multiple means of representation, action and expression, and engagement (universal design); offer flexible pathways to the same standards-based outcomes."
    );
  }
  const bal = opts?.assessmentBalance || "balanced";
  if (bal === "formative-heavy") {
    parts.push(
      "Assessment stance: emphasize frequent low-stakes formative evidence, clear success criteria, and feedback loops before major summatives."
    );
  } else if (bal === "summative-visible") {
    parts.push(
      "Assessment stance: keep summative milestones transparent early; align practice tasks to final performance tasks and rubrics."
    );
  } else {
    parts.push(
      "Assessment stance: balance formative checks with well-defined summative tasks; align rubrics to outcomes and calibrate difficulty to stated English proficiency."
    );
  }
  return parts.join("\n");
}
