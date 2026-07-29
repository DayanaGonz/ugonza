const COMPANY = {
  name: "UGONZA Construcciones S.A.",
  representative: "Uriel González Madrigal",
  id: "3-101-664353",
  phone: "8313-3099",
  email: "ugonzaconstruccionessa@gmail.com",
  location: "San José, Costa Rica",
};

const TYPES = ["Material", "Mano de obra", "Material + mano de obra", "Equipo", "Subcontrato", "Otro"];
const CATEGORIES = ["Obra gris", "Eléctrico", "Gypsum", "Pintura", "Vidrio", "Aluminio", "Demolición", "Cerramientos", "Estructura metálica", "Acabados", "Transporte", "Alquiler de equipo", "Otro"];
const UNITS = ["Global", "Unidad", "m²", "m.l.", "m³", "kg", "saco", "hora", "día", "noche", "servicio"];

const DEFAULT_OBSERVATIONS = "Todos los trabajos se ejecutarán de acuerdo con las buenas prácticas de construcción y normas aplicables.\nCualquier trabajo adicional no contemplado será cotizado por separado.\nSe requiere acceso al sitio de trabajo y condiciones mínimas de seguridad.\nEste presupuesto tiene una validez de 15 días naturales.";
const DEFAULT_TERMS = "Este presupuesto tiene una validez de 15 días naturales, salvo indicación diferente.\nLos precios indicados aplican únicamente para el alcance descrito en este documento.\nCualquier trabajo adicional, cambio de medidas, modificación de diseño, cambio de materiales o condición no prevista será cotizado por separado.\nEl inicio de los trabajos queda sujeto a la aprobación del presupuesto y al pago inicial acordado.\nLos tiempos de ejecución pueden variar por disponibilidad de materiales, condiciones del sitio, permisos, clima, accesos o coordinación con terceros.\nNo se incluyen permisos, trámites, planos, estudios técnicos, inspecciones externas ni trabajos no descritos expresamente en este presupuesto, salvo que se indique lo contrario.\nLos precios incluyen o no incluyen IVA según se indique en el resumen del presupuesto.\nLa garantía aplica únicamente sobre los trabajos ejecutados por UGONZA Construcciones S.A. y no cubre daños ocasionados por terceros, mal uso, humedad, filtraciones existentes, movimientos estructurales o condiciones ajenas al trabajo contratado.";
const DEFAULT_PAYMENT = "50% de adelanto para inicio de trabajos y 50% contra entrega final.";

const seedClients = [
  "Asociación Solidarista de Colaboradores de DHL Express Logistics & Afines",
  "Cadenas de Farmacias Dokka S.A.",
  "Ciento Ochenta Grados Arquitectura",
  "Elevadores Schindler S.A.",
  "Elvatron S.A.",
  "Giovanni Rodríguez Jiménez",
  "Hospital San José S.A.",
  "Melania Golcher Echeverría",
].map((name, index) => ({
  id: crypto.randomUUID(),
  nombre: name,
  razonSocial: name,
  cedula: index === 3 ? "3-101-123456" : "",
  contacto: index === 3 ? "Departamento de Proyectos" : "",
  telefono: index === 3 ? "2222-3333" : "",
  correo: index === 3 ? "compras@schindler.com" : "",
  provincia: "",
  canton: "",
  distrito: "",
  direccion: "",
  observaciones: "",
}));

const storage = {
  load() {
    const saved = localStorage.getItem("ugonzaPresupuestos");
    if (saved) return hydrateState(JSON.parse(saved));
    return {
      settings: defaultSettings(),
      clients: seedClients,
      quotes: [],
      currentQuoteId: null,
    };
  },
  save() {
    localStorage.setItem("ugonzaPresupuestos", JSON.stringify(state));
  },
};

let state = storage.load();
let currentQuote = null;

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));
const form = $("#quoteForm");
const clientForm = $("#clientForm");
const settingsForm = $("#settingsForm");

function defaultSettings() {
  return {
    prefix: "UG",
    nextNumber: 1,
    defaultValidity: 15,
    defaultTax: 13,
    exchangeRate: 500,
    bccrEmail: "",
    bccrToken: "",
    footerPhrase: "Construimos confianza, entregamos calidad.",
  };
}

function hydrateState(saved) {
  const settings = { ...defaultSettings(), ...(saved.settings || {}) };
  return {
    ...saved,
    settings,
    clients: saved.clients || seedClients,
    quotes: (saved.quotes || []).map((quote) => ({
      ...quote,
      tipoCambio: quote.tipoCambio || settings.exchangeRate,
      partidas: (quote.partidas || []).map((line) => ({ moneda: quote.moneda || "CRC", ...line })),
    })),
  };
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function addDays(dateString, days) {
  const date = new Date(`${dateString}T12:00:00`);
  date.setDate(date.getDate() + Number(days || 0));
  return date.toISOString().slice(0, 10);
}

function nextConsecutivo() {
  return `${state.settings.prefix}-${String(state.settings.nextNumber).padStart(6, "0")}`;
}

function createLine(partial = {}) {
  return {
    id: crypto.randomUUID(),
    tipo: "Material + mano de obra",
    categoria: "Acabados",
    descripcion: "",
    unidad: "Global",
    cantidad: 1,
    moneda: currentQuote?.moneda || "CRC",
    precioUnitario: 0,
    ivaAplica: "config",
    observacion: "",
    ...partial,
  };
}

function emptyQuote() {
  const fecha = today();
  return {
    id: crypto.randomUUID(),
    consecutivo: nextConsecutivo(),
    fecha,
    validezDias: state.settings.defaultValidity,
    validoHasta: addDays(fecha, state.settings.defaultValidity),
    clienteId: "",
    clienteManual: {},
    proyecto: "",
    lugarProyecto: "",
    descripcionGeneral: "",
    moneda: "CRC",
    tipoCambio: state.settings.exchangeRate,
    condicionPago: "Contado",
    ivaModo: "total",
    ivaPorcentaje: state.settings.defaultTax,
    descuentoTipo: "none",
    descuentoValor: 0,
    observaciones: DEFAULT_OBSERVATIONS,
    terminos: DEFAULT_TERMS,
    formaPago: DEFAULT_PAYMENT,
    estado: "Borrador",
    partidas: [createLine()],
    creadoEn: new Date().toISOString(),
    actualizadoEn: new Date().toISOString(),
  };
}

function boot() {
  currentQuote = state.quotes.find((q) => q.id === state.currentQuoteId) || emptyQuote();
  bindEvents();
  renderAll();
  showView(state.quotes.length ? "dashboard" : "editor");
}

function bindEvents() {
  $$(".nav-tab").forEach((button) => button.addEventListener("click", () => showView(button.dataset.view)));
  $("#newQuoteBtn").addEventListener("click", () => newQuote());
  $("#saveBtn").addEventListener("click", () => saveQuote(true));
  $("#downloadBtn").addEventListener("click", () => downloadCurrentPdf());
  $("#downloadPreviewBtn").addEventListener("click", () => downloadCurrentPdf());
  $("#fetchExchangeBtn").addEventListener("click", () => updateExchangeFromBccr());
  $("#addLineBtn").addEventListener("click", () => {
    currentQuote.partidas.push(createLine());
    renderLineItems();
    updateFromForm();
  });
  $("#searchQuotes").addEventListener("input", renderQuotesTable);
  $("#clientSelect").addEventListener("change", handleClientSelect);
  $("#addClientFromQuote").addEventListener("click", saveClientFromQuote);
  $("#newClientBtn").addEventListener("click", clearClientForm);
  $("#clearClientBtn").addEventListener("click", clearClientForm);
  form.addEventListener("input", () => updateFromForm());
  form.addEventListener("change", (event) => {
    if (event.target.name === "fecha" || event.target.name === "validezDias") {
      form.elements.validoHasta.value = addDays(form.elements.fecha.value, form.elements.validezDias.value);
    }
    if (event.target.name === "moneda" || event.target.name === "tipoCambio") {
      updateFromForm(false);
      renderLineItems();
    }
    updateFromForm();
  });
  clientForm.addEventListener("submit", (event) => {
    event.preventDefault();
    saveClient();
  });
  settingsForm.addEventListener("submit", (event) => {
    event.preventDefault();
    saveSettings();
  });
}

function renderAll() {
  renderClientSelect();
  renderQuoteForm();
  renderLineItems();
  renderQuotesTable();
  renderClientsList();
  renderSettings();
  updateFromForm(false);
}

function showView(name) {
  $$(".view").forEach((view) => view.classList.remove("active"));
  $(`#${name}View`).classList.add("active");
  $$(".nav-tab").forEach((tab) => tab.classList.toggle("active", tab.dataset.view === name));
  if (name === "preview") {
    updateFromForm(false);
    renderPreview();
  }
}

function renderQuoteForm() {
  const q = currentQuote;
  const map = {
    consecutivo: q.consecutivo,
    fecha: q.fecha,
    validoHasta: q.validoHasta,
    validezDias: q.validezDias,
    condicionPago: q.condicionPago,
    estado: q.estado,
    moneda: q.moneda,
    tipoCambio: q.tipoCambio,
    ivaModo: q.ivaModo,
    ivaPorcentaje: q.ivaPorcentaje,
    descuentoTipo: q.descuentoTipo,
    descuentoValor: q.descuentoValor,
    clienteId: q.clienteId || "",
    clienteNombre: q.clienteManual.nombre || "",
    clienteRazonSocial: q.clienteManual.razonSocial || "",
    clienteCedula: q.clienteManual.cedula || "",
    clienteContacto: q.clienteManual.contacto || "",
    clienteTelefono: q.clienteManual.telefono || "",
    clienteCorreo: q.clienteManual.correo || "",
    clienteDireccion: q.clienteManual.direccion || "",
    proyecto: q.proyecto,
    lugarProyecto: q.lugarProyecto,
    descripcionGeneral: q.descripcionGeneral,
    observaciones: q.observaciones,
    terminos: q.terminos,
    formaPago: q.formaPago,
  };
  Object.entries(map).forEach(([name, value]) => {
    if (form.elements[name]) form.elements[name].value = value ?? "";
  });
}

function renderClientSelect() {
  const select = $("#clientSelect");
  select.innerHTML = `<option value="">Cliente nuevo / manual</option>` + state.clients
    .map((client) => `<option value="${client.id}">${escapeHtml(client.nombre)}</option>`)
    .join("");
}

function handleClientSelect() {
  const client = state.clients.find((item) => item.id === $("#clientSelect").value);
  if (!client) {
    updateFromForm();
    return;
  }
  form.elements.clienteNombre.value = client.nombre || "";
  form.elements.clienteRazonSocial.value = client.razonSocial || "";
  form.elements.clienteCedula.value = client.cedula || "";
  form.elements.clienteContacto.value = client.contacto || "";
  form.elements.clienteTelefono.value = client.telefono || "";
  form.elements.clienteCorreo.value = client.correo || "";
  form.elements.clienteDireccion.value = client.direccion || "";
  updateFromForm();
}

function renderLineItems() {
  $("#lineItems").innerHTML = currentQuote.partidas.map((line, index) => {
    line.moneda = line.moneda || currentQuote.moneda;
    const subtotal = convertMoney(Number(line.cantidad || 0) * Number(line.precioUnitario || 0), line.moneda, currentQuote.moneda, currentQuote.tipoCambio);
    return `
    <article class="line-card" data-id="${line.id}">
      <div class="line-card-head">
        <span class="line-number">${index + 1}</span>
      </div>
      <div class="line-grid">
        ${selectField("tipo", "Tipo", TYPES, line.tipo)}
        ${selectField("categoria", "Categoría", CATEGORIES, line.categoria)}
        <label class="description">Descripción
          <textarea data-field="descripcion" rows="3" required>${escapeHtml(line.descripcion)}</textarea>
        </label>
        ${selectField("unidad", "Unidad", UNITS, line.unidad)}
        <label>Moneda línea
          <select data-field="moneda">
            <option value="CRC"${line.moneda === "CRC" ? " selected" : ""}>Colones</option>
            <option value="USD"${line.moneda === "USD" ? " selected" : ""}>Dólares</option>
          </select>
        </label>
        <label>Cantidad
          <input data-field="cantidad" type="number" min="0.01" step="0.01" value="${line.cantidad}" required />
        </label>
        <label>Precio unitario
          <input data-field="precioUnitario" type="number" min="0" step="0.01" value="${line.precioUnitario}" required />
        </label>
        <label>IVA
          <select data-field="ivaAplica">
            <option value="config"${line.ivaAplica === "config" ? " selected" : ""}>Según config.</option>
            <option value="yes"${line.ivaAplica === "yes" ? " selected" : ""}>Sí</option>
            <option value="no"${line.ivaAplica === "no" ? " selected" : ""}>No</option>
          </select>
        </label>
        <label class="observation">Observación
          <input data-field="observacion" value="${escapeAttr(line.observacion)}" />
        </label>
        <div class="line-subtotal" data-subtotal="${line.id}">${formatMoney(subtotal, currentQuote.moneda)}</div>
      </div>
      <div class="line-actions">
        <button class="btn secondary small" type="button" data-action="insert-line" data-id="${line.id}">Agregar debajo</button>
        <button class="btn secondary small" type="button" data-action="duplicate-line" data-id="${line.id}">Duplicar</button>
        <button class="btn danger small" type="button" data-action="delete-line" data-id="${line.id}">Eliminar</button>
      </div>
    </article>
  `;
  }).join("");

  $("#lineItems").querySelectorAll("[data-field]").forEach((field) => {
    field.addEventListener("input", updateLineFromField);
    field.addEventListener("change", updateLineFromField);
  });
  $("#lineItems").querySelectorAll("[data-action]").forEach((button) => button.addEventListener("click", handleLineAction));
}

function selectField(field, label, options, selected) {
  return `<label>${label}<select data-field="${field}">${options.map((item) => `<option${item === selected ? " selected" : ""}>${escapeHtml(item)}</option>`).join("")}</select></label>`;
}

function updateLineFromField(event) {
  const card = event.target.closest(".line-card");
  const line = currentQuote.partidas.find((item) => item.id === card.dataset.id);
  const field = event.target.dataset.field;
  const value = event.target.type === "number" ? Number(event.target.value) : event.target.value;
  line[field] = value;
  const subtotal = convertMoney(Number(line.cantidad || 0) * Number(line.precioUnitario || 0), line.moneda || currentQuote.moneda, currentQuote.moneda, currentQuote.tipoCambio);
  card.querySelector(`[data-subtotal="${line.id}"]`).textContent = formatMoney(subtotal, currentQuote.moneda);
  updateFromForm();
}

function handleLineAction(event) {
  const id = event.target.dataset.id;
  if (event.target.dataset.action === "delete-line") {
    if (currentQuote.partidas.length === 1) return toast("Debe existir al menos una partida.");
    currentQuote.partidas = currentQuote.partidas.filter((line) => line.id !== id);
  } else if (event.target.dataset.action === "insert-line") {
    const line = currentQuote.partidas.find((item) => item.id === id);
    currentQuote.partidas.splice(currentQuote.partidas.indexOf(line) + 1, 0, createLine({ moneda: line.moneda || currentQuote.moneda }));
  } else {
    const line = currentQuote.partidas.find((item) => item.id === id);
    currentQuote.partidas.splice(currentQuote.partidas.indexOf(line) + 1, 0, { ...line, id: crypto.randomUUID() });
  }
  renderLineItems();
  updateFromForm();
}

function updateFromForm(render = true) {
  const values = Object.fromEntries(new FormData(form).entries());
  Object.assign(currentQuote, {
    consecutivo: values.consecutivo,
    fecha: values.fecha,
    validoHasta: values.validoHasta,
    validezDias: Number(values.validezDias || state.settings.defaultValidity),
    condicionPago: values.condicionPago,
    estado: values.estado,
    moneda: values.moneda,
    tipoCambio: Number(values.tipoCambio || state.settings.exchangeRate || 0),
    ivaModo: values.ivaModo,
    ivaPorcentaje: Number(values.ivaPorcentaje || 0),
    descuentoTipo: values.descuentoTipo,
    descuentoValor: Number(values.descuentoValor || 0),
    clienteId: values.clienteId,
    clienteManual: {
      nombre: values.clienteNombre,
      razonSocial: values.clienteRazonSocial,
      cedula: values.clienteCedula,
      contacto: values.clienteContacto,
      telefono: values.clienteTelefono,
      correo: values.clienteCorreo,
      direccion: values.clienteDireccion,
    },
    proyecto: values.proyecto,
    lugarProyecto: values.lugarProyecto,
    descripcionGeneral: values.descripcionGeneral,
    observaciones: values.observaciones,
    terminos: values.terminos,
    formaPago: values.formaPago,
  });
  const duplicate = state.quotes.some((q) => q.consecutivo === currentQuote.consecutivo && q.id !== currentQuote.id);
  $("#uniqueHint").textContent = duplicate ? "Este consecutivo ya existe." : "";
  renderSummary();
  if (render) renderPreview();
}

function getTotals(q = currentQuote) {
  const exchangeRate = Number(q.tipoCambio || state.settings.exchangeRate || 0);
  const lines = q.partidas.map((line, index) => ({
    ...line,
    moneda: line.moneda || q.moneda,
    numero: index + 1,
    subtotalOriginal: Number(line.cantidad || 0) * Number(line.precioUnitario || 0),
    precioUnitarioConvertido: convertMoney(Number(line.precioUnitario || 0), line.moneda || q.moneda, q.moneda, exchangeRate),
    subtotal: convertMoney(Number(line.cantidad || 0) * Number(line.precioUnitario || 0), line.moneda || q.moneda, q.moneda, exchangeRate),
  }));
  const categories = {
    "Material": 0,
    "Mano de obra": 0,
    "Material + mano de obra": 0,
    "Equipo": 0,
    "Subcontrato": 0,
    "Otro": 0,
  };
  lines.forEach((line) => {
    categories[line.tipo] = (categories[line.tipo] || 0) + line.subtotal;
  });
  const subtotal = lines.reduce((sum, line) => sum + line.subtotal, 0);
  let discount = 0;
  if (q.descuentoTipo === "fixed") discount = Math.min(q.descuentoValor, subtotal);
  if (q.descuentoTipo === "percent") discount = subtotal * (q.descuentoValor / 100);
  const afterDiscount = Math.max(0, subtotal - discount);
  const taxRate = Number(q.ivaPorcentaje || 0) / 100;
  let tax = 0;
  if (q.ivaModo === "total") tax = afterDiscount * taxRate;
  if (q.ivaModo === "line") {
    const lineTaxBase = lines.reduce((sum, line) => {
      const applies = line.ivaAplica === "yes" || (line.ivaAplica === "config" && q.ivaModo === "line");
      return sum + (applies ? line.subtotal : 0);
    }, 0);
    tax = Math.max(0, lineTaxBase - discount) * taxRate;
  }
  return { lines, categories, subtotal, discount, afterDiscount, tax, total: afterDiscount + tax };
}

function renderSummary() {
  const totals = getTotals();
  const rows = [
    ["Materiales", totals.categories.Material],
    ["Mano de obra", totals.categories["Mano de obra"]],
    ["Material + mano de obra", totals.categories["Material + mano de obra"]],
    ["Equipo", totals.categories.Equipo],
    ["Subcontratos", totals.categories.Subcontrato],
    ["Otros", totals.categories.Otro],
    ["Subtotal", totals.subtotal],
  ];
  if (totals.discount > 0) rows.push(["Descuento", -totals.discount]);
  if (currentQuote.ivaModo !== "included") rows.push([`IVA (${currentQuote.ivaPorcentaje || 0}%)`, totals.tax]);
  else rows.push(["IVA", "Incluido en precios"]);
  $("#summaryRows").innerHTML = rows.map(([label, value]) => `<div class="summary-row"><span>${label}</span><strong>${typeof value === "number" ? formatMoney(value, currentQuote.moneda) : value}</strong></div>`).join("");
  $("#grandTotal").textContent = formatMoney(totals.total, currentQuote.moneda);
  $("#amountWords").textContent = amountInWords(totals.total, currentQuote.moneda);
}

function validateQuote(q = currentQuote) {
  updateFromForm(false);
  if (!q.consecutivo) return "El número de presupuesto es obligatorio.";
  if (state.quotes.some((item) => item.consecutivo === q.consecutivo && item.id !== q.id)) return "El consecutivo ya existe.";
  if (!q.fecha) return "La fecha es obligatoria.";
  if (!q.clienteManual.nombre) return "El cliente es obligatorio.";
  if (!q.proyecto) return "El proyecto es obligatorio.";
  if (!q.moneda) return "La moneda es obligatoria.";
  if (q.partidas.some((line) => (line.moneda || q.moneda) !== q.moneda) && Number(q.tipoCambio || 0) <= 0) return "El tipo de cambio es obligatorio cuando hay partidas en otra moneda.";
  if (!q.partidas.length) return "Debe agregar al menos una partida.";
  for (const line of q.partidas) {
    if (!line.descripcion.trim()) return "Cada partida debe tener descripción.";
    if (Number(line.cantidad) <= 0) return "La cantidad debe ser mayor a cero.";
    if (Number(line.precioUnitario) < 0) return "El precio unitario no puede ser negativo.";
  }
  return "";
}

function saveQuote(showMessage = false) {
  const error = validateQuote();
  if (error) return toast(error);
  const existing = state.quotes.findIndex((q) => q.id === currentQuote.id);
  currentQuote.actualizadoEn = new Date().toISOString();
  const snapshot = structuredClone(currentQuote);
  snapshot.totales = getTotals(snapshot);
  if (existing >= 0) state.quotes[existing] = snapshot;
  else {
    state.quotes.unshift(snapshot);
    const number = Number(String(currentQuote.consecutivo).split("-").pop());
    if (Number.isFinite(number) && number >= state.settings.nextNumber) state.settings.nextNumber = number + 1;
  }
  state.currentQuoteId = currentQuote.id;
  storage.save();
  renderQuotesTable();
  renderSettings();
  if (showMessage) toast("Presupuesto guardado.");
}

function newQuote() {
  currentQuote = emptyQuote();
  state.currentQuoteId = currentQuote.id;
  renderAll();
  showView("editor");
}

function editQuote(id) {
  currentQuote = structuredClone(state.quotes.find((q) => q.id === id));
  state.currentQuoteId = currentQuote.id;
  renderAll();
  showView("editor");
}

function duplicateQuote(id) {
  const source = state.quotes.find((q) => q.id === id);
  currentQuote = structuredClone(source);
  currentQuote.id = crypto.randomUUID();
  currentQuote.consecutivo = nextConsecutivo();
  currentQuote.estado = "Borrador";
  currentQuote.creadoEn = new Date().toISOString();
  currentQuote.actualizadoEn = currentQuote.creadoEn;
  currentQuote.partidas = currentQuote.partidas.map((line) => ({ ...line, id: crypto.randomUUID() }));
  renderAll();
  showView("editor");
  toast("Duplicado listo para editar.");
}

function deleteQuote(id) {
  if (!confirm("¿Eliminar este presupuesto?")) return;
  state.quotes = state.quotes.filter((q) => q.id !== id);
  if (currentQuote.id === id) currentQuote = emptyQuote();
  storage.save();
  renderAll();
}

function renderQuotesTable() {
  const query = ($("#searchQuotes").value || "").toLowerCase();
  const rows = state.quotes.filter((q) => [q.consecutivo, q.clienteManual.nombre, q.proyecto].join(" ").toLowerCase().includes(query));
  $("#quotesTable").innerHTML = rows.length ? rows.map((q) => `
    <tr>
      <td><strong>${escapeHtml(q.consecutivo)}</strong></td>
      <td>${escapeHtml(q.fecha)}</td>
      <td>${escapeHtml(q.clienteManual.nombre || "")}</td>
      <td>${escapeHtml(q.proyecto || "")}</td>
      <td><strong>${formatMoney(getTotals(q).total, q.moneda)}</strong></td>
      <td><span class="status">${escapeHtml(q.estado)}</span></td>
      <td><div class="actions">
        <button class="btn secondary" onclick="viewQuote('${q.id}')">Ver</button>
        <button class="btn primary" onclick="editQuote('${q.id}')">Editar</button>
        <button class="btn secondary" onclick="duplicateQuote('${q.id}')">Duplicar</button>
        <button class="btn dark" onclick="downloadQuotePdf('${q.id}')">PDF</button>
        <button class="btn danger" onclick="deleteQuote('${q.id}')">Eliminar</button>
      </div></td>
    </tr>
  `).join("") : `<tr><td colspan="7">No hay presupuestos guardados todavía.</td></tr>`;
}

function viewQuote(id) {
  currentQuote = structuredClone(state.quotes.find((q) => q.id === id));
  renderAll();
  showView("preview");
}

function renderClientsList() {
  $("#clientsList").innerHTML = state.clients.map((client) => `
    <article class="client-item">
      <h3>${escapeHtml(client.nombre)}</h3>
      <p>${escapeHtml([client.contacto, client.telefono, client.correo].filter(Boolean).join(" · ") || "Sin datos adicionales")}</p>
      <div class="actions">
        <button class="btn secondary" onclick="loadClient('${client.id}')">Editar</button>
        <button class="btn danger" onclick="deleteClient('${client.id}')">Eliminar</button>
      </div>
    </article>
  `).join("");
}

function saveClient() {
  const values = Object.fromEntries(new FormData(clientForm).entries());
  const client = { ...values, id: values.id || crypto.randomUUID() };
  const index = state.clients.findIndex((item) => item.id === client.id);
  if (index >= 0) state.clients[index] = client;
  else state.clients.push(client);
  storage.save();
  renderClientSelect();
  renderClientsList();
  clearClientForm();
  toast("Cliente guardado.");
}

function saveClientFromQuote() {
  updateFromForm(false);
  if (!currentQuote.clienteManual.nombre) return toast("Escribe el nombre del cliente primero.");
  const client = {
    id: currentQuote.clienteId || crypto.randomUUID(),
    nombre: currentQuote.clienteManual.nombre,
    razonSocial: currentQuote.clienteManual.razonSocial,
    cedula: currentQuote.clienteManual.cedula,
    contacto: currentQuote.clienteManual.contacto,
    telefono: currentQuote.clienteManual.telefono,
    correo: currentQuote.clienteManual.correo,
    provincia: "",
    canton: "",
    distrito: "",
    direccion: currentQuote.clienteManual.direccion,
    observaciones: "",
  };
  const index = state.clients.findIndex((item) => item.id === client.id);
  if (index >= 0) state.clients[index] = client;
  else state.clients.push(client);
  currentQuote.clienteId = client.id;
  storage.save();
  renderClientSelect();
  form.elements.clienteId.value = client.id;
  renderClientsList();
  toast("Cliente agregado al catálogo.");
}

function loadClient(id) {
  const client = state.clients.find((item) => item.id === id);
  Object.entries(client).forEach(([name, value]) => {
    if (clientForm.elements[name]) clientForm.elements[name].value = value || "";
  });
}

function clearClientForm() {
  clientForm.reset();
  clientForm.elements.id.value = "";
}

function deleteClient(id) {
  if (!confirm("¿Eliminar este cliente del catálogo?")) return;
  state.clients = state.clients.filter((client) => client.id !== id);
  storage.save();
  renderClientSelect();
  renderClientsList();
}

function renderSettings() {
  Object.entries(state.settings).forEach(([name, value]) => {
    if (settingsForm.elements[name]) settingsForm.elements[name].value = value;
  });
}

function saveSettings() {
  const values = Object.fromEntries(new FormData(settingsForm).entries());
  state.settings = {
    prefix: values.prefix || "UG",
    nextNumber: Number(values.nextNumber || 1),
    defaultValidity: Number(values.defaultValidity || 15),
    defaultTax: Number(values.defaultTax || 13),
    exchangeRate: Number(values.exchangeRate || state.settings.exchangeRate || 0),
    bccrEmail: values.bccrEmail || "",
    bccrToken: values.bccrToken || "",
    footerPhrase: values.footerPhrase || "Construimos confianza, entregamos calidad.",
  };
  storage.save();
  toast("Ajustes guardados.");
}

async function updateExchangeFromBccr() {
  const status = $("#exchangeStatus");
  const email = state.settings.bccrEmail || settingsForm.elements.bccrEmail?.value || "";
  const token = state.settings.bccrToken || settingsForm.elements.bccrToken?.value || "";
  if (!email || !token) {
    status.textContent = "Configure correo y token BCCR en Ajustes, o ingrese el tipo de cambio manual.";
    toast("Faltan credenciales BCCR.");
    return;
  }
  status.textContent = "Consultando tipo de cambio venta...";
  try {
    const value = await fetchBccrSaleRate(currentQuote.fecha || today(), email, token);
    if (!value) throw new Error("Sin valor de venta para la fecha.");
    form.elements.tipoCambio.value = value.toFixed(2);
    currentQuote.tipoCambio = value;
    state.settings.exchangeRate = value;
    settingsForm.elements.exchangeRate.value = value.toFixed(2);
    storage.save();
    renderLineItems();
    updateFromForm();
    status.textContent = `Venta BCCR actualizada: ${value.toFixed(2)}`;
    toast("Tipo de cambio actualizado.");
  } catch (error) {
    status.textContent = "No se pudo consultar BCCR desde este navegador. Use el campo manual.";
    toast("Consulta BCCR no disponible.");
  }
}

async function fetchBccrSaleRate(dateString, email, token) {
  const [year, month, day] = dateString.split("-");
  const date = `${day}/${month}/${year}`;
  const params = new URLSearchParams({
    Indicador: "318",
    FechaInicio: date,
    FechaFinal: date,
    Nombre: "UGONZA",
    SubNiveles: "N",
    CorreoElectronico: email,
    Token: token,
  });
  const url = `https://gee.bccr.fi.cr/Indicadores/Suscripciones/WS/wsindicadoreseconomicos.asmx/ObtenerIndicadoresEconomicosXML?${params}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error("BCCR response failed");
  const xmlText = await response.text();
  const xml = new DOMParser().parseFromString(xmlText, "text/xml");
  const raw = xml.querySelector("NUM_VALOR")?.textContent || xmlText.match(/<NUM_VALOR>(.*?)<\/NUM_VALOR>/)?.[1];
  return raw ? Number(raw.replace(",", ".")) : 0;
}

function renderPreview() {
  const q = currentQuote;
  const totals = getTotals(q);
  $("#preview").innerHTML = `
    <div class="doc-header">
      <div class="doc-brand">
        <img src="logo.png" alt="UGONZA Construcciones" />
        <div>
          <strong>${COMPANY.representative}</strong><br />
          Representante<br />
          Cédula jurídica: ${COMPANY.id}<br />
          ${COMPANY.phone}<br />
          ${COMPANY.email}
        </div>
      </div>
      <div class="doc-title">
        <h2>PRESUPUESTO</h2>
        <div class="doc-number">${escapeHtml(q.consecutivo)}</div>
        <div class="kv"><strong>Fecha:</strong><span>${escapeHtml(q.fecha)}</span></div>
        <div class="kv"><strong>Válido hasta:</strong><span>${escapeHtml(q.validoHasta)}</span></div>
        <div class="kv"><strong>Moneda:</strong><span>${q.moneda === "CRC" ? "Colones" : "Dólares"}</span></div>
        <div class="kv"><strong>IVA:</strong><span>${ivaLabel(q)}</span></div>
      </div>
    </div>
    <div class="doc-blocks">
      <div class="doc-box">
        <h3>Datos del cliente</h3>
        ${kv("Cliente", q.clienteManual.nombre)}
        ${kv("Cédula", q.clienteManual.cedula)}
        ${kv("Contacto", q.clienteManual.contacto)}
        ${kv("Teléfono", q.clienteManual.telefono)}
        ${kv("Correo", q.clienteManual.correo)}
      </div>
      <div class="doc-box">
        <h3>Datos del proyecto</h3>
        ${kv("Proyecto", q.proyecto)}
        ${kv("Lugar", q.lugarProyecto)}
        ${kv("Descripción", q.descripcionGeneral)}
        ${kv("Condición de pago", q.condicionPago)}
        ${kv("Validez", `${q.validezDias || 15} días naturales`)}
      </div>
    </div>
    <table class="preview-table">
      <thead><tr><th>#</th><th>Descripción</th><th>Tipo</th><th>Unidad</th><th>Cantidad</th><th>Precio unitario</th><th>Subtotal</th><th>IVA</th></tr></thead>
      <tbody>${totals.lines.map((line) => `<tr><td>${line.numero}</td><td>${escapeHtml(line.descripcion)}</td><td>${escapeHtml(line.tipo)}</td><td>${escapeHtml(line.unidad)}</td><td>${line.cantidad}</td><td>${formatMoney(line.precioUnitario, line.moneda)}</td><td>${formatMoney(line.subtotal, q.moneda)}${line.moneda !== q.moneda ? `<br><small>TC ${q.tipoCambio}</small>` : ""}</td><td>${lineIvaLabel(q, line)}</td></tr>`).join("")}</tbody>
    </table>
    <div class="preview-lower">
      <div>
        <div class="doc-box"><h3>Observaciones</h3>${paragraphs(q.observaciones)}</div>
        <div class="doc-box"><h3>Condiciones y términos</h3>${paragraphs(q.terminos)}</div>
        <div class="doc-box"><h3>Forma de pago</h3>${paragraphs(q.formaPago)}</div>
      </div>
      <div class="doc-box">
        <h3>Resumen económico</h3>
        ${summaryPreviewRows(totals, q)}
        <div class="summary-total"><span>Total general</span><strong>${formatMoney(totals.total, q.moneda)}</strong></div>
        <p><strong>Monto en letras:</strong><br />${amountInWords(totals.total, q.moneda)}</p>
        <p style="margin-top:36px;text-align:center;">Atentamente,<br /><br />____________________________<br /><strong>${COMPANY.representative}</strong><br />Representante<br />${COMPANY.name}<br />Cédula jurídica: ${COMPANY.id}</p>
      </div>
    </div>
  `;
}

function kv(label, value) {
  return `<div class="kv"><strong>${label}:</strong><span>${escapeHtml(value || "-")}</span></div>`;
}

function paragraphs(text) {
  return String(text || "").split("\n").filter(Boolean).map((line) => `<p>${escapeHtml(line)}</p>`).join("");
}

function summaryPreviewRows(totals, q) {
  const rows = [
    ["Total materiales", totals.categories.Material],
    ["Total mano de obra", totals.categories["Mano de obra"]],
    ["Total material + mano de obra", totals.categories["Material + mano de obra"]],
    ["Total equipo / otros", totals.categories.Equipo + totals.categories.Subcontrato + totals.categories.Otro],
    ["Subtotal", totals.subtotal],
  ];
  if (totals.discount > 0) rows.push(["Descuento", -totals.discount]);
  if (q.ivaModo !== "included") rows.push([`IVA (${q.ivaPorcentaje}%)`, totals.tax]);
  else rows.push(["IVA", "Incluido en precios"]);
  return rows.map(([label, value]) => `<div class="summary-row"><span>${label}</span><strong>${typeof value === "number" ? formatMoney(value, q.moneda) : value}</strong></div>`).join("");
}

async function downloadCurrentPdf() {
  const error = validateQuote();
  if (error) return toast(error);
  saveQuote(false);
  await downloadQuotePdf(currentQuote.id);
}

async function downloadQuotePdf(id) {
  const q = state.quotes.find((quote) => quote.id === id) || currentQuote;
  const blob = await buildPdf(q);
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = fileName(q);
  link.click();
  URL.revokeObjectURL(link.href);
  toast("PDF generado.");
}

async function buildPdf(q) {
  const { PDFDocument, StandardFonts, rgb } = PDFLib;
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const logoBytes = await fetch("logo.png").then((res) => res.arrayBuffer());
  const logo = await pdf.embedPng(logoBytes);
  const totals = getTotals(q);
  const pageSize = [595.28, 841.89];
  const margin = 34;
  const teal = rgb(0, 0.29, 0.33);
  const dark = rgb(0.12, 0.14, 0.15);
  const gray = rgb(0.43, 0.47, 0.49);
  const line = rgb(0.82, 0.85, 0.86);
  let page;
  let y;

  function newPage(reduced = false) {
    page = pdf.addPage(pageSize);
    y = pageSize[1] - margin;
    drawHeader(reduced);
  }

  function text(value, x, yy, size = 9, opts = {}) {
    const safe = pdfSafe(String(value ?? ""));
    page.drawText(safe, { x, y: yy, size, font: opts.bold ? bold : font, color: opts.color || dark, maxWidth: opts.maxWidth });
  }

  function lineDraw(x1, yy1, x2, yy2, color = line, thickness = 1) {
    page.drawLine({ start: { x: x1, y: yy1 }, end: { x: x2, y: yy2 }, color, thickness });
  }

  function drawHeader(reduced) {
    const top = y;
    const logoSize = reduced ? 54 : 88;
    page.drawImage(logo, { x: margin, y: top - logoSize + 4, width: logoSize, height: logoSize });
    text(COMPANY.representative, margin + logoSize + 24, top - 22, 10, { bold: true });
    text("Representante", margin + logoSize + 24, top - 36, 8.5, { color: gray });
    text(`Cédula jurídica: ${COMPANY.id}`, margin + logoSize + 24, top - 54, 8.5);
    if (!reduced) {
      text(COMPANY.phone, margin + logoSize + 24, top - 70, 8.5);
      text(COMPANY.email, margin + logoSize + 24, top - 86, 8.5);
    }
    text("PRESUPUESTO", 452, top - 18, 16, { bold: true, color: teal });
    lineDraw(452, top - 26, 560, top - 26, gray);
    page.drawRectangle({ x: 382, y: top - 66, width: 98, height: 28, color: teal, borderRadius: 3 });
    text(q.consecutivo, 398, top - 56, 11, { bold: true, color: rgb(1, 1, 1) });
    text(q.fecha, 494, top - 56, 8.5);
    if (!reduced) {
      const labels = [["Fecha de emisión", q.fecha], ["Válido hasta", q.validoHasta], ["Condición de pago", q.condicionPago], ["Moneda", q.moneda === "CRC" ? "Colones" : "Dólares"], ["TC venta", q.tipoCambio || "-"], ["IVA", ivaLabel(q)]];
      let infoY = top - 104;
      labels.forEach(([label, value]) => {
        text(`${label}:`, 346, infoY, 8.2, { bold: true });
        text(value, 458, infoY, 8.2);
        infoY -= 14;
      });
      const headerBottom = Math.min(top - 196, infoY - 8);
      lineDraw(margin, headerBottom, 562, headerBottom, gray);
      y = headerBottom - 22;
    } else {
      lineDraw(margin, top - 84, 562, top - 84, gray);
      y = top - 100;
    }
  }

  function ensure(space) {
    if (y - space < margin + 38) newPage(true);
  }

  function wrap(value, width, size = 8.5, useBold = false) {
    const words = pdfSafe(String(value || "-")).split(/\s+/);
    const lines = [];
    let row = "";
    words.forEach((word) => {
      const test = row ? `${row} ${word}` : word;
      const measure = (useBold ? bold : font).widthOfTextAtSize(test, size);
      if (measure > width && row) {
        lines.push(row);
        row = word;
      } else row = test;
    });
    if (row) lines.push(row);
    return lines;
  }

  function measureBox(w, rows) {
    const labelW = 82;
    const valueW = w - labelW - 22;
    const rowBlocks = rows.map(([label, value]) => ({
      label,
      value,
      lines: wrap(value, valueW, 8.2).slice(0, 5),
    }));
    const rowHeights = rowBlocks.map((row) => Math.max(15, row.lines.length * 10 + 4));
    const height = 34 + rowHeights.reduce((sum, rowH) => sum + rowH, 0) + 10;
    return { rowBlocks, rowHeights, height };
  }

  function drawBox(title, x, yy, w, measured, height) {
    const labelW = 82;
    page.drawRectangle({ x, y: yy - height, width: w, height, borderColor: line, borderWidth: 1 });
    text(title, x + 10, yy - 18, 10, { bold: true, color: teal });
    let cursor = yy - 36;
    measured.rowBlocks.forEach((row, i) => {
      text(`${row.label}:`, x + 10, cursor, 8.2, { bold: true });
      row.lines.forEach((lineText, j) => text(lineText, x + 10 + labelW, cursor - j * 10, 8.2));
      cursor -= measured.rowHeights[i];
    });
  }

  newPage(false);
  const clientBox = measureBox(250, [
    ["Cliente", q.clienteManual.nombre],
    ["Cédula", q.clienteManual.cedula],
    ["Contacto", q.clienteManual.contacto],
    ["Teléfono", q.clienteManual.telefono],
    ["Correo", q.clienteManual.correo],
  ]);
  const projectBox = measureBox(255, [
    ["Proyecto", q.proyecto],
    ["Lugar", q.lugarProyecto],
    ["Descripción", q.descripcionGeneral],
    ["Pago", q.condicionPago],
    ["Validez", `${q.validezDias || 15} días naturales`],
  ]);
  const boxH = Math.max(clientBox.height, projectBox.height);
  drawBox("DATOS DEL CLIENTE", margin, y, 250, clientBox, boxH);
  drawBox("DATOS DEL PROYECTO", 306, y, 255, projectBox, boxH);
  y -= boxH + 20;

  const cols = [
    [margin, 23, "#"],
    [57, 187, "Descripción"],
    [244, 69, "Tipo"],
    [313, 47, "Unidad"],
    [360, 38, "Cant."],
    [398, 72, "P. unitario"],
    [470, 72, "Subtotal"],
    [542, 19, "IVA"],
  ];
  function tableHeader() {
    ensure(26);
    page.drawRectangle({ x: margin, y: y - 22, width: pageSize[0] - margin * 2, height: 22, color: teal });
    cols.forEach(([x, , label]) => text(label, x + 4, y - 15, 7.6, { bold: true, color: rgb(1, 1, 1) }));
    y -= 22;
  }
  tableHeader();
  totals.lines.forEach((lineItem) => {
    const desc = wrap(lineItem.descripcion, cols[1][1] - 10, 7.2);
    const type = wrap(lineItem.tipo, cols[2][1] - 8, 7.1);
    const rowH = Math.max(36, Math.max(desc.length, type.length) * 9.8 + 16);
    ensure(rowH + 6);
    page.drawRectangle({ x: margin, y: y - rowH, width: pageSize[0] - margin * 2, height: rowH, borderColor: line, borderWidth: 0.6 });
    cols.slice(1).forEach(([x]) => lineDraw(x, y, x, y - rowH, line, 0.6));
    text(lineItem.numero, cols[0][0] + 7, y - 15, 7.3);
    desc.forEach((row, i) => text(row, cols[1][0] + 4, y - 15 - i * 9.3, 7.2));
    type.forEach((row, i) => text(row, cols[2][0] + 4, y - 15 - i * 9.2, 7.1));
    text(lineItem.unidad, cols[3][0] + 4, y - 15, 7.1);
    text(Number(lineItem.cantidad).toFixed(2), cols[4][0] + 4, y - 15, 7.1);
    text(formatPdfMoney(lineItem.precioUnitario, lineItem.moneda), cols[5][0] + 4, y - 15, 6.5);
    text(formatPdfMoney(lineItem.subtotal, q.moneda), cols[6][0] + 4, y - 15, 6.5);
    text(lineIvaLabel(q, lineItem), cols[7][0] + 4, y - 15, 6.8);
    y -= rowH;
  });

  y -= 18;
  drawSection("OBSERVACIONES", q.observaciones, margin, pageSize[0] - margin * 2, 8);
  drawSection("CONDICIONES Y TÉRMINOS", q.terminos, margin, pageSize[0] - margin * 2, 7.3, { centeredTitle: true, justify: true });
  drawSection("FORMA DE PAGO", q.formaPago, margin, pageSize[0] - margin * 2, 8);

  const summaryRows = [
    ["Total materiales", totals.categories.Material],
    ["Total mano de obra", totals.categories["Mano de obra"]],
    ["Total material + mano de obra", totals.categories["Material + mano de obra"]],
    ["Total equipo / otros", totals.categories.Equipo + totals.categories.Subcontrato + totals.categories.Otro],
    ["Subtotal", totals.subtotal],
  ];
  if (totals.discount > 0) summaryRows.push(["Descuento", -totals.discount]);
  summaryRows.push(q.ivaModo === "included" ? ["IVA", "Incluido en precios"] : [`IVA (${q.ivaPorcentaje}%)`, totals.tax]);
  const summaryW = 250;
  const rightX = pageSize[0] - margin - summaryW;
  const summaryH = 22 * (summaryRows.length + 1) + 82;
  const signatureH = 114;
  if (y - Math.max(summaryH, signatureH) < margin + 42) newPage(true);
  let sy = y;
  const signX = margin;
  const signW = rightX - margin - 24;
  lineDraw(signX + 34, sy - 74, signX + signW - 34, sy - 74, gray, 0.8);
  text(COMPANY.representative, signX + 58, sy - 88, 8.5, { bold: true });
  text("Representante", signX + 84, sy - 101, 8);
  text(`${COMPANY.name} · Cédula jurídica: ${COMPANY.id}`, signX + 16, sy - 114, 7.7);

  page.drawRectangle({ x: rightX, y: sy - summaryH, width: summaryW, height: summaryH, borderColor: line, borderWidth: 1 });
  summaryRows.forEach(([label, value], i) => {
    const yy = sy - 18 - i * 22;
    text(label, rightX + 10, yy, 8.2, { bold: label === "Subtotal" });
    text(typeof value === "number" ? formatPdfMoney(value, q.moneda) : value, rightX + 134, yy, 8.2, { bold: label === "Subtotal" });
    lineDraw(rightX, yy - 6, rightX + summaryW, yy - 6, line, 0.5);
  });
  const totalY = sy - 18 - summaryRows.length * 22;
  page.drawRectangle({ x: rightX, y: totalY - 8, width: summaryW, height: 24, color: teal });
  text("TOTAL GENERAL", rightX + 10, totalY, 10, { bold: true, color: rgb(1, 1, 1) });
  text(formatPdfMoney(totals.total, q.moneda), rightX + 134, totalY, 10, { bold: true, color: rgb(1, 1, 1) });
  text("Monto en letras:", rightX + 10, totalY - 32, 8.5, { bold: true });
  drawParagraph(amountInWords(totals.total, q.moneda), rightX + 10, totalY - 48, summaryW - 20, 8);
  y = sy - Math.max(summaryH, signatureH) - 22;
  text(state.settings.footerPhrase, 218, 18, 8, { color: gray });

  function drawSection(title, value, x, width, size, opts = {}) {
    const estimated = 28 + sectionLineCount(value, width, size) * (size + 4);
    ensure(Math.min(estimated, 180));
    const titleX = opts.centeredTitle ? x + (width - bold.widthOfTextAtSize(title, 10)) / 2 : x;
    text(title, titleX, y - 12, 10, { bold: true, color: teal });
    lineDraw(x, y - 18, x + width, y - 18, line, 0.6);
    y = drawParagraph(value, x, y - 34, width, size, opts.justify) - 8;
  }

  function sectionLineCount(value, width, size) {
    return String(value || "").split("\n").filter(Boolean).reduce((count, para) => count + wrap(para, width, size).length + 1, 0);
  }

  function drawParagraph(value, x, yy, width, size, justify = false) {
    let cursor = yy;
    String(value || "").split("\n").filter(Boolean).forEach((para) => {
      const rows = wrap(para, width, size);
      rows.forEach((row, i) => {
        if (cursor - (size + 4) < margin + 38) {
          newPage(true);
          cursor = y;
        }
        if (justify && i < rows.length - 1) drawJustifiedLine(row, x, cursor, width, size);
        else text(row, x, cursor, size);
        cursor -= size + 3;
      });
      cursor -= 6;
    });
    return cursor;
  }

  function drawJustifiedLine(row, x, yy, width, size) {
    const words = row.split(/\s+/).filter(Boolean);
    if (words.length < 4) {
      text(row, x, yy, size);
      return;
    }
    const wordsWidth = words.reduce((sum, word) => sum + font.widthOfTextAtSize(pdfSafe(word), size), 0);
    const gap = Math.min(5, Math.max(2.2, (width - wordsWidth) / (words.length - 1)));
    let cursor = x;
    words.forEach((word) => {
      text(word, cursor, yy, size);
      cursor += font.widthOfTextAtSize(pdfSafe(word), size) + gap;
    });
  }

  const bytes = await pdf.save();
  return new Blob([bytes], { type: "application/pdf" });
}

function formatMoney(value, currency = "CRC") {
  const symbol = currency === "CRC" ? "₡" : "$";
  return `${symbol} ${Number(value || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatPdfMoney(value, currency = "CRC") {
  const symbol = currency === "CRC" ? "CRC" : "$";
  return `${symbol} ${Number(value || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function convertMoney(value, fromCurrency = "CRC", toCurrency = "CRC", exchangeRate = 0) {
  const amount = Number(value || 0);
  const rate = Number(exchangeRate || 0);
  if (fromCurrency === toCurrency) return amount;
  if (!rate) return amount;
  return fromCurrency === "USD" && toCurrency === "CRC" ? amount * rate : amount / rate;
}

function ivaLabel(q) {
  return { total: `Aplica ${q.ivaPorcentaje}%`, none: "No aplica", line: "Por línea", included: "Incluido en precios" }[q.ivaModo] || "";
}

function lineIvaLabel(q, line) {
  if (q.ivaModo === "included") return "Incl.";
  if (q.ivaModo === "none") return "No";
  if (q.ivaModo === "total") return "Sí";
  return line.ivaAplica === "no" ? "No" : "Sí";
}

function amountInWords(value, currency = "CRC") {
  const rounded = Math.round(Number(value || 0) * 100);
  const entero = Math.floor(rounded / 100);
  const cents = String(rounded % 100).padStart(2, "0");
  const money = currency === "CRC" ? "COLONES" : "DÓLARES";
  return `${numberToWords(entero).toUpperCase()} ${money} CON ${cents}/100.`;
}

function numberToWords(num) {
  if (num === 0) return "cero";
  const units = ["", "uno", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve", "diez", "once", "doce", "trece", "catorce", "quince", "dieciséis", "diecisiete", "dieciocho", "diecinueve", "veinte", "veintiuno", "veintidós", "veintitrés", "veinticuatro", "veinticinco", "veintiséis", "veintisiete", "veintiocho", "veintinueve"];
  const tens = ["", "", "veinte", "treinta", "cuarenta", "cincuenta", "sesenta", "setenta", "ochenta", "noventa"];
  const hundreds = ["", "ciento", "doscientos", "trescientos", "cuatrocientos", "quinientos", "seiscientos", "setecientos", "ochocientos", "novecientos"];
  function underThousand(n) {
    if (n === 100) return "cien";
    if (n < 30) return units[n];
    if (n < 100) return `${tens[Math.floor(n / 10)]}${n % 10 ? ` y ${units[n % 10]}` : ""}`;
    return `${hundreds[Math.floor(n / 100)]}${n % 100 ? ` ${underThousand(n % 100)}` : ""}`;
  }
  function chunk(n) {
    if (n < 1000) return underThousand(n);
    if (n < 1000000) {
      const k = Math.floor(n / 1000);
      return `${k === 1 ? "mil" : `${underThousand(k)} mil`}${n % 1000 ? ` ${underThousand(n % 1000)}` : ""}`;
    }
    const m = Math.floor(n / 1000000);
    return `${m === 1 ? "un millón" : `${chunk(m)} millones`}${n % 1000000 ? ` ${chunk(n % 1000000)}` : ""}`;
  }
  return chunk(num);
}

function fileName(q) {
  return `presupuesto_${slug(q.consecutivo)}_${slug(q.clienteManual.nombre)}_${q.fecha}.pdf`;
}

function slug(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function pdfSafe(value) {
  return value.replace(/₡/g, "CRC").replace(/•/g, "-");
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char]));
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/\n/g, " ");
}

function toast(message) {
  const el = $("#toast");
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.classList.remove("show"), 2600);
}

boot();
