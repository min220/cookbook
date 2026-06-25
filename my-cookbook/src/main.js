import { gsap } from 'gsap'
import { recipes } from './data.js'

const notebook = document.getElementById('book-world')
const scene     = document.getElementById('scene')
const spread    = document.getElementById('spread')
const pageL     = document.getElementById('page-left')
const pageR     = document.getElementById('page-right')
const innerL    = document.getElementById('inner-left')
const innerR    = document.getElementById('inner-right')
const topLabel  = document.getElementById('top-label')
const btnClose  = document.getElementById('btn-close')
const btnPrev   = document.getElementById('btn-prev')
const btnNext   = document.getElementById('btn-next')

let current = 0
// pages array: index + (memory spread + recipe spread) per recipe
// 0 = contents, then each recipe = 2 spreads (memory, recipe)
const pageData = buildPageData()

function buildPageData() {
  const out = [{ type: 'index' }]
  recipes.filter(r => r.id !== 'index').forEach(r => {
    out.push({ type: 'memory', recipe: r })
    out.push({ type: 'recipe', recipe: r })
  })
  return out
}

// ── OPEN ──

notebook.addEventListener('click', openBook)

function openBook() {
  const bookWorld = document.getElementById('book-world')
  const coverLeft = document.getElementById('book-cover-left')
  bookWorld.style.pointerEvents = 'none'

  // render spread immediately, sitting behind everything
  spread.classList.remove('hidden')
  setPageBg(recipes.filter(r => r.id !== 'index')[0])
  renderSpread(0, false)
  gsap.set(spread, { opacity: 0, zIndex: 5 })
  gsap.set('#scene', { zIndex: 20 }) // scene stays on top during animation

  gsap.timeline()
    // cover swings open
    .to(coverLeft, {
      rotateY: -180,
      duration: 0.75,
      ease: 'power2.inOut',
    })
    // book zooms — spread fades in DURING the zoom so they blend
    .to(bookWorld, {
      scale: 2.5,
      duration: 0.55,
      ease: 'power3.out',
    }, '-=0.15')
    .to(spread, {
      opacity: 1,
      duration: 0.4,
      ease: 'power1.in',
    }, '-=0.4')  // starts fading in halfway through the zoom
    .call(() => {
      scene.style.display = 'none'
      animateIn()
    })
}
// ── CLOSE ──

btnClose.addEventListener('click', () => {
  gsap.to(spread, {
    opacity: 0, scale: 0.9, y: 20, duration: 0.4, ease: 'power3.in',
    onComplete: () => {
      spread.classList.add('hidden')

      // reset everything gsap moved
      const coverLeft = document.getElementById('book-cover-left')
      const bookWorld = document.getElementById('book-world')
      gsap.set(bookWorld, { scale: 1, rotateX: 0, rotateY: 0, clearProps: 'all' })
      gsap.set(coverLeft, { rotateY: 0, clearProps: 'all' })
      gsap.set('#nb-hint', { opacity: 1 })

      scene.style.display = 'flex'
      bookWorld.style.pointerEvents = 'all'

      gsap.fromTo(bookWorld,
        { scale: 0.85, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.5, ease: 'back.out(1.7)' }
      )

      document.body.style.background = '#F5EDD8'
      current = 0
    }
  })
})

// ── PAGE TURNS ──

btnNext.addEventListener('click', () => turnPage(1))
btnPrev.addEventListener('click', () => turnPage(-1))

document.addEventListener('keydown', e => {
  if (spread.classList.contains('hidden')) return
  if (e.key === 'ArrowRight') turnPage(1)
  if (e.key === 'ArrowLeft')  turnPage(-1)
  if (e.key === 'Escape')     btnClose.click()
})

function turnPage(dir) {
  const next = current + dir
  if (next < 0 || next >= pageData.length) return

  const tl = gsap.timeline()

  // pages tilt away like a real page lifting
  tl.to(dir > 0 ? pageL : pageR, {
      rotateY: dir > 0 ? -15 : 15,
      scaleX: 0.92,
      opacity: 0.4,
      duration: 0.22,
      ease: 'power2.in',
    })
    .to(dir > 0 ? pageR : pageL, {
      rotateY: dir > 0 ? 15 : -15,
      scaleX: 0.92,
      opacity: 0.4,
      duration: 0.22,
      ease: 'power2.in',
    }, '<')
    // snap content in
    .call(() => {
      current = next
      setPageBg(pageData[current].recipe || null)
      renderSpread(current, true)
    })
    // pages snap back
    .to([pageL, pageR], {
      rotateY: 0, scaleX: 1, opacity: 1,
      duration: 0.35, ease: 'back.out(1.4)',
    })
}

// ── BACKGROUND ──

function setPageBg(recipe) {
  const color = recipe?.color || '#F5EDD8'
  gsap.to(document.body, { backgroundColor: color, duration: 0.5, ease: 'power2.out' })
  gsap.to([pageL, pageR], { backgroundColor: color, duration: 0.4 })
}

// ── RENDER ──

function renderSpread(index, animate) {
  const page = pageData[index]
  topLabel.textContent = page.type === 'index'
    ? 'contents'
    : page.recipe.label

  if (page.type === 'index')         renderIndex()
  else if (page.type === 'memory')   renderMemory(page.recipe)
  else if (page.type === 'recipe')   renderRecipe(page.recipe)

  if (animate) animateIn()
}

function animateIn() {
  const els = [...innerL.children, ...innerR.children]
  gsap.killTweensOf(els)
  gsap.fromTo(els,
    { opacity: 0, y: 22 },
    { opacity: 1, y: 0, duration: 0.55, ease: 'expo.out', stagger: 0.045 }
  )
}
// ── INDEX PAGE ──

function renderIndex() {
  innerL.innerHTML = `
    <div class="anim-child chapter-label" style="color: var(--rust)">made with love & flour</div>
    <div class="anim-child chapter-title" style="margin-top:8px;font-size:clamp(40px,6vw,64px)">a <em>personal</em><br>recipe archive</div>
    <div class="anim-child chapter-sub">food is how i say things<br>i can't find words for.</div>
    <div class="anim-child chapter-line" style="background:var(--rust);margin-top:28px"></div>
  `

  const rows = recipes
    .filter(r => r.id !== 'index')
    .map((r, i) => `
      <div class="anim-child contents-row" onclick="window.__goTo(${i * 2 + 1})">
        <span class="ci-num">0${i + 1}</span>
        <span class="ci-name">${r.recipeTitle}</span>
        <span class="ci-tag" style="background:${r.color};color:${r.accent}">${r.id === 'soup' ? "mom's" : 'bakes'}</span>
      </div>
    `).join('')

  innerR.innerHTML = `
    <div class="anim-child contents-title">contents</div>
    ${rows}
    <div class="anim-child" style="margin-top:28px;font-size:10px;color:rgba(26,18,8,0.3);font-style:italic;line-height:1.9">
      click a recipe — or use ← → to turn pages
    </div>
  `
  // expose goTo for inline onclick
  window.__goTo = (n) => {
    current = n - 1
    turnPage(1)
  }
}

// ── MEMORY PAGE ──

function renderMemory(r) {
  innerL.innerHTML = `
    <div class="anim-child chapter-label" style="color:${r.accent}">
      ${r.chapterNum} / ${r.id === 'soup' ? "mom's kitchen" : 'bakes'}
    </div>
    <div class="anim-child chapter-title" style="margin-top:6px">${
      r.title.split('\n').map((l, i) => i === 1 ? `<em>${l}</em>` : l).join('<br>')
    }</div>
    <div class="anim-child chapter-sub">${r.chapterSub}</div>
    <div class="anim-child chapter-line" style="background:${r.accent};margin-top:24px"></div>
    <div class="chapter-num" style="color:${r.accent}">${r.chapterNum}</div>
  `

  const paras = r.memory.split('\n\n').map(p =>
    `<span>${p}</span>`
  ).join('<br><br>')

  innerR.innerHTML = `
    <div class="anim-child mem-text">${paras}</div>
    <div class="anim-child mem-who">
      <span class="mem-dash" style="background:${r.accent}"></span>
      ${r.who}
    </div>
  `
}

// ── RECIPE PAGE ──

function renderRecipe(r) {
  const ings = r.ingredients.map(i => `
    <div class="anim-child ing-row">
      <span>${i.name}</span>
      <span class="ing-qty">${i.qty}</span>
    </div>
  `).join('')

  innerL.innerHTML = `
    <div class="anim-child recipe-title">${r.recipeTitle}</div>
    <div class="anim-child recipe-sub" style="color:${r.accent}">${r.recipeSub}</div>
    <div class="anim-child ing-label">ingredients</div>
    ${ings}
    ${r.pageNums?.[0] ? `<div class="pg-num">${r.pageNums[0]}</div>` : ''}
  `

  const steps = r.steps.map((s, i) => `
    <div class="anim-child step-row">
      <span class="step-n" style="color:${r.accent}">0${i + 1}.</span>
      <span class="step-t">${s}</span>
    </div>
  `).join('')

  innerR.innerHTML = `
    <div class="anim-child step-label">method</div>
    ${steps}
    <div class="anim-child secret-box">
      <div class="secret-label" style="color:${r.accent}">the secret</div>
      <div class="secret-text">${r.secret}</div>
    </div>
    ${r.pageNums?.[1] ? `<div class="pg-num">${r.pageNums[1]}</div>` : ''}
  `
}