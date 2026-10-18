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

-- Enrich existing lessons using the grade-by-grade knowledge summary as a
-- reference. The theory is written for learning (meaning, steps, checks and
-- common mistakes), not as a formula-only answer key. Repeatable for existing DBs.
UPDATE t
SET t.Name = CASE
  WHEN t.GradeId = 3 AND t.TopicCode = 'divisibility' THEN N'Mở rộng · Chia hết và chia có dư'
  WHEN t.GradeId = 4 AND t.TopicCode = 'decimals' THEN N'Khám phá trước · Số thập phân'
  WHEN t.GradeId = 4 AND t.TopicCode = 'sequences' THEN N'Mở rộng · Tìm quy luật dãy số'
  WHEN t.GradeId = 4 AND t.TopicCode = 'planting' THEN N'Khám phá · Bài toán khoảng cách'
  ELSE t.Name
END
FROM [mk].[Topics] t
WHERE (t.GradeId = 3 AND t.TopicCode = 'divisibility')
   OR (t.GradeId = 4 AND t.TopicCode IN ('decimals','sequences','planting'));

IF OBJECT_ID(N'tempdb..#LearningLessonContent') IS NOT NULL DROP TABLE #LearningLessonContent;
CREATE TABLE #LearningLessonContent (
  GradeId TINYINT NOT NULL,
  TopicCode VARCHAR(50) NOT NULL,
  Title NVARCHAR(150) NOT NULL,
  Introduction NVARCHAR(1000) NOT NULL,
  KeyConcept NVARCHAR(1500) NOT NULL,
  WorkedExample NVARCHAR(1000) NOT NULL
);
INSERT INTO #LearningLessonContent (GradeId,TopicCode,Title,Introduction,KeyConcept,WorkedExample)
VALUES
  (1,'addition',N'Cộng là gộp các nhóm',N'Khi thêm đồ vật vào một nhóm hoặc gộp hai nhóm, phép cộng giúp tìm tổng số. Em có thể dùng que tính, chấm tròn hoặc đếm tiếp để nhìn thấy điều gì đang xảy ra.',N'• Số hạng + số hạng = tổng. • Đếm tiếp từ số lớn thường nhanh hơn đếm lại từ 1. • Có thể tách số để làm tròn đến 10 rồi cộng phần còn lại. • Hay nhầm: bắt đầu đếm cả số đang có, khiến kết quả thừa một.',N'Ví dụ: 8 + 5. 1) Tách 5 thành 2 và 3. 2) Gộp 8 với 2 được 10. 3) Thêm 3 được 13. Vậy 8 + 5 = 13. Kiểm tra bằng cách đếm tiếp 5 bước từ 8: 9, 10, 11, 12, 13.'),
  (1,'subtraction',N'Trừ để tìm phần còn lại hoặc khoảng cách',N'Phép trừ dùng khi lấy bớt, so sánh hai lượng hoặc tìm phần còn thiếu để được một số. Hãy kể lại tình huống bằng đồ vật trước khi viết phép tính.',N'• Số bị trừ − số trừ = hiệu. • Có thể bớt từng phần hoặc đếm lùi. • Phép cộng giúp kiểm tra: hiệu + số trừ phải bằng số bị trừ. • Hay nhầm: đổi chỗ hai số trong phép trừ hoặc quên nói đơn vị của đáp số.',N'Ví dụ: 14 − 6. 1) Bớt 4 để từ 14 về 10. 2) Còn phải bớt 2: 10 − 2 = 8. Vậy 14 − 6 = 8. Kiểm tra: 8 + 6 = 14.'),
  (1,'geometry',N'Nhận ra hình bằng đặc điểm, không phải màu sắc',N'Quan sát các vật quanh em và tìm hình dạng của chúng. Một hình vẫn là hình đó dù được xoay, phóng to, thu nhỏ hoặc đổi màu.',N'• Tam giác có 3 cạnh thẳng. • Hình vuông có 4 cạnh bằng nhau. • Hình chữ nhật có 4 góc vuông và hai cặp cạnh đối diện bằng nhau. • Hình tròn có đường cong khép kín, không có cạnh thẳng. • Hay nhầm: gọi hình chỉ dựa vào màu hoặc hướng đặt.',N'Ví dụ: Một tấm bìa có 3 cạnh thẳng. 1) Đếm được 3 cạnh. 2) Hình có 3 cạnh là hình tam giác. 3) Xoay tấm bìa thì hình vẫn là tam giác.'),
  (1,'place-value',N'Số có hàng chục và hàng đơn vị',N'Mười đơn vị có thể bó lại thành một chục. Nhờ chia số thành chục và đơn vị, em đọc, viết và so sánh số dễ hơn.',N'• 1 chục = 10 đơn vị. • Trong số có hai chữ số, chữ số bên trái chỉ số chục; chữ số bên phải chỉ số đơn vị. • 47 = 40 + 7. • Hay nhầm: đảo vị trí hai chữ số; 47 không phải 7 chục và 4 đơn vị.',N'Ví dụ: Số 63. 1) Tách thành 6 bó chục và 3 đơn vị rời. 2) Viết 63 = 60 + 3. 3) Đọc là sáu mươi ba. Khi so sánh 56 và 65, so hàng chục trước: 5 chục ít hơn 6 chục, nên 56 < 65.'),
  (1,'measurement',N'Dùng thước để đo độ dài',N'Đo là so sánh độ dài của vật với một đơn vị. Thước có vạch chia giúp mọi người cùng đọc được số đo như nhau.',N'• Đặt vạch 0 ở đúng đầu đoạn cần đo. • Đọc vạch trùng với đầu còn lại. • Ghi kèm đơn vị, chẳng hạn cm. • Nếu đầu vật không đặt ở 0, lấy số ở cuối trừ số ở đầu. • Hay nhầm: đếm vạch thay vì đếm khoảng cách giữa hai vạch.',N'Ví dụ: Đoạn thẳng bắt đầu ở vạch 2 cm và kết thúc ở vạch 8 cm. 1) Xác định hai vạch đầu cuối. 2) Tính 8 − 2 = 6. Vậy đoạn thẳng dài 6 cm, không phải 8 cm.'),
  (2,'addition',N'Cộng và trừ theo hàng',N'Các số có hàng trăm, chục và đơn vị. Đặt tính thẳng cột giúp em cộng hoặc trừ đúng từng hàng; khi một hàng chưa đủ hoặc vượt quá 10, cần đổi chục và đơn vị phù hợp.',N'• Viết đơn vị dưới đơn vị, chục dưới chục, trăm dưới trăm. • Cộng từ hàng đơn vị sang trái; đủ 10 đơn vị thì đổi thành 1 chục. • Khi trừ, nếu chưa đủ đơn vị có thể đổi 1 chục thành 10 đơn vị. • Hay nhầm: quên cộng phần nhớ hoặc viết lệch cột.',N'Ví dụ: 246 + 178. 1) Hàng đơn vị: 6 + 8 = 14, viết 4, nhớ 1 chục. 2) Hàng chục: 4 + 7 + 1 = 12 chục, viết 2 chục, nhớ 1 trăm. 3) Hàng trăm: 2 + 1 + 1 = 4. Kết quả là 424. Ước lượng 246 + 178 gần 250 + 180 = 430, nên 424 hợp lý.'),
  (2,'multiplication',N'Phép nhân là các nhóm bằng nhau',N'Khi có nhiều nhóm cùng số lượng, phép nhân viết gọn phép cộng lặp. Tranh hoặc đồ vật xếp thành hàng giúp em thấy rõ số nhóm và số đồ vật trong mỗi nhóm.',N'• Số nhóm × số phần tử mỗi nhóm = tất cả. • 4 × 3 có thể hiểu là 4 nhóm, mỗi nhóm 3: 3 + 3 + 3 + 3. • Bảng nhân 2 và 5 giúp tính nhanh; dùng đồ vật để hiểu trước khi học thuộc. • Hay nhầm: nhân số nhóm với số phần tử nhưng không kiểm tra ý nghĩa tình huống.',N'Ví dụ: Có 5 đĩa, mỗi đĩa 3 quả cam. 1) Vẽ hoặc xếp 5 nhóm, mỗi nhóm 3 quả. 2) Cộng lặp 3 + 3 + 3 + 3 + 3 = 15. 3) Viết phép nhân 5 × 3 = 15. Vậy có 15 quả cam.'),
  (2,'time',N'Đọc giờ trên đồng hồ',N'Kim ngắn cho biết giờ, kim dài cho biết phút. Quan sát vị trí của cả hai kim để đọc giờ; một vòng của kim phút tương ứng 60 phút.',N'• Kim phút ở số 12 là đúng giờ. • Mỗi số trên mặt đồng hồ cách nhau 5 phút khi đọc kim phút. • Kim phút ở số 6 là 30 phút. • Hay nhầm: nhìn kim dài như kim giờ hoặc quên nói phút.',N'Ví dụ: Kim ngắn ở giữa số 4 và 5, kim dài chỉ số 6. 1) Kim dài chỉ 6 nên là 6 × 5 = 30 phút. 2) Kim ngắn đã qua số 4 nhưng chưa đến 5. Đồng hồ chỉ 4 giờ 30 phút.'),
  (2,'place-value',N'Số có ba chữ số',N'Số đến 1 000 được tạo bởi hàng trăm, hàng chục và hàng đơn vị. Chữ số 0 giữ chỗ cho hàng không có đơn vị nào, nên không được bỏ tùy ý.',N'• 1 trăm = 10 chục = 100 đơn vị. • 326 = 300 + 20 + 6. • Đọc lần lượt theo các hàng. • Hay nhầm: bỏ số 0 ở giữa, làm thay đổi giá trị số.',N'Ví dụ: Số 508. 1) Có 5 trăm, 0 chục và 8 đơn vị. 2) Viết 508 = 500 + 8. 3) Đọc là năm trăm linh tám. Số 508 khác 58 vì chữ số 0 giữ vị trí hàng chục.'),
  (2,'word-problems',N'Đọc hiểu bài toán có lời văn',N'Không chọn phép tính chỉ vì nhìn thấy một từ khóa. Hãy hình dung chuyện gì xảy ra, xác định điều đã biết và điều cần tìm, rồi mới quyết định tính toán.',N'• Vẽ sơ đồ hoặc ghi tóm tắt các số liệu. • “Thêm vào” thường gợi phép cộng; “còn lại” thường gợi phép trừ; các nhóm bằng nhau có thể gợi phép nhân. • Viết câu trả lời kèm đơn vị. • Hay nhầm: dùng mọi số trong đề mà không xét chúng liên quan thế nào.',N'Ví dụ: Có 3 khay, mỗi khay 4 chiếc bánh. Hỏi có tất cả bao nhiêu chiếc? 1) Nhận ra có 3 nhóm bằng nhau, mỗi nhóm 4. 2) Tính 3 × 4 = 12. 3) Trả lời: Có tất cả 12 chiếc bánh.'),
  (3,'multiplication',N'Nhân số có nhiều chữ số với số có một chữ số',N'Có thể tách số theo hàng để hiểu phép nhân, sau đó đặt tính để làm nhanh hơn. Mỗi tích riêng phải giữ đúng vị trí hàng.',N'• Tách số thành trăm, chục và đơn vị. • Nhân từng phần rồi cộng các kết quả. • Khi đặt tính, làm từ hàng đơn vị và nhớ sang hàng kế tiếp nếu cần. • Hay nhầm: quên phần nhớ hoặc đặt tích riêng sai hàng.',N'Ví dụ: 126 × 3. 1) Tách 126 = 100 + 20 + 6. 2) Nhân từng phần: 100 × 3 = 300; 20 × 3 = 60; 6 × 3 = 18. 3) Cộng 300 + 60 + 18 = 378. Vậy 126 × 3 = 378.'),
  (3,'division',N'Chia đều và chia có dư',N'Phép chia có thể cho biết mỗi nhóm nhận được bao nhiêu hoặc có thể chia thành bao nhiêu nhóm. Nếu không chia đều hết, phần còn lại gọi là số dư.',N'• Số bị chia : số chia = thương, có thể còn số dư. • Số dư phải bé hơn số chia; nếu không, vẫn chia thêm được một nhóm. • Kiểm tra: số chia × thương + số dư = số bị chia. • Hay nhầm: viết số dư lớn bằng số chia.',N'Ví dụ: 29 chiếc kẹo chia đều cho 4 bạn. 1) Mỗi bạn nhận 7 chiếc vì 4 × 7 = 28. 2) Còn 29 − 28 = 1 chiếc. 3) Viết 29 : 4 = 7 dư 1; số dư 1 nhỏ hơn số chia 4. Kiểm tra: 4 × 7 + 1 = 29.'),
  (3,'fractions',N'Phân số chỉ các phần bằng nhau',N'Khi một đơn vị được chia thành các phần bằng nhau, phân số cho biết có bao nhiêu phần được lấy. Có thể dùng miếng giấy gấp hoặc hình vẽ để kiểm tra các phần có bằng nhau không.',N'• Mẫu số cho biết đơn vị được chia thành mấy phần bằng nhau. • Tử số cho biết lấy mấy phần. • Mẫu số không được bằng 0. • Hay nhầm: chia hình thành các phần không bằng nhau rồi vẫn gọi là phân số của các phần ấy.',N'Ví dụ: Một dải giấy được chia thành 8 phần bằng nhau và tô 3 phần. 1) Tổng số phần bằng nhau là 8, nên mẫu số là 8. 2) Có 3 phần được tô, nên tử số là 3. 3) Phần được tô viết là 3/8. Trong bài này, ta đọc và biểu diễn phân số bằng hình, chưa cộng các phân số.'),
  (3,'expressions',N'Tính biểu thức theo đúng thứ tự',N'Khi một biểu thức có nhiều phép tính, làm theo cùng một thứ tự sẽ giúp mọi người nhận được một kết quả giống nhau.',N'• Làm phép tính trong ngoặc trước. • Nhân và chia trước cộng và trừ. • Nếu cùng mức ưu tiên, làm từ trái sang phải. • Hay nhầm: cứ tính từ trái sang phải dù phép nhân hoặc chia còn chưa làm.',N'Ví dụ: 36 − 12 : 3. 1) Làm phép chia trước: 12 : 3 = 4. 2) Tính phép trừ còn lại: 36 − 4 = 32. Vậy giá trị biểu thức là 32. Nếu có ngoặc (36 − 12) : 3 thì kết quả là 8, nên dấu ngoặc làm thay đổi thứ tự.'),
  (3,'divisibility',N'Mở rộng: nhận biết phép chia hết',N'Khi chia một số thành các nhóm bằng nhau, phép chia hết là phép chia không còn phần dư. Hãy bắt đầu bằng cách thử chia hoặc xếp nhóm; dấu hiệu chỉ là cách kiểm tra nhanh.',N'• Chia hết cho 2: chữ số cuối là 0, 2, 4, 6 hoặc 8. • Chia hết cho 5: chữ số cuối là 0 hoặc 5. • Chia hết cho 3: tổng các chữ số chia hết cho 3. • Đây là phần khám phá thêm; không thay cho việc hiểu phép chia và kiểm tra số dư.',N'Ví dụ: Kiểm tra 246 có chia hết cho 3 không. 1) Cộng các chữ số: 2 + 4 + 6 = 12. 2) 12 chia hết cho 3, nên 246 chia hết cho 3. 3) Có thể kiểm tra lại bằng phép chia: 246 : 3 = 82, không dư.'),
  (3,'geometry',N'Quan sát góc, đoạn thẳng và chu vi',N'Hình học giúp em mô tả vị trí, đường đi và hình dạng. Khi tính chu vi, em đang đo cả đường bao quanh hình, không phải phần mặt bên trong.',N'• Góc vuông giống góc của tờ giấy; ê-ke giúp kiểm tra. • Chu vi là tổng độ dài các cạnh bao quanh hình. • Hình vuông có 4 cạnh bằng nhau; hình chữ nhật có hai chiều dài và hai chiều rộng. • Hay nhầm: dùng đơn vị vuông cm² cho chu vi.',N'Ví dụ: Hình chữ nhật dài 8 cm, rộng 3 cm. 1) Có hai cạnh dài và hai cạnh rộng. 2) Tính 8 + 3 + 8 + 3 = 22. 3) Chu vi là 22 cm. Nếu đề hỏi diện tích thì mới tính 8 × 3 = 24 cm².'),
  (3,'measurement',N'Chọn và đổi đơn vị đo',N'Đơn vị cho biết ta đang đo độ dài, khối lượng, dung tích hay thời gian. Trước khi cộng hoặc so sánh, các số đo cần cùng loại đại lượng và cùng đơn vị.',N'• 1 m = 100 cm; 1 kg = 1 000 g; 1 giờ = 60 phút. • Đổi đơn vị bằng cách nhân hoặc chia theo mối quan hệ của đúng loại đại lượng. • Hay nhầm: dùng quy tắc 10 cho thời gian hoặc quên đổi một số đo trước khi cộng.',N'Ví dụ: Đổi 2 m và 35 cm về xăng-ti-mét. 1) 2 m = 2 × 100 = 200 cm. 2) Cộng 200 cm + 35 cm = 235 cm. Vậy tổng độ dài là 235 cm.'),
  (4,'fractions',N'Phân số bằng nhau và phép tính',N'Phân số biểu diễn các phần bằng nhau của một đơn vị. Có thể dùng hình hoặc sơ đồ đoạn thẳng để thấy vì sao hai phân số khác cách viết vẫn có thể chỉ cùng một lượng.',N'• Nhân hoặc chia cả tử số và mẫu số cho cùng một số khác 0 sẽ được phân số bằng nó. • Muốn cộng hoặc trừ khác mẫu, quy đồng để các phần có cùng kích thước. • Khi đã cùng mẫu, cộng hoặc trừ tử số và giữ nguyên mẫu. • Hay nhầm: cộng cả tử lẫn mẫu.',N'Ví dụ: 1/2 + 1/4. 1) Chia mỗi nửa thành 2 phần tư, nên 1/2 = 2/4. 2) Cộng các phần tư: 2/4 + 1/4 = 3/4. 3) Vậy tổng là 3/4 chiếc bánh. Mẫu số vẫn là 4 vì ta đang đếm các phần tư.'),
  (4,'multiplication',N'Nhân các số tự nhiên theo giá trị hàng',N'Phép nhân nhiều chữ số có thể hiểu bằng cách tách một thừa số thành chục, đơn vị hoặc các hàng lớn hơn. Cách tách giúp em hiểu các tích riêng đến từ đâu.',N'• Dùng tính chất phân phối: a × (b + c) = a × b + a × c. • Khi đặt tính, viết tích riêng đúng cột. • Ước lượng trước để kiểm tra kết quả. • Hay nhầm: quên nhân với hàng chục hoặc cộng sai các tích riêng.',N'Ví dụ: 36 × 12. 1) Tách 12 = 10 + 2. 2) Tính 36 × 10 = 360 và 36 × 2 = 72. 3) Cộng 360 + 72 = 432. Vậy 36 × 12 = 432. Ước lượng 36 × 10 gần 360 nên kết quả 432 hợp lý.'),
  (4,'geometry',N'Góc, đường thẳng và diện tích hình',N'Đoạn thẳng, góc và các hình phẳng có thể được nhận biết bằng đặc điểm. Khi đo hoặc tính, hãy xác định hình trước, rồi chọn đúng đại lượng và công thức.',N'• Góc nhọn bé hơn góc vuông; góc tù lớn hơn góc vuông nhưng bé hơn góc bẹt. • Hai đường vuông góc tạo góc vuông; hai đường song song không gặp nhau. • Diện tích hình chữ nhật = dài × rộng; hình vuông = cạnh × cạnh. • Hay nhầm: chu vi dùng đơn vị độ dài, diện tích dùng đơn vị vuông.',N'Ví dụ: Sàn hình chữ nhật dài 8 m, rộng 5 m. 1) Đề hỏi phần mặt sàn, nên cần diện tích. 2) Tính 8 × 5 = 40. 3) Diện tích là 40 m². Nếu cần viền quanh sàn thì mới tính chu vi: (8 + 5) × 2 = 26 m.'),
  (4,'sequences',N'Mở rộng: tìm quy luật của dãy số',N'Một dãy số có thể thay đổi theo một quy luật. Để dự đoán số tiếp theo, hãy so sánh nhiều cặp số liên tiếp, không kết luận chỉ từ hai số đầu.',N'• Tính hiệu giữa các số đứng cạnh nhau. • Nếu các hiệu bằng nhau, cộng hiệu đó để tìm số tiếp theo. • Kiểm tra quy luật trên cả dãy. • Đây là hoạt động khám phá tư duy; không cần học công thức số hạng tổng quát hay tổng dãy.',N'Ví dụ: 5, 8, 11, 14, … 1) 8 − 5 = 3; 11 − 8 = 3; 14 − 11 = 3. 2) Mỗi lần tăng 3. 3) Số tiếp theo là 14 + 3 = 17. Kiểm tra: 17 − 14 cũng bằng 3.'),
  (4,'average',N'Trung bình cộng là chia đều',N'Trung bình cộng trả lời câu hỏi: nếu chia đều tổng các giá trị cho mọi đối tượng thì mỗi đối tượng nhận bao nhiêu. Có thể hình dung dàn đều các vật thành những nhóm bằng nhau.',N'• Trung bình cộng = tổng các giá trị : số lượng giá trị. • Tổng = trung bình cộng × số lượng. • Kết quả nằm giữa giá trị bé nhất và lớn nhất. • Hay nhầm: chia tổng cho một giá trị thay vì cho số lượng giá trị.',N'Ví dụ: Ba bạn đọc 7, 8 và 9 trang. 1) Tổng số trang là 7 + 8 + 9 = 24. 2) Có 3 bạn, nên chia 24 : 3 = 8. 3) Trung bình mỗi bạn đọc 8 trang. Kiểm tra: 8 × 3 = 24 trang.'),
  (4,'sum-difference',N'Tìm hai số khi biết tổng và hiệu',N'Sơ đồ đoạn thẳng cho thấy nếu bỏ phần chung của hai số, phần còn lại chính là hiệu. Từ đó có thể tìm số lớn, số bé và kiểm tra lại bằng tổng, hiệu.',N'• Số lớn = (tổng + hiệu) : 2. • Số bé = (tổng − hiệu) : 2. • Tổng và hiệu phải cùng đơn vị. • Hay nhầm: quên chia 2 vì tổng cộng hoặc trừ đã tạo ra hai lần một số.',N'Ví dụ: Tổng 42, hiệu 10. 1) Số lớn = (42 + 10) : 2 = 26. 2) Số bé = (42 − 10) : 2 = 16. 3) Kiểm tra: 26 + 16 = 42 và 26 − 16 = 10.'),
  (4,'planting',N'Khám phá: đếm khoảng và điểm đầu cuối',N'Ở bài toán xếp cây hoặc cột đèn dọc một lối đi, trước tiên hãy vẽ các khoảng giữa các vị trí. Số vị trí phụ thuộc việc có đặt vật ở một hoặc hai đầu hay không.',N'• Có 8 khoảng liên tiếp thì có 9 điểm nếu đặt ở cả hai đầu. • Trên một vòng khép kín, số điểm bằng số khoảng. • Vẽ chấm cho vị trí và gạch nối cho khoảng để tự kiểm tra. • Đây là bài toán khám phá; cần đọc kỹ điều kiện hai đầu.',N'Ví dụ: Trồng cây dọc một lối đi có 4 khoảng bằng nhau và đặt cây ở cả hai đầu. 1) Vẽ 4 đoạn nối liên tiếp. 2) Đếm các đầu mút: có 5 vị trí. 3) Cần 5 cây. Nếu đường khép kín thành vòng thì cách đếm sẽ khác.'),
  (4,'decimals',N'Khám phá trước: phần mười và số thập phân',N'Đây là bài làm quen trước với số thập phân. Có thể hình dung một đơn vị được chia thành 10 phần bằng nhau; một phần viết là 0,1. Nội dung này được học sâu hơn ở lớp tiếp theo.',N'• Chữ số sau dấu phẩy đầu tiên chỉ hàng phần mười. • 3,5 là 3 đơn vị và 5 phần mười. • Có thể viết 3,5 = 3,50 vì thêm số 0 ở cuối không đổi giá trị. • Hay nhầm: coi 3,5 là 3,05 hoặc so sánh theo số lượng chữ số.',N'Ví dụ: So sánh 3,5 và 3,48. 1) Viết cùng số chữ số thập phân: 3,5 = 3,50. 2) So sánh 3,50 với 3,48: phần nguyên và hàng phần mười bằng nhau; hàng phần trăm 0 bé hơn? Ta cần đọc đúng: 3,50 có 5 phần mười, còn 3,48 có 4 phần mười. 3) Vì 5 > 4 nên 3,50 > 3,48.'),
  (4,'word-problems',N'Giải bài toán có nhiều bước',N'Bài toán có nhiều thông tin thường cần làm lần lượt. Hãy mô tả điều xảy ra trước, ghi kết quả trung gian, rồi dùng kết quả đó trả lời câu hỏi cuối.',N'• Đọc câu hỏi cuối để biết cần tìm gì. • Tóm tắt bằng sơ đồ hoặc câu ngắn. • Viết phép tính theo trình tự và ghi đơn vị ở kết quả trung gian. • Hay nhầm: dùng tất cả con số trong một phép tính mà bỏ qua thứ tự sự việc.',N'Ví dụ: Có 4 hộp, mỗi hộp 6 bút; tặng đi 5 bút. 1) Tìm số bút ban đầu: 4 × 6 = 24. 2) Tính số còn lại: 24 − 5 = 19. 3) Trả lời: Còn 19 chiếc bút.'),
  (5,'decimals',N'Đọc, so sánh và tính với số thập phân',N'Số thập phân giúp biểu diễn các phần nhỏ hơn một đơn vị, như mét và xăng-ti-mét hoặc tiền. Mỗi chữ số có giá trị theo vị trí của nó sau dấu phẩy.',N'• Khi cộng, trừ, đặt các dấu phẩy thẳng cột. • Có thể thêm số 0 ở cuối phần thập phân để các hàng thẳng nhau. • Khi nhân, đặt dấu phẩy trong tích theo tổng số chữ số thập phân ở hai thừa số. • Hay nhầm: đặt dấu phẩy theo cảm tính hoặc bỏ đơn vị.',N'Ví dụ: 2,35 + 1,8. 1) Viết 1,8 thành 1,80. 2) Cộng thẳng cột: 2,35 + 1,80 = 4,15. 3) Kiểm tra gần đúng: 2,4 + 1,8 khoảng 4,2 nên 4,15 hợp lý.'),
  (5,'percentage',N'Phần trăm là số phần trong 100',N'Phần trăm mô tả một lượng so với toàn bộ được chia thành 100 phần bằng nhau. Mô hình bảng 100 ô giúp em nhìn thấy 25% là 25 ô trên 100 ô, cũng bằng một phần tư.',N'• Kí hiệu % có nghĩa là “trên 100”. • Tỉ số phần trăm = phần : toàn bộ × 100%. • Muốn tìm a% của một số, có thể tính số đó × a : 100. • Hay nhầm: lấy số phần trăm trừ thẳng vào số ban đầu mà chưa tìm giá trị tương ứng.',N'Ví dụ: Tìm 25% của 80 quyển sách. 1) 25% = 25/100 = 1/4. 2) Tìm một phần tư của 80: 80 : 4 = 20. 3) Vậy 25% của 80 quyển là 20 quyển. Kiểm tra bằng 80 × 25 : 100 = 20.'),
  (5,'division',N'Chia số thập phân',N'Khi số chia là số thập phân, ta có thể biến nó thành số tự nhiên bằng cách nhân cả số bị chia và số chia với cùng một số 10, 100,… Thương không đổi vì hai số được nhân cùng một lượng.',N'• Dịch dấu phẩy ở cả hai số cùng số hàng. • Chia như phép chia đã biết. • Ước lượng thương trước khi tính. • Kiểm tra bằng thương × số chia = số bị chia. • Hay nhầm: chỉ dịch dấu phẩy ở số chia.',N'Ví dụ: 4,8 : 0,6. 1) Nhân cả hai số với 10 để số chia thành 6. 2) Phép tính trở thành 48 : 6 = 8. 3) Kiểm tra: 8 × 0,6 = 4,8. Vậy 4,8 : 0,6 = 8.'),
  (5,'ratio',N'Tìm hai số khi biết tổng và tỉ số',N'Tỉ số cho biết hai số gồm bao nhiêu phần bằng nhau. Sơ đồ đoạn thẳng giúp em nhìn thấy tổng là toàn bộ các phần được gộp lại.',N'• Vẽ số phần theo tỉ số. • Tổng số phần = cộng số phần của hai số. • Giá trị một phần = tổng : tổng số phần. • Nhân giá trị một phần với số phần tương ứng để tìm mỗi số. • Hay nhầm: chia tổng cho một số trong tỉ số thay vì tổng số phần.',N'Ví dụ: Tỉ số là 2 : 3, tổng hai số là 40. 1) Vẽ 2 phần và 3 phần; tổng cộng 5 phần. 2) Một phần = 40 : 5 = 8. 3) Hai số là 2 × 8 = 16 và 3 × 8 = 24. Kiểm tra: 16 + 24 = 40.'),
  (5,'difference-ratio',N'Tìm hai số khi biết hiệu và tỉ số',N'Sơ đồ đoạn thẳng cho thấy phần hơn của số lớn chính là hiệu. Chia hiệu cho số phần chênh lệch để tìm giá trị một phần.',N'• Xác định số phần của số bé và số lớn. • Hiệu số phần = phần của số lớn − phần của số bé. • Một phần = hiệu : hiệu số phần. • Hay nhầm: chia hiệu cho tổng số phần thay vì hiệu số phần.',N'Ví dụ: Hiệu là 12, tỉ số số bé : số lớn là 1 : 3. 1) Hiệu số phần là 3 − 1 = 2. 2) Một phần = 12 : 2 = 6. 3) Số bé là 6; số lớn là 3 × 6 = 18. Kiểm tra: 18 − 6 = 12.'),
  (5,'units',N'Đổi đơn vị theo từng đại lượng',N'Đổi đơn vị đúng giúp so sánh và tính toán chính xác. Trước tiên nhận biết đại lượng là độ dài, khối lượng, diện tích hay thể tích; mỗi loại có mối quan hệ riêng.',N'• Độ dài và khối lượng thường đổi theo bậc 10. • Diện tích đổi theo bình phương hệ số: 1 m² = 10 000 cm². • Thể tích đổi theo lập phương hệ số: 1 m³ = 1 000 000 cm³. • Hay nhầm: đổi diện tích hoặc thể tích như đổi độ dài.',N'Ví dụ: Đổi 3 m² sang cm². 1) 1 m = 100 cm. 2) Với diện tích, 1 m² = 100 × 100 = 10 000 cm². 3) Vậy 3 m² = 30 000 cm². Không dùng 3 × 100 vì đó là cách đổi độ dài.'),
  (5,'motion',N'Ba đại lượng trong chuyển động đều',N'Khi vật chuyển động đều, quãng đường phụ thuộc vận tốc và thời gian. Trước khi tính, hãy kiểm tra đơn vị có phù hợp với nhau hay không.',N'• Quãng đường = vận tốc × thời gian. • Vận tốc = quãng đường : thời gian. • Thời gian = quãng đường : vận tốc. • Nếu vận tốc là km/giờ thì thời gian cần tính bằng giờ để quãng đường ra km. • Hay nhầm: không đổi phút thành giờ hoặc ghi sai đơn vị.',N'Ví dụ: Một xe đi 150 km trong 3 giờ. 1) Cần tìm vận tốc nên lấy quãng đường chia thời gian. 2) 150 : 3 = 50. 3) Vận tốc là 50 km/giờ. Kiểm tra: 50 × 3 = 150 km.'),
  (5,'geometry-advanced',N'Diện tích hình phẳng và hình khối',N'Công thức chỉ có ý nghĩa khi gắn với đúng hình và đại lượng. Hãy xác định đáy, chiều cao và các kích thước trước khi thay số.',N'• Tam giác: S = đáy × chiều cao : 2. • Hình thang: S = (đáy lớn + đáy bé) × chiều cao : 2. • Hình tròn: C = đường kính × 3,14; S = bán kính × bán kính × 3,14. • Hình hộp chữ nhật: V = dài × rộng × cao; Stp = 2 × (dài × rộng + dài × cao + rộng × cao). • Hình lập phương: V = cạnh × cạnh × cạnh; Stp = 6 × cạnh × cạnh. • Hay nhầm: dùng cạnh nghiêng làm chiều cao hoặc ghi cm² cho thể tích.',N'Ví dụ: Hình hộp chữ nhật dài 4 cm, rộng 3 cm, cao 2 cm. 1) Thể tích = 4 × 3 × 2 = 24 cm³. 2) Diện tích toàn phần = 2 × (4 × 3 + 4 × 2 + 3 × 2) = 52 cm². 3) Kiểm tra đơn vị: thể tích dùng cm³, diện tích dùng cm².'),
  (5,'fractions',N'Ôn tập phân số và phần của một số',N'Phân số biểu diễn các phần bằng nhau của một đơn vị hoặc một nhóm. Hình vẽ giúp em kiểm tra phân số có cùng chỉ một lượng hay không.',N'• Rút gọn bằng cách chia cả tử và mẫu cho cùng một ước chung khác 0. • Muốn cộng hoặc trừ khác mẫu, quy đồng trước. • Tìm phân số của một số: chia số đó cho mẫu rồi nhân với tử. • Hay nhầm: chỉ thay đổi tử hoặc mẫu khi rút gọn.',N'Ví dụ: Tìm 3/4 của 20 chiếc bút. 1) Chia 20 thành 4 phần bằng nhau: 20 : 4 = 5 chiếc mỗi phần. 2) Lấy 3 phần: 5 × 3 = 15. 3) Vậy 3/4 của 20 là 15 chiếc.'),
  (5,'measurement',N'Phân biệt diện tích, thể tích và dung tích',N'Diện tích đo bề mặt; thể tích đo phần không gian vật chiếm chỗ; dung tích cho biết vật chứa được bao nhiêu chất lỏng. Các đại lượng có liên hệ nhưng không dùng chung đơn vị.',N'• Diện tích dùng đơn vị vuông như cm², m². • Thể tích dùng đơn vị khối như cm³, m³. • Dung tích thường dùng lít và mi-li-lít; 1 dm³ = 1 l, 1 cm³ = 1 ml. • Hay nhầm: lấy diện tích đáy rồi gọi là thể tích mà chưa nhân chiều cao.',N'Ví dụ: Hộp dài 5 cm, rộng 3 cm, cao 2 cm. 1) Diện tích đáy là 5 × 3 = 15 cm². 2) Thể tích là 15 × 2 = 30 cm³. 3) Vậy hộp chiếm 30 cm³; cm² chỉ dùng cho phần mặt đáy.'),
  (1,'time',N'Xem giờ đúng và thứ trong tuần',N'Đồng hồ và lịch giúp em biết khi nào một hoạt động bắt đầu và kết thúc. Hãy quan sát kim ngắn, kim dài và tên các ngày trong tuần.',N'• Kim ngắn chỉ giờ; kim dài chỉ phút. • Khi kim dài chỉ số 12 là giờ đúng. • Một tuần có 7 ngày; hôm nay, hôm qua và ngày mai có thứ tự nối tiếp nhau. • Hay nhầm: đọc kim phút thành giờ.',N'Ví dụ: Kim dài ở số 12, kim ngắn ở số 4. 1) Kim dài ở số 12 nên là giờ đúng. 2) Kim ngắn chỉ số 4. 3) Đồng hồ chỉ 4 giờ.'),
  (2,'geometry',N'Điểm, đoạn thẳng và đường gấp khúc',N'Điểm đánh dấu một vị trí. Đoạn thẳng nối hai điểm đầu mút; nhiều đoạn thẳng nối tiếp nhau tạo thành đường gấp khúc.',N'• Đoạn thẳng có hai đầu mút. • Đường gấp khúc gồm các đoạn thẳng nối nhau. • Độ dài đường gấp khúc bằng tổng độ dài các đoạn. • Hay nhầm: chỉ đo đoạn đầu tiên thay vì cộng tất cả các đoạn.',N'Ví dụ: Đường gấp khúc có ba đoạn dài 2 cm, 3 cm và 4 cm. 1) Ghi độ dài từng đoạn. 2) Cộng 2 + 3 + 4 = 9. 3) Đường gấp khúc dài 9 cm.'),
  (2,'measurement',N'Đo độ dài và đổi đơn vị quen thuộc',N'Đơn vị đo cho biết độ dài lớn hay nhỏ. Khi đổi đơn vị, hãy dùng đúng mối quan hệ giữa hai đơn vị rồi mới so sánh hoặc cộng các số đo.',N'• 1 dm = 10 cm; 1 m = 10 dm = 100 cm. • Đặt vạch 0 của thước ở đầu vật. • Đổi các số về cùng đơn vị trước khi tính. • Hay nhầm: cộng số đo cm với dm mà không đổi.',N'Ví dụ: Đổi 2 dm 5 cm thành xăng-ti-mét. 1) 2 dm = 20 cm. 2) Cộng thêm 5 cm: 20 + 5 = 25. 3) Vậy 2 dm 5 cm = 25 cm.'),
  (3,'place-value',N'Đọc số đến 100 000 và làm tròn',N'Số tự nhiên có thể có nhiều hàng. Đọc từ hàng lớn nhất; khi làm tròn, nhìn chữ số ngay bên phải hàng cần làm tròn.',N'• Mỗi hàng bên trái gấp 10 lần hàng liền bên phải. • Tách số thành tổng giá trị các hàng để đọc và viết chính xác. • Chữ số bên phải từ 5 trở lên thì tăng hàng làm tròn thêm 1; dưới 5 thì giữ nguyên. • Hay nhầm: nhìn chữ số ở hàng làm tròn thay vì chữ số đứng ngay sau nó.',N'Ví dụ: Làm tròn 34 268 đến hàng trăm. 1) Hàng trăm là 2; nhìn sang hàng chục là 6. 2) Vì 6 lớn hơn hoặc bằng 5, tăng hàng trăm từ 2 lên 3. 3) Thay hàng chục và đơn vị bằng 0: 34 300.'),
  (4,'place-value',N'Đọc số đến lớp triệu và làm tròn',N'Các chữ số được nhóm thành lớp đơn vị, lớp nghìn và lớp triệu; đọc từng lớp từ trái sang phải giúp không bỏ sót hàng.',N'• Mỗi lớp có hàng trăm, chục và đơn vị. • Tách số theo từng lớp để đọc. • Khi làm tròn đến một hàng, nhìn chữ số liền bên phải: 5–9 thì tăng một đơn vị hàng làm tròn; 0–4 thì giữ nguyên. • Hay nhầm: bỏ qua lớp nghìn hoặc đặt sai số 0.',N'Ví dụ: Làm tròn 2 468 350 đến hàng nghìn. 1) Hàng nghìn là 8; chữ số ngay bên phải ở hàng trăm là 3. 2) Vì 3 bé hơn 5, giữ nguyên hàng nghìn. 3) Thay hàng trăm, chục, đơn vị bằng 0: 2 468 000.'),
  (1,'statistics',N'Phân loại và đếm dữ liệu',N'Thống kê bắt đầu từ câu hỏi gần gũi: lớp mình thích quả nào, có bao nhiêu đồ vật mỗi màu? Ta phân loại theo một tiêu chí rồi đếm để không bỏ sót hoặc đếm trùng.',N'• Chọn một tiêu chí rõ ràng, chẳng hạn màu sắc. • Mỗi đồ vật chỉ được ghi vào một nhóm phù hợp. • Đếm từng nhóm và ghi kết quả. • Hay nhầm: thay đổi tiêu chí giữa chừng hoặc đếm một đồ vật hai lần.',N'Ví dụ: Có 3 quả táo đỏ, 2 quả táo xanh và 1 quả chuối. 1) Chọn tiêu chí là loại quả. 2) Đếm táo: 3 + 2 = 5; chuối: 1. 3) Có 5 quả táo và 1 quả chuối.'),
  (2,'statistics',N'Đọc biểu đồ tranh và so sánh',N'Biểu đồ tranh dùng hình ảnh để trình bày số lượng. Trước khi đếm, hãy đọc chú giải vì một hình có thể biểu thị một vật hoặc nhiều vật.',N'• Đọc tên nhóm và chú giải. • Đếm số hình theo từng nhóm rồi tính tổng nếu cần. • So sánh bằng cách tìm hiệu. • Khả năng xảy ra có thể nói là chắc chắn, có thể hoặc không thể dựa vào tình huống.',N'Ví dụ: Biểu đồ có 4 hình quả táo cho thứ Hai và 3 hình cho thứ Ba; mỗi hình là 1 quả. 1) Thứ Hai có 4 quả. 2) Thứ Ba có 3 quả. 3) Thứ Hai nhiều hơn 4 − 3 = 1 quả.'),
  (3,'statistics',N'Ghi và đọc bảng số liệu',N'Bảng số liệu giúp sắp xếp thông tin để dễ tìm, so sánh và trả lời câu hỏi. Mỗi hàng cần ghi đúng đối tượng và số lượng tương ứng.',N'• Đọc tiêu đề để biết bảng nói về việc gì. • Đối chiếu tên hàng với số liệu cùng hàng. • Có thể tìm tổng hoặc hiệu theo câu hỏi. • Hay nhầm: lấy số ở hàng bên cạnh hoặc cộng những nhóm không được hỏi.',N'Ví dụ: Số quyển sách đọc được là thứ Hai 12, thứ Ba 15, thứ Tư 13. 1) So sánh 12, 15 và 13; số lớn nhất là 15. 2) Vậy thứ Ba đọc nhiều nhất. 3) Thứ Ba nhiều hơn thứ Hai 15 − 12 = 3 quyển.'),
  (4,'statistics',N'Đọc biểu đồ cột',N'Biểu đồ cột dùng chiều cao các cột để so sánh số liệu. Mỗi cột ứng với một nhóm; trục và vạch chia cho biết giá trị.',N'• Đọc tên biểu đồ, nhãn trục và đơn vị. • Tìm vạch ngang ngang đỉnh cột để đọc số. • So sánh các cột hoặc tính tổng, hiệu khi câu hỏi yêu cầu. • Hay nhầm: quên xem mỗi vạch chia ứng với bao nhiêu đơn vị.',N'Ví dụ: Biểu đồ số cây lớp trồng: 3A trồng 12 cây, 3B trồng 18 cây, 3C trồng 15 cây. 1) Đọc số ở đỉnh mỗi cột. 2) Cột 3B cao nhất với 18 cây. 3) 3B trồng nhiều hơn 3A là 18 − 12 = 6 cây.'),
  (5,'statistics',N'Phân tích biểu đồ và khả năng xảy ra',N'Biểu đồ đường hoặc biểu đồ hình quạt giúp nhìn xu hướng và tỉ lệ của dữ liệu. Xác suất thực nghiệm mô tả kết quả quan sát sau khi lặp lại một thử nghiệm.',N'• Đọc tiêu đề, chú giải, đơn vị và từng điểm hoặc phần của biểu đồ. • Tỉ lệ một nhóm = số của nhóm : tổng số. • Xác suất thực nghiệm = số lần sự kiện xảy ra : tổng số lần thử. • Hay nhầm: kết luận chắc chắn về lần sau chỉ từ vài lần thử.',N'Ví dụ: Tung đồng xu 20 lần, mặt ngửa xuất hiện 11 lần. 1) Tổng số lần thử là 20. 2) Tỉ lệ thực nghiệm mặt ngửa là 11/20. 3) Điều này mô tả 20 lần đã thử; không khẳng định lần tung tiếp theo chắc chắn là mặt ngửa.')
;

UPDATE #LearningLessonContent
SET WorkedExample = N'Ví dụ: So sánh 3,5 và 3,48. 1) Viết 3,5 thành 3,50 để dễ so sánh. 2) So sánh hàng phần mười: ở 3,50 là 5, ở 3,48 là 4. 3) Vì 5 > 4 nên 3,50 > 3,48.'
WHERE GradeId = 4 AND TopicCode = 'decimals';

-- Add a progressive statistics and data-literacy lesson to every grade.
INSERT INTO [mk].[Topics] (GradeId, TopicCode, Name)
SELECT seed.GradeId, seed.TopicCode, seed.Name
FROM (VALUES
  (1,'statistics',N'Phân loại và đếm'),
  (1,'time',N'Đồng hồ và lịch'),
  (2,'geometry',N'Đoạn thẳng và đường gấp khúc'),
  (2,'measurement',N'Độ dài và đơn vị đo'),
  (2,'statistics',N'Biểu đồ tranh và so sánh'),
  (3,'place-value',N'Số đến 100 000'),
  (3,'statistics',N'Bảng số liệu'),
  (4,'place-value',N'Số đến lớp triệu'),
  (4,'statistics',N'Biểu đồ cột'),
  (5,'statistics',N'Biểu đồ và xác suất thực nghiệm')
) seed(GradeId,TopicCode,Name)
WHERE NOT EXISTS (SELECT 1 FROM [mk].[Topics] t WHERE t.GradeId = seed.GradeId AND t.TopicCode = seed.TopicCode);

INSERT INTO [mk].[Lessons] (TopicId, Title, Introduction, KeyConcept, WorkedExample, SortOrder)
SELECT t.TopicId, seed.Title, seed.Introduction, seed.KeyConcept, seed.WorkedExample, seed.SortOrder
FROM (VALUES
  (1,'statistics',N'Phân loại và đếm dữ liệu',N'Tập đếm đồ vật theo một tiêu chí rõ ràng.',N'Chọn tiêu chí, xếp từng đồ vật vào đúng nhóm rồi đếm mỗi nhóm một lần.',N'Có 3 quả táo đỏ và 2 quả táo xanh. Có 3 + 2 = 5 quả táo.',6),
  (1,'time',N'Xem giờ đúng và dùng lịch tuần',N'Đồng hồ và lịch giúp em sắp xếp hoạt động hằng ngày. Hãy quan sát kim ngắn, kim dài và thứ tự các ngày.',N'Kim ngắn chỉ giờ; kim dài chỉ phút. Khi kim dài ở số 12 là giờ đúng. Một tuần có 7 ngày. Hay nhầm: đọc kim phút thành kim giờ.',N'Kim dài ở số 12, kim ngắn chỉ số 4: đồng hồ chỉ 4 giờ. Nếu hôm nay là thứ Ba thì ngày mai là thứ Tư.',7),
  (2,'geometry',N'Đoạn thẳng và đường gấp khúc',N'Điểm đánh dấu vị trí; đoạn thẳng nối hai điểm. Nhiều đoạn nối tiếp nhau tạo thành đường gấp khúc.',N'Đoạn thẳng có hai đầu mút. Độ dài đường gấp khúc bằng tổng độ dài các đoạn tạo nên nó. Hay nhầm: chỉ đo một đoạn rồi kết luận độ dài cả đường.',N'Đường gấp khúc gồm ba đoạn dài 2 cm, 3 cm và 4 cm. Cộng 2 + 3 + 4 = 9 cm, vậy cả đường dài 9 cm.',7),
  (2,'measurement',N'Đo độ dài và đổi đơn vị quen thuộc',N'Thước giúp đo độ dài; đơn vị đo giúp mọi người hiểu cùng một kết quả. Khi tính, đổi các số đo về cùng đơn vị trước.',N'1 dm = 10 cm; 1 m = 10 dm = 100 cm. Đặt vạch 0 ở đầu vật. Hay nhầm: cộng số đo dm với cm khi chưa đổi đơn vị.',N'Đổi 2 dm 5 cm sang xăng-ti-mét: 2 dm = 20 cm; 20 + 5 = 25 cm. Vậy độ dài là 25 cm.',8),
  (2,'statistics',N'Đọc biểu đồ tranh',N'Dùng hình ảnh để đọc số lượng và so sánh nhóm.',N'Đọc chú giải trước; mỗi hình có thể biểu thị một hoặc nhiều vật.',N'4 hình quả táo ngày thứ Hai và 3 hình ngày thứ Ba, mỗi hình là 1 quả. Thứ Hai nhiều hơn 4 − 3 = 1 quả.',6),
  (3,'place-value',N'Đọc, viết và làm tròn số đến 100 000',N'Số có nhiều chữ số được đọc từ hàng lớn nhất. Tách số theo giá trị từng hàng giúp em đọc, viết và so sánh chính xác.',N'Mỗi hàng bên trái gấp 10 lần hàng liền bên phải. Khi làm tròn, nhìn chữ số ngay bên phải hàng cần làm tròn: 5–9 thì tăng một đơn vị, 0–4 thì giữ nguyên. Hay nhầm: nhìn nhầm chữ số ở hàng làm tròn.',N'Làm tròn 34 268 đến hàng trăm: hàng trăm là 2, nhìn hàng chục là 6 nên tăng thành 3; thay hàng chục và đơn vị bằng 0. Kết quả là 34 300.',9),
  (3,'statistics',N'Đọc bảng số liệu',N'Sắp xếp kết quả đếm trong một bảng giúp tìm thông tin nhanh.',N'Đọc tiêu đề, tên hàng và số liệu cùng hàng; chỉ cộng hoặc so sánh đúng nhóm được hỏi.',N'Thứ Hai 12 quyển, thứ Ba 15 quyển, thứ Tư 13 quyển. Thứ Ba nhiều nhất; hơn thứ Hai 3 quyển.',8),
  (4,'place-value',N'Đọc và làm tròn số đến lớp triệu',N'Cách nhóm chữ số thành lớp đơn vị, lớp nghìn và lớp triệu giúp đọc các số lớn có hệ thống.',N'Mỗi lớp gồm hàng trăm, chục, đơn vị. Khi làm tròn, nhìn chữ số liền bên phải hàng cần làm tròn; 5–9 tăng một đơn vị, 0–4 giữ nguyên. Hay nhầm: bỏ sót lớp nghìn hoặc viết thiếu số 0.',N'Làm tròn 2 468 350 đến hàng nghìn: chữ số hàng trăm là 3 nên giữ hàng nghìn; thay ba chữ số cuối bằng 0. Kết quả là 2 468 000.',9),
  (4,'statistics',N'Đọc biểu đồ cột',N'Chiều cao cột thể hiện số lượng của từng nhóm.',N'Đọc đơn vị trên trục và xem mỗi vạch chia biểu thị bao nhiêu trước khi so sánh.',N'3A trồng 12 cây, 3B trồng 18 cây, 3C trồng 15 cây. 3B nhiều nhất; hơn 3A là 6 cây.',10),
  (5,'statistics',N'Đọc dữ liệu và xác suất thực nghiệm',N'Biểu đồ giúp so sánh tỉ lệ; thử nghiệm lặp lại giúp mô tả tần suất một sự kiện đã xảy ra.',N'Xác suất thực nghiệm = số lần sự kiện xảy ra : tổng số lần thử. Kết quả này mô tả các lần đã quan sát, không bảo đảm lần tới sẽ giống hệt.',N'Tung đồng xu 20 lần, mặt ngửa xuất hiện 11 lần. Tỉ lệ thực nghiệm là 11/20; không thể kết luận lần tung kế tiếp chắc chắn là mặt ngửa.',11)
) seed(GradeId,TopicCode,Title,Introduction,KeyConcept,WorkedExample,SortOrder)
JOIN [mk].[Topics] t ON t.GradeId = seed.GradeId AND t.TopicCode = seed.TopicCode
WHERE NOT EXISTS (SELECT 1 FROM [mk].[Lessons] l WHERE l.TopicId = t.TopicId);

INSERT INTO [mk].[Questions]
  (TopicId,QuestionText,OptionA,OptionB,OptionC,OptionD,CorrectAnswer,Difficulty,Explanation)
SELECT t.TopicId,seed.QuestionText,seed.OptionA,seed.OptionB,seed.OptionC,seed.OptionD,seed.CorrectAnswer,1,seed.Explanation
FROM (VALUES
  (1,'time',N'Kim phút chỉ số 12, kim giờ chỉ số 7. Mấy giờ?',N'7 giờ',N'12 giờ',N'7 giờ 12 phút',N'12 giờ 7 phút','A',N'Kim dài ở số 12 là đúng giờ; kim ngắn ở số 7 nên là 7 giờ.'),
  (1,'time',N'Một tuần có bao nhiêu ngày?',N'5',N'6',N'7',N'8','C',N'Một tuần có 7 ngày.'),
  (1,'time',N'Hôm nay là thứ Tư. Ngày mai là thứ mấy?',N'Thứ Ba',N'Thứ Năm',N'Thứ Sáu',N'Thứ Hai','B',N'Sau thứ Tư là thứ Năm.'),
  (2,'geometry',N'Đường gấp khúc có các đoạn 2 cm, 3 cm và 4 cm. Dài bao nhiêu?',N'7 cm',N'8 cm',N'9 cm',N'10 cm','C',N'Cộng độ dài các đoạn: 2 + 3 + 4 = 9 cm.'),
  (2,'geometry',N'Đoạn thẳng có mấy đầu mút?',N'1',N'2',N'3',N'4','B',N'Mỗi đoạn thẳng có hai đầu mút.'),
  (2,'geometry',N'Đường gấp khúc gồm 3 đoạn dài 5 cm mỗi đoạn. Tổng độ dài?',N'8 cm',N'10 cm',N'15 cm',N'20 cm','C',N'Có 3 đoạn bằng nhau: 5 + 5 + 5 = 15 cm.'),
  (2,'measurement',N'2 dm bằng bao nhiêu cm?',N'2 cm',N'12 cm',N'20 cm',N'200 cm','C',N'1 dm = 10 cm nên 2 dm = 20 cm.'),
  (2,'measurement',N'2 dm 5 cm bằng bao nhiêu cm?',N'7 cm',N'20 cm',N'25 cm',N'205 cm','C',N'2 dm = 20 cm; 20 + 5 = 25 cm.'),
  (2,'measurement',N'Đo vật bằng thước, nên đặt đầu vật ở đâu?',N'Vạch 0',N'Vạch 1',N'Vạch 5',N'Cuối thước','A',N'Đặt điểm đầu vật trùng vạch 0 để đọc trực tiếp độ dài.'),
  (3,'place-value',N'Số 34 268 có bao nhiêu nghìn?',N'3',N'34',N'342',N'4','B',N'34 268 gồm 34 nghìn, 2 trăm, 6 chục và 8 đơn vị.'),
  (3,'place-value',N'Làm tròn 34 268 đến hàng trăm được?',N'34 200',N'34 260',N'34 300',N'35 000','C',N'Chữ số hàng chục là 6 nên tăng hàng trăm từ 2 lên 3.'),
  (3,'place-value',N'Chữ số 5 trong số 75 412 có giá trị là?',N'5',N'50',N'5 000',N'50 000','C',N'Chữ số 5 ở hàng nghìn nên có giá trị 5 000.'),
  (4,'place-value',N'Số 2 468 350 thuộc lớp nào ở nhóm đầu bên trái?',N'Lớp đơn vị',N'Lớp nghìn',N'Lớp triệu',N'Lớp chục','C',N'Nhóm 2 ở đầu bên trái là lớp triệu.'),
  (4,'place-value',N'Làm tròn 2 468 350 đến hàng nghìn được?',N'2 468 000',N'2 469 000',N'2 470 000',N'2 468 350','A',N'Hàng trăm là 3, nhỏ hơn 5 nên giữ hàng nghìn và thay ba chữ số cuối bằng 0.'),
  (4,'place-value',N'Giá trị chữ số 7 trong 3 725 104 là?',N'7 000',N'70 000',N'700 000',N'7 000 000','C',N'Chữ số 7 đứng ở hàng trăm nghìn nên có giá trị 700 000.'),
  (1,'statistics',N'Có 3 quả táo đỏ và 2 quả táo xanh. Có tất cả bao nhiêu quả táo?',N'4',N'5',N'6',N'2','B',N'Gộp hai nhóm táo: 3 + 2 = 5 quả.'),
  (1,'statistics',N'Có 4 hình ngôi sao và 1 hình trăng. Có bao nhiêu hình ngôi sao?',N'1',N'3',N'4',N'5','C',N'Chỉ đếm nhóm ngôi sao, có 4 hình.'),
  (1,'statistics',N'Để không đếm một đồ vật hai lần, em nên làm gì?',N'Đếm thật nhanh',N'Chuyển đồ đã đếm sang một bên',N'Đổi tiêu chí liên tục',N'Bỏ qua nhóm','B',N'Chuyển đồ đã đếm sang một bên giúp phân biệt đồ đã đếm và chưa đếm.'),
  (2,'statistics',N'Biểu đồ có 4 hình quả táo, mỗi hình là 1 quả. Có bao nhiêu quả?',N'3',N'4',N'5',N'8','B',N'Chú giải cho biết mỗi hình là 1 quả, nên có 4 quả.'),
  (2,'statistics',N'Thứ Hai có 4 hình, thứ Ba có 3 hình; mỗi hình là 1 quyển sách. Thứ Hai nhiều hơn mấy quyển?',N'1',N'2',N'3',N'7','A',N'Lấy 4 − 3 = 1 quyển.'),
  (2,'statistics',N'Khi đọc biểu đồ tranh, em cần xem gì trước?',N'Màu nền',N'Chú giải',N'Tên người vẽ',N'Kích thước giấy','B',N'Chú giải cho biết mỗi hình biểu thị bao nhiêu đơn vị.'),
  (3,'statistics',N'Bảng ghi thứ Hai 12 quyển, thứ Ba 15 quyển. Ngày nào đọc nhiều hơn?',N'Thứ Hai',N'Thứ Ba',N'Bằng nhau',N'Không thể biết','B',N'15 lớn hơn 12 nên thứ Ba đọc nhiều hơn.'),
  (3,'statistics',N'Thứ Hai có 12 quyển, thứ Ba có 15 quyển. Cả hai ngày đọc bao nhiêu quyển?',N'3',N'17',N'27',N'30','C',N'Cộng số liệu hai ngày: 12 + 15 = 27 quyển.'),
  (3,'statistics',N'Thứ Tư có 13 quyển, thứ Hai có 12 quyển. Thứ Tư nhiều hơn mấy quyển?',N'1',N'2',N'12',N'25','A',N'Lấy 13 − 12 = 1 quyển.'),
  (4,'statistics',N'Biểu đồ cột ghi 3A: 12 cây, 3B: 18 cây, 3C: 15 cây. Lớp nào trồng nhiều nhất?',N'3A',N'3B',N'3C',N'Bằng nhau','B',N'18 là số lớn nhất nên lớp 3B trồng nhiều nhất.'),
  (4,'statistics',N'3B trồng 18 cây, 3A trồng 12 cây. 3B trồng nhiều hơn bao nhiêu cây?',N'6',N'12',N'18',N'30','A',N'Hiệu là 18 − 12 = 6 cây.'),
  (4,'statistics',N'Tổng số cây của ba lớp 12, 18 và 15 là bao nhiêu?',N'35',N'40',N'45',N'50','C',N'Cộng 12 + 18 + 15 = 45 cây.'),
  (5,'statistics',N'Tung đồng xu 20 lần, mặt ngửa xuất hiện 11 lần. Tỉ lệ thực nghiệm là?',N'11/20',N'20/11',N'9/20',N'11/9','A',N'Số lần ngửa chia tổng số lần tung là 11/20.'),
  (5,'statistics',N'Trong 20 lần tung, mặt ngửa xuất hiện 11 lần. Ta chắc chắn điều gì về lần tung tiếp theo?',N'Chắc chắn ngửa',N'Chắc chắn sấp',N'Không thể biết chắc kết quả lần tiếp theo',N'Luôn đổi mặt','C',N'Tần suất ở các lần trước không quyết định chắc chắn kết quả của lần kế tiếp.'),
  (5,'statistics',N'Biểu đồ hình quạt có 25% số bạn chọn bơi. 25% bằng phân số nào?',N'1/2',N'1/3',N'1/4',N'3/4','C',N'25% = 25/100 = 1/4.')
) seed(GradeId,TopicCode,QuestionText,OptionA,OptionB,OptionC,OptionD,CorrectAnswer,Explanation)
JOIN [mk].[Topics] t ON t.GradeId = seed.GradeId AND t.TopicCode = seed.TopicCode
WHERE NOT EXISTS (
  SELECT 1 FROM [mk].[Questions] existing
  WHERE existing.TopicId = t.TopicId AND existing.QuestionText = seed.QuestionText
);

-- Expand the theory cards with explanation, steps, memory tips and common mistakes.
-- This UPDATE is intentionally repeatable so existing installations receive the richer content too.
UPDATE l
SET l.Introduction = theory.Introduction,
    l.KeyConcept = theory.KeyConcept,
    l.WorkedExample = theory.WorkedExample
FROM [mk].[Lessons] l
INNER JOIN [mk].[Topics] t ON t.TopicId = l.TopicId
INNER JOIN (VALUES
  (1,'addition',N'Cộng là gộp hai hay nhiều nhóm để tìm tổng. Em có thể đếm tiếp, tách số để tạo thành 10 hoặc đặt các đồ vật thành từng nhóm.',N'• Ý nghĩa: số hạng + số hạng = tổng. • Cách làm: bắt đầu từ số lớn, đếm thêm số bé; hoặc tách số để tạo 10. • Mẹo nhớ: đổi chỗ hai số hạng thì tổng không đổi. • Hay sai: đếm thiếu một bước hoặc quên viết dấu bằng.',N'Bài: 8 + 5. Tách 5 thành 2 và 3: 8 + 2 = 10, rồi 10 + 3 = 13. Vậy 8 + 5 = 13. Kiểm tra bằng cách đếm 9, 10, 11, 12, 13.'),
  (1,'subtraction',N'Trừ là lấy bớt, tìm phần còn lại hoặc tìm khoảng cách giữa hai số. Phép trừ có số bị trừ, số trừ và hiệu.',N'• Cách làm: đọc tình huống để biết cần bớt hay so sánh; đếm lùi hoặc tách số. • Mối liên hệ: số bị trừ = hiệu + số trừ. • Mẹo nhớ: dùng phép cộng để kiểm tra phép trừ. • Hay sai: lấy số bé trừ số lớn hoặc quên đơn vị.',N'Bài: 14 − 6. Lùi 4 bước từ 14 về 10, lùi tiếp 2 bước về 8. Vậy 14 − 6 = 8. Kiểm tra: 8 + 6 = 14.'),
  (1,'geometry',N'Hình học bắt đầu từ việc quan sát đồ vật và nhận biết hình qua cạnh, đỉnh, góc và hình dáng.',N'• Tam giác có 3 cạnh và 3 đỉnh. • Hình vuông có 4 cạnh bằng nhau. • Hình chữ nhật có 4 góc vuông và hai cặp cạnh đối diện bằng nhau. • Hay sai: nhận dạng theo màu hoặc kích thước thay vì đặc điểm hình.',N'Để nhận ra một hình vuông, em đếm 4 cạnh và kiểm tra 4 cạnh có bằng nhau không. Một hình vuông cạnh 5 cm có chu vi 5 + 5 + 5 + 5 = 20 cm.'),
  (1,'place-value',N'Mỗi chữ số có giá trị phụ thuộc vào vị trí. Trong phạm vi 100, ta đọc và phân tích số theo hàng chục và hàng đơn vị.',N'• 1 chục = 10 đơn vị. • Số 47 gồm 4 chục và 7 đơn vị. • Cách phân tích: 47 = 40 + 7. • Hay sai: đảo vị trí chữ số hoặc đọc 40 thành 4 đơn vị.',N'Số 63 có 6 chục và 3 đơn vị. Khi viết thành tổng, 63 = 60 + 3; khi đọc, ta đọc là sáu mươi ba.'),
  (1,'measurement',N'Đo độ dài là so sánh độ dài của vật với một đơn vị đo. Thước giúp đo chính xác bằng cách đọc khoảng cách từ vạch 0 đến cuối đoạn.',N'• Đặt vạch 0 trùng điểm bắt đầu. • Đọc vạch ở điểm kết thúc. • Ghi số kèm đơn vị cm hoặc m. • Muốn so sánh, đổi về cùng đơn vị trước. • Hay sai: đặt đầu vật trùng số 1 hoặc quên đơn vị.',N'Đoạn A dài 8 cm, đoạn B dài 5 cm. A dài hơn B: 8 − 5 = 3 cm. Nếu đoạn bắt đầu ở vạch 2 và kết thúc ở vạch 9 thì độ dài là 9 − 2 = 7 cm.'),
  (2,'addition',N'Ở lớp 2, em cộng trừ số đến 100 bằng cách đặt tính theo cột chục và đơn vị. Khi hàng đơn vị đủ 10, ta nhớ 1 sang hàng chục.',N'• Viết các chữ số cùng hàng thẳng cột. • Cộng từ hàng đơn vị rồi đến hàng chục. • Nếu tổng đơn vị từ 10, viết đơn vị và nhớ 1 chục. • Hay sai: viết lệch cột hoặc quên số nhớ.',N'24 + 18: 4 + 8 = 12, viết 2 nhớ 1; 2 + 1 + 1 = 4. Vậy 24 + 18 = 42. Kiểm tra bằng 42 − 18 = 24.'),
  (2,'multiplication',N'Phép nhân là cách viết gọn của phép cộng các nhóm bằng nhau. Thừa số cho biết số nhóm và số phần tử trong mỗi nhóm; tích là kết quả.',N'• 4 nhóm, mỗi nhóm 3 phần tử viết 4 × 3. • Có thể đổi chỗ thừa số: 4 × 3 = 3 × 4. • Dùng bảng nhân để tính nhanh. • Hay sai: nhầm số nhóm với số phần tử nhưng kết quả thường vẫn phải được kiểm tra bằng cộng lặp.',N'Có 5 túi, mỗi túi 3 viên bi: 3 + 3 + 3 + 3 + 3 = 15, nên 5 × 3 = 15. Khi gặp tranh, hãy đếm số nhóm trước rồi mới chọn phép nhân.'),
  (2,'time',N'Thời gian giúp sắp xếp các hoạt động. Đồng hồ có kim giờ và kim phút; một giờ gồm 60 phút.',N'• Kim ngắn chỉ giờ, kim dài chỉ phút. • Kim phút ở 12 là giờ đúng; ở 3 là 15 phút; ở 6 là 30 phút; ở 9 là 45 phút. • Hay sai: đọc kim phút như kim giờ hoặc quên đổi giờ sang phút.',N'Kim giờ ở 4, kim phút ở 6: 4 giờ 30 phút. Nếu bắt đầu lúc 8 giờ và học 30 phút thì kết thúc lúc 8 giờ 30 phút.'),
  (2,'place-value',N'Số có ba chữ số được tạo bởi hàng trăm, hàng chục và hàng đơn vị. Đọc số theo đúng thứ tự các hàng.',N'• 1 trăm = 10 chục = 100 đơn vị. • Phân tích 326 = 300 + 20 + 6. • Chữ số 0 vẫn giữ vị trí của hàng. • Hay sai: bỏ qua số 0 ở giữa hoặc đọc nhầm giá trị chữ số.',N'508 có 5 trăm, 0 chục và 8 đơn vị. Ta viết 508 = 500 + 8, đọc là năm trăm linh tám.'),
  (2,'word-problems',N'Bài toán có lời văn kể một tình huống bằng chữ. Muốn giải đúng, em cần đọc chậm, xác định dữ kiện và câu hỏi trước khi chọn phép tính.',N'• Bước 1: gạch chân số liệu. • Bước 2: khoanh điều cần tìm. • Bước 3: chọn cộng, trừ hoặc nhân. • Bước 4: viết phép tính, câu trả lời và đơn vị. • Hay sai: làm phép tính đúng nhưng trả lời thiếu đơn vị.',N'Có 24 quyển vở, cho 9 quyển. Tóm tắt: có 24, cho 9, còn lại ?. Phép tính 24 − 9 = 15; đáp số: 15 quyển vở.'),
  (3,'multiplication',N'Nhân số tự nhiên là tính tổng của các nhóm bằng nhau và có thể phân tích số theo hàng để tính thuận tiện.',N'• Nhân với số có một chữ số theo từng hàng. • Có thể tách 12 × 4 = 10 × 4 + 2 × 4. • Ước lượng trước để kiểm tra. • Hay sai: quên cộng phần nhớ hoặc đặt sai hàng.',N'12 × 4 = (10 × 4) + (2 × 4) = 40 + 8 = 48. Ước lượng 12 gần 10, 10 × 4 = 40 nên 48 là kết quả hợp lý.'),
  (3,'division',N'Phép chia dùng để chia đều hoặc tìm xem một số chứa được bao nhiêu nhóm. Số bị chia, số chia, thương và có thể có số dư.',N'• Chia đều: số phần tử trong mỗi nhóm bằng nhau. • Kiểm tra bằng số chia × thương + số dư = số bị chia. • Số dư luôn bé hơn số chia. • Hay sai: quên kiểm tra số dư hoặc chia nhầm bảng nhân.',N'24 ÷ 6 = 4 vì 6 × 4 = 24. Với 25 ÷ 6, thương là 4, dư 1 vì 6 × 4 + 1 = 25 và 1 < 6.'),
  (3,'fractions',N'Phân số mô tả một hoặc nhiều phần bằng nhau của một đơn vị. Tử số cho biết số phần lấy, mẫu số cho biết đơn vị được chia thành bao nhiêu phần.',N'• Mẫu số phải khác 0. • Các phần phải bằng nhau. • Phân số có thể bằng 1 hoặc lớn hơn 1. • Cùng mẫu số thì cộng hoặc trừ tử số, giữ nguyên mẫu. • Hay sai: cộng cả tử và mẫu.',N'3/8 nghĩa là chia một hình thành 8 phần bằng nhau và lấy 3 phần. 3/8 + 2/8 = 5/8, không phải 5/16.'),
  (3,'expressions',N'Biểu thức có nhiều phép tính phải được tính theo thứ tự để mọi người có cùng một kết quả.',N'• Làm trong ngoặc trước. • Sau đó làm nhân và chia từ trái sang phải. • Cuối cùng làm cộng và trừ từ trái sang phải. • Hay sai: tính từ trái sang phải bất kể phép tính.',N'36 − 12 ÷ 3 = 36 − 4 = 32. Nếu có ngoặc, (36 − 12) ÷ 3 = 24 ÷ 3 = 8.'),
  (4,'fractions',N'Cộng trừ phân số cần chú ý mẫu số. Nếu hai phân số khác mẫu, phải quy đồng trước để các phần có cùng kích thước.',N'• Cùng mẫu: cộng hoặc trừ tử, giữ mẫu. • Khác mẫu: tìm mẫu chung, quy đồng rồi tính. • Rút gọn kết quả nếu có thể. • Hay sai: cộng mẫu số hoặc quy đồng một phân số nhưng quên phân số còn lại.',N'1/2 + 1/4. Quy đồng 1/2 = 2/4, sau đó 2/4 + 1/4 = 3/4. Kiểm tra bằng hình: nửa cái bánh cộng một phần tư cái bánh bằng ba phần tư.'),
  (4,'multiplication',N'Nhân số nhiều chữ số dựa trên giá trị hàng. Mỗi tích riêng phải được đặt đúng hàng rồi cộng lại.',N'• Nhân lần lượt với hàng đơn vị, chục, trăm. • Tích nhân với hàng chục lùi sang trái một cột. • Ước lượng để phát hiện sai. • Hay sai: quên lùi hàng khi nhân với chục.',N'36 × 12 = 36 × 10 + 36 × 2 = 360 + 72 = 432. Vì 36 × 12 gần 36 × 10 = 360 nên 432 là hợp lý.'),
  (4,'geometry',N'Chu vi là độ dài đường bao quanh hình; diện tích là phần mặt phẳng bên trong hình. Hai đại lượng có công thức và đơn vị khác nhau.',N'• Hình chữ nhật: P = (dài + rộng) × 2, S = dài × rộng. • Hình vuông: P = cạnh × 4, S = cạnh × cạnh. • Hay sai: dùng đơn vị cm cho diện tích hoặc nhầm chu vi với diện tích.',N'Hình chữ nhật dài 8 cm, rộng 3 cm: P = (8 + 3) × 2 = 22 cm; S = 8 × 3 = 24 cm². Luôn ghi cm cho chu vi và cm² cho diện tích.'),
  (4,'sequences',N'Dãy số có quy luật là các số được sắp xếp theo cách nhất định. Tìm khoảng cách giữa hai số liên tiếp để dự đoán số tiếp theo.',N'• Nếu hiệu không đổi, đó là dãy cách đều. • Số sau = số trước + khoảng cách. • Có thể kiểm tra bằng cách lấy các hiệu liên tiếp. • Hay sai: nhìn một cặp số rồi kết luận khi chưa kiểm tra cả dãy.',N'Dãy 5, 8, 11, 14 có khoảng cách 3, nên số tiếp theo là 17. Số hạng thứ 6 = 5 + 5 × 3 = 20.'),
  (4,'average',N'Trung bình cộng là số nhận được khi chia đều tổng các giá trị cho số lượng giá trị.',N'• Trung bình cộng = tổng : số lượng. • Muốn tìm tổng = trung bình cộng × số lượng. • Kết quả phải nằm giữa số bé nhất và số lớn nhất. • Hay sai: chia cho số lớn nhất thay vì số lượng số.',N'Điểm 7, 8, 9: tổng = 24; có 3 điểm; trung bình cộng = 24 : 3 = 8.'),
  (4,'sum-difference',N'Khi biết tổng và hiệu của hai số, ta có thể dùng sơ đồ đoạn thẳng để tìm số lớn và số bé.',N'• Số lớn = (tổng + hiệu) : 2. • Số bé = (tổng − hiệu) : 2. • Kiểm tra bằng cộng hai số và trừ hai số. • Hay sai: quên chia 2.',N'Tổng 42, hiệu 10: số lớn = (42 + 10) : 2 = 26; số bé = (42 − 10) : 2 = 16. Kiểm tra 26 + 16 = 42 và 26 − 16 = 10.'),
  (5,'decimals',N'Số thập phân gồm phần nguyên và phần thập phân, ngăn cách bởi dấu phẩy. Mỗi chữ số sau dấu phẩy có giá trị theo hàng phần mười, phần trăm, phần nghìn.',N'• Khi cộng trừ, đặt dấu phẩy thẳng cột. • Có thể thêm số 0 ở cuối phần thập phân. • So sánh phần nguyên trước, rồi lần lượt các hàng thập phân. • Hay sai: bỏ dấu phẩy hoặc đặt lệch cột.',N'3,5 + 2,4 = 5,9. Viết 3,50 + 2,40 = 5,90 giúp các hàng phần mười và phần trăm thẳng nhau.'),
  (5,'percentage',N'Phần trăm dùng để mô tả một phần so với toàn bộ khi ta tưởng tượng toàn bộ được chia thành 100 phần bằng nhau. Ta gặp phần trăm khi đọc mức giảm giá, kết quả khảo sát hoặc số câu làm đúng. Kí hiệu % có nghĩa là “trên mỗi 100”.',N'• Hãy hình dung một tấm bảng gồm 10 hàng và 10 cột: có tất cả 100 ô bằng nhau. Nếu tô màu 25 ô thì phần được tô là 25 trong 100 ô, viết là 25/100 hay 25%. • Vì 25/100 rút gọn thành 1/4, nên 25% cũng có nghĩa là một phần tư toàn bộ. Tương tự, 50% là một nửa và 10% là một phần mười. • Phần trăm luôn gắn với “toàn bộ” đang xét: 25% của 80 là một phần tư của 80; 25% của 200 lại là một phần tư của 200. • Khi biết phần và toàn bộ, tỉ số phần trăm = phần ÷ toàn bộ × 100%. Khi tìm a% của một số, có thể đổi a% thành phân số hoặc số thập phân rồi nhân với số đó. • Dễ nhầm: 25% không có nghĩa là lấy đi 25 đơn vị trong mọi tình huống; nó có nghĩa là lấy 25 phần trong 100 phần của toàn bộ.',N'Bài: Tìm 25% của 80 quyển sách. 1) Xác định toàn bộ là 80 quyển. 2) 25% = 25/100 = 1/4, nghĩa là chia 80 quyển thành 4 nhóm bằng nhau rồi lấy 1 nhóm. 3) 80 ÷ 4 = 20. Vậy 25% của 80 quyển là 20 quyển. Kiểm tra: 20 là một phần tư của 80; theo cách tính phần trăm, 80 × 25 ÷ 100 cũng bằng 20.'),
  (5,'division',N'Chia số thập phân cần giữ đúng giá trị hàng. Khi số chia có dấu phẩy, ta có thể dịch dấu phẩy ở cả hai số cùng số chữ số.',N'• Đưa số chia về số tự nhiên bằng cách nhân cả hai số với 10, 100,... • Sau đó thực hiện phép chia. • Kiểm tra bằng thương × số chia. • Hay sai: chỉ dịch dấu phẩy ở một số.',N'4,8 : 0,6 = 48 : 6 = 8. Kiểm tra: 8 × 0,6 = 4,8.'),
  (5,'ratio',N'Tỉ số cho biết mối quan hệ giữa hai đại lượng cùng loại. Với bài toán tổng và tỉ số, sơ đồ đoạn thẳng giúp chia tổng thành các phần bằng nhau.',N'• Cộng số phần trong tỉ số. • Một phần = tổng : tổng số phần. • Mỗi số = một phần × số phần tương ứng. • Hay sai: lấy tổng chia cho một số trong tỉ số thay vì tổng số phần.',N'Tỉ số 2 : 3, tổng 40. Có 5 phần; một phần = 40 : 5 = 8. Hai số là 2 × 8 = 16 và 3 × 8 = 24.'),
  (5,'units',N'Đổi đơn vị là đưa các số đo về cùng một đơn vị trước khi tính. Mỗi loại đại lượng có quy tắc đổi riêng.',N'• Độ dài liền nhau gấp 10 lần. • Diện tích liền nhau gấp 100 lần. • Thể tích liền nhau gấp 1000 lần. • Hay sai: dùng quy tắc 10 lần cho diện tích hoặc thể tích.',N'2,4 km = 2.400 m vì 1 km = 1.000 m. 3 m² = 30.000 cm² vì 1 m² = 10.000 cm².'),
  (5,'motion',N'Bài toán chuyển động đều liên hệ ba đại lượng: quãng đường, vận tốc và thời gian.',N'• Quãng đường = vận tốc × thời gian. • Vận tốc = quãng đường : thời gian. • Thời gian = quãng đường : vận tốc. • Hay sai: không đổi đơn vị thời gian trước khi tính.',N'Xe đi 150 km trong 3 giờ: vận tốc = 150 : 3 = 50 km/giờ. Đi 2 giờ với vận tốc đó: quãng đường = 50 × 2 = 100 km.'),
  (5,'geometry-advanced',N'Hình học lớp 5 kết hợp công thức diện tích, chu vi và thể tích. Trước khi tính, cần xác định hình và đại lượng đề hỏi.',N'• Tam giác: S = đáy × cao : 2. • Hình thang: S = (đáy lớn + đáy bé) × cao : 2. • Hình hộp chữ nhật: V = dài × rộng × cao. • Hay sai: nhầm đơn vị vuông với đơn vị khối.',N'Hình thang có hai đáy 8 cm, 4 cm và cao 5 cm: S = (8 + 4) × 5 : 2 = 30 cm². Hộp 4 × 3 × 2 cm có V = 24 cm³.'),
  (5,'fractions',N'Phân số bằng nhau biểu diễn cùng một lượng dù tử số và mẫu số khác nhau. Rút gọn giúp phân số dễ đọc và dễ so sánh hơn.',N'• Nhân hoặc chia cả tử và mẫu cho cùng một số khác 0. • Phân số tối giản không còn số chung lớn hơn 1. • So sánh có thể quy đồng hoặc đổi về cùng mẫu. • Hay sai: chỉ chia tử hoặc chỉ chia mẫu.',N'6/8 chia cả tử và mẫu cho 2 được 3/4. Vì 3 và 4 không còn cùng chia hết cho số nào lớn hơn 1 nên 3/4 là tối giản.'),
  (5,'measurement',N'Diện tích đo mặt phẳng, thể tích đo phần không gian vật chiếm chỗ. Hai đại lượng này cần dùng đơn vị khác nhau.',N'• Diện tích dùng cm², m². • Thể tích dùng cm³, m³. • Hình hộp chữ nhật: V = dài × rộng × cao. • Hay sai: bỏ một kích thước hoặc ghi sai số mũ của đơn vị.',N'Hình hộp dài 5 cm, rộng 3 cm, cao 2 cm: V = 5 × 3 × 2 = 30 cm³. Nếu chỉ tính 5 × 3 thì đó là diện tích đáy, chưa phải thể tích.')
) theory(GradeId, TopicCode, Introduction, KeyConcept, WorkedExample)
  ON t.GradeId = theory.GradeId AND t.TopicCode = theory.TopicCode;

-- Daily theory bank: extra curriculum topics so every grade has a balanced
-- sequence of theory, worked examples and a small practice set.
INSERT INTO [mk].[Topics] (GradeId, TopicCode, Name)
SELECT seed.GradeId, seed.TopicCode, seed.Name
FROM (VALUES
  (1,'place-value',N'Số và vị trí chữ số'),
  (1,'measurement',N'Đo độ dài và so sánh'),
  (2,'place-value',N'Số có ba chữ số'),
  (2,'word-problems',N'Bài toán có lời văn'),
  (3,'geometry',N'Chu vi hình cơ bản'),
  (3,'measurement',N'Đơn vị đo và thời gian'),
  (4,'decimals',N'Làm quen với số thập phân'),
  (4,'word-problems',N'Bài toán nhiều bước'),
  (5,'fractions',N'Ôn tập phân số'),
  (5,'measurement',N'Đo diện tích và thể tích')
) seed(GradeId, TopicCode, Name)
WHERE NOT EXISTS (SELECT 1 FROM [mk].[Topics] t WHERE t.GradeId = seed.GradeId AND t.TopicCode = seed.TopicCode);

INSERT INTO [mk].[Lessons] (TopicId, Title, Introduction, KeyConcept, WorkedExample, SortOrder)
SELECT t.TopicId, seed.Title, seed.Introduction, seed.KeyConcept, seed.WorkedExample, seed.SortOrder
FROM (VALUES
  (1,'place-value',N'Đọc và viết số trong phạm vi 100',N'Mỗi số gồm các hàng chục và đơn vị. Vị trí của chữ số quyết định giá trị của chữ số đó.',N'Ở số 47, chữ số 4 chỉ 4 chục và chữ số 7 chỉ 7 đơn vị. Vì vậy 47 = 40 + 7.',N'Số 63 gồm 6 chục và 3 đơn vị; đọc là sáu mươi ba.',4),
  (1,'measurement',N'Đo độ dài và so sánh',N'Dùng thước có vạch chia để đo từ điểm bắt đầu đến điểm kết thúc; số đo lớn hơn biểu thị đoạn dài hơn.',N'Một đoạn dài 8 cm và một đoạn dài 5 cm. Vì 8 lớn hơn 5 nên đoạn 8 cm dài hơn 3 cm.',N'Đặt đầu thước trùng vạch 0, đọc vạch ở cuối đoạn rồi ghi đúng đơn vị cm.',5),
  (2,'place-value',N'Số có ba chữ số',N'Số có ba chữ số gồm hàng trăm, hàng chục và hàng đơn vị.',N'326 = 300 + 20 + 6. Chữ số 3 có giá trị 300 vì đứng ở hàng trăm.',N'Số 508 có 5 trăm, 0 chục và 8 đơn vị; không bỏ qua chữ số 0 ở giữa.',4),
  (2,'word-problems',N'Đọc và tóm tắt bài toán',N'Bài toán có lời văn cần xác định điều đã biết, điều cần tìm và phép tính phù hợp.',N'Có 24 quyển vở, cho đi 9 quyển. Số vở còn lại là 24 − 9 = 15 quyển.',N'Gạch chân số liệu, khoanh câu hỏi, viết câu trả lời kèm đơn vị.',5),
  (3,'geometry',N'Chu vi hình vuông và hình chữ nhật',N'Chu vi là độ dài đường bao quanh hình. Hình vuông có bốn cạnh bằng nhau; hình chữ nhật có hai chiều dài và hai chiều rộng.',N'Hình vuông cạnh 6 cm có chu vi 6 × 4 = 24 cm. Hình chữ nhật dài 7 cm, rộng 3 cm có chu vi (7 + 3) × 2 = 20 cm.',N'Đọc kỹ đề để chọn công thức chu vi đúng với hình.',6),
  (3,'measurement',N'Đổi đơn vị đo thông dụng',N'Độ dài, khối lượng và thời gian đều cần ghi đúng đơn vị; 1 m = 100 cm và 1 giờ = 60 phút.',N'2 m = 200 cm; 1 giờ 20 phút = 80 phút.',N'Trước khi tính, đổi các số về cùng một đơn vị.',7),
  (4,'decimals',N'Đọc và so sánh số thập phân',N'Phần nguyên đứng trước dấu phẩy, phần thập phân đứng sau dấu phẩy. Có thể thêm số 0 ở cuối để so sánh.',N'3,5 = 3,50 và 3,50 lớn hơn 3,48 vì cùng phần nguyên, hàng phần mười bằng nhau nhưng 5 phần trăm lớn hơn 4 phần trăm.',N'Đặt dấu phẩy thẳng cột khi cộng trừ số thập phân.',4),
  (4,'word-problems',N'Giải bài toán qua hai bước',N'Bài toán nhiều bước cần xác định việc nào làm trước, ghi kết quả trung gian rồi mới trả lời câu hỏi cuối.',N'Có 4 hộp, mỗi hộp 6 bút; cho bạn 5 bút. Số bút còn lại là 4 × 6 − 5 = 19 bút.',N'Viết từng phép tính kèm lời giải ngắn để không bỏ sót dữ kiện.',5),
  (5,'fractions',N'Phân số bằng nhau và rút gọn',N'Nhân hoặc chia cả tử số và mẫu số cho cùng một số khác 0 thì được phân số bằng phân số đã cho.',N'6/8 = 3/4 vì chia cả 6 và 8 cho 2.',N'Chỉ rút gọn khi tử và mẫu cùng chia hết cho cùng một số.',9),
  (5,'measurement',N'Diện tích và thể tích',N'Diện tích đo phần mặt phẳng; thể tích đo phần không gian một vật chiếm chỗ và dùng đơn vị khối.',N'Hình hộp chữ nhật dài 5 cm, rộng 3 cm, cao 2 cm có thể tích 5 × 3 × 2 = 30 cm³.',N'Chuẩn bị đủ ba kích thước và ghi cm² cho diện tích, cm³ cho thể tích.',10)
) seed(GradeId,TopicCode,Title,Introduction,KeyConcept,WorkedExample,SortOrder)
JOIN [mk].[Topics] t ON t.GradeId = seed.GradeId AND t.TopicCode = seed.TopicCode
WHERE NOT EXISTS (SELECT 1 FROM [mk].[Lessons] l WHERE l.TopicId = t.TopicId);

INSERT INTO [mk].[Questions]
  (TopicId, QuestionText, OptionA, OptionB, OptionC, OptionD, CorrectAnswer, Difficulty, Explanation)
SELECT t.TopicId, seed.QuestionText, seed.OptionA, seed.OptionB, seed.OptionC, seed.OptionD, seed.CorrectAnswer, seed.Difficulty, seed.Explanation
FROM (VALUES
  (1,'place-value',N'Số 34 có mấy chục?',N'3',N'4',N'30',N'34','A',1,N'Chữ số 3 đứng ở hàng chục nên có 3 chục.'),
  (1,'place-value',N'25 = ?',N'2 + 5',N'20 + 5',N'20 + 2',N'25 + 5','B',1,N'25 gồm 2 chục và 5 đơn vị, nên bằng 20 + 5.'),
  (1,'place-value',N'Số nào lớn hơn 39?',N'29',N'38',N'40',N'33','C',1,N'40 lớn hơn 39 một đơn vị.'),
  (1,'measurement',N'Đoạn nào dài hơn?',N'4 cm',N'7 cm',N'2 cm',N'5 cm','B',1,N'7 lớn hơn 4, 2 và 5 nên đoạn 7 cm dài nhất.'),
  (1,'measurement',N'1 m bằng bao nhiêu cm?',N'10 cm',N'50 cm',N'100 cm',N'1000 cm','C',1,N'1 m bằng 100 cm.'),
  (1,'measurement',N'Đoạn 9 cm dài hơn đoạn 6 cm bao nhiêu?',N'2 cm',N'3 cm',N'4 cm',N'15 cm','B',1,N'9 − 6 = 3 cm.'),
  (2,'place-value',N'326 có bao nhiêu trăm?',N'2',N'3',N'6',N'32','B',1,N'Chữ số 3 ở hàng trăm nên có 3 trăm.'),
  (2,'place-value',N'508 = ?',N'500 + 8',N'50 + 8',N'500 + 80',N'5 + 8','A',1,N'508 gồm 5 trăm, 0 chục và 8 đơn vị.'),
  (2,'place-value',N'Số liền sau 699 là?',N'698',N'690',N'700',N'709','C',1,N'Số liền sau 699 là 700.'),
  (2,'word-problems',N'Có 24 quyển vở, cho 9 quyển. Còn lại bao nhiêu?',N'15',N'16',N'33',N'13','A',1,N'Bớt đi nên dùng phép trừ: 24 − 9 = 15.'),
  (2,'word-problems',N'Có 3 túi, mỗi túi 4 quả. Có tất cả?',N'7',N'8',N'12',N'16','C',1,N'Có 3 nhóm 4 quả: 3 × 4 = 12.'),
  (2,'word-problems',N'Một đoạn dài 18 cm, cắt 6 cm. Còn?',N'12 cm',N'14 cm',N'24 cm',N'6 cm','A',1,N'18 − 6 = 12 cm.'),
  (3,'geometry',N'Hình vuông cạnh 5 cm có chu vi?',N'10 cm',N'15 cm',N'20 cm',N'25 cm','C',1,N'Chu vi hình vuông = 5 × 4 = 20 cm.'),
  (3,'geometry',N'Hình chữ nhật dài 8 cm, rộng 2 cm có chu vi?',N'10 cm',N'16 cm',N'20 cm',N'24 cm','C',1,N'(8 + 2) × 2 = 20 cm.'),
  (3,'geometry',N'Chu vi là gì?',N'Phần bên trong hình',N'Đường bao quanh hình',N'Số cạnh hình',N'Một điểm','B',1,N'Chu vi là độ dài đường bao quanh hình.'),
  (3,'measurement',N'2 m bằng?',N'20 cm',N'200 cm',N'2000 cm',N'2 cm','B',1,N'1 m = 100 cm nên 2 m = 200 cm.'),
  (3,'measurement',N'1 giờ 20 phút bằng bao nhiêu phút?',N'60',N'70',N'80',N'120','C',1,N'1 giờ = 60 phút; 60 + 20 = 80 phút.'),
  (3,'measurement',N'3 kg bằng?',N'30 g',N'300 g',N'3000 g',N'3 g','C',1,N'1 kg = 1000 g nên 3 kg = 3000 g.'),
  (4,'decimals',N'Số nào lớn hơn 3,48?',N'3,4',N'3,45',N'3,49',N'2,99','C',1,N'3,49 lớn hơn 3,48 ở hàng phần trăm.'),
  (4,'decimals',N'3,5 viết thành?',N'3,05',N'3,50',N'35',N'0,35','B',1,N'Có thể thêm số 0 ở cuối: 3,5 = 3,50.'),
  (4,'decimals',N'2,4 + 1,3 = ?',N'3,5',N'3,7',N'4,7',N'2,17','B',1,N'Cộng thẳng cột: 2,4 + 1,3 = 3,7.'),
  (4,'word-problems',N'4 hộp, mỗi hộp 6 bút, cho 5 bút. Còn?',N'14',N'19',N'24',N'29','B',1,N'4 × 6 − 5 = 24 − 5 = 19 bút.'),
  (4,'word-problems',N'Có 15 cây, trồng thêm 3 hàng, mỗi hàng 4 cây. Có?',N'27',N'18',N'12',N'24','A',1,N'15 + 3 × 4 = 15 + 12 = 27 cây.'),
  (4,'word-problems',N'Bước đầu khi giải bài toán nhiều bước?',N'Tính ngay',N'Đọc và tóm tắt đề',N'Đoán đáp án',N'Bỏ đơn vị','B',1,N'Cần đọc, xác định dữ kiện và câu hỏi trước khi chọn phép tính.'),
  (5,'fractions',N'6/8 rút gọn bằng?',N'2/3',N'3/4',N'4/6',N'6/4','B',1,N'Chia cả tử và mẫu cho 2 được 3/4.'),
  (5,'fractions',N'Phân số nào bằng 1/2?',N'2/3',N'3/6',N'4/6',N'1/3','B',1,N'3/6 chia cả tử và mẫu cho 3 được 1/2.'),
  (5,'fractions',N'2/5 + 1/5 = ?',N'3/10',N'1/5',N'3/5',N'2/10','C',1,N'Cùng mẫu số nên cộng tử số: 2/5 + 1/5 = 3/5.'),
  (5,'measurement',N'Hình hộp 5 × 3 × 2 cm có thể tích?',N'10 cm³',N'30 cm³',N'15 cm²',N'30 cm²','B',1,N'Thể tích = dài × rộng × cao = 5 × 3 × 2 = 30 cm³.'),
  (5,'measurement',N'Đơn vị của diện tích là?',N'cm',N'cm²',N'cm³',N'kg','B',1,N'Diện tích dùng đơn vị vuông như cm².'),
  (5,'measurement',N'Đơn vị của thể tích là?',N'm',N'm²',N'm³',N'km','C',1,N'Thể tích dùng đơn vị khối như m³.')
) seed(GradeId, TopicCode, QuestionText, OptionA, OptionB, OptionC, OptionD, CorrectAnswer, Difficulty, Explanation)
JOIN [mk].[Topics] t ON t.GradeId = seed.GradeId AND t.TopicCode = seed.TopicCode
WHERE NOT EXISTS (SELECT 1 FROM [mk].[Questions] q WHERE q.TopicId = t.TopicId AND q.QuestionText = seed.QuestionText);

-- Expand the ten additional daily topics after they are inserted above.
UPDATE l
SET l.Introduction = theory.Introduction,
    l.KeyConcept = theory.KeyConcept,
    l.WorkedExample = theory.WorkedExample
FROM [mk].[Lessons] l
INNER JOIN [mk].[Topics] t ON t.TopicId = l.TopicId
INNER JOIN (VALUES
  (1,'place-value',N'Đọc và viết số theo hàng chục và hàng đơn vị. Hãy dùng que tính hoặc đồ vật để nhìn thấy từng nhóm 10.',N'• 1 chục = 10 đơn vị. • 47 = 40 + 7. • Đọc theo thứ tự hàng. • Lỗi thường gặp: đảo chữ số hoặc quên giá trị hàng.',N'Số 63 có 6 chục và 3 đơn vị, nên 63 = 60 + 3 và đọc là sáu mươi ba.'),
  (1,'measurement',N'Dùng thước để đo độ dài từ vạch 0 đến điểm kết thúc, sau đó ghi số cùng đơn vị.',N'• Đặt vạch 0 đúng điểm bắt đầu. • Đọc vạch cuối. • So sánh sau khi đưa về cùng đơn vị. • Lỗi thường gặp: đặt vật từ vạch 1.',N'Đoạn bắt đầu ở vạch 2, kết thúc ở vạch 9 dài 9 − 2 = 7 cm.'),
  (2,'place-value',N'Số có ba chữ số gồm hàng trăm, chục và đơn vị. Chữ số 0 vẫn giữ vị trí của hàng.',N'• 1 trăm = 10 chục. • 326 = 300 + 20 + 6. • Xác định hàng trước khi đọc giá trị chữ số. • Lỗi thường gặp: bỏ qua số 0 ở giữa.',N'508 có 5 trăm, 0 chục và 8 đơn vị, nên viết 508 = 500 + 8.'),
  (2,'word-problems',N'Đọc đề, tóm tắt dữ kiện, xác định câu hỏi rồi chọn phép tính. Cuối cùng phải viết câu trả lời và đơn vị.',N'• Gạch chân số đã biết. • Khoanh điều cần tìm. • Chọn cộng, trừ hoặc nhân theo ý nghĩa. • Lỗi thường gặp: thiếu đơn vị hoặc làm ngược dữ kiện.',N'Có 3 túi, mỗi túi 4 quả: 3 × 4 = 12, đáp số 12 quả.'),
  (3,'geometry',N'Chu vi là độ dài đường bao quanh hình. Chọn công thức theo loại hình và ghi đơn vị độ dài.',N'• Hình vuông P = cạnh × 4. • Hình chữ nhật P = (dài + rộng) × 2. • Kiểm tra đủ các cạnh. • Lỗi thường gặp: dùng công thức diện tích.',N'Hình chữ nhật dài 8 cm, rộng 2 cm: P = (8 + 2) × 2 = 20 cm.'),
  (3,'measurement',N'Đổi đơn vị trước khi tính để các số cùng loại và cùng đơn vị.',N'• 1 m = 100 cm. • 1 kg = 1000 g. • 1 giờ = 60 phút. • Lỗi thường gặp: đổi độ dài theo quy tắc của thời gian.',N'2 m = 200 cm; 1 giờ 20 phút = 60 + 20 = 80 phút.'),
  (4,'decimals',N'Số thập phân có phần nguyên và phần thập phân. So sánh từ phần nguyên rồi đến từng hàng sau dấu phẩy.',N'• Thêm số 0 ở cuối không đổi giá trị. • Đặt dấu phẩy thẳng cột khi tính. • Lỗi thường gặp: so sánh số chữ số thay vì giá trị hàng.',N'3,5 = 3,50; 3,50 > 3,48 vì hàng phần trăm 5 lớn hơn 4.'),
  (4,'word-problems',N'Bài toán nhiều bước cần xác định việc nào xảy ra trước, viết kết quả trung gian rồi dùng kết quả đó cho bước sau.',N'• Đọc theo trình tự câu chuyện. • Mỗi bước có phép tính và đơn vị. • Kiểm tra đáp số có hợp lý. • Lỗi thường gặp: dùng ngay tất cả số trong một phép tính.',N'4 hộp, mỗi hộp 6 bút, cho 5 bút: 4 × 6 = 24; 24 − 5 = 19 bút.'),
  (5,'fractions',N'Phân số bằng nhau biểu diễn cùng một lượng. Rút gọn bằng cách chia cả tử và mẫu cho cùng một số.',N'• Tử và mẫu cùng chia cho một số khác 0. • Phân số tối giản không còn ước chung lớn hơn 1. • Lỗi thường gặp: chỉ chia một phần của phân số.',N'6/8 chia cả tử và mẫu cho 2 được 3/4. Kiểm tra bằng nhân ngược: 3 × 2 / 4 × 2 = 6/8.'),
  (5,'measurement',N'Diện tích đo mặt phẳng, thể tích đo không gian. Trước khi tính phải xác định đề hỏi đại lượng nào.',N'• Diện tích dùng đơn vị vuông. • Thể tích dùng đơn vị khối. • Hình hộp chữ nhật V = dài × rộng × cao. • Lỗi thường gặp: thiếu một kích thước hoặc ghi sai đơn vị.',N'Hộp dài 5 cm, rộng 3 cm, cao 2 cm: V = 5 × 3 × 2 = 30 cm³.')
) theory(GradeId, TopicCode, Introduction, KeyConcept, WorkedExample)
  ON t.GradeId = theory.GradeId AND t.TopicCode = theory.TopicCode;

-- Additional lessons adapted from the elementary mathematics summary document.
INSERT INTO [mk].[Lessons] (TopicId, Title, Introduction, KeyConcept, WorkedExample, SortOrder)
SELECT t.TopicId, seed.Title, seed.Introduction, seed.KeyConcept, seed.WorkedExample, seed.SortOrder
FROM (VALUES
  (3,'expressions',N'Tính giá trị biểu thức đúng thứ tự',N'Biểu thức có nhiều phép tính cần làm theo thứ tự để kết quả không bị sai.',N'Làm trong ngoặc trước; sau đó nhân và chia từ trái sang phải; cuối cùng cộng và trừ từ trái sang phải.',N'36 − 12 ÷ 3 = 36 − 4 = 32. Nếu có ngoặc: (36 − 12) ÷ 3 = 24 ÷ 3 = 8.',4),
  (3,'divisibility',N'Nhận biết số chia hết',N'Một vài dấu hiệu giúp kiểm tra nhanh phép chia mà không cần chia dài.',N'Số chia hết cho 2 có chữ số tận cùng chẵn; chia hết cho 5 tận cùng là 0 hoặc 5; chia hết cho 3 khi tổng chữ số chia hết cho 3.',N'246 chia hết cho 3 vì 2 + 4 + 6 = 12 và 12 chia hết cho 3. 246 cũng chia hết cho 2 vì tận cùng là 6.',5),
  (4,'sequences',N'Tìm quy luật dãy số cách đều',N'Dãy cách đều có khoảng cách không đổi giữa hai số liên tiếp.',N'Khoảng cách = số đứng sau − số đứng trước. Số hạng thứ n = số đầu + (n − 1) × khoảng cách. Tổng dãy = (số đầu + số cuối) × số số hạng ÷ 2.',N'Dãy 5, 8, 11, 14,… có khoảng cách 3. Số hạng thứ 6 là 5 + (6 − 1) × 3 = 20. Với dãy 2, 4, 6, tổng là (2 + 6) × 3 ÷ 2 = 12.',4),
  (4,'average',N'Tìm trung bình cộng',N'Trung bình cộng là số đại diện khi chia đều tổng các giá trị.',N'Trung bình cộng = tổng các số ÷ số lượng các số. Muốn tìm tổng, lấy trung bình cộng × số lượng.',N'Điểm 7, 8, 9 có trung bình cộng (7 + 8 + 9) ÷ 3 = 8.',5),
  (4,'sum-difference',N'Tìm hai số khi biết tổng và hiệu',N'Tổng cho biết gộp hai số; hiệu cho biết số lớn hơn số bé bao nhiêu.',N'Số lớn = (tổng + hiệu) ÷ 2. Số bé = (tổng − hiệu) ÷ 2. Luôn thử cộng hai số để kiểm tra lại tổng.',N'Tổng 42, hiệu 10: số lớn = (42 + 10) ÷ 2 = 26; số bé = (42 − 10) ÷ 2 = 16. Kiểm tra: 26 + 16 = 42.',6),
  (4,'planting',N'Giải bài toán trồng cây',N'Đếm số khoảng trước, sau đó xét cây có được trồng ở hai đầu hay không.',N'Trồng ở cả hai đầu: số cây = số khoảng + 1. Trồng một đầu: số cây = số khoảng. Không trồng ở hai đầu: số cây = số khoảng − 1. Trồng khép kín: số cây = số khoảng.',N'Lối đi có 8 khoảng, trồng cây ở cả hai đầu: cần 8 + 1 = 9 cây. Vẽ các điểm và khoảng trên giấy để kiểm tra.',7),
  (5,'ratio',N'Giải bài toán tổng và tỉ số',N'Sơ đồ đoạn thẳng giúp nhìn thấy các phần bằng nhau trước khi tính từng số.',N'Cộng số phần của tỉ số; lấy tổng chia tổng số phần để tìm giá trị một phần; nhân với số phần tương ứng.',N'Tỉ số 2 : 3, tổng 40. Tổng phần 5; mỗi phần 40 ÷ 5 = 8. Hai số là 2 × 8 = 16 và 3 × 8 = 24.',4),
  (5,'difference-ratio',N'Giải bài toán hiệu và tỉ số',N'Dùng sơ đồ đoạn thẳng để biểu diễn hiệu thành số phần bằng nhau.',N'Lấy số phần của số lớn trừ số phần của số bé để tìm hiệu số phần. Một phần = hiệu ÷ hiệu số phần; sau đó nhân với số phần của mỗi số.',N'Hiệu 12, tỉ số số bé : số lớn = 1 : 3. Hiệu phần là 3 − 1 = 2; một phần = 12 ÷ 2 = 6. Hai số là 6 và 18.',5),
  (5,'units',N'Đổi đơn vị đo độ dài và diện tích',N'Đổi đơn vị đúng giúp tránh nhầm giữa độ dài, khối lượng và diện tích.',N'Đơn vị độ dài và khối lượng liền nhau gấp hoặc kém 10 lần. Đơn vị diện tích liền nhau gấp hoặc kém 100 lần; 1 m² = 10.000 cm².',N'2,4 km = 2.400 m; 3 kg = 3.000 g; 3 m² = 30.000 cm². Hãy xác định loại đại lượng trước khi dịch dấu phẩy.',6),
  (5,'motion',N'Bài toán chuyển động đều',N'Ba đại lượng quãng đường, vận tốc và thời gian liên hệ với nhau.',N'Quãng đường = vận tốc × thời gian; vận tốc = quãng đường ÷ thời gian; thời gian = quãng đường ÷ vận tốc. Nhớ ghi đơn vị phù hợp.',N'Xe đi 150 km trong 3 giờ: vận tốc = 150 ÷ 3 = 50 km/giờ. Trong 2 giờ với vận tốc đó, xe đi 50 × 2 = 100 km.',6),
  (5,'geometry-advanced',N'Hình phẳng và hình khối',N'Công thức hình học cần gắn với đúng đại lượng và đơn vị.',N'Tam giác: S = đáy × cao ÷ 2. Hình thang: S = (đáy lớn + đáy bé) × cao ÷ 2. Hình tròn: C = 2 × r × 3,14; S = r × r × 3,14. Hình hộp chữ nhật: V = dài × rộng × cao.',N'Hình thang có hai đáy 8 cm và 4 cm, cao 5 cm: S = (8 + 4) × 5 ÷ 2 = 30 cm². Hộp 4 × 3 × 2 cm có V = 24 cm³; nhớ ghi cm³ cho thể tích.',8)
) seed(GradeId,TopicCode,Title,Introduction,KeyConcept,WorkedExample,SortOrder)
JOIN [mk].[Topics] t ON t.GradeId = seed.GradeId AND t.TopicCode = seed.TopicCode
WHERE NOT EXISTS (SELECT 1 FROM [mk].[Lessons] l WHERE l.TopicId = t.TopicId);

-- Apply staged content after every lesson/topic seed and legacy content update.
UPDATE l
SET l.Title = content.Title,
    l.Introduction = content.Introduction,
    l.KeyConcept = content.KeyConcept,
    l.WorkedExample = content.WorkedExample
FROM [mk].[Lessons] l
INNER JOIN [mk].[Topics] t ON t.TopicId = l.TopicId
INNER JOIN #LearningLessonContent content
  ON content.GradeId = t.GradeId AND content.TopicCode = t.TopicCode;

-- Keep the lesson practice aligned with the concept taught at that grade.
UPDATE q
SET q.IsActive = 0
FROM [mk].[Questions] q
INNER JOIN [mk].[Topics] t ON t.TopicId = q.TopicId
WHERE (t.GradeId = 1 AND t.TopicCode = 'addition' AND q.QuestionText = N'18 + 16 = ?')
   OR (t.GradeId = 1 AND t.TopicCode = 'subtraction' AND q.QuestionText = N'30 − 14 = ?')
   OR (t.GradeId = 1 AND t.TopicCode = 'geometry' AND q.QuestionText = N'Một hình vuông cạnh 5 cm có chu vi bao nhiêu?')
   OR (t.GradeId = 2 AND t.TopicCode = 'multiplication' AND q.QuestionText IN (N'7 × 6 = ?', N'9 × 8 = ?'));

UPDATE q
SET q.QuestionText = N'Một hình được chia thành 8 phần bằng nhau, tô 3 phần. Phân số chỉ phần được tô là?',
    q.OptionA = N'3/8', q.OptionB = N'8/3', q.OptionC = N'5/8', q.OptionD = N'3/5',
    q.CorrectAnswer = 'A', q.Difficulty = 1,
    q.Explanation = N'Mẫu số 8 cho biết có 8 phần bằng nhau; tử số 3 cho biết lấy 3 phần.'
FROM [mk].[Questions] q
INNER JOIN [mk].[Topics] t ON t.TopicId = q.TopicId
WHERE t.GradeId = 3 AND t.TopicCode = 'fractions' AND q.QuestionText = N'3/8 + 2/8 = ?';

UPDATE q
SET q.QuestionText = N'Trong phân số 3/8, mẫu số 8 cho biết điều gì?',
    q.OptionA = N'Có 3 phần bằng nhau', q.OptionB = N'Đơn vị được chia thành 8 phần bằng nhau',
    q.OptionC = N'Lấy 8 phần', q.OptionD = N'Có 8 đơn vị nguyên',
    q.CorrectAnswer = 'B', q.Difficulty = 1,
    q.Explanation = N'Mẫu số cho biết đơn vị được chia thành bao nhiêu phần bằng nhau.'
FROM [mk].[Questions] q
INNER JOIN [mk].[Topics] t ON t.TopicId = q.TopicId
WHERE t.GradeId = 3 AND t.TopicCode = 'fractions' AND q.QuestionText = N'1/4 của 20 là bao nhiêu?';

UPDATE q
SET q.QuestionText = N'Trong phân số 3/8, tử số 3 cho biết điều gì?',
    q.OptionA = N'Có 3 phần được lấy', q.OptionB = N'Có 8 phần được lấy',
    q.OptionC = N'Đơn vị được chia thành 3 phần', q.OptionD = N'Có 3 đơn vị nguyên',
    q.CorrectAnswer = 'A', q.Difficulty = 1,
    q.Explanation = N'Tử số cho biết số phần bằng nhau được lấy; ở đây lấy 3 phần.'
FROM [mk].[Questions] q
INNER JOIN [mk].[Topics] t ON t.TopicId = q.TopicId
WHERE t.GradeId = 3 AND t.TopicCode = 'fractions' AND q.QuestionText = N'2/5 + 1/5 = ?';

DROP TABLE #LearningLessonContent;
