import test from "node:test";
import assert from "node:assert/strict";
import { buildPlacementQuestions, getPlacementSkills, PLACEMENT_QUESTION_COUNT } from "./placementAssessment.js";

test("placement assessment is grade-appropriate, balanced, and has valid choices", () => {
  const expectedSkills = [
    "ARITHMETIC_ADD_SUB",
    "ARITHMETIC_MUL_DIV",
    "GEOMETRY",
    "MEASUREMENT",
    "WORD_PROBLEM",
  ];
  const expectedBands = ["foundation", "application", "reasoning"];

  for (let grade = 1; grade <= 5; grade += 1) {
    assert.equal(getPlacementSkills(grade).length, 5);
    for (let run = 0; run < 25; run += 1) {
      const questions = buildPlacementQuestions(grade);
      assert.equal(questions.length, PLACEMENT_QUESTION_COUNT);

      for (const skillCode of expectedSkills) {
        const skillQuestions = questions.filter((question) => question.skill.code === skillCode);
        assert.equal(skillQuestions.length, 6, `grade ${grade}, ${skillCode}`);
        for (const band of expectedBands) {
          assert.equal(skillQuestions.filter((question) => question.difficultyBand === band).length, 2);
        }
      }

      for (const question of questions) {
        assert.ok(question.prompt.length > 0);
        assert.equal(question.options.length, 4);
        assert.equal(new Set(question.options).size, 4);
        assert.ok(question.options.includes(question.answer));
        assert.ok(question.focusCode);
        const numericAnswer = Number(question.answer.replace(",", "."));
        if (Number.isFinite(numericAnswer)) assert.ok(numericAnswer >= 0, `${question.prompt} => ${question.answer}`);
      }

      for (const band of expectedBands) {
        assert.equal(questions.filter((question) => question.difficultyBand === band).length, 10);
      }
    }
  }
});

test("grade 1 includes visual counting and grade 5 includes decimal, fraction, and percent work", () => {
  const grade1 = buildPlacementQuestions(1);
  assert.ok(grade1.some((question) => question.prompt.includes("🐠")));

  const grade5 = buildPlacementQuestions(5);
  assert.ok(grade5.some((question) => question.prompt.includes(",")));
  assert.ok(grade5.some((question) => question.prompt.includes("%")));
  assert.ok(grade5.some((question) => question.prompt.includes("/")));
});

test("placement assessment refuses grades outside the supported elementary range", () => {
  assert.throws(() => buildPlacementQuestions(0), RangeError);
  assert.throws(() => buildPlacementQuestions(6), RangeError);
});
