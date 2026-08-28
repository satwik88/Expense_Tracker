export const CATEGORY_META = {
  Credited:     { emoji: '↓', label: 'Credited'  },
  Food:         { emoji: '🍔', label: 'Food'     },
  Transport:    { emoji: '🚗', label: 'Transport'},
  Bills:        { emoji: '📄', label: 'Bills'    },
  Shopping:     { emoji: '🛍️', label: 'Shopping' },
  Entertainment:{ emoji: '🎬', label: 'Entertain'},
  Education:    { emoji: '📚', label: 'Education'},
  Health:       { emoji: '🏥', label: 'Health'   },
  Other:        { emoji: '📦', label: 'Other'    },
}

export const KEYWORD_MAP = [
  { keywords: ['pocket money','allowance','gift','received from mom','received from dad','cashback','refund','freelance','freelancer','client'], category: 'Credited' },
  { keywords: ['swiggy','zomato','restaurant','cafe','lunch','dinner','groceries','big bazaar','dmart','mess','canteen','food','burger','pizza','tea','chai','coffee','bread','milk','biscuit'], category: 'Food' },
  { keywords: ['uber','ola','metro','petrol','fuel','bus','auto','cab','train','rickshaw','travel','ride','commute'], category: 'Transport' },
  { keywords: ['rent','electricity','wifi','recharge','water bill','gas bill','hostel fee','light bill','internet'], category: 'Bills' },
  { keywords: ['amazon','flipkart','myntra','mall','clothes','shoes','shirt','pant','wardrobe','online shopping','ebay'], category: 'Shopping' },
  { keywords: ['netflix','movie','spotify','prime','bookmyshow','gaming','game','youtube','music','show','entertainment'], category: 'Entertainment' },
  { keywords: ['books','stationery','course','tuition','exam fee','printout','college','class','fees','school','pen','notebook'], category: 'Education' },
  { keywords: ['pharmacy','hospital','doctor','medicine','medical','health','clinic'], category: 'Health' },
]

export function autoCategorize(text) {
  const lower = text.toLowerCase()
  for (const { keywords, category } of KEYWORD_MAP) {
    if (keywords.some(kw => lower.includes(kw))) return category
  }
  return null
}

export function getCatMeta(cat) {
  return CATEGORY_META[cat] || CATEGORY_META.Other
}

export const CATEGORIES = Object.keys(CATEGORY_META)

// Time-of-day helpers
const hour = new Date().getHours()
const dow = new Date().getDay() // 0=Sun,1=Mon,...,6=Sat

const isMorning = hour < 12
const isAfternoon = hour >= 12 && hour < 17
const isEvening = hour >= 17 && hour < 21
const isNight = hour >= 21 || hour < 5

const DAY_NAMES = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']

const greetWith = (n) => n && n.trim() ? n.trim() : null

const RAW = [
  // Time-aware
  { fn: (n) => 'Good morning' + (greetWith(n) ? `, ${n}` : '') },
  { fn: (n) => 'Good morning' + (n ? `, ${n}` : '') },
  { fn: (n) => 'Good afternoon' + (n ? `, ${n}` : '') },
  { fn: (n) => 'Good afternoon' + (greetWith(n) ? `, ${n}` : '') },
  { fn: (n) => 'Good evening' + (n ? `, ${n}` : '') },
  { fn: (n) => 'Good evening' + (greetWith(n) ? `, ${n}` : '') },
  { fn: (n) => 'Evening' + (n ? `, ${n}` : '') },
  { fn: (n) => 'Evening' },
  { fn: (n) => 'Hello, night owl' },
  // Day-aware
  { fn: (n) => `Happy Monday` + (n ? `, ${n}` : '') },
  { fn: (n) => 'Happy Monday' },
  { fn: (n) => `Happy Tuesday` + (n ? `, ${n}` : '') },
  { fn: (n) => 'Happy Tuesday' },
  { fn: (n) => `Happy Wednesday` + (n ? `, ${n}` : '') },
  { fn: (n) => 'Happy Wednesday' },
  { fn: (n) => `Happy Thursday` + (n ? `, ${n}` : '') },
  { fn: (n) => 'Happy Thursday' },
  { fn: (n) => `Happy Friday` + (n ? `, ${n}` : '') },
  { fn: (n) => 'Happy Friday' },
  { fn: (n) => `Happy Saturday` + (n ? `, ${n}` : '') },
  { fn: (n) => 'Happy Saturday!' },
  { fn: (n) => `Happy Sunday` + (n ? `, ${n}` : '') },
  { fn: (n) => 'Happy Sunday' },
  // Personal / name-included
  { fn: (n) => `${n} returns!` },
  { fn: (n) => `Back at it, ${n}` },
  { fn: (n) => `Back at it! Coffee and Claude time?` },
  { fn: (n) => `Greetings, ${n}` },
  { fn: (n) => `Hey there, ${n}` },
  { fn: (n) => `Hi ${n}, how are you?` },
  { fn: (n) => `How's it going, ${n}?` },
  { fn: (n) => `How was your day, ${n}?` },
  { fn: (n) => `Welcome, ${n}` },
  { fn: (n) => `Welcome to the weekend, ${n}` },
  { fn: (n) => `What's new, ${n}?` },
  { fn: (n) => `What's on your mind, ${n}?` },
  { fn: (n) => `What's on your mind tonight?` },
  // No-name variants
  { fn: () => 'Hey there' },
  { fn: () => 'Welcome' },
  { fn: () => "Greetings, whoever you are" },
  { fn: () => "Hi, how are you?" },
  { fn: () => "How's it going?" },
  { fn: () => "How was your day?" },
  { fn: () => 'Welcome to the weekend' },
  { fn: () => "What's new?" },
  { fn: () => "What's on your mind?" },
]

export function getRandomGreeting(name) {
  const candidates = RAW.filter((g) => {
    // Time-based gating
    if (g.fn.toString().includes('Good morning')) return isMorning
    if (g.fn.toString().includes('Good afternoon')) return isAfternoon
    if (g.fn.toString().includes('Good evening')) return isEvening
    if (g.fn.toString().includes('Evening') && !g.fn.toString().includes('Good')) return isEvening
    if (g.fn.toString().includes('night owl')) return isNight
    // Day-of-week gating
    if (g.fn.toString().includes('Happy Monday') && dow !== 1) return false
    if (g.fn.toString().includes('Happy Tuesday') && dow !== 2) return false
    if (g.fn.toString().includes('Happy Wednesday') && dow !== 3) return false
    if (g.fn.toString().includes('Happy Thursday') && dow !== 4) return false
    if (g.fn.toString().includes('Happy Friday') && dow !== 5) return false
    if (g.fn.toString().includes('Happy Saturday') && dow !== 6) return false
    if (g.fn.toString().includes('Happy Sunday') && dow !== 0) return false
    // Weekend gating
    if (g.fn.toString().includes('weekend') && dow !== 0 && dow !== 6) return false
    return true
  })

  const pool = candidates.length > 0 ? candidates : RAW
  const selected = pool[Math.floor(Math.random() * pool.length)]
  const text = selected.fn(name)

  // Format: wrap the name (or "User") in bold-like structure matching existing format
  let pre = '', post = '', displayName = name || 'User'
  const lower = text.toLowerCase()

  // Extract name position and build pre/name/post
  const nameIdx = lower.indexOf(displayName.toLowerCase())
  if (nameIdx >= 0) {
    pre = text.slice(0, nameIdx)
    post = text.slice(nameIdx + displayName.length)
  } else {
    post = text
  }
  return { pre, name: displayName, post }
}
