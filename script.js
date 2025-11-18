/* script.js - Sistema de asistencia (SPA simple)
   Requisitos implementados:
   - Login docente (validación front-end)
   - Panel con 8 materias y botón Generar Asistencia
   - Generación de link único + QR (qrcodejs)
   - Copiar link
   - Página alumno accesible por link/QR
   - Guardado en localStorage por materia
   - Ver asistencias en panel (extrae localStorage)
   - SPA simple con show/hide
   - Link expira en 15 minutos (configurable)
*/
// Detectar acceso por link de asistencia
const urlParams = new URLSearchParams(window.location.search);
const materiaLink = urlParams.get("materia");
const asistenciaId = urlParams.get("id");
const params = new URLSearchParams(location.search);
const subject = params.get('subject');
const id = params.get('id');

if (materiaLink && asistenciaId) {
    // Ocultamos todas las pantallas
    document.querySelectorAll("section").forEach(sec => sec.style.display = "none");

    // Mostramos solo la pantalla de asistencia para alumnos
    const screenAlumno = document.getElementById("screen-asistencia-alumno");
    screenAlumno.style.display = "block";

    // Cargar materia en el título
    document.getElementById("asistencia-materia").textContent = materiaLink;

    console.log("Acceso por link detectado → mostrando solo el panel de alumno");
}

(() => {
  // CONFIG
  const TEACHER_USER = 'docente';
  const TEACHER_PASS = '1234';
  const SUBJECTS = [
    'Matemática','Lengua','Historia','Geografía',
    'Física','Química','Biología','Informática'
  ];
  const LINK_TTL_MIN = 15; // minutos

  // Helpers
  const $ = id => document.getElementById(id);
  const qs = sel => document.querySelector(sel);
  const now = () => Date.now();

  // Screens
  const screenLogin = $('screen-login');
  const screenPanel = $('screen-panel');
  const screenGenerate = $('screen-generate');
  const screenStudent = $('screen-student');
  const screenAttendances = $('screen-attendances');

  // Login elements
  const loginForm = $('login-form');
  const loginUser = $('login-user');
  const loginPass = $('login-pass');
  const loginError = $('login-error');
  const docenteNombre = $('docente-nombre');
  const btnLogout = $('btn-logout');

  // Subjects list container
  const subjectsList = $('subjects-list');

  // Generate section
  const genTitle = $('gen-subject-title');
  const genBack = $('gen-back');
  const generatedLinkInput = $('generated-link');
  const copyLinkBtn = $('copy-link');
  const qrcodeContainer = $('qrcode');
  const linkValiditySpan = $('link-validity');

  // Student section
  const studentSubjectTitle = $('student-subject');
  const studentInfo = $('student-info');
  const studentForm = $('student-form');
  const studentName = $('student-name');
  const studentDni = $('student-dni');
  const studentMsg = $('student-msg');
  const studentExpired = $('student-expired');
  const studentBack = $('student-back');

  // View attendances
  const btnViewAtt = $('btn-view-attendance');
  const attList = $('att-list');
  const attBack = $('att-back');

  // State
  let currentTeacher = null;
  let currentGenSubject = null;
  let currentLinkData = null; // {subject, id, expires}

  // UTIL - storage helpers
  function saveJSON(key, obj) { localStorage.setItem(key, JSON.stringify(obj)); }
  function readJSON(key, fallback=null){
    try{ const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
    catch(e){ return fallback; }
  }

  // Navigation SPA helpers
  function showScreen(screen){
    [screenLogin, screenPanel, screenGenerate, screenStudent, screenAttendances].forEach(s => s.classList.add('hidden'));
    screen.classList.remove('hidden');
    window.scrollTo(0,0);
  }

  // LOGIN
  loginForm.addEventListener('submit', e => {
    e.preventDefault();
    loginError.textContent = '';
    const u = loginUser.value.trim();
    const p = loginPass.value;
    if(u === TEACHER_USER && p === TEACHER_PASS){
      currentTeacher = u;
      docenteNombre.textContent = `Docente: ${u}`;
      renderSubjects();
      showScreen(screenPanel);
      // clear inputs
      loginUser.value = '';
      loginPass.value = '';
    } else {
      loginError.textContent = 'Usuario o contraseña incorrectos.';
    }
  });

  btnLogout.addEventListener('click', () => {
    currentTeacher = null;
    showScreen(screenLogin);
  });

  // RENDER SUBJECTS
  function renderSubjects(){
    subjectsList.innerHTML = '';
    SUBJECTS.forEach((s, idx) => {
      const card = document.createElement('div');
      card.className = 'subject-card';
      card.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div>
            <div class="subject-title">${s}</div>
            <div class="muted small">ID: ${idx+1}</div>
          </div>
          <div class="subject-actions">
            <button class="btn small" data-subject="${s}" data-action="generate">Generar Asistencia</button>
          </div>
        </div>
      `;
      subjectsList.appendChild(card);
    });

    // add listeners for generate buttons
    subjectsList.querySelectorAll('button[data-action="generate"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const subject = btn.getAttribute('data-subject');
        onGenerate(subject);
      });
    });
  }

  // GENERAR ASISTENCIA
  function onGenerate(subject){
    currentGenSubject = subject;
    genTitle.textContent = `Generar asistencia - ${subject}`;
    qrcodeContainer.innerHTML = '';
    // create unique id
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2,8);
    const expires = now() + LINK_TTL_MIN * 60 * 1000;
    // build link: usamos la URL actual (index) + params
    const base = "https://t1nch0h.github.io/Sistema-asistencia/index.html";
    const link = `${base}?subject=${encodeURIComponent(subject)}&id=${encodeURIComponent(id)}`;
    // Save active link registry
    const active = readJSON('active_links', {}) || {};
    active[id] = { subject, id, createdAt: now(), expires };
    saveJSON('active_links', active);

    generatedLinkInput.value = link;
    linkValiditySpan.textContent = `${LINK_TTL_MIN} minutos`;

    // create QR
    qrcodeContainer.innerHTML = '';
    // eslint-disable-next-line no-undef
    try {
      new QRCode(qrcodeContainer, {
        text: link,
        width: 160,
        height: 160,
        correctLevel: QRCode.CorrectLevel.H
      });
    } catch (err) {
      qrcodeContainer.innerText = "Error al generar QR.";
    }

    currentLinkData = {subject, id, link, expires};
    showScreen(screenGenerate);
  }

  copyLinkBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(generatedLinkInput.value);
      copyLinkBtn.textContent = 'Copiado';
      setTimeout(()=> copyLinkBtn.textContent = 'Copiar link', 1500);
    } catch (e) {
      alert('No se pudo copiar. Usa Ctrl+C.');
    }
  });

  genBack.addEventListener('click', () => showScreen(screenPanel));

  // STUDENT PAGE - detectar params en URL (cuando abren el link)
  function parseQueryParams(){
    const qs = {};
    const q = location.search.replace(/^\?/, '');
    if(!q) return qs;
    q.split('&').forEach(part => {
      const [k,v] = part.split('=').map(decodeURIComponent);
      qs[k] = v;
    });
    return qs;
  }

  function openStudentIfParams(){
    const params = parseQueryParams();
    if(params.subject && params.id){
      // If user opens the link, show student screen
      prepareStudentScreen(params.subject, params.id);
    }
  }

  function prepareStudentScreen(subject, id){
    // check if id is active and not expired
    const active = readJSON('active_links', {}) || {};
    const linkObj = active[id];
    const valid = linkObj && linkObj.subject === subject && linkObj.expires > now();
    if(!valid){
      // show expired message
      studentExpired.classList.remove('hidden');
      studentInfo.textContent = `Materia: ${subject || '---'}`;
      $('student-subject').textContent = `Registro de asistencia - ${subject || ''}`;
      studentForm.classList.add('hidden');
      studentExpired.classList.remove('hidden');
    } else {
      studentForm.classList.remove('hidden');
      studentExpired.classList.add('hidden');
      $('student-subject').textContent = `Registro de asistencia - ${subject}`;
      studentInfo.textContent = `Accediste mediante link/QR. Materia: ${subject}`;
      // store current context
      screenStudent.dataset.subject = subject;
      screenStudent.dataset.id = id;
    }
    showScreen(screenStudent);
  }

  // Student register submit
  studentForm.addEventListener('submit', e => {
    e.preventDefault();
    const name = studentName.value.trim();
    const dni = studentDni.value.trim();
    const subject = screenStudent.dataset.subject;
    const id = screenStudent.dataset.id;
    if(!name || !dni) return;
    // Validate link again
    const active = readJSON('active_links', {}) || {};
    const linkObj = active[id];
    if(!(linkObj && linkObj.expires > now())){
      studentForm.classList.add('hidden');
      studentExpired.classList.remove('hidden');
      return;
    }
    const key = `attendance_${subject}`;
    const list = readJSON(key, []);
    const entry = {
      name,
      dni,
      timestamp: now(),
      when: new Date().toLocaleString()
    };
    list.push(entry);
    saveJSON(key, list);

    studentMsg.textContent = 'Asistencia registrada correctamente.';
    studentName.value = '';
    studentDni.value = '';
    setTimeout(()=> studentMsg.textContent = '', 2500);
  });

  studentBack.addEventListener('click', () => {
    // Cuando un alumno presiona volver, lo llevamos a la página inicial (sin params)
    history.replaceState({}, document.title, location.pathname);
    showScreen(screenLogin);
  });

  // VIEW ATTENDANCES - listar por materia
  btnViewAtt.addEventListener('click', () => {
    renderAttendances();
    showScreen(screenAttendances);
  });

  attBack.addEventListener('click', () => showScreen(screenPanel));

  function renderAttendances(){
    attList.innerHTML = '';
    SUBJECTS.forEach(subject => {
      const key = `attendance_${subject}`;
      const list = readJSON(key, []);
      const card = document.createElement('div');
      card.className = 'att-card';
      card.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;">
        <div><strong>${subject}</strong><div class="muted small">${(list||[]).length} registros</div></div>
        <div>
          <button class="btn small" data-subject="${subject}" data-action="export">Exportar CSV</button>
        </div>
      </div>`;
      const rows = document.createElement('div');
      rows.style.marginTop = '8px';
      if(list && list.length){
        list.slice().reverse().forEach(entry => {
          const r = document.createElement('div');
          r.className = 'att-row';
          r.innerHTML = `<div><strong>${escapeHtml(entry.name)}</strong><div class="muted small">DNI: ${escapeHtml(entry.dni)}</div></div>
                         <div class="muted small">${escapeHtml(entry.when)}</div>`;
          rows.appendChild(r);
        });
      } else {
        rows.innerHTML = `<div class="muted small">No hubo registros aún.</div>`;
      }
      card.appendChild(rows);
      attList.appendChild(card);
    });

    // export listeners
    attList.querySelectorAll('button[data-action="export"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const subj = btn.getAttribute('data-subject');
        exportCSV(subj);
      });
    });
  }

  // EXPORT CSV
  function exportCSV(subject){
    const key = `attendance_${subject}`;
    const list = readJSON(key, []) || [];
    if(!list.length){ alert('No hay registros para exportar.'); return; }
    const rows = [['Nombre','DNI','Fecha y hora']];
    list.forEach(r => rows.push([r.name, r.dni, r.when]));
    const csv = rows.map(r => r.map(cell => `"${String(cell).replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `asistencias_${subject.replace(/\s+/g,'_')}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  // UTIL escapeHtml
  function escapeHtml(s){
    return String(s||'').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  }

  // On load: check if opened with params (student path)
  window.addEventListener('load', () => {
    openStudentIfParams();
    // default: show login
    if(!location.search) showScreen(screen-loginEquivalent());
  });

  // Helper to show login or panel if already logged (for dev)
  function screenloginEquivalent(){
    return currentTeacher ? screenPanel : screenLogin;
  }

  // Make sure back/forward in history keeps behavior simple:
  window.addEventListener('popstate', () => {
    // if params present show student, else show login/panel
    if(location.search && parseQueryParams().subject) openStudentIfParams();
    else showScreen(screenloginEquivalent());
  });

  // Small utility: allow opening student screen when user pastes link into text (manual)
  // Also allow generating a quick preview when user visits index with params.
  // Clean UI: clear query params when leaving student screen
  // (already handled in studentBack)

  // Expose some functions for debugging in console (optional)
  window._asist = {
    SUBJECTS,
    readJSON,
    saveJSON
  };

})();

