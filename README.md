# 旅伴 TripPals 🧳

和自己搭配的 3D 小角色一起旅行的 Web App（PWA，手機可「加到主畫面」當 App 用）。

## 功能

| 需求 | 做法 |
|---|---|
| 1. 3D 角色＋地圖＋手機定位 | 自己搭配的 Q 版角色（髮型、眼睛、衣服、帽子、動物耳朵、眼鏡、背包、所有顏色），站在 **3D 建築地圖**上，跟著 GPS 走路（有走路動畫、會轉向）。可搜尋地點、規劃步行／自行車／開車路線，大眾運輸一鍵開 Google 地圖導航 |
| 2. 同行人分享行程＋行蹤 | 用 6 碼邀請碼加入旅程；**行程**大家共享、一起編輯；**位置**每個人自己決定要不要分享（預設關閉，關掉後位置資料會立刻刪除） |
| 3. 標註地點＋想逛/想買/想參觀 | 地圖上點 📌 或搜尋後「加入我的地點」，每個地點可新增「想逛／想買／想參觀」，支援文字、圖片、網址、打勾。**只有自己看得到** |
| 4. 多次旅遊 | 旅程列表，可以建立、編輯、刪除多趟旅程，旅程結束後保留成「回憶」 |
| 5. 筆記（攜帶清單、穿搭） | 🎒 攜帶清單（有打包進度、常用清單一鍵加入）、👗 每日穿搭（可上傳照片）、📝 備忘。**只有自己看得到** |

在電腦上測試時，可以按 🎮 **模擬模式**，點地圖讓角色走過去（不需要手機也能玩）。

## 兩種模式

- **本機模式**（預設，什麼都不用設定）：資料存在這個瀏覽器的 IndexedDB，不需要帳號。但「同行」功能無法使用。
- **雲端模式**（Supabase 免費方案）：要登入帳號，可以跨裝置同步，也能邀請同行人共享。

---

## 在電腦上執行

需要 Node.js（或任何靜態網頁伺服器）：

```bash
npx http-server trip-pals -p 5173 -c-1
```

打開 http://localhost:5173。

> 不需要 `npm install`，也不用 build。所有套件都從 CDN 載入。

---

## 部署到網路上（不需要 GitHub）

這是純靜態網站，把整個 `trip-pals` 資料夾上傳就能用。以下方式都**不需要 GitHub**，而且都會自動提供 HTTPS（手機定位必須是 HTTPS）。

### 方法 A：Netlify Drop（最簡單，大約 1 分鐘）
1. 到 https://app.netlify.com/drop（用 email 註冊即可）
2. 把 `trip-pals` 資料夾**直接拖進網頁**
3. 會得到一個網址，例如 `https://xxxx.netlify.app`。到 Site settings 可以改成好記的名字
4. 之後要更新：在網站的 Deploys 頁面，把資料夾再拖一次

### 方法 B：Cloudflare Pages（直接上傳）
1. 註冊 https://dash.cloudflare.com（email 即可）
2. Workers & Pages → Create → Pages → **Upload assets**
3. 上傳 `trip-pals` 資料夾，就會得到 `https://xxx.pages.dev`

### 方法 C：命令列
```bash
npx netlify-cli deploy --dir=trip-pals --prod
```

```bash
npx vercel trip-pals --prod
```

### 手機安裝
用手機瀏覽器打開網址：
- iPhone（Safari）：分享 → 加入主畫面
- Android（Chrome）：選單 → 安裝應用程式／加到主畫面

---

## 開啟雲端模式（要和同行人共享時才需要）

1. 到 https://supabase.com 註冊（**可以用 email 註冊，不用 GitHub**），建立一個新 Project（選離你近的區域，例如 Tokyo 或 Singapore）
2. 左側 **SQL Editor** → New query → 把 [`supabase/schema.sql`](supabase/schema.sql) 整份貼上 → **Run**
3. 左側 **Project Settings → API**，複製 `Project URL` 和 `anon public` key，填進 [`js/config.js`](js/config.js)：
   ```js
   window.TRIPPALS_CONFIG = {
     SUPABASE_URL: 'https://xxxx.supabase.co',
     SUPABASE_ANON_KEY: 'eyJhbGciOi...',
   };
   ```
   （anon key 本來就是公開給前端用的，安全性由資料庫的 Row Level Security 控制）
4. **Authentication → URL Configuration**：Site URL 填你部署後的網址
5. （選填）**Authentication → Providers → Email**：關閉「Confirm email」，註冊後就不用收確認信
6. 重新部署（把資料夾再上傳一次）

### 隱私設計（由資料庫強制執行，不是只靠前端隱藏）
- 地點、想逛/想買清單、筆記、圖片：只有本人讀得到
- 行程：同一趟旅程的成員才讀得到
- 位置：只有在對方「開啟分享」時，同旅程成員才讀得到；關閉分享時會刪除位置資料
- 圖片存在私人的 Storage bucket，透過 1 小時有效的簽名網址顯示

> Supabase 免費專案如果 7 天沒有人使用會暫停，到後台按一下 Restore 就能恢復。

---

## 使用的免費服務（都不需要 API key）

| 用途 | 服務 |
|---|---|
| 3D 地圖圖資 | [OpenFreeMap](https://openfreemap.org)（OpenStreetMap 資料）＋ MapLibre GL |
| 3D 角色 | Three.js（用基本幾何形狀組成，不需要模型檔） |
| 地點搜尋 | Nominatim（OpenStreetMap） |
| 路線規劃 | OSRM（routing.openstreetmap.de） |
| 大眾運輸 | 開啟 Google 地圖導航（深層連結） |
| 介面 | Preact + htm（不需要 build） |

如果之後想改用 Google Maps 的地點資料或大眾運輸 API，需要申請 Google Maps Platform API key 並綁定帳單。可以改寫 `js/geo.js` 裡的 `searchPlaces` 和 `route` 函式。

## 檔案結構

```
trip-pals/
├─ index.html            入口
├─ css/style.css         樣式
├─ js/
│  ├─ config.js          雲端設定（Supabase）
│  ├─ main.js            App 主體、定位、同行人同步
│  ├─ store.js           資料層（本機 IndexedDB / 雲端 Supabase 同一套 API）
│  ├─ avatar.js          3D 角色產生器
│  ├─ map.js             3D 地圖 + 角色圖層
│  ├─ geo.js             搜尋、路線、Google 地圖連結
│  ├─ images.js          上傳前壓縮圖片
│  ├─ ui.js / consts.js  共用元件、常數
│  └─ views/             各畫面
├─ supabase/schema.sql   雲端資料庫結構與權限
├─ manifest.webmanifest  PWA 設定
└─ sw.js                 離線快取
```

## 之後想做成真正的 App（上架 App Store / Google Play）
這個專案可以用 [Capacitor](https://capacitorjs.com) 包成 iOS/Android App，程式幾乎不用改。但上架需要開發者帳號（Apple 每年 US$99、Google 一次 US$25），iOS 還需要 Mac 才能打包。
