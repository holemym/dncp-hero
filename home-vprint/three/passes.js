import*as t from"../vendor/three.module.min.js";const $t="#F6F4EF",q={y:"#F5EA38",m:"#EF2D8E",c:"#379CC6",k:"#141414"},ht=["y","m","c","k"],R=1,P=1454/1144,b=.075,B=P*1.3,ft=1.2,At=3,O=ht.map((e,i)=>At+(3-i)*ft),ot=At-R/2,dt=ot+4*ft,jt=0,Y=-2*b-.012,pt=ft/.2,nt=e=>Math.min(1,Math.max(0,e)),mt=(e,i,f)=>{const l=nt((f-e)/(i-e));return l*l*(3-2*l)},L=(e,i,f)=>e+(i-e)*f;function at(e){if(e<=.8)return dt-pt*e;const i=(e-.8)/.2,f=ot-jt,l=i*i*i-2*i*i+i,s=-2*i*i*i+3*i*i;return ot-(l*pt*.2+s*f)}function Vt(){try{const e=document.createElement("canvas");return!!(window.WebGLRenderingContext&&(e.getContext("webgl2")||e.getContext("webgl")))}catch{return!1}}function Pt(e){const i=new Error(e||"WebGL unavailable");return i.name="WebGLUnavailable",i}function qt(e=256){const i=new Float32Array(e*e),f=(r,n,h)=>{const o=Math.sin(r*127.1+n*311.7+h*74.7)*43758.5453;return o-Math.floor(o)},l=(r,n,h)=>{const o=e/r;for(let d=0;d<e;d++)for(let c=0;c<e;c++){const m=c/r,w=d/r,x=Math.floor(m),M=Math.floor(w),y=m-x,S=w-M,T=y*y*(3-2*y),F=S*S*(3-2*S),A=(Z,J)=>f((Z%o+o)%o,(J%o+o)%o,n),K=L(A(x,M),A(x+1,M),T),D=L(A(x,M+1),A(x+1,M+1),T);i[d*e+c]+=L(K,D,F)*h}};l(16,1,.5),l(8,2,.3),l(4,3,.2),l(2,4,.12);const s=new Uint8Array(e*e*4);for(let r=0;r<e;r++)for(let n=0;n<e;n++){const h=(w,x)=>i[(x+e)%e*e+(w+e)%e],o=(h(n+1,r)-h(n-1,r))*2,d=(h(n,r+1)-h(n,r-1))*2,c=Math.hypot(o,d,1),m=(r*e+n)*4;s[m]=(-o/c*.5+.5)*255,s[m+1]=(-d/c*.5+.5)*255,s[m+2]=(1/c*.5+.5)*255,s[m+3]=255}const u=new t.DataTexture(s,e,e,t.RGBAFormat);return u.wrapS=u.wrapT=t.RepeatWrapping,u.colorSpace=t.NoColorSpace,u.generateMipmaps=!0,u.minFilter=t.LinearMipmapLinearFilter,u.magFilter=t.LinearFilter,u.needsUpdate=!0,u}function W(e,i,f){const l=new Float32Array(e*e),s=e/i,u=(r,n)=>{const h=Math.sin((r%s+s)%s*127.1+(n%s+s)%s*311.7+f*74.7)*43758.5453;return h-Math.floor(h)};for(let r=0;r<e;r++)for(let n=0;n<e;n++){const h=n/i,o=r/i,d=Math.floor(h),c=Math.floor(o),m=h-d,w=o-c,x=m*m*(3-2*m),M=w*w*(3-2*w),y=L(u(d,c),u(d+1,c),x),S=L(u(d,c+1),u(d+1,c+1),x);l[r*e+n]=L(y,S,M)}return l}function xt(e,i,f=!1){const l=new t.DataTexture(e,i,i,t.RGBAFormat);return l.wrapS=l.wrapT=t.RepeatWrapping,l.colorSpace=f?t.SRGBColorSpace:t.NoColorSpace,l.generateMipmaps=!0,l.minFilter=t.LinearMipmapLinearFilter,l.magFilter=t.LinearFilter,l.needsUpdate=!0,l}function Zt(){const i=W(128,1,3),f=W(128,4,5),l=new Uint8Array(128*128*4),s=new Uint8Array(128*128*4);for(let u=0;u<128;u++)for(let r=0;r<128;r++){const n=u*128+r,h=n*4,o=i[n]*.7+f[n]*.3,d=Math.round((.955+.045*o)*255);l[h]=l[h+1]=l[h+2]=d,l[h+3]=255;const c=.012*Math.sin(u*.9+1.3)*Math.sin(u*.23);s[h]=s[h+1]=s[h+2]=Math.round((.56+.08*o+c)*255),s[h+3]=255}return{albedo:xt(l,128,!0),roughness:xt(s,128)}}function Jt(){const i=W(256,1,11),f=W(256,2,12),l=W(256,4,13),s=W(256,16,21),u=W(256,8,22),r=W(256,4,23),n=new Float32Array(256*256);for(let c=0;c<256*256;c++)n[c]=.45*i[c]+.35*f[c]+.2*l[c];let h=7;const o=()=>(h=h*16807%2147483647,h/2147483647);for(let c=0;c<420;c++){const m=o()*256,w=o()*256,x=o()*Math.PI,M=4+o()*9,y=(o()-.5)*.5;for(let S=0;S<M;S+=.5){const T=Math.floor(m+Math.cos(x)*S+256)%256,F=Math.floor(w+Math.sin(x)*S+256)%256;n[F*256+T]=Math.min(1,Math.max(0,n[F*256+T]+y*.5))}}const d=new Uint8Array(256*256*4);for(let c=0;c<256*256;c++){const m=c*4;d[m]=Math.round(n[c]*255),d[m+1]=Math.round((.5*s[c]+.3*u[c]+.2*r[c])*255),d[m+2]=128,d[m+3]=255}return xt(d,256)}function Qt(e,i,f=128){const l=new Uint8Array(f*f*4),s=(r,n)=>{const h=Math.max(0,Math.abs(r-.5)-n/2)/Math.max(1e-4,(1-n)/2),o=Math.min(1,h);return 1-o*o*(3-2*o)};for(let r=0;r<f;r++)for(let n=0;n<f;n++){const h=s((n+.5)/f,e)*s((r+.5)/f,i),o=(r*f+n)*4;l[o]=l[o+1]=l[o+2]=Math.round(h*h*255),l[o+3]=255}const u=new t.DataTexture(l,f,f,t.RGBAFormat);return u.colorSpace=t.NoColorSpace,u.magFilter=t.LinearFilter,u.minFilter=t.LinearFilter,u.needsUpdate=!0,u}function zt(e){const i=new t.Scene,f=[],l=[],s=new t.BoxGeometry(1,1,1);f.push(s);const u=new t.MeshBasicMaterial({color:10131087,side:t.BackSide});l.push(u);const r=new t.Mesh(s,u);r.scale.set(14,7,14),r.position.y=2,i.add(r);const n=(d,c,m,w,x,M,y,S=16777215)=>{const T=new t.MeshBasicMaterial({color:new t.Color(S).multiplyScalar(y)});l.push(T);const F=new t.Mesh(s,T);F.scale.set(d,c,m),F.position.set(w,x,M),i.add(F)};n(2.4,.05,9,-.6,5.2,0,4.5),n(.05,2.4,6,-6.8,2.2,.5,3.2),n(6,.05,6,0,-1.4,3,.9,15920093),n(4,2.2,.05,1,2.2,6.8,1.6);const h=new t.PMREMGenerator(e),o=h.fromScene(i,.035);return h.dispose(),f.forEach(d=>d.dispose()),l.forEach(d=>d.dispose()),o}const te=`
uniform float uSheetX;
uniform vec4 uRoll;
uniform float uMotion;
varying float vWX;
varying vec2 vSheetUv;
// Height of the sheet at local x: a slight lift just past each nip it is running through,
// and a free leading edge that lifts while the sheet moves. Zero at rest.
float nipLift(float wx, float rx, float lx0, float lx1) {
  float inContact = step(lx0, rx) * step(rx, lx1);
  float d = wx - rx + 0.13;
  return inContact * 0.014 * exp(-d * d / 0.005);
}
float sheetH(float lx) {
  float wx = lx + uSheetX;
  float lx0 = uSheetX - ${(R/2).toFixed(4)}, lx1 = uSheetX + ${(R/2).toFixed(4)};
  float h = nipLift(wx, uRoll.x, lx0, lx1) + nipLift(wx, uRoll.y, lx0, lx1)
          + nipLift(wx, uRoll.z, lx0, lx1) + nipLift(wx, uRoll.w, lx0, lx1);
  float lead = 1.0 - smoothstep(0.0, 0.16, lx + ${(R/2).toFixed(4)});
  h += 0.018 * lead * lead;
  return h * uMotion;
}
`,ee=`
uniform sampler2D tY; uniform sampler2D tM; uniform sampler2D tC; uniform sampler2D tK;
uniform vec3 inkY; uniform vec3 inkM; uniform vec3 inkC; uniform vec3 inkK;
uniform vec4 uRoll;
uniform float uReady;
uniform float uMotion;
uniform sampler2D tPaper;
varying float vWX;
varying vec2 vSheetUv;
// A plate is on the sheet wherever that part of the sheet has already run under its roller.
// The wipe edge is soft over about 2.5 screen pixels at any zoom.
float laid(float rx) { float e = max(0.0025, 1.25 * fwidth(vWX)); return smoothstep(rx + e, rx - e, vWX); }
// Fresh ink is wet for the first ${(.05*6).toFixed(2)} of feed after its nip (0.05 p at press speed), then dries matte.
float wetness(float rx) { float d = rx - vWX; return step(0.0, d) * (1.0 - smoothstep(0.0, ${(.05*6).toFixed(2)}, d)); }
vec3 ink(vec3 col, float a) { return mix(vec3(1.0), col, a); } // multiply: ink on uncoated stock
`;function oe(e,{base:i}={}){if(!e)throw new Error("mountPasses: container missing");if(!Vt())throw Pt();const f=i??new URL("../img/plates/",import.meta.url).href,l=f.endsWith("/")?f:f+"/";let s;try{s=new t.WebGLRenderer({antialias:!0,alpha:!0,powerPreference:"high-performance"})}catch(a){throw Pt(a&&a.message)}s.setPixelRatio(Math.min(window.devicePixelRatio||1,1.75)),s.setClearColor(0,0),s.outputColorSpace=t.SRGBColorSpace,s.toneMapping=t.NoToneMapping,s.shadowMap.enabled=!1;const u=s.domElement;u.style.display="block",u.style.width="100%",u.style.height="100%",u.setAttribute("aria-hidden","true"),e.appendChild(u);const r=new t.Scene,n=new t.OrthographicCamera(-1,1,1,-1,.1,60),h=[],o=a=>(h.push(a),a),d=new t.HemisphereLight(16776696,15328474,1.27);r.add(d);const c=new t.DirectionalLight(16777215,2.42);r.add(c,c.target);const m=o(zt(s)),w=3092530,x=(a,p,v,g)=>{const E=o(Qt(v,g)),U=o(new t.MeshBasicMaterial({color:w,alphaMap:E,transparent:!0,depthWrite:!1,opacity:0})),N=o(new t.PlaneGeometry(a,p));N.rotateX(-Math.PI/2);const C=new t.Mesh(N,U);return C.renderOrder=-1,r.add(C),C},M=x(R+.1,P+.1,(R-.04)/(R+.1),(P-.04)/(P+.1)),y=x(R+.42,P+.42,.55,.62);M.position.y=Y+6e-4,y.position.y=Y+4e-4;const S=new t.TextureLoader,T=s.capabilities.getMaxAnisotropy();let F=0;const A={};for(const a of ht){const p=S.load(`${l}${a}.png`,()=>{F++,F===4&&(D.uReady.value=1,tt())},void 0,()=>{});p.colorSpace=t.NoColorSpace,p.anisotropy=Math.min(8,T),p.minFilter=t.LinearMipmapLinearFilter,A[a]=o(p)}const K=a=>new t.Color(a),D={uSheetX:{value:dt},uRoll:{value:new t.Vector4(...O)},uMotion:{value:1},uReady:{value:0},tY:{value:A.y},tM:{value:A.m},tC:{value:A.c},tK:{value:A.k},tPaper:{value:null},inkY:{value:K(q.y)},inkM:{value:K(q.m)},inkC:{value:K(q.c)},inkK:{value:K(q.k)}};D.tPaper.value=o(Jt());const Z=o(qt());Z.repeat.set(7,7*P);const J=o(new t.MeshStandardMaterial({color:$t,roughness:.93,metalness:0,normalMap:Z,normalScale:new t.Vector2(.2,.2),side:t.DoubleSide}));J.onBeforeCompile=a=>{Object.assign(a.uniforms,D),a.fragmentShader=`float vWet;
`+a.fragmentShader,a.vertexShader=te+a.vertexShader.replace("#include <beginnormal_vertex>",`
        float hE = 0.004;
        float dh = (sheetH(position.x + hE) - sheetH(position.x - hE)) / (2.0 * hE);
        vec3 objectNormal = normalize(vec3(-dh, 1.0, 0.0));
        #ifdef USE_TANGENT
          vec3 objectTangent = vec3( tangent.xyz );
        #endif`).replace("#include <begin_vertex>",`
        vec3 transformed = vec3(position);
        transformed.y += sheetH(position.x);
        vWX = position.x + uSheetX;
        vSheetUv = uv;`),a.fragmentShader=ee+a.fragmentShader.replace("#include <map_fragment>",`
        #include <map_fragment>
        {
          vec2 puv = vSheetUv;
          // Paper tooth and fibre in the stock's albedo (+-3%); the ink multiplies over it, so it shows through the print.
          float tooth = texture2D(tPaper, puv * vec2(2.0, ${(2*P).toFixed(4)})).r;
          diffuseColor.rgb *= 1.0 + 0.06 * (tooth - 0.5);
          // Ink density mottle, +-3%: the print reads as ink laid on stock, not a vector fill.
          float mottle = 1.0 + 0.04 * (texture2D(tPaper, puv * vec2(1.5, ${(1.5*P).toFixed(4)}) + 0.37).g - 0.5);
          float aY = texture2D(tY, puv).r * laid(uRoll.x), aM = texture2D(tM, puv).r * laid(uRoll.y);
          float aC = texture2D(tC, puv).r * laid(uRoll.z), aK = texture2D(tK, puv).r * laid(uRoll.w);
          aY *= mottle; aM *= mottle; aC *= mottle; aK *= mottle;
          vec3 printed = ink(inkY, aY) * ink(inkM, aM) * ink(inkC, aC) * ink(inkK, aK);
          diffuseColor.rgb *= mix(vec3(1.0), printed, uReady);
          vWet = uReady * uMotion * max(max(aY * wetness(uRoll.x), aM * wetness(uRoll.y)), max(aC * wetness(uRoll.z), aK * wetness(uRoll.w)));
          diffuseColor.rgb *= 1.0 - 0.05 * vWet; // wet ink sits a touch denser
        }`).replace("#include <roughnessmap_fragment>",`
        #include <roughnessmap_fragment>
        roughnessFactor = mix(roughnessFactor, 0.5, vWet * 0.7);`).replace("#include <dithering_fragment>",`
        {
          // Hairline of light on the two edges that face the key (far edge, left edge), about 1 px wide.
          vec2 fw = max(fwidth(vSheetUv), vec2(1e-5));
          float far = 1.0 - smoothstep(0.0, 1.4, (1.0 - vSheetUv.y) / fw.y);
          float lft = 1.0 - smoothstep(0.0, 1.4, vSheetUv.x / fw.x);
          gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(1.0), max(far, lft) * 0.6 * float(gl_FrontFacing));
          gl_FragColor.rgb += vWet * 0.022; // the barely visible sheen of wet ink
        }
        #include <dithering_fragment>`)};const Mt=o(new t.PlaneGeometry(R,P,72,1));Mt.rotateX(-Math.PI/2);const Q=new t.Mesh(Mt,J);r.add(Q);const X=Zt();o(X.albedo),o(X.roughness),X.albedo.repeat.set(1.1,3.4),X.roughness.repeat.set(1.1,3.4);const _t=o(new t.MeshPhysicalMaterial({color:9080209,map:X.albedo,metalness:.7,roughness:1,roughnessMap:X.roughness,envMap:m.texture,envMapIntensity:1,anisotropy:.3,anisotropyRotation:Math.PI/2})),vt=o(new t.MeshStandardMaterial({color:5593181,map:X.albedo,metalness:.4,roughness:.72,envMap:m.texture,envMapIntensity:.6})),Gt=o(new t.MeshStandardMaterial({color:3026995,roughness:.7,metalness:.3,envMap:m.texture,envMapIntensity:.4})),rt=o(new t.CylinderGeometry(b,b,B,48,1));rt.rotateX(Math.PI/2),rt.computeTangents();const gt=.05,wt=o(new t.CylinderGeometry(b*1.006,b*1.006,gt,48,1,!0));wt.rotateX(Math.PI/2);const Wt=o(new t.BoxGeometry(.008,.003,B*.985)),Dt=[_t,vt,vt],yt=a=>{const p=new t.Group,v=new t.Mesh(rt,Dt),g=new t.Mesh(Wt,Gt);if(g.position.y=b-.0015,p.add(v,g),a){const E=new t.Mesh(wt,o(new t.MeshStandardMaterial({color:a,roughness:.8,metalness:0,envMap:m.texture,envMapIntensity:.4})));E.position.z=B/2-gt/2-.03,p.add(E)}return p},St=[],bt=[];ht.forEach((a,p)=>{const v=yt(q[a]);v.position.set(O[p],b+.003,0);const g=yt(null);g.position.set(O[p],-b-.003,0),r.add(v,g),St.push(v),bt.push(g);const E=x(2*b+.22,B+.2,2*b/(2*b+.22)*.7,B/(B+.2));E.position.set(O[p]+.025,Y+5e-4,-.02),E.material.opacity=.2});let st=0,$=0,j=0,V=0,z=!1;const _=new t.Vector3;function it(a,p){const v=t.MathUtils.degToRad(-22),g=Math.cos(v),E=(O[0]-O[3]+2*b)*g+B*Math.abs(Math.sin(v)),U=Math.min(2.2,Math.max(1.7,E/.84/p)),N=U*p/2/g,C=ot-R/2-.1,G=dt+R/2,H=C+N,I=G-N;return{x:H>I?(C+G)/2:Math.min(I,Math.max(H,at(a)-.15)),passH:U}}function Xt(a){const p=at(a);D.uSheetX.value=p,Q.position.x=p;const v=mt(.84,.95,a),g=nt((a-.95)/.045),E=.01*Math.sin(Math.PI*g)*(1-g)*(1-g);Q.position.y=L(0,Y+.003,v)+E,D.uMotion.value=1-mt(.82,.95,a);const U=pt*a/b;for(const et of St)et.rotation.z=-U;for(const et of bt)et.rotation.z=U;const N=Q.position.y-(Y+.003),C=nt(N/-Y);M.position.x=p+.008,M.position.z=-.006,y.position.x=p+.03+.08*C,y.position.z=-.03-.05*C,M.material.opacity=.17*(1-C),y.material.opacity=.05+.07*C;const G=$/Math.max(1,j),H=mt(.8,1,a),I=t.MathUtils.degToRad(L(24,64,H)),lt=t.MathUtils.degToRad(L(-22,0,H)),Nt=Math.cos(lt),{x:Ht,passH:It}=it(Math.min(a,.8),G),Bt=Math.max(P*Math.sin(I)/.75,R/.8/G),ct=L(It,Bt,H),kt=ct*G/2;let Lt=Ht;if(a>.8){const Tt=at(.8)-it(.8,G).x,Kt=(Tt-(at(.8-.001)-it(.8-.001,G).x))/.001*.2,k=(a-.8)/.2,Ot=2*k*k*k-3*k*k+1,Yt=k*k*k-2*k*k+k;Lt=p-(Ot*Tt+Yt*Kt)}_.set(Lt,0,L(.1,.03,H)),n.left=-kt,n.right=kt,n.top=ct/2,n.bottom=-ct/2,n.updateProjectionMatrix();const ut=12;n.position.set(_.x+ut*Math.cos(I)*Math.sin(lt),_.y+ut*Math.sin(I),_.z+ut*Math.cos(I)*Nt),n.lookAt(_),c.position.set(_.x-2.2,4.2,_.z+2.4),c.target.position.copy(_)}function Ut(){V=0,!(z||!$||!j)&&(Xt(st),s.render(r,n))}function tt(){z||V||(V=requestAnimationFrame(Ut))}function Rt(){const a=e.getBoundingClientRect(),p=Math.max(1,Math.round(a.width)),v=Math.max(1,Math.round(a.height));p===$&&v===j||($=p,j=v,s.setSize($,j,!1),tt())}const Ft=new ResizeObserver(Rt);Ft.observe(e),Rt();const Et=a=>{a.preventDefault()},Ct=()=>{tt()};return u.addEventListener("webglcontextlost",Et),u.addEventListener("webglcontextrestored",Ct),{setProgress(a){const p=nt(Number(a)||0);Math.abs(p-st)<1e-5||(st=p,tt())},destroy(){if(!z){z=!0,V&&cancelAnimationFrame(V),Ft.disconnect(),u.removeEventListener("webglcontextlost",Et),u.removeEventListener("webglcontextrestored",Ct);for(const a of h)a.dispose();c.dispose(),s.dispose(),s.forceContextLoss(),u.remove()}}}}export{oe as mountPasses};
