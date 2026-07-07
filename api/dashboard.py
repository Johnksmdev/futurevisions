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


def handler(request):
    headers = request.get('headers', {})
    password = headers.get('x-dashboard-password', '')

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
