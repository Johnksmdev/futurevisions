import json
import mimetypes
import os
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parent
PUBLIC_DIR = ROOT / 'public'
DATA_DIR = ROOT / 'data'
DATA_FILE = DATA_DIR / 'messages.json'
DASHBOARD_PASSWORD = os.environ.get('DASHBOARD_PASSWORD', 'johnkosmas77')


class SiteHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        self._handle_request()

    def do_HEAD(self):
        self._handle_request(head=True)

    def _handle_request(self, head=False):
        parsed = urlparse(self.path)
        path = parsed.path

        if path == '/api/health':
            self._send_json({'status': 'ok', 'service': 'jj-website-backend'}, head=head)
            return

        if path == '/api/stats':
            messages = self._read_messages()
            self._send_json({
                'totalMessages': len(messages),
                'latestMessageAt': messages[0]['createdAt'] if messages else None,
            }, head=head)
            return

        if path == '/api/messages':
            messages = self._read_messages()
            self._send_json(messages, head=head)
            return

        if path == '/api/dashboard':
            provided_password = self.headers.get('X-Dashboard-Password', '')
            if provided_password != DASHBOARD_PASSWORD:
                self._send_json({'error': 'Unauthorized'}, status=HTTPStatus.UNAUTHORIZED, head=head)
                return

            messages = self._read_messages()
            self._send_json({
                'status': 'ok',
                'service': 'jj-website-backend',
                'totalMessages': len(messages),
                'latestMessageAt': messages[0]['createdAt'] if messages else None,
                'messages': messages[:10],
            }, head=head)
            return

        self._serve_static(path, head=head)

    def do_POST(self):
        parsed = urlparse(self.path)
        if parsed.path == '/api/dashboard/auth':
            content_length = int(self.headers.get('Content-Length', '0'))
            body = self.rfile.read(content_length).decode('utf-8') if content_length else '{}'

            try:
                payload = json.loads(body or '{}')
            except json.JSONDecodeError:
                self._send_json({'error': 'Invalid JSON body.'}, status=HTTPStatus.BAD_REQUEST)
                return

            password = (payload.get('password') or '').strip()
            if password == DASHBOARD_PASSWORD:
                self._send_json({'authorized': True})
            else:
                self._send_json({'authorized': False}, status=HTTPStatus.UNAUTHORIZED)
            return

        if parsed.path != '/api/messages':
            self._send_json({'error': 'Not found'}, status=HTTPStatus.NOT_FOUND)
            return

        content_length = int(self.headers.get('Content-Length', '0'))
        body = self.rfile.read(content_length).decode('utf-8') if content_length else '{}'

        try:
            payload = json.loads(body or '{}')
        except json.JSONDecodeError:
            self._send_json({'error': 'Invalid JSON body.'}, status=HTTPStatus.BAD_REQUEST)
            return

        name = (payload.get('name') or '').strip()
        email = (payload.get('email') or '').strip()
        message = (payload.get('message') or '').strip()

        if not name or not email or not message:
            self._send_json({'error': 'Name, email, and message are required.'}, status=HTTPStatus.BAD_REQUEST)
            return

        messages = self._read_messages()
        entry = {
            'id': str(len(messages) + 1),
            'name': name,
            'email': email,
            'message': message,
            'createdAt': self._now_iso(),
        }
        messages.insert(0, entry)
        self._write_messages(messages)
        self._send_json(entry, status=HTTPStatus.CREATED)

    def log_message(self, format, *args):
        return

    def _serve_static(self, path, head=False):
        if path in ('', '/'):
            target = PUBLIC_DIR / 'index.html'
        elif path in ('/health-dashboard', '/health-dashboard.html'):
            target = PUBLIC_DIR / 'health-dashboard.html'
        else:
            clean = path.lstrip('/')
            target = (PUBLIC_DIR / clean).resolve()
            if not str(target).startswith(str(PUBLIC_DIR.resolve())):
                self._send_json({'error': 'Invalid path.'}, status=HTTPStatus.FORBIDDEN, head=head)
                return

        if not target.exists() or not target.is_file():
            target = PUBLIC_DIR / 'index.html'

        content_type, _ = mimetypes.guess_type(str(target))
        if content_type is None:
            content_type = 'application/octet-stream'

        try:
            data = target.read_bytes()
        except FileNotFoundError:
            self._send_json({'error': 'Not found.'}, status=HTTPStatus.NOT_FOUND, head=head)
            return

        self.send_response(HTTPStatus.OK)
        self.send_header('Content-Type', content_type)
        self.send_header('Content-Length', str(len(data)))
        self.end_headers()
        if not head:
            self.wfile.write(data)

    def _send_json(self, payload, status=HTTPStatus.OK, head=False):
        body = json.dumps(payload).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        if not head:
            self.wfile.write(body)

    def _read_messages(self):
        if not DATA_FILE.exists():
            return []
        try:
            return json.loads(DATA_FILE.read_text(encoding='utf-8'))
        except json.JSONDecodeError:
            return []

    def _write_messages(self, messages):
        DATA_DIR.mkdir(parents=True, exist_ok=True)
        DATA_FILE.write_text(json.dumps(messages, indent=2), encoding='utf-8')

    @staticmethod
    def _now_iso():
        from datetime import datetime, timezone
        return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def run_server(host='127.0.0.1', port=8000):
    server = ThreadingHTTPServer((host, port), SiteHandler)
    print(f'Server listening on http://{host}:{port}')
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == '__main__':
    run_server()
