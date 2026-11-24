# जेवर कौशल अभियान — Portal

- **साइट (frontend):** सीधा HTML/CSS/JS → GitHub Pages (मुफ़्त)
- **Backend:** Supabase project `jewar-kaushal` (Mumbai) — database, लॉगिन, तस्वीरें
- **सुरक्षा function:** Supabase Edge Function `submit` (`supabase/functions/submit/index.ts`)

```
index.html          मुखपृष्ठ (मांग, गिनती, समर्थन फ़ॉर्म)
jan-awaaz.html      सभी लेख
lekh/index.html     admin से डाले गए लेख (lekh/?s=लिंक-नाम)
lekh/*.html         पुराने फ़ाइल वाले लेख
privacy.html, terms.html, contact.html   जानकारी पन्ने (English)
admin.html          संचालक कक्ष (सिर्फ़ panditvickie@gmail.com)
404.html            पन्ना न मिले तो
assets/config.js    Supabase URL + publishable key (सार्वजनिक रखने लायक)
assets/vendor/      supabase-js (अपने server से, CDN नहीं)
```

## सुरक्षा कैसे काम करती है
- सारे सार्वजनिक फ़ॉर्म (समर्थन, टिप्पणी, प्रतिक्रिया, सर्वे) सिर्फ़ `submit` function से जाते हैं। सीधे database में लिखना बंद है (RLS)।
- `submit` में: सिर्फ़ अपनी साइट से आए request, छिपा जाल (honeypot), 3 सेकंड से कम में भरे फ़ॉर्म अनदेखे, एक IP से सीमित बार, हर field की जाँच।
- समर्थकों के नाम/नंबर, IP-hash और मसौदा लेख सिर्फ़ admin पढ़ सकता है।
- कोई secret key code में नहीं है।

## संचालक कक्ष (admin.html)
- **सारांश:** कुल/आज के समर्थन, स्रोत-वार गिनती, सर्वे परिणाम
- **समर्थक:** खोज, हटाना, Excel (CSV) डाउनलोड
- **टिप्पणियाँ:** मंज़ूर करना, हटाना, अभियान की ओर से जवाब
- **लेख:** नया लेख (तस्वीर के साथ), बदलना, छिपाना/प्रकाशित करना, लिंक कॉपी

## स्थानीय जाँच
```
cd /d D:\WEBSITES\jewar-kaushal
python -m http.server 8080
```
http://localhost:8080 (सिर्फ़ port 8080 से backend चलेगा; बंद करने के लिए Ctrl+C)
