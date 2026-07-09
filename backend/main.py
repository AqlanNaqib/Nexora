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


from lib.gemini_client import gemini_client
from lib.pdf_extractor import extract_text_from_pdf


@app.post("/documents/{document_id}/analyze")
def analyze_document(document_id: str, current_user=Depends(get_current_user)):
    try:
        doc_response = (
            supabase.table("documents")
            .select("*")
            .eq("id", document_id)
            .eq("user_id", current_user.id)
            .execute()
        )

        if not doc_response.data:
            raise HTTPException(status_code=404, detail="Document not found")

        document = doc_response.data[0]

        file_bytes = supabase.storage.from_("documents").download(document["storage_path"])
        text = extract_text_from_pdf(file_bytes)

        if not text.strip():
            raise HTTPException(status_code=422, detail="No readable text found in document")

        prompt = f"""Summarize the following document in 3-4 sentences,
then list the key entities mentioned (people, organizations, dates, locations).

Document:
{text[:15000]}
"""

        result = gemini_client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
        )

        summary = result.text

        update_response = (
            supabase.table("documents")
            .update({"summary": summary, "status": "analyzed"})
            .eq("id", document_id)
            .execute()
        )

        return update_response.data[0]

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
