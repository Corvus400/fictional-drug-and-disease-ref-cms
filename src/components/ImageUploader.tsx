import { Upload } from "lucide-react";
import { useState } from "react";
import { useUploadDrugImage } from "@/lib/api/resources";
import { t } from "@/lib/i18n/messages";

const maxPngBytes = 5 * 1024 * 1024;

type ImageUploaderProps = {
  drugId: string;
  imageUrl?: string;
};

export function ImageUploader({ drugId, imageUrl }: ImageUploaderProps) {
  const [previewUrl, setPreviewUrl] = useState<string | undefined>();
  const [message, setMessage] = useState<string | undefined>();
  const upload = useUploadDrugImage(drugId);

  return (
    <section className="section-panel" aria-labelledby="image-upload-title">
      <h2 id="image-upload-title">画像</h2>
      {(previewUrl ?? imageUrl) ? (
        <img className="resource-image" src={previewUrl ?? imageUrl} alt="医薬品画像プレビュー" />
      ) : (
        <p className="muted">画像は未設定です。</p>
      )}
      <label className="file-input">
        <Upload aria-hidden="true" size={16} />
        PNG を選択
        <input
          accept="image/png"
          type="file"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file === undefined) {
              return;
            }
            if (file.type !== "image/png") {
              setMessage(t("pngOnly"));
              return;
            }
            if (file.size > maxPngBytes) {
              setMessage(t("pngMax"));
              return;
            }
            setPreviewUrl(URL.createObjectURL(file));
            upload.mutate(file, {
              onSuccess: () => setMessage(t("uploaded")),
              onError: (error) =>
                setMessage(error instanceof Error ? error.message : t("networkError")),
            });
          }}
        />
      </label>
      {message !== undefined ? (
        <p className="notice" aria-live="polite">
          {message}
        </p>
      ) : null}
    </section>
  );
}
