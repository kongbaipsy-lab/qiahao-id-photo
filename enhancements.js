// MODNet portrait matting runs locally in a worker. No image is uploaded.
function syncBg(){document.querySelectorAll('[data-bg]').forEach(b=>{b.classList.toggle('active',b.dataset.bg===bg);b.setAttribute('aria-pressed',b.dataset.bg===bg?'true':'false')})}
function setBg(color){bg=color;syncBg();if(original){orient();draw();changed()}$('bgStatus').textContent=bg==='original'?'正在使用原图背景。':cutout?'底色已应用，请检查头发和肩部边缘。':'已选择底色，请点击下方按钮识别人像。'}
document.querySelectorAll('[data-bg]').forEach(b=>b.onclick=()=>setBg(b.dataset.bg));$('bgColor').oninput=()=>setBg($('bgColor').value);
let matteWorker=null,matteJob=0,matteCache=null;
function resetMatting(){matteCache=null;$('edge').value='0';$('edge').disabled=true;$('edgeValue').textContent='自然';}
function requestMatte(photo){return new Promise((resolve,reject)=>{
 const scale=Math.min(512/Math.min(photo.width,photo.height),1024/Math.max(photo.width,photo.height));
 const w=Math.max(32,Math.round(photo.width*scale/32)*32),h=Math.max(32,Math.round(photo.height*scale/32)*32);
 const input=document.createElement('canvas');input.width=w;input.height=h;
 const x=input.getContext('2d');x.drawImage(photo,0,0,w,h);const pixels=x.getImageData(0,0,w,h).data;
 if(!matteWorker)matteWorker=new Worker('matting-worker.js?v=2');
 const worker=matteWorker,id=++matteJob;
 const timer=setTimeout(()=>{worker.terminate();matteWorker=null;reject(Error('处理超时，请重试或缩小原图。'))},120000);
 worker.onerror=()=>{clearTimeout(timer);worker.terminate();matteWorker=null;reject(Error('无法运行抠图，请使用新版浏览器重试。'))};
 worker.onmessage=({data})=>{if(data.id!==id)return;if(data.stage){if(original===photo)$('bgStatus').textContent=data.stage==='loading'?'正在加载精细人像模型（首次约 37 MB），照片不会上传。':'正在精细处理发丝和衣服边缘…';return}clearTimeout(timer);if(data.error){reject(Error(data.error));return}resolve(data)};
 worker.postMessage({id,pixels,width:w,height:h},[pixels.buffer]);
})}
function renderMatte(){if(!matteCache||matteCache.photo!==original)return;
 const {photo,mask}=matteCache,c=document.createElement('canvas');c.width=photo.width;c.height=photo.height;
 const x=c.getContext('2d',{willReadFrequently:true});x.imageSmoothingEnabled=true;x.imageSmoothingQuality='high';x.drawImage(mask,0,0,c.width,c.height);
 const image=x.getImageData(0,0,c.width,c.height),offset=+$('edge').value/100;
 for(let p=0;p<image.data.length;p+=4){let a=image.data[p+3]/255;
 // Keep the opaque interior and transparent background unchanged. Only adjust transition pixels.
 if(offset>0)a=Math.max(0,(a-offset)/(1-offset));else if(offset<0)a=Math.min(1,a/(1+offset));
 image.data[p+3]=Math.round(a*255);}
 x.putImageData(image,0,0);x.globalCompositeOperation='source-in';x.drawImage(photo,0,0);cutout=c;orient();draw();changed();
}
$('edge').oninput=()=>{$('edgeValue').textContent=+$('edge').value===0?'自然':+$('edge').value>0?'去残边 '+$('edge').value:'保细节 '+Math.abs(+$('edge').value);renderMatte()};
$('removeBG').onclick=async()=>{if(!original||segmenting)return;if(bg==='original')setBg('#ffffff');if(cutout){orient();draw();changed();return}
 const photo=original;segmenting=true;$('removeBG').disabled=true;$('removeBG').textContent='正在精细抠图…';
 try{const result=await requestMatte(photo);if(original!==photo)return;
 const mask=document.createElement('canvas');mask.width=result.width;mask.height=result.height;const x=mask.getContext('2d'),pixels=x.createImageData(mask.width,mask.height);
 for(let i=0;i<result.alpha.length;i++){pixels.data[i*4]=pixels.data[i*4+1]=pixels.data[i*4+2]=255;pixels.data[i*4+3]=Math.round(Math.max(0,Math.min(1,result.alpha[i]))*255)}
 x.putImageData(pixels,0,0);matteCache={photo,mask};$('edge').disabled=false;renderMatte();$('bgStatus').textContent='精细抠图已完成。可用下方微调减少残边，或保留更多发丝。';
 }catch(e){if(original===photo){setBg('original');$('bgStatus').textContent='精细抠图未完成，请重试。已保留原图，不会自动使用低精度结果。';message('抠图未完成；原图仍可调整尺寸和下载。',true)}}
 finally{segmenting=false;$('removeBG').disabled=!original;$('removeBG').textContent='精细抠图并应用底色'}
};
$('domestic').onchange=()=>{if(!$('domestic').value)return;const [w,h,d]=$('domestic').value.split(',');$('width').value=w;$('height').value=h;$('dpi').value=d;updateSize();$('sizeHint').textContent='此预设仅设置尺寸。背景、头部比例及回执要求请核对接收单位规定。';};
$('dpi').onchange=changed;
$('applyMM').onclick=()=>{const w=+$('mmW').value,h=+$('mmH').value,d=+$('dpi').value;const pxW=Math.round(w*d/25.4),pxH=Math.round(h*d/25.4);if(!Number.isFinite(w)||!Number.isFinite(h)||w<=0||h<=0||pxW<16||pxH<16||pxW>6000||pxH>6000||pxW*pxH>16000000){message('毫米尺寸换算后超出范围，请调整尺寸或 DPI。',true);return}$('width').value=pxW;$('height').value=pxH;updateSize();$('sizeHint').textContent=w+' × '+h+' mm · '+d+' DPI → '+pxW+' × '+pxH+' px';};
function crc32(bytes){let crc=0xffffffff;for(const byte of bytes){crc^=byte;for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0)}return (crc^0xffffffff)>>>0}
async function withDPI(b,dpi){const bytes=new Uint8Array(await b.arrayBuffer());if(b.type==='image/jpeg'){// JFIF density uses pixels per inch; preserve image data.
for(let i=2;i<bytes.length-16;){if(bytes[i]!==255)break;const marker=bytes[i+1];if(marker===0xda||marker===0xd9)break;const len=(bytes[i+2]<<8)|bytes[i+3];if(marker===0xe0&&bytes[i+4]===74&&bytes[i+5]===70&&bytes[i+6]===73&&bytes[i+7]===70){bytes[i+11]=1;bytes[i+12]=dpi>>8;bytes[i+13]=dpi&255;bytes[i+14]=dpi>>8;bytes[i+15]=dpi&255;return new Blob([bytes],{type:b.type})}if(len<2)break;i+=2+len}
const jfif=new Uint8Array([255,224,0,16,74,70,73,70,0,1,1,1,dpi>>8,dpi&255,dpi>>8,dpi&255,0,0]);return new Blob([bytes.slice(0,2),jfif,bytes.slice(2)],{type:b.type})}
if(b.type==='image/png'){const chunk=new Uint8Array(21),view=new DataView(chunk.buffer);view.setUint32(0,9);chunk.set([112,72,89,115],4);const ppm=Math.round(dpi/0.0254);view.setUint32(8,ppm);view.setUint32(12,ppm);chunk[16]=1;view.setUint32(17,crc32(chunk.slice(4,17)));const parts=[bytes.slice(0,8)],v=new DataView(bytes.buffer);let p=8,added=false;while(p+12<=bytes.length){const len=v.getUint32(p),type=String.fromCharCode(...bytes.slice(p+4,p+8));if(type!=='pHYs')parts.push(bytes.slice(p,p+len+12));if(type==='IHDR'&&!added){parts.push(chunk);added=true}p+=len+12}return new Blob(parts,{type:b.type})}return b}
