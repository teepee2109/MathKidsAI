const difficultyBands = [
  { code: "foundation", name: "Khởi động", difficulty: 1 },
  { code: "application", name: "Vận dụng", difficulty: 2 },
  { code: "reasoning", name: "Thử sức suy luận", difficulty: 3 },
];

export const PLACEMENT_QUESTION_COUNT = 30;

export function getPlacementSkills(grade) {
  return [
    { code: "ARITHMETIC_ADD_SUB", name: "Cộng và trừ", icon: "➕" },
    { code: "ARITHMETIC_MUL_DIV", name: grade === 1 ? "Số và quy luật" : grade === 2 ? "Cấu tạo số và nhóm bằng nhau" : grade === 3 ? "Số, nhân, chia và phân số" : "Số, phân số, nhân và chia", icon: "✖️" },
    { code: "GEOMETRY", name: "Hình học", icon: "📐" },
    { code: "MEASUREMENT", name: "Đo lường và thời gian", icon: "📏" },
    { code: "WORD_PROBLEM", name: "Toán có lời văn", icon: "🧩" },
  ];
}

const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const choose = (values) => values[randomInt(0, values.length - 1)];
const formatDecimal = (value) => String(Number(value.toFixed(2))).replace(".", ",");

function numericOptions(answer, distractors = []) {
  const correct = String(answer);
  const numericAnswer = Number(correct.replace(",", "."));
  if (!Number.isFinite(numericAnswer)) {
    const options = [...new Set([correct, ...distractors.map(String).filter((item) => item !== correct)])];
    if (options.length < 4) throw new Error(`Non-numeric placement answer needs three distractors: ${correct}`);
    return options.slice(0, 4).sort(() => Math.random() - 0.5);
  }
  const displayNumber = (value) => correct.includes(",") ? formatDecimal(value) : String(value);
  const safeDistractors = distractors.map(String).filter((item) => {
    const value = Number(item.replace(",", "."));
    return !Number.isFinite(value) || value >= 0;
  });
  const candidates = [
    ...safeDistractors,
    displayNumber(numericAnswer + 1),
    displayNumber(Math.max(0, numericAnswer - 1)),
    displayNumber(numericAnswer + 10),
    displayNumber(Math.max(0, numericAnswer - 10)),
    displayNumber(numericAnswer * 2),
    displayNumber(Math.floor(numericAnswer / 2)),
  ];
  const options = [correct];
  for (const candidate of candidates) {
    if (candidate !== correct && !options.includes(candidate)) options.push(candidate);
    if (options.length === 4) break;
  }
  let offset = 2;
  while (options.length < 4) {
    const candidate = displayNumber(Math.max(0, numericAnswer + offset));
    if (!options.includes(candidate)) options.push(candidate);
    offset += 1;
  }
  for (let index = options.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInt(0, index);
    [options[index], options[swapIndex]] = [options[swapIndex], options[index]];
  }
  return options;
}

function makeQuestion(grade, skillIndex, itemIndex, focusCode, focusName, prompt, answer, distractors = []) {
  const skill = getPlacementSkills(grade)[skillIndex];
  const band = difficultyBands[Math.floor(itemIndex / 2)];
  const correct = String(answer);
  return {
    skill,
    focusCode,
    focusName,
    difficultyBand: band.code,
    difficultyName: band.name,
    difficulty: band.difficulty,
    prompt,
    answer: correct,
    options: numericOptions(correct, distractors),
  };
}

function additionSubtractionQuestions(grade) {
  const items = [];
  const put = (index, topic, name, prompt, answer, distractors = []) => items.push(makeQuestion(grade, 0, index, topic, name, prompt, answer, distractors));

  if (grade === 1) {
    const firstTens = randomInt(2, 5); const firstOnes = randomInt(1, 4);
    const secondTens = randomInt(1, 3); const secondOnes = randomInt(1, 9 - firstOnes);
    const first = firstTens * 10 + firstOnes; const second = secondTens * 10 + secondOnes;
    put(0, "addition", "Cộng không nhớ trong phạm vi 100", `${first} + ${second} = ?`, first + second);
    const minuendTens = randomInt(4, 8); const minuendOnes = randomInt(4, 9);
    const subtrahendTens = randomInt(1, minuendTens - 1); const subtrahendOnes = randomInt(0, minuendOnes);
    const minuend = minuendTens * 10 + minuendOnes; const subtrahend = subtrahendTens * 10 + subtrahendOnes;
    put(1, "subtraction", "Trừ không mượn trong phạm vi 100", `${minuend} − ${subtrahend} = ?`, minuend - subtrahend);
    const addendTens = randomInt(1, 4); const addendOnes = randomInt(1, 4);
    const missingTens = randomInt(1, 3); const missingOnes = randomInt(1, 9 - addendOnes);
    const knownAddend = addendTens * 10 + addendOnes; const missingAddend = missingTens * 10 + missingOnes;
    put(2, "addition", "Tìm số hạng chưa biết", `${knownAddend} + □ = ${knownAddend + missingAddend}. Số cần điền là bao nhiêu?`, missingAddend);
    const resultTens = randomInt(1, 3); const resultOnes = randomInt(1, 4);
    const differenceTens = randomInt(1, 3); const differenceOnes = randomInt(0, resultOnes);
    const resultNumber = resultTens * 10 + resultOnes; const difference = differenceTens * 10 + differenceOnes;
    put(3, "subtraction", "Tìm số bị trừ chưa biết", `□ − ${difference} = ${resultNumber}. Số cần điền là bao nhiêu?`, resultNumber + difference);
    const start = randomInt(3, 5) * 10; const received = randomInt(1, 3) * 10; const given = randomInt(1, 2) * 10;
    put(4, "addition", "Cộng rồi trừ trong tình huống", `An có ${start} nhãn vở, được cho ${received} nhãn rồi tặng bạn ${given}. An còn bao nhiêu nhãn?`, start + received - given);
    const left = randomInt(42, 88); const rightTens = randomInt(1, Math.floor(left / 10) - 1); const rightOnes = randomInt(0, left % 10);
    const right = rightTens * 10 + rightOnes;
    put(5, "subtraction", "Giải thích phép trừ", `Bạn Mai có ${left} bông hoa, cắm ${right} bông. Mai còn bao nhiêu bông hoa?`, left - right);
    return items;
  }

  const ranges = {
    2: { min: 20, max: 99 },
    3: { min: 120, max: 999 },
    4: { min: 12000, max: 89999 },
  };
  if (grade < 5) {
    const { min, max } = ranges[grade];
    const a = randomInt(min, Math.floor(max * 0.65)); const b = randomInt(Math.floor(min / 2), Math.floor(max * 0.3));
    put(0, "addition", "Cộng số tự nhiên", `${a} + ${b} = ?`, a + b);
    const minuend = randomInt(Math.floor(max * 0.5), max); const subtrahend = randomInt(Math.floor(min / 2), Math.floor(minuend * 0.45));
    put(1, "subtraction", "Trừ số tự nhiên", `${minuend} − ${subtrahend} = ?`, minuend - subtrahend);
    const addend = randomInt(Math.floor(min / 3), Math.floor(min / 2)); const sum = addend + randomInt(min, max);
    put(2, "addition", "Tìm số hạng chưa biết", `□ + ${addend} = ${sum}. Số cần điền là bao nhiêu?`, sum - addend);
    const start = randomInt(min, max); const difference = randomInt(Math.floor(min / 4), Math.floor(start * 0.6));
    put(3, "subtraction", "Tìm số bị trừ chưa biết", `□ − ${difference} = ${start}. Số cần điền là bao nhiêu?`, start + difference);
    const first = randomInt(Math.floor(min / 4), Math.floor(max * 0.2)); const second = randomInt(Math.floor(min / 5), Math.floor(max * 0.15)); const third = randomInt(Math.floor(min / 6), Math.floor(max * 0.05));
    put(4, "addition", "Hai bước tính trong tình huống", `Thư viện có ${first} quyển truyện, nhận thêm ${second} quyển rồi cho mượn ${third} quyển. Còn lại bao nhiêu quyển?`, first + second - third);
    const p = randomInt(Math.floor(min / 4), Math.floor(max * 0.2)); const q = randomInt(Math.floor(min / 5), Math.floor(max * 0.12));
    put(5, "subtraction", "Kiểm tra cách tính", `Một bạn tính ${p + q} − ${q} = ${p + q}. Kết quả đúng phải là bao nhiêu?`, p, [p + q, q, p + 2 * q]);
    return items;
  }

  const a = Number(`${randomInt(1, 8)},${randomInt(1, 9)}`.replace(",", "."));
  const b = Number(`${randomInt(1, 4)},${randomInt(1, 9)}`.replace(",", "."));
  put(0, "addition", "Cộng số thập phân", `${formatDecimal(a)} + ${formatDecimal(b)} = ?`, formatDecimal(a + b), [formatDecimal(a + b + 0.1), formatDecimal(a - b), formatDecimal(a + b + 1)]);
  const minuend = Number(`${randomInt(4, 9)},${randomInt(1, 9)}`.replace(",", "."));
  const subtrahend = Number(`${randomInt(1, 3)},${randomInt(1, 8)}`.replace(",", "."));
  put(1, "subtraction", "Trừ số thập phân", `${formatDecimal(minuend)} − ${formatDecimal(subtrahend)} = ?`, formatDecimal(minuend - subtrahend), [formatDecimal(minuend - subtrahend + 0.1), formatDecimal(minuend + subtrahend), formatDecimal(minuend - subtrahend - 1)]);
  const whole = randomInt(2, 5); const fractionDenominator = choose([2, 4, 5, 10]); const numerator = randomInt(1, fractionDenominator - 1);
  put(2, "addition", "Cộng phân số cùng mẫu", `${numerator}/${fractionDenominator} + ${whole}/${fractionDenominator} = ?`, `${numerator + whole}/${fractionDenominator}`, [`${numerator + whole + 1}/${fractionDenominator}`, `${numerator + whole * 2}/${fractionDenominator}`, `${whole}/${fractionDenominator}`]);
  const wholeStart = randomInt(4, 9); const wholeTake = randomInt(1, wholeStart - 1);
  put(3, "subtraction", "Trừ phân số cùng mẫu", `${wholeStart}/8 − ${wholeTake}/8 = ?`, `${wholeStart - wholeTake}/8`, [`${wholeStart + wholeTake}/8`, `${wholeTake - wholeStart}/8`, `${wholeStart - wholeTake + 1}/8`]);
  const walk = Number(`1,${randomInt(2, 8)}`.replace(",", "."));
  put(4, "addition", "Cộng số đo trong ngữ cảnh", `Mỗi ngày Mai đi bộ ${formatDecimal(walk)} km. Sau 2 ngày, Mai đi bộ được bao nhiêu km?`, formatDecimal(walk * 2), [formatDecimal(walk + 2), formatDecimal(walk * 3), formatDecimal(walk)]);
  const total = randomInt(5, 9); const taken = randomInt(1, total - 1);
  put(5, "subtraction", "Lập phép trừ phù hợp", `Một cuộn dây dài ${total} m, đã cắt đi ${taken}/10 m. Viết phần còn lại dưới dạng phần mười của mét.`, `${total * 10 - taken}/10`, [`${total * 10 + taken}/10`, `${taken}/10`, `${total * 10 - taken + 1}/10`]);
  return items;
}

function numberOperationQuestions(grade) {
  const items = [];
  const put = (index, topic, name, prompt, answer, distractors = []) => items.push(makeQuestion(grade, 1, index, topic, name, prompt, answer, distractors));
  if (grade === 1) {
    const tens = randomInt(2, 8); const ones = randomInt(1, 9);
    put(0, "number-sense", "Đọc số và cấu tạo số", `Số ${tens * 10 + ones} có bao nhiêu chục tròn?`, tens);
    const nextNumber = randomInt(30, 88);
    put(1, "number-sense", "Tìm số liền sau", `Số liền sau của ${nextNumber} là số nào?`, nextNumber + 1);
    const start = randomInt(2, 5) * 2;
    put(2, "number-sense", "Đếm cách đều", `${start}, ${start + 2}, ${start + 4}, __. Số tiếp theo là bao nhiêu?`, start + 6);
    put(3, "number-sense", "So sánh số", `Trong các số ${randomInt(12, 25)}, ${randomInt(30, 45)}, ${randomInt(50, 69)}, số lớn nhất có bao nhiêu chục?`, 0);
    const n = randomInt(12, 25); put(4, "number-sense", "Tách số thành chục và đơn vị", `${n} gồm ${Math.floor(n / 10)} chục và bao nhiêu đơn vị?`, n % 10);
    put(5, "number-sense", "Tìm quy luật", "5, 10, 15, __. Em đếm thêm 5 để tìm số còn thiếu.", 20);
    // Keep the comparison item deterministic and make its answer match the generated set.
    const comparison = items[3];
    const values = [randomInt(12, 25), randomInt(30, 45), randomInt(50, 69)];
    comparison.prompt = `Trong các số ${values.join(", ")}, số lớn nhất có bao nhiêu chục?`;
    comparison.answer = String(Math.floor(Math.max(...values) / 10));
    comparison.options = numericOptions(comparison.answer);
    return items;
  }

  if (grade === 2) {
    const hundreds = randomInt(2, 8); const tens = randomInt(1, 9); const ones = randomInt(1, 9);
    put(0, "place-value", "Cấu tạo số", `Trong số ${hundreds}${tens}${ones}, chữ số ở hàng chục là bao nhiêu?`, tens);
    const groupCount = randomInt(3, 6); const inEach = choose([2, 5]);
    put(1, "multiplication", "Nhóm bằng nhau", `Có ${groupCount} đĩa, mỗi đĩa có ${inEach} quả dâu 🍓. Có tất cả bao nhiêu quả?`, groupCount * inEach);
    const equalGroups = choose([2, 5]); const inEachGroup = randomInt(2, 6);
    put(2, "division", "Chia đều", `${equalGroups * inEachGroup} chiếc bánh chia đều cho ${equalGroups} bạn. Mỗi bạn được bao nhiêu chiếc?`, inEachGroup);
    const factor = choose([2, 5]);
    put(3, "multiplication", "Cộng lặp thành nhóm bằng nhau", `Có 4 nhóm, mỗi nhóm ${factor} chiếc kẹo. Có tất cả bao nhiêu chiếc?`, factor * 4, [factor + 4, factor * 3, 4 + factor]);
    const groups = choose([2, 5]); const quotient = randomInt(2, 8);
    put(4, "division", "Tìm thương", `${groups * quotient} viên bi xếp đều vào ${groups} hộp. Mỗi hộp có bao nhiêu viên?`, quotient);
    const pattern = choose([2, 5]);
    put(5, "multiplication", "Suy luận từ quy luật", `${pattern}, ${pattern * 2}, ${pattern * 3}, __. Số tiếp theo là bao nhiêu?`, pattern * 4);
    return items;
  }

  if (grade === 3) {
    const a = randomInt(3, 9); const b = randomInt(3, 9);
    put(0, "multiplication", "Bảng nhân", `${a} × ${b} = ?`, a * b);
    const divisor = randomInt(2, 9); const quotient = randomInt(3, 9);
    put(1, "division", "Bảng chia", `${divisor * quotient} ÷ ${divisor} = ?`, quotient);
    const groups = randomInt(12, 34); const each = randomInt(2, 7);
    put(2, "multiplication", "Nhân số có nhiều chữ số", `${groups} × ${each} = ?`, groups * each);
    const divisor3 = randomInt(2, 5); const quotient3 = randomInt(100, 500); const dividend3 = quotient3 * divisor3;
    put(3, "division", "Chia số cho một chữ số", `${dividend3} ÷ ${divisor3} = ?`, quotient3);
    const numerator = randomInt(1, 3);
    put(4, "fractions", "Nhận biết phân số", `Một chiếc bánh chia đều thành 4 phần, ăn ${numerator} phần. Phần đã ăn là phân số nào?`, `${numerator}/4`, [`${4}/${numerator}`, `${numerator + 1}/4`, `1/${numerator}`]);
    const numberToRound = randomInt(12000, 98999);
    put(5, "place-value", "Làm tròn số đến hàng trăm", `Làm tròn ${numberToRound} đến hàng trăm gần nhất.`, Math.round(numberToRound / 100) * 100);
    return items;
  }

  if (grade === 4) {
    const a = randomInt(120, 420); const b = randomInt(12, 35);
    put(0, "multiplication", "Nhân số nhiều chữ số", `${a} × ${b} = ?`, a * b);
    const divisor = randomInt(12, 32); const quotient = randomInt(12, 45);
    put(1, "division", "Chia số nhiều chữ số", `${divisor * quotient} ÷ ${divisor} = ?`, quotient);
    const numerator = randomInt(2, 5); const denominator = numerator * 2;
    put(2, "fractions", "Tìm phân số của một số", `${numerator}/${denominator} của ${denominator * 12} là bao nhiêu?`, numerator * 12);
    const divisorRule = choose([2, 3, 5, 9]); const multiple = divisorRule === 3 || divisorRule === 9 ? divisorRule * randomInt(12, 40) : divisorRule * randomInt(100, 400);
    put(3, "multiplication", "Nhận biết tính chia hết", `Số ${multiple} chia hết cho ${divisorRule}. Thương là bao nhiêu?`, multiple / divisorRule);
    const n = randomInt(2, 5); const den = choose([3, 4, 5, 6]);
    put(4, "fractions", "Cộng phân số cùng mẫu", `${n}/${den} + 1/${den} = ?`, `${n + 1}/${den}`, [`${n + 1}/${den + 1}`, `${n}/${den + 1}`, `${n + 2}/${den}`]);
    const largeNumber = randomInt(100000, 999999);
    put(5, "place-value", "Đọc giá trị hàng", `Trong số ${largeNumber}, chữ số ở hàng chục nghìn là bao nhiêu?`, Math.floor(largeNumber / 10000) % 10);
    return items;
  }

  const multiplicand = randomInt(12, 45); const multiplier = Number(`1,${randomInt(2, 9)}`.replace(",", "."));
  put(0, "multiplication", "Nhân số thập phân", `${multiplicand} × ${formatDecimal(multiplier)} = ?`, formatDecimal(multiplicand * multiplier));
  const divisor = randomInt(2, 5); const quotient = Number(`${randomInt(1, 5)},${randomInt(1, 9)}`.replace(",", ".")); const dividend = divisor * quotient;
  put(1, "division", "Chia số thập phân", `${formatDecimal(dividend)} ÷ ${divisor} = ?`, formatDecimal(quotient));
  const numerator = randomInt(1, 4); const denominator = numerator * randomInt(2, 4);
  put(2, "fractions", "Tìm phân số của một số", `${numerator}/${denominator} của ${denominator * 15} là bao nhiêu?`, numerator * 15);
  const fractionA = randomInt(1, 4); const fractionB = randomInt(1, 4);
  put(3, "fractions", "Cộng phân số khác mẫu", `${fractionA}/5 + ${fractionB}/10 = ?`, `${fractionA * 2 + fractionB}/10`, [`${fractionA + fractionB}/15`, `${fractionA * 2 + fractionB + 1}/10`, `${fractionA * 2 - fractionB}/10`]);
  const percent = choose([10, 20, 25, 50]); const base = randomInt(2, 8) * 20;
  put(4, "multiplication", "Tính phần trăm", `${percent}% của ${base} là bao nhiêu?`, base * percent / 100);
  const factor = randomInt(12, 35); put(5, "division", "Tìm thừa số chưa biết", `${factor * 7} ÷ □ = 7. Số cần điền là bao nhiêu?`, factor);
  return items;
}

function geometryQuestions(grade) {
  const items = [];
  const put = (index, name, prompt, answer, distractors = []) => items.push(makeQuestion(grade, 2, index, "geometry", name, prompt, answer, distractors));
  if (grade === 1) {
    put(0, "Nhận biết hình", "🔺 Hình tam giác có bao nhiêu cạnh?", 3);
    put(1, "Nhận biết hình", "Hình vuông có bao nhiêu góc?", 4);
    const fish = randomInt(3, 7); const turtles = randomInt(2, 4);
    put(2, "Đếm hình trong tranh", `Trong bể có ${"🐠".repeat(fish)} và ${"🐢".repeat(turtles)}. Có tất cả bao nhiêu con vật?`, fish + turtles);
    put(3, "Vị trí của đồ vật", "Quả bóng ở phía trước chiếc hộp. Quả bóng đang ở đâu so với chiếc hộp?", "Phía trước", ["Phía sau", "Ở trên", "Ở dưới"]);
    put(4, "Nhận biết đặc điểm hình", "Hình nào có 4 cạnh bằng nhau và 4 góc vuông?", "Hình vuông", ["Hình tròn", "Hình tam giác", "Hình chữ nhật"]);
    const shapes = randomInt(3, 6);
    put(5, "Suy luận từ hình", `Bức tranh có ${shapes} hình vuông và ít hơn ${shapes} hình tròn 2 hình. Có bao nhiêu hình tròn?`, shapes - 2);
    return items;
  }
  if (grade === 2) {
    put(0, "Nhận biết hình", "Hình chữ nhật có bao nhiêu góc vuông?", 4);
    put(1, "Nhận biết khối", "Vật nào có dạng gần giống khối cầu?", "Quả bóng", ["Lon sữa", "Hộp bánh", "Quyển sách"]);
    put(2, "Điểm và đoạn thẳng", "Ba điểm A, B, C cùng nằm trên một đường thẳng; B ở giữa A và C. Đường thẳng được chia thành bao nhiêu đoạn nhỏ?", 2);
    const edges = randomInt(2, 6);
    put(3, "Đường gấp khúc", `Đường gấp khúc có 3 đoạn dài ${edges} cm, ${edges + 2} cm và ${edges + 4} cm. Tổng độ dài là bao nhiêu cm?`, edges * 3 + 6);
    const wholeLength = randomInt(8, 18); const onePart = randomInt(2, wholeLength - 2);
    put(4, "Độ dài đoạn thẳng", `Đoạn thẳng dài ${wholeLength} cm được chia thành hai phần. Một phần dài ${onePart} cm. Phần còn lại dài bao nhiêu cm?`, wholeLength - onePart);
    put(5, "Nhận biết khối", "Vật nào có dạng gần giống khối trụ?", "Lon nước ngọt", ["Quả cam", "Quả bóng", "Viên bi"]);
    return items;
  }
  if (grade === 3) {
    put(0, "Nhận biết góc", "Góc vuông có số đo bao nhiêu độ?", 90);
    const diameter = randomInt(4, 10) * 2;
    put(1, "Bán kính và đường kính", `Đường kính hình tròn dài ${diameter} cm. Bán kính dài bao nhiêu cm?`, diameter / 2);
    const a = randomInt(3, 9); const b = randomInt(4, 10);
    put(2, "Chu vi hình chữ nhật", `Mảnh vườn dài ${a + 8} m, rộng ${b} m. Cần bao nhiêu mét hàng rào để đi quanh vườn?`, 2 * (a + 8 + b));
    const length = randomInt(8, 18); const width = randomInt(3, 7);
    put(3, "Diện tích hình chữ nhật", `Hình chữ nhật dài ${length} cm, rộng ${width} cm. Diện tích là bao nhiêu cm²?`, length * width);
    const squarePerimeter = randomInt(5, 12) * 4;
    put(4, "Tính cạnh từ chu vi", `Hình vuông có chu vi ${squarePerimeter} cm. Một cạnh dài bao nhiêu cm?`, squarePerimeter / 4);
    const rows = randomInt(2, 5); const columns = randomInt(3, 6);
    put(5, "Ghép hình trên lưới", `Hình chữ nhật phủ ${rows} hàng và ${columns} cột ô vuông đơn vị. Có bao nhiêu ô vuông?`, rows * columns);
    return items;
  }
  if (grade === 4) {
    const angle = choose([100, 110, 120, 135]);
    put(0, "Nhận biết góc", `Góc ${angle}° là góc gì?`, "Góc tù", ["Góc nhọn", "Góc vuông", "Góc bẹt"]);
    put(1, "Nhận biết hình bình hành", "Hình nào có hai cặp cạnh đối diện song song?", "Hình bình hành", ["Hình tam giác", "Hình tròn", "Hình thang có một cặp cạnh song song"]);
    const baseLength = randomInt(8, 20); const height = randomInt(4, 10);
    put(2, "Diện tích hình bình hành", `Hình bình hành có đáy ${baseLength} cm, chiều cao ${height} cm. Diện tích là bao nhiêu cm²?`, baseLength * height);
    const diagonalA = randomInt(6, 16); const diagonalB = randomInt(4, 12);
    put(3, "Diện tích hình thoi", `Hình thoi có hai đường chéo ${diagonalA} cm và ${diagonalB} cm. Diện tích là bao nhiêu cm²?`, diagonalA * diagonalB / 2);
    put(4, "Nhận biết hai đường thẳng", "Hai đường thẳng cắt nhau tạo thành góc vuông. Chúng được gọi là hai đường gì?", "Vuông góc", ["Song song", "Trùng nhau", "Cong"]);
    const side = randomInt(5, 14);
    put(5, "Chu vi hình thoi", `Hình thoi có cạnh dài ${side} cm. Chu vi hình thoi là bao nhiêu cm?`, side * 4);
    return items;
  }
  const base = randomInt(6, 18); const height = randomInt(4, 12);
  put(0, "Diện tích tam giác", `Tam giác có đáy ${base} cm, chiều cao ${height} cm. Diện tích là bao nhiêu cm²?`, base * height / 2);
  const top = randomInt(4, 12); const bottom = randomInt(12, 24); const h = randomInt(4, 10);
  put(1, "Diện tích hình thang", `Hình thang có hai đáy ${top} cm và ${bottom} cm, chiều cao ${h} cm. Diện tích là bao nhiêu cm²?`, (top + bottom) * h / 2);
  const side = randomInt(5, 15);
  put(2, "Chu vi hình tròn", `Hình tròn có đường kính ${side} cm. Lấy π = 3,14. Chu vi gần bằng bao nhiêu cm?`, formatDecimal(side * 3.14));
  const radius = randomInt(2, 8);
  put(3, "Diện tích hình tròn", `Hình tròn có bán kính ${radius} cm. Lấy π = 3,14. Diện tích gần bằng bao nhiêu cm²?`, formatDecimal(radius * radius * 3.14));
  const cuboidL = randomInt(3, 8); const cuboidW = randomInt(2, 5); const cuboidH = randomInt(2, 6);
  put(4, "Thể tích hình hộp", `Hình hộp chữ nhật dài ${cuboidL} cm, rộng ${cuboidW} cm, cao ${cuboidH} cm. Thể tích là bao nhiêu cm³?`, cuboidL * cuboidW * cuboidH);
  const triangleBase = randomInt(8, 18); const triangleHeight = randomInt(4, 10);
  put(5, "Suy luận công thức diện tích", `Tam giác có diện tích ${triangleBase * triangleHeight / 2} cm² và đáy ${triangleBase} cm. Chiều cao là bao nhiêu cm?`, triangleHeight);
  return items;
}

function measurementQuestions(grade) {
  const items = [];
  const put = (index, topic, name, prompt, answer, distractors = []) => items.push(makeQuestion(grade, 3, index, topic, name, prompt, answer, distractors));
  if (grade === 1) {
    put(0, "measurement", "Đo độ dài", "Chiếc bút dài 12 cm, chiếc thước dài 20 cm. Thước dài hơn bút bao nhiêu cm?", 8);
    put(1, "measurement", "Tính độ dài còn lại", "Dải ruy băng dài 18 cm, cắt đi 6 cm. Còn lại bao nhiêu cm?", 12);
    const rulerMark = randomInt(4, 12);
    put(2, "measurement", "Đọc thước có vạch chia", `Một đoạn dây đặt từ vạch 0 đến vạch ${rulerMark} cm. Đoạn dây dài bao nhiêu cm?`, rulerMark);
    put(3, "time", "Đọc giờ đúng", "Kim phút chỉ số 12, kim giờ chỉ số 3. Bây giờ là mấy giờ?", 3);
    put(4, "time", "Tính ngày", "Hôm nay là thứ Hai. Hai ngày nữa là thứ mấy? (Thứ Hai = 1, Chủ nhật = 7)", 3);
    put(5, "time", "Nhận biết ngày trong tuần", "Một tuần có bao nhiêu ngày?", 7);
    return items;
  }
  if (grade === 2) {
    put(0, "measurement", "Đổi đơn vị độ dài", "1 m bằng bao nhiêu cm?", 100);
    const morningTemp = randomInt(18, 26); const afternoonTemp = morningTemp + randomInt(2, 8);
    put(1, "measurement", "Đọc nhiệt độ", `Buổi sáng là ${morningTemp}°C, buổi chiều là ${afternoonTemp}°C. Buổi chiều ấm hơn bao nhiêu độ C?`, afternoonTemp - morningTemp);
    const length = randomInt(2, 8);
    put(2, "measurement", "Cộng số đo", `Dải ruy băng dài ${length} dm và ${length + 4} cm. Đổi ${length} dm ra cm, rồi tính tổng độ dài bằng cm.`, length * 10 + length + 4);
    put(3, "time", "Đổi giờ ra phút", "2 giờ bằng bao nhiêu phút?", 120);
    const startHour = randomInt(1, 6); const elapsed = choose([15, 30, 45]);
    put(4, "time", "Tính khoảng thời gian", `Phim bắt đầu lúc ${startHour}:00 và kết thúc lúc ${startHour} giờ ${elapsed} phút. Phim kéo dài bao nhiêu phút?`, elapsed);
    const money = randomInt(2, 8) * 1000; const paid = money + 10000;
    put(5, "measurement", "Tính tiền thừa", `Món đồ giá ${money} đồng. Trả bằng tờ ${paid} đồng thì được thối lại bao nhiêu đồng?`, paid - money);
    return items;
  }
  if (grade === 3) {
    const centimeters = randomInt(2, 9);
    put(0, "measurement", "Đổi đơn vị độ dài", `${centimeters} cm bằng bao nhiêu mm?`, centimeters * 10);
    put(1, "measurement", "Đổi đơn vị khối lượng", "3 kg bằng bao nhiêu g?", 3000);
    const liters = randomInt(2, 8);
    put(2, "measurement", "Đổi đơn vị dung tích", `${liters} lít bằng bao nhiêu ml?`, liters * 1000);
    put(3, "time", "Tính khoảng thời gian", "Một buổi học bắt đầu lúc 7 giờ 15 phút và kết thúc lúc 8 giờ. Buổi học kéo dài bao nhiêu phút?", 45);
    const hours = randomInt(1, 3); const minutes = randomInt(1, 11) * 5;
    put(4, "time", "Đổi thời gian ra phút", `${hours} giờ ${minutes} phút bằng bao nhiêu phút?`, hours * 60 + minutes);
    const a = randomInt(2, 6); const b = a + randomInt(1, 4);
    put(5, "measurement", "So sánh số đo", `Bình A có ${a} lít nước, bình B có ${b} lít. Bình B nhiều hơn bao nhiêu ml?`, (b - a) * 1000);
    return items;
  }
  if (grade === 4) {
    put(0, "measurement", "Đổi đơn vị diện tích", "1 m² bằng bao nhiêu cm²?", 10000);
    const hectares = randomInt(2, 9);
    put(1, "measurement", "Đổi đơn vị diện tích lớn", `${hectares} m² bằng bao nhiêu dm²?`, hectares * 100);
    put(2, "measurement", "Đổi đơn vị khối lượng", "2 tấn bằng bao nhiêu kg?", 2000);
    put(3, "time", "Đổi đơn vị thời gian", "3 phút 20 giây bằng bao nhiêu giây?", 200);
    const centuries = randomInt(2, 6);
    put(4, "time", "Đổi thế kỷ ra năm", `${centuries} thế kỷ bằng bao nhiêu năm?`, centuries * 100);
    const area = randomInt(3, 9) * 10000;
    put(5, "measurement", "Chọn đơn vị phù hợp", `Một khu đất rộng ${area} m². Số đo đó bằng bao nhiêu ha?`, area / 10000);
    return items;
  }
  const meters = Number(`${randomInt(1, 8)},${randomInt(1, 9)}`.replace(",", "."));
  put(0, "measurement", "Đổi số đo thập phân", `${formatDecimal(meters)} m bằng bao nhiêu cm?`, formatDecimal(meters * 100));
  const kilograms = Number(`${randomInt(1, 5)},${randomInt(1, 9)}`.replace(",", "."));
  put(1, "measurement", "Đổi khối lượng thập phân", `${formatDecimal(kilograms)} kg bằng bao nhiêu g?`, formatDecimal(kilograms * 1000));
  const volume = randomInt(2, 9);
  put(2, "measurement", "Đổi đơn vị thể tích", `${volume} dm³ bằng bao nhiêu lít?`, volume);
  put(3, "time", "Tính thời gian", "Một chuyến xe đi từ 8 giờ 35 phút đến 10 giờ 5 phút. Chuyến xe đi trong bao nhiêu phút?", 90);
  const seconds = randomInt(2, 8) * 15;
  put(4, "time", "Đổi phút ra giây", `${seconds} phút bằng bao nhiêu giây?`, seconds * 60);
  const distance = randomInt(2, 8) * 1000; const remaining = randomInt(1, 5) * 100;
  put(5, "measurement", "Tính độ dài còn lại", `Cuộn dây dài ${distance} m, đã dùng ${remaining} m. Còn lại bao nhiêu km?`, formatDecimal((distance - remaining) / 1000));
  return items;
}

function wordProblemQuestions(grade) {
  const items = [];
  const put = (index, focusCode, name, prompt, answer, distractors = []) => items.push(makeQuestion(grade, 4, index, focusCode, name, prompt, answer, distractors));
  if (grade === 1) {
    const a = randomInt(3, 8); const b = randomInt(2, 7);
    put(0, "word-problems", "Chọn phép tính cộng", `Trong ao có ${a} chú vịt, ${b} chú vịt bơi đến. Có tất cả bao nhiêu chú vịt?`, a + b);
    const total = randomInt(9, 18); const left = randomInt(2, total - 2);
    put(1, "word-problems", "Chọn phép tính trừ", `Có ${total} quả bóng, ${left} quả màu đỏ. Số bóng không đỏ là bao nhiêu?`, total - left);
    const books = randomInt(2, 7); const given = randomInt(1, 6);
    put(2, "word-problems", "Tìm phần còn thiếu", `Lan có ${books} quyển truyện. Bạn cho thêm một số quyển thì Lan có ${books + given}. Bạn đã cho Lan mấy quyển?`, given);
    const apples = randomInt(4, 10); const eaten = randomInt(1, apples - 1);
    put(3, "word-problems", "Giải bài toán thực tế", `Trên đĩa có ${apples} quả táo, bé ăn ${eaten} quả. Trên đĩa còn mấy quả?`, apples - eaten);
    const red = randomInt(2, 5); const blue = red + randomInt(1, 3);
    put(4, "word-problems", "So sánh hai nhóm", `Có ${red} viên bi đỏ và ${blue} viên bi xanh. Bi xanh nhiều hơn bi đỏ bao nhiêu viên?`, blue - red);
    const pages = randomInt(3, 8);
    put(5, "word-problems", "Suy luận hai bước", `Nam có ${pages} nhãn dán, được tặng thêm 4 rồi tặng em 2. Nam còn bao nhiêu nhãn?`, pages + 2);
    return items;
  }
  if (grade === 2) {
    const a = randomInt(20, 80); const b = randomInt(15, 90);
    put(0, "word-problems", "Bài toán cộng có lời văn", `Lớp 2A quyên góp ${a} quyển vở, lớp 2B quyên góp ${b}. Hai lớp góp được bao nhiêu quyển?`, a + b);
    const total = randomInt(100, 500); const sold = randomInt(20, 80);
    put(1, "word-problems", "Bài toán trừ có lời văn", `Cửa hàng có ${total} quả cam, đã bán ${sold}. Còn lại bao nhiêu quả?`, total - sold);
    const groups = randomInt(3, 8); const each = choose([2, 5]);
    put(2, "word-problems", "Nhóm bằng nhau", `Có ${groups} hộp bút, mỗi hộp ${each} chiếc. Có tất cả bao nhiêu chiếc bút?`, groups * each);
    const students = choose([2, 5]); const candies = students * randomInt(2, 6);
    put(3, "word-problems", "Chia đều", `${candies} chiếc kẹo chia đều cho ${students} bạn. Mỗi bạn được mấy chiếc?`, candies / students);
    const tickets = randomInt(10, 30) * 10; const used = randomInt(1, 4) * 10;
    put(4, "word-problems", "Bài toán hai bước", `Rạp có ${tickets} vé, bán buổi sáng ${used} vé và buổi chiều nhiều hơn buổi sáng 10 vé. Còn lại bao nhiêu vé?`, tickets - used - (used + 10));
    const price = randomInt(2, 8) * 1000; const count = choose([2, 5]);
    put(5, "word-problems", "Tính tiền mua đồ", `Mỗi chiếc bút giá ${price} đồng. Mua ${count} chiếc hết bao nhiêu đồng?`, price * count);
    return items;
  }
  if (grade === 3) {
    const groups = randomInt(12, 36); const each = randomInt(3, 8);
    put(0, "word-problems", "Bài toán nhân", `Mỗi khay có ${each} cốc sữa. ${groups} khay có tất cả bao nhiêu cốc?`, groups * each);
    const friends = randomInt(3, 8);
    const equalTotal = friends * randomInt(3, 12);
    put(1, "word-problems", "Bài toán chia", `${equalTotal} quyển vở chia đều cho ${friends} bạn. Mỗi bạn được bao nhiêu quyển?`, equalTotal / friends);
    const morning = randomInt(120, 450); const afternoon = randomInt(110, 390); const sold = randomInt(80, 200);
    put(2, "word-problems", "Bài toán hai bước", `Trang trại thu hoạch ${morning} kg cam buổi sáng và ${afternoon} kg buổi chiều. Đã bán ${sold} kg. Còn lại bao nhiêu kg?`, morning + afternoon - sold);
    const books = randomInt(4, 12); const shelves = randomInt(3, 8);
    put(3, "word-problems", "Chọn phép tính phù hợp", `${books} ngăn sách, mỗi ngăn ${shelves} quyển. Có tất cả bao nhiêu quyển?`, books * shelves);
    const side = randomInt(5, 14); const width = randomInt(3, 8);
    put(4, "word-problems", "Bài toán gắn với hình học", `Mảnh vườn hình chữ nhật dài ${side} m, rộng ${width} m. Chu vi là bao nhiêu mét?`, (side + width) * 2);
    const number = randomInt(20, 80); const divisor = randomInt(2, 8); const quotient = Math.floor(number / divisor);
    put(5, "word-problems", "Suy luận từ dữ kiện", `Có ${quotient * divisor} bông hoa xếp đều vào ${divisor} lọ. Mỗi lọ có bao nhiêu bông?`, quotient);
    return items;
  }
  if (grade === 4) {
    const average = randomInt(20, 80); const values = [average - 3, average, average + 3];
    put(0, "word-problems", "Tìm trung bình cộng", `Ba ngày cửa hàng bán được ${values.join(", ")} chiếc bánh. Trung bình mỗi ngày bán bao nhiêu chiếc?`, average, [average - 1, average + 1]);
    const sum = randomInt(25, 60) * 2; const difference = randomInt(5, 15) * 2; const bigger = (sum + difference) / 2;
    put(1, "word-problems", "Tìm hai số khi biết tổng và hiệu", `Hai lớp có ${sum} học sinh; lớp A nhiều hơn lớp B ${difference} học sinh. Lớp A có bao nhiêu học sinh?`, bigger);
    const boxes = randomInt(12, 35); const each = randomInt(18, 45);
    put(2, "word-problems", "Bài toán nhân nhiều chữ số", `Một nhà sách xếp ${each} quyển vào mỗi thùng. ${boxes} thùng có bao nhiêu quyển?`, boxes * each);
    const distance = randomInt(250, 500); const first = randomInt(40, 100); const second = randomInt(30, 90);
    put(3, "word-problems", "Bài toán nhiều bước", `Đường đi dài ${distance} m. An đi ${first} m buổi sáng và ${second} m buổi chiều. An còn phải đi bao nhiêu mét?`, distance - first - second);
    const length = randomInt(12, 35); const width = randomInt(5, 16);
    put(4, "word-problems", "Bài toán diện tích", `Sàn phòng dài ${length} m, rộng ${width} m. Diện tích sàn là bao nhiêu m²?`, length * width);
    const cost = randomInt(15, 30) * 1000; const quantity = randomInt(2, 4);
    put(5, "word-problems", "Suy luận mua bán", `Mỗi quyển vở giá ${cost} đồng. Mua ${quantity} quyển, trả 200.000 đồng. Được thối lại bao nhiêu đồng?`, 200000 - cost * quantity);
    return items;
  }
  const total = randomInt(2, 10) * 100; const percent = choose([10, 20, 25, 50]);
  put(0, "word-problems", "Bài toán phần trăm", `Một trường có ${total} học sinh. ${percent}% tham gia câu lạc bộ cờ vua. Có bao nhiêu học sinh tham gia?`, total * percent / 100);
  const numerator = randomInt(1, 4); const denominator = numerator * randomInt(2, 5); const books = denominator * randomInt(12, 35);
  put(1, "word-problems", "Bài toán phân số", `Thư viện có ${books} quyển sách, ${numerator}/${denominator} là sách khoa học. Có bao nhiêu quyển sách khoa học?`, books * numerator / denominator);
  const speed = randomInt(35, 65); const hours = randomInt(2, 5);
  put(2, "word-problems", "Bài toán quãng đường", `Một xe đi ${speed} km mỗi giờ trong ${hours} giờ. Xe đi được bao nhiêu km?`, speed * hours);
  const workers = randomInt(4, 12); const perWorker = randomInt(18, 45); const done = randomInt(20, Math.min(80, workers * perWorker - 1));
  put(3, "word-problems", "Bài toán nhiều bước", `${workers} bạn mỗi bạn gấp ${perWorker} chiếc thuyền giấy. Sau đó tặng đi ${done} chiếc. Còn lại bao nhiêu chiếc?`, workers * perWorker - done);
  const ratioA = randomInt(1, 4); const ratioB = ratioA + randomInt(1, 3); const totalParts = ratioA + ratioB; const eachPart = randomInt(5, 20);
  put(4, "word-problems", "Tìm hai số khi biết tổng và tỉ số", `Số bút xanh và bút đỏ có tỉ số ${ratioA}:${ratioB}, tổng cộng ${totalParts * eachPart} chiếc. Có bao nhiêu bút đỏ?`, ratioB * eachPart);
  const smallerParts = randomInt(1, 3); const largerParts = smallerParts + randomInt(1, 4); const unitDifference = randomInt(3, 12);
  put(5, "word-problems", "Tìm hai số khi biết hiệu và tỉ số", `Hai nhóm có tỉ số ${smallerParts}:${largerParts}. Nhóm lớn hơn nhóm nhỏ ${unitDifference * (largerParts - smallerParts)} đồ vật. Nhóm nhỏ có bao nhiêu đồ vật?`, smallerParts * unitDifference);
  return items;
}

export function buildPlacementQuestions(grade) {
  if (!Number.isInteger(Number(grade)) || Number(grade) < 1 || Number(grade) > 5) throw new RangeError("Grade must be between 1 and 5.");
  const normalizedGrade = Number(grade);
  const questions = [
    ...additionSubtractionQuestions(normalizedGrade),
    ...numberOperationQuestions(normalizedGrade),
    ...geometryQuestions(normalizedGrade),
    ...measurementQuestions(normalizedGrade),
    ...wordProblemQuestions(normalizedGrade),
  ];
  for (let index = questions.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInt(0, index);
    [questions[index], questions[swapIndex]] = [questions[swapIndex], questions[index]];
  }
  return questions;
}
