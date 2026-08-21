# Matrix Game — Đặc tả kỹ thuật

## 1. Phạm vi

`matrix-game-server` cung cấp cả frontend và backend realtime của Matrix Battle. Backend là một Node.js process; frontend là một Nuxt 4 SPA được build tĩnh và phục vụ bởi cùng process đó.

- Backend chịu trách nhiệm tuyệt đối đối với room state, timer, tính hợp lệ của nước đi, auto-place, điểm và kết quả.
- Redis lưu room state ngắn hạn để hỗ trợ reload và reconnect.
- Frontend chịu trách nhiệm hiển thị, animation và gửi thao tác hoặc vị trí người chơi đang lựa chọn.
- Không có authentication, tài khoản người dùng hoặc REST API nghiệp vụ.

## 2. Runtime và dependency

### Backend

- JavaScript ESM (`"type": "module"`).
- Express phục vụ thư mục `public/` (tĩnh, do frontend build ra) và có catch-all route trả `index.html` cho mọi path khác — cần thiết để các route SPA sâu (`/room/CODE`, `/preview/CODE`) resolve đúng khi hard-reload hoặc mở link trực tiếp.
- Socket.IO cung cấp giao tiếp hai chiều.
- Redis lưu trạng thái phòng và lobby index.

### Frontend

- Nuxt 4 SPA (`ssr: false`) đặt trong `frontend/`, dùng Pinia làm store, Vue Router cho các route thật (không phải overlay trên một trang duy nhất).
- PixiJS 7.x được cài qua npm (không còn tải từ CDN) và render trong composable `usePixiBoard.ts`.
- Icon dùng bộ `@lucide/vue` (SVG component), không dùng emoji hay font-icon.
- Font Orbitron / Plus Jakarta Sans / Fira Code tải qua Google Fonts `<link>` khai báo trong `nuxt.config.ts`.
- Build: `cd frontend && npm run build:frontend` (chạy `nuxt generate` rồi copy `.output/public/` đè lên `../public/`). Không có SSR/Node server riêng cho frontend — output là static SPA, Express chỉ serve file tĩnh.

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
- Server phát combo của lượt kế tiếp ngay khi lượt hiện tại chốt xong — không còn độ trễ nhân tạo giữa hai lượt. (Trước đây có 500ms transition delay; đã bỏ vì gây cảm giác timer bị khựng lại trên client. Client vẫn có animation "bounce" ~520ms thuần hiển thị khi một quân được đặt, không liên quan tới thời điểm server phát lượt mới.)
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

### Render lạc quan (optimistic) khi đặt quân

`usePixiBoard.ts`'s `handleCellClick` viết trực tiếp giá trị combo vào `store.localRoomState.players[myIdx].board` và set `hasPlacedThisRound = true` NGAY khi click — trước khi có phản hồi từ `make_move` — rồi mới gọi `renderBoard()`. Mục đích: ẩn hoàn toàn round-trip latency (đặc biệt khi mạng/Redis production chậm hơn localhost), vì trước đây UI chỉ cập nhật sau khi `room_state_update` quay lại, khiến việc đặt quân "có cảm giác delay" trên môi trường có latency thật.

- An toàn vì server vẫn là nguồn sự thật tuyệt đối: state đoán trước sẽ bị `room_state_update` thật ghi đè hoàn toàn (`applyRoomState` gán lại `store.localRoomState` từ đầu), nên không có nguy cơ desync vĩnh viễn.
- Chỉ đoán trước vị trí/giá trị quân đặt (đã được validate y hệt điều kiện server sẽ kiểm — slot trống, đúng lượt, chưa đặt) — KHÔNG đoán trước điểm số hay `matchedLines`, vì logic tính điểm (quét run theo hàng/cột/chéo) chỉ tồn tại ở server; điểm số và animation "twang" nối các run khớp vẫn chờ xác nhận thật.
- Nếu `make_move` trả về lỗi (hiếm, vì đã validate y hệt ở client trước khi optimistic-update — chỉ xảy ra khi có race, ví dụ lượt đã đổi giữa lúc gửi request), client revert lại đúng các ô đã optimistic-set về `null` — nhưng CHỈ khi `store.localRoomState.turn` vẫn còn là turn lúc gửi request (nếu lượt đã đổi, nghĩa là state thật mới hơn đã ghi đè rồi, revert theo dữ liệu cũ sẽ sai nên bỏ qua).

## 4. Trạng thái phòng

| Trạng thái | Ý nghĩa                                                  |
| ---------- | --------------------------------------------------------- |
| `LOBBY`    | Phòng đang chờ, xuất hiện trên index nếu còn chỗ          |
| `PLAYING`  | Game đang chạy và timer đang đếm                          |
| `PAUSED`   | Không còn người chơi online trong khi game chưa kết thúc  |
| `FINISHED` | Đã hoàn thành 27 lượt và có kết quả                        |

### Vòng đời

1. `create_room` tạo mã phòng 6 ký tự, tạo host và thêm phòng vào lobby index.
2. `join_room` chỉ chấp nhận phòng `LOBBY` còn chỗ.
3. Host có thể bắt đầu một mình. Nếu có member, tất cả member phải online và ready.
4. `start_game` xoá board/score cũ, sinh deck mới, gỡ phòng khỏi lobby index và khởi động timer.
5. Nếu toàn bộ người chơi mất kết nối trong lúc chơi, timer dừng và phòng chuyển sang `PAUSED` với số millisecond còn lại.
6. `resume_room` nối `playerId` cũ với socket mới; nếu phòng đang pause, timer tiếp tục từ thời gian còn lại.
7. Kết thúc trận chuyển phòng sang `FINISHED`, phát `game_over`/`room_state_update`, sau đó gỡ phòng khỏi **lobby listing** (`removeRoomFromLobby` — chỉ xoá khỏi sorted set `matrix:lobby:rooms`, KHÔNG xoá room key). Room vẫn còn nguyên trong Redis với TTL bình thường, nên các client vẫn `resume_room`/`spectate_room` được để xem lại kết quả sau khi reload. Room chỉ mất hẳn khi TTL hết hoặc khi ai đó bấm "Đấu ván mới"/rời phòng khiến người cuối cùng rời `LOBBY` (xem §6).
8. `restart_game` đưa phòng về `LOBBY`, reset board, score, deck và ready state rồi thêm lại vào lobby index — áp dụng ngay cho **toàn bộ phòng** vì đây là state dùng chung; xem §9 về cách client của những người chưa bấm nút vẫn giữ nguyên màn hình kết quả.

### Host và rời phòng

- Rời phòng khi đang ở `LOBBY`: người chơi bị xoá khỏi danh sách.
- Rời phòng sau khi game đã bắt đầu (`PLAYING`/`PAUSED`/`FINISHED`): player được đánh dấu `abandoned`, không bị xoá ngay để bảo toàn kết quả hiện tại.
- **Nếu host chủ động rời phòng (`leave_room`) ở BẤT KỲ trạng thái nào**, quyền host luôn được chuyển cho người chơi còn active có `seatIndex` thấp nhất (`findFirstActivePlayer`). Trước đây việc chuyển host chỉ xảy ra khi phòng còn `LOBBY`; ở các trạng thái khác `hostPlayerId` bị set về `null` — đây là một bug đã sửa, vì nó khiến phòng mất host giữa/cuối trận.
- Disconnect thụ động (đóng tab, mất mạng — không gọi `leave_room`) KHÔNG chuyển host; player chỉ được đánh dấu `connected:false` để có thể `resume_room` lại sau.
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

Client bỏ qua payload có `stateVersion` nhỏ hơn state đang giữ (`applyRoomState` trong `useSocket.ts`).

## 6. Persistence và session

### Redis

- Room key: `matrix:room:<ROOM_CODE>`.
- Lobby sorted set: `matrix:lobby:rooms`, score là `createdAt`. Chỉ phòng có mặt trong set này mới xuất hiện ở danh sách public (`list_rooms`/`lobby_rooms_update`) — bao gồm cả `LOBBY` (để join) và `PLAYING` (để spectate); `FINISHED` bị gỡ khỏi set ngay khi kết thúc (xem §4.7) dù dữ liệu phòng vẫn còn.
- Tạo phòng dùng `SET NX EX` để tránh trùng mã.
- Ghi state bình thường làm mới TTL về `ROOM_TTL_SECONDS`.
- Một số cập nhật disconnect dùng `KEEPTTL` để việc mất kết nối không kéo dài phòng vô hạn.
- Khi lấy danh sách, repository dọn luôn các entry đã hết hạn hoặc không còn tồn tại trong Redis (`listOpenRooms`).

### localStorage (frontend)

| Key                          | Nội dung                          | Mục đích                                                              |
| ----------------------------- | ---------------------------------- | ----------------------------------------------------------------------- |
| `matrix-game-session`        | `{ roomCode, playerId, isSpectating? }` | Khôi phục phòng (player hoặc spectator) sau reload/reconnect      |
| `matrix-game-player-name`    | Tên gần nhất                       | Điền sẵn modal tạo hoặc tham gia phòng                                 |
| `matrix-game-result:<ROOM_CODE>` | Snapshot `players[]` lúc trận kết thúc | Giữ màn hình kết quả của RIÊNG người chơi này qua reload — xem §9 |

Tên người chơi là bắt buộc, được trim và giới hạn tối đa 24 ký tự ở cả luồng UI và server.

Nuxt plugin `plugins/session-restore.client.ts` chạy trên hook `app:mounted`, đọc `matrix-game-session` và gọi `resume_room`/`spectate_room` tương ứng trước khi coi phiên phục hồi xong. Trong lúc đó, Pinia store có `isRestoring: true`, và `app.vue` chỉ render một placeholder rỗng thay vì `<NuxtPage>` — tương đương vai trò của `restoring-room` class trong bản vanilla JS cũ, nhưng nay là một cờ trong store thay vì thao tác DOM trực tiếp.

Link mời (`copy link` trong lobby) luôn trỏ về site root (`/?room=CODE`), vì chỉ `pages/index.vue` đọc query `room` để mở modal tham gia — mọi route sâu khác không xử lý query này.

## 7. Runtime memory của server

Redis là nguồn khôi phục dài hơn vòng đời process, còn `roomManager` giữ dữ liệu cần cho game loop đang chạy:

- Cache room đang hoạt động (`rooms` Map, key = roomCode).
- Interval timer 100ms cho mỗi phòng đang `PLAYING`.
- Cờ `isTransitioning` chống chốt cùng một lượt nhiều lần (lượt có thể kết thúc từ hai nguồn: timer về 0, hoặc tất cả người chơi đặt xong sớm — cần khoá lại để không chạy `finishCurrentTurn` hai lần cùng lúc).
- Map slot ưu tiên dùng cho auto-place.

Không còn transition timeout nhân tạo giữa hai lượt (đã bỏ, xem §3) — `finishCurrentTurn` gọi thẳng bước chuyển lượt kế tiếp sau khi lưu state.

Các dữ liệu runtime này không được serialize vào Redis. Room được nạp lại vào memory khi client gọi `resume_room`; phòng `PAUSED` sẽ dựng lại timer từ `remainingTurnMs`. Nếu cả Node.js process dừng đột ngột khi room vẫn mang trạng thái `PLAYING`, phiên bản hiện tại chưa tự dựng lại interval từ `turnEndsAt`.

## 8. Socket.IO protocol

Các request cần kết quả sử dụng acknowledgement dạng `{ ok: true, data? }` hoặc `{ ok: false, error }`.

### Client → server

| Event                | Payload chính               | Chức năng                                         |
| --------------------- | ---------------------------- | --------------------------------------------------- |
| `list_rooms`         | `{}`                        | Join public lobby và lấy danh sách phòng đang chờ/đang chơi |
| `create_room`        | `{ playerName }`            | Tạo phòng và vào phòng với vai trò host             |
| `join_room`          | `{ roomCode, playerName }`  | Tham gia một lobby còn chỗ                          |
| `resume_room`        | `{ roomCode, playerId }`    | Khôi phục phiên bằng player ID đã lưu               |
| `spectate_room`      | `{ roomCode }`              | Xem một trận đang `PLAYING`/`PAUSED` mà không có ghế |
| `stop_spectating`    | `{ roomCode }`              | Rời khỏi chế độ xem mà không xoá session            |
| `leave_room`         | `{ roomCode, playerId }`    | Rời phòng hiện tại (chuyển host nếu là host)        |
| `kick_player`        | `{ targetPlayerId }`        | Host đuổi một người chơi khỏi phòng                 |
| `toggle_ready`       | `{ roomCode }`              | Đổi ready state của member                          |
| `start_game`         | `{ turnTimeLimit }`         | Host bắt đầu game                                   |
| `make_move`          | `{ turn, slotIdx }`         | Đặt combo thủ công                                  |
| `set_preferred_slot` | `{ turn, slotIdx \| null }` | Cập nhật slot ưu tiên nếu hết giờ                   |
| `restart_game`       | `{}`                        | Đưa phòng đã kết thúc về lobby (áp dụng cho cả phòng) |
| `chat_message`       | `string`                    | Gửi tin nhắn tối đa 100 ký tự                       |

### Server → client

| Event                 | Chức năng                                          |
| ---------------------- | ---------------------------------------------------- |
| `lobby_rooms_update`  | Đồng bộ danh sách phòng mở cho các client ở index    |
| `room_state_update`   | State authoritative của phòng                        |
| `timer_tick`          | Cập nhật `timeLeft` giữa các lần phát full state      |
| `game_started`        | Báo game vừa được host khởi động                      |
| `game_over`           | Full state cuối trận để render kết quả                |
| `chat_message`        | Broadcast `{ sender, msg, playerId }` trong phòng     |
| `kicked_from_room`    | Báo client vừa bị host kick, buộc quay về index       |

## 9. Frontend flow

Frontend là Nuxt 4 SPA (`frontend/app/`), route thật (không phải overlay trên một trang):

- `pages/index.vue` — danh sách phòng public, modal tạo/tham gia, xử lý query `?room=CODE` từ link mời.
- `pages/room/[code].vue` — màn chơi cho người có ghế, dùng chung layout `GameRoomLayout.vue` với lobby chờ (`LobbyView.vue`), bàn chính (`GameBoard.vue`, PixiJS), panel quân kế tiếp, leaderboard, chat, bàn đối thủ (`OpponentsPanel.vue`) và modal kết quả (`VictoryModal.vue`).
- `pages/preview/[code].vue` — chế độ xem (spectator), cùng layout nhưng ẩn panel quân kế tiếp và khung chat input.

State dùng chung qua Pinia store (`stores/game.ts`); giao tiếp socket qua composable `useSocket.ts` (một socket instance duy nhất, singleton ở module scope).

### Khôi phục session khi reload

1. Plugin `session.client.ts` chạy trước khi route hiển thị, đọc `matrix-game-session` từ localStorage.
2. Có session player → `resume_room`; có session spectator → `spectate_room`; không có/hỏng → về index (giữ nguyên query hiện tại, không xoá `?room=` nếu đang ở `/`).
3. Nếu phòng đã hết hạn hoặc không hợp lệ, session bị xoá.

### Màn hình kết quả độc lập theo từng người chơi

Đây là hành vi quan trọng cần giữ đúng khi sửa code liên quan đến `FINISHED`/`restart_game`:

- `restart_game` là hành động dùng chung cho cả phòng — bất kỳ ai bấm cũng khiến server reset TOÀN BỘ phòng về `LOBBY` ngay lập tức (không có khái niệm "chỉ lobby của riêng tôi" ở phía server).
- Vì vậy, việc "người khác vẫn thấy màn kết quả" hoàn toàn là hành vi CLIENT-SIDE, độc lập với `roomStatus` sống:
  - `store.showVictoryModal` quyết định có hiện modal hay không — không tự tắt khi `roomStatus` đổi sang `LOBBY`, chỉ tắt khi CHÍNH người chơi đó bấm "Đấu Ván Mới" hoặc "Thoát Phòng".
  - Khi `applyRoomState` thấy trận vừa chuyển sang `FINISHED`, nó snapshot `state.players` vào `store.frozenResults` VÀ lưu xuống `localStorage['matrix-game-result:<roomCode>']`. `VictoryModal` luôn render từ `frozenResults` nếu có, thay vì leaderboard sống — nên dù người khác đã restart (làm board/score sống bị reset về 0), modal của người chưa bấm gì vẫn hiện đúng điểm số cuối trận.
  - Khi reload, `session-restore` gọi `resume_room` như bình thường (nhận state SỐNG — có thể đã là `LOBBY` nếu ai đó restart trước đó), sau đó kiểm tra riêng `matrix-game-result:<roomCode>`: nếu còn tồn tại (nghĩa là người này chưa từng bấm restart/rời phòng), ghi đè `frozenResults` + bật `showVictoryModal = true` — bất kể `roomStatus` sống đang là gì.
  - Snapshot chỉ bị xoá (ở `useLobbyNav.leaveAndGoToIndex` và ở hai nơi gọi `restart_game` thành công) khi CHÍNH người chơi đó chủ động bấm "Đấu Ván Mới" hoặc "Thoát Phòng" — đúng yêu cầu "chỉ đổi màn hình khi bấm chơi tiếp hoặc thoát phòng".
  - Đóng modal bằng nút "X" không xoá snapshot — chỉ ẩn tạm để xem board, reload lại sẽ hiện lại modal kết quả (coi như một thao tác "peek", không phải rời màn hình).
  - Cơ chế này lưu ở localStorage nên chỉ theo từng trình duyệt/thiết bị, không đồng bộ nếu một người chơi dùng nhiều thiết bị cho cùng một `playerId`.

### `RoomStatus` — kiểm tra trạng thái phòng thống nhất qua TypeScript

Trước đây mỗi file tự so sánh chuỗi `=== 'LOBBY'`/`!== 'PLAYING'`/... rải rác, dễ lệch nhau khi thêm trạng thái mới hoặc gõ sai chuỗi. Nay quy về:

- `types/index.ts` export type `RoomStatus = 'LOBBY' | 'PLAYING' | 'PAUSED' | 'FINISHED'`, dùng lại cho cả `RoomState.status` và `PublicRoom.status` (qua `Extract<RoomStatus, 'LOBBY' | 'PLAYING'>`).
- `utils/roomStatus.ts` export các predicate thuần (`isLobbyStatus`, `isPlayingStatus`, `isPausedStatus`, `isFinishedStatus`) nhận `RoomStatus | undefined | null` — dùng ở những nơi KHÔNG cần reactivity (ví dụ trong `usePixiBoard.ts`, so sánh một `state.status` cụ thể tại một thời điểm, hoặc `applyRoomState` so sánh state cũ/mới).
- `composables/useRoomStatus.ts` bọc các predicate trên thành computed ref (`isLobby`, `isPlaying`, `isPaused`, `isFinished`) đọc trực tiếp từ `store.localRoomState?.status` — dùng trong template của `GameRoomLayout.vue`, `pages/room/[code].vue`. Nhờ vậy `GameRoomLayout.vue` không cần nhận `roomStatus` như một prop nữa (nó đã có `useGameStore()` sẵn), giảm một tầng truyền dữ liệu trùng lặp từ cả hai page cha.

### Các điểm khác

- Lobby (`LobbyView.vue`) hiển thị icon vương miện cạnh tên host để phân biệt trực quan, không chỉ dựa vào vị trí slot.
- Leaderboard không dùng text "(BẠN)" để đánh dấu người chơi hiện tại — thay bằng border-left và box-shadow màu cam trên chính hàng đó (`LeaderboardItem.vue`), tách biệt với style riêng của hàng #1 (leader).
- Danh sách leaderboard bọc trong `<TransitionGroup name="rank">` (`GameRoomLayout.vue`) để tự động animate khi thứ hạng đổi chỗ (CSS `.rank-move { transition: transform 0.55s cubic-bezier(0.22,1,0.36,1) }`) — đây là bản port Vue-idiomatic của kỹ thuật FLIP thủ công (`getBoundingClientRect` trước/sau + Web Animations API) từng có trong `hud.js` bản vanilla cũ.
- Chat chỉ giữ tối đa 50 message trong store, không persist.
- Mọi lệnh gọi `emitAck(...)` đều resolve về một `AckResponse` xác định (không bao giờ `undefined`) — vì vậy chỗ gọi chỉ cần `res.ok`/`res.data`, KHÔNG cần `res?.ok`. Chỉ `res.error` mới thật sự optional (dùng `res.error?.message`).

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
├── frontend/                      # Nuxt 4 SPA — nguồn của public/
│   ├── nuxt.config.ts
│   └── app/
│       ├── app.vue
│       ├── assets/css/style.css
│       ├── components/            # GameRoomLayout, LobbyView, GameBoard,
│       │                          # HudPanel, PiecePanel, ChatWidget,
│       │                          # LeaderboardItem, OpponentsPanel,
│       │                          # VictoryModal, NameModal, PublicRoomCard…
│       ├── composables/           # useSocket, usePixiBoard, useLobbyNav,
│       │                          # useRoomStatus
│       ├── config/constants.ts    # PLAYER_COLORS và helper màu — PHẢI khớp
│       │                          # với src/config/constants.js phía backend
│       ├── pages/
│       │   ├── index.vue
│       │   ├── room/[code].vue
│       │   └── preview/[code].vue
│       ├── plugins/session.client.ts
│       ├── stores/game.ts
│       ├── types/index.ts
│       └── utils/roomStatus.ts    # predicate thuần isLobbyStatus/isPlayingStatus/…
└── public/                        # build output tĩnh (đè bởi build:frontend),
                                    # không sửa tay
```

## 11. Giới hạn thiết kế

- Không có authentication; người có `roomCode` và `playerId` hợp lệ có thể khôi phục player tương ứng.
- Socket session map, timer và auto-place preference chỉ tồn tại trong một process.
- Redis bảo toàn board và room state khi process restart, nhưng timer của room đang ở trạng thái `PLAYING` chưa được tự động rehydrate.
- Chưa có Socket.IO Redis adapter hoặc distributed lock, vì vậy không được chạy nhiều game server instance trên cùng tập phòng.
- Redis chỉ giữ trạng thái tạm thời theo TTL, không phải lịch sử trận đấu lâu dài.
- Chat không persist và không được khôi phục sau reload.
- Snapshot màn hình kết quả (`matrix-game-result:<roomCode>`) chỉ ở localStorage của từng trình duyệt — không phải nguồn dữ liệu authoritative, chỉ phục vụ hiển thị.
