const TOTAL_SLOTS = 27;
const NUM_MIN = 7;
const NUM_MAX = 10;
const TURN_TIME_LIMIT = 10.0;

const VERTICAL_SLOTS = [];
for (let i = 0; i < 27; i++) {
  let col = Math.floor(i / 3);
  let rowStart = (i % 3) * 3;
  VERTICAL_SLOTS.push([
    { r: rowStart, c: col },
    { r: rowStart + 1, c: col },
    { r: rowStart + 2, c: col }
  ]);
}

const HORIZONTAL_SLOTS = [];
for (let i = 0; i < 27; i++) {
  let row = Math.floor(i / 3);
  let colStart = (i % 3) * 3;
  HORIZONTAL_SLOTS.push([
    { r: row, c: colStart },
    { r: row, c: colStart + 1 },
    { r: row, c: colStart + 2 }
  ]);
}

module.exports = {
  TOTAL_SLOTS,
  NUM_MIN,
  NUM_MAX,
  TURN_TIME_LIMIT,
  VERTICAL_SLOTS,
  HORIZONTAL_SLOTS
};
