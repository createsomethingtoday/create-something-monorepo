"""Build an editable Draw Motion study from reusable artwork; no frame-by-frame image generation."""
import json,math,base64,pathlib
from PIL import Image
OUT=pathlib.Path(__file__).resolve().parent
D=[]; BG='#090909'; INK='#f3f3f0'; MUTED='#a6aca7'; RED='#d68179'; END=18
SCENES=[
 dict(id='task',title='Start with the task.',caption='Find the document.',start=0,end=4.5,still=3.9),
 dict(id='test',title='Test beyond the happy path.',caption='The test can write, too.',start=4.5,end=9,still=7.8),
 dict(id='boundary',title='Give the agent a smaller tool.',caption='Expose only the read.',start=9,end=13.5,still=12.3),
 dict(id='verify',title='Test the boundary again.',caption='Read succeeds. Write is unavailable.',start=13.5,end=18,still=16.5),
]

def pose(t,x=0,y=0,o=1,r=1,e='hold'):
 return dict(time=t,x=x,y=y,rotation=0,scaleX=1,scaleY=1,opacity=o,reveal=r,easing=e)
def visible(a,b,x=0,y=0,reveal=False):
 ps=[]
 if a>0: ps.append(pose(0,x,y,0))
 ps += [pose(a,x,y,1 if reveal else 0,0 if reveal else 1,'ease'),pose(a+.55,x,y,1,1,'hold')]
 if b<END: ps += [pose(b-.2,x,y,1,1,'ease'),pose(b,x,y,0)]
 else: ps.append(pose(END,x,y))
 return ps

def drawing(id,kind,a,b,**kw):
 d=dict(id=id,name=id.replace('-',' '),kind=kind,space='screen',points=[],color=INK,weight=3,text='',width=1,height=1,poses=visible(a,b))
 d.update(kw);D.append(d);return d

def text(id,s,x,y,a=0,b=END,size=25,color=INK,w=1100):
 return drawing(id,'text',a,b,text=s,color=color,weight=size,width=w,height=size*1.3,poses=visible(a,b,x,y))
def line(id,pts,a=0,b=END,color=INK,weight=2.1,boil=.45):
 dense=[]
 for (x,y),(xx,yy) in zip(pts,pts[1:]):
  n=max(1,math.ceil(math.hypot(xx-x,yy-y)/10))
  dense += [dict(x=x+(xx-x)*i/n,y=y+(yy-y)*i/n) for i in range(n)]
 dense.append(dict(x=pts[-1][0],y=pts[-1][1]))
 return drawing(id,'stroke',a,b,points=dense,color=color,weight=weight,boil=dict(amplitude=boil,fps=8,seed=len(D)*17+3),poses=visible(a,b,reveal=True))
def arrow(id,pts,a=0,b=END,color=INK):
 line(id,pts,a,b,color)
 x,y=pts[-1];xx,yy=pts[-2];ang=math.atan2(y-yy,x-xx)
 line(id+'-tip',[(x-14*math.cos(ang-.4),y-14*math.sin(ang-.4)),(x,y),(x-14*math.cos(ang+.4),y-14*math.sin(ang+.4))],a+.2,b,color)

text('brand','PRIVATE   /   FIELD NOTES',64,36,size=17,color=MUTED)
text('edition','01     TOOL BOUNDARIES',925,36,size=16,color=MUTED,w=310)
line('top-rule',[(64,76),(1216,76)],weight=.7,boil=0,color='#343b35')
for scene in SCENES:
 text(scene['id'],scene['title'],64,111,scene['start'],scene['end'],48)
 text(scene['id']+'-caption',scene['caption'],64,612,scene['start'],scene['end'],34)
text('footer','ILLUSTRATIVE LESSON   /   WHITE PENCIL',64,676,size=15,color=MUTED)
text('takeaway','Teach the boundary, not just the happy path.',720,678,14.5,18,16,MUTED,500)
# Stable architecture; one actor, two recognisable tools.
text('actor-label','AGENT',168,447,size=20,color=MUTED,w=150)
arrow('read-route',[(266,378),(454,378),(580,287),(814,287)],.8)
text('read-name','read_document',833,355,.8,size=23,w=310)
# Folded paper document: hand-drawn outline and hatch marks, no UI cards.
line('document',[(850,224),(917,225),(951,257),(949,326),(849,326),(850,224)],.5)
line('document-fold',[(916,225),(916,257),(950,257)],.8)
for i,w in enumerate([50,61,40]):
 line('document-content-'+str(i),[(866,272+i*16),(866+w,272+i*16)],1+i*.16,color=MUTED,weight=1.8)
# Overbroad branch is revealed by a deliberate test.
arrow('write-route',[(454,378),(580,479),(814,479)],4.75,10.25,RED)
# The branch remains contextual, faint and severed after narrowing.
line('unavailable-route',[(699,479),(807,479)],10.25,18,'#515550',1.3)
# Pencil / write tool icon.
line('pencil',[(850,507),(862,474),(922,421),(941,442),(880,495),(850,507)],5,18,MUTED)
line('pencil-edge',[(864,474),(880,494)],5.15,18,MUTED)
line('pencil-tip',[(850,507),(865,502),(856,492)],5.3,18,MUTED)
line('pencil-inner',[(874,483),(931,432)],5.25,18,MUTED,1.2)
text('write-name','write_document',833,534,5,18,23,MUTED,310)
text('too-broad','UNNEEDED ACCESS',568,530,6.8,9,18,RED,245)
line('failure-a',[(981,453),(1007,479)],7.2,9,RED,3)
line('failure-b',[(1007,453),(981,479)],7.3,9,RED,3)
# Narrow drawn boundary surrounds only the read capability.
line('scope',[(780,213),(774,207),(772,195),(1007,194),(1019,207),(1020,387),(1010,400),(772,399),(763,389),(763,306)],9.2,18,INK,2)
text('scope-name','READ ONLY',788,418,10,18,18,INK,220)
line('closed-gate',[(644,449),(644,508)],10,18,INK,3)
text('not-exposed','NOT EXPOSED',535,547,10.5,18,17,MUTED,250)
# A second attempt visibly stops at the closed boundary before read succeeds.
arrow('blocked-attempt',[(470,391),(595,479),(626,479)],11,13.4,MUTED)
line('read-success',[(1055,280),(1068,293),(1092,258)],15.1,18,INK,3)
# One registered reusable pencil sprite. Position paths are independent of its 8 fps redraw.
asset_path=OUT/'assets/white-pencil-circle-3-frame.png'
im=Image.open(asset_path)
a=dict(id='white-pencil-sprite',name='PRIVATE White Pencil / three redraws',data='data:image/png;base64,'+base64.b64encode(asset_path.read_bytes()).decode(),width=im.width,height=im.height,provenance=dict(source='codex-imagegen',prompt='Dedicated off-white dry pencil sprite, three registered redraws, transparent gaps; see generation-prompt.md.',createdAt='2026-09-21T00:00:00Z'))
actor=drawing('agent-actor','image',0,18,width=68,height=68,assetId=a['id'],flipbook=dict(columns=3,rows=1,frames=3,fps=8,seed=0,registration='alpha'))
actor['poses']=[pose(0,166,344,0,e='ease'),pose(.5,166,344,e='hold'),pose(2,166,344,e='ease'),pose(2.9,410,344,e='ease'),pose(3.8,697,253,e='hold'),pose(4.5,697,253,e='ease'),pose(5.2,410,344,e='ease'),pose(6.4,691,445,e='hold'),pose(8,691,445,e='ease'),pose(9,166,344,e='hold'),pose(10.7,166,344,e='ease'),pose(11.5,410,344,e='ease'),pose(12.1,566,445,e='hold'),pose(12.8,566,445,e='ease'),pose(13.5,410,344,e='ease'),pose(14.8,687,253,e='hold'),pose(18,687,253)]
p=dict(version='draw.animation.v1',id='private-white-pencil-study',revision=0,title='PRIVATE / White Pencil — Teach the boundary',width=1280,height=720,duration=18,fps=24,background=BG,assets=[a],drawings=D)
(OUT/'private-white-pencil.draw.json').write_text(json.dumps(p))
print(f'{len(D)} drawings, {len(p["assets"])} reusable asset, 18 seconds')

# Captions and still extraction share the same scene timing as the animation.
def timestamp(seconds):
 ms=round(seconds*1000)
 return f'{ms//3600000:02}:{ms//60000%60:02}:{ms//1000%60:02}.{ms%1000:03}'
(OUT/'scene-times.json').write_text(json.dumps(SCENES,indent=2)+'\n')
(OUT/'captions.vtt').write_text('WEBVTT\n\n'+'\n'.join(f"{timestamp(sc['start'])} --> {timestamp(sc['end'])}\n{sc['title']} {sc['caption']}\n" for sc in SCENES))
