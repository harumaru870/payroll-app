# Payroll App (給与計算アプリ)

従業員のシフト管理、給与計算、および給与明細のPDF発行を行うWebアプリケーションです。Next.js (App Router) と Supabase を使用して構築されています。

## プロジェクト構造 (Directory Structure)

主要なディレクトリとファイルの役割は以下の通りです。

```text
/
├── prisma/
│   └── schema.prisma      # データベーススキーマ定義 (User, WageSetting, Shift)
├── public/                # 静的ファイル (画像、フォントなど)
└── src/
    ├── app/               # Next.js App Router (ページとAPI)
    │   ├── actions.ts     # Server Actions (DB操作などのバックエンドロジック)
    │   ├── page.tsx       # トップページ (ダッシュボード)
    │   └── employees/     # 従業員管理ページ
    │       └── [id]/      # 従業員詳細・編集ページ
    ├── components/        # Reactコンポーネント
    │   ├── Header.tsx             # ヘッダー
    │   ├── ShiftCalendar.tsx      # シフト管理カレンダー
    │   ├── ShiftHistoryTable.tsx  # 勤務履歴テーブル
    │   ├── PayslipDocument.tsx    # 給与明細のPDFレイアウト
    │   └── PayslipDownloadButton.tsx # PDFダウンロードボタン
    ├── lib/               # 外部ライブラリの設定
    │   └── prisma.ts      # Prisma Clientのシングルトンインスタンス
    └── utils/             # ユーティリティ関数
        └── payroll.ts     # 給与計算のコアロジック
```

## 技術スタック (Tech Stack)

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **Database:** PostgreSQL (Supabase)
- **ORM:** Prisma
- **Styling:** Tailwind CSS
- **PDF Generation:** @react-pdf/renderer
- **Deployment:** Vercel

## データベースモデル

`prisma/schema.prisma` で定義されています。

- **User**: 従業員基本情報
- **WageSetting**: 時給・交通費の設定（履歴管理可能）
- **Shift**: 日々の勤怠記録（出勤・退勤・休憩）

## 給与計算システムの特徴

### 1. 時給の履歴管理 (Versioning)
このシステムでは、単に従業員の「現在の時給」を保存するのではなく、`WageSetting` テーブルによって**「いつからその時給が適用されるか」**を管理しています。

- **過去の給与計算:** 過去の明細を再発行する場合、その当時の時給で正確に計算されます。
- **時給改定の予約:** 将来の特定の日付から時給を変更する場合、あらかじめ設定を登録しておくことが可能です。

### 2. 給与計算ロジック
`src/utils/payroll.ts` に集約されており、以下のルールで計算されます。

- **基本給:** `(退勤時刻 - 出勤時刻 - 休憩時間) × その時点の時給`
- **交通費:**
  - 日額設定の場合: 出勤日数に応じて加算
  - 月額設定の場合: 出勤日数に関わらず固定額を加算
- **端数処理:** 分単位での計算に対応しています。

## 環境構築 (Setup)

### 1. 環境変数の設定

プロジェクトルートに `.env` ファイルを作成し、Supabaseの接続情報を設定します。

```env
# Transaction Pooler (Port 6543) - アプリケーション接続用
DATABASE_URL="postgres://postgres:[PASSWORD]@[HOST]:6543/postgres?pgbouncer=true"

# Session Mode (Port 5432) - マイグレーション用
DIRECT_URL="postgres://postgres:[PASSWORD]@[HOST]:5432/postgres"
```

### 2. 依存関係のインストール

```bash
npm install
```

### 3. データベースのセットアップ

```bash
npx prisma generate
npx prisma db push
```

### 4. 開発サーバーの起動

```bash
npm run dev
```

---

## Default Next.js Readme

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.