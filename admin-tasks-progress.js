
"use strict";
/* CONSTRUCTION GROUP — Tasks 3.0: progress editor add-on.
   Add <script src="admin-tasks-progress.js"></script> AFTER admin-tasks.js.
   Uses existing task editor and task ID. Does not change other modules. */
(() => {
  const URL = "https://yepxskcfxyiyqqhmdpve.supabase.co";
  const KEY = "sb_publishable_2C4bPGasaBUDx-GJ_8ibDA_ct7LUZTH";
  const $ = id => document.getElementById(id);
  if (!window.supabase || !$('taskForm') || !$('taskId') || !$('taskEditorPanel')) return;
  const db = window.supabase.createClient(URL, KEY);
  const form = $('taskForm');
  const box = document.createElement('div');
  box.className = 'form-field';
  box.style.cssText = 'margin:16px 0;padding:16px;border:1px solid #454a52;border-radius:10px;background:#24272b';
  const label = document.createElement('label');
  label.htmlFor = 'taskProgressPercent';
  label.textContent = 'Готовность задачи (%)';
  label.style.cssText = 'display:block;margin-bottom:10px;font-weight:bold';
  const input = document.createElement('input');
  input.id = 'taskProgressPercent';
  input.type = 'number';
  input.min = '0'; input.max = '100'; input.step = '1'; input.value = '0';
  input.style.cssText = 'width:100%;max-width:180px;padding:12px;border-radius:8px;border:1px solid #454a52;background:#30343a;color:white';
  const hint = document.createElement('p');
  hint.textContent = 'Сначала сохрани новую задачу. Для существующей задачи процент сохраняется отдельно.';
  hint.style.cssText = 'color:#a4a7ad;font-size:12px;margin:10px 0';
  const save = document.createElement('button');
  save.type = 'button'; save.textContent = 'Сохранить прогресс';
  const msg = document.createElement('div');
  msg.setAttribute('role','status'); msg.style.marginTop = '10px';
  box.append(label,input,hint,save,msg);
  const actions = $('taskSaveBtn');
  if (actions && actions.parentElement) actions.parentElement.before(box);
  else form.append(box);

  let currentId = null;
  let requestNumber = 0;
  const uuid = s => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s || '');
  async function sync() {
    const id = $('taskId').value;
    if (id === currentId) return;
    currentId = id;
    const request = ++requestNumber;
    input.value = '0'; msg.textContent = '';
    save.disabled = !uuid(id);
    if (!uuid(id)) { hint.textContent = 'Создай и сохрани задачу, затем открой её для изменения прогресса.'; return; }
    hint.textContent = 'Прогресс сохраняется отдельно от остальных полей задачи.';
    const {data,error} = await db.from('tasks').select('progress_percent').eq('id',id).single();
    if (request !== requestNumber || currentId !== id) return;
    if (error) { msg.textContent = 'Не удалось загрузить прогресс: ' + error.message; return; }
    input.value = String(data.progress_percent ?? 0);
  }
  const observer = new MutationObserver(sync);
  observer.observe($('taskEditorPanel'),{attributes:true,attributeFilter:['style']});
  $('tasksTable')?.addEventListener('click',()=>setTimeout(sync,0));
  $('taskNewBtn')?.addEventListener('click',()=>setTimeout(sync,0));
  sync();
  save.addEventListener('click',async()=>{
    const id = $('taskId').value;
    const value = Number(input.value);
    if (!uuid(id)) { msg.textContent = 'Сначала сохрани задачу.'; return; }
    if (!Number.isInteger(value) || value < 0 || value > 100) { msg.textContent = 'Введите целое число от 0 до 100.'; return; }
    save.disabled = true; msg.textContent = 'Сохраняем...';
    try {
      const {data:{user},error:authError} = await db.auth.getUser();
      if (authError || !user) throw new Error('Войдите заново.');
      const {data:owner,error:ownerError} = await db.rpc('is_owner');
      if (ownerError || owner !== true) throw new Error('Менять прогресс может только владелец.');
      const {data,error} = await db.from('tasks').update({progress_percent:value}).eq('id',id).select('id,progress_percent');
      if (error) throw error;
      if (!data?.length) throw new Error('База не подтвердила обновление (RLS).');
      msg.style.color = '#22a06b';
      msg.textContent = 'Прогресс сохранён: ' + data[0].progress_percent + '%';
    } catch(e) { msg.style.color = '#ff8989'; msg.textContent = 'Ошибка: ' + (e.message || e); }
    finally { save.disabled = false; }
  });
})();
