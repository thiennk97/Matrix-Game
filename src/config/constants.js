const TOTAL_SLOTS = 27;
const NUM_MIN = 7;
const NUM_MAX = 10;
const TURN_TIME_LIMIT = 8.0;

function buildVerticalSlots(totalSlots) {
  const slots = [];
  for (let i = 0; i < totalSlots; i++) {
    const col = Math.floor(i / 3);
    const rowStart = (i % 3) * 3;
    slots.push([
      { r: rowStart, c: col },
      { r: rowStart + 1, c: col },
      { r: rowStart + 2, c: col }
    ]);
  }
  return slots;
}

const VERTICAL_SLOTS = buildVerticalSlots(TOTAL_SLOTS);

const ROOM_STATUS = {
  LOBBY: 'LOBBY',
  PLAYING: 'PLAYING',
  PAUSED: 'PAUSED',
  FINISHED: 'FINISHED'
};

export {
  TOTAL_SLOTS,
  NUM_MIN,
  NUM_MAX,
  TURN_TIME_LIMIT,
  VERTICAL_SLOTS,
  ROOM_STATUS
};
