# DentalAI

A small web app that loads a local PyTorch model (`model.pt`) and serves a simple UI from `templates/` and `static/`.

This README documents how to set up and run the project on Windows (PowerShell) and where to find the main files.

## Prerequisites

- Python 3.8 or newer
- pip (bundled with modern Python)
- A working virtual environment (`venv`) is recommended

## Quick setup (PowerShell)

Open PowerShell in the project root (`c:\Users\...\DentalAI`) and run:

```powershell
# create virtual environment
python -m venv venv

# activate (PowerShell)
.\venv\Scripts\Activate.ps1

# if activation is blocked by execution policy, run as admin or use:
# Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser -Force

# install dependencies
pip install -r requirements.txt
```

## Running the app

From an activated venv in PowerShell run:

```powershell
python app.py
```

Notes:
- `app.py` is the application entry point. If the project uses Flask, FastAPI or another framework this file should start the server.
- The model file `model.pt` is loaded by the app at runtime (keep it in the project root or the path expected by `app.py`).

## Project structure

```
README.md         # this file
app.py            # application entrypoint
model.pt          # PyTorch model used by the app (binary)
requirements.txt  # Python packages
templates/        # HTML templates (e.g., index.html)
static/           # JS/CSS and other static assets
```

## Usage / Endpoints

- Open a browser and navigate to http://127.0.0.1:8000 (or the host/port printed by `app.py`).
- The UI in `templates/index.html` and `static/script.js` provide the front-end!.





---
