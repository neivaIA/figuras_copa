import asyncio, json, os, subprocess, re, unicodedata
import edge_tts
R = json.load(open("roteiro.json")); os.makedirs("tomadas", exist_ok=True)
def falar(r):
    t = r["fala"].replace("pê ésse gê", "PSG")
    vs = [t]
    if "Tchampions" in t: vs.append(t.replace("Tchampions", "Champions"))
    return vs
async def main():
    for r in R:
        for vi, txt in enumerate(falar(r)):
            for rate in ("+0%", "+8%"):
                f = f"tomadas/antonio_{r['id']}_v{vi}r{rate.strip('+%')}"
                c = edge_tts.Communicate(txt, "pt-BR-AntonioNeural", rate=rate)
                await c.save(f + ".mp3")
                subprocess.run(["ffmpeg","-y","-v","error","-i",f+".mp3","-ar","24000","-ac","1",f+".wav"], check=True); os.remove(f+".mp3")
        print("ok", r["id"], flush=True)
asyncio.run(main())
