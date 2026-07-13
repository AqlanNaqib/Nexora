import logging

from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Depends, Query
from lib.supabase_client import supabase
from dependencies import get_current_user

logger = logging.getLogger("nexora")

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



from lib.pagination import calculate_pagination


@app.get("/documents")
def get_documents(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=1, le=100),
    search: str | None = None,
    current_user=Depends(get_current_user),
):
    try:
        query = supabase.table("documents").select("id", count="exact").eq(
            "user_id", current_user.id
        )
        if search:
            query = query.or_(
                f"filename.ilike.%{search}%,summary.ilike.%{search}%"
            )
        count_response = query.execute()
        total = count_response.count

        pagination = calculate_pagination(page, page_size, total)
        offset = pagination["offset"]

        data_query = (
            supabase.table("documents")
            .select("*")
            .eq("user_id", current_user.id)
        )
        if search:
            data_query = data_query.or_(
                f"filename.ilike.%{search}%,summary.ilike.%{search}%"
            )
        response = (
            data_query.order("created_at", desc=True)
            .range(offset, offset + page_size - 1)
            .execute()
        )

        return {
            "documents": response.data,
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": pagination["total_pages"],
        }
    except Exception:
        logger.exception("Failed to fetch documents for user %s", current_user.id)
        raise HTTPException(status_code=500, detail="Internal server error")


from lib.gemini_client import gemini_client
from lib.pdf_extractor import extract_text_from_pdf

import json
import time


def call_gemini_with_retry(prompt, max_retries=3):
    for attempt in range(max_retries):
        try:
            return gemini_client.models.generate_content(
                model="gemini-flash-latest",
                contents=prompt,
            )
        except Exception as e:
            if "503" in str(e) and attempt < max_retries - 1:
                time.sleep(2 ** attempt)
                continue
            raise


def parse_gemini_json(result):
    raw_response = result.text.strip()
    raw_response = raw_response.removeprefix("```json").removeprefix("```").removesuffix("```").strip()
    return json.loads(raw_response)


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

        result = call_gemini_with_retry(prompt)
        parsed = parse_gemini_json(result)
        summary = parsed["summary"]
        entities = parsed["entities"]

        update_response = (
            supabase.table("documents")
            .update({"summary": summary, "entities": entities, "status": "analyzed"})
            .eq("id", document_id)
            .eq("user_id", current_user.id)
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
    except Exception:
        logger.exception("Failed to analyze document %s", document_id)
        raise HTTPException(status_code=500, detail="Internal server error")

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

        supabase.table("documents").delete().eq("id", document_id).eq(
            "user_id", current_user.id
        ).execute()

        return {"status": "deleted", "id": document_id}

    except HTTPException:
        raise
    except Exception:
        logger.exception("Failed to delete document %s", document_id)
        raise HTTPException(status_code=500, detail="Internal server error")


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
    except Exception:
        logger.exception("Failed to create investigation for user %s", current_user.id)
        raise HTTPException(status_code=500, detail="Internal server error")


@app.get("/investigations")
def get_investigations(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=1, le=100),
    current_user=Depends(get_current_user),
):
    try:
        count_response = (
            supabase.table("investigations")
            .select("id", count="exact")
            .eq("user_id", current_user.id)
            .execute()
        )
        total = count_response.count

        pagination = calculate_pagination(page, page_size, total)
        offset = pagination["offset"]

        response = (
            supabase.table("investigations")
            .select("*")
            .eq("user_id", current_user.id)
            .order("created_at", desc=True)
            .range(offset, offset + page_size - 1)
            .execute()
        )

        return {
            "investigations": response.data,
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": pagination["total_pages"],
        }
    except Exception:
        logger.exception("Failed to fetch investigations for user %s", current_user.id)
        raise HTTPException(status_code=500, detail="Internal server error")


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
            .eq("user_id", current_user.id)
            .execute()
        )

        investigation = inv_response.data[0]
        investigation["documents"] = docs_response.data
        return investigation

    except HTTPException:
        raise
    except Exception:
        logger.exception("Failed to fetch investigation %s", investigation_id)
        raise HTTPException(status_code=500, detail="Internal server error")


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

        supabase.table("investigations").delete().eq("id", investigation_id).eq(
            "user_id", current_user.id
        ).execute()

        return {"status": "deleted", "id": investigation_id}

    except HTTPException:
        raise
    except Exception:
        logger.exception("Failed to delete investigation %s", investigation_id)
        raise HTTPException(status_code=500, detail="Internal server error")


ALLOWED_UPLOAD_CONTENT_TYPES = {"application/pdf"}


@app.post("/documents/upload")
async def upload_document(
    file: UploadFile = File(...),
    investigation_id: str | None = Form(None),
    current_user=Depends(get_current_user),
):
    if file.content_type not in ALLOWED_UPLOAD_CONTENT_TYPES:
        raise HTTPException(status_code=400, detail="Only PDF files are supported")

    try:
        user_id = current_user.id

        if investigation_id:
            inv_response = (
                supabase.table("investigations")
                .select("id")
                .eq("id", investigation_id)
                .eq("user_id", user_id)
                .execute()
            )
            if not inv_response.data:
                raise HTTPException(status_code=404, detail="Investigation not found")

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
    except HTTPException:
        raise
    except Exception:
        logger.exception("Failed to upload document for user %s", current_user.id)
        raise HTTPException(status_code=500, detail="Internal server error")


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
            .eq("user_id", current_user.id)
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
Respond with ONLY valid JSON, no markdown formatting, no code fences, matching exactly this structure:

{{
  "overview": "3-4 sentence combined overview drawing connections across documents",
  "shared_entities": "text describing entities appearing across multiple documents and which documents",
  "timeline": "text describing a combined chronological timeline of key dates/events",
  "contradictions": ["short description of contradiction 1", "short description of contradiction 2"]
}}

If there are no contradictions, return an empty array for "contradictions".

Document summaries:
{combined_summaries}
"""

        result = call_gemini_with_retry(prompt)
        parsed = parse_gemini_json(result)

        synthesis = (
            f"**Overview**\n{parsed['overview']}\n\n"
            f"**Shared Entities**\n{parsed['shared_entities']}\n\n"
            f"**Timeline**\n{parsed['timeline']}"
        )

        update_response = (
            supabase.table("investigations")
            .update({"synthesis": synthesis})
            .eq("id", investigation_id)
            .eq("user_id", current_user.id)
            .execute()
        )

        supabase.table("alerts").delete().eq("investigation_id", investigation_id).eq(
            "user_id", current_user.id
        ).eq("type", "contradiction").execute()

        for contradiction in parsed.get("contradictions", []):
            supabase.table("alerts").insert({
                "user_id": current_user.id,
                "investigation_id": investigation_id,
                "type": "contradiction",
                "message": contradiction,
            }).execute()

        return update_response.data[0]

    except HTTPException:
        raise
    except json.JSONDecodeError:
        raise HTTPException(
            status_code=500, detail="AI response could not be parsed as valid JSON"
        )
    except Exception:
        logger.exception("Failed to synthesize investigation %s", investigation_id)
        raise HTTPException(status_code=500, detail="Internal server error")


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

    except Exception:
        logger.exception("Failed to build dashboard summary for user %s", current_user.id)
        raise HTTPException(status_code=500, detail="Internal server error")


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

    except Exception:
        logger.exception("Failed to build entities summary for user %s", current_user.id)
        raise HTTPException(status_code=500, detail="Internal server error")


@app.get("/alerts")
def get_alerts(current_user=Depends(get_current_user)):
    try:
        stored_alerts_response = (
            supabase.table("alerts")
            .select("*, investigations(title)")
            .eq("user_id", current_user.id)
            .order("created_at", desc=True)
            .execute()
        )
        stored_alerts = stored_alerts_response.data

        stale_cutoff = datetime.now(timezone.utc) - timedelta(days=3)
        documents_response = (
            supabase.table("documents")
            .select("*")
            .eq("user_id", current_user.id)
            .eq("status", "uploaded")
            .execute()
        )

        stale_alerts = []
        for doc in documents_response.data:
            created = datetime.fromisoformat(doc["created_at"])
            if created < stale_cutoff:
                stale_alerts.append({
                    "id": f"stale-{doc['id']}",
                    "type": "stale_document",
                    "message": f'"{doc["filename"]}" has been uploaded but not analyzed',
                    "created_at": doc["created_at"],
                    "investigations": None,
                })

        all_alerts = stored_alerts + stale_alerts
        all_alerts.sort(key=lambda a: a["created_at"], reverse=True)

        return all_alerts

    except Exception:
        logger.exception("Failed to fetch alerts for user %s", current_user.id)
        raise HTTPException(status_code=500, detail="Internal server error")


@app.post("/documents/reset-analysis")
def reset_all_analysis(current_user=Depends(get_current_user)):
    try:
        response = (
            supabase.table("documents")
            .update({"summary": None, "entities": None, "status": "uploaded"})
            .eq("user_id", current_user.id)
            .eq("status", "analyzed")
            .execute()
        )
        return {"reset_count": len(response.data)}
    except Exception:
        logger.exception("Failed to reset analysis for user %s", current_user.id)
        raise HTTPException(status_code=500, detail="Internal server error")


VALID_ENTITY_CATEGORIES = {"people", "organizations", "dates", "locations"}


@app.delete("/entities/{category}/{entity_name}")
def delete_entity(
    category: str, entity_name: str, current_user=Depends(get_current_user)
):
    if category not in VALID_ENTITY_CATEGORIES:
        raise HTTPException(status_code=400, detail="Invalid entity category")

    try:
        documents_response = (
            supabase.table("documents")
            .select("id, entities")
            .eq("user_id", current_user.id)
            .eq("status", "analyzed")
            .execute()
        )

        removed_from = 0

        for doc in documents_response.data:
            entities = doc.get("entities")
            if not entities:
                continue

            category_list = entities.get(category, [])
            if entity_name in category_list:
                entities[category] = [
                    name for name in category_list if name != entity_name
                ]
                supabase.table("documents").update({"entities": entities}).eq(
                    "id", doc["id"]
                ).eq("user_id", current_user.id).execute()
                removed_from += 1

        return {"removed_from": removed_from}

    except Exception:
        logger.exception(
            "Failed to delete entity %s/%s for user %s",
            category,
            entity_name,
            current_user.id,
        )
        raise HTTPException(status_code=500, detail="Internal server error")


@app.delete("/alerts/{alert_id}")
def delete_alert(alert_id: str, current_user=Depends(get_current_user)):
    try:
        if alert_id.startswith("stale-"):
            return {"status": "dismissed", "id": alert_id}

        supabase.table("alerts").delete().eq("id", alert_id).eq(
            "user_id", current_user.id
        ).execute()
        return {"status": "deleted", "id": alert_id}
    except Exception:
        logger.exception("Failed to delete alert %s", alert_id)
        raise HTTPException(status_code=500, detail="Internal server error")
