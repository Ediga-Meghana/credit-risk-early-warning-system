# RiskIntel — Explainable AI Credit Risk Platform

FastAPI + XGBoost + SHAP backend, React/TypeScript/Tailwind/TanStack Query/Framer Motion frontend.
Dataset: Polish Companies Bankruptcy (5 horizons, 43,405 rows). Base paper: Zhou & Wang, IEEE Access 2025.

## Run
```bash
# 1. Backend
cd backend
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env                                # edit DATABASE_URL for MySQL
python -m ml.train                                  # optional: artifacts are already included
uvicorn app.main:app --reload --port 8000
# 2. Frontend (new terminal)
cd frontend && npm install && npm run dev           # http://localhost:5173
```
Default admin (created on first start): `admin@riskapp.local` / `Admin@12345` — change via `.env` / Profile page.

### MySQL
```sql
CREATE DATABASE riskdb CHARACTER SET utf8mb4; CREATE USER 'riskuser'@'localhost' IDENTIFIED BY 'StrongPass'; GRANT ALL ON riskdb.* TO 'riskuser'@'localhost';
```
`DATABASE_URL=mysql+pymysql://riskuser:StrongPass@localhost:3306/riskdb` — tables are created automatically at startup.

## What is real
- Preprocessing (train-only winsorising + median imputation), XGBoost-gain selection of 20 of 64 features, SMOTE on the **training split only**.
- Models compared: XGBoost, Random Forest, SVM-RBF. **Not implemented:** CNN; SVM-RBF stands in for LSSVM.
- Every assessment: real probability, real per-assessment TreeSHAP, warnings/recommendations derived from SHAP attributions, stored in the DB.
- Metrics/curves on the Model Intelligence page are read from `ml/artifacts/model_meta.json` (computed on a held-out test set).

## Honest model results (held-out 20%, real class imbalance ≈ 4.8% bankrupt)
XGBoost: ROC-AUC 0.930, recall 0.70, precision 0.33, F1 0.45 at threshold 0.5.
The paper's ~92% precision/accuracy was measured on a SMOTE-balanced sample; on the real imbalanced distribution precision is much lower. Probabilities are not calibrated to the true base rate (trained on SMOTE data) — risk thresholds are configurable under Admin → Risk Settings.

## Roles
admin (all + admin pages), analyst (create companies/assessments, batch), viewer (read-only). Admin routes enforced server-side (403).

## Assistant
`POST /api/assistant/chat` — uses the selected assessment, or the current user’s latest saved assessment when no ID is supplied. The API response identifies whether the reply came from the external AI or the built-in fallback. The fallback covers common model/risk questions only. For conversational AI, copy `backend/.env.example` to `backend/.env`, set `AI_PROVIDER=anthropic`, add an Anthropic Console API key as `AI_API_KEY`, and set `AI_MODEL=claude-haiku-4-5-20251001` (or another model available to your API account). The Claude website subscription is not an API key; API use may incur separate charges. Keys remain on the backend and must never be put in frontend files.

## Verified
Backend end-to-end test (login, RBAC 403, company, real prediction + SHAP, assistant with assessment context, batch CSV + download, threshold change, audit log, invalid token 401) passed; frontend `tsc` and `vite build` pass.
**Not yet verified:** a manual browser walkthrough of the UI and a run against MySQL (code is MySQL-compatible via SQLAlchemy; tested on SQLite).

## User-friendly assessment interface
- The assessment page now defaults to Guided financial entry with plain-language balance-sheet and income-statement labels.
- Financial figures are converted in the browser to the selected model feature ratios before calling the existing prediction API.
- Advanced model-ratio entry remains available for researchers/analysts; batch CSV remains available for prepared datasets.
- Use values from the same reporting period and do not guess missing figures. Ratios with zero denominators are passed as missing and use the model's existing training-median handling.


## Yahoo Finance company search (new)
- The assessment page supports searching public companies by ticker/name, previewing available annual financial statements, and starting a screening without manually typing ratios.
- Backend endpoints: `GET /api/yahoo/search?q=Microsoft`, `GET /api/yahoo/company/MSFT`, and `POST /api/yahoo/assess` with `{"symbol":"MSFT"}`. All require a signed-in user.
- `yfinance` retrieves data from Yahoo Finance; availability, field coverage, and rate limits are controlled by Yahoo and can vary. Internet access is required on the backend.
- The existing model was trained on Polish bankruptcy data. Yahoo-listed companies may use different reporting conventions and geographies. Unsupported ratios are left missing and imputed using training-set medians; the result is clearly labelled as exploratory, not as a calibrated credit decision. Do not use it alone for lending or other high-stakes decisions.
- The Yahoo integration was syntax-checked, but a live Yahoo data request and a full browser build need to be verified in your local environment.


## Public signup and email OTP
- Users can create their own analyst account from the Sign in page. They enter their name, email and password, receive a six-digit email OTP, and only become a user after OTP verification. Later sign-ins use email + password; OTP is not required on every sign-in.
- Configure the SMTP values in `backend/.env` (copy from `.env.example`) before using signup. For Gmail, enable 2-Step Verification and create a Google App Password; use `smtp.gmail.com`, port `587`, STARTTLS, the Gmail address for `SMTP_USERNAME` and `SMTP_FROM_EMAIL`, and the App Password for `SMTP_PASSWORD`. Never use your normal Gmail password or commit `.env` to Git.
- Restart the backend after editing `.env`. If SMTP is not configured or mail delivery fails, signup shows an explicit error and does not create an unverified account. OTP expires after 10 minutes, allows at most five attempts, and resend requests are throttled. New public accounts receive the `analyst` role; only the existing configured admin remains an administrator.
- The existing default admin login remains controlled by `ADMIN_EMAIL` and `ADMIN_PASSWORD`. Existing users in the database can still sign in with their stored credentials.
