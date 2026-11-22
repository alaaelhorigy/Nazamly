const API_BASE = (() => {
  const { protocol, hostname, port } = window.location;
  if (protocol === "file:") return "http://127.0.0.1:8000";
  const isLocal = hostname === "localhost" || hostname === "127.0.0.1";
  if (isLocal && port && port !== "8000") return "http://127.0.0.1:8000";
  return "";
})();
const REQUEST_TIMEOUT_MS = 95000;

const MODE_LABELS = {
  summary: "ملخص شامل",
  plan: "خطة مذاكرة بالتواريخ والساعات",
  audio: "شرح صوتي مبسط",
  quiz: "اختبار ذكي",
};

const state = {
  activeMode: "summary",
  docFiles: [],
  imageFiles: [],
  currentPlan: null,
  completedTaskIds: [],
  planCelebratedOnce: false,
  currentSummaryMd: "",
  currentAudioScript: "",
  currentAudioBase64: "",
  currentAudioChunks: [],
  activeAudioChunks: [],
  activeAudioChunkIndex: 0,
  currentAudioVoice: localStorage.getItem("nazamly_audio_voice") === "male" ? "male" : "female",
  speechRate: 1,
  currentQuiz: null,
  userAnswers: {},
  quizSubmitted: false,
  lastGiftIdx: -1,
  activeAbortController: null,
  currentUser: null,
  calmHistory: [],
};

// =========================================================================
// 1. رسائل الهدية
// =========================================================================
const baseGiftSeeds = [
  { type: "آية كريمة", quote: "﴿ فَإِنَّ مَعَ الْعُسْرِ يُسْرًا ۝ إِنَّ مَعَ الْعُسْرِ يُسْرًا ﴾", source: "سورة الشرح — الآيتان 5 و 6", note: "كل صعوبة تواجهك في المذاكرة يتبعها تيسير وفتح قريب بإذن الله." },
  { type: "آية كريمة", quote: "﴿ وَقُل رَّبِّ زِدْنِي عِلْمًا ﴾", source: "سورة طه — الآية 114", note: "اطلب من الله الزيادة في الفهم والعلم النافع في بداية كل جلسة." },
  { type: "آية كريمة", quote: "﴿ لَا يُكَلِّفُ اللَّهُ نَفْسًا إِلَّا وُسْعَهَا ﴾", source: "سورة البقرة — الآية 286", note: "اعمل بقدر طاقتك بهدوء واطمئنان، فالله رحيم بعباده." },
  { type: "آية كريمة", quote: "﴿ وَمَن يَتَوَكَّلْ عَلَى اللَّهِ فَهُوَ حَسْبُهُ ﴾", source: "سورة الطلاق — الآية 3", note: "خذ بالأسباب واجتهد، وتوكل على الله في النتيجة." },
  { type: "آية كريمة", quote: "﴿ إِنَّا لَا نُضِيعُ أَجْرَ مَنْ أَحْسَنَ عَمَلًا ﴾", source: "سورة الكهف — الآية 30", note: "كل دقيقة تقضيها في طلب العلم بإخلاص محفوظة عند الله." },
  { type: "آية كريمة", quote: "﴿ يَرْفَعِ اللَّهُ الَّذِينَ آمَنُوا مِنكُمْ وَالَّذِينَ أُوتُوا الْعِلْمَ دَرَجَاتٍ ﴾", source: "سورة المجادلة — الآية 11", note: "طريق العلم رفعة في الدنيا والآخرة." },
  { type: "آية كريمة", quote: "﴿ أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ ﴾", source: "سورة الرعد — الآية 28", note: "اذكر الله كلما شعرت بالتوتر أو التشتت ليعود الهدوء لقلبك." },
  { type: "آية كريمة", quote: "﴿ وَلَسَوْفَ يُعْطِيكَ رَبُّكَ فَتَرْضَىٰ ﴾", source: "سورة الضحى — الآية 5", note: "أبشر بعطاء الله وكرمه وتوفيقه بعد الصبر والاجتهاد." },
  { type: "حديث نبوي صحيح", quote: "«احْرِصْ علَى ما يَنْفَعُكَ، وَاسْتَعِنْ باللَّهِ وَلَا تَعْجِزْ»", source: "رواه مسلم في صحيحه", note: "ركّز على ما ينفعك الآن واستعن بالله ولا تستسلم للكسل أو القلق." },
  { type: "حديث نبوي صحيح", quote: "«مَن سَلَكَ طَرِيقًا يَلْتَمِسُ فيه عِلْمًا، سَهَّلَ اللَّهُ له به طَرِيقًا إلى الجَنَّةِ»", source: "رواه مسلم في صحيحه", note: "طلبك للعلم عبادة عظيمة ييسر الله لك بها الخير." },
  { type: "حديث نبوي صحيح", quote: "«اللَّهُمَّ لَا سَهْلَ إِلَّا مَا جَعَلْتَهُ سَهْلًا، وَأَنْتَ تَجْعَلُ الْحَزْنَ إِذَا شِئْتَ سَهْلًا»", source: "رواه ابن حبان", note: "ردد هذا الدعاء عند استصعاب أي درس أو مسألة." }
];

const motivationalTopics = [
  "تنظيم الوقت", "التركيز العميق", "تجاوز القلق", "الاستمرارية اليومية", "المراجعة الذكية",
  "قوة البدايات الصغيرة", "الثقة بالنفس", "الصبر على الفهم", "ترتيب الأولويات", "هدوء البال",
  "إتقان الأساسيات", "تدوين الملاحظات", "الراحة المتوازنة", "استثمار الساعات", "الهمة العالية",
  "صفاء الذهن", "التدرج في المذاكرة", "مقاومة التسويف", "وضوح الهدف", "الاجتهاد الصادق",
  "تثبيت المعلومات", "الفهم قبل الحفظ", "الاستعداد للامتحان", "المرونة الذهنية", "التفاؤل الإيجابي",
  "حسن التوكل", "الانضباط الهادئ", "تجزئة المهام الكبيرة", "التعلم النشط", "الإنجاز المستمر"
];

const motivationalFrames = [
  { type: "رسالة طمأنينة", q: (t) => `«خطوة صادقة في ${t} كفيلة بتحويل جبل الدروس إلى طريق واضح وممهّد.»`, s: (t) => `بطاقة تشجيع — ${t}`, m: (t) => `ابدأ بجزء واحد في ${t} وستجد ذهنك يتفتح تدريجياً.` },
  { type: "حكمة تعليمية", q: (t) => `«قليلٌ دائم في ${t} خيرٌ من كثيرٍ منقطع يرهق النفس ويشتت الذهن.»`, s: (t) => `منهجية نظّملي — ${t}`, m: (t) => `خصص 25 دقيقة مركّزة الآن لتطبيق ${t} ثم خذ استراحة قصيرة.` },
  { type: "إشراقة أمل", q: (t) => `«كل ما تتعلمه اليوم بـ ${t} يصبح رصيداً ثابتاً يخدمك في امتحانك ومستقبلك.»`, s: (t) => `رسالة تحفيز — ${t}`, m: (t) => `أنت قادر على الإنجاز؛ ثق بقدراتك واستمر بخطى ثابتة في ${t}.` },
  { type: "نصيحة ذهبية", q: (t) => `«الهدوء أثناء ${t} يضاعف سرعة الاستيعاب ويمنحك ذاكرة أكثر ثباتاً.»`, s: (t) => `دليل الطالب — ${t}`, m: (t) => `تنفس بعمق، أبعد المشتتات، وامنح ${t} تركيزك الكامل.` },
  { type: "وقفة مع النفس", q: (t) => `«النجاح لا يشترط الكمال من أول مرة، بل يشترط المحاولة المستمرة في ${t}.»`, s: (t) => `دفتر الإلهام — ${t}`, m: (t) => `كل فكرة تفهمها في ${t} تقرّبك خطوة حقيقية من هدفك.` },
  { type: "بشارة خير", q: (t) => `«ما زرعته من جهد صادق في ${t} ستحصده توفيقاً وطمأنينة يوم النتيجة.»`, s: (t) => `رسائل السكينة — ${t}`, m: (t) => `استعن بالله وواصل مسيرتك بهمة عالية في ${t}.` },
  { type: "قاعدة التميز", q: (t) => `«حين تجمع بين ${t} وحسن التوكل على الله، تتحول الصعوبات إلى إنجازات.»`, s: (t) => `مفكرة النجاح — ${t}`, m: (t) => `راجع ما أنجزته اليوم وافخر بكل خطوة صغيرة حققتها في ${t}.` },
  { type: "تذكير لطيف", q: (t) => `«عقلك مهيأ للفهم والإبداع متى منحته فرصة هادئة عبر ${t}.»`, s: (t) => `همسة لطالب العلم — ${t}`, m: (t) => `قسّم الدرس إلى فقرات صغيرة وطبّق ${t} وستشعر بفرق واضح.` },
  { type: "دفعة طاقة", q: (t) => `«الأيام تمضي، وما يبقى معك هو ثمرة صبرك واجتهادك في ${t}.»`, s: (t) => `زاد المجتهدين — ${t}`, m: (t) => `ابدأ الآن ولو بعشر دقائق من ${t}؛ البداية مفتاح كل إنجاز.` },
  { type: "سكينة القلب", q: (t) => `«اطمئن؛ الله يرى تعبك وسهرك وحرصك على ${t} ولن يضيع سعيك.»`, s: (t) => `رسالة طمأنينة — ${t}`, m: (t) => `اجعل نيتك صالحة واستمر في ${t} بقلب مطمئن.` }
];

const comfortingGifts = (() => {
  const list = [...baseGiftSeeds];
  for (const frame of motivationalFrames) {
    for (const topic of motivationalTopics) {
      if (list.length >= 300) break;
      list.push({ type: frame.type, quote: frame.q(topic), source: frame.s(topic), note: frame.m(topic) });
    }
    if (list.length >= 300) break;
  }
  return list.slice(0, 300);
})();

// =========================================================================
// 2. المؤثرات الصوتية والاحتفال
// =========================================================================
function playClickTone() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(520, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(680, ctx.currentTime + 0.06);
    gain.gain.setValueAtTime(0.05, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.07);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.07);
  } catch (e) {}
}

function playCelebrationFanfare() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const melody = [523.25, 659.25, 783.99, 1046.5, 1318.5];
    melody.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const startTime = ctx.currentTime + idx * 0.08;
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, startTime);
      gain.gain.setValueAtTime(0.001, startTime);
      gain.gain.linearRampToValueAtTime(0.14, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + 0.36);
    });
  } catch (e) {}
}

function triggerCelebrationConfetti() {
  const layer = document.getElementById("celebrationLayer");
  if (!layer) return;
  layer.innerHTML = "";
  layer.classList.remove("hidden");

  const colors = ["#FBBF24", "#F59E0B", "#34D399", "#60A5FA", "#F472B6", "#FEF08A"];
  for (let i = 0; i < 45; i++) {
    const piece = document.createElement("div");
    piece.className = "confetti-piece";
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.animationDuration = `${1.4 + Math.random() * 1.4}s`;
    piece.style.animationDelay = `${Math.random() * 0.35}s`;
    if (i % 3 !== 0) {
      piece.style.width = `${8 + Math.random() * 6}px`;
      piece.style.height = `${12 + Math.random() * 9}px`;
      piece.style.backgroundColor = colors[i % colors.length];
      piece.style.borderRadius = "2px";
    } else {
      piece.textContent = "✦";
      piece.style.color = colors[i % colors.length];
      piece.style.fontSize = `${14 + Math.random() * 8}px`;
    }
    layer.appendChild(piece);
  }

  setTimeout(() => {
    layer.classList.add("hidden");
    layer.innerHTML = "";
  }, 3100);
}

// =========================================================================
// 3. فتح الهدية
// =========================================================================
function openCenterGiftModal() {
  playCelebrationFanfare();
  triggerCelebrationConfetti();

  let idx = Math.floor(Math.random() * comfortingGifts.length);
  if (idx === state.lastGiftIdx) idx = (idx + 1) % comfortingGifts.length;
  state.lastGiftIdx = idx;
  const gift = comfortingGifts[idx];

  const boxBtn = document.getElementById("giftBoxTrigger");
  boxBtn.classList.remove("gift-shaking");
  boxBtn.classList.add("gift-opened-calm");
  document.getElementById("giftBoxEmoji").textContent = "🎉";

  document.getElementById("giftTypeLabel").textContent = gift.type;
  document.getElementById("giftMainQuote").textContent = gift.quote;
  document.getElementById("giftSourceCitation").textContent = gift.source;
  document.getElementById("giftComfortNote").textContent = gift.note;

  const modal = document.getElementById("giftCenterModal");
  modal.classList.remove("hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
  document.getElementById("giftModalInnerCard")?.scrollIntoView({ behavior: "smooth", block: "center" });
}

// =========================================================================
// 4. إدارة الصفحات والشريط الجانبي
// =========================================================================
function isMobileViewport() {
  return window.innerWidth < 1024;
}

function closeMobileSidebar() {
  const sidebar = document.getElementById("appSidebar");
  const backdrop = document.getElementById("mobileSidebarBackdrop");
  if (!sidebar) return;
  sidebar.classList.add("translate-x-full");
  backdrop?.classList.add("hidden");
}

function toggleSidebar() {
  playClickTone();
  const sidebar = document.getElementById("appSidebar");
  const backdrop = document.getElementById("mobileSidebarBackdrop");
  if (!sidebar) return;

  if (isMobileViewport()) {
    const isHidden = sidebar.classList.contains("translate-x-full");
    if (isHidden) {
      sidebar.classList.remove("translate-x-full");
      backdrop?.classList.remove("hidden");
    } else {
      closeMobileSidebar();
    }
    return;
  }

  if (sidebar.classList.contains("sidebar-expanded")) {
    sidebar.classList.remove("sidebar-expanded");
    sidebar.classList.add("sidebar-collapsed");
  } else {
    sidebar.classList.remove("sidebar-collapsed");
    sidebar.classList.add("sidebar-expanded");
  }
}

function switchPage(pageId) {
  playClickTone();
  document.querySelectorAll(".app-page-view").forEach((view) => view.classList.add("hidden"));
  const target = document.getElementById(pageId);
  if (target) target.classList.remove("hidden");

  document.querySelectorAll(".sidebar-item-btn").forEach((btn) => {
    const isActive = btn.getAttribute("data-page") === pageId;
    btn.classList.toggle("cta-primary-btn", isActive);
    btn.classList.toggle("cta-secondary-btn", !isActive);
  });

  if (isMobileViewport()) closeMobileSidebar();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// =========================================================================
// 5. مشغل الصوت
// =========================================================================
function splitTextForTTS(text, maxChars = 450) {
  let remaining = String(text || "").replace(/\r/g, "").trim();
  const chunks = [];
  const marks = ["؟", "!", ".", "؛", "،", "\n"];

  while (remaining.length > maxChars) {
    const windowText = remaining.slice(0, maxChars);
    let cut = -1;

    marks.forEach((mark) => {
      cut = Math.max(cut, windowText.lastIndexOf(mark));
    });

    if (cut < Math.floor(maxChars * 0.4)) {
      cut = windowText.lastIndexOf(" ");
    }

    if (cut < 1) cut = maxChars - 1;

    chunks.push(remaining.slice(0, cut + 1).trim());
    remaining = remaining.slice(cut + 1).trim();
  }

  if (remaining) chunks.push(remaining);
  return chunks.filter(Boolean);
}

async function generateAudioChunks(text, voice) {
  const textChunks = splitTextForTTS(text, 450);
  const audioChunks = [];

  for (let i = 0; i < textChunks.length; i++) {
    const form = new FormData();
    form.append("text", textChunks[i]);
    form.append("voice", voice || "female");

    const data = await postFormWithTimeout("/api/tts-generate", form);

    if (!data || !data.audio_base64) {
      throw new Error(
        "تعذر إنشاء المقطع الصوتي " + (i + 1) + " من " + textChunks.length
      );
    }

    audioChunks.push(data.audio_base64);
  }

  return audioChunks;
}

function configureAudioQueue(audio, autoplay) {
  const player = document.getElementById("lessonAudioPlayer");

  const chunks = Array.isArray(audio)
    ? audio.filter((chunk) => typeof chunk === "string" && chunk.length > 0)
    : (typeof audio === "string" && audio ? [audio] : []);

  if (!player || !chunks.length) return false;

  state.activeAudioChunks = chunks;
  state.activeAudioChunkIndex = 0;

  const loadChunk = (index, shouldPlay) => {
    state.activeAudioChunkIndex = index;

    player.pause();
    player.onended = null;
    player.src = "data:audio/mpeg;base64," + chunks[index];
    player.playbackRate = state.speechRate;

    player.onended = () => {
      if (index + 1 < chunks.length) {
        loadChunk(index + 1, true);
      } else {
        state.activeAudioChunkIndex = chunks.length;
        const status = document.getElementById("audioLiveStatus");
        if (status) status.textContent = "انتهى الشرح الصوتي";
      }
    };

    if (shouldPlay) {
      const playback = player.play();

      if (playback && typeof playback.then === "function") {
        playback.then(() => {
          const status = document.getElementById("audioLiveStatus");
          if (status) status.textContent = "جاري تشغيل الشرح الصوتي...";
        }).catch(() => {
          const status = document.getElementById("audioLiveStatus");
          if (status) status.textContent = "اضغطي زر التشغيل للاستماع";
        });
      }
    } else {
      player.load();
    }
  };

  loadChunk(0, autoplay);
  return true;
}

function playGeneratedAudio(audio, fallbackText = "") {
  if (configureAudioQueue(audio, true)) return;

  if (fallbackText && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(fallbackText);
    utter.lang = "ar-SA";
    utter.rate = state.speechRate;
    window.speechSynthesis.speak(utter);
  }
}

function prepareAudioQueue(audio) {
  return configureAudioQueue(audio, false);
}

function pauseAudioEngine() {
  const player = document.getElementById("lessonAudioPlayer");
  if (player && !player.paused) {
    player.pause();
    document.getElementById("audioLiveStatus").textContent = "⏸️ متوقف مؤقتاً";
  }
  if ("speechSynthesis" in window) window.speechSynthesis.pause();
}

function stopAudioEngine() {
  const player = document.getElementById("lessonAudioPlayer");
  if (player) {
    player.pause();
    player.currentTime = 0;
  }
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();
}

// =========================================================================
// 6. إدارة الأوضاع
// =========================================================================
function setActiveMode(mode) {
  const validMode = MODE_LABELS[mode] ? mode : "summary";
  state.activeMode = validMode;

  const selectEl = document.getElementById("textSendTypeSelect");
  const badgeEl = document.getElementById("activeModeBadge");
  const quizPanel = document.getElementById("quizSetupPanel");
  const timeWrapper = document.getElementById("availableTimeWrapper");
  const audioVoicePicker = document.getElementById("audioVoicePicker");

  if (selectEl) selectEl.value = validMode;
  if (badgeEl) badgeEl.textContent = MODE_LABELS[validMode];

  if (audioVoicePicker) audioVoicePicker.classList.toggle("hidden", validMode !== "audio");

  if (timeWrapper) {
    if (validMode === "plan") timeWrapper.classList.remove("hidden");
    else timeWrapper.classList.add("hidden");
  }

  if (quizPanel) {
    if (validMode === "quiz") quizPanel.classList.remove("hidden");
    else quizPanel.classList.add("hidden");
  }

  document.querySelectorAll(".mode-quick-btn").forEach((btn) => {
    const isSelected = btn.getAttribute("data-mode") === validMode;
    btn.classList.toggle("cta-primary-btn", isSelected);
    btn.classList.toggle("cta-secondary-btn", !isSelected);
  });
}

// =========================================================================
// 7. المصادقة وقاعدة البيانات (SQLite عبر API)
// =========================================================================
function isValidEmailClient(email) {
  return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email.trim());
}

function showAuthView(viewName) {
  const loginForm = document.getElementById("loginAccountForm");
  const regForm = document.getElementById("registerAccountForm");
  const heading = document.getElementById("accountAuthHeading");
  if (!loginForm || !regForm) return;

  if (viewName === "register") {
    loginForm.classList.add("hidden");
    regForm.classList.remove("hidden");
    if (heading) heading.textContent = "إنشاء حساب جديد";
  } else {
    regForm.classList.add("hidden");
    loginForm.classList.remove("hidden");
    if (heading) heading.textContent = "تسجيل الدخول إلى حسابك";
  }
}

async function restoreUserSession() {
  try {
    const res = await fetch(`${API_BASE}/api/auth/session`, {
      method: "GET",
      credentials: "include",
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.detail || "Could not restore login session.");
    }
    state.currentUser = data.user || null;
  } catch (err) {
    console.error("[SESSION RESTORE]", err);
    state.currentUser = null;
  }
  localStorage.removeItem("nazamly_db_user");
  await renderAccountUI();
}

async function saveToUserHistory(itemType, title, contentPayload) {
  if (!state.currentUser) return;

  try {
    const fd = new FormData();
    fd.append("item_type", itemType);
    fd.append("title", title);
    fd.append("payload_json", JSON.stringify(contentPayload));
    await postFormWithTimeout("/api/history/save", fd);
    await renderAccountUI();
  } catch (err) {
    console.error("[HISTORY SAVE]", err);
    showAlert("تعذر حفظ الملخص في حسابك: " + err.message);
  }
}

async function renderAccountUI() {
  const authFormsBox = document.getElementById("authFormsBox");
  const loggedInBox = document.getElementById("loggedInHistoryBox");
  const logoutBtn = document.getElementById("logoutAccountBtn");
  const headerLabel = document.getElementById("headerAccountLabel");
  const heading = document.getElementById("accountAuthHeading");

  if (!state.currentUser) {
    authFormsBox.classList.remove("hidden");
    loggedInBox.classList.add("hidden");
    logoutBtn.classList.add("hidden");
    headerLabel.textContent = "حسابي";
    showAuthView("login");
    return;
  }

  authFormsBox.classList.add("hidden");
  loggedInBox.classList.remove("hidden");
  logoutBtn.classList.remove("hidden");
  if (heading) heading.textContent = "ملفك الشخصي وسجلّك المحفوظ";
  headerLabel.textContent = state.currentUser.full_name;
  document.getElementById("activeUserDisplayName").textContent = state.currentUser.full_name;
  document.getElementById("activeUserEmailDisplay").textContent = state.currentUser.email;

  const listEl = document.getElementById("savedHistoryList");
  listEl.innerHTML = `<p class="text-xs card-subtitle text-center py-4">جاري تحميل السجل من قاعدة البيانات...</p>`;

  try {
    const res = await fetch(`${API_BASE}/api/history/list`, { credentials: "include" });
    const data = await res.json();
    const history = data.items || [];
    document.getElementById("savedRecordsCountBadge").textContent = `${history.length} عناصر محفوظة`;
    listEl.innerHTML = "";

    if (history.length === 0) {
      listEl.innerHTML = `<p class="text-xs sm:text-sm card-subtitle text-center py-6">لا توجد ملخصات أو خطط محفوظة بعد.</p>`;
      return;
    }

    const typeNames = {
      summary: "📄 ملخص شامل",
      plan: "🗓️ خطة مذاكرة",
      audio: "🔊 شرح صوتي",
      quiz: "🏆 اختبار ذكي",
    };

    history.forEach((entry) => {
      const card = document.createElement("div");
      card.className = "inner-subpanel border rounded-2xl p-4 flex flex-col justify-between gap-3";
      card.innerHTML = `
        <div class="space-y-1">
          <div class="flex items-center justify-between gap-2">
            <span class="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full badge-pill">${typeNames[entry.type] || entry.type}</span>
            <span class="text-[11px] card-subtitle">${escapeHtml(entry.createdAt)}</span>
          </div>
          <h5 class="text-sm font-extrabold card-title pt-1">${escapeHtml(entry.title)}</h5>
        </div>
        <div class="flex items-center justify-between gap-2 pt-2 border-t panel-divider">
          <button type="button" data-open-hist="${entry.id}" class="open-hist-btn px-3 py-1.5 rounded-xl text-xs font-extrabold cta-primary-btn cursor-pointer">
            فتح واستعراض
          </button>
          <button type="button" data-del-hist="${entry.id}" class="del-hist-btn px-3 py-1.5 rounded-xl text-xs font-bold text-red-500 border border-red-500/30 cursor-pointer">
            حذف
          </button>
        </div>
      `;
      listEl.appendChild(card);
    });

    document.querySelectorAll(".open-hist-btn").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        const id = Number(e.currentTarget.getAttribute("data-open-hist"));
        const item = history.find((x) => x.id === id);
        if (!item) return;
        switchPage("page-home");
        if (item.type === "summary") {
          state.currentSummaryMd = item.payload.summary || "";
          document.getElementById("summaryMarkdownBox").innerHTML = renderMarkdownSafe(state.currentSummaryMd);
          document.getElementById("summaryResultSection").classList.remove("hidden");
        } else if (item.type === "plan") {
          state.currentPlan = item.payload.plan;
          state.completedTaskIds = item.payload.completed || [];
          renderPlan(true);
        } else if (item.type === "audio") {
          state.currentAudioScript = item.payload.script || "";
          state.currentAudioBase64 = "";

          const player = document.getElementById("lessonAudioPlayer");
          if (player) {
            player.pause();
            player.removeAttribute("src");
            player.load();
          }

          document.getElementById("audioTranscriptDisplay").textContent = state.currentAudioScript;
          document.getElementById("audioResultSection").classList.remove("hidden");

          try {
            state.currentAudioChunks = await generateAudioChunks(
              state.currentAudioScript,
              state.currentAudioVoice || "female"
            );
            state.currentAudioBase64 = state.currentAudioChunks[0] || "";

            if (!state.currentAudioChunks.length) {
              throw new Error("تعذر إنشاء الصوت المختار.");
            }

            prepareAudioQueue(state.currentAudioChunks);
          } catch (err) {
            showAlert("تعذر تجهيز صوت الشرح المحفوظ: " + err.message);
          }
        } else if (item.type === "quiz") {
          state.currentQuiz = item.payload.quiz;
          state.userAnswers = {};
          state.quizSubmitted = false;
          renderQuiz();
        }
      });
    });

    document.querySelectorAll(".del-hist-btn").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        playClickTone();
        const id = Number(e.currentTarget.getAttribute("data-del-hist"));
        const fd = new FormData();
        fd.append("item_id", String(id));
        await postFormWithTimeout("/api/history/delete", fd);
        await renderAccountUI();
      });
    });
  } catch (_) {
    listEl.innerHTML = `<p class="text-xs text-red-400 text-center py-4">تعذر تحميل السجل حالياً.</p>`;
  }
}

// =========================================================================
// 8. بومودورو وستوب واتش
// =========================================================================
let pomoInterval = null;
let pomoSecondsLeft = 25 * 60;
let pomoIsBreak = false;
let pomoCompletedCount = 0;

function updatePomodoroDisplay() {
  const mins = Math.floor(pomoSecondsLeft / 60);
  const secs = pomoSecondsLeft % 60;
  const el = document.getElementById("pomoTimerDisplay");
  if (el) el.textContent = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function resetPomodoroFromInputs() {
  clearInterval(pomoInterval);
  pomoInterval = null;
  pomoIsBreak = false;
  const focusMins = Math.max(1, parseInt(document.getElementById("customFocusMinutes")?.value || "25", 10));
  pomoSecondsLeft = focusMins * 60;
  document.getElementById("pomoPhaseLabel").textContent = "جلسة مذاكرة مركّزة";
  updatePomodoroDisplay();
}

let swInterval = null;
let swElapsedSeconds = 0;

function formatHMS(totalSec) {
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// =========================================================================
// 9. أدوات الشبكة والعرض
// =========================================================================
function showAlert(msg, isError = true) {
  const el = document.getElementById("globalAlert");
  const txt = document.getElementById("globalAlertText");
  txt.textContent = msg;
  el.className = isError
    ? "rounded-2xl p-3.5 sm:p-4 border text-xs sm:text-sm font-bold flex items-center justify-between gap-3 bg-red-500/15 border-red-500 text-red-500"
    : "rounded-2xl p-3.5 sm:p-4 border text-xs sm:text-sm font-bold flex items-center justify-between gap-3 bg-emerald-500/15 border-emerald-500 text-emerald-500";
  el.classList.remove("hidden");
  el.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function hideAlert() {
  document.getElementById("globalAlert")?.classList.add("hidden");
}

function setBusy(busy, title = "", desc = "") {
  const box = document.getElementById("loadingBox");
  const submitBtn = document.getElementById("unifiedSubmitBtn");
  if (busy) {
    document.getElementById("loadingTitle").textContent = title;
    document.getElementById("loadingDesc").textContent = desc;
    box.classList.remove("hidden");
    box.scrollIntoView({ behavior: "smooth", block: "center" });
    if (submitBtn) submitBtn.disabled = true;
  } else {
    box.classList.add("hidden");
    state.activeAbortController = null;
    if (submitBtn) submitBtn.disabled = false;
  }
}

async function postFormWithTimeout(endpoint, formData) {
  const controller = new AbortController();
  state.activeAbortController = controller;
  const timerId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: "POST",
      credentials: "include",
      body: formData,
      signal: controller.signal,
    });
    const rawText = await res.text();
    let data = {};
    try {
      data = rawText ? JSON.parse(rawText) : {};
    } catch (_) {
      throw new Error(`استجابة غير متوقعة من الخادم (HTTP ${res.status}).`);
    }
    if (!res.ok || data.success === false) {
      throw new Error(data.detail || `حدث خطأ في الخادم (HTTP ${res.status}).`);
    }
    return data;
  } catch (err) {
    if (err.name === "AbortError") throw new Error("انتهت مهلة الانتظار؛ حاول مرة أخرى.");
    if (err instanceof TypeError) throw new Error("تعذر الاتصال بالخادم المحلي. تأكد من تشغيل uvicorn.");
    throw err;
  } finally {
    clearTimeout(timerId);
    if (state.activeAbortController === controller) state.activeAbortController = null;
  }
}

function renderMarkdownSafe(mdText) {
  if (typeof marked !== "undefined" && typeof marked.parse === "function") {
    return marked.parse(mdText);
  }
  return escapeHtml(mdText).replace(/\n/g, "<br>");
}

function escapeHtml(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function buildPayload(extra = {}) {
  const textVal = document.getElementById("studyTextInput").value.trim();
  const timeVal = state.activeMode === "plan" ? document.getElementById("availableTimeInput").value.trim() : "";

  if (!textVal && !timeVal && state.docFiles.length === 0 && state.imageFiles.length === 0) {
    showAlert("يرجى إدخال نص أو رفع ملف PDF/TXT أو صورة واحدة على الأقل.");
    return null;
  }

  hideAlert();
  const fd = new FormData();
  fd.append("text_content", textVal || (timeVal ? `الوقت المتاح: ${timeVal}` : ""));
  state.docFiles.forEach((f) => fd.append("files", f));
  state.imageFiles.forEach((f) => fd.append("files", f));
  Object.entries(extra).forEach(([k, v]) => fd.append(k, v));
  return fd;
}

function getShortTitleFromInput() {
  const txt = document.getElementById("studyTextInput").value.trim();
  if (txt) return txt.slice(0, 45) + (txt.length > 45 ? "..." : "");
  if (state.docFiles.length > 0) return state.docFiles[0].name;
  if (state.imageFiles.length > 0) return state.imageFiles[0].name;
  return "جلسة دراسية";
}

function renderPlan(scrollToSec = true) {
  if (!state.currentPlan) return;
  const sec = document.getElementById("planResultSection");
  document.getElementById("planTotalDuration").textContent = state.currentPlan.total_estimated_time || "مجدول";
  document.getElementById("planMentorNote").textContent = state.currentPlan.rescuer_message || "";
  document.getElementById("planPomodoroNote").textContent = state.currentPlan.pomodoro_tip
    ? `⏱️ نظام الجلسات: ${state.currentPlan.pomodoro_tip}`
    : "";

  const list = document.getElementById("planScheduleList");
  list.innerHTML = "";

  const tasks = state.currentPlan.tasks || [];
  tasks.forEach((t, idx) => {
    const id = t.id ?? idx + 1;
    const done = state.completedTaskIds.includes(id);

    const item = document.createElement("div");
    item.className = `rounded-2xl border p-4 transition-all ${
      done ? "bg-emerald-500/15 border-emerald-500/50" : "inner-subpanel"
    }`;

    item.innerHTML = `
      <div class="flex items-start gap-3">
        <input type="checkbox" data-plan-chk="${id}" ${done ? "checked" : ""} class="plan-chk mt-1 w-5 h-5 accent-emerald-600 cursor-pointer shrink-0" />
        <div class="flex-1 space-y-1.5">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div class="flex flex-wrap items-center gap-2">
              <span class="text-xs font-black px-2.5 py-0.5 rounded-lg badge-pill">${escapeHtml(t.date_label || `المرحلة ${idx + 1}`)}</span>
              <h4 class="text-sm sm:text-base font-extrabold card-title ${done ? "line-through opacity-70" : ""}">${escapeHtml(t.title)}</h4>
            </div>
            <span class="px-2.5 py-1 rounded-lg border panel-divider card-title text-xs font-bold">🕒 ${escapeHtml(t.time_slot || "")}</span>
          </div>
          <p class="text-xs sm:text-sm card-subtitle leading-relaxed">${escapeHtml(t.action_steps || "")}</p>
        </div>
      </div>
    `;
    list.appendChild(item);
  });

  document.querySelectorAll(".plan-chk").forEach((chk) => {
    chk.addEventListener("change", (e) => {
      playClickTone();
      const id = parseInt(e.target.getAttribute("data-plan-chk"), 10);
      if (e.target.checked) {
        if (!state.completedTaskIds.includes(id)) state.completedTaskIds.push(id);
      } else {
        state.completedTaskIds = state.completedTaskIds.filter((x) => x !== id);
        state.planCelebratedOnce = false;
      }
      renderPlan(false);
    });
  });

  const total = tasks.length;
  const doneCount = state.completedTaskIds.length;
  const pct = total > 0 ? Math.round((doneCount / total) * 100) : 0;
  document.getElementById("planProgressFill").style.width = `${pct}%`;
  document.getElementById("planProgressLabel").textContent = `${pct}% (${doneCount} من ${total})`;

  const celebBanner = document.getElementById("planCompletedCelebrationBanner");
  if (total > 0 && doneCount === total) {
    celebBanner.classList.remove("hidden");
    if (!state.planCelebratedOnce) {
      state.planCelebratedOnce = true;
      playCelebrationFanfare();
      triggerCelebrationConfetti();
    }
  } else {
    celebBanner.classList.add("hidden");
  }

  sec.classList.remove("hidden");
  if (scrollToSec) sec.scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderQuiz() {
  if (!state.currentQuiz || !Array.isArray(state.currentQuiz.questions)) return;
  const sec = document.getElementById("quizResultSection");
  const questions = state.currentQuiz.questions;

  document.getElementById("quizHeadingTitle").textContent = state.currentQuiz.quiz_title || "الاختبار التفاعلي";
  document.getElementById("quizScoreBanner").classList.add("hidden");
  document.getElementById("quizSubmitBar").classList.remove("hidden");

  const list = document.getElementById("quizQuestionsList");
  list.innerHTML = "";

  questions.forEach((q, qIdx) => {
    const card = document.createElement("div");
    card.id = `q-card-${qIdx}`;
    card.className = "inner-subpanel border rounded-2xl p-4 sm:p-5 space-y-3";

    const optsHtml = (q.options || [])
      .map((opt, optIdx) => {
        const letter = ["أ", "ب", "ج", "د"][optIdx] || optIdx + 1;
        return `
          <label id="q-${qIdx}-opt-${optIdx}" class="q-opt-label flex items-center gap-2.5 p-3 rounded-xl border panel-divider cursor-pointer">
            <input type="radio" name="q_group_${qIdx}" value="${optIdx}" data-q="${qIdx}" data-opt="${optIdx}" class="q-radio w-4 h-4 accent-amber-500 cursor-pointer shrink-0" />
            <span class="w-6 h-6 rounded-lg badge-pill font-black text-xs flex items-center justify-center shrink-0">${letter}</span>
            <span class="text-xs sm:text-sm font-bold card-title">${escapeHtml(opt)}</span>
          </label>
        `;
      })
      .join("");

    card.innerHTML = `
      <div class="flex items-start gap-2">
        <span class="px-2.5 py-1 rounded-lg badge-pill text-xs font-black shrink-0 mt-0.5">سؤال ${qIdx + 1}</span>
        <h4 class="text-sm sm:text-base font-extrabold card-title">${escapeHtml(q.question)}</h4>
      </div>
      <div class="space-y-2">${optsHtml}</div>
      <div id="q-exp-${qIdx}" class="hidden rounded-xl p-3.5 border text-xs sm:text-sm leading-relaxed"></div>
    `;
    list.appendChild(card);
  });

  document.querySelectorAll(".q-radio").forEach((r) => {
    r.addEventListener("change", (e) => {
      if (state.quizSubmitted) return;
      playClickTone();
      const qIdx = parseInt(e.target.getAttribute("data-q"), 10);
      const optIdx = parseInt(e.target.getAttribute("data-opt"), 10);
      state.userAnswers[qIdx] = optIdx;
      const total = state.currentQuiz?.questions?.length || 0;
      const answered = Object.keys(state.userAnswers).length;
      document.getElementById("quizProgressBadge").textContent = `أجبت على ${answered} من ${total}`;
    });
  });

  document.getElementById("quizProgressBadge").textContent = `أجبت على 0 من ${questions.length}`;
  sec.classList.remove("hidden");
  sec.scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderAboutVideo(rawUrl) {
  const container = document.getElementById("aboutVideoContainer");
  if (!container || !rawUrl) return;
  const url = rawUrl.trim();
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{6,})/);
  if (ytMatch) {
    container.innerHTML = `<iframe class="w-full h-full" src="https://www.youtube.com/embed/${ytMatch[1]}" title="شرح منصة نظّملي" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
    return;
  }
  container.innerHTML = `<video class="w-full h-full object-contain" controls src="${escapeHtml(url)}"></video>`;
}

// =========================================================================
// 10. ربط جميع الأحداث عند تحميل الصفحة
// =========================================================================
document.addEventListener("DOMContentLoaded", () => {
  const savedTheme = localStorage.getItem("nazamly_theme_mode");
  const isDark = savedTheme ? savedTheme === "dark" : true;
  document.documentElement.classList.toggle("dark", isDark);
  document.documentElement.classList.toggle("light", !isDark);

  setActiveMode("summary");
  restoreUserSession();

  const savedVideoUrl = localStorage.getItem("nazamly_about_video_url");
  if (savedVideoUrl) {
    document.getElementById("aboutVideoUrlInput").value = savedVideoUrl;
    renderAboutVideo(savedVideoUrl);
  }

  document.getElementById("themeToggleBtn")?.addEventListener("click", () => {
    playClickTone();
    const nowDark = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", nowDark);
    document.documentElement.classList.toggle("light", !nowDark);
    localStorage.setItem("nazamly_theme_mode", nowDark ? "dark" : "light");
  });

  document.getElementById("toggleSidebarBtn")?.addEventListener("click", toggleSidebar);
  document.getElementById("collapseSidebarInnerBtn")?.addEventListener("click", toggleSidebar);
  document.getElementById("mobileSidebarBackdrop")?.addEventListener("click", closeMobileSidebar);

  document.querySelectorAll(".page-switch-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const pageId = btn.getAttribute("data-page");
      if (pageId) switchPage(pageId);
    });
  });

  document.getElementById("scrollToWorkspaceBtn")?.addEventListener("click", () => {
    playClickTone();
    document.getElementById("workspaceSection")?.scrollIntoView({ behavior: "smooth" });
  });

  document.getElementById("scrollToFeaturesBtn")?.addEventListener("click", () => {
    playClickTone();
    document.getElementById("featuresSection")?.scrollIntoView({ behavior: "smooth" });
  });

  document.getElementById("closeAlertBtn")?.addEventListener("click", hideAlert);

  document.getElementById("giftBoxTrigger")?.addEventListener("click", openCenterGiftModal);
  document.getElementById("nextGiftBtn")?.addEventListener("click", openCenterGiftModal);
  document.getElementById("closeGiftBtn")?.addEventListener("click", () => {
    playClickTone();
    document.getElementById("giftCenterModal")?.classList.add("hidden");
  });

  document.getElementById("textSendTypeSelect")?.addEventListener("change", (e) => {
    playClickTone();
    setActiveMode(e.target.value);
  });

  document.querySelectorAll(".mode-quick-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      playClickTone();
      setActiveMode(btn.getAttribute("data-mode"));
    });
  });

  const studyTextInput = document.getElementById("studyTextInput");
  studyTextInput?.addEventListener("input", () => {
    document.getElementById("textCharCounter").textContent = `${studyTextInput.value.trim().length} حرف`;
  });

  document.getElementById("docFileInput")?.addEventListener("change", (e) => {
    playClickTone();
    Array.from(e.target.files || []).forEach((f) => {
      if (!state.docFiles.some((x) => x.name === f.name && x.size === f.size)) state.docFiles.push(f);
    });
    e.target.value = "";
    const list = document.getElementById("docFilesList");
    list.innerHTML = "";
    state.docFiles.forEach((file, idx) => {
      const kb = Math.max(1, Math.round(file.size / 1024));
      const row = document.createElement("div");
      row.className = "inner-subpanel border rounded-xl px-3 py-1.5 flex items-center justify-between text-xs";
      row.innerHTML = `<span class="font-bold card-title truncate">📄 ${escapeHtml(file.name)} (${kb} KB)</span>
        <button type="button" data-del-doc="${idx}" class="del-doc-btn text-red-500 font-extrabold px-2 cursor-pointer">حذف</button>`;
      list.appendChild(row);
    });
    document.querySelectorAll(".del-doc-btn").forEach((b) => {
      b.addEventListener("click", () => {
        state.docFiles.splice(Number(b.getAttribute("data-del-doc")), 1);
        b.parentElement?.remove();
      });
    });
  });

  document.getElementById("imageFileInput")?.addEventListener("change", (e) => {
    playClickTone();
    Array.from(e.target.files || []).forEach((f) => {
      if (!state.imageFiles.some((x) => x.name === f.name && x.size === f.size)) state.imageFiles.push(f);
    });
    e.target.value = "";
    const grid = document.getElementById("imageThumbnailsGrid");
    grid.innerHTML = "";
    state.imageFiles.forEach((file, idx) => {
      const url = URL.createObjectURL(file);
      const card = document.createElement("div");
      card.className = "relative rounded-xl overflow-hidden border inner-subpanel aspect-square";
      card.innerHTML = `<img src="${url}" class="w-full h-full object-cover" />
        <button type="button" data-del-img="${idx}" class="del-img-btn absolute top-1 left-1 w-6 h-6 rounded-full bg-red-600 text-white text-xs font-black cursor-pointer">&times;</button>`;
      grid.appendChild(card);
    });
    document.querySelectorAll(".del-img-btn").forEach((b) => {
      b.addEventListener("click", () => {
        state.imageFiles.splice(Number(b.getAttribute("data-del-img")), 1);
        b.parentElement?.remove();
      });
    });
  });

  document.getElementById("clearInputsBtn")?.addEventListener("click", () => {
    playClickTone();
    studyTextInput.value = "";
    document.getElementById("availableTimeInput").value = "";
    document.getElementById("textCharCounter").textContent = "0 حرف";
    state.docFiles = [];
    state.imageFiles = [];
    document.getElementById("docFilesList").innerHTML = "";
    document.getElementById("imageThumbnailsGrid").innerHTML = "";
    hideAlert();
  });

  document.getElementById("unifiedSubmitBtn")?.addEventListener("click", async () => {
    playClickTone();
    const mode = document.getElementById("textSendTypeSelect")?.value || state.activeMode || "summary";
    setActiveMode(mode);

    if (mode === "plan") {
      const availableTime = document.getElementById("availableTimeInput").value.trim();
      const fd = buildPayload({ available_time: availableTime });
      if (!fd) return;
      setBusy(true, "جاري بناء الخطة الدراسية...", "نرتب المهام بالتواريخ والساعات.");
      try {
        const data = await postFormWithTimeout("/api/plan", fd);
        state.currentPlan = data.plan;
        state.completedTaskIds = [];
        state.planCelebratedOnce = false;
        renderPlan(true);
        saveToUserHistory("plan", `خطة: ${getShortTitleFromInput()}`, { plan: state.currentPlan, completed: [] });
      } catch (err) {
        showAlert(err.message);
      } finally {
        setBusy(false);
      }
    } else if (mode === "audio") {
      const fd = buildPayload();
      if (!fd) return;
      fd.append("voice", state.currentAudioVoice || "female");
      stopAudioEngine();
      state.currentAudioChunks = [];
      state.currentAudioBase64 = "";
      state.activeAudioChunks = [];
      state.activeAudioChunkIndex = 0;

      const oldPlayer = document.getElementById("lessonAudioPlayer");
      if (oldPlayer) {
        oldPlayer.pause();
        oldPlayer.removeAttribute("src");
        oldPlayer.load();
      }

      setBusy(true, "جاري تجهيز الشرح الصوتي المسموع...", "نولّد الشرح والصوت العربي الواضح.");
      try {
        const data = await postFormWithTimeout("/api/audio-script", fd);
        state.currentAudioScript = data.script || "";

        state.currentAudioChunks = await generateAudioChunks(
          state.currentAudioScript,
          state.currentAudioVoice || "female"
        );
        state.currentAudioBase64 = state.currentAudioChunks[0] || "";

        if (!state.currentAudioChunks.length) {
          throw new Error("تعذر إنشاء الصوت المختار.");
        }
        document.getElementById("audioTranscriptDisplay").textContent = state.currentAudioScript;
        document.getElementById("liveAudioChatMessages").innerHTML =
          `<p class="text-xs card-subtitle text-center py-1">الشرح جاهز! يبدأ الصوت الآن.</p>`;
        const sec = document.getElementById("audioResultSection");
        sec.classList.remove("hidden");
        sec.scrollIntoView({ behavior: "smooth", block: "start" });
        saveToUserHistory("audio", `شرح صوتي: ${getShortTitleFromInput()}`, {
          script: state.currentAudioScript
        });
        playGeneratedAudio(state.currentAudioChunks, state.currentAudioScript);
      } catch (err) {
        showAlert(err.message);
      } finally {
        setBusy(false);
      }
    } else if (mode === "quiz") {
      const numQuestions = document.getElementById("quizCountSelect").value;
      const difficulty = document.getElementById("quizDifficultySelect").value;
      const fd = buildPayload({ num_questions: numQuestions, difficulty });
      if (!fd) return;
      setBusy(true, "جاري توليد الاختبار...", `نجهز ${numQuestions} أسئلة بمستوى (${difficulty}).`);
      try {
        const data = await postFormWithTimeout("/api/quiz", fd);
        state.currentQuiz = data.quiz;
        state.userAnswers = {};
        state.quizSubmitted = false;
        renderQuiz();
        saveToUserHistory("quiz", state.currentQuiz.quiz_title || `اختبار: ${getShortTitleFromInput()}`, { quiz: state.currentQuiz });
      } catch (err) {
        showAlert(err.message);
      } finally {
        setBusy(false);
      }
    } else {
      const fd = buildPayload();
      if (!fd) return;
      setBusy(true, "جاري إعداد الملخص الشامل...", "نعالج الكتب والصور والنصوص ونرتب الملخص.");
      try {
        const data = await postFormWithTimeout("/api/summarize", fd);
        state.currentSummaryMd = data.summary || "";
        document.getElementById("summaryMarkdownBox").innerHTML = renderMarkdownSafe(state.currentSummaryMd);
        const sec = document.getElementById("summaryResultSection");
        sec.classList.remove("hidden");
        sec.scrollIntoView({ behavior: "smooth", block: "start" });
        saveToUserHistory("summary", `ملخص: ${getShortTitleFromInput()}`, { summary: state.currentSummaryMd });
      } catch (err) {
        showAlert(err.message);
      } finally {
        setBusy(false);
      }
    }
  });

  document.getElementById("cancelLoadingBtn")?.addEventListener("click", () => {
    if (state.activeAbortController) state.activeAbortController.abort();
    setBusy(false);
  });

  document.getElementById("resetPlanBtn")?.addEventListener("click", () => {
    playClickTone();
    state.completedTaskIds = [];
    state.planCelebratedOnce = false;
    renderPlan(false);
  });

  document.getElementById("copySummaryBtn")?.addEventListener("click", async () => {
    playClickTone();
    if (!state.currentSummaryMd) return;
    await navigator.clipboard.writeText(state.currentSummaryMd);
    showAlert("تم نسخ الملخص بنجاح.", false);
  });

  document.getElementById("printSummaryBtn")?.addEventListener("click", () => window.print());

  document.getElementById("playAudioBtn")?.addEventListener("click", () => {
    playClickTone();
    const player = document.getElementById("lessonAudioPlayer");

    if (player && player.src && !player.ended) {
      player.playbackRate = state.speechRate;
      player.play();
      document.getElementById("audioLiveStatus").textContent = "جاري تشغيل الشرح الصوتي...";
    } else if (state.currentAudioChunks.length) {
      playGeneratedAudio(state.currentAudioChunks, state.currentAudioScript);
    } else if (state.activeAudioChunks.length) {
      playGeneratedAudio(state.activeAudioChunks, state.currentAudioScript);
    } else {
      playGeneratedAudio(state.currentAudioBase64, state.currentAudioScript);
    }
  });

  document.getElementById("pauseAudioBtn")?.addEventListener("click", () => {
    playClickTone();
    pauseAudioEngine();
  });

  document.getElementById("restartAudioBtn")?.addEventListener("click", () => {
    playClickTone();
    const chunks = state.activeAudioChunks.length
      ? state.activeAudioChunks
      : state.currentAudioChunks;

    if (chunks.length) {
      playGeneratedAudio(chunks, state.currentAudioScript);
    } else {
      playGeneratedAudio(state.currentAudioBase64, state.currentAudioScript);
    }
  });

  document.querySelectorAll(".speed-opt").forEach((btn) => {
    btn.addEventListener("click", () => {
      playClickTone();
      state.speechRate = parseFloat(btn.getAttribute("data-speed"));
      document.querySelectorAll(".speed-opt").forEach((b) => b.classList.remove("active-speed"));
      btn.classList.add("active-speed");
      const player = document.getElementById("lessonAudioPlayer");
      if (player) player.playbackRate = state.speechRate;
    });
  });

  document.getElementById("audioQuestionForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    playClickTone();
    const input = document.getElementById("audioQuestionInput");
    const question = input.value.trim();
    if (!question) return;

    pauseAudioEngine();
    const chatBox = document.getElementById("liveAudioChatMessages");
    if (chatBox.querySelector("p.text-center")) chatBox.innerHTML = "";

    const userBubble = document.createElement("div");
    userBubble.className = "rounded-xl p-3 text-xs sm:text-sm font-bold badge-pill";
    userBubble.textContent = `أنت: ${question}`;
    chatBox.appendChild(userBubble);

    const typingBubble = document.createElement("div");
    typingBubble.className = "rounded-xl p-3 text-xs card-subtitle inner-subpanel border";
    typingBubble.textContent = "جاري تجهيز الرد الصوتي...";
    chatBox.appendChild(typingBubble);
    input.value = "";

    const fd = new FormData();
    fd.append("question", question);
    fd.append("lesson_context", document.getElementById("studyTextInput").value.trim());
    fd.append("current_transcript", state.currentAudioScript);
    fd.append("voice", state.currentAudioVoice || "female");

    try {
      const data = await postFormWithTimeout("/api/audio-ask", fd);

      const answerAudioChunks = await generateAudioChunks(data.answer || "", state.currentAudioVoice || "female");

      typingBubble.className = "rounded-xl p-3.5 text-xs sm:text-sm card-title inner-subpanel border leading-relaxed";
      typingBubble.innerHTML = `<strong class="block mb-1">المدرس:</strong>${escapeHtml(data.answer)}`;
      document.getElementById("resumeLessonAfterQaBtn").classList.remove("hidden");
      playGeneratedAudio(answerAudioChunks, data.answer);
    } catch (err) {
      typingBubble.textContent = `تعذر الرد: ${err.message}`;
    }
  });

  document.getElementById("resumeLessonAfterQaBtn")?.addEventListener("click", () => {
    playClickTone();
    document.getElementById("resumeLessonAfterQaBtn").classList.add("hidden");
    playGeneratedAudio(
      state.currentAudioChunks.length ? state.currentAudioChunks : state.currentAudioBase64,
      state.currentAudioScript
    );
  });

  document.getElementById("submitQuizAnswersBtn")?.addEventListener("click", () => {
    playClickTone();
    if (!state.currentQuiz || state.quizSubmitted) return;
    const questions = state.currentQuiz.questions;
    const missing = [];
    for (let i = 0; i < questions.length; i++) {
      if (state.userAnswers[i] === undefined) missing.push(i + 1);
    }
    if (missing.length > 0) {
      showAlert(`يرجى إجابة الأسئلة المتبقية أولاً: (${missing.join("، ")})`);
      return;
    }

    hideAlert();
    state.quizSubmitted = true;
    let correctTotal = 0;

    questions.forEach((q, qIdx) => {
      const chosen = state.userAnswers[qIdx];
      const right = q.correct_index;
      const isRight = chosen === right;
      if (isRight) correctTotal++;

      (q.options || []).forEach((_, o) => {
        const lbl = document.getElementById(`q-${qIdx}-opt-${o}`);
        lbl.querySelector("input").disabled = true;
        if (o === right) {
          lbl.style.backgroundColor = "#D1FAE5";
          lbl.style.borderColor = "#059669";
          lbl.style.color = "#065F46";
        } else if (o === chosen && !isRight) {
          lbl.style.backgroundColor = "#FEE2E2";
          lbl.style.borderColor = "#DC2626";
          lbl.style.color = "#991B1B";
        }
      });

      const expBox = document.getElementById(`q-exp-${qIdx}`);
      expBox.classList.remove("hidden");
      expBox.innerHTML = isRight
        ? `<div class="font-extrabold text-emerald-500 mb-1">✅ إجابة صحيحة!</div><p class="card-title">${escapeHtml(q.explanation || "")}</p>`
        : `<div class="font-extrabold text-red-500 mb-1">❌ الصحيح هو: (${escapeHtml(q.options[right] || "")})</div><p class="card-title">${escapeHtml(q.explanation || "")}</p>`;
    });

    const pct = Math.round((correctTotal / questions.length) * 100);
    const banner = document.getElementById("quizScoreBanner");
    document.getElementById("quizScoreValue").textContent = `${correctTotal} من ${questions.length} (${pct}%)`;
    document.getElementById("quizEncouragementTitle").textContent = pct >= 80 ? "ممتاز جداً 🌟" : pct >= 50 ? "أحسنت، استمر 💪" : "فرصة رائعة للتعلم والمراجعة 🌱";
    banner.classList.remove("hidden");
    document.getElementById("quizSubmitBar").classList.add("hidden");
    if (pct >= 80) {
      playCelebrationFanfare();
      triggerCelebrationConfetti();
    }
  });

  // عقلية هادئة
  let calmBusy = false;

  function setCalmBusy(busy) {
    calmBusy = busy;
    const form = document.getElementById("calmChatForm");
    const input = document.getElementById("calmMessageInput");
    if (input) input.disabled = busy;
    form?.querySelectorAll("button").forEach((b) => (b.disabled = busy));
    document.querySelectorAll(".calm-prompt-chip").forEach((b) => (b.disabled = busy));
  }

  async function requestCalmReply(msgText, historySnapshot) {
    const fd = new FormData();
    fd.append("message", msgText);
    fd.append("history_json", JSON.stringify(historySnapshot.slice(-12)));

    const controller = new AbortController();
    const timerId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const res = await fetch(`${API_BASE}/api/calm-mind-chat`, {
        method: "POST",
        body: fd,
        signal: controller.signal,
      });
      const raw = await res.text();
      let data = {};
      try {
        data = raw ? JSON.parse(raw) : {};
      } catch (_) {
        if (res.status === 404) {
          throw new Error("لم يُعثر على مسار الخادم (404). افتح الموقع من العنوان http://127.0.0.1:8000 بعد تشغيل uvicorn.");
        }
        throw new Error(`استجابة غير متوقعة من الخادم (HTTP ${res.status}).`);
      }
      if (!res.ok || data.success === false) {
        throw new Error(data.detail || `حدث خطأ في الخادم (HTTP ${res.status}).`);
      }
      return data;
    } catch (err) {
      if (err.name === "AbortError") throw new Error("انتهت مهلة الانتظار؛ حاولي مرة أخرى.");
      if (err instanceof TypeError) throw new Error("تعذر الاتصال بالخادم. تأكد من تشغيل uvicorn وفتح الموقع من http://127.0.0.1:8000");
      throw err;
    } finally {
      clearTimeout(timerId);
    }
  }

  async function sendCalmMindMessage(msgText) {
    if (calmBusy) return;
    const cleanMsg = (msgText || "").trim();
    if (!cleanMsg) return;
    setCalmBusy(true);

    const feed = document.getElementById("calmChatFeed");
    const userDiv = document.createElement("div");
    userDiv.className = "rounded-2xl p-3 text-xs sm:text-sm font-bold badge-pill mr-auto max-w-xl";
    userDiv.textContent = cleanMsg;
    feed.appendChild(userDiv);

    const botDiv = document.createElement("div");
    botDiv.className = "rounded-2xl p-3.5 border panel-divider text-xs sm:text-sm card-subtitle leading-relaxed max-w-2xl";
    botDiv.textContent = "يكتب لك رفيقك رسالة طمأنينة وخطوات عملية...";
    feed.appendChild(botDiv);
    feed.scrollTop = feed.scrollHeight;

    const historySnapshot = state.calmHistory.slice();

    try {
      const data = await requestCalmReply(cleanMsg, historySnapshot);
      const reply = (data.reply || "").trim();
      if (!reply) throw new Error("وصل رد فارغ من الخادم؛ حاولي مرة أخرى.");
      botDiv.className = "markdown-body rounded-2xl p-4 border panel-divider text-xs sm:text-sm card-title leading-relaxed max-w-2xl";
      botDiv.innerHTML = renderMarkdownSafe(reply);
      state.calmHistory.push({ role: "student", text: cleanMsg });
      state.calmHistory.push({ role: "mentor", text: reply });
    } catch (err) {
      botDiv.className = "rounded-2xl p-3.5 border border-red-500/40 bg-red-500/10 text-red-400 text-xs sm:text-sm leading-relaxed max-w-2xl";
      botDiv.textContent = `تعذر الرد حالياً: ${err.message}`;
    } finally {
      setCalmBusy(false);
      feed.scrollTop = feed.scrollHeight;
      document.getElementById("calmMessageInput")?.focus();
    }
  }

  document.getElementById("calmChatForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (calmBusy) return;
    playClickTone();
    const input = document.getElementById("calmMessageInput");
    const txt = input.value.trim();
    if (!txt) return;
    input.value = "";
    await sendCalmMindMessage(txt);
  });

  document.querySelectorAll(".calm-prompt-chip").forEach((chip) => {
    chip.addEventListener("click", async () => {
      if (calmBusy) return;
      playClickTone();
      const msg = chip.getAttribute("data-msg");
      if (msg) await sendCalmMindMessage(msg);
    });
  });

  // بومودورو وستوب واتش
  document.querySelectorAll(".pomo-preset-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      playClickTone();
      document.getElementById("customFocusMinutes").value = btn.getAttribute("data-focus");
      document.getElementById("customBreakMinutes").value = btn.getAttribute("data-break");
      resetPomodoroFromInputs();
    });
  });

  document.getElementById("pomoStartBtn")?.addEventListener("click", () => {
    playClickTone();
    if (pomoInterval) return;
    pomoInterval = setInterval(() => {
      if (pomoSecondsLeft > 0) {
        pomoSecondsLeft--;
        updatePomodoroDisplay();
      } else {
        playCelebrationFanfare();
        if (!pomoIsBreak) {
          pomoCompletedCount++;
          document.getElementById("pomoSessionsCounter").textContent = `الجلسات المكتملة: ${pomoCompletedCount}`;
          pomoIsBreak = true;
          const brk = Math.max(1, parseInt(document.getElementById("customBreakMinutes").value || "5", 10));
          pomoSecondsLeft = brk * 60;
          document.getElementById("pomoPhaseLabel").textContent = "☕ وقت الاستراحة";
        } else {
          pomoIsBreak = false;
          const foc = Math.max(1, parseInt(document.getElementById("customFocusMinutes").value || "25", 10));
          pomoSecondsLeft = foc * 60;
          document.getElementById("pomoPhaseLabel").textContent = "جلسة مذاكرة مركّزة";
        }
        updatePomodoroDisplay();
      }
    }, 1000);
  });

  document.getElementById("pomoPauseBtn")?.addEventListener("click", () => {
    playClickTone();
    clearInterval(pomoInterval);
    pomoInterval = null;
  });

  document.getElementById("pomoResetBtn")?.addEventListener("click", () => {
    playClickTone();
    resetPomodoroFromInputs();
  });

  document.getElementById("swStartBtn")?.addEventListener("click", () => {
    playClickTone();
    if (swInterval) return;
    swInterval = setInterval(() => {
      swElapsedSeconds++;
      document.getElementById("stopwatchDisplay").textContent = formatHMS(swElapsedSeconds);
    }, 1000);
  });

  document.getElementById("swPauseBtn")?.addEventListener("click", () => {
    playClickTone();
    clearInterval(swInterval);
    swInterval = null;
  });

  document.getElementById("swLapBtn")?.addEventListener("click", () => {
    playClickTone();
    const lapsList = document.getElementById("swLapsList");
    const count = lapsList.children.length + 1;
    const row = document.createElement("div");
    row.className = "inner-subpanel border rounded-xl px-3 py-1.5 text-xs font-bold flex justify-between";
    row.innerHTML = `<span>دورة #${count}</span><span dir="ltr">${formatHMS(swElapsedSeconds)}</span>`;
    lapsList.prepend(row);
  });

  document.getElementById("swResetBtn")?.addEventListener("click", () => {
    playClickTone();
    clearInterval(swInterval);
    swInterval = null;
    swElapsedSeconds = 0;
    document.getElementById("stopwatchDisplay").textContent = "00:00:00";
    document.getElementById("swLapsList").innerHTML = "";
  });

  document.getElementById("switchToRegisterLink")?.addEventListener("click", (e) => {
    e.preventDefault();
    playClickTone();
    hideAlert();
    showAuthView("register");
  });

  document.getElementById("switchToLoginLink")?.addEventListener("click", (e) => {
    e.preventDefault();
    playClickTone();
    hideAlert();
    showAuthView("login");
  });

  document.getElementById("sendRegCodeBtn")?.addEventListener("click", async () => {
    playClickTone();
    const fullName = document.getElementById("regFullNameInput").value.trim();
    const email = document.getElementById("regEmailInput").value.trim().toLowerCase();
    const password = document.getElementById("regPasswordInput").value;

    if (!isValidEmailClient(email)) {
      showAlert("صيغة البريد الإلكتروني غير صحيحة؛ أدخل بريداً حقيقياً مثل name@gmail.com.");
      return;
    }
    if (password.length < 6) {
      showAlert("كلمة المرور يجب أن تكون 6 أحرف على الأقل.");
      return;
    }

    try {
      const fd = new FormData();
      fd.append("full_name", fullName || "طالب");
      fd.append("email", email);
      fd.append("password", password);
      const data = await postFormWithTimeout("/api/auth/request-register-code", fd);
      const hint = document.getElementById("regCodeHint");
      hint.classList.remove("hidden");
      hint.textContent = data.message;
      hideAlert();
    } catch (err) {
      showAlert(err.message);
    }
  });

  document.getElementById("registerAccountForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    playClickTone();
    const fullName = document.getElementById("regFullNameInput").value.trim();
    const email = document.getElementById("regEmailInput").value.trim().toLowerCase();
    const password = document.getElementById("regPasswordInput").value;
    const code = document.getElementById("regVerifyCodeInput").value.trim();

    if (!isValidEmailClient(email)) {
      showAlert("صيغة البريد الإلكتروني غير صحيحة.");
      return;
    }

    try {
      const fd = new FormData();
      fd.append("full_name", fullName);
      fd.append("email", email);
      fd.append("password", password);
      fd.append("code", code);
      const data = await postFormWithTimeout("/api/auth/verify-register", fd);
      state.currentUser = data.user;
      await renderAccountUI();
      showAlert(`تم إنشاء حسابك وحفظه في قاعدة البيانات! أهلاً بك يا ${data.user.full_name}.`, false);
    } catch (err) {
      showAlert(err.message);
    }
  });

  document.getElementById("sendLoginCodeBtn")?.addEventListener("click", async () => {
    playClickTone();
    const email = document.getElementById("loginEmailInput").value.trim().toLowerCase();
    const password = document.getElementById("loginPasswordInput").value;

    if (!isValidEmailClient(email)) {
      showAlert("صيغة البريد الإلكتروني غير صحيحة.");
      return;
    }
    if (!password) {
      showAlert("اكتب كلمة المرور أولاً.");
      return;
    }

    try {
      const fd = new FormData();
      fd.append("email", email);
      fd.append("password", password);
      const data = await postFormWithTimeout("/api/auth/request-login-code", fd);
      const hint = document.getElementById("loginCodeHint");
      hint.classList.remove("hidden");
      hint.textContent = data.message;
      hideAlert();
    } catch (err) {
      showAlert(err.message);
    }
  });

  document.getElementById("loginAccountForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    playClickTone();
    const email = document.getElementById("loginEmailInput").value.trim().toLowerCase();
    const code = document.getElementById("loginVerifyCodeInput").value.trim();

    try {
      const fd = new FormData();
      fd.append("email", email);
      fd.append("code", code);
      const data = await postFormWithTimeout("/api/auth/verify-login", fd);
      state.currentUser = data.user;
      await renderAccountUI();
      showAlert(`تم تسجيل الدخول بنجاح، أهلاً بك يا ${data.user.full_name}.`, false);
    } catch (err) {
      showAlert(err.message);
    }
  });

  document.getElementById("logoutAccountBtn")?.addEventListener("click", async () => {
    playClickTone();
    try {
      await postFormWithTimeout("/api/auth/logout", new FormData());
      state.currentUser = null;
      await renderAccountUI();
      showAlert("تم تسجيل الخروج بنجاح.", false);
    } catch (err) {
      showAlert(err.message);
    }
  });

  document.getElementById("saveAboutVideoBtn")?.addEventListener("click", () => {
    playClickTone();
    const url = document.getElementById("aboutVideoUrlInput").value.trim();
    if (!url) return;
    localStorage.setItem("nazamly_about_video_url", url);
    renderAboutVideo(url);
    showAlert("تم إضافة الفيديو في صفحة (عنّا) بنجاح.", false);
  });
});

document.addEventListener("DOMContentLoaded", () => {
  const picker = document.getElementById("audioVoicePicker");
  if (!picker) return;

  let selectedVoice = localStorage.getItem("nazamly_audio_voice") === "male" ? "male" : "female";
  let previewAudio = null;
  let previewUrl = null;

  const updateVoiceUI = () => {
    picker.querySelectorAll("[data-audio-voice]").forEach((button) => {
      const selected = button.dataset.audioVoice === selectedVoice;
      button.setAttribute("aria-pressed", String(selected));
      button.classList.toggle("border-amber-400", selected);
      button.classList.toggle("bg-amber-400/10", selected);
      button.classList.toggle("ring-2", selected);
      const mark = button.querySelector(".voice-selected-mark");
      if (mark) mark.classList.toggle("hidden", !selected);
    });
    const status = document.getElementById("audioVoiceSelectionStatus");
    if (status) status.textContent = `الصوت المختار: ${selectedVoice === "female" ? "سلمى" : "شاكر"}`;
    if (typeof state !== "undefined") state.currentAudioVoice = selectedVoice;
  };

  picker.querySelectorAll("[data-audio-voice]").forEach((button) => {
    button.addEventListener("click", () => {
      selectedVoice = button.dataset.audioVoice === "male" ? "male" : "female";
      localStorage.setItem("nazamly_audio_voice", selectedVoice);
      if (typeof state !== "undefined") state.currentAudioVoice = selectedVoice;
      updateVoiceUI();
    });
  });

  picker.querySelectorAll("[data-preview-voice]").forEach((button) => {
    button.addEventListener("click", async () => {
      const voice = button.dataset.previewVoice === "male" ? "male" : "female";
      const originalText = button.textContent;
      button.disabled = true;
      button.textContent = "جاري تجهيز العينة...";
      try {
        const form = new FormData();
        form.append("voice", voice);
        const data = await postFormWithTimeout("/api/tts-preview", form);
        if (!data.audio_base64) throw new Error("لم يصل ملف الصوت التجريبي.");

        const binary = atob(data.audio_base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        const blob = new Blob([bytes], { type: "audio/mpeg" });
        if (previewAudio) previewAudio.pause();
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        previewUrl = URL.createObjectURL(blob);
        previewAudio = new Audio(previewUrl);
        previewAudio.onended = () => {
          if (previewUrl) URL.revokeObjectURL(previewUrl);
          previewUrl = null;
          previewAudio = null;
        };
        await previewAudio.play();

        if (voice === "male") {
          const status = document.getElementById("audioVoiceSelectionStatus");
          if (status) {
            status.textContent = "شاكر مش محظور دلوقتي";
          }
        }
      } catch (error) {
        const status = document.getElementById("audioVoiceSelectionStatus");
        if (status) {
          status.textContent = voice === "male"
            ? "\u0634\u0627\u0643\u0631 \u0645\u062d\u0638\u0648\u0631 \u062f\u0644\u0648\u0642\u062a\u064a"
            : (error.message || "\u062a\u0639\u0630\u0631 \u062a\u0634\u063a\u064a\u0644 \u0639\u064a\u0646\u0629 \u0627\u0644\u0635\u0648\u062a \u0627\u0644\u0622\u0646.")
        }
      } finally {
        button.disabled = false;
        button.textContent = originalText;
      }
    });
  });

  updateVoiceUI();
});
