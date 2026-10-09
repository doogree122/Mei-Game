"""Bundle the game into one self-contained HTML page (for a claude.ai artifact).

usage: python3 tools/build_single.py <out.html>

Inlines css/style.css and every script index.html loads, and embeds the music
tracks (MUSIC_DATA), sound effects (SFX_DATA) and level backdrops (STAGE_DATA) as data URIs so the page
needs no other files. The output omits
<!doctype>/<html>/<head>/<body>: the artifact host adds that skeleton.
"""
import base64
import os
import re
import sys

out = sys.argv[1]
html = open('index.html').read()
css = open('css/style.css').read()
body = html[html.index('<body>') + len('<body>'):html.index('</body>')]
scripts = re.findall(r'<script src="([^"]+)"></script>', body)
body = re.sub(r'\s*<script src="[^"]+"></script>', '', body)
def data_uri(path):
    return 'data:audio/mpeg;base64,' + base64.b64encode(open(path, 'rb').read()).decode()


menu = data_uri('assets/music/hyperspace_jump.mp3')
fight1 = data_uri('assets/music/arcade_march.mp3')
fight2 = data_uri('assets/music/arcade_march_2.mp3')
music = menu + fight1 + fight2
js = f"const MUSIC_DATA = {{ menu: '{menu}', fight1: '{fight1}', fight2: '{fight2}' }};\n"
# Recorded sound effects (assets/sfx/) too.
sfx = {name[:-4]: data_uri(f'assets/sfx/{name}') for name in sorted(os.listdir('assets/sfx')) if name.endswith('.mp3')}
js += 'const SFX_DATA = {' + ', '.join(f"'{k}': '{v}'" for k, v in sfx.items()) + '};\n'
# Level backdrops as data URIs too.
mime = {'.jpg': 'image/jpeg', '.png': 'image/png'}
stages = {name[:-4]: f'data:{mime[name[-4:]]};base64,' + base64.b64encode(open(f'assets/stages/{name}', 'rb').read()).decode()
          for name in sorted(os.listdir('assets/stages')) if name[-4:] in mime}
js += 'const STAGE_DATA = {' + ', '.join(f"'{k}': '{v}'" for k, v in stages.items()) + '};\n'
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
