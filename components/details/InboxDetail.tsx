'use client'

export function InboxDetail() {
  return (
    <>
      <div className="detail-head">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="detail-eyebrow">INBOX · GMAIL</span>
          <span className="demo-badge">Demo data</span>
        </div>
        <h2 className="detail-title">3 unread · 11 today</h2>
        <p className="detail-sub">Welcome Week schedule and Demo Bank statement need eyes.</p>
      </div>
      <div className="detail-grid cols-4">
        <div className="stat-card"><span className="stat-l">Unread</span><span className="stat-v">3</span><span className="stat-d">2 important</span></div>
        <div className="stat-card"><span className="stat-l">Awaiting</span><span className="stat-v">5</span><span className="stat-d">Oldest 2 days</span></div>
        <div className="stat-card"><span className="stat-l">University</span><span className="stat-v">8</span><span className="stat-d">This week</span></div>
        <div className="stat-card"><span className="stat-l">Finance</span><span className="stat-v">2</span><span className="stat-d">Statements</span></div>
      </div>
      <div className="section-head"><span className="eyebrow">UNREAD</span><span className="eyebrow">TODAY</span></div>
      <div className="mail-list">
        {[{av:'EU',cls:'eur',from:'Erasmus University',time:'07:14',subj:'Welcome Week — schedule, campus map, ID pickup'},
          {av:'DB',cls:'bnk',from:'Demo Bank',time:'06:02',subj:'May statement is available · balance €1,842.10'},
          {av:'CO',cls:'coa',from:'Marcus Schipper',time:'Mon 22:40',subj:'Re: Tuesday tutoring — confirmed 16:00'},
        ].map((m) => (
          <div key={m.from + m.time} className="mail unread">
            <span className={`mail-avatar ${m.cls}`}>{m.av}</span>
            <div className="mail-body"><div className="mail-from"><span className="mail-from-name">{m.from}</span><span className="mail-time">{m.time}</span></div><span className="mail-subject">{m.subj}</span></div>
          </div>
        ))}
      </div>
    </>
  )
}
