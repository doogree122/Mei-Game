"""Generate a fighter's body parts with Nano Banana Pro (Gemini image model).

usage: GEMINI_API_KEY=... python3 tools/nano_banana.py tools/parts/<id>.json <outdir> [part ...]

The spec lists a shared style and one prompt per part (each painted alone, side
view facing right, on white), with an optional reference image. Results are
cut out and graded, then packed with tools/pack_parts.py.
"""
import base64, json, os, sys, urllib.request, concurrent.futures

KEY = os.environ['GEMINI_API_KEY']
MODEL = os.environ.get('NB_MODEL', 'gemini-3-pro-image')
URL = f'https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent'

def generate(prompt, aspect, ref, out):
    parts = [{'text': prompt}]
    if ref:
        parts.append({'inline_data': {'mime_type': 'image/png', 'data': base64.b64encode(open(ref, 'rb').read()).decode()}})
    body = {'contents': [{'parts': parts}],
            'generationConfig': {'responseModalities': ['TEXT', 'IMAGE'], 'imageConfig': {'aspectRatio': aspect}}}
    req = urllib.request.Request(URL, data=json.dumps(body).encode(), headers={'Content-Type': 'application/json', 'x-goog-api-key': KEY})
    try:
        with urllib.request.urlopen(req, timeout=240) as r:
            d = json.load(r)
    except urllib.error.HTTPError as e:
        return f'{out}: HTTP {e.code} {e.read()[:300].decode(errors="replace")}'
    texts = []
    for c in d.get('candidates', []):
        for p in c.get('content', {}).get('parts', []):
            if 'inlineData' in p or 'inline_data' in p:
                data = (p.get('inlineData') or p.get('inline_data'))['data']
                open(out, 'wb').write(base64.b64decode(data))
                return f'{out}: ok'
            if 'text' in p:
                texts.append(p['text'])
    return f'{out}: no image. {d.get("promptFeedback", "")} {" ".join(texts)[:300]} {[c.get("finishReason") for c in d.get("candidates", [])]}'

def main():
    spec = json.load(open(sys.argv[1]))
    outdir = sys.argv[2]
    names = sys.argv[3:] or list(spec['parts'])
    jobs = {}
    with concurrent.futures.ThreadPoolExecutor(4) as ex:
        for n in names:
            p = spec['parts'][n]
            prompt = spec['style'] + '\n\n' + p['prompt']
            jobs[n] = ex.submit(generate, prompt, p.get('aspect', '9:16'), p.get('ref', spec.get('ref')), os.path.join(outdir, n + '.png'))
        for n, j in jobs.items():
            print(j.result(), flush=True)

main()
