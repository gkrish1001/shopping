/* Final cleaned JS — single file
   Paste into CodePen JS panel (replace existing JS)
   Option A behavior for uploads: Mock Upload or voice "upload documents" marks uploaded.
   "Complete Order" (voice or button) actually places the order.
*/

(() => {
  // -------------------------
  // STATE + HELPERS
  // -------------------------
  const state = {
    userName: "Team Procode",
    spendingLimit: 735,
    remainingBalance: 735,
    eligibilityIncreaseMax: 50,
    promoCode: "ELECTRO10",
    promoValue: 10,
    promoApplied: false,
    cart: [],
    currentProduct: null,
    lastSearchResults: [],
    currentPage: "home",
    // conversation flags
    awaitingLimit: false,
    awaitingLimitApproval: false,
    awaitingPromo: false,
    awaitingOrderConfirm: false,
    awaitingContinueShopping: false,
    checkedEligibility: false,
    processingEligibility: false,
    cartFlowStage: null,
    shippingFee: 25,
    documentsUploaded: false
  };

  // DOM helpers
  const el = id => document.getElementById(id);
  const mk = (tag, cls, html) => { const n = document.createElement(tag); if (cls) n.className = cls; if (html != null) n.innerHTML = html; return n; };
  const mkImg = (src, alt, w, h) => { const i = new Image(w || undefined, h || undefined); i.src = src; i.alt = alt || ""; i.loading = "lazy"; return i; };
  const fmt = n => `$${Number(n).toLocaleString()}`;

  // Elements (must exist in your HTML)
  const assistantBar = el("assistantBar");
  const breadcrumb = el("breadcrumb");
  const balanceValue = el("balanceValue");
  const overlay = el("overlay");
  const overlayText = overlay ? overlay.querySelector(".overlay-text") : null;
  const promoBanner = el("promoBanner");
  const limitBanner = el("limitBanner");
  const cartList = el("cartList");
  const summarySubtotal = el("summarySubtotal");
  const summaryPromo = el("summaryPromo");
  const summaryTotal = el("summaryTotal");
  const cartBadge = el("cartBadge"); // optional
  const voiceToggle = el("voiceToggle");
  const checkoutBtn = el("checkoutBtn");
  const globalSearch = el("globalSearch");
  const searchBtn = el("searchBtn");

  const safe = fn => { try { return fn(); } catch (e) { console.error(e); } };

  // Speech & assistant bar (female voice preference)
  const speak = (text, opts = {}) => {
    if (assistantBar) assistantBar.textContent = text;
    if (!("speechSynthesis" in window)) return;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = opts.lang || "en-US";
    u.rate = opts.rate || 1;
    u.pitch = opts.pitch || 1.05;
    const voices = speechSynthesis.getVoices();
    const female = voices.find(v => /female|samantha|zira|karen|google uk english female/i.test(v.name));
    if (female) u.voice = female;
    try { window.speechSynthesis.cancel(); window.speechSynthesis.speak(u); } catch (e) {}
  };

  // -------------------------
  // Demo products
  // -------------------------
  const MAC1 = "https://images.purchasingpower.com/medias/conversion515-null?context=bWFzdGVyfHJvb3R8MjgwMjF8aW1hZ2UvanBlZ3xhRE5oTDJoak1TOHhNak16TkRFeU5EQTBNREl5TWk5amIyNTJaWEp6YVc5dU5URTFYMjUxYkd3fDk2NjE4OWMyYzgxNWQwNTBmN2Y3OTExMTVkMjIwOGQ4YzNjMjVlNGU4NjE1NTE4MzMyY2NhNWU4Y2VlZTI3YTk";
  const MAC2 = "https://images.purchasingpower.com/medias/conversion515-null?context=bWFzdGVyfHJvb3R8Mjg4ODZ8aW1hZ2UvanBlZ3xhRFpoTDJneFpDOHhNVGsxTmpZMk16YzNPVE0xT0M5amIyNTJaWEp6YVc5dU5URTFYMjUxYkd3fDQxMzM1N2QzNjBkN2U4YmJkYTVhMTAwYjI2MGZmYTRiN2Q5MTMyZmRhMzRhZWI3NzI3YmQyNTBmNzQ4OGUwMTM";
  const MAC3 = "https://images.purchasingpower.com/medias/conversion515-null?context=bWFzdGVyfHJvb3R8MjU3Mjd8aW1hZ2UvanBlZ3xhRGN3TDJnNE15OHhNVGsxTmpZMU5qVXdORGcyTWk5amIyNTJaWEp6YVc5dU5URTFYMjUxYkd3fDUzZGI3MWVjYjEzMzlmMGIzNWY4MmM1ZTViMjc4MTM5YjA2NWY1NzQ3YWI4YTQxYjk3ZWFhZGQyMmZmOTQzNDk";

  const products = [
    { id: 1, name: "Apple 2025 MacBook Air 13-inch Laptop", price: 749, img: MAC1, tags: ["macbook air","macbook","laptop","13"] },
    { id: 2, name: "Apple MacBook Air 15-inch", price: 1299, img: MAC2, tags: ["macbook air","macbook","laptop","15"] },
    { id: 3, name: "Apple MacBook Pro 14-inch", price: 1599, img: MAC3, tags: ["macbook pro","macbook","laptop","14"] }
  ];

  // -------------------------
  // Page helpers
  // -------------------------
  const pages = {
    home: el("page-home"),
    search: el("page-search"),
    pdp: el("page-pdp"),
    cart: el("page-cart"),
    checkout: el("page-checkout")
  };

  const renderHeader = () => {
    if (balanceValue) balanceValue.textContent = fmt(state.remainingBalance);
    if (cartBadge) { cartBadge.textContent = state.cart.length; cartBadge.classList.toggle("hidden", state.cart.length === 0); }
    const hello = document.querySelector(".hello"); if (hello) hello.textContent = `Hi, ${state.userName}`;
    const voiceLabel = document.querySelector(".voice-label"); if (voiceLabel) voiceLabel.textContent = voiceToggle && voiceToggle.classList.contains("mic-on") ? "Voice On" : "Voice Off";
  };

  const setPage = (name) => {
    state.currentPage = name;
    Object.values(pages).forEach(p => p && p.classList.add("hidden"));
    const page = pages[name]; if (page) page.classList.remove("hidden");
    if (breadcrumb) breadcrumb.textContent = name === "home" ? "" : `Home / ${name}`;
    renderHeader();
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (name === "cart") safe(renderCart);
  };

  // -------------------------
  // Home / product render
  // -------------------------
  const homeGrid = el("homeGrid"), heroImgHost = el("heroImgHost");
  const renderHomeGrid = () => {
    if (!homeGrid) return; homeGrid.innerHTML = "";
    products.forEach(p => {
      const card = mk("div","product");
      const imgCol = mk("div"); imgCol.appendChild(mkImg(p.img,p.name,96,72));
      const meta = mk("div"); meta.appendChild(mk("div","title",p.name));
      const within = p.price <= state.remainingBalance;
      meta.appendChild(mk("div","",`<span class="badge ${within? "limit":""}">${within? "Within Spending Limit":"Price Above Limit"}</span>`));
      meta.appendChild(mk("div","price",fmt(p.price)));
      const actions = mk("div");
      const view = mk("button","btn secondary","View Details"); view.dataset.open = p.id;
      const add = mk("button","btn primary","Add to Cart"); add.dataset.add = p.id;
      actions.appendChild(view); actions.appendChild(add);
      card.appendChild(imgCol); card.appendChild(meta); card.appendChild(actions);
      homeGrid.appendChild(card);
    });
  };

  // -------------------------
  // SEARCH (supports price caps: under/below/less than)
  // -------------------------
  const searchResults = el("searchResults"), searchQueryEcho = el("searchQueryEcho");
  const parseSearch = (q) => {
    const cleaned = (q || "").toLowerCase().trim();
    const priceMatch = cleaned.match(/(?:under|below|less than)\s*\$?(\d{2,6})/);
    const cap = priceMatch ? Number(priceMatch[1]) : undefined;
    return { cleaned, cap };
  };
  const renderSearchResults = list => {
    if (!searchResults) return; searchResults.innerHTML = ""; state.lastSearchResults = list.slice();
    list.forEach(p => {
      const card = mk("div","product");
      const imgCol = mk("div"); imgCol.appendChild(mkImg(p.img,p.name,96,72));
      const meta = mk("div"); meta.appendChild(mk("div","title",p.name));
      if (p.price <= state.remainingBalance) meta.appendChild(mk("div","",`<span class="badge limit">Within Spending Limit</span>`));
      meta.appendChild(mk("div","price",fmt(p.price)));
      const actions = mk("div"); const view = mk("button","btn secondary","View Details"); view.dataset.open = p.id;
      const add = mk("button","btn primary","Add to Cart"); add.dataset.add = p.id;
      actions.appendChild(view); actions.appendChild(add);
      card.appendChild(imgCol); card.appendChild(meta); card.appendChild(actions);
      searchResults.appendChild(card);
    });
  };

  const runSearch = (query) => {
    const { cleaned, cap } = parseSearch(query);
    if (searchQueryEcho) searchQueryEcho.textContent = cleaned || query || "macbook air";
    // Base filter: macbooks (simple demo)
    let list = products.filter(p => p.name.toLowerCase().includes("macbook"));
    if (typeof cap !== "undefined") list = list.filter(p => p.price <= cap);
    renderSearchResults(list);
    setPage("search");
    speak(list.length ? `I found ${list.length} result${list.length>1?"s":""}.` : "No results found.");
  };

  // -------------------------
  // PDP
  // -------------------------
  const pdpContent = el("pdpContent");
  const openProduct = id => {
    const p = products.find(x => Number(x.id) === Number(id)); if (!p) return;
    state.currentProduct = p;
    if (!pdpContent) return; pdpContent.innerHTML = "";
    const panel = mk("div","panel");
    panel.appendChild(mk("div","headline",p.name));
    panel.appendChild(mk("div","",`<span class="badge">In Stock</span> ${p.price <= state.remainingBalance ? '<span class="badge limit">Within My Spending Limit</span>':''}`));
    panel.appendChild(mk("div","price",fmt(p.price)));
    const imgBox = mk("div","image"); imgBox.appendChild(mkImg(p.img,p.name,360,240)); panel.appendChild(imgBox);
    panel.appendChild(mk("p","", "Powerful performance, all-day battery, ultra-portable design."));
    panel.appendChild(mk("ul","", "<li>Retina Display</li><li>Apple silicon</li><li>512GB SSD</li>"));
    const actions = mk("div","row-actions");
    const add = mk("button","btn primary","Add to Cart"); add.id = "pdpAdd";
    const goCart = mk("button","btn secondary","Go to Cart"); goCart.id = "pdpGoCart";
    actions.appendChild(add); actions.appendChild(goCart); panel.appendChild(actions);
    const tips = mk("div","panel",`<h4>Assistant Tips</h4><p>Say <em>"add to cart"</em>, <em>"go to cart"</em>, or <em>"checkout"</em>.</p>`);
    pdpContent.appendChild(panel); pdpContent.appendChild(tips);
    setPage("pdp");
    speak(`Opening ${p.name}. Would you like to add it to your cart?`);
    const btn = el("pdpAdd"); if (btn) btn.onclick = () => { state.currentProduct = p; addToCart(p); };
    const gbtn = el("pdpGoCart"); if (gbtn) gbtn.onclick = () => { setPage("cart"); speak("Opening your cart."); };
  };

  // -------------------------
  // CART & TOTALS
  // -------------------------
  const calcTotals = (includeShipping = false) => {
    const subtotal = state.cart.reduce((s,p) => s + (p.price||0), 0);
    const discount = state.promoApplied ? state.promoValue : 0;
    const shipping = includeShipping ? state.shippingFee : 0;
    const total = Math.max(subtotal - discount + shipping, 0);
    return { subtotal, discount, shipping, total };
  };

  const addToCart = p => {
    if (!p) return;
    state.cart.push({...p});
    speak(`${p.name} added to cart.`);
    if (cartBadge) { cartBadge.textContent = state.cart.length; cartBadge.classList.remove("hidden"); }
    setTimeout(()=> { setPage("cart"); renderCart(); }, 350);
  };

  const removeFromCart = id => { state.cart = state.cart.filter(x => Number(x.id) !== Number(id)); renderCart(); };

  // overlay for eligibility
  const showOverlay = (show, text) => {
    if (!overlay) return;
    overlay.classList.toggle("hidden", !show);
    if (overlayText) overlayText.textContent = text || "Checking eligibility…";
  };

  // eligibility flow
  const runEligibilityCheck = () => {
    if (state.processingEligibility) return;
    state.processingEligibility = true;
    state.awaitingLimit = false;
    state.checkedEligibility = false;
    showOverlay(true, "Checking eligibility…");
    setTimeout(() => {
      showOverlay(false);
      state.processingEligibility = false;
      state.checkedEligibility = true;
      state.awaitingLimitApproval = true;
      safe(renderCart);
      speak(`You are eligible for a ${fmt(state.eligibilityIncreaseMax)} increase in spending limit. Say yes to apply or no to skip.`);
    }, 1100);
  };

  const applyLimitIncrease = (amount) => {
    const inc = Math.min(amount || state.eligibilityIncreaseMax, state.eligibilityIncreaseMax);
    state.spendingLimit += inc;
    state.remainingBalance += inc;
    state.awaitingLimitApproval = false;
    state.checkedEligibility = false;
    renderHeader();
    speak(`Your spending limit has been increased by ${fmt(inc)}.`);
    safe(renderCart);
    if (!state.promoApplied) {
      setTimeout(()=> { state.awaitingPromo = true; speak(`Your cart qualifies for ${fmt(state.promoValue)} off with code ${state.promoCode}. Would you like to apply it?`); }, 700);
    }
  };

  const applyPromo = () => {
    if (state.promoApplied) return;
    state.promoApplied = true;
    state.awaitingPromo = false;
    speak(`Promo ${state.promoCode} applied. ${fmt(state.promoValue)} discount added.`);
    safe(renderCart);
  };

  // toggle checkout button
  const toggleCheckoutButton = (enabled) => {
    if (!checkoutBtn) return;
    checkoutBtn.disabled = !enabled;
    checkoutBtn.classList.toggle("disabled", !enabled);
  };

  // render cart: both banners visible when appropriate
  const renderCart = () => {
    if (!cartList) return;

    // reset some transient flags
    state.awaitingOrderConfirm = false;
    state.awaitingContinueShopping = false;
    state.lastDisambiguation = null;

    cartList.innerHTML = "";
    state.cart.forEach(p => {
      const row = mk("div","row");
      row.appendChild(mk("div","", `<strong>${p.name}</strong><br><span class="muted">Price: ${fmt(p.price)}</span>`));
      const right = mk("div"); const rm = mk("button","btn secondary","Remove"); rm.dataset.remove = p.id; right.appendChild(rm); row.appendChild(right);
      cartList.appendChild(row);
    });

    // totals WITHOUT shipping (cart page)
    const { subtotal, discount, total } = calcTotals(false);
    if (summarySubtotal) summarySubtotal.textContent = fmt(subtotal);
    if (summaryPromo) summaryPromo.textContent = discount ? `- ${fmt(discount)} (${state.promoCode})` : "$0";
    if (summaryTotal) summaryTotal.textContent = fmt(total);

    const over = total > state.remainingBalance;

    // LIMIT BANNER (when over)
    if (over) {
      if (limitBanner) {
        limitBanner.classList.remove("hidden");
        if (!state.checkedEligibility && !state.processingEligibility) {
          limitBanner.innerHTML = `
            <strong>You are over the spending limit.</strong>
            <p>Would you like to check your eligibility?</p>
            <div style="margin-top:8px;"><button id="checkEligBtn" class="btn primary">Check eligibility</button></div>
          `;
          state.awaitingLimit = true;
        } else if (state.processingEligibility) {
          limitBanner.innerHTML = `
            <strong>You are over the spending limit.</strong>
            <p>Checking eligibility…</p>
          `;
        } else if (state.checkedEligibility) {
          limitBanner.innerHTML = `
            <strong>You are eligible for an increase of ${fmt(state.eligibilityIncreaseMax)}.</strong>
            <p>Would you like to increase your limit?</p>
            <div style="margin-top:8px;"><button id="applyIncreaseBtn" class="btn primary">Apply ${fmt(state.eligibilityIncreaseMax)} Increase</button></div>
          `;
        }
      }
      if (state.awaitingLimit && !state.processingEligibility) {
        speak("You are over the spending limit. Would you like to check your eligibility?");
      }
    } else {
      if (limitBanner) limitBanner.classList.add("hidden");
    }

    // PROMO BANNER (when promo available)
    if (promoBanner) {
      if (state.cart.length && !state.promoApplied) {
        promoBanner.classList.remove("hidden");
        promoBanner.innerHTML = `
          <strong>Promo available:</strong>
          <p>The product in your cart is eligible for <strong>${state.promoCode}</strong> (–${fmt(state.promoValue)}). Would you like to apply it?</p>
          <div style="margin-top:8px;"><button id="applyPromoBtn" class="btn">Apply ${state.promoCode}</button></div>
        `;
      } else {
        promoBanner.classList.add("hidden");
      }
    }

    // Checkout prompt logic (no shipping on cart page)
    if (!over) {
      toggleCheckoutButton(true);
      if (!state.awaitingPromo) speak(`Your cart total is ${fmt(total)}. Say "checkout" to proceed.`);
    } else {
      toggleCheckoutButton(false);
    }

    if (state.cart.length === 0) {
      speak("Your cart is empty.");
      if (limitBanner) limitBanner.classList.add("hidden");
      if (promoBanner) promoBanner.classList.add("hidden");
      toggleCheckoutButton(false);
    }
  };

  // -------------------------
  // CHECKOUT & ORDER
  // -------------------------
  const stepElems = {
    step1: el("step1"), step2: el("step2"), step3: el("step3"), step4: el("step4"), step5: el("step5"),
    s1: el("checkoutStep1"), s2: el("checkoutStep2"), s3: el("checkoutStep3"), s4: el("checkoutStep4"), s5: el("checkoutStep5"),
    reviewList: el("reviewList"), orderId: el("orderId"), orderSummary: el("orderSummary"), newBalance: el("newBalance")
  };

  const setActiveStep = n => {
    [stepElems.step1, stepElems.step2, stepElems.step3, stepElems.step4, stepElems.step5].forEach((e,i)=> e && e.classList.toggle("active", i+1===n));
    [stepElems.s1, stepElems.s2, stepElems.s3, stepElems.s4, stepElems.s5].forEach((e,i)=> e && e.classList.toggle("hidden", i+1!==n));
  };

  const goCheckout = () => {
    const { total } = calcTotals(true);
    if (!state.cart.length) { speak("Your cart is empty."); return; }
    if (total > state.remainingBalance) { speak("Please increase your limit before checkout."); return; }
    setPage("checkout");
    setActiveStep(1);
    speak("Shipping address is pre-selected. Say 'next' to continue.");
  };

  const renderReview = () => {
    const { subtotal, discount, shipping, total } = calcTotals(true);
    if (!stepElems.reviewList) return;
    stepElems.reviewList.innerHTML =
      `<div><strong>Shipping address</strong><br>345 PARK AVENUE, NEW YORK, NY 10154</div><hr>` +
      state.cart.map(c => `<div style="margin:6px 0;"><strong>${c.name}</strong> — ${fmt(c.price)}</div>`).join("") +
      `<hr><div>Subtotal: ${fmt(subtotal)}</div><div>Promo: ${discount ? `- ${fmt(discount)} (${state.promoCode})` : "$0"}</div><div>Shipping: ${fmt(shipping)}</div><div><strong>Total: ${fmt(total)}</strong></div>`;
  };

  const placeOrder = () => {
    // ensure documents uploaded if in flow that requires it
    // For demo: require documents only if checkout step4 exists and not skipped
    if (stepElems && stepElems.s4 && !stepElems.s4.classList.contains("hidden") && !state.documentsUploaded) {
      speak("Please upload your documents first. Say 'upload documents' or click Mock Upload.");
      return;
    }
    const { subtotal, discount, shipping, total } = calcTotals(true);
    state.remainingBalance = Math.max(state.remainingBalance - total, 0);
    const oid = `#PP-${new Date().getFullYear()}-${Math.random().toString(36).slice(2,6).toUpperCase()}`;
    if (stepElems.orderId) stepElems.orderId.textContent = oid;
    if (stepElems.newBalance) stepElems.newBalance.textContent = fmt(state.remainingBalance);
    if (stepElems.orderSummary) {
      stepElems.orderSummary.innerHTML =
        `<div><strong>Items:</strong> ${state.cart.map(c=>c.name).join(" ; ")} — <strong>Shipping:</strong> ${fmt(shipping)}</div>` +
        `<div><strong>Subtotal:</strong> ${fmt(subtotal)}</div>` +
        `<div><strong>Promo:</strong> ${discount ? `- ${fmt(discount)} (${state.promoCode})` : "$0"}</div>` +
        `<div><strong>Total Paid:</strong> ${fmt(total)}</div>` +
        `<div><strong>Ship To:</strong> 345 PARK AVENUE, NEW YORK, NY 10154</div>`;
    }
    state.cart = []; state.promoApplied = false; state.documentsUploaded = false;
    renderHeader(); setActiveStep(5);
    speak(`Order confirmed. ${oid}. Your new remaining balance is ${fmt(state.remainingBalance)}.`);
    setTimeout(()=> { state.awaitingContinueShopping = true; speak("Would you like to continue shopping?"); }, 1200);
    if (cartBadge) { cartBadge.textContent = 0; cartBadge.classList.add("hidden"); }
  };

  // -------------------------
  // VOICE ENGINE
  // -------------------------
  let recognition = null, voiceActive = false;

  const updateVoiceUI = on => { if (!voiceToggle) return; voiceToggle.classList.toggle("mic-on", on); const voiceLabel = document.querySelector(".voice-label"); if (voiceLabel) voiceLabel.textContent = on ? "Voice On" : "Voice Off"; };

  const initVoiceEngine = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { if (voiceToggle) { voiceToggle.textContent = "🎤 Not supported"; voiceToggle.disabled = true; } speak("Voice not supported in this browser."); return; }
    recognition = new SR();
    recognition.lang = "en-US";
    recognition.continuous = true;
    recognition.interimResults = false;

    recognition.onresult = e => {
      try {
        const raw = (e.results[e.results.length - 1][0].transcript || "").trim();
        handleVoice(raw);
      } catch (err) { console.error(err); }
    };

    recognition.onerror = e => {
      console.warn("speech error", e); voiceActive = false; updateVoiceUI(false);
      if (e && (e.error === "not-allowed" || e.error === "service-not-allowed")) speak("Microphone blocked. Please allow microphone access.");
      setTimeout(()=> { try { if (voiceActive && recognition) recognition.start(); } catch (err) {} }, 800);
    };

    recognition.onend = () => { if (voiceActive) { try { recognition.start(); } catch (e) {} } };
  };

  const startListening = () => {
    if (!recognition) initVoiceEngine();
    if (!recognition) return;
    try { recognition.start(); voiceActive = true; updateVoiceUI(true); speak("Hi I am Povi, your Next Gen AI shopping Assistant. How can I help you today?"); } catch (e) { console.error(e); }
  };

  const stopListening = () => { if (!recognition) return; try { recognition.stop(); voiceActive = false; updateVoiceUI(false); speak("Voice paused."); } catch (e) { console.error(e); } };

  voiceToggle?.addEventListener("click", () => {
    if (!recognition) initVoiceEngine(); if (!recognition) return;
    if (voiceActive) stopListening(); else startListening();
  });

  // -------------------------
  // VOICE INTENT HANDLING (ordered carefully)
  // -------------------------
  const isYes = txt => { if (!txt) return false; return /\b(yes|yeah|yep|sure|ok|okay|apply|do it)\b/i.test(txt); };
  const isNo = txt => { if (!txt) return false; return /\b(no|nah|nope|not now|dont|don't)\b/i.test(txt); };
  const isAddToCartSpoken = raw => { if (!raw) return false; const r = raw.toLowerCase(); return /\b(add to cart|add cart|add item|add this)\b/.test(r); };
  const isGoToCart = raw => raw && /\b(go to cart|open cart|show cart|my cart)\b/i.test(raw);

  const handleVoice = (raw) => {
    if (!raw) return;
    const cleaned = raw.trim().toLowerCase();

    // 1) Continue shopping prompt after order
    if (state.awaitingContinueShopping) {
      if (isYes(cleaned)) { state.awaitingContinueShopping = false; speak("Great — taking you back to the home page."); setTimeout(()=> setPage("home"), 600); return; }
      if (isNo(cleaned)) { state.awaitingContinueShopping = false; speak("Okay, you can continue from this page."); return; }
      speak("Sorry, I couldn't get that. Can you say that again?"); return;
    }

    // 2) Awaiting order confirm (explicit yes/no)
    if (state.awaitingOrderConfirm) {
      if (isYes(cleaned)) { state.awaitingOrderConfirm = false; placeOrder(); return; }
      if (isNo(cleaned)) { state.awaitingOrderConfirm = false; speak("Order cancelled."); return; }
      speak("Sorry, I couldn't get that. Can you say that again?"); return;
    }

    // 3) After eligibility check — user can say yes/no to apply
    if (state.awaitingLimitApproval) {
      if (isYes(cleaned)) { state.awaitingLimitApproval = false; applyLimitIncrease(state.eligibilityIncreaseMax); return; }
      if (isNo(cleaned)) { state.awaitingLimitApproval = false; speak("Okay, not increasing your limit."); if (!state.promoApplied) { state.awaitingPromo = true; speak(`Your cart qualifies for ${fmt(state.promoValue)} off with code ${state.promoCode}. Would you like to apply it?`); } return; }
      speak("Sorry, I couldn't get that. Can you say yes or no?"); return;
    }

    // 4) Initial eligibility prompt in cart
    if (state.awaitingLimit) {
      if (isYes(cleaned)) { state.awaitingLimit = false; runEligibilityCheck(); return; }
      if (isNo(cleaned)) { state.awaitingLimit = false; speak("Okay, skipping eligibility check."); if (!state.promoApplied) { state.awaitingPromo = true; speak(`Your cart qualifies for ${fmt(state.promoValue)} off with code ${state.promoCode}. Would you like to apply it?`); } return; }
      speak("Sorry, I couldn't get that. Can you say yes or no?"); return;
    }

    // 5) Promo yes/no
    if (state.awaitingPromo) {
      if (isYes(cleaned) || cleaned.includes("apply")) { state.awaitingPromo = false; applyPromo(); return; }
      if (isNo(cleaned)) { state.awaitingPromo = false; speak("Okay, promo skipped."); return; }
      speak("Sorry, I couldn't get that. Can you say yes or no?"); return;
    }

    // 6) Cart-level voice: add to cart, go to cart, checkout
    if (isAddToCartSpoken(raw)) {
      let p = state.currentProduct;
      if (!p && state.lastSearchResults && state.lastSearchResults.length === 1) p = state.lastSearchResults[0];
      if (!p) { speak('Please open a product first, then say "add to cart". Try: "open macbook air".'); return; }
      addToCart(p); return;
    }

    if (isGoToCart(raw)) { setPage("cart"); speak("Opening your cart."); return; }

    if (cleaned.startsWith("open ")) {
      const name = cleaned.replace(/^open\s+/,"");
      let product = products.find(p => p.name.toLowerCase().includes(name));
      if (!product) {
        const candidates = products.filter(p => p.name.toLowerCase().includes(name.split(" ")[0]) || p.tags.some(t => name.includes(t)));
        if (candidates.length === 1) { openProduct(candidates[0].id); return; }
        if (candidates.length > 1) { state.lastDisambiguation = { type: "open", candidates }; speak(`I found a few options. Say first or second.`); return; }
        runSearch(name); return;
      } else { openProduct(product.id); return; }
    }

    if (cleaned.startsWith("show") || cleaned.includes("under") || cleaned.includes("below") || cleaned.startsWith("find")) { runSearch(raw); return; }

    if (/\b(checkout|check out|start checkout|proceed to checkout)\b/.test(cleaned)) { goCheckout(); return; }

    // 7) Checkout next/back handling
    if (/\b(next|continue|proceed|go next)\b/.test(cleaned)) {
      if (!stepElems.s1.classList.contains("hidden")) { setActiveStep(2); speak("Payments selected. Say next."); return; }
      if (!stepElems.s2.classList.contains("hidden")) { setActiveStep(3); renderReview(); speak("Review your order. Say next."); return; }
      if (!stepElems.s3.classList.contains("hidden")) { setActiveStep(4); speak("Upload your documents or say 'upload documents'."); return; }
      speak("Sorry, I couldn't get that. Can you say that again?"); return;
    }

    // 8) FALLBACK (before upload handler) - concise
    // If none matched above, we'll try the upload handler (placed last)
    // but first a short fallback if user is clearly not in upload stage
    // (we'll continue to final upload handler below)
    
    // 9) UPLOAD DOCUMENTS HANDLER (MUST BE LAST so it does not steal cart intents)
    if (stepElems && stepElems.s4 && !stepElems.s4.classList.contains("hidden")) {
      // Upload intent (allow many phrasings)
      if (/\b(upload document|upload documents|upload file|upload files|mock upload|mock upload documents|mock upload files|upload stub|upload paystub)\b/i.test(cleaned)) {
        state.documentsUploaded = true;
        speak("Documents uploaded successfully. Say 'complete order' when you are ready.");
        return;
      }

      // Complete order via voice
      if (/\b(complete order|place order|finish order)\b/i.test(cleaned)) {
        if (!state.documentsUploaded) {
          speak("Please upload your documents first. Say 'upload documents' to continue or click Mock Upload.");
          return;
        }
        placeOrder();
        return;
      }

      // If user says next during upload step
      if (/\b(next|continue|go next)\b/i.test(cleaned)) {
        speak("Please say 'complete order' to finish.");
        return;
      }
    }

    // final fallback if nothing matched
    speak("Sorry, I couldn't get that. Can you say that again?");
  };

  // -------------------------
  // GLOBAL CLICK HANDLERS (UI)
  // -------------------------
  document.body.addEventListener("click", (e) => {
    const t = e.target;
    if (t.matches("[data-nav]")) {
      const dest = t.dataset.nav;
      if (dest === "search") runSearch("macbook air under 1000"); else setPage(dest);
      return;
    }
    if (t.id === "searchBtn") { const q = globalSearch?.value?.trim() || ""; runSearch(q || "macbook air"); return; }
    if (t.classList.contains("hero-shop")) { runSearch("macbook air under 1000"); return; }
    if (t.dataset.open) { openProduct(t.dataset.open); return; }
    if (t.dataset.add) { const p = products.find(x => Number(x.id) === Number(t.dataset.add)); if (p) { state.currentProduct = p; addToCart(p); } return; }
    if (t.dataset.remove) { removeFromCart(t.dataset.remove); return; }

    // Limit/promo banner buttons
    if (t.id === "checkEligBtn") { runEligibilityCheck(); return; }
    if (t.id === "applyIncreaseBtn") { applyLimitIncrease(state.eligibilityIncreaseMax); return; }
    if (t.id === "applyPromoBtn") { applyPromo(); return; }

    // Mock Upload button — Option A: DO NOT auto-complete order
    if (t.id === "mockUploadBtn") {
      state.documentsUploaded = true;
      speak("Documents uploaded successfully. Say 'complete order' when you are ready.");
      // optionally update UI file-status text if you want (demo)
      const statusAllotment = el("statusAllotment"); const statusPaystub = el("statusPaystub");
      if (statusAllotment) statusAllotment.textContent = "Uploaded: allotment.pdf";
      if (statusPaystub) statusPaystub.textContent = "Uploaded: paystub.pdf";
      return;
    }

    // Checkout flow UI
    if (t.id === "checkoutBtn") { goCheckout(); return; }
    if (t.id === "toPayment") { setActiveStep(2); speak("Payment selected. Say next."); return; }
    if (t.id === "backToShipping") { setActiveStep(1); return; }
    if (t.id === "toReview") { setActiveStep(3); renderReview(); speak("Review your order. Say next."); return; }
    if (t.id === "backToPayment") { setActiveStep(2); return; }
    if (t.id === "toDocs") { setActiveStep(4); speak("Upload your documents or say 'upload documents'."); return; }
    if (t.id === "backToReview") { setActiveStep(3); return; }

    // Complete Order button — respects documentsUploaded requirement
    if (t.id === "placeOrderBtn" || t.id === "completeOrderBtn") {
      if (stepElems && stepElems.s4 && !stepElems.s4.classList.contains("hidden") && !state.documentsUploaded) {
        speak("Please upload your documents first. Say 'upload documents' or click Mock Upload.");
        return;
      }
      placeOrder();
      return;
    }

    if (t.id === "keepShoppingBtn") { setPage("home"); return; }
  });

  // -------------------------
  // INIT
  // -------------------------
  const init = () => {
    renderHeader();
    renderHomeGrid();
    setPage("home");
    speak("Hi I am Povi, your Next Gen AI shopping Assistant. How can I help you today?");
    if (cartBadge) cartBadge.classList.toggle("hidden", state.cart.length === 0);
    toggleCheckoutButton(false);
  };

  init();

  // expose for debugging
  window._demoState = state;
  window._reRenderCart = renderCart;
  window._runSearch = runSearch;

})();
