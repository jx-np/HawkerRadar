// js/stall/orders.js
// Orders view for stall owners — lists orders and allows updating status

import { getAllOrderItems, getStall, updateOrderStatus, listenToStallOrders } from "/js/firebase/wrapper.js";
import { getCurrentUser, hasRole } from "/js/modules/auth.js";

function applyHeaderOffset(){
  const header = document.querySelector('.site-header');
  if(!header) return;
  const h = Math.ceil(header.getBoundingClientRect().height);
  document.documentElement.style.setProperty('--site-header-h', `${h}px`);
}
applyHeaderOffset();
window.addEventListener('resize', applyHeaderOffset);
window.addEventListener('load', applyHeaderOffset);

const $ = (s, r=document) => r.querySelector(s);

function getStallId(){
  // prefer data-stall-id on main, fallback to URL param
  const main = document.querySelector('main[data-stall-id]');
  if(main?.dataset?.stallId?.trim()) return main.dataset.stallId.trim();
  const u = new URL(window.location.href);
  return (u.searchParams.get('stall')||'').trim();
}

function clearNode(n){ while(n.firstChild) n.removeChild(n.firstChild); }

function money(v){ return `$${Number(v||0).toFixed(2)}`; }

let unsubscribeListener = null;

async function fetchAndBuild(){
  const stallId = getStallId();
  const listEl = document.getElementById('ordersList');
  const emptyEl = document.getElementById('ordersEmpty');
  const tpl = document.getElementById('tpl-order-row');
  if(!listEl || !tpl) return;

  // Check if user is logged in first
  const user = getCurrentUser();
  if (!user) {
    listEl.innerHTML = '<div style="padding:20px; color:rgba(0,0,0,0.7)"><p>Please <a href="../auth/login.html" style="color:#FF3838; text-decoration:underline;">log in</a> to view and manage orders.</p></div>';
    emptyEl.style.display = 'none';
    return;
  }

  // Authorization: ensure logged-in user is stall owner for this stall
  try{
    const stall = stallId ? await getStall(stallId) : null;
    const ownerIdCandidates = [stall?.ownerId, stall?.userId, stall?.owner, stall?.OwnerID, stall?.Owner];
    const isOwner = user && (hasRole('stallOwner') || hasRole('STALL_OWNER') || user.role === 'stallOwner') && ownerIdCandidates.some(Boolean) && ownerIdCandidates.map(String).includes(String(user?.userId || user?.userId));

    if (!isOwner) {
      // show unauthorized message and stop
      listEl.innerHTML = '<div style="padding:20px; color:rgba(0,0,0,0.7)">You are not authorized to view orders for this stall.</div>';
      emptyEl.style.display = 'none';
      return;
    }
  }catch(err){
    console.warn('auth check failed', err);
  }

  // Try real data; fallback to mock
  let itemsObj = null;
  try{
    itemsObj = await getAllOrderItems();
  }catch(err){
    console.warn('wrapper getAllOrderItems failed', err);
  }

  const itemsArr = itemsObj ? Object.values(itemsObj) : null;

  let ordersMap = new Map();

  if(itemsArr){
    // group by OrderID for this stall
    for(const it of itemsArr){
      if(!it) continue;
      if(String(it.StallID) !== String(stallId)) continue;
      const oid = String(it.OrderID || '');
      if(!ordersMap.has(oid)) ordersMap.set(oid, { id: oid, items: [], subtotal:0, status: it.OrderStatus || 'received', date: it.OrderDate || null });
      const group = ordersMap.get(oid);
      group.items.push(it);
      const price = Number(it.UnitPrice)||0;
      group.subtotal += (price * (Number(it.Quantity)||0));
      // keep latest status if multiple
      if(it.OrderStatus) group.status = it.OrderStatus;
    }
  }

  // If no real orders, create mock demo orders
  if(ordersMap.size === 0){
    const now = new Date();
    const demo = [
      { id:'ORD1001', date: now.toISOString(), status:'received', items:[{ ItemDesc:'Chicken Rice', Quantity:2, UnitPrice:5.0 },{ ItemDesc:'Drink', Quantity:1, UnitPrice:1.5 }], subtotal:11.5 },
      { id:'ORD1002', date: now.toISOString(), status:'preparing', items:[{ ItemDesc:'Laksa', Quantity:1, UnitPrice:6.0 }], subtotal:6.0 },
    ];
    demo.forEach(d => ordersMap.set(d.id, d));
  }

  // render
  clearNode(listEl);
  const statusView = $('#statusView')?.value || '';
  const entries = Array.from(ordersMap.values()).filter(o => !statusView || String(o.status)===String(statusView));

  if(entries.length === 0){ emptyEl.style.display='block'; return; } else { emptyEl.style.display='none'; }

  entries.forEach(order=>{
    const node = tpl.content.firstElementChild.cloneNode(true);
    node.dataset.orderId = order.id || '';
    node.querySelector('.order-id').textContent = order.id || '';
    const dt = order.date ? new Date(order.date) : new Date();
    node.querySelector('.order-date').textContent = dt.toLocaleDateString();
    node.querySelector('.order-time').textContent = dt.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});

    // status select
    const sel = node.querySelector('.order-status-select');
    if(sel){ sel.value = order.status || 'received'; }

    // items
    const itemsWrap = node.querySelector('.order-items');
    clearNode(itemsWrap);
    const items = order.items || [];
    items.forEach(it=>{
      const li = document.createElement('li');
      const name = document.createElement('span'); name.className='name'; name.textContent = it.ItemDesc || it.ItemName || 'Item';
      const qty = document.createElement('span'); qty.className='qty'; qty.textContent = 'x'+(it.Quantity||1);
      const price = document.createElement('span'); price.className='price'; price.textContent = money((it.UnitPrice||0)*(it.Quantity||1));
      li.appendChild(name); li.appendChild(qty); li.appendChild(price);
      itemsWrap.appendChild(li);
    });

    // summary
    const subtotal = order.subtotal || (items.reduce((s,i)=>(s + ((i.UnitPrice||0)*(i.Quantity||1))),0));
    node.querySelector('.summary-value').textContent = money(subtotal);
    // total (no tax calculation here)
    node.querySelectorAll('.summary-value')[1].textContent = money(subtotal);

    // update button
    const btn = node.querySelector('.order-btn-update');
    btn.addEventListener('click', async ()=>{
      const newStatus = node.querySelector('.order-status-select').value;
      try{
        // persist via wrapper; pass optional metadata
        await updateOrderStatus(order.id, newStatus, { updatedBy: getCurrentUser()?.userId || null });
        order.status = newStatus;
        btn.textContent = 'Updated';
        setTimeout(()=> btn.textContent = 'Update', 1200);
      }catch(err){
        console.error('failed to update order status', err);
        alert('Failed to update order status');
      }
    });

    listEl.appendChild(node);
  });
}

function init(){
  const statusView = $('#statusView');
  if(statusView) statusView.addEventListener('change', fetchAndBuild);
  // read stall id from query param and set on main
  const url = new URL(window.location.href);
  const stall = url.searchParams.get('stall');
  if(stall){ document.querySelector('main')?.setAttribute('data-stall-id', stall); }

  fetchAndBuild();

  // Set up real-time listener for this stall's orders after initial load
  const stallId = getStallId();
  if (stallId) {
    // Clean up existing listener if any
    if (unsubscribeListener) unsubscribeListener();
    
    // Set up new listener
    unsubscribeListener = listenToStallOrders(stallId, (ordersData) => {
      console.log('Orders updated in real-time:', ordersData);
      // Re-render orders when data changes
      fetchAndBuild();
    });

    // Clean up listener on page unload
    window.addEventListener('beforeunload', () => {
      if (unsubscribeListener) unsubscribeListener();
    });
  }
}

document.addEventListener('DOMContentLoaded', init);
