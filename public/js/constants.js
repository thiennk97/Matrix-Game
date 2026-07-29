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
