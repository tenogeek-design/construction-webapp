
"use strict";

// CONSTRUCTION GROUP
// Фотоотчёты работника по назначенным заданиям.

window.CGWorkerPhotos = (() => {
  const BUCKET = "task-photos";
  const MAX_SIZE = 10 * 1024 * 1024;

  const MIME_TYPES = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp"
  };

  function makeText(text) {
    const element = document.createElement("p");
    element.textContent = text;
    element.style.cssText = `
      font-size: 13px;
      color: #a4a7ad;
      line-height: 1.5;
      margin: 10px 0;
    `;
    return element;
  }

  function makeButton(text) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "worker-task-button";
    button.textContent = text;
    return button;
  }

  function mount({ db, task, actions }) {
    const panel = document.createElement("div");

    panel.style.cssText = `
      margin-top: 20px;
      padding-top: 16px;
      border-top: 1px solid #454950;
    `;

    const heading = document.createElement("strong");
    heading.textContent = "Фотоотчёт";

    const info = makeText(
      "JPG, PNG, WebP — максимум 10 МБ на фотографию."
    );

    const photoList = document.createElement("div");

    photoList.style.cssText = `
      display: grid;
      grid-template-columns:
        repeat(auto-fit, minmax(100px, 1fr));
      gap: 10px;
      margin-top: 14px;
    `;

    const message = makeText("");

    panel.append(heading, info, photoList, message);

    const canUpload =
      task.status === "in_progress";

    let input = null;
    let uploadButton = null;

    if (canUpload) {
      input = document.createElement("input");
      input.type = "file";
      input.accept = "image/jpeg,image/png,image/webp";
      input.multiple = true;

      input.style.cssText = `
        display: block;
        width: 100%;
        margin: 14px 0;
        color: #ffffff;
        font-size: 12px;
      `;

      uploadButton = makeButton("📷 Загрузить фото");

      panel.insertBefore(input, photoList);
      panel.insertBefore(uploadButton, photoList);
    }

    actions.appendChild(panel);

    function showMessage(text, error = false) {
      message.textContent = text;
      message.style.color =
        error ? "#ff938a" : "#91d6a5";
    }

    async function loadPhotos() {
      photoList.replaceChildren();

      const { data, error } = await db
        .from("task_photos")
        .select(
          "id, storage_path, original_filename, created_at"
        )
        .eq("task_id", task.task_id)
        .order("created_at", { ascending: false });

      if (error) {
        showMessage(
          "Не удалось получить фотографии: " +
          error.message,
          true
        );
        return;
      }

      const photos = data || [];

      if (!photos.length) {
        photoList.appendChild(
          makeText("Фотографий пока нет.")
        );
        return;
      }

      for (const photo of photos) {
        const { data: signed, error: signedError } =
          await db.storage
            .from(BUCKET)
            .createSignedUrl(photo.storage_path, 300);

        if (signedError || !signed?.signedUrl) {
          photoList.appendChild(
            makeText("Фото недоступно.")
          );
          continue;
        }

        const link = document.createElement("a");
        link.href = signed.signedUrl;
        link.target = "_blank";
        link.rel = "noopener noreferrer";

        const image = document.createElement("img");
        image.src = signed.signedUrl;
        image.alt =
          photo.original_filename || "Фото работы";
        image.loading = "lazy";

        image.style.cssText = `
          display: block;
          width: 100%;
          height: 100px;
          object-fit: cover;
          border-radius: 8px;
          border: 1px solid #454950;
          cursor: pointer;
        `;

        link.appendChild(image);
        photoList.appendChild(link);
      }
    }

    async function uploadPhotos() {
      const files = Array.from(input.files || []);

      if (!files.length) {
        showMessage(
          "Сначала выберите фотографии.",
          true
        );
        return;
      }

      if (files.length > 20) {
        showMessage(
          "За один раз можно загрузить до 20 фото.",
          true
        );
        return;
      }

      for (const file of files) {
        if (!MIME_TYPES[file.type]) {
          showMessage(
            "Допускаются только JPG, PNG и WebP.",
            true
          );
          return;
        }

        if (file.size < 1 || file.size > MAX_SIZE) {
          showMessage(
            "Каждая фотография должна быть до 10 МБ.",
            true
          );
          return;
        }
      }

      uploadButton.disabled = true;
      input.disabled = true;

      let uploaded = 0;
      let failed = 0;

      try {
        const { data: auth, error: authError } =
          await db.auth.getUser();

        if (authError || !auth?.user) {
          throw new Error(
            "Сессия завершена. Войдите заново."
          );
        }

        for (const file of files) {
          showMessage(
            "Загрузка " +
            (uploaded + failed + 1) +
            " из " + files.length
          );

          const extension = MIME_TYPES[file.type];

          const filename =
            crypto.randomUUID() + "." + extension;

          const path =
            task.task_id + "/" + filename;

          // 1. Загружаем в приватный Storage.
          const { error: storageError } =
            await db.storage
              .from(BUCKET)
              .upload(path, file, {
                contentType: file.type,
                cacheControl: "3600",
                upsert: false
              });

          if (storageError) {
            console.error(storageError);
            failed++;
            continue;
          }

          // 2. Сохраняем запись о фото.
          const { error: recordError } =
            await db.from("task_photos").insert({
              task_id: task.task_id,
              storage_path: path,
              original_filename: file.name,
              mime_type: file.type,
              size_bytes: file.size,
              uploaded_by: auth.user.id
            });

          if (recordError) {
            console.error(recordError);
            failed++;
            // Файл мог сохраниться без записи.
            // Повторную загрузку с тем же именем
            // не выполняем.
            continue;
          }

          uploaded++;
        }

        input.value = "";

        await loadPhotos();

        showMessage(
          "Загружено: " + uploaded +
          ". Ошибок: " + failed + ".",
          failed > 0
        );

      } catch (error) {
        console.error("Photo upload error:", error);

        showMessage(
          error.message || "Ошибка загрузки.",
          true
        );

      } finally {
        uploadButton.disabled = false;
        input.disabled = false;
      }
    }

    if (uploadButton) {
      uploadButton.addEventListener(
        "click",
        uploadPhotos
      );
    }

    loadPhotos();
  }

  return { mount };
})();
