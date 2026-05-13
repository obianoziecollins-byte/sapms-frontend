import React from 'react';
import useIsMobile from '../hooks/useIsMobile';

const T = {
  primary:'#003366',primaryLight:'#e8eef5',
  success:'#1a7a4a',successLight:'#e6f4ed',successBorder:'#a8d5b9',
  warning:'#7a4f00',warningLight:'#fdf3dc',warningBorder:'#f5cc7a',
  danger:'#8b1a1a',dangerLight:'#fdeaea',dangerBorder:'#f5c6cb',
  surface:'#ffffff',border:'#dde3ec',text:'#1a2332',textMuted:'#64748b',textLight:'#94a3b8',
};
const GRADE_POINTS = { A:5, B:4, C:3, D:2, F:0, IP:null };
const LEVEL_LABELS = { 100:'100L — Year One', 200:'200L — Year Two', 300:'200L — Year Three', 400:'400L — Final Year' };
const GRADE_ORDER  = ['F','D','C','B','A'];

const meetsMinGrade = (actual, min) =>
  GRADE_ORDER.indexOf(actual) >= GRADE_ORDER.indexOf(min);

// ── Rule engine ────────────────────────────────────────────────────────────────
const validateProfile = (profile, prerequisites = []) => {
  const violations = [];
  if (!profile) return violations;
  const enrollments = profile.enrollments || [];

  if (profile.is_on_probation)
    violations.push({ type:'danger', msg:`CGPA of ${parseFloat(profile.cgpa).toFixed(2)} is ≤ 1.50 — student is on academic probation.` });

  if (!profile.first_name || !profile.last_name)
    violations.push({ type:'warning', msg:'First name and/or last name are missing from your profile.' });

  if (!profile.specialization)
    violations.push({ type:'warning', msg:'No specialization selected. Update your profile to receive career recommendations.' });

  // Credit overload per semester
  const bysSem = {};
  enrollments.forEach(e => {
    bysSem[e.semester] = (bysSem[e.semester] || 0) + (e.course?.credit_units || 0);
  });
  Object.entries(bysSem).forEach(([sem, total]) => {
    if (total > 24)
      violations.push({ type:'danger', msg:`${sem} semester: ${total} credit units exceeds the maximum of 24.` });
  });

  // Course level vs student level
  enrollments.forEach(e => {
    const m = (e.course?.course_code || '').match(/(\d)/);
    if (m) {
      const cLevel = parseInt(m[1]) * 100;
      if (cLevel > profile.level)
        violations.push({ type:'warning', msg:`${e.course?.course_code} is a ${cLevel}L course but your level is ${profile.level}L.` });
    }
  });

  // Failed courses
  enrollments.filter(e => e.grade === 'F').forEach(e =>
    violations.push({ type:'danger', msg:`${e.course?.course_code} (${e.course?.title}) — grade F requires retake.` })
  );

  // Prerequisite check
  prerequisites.forEach(prereq => {
    const enrolled = enrollments.find(e => e.course?.course_code === prereq.course_code);
    if (!enrolled) return; // not enrolled in this course, no violation to show
    const completed = enrollments.find(e =>
      e.course?.course_code === prereq.required_course_code &&
      e.grade !== 'IP' && e.grade !== 'F' &&
      meetsMinGrade(e.grade, prereq.min_grade)
    );
    if (!completed)
      violations.push({
        type:'danger',
        msg:`${prereq.course_code} requires ${prereq.required_course_code} (${prereq.required_course_title}) completed with min grade ${prereq.min_grade}.`,
      });
  });

  return violations;
};

const getCompleteness = (profile) => {
  if (!profile) return 0;
  const checks = [
    !!profile.first_name, !!profile.last_name, !!profile.student_id,
    !!profile.specialization, parseFloat(profile.cgpa) > 0,
    (profile.enrollments || []).length > 0,
  ];
  return Math.round(checks.filter(Boolean).length / checks.length * 100);
};

const gradeColor = g => ({ A:T.success, B:'#1a5c9a', C:T.warning, D:'#6b4500', F:T.danger }[g] || T.textMuted);

// ── Sub-components ─────────────────────────────────────────────────────────────
const StatCard = ({ label, value, sub, accent }) => (
  <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:'10px', padding:'16px 18px', borderTop:`3px solid ${accent}` }}>
    <div style={{ fontSize:'12px', color:T.textMuted, marginBottom:'6px' }}>{label}</div>
    <div style={{ fontSize:'26px', fontWeight:'700', color:T.text, lineHeight:1 }}>{value}</div>
    {sub && <div style={{ fontSize:'12px', color:T.textMuted, marginTop:'5px' }}>{sub}</div>}
  </div>
);

const ProgressBar = ({ label, current, max, color }) => {
  const pct = max > 0 ? Math.min(100, Math.round(current / max * 100)) : 0;
  return (
    <div style={{ marginBottom:'12px' }}>
      <div style={{ display:'flex', justifyContent:'space-between', fontSize:'12px', color:T.textMuted, marginBottom:'5px' }}>
        <span>{label}</span><span style={{ fontWeight:'600', color:T.text }}>{current} / {max} units</span>
      </div>
      <div style={{ height:'5px', background:'#edf0f5', borderRadius:'100px', overflow:'hidden' }}>
        <div style={{ height:'100%', width:`${pct}%`, background:color, borderRadius:'100px', transition:'width 0.6s ease' }}/>
      </div>
    </div>
  );
};

const VBadge = ({ type }) => {
  const s = type === 'danger'
    ? { bg:T.dangerLight, color:T.danger, border:T.dangerBorder, label:'Error' }
    : { bg:T.warningLight, color:T.warning, border:T.warningBorder, label:'Warning' };
  return (
    <span style={{ display:'inline-block', padding:'1px 7px', borderRadius:'100px', fontSize:'10px', fontWeight:'700',
      background:s.bg, color:s.color, border:`1px solid ${s.border}`, marginRight:'7px', whiteSpace:'nowrap', flexShrink:0 }}>
      {s.label}
    </span>
  );
};

// ── Main ───────────────────────────────────────────────────────────────────────
const Home = ({ profile, username, prerequisites = [] }) => {
  const isMobile   = useIsMobile();
  if (!profile) return null;

  const enrollments  = profile.enrollments || [];
  const violations   = validateProfile(profile, prerequisites);
  const completeness = getCompleteness(profile);
  const totalCredits = enrollments.reduce((s, e) => s + (e.course?.credit_units || 0), 0);

  const computedCGPA = (() => {
    const graded = enrollments.filter(e => e.grade !== 'IP');
    const units  = graded.reduce((s, e) => s + (e.course?.credit_units || 0), 0);
    const pts    = graded.reduce((s, e) => s + (GRADE_POINTS[e.grade] || 0) * (e.course?.credit_units || 0), 0);
    return units > 0 ? (pts / units).toFixed(2) : null;
  })();
  const displayCGPA = parseFloat(profile.cgpa) > 0 ? parseFloat(profile.cgpa).toFixed(2) : (computedCGPA || '—');

  const sem1 = enrollments.filter(e => e.semester === '1st');
  const sem2 = enrollments.filter(e => e.semester === '2nd');
  const currentCourses  = sem2.length > 0 ? sem2 : sem1;
  const currentSemLabel = sem2.length > 0 ? '2nd Semester' : '1st Semester';
  const currentSemUnits = currentCourses.reduce((s, e) => s + (e.course?.credit_units || 0), 0);

  return (
    <div style={{ fontFamily:'"Segoe UI", Tahoma, sans-serif' }}>
      <div style={{ marginBottom:'24px' }}>
        <h1 style={{ fontSize: isMobile ? '19px' : '22px', fontWeight:'700', color:T.text, margin:'0 0 4px' }}>
          Welcome back, {profile.first_name || username}.
        </h1>
        <p style={{ color:T.textMuted, margin:0, fontSize:'14px' }}>Here is your academic overview for the current session.</p>
      </div>

      {/* Stat cards — 2 cols on mobile, 4 on desktop */}
      <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4,1fr)', gap:'12px', marginBottom:'22px' }}>
        <StatCard label="Current Level"   value={`${profile.level}L`} sub={LEVEL_LABELS[profile.level]} accent={T.primary} />
        <StatCard label="CGPA"            value={displayCGPA} sub={profile.is_on_probation ? '⚠ Probation' : 'Good Standing'} accent={profile.is_on_probation ? T.danger : T.success} />
        <StatCard label="Total Credits"   value={totalCredits} sub={`${enrollments.length} course(s)`} accent="#1a5c9a" />
        <StatCard label="Profile"         value={`${completeness}%`} sub="complete" accent={completeness >= 80 ? T.success : '#d97706'} />
      </div>

      {/* Two-column grid — stacked on mobile */}
      <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr' : '1.45fr 1fr', gap:'18px' }}>

        {/* LEFT */}
        <div style={{ display:'flex', flexDirection:'column', gap:'18px' }}>
          {/* Validation panel */}
          <div style={{
            background: violations.length > 0 ? T.dangerLight : T.successLight,
            border: `1px solid ${violations.length > 0 ? T.dangerBorder : T.successBorder}`,
            borderRadius:'10px', padding:'16px 18px',
          }}>
            <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom: violations.length > 0 ? '12px' : 0 }}>
              <span style={{ fontSize:'15px' }}>{violations.length > 0 ? '⚠' : '✓'}</span>
              <span style={{ fontWeight:'600', fontSize:'13.5px', color: violations.length > 0 ? T.danger : T.success }}>
                {violations.length > 0 ? `${violations.length} rule violation${violations.length > 1 ? 's' : ''} detected` : 'All academic rules passed'}
              </span>
            </div>
            {violations.map((v, i) => (
              <div key={i} style={{ display:'flex', alignItems:'flex-start', padding:'8px 0', borderTop:`1px solid ${T.dangerBorder}`, fontSize:'13px', color:T.danger, lineHeight:'1.55' }}>
                <VBadge type={v.type} /><span>{v.msg}</span>
              </div>
            ))}
          </div>

          {/* Current courses */}
          <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:'10px', padding:'18px' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'14px' }}>
              <h2 style={{ fontSize:'14px', fontWeight:'600', color:T.text, margin:0 }}>Courses — {currentSemLabel}</h2>
              <span style={{ fontSize:'11px', padding:'2px 9px', borderRadius:'100px', background:T.primaryLight, color:T.primary, fontWeight:'600' }}>
                {currentSemUnits} units
              </span>
            </div>
            {currentCourses.length === 0 ? (
              <p style={{ color:T.textMuted, fontSize:'13px', textAlign:'center', padding:'24px 0', margin:0 }}>No courses found.</p>
            ) : currentCourses.map((enr, i) => (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:'10px', padding:'9px 0', borderBottom: i < currentCourses.length - 1 ? `1px solid ${T.border}` : 'none' }}>
                <span style={{ fontFamily:'"Courier New",monospace', fontSize:'11.5px', fontWeight:'700', color:T.textMuted, minWidth:'72px' }}>
                  {enr.course?.course_code}
                </span>
                <span style={{ fontSize:'13px', color:T.text, flex:1, lineHeight:'1.4' }}>{enr.course?.title}</span>
                <span style={{ fontSize:'11px', color:T.textLight, marginRight:'6px' }}>{enr.course?.credit_units}u</span>
                <span style={{ fontSize:'13px', fontWeight:'700', color:gradeColor(enr.grade) }}>{enr.grade}</span>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT */}
        <div style={{ display:'flex', flexDirection:'column', gap:'18px' }}>
          {/* Profile summary */}
          <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:'10px', padding:'18px' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'12px' }}>
              <h2 style={{ fontSize:'14px', fontWeight:'600', color:T.text, margin:0 }}>Profile Summary</h2>
              {completeness < 100 && (
                <span style={{ fontSize:'11px', padding:'2px 8px', borderRadius:'100px', background:T.warningLight, color:T.warning, border:`1px solid ${T.warningBorder}`, fontWeight:'600' }}>
                  {completeness}%
                </span>
              )}
            </div>
            {completeness < 100 && (
              <div style={{ background:T.warningLight, border:`1px solid ${T.warningBorder}`, borderRadius:'6px', padding:'9px 12px', marginBottom:'12px', fontSize:'12.5px', color:T.warning, lineHeight:'1.5' }}>
                Incomplete profile reduces advising recommendation quality.
              </div>
            )}
            {[
              { k:'Department',    v: profile.department || 'Computer Science' },
              { k:'Level',         v: `${profile.level}L` },
              { k:'Specialization',v: profile.specialization_display || profile.specialization || 'Not set' },
              { k:'Student ID',    v: profile.student_id || 'Not assigned' },
              { k:'CGPA',          v: displayCGPA },
              { k:'Standing',      v: profile.is_on_probation ? 'On Probation' : 'Good Standing' },
            ].map(({ k, v }, i, arr) => (
              <div key={k} style={{ display:'flex', justifyContent:'space-between', padding:'7px 0', borderBottom: i < arr.length-1 ? `1px solid ${T.border}` : 'none', fontSize:'13px' }}>
                <span style={{ color:T.textMuted }}>{k}</span>
                <span style={{ fontWeight:'500', color: (k==='Standing' && profile.is_on_probation) ? T.danger : (!v||v==='Not set'||v==='Not assigned') ? T.textLight : T.text }}>{v}</span>
              </div>
            ))}
          </div>

          {/* Credit progress */}
          {enrollments.length > 0 && (
            <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:'10px', padding:'18px' }}>
              <h2 style={{ fontSize:'14px', fontWeight:'600', color:T.text, margin:'0 0 14px' }}>Credit Load by Semester</h2>
              <ProgressBar label="1st Semester" current={sem1.reduce((s,e)=>s+(e.course?.credit_units||0),0)} max={24} color={T.primary}/>
              <ProgressBar label="2nd Semester" current={sem2.reduce((s,e)=>s+(e.course?.credit_units||0),0)} max={24} color="#1a5c9a"/>
              <div style={{ marginTop:'10px', paddingTop:'10px', borderTop:`1px solid ${T.border}`, display:'flex', justifyContent:'space-between', fontSize:'12px', color:T.textMuted }}>
                <span>Total</span>
                <span style={{ fontWeight:'700', color:T.text }}>{totalCredits} units</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Home;