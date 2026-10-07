"""Bundle the game into one self-contained HTML page (for a claude.ai artifact).

usage: python3 tools/build_single.py <out.html>

Inlines css/style.css and every script index.html loads, and embeds the music
as a data URI (MUSIC_DATA) so the page needs no other files. The output omits
<!doctype>/<html>/<head>/<body>: the artifact host adds that skeleton.
"""
import base64
import re
import sys

out = sys.argv[1]
html = open('index.html').read()
css = open('css/style.css').read()
body = html[html.index('<body>') + len('<body>'):html.index('</body>')]
scripts = re.findall(r'<script src="([^"]+)"></script>', body)
body = re.sub(r'\s*<script src="[^"]+"></script>', '', body)
music = base64.b64encode(open('assets/music/hyperspace_jump.mp3', 'rb').read()).decode()
js = f"const MUSIC_DATA = 'data:audio/mpeg;base64,{music}';\n"
js += '\n'.join(f'// ---- {p} ----\n' + open(p).read() for p in scripts)
assert '</script' not in js
with open(out, 'w') as f:
    f.write(f'''<title>Wars vs. Trek</title>
<style>
:root {{ color-scheme: dark; }}
{css}
</style>
{body.strip()}
<script>
{js}
</script>
''')
print(f'{out}: {len(scripts)} scripts, {len(music) // 1024} KB of music')
