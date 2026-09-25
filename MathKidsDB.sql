/*
    MathKids - SQL Server MVP schema
    Run this file in SQL Server Management Studio.
    The script is intentionally limited to the MVP learning loop.
*/

IF DB_ID(N'MathKids') IS NULL
    CREATE DATABASE [MathKids];
GO

USE [MathKids];
GO

IF NOT EXISTS (SELECT 1 FROM sys.schemas WHERE name = N'mk')
    EXEC(N'CREATE SCHEMA [mk]');
GO

/* ---------- Identity and profiles ---------- */
CREATE TABLE [mk].[AppUser]
(
    UserId          INT IDENTITY(1,1) NOT NULL,
    Email           NVARCHAR(255) NOT NULL,
    PasswordHash    NVARCHAR(500) NOT NULL,
    DisplayName     NVARCHAR(120) NOT NULL,
    UserRole        VARCHAR(20) NOT NULL CONSTRAINT DF_AppUser_UserRole DEFAULT ('Student'),
    IsActive        BIT NOT NULL CONSTRAINT DF_AppUser_IsActive DEFAULT (1),
    CreatedAt       DATETIME2(0) NOT NULL CONSTRAINT DF_AppUser_CreatedAt DEFAULT (SYSUTCDATETIME()),
    UpdatedAt       DATETIME2(0) NOT NULL CONSTRAINT DF_AppUser_UpdatedAt DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT PK_AppUser PRIMARY KEY (UserId),
    CONSTRAINT UQ_AppUser_Email UNIQUE (Email),
    CONSTRAINT CK_AppUser_Role CHECK (UserRole IN ('Student','Parent','Teacher','Admin'))
);
GO

CREATE TABLE [mk].[Student]
(
    StudentId       INT NOT NULL,
    DateOfBirth     DATE NULL,
    Grade           TINYINT NOT NULL,
    AvatarUrl       NVARCHAR(500) NULL,
    TotalXp         INT NOT NULL CONSTRAINT DF_Student_TotalXp DEFAULT (0),
    TotalStars      INT NOT NULL CONSTRAINT DF_Student_TotalStars DEFAULT (0),
    CreatedAt       DATETIME2(0) NOT NULL CONSTRAINT DF_Student_CreatedAt DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT PK_Student PRIMARY KEY (StudentId),
    CONSTRAINT FK_Student_User FOREIGN KEY (StudentId) REFERENCES [mk].[AppUser](UserId),
    CONSTRAINT CK_Student_Grade CHECK (Grade BETWEEN 1 AND 5),
    CONSTRAINT CK_Student_Xp CHECK (TotalXp >= 0),
    CONSTRAINT CK_Student_Stars CHECK (TotalStars >= 0)
);
GO

CREATE TABLE [mk].[ParentStudent]
(
    ParentId        INT NOT NULL,
    StudentId       INT NOT NULL,
    Relationship    NVARCHAR(30) NULL,
    IsPrimary        BIT NOT NULL CONSTRAINT DF_ParentStudent_IsPrimary DEFAULT (0),
    CreatedAt       DATETIME2(0) NOT NULL CONSTRAINT DF_ParentStudent_CreatedAt DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT PK_ParentStudent PRIMARY KEY (ParentId, StudentId),
    CONSTRAINT FK_ParentStudent_Parent FOREIGN KEY (ParentId) REFERENCES [mk].[AppUser](UserId),
    CONSTRAINT FK_ParentStudent_Student FOREIGN KEY (StudentId) REFERENCES [mk].[Student](StudentId),
    CONSTRAINT CK_ParentStudent_DifferentUsers CHECK (ParentId <> StudentId)
);
GO

/* ---------- Curriculum ---------- */
CREATE TABLE [mk].[Topic]
(
    TopicId         INT IDENTITY(1,1) NOT NULL,
    ParentTopicId   INT NULL,
    TopicCode       VARCHAR(50) NOT NULL,
    TopicName       NVARCHAR(150) NOT NULL,
    Description     NVARCHAR(1000) NULL,
    CONSTRAINT PK_Topic PRIMARY KEY (TopicId),
    CONSTRAINT UQ_Topic_Code UNIQUE (TopicCode),
    CONSTRAINT FK_Topic_Parent FOREIGN KEY (ParentTopicId) REFERENCES [mk].[Topic](TopicId)
);
GO

CREATE TABLE [mk].[Lesson]
(
    LessonId        INT IDENTITY(1,1) NOT NULL,
    TopicId         INT NOT NULL,
    Grade           TINYINT NOT NULL,
    Difficulty      TINYINT NOT NULL,
    Title           NVARCHAR(200) NOT NULL,
    Content         NVARCHAR(MAX) NOT NULL,
    EstimatedMinutes SMALLINT NOT NULL CONSTRAINT DF_Lesson_EstimatedMinutes DEFAULT (10),
    IsPublished      BIT NOT NULL CONSTRAINT DF_Lesson_IsPublished DEFAULT (0),
    CreatedAt        DATETIME2(0) NOT NULL CONSTRAINT DF_Lesson_CreatedAt DEFAULT (SYSUTCDATETIME()),
    UpdatedAt        DATETIME2(0) NOT NULL CONSTRAINT DF_Lesson_UpdatedAt DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT PK_Lesson PRIMARY KEY (LessonId),
    CONSTRAINT FK_Lesson_Topic FOREIGN KEY (TopicId) REFERENCES [mk].[Topic](TopicId),
    CONSTRAINT CK_Lesson_Grade CHECK (Grade BETWEEN 1 AND 5),
    CONSTRAINT CK_Lesson_Difficulty CHECK (Difficulty BETWEEN 1 AND 5),
    CONSTRAINT CK_Lesson_Minutes CHECK (EstimatedMinutes > 0)
);
GO

CREATE TABLE [mk].[Question]
(
    QuestionId      INT IDENTITY(1,1) NOT NULL,
    TopicId         INT NOT NULL,
    Grade           TINYINT NOT NULL,
    Difficulty      TINYINT NOT NULL,
    QuestionType    VARCHAR(30) NOT NULL,
    Prompt          NVARCHAR(MAX) NOT NULL,
    Explanation     NVARCHAR(MAX) NULL,
    AnswerData      NVARCHAR(MAX) NOT NULL,
    OptionsData     NVARCHAR(MAX) NULL,
    IsActive        BIT NOT NULL CONSTRAINT DF_Question_IsActive DEFAULT (1),
    CreatedAt       DATETIME2(0) NOT NULL CONSTRAINT DF_Question_CreatedAt DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT PK_Question PRIMARY KEY (QuestionId),
    CONSTRAINT FK_Question_Topic FOREIGN KEY (TopicId) REFERENCES [mk].[Topic](TopicId),
    CONSTRAINT CK_Question_Grade CHECK (Grade BETWEEN 1 AND 5),
    CONSTRAINT CK_Question_Difficulty CHECK (Difficulty BETWEEN 1 AND 5),
    CONSTRAINT CK_Question_Type CHECK (QuestionType IN ('MultipleChoice','ShortAnswer','TrueFalse','Matching')),
    CONSTRAINT CK_Question_AnswerJson CHECK (ISJSON(AnswerData) = 1),
    CONSTRAINT CK_Question_OptionsJson CHECK (OptionsData IS NULL OR ISJSON(OptionsData) = 1)
);
GO

CREATE TABLE [mk].[LessonQuestion]
(
    LessonId        INT NOT NULL,
    QuestionId      INT NOT NULL,
    QuestionOrder   SMALLINT NOT NULL,
    Points          DECIMAL(6,2) NOT NULL CONSTRAINT DF_LessonQuestion_Points DEFAULT (1),
    CONSTRAINT PK_LessonQuestion PRIMARY KEY (LessonId, QuestionId),
    CONSTRAINT UQ_LessonQuestion_Order UNIQUE (LessonId, QuestionOrder),
    CONSTRAINT FK_LessonQuestion_Lesson FOREIGN KEY (LessonId) REFERENCES [mk].[Lesson](LessonId),
    CONSTRAINT FK_LessonQuestion_Question FOREIGN KEY (QuestionId) REFERENCES [mk].[Question](QuestionId),
    CONSTRAINT CK_LessonQuestion_Order CHECK (QuestionOrder > 0),
    CONSTRAINT CK_LessonQuestion_Points CHECK (Points > 0)
);
GO

/* ---------- Placement tests and learning path ---------- */
CREATE TABLE [mk].[PlacementTest]
(
    PlacementTestId INT IDENTITY(1,1) NOT NULL,
    Title           NVARCHAR(200) NOT NULL,
    Grade           TINYINT NOT NULL,
    VersionNo       INT NOT NULL CONSTRAINT DF_PlacementTest_Version DEFAULT (1),
    IsActive        BIT NOT NULL CONSTRAINT DF_PlacementTest_IsActive DEFAULT (1),
    CreatedAt       DATETIME2(0) NOT NULL CONSTRAINT DF_PlacementTest_CreatedAt DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT PK_PlacementTest PRIMARY KEY (PlacementTestId),
    CONSTRAINT CK_PlacementTest_Grade CHECK (Grade BETWEEN 1 AND 5),
    CONSTRAINT CK_PlacementTest_Version CHECK (VersionNo > 0)
);
GO

CREATE TABLE [mk].[PlacementTestQuestion]
(
    PlacementTestId INT NOT NULL,
    QuestionId      INT NOT NULL,
    QuestionOrder   SMALLINT NOT NULL,
    CONSTRAINT PK_PlacementTestQuestion PRIMARY KEY (PlacementTestId, QuestionId),
    CONSTRAINT UQ_PlacementTestQuestion_Order UNIQUE (PlacementTestId, QuestionOrder),
    CONSTRAINT FK_PlacementTestQuestion_Test FOREIGN KEY (PlacementTestId) REFERENCES [mk].[PlacementTest](PlacementTestId),
    CONSTRAINT FK_PlacementTestQuestion_Question FOREIGN KEY (QuestionId) REFERENCES [mk].[Question](QuestionId)
);
GO

CREATE TABLE [mk].[PlacementAttempt]
(
    AttemptId       BIGINT IDENTITY(1,1) NOT NULL,
    PlacementTestId INT NOT NULL,
    StudentId       INT NOT NULL,
    StartedAt       DATETIME2(0) NOT NULL CONSTRAINT DF_PlacementAttempt_StartedAt DEFAULT (SYSUTCDATETIME()),
    SubmittedAt     DATETIME2(0) NULL,
    Score           DECIMAL(6,2) NULL,
    AbilitySummary  NVARCHAR(MAX) NULL,
    CONSTRAINT PK_PlacementAttempt PRIMARY KEY (AttemptId),
    CONSTRAINT FK_PlacementAttempt_Test FOREIGN KEY (PlacementTestId) REFERENCES [mk].[PlacementTest](PlacementTestId),
    CONSTRAINT FK_PlacementAttempt_Student FOREIGN KEY (StudentId) REFERENCES [mk].[Student](StudentId),
    CONSTRAINT CK_PlacementAttempt_Score CHECK (Score IS NULL OR Score BETWEEN 0 AND 100),
    CONSTRAINT CK_PlacementAttempt_Dates CHECK (SubmittedAt IS NULL OR SubmittedAt >= StartedAt),
    CONSTRAINT CK_PlacementAttempt_SummaryJson CHECK (AbilitySummary IS NULL OR ISJSON(AbilitySummary) = 1)
);
GO

CREATE TABLE [mk].[PlacementAnswer]
(
    AttemptId       BIGINT NOT NULL,
    QuestionId      INT NOT NULL,
    AnswerData      NVARCHAR(MAX) NOT NULL,
    IsCorrect       BIT NULL,
    AnsweredAt      DATETIME2(0) NOT NULL CONSTRAINT DF_PlacementAnswer_AnsweredAt DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT PK_PlacementAnswer PRIMARY KEY (AttemptId, QuestionId),
    CONSTRAINT FK_PlacementAnswer_Attempt FOREIGN KEY (AttemptId) REFERENCES [mk].[PlacementAttempt](AttemptId),
    CONSTRAINT FK_PlacementAnswer_Question FOREIGN KEY (QuestionId) REFERENCES [mk].[Question](QuestionId),
    CONSTRAINT CK_PlacementAnswer_Json CHECK (ISJSON(AnswerData) = 1)
);
GO

CREATE TABLE [mk].[LearningPath]
(
    LearningPathId  BIGINT IDENTITY(1,1) NOT NULL,
    StudentId       INT NOT NULL,
    GeneratedBy     VARCHAR(20) NOT NULL CONSTRAINT DF_LearningPath_GeneratedBy DEFAULT ('System'),
    StartDate       DATE NOT NULL,
    EndDate         DATE NULL,
    Status          VARCHAR(20) NOT NULL CONSTRAINT DF_LearningPath_Status DEFAULT ('Active'),
    Reason          NVARCHAR(1000) NULL,
    CreatedAt       DATETIME2(0) NOT NULL CONSTRAINT DF_LearningPath_CreatedAt DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT PK_LearningPath PRIMARY KEY (LearningPathId),
    CONSTRAINT FK_LearningPath_Student FOREIGN KEY (StudentId) REFERENCES [mk].[Student](StudentId),
    CONSTRAINT CK_LearningPath_GeneratedBy CHECK (GeneratedBy IN ('System','AI','ChatGPT','Gemini','Fallback','Teacher','Parent')),
    CONSTRAINT CK_LearningPath_Status CHECK (Status IN ('Draft','Active','Completed','Archived')),
    CONSTRAINT CK_LearningPath_Dates CHECK (EndDate IS NULL OR EndDate >= StartDate)
);
GO

CREATE TABLE [mk].[LearningPathItem]
(
    LearningPathItemId BIGINT IDENTITY(1,1) NOT NULL,
    LearningPathId     BIGINT NOT NULL,
    LessonId           INT NULL,
    TopicId            INT NULL,
    PlannedDate        DATE NOT NULL,
    ItemOrder          SMALLINT NOT NULL,
    Status             VARCHAR(20) NOT NULL CONSTRAINT DF_LearningPathItem_Status DEFAULT ('Pending'),
    CompletedAt        DATETIME2(0) NULL,
    CONSTRAINT PK_LearningPathItem PRIMARY KEY (LearningPathItemId),
    CONSTRAINT FK_LearningPathItem_Path FOREIGN KEY (LearningPathId) REFERENCES [mk].[LearningPath](LearningPathId),
    CONSTRAINT FK_LearningPathItem_Lesson FOREIGN KEY (LessonId) REFERENCES [mk].[Lesson](LessonId),
    CONSTRAINT FK_LearningPathItem_Topic FOREIGN KEY (TopicId) REFERENCES [mk].[Topic](TopicId),
    CONSTRAINT CK_LearningPathItem_Target CHECK (LessonId IS NOT NULL OR TopicId IS NOT NULL),
    CONSTRAINT CK_LearningPathItem_Status CHECK (Status IN ('Pending','InProgress','Completed','Skipped'))
);
GO

/* ---------- Learning activity ---------- */
CREATE TABLE [mk].[LessonAttempt]
(
    LessonAttemptId BIGINT IDENTITY(1,1) NOT NULL,
    StudentId       INT NOT NULL,
    LessonId        INT NOT NULL,
    StartedAt       DATETIME2(0) NOT NULL CONSTRAINT DF_LessonAttempt_StartedAt DEFAULT (SYSUTCDATETIME()),
    SubmittedAt     DATETIME2(0) NULL,
    DurationSeconds INT NULL,
    Score           DECIMAL(6,2) NULL,
    CorrectCount    INT NULL,
    TotalCount      INT NULL,
    Status          VARCHAR(20) NOT NULL CONSTRAINT DF_LessonAttempt_Status DEFAULT ('InProgress'),
    CONSTRAINT PK_LessonAttempt PRIMARY KEY (LessonAttemptId),
    CONSTRAINT FK_LessonAttempt_Student FOREIGN KEY (StudentId) REFERENCES [mk].[Student](StudentId),
    CONSTRAINT FK_LessonAttempt_Lesson FOREIGN KEY (LessonId) REFERENCES [mk].[Lesson](LessonId),
    CONSTRAINT CK_LessonAttempt_Status CHECK (Status IN ('InProgress','Completed','Abandoned')),
    CONSTRAINT CK_LessonAttempt_Score CHECK (Score IS NULL OR Score BETWEEN 0 AND 100),
    CONSTRAINT CK_LessonAttempt_Counts CHECK (CorrectCount IS NULL OR (CorrectCount >= 0 AND TotalCount >= CorrectCount)),
    CONSTRAINT CK_LessonAttempt_Duration CHECK (DurationSeconds IS NULL OR DurationSeconds >= 0)
);
GO

CREATE TABLE [mk].[LessonAnswer]
(
    LessonAttemptId BIGINT NOT NULL,
    QuestionId      INT NOT NULL,
    AnswerData      NVARCHAR(MAX) NOT NULL,
    IsCorrect       BIT NULL,
    PointsEarned    DECIMAL(6,2) NULL,
    AnsweredAt      DATETIME2(0) NOT NULL CONSTRAINT DF_LessonAnswer_AnsweredAt DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT PK_LessonAnswer PRIMARY KEY (LessonAttemptId, QuestionId),
    CONSTRAINT FK_LessonAnswer_Attempt FOREIGN KEY (LessonAttemptId) REFERENCES [mk].[LessonAttempt](LessonAttemptId),
    CONSTRAINT FK_LessonAnswer_Question FOREIGN KEY (QuestionId) REFERENCES [mk].[Question](QuestionId),
    CONSTRAINT CK_LessonAnswer_Json CHECK (ISJSON(AnswerData) = 1),
    CONSTRAINT CK_LessonAnswer_Points CHECK (PointsEarned IS NULL OR PointsEarned >= 0)
);
GO

CREATE TABLE [mk].[StudentTopicProgress]
(
    StudentId       INT NOT NULL,
    TopicId         INT NOT NULL,
    CurrentLevel    TINYINT NOT NULL CONSTRAINT DF_StudentTopicProgress_Level DEFAULT (1),
    CorrectCount    INT NOT NULL CONSTRAINT DF_StudentTopicProgress_Correct DEFAULT (0),
    IncorrectCount  INT NOT NULL CONSTRAINT DF_StudentTopicProgress_Incorrect DEFAULT (0),
    MasteryScore    DECIMAL(6,2) NOT NULL CONSTRAINT DF_StudentTopicProgress_Mastery DEFAULT (0),
    LastStudiedAt   DATETIME2(0) NULL,
    UpdatedAt       DATETIME2(0) NOT NULL CONSTRAINT DF_StudentTopicProgress_UpdatedAt DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT PK_StudentTopicProgress PRIMARY KEY (StudentId, TopicId),
    CONSTRAINT FK_StudentTopicProgress_Student FOREIGN KEY (StudentId) REFERENCES [mk].[Student](StudentId),
    CONSTRAINT FK_StudentTopicProgress_Topic FOREIGN KEY (TopicId) REFERENCES [mk].[Topic](TopicId),
    CONSTRAINT CK_StudentTopicProgress_Level CHECK (CurrentLevel BETWEEN 1 AND 5),
    CONSTRAINT CK_StudentTopicProgress_Counts CHECK (CorrectCount >= 0 AND IncorrectCount >= 0),
    CONSTRAINT CK_StudentTopicProgress_Mastery CHECK (MasteryScore BETWEEN 0 AND 100)
);
GO

CREATE TABLE [mk].[StudySession]
(
    StudySessionId  BIGINT IDENTITY(1,1) NOT NULL,
    StudentId       INT NOT NULL,
    StartedAt       DATETIME2(0) NOT NULL CONSTRAINT DF_StudySession_StartedAt DEFAULT (SYSUTCDATETIME()),
    EndedAt         DATETIME2(0) NULL,
    DurationSeconds INT NULL,
    ActivityType    VARCHAR(20) NOT NULL,
    CONSTRAINT PK_StudySession PRIMARY KEY (StudySessionId),
    CONSTRAINT FK_StudySession_Student FOREIGN KEY (StudentId) REFERENCES [mk].[Student](StudentId),
    CONSTRAINT CK_StudySession_Type CHECK (ActivityType IN ('Lesson','Exercise','Game','PlacementTest','Review')),
    CONSTRAINT CK_StudySession_Dates CHECK (EndedAt IS NULL OR EndedAt >= StartedAt),
    CONSTRAINT CK_StudySession_Duration CHECK (DurationSeconds IS NULL OR DurationSeconds >= 0)
);
GO

/* ---------- Games, rewards and notifications ---------- */
CREATE TABLE [mk].[Game]
(
    GameId          INT IDENTITY(1,1) NOT NULL,
    GameCode        VARCHAR(50) NOT NULL,
    GameName        NVARCHAR(150) NOT NULL,
    Description     NVARCHAR(1000) NULL,
    IsPublished     BIT NOT NULL CONSTRAINT DF_Game_IsPublished DEFAULT (0),
    CONSTRAINT PK_Game PRIMARY KEY (GameId),
    CONSTRAINT UQ_Game_Code UNIQUE (GameCode)
);
GO

CREATE TABLE [mk].[GameAttempt]
(
    GameAttemptId   BIGINT IDENTITY(1,1) NOT NULL,
    GameId          INT NOT NULL,
    StudentId       INT NOT NULL,
    StartedAt       DATETIME2(0) NOT NULL CONSTRAINT DF_GameAttempt_StartedAt DEFAULT (SYSUTCDATETIME()),
    CompletedAt     DATETIME2(0) NULL,
    Score           DECIMAL(8,2) NULL,
    XpEarned        INT NOT NULL CONSTRAINT DF_GameAttempt_Xp DEFAULT (0),
    StarsEarned     TINYINT NOT NULL CONSTRAINT DF_GameAttempt_Stars DEFAULT (0),
    ResultData      NVARCHAR(MAX) NULL,
    CONSTRAINT PK_GameAttempt PRIMARY KEY (GameAttemptId),
    CONSTRAINT FK_GameAttempt_Game FOREIGN KEY (GameId) REFERENCES [mk].[Game](GameId),
    CONSTRAINT FK_GameAttempt_Student FOREIGN KEY (StudentId) REFERENCES [mk].[Student](StudentId),
    CONSTRAINT CK_GameAttempt_Xp CHECK (XpEarned >= 0),
    CONSTRAINT CK_GameAttempt_Stars CHECK (StarsEarned BETWEEN 0 AND 3),
    CONSTRAINT CK_GameAttempt_ResultJson CHECK (ResultData IS NULL OR ISJSON(ResultData) = 1)
);
GO

CREATE TABLE [mk].[Badge]
(
    BadgeId         INT IDENTITY(1,1) NOT NULL,
    BadgeCode       VARCHAR(50) NOT NULL,
    BadgeName       NVARCHAR(150) NOT NULL,
    Description     NVARCHAR(500) NULL,
    IconUrl         NVARCHAR(500) NULL,
    RequirementData NVARCHAR(MAX) NULL,
    IsActive        BIT NOT NULL CONSTRAINT DF_Badge_IsActive DEFAULT (1),
    CONSTRAINT PK_Badge PRIMARY KEY (BadgeId),
    CONSTRAINT UQ_Badge_Code UNIQUE (BadgeCode),
    CONSTRAINT CK_Badge_RequirementJson CHECK (RequirementData IS NULL OR ISJSON(RequirementData) = 1)
);
GO

CREATE TABLE [mk].[StudentBadge]
(
    StudentId       INT NOT NULL,
    BadgeId         INT NOT NULL,
    AwardedAt       DATETIME2(0) NOT NULL CONSTRAINT DF_StudentBadge_AwardedAt DEFAULT (SYSUTCDATETIME()),
    AwardReason     NVARCHAR(500) NULL,
    CONSTRAINT PK_StudentBadge PRIMARY KEY (StudentId, BadgeId),
    CONSTRAINT FK_StudentBadge_Student FOREIGN KEY (StudentId) REFERENCES [mk].[Student](StudentId),
    CONSTRAINT FK_StudentBadge_Badge FOREIGN KEY (BadgeId) REFERENCES [mk].[Badge](BadgeId)
);
GO

CREATE TABLE [mk].[Notification]
(
    NotificationId  BIGINT IDENTITY(1,1) NOT NULL,
    UserId          INT NOT NULL,
    NotificationType VARCHAR(30) NOT NULL,
    Title           NVARCHAR(200) NOT NULL,
    Message         NVARCHAR(2000) NOT NULL,
    RelatedStudentId INT NULL,
    IsRead          BIT NOT NULL CONSTRAINT DF_Notification_IsRead DEFAULT (0),
    CreatedAt       DATETIME2(0) NOT NULL CONSTRAINT DF_Notification_CreatedAt DEFAULT (SYSUTCDATETIME()),
    ReadAt          DATETIME2(0) NULL,
    CONSTRAINT PK_Notification PRIMARY KEY (NotificationId),
    CONSTRAINT FK_Notification_User FOREIGN KEY (UserId) REFERENCES [mk].[AppUser](UserId),
    CONSTRAINT FK_Notification_Student FOREIGN KEY (RelatedStudentId) REFERENCES [mk].[Student](StudentId),
    CONSTRAINT CK_Notification_Type CHECK (NotificationType IN ('LearningAlert','Recommendation','System','Achievement'))
);
GO

/* ---------- Optional premium module ---------- */
CREATE TABLE [mk].[SubscriptionPlan]
(
    PlanId          INT IDENTITY(1,1) NOT NULL,
    PlanCode        VARCHAR(30) NOT NULL,
    PlanName        NVARCHAR(100) NOT NULL,
    BillingCycle    VARCHAR(10) NOT NULL,
    Price           DECIMAL(12,2) NOT NULL,
    CurrencyCode    CHAR(3) NOT NULL CONSTRAINT DF_SubscriptionPlan_Currency DEFAULT ('VND'),
    IsActive        BIT NOT NULL CONSTRAINT DF_SubscriptionPlan_IsActive DEFAULT (1),
    CONSTRAINT PK_SubscriptionPlan PRIMARY KEY (PlanId),
    CONSTRAINT UQ_SubscriptionPlan_Code UNIQUE (PlanCode),
    CONSTRAINT CK_SubscriptionPlan_Cycle CHECK (BillingCycle IN ('Monthly','Yearly')),
    CONSTRAINT CK_SubscriptionPlan_Price CHECK (Price >= 0)
);
GO

CREATE TABLE [mk].[Subscription]
(
    SubscriptionId BIGINT IDENTITY(1,1) NOT NULL,
    UserId         INT NOT NULL,
    PlanId         INT NOT NULL,
    Status         VARCHAR(20) NOT NULL CONSTRAINT DF_Subscription_Status DEFAULT ('Active'),
    StartsAt       DATETIME2(0) NOT NULL,
    EndsAt         DATETIME2(0) NULL,
    PaymentProvider VARCHAR(30) NULL,
    ExternalReference NVARCHAR(200) NULL,
    CreatedAt      DATETIME2(0) NOT NULL CONSTRAINT DF_Subscription_CreatedAt DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT PK_Subscription PRIMARY KEY (SubscriptionId),
    CONSTRAINT FK_Subscription_User FOREIGN KEY (UserId) REFERENCES [mk].[AppUser](UserId),
    CONSTRAINT FK_Subscription_Plan FOREIGN KEY (PlanId) REFERENCES [mk].[SubscriptionPlan](PlanId),
    CONSTRAINT CK_Subscription_Status CHECK (Status IN ('Pending','Active','Expired','Cancelled')),
    CONSTRAINT CK_Subscription_Dates CHECK (EndsAt IS NULL OR EndsAt >= StartsAt)
);
GO

/* ---------- Indexes ---------- */
CREATE INDEX IX_Student_Grade ON [mk].[Student](Grade);
CREATE INDEX IX_Lesson_Topic_Grade_Difficulty ON [mk].[Lesson](TopicId, Grade, Difficulty) INCLUDE (Title, IsPublished);
CREATE INDEX IX_Question_Topic_Grade_Difficulty ON [mk].[Question](TopicId, Grade, Difficulty) INCLUDE (QuestionType, IsActive);
CREATE INDEX IX_PlacementAttempt_Student_SubmittedAt ON [mk].[PlacementAttempt](StudentId, SubmittedAt DESC);
CREATE INDEX IX_LearningPath_Student_Status ON [mk].[LearningPath](StudentId, Status, StartDate DESC);
CREATE INDEX IX_LearningPathItem_Path_Date ON [mk].[LearningPathItem](LearningPathId, PlannedDate, Status);
CREATE INDEX IX_LessonAttempt_Student_SubmittedAt ON [mk].[LessonAttempt](StudentId, SubmittedAt DESC);
CREATE INDEX IX_GameAttempt_Student_CompletedAt ON [mk].[GameAttempt](StudentId, CompletedAt DESC);
CREATE INDEX IX_Notification_User_Read_Created ON [mk].[Notification](UserId, IsRead, CreatedAt DESC);
CREATE INDEX IX_Subscription_User_Status ON [mk].[Subscription](UserId, Status, EndsAt);
GO

/* ---------- Reporting views ---------- */
CREATE OR ALTER VIEW [mk].[vw_StudentProgress]
AS
WITH LessonStats AS
(
    SELECT StudentId,
           COUNT_BIG(CASE WHEN Status = 'Completed' THEN 1 END) AS CompletedLessons,
           COALESCE(SUM(CASE WHEN Status = 'Completed' THEN CorrectCount ELSE 0 END), 0) AS CorrectAnswers,
           COALESCE(SUM(CASE WHEN Status = 'Completed' THEN TotalCount ELSE 0 END), 0) AS AnsweredQuestions
    FROM [mk].[LessonAttempt]
    GROUP BY StudentId
),
GameStats AS
(
    SELECT StudentId,
           COUNT_BIG(CASE WHEN CompletedAt IS NOT NULL THEN 1 END) AS CompletedGames
    FROM [mk].[GameAttempt]
    GROUP BY StudentId
),
StudyStats AS
(
    SELECT StudentId, COALESCE(SUM(DurationSeconds), 0) AS StudySeconds
    FROM [mk].[StudySession]
    GROUP BY StudentId
)
SELECT
    s.StudentId,
    u.DisplayName,
    s.Grade,
    COALESCE(ls.CompletedLessons, 0) AS CompletedLessons,
    COALESCE(gs.CompletedGames, 0) AS CompletedGames,
    COALESCE(sts.StudySeconds, 0) AS StudySeconds,
    COALESCE(ls.CorrectAnswers, 0) AS CorrectAnswers,
    COALESCE(ls.AnsweredQuestions, 0) AS AnsweredQuestions,
    s.TotalXp,
    s.TotalStars
FROM [mk].[Student] s
JOIN [mk].[AppUser] u ON u.UserId = s.StudentId
LEFT JOIN LessonStats ls ON ls.StudentId = s.StudentId
LEFT JOIN GameStats gs ON gs.StudentId = s.StudentId
LEFT JOIN StudyStats sts ON sts.StudentId = s.StudentId;
GO

CREATE OR ALTER VIEW [mk].[vw_ParentChildSummary]
AS
SELECT
    ps.ParentId,
    pu.DisplayName AS ParentName,
    ps.StudentId,
    su.DisplayName AS StudentName,
    p.Grade,
    p.CompletedLessons,
    p.CompletedGames,
    p.StudySeconds,
    p.CorrectAnswers,
    p.AnsweredQuestions,
    CAST(CASE WHEN p.AnsweredQuestions = 0 THEN 0
              ELSE 100.0 * p.CorrectAnswers / p.AnsweredQuestions END AS DECIMAL(6,2)) AS AccuracyPercent,
    p.TotalXp,
    p.TotalStars
FROM [mk].[ParentStudent] ps
JOIN [mk].[AppUser] pu ON pu.UserId = ps.ParentId
JOIN [mk].[AppUser] su ON su.UserId = ps.StudentId
JOIN [mk].[Student] st ON st.StudentId = ps.StudentId
JOIN [mk].[vw_StudentProgress] p ON p.StudentId = ps.StudentId;
GO

/* Seed the standard MathKids knowledge groups. */
IF NOT EXISTS (SELECT 1 FROM [mk].[Topic] WHERE TopicCode = 'ARITHMETIC_ADD_SUB')
    INSERT INTO [mk].[Topic] (TopicCode, TopicName, Description) VALUES
    ('ARITHMETIC_ADD_SUB', N'Cộng và trừ', N'Các dạng bài cộng, trừ trong chương trình tiểu học'),
    ('ARITHMETIC_MUL_DIV', N'Nhân và chia', N'Bảng nhân, bảng chia và bài toán vận dụng'),
    ('GEOMETRY', N'Hình học', N'Nhận biết hình, chu vi và diện tích'),
    ('MEASUREMENT', N'Đo lường', N'Độ dài, khối lượng, thời gian và tiền'),
    ('WORD_PROBLEM', N'Bài toán có lời văn', N'Đọc hiểu và giải bài toán thực tế');
GO

/* Verify the objects after execution. */
SELECT s.name AS SchemaName, t.name AS TableName
FROM sys.tables t
JOIN sys.schemas s ON s.schema_id = t.schema_id
WHERE s.name = N'mk'
ORDER BY t.name;
GO
