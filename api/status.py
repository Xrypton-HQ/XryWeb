import json
import os
from datetime import datetime
from http.server import BaseHTTPRequestHandler

DATA_DIR = os.path.join(os.path.dirname(__file__), '..', 'data')
os.makedirs(DATA_DIR, exist_ok=True)

BOT_STATUS_FILE = os.path.join(DATA_DIR, 'bot_status.json')


def load_json(filepath, default=None):
    if os.path.exists(filepath):
        with open(filepath, 'r', encoding='utf-8') as f:
            return json.load(f)
    return default or {}


def save_json(filepath, data):
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


def cors_headers():
    return {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Content-Type': 'application/json'
    }


class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        for k, v in cors_headers().items():
            self.send_header(k, v)
        self.end_headers()

    def do_GET(self):
        self.send_response(200)
        for k, v in cors_headers().items():
            self.send_header(k, v)
        self.end_headers()
        
        data = load_json(BOT_STATUS_FILE, {
            'ram_usage': 0,
            'ram_total': 0,
            'cpu_usage': 0,
            'cpu_cores': 0,
            'total_commands_used': 0,
            'commands_used_today': 0,
            'uptime_seconds': 0,
            'updated_at': None
        })
        self.wfile.write(json.dumps(data).encode())

    def do_POST(self):
        content_length = int(self.headers.get('Content-Length', 0))
        post_data = self.rfile.read(content_length)
        
        try:
            data = json.loads(post_data.decode('utf-8'))
        except json.JSONDecodeError:
            self.send_response(400)
            for k, v in cors_headers().items():
                self.send_header(k, v)
            self.end_headers()
            self.wfile.write(json.dumps({'error': 'Invalid JSON'}).encode())
            return
        
        if not data:
            self.send_response(400)
            for k, v in cors_headers().items():
                self.send_header(k, v)
            self.end_headers()
            self.wfile.write(json.dumps({'error': 'No data provided'}).encode())
            return
        
        data['updated_at'] = datetime.utcnow().isoformat()
        save_json(BOT_STATUS_FILE, data)
        
        self.send_response(200)
        for k, v in cors_headers().items():
            self.send_header(k, v)
        self.end_headers()
        self.wfile.write(json.dumps({'success': True, 'message': 'Bot status updated'}).encode())