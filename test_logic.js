const constants = require('./src/constants.js');
let board = Array(9).fill(null).map(() => Array(9).fill(null));

function getSlotIdx(r, c) {
  return c * 3 + Math.floor(r / 3);
}

// simulate clicks
console.log("R=0, C=0 -> Slot:", getSlotIdx(0, 0));
console.log("R=1, C=0 -> Slot:", getSlotIdx(1, 0));
console.log("R=2, C=0 -> Slot:", getSlotIdx(2, 0));
console.log("R=3, C=0 -> Slot:", getSlotIdx(3, 0));
console.log("R=8, C=8 -> Slot:", getSlotIdx(8, 8));

let coords = constants.VERTICAL_SLOTS[0];
console.log("Coords for slot 0:", coords);

let isSlotEmpty = coords.every(coord => board[coord.r][coord.c] === null);
console.log("isSlotEmpty:", isSlotEmpty);
