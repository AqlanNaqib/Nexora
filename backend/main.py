from fastapi import FastAPI, HTTPException
from lib.supabase_client import supabase
from models import DocumentCreate

app = FastAPI()


@app.get("/")
def read_root():
    return {"message": "Nexora backend is running"}


@app.get("/health")
def health_check():
    return {"status": "ok"}


@app.post("/documents")
def create_document(document: DocumentCreate):
    try:
        response = supabase.table("documents").insert({
            "user_id": document.user_id,
            "filename": document.filename,
            "file_type": document.file_type,
            "storage_path": document.storage_path,
        }).execute()
        return response.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/documents/{user_id}")
def get_documents(user_id: str):
    try:
        response = supabase.table("documents").select("*").eq("user_id", user_id).execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
