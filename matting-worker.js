importScripts('vendor/matting/ort.wasm.min.js');
ort.env.wasm.wasmPaths=new URL('vendor/matting/',self.location.href).href;
ort.env.wasm.numThreads=1;
let modelPromise;
self.onmessage=async({data})=>{
 const {id,pixels,width,height}=data;
 try{
  self.postMessage({id,stage:'loading'});
  modelPromise ||= ort.InferenceSession.create(new URL('vendor/matting/modnet.onnx',self.location.href).href,{executionProviders:['wasm'],graphOptimizationLevel:'all'}).catch(e=>{modelPromise=null;throw e});
  const model=await modelPromise;
  self.postMessage({id,stage:'processing'});
  const plane=width*height,values=new Float32Array(plane*3);
  for(let p=0;p<plane;p++)for(let ch=0;ch<3;ch++)values[ch*plane+p]=pixels[p*4+ch]/127.5-1;
  const input=new ort.Tensor('float32',values,[1,3,height,width]);
  const outputs=await model.run({[model.inputNames[0]]:input});
  const result=outputs[model.outputNames[0]],alpha=new Float32Array(result.data);
  const dims=result.dims;
  input.dispose();Object.values(outputs).forEach(t=>t.dispose());
  self.postMessage({id,alpha,width:dims[dims.length-1],height:dims[dims.length-2]},[alpha.buffer]);
 }catch(e){self.postMessage({id,error:String(e.message||e)})}
};
