import { useEffect, useMemo, useRef, useState } from 'react';
import { Activity, ArrowRight, BadgeCheck, BarChart3, BookOpen, Check, ChevronRight, CircleHelp, Clock3, Globe2, Headphones, Leaf, MapPin, Mic, Pause, Play, Radio, RotateCcw, Send, ShieldCheck, Sparkles, Target, TrendingUp, UserRound, Volume2, WifiOff, X } from 'lucide-react';
import { supabase } from './supabase';

type Course = { id: string; code: string; title: string; sector: string; level: string; duration: string; description: string; eligibility: string; delivery: string; locations: string[]; tags: string[]; demand: string };
type Message = { role: 'assistant' | 'user'; text: string; time: string };
type Profile = { name: string; language: string; district: string; education: string; traditional_occupation: string; current_activity: string; interests: string[]; mobility: string; employment_preference: string; constraints: string[] };
type Recommendation = Course & { fit_score: number; reason: string; skill_gaps: string[]; local_opportunity: string };

const languages = [{ name: 'Hindi', native: 'हिन्दी', code: 'hi-IN' }, { name: 'English', native: 'English', code: 'en-IN' }, { name: 'Marathi', native: 'मराठी', code: 'mr-IN' }, { name: 'Telugu', native: 'తెలుగు', code: 'te-IN' }];
const questions = [
  { key: 'name', label: 'Your name', prompt: 'Namaste. I am SwarSkill. What is your name?', hint: 'You can say your name or type it below.' },
  { key: 'district', label: 'Location', prompt: 'Which district or town do you live in?', hint: 'This helps me find opportunities near you.' },
  { key: 'education', label: 'Education', prompt: 'What is the highest class or qualification you have completed?', hint: 'For example: Class 8, Class 10, ITI, or graduation.' },
  { key: 'traditional_occupation', label: 'Family work', prompt: 'What traditional or family work are you familiar with?', hint: 'For example: farming, cattle rearing, stitching, craft, or shop work.' },
  { key: 'interests', label: 'Interests', prompt: 'What kind of work interests you most?', hint: 'Try: agriculture, solar, repair, healthcare, beauty, crafts, or dairy.' },
  { key: 'employment_preference', label: 'Work preference', prompt: 'Would you prefer a job, your own small business, or both?', hint: 'Say job, business, or both.' },
  { key: 'mobility', label: 'Mobility', prompt: 'How far can you travel for work or training?', hint: 'For example: within my village, within my district, or anywhere.' },
];
const defaultProfile: Profile = { name: 'Demo beneficiary', language: 'Hindi', district: 'Bhopal', education: 'Class 10', traditional_occupation: 'Farming', current_activity: '', interests: ['agriculture'], mobility: 'Within district', employment_preference: 'Both', constraints: [] };

function timeNow() { return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }
function normalizeInterest(value: string) { return value.toLowerCase().split(/[,\s]+/).filter(Boolean); }
function scoreCourse(course: Course, profile: Profile): Recommendation {
  const words = new Set([...normalizeInterest(profile.interests.join(' ')), ...normalizeInterest(profile.traditional_occupation), ...normalizeInterest(profile.employment_preference), ...normalizeInterest(profile.education)]);
  const matches = course.tags.filter((tag) => words.has(tag) || [...words].some((word) => tag.includes(word) || word.includes(tag)));
  const nearby = course.locations.some((location) => location.toLowerCase() === profile.district.toLowerCase()) || profile.district.toLowerCase().includes('bhopal') && course.locations.includes('Bhopal');
  let score = 56 + Math.min(matches.length * 8, 24) + (nearby ? 12 : 0) + (course.demand === 'High' ? 4 : 0);
  if (profile.employment_preference.toLowerCase().includes('business') && course.tags.includes('self-employment')) score += 6;
  score = Math.min(score, 98);
  const reason = matches.length ? `Matches your interest in ${matches.slice(0, 2).join(' and ')}${nearby ? `, with a pathway near ${profile.district}` : ''}.` : `A practical pathway with strong local demand and accessible delivery.`;
  return { ...course, fit_score: score, reason, skill_gaps: course.tags.slice(0, 2).map((tag) => `${tag} fundamentals`), local_opportunity: nearby ? `Active opportunities listed around ${profile.district}.` : `Explore nearby district placements and enterprise support.` };
}

export default function App() {
  const [view, setView] = useState<'home' | 'assistant' | 'recommendations' | 'impact'>('home');
  const [language, setLanguage] = useState(languages[0]);
  const [profile, setProfile] = useState<Profile>(defaultProfile);
  const [courses, setCourses] = useState<Course[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [step, setStep] = useState(-1);
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [connected, setConnected] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    void loadCourses();
    const onOnline = () => setConnected(true);
    const onOffline = () => setConnected(false);
    window.addEventListener('online', onOnline); window.addEventListener('offline', onOffline);
    return () => { window.removeEventListener('online', onOnline); window.removeEventListener('offline', onOffline); recognitionRef.current?.stop(); };
  }, []);

  async function loadCourses() {
    const { data, error } = await supabase.from('nsqf_courses').select('*').order('demand', { ascending: false });
    if (!error && data) setCourses(data as Course[]);
  }
  function speak(text: string) {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel(); const utterance = new SpeechSynthesisUtterance(text); utterance.lang = language.code; utterance.rate = 0.94; utterance.onstart = () => setIsSpeaking(true); utterance.onend = () => setIsSpeaking(false); window.speechSynthesis.speak(utterance);
  }
  function startInterview() {
    setView('assistant'); setStep(0); setMessages([{ role: 'assistant', text: questions[0].prompt, time: timeNow() }]); setTimeout(() => speak(questions[0].prompt), 150);
  }
  function startListening() {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) { setToast('Voice input is not available in this browser. You can type your answer instead.'); return; }
    const recognition = new Recognition(); recognition.lang = language.code; recognition.interimResults = false; recognition.continuous = false;
    recognition.onresult = (event) => { const text = event.results[0][0].transcript; setInput(text); setIsListening(false); };
    recognition.onend = () => setIsListening(false); recognition.onerror = () => { setIsListening(false); setToast('I could not hear that clearly. Please try again or type your answer.'); };
    recognitionRef.current = recognition; setIsListening(true); recognition.start();
  }
  function answerQuestion() {
    const answer = input.trim(); if (!answer || step < 0) return;
    const current = questions[step]; const nextProfile = { ...profile } as Profile;
    if (current.key === 'interests') nextProfile.interests = normalizeInterest(answer).slice(0, 4);
    else if (current.key === 'name') nextProfile.name = answer;
    else if (current.key === 'district') nextProfile.district = answer;
    else if (current.key === 'education') nextProfile.education = answer;
    else if (current.key === 'traditional_occupation') nextProfile.traditional_occupation = answer;
    else if (current.key === 'employment_preference') nextProfile.employment_preference = answer;
    else if (current.key === 'mobility') nextProfile.mobility = answer;
    setProfile(nextProfile); setMessages((items) => [...items, { role: 'user', text: answer, time: timeNow() }]); setInput('');
    if (step === questions.length - 1) { finishInterview(nextProfile); return; }
    const next = step + 1; setStep(next); setMessages((items) => [...items, { role: 'assistant', text: questions[next].prompt, time: timeNow() }]); setTimeout(() => speak(questions[next].prompt), 200);
  }
  async function finishInterview(nextProfile: Profile) {
    setSaving(true); const ranked = courses.length ? courses.map((course) => scoreCourse(course, nextProfile)).sort((a, b) => b.fit_score - a.fit_score).slice(0, 4) : [];
    setRecommendations(ranked); setMessages((items) => [...items, { role: 'assistant', text: 'Thank you. I have matched your answers with verified NSQF pathways and local livelihood options.', time: timeNow() }]); speak('Thank you. I have matched your answers with verified NSQF pathways and local livelihood options.');
    const { data: beneficiary } = await supabase.from('beneficiaries').insert({ ...nextProfile, language: language.name, interview_complete: true }).select('id').maybeSingle();
    if (beneficiary?.id) {
      await supabase.from('assessments').insert({ beneficiary_id: beneficiary.id, answers: nextProfile, profile_score: ranked[0]?.fit_score ?? 0, readiness: 'Ready to explore' });
      if (ranked.length) await supabase.from('recommendations').insert(ranked.map((item, index) => ({ beneficiary_id: beneficiary.id, course_id: item.id, rank: index + 1, fit_score: item.fit_score, reason: item.reason, skill_gaps: item.skill_gaps, local_opportunity: item.local_opportunity })));
    }
    setSaving(false); setView('recommendations'); setToast('Your livelihood map is ready.');
  }
  const progress = step < 0 ? 0 : Math.round(((step + 1) / questions.length) * 100);
  const topRecommendation = recommendations[0];
  const sectorCount = useMemo(() => new Set(recommendations.map((item) => item.sector)).size, [recommendations]);

  return <div className="app-shell">
    <header className="topbar"><button className="brand" onClick={() => setView('home')}><span className="brand-mark"><Radio size={18} /></span><span><strong>Swar<span>Skill</span></strong><small>Livelihood Intelligence</small></span></button><nav><button className={view === 'home' ? 'active' : ''} onClick={() => setView('home')}>Home</button><button className={view === 'assistant' ? 'active' : ''} onClick={() => setView('assistant')}>Voice assistant</button><button className={view === 'recommendations' ? 'active' : ''} onClick={() => setView('recommendations')}>My pathways</button><button className={view === 'impact' ? 'active' : ''} onClick={() => setView('impact')}>Impact</button></nav><div className="top-actions"><div className="connection"><span className={connected ? 'dot online' : 'dot'}></span>{connected ? 'Online' : 'Offline mode'}</div><select value={language.name} onChange={(event) => { const picked = languages.find((item) => item.name === event.target.value) ?? languages[0]; setLanguage(picked); }} aria-label="Language"><option>Hindi</option><option>English</option><option>Marathi</option><option>Telugu</option></select><button className="avatar"><UserRound size={16} /></button></div></header>
    {view === 'home' && <Home onStart={startInterview} onExplore={() => setView('recommendations')} />}
    {view === 'assistant' && <Assistant language={language} messages={messages} input={input} setInput={setInput} isListening={isListening} isSpeaking={isSpeaking} progress={progress} step={step} saving={saving} onListen={startListening} onAnswer={answerQuestion} onSpeak={() => { const last = messages[messages.length - 1]; if (last) speak(last.text); }} onReset={() => { setStep(-1); setMessages([]); setInput(''); setView('home'); }} />}
    {view === 'recommendations' && <Recommendations profile={profile} recommendations={recommendations} top={topRecommendation} sectorCount={sectorCount} onStart={startInterview} />}
    {view === 'impact' && <Impact />}
    {toast && <div className="toast"><Check size={16} />{toast}<button onClick={() => setToast('')}><X size={14} /></button></div>}
  </div>;
}

function Home({ onStart, onExplore }: { onStart: () => void; onExplore: () => void }) {
  return <main><section className="hero"><div className="hero-copy"><div className="eyebrow"><span className="pulse"></span> PM-AJAY · GIA COMPONENT</div><h1>Find your next livelihood,<br /><em>in your own voice.</em></h1><p className="hero-lede">SwarSkill listens to your aspirations, understands your strengths, and connects you to verified skilling pathways and opportunities near you.</p><div className="hero-buttons"><button className="primary-button" onClick={onStart}><Mic size={19} />Start voice assessment<ArrowRight size={17} /></button><button className="text-button" onClick={onExplore}>Explore pathways<ChevronRight size={16} /></button></div><div className="trust-row"><div><ShieldCheck size={17} /><span>NSQF aligned</span></div><div><Globe2 size={17} /><span>4 regional languages</span></div><div><WifiOff size={17} /><span>Low-connectivity ready</span></div></div></div><div className="hero-art"><div className="art-glow"></div><div className="orbit orbit-one"></div><div className="orbit orbit-two"></div><div className="voice-card"><div className="wave-label"><span className="wave-dot"></span> SwarSkill is ready</div><div className="waves">{Array.from({ length: 26 }).map((_, i) => <i key={i} style={{ height: `${18 + ((i * 19) % 42)}px` }}></i>)}</div><div className="voice-card-bottom"><div className="assistant-avatar"><Sparkles size={22} /></div><div><strong>“Tell me what you love doing.”</strong><small>Your journey starts here.</small></div><button onClick={onStart}><Play size={18} fill="currentColor" /></button></div></div><div className="floating-tag tag-one"><MapPin size={14} /><span><strong>Local first</strong><small>Opportunities around you</small></span></div><div className="floating-tag tag-two"><BadgeCheck size={15} /><span><strong>Verified pathways</strong><small>NSQF · GIA aligned</small></span></div></div></section><section className="feature-strip"><div className="section-intro"><span className="eyebrow">ONE CONVERSATION. A CLEARER PATH.</span><h2>From aspiration to action.</h2></div><div className="feature-grid"><Feature icon={<Headphones />} number="01" title="Speak naturally" text="No forms or complicated menus. Talk in the language you are comfortable with." /><Feature icon={<Activity />} number="02" title="Build your profile" text="We understand your skills, interests, constraints, and what work means to you." /><Feature icon={<Target />} number="03" title="See your pathways" text="Get ranked, explainable recommendations connected to local opportunity." /></div></section></main>;
}
function Feature({ icon, number, title, text }: { icon: React.ReactNode; number: string; title: string; text: string }) { return <div className="feature"><div className="feature-top"><span className="feature-icon">{icon}</span><small>{number}</small></div><h3>{title}</h3><p>{text}</p></div>; }
function Assistant({ language, messages, input, setInput, isListening, isSpeaking, progress, step, saving, onListen, onAnswer, onSpeak, onReset }: { language: typeof languages[number]; messages: Message[]; input: string; setInput: (value: string) => void; isListening: boolean; isSpeaking: boolean; progress: number; step: number; saving: boolean; onListen: () => void; onAnswer: () => void; onSpeak: () => void; onReset: () => void }) {
  return <main className="workspace"><div className="workspace-header"><div><div className="eyebrow">VOICE ASSESSMENT · {language.name.toUpperCase()}</div><h1>Let’s map your next chapter.</h1><p>A short, friendly conversation. You can speak or type at any time.</p></div><button className="quiet-button" onClick={onReset}><RotateCcw size={15} />Start over</button></div><div className="assessment-layout"><aside className="progress-card"><div className="progress-ring" style={{ '--progress': `${progress * 3.6}deg` } as React.CSSProperties}><div><strong>{progress}%</strong><small>complete</small></div></div><div className="progress-copy"><strong>{step < 0 ? 'Ready when you are' : step === 6 ? 'One last question' : `${7 - step} questions to go`}</strong><span>We keep this private and purposeful.</span></div><div className="question-list">{questions.map((question, index) => <div className={index < step ? 'done' : index === step ? 'current' : ''} key={question.key}><span>{index < step ? <Check size={12} /> : index + 1}</span>{question.label}</div>)}</div><div className="offline-note"><WifiOff size={16} /><span><strong>Low-connectivity mode</strong>Available for the next step even when the signal is weak.</span></div></aside><section className="conversation-card"><div className="conversation-top"><div className="assistant-presence"><span className="presence-avatar"><Sparkles size={18} /></span><span><strong>SwarSkill</strong><small>{isSpeaking ? 'Speaking...' : isListening ? 'Listening...' : 'Your livelihood guide'}</small></span></div><div className="conversation-actions"><span className="secure-label"><ShieldCheck size={14} /> Private session</span><button onClick={onSpeak} aria-label="Read last message aloud"><Volume2 size={17} /></button></div></div><div className="messages">{messages.length === 0 && <div className="empty-chat"><div className="empty-icon"><Mic size={24} /></div><h2>Start with your voice</h2><p>Tap the microphone and tell me a little about yourself.</p></div>}{messages.map((message, index) => <div className={`message-row ${message.role}`} key={`${message.time}-${index}`}><div className="message-bubble">{message.text}<small>{message.time}</small></div></div>)}</div><div className="composer"><div className="input-wrap"><input value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') onAnswer(); }} placeholder={step < 0 ? 'Tap the microphone to begin...' : 'Type your answer here...'} disabled={step < 0 || saving} /><button className={isListening ? 'mic-button listening' : 'mic-button'} onClick={onListen} disabled={step < 0 || saving}>{isListening ? <Pause size={20} /> : <Mic size={20} />}</button></div><button className="send-button" onClick={onAnswer} disabled={!input.trim() || saving}><Send size={18} /></button><div className="composer-hint">{step < 0 ? 'Voice recognition works best in a quiet place.' : questions[step]?.hint}</div></div></section></div></main>;
}
function Recommendations({ profile, recommendations, top, sectorCount, onStart }: { profile: Profile; recommendations: Recommendation[]; top?: Recommendation; sectorCount: number; onStart: () => void }) { return <main className="workspace"><div className="workspace-header recommendation-header"><div><div className="eyebrow">YOUR LIVELIHOOD MAP · {profile.language.toUpperCase()}</div><h1>Pathways made for you.</h1><p>Built from your aspirations, strengths, and the opportunities around {profile.district}.</p></div><button className="primary-button compact" onClick={onStart}><Mic size={17} />Retake assessment</button></div>{recommendations.length === 0 ? <div className="no-results"><div className="empty-icon"><Sparkles size={23} /></div><h2>Your map is waiting</h2><p>Complete the short voice assessment to see your personalized NSQF-aligned pathways.</p><button className="primary-button" onClick={onStart}>Start assessment <ArrowRight size={17} /></button></div> : <><div className="summary-grid"><div className="summary-card featured"><div className="summary-label"><Sparkles size={15} /> Top match</div><div className="top-match"><div className="course-seal"><Leaf size={22} /></div><div><h2>{top?.title}</h2><p>{top?.sector} · {top?.level}</p></div><div className="score"><strong>{top?.fit_score}%</strong><small>fit score</small></div></div><div className="match-reason"><BadgeCheck size={16} /><span>{top?.reason}</span></div></div><div className="summary-card profile-summary"><div className="summary-label"><UserRound size={15} /> Your profile</div><div className="profile-facts"><span><MapPin size={15} />{profile.district}</span><span><BookOpen size={15} />{profile.education}</span><span><Target size={15} />{profile.employment_preference}</span></div><div className="profile-tags">{profile.interests.map((interest) => <span key={interest}>{interest}</span>)}</div></div><div className="mini-stats"><div><strong>{recommendations.length}</strong><span>pathways</span></div><div><strong>{sectorCount}</strong><span>sectors</span></div><div><strong>100%</strong><span>verified</span></div></div></div><div className="recommendation-section"><div className="section-heading"><div><div className="eyebrow">RANKED FOR YOUR JOURNEY</div><h2>Explore your options</h2></div><span className="verified-pill"><ShieldCheck size={14} /> NSQF aligned</span></div><div className="recommendation-grid">{recommendations.map((item, index) => <article className="recommendation-card" key={item.id}><div className="card-topline"><span className="rank">0{index + 1}</span><span className="demand"><TrendingUp size={13} />{item.demand} demand</span></div><div className="course-icon"><Leaf size={19} /></div><h3>{item.title}</h3><p className="course-meta">{item.sector} · {item.level} · {item.duration}</p><p>{item.description}</p><div className="match-line"><span>Fit score</span><strong>{item.fit_score}%</strong><div className="score-bar"><i style={{ width: `${item.fit_score}%` }}></i></div></div><div className="card-detail"><MapPin size={14} /><span>{item.local_opportunity}</span></div><button className="card-action" onClick={() => { navigator.clipboard?.writeText(`${item.title} — ${item.code}`); }}>Save pathway <ArrowRight size={15} /></button></article>)}</div></div></>}</main>; }
function Impact() { return <main className="workspace impact-page"><div className="workspace-header"><div><div className="eyebrow">PROGRAMME INTELLIGENCE</div><h1>Make every intervention count.</h1><p>A shared view for community teams, training partners, and implementation leaders.</p></div><span className="live-pill"><span className="dot online"></span> Prototype dashboard</span></div><div className="impact-hero"><div><div className="summary-label"><BarChart3 size={16} /> SwarSkill in action</div><h2>Turn ground-level voices<br />into better decisions.</h2><p>Track aspiration patterns, identify skill gaps early, and coordinate the right support from assessment to placement.</p></div><div className="impact-orbit"><div className="impact-number"><strong>4.8k</strong><span>profiles mapped</span></div><div className="impact-chip chip-a"><Target size={14} /> 78% pathway clarity</div><div className="impact-chip chip-b"><TrendingUp size={14} /> 24 districts</div></div></div><div className="impact-grid"><div><span className="impact-icon"><Radio /></span><strong>Voice-first inclusion</strong><p>Designed for low literacy, feature phone journeys, and regional language access.</p></div><div><span className="impact-icon"><ShieldCheck /></span><strong>Grounded recommendations</strong><p>Every pathway connects back to verified NSQF information and local context.</p></div><div><span className="impact-icon"><BarChart3 /></span><strong>Actionable coordination</strong><p>See where training, placement, and technical support need attention.</p></div></div></main>; }
