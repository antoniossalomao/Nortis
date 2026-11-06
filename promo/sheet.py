import sys
from PIL import Image
ts=sys.argv[1:];W,H=360,640;c=6;im=Image.new('RGB',(W*c,H*((len(ts)+c-1)//c)))
for i,t in enumerate(ts):im.paste(Image.open(f'build/p_{t}.jpg').resize((W,H)),((i%c)*W,(i//c)*H))
im.save('build/sheet.jpg')
