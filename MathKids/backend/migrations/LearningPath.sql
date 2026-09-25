-- Expand the legacy source constraint so placement results can persist Gemini
-- and fallback-generated paths. Safe to run on existing databases.
IF OBJECT_ID(N'[mk].[LearningPath]', N'U') IS NOT NULL
AND NOT EXISTS (
  SELECT 1 FROM sys.check_constraints
  WHERE parent_object_id = OBJECT_ID(N'[mk].[LearningPath]')
    AND name = N'CK_LearningPath_GeneratedBy'
    AND definition LIKE N'%Gemini%'
    AND definition LIKE N'%Fallback%'
)
BEGIN
  IF EXISTS (
    SELECT 1 FROM sys.check_constraints
    WHERE parent_object_id = OBJECT_ID(N'[mk].[LearningPath]')
      AND name = N'CK_LearningPath_GeneratedBy'
  )
    EXEC(N'ALTER TABLE [mk].[LearningPath] DROP CONSTRAINT [CK_LearningPath_GeneratedBy]');

  EXEC(N'ALTER TABLE [mk].[LearningPath] ADD CONSTRAINT [CK_LearningPath_GeneratedBy]
    CHECK ([GeneratedBy] IN (''System'', ''AI'', ''ChatGPT'', ''Gemini'', ''Fallback'', ''Teacher'', ''Parent''))');
END;

-- Curriculum lessons and per-student completion. Safe to run more than once.
IF COL_LENGTH(N'mk.StudentQuestionResults', N'ActivityType') IS NULL
  EXEC(N'ALTER TABLE [mk].[StudentQuestionResults] ADD ActivityType VARCHAR(12) NOT NULL CONSTRAINT DF_StudentQuestionResults_ActivityType DEFAULT (''Practice'')');

IF OBJECT_ID(N'[mk].[CK_StudentQuestionResults_ActivityType]', N'C') IS NULL
  EXEC(N'ALTER TABLE [mk].[StudentQuestionResults] ADD CONSTRAINT CK_StudentQuestionResults_ActivityType CHECK (ActivityType IN (''Game'',''Lesson'',''Practice''))');

IF OBJECT_ID(N'[mk].[Lessons]', N'U') IS NULL
BEGIN
  CREATE TABLE [mk].[Lessons] (
    LessonId INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Lessons PRIMARY KEY,
    TopicId INT NOT NULL,
    Title NVARCHAR(150) NOT NULL,
    Introduction NVARCHAR(1000) NOT NULL,
    KeyConcept NVARCHAR(1500) NOT NULL,
    WorkedExample NVARCHAR(1000) NOT NULL,
    SortOrder SMALLINT NOT NULL CONSTRAINT DF_Lessons_SortOrder DEFAULT (1),
    IsActive BIT NOT NULL CONSTRAINT DF_Lessons_IsActive DEFAULT (1),
    CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_Lessons_CreatedAt DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT FK_Lessons_Topics FOREIGN KEY (TopicId) REFERENCES [mk].[Topics](TopicId),
    CONSTRAINT UQ_Lessons_Topic UNIQUE (TopicId)
  );
END;

IF OBJECT_ID(N'[mk].[StudentLessonProgress]', N'U') IS NULL
BEGIN
  CREATE TABLE [mk].[StudentLessonProgress] (
    StudentId INT NOT NULL,
    LessonId INT NOT NULL,
    IsCompleted BIT NOT NULL CONSTRAINT DF_StudentLessonProgress_Completed DEFAULT (0),
    CompletedAt DATETIME2 NULL,
    UpdatedAt DATETIME2 NOT NULL CONSTRAINT DF_StudentLessonProgress_UpdatedAt DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT PK_StudentLessonProgress PRIMARY KEY (StudentId, LessonId),
    CONSTRAINT FK_StudentLessonProgress_Student FOREIGN KEY (StudentId) REFERENCES [mk].[Student](StudentId),
    CONSTRAINT FK_StudentLessonProgress_Lesson FOREIGN KEY (LessonId) REFERENCES [mk].[Lessons](LessonId)
  );
  CREATE INDEX IX_StudentLessonProgress_Student_Completed ON [mk].[StudentLessonProgress](StudentId, IsCompleted);
END;

IF OBJECT_ID(N'[mk].[StudentGameRewardClaim]', N'U') IS NULL
BEGIN
  CREATE TABLE [mk].[StudentGameRewardClaim] (
    ResultId BIGINT NOT NULL CONSTRAINT PK_StudentGameRewardClaim PRIMARY KEY,
    StudentId INT NOT NULL,
    RewardXp SMALLINT NOT NULL,
    ClaimedAt DATETIME2 NOT NULL CONSTRAINT DF_StudentGameRewardClaim_ClaimedAt DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT FK_StudentGameRewardClaim_Result FOREIGN KEY (ResultId) REFERENCES [mk].[StudentQuestionResults](ResultId),
    CONSTRAINT FK_StudentGameRewardClaim_Student FOREIGN KEY (StudentId) REFERENCES [mk].[Student](StudentId)
  );
END;

INSERT INTO [mk].[Lessons] (TopicId, Title, Introduction, KeyConcept, WorkedExample, SortOrder)
SELECT t.TopicId, seed.Title, seed.Introduction, seed.KeyConcept, seed.WorkedExample, seed.SortOrder
FROM (VALUES
  (1,'addition',N'Cộng trong phạm vi 20',N'Cộng là gộp các nhóm lại để tìm tất cả có bao nhiêu.',N'Đếm tiếp từ số lớn hơn. Ví dụ 8 + 5: bắt đầu ở 8, đếm thêm 5 bước được 13.',N'8 + 5 = 13. Có thể tách 5 thành 2 và 3 để tạo 10 rồi cộng tiếp 3.',1),
  (1,'subtraction',N'Trừ trong phạm vi 20',N'Trừ là lấy bớt một phần hoặc tìm phần còn lại.',N'Ví dụ 14 − 6: lùi 6 bước từ 14, kết quả là 8.',N'14 − 6 = 8. Kiểm tra lại bằng phép cộng 8 + 6 = 14.',2),
  (1,'geometry',N'Nhận biết hình cơ bản',N'Hình phẳng được nhận biết qua số cạnh, đỉnh và hình dáng.',N'Tam giác có 3 cạnh; hình vuông có 4 cạnh bằng nhau.',N'Khi quan sát một vật, hãy đếm các cạnh thẳng để nhận ra hình.',3),
  (2,'addition',N'Cộng trừ các số đến 100',N'Tách số thành chục và đơn vị giúp tính nhẩm và đặt tính chính xác.',N'Ví dụ 24 + 18: cộng 20 + 10 được 30, cộng 4 + 8 được 12, tổng là 42.',N'Khi cộng đơn vị được từ 10 trở lên, nhớ thêm 1 chục.',1),
  (2,'multiplication',N'Làm quen với phép nhân',N'Phép nhân là cách viết gọn của phép cộng các nhóm bằng nhau.',N'5 × 3 nghĩa là 5 nhóm, mỗi nhóm có 3: 3 + 3 + 3 + 3 + 3 = 15.',N'Có thể đổi thứ tự hai thừa số: 5 × 3 = 3 × 5.',2),
  (2,'time',N'Đọc đồng hồ và thời gian',N'Một giờ có 60 phút; kim phút quay một vòng thì kim giờ tiến thêm một giờ.',N'Kim phút ở số 12, kim giờ ở số 4 nghĩa là 4 giờ đúng.',N'Kim phút chỉ số 6 là 30 phút; chỉ số 3 là 15 phút.',3),
  (3,'multiplication',N'Nhân các số tự nhiên',N'Nhân số có nhiều chữ số bằng cách nhân lần lượt từng hàng.',N'Ví dụ 12 × 4 = (10 × 4) + (2 × 4) = 40 + 8 = 48.',N'Ước lượng kết quả trước để dễ phát hiện sai sót.',1),
  (3,'division',N'Chia đều và phép chia',N'Phép chia tìm số nhóm bằng nhau hoặc số phần tử trong mỗi nhóm.',N'24 ÷ 6 = 4 vì 6 × 4 = 24.',N'Phép nhân là phép tính ngược để kiểm tra phép chia.',2),
  (3,'fractions',N'Phân số và các phần bằng nhau',N'Phân số biểu thị một số phần được lấy trong các phần bằng nhau.',N'3/8 nghĩa là chia thành 8 phần bằng nhau và lấy 3 phần.',N'Khi cộng hoặc trừ phân số cùng mẫu, giữ nguyên mẫu và tính tử số.',3),
  (4,'fractions',N'Cộng trừ phân số',N'Muốn cộng hoặc trừ phân số khác mẫu, cần quy đồng mẫu số trước.',N'1/2 + 1/4 = 2/4 + 1/4 = 3/4.',N'Rút gọn kết quả nếu tử và mẫu cùng chia hết cho một số.',1),
  (4,'multiplication',N'Nhân số tự nhiên nhiều chữ số',N'Phân tích số thành các hàng giúp thực hiện phép nhân lớn.',N'36 × 12 = 36 × (10 + 2) = 360 + 72 = 432.',N'Cộng các tích riêng và kiểm tra bằng phép ước lượng.',2),
  (4,'geometry',N'Chu vi và diện tích',N'Chu vi đo độ dài đường bao; diện tích đo phần mặt phẳng bên trong.',N'Hình chữ nhật dài 8 cm, rộng 3 cm có chu vi (8 + 3) × 2 = 22 cm.',N'Diện tích hình chữ nhật bằng chiều dài nhân chiều rộng; nhớ ghi đúng đơn vị.',3),
  (5,'decimals',N'Cộng trừ số thập phân',N'Đặt các dấu phẩy thẳng cột để cộng hoặc trừ đúng hàng.',N'3,5 + 2,4 = 5,9; phần mười cộng với phần mười.',N'Có thể thêm chữ số 0 ở cuối phần thập phân để các số có cùng số chữ số.',1),
  (5,'percentage',N'Tỉ số phần trăm',N'Phần trăm nghĩa là số phần trong 100 phần bằng nhau.',N'25% của 80 là 80 × 25 ÷ 100 = 20.',N'10% có thể tìm bằng cách chia cho 10; 50% là một nửa.',2),
  (5,'division',N'Chia số thập phân',N'Có thể chuyển số chia thành số tự nhiên bằng cách dịch dấu phẩy ở cả hai số như nhau.',N'4,8 ÷ 0,6 = 48 ÷ 6 = 8.',N'Nhân cả số bị chia và số chia với cùng một lũy thừa của 10 không làm đổi thương.',3)
) seed(GradeId,TopicCode,Title,Introduction,KeyConcept,WorkedExample,SortOrder)
JOIN [mk].[Topics] t ON t.GradeId = seed.GradeId AND t.TopicCode = seed.TopicCode
WHERE NOT EXISTS (SELECT 1 FROM [mk].[Lessons] l WHERE l.TopicId = t.TopicId);
