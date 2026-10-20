import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { getCachedUser } from "../authStorage";
import { claimArcadeReward } from "../services/questions";
import "./ArcadeMathGames.css";
import "./ArcadeLearningGames.css";

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFreeCell(excluded = [], size = 40) {
  const blocked = new Set(excluded);
  const available = Array.from({ length: size }, (_, index) => index).filter((index) => !blocked.has(index));
  return available[randomInt(0, available.length - 1)] ?? 0;
}

function getMathArcadeSpec(grade, round = 0) {
  if (grade === 1) {
    const target = [8, 10, 12, 15, 18, 20][randomInt(0, 5)];
    return { target, targetLabel: String(target), display: String, lesson: `Chọn các số nhỏ để nạp vừa đủ ${target}; thử tách số thành nhiều cách cộng.`, pickups: [1, 2, 3, 4, 5, 6].map((value) => ({ value, label: `+${value}` })) };
  }
  if (grade === 2) {
    const target = [8, 9, 10][randomInt(0, 2)];
    const values = [1, 2, 3, 4, 5, 6];
    return { target, targetLabel: String(target * 10), display: (value) => String(value * 10), lesson: `Gom các số tròn chục để nạp vừa đủ ${target * 10}.`, pickups: values.map((value) => ({ value, label: `+${value * 10}` })) };
  }
  if (grade === 3) {
    const target = [24, 30, 36, 42, 48, 54][randomInt(0, 5)];
    const values = [4, 6, 8, 9, 10, 12];
    const pickups = values.map((value) => {
      if (Math.random() < 0.5) {
        let factor = 2;
        while (factor <= 10 && value % factor !== 0) factor += 1;
        return { value, label: `${factor}×${value / factor}` };
      }
      const divisor = randomInt(2, 10);
      return { value, label: `${value * divisor}÷${divisor}` };
    });
    return { target, targetLabel: String(target), display: String, lesson: `Tính tích hoặc thương trên từng viên pin rồi ghép đủ ${target}.`, pickups };
  }
  if (grade === 4) {
    const denominator = [3, 4, 5, 6, 8, 10][randomInt(0, 5)];
    const values = Array.from({ length: denominator - 1 }, (_, index) => index + 1);
    return { target: denominator, targetLabel: `${denominator}/${denominator}`, display: (value) => `${value}/${denominator}`, lesson: `Gom các phân số có mẫu ${denominator} để hoàn thành một đơn vị.`, pickups: values.map((value) => ({ value, label: `${value}/${denominator}` })) };
  }
  if (round % 3 === 1) {
    return { target: 100, targetLabel: "100%", display: (value) => `${value}%`, lesson: "Gom các phần trăm để hoàn thành 100%.", pickups: [10, 20, 25, 50].map((value) => ({ value, label: `${value}%` })) };
  }
  if (round % 3 === 0) {
    const target = [15, 20, 25, 30][randomInt(0, 3)];
    const values = [1, 2, 3, 4, 5, 6, 8, 10, 12];
    const display = (value) => (value / 10).toFixed(1).replace(".", ",");
    return { target, targetLabel: display(target), display, lesson: `Cộng số thập phân theo hàng phần mười để đạt ${display(target)}.`, pickups: values.map((value) => ({ value, label: display(value) })) };
  }
  const target = [150, 200, 250, 300][randomInt(0, 3)];
  const values = [10, 20, 25, 30, 40, 50, 75, 100];
  const display = (value) => (value / 100).toFixed(2).replace(".", ",");
  return { target, targetLabel: display(target), display, lesson: `Ghép các số thập phân đến hàng phần trăm để đạt ${display(target)}.`, pickups: values.map((value) => ({ value, label: display(value) })) };
}

function randomMathPickup(spec) {
  return spec.pickups[randomInt(0, spec.pickups.length - 1)];
}

function canReachFuelTarget(amount, pickups, cache = new Map()) {
  if (amount === 0) return true;
  if (amount < 0) return false;
  if (cache.has(amount)) return cache.get(amount);
  const reachable = pickups.some((pickup) => pickup.value <= amount && canReachFuelTarget(amount - pickup.value, pickups, cache));
  cache.set(amount, reachable);
  return reachable;
}

function getSpaceReachableCells(start, rockCells) {
  const blocked = new Set(rockCells);
  const visited = new Set([start]);
  const queue = [start];
  for (let index = 0; index < queue.length; index += 1) {
    const cell = queue[index];
    const row = Math.floor(cell / 8);
    const column = cell % 8;
    const neighbors = [row > 0 ? cell - 8 : -1, row < 4 ? cell + 8 : -1, column > 0 ? cell - 1 : -1, column < 7 ? cell + 1 : -1];
    neighbors.forEach((next) => {
      if (next >= 0 && !blocked.has(next) && !visited.has(next)) {
        visited.add(next);
        queue.push(next);
      }
    });
  }
  return [...visited].filter((cell) => cell !== start);
}

function getSpacePickupOptions(spec, grade, fuel, position, rockCells, round) {
  const remaining = spec.target - fuel;
  const safe = spec.pickups.filter((pickup) => pickup.value <= remaining && canReachFuelTarget(remaining - pickup.value, spec.pickups));
  const overflow = spec.pickups.filter((pickup) => pickup.value > remaining);
  const selected = [...safe].sort(() => Math.random() - 0.5).slice(0, 3);
  if (selected.length < 3) {
    selected.push(...overflow.sort(() => Math.random() - 0.5).slice(0, 3 - selected.length));
  }
  // At least one valid route is always offered; near the end, risky packs remain visible as optional decoys.
  const choices = selected.length ? selected : [spec.pickups[0]];
  const reachable = getSpaceReachableCells(position, rockCells).sort(() => Math.random() - 0.5);
  return choices.map((pickup, index) => ({
    ...pickup,
    id: `${round}-${fuel}-${index}-${Math.random().toString(36).slice(2, 7)}`,
    position: reachable[index % reachable.length] ?? randomFreeCell([...rockCells, position]),
    safe: pickup.value <= remaining && canReachFuelTarget(remaining - pickup.value, spec.pickups),
    route: index + 1,
    label: pickup.label,
  }));
}

function formatArcadeCalculation(grade, mathSpec, current, pickup, next) {
  if (grade === 2) return `${mathSpec.display(current)} + ${pickup.label.slice(1)} = ${mathSpec.display(next)}`;
  if (grade === 3) return `${current} + (${pickup.label}) = ${next}`;
  return `${mathSpec.display(current)} + ${pickup.label.replace(/^\+/, "")} = ${mathSpec.display(next)}`;
}

function getCrossMathSpec(grade, round = 0) {
  if (grade === 1) {
    const values = [1, 2, 3, 4, 5, 6];
    return { lesson: ["Cộng các số nhỏ theo hàng và cột.", "Tính các phép cộng tách số để khớp tổng.", "Tính phép trừ trên từng ô rồi cộng hàng và cột."][round % 3], tiles: values.map((value) => ({ value, label: round % 3 === 1 ? (value === 1 ? "0+1" : `${value - 1}+1`) : round % 3 === 2 ? `${value + 1}−1` : String(value) })), format: String };
  }
  if (grade === 2) {
    const groups = [1, 2, 3];
    const labels = (value) => round % 3 === 0 ? `${value * 10}` : round % 3 === 1 ? `${value}×10` : `${(value + 1) * 10}−10`;
    return { lesson: ["Cộng các số tròn chục để khớp tổng.", "Tính các nhóm chục theo bảng nhân.", "Dùng phép trừ để tìm số chục còn lại."][round % 3], tiles: groups.map((value) => ({ value, label: labels(value) })), format: (value) => `${value * 10}` };
  }
  if (grade === 3) {
    const factors = round % 3 === 1 ? [[24, 6], [32, 4], [45, 5], [48, 4], [54, 6], [42, 6]] : [[2, 3], [2, 4], [3, 3], [3, 4], [3, 5], [4, 5]];
    const divide = round % 3 === 1;
    return { lesson: divide ? "Tính thương trên mỗi ô rồi cộng theo hàng và cột." : "Tính tích trên mỗi ô rồi cộng theo hàng và cột.", tiles: factors.map(([a, b]) => ({ value: divide ? a / b : a * b, label: `${a}${divide ? "÷" : "×"}${b}` })), format: String };
  }
  if (grade === 4) {
    const denominator = [4, 5, 10][round % 3];
    return { lesson: `Cộng các phân số cùng mẫu số ${denominator} theo hàng và cột.`, denominator, tiles: Array.from({ length: denominator - 1 }, (_, index) => index + 1).map((value) => ({ value, label: `${value}/${denominator}` })), format: (value) => { const whole = Math.floor(value / denominator); const remainder = value % denominator; return whole ? (remainder ? `${whole} ${remainder}/${denominator}` : `${whole}`) : `${remainder}/${denominator}`; } };
  }
  if (round % 3 === 1) {
    return { lesson: "Cộng các phần trăm trên từng hàng và cột.", tiles: [5, 10, 15, 20, 25, 30].map((value) => ({ value, label: `${value}%` })), format: (value) => `${value}%` };
  }
  const hundredths = round % 3 === 2;
  const values = hundredths ? [5, 10, 15, 20, 25, 30] : [1, 2, 3, 4, 5, 6, 8];
  return { lesson: hundredths ? "Cộng số thập phân đến hàng phần trăm." : "Cộng số thập phân đến hàng phần mười.", tiles: values.map((value) => ({ value, label: (value / (hundredths ? 100 : 10)).toFixed(hundredths ? 2 : 1).replace(".", ",") })), format: (value) => (value / (hundredths ? 100 : 10)).toFixed(hundredths ? 2 : 1).replace(".", ",") };
}

function makeCrossMathPuzzle(grade, round = 0) {
  const spec = getCrossMathSpec(grade, round);
  const solution = Array.from({ length: 9 }, () => spec.tiles[randomInt(0, spec.tiles.length - 1)]);
  const rowTargets = Array.from({ length: 3 }, (_, row) => solution.slice(row * 3, row * 3 + 3).reduce((sum, tile) => sum + tile.value, 0));
  const columnTargets = Array.from({ length: 3 }, (_, column) => solution[column].value + solution[column + 3].value + solution[column + 6].value);
  const tiles = solution.map((tile, index) => ({ ...tile, id: `${grade}-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 7)}` })).sort(() => Math.random() - 0.5);
  return { tiles, rowTargets, columnTargets, cells: Array(9).fill(null), lesson: spec.lesson };
}

function createEquation(grade, usedAnswers) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    let left;
    let right;
    let answer;
    let operator = "+";
    if (grade === 1) {
      const subtract = Math.random() < 0.35;
      left = randomInt(2, 19); right = randomInt(1, subtract ? left : 20 - left); operator = subtract ? "−" : "+"; answer = subtract ? left - right : left + right;
    } else if (grade === 2) {
      const kind = randomInt(0, 2);
      if (kind === 0) { left = randomInt(10, 80); right = randomInt(5, 100 - left); answer = left + right; }
      else if (kind === 1) { left = randomInt(20, 99); right = randomInt(5, left); operator = "−"; answer = left - right; }
      else { right = Math.random() < 0.5 ? 2 : 5; left = randomInt(2, 10) * right; operator = Math.random() < 0.5 ? "×" : "÷"; if (operator === "×") { const factor = randomInt(2, 10); left = factor; answer = factor * right; } else answer = left / right; }
    } else if (grade === 3) {
      const kind = randomInt(0, 3);
      if (kind === 0) { left = randomInt(120, 780); right = randomInt(110, 999 - left); answer = left + right; }
      else if (kind === 1) { left = randomInt(250, 999); right = randomInt(100, left); operator = "−"; answer = left - right; }
      else if (kind === 2) { left = randomInt(2, 10); right = randomInt(2, 10); operator = "×"; answer = left * right; }
      else { answer = randomInt(2, 10); right = randomInt(2, 10); left = answer * right; operator = "÷"; }
    } else if (grade === 4) {
      const kind = randomInt(0, 4);
      if (kind === 0) { left = randomInt(1000, 30000); right = randomInt(1000, 99999 - left); answer = left + right; }
      else if (kind === 1) { left = randomInt(10000, 99999); right = randomInt(1000, left); operator = "−"; answer = left - right; }
      else if (kind === 2) { left = randomInt(12, 999); right = randomInt(2, 9); operator = "×"; answer = left * right; }
      else if (kind === 3) { right = randomInt(2, 9); answer = randomInt(12, 999); left = answer * right; operator = "÷"; }
      else {
        const denominator = [2, 3, 4, 5, 8, 10][randomInt(0, 5)];
        const first = randomInt(1, denominator - 1); const second = randomInt(1, denominator - 1);
        left = `${first}/${denominator}`; right = `${second}/${denominator}`;
        operator = Math.random() < 0.5 ? "+" : "−";
        const numerator = operator === "+" ? first + second : Math.abs(first - second);
        answer = `${numerator}/${denominator}`;
        if (operator === "−" && first < second) [left, right] = [right, left];
      }
    } else {
      const kind = randomInt(0, 4);
      if (kind === 0) { left = randomInt(10, 90) / 10; right = randomInt(1, 90) / 10; answer = Math.round((left + right) * 100) / 100; }
      else if (kind === 1) { left = randomInt(20, 99) / 10; right = randomInt(1, Math.floor(left * 10)) / 10; answer = Math.round((left - right) * 100) / 100; operator = "−"; }
      else if (kind === 2) { left = randomInt(10, 50) / 10; right = randomInt(2, 9); answer = Math.round(left * right * 10) / 10; operator = "×"; }
      else if (kind === 3) { right = randomInt(2, 9); answer = randomInt(10, 90) / 10; left = Math.round(answer * right * 10) / 10; operator = "÷"; }
      else { const percent = [10, 20, 25, 50][randomInt(0, 3)]; right = ""; operator = ""; left = `${percent}% của ${randomInt(2, 10) * 100}`; answer = Number(left.match(/\d+$/)[0]) * percent / 100; }
    }
    if (!usedAnswers.has(String(answer))) return { expression: right === "" ? left : `${left} ${operator} ${right}`, answer };
  }
  return { expression: "8 + 7", answer: 15 };
}

function makeMemoryDeck(grade) {
  const used = new Set();
  return Array.from({ length: 6 }, (_, index) => {
    const pair = createEquation(grade, used);
    used.add(String(pair.answer));
    return [
      { id: `${index}-equation`, pair: index, text: `${pair.expression} = ?`, type: "equation" },
      { id: `${index}-answer`, pair: index, text: String(pair.answer), type: "answer" },
    ];
  }).flat().sort(() => Math.random() - 0.5);
}

function makeGardenRound(grade, index) {
  const operation = grade === 1 ? "+" : grade === 2 ? ["+", "×", "×"][index] : grade === 3 ? "×" : grade === 4 ? "fraction" : "+ thập phân";
  const min = grade === 1 ? 1 : grade === 2 ? 10 : grade === 5 ? 10 : 2;
  const max = grade === 1 ? 10 : grade === 2 ? 50 : grade === 3 ? 10 : grade === 4 ? 8 : 99;
  const denominator = grade === 4 ? [4, 5, 8, 10][randomInt(0, 3)] : 1;
  const first = grade === 5 ? randomInt(min, max) / 10 : grade === 4 ? randomInt(1, denominator - 1) / denominator : grade === 2 && operation === "×" ? randomInt(2, 10) : randomInt(min, max);
  const second = grade === 5 ? randomInt(min, max) / 10 : grade === 4 ? randomInt(1, denominator - 1) / denominator : grade === 2 && operation === "×" ? (index === 1 ? 2 : 5) : randomInt(min, max);
  const precision = grade === 4 ? 1000 : grade === 5 ? 100 : 1;
  const target = operation === "×" ? first * second : Math.round((first + second) * precision) / precision;
  const values = [first, second];
  while (values.length < 8) {
    const value = grade === 5 ? randomInt(min, max) / 10 : grade === 4 ? randomInt(1, denominator - 1) / denominator : randomInt(min, max);
    const makesTarget = operation === "×" ? Math.abs(value * first - target) < 0.001 || Math.abs(value * second - target) < 0.001 : Math.abs(value + first - target) < 0.001 || Math.abs(value + second - target) < 0.001;
    if (!makesTarget) values.push(value);
  }
  const fractionTarget = grade === 4 ? `${Math.round(target * denominator)}/${denominator}` : null;
  return { id: index, operation, denominator, fractionTarget, target, tiles: values.map((value, tileIndex) => ({ id: `${index}-${tileIndex}`, value, display: grade === 4 ? `${Math.round(value * denominator)}/${denominator}` : value })).sort(() => Math.random() - 0.5) };
}

function makeBalanceTiles(grade, round) {
  if (grade === 4) {
    const denominator = [5, 6, 8, 10][randomInt(0, 3)];
    for (let attempt = 0; attempt < 100; attempt += 1) {
      const a = randomInt(1, denominator - 1); const b = randomInt(1, denominator - 1); const c = randomInt(1, denominator - 1); const d = a + b - c;
      if (d >= 1 && d < denominator && new Set([a, b, c, d]).size === 4) return [a, b, c, d].map((value, index) => ({ id: `${round}-${index}`, value, display: `${value}/${denominator}`, denominator, side: "tray" })).sort(() => Math.random() - 0.5);
    }
  }
  if (grade === 5) {
    const min = 5 + round; const max = 45 + round * 3;
    for (let attempt = 0; attempt < 100; attempt += 1) {
      const a = randomInt(min, max); const b = randomInt(min, max); const c = randomInt(min, max); const d = a + b - c;
      if (d >= min && d <= max && new Set([a, b, c, d]).size === 4) return [a, b, c, d].map((value, index) => ({ id: `${round}-${index}`, value, display: round === 1 ? `${value * 10}%` : (value / 10).toFixed(1).replace(".", ","), side: "tray" })).sort(() => Math.random() - 0.5);
    }
  }
  const min = grade === 1 ? 2 : grade === 2 ? 5 : grade * 2 + round;
  const max = grade === 1 ? 9 : grade === 2 ? 20 : grade * 5 + round * 3;
  let values;
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const a = randomInt(min, max);
    const b = randomInt(min, max);
    const c = randomInt(min, max);
    const d = a + b - c;
    if (d >= min && d <= max && new Set([a, b, c, d]).size === 4) { values = [a, b, c, d]; break; }
  }
  if (!values) values = [3, 5, 4, 4];
  if ((grade === 2 || grade === 3) && round === 2) {
    const products = grade === 2 ? [4, 6, 8, 9, 10, 12, 14, 15, 16, 18, 20, 24, 25, 30, 36, 40, 45, 50] : [6, 8, 9, 12, 15, 16, 18, 20, 24, 25, 27, 30, 32, 35, 36, 40, 42, 45, 48, 49, 54, 56, 63, 64, 72, 81];
    for (let attempt = 0; attempt < 1000; attempt += 1) {
      const a = products[randomInt(0, products.length - 1)];
      const b = products[randomInt(0, products.length - 1)];
      const c = products[randomInt(0, products.length - 1)];
      const d = a + b - c;
      if (products.includes(d) && new Set([a, b, c, d]).size === 4) { values = [a, b, c, d]; break; }
    }
  }
  return values.map((value, index) => {
    let display;
    if (grade === 1 && round === 1 || grade === 2 && round === 1) {
      const first = randomInt(1, value - 1);
      display = `${first} + ${value - first}`;
    } else if (grade === 1 && round === 2) { const subtract = randomInt(1, 5); display = `${value + subtract} − ${subtract}`; }
    else if (grade === 3 && round === 1) { const divisor = randomInt(2, 9); display = `${value * divisor} ÷ ${divisor}`; }
    else if ((grade === 2 || grade === 3) && round === 2) {
      let first = 2;
      while (first <= 10 && (value % first !== 0 || value / first > 10)) first += 1;
      display = first <= 10 ? `${first} × ${value / first}` : `${value} × 1`;
    }
    return { id: `${round}-${index}`, value, display, side: "tray" };
  }).sort(() => Math.random() - 0.5);
}

function getNumberMazes(grade) {
  const routes = [[0, 1, 2, 6, 10, 11], [0, 4, 5, 6, 10, 11], [0, 1, 5, 9, 10, 11]];
  const values = grade === 1 ? [1, 2, 3, 4, 5]
    : grade === 2 ? [10, 20]
      : grade === 3 ? [6, 8, 9, 12, 15, 16, 18, 20, 24, 30, 36]
        : grade === 4 ? [1, 2, 3]
          : [1, 2, 3, 5, 8, 10, 15, 20];
  const display = grade === 2 ? (value) => String(value)
    : grade === 4 ? (value) => { const whole = Math.floor(value / 4); const part = value % 4; return whole ? (part ? `${whole} ${part}/4` : String(whole)) : `${part}/4`; }
      : grade === 5 ? (value) => (value / 10).toFixed(1).replace(".", ",")
        : String;
  return Array.from({ length: 3 }, (_, level) => {
    const cells = Array(16).fill("#");
    const labels = Array(16).fill("");
    const selectedRoute = routes[randomInt(0, routes.length - 1)];
    const walkable = new Set(routes.flat());
    cells[0] = "S";
    cells[11] = "E";
    for (let cell = 1; cell < 15; cell += 1) {
      if (cell === 11) continue;
      if (walkable.has(cell) || Math.random() > 0.35) {
        const value = values[randomInt(0, values.length - 1)];
        cells[cell] = value;
        if (grade === 3) {
          let factor = 2;
          while (factor <= 10 && (value % factor !== 0 || value / factor > 10)) factor += 1;
          labels[cell] = factor <= 10 ? `${factor}×${value / factor}` : String(value);
        } else labels[cell] = display(value);
      }
    }
    const target = selectedRoute.slice(1, -1).reduce((sum, cell) => sum + cells[cell], 0);
    return { level, target, targetLabel: display(target), display, labels, cells };
  });
}

function useArcadeReward(gameCode, complete, units = 3) {
  const [reward, setReward] = useState(null);
  const requested = useRef(false);
  useEffect(() => {
    if (!complete || requested.current) return;
    requested.current = true;
    claimArcadeReward(gameCode, units).then(setReward).catch((error) => setReward({ rewardXp: 0, message: error.message }));
  }, [complete, gameCode, units]);
  return { reward, reset: () => { requested.current = false; setReward(null); } };
}

function makeFormulaPuzzle(grade) {
  const problem = createEquation(grade, new Set());
  const choices = new Set([problem.answer]);
  if (grade === 4 && String(problem.answer).includes("/")) {
    const [numerator, denominator] = String(problem.answer).split("/").map(Number);
    while (choices.size < 4) choices.add(`${Math.max(0, numerator + randomInt(-2, 2))}/${denominator}`);
  } else while (choices.size < 4) choices.add(Math.round(Math.max(0, Number(problem.answer) + randomInt(-12, 12)) * 100) / 100);
  return { problem, choices: [...choices].sort(() => Math.random() - 0.5) };
}

function makeRocketChallenge(grade) {
  const problem = createEquation(grade, new Set());
  const choices = new Map([[String(problem.answer), String(problem.answer)]]);
  for (let offset = 1; choices.size < 4 && offset < 30; offset += 1) {
    const step = grade === 5 ? 0.1 : 1;
    const delta = Math.ceil(offset / 2) * (offset % 2 ? 1 : -1);
    if (grade === 4 && String(problem.answer).includes("/")) {
      const [numerator, denominator] = String(problem.answer).split("/").map(Number);
      const value = `${Math.max(0, numerator + delta)}/${denominator}`;
      choices.set(value, value);
    } else {
      const value = Math.max(0, Math.round((Number(problem.answer) + delta * step) * 100) / 100);
      choices.set(String(value), String(value));
    }
  }
  return { problem, answers: [...choices.values()].sort(() => Math.random() - 0.5) };
}

function makeOceanSortRound(grade, roundIndex) {
  const count = 5;
  const values = new Set();
  if (grade === 4) {
    const denominator = [6, 8, 10][randomInt(0, 2)];
    while (values.size < count) values.add(randomInt(1, denominator - 1));
    return [...values].map((value, index) => ({ id: `${roundIndex}-${index}`, orderValue: value / denominator, label: `${value}/${denominator}` })).sort(() => Math.random() - 0.5);
  }
  if (grade === 5) {
    while (values.size < count) values.add(randomInt(1, 99));
    return [...values].map((value, index) => ({ id: `${roundIndex}-${index}`, orderValue: value, label: (value / 10).toFixed(1) })).sort(() => Math.random() - 0.5);
  }
  const min = grade === 1 ? 1 : grade === 2 ? 10 : 2;
  const max = grade === 1 ? 20 : grade === 2 ? 100 : 99;
  while (values.size < count) values.add(randomInt(min, max));
  return [...values].map((value, index) => ({ id: `${roundIndex}-${index}`, orderValue: value, label: String(value) })).sort(() => Math.random() - 0.5);
}

function FormulaGame({ grade }) {
  const [round, setRound] = useState(0);
  const [puzzle, setPuzzle] = useState(() => makeFormulaPuzzle(grade));
  const [message, setMessage] = useState("");
  const complete = round >= 3;
  const { reward, reset } = useArcadeReward("formula", complete);
  const { problem, choices } = puzzle;
  function newFormula() {
    setPuzzle(makeFormulaPuzzle(grade)); setMessage("");
  }
  function choose(value) {
    if (value !== problem.answer) { setMessage("Chưa khớp công thức. Hãy tính lại từng bước rồi thử tiếp!"); return; }
    setMessage("Chính xác! Công thức đã cân bằng ✨");
    window.setTimeout(() => { setRound((current) => current + 1); if (round < 2) newFormula(); }, 550);
  }
  function restart() { reset(); setRound(0); newFormula(); }
  return <section className="arcade-card workshop-card"><GameTitle icon="🧩" label={`XƯỞNG CÔNG THỨC · LỚP ${grade}`} title="Lắp ráp công thức" description="Tính phần còn thiếu để công thức hoạt động chính xác." />
    {complete ? <ArcadeDone icon="🧩" title="Công thức đã hoàn tất!" reward={reward} onRestart={restart} /> : <><div className="workshop-progress">MẢNH GHÉP {round + 1} / 3</div><div className="formula-equation">{problem.expression} = <span>?</span></div><p className="word-hint">Tính phép toán theo kiến thức lớp {grade}, sau đó chọn kết quả để lắp vào ô trống.</p><div className="workshop-choices">{choices.map((value) => <button key={value} onClick={() => choose(value)}>{value}</button>)}</div><p className="workshop-message" role="status">{message}</p></>}
  </section>;
}

function makeWordProblem(grade, round = 0) {
  if (grade === 1) {
    const a = randomInt(4, 12); const b = randomInt(2, 20 - a);
    return round % 2 === 0
      ? { text: `Có ${a} quyển sách. Cô giáo tặng thêm ${b} quyển. Bây giờ có tất cả bao nhiêu quyển?`, operation: "+", answer: a + b, hint: "Từ 'tặng thêm' nghĩa là số lượng tăng. Dùng phép cộng trong phạm vi 20." }
      : { text: `Có ${a + b} quyển sách, các bạn mượn ${b} quyển. Còn lại bao nhiêu quyển?`, operation: "−", answer: a, hint: "Số sách giảm đi vì đã cho mượn. Dùng phép trừ trong phạm vi 20." };
  }
  if (grade === 2) {
    const a = randomInt(20, 80); const b = randomInt(5, 100 - a);
    if (round === 0) return { text: `Thư viện có ${a} quyển truyện và nhận thêm ${b} quyển. Thư viện có tất cả bao nhiêu quyển?`, operation: "+", answer: a + b, hint: "Gộp hai nhóm đồ vật, dùng phép cộng trong phạm vi 100." };
    if (round === 1) { const groups = randomInt(2, 10); return { text: `Có ${groups} túi kẹo, mỗi túi có 2 viên. Có tất cả bao nhiêu viên?`, operation: "×", answer: groups * 2, hint: "Cộng lặp lại 2 nhiều lần tương ứng với số túi; có thể dùng bảng nhân 2." }; }
    const groups = randomInt(2, 10);
    return { text: `Có ${groups * 5} bông hoa, chia đều vào 5 lọ. Mỗi lọ có mấy bông?`, operation: "÷", answer: groups, hint: "Chia đều thành 5 phần bằng nhau, dùng phép chia cho 5." };
  }
  if (grade === 3) {
    const groups = randomInt(3, grade === 3 ? 9 : 12); const each = randomInt(2, grade === 3 ? 9 : 12);
    return round % 2 === 0
      ? { text: `Có ${groups} hộp bút, mỗi hộp có ${each} chiếc. Hỏi có tất cả bao nhiêu chiếc bút?`, operation: "×", answer: groups * each, hint: "Các nhóm có số lượng bằng nhau. Nhân số nhóm với số đồ vật trong mỗi nhóm." }
      : { text: `Có ${groups * each} chiếc bút, chia đều vào ${groups} hộp. Mỗi hộp có bao nhiêu chiếc?`, operation: "÷", answer: each, hint: "Chia tổng số đồ vật thành các nhóm bằng nhau." };
  }
  if (grade === 4) {
    if (round % 2 === 0) {
      const denominator = [2, 3, 4, 5, 8, 10][randomInt(0, 5)]; const a = randomInt(1, denominator - 1); const b = randomInt(1, denominator - 1);
      return { text: `Lan ăn ${a}/${denominator} chiếc bánh, rồi em ăn thêm ${b}/${denominator} chiếc bánh. Hỏi hai bạn đã ăn bao nhiêu chiếc bánh?`, operation: "+", answer: (a + b) / denominator, hint: "Hai phân số có cùng mẫu số: cộng các tử số và giữ nguyên mẫu số." };
    }
    const length = randomInt(3, 12); const width = randomInt(2, 9);
    return { text: `Một mảnh vườn hình chữ nhật dài ${length} m, rộng ${width} m. Diện tích mảnh vườn là bao nhiêu mét vuông?`, operation: "×", answer: length * width, hint: "Diện tích hình chữ nhật bằng chiều dài nhân chiều rộng." };
  }
  if (round === 1) {
    const percent = [10, 20, 25, 50][randomInt(0, 3)]; const total = randomInt(2, 10) * 100;
    return { text: `Một chiếc cặp giá ${total} nghìn đồng, cửa hàng giảm giá ${percent}%. Số tiền được giảm là bao nhiêu?`, operation: "%", answer: total * percent / 100, hint: `Tính ${percent}% của ${total}: đổi phần trăm thành phân số hoặc số thập phân rồi nhân với ${total}.` };
  }
  const price = randomInt(12, 45) / 10; const count = randomInt(2, 8);
  return { text: `Mỗi quyển vở giá ${price.toFixed(1)} nghìn đồng. Mua ${count} quyển hết bao nhiêu nghìn đồng?`, operation: "×", answer: Math.round(price * count * 10) / 10, hint: `Giá mỗi quyển được lặp lại ${count} lần. Lấy giá một quyển nhân số quyển.` };
}

function WordProblemGame({ grade }) {
  const [round, setRound] = useState(0); const [problem, setProblem] = useState(() => makeWordProblem(grade));
  const [operation, setOperation] = useState(""); const [answer, setAnswer] = useState(""); const [message, setMessage] = useState(""); const [showHint, setShowHint] = useState(false);
  const complete = round >= 3; const { reward, reset } = useArcadeReward("word", complete);
  function submit() {
    const parsedAnswer = answer.includes("/") ? answer.split("/").map(Number).reduce((numerator, denominator) => numerator / denominator) : Number(answer);
    if (operation !== problem.operation || Math.abs(parsedAnswer - problem.answer) > 0.001) { setMessage("Chưa đúng. Đọc lại dữ kiện và xác định phép tính phù hợp nhé."); setShowHint(true); return; }
    setMessage("Em đã giải đúng bài toán! 🎉");
    window.setTimeout(() => { const next = round + 1; setRound(next); if (next < 3) setProblem(makeWordProblem(grade, next)); setOperation(""); setAnswer(""); setShowHint(false); setMessage(""); }, 650);
  }
  function restart() { reset(); setRound(0); setProblem(makeWordProblem(grade, 0)); setOperation(""); setAnswer(""); setMessage(""); setShowHint(false); }
  return <section className="arcade-card workshop-card"><GameTitle icon="🔎" label={`THÁM TỬ TOÁN ĐỐ · LỚP ${grade}`} title="Giải mã bài toán" description="Đọc tình huống, chọn phép tính rồi nhập kết quả để mở khóa." />
    {complete ? <ArcadeDone icon="🏆" title="Vụ án đã được phá giải!" reward={reward} onRestart={restart} /> : <><div className="workshop-progress">VỤ VIỆC {round + 1} / 3</div><div className="word-story">{problem.text}</div><div className="operation-picker" aria-label="Chọn phép tính">{["+", "−", "×", "÷", "%"].map((symbol) => <button key={symbol} className={operation === symbol ? "operation-active" : ""} onClick={() => setOperation(symbol)}>{symbol}</button>)}</div><label className="word-answer">Kết quả của em<input type="text" inputMode="decimal" value={answer} onChange={(event) => setAnswer(event.target.value)} placeholder="Nhập đáp án (phân số có thể ghi 3/4)" /></label><button className="arcade-primary" disabled={!operation || answer === ""} onClick={submit}>Kiểm tra lời giải 🔐</button><p className="workshop-message" role="status">{message}</p>{showHint && <div className="word-explanation"><b>Gợi ý cách làm:</b> {problem.hint}</div>}</>}
  </section>;
}

function makeGeometryTasks(grade) {
  if (grade === 1) return ["triangle", "square", "rectangle", "circle"].sort(() => Math.random() - 0.5).slice(0, 3).map((answer) => ({ kind: "identify", answer, prompt: `Tìm ${answer === "triangle" ? "hình tam giác" : answer === "square" ? "hình vuông" : answer === "rectangle" ? "hình chữ nhật" : "hình tròn"}`, label: "Nhận biết hình", unit: "" }));
  if (grade === 2) return [3, 4, 5].sort(() => Math.random() - 0.5).map((sides) => ({ kind: "sides", sides, prompt: `Chọn hình có ${sides} cạnh`, label: "Đếm cạnh", unit: "cạnh" }));
  const kinds = (grade === 3 ? ["area", "perimeter", "area"] : grade === 4 ? ["area", "perimeter", "area"] : ["triangleArea", "area", "triangleArea"]).sort(() => Math.random() - 0.5);
  return Array.from({ length: 3 }, (_, index) => {
    const kind = kinds[index];
    const width = randomInt(2, grade === 3 ? 5 : 6);
    const height = randomInt(2, grade === 3 ? 5 : 6);
    return { width, height, kind, label: kind === "perimeter" ? "Chu vi" : kind === "triangleArea" ? "Diện tích tam giác" : "Diện tích", unit: kind === "perimeter" ? "đơn vị" : "ô vuông" };
  });
}
function GeometryGame({ grade }) {
  const [round, setRound] = useState(0); const [width, setWidth] = useState(2); const [height, setHeight] = useState(2); const [shapeChoice, setShapeChoice] = useState(""); const [message, setMessage] = useState("");
  const [geometryTasks, setGeometryTasks] = useState(() => makeGeometryTasks(grade));
  const complete = round >= geometryTasks.length; const { reward, reset } = useArcadeReward("geometry", complete);
  const task = geometryTasks[Math.min(round, geometryTasks.length - 1)];
  const target = task.kind === "area" ? task.width * task.height : task.kind === "triangleArea" ? task.width * task.height / 2 : task.kind === "perimeter" ? 2 * (task.width + task.height) : 0;
  const made = task.kind === "area" ? width * height : task.kind === "triangleArea" ? width * height / 2 : task.kind === "perimeter" ? 2 * (width + height) : 0;
  function check() {
    const shapeCorrect = task.kind === "identify" ? shapeChoice === task.answer : task.kind === "sides" ? shapeOptions.find((shape) => shape.id === shapeChoice)?.sides === task.sides : made === target;
    if (!shapeCorrect) { setMessage(task.kind === "identify" || task.kind === "sides" ? "Chưa đúng hình rồi. Quan sát tên hình và số cạnh nhé." : `Chưa đúng. Hãy dùng công thức phù hợp để đạt ${target} ${task.unit}.`); return; }
    setMessage(task.kind === "identify" || task.kind === "sides" ? "Em nhận biết hình chính xác! 🌟" : "Hình đã đúng kích thước! 🌟");
    window.setTimeout(() => { setRound((current) => current + 1); setWidth(2); setHeight(2); setShapeChoice(""); setMessage(""); }, 600);
  }
  function restart() { reset(); setRound(0); setGeometryTasks(makeGeometryTasks(grade)); setWidth(2); setHeight(2); setShapeChoice(""); setMessage(""); }
  const shapeOptions = [{ id: "triangle", name: "Tam giác", sides: 3, icon: "🔺" }, { id: "square", name: "Hình vuông", sides: 4, icon: "🟦" }, { id: "rectangle", name: "Hình chữ nhật", sides: 4, icon: "▰" }, { id: "pentagon", name: "Ngũ giác", sides: 5, icon: "⬟" }, { id: "hexagon", name: "Lục giác", sides: 6, icon: "⬡" }, { id: "circle", name: "Hình tròn", sides: 0, icon: "⚪" }];
  const gradeDescription = grade === 1 ? "Nhận biết hình cơ bản." : grade === 2 ? "Quan sát và đếm số cạnh." : grade === 3 ? "Tính chu vi và đếm diện tích bằng ô vuông." : grade === 4 ? "Tính diện tích, chu vi hình chữ nhật." : "Khám phá công thức diện tích tam giác.";
  return <section className="arcade-card workshop-card"><GameTitle icon="📐" label={`KIẾN TRÚC SƯ HÌNH HỌC · LỚP ${grade}`} title="Xây hình đúng yêu cầu" description={gradeDescription} />
    {complete ? <ArcadeDone icon="🏠" title="Ba công trình hoàn thành!" reward={reward} onRestart={restart} /> : <><div className="workshop-progress">CÔNG TRÌNH {round + 1} / 3 · {task.prompt || `${task.label.toUpperCase()} CẦN ĐẠT: ${target} ${task.unit}`}</div>{task.kind === "identify" || task.kind === "sides" ? <div className="shape-picker">{shapeOptions.map((shape) => <button key={shape.id} className={shapeChoice === shape.id ? "operation-active" : ""} onClick={() => setShapeChoice(shape.id)}><span>{shape.icon}</span>{shape.name}{task.kind === "sides" && <small>{shape.sides} cạnh</small>}</button>)}</div> : <><div className="geometry-controls"><label>Chiều dài <button onClick={() => setWidth((value) => Math.max(1, value - 1))}>−</button><b>{width}</b><button onClick={() => setWidth((value) => Math.min(6, value + 1))}>+</button></label><label>Chiều cao <button onClick={() => setHeight((value) => Math.max(1, value - 1))}>−</button><b>{height}</b><button onClick={() => setHeight((value) => Math.min(6, value + 1))}>+</button></label></div><div className="geometry-grid" style={{ gridTemplateColumns: "repeat(6, 1fr)" }} aria-label={`Hình ${width} nhân ${height}`}>{Array.from({ length: 36 }, (_, index) => { const row = Math.floor(index / 6); const column = index % 6; const filled = task.kind === "triangleArea" ? row < height && column < Math.ceil((row + 1) * width / height) : row < height && column < width; return <span key={index} className={filled ? "geometry-square filled-square" : "geometry-square"} />; })}</div><p className="geometry-current">{task.kind === "area" ? `Diện tích: ${width} × ${height} = ${made} ô vuông` : task.kind === "triangleArea" ? `Diện tích tam giác: đáy × chiều cao ÷ 2 = ${width} × ${height} ÷ 2 = ${made} ô vuông` : `Chu vi hình chữ nhật: 2 × (${width} + ${height}) = ${made} đơn vị`}</p></>}<button className="arcade-primary" disabled={(task.kind === "identify" || task.kind === "sides") && !shapeChoice} onClick={check}>Kiểm tra công trình 🏗️</button><p className="workshop-message" role="status">{message}</p></>}
  </section>;
}

function GameTitle({ icon, label, title, description }) { return <div className="arcade-game-heading"><span className="arcade-emoji">{icon}</span><div><small>{label}</small><h1>{title}</h1><p>{description}</p></div></div>; }
function ArcadeDone({ icon, title, reward, onRestart }) { return <div className="arcade-finish"><span>{icon}</span><h2>{title}</h2><p className="arcade-xp">{reward ? reward.message : "Đang ghi nhận XP…"}</p><button onClick={onRestart}>Chơi lại</button></div>; }

function ArcadeHeader() {
  return <header className="arcade-header"><Link to="/tro-choi">← Các trò chơi</Link><Link to="/dashboard">Về góc học</Link></header>;
}

function getArithmeticExample(grade) {
  if (grade === 1) return "8 + 5: tách 5 thành 2 và 3; 8 + 2 = 10, rồi 10 + 3 = 13.";
  if (grade === 2) return "36 + 24: cộng chục 30 + 20 = 50, cộng đơn vị 6 + 4 = 10; 50 + 10 = 60.";
  if (grade === 3) return "6 × 4 là 6 nhóm, mỗi nhóm 4: 4 + 4 + 4 + 4 + 4 + 4 = 24.";
  if (grade === 4) return "1/4 + 2/4 = 3/4: hai phân số cùng mẫu nên cộng tử số, giữ nguyên mẫu số.";
  return "1,2 + 0,8 = 2,0: cộng hàng phần mười được 10 phần mười, tức 1 đơn vị.";
}

function getGameLesson(mode, grade) {
  const arithmeticExample = getArithmeticExample(grade);
  const lessons = {
    balance: {
      title: "Cân bằng là hai bên có cùng giá trị",
      concept: "Một chiếc cân nằm ngang khi tổng giá trị bên trái bằng tổng giá trị bên phải. Chuyển một khối không làm mất giá trị của khối đó; điều quan trọng là sau khi chuyển, hai tổng có bằng nhau không.",
      strategy: "Đọc giá trị từng khối, cộng riêng mỗi bên rồi thử đổi vị trí một khối. Với phân số hoặc số thập phân, hãy quy về cùng đơn vị trước khi so sánh.",
      example: grade === 4 ? "Ví dụ: 1/4 + 3/4 = 2/4 + 2/4. Mỗi bên đều bằng 4/4, tức một đơn vị." : grade === 5 ? "Ví dụ: 0,4 + 1,2 = 0,7 + 0,9. Cả hai bên đều bằng 1,6." : "Ví dụ: 3 + 7 = 4 + 6. Mỗi bên đều có tổng bằng 10, nên cân thăng bằng.",
      reminder: "Đừng so từng khối riêng lẻ—hãy so tổng của cả hai bên."
    },
    maze: {
      title: "Lập đường đi bằng cách theo dõi tổng",
      concept: "Robot chỉ đi được qua ô trống và các ô số. Mỗi ô số mới được ghé thăm sẽ làm tổng thay đổi; lên kế hoạch đường đi giúp em vừa tránh tường vừa theo dõi được kết quả.",
      strategy: "Trước khi rẽ, cộng số ở ô sắp bước vào với tổng hiện tại. Nếu đi lại qua ô cũ, trò chơi không cộng ô đó lần thứ hai.",
      example: "Ví dụ một đường đi qua các ô 4, 6 rồi 3: tổng lần lượt là 4, 10, 13. Ghi tổng sau mỗi bước sẽ giúp em biết đường nào đưa robot tới đích.",
      reminder: "Không chỉ tìm đường ngắn nhất; cần kiểm tra các con số trên đường đi."
    },
    geometry: {
      title: "Nhìn đặc điểm hình trước khi tính",
      concept: grade <= 2 ? "Hình được gọi tên theo đặc điểm như số cạnh và góc, dù hình có xoay hoặc đổi màu. Hãy đếm cạnh thật cẩn thận trước khi chọn." : grade <= 4 ? "Chu vi đo đường bao quanh hình; diện tích đếm phần mặt bên trong. Hai đại lượng trả lời hai câu hỏi khác nhau nên dùng cách tính và đơn vị khác nhau." : "Diện tích tam giác bằng đáy nhân chiều cao vuông góc rồi chia 2. Chiều cao không nhất thiết là cạnh nghiêng của tam giác.",
      strategy: grade <= 2 ? "Lần theo đường viền một vòng và đếm mỗi cạnh đúng một lần. So sánh hình bằng đặc điểm, không bằng màu." : "Đánh dấu chiều dài, chiều cao trên hình. Tự hỏi đề muốn đo viền quanh hay phần bên trong, rồi mới chọn công thức.",
      example: grade === 1 ? "Một hình có 3 cạnh thẳng là tam giác. Xoay hình vẫn có 3 cạnh nên tên hình không đổi." : grade === 2 ? "Hình vuông và hình chữ nhật đều có 4 cạnh, nhưng hình vuông có cả 4 cạnh bằng nhau." : grade === 3 ? "Hình chữ nhật dài 5, rộng 3: chu vi là 5 + 3 + 5 + 3 = 16 đơn vị; diện tích là 5 × 3 = 15 ô vuông." : grade === 4 ? "Hình chữ nhật 4 × 3 có diện tích 12 ô vuông. Đếm theo 4 hàng, mỗi hàng 3 ô cũng được 12." : "Tam giác có đáy 6 và chiều cao 4: diện tích = 6 × 4 ÷ 2 = 12 ô vuông.",
      reminder: "Chu vi ghi đơn vị độ dài; diện tích ghi đơn vị vuông."
    },
    crossmath: {
      title: "Mỗi ô ảnh hưởng đồng thời hàng và cột",
      concept: "Trong bảng 3 × 3, mỗi ô thuộc một hàng và một cột. Một số đặt đúng cho hàng nhưng có thể làm sai tổng cột, vì vậy cần kiểm tra cả hai hướng.",
      strategy: "Bắt đầu từ hàng hoặc cột chỉ còn ít cách ghép. Sau mỗi lần đặt một ô, cập nhật hai tổng liên quan; nếu một tổng đã vượt mục tiêu thì đổi số đó.",
      example: grade === 2 ? "Ví dụ: một hàng mục tiêu 60 có thể gồm 10 + 20 + 30. Nhưng các số ấy còn phải kết hợp đúng trong từng cột." : grade === 4 ? "Ví dụ: 1/4 + 1/4 + 2/4 = 4/4 = 1. Khi đặt vào bảng, nhớ kiểm tra mẫu số và tổng mục tiêu." : grade === 5 ? "Ví dụ: 0,2 + 0,5 + 0,8 = 1,5. Căn các hàng phần mười để tính tổng chính xác." : "Ví dụ: 2 + 3 + 4 = 9 là tổng một hàng. Mỗi số trong hàng đó cũng nằm trong một cột cần đạt đúng mục tiêu riêng.",
      reminder: "Đừng chỉ nhìn hàng ngang—hãy rà lại các cột dọc nữa."
    },
    rectangles: {
      title: "Diện tích là số ô vuông bên trong hình",
      concept: "Mỗi ô nhỏ là một đơn vị diện tích. Hình chữ nhật có thể đếm theo hàng và cột: số ô bằng số hàng nhân số ô trong mỗi hàng.",
      strategy: "Kéo từ một góc tới góc đối diện để thử hình. Đếm số hàng và cột, nhân chúng rồi so với diện tích cần tạo.",
      example: grade === 1 ? "Hình 2 hàng, mỗi hàng 2 ô có 4 ô vuông." : grade === 2 ? "Hình 2 hàng, mỗi hàng 3 ô có 2 × 3 = 6 ô vuông." : grade === 3 ? "Hình 3 hàng, mỗi hàng 4 ô có diện tích 3 × 4 = 12 ô vuông." : grade === 4 ? "Hình 4 hàng, mỗi hàng 4 ô có diện tích 4 × 4 = 16 ô vuông." : "Hình 3 hàng, mỗi hàng 6 ô có diện tích 3 × 6 = 18 ô vuông.",
      reminder: "Chỉ đếm ô bên trong; đường viền là chu vi, không phải diện tích."
    },
    "drag-race": {
      title: "Tính có chiến lược để tăng tốc",
      concept: "Trả lời đúng giúp xe tiến lên. Mục tiêu không chỉ là tính nhanh mà còn là nhận ra phép tính, chọn cách giải phù hợp và kiểm tra kết quả trước khi bấm.",
      strategy: "Nhẩm hoặc viết bước trung gian trước. Với phép chia, kiểm tra bằng phép nhân; với số thập phân, giữ dấu phẩy theo đúng hàng.",
      example: arithmeticExample,
      reminder: "Nếu lỡ sai, hãy xem lại phép tính vừa hiện thay vì chỉ đoán đáp án khác."
    },
    rocket: {
      title: "Giải phép tính rồi chọn đúng hành tinh",
      concept: "Bảng điều khiển hiện phép tính; các hành tinh mang những kết quả khác nhau. Tính xong trước khi chọn giúp em tránh mất khiên và hiểu vì sao đáp án đúng.",
      strategy: "Tách phép tính thành bước nhỏ, ước lượng kết quả rồi so với các hành tinh. Với phân số, chú ý các phần phải cùng kích thước; với số thập phân, cộng theo hàng.",
      example: arithmeticExample,
      reminder: "Hãy nêu cách tính thành lời trước khi lái tàu tới hành tinh."
    },
    ocean: {
      title: "Tính giá trị ngọc để mở rương vừa đủ",
      concept: grade === 4 ? "Mỗi viên ngọc là một phân số cùng mẫu. Cộng các phần đã nhặt và dừng khi đủ một đơn vị; vượt mục tiêu sẽ làm mất tim." : grade === 5 ? "Các viên ngọc là số thập phân. Theo dõi tổng theo hàng phần mười để chạm đúng mục tiêu mà không vượt quá." : "Mỗi viên ngọc mang một giá trị. Em cần tính tổng sau mỗi lần hứng, tránh đá và dừng đúng lúc để mở rương.",
      strategy: "Tính trước giá trị viên ngọc tiếp theo rồi cộng với số đang có. Nếu tổng sẽ vượt mục tiêu, đừng lao vào viên đó.",
      example: grade === 1 ? "Rương cần 10: có 6 rồi, chọn viên +2 được 8; viên +2 nữa vừa đủ 10." : grade === 2 ? "Rương cần 100: 30 + 20 = 50, còn thiếu 50 để vừa đủ." : grade === 3 ? "Rương cần 36: 12 + 8 = 20, còn cần 16; hai viên +8 nữa sẽ vừa đủ." : grade === 4 ? "Rương cần 4/4: đang có 2/4 thì cần thêm 2/4, không phải một phân số khác mẫu chưa quy đổi." : "Rương cần 2,0: đang có 1,0 thì cần thêm 1,0 nữa để vừa đủ 2,0.",
      reminder: "So sánh tổng mới với mục tiêu trước khi hứng ngọc."
    },
    memory: {
      title: "Ghi nhớ phép tính và ghép với kết quả",
      concept: "Mỗi cặp gồm một thẻ phép tính và một thẻ kết quả. Lật hai thẻ mỗi lượt; khi chúng khớp, hãy nói lại cách tính để ghi nhớ kiến thức chứ không chỉ nhớ vị trí.",
      strategy: "Đọc thành tiếng thẻ vừa lật, thử tự tính trước khi lật thẻ thứ hai. Ghi nhớ vị trí những thẻ đã thấy và dùng phép tính ngược để kiểm tra.",
      example: grade === 1 ? "Thẻ 8 + 5 ghép với 13. Có thể tách 5 thành 2 và 3 để tính qua 10." : grade === 2 ? "Thẻ 6 × 5 ghép với 30. Kiểm tra bằng phép cộng lặp: 5 + 5 + 5 + 5 + 5 + 5 = 30." : grade === 3 ? "Thẻ 24 ÷ 6 ghép với 4 vì 6 × 4 = 24." : grade === 4 ? "Thẻ 1/4 + 2/4 ghép với 3/4 vì hai phân số cùng mẫu số." : "Thẻ 1,2 + 0,8 ghép với 2,0; 12 phần mười + 8 phần mười = 20 phần mười.",
      reminder: "Ghép xong hãy giải thích vì sao hai thẻ tương ứng—đừng chỉ nhớ hình ảnh."
    }
  };
  return lessons[mode] || null;
}

function GameLearningPanel({ mode, grade }) {
  const lesson = getGameLesson(mode, grade);
  if (!lesson) return null;
  return <details className="game-learning-panel" open>
    <summary><span>📖</span><span><small>GÓC HỌC TOÁN · LỚP {grade}</small><strong>{lesson.title}</strong></span><i aria-hidden="true">⌄</i></summary>
    <div className="game-learning-content">
      <article><strong>🧠 Hiểu điều gì?</strong><p>{lesson.concept}</p></article>
      <article><strong>🪄 Cách suy nghĩ</strong><p>{lesson.strategy}</p></article>
      <article className="game-learning-example"><strong>✏️ Ví dụ có lời giải</strong><p>{lesson.example}</p></article>
      <p className="game-learning-reminder"><b>🌟 Nhớ nhé:</b> {lesson.reminder}</p>
    </div>
  </details>;
}

function MemoryGame({ grade }) {
  const [deck, setDeck] = useState(() => makeMemoryDeck(grade));
  const [flipped, setFlipped] = useState([]);
  const [matched, setMatched] = useState([]);
  const [moves, setMoves] = useState(0);
  const [locked, setLocked] = useState(false);
  const [reward, setReward] = useState(null);
  const rewardRequested = useRef(false);
  const [best, setBest] = useState(() => Number(localStorage.getItem(`mathkids-memory-best-${grade}`)) || 0);
  const complete = matched.length === 6;

  useEffect(() => {
    if (!complete || rewardRequested.current) return;
    rewardRequested.current = true;
    const score = Math.max(10, 100 - moves * 4);
    setBest((previous) => {
      const nextBest = Math.max(previous, score);
      localStorage.setItem(`mathkids-memory-best-${grade}`, String(nextBest));
      return nextBest;
    });
    claimArcadeReward("memory", 6).then(setReward).catch((error) => setReward({ rewardXp: 0, message: error.message }));
  }, [complete, moves, grade]);

  useEffect(() => {
    if (flipped.length !== 2) return undefined;
    const [first, second] = flipped.map((id) => deck.find((card) => card.id === id));
    if (first?.pair === second?.pair && first?.type !== second?.type) {
      const timer = window.setTimeout(() => {
        setMatched((current) => [...current, first.pair]);
        setFlipped([]);
      }, 500);
      return () => window.clearTimeout(timer);
    }
    setLocked(true);
    const timer = window.setTimeout(() => { setFlipped([]); setLocked(false); }, 900);
    return () => window.clearTimeout(timer);
  }, [flipped, deck, moves, grade]);

  function flip(card) {
    if (locked || flipped.length === 2 || matched.includes(card.pair) || flipped.includes(card.id)) return;
    const next = [...flipped, card.id];
    setFlipped(next);
    if (next.length === 2) setMoves((current) => current + 1);
  }

  function restart() {
    rewardRequested.current = false;
    setReward(null); setDeck(makeMemoryDeck(grade)); setFlipped([]); setMatched([]); setMoves(0); setLocked(false);
  }

  return <section className="arcade-card memory-card">
    <div className="arcade-game-heading"><span className="arcade-emoji">🃏</span><div><small>TRÒ CHƠI TRÍ NHỚ · LỚP {grade}</small><h1>Lật thẻ tìm cặp</h1><p>Ghi nhớ phép tính và tìm thẻ kết quả tương ứng.</p></div></div>
    <div className="arcade-stats"><span>Đã ghép <b>{matched.length}/6</b></span><span>Lượt lật <b>{moves}</b></span><span>Kỷ lục <b>{best}</b></span></div>
    {complete ? <div className="arcade-finish"><span>🎉</span><h2>Ghép đủ các cặp!</h2><p>Bạn hoàn thành trong {moves} lượt lật.</p><p className="arcade-xp">{reward ? reward.message : "Đang ghi nhận XP…"}</p><button onClick={restart}>Chơi lại</button></div> : <div className="memory-grid">{deck.map((card) => {
      const visible = flipped.includes(card.id) || matched.includes(card.pair);
      return <button key={card.id} className={`memory-tile ${visible ? "is-open" : ""} ${matched.includes(card.pair) ? "is-matched" : ""}`} onClick={() => flip(card)} aria-label={visible ? card.text : "Lật thẻ"} aria-pressed={visible}>
        <span className="memory-tile-inner"><span className="memory-tile-back" aria-hidden="true">✦</span><span className="memory-tile-front">{card.text}</span></span>
      </button>;
    })}</div>}
    {!complete && <button className="arcade-secondary" onClick={restart}>Trộn và chơi lại ↻</button>}
  </section>;
}

function GardenGame({ grade }) {
  const rounds = useMemo(() => Array.from({ length: 3 }, (_, index) => makeGardenRound(grade, index)), [grade]);
  const [roundIndex, setRoundIndex] = useState(0);
  const [selected, setSelected] = useState([]);
  const [harvested, setHarvested] = useState(0);
  const [message, setMessage] = useState("");
  const [planting, setPlanting] = useState(false);
  const [reward, setReward] = useState(null);
  const rewardRequested = useRef(false);
  const round = rounds[roundIndex];
  const chosenValues = round ? round.tiles.filter((tile) => selected.includes(tile.id)).map((tile) => tile.value) : [];
  const sumPrecision = grade === 4 ? 1000 : grade === 5 ? 100 : 1;
  const sum = chosenValues.length === 2 ? (round.operation === "×" ? chosenValues[0] * chosenValues[1] : Math.round((chosenValues[0] + chosenValues[1]) * sumPrecision) / sumPrecision) : chosenValues.reduce((total, value) => total + value, 0);
  const complete = harvested === rounds.length;

  useEffect(() => {
    if (!complete || rewardRequested.current) return;
    rewardRequested.current = true;
    claimArcadeReward("garden", 3).then(setReward).catch((error) => setReward({ rewardXp: 0, message: error.message }));
  }, [complete]);

  function toggleTile(tile) {
    if (planting) return;
    if (selected.includes(tile.id)) setSelected((current) => current.filter((id) => id !== tile.id));
    else if (selected.length < 2) setSelected((current) => [...current, tile.id]);
    setMessage("");
  }

  function harvest() {
    if (planting) return;
    if (sum !== round.target) {
      setMessage(sum > round.target ? "Hai quả này cho kết quả lớn hơn mục tiêu — hãy chọn lại." : "Chưa đúng. Hãy chọn hai quả để phép tính bằng mục tiêu.");
      return;
    }
    setHarvested((current) => current + 1);
    setSelected([]);
    setPlanting(true);
    setMessage("🌱 Chính xác! Cây trong vườn đã lớn thêm.");
    window.setTimeout(() => { setRoundIndex((current) => Math.min(current + 1, rounds.length - 1)); setMessage(""); setPlanting(false); }, 650);
  }

  function restart() { rewardRequested.current = false; setReward(null); setRoundIndex(0); setSelected([]); setHarvested(0); setMessage(""); setPlanting(false); }

  return <section className="arcade-card garden-card">
    <div className="arcade-game-heading"><span className="arcade-emoji">🌻</span><div><small>THỬ THÁCH TOÁN · LỚP {grade}</small><h1>Khu vườn phép tính</h1><p>{grade === 1 ? "Cộng trong phạm vi 20." : grade === 2 ? "Ôn cộng đến 100 và bảng nhân 2, 5." : grade === 3 ? "Luyện bảng nhân và phép chia." : grade === 4 ? "Cộng phân số cùng mẫu số." : "Cộng số thập phân."}</p></div></div>
    <div className="garden-progress">{rounds.map((item, index) => <span key={item.id} className={index < harvested ? "grown" : ""}>{index < harvested ? "🌼" : "🌱"}</span>)}</div>
    {complete ? <div className="arcade-finish"><span>🌻</span><h2>Khu vườn nở rộ!</h2><p>Bạn đã thu hoạch chính xác cả 3 luống.</p><p className="arcade-xp">{reward ? reward.message : "Đang ghi nhận XP…"}</p><button onClick={restart}>Chơi lại</button></div> : <>
      <div className="garden-target"><small>LUỐNG {roundIndex + 1} · {round.operation === "×" ? "TÍCH" : round.operation === "fraction" ? "TỔNG PHÂN SỐ" : "TỔNG"} MỤC TIÊU</small><strong>{round.fractionTarget || round.target}</strong><span>{round.operation === "×" ? "Chọn hai thừa số" : round.operation === "fraction" ? "Cộng hai phân số cùng mẫu" : "Chọn hai số có tổng"} · Kết quả: {selected.length === 2 ? sum : "—"}</span></div>
      <div className="fruit-grid">{round.tiles.map((tile) => <button key={tile.id} className={`fruit-tile ${selected.includes(tile.id) ? "fruit-selected" : ""}`} onClick={() => toggleTile(tile)} disabled={planting} aria-pressed={selected.includes(tile.id)}><span>{selected.includes(tile.id) ? "🍎" : "🍏"}</span><b>{tile.display}</b></button>)}</div>
      {message && <p className={`garden-message ${sum === round.target ? "is-good" : ""}`} role="status">{message}</p>}
      <div className="garden-actions"><button className="arcade-secondary" disabled={planting} onClick={() => { setSelected([]); setMessage(""); }}>Bỏ chọn</button><button className="arcade-primary" disabled={selected.length !== 2 || planting} onClick={harvest}>{planting ? "Đang nảy mầm…" : "Thu hoạch 🌱"}</button></div>
    </>}
  </section>;
}

function BalanceGame({ grade }) {
  const [round, setRound] = useState(0);
  const [tiles, setTiles] = useState(() => makeBalanceTiles(grade, 0));
  const [selected, setSelected] = useState(null);
  const [message, setMessage] = useState("");
  const [reward, setReward] = useState(null);
  const rewardRequested = useRef(false);
  const complete = round >= 3;
  const leftTotal = tiles.filter((tile) => tile.side === "left").reduce((total, tile) => total + tile.value, 0);
  const rightTotal = tiles.filter((tile) => tile.side === "right").reduce((total, tile) => total + tile.value, 0);
  const balanceDenominator = tiles[0]?.denominator || 1;
  const showTotal = (value) => grade === 4 ? (() => { const whole = Math.floor(value / balanceDenominator); const part = value % balanceDenominator; return whole ? (part ? `${whole} ${part}/${balanceDenominator}` : String(whole)) : `${part}/${balanceDenominator}`; })() : grade === 5 ? round === 1 ? `${value * 10}%` : (value / 10).toFixed(1).replace(".", ",") : value;
  const placedCount = tiles.filter((tile) => tile.side !== "tray").length;
  const roundFocus = grade === 1 ? ["Cộng nhóm số nhỏ.", "Tách số thành hai phần rồi cộng.", "Dùng phép trừ để tạo cùng giá trị."][round]
    : grade === 2 ? ["So sánh tổng các số.", "Tách số chục bằng phép cộng.", "Tính tích trong bảng nhân."][round]
      : grade === 3 ? ["Cân bằng các số.", "Tính thương trên từng khối.", "Tính tích trong bảng nhân."][round]
        : grade === 4 ? `Ghép các phân số mẫu ${balanceDenominator}.`
          : ["Cân bằng số thập phân.", "Đổi số thập phân sang phần trăm tương ứng.", "Cân bằng số thập phân lớn hơn."][round];

  useEffect(() => {
    if (!complete || rewardRequested.current) return;
    rewardRequested.current = true;
    claimArcadeReward("balance", 3).then(setReward).catch((error) => setReward({ rewardXp: 0, message: error.message }));
  }, [complete]);

  function placeOn(side) {
    if (selected === null) return;
    setTiles((current) => current.map((tile) => tile.id === selected ? { ...tile, side } : tile));
    setSelected(null);
    setMessage("");
  }

  function balance() {
    if (placedCount !== 4 || leftTotal !== rightTotal) {
      setMessage(placedCount < 4 ? "Hãy đặt đủ các khối lên hai bệ trước nhé." : "Hai bệ chưa cân bằng — thử đổi vị trí các khối.");
      return;
    }
    setMessage("⚖️ Cân bằng hoàn hảo!");
    window.setTimeout(() => {
      const nextRound = round + 1;
      setRound(nextRound);
      setTiles(nextRound < 3 ? makeBalanceTiles(grade, nextRound) : []);
      setSelected(null);
      setMessage("");
    }, 600);
  }

  function restart() {
    rewardRequested.current = false; setReward(null); setRound(0); setTiles(makeBalanceTiles(grade, 0)); setSelected(null); setMessage("");
  }

  return <section className="arcade-card balance-card">
    <div className="arcade-game-heading"><span className="arcade-emoji">⚖️</span><div><small>TRÒ CHƠI CHIẾN LƯỢC · LỚP {grade}</small><h1>Tháp cân bằng</h1><p>{grade === 4 ? "Cân bằng các phân số cùng mẫu số." : grade === 5 ? "Cân bằng các số thập phân đến hàng phần mười." : "Chia các số thành hai nhóm có tổng bằng nhau."}</p></div></div>
    {complete ? <div className="arcade-finish"><span>🏗️</span><h2>Cả ba tháp đã vững!</h2><p>Bạn đã tìm được cách chia cân bằng.</p><p className="arcade-xp">{reward ? reward.message : "Đang ghi nhận XP…"}</p><button onClick={restart}>Xây lại</button></div> : <>
      <div className="balance-round-label">VÒNG {round + 1} / 3 · {roundFocus} · ĐÃ ĐẶT {placedCount}/4 KHỐI</div>
      <div className="balance-scales"><div className="balance-pan"><strong>BỆ TRÁI</strong><span>{showTotal(leftTotal)}</span>{tiles.filter((tile) => tile.side === "left").map((tile) => <button key={tile.id} className="placed-number-block" onClick={() => setTiles((current) => current.map((item) => item.id === tile.id ? { ...item, side: "tray" } : item))}>{tile.display || tile.value} ×</button>)}</div><div className="balance-beam">⚖️</div><div className="balance-pan"><strong>BỆ PHẢI</strong><span>{showTotal(rightTotal)}</span>{tiles.filter((tile) => tile.side === "right").map((tile) => <button key={tile.id} className="placed-number-block" onClick={() => setTiles((current) => current.map((item) => item.id === tile.id ? { ...item, side: "tray" } : item))}>{tile.display || tile.value} ×</button>)}</div></div>
      <p className="balance-instruction">Chọn khối rồi đặt lên bệ. Chạm khối trên bệ để đưa về khay.</p>
      <div className="balance-tray">{tiles.filter((tile) => tile.side === "tray").map((tile) => <button key={tile.id} className={selected === tile.id ? "number-block selected-block" : "number-block"} onClick={() => setSelected(tile.id)}>{tile.display || tile.value}</button>)}</div>
      <div className="balance-actions"><button className="arcade-secondary" disabled={selected === null} onClick={() => placeOn("left")}>Đặt bên trái</button><button className="arcade-secondary" disabled={selected === null} onClick={() => placeOn("right")}>Đặt bên phải</button><button className="arcade-primary" disabled={placedCount !== 4 || leftTotal !== rightTotal} onClick={balance}>Cân bằng →</button></div>
      {message && <p className={`garden-message ${leftTotal === rightTotal && placedCount === 4 ? "is-good" : ""}`} role="status">{message}</p>}
      <button className="arcade-text-button" onClick={() => setTiles((current) => current.map((tile) => ({ ...tile, side: "tray" })))}>Làm lại vòng này</button>
    </>}
  </section>;
}

function RocketGame({ grade }) {
  const [round, setRound] = useState(0);
  const [challenge, setChallenge] = useState(() => makeRocketChallenge(grade));
  const [shields, setShields] = useState(3);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("Chọn hành tinh có đáp án đúng để bay tới!");
  const [lastHit, setLastHit] = useState(null);
  const timer = useRef(null);
  const complete = round >= 5;
  const { reward, reset } = useArcadeReward("rocket", complete, 5);
  const planetIcons = ["🪐", "🌕", "🌍", "🟣"];

  useEffect(() => () => window.clearTimeout(timer.current), []);

  function launch(answer, index) {
    if (busy || failed || complete) return;
    setBusy(true);
    if (answer === String(challenge.problem.answer)) {
      setMessage("🎉 Bay đúng quỹ đạo! Thu thập được một ngôi sao!");
      timer.current = window.setTimeout(() => {
        const nextRound = round + 1;
        setRound(nextRound);
        if (nextRound < 5) setChallenge(makeRocketChallenge(grade));
        setMessage(nextRound < 5 ? "Nhiệm vụ mới xuất hiện — tìm hành tinh có kết quả đúng!" : "Hoàn thành mọi nhiệm vụ!");
        setBusy(false);
      }, 550);
      return;
    }
    const remainingShields = shields - 1;
    setShields(remainingShields);
    setLastHit(index);
    if (remainingShields <= 0) {
      setFailed(true);
      setMessage(`Phi thuyền chạm thiên thạch! Đáp án là ${challenge.problem.answer}. Hãy nạp lại khiên và thử lần nữa.`);
    } else setMessage(`Ôi, đó là thiên thạch! Đáp án là ${challenge.problem.answer}. Còn ${remainingShields} khiên.`);
    timer.current = window.setTimeout(() => { setLastHit(null); setBusy(false); }, 500);
  }

  function restart() {
    window.clearTimeout(timer.current);
    reset(); setRound(0); setChallenge(makeRocketChallenge(grade)); setShields(3); setFailed(false); setBusy(false); setLastHit(null); setMessage("Chọn hành tinh có đáp án đúng để bay tới!");
  }

  return <section className="arcade-card rocket-card">
    <GameTitle icon="🚀" label={`ĐỘI PHI HÀNH GIA · LỚP ${grade}`} title="Phi thuyền săn sao" description="Tính phép toán rồi điều khiển phi thuyền tới hành tinh mang đáp án. Em có 3 lớp khiên cho cả chuyến bay!" />
    {complete ? <ArcadeDone icon="🏆" title="Phi thuyền đã chinh phục vũ trụ!" reward={reward} onRestart={restart} /> : failed ? <div className="arcade-finish"><span>🛠️</span><h2>Phi thuyền cần sửa chữa</h2><p>{message}</p><button onClick={restart}>Nạp khiên, chơi lại 🚀</button></div> : <>
      <div className="rocket-status"><span>NHIỆM VỤ {round + 1} / 5</span><b aria-label={`${shields} khiên còn lại`}>{"🛡️".repeat(shields)}{"▫️".repeat(3 - shields)}</b></div>
      <div className="rocket-space-scene">
        <span className="space-star star-one">✦</span><span className="space-star star-two">✧</span><span className="space-planet">🪐</span>
        <div className="rocket-question"><small>PHÉP TÍNH TRÊN BẢNG ĐIỀU KHIỂN</small><strong>{challenge.problem.expression} = ?</strong></div>
        <div className="rocket-flight"><span className="rocket-sprite">🚀</span><span className="rocket-trail">〰️</span><div className="rocket-planets">{challenge.answers.map((answer, index) => <button key={`${round}-${answer}`} className={`rocket-answer ${lastHit === index ? "rocket-hit" : ""}`} onClick={() => launch(answer, index)} disabled={busy} aria-label={`Hành tinh ${index + 1}, đáp án ${answer}`}><span>{planetIcons[index]}</span><b>{answer}</b><small>Hành tinh {index + 1}</small></button>)}</div></div>
      </div>
      <p className="rocket-message" role="status">{message}</p>
    </>}
  </section>;
}

function OceanSortGame({ grade }) {
  const [round, setRound] = useState(0);
  const [bubbles, setBubbles] = useState(() => makeOceanSortRound(grade, 0));
  const [collected, setCollected] = useState([]);
  const [message, setMessage] = useState("Chạm bong bóng theo thứ tự từ bé đến lớn!");
  const [wrongBubble, setWrongBubble] = useState(null);
  const timer = useRef(null);
  const complete = round >= 3;
  const { reward, reset } = useArcadeReward("ocean", complete, 3);
  const sequence = [...bubbles].sort((a, b) => a.orderValue - b.orderValue);
  const nextBubble = sequence[collected.length];

  useEffect(() => () => window.clearTimeout(timer.current), []);

  function popBubble(bubble) {
    if (complete || collected.includes(bubble.id) || wrongBubble) return;
    if (bubble.id !== nextBubble?.id) {
      setWrongBubble(bubble.id);
      setMessage(`Cá nhỏ bị rối rồi! Hãy tìm ${nextBubble?.label} trước nhé.`);
      timer.current = window.setTimeout(() => setWrongBubble(null), 500);
      return;
    }
    const nextCollected = [...collected, bubble.id];
    setCollected(nextCollected);
    if (nextCollected.length === bubbles.length) {
      setMessage("✨ Đúng thứ tự! Kho báu đã mở!");
      timer.current = window.setTimeout(() => {
        const nextRound = round + 1;
        setRound(nextRound);
        if (nextRound < 3) setBubbles(makeOceanSortRound(grade, nextRound));
        setCollected([]);
        setMessage(nextRound < 3 ? "Một rương mới! Xếp bong bóng từ bé đến lớn." : "Đã tìm thấy mọi kho báu!");
      }, 650);
    } else setMessage(`Tốt lắm! Đã tìm ${bubble.label}. Tiếp theo là bong bóng nhỏ nhất còn lại.`);
  }

  function restart() {
    window.clearTimeout(timer.current); reset(); setRound(0); setBubbles(makeOceanSortRound(grade, 0)); setCollected([]); setWrongBubble(null); setMessage("Chạm bong bóng theo thứ tự từ bé đến lớn!");
  }

  return <section className="arcade-card ocean-sort-card">
    <GameTitle icon="🐠" label={`NHÀ THÁM HIỂM ĐẠI DƯƠNG · LỚP ${grade}`} title="Cá nhỏ tìm kho báu" description={grade === 4 ? "So sánh các phân số cùng mẫu số." : grade === 5 ? "Sắp xếp các số thập phân." : "Giúp cá nhỏ xếp các bong bóng số từ bé đến lớn để tìm kho báu."} />
    {complete ? <ArcadeDone icon="🐳" title="Đại dương đã sáng rực kho báu!" reward={reward} onRestart={restart} /> : <>
      <div className="ocean-status"><span>RƯƠNG {round + 1} / 3</span><b>{collected.length} / {bubbles.length} bong bóng ✨</b></div>
      <div className="ocean-scene">
        <span className="ocean-fish fish-left" aria-hidden="true">🐠</span><span className="ocean-fish fish-right" aria-hidden="true">🐟</span><span className="ocean-treasure" aria-hidden="true">{collected.length === bubbles.length ? "💎" : "🧰"}</span>
        <div className="ocean-bubble-field" aria-label="Các bong bóng số">
          {bubbles.map((bubble, index) => <button key={bubble.id} style={{ "--bubble-delay": `${index * -0.4}s` }} className={`number-bubble ${collected.includes(bubble.id) ? "bubble-collected" : ""} ${wrongBubble === bubble.id ? "bubble-wrong" : ""}`} onClick={() => popBubble(bubble)} disabled={collected.includes(bubble.id)} aria-label={`Bong bóng số ${bubble.label}`}><span>{bubble.label}</span></button>)}
        </div>
        <div className="ocean-reef" aria-hidden="true">🪸　🌿　🪸　🌱　🪸</div>
      </div>
      <p className="ocean-message" role="status">{message}</p>
      <p className="ocean-hint">{grade === 4 ? "Mẹo: các phân số có cùng mẫu số — hãy so sánh tử số." : grade === 5 ? "Mẹo: so sánh phần nguyên trước, rồi đến hàng phần mười." : "Mẹo: bong bóng nhỏ nhất chưa được chọn sẽ mở đường tới rương."}</p>
    </>}
  </section>;
}

function SpaceRunnerGame({ grade }) {
  const rockCells = useMemo(() => [5, 13, 18, 22, 27, 29], []);
  const [round, setRound] = useState(0);
  const mathSpec = useMemo(() => getMathArcadeSpec(grade, round), [grade, round]);
  const [position, setPosition] = useState(32);
  const [energyOptions, setEnergyOptions] = useState(() => getSpacePickupOptions(mathSpec, grade, 0, 32, rockCells, 0));
  const [fuel, setFuel] = useState(0);
  const [shields, setShields] = useState(3);
  const [failed, setFailed] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const [message, setMessage] = useState("Dùng phím mũi tên hoặc nút chạm để lái tàu nạp năng lượng vừa đủ!");
  const timer = useRef(null);
  const complete = round >= 3;
  const { reward, reset } = useArcadeReward("rocket", complete, 3);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  function move(direction) {
    if (complete || failed || transitioning) return;
    const row = Math.floor(position / 8);
    const column = position % 8;
    const nextRow = row + (direction === "up" ? -1 : direction === "down" ? 1 : 0);
    const nextColumn = column + (direction === "left" ? -1 : direction === "right" ? 1 : 0);
    if (nextRow < 0 || nextRow > 4 || nextColumn < 0 || nextColumn > 7) return;
    const nextPosition = nextRow * 8 + nextColumn;
    if (rockCells.includes(nextPosition)) {
      const remaining = shields - 1;
      setShields(remaining);
      setMessage(remaining > 0 ? `Thiên thạch chắn đường! Còn ${remaining} khiên.` : "Phi thuyền hết khiên rồi. Thử lại chuyến bay nhé!");
      if (remaining <= 0) setFailed(true);
      return;
    }
    setPosition(nextPosition);
    const selectedEnergy = energyOptions.find((option) => option.position === nextPosition);
    if (!selectedEnergy) return;
    const nextFuel = fuel + selectedEnergy.value;
    const calculation = formatArcadeCalculation(grade, mathSpec, fuel, selectedEnergy, nextFuel);
    if (nextFuel > mathSpec.target) {
      const remaining = shields - 1;
      setShields(remaining);
      setEnergyOptions((current) => current.filter((option) => option.id !== selectedEnergy.id));
      if (remaining <= 0) setFailed(true);
      setMessage(remaining > 0 ? `Pin này làm quá tải (${calculation}). Còn ${remaining} khiên — hãy chọn một tuyến pin khác còn trên bản đồ.` : `Nhiên liệu quá tải (${calculation}) làm hỏng tàu. Hãy thử lại!`);
      return;
    }
    setFuel(nextFuel);
    if (nextFuel === mathSpec.target) {
      setTransitioning(true);
      setMessage(`🎉 ${calculation}! Đủ ${mathSpec.targetLabel} nhiên liệu chính xác. Chuẩn bị bay sang vùng tiếp theo…`);
      timer.current = window.setTimeout(() => {
        const nextRound = round + 1;
        setRound(nextRound);
        setPosition(32);
        setFuel(0);
        const nextSpec = getMathArcadeSpec(grade, nextRound);
        setEnergyOptions(getSpacePickupOptions(nextSpec, grade, 0, 32, rockCells, nextRound));
        setTransitioning(false);
        setMessage(nextRound < 3 ? "Vùng sao mới! Ba tuyến năng lượng đang chờ em lựa chọn." : "Đã khám phá xong cả ba vùng sao!");
      }, 650);
    } else {
      setEnergyOptions(getSpacePickupOptions(mathSpec, grade, nextFuel, nextPosition, rockCells, round));
      setMessage(`${calculation}. Đã nạp ${mathSpec.display(nextFuel)} / ${mathSpec.targetLabel}. Ba tuyến mới đã xuất hiện — hãy chọn đường bay phù hợp!`);
    }
  }

  useEffect(() => {
    function onKeyDown(event) {
      if (["INPUT", "TEXTAREA"].includes(event.target?.tagName)) return;
      const directions = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right", w: "up", s: "down", a: "left", d: "right", W: "up", S: "down", A: "left", D: "right" };
      if (directions[event.key]) { event.preventDefault(); move(directions[event.key]); }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [position, energyOptions, fuel, shields, round, failed, transitioning, complete, mathSpec]);

  function restart() {
    window.clearTimeout(timer.current); reset(); setRound(0); setPosition(32); setEnergyOptions(getSpacePickupOptions(mathSpec, grade, 0, 32, rockCells, 0)); setFuel(0); setShields(3); setFailed(false); setTransitioning(false); setMessage("Chọn một trong ba tuyến năng lượng, né thiên thạch và nạp vừa đủ!");
  }

  return <section className="arcade-card space-runner-card">
    <GameTitle icon="🚀" label={`ĐIỀU KHIỂN PHI THUYỀN · LỚP ${grade}`} title="Phi thuyền nạp nhiên liệu" description={mathSpec.lesson} />
    {complete ? <ArcadeDone icon="🌠" title="Em đã khám phá xong vũ trụ!" reward={reward} onRestart={restart} /> : failed ? <div className="arcade-finish"><span>🛠️</span><h2>Phi thuyền cần sửa chữa</h2><p>{message}</p><button onClick={restart}>Sửa tàu và chơi lại 🚀</button></div> : <>
      <div className="space-runner-status"><span>VÙNG SAO {round + 1} / 3</span><b>{"🛡️".repeat(shields)}{"▫️".repeat(3 - shields)}</b><strong>Nhiên liệu {mathSpec.display(fuel)} / {mathSpec.targetLabel}</strong></div>
      <div className="space-fuel-track" aria-label={`Đã nạp ${Math.round((fuel / mathSpec.target) * 100)} phần trăm nhiên liệu`}><span style={{ width: `${Math.min(100, (fuel / mathSpec.target) * 100)}%` }} /></div>
      <div className="space-route-choices"><b>🛰️ Chọn một trong {energyOptions.length} trạm pin:</b>{energyOptions.map((option) => <span key={option.id} className={option.safe ? "route-safe" : "route-risky"}>🔋 {option.label} · {option.safe ? "vừa sức" : "quá tải"}</span>)}</div>
      <div className="space-runner-board" role="grid" aria-label="Bản đồ vũ trụ 8 cột, 5 hàng">
        {Array.from({ length: 40 }, (_, cell) => {
          const energy = energyOptions.find((option) => option.position === cell);
          return <div role="gridcell" key={cell} className={`space-runner-cell ${rockCells.includes(cell) ? "space-rock" : ""} ${position === cell ? "space-ship-cell" : ""} ${energy ? "space-star-cell" : ""}`}>{position === cell ? <span className="space-ship-sprite">🚀</span> : rockCells.includes(cell) ? <span>☄️</span> : energy ? <span className={`energy-cell ${energy.safe ? "energy-safe" : "energy-risky"}`}>🔋<small>{energy.label}</small></span> : <span className="space-dust" aria-hidden="true">{cell % 7 === 0 ? "✦" : ""}</span>}</div>;
        })}
      </div>
      <p className="space-runner-message" role="status">{message}</p>
      <div className="space-runner-controls" aria-label="Điều khiển phi thuyền"><button onClick={() => move("up")} aria-label="Lái lên">↑</button><div><button onClick={() => move("left")} aria-label="Lái trái">←</button><button onClick={() => move("down")} aria-label="Lái xuống">↓</button><button onClick={() => move("right")} aria-label="Lái phải">→</button></div></div>
      <p className="space-runner-hint">Điều khiển bằng phím mũi tên / W A S D hoặc các nút lái. Pin xanh giúp tiến tới mục tiêu; pin đỏ sẽ làm quá tải.</p>
    </>}
  </section>;
}

function OceanCatchGame({ grade }) {
  const [round, setRound] = useState(0);
  const mathSpec = useMemo(() => getMathArcadeSpec(grade, round), [grade, round]);
  const [lane, setLane] = useState(2);
  const laneRef = useRef(2);
  const [drops, setDrops] = useState([]);
  const [caught, setCaught] = useState(0);
  const [lives, setLives] = useState(3);
  const [seconds, setSeconds] = useState(45);
  const [failed, setFailed] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const [message, setMessage] = useState("Dùng phím trái/phải để cá voi hứng ngọc, né đá biển!");
  const nextDropId = useRef(0);
  const transitionTimer = useRef(null);
  const complete = round >= 3;
  const { reward, reset } = useArcadeReward("ocean", complete, 3);

  useEffect(() => () => window.clearTimeout(transitionTimer.current), []);
  useEffect(() => {
    if (complete || failed || transitioning) return undefined;
    const spawner = window.setInterval(() => {
      const kind = Math.random() < 0.25 ? "rock" : "pearl";
      const pickup = kind === "pearl" ? randomMathPickup(mathSpec) : null;
      const drop = { id: nextDropId.current++, lane: randomInt(0, 4), kind, value: pickup?.value || 0, label: pickup?.label || "" };
      setDrops((current) => [...current, drop]);
    }, 760);
    return () => window.clearInterval(spawner);
  }, [complete, failed, transitioning, mathSpec]);
  useEffect(() => {
    if (complete || failed) return undefined;
    if (seconds <= 0) { setFailed(true); setMessage("Hết giờ lặn rồi! Hãy thử lại để gom đủ ngọc."); return undefined; }
    const timer = window.setTimeout(() => setSeconds((current) => current - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [seconds, complete, failed]);

  function move(direction) {
    if (complete || failed || transitioning) return;
    const nextLane = Math.max(0, Math.min(4, laneRef.current + direction));
    laneRef.current = nextLane;
    setLane(nextLane);
  }

  useEffect(() => {
    function onKeyDown(event) {
      if (["INPUT", "TEXTAREA"].includes(event.target?.tagName)) return;
      if (["ArrowLeft", "a", "A"].includes(event.key)) { event.preventDefault(); move(-1); }
      if (["ArrowRight", "d", "D"].includes(event.key)) { event.preventDefault(); move(1); }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [lane, complete, failed, transitioning]);

  function resolveDrop(drop) {
    setDrops((current) => current.filter((item) => item.id !== drop.id));
    if (complete || failed || transitioning) return;
    if (drop.lane !== laneRef.current) return;
    if (drop.kind === "rock") {
      const remaining = lives - 1;
      setLives(remaining);
      if (remaining <= 0) { setFailed(true); setMessage("Cá voi va phải đá biển! Hãy thử lại và di chuyển khéo hơn nhé."); }
      else setMessage(`Cẩn thận đá biển! Cá voi còn ${remaining} tim.`);
      return;
    }
    const nextAmount = caught + drop.value;
    const calculation = formatArcadeCalculation(grade, mathSpec, caught, drop, nextAmount);
    if (nextAmount > mathSpec.target) {
      const remaining = lives - 1;
      setLives(remaining);
      if (remaining <= 0) { setFailed(true); setMessage(`${calculation} nên tổng vượt ${mathSpec.targetLabel}. Hãy thử lại!`); }
      else setMessage(`${calculation} nên chưa vừa rương, tổng vượt ${mathSpec.targetLabel}; còn ${remaining} tim.`);
      return;
    }
    setCaught(nextAmount);
    if (nextAmount === mathSpec.target) {
      setTransitioning(true);
      setMessage(`🐚 ${calculation}! Chính xác ${mathSpec.targetLabel}; cá voi mở được kho báu.`);
      transitionTimer.current = window.setTimeout(() => {
        const nextRound = round + 1;
        setRound(nextRound);
        setCaught(0);
        setDrops([]);
        setTransitioning(false);
        setMessage(nextRound < 3 ? "Kho báu tiếp theo đang chờ — tiếp tục bơi và né đá!" : "Đã tìm thấy cả ba kho báu dưới biển!");
      }, 650);
    } else setMessage(`${calculation}. Trong rương có ${mathSpec.display(nextAmount)} / ${mathSpec.targetLabel}. Tính giá trị viên tiếp theo nhé!`);
  }

  function restart() {
    window.clearTimeout(transitionTimer.current); reset(); laneRef.current = 2; setLane(2); setDrops([]); setCaught(0); setLives(3); setSeconds(45); setRound(0); setFailed(false); setTransitioning(false); setMessage("Dùng phím trái/phải để cá voi hứng ngọc, né đá biển!");
  }

  return <section className="arcade-card ocean-catch-card">
    <GameTitle icon="🐳" label={`ĐIỀU KHIỂN CÁ VOI · LỚP ${grade}`} title="Cá voi hứng ngọc" description={`${mathSpec.lesson} Điều khiển cá voi qua 5 làn, hứng đúng các viên ngọc và tránh đá biển.`} />
    {complete ? <ArcadeDone icon="🐋" title="Cá voi đã tìm thấy kho báu!" reward={reward} onRestart={restart} /> : failed ? <div className="arcade-finish"><span>🫧</span><h2>Chuyến lặn kết thúc</h2><p>{message}</p><button onClick={restart}>Lặn lại 🐳</button></div> : <>
      <div className="ocean-catch-status"><span>KHO BÁU {round + 1} / 3</span><b>{"❤️".repeat(lives)}{"🤍".repeat(3 - lives)}</b><strong>{mathSpec.display(caught)} / {mathSpec.targetLabel}</strong><em>⏱ {seconds}s</em></div>
      <div className="ocean-catch-scene" aria-label="Khu vực điều khiển cá voi">
        {Array.from({ length: 5 }, (_, index) => <div className={`catch-lane ${lane === index ? "active-lane" : ""}`} key={index} />)}
        {drops.map((drop) => <span key={drop.id} className={`falling-ocean-object ${drop.kind === "rock" ? "falling-rock" : "falling-pearl"}`} style={{ left: `${drop.lane * 20 + 10}%` }} onAnimationEnd={() => resolveDrop(drop)} aria-hidden="true">{drop.kind === "rock" ? "🪨" : <><b>🫧</b><small>{drop.label}</small></>}</span>)}
        <span className="whale-catcher" style={{ left: `${lane * 20 + 10}%` }} aria-label={`Cá voi ở làn ${lane + 1}`}>🐳</span>
        <span className="ocean-catch-coral" aria-hidden="true">🪸　🌿　🪸　🌱　🪸</span>
      </div>
      <p className="ocean-catch-message" role="status">{message}</p>
      <div className="ocean-catch-controls"><button onClick={() => move(-1)} aria-label="Bơi sang trái">← Bơi trái</button><button onClick={() => move(1)} aria-label="Bơi sang phải">Bơi phải →</button></div>
      <p className="space-runner-hint">Máy tính: phím ← → hoặc A/D. Điện thoại: chạm nút bơi.</p>
    </>}
  </section>;
}

function CrossMathGame({ grade }) {
  const [round, setRound] = useState(0);
  const [puzzle, setPuzzle] = useState(() => makeCrossMathPuzzle(grade, 0));
  const [selectedTile, setSelectedTile] = useState(null);
  const [locked, setLocked] = useState(false);
  const [message, setMessage] = useState("Kéo một ô số vào bảng, hoặc chạm ô số rồi chạm ô trống.");
  const timer = useRef(null);
  const complete = round >= 3;
  const { reward, reset } = useArcadeReward("crossmath", complete, 3);
  const spec = getCrossMathSpec(grade, round);
  const placedIds = new Set(puzzle.cells.filter(Boolean));
  const availableTiles = puzzle.tiles.filter((tile) => !placedIds.has(tile.id));
  const rowSums = Array.from({ length: 3 }, (_, row) => puzzle.cells.slice(row * 3, row * 3 + 3).reduce((sum, id) => sum + (puzzle.tiles.find((tile) => tile.id === id)?.value || 0), 0));
  const columnSums = Array.from({ length: 3 }, (_, column) => [puzzle.cells[column], puzzle.cells[column + 3], puzzle.cells[column + 6]].reduce((sum, id) => sum + (puzzle.tiles.find((tile) => tile.id === id)?.value || 0), 0));
  useEffect(() => () => window.clearTimeout(timer.current), []);

  function placeTile(tileId, cellIndex) {
    if (locked || complete || puzzle.cells[cellIndex] || placedIds.has(tileId)) return;
    const cells = [...puzzle.cells];
    cells[cellIndex] = tileId;
    const nextPuzzle = { ...puzzle, cells };
    setPuzzle(nextPuzzle);
    setSelectedTile(null);
    if (cells.every(Boolean)) {
      const values = cells.map((id) => puzzle.tiles.find((tile) => tile.id === id).value);
      const rowsCorrect = [0, 1, 2].every((row) => values.slice(row * 3, row * 3 + 3).reduce((sum, value) => sum + value, 0) === puzzle.rowTargets[row]);
      const columnsCorrect = [0, 1, 2].every((column) => values[column] + values[column + 3] + values[column + 6] === puzzle.columnTargets[column]);
      if (rowsCorrect && columnsCorrect) {
        setLocked(true);
        setMessage("🎉 Mọi hàng và cột đều khớp! Em đã giải được bảng giao điểm.");
        timer.current = window.setTimeout(() => {
          const nextRound = round + 1;
          setRound(nextRound);
          if (nextRound < 3) setPuzzle(makeCrossMathPuzzle(grade, nextRound));
          setSelectedTile(null);
          setLocked(false);
          setMessage(nextRound < 3 ? "Bảng mới đã sẵn sàng — kiểm tra đồng thời tổng hàng và tổng cột nhé!" : "Em đã giải xong cả ba bảng!");
        }, 700);
      } else {
        const wrongRows = rowSums.map((sum, row) => sum + (row === Math.floor(cellIndex / 3) ? puzzle.tiles.find((tile) => tile.id === tileId).value : 0) === puzzle.rowTargets[row] ? null : row + 1).filter(Boolean);
        const wrongColumns = columnSums.map((sum, column) => sum + (column === cellIndex % 3 ? puzzle.tiles.find((tile) => tile.id === tileId).value : 0) === puzzle.columnTargets[column] ? null : column + 1).filter(Boolean);
        setMessage(`Đã lấp đầy bảng. Hãy đổi ô ở hàng ${wrongRows.join(", ") || "✓"} hoặc cột ${wrongColumns.join(", ") || "✓"} để mọi tổng cùng đúng.`);
      }
    } else setMessage("Hãy đặt tiếp các ô. Mỗi số phải giúp đúng cả tổng hàng lẫn tổng cột.");
  }

  function removeTile(cellIndex) {
    if (locked || !puzzle.cells[cellIndex]) return;
    const cells = [...puzzle.cells];
    cells[cellIndex] = null;
    setPuzzle({ ...puzzle, cells });
    setMessage("Ô đã trở về khay. Em có thể sắp xếp lại các số.");
  }

  function restart() {
    window.clearTimeout(timer.current); reset(); setRound(0); setPuzzle(makeCrossMathPuzzle(grade, 0)); setSelectedTile(null); setLocked(false); setMessage("Kéo một ô số vào bảng, hoặc chạm ô số rồi chạm ô trống.");
  }

  return <section className="arcade-card crossmath-card">
    <GameTitle icon="🔢" label={`BẢNG SỐ GIAO ĐIỂM · LỚP ${grade}`} title="Ô chữ tổng hàng – cột" description={`${spec.lesson} Mỗi ô giao nhau thuộc cả một hàng và một cột.`} />
    {complete ? <ArcadeDone icon="🧩" title="Ba bảng số đã được giải!" reward={reward} onRestart={restart} /> : <>
      <div className="crossmath-status"><span>BẢNG {round + 1} / 3 · {puzzle.lesson}</span><span>Kéo-thả hoặc chạm để xếp số</span></div>
      <div className="crossmath-grid" role="grid" aria-label="Bảng phép tính hàng và cột">
        {puzzle.rowTargets.map((target, row) => <Fragment key={`row-${row}`}>
          <span className="crossmath-target row-target" aria-label={`Tổng hàng ${row + 1}: ${spec.format(target)}`}>{spec.format(target)} →</span>
          {puzzle.cells.slice(row * 3, row * 3 + 3).map((tileId, column) => {
            const index = row * 3 + column;
            const tile = puzzle.tiles.find((item) => item.id === tileId);
            return <button key={index} className={`crossmath-cell ${tile ? "has-tile" : ""} ${selectedTile && !tile ? "drop-ready" : ""}`} onClick={() => tile ? removeTile(index) : selectedTile && placeTile(selectedTile, index)} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); const id = event.dataTransfer.getData("text/plain") || selectedTile; if (id) placeTile(id, index); }} aria-label={tile ? `Ô ${index + 1}, số ${tile.label}. Chạm để trả về khay.` : `Ô trống ${index + 1}`}>
              {tile ? tile.label : <span>{selectedTile ? "＋" : "·"}</span>}
            </button>;
          })}
        </Fragment>)}
        <span className="crossmath-target corner-target">↓</span>
        {puzzle.columnTargets.map((target, column) => <span key={`column-${column}`} className="crossmath-target column-target" aria-label={`Tổng cột ${column + 1}: ${spec.format(target)}`}>↓ {spec.format(target)}</span>)}
      </div>
      <div className="crossmath-sums" aria-label="Tổng hiện tại">
        {rowSums.map((sum, row) => <span key={`rs-${row}`} className={sum === puzzle.rowTargets[row] ? "sum-matched" : ""}>Hàng {row + 1}: {spec.format(sum)} / {spec.format(puzzle.rowTargets[row])}</span>)}
        {columnSums.map((sum, column) => <span key={`cs-${column}`} className={sum === puzzle.columnTargets[column] ? "sum-matched" : ""}>Cột {column + 1}: {spec.format(sum)} / {spec.format(puzzle.columnTargets[column])}</span>)}
      </div>
      <p className="crossmath-message" role="status">{message}</p>
      <div className="crossmath-tray" aria-label="Khay ô số">
        {availableTiles.map((tile) => <button key={tile.id} draggable onDragStart={(event) => { setSelectedTile(tile.id); event.dataTransfer.setData("text/plain", tile.id); }} onClick={() => setSelectedTile((current) => current === tile.id ? null : tile.id)} className={`crossmath-chip ${selectedTile === tile.id ? "selected-chip" : ""}`} aria-pressed={selectedTile === tile.id}>{tile.label}</button>)}
      </div>
      <p className="crossmath-hint">Mẹo: một ô nằm ở giao điểm — số đó ảnh hưởng đồng thời tổng hàng và tổng cột.</p>
    </>}
  </section>;
}

function makeRectangleTasks(grade) {
  if (grade <= 2) {
    const pool = grade === 1 ? [4, 6, 8, 9, 10, 12] : [6, 8, 10, 12, 15, 18, 20];
    return [...pool].sort(() => Math.random() - 0.5).slice(0, 3).map((target) => ({ kind: "area", target }));
  }
  const tasks = [];
  const kinds = ["area", "perimeter", "area"];
  kinds.forEach((kind) => {
    const width = randomInt(2, 6);
    const height = randomInt(2, 6);
    tasks.push({ kind, target: kind === "area" ? width * height : 2 * (width + height) });
  });
  return tasks.sort(() => Math.random() - 0.5);
}

function RectangleGridGame({ grade }) {
  const [round, setRound] = useState(0);
  const [tasks, setTasks] = useState(() => makeRectangleTasks(grade));
  const [anchor, setAnchor] = useState(null);
  const [hovered, setHovered] = useState(null);
  const [locked, setLocked] = useState(false);
  const [message, setMessage] = useState("Chọn một ô góc, rồi chọn ô đối diện để vẽ hình chữ nhật.");
  const timer = useRef(null);
  const complete = round >= tasks.length;
  const { reward, reset } = useArcadeReward("rectangles", complete, 3);
  const task = tasks[Math.min(round, tasks.length - 1)];
  const target = task.target;
  useEffect(() => () => window.clearTimeout(timer.current), []);

  function chooseCorner(index) {
    if (complete || locked) return;
    if (anchor === null) {
      setAnchor(index);
      setHovered(index);
      setMessage("Tốt! Chọn ô ở góc đối diện để tạo hình chữ nhật.");
      return;
    }
    const startRow = Math.floor(anchor / 6);
    const startColumn = anchor % 6;
    const endRow = Math.floor(index / 6);
    const endColumn = index % 6;
    const height = Math.abs(endRow - startRow) + 1;
    const width = Math.abs(endColumn - startColumn) + 1;
    const result = task.kind === "area" ? height * width : 2 * (height + width);
    setAnchor(null);
    setHovered(null);
    if (result !== target) {
      setMessage(task.kind === "area" ? `Hình này có ${height} × ${width} = ${result} ô vuông. Mục tiêu là ${target}; thử hình khác nhé.` : `Chu vi hình này là 2 × (${height} + ${width}) = ${result}. Mục tiêu là ${target}; thử hình khác nhé.`);
      return;
    }
    setLocked(true);
    setMessage(task.kind === "area" ? grade >= 3 ? `🎉 Đúng! ${height} × ${width} = ${result} ô vuông. Em đã tìm được một cặp thừa số phù hợp.` : `🎉 Đúng! Em đã đếm được ${result} ô vuông trong hình.` : `🎉 Đúng! Chu vi là 2 × (${height} + ${width}) = ${result} đơn vị.`);
    timer.current = window.setTimeout(() => {
      const nextRound = round + 1;
      setRound(nextRound);
      setLocked(false);
      const nextTask = tasks[nextRound];
      setMessage(nextTask ? `Nhiệm vụ mới: ${nextTask.kind === "area" ? `tạo diện tích ${nextTask.target} ô vuông` : `tạo chu vi ${nextTask.target} đơn vị`}.` : "Em đã hoàn thành cả khu vườn hình học!");
    }, 650);
  }

  function isPreviewCell(index) {
    if (anchor === null || hovered === null) return false;
    const row = Math.floor(index / 6);
    const column = index % 6;
    const firstRow = Math.floor(anchor / 6);
    const firstColumn = anchor % 6;
    const lastRow = Math.floor(hovered / 6);
    const lastColumn = hovered % 6;
    return row >= Math.min(firstRow, lastRow) && row <= Math.max(firstRow, lastRow) && column >= Math.min(firstColumn, lastColumn) && column <= Math.max(firstColumn, lastColumn);
  }

  function restart() {
    window.clearTimeout(timer.current); reset(); setRound(0); setTasks(makeRectangleTasks(grade)); setAnchor(null); setHovered(null); setLocked(false); setMessage("Chọn một ô góc, rồi chọn ô đối diện để vẽ hình chữ nhật.");
  }

  const lesson = grade === 1 ? "Đếm ô vuông để biết hình có bao nhiêu ô." : grade === 2 ? "Đếm theo hàng và cột, luyện cộng lặp lại." : "Luân phiên khám phá diện tích và chu vi.";
  return <section className="arcade-card rectangle-card">
    <GameTitle icon="🧱" label={`XÂY VƯỜN HÌNH HỌC · LỚP ${grade}`} title="Kiến trúc sư ô vuông" description={`${lesson} Chạm hai góc đối diện để vẽ trực tiếp trên lưới.`} />
    {complete ? <ArcadeDone icon="🌻" title="Khu vườn đã được chia ô hoàn hảo!" reward={reward} onRestart={restart} /> : <>
      <div className="rectangle-status"><span>NHIỆM VỤ {round + 1} / {tasks.length}</span><strong>{task.kind === "area" ? `Diện tích cần tạo: ${target} ô vuông` : `Chu vi cần tạo: ${target} đơn vị`}</strong></div>
      <div className="rectangle-grid" role="grid" aria-label="Lưới 6 nhân 6 để vẽ hình chữ nhật">
        {Array.from({ length: 36 }, (_, index) => <button key={index} role="gridcell" className={`rectangle-cell ${isPreviewCell(index) ? "rectangle-preview" : ""} ${index === anchor ? "rectangle-anchor" : ""}`} onClick={() => chooseCorner(index)} onMouseEnter={() => anchor !== null && setHovered(index)} aria-label={`Hàng ${Math.floor(index / 6) + 1}, cột ${index % 6 + 1}${isPreviewCell(index) ? ", nằm trong hình chữ nhật xem trước" : ""}`} />)}
      </div>
      <p className="rectangle-message" role="status">{message}</p>
      <p className="crossmath-hint">{task.kind === "area" ? "Đếm ô bên trong hoặc lấy chiều dài × chiều rộng." : "Chu vi là độ dài đường bao: 2 × (chiều dài + chiều rộng)."} Chọn hai góc đối diện để tạo hình.</p>
    </>}
  </section>;
}

function raceDisplay(value) {
  return String(value).replace(/\./g, ",");
}

function MathDragRaceGame({ grade }) {
  const [lap, setLap] = useState(1);
  const [challenge, setChallenge] = useState(() => makeRocketChallenge(grade));
  const [playerProgress, setPlayerProgress] = useState(0);
  const [rivalProgress, setRivalProgress] = useState(0);
  const [questionNumber, setQuestionNumber] = useState(1);
  const [streak, setStreak] = useState(0);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [lastAnswerCorrect, setLastAnswerCorrect] = useState(null);
  const [answered, setAnswered] = useState(false);
  const [raceEnded, setRaceEnded] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [racesWon, setRacesWon] = useState(0);
  const [wonTournament, setWonTournament] = useState(false);
  const complete = lap > 3;
  const { reward, reset } = useArcadeReward("drag-race", complete, 3);

  function answerQuestion(value) {
    if (answered || raceEnded || complete) return;
    const isCorrect = String(value) === String(challenge.problem.answer);
    const nextStreak = isCorrect ? streak + 1 : 0;
    const playerGain = isCorrect ? 18 + Math.min(8, streak * 2) : 2;
    const rivalGain = isCorrect ? 9 : 15;
    const nextPlayerProgress = Math.min(100, playerProgress + playerGain);
    const nextRivalProgress = Math.min(100, rivalProgress + rivalGain);
    setStreak(nextStreak);
    setPlayerProgress(nextPlayerProgress);
    setRivalProgress(nextRivalProgress);
    setAnswered(true);
    setLastAnswerCorrect(isCorrect);
    if (isCorrect) {
      setCorrectAnswers((count) => count + 1);
      setFeedback(`⚡ Chính xác! ${raceDisplay(challenge.problem.expression)} = ${raceDisplay(challenge.problem.answer)}. Xe em tăng tốc${nextStreak > 1 ? ` — chuỗi đúng ${nextStreak}!` : "!"}`);
    } else {
      setFeedback(`Đáp án là ${raceDisplay(challenge.problem.answer)}. ${raceDisplay(challenge.problem.expression)} = ${raceDisplay(challenge.problem.answer)}. Đối thủ tranh thủ vượt lên — cố gắng câu tiếp theo nhé!`);
    }
    if (nextPlayerProgress >= 100 || nextRivalProgress >= 100) {
      const won = nextPlayerProgress >= nextRivalProgress;
      const totalWins = racesWon + (won ? 1 : 0);
      const solutionNote = `${raceDisplay(challenge.problem.expression)} = ${raceDisplay(challenge.problem.answer)}`;
      if (won) setRacesWon(totalWins);
      setRaceEnded(true);
      if (lap === 3) {
        setWonTournament(totalWins >= 2);
        setLap(4);
        setFeedback(`${totalWins >= 2 ? "🏁 Đội em thắng chung cuộc!" : "🏁 Đối thủ thắng chung cuộc. Em đã hoàn thành cả ba chặng!"} Phép tính cuối: ${solutionNote}.`);
      } else {
        setFeedback(`${won ? `🏁 Em thắng chặng ${lap}! Nghỉ một chút rồi sẵn sàng chặng tiếp theo nhé.` : `🏁 Đối thủ thắng chặng ${lap}. Em vẫn còn cơ hội ở chặng tiếp theo!`} Phép tính cuối: ${solutionNote}.`);
      }
    }
  }

  function nextRace() {
    if (lap >= 3) return;
    setLap((current) => current + 1);
    setChallenge(makeRocketChallenge(grade));
    setPlayerProgress(0);
    setRivalProgress(0);
    setQuestionNumber(1);
    setStreak(0);
    setAnswered(false);
    setLastAnswerCorrect(null);
    setRaceEnded(false);
    setFeedback("Đèn xanh! Giải phép tính để tăng tốc nhé!");
  }

  function nextQuestion() {
    setChallenge(makeRocketChallenge(grade));
    setQuestionNumber((current) => current + 1);
    setAnswered(false);
    setLastAnswerCorrect(null);
    setFeedback("Câu mới! Tính nhanh để xe bứt tốc.");
  }

  function restart() {
    reset();
    setLap(1);
    setChallenge(makeRocketChallenge(grade));
    setPlayerProgress(0);
    setRivalProgress(0);
    setQuestionNumber(1);
    setStreak(0);
    setCorrectAnswers(0);
    setAnswered(false);
    setLastAnswerCorrect(null);
    setRaceEnded(false);
    setRacesWon(0);
    setWonTournament(false);
    setFeedback("Đèn xanh! Giải phép tính để tăng tốc nhé!");
  }

  useEffect(() => {
    function onKeyDown(event) {
      if (["INPUT", "TEXTAREA", "SELECT"].includes(event.target?.tagName) || answered || raceEnded || complete || !/^[1-4]$/.test(event.key)) return;
      event.preventDefault();
      answerQuestion(challenge.answers[Number(event.key) - 1]);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  const expression = raceDisplay(challenge.problem.expression);
  return <section className="arcade-card drag-race-card">
    <GameTitle icon="🏎️" label={`ĐƯỜNG ĐUA TOÁN HỌC · LỚP ${grade}`} title="Đua xe thần tốc" description="Tính đúng để tăng tốc, bứt qua đối thủ và chinh phục ba chặng đua!" />
    {complete ? <ArcadeDone icon={wonTournament ? "🏆" : "🏁"} title={wonTournament ? "Nhà vô địch đường đua!" : "Em đã hoàn thành ba chặng!"} reward={reward} onRestart={restart} /> : <>
      <div className="drag-race-status"><span>CHẶNG {lap} / 3</span><span>🏆 {racesWon} chặng thắng</span><span>✅ {correctAnswers} câu đúng</span><span>🔥 Chuỗi {streak}</span></div>
      <div className="drag-race-scene" aria-label="Đường đua hai làn">
        <div className="race-sky" aria-hidden="true">☁️　　☁️　　　　　　　　　☁️</div>
        <div className="race-trees race-trees-top" aria-hidden="true">🌳　🌲　🌳　🌲　🌳　🌲　🌳</div>
        <div className="race-road">
          <div className="race-center-line" aria-hidden="true" />
          <div className="race-finish-line" aria-hidden="true">🏁</div>
          <div className="race-lane race-player-lane"><span className="race-lane-label">EM</span><span className="race-car race-player-car" style={{ bottom: `${8 + playerProgress * 0.78}%`, transform: `translate(-50%, 50%) scale(${0.72 + playerProgress / 360})` }}>🏎️</span></div>
          <div className="race-lane race-rival-lane"><span className="race-lane-label">BẠN THỎ</span><span className="race-car race-rival-car" style={{ bottom: `${8 + rivalProgress * 0.78}%`, transform: `translate(-50%, 50%) scale(${0.72 + rivalProgress / 360})` }}>🚙</span></div>
        </div>
        <div className="race-trees race-trees-bottom" aria-hidden="true">🌲　🌳　🌲　🌳　🌲　🌳　🌲</div>
      </div>
      <div className="drag-race-progress" aria-label="Tiến độ cuộc đua">
        <div className="race-progress-row"><span>Em <b>{playerProgress}%</b></span><div className="race-progress-bar"><i style={{ width: `${playerProgress}%` }} /></div></div>
        <div className="race-progress-row"><span>Bạn thỏ <b>{rivalProgress}%</b></span><div className="race-progress-bar rival-progress-bar"><i style={{ width: `${rivalProgress}%` }} /></div></div>
      </div>
      {raceEnded ? <div className="race-result-panel" role="status"><strong>{feedback}</strong>{lap <= 3 && <button className="arcade-primary" onClick={nextRace}>Vào chặng {lap + 1} →</button>}</div> : <div className="drag-race-question-panel">
        <div className="race-question-count">CÂU {questionNumber} · TÍNH ĐÚNG ĐỂ TĂNG TỐC</div>
        <div className="drag-race-equation" aria-live="polite">{expression} = ?</div>
        <div className="drag-race-answers">{challenge.answers.map((option, index) => <button key={`${questionNumber}-${index}-${option}`} disabled={answered} onClick={() => answerQuestion(option)}><small>{index + 1}</small>{raceDisplay(option)}</button>)}</div>
        {answered && <div className={`race-feedback ${lastAnswerCorrect ? "race-feedback-correct" : "race-feedback-try"}`} role="status"><span>{feedback}</span><button onClick={nextQuestion}>Câu tiếp theo →</button></div>}
        <p className="race-keyboard-hint">Bấm đáp án hoặc dùng phím 1–4 · Máy tính đua cùng em</p>
      </div>}
    </>}
  </section>;
}

function MazeGame({ grade }) {
  const [level, setLevel] = useState(0);
  const [position, setPosition] = useState(0);
  const [sum, setSum] = useState(0);
  const [visited, setVisited] = useState(() => new Set([0]));
  const [message, setMessage] = useState("Dùng phím mũi tên hoặc các nút để di chuyển.");
  const [complete, setComplete] = useState(false);
  const [reward, setReward] = useState(null);
  const rewardRequested = useRef(false);
  const transitionTimer = useRef(null);
  const [numberMazes, setNumberMazes] = useState(() => getNumberMazes(grade));
  const maze = numberMazes[level];

  useEffect(() => () => window.clearTimeout(transitionTimer.current), []);
  useEffect(() => {
    if (!complete || rewardRequested.current) return;
    rewardRequested.current = true;
    claimArcadeReward("maze", 3).then(setReward).catch((error) => setReward({ rewardXp: 0, message: error.message }));
  }, [complete]);

  function resetLevel() {
    setPosition(0); setSum(0); setVisited(new Set([0])); setMessage("Dùng phím mũi tên hoặc các nút để di chuyển.");
  }

  function move(direction) {
    if (complete) return;
    const row = Math.floor(position / 4);
    const column = position % 4;
    const nextRow = row + (direction === "up" ? -1 : direction === "down" ? 1 : 0);
    const nextColumn = column + (direction === "left" ? -1 : direction === "right" ? 1 : 0);
    if (nextRow < 0 || nextRow > 3 || nextColumn < 0 || nextColumn > 3) return;
    const nextPosition = nextRow * 4 + nextColumn;
    const cell = maze.cells[nextPosition];
    if (cell === "#") { setMessage("Bức tường chắn đường rồi! Hãy thử hướng khác."); return; }
    let nextSum = sum;
    if (typeof cell === "number" && !visited.has(nextPosition)) {
      nextSum += cell;
      setSum(nextSum);
      setVisited((current) => new Set([...current, nextPosition]));
    }
    setPosition(nextPosition);
    if (cell === "E") {
      if (nextSum === maze.target) {
        if (level === numberMazes.length - 1) {
          setComplete(true); setMessage("🚀 Tìm đúng đường và đến đích!");
        } else {
          setMessage("✨ Đúng tổng! Đang mở mê cung tiếp theo…");
          transitionTimer.current = window.setTimeout(() => {
            const nextLevel = level + 1;
            setLevel(nextLevel); setPosition(0); setSum(0); setVisited(new Set([0])); setMessage("Dùng phím mũi tên hoặc các nút để di chuyển.");
          }, 750);
        }
      } else setMessage(nextSum > maze.target ? `Tổng đã vượt ${maze.targetLabel} — bắt đầu lại và chọn nhánh khác nhé.` : `Đã tới cửa ra! Em còn thiếu ${maze.display(maze.target - nextSum)} mới mở được cổng.`);
    } else if (nextSum > maze.target) setMessage(`Đã vượt ${maze.targetLabel}. Bắt đầu lại mê cung và chọn nhánh khác nhé.`);
    else setMessage(`Đã gom ${maze.display(nextSum)}. Còn thiếu ${maze.display(maze.target - nextSum)} để mở cổng.`);
  }

  useEffect(() => {
    const onKeyDown = (event) => {
      const directions = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right" };
      if (directions[event.key]) { event.preventDefault(); move(directions[event.key]); }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  function restart() {
    window.clearTimeout(transitionTimer.current); rewardRequested.current = false; setReward(null); setComplete(false); setNumberMazes(getNumberMazes(grade)); setLevel(0); setPosition(0); setSum(0); setVisited(new Set([0])); setMessage("Bản đồ mới đã được tạo! Tìm nhánh có tổng đúng rồi đến cửa ra.");
  }

  const mazeLesson = grade === 1 ? "Cộng số trong phạm vi 20" : grade === 2 ? "Cộng các số tròn chục" : grade === 3 ? "Tính tích rồi cộng các tích" : grade === 4 ? "Cộng các phân số cùng mẫu" : "Cộng số thập phân";
  return <section className="arcade-card maze-card">
    <div className="arcade-game-heading"><span className="arcade-emoji">🤖</span><div><small>ĐIỀU KHIỂN ROBOT · LỚP {grade}</small><h1>Mê cung toán bất ngờ</h1><p>Mỗi lượt có bản đồ mới. {mazeLesson}; gom đúng mục tiêu rồi tìm cửa ra.</p></div></div>
    {complete ? <div className="arcade-finish"><span>🏁</span><h2>Robot đã về đích!</h2><p>Em đã vượt qua cả 3 mê cung.</p><p className="arcade-xp">{reward ? reward.message : "Đang ghi nhận XP…"}</p><button onClick={restart}>Chơi lại</button></div> : <>
      <div className="maze-status"><span>MÊ CUNG {level + 1} / 3</span><b>Tổng {maze.display(sum)} / {maze.targetLabel}</b></div>
      <div className="number-maze" role="grid" aria-label={`Mê cung ${level + 1}`}>
        {maze.cells.map((cell, index) => <div key={`${level}-${index}`} role="gridcell" className={`maze-cell ${cell === "#" ? "maze-wall" : ""} ${position === index ? "robot-cell" : ""} ${visited.has(index) && typeof cell === "number" ? "maze-collected" : ""}`}>
          {position === index ? "🤖" : cell === "#" ? "" : cell === "S" ? "🚩" : cell === "E" ? "🚪" : visited.has(index) ? "✨" : maze.labels[index]}
        </div>)}
      </div>
      <p className="maze-message" role="status">{message}</p>
      <div className="maze-controls"><button onClick={() => move("up")} aria-label="Đi lên">↑</button><div><button onClick={() => move("left")} aria-label="Đi trái">←</button><button onClick={() => move("down")} aria-label="Đi xuống">↓</button><button onClick={() => move("right")} aria-label="Đi phải">→</button></div></div>
      <button className="arcade-text-button" onClick={resetLevel}>Bắt đầu lại mê cung này ↻</button>
    </>}
  </section>;
}

export default function ArcadeMathGames({ mode: initialMode, grade: initialGrade }) {
  const [, setSearchParams] = useSearchParams();
  const [grade, setGrade] = useState(Number(initialGrade) || Number(getCachedUser()?.grade) || 1);
  const modes = ["balance", "maze", "geometry", "crossmath", "rectangles", "drag-race", "rocket", "ocean", "memory"];
  const mode = modes.includes(initialMode) ? initialMode : "maze";
  function changeGrade(value) {
    setGrade(value);
    setSearchParams({ mini: mode, grade: String(value) });
  }
  return <main className="math-games-page" data-grade={grade}><ArcadeHeader /><div className="arcade-page">
    <div className="arcade-toolbar"><label>Lớp của em<select value={grade} onChange={(event) => changeGrade(Number(event.target.value))}>{[1, 2, 3, 4, 5].map((item) => <option key={item} value={item}>Lớp {item}</option>)}</select></label><Link to="/tro-choi">← Chọn trò khác</Link></div>
    <GameLearningPanel mode={mode} grade={grade} />
    {mode === "balance" ? <BalanceGame key={`balance-${grade}`} grade={grade} /> : mode === "maze" ? <MazeGame key={`maze-${grade}`} grade={grade} /> : mode === "geometry" ? <GeometryGame key={`geometry-${grade}`} grade={grade} /> : mode === "crossmath" ? <CrossMathGame key={`crossmath-${grade}`} grade={grade} /> : mode === "rectangles" ? <RectangleGridGame key={`rectangles-${grade}`} grade={grade} /> : mode === "drag-race" ? <MathDragRaceGame key={`drag-race-${grade}`} grade={grade} /> : mode === "rocket" ? <SpaceRunnerGame key={`rocket-${grade}`} grade={grade} /> : mode === "memory" ? <MemoryGame key={`memory-${grade}`} grade={grade} /> : <OceanCatchGame key={`ocean-${grade}`} grade={grade} />}
  </div></main>;
}
