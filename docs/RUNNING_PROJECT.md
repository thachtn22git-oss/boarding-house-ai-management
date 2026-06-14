# Running Project

Use separate terminals for web, mobile, and AI server services.

## Web Admin

```powershell
cd apps/web-admin
npm install
npm run dev
```

Build check:

```powershell
cd apps/web-admin
npm run build
```

Required environment:

- Firebase Vite variables: `VITE_FIREBASE_*`
- Supabase variables used by chat and AI history
- AI endpoint variable if configured by the web app

## Mobile Owner

```powershell
cd apps/mobile-owner
npm install
npx expo start --clear
```

Checks:

```powershell
cd apps/mobile-owner
npm run typecheck
```

Required environment:

- Expo Firebase variables: `EXPO_PUBLIC_FIREBASE_*`
- Supabase public URL/key variables if chat or AI history is enabled

## Mobile Tenant

```powershell
cd apps/mobile-tenant
npm install
npx expo start --clear
```

Checks:

```powershell
cd apps/mobile-tenant
npm run typecheck
```

## AI Server

```powershell
cd services/ai-server
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Open:

- Dashboard: `http://localhost:8000/dashboard`
- API docs: `http://localhost:8000/docs`
- Health: `http://localhost:8000/health`

Model checks:

```powershell
cd services/ai-server
venv\Scripts\python.exe scripts\check_feedback_dataset.py
venv\Scripts\python.exe scripts\test_feedback_predictions.py
```

