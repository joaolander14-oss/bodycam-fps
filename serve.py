"""Servidor estático sem cache (para desenvolvimento). Uso: python serve.py [porta]"""
import http.server, os, sys

class H(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, max-age=0")
        super().end_headers()

if __name__ == "__main__":
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8350
    http.server.ThreadingHTTPServer(("", port), H).serve_forever()
