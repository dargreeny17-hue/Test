import json,sys
from PIL import Image, ImageDraw
root, shots, out = sys.argv[1:4]
start = int(sys.argv[4]) if len(sys.argv) > 4 else 0
count = int(sys.argv[5]) if len(sys.argv) > 5 else 999
order = json.load(open(f'{root}/project/deck.json'))['order'][start:start+count]
cols = 3; w, h = 640, 360; pad = 8
rows = (len(order)+cols-1)//cols
im = Image.new('RGB', (cols*(w+pad)+pad, rows*(h+pad+22)+pad), '#777')
d = ImageDraw.Draw(im)
for i, sid in enumerate(order):
    t = Image.open(f'{shots}/{sid}.png').convert('RGB').resize((w, h))
    x = pad + (i%cols)*(w+pad); y = pad + (i//cols)*(h+pad+22)
    im.paste(t, (x, y+22)); d.text((x+4, y+4), f'{start+i+1}. {sid}', fill='white')
im.save(out); print(out, im.size)
