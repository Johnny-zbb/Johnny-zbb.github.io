import { parseGoal, decide } from './domain.js';
import { AgentRunner } from './agent.js';
import { DomSdkPagePort } from './page-port.js';
import { DemoWorkspace } from './workspace.js';
const $ = selector => document.querySelector(selector);
const root = $('#workspace');
const workspace = new DemoWorkspace(root);
const log = $('#traceLog');
const status = $('#agentStatus');
let logCount = 0;
function emit(event) {
  if (event.kind === 'started') { log.replaceChildren(); logCount = 0; }
  const card = document.createElement('article');
  card.className = 'trace-event ' + event.kind;
  const line = document.createElement('div'); line.className = 'trace-head';
  const label = document.createElement('strong'); label.textContent = (event.turn ? '#' + event.turn + ' · ' : '') + event.kind.toUpperCase();
  const when = document.createElement('span'); when.textContent = new Date().toLocaleTimeString('zh-CN', { hour12: false });
  line.append(label, when);
  const detail = document.createElement('p'); detail.textContent = event.message;
  card.append(line, detail); log.append(card); log.scrollTop = log.scrollHeight;
  if (event.snapshot) $('#snapshotText').textContent = event.snapshot || '(空快照)';
  if (event.kind === 'completed' || event.kind === 'failed' || event.kind === 'stopped') {
    status.textContent = { completed: '任务完成', failed: '执行失败', stopped: '已停止' }[event.kind];
    status.dataset.kind = event.kind; $('#runBtn').disabled = false;
  } else { status.textContent = '执行中'; status.dataset.kind = 'running'; $('#runBtn').disabled = true; }
  $('#stepCount').textContent = String(++logCount);
}
const sdk = window.SiteDomSdk?.createDomSdk?.();
if (!sdk) {
  status.textContent = 'DOM SDK 未加载'; status.dataset.kind = 'failed'; $('#runBtn').disabled = true;
  $('#snapshotText').textContent = '缺少 SiteDomSdk，无法执行任务。';
} else {
  const agent = new AgentRunner({ page: new DomSdkPagePort(root, sdk), planner: decide, publish: emit });
  const start = () => {
    const goal = parseGoal($('#taskInput').value);
    $('#runBtn').disabled = true;
    void agent.run(goal);
  };
  $('#runBtn').addEventListener('click', start);
  $('#stopBtn').addEventListener('click', () => agent.stop());
  $('#resetBtn').addEventListener('click', () => { agent.stop(); workspace.reset(); log.replaceChildren(); $('#stepCount').textContent = '0'; $('#snapshotText').textContent = '运行任务后显示 dom-sdk 语义快照'; status.textContent = '就绪'; status.dataset.kind = 'idle'; $('#runBtn').disabled = false; });
  document.querySelectorAll('[data-task]').forEach(button => button.addEventListener('click', () => { $('#taskInput').value = button.dataset.task; start(); }));
  $('#taskInput').addEventListener('keydown', event => { if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') start(); });
  status.textContent = '就绪';
}
