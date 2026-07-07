import json
from http import HTTPStatus
from pathlib import Path

DATA_FILE = Path('/tmp/messages.json')


def read_messages():
    if DATA_FILE.exists():
        try:
            return json.loads(DATA_FILE.read_text(encoding='utf-8'))
        except json.JSONDecodeError:
            return []
    return []


def app(request):
    messages = read_messages()
    return {
        'statusCode': HTTPStatus.OK,
        'headers': {'Content-Type': 'application/json'},
        'body': json.dumps({
            'totalMessages': len(messages),
            'latestMessageAt': messages[0]['createdAt'] if messages else None,
        })
    }


handler = app
application = app
