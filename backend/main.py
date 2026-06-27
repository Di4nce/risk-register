from fastapi.responses import StreamingResponse
import csv
import io
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pathlib import Path
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session, select
from datetime import datetime
from .models import Risk, RiskCreate, RiskRead, Asset, AssetCreate, AssetRead
from .database import create_db_and_tables, get_session

app = FastAPI(title="Risk Register PoC")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory="frontend"), name="static")

@app.get("/")
def serve_frontend():
    return FileResponse("frontend/index.html")

@app.on_event("startup")
def on_startup():
    create_db_and_tables()

@app.get("/risks", response_model=list[RiskRead])
def get_risks(session: Session = Depends(get_session)):
    risks = session.exec(select(Risk)).all()
    return risks # changed from risks

@app.post("/risks", response_model=RiskRead)
def create_risk(risk: RiskCreate, session: Session = Depends(get_session)):
    db_risk = Risk.from_orm(risk)
    db_risk.risk_score = risk.likelihood * risk.impact
    session.add(db_risk)
    session.commit()
    session.refresh(db_risk)
    return db_risk

@app.delete("/risks/{risk_id}")
def delete_risk(risk_id: int, session: Session = Depends(get_session)):
    risk = session.get(Risk, risk_id)
    if not risk:
        raise HTTPException(status_code=404, detail="Risk not found")
    session.delete(risk)
    session.commit()
    return {"ok": True}

@app.patch("/risks/{risk_id}", response_model=RiskRead)
def update_risk(risk_id: int, risk_data: RiskCreate, session: Session = Depends(get_session)):
    risk = session.get(Risk, risk_id)
    if not risk:
        raise HTTPException(status_code=404, detail="Risk not found")
    for key, value in risk_data.dict().items():
        setattr(risk, key, value)
    risk.risk_score = risk_data.likelihood * risk_data.impact
    risk.updated_at = datetime.utcnow()
    session.add(risk)
    session.commit()
    session.refresh(risk)
    return risk

@app.get("/risks/export/csv")
def export_csv(session: Session = Depends(get_session)):
    risks = session.exec(select(Risk)).all()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID", "Title", "Category", "Owner", "Description",
                     "Likelihood", "Impact", "Risk Score", "Status",
                     "Treatment", "Created", "Updated"])
    for r in risks:
        writer.writerow([r.id, r.title, r.category, r.owner, r.description,
                         r.likelihood, r.impact, r.risk_score, r.status,
                        r.treatment, r.created_at, r.updated_at])
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=risk_register.csv"}
    )

@app.get("/assets", response_model=list[AssetRead])
def get_assets(session: Session = Depends(get_session)):
    assets = session.exec(select(Asset)).all()
    return assets

@app.post("/assets", response_model=AssetRead)
def create_asset(asset: AssetCreate, session: Session = Depends(get_session)):
    db_asset = Asset.from_orm(asset)
    db_asset.asset_value = round((asset.confidentiality + asset.integrity + asset.availability) / 3)
    session.add(db_asset)
    session.commit()
    session.refresh(db_asset)
    return db_asset

@app.patch("/assets/{asset_id}", response_model=AssetRead)
def update_asset(asset_id: int, asset_data: AssetCreate, session: Session = Depends(get_session)):
    asset = session.get(Asset, asset_id)
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    for key, value in asset_data.dict().items():
        setattr(asset, key, value)
    asset.asset_value = round((asset_data.confidentiality + asset_data.integrity + asset_data.availability) / 3)
    asset.updated_at = datetime.utcnow()
    session.add(asset)
    session.commit()
    session.refresh(asset)
    return asset

@app.delete("/assets/{asset_id}")
def delete_asset(asset_id: int, session: Session = Depends(get_session)):
    asset = session.get(Asset, asset_id)
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    session.delete(asset)
    session.commit()
    return {"ok": True}