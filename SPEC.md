# Matrix Game — Đặc tả kỹ thuật

## 1. Phạm vi

`matrix-game-server` cung cấp cả frontend tĩnh và backend realtime của Matrix Battle trong cùng một Node.js process.

- Backend chịu trách nhiệm tuyệt đối đối với room state, timer, tính hợp lệ của nước đi, auto-place, điểm và kết quả.
- Redis lưu room state ngắn hạn để hỗ trợ reload và reconnect.
- Frontend chịu trách nhiệm hiển thị, animation và gửi thao tác hoặc vị trí người chơi đang lựa chọn.
- Không có authentication, tài khoản người dùng hoặc REST API nghiệp vụ.

## 2. Runtime và dependency

- JavaScript ESM (`"type": "module"`).
- Express phục vụ thư mục `public/`.
- Socket.IO cung cấp giao tiếp hai chiều.
- Redis lưu trạng thái phòng và lobby index.
- PixiJS 7.3.2 được tải từ CDN để render bàn chính.
- Không có bundler, frontend build step hoặc frontend server riêng.

### Cấu hình

| Biến môi trường    |                 Mặc định | Mô tả                                 |
| ------------------ | -----------------------: | ------------------------------------- |
| `PORT`             |                   `4000` | Port dùng chung cho HTTP và Socket.IO |
| `REDIS_URL`        | `redis://localhost:6379` | Redis connection URL                  |
| `ROOM_TTL_SECONDS` |                    `900` | TTL của room key, tính bằng giây      |

Server chỉ bắt đầu listen sau khi kết nối Redis thành công. `SIGINT` và `SIGTERM` đóng Socket.IO, HTTP server và Redis client theo thứ tự.

## 3. Luật và vòng lặp game

- Số người chơi mỗi phòng: 1–8.
- Kích thước bàn cá nhân: 9x9.
- Số lượt: 27 (`TOTAL_SLOTS`).
- Mỗi combo có 3 số độc lập trong khoảng 7–10 và được dùng chung cho mọi người chơi ở cùng lượt.
- Có 27 slot dọc. Mỗi cột có ba slot lần lượt chiếm hàng 0–2, 3–5 và 6–8.
- Thời gian mỗi lượt do host chọn trong tập 5, 8, 10 hoặc 15 giây; giá trị mặc định là 8 giây.
- Mỗi người chỉ được đặt một lần trong một lượt và chỉ được đặt vào slot còn trống hoàn toàn.
- Khi tất cả người chơi đang kết nối và chưa rời phòng đã đặt, server kết thúc lượt ngay.
- Sau khi chốt lượt, server giữ kết quả 500ms trước khi phát combo của lượt kế tiếp.
- Sau lượt thứ 27, phòng chuyển sang `FINISHED` và server phát kết quả.

### Tính điểm

Sau mỗi lần đặt, server chỉ quét lại các hàng, cột và hai hướng đường chéo đi qua ba ô vừa thay đổi.

- Một run hợp lệ có ít nhất 3 ô liên tiếp cùng giá trị.
- Điểm của run là `value × length`.
- Tổng điểm là tổng điểm của toàn bộ run hiện còn tồn tại trên bàn.
- `matchedLines` lưu chi tiết các run để frontend vẽ đường nối.

### Auto-place theo vị trí con trỏ

Frontend xác định slot tương ứng với ô đang hover và gửi `set_preferred_slot` khi slot ưu tiên thay đổi:

- Slot trống hoàn toàn: gửi `slotIdx`.
- Ngoài matrix hoặc slot có ô đã đặt: gửi `null`.
- Client chỉ gửi lại khi `turn` hoặc slot ưu tiên thay đổi, không phát event theo từng pixel di chuyển.

Server lưu lựa chọn này trong runtime memory, tách khỏi room state và không ghi Redis. Khi hết giờ:

1. Server lấy danh sách slot thực tế còn trống trên board.
2. Nếu slot ưu tiên vẫn nằm trong danh sách, server đặt combo vào slot đó.
3. Nếu không có lựa chọn, lựa chọn đã cũ hoặc không còn hợp lệ, server chọn ngẫu nhiên một slot trống.
4. Lựa chọn tạm được xoá khi chốt lượt, đặt thủ công, rời phòng hoặc disconnect.

Vì timer và bước kiểm tra cuối cùng nằm ở server, reload, network lag hoặc client bị sửa không thể tạo ra một nước đi không hợp lệ.

## 4. Trạng thái phòng

| Trạng thái | Ý nghĩa                                                  |
| ---------- | -------------------------------------------------------- |
| `LOBBY`    | Phòng đang chờ, xuất hiện trên index nếu còn chỗ         |
| `PLAYING`  | Game đang chạy và timer đang đếm                         |
| `PAUSED`   | Không còn người chơi online trong khi game chưa kết thúc |
| `FINISHED` | Đã hoàn thành 27 lượt và có kết quả                      |

### Vòng đời

1. `create_room` tạo mã phòng 6 ký tự, tạo host và thêm phòng vào lobby index.
2. `join_room` chỉ chấp nhận phòng `LOBBY` còn chỗ.
3. Host có thể bắt đầu một mình. Nếu có member, tất cả member phải online và ready.
4. `start_game` xoá board/score cũ, sinh deck mới, gỡ phòng khỏi lobby index và khởi động timer.
5. Nếu toàn bộ người chơi mất kết nối trong lúc chơi, timer dừng và phòng chuyển sang `PAUSED` với số millisecond còn lại.
6. `resume_room` nối `playerId` cũ với socket mới; nếu phòng đang pause, timer tiếp tục từ thời gian còn lại.
7. Kết thúc trận chuyển phòng sang `FINISHED`, lưu kết quả vào Redis và giải phóng runtime timer/cache.
8. `restart_game` đưa phòng về `LOBBY`, reset board, score, deck và ready state rồi thêm lại vào lobby index.

### Host và rời phòng

- Rời phòng khi đang ở `LOBBY`: người chơi bị xoá khỏi danh sách; nếu host rời, quyền host chuyển cho người chơi còn lại có `seatIndex` thấp nhất.
- Rời phòng sau khi game đã bắt đầu: player được đánh dấu `abandoned`, không bị xoá ngay để bảo toàn kết quả hiện tại.
- Nếu host đã rời sau khi game kết thúc và một member chọn chơi ván mới, member đó trở thành host.
- Nếu người cuối cùng chủ động rời lobby, room key và lobby entry được xoá. Disconnect tạm thời vẫn giữ phòng đến khi TTL hết để hỗ trợ reconnect.

## 5. Dữ liệu chính

### Room state lưu trong Redis

```text
roomCode, status, hostPlayerId
players[]
sharedPieceDeck[27][3]
turn, turnTimeLimit
turnEndsAt, remainingTurnMs
createdAt, updatedAt
schemaVersion, stateVersion
```

### Player state

```text
id, socketId, name, seatIndex
connected, ready, abandoned
board[9][9], score
hasPlacedThisRound, matchedLines[]
joinedAt, disconnectedAt
```

`playerId` là UUID do server tạo và ổn định trong vòng đời phòng. `socketId` thay đổi sau mỗi lần reconnect.

### Payload công khai

`room_state_update` không gửi `socketId`, timestamp kết nối hoặc deck đầy đủ. Payload gồm:

```text
roomCode, status, hostPlayerId
turn, currentPiece, timeLeft, turnTimeLimit
stateVersion
players[]: id, name, seatIndex, ready, connected,
           score, hasPlacedThisRound, board, matchedLines
```

Client bỏ qua payload có `stateVersion` nhỏ hơn state đang giữ.

## 6. Persistence và session

### Redis

- Room key: `matrix:room:<ROOM_CODE>`.
- Lobby sorted set: `matrix:lobby:rooms`, score là `createdAt`.
- Tạo phòng dùng `SET NX EX` để tránh trùng mã.
- Ghi state bình thường làm mới TTL về `ROOM_TTL_SECONDS`.
- Một số cập nhật disconnect dùng `KEEPTTL` để việc mất kết nối không kéo dài phòng vô hạn.
- Khi lấy danh sách, repository chỉ trả phòng `LOBBY` còn dưới 8 người và dọn entry đã hết hạn hoặc không còn hợp lệ.

### localStorage

| Key                       | Nội dung                 | Mục đích                               |
| ------------------------- | ------------------------ | -------------------------------------- |
| `matrix-game-session`     | `{ roomCode, playerId }` | Khôi phục phòng sau reload/reconnect   |
| `matrix-game-player-name` | Tên gần nhất             | Điền sẵn modal tạo hoặc tham gia phòng |

Tên người chơi là bắt buộc, được trim và giới hạn tối đa 24 ký tự ở cả luồng UI và server.

`bootstrap.js` chạy trước giao diện chính, thêm class `restoring-room` khi có session hợp lệ về hình dạng. Class này ngăn index chớp lên trong lúc client chờ kết quả `resume_room`.

## 7. Runtime memory của server

Redis là nguồn khôi phục dài hơn vòng đời process, còn `roomManager` giữ dữ liệu cần cho game loop đang chạy:

- Cache room đang hoạt động.
- Interval timer 100ms.
- Transition timeout 500ms giữa hai lượt.
- Cờ chống chốt cùng một lượt nhiều lần.
- Map slot ưu tiên dùng cho auto-place.

Các dữ liệu runtime này không được serialize vào Redis. Room được nạp lại vào memory khi client gọi `resume_room`; phòng `PAUSED` sẽ dựng lại timer từ `remainingTurnMs`. Nếu cả Node.js process dừng đột ngột khi room vẫn mang trạng thái `PLAYING`, phiên bản hiện tại chưa tự dựng lại interval từ `turnEndsAt`.

## 8. Socket.IO protocol

Các request cần kết quả sử dụng acknowledgement dạng `{ ok: true, data? }` hoặc `{ ok: false, error }`.

### Client → server

| Event                | Payload chính               | Chức năng                                         |
| -------------------- | --------------------------- | ------------------------------------------------- |
| `list_rooms`         | `{}`                        | Join public lobby và lấy danh sách phòng đang chờ |
| `create_room`        | `{ playerName }`            | Tạo phòng và vào phòng với vai trò host           |
| `join_room`          | `{ roomCode, playerName }`  | Tham gia một lobby còn chỗ                        |
| `resume_room`        | `{ roomCode, playerId }`    | Khôi phục phiên bằng player ID đã lưu             |
| `leave_room`         | `{ roomCode, playerId }`    | Rời phòng hiện tại                                |
| `toggle_ready`       | `{ roomCode }`              | Đổi ready state của member                        |
| `start_game`         | `{ turnTimeLimit }`         | Host bắt đầu game                                 |
| `make_move`          | `{ turn, slotIdx }`         | Đặt combo thủ công                                |
| `set_preferred_slot` | `{ turn, slotIdx \| null }` | Cập nhật slot ưu tiên nếu hết giờ                 |
| `restart_game`       | `{}`                        | Đưa phòng đã kết thúc về lobby                    |
| `chat_message`       | `string`                    | Gửi tin nhắn tối đa 100 ký tự                     |

### Server → client

| Event                | Chức năng                                         |
| -------------------- | ------------------------------------------------- |
| `lobby_rooms_update` | Đồng bộ danh sách phòng mở cho các client ở index |
| `room_state_update`  | State authoritative của phòng                     |
| `timer_tick`         | Cập nhật `timeLeft` giữa các lần phát full state  |
| `game_started`       | Báo game vừa được host khởi động                  |
| `game_over`          | Full state cuối trận để render kết quả            |
| `chat_message`       | Broadcast `{ sender, msg, playerId }` trong phòng |

## 9. Frontend flow

1. Browser tải `index.html`, `bootstrap.js`, Socket.IO client và các script theo thứ tự cố định.
2. Nếu có session, client gọi `resume_room` trước khi hiển thị index; nếu khôi phục thất bại, session bị xoá và danh sách phòng được tải.
3. Tạo phòng hoặc click phòng mở modal tên. Thành công sẽ chuyển thẳng vào màn hình phòng chờ.
4. Trong lobby, giao diện hiển thị người chơi, ready state, timer option và nút start cho host.
5. Trong game, PixiJS render board chính; DOM render timer, combo, leaderboard, chat và board đối thủ.
6. Khi kết thúc, nút “Đấu ván mới” luôn có ở header và modal kết quả; đóng modal không làm mất khả năng chơi lại.
7. Thoát phòng xoá session và quay về index.

Chat chỉ giữ tối đa 50 message element trên client và không được persist.

## 10. Cấu trúc thư mục

```text
Matrix-Game/
├── server.js
├── src/
│   ├── config/
│   │   ├── constants.js
│   │   └── redis.js
│   ├── core/
│   │   ├── gameLogic.js
│   │   └── roomTransitions.js
│   ├── network/socketHandler.js
│   ├── repositories/redisRoomRepository.js
│   ├── services/roomService.js
│   └── state/roomManager.js
└── public/
    ├── index.html
    ├── css/style.css
    └── js/
        ├── bootstrap.js
        ├── config/
        │   ├── constants.js
        │   └── icons.js
        ├── core/game.js
        ├── network/app.js
        └── ui/
            ├── hud.js
            ├── lobby.js
            ├── opponents.js
            └── pixi-board.js
```

## 11. Giới hạn thiết kế

- Không có authentication; người có `roomCode` và `playerId` hợp lệ có thể khôi phục player tương ứng.
- Socket session map, timer và auto-place preference chỉ tồn tại trong một process.
- Redis bảo toàn board và room state khi process restart, nhưng timer của room đang ở trạng thái `PLAYING` chưa được tự động rehydrate.
- Chưa có Socket.IO Redis adapter hoặc distributed lock, vì vậy không được chạy nhiều game server instance trên cùng tập phòng.
- Redis chỉ giữ trạng thái tạm thời theo TTL, không phải lịch sử trận đấu lâu dài.
- Chat không persist và không được khôi phục sau reload.
