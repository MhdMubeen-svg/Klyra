// ═══════════════════════════════════════════
// GLOBAL STATE
// ═══════════════════════════════════════════
let students = [];
let currentUser = null;
let currentStep = 1;
const TOTAL_STEPS = 4;

let chipVals = { sports: 0, outer_programs: 0, leader: 0 };

// ═══════════════════════════════════════════
// SAFE GET ELEMENT
// ═══════════════════════════════════════════
function get(id) {
  return document.getElementById(id);
}

// ═══════════════════════════════════════════
// XSS PROTECTION
// ═══════════════════════════════════════════
function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ═══════════════════════════════════════════
// AUTH — SHOW PANEL
// ═══════════════════════════════════════════
function showPanel(id) {
  document.querySelectorAll('.auth-form-panel').forEach(p => p.classList.remove('active'));
  const panel = get(id);
  if (panel) panel.classList.add('active');
}

// ═══════════════════════════════════════════
// AUTH — TOGGLE PASSWORD VISIBILITY
// ═══════════════════════════════════════════
function togglePw(inputId, btn) {
  const inp = get(inputId);
  if (!inp) return;
  if (inp.type === 'password') {
    inp.type = 'text';
    btn.textContent = 'Hide';
  } else {
    inp.type = 'password';
    btn.textContent = 'Show';
  }
}

// ═══════════════════════════════════════════
// AUTH — LOGIN
// ═══════════════════════════════════════════
async function doLogin() {
  const ident = get('loginUser')?.value?.trim();
  const pw = get('loginPw')?.value;

  // Clear previous errors
  document.querySelectorAll('.auth-err-msg').forEach(e => e.classList.remove('show'));
  const alert = get('loginAlert');
  if (alert) { alert.className = 'auth-alert'; alert.textContent = ''; }

  let hasErr = false;
  if (!ident) { get('err-loginUser')?.classList.add('show'); hasErr = true; }
  if (!pw) { get('err-loginPw')?.classList.add('show'); hasErr = true; }
  if (hasErr) return;

  const btn = document.querySelector('#panelLogin .auth-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Signing in...'; }
  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: ident, password: pw })
    });
    const data = await res.json();
    if (data.ok) {
      currentUser = data.user;
      get('authScreen').style.display = 'none';
      updateUserUI();
      loadStudents();
    } else {
      if (alert) { alert.className = 'auth-alert error'; alert.textContent = data.msg || 'Login failed'; }
    }
  } catch (e) {
    if (alert) { alert.className = 'auth-alert error'; alert.textContent = 'Server error. Please try again.'; }
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Sign In →'; }
  }
}

// ═══════════════════════════════════════════
// AUTH — SIGNUP
// ═══════════════════════════════════════════
async function doSignup() {
  const fn = get('signupFirst')?.value?.trim();
  const ln = get('signupLast')?.value?.trim() || '';
  const un = get('signupUser')?.value?.trim();
  const em = get('signupEmail')?.value?.trim();
  const pw = get('signupPw')?.value;
  const pwc = get('signupPwConfirm')?.value;
  const agree = get('signupAgree')?.checked;

  document.querySelectorAll('.auth-err-msg').forEach(e => e.classList.remove('show'));
  const alert = get('signupAlert');
  if (alert) { alert.className = 'auth-alert'; alert.textContent = ''; }

  let hasErr = false;
  if (!fn) { get('err-signupFirst')?.classList.add('show'); hasErr = true; }
  if (!un || un.length < 3) { get('err-signupUser')?.classList.add('show'); hasErr = true; }
  const emailRegex = /^[a-zA-Z0-9]+@gmail\.com$/i;
  if (!em || !emailRegex.test(em)) {
    const errEl = get('err-signupEmail');
    if (errEl) {
      errEl.textContent = 'Please use only letters and numbers (example: user123@gmail.com)';
      errEl.classList.add('show');
    }
    hasErr = true;
  }
  if (!pw || pw.length < 6) { get('err-signupPw')?.classList.add('show'); hasErr = true; }
  if (pw !== pwc) { get('err-signupPwConfirm')?.classList.add('show'); hasErr = true; }
  if (hasErr) return;

  if (!agree) {
    if (alert) { alert.className = 'auth-alert error'; alert.textContent = 'Please agree to the Terms of Service.'; }
    return;
  }

  const btn = document.querySelector('#panelSignup .auth-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Creating account...'; }
  try {
    const res = await fetch('/api/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ firstName: fn, lastName: ln, username: un, email: em, password: pw })
    });
    const data = await res.json();
    if (data.ok) {
      currentUser = data.user;
      get('authScreen').style.display = 'none';
      updateUserUI();
      loadStudents();
    } else {
      if (alert) { alert.className = 'auth-alert error'; alert.textContent = data.msg || 'Signup failed'; }
    }
  } catch (e) {
    if (alert) { alert.className = 'auth-alert error'; alert.textContent = 'Server error. Please try again.'; }
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Create Account →'; }
  }
}

// ═══════════════════════════════════════════
// AUTH — FORGOT PASSWORD
// ═══════════════════════════════════════════
async function doForgot() {
  const un = get('forgotUser')?.value?.trim();
  const alert = get('forgotAlert');
  document.querySelectorAll('.auth-err-msg').forEach(e => e.classList.remove('show'));
  if (alert) { alert.className = 'auth-alert'; alert.textContent = ''; }

  if (!un) {
    get('err-forgotUser')?.classList.add('show');
    return;
  }

  try {
    const res = await fetch('/api/check-username?u=' + encodeURIComponent(un));
    const data = await res.json();
    if (data.taken) {
      if (alert) { alert.className = 'auth-alert success'; alert.textContent = 'Account found! Please contact admin to reset your password, or try logging in again.'; }
    } else {
      if (alert) { alert.className = 'auth-alert error'; alert.textContent = 'No account found with that username.'; }
    }
  } catch (e) {
    if (alert) { alert.className = 'auth-alert error'; alert.textContent = 'Server error.'; }
  }
}

// ═══════════════════════════════════════════
// AUTH — CHECK USERNAME AVAILABILITY
// ═══════════════════════════════════════════
let usernameTimer = null;
function checkUsername() {
  const un = get('signupUser')?.value?.trim();
  const errEl = get('err-signupUser');
  if (!un || un.length < 3) { errEl?.classList.remove('show'); return; }

  clearTimeout(usernameTimer);
  usernameTimer = setTimeout(async () => {
    try {
      const res = await fetch('/api/check-username?u=' + encodeURIComponent(un));
      const data = await res.json();
      if (data.taken) {
        if (errEl) { errEl.textContent = 'Username already taken'; errEl.classList.add('show'); }
      } else {
        errEl?.classList.remove('show');
      }
    } catch (e) { }
  }, 400);
}

// ═══════════════════════════════════════════
// AUTH — PASSWORD STRENGTH METER
// ═══════════════════════════════════════════
function checkStrength() {
  const pw = get('signupPw')?.value || '';
  const fill = get('strengthFill');
  const label = get('strengthLabel');
  if (!fill || !label) return;

  let score = 0;
  if (pw.length >= 6) score++;
  if (pw.length >= 10) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;

  const levels = [
    { w: '0%', c: 'var(--border)', t: '' },
    { w: '20%', c: 'var(--danger)', t: 'Very Weak' },
    { w: '40%', c: 'var(--warn)', t: 'Weak' },
    { w: '60%', c: 'var(--gold)', t: 'Fair' },
    { w: '80%', c: 'var(--accent)', t: 'Strong' },
    { w: '100%', c: 'var(--success)', t: 'Very Strong' },
  ];

  const lv = levels[score];
  fill.style.width = lv.w;
  fill.style.background = lv.c;
  label.textContent = lv.t;
  label.style.color = lv.c;
}

// ═══════════════════════════════════════════
// AUTH — LOGOUT
// ═══════════════════════════════════════════
async function doLogout() {
  try { await fetch('/api/logout', { method: 'POST' }); } catch (e) { }
  currentUser = null;
  students = [];
  // Clear sensitive UI
  if (get('udName')) get('udName').textContent = '—';
  if (get('udEmail')) get('udEmail').textContent = '—';
  if (get('userAvatar')) get('userAvatar').textContent = '?';
  get('authScreen').style.display = 'flex';
  showPanel('panelLogin');
}

// ═══════════════════════════════════════════
// AUTH — UPDATE USER UI
// ═══════════════════════════════════════════
function updateUserUI() {
  if (!currentUser) return;
  const initial = (currentUser.firstName || '?')[0].toUpperCase();
  const fullName = (currentUser.firstName || '') + ' ' + (currentUser.lastName || '');

  if (get('userAvatar')) get('userAvatar').textContent = initial;
  if (get('udName')) get('udName').textContent = fullName.trim();
  if (get('udEmail')) get('udEmail').textContent = currentUser.email || '';

  // Dashboard profile elements
  if (get('pdashAvatar')) get('pdashAvatar').textContent = initial;
  if (get('profileBigAvatar')) get('profileBigAvatar').textContent = initial;
  if (get('profileFullName')) get('profileFullName').textContent = fullName.trim();
  if (get('profileUsername')) get('profileUsername').textContent = '@' + (currentUser.username || '');
  if (get('profileEmail')) get('profileEmail').textContent = currentUser.email || '';

  // Greeting
  const hr = new Date().getHours();
  let greet = hr < 12 ? 'Good morning' : hr < 18 ? 'Good afternoon' : 'Good evening';
  if (get('pdashGreeting')) get('pdashGreeting').textContent = greet;
  if (get('pdashName')) get('pdashName').textContent = fullName.trim() + "'s Dashboard";

  // Member since
  if (get('ps-joined') && currentUser.createdAt) get('ps-joined').textContent = currentUser.createdAt;
  if (get('pheroMember') && currentUser.createdAt) get('pheroMember').textContent = '📅 Joined ' + currentUser.createdAt;
  if (get('pheroDate')) get('pheroDate').textContent = '🗓 ' + new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ═══════════════════════════════════════════
// AUTH — CHECK SESSION ON LOAD
// ═══════════════════════════════════════════
async function checkSession() {
  try {
    const res = await fetch('/api/me');
    const data = await res.json();
    if (data.ok && data.user) {
      currentUser = data.user;
      get('authScreen').style.display = 'none';
      updateUserUI();
      loadStudents();
    }
  } catch (e) { }
}

// ═══════════════════════════════════════════
// NAVIGATION
// ═══════════════════════════════════════════
function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));

  if (get('page-' + id)) get('page-' + id).classList.add('active');

  const tabs = { form: 0, dashboard: 1, analytics: 2 };
  const tabList = document.querySelectorAll('.nav-tab');
  if (tabList[tabs[id]]) tabList[tabs[id]].classList.add('active');

  if (id === 'dashboard') renderDashboard();
  if (id === 'analytics') renderAnalytics();
}

// ═══════════════════════════════════════════
// STEP NAVIGATION
// ═══════════════════════════════════════════
function goStep(dir) {
  if (dir === 1) {
    let hasErr = false;
    // ── Step 1: Basic Info ──
    if (currentStep === 1) {
      const name = get('name')?.value?.trim();
      const reg = get('register_no')?.value?.trim();
      const dept = get('dept')?.value;
      const sem = get('semester')?.value;
      const acad = get('acad_year')?.value;
      const gender = get('gender')?.value;

      if (!name) { if (get('err-name')) get('err-name').textContent = 'Name is required'; hasErr = true; }
      else { if (get('err-name')) get('err-name').textContent = ''; }
      if (!reg) { if (get('err-reg')) get('err-reg').textContent = 'Register number is required'; hasErr = true; }
      else { if (get('err-reg')) get('err-reg').textContent = ''; }
      if (!dept) { showToast('⚠️ Please select a Department'); hasErr = true; }
      if (!sem) { showToast('⚠️ Please select a Semester'); hasErr = true; }
      if (!acad) { showToast('⚠️ Please select Academic Year'); hasErr = true; }
      if (!gender) { showToast('⚠️ Please select Gender'); hasErr = true; }
    }
    // ── Step 2: Academic ──
    if (currentStep === 2) {
      const att = parseInt(get('attendance')?.value || '0');
      const hrs = parseInt(get('hour_study')?.value || '0');
      const internal = get('internal')?.value?.trim();
      if (att <= 0) { showToast('⚠️ Attendance must be greater than 0%'); hasErr = true; }
      if (hrs <= 0) { showToast('⚠️ Study Hours must be greater than 0'); hasErr = true; }
      if (!internal || internal === '' || isNaN(internal)) { showToast('⚠️ Internal Marks is required'); hasErr = true; }
    }
    if (hasErr) return;
  }

  if (dir === 1 && currentStep === TOTAL_STEPS) {
    submitStudent();
    return;
  }

  currentStep = Math.min(TOTAL_STEPS, Math.max(1, currentStep + dir));
  updateStepUI();

  if (currentStep === TOTAL_STEPS) buildReview();
}

function updateStepUI() {
  document.querySelectorAll('.form-section').forEach(s => s.classList.remove('active'));
  if (get('sec-' + currentStep)) get('sec-' + currentStep).classList.add('active');

  // Update step pills
  for (let i = 1; i <= TOTAL_STEPS; i++) {
    const pill = get('pill-' + i);
    if (!pill) continue;
    pill.classList.remove('active', 'done');
    if (i === currentStep) pill.classList.add('active');
    else if (i < currentStep) pill.classList.add('done');
  }

  // Update progress bar
  if (get('progressFill'))
    get('progressFill').style.width = (currentStep / TOTAL_STEPS * 100) + '%';

  // Update step count
  if (get('stepCount'))
    get('stepCount').textContent = `Step ${currentStep} of ${TOTAL_STEPS}`;

  // Show/hide prev button
  if (get('prevBtn'))
    get('prevBtn').style.visibility = currentStep === 1 ? 'hidden' : 'visible';

  // Update next button text
  if (get('nextBtn'))
    get('nextBtn').textContent = currentStep === TOTAL_STEPS ? 'Submit →' : 'Continue →';
}

// ═══════════════════════════════════════════
// BUILD REVIEW (Step 4)
// ═══════════════════════════════════════════
function buildReview() {
  const rc = get('reviewContent');
  if (!rc) return;
  const fields = [
    { l: 'Name', v: get('name')?.value || '—' },
    { l: 'Register No', v: get('register_no')?.value || '—' },
    { l: 'Department', v: get('dept')?.value || '—' },
    { l: 'Semester', v: get('semester')?.value || '—' },
    { l: 'Academic Year', v: get('acad_year')?.value || '—' },
    { l: 'Gender', v: get('gender')?.value || '—' },
    { l: 'Attendance', v: (get('attendance')?.value || 0) + '%' },
    { l: 'Study Hours', v: (get('hour_study')?.value || 0) + ' hrs/day' },
    { l: 'Internal', v: (get('internal')?.value || '—') + '/100' },
    { l: 'Arrears', v: get('arrears')?.value || '0' },
    { l: 'Projects', v: get('projects')?.value || '0' },
    { l: 'Internships', v: get('internships')?.value || '0' },
    { l: 'Sports', v: chipVals.sports ? 'Active' : 'None' },
    { l: 'Outer Programs', v: chipVals.outer_programs === 2 ? 'Won Awards' : chipVals.outer_programs === 1 ? 'Participated' : 'None' },
    { l: 'Certifications', v: get('certs')?.value || '0' },
    { l: 'Leadership', v: chipVals.leader === 2 ? 'Head/President' : chipVals.leader === 1 ? 'Member' : 'None' },
  ];
  rc.innerHTML = fields.map(f => `
    <div style="display:flex;justify-content:space-between;padding:8px 12px;background:var(--bg);border-radius:8px;font-size:.82rem">
      <span style="color:var(--muted)">${f.l}</span>
      <span style="font-weight:600">${f.v}</span>
    </div>
  `).join('');
}

// ═══════════════════════════════════════════
// SLIDER UPDATE
// ═══════════════════════════════════════════
function updateSlider(inputId, labelId, val, suffix) {
  const label = get(labelId);
  if (label) label.textContent = val + (suffix || '');
}

// ═══════════════════════════════════════════
// COUNTER ADJUST (+/-)
// ═══════════════════════════════════════════
function adjustCounter(id, delta, maxVal = 999) {
  const inp = get(id);
  if (!inp) return;
  let v = parseInt(inp.value) || 0;
  v = Math.max(0, v + delta);
  if (id === 'certs') v = Math.min(v, 100);
  inp.value = v;
  liveUpdate();
}

// ═══════════════════════════════════════════
// CHIP SELECT
// ═══════════════════════════════════════════
function selectChip(groupId, el, key, val) {
  const group = get(groupId);
  if (group) {
    group.querySelectorAll('.chip-option').forEach(c => c.classList.remove('selected'));
  }
  el.classList.add('selected');
  chipVals[key] = val;
  liveUpdate();
}

// ═══════════════════════════════════════════
// ACADEMIC YEAR OPTIONS
// ═══════════════════════════════════════════
function updateAcadYear() {
  const dept = get('dept')?.value || '';
  const sel = get('acad_year');
  if (!sel) return;

  const isEngg = dept.includes('B.E') || dept.includes('B.Tech');
  const years = isEngg ? 4 : 3;

  sel.innerHTML = '<option value="">Select batch year</option>';
  for (let start = 2000; start <= 2026; start++) {
    const end = start + years;
    const label = `${start} – ${end} (Batch ${start})`;
    sel.innerHTML += `<option>${label}</option>`;
  }
}

function updateSemesterOptions() {
  const dept = get('dept')?.value || '';
  const sel = get('semester');
  if (!sel) return;

  const isEngg = dept.includes('B.E') || dept.includes('B.Tech');
  const maxSem = isEngg ? 8 : 6;

  sel.innerHTML = '<option value="">Select semester</option>';
  const ordinals = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th'];
  for (let i = 0; i < maxSem; i += 2) {
    const yearNum = Math.floor(i / 2) + 1;
    let group = `<optgroup label="── Year ${yearNum} ──">`;
    group += `<option>${ordinals[i]} Semester</option>`;
    if (i + 1 < maxSem) group += `<option>${ordinals[i + 1]} Semester</option>`;
    group += '</optgroup>';
    sel.innerHTML += group;
  }
}

// ═══════════════════════════════════════════
// SCORE CALCULATION (CLIENT-SIDE)
// ═══════════════════════════════════════════
function calcScore() {
  const att = Math.min(parseInt(get('attendance')?.value) || 0, 100);
  const hrs = Math.min(parseInt(get('hour_study')?.value) || 0, 16);
  const internal = Math.min(parseInt(get('internal')?.value) || 0, 100);
  const projects = Math.min(parseInt(get('projects')?.value) || 0, 5);
  const internships = Math.min(parseInt(get('internships')?.value) || 0, 3);
  const sp = Math.min(chipVals.sports || 0, 1);
  const out = Math.min(chipVals.outer_programs || 0, 2);
  const lead = Math.min(chipVals.leader || 0, 2);
  const cert = Math.min(parseInt(get('certs')?.value) || 0, 3);
  const arrears = parseInt(get('arrears')?.value) || 0;

  let score = Math.max(0, Math.min(100, Math.round(
    att / 100 * 25 + hrs / 16 * 10 + internal / 100 * 25 +
    projects / 5 * 15 + internships / 3 * 10 + sp * 4 +
    out / 2 * 4 + lead / 2 * 4 + cert / 3 * 3
  )));

  return { score, arrears };
}

function getLevel(score, arrears) {
  if (arrears > 0 || score < 30) return 'ineligible';
  if (score >= 80) return 'advanced';
  if (score >= 60) return 'adv_intermediate';
  if (score >= 50) return 'intermediate';
  return 'basic';
}

// ═══════════════════════════════════════════
// LIVE UPDATE (score preview sidebar)
// ═══════════════════════════════════════════
function liveUpdate() {
  // Enforce Max Limits
  const intInp = get('internal');
  if (intInp && parseInt(intInp.value) > 100) intInp.value = 100;

  const arrInp = get('arrears');
  if (arrInp && parseInt(arrInp.value) > 50) arrInp.value = 50;

  const certInp = get('certs');
  if (certInp && parseInt(certInp.value) > 100) certInp.value = 100;

  const { score, arrears } = calcScore();
  const level = getLevel(score, arrears);

  // Ring
  const ringFg = get('ringFg');
  if (ringFg) {
    const circ = 2 * Math.PI * 54;
    const offset = circ - (score / 100) * circ;
    ringFg.style.strokeDasharray = circ;
    ringFg.style.strokeDashoffset = offset;
    // Color by level
    const colors = { ineligible: '#ef4444', basic: '#f59e0b', intermediate: '#3b82f6', adv_intermediate: '#8b5cf6', advanced: '#10b981' };
    ringFg.setAttribute('stroke', colors[level] || '#2563eb');
  }
  if (get('ringNum')) get('ringNum').textContent = score;

  // Level pill
  const pill = get('levelPill');
  if (pill) {
    const labels = { ineligible: '🔴 Not Eligible', basic: '🟡 Basic', intermediate: '🔵 Intermediate', adv_intermediate: '🟣 Adv. Intermediate', advanced: '🟢 Advanced' };
    pill.textContent = labels[level] || '— Not Evaluated';
    pill.className = 'level-pill level-' + (level === 'adv_intermediate' ? 'adv-intermediate' : level);
  }

  // Meters
  const att = parseInt(get('attendance')?.value) || 0;
  const hrs = parseInt(get('hour_study')?.value) || 0;
  const intl = parseInt(get('internal')?.value) || 0;
  const proj = parseInt(get('projects')?.value) || 0;
  const intern = parseInt(get('internships')?.value) || 0;

  if (get('m-att')) get('m-att').style.width = att + '%';
  if (get('mv-att')) get('mv-att').textContent = att;
  if (get('m-hrs')) get('m-hrs').style.width = (hrs / 16 * 100) + '%';
  if (get('mv-hrs')) get('mv-hrs').textContent = hrs;
  if (get('m-int')) get('m-int').style.width = intl + '%';
  if (get('mv-int')) get('mv-int').textContent = intl || '—';
  if (get('m-proj')) get('m-proj').style.width = (Math.min(proj, 5) / 5 * 100) + '%';
  if (get('mv-proj')) get('mv-proj').textContent = proj;
  if (get('m-intern')) get('m-intern').style.width = (Math.min(intern, 3) / 3 * 100) + '%';
  if (get('mv-intern')) get('mv-intern').textContent = intern;

  // Eligibility box
  const eb = get('eligBox');
  if (eb) {
    if (arrears > 0 || score < 30) {
      eb.className = 'eligibility-box elig-no';
      eb.innerHTML = '<span>❌</span> Not Eligible';
    } else {
      eb.className = 'eligibility-box elig-ok';
      eb.innerHTML = '<span>✅</span> Currently Eligible';
    }
  }

  // Summary sidebar
  if (get('s-name')) get('s-name').textContent = get('name')?.value || '—';
  if (get('s-reg')) get('s-reg').textContent = get('register_no')?.value || '—';
  if (get('s-att')) get('s-att').textContent = att + '%';
  if (get('s-hrs')) get('s-hrs').textContent = hrs + ' hrs';
  if (get('s-int')) get('s-int').textContent = intl || '—';
  if (get('s-proj')) get('s-proj').textContent = proj;
  if (get('s-intern')) get('s-intern').textContent = intern;
  if (get('s-arr')) get('s-arr').textContent = arrears;

  // Threshold marker
  const marker = get('scoreThresholdMarker');
  if (marker) {
    const labels = { ineligible: 'Not Eligible (<30)', basic: 'Basic (30–49)', intermediate: 'Intermediate (50–59)', adv_intermediate: 'Adv. Intermediate (60–79)', advanced: 'Advanced (80–100)' };
    marker.textContent = '▲ ' + score + ' — ' + (labels[level] || '');
  }
}

// ═══════════════════════════════════════════
// VALIDATION
// ═══════════════════════════════════════════
function validate() {
  const name = get('name')?.value?.trim();
  const reg = get('register_no')?.value?.trim();

  if (!name || !reg) {
    showToast("⚠ Fill all required fields");
    return false;
  }
  return true;
}

// ═══════════════════════════════════════════
// SUBMIT STUDENT (API)
// ═══════════════════════════════════════════
async function submitStudent() {
  if (!validate()) return;

  const { score, arrears } = calcScore();
  const level = getLevel(score, arrears);

  const student = {
    name: get('name').value.trim(),
    register_no: get('register_no').value.trim(),
    dept: get('dept')?.value || '',
    semester: get('semester')?.value || '',
    acad_year: get('acad_year')?.value || '',
    gender: get('gender')?.value || '',
    attendance: get('attendance')?.value || 0,
    hour_study: get('hour_study')?.value || 0,
    internal: get('internal')?.value || 0,
    arrears: arrears,
    projects: get('projects')?.value || 0,
    internships: get('internships')?.value || 0,
    sports: chipVals.sports || 0,
    outer_programs: chipVals.outer_programs || 0,
    certs: get('certs')?.value || 0,
    leader: chipVals.leader || 0,
    class_rank: get('class_rank')?.value || '',
    score, level
  };

  try {
    const res = await fetch('/api/students', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(student)
    });
    const result = await res.json();
    if (result.ok) {
      students.unshift(result.student);
      showResult(result.student);
      updateHeroStats();
      resetForm();
    } else {
      showToast("❌ " + (result.msg || "Error saving data"));
    }
  } catch (e) {
    showToast("❌ Server error");
  }
}

// ═══════════════════════════════════════════
// RESET FORM
// ═══════════════════════════════════════════
function resetForm() {
  if (get('name')) get('name').value = '';
  if (get('register_no')) get('register_no').value = '';
  if (get('dept')) get('dept').selectedIndex = 0;
  if (get('semester')) get('semester').selectedIndex = 0;
  if (get('acad_year')) get('acad_year').innerHTML = '<option value="">— Select department first —</option>';
  if (get('gender')) get('gender').selectedIndex = 0;
  if (get('attendance')) { get('attendance').value = 0; updateSlider('attendance', 'att-val', '0', '%'); }
  if (get('hour_study')) { get('hour_study').value = 0; updateSlider('hour_study', 'hrs-val', '0', ' hrs'); }
  if (get('internal')) get('internal').value = '';
  if (get('arrears')) get('arrears').value = '0';
  if (get('class_rank')) get('class_rank').value = '';
  if (get('projects')) get('projects').value = '0';
  if (get('internships')) get('internships').value = '0';
  if (get('certs')) get('certs').value = '0';
  chipVals = { sports: 0, outer_programs: 0, leader: 0 };

  currentStep = 1;
  updateStepUI();
  liveUpdate();
}

// ═══════════════════════════════════════════
// RESULT MODAL
// ═══════════════════════════════════════════
function showResult(s) {
  const overlay = get('resultOverlay');
  if (!overlay) return;

  const score = s.score;
  const level = s.level;

  if (get('modalScore')) get('modalScore').textContent = score;

  const titleMap = {
    advanced: 'Advanced – Outstanding!',
    adv_intermediate: 'Advanced Intermediate – Great Work!',
    intermediate: 'Intermediate – Good Effort',
    basic: 'Basic – Needs Improvement',
    ineligible: 'Not Eligible'
  };
  if (get('modalTitle')) get('modalTitle').textContent = titleMap[level] || level.toUpperCase();

  const subMap = {
    advanced: 'Exceptional performance! Keep up the excellent work to maintain this top tier.',
    adv_intermediate: 'Impressive performance! A few more projects or internships will take you to Advanced.',
    intermediate: 'Good performance! Increase your study hours and participation to reach the next level.',
    basic: 'Passing performance. Focus on improving your internal marks and attendance.',
    ineligible: 'Student has active arrears or score below 30. Clearance & improvement required.'
  };
  if (get('modalSub')) get('modalSub').textContent = subMap[level] || '';

  const colorMap = {
    advanced: '#d1fae5',
    adv_intermediate: '#e0e7ff',
    intermediate: '#dbeafe',
    basic: '#fef3c7',
    ineligible: '#ffe4e6'
  };
  const iconMap = {
    advanced: '🌟',
    adv_intermediate: '🌟',
    intermediate: '👍',
    basic: '⚠️',
    ineligible: '❌'
  };
  if (get('modalIcon')) get('modalIcon').textContent = iconMap[level] || '🎓';

  const band = get('modalBand');
  if (band) {
    band.style.background = colorMap[level] || colorMap.basic;
    band.style.color = '#111827';
  }

  // Result grid
  const grid = get('modalGrid');
  if (grid) {
    grid.innerHTML = [
      { l: 'Attendance', v: s.attendance + '%' },
      { l: 'Study Hours', v: s.hour_study + ' hrs' },
      { l: 'Internal', v: s.internal + '/100' },
      { l: 'Projects', v: s.projects },
      { l: 'Internships', v: s.internships },
      { l: 'Arrears', v: s.arrears },
    ].map(f => `<div style="text-align:center;padding:12px;background:#f9fafb;border-radius:8px;border:1px solid #f3f4f6"><div style="font-size:1.15rem;font-weight:800;color:#111827">${f.v}</div><div style="font-size:.7rem;color:#6b7280;margin-top:2px">${f.l}</div></div>`).join('');
  }

  overlay.classList.add('show');
}

function closeModal() {
  const overlay = get('resultOverlay');
  if (overlay) overlay.classList.remove('show');
}

// ═══════════════════════════════════════════
// LOAD STUDENTS
// ═══════════════════════════════════════════
async function loadStudents() {
  try {
    const res = await fetch('/api/students');
    const data = await res.json();
    if (data.ok) {
      students = data.students;
      renderDashboard();
      updateHeroStats();
    }
  } catch (e) {
    console.log("Error loading students");
  }
}

// ═══════════════════════════════════════════
// HERO STATS (Form page)
// ═══════════════════════════════════════════
function updateHeroStats() {
  if (get('heroTotal')) get('heroTotal').textContent = students.length;
  if (get('heroAdvanced')) get('heroAdvanced').textContent = students.filter(s => s.level === 'advanced' || s.level === 'adv_intermediate').length;
  if (get('heroEligible')) get('heroEligible').textContent = students.filter(s => s.level !== 'ineligible').length;
  if (get('totalBadge')) get('totalBadge').textContent = students.length + ' student' + (students.length !== 1 ? 's' : '');
}

// ═══════════════════════════════════════════
// DASHBOARD — FULL RENDER
// ═══════════════════════════════════════════
function renderDashboard() {
  updateUserUI();
  updateHeroStats();

  // KPI stats
  const total = students.length;
  const adv = students.filter(s => s.level === 'advanced' || s.level === 'adv_intermediate').length;
  const avg = total ? Math.round(students.reduce((a, s) => a + s.score, 0) / total) : 0;
  const top = total ? Math.max(...students.map(s => s.score)) : 0;
  const topStudent = students.find(s => s.score === top);
  const avgAtt = total ? Math.round(students.reduce((a, s) => a + (s.attendance || 0), 0) / total) : 0;
  const inelig = students.filter(s => s.level === 'ineligible').length;

  if (get('pk-total')) get('pk-total').textContent = total;
  if (get('pk-adv')) get('pk-adv').textContent = adv;
  if (get('pk-avg')) get('pk-avg').textContent = total ? avg : '—';
  if (get('pk-top')) get('pk-top').textContent = total ? top : '—';
  if (get('pk-att')) get('pk-att').textContent = total ? avgAtt + '%' : '—';
  if (get('pk-inelig')) get('pk-inelig').textContent = inelig;

  if (get('pk-total-trend')) get('pk-total-trend').textContent = total ? 'Total evaluated' : 'No students yet';
  if (get('pk-adv-rate')) get('pk-adv-rate').textContent = total ? Math.round(adv / total * 100) + '% of total' : '';
  if (get('pk-top-name')) get('pk-top-name').textContent = topStudent ? topStudent.name : '';
  if (get('pk-inelig-rate')) get('pk-inelig-rate').textContent = total ? Math.round(inelig / total * 100) + '% of total' : '';
  if (get('ps-students')) get('ps-students').textContent = total;

  // Activity timeline
  const timeline = get('activityTimeline');
  if (timeline) {
    if (!total) {
      timeline.innerHTML = '<div style="padding:20px;text-align:center;color:var(--muted);font-size:.85rem">No activity yet</div>';
    } else {
      timeline.innerHTML = students.slice(0, 5).map(s => `
        <div style="display:flex;align-items:center;gap:12px;padding:10px 16px;border-bottom:1px solid var(--border)">
          <div style="width:36px;height:36px;border-radius:10px;background:rgba(37,99,235,.1);display:flex;align-items:center;justify-content:center;font-size:.9rem;flex-shrink:0">📝</div>
          <div style="flex:1;min-width:0">
            <div style="font-size:.82rem;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(s.name)}</div>
            <div style="font-size:.72rem;color:var(--muted)">${escapeHtml(s.dept) || 'No dept'} — Score: ${s.score}</div>
          </div>
          <div style="font-size:.7rem;color:var(--muted);flex-shrink:0">${escapeHtml(s.date_added) || ''}</div>
        </div>
      `).join('');
    }
  }

  // Performance breakdown
  const breakdown = get('breakdownLevels');
  if (breakdown) {
    const levels = [
      { key: 'advanced', label: 'Advanced', color: '#10b981', icon: '🟢' },
      { key: 'adv_intermediate', label: 'Adv. Intermediate', color: '#8b5cf6', icon: '🟣' },
      { key: 'intermediate', label: 'Intermediate', color: '#3b82f6', icon: '🔵' },
      { key: 'basic', label: 'Basic', color: '#f59e0b', icon: '🟡' },
      { key: 'ineligible', label: 'Not Eligible', color: '#ef4444', icon: '🔴' },
    ];
    breakdown.innerHTML = levels.map(lv => {
      const count = students.filter(s => s.level === lv.key).length;
      const pct = total ? Math.round(count / total * 100) : 0;
      return `
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;padding:0 16px">
          <span style="font-size:.85rem">${lv.icon}</span>
          <span style="font-size:.78rem;min-width:110px;color:var(--ink);font-weight:500">${lv.label}</span>
          <div style="flex:1;height:6px;background:var(--border);border-radius:3px;overflow:hidden">
            <div style="height:100%;width:${pct}%;background:${lv.color};border-radius:3px;transition:width .5s"></div>
          </div>
          <span style="font-size:.78rem;font-weight:700;min-width:30px;text-align:right">${count}</span>
        </div>
      `;
    }).join('');
    if (get('breakdownCount')) get('breakdownCount').textContent = total + ' students';
  }

  // Component averages
  const compAvgs = get('componentAvgs');
  if (compAvgs) {
    const comps = [
      { l: 'Attendance', key: 'attendance', max: 100, suf: '%' },
      { l: 'Study Hours', key: 'hour_study', max: 16, suf: ' hrs' },
      { l: 'Internal', key: 'internal', max: 100, suf: '/100' },
      { l: 'Projects', key: 'projects', max: 5, suf: '' },
      { l: 'Internships', key: 'internships', max: 3, suf: '' },
    ];
    compAvgs.innerHTML = comps.map(c => {
      const avgVal = total ? (students.reduce((a, s) => a + (s[c.key] || 0), 0) / total).toFixed(1) : '—';
      const pct = total ? (avgVal / c.max * 100) : 0;
      return `
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;padding:0 16px">
          <span style="font-size:.78rem;min-width:90px;color:var(--muted)">${c.l}</span>
          <div style="flex:1;height:6px;background:var(--border);border-radius:3px;overflow:hidden">
            <div style="height:100%;width:${pct}%;background:linear-gradient(90deg,var(--accent),var(--accent2));border-radius:3px"></div>
          </div>
          <span style="font-size:.78rem;font-weight:700;min-width:40px;text-align:right">${avgVal}${total ? c.suf : ''}</span>
        </div>
      `;
    }).join('');
  }

  // Top performers
  const topList = get('topPerformersList');
  if (topList) {
    const sorted = [...students].sort((a, b) => b.score - a.score).slice(0, 5);
    if (!sorted.length) {
      topList.innerHTML = '<div style="padding:16px;text-align:center;color:var(--muted);font-size:.85rem">No data</div>';
    } else {
      const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];
      topList.innerHTML = sorted.map((s, i) => `
        <div style="display:flex;align-items:center;gap:10px;padding:10px 16px;border-bottom:1px solid var(--border)">
          <span style="font-size:1.1rem">${medals[i] || ''}</span>
          <div style="flex:1;min-width:0">
            <div style="font-size:.82rem;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(s.name)}</div>
            <div style="font-size:.7rem;color:var(--muted)">${escapeHtml(s.dept) || ''}</div>
          </div>
          <div style="font-size:.88rem;font-weight:800;color:var(--primary)">${s.score}</div>
        </div>
      `).join('');
    }
  }

  // Dept split
  const deptSplit = get('deptSplit');
  if (deptSplit) {
    const depts = {};
    students.forEach(s => { const d = s.dept || 'Unknown'; depts[d] = (depts[d] || 0) + 1; });
    const entries = Object.entries(depts).sort((a, b) => b[1] - a[1]);
    if (!entries.length) {
      deptSplit.innerHTML = '<div style="padding:16px;text-align:center;color:var(--muted);font-size:.85rem">No data</div>';
    } else {
      deptSplit.innerHTML = entries.slice(0, 6).map(([d, c]) => {
        const pct = Math.round(c / total * 100);
        return `
          <div style="padding:8px 16px">
            <div style="display:flex;justify-content:space-between;font-size:.78rem;margin-bottom:4px">
              <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:160px">${escapeHtml(d)}</span>
              <span style="font-weight:700">${c}</span>
            </div>
            <div style="height:5px;background:var(--border);border-radius:3px;overflow:hidden">
              <div style="width:${pct}%;height:100%;background:var(--accent);border-radius:3px"></div>
            </div>
          </div>
        `;
      }).join('');
    }
  }

  // Render table
  renderTable();
}

// ═══════════════════════════════════════════
// TABLE RENDER (with filter/sort/search)
// ═══════════════════════════════════════════
function renderTable() {
  const tbody = get('tableBody');
  if (!tbody) return;

  let filtered = [...students];

  // Level filter
  const levelFilter = get('levelFilter')?.value;
  if (levelFilter) filtered = filtered.filter(s => s.level === levelFilter);

  // Search
  const search = (get('searchInput')?.value || '').toLowerCase().trim();
  if (search) {
    filtered = filtered.filter(s =>
      (s.name || '').toLowerCase().includes(search) ||
      (s.register_no || '').toLowerCase().includes(search)
    );
  }

  // Sort
  const sortBy = get('sortBy')?.value || 'score';
  if (sortBy === 'name') filtered.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  else if (sortBy === 'attendance') filtered.sort((a, b) => (b.attendance || 0) - (a.attendance || 0));
  else if (sortBy === 'internal') filtered.sort((a, b) => (b.internal || 0) - (a.internal || 0));
  else filtered.sort((a, b) => b.score - a.score);

  if (get('recordCount')) get('recordCount').textContent = '(' + filtered.length + ' of ' + students.length + ')';

  if (!filtered.length) {
    tbody.innerHTML = '<tr><td colspan="12"><div class="empty-state"><div class="empty-icon">📭</div><p>No students found.</p></div></td></tr>';
    return;
  }

  const levelBadge = (lv) => {
    const map = {
      advanced: { bg: '#d1fae5', c: '#065f46', t: 'Advanced' },
      adv_intermediate: { bg: '#ede9fe', c: '#5b21b6', t: 'Adv. Inter.' },
      intermediate: { bg: '#dbeafe', c: '#1e40af', t: 'Intermediate' },
      basic: { bg: '#fef3c7', c: '#92400e', t: 'Basic' },
      ineligible: { bg: '#fee2e2', c: '#991b1b', t: 'Not Eligible' }
    };
    const m = map[lv] || map.basic;
    return `<span style="padding:3px 10px;border-radius:12px;font-size:.72rem;font-weight:700;background:${m.bg};color:${m.c}">${m.t}</span>`;
  };

  tbody.innerHTML = filtered.map((s, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>
        <div style="font-weight:600">${escapeHtml(s.name)}</div>
        <div style="font-size:.72rem;color:var(--muted)">${escapeHtml(s.register_no)}</div>
      </td>
      <td style="font-size:.78rem">${escapeHtml(s.dept) || '—'}</td>
      <td style="font-size:.78rem">${escapeHtml(s.semester) || '—'}</td>
      <td style="font-size:.78rem">${escapeHtml(s.acad_year) || '—'}</td>
      <td>${s.attendance || 0}%</td>
      <td>${s.hour_study || 0}</td>
      <td>${s.internal || 0}</td>
      <td style="color:${(s.arrears || 0) > 0 ? 'var(--danger)' : 'inherit'};font-weight:${(s.arrears || 0) > 0 ? '700' : '400'}">${s.arrears || 0}</td>
      <td><strong>${s.score}</strong></td>
      <td>${levelBadge(s.level)}</td>
      <td><button onclick="deleteStudent(${s.id})" style="background:none;border:none;cursor:pointer;font-size:1rem;opacity:.5;transition:.2s" onmouseover="this.style.opacity=1" onmouseout="this.style.opacity=.5" title="Delete">🗑</button></td>
    </tr>
  `).join('');
}

// ═══════════════════════════════════════════
// DELETE STUDENT
// ═══════════════════════════════════════════
async function deleteStudent(id) {
  if (!confirm('Delete this student record?')) return;
  try {
    const res = await fetch('/api/students/' + id, { method: 'DELETE' });
    const data = await res.json();
    if (data.ok) {
      students = students.filter(s => s.id !== id);
      renderDashboard();
      updateHeroStats();
      showToast('✅ Student deleted');
    } else {
      showToast('❌ ' + (data.msg || 'Error deleting'));
    }
  } catch (e) {
    showToast('❌ Error deleting');
  }
}

// ═══════════════════════════════════════════
// CLEAR ALL STUDENTS
// ═══════════════════════════════════════════
async function clearAllStudents() {
  if (!confirm('⚠ Delete ALL student records? This cannot be undone.')) return;
  try {
    await fetch('/api/students/clear', { method: 'DELETE' });
    students = [];
    renderDashboard();
    updateHeroStats();
    showToast('🗑 All records cleared');
  } catch (e) {
    showToast('❌ Error clearing');
  }
}

// ═══════════════════════════════════════════
// EXPORT CSV
// ═══════════════════════════════════════════
function exportCSV() {
  if (!students.length) { showToast('No data to export'); return; }
  const headers = ['Name', 'Register No', 'Department', 'Semester', 'Academic Year', 'Gender', 'Attendance', 'Study Hours', 'Internal', 'Arrears', 'Projects', 'Internships', 'Sports', 'Outer Programs', 'Certs', 'Leader', 'Class Rank', 'Score', 'Level', 'Date Added'];
  const rows = students.map(s => [
    s.name, s.register_no, s.dept, s.semester, s.acad_year, s.gender,
    s.attendance, s.hour_study, s.internal, s.arrears, s.projects,
    s.internships, s.sports, s.outer_programs, s.certs, s.leader,
    s.class_rank, s.score, s.level, s.date_added
  ]);

  let csv = headers.join(',') + '\n';
  rows.forEach(r => {
    csv += r.map(v => '"' + (v ?? '').toString().replace(/"/g, '""') + '"').join(',') + '\n';
  });

  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'mubeen_students_' + new Date().toISOString().slice(0, 10) + '.csv';
  a.click();
  URL.revokeObjectURL(url);
  showToast('✅ CSV downloaded');
}

// ═══════════════════════════════════════════
// ANALYTICS
// ═══════════════════════════════════════════
function renderAnalytics() {
  // Bar chart — score distribution
  const barChart = get('barChart');
  if (barChart) {
    const ranges = [
      { label: '0–29', min: 0, max: 29, color: '#ef4444' },
      { label: '30–49', min: 30, max: 49, color: '#f59e0b' },
      { label: '50–59', min: 50, max: 59, color: '#3b82f6' },
      { label: '60–79', min: 60, max: 79, color: '#8b5cf6' },
      { label: '80–100', min: 80, max: 100, color: '#10b981' },
    ];

    const maxCount = Math.max(1, ...ranges.map(r => students.filter(s => s.score >= r.min && s.score <= r.max).length));

    barChart.innerHTML = `<div style="display:flex;align-items:flex-end;gap:12px;height:150px;padding:0 8px">` +
      ranges.map(r => {
        const count = students.filter(s => s.score >= r.min && s.score <= r.max).length;
        const h = Math.max(4, count / maxCount * 130);
        return `<div style="flex:1;text-align:center">
          <div style="font-size:.72rem;font-weight:700;margin-bottom:4px">${count}</div>
          <div style="height:${h}px;background:${r.color};border-radius:6px 6px 0 0;transition:height .5s"></div>
          <div style="font-size:.68rem;color:var(--muted);margin-top:6px">${r.label}</div>
        </div>`;
      }).join('') + '</div>';
  }

  // Donut chart
  const arcs = get('donutArcs');
  const legend = get('donutLegend');
  if (arcs && legend) {
    const levels = [
      { key: 'advanced', label: 'Advanced', color: '#10b981' },
      { key: 'adv_intermediate', label: 'Adv. Inter.', color: '#8b5cf6' },
      { key: 'intermediate', label: 'Intermediate', color: '#3b82f6' },
      { key: 'basic', label: 'Basic', color: '#f59e0b' },
      { key: 'ineligible', label: 'Not Eligible', color: '#ef4444' },
    ];

    const total = students.length || 1;
    const circ = 2 * Math.PI * 45;
    let offset = 0;
    arcs.innerHTML = '';

    levels.forEach(lv => {
      const count = students.filter(s => s.level === lv.key).length;
      const pct = count / total;
      if (pct > 0) {
        const dash = pct * circ;
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', '60');
        circle.setAttribute('cy', '60');
        circle.setAttribute('r', '45');
        circle.setAttribute('fill', 'none');
        circle.setAttribute('stroke', lv.color);
        circle.setAttribute('stroke-width', '18');
        circle.setAttribute('stroke-dasharray', dash + ' ' + (circ - dash));
        circle.setAttribute('stroke-dashoffset', -offset);
        circle.setAttribute('transform', 'rotate(-90 60 60)');
        arcs.appendChild(circle);
        offset += dash;
      }
    });

    legend.innerHTML = levels.map(lv => {
      const count = students.filter(s => s.level === lv.key).length;
      return `<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
        <div style="width:10px;height:10px;border-radius:3px;background:${lv.color};flex-shrink:0"></div>
        <span style="font-size:.78rem;color:var(--ink)">${lv.label}</span>
        <span style="font-size:.78rem;font-weight:700;margin-left:auto">${count}</span>
      </div>`;
    }).join('');
  }

  // Scatter info (study hours vs attendance)
  const scatterInfo = get('scatterInfo');
  if (scatterInfo) {
    if (!students.length) {
      scatterInfo.innerHTML = '<div style="color:var(--muted);font-size:.85rem;text-align:center;padding:40px 0">Add students to see trends</div>';
    } else {
      const avgAtt = (students.reduce((a, s) => a + (s.attendance || 0), 0) / students.length).toFixed(1);
      const avgHrs = (students.reduce((a, s) => a + (s.hour_study || 0), 0) / students.length).toFixed(1);
      scatterInfo.innerHTML = `
        <div style="display:flex;gap:24px;justify-content:center;padding:30px 0">
          <div style="text-align:center">
            <div style="font-size:1.8rem;font-weight:800;color:var(--primary)">${avgAtt}%</div>
            <div style="font-size:.78rem;color:var(--muted);margin-top:4px">Avg. Attendance</div>
          </div>
          <div style="width:1px;background:var(--border)"></div>
          <div style="text-align:center">
            <div style="font-size:1.8rem;font-weight:800;color:var(--accent)">${avgHrs} hrs</div>
            <div style="font-size:.78rem;color:var(--muted);margin-top:4px">Avg. Study Hours</div>
          </div>
        </div>
      `;
    }
  }

  // Top 5 performers (analytics page)
  const topPerf = get('topPerformers');
  if (topPerf) {
    const sorted = [...students].sort((a, b) => b.score - a.score).slice(0, 5);
    if (!sorted.length) {
      topPerf.innerHTML = '<div style="padding:20px;text-align:center;color:var(--muted);font-size:.85rem">No data</div>';
    } else {
      topPerf.innerHTML = sorted.map((s, i) => {
        const pct = s.score;
        return `
          <div style="display:flex;align-items:center;gap:10px;padding:8px 12px">
            <span style="font-weight:800;font-size:.85rem;color:var(--muted);min-width:20px">${i + 1}</span>
            <div style="flex:1;min-width:0">
              <div style="font-size:.82rem;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(s.name)}</div>
              <div style="height:5px;background:var(--border);border-radius:3px;margin-top:4px;overflow:hidden">
                <div style="height:100%;width:${pct}%;background:linear-gradient(90deg,var(--accent),var(--accent2));border-radius:3px"></div>
              </div>
            </div>
            <span style="font-weight:800;font-size:.92rem;color:var(--primary)">${s.score}</span>
          </div>
        `;
      }).join('');
    }
  }
}

// ═══════════════════════════════════════════
// TOAST
// ═══════════════════════════════════════════
function showToast(msg) {
  const t = get('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}

// ═══════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════
document.addEventListener("DOMContentLoaded", () => {
  checkSession();
  liveUpdate();

  // User dropdown menu logic
  const avatar = document.getElementById('userAvatar');
  const dropdown = document.querySelector('.user-dropdown');
  if (avatar && dropdown) {
    avatar.addEventListener('click', function (e) {
      e.stopPropagation();
      dropdown.classList.toggle('open');
    });
    document.addEventListener('click', function (e) {
      if (!dropdown.contains(e.target) && !avatar.contains(e.target)) {
        dropdown.classList.remove('open');
      }
    });
    const logoutBtn = dropdown.querySelector('.ud-logout');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', function () {
        dropdown.classList.remove('open');
      });
    }
  }
});