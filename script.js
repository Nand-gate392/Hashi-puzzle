const state = { columns: 10, rows: 7, nodes: [], edges: [], selectedNode: null, mode: 'edit' };
const board = document.querySelector('#board');
const $ = (selector) => document.querySelector(selector);
const nodeById = (id) => state.nodes.find((node) => node.id === id);
const coordKey = (column, row) => `${column}:${row}`;

function nodePosition(node) {
  return { x: 5 + node.column * (90 / (state.columns - 1)), y: 5 + node.row * (90 / (state.rows - 1)) };
}
function showToast(message) {
  const toast = $('#toast'); toast.textContent = message; toast.classList.add('show');
  window.clearTimeout(showToast.timer); showToast.timer = window.setTimeout(() => toast.classList.remove('show'), 2200);
}
function edgeKey(first, second) { return [first, second].sort().join('|'); }
function edgeCount(first, second) { return state.edges.filter((edge) => edgeKey(edge.first, edge.second) === edgeKey(first, second)).length; }
function degree(id) { return state.edges.reduce((total, edge) => total + (edge.first === id || edge.second === id ? 1 : 0), 0); }
function isHorizontal(edge) { const first = nodeById(edge.first); const second = nodeById(edge.second); return first.row === second.row; }
function segment(edge, offset = 0) {
  const first = nodePosition(nodeById(edge.first)); const second = nodePosition(nodeById(edge.second));
  const horizontal = first.y === second.y;
  const amount = offset * 1.3;
  return horizontal ? { x1:first.x, y1:first.y + amount, x2:second.x, y2:second.y + amount } : { x1:first.x + amount, y1:first.y, x2:second.x + amount, y2:second.y };
}
function between(value, start, end) { return value > Math.min(start, end) + .05 && value < Math.max(start, end) - .05; }
function edgesCross(firstEdge, secondEdge) {
  const firstHorizontal = isHorizontal(firstEdge); const secondHorizontal = isHorizontal(secondEdge);
  if (firstHorizontal === secondHorizontal) return false;
  const horizontal = firstHorizontal ? segment(firstEdge) : segment(secondEdge);
  const vertical = firstHorizontal ? segment(secondEdge) : segment(firstEdge);
  return between(vertical.x1, horizontal.x1, horizontal.x2) && between(horizontal.y1, vertical.y1, vertical.y2);
}
function hasInvalidEdge(edge) {
  return state.edges.some((other) => other !== edge && edgesCross(edge, other));
}
function allConnected() {
  if (!state.nodes.length) return false;
  const reached = new Set([state.nodes[0].id]);
  let changed = true;
  while (changed) { changed = false; state.edges.forEach((edge) => { if (reached.has(edge.first) || reached.has(edge.second)) { const before = reached.size; reached.add(edge.first); reached.add(edge.second); changed ||= reached.size !== before; } }); }
  return reached.size === state.nodes.length;
}
function isComplete() { return state.nodes.length > 0 && state.nodes.every((node) => degree(node.id) === node.value) && state.edges.every((edge) => !hasInvalidEdge(edge)) && allConnected(); }

function render() {
  board.innerHTML = '';
  const edgeLayer = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  state.edges.forEach((edge, index) => {
    const samePairIndex = state.edges.slice(0, index).filter((item) => edgeKey(item.first, item.second) === edgeKey(edge.first, edge.second)).length;
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    const points = segment(edge, samePairIndex === 0 ? -0.5 : 0.5);
    path.setAttribute('x1', points.x1); path.setAttribute('y1', points.y1); path.setAttribute('x2', points.x2); path.setAttribute('y2', points.y2);
    path.setAttribute('class', `edge${hasInvalidEdge(edge) ? ' invalid' : ''}`); edgeLayer.append(path);
  });
  board.append(edgeLayer);
  const nodeLayer = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  state.nodes.forEach((node) => {
    const position = nodePosition(node); const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle'); const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    circle.setAttribute('cx', position.x); circle.setAttribute('cy', position.y); circle.setAttribute('r', '4.8'); label.setAttribute('x', position.x); label.setAttribute('y', position.y); label.textContent = node.value;
    group.setAttribute('class', `node ${state.selectedNode === node.id ? 'selected' : ''} ${degree(node.id) === node.value ? 'satisfied' : ''} ${degree(node.id) > node.value ? 'over' : ''} ${state.mode === 'play' ? 'playable' : ''}`); group.append(circle, label);
    group.addEventListener('click', (event) => { event.stopPropagation(); handleNodeClick(node.id); }); nodeLayer.append(group);
  });
  board.append(nodeLayer); updateInterface();
}
function handleNodeClick(id) {
  if (state.mode === 'edit') { state.selectedNode = state.selectedNode === id ? null : id; render(); return; }
  if (!state.selectedNode) { state.selectedNode = id; render(); return; }
  if (state.selectedNode === id) { state.selectedNode = null; render(); return; }
  addEdge(state.selectedNode, id); state.selectedNode = null; render();
}
function addNode(column, row) {
  if (state.nodes.some((node) => node.column === column && node.row === row)) return;
  const id = `n${Date.now()}${Math.random().toString(16).slice(2)}`; state.nodes.push({ id, column, row, value: 1 }); state.selectedNode = id; render();
}
function addEdge(first, second) {
  const firstNode = nodeById(first); const secondNode = nodeById(second);
  if (firstNode.row !== secondNode.row && firstNode.column !== secondNode.column) { showToast('桥只能连接同一行或同一列的节点'); return; }
  if (edgeCount(first, second) >= 2) { showToast('这两个节点之间最多只能有两条桥'); return; }
  state.edges.push({ first, second });
}
function boardClick(event) {
  if (state.mode !== 'edit') return;
  const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(board.getScreenCTM().inverse());
  const column = Math.round((point.x - 5) / (90 / (state.columns - 1))); const row = Math.round((point.y - 5) / (90 / (state.rows - 1)));
  if (column < 0 || column >= state.columns || row < 0 || row >= state.rows) return;
  if (state.nodes.some((node) => node.column === column && node.row === row)) return;
  addNode(column, row);
}
function deleteSelected() { if (!state.selectedNode) return; state.edges = state.edges.filter((edge) => edge.first !== state.selectedNode && edge.second !== state.selectedNode); state.nodes = state.nodes.filter((node) => node.id !== state.selectedNode); state.selectedNode = null; render(); }
function setMode(mode) { state.mode = mode; state.selectedNode = null; $('.mode-tab.active')?.classList.remove('active'); document.querySelector(`[data-mode="${mode}"]`).classList.add('active'); $('#modeTitle').textContent = mode === 'edit' ? '搭建你的关卡' : '验证你的关卡'; $('#modeDescription').textContent = mode === 'edit' ? '点击画布上的空白位置放置节点。选中节点后，用下方控件设置它需要的桥数。' : '连续点击两个节点建立桥。所有节点变绿、桥不交叉且全图连通时即可通关。'; $('#instructionText').textContent = mode === 'edit' ? '编辑模式：点击空位放置节点，点击节点进行设置' : '试玩模式：连续点击两个节点建立一条桥'; render(); }
function resizeBoard() { state.columns = Math.max(4, Math.min(16, Number($('#columnsInput').value) || 10)); state.rows = Math.max(4, Math.min(12, Number($('#rowsInput').value) || 7)); state.nodes = []; state.edges = []; state.selectedNode = null; render(); showToast('已创建新的空白画布'); }
function exportLevel() { const data = { columns:state.columns, rows:state.rows, nodes:state.nodes.map(({ column, row, value }) => ({ column, row, value })), edges:state.edges.map(({ first, second }) => ({ first, second })) }; const blob = new Blob([JSON.stringify(data, null, 2)], { type:'application/json' }); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = 'shuqiao-level.json'; link.click(); URL.revokeObjectURL(link.href); showToast('关卡 JSON 已导出'); }
function importLevel(file) { const reader = new FileReader(); reader.onload = () => { try { const data = JSON.parse(reader.result); state.columns = Number(data.columns) || 10; state.rows = Number(data.rows) || 7; state.nodes = (data.nodes || []).map((node, index) => ({ ...node, id:node.id || `n${index}` })); state.edges = (data.edges || []).filter((edge) => nodeById(edge.first) && nodeById(edge.second)); $('#columnsInput').value = state.columns; $('#rowsInput').value = state.rows; setMode('edit'); showToast('关卡已导入'); } catch { showToast('无法读取这个 JSON 文件'); } }; reader.readAsText(file); }

$('#board').addEventListener('click', boardClick); $('#increaseButton').addEventListener('click', () => { const node = nodeById(state.selectedNode); if (node) { node.value = Math.min(8, node.value + 1); render(); } }); $('#decreaseButton').addEventListener('click', () => { const node = nodeById(state.selectedNode); if (node) { node.value = Math.max(0, node.value - 1); render(); } }); $('#deleteButton').addEventListener('click', deleteSelected); $('#resizeButton').addEventListener('click', resizeBoard); $('#clearButton').addEventListener('click', () => { state.nodes = []; state.edges = []; state.selectedNode = null; render(); }); $('#exportButton').addEventListener('click', exportLevel); $('#importButton').addEventListener('click', () => $('#fileInput').click()); $('#fileInput').addEventListener('change', (event) => { if (event.target.files[0]) importLevel(event.target.files[0]); }); document.querySelectorAll('.mode-tab').forEach((tab) => tab.addEventListener('click', () => setMode(tab.dataset.mode)));
function updateInterface() { const selected = nodeById(state.selectedNode); $('#nodeEditor').setAttribute('aria-disabled', selected ? 'false' : 'true'); $('#selectedHint').textContent = selected ? `位置 ${selected.column + 1}, ${selected.row + 1}` : '未选择'; $('#selectedValue').textContent = selected ? selected.value : '—'; $('#nodeCount').textContent = `${state.nodes.length} 个节点`; $('#bridgeCount').textContent = `${state.edges.length} 条桥`; $('#totalNodeCount').textContent = state.nodes.length; $('#validNodeCount').textContent = state.nodes.filter((node) => degree(node.id) === node.value).length; $('#connectionState').textContent = allConnected() ? '已连通' : '未连通'; $('#connectionState').style.color = allConnected() ? 'var(--mint-strong)' : 'var(--muted)'; $('#emptyState').style.display = state.nodes.length ? 'none' : 'grid'; if (isComplete() && state.mode === 'play') { $('#stageTitle').textContent = '关卡完成'; showToast('恭喜，所有节点已连通'); } else { $('#stageTitle').textContent = state.mode === 'edit' ? '空白关卡' : '试玩中'; } }
render();
