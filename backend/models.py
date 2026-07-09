from pydantic import BaseModel


class DocumentCreate(BaseModel):
    user_id: str
    filename: str
    file_type: str
    storage_path: str
