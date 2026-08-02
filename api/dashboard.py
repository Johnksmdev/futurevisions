import json
from http import HTTPStatus
from pathlib import Path

DATA_FILE = Path('/tmp/messages.json')
DASHBOARD_PASSWORD = 'johnkosmas77'


def read_messages():
    if DATA_FILE.exists():
        try:
            return json.loads(DATA_FILE.read_text(encoding='utf-8'))
        except json.JSONDecodeError:
            return []
    return []


def _read_body(request):
    body = request.get('body', '{}') if isinstance(request, dict) else '{}'
    if isinstance(body, (bytes, bytearray)):
        body = body.decode('utf-8')
    if body is None:
        body = '{}'
    if isinstance(body, str):
        try:
            return json.loads(body)
        except json.JSONDecodeError:
            return {}
    return body if isinstance(body, dict) else {}


def app(request):
    method = request.get('method', request.get('httpMethod', 'GET')) if isinstance(request, dict) else 'GET'

    headers = request.get('headers', {}) if isinstance(request, dict) else {}
    if not isinstance(headers, dict):
        headers = {}
    header_password = headers.get('x-dashboard-password', headers.get('X-Dashboard-Password', ''))

    payload = _read_body(request)
    body_password = payload.get('password') or ''
    if not isinstance(body_password, str):
        body_password = str(body_password)

    password = body_password.strip() or header_password.strip()

    if password != DASHBOARD_PASSWORD:
        return {
            'statusCode': HTTPStatus.UNAUTHORIZED,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({'error': 'Unauthorized'})
        }

    messages = read_messages()
    return {
        'statusCode': HTTPStatus.OK,
        'headers': {'Content-Type': 'application/json'},
        'body': json.dumps({
            'status': 'ok',
            'service': 'jj-website-backend',
            'totalMessages': len(messages),
            'latestMessageAt': messages[0]['createdAt'] if messages else None,
            'messages': messages[:10],
        })
    }


handler = app
application = app
