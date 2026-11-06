import numpy as np, wave
sr=44100;T=90.0;n=int(T*sr);t=np.arange(n)/sr;rng=np.random.default_rng(3)
BEAT=.5;BAR=2.0
L=np.zeros(n);R=np.zeros(n)
def put(buf,start,sig,g=1.0):
    i=int(start*sr)
    if i>=n:return
    m=min(len(sig),n-i);buf[i:i+m]+=sig[:m]*g
def st(start,sig,g=1.0,pan=0.0):
    put(L,start,sig,g*(1-pan)/1);put(R,start,sig,g*(1+pan)/1)
mtof=lambda m:440*2**((m-69)/12)
# Am F C G  (raízes / tríades)
PROG=[(57,[57,60,64]),(53,[53,57,60]),(48,[52,55,60]),(55,[55,59,62])]
def chord(tt):return PROG[int(tt/BAR)%4]
# envelopes de seções
def sec(tt,a,b):return a<=tt<b
# --- pad (todo o vídeo)
pad=np.zeros(n)
for k in range(int(T/BAR)+1):
    a=k*BAR;_,notes=chord(a);m=int((BAR+1.2)*sr);tt=np.arange(m)/sr
    env=np.minimum(1,tt/.6)*np.exp(-np.maximum(0,tt-BAR)*3)
    s=np.zeros(m)
    for no in notes:
        for d in(-.08,.08):
            f=mtof(no)*2**(d/12)
            for h in range(1,7):s+=np.sin(2*np.pi*f*h*tt+h*1.3)/h**1.4
    put(pad,a,s*env*.022)
# --- sidechain (pump) a partir do drop
pump=np.ones(n)
for b in np.arange(16,82,BEAT):
    if 54<=b<56:continue
    i=int(b*sr);m=int(.3*sr);m=min(m,n-i);pump[i:i+m]=np.minimum(pump[i:i+m],.35+.65*(np.arange(m)/m)**.6)
padlvl=np.interp(t,[0,3,15,16,54,55,56,80,82,88,90],[0,.8,1,1.1,1.1,1.3,1.1,1.1,1.2,1.0,0])
pad*=padlvl*pump
st(0,pad,1.0)
# --- arp pluck
def pluck(f,dur=.35,br=1.0):
    m=int(dur*sr);tt=np.arange(m)/sr;s=np.zeros(m)
    for h in range(1,9):s+=np.sin(2*np.pi*f*h*tt)/h*np.exp(-tt*(6+h*h*1.5/br))
    return s*np.minimum(1,tt/.003)
pat=[0,1,2,1,2,0,2,1]
step=BEAT/2
for k,b in enumerate(np.arange(4,82,step)):
    _,notes=chord(b);no=notes[pat[k%8]]+12+(12 if k%16==14 else 0)
    if 54<=b<56:continue
    g=.10 if b<16 else .13
    br=.5 if b<16 else 1.0+.5*np.clip((b-56)/10,0,1)
    st(b,pluck(mtof(no),br=br),g,pan=(-.35 if k%2 else .35))
# --- kick
def kick():
    m=int(.45*sr);tt=np.arange(m)/sr;f=45+110*np.exp(-tt*30);ph=2*np.pi*np.cumsum(f)/sr
    return np.sin(ph)*np.exp(-tt*7)+np.sin(2*np.pi*1800*tt)*np.exp(-tt*300)*.2
K=kick()
for b in np.arange(4,16,BAR):st(b,K,.55)            # batida cardíaca no intro
for b in np.arange(4+BEAT*1.5,16,BAR):st(b,K,.3)
for b in np.arange(16,81.9,BEAT):
    if 54<=b<56 or 79<=b<82:continue
    st(b,K,.75)
# --- clap
def clap():
    m=int(.3*sr);tt=np.arange(m)/sr;nz=rng.standard_normal(m);nz=nz-np.convolve(nz,np.ones(8)/8,'same')
    env=sum(np.exp(-np.maximum(0,tt-d)*60)*(tt>=d) for d in(0,.01,.02))*.5+np.exp(-tt*18)*.4
    return nz*env
C=clap()
for b in np.arange(16+BEAT,82,BAR/2):
    if 54<=b<56 or 79<=b<82:continue
    st(b,C,.22)
# --- hats (contratempo)
def hat(d=.05):
    m=int(d*sr);nz=rng.standard_normal(m);nz=nz-np.convolve(nz,np.ones(3)/3,'same');return nz*np.exp(-np.arange(m)/sr*70)
for k,b in enumerate(np.arange(16,82,BEAT/2)):
    if 54<=b<56 or 79<=b<82:continue
    if 74<=b<79 and k%2==0:continue
    st(b,hat(.12 if k%2 else .04),.06 if k%2 else .03,pan=.3 if k%2 else -.3)
# --- baixo (colcheias no contratempo)
for b in np.arange(16,82,BEAT/2):
    if 54<=b<56 or 79<=b<82:continue
    if (b/(BEAT/2))%2<1:continue
    root,_=chord(b);f=mtof(root-24);m=int(.22*sr);tt=np.arange(m)/sr
    s=(np.sin(2*np.pi*f*tt)+.35*np.sin(2*np.pi*2*f*tt)+.12*np.sin(2*np.pi*3*f*tt))*np.minimum(1,tt/.004)*np.exp(-tt*6)
    st(b,s,.32)
# --- lead "bell" (motivo) 64-80 e no fecho
mot=[(0,76),(1,74),(1.5,72),(2,71),(3,72),(4,69),(6,67),(6.5,69)]
def bell(f,dur=1.4):
    m=int(dur*sr);tt=np.arange(m)/sr
    return (np.sin(2*np.pi*f*tt+1.2*np.sin(2*np.pi*f*2*tt)*np.exp(-tt*4))*np.exp(-tt*2.2))*np.minimum(1,tt/.004)
for base in (64,72):
    for o,no in mot:st(base+o*BEAT*2/2*1.0*1,bell(mtof(no)),.09,pan=.15)
for o,no in [(0,69),(1,72),(2,76),(3,81)]:st(83+o*.5,bell(mtof(no),2.5),.1,pan=-.15)
# --- risers + impactos
def riser(a,b,g=.25):
    m=int((b-a)*sr);x=np.linspace(0,1,m);nz=rng.standard_normal(m)
    k=np.maximum(1,(40*(1-x)).astype(int))
    c=np.cumsum(np.insert(nz,0,0));idx=np.arange(m);lo=np.maximum(0,idx-k)
    low=(c[idx+1]-c[lo])/(idx+1-lo);s=(nz-low)*.3+low*.6
    sweep=np.sin(2*np.pi*np.cumsum(200+2200*x**2)/sr)*.15
    st(a,(s+sweep)*x**2.5,g)
def impact(a,g=1.0):
    m=int(3.5*sr);tt=np.arange(m)/sr
    boom=np.sin(2*np.pi*(38+50*np.exp(-tt*6))*tt)*np.exp(-tt*1.3)
    nz=rng.standard_normal(m);cr=(nz-np.convolve(nz,np.ones(4)/4,'same'))*np.exp(-tt*1.8)*.35
    st(a,boom*.9+cr,g)
riser(11.5,16,.3);impact(16)
riser(52,56,.22);impact(56,.6)
riser(78.5,82,.28);impact(82,.9)
# snare roll antes do drop
for k,b in enumerate(np.arange(14,16,1/8)):st(b,C[:int(.12*sr)],.05+.12*k/16)
# whooshes nas transições
for a in(8,24,30,36,42,49,62,68,74):
    m=int(1.0*sr);x=np.linspace(0,1,m);nz=rng.standard_normal(m);nz=np.convolve(nz,np.ones(6)/6,'same')
    put(L,a-.6,nz*np.sin(np.pi*x)**2*.12);put(R,a-.6,nz[::-1]*np.sin(np.pi*x)**2*.12)
# --- reverb (convolução com IR sintético)
ir_n=int(2.4*sr);irt=np.arange(ir_n)/sr
def rev(x,seed):
    ir=np.random.default_rng(seed).standard_normal(ir_n)*np.exp(-irt*2.6);ir[:int(.02*sr)]=0
    N=1<<int(np.ceil(np.log2(len(x)+ir_n)));y=np.fft.irfft(np.fft.rfft(x,N)*np.fft.rfft(ir,N),N)[:len(x)]
    return y/np.abs(ir).sum()*25
wl,wr=rev(L,1),rev(R,2);L2=L+wl*.35;R2=R+wr*.35
mast=np.interp(t,[0,.3,T-2.5,T],[0,1,1,0])
S=np.stack([L2,R2],1)*mast[:,None];S=np.tanh(S/np.abs(S).max()*1.6)/np.tanh(1.6)*.89
w=wave.open('audio/music.wav','wb');w.setnchannels(2);w.setsampwidth(2);w.setframerate(sr);w.writeframes((S*32767).astype('<i2').tobytes());w.close();print('ok')
