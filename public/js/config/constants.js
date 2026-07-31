var VERTICAL_SLOTS = [];
for (var i = 0; i < 27; i++) {
  var col = Math.floor(i / 3);
  var rowStart = (i % 3) * 3;
  VERTICAL_SLOTS.push([
    { r: rowStart, c: col },
    { r: rowStart + 1, c: col },
    { r: rowStart + 2, c: col }
  ]);
}

var PLAYER_COLORS = ['#f97316', '#38bdf8', '#a78bfa', '#34d399', '#fb7185', '#facc15', '#818cf8', '#2dd4bf'];
var PLAYER_LABELS = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8'];
