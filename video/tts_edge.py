#!/usr/bin/env python3
"""Narração sem chave: Microsoft Edge neural TTS (pip install edge-tts).
  python3 tts_edge.py [VOZ] [--force s1,s2]   (padrão pt-BR-ThalitaMultilingualNeural)"""
import asyncio,json,os,sys,ssl,edge_tts,edge_tts.communicate as ec
ca=os.environ.get('SSL_CERT_FILE') or ('/root/.ccr/ca-bundle.crt' if os.path.exists('/root/.ccr/ca-bundle.crt') else None)
if ca: ec._SSL_CTX=ssl.create_default_context(cafile=ca)
args=[a for a in sys.argv[1:] if not a.startswith('--')]
voice=args[0] if args and not args[0].startswith('s') else 'pt-BR-ThalitaMultilingualNeural'
force=sys.argv[sys.argv.index('--force')+1].split(',') if '--force' in sys.argv else []
os.makedirs('audio',exist_ok=True)
async def main():
    for s in json.load(open('roteiro.json')):
        f=f"audio/{s['id']}.mp3"
        if os.path.exists(f) and s['id'] not in force: continue
        await edge_tts.Communicate(s['txt'],voice,rate='+4%',proxy=os.environ.get('HTTPS_PROXY')).save(f);print('ok',s['id'])
asyncio.run(main())
