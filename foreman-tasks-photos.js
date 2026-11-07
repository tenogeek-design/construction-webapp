"use strict";
/* CONSTRUCTION GROUP — фотоотчёты бригадира 2.1.
   ВАЖНО: доступ к task_photos, Storage и обновлению tasks должен быть
   разрешён безопасными серверными RLS/RPC. Этот файл не обходит ограничения.
*/
document.addEventListener("DOMContentLoaded", async () => {
  const section = document.getElementById("foremanTasksSection");
  if (!section || !window.supabase) return;
  const db = window.supabase.createClient(
    "https://yepxskcfxyiyqqhmdpve.supabase.co",
    "sb_publishable_2C4bPGasaBUDx-GJ_8ibDA_ct7LUZTH"
  );
  const panel = document.createElement("div");
  panel.className = "expense-form-container";
  panel.style.marginTop = "22px";
  panel.innerHTML = `
    <h2>Фотоотчёт по задаче</h2>
    <p class="muted">Фотографии доступны только пользователям с серверными правами. Утверждение выполняет владелец.</p>
    <div class="form-field"><label for="foremanPhotoTask">Задача</label><select id="foremanPhotoTask"><option value="">Загрузка...</option></select></div>
    <div id="foremanPhotoInfo" class="muted" style="margin-top:12px"></div>
    <div id="foremanPhotoGallery" style="display:flex;flex-wrap:wrap;gap:12px;margin-top:12px"></div>
    <div class="form-field" style="margin-top:16px"><label for="foremanPhotoFiles">Фотографии (JPG, PNG, WEBP, до 10 МБ)</label><input type="file" id="foremanPhotoFiles" accept="image/jpeg,image/png,image/webp" multiple></div>
    <div class="form-field" style="margin-top:12px"><label for="foremanPhotoComment">Комментарий к выполненной работе</label><textarea id="foremanPhotoComment" maxlength="1000" placeholder="Что сделано, что проверить"></textarea></div>
    <div class="form-actions"><button type="button" id="foremanPhotoUpload">Загрузить фото</button><button type="button" id="foremanPhotoSubmit">Отправить на проверку</button><button type="button" class="secondary-button" id="foremanPhotoRefresh">Обновить</button></div>
    <p id="foremanPhotoMessage" class="form-message" role="status" aria-live="polite"></p>
  `;
  section.appendChild(panel);
  const $ = id => document.getElementById(id);
  const select = $("foremanPhotoTask"), info = $("foremanPhotoInfo"), gallery = $("foremanPhotoGallery");
  const uploadButton = $("foremanPhotoUpload"), submitButton = $("foremanPhotoSubmit"), refreshButton = $("foremanPhotoRefresh");
  const msg = (s, error = false) => { $("foremanPhotoMessage").textContent = s; $("foremanPhotoMessage").className = "form-message " + (error ? "error" : "success"); };
  let tasks = [], user = null, busy = false;
  const setBusy = value => { busy = value; [select, uploadButton, submitButton, refreshButton].forEach(el => el.disabled = value); };
  const errorText = e => e?.message || String(e);
  async function allowedProjects() {
    const { data, error } = await db.rpc("get_my_expense_projects");
    if (error) throw error;
    return (Array.isArray(data) ? data : []).map(p => p.project_id).filter(Boolean);
  }
  async function loadTasks() {
    setBusy(true);
    try {
      const { data: auth, error: authError } = await db.auth.getUser();
      if (authError || !auth?.user) throw new Error("Сначала войдите в кабинет.");
      user = auth.user;
      const ids = await allowedProjects();
      const old = select.value;
      select.replaceChildren(new Option("Выберите задачу", ""));
      if (!ids.length) { tasks = []; gallery.replaceChildren(); info.textContent = "Нет назначенных объектов."; return; }
      const { data, error } = await db.from("tasks").select("id,project_id,title,status,photo_required").in("project_id", ids).order("created_at", { ascending: false });
      if (error) throw error;
      tasks = data || [];
      for (const t of tasks) select.appendChild(new Option(`${t.title} — ${t.status}`, t.id));
      if (tasks.some(t => t.id === old)) select.value = old;
      await loadPhotos();
      msg(`Доступно задач: ${tasks.length}.`);
    } catch (e) { msg("Ошибка загрузки задач: " + errorText(e), true); }
    finally { setBusy(false); }
  }
  async function loadPhotos() {
    gallery.replaceChildren();
    const task = tasks.find(t => t.id === select.value);
    info.textContent = task ? `Статус: ${task.status} · Фото обязательны: ${task.photo_required ? "да" : "нет"}` : "Выберите задачу.";
    if (!task) return;
    const { data, error } = await db.from("task_photos").select("id,storage_path,original_filename").eq("task_id", task.id).order("created_at", { ascending: false });
    if (error) { msg("Нет доступа к фотоотчётам: " + errorText(error), true); return; }
    if (!data?.length) { gallery.textContent = "Фотографий пока нет."; return; }
    for (const photo of data) {
      const { data: signed, error: signError } = await db.storage.from("task-photos").createSignedUrl(photo.storage_path, 300);
      if (signError || !signed?.signedUrl) continue;
      const link = document.createElement("a"); link.href = signed.signedUrl; link.target = "_blank"; link.rel = "noopener noreferrer";
      const image = document.createElement("img"); image.src = signed.signedUrl; image.alt = photo.original_filename || "Фото задачи";
      image.style.cssText = "width:150px;height:110px;object-fit:cover;border-radius:8px";
      link.appendChild(image); gallery.appendChild(link);
    }
  }
  async function upload() {
    const task = tasks.find(t => t.id === select.value);
    const files = Array.from($("foremanPhotoFiles").files || []);
    if (!task || !files.length) return msg("Выберите задачу и фотографии.", true);
    if (task.status === "completed" || task.status === "review") return msg("Задача уже на проверке или завершена.", true);
    if (files.some(f => !["image/jpeg","image/png","image/webp"].includes(f.type) || f.size < 1 || f.size > 10485760)) return msg("Разрешены JPG, PNG, WEBP до 10 МБ.", true);
    setBusy(true);
    try {
      let uploaded = 0;
      for (const file of files) {
        const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
        const path = `${task.id}/${crypto.randomUUID()}.${ext}`;
        const { error: uploadError } = await db.storage.from("task-photos").upload(path, file, { contentType: file.type, upsert: false });
        if (uploadError) throw uploadError;
        const { error: rowError } = await db.from("task_photos").insert({ task_id: task.id, storage_path: path, original_filename: file.name, mime_type: file.type, size_bytes: file.size, uploaded_by: user.id });
        if (rowError) { await db.storage.from("task-photos").remove([path]); throw rowError; }
        uploaded++;
      }
      $("foremanPhotoFiles").value = "";
      await loadPhotos();
      msg(`Загружено фотографий: ${uploaded}.`);
    } catch (e) { msg("Загрузка не выполнена: " + errorText(e) + ". Проверьте права Supabase.", true); }
    finally { setBusy(false); }
  }
  async function submit() {
    const task = tasks.find(t => t.id === select.value);
    if (!task) return msg("Выберите задачу.", true);
    if (!["new", "in_progress"].includes(task.status)) return msg("Отправить можно только новую задачу или задачу в работе.", true);
    setBusy(true);
    try {
      if (task.photo_required) {
        const { count, error } = await db.from("task_photos").select("id", { count: "exact", head: true }).eq("task_id", task.id);
        if (error) throw error;
        if (!count) throw new Error("Для этой задачи требуется хотя бы одна фотография.");
      }
      const { data, error } = await db.from("tasks").update({ status: "review" }).eq("id", task.id).eq("status", task.status).select("id");
      if (error) throw error;
      if (!data?.length) throw new Error("Не удалось изменить статус. Проверьте права доступа.");
      const comment = $("foremanPhotoComment").value.trim();
      const { error: historyError } = await db.from("task_review_history").insert({ task_id: task.id, action: "submitted", comment: comment || null, actor_id: user.id });
      if (historyError) { msg("Статус обновлён, но история НЕ записана: " + errorText(historyError), true); await loadTasks(); return; }
      $("foremanPhotoComment").value = "";
      await loadTasks();
      document.getElementById("foremanRefreshTasks")?.click();
      msg("Работа отправлена владельцу на проверку.");
    } catch (e) { msg("Отправка не выполнена: " + errorText(e), true); }
    finally { setBusy(false); }
  }
  select.addEventListener("change", () => { loadPhotos().catch(e => msg(errorText(e), true)); });
  uploadButton.addEventListener("click", upload);
  submitButton.addEventListener("click", submit);
  refreshButton.addEventListener("click", loadTasks);
  await loadTasks();
});
