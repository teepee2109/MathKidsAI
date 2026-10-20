export const MASTERY_POLICY = Object.freeze({
  minimumAttempts: 5,
  minimumDistinctQuestions: 3,
  masteryAccuracy: 0.8,
  supportAccuracy: 0.5,
  evidenceWindowDays: 90,
  eligibleActivities: Object.freeze(["Lesson", "Practice"]),
});

export function evaluateObjectiveEvidence({
  attemptCount = 0,
  correctCount = 0,
  distinctQuestionCount = 0,
  verificationStatus = "needs_teacher_review",
} = {}) {
  const attempts = Math.max(0, Number(attemptCount) || 0);
  const correct = Math.min(attempts, Math.max(0, Number(correctCount) || 0));
  const distinctQuestions = Math.max(0, Number(distinctQuestionCount) || 0);
  const accuracyRatio = attempts ? correct / attempts : null;
  const accuracy = accuracyRatio === null ? null : Math.round(accuracyRatio * 100);
  const hasEnoughEvidence = attempts >= MASTERY_POLICY.minimumAttempts
    && distinctQuestions >= MASTERY_POLICY.minimumDistinctQuestions;
  const curriculumVerified = verificationStatus === "teacher-approved";

  let status = "insufficient_evidence";
  if (!curriculumVerified) status = "curriculum_needs_review";
  else if (hasEnoughEvidence && accuracyRatio >= MASTERY_POLICY.masteryAccuracy) status = "mastered";
  else if (hasEnoughEvidence && accuracyRatio < MASTERY_POLICY.supportAccuracy) status = "support_candidate";
  else if (hasEnoughEvidence) status = "developing";

  return {
    attemptCount: attempts,
    correctCount: correct,
    distinctQuestionCount: distinctQuestions,
    accuracy,
    hasEnoughEvidence,
    curriculumStatus: verificationStatus,
    evidenceStatus: status,
    isMastered: status === "mastered",
    canInformAdaptivePath: curriculumVerified && hasEnoughEvidence,
    recommendedDifficulty: status === "support_candidate" ? 1
      : status === "developing" ? 2
        : status === "mastered" ? 3 : null,
  };
}

export function evaluateLessonMastery(objectives = []) {
  const coreObjectives = objectives.filter((objective) => objective.scope === "core");
  const masteredObjectives = coreObjectives.filter((objective) => objective.progress?.isMastered);
  const needsSupportObjectives = coreObjectives.filter((objective) => objective.progress?.evidenceStatus === "support_candidate");
  const hasCompleteEvidence = coreObjectives.length > 0
    && coreObjectives.every((objective) => objective.progress?.canInformAdaptivePath);

  return {
    isMastered: hasCompleteEvidence && masteredObjectives.length === coreObjectives.length,
    hasCoreObjectives: coreObjectives.length > 0,
    coreObjectiveCount: coreObjectives.length,
    masteredObjectiveCount: masteredObjectives.length,
    needsSupportObjectives,
    hasCompleteEvidence,
  };
}

export function selectFocusObjective(objectives = []) {
  const candidates = objectives.filter((objective) => {
    const progress = objective.progress;
    return objective.scope === "core"
      && progress?.canInformAdaptivePath
      && ["support_candidate", "developing"].includes(progress.evidenceStatus);
  });
  candidates.sort((left, right) => {
    const supportPriority = (objective) => objective.progress.evidenceStatus === "support_candidate" ? 0 : 1;
    return supportPriority(left) - supportPriority(right)
      || (left.progress.accuracy ?? 100) - (right.progress.accuracy ?? 100)
      || left.code.localeCompare(right.code);
  });
  const focus = candidates[0];
  return focus ? {
    code: focus.code,
    outcome: focus.outcome,
    status: focus.progress.evidenceStatus,
  } : null;
}

export function applyPrerequisiteGates(objectives = [], prerequisiteRows = []) {
  const progressByCode = new Map(objectives.map((objective) => [objective.objectiveCode, objective]));
  const prerequisitesByCode = new Map();
  const baseMasteryByCode = new Map(objectives.map((objective) => [objective.objectiveCode, Boolean(objective.isMastered)]));
  const baseEligibilityByCode = new Map(objectives.map((objective) => [objective.objectiveCode, Boolean(objective.canInformAdaptivePath)]));
  const masteryByCode = new Map(baseMasteryByCode);
  for (const row of prerequisiteRows) {
    if (!prerequisitesByCode.has(row.objectiveCode)) prerequisitesByCode.set(row.objectiveCode, []);
    prerequisitesByCode.get(row.objectiveCode).push(row.prerequisiteCode);
  }

  const visitState = new Map();
  const visitStack = [];
  const cyclicObjectives = new Set();
  const visit = (objectiveCode) => {
    const state = visitState.get(objectiveCode) || 0;
    if (state === 2) return;
    if (state === 1) {
      const cycleStart = visitStack.indexOf(objectiveCode);
      for (const code of visitStack.slice(cycleStart)) cyclicObjectives.add(code);
      return;
    }
    visitState.set(objectiveCode, 1);
    visitStack.push(objectiveCode);
    for (const prerequisiteCode of prerequisitesByCode.get(objectiveCode) || []) {
      if (progressByCode.has(prerequisiteCode)) visit(prerequisiteCode);
    }
    visitStack.pop();
    visitState.set(objectiveCode, 2);
  };
  for (const objectiveCode of progressByCode.keys()) visit(objectiveCode);

  // Iterate until prerequisite chains settle; curriculum objectives form a DAG.
  for (const objectiveCode of cyclicObjectives) masteryByCode.set(objectiveCode, false);
  for (let pass = 0; pass <= progressByCode.size; pass += 1) {
    let changed = false;
    for (const objective of progressByCode.values()) {
      const requiredCodes = prerequisitesByCode.get(objective.objectiveCode) || [];
      const prerequisitesMet = requiredCodes.every((code) => masteryByCode.get(code) === true);
      const nextMastery = !cyclicObjectives.has(objective.objectiveCode)
        && baseMasteryByCode.get(objective.objectiveCode) === true && prerequisitesMet;
      if (masteryByCode.get(objective.objectiveCode) !== nextMastery) changed = true;
      masteryByCode.set(objective.objectiveCode, nextMastery);
    }
    if (!changed) break;
  }

  for (const objective of progressByCode.values()) {
    const requiredCodes = prerequisitesByCode.get(objective.objectiveCode) || [];
    const blockers = requiredCodes.filter((code) => masteryByCode.get(code) !== true);
    objective.prerequisitesMet = blockers.length === 0;
    objective.blockingPrerequisites = blockers;
    objective.isMastered = masteryByCode.get(objective.objectiveCode) === true;
    objective.canInformAdaptivePath = baseEligibilityByCode.get(objective.objectiveCode) === true
      && objective.prerequisitesMet;
    if (baseMasteryByCode.get(objective.objectiveCode) && !objective.isMastered) {
      objective.evidenceStatus = "prerequisite_not_mastered";
    }
  }
  return objectives;
}
