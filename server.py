#!/usr/bin/env python3
"""
YouTube AdFree - Host Audio Streaming Server
Enables unbroken mobile background audio playback and live search via yt-dlp.
"""

import os
import sys
import json
import time
import urllib.parse
import urllib.request
from http import HTTPStatus
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
import yt_dlp

# Cache for video info & direct audio stream URLs
# Format: { video_id: { 'info': {...}, 'audio_url': '...', 'timestamp': float } }
STREAM_CACHE = {}
CACHE_TTL = 3600 * 3  # 3 hours

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
WEB_DIR = os.path.join(BASE_DIR, 'website')

YDL_INFO_OPTS = {
    'format': 'bestaudio[ext=m4a]/bestaudio/best',
    'quiet': True,
    'no_warnings': True,
    'noplaylist': True,
}

YDL_SEARCH_OPTS = {
    'quiet': True,
    'no_warnings': True,
    'extract_flat': True,
    'noplaylist': True,
}

def get_audio_info(video_id):
    """Retrieve metadata and audio stream URL, caching for performance."""
    now = time.time()
    cached = STREAM_CACHE.get(video_id)
    if cached and (now - cached['timestamp']) < CACHE_TTL:
        return cached['info'], cached['audio_url']

    with yt_dlp.YoutubeDL(YDL_INFO_OPTS) as ydl:
        info = ydl.extract_info(video_id, download=False)
        audio_url = info.get('url')
        clean_info = {
            'id': video_id,
            'title': info.get('title', 'Unknown Title'),
            'channel': info.get('uploader') or info.get('channel') or 'YouTube',
            'duration': info.get('duration', 0),
            'thumbnail': info.get('thumbnail') or f"https://img.youtube.com/vi/{video_id}/hqdefault.jpg"
        }
        STREAM_CACHE[video_id] = {
            'info': clean_info,
            'audio_url': audio_url,
            'timestamp': now
        }
        return clean_info, audio_url

def format_seconds(seconds):
    """Format seconds into MM:SS or H:MM:SS string."""
    if not seconds:
        return ""
    try:
        sec = int(seconds)
        m, s = divmod(sec, 60)
        h, m = divmod(m, 60)
        if h > 0:
            return f"{h}:{m:02d}:{s:02d}"
        return f"{m}:{s:02d}"
    except Exception:
        return ""

def get_search_suggestions(query):
    """Fetch live YouTube search suggestions."""
    try:
        q = urllib.parse.quote(query)
        url = f"https://suggestqueries.google.com/complete/search?client=firefox&ds=yt&q={q}"
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=4) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            return data[1] if len(data) > 1 else []
    except Exception:
        return []

def search_youtube(query, max_results=16):
    """Perform fast flat YouTube search via yt-dlp."""
    search_term = f"ytsearch{max_results}:{query}"
    with yt_dlp.YoutubeDL(YDL_SEARCH_OPTS) as ydl:
        res = ydl.extract_info(search_term, download=False)
        results = []
        for entry in res.get('entries', []):
            vid_id = entry.get('id')
            if not vid_id or len(vid_id) != 11:
                continue
            dur = entry.get('duration', 0)
            results.append({
                'id': vid_id,
                'title': entry.get('title', 'YouTube Video'),
                'channel': entry.get('uploader') or entry.get('channel') or 'YouTube',
                'duration': dur,
                'duration_text': format_seconds(dur),
                'thumbnail': f"https://img.youtube.com/vi/{vid_id}/hqdefault.jpg",
                'category': 'Search'
            })
        return results

class StreamingHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=WEB_DIR, **kwargs)

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        params = urllib.parse.parse_qs(parsed.query)

        # 1. API: Video Info
        if path == '/api/info':
            self.handle_api_info(params)
            return

        # 2. API: Live Search
        if path == '/api/search':
            self.handle_api_search(params)
            return

        # 3. API: Search Autocomplete Suggestions
        if path == '/api/suggest':
            self.handle_api_suggest(params)
            return

        # 3. API: Audio Stream Proxy
        if path == '/api/stream':
            self.handle_api_stream(params)
            return

        # 4. Static Files
        super().do_GET()

    def handle_api_info(self, params):
        vid = params.get('v', [None])[0]
        if not vid:
            self.send_json_response({'error': 'Missing video id (v)'}, status=400)
            return

        try:
            info, audio_url = get_audio_info(vid)
            resp = {**info, 'stream_url': f"/api/stream?v={vid}"}
            self.send_json_response(resp)
        except Exception as e:
            self.send_json_response({'error': str(e)}, status=500)

    def handle_api_search(self, params):
        query = params.get('q', [None])[0]
        if not query:
            self.send_json_response({'error': 'Missing query (q)'}, status=400)
            return

        try:
            items = search_youtube(query)
            self.send_json_response({'query': query, 'results': items})
        except Exception as e:
            self.send_json_response({'error': str(e), 'results': []}, status=500)

    def handle_api_suggest(self, params):
        query = params.get('q', [None])[0]
        if not query:
            self.send_json_response({'query': '', 'suggestions': []})
            return

        try:
            suggestions = get_search_suggestions(query)
            self.send_json_response({'query': query, 'suggestions': suggestions})
        except Exception as e:
            self.send_json_response({'query': query, 'suggestions': []})

    def handle_api_stream(self, params):
        vid = params.get('v', [None])[0]
        if not vid:
            self.send_error(HTTPStatus.BAD_REQUEST, 'Missing video id')
            return

        try:
            _, audio_url = get_audio_info(vid)
            if not audio_url:
                self.send_error(HTTPStatus.NOT_FOUND, 'Audio stream unavailable')
                return

            # Forward client's Range header to support scrubbing on iOS Safari
            range_header = self.headers.get('Range')
            req_headers = {
                'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15'
            }
            if range_header:
                req_headers['Range'] = range_header

            upstream_req = urllib.request.Request(audio_url, headers=req_headers)
            with urllib.request.urlopen(upstream_req, timeout=15) as upstream_resp:
                status_code = upstream_resp.status
                self.send_response(status_code)

                # Forward critical media headers
                content_type = upstream_resp.headers.get('Content-Type', 'audio/mp4')
                content_length = upstream_resp.headers.get('Content-Length')
                content_range = upstream_resp.headers.get('Content-Range')

                self.send_header('Content-Type', content_type)
                self.send_header('Accept-Ranges', 'bytes')
                self.send_header('Cache-Control', 'public, max-age=14400')
                self.send_header('Access-Control-Allow-Origin', '*')

                if content_length:
                    self.send_header('Content-Length', content_length)
                if content_range:
                    self.send_header('Content-Range', content_range)

                self.end_headers()

                # Stream chunks directly to client
                chunk_size = 64 * 1024
                while True:
                    chunk = upstream_resp.read(chunk_size)
                    if not chunk:
                        break
                    try:
                        self.wfile.write(chunk)
                    except (BrokenPipeError, ConnectionResetError):
                        break
        except Exception as e:
            if not self.wfile.closed:
                try:
                    self.send_error(HTTPStatus.INTERNAL_SERVER_ERROR, str(e))
                except Exception:
                    pass

    def send_json_response(self, data, status=200):
        body = json.dumps(data).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, format, *args):
        # Concise logging
        sys.stderr.write(f"[{self.log_date_time_string()}] {format % args}\n")

def run(port=3000):
    server_address = ('0.0.0.0', port)
    httpd = ThreadingHTTPServer(server_address, StreamingHandler)
    print(f"============================================================")
    print(f" YouTube AdFree Streaming Server Started")
    print(f" Local Web App:     http://localhost:{port}")
    print(f" Mobile / LAN App:  http://<YOUR_IP>:{port}")
    print(f" Background Audio:  Active via /api/stream with HTTP Range")
    print(f"============================================================")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down server...")
        httpd.server_close()

if __name__ == '__main__':
    port = 3000
    if len(sys.argv) > 1:
        try:
            port = int(sys.argv[1])
        except ValueError:
            pass
    run(port)

