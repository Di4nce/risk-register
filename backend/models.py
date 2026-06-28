from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import datetime

class RiskBase(SQLModel):
    title: str
    description: str
    likelihood: int # 1-5
    impact: int # 1-5
    owner: str
    status: str = "open" # open / mitigated / accepted
    category: str = "general" # ISO domain later
    asset_id: Optional[int] = None # placeholder for asset register
    treatment: Optional[str] = None # new

class Risk(RiskBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    risk_score: int = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class RiskCreate(RiskBase):
    pass

class RiskRead(RiskBase):
    id: int
    risk_score: int
    created_at: datetime
    updated_at: datetime

class AssetBase(SQLModel):
    name: str
    description: Optional[str] = None
    category: str = "data"  # data / system / service / physical / people
    owner: str
    confidentiality: int = 3  # 1-5
    integrity: int = 3        # 1-5
    availability: int = 3     # 1-5

class Asset(AssetBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    asset_value: int = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class AssetCreate(AssetBase):
    pass

class AssetRead(AssetBase):
    id: int
    asset_value: int
    created_at: datetime
    updated_at: datetime

class RiskControlLink(SQLModel, table=True):
    risk_id:    Optional[int] = Field(default=None, foreign_key="risk.id", primary_key=True)
    control_id: Optional[int] = Field(default=None, foreign_key="control.id", primary_key=True)

class ControlBase(SQLModel):
    name:        str
    description: Optional[str] = None
    annex_ref:   str  # e.g. "5.1"
    annex_name:  str  # e.g. "Retningslinjer for informasjonssikkerhet"
    owner:       Optional[str] = None
    status:      str = "planlagt"  # planlagt / implementert / testet / ikke aktuell

class Control(ControlBase, table=True):
    id:         Optional[int] = Field(default=None, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class ControlCreate(ControlBase):
    risk_ids: list[int] = []

class ControlRead(ControlBase):
    id:         int
    created_at: datetime
    updated_at: datetime
    risk_ids:   list[int] = []