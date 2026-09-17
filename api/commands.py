import json
import os
from datetime import datetime

DATA_DIR = os.path.join(os.path.dirname(__file__), '..', 'data')
os.makedirs(DATA_DIR, exist_ok=True)

COMMANDS_FILE = os.path.join(DATA_DIR, 'commands.json')


def load_json(filepath, default=None):
    if os.path.exists(filepath):
        with open(filepath, 'r', encoding='utf-8') as f:
            return json.load(f)
    return default or {}


def save_json(filepath, data):
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


def handler(request):
    """Vercel Python serverless function handler."""
    method = request.method
    headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Content-Type': 'application/json'
    }
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': headers,
            'body': ''
        }
    
    if method == 'GET':
        data = load_json(COMMANDS_FILE, {'commands': [], 'updated_at': None})
        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps(data)
        }
    
    if method == 'POST':
        try:
            data = request.json
        except Exception:
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({'error': 'Invalid JSON'})
            }
        
        if not data:
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({'error': 'No data provided'})
            }
        
        save_json(COMMANDS_FILE, data)
        
        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({'success': True, 'message': 'Commands updated'})
        }
    
    return {
        'statusCode': 405,
        'headers': headers,
        'body': json.dumps({'error': 'Method not allowed'})
    }