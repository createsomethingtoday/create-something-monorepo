<script lang="ts">
 import {backgroundImage,type CanonBackgroundScene} from './scene.js';
 let {scene}: {scene:CanonBackgroundScene}=$props();
</script>
<div class="canon-background-scene" role={scene.description?'img':undefined} aria-label={scene.description||undefined} aria-hidden={scene.description?undefined:'true'}
 style:--scene-image={backgroundImage(scene.src)} style:--scene-mobile-image={backgroundImage(scene.mobileSrc??scene.src)}
 style:--scene-position={scene.position??'center'} style:--scene-mobile-position={scene.mobilePosition??scene.position??'center'}
 style:--scene-size={scene.size??'contain'} style:--scene-mobile-size={scene.mobileSize??scene.size??'contain'}></div>
<style>
 .canon-background-scene{position:absolute;inset:0;z-index:0;pointer-events:none;background-image:var(--scene-image);background-position:var(--scene-position);background-size:var(--scene-size);background-repeat:no-repeat}
 @media(max-width:47.99rem){.canon-background-scene{background-image:var(--scene-mobile-image);background-position:var(--scene-mobile-position);background-size:var(--scene-mobile-size)}}
</style>
