# WMS Application

Warehouse Management System with a FastAPI backend, PostgreSQL database, and Vite React frontend.

## Prerequisites

- Python 3.11 recommended
- Node.js 18+ and npm
- PostgreSQL running locally or reachable from your machine

## Database

Create a PostgreSQL database for local development:

```sh
createdb wms
```

The backend reads its database connection from `backend/.env`:

```env
DATABASE_URL=postgresql://postgres:your-password@localhost:5432/wms
JWT_SECRET_KEY=change-this-for-local-dev
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=60
LOCAL_ADMIN_USERNAME=admin
LOCAL_ADMIN_PASSWORD=admin123
LOCAL_ADMIN_EMAIL=admin@local.dev
```

On startup, the backend creates missing tables and loads bundled demo data into empty tables from `backend/mock_data` and `backend/master_data_csv`. If you do not want demo data initialized, set:

```sh
export MGX_IGNORE_INIT_DATA=1
```

To manually sync the bundled seed data into the database, run:

```sh
cd backend
source .venv311/bin/activate
python seed_data.py
```

This command upserts the seed files into the matching database tables, so existing demo rows are updated and missing demo rows are inserted.

## Run The Backend

From the repository root:

```sh
cd backend
```

Create and activate a virtual environment if you do not already have one:

```sh
python3.11 -m venv .venv311
source .venv311/bin/activate
```

Install dependencies:

```sh
pip install -r requirements.txt
```

Start the API server:

```sh
python run.py
```

The backend runs at:

```text
http://127.0.0.1:8000
```

Useful backend URLs:

```text
http://127.0.0.1:8000/docs
http://127.0.0.1:8000/api/v1/health
```

To run with auto-reload during development:

```sh
UVICORN_RELOAD=true python run.py
```

## Run The Frontend

Open a second terminal from the repository root:

```sh
cd frontend
```

Install dependencies:

```sh
npm install
```

Start the Vite dev server:

```sh
npm run dev
```

The frontend usually runs at:

```text
http://localhost:5173
```

By default, the frontend calls the backend at `http://127.0.0.1:8000`. To override it, create `frontend/.env.local`:

```env
VITE_API_BASE_URL=http://127.0.0.1:8000
```

## Login

For local development, the default admin account comes from `backend/.env`:

```text
Username: admin
Password: admin123
```

## Common Workflow

Use two terminals:

```sh
# Terminal 1
cd backend
source .venv311/bin/activate
python run.py
```

```sh
# Terminal 2
cd frontend
npm run dev
```

Then open `http://localhost:5173` in your browser.

## Troubleshooting

- If the backend cannot connect to the database, verify PostgreSQL is running and `DATABASE_URL` in `backend/.env` points to the right host, port, username, password, and database.
- If tables exist but demo rows are missing, make sure `MGX_IGNORE_INIT_DATA` is not set, then restart the backend. Demo rows are inserted only when each table is empty.
- If the frontend cannot call the API, verify the backend is running on port `8000` or set `VITE_API_BASE_URL` in `frontend/.env.local`.
- If port `8000` or `5173` is already in use, stop the existing process or start the service on another port.

## Production Build

Build the frontend:

```sh
cd frontend
npm run build
```

Preview the production build locally:

```sh
npm run preview
```
