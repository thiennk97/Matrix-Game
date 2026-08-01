# Matrix Game (Matrix Battle)

Game xếp số thời gian thực dành cho 1–8 người chơi. Backend Node.js quản lý phòng, lượt chơi và kết quả; Redis lưu trạng thái phòng trong thời gian ngắn để người chơi có thể reload hoặc kết nối lại mà không mất ván.

## Tính năng chính

- Tạo phòng, xem danh sách phòng đang chờ và tham gia bằng link mời.
- Host có thể chơi một mình hoặc bắt đầu khi các thành viên đã sẵn sàng.
- Khôi phục đúng phòng và ván đang chơi sau khi reload trang.
- Bảng xếp hạng, bàn đối thủ, chat nhóm và màn hình kết quả theo thời gian thực.
- Chơi ván mới trong cùng phòng; nếu host đã rời phòng, người yêu cầu chơi lại sẽ trở thành host.
- Không có authentication. Danh tính tạm thời của người chơi được khôi phục bằng `playerId` lưu trong trình duyệt.

## Yêu cầu

- Node.js và npm
- Redis chạy tại `redis://localhost:6379`, hoặc cấu hình bằng `REDIS_URL`

## Chạy dự án

```bash
npm install
npm start
```

Mở `http://localhost:4000`. Frontend là static HTML/CSS/JavaScript được Express phục vụ trực tiếp, không có build step và không cần chạy frontend server riêng.

### Biến môi trường

| Biến               |                 Mặc định | Ý nghĩa                                         |
| ------------------ | -----------------------: | ----------------------------------------------- |
| `PORT`             |                   `4000` | Port HTTP và Socket.IO                          |
| `REDIS_URL`        | `redis://localhost:6379` | Redis connection URL                            |
| `ROOM_TTL_SECONDS` |                    `900` | Thời gian sống của trạng thái phòng trong Redis |

## Luật chơi

- Một trận có 27 lượt. Mỗi lượt dùng chung một combo gồm 3 số ngẫu nhiên từ 7 đến 10 cho tất cả người chơi.
- Mỗi người đặt combo vào một trong 27 slot dọc, mỗi slot chiếm 3 ô trên matrix 9x9.
- Host chọn giới hạn thời gian mỗi lượt: 5, 8, 10 hoặc 15 giây.
- Khi mọi người chơi đang kết nối đã đặt xong, lượt hiện tại kết thúc ngay. Combo kế tiếp xuất hiện sau 500ms.
- Nếu hết giờ khi combo đang trỏ vào một slot hợp lệ, server đặt combo vào chính slot đó.
- Nếu con trỏ nằm ngoài matrix, nằm trên slot đã có quân, client mất kết nối hoặc vị trí không còn hợp lệ, server tự chọn một slot trống ngẫu nhiên.
- Điểm của mỗi dãy từ 3 ô liên tiếp có cùng giá trị theo hàng, cột hoặc đường chéo là `giá trị × độ dài dãy`.
- Sau 27 lượt, người có tổng điểm cao nhất thắng.

## Phòng và khôi phục phiên chơi

- Trang index hiển thị các phòng ở trạng thái `LOBBY` còn chỗ.
- Tên người chơi là bắt buộc, tối đa 24 ký tự và được lưu trong `localStorage` để điền sẵn ở lần sau.
- Trình duyệt lưu `{ roomCode, playerId }` trong `matrix-game-session`. Khi reload, client gọi `resume_room` để lấy lại trạng thái từ Redis.
- Khi tất cả người chơi mất kết nối trong lúc chơi, phòng chuyển sang `PAUSED`. Người chơi quay lại sẽ tiếp tục với thời gian còn lại.
- Nút thoát phòng xoá phiên cục bộ và đưa người chơi về danh sách phòng.

## Kiến trúc

- `server.js` — khởi tạo Redis, Express, HTTP server và Socket.IO.
- `src/core/` — tạo state, sinh deck, tính điểm và chuyển trạng thái khi chơi lại.
- `src/services/` — nghiệp vụ tạo, tham gia, rời, khôi phục phòng và chuyển host.
- `src/repositories/` — đọc/ghi room state và lobby index trong Redis.
- `src/state/roomManager.js` — room cache trong tiến trình, timer, auto-place và broadcast state.
- `src/network/socketHandler.js` — validate và xử lý các Socket.IO event.
- `public/` — frontend tĩnh; PixiJS render và animate bàn chơi chính.

Chi tiết giao thức, state và vòng đời phòng nằm trong [SPEC.md](./SPEC.md).

## Giới hạn hiện tại

- Không có authentication hoặc tài khoản lâu dài.
- Socket.IO và timer đang chạy trong một Node.js process; chưa hỗ trợ scale ngang bằng nhiều instance.
- Chat chỉ tồn tại trên client trong phiên hiện tại, không được lưu vào Redis.
