# Read-only source parsing: no piece-specific onset matching or time truncation.
from pathlib import Path
import argparse,zipfile,xml.etree.ElementTree as ET,struct,json
p=argparse.ArgumentParser()
p.add_argument('mxl',type=Path);p.add_argument('midi',type=Path);p.add_argument('output',type=Path)
args=p.parse_args();mxl=args.mxl;midi=args.midi;OUT=args.output
OUT.mkdir(parents=True,exist_ok=True)
with zipfile.ZipFile(mxl) as z:
 c=ET.fromstring(z.read('META-INF/container.xml'))
 f=next(e.attrib['full-path'] for e in c.iter() if e.tag.endswith('rootfile'))
 xml=ET.fromstring(z.read(f))
assert len(xml.findall('part'))==1, 'This helper supports one piano part only; multi-part scores require explicit adaptation.'
notes=[]; measures=[]; tempi=[]; div=1; base=0
for part in xml.findall('part'):
 base=0
 for mi,measure in enumerate(part.findall('measure')):
  cursor=0; end=0; last=0
  for ni,e in enumerate(measure):
   if e.tag=='attributes': div=int(e.findtext('divisions',str(div)))
   if e.tag=='direction':
    s=e.find('sound')
    if s is not None and 'tempo' in s.attrib: tempi.append({'beat':base+cursor,'bpm':float(s.attrib['tempo'])})
   if e.tag in ('backup','forward'): cursor+=(-1 if e.tag=='backup' else 1)*int(e.findtext('duration'))/div
   if e.tag=='note':
    dur=int(e.findtext('duration','0'))/div; onset=last if e.find('chord') is not None else cursor
    uid=f'm{mi+1}n{ni}';e.set('id',uid)
    p=e.find('pitch'); ties=[x.attrib['type'] for x in e.findall('tie')]
    note={'id':uid,'measure':mi+1,'beat':base+onset,'durationBeats':dur,'staff':int(e.findtext('staff','1')),'voice':e.findtext('voice','1'),'type':e.findtext('type'),'ties':ties,'rest':p is None,'grace':e.find('grace') is not None,'trill':e.find('.//trill-mark') is not None,'defaultX':e.get('default-x'),'defaultY':e.get('default-y')}
    if p is not None:
     note['pitch']=12*(int(p.findtext('octave'))+1)+{'C':0,'D':2,'E':4,'F':5,'G':7,'A':9,'B':11}[p.findtext('step')]+int(p.findtext('alter','0'))
    notes.append(note)
    if e.find('chord') is None: last=cursor;cursor+=dur
    end=max(end,cursor)
  measures.append({'number':measure.get('number'),'beat':base,'durationBeats':end,'newSystem':measure.find('print') is not None and measure.find('print').get('new-system')=='yes','newPage':measure.find('print') is not None and measure.find('print').get('new-page')=='yes'})
  base+=end
# Full source preserved with stable IDs; engrave exports every page.
ET.indent(xml); ET.ElementTree(xml).write(OUT/'identified.musicxml',encoding='utf-8',xml_declaration=True)
b=midi.read_bytes(); fmt,ntracks,ppq=struct.unpack('>HHH',b[8:14]);assert fmt in (0,1) and not ppq&0x8000,'Unsupported SMF timing/format';off=8+int.from_bytes(b[4:8],'big'); events=[]; tempos=[(0,500000)]; tracks=[]
def vlq(data,pos):
 n=0
 while True:
  v=data[pos];pos+=1;n=(n<<7)|(v&127)
  if v<128:return n,pos
for ti in range(ntracks):
 assert b[off:off+4]==b'MTrk';size=int.from_bytes(b[off+4:off+8],'big');d=b[off+8:off+8+size];off+=8+size;p=0;tick=0;running=None;active={};name='';count=0
 while p<len(d):
  delta,p=vlq(d,p);tick+=delta;status=d[p]
  if status<128: status=running
  else:p+=1
  if status==255:
   typ=d[p];p+=1;ln,p=vlq(d,p);data=d[p:p+ln];p+=ln
   if typ==81:tempos.append((tick,int.from_bytes(data,'big')))
   if typ==3:name=data.decode(errors='replace')
   continue
  if status in (240,247): ln,p=vlq(d,p);p+=ln;continue
  running=status;kind=status>>4;channel=status&15;v1=d[p];p+=1;v2=0
  if kind not in (12,13):v2=d[p];p+=1
  key=(channel,v1)
  if kind==9 and v2:
   active.setdefault(key,[]).append((tick,v2));count+=1
  elif kind==8 or kind==9:
   if active.get(key):
    start,vel=active[key].pop(0);events.append({'tick':start,'endTick':tick,'pitch':v1,'velocity':vel,'channel':channel,'track':ti})
 tracks.append({'track':ti,'name':name,'noteOns':count,'unclosed':len([v for v in active.values() if v])})
tempos=sorted(dict(tempos).items())
def sec(tick):
 total=0;last=0;tempo=500000
 for t,us in tempos:
  if t>tick:break
  total+=(t-last)/ppq*tempo/1e6;last=t;tempo=us
 return total+(tick-last)/ppq*tempo/1e6
for e in events:e.update(time=sec(e['tick']),duration=sec(e['endTick'])-sec(e['tick']),beat=e['tick']/ppq)
events.sort(key=lambda e:(e['tick'],e['pitch']))

result={'midi':{'format':fmt,'ppq':ppq,'tracks':tracks,'tempoMap':[{'tick':t,'bpm':60e6/u,'time':sec(t)} for t,u in tempos],'events':events},'score':{'measures':measures,'tempi':tempi,'notes':notes}}
(OUT/'music-analysis.json').write_text(json.dumps(result,indent=2))
print('Parsed',len(notes),'score records and',len(events),'MIDI events. No mapping assumed.')
