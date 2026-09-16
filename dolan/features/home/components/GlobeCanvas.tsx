"use client";
import { useEffect,useRef } from "react";

const vertex=`attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}`;
const fragment=`precision highp float;uniform float time,speed;uniform vec2 res;uniform sampler2D earth;
float h(vec3 p){p=fract(p*.3183+vec3(.1,.2,.3));p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
float n(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(h(i),h(i+vec3(1,0,0)),f.x),mix(h(i+vec3(0,1,0)),h(i+vec3(1,1,0)),f.x),f.y),mix(mix(h(i+vec3(0,0,1)),h(i+vec3(1,0,1)),f.x),mix(h(i+vec3(0,1,1)),h(i+vec3(1)),f.x),f.y),f.z);}
vec3 ry(vec3 p,float a){float c=cos(a),s=sin(a);return vec3(p.x*c+p.z*s,p.y,-p.x*s+p.z*c);}
void main(){vec2 p=(gl_FragCoord.xy*2.-res.xy)/min(res.x,res.y);float r=.84,d=length(p),e=.0035;if(d>r+.11)discard;float halo=1.-smoothstep(r,r+.11,d);if(d>r){gl_FragColor=vec4(.34,.78,1.,halo*.38);return;}float z=sqrt(max(0.,r*r-dot(p,p)));vec3 normal=normalize(vec3(p,z));vec3 surface=ry(normal,-.3+time*mix(.025,.46,speed));float lon=atan(surface.z,surface.x);float lat=asin(clamp(surface.y,-1.,1.));vec2 tuv=vec2(fract(lon/6.2831853+.5),lat/3.14159265+.5);vec3 color=texture2D(earth,tuv).rgb;color=max(pow(color,vec3(.86)),vec3(.025,.10,.18));vec3 light=normalize(vec3(.7,.55,.9));float diffuse=max(dot(normal,light),0.);float shade=.48+diffuse*.68;float oceanMask=1.-smoothstep(.31,.43,color.g-color.r*.2);float spec=pow(max(dot(normal,normalize(light+vec3(0,0,1))),0.),28.)*oceanMask*.32;float cloud=n(ry(normal,time*.035)*6.5);float clouds=smoothstep(.68,.79,cloud)*.48;float fresnel=pow(1.-max(normal.z,0.),2.3);color=mix(color,vec3(1.),clouds);color=color*shade+spec+vec3(.28,.72,1.)*fresnel*.55;gl_FragColor=vec4(color,1.-smoothstep(r-e,r+e,d));}`;

export function GlobeCanvas({fast=false}:{fast?:boolean}){
 const canvasRef=useRef<HTMLCanvasElement>(null),target=useRef(fast?1:0);
 useEffect(()=>{target.current=fast?1:0},[fast]);
 useEffect(()=>{const canvas=canvasRef.current,gl=canvas?.getContext("webgl",{alpha:true,antialias:true});if(!canvas||!gl)return;
  const compile=(type:number,source:string)=>{const shader=gl.createShader(type)!;gl.shaderSource(shader,source);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(shader)??"Globe shader gagal");return shader};
  const program=gl.createProgram()!,vs=compile(gl.VERTEX_SHADER,vertex),fs=compile(gl.FRAGMENT_SHADER,fragment);gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);gl.useProgram(program);
  const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);const pos=gl.getAttribLocation(program,"p");gl.enableVertexAttribArray(pos);gl.vertexAttribPointer(pos,2,gl.FLOAT,false,0,0);
  const texture=gl.createTexture();gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,texture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([14,76,142,255]));gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.REPEAT);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  const image=new window.Image();image.onload=()=>{gl.bindTexture(gl.TEXTURE_2D,texture);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,1);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);gl.generateMipmap(gl.TEXTURE_2D)};image.src="/images/earth-satellite-texture-v2.png";
  gl.uniform1i(gl.getUniformLocation(program,"earth"),0);const uTime=gl.getUniformLocation(program,"time"),uSpeed=gl.getUniformLocation(program,"speed"),uRes=gl.getUniformLocation(program,"res");let frame=0,current=target.current;
  const resize=()=>{const ratio=Math.min(devicePixelRatio||1,1.6),w=Math.max(1,Math.floor(canvas.clientWidth*ratio)),h=Math.max(1,Math.floor(canvas.clientHeight*ratio));if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h}};const observer=new ResizeObserver(resize);observer.observe(canvas);
  const render=(stamp:number)=>{resize();current+=(target.current-current)*.045;gl.viewport(0,0,canvas.width,canvas.height);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);gl.uniform1f(uTime,stamp*.001);gl.uniform1f(uSpeed,current);gl.uniform2f(uRes,canvas.width,canvas.height);gl.drawArrays(gl.TRIANGLE_STRIP,0,4);frame=requestAnimationFrame(render)};frame=requestAnimationFrame(render);
  return()=>{cancelAnimationFrame(frame);observer.disconnect();gl.deleteTexture(texture);gl.deleteBuffer(buffer);gl.deleteShader(vs);gl.deleteShader(fs);gl.deleteProgram(program)};
 },[]);
 return <canvas ref={canvasRef} className="h-full w-full" aria-hidden="true"/>;
}
