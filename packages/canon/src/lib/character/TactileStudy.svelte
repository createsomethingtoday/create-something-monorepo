<script lang="ts">
  /** Read-only comparison frame, including unsupported diagnostic sizes. */
  let { size = 96, revision = 'r42' }: { size?:64 | 96; revision?:'r11' | 'r12' | 'r34' | 'r42' } = $props();
  const assets = {
    r11: {url:'tactile-head-optical-prototype.png',width:1322,height:1190,top:47,center:656.5,extent:1061,visibleHeight:1061},
    r12: {url:'tactile-head-quiet-oval-prototype.png',width:1323,height:1189,top:48,center:657.5,extent:1061,visibleHeight:1061},
    r34: {url:'tactile-head-filled-oval-prototype.png',width:1448,height:1086,top:43,center:722.5,extent:1062,visibleHeight:1012},
    r42: {url:'approved-v1/head-r42.webp',width:1254,height:1254,top:131,center:622.5,extent:912,visibleHeight:912}
  } as const;
  const asset = $derived(assets[revision]);
  const scale = $derived(size / asset.extent);
</script>
<span class="art-frame" aria-hidden="true" style:width={`${size}px`} style:height={`${size}px`}>
  <img src={`/canon-next/${asset.url}`} alt="" width={asset.width} height={asset.height}
    style:width={`${asset.width * scale}px`} style:height={`${asset.height * scale}px`}
    style:top={`${(size - asset.visibleHeight * scale) / 2 - asset.top * scale}px`} style:left={`${size / 2 - asset.center * scale}px`} />
</span>
<style>.art-frame { position:relative; display:block; overflow:hidden; flex-shrink:0; } img { position:absolute; display:block; max-width:none; }</style>
