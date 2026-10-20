import test from "node:test";
import assert from "node:assert/strict";
import { applyPrerequisiteGates, evaluateLessonMastery, evaluateObjectiveEvidence, MASTERY_POLICY, selectFocusObjective } from "./masteryEngine.js";

const approved = { verificationStatus: "teacher-approved" };

test("does not use unreviewed curriculum as mastery evidence", () => {
  const result = evaluateObjectiveEvidence({ ...approved, verificationStatus: "needs_teacher_review", attemptCount: 8, correctCount: 8, distinctQuestionCount: 5 });
  assert.equal(result.evidenceStatus, "curriculum_needs_review");
  assert.equal(result.canInformAdaptivePath, false);
  assert.equal(result.isMastered, false);
});

test("requires both five answers and three distinct questions", () => {
  const tooFewAnswers = evaluateObjectiveEvidence({ ...approved, attemptCount: 4, correctCount: 4, distinctQuestionCount: 4 });
  const tooFewQuestions = evaluateObjectiveEvidence({ ...approved, attemptCount: 7, correctCount: 7, distinctQuestionCount: 2 });
  assert.equal(tooFewAnswers.evidenceStatus, "insufficient_evidence");
  assert.equal(tooFewQuestions.evidenceStatus, "insufficient_evidence");
  assert.equal(tooFewAnswers.canInformAdaptivePath, false);
});

test("marks a verified objective mastered only at 80 percent or higher", () => {
  const result = evaluateObjectiveEvidence({ ...approved, attemptCount: 5, correctCount: 4, distinctQuestionCount: 3 });
  assert.equal(result.accuracy, 80);
  assert.equal(result.evidenceStatus, "mastered");
  assert.equal(result.isMastered, true);
  assert.equal(result.recommendedDifficulty, 3);
});

test("separates support-needed and developing evidence", () => {
  const support = evaluateObjectiveEvidence({ ...approved, attemptCount: 6, correctCount: 2, distinctQuestionCount: 3 });
  const developing = evaluateObjectiveEvidence({ ...approved, attemptCount: 6, correctCount: 4, distinctQuestionCount: 3 });
  assert.equal(support.evidenceStatus, "support_candidate");
  assert.equal(support.recommendedDifficulty, 1);
  assert.equal(developing.evidenceStatus, "developing");
  assert.equal(developing.recommendedDifficulty, 2);
});

test("focuses practice on the weakest eligible core objective", () => {
  const supportAt40 = evaluateObjectiveEvidence({ ...approved, attemptCount: 5, correctCount: 2, distinctQuestionCount: 3 });
  const supportAt20 = evaluateObjectiveEvidence({ ...approved, attemptCount: 5, correctCount: 1, distinctQuestionCount: 3 });
  const developing = evaluateObjectiveEvidence({ ...approved, attemptCount: 5, correctCount: 3, distinctQuestionCount: 3 });
  const focus = selectFocusObjective([
    { code: "G1.DEVELOPING", outcome: "Đang phát triển", scope: "core", progress: developing },
    { code: "G1.SUPPORT_40", outcome: "Cần củng cố 40%", scope: "core", progress: supportAt40 },
    { code: "G1.SUPPORT_20", outcome: "Cần củng cố 20%", scope: "core", progress: supportAt20 },
    { code: "G1.EXTENSION", outcome: "Mở rộng", scope: "extension", progress: supportAt20 },
  ]);
  assert.deepEqual(focus, { code: "G1.SUPPORT_20", outcome: "Cần củng cố 20%", status: "support_candidate" });
});

test("does not focus an objective with unreviewed or blocked evidence", () => {
  const unreviewed = evaluateObjectiveEvidence({ verificationStatus: "needs_teacher_review", attemptCount: 5, correctCount: 1, distinctQuestionCount: 3 });
  const blocked = { ...evaluateObjectiveEvidence({ ...approved, attemptCount: 5, correctCount: 1, distinctQuestionCount: 3 }), canInformAdaptivePath: false };
  assert.equal(selectFocusObjective([
    { code: "G1.UNREVIEWED", outcome: "Chưa duyệt", scope: "core", progress: unreviewed },
    { code: "G1.BLOCKED", outcome: "Chưa mở", scope: "core", progress: blocked },
  ]), null);
});

test("a lesson is mastered only when all its core objectives are mastered", () => {
  const mastered = evaluateObjectiveEvidence({ ...approved, attemptCount: 5, correctCount: 5, distinctQuestionCount: 3 });
  const developing = evaluateObjectiveEvidence({ ...approved, attemptCount: 5, correctCount: 3, distinctQuestionCount: 3 });
  assert.equal(evaluateLessonMastery([
    { scope: "core", progress: mastered },
    { scope: "core", progress: mastered },
  ]).isMastered, true);
  assert.equal(evaluateLessonMastery([
    { scope: "core", progress: mastered },
    { scope: "core", progress: developing },
  ]).isMastered, false);
  assert.equal(evaluateLessonMastery([{ scope: "extension", progress: developing }]).isMastered, false);
});

test("policy explicitly excludes game-only answers and sets the evidence window", () => {
  assert.deepEqual(MASTERY_POLICY.eligibleActivities, ["Lesson", "Practice"]);
  assert.equal(MASTERY_POLICY.evidenceWindowDays, 90);
});

test("does not mark an objective mastered until its prerequisite is mastered", () => {
  const prerequisite = evaluateObjectiveEvidence({ ...approved, attemptCount: 5, correctCount: 3, distinctQuestionCount: 3 });
  const advanced = evaluateObjectiveEvidence({ ...approved, attemptCount: 5, correctCount: 5, distinctQuestionCount: 3 });
  const gated = applyPrerequisiteGates([
    { objectiveCode: "G1.BASE", ...prerequisite },
    { objectiveCode: "G2.NEXT", ...advanced },
  ], [{ objectiveCode: "G2.NEXT", prerequisiteCode: "G1.BASE" }]);
  assert.equal(gated[1].isMastered, false);
  assert.equal(gated[1].evidenceStatus, "prerequisite_not_mastered");
  assert.deepEqual(gated[1].blockingPrerequisites, ["G1.BASE"]);
});

test("unlocks a prerequisite chain once every earlier objective is mastered", () => {
  const masteryEvidence = () => evaluateObjectiveEvidence({ ...approved, attemptCount: 5, correctCount: 4, distinctQuestionCount: 3 });
  const gated = applyPrerequisiteGates([
    { objectiveCode: "G1.BASE", ...masteryEvidence() },
    { objectiveCode: "G2.MIDDLE", ...masteryEvidence() },
    { objectiveCode: "G3.NEXT", ...masteryEvidence() },
  ], [
    { objectiveCode: "G2.MIDDLE", prerequisiteCode: "G1.BASE" },
    { objectiveCode: "G3.NEXT", prerequisiteCode: "G2.MIDDLE" },
  ]);
  assert.deepEqual(gated.map((item) => item.isMastered), [true, true, true]);
  assert.deepEqual(gated.map((item) => item.canInformAdaptivePath), [true, true, true]);
});

test("a cyclic prerequisite definition can never grant mastery", () => {
  const masteryEvidence = () => evaluateObjectiveEvidence({ ...approved, attemptCount: 5, correctCount: 5, distinctQuestionCount: 3 });
  const gated = applyPrerequisiteGates([
    { objectiveCode: "G1.A", ...masteryEvidence() },
    { objectiveCode: "G1.B", ...masteryEvidence() },
  ], [
    { objectiveCode: "G1.A", prerequisiteCode: "G1.B" },
    { objectiveCode: "G1.B", prerequisiteCode: "G1.A" },
  ]);
  assert.deepEqual(gated.map((item) => item.isMastered), [false, false]);
  assert.deepEqual(gated.map((item) => item.canInformAdaptivePath), [false, false]);
});
