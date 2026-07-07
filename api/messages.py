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


def write_messages(messages):
    DATA_FILE.write_text(json.dumps(messages, indent=2), encoding='utf-8')


def app(request):
    method = request.get('method', 'GET')

    if method == 'GET':
        return {
            'statusCode': HTTPStatus.OK,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps(read_messages())
        }

    if method == 'POST':
        payload = request.get('body', '{}')
        if isinstance(payload, str):
            try:
                payload = json.loads(payload)
            except json.JSONDecodeError:
                return {
                    'statusCode': HTTPStatus.BAD_REQUEST,
                    'headers': {'Content-Type': 'application/json'},
                    'body': json.dumps({'error': 'Invalid JSON body.'})
                }

        name = (payload.get('name') or '').strip()
        email = (payload.get('email') or '').strip()
        message = (payload.get('message') or '').strip()

        if not name or not email or not message:
            return {
                'statusCode': HTTPStatus.BAD_REQUEST,
                'headers': {'Content-Type': 'application/json'},
                'body': json.dumps({'error': 'Name, email, and message are required.'})
            }

        messages = read_messages()
        entry = {
            'id': str(len(messages) + 1),
            'name': name,
            'email': email,
            'message': message,
            'createdAt': '2026-07-07T00:00:00+00:00'
        }
        messages.insert(0, entry)
        write_messages(messages)

        return {
            'statusCode': HTTPStatus.CREATED,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps(entry)
        }

    return {
        'statusCode': HTTPStatus.METHOD_NOT_ALLOWED,
        'headers': {'Content-Type': 'application/json'},
        'body': json.dumps({'error': 'Method not allowed'})
    }


handler = app
application = app
