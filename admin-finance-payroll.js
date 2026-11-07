/* CONSTRUCTION GROUP — Finance Payroll Obligations 1.1
   Read-only. Does not modify financial transactions or payroll records.
   Cancelled accruals are excluded from all obligation calculations.
*/
(() => {
  'use strict';

  const URL = 'https://yepxskcfxyiyqqhmdpve.supabase.co';
  const KEY = 'sb_publishable_2C4bPGasaBUDx-GJ_8ibDA_ct7LUZTH';

  const money = n => new Intl.NumberFormat('pl-PL', {
    style: 'currency',
    currency: 'PLN'
  }).format(Number(n) || 0);

  const esc = v => String(v ?? '').replace(
    /[&<>"']/g,
    c => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[c])
  );

  let client;
  let busy = false;

  function mount() {
    const section = document.getElementById('finance');

    if (!section) return null;

    let panel = document.getElementById(
      'financePayrollObligations'
    );

    if (panel) return panel;

    panel = document.createElement('section');

    panel.id = 'financePayrollObligations';

    panel.style.cssText = [
      'background:#292c31',
      'color:#f5f5f4',
      'border:1px solid #3b3f46',
      'border-radius:12px',
      'padding:22px',
      'margin:22px 0',
      'font-family:Arial,sans-serif'
    ].join(';');

    panel.innerHTML = `
      <div style="
        display:flex;
        gap:12px;
        justify-content:space-between;
        align-items:center;
        flex-wrap:wrap
      ">
        <div>
          <h2 style="font-size:19px;margin:0 0 6px">
            Зарплатные обязательства
          </h2>

          <p style="
            color:#a4a7ad;
            margin:0;
            font-size:13px
          ">
            Утверждённые начисления минус привязанные
            подтверждённые выплаты. Без движения денег.
          </p>
        </div>

        <button
          type="button"
          id="financePayrollRefresh"
          style="
            padding:9px 14px;
            cursor:pointer;
            border:1px solid #555;
            background:#30343a;
            color:white;
            border-radius:7px
          "
        >
          ↻ Обновить
        </button>
      </div>

      <p
        id="financePayrollMessage"
        style="color:#a4a7ad;margin:16px 0"
      >
        Загрузка…
      </p>

      <div id="financePayrollContent"></div>
    `;

    section.insertBefore(panel, section.firstChild);

    panel.querySelector('#financePayrollRefresh')
      .addEventListener('click', load);

    return panel;
  }

  async function load() {
    const panel = mount();

    if (!panel || busy) return;

    const msg = panel.querySelector(
      '#financePayrollMessage'
    );

    const out = panel.querySelector(
      '#financePayrollContent'
    );

    busy = true;

    msg.textContent = 'Загрузка зарплатных обязательств…';

    try {
      if (!window.supabase) {
        throw new Error(
          'Библиотека Supabase не загружена'
        );
      }

      client ||= window.supabase.createClient(URL, KEY);

      const {
        data: { session },
        error: authError
      } = await client.auth.getSession();

      if (authError) throw authError;

      if (!session) {
        throw new Error(
          'Войдите в админ-панель для просмотра данных'
        );
      }

      // Получаем начисления, выплаты, сотрудников,
      // объекты и отменённые начисления.

      const [
        accrualRes,
        allocationRes,
        paymentRes,
        employeeRes,
        projectRes,
        cancellationRes
      ] = await Promise.all([

        client
          .from('payroll_accruals')
          .select(
            'id,employee_id,project_id,final_amount,status,currency'
          )
          .eq('status', 'approved')
          .limit(1000),

        client
          .from('payroll_payment_allocations')
          .select('accrual_id,payment_id,amount')
          .limit(5000),

        client
          .from('payroll_payments')
          .select('id,status,payment_type')
          .limit(5000),

        client
          .from('employees')
          .select('id,full_name')
          .limit(1000),

        client
          .from('projects')
          .select('id,name')
          .limit(1000),

        client
          .from('payroll_accrual_cancellations')
          .select('accrual_id')
          .limit(10000)

      ]);

      for (const result of [
        accrualRes,
        allocationRes,
        paymentRes,
        employeeRes,
        projectRes,
        cancellationRes
      ]) {
        if (result.error) {
          throw result.error;
        }
      }

      // Формируем список отменённых начислений.

      const cancelledIds = new Set(
        (cancellationRes.data || []).map(
          item => item.accrual_id
        )
      );

      // Отменённые начисления исключаем полностью.

      const accruals = (
        accrualRes.data || []
      ).filter(
        accrual => !cancelledIds.has(accrual.id)
      );

      // Справочники.

      const payments = new Map(
        (paymentRes.data || []).map(
          payment => [payment.id, payment]
        )
      );

      const names = new Map(
        (employeeRes.data || []).map(
          employee => [
            employee.id,
            employee.full_name
          ]
        )
      );

      const projects = new Map(
        (projectRes.data || []).map(
          project => [
            project.id,
            project.name
          ]
        )
      );

      // Считаем только подтверждённые зарплатные
      // выплаты, привязанные к начислениям.

      const paidByAccrual = new Map();

      for (const allocation of allocationRes.data || []) {
        const payment = payments.get(
          allocation.payment_id
        );

        if (
          payment?.status !== 'confirmed' ||
          payment?.payment_type !== 'salary'
        ) {
          continue;
        }

        const previous = paidByAccrual.get(
          allocation.accrual_id
        ) || 0;

        paidByAccrual.set(
          allocation.accrual_id,
          previous + Number(allocation.amount || 0)
        );
      }

      let total = 0;
      let paid = 0;

      const byProject = new Map();

      // Формируем таблицу по сотрудникам.

      const rows = accruals.map(accrual => {
        const sum = Number(
          accrual.final_amount || 0
        );

        const paymentAmount = paidByAccrual.get(
          accrual.id
        ) || 0;

        const balance = sum - paymentAmount;

        total += sum;
        paid += paymentAmount;

        const projectName =
          projects.get(accrual.project_id) ||
          accrual.project_id ||
          'Без объекта';

        const previous = byProject.get(
          projectName
        ) || {
          total: 0,
          paid: 0
        };

        previous.total += sum;
        previous.paid += paymentAmount;

        byProject.set(
          projectName,
          previous
        );

        const employeeName =
          names.get(accrual.employee_id) ||
          accrual.employee_id ||
          'Неизвестный сотрудник';

        return `
          <tr>
            <td>${esc(employeeName)}</td>
            <td>${esc(projectName)}</td>
            <td>${esc(money(sum))}</td>
            <td>${esc(money(paymentAmount))}</td>
            <td>${esc(money(balance))}</td>
          </tr>
        `;
      });

      // Стили таблиц.

      const tableStyle = [
        'width:100%',
        'border-collapse:collapse',
        'font-size:13px',
        'text-align:left'
      ].join(';');

      const thStyle = [
        'padding:10px 8px',
        'border-bottom:1px solid #50545a'
      ].join(';');

      const tdStyle = [
        'padding:10px 8px',
        'border-bottom:1px solid #3b3f46'
      ].join(';');

      const header = columns => `
        <thead>
          <tr>
            ${columns.map(
              column => `
                <th style="${thStyle}">
                  ${esc(column)}
                </th>
              `
            ).join('')}
          </tr>
        </thead>
      `;

      const decorate = html => html.replace(
        /<td>/g,
        `<td style="${tdStyle}">`
      );

      // Таблица по объектам.

      const projectRows = [...byProject].map(
        ([name, values]) => `
          <tr>
            <td>${esc(name)}</td>
            <td>${esc(money(values.total))}</td>
            <td>${esc(money(values.paid))}</td>
            <td>${esc(
              money(values.total - values.paid)
            )}</td>
          </tr>
        `
      ).join('');

      // Итоговая панель.

      out.innerHTML = `
        <div style="
          display:grid;
          grid-template-columns:repeat(
            auto-fit,
            minmax(170px,1fr)
          );
          gap:12px;
          margin:16px 0
        ">
          ${[
            ['Утверждено', total],
            ['Выплачено по начислениям', paid],
            ['Осталось выплатить', total - paid]
          ].map(([name, value]) => `
            <div style="
              background:#30343a;
              padding:16px;
              border-radius:8px
            ">
              <div style="
                color:#a4a7ad;
                font-size:12px
              ">
                ${esc(name)}
              </div>

              <strong style="font-size:22px">
                ${esc(money(value))}
              </strong>
            </div>
          `).join('')}
        </div>

        <h3 style="font-size:15px;margin:18px 0 8px">
          По сотрудникам и объектам
        </h3>

        <div style="overflow-x:auto">
          <table style="${tableStyle}">
            ${header([
              'Сотрудник',
              'Объект',
              'Начислено',
              'Выплачено',
              'Долг'
            ])}

            <tbody>
              ${
                decorate(rows.join('')) ||
                '<tr><td colspan="5">Нет утверждённых начислений</td></tr>'
              }
            </tbody>
          </table>
        </div>

        <h3 style="font-size:15px;margin:18px 0 8px">
          Итого по объектам
        </h3>

        <div style="overflow-x:auto">
          <table style="${tableStyle}">
            ${header([
              'Объект',
              'Начислено',
              'Выплачено',
              'Долг'
            ])}

            <tbody>
              ${
                decorate(projectRows) ||
                '<tr><td colspan="4">Нет данных</td></tr>'
              }
            </tbody>
          </table>
        </div>

        <p style="
          color:#a4a7ad;
          font-size:12px;
          margin:14px 0 0
        ">
          Отменённые начисления не учитываются.
          Авансы без привязки к начислению не вычитаются.
          Это обзор обязательств, а не движение денег.
          Отображаются первые 1000 начислений и первые
          5000 выплат/привязок.
        </p>
      `;

      msg.textContent =
        `Загружено утверждённых начислений: ${accruals.length}. ` +
        `Исключено отменённых: ${cancelledIds.size}.`;

    } catch (error) {
      msg.textContent =
        'Не удалось загрузить зарплатные обязательства: ' +
        (error?.message || String(error));

      out.innerHTML = '';

      console.error(
        'Finance Payroll Obligations:',
        error
      );

    } finally {
      busy = false;
    }
  }

  function init() {
    if (!mount()) return;

    load();
  }

  if (document.readyState === 'loading') {
    document.addEventListener(
      'DOMContentLoaded',
      init
    );
  } else {
    init();
  }

})();
