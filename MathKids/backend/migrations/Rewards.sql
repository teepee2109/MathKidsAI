-- Idempotent inventory migration. Stars are debited from Student.TotalStars on purchase.
IF OBJECT_ID(N'[mk].[StudentRewardInventory]', N'U') IS NULL
BEGIN
  CREATE TABLE [mk].[StudentRewardInventory] (
    StudentId INT NOT NULL,
    RewardCode NVARCHAR(40) NOT NULL,
    PurchasedAt DATETIME2 NOT NULL CONSTRAINT DF_StudentRewardInventory_PurchasedAt DEFAULT (SYSUTCDATETIME()),
    IsEquipped BIT NOT NULL CONSTRAINT DF_StudentRewardInventory_IsEquipped DEFAULT (0),
    CONSTRAINT PK_StudentRewardInventory PRIMARY KEY (StudentId, RewardCode),
    CONSTRAINT FK_StudentRewardInventory_Student FOREIGN KEY (StudentId) REFERENCES [mk].[Student](StudentId)
  );
END;

-- One assessment reward per student per local Vietnam calendar day.
IF OBJECT_ID(N'[mk].[StudentRewardClaim]', N'U') IS NULL
BEGIN
  CREATE TABLE [mk].[StudentRewardClaim] (
    StudentId INT NOT NULL,
    ClaimDate DATE NOT NULL,
    ActivityCode NVARCHAR(30) NOT NULL,
    SourceId BIGINT NULL,
    RewardXp INT NOT NULL,
    RewardStars INT NOT NULL,
    ClaimedAt DATETIME2 NOT NULL CONSTRAINT DF_StudentRewardClaim_ClaimedAt DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT PK_StudentRewardClaim PRIMARY KEY (StudentId, ClaimDate, ActivityCode),
    CONSTRAINT FK_StudentRewardClaim_Student FOREIGN KEY (StudentId) REFERENCES [mk].[Student](StudentId)
  );
END;
