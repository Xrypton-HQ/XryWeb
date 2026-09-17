"""Main entrypoint for Vercel Python functions - routes to individual handlers."""

from http.server import BaseHTTPRequestHandler
import json
import os
import sys

# Add the api directory to path for imports
sys.path.insert(0, os.path.dirname(__file__))

# Import the handler functions
from commands import handler as commands_handler
from bot import handler as bot_handler
from status import handler as status_handler


class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.end_headers()

    def do_GET(self):
        self._route_request('GET')

    def do_POST(self):
        self._route_request('POST')

    def _route_request(self, method):
        path = self.path
        
        # Parse path to determine which handler to use
        if path.startswith('/api/commands'):
            self._call_handler(commands_handler, method)
        elif path.startswith('/api/bot'):
            self._call_handler(bot_handler, method)
        elif path.startswith('/api/status'):
            self._call_handler(status_handler, method)
        else:
            self.send_response(404)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'error': 'Not found'}).encode())

    def _call_handler(self, handler_func, method):
        # Create a mock request object
        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length) if content_length > 0 else b''
        
        class MockRequest:
            def __init__(self, method, body, headers):
                self.method = method
                self._body = body
                self.headers = headers
            
            @property
            def json(self):
                if not self._body:
                    return None
                return json.loads(self._body.decode('utf-8'))
        
        request = MockRequest(method, body, self.headers)
        
        # Call the handler
        try:
            response = handler_func(request)
            self.send_response(response['statusCode'])
            for key, value in response['headers'].items():
                self.send_header(key, value)
            self.end_headers()
            self.wfile.write(response['body'].encode())
        except Exception as e:
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'error': str(e)}).encode())


# Also support Vercel's direct handler format
def main(request):
    """Vercel's direct handler format entrypoint."""
    # This is called when using the tool.vercel.entrypoint config
    # We need to route based on the path
    path = request.url.path if hasattr(request, 'url') else '/'
    
    class VercelRequest:
        def __init__(self, req):
            self.method = req.method
            self._body = req.body if hasattr(req, 'body') else b''
            self.headers = dict(req.headers) if hasattr(req, 'headers') else {}
        
        @property
        def json(self):
            if not self._body:
                return None
            if isinstance(self._body, str):
                return json.loads(self._body)
            return json.loads(self._body.decode('utf-8'))
    
    vercel_req = VercelRequest(request)
    
    if path.startswith('/api/commands'):
        return commands_handler(vercel_req)
    elif path.startswith('/api/bot'):
        return bot_handler(vercel_req)
    elif path.startswith('/api/status'):
        return status_handler(vercel_req)
    
    return {
        'statusCode': 404,
        'headers': {'Content-Type': 'application/json'},
        'body': json.dumps({'error': 'Not found'})
    }