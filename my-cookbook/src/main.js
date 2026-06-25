import { gsap } from 'gsap'
import { recipes } from './data.js'
window.gsap = gsap // TEMP

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

  setPageBg()
  renderSpread(0, false)

  const bookRect = bookWorld.getBoundingClientRect()

  const tl = gsap.timeline()
  window.__tl = tl // TEMP

  // STEP 1 — the cover flips open. completely on its own: nothing else is
  // scheduled until this entire motion has actually finished playing.
  tl.to(coverLeft, {
    rotateY: -180,
    duration: 0.65,
    ease: 'power2.inOut',
  })
  // the spine/elastic are what actually make the rotation visible — a plain white
  // cover skewing in 3D is nearly invisible on its own, but a straight bar
  // foreshortening into a diagonal clearly reads as "this is turning." let them
  // ride the rotation naturally; backface-visibility hides them at the 90° mark.

  // STEP 2 — only once the flip is verifiably done (this runs after step 1
  // finishes, not at some guessed timestamp) do we measure and swap in the real
  // page, pre-positioned to match the book's exact size, position, and color.
  // the swap is invisible because the two states are identical where it matters.
  tl.call(() => {
    spread.classList.remove('hidden')
    const spreadRect = spread.getBoundingClientRect()
    const scaleX0 = bookRect.width / spreadRect.width
    const scaleY0 = bookRect.height / spreadRect.height
    const x0 = (bookRect.left + bookRect.width / 2) - (spreadRect.left + spreadRect.width / 2)
    const y0 = (bookRect.top + bookRect.height / 2) - (spreadRect.top + spreadRect.height / 2)

    gsap.set([coverLeft, '#book-cover-right'], { opacity: 0 })
    gsap.set(spread, {
      opacity: 1, x: x0, y: y0, scaleX: scaleX0, scaleY: scaleY0, zIndex: 15,
      boxShadow: '0px 10px 20px rgba(26,18,8,0)',
    })
  })

  // STEP 3 — the page, already sitting at the book's exact size/position/color,
  // zooms in to fill the screen.
  tl.to(spread, {
    scaleX: 1, scaleY: 1, x: 0, y: 0,
    duration: 3.5, // TEMP: slowed way down for inspection
    ease: 'power2.out',
  })
  // the shadow only makes sense once the page is actually big, so it eases in
  // alongside the zoom instead of popping to full strength at the swap instant
  tl.to(spread, {
    boxShadow: '0px 30px 70px rgba(26,18,8,0.3)',
    duration: 0.8,
    ease: 'power1.in',
  }, '<')
  tl.call(() => {
    scene.style.display = 'none'
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
      gsap.set('#book-cover-right', { clearProps: 'opacity' })
      gsap.set(['#nb-spine', '#nb-elastic', '#nb-mark', '#nb-label'], { clearProps: 'opacity' })
      gsap.set('#nb-hint', { opacity: 1 })

      scene.style.display = 'flex'
      bookWorld.style.pointerEvents = 'all'

      gsap.fromTo(bookWorld,
        { scale: 0.85, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.5, ease: 'power2.out' }
      )

      document.body.style.background = '#EDEAE3'
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
      renderSpread(current, true)
    })
    // pages snap back
    .to([pageL, pageR], {
      rotateY: 0, scaleX: 1, opacity: 1,
      duration: 0.35, ease: 'back.out(1.4)',
    })
}

// ── BACKGROUND ──

function setPageBg() {
  // the page itself stays white — recipes differentiate via their vibrant accent
  // color (tags, lines, numbers), not a page-wide wash. the body behind it stays
  // the contrasting scene color (not white too), so the white card always reads
  // as a distinct object against its backdrop, open or closed.
  gsap.to(document.body, { backgroundColor: '#EDEAE3', duration: 0.5, ease: 'power2.out' })
  gsap.to([pageL, pageR], { backgroundColor: '#FFFFFF', duration: 0.4 })
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