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

-- Additional topics based on the elementary mathematics reference document.
INSERT INTO [mk].[Topics] (GradeId, TopicCode, Name)
SELECT seed.GradeId, seed.TopicCode, seed.Name
FROM (VALUES
  (3,'expressions',N'Tính giá trị biểu thức'),
  (3,'divisibility',N'Dấu hiệu chia hết cơ bản'),
  (4,'sequences',N'Dãy số cách đều'),
  (4,'average',N'Trung bình cộng'),
  (4,'sum-difference',N'Tìm hai số khi biết tổng và hiệu'),
  (4,'planting',N'Bài toán trồng cây'),
  (5,'ratio',N'Tìm hai số theo tỉ số'),
  (5,'difference-ratio',N'Tìm hai số khi biết hiệu và tỉ số'),
  (5,'units',N'Đổi đơn vị đo'),
  (5,'motion',N'Bài toán chuyển động đều'),
  (5,'geometry-advanced',N'Hình học và thể tích')
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

-- Ensure each lesson topic has at least three beginner questions for a practice set.
INSERT INTO [mk].[Questions]
  (TopicId,QuestionText,OptionA,OptionB,OptionC,OptionD,CorrectAnswer,Difficulty,Explanation)
SELECT t.TopicId,seed.QuestionText,seed.OptionA,seed.OptionB,seed.OptionC,seed.OptionD,seed.CorrectAnswer,1,seed.Explanation
FROM (VALUES
  (1,'addition',N'6 + 3 = ?',N'8',N'9',N'10',N'7','B',N'6 cộng 3 bằng 9.'),
  (1,'subtraction',N'8 − 2 = ?',N'5',N'6',N'7',N'4','B',N'8 bớt 2 còn 6.'),
  (1,'subtraction',N'10 − 4 = ?',N'5',N'7',N'6',N'4','C',N'10 bớt 4 còn 6.'),
  (1,'geometry',N'Hình vuông có mấy cạnh?',N'3',N'4',N'5',N'6','B',N'Hình vuông có 4 cạnh.'),
  (1,'geometry',N'Hình tròn có góc nhọn không?',N'Có 1 góc',N'Có 2 góc',N'Không có góc',N'Có 4 góc','C',N'Hình tròn không có cạnh thẳng nên không có góc.'),

  (2,'addition',N'15 + 4 = ?',N'18',N'19',N'20',N'21','B',N'15 cộng 4 bằng 19.'),
  (2,'addition',N'30 + 20 = ?',N'40',N'50',N'60',N'70','B',N'3 chục cộng 2 chục bằng 5 chục, tức 50.'),
  (2,'multiplication',N'3 × 4 = ?',N'7',N'12',N'14',N'16','B',N'3 nhóm 4 là 4 + 4 + 4 = 12.'),
  (2,'time',N'Kim phút chỉ số 12, kim giờ chỉ số 7. Đồng hồ chỉ mấy giờ?',N'5 giờ',N'7 giờ',N'12 giờ',N'17 giờ','B',N'Kim phút ở số 12 là đúng giờ; kim giờ ở số 7 nên là 7 giờ.'),
  (2,'time',N'30 phút còn được gọi là bao nhiêu?',N'Một giờ',N'Một phần tư giờ',N'Nửa giờ',N'Hai giờ','C',N'60 phút là một giờ; 30 phút bằng một nửa của 60 phút.'),

  (3,'multiplication',N'5 × 6 = ?',N'25',N'30',N'35',N'40','B',N'5 nhóm 6 là 6 + 6 + 6 + 6 + 6 = 30.'),
  (3,'division',N'35 ÷ 5 = ?',N'5',N'6',N'7',N'8','C',N'Vì 5 × 7 = 35 nên 35 ÷ 5 = 7.'),
  (3,'fractions',N'Phân số nào chỉ một phần trong 4 phần bằng nhau?',N'1/2',N'1/3',N'1/4',N'4/1','C',N'Mẫu số 4 chỉ 4 phần bằng nhau, tử số 1 chỉ lấy 1 phần.'),
  (3,'fractions',N'2/5 + 1/5 = ?',N'3/5',N'3/10',N'2/10',N'1/5','A',N'Cùng mẫu số nên giữ mẫu 5 và cộng tử: 2 + 1 = 3.'),
  (3,'expressions',N'18 + 6 ÷ 3 = ?',N'8',N'20',N'24',N'12','B',N'Chia trước: 6 ÷ 3 = 2; rồi 18 + 2 = 20.'),
  (3,'expressions',N'(9 + 3) × 2 = ?',N'15',N'20',N'24',N'30','C',N'Tính trong ngoặc trước: 9 + 3 = 12; rồi 12 × 2 = 24.'),
  (3,'divisibility',N'Số nào chia hết cho 2?',N'31',N'42',N'55',N'67','B',N'Số chia hết cho 2 có chữ số tận cùng là 0, 2, 4, 6 hoặc 8.'),
  (3,'divisibility',N'Số nào chia hết cho 5?',N'123',N'214',N'325',N'431','C',N'Số 325 tận cùng là 5 nên chia hết cho 5.'),

  (4,'fractions',N'1/3 + 1/3 = ?',N'2/3',N'2/6',N'1/6',N'1/3','A',N'Cùng mẫu số, cộng tử số: 1 + 1 = 2, giữ mẫu 3.'),
  (4,'multiplication',N'14 × 2 = ?',N'26',N'28',N'30',N'32','B',N'14 × 2 = 14 + 14 = 28.'),
  (4,'multiplication',N'20 × 5 = ?',N'100',N'25',N'50',N'200','A',N'2 × 5 = 10, thêm một chữ số 0 nên 20 × 5 = 100.'),
  (4,'geometry',N'Hình chữ nhật dài 5 cm, rộng 2 cm. Chu vi là?',N'7 cm',N'10 cm',N'14 cm',N'20 cm','C',N'Chu vi = (5 + 2) × 2 = 14 cm.'),
  (4,'geometry',N'Hình vuông cạnh 3 cm có diện tích là?',N'6 cm²',N'9 cm²',N'12 cm²',N'12 cm','B',N'Diện tích = cạnh × cạnh = 3 × 3 = 9 cm².'),
  (4,'sequences',N'Dãy 10, 12, 14, 16, … số tiếp theo là?',N'17',N'18',N'19',N'20','B',N'Mỗi số tăng 2; 16 + 2 = 18.'),
  (4,'sequences',N'Dãy 3, 6, 9, 12 có khoảng cách giữa hai số liên tiếp là?',N'2',N'3',N'4',N'6','B',N'Hiệu giữa hai số đứng cạnh nhau luôn là 3.'),
  (4,'average',N'Trung bình cộng của 4 và 8 là?',N'4',N'5',N'6',N'12','C',N'(4 + 8) ÷ 2 = 12 ÷ 2 = 6.'),
  (4,'average',N'Trung bình cộng của 5, 7 và 9 là?',N'6',N'7',N'8',N'21','B',N'(5 + 7 + 9) ÷ 3 = 21 ÷ 3 = 7.'),
  (4,'sum-difference',N'Tổng hai số là 20, hiệu là 4. Số bé là?',N'8',N'10',N'12',N'16','A',N'Số bé = (tổng − hiệu) ÷ 2 = (20 − 4) ÷ 2 = 8.'),
  (4,'sum-difference',N'Tổng hai số là 18, hiệu là 2. Số lớn là?',N'8',N'9',N'10',N'16','C',N'Số lớn = (tổng + hiệu) ÷ 2 = (18 + 2) ÷ 2 = 10.'),
  (4,'sum-difference',N'Tổng hai số là 14, hiệu là 6. Số bé là?',N'4',N'5',N'8',N'10','A',N'Số bé = (14 − 6) ÷ 2 = 4.'),
  (4,'planting',N'Trồng cây ở cả hai đầu đoạn đường có 4 khoảng. Có bao nhiêu cây?',N'3 cây',N'4 cây',N'5 cây',N'6 cây','C',N'Trồng cả hai đầu thì số cây = số khoảng + 1 = 5.'),
  (4,'planting',N'Đường tròn khép kín có 8 khoảng bằng nhau. Cần bao nhiêu cây?',N'7 cây',N'8 cây',N'9 cây',N'10 cây','B',N'Trồng khép kín thì số cây bằng số khoảng, tức 8 cây.'),

  (5,'decimals',N'1,2 + 0,5 = ?',N'1,7',N'1,5',N'1,25',N'2,2','A',N'Đặt dấu phẩy thẳng cột: 1,2 + 0,5 = 1,7.'),
  (5,'decimals',N'4,6 − 1,3 = ?',N'3,1',N'3,3',N'3,5',N'5,9','B',N'Đặt dấu phẩy thẳng cột rồi trừ: 4,6 − 1,3 = 3,3.'),
  (5,'percentage',N'50% của 40 là bao nhiêu?',N'10',N'20',N'30',N'50','B',N'50% là một nửa; một nửa của 40 là 20.'),
  (5,'division',N'3,6 ÷ 0,6 = ?',N'0,6',N'6',N'60',N'9','B',N'Nhân cả số bị chia và số chia với 10: 36 ÷ 6 = 6.'),
  (5,'division',N'144 ÷ 12 = ?',N'10',N'11',N'12',N'14','C',N'12 × 12 = 144 nên 144 ÷ 12 = 12.'),
  (5,'ratio',N'Tỉ số 1 : 2, tổng hai số là 12. Số bé là?',N'4',N'6',N'8',N'10','A',N'Tổng phần là 1 + 2 = 3; mỗi phần 12 ÷ 3 = 4. Số bé có 1 phần.'),
  (5,'ratio',N'Tỉ số hai số là 2 : 3, tổng là 20. Số lớn là?',N'8',N'10',N'12',N'15','C',N'Tổng phần 5; mỗi phần 20 ÷ 5 = 4. Số lớn có 3 phần: 3 × 4 = 12.'),
  (5,'ratio',N'Tỉ số hai số là 3 : 4, tổng là 28. Số bé là?',N'12',N'14',N'16',N'18','A',N'Tổng phần 7; mỗi phần 28 ÷ 7 = 4. Số bé là 3 × 4 = 12.'),
  (5,'difference-ratio',N'Hiệu hai số là 8, tỉ số bé:lớn là 1:3. Số bé là?',N'2',N'4',N'6',N'8','B',N'Hiệu số phần 3 − 1 = 2; mỗi phần 8 ÷ 2 = 4. Số bé là 4.'),
  (5,'difference-ratio',N'Hiệu hai số là 10, tỉ số bé:lớn là 2:3. Số lớn là?',N'20',N'25',N'30',N'35','C',N'Hiệu số phần 3 − 2 = 1 nên mỗi phần là 10. Số lớn có 3 phần: 30.'),
  (5,'difference-ratio',N'Hiệu hai số là 12, tỉ số bé:lớn là 1:2. Số lớn là?',N'12',N'18',N'24',N'30','C',N'Hiệu số phần là 1; một phần bằng 12. Số lớn có 2 phần: 24.'),
  (5,'units',N'3 km bằng bao nhiêu mét?',N'30 m',N'300 m',N'3.000 m',N'30.000 m','C',N'1 km = 1.000 m nên 3 km = 3.000 m.'),
  (5,'units',N'5 kg bằng bao nhiêu gam?',N'50 g',N'500 g',N'5.000 g',N'50.000 g','C',N'1 kg = 1.000 g nên 5 kg = 5.000 g.'),
  (5,'motion',N'Đi 60 km trong 2 giờ. Vận tốc là?',N'20 km/giờ',N'30 km/giờ',N'60 km/giờ',N'120 km/giờ','B',N'Vận tốc = quãng đường ÷ thời gian = 60 ÷ 2 = 30 km/giờ.'),
  (5,'motion',N'Đi với vận tốc 5 km/giờ trong 3 giờ. Quãng đường là?',N'8 km',N'15 km',N'20 km',N'30 km','B',N'Quãng đường = vận tốc × thời gian = 5 × 3 = 15 km.'),
  (5,'geometry-advanced',N'Tam giác có đáy 6 cm, chiều cao 4 cm. Diện tích là?',N'10 cm²',N'12 cm²',N'24 cm²',N'20 cm²','B',N'Diện tích tam giác = đáy × chiều cao ÷ 2 = 6 × 4 ÷ 2 = 12 cm².'),
  (5,'geometry-advanced',N'Hình lập phương cạnh 2 cm có thể tích là?',N'6 cm³',N'8 cm³',N'12 cm³',N'16 cm³','B',N'Thể tích = cạnh × cạnh × cạnh = 2 × 2 × 2 = 8 cm³.'),
  (5,'geometry-advanced',N'Hình tròn bán kính 1 cm có chu vi xấp xỉ?',N'3,14 cm',N'6,28 cm',N'9,42 cm',N'12,56 cm','B',N'Chu vi hình tròn = 2 × bán kính × 3,14 = 2 × 1 × 3,14 = 6,28 cm.')
) seed(GradeId,TopicCode,QuestionText,OptionA,OptionB,OptionC,OptionD,CorrectAnswer,Explanation)
JOIN [mk].[Topics] t ON t.GradeId = seed.GradeId AND t.TopicCode = seed.TopicCode
WHERE NOT EXISTS (
  SELECT 1 FROM [mk].[Questions] existing
  WHERE existing.TopicId = t.TopicId AND existing.QuestionText = seed.QuestionText
);

INSERT INTO [mk].[Questions]
  (TopicId,QuestionText,OptionA,OptionB,OptionC,OptionD,CorrectAnswer,Difficulty,Explanation)
SELECT t.TopicId,seed.QuestionText,seed.OptionA,seed.OptionB,seed.OptionC,seed.OptionD,seed.CorrectAnswer,seed.Difficulty,seed.Explanation
FROM (VALUES
  (3,'expressions',N'40 − 12 ÷ 3 = ?',N'28',N'32',N'36',N'12','C',1,N'Thực hiện phép chia trước: 12 ÷ 3 = 4, rồi 40 − 4 = 36.'),
  (3,'expressions',N'(18 + 6) ÷ 4 = ?',N'6',N'8',N'12',N'24','A',2,N'Tính trong ngoặc trước: 18 + 6 = 24; sau đó 24 ÷ 4 = 6.'),
  (3,'divisibility',N'Số nào chia hết cho 5?',N'142',N'235',N'318',N'421','B',1,N'Số chia hết cho 5 có chữ số tận cùng là 0 hoặc 5. 235 tận cùng là 5.'),
  (3,'divisibility',N'Số nào chia hết cho 3?',N'124',N'235',N'312',N'401','C',2,N'Tổng chữ số của 312 là 3 + 1 + 2 = 6, chia hết cho 3.'),
  (4,'sequences',N'Dãy 4, 7, 10, 13, … có số tiếp theo là?',N'14',N'15',N'16',N'17','C',1,N'Mỗi số tăng 3 đơn vị; 13 + 3 = 16.'),
  (4,'sequences',N'Dãy 2, 5, 8, 11 có bao nhiêu số hạng?',N'3',N'4',N'5',N'6','B',2,N'Dãy gồm 2, 5, 8, 11 nên có 4 số hạng.'),
  (4,'average',N'Trung bình cộng của 6, 8 và 10 là?',N'8',N'9',N'10',N'24','A',1,N'Cộng các số rồi chia cho số lượng: (6 + 8 + 10) ÷ 3 = 8.'),
  (4,'average',N'Trung bình cộng của 12, 15, 18, 19 là?',N'15',N'16',N'17',N'64','B',2,N'Tổng là 64; 64 ÷ 4 = 16.'),
  (4,'sum-difference',N'Tổng hai số là 30, hiệu là 6. Số lớn là?',N'12',N'18',N'24',N'36','B',2,N'Số lớn = (tổng + hiệu) ÷ 2 = (30 + 6) ÷ 2 = 18.'),
  (4,'planting',N'Trồng cây ở cả hai đầu một lối đi có 6 khoảng bằng nhau. Cần bao nhiêu cây?',N'5 cây',N'6 cây',N'7 cây',N'8 cây','C',1,N'Trồng ở cả hai đầu thì số cây = số khoảng + 1. Vậy 6 + 1 = 7 cây.'),
  (5,'ratio',N'Tỉ số hai số là 2 : 3, tổng là 25. Số bé là?',N'5',N'10',N'15',N'20','B',2,N'Tổng số phần là 2 + 3 = 5; mỗi phần là 25 ÷ 5 = 5. Số bé là 2 × 5 = 10.'),
  (5,'difference-ratio',N'Hiệu hai số là 12, tỉ số số bé và số lớn là 1 : 3. Số bé là?',N'4',N'6',N'8',N'12','B',2,N'Hiệu số phần là 3 − 1 = 2; một phần là 12 ÷ 2 = 6. Số bé có 1 phần, bằng 6.'),
  (5,'units',N'2,5 km bằng bao nhiêu mét?',N'25 m',N'250 m',N'2.500 m',N'25.000 m','C',1,N'1 km = 1.000 m nên 2,5 km = 2,5 × 1.000 = 2.500 m.'),
  (5,'units',N'3 m² bằng bao nhiêu cm²?',N'300 cm²',N'3.000 cm²',N'30.000 cm²',N'300.000 cm²','C',3,N'1 m² = 10.000 cm², vì 1 m = 100 cm và diện tích đổi theo 100 × 100. Vậy 3 m² = 30.000 cm².'),
  (5,'motion',N'Xe đi 120 km trong 3 giờ. Vận tốc là?',N'30 km/giờ',N'40 km/giờ',N'60 km/giờ',N'360 km/giờ','B',1,N'Vận tốc = quãng đường ÷ thời gian = 120 ÷ 3 = 40 km/giờ.'),
  (5,'motion',N'Đi với vận tốc 12 km/giờ trong 2,5 giờ thì đi được bao xa?',N'14,5 km',N'24 km',N'30 km',N'36 km','C',2,N'Quãng đường = vận tốc × thời gian = 12 × 2,5 = 30 km.'),
  (5,'geometry-advanced',N'Hình hộp chữ nhật dài 4 cm, rộng 3 cm, cao 2 cm có thể tích?',N'9 cm³',N'12 cm³',N'24 cm³',N'24 cm²','C',2,N'Thể tích = dài × rộng × cao = 4 × 3 × 2 = 24 cm³.')
) seed(GradeId,TopicCode,QuestionText,OptionA,OptionB,OptionC,OptionD,CorrectAnswer,Difficulty,Explanation)
JOIN [mk].[Topics] t ON t.GradeId = seed.GradeId AND t.TopicCode = seed.TopicCode
WHERE NOT EXISTS (
  SELECT 1 FROM [mk].[Questions] existing
  WHERE existing.TopicId = t.TopicId AND existing.QuestionText = seed.QuestionText
);
