# GitHub Actions - CI/CD Pipeline

קובץ זה מגדיר pipeline אוטומטי שרץ בכל push ל-branch main.

## מה זה עושה?

1. ✅ בודק את הקוד (checkout)
2. ✅ מתקין Node.js 22
3. ✅ מתקין dependencies
4. ✅ מריץ את כל הבדיקות
5. ✅ בונה את הפרויקט לפרודקשן
6. ✅ מפרוס אוטומטית ל-Firebase Hosting

## הגדרה (חובה לפני שימוש)

### 1. צור Firebase Token
```bash
firebase login:ci
```
העתק את ה-token שמודפס.

### 2. הוסף Secrets ל-GitHub

לך ל:
```
GitHub Repository → Settings → Secrets and variables → Actions → New repository secret
```

הוסף את ה-Secrets הבאים:

| Secret Name | Value | איפה למצוא |
|------------|-------|-----------|
| `FIREBASE_TOKEN` | Token מהצעד הקודם | `firebase login:ci` |
| `VITE_FIREBASE_API_KEY` | API Key | Firebase Console |
| `VITE_FIREBASE_AUTH_DOMAIN` | Auth Domain | Firebase Console |
| `VITE_FIREBASE_PROJECT_ID` | Project ID | Firebase Console |
| `VITE_FIREBASE_STORAGE_BUCKET` | Storage Bucket | Firebase Console |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Sender ID | Firebase Console |
| `VITE_FIREBASE_APP_ID` | App ID | Firebase Console |
| `VITE_SENTRY_DSN` | Sentry DSN (אופציונלי) | https://sentry.io |

### 3. Push קובץ זה ל-GitHub
```bash
git add .github/workflows/deploy.yml
git commit -m "Add CI/CD pipeline with GitHub Actions"
git push origin main
```

### 4. בדוק שזה עובד
1. לך ל-GitHub → Repository → Actions
2. תראה את ה-workflow רץ
3. אם הכל ירוק ✅ - הפרודקשן התעדכן!

## איך להשבית אוטומציה זמנית?

אם אתה רוצה לעשות push בלי לפרוס, הוסף `[skip ci]` להודעת commit:
```bash
git commit -m "Update docs [skip ci]"
```

## Troubleshooting

### הבדיקות נכשלות
- ודא שכל הבדיקות עוברות מקומית: `npm test -- --run`
- תקן את השגיאות ועשה push שוב

### Deploy נכשל
- ודא ש-FIREBASE_TOKEN תקין
- ודא שיש לך הרשאות ל-Firebase project
- בדוק את הלוגים ב-Actions tab

### Build נכשל
- ודא שכל ה-environment variables מוגדרים ב-Secrets
- בדוק שה-build עובד מקומית: `npm run build`
