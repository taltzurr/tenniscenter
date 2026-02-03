# 🚀 מדריך הגדרת CI/CD אוטומטי - צעד אחר צעד

## 📋 סיכום מהיר
אחרי ההגדרה (10 דקות), בכל פעם שתעשה `git push`:
- ✅ GitHub יריץ בדיקות אוטומטיות
- ✅ GitHub יבנה את הפרויקט
- ✅ GitHub יפרוס אוטומטית ל-Firebase
- ✅ הפרודקשן יתעדכן תוך 4-5 דקות

---

## 🔧 צעד 1: קבלת Firebase Token

### בטרמינל שלך (לא ב-Codespace):

```bash
# התקן Firebase CLI (אם עדיין לא מותקן)
npm install -g firebase-tools

# קבל token
firebase login:ci
```

**מה יקרה:**
1. דפדפן ייפתח אוטומטית
2. תתבקש להתחבר לחשבון Google/Firebase שלך
3. תאשר גישה
4. בטרמינל תקבל token ארוך כזה:

```
✔ Success! Use this token to login on a CI server:

1//03xYZ-abc123def456ghi789jkl0mnopqrstuvwxyz1234567890ABCDEFGH
```

**📝 העתק את כל ה-token! תצטרך אותו בצעד הבא.**

---

## 🔐 צעד 2: הוספת Secrets ל-GitHub (בדפדפן)

### 2.1 פתח את דף ה-Secrets:

**לחץ על הקישור הזה:**
👉 https://github.com/taltzurr/tennis-center/settings/secrets/actions

או עבור ידנית:
```
GitHub.com → tennis-center repository → 
Settings (למעלה) → 
Secrets and variables (בתפריט משמאל) → 
Actions →
"New repository secret" (כפתור ירוק)
```

---

### 2.2 הוסף 8 Secrets (אחד אחרי השני):

#### Secret #1: FIREBASE_TOKEN
1. לחץ **"New repository secret"**
2. Name: `FIREBASE_TOKEN`
3. Secret: הדבק את ה-token מצעד 1
4. לחץ **"Add secret"**

#### Secret #2: VITE_FIREBASE_API_KEY
1. לחץ **"New repository secret"**
2. Name: `VITE_FIREBASE_API_KEY`
3. Secret: לך ל-Firebase Console:
   👉 https://console.firebase.google.com/project/tennis-training-app-gemini/settings/general
   גלול ל-"Your apps" → Web app → Copy API Key
4. לחץ **"Add secret"**

#### Secret #3: VITE_FIREBASE_AUTH_DOMAIN
1. Name: `VITE_FIREBASE_AUTH_DOMAIN`
2. Secret: `tennis-training-app-gemini.firebaseapp.com`
3. **"Add secret"**

#### Secret #4: VITE_FIREBASE_PROJECT_ID
1. Name: `VITE_FIREBASE_PROJECT_ID`
2. Secret: `tennis-training-app-gemini`
3. **"Add secret"**

#### Secret #5: VITE_FIREBASE_STORAGE_BUCKET
1. Name: `VITE_FIREBASE_STORAGE_BUCKET`
2. Secret: `tennis-training-app-gemini.appspot.com`
3. **"Add secret"**

#### Secret #6: VITE_FIREBASE_MESSAGING_SENDER_ID
1. Name: `VITE_FIREBASE_MESSAGING_SENDER_ID`
2. Secret: מ-Firebase Console (באותו מקום כמו API Key)
3. **"Add secret"**

#### Secret #7: VITE_FIREBASE_APP_ID
1. Name: `VITE_FIREBASE_APP_ID`
2. Secret: מ-Firebase Console (באותו מקום כמו API Key)
3. **"Add secret"**

#### Secret #8: VITE_SENTRY_DSN (אופציונלי)
1. Name: `VITE_SENTRY_DSN`
2. Secret: אם יש לך Sentry, הדבק DSN. אם לא - דלג
3. **"Add secret"**

---

## ✅ צעד 3: בדיקה שהכל עובד

### 3.1 עשה Push קטן לבדיקה:

```bash
# צור commit ריק לבדיקה
git commit --allow-empty -m "Test CI/CD pipeline"

# דחוף ל-GitHub
git push origin main
```

### 3.2 צפה ב-GitHub Actions:

**לחץ על הקישור:**
👉 https://github.com/taltzurr/tennis-center/actions

**מה אתה אמור לראות:**
- Workflow בשם "Build and Deploy to Firebase" רץ 🟡
- אחרי 4-5 דקות יהפוך לירוק ✅
- אם אדום ❌ - לחץ עליו לראות מה השגיאה

---

## 🎊 זהו! סיימת!

מעכשיו, **בכל פעם שתעשה git push**:
```
Your Code → GitHub → 🤖 Robot Works → Production Updated ✅
```

לא צריך להריץ `firebase deploy` יותר!

---

## 🔍 איך לראות שזה עובד?

### דרך 1: GitHub Actions
https://github.com/taltzurr/tennis-center/actions

### דרך 2: Firebase Console
https://console.firebase.google.com/project/tennis-training-app-gemini/hosting

### דרך 3: האתר עצמו
https://tennis-training-app-gemini.web.app

---

## ⚠️ Troubleshooting

### השגיאות הנפוצות:

#### 1. "Permission denied" / "Invalid token"
**פתרון:** צור token חדש עם `firebase login:ci` והחלף ב-GitHub Secrets

#### 2. "Tests failed"
**פתרון:** תקן את הבדיקות שנכשלות, או הסר זמנית את שלב הבדיקות מ-workflow

#### 3. "Build failed - Missing environment variable"
**פתרון:** ודא שכל 7 ה-Secrets קיימים ב-GitHub

#### 4. "Deploy failed"
**פתרון:** ודא שיש לך הרשאות ב-Firebase project

---

## 📞 צריך עזרה?

1. בדוק את הלוגים ב-Actions: https://github.com/taltzurr/tennis-center/actions
2. לחץ על ה-workflow האדום לראות מה השגיאה המדויקת
3. אני כאן לעזור! 😊
