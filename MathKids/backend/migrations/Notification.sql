-- MathKids in-app notifications migration. Safe to run more than once.

IF OBJECT_ID(N'[mk].[Notification]', N'U') IS NULL
BEGIN
  CREATE TABLE [mk].[Notification] (
    NotificationId   BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Notification PRIMARY KEY,
    UserId           INT NOT NULL,
    NotificationType VARCHAR(30) NOT NULL,
    Title            NVARCHAR(200) NOT NULL,
    Message          NVARCHAR(2000) NOT NULL,
    RelatedStudentId INT NULL,
    IsRead           BIT NOT NULL CONSTRAINT DF_Notification_IsRead DEFAULT (0),
    CreatedAt        DATETIME2(0) NOT NULL CONSTRAINT DF_Notification_CreatedAt DEFAULT (SYSUTCDATETIME()),
    ReadAt           DATETIME2(0) NULL,
    CONSTRAINT FK_Notification_User FOREIGN KEY (UserId) REFERENCES [mk].[AppUser](UserId),
    CONSTRAINT FK_Notification_Student FOREIGN KEY (RelatedStudentId) REFERENCES [mk].[Student](StudentId),
    CONSTRAINT CK_Notification_Type CHECK (NotificationType IN ('LearningAlert','Recommendation','System','Achievement'))
  );
END;

-- In-app link opened when the notification is clicked (e.g. /phan-thuong).
IF COL_LENGTH(N'[mk].[Notification]', N'LinkUrl') IS NULL
  ALTER TABLE [mk].[Notification] ADD LinkUrl NVARCHAR(300) NULL;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Notification_User_Read_Created' AND object_id = OBJECT_ID(N'[mk].[Notification]'))
  CREATE INDEX IX_Notification_User_Read_Created ON [mk].[Notification](UserId, IsRead, CreatedAt DESC);
