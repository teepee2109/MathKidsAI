-- One weekly skills check per student/week, with a fixed question set.
IF OBJECT_ID(N'[mk].[WeeklyAssessmentAttempt]', N'U') IS NULL
BEGIN
  CREATE TABLE [mk].[WeeklyAssessmentAttempt] (
    AttemptId BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_WeeklyAssessmentAttempt PRIMARY KEY,
    StudentId INT NOT NULL,
    WeekStart DATE NOT NULL,
    Grade TINYINT NOT NULL,
    Difficulty TINYINT NOT NULL,
    Score TINYINT NULL,
    CorrectCount TINYINT NULL,
    TotalCount TINYINT NOT NULL CONSTRAINT DF_WeeklyAssessmentAttempt_TotalCount DEFAULT (10),
    StartedAt DATETIME2 NOT NULL CONSTRAINT DF_WeeklyAssessmentAttempt_StartedAt DEFAULT (SYSUTCDATETIME()),
    SubmittedAt DATETIME2 NULL,
    CONSTRAINT UQ_WeeklyAssessmentAttempt_Student_Week UNIQUE (StudentId, WeekStart),
    CONSTRAINT FK_WeeklyAssessmentAttempt_Student FOREIGN KEY (StudentId) REFERENCES [mk].[Student](StudentId),
    CONSTRAINT CK_WeeklyAssessmentAttempt_Grade CHECK (Grade BETWEEN 1 AND 5),
    CONSTRAINT CK_WeeklyAssessmentAttempt_Difficulty CHECK (Difficulty BETWEEN 1 AND 3),
    CONSTRAINT CK_WeeklyAssessmentAttempt_Score CHECK (Score IS NULL OR Score BETWEEN 0 AND 100),
    CONSTRAINT CK_WeeklyAssessmentAttempt_Count CHECK (CorrectCount IS NULL OR CorrectCount <= TotalCount)
  );
  CREATE INDEX IX_WeeklyAssessmentAttempt_Student_Week ON [mk].[WeeklyAssessmentAttempt](StudentId, WeekStart DESC);
END;

IF OBJECT_ID(N'[mk].[WeeklyAssessmentQuestion]', N'U') IS NULL
BEGIN
  CREATE TABLE [mk].[WeeklyAssessmentQuestion] (
    AttemptId BIGINT NOT NULL,
    QuestionId INT NOT NULL,
    QuestionOrder TINYINT NOT NULL,
    Answer CHAR(1) NULL,
    IsCorrect BIT NULL,
    CONSTRAINT PK_WeeklyAssessmentQuestion PRIMARY KEY (AttemptId, QuestionId),
    CONSTRAINT UQ_WeeklyAssessmentQuestion_Order UNIQUE (AttemptId, QuestionOrder),
    CONSTRAINT FK_WeeklyAssessmentQuestion_Attempt FOREIGN KEY (AttemptId) REFERENCES [mk].[WeeklyAssessmentAttempt](AttemptId),
    CONSTRAINT FK_WeeklyAssessmentQuestion_Question FOREIGN KEY (QuestionId) REFERENCES [mk].[Questions](QuestionId),
    CONSTRAINT CK_WeeklyAssessmentQuestion_Order CHECK (QuestionOrder BETWEEN 1 AND 10),
    CONSTRAINT CK_WeeklyAssessmentQuestion_Answer CHECK (Answer IS NULL OR Answer IN ('A','B','C','D'))
  );
END;
