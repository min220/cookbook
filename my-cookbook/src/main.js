import { gsap } from 'gsap'
import { recipes } from './data.js'

const book      = document.getElementById('book')
const cover     = document.getElementById('book-cover')
const bookInner = document.getElementById('book-inner')
const leftHalf  = document.getElementById('book-left-half')
const rightHalf = document.getElementById('book-right-half')
const innerL    = document.getElementById('inner-left')
const innerR    = document.getElementById('inner-right')
const topLabel  = document.getElementById('top-label')
const btnClose  = document.getElementById('btn-close')
const btnPrev   = document.getElementById('btn-prev')
const btnNext   = document.getElementById('btn-next')

let current = 0
let isOpen = false

const pageData = (() => {
  const out = [{ type: 'index' }]
  recipes.filter(r => r.id !== 'index').forEach(r => {
    out.push({ type: 'memory', recipe: r })
    out.push({ type: 'recipe', recipe: r })
  })
  return out
})()

// ── OPEN ──

book.addEventListener('click', () => {
  if (isOpen) return
  isOpen = true
  book.style.pointerEvents = 'none'

  gsap.timeline()
    .to(cover, {
      rotateY: -180,
      duration: 0.7,
      ease: 'power2.inOut',
    })
    .to(book, {
      width: '100vw',
      height: '100vh',
      borderRadius: 0,
      duration: 0.55,
      ease: 'power3.out',
    })
    .call(() => {
      leftHalf.style.display = 'none'
      rightHalf.style.display = 'none'
      renderSpread(0, false)
      gsap.set(bookInner, { opacity: 1 })
      bookInner.style.pointerEvents = 'all'
      // only animate in ONCE here, never inside renderSpread
      animateIn()
    })
})
// ── CLOSE ──

btnClose.addEventListener('click', (e) => {
  e.stopPropagation()
  if (!isOpen) return
  isOpen = false
  bookInner.style.pointerEvents = 'none'

  gsap.timeline()
    .to(bookInner, { opacity: 0, duration: 0.2, ease: 'power2.in' })
    .call(() => {
      leftHalf.style.display = 'block'
      rightHalf.style.display = 'block'
      // clear ALL gsap inline styles so the css values take over cleanly
      gsap.set(book, { clearProps: 'width,height,borderRadius,opacity,scale' })
      gsap.set(cover, { clearProps: 'all' })
    })
    .fromTo(book,
      { opacity: 0, scale: 0.9 },
      { opacity: 1, scale: 1, duration: 0.4, ease: 'back.out(1.4)' }
    )
    .call(() => {
      book.style.pointerEvents = 'all'
      current = 0
    })
})
// ── PAGE TURNS ──

btnNext.addEventListener('click', () => turnPage(1))
btnPrev.addEventListener('click', () => turnPage(-1))
document.addEventListener('keydown', e => {
  if (!isOpen) return
  if (e.key === 'ArrowRight') turnPage(1)
  if (e.key === 'ArrowLeft')  turnPage(-1)
  if (e.key === 'Escape')     btnClose.click()
})

function turnPage(dir) {
  const next = current + dir
  if (next < 0 || next >= pageData.length) return
  gsap.timeline()
    .to([innerL, innerR], { opacity: 0, y: -8, duration: 0.15, ease: 'power2.in' })
    .call(() => {
      current = next
      renderSpread(current, false)
      gsap.set([innerL, innerR], { opacity: 1, y: 0 })
      animateIn()
    })
}

// ── RENDER ──

function renderSpread(index, animate) {
  const page = pageData[index]
  topLabel.textContent = page.type === 'index' ? 'contents' : page.recipe.label
  if (page.type === 'index')       renderIndex()
  else if (page.type === 'memory') renderMemory(page.recipe)
  else                             renderRecipe(page.recipe)
  if (animate) animateIn()
}

function animateIn() {
  const els = [...innerL.children, ...innerR.children]
  gsap.killTweensOf(els)
  gsap.fromTo(els,
    { opacity: 0, y: 16 },
    { opacity: 1, y: 0, duration: 0.5, ease: 'expo.out', stagger: 0.05 }
  )
}

function renderIndex() {
  innerL.innerHTML = `
    <div class="chapter-label" style="color:var(--rust)">made with love & flour</div>
    <div class="chapter-title" style="margin-top:8px">a <em>personal</em><br>recipe archive</div>
    <div class="chapter-sub">food is how i say things\ni can't find words for.</div>
    <div class="chapter-line" style="background:var(--rust)"></div>
  `
  innerR.innerHTML = `
    <div class="contents-title">contents</div>
    ${recipes.filter(r => r.id !== 'index').map((r, i) => `
      <div class="contents-row" onclick="window.__go(${i*2+1})">
        <span class="ci-num">0${i+1}</span>
        <span class="ci-name">${r.recipeTitle}</span>
        <span class="ci-tag" style="background:${r.color};color:${r.accent}">${r.id==='soup'?"mom's":'bakes'}</span>
      </div>
    `).join('')}
    <div style="margin-top:20px;font-size:9px;color:rgba(26,18,8,0.28);font-style:italic">← → to turn pages</div>
  `
  window.__go = n => { current = n-1; turnPage(1) }
}

function renderMemory(r) {
  innerL.innerHTML = `
    <div class="chapter-label" style="color:${r.accent}">${r.chapterNum} / ${r.id==='soup'?"mom's kitchen":'bakes'}</div>
    <div class="chapter-title">${r.title.split('\n').map((l,i)=>i===1?`<em>${l}</em>`:l).join('<br>')}</div>
    <div class="chapter-sub">${r.chapterSub}</div>
    <div class="chapter-line" style="background:${r.accent}"></div>
    <div class="chapter-num" style="color:${r.accent}">${r.chapterNum}</div>
  `
  innerR.innerHTML = `
    <div class="mem-text">${r.memory.split('\n\n').join('<br><br>')}</div>
    <div class="mem-who"><span class="mem-dash" style="background:${r.accent}"></span>${r.who}</div>
  `
}

function renderRecipe(r) {
  innerL.innerHTML = `
    <div class="recipe-title">${r.recipeTitle}</div>
    <div class="recipe-sub" style="color:${r.accent}">${r.recipeSub}</div>
    <div class="ing-label">ingredients</div>
    ${r.ingredients.map(i=>`
      <div class="ing-row"><span>${i.name}</span><span class="ing-qty">${i.qty}</span></div>
    `).join('')}
  `
  innerR.innerHTML = `
    <div class="step-label">method</div>
    ${r.steps.map((s,i)=>`
      <div class="step-row">
        <span class="step-n" style="color:${r.accent}">0${i+1}.</span>
        <span class="step-t">${s}</span>
      </div>
    `).join('')}
    <div class="secret-box">
      <div class="secret-label" style="color:${r.accent}">the secret</div>
      <div class="secret-text">${r.secret}</div>
    </div>
  `
}