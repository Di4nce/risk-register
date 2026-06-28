from .annex_a import ANNEX_A_CONTROLS
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
from .models import Risk, RiskCreate, RiskRead, Asset, AssetCreate, AssetRead, Control, ControlCreate, ControlRead, RiskControlLink
from .database import create_db_and_tables, get_session

app = FastAPI(title="Risk Register PoC")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

from fastapi.responses import FileResponse
import os

app.mount("/static", StaticFiles(directory="frontend"), name="static")

@app.get("/static/app.js")
def serve_js():
    return FileResponse("frontend/app.js", media_type="application/javascript")

@app.get("/static/style.css")
def serve_css():
    return FileResponse("frontend/style.css", media_type="text/css")

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
    writer.writerow(["ID", "Tittel", "Kategori", "Risikoeier", "Beskrivelse",
                    "Sannsynlighet", "Konsekvens", "Risikoscore", "Status",
                    "Behandlingsplan", "Opprettet", "Oppdatert"])
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

@app.get("/annex-a")
def get_annex_a():
    return ANNEX_A_CONTROLS

@app.get("/controls", response_model=list[ControlRead])
def get_controls(session: Session = Depends(get_session)):
    controls = session.exec(select(Control)).all()
    result = []
    for control in controls:
        links = session.exec(
            select(RiskControlLink).where(RiskControlLink.control_id == control.id)
        ).all()
        risk_ids = [l.risk_id for l in links]
        control_read = ControlRead.from_orm(control)
        control_read.risk_ids = risk_ids
        result.append(control_read)
    return result

@app.post("/controls", response_model=ControlRead)
def create_control(control: ControlCreate, session: Session = Depends(get_session)):
    db_control = Control(
        name=control.name,
        description=control.description,
        annex_ref=control.annex_ref,
        annex_name=control.annex_name,
        owner=control.owner,
        status=control.status,
    )
    session.add(db_control)
    session.commit()
    session.refresh(db_control)
    for risk_id in control.risk_ids:
        link = RiskControlLink(risk_id=risk_id, control_id=db_control.id)
        session.add(link)
    session.commit()
    control_read = ControlRead.from_orm(db_control)
    control_read.risk_ids = control.risk_ids
    return control_read

@app.patch("/controls/{control_id}", response_model=ControlRead)
def update_control(control_id: int, control_data: ControlCreate, session: Session = Depends(get_session)):
    control = session.get(Control, control_id)
    if not control:
        raise HTTPException(status_code=404, detail="Kontroll ikke funnet")
    for key, value in control_data.dict(exclude={"risk_ids"}).items():
        setattr(control, key, value)
    control.updated_at = datetime.utcnow()
    session.add(control)
    # Update risk links
    session.exec(
        select(RiskControlLink).where(RiskControlLink.control_id == control_id)
    )
    old_links = session.exec(
        select(RiskControlLink).where(RiskControlLink.control_id == control_id)
    ).all()
    for link in old_links:
        session.delete(link)
    for risk_id in control_data.risk_ids:
        link = RiskControlLink(risk_id=risk_id, control_id=control_id)
        session.add(link)
    session.commit()
    session.refresh(control)
    control_read = ControlRead.from_orm(control)
    control_read.risk_ids = control_data.risk_ids
    return control_read

@app.delete("/controls/{control_id}")
def delete_control(control_id: int, session: Session = Depends(get_session)):
    control = session.get(Control, control_id)
    if not control:
        raise HTTPException(status_code=404, detail="Kontroll ikke funnet")
    old_links = session.exec(
        select(RiskControlLink).where(RiskControlLink.control_id == control_id)
    ).all()
    for link in old_links:
        session.delete(link)
    session.delete(control)
    session.commit()
    return {"ok": True}