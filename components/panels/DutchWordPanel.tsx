'use client'

/* ── Dutch words ─────────────────────────────────────────── */
export const DUTCH_WORDS = [
  { word: 'goedemorgen',   pronunciation: 'KHoo-duh-MOR-khun',    translation: 'Good morning',       example: 'Goedemorgen! Hoe gaat het met je?' },
  { word: 'dank je wel',   pronunciation: 'DAHNK yuh vel',         translation: 'Thank you',           example: 'Dank je wel voor je hulp!' },
  { word: 'alsjeblieft',   pronunciation: 'als-yuh-BLEEFT',        translation: 'Please / Here you go', example: 'Mag ik een koffie, alsjeblieft?' },
  { word: 'gezellig',      pronunciation: 'khuh-ZEL-ikh',          translation: 'Cozy / Convivial',    example: 'Wat een gezellige avond!' },
  { word: 'lekker',        pronunciation: 'LEK-ur',                translation: 'Nice / Tasty',        example: 'Dat eten was heel lekker.' },
  { word: 'bibliotheek',   pronunciation: 'bib-lee-oh-TAYK',       translation: 'Library',             example: 'Ik ga naar de bibliotheek studeren.' },
  { word: 'tentamen',      pronunciation: 'ten-TAH-men',           translation: 'Exam',                example: 'Ik heb morgen een tentamen statistiek.' },
  { word: 'college',       pronunciation: 'koh-LEH-zhuh',          translation: 'Lecture',             example: 'Het college begint om negen uur.' },
  { word: 'fiets',         pronunciation: 'feets',                 translation: 'Bicycle',             example: 'Mijn fiets staat voor de deur.' },
  { word: 'supermarkt',    pronunciation: 'SUP-ur-markt',          translation: 'Supermarket',         example: 'Ik ga boodschappen doen bij de supermarkt.' },
  { word: 'huur',          pronunciation: 'huur',                  translation: 'Rent',                example: 'De huur in Rotterdam is hoog.' },
  { word: 'ov-chipkaart',  pronunciation: 'oh-vay-CHIP-kahrt',     translation: 'Transit card',        example: 'Vergeet je ov-chipkaart niet op te laden.' },
  { word: 'trein',         pronunciation: 'trayn',                 translation: 'Train',               example: 'De trein naar Amsterdam vertrekt over tien minuten.' },
  { word: 'regenjas',      pronunciation: 'RAY-khun-yahs',         translation: 'Raincoat',            example: 'Neem je regenjas mee, het gaat regenen.' },
  { word: 'boodschappen',  pronunciation: 'BOHD-skhap-pen',        translation: 'Groceries',           example: 'Kun jij boodschappen doen vandaag?' },
  { word: 'kamer',         pronunciation: 'KAH-mer',               translation: 'Room',                example: 'Ik zoek een kamer in het centrum.' },
  { word: 'spreekuur',     pronunciation: 'SPRAYK-uur',            translation: 'Office hours',        example: 'De professor heeft spreekuur op donderdag.' },
  { word: 'cijfer',        pronunciation: 'SAY-fur',               translation: 'Grade',               example: 'Ik heb een acht gehaald voor het tentamen.' },
  { word: 'vak',           pronunciation: 'vak',                   translation: 'Course / Subject',    example: 'Statistiek is een verplicht vak in jaar één.' },
  { word: 'kroket',        pronunciation: 'kroh-KET',              translation: 'Croquette',           example: 'Een kroket uit de muur, alsjeblieft.' },
  { word: 'gefeliciteerd', pronunciation: 'khuh-feh-lee-see-TAYRD',translation: 'Congratulations',    example: 'Gefeliciteerd met je diploma!' },
  { word: 'afspraak',      pronunciation: 'AF-sprahk',             translation: 'Appointment',         example: 'Ik heb een afspraak met mijn begeleider.' },
  { word: 'werkgroep',     pronunciation: 'VERK-khroup',           translation: 'Tutorial group',      example: 'De werkgroep begint om elf uur.' },
  { word: 'stadscentrum',  pronunciation: 'STADS-sen-trum',        translation: 'City centre',         example: 'Het stadscentrum is tien minuten lopen.' },
  { word: 'genoeg',        pronunciation: 'khuh-NOOKH',            translation: 'Enough',              example: 'Dat is meer dan genoeg, dank je.' },
  { word: 'straat',        pronunciation: 'straht',                translation: 'Street',              example: 'In welke straat woon je?' },
  { word: 'aardig',        pronunciation: 'AHR-dikh',              translation: 'Kind / Nice',         example: 'Mijn medestudenten zijn erg aardig.' },
  { word: 'goedenavond',   pronunciation: 'KHoo-dun-AH-vont',      translation: 'Good evening',        example: 'Goedenavond! Kom binnen.' },
  { word: 'winkelen',      pronunciation: 'VINK-uh-len',           translation: 'To shop',             example: 'Ik ga winkelen in de Koopgoot.' },
  { word: 'slaapwel',      pronunciation: 'SLAHP-vel',             translation: 'Sleep well',          example: 'Slaapwel! Tot morgen.' },
] as const

export function getDailyWordIndex() {
  // Day-of-year in the Amsterdam calendar, so the word flips at local midnight —
  // consistent with amsterdamIsoDate(), the app's single source of truth for "today".
  const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Amsterdam' })
  const now = new Date()
  const [year, month, day] = fmt.format(now).split('-').map(Number)
  const jan1 = Date.UTC(year, 0, 1)
  const today = Date.UTC(year, month - 1, day)
  return Math.floor((today - jan1) / 86400000) % DUTCH_WORDS.length
}

export function speakDutch(text: string) {
  if (typeof window === 'undefined' || !window.speechSynthesis) return
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.lang = 'nl-NL'; u.rate = 0.85
  window.speechSynthesis.speak(u)
}

export function DutchWordPanel({ dailyWord }: { dailyWord: typeof DUTCH_WORDS[number] }) {
  const todayWord = dailyWord
  const todayIdx  = DUTCH_WORDS.indexOf(todayWord)
  return (
    <>
      <div className="detail-head">
        <span className="detail-eyebrow">DUTCH WORD OF THE DAY</span>
        <h2 className="detail-title">{todayWord.word}</h2>
        <p className="detail-sub">{todayWord.translation} — {todayWord.example}</p>
      </div>
      <div className="detail-grid cols-3">
        <div className="stat-card"><span className="stat-l">Word</span><span className="stat-v" style={{ fontSize: 20 }}>{todayWord.word}</span><span className="stat-d">{todayWord.translation}</span></div>
        <div className="stat-card"><span className="stat-l">Pronunciation</span><span className="stat-v" style={{ fontSize: 16 }}>{todayWord.pronunciation}</span><span className="stat-d">phonetic</span></div>
        <div className="stat-card"><span className="stat-l">Listen</span><button className="btn-ghost" style={{ marginTop: 6 }} onClick={() => speakDutch(todayWord.word)}>🔊 Say it</button><span className="stat-d" style={{ marginTop: 4 }}>nl-NL</span></div>
      </div>
      <div className="section-head"><span className="eyebrow">ALL 30 WORDS</span><span className="eyebrow">TRANSLATION</span></div>
      <div className="dutch-detail-list">
        {DUTCH_WORDS.map((w, i) => (
          <div key={i} className={`dutch-detail-row${i === todayIdx ? ' today-word' : ''}`}>
            <span className="dutch-row-word">{w.word}</span>
            <span className="dutch-row-pron">{w.pronunciation}</span>
            <span className="dutch-row-trans">{w.translation}</span>
          </div>
        ))}
      </div>
    </>
  )
}
