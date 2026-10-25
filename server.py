#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
विकीलिंक सहायक (WikiLink Assistant) - स्थानीय वेब सर्वर (Local Web Server)
========================================================================
लेखक: सदस्य:विक्रम प्रताप (hi.wikipedia.org)
लाइसेंस: MIT / CC BY-SA 4.0

यह एक शून्य-निर्भरता (Zero-dependency) स्थानीय वेब सर्वर है जो Python की
मानक लाइब्रेरी का उपयोग करके टूल वेबसाइट को होस्ट करता है।

उपयोग:
  python3 server.py
  python3 server.py --port 8085 --open
"""

import sys
import os
import argparse
import webbrowser
import http.server
import socketserver
import urllib.request
import urllib.parse
import json

DEFAULT_PORT = 8085

class WikiToolHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    """कस्टम HTTP रिक्वेस्ट हैंडलर जो CORS और सही MIME प्रकार सुनिश्चित करता है।"""

    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Api-User-Agent")
        self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_GET(self):
        # रूट पाथ को index.html पर अग्रेषित करें
        if self.path == "/" or self.path == "":
            self.path = "/index.html"
            return super().do_GET()

        # विकिपीडिया प्रॉक्सी एंडपॉइंट (वैकल्पिक सर्वर-साइड प्रॉक्सी)
        if self.path.startswith("/api/wiki-proxy"):
            self.handle_wiki_proxy()
            return

        return super().do_GET()

    def handle_wiki_proxy(self):
        """स्थानीय परीक्षण हेतु विकिपीडिया API प्रॉक्सी"""
        try:
            parsed = urllib.parse.urlparse(self.path)
            query_params = urllib.parse.parse_qs(parsed.query)
            target_url = query_params.get("url", [None])[0]

            if not target_url:
                self.send_response(400)
                self.end_headers()
                self.wfile.write(b'{"error": "Missing url parameter"}')
                return

            req = urllib.request.Request(
                target_url,
                headers={"User-Agent": "WikiLinkAssistant/1.0 (https://github.com/vikrampratap-wiki/wikilink-tool)"}
            )
            with urllib.request.urlopen(req) as resp:
                data = resp.read()
                self.send_response(200)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.end_headers()
                self.wfile.write(data)
        except Exception as e:
            self.send_response(500)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.end_headers()
            err_json = json.dumps({"error": str(e)}).encode("utf-8")
            self.wfile.write(err_json)

    def log_message(self, format, *args):
        # स्वच्छ कंसोल लॉग
        sys.stdout.write(f"[{self.log_date_time_string()}] {format % args}\n")


def start_server(port: int = DEFAULT_PORT, auto_open: bool = True):
    web_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(web_dir)

    handler = WikiToolHTTPRequestHandler

    # पोर्ट पुनरुपयोग की अनुमति
    socketserver.TCPServer.allow_reuse_address = True

    try:
        with socketserver.TCPServer(("", port), handler) as httpd:
            url = f"http://localhost:{port}/index.html"
            print("=" * 72)
            print("  🔗 विकीलिंक सहायक वेबसाइट (WikiLink Assistant - v1.0)")
            print("  विकिपीडिया तार्किक आंतरिक कड़ी योजक उपकरण (reFill शैली)")
            print("=" * 72)
            print(f"  🌐 सर्वर सक्रिय है: {url}")
            print(f"  📂 रूट डायरेक्टरी: {web_dir}")
            print("  🛑 सर्वर बंद करने हेतु Ctrl+C दबाएँ।")
            print("=" * 72)

            if auto_open:
                print("  🚀 आपके डिफ़ॉल्ट वेब ब्राउज़र में टूल खोला जा रहा है...")
                webbrowser.open(url)

            httpd.serve_forever()

    except OSError as e:
        if e.errno == 98:  # Address already in use
            alt_port = port + 1
            print(f"सूचना: पोर्ट {port} पहले से व्यस्त है। पोर्ट {alt_port} पर पुनः प्रयास किया जा रहा है...")
            start_server(alt_port, auto_open)
        else:
            print(f"सर्वर आरंभ करने में त्रुटि: {e}")
            sys.exit(1)


def main():
    parser = argparse.ArgumentParser(description="विकीलिंक सहायक स्थानीय वेब सर्वर")
    parser.add_argument("--port", type=int, default=DEFAULT_PORT, help=f"सर्वर पोर्ट (डिफ़ॉल्ट: {DEFAULT_PORT})")
    parser.add_argument("--open", dest="open_browser", action="store_true", default=True, help="ब्राउज़र स्वतः खोलें")
    parser.add_argument("--no-open", dest="open_browser", action="store_false", help="ब्राउज़र न खोलें")

    args = parser.parse_args()
    start_server(port=args.port, auto_open=args.open_browser)


if __name__ == "__main__":
    main()
