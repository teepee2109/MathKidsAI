// Supplemental, curriculum-aligned items for objectives missing assessment evidence.
// This is a review draft: all objective links remain pending teacher approval.
const objectiveQuestionOrder = new Map();
const q = (grade, topicCode, objectiveCode, questionText, options, correctIndex, explanation, difficulty) => {
  const questionOrder = (objectiveQuestionOrder.get(objectiveCode) || 0) + 1;
  objectiveQuestionOrder.set(objectiveCode, questionOrder);
  return {
    grade, topicCode, objectiveCode, questionText, options, correctIndex, explanation,
    difficulty: difficulty ?? Math.min(3, questionOrder),
  };
};

export const supplementalTopics = [
  {
    grade: 2, topicCode: "division", name: "Chia đều và chia theo nhóm",
    lesson: {
      title: "Chia đều và chia theo nhóm",
      introduction: "Phép chia giúp em chia một số đồ vật thành các phần bằng nhau hoặc tìm xem lập được bao nhiêu nhóm bằng nhau.",
      keyConcept: "Khi chia đều, số đồ vật trong mỗi phần bằng nhau. Khi chia theo nhóm, số đồ vật mỗi nhóm đã biết và ta tìm số nhóm. Phép chia liên hệ ngược với phép nhân: 12 ÷ 3 = 4 vì 3 × 4 = 12.",
      workedExample: "Có 15 chiếc bánh, xếp mỗi đĩa 5 chiếc. Số đĩa là 15 ÷ 5 = 3 vì 5 × 3 = 15. Thử lại bằng cách đếm 5, 10, 15.",
      sortOrder: 4,
    },
  },
  {
    grade: 2, topicCode: "money", name: "Tiền Việt Nam và mua bán đơn giản",
    lesson: {
      title: "Nhận biết tiền và tính khi mua bán",
      introduction: "Tiền giúp em mua những món đồ cần thiết. Hãy đọc đúng số tiền, cộng giá các món và so sánh với số tiền đã đưa.",
      keyConcept: "Đọc số trên tờ tiền để nhận biết mệnh giá. Tổng tiền là tổng các mệnh giá được ghép lại. Tiền thừa = số tiền đưa − số tiền phải trả; chỉ trừ khi số tiền đưa không ít hơn giá mua.",
      workedExample: "Một quyển vở giá 7 000 đồng. Em đưa tờ 10 000 đồng thì tiền thừa là 10 000 − 7 000 = 3 000 đồng. Có thể kiểm tra: 7 000 + 3 000 = 10 000.",
      sortOrder: 9,
    },
  },
  {
    grade: 4, topicCode: "divisibility", name: "Dấu hiệu chia hết",
    lesson: {
      title: "Dấu hiệu chia hết cho 2, 3, 5 và 9",
      introduction: "Một vài dấu hiệu giúp em kiểm tra nhanh một số có chia hết cho 2, 3, 5 hoặc 9 mà không cần thực hiện phép chia dài.",
      keyConcept: "Số chia hết cho 2 có chữ số tận cùng là 0, 2, 4, 6, 8. Số chia hết cho 5 tận cùng là 0 hoặc 5. Số chia hết cho 3 hoặc 9 khi tổng các chữ số chia hết cho 3 hoặc 9.",
      workedExample: "Xét 1 458: tận cùng là 8 nên chia hết cho 2; tổng chữ số 1 + 4 + 5 + 8 = 18 nên chia hết cho cả 3 và 9; số không tận cùng 0 hoặc 5 nên không chia hết cho 5.",
      sortOrder: 8,
    },
  },
  {
    grade: 4, topicCode: "measurement", name: "Đơn vị diện tích, khối lượng và thời gian",
    lesson: {
      title: "Đo diện tích, khối lượng và thời gian",
      introduction: "Chọn đúng đơn vị giúp em mô tả diện tích, khối lượng và thời gian chính xác. Khi đổi đơn vị, cần nhớ quan hệ giữa hai đơn vị liền kề.",
      keyConcept: "1 m² = 100 dm²; 1 dm² = 100 cm². 1 yến = 10 kg, 1 tạ = 100 kg, 1 tấn = 1 000 kg. Một thế kỉ có 100 năm.",
      workedExample: "Đổi 4 m² sang dm²: vì mỗi 1 m² có 100 dm² nên 4 m² = 4 × 100 = 400 dm². Đổi 2 tạ sang ki-lô-gam: 2 × 100 = 200 kg.",
      sortOrder: 9,
    },
  },
];

export const supplementalQuestions = [
  // Grade 1: addition as combining groups.
  q(1,"addition","G1.ADD.MEANING","Có 4 khối đỏ và 3 khối xanh. Có tất cả bao nhiêu khối?",["6","7","8","9"],1,"Gộp hai nhóm nên cộng: 4 + 3 = 7 khối."),
  q(1,"addition","G1.ADD.MEANING","Mai có 5 nhãn vở, được tặng thêm 2 nhãn. Mai có bao nhiêu nhãn?",["2","3","7","8"],2,"Có thêm nghĩa là gộp vào: 5 + 2 = 7 nhãn."),
  q(1,"addition","G1.ADD.MEANING","Có 3 con chim trên cành, thêm 4 con bay đến. Bây giờ có mấy con?",["6","7","8","9"],1,"Đếm tất cả bằng phép cộng: 3 + 4 = 7 con chim."),

  // Grade 1: subtraction as taking away or finding the difference.
  q(1,"subtraction","G1.SUB.MEANING","Có 9 quả bóng, 3 quả bay đi. Còn lại bao nhiêu quả?",["5","6","7","12"],1,"Lấy đi 3 khỏi 9: 9 − 3 = 6 quả."),
  q(1,"subtraction","G1.SUB.MEANING","Bình có 8 viên bi, cho bạn 5 viên. Bình còn mấy viên?",["2","3","5","13"],1,"Số còn lại bằng số ban đầu trừ số đã cho: 8 − 5 = 3."),
  q(1,"subtraction","G1.SUB.MEANING","Lan có 7 bông hoa, Hà có 4 bông. Lan nhiều hơn Hà mấy bông?",["2","3","4","11"],1,"Tìm phần nhiều hơn bằng phép trừ: 7 − 4 = 3 bông."),

  // Grade 1: spatial position language.
  q(1,"geometry","G1.GEO.POSITION","Trong hàng ghế, An ngồi giữa Bình và Chi. Ai ngồi ở giữa?",["An","Bình","Chi","Không ai"],0,"Câu nói cho biết An ở vị trí nằm giữa Bình và Chi."),
  q(1,"geometry","G1.GEO.POSITION","Quả bóng ở dưới bàn. Vật nào ở phía trên quả bóng?",["Mặt bàn","Sàn nhà","Đôi dép dưới sàn","Không có vật nào"],0,"Mặt bàn nằm cao hơn quả bóng đang ở dưới bàn."),
  q(1,"geometry","G1.GEO.POSITION","Em quay mặt về phía trước. Tay trái của em ở phía nào?",["Bên trái","Bên phải","Phía sau","Phía trên"],0,"Khi nhìn thẳng về trước, tay trái vẫn ở phía bên trái của em."),

  // Grade 1: reading a ruler from its zero mark.
  q(1,"measurement","G1.MEASURE.READ_RULER","Một chiếc bút đặt từ vạch 0 cm đến vạch 8 cm. Bút dài bao nhiêu?",["6 cm","8 cm","9 cm","10 cm"],1,"Đầu bút bắt đầu đúng ở 0 cm nên độ dài là số tại vạch cuối: 8 cm."),
  q(1,"measurement","G1.MEASURE.READ_RULER","Đoạn dây bắt đầu ở vạch 0 và kết thúc ở vạch 6 cm. Dây dài bao nhiêu?",["5 cm","6 cm","7 cm","10 cm"],1,"Đọc vạch cuối khi đầu dây trùng vạch 0: đoạn dây dài 6 cm."),
  q(1,"measurement","G1.MEASURE.READ_RULER","Một que tính có đầu trùng vạch 0 cm, đầu kia trùng vạch 10 cm. Que dài bao nhiêu?",["8 cm","9 cm","10 cm","11 cm"],2,"Độ dài là khoảng từ 0 đến 10, tức 10 cm; không đếm vạch 0 thành một xăng-ti-mét."),

  // Grade 2: equal sharing and grouping division.
  q(2,"division","G2.DIVIDE.MEANING","12 chiếc bánh chia đều cho 3 bạn. Mỗi bạn được mấy chiếc?",["3","4","9","15"],1,"Chia đều 12 thành 3 phần: 12 ÷ 3 = 4 chiếc mỗi bạn."),
  q(2,"division","G2.DIVIDE.MEANING","Có 15 quả cam, xếp mỗi đĩa 5 quả. Xếp được mấy đĩa?",["2","3","5","10"],1,"Tìm số nhóm 5 trong 15: 15 ÷ 5 = 3 đĩa."),
  q(2,"division","G2.DIVIDE.MEANING","Có 10 bông hoa chia đều vào 2 lọ. Mỗi lọ có bao nhiêu bông?",["2","5","8","12"],1,"Chia 10 bông thành 2 phần bằng nhau: 10 ÷ 2 = 5 bông mỗi lọ."),

  // Grade 2: division facts related to the 2 and 5 multiplication tables.
  q(2,"division","G2.DIVIDE.TABLES_2_5","20 ÷ 5 = ?",["2","4","5","15"],1,"Vì 5 × 4 = 20 nên 20 ÷ 5 = 4."),
  q(2,"division","G2.DIVIDE.TABLES_2_5","18 ÷ 2 = ?",["8","9","10","16"],1,"Ta tìm số nhân với 2 được 18; 2 × 9 = 18 nên thương là 9."),
  q(2,"division","G2.DIVIDE.TABLES_2_5","Có 35 chiếc kẹo, chia mỗi túi 5 chiếc. Có bao nhiêu túi?",["5","6","7","8"],2,"Dùng bảng nhân 5: 5 × 7 = 35, vậy 35 ÷ 5 = 7 túi."),

  // Grade 2: solid shapes.
  q(2,"geometry","G2.GEO.SOLIDS","Quả bóng thường có dạng khối nào?",["Khối cầu","Khối hộp chữ nhật","Khối lập phương","Khối trụ"],0,"Quả bóng tròn đều, gần với hình dạng khối cầu."),
  q(2,"geometry","G2.GEO.SOLIDS","Lon nước ngọt thường có dạng khối nào?",["Khối cầu","Khối trụ","Khối lập phương","Hình tam giác"],1,"Lon có hai mặt đáy hình tròn song song và mặt xung quanh cong: đó là khối trụ."),
  q(2,"geometry","G2.GEO.SOLIDS","Hộp quà có 6 mặt đều là hình vuông bằng nhau. Hộp có dạng khối nào?",["Khối cầu","Khối trụ","Khối lập phương","Khối nón"],2,"Khối lập phương có 6 mặt đều là các hình vuông bằng nhau."),

  // Grade 2: practical measurement units.
  q(2,"measurement","G2.MEASURE.UNITS","Khối lượng một bao gạo thường đo bằng đơn vị nào?",["Lít","Ki-lô-gam","Xăng-ti-mét","Độ C"],1,"Ki-lô-gam dùng để đo khối lượng; lít đo dung tích."),
  q(2,"measurement","G2.MEASURE.UNITS","Nước trong chai thường được ghi dung tích bằng đơn vị nào?",["Lít","Mét","Ki-lô-gam","Giờ"],0,"Lít là đơn vị thường dùng để đo dung tích chất lỏng."),
  q(2,"measurement","G2.MEASURE.UNITS","Nhiệt độ cơ thể thường được ghi bằng đơn vị nào?",["Xăng-ti-mét","Ki-lô-gam","Độ C","Lít"],2,"Độ C (°C) dùng để ghi nhiệt độ."),

  // Grade 2: recognize Vietnamese money and simple amounts.
  q(2,"money","G2.MONEY.RECOGNIZE","Tờ tiền ghi số 10 000 đồng có giá trị là bao nhiêu?",["Một nghìn đồng","Mười nghìn đồng","Một trăm nghìn đồng","Mười đồng"],1,"Số 10 000 đọc là mười nghìn, nên tờ tiền có giá trị mười nghìn đồng."),
  q(2,"money","G2.MONEY.RECOGNIZE","Em mua bút giá 7 000 đồng và trả bằng tờ 10 000 đồng. Em nhận lại bao nhiêu?",["2 000 đồng","3 000 đồng","7 000 đồng","17 000 đồng"],1,"Tiền thừa = tiền đưa − giá tiền: 10 000 − 7 000 = 3 000 đồng."),
  q(2,"money","G2.MONEY.RECOGNIZE","Một tờ 5 000 đồng và một tờ 2 000 đồng có tất cả bao nhiêu tiền?",["3 000 đồng","5 000 đồng","7 000 đồng","10 000 đồng"],2,"Cộng giá trị hai tờ tiền: 5 000 + 2 000 = 7 000 đồng."),

  // Grade 2: probability vocabulary.
  q(2,"statistics","G2.PROBABILITY.WORDS","Trong túi chỉ có bóng màu đỏ. Nhắm mắt lấy một quả thì lấy được bóng đỏ là điều gì?",["Chắc chắn","Có thể","Không thể","Chưa biết phép cộng"],0,"Vì tất cả bóng trong túi đều màu đỏ nên lấy được bóng đỏ là chắc chắn."),
  q(2,"statistics","G2.PROBABILITY.WORDS","Trong hộp có bóng đỏ và bóng xanh. Lấy được bóng xanh là điều gì?",["Chắc chắn","Có thể","Không thể","Luôn luôn sai"],1,"Có bóng xanh nhưng không phải tất cả đều xanh, nên việc lấy được bóng xanh là có thể."),
  q(2,"statistics","G2.PROBABILITY.WORDS","Trong hộp chỉ có các khối gỗ, không có viên bi. Lấy được viên bi là điều gì?",["Chắc chắn","Có thể","Không thể","Thường xảy ra"],2,"Không có viên bi nào trong hộp nên không thể lấy được viên bi."),

  // Grade 3: division with remainder.
  q(3,"division","G3.DIVIDE.REMAINDER","23 ÷ 4 bằng bao nhiêu, dư bao nhiêu?",["5 dư 3","6 dư 1","4 dư 7","5 dư 4"],0,"4 × 5 = 20 và 23 − 20 = 3, nên 23 ÷ 4 = 5 dư 3; số dư nhỏ hơn 4."),
  q(3,"division","G3.DIVIDE.REMAINDER","29 ÷ 5 bằng bao nhiêu, dư bao nhiêu?",["5 dư 4","6 dư 1","4 dư 9","5 dư 5"],0,"5 × 5 = 25; còn 29 − 25 = 4, vậy thương 5, dư 4."),
  q(3,"division","G3.DIVIDE.REMAINDER","38 ÷ 6 bằng bao nhiêu, dư bao nhiêu?",["5 dư 8","6 dư 2","6 dư 4","7 dư 1"],1,"6 × 6 = 36 và còn 2; 2 nhỏ hơn số chia 6 nên 38 ÷ 6 = 6 dư 2."),

  // Grade 3: identify and compare angles.
  q(3,"geometry","G3.GEO.ANGLES","Góc vuông có số đo bao nhiêu độ?",["45°","90°","120°","180°"],1,"Góc vuông có số đo 90 độ; có thể kiểm tra bằng ê-ke."),
  q(3,"geometry","G3.GEO.ANGLES","Một góc nhỏ hơn góc vuông là góc gì?",["Góc nhọn","Góc vuông","Góc tù","Góc bẹt"],0,"Góc nhỏ hơn 90° được gọi là góc nhọn."),
  q(3,"geometry","G3.GEO.ANGLES","Một góc 125° lớn hơn góc vuông và nhỏ hơn góc bẹt. Đó là góc gì?",["Góc nhọn","Góc vuông","Góc tù","Góc không"],2,"Vì 90° < 125° < 180° nên đây là góc tù."),

  // Grade 3: circle parts.
  q(3,"geometry","G3.GEO.CIRCLE","Điểm nằm chính giữa hình tròn gọi là gì?",["Tâm","Bán kính","Đường kính","Chu vi"],0,"Điểm cố định ở chính giữa hình tròn được gọi là tâm."),
  q(3,"geometry","G3.GEO.CIRCLE","Đoạn thẳng nối tâm hình tròn với một điểm trên đường tròn gọi là gì?",["Đường kính","Bán kính","Dây cung","Cạnh"],1,"Bán kính nối tâm với một điểm trên đường tròn."),
  q(3,"geometry","G3.GEO.CIRCLE","Đường kính hình tròn dài 10 cm. Bán kính dài bao nhiêu?",["4 cm","5 cm","10 cm","20 cm"],1,"Đường kính bằng hai lần bán kính, nên bán kính = 10 ÷ 2 = 5 cm."),

  // Grade 3: choose smaller measurement units appropriately.
  q(3,"measurement","G3.MEASURE.UNITS","Độ dày của một quyển sách mỏng phù hợp đo bằng đơn vị nào?",["Mi-li-mét","Ki-lô-mét","Tấn","Lít"],0,"Mi-li-mét phù hợp để đo một độ dày nhỏ."),
  q(3,"measurement","G3.MEASURE.UNITS","Khối lượng một quả táo phù hợp ghi bằng đơn vị nào?",["Ki-lô-gam","Gam","Mét","Lít"],1,"Gam thường dùng cho vật nhẹ như một quả táo."),
  q(3,"measurement","G3.MEASURE.UNITS","Một chai nhỏ chứa 250 mi-li-lít nước. Đó là bao nhiêu lít?",["0,025 lít","0,25 lít","2,5 lít","25 lít"],1,"1 lít = 1 000 ml; 250 ml = 250 ÷ 1 000 = 0,25 lít."),

  // Grade 3: read clocks and calendars.
  q(3,"measurement","G3.TIME.CALENDAR","Kim phút chỉ số 6, kim giờ nằm giữa số 3 và 4. Đồng hồ chỉ mấy giờ?",["3 giờ 06 phút","3 giờ 30 phút","6 giờ 30 phút","4 giờ 30 phút"],1,"Kim phút ở số 6 là 30 phút; kim giờ qua số 3 nên là 3 giờ 30 phút."),
  q(3,"measurement","G3.TIME.CALENDAR","Hôm nay là thứ Sáu. Ba ngày nữa là thứ mấy?",["Chủ nhật","Thứ Hai","Thứ Ba","Thứ Tư"],1,"Đếm tiếp ba ngày: thứ Bảy (1), Chủ nhật (2), thứ Hai (3)."),
  q(3,"measurement","G3.TIME.CALENDAR","Tháng có 30 ngày bắt đầu vào thứ Hai. Ngày 8 của tháng đó là thứ mấy?",["Chủ nhật","Thứ Hai","Thứ Ba","Thứ Tư"],1,"Ngày 1 là thứ Hai; ngày 8 cách đúng 7 ngày nên cũng là thứ Hai."),

  // Grade 3: describe outcomes from a small experiment.
  q(3,"statistics","G3.PROBABILITY.EXPERIMENT","Tung đồng xu 10 lần, mặt sấp xuất hiện 6 lần. Mặt sấp xuất hiện mấy lần?",["4 lần","6 lần","10 lần","16 lần"],1,"Đọc kết quả đã ghi: mặt sấp xuất hiện 6 lần trong 10 lần tung."),
  q(3,"statistics","G3.PROBABILITY.EXPERIMENT","Rút thẻ 8 lần, thẻ xanh xuất hiện 3 lần. Có bao nhiêu lần rút được thẻ không xanh?",["3 lần","5 lần","8 lần","11 lần"],1,"Có 8 lần tất cả; không xanh là 8 − 3 = 5 lần."),
  q(3,"statistics","G3.PROBABILITY.EXPERIMENT","Quay vòng quay 12 lần, mũi tên vào ô vàng 4 lần. Phân số số lần vào ô vàng trên tổng số lần thử là?",["1/2","1/3","1/4","4/8"],1,"Tỉ lệ quan sát được là 4/12; rút gọn chia cả tử và mẫu cho 4 được 1/3."),

  // Grade 4: divisibility tests.
  q(4,"divisibility","G4.DIVISIBILITY.TESTS","Số nào chia hết cho cả 2 và 5?",["235","248","370","373"],2,"Số chia hết cho 2 và 5 phải tận cùng bằng 0; trong các lựa chọn, 370 thỏa mãn."),
  q(4,"divisibility","G4.DIVISIBILITY.TESTS","Số 4 572 có chia hết cho 3 không?",["Có, vì 4 + 5 + 7 + 2 = 18 chia hết cho 3","Không, vì tận cùng là 2","Có, vì tận cùng là số chẵn","Không, vì số có 4 chữ số"],0,"Tổng chữ số là 18; 18 chia hết cho 3 nên 4 572 chia hết cho 3."),
  q(4,"divisibility","G4.DIVISIBILITY.TESTS","Số nào chia hết cho 9?",["4 523","4 527","4 529","4 531"],1,"Tổng chữ số 4 + 5 + 2 + 7 = 18, chia hết cho 9; vậy 4 527 chia hết cho 9."),

  // Grade 4: measure angles and identify line relationships.
  q(4,"geometry","G4.GEO.ANGLES_LINES","Góc có số đo 45° là góc gì?",["Góc nhọn","Góc vuông","Góc tù","Góc bẹt"],0,"45° nhỏ hơn 90° nên là góc nhọn."),
  q(4,"geometry","G4.GEO.ANGLES_LINES","Hai đường thẳng cắt nhau tạo thành góc 90°. Chúng là hai đường gì?",["Song song","Vuông góc","Trùng nhau","Cong"],1,"Hai đường thẳng cắt nhau tạo góc vuông được gọi là vuông góc."),
  q(4,"geometry","G4.GEO.ANGLES_LINES","Hai đường thẳng cùng nằm trên một mặt phẳng và không bao giờ cắt nhau là hai đường gì?",["Vuông góc","Song song","Gấp khúc","Cắt nhau"],1,"Hai đường thẳng trong cùng mặt phẳng không giao nhau là hai đường song song."),

  // Grade 4: parallelogram and rhombus properties.
  q(4,"geometry","G4.GEO.PARALLELOGRAM_RHOMBUS","Hình bình hành có đặc điểm nào?",["Hai cặp cạnh đối song song","Chỉ có một cạnh","Bốn góc đều nhọn","Không có cạnh đối"],0,"Hình bình hành có hai cặp cạnh đối song song; các cạnh đối cũng bằng nhau."),
  q(4,"geometry","G4.GEO.PARALLELOGRAM_RHOMBUS","Hình thoi có cạnh dài 6 cm. Chu vi hình thoi bằng bao nhiêu?",["12 cm","18 cm","24 cm","36 cm"],2,"Bốn cạnh hình thoi bằng nhau: chu vi = 4 × 6 = 24 cm."),
  q(4,"geometry","G4.GEO.PARALLELOGRAM_RHOMBUS","Hình bình hành có đáy 8 cm và chiều cao 3 cm. Diện tích là bao nhiêu?",["11 cm²","22 cm²","24 cm²","48 cm²"],2,"Diện tích hình bình hành = đáy × chiều cao = 8 × 3 = 24 cm²."),

  // Grade 4: area unit conversions.
  q(4,"measurement","G4.MEASURE.AREA_UNITS","1 m² bằng bao nhiêu dm²?",["10 dm²","100 dm²","1 000 dm²","10 000 dm²"],1,"Vì 1 m = 10 dm nên 1 m² = 10 × 10 = 100 dm²."),
  q(4,"measurement","G4.MEASURE.AREA_UNITS","3 m² bằng bao nhiêu dm²?",["30 dm²","300 dm²","3 000 dm²","30 000 dm²"],1,"Mỗi mét vuông bằng 100 dm², nên 3 m² = 3 × 100 = 300 dm²."),
  q(4,"measurement","G4.MEASURE.AREA_UNITS","600 dm² bằng bao nhiêu m²?",["6 m²","60 m²","600 m²","6 000 m²"],0,"Đổi dm² sang m² thì chia cho 100: 600 ÷ 100 = 6 m²."),

  // Grade 4: mass and time units.
  q(4,"measurement","G4.MEASURE.MASS_TIME","1 tạ bằng bao nhiêu ki-lô-gam?",["10 kg","100 kg","1 000 kg","10 000 kg"],1,"Một tạ bằng 100 ki-lô-gam."),
  q(4,"measurement","G4.MEASURE.MASS_TIME","3 yến bằng bao nhiêu ki-lô-gam?",["3 kg","13 kg","30 kg","300 kg"],2,"1 yến = 10 kg nên 3 yến = 3 × 10 = 30 kg."),
  q(4,"measurement","G4.MEASURE.MASS_TIME","Một thế kỉ có bao nhiêu năm?",["10 năm","50 năm","100 năm","1 000 năm"],2,"Một thế kỉ bằng 100 năm."),

  // Grade 4: frequencies from repeated trials.
  q(4,"statistics","G4.PROBABILITY.REPEATED_TRIALS","Tung xúc xắc 20 lần, mặt 6 xuất hiện mấy lần nếu kết quả ghi nhận có 4 lần mặt 6?",["2 lần","4 lần","6 lần","16 lần"],1,"Bảng kết quả ghi mặt 6 xuất hiện 4 lần; ta kiểm đếm số lần đã xảy ra."),
  q(4,"statistics","G4.PROBABILITY.REPEATED_TRIALS","Một vòng quay được thử 30 lần; ô xanh xuất hiện 9 lần. Có bao nhiêu lần không vào ô xanh?",["9 lần","21 lần","30 lần","39 lần"],1,"Số lần không vào ô xanh = 30 − 9 = 21 lần."),
  q(4,"statistics","G4.PROBABILITY.REPEATED_TRIALS","Rút thẻ 40 lần, thẻ đỏ xuất hiện 10 lần và thẻ xanh 18 lần. Hai màu này xuất hiện tổng cộng bao nhiêu lần?",["8 lần","18 lần","28 lần","40 lần"],2,"Cộng số lần quan sát của hai màu: 10 + 18 = 28 lần."),

  // Grade 5: mixed numbers.
  q(5,"fractions","G5.FRACTION.MIXED_NUMBER","Phân số 7/3 viết dưới dạng hỗn số là?",["1 1/3","2 1/3","2 2/3","3 1/7"],1,"7 chia 3 được 2 dư 1, nên 7/3 = 2 1/3."),
  q(5,"fractions","G5.FRACTION.MIXED_NUMBER","Hỗn số 3 2/5 viết thành phân số là?",["15/5","16/5","17/5","32/5"],2,"Lấy 3 × 5 + 2 = 17 làm tử số, giữ mẫu 5: 3 2/5 = 17/5."),
  q(5,"fractions","G5.FRACTION.MIXED_NUMBER","Phân số nào bằng hỗn số 1 3/4?",["4/7","5/4","7/4","8/4"],2,"1 3/4 = (1 × 4 + 3)/4 = 7/4."),

  // Grade 5: decimal place value and comparison.
  q(5,"decimals","G5.DECIMAL.PLACE_COMPARE","Trong số 5,38, chữ số 8 ở hàng nào?",["Hàng đơn vị","Hàng phần mười","Hàng phần trăm","Hàng chục"],2,"Chữ số thứ hai bên phải dấu phẩy là hàng phần trăm; 8 có giá trị 8/100."),
  q(5,"decimals","G5.DECIMAL.PLACE_COMPARE","Số nào lớn nhất?",["3,07","3,7","3,17","3,5"],1,"Viết cùng hai chữ số thập phân: 3,07; 3,70; 3,17; 3,50. Lớn nhất là 3,70 = 3,7."),
  q(5,"decimals","G5.DECIMAL.PLACE_COMPARE","Làm tròn 8,46 đến hàng phần mười được số nào?",["8,4","8,5","8,46","9,0"],1,"Chữ số hàng phần trăm là 6 nên tăng hàng phần mười từ 4 lên 5: được 8,5."),

  // Grade 5: volume and capacity relationships.
  q(5,"measurement","G5.MEASURE.CAPACITY_VOLUME","1 dm³ bằng bao nhiêu lít?",["0,1 lít","1 lít","10 lít","100 lít"],1,"Một đề-xi-mét khối bằng đúng 1 lít."),
  q(5,"measurement","G5.MEASURE.CAPACITY_VOLUME","2 500 ml bằng bao nhiêu lít?",["0,25 lít","2,5 lít","25 lít","250 lít"],1,"1 000 ml = 1 lít, nên 2 500 ml = 2,5 lít."),
  q(5,"measurement","G5.MEASURE.CAPACITY_VOLUME","1 cm³ bằng bao nhiêu mi-li-lít?",["1 ml","10 ml","100 ml","1 000 ml"],0,"Một xăng-ti-mét khối tương đương 1 mi-li-lít."),

  // Grade 5: read and compare chart data.
  q(5,"statistics","G5.DATA.CHARTS","Biểu đồ cột ghi số sách đọc: An 12 quyển, Bình 18 quyển, Chi 15 quyển. Ai đọc nhiều nhất?",["An","Bình","Chi","An và Chi"],1,"So sánh 12, 18 và 15; số lớn nhất là 18 nên Bình đọc nhiều nhất."),
  q(5,"statistics","G5.DATA.CHARTS","Biểu đồ ghi lượng mưa (mm): tháng 6 là 40, tháng 7 là 65. Tháng 7 nhiều hơn tháng 6 bao nhiêu mm?",["15 mm","25 mm","40 mm","105 mm"],1,"Hiệu lượng mưa là 65 − 40 = 25 mm."),
  q(5,"statistics","G5.DATA.CHARTS","Biểu đồ tranh có 6 hình ngôi sao, mỗi hình ứng với 5 bạn. Có bao nhiêu bạn?",["11 bạn","25 bạn","30 bạn","35 bạn"],2,"Mỗi hình là 5 bạn nên 6 hình biểu thị 6 × 5 = 30 bạn."),

  // Grade 5: time calculations and elapsed time.
  q(5,"measurement","G5.TIME.OPERATIONS","2 giờ 35 phút + 1 giờ 40 phút bằng bao lâu?",["3 giờ 75 phút","4 giờ 15 phút","4 giờ 25 phút","3 giờ 15 phút"],1,"Cộng phút: 35 + 40 = 75 phút = 1 giờ 15 phút; tổng là 4 giờ 15 phút."),
  q(5,"measurement","G5.TIME.OPERATIONS","5 giờ 10 phút − 2 giờ 25 phút bằng bao lâu?",["2 giờ 45 phút","3 giờ 15 phút","3 giờ 35 phút","2 giờ 35 phút"],0,"Đổi 1 giờ thành 60 phút: 5 giờ 10 phút = 4 giờ 70 phút. Trừ được 2 giờ 45 phút."),
  q(5,"measurement","G5.TIME.OPERATIONS","Phim bắt đầu lúc 14 giờ 20 phút và kết thúc lúc 16 giờ. Phim dài bao lâu?",["1 giờ 20 phút","1 giờ 40 phút","2 giờ 20 phút","2 giờ 40 phút"],1,"Từ 14:20 đến 15:20 là 1 giờ; đến 16:00 thêm 40 phút, tổng 1 giờ 40 phút."),

  // Fill question coverage gaps so each objective has at least three distinct practice items.
  // Grade 1: compare lengths and represent/order numbers.
  q(1,"measurement","G1.MEASURE.COMPARE_LENGTH","Sợi dây đỏ dài 9 cm, dây xanh dài 6 cm. Dây đỏ dài hơn mấy xăng-ti-mét?",["2 cm","3 cm","6 cm","15 cm"],1,"Muốn tìm độ dài hơn bao nhiêu, lấy số đo dài trừ số đo ngắn: 9 − 6 = 3 cm.",1),
  q(1,"place-value","G1.NUMBER.REPRESENT","Số đứng ngay trước 50 là số nào?",["49","50","51","40"],0,"Đếm lùi một đơn vị từ 50: 50 − 1 = 49.",1),
  q(1,"place-value","G1.NUMBER.REPRESENT","Xếp các số 18, 31, 25 theo thứ tự từ bé đến lớn.",["18, 25, 31","18, 31, 25","25, 18, 31","31, 25, 18"],0,"So sánh hàng chục trước: 18 bé nhất; giữa 25 và 31 thì 25 bé hơn. Thứ tự là 18, 25, 31.",2),
  q(1,"place-value","G1.NUMBER.TENS_ONES","Số 47 gồm mấy chục và mấy đơn vị?",["4 chục và 7 đơn vị","7 chục và 4 đơn vị","4 chục và 0 đơn vị","47 chục và 0 đơn vị"],0,"Trong số 47, chữ số 4 ở hàng chục và chữ số 7 ở hàng đơn vị: 47 = 40 + 7.",1),

  // Grade 2: lines, equal groups, unit conversion, multiplication facts and telling time.
  q(2,"geometry","G2.GEO.LINES","Ba điểm A, B, C cùng nằm trên một đường thẳng được gọi là ba điểm gì?",["Thẳng hàng","Cong hàng","Song song","Bằng nhau"],0,"Khi ba điểm cùng thuộc một đường thẳng, ta nói ba điểm đó thẳng hàng.",1),
  q(2,"geometry","G2.GEO.LINES","Điều nào đúng về đường thẳng và đoạn thẳng?",["Đường thẳng kéo dài về hai phía, đoạn thẳng có hai đầu mút","Cả hai đều chỉ có một đầu mút","Đoạn thẳng kéo dài mãi về hai phía","Đường thẳng luôn cong"],0,"Đường thẳng kéo dài mãi về hai phía; đoạn thẳng là một phần của đường thẳng và có hai đầu mút.",2),
  q(2,"geometry","G2.GEO.BROKEN_LINE","Đường gấp khúc gồm ba đoạn dài 6 cm, 8 cm và 3 cm. Đường gấp khúc dài bao nhiêu?",["14 cm","17 cm","18 cm","24 cm"],1,"Độ dài đường gấp khúc bằng tổng độ dài các đoạn: 6 + 8 + 3 = 17 cm.",2),
  q(2,"measurement","G2.MEASURE.CONVERT_LENGTH","Một sợi dây dài 35 cm, nối thêm đoạn dây 2 dm. Tổng độ dài là bao nhiêu xăng-ti-mét?",["37 cm","55 cm","70 cm","235 cm"],1,"Đổi 2 dm = 20 cm, rồi cộng cùng đơn vị: 35 + 20 = 55 cm.",2),
  q(2,"multiplication","G2.MULTIPLY.EQUAL_GROUPS","Có 4 đĩa, mỗi đĩa có 3 quả cam. Có tất cả bao nhiêu quả cam?",["7","12","14","43"],1,"Có 4 nhóm, mỗi nhóm 3 quả: 3 + 3 + 3 + 3 = 4 × 3 = 12 quả.",1),
  q(2,"multiplication","G2.MULTIPLY.EQUAL_GROUPS","Có 5 nhóm ngôi sao, mỗi nhóm 2 ngôi sao. Phép nhân nào biểu thị đúng?",["5 + 2 = 7","5 × 2 = 10","5 − 2 = 3","5 ÷ 2 = 2 dư 1"],1,"Phép nhân biểu thị số nhóm nhân với số phần tử mỗi nhóm: 5 × 2 = 10 ngôi sao.",2),
  q(2,"multiplication","G2.MULTIPLY.TABLES_2_5","Sáu đôi dép có tất cả bao nhiêu chiếc dép?",["8 chiếc","10 chiếc","12 chiếc","14 chiếc"],2,"Mỗi đôi có 2 chiếc; 6 đôi có 6 × 2 = 12 chiếc dép.",1),
  q(2,"time","G2.TIME.READ_5_MINUTES","Kim phút chỉ số 4, kim giờ vừa qua số 8. Đồng hồ chỉ mấy giờ?",["8 giờ 04 phút","8 giờ 20 phút","4 giờ 40 phút","8 giờ 40 phút"],1,"Mỗi số trên mặt đồng hồ ứng với 5 phút khi đọc kim phút. Số 4 là 4 × 5 = 20 phút; giờ là 8.",2),

  // Grade 3: fractions, multiplication and rounding/place value.
  q(3,"fractions","G3.FRACTION.REPRESENT","Một thanh được chia thành 6 phần bằng nhau, tô màu 4 phần. Phân số chỉ phần đã tô là?",["4/6","2/6","6/4","4/2"],0,"Mẫu số 6 cho biết có 6 phần bằng nhau; tử số 4 cho biết đã tô 4 phần. Phân số là 4/6.",1),
  q(3,"fractions","G3.FRACTION.REPRESENT","Hình tròn chia thành 8 phần bằng nhau, có 3 phần được tô. Phân số chỉ phần tô màu là?",["3/8","5/8","8/3","3/5"],0,"Có 3 phần được lấy trong tổng số 8 phần bằng nhau nên viết phân số 3/8.",2),
  q(3,"multiplication","G3.MULTIPLY.MULTI_DIGIT_BY_ONE","32 × 3 = ?",["86","96","906","35"],1,"Tách 32 = 30 + 2: 30 × 3 = 90 và 2 × 3 = 6; cộng lại được 96.",2),
  q(3,"place-value","G3.NUMBER.ROUND","Làm tròn số 7 846 đến hàng chục được số nào?",["7 840","7 850","7 800","8 000"],1,"Xét chữ số hàng đơn vị là 6. Vì 6 lớn hơn hoặc bằng 5, tăng hàng chục lên 1: được 7 850.",1),
  q(3,"place-value","G3.NUMBER.ROUND","Làm tròn số 62 349 đến hàng trăm được số nào?",["62 300","62 400","62 000","63 000"],0,"Xét chữ số hàng chục là 4. Vì 4 bé hơn 5, giữ hàng trăm và thay các chữ số phía sau bằng 0: 62 300.",2),
  q(3,"place-value","G3.NUMBER.TO_100000","Trong số 63 208, chữ số 3 có giá trị là bao nhiêu?",["3","30","300","3 000"],3,"Chữ số 3 ở hàng nghìn nên có giá trị 3 000.",1),

  // Grade 4: equivalent fractions and properties of operations.
  q(4,"fractions","G4.FRACTION.EQUIVALENCE","Phân số nào bằng 3/4?",["6/8","4/8","3/8","6/7"],0,"Nhân cả tử và mẫu của 3/4 với 2 được 6/8, nên hai phân số bằng nhau.",1),
  q(4,"fractions","G4.FRACTION.EQUIVALENCE","Rút gọn phân số 12/16 được phân số nào?",["2/3","3/4","4/5","6/8"],1,"Ước chung lớn nhất của 12 và 16 là 4. Chia cả tử và mẫu cho 4: 12/16 = 3/4.",2),
  q(4,"multiplication","G4.OPERATION.PROPERTIES","7 × (10 + 2) = ?",["7 × 10 + 2 = 72","7 × 10 + 7 × 2 = 84","7 + 10 × 2 = 27","7 × 12 = 74"],1,"Dùng tính chất nhân một số với một tổng: 7 × (10 + 2) = 7 × 10 + 7 × 2 = 70 + 14 = 84.",2),
  q(4,"multiplication","G4.OPERATION.PROPERTIES","32 × 25 × 4 có thể tính nhanh bằng 32 × (25 × 4). Kết quả là?",["800","1 280","3 200","4 000"],2,"Tính nhóm 25 × 4 = 100 trước, rồi 32 × 100 = 3 200. Đây là tính chất kết hợp của phép nhân.",2),

  // Grade 5: decimal division, area, solid measures, percentages and experimental probability.
  q(5,"division","G5.DIVIDE.DECIMAL","Có 2,4 m dây, cắt thành các đoạn dài 0,3 m. Cắt được bao nhiêu đoạn?",["0,8 đoạn","8 đoạn","80 đoạn","72 đoạn"],1,"Ta tính 2,4 ÷ 0,3. Nhân cả số bị chia và số chia với 10: 24 ÷ 3 = 8 đoạn.",2),
  q(5,"geometry-advanced","G5.GEO.AREA","Tam giác có đáy 10 cm và chiều cao 6 cm. Diện tích là bao nhiêu?",["16 cm²","30 cm²","60 cm²","32 cm²"],1,"Diện tích tam giác bằng đáy nhân chiều cao rồi chia 2: 10 × 6 ÷ 2 = 30 cm².",1),
  q(5,"geometry-advanced","G5.GEO.AREA","Hình thang có hai đáy dài 8 cm và 4 cm, chiều cao 3 cm. Diện tích là bao nhiêu?",["18 cm²","24 cm²","36 cm²","12 cm²"],0,"Diện tích hình thang bằng tổng hai đáy nhân chiều cao rồi chia 2: (8 + 4) × 3 ÷ 2 = 18 cm².",2),
  q(5,"geometry-advanced","G5.GEO.SOLID_MEASURES","Hình hộp chữ nhật dài 8 cm, rộng 5 cm, cao 3 cm. Diện tích xung quanh là bao nhiêu?",["39 cm²","78 cm²","158 cm²","120 cm²"],1,"Diện tích xung quanh bằng chu vi đáy nhân chiều cao: 2 × (8 + 5) × 3 = 78 cm².",2),
  q(5,"percentage","G5.PERCENT.RATIO","Trong 60 cây có 15 cây hoa. Tỉ số phần trăm số cây hoa so với tổng số cây là?",["15%","20%","25%","40%"],2,"Tỉ số phần trăm là 15 ÷ 60 × 100% = 25%.",1),
  q(5,"percentage","G5.PERCENT.RATIO","Có 18 học sinh hoàn thành bài trong tổng số 24 học sinh. Tỉ lệ hoàn thành là?",["60%","70%","75%","80%"],2,"Lấy số học sinh hoàn thành chia tổng số: 18 ÷ 24 = 0,75 = 75%.",2),
  q(5,"statistics","G5.PROBABILITY.EXPERIMENTAL","Vòng quay được quay 20 lần, kim vào ô xanh 7 lần. Tỉ số thực nghiệm của số lần vào ô xanh là?",["7/20","13/20","1/2","7/13"],0,"Xác suất thực nghiệm được mô tả bằng số lần sự kiện xảy ra chia tổng số lần thử: 7/20.",2),
];

export const supplementalQuestionMappings = supplementalQuestions.map((item) => ({
  grade: item.grade,
  topicCode: item.topicCode,
  questionText: item.questionText,
  objectiveCode: item.objectiveCode,
  evidenceNote: `Câu hỏi bổ sung dự thảo; cần giáo viên duyệt để xác nhận đo đúng mục tiêu ${item.objectiveCode}.`,
  isPrimary: true,
}));
