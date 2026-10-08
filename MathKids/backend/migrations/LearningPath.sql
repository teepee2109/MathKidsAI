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
