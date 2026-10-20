-- Normalized curriculum objectives, lesson content blocks, and mapping tables.
-- Additive and safe to run repeatedly; legacy Lessons and Questions stay intact.

IF OBJECT_ID(N'[mk].[CurriculumObjective]', N'U') IS NULL
BEGIN
  CREATE TABLE [mk].[CurriculumObjective] (
    ObjectiveCode VARCHAR(80) NOT NULL CONSTRAINT PK_CurriculumObjective PRIMARY KEY,
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
    VerificationStatus VARCHAR(30) NOT NULL,
    UpdatedAt DATETIME2 NOT NULL CONSTRAINT DF_CurriculumObjective_UpdatedAt DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT FK_CurriculumObjective_Grade FOREIGN KEY (GradeId) REFERENCES [mk].[Grades](GradeId),
    CONSTRAINT FK_CurriculumObjective_Topic FOREIGN KEY (TopicId) REFERENCES [mk].[Topics](TopicId),
    CONSTRAINT CK_CurriculumObjective_Scope CHECK (Scope IN ('core','extension','needs-review')),
    CONSTRAINT CK_CurriculumObjective_AppMapping CHECK (AppMapping IN ('mapped','partial','missing'))
  );
  CREATE INDEX IX_CurriculumObjective_Grade_Topic ON [mk].[CurriculumObjective](GradeId, TopicCode, Sequence);
END;

IF OBJECT_ID(N'[mk].[CurriculumObjectivePrerequisite]', N'U') IS NULL
BEGIN
  CREATE TABLE [mk].[CurriculumObjectivePrerequisite] (
    ObjectiveCode VARCHAR(80) NOT NULL,
    PrerequisiteCode VARCHAR(80) NOT NULL,
    CONSTRAINT PK_CurriculumObjectivePrerequisite PRIMARY KEY (ObjectiveCode, PrerequisiteCode),
    CONSTRAINT FK_CurriculumObjectivePrerequisite_Objective FOREIGN KEY (ObjectiveCode) REFERENCES [mk].[CurriculumObjective](ObjectiveCode),
    CONSTRAINT FK_CurriculumObjectivePrerequisite_Prerequisite FOREIGN KEY (PrerequisiteCode) REFERENCES [mk].[CurriculumObjective](ObjectiveCode),
    CONSTRAINT CK_CurriculumObjectivePrerequisite_NoSelf CHECK (ObjectiveCode <> PrerequisiteCode)
  );
END;

IF OBJECT_ID(N'[mk].[LessonContentBlock]', N'U') IS NULL
BEGIN
  CREATE TABLE [mk].[LessonContentBlock] (
    LessonId INT NOT NULL,
    BlockType VARCHAR(30) NOT NULL,
    BlockOrder SMALLINT NOT NULL,
    Title NVARCHAR(150) NOT NULL,
    ContentJson NVARCHAR(MAX) NOT NULL,
    ContentSchemaVersion TINYINT NOT NULL CONSTRAINT DF_LessonContentBlock_SchemaVersion DEFAULT (1),
    UpdatedAt DATETIME2 NOT NULL CONSTRAINT DF_LessonContentBlock_UpdatedAt DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT PK_LessonContentBlock PRIMARY KEY (LessonId, BlockType, BlockOrder),
    CONSTRAINT FK_LessonContentBlock_Lesson FOREIGN KEY (LessonId) REFERENCES [mk].[Lessons](LessonId),
    CONSTRAINT CK_LessonContentBlock_Type CHECK (BlockType IN ('introduction','theory','worked_example')),
    CONSTRAINT CK_LessonContentBlock_Json CHECK (ISJSON(ContentJson) = 1)
  );
END;

IF OBJECT_ID(N'[mk].[LessonObjective]', N'U') IS NULL
BEGIN
  CREATE TABLE [mk].[LessonObjective] (
    LessonId INT NOT NULL,
    ObjectiveCode VARCHAR(80) NOT NULL,
    MappingSource VARCHAR(20) NOT NULL CONSTRAINT DF_LessonObjective_MappingSource DEFAULT ('topic'),
    CONSTRAINT PK_LessonObjective PRIMARY KEY (LessonId, ObjectiveCode),
    CONSTRAINT FK_LessonObjective_Lesson FOREIGN KEY (LessonId) REFERENCES [mk].[Lessons](LessonId),
    CONSTRAINT FK_LessonObjective_Objective FOREIGN KEY (ObjectiveCode) REFERENCES [mk].[CurriculumObjective](ObjectiveCode),
    CONSTRAINT CK_LessonObjective_MappingSource CHECK (MappingSource IN ('topic','curated'))
  );
END;

-- Question mappings require a curator to record why the question measures the
-- objective. No broad topic-based auto-tagging is done because that would
-- overstate what individual questions actually assess.
IF OBJECT_ID(N'[mk].[QuestionLearningObjective]', N'U') IS NULL
BEGIN
  CREATE TABLE [mk].[QuestionLearningObjective] (
    QuestionId INT NOT NULL,
    ObjectiveCode VARCHAR(80) NOT NULL,
    EvidenceNote NVARCHAR(500) NOT NULL,
    IsPrimary BIT NOT NULL CONSTRAINT DF_QuestionLearningObjective_IsPrimary DEFAULT (0),
    MappingStatus VARCHAR(20) NOT NULL CONSTRAINT DF_QuestionLearningObjective_MappingStatus DEFAULT ('needs-review'),
    CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_QuestionLearningObjective_CreatedAt DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT PK_QuestionLearningObjective PRIMARY KEY (QuestionId, ObjectiveCode),
    CONSTRAINT FK_QuestionLearningObjective_Question FOREIGN KEY (QuestionId) REFERENCES [mk].[Questions](QuestionId),
    CONSTRAINT FK_QuestionLearningObjective_Objective FOREIGN KEY (ObjectiveCode) REFERENCES [mk].[CurriculumObjective](ObjectiveCode),
    CONSTRAINT CK_QuestionLearningObjective_MappingStatus CHECK (MappingStatus IN ('needs-review','approved'))
  );
  CREATE INDEX IX_QuestionLearningObjective_Objective ON [mk].[QuestionLearningObjective](ObjectiveCode, MappingStatus, QuestionId);
END;

IF OBJECT_ID(N'[mk].[CurriculumReviewAudit]', N'U') IS NULL
BEGIN
  CREATE TABLE [mk].[CurriculumReviewAudit] (
    ReviewAuditId BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_CurriculumReviewAudit PRIMARY KEY,
    ReviewerUserId INT NOT NULL,
    TargetType VARCHAR(20) NOT NULL,
    ObjectiveCode VARCHAR(80) NOT NULL,
    QuestionId INT NULL,
    PreviousStatus VARCHAR(30) NOT NULL,
    NewStatus VARCHAR(30) NOT NULL,
    Note NVARCHAR(500) NULL,
    CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_CurriculumReviewAudit_CreatedAt DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT FK_CurriculumReviewAudit_Reviewer FOREIGN KEY (ReviewerUserId) REFERENCES [mk].[AppUser](UserId),
    CONSTRAINT FK_CurriculumReviewAudit_Objective FOREIGN KEY (ObjectiveCode) REFERENCES [mk].[CurriculumObjective](ObjectiveCode),
    CONSTRAINT FK_CurriculumReviewAudit_QuestionObjective FOREIGN KEY (QuestionId, ObjectiveCode) REFERENCES [mk].[QuestionLearningObjective](QuestionId, ObjectiveCode),
    CONSTRAINT CK_CurriculumReviewAudit_TargetType CHECK (TargetType IN ('objective','question-mapping'))
  );
  CREATE INDEX IX_CurriculumReviewAudit_Target_CreatedAt ON [mk].[CurriculumReviewAudit](TargetType, ObjectiveCode, CreatedAt DESC);
END;

IF COL_LENGTH(N'mk.QuestionLearningObjective', N'MappingStatus') IS NULL
BEGIN
  ALTER TABLE [mk].[QuestionLearningObjective]
    ADD MappingStatus VARCHAR(20) NOT NULL CONSTRAINT DF_QuestionLearningObjective_MappingStatus DEFAULT ('needs-review');
END;

IF NOT EXISTS (
  SELECT 1 FROM sys.check_constraints
  WHERE parent_object_id = OBJECT_ID(N'[mk].[QuestionLearningObjective]')
    AND name = N'CK_QuestionLearningObjective_MappingStatus'
)
  ALTER TABLE [mk].[QuestionLearningObjective]
    ADD CONSTRAINT CK_QuestionLearningObjective_MappingStatus CHECK (MappingStatus IN ('needs-review','approved'));

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE object_id = OBJECT_ID(N'[mk].[QuestionLearningObjective]')
    AND name = N'IX_QuestionLearningObjective_Objective'
)
  CREATE INDEX IX_QuestionLearningObjective_Objective
    ON [mk].[QuestionLearningObjective](ObjectiveCode, MappingStatus, QuestionId);

-- Preserve the current lesson fields as the source of truth while making them
-- available as typed, versioned blocks to newer clients and learning services.
;WITH SourceBlocks AS (
  SELECT l.LessonId, CAST('introduction' AS VARCHAR(30)) AS BlockType, CAST(1 AS SMALLINT) AS BlockOrder,
         CAST(N'Mục tiêu và tình huống' AS NVARCHAR(150)) AS Title,
         CAST(N'{"text":"' + STRING_ESCAPE(l.Introduction, 'json') + N'"}' AS NVARCHAR(MAX)) AS ContentJson
  FROM [mk].[Lessons] l WHERE l.IsActive = 1
  UNION ALL
  SELECT l.LessonId, 'theory', 1, N'Kiến thức cần hiểu',
         CAST(N'{"text":"' + STRING_ESCAPE(l.KeyConcept, 'json') + N'"}' AS NVARCHAR(MAX))
  FROM [mk].[Lessons] l WHERE l.IsActive = 1
  UNION ALL
  SELECT l.LessonId, 'worked_example', 1, N'Ví dụ có hướng dẫn',
         CAST(N'{"text":"' + STRING_ESCAPE(l.WorkedExample, 'json') + N'"}' AS NVARCHAR(MAX))
  FROM [mk].[Lessons] l WHERE l.IsActive = 1
)
UPDATE target
SET target.Title = source.Title,
    target.ContentJson = source.ContentJson,
    target.ContentSchemaVersion = 1,
    target.UpdatedAt = SYSUTCDATETIME()
FROM [mk].[LessonContentBlock] target
INNER JOIN SourceBlocks source
  ON source.LessonId = target.LessonId AND source.BlockType = target.BlockType AND source.BlockOrder = target.BlockOrder;

;WITH SourceBlocks AS (
  SELECT l.LessonId, CAST('introduction' AS VARCHAR(30)) AS BlockType, CAST(1 AS SMALLINT) AS BlockOrder,
         CAST(N'Mục tiêu và tình huống' AS NVARCHAR(150)) AS Title,
         CAST(N'{"text":"' + STRING_ESCAPE(l.Introduction, 'json') + N'"}' AS NVARCHAR(MAX)) AS ContentJson
  FROM [mk].[Lessons] l WHERE l.IsActive = 1
  UNION ALL
  SELECT l.LessonId, 'theory', 1, N'Kiến thức cần hiểu',
         CAST(N'{"text":"' + STRING_ESCAPE(l.KeyConcept, 'json') + N'"}' AS NVARCHAR(MAX))
  FROM [mk].[Lessons] l WHERE l.IsActive = 1
  UNION ALL
  SELECT l.LessonId, 'worked_example', 1, N'Ví dụ có hướng dẫn',
         CAST(N'{"text":"' + STRING_ESCAPE(l.WorkedExample, 'json') + N'"}' AS NVARCHAR(MAX))
  FROM [mk].[Lessons] l WHERE l.IsActive = 1
)
INSERT INTO [mk].[LessonContentBlock] (LessonId, BlockType, BlockOrder, Title, ContentJson)
SELECT source.LessonId, source.BlockType, source.BlockOrder, source.Title, source.ContentJson
FROM SourceBlocks source
WHERE NOT EXISTS (
  SELECT 1 FROM [mk].[LessonContentBlock] target
  WHERE target.LessonId = source.LessonId AND target.BlockType = source.BlockType AND target.BlockOrder = source.BlockOrder
);
