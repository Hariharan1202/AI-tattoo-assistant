import pytest
from httpx import AsyncClient


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------

async def test_health(client: AsyncClient):
    r = await client.get('/health')
    assert r.status_code == 200
    assert r.json() == {'status': 'ok'}


async def test_metrics_endpoint(client: AsyncClient):
    r = await client.get('/metrics')
    assert r.status_code == 200
    assert b'http_requests_total' in r.content


# ---------------------------------------------------------------------------
# Auth — register
# ---------------------------------------------------------------------------

async def test_register_success(client: AsyncClient):
    r = await client.post('/api/auth/register', json={
        'name': 'Alice',
        'email': 'alice@example.com',
        'password': 'strongpass123',
    })
    assert r.status_code == 201
    body = r.json()
    assert 'access_token' in body
    assert body['token_type'] == 'bearer'


async def test_register_duplicate_email(client: AsyncClient):
    payload = {'name': 'Bob', 'email': 'bob@example.com', 'password': 'pass123'}
    await client.post('/api/auth/register', json=payload)
    r = await client.post('/api/auth/register', json=payload)
    assert r.status_code == 409


async def test_register_missing_field(client: AsyncClient):
    r = await client.post('/api/auth/register', json={'name': 'Charlie', 'email': 'charlie@example.com'})
    assert r.status_code == 422


# ---------------------------------------------------------------------------
# Auth — login
# ---------------------------------------------------------------------------

async def test_login_success(client: AsyncClient):
    await client.post('/api/auth/register', json={
        'name': 'Dave',
        'email': 'dave@example.com',
        'password': 'davepass',
    })
    r = await client.post('/api/auth/login', json={'email': 'dave@example.com', 'password': 'davepass'})
    assert r.status_code == 200
    assert 'access_token' in r.json()


async def test_login_wrong_password(client: AsyncClient):
    await client.post('/api/auth/register', json={
        'name': 'Eve',
        'email': 'eve@example.com',
        'password': 'evepass',
    })
    r = await client.post('/api/auth/login', json={'email': 'eve@example.com', 'password': 'wrong'})
    assert r.status_code == 401


async def test_login_unknown_email(client: AsyncClient):
    r = await client.post('/api/auth/login', json={'email': 'ghost@example.com', 'password': 'any'})
    assert r.status_code == 401


# ---------------------------------------------------------------------------
# Auth — me
# ---------------------------------------------------------------------------

async def test_me(auth_client):
    client, _ = auth_client
    r = await client.get('/api/auth/me')
    assert r.status_code == 200
    body = r.json()
    assert body['email'] == 'ci@test.com'
    assert body['name'] == 'CI User'


async def test_me_unauthenticated(client: AsyncClient):
    r = await client.get('/api/auth/me')
    assert r.status_code in (401, 403)  # HTTPBearer raises 403; custom handlers may return 401


# ---------------------------------------------------------------------------
# Chat — conversations
# ---------------------------------------------------------------------------

async def test_create_conversation(auth_client):
    client, _ = auth_client
    r = await client.post('/api/chat/conversations', json={'title': 'Dragon sleeve'})
    assert r.status_code == 201
    body = r.json()
    assert body['title'] == 'Dragon sleeve'
    assert 'id' in body


async def test_list_conversations(auth_client):
    client, _ = auth_client
    await client.post('/api/chat/conversations', json={'title': 'Conv A'})
    await client.post('/api/chat/conversations', json={'title': 'Conv B'})
    r = await client.get('/api/chat/conversations')
    assert r.status_code == 200
    assert len(r.json()) >= 2


async def test_get_conversation_messages(auth_client):
    client, _ = auth_client
    conv_r = await client.post('/api/chat/conversations', json={'title': 'Test conv'})
    conv_id = conv_r.json()['id']
    r = await client.get(f'/api/chat/conversations/{conv_id}')
    assert r.status_code == 200
    assert isinstance(r.json(), list)


async def test_get_conversation_not_found(auth_client):
    client, _ = auth_client
    r = await client.get('/api/chat/conversations/nonexistent-id')
    assert r.status_code == 404


# ---------------------------------------------------------------------------
# User preferences
# ---------------------------------------------------------------------------

async def test_get_preferences_default(auth_client):
    client, _ = auth_client
    r = await client.get('/api/user/preferences')
    assert r.status_code == 200
    body = r.json()
    assert 'preferred_styles' in body
    assert isinstance(body['preferred_styles'], list)
