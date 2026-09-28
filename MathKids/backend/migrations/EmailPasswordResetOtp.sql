-- One-time email codes for password reset.
IF OBJECT_ID(N'[mk].[EmailPasswordResetOtp]', N'U') IS NULL
BEGIN
  CREATE TABLE [mk].[EmailPasswordResetOtp] (
    OtpId BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_EmailPasswordResetOtp PRIMARY KEY,
    Email NVARCHAR(255) NOT NULL,
    CodeHash CHAR(64) NOT NULL,
    Attempts TINYINT NOT NULL CONSTRAINT DF_EmailPasswordResetOtp_Attempts DEFAULT (0),
    ExpiresAt DATETIME2 NOT NULL,
    CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_EmailPasswordResetOtp_CreatedAt DEFAULT (SYSUTCDATETIME()),
    ConsumedAt DATETIME2 NULL
  );
  CREATE INDEX IX_EmailPasswordResetOtp_Email_CreatedAt
    ON [mk].[EmailPasswordResetOtp](Email, CreatedAt DESC);
END;
