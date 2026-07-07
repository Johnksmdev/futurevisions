from http import HTTPStatus
import json


def handler(request):
    return {
        'statusCode': HTTPStatus.OK,
        'headers': {'Content-Type': 'application/json'},
        'body': json.dumps({'status': 'ok', 'service': 'jj-website-backend'})
    }
