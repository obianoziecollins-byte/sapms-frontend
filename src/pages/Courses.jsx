import React, { useState, useEffect } from 'react';
import axios from 'axios';
import useIsMobile from '../hooks/useIsMobile';

const API_BASE = 'http://127.0.0.1:8000';
const T = {
  primary:'#003366',primaryLight:'#e8eef5',
  success:'#1a7a4a',successLight:'#e6f4ed',successBorder:'#a8d5b9',
  warning:'#7a4f00',warningLight:'#fdf3dc',warningBorder:'#f5cc7a',
  danger:'#8b1a1a',dangerLight:'#fdeaea',dangerBorder:'#f5c6cb',
  surface:'#ffffff',border:'#dde3ec',text:'#1a2332',textMuted:'#64748b',textLight:'#94a3b8',
};
const MAX_CREDITS  = 24;
const GRADE_ORDER  = ['F','D','C','B','A'];
const GRADE_POINTS = { A:5,B:4,C:3,D:2,F:0,IP:null };
const GRADE_CHOICES= [
  {value:'IP',label:'In Progress'},{value:'A',label:'A'},
  {value:'B',label:'B'},{value:'C',label:'C'},{value:'D',label:'D'},{value:'F',label:'F'},
];

const inferLevel = code => { const m=(code||'').match(/(\d)/); return m?parseInt(m[1])*100:null; };
const meetsMinGrade = (actual, min) => GRADE_ORDER.indexOf(actual) >= GRADE_ORDER.indexOf(min);
const gradeColor = g => ({A:T.success,B:'#1a5c9a',C:T.warning,D:'#6b4500',F:T.danger}[g]||T.textMuted);
const gradeBg    = g => ({
  A:{bg:T.successLight,bd:T.successBorder},B:{bg:T.primaryLight,bd:'#a8c0e0'},
  C:{bg:T.warningLight,bd:T.warningBorder},D:{bg:'#fef9ec',bd:'#e5c97a'},
  F:{bg:T.dangerLight, bd:T.dangerBorder},IP:{bg:'#f0f4f8',bd:T.border},
}[g]||{bg:'#f0f4f8',bd:T.border});

// ── Validation ─────────────────────────────────────────────────────────────────
const validateCourse = (enr, studentLevel, allEnrollments, prerequisites) => {
  const issues = [];
  const code   = enr.course?.course_code;
  const level  = inferLevel(code);

  if (level && level > studentLevel)
    issues.push({ type:'warning', msg:`${code} is a ${level}L course but your level is ${studentLevel}L.` });

  if (enr.grade === 'F')
    issues.push({ type:'danger', msg:'Grade F — this course must be retaken.' });

  // Prerequisite check against student's own enrollment history
  prerequisites
    .filter(p => p.course_code === code)
    .forEach(p => {
      const done = allEnrollments.find(e =>
        e.course?.course_code === p.required_course_code &&
        e.grade !== 'IP' && e.grade !== 'F' &&
        meetsMinGrade(e.grade, p.min_grade)
      );
      if (!done)
        issues.push({
          type:'danger',
          msg:`Requires ${p.required_course_code} (${p.required_course_title}) completed with min grade ${p.min_grade}.`,
        });
    });

  return issues;
};

const validateSemester = enrollments => {
  const total = enrollments.reduce((s,e) => s+(e.course?.credit_units||0), 0);
  return total > MAX_CREDITS
    ? [{ type:'danger', msg:`${total} units exceeds the maximum of ${MAX_CREDITS} per semester.` }]
    : [];
};

// ── Sub-components ─────────────────────────────────────────────────────────────
const TypeBadge = ({ type }) => {
  const s = type==='danger'
    ? {bg:T.dangerLight,color:T.danger,border:T.dangerBorder,label:'Error'}
    : {bg:T.warningLight,color:T.warning,border:T.warningBorder,label:'Warning'};
  return (
    <span style={{ display:'inline-block',padding:'1px 7px',borderRadius:'100px',fontSize:'10px',fontWeight:'700',
      background:s.bg,color:s.color,border:`1px solid ${s.border}`,marginRight:'6px',whiteSpace:'nowrap',flexShrink:0 }}>
      {s.label}
    </span>
  );
};

const GradeCircle = ({ grade }) => {
  const { bg, bd } = gradeBg(grade);
  return (
    <div style={{ width:'30px',height:'30px',borderRadius:'50%',flexShrink:0,
      display:'flex',alignItems:'center',justifyContent:'center',
      fontSize:grade==='IP'?'8px':'13px',fontWeight:'700',
      color:gradeColor(grade),background:bg,border:`1.5px solid ${bd}` }}>
      {grade}
    </div>
  );
};

// ── Semester block ─────────────────────────────────────────────────────────────
const SemesterBlock = ({ label, enrollments, studentLevel, allEnrollments, prerequisites, username, onProfileUpdate, isMobile }) => {
  const [dropping,  setDropping]  = useState(null);
  const [dropError, setDropError] = useState('');

  const totalCredits  = enrollments.reduce((s,e)=>s+(e.course?.credit_units||0),0);
  const graded        = enrollments.filter(e=>e.grade!=='IP');
  const gradedUnits   = graded.reduce((s,e)=>s+(e.course?.credit_units||0),0);
  const gradedPts     = graded.reduce((s,e)=>s+(GRADE_POINTS[e.grade]||0)*(e.course?.credit_units||0),0);
  const semGPA        = gradedUnits>0?(gradedPts/gradedUnits).toFixed(2):null;
  const semIssues     = validateSemester(enrollments);
  const overloaded    = totalCredits > MAX_CREDITS;

  const handleDrop = async (id, code) => {
    if (!window.confirm(`Drop ${code}? This cannot be undone.`)) return;
    setDropping(id); setDropError('');
    try {
      await axios.delete(`${API_BASE}/api/enroll/${id}/?username=${username}`);
      onProfileUpdate();
    } catch (err) {
      setDropError(err.response?.data?.error||'Could not drop course.');
    } finally { setDropping(null); }
  };


  return (
    <div style={{ background:T.surface,border:`1px solid ${T.border}`,borderRadius:'10px',overflow:'hidden',marginBottom:'18px' }}>
      {/* Header */}
      <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',padding:'13px 18px',background:T.primaryLight,borderBottom:`1px solid ${T.border}` }}>
        <span style={{ fontWeight:'700',fontSize:'14px',color:T.primary }}>{label}</span>
        <div style={{ display:'flex',gap:'10px',alignItems:'center' }}>
          {semGPA && <span style={{ fontSize:'12px',color:T.textMuted }}>GPA: <strong style={{ color:T.text }}>{semGPA}</strong></span>}
          <span style={{ fontSize:'12px',padding:'3px 10px',borderRadius:'100px',fontWeight:'600',
            background:overloaded?T.dangerLight:T.surface, color:overloaded?T.danger:T.primary,
            border:`1px solid ${overloaded?T.dangerBorder:'#b0c8e8'}` }}>
            {totalCredits}/{MAX_CREDITS} units
          </span>
        </div>
      </div>

      {semIssues.map((v,i)=>(
        <div key={i} style={{ display:'flex',alignItems:'flex-start',gap:'7px',padding:'9px 18px',
          background:T.dangerLight,borderBottom:`1px solid ${T.dangerBorder}`,fontSize:'13px',color:T.danger,lineHeight:'1.5' }}>
          <TypeBadge type={v.type}/><span>{v.msg}</span>
        </div>
      ))}
      {dropError && <div style={{ padding:'8px 18px',background:T.dangerLight,borderBottom:`1px solid ${T.dangerBorder}`,fontSize:'12.5px',color:T.danger }}>{dropError}</div>}

      {/* Column headers — hidden on mobile */}
      {!isMobile && (
        <div style={{ display:'grid',gridTemplateColumns:'90px 1fr 60px 36px 56px',
          padding:'7px 18px',borderBottom:`1px solid ${T.border}`,
          fontSize:'10.5px',fontWeight:'700',color:T.textLight,textTransform:'uppercase',letterSpacing:'0.06em' }}>
          <span>Code</span><span>Title</span>
          <span style={{ textAlign:'center' }}>Units</span>
          <span style={{ textAlign:'center' }}>Grade</span>
          <span/>
        </div>
      )}

      {enrollments.map((enr,i)=>{
        const issues    = validateCourse(enr, studentLevel, allEnrollments, prerequisites);
        const hasIssues = issues.length > 0;
        const rowBg     = enr.grade==='F'?'#fffafa':hasIssues?'#fffdf5':'transparent';
        const isDropping= dropping===enr.id;

        return (
          <div key={enr.id}>
            <div style={{ display:'grid',
              gridTemplateColumns: isMobile?'1fr auto':'90px 1fr 60px 36px 56px',
              alignItems:'center',padding:'10px 18px',
              background:rowBg,borderBottom:`1px solid ${T.border}` }}>
              {/* Mobile: code + title stacked in one cell */}
              {isMobile ? (
                <div>
                  <span style={{ fontFamily:'"Courier New",monospace',fontSize:'11px',fontWeight:'700',color:T.textMuted }}>
                    {enr.course?.course_code}
                  </span>
                  <div style={{ fontSize:'13px',color:T.text,lineHeight:'1.4' }}>{enr.course?.title}</div>
                  <div style={{ fontSize:'11px',color:T.textLight,marginTop:'2px' }}>{enr.course?.credit_units} unit{enr.course?.credit_units!==1?'s':''}</div>
                </div>
              ) : (
                <>
                  <span style={{ fontFamily:'"Courier New",monospace',fontSize:'12px',fontWeight:'700',color:T.textMuted }}>{enr.course?.course_code}</span>
                  <span style={{ fontSize:'13px',color:T.text,paddingRight:'12px',lineHeight:'1.4' }}>{enr.course?.title}</span>
                  <span style={{ fontSize:'13px',color:T.textMuted,textAlign:'center' }}>{enr.course?.credit_units}</span>
                </>
              )}
              <div style={{ display:'flex',justifyContent:'center' }}><GradeCircle grade={enr.grade}/></div>
              <div style={{ display:'flex',justifyContent:'center' }}>
                <button onClick={()=>handleDrop(enr.id,enr.course?.course_code)} disabled={isDropping} title="Drop course"
                  style={{ padding:'3px 8px',borderRadius:'5px',fontSize:'11px',fontWeight:'600',
                    cursor:isDropping?'not-allowed':'pointer',
                    background:T.dangerLight,color:T.danger,border:`1px solid ${T.dangerBorder}`,
                    fontFamily:'"Segoe UI",Tahoma,sans-serif',opacity:isDropping?0.6:1 }}>
                  {isDropping?'…':'Drop'}
                </button>
              </div>
            </div>
            {issues.map((v,j)=>(
              <div key={j} style={{ display:'flex',alignItems:'flex-start',gap:'7px',
                padding:`6px 18px 6px ${isMobile?'18px':'108px'}`,
                fontSize:'12px',lineHeight:'1.5',
                color:v.type==='danger'?T.danger:T.warning,
                background:v.type==='danger'?'#fff4f4':'#fffbee',
                borderBottom:`1px solid ${T.border}`,
                borderLeft:`3px solid ${v.type==='danger'?T.dangerBorder:T.warningBorder}` }}>
                <TypeBadge type={v.type}/><span>{v.msg}</span>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
};

// ── Enroll form ────────────────────────────────────────────────────────────────
const EnrollForm = ({ profile, username, allCourses, onSuccess, isMobile }) => {
  const [form,       setForm]       = useState({ course_code:'',semester:'',grade:'IP' });
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState('');
  const [formErrors, setFormErrors] = useState({});

  const base = { width:'100%',padding:'9px 12px',borderRadius:'6px',border:`1px solid ${T.border}`,
    boxSizing:'border-box',fontSize:'14px',color:T.text,background:T.surface,
    fontFamily:'"Segoe UI",Tahoma,sans-serif',outline:'none' };
  const errS = { ...base,borderColor:'#f5c6cb',background:'#fffafa' };

  const studentLevel = Number(profile?.level)||0;
  const enrolledCodes= new Set((profile?.enrollments||[]).map(e=>e.course?.course_code));
  const available    = allCourses.filter(c=>{
    const lv = inferLevel(c.course_code);
    return lv===studentLevel && !enrolledCodes.has(c.course_code);
  });

  const handleChange = e => {
    const { name,value } = e.target;
    setForm(p=>({...p,[name]:value}));
    setFormErrors(p=>{const n={...p};delete n[name];return n;});
    setError('');
  };

  const validate = () => {
    const e={};
    if (!form.course_code) e.course_code='Please select a course.';
    if (!form.semester)    e.semester   ='Please select a semester.';
    return e;
  };

  const handleSubmit = async e => {
    e.preventDefault();
    const errs=validate();
    if (Object.keys(errs).length>0){setFormErrors(errs);return;}
    setSubmitting(true);setError('');
    try {
      await axios.post(`${API_BASE}/api/enroll/`,{username,...form});
      setForm({course_code:'',semester:'',grade:'IP'});
      onSuccess();
    } catch(err){
      setError(err.response?.data?.error||'Enrollment failed. Please try again.');
    } finally{setSubmitting(false);}
  };

  if (!studentLevel) return (
    <div style={{ background:T.warningLight,border:`1px solid ${T.warningBorder}`,borderRadius:'8px',padding:'12px 16px',fontSize:'13px',color:T.warning }}>
      Please set your <strong>Current Level</strong> in My Profile before enrolling.
    </div>
  );

  if (available.length===0) return (
    <div style={{ background:'#f8fafc',border:`1px solid ${T.border}`,borderRadius:'8px',padding:'14px 16px',fontSize:'13px',color:T.textMuted,textAlign:'center' }}>
      All {studentLevel}L courses are enrolled or none exist yet. Ask your admin to add courses.
    </div>
  );

  const labelS = { display:'block',fontSize:'11px',fontWeight:'700',color:T.textMuted,marginBottom:'5px',textTransform:'uppercase',letterSpacing:'0.05em' };

  return (
    <form onSubmit={handleSubmit}>
      {error && <div style={{ background:T.dangerLight,border:`1px solid ${T.dangerBorder}`,borderRadius:'6px',padding:'9px 12px',marginBottom:'14px',fontSize:'13px',color:T.danger }}>{error}</div>}
      {/* Stacked on mobile, 4-col on desktop */}
      <div style={{ display:'grid', gridTemplateColumns:isMobile?'1fr':'2fr 1fr 1fr auto', gap:'10px', alignItems:'end' }}>
        <div>
          <label style={labelS}>Course ({studentLevel}L)</label>
          <select name="course_code" value={form.course_code} onChange={handleChange} style={formErrors.course_code?errS:base}>
            <option value="">Select a course</option>
            {available.map(c=>(
              <option key={c.course_code} value={c.course_code}>
                {c.course_code} — {c.title} ({c.credit_units}u)
              </option>
            ))}
          </select>
          {formErrors.course_code && <span style={{ fontSize:'11px',color:T.danger,marginTop:'3px',display:'block' }}>{formErrors.course_code}</span>}
        </div>
        <div>
          <label style={labelS}>Semester</label>
          <select name="semester" value={form.semester} onChange={handleChange} style={formErrors.semester?errS:base}>
            <option value="">Select</option>
            <option value="1st">1st Semester</option>
            <option value="2nd">2nd Semester</option>
          </select>
          {formErrors.semester && <span style={{ fontSize:'11px',color:T.danger,marginTop:'3px',display:'block' }}>{formErrors.semester}</span>}
        </div>
        <div>
          <label style={labelS}>Grade</label>
          <select name="grade" value={form.grade} onChange={handleChange} style={base}>
            {GRADE_CHOICES.map(g=><option key={g.value} value={g.value}>{g.label}</option>)}
          </select>
        </div>
        <button type="submit" disabled={submitting} style={{ padding:'9px 20px',background:submitting?'#6b8ab5':T.primary,color:'#fff',border:'none',borderRadius:'6px',fontWeight:'700',fontSize:'13px',cursor:submitting?'not-allowed':'pointer',fontFamily:'"Segoe UI",Tahoma,sans-serif',whiteSpace:'nowrap',height:'38px',width:isMobile?'100%':'auto',marginTop:isMobile?'4px':0 }}>
          {submitting?'Adding…':'+ Enroll'}
        </button>
      </div>
    </form>
  );
};

// ── Main ───────────────────────────────────────────────────────────────────────
const Courses = ({ profile, username, prerequisites=[], onProfileUpdate }) => {
  const isMobile = useIsMobile();
  const [allCourses,     setAllCourses]     = useState([]);
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [coursesError,   setCoursesError]   = useState('');
  const [showEnroll,     setShowEnroll]     = useState(false);

  useEffect(() => {
    axios.get(`${API_BASE}/api/courses/`)
      .then(r=>setAllCourses(r.data))
      .catch(()=>setCoursesError('Could not load course catalogue.'))
      .finally(()=>setCoursesLoading(false));
  }, []);

  if (!profile) return null;

  const enrollments    = profile.enrollments || [];
  const sem1           = enrollments.filter(e=>e.semester==='1st');
  const sem2           = enrollments.filter(e=>e.semester==='2nd');
  const totalCredits   = enrollments.reduce((s,e)=>s+(e.course?.credit_units||0),0);
  const passedCredits  = enrollments.filter(e=>!['F','IP'].includes(e.grade)).reduce((s,e)=>s+(e.course?.credit_units||0),0);
  const failedCount    = enrollments.filter(e=>e.grade==='F').length;
  const inProgCount    = enrollments.filter(e=>e.grade==='IP').length;

  const allViolations = [
    ...validateSemester(sem1).map(v=>({...v,ctx:'1st Semester'})),
    ...validateSemester(sem2).map(v=>({...v,ctx:'2nd Semester'})),
    ...enrollments.flatMap(e=>validateCourse(e,profile.level,enrollments,prerequisites).map(v=>({...v,ctx:e.course?.course_code}))),
  ];

  return (
    <div style={{ fontFamily:'"Segoe UI",Tahoma,sans-serif' }}>
      <div style={{ marginBottom:'24px' }}>
        <h1 style={{ fontSize:isMobile?'19px':'22px',fontWeight:'700',color:T.text,margin:'0 0 4px' }}>My Courses</h1>
        <p style={{ color:T.textMuted,margin:0,fontSize:'14px' }}>Enroll in courses, view grades, and track rule-based validation.</p>
      </div>

      {/* Stat cards */}
      <div style={{ display:'grid',gridTemplateColumns:isMobile?'1fr 1fr':'repeat(4,1fr)',gap:'12px',marginBottom:'22px' }}>
        {[
          {label:'Total Courses', value:enrollments.length, accent:T.primary},
          {label:'Total Credits', value:totalCredits,       accent:'#1a5c9a'},
          {label:'In Progress',   value:inProgCount,        accent:T.warning},
          {label:'Courses Failed',value:failedCount, accent:failedCount>0?T.danger:T.success,alert:failedCount>0},
        ].map(({label,value,accent,alert})=>(
          <div key={label} style={{ background:T.surface,border:`1px solid ${T.border}`,borderRadius:'10px',padding:'16px 18px',borderTop:`3px solid ${accent}` }}>
            <div style={{ fontSize:'12px',color:T.textMuted,marginBottom:'6px' }}>{label}</div>
            <div style={{ fontSize:'26px',fontWeight:'700',lineHeight:1,color:alert?T.danger:T.text }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Enroll panel */}
      <div style={{ background:T.surface,border:`1px solid ${T.border}`,borderRadius:'10px',marginBottom:'22px',overflow:'hidden' }}>
        <button onClick={()=>setShowEnroll(v=>!v)} style={{ display:'flex',alignItems:'center',justifyContent:'space-between',width:'100%',padding:'14px 18px',background:showEnroll?T.primaryLight:T.surface,border:'none',borderBottom:showEnroll?`1px solid ${T.border}`:'none',cursor:'pointer',fontFamily:'"Segoe UI",Tahoma,sans-serif' }}>
          <div style={{ display:'flex',alignItems:'center',gap:'8px' }}>
            <span style={{ fontSize:'18px',color:T.primary,lineHeight:1 }}>＋</span>
            <span style={{ fontSize:'14px',fontWeight:'700',color:T.primary }}>Enroll in a Course</span>
            <span style={{ fontSize:'12px',color:T.textMuted }}>— {Number(profile?.level)||'?'}L courses</span>
          </div>
          <span style={{ fontSize:'12px',color:T.textMuted }}>{showEnroll?'▲ Hide':'▼ Show'}</span>
        </button>
        {showEnroll && (
          <div style={{ padding:'18px' }}>
            {coursesLoading?<p style={{ color:T.textMuted,fontSize:'13px',margin:0 }}>Loading catalogue…</p>
            :coursesError?<p style={{ color:T.danger,fontSize:'13px',margin:0 }}>{coursesError}</p>
            :<EnrollForm profile={profile} username={username} allCourses={allCourses} isMobile={isMobile} onSuccess={()=>{setShowEnroll(false);onProfileUpdate();}}/>}
          </div>
        )}
      </div>

      {/* Global violations */}
      {allViolations.length>0 && (
        <div style={{ background:T.dangerLight,border:`1px solid ${T.dangerBorder}`,borderRadius:'10px',padding:'14px 18px',marginBottom:'22px' }}>
          <div style={{ fontWeight:'700',fontSize:'13.5px',color:T.danger,marginBottom:'10px' }}>
            Rule Validation — {allViolations.length} issue{allViolations.length>1?'s':''} detected
          </div>
          {allViolations.map((v,i)=>(
            <div key={i} style={{ display:'flex',alignItems:'flex-start',gap:'7px',padding:'5px 0',borderTop:i>0?`1px solid ${T.dangerBorder}`:'none',fontSize:'13px',color:T.danger,lineHeight:'1.55' }}>
              <TypeBadge type={v.type}/>
              <span>{v.ctx&&<strong style={{ marginRight:'4px' }}>[{v.ctx}]</strong>}{v.msg}</span>
            </div>
          ))}
        </div>
      )}

      {/* Course blocks */}
      {enrollments.length===0?(
        <div style={{ background:T.surface,border:`1px solid ${T.border}`,borderRadius:'10px',padding:'48px 24px',textAlign:'center' }}>
          <div style={{ fontSize:'32px',marginBottom:'12px' }}>📋</div>
          <p style={{ color:T.textMuted,fontSize:'14px',margin:0 }}>No enrolled courses yet. Use the <strong>Enroll in a Course</strong> panel above.</p>
        </div>
      ):(
        <>
          {sem1.length>0 && <SemesterBlock label="1st Semester Courses" enrollments={sem1} studentLevel={profile.level} allEnrollments={enrollments} prerequisites={prerequisites} username={username} onProfileUpdate={onProfileUpdate} isMobile={isMobile}/>}
          {sem2.length>0 && <SemesterBlock label="2nd Semester Courses" enrollments={sem2} studentLevel={profile.level} allEnrollments={enrollments} prerequisites={prerequisites} username={username} onProfileUpdate={onProfileUpdate} isMobile={isMobile}/>}
        </>
      )}
    </div>
  );
};
export default Courses;