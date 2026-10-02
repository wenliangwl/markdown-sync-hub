const $=s=>document.querySelector(s);let files=[],cur='';
const JSON_HDR={'Content-Type':'application/json'};
async function j(u,o){let r=await fetch(u,o);if(r.status===401){showLogin();throw Error('login')};return r}
async function init(){let s=await fetch('/api/auth/state').then(r=>r.json());s.configured?showLogin():showSetup()}

/* ---------- Login: page 1 (username + password) -> page 2 (TOTP / recovery code) -> vault ---------- */
function showLogin(){
  $('#app').classList.add('hidden');
  $('#auth').innerHTML='<h2>Sign in</h2><input id=u placeholder=Username autocomplete=username><input id=p type=password placeholder=Password autocomplete=current-password><button id=l>Continue</button>';
  $('#u').focus();
  const go=async()=>{
    let r=await fetch('/api/auth/login/start',{method:'POST',headers:JSON_HDR,body:JSON.stringify({User:$('#u').value,Password:$('#p').value})});
    if(!r.ok){alert('Invalid username or password');return}
    let x=await r.json();
    showCode(x.login_id);
  };
  $('#l').onclick=go;
  $('#p').onkeydown=e=>{if(e.key==='Enter')go()};
}
function showCode(loginId){
  $('#auth').innerHTML='<h2>Two-factor authentication</h2><p>Enter the 6-digit code from your authenticator app, or a recovery code.</p><input id=c autocomplete=one-time-code placeholder="6-digit code or recovery code"><button id=v>Sign in</button><button id=b>Back</button>';
  $('#c').focus();
  const go=async()=>{
    let r=await fetch('/api/auth/login/verify',{method:'POST',headers:JSON_HDR,body:JSON.stringify({login_id:loginId,code:$('#c').value.trim()})});
    if(r.ok){$('#auth').innerHTML='';$('#app').classList.remove('hidden');load()}
    else{alert('Invalid code. Please sign in again.');showLogin()} // the server consumes the login_id on every attempt
  };
  $('#v').onclick=go;
  $('#c').onkeydown=e=>{if(e.key==='Enter')go()};
  $('#b').onclick=showLogin;
}

/* ---------- First-run setup (shows QR code) ---------- */
function showSetup(){
  $('#auth').innerHTML='<h2>First-run setup</h2><input id=sc placeholder="Setup code from server"><input id=su placeholder=Username><input id=sp type=password placeholder="Password (10+ chars)"><button id=ss>Start 2FA setup</button>';
  $('#ss').onclick=async()=>{
    let q={Code:$('#sc').value,User:$('#su').value,Password:$('#sp').value};
    let r0=await fetch('/api/auth/setup/start',{method:'POST',headers:JSON_HDR,body:JSON.stringify(q)});
    if(!r0.ok){alert('Setup failed: check the setup code and use a password of 10+ characters');return}
    let x=await r0.json();
    $('#auth').innerHTML=`<h2>Add TOTP</h2><p>Scan this QR code with Google Authenticator, Microsoft Authenticator, Bitwarden, etc.</p><img alt="TOTP QR code" width=256 height=256 src="data:image/png;base64,${x.qr}"><p>Can't scan? Enter this secret manually:</p><textarea style="height:60px" readonly>${x.secret}</textarea><input id=tc inputmode=numeric placeholder="6-digit code"><button id=tf>Confirm</button>`;
    $('#tf').onclick=async()=>{
      let r=await fetch('/api/auth/setup/finish',{method:'POST',headers:JSON_HDR,body:JSON.stringify({SetupID:x.setup_id,User:q.User,Password:q.Password,Secret:x.secret,Code:$('#tc').value})}),z=await r.json().catch(()=>({}));
      if(r.ok){$('#auth').innerHTML='<h2>Recovery codes</h2><p>Save these offline. Each works once.</p><pre>'+z.recovery_codes.join('\n')+'</pre><button onclick="location.reload()">Continue</button>'}
      else alert('Invalid code, try again');
    };
  };
}

/* ---------- Vault UI (unchanged) ---------- */
async function load(){files=await j('/api/files').then(r=>r.json());draw()}
function draw(){let q=$('#search').value?.toLowerCase()||'';$('#tree').innerHTML=files.filter(f=>f.kind==='markdown'&&f.path.toLowerCase().includes(q)).map(f=>`<div class=row data-p="${encodeURIComponent(f.path)}">📄 ${f.path}</div>`).join('');document.querySelectorAll('[data-p]').forEach(x=>x.onclick=()=>open(decodeURIComponent(x.dataset.p)))}
async function open(p){cur=p;let t=await j('/api/file?path='+encodeURIComponent(p)).then(r=>r.text());$('#path').textContent=p;$('#editor').value=t;$('#preview').innerHTML=render(t);$('#editor').classList.add('hidden');$('#preview').classList.remove('hidden');$('#edit').classList.remove('hidden');$('#save').classList.add('hidden')}
function render(t){let paras=t.split(/\n\s*\n/);return paras.map(x=>x.startsWith('# ')?`<h1>${x.slice(2)}</h1>`:`<p>${x.replace(/\n/g,'<br>')}</p>`).join('')}
$('#edit').onclick=()=>{$('#preview').classList.add('hidden');$('#editor').classList.remove('hidden');$('#save').classList.remove('hidden')};
$('#save').onclick=async()=>{await j('/api/file?path='+encodeURIComponent(cur),{method:'PUT',body:$('#editor').value});open(cur)};
$('#search').oninput=draw;
$('#logout').onclick=async()=>{await fetch('/api/auth/logout',{method:'POST'});location.reload()};
$('#activity').onclick=async()=>{let x=await j('/api/admin/status').then(r=>r.json());$('#modal').innerHTML='<h2>Sync Activity / Devices</h2><pre>'+JSON.stringify(x,null,2)+'</pre><button onclick="modal.close()">Close</button>';$('#modal').showModal()};
$('#new').onclick=async()=>{let p=prompt('New note path, e.g. Work/Test.md');if(!p)return;if(!p.endsWith('.md'))p+='.md';await j('/api/file?path='+encodeURIComponent(p),{method:'PUT',body:'# '+p.split('/').at(-1).replace(/\.md$/,'')+'\n\n'});await load();open(p)};
init();