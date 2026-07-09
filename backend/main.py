from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Depends
from lib.supabase_client import supabase
from models import DocumentCreate
from dependencies import get_current_user

app = FastAPI()

from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def read_root():
    return {"message": "Nexora backend is running"}


@app.get("/health")
def health_check():
    return {"status": "ok"}


@app.post("/documents/upload")
async def upload_document(
    file: UploadFile = File(...),
    current_user=Depends(get_current_user),
):
    try:
        user_id = current_user.id
        file_bytes = await file.read()
        storage_path = f"{user_id}/{file.filename}"

        supabase.storage.from_("documents").upload(
            path=storage_path,
            file=file_bytes,
            file_options={"content-type": file.content_type},
        )

        response = supabase.table("documents").insert({
            "user_id": user_id,
            "filename": file.filename,
            "file_type": file.content_type,
            "storage_path": storage_path,
        }).execute()

        return response.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/documents")
def get_documents(current_user=Depends(get_current_user)):
    try:
        response = (
            supabase.table("documents")
            .select("*")
            .eq("user_id", current_user.id)
            .execute()
        )
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
