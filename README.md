<!-- markdownlint-disable MD013 MD033 MD041 -->

# fictional-drug-and-disease-ref-cms

架空の医薬品・疾患リファレンスの管理データ（drug / disease レコードと drug 画像）を編集するための、**ローカル限定の管理画面 (CMS)** です。一般利用者向けの公開アプリ（例: [fictional-drug-and-disease-ref-flutter](https://github.com/Corvus400/fictional-drug-and-disease-ref-flutter)）とは別の、管理者専用ツールとして分離しています。

## DISCLAIMER

これは架空の医薬品・疾患データを扱う管理ツールです。
内容は実在の医薬品・疾患・治療法を表すものではなく、
医療判断・診療・自己判断に使用してはなりません。
This CMS manages FICTIONAL drug and disease data.
DO NOT use for medical decisions or clinical practice.

## 位置づけ

- drug / disease に対する Create / Read / Update / Delete と、drug 画像のアップロードを GUI から行う管理ツールです。
- バックエンド（[fictional-drug-and-disease-ref-backend-kotlin](https://github.com/Corvus400/fictional-drug-and-disease-ref-backend-kotlin)）の、ローカル限定・外部秘匿の管理面に接続するクライアントです。公開アプリが利用する読み取り経路とは分離されています。
- 管理者がローカル環境で利用するツールであり、公開デプロイの対象ではありません。

## 主な機能

- drug / disease の一覧、検索、詳細表示
- drug / disease の作成、編集、削除
- nested フィールド、配列フィールド、enum フィールドの編集
- 関連 drug / disease の選択
- drug 画像の PNG アップロードとプレビュー
- 入力検証エラー、認証エラー、編集競合の表示

## 技術スタック

- React / TypeScript / Vite
- TanStack Router
- TanStack Query
- React Hook Form / Zod
- Tailwind CSS
- Biome / ESLint
- Vitest / React Testing Library / Playwright

## セットアップ

```bash
corepack enable pnpm
pnpm install
cp .env.example .env.local
pnpm dev
```

`.env.local` でバックエンドの管理 API 接続先を設定してください。秘密情報や個人環境の値は commit しないでください。

## 開発コマンド

```bash
pnpm typecheck
pnpm test
pnpm eslint:hooks
pnpm exec biome check .
pnpm build
pnpm e2e
```

## セキュリティ

- CMS はローカル管理用途のクライアントです。公開ホスティングでの運用は想定していません。
- 管理トークンはブラウザの永続ストレージに保存しません。
- API 接続先や認証情報は環境変数で管理し、リポジトリに秘密情報を含めないでください。

## 関連リポジトリ

- [specification](https://github.com/Corvus400/specification) — 仕様・API 契約・要件定義
- [fictional-drug-and-disease-ref-backend-kotlin](https://github.com/Corvus400/fictional-drug-and-disease-ref-backend-kotlin) — Kotlin / Ktor バックエンド（CMS の接続先）
- [fictional-drug-and-disease-ref-flutter](https://github.com/Corvus400/fictional-drug-and-disease-ref-flutter) — Flutter 参考実装
- [fictional-drug-and-disease-ref-mock-server](https://github.com/Corvus400/fictional-drug-and-disease-ref-mock-server) — Ktor mock-server
