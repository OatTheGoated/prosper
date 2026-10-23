import http.server
import socketserver
import os
import sys

PORT = 8000
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

class ProsperHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def translate_path(self, path):
        # Normalize and strip leading '/prosper' if present
        clean_path = path.split('?')[0].split('#')[0]
        if clean_path.startswith('/prosper/'):
            path = path[len('/prosper'):]
        elif clean_path == '/prosper':
            path = '/'
        return super().translate_path(path)

    def log_message(self, format, *args):
        # Standard server log
        sys.stdout.write(f"[{self.log_date_time_string()}] {format % args}\n")
        sys.stdout.flush()

if __name__ == "__main__":
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", PORT), ProsperHandler) as httpd:
        print(f"Serving Prosper site at http://localhost:{PORT}/ (supporting both '/' and '/prosper/' paths)")
        sys.stdout.flush()
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServer stopped.")
