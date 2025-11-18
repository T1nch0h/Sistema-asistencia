/* Sistema de Asistencia 100% compatible con GitHub Pages y QR móvil */

/* Detectar si se abre por link QR */
const params = new URLSearchParams(window.location.search);
const qrSubject = params.get("subject");
const qrId = params.get("id");

/* Si viene desde QR → mostrar sólo pantalla alumno */
if (qrSubject && qrId) {
    document.querySelectorAll("section").forEach(s => s.style.display = "none");
    const screenAlumno = document.getElementById("screen-asistencia-alumno");
    screenAlumno.style.display = "block";
    document.getElementById("asistencia-materia").textContent = qrSubject;
}

/* CONFIG */
const TEACHER_USER = 'Docente';
const TEACHER_PASS = '2025';
const SUBJECTS = [
    'Matemática','Lengua','Historia','Geografía',
    'Física','Química','Biología','Informática'
];

/* Helper */
const $ = id => document.getElementById(id);

/* Screens */
const screenLogin = $('screen-login');
const screenPanel = $('screen-panel');
const screenGenerate = $('screen-generate');
const screenStudent = $('screen-asistencia-alumno');
const screenAttendances = $('screen-attendances');

/* Login */
$('login-form').addEventListener('submit', e => {
    e.preventDefault();
    const u = $('login-user').value.trim();
    const p = $('login-pass').value.trim();

    if (u === TEACHER_USER && p === TEACHER_PASS) {
        showScreen(screenPanel);
        renderSubjects();
    } else {
        $('login-error').textContent = "Usuario o contraseña incorrectos.";
    }
});

/* Mostrar pantallas */
function showScreen(screen){
    document.querySelectorAll("section").forEach(s => s.classList.add("hidden"));
    screen.classList.remove("hidden");
    window.scrollTo(0,0);
}

/* Render materias */
function renderSubjects(){
    const container = $('subjects-list');
    container.innerHTML = "";

    SUBJECTS.forEach(materia => {
        const card = document.createElement("div");
        card.className = "subject-card";
        card.innerHTML = `
            <div style="display:flex;justify-content:space-between;align-items:center;">
                <div>
                    <div class="subject-title">${materia}</div>
                </div>
                <button class="btn small generate-btn" data-materia="${materia}">
                    Generar Asistencia
                </button>
            </div>
        `;
        container.appendChild(card);
    });

    document.querySelectorAll(".generate-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            generarAsistencia(btn.dataset.materia);
        });
    });
}
/* Generar asistencia: crea link + QR */
function generarAsistencia(materia){
    showScreen(screenGenerate);

    const id = Date.now().toString(36) + Math.random().toString(36).slice(2,8);

    /* 🔥 URL fija de GitHub Pages */
    const base = "https://t1nch0h.github.io/Sistema-asistencia/index.html";

    const link = `${base}?subject=${encodeURIComponent(materia)}&id=${encodeURIComponent(id)}`;

    /* Mostrar link en input */
    $('generated-link').value = link;

    /* Generar QR */
    const cont = $('qrcode');
    cont.innerHTML = "";
    try {
        new QRCode(cont, {
            text: link,
            width: 180,
            height: 180
        });
    } catch {
        cont.innerHTML = "<p>Error al generar QR</p>";
    }

    /* Botón copiar */
    $('copy-link').onclick = async () => {
        try {
            await navigator.clipboard.writeText(link);
            $('copy-link').textContent = "Copiado ✔";
            setTimeout(()=> $('copy-link').textContent="Copiar link",1500);
        } catch(e){
            alert("No se pudo copiar automáticamente.");
        }
    };

    /* Volver */
    $('gen-back').onclick = () => showScreen(screenPanel);
}

/* ----- Registro alumno (desde QR) ----- */

$('form-asistencia-alumno').addEventListener("submit", e => {
    e.preventDefault();

    const nombre = $('alumno-nombre').value.trim();
    const dni = $('alumno-dni').value.trim();
    const materia = $('asistencia-materia').textContent;

    if (!nombre || !dni) return;

    const key = "as_" + materia;
    const lista = JSON.parse(localStorage.getItem(key) || "[]");

    lista.push({
        nombre,
        dni,
        fecha: new Date().toLocaleString()
    });

    localStorage.setItem(key, JSON.stringify(lista));

    $('asistencia-ok').textContent = "Asistencia registrada correctamente ✔";
    $('alumno-nombre').value = "";
    $('alumno-dni').value = "";

    setTimeout(() => $('asistencia-ok').textContent="", 2500);
});
/* ----- PARTE 3/3: Ver asistencias, exportar CSV, navegación ----- */

/* Mostrar lista de asistencias por materia (Panel docente) */
$('btn-view-attendance').addEventListener('click', () => {
    renderAttendances();
    showScreen(screenAttendances);
});

/* Volver desde listado */
$('att-back').addEventListener('click', () => showScreen(screenPanel));

function renderAttendances(){
    const cont = $('att-list');
    cont.innerHTML = '';

    SUBJECTS.forEach(materia => {
        const key = "as_" + materia;
        const list = JSON.parse(localStorage.getItem(key) || "[]");

        const card = document.createElement('div');
        card.className = 'att-card';
        card.innerHTML = `
            <div style="display:flex;justify-content:space-between;align-items:center">
                <div>
                    <strong>${materia}</strong>
                    <div class="muted small">${list.length} registros</div>
                </div>
                <div>
                    <button class="btn small export-btn" data-materia="${materia}">Exportar CSV</button>
                </div>
            </div>
        `;

        const rows = document.createElement('div');
        rows.style.marginTop = '8px';

        if(list.length){
            list.slice().reverse().forEach(item => {
                const r = document.createElement('div');
                r.className = 'att-row';
                r.innerHTML = `<div><strong>${escapeHtml(item.nombre)}</strong><div class="muted small">DNI: ${escapeHtml(item.dni)}</div></div>
                               <div class="muted small">${escapeHtml(item.fecha)}</div>`;
                rows.appendChild(r);
            });
        } else {
            rows.innerHTML = `<div class="muted small">No hubo registros aún.</div>`;
        }

        card.appendChild(rows);
        cont.appendChild(card);
    });

    // listeners export
    cont.querySelectorAll('.export-btn').forEach(b => {
        b.addEventListener('click', () => {
            exportCSV(b.dataset.materia);
        });
    });
}

/* Export CSV */
function exportCSV(materia){
    const key = "as_" + materia;
    const list = JSON.parse(localStorage.getItem(key) || "[]");
    if(!list.length){ alert("No hay registros para exportar."); return; }

    const rows = [['Nombre','DNI','Fecha y hora']];
    list.forEach(r => rows.push([r.nombre, r.dni, r.fecha]));
    const csv = rows.map(r => r.map(cell => `"${String(cell).replace(/"/g,'""')}"`).join(',')).join('\n');

    const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `asistencias_${materia.replace(/\s+/g,'_')}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

/* Logout (si tenés botón) */
const btnLogout = document.getElementById('btn-logout');
if(btnLogout){
    btnLogout.addEventListener('click', () => {
        showScreen(screenLogin);
    });
}

/* escapeHtml util */
function escapeHtml(s){
    return String(s||'').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}

/* On load: si vino por QR (params) ya mostramos pantalla alumno al inicio arriba.
   Si no vino por QR, mostramos login por defecto.
*/
window.addEventListener('load', () => {
    const paramsNow = new URLSearchParams(window.location.search);
    const s = paramsNow.get('subject');
    const i = paramsNow.get('id');

    if (s && i) {
        // se mostró ya al inicio, pero aseguramos que el form y labels estén correctos
        const screenAlumno = document.getElementById("screen-asistencia-alumno");
        if(screenAlumno){
            showScreen(screenAlumno);
            document.getElementById("asistencia-materia").textContent = s;
        }
    } else {
        showScreen(screenLogin);
    }
});

/* Exponer util para debug en consola */
window._asist = {
    SUBJECTS,
    clearAllData: () => localStorage.clear()
};



