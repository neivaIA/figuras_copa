# uso: python3 montar.py <prefixo_voz>   (ex.: ko-pm_alex)  — usa midia/<voz>_nX.wav
import json, os, re, subprocess, sys
VOZ = sys.argv[1]
R = json.load(open("roteiro.json")); os.makedirs("trat", exist_ok=True); os.makedirs("cenas", exist_ok=True)
ESC = json.load(open("escolha_manual.json")); TEMPO = json.load(open("tempo.json")) if os.path.exists("tempo.json") else {}
FX = ("silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse,"
      "highpass=f=80,equalizer=f=280:t=q:w=1.2:g=-2.5,equalizer=f=3200:t=q:w=1.5:g=2,deesser=i=0.4,"
      "acompressor=threshold=0.1:ratio=2.5:attack=8:release=120,aecho=0.85:0.5:18|31:0.07|0.04,"
      "afade=t=in:d=0.01,areverse,afade=t=in:d=0.04,areverse,aresample=44100")
def dur(f): return float(subprocess.check_output(["ffprobe","-v","error","-show_entries","format=duration","-of","csv=p=0",f]))
D = {}
for r in R:
    o = f"trat/{r['id']}.wav"
    pre = f"rubberband=tempo={TEMPO[r['id']]}," if r["id"] in TEMPO else ""
    pre += "silenceremove=stop_periods=-1:stop_duration=0.45:stop_threshold=-42dB,"
    subprocess.run(["ffmpeg","-y","-v","error","-i",f"tomadas/{VOZ}_{r['id']}_{ESC[r['id']]}.wav","-af",pre+FX,"-ac","1",o], check=True)
    D[r["id"]] = dur(o)
GAP = {"virgula":0.22,"ponto":0.35,"pergunta":0.5}
TL = {}; t = 0.5
for r in R:
    k = r["id"]
    prev = {"n3":("n2",0.5),"n9":("n8",0.5),"n11":("n10",0.5),"n13":("n12",0.6)}
    if k in prev: p, h = prev[k]; t = max(t, TL[p] + D[p] + h)
    TL[k] = round(t, 3); t += D[k] + GAP[r["fim"]]
# marcas por palavra (faster-whisper não roda aqui; frações medidas na fala)
for k, base, fr in [("n2b","n2",.45),("n4b","n4",.62),("n5m","n5",.9),("n7b","n7",.6),("n11a","n11",.35),("n11b","n11",.6),("n11c","n11",.82),("n12b","n12",.6)]:
    TL[k] = round(TL[base] + D[base]*fr, 3)
TL["fim"] = round(TL["n13"] + D["n13"] + 1.4, 3)
json.dump(TL, open("anim/tl.json","w"), indent=1); json.dump(D, open("trat/dur.json","w"), indent=1)
print(TL)

# ---------- legendas ASS ----------
def ts(x): h=int(x//3600); m=int(x%3600//60); s=x%60; return f"{h}:{m:02d}:{s:05.2f}"
def partes(txt):
    w = txt.split(); out=[]; cur=""
    for p in w:
        if len(cur)+len(p)+1 > 30 and cur: out.append(cur); cur=p
        else: cur = (cur+" "+p).strip()
    out.append(cur)
    if len(out) > 1 and len(out[-1]) < 12: last = out.pop(); out[-1] += " " + last
    return out
ev = []
for r in R:
    a, d = TL[r["id"]], D[r["id"]]; ps = partes(r["leg"]); tot = sum(len(p) for p in ps); acc = a
    for i, p in enumerate(ps):
        e = acc + d * len(p) / tot
        ev.append([acc, e + (0.15 if i == len(ps)-1 else 0), p]); acc = e
for i in range(len(ev)-1): ev[i][1] = min(ev[i][1], ev[i+1][0])
assert all(ev[i][1] <= ev[i+1][0] + 1e-6 for i in range(len(ev)-1))
hdr = """[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: L,Inter,56,&H00FFFFFF,&H00FFFFFF,&H00150F0B,&H00150F0B,-1,0,0,0,100,100,0,0,3,16,0,2,60,60,150,1
[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
with open("legendas.ass","w") as f:
    f.write(hdr)
    for a,b,p in ev: f.write(f"Dialogue: 0,{ts(a)},{ts(b)},L,,0,0,0,,{p}\n")

# ---------- render por cena ----------
from playwright.sync_api import sync_playwright
cuts = [0, TL["n3"]-0.1, TL["n9"]-0.1, TL["n11"]-0.1, TL["n13"]-0.1, TL["fim"]]
FPS = 30
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={"width":1080,"height":1920})
    pg.goto("file://" + os.path.abspath("anim/index.html")); pg.evaluate("o=>setTL(o)", TL)
    for i in range(5):
        f0, f1 = round(cuts[i]*FPS), round(cuts[i+1]*FPS)
        out = f"cenas/c{i+1}.mp4"; tmp = f"cenas/tmp_c{i+1}.mp4"
        ff = subprocess.Popen(["ffmpeg","-y","-v","error","-f","image2pipe","-framerate","30","-c:v","mjpeg","-i","-",
              "-c:v","libx264","-crf","18","-preset","veryfast","-pix_fmt","yuv420p","-r","30",tmp], stdin=subprocess.PIPE)
        for fr in range(f0, f1):
            pg.evaluate("t => render(t)", fr/FPS); ff.stdin.write(pg.screenshot(type="jpeg", quality=92))
        ff.stdin.close(); assert ff.wait() == 0; os.replace(tmp, out); print("cena", i+1, "ok", flush=True)
    b.close()
open("cenas/lista.txt","w").write("".join(f"file 'c{i}.mp4'\n" for i in range(1,6)))
subprocess.run(["ffmpeg","-y","-v","error","-f","concat","-safe","0","-i","cenas/lista.txt","-c","copy","cenas/video.mp4"], check=True)

# ---------- mixagem ----------
TOTAL = TL["fim"]
subprocess.run(["python3","trilha.py",str(TOTAL)], check=True)
ins = []; fc = []
for j, r in enumerate(R):
    ins += ["-i", f"trat/{r['id']}.wav"]; ms = int(TL[r["id"]]*1000)
    fc.append(f"[{j+1}:a]adelay={ms}|{ms},apad[v{j}]")
n = len(R)
fc.append("".join(f"[v{j}]" for j in range(n)) + f"amix=inputs={n}:normalize=0,atrim=0:{TOTAL},volume=1.6,asplit[voz][sc];"
          f"[{n+1}:a]volume=0.19,aformat=channel_layouts=mono[tr];[tr][sc]sidechaincompress=threshold=0.02:ratio=8:attack=15:release=350[trd];"
          "[voz][trd]amix=inputs=2:normalize=0,loudnorm=I=-15:TP=-1.5:LRA=9,aresample=44100[a]")
subprocess.run(["ffmpeg","-y","-v","error","-i","cenas/video.mp4",*ins,"-i","trilha.wav","-filter_complex",";".join(fc),
    "-map","0:v","-map","[a]","-vf","ass=legendas.ass","-c:v","libx264","-crf","18","-preset","veryfast","-pix_fmt","yuv420p",
    "-c:a","aac","-b:a","192k","-t",str(TOTAL),"-movflags","+faststart","neymar_reel.mp4"], check=True)
print("pronto")
