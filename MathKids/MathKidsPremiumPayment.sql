/* Run once after MathKidsDB.sql. Stores Premium orders and 30-day entitlements. */
USE [MathKids];
GO

IF OBJECT_ID(N'[mk].[PaymentOrder]', N'U') IS NULL
BEGIN
    CREATE TABLE [mk].[PaymentOrder]
    (
        PaymentOrderId      BIGINT IDENTITY(1,1) NOT NULL,
        UserId              INT NOT NULL,
        InvoiceNumber       NVARCHAR(100) NOT NULL,
        Amount              DECIMAL(12,2) NOT NULL,
        Currency            VARCHAR(3) NOT NULL CONSTRAINT DF_PaymentOrder_Currency DEFAULT ('VND'),
        Status              VARCHAR(20) NOT NULL CONSTRAINT DF_PaymentOrder_Status DEFAULT ('Pending'),
        SePayOrderId        NVARCHAR(150) NULL,
        SePayTransactionId  NVARCHAR(150) NULL,
        CreatedAt           DATETIME2(0) NOT NULL CONSTRAINT DF_PaymentOrder_CreatedAt DEFAULT (SYSUTCDATETIME()),
        PaidAt              DATETIME2(0) NULL,
        CONSTRAINT PK_PaymentOrder PRIMARY KEY (PaymentOrderId),
        CONSTRAINT UQ_PaymentOrder_Invoice UNIQUE (InvoiceNumber),
        CONSTRAINT FK_PaymentOrder_User FOREIGN KEY (UserId) REFERENCES [mk].[AppUser](UserId),
        CONSTRAINT CK_PaymentOrder_Amount CHECK (Amount > 0),
        CONSTRAINT CK_PaymentOrder_Status CHECK (Status IN ('Pending','Paid','Failed','Cancelled'))
    );
END;
GO

IF OBJECT_ID(N'[mk].[PremiumSubscription]', N'U') IS NULL
BEGIN
    CREATE TABLE [mk].[PremiumSubscription]
    (
        SubscriptionId   BIGINT IDENTITY(1,1) NOT NULL,
        UserId           INT NOT NULL,
        PaymentOrderId   BIGINT NOT NULL,
        PlanCode         VARCHAR(40) NOT NULL,
        StartsAt         DATETIME2(0) NOT NULL,
        ExpiresAt        DATETIME2(0) NOT NULL,
        Status            VARCHAR(20) NOT NULL CONSTRAINT DF_PremiumSubscription_Status DEFAULT ('Active'),
        CreatedAt        DATETIME2(0) NOT NULL CONSTRAINT DF_PremiumSubscription_CreatedAt DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT PK_PremiumSubscription PRIMARY KEY (SubscriptionId),
        CONSTRAINT UQ_PremiumSubscription_Payment UNIQUE (PaymentOrderId),
        CONSTRAINT FK_PremiumSubscription_User FOREIGN KEY (UserId) REFERENCES [mk].[AppUser](UserId),
        CONSTRAINT FK_PremiumSubscription_Order FOREIGN KEY (PaymentOrderId) REFERENCES [mk].[PaymentOrder](PaymentOrderId),
        CONSTRAINT CK_PremiumSubscription_Status CHECK (Status IN ('Active','Expired','Cancelled')),
        CONSTRAINT CK_PremiumSubscription_Dates CHECK (ExpiresAt > StartsAt)
    );
END;
GO

CREATE INDEX IX_PaymentOrder_User_Status ON [mk].[PaymentOrder](UserId, Status, CreatedAt DESC);
CREATE INDEX IX_PremiumSubscription_User_Expires ON [mk].[PremiumSubscription](UserId, Status, ExpiresAt DESC);
GO
