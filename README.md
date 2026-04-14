# 財務管理 Web App

個人用的網頁財務管理工具，以 React + Vite + TypeScript 製作，資料儲存於 Firebase Realtime Database，美股即時報價使用 Finnhub API。

## 功能

- **月度現金流**：月初餘額、當月總收入、總支出、當月淨值、月末預計餘額
- **收入 / 支出**：可新增、編輯、刪除項目（名稱、金額、日期、備註）
- **自動結轉**：切換到新月份時若尚未設定月初餘額，自動以前一月「月初餘額 + 淨值」帶入
- **存錢目標**：可建立多個目標，追蹤目標金額與已存進度、進度條、期限
- **美股投資**：記錄代號、股數、平均成本；串接 Finnhub 即時報價，顯示現價、漲跌、市值、未實現損益，每 60 秒自動刷新

## 快速開始

### 1. 安裝相依套件

```bash
npm install
```

### 2. 設定環境變數

複製 `.env.example` 為 `.env.local`，並填入以下設定：

#### Firebase Realtime Database

到 [Firebase Console](https://console.firebase.google.com/) 建立專案：

1. 啟用 **Realtime Database**（選擇測試模式可先開放讀寫）。
2. 在「專案設定 → 一般 → 你的應用程式」中新增 Web 應用程式，複製 `firebaseConfig` 對應到以下環境變數：

```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_DATABASE_URL=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

> ⚠️ 本專案預設無登入功能。RTDB 規則請在 Firebase Console 設為僅允許特定 UID 或在網路白名單內讀寫，或改為自行接入 Firebase Auth。

#### Finnhub API

到 [Finnhub](https://finnhub.io/register) 註冊取得免費 API Key (每分鐘 60 次)：

```
VITE_FINNHUB_API_KEY=...
```

未設定時仍可記錄持股，但不顯示即時報價。

### 3. 本地開發

```bash
npm run dev
```

預設於 http://localhost:5173 啟動。

### 4. 建置

```bash
npm run build
```

產出靜態檔案於 `dist/`，可部署至 Vercel、Netlify、Firebase Hosting、GitHub Pages 等。

## 資料結構 (Firebase Realtime Database)

```
/months/{YYYY-MM}
    startBalance: number
    income/{id}:   { name, amount, date, note? }
    expenses/{id}: { name, amount, date, note? }
/goals/{id}:      { name, targetAmount, currentAmount, deadline?, createdAt }
/investments/{id}:{ symbol, shares, avgCost, note?, createdAt }
```

## 技術堆疊

- React 18 + TypeScript
- Vite 5
- Tailwind CSS 3
- Firebase Realtime Database (v10 modular SDK)
- Finnhub `quote` endpoint
