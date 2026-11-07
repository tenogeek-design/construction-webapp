"use strict";
/* CONSTRUCTION GROUP — Task photo reports / owner review v1.
   Uses existing Supabase task_photos, task_review_history and private task-photos bucket.
   Current SQL policies are OWNER ONLY. Worker/foreman access is NOT enabled here.
*/
(() => {
  const URL = "https://yepxskcfxyiyqqhmdpve.supabase.co";
  const KEY = "sb_publishable_2C4bPGasaBUDx-GJ_8ibDA_ct7LUZTH";
  const $ = id => document.getElementById(id);
  if (!window.supabase || !$('tasks')) return;
  const db = window.supabase.createClient(URL, KEY);
  const errText = e => e?.message || String(e);
  const section = $('tasks');
  const panel = document.createElement('section');
  panel.className = 'panel';
  panel.id = 'taskReviewPanel';
  panel.style.marginTop = '20px';
  panel.innerHTML = `
    <div class="panel-header"><div><h3>Фотоотчёты и проверка работ</h3><p>Доступ владельца · файлы хранятся в закрытом Storage</p></div></div>
    <div style="padding:20px;display:grid;gap:14px;">
      <label>Выбери задачу
        <select id="reviewTaskSelect" style="display:block;width:100%;padding:11px;margin-top:6px;"><option value="">Выберите задачу</option></select>
      </label>
      <p id="reviewMessage" role="status" style="color:#a4a7ad;">Выбери задачу, чтобы посмотреть фотографии и историю.</p>
      <div id="reviewTaskInfo"></div>
      <div id="reviewPhotoList" style="display:flex;gap:12px;flex-wrap:wrap;"></div>
      <label>Добавить фотографии (JPG, PNG, WEBP, до 10 МБ каждая)
        <input id="reviewPhotoInput" type="file" accept="image/jpeg,image/png,image/webp" multiple style="display:block;margin-top:8px;">
      </label>
      <div><button type="button" id="reviewUploadBtn">Загрузить фото</button> <button type="button" id="reviewRefreshBtn">↻ Обновить</button></div>
      <label>Комментарий к проверке
        <textarea id="reviewComment" rows="3" placeholder="Что сделано, замечания или причина возврата" style="display:block;width:100%;padding:11px;margin-top:6px;"></textarea>
      </label>
      <div style="display:flex;gap:10px;flex-wrap:wrap;">
        <button type="button" id="reviewSubmitBtn">Отправить на проверку</button>
        <button type="button" id="reviewApproveBtn">Утвердить</button>
        <button type="button" id="reviewRejectBtn">Вернуть в работу</button>
      </div>
      <div><h4 style="margin-bottom:10px;">История проверок</h4><div id="reviewHistory">Пока нет записей.</div></div>
    </div>`;
  const footer = section.querySelector('footer');
  if (footer) section.insertBefore(panel, footer); else section.append(panel);

  const select = $('reviewTaskSelect');
  const msg = (s, bad = false) => { $('reviewMessage').textContent = s; $('reviewMessage').style.color = bad ? '#ff8989' : '#a4a7ad'; };
  let currentUser = null, tasks = [], busy = false, authorized = false;
  const statuses = { new: 'Новая', in_progress: 'В работе', review: 'На проверке', completed: 'Завершена', cancelled: 'Отменена' };
  const actions = { submitted: 'Отправлена на проверку', approved: 'Утверждена', rejected: 'Возвращена в работу', commented: 'Комментарий' };
  function setBusy(value) {
    busy = value;
    ['reviewUploadBtn','reviewRefreshBtn','reviewSubmitBtn','reviewApproveBtn','reviewRejectBtn'].forEach(id => { $(id).disabled = value || !authorized || !select.value; });
    $('reviewRefreshBtn').disabled = value || !authorized;
  }
  async function requireOwner() {
    const { data: { user }, error: authError } = await db.auth.getUser();
    if (authError || !user) throw new Error('Сначала войди в админку.');
    const { data, error } = await db.rpc('is_owner');
    if (error) throw new Error('Не удалось проверить роль владельца: ' + errText(error));
    if (data !== true) throw new Error('Фотоотчёты пока доступны только OWNER. Права бригадиров подключим отдельно.');
    currentUser = user;
    authorized = true;
  }
  async function loadTasks() {
    msg('Загружаем задачи...');
    try {
      await requireOwner();
      const { data, error } = await db.from('tasks').select('id,title,status,photo_required,project_id').order('created_at', { ascending: false }).limit(500);
      if (error) throw error;
      tasks = data || [];
      const previous = select.value;
      select.replaceChildren(new Option('Выберите задачу', ''));
      tasks.forEach(t => select.append(new Option(`${t.title} — ${statuses[t.status] || t.status}`, t.id)));
      if (tasks.some(t => t.id === previous)) select.value = previous;
      setBusy(false);
      if (select.value) await loadDetail(); else msg(`Загружено задач: ${tasks.length}. Выбери задачу.`);
    } catch (e) { authorized = false; setBusy(false); msg('Ошибка: ' + errText(e), true); }
  }
  async function loadDetail() {
    const id = select.value;
    $('reviewPhotoList').replaceChildren();
    $('reviewHistory').textContent = 'Загружаем историю...';
    $('reviewTaskInfo').textContent = '';
    if (!id) { msg('Выбери задачу.'); setBusy(false); return; }
    setBusy(true);
    try {
      await requireOwner();
      const task = tasks.find(t => t.id === id);
      $('reviewTaskInfo').textContent = task ? `Статус: ${statuses[task.status] || task.status} · Фотоотчёт: ${task.photo_required ? 'обязателен' : 'не обязателен'}` : '';
      const [photosResult, historyResult] = await Promise.all([
        db.from('task_photos').select('id,storage_path,original_filename,created_at').eq('task_id', id).order('created_at', { ascending: false }),
        db.from('task_review_history').select('action,comment,created_at').eq('task_id', id).order('created_at', { ascending: false })
      ]);
      if (photosResult.error) throw photosResult.error;
      if (historyResult.error) throw historyResult.error;
      for (const p of photosResult.data || []) {
        const { data, error } = await db.storage.from('task-photos').createSignedUrl(p.storage_path, 300);
        const card = document.createElement('div');
        card.style.cssText = 'width:170px;max-width:100%;';
        if (!error && data?.signedUrl) {
          const a = document.createElement('a'); a.href = data.signedUrl; a.target = '_blank'; a.rel = 'noopener noreferrer';
          const img = document.createElement('img'); img.src = data.signedUrl; img.alt = p.original_filename || 'Фото задачи';
          img.style.cssText = 'width:170px;height:120px;object-fit:cover;border-radius:8px;';
          a.append(img); card.append(a);
        }
        const caption = document.createElement('small'); caption.textContent = p.original_filename || 'Фото'; caption.style.display = 'block';
        card.append(caption); $('reviewPhotoList').append(card);
      }
      if (!photosResult.data?.length) $('reviewPhotoList').textContent = 'Фотографий пока нет.';
      const history = $('reviewHistory'); history.replaceChildren();
      for (const h of historyResult.data || []) {
        const item = document.createElement('p');
        item.style.cssText = 'padding:9px 0;border-bottom:1px solid #3b3f46;';
        item.textContent = `${new Date(h.created_at).toLocaleString('ru-RU')} · ${actions[h.action] || h.action}${h.comment ? ' · ' + h.comment : ''}`;
        history.append(item);
      }
      if (!historyResult.data?.length) history.textContent = 'Истории пока нет.';
      msg(`Фото: ${(photosResult.data || []).length}. Записей истории: ${(historyResult.data || []).length}.`);
    } catch (e) { msg('Ошибка загрузки: ' + errText(e), true); }
    finally { setBusy(false); }
  }
  async function upload() {
    const id = select.value, files = Array.from($('reviewPhotoInput').files || []);
    if (!id || !files.length) return msg('Выбери задачу и фотографии.', true);
    if (files.some(f => !['image/jpeg','image/png','image/webp'].includes(f.type) || f.size > 10485760)) return msg('Разрешены только JPG, PNG, WEBP до 10 МБ.', true);
    setBusy(true);
    try {
      await requireOwner();
      let count = 0;
      for (const f of files) {
        const ext = f.type === 'image/png' ? 'png' : f.type === 'image/webp' ? 'webp' : 'jpg';
        const path = `${id}/${crypto.randomUUID()}.${ext}`;
        const { error: uploadError } = await db.storage.from('task-photos').upload(path, f, { contentType: f.type, upsert: false });
        if (uploadError) throw uploadError;
        const { error: rowError } = await db.from('task_photos').insert({ task_id: id, storage_path: path, original_filename: f.name, mime_type: f.type, size_bytes: f.size, uploaded_by: currentUser.id });
        if (rowError) {
          await db.storage.from('task-photos').remove([path]);
          throw rowError;
        }
        count++;
      }
      $('reviewPhotoInput').value = '';
      await loadDetail();
      msg(`Загружено фотографий: ${count}.`);
    } catch (e) { msg('Ошибка загрузки фото: ' + errText(e), true); }
    finally { setBusy(false); }
  }
  async function transition(action, nextStatus) {
    const id = select.value;
    if (!id) return msg('Выбери задачу.', true);
    const task = tasks.find(t => t.id === id);
    if (!task) return msg('Задача не найдена.', true);
    if (action === 'submitted' && task.status === 'completed') return msg('Завершённую задачу нельзя отправить повторно.', true);
    if (action === 'approved' && task.status !== 'review') return msg('Утверждать можно только задачи со статусом «На проверке».', true);
    if (action === 'rejected' && task.status !== 'review') return msg('Вернуть можно только задачу со статусом «На проверке».', true);
    const comment = $('reviewComment').value.trim();
    if (action === 'rejected' && !comment) return msg('Укажи причину возврата.', true);
    setBusy(true);
    try {
      await requireOwner();
      if (action === 'submitted' && task.photo_required) {
        const { count, error } = await db.from('task_photos').select('id', { count: 'exact', head: true }).eq('task_id', id);
        if (error) throw error;
        if (!count) throw new Error('Для этой задачи обязателен хотя бы один фотоотчёт.');
      }
      const { data, error } = await db.from('tasks').update({ status: nextStatus }).eq('id', id).eq('status', task.status).select('id');
      if (error) throw error;
      if (!data?.length) throw new Error('Статус не обновлён. Возможно, его изменили в другом окне или нет прав RLS.');
      const { error: historyError } = await db.from('task_review_history').insert({ task_id: id, action, comment: comment || null, actor_id: currentUser.id });
      if (historyError) {
        msg('Статус изменён, но запись истории НЕ сохранилась: ' + errText(historyError) + '. Сообщи об этом администратору.', true);
        await loadTasks();
        return;
      }
      $('reviewComment').value = '';
      await loadTasks();
      msg(actions[action] + '. Изменения сохранены.');
      // Refresh the existing tasks table, whose state is maintained by admin-tasks.js.
      $('tasksRefreshBtn')?.click();
    } catch (e) { msg('Ошибка: ' + errText(e), true); }
    finally { setBusy(false); }
  }
  select.addEventListener('change', loadDetail);
  $('reviewRefreshBtn').addEventListener('click', loadTasks);
  $('reviewUploadBtn').addEventListener('click', upload);
  $('reviewSubmitBtn').addEventListener('click', () => transition('submitted', 'review'));
  $('reviewApproveBtn').addEventListener('click', () => transition('approved', 'completed'));
  $('reviewRejectBtn').addEventListener('click', () => transition('rejected', 'in_progress'));
  const observer = new MutationObserver(() => {
    if (section.style.display !== 'none' && !authorized) loadTasks();
  });
  observer.observe(section, { attributes: true, attributeFilter: ['style'] });
  if (location.hash === '#tasks') loadTasks();
})();
