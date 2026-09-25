-- One monthly test per student/month. The assigned questions are immutable
-- after start; answers and scores are written only when the student submits.
IF OBJECT_ID(N'[mk].[MonthlyAssessmentAttempt]', N'U') IS NULL
BEGIN
  CREATE TABLE [mk].[MonthlyAssessmentAttempt] (
    AttemptId BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_MonthlyAssessmentAttempt PRIMARY KEY,
    StudentId INT NOT NULL,
    TestMonth CHAR(7) NOT NULL,
    Grade TINYINT NOT NULL,
    StartedAt DATETIME2 NOT NULL CONSTRAINT DF_MonthlyAssessmentAttempt_StartedAt DEFAULT (SYSUTCDATETIME()),
    SubmittedAt DATETIME2 NULL,
    Score TINYINT NULL,
    CorrectCount TINYINT NULL,
    TotalCount TINYINT NOT NULL CONSTRAINT DF_MonthlyAssessmentAttempt_TotalCount DEFAULT (10),
    RewardXp SMALLINT NOT NULL CONSTRAINT DF_MonthlyAssessmentAttempt_RewardXp DEFAULT (0),
    RewardStars TINYINT NOT NULL CONSTRAINT DF_MonthlyAssessmentAttempt_RewardStars DEFAULT (0),
    ResultSummary NVARCHAR(MAX) NULL,
    CONSTRAINT UQ_MonthlyAssessmentAttempt_Student_Month UNIQUE (StudentId, TestMonth),
    CONSTRAINT FK_MonthlyAssessmentAttempt_Student FOREIGN KEY (StudentId) REFERENCES [mk].[Student](StudentId),
    CONSTRAINT CK_MonthlyAssessmentAttempt_Month CHECK (TestMonth LIKE '[0-9][0-9][0-9][0-9]-0[1-9]' OR TestMonth LIKE '[0-9][0-9][0-9][0-9]-1[0-2]'),
    CONSTRAINT CK_MonthlyAssessmentAttempt_Grade CHECK (Grade BETWEEN 1 AND 5),
    CONSTRAINT CK_MonthlyAssessmentAttempt_Score CHECK (Score IS NULL OR Score BETWEEN 0 AND 100),
    CONSTRAINT CK_MonthlyAssessmentAttempt_Count CHECK (CorrectCount IS NULL OR CorrectCount <= TotalCount),
    CONSTRAINT CK_MonthlyAssessmentAttempt_Summary CHECK (ResultSummary IS NULL OR ISJSON(ResultSummary) = 1)
  );
END;

IF OBJECT_ID(N'[mk].[MonthlyAssessmentQuestion]', N'U') IS NULL
BEGIN
  CREATE TABLE [mk].[MonthlyAssessmentQuestion] (
    AttemptId BIGINT NOT NULL,
    QuestionId INT NOT NULL,
    QuestionOrder SMALLINT NOT NULL,
    Answer CHAR(1) NULL,
    IsCorrect BIT NULL,
    CONSTRAINT PK_MonthlyAssessmentQuestion PRIMARY KEY (AttemptId, QuestionId),
    CONSTRAINT UQ_MonthlyAssessmentQuestion_Order UNIQUE (AttemptId, QuestionOrder),
    CONSTRAINT FK_MonthlyAssessmentQuestion_Attempt FOREIGN KEY (AttemptId) REFERENCES [mk].[MonthlyAssessmentAttempt](AttemptId),
    CONSTRAINT FK_MonthlyAssessmentQuestion_Question FOREIGN KEY (QuestionId) REFERENCES [mk].[Questions](QuestionId),
    CONSTRAINT CK_MonthlyAssessmentQuestion_Order CHECK (QuestionOrder BETWEEN 1 AND 10),
    CONSTRAINT CK_MonthlyAssessmentQuestion_Answer CHECK (Answer IS NULL OR Answer IN ('A','B','C','D'))
  );
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'[mk].[MonthlyAssessmentAttempt]') AND name = N'IX_MonthlyAssessmentAttempt_Student_Submitted')
  CREATE INDEX IX_MonthlyAssessmentAttempt_Student_Submitted ON [mk].[MonthlyAssessmentAttempt](StudentId, SubmittedAt DESC);
