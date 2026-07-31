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

var PLAYER_COLORS = [
  'rgb(251, 191, 36)',   // Vàng
  'rgb(248, 113, 113)',  // Đỏ
  'rgb(45, 212, 191)',   // Xanh ngọc
  'rgb(56, 189, 248)',   // Xanh dương
  'rgb(167, 139, 250)',  // Tím
  'rgb(251, 146, 60)',   // Cam
  'rgb(74, 222, 128)',   // Xanh lá
  'rgb(244, 114, 182)'   // Hồng
];
var PLAYER_LABELS = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8'];
