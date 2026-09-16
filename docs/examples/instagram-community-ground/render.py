from PIL import Image, ImageDraw, ImageFont
from pathlib import Path
out=Path(__file__).parent
font='/System/Library/Fonts/Supplemental/Arial.ttf'
bold='/System/Library/Fonts/Supplemental/Arial Bold.ttf'
mono='/Users/micahjohnson/Library/Fonts/IBMPlexMono-Regular.otf'
for n in range(1,5):
 im=Image.new('RGB',(1080,1350),'#171918'); d=ImageDraw.Draw(im)
 def t(x,y,s,z=38,c='#edece7',f=font): d.text((x,y),s,font=ImageFont.truetype(f,z),fill=c,spacing=14)
 def box(y,h=220): d.rounded_rectangle((64,y,1016,y+h),radius=18,fill='#242824',outline='#454b44',width=2)
 t(64,58,'CREATE SOMETHING / FIELD NOTE 01',25,'#d6b36b',mono)
 if n==1:
  t(64,175,'Same shape.\nDifferent rule.',94,f=bold)
  t(64,430,'Would you merge these?',43)
  for y,label,value in [(570,'RULE A','draft'),(870,'RULE B','published')]:
   box(y); t(100,y+30,label,26,'#b9bcb7',mono); t(100,y+85,'Allow editing when status is',36); t(100,y+137,value,51,'#d6b36b',mono)
 elif n==2:
  t(64,175,'One word changes\nthe behavior.',71,f=bold)
  for y,label,value in [(410,'draft.ts','draft'),(770,'published.ts','published')]:
   box(y,290); t(96,y+25,label,30,'#d6b36b',mono)
   t(96,y+86,'function canEdit(status) {',31,f=mono); t(96,y+135,'  return status ===',31,f=mono); t(96,y+184,"    '"+value+"';",36,'#d6b36b',mono); t(96,y+230,'}',31,f=mono)
 elif n==3:
  t(64,175,'Similar structure.\nOpposite result.',73,f=bold)
  t(64,420,'GROUND 0.4.3 / OBSERVED OUTPUT',27,'#b9bcb7',mono)
  t(64,490,'84.2%',100,'#d6b36b',bold); t(570,490,'100%',100,'#d6b36b',bold)
  t(64,610,'similarity',39); t(570,610,'structure',39)
  box(755,315); t(100,795,'INPUT: draft',32,'#b9bcb7',mono); t(100,885,'draft.ts       → true',34,f=mono); t(100,965,'published.ts   → false',34,f=mono)
  t(64,1120,'A teaching example, not a benchmark.',31,'#b9bcb7')
 else:
  t(64,175,'The comparison\nis evidence.',77,f=bold)
  t(64,420,'Merging is a decision.',55,'#d6b36b',bold)
  for y,a,b in [(585,'01 / Check the rule','What should each function allow?'),(755,'02 / Check the callers','Who depends on that behavior?'),(925,'03 / Test both states','Try draft and published before merging.')]:
   t(64,y,a,34,'#d6b36b',mono); t(64,y+60,b,35)
  t(64,1110,'Explore the example with Ground.',35)
 d.line((64,1240,1016,1240),fill='#454b44',width=2)
 t(64,1270,'createsomething.space',27,'#b9bcb7',mono); t(904,1270,f'{n} / 4',27,'#d6b36b',mono)
 im.save(out/f'slide-{n}.png')
