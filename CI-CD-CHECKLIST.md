# ✅ צ'קליסט הגדרת CI/CD

## לפני שמתחילים
- [ ] יש לי גישה ל-GitHub repository
- [ ] יש לי גישה ל-Firebase Console
- [ ] יש לי טרמינל עם npm מותקן

---

## שלב 1: קבלת Firebase Token (5 דקות)

### בטרמינל המקומי שלך:
```bash
npm install -g firebase-tools
firebase login:ci
```

- [ ] התקנתי Firebase CLI
- [ ] הרצתי `firebase login:ci`
- [ ] דפדפן נפתח והתחברתי
- [ ] קיבלתי token והעתקתי אותו
- [ ] שמרתי את ה-token במקום בטוח (נצטרך אותו בצעד הבא)

---

## שלב 2: הוספת Secrets ל-GitHub (5 דקות)

### קישור ישיר:
👉 https://github.com/taltzurr/tennis-center/settings/secrets/actions

### רשימת Secrets להוסיף:

- [ ] **FIREBASE_TOKEN** - ה-token מצעד 1
- [ ] **VITE_FIREBASE_API_KEY** - מ-Firebase Console
- [ ] **VITE_FIREBASE_AUTH_DOMAIN** - `tennis-training-app-gemini.firebaseapp.com`
- [ ] **VITE_FIREBASE_PROJECT_ID** - `tennis-training-app-gemini`
- [ ] **VITE_FIREBASE_STORAGE_BUCKET** - `tennis-training-app-gemini.appspot.com`
- [ ] **VITE_FIREBASE_MESSAGING_SENDER_ID** - מ-Firebase Console
- [ ] **VITE_FIREBASE_APP_ID** - מ-Firebase Console
- [ ] **VITE_SENTRY_DSN** (אופציונלי) - מ-Sentry.io

### איך למצוא את הערכים מ-Firebase:
👉 https://console.firebase.google.com/project/tennis-training-app-gemini/settings/general

גלול ל-"Your apps" → לחץ על האייקון של ה-Web app → תראה את כל הערכים

---

## שלב 3: בדיקה (2 דקות)

### בטרמינל:
```bash
git commit --allow-empty -m "Test CI/CD"
git push origin main
```

- [ ] עשיתי push
- [ ] נכנסתי ל-GitHub Actions: https://github.com/taltzurr/tennis-center/actions
- [ ] רואה workflow "Build and Deploy to Firebase" רץ (כתום/צהוב)
- [ ] חיכיתי 4-5 דקות
- [ ] ה-workflow הפך לירוק ✅

---

## סיימתי! 🎉

- [ ] CI/CD עובד
- [ ] בדקתי שהאתר מעודכן: https://tennis-training-app-gemini.web.app
- [ ] קראתי את המדריך המלא: setup-ci-cd.md

---

## מה עכשיו?

מעכשיו, **בכל פעם שאעשה `git push`**:
1. GitHub Actions יריץ אוטומטית את כל הבדיקות ✅
2. אם הבדיקות עוברות, יבנה את הפרויקט ✅
3. יפרוס אוטומטית לפרודקשן ✅
4. תוך 4-5 דקות הפרודקשן מעודכן ✅

**לא צריך להריץ `firebase deploy` יותר!** 🎊

---

## נתקעתי? 🆘

1. ✅ בדקתי שכל 7-8 Secrets קיימים ב-GitHub
2. ✅ בדקתי את הלוגים ב-GitHub Actions
3. ✅ קראתי את setup-ci-cd.md
4. ❓ עדיין תקוע? פתח issue או שאל
