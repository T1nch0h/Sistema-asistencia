/* SISTEMA DE ASISTENCIA – Versión corregida para GitHub Pages */

/* CONFIG */
const TEACHER_USER = "docente";
const TEACHER_PASS = "1234";
const SUBJECTS = [
  "Matemática", "Lengua", "Historia", "Geografía",
  "Física", "Química", "Biología", "Informática"
];
const LINK_TTL_MIN = 15;

/* HELPERS */
const $ = id => document.getElementById(id);
const now = () => Date.now();

/* PANTALLAS */
const screenLogin = $("screen-login");
const screenPanel = $("screen-panel");
const screenGenerate = $("screen-generate");
const screenStudent = $("screen-student");
const screenAttendances = $("screen-attendances");

/* LOGIN */
const loginForm = $("login-form");
const loginUser = $("login-user");
const loginPass = $("login-pass");
const loginError = $("login-error");
const docenteNombre = $("docente-nombre");
const btnLogout = $("btn-logout");

/* GENERAR ASISTENCIA */
const subjectsList = $("subjects-list");
const genTitle = $("gen-subject-title");
const generatedLinkInput = $("generated-link");
const copyLinkBtn = $("copy-link");
const qrcodeContainer = $("qrcode");
const linkValiditySpan = $("link-validity");
const genBack = $("gen-back");

/* PANTALLA ALUMNO */
const studentSubjectTitle = $("student-subject");
const studentInfo = $("student-info");
const studentForm = $("student-form");
const studentName = $("student-name");
const studentDni = $("student-dni");
const studentMsg = $("student-msg");
const studentExpired = $("student-expired");
const studentBack = $("student-back");

/* VER ASISTENCIAS */
const btnViewAtt = $("btn-view-attendance");
const attList = $("att-list");
const attBack = $("att-back");

let currentTeacher = null;

/* STORAGE HELPERS */
function saveJSON(key, obj) { localStorage.setItem(key, JSON.stringify(obj)); }
function readJSON(key, fallback = null) {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch {
    return fallback;
  }
}

/* SPA: cambiar pantallas */
function showScreen(screen) {
  [
    screenLogin, screenPanel, screenGenerate,
    screenStudent, screenAttendances
  ].forEach(s => s.classList.add("hidden"));

  screen.classList.remove("hidden");
  window.scrollTo(0, 0);
}

/* LOGIN DOCENTE */
loginForm.addEventListener("submit", e => {
  e.preventDefault();
  loginError.textContent = "";

  if (loginUser.value.trim() === TEACHER_USER && loginPass.value === TEACHER_PASS) {
    currentTeacher = TEACHER_USER;
    docenteNombre.textContent = "Docente: " + currentTeacher;
    renderSubjects();
    showScreen(screenPanel);
  } else {
    loginError.textContent = "Usuario o contraseña incorrectos.";
  }
});

btnLogout.addEventListener("click", () => showScreen(screenLogin));

/* LISTAR MATERIAS */
function renderSubjects() {
  subjectsList.innerHTML = "";
  SUBJECTS.forEach(subject => {
    const card = document.createElement("div");
    card.className = "subject-card";

    card.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <div>
          <div class="subject-title">${subject}</div>
        </div>
        <button class="btn small" data-subject="${subject}">Generar Asistencia</button>
      </div>
    `;

    card.querySelector("button").addEventListener("click", () => {
      generarAsistencia(subject);
    });

    subjectsList.appendChild(card);
  });
}

/* GENERAR LINK + QR */
function generarAsistencia(subject) {
  showScreen(screenGenerate);

  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const expires = now() + LINK_TTL_MIN * 60000;

  /* 🔥 URL FIJA DE GITHUB PAGES */
  const base = "https://t1nch0h.github.io/Sistema-asistencia/index.html";
  const link = `${base}?subject=${encodeURIComponent(subject)}&id=${encodeURIComponent(id)}`;

  /* Guardar link activo */
  const active = readJSON("active_links", {}) || {};
  active[id] = { subject, id, expires };
  saveJSON("active_links", active);

  generatedLinkInput.value = link;
  linkValiditySpan.textContent = LINK_TTL_MIN + " minutos";

  /* Generar QR */
  qrcodeContainer.innerHTML = "";
  new QRCode(qrcodeContainer, {
    text: link,
    width: 180,
    height: 180
  });

  /* Copiar link */
  copyLinkBtn.onclick = async () => {
    await navigator.clipboard.writeText(link);
    copyLinkBtn.textContent = "Copiado ✔";
    setTimeout(() => copyLinkBtn.textContent = "Copiar link", 1500);
  };

  genBack.onclick = () => showScreen(screenPanel);
}

/* DETECTAR SI ENTRÓ UN ALUMNO POR EL LINK / QR */
function parseQuery() {
  const p = new URLSearchParams(location.search);
  return { subject: p.get("subject"), id: p.get("id") };
}

function openStudentIfParams() {
  const { subject, id } = parseQuery();
  if (subject && id) prepareStudent(subject, id);
}

function prepareStudent(subject, id) {
  const active = readJSON("active_links", {});
  const link = active[id];

  if (!link || link.subject !== subject || link.expires < now()) {
    studentExpired.classList.remove("hidden");
    studentForm.classList.add("hidden");
  } else {
    studentExpired.classList.add("hidden");
    studentForm.classList.remove("hidden");

    screenStudent.dataset.subject = subject;
    screenStudent.dataset.id = id;
  }

  studentSubjectTitle.textContent = "Registrar asistencia - " + subject;
  studentInfo.textContent = "Materia: " + subject;

  showScreen(screenStudent);
}

/* ENVIAR ASISTENCIA */
studentForm.addEventListener("submit", e => {
  e.preventDefault();

  const subject = screenStudent.dataset.subject;
  const id = screenStudent.dataset.id;

  const name = studentName.value.trim();
  const dni = studentDni.value.trim();

  if (!name || !dni) return;

  const active = readJSON("active_links", {});
  const link = active[id];

  if (!link || link.expires < now()) {
    studentExpired.classList.remove("hidden");
    studentForm.classList.add("hidden");
    return;
  }

  const key = "attendance_" + subject;
  const list = readJSON(key, []);
  list.push({
    name,
    dni,
    when: new Date().toLocaleString()
  });

  saveJSON(key, list);

  studentMsg.textContent = "Asistencia registrada correctamente ✔";
  studentName.value = "";
  studentDni.value = "";

  setTimeout(() => studentMsg.textContent = "", 2500);
});

studentBack.addEventListener("click", () => {
  history.replaceState({}, document.title, location.pathname);
  showScreen(screenLogin);
});

/* VER ASISTENCIAS */
btnViewAtt.addEventListener("click", () => {
  renderAttendances();
  showScreen(screenAttendances);
});

attBack.addEventListener("click", () => showScreen(screenPanel));

function renderAttendances() {
  attList.innerHTML = "";

  SUBJECTS.forEach(subject => {
    const key = "attendance_" + subject;
    const list = readJSON(key, []);
    const card = document.createElement("div");

    card.className = "att-card";
    card.innerHTML = `
      <h3>${subject} — ${list.length} registro(s)</h3>
    `;

    list.forEach(entry => {
      const row = document.createElement("div");
      row.className = "att-row";
      row.innerHTML = `
        <strong>${entry.name}</strong> — DNI: ${entry.dni}
        <br><small>${entry.when}</small>
      `;
      card.appendChild(row);
    });

    attList.appendChild(card);
  });
}

/* INICIO AUTOMÁTICO */
window.addEventListener("load", () => {
  const q = parseQuery();
  if (q.subject && q.id) openStudentIfParams();
  else showScreen(screenLogin);
});




