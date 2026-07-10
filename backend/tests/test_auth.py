from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def test_documents_requires_auth_header():
    response = client.get("/documents")
    assert response.status_code == 422


def test_documents_rejects_invalid_token():
    response = client.get(
        "/documents",
        headers={"Authorization": "Bearer not-a-real-token"},
    )
    assert response.status_code == 401


def test_documents_rejects_malformed_header():
    response = client.get(
        "/documents",
        headers={"Authorization": "not-even-bearer-format"},
    )
    assert response.status_code == 401
