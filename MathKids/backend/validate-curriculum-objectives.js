import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { supplementalQuestionMappings, supplementalQuestions, supplementalTopics } from "./curriculum-question-bank.v1.js";

const catalogPath = fileURLToPath(new URL("./curriculum-objectives.v1.json", import.meta.url));
const questionMappingPath = fileURLToPath(new URL("./question-objective-mapping.v1.json", import.meta.url));
const catalog = JSON.parse(await readFile(catalogPath, "utf8"));
const questionMappingCatalog = JSON.parse(await readFile(questionMappingPath, "utf8"));
const topicMigrations = ["./migrations/QuestionBank.sql", "./migrations/LearningPath.sql"];
const migrationText = (await Promise.all(topicMigrations.map((file) => readFile(new URL(file, import.meta.url), "utf8")))).join("\n");
const topicSections = [...migrationText.matchAll(/INSERT\s+INTO\s+\[mk\]\.\[Topics\]\s*\([^)]*\)\s*SELECT[\s\S]*?FROM\s*\(VALUES([\s\S]*?)\)\s*seed\s*\(/gi)];
const seededTopics = new Set();
for (const section of topicSections) {
  for (const match of section[1].matchAll(/\(([1-5]),'([a-z][a-z-]*)',N'/g)) {
    seededTopics.add(`${match[1]}:${match[2]}`);
  }
}
for (const topic of supplementalTopics) seededTopics.add(`${topic.grade}:${topic.topicCode}`);
const seededQuestionKeys = new Set();
const questionSections = [...migrationText.matchAll(/INSERT\s+INTO\s+\[mk\]\.\[Questions\]\s*\([\s\S]*?\)\s*SELECT[\s\S]*?FROM\s*\(VALUES([\s\S]*?)\)\s*seed\s*\(/gi)];
for (const section of questionSections) {
  for (const match of section[1].matchAll(/^\s*\(([1-5]),'([^']+)',N'((?:''|[^'])*)'/gm)) {
    const [, grade, topicCode, encodedQuestionText] = match;
    const questionText = encodedQuestionText.replaceAll("''", "'");
    seededQuestionKeys.add(JSON.stringify([Number(grade), topicCode, questionText]));
  }
}
const supplementalQuestionKeys = new Set();
const supplementalQuestionErrors = [];
for (const question of supplementalQuestions) {
  const key = JSON.stringify([question.grade, question.topicCode, question.questionText]);
  if (supplementalQuestionKeys.has(key) || seededQuestionKeys.has(key)) {
    supplementalQuestionErrors.push(`Duplicate supplemental question stem: grade ${question.grade}, ${question.topicCode}, ${question.questionText}.`);
  }
  supplementalQuestionKeys.add(key);
  seededQuestionKeys.add(key);
}
const errors = [...supplementalQuestionErrors];
const objectiveCodes = new Set();
const objectiveGrades = new Map();
const objectiveRecords = [];
const validStrands = new Set(["number_and_operations", "geometry_and_measurement", "statistics_and_probability"]);
const validScopes = new Set(["core", "extension", "needs-review"]);
const validMappings = new Set(["mapped", "partial", "missing"]);

if (catalog.schemaVersion !== 1) errors.push("schemaVersion must be 1.");
if (!new Set(["needs_teacher_review", "teacher-approved"]).has(catalog.framework?.verificationStatus)) {
  errors.push("framework.verificationStatus must be needs_teacher_review or teacher-approved.");
}
if (!Array.isArray(catalog.grades)) errors.push("grades must be an array.");

const grades = Array.isArray(catalog.grades) ? catalog.grades : [];
if (grades.length !== 5 || grades.some((entry, index) => entry.grade !== index + 1)) {
  errors.push("grades must contain exactly grades 1 through 5 in order.");
}

const topicKeys = new Set();
for (const grade of grades) {
  if (!Array.isArray(grade.topics) || !grade.topics.length) {
    errors.push(`Grade ${grade.grade} must have at least one topic.`);
    continue;
  }
  for (const topic of grade.topics) {
    const topicKey = `${grade.grade}:${topic.topicCode || topic.title}`;
    if (topicKeys.has(topicKey)) errors.push(`Duplicate topic key: ${topicKey}.`);
    topicKeys.add(topicKey);
    if (!Number.isInteger(topic.sequence) || topic.sequence < 1) errors.push(`${topicKey} must have a positive integer sequence.`);
    if (typeof topic.title !== "string" || !topic.title.trim() || topic.title.length > 150) errors.push(`${topicKey} must have a title of 1-150 characters.`);
    if (typeof topic.sourceSection !== "string" || !topic.sourceSection.trim() || topic.sourceSection.length > 250) errors.push(`${topicKey} must have a sourceSection of 1-250 characters.`);
    if (!validStrands.has(topic.strandCode)) errors.push(`${topicKey} has an invalid strandCode.`);
    if (!validScopes.has(topic.scope)) errors.push(`${topicKey} has an invalid scope.`);
    if (!validMappings.has(topic.appMapping)) errors.push(`${topicKey} has an invalid appMapping.`);
    if (topic.appMapping === "missing" && topic.topicCode !== null) errors.push(`${topicKey} is missing but has a topicCode.`);
    if (topic.appMapping !== "missing" && typeof topic.topicCode !== "string") errors.push(`${topicKey} should map to an app topicCode.`);
    if (topic.topicCode && !seededTopics.has(`${grade.grade}:${topic.topicCode}`)) errors.push(`${topicKey} references a topicCode not found in the current seed migrations.`);
    if (!Array.isArray(topic.objectives) || !topic.objectives.length) {
      errors.push(`${topicKey} must contain at least one learning objective.`);
      continue;
    }
    for (const objective of topic.objectives) {
      if (!objective.code || !objective.outcome) {
        errors.push(`${topicKey} contains an objective without code or outcome.`);
        continue;
      }
      if (objective.code.length > 80) errors.push(`${topicKey} has an objective code longer than 80 characters.`);
      if (objective.outcome.length > 1000) errors.push(`${objective.code} outcome exceeds the database limit of 1000 characters.`);
      if (objectiveCodes.has(objective.code)) errors.push(`Duplicate objective code: ${objective.code}.`);
      objectiveCodes.add(objective.code);
      objectiveGrades.set(objective.code, grade.grade);
      objectiveRecords.push({ topicKey, objective });
      if (!Array.isArray(objective.prerequisites)) errors.push(`${objective.code} prerequisites must be an array.`);
    }
  }
}

for (const { topicKey, objective } of objectiveRecords) {
  for (const prerequisite of objective.prerequisites || []) {
    if (!objectiveCodes.has(prerequisite)) errors.push(`${topicKey}/${objective.code} references unknown prerequisite ${prerequisite}.`);
    else if (objectiveGrades.get(prerequisite) > objectiveGrades.get(objective.code)) {
      errors.push(`${topicKey}/${objective.code} depends on a higher-grade objective ${prerequisite}.`);
    }
  }
}

const objectiveByCode = new Map(objectiveRecords.map(({ objective }) => [objective.code, objective]));
const prerequisiteVisitState = new Map();
const prerequisiteStack = [];
const reportedCycles = new Set();
const visitPrerequisites = (objectiveCode) => {
  const state = prerequisiteVisitState.get(objectiveCode) || 0;
  if (state === 2) return;
  if (state === 1) {
    const cycleStart = prerequisiteStack.indexOf(objectiveCode);
    const cycle = prerequisiteStack.slice(cycleStart);
    const cycleKey = [...cycle].sort().join(" -> ");
    if (!reportedCycles.has(cycleKey)) {
      errors.push(`Prerequisite cycle detected: ${[...cycle, objectiveCode].join(" -> ")}.`);
      reportedCycles.add(cycleKey);
    }
    return;
  }
  prerequisiteVisitState.set(objectiveCode, 1);
  prerequisiteStack.push(objectiveCode);
  for (const prerequisite of objectiveByCode.get(objectiveCode)?.prerequisites || []) {
    if (objectiveByCode.has(prerequisite)) visitPrerequisites(prerequisite);
  }
  prerequisiteStack.pop();
  prerequisiteVisitState.set(objectiveCode, 2);
};
for (const objectiveCode of objectiveByCode.keys()) visitPrerequisites(objectiveCode);

if (!Array.isArray(catalog.coverageGaps)) errors.push("coverageGaps must be an array.");
if (!catalog.lessonContentContract || !Array.isArray(catalog.lessonContentContract.theoryConcepts)
  || !Array.isArray(catalog.lessonContentContract.workedExamples)
  || !Array.isArray(catalog.lessonContentContract.commonMisconceptions)) {
  errors.push("lessonContentContract must define theory, worked examples, and common misconceptions.");
}

const mappingRecords = [
  ...(Array.isArray(questionMappingCatalog.mappings) ? questionMappingCatalog.mappings : []),
  ...supplementalQuestionMappings,
];
const mappingKeys = new Set();
const primaryQuestionKeys = new Set();
const mappedQuestionKeys = new Set();
const mappedObjectiveCodes = new Set();
if (questionMappingCatalog.schemaVersion !== 1) errors.push("question-objective mapping schemaVersion must be 1.");
if (questionMappingCatalog.status !== "needs-review") errors.push("Question mappings must remain needs-review until a teacher approves them.");
if (!Array.isArray(questionMappingCatalog.mappings)) errors.push("question-objective mapping mappings must be an array.");
if (!questionSections.length) errors.push("Could not find seeded Question Bank question sections to validate mappings against.");

for (const question of supplementalQuestions) {
  if (!objectiveCodes.has(question.objectiveCode)) errors.push(`Supplemental question references unknown objective ${question.objectiveCode}.`);
  if (objectiveGrades.get(question.objectiveCode) !== question.grade) errors.push(`Supplemental question grade does not match ${question.objectiveCode}.`);
  if (!seededTopics.has(`${question.grade}:${question.topicCode}`)) errors.push(`Supplemental question references an unseeded topic ${question.grade}:${question.topicCode}.`);
  if (typeof question.questionText !== "string" || !question.questionText.trim() || question.questionText.length > 1000) errors.push(`${question.objectiveCode} has an invalid question stem.`);
  if (!Array.isArray(question.options) || question.options.length !== 4 || question.options.some((option) => typeof option !== "string" || !option.trim() || option.length > 300)) errors.push(`${question.objectiveCode}/${question.questionText} must have four nonempty options of at most 300 characters.`);
  if (!Number.isInteger(question.correctIndex) || question.correctIndex < 0 || question.correctIndex > 3) errors.push(`${question.objectiveCode}/${question.questionText} has an invalid correctIndex.`);
  if (!Number.isInteger(question.difficulty) || question.difficulty < 1 || question.difficulty > 3) errors.push(`${question.objectiveCode}/${question.questionText} must have difficulty 1-3.`);
  if (typeof question.explanation !== "string" || !question.explanation.trim() || question.explanation.length > 1000) errors.push(`${question.objectiveCode}/${question.questionText} needs an explanation of at most 1000 characters.`);
}

const mappedQuestionsByObjective = new Map();
for (const mapping of mappingRecords) {
  const questionKey = JSON.stringify([mapping.grade, mapping.topicCode, mapping.questionText]);
  const linkKey = JSON.stringify([mapping.grade, mapping.topicCode, mapping.questionText, mapping.objectiveCode]);
  if (!seededQuestionKeys.has(questionKey)) errors.push(`Question mapping references a stem not found in the question seed: grade ${mapping.grade}, ${mapping.topicCode}, ${mapping.questionText}.`);
  if (mappingKeys.has(linkKey)) errors.push(`Duplicate question-objective mapping: ${mapping.objectiveCode} / ${mapping.questionText}.`);
  mappingKeys.add(linkKey);
  if (!objectiveCodes.has(mapping.objectiveCode)) errors.push(`Question mapping references unknown objective ${mapping.objectiveCode}.`);
  if (!Number.isInteger(mapping.grade) || mapping.grade < 1 || mapping.grade > 5) errors.push(`Invalid grade in mapping for ${mapping.questionText}.`);
  if (typeof mapping.evidenceNote !== "string" || !mapping.evidenceNote.trim() || mapping.evidenceNote.length > 500) errors.push(`Mapping ${mapping.objectiveCode} / ${mapping.questionText} needs an evidenceNote of 1-500 characters.`);
  if (typeof mapping.isPrimary !== "boolean") errors.push(`Mapping ${mapping.objectiveCode} / ${mapping.questionText} must declare isPrimary.`);
  if (objectiveGrades.has(mapping.objectiveCode) && Number.isInteger(mapping.grade)
    && Math.abs(objectiveGrades.get(mapping.objectiveCode) - mapping.grade) > 1) {
    errors.push(`Cross-grade mapping exceeds one grade: grade ${mapping.grade} question → ${mapping.objectiveCode}.`);
  }
  if (objectiveGrades.has(mapping.objectiveCode) && Number.isInteger(mapping.grade)
    && objectiveGrades.get(mapping.objectiveCode) > mapping.grade) {
    errors.push(`A question cannot be mapped forward to a higher-grade objective: grade ${mapping.grade} → ${mapping.objectiveCode}.`);
  }
  if (objectiveGrades.has(mapping.objectiveCode) && Number.isInteger(mapping.grade)
    && objectiveGrades.get(mapping.objectiveCode) < mapping.grade
    && !/(lớp|nền tảng)/i.test(mapping.evidenceNote || "")) {
    errors.push(`Cross-grade mapping needs an explicit prerequisite note: ${mapping.objectiveCode} / ${mapping.questionText}.`);
  }
  if (mapping.isPrimary) {
    if (primaryQuestionKeys.has(questionKey)) errors.push(`Question has more than one primary objective: ${mapping.questionText}.`);
    primaryQuestionKeys.add(questionKey);
  }
  mappedQuestionKeys.add(questionKey);
  mappedObjectiveCodes.add(mapping.objectiveCode);
  if (!mappedQuestionsByObjective.has(mapping.objectiveCode)) mappedQuestionsByObjective.set(mapping.objectiveCode, new Set());
  mappedQuestionsByObjective.get(mapping.objectiveCode).add(questionKey);
}
for (const objectiveCode of objectiveCodes) {
  const questionCount = mappedQuestionsByObjective.get(objectiveCode)?.size || 0;
  if (questionCount < 3) errors.push(`${objectiveCode} needs at least three distinct mapped practice questions; found ${questionCount}.`);
}
for (const questionKey of mappedQuestionKeys) {
  if (!primaryQuestionKeys.has(questionKey)) errors.push(`Mapped question has no primary objective: ${questionKey}.`);
}

if (errors.length) {
  console.error(`Curriculum catalog invalid (${errors.length} issue(s)):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  console.log(`Curriculum catalog valid: ${grades.length} grades, ${topicKeys.size} topics, ${objectiveCodes.size} objectives, ${catalog.coverageGaps.length} coverage gaps.`);
  console.log(`Question-objective links valid: ${mappingRecords.length} links across ${mappedQuestionKeys.size}/${seededQuestionKeys.size} seeded questions; all ${objectiveCodes.size} objectives have at least three distinct mapped questions. Teacher approval is still required.`);
  const uncoveredObjectives = [...objectiveCodes].filter((code) => !mappedObjectiveCodes.has(code));
  if (uncoveredObjectives.length) console.log(`Objectives with no mapped question yet: ${uncoveredObjectives.join(", ")}`);
}
