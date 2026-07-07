from http import HTTPStatus
import json


def app(request):
    return {
        'statusCode': HTTPStatus.OK,
        'headers': {'Content-Type': 'application/json'},
        'body': json.dumps({'status': 'ok', 'service': 'jj-website-backend'})
    }


handler = app
application = app
