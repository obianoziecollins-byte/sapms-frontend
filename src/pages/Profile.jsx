import React, { useState, useEffect } from 'react';
import axios from 'axios';
import useIsMobile from '../hooks/useIsMobile';

const API_BASE = 'http://127.0.0.1:8000';
const T = {
  primary:'#003366',primaryLight:'#e8eef5',
  success:'#1a7a4a',successLight:'#e6f4ed',successBorder:'#a8d5b9',
  warning:'#7a4f00',warningLight:'#fdf3dc',warningBorder:'#f5cc7a',
  danger:'#8b1a1a',dangerLight:'#fdeaea',dangerBorder:'#f5c6cb',
  surface:'#ffffff',border:'#dde3ec',text:'#1a2332',textMuted:'#64748b',
};
const LEVEL_OPTIONS = [
  { value:'',  label:'Select level'       },
  { value:100, label:'100L — Year One'   },
  { value:200, label:'200L — Year Two'   },
  { value:300, label:'300L — Year Three' },
  { value:400, label:'400L — Final Year' },
];
const SPEC_OPTIONS = [
  { value:'AI',label:'Artificial Intelligence' },{ value:'ML',label:'Machine Learning'      },
  { value:'DS',label:'Data Science'            },{ value:'SE',label:'Software Engineering'  },
  { value:'CY',label:'Cyber Security'          },{ value:'IT',label:'Information Technology'},
  { value:'CC',label:'Cloud Computing'         },{ value:'CG',label:'Computer Graphics'     },
];
const base = { width:'100%',padding:'9px 12px',borderRadius:'6px',border:`1px solid ${T.border}`,
  boxSizing:'border-box',fontSize:'14px',color:T.text,fontFamily:'"Segoe UI",Tahoma,sans-serif',
  background:T.surface,outline:'none' };
const errStyle  = { ...base, borderColor:'#f5c6cb', background:'#fffafa' };
const roStyle   = { ...base, background:'#f5f7fa', color:T.textMuted, cursor:'not-allowed' };
const labelStyle = { display:'block',fontSize:'11.5px',fontWeight:'700',color:T.textMuted,
  marginBottom:'5px',textTransform:'uppercase',letterSpacing:'0.05em' };

const Section = ({ title, children }) => (
  <div style={{ background:T.surface,border:`1px solid ${T.border}`,borderRadius:'10px',padding:'20px',marginBottom:'18px' }}>
    <h2 style={{ fontSize:'13.5px',fontWeight:'700',color:T.text,margin:'0 0 14px',
      paddingBottom:'12px',borderBottom:`1px solid ${T.border}`,textTransform:'uppercase',letterSpacing:'0.04em' }}>
      {title}
    </h2>
    {children}
  </div>
);
const Field = ({ label, error, children }) => (
  <div style={{ marginBottom:'14px' }}>
    <label style={labelStyle}>{label}</label>
    {children}
    {error && <span style={{ fontSize:'11.5px',color:T.danger,marginTop:'4px',display:'block' }}>{error}</span>}
  </div>
);

const validateForm = (form) => {
  const e = {};
  if (!form.first_name.trim())  e.first_name     = 'First name is required.';
  if (!form.last_name.trim())   e.last_name      = 'Last name is required.';
  if (!form.specialization)     e.specialization = 'Please select a specialization.';
  if (!form.level)              e.level          = 'Please select your current level.';
  if (form.cgpa !== '') {
    const v = parseFloat(form.cgpa);
    if (isNaN(v)||v<0||v>5) e.cgpa = 'CGPA must be between 0.00 and 5.00.';
  }
  return e;
};

const getCompleteness = (form, profile) => {
  const checks = [
    !!form.first_name.trim(), !!form.last_name.trim(), !!profile?.student_id,
    !!form.specialization, !!form.level,
    form.cgpa!==''&&parseFloat(form.cgpa)>0,
    (profile?.enrollments||[]).length>0,
  ];
  return Math.round(checks.filter(Boolean).length / checks.length * 100);
};

const Profile = ({ profile, username, onProfileUpdate }) => {
  const isMobile = useIsMobile();
  const [form,       setForm]       = useState({ first_name:'',last_name:'',level:'',specialization:'',cgpa:'' });
  const [fieldErrors,setFieldErrors]= useState({});
  const [saving,     setSaving]     = useState(false);
  const [saveStatus, setSaveStatus] = useState('');
  const [saveMsg,    setSaveMsg]    = useState('');

  useEffect(() => {
    if (!profile) return;
    setForm({
      first_name:     profile.first_name     || '',
      last_name:      profile.last_name      || '',
      level:          profile.level          || '',
      specialization: profile.specialization || '',
      cgpa:           parseFloat(profile.cgpa)>0 ? String(profile.cgpa) : '',
    });
  }, [profile]);

  const handleChange = e => {
    const { name, value } = e.target;
    setForm(p => ({ ...p, [name]:value }));
    setFieldErrors(p => { const n={...p}; delete n[name]; return n; });
    setSaveStatus('');
  };

  const handleSubmit = async e => {
    e.preventDefault();
    const errors = validateForm(form);
    if (Object.keys(errors).length > 0) { setFieldErrors(errors); return; }
    setSaving(true); setSaveStatus(''); setSaveMsg('');
    try {
      await axios.patch(`${API_BASE}/api/profile/update/?username=${username}`, {
        first_name:form.first_name.trim(), last_name:form.last_name.trim(),
        level:Number(form.level), specialization:form.specialization,
        cgpa:form.cgpa!==''?form.cgpa:'0.00',
      });
      setSaveStatus('success'); setSaveMsg('Profile saved successfully.');
      onProfileUpdate();
    } catch (err) {
      setSaveStatus('error'); setSaveMsg(err.response?.data?.error||'Failed to save. Please try again.');
    } finally { setSaving(false); }
  };

  const completeness   = getCompleteness(form, profile);
  const hasErrors      = Object.keys(fieldErrors).length > 0;
  const cgpaNum        = parseFloat(form.cgpa);
  const willBeProbation= !isNaN(cgpaNum)&&cgpaNum>0&&cgpaNum<=1.50;
  const twoCol         = { display:'grid', gridTemplateColumns: isMobile?'1fr':'1fr 1fr', gap:'12px' };

  return (
    <div style={{ maxWidth:'600px', fontFamily:'"Segoe UI",Tahoma,sans-serif' }}>
      <div style={{ marginBottom:'24px' }}>
        <h1 style={{ fontSize: isMobile?'19px':'22px', fontWeight:'700', color:T.text, margin:'0 0 4px' }}>My Academic Profile</h1>
        <p style={{ color:T.textMuted, margin:0, fontSize:'14px' }}>Keep your profile up to date for accurate AI advising recommendations.</p>
      </div>

      {/* Completeness bar */}
      <div style={{ background:T.surface,border:`1px solid ${T.border}`,borderRadius:'10px',padding:'16px 20px',marginBottom:'20px' }}>
        <div style={{ display:'flex',justifyContent:'space-between',fontSize:'13px',marginBottom:'8px' }}>
          <span style={{ fontWeight:'600',color:T.text }}>Profile Completeness</span>
          <span style={{ fontWeight:'700',color:completeness>=80?T.success:'#d97706' }}>{completeness}%</span>
        </div>
        <div style={{ height:'6px',background:'#edf0f5',borderRadius:'100px',overflow:'hidden' }}>
          <div style={{ height:'100%',width:`${completeness}%`,background:completeness>=80?T.success:'#d97706',borderRadius:'100px',transition:'width 0.5s ease' }}/>
        </div>
        {completeness<100 && <p style={{ margin:'8px 0 0',fontSize:'12px',color:T.textMuted }}>Complete all fields to unlock full AI advising capabilities.</p>}
      </div>

      {hasErrors && (
        <div style={{ background:T.dangerLight,border:`1px solid ${T.dangerBorder}`,borderRadius:'8px',padding:'12px 14px',marginBottom:'18px' }}>
          <div style={{ fontSize:'13px',fontWeight:'700',color:T.danger,marginBottom:'6px' }}>Please fix the following before saving:</div>
          {Object.values(fieldErrors).map((msg,i)=>(
            <div key={i} style={{ display:'flex',gap:'6px',fontSize:'13px',color:T.danger,padding:'2px 0' }}>
              <span style={{ marginTop:'3px',flexShrink:0 }}>•</span><span>{msg}</span>
            </div>
          ))}
        </div>
      )}
      {saveStatus==='success' && <div style={{ background:T.successLight,border:`1px solid ${T.successBorder}`,borderRadius:'8px',padding:'11px 14px',marginBottom:'18px',fontSize:'13px',color:T.success,fontWeight:'600' }}>✓ {saveMsg}</div>}
      {saveStatus==='error'   && <div style={{ background:T.dangerLight, border:`1px solid ${T.dangerBorder}`, borderRadius:'8px',padding:'11px 14px',marginBottom:'18px',fontSize:'13px',color:T.danger, fontWeight:'600' }}>✗ {saveMsg}</div>}

      <form onSubmit={handleSubmit}>
        <Section title="Personal Information">
          <div style={twoCol}>
            <Field label="First Name" error={fieldErrors.first_name}>
              <input name="first_name" type="text" placeholder="e.g. Obianozie" value={form.first_name} onChange={handleChange} style={fieldErrors.first_name?errStyle:base}/>
            </Field>
            <Field label="Last Name" error={fieldErrors.last_name}>
              <input name="last_name" type="text" placeholder="e.g. Collins" value={form.last_name} onChange={handleChange} style={fieldErrors.last_name?errStyle:base}/>
            </Field>
          </div>
          <div style={twoCol}>
            <Field label="Student ID"><input type="text" value={profile?.student_id||'Not assigned'} style={roStyle} readOnly/></Field>
            <Field label="Username">  <input type="text" value={profile?.username||username}         style={roStyle} readOnly/></Field>
          </div>
        </Section>

        <Section title="Academic Information">
          <div style={twoCol}>
            <Field label="Current Level" error={fieldErrors.level}>
              <select name="level" value={form.level} onChange={handleChange} style={fieldErrors.level?errStyle:base}>
                {LEVEL_OPTIONS.map(o=><option key={o.value} value={o.value} disabled={o.value===''}>{o.label}</option>)}
              </select>
            </Field>
            <Field label="Department"><input type="text" value={profile?.department||'Computer Science'} style={roStyle} readOnly/></Field>
          </div>
          <Field label="Specialization" error={fieldErrors.specialization}>
            <select name="specialization" value={form.specialization} onChange={handleChange} style={fieldErrors.specialization?errStyle:base}>
              <option value="">Select your specialization</option>
              {SPEC_OPTIONS.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </Field>
          <Field label="CGPA (0.00 – 5.00)" error={fieldErrors.cgpa}>
            <input name="cgpa" type="number" min="0" max="5" step="0.01" placeholder="e.g. 3.75" value={form.cgpa} onChange={handleChange} style={fieldErrors.cgpa?errStyle:base}/>
          </Field>
          {willBeProbation && (
            <div style={{ background:T.dangerLight,border:`1px solid ${T.dangerBorder}`,borderRadius:'6px',padding:'10px 14px',fontSize:'12.5px',color:T.danger,lineHeight:'1.55',marginTop:'-6px' }}>
              <strong>⚠ Probation Rule:</strong> A CGPA ≤ 1.50 places the student on academic probation per Nile University regulations.
            </div>
          )}
        </Section>

        <div style={{ display:'flex',justifyContent:'flex-end' }}>
          <button type="submit" disabled={saving} style={{ padding:'10px 28px',background:saving?'#6b8ab5':T.primary,color:'#fff',border:'none',borderRadius:'7px',fontWeight:'700',fontSize:'14px',cursor:saving?'not-allowed':'pointer',fontFamily:'"Segoe UI",Tahoma,sans-serif',width:isMobile?'100%':'auto' }}>
            {saving?'Saving…':'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
};
export default Profile;