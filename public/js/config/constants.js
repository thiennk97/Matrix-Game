function buildVerticalSlots(totalSlots) {
  var slots = [];
  for (var i = 0; i < totalSlots; i++) {
    var col = Math.floor(i / 3);
    var rowStart = (i % 3) * 3;
    slots.push([
      { r: rowStart, c: col },
      { r: rowStart + 1, c: col },
      { r: rowStart + 2, c: col }
    ]);
  }
  return slots;
}

var VERTICAL_SLOTS = buildVerticalSlots(27);

var PLAYER_COLORS = [
  'rgb(251, 191, 36)',
  'rgb(248, 113, 113)',
  'rgb(45, 212, 191)',
  'rgb(56, 189, 248)',
  '#a78bfa', '#fb7185', '#818cf8', '#2dd4bf'
];
function getPlayerColor(playerIndex) {
  return PLAYER_COLORS[playerIndex] || '#a8a29e';
}

function colorToRgbValues(color) {
  if (color.startsWith('rgb(')) {
    return color.match(/\d+/g).map(Number);
  }
  var hex = color.replace('#', '');
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
  return [parseInt(hex.substr(0, 2), 16), parseInt(hex.substr(2, 2), 16), parseInt(hex.substr(4, 2), 16)];
}

function colorWithAlpha(color, alpha) {
  var rgb = colorToRgbValues(color);
  return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`;
}
