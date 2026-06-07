import { useState, useEffect, useCallback, useMemo } from 'react';
import { buildTheme } from './theme';
import { getAllProfiles, registerProfile, loginProfile, updateColors, loadProgress, saveProgress } from './db';
import { ESPECIAIS_DATA, TEAMS, NUMS, PRESETS } from './data';

function allFigKeys() {
  const keys = [];
  ESPECIAIS_DATA.subsections.forEach(s => s.items.forEach(i => keys.push(i.id)));
  TEAMS.forEach(t => NUMS.forEach(n => keys.push(`${t.id}-${n}`)));
  return keys;
}
const ALL_KEYS = allFigKeys();

// ─── ROOT ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen]   = useState('login');
  const [profile, setProfile] = useState(null);
  const [progress, setProgress] = useState({});
  const [profiles, setProfiles] = useState([]);
  const [saving, setSaving]   = useState(false);

  useEffect(() => {
    getAllProfiles().then(setProfiles).catch(console.error);
  }, []);

  const theme = useMemo(() =>
    profile ? buildTheme(profile.c1, profile.c2, profile.c3)
            : buildTheme('#FF6B9D','#AA00FF','#2979FF'),
  [profile]);

  const handleLogin = async (prof) => {
    const prog = await loadProgress(prof.name);
    setProfile(prof);
    setProgress(prog);
    const updated = await getAllProfiles();
    setProfiles(updated);
    setScreen('app');
  };

  const toggleFig = useCallback(async (figKey) => {
    setProgress(prev => {
      const next = { ...prev, [figKey]: ((prev[figKey] || 0) + 1) % 3 };
      setSaving(true);
      saveProgress(profile.name, figKey, next[figKey])
        .catch(console.error)
        .finally(() => setSaving(false));
      return next;
    });
  }, [profile]);

  const handleUpdateColors = async (c1, c2, c3) => {
    await updateColors(profile.name, c1, c2, c3);
    setProfile(p => ({ ...p, c1, c2, c3 }));
  };

  const handleLogout = () => { setScreen('login'); setProfile(null); setProgress({}); };

  if (screen === 'login') return <LoginScreen profiles={profiles} onLogin={handleLogin} />;
  return (
    <AlbumApp
      profile={profile} progress={progress} theme={theme}
      toggle={toggleFig} saving={saving}
      onLogout={handleLogout} onUpdateColors={handleUpdateColors}
    />
  );
}

// ─── LOGIN / CADASTRO ─────────────────────────────────────────────────────────
function LoginScreen({ profiles, onLogin }) {
  // mode: 'choose' | 'login' | 'register'
  const [mode, setMode]       = useState('choose');
  const [name, setName]       = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [c1, setC1]           = useState('#FF6B9D');
  const [c2, setC2]           = useState('#AA00FF');
  const [c3, setC3]           = useState('#2979FF');
  const [step, setStep]       = useState(1); // só no register: 1=dados, 2=cores
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [showPwd, setShowPwd] = useState(false);

  const t = buildTheme(c1, c2, c3);

  const reset = () => { setName(''); setPassword(''); setPassword2(''); setError(''); setStep(1); };

  const goLogin    = (prefill = '') => { reset(); setName(prefill); setMode('login'); };
  const goRegister = () => { reset(); setMode('register'); };
  const goChoose   = () => { reset(); setMode('choose'); };

  // ── SUBMIT LOGIN ─────────────────────────────────────────────────────────
  const submitLogin = async () => {
    if (!name.trim() || !password) { setError('Preencha todos os campos.'); return; }
    setLoading(true); setError('');
    try {
      const prof = await loginProfile(name.trim(), password);
      await onLogin(prof);
    } catch(e) {
      setError(e.message);
    } finally { setLoading(false); }
  };

  // ── SUBMIT REGISTER step 1 → step 2 ──────────────────────────────────────
  const submitRegisterStep1 = () => {
    if (!name.trim())        { setError('Digite seu nome.'); return; }
    if (password.length < 4) { setError('Senha mínima de 4 caracteres.'); return; }
    if (password !== password2) { setError('As senhas não coincidem.'); return; }
    setError(''); setStep(2);
  };

  // ── SUBMIT REGISTER step 2 ────────────────────────────────────────────────
  const submitRegisterStep2 = async () => {
    setLoading(true); setError('');
    try {
      const prof = await registerProfile(name.trim(), password, c1, c2, c3);
      await onLogin(prof);
    } catch(e) {
      setError(e.message);
      setStep(1);
    } finally { setLoading(false); }
  };

  const inputStyle = (hasError) => ({
    width:'100%', padding:'13px 16px', borderRadius:14, fontSize:15,
    border:`2px solid ${hasError ? '#f55' : t.c1}`,
    background:t.inputBg, color:t.textMain, outline:'none',
    fontWeight:600, boxSizing:'border-box',
    fontFamily:"'Plus Jakarta Sans',sans-serif", transition:'border 0.3s',
  });

  const btnPrimary = (extra={}) => ({
    width:'100%', padding:'14px', borderRadius:14,
    background:`linear-gradient(135deg,${t.c1},${t.c2})`,
    color:'white', border:'none', fontWeight:800, fontSize:15,
    cursor: loading ? 'wait' : 'pointer', opacity: loading ? 0.7 : 1,
    boxShadow:`0 6px 24px ${t.c1}44`,
    fontFamily:"'Plus Jakarta Sans',sans-serif", transition:'transform 0.15s',
    ...extra,
  });

  const btnSecondary = (extra={}) => ({
    width:'100%', padding:'13px', borderRadius:14,
    background:t.barBg, color:t.textSub, border:'none',
    fontWeight:700, fontSize:14, cursor:'pointer',
    fontFamily:"'Plus Jakarta Sans',sans-serif", ...extra,
  });

  return (
    <div style={{
      minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center',
      background:`radial-gradient(ellipse at 20% 30%, ${c1}28 0%, transparent 55%),
                  radial-gradient(ellipse at 80% 70%, ${c3}28 0%, transparent 55%), ${t.bg}`,
      fontFamily:"'Plus Jakarta Sans',sans-serif", padding:20, transition:'background 0.5s',
    }}>
      <div style={{
        background:t.card, borderRadius:28, padding:'40px 32px',
        boxShadow:`0 24px 64px rgba(0,0,0,0.15), 0 0 0 1px ${c1}20`,
        width:'100%', maxWidth:420, textAlign:'center',
      }}>
        {/* Logo */}
        <div style={{fontSize:52, marginBottom:6, display:'inline-block', animation:'bounce 2s infinite'}}>🏆</div>
        <div style={{
          fontFamily:"'Fredoka',cursive", fontWeight:700, fontSize:28, lineHeight:1.1, marginBottom:4,
          background:`linear-gradient(135deg,${c1},${c2},${c3})`,
          WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text',
        }}>Álbum Copa 2026</div>
        <div style={{color:t.textSub, fontSize:13, marginBottom:28}}>Controle de figurinhas Panini 🌍</div>

        {/* ── TELA INICIAL: escolha ── */}
        {mode === 'choose' && (
          <>
            {profiles.length > 0 && (
              <div style={{marginBottom:24}}>
                <div style={{fontSize:11, fontWeight:700, color:t.textSub, marginBottom:10, letterSpacing:1, textTransform:'uppercase'}}>
                  Entrar como
                </div>
                <div style={{display:'flex', gap:8, flexWrap:'wrap', justifyContent:'center'}}>
                  {profiles.map(p => (
                    <button key={p.name} onClick={() => goLogin(p.name)} style={{
                      padding:'8px 18px', borderRadius:20,
                      background:`linear-gradient(135deg,${p.c1},${p.c2})`,
                      color:'white', border:'none', fontWeight:700, fontSize:13,
                      cursor:'pointer', boxShadow:`0 3px 12px ${p.c1}44`,
                      fontFamily:"'Plus Jakarta Sans',sans-serif",
                    }}>{p.name}</button>
                  ))}
                </div>
              </div>
            )}

            <div style={{display:'flex', flexDirection:'column', gap:10}}>
              <button onClick={() => goLogin()} style={btnPrimary()}>
                🔑 Entrar com senha
              </button>
              <button onClick={goRegister} style={btnSecondary()}>
                ✨ Criar novo perfil
              </button>
            </div>
          </>
        )}

        {/* ── LOGIN ── */}
        {mode === 'login' && (
          <>
            <div style={{fontSize:16, fontWeight:800, color:t.textMain, marginBottom:20}}>
              Bem-vindo de volta! 👋
            </div>

            <div style={{display:'flex', flexDirection:'column', gap:10, marginBottom:16}}>
              <input
                value={name} onChange={e => setName(e.target.value)}
                placeholder="Seu nome"
                style={inputStyle(false)}
              />
              <div style={{position:'relative'}}>
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={password} onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && submitLogin()}
                  placeholder="Senha"
                  style={{...inputStyle(!!error), paddingRight:44}}
                />
                <button onClick={() => setShowPwd(p => !p)} style={{
                  position:'absolute', right:12, top:'50%', transform:'translateY(-50%)',
                  background:'none', border:'none', cursor:'pointer', fontSize:18, color:t.textSub,
                }}>{showPwd ? '🙈' : '👁️'}</button>
              </div>
            </div>

            {error && <div style={{color:'#f55', fontSize:12, marginBottom:12}}>{error}</div>}

            <div style={{display:'flex', gap:10}}>
              <button onClick={goChoose} style={btnSecondary({flex:1})}>← Voltar</button>
              <button onClick={submitLogin} disabled={loading} style={btnPrimary({flex:2})}>
                {loading ? '⏳ Entrando...' : 'Entrar 🏆'}
              </button>
            </div>

            <div style={{marginTop:16, fontSize:12, color:t.textSub}}>
              Não tem conta?{' '}
              <span onClick={goRegister} style={{color:t.c1, fontWeight:700, cursor:'pointer'}}>Criar perfil</span>
            </div>
          </>
        )}

        {/* ── CADASTRO step 1: nome + senha ── */}
        {mode === 'register' && step === 1 && (
          <>
            <div style={{fontSize:16, fontWeight:800, color:t.textMain, marginBottom:20}}>
              Criar novo perfil 🆕
            </div>

            <div style={{display:'flex', flexDirection:'column', gap:10, marginBottom:16}}>
              <input
                value={name} onChange={e => setName(e.target.value)}
                placeholder="Seu nome (ex: Isabella)"
                style={inputStyle(false)}
              />
              <div style={{position:'relative'}}>
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="Escolha uma senha"
                  style={{...inputStyle(false), paddingRight:44}}
                />
                <button onClick={() => setShowPwd(p => !p)} style={{
                  position:'absolute', right:12, top:'50%', transform:'translateY(-50%)',
                  background:'none', border:'none', cursor:'pointer', fontSize:18, color:t.textSub,
                }}>{showPwd ? '🙈' : '👁️'}</button>
              </div>
              <input
                type={showPwd ? 'text' : 'password'}
                value={password2} onChange={e => setPassword2(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && submitRegisterStep1()}
                placeholder="Confirme a senha"
                style={inputStyle(password2 && password !== password2)}
              />
            </div>

            {error && <div style={{color:'#f55', fontSize:12, marginBottom:12}}>{error}</div>}

            <div style={{display:'flex', gap:10}}>
              <button onClick={goChoose} style={btnSecondary({flex:1})}>← Voltar</button>
              <button onClick={submitRegisterStep1} style={btnPrimary({flex:2})}>
                Próximo: Cores →
              </button>
            </div>
          </>
        )}

        {/* ── CADASTRO step 2: cores ── */}
        {mode === 'register' && step === 2 && (
          <>
            <div style={{fontSize:16, fontWeight:800, color:t.textMain, marginBottom:6}}>
              Olá, <span style={{background:`linear-gradient(135deg,${c1},${c2})`, WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text'}}>{name}</span>! 🎨
            </div>
            <div style={{fontSize:13, color:t.textSub, marginBottom:18}}>Escolha suas 3 cores favoritas:</div>

            {/* Presets */}
            <div style={{display:'flex', gap:7, flexWrap:'wrap', justifyContent:'center', marginBottom:18}}>
              {PRESETS.map(p => (
                <button key={p.label} onClick={() => { setC1(p.c1); setC2(p.c2); setC3(p.c3); }} style={{
                  padding:'6px 13px', borderRadius:16,
                  border: c1===p.c1 ? '2px solid white' : '2px solid transparent',
                  background:`linear-gradient(135deg,${p.c1},${p.c2},${p.c3})`,
                  color:'white', fontWeight:700, fontSize:11, cursor:'pointer',
                  boxShadow: c1===p.c1 ? `0 0 0 3px ${p.c1}88` : 'none',
                  fontFamily:"'Plus Jakarta Sans',sans-serif",
                }}>{p.label}</button>
              ))}
            </div>

            {/* Color pickers */}
            <div style={{display:'flex', gap:14, justifyContent:'center', marginBottom:18}}>
              {[{l:'Cor 1',v:c1,s:setC1},{l:'Cor 2',v:c2,s:setC2},{l:'Cor 3',v:c3,s:setC3}].map(({l,v,s}) => (
                <div key={l} style={{textAlign:'center'}}>
                  <div style={{fontSize:11, fontWeight:700, color:t.textSub, marginBottom:5}}>{l}</div>
                  <div style={{position:'relative', width:58, height:58, borderRadius:14, background:v, boxShadow:`0 6px 16px ${v}99`, overflow:'hidden', cursor:'pointer', margin:'0 auto'}}>
                    <input type="color" value={v} onChange={e => s(e.target.value)}
                      style={{position:'absolute', inset:0, width:'100%', height:'100%', opacity:0, cursor:'pointer'}} />
                    <div style={{width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, pointerEvents:'none'}}>🎨</div>
                  </div>
                  <div style={{fontSize:9, color:t.textSub, marginTop:4, fontWeight:600}}>{v}</div>
                </div>
              ))}
            </div>

            {/* Preview */}
            <div style={{
              borderRadius:14, padding:'11px 18px', marginBottom:18,
              background:`linear-gradient(135deg,${c1},${c2},${c3})`,
              color:'white', fontSize:13, fontWeight:700, transition:'all 0.4s',
            }}>✨ Preview do seu tema</div>

            {error && <div style={{color:'#f55', fontSize:12, marginBottom:12}}>{error}</div>}

            <div style={{display:'flex', gap:10}}>
              <button onClick={() => { setStep(1); setError(''); }} style={btnSecondary({flex:1})}>← Voltar</button>
              <button onClick={submitRegisterStep2} disabled={loading} style={btnPrimary({flex:2})}>
                {loading ? '⏳ Criando...' : 'Criar perfil 🏆'}
              </button>
            </div>
          </>
        )}
      </div>

      <style>{`
        @keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
        * { box-sizing: border-box; }
      `}</style>
    </div>
  );
}

// ─── ALBUM APP ────────────────────────────────────────────────────────────────
function AlbumApp({ profile, progress, theme: t, toggle, saving, onLogout, onUpdateColors }) {
  const [activeTab, setActiveTab]       = useState('selecoes');
  const [activeGroup, setActiveGroup]   = useState('all');
  const [showSettings, setShowSettings] = useState(false);

  const totalColadas = ALL_KEYS.filter(k => (progress[k]||0) >= 1).length;
  const pct = Math.round(totalColadas / ALL_KEYS.length * 100);
  const groups = [...new Set(TEAMS.map(tm => tm.group))];
  const teamsFiltered = activeGroup === 'all' ? TEAMS : TEAMS.filter(tm => tm.group === activeGroup);
  const espKeys = ESPECIAIS_DATA.subsections.flatMap(s => s.items.map(i => i.id));
  const selKeys = TEAMS.flatMap(tm => NUMS.map(n => `${tm.id}-${n}`));

  return (
    <div style={{fontFamily:"'Plus Jakarta Sans',sans-serif", background:t.bg, minHeight:'100vh', padding:'16px 12px 56px', transition:'background 0.4s'}}>

      {/* HEADER */}
      <div style={{textAlign:'center', marginBottom:18, position:'relative'}}>
        <button onClick={() => setShowSettings(true)} style={{
          position:'absolute', left:0, top:4, padding:'6px 14px', borderRadius:20,
          background:t.card, color:t.textSub, border:`1px solid ${t.c1}33`,
          fontSize:11, fontWeight:700, cursor:'pointer', fontFamily:"'Plus Jakarta Sans',sans-serif",
        }}>⚙️ Cores</button>
        <button onClick={onLogout} style={{
          position:'absolute', right:0, top:4, padding:'6px 14px', borderRadius:20,
          background:t.card, color:t.textSub, border:`1px solid ${t.c1}33`,
          fontSize:11, fontWeight:700, cursor:'pointer', fontFamily:"'Plus Jakarta Sans',sans-serif",
        }}>⇄ Sair</button>

        <div style={{fontSize:46, display:'inline-block', animation:'bounce 2s infinite'}}>🏆</div>
        <div style={{
          fontFamily:"'Fredoka',cursive", fontWeight:700, fontSize:'clamp(22px,5vw,36px)',
          background:`linear-gradient(135deg,${t.c1},${t.c2},${t.c3})`,
          WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text',
          lineHeight:1.1, margin:'4px 0',
        }}>Álbum Copa 2026</div>
        <div style={{color:t.c2, fontWeight:800, fontSize:11, letterSpacing:2, textTransform:'uppercase'}}>Controle de Figurinhas Panini</div>
        <div style={{fontFamily:"'Fredoka',cursive", fontWeight:600, fontSize:'clamp(15px,4vw,22px)', color:t.c1, margin:'6px 0 4px'}}>
          ✨ {profile.name} ✨
        </div>
        <div style={{display:'flex', gap:6, justifyContent:'center', marginTop:4}}>
          {[t.c1,t.c2,t.c3].map((c,i) => (
            <div key={i} style={{width:16, height:16, borderRadius:'50%', background:c, boxShadow:`0 2px 8px ${c}88`}} />
          ))}
        </div>
        {saving && <div style={{fontSize:10, color:t.textSub, marginTop:4}}>💾 salvando...</div>}
      </div>

      {/* PROGRESSO */}
      <div style={{background:t.card, borderRadius:18, padding:'14px 18px', marginBottom:16, boxShadow:t.cardShadow, display:'flex', alignItems:'center', gap:12}}>
        <div style={{fontSize:13, fontWeight:800, color:t.c1, whiteSpace:'nowrap'}}>⚽ Progresso</div>
        <div style={{flex:1, height:18, background:t.barBg, borderRadius:9, overflow:'hidden'}}>
          <div style={{height:'100%', width:`${pct}%`, background:`linear-gradient(90deg,${t.c1},${t.c2},${t.c3})`, borderRadius:9, transition:'width 0.5s'}} />
        </div>
        <div style={{fontSize:12, fontWeight:800, color:t.c2, whiteSpace:'nowrap'}}>{totalColadas}/{ALL_KEYS.length} · {pct}%</div>
      </div>

      {/* LEGENDA */}
      <div style={{display:'flex', gap:10, justifyContent:'center', flexWrap:'wrap', marginBottom:16, fontSize:11, fontWeight:700}}>
        {[
          {bg:`linear-gradient(135deg,${t.c1},${t.c2})`, label:'Colada ✅'},
          {bg:`linear-gradient(135deg,${t.c2},${t.c3})`, label:'Repetida 🔁'},
          {bg:t.numEmpty, label:'Falta 🔲', border:`1.5px solid ${t.numBorder}`},
        ].map((l,i) => (
          <div key={i} style={{display:'flex', alignItems:'center', gap:5, color:t.textSub}}>
            <div style={{width:20, height:20, borderRadius:5, background:l.bg, border:l.border||'none'}} />
            {l.label}
          </div>
        ))}
        <div style={{color:t.textSub, fontSize:10}}>1x=colada · 2x=repetida · 3x=limpar</div>
      </div>

      {/* TABS */}
      <div style={{display:'flex', gap:8, marginBottom:14, justifyContent:'center'}}>
        {[
          {id:'selecoes', label:'⚽ Seleções', count: selKeys.filter(k=>(progress[k]||0)>=1).length, total:960},
          {id:'especiais', label:'⭐ Especiais', count: espKeys.filter(k=>(progress[k]||0)>=1).length, total:68},
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
            padding:'9px 20px', borderRadius:22, border:'2px solid',
            borderColor: activeTab===tab.id ? 'transparent' : `${t.c1}33`,
            background: activeTab===tab.id ? `linear-gradient(135deg,${t.c1},${t.c2})` : t.filterBg,
            color: activeTab===tab.id ? 'white' : t.c1,
            fontWeight:800, fontSize:13, cursor:'pointer', transition:'all 0.2s',
            fontFamily:"'Plus Jakarta Sans',sans-serif",
          }}>
            {tab.label} <span style={{opacity:0.75}}>({tab.count}/{tab.total})</span>
          </button>
        ))}
      </div>

      {/* SELEÇÕES */}
      {activeTab === 'selecoes' && <>
        <div style={{display:'flex', gap:7, overflowX:'auto', paddingBottom:8, marginBottom:14}}>
          {['all',...groups].map(g => (
            <button key={g} onClick={() => setActiveGroup(g)} style={{
              flexShrink:0, padding:'5px 13px', borderRadius:20, border:'2px solid',
              borderColor: activeGroup===g ? 'transparent' : `${t.c1}33`,
              background: activeGroup===g ? `linear-gradient(135deg,${t.c1},${t.c2})` : t.filterBg,
              color: activeGroup===g ? 'white' : t.c1,
              fontWeight:800, fontSize:12, cursor:'pointer',
              fontFamily:"'Plus Jakarta Sans',sans-serif",
            }}>{g==='all'?'⚽ Todas':`Grupo ${g}`}</button>
          ))}
        </div>
        <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(270px,1fr))', gap:14}}>
          {teamsFiltered.map(team => {
            const keys = NUMS.map(n => `${team.id}-${n}`);
            const coladas = keys.filter(k => (progress[k]||0) >= 1).length;
            return <TeamCard key={team.id} team={team} keys={keys} progress={progress} toggle={toggle} coladas={coladas} t={t} />;
          })}
        </div>
      </>}

      {/* ESPECIAIS */}
      {activeTab === 'especiais' && (
        <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(270px,1fr))', gap:14}}>
          {ESPECIAIS_DATA.subsections.map(sub => {
            const keys = sub.items.map(i => i.id);
            const coladas = keys.filter(k => (progress[k]||0) >= 1).length;
            return (
              <div key={sub.id} style={{background:t.card, borderRadius:18, boxShadow:t.cardShadow, overflow:'hidden'}}>
                <div style={{background:`linear-gradient(135deg,${t.c1},${t.c2},${t.c3})`, padding:'10px 14px', display:'flex', alignItems:'center', gap:8, color:'white'}}>
                  <span style={{fontSize:20}}>⭐</span>
                  <span style={{fontWeight:800, fontSize:14}}>{sub.label}</span>
                  <span style={{marginLeft:'auto', fontSize:10, background:'rgba(255,255,255,0.25)', padding:'2px 8px', borderRadius:10, fontWeight:800}}>{coladas}/{keys.length}</span>
                </div>
                <div style={{padding:10}}>
                  {sub.items.map(item => (
                    <SpecialBtn key={item.id} item={item} val={progress[item.id]||0} toggle={toggle} t={t} />
                  ))}
                </div>
                <MiniBar coladas={coladas} total={keys.length} t={t} />
              </div>
            );
          })}
        </div>
      )}

      <div style={{textAlign:'center', marginTop:40, fontSize:12, color:t.textSub, fontWeight:700}}>
        Feito com 💖 para <span style={{color:t.c1}}>{profile.name}</span> · Copa do Mundo 2026 🌍
      </div>

      {/* MODAL CORES */}
      {showSettings && (
        <ColorsModal
          t={t} profile={profile}
          onSave={async (c1,c2,c3) => { await onUpdateColors(c1,c2,c3); setShowSettings(false); }}
          onClose={() => setShowSettings(false)}
        />
      )}

      <style>{`@keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}} *{box-sizing:border-box}`}</style>
    </div>
  );
}

// ─── MODAL TROCAR CORES ───────────────────────────────────────────────────────
function ColorsModal({ t, profile, onSave, onClose }) {
  const [c1, setC1] = useState(profile.c1);
  const [c2, setC2] = useState(profile.c2);
  const [c3, setC3] = useState(profile.c3);
  const [loading, setLoading] = useState(false);
  const liveT = buildTheme(c1, c2, c3);

  const save = async () => {
    setLoading(true);
    await onSave(c1, c2, c3);
    setLoading(false);
  };

  return (
    <div style={{position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:999, padding:20}}>
      <div style={{background:t.card, borderRadius:24, padding:'32px 28px', width:'100%', maxWidth:380, textAlign:'center', boxShadow:'0 24px 64px rgba(0,0,0,0.3)'}}>
        <div style={{fontFamily:"'Fredoka',cursive", fontWeight:700, fontSize:20, color:t.textMain, marginBottom:18}}>🎨 Trocar Cores</div>

        <div style={{display:'flex', gap:7, flexWrap:'wrap', justifyContent:'center', marginBottom:18}}>
          {PRESETS.map(p => (
            <button key={p.label} onClick={() => { setC1(p.c1); setC2(p.c2); setC3(p.c3); }} style={{
              padding:'6px 13px', borderRadius:16,
              background:`linear-gradient(135deg,${p.c1},${p.c2},${p.c3})`,
              color:'white', border: c1===p.c1?'2px solid white':'2px solid transparent',
              fontWeight:700, fontSize:11, cursor:'pointer',
              fontFamily:"'Plus Jakarta Sans',sans-serif",
            }}>{p.label}</button>
          ))}
        </div>

        <div style={{display:'flex', gap:14, justifyContent:'center', marginBottom:18}}>
          {[{l:'Cor 1',v:c1,s:setC1},{l:'Cor 2',v:c2,s:setC2},{l:'Cor 3',v:c3,s:setC3}].map(({l,v,s}) => (
            <div key={l} style={{textAlign:'center'}}>
              <div style={{fontSize:11, fontWeight:700, color:t.textSub, marginBottom:5}}>{l}</div>
              <div style={{position:'relative', width:54, height:54, borderRadius:12, background:v, boxShadow:`0 4px 14px ${v}99`, overflow:'hidden', cursor:'pointer', margin:'0 auto'}}>
                <input type="color" value={v} onChange={e => s(e.target.value)}
                  style={{position:'absolute', inset:0, width:'100%', height:'100%', opacity:0, cursor:'pointer'}} />
                <div style={{width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, pointerEvents:'none'}}>🎨</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{borderRadius:12, padding:'10px', marginBottom:18, background:`linear-gradient(135deg,${c1},${c2},${c3})`, color:'white', fontSize:13, fontWeight:700}}>
          ✨ Preview
        </div>

        <div style={{display:'flex', gap:10}}>
          <button onClick={onClose} style={{flex:1, padding:'12px', borderRadius:12, background:t.barBg, color:t.textSub, border:'none', fontWeight:700, cursor:'pointer', fontFamily:"'Plus Jakarta Sans',sans-serif"}}>Cancelar</button>
          <button onClick={save} disabled={loading} style={{flex:2, padding:'12px', borderRadius:12, background:`linear-gradient(135deg,${c1},${c2})`, color:'white', border:'none', fontWeight:800, cursor:'pointer', fontFamily:"'Plus Jakarta Sans',sans-serif"}}>
            {loading ? '⏳' : '✅ Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── TEAM CARD ────────────────────────────────────────────────────────────────
function TeamCard({ team, keys, progress, toggle, coladas, t }) {
  return (
    <div style={{background:t.card, borderRadius:18, boxShadow:t.cardShadow, overflow:'hidden', transition:'transform 0.2s'}}
      onMouseEnter={e=>e.currentTarget.style.transform='translateY(-4px)'}
      onMouseLeave={e=>e.currentTarget.style.transform='translateY(0)'}>
      <div style={{background:`linear-gradient(135deg,${t.c1}cc,${t.c2}cc)`, padding:'10px 14px', display:'flex', alignItems:'center', gap:8, color:'white'}}>
        <span style={{fontSize:24}}>{team.flag}</span>
        <span style={{fontWeight:800, fontSize:14, fontFamily:"'Fredoka',cursive"}}>{team.name}</span>
        <span style={{marginLeft:'auto', fontSize:10, background:'rgba(255,255,255,0.22)', padding:'2px 9px', borderRadius:10, fontWeight:800}}>GRP {team.group}</span>
      </div>
      <div style={{display:'grid', gridTemplateColumns:'repeat(10,1fr)', gap:3, padding:8}}>
        {keys.map((key,i) => (
          <NumBtn key={key} val={progress[key]||0} label={i+1} onClick={()=>toggle(key)} t={t} />
        ))}
      </div>
      <MiniBar coladas={coladas} total={20} t={t} />
    </div>
  );
}

function NumBtn({ val, label, onClick, t }) {
  const [pop, setPop] = useState(false);
  const handle = () => { setPop(true); setTimeout(()=>setPop(false),220); onClick(); };
  const bg = val===1 ? `linear-gradient(135deg,${t.c1},${t.c2})` : val===2 ? `linear-gradient(135deg,${t.c2},${t.c3})` : t.numEmpty;
  return (
    <button onClick={handle} style={{
      aspectRatio:'1', borderRadius:6,
      border:`1.5px solid ${val>=1?'transparent':t.numBorder}`,
      background:bg, color:val>=1?'white':(t.dark?'#444':'#bbb'),
      fontSize:10, fontWeight:800, cursor:'pointer', position:'relative',
      display:'flex', alignItems:'center', justifyContent:'center',
      transform:pop?'scale(1.38)':'scale(1)', transition:'transform 0.15s',
      fontFamily:"'Plus Jakarta Sans',sans-serif",
    }}>
      {label}
      {val===2 && <span style={{position:'absolute', top:-3, right:-3, background:'#FF3D00', color:'white', borderRadius:'50%', width:10, height:10, fontSize:8, display:'flex', alignItems:'center', justifyContent:'center'}}>+</span>}
    </button>
  );
}

function SpecialBtn({ item, val, toggle, t }) {
  const bg = val===1?`linear-gradient(135deg,${t.c1},${t.c2})`:val===2?`linear-gradient(135deg,${t.c2},${t.c3})`:t.numEmpty;
  return (
    <button onClick={()=>toggle(item.id)} style={{
      width:'100%', padding:'7px 10px', marginBottom:4, borderRadius:9,
      border:val>=1?'none':`1.5px solid ${t.numBorder}`,
      background:bg, color:val>=1?'white':t.textSub,
      fontWeight:700, fontSize:12, cursor:'pointer',
      textAlign:'left', display:'flex', justifyContent:'space-between', alignItems:'center',
      transition:'all 0.15s', fontFamily:"'Plus Jakarta Sans',sans-serif",
    }}>
      <span>{item.label}</span>
      <span>{val===0?'🔲':val===1?'✅':'🔁'}</span>
    </button>
  );
}

function MiniBar({ coladas, total, t }) {
  return (
    <div style={{padding:'4px 10px 10px', display:'flex', gap:8, alignItems:'center'}}>
      <div style={{flex:1, height:6, background:t.barBg, borderRadius:3, overflow:'hidden'}}>
        <div style={{height:'100%', width:`${Math.round(coladas/total*100)}%`, background:`linear-gradient(90deg,${t.c1},${t.c2})`, borderRadius:3, transition:'width 0.3s'}} />
      </div>
      <div style={{fontSize:10, fontWeight:800, color:t.c1, whiteSpace:'nowrap'}}>{coladas}/{total}</div>
    </div>
  );
}
