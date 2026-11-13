/* All file contents remain in this browser. */
const $ = id => document.getElementById(id);
const items = [];
let busy = false, toastTimer;
function toast(message) { $('toast').textContent = message; $('toast').style.display = 'block'; clearTimeout(toastTimer); toastTimer = setTimeout(() => $('toast').style.display = 'none', 4500); }
function settings() {
  const format = $('format').value;
  const limit = Number($('limit').value);
  if (format !== 'svg' && (!Number.isInteger(limit) || limit < 256 || limit > 16384)) throw Error('Giới hạn cạnh phải từ 256 đến 16384 px.');
  return {format, scale:Number($('scale').value), limit, white:$('background').value === 'white', clean:$('clean').checked, words:$('keywords').value.split('\n').map(s => s.trim().toLowerCase()).filter(Boolean)};
}
function cleanSVG(source, options) {
  if (/<!DOCTYPE|<!ENTITY/i.test(source)) throw Error('SVG chứa DTD/ENTITY không được hỗ trợ.');
  const doc = new DOMParser().parseFromString(source, 'image/svg+xml');
  const root = doc.documentElement;
  if (doc.querySelector('parsererror') || root.localName !== 'svg' || root.namespaceURI !== 'http://www.w3.org/2000/svg') throw Error('File SVG không hợp lệ.');
  let removed = 0;
  const words = ['visual paradigm enterprise [evaluation copy]', ...options.words];
  for (const node of [...root.querySelectorAll('*')]) {
    if (!root.contains(node)) continue;
    if (options.clean && (/water[-_ ]?mark/i.test(`${node.id} ${node.getAttribute('class') || ''}`) || (node.localName === 'text' && words.some(word => node.textContent.toLowerCase().includes(word))))) { node.remove(); removed++; continue; }
    if (['script','foreignObject','animate','animateMotion','animateTransform','set'].includes(node.localName)) { node.remove(); continue; }
    for (const attr of [...node.attributes]) {
      if (/^on/i.test(attr.name)) node.removeAttributeNode(attr);
      else if (attr.localName === 'href' && !attr.value.startsWith('#') && !/^data:image\/(png|jpeg|webp|gif);base64,/i.test(attr.value)) throw Error('SVG có tài nguyên liên kết ngoài. Hãy nhúng ảnh vào SVG trước.');
      else if (/@import|url\(\s*['"]?(?!#)/i.test(attr.value)) throw Error('SVG có tài nguyên CSS liên kết ngoài.');
    }
    if (node.localName === 'style' && /@import|url\(\s*['"]?(?!#)/i.test(node.textContent)) throw Error('SVG có tài nguyên CSS liên kết ngoài.');
  }
  for (const attr of [...root.attributes]) if (/^on/i.test(attr.name)) root.removeAttributeNode(attr);
  // Some desktop exporters use lowercase viewbox; normalize it for browsers.
  if (!root.hasAttribute('viewBox') && root.hasAttribute('viewbox')) { root.setAttribute('viewBox', root.getAttribute('viewbox')); root.removeAttribute('viewbox'); }
  const vb = (root.getAttribute('viewBox') || '').trim().split(/[\s,]+/).map(Number);
  function length(value) { const m = /^([\d.]+)(px|pt|pc|in|cm|mm)?$/.exec((value || '').trim()); return m ? Number(m[1]) * ({px:1,pt:96/72,pc:16,in:96,cm:96/2.54,mm:96/25.4}[m[2]] || 1) : 0; }
  let w = length(root.getAttribute('width')), h = length(root.getAttribute('height'));
  if (vb.length === 4 && vb.every(Number.isFinite) && vb[2] > 0 && vb[3] > 0) { w ||= h ? h*vb[2]/vb[3] : vb[2]; h ||= w*vb[3]/vb[2]; }
  if (!(w > 0 && h > 0 && Number.isFinite(w+h))) throw Error('SVG thiếu kích thước hoặc viewBox hợp lệ.');
  const factor = Math.min(options.scale, options.limit/Math.max(w,h), Math.sqrt(32_000_000/(w*h)));
  const width = Math.max(1,Math.round(w*factor)), height = Math.max(1,Math.round(h*factor));
  root.setAttribute('width', w); root.setAttribute('height', h);
  return {svg:new XMLSerializer().serializeToString(root), width, height, removed};
}
async function render(item, options) {
  if (item.url) URL.revokeObjectURL(item.url);
  item.url = null; item.blob = null; item.error = null;
  try {
    item.source ??= await item.file.text();
    const result = cleanSVG(item.source, options);
    if (options.format === 'svg') {
      const blob = new Blob([result.svg], {type:'image/svg+xml;charset=utf-8'});
      Object.assign(item, result, {blob, copyBlob:null, format:'svg', url:URL.createObjectURL(blob)});
      return;
    }
    const url = URL.createObjectURL(new Blob([result.svg], {type:'image/svg+xml'}));
    try {
      const img = new Image();
      await new Promise((resolve,reject) => { img.onload = resolve; img.onerror = () => reject(Error('Không thể dựng ảnh SVG.')); img.src = url; });
      const canvas = document.createElement('canvas'); canvas.width = result.width; canvas.height = result.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw Error('Trình duyệt không hỗ trợ Canvas.');
      if (options.white || options.format === 'jpg') { ctx.fillStyle = '#fff'; ctx.fillRect(0,0,canvas.width,canvas.height); }
      ctx.drawImage(img,0,0,canvas.width,canvas.height);
      const mime = options.format === 'jpg' ? 'image/jpeg' : 'image/png';
      const blob = await new Promise(resolve => canvas.toBlob(resolve, mime, 0.94));
      const copyBlob = options.format === 'jpg' ? await new Promise(resolve => canvas.toBlob(resolve, 'image/png')) : blob;
      canvas.width = canvas.height = 0;
      if (!blob) throw Error('Không đủ bộ nhớ để xuất PNG. Hãy giảm độ phân giải.');
      if (!copyBlob) throw Error('Không thể tạo ảnh để sao chép.');
      Object.assign(item, result, {blob, copyBlob, format:options.format, url:URL.createObjectURL(blob)});
    } finally { URL.revokeObjectURL(url); }
  } catch (error) { item.error = error.message; }
}
function download(blob, name) { const url = URL.createObjectURL(blob), a = document.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 30000); }
function update() {
  $('list').replaceChildren(); $('count').textContent = items.length; $('empty').hidden = items.length > 0;
  $('clear').disabled = $('rerender').disabled = busy || !items.length;
  $('format').disabled = busy;
  $('downloadAll').disabled = busy || !items.some(i => i.blob);
  $('files').disabled = busy;
  for (const item of items) {
    const card = document.createElement('article'); card.className = 'card';
    const preview = document.createElement('div'); preview.className = 'preview';
    if (item.url) { const img = new Image(); img.src = item.url; img.alt = 'Bản xuất ' + item.file.name; preview.append(img); }
    else preview.textContent = item.error ? 'Không thể xử lý' : 'Đang xử lý…';
    const info = document.createElement('div'); info.className = 'cardinfo';
    const name = document.createElement('p'); name.className = 'filename'; name.textContent = item.name; name.title = item.name;
    const meta = document.createElement('p'); meta.className = item.error ? 'error' : 'meta';
    meta.textContent = item.error || (item.blob ? `${item.width} × ${item.height} px · Xoá ${item.removed} phần tử watermark` : 'Đang chuyển đổi');
    info.append(name,meta);
    if (item.blob) {
      const actions = document.createElement('div'); actions.className = 'cardactions';
      const save = document.createElement('button'); save.textContent = `Tải ${item.format.toUpperCase()} ↓`; save.onclick = () => download(item.blob,item.name);
      const copy = document.createElement('button'); copy.className = 'secondary'; copy.textContent = item.format === 'svg' ? 'Copy mã SVG' : 'Copy ảnh PNG';
      copy.onclick = async () => { try { if (item.format === 'svg') { await navigator.clipboard.writeText(await item.blob.text()); toast('Đã copy mã SVG.'); } else { if (!navigator.clipboard?.write || !window.ClipboardItem) throw Error('Hãy mở web bằng HTTPS hoặc localhost trên Chrome/Edge để copy ảnh.'); await navigator.clipboard.write([new ClipboardItem({'image/png':item.copyBlob})]); toast('Đã copy ảnh PNG. Dán bằng Ctrl+V.'); } } catch (error) { toast(error.name === 'NotAllowedError' ? 'Chưa được cấp quyền clipboard. Bạn có thể tải file hoặc cho phép sao chép trong trình duyệt.' : error.message); } };
      actions.append(save,copy); info.append(actions);
    }
    const edit = document.createElement('details'); edit.className = 'element-editor';
    const summary = document.createElement('summary'); summary.textContent = 'Chọn phần tử cần xoá'; edit.append(summary);
    edit.addEventListener('toggle', () => { if (edit.open && !edit.dataset.loaded) loadElementChoices(item, edit); });
    card.append(preview,info,edit); $('list').append(card);
  }
}
function elementPath(node) {
  const path=[];
  while (node.parentElement) { path.unshift([...node.parentElement.children].indexOf(node)); node=node.parentElement; }
  return path;
}
function loadElementChoices(item, editor) {
  editor.dataset.loaded='1';
  const doc=new DOMParser().parseFromString(item.source,'image/svg+xml'), root=doc.documentElement;
  if (doc.querySelector('parsererror')) { editor.append('Không thể đọc cấu trúc SVG.'); return; }
  const list=document.createElement('div'); list.className='element-list';
  for (const node of root.querySelectorAll('*')) {
    const path=elementPath(node), text=(node.textContent||'').trim().replace(/\s+/g,' ').slice(0,70);
    const desc=[node.localName,node.id&&`#${node.id}`,node.getAttribute('class')&&`.${node.getAttribute('class')}`,text].filter(Boolean).join(' · ');
    const label=document.createElement('label'); label.className='element-choice';
    const check=document.createElement('input'); check.type='checkbox'; check.value=path.join('.');
    const title=document.createElement('span'); title.textContent=desc; title.title=desc;
    label.append(check,title); list.append(label);
  }
  const remove=document.createElement('button'); remove.className='secondary'; remove.textContent='Xoá phần tử đã chọn';
  remove.onclick=async()=>{
    const paths=[...list.querySelectorAll('input:checked')].map(input=>input.value.split('.').map(Number));
    if (!paths.length) return toast('Hãy chọn ít nhất một phần tử.');
    const fresh=new DOMParser().parseFromString(item.source,'image/svg+xml'), svg=fresh.documentElement;
    const nodes=paths.map(path=>path.reduce((parent,index)=>parent?.children[index],svg)).filter(Boolean);
    const chosen=new Set(nodes);
    for (const node of nodes) if (![...chosen].some(parent=>parent!==node&&parent.contains(node))) node.remove();
    item.source=new XMLSerializer().serializeToString(svg);
    const options=settings();
    await process([item],options);
  };
  editor.append(list,remove);
}
async function process(batch, options) {
  busy = true; update();
  try { for (let n=0;n<batch.length;n++) { $('status').textContent = `Đang xử lý ${n+1}/${batch.length}: ${batch[n].file.name}`; await render(batch[n],options); update(); } }
  finally { busy = false; update(); const ok = items.filter(i=>i.blob).length; $('status').textContent = `Hoàn tất ${ok}/${items.length} file ${options.format.toUpperCase()}${ok < items.length ? ' · Xem lỗi tại từng file' : ' · Sẵn sàng tải hoặc copy'}.`; }
}
async function addFiles(files) {
  if (busy) return toast('Đợi lượt xử lý hiện tại hoàn tất.');
  let options; try { options = settings(); } catch(e) { return toast(e.message); }
  const batch = [];
  for (const file of files) {
    if (!/\.svg$/i.test(file.name)) { toast('Chỉ nhận file .svg.'); continue; }
    const stem = file.name.replace(/\.svg$/i,''), ext = options.format, base = `${stem}.${ext}`; let name=base, n=2;
    while (items.some(i=>i.name === name)) name = `${stem}_${n++}.${ext}`;
    const item = {file,name}; items.push(item); batch.push(item);
  }
  if (batch.length) await process(batch,options);
}
$('files').onchange = e => { addFiles([...e.target.files]); e.target.value = ''; };
$('drop').onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); $('files').click(); } };
for (const type of ['dragenter','dragover']) $('drop').addEventListener(type,e=>{e.preventDefault();$('drop').classList.add('over');});
for (const type of ['dragleave','drop']) $('drop').addEventListener(type,e=>{e.preventDefault();$('drop').classList.remove('over');});
$('drop').addEventListener('drop',e=>addFiles([...e.dataTransfer.files]));
window.addEventListener('dragover',e=>e.preventDefault()); window.addEventListener('drop',e=>e.preventDefault());
$('clear').onclick = () => { for(const i of items) if(i.url) URL.revokeObjectURL(i.url); items.length=0; update(); $('status').textContent='Đã xoá danh sách. Thêm SVG để bắt đầu.'; };
$('rerender').onclick = () => { try { const options=settings(); process([...items],options); } catch(e) {toast(e.message);} };
$('format').onchange = () => {
  const format = $('format').value;
  $('scale').disabled = $('limit').disabled = $('background').disabled = format === 'svg';
  $('formatHint').textContent = format === 'svg' ? 'SVG giữ đường nét sắc khi zoom lớn. Nền trong suốt; nút copy sẽ sao chép mã SVG.' : format === 'jpg' ? 'JPG luôn có nền trắng. Nút copy vẫn sao chép ảnh PNG.' : 'PNG là ảnh raster. Chọn SVG nếu bạn cần zoom lớn.';
  if (!items.length) return;
  const options = settings();
  const used = new Set();
  for (const item of items) {
    const stem = item.file.name.replace(/\.svg$/i,''); let name = `${stem}.${format}`, n = 2;
    while (used.has(name)) name = `${stem}_${n++}.${format}`;
    item.name = name; used.add(name);
  }
  process([...items], options);
};
// ZIP STORE avoids a library; PNG/JPG payloads are already compressed.
function crc32(bytes) { let crc=0xffffffff; for(const byte of bytes) { crc ^= byte; for(let n=0;n<8;n++) crc=(crc>>>1)^((crc&1)?0xedb88320:0); } return (crc^0xffffffff)>>>0; }
function header(size) { const bytes=new Uint8Array(size); return {bytes,view:new DataView(bytes.buffer)}; }
async function makeZip(entries) {
  const parts=[], central=[]; let offset=0, centralSize=0;
  for(const item of entries) {
    const name=new TextEncoder().encode(item.name), data=new Uint8Array(await item.blob.arrayBuffer()), crc=crc32(data);
    const local=header(30); local.view.setUint32(0,0x04034b50,true); local.view.setUint16(4,20,true); local.view.setUint16(6,0x800,true); local.view.setUint32(14,crc,true); local.view.setUint32(18,data.length,true); local.view.setUint32(22,data.length,true); local.view.setUint16(26,name.length,true);
    parts.push(local.bytes,name,data);
    const c=header(46); c.view.setUint32(0,0x02014b50,true); c.view.setUint16(4,20,true); c.view.setUint16(6,20,true); c.view.setUint16(8,0x800,true); c.view.setUint32(16,crc,true); c.view.setUint32(20,data.length,true); c.view.setUint32(24,data.length,true); c.view.setUint16(28,name.length,true); c.view.setUint32(42,offset,true); central.push(c.bytes,name); centralSize+=46+name.length; offset+=30+name.length+data.length;
  }
  const end=header(22); end.view.setUint32(0,0x06054b50,true); end.view.setUint16(8,entries.length,true); end.view.setUint16(10,entries.length,true); end.view.setUint32(12,centralSize,true); end.view.setUint32(16,offset,true);
  return new Blob([...parts,...central,end.bytes],{type:'application/zip'});
}
$('downloadAll').onclick = async () => { $('downloadAll').disabled=true; try { const entries=items.filter(i=>i.blob); if(entries.length>65535) throw Error('Mỗi ZIP hỗ trợ tối đa 65535 file.'); download(await makeZip(entries),'SVG-Studio-exports.zip'); toast(`Đã tạo ZIP chứa ${entries.length} file ${settings().format.toUpperCase()}.`); } catch(e) {toast(e.message);} finally {update();} };
$('scale').disabled = $('limit').disabled = $('background').disabled = $('format').value === 'svg';
