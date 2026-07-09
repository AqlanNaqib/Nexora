from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Depends
from lib.supabase_client import supabase
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


import json


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

        prompt = f"""Analyze the following document. Respond with ONLY valid JSON, no markdown formatting, no code fences, matching exactly this structure:

{{
  "summary": "3-4 sentence summary of the document",
  "entities": {{
    "people": ["name1", "name2"],
    "organizations": ["org1", "org2"],
    "dates": ["date1", "date2"],
    "locations": ["location1", "location2"]
  }}
}}

Document:
{text[:15000]}
"""

        result = gemini_client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
        )

        raw_response = result.text.strip()
        raw_response = raw_response.removeprefix("```json").removeprefix("```").removesuffix("```").strip()

        parsed = json.loads(raw_response)
        summary = parsed["summary"]
        entities = parsed["entities"]

        update_response = (
            supabase.table("documents")
            .update({"summary": summary, "entities": entities, "status": "analyzed"})
            .eq("id", document_id)
            .execute()
        )

        return update_response.data[0]

    except HTTPException:
        raise
    except json.JSONDecodeError:
        raise HTTPException(
            status_code=500,
            detail="AI response could not be parsed as valid JSON",
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/documents/{document_id}")
def delete_document(document_id: str, current_user=Depends(get_current_user)):
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

        supabase.storage.from_("documents").remove([document["storage_path"]])

        supabase.table("documents").delete().eq("id", document_id).execute()

        return {"status": "deleted", "id": document_id}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


from models import DocumentCreate, InvestigationCreate


@app.post("/investigations")
def create_investigation(
    investigation: InvestigationCreate,
    current_user=Depends(get_current_user),
):
    try:
        response = supabase.table("investigations").insert({
            "user_id": current_user.id,
            "title": investigation.title,
            "description": investigation.description,
        }).execute()
        return response.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/investigations")
def get_investigations(current_user=Depends(get_current_user)):
    try:
        response = (
            supabase.table("investigations")
            .select("*")
            .eq("user_id", current_user.id)
            .order("created_at", desc=True)
            .execute()
        )
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/investigations/{investigation_id}")
def get_investigation(investigation_id: str, current_user=Depends(get_current_user)):
    try:
        inv_response = (
            supabase.table("investigations")
            .select("*")
            .eq("id", investigation_id)
            .eq("user_id", current_user.id)
            .execute()
        )

        if not inv_response.data:
            raise HTTPException(status_code=404, detail="Investigation not found")

        docs_response = (
            supabase.table("documents")
            .select("*")
            .eq("investigation_id", investigation_id)
            .execute()
        )

        investigation = inv_response.data[0]
        investigation["documents"] = docs_response.data
        return investigation

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/investigations/{investigation_id}")
def delete_investigation(investigation_id: str, current_user=Depends(get_current_user)):
    try:
        inv_response = (
            supabase.table("investigations")
            .select("*")
            .eq("id", investigation_id)
            .eq("user_id", current_user.id)
            .execute()
        )

        if not inv_response.data:
            raise HTTPException(status_code=404, detail="Investigation not found")

        supabase.table("investigations").delete().eq("id", investigation_id).execute()

        return {"status": "deleted", "id": investigation_id}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@app.post("/documents/upload")
async def upload_document(
    file: UploadFile = File(...),
    investigation_id: str | None = Form(None),
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

        insert_data = {
            "user_id": user_id,
            "filename": file.filename,
            "file_type": file.content_type,
            "storage_path": storage_path,
        }

        if investigation_id:
            insert_data["investigation_id"] = investigation_id

        response = supabase.table("documents").insert(insert_data).execute()

        return response.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/investigations/{investigation_id}/synthesize")
def synthesize_investigation(
    investigation_id: str, current_user=Depends(get_current_user)
):
    try:
        inv_response = (
            supabase.table("investigations")
            .select("*")
            .eq("id", investigation_id)
            .eq("user_id", current_user.id)
            .execute()
        )

        if not inv_response.data:
            raise HTTPException(status_code=404, detail="Investigation not found")

        docs_response = (
            supabase.table("documents")
            .select("*")
            .eq("investigation_id", investigation_id)
            .eq("status", "analyzed")
            .execute()
        )

        documents = docs_response.data

        if len(documents) < 2:
            raise HTTPException(
                status_code=422,
                detail="At least 2 analyzed documents are required for synthesis",
            )

        combined_summaries = "\n\n---\n\n".join(
            f"Document: {doc['filename']}\n{doc['summary']}" for doc in documents
        )

        prompt = f"""You are analyzing multiple documents from a single investigation case.
Below are individual summaries of each document. Your task is to synthesize
them into a case-level analysis.

Provide:
1. A combined overview (3-4 sentences) of what this case is about, drawing connections across documents
2. Entities that appear across MULTIPLE documents (people, organizations, dates, locations) — note which documents they appear in
3. Any contradictions, inconsistencies, or notable discrepancies between documents
4. A combined chronological timeline of key dates/events across all documents

Document summaries:
{combined_summaries}
"""

        result = gemini_client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
        )

        synthesis = result.text

        update_response = (
            supabase.table("investigations")
            .update({"synthesis": synthesis})
            .eq("id", investigation_id)
            .execute()
        )

        return update_response.data[0]

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    

from datetime import datetime, timedelta, timezone


@app.get("/dashboard/summary")
def get_dashboard_summary(current_user=Depends(get_current_user)):
    try:
        investigations_response = (
            supabase.table("investigations")
            .select("*")
            .eq("user_id", current_user.id)
            .order("created_at", desc=True)
            .execute()
        )
        investigations = investigations_response.data

        documents_response = (
            supabase.table("documents")
            .select("*")
            .eq("user_id", current_user.id)
            .order("created_at", desc=True)
            .execute()
        )
        documents = documents_response.data

        analyzed_count = len([d for d in documents if d["status"] == "analyzed"])
        pending_count = len(documents) - analyzed_count

        thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
        activity_by_day: dict[str, dict[str, int]] = {}

        for doc in documents:
            created = datetime.fromisoformat(doc["created_at"])
            if created < thirty_days_ago:
                continue
            day_key = created.strftime("%Y-%m-%d")
            if day_key not in activity_by_day:
                activity_by_day[day_key] = {"uploaded": 0, "analyzed": 0}
            activity_by_day[day_key]["uploaded"] += 1
            if doc["status"] == "analyzed":
                activity_by_day[day_key]["analyzed"] += 1

        activity_timeline = [
            {"date": day, **counts}
            for day, counts in sorted(activity_by_day.items())
        ]

        recent_documents = documents[:5]
        recent_investigations = investigations[:5]

        return {
            "stats": {
                "total_investigations": len(investigations),
                "total_documents": len(documents),
                "analyzed_documents": analyzed_count,
                "pending_documents": pending_count,
            },
            "activity_timeline": activity_timeline,
            "recent_documents": recent_documents,
            "recent_investigations": recent_investigations,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    

@app.get("/entities/summary")
def get_entities_summary(current_user=Depends(get_current_user)):
    try:
        documents_response = (
            supabase.table("documents")
            .select("id, filename, entities")
            .eq("user_id", current_user.id)
            .eq("status", "analyzed")
            .execute()
        )

        documents = documents_response.data

        entity_counts: dict[str, dict[str, list[str]]] = {
            "people": {},
            "organizations": {},
            "dates": {},
            "locations": {},
        }

        for doc in documents:
            entities = doc.get("entities")
            if not entities:
                continue

            for category in entity_counts:
                for name in entities.get(category, []):
                    if name not in entity_counts[category]:
                        entity_counts[category][name] = []
                    entity_counts[category][name].append(doc["filename"])

        result = {}
        for category, names in entity_counts.items():
            result[category] = sorted(
                [
                    {"name": name, "count": len(files), "documents": files}
                    for name, files in names.items()
                ],
                key=lambda x: x["count"],
                reverse=True,
            )

        return result

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
