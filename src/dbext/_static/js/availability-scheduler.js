/**
 * <availability-scheduler>
 * Web component form-associated para configurar horarios de disponibilidad semanal.
 *
 * Estructura de datos (propiedad `.value`):
 * {
 *   monday: { available: true, slots: [{start:"09:00:00", end:"13:00:00"}, ...] },
 *   tuesday: { available: false, slots: [] },
 *   ... (7 días)
 * }
 * - available: default true.
 * - slots vacío/nulo + available:true  => todo el día disponible.
 * - Los rangos nunca se traslapan (invariante garantizada internamente).
 *
 * Atributos:
 *   min-time="06:00:00"      límite inferior de la franja visible en modo grid (default 00:00:00)
 *   max-time="22:00:00"      límite superior de la franja visible en modo grid (default 23:59:59)
 *   step-minutes="30"        granularidad de celdas en modo grid (default 30)
 *   week-start="monday"      "monday" | "sunday" (default "monday")
 *   locale="es"              "es" | "en" (default "es")
 *   value='{"monday":...}'   valor inicial (JSON string), opcional
 *   name="horario"           nombre para envío en <form>
 *   readonly                 visible pero no editable
 *   disabled                 deshabilitado y excluido del envío de formulario
 *
 * Propiedades JS:
 *   el.value                 get/set del objeto completo (setter normaliza y no dispara eventos)
 *
 * Métodos:
 *   el.copyDayToAll(day)     copia {available, slots} de `day` a los otros 6 días
 *   el.setView('grid'|'inputs')
 *   el.reset()
 *   el.validate()            -> { valid: boolean, errors: [{day, message}] }
 *
 * Eventos:
 *   'change'      detail: { value }              — cualquier edición del usuario
 *   'day-change'  detail: { day, value }          — edición granular de un día
 *   'invalid-slot' detail: { day, reason }        — intento de rango inválido/traslapado
 */

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

const LOCALES = {
  es: {
    days: { monday: 'Lunes', tuesday: 'Martes', wednesday: 'Miércoles', thursday: 'Jueves', friday: 'Viernes', saturday: 'Sábado', sunday: 'Domingo' },
    daysShort: { monday: 'Lun', tuesday: 'Mar', wednesday: 'Mié', thursday: 'Jue', friday: 'Vie', saturday: 'Sáb', sunday: 'Dom' },
    available: 'Disponible',
    notAvailable: 'No disponible',
    allDay: 'Todo el día',
    addRange: 'Agregar rango',
    remove: 'Quitar',
    copyToAll: 'Aplicar a todos los días',
    viewGrid: 'Cuadrícula',
    viewInputs: 'Horas',
    overlapError: 'Este rango se traslapa con otro ya definido',
    invalidRangeError: 'La hora de inicio debe ser menor que la de fin',
    noRoomError: 'No hay más espacio disponible en este día',
    from: 'Desde',
    to: 'Hasta',
  },
  en: {
    days: { monday: 'Monday', tuesday: 'Tuesday', wednesday: 'Wednesday', thursday: 'Thursday', friday: 'Friday', saturday: 'Saturday', sunday: 'Sunday' },
    daysShort: { monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed', thursday: 'Thu', friday: 'Fri', saturday: 'Sat', sunday: 'Sun' },
    available: 'Available',
    notAvailable: 'Not available',
    allDay: 'All day',
    addRange: 'Add range',
    remove: 'Remove',
    copyToAll: 'Apply to all days',
    viewGrid: 'Grid',
    viewInputs: 'Hours',
    overlapError: 'This range overlaps another one already set',
    invalidRangeError: 'Start time must be before end time',
    noRoomError: 'No more room available on this day',
    from: 'From',
    to: 'To',
  },
};

// ---------- helpers puros de tiempo ----------
function toSec(t) {
  if (typeof t !== 'string') return 0;
  const parts = t.split(':').map(Number);
  const [h = 0, m = 0, s = 0] = parts;
  return h * 3600 + m * 60 + s;
}
function toTime(total) {
  total = Math.max(0, Math.min(86399, Math.round(total)));
  const h = String(Math.floor(total / 3600)).padStart(2, '0');
  const m = String(Math.floor((total % 3600) / 60)).padStart(2, '0');
  const s = String(total % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
}
function mergeSlots(slots) {
  const valid = (slots || [])
    .filter(s => s && typeof s.start === 'string' && typeof s.end === 'string')
    .map(s => ({ start: toSec(s.start), end: toSec(s.end) }))
    .filter(s => s.end > s.start)
    .sort((a, b) => a.start - b.start);
  const out = [];
  for (const s of valid) {
    const last = out[out.length - 1];
    if (last && s.start <= last.end) {
      last.end = Math.max(last.end, s.end);
    } else {
      out.push({ ...s });
    }
  }
  return out.map(s => ({ start: toTime(s.start), end: toTime(s.end) }));
}
function rangesOverlap(a, b) {
  return toSec(a.start) < toSec(b.end) && toSec(b.start) < toSec(a.end);
}
function validateSlotEdit(existingSlots, excludeIndex, candidate) {
  if (toSec(candidate.start) >= toSec(candidate.end)) return { valid: false, reason: 'invalid-range' };
  for (let i = 0; i < existingSlots.length; i++) {
    if (i === excludeIndex) continue;
    if (rangesOverlap(existingSlots[i], candidate)) return { valid: false, reason: 'overlap' };
  }
  return { valid: true };
}
function findFirstGap(existingSlots, minSec, maxSec, durationSec) {
  const sorted = [...existingSlots].sort((a, b) => toSec(a.start) - toSec(b.start));
  let cursor = minSec;
  for (const s of sorted) {
    const s0 = toSec(s.start), s1 = toSec(s.end);
    if (s0 - cursor >= durationSec) return { start: cursor, end: Math.min(cursor + durationSec, s0) };
    cursor = Math.max(cursor, s1);
  }
  if (maxSec - cursor >= durationSec) return { start: cursor, end: Math.min(cursor + durationSec, maxSec) };
  if (maxSec - cursor > 0) return { start: cursor, end: maxSec };
  return null;
}
function defaultDay() {
  return { available: true, slots: [] };
}
function normalizeDay(raw) {
  const d = raw && typeof raw === 'object' ? raw : {};
  const available = d.available === false ? false : true;
  const slots = available ? mergeSlots(Array.isArray(d.slots) ? d.slots : []) : [];
  return { available, slots };
}
function normalizeValue(raw) {
  const src = raw && typeof raw === 'object' ? raw : {};
  const out = {};
  for (const day of DAYS) out[day] = normalizeDay(src[day]);
  return out;
}
function cloneValue(v) {
  const out = {};
  for (const day of DAYS) out[day] = { available: v[day].available, slots: v[day].slots.map(s => ({ ...s })) };
  return out;
}

const TEMPLATE_STYLES = `
:host {
  --as-bg: #ffffff;
  --as-surface: #F5F4F1;
  --as-ink: #1F2430;
  --as-muted: #8B8A85;
  --as-line: #E3E0D8;
  --as-accent: #2F6F5E;
  --as-accent-soft: #DCEAE5;
  --as-accent-strong: #21584A;
  --as-off: #EDEBE6;
  --as-danger: #B3452F;
  --as-danger-soft: #F5E3DD;
  --as-radius: 10px;
  --as-font-ui: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  --as-font-mono: ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace;
  display: block;
  font-family: var(--as-font-ui);
  color: var(--as-ink);
  background: var(--as-bg);
  border: 1px solid var(--as-line);
  border-radius: calc(var(--as-radius) + 4px);
  padding: 18px;
  box-sizing: border-box;
}
:host([hidden]) { display: none; }
* { box-sizing: border-box; }

.toolbar {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  margin-bottom: 14px;
}
.segmented {
  display: inline-flex;
  background: var(--as-surface);
  border: 1px solid var(--as-line);
  border-radius: 999px;
  padding: 3px;
  gap: 2px;
}
.segmented button {
  border: none;
  background: transparent;
  font-family: var(--as-font-ui);
  font-size: 12.5px;
  font-weight: 600;
  letter-spacing: 0.02em;
  padding: 5px 12px;
  border-radius: 999px;
  cursor: pointer;
  color: var(--as-muted);
}
.segmented button[aria-pressed="true"] {
  background: var(--as-ink);
  color: #fff;
}
:host([disabled]) .segmented button,
:host([readonly]) .segmented button { pointer-events: none; opacity: .6; }

.day-row {
  border-top: 1px solid var(--as-line);
  padding: 14px 0;
  display: grid;
  grid-template-columns: 108px auto 1fr;
  gap: 10px 16px;
  align-items: start;
}
.day-row:last-child { padding-bottom: 2px; }

.day-label {
  font-family: var(--as-font-mono);
  font-size: 12.5px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--as-ink);
  padding-top: 6px;
}

.day-controls {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.switch {
  position: relative;
  width: 34px;
  height: 20px;
  border-radius: 999px;
  background: var(--as-off);
  border: 1px solid var(--as-line);
  cursor: pointer;
  flex: none;
  padding: 0;
}
.switch::after {
  content: "";
  position: absolute;
  top: 1px; left: 1px;
  width: 16px; height: 16px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 2px rgba(0,0,0,.25);
  transition: transform .15s ease;
}
.switch[aria-checked="true"] { background: var(--as-accent); border-color: var(--as-accent); }
.switch[aria-checked="true"]::after { transform: translateX(14px); }

.switch-label {
  font-size: 12.5px;
  color: var(--as-muted);
  min-width: 82px;
}

.check {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12.5px;
  color: var(--as-muted);
  cursor: pointer;
  user-select: none;
}
.check input { accent-color: var(--as-accent); width: 14px; height: 14px; }

.icon-btn {
  border: 1px solid var(--as-line);
  background: var(--as-bg);
  color: var(--as-muted);
  border-radius: 6px;
  font-size: 11.5px;
  padding: 4px 8px;
  cursor: pointer;
  font-family: var(--as-font-ui);
}
.icon-btn:hover { color: var(--as-ink); border-color: var(--as-muted); }

.day-content { min-height: 30px; }
.day-content.is-off {
  color: var(--as-muted);
  font-size: 12.5px;
  padding-top: 6px;
}

/* --- grid view: tira de horario tipo regla --- */
.strip { width: 100%; }
.strip-track {
  display: flex;
  border: 1px solid var(--as-line);
  border-radius: 6px;
  overflow: hidden;
  height: 26px;
  background: var(--as-off);
}
.cell {
  flex: 1 0 0;
  border: none;
  border-right: 1px solid rgba(255,255,255,.6);
  background: transparent;
  cursor: pointer;
  padding: 0;
  min-width: 2px;
}
.cell:last-child { border-right: none; }
.cell[aria-pressed="true"] { background: var(--as-accent); }
.cell:focus-visible { outline: 2px solid var(--as-accent-strong); outline-offset: -2px; }
.strip-ticks {
  display: flex;
  justify-content: space-between;
  margin-top: 4px;
  font-family: var(--as-font-mono);
  font-size: 10.5px;
  color: var(--as-muted);
}

/* --- inputs view --- */
.ranges { display: flex; flex-direction: column; gap: 6px; }
.range-row { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.range-row label { font-size: 11px; color: var(--as-muted); }
.range-row input[type="time"] {
  font-family: var(--as-font-mono);
  font-size: 13px;
  border: 1px solid var(--as-line);
  border-radius: 6px;
  padding: 3px 6px;
  background: var(--as-bg);
  color: var(--as-ink);
}
.range-row input[type="time"].has-error { border-color: var(--as-danger); background: var(--as-danger-soft); }
.range-row .remove {
  border: none;
  background: transparent;
  color: var(--as-muted);
  cursor: pointer;
  font-size: 15px;
  line-height: 1;
  padding: 2px 4px;
}
.range-row .remove:hover { color: var(--as-danger); }
.add-range {
  align-self: flex-start;
  border: 1px dashed var(--as-line);
  background: transparent;
  color: var(--as-accent-strong);
  font-family: var(--as-font-ui);
  font-size: 12px;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 6px;
  cursor: pointer;
  margin-top: 2px;
}
.add-range:hover { border-color: var(--as-accent); background: var(--as-accent-soft); }
.slot-error {
  font-size: 11.5px;
  color: var(--as-danger);
}

:host([readonly]) .cell,
:host([readonly]) .switch,
:host([readonly]) .add-range,
:host([readonly]) .remove,
:host([readonly]) .icon-btn,
:host([readonly]) input[type="time"] { pointer-events: none; opacity: .75; }

:host([disabled]) { opacity: .55; pointer-events: none; }
`;

class AvailabilityScheduler extends HTMLElement {
  static formAssociated = true;

  static get observedAttributes() {
    return ['min-time', 'max-time', 'step-minutes', 'week-start', 'locale', 'readonly', 'disabled', 'value'];
  }

  constructor() {
    super();
    this._internals = this.attachInternals();
    this._value = normalizeValue(null);
    this._view = 'grid';
    this._valueAttrConsumed = false;
    this._drag = null;

    this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = `<style>${TEMPLATE_STYLES}</style><div class="toolbar"></div><div class="days"></div>`;
    this._toolbarEl = this.shadowRoot.querySelector('.toolbar');
    this._daysEl = this.shadowRoot.querySelector('.days');

    this.shadowRoot.addEventListener('click', this._onClick.bind(this));
    this.shadowRoot.addEventListener('change', this._onInputChange.bind(this));
    this.shadowRoot.addEventListener('pointerdown', this._onPointerDown.bind(this));
  }

  // ---------- ciclo de vida ----------
  connectedCallback() {
    if (!this._valueAttrConsumed && this.hasAttribute('value')) {
      try {
        this._value = normalizeValue(JSON.parse(this.getAttribute('value')));
      } catch (e) { /* ignora JSON inválido, se queda el default */ }
      this._valueAttrConsumed = true;
    }
    this._syncFormValue();
    this._render();
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (name === 'value') {
      if (!this._valueAttrConsumed) return; // se procesa una sola vez en connectedCallback
      return;
    }
    if (this._daysEl) this._render();
  }

  formResetCallback() {
    this._value = this.hasAttribute('value')
      ? normalizeValue(this._safeParse(this.getAttribute('value')))
      : normalizeValue(null);
    this._syncFormValue();
    this._render();
  }

  formDisabledCallback(disabled) {
    if (disabled) this.setAttribute('disabled', '');
    else this.removeAttribute('disabled');
  }

  _safeParse(str) { try { return JSON.parse(str); } catch { return null; } }

  // ---------- API pública ----------
  get value() { return cloneValue(this._value); }
  set value(v) {
    this._value = normalizeValue(v);
    this._syncFormValue();
    this._render();
  }

  get name() { return this.getAttribute('name') || ''; }
  set name(v) { this.setAttribute('name', v); }

  get form() { return this._internals.form; }
  get validity() { return this._internals.validity; }
  get willValidate() { return this._internals.willValidate; }
  checkValidity() { return this._internals.checkValidity(); }
  reportValidity() { return this._internals.reportValidity(); }

  copyDayToAll(day) {
    if (!DAYS.includes(day)) throw new Error(`Día inválido: ${day}`);
    const source = this._value[day];
    for (const d of DAYS) {
      if (d === day) continue;
      this._value[d] = { available: source.available, slots: source.slots.map(s => ({ ...s })) };
    }
    this._syncFormValue();
    this._render();
    this._emitChange();
  }

  setView(mode) {
    if (mode !== 'grid' && mode !== 'inputs') return;
    this._view = mode;
    this._render();
  }

  reset() {
    this._value = normalizeValue(null);
    this._syncFormValue();
    this._render();
    this._emitChange();
  }

  validate() {
    const errors = [];
    for (const day of DAYS) {
      const slots = this._value[day].slots;
      for (let i = 0; i < slots.length; i++) {
        if (toSec(slots[i].start) >= toSec(slots[i].end)) errors.push({ day, message: this._t().invalidRangeError });
        for (let j = i + 1; j < slots.length; j++) {
          if (rangesOverlap(slots[i], slots[j])) errors.push({ day, message: this._t().overlapError });
        }
      }
    }
    return { valid: errors.length === 0, errors };
  }

  // ---------- helpers internos ----------
  _t() { return LOCALES[this.getAttribute('locale')] || LOCALES.es; }
  _minSec() { return this.hasAttribute('min-time') ? toSec(this.getAttribute('min-time')) : 0; }
  _maxSec() { return this.hasAttribute('max-time') ? toSec(this.getAttribute('max-time')) : 86399; }
  _stepSec() { return (parseInt(this.getAttribute('step-minutes'), 10) || 30) * 60; }
  _orderedDays() {
    if (this.getAttribute('week-start') === 'sunday') {
      return ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    }
    return DAYS;
  }

  _syncFormValue() {
    this._internals.setFormValue(JSON.stringify(this._value));
  }

  _emitChange() {
    this.dispatchEvent(new CustomEvent('change', { bubbles: true, composed: true, detail: { value: this.value } }));
  }
  _emitDayChange(day) {
    this.dispatchEvent(new CustomEvent('day-change', { bubbles: true, composed: true, detail: { day, value: { ...this._value[day], slots: this._value[day].slots.map(s => ({ ...s })) } } }));
  }
  _emitInvalid(day, reason) {
    this.dispatchEvent(new CustomEvent('invalid-slot', { bubbles: true, composed: true, detail: { day, reason } }));
  }

  // ---------- construcción de celdas para modo grid ----------
  _buildCells(day) {
    const min = this._minSec(), max = this._maxSec(), step = this._stepSec();
    const cells = [];
    for (let t = min; t < max; t += step) {
      const end = Math.min(t + step, max);
      cells.push({ start: t, end });
    }
    const slots = this._value[day].slots;
    return cells.map(c => ({
      ...c,
      on: slots.some(s => toSec(s.start) <= c.start && toSec(s.end) >= c.end),
    }));
  }

  _cellsToSlots(day, cellsOnState) {
    // cellsOnState: array de {start, end, on} ya con el estado deseado tras el drag
    const raw = cellsOnState.filter(c => c.on).map(c => ({ start: toTime(c.start), end: toTime(c.end) }));
    return mergeSlots(raw);
  }

  // ---------- render ----------
  _render() {
    const t = this._t();
    this._toolbarEl.innerHTML = `
      <div class="segmented" role="group" aria-label="Vista">
        <button type="button" data-action="view" data-view="grid" aria-pressed="${this._view === 'grid'}">${t.viewGrid}</button>
        <button type="button" data-action="view" data-view="inputs" aria-pressed="${this._view === 'inputs'}">${t.viewInputs}</button>
      </div>`;

    const days = this._orderedDays();
    this._daysEl.innerHTML = days.map(day => this._renderDayRow(day)).join('');
  }

  _renderDayRow(day) {
    const t = this._t();
    const data = this._value[day];
    const isAllDay = data.available && data.slots.length === 0;

    let content;
    if (!data.available) {
      content = `<div class="day-content is-off">${t.notAvailable}</div>`;
    } else if (isAllDay) {
      content = `<div class="day-content"><span style="font-size:12.5px;color:var(--as-muted);">${t.allDay}</span></div>`;
    } else if (this._view === 'grid') {
      content = `<div class="day-content">${this._renderStrip(day)}</div>`;
    } else {
      content = `<div class="day-content">${this._renderRanges(day)}</div>`;
    }

    return `
      <div class="day-row" data-day="${day}">
        <div class="day-label">${t.days[day]}</div>
        <div class="day-controls">
          <button type="button" class="switch" data-action="toggle-available" role="switch" aria-checked="${data.available}"></button>
          <span class="switch-label">${data.available ? t.available : t.notAvailable}</span>
          ${data.available ? `
            <label class="check">
              <input type="checkbox" data-action="toggle-allday" ${isAllDay ? 'checked' : ''}/>
              ${t.allDay}
            </label>
            <button type="button" class="icon-btn" data-action="copy-all" title="${t.copyToAll}">${t.copyToAll}</button>
          ` : ''}
        </div>
        ${content}
      </div>`;
  }

  _renderStrip(day) {
    const t = this._t();
    const cells = this._buildCells(day);
    const min = this._minSec(), max = this._maxSec();
    const cellButtons = cells.map((c, i) =>
      `<button type="button" class="cell" data-idx="${i}" aria-pressed="${c.on}" aria-label="${toTime(c.start)}–${toTime(c.end)}"></button>`
    ).join('');

    // ticks cada hora dentro del rango visible
    const ticks = [];
    for (let h = Math.ceil(min / 3600); h <= Math.floor(max / 3600); h++) ticks.push(`${String(h).padStart(2, '0')}:00`);

    return `
      <div class="strip" data-day="${day}">
        <div class="strip-track">${cellButtons}</div>
        <div class="strip-ticks">${ticks.map(x => `<span>${x}</span>`).join('')}</div>
      </div>`;
  }

  _renderRanges(day) {
    const t = this._t();
    const slots = this._value[day].slots;
    const rows = slots.map((s, i) => `
      <div class="range-row" data-idx="${i}">
        <label>${t.from}</label>
        <input type="time" step="1" value="${s.start}" data-field="start" data-idx="${i}" />
        <label>${t.to}</label>
        <input type="time" step="1" value="${s.end}" data-field="end" data-idx="${i}" />
        <button type="button" class="remove" data-action="remove-range" data-idx="${i}" title="${t.remove}">×</button>
      </div>`).join('');

    return `
      <div class="ranges" data-day="${day}">
        ${rows}
        <button type="button" class="add-range" data-action="add-range">+ ${t.addRange}</button>
      </div>`;
  }

  // ---------- eventos: click ----------
  _onClick(e) {
    if (this.disabled || this.readOnly) return;
    const actionEl = e.target.closest('[data-action]');
    if (!actionEl) return;
    const action = actionEl.dataset.action;

    if (action === 'view') {
      this.setView(actionEl.dataset.view);
      return;
    }

    const rowEl = e.target.closest('.day-row');
    const day = rowEl && rowEl.dataset.day;

    if (action === 'toggle-available') {
      const current = this._value[day];
      this._value[day] = { available: !current.available, slots: !current.available ? current.slots : [] };
      this._syncFormValue();
      this._render();
      this._emitDayChange(day);
      this._emitChange();
      return;
    }

    if (action === 'copy-all') {
      this.copyDayToAll(day);
      return;
    }

    if (action === 'add-range') {
      const min = this._minSec(), max = this._maxSec(), step = this._stepSec();
      const gap = findFirstGap(this._value[day].slots, min, max, step);
      if (!gap) { this._emitInvalid(day, 'no-room'); this._flashError(rowEl, this._t().noRoomError); return; }
      this._value[day].slots = mergeSlots([...this._value[day].slots, { start: toTime(gap.start), end: toTime(gap.end) }]);
      this._syncFormValue();
      this._render();
      this._emitDayChange(day);
      this._emitChange();
      return;
    }

    if (action === 'remove-range') {
      const idx = parseInt(actionEl.dataset.idx, 10);
      this._value[day].slots.splice(idx, 1);
      this._syncFormValue();
      this._render();
      this._emitDayChange(day);
      this._emitChange();
      return;
    }
  }

  _flashError(rowEl, message) {
    if (!rowEl) return;
    let el = rowEl.querySelector('.slot-error');
    if (!el) {
      el = document.createElement('div');
      el.className = 'slot-error';
      rowEl.appendChild(el);
    }
    el.textContent = message;
    clearTimeout(this._errorTimer);
    this._errorTimer = setTimeout(() => el.remove(), 2500);
  }

  // ---------- eventos: checkbox "todo el día" e inputs de hora ----------
  _onInputChange(e) {
    if (this.disabled || this.readOnly) return;
    const target = e.target;
    const rowEl = target.closest('.day-row');
    if (!rowEl) return;
    const day = rowEl.dataset.day;

    if (target.matches('[data-action="toggle-allday"]')) {
      if (target.checked) {
        this._value[day].slots = [];
      } else {
        const min = this._minSec(), max = this._maxSec();
        this._value[day].slots = [{ start: toTime(min), end: toTime(max) }];
      }
      this._syncFormValue();
      this._render();
      this._emitDayChange(day);
      this._emitChange();
      return;
    }

    if (target.matches('input[type="time"][data-field]')) {
      const idx = parseInt(target.dataset.idx, 10);
      const field = target.dataset.field;
      const current = this._value[day].slots[idx];
      const candidate = { ...current, [field]: target.value.length === 5 ? target.value + ':00' : target.value };
      const result = validateSlotEdit(this._value[day].slots, idx, candidate);
      if (!result.valid) {
        target.classList.add('has-error');
        this._emitInvalid(day, result.reason);
        this._flashError(rowEl, result.reason === 'overlap' ? this._t().overlapError : this._t().invalidRangeError);
        target.value = current[field].slice(0, 5);
        return;
      }
      target.classList.remove('has-error');
      this._value[day].slots[idx] = candidate;
      this._value[day].slots = mergeSlots(this._value[day].slots);
      this._syncFormValue();
      this._render();
      this._emitDayChange(day);
      this._emitChange();
    }
  }

  // ---------- pintado en modo grid (pointer drag) ----------
  _onPointerDown(e) {
    if (this.disabled || this.readOnly) return;
    const cell = e.target.closest('.cell');
    if (!cell) return;
    const stripEl = cell.closest('.strip');
    const day = stripEl.dataset.day;
    const cells = this._buildCells(day);
    const startIdx = parseInt(cell.dataset.idx, 10);
    const paintTo = !cells[startIdx].on; // si estaba apagada, pintamos "on"; si estaba prendida, borramos

    this._drag = { day, cells, paintTo, minIdx: startIdx, maxIdx: startIdx };
    this._paintRange(stripEl, this._drag);

    const onMove = (ev) => {
      const overCell = this.shadowRoot.elementsFromPoint
        ? this.shadowRoot.elementsFromPoint(ev.clientX, ev.clientY).find(el => el.classList && el.classList.contains('cell'))
        : document.elementFromPoint(ev.clientX, ev.clientY);
      if (!overCell || !overCell.dataset) return;
      const idx = parseInt(overCell.dataset.idx, 10);
      if (Number.isNaN(idx)) return;
      this._drag.minIdx = Math.min(this._drag.minIdx, idx);
      this._drag.maxIdx = Math.max(this._drag.maxIdx, idx);
      this._paintRange(stripEl, this._drag);
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      this._commitDrag();
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }

  _paintRange(stripEl, drag) {
    const buttons = stripEl.querySelectorAll('.cell');
    buttons.forEach((btn, i) => {
      if (i >= drag.minIdx && i <= drag.maxIdx) {
        btn.setAttribute('aria-pressed', String(drag.paintTo));
      }
    });
  }

  _commitDrag() {
    if (!this._drag) return;
    const { day, cells, paintTo, minIdx, maxIdx } = this._drag;
    const nextCells = cells.map((c, i) => ({ ...c, on: (i >= minIdx && i <= maxIdx) ? paintTo : c.on }));
    this._value[day].slots = this._cellsToSlots(day, nextCells);
    this._drag = null;
    this._syncFormValue();
    this._render();
    this._emitDayChange(day);
    this._emitChange();
  }

  // ---------- reflejo de atributos booleanos como propiedades ----------
  get readOnly() { return this.hasAttribute('readonly'); }
  set readOnly(v) { v ? this.setAttribute('readonly', '') : this.removeAttribute('readonly'); }
  get disabled() { return this.hasAttribute('disabled'); }
  set disabled(v) { v ? this.setAttribute('disabled', '') : this.removeAttribute('disabled'); }
}

customElements.define('availability-scheduler', AvailabilityScheduler);

// Expuesto en window por si necesitas referenciar la clase directamente
// (por ejemplo: window.AvailabilityScheduler === document.querySelector('availability-scheduler').constructor)
window.AvailabilityScheduler = AvailabilityScheduler;
