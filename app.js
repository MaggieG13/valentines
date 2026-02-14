
:root{
  --bg:#0b0612;
  --panel:#120a1fdd;
  --card:#140b23f2;
  --ink:#f2eefe;
  --muted:#b9a8d6;
  --muted2:#8e7bb5;
  --line:#2a1744;
  --accent:#b78cff;
  --accent2:#6d2cff;
  --good:#9dffa9;
  --warn:#ffd68c;
  --bad:#ff8c8c;
  --shadow: 0 18px 60px rgba(0,0,0,.55);
  --radius: 18px;
}

*{box-sizing:border-box;}
html,body{height:100%;}
body{
  margin:0;
  background: radial-gradient(1200px 700px at 50% -10%, #2a0b44 0%, rgba(42,11,68,0) 60%) , var(--bg);
  color:var(--ink);
  font: 15px/1.45 ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial;
  overflow:hidden;
}

#bg{
  position:fixed; inset:0;
  z-index:-1;
}
#fire{
  width:100%; height:100%;
  display:block;
  opacity:.9;
  filter: blur(.2px) saturate(1.15);
}

.topbar{
  position:fixed;
  top:0; left:0; right:0;
  padding: 14px 16px env(safe-area-inset-top);
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:12px;
  backdrop-filter: blur(10px);
  background: linear-gradient(to bottom, rgba(10,4,18,.78), rgba(10,4,18,.35));
  border-bottom: 1px solid rgba(255,255,255,.06);
}

.brand__title{
  font-weight:800;
  letter-spacing:.2px;
}
.brand__subtitle{
  color:var(--muted);
  font-size:12.5px;
}

.topbar__actions{display:flex; gap:10px;}

.layout{
  position:fixed;
  inset: 62px 0 0 0;
  padding: 14px 14px env(safe-area-inset-bottom);
  display:grid;
  grid-template-columns: 320px 1fr 320px;
  gap:14px;
  height: calc(100% - 62px);
}

.panel{
  background: var(--panel);
  border: 1px solid rgba(255,255,255,.06);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  overflow:hidden;
  min-height:0;
  display:flex;
  flex-direction:column;
}

.panel__title{
  padding: 12px 14px;
  font-weight:700;
  color:var(--muted);
  border-bottom: 1px solid rgba(255,255,255,.06);
}

.panel__footer{
  padding: 12px 14px;
  border-top: 1px solid rgba(255,255,255,.06);
  color:var(--muted2);
  font-size:12px;
}

.panel--chapters .chapters{
  padding: 10px;
  overflow:auto;
}

.chapterBtn{
  width:100%;
  text-align:left;
  border: 1px solid rgba(255,255,255,.06);
  background: rgba(0,0,0,.18);
  color:var(--ink);
  border-radius: 14px;
  padding: 10px 12px;
  margin-bottom: 10px;
  cursor:pointer;
  transition: transform .08s ease, border-color .15s ease, background .15s ease;
}
.chapterBtn:hover{transform: translateY(-1px); border-color: rgba(183,140,255,.35);}
.chapterBtn__title{font-weight:800; margin-bottom:4px;}
.chapterBtn__dir{color:var(--muted); font-size:12.5px;}
.chapterBtn__meta{display:flex; justify-content:space-between; margin-top:8px; color:var(--muted2); font-size:12px;}
.pill{
  display:inline-flex; align-items:center; gap:6px;
  padding: 3px 10px;
  border-radius: 999px;
  border: 1px solid rgba(255,255,255,.09);
  background: rgba(0,0,0,.16);
}

.panel--content{overflow:auto;}
.crumb{
  padding: 10px 12px 0 12px;
  color:var(--muted2);
  font-size:12px;
}
.card{
  margin: 10px 12px 12px 12px;
  border-radius: var(--radius);
  background: var(--card);
  border: 1px solid rgba(255,255,255,.07);
  box-shadow: var(--shadow);
  display:flex;
  flex-direction:column;
  overflow:hidden;
  min-height: calc(100% - 28px);
}
.card__header{
  padding: 16px 16px 10px 16px;
  border-bottom: 1px solid rgba(255,255,255,.06);
}
.card__kicker{
  color:var(--muted);
  font-weight:700;
  font-size:12px;
  letter-spacing:.2px;
  margin-bottom:6px;
}
.card__title{
  margin:0;
  font-size: 22px;
  line-height:1.15;
}
.card__body{
  padding: 14px 16px;
  overflow:auto;
}
.block{margin-bottom: 14px;}
.label{
  font-weight:800;
  color:var(--muted);
  font-size:12.5px;
  letter-spacing:.2px;
  margin-bottom:6px;
}
.text{white-space:pre-wrap;}
.mechanics{
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid rgba(255,255,255,.06);
}
.mCard{
  border: 1px solid rgba(255,255,255,.08);
  background: rgba(0,0,0,.18);
  border-radius: 16px;
  padding: 12px;
  margin-bottom: 12px;
}
.mTitle{font-weight:800; margin-bottom:8px;}
.mSub{color:var(--muted); font-size:12.5px; margin-bottom:10px;}
.row{display:flex; gap:10px; align-items:center; flex-wrap:wrap;}
input[type="text"], textarea, select{
  width:100%;
  background: rgba(0,0,0,.25);
  border: 1px solid rgba(255,255,255,.10);
  color:var(--ink);
  border-radius: 12px;
  padding: 10px 12px;
  outline:none;
}
textarea{min-height:100px; resize:vertical;}

.card__footer{
  padding: 12px 12px;
  border-top: 1px solid rgba(255,255,255,.06);
  display:flex;
  gap:10px;
  align-items:center;
}
.spacer{flex:1;}

.btn{
  border: 1px solid rgba(255,255,255,.12);
  background: rgba(0,0,0,.20);
  color:var(--ink);
  padding: 10px 12px;
  border-radius: 14px;
  cursor:pointer;
  font-weight:800;
}
.btn:hover{border-color: rgba(183,140,255,.35);}
.btn--primary{
  background: linear-gradient(135deg, rgba(183,140,255,.95), rgba(109,44,255,.95));
  border-color: rgba(183,140,255,.6);
  color:#12091f;
}
.btn--ghost{
  background: rgba(0,0,0,.10);
}
.btn--wide{width:100%;}

.panel--dice .diceWrap{
  padding: 12px;
  overflow:auto;
}
.diceStage{
  position:relative;
  width:100%;
  aspect-ratio: 1 / 1;
  border-radius: 18px;
  border: 1px solid rgba(255,255,255,.08);
  background: radial-gradient(400px 240px at 50% 20%, rgba(183,140,255,.16), rgba(0,0,0,.18));
  overflow:hidden;
  margin-bottom: 10px;
}
#diceCanvas{
  width:100%;
  height:100%;
  display:block;
}
.diceResult{
  position:absolute;
  left: 10px;
  bottom: 10px;
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(0,0,0,.35);
  border: 1px solid rgba(255,255,255,.10);
  font-weight:900;
  color: var(--ink);
}
.diceMeta{
  margin-top:10px;
  color:var(--muted);
  font-size:12.5px;
}
.metaRow{display:flex; justify-content:space-between; padding: 6px 2px; border-bottom: 1px dashed rgba(255,255,255,.10);}
.metaRow:last-child{border-bottom:none;}
.tiny{opacity:.9}

.modal{
  position:fixed; inset:0;
  display:none;
  z-index:50;
}
.modal[aria-hidden="false"]{display:block;}
.modal__backdrop{
  position:absolute; inset:0;
  background: rgba(0,0,0,.65);
  backdrop-filter: blur(6px);
}
.modal__sheet{
  position:absolute;
  left:50%; top:50%;
  transform: translate(-50%,-50%);
  width:min(560px, calc(100% - 24px));
  max-height: min(76vh, 720px);
  overflow:hidden;
  border-radius: 22px;
  border: 1px solid rgba(255,255,255,.10);
  background: rgba(16,8,28,.95);
  box-shadow: var(--shadow);
  display:flex;
  flex-direction:column;
}
.modal__head{
  padding: 12px 14px;
  display:flex;
  justify-content:space-between;
  align-items:center;
  border-bottom: 1px solid rgba(255,255,255,.07);
}
.modal__title{font-weight:900;}
.iconBtn{
  border: 1px solid rgba(255,255,255,.12);
  background: rgba(0,0,0,.20);
  color:var(--ink);
  border-radius: 12px;
  padding: 8px 10px;
  cursor:pointer;
}
.modal__body{padding: 12px 14px; overflow:auto;}
.modal__foot{padding: 12px 14px; border-top: 1px solid rgba(255,255,255,.07); display:flex; gap:10px; justify-content:flex-end; align-items:center;}

@media (max-width: 1050px){
  body{overflow:auto;}
  .layout{
    position:static;
    inset:auto;
    height:auto;
    grid-template-columns: 1fr;
  }
  .panel{min-height: 260px;}
  .panel--dice .diceStage{max-width: 520px; margin: 0 auto 10px auto;}
}
