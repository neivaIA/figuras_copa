# Roda no GitHub Actions: gera tomadas (Kokoro + Chatterbox) e escolhe a melhor por frase.
import json, os, re, subprocess, sys, unicodedata, shutil
import numpy as np, soundfile as sf

R = json.load(open("roteiro.json"))
os.makedirs("tomadas", exist_ok=True); os.makedirs("midia", exist_ok=True)
ENG = sys.argv[1] if len(sys.argv) > 1 else "all"
SEEDS = [int(x) for x in ENG.split(":")[1].split(",")] if ENG.startswith("cb:") else (11, 22, 33)
if ENG.startswith("cb:"): ENG = "cb"

def gen_kokoro():
    from kokoro import KPipeline
    p = KPipeline(lang_code="p")
    for voz in ("pm_alex", "pf_dora"):
        for r in R:
            for sp in (1.0, 1.05):
                a = [np.asarray(x[2]) for x in p(r["fala"], voice=voz, speed=sp)]
                sf.write(f"tomadas/ko-{voz}_{r['id']}_{sp}.wav", np.concatenate(a), 24000)
        print("kokoro ok", voz, flush=True)

def gen_cb():
    import torch, torchaudio as ta
    from chatterbox.mtl_tts import ChatterboxMultilingualTTS
    m = ChatterboxMultilingualTTS.from_pretrained(device="cpu")
    for r in R:
        for s in SEEDS:
            torch.manual_seed(s)
            kw = {"audio_prompt_path": "referencia.wav"} if os.path.exists("referencia.wav") else {}
            w = m.generate(r["fala"], language_id="pt", exaggeration=0.6, cfg_weight=0.3, temperature=0.8, **kw)
            ta.save(f"tomadas/cb-ref_{r['id']}_s{s}.wav", w, m.sr)
        print("cb ok", r["id"], flush=True)

if ENG in ("kokoro", "all"): gen_kokoro()
if ENG in ("cb", "all"):
    try: gen_cb()
    except Exception as e: print("chatterbox falhou:", e)
if ENG != "select": sys.exit(0)

# ---------------- seleção ----------------
from faster_whisper import WhisperModel
from num2words import num2words
import librosa
W = WhisperModel("base", device="cpu", compute_type="int8")

def norm(s):
    s = s.lower().replace("€", " euros ").replace("%", " por cento ")
    s = re.sub(r"\d+", lambda m: " " + num2words(int(m.group()), lang="pt_BR") + " ", s)
    s = s.replace("pê ésse gê", "psg").replace("p s g", "psg").replace("tchampions", "champions")
    s = unicodedata.normalize("NFD", s); s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    s = re.sub(r"[^a-z ]", " ", s)
    return [w for w in s.split() if w != "e"]

def wer(a, b):
    d = list(range(len(b) + 1))
    for i, x in enumerate(a, 1):
        p, d[0] = d[0], i
        for j, y in enumerate(b, 1):
            p, d[j] = d[j], min(d[j] + 1, d[j-1] + 1, p + (x != y))
    return d[-1] / max(1, len(a))

def trim(src, dst):
    subprocess.run(["ffmpeg","-y","-v","error","-i",src,"-af",
        "silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse",
        dst], check=True)

def maxpause(f):
    o = subprocess.run(["ffmpeg","-i",f,"-af","silencedetect=n=-40dB:d=0.5","-f","null","-"],capture_output=True,text=True).stderr
    return max([float(x) for x in re.findall(r"silence_duration: ([\d.]+)", o)] or [0])

KEY = set(w for r in R for w in norm(r["fala"]) if w in {"um","sete","cinco","oitenta","setenta","dezoito","cento","cinquenta","quatrocentos","duzentos","vinte","dois","mil","quinze","dezesseis","santos","barcelona","psg","paris","hilal","pele","fifa","libertadores","champions","olimpico","mundial","copa","futebolizacao"})
res = {}
for f in sorted(x for x in os.listdir("tomadas") if x.endswith(".wav")):
    voz, fid, var = f[:-4].rsplit("_", 2)
    r = next(x for x in R if x["id"] == fid)
    t = f"/tmp/t_{f}"; trim(f"tomadas/{f}", t)
    y, sr = librosa.load(t, sr=16000); dur = len(y) / sr
    segs, _ = W.transcribe(t, language="pt", beam_size=5)
    hyp = " ".join(s.text for s in segs)
    e = wer(norm(r["fala"]), norm(hyp))
    cps = len(r["fala"]) / dur
    f0, vf, _ = librosa.pyin(y, fmin=70, fmax=400, sr=sr)
    f0 = f0[vf & ~np.isnan(f0)]
    var_st = float(np.std(12 * np.log2(f0 / np.median(f0)))) if len(f0) > 10 else 0.0
    mp = maxpause(t)
    lim = 0.95 if ("..." in r["fala"] or r["fala"].count("?") + r["fala"].count("!") + r["fala"].count(".") > 1) else 0.6
    nh = set(norm(hyp)); chaves = [w for w in norm(r["leg"]) if len(w) > 3 and w[0] in "abcdefghijklmnopqrstuvwxyz"]
    faltam = [w for w in norm(r["fala"]) if w in KEY and w not in nh]
    cmin = 9 if len(r["fala"]) < 40 else 11
    ok = e <= 0.10 and cmin <= cps <= 17.5 and mp <= lim and not faltam
    res.setdefault(voz, {}).setdefault(fid, []).append(dict(arquivo=f, erro=round(e,3), cps=round(cps,2),
        f0_semitons=round(var_st,2), pausa_max=round(mp,2), ok=ok, transcricao=hyp.strip()))
    print(voz, fid, var, ok, round(e,2), round(cps,1), round(var_st,2), mp, hyp, flush=True)

resumo = {}
for voz, fr in res.items():
    win, passa, f0s = {}, 0, []
    for fid, ts in fr.items():
        boas = [x for x in ts if x["ok"]]
        best = max(boas, key=lambda x: x["f0_semitons"]) if boas else min(ts, key=lambda x: x["erro"])
        win[fid] = best; passa += bool(boas); f0s.append(best["f0_semitons"])
    resumo[voz] = dict(passam=passa, total=len(fr), f0_medio=round(float(np.mean(f0s)),2), escolhidas=win)
json.dump(dict(resumo=resumo, todas=res), open(f"tomadas/selecao_{os.getpid()}.json","w"), ensure_ascii=False, indent=1)
print(json.dumps({k:(v["passam"],v["total"],v["f0_medio"]) for k,v in resumo.items()}))
