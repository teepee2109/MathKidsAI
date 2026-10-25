const lessonGuides = {
  addition: {
    understand: "Cộng làm thay đổi số lượng bằng cách gộp thêm một nhóm. Tách số thành phần thuận tiện giúp ta tính mà vẫn giữ nguyên tổng; ghép đủ 10 là một cách tính nhẩm nhanh.",
    early: "Dùng khối xếp hình hoặc nắp chai: xếp 8 chiếc, thêm 5 chiếc. Chuyển 2 chiếc sang để tạo nhóm 10, rồi đếm 3 chiếc còn lại.",
    later: "Dùng giấy kẻ ô để tách hai số theo hàng đơn vị, chục, trăm. Tính từng hàng rồi kiểm tra tổng bằng cách làm tròn để ước lượng.",
    daily: "Khi gom đồ chơi vào hai hộp, cộng giúp em biết tổng số đồ vật; khi tính tiền nhiều món, cũng cần cộng giá các món lại."
  },
  subtraction: {
    understand: "Phép trừ có thể kể ba câu chuyện: lấy bớt, so sánh hai lượng, hoặc tìm phần còn thiếu. Vẽ hai nhóm hoặc đếm từ số bé đến số lớn giúp chọn đúng cách tính.",
    early: "Lấy 14 khối nhỏ, cất đi 6 khối rồi đếm số còn lại. Sau đó thử tìm khoảng cách từ 8 đến 14 để thấy phép trừ cũng là tìm phần thiếu.",
    later: "Vẽ đoạn thẳng biểu diễn số ban đầu và đánh dấu phần đã biết. Ghi rõ đang tìm phần còn lại, hiệu giữa hai số hay số cần thêm.",
    daily: "Phép trừ giúp tính tiền còn lại sau khi mua đồ, số trang còn phải đọc, hoặc xem một vật dài hơn vật kia bao nhiêu."
  },
  multiplication: {
    understand: "Phép nhân biểu diễn các nhóm bằng nhau. Hai cách nhìn thường gặp là số nhóm × số vật trong mỗi nhóm, hoặc số hàng × số cột; cách viết cần khớp với câu chuyện.",
    early: "Xếp 4 hàng, mỗi hàng 3 khối. Đếm từng hàng, rồi đếm tất cả và viết phép cộng lặp trước khi viết phép nhân.",
    later: "Tách một thừa số theo hàng, chẳng hạn 23 × 4 = (20 × 4) + (3 × 4). Cách này giải thích vì sao thuật toán đặt tính cho kết quả đúng.",
    daily: "Nếu mỗi bàn cần 4 chiếc bút và có 6 bàn, phép nhân giúp tìm nhanh tổng số bút cần chuẩn bị."
  },
  division: {
    understand: "Chia có thể chia đều đồ vật cho một số người hoặc hỏi có thể tạo được bao nhiêu nhóm. Hai câu hỏi khác nhau nhưng cùng được biểu diễn bằng phép chia.",
    early: "Chia đều 12 chiếc nắp chai cho 3 chiếc đĩa, mỗi lượt đặt một chiếc lên từng đĩa. So sánh với cách gom mỗi nhóm 3 chiếc.",
    later: "Sau khi tìm thương, luôn kiểm tra: số chia × thương + số dư = số bị chia; số dư phải nhỏ hơn số chia.",
    daily: "Chia bánh cho các bạn, đóng đồ thành từng hộp bằng nhau, hoặc tính mỗi người nhận bao nhiêu đều là tình huống chia."
  },
  geometry: {
    understand: "Hình được nhận biết bằng đặc điểm như cạnh, đỉnh, góc và đường cong—không phải màu sắc hay cách xoay. Chu vi là đường bao quanh; diện tích là phần mặt phẳng bên trong.",
    early: "Tìm vật hình tròn, hình chữ nhật hoặc hình tam giác quanh nhà. Xoay một tấm bìa rồi đếm cạnh để nhận ra tên hình không thay đổi.",
    later: "Vẽ hình trên giấy ô vuông, đánh dấu các cạnh hoặc góc vuông. Trước khi tính, nói rõ đề hỏi đường bao hay phần mặt bên trong.",
    daily: "Hình học xuất hiện ở cửa sổ, viên gạch, biển báo, sân chơi và cách sắp xếp đồ vật trong căn phòng."
  },
  "geometry-advanced": {
    understand: "Công thức diện tích xuất phát từ cách ghép hoặc cắt hình. Chiều cao phải vuông góc với đáy; thể tích đếm số khối đơn vị lấp đầy vật thể.",
    early: "Xếp các khối lập phương thành một hộp nhỏ. Đếm số khối theo chiều dài, chiều rộng và số tầng để thấy vì sao phải nhân ba kích thước.",
    later: "Vẽ đường cao vuông góc trên hình tam giác hoặc hình thang, ghi đơn vị ở từng kích thước rồi mới thay số vào công thức.",
    daily: "Diện tích giúp tính lượng giấy bọc mặt phẳng; thể tích giúp ước lượng sức chứa của hộp hoặc bể."
  },
  fractions: {
    understand: "Phân số chỉ có ý nghĩa khi đơn vị được chia thành các phần bằng nhau. Mẫu số nói đơn vị chia thành bao nhiêu phần; tử số nói đang xét bao nhiêu phần.",
    early: "Gấp một dải giấy thành các phần bằng nhau, tô một vài phần rồi đọc phân số. So sánh hai phần chỉ khi chúng thuộc cùng một đơn vị được chia đều.",
    later: "Khi cộng khác mẫu, hãy đổi về cùng kích thước phần trước. Chỉ cộng số phần đang đếm; không cộng mẫu số một cách máy móc.",
    daily: "Chia chiếc bánh, đo nửa lít nước hoặc nói đã đọc ba phần tư quyển sách đều có thể diễn tả bằng phân số."
  },
  measurement: {
    understand: "Đo là so sánh một đại lượng với đơn vị cùng loại. Trước khi cộng hoặc so sánh, hãy đổi các số đo về cùng đơn vị; không dùng chung một quy tắc đổi cho mọi đại lượng.",
    early: "Đặt thước sao cho vạch 0 trùng đầu vật. Đo hai vật bằng cùng một thước rồi xếp cạnh nhau để kiểm tra vật nào dài hơn.",
    later: "Viết tên đại lượng và đơn vị ở mỗi bước đổi. Kiểm tra xem kết quả lớn hay nhỏ hơn ban đầu có hợp lý với hướng đổi không.",
    daily: "Đo chiều cao, cân nguyên liệu, xem nhiệt độ hay tính thời gian đều cần chọn đúng đại lượng và đơn vị."
  },
  time: {
    understand: "Đồng hồ và lịch là hai cách đo thời gian khác nhau. Kim phút đi một vòng là 60 phút; khi tính thời lượng, cần tính cả lúc bắt đầu lẫn lúc kết thúc.",
    early: "Tạo mặt đồng hồ bằng giấy, xoay kim phút từng bước 5 phút và quan sát kim giờ dịch dần. Kể hoạt động xảy ra trước và sau.",
    later: "Vẽ một trục thời gian từ lúc bắt đầu đến lúc kết thúc. Tách quãng thời gian qua mốc giờ tròn để tránh trừ nhầm phút.",
    daily: "Đọc giờ giúp em chuẩn bị đi học, biết một hoạt động kéo dài bao lâu và xem ngày nào trong tuần có lịch học."
  },
  "place-value": {
    understand: "Giá trị của chữ số phụ thuộc vào vị trí. Mỗi hàng ở bên trái có giá trị gấp 10 lần hàng liền bên phải; số 0 giữ chỗ cho hàng không có đơn vị.",
    early: "Bó 10 que thành một bó chục, rồi ghép các bó và que rời để tạo số. Đổi vị trí hai chữ số và quan sát số đã thay đổi thế nào.",
    later: "Tách một số thành tổng các giá trị hàng, rồi đọc lại từ hàng lớn đến hàng bé để phát hiện chữ số 0 bị bỏ sót.",
    daily: "Hiểu giá trị hàng giúp đọc giá tiền, số lượng lớn, xem số nào nhiều hơn và làm tròn để ước lượng."
  },
  "word-problems": {
    understand: "Bài toán lời văn là một tình huống cần mô hình hóa. Đừng chọn phép tính chỉ vì thấy một từ khóa; hãy xác định điều đã biết, điều cần tìm và mối quan hệ giữa chúng.",
    early: "Dùng đồ vật đóng vai câu chuyện: đặt số có sẵn, thêm hoặc lấy bớt đúng như đề, rồi kể lại điều vừa làm bằng một câu.",
    later: "Tóm tắt bằng sơ đồ đoạn thẳng hoặc bảng. Giải từng bước theo thứ tự sự việc, ghi đơn vị ở kết quả trung gian và trả lời đúng câu hỏi.",
    daily: "Lập danh sách đồ cần mua, chia phần ăn hoặc tính số đồ còn thiếu đều cần đọc tình huống và chọn phép tính phù hợp."
  },
  expressions: {
    understand: "Thứ tự thực hiện phép tính là quy ước để mọi người cùng hiểu một biểu thức giống nhau. Dấu ngoặc nhóm phần cần làm trước; nhân và chia ưu tiên hơn cộng và trừ.",
    early: "Dùng bốn thẻ số và các thẻ phép tính. Đặt ngoặc ở hai vị trí khác nhau rồi tính để quan sát cùng một biểu thức có thể đổi kết quả ra sao.",
    later: "Gạch chân phép tính cần làm trước, ghi kết quả trung gian ở dòng riêng và giữ nguyên phần chưa tính để tránh bỏ sót.",
    daily: "Thứ tự phép tính cần thiết khi tính tổng tiền có nhiều món, tính số lượng theo nhóm rồi cộng thêm phần lẻ."
  },
  divisibility: {
    understand: "Một số chia hết cho số khác khi phép chia không còn dư. Dấu hiệu chia hết là cách nhận biết nhanh dựa trên cấu tạo chữ số, nhưng phép chia vẫn giúp kiểm tra kết luận.",
    early: "Xếp que tính thành các nhóm 2, rồi nhóm 5. Nếu không còn que thừa, số lượng ban đầu chia hết cho số nhóm đó.",
    later: "Thử dấu hiệu trên nhiều số, giải thích vì sao chữ số tận cùng hoặc tổng chữ số cho biết tính chia hết, rồi kiểm tra bằng phép chia.",
    daily: "Chia hết giúp kiểm tra nhanh xem một số đồ vật có thể chia đều vào các hộp hoặc nhóm hay không."
  },
  decimals: {
    understand: "Số thập phân mở rộng cách viết theo hàng: phần mười, phần trăm, phần nghìn. Các chữ số đứng sau dấu phẩy không phải là một số nguyên đứng riêng.",
    early: "Chia một dải giấy thành 10 phần bằng nhau và tô một phần để hình dung một phần mười của đơn vị.",
    later: "Đặt các dấu phẩy thẳng cột khi cộng trừ. Khi so sánh, thêm số 0 ở cuối nếu cần rồi so từng hàng từ trái sang phải.",
    daily: "Số thập phân thường gặp khi xem số đo độ dài, cân nặng, giá tiền hoặc lượng nước."
  },
  sequences: {
    understand: "Quy luật cần giải thích được mọi bước trong dãy, không chỉ một cặp số. So sánh các hiệu liên tiếp là cách bắt đầu để tìm dãy tăng hoặc giảm đều.",
    early: "Xếp hạt thành dãy màu lặp lại hoặc thêm cùng số khối mỗi lượt. Nói dự đoán tiếp theo và chỉ ra quy luật em đã dùng.",
    later: "Lập một hàng các hiệu giữa số đứng cạnh nhau. Kiểm tra quy luật trên toàn bộ dữ liệu trước khi dự đoán số tiếp theo.",
    daily: "Nhận ra quy luật giúp dự đoán lịch lặp lại, mẫu trang trí, số ghế theo hàng hoặc số vật tăng đều."
  },
  average: {
    understand: "Trung bình cộng là mức mỗi phần nhận được nếu dàn đều tổng. Nó không nhất thiết là một giá trị đã xuất hiện trong danh sách.",
    early: "Chia đều các khối đồ chơi từ vài chồng cao thấp thành những chồng bằng nhau để hình dung ý nghĩa của trung bình.",
    later: "Tính tổng trước, đếm đúng số giá trị rồi chia. Kiểm tra ngược bằng cách lấy trung bình nhân với số lượng.",
    daily: "Trung bình giúp mô tả số trang đọc mỗi ngày, điểm số hoặc lượng nước dùng trong nhiều ngày."
  },
  "sum-difference": {
    understand: "Khi biết tổng và hiệu, có thể tưởng tượng hai đoạn thẳng: bỏ phần chung thì phần còn lại là hiệu. Chia phần còn lại cho 2 giúp tìm phần chênh lệch ở mỗi phía.",
    early: "Vẽ hai thanh, một thanh dài hơn. Đánh dấu phần dài hơn là hiệu, rồi ghép hai thanh để nhìn thấy tổng.",
    later: "Viết rõ số lớn và số bé cần tìm; sau khi dùng công thức, kiểm tra đồng thời tổng và hiệu.",
    daily: "Cách suy luận này giúp tìm số lượng của hai nhóm khi biết tổng đồ vật và một nhóm nhiều hơn nhóm kia bao nhiêu."
  },
  planting: {
    understand: "Trong bài toán trồng cây, vật được đặt tại các điểm còn khoảng cách là đoạn nối giữa hai điểm. Vì vậy số cây không phải lúc nào cũng bằng số khoảng.",
    early: "Vẽ một đường thẳng, chấm cây ở hai đầu rồi nối các khoảng. Thêm một khoảng và đếm lại số điểm để thấy mối liên hệ.",
    later: "Xác định đường thẳng hay vòng khép kín, có trồng ở một đầu, hai đầu hay không đầu nào; sau đó mới lập quy tắc.",
    daily: "Bài toán tương tự khi đặt cột đèn, ghế hoặc cọc dọc lối đi."
  },
  ratio: {
    understand: "Tỉ số so sánh hai số lượng theo cùng một đơn vị. Sơ đồ phần bằng nhau giúp chuyển tỉ số thành các nhóm có kích thước dễ tính.",
    early: "Dùng hai màu khối xếp hình theo tỉ lệ 2 phần xanh và 3 phần vàng. Thay đổi số khối mỗi phần nhưng giữ nguyên tỉ lệ.",
    later: "Cộng số phần trong tỉ số, tìm giá trị một phần từ tổng hoặc hiệu, rồi nhân lên. Cuối cùng kiểm tra tỉ số ban đầu.",
    daily: "Tỉ số dùng để pha nước, so sánh số nam nữ trong nhóm hoặc phóng to một hình mà vẫn giữ dáng."
  },
  "difference-ratio": {
    understand: "Hiệu giữa hai số tương ứng với hiệu giữa số phần trong sơ đồ. Từ hiệu thật tìm được giá trị một phần, rồi mới suy ra từng số.",
    early: "Vẽ một thanh ngắn và một thanh dài gồm các đoạn bằng nhau. Đếm số đoạn chênh lệch để nhìn thấy phần ứng với hiệu.",
    later: "Trừ số phần của hai đại lượng trước, lấy hiệu đã biết chia cho số phần chênh lệch rồi tìm từng đại lượng.",
    daily: "Cách này hữu ích khi biết hai nhóm chênh nhau bao nhiêu và số lượng của chúng có quan hệ theo tỉ lệ nào."
  },
  percentage: {
    understand: "Phần trăm nghĩa là số phần trong 100 phần bằng nhau. Phải xác định rõ toàn bộ đang xét, vì cùng 25% nhưng 25% của 80 và 25% của 200 có giá trị khác nhau.",
    early: "Vẽ bảng 10 × 10 ô. Tô 10 ô để thấy 10%, tô 25 ô để thấy một phần tư của cả bảng.",
    later: "Đổi phần trăm về phân số trên 100 hoặc số thập phân. Khi tìm a% của một số, nhân số đó với a/100.",
    daily: "Phần trăm xuất hiện trong giảm giá, kết quả khảo sát, pin còn lại và tỉ lệ hoàn thành công việc."
  },
  units: {
    understand: "Đổi đơn vị dựa trên số đơn vị nhỏ ghép thành một đơn vị lớn. Độ dài, diện tích và thể tích có quy tắc khác nhau vì số chiều khác nhau.",
    early: "Dùng đoạn dây dài 1 mét và thước xăng-ti-mét để đo; đếm xem có bao nhiêu đoạn 10 cm hoặc 100 cm trong đó.",
    later: "Viết quan hệ giữa hai đơn vị trước khi dịch dấu phẩy. Với diện tích và thể tích, chú ý hệ số đổi lần lượt là bình phương hoặc lập phương.",
    daily: "Đổi đơn vị cần thiết khi đọc bản đồ, nấu ăn, mua vật liệu hoặc so sánh diện tích phòng."
  },
  motion: {
    understand: "Chuyển động đều liên hệ quãng đường, vận tốc và thời gian. Có thể hình dung vận tốc là quãng đường đi được trong mỗi một đơn vị thời gian.",
    early: "Cho xe đồ chơi đi một quãng trong một phút, đánh dấu điểm đầu và cuối. So sánh quãng đường khi thời gian tăng nhưng tốc độ giữ nguyên.",
    later: "Ghi đơn vị của vận tốc và thời gian trước khi nhân hoặc chia. Nếu phút và giờ chưa cùng đơn vị, đổi trước khi tính.",
    daily: "Công thức chuyển động giúp ước lượng thời gian đi học, quãng đường chuyến đi hoặc tốc độ trung bình."
  },
  statistics: {
    understand: "Dữ liệu chỉ có ý nghĩa khi biết đang đếm điều gì và mỗi biểu tượng hoặc vạch trục đại diện cho bao nhiêu. Đọc chú giải trước khi so sánh.",
    early: "Phân loại đồ vật theo màu hoặc hình dạng, xếp thành từng cột rồi đếm mỗi cột. Nói điều em quan sát được.",
    later: "Đọc tên biểu đồ, đơn vị và thang chia; sau đó mới tìm lớn nhất, nhỏ nhất hoặc hiệu giữa hai nhóm.",
    daily: "Bảng và biểu đồ giúp theo dõi thời tiết, môn thể thao yêu thích hoặc số sách lớp đã đọc."
  }
};

const upperGradeTheory = {
  addition: {
    model: "Có thể tách số theo hàng hoặc nhóm các số hạng để tạo phép tính tròn chục, tròn trăm. Ta chỉ đổi cách nhóm chứ không đổi tổng.",
    check: "Ước lượng kết quả trước; sau khi tính, cộng ngược hoặc so với ước lượng để phát hiện sai sót.",
  },
  subtraction: {
    model: "Hiệu cho biết khoảng cách giữa hai số. Khi phép trừ khó, có thể đếm bù từ số bé đến số lớn; với số lớn, tách phần cần bớt theo hàng.",
    check: "Lấy hiệu cộng số trừ. Nếu không trở lại số bị trừ ban đầu, hãy kiểm tra bước mượn hoặc phần nhớ.",
  },
  multiplication: {
    model: "Phân tích một thừa số theo giá trị hàng rồi dùng tính chất phân phối: 23 × 4 = (20 × 4) + (3 × 4). Mỗi tích riêng giữ đúng hàng của nó.",
    check: "Ước lượng bằng cách làm tròn một thừa số; kết quả đặt tính phải gần với tích ước lượng.",
  },
  division: {
    model: "Phép chia tìm số nhóm hoặc số phần tử trong mỗi nhóm. Nếu có dư, phần dư phải nhỏ hơn số chia vì nếu không vẫn tách thêm được một nhóm.",
    check: "Kiểm tra bằng: số chia × thương + số dư = số bị chia.",
  },
  geometry: {
    model: "Chu vi đo đường bao quanh, còn diện tích đo phần mặt phẳng bên trong. Hai đại lượng không thể thay thế cho nhau dù cùng mô tả một hình.",
    check: "Chu vi ghi đơn vị độ dài như cm; diện tích ghi đơn vị vuông như cm². Hãy nhìn đơn vị để tự phát hiện nhầm lẫn.",
  },
  "geometry-advanced": {
    model: "Công thức diện tích xuất phát từ ghép, cắt hoặc biến đổi hình về hình chữ nhật. Chiều cao luôn là khoảng cách vuông góc với đáy đã chọn.",
    check: "Diện tích dùng đơn vị vuông, thể tích dùng đơn vị khối. Thay ngược số đo vào công thức để kiểm tra.",
  },
  fractions: {
    model: "Muốn cộng hoặc trừ phân số, trước tiên các phần phải cùng kích thước. Phân số tương đương giúp đổi cách viết mà vẫn giữ nguyên lượng.",
    check: "Sau khi tính, rút gọn nếu được và tự hỏi kết quả có hợp lý so với một đơn vị nguyên không.",
  },
  measurement: {
    model: "Đo và đổi đơn vị là so sánh cùng một đại lượng bằng các đơn vị khác nhau. Chỉ cộng hoặc trừ sau khi đổi các số đo về cùng đơn vị.",
    check: "Viết quan hệ giữa hai đơn vị trước khi đổi; kiểm tra kết quả phải lớn hơn hay nhỏ hơn ban đầu theo hướng đổi.",
  },
  time: {
    model: "Thời lượng là khoảng cách trên trục thời gian, không phải phép trừ hai cách viết giờ-phút như số thập phân. Một giờ có 60 phút.",
    check: "Vẽ mốc bắt đầu và kết thúc; thử cộng thời lượng vào giờ bắt đầu để xem có về đúng giờ kết thúc không.",
  },
  "place-value": {
    model: "Giá trị của chữ số bằng chữ số đó nhân với giá trị hàng. Mỗi hàng bên trái gấp 10 lần hàng liền bên phải; số 0 có thể giữ chỗ.",
    check: "Tách số thành tổng các hàng rồi ghép lại. Cách đọc, cách viết và tổng giá trị hàng phải trùng nhau.",
  },
  "word-problems": {
    model: "Bài toán lời văn cần một mô hình trước phép tính: sơ đồ đoạn thẳng, bảng, nhóm đồ vật hoặc dòng thời gian. Từ khóa đơn lẻ không đủ để quyết định phép tính.",
    check: "Sau khi giải, dùng đáp số thay lại vào câu chuyện và trả lời đủ đại lượng cùng đơn vị mà đề hỏi.",
  },
  expressions: {
    model: "Thứ tự phép tính là quy ước: ngoặc trước, nhân-chia trước cộng-trừ; các phép cùng mức được làm từ trái sang phải.",
    check: "Ghi mỗi kết quả trung gian ở một dòng và giữ nguyên phần chưa tính để không bỏ sót dấu ngoặc.",
  },
  divisibility: {
    model: "Dấu hiệu chia hết giúp suy luận từ cấu tạo chữ số: tổng chữ số liên hệ với chia hết cho 3 hoặc 9; chữ số cuối giúp xét chia hết cho 2 hoặc 5.",
    check: "Thử dấu hiệu trên số mới, sau đó kiểm chứng bằng phép chia hoặc nhóm đồ vật; giải thích vì sao dấu hiệu áp dụng được.",
  },
  decimals: {
    model: "Mỗi chữ số thập phân ứng với một hàng: phần mười, phần trăm, phần nghìn. Viết thêm số 0 ở cuối không làm thay đổi giá trị số.",
    check: "Đặt dấu phẩy thẳng cột khi cộng trừ; ước lượng trước để nhận ra kết quả lệch hàng hoặc sai dấu phẩy.",
  },
  sequences: {
    model: "Một quy luật phải giải thích được toàn bộ dãy. Với dãy cách đều, hiệu giữa mọi cặp số liên tiếp phải bằng nhau.",
    check: "Tính nhiều hiệu liên tiếp, không kết luận chỉ từ hai số đầu; thay số dự đoán vào để kiểm tra quy luật.",
  },
  average: {
    model: "Trung bình cộng là tổng được chia đều cho số lượng giá trị. Nếu thêm hoặc bớt một dữ liệu, tổng và số lượng cùng thay đổi.",
    check: "Lấy trung bình nhân số lượng để khôi phục tổng; kết quả trung bình của một nhóm phải nằm trong khoảng từ giá trị nhỏ nhất đến lớn nhất.",
  },
  "sum-difference": {
    model: "Hai số có tổng S và hiệu D. Bỏ phần chênh lệch D khỏi tổng rồi chia đôi sẽ được số bé; cộng D vào tổng rồi chia đôi sẽ được số lớn.",
    check: "Kiểm tra đồng thời: số lớn + số bé = tổng và số lớn − số bé = hiệu.",
  },
  planting: {
    model: "Cây nằm ở các điểm, còn khoảng cách là các đoạn nối. Trên đường thẳng có n khoảng và trồng ở cả hai đầu thì có n + 1 cây; vòng khép kín thì số điểm bằng số khoảng.",
    check: "Vẽ vài trường hợp nhỏ như 1, 2, 3 khoảng và đếm điểm trước khi chọn công thức.",
  },
  ratio: {
    model: "Tỉ số 2 : 3 nghĩa là hai lượng gồm 2 phần và 3 phần bằng nhau, không nhất thiết là 2 vật và 3 vật. Tổng số phần là 5.",
    check: "Sau khi tìm hai lượng, rút gọn tỉ số của chúng và so lại với tỉ số đề bài.",
  },
  "difference-ratio": {
    model: "Khi biết hiệu và tỉ số, phần chênh lệch trên sơ đồ bằng hiệu số phần, không phải tổng số phần. Từ đó tìm giá trị một phần.",
    check: "Hai số tìm được phải vừa có đúng hiệu, vừa có đúng tỉ số; kiểm tra cả hai điều kiện.",
  },
  percentage: {
    model: "Phần trăm luôn so sánh một phần với toàn bộ đang xét. 25% = 25/100 = 1/4, nhưng một phần tư của các tổng khác nhau sẽ cho kết quả khác nhau.",
    check: "Ghi rõ toàn bộ là gì trước khi tính; tỉ lệ phần trăm của một phần không thể vượt 100% nếu phần đó nằm trong toàn bộ.",
  },
  units: {
    model: "Độ dài là đại lượng một chiều, diện tích có hai chiều và thể tích có ba chiều. Vì vậy hệ số đổi lần lượt được nhân, bình phương hoặc lập phương.",
    check: "Ghi số mũ trong đơn vị (m, m², m³) và kiểm tra hệ số đổi tương ứng trước khi dịch dấu phẩy.",
  },
  motion: {
    model: "Ba đại lượng liên hệ bởi s = v × t. Công thức chỉ cho kết quả đúng khi đơn vị vận tốc và thời gian khớp nhau, chẳng hạn km/giờ với giờ.",
    check: "Thay kết quả ngược vào công thức; quãng đường phải bằng vận tốc nhân thời gian và đơn vị phải đúng.",
  },
  statistics: {
    model: "Bảng và biểu đồ là cách mã hóa dữ liệu. Tên, đơn vị, chú giải và thang chia cho biết mỗi cột hoặc biểu tượng đại diện cho điều gì.",
    check: "Đọc chú giải và trục trước khi so sánh; nếu mỗi biểu tượng đại diện nhiều đơn vị, hãy nhân theo đúng chú giải.",
  },
};

export default function LessonGuide({ grade, topic }) {
  const guide = lessonGuides[topic];
  if (!guide) return null;

  return <section className="lesson-guide" aria-label="Khám phá thêm kiến thức">
    <div className="lesson-guide-heading"><span aria-hidden="true">🧭</span><div><small>HỌC SÂU HƠN</small><h3>Hiểu bài, tự khám phá, thấy toán quanh em</h3></div></div>
    <article className="lesson-guide-card lesson-guide-why"><span aria-hidden="true">💡</span><div><strong>Vì sao cách này đúng?</strong><p>{guide.understand}</p></div></article>
    <div className="lesson-guide-columns">
      <article className="lesson-guide-card lesson-guide-activity"><span aria-hidden="true">👐</span><div><strong>Thử tự khám phá</strong><p>{grade <= 2 ? guide.early : guide.later}</p></div></article>
      <article className="lesson-guide-card lesson-guide-life"><span aria-hidden="true">🌱</span><div><strong>Toán quanh em</strong><p>{guide.daily}</p></div></article>
    </div>
    {grade >= 3 && upperGradeTheory[topic] && <article className="lesson-guide-deep-dive">
      <h4><span aria-hidden="true">📚</span> Mở rộng lý thuyết · lớp {grade}</h4>
      <div><strong>🧠 Mô hình tư duy</strong><p>{upperGradeTheory[topic].model}</p></div>
      <div><strong>🔎 Cách tự kiểm tra</strong><p>{upperGradeTheory[topic].check}</p></div>
    </article>}
  </section>;
}
