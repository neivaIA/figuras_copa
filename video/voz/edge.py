import asyncio, json, os, subprocess
import edge_tts
R = json.load(open("roteiro.json")); os.makedirs("tomadas", exist_ok=True)
async def gerar(txt, base, rate):
    c = edge_tts.Communicate(txt, "pt-BR-AntonioNeural", rate=rate, boundary="WordBoundary")
    pal = []
    with open(base + ".mp3", "wb") as f:
        async for ch in c.stream():
            if ch["type"] == "audio": f.write(ch["data"])
            elif ch["type"] == "WordBoundary":
                pal.append({"w": ch["text"], "ini": ch["offset"]/1e7, "fim": (ch["offset"]+ch["duration"])/1e7})
    json.dump(pal, open(base + ".json", "w"), ensure_ascii=False)
    subprocess.run(["ffmpeg","-y","-v","error","-i",base+".mp3","-ar","24000","-ac","1",base+".wav"], check=True); os.remove(base+".mp3")
async def main():
    for r in R:
        for rate in ("+0%", "+8%"):
            await gerar(r["fala"], f"tomadas/antonio_{r['id']}_r{rate.strip('+%')}", rate)
        print("ok", r["id"], flush=True)
asyncio.run(main())
