import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ErrorNotice, messageForError } from "./ErrorNotice";

describe("ErrorNotice", () => {
  it("shows the localized message for known AppError variants", () => {
    render(
      <ErrorNotice
        error={{
          kind: "conflict",
          message:
            "サーバ側で更新されました。最新を取得しました。差分を確認して再編集してください。",
        }}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      "サーバ側で更新されました。最新を取得しました。差分を確認して再編集してください。",
    );
  });

  it("does not expose raw unknown error messages", () => {
    expect(messageForError(new Error("Authorization: Bearer header.payload.signature"))).toBe(
      "通信に失敗しました。管理面の起動状態を確認してください。",
    );
  });
});
