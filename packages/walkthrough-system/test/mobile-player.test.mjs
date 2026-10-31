import test from 'node:test';
import assert from 'node:assert/strict';
import { validateManifest, chooseMedia, createMediaSwitcher } from '../player.js';
const fixture = () => ({title:'Mobile demo',source:{file:'screen.mp4',duration:10},scenes:[{id:'one',start:0,end:10,label:'Review',title:'Review',prompt:'Look at the result.',evidence:'Recorded result.'}],mobile:{file:'screen-mobile.mp4',poster:'poster-mobile.jpg',width:720,height:960,shots:[{start:0,end:10,crop:[600,800,0,0],label:'Result close-up'}]}});
test('mobile manifest rejects unsafe files, gaps, nonfinite geometry, and mismatched duration',()=>{
 for(const mutate of [m=>m.mobile.file='https://bad.example/video.mp4',m=>m.mobile.poster='../private.jpg',m=>m.mobile.width=0,m=>m.mobile.shots[0].start=1,m=>m.mobile.shots[0].end=9,m=>m.mobile.shots[0].crop=[601,800,0,0],m=>m.mobile.shots[0].crop=[600,800,NaN,0],m=>m.mobile.shots[0].label='']) {
  const m=fixture();mutate(m);assert.throws(()=>validateManifest(m));
 }
});


test('responsive media defaults to focused on phones and full on desktop; explicit choice survives resize',()=>{
 const m=fixture();
 assert.equal(chooseMedia(m,true).file,'screen-mobile.mp4');
 assert.equal(chooseMedia(m,false).file,'screen.mp4');
 assert.equal(chooseMedia(m,true,'full').poster,'poster.jpg');
 assert.equal(chooseMedia(m,false,'focused').mode,'focused');
 delete m.mobile;assert.equal(chooseMedia(m,true,'focused').mode,'full');
});

class FakeVideo extends EventTarget {
 currentTime=4; paused=false; ended=false; playbackRate=1.5; duration=10;
 pause(){this.paused=true;this.dispatchEvent(new Event('pause'));}
 play(){this.paused=false;this.dispatchEvent(new Event('play'));return Promise.resolve();}
 load(){this.currentTime=0;this.playbackRate=1;this.loads=(this.loads||0)+1;}
 metadata(){this.dispatchEvent(new Event('loadedmetadata'));}
 seeked(){this.dispatchEvent(new Event('seeked'));}
}

test('switch preserves playing position and rate; paused and ended views remain paused',async()=>{
 const v=new FakeVideo();const c=createMediaSwitcher(v);
 c.switchTo({file:'screen-mobile.mp4',poster:'poster-mobile.jpg',mode:'focused'});
 assert.equal(c.time(),4);assert.equal(v.poster,'poster-mobile.jpg');assert.equal(c.switching,true);
 v.metadata();assert.equal(v.currentTime,4);assert.equal(v.playbackRate,1.5);v.seeked();
 await Promise.resolve();assert.equal(v.paused,false);assert.equal(c.switching,false);
 v.pause();v.currentTime=7;c.switchTo({file:'screen.mp4',poster:'poster.jpg',mode:'full'});v.metadata();v.seeked();
 assert.equal(v.currentTime,7);assert.equal(v.paused,true);
 v.ended=true;v.currentTime=10;c.switchTo({file:'screen-mobile.mp4',poster:'poster-mobile.jpg',mode:'focused'});v.metadata();v.seeked();
 assert.equal(v.currentTime,10);assert.equal(v.paused,true);
});

test('rapid swaps and chapter seeks during loading restore only the latest source on one timeline',async()=>{
 const v=new FakeVideo();const c=createMediaSwitcher(v);
 c.switchTo({file:'screen-mobile.mp4',poster:'poster-mobile.jpg',mode:'focused'});
 c.switchTo({file:'screen.mp4',poster:'poster.jpg',mode:'full'});
 c.seek(8);v.metadata();v.seeked();await Promise.resolve();
 assert.equal(v.src,'screen.mp4');assert.equal(v.currentTime,8);assert.equal(v.paused,false);assert.equal(v.playbackRate,1.5);
 assert.equal(v.loads,2);assert.equal(c.mode,'full');
});

test('failed focused source retains time and recovers by selecting the full recording',async()=>{
 const v=new FakeVideo();const c=createMediaSwitcher(v);
 c.switchTo({file:'screen-mobile.mp4',poster:'poster-mobile.jpg',mode:'focused'});
 v.dispatchEvent(new Event('error'));assert.equal(c.time(),4);assert.equal(c.switching,false);
 c.switchTo({file:'screen.mp4',poster:'poster.jpg',mode:'full'});v.metadata();v.seeked();await Promise.resolve();
 assert.equal(v.currentTime,4);assert.equal(v.paused,false);
});

test('chapter seek after metadata but before seek completion preserves the latest requested time',async()=>{
 const v=new FakeVideo(); const c=createMediaSwitcher(v);
 c.switchTo({file:'screen-mobile.mp4',poster:'poster-mobile.jpg',mode:'focused'});
 v.metadata(); assert.equal(v.currentTime,4);
 c.seek(8); v.seeked(); await Promise.resolve();
 assert.equal(v.currentTime,8); assert.equal(c.time(),8);
 assert.equal(v.paused,false); assert.equal(v.playbackRate,1.5);
});

test('explicit retry reloads the failed source, retains timeline and rate, and does not duplicate an active load',async()=>{
 const v=new FakeVideo(); const c=createMediaSwitcher(v);
 c.switchTo({file:'screen-mobile.mp4',poster:'poster-mobile.jpg',mode:'focused'});
 v.dispatchEvent(new Event('error'));
 c.retry(); c.retry(); assert.equal(v.loads,2); assert.equal(c.time(),4);
 v.dispatchEvent(new Event('error')); c.seek(8); c.retry();
 assert.equal(v.loads,3); v.metadata(); v.seeked(); await Promise.resolve();
 assert.equal(v.currentTime,8); assert.equal(v.playbackRate,1.5); assert.equal(v.paused,false);
});

test('an obsolete seeked event cannot finish a newer chapter seek',()=>{
 const v=new FakeVideo(); const c=createMediaSwitcher(v);
 c.switchTo({file:'screen-mobile.mp4',poster:'poster-mobile.jpg',mode:'focused'});
 v.metadata(); c.seek(8);
 v.seeking=true; v.seeked(); assert.equal(c.switching,true); assert.equal(c.time(),8);
 v.seeking=false; v.seeked(); assert.equal(c.switching,false); assert.equal(v.currentTime,8);
});

test('retry preserves a paused viewer and their selected chapter after failure',()=>{
 const v=new FakeVideo(); v.paused=true; const c=createMediaSwitcher(v);
 c.switchTo({file:'screen.mp4',poster:'poster.jpg',mode:'full'});
 v.dispatchEvent(new Event('error')); c.seek(9); c.retry(); v.metadata(); v.seeked();
 assert.equal(v.currentTime,9); assert.equal(v.paused,true); assert.equal(v.playbackRate,1.5);
});
