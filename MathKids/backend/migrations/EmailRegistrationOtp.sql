-- One-time email verification codes for account registration.
IF OBJECT_ID(N'[mk].[EmailRegistrationOtp]', N'U') IS NULL
BEGIN
  CREATE TABLE [mk].[EmailRegistrationOtp] (
    OtpId BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_EmailRegistrationOtp PRIMARY KEY,
    Email NVARCHAR(255) NOT NULL,
    CodeHash CHAR(64) NOT NULL,
    Attempts TINYINT NOT NULL CONSTRAINT DF_EmailRegistrationOtp_Attempts DEFAULT (0),
    ExpiresAt DATETIME2 NOT NULL,
    CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_EmailRegistrationOtp_CreatedAt DEFAULT (SYSUTCDATETIME()),
    ConsumedAt DATETIME2 NULL
  );
  CREATE INDEX IX_EmailRegistrationOtp_Email_CreatedAt
    ON [mk].[EmailRegistrationOtp](Email, CreatedAt DESC);
END;
