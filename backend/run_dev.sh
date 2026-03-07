#!/bin/bash
# Ejecutar backend localmente con hot reload (sin Docker)
# Requiere: pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 5000 --reload
