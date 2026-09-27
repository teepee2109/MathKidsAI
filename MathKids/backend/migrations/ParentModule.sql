-- MathKids Parent Module migration. Safe to run more than once.

-- Extend UserRole check to allow 'Parent'
IF EXISTS (
  SELECT 1 FROM sys.check_constraints
  WHERE parent_object_id = OBJECT_ID(N'[mk].[AppUser]')
    AND name = N'CK_AppUser_UserRole'
    AND definition NOT LIKE N'%Parent%'
)
BEGIN
  ALTER TABLE [mk].[AppUser] DROP CONSTRAINT [CK_AppUser_UserRole];
  ALTER TABLE [mk].[AppUser] ADD CONSTRAINT [CK_AppUser_UserRole]
    CHECK (UserRole IN ('Student', 'Parent', 'Admin'));
END;

-- Parent-Student link table
IF OBJECT_ID(N'[mk].[ParentStudentLink]', N'U') IS NULL
BEGIN
  CREATE TABLE [mk].[ParentStudentLink] (
    LinkId       INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_ParentStudentLink PRIMARY KEY,
    ParentUserId INT NOT NULL,
    StudentId    INT NOT NULL,
    LinkedAt     DATETIME2 NOT NULL CONSTRAINT DF_ParentStudentLink_LinkedAt DEFAULT (SYSUTCDATETIME()),
    IsActive     BIT NOT NULL CONSTRAINT DF_ParentStudentLink_IsActive DEFAULT (1),
    CONSTRAINT UQ_ParentStudentLink UNIQUE (ParentUserId, StudentId),
    CONSTRAINT FK_ParentStudentLink_Parent  FOREIGN KEY (ParentUserId) REFERENCES [mk].[AppUser](UserId),
    CONSTRAINT FK_ParentStudentLink_Student FOREIGN KEY (StudentId)    REFERENCES [mk].[Student](StudentId)
  );
  CREATE INDEX IX_ParentStudentLink_Parent  ON [mk].[ParentStudentLink](ParentUserId);
  CREATE INDEX IX_ParentStudentLink_Student ON [mk].[ParentStudentLink](StudentId);
END;

-- Child invite code table
IF OBJECT_ID(N'[mk].[ChildLinkInvite]', N'U') IS NULL
BEGIN
  CREATE TABLE [mk].[ChildLinkInvite] (
    InviteId   INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_ChildLinkInvite PRIMARY KEY,
    StudentId  INT NOT NULL,
    InviteCode VARCHAR(10) NOT NULL CONSTRAINT UQ_ChildLinkInvite_Code UNIQUE,
    CreatedAt  DATETIME2 NOT NULL CONSTRAINT DF_ChildLinkInvite_CreatedAt DEFAULT (SYSUTCDATETIME()),
    ExpiresAt  DATETIME2 NOT NULL,
    IsUsed     BIT NOT NULL CONSTRAINT DF_ChildLinkInvite_Used DEFAULT (0),
    CONSTRAINT FK_ChildLinkInvite_Student FOREIGN KEY (StudentId) REFERENCES [mk].[Student](StudentId)
  );
  CREATE INDEX IX_ChildLinkInvite_Student ON [mk].[ChildLinkInvite](StudentId);
END;

-- Learning alert table
IF OBJECT_ID(N'[mk].[LearningAlert]', N'U') IS NULL
BEGIN
  CREATE TABLE [mk].[LearningAlert] (
    AlertId   BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_LearningAlert PRIMARY KEY,
    StudentId INT NOT NULL,
    AlertType VARCHAR(30) NOT NULL,
    AlertData NVARCHAR(MAX) NULL,
    IsRead    BIT NOT NULL CONSTRAINT DF_LearningAlert_IsRead DEFAULT (0),
    CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_LearningAlert_CreatedAt DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT FK_LearningAlert_Student FOREIGN KEY (StudentId) REFERENCES [mk].[Student](StudentId),
    CONSTRAINT CK_LearningAlert_Type CHECK (AlertType IN ('INACTIVE', 'WEAK_TOPIC', 'NEEDS_REVIEW')),
    CONSTRAINT CK_LearningAlert_Data CHECK (AlertData IS NULL OR ISJSON(AlertData) = 1)
  );
  CREATE INDEX IX_LearningAlert_Student_Created ON [mk].[LearningAlert](StudentId, CreatedAt DESC);
END;
