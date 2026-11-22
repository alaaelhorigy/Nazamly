# منصة نظّملي (Nazamly) — المنقذ الدراسي

منصة ويب تعليمية متكاملة باللغة العربية (**RTL**) تدعم الوضع النهاري والليلي، وتعمل بواجهة أمامية عصرية متجاوبة مع الحواسيب والهواتف وخادم خلفي آمن بـ **FastAPI** و **Google Gemini API (`gemini-2.5-flash`)**.

## هيكل المجلد

```text
Nazamly_Platform/
├── backend/
│   ├── main.py             # خادم FastAPI ونقاط الاتصال مع Gemini وخدمة الواجهة الأمامية
│   ├── requirements.txt    # المكتبات البرمجية المطلوبة
│   └── .env.example        # نموذج ملف البيئة لحفظ GEMINI_API_KEY
├── frontend/
│   ├── index.html          # هيكل الصفحة والكتاب المضيء والهدية التفاعلية
│   ├── style.css           # الألوان النهارية والليلية وحركات الكتاب والهدية والاحتفال
│   └── script.js           # المنطق التفاعلي، الصوت والمحادثة، الجداول والخطط، والتصحيح
└── README.md               # دليل التشغيل السريع
```

## خطوات التشغيل السريع

1. انتقل إلى مجلد `backend` وثبّت المكتبات:
   ```bash
   cd Nazamly_Platform/backend
   python -m venv venv
   ```
   فعّل البيئة الافتراضية (في Windows: `venv\Scripts\activate` ، وفي Mac/Linux: `source venv/bin/activate`) ثم ثبّت المكتبات:
   ```bash
   pip install -r requirements.txt
   ```

2. أنشئ ملف `.env` من `.env.example` وضع مفتاح `GEMINI_API_KEY` الخاص بك:
   ```bash
   cp .env.example .env
   ```

3. شغّل الخادم:
   ```bash
   uvicorn main:app --host 0.0.0.0 --port 8000 --reload
   ```

4. افتح المتصفح على: `http://localhost:8000`
