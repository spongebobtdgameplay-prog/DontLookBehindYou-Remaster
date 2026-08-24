function markEndingSeen(name){
  let seen=[];
  try{ seen=JSON.parse(localStorage.getItem("dlby_endings")||"[]"); }catch(e){ seen=[]; }
  if(!seen.includes(name)) seen.push(name);
  try{ localStorage.setItem("dlby_endings",JSON.stringify(seen)); }catch(e){}
}

(function(){
  const Endpoint="https://script.google.com/macros/s/AKfycby-dai5jJhtcfbA8SvuT1C4k2ecJfRlbREZQdMf-p9yo_d8-_rqscUR0aK_yCmVx1tV9Q/exec";
  const Cog=document.getElementById("dev-tools-cog");
  const DevToolsPage=document.getElementById("dev-tools-page");
  if(!Cog||!DevToolsPage) return;

  let Authorized=false;
  let PendingRequestId="";
  let ResponseTimer=null;

  const Style=document.createElement("style");
  Style.textContent=`
    #dev-pin-page{
      position:fixed; inset:0; z-index:1100; display:none; align-items:center; justify-content:center;
      padding:22px; background:rgba(0,0,0,.9); font-family:var(--font-mono);
    }
    #dev-pin-page.open{ display:flex; }
    #dev-pin-card{
      width:min(390px,100%); padding:22px; background:#080908; border:1px solid #d9e8c9;
      box-shadow:0 0 32px rgba(217,232,201,.12);
    }
    #dev-pin-header{ display:flex; align-items:center; justify-content:space-between; gap:16px; margin-bottom:20px; }
    #dev-pin-title{ color:#fff; font-size:1.1rem; letter-spacing:2px; }
    #dev-pin-close{
      width:44px; height:44px; border:1px solid #555; background:#111; color:#fff;
      font:inherit; font-size:1.2rem; cursor:pointer;
    }
    #dev-pin-label{ display:block; margin-bottom:8px; color:#d9e8c9; font-size:.75rem; letter-spacing:1px; }
    #dev-pin-input{
      width:100%; box-sizing:border-box; min-height:46px; padding:10px 12px;
      border:1px solid #555; outline:none; background:#050505; color:#fff;
      font:inherit; font-size:1rem; letter-spacing:2px;
    }
    #dev-pin-input:focus{ border-color:#d9e8c9; }
    #dev-pin-submit{
      width:100%; min-height:46px; margin-top:14px; border:1px solid #d9e8c9;
      background:#111; color:#fff; font:inherit; font-size:.78rem; letter-spacing:1px; cursor:pointer;
    }
    #dev-pin-submit:disabled{ opacity:.45; cursor:default; }
    #dev-pin-status{ min-height:18px; margin-top:12px; color:#777; font-size:.7rem; letter-spacing:.8px; }
    #dev-pin-status.error{ color:#c81e2b; }
    #dev-pin-status.ok{ color:#d9e8c9; }
    #dev-pin-frame{ display:none; }
  `;
  document.head.appendChild(Style);

  const PinPage=document.createElement("div");
  PinPage.id="dev-pin-page";
  PinPage.setAttribute("aria-hidden","true");
  PinPage.innerHTML=`
    <div id="dev-pin-card" role="dialog" aria-modal="true" aria-labelledby="dev-pin-title">
      <div id="dev-pin-header">
        <div id="dev-pin-title">DEV ACCESS</div>
        <button id="dev-pin-close" type="button" aria-label="Close PIN prompt">×</button>
      </div>
      <form id="dev-pin-form" method="POST" action="${Endpoint}" target="dev-pin-frame" autocomplete="off">
        <label id="dev-pin-label" for="dev-pin-input">ENTER SERVER PIN</label>
        <input id="dev-pin-input" name="pin" type="password" inputmode="numeric" autocomplete="off" required>
        <input id="dev-pin-request" name="requestId" type="hidden">
        <button id="dev-pin-submit" type="submit">UNLOCK DEV TOOLS</button>
      </form>
      <div id="dev-pin-status" aria-live="polite"></div>
      <iframe id="dev-pin-frame" name="dev-pin-frame" title="Developer PIN verification"></iframe>
    </div>
  `;
  document.body.appendChild(PinPage);

  const PinCard=document.getElementById("dev-pin-card");
  const PinClose=document.getElementById("dev-pin-close");
  const PinForm=document.getElementById("dev-pin-form");
  const PinInput=document.getElementById("dev-pin-input");
  const PinRequest=document.getElementById("dev-pin-request");
  const PinSubmit=document.getElementById("dev-pin-submit");
  const PinStatus=document.getElementById("dev-pin-status");

  function SetStatus(Text,Type){
    PinStatus.textContent=Text;
    PinStatus.className=Type||"";
  }

  function OpenPin(){
    if(document.pointerLockElement) document.exitPointerLock();
    PinPage.classList.add("open");
    PinPage.setAttribute("aria-hidden","false");
    SetStatus("","");
    PinInput.value="";
    setTimeout(()=>PinInput.focus(),0);
  }

  function ClosePin(){
    clearTimeout(ResponseTimer);
    ResponseTimer=null;
    PendingRequestId="";
    PinSubmit.disabled=false;
    PinPage.classList.remove("open");
    PinPage.setAttribute("aria-hidden","true");
    SetStatus("","");
  }

  function OpenUnlockedTools(){
    DevToolsPage.classList.add("open");
    DevToolsPage.setAttribute("aria-hidden","false");
  }

  Cog.addEventListener("click",Event=>{
    if(Authorized) return;
    Event.preventDefault();
    Event.stopImmediatePropagation();
    OpenPin();
  },true);

  PinClose.addEventListener("click",Event=>{
    Event.stopPropagation();
    ClosePin();
  });

  PinPage.addEventListener("click",Event=>{
    if(Event.target===PinPage) ClosePin();
  });

  PinCard.addEventListener("click",Event=>Event.stopPropagation());

  PinForm.addEventListener("submit",()=>{
    const Pin=PinInput.value.trim();
    if(!Pin){
      SetStatus("ENTER A PIN.","error");
      return false;
    }

    PendingRequestId=crypto.randomUUID?crypto.randomUUID():`${Date.now()}-${Math.random()}`;
    PinRequest.value=PendingRequestId;
    PinSubmit.disabled=true;
    SetStatus("CHECKING SERVER...","");

    clearTimeout(ResponseTimer);
    ResponseTimer=setTimeout(()=>{
      PendingRequestId="";
      PinSubmit.disabled=false;
      SetStatus("SERVER DID NOT RESPOND.","error");
    },10000);

    return true;
  });

  window.addEventListener("message",Event=>{
    const Data=Event.data;
    if(!Data||Data.type!=="DLBY_DEV_PIN_RESULT") return;
    if(!PendingRequestId||Data.requestId!==PendingRequestId) return;

    clearTimeout(ResponseTimer);
    ResponseTimer=null;
    PendingRequestId="";
    PinSubmit.disabled=false;

    if(Data.success===true){
      Authorized=true;
      SetStatus("ACCESS GRANTED.","ok");
      setTimeout(()=>{
        ClosePin();
        OpenUnlockedTools();
      },180);
      return;
    }

    PinInput.value="";
    PinInput.focus();
    SetStatus("ACCESS DENIED.","error");
  });

  document.addEventListener("keydown",Event=>{
    if(Event.key==="Escape"&&PinPage.classList.contains("open")){
      Event.preventDefault();
      Event.stopImmediatePropagation();
      ClosePin();
    }
  },true);
})();
