from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session, select
from datetime import datetime
from .models import Risk, RiskCreate, RiskRead
from .database import create_db_and_tables, get_session

app = FastAPI(title="Risk Register PoC")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

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