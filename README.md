<!-- markdownlint-disable MD013 MD033 MD041 -->

# fictional-drug-and-disease-ref-cms

架空の医薬品・疾患リファレンスの管理データ（drug / disease レコードと drug 画像）を編集するための、**ローカル限定の管理画面 (CMS)** です。一般利用者向けの公開アプリ（例: [fictional-drug-and-disease-ref-flutter](https://github.com/Corvus400/fictional-drug-and-disease-ref-flutter)）とは別の、管理者専用ツールとして分離しています。

> **現在の状態**: 本リポジトリは要件定義の確定とリポジトリ初期化のみが完了した段階です。アプリケーションコードは未実装で、実装は後続の作業で行います。

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

## 要件定義

機能・非機能・UI/UX・セキュリティの各要件は、仕様リポジトリ [specification](https://github.com/Corvus400/specification) の `fictional-drug-and-disease-ref/` に定義しています。実装はこれらを SSOT として行います。

- `13_秘匿アクセス制御要件定義.md` — 管理面の到達制御・外部秘匿・認証/認可・CORS
- `14_CRUD_WebAPI要件定義.md` — CMS が呼び出す CRUD WebAPI の入出力契約・画像アップロード・競合検出
- `15_CMS要件定義.md` — 本 CMS の機能・非機能・UI/UX 要件

編集対象フィールドの意味論・値域・必須/任意の別は、同リポジトリの `03_医薬品モデル詳細.md` / `04_疾患モデル詳細.md` に従います。

## 技術前提

- React による SPA を前提とします。ローカル管理ツールであり SSR / SEO 要件がないため、ビルド基盤は Vite を想定します（`15_CMS要件定義.md` §6）。
- 状態管理・データ取得・スタイリング・フォーム・テスト等の具体構成は、要件を踏まえた実装フェーズで決定します。本 README では特定ライブラリ・バージョンを固定しません。

## セキュリティ / 公開前提

- 本リポジトリは完成後に公開します。README・設定例・コードに、ローカル絶対パス・個人情報・秘密情報（JWT 署名 secret / DB 接続情報 / 各種 API トークン / 秘密鍵）・ライブ環境の正確な接続先を含めません。
- 接続先（管理面のホスト・ポート）は環境変数等の非公開設定で管理し、公開物には概念レベルの記述に留めます（`13_` / `15_` の情報漏洩防止要件に従う）。

## 関連リポジトリ

- [specification](https://github.com/Corvus400/specification) — 仕様・API 契約・要件定義
- [fictional-drug-and-disease-ref-backend-kotlin](https://github.com/Corvus400/fictional-drug-and-disease-ref-backend-kotlin) — Kotlin / Ktor バックエンド（CMS の接続先）
- [fictional-drug-and-disease-ref-flutter](https://github.com/Corvus400/fictional-drug-and-disease-ref-flutter) — Flutter 参考実装
- [fictional-drug-and-disease-ref-mock-server](https://github.com/Corvus400/fictional-drug-and-disease-ref-mock-server) — Ktor mock-server
