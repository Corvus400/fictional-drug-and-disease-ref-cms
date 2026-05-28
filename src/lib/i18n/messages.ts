const messages = {
  appTitle: "架空医薬品・疾患リファレンス CMS",
  dashboard: "ダッシュボード",
  drugs: "医薬品",
  diseases: "疾患",
  list: "一覧",
  detail: "詳細",
  edit: "編集",
  create: "新規作成",
  save: "保存",
  delete: "削除",
  cancel: "キャンセル",
  confirmDelete: "削除を確定",
  search: "検索",
  page: "ページ",
  totalCount: "総件数",
  required: "必須",
  optional: "任意",
  loading: "読み込み中",
  noItems: "該当するレコードがありません",
  unauthorized: "認証が必要です。管理トークンを再取得してください。",
  forbidden: "管理権限が不足しています。",
  rateLimited: "操作が多すぎます。少し待ってから再試行してください。",
  networkError: "通信に失敗しました。管理面の起動状態を確認してください。",
  validationError: "入力内容を確認してください。",
  conflict: "サーバ側で更新されました。最新を取得しました。差分を確認して再編集してください。",
  referenceConflict: "他のリソースから参照されているため削除できません。",
  saved: "保存しました",
  deleted: "削除しました",
  uploaded: "画像をアップロードしました",
  pngOnly: "PNG ファイルのみアップロードできます。",
  pngMax: "PNG は 5 MB 以下にしてください。",
  unsaved: "未保存の変更があります。移動すると変更が失われます。",
} as const;

export type MessageKey = keyof typeof messages;

export function t(key: MessageKey): string {
  return messages[key];
}
