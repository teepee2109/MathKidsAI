import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { supplementalQuestionMappings, supplementalQuestions, supplementalTopics } from "./curriculum-question-bank.v1.js";

const catalogPath = fileURLToPath(new URL("./curriculum-objectives.v1.json", import.meta.url));
const questionMappingPath = fileURLToPath(new URL("./question-objective-mapping.v1.json", import.meta.url));

export async function syncSupplementalQuestionBank(pool, sql) {
  const topicRows = supplementalTopics.map(({ grade, topicCode, name, lesson }) => ({
    grade, topicCode, name, ...lesson,
  }));
  const questionRows = supplementalQuestions.map((item) => ({
    grade: item.grade,
    topicCode: item.topicCode,
    questionText: item.questionText,
    optionA: item.options[0],
    optionB: item.options[1],
    optionC: item.options[2],
    optionD: item.options[3],
    correctAnswer: "ABCD"[item.correctIndex],
    difficulty: item.difficulty,
    explanation: item.explanation,
  }));

  return pool.request()
    .input("topicsJson", sql.NVarChar(sql.MAX), JSON.stringify(topicRows))
    .input("questionsJson", sql.NVarChar(sql.MAX), JSON.stringify(questionRows))
    .query(`
      DECLARE @Topics TABLE (
        GradeId TINYINT NOT NULL,
        TopicCode VARCHAR(50) NOT NULL,
        Name NVARCHAR(100) NOT NULL,
        Title NVARCHAR(150) NOT NULL,
        Introduction NVARCHAR(1000) NOT NULL,
        KeyConcept NVARCHAR(1500) NOT NULL,
        WorkedExample NVARCHAR(1000) NOT NULL,
        SortOrder SMALLINT NOT NULL
      );
      INSERT INTO @Topics
      SELECT GradeId, TopicCode, Name, Title, Introduction, KeyConcept, WorkedExample, SortOrder
      FROM OPENJSON(@topicsJson) WITH (
        GradeId TINYINT '$.grade',
        TopicCode VARCHAR(50) '$.topicCode',
        Name NVARCHAR(100) '$.name',
        Title NVARCHAR(150) '$.title',
        Introduction NVARCHAR(1000) '$.introduction',
        KeyConcept NVARCHAR(1500) '$.keyConcept',
        WorkedExample NVARCHAR(1000) '$.workedExample',
        SortOrder SMALLINT '$.sortOrder'
      );

      INSERT INTO [mk].[Topics] (GradeId, TopicCode, Name)
      SELECT source.GradeId, source.TopicCode, source.Name
      FROM @Topics source
      WHERE NOT EXISTS (
        SELECT 1 FROM [mk].[Topics] existing
        WHERE existing.GradeId = source.GradeId AND existing.TopicCode = source.TopicCode
      );

      INSERT INTO [mk].[Lessons] (TopicId, Title, Introduction, KeyConcept, WorkedExample, SortOrder)
      SELECT topic.TopicId, source.Title, source.Introduction, source.KeyConcept, source.WorkedExample, source.SortOrder
      FROM @Topics source
      INNER JOIN [mk].[Topics] topic ON topic.GradeId = source.GradeId AND topic.TopicCode = source.TopicCode
      WHERE NOT EXISTS (SELECT 1 FROM [mk].[Lessons] lesson WHERE lesson.TopicId = topic.TopicId);

      DECLARE @Questions TABLE (
        GradeId TINYINT NOT NULL,
        TopicCode VARCHAR(50) NOT NULL,
        QuestionText NVARCHAR(1000) NOT NULL,
        OptionA NVARCHAR(300) NOT NULL,
        OptionB NVARCHAR(300) NOT NULL,
        OptionC NVARCHAR(300) NOT NULL,
        OptionD NVARCHAR(300) NOT NULL,
        CorrectAnswer CHAR(1) NOT NULL,
        Difficulty TINYINT NOT NULL,
        Explanation NVARCHAR(1000) NOT NULL
      );
      INSERT INTO @Questions
      SELECT GradeId, TopicCode, QuestionText, OptionA, OptionB, OptionC, OptionD,
             CorrectAnswer, Difficulty, Explanation
      FROM OPENJSON(@questionsJson) WITH (
        GradeId TINYINT '$.grade',
        TopicCode VARCHAR(50) '$.topicCode',
        QuestionText NVARCHAR(1000) '$.questionText',
        OptionA NVARCHAR(300) '$.optionA',
        OptionB NVARCHAR(300) '$.optionB',
        OptionC NVARCHAR(300) '$.optionC',
        OptionD NVARCHAR(300) '$.optionD',
        CorrectAnswer CHAR(1) '$.correctAnswer',
        Difficulty TINYINT '$.difficulty',
        Explanation NVARCHAR(1000) '$.explanation'
      );

      INSERT INTO [mk].[Questions] (
        TopicId, QuestionText, OptionA, OptionB, OptionC, OptionD, CorrectAnswer, Difficulty, Explanation
      )
      SELECT topic.TopicId, source.QuestionText, source.OptionA, source.OptionB, source.OptionC,
             source.OptionD, source.CorrectAnswer, source.Difficulty, source.Explanation
      FROM @Questions source
      INNER JOIN [mk].[Topics] topic ON topic.GradeId = source.GradeId AND topic.TopicCode = source.TopicCode
      WHERE NOT EXISTS (
        SELECT 1 FROM [mk].[Questions] existing
        WHERE existing.TopicId = topic.TopicId
          AND DATALENGTH(existing.QuestionText) = DATALENGTH(source.QuestionText)
          AND existing.QuestionText COLLATE Latin1_General_100_BIN2 = source.QuestionText COLLATE Latin1_General_100_BIN2
      );

      SELECT
        (SELECT COUNT(*) FROM @Topics) AS TopicCount,
        (SELECT COUNT(*) FROM @Questions) AS QuestionCount;
    `);
}

function flattenCatalog(catalog) {
  const objectives = [];
  const prerequisites = [];

  for (const grade of catalog.grades || []) {
    for (const topic of grade.topics || []) {
      for (const objective of topic.objectives || []) {
        objectives.push({
          code: objective.code,
          grade: grade.grade,
          topicCode: topic.topicCode,
          topicTitle: topic.title,
          strandCode: topic.strandCode,
          sequence: topic.sequence,
          scope: topic.scope,
          appMapping: topic.appMapping,
          outcome: objective.outcome,
          sourceSection: topic.sourceSection,
          verificationStatus: catalog.framework?.verificationStatus || "needs_teacher_review",
        });
        for (const prerequisiteCode of objective.prerequisites || []) {
          prerequisites.push({ objectiveCode: objective.code, prerequisiteCode });
        }
      }
    }
  }

  return { objectives, prerequisites };
}

export async function syncCurriculumCatalog(pool, sql) {
  const catalog = JSON.parse(await readFile(catalogPath, "utf8"));
  const { objectives, prerequisites } = flattenCatalog(catalog);
  if (!objectives.length) throw new Error("Curriculum catalog contains no objectives.");

  const result = await pool.request()
    .input("objectivesJson", sql.NVarChar(sql.MAX), JSON.stringify(objectives))
    .input("prerequisitesJson", sql.NVarChar(sql.MAX), JSON.stringify(prerequisites))
    .query(`
      DECLARE @Objectives TABLE (
        ObjectiveCode VARCHAR(80) NOT NULL PRIMARY KEY,
        GradeId TINYINT NOT NULL,
        TopicCode VARCHAR(50) NULL,
        TopicId INT NULL,
        TopicTitle NVARCHAR(150) NOT NULL,
        StrandCode VARCHAR(50) NOT NULL,
        Sequence SMALLINT NOT NULL,
        Scope VARCHAR(20) NOT NULL,
        AppMapping VARCHAR(20) NOT NULL,
        Outcome NVARCHAR(1000) NOT NULL,
        SourceSection NVARCHAR(250) NOT NULL,
        VerificationStatus VARCHAR(30) NOT NULL
      );

      INSERT INTO @Objectives
      SELECT source.ObjectiveCode, source.GradeId, source.TopicCode, topic.TopicId,
             source.TopicTitle, source.StrandCode, source.Sequence, source.Scope,
             source.AppMapping, source.Outcome, source.SourceSection, source.VerificationStatus
      FROM OPENJSON(@objectivesJson) WITH (
        ObjectiveCode VARCHAR(80) '$.code',
        GradeId TINYINT '$.grade',
        TopicCode VARCHAR(50) '$.topicCode',
        TopicTitle NVARCHAR(150) '$.topicTitle',
        StrandCode VARCHAR(50) '$.strandCode',
        Sequence SMALLINT '$.sequence',
        Scope VARCHAR(20) '$.scope',
        AppMapping VARCHAR(20) '$.appMapping',
        Outcome NVARCHAR(1000) '$.outcome',
        SourceSection NVARCHAR(250) '$.sourceSection',
        VerificationStatus VARCHAR(30) '$.verificationStatus'
      ) source
      LEFT JOIN [mk].[Topics] topic
        ON topic.GradeId = source.GradeId AND topic.TopicCode = source.TopicCode;

      IF EXISTS (SELECT 1 FROM @Objectives WHERE AppMapping <> 'missing' AND TopicId IS NULL)
        THROW 51001, 'A curriculum topic marked as mapped is missing from the MathKids topic table.', 1;

      UPDATE target
      SET target.GradeId = source.GradeId,
          target.TopicCode = source.TopicCode,
          target.TopicId = source.TopicId,
          target.TopicTitle = source.TopicTitle,
          target.StrandCode = source.StrandCode,
          target.Sequence = source.Sequence,
          target.Scope = source.Scope,
          target.AppMapping = source.AppMapping,
          target.Outcome = source.Outcome,
          target.SourceSection = source.SourceSection,
          target.VerificationStatus = CASE
            WHEN target.VerificationStatus = 'teacher-approved'
              AND target.GradeId = source.GradeId
              AND ISNULL(target.TopicCode, '') = ISNULL(source.TopicCode, '')
              AND target.TopicTitle = source.TopicTitle
              AND target.StrandCode = source.StrandCode
              AND target.Scope = source.Scope
              AND target.Outcome = source.Outcome
              AND target.SourceSection = source.SourceSection
            THEN target.VerificationStatus
            ELSE source.VerificationStatus
          END,
          target.UpdatedAt = SYSUTCDATETIME()
      FROM [mk].[CurriculumObjective] target
      INNER JOIN @Objectives source ON source.ObjectiveCode = target.ObjectiveCode;

      INSERT INTO [mk].[CurriculumObjective] (
        ObjectiveCode, GradeId, TopicCode, TopicId, TopicTitle, StrandCode, Sequence,
        Scope, AppMapping, Outcome, SourceSection, VerificationStatus
      )
      SELECT source.ObjectiveCode, source.GradeId, source.TopicCode, source.TopicId,
             source.TopicTitle, source.StrandCode, source.Sequence, source.Scope,
             source.AppMapping, source.Outcome, source.SourceSection, source.VerificationStatus
      FROM @Objectives source
      WHERE NOT EXISTS (
        SELECT 1 FROM [mk].[CurriculumObjective] target WITH (UPDLOCK, HOLDLOCK)
        WHERE target.ObjectiveCode = source.ObjectiveCode
      );

      DECLARE @Prerequisites TABLE (
        ObjectiveCode VARCHAR(80) NOT NULL,
        PrerequisiteCode VARCHAR(80) NOT NULL,
        PRIMARY KEY (ObjectiveCode, PrerequisiteCode)
      );
      INSERT INTO @Prerequisites (ObjectiveCode, PrerequisiteCode)
      SELECT ObjectiveCode, PrerequisiteCode
      FROM OPENJSON(@prerequisitesJson) WITH (
        ObjectiveCode VARCHAR(80) '$.objectiveCode',
        PrerequisiteCode VARCHAR(80) '$.prerequisiteCode'
      );

      DELETE existing
      FROM [mk].[CurriculumObjectivePrerequisite] existing
      INNER JOIN @Objectives currentCatalog ON currentCatalog.ObjectiveCode = existing.ObjectiveCode
      WHERE NOT EXISTS (
        SELECT 1 FROM @Prerequisites source
        WHERE source.ObjectiveCode = existing.ObjectiveCode
          AND source.PrerequisiteCode = existing.PrerequisiteCode
      );

      INSERT INTO [mk].[CurriculumObjectivePrerequisite] (ObjectiveCode, PrerequisiteCode)
      SELECT source.ObjectiveCode, source.PrerequisiteCode
      FROM @Prerequisites source
      WHERE NOT EXISTS (
        SELECT 1 FROM [mk].[CurriculumObjectivePrerequisite] target
        WHERE target.ObjectiveCode = source.ObjectiveCode
          AND target.PrerequisiteCode = source.PrerequisiteCode
      );

      INSERT INTO [mk].[LessonObjective] (LessonId, ObjectiveCode, MappingSource)
      SELECT lesson.LessonId, objective.ObjectiveCode, 'topic'
      FROM @Objectives objective
      INNER JOIN [mk].[Lessons] lesson ON lesson.TopicId = objective.TopicId AND lesson.IsActive = 1
      WHERE objective.TopicId IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM [mk].[LessonObjective] existing
          WHERE existing.LessonId = lesson.LessonId AND existing.ObjectiveCode = objective.ObjectiveCode
        );

      SELECT
        (SELECT COUNT(*) FROM @Objectives) AS ObjectiveCount,
        (SELECT COUNT(*) FROM @Prerequisites) AS PrerequisiteCount,
        (SELECT COUNT(*) FROM [mk].[LessonObjective] lo INNER JOIN @Objectives o ON o.ObjectiveCode = lo.ObjectiveCode) AS LinkedLessonObjectiveCount,
        (SELECT COUNT(*) FROM [mk].[QuestionLearningObjective] qo INNER JOIN @Objectives o ON o.ObjectiveCode = qo.ObjectiveCode) AS MappedQuestionCount;
    `);

  const questionMappingCatalog = JSON.parse(await readFile(questionMappingPath, "utf8"));
  if (questionMappingCatalog.schemaVersion !== 1 || questionMappingCatalog.status !== "needs-review") {
    throw new Error("Question-objective mappings must use schema v1 and remain pending teacher review.");
  }
  const questionMappingResult = await pool.request()
    .input("mappingsJson", sql.NVarChar(sql.MAX), JSON.stringify([
      ...(questionMappingCatalog.mappings || []),
      ...supplementalQuestionMappings,
    ]))
    .query(`
      DECLARE @Mappings TABLE (
        GradeId TINYINT NOT NULL,
        TopicCode VARCHAR(50) NOT NULL,
        QuestionText NVARCHAR(1000) NOT NULL,
        ObjectiveCode VARCHAR(80) NOT NULL,
        EvidenceNote NVARCHAR(500) NOT NULL,
        IsPrimary BIT NOT NULL
      );
      INSERT INTO @Mappings (GradeId, TopicCode, QuestionText, ObjectiveCode, EvidenceNote, IsPrimary)
      SELECT GradeId, TopicCode, QuestionText, ObjectiveCode, EvidenceNote, IsPrimary
      FROM OPENJSON(@mappingsJson) WITH (
        GradeId TINYINT '$.grade',
        TopicCode VARCHAR(50) '$.topicCode',
        QuestionText NVARCHAR(1000) '$.questionText',
        ObjectiveCode VARCHAR(80) '$.objectiveCode',
        EvidenceNote NVARCHAR(500) '$.evidenceNote',
        IsPrimary BIT '$.isPrimary'
      );

      DECLARE @Resolved TABLE (
        QuestionId INT NOT NULL,
        ObjectiveCode VARCHAR(80) NOT NULL,
        EvidenceNote NVARCHAR(500) NOT NULL,
        IsPrimary BIT NOT NULL,
        PRIMARY KEY (QuestionId, ObjectiveCode)
      );
      -- Older databases may contain duplicate rows for the same seeded question stem.
      -- A curated mapping is therefore valid when every mapping resolves at least once;
      -- link every exact match rather than failing the entire learning-path sync.
      IF EXISTS (
        SELECT 1
        FROM @Mappings mapping
        WHERE NOT EXISTS (
          SELECT 1
          FROM [mk].[Topics] topic
          INNER JOIN [mk].[Questions] question ON question.TopicId = topic.TopicId
            AND DATALENGTH(question.QuestionText) = DATALENGTH(mapping.QuestionText)
            AND question.QuestionText COLLATE Latin1_General_100_BIN2 = mapping.QuestionText COLLATE Latin1_General_100_BIN2
          INNER JOIN [mk].[CurriculumObjective] objective ON objective.ObjectiveCode = mapping.ObjectiveCode
          WHERE topic.GradeId = mapping.GradeId AND topic.TopicCode = mapping.TopicCode
        )
      )
      BEGIN
        SELECT TOP (10)
          mapping.GradeId,
          mapping.TopicCode,
          mapping.QuestionText,
          mapping.ObjectiveCode,
          CASE
            WHEN NOT EXISTS (
              SELECT 1 FROM [mk].[Topics] topic
              WHERE topic.GradeId = mapping.GradeId AND topic.TopicCode = mapping.TopicCode
            ) THEN 'topic'
            WHEN NOT EXISTS (
              SELECT 1 FROM [mk].[CurriculumObjective] objective
              WHERE objective.ObjectiveCode = mapping.ObjectiveCode
            ) THEN 'objective'
            ELSE 'question'
          END AS MissingType,
          COUNT(*) OVER () AS MissingCount
        FROM @Mappings mapping
        WHERE NOT EXISTS (
          SELECT 1
          FROM [mk].[Topics] topic
          INNER JOIN [mk].[Questions] question ON question.TopicId = topic.TopicId
            AND DATALENGTH(question.QuestionText) = DATALENGTH(mapping.QuestionText)
            AND question.QuestionText COLLATE Latin1_General_100_BIN2 = mapping.QuestionText COLLATE Latin1_General_100_BIN2
          INNER JOIN [mk].[CurriculumObjective] objective ON objective.ObjectiveCode = mapping.ObjectiveCode
          WHERE topic.GradeId = mapping.GradeId AND topic.TopicCode = mapping.TopicCode
        )
        ORDER BY mapping.GradeId, mapping.TopicCode, mapping.QuestionText;
        RETURN;
      END;

      INSERT INTO @Resolved (QuestionId, ObjectiveCode, EvidenceNote, IsPrimary)
      SELECT DISTINCT question.QuestionId, mapping.ObjectiveCode, mapping.EvidenceNote, mapping.IsPrimary
      FROM @Mappings mapping
      INNER JOIN [mk].[Topics] topic ON topic.GradeId = mapping.GradeId AND topic.TopicCode = mapping.TopicCode
      INNER JOIN [mk].[Questions] question ON question.TopicId = topic.TopicId
        AND DATALENGTH(question.QuestionText) = DATALENGTH(mapping.QuestionText)
        AND question.QuestionText COLLATE Latin1_General_100_BIN2 = mapping.QuestionText COLLATE Latin1_General_100_BIN2
      INNER JOIN [mk].[CurriculumObjective] objective ON objective.ObjectiveCode = mapping.ObjectiveCode;

      UPDATE target
      SET target.EvidenceNote = source.EvidenceNote,
          target.IsPrimary = source.IsPrimary
      FROM [mk].[QuestionLearningObjective] target
      INNER JOIN @Resolved source
        ON source.QuestionId = target.QuestionId AND source.ObjectiveCode = target.ObjectiveCode
      WHERE target.MappingStatus = 'needs-review';

      INSERT INTO [mk].[QuestionLearningObjective] (QuestionId, ObjectiveCode, EvidenceNote, IsPrimary, MappingStatus)
      SELECT source.QuestionId, source.ObjectiveCode, source.EvidenceNote, source.IsPrimary, 'needs-review'
      FROM @Resolved source
      WHERE NOT EXISTS (
        SELECT 1 FROM [mk].[QuestionLearningObjective] target
        WHERE target.QuestionId = source.QuestionId AND target.ObjectiveCode = source.ObjectiveCode
      );

      SELECT
        (SELECT COUNT(*) FROM [mk].[QuestionLearningObjective] link WHERE link.MappingStatus = 'needs-review') AS PendingReviewCount,
        (SELECT COUNT(*) FROM [mk].[QuestionLearningObjective] link WHERE link.MappingStatus = 'approved') AS ApprovedCount;
    `);

  const missingMappings = (questionMappingResult.recordset || []).filter((row) => row.MissingType);
  if (missingMappings.length) {
    const missingCount = Number(missingMappings[0].MissingCount || missingMappings.length);
    const examples = missingMappings.slice(0, 5).map((row) =>
      `grade ${row.GradeId}/${row.TopicCode}/${row.ObjectiveCode}: "${row.QuestionText}" (missing ${row.MissingType})`).join("; ");
    throw new Error(`Curriculum mapping data is missing ${missingCount} database record(s). ${examples}`);
  }

  return {
    ...result.recordset[0],
    pendingQuestionMappings: Number(questionMappingResult.recordset[0]?.PendingReviewCount || 0),
    approvedQuestionMappings: Number(questionMappingResult.recordset[0]?.ApprovedCount || 0),
  };
}
