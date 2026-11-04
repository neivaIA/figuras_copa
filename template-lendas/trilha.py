import sys, numpy as np
from scipy.signal import butter, sosfilt
from scipy.io import wavfile
SR=44100; DUR=float(sys.argv[1]); BPM=120; B=60/BPM
N=int(SR*DUR); out=np.zeros(N); rng=np.random.default_rng(7)
def lp(x,f): return sosfilt(butter(4,f,'low',fs=SR,output='sos'),x)
def hp(x,f): return sosfilt(butter(4,f,'high',fs=SR,output='sos'),x)
def bp(x,a,b): return sosfilt(butter(2,[a,b],'band',fs=SR,output='sos'),x)
def add(sig,t):
    i=int(t*SR); j=min(N,i+len(sig))
    if i<N: out[i:j]+=sig[:j-i]
hz=lambda m:440*2**((m-69)/12)
CH=[[57,60,64],[53,57,60],[48,52,55],[55,59,62]]   # Am F C G
bars=int(DUR/(4*B))+1
tt=np.arange(int(SR*4*B))/SR
kick_t=np.arange(int(SR*.35))/SR
kick=np.tanh(3*np.sin(2*np.pi*np.cumsum(45+110*np.exp(-kick_t*25))/SR)*np.exp(-kick_t*9))
clap=bp(rng.normal(size=int(SR*.18)),900,5000)*np.exp(-np.arange(int(SR*.18))/SR*28)
hat=hp(rng.normal(size=int(SR*.06)),7000)*np.exp(-np.arange(int(SR*.06))/SR*70)
pluck_t=np.arange(int(SR*.3))/SR
mel=[[69,72,76,72,69,76,74,72],[65,69,72,69,72,74,72,69],[67,72,76,79,76,72,74,76],[67,71,74,71,74,79,78,74]]
for b in range(bars):
    t0=b*4*B; c=CH[b%4]
    pad=sum(sum(np.sign(np.sin(2*np.pi*hz(m)*(1+d)*tt))*0+ ((tt*hz(m)*(1+d))%1*2-1) for d in (-.006,0,.006)) for m in c)
    pad=lp(pad,1400)*0.045*np.minimum(1,tt/.3)*np.minimum(1,(4*B-tt)/.2)
    add(pad,t0)
    if b==0: continue
    for k in range(4):
        add(kick*.55,t0+k*B)
        if k in (1,3): add(clap*.25,t0+k*B)
        add(hat*.08,t0+k*B+B/2)
    for k in range(8):
        bt=np.arange(int(SR*B/2*.9))/SR
        bs=lp(((bt*hz(c[0]-24))%1*2-1),420)*np.exp(-bt*4)*.22
        add(bs,t0+k*B/2)
        f=hz(mel[b%4][k]); pl=(np.sin(2*np.pi*f*pluck_t)+.4*np.sin(4*np.pi*f*pluck_t))*np.exp(-pluck_t*12)*.07
        add(pl,t0+k*B/2)
# bombeamento
ph=(np.arange(N)/SR % B)/B; out*=np.where(np.arange(N)/SR>4*B,.6+.4*np.minimum(1,ph/.35),1)
env=np.minimum(1,np.arange(N)/SR/.4)*np.minimum(1,(DUR-np.arange(N)/SR)/1.6)
out=np.tanh(out*env*1.4); out/=np.max(np.abs(out))*1.12
wavfile.write("trilha.wav",SR,(np.stack([out,out],1)*32767).astype(np.int16))
