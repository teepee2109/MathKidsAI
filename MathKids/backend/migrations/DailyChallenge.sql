-- Idempotent migration for persisted daily challenge attempts and rewards.
IF OBJECT_ID(N'[mk].[DailyChallengeAttempt]', N'U') IS NULL
BEGIN
  CREATE TABLE [mk].[DailyChallengeAttempt] (
    StudentId INT NOT NULL,
    ChallengeDate DATE NOT NULL,
    Grade TINYINT NOT NULL,
    AttemptsCount SMALLINT NOT NULL CONSTRAINT DF_DailyChallengeAttempt_Attempts DEFAULT (0),
    LastAnswer NVARCHAR(50) NULL,
    IsCompleted BIT NOT NULL CONSTRAINT DF_DailyChallengeAttempt_Completed DEFAULT (0),
    RewardXp INT NOT NULL CONSTRAINT DF_DailyChallengeAttempt_RewardXp DEFAULT (0),
    RewardStars INT NOT NULL CONSTRAINT DF_DailyChallengeAttempt_RewardStars DEFAULT (0),
    CompletedAt DATETIME2 NULL,
    CONSTRAINT PK_DailyChallengeAttempt PRIMARY KEY (StudentId, ChallengeDate),
    CONSTRAINT FK_DailyChallengeAttempt_Student FOREIGN KEY (StudentId) REFERENCES [mk].[Student](StudentId)
  );
END;
