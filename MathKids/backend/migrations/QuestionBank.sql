-- MathKids question bank schema and starter questions. Safe to run more than once.
IF SCHEMA_ID(N'mk') IS NULL EXEC(N'CREATE SCHEMA [mk]');

IF OBJECT_ID(N'[mk].[Grades]', N'U') IS NULL
BEGIN
  CREATE TABLE [mk].[Grades] (
    GradeId TINYINT NOT NULL CONSTRAINT PK_Grades PRIMARY KEY,
    Name NVARCHAR(50) NOT NULL CONSTRAINT UQ_Grades_Name UNIQUE
  );
END;

IF OBJECT_ID(N'[mk].[Topics]', N'U') IS NULL
BEGIN
  CREATE TABLE [mk].[Topics] (
    TopicId INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Topics PRIMARY KEY,
    GradeId TINYINT NOT NULL,
    TopicCode VARCHAR(50) NOT NULL,
    Name NVARCHAR(100) NOT NULL,
    CONSTRAINT FK_Topics_Grades FOREIGN KEY (GradeId) REFERENCES [mk].[Grades](GradeId),
    CONSTRAINT UQ_Topics_Grade_Code UNIQUE (GradeId, TopicCode)
  );
END;

IF OBJECT_ID(N'[mk].[Questions]', N'U') IS NULL
BEGIN
  CREATE TABLE [mk].[Questions] (
    QuestionId INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Questions PRIMARY KEY,
    TopicId INT NOT NULL,
    QuestionText NVARCHAR(1000) NOT NULL,
    OptionA NVARCHAR(300) NOT NULL,
    OptionB NVARCHAR(300) NOT NULL,
    OptionC NVARCHAR(300) NOT NULL,
    OptionD NVARCHAR(300) NOT NULL,
    CorrectAnswer CHAR(1) NOT NULL,
    Difficulty TINYINT NOT NULL,
    Explanation NVARCHAR(1000) NOT NULL,
    IsActive BIT NOT NULL CONSTRAINT DF_Questions_IsActive DEFAULT (1),
    CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_Questions_CreatedAt DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT FK_Questions_Topics FOREIGN KEY (TopicId) REFERENCES [mk].[Topics](TopicId),
    CONSTRAINT CK_Questions_CorrectAnswer CHECK (CorrectAnswer IN ('A','B','C','D')),
    CONSTRAINT CK_Questions_Difficulty CHECK (Difficulty IN (1,2,3))
  );
  CREATE INDEX IX_Questions_Topic_Difficulty_Active ON [mk].[Questions](TopicId, Difficulty, IsActive);
END;

IF OBJECT_ID(N'[mk].[StudentQuestionResults]', N'U') IS NULL
BEGIN
  CREATE TABLE [mk].[StudentQuestionResults] (
    ResultId BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_StudentQuestionResults PRIMARY KEY,
    StudentId INT NOT NULL,
    QuestionId INT NOT NULL,
    Answer CHAR(1) NOT NULL,
    IsCorrect BIT NOT NULL,
    TimeSpent INT NOT NULL CONSTRAINT DF_StudentQuestionResults_TimeSpent DEFAULT (0),
    CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_StudentQuestionResults_CreatedAt DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT FK_StudentQuestionResults_Student FOREIGN KEY (StudentId) REFERENCES [mk].[Student](StudentId),
    CONSTRAINT FK_StudentQuestionResults_Question FOREIGN KEY (QuestionId) REFERENCES [mk].[Questions](QuestionId),
    CONSTRAINT CK_StudentQuestionResults_Answer CHECK (Answer IN ('A','B','C','D')),
    CONSTRAINT CK_StudentQuestionResults_TimeSpent CHECK (TimeSpent >= 0)
  );
  CREATE INDEX IX_StudentQuestionResults_Student_CreatedAt ON [mk].[StudentQuestionResults](StudentId, CreatedAt DESC);
END;

INSERT INTO [mk].[Grades] (GradeId, Name)
SELECT seed.GradeId, seed.Name
FROM (VALUES (1,N'Lớp 1'),(2,N'Lớp 2'),(3,N'Lớp 3'),(4,N'Lớp 4'),(5,N'Lớp 5')) seed(GradeId,Name)
WHERE NOT EXISTS (SELECT 1 FROM [mk].[Grades] g WHERE g.GradeId = seed.GradeId);

INSERT INTO [mk].[Topics] (GradeId, TopicCode, Name)
SELECT seed.GradeId, seed.TopicCode, seed.Name
FROM (VALUES
  (1,'addition',N'Phép cộng'),(1,'subtraction',N'Phép trừ'),(1,'geometry',N'Hình học cơ bản'),
  (2,'addition',N'Cộng trừ đến 100'),(2,'multiplication',N'Bảng nhân'),(2,'time',N'Đồng hồ và thời gian'),
  (3,'multiplication',N'Phép nhân'),(3,'division',N'Phép chia'),(3,'fractions',N'Phân số'),
  (4,'fractions',N'Phân số'),(4,'multiplication',N'Nhân số tự nhiên'),(4,'geometry',N'Chu vi và diện tích'),
  (5,'decimals',N'Số thập phân'),(5,'percentage',N'Phần trăm'),(5,'division',N'Phép chia')
) seed(GradeId,TopicCode,Name)
WHERE NOT EXISTS (SELECT 1 FROM [mk].[Topics] t WHERE t.GradeId = seed.GradeId AND t.TopicCode = seed.TopicCode);

INSERT INTO [mk].[Questions]
  (TopicId,QuestionText,OptionA,OptionB,OptionC,OptionD,CorrectAnswer,Difficulty,Explanation)
SELECT t.TopicId,seed.QuestionText,seed.OptionA,seed.OptionB,seed.OptionC,seed.OptionD,seed.CorrectAnswer,seed.Difficulty,seed.Explanation
FROM (VALUES
  (1,'addition',N'1 + 2 = ?',N'2',N'3',N'4',N'5','B',1,N'1 cộng 2 bằng 3.'),
  (1,'addition',N'5 + 4 = ?',N'9',N'8',N'10',N'11','A',1,N'5 cộng 4 bằng 9.'),
  (1,'addition',N'8 + 7 = ?',N'14',N'15',N'16',N'13','B',2,N'8 cộng 7 bằng 15.'),
  (1,'addition',N'18 + 16 = ?',N'32',N'33',N'34',N'35','C',3,N'18 cộng 16 bằng 34.'),
  (1,'subtraction',N'9 − 3 = ?',N'5',N'6',N'7',N'8','B',1,N'9 bớt 3 còn 6.'),
  (1,'subtraction',N'15 − 7 = ?',N'7',N'8',N'9',N'6','B',2,N'15 trừ 7 bằng 8.'),
  (1,'subtraction',N'30 − 14 = ?',N'14',N'15',N'16',N'17','C',3,N'30 trừ 10 còn 20, trừ tiếp 4 còn 16.'),
  (1,'geometry',N'Hình tam giác có bao nhiêu cạnh?',N'2',N'3',N'4',N'5','B',1,N'Hình tam giác có 3 cạnh.'),
  (1,'geometry',N'Hình vuông có bao nhiêu cạnh bằng nhau?',N'2',N'3',N'4',N'5','C',2,N'Hình vuông có 4 cạnh bằng nhau.'),
  (1,'geometry',N'Một hình vuông cạnh 5 cm có chu vi bao nhiêu?',N'10 cm',N'15 cm',N'20 cm',N'25 cm','C',3,N'Chu vi hình vuông bằng 4 × 5 = 20 cm.'),

  (2,'addition',N'24 + 18 = ?',N'40',N'42',N'44',N'46','B',1,N'24 cộng 18 bằng 42.'),
  (2,'addition',N'65 + 27 = ?',N'82',N'90',N'92',N'94','C',2,N'65 cộng 27 bằng 92.'),
  (2,'subtraction',N'100 − 37 = ?',N'63',N'67',N'73',N'57','A',2,N'100 trừ 37 bằng 63.'),
  (2,'subtraction',N'84 − 29 = ?',N'55',N'56',N'65',N'53','A',3,N'84 trừ 29 bằng 55.'),
  (2,'multiplication',N'2 × 6 = ?',N'10',N'12',N'14',N'16','B',1,N'2 nhân 6 bằng 12.'),
  (2,'multiplication',N'5 × 8 = ?',N'35',N'40',N'45',N'48','B',1,N'5 nhân 8 bằng 40.'),
  (2,'multiplication',N'7 × 6 = ?',N'36',N'42',N'48',N'49','B',2,N'7 nhân 6 bằng 42.'),
  (2,'multiplication',N'9 × 8 = ?',N'63',N'72',N'81',N'64','B',3,N'9 nhân 8 bằng 72.'),
  (2,'time',N'Kim phút chỉ số 12, kim giờ chỉ số 3. Mấy giờ?',N'12 giờ',N'3 giờ',N'6 giờ',N'15 giờ','B',1,N'Kim phút ở số 12 và kim giờ ở số 3 là 3 giờ.'),
  (2,'time',N'1 giờ có bao nhiêu phút?',N'30 phút',N'45 phút',N'60 phút',N'100 phút','C',2,N'1 giờ bằng 60 phút.'),

  (3,'multiplication',N'6 × 4 = ?',N'24',N'20',N'28',N'18','A',1,N'6 nhóm 4 bằng 24.'),
  (3,'multiplication',N'7 × 8 = ?',N'54',N'56',N'64',N'48','B',1,N'7 nhân 8 bằng 56.'),
  (3,'multiplication',N'12 × 6 = ?',N'62',N'68',N'72',N'76','C',2,N'12 nhân 6 bằng 72.'),
  (3,'division',N'54 ÷ 6 = ?',N'7',N'8',N'9',N'10','C',1,N'Vì 6 × 9 = 54 nên 54 chia 6 bằng 9.'),
  (3,'division',N'72 ÷ 8 = ?',N'8',N'9',N'10',N'7','B',1,N'Vì 8 × 9 = 72 nên 72 chia 8 bằng 9.'),
  (3,'division',N'96 ÷ 4 = ?',N'22',N'24',N'26',N'28','B',2,N'96 chia 4 bằng 24.'),
  (3,'fractions',N'Phân số nào bằng một nửa?',N'1/3',N'2/4',N'3/4',N'1/4','B',1,N'2/4 rút gọn bằng 1/2.'),
  (3,'fractions',N'3/8 + 2/8 = ?',N'5/8',N'5/16',N'1/8',N'6/8','A',2,N'Cùng mẫu số nên cộng tử số: 3/8 + 2/8 = 5/8.'),
  (3,'fractions',N'1/4 của 20 là bao nhiêu?',N'4',N'5',N'10',N'15','B',2,N'20 chia 4 bằng 5.'),
  (3,'multiplication',N'25 × 4 = ?',N'90',N'100',N'110',N'125','B',3,N'25 nhân 4 bằng 100.'),

  (4,'fractions',N'1/2 + 1/4 = ?',N'3/4',N'2/6',N'1/6',N'2/4','A',1,N'1/2 bằng 2/4, vậy 2/4 + 1/4 = 3/4.'),
  (4,'fractions',N'3/8 + 2/8 = ?',N'5/8',N'5/16',N'1/8',N'6/8','A',1,N'Cộng tử số và giữ nguyên mẫu số: 5/8.'),
  (4,'fractions',N'2/3 − 1/3 = ?',N'1/3',N'1/6',N'3/3',N'2/6','A',2,N'2/3 trừ 1/3 bằng 1/3.'),
  (4,'fractions',N'3/4 của 20 là bao nhiêu?',N'10',N'12',N'15',N'16','C',3,N'20 chia 4 rồi nhân 3: 5 × 3 = 15.'),
  (4,'multiplication',N'24 × 3 = ?',N'62',N'72',N'82',N'74','B',1,N'24 nhân 3 bằng 72.'),
  (4,'multiplication',N'125 × 4 = ?',N'400',N'450',N'500',N'550','C',2,N'125 nhân 4 bằng 500.'),
  (4,'multiplication',N'36 × 12 = ?',N'412',N'422',N'432',N'442','C',3,N'36 × 12 = 36 × 10 + 36 × 2 = 432.'),
  (4,'geometry',N'Hình chữ nhật dài 8 cm, rộng 3 cm. Chu vi là?',N'11 cm',N'22 cm',N'24 cm',N'28 cm','B',1,N'Chu vi bằng (8 + 3) × 2 = 22 cm.'),
  (4,'geometry',N'Hình vuông cạnh 6 cm có diện tích?',N'12 cm²',N'24 cm²',N'36 cm²',N'30 cm²','C',2,N'Diện tích hình vuông bằng 6 × 6 = 36 cm².'),
  (4,'geometry',N'Hình chữ nhật diện tích 48 cm², rộng 6 cm. Dài bao nhiêu?',N'7 cm',N'8 cm',N'9 cm',N'10 cm','B',3,N'Chiều dài bằng diện tích chia chiều rộng: 48 ÷ 6 = 8 cm.'),

  (5,'decimals',N'3,5 + 2,4 = ?',N'5,7',N'5,9',N'6,1',N'5,8','B',1,N'3,5 cộng 2,4 bằng 5,9.'),
  (5,'decimals',N'7,2 − 3,8 = ?',N'3,4',N'4,4',N'3,6',N'4,6','A',2,N'7,2 trừ 3,8 bằng 3,4.'),
  (5,'decimals',N'1,25 + 0,75 = ?',N'1,5',N'2',N'2,5',N'1,75','B',2,N'1,25 cộng 0,75 bằng 2.'),
  (5,'decimals',N'2,4 × 1,5 = ?',N'3,2',N'3,5',N'3,6',N'4,0','C',3,N'24 × 15 = 360; có hai chữ số thập phân nên kết quả là 3,60.'),
  (5,'percentage',N'25% của 80 là bao nhiêu?',N'15',N'20',N'25',N'30','B',1,N'25% bằng một phần tư; 80 chia 4 bằng 20.'),
  (5,'percentage',N'10% của 350 là bao nhiêu?',N'25',N'30',N'35',N'45','C',1,N'10% bằng một phần mười; 350 chia 10 bằng 35.'),
  (5,'percentage',N'15% của 200 là bao nhiêu?',N'25',N'30',N'35',N'40','B',2,N'10% của 200 là 20 và 5% là 10; tổng là 30.'),
  (5,'division',N'4,8 ÷ 0,6 = ?',N'0,8',N'8',N'80',N'7','B',2,N'Nhân cả số bị chia và số chia với 10: 48 ÷ 6 = 8.'),
  (5,'division',N'125 ÷ 5 = ?',N'20',N'25',N'30',N'35','B',1,N'125 chia 5 bằng 25.'),
  (5,'percentage',N'Một món đồ 200.000đ giảm 20%. Giá sau giảm là?',N'140.000đ',N'150.000đ',N'160.000đ',N'180.000đ','C',3,N'20% của 200.000đ là 40.000đ; giá mới là 160.000đ.')
) seed(GradeId,TopicCode,QuestionText,OptionA,OptionB,OptionC,OptionD,CorrectAnswer,Difficulty,Explanation)
JOIN [mk].[Topics] t ON t.GradeId = seed.GradeId AND t.TopicCode = seed.TopicCode
WHERE NOT EXISTS (
  SELECT 1 FROM [mk].[Questions] existing
  WHERE existing.TopicId = t.TopicId AND existing.QuestionText = seed.QuestionText
);
